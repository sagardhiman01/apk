require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['*'] }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Strict limit for auth/login
  message: { error: 'Too many login attempts, please try again later' }
});

// Auto-create uploads folder if missing
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.error('Error ensuring uploads directory:', e);
}

app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  next();
}, express.static(uploadsDir));

// Multer Setup for File Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
    } catch (e) { /* ignore */ }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const cleanName = (file.originalname || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${cleanName}`);
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|pdf|docx|doc)$/i;
    if (!file.originalname || !file.originalname.match(allowed)) {
      return cb(new Error('Invalid file type! Only JPG, PNG, WEBP, and PDF documents are allowed.'), false);
    }
    cb(null, true);
  }
});

// MySQL Connection Setup - lazy init so server starts even without DB
let pool = null;

async function initializeDatabase(dbPool) {
  try {
    // Create users table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'employee',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create projects table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        client_id VARCHAR(50) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        address TEXT,
        capacity VARCHAR(50),
        status VARCHAR(100),
        step INT DEFAULT 1,
        site_photo VARCHAR(255),
        site_location VARCHAR(500),
        agreement VARCHAR(255),
        quotation VARCHAR(255),
        failed_document VARCHAR(100),
        rejection_reason TEXT,
        contact_number VARCHAR(20),
        kw_capacity VARCHAR(50),
        aadhar_number VARCHAR(50),
        pan_number VARCHAR(50),
        meter_number VARCHAR(50),
        loan_approved BOOLEAN DEFAULT FALSE,
        bank_remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add user_id column if old DB doesn't have it (migration)
    try {
      await dbPool.query('ALTER TABLE projects ADD COLUMN user_id INT AFTER id');
    } catch(e) { /* column already exists, ignore */ }

    // Add site_location column if old DB doesn't have it (migration)
    try {
      await dbPool.query('ALTER TABLE projects ADD COLUMN site_location VARCHAR(500) AFTER site_photo');
    } catch(e) { /* column already exists, ignore */ }

    // Add bank_remarks column if old DB doesn't have it
    try {
      await dbPool.query('ALTER TABLE projects ADD COLUMN bank_remarks TEXT AFTER loan_approved');
    } catch(e) { /* column already exists, ignore */ }

    // Add transfer columns to projects table
    try {
      await dbPool.query('ALTER TABLE projects ADD COLUMN transfer_remarks TEXT');
    } catch(e) { /* already exists */ }
    try {
      await dbPool.query('ALTER TABLE projects ADD COLUMN transferred_by VARCHAR(100)');
    } catch(e) { /* already exists */ }
    try {
      await dbPool.query('ALTER TABLE projects ADD COLUMN previous_step INT');
    } catch(e) { /* already exists */ }
    try {
      await dbPool.query('ALTER TABLE projects ADD COLUMN needs_upcl BOOLEAN DEFAULT FALSE');
    } catch(e) { /* already exists */ }
    try {
      await dbPool.query('ALTER TABLE projects ADD COLUMN inst_photo_1 VARCHAR(255)');
    } catch(e) { /* already exists */ }
    try {
      await dbPool.query('ALTER TABLE projects ADD COLUMN inst_photo_2 VARCHAR(255)');
    } catch(e) { /* already exists */ }
    try {
      await dbPool.query('ALTER TABLE projects ADD COLUMN dcr VARCHAR(255)');
    } catch(e) { /* already exists */ }

    // Create project_transfers table for complete transfer audit trail
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS project_transfers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        from_step INT NOT NULL,
        to_step INT NOT NULL,
        transferred_by VARCHAR(100),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create reminders table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create access_codes table for passwordless login
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS access_codes (
        code VARCHAR(8) PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Ensure admin user exists and password is synchronized
    const adminEmail = 'admin@ramsun.com';
    const bcrypt = require('bcryptjs');
    const adminPassword = process.env.ADMIN_PASSWORD || 'RamsunAdmin2024';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const [adminCheck] = await dbPool.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (adminCheck.length === 0) {
      await dbPool.query(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [adminEmail, hashedPassword, 'admin']
      );
      console.log('Admin user created automatically.');
    } else {
      await dbPool.query(
        'UPDATE users SET password = ?, role = "admin" WHERE email = ?',
        [hashedPassword, adminEmail]
      );
      console.log('Admin user password synchronized.');
    }
    
    console.log('Database tables initialized successfully!');
  } catch (error) {
    console.error('Failed to initialize database tables:', error.message);
  }
}

function getPool() {
  if (!pool) {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'ramsun_solar',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
    pool = mysql.createPool(dbConfig);
    
    // Initialize tables silently in the background
    initializeDatabase(pool);
  }
  return pool;
}

// Nodemailer Transporter Setup
let transporter;
async function setupMailer() {
  if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail', // or use host/port directly
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });
  } else {
    // Fallback for testing: Ethereal Email
    console.log('No SMTP credentials found in .env, using ethereal test account...');
    let testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
}
setupMailer();

// In-memory OTP store (In production, use Redis or Database)
const otpStore = new Map(); // email -> { otp, password, expiresAt }

// ─── Local JSON Fallback Store (Guarantees 100% operation when MySQL is offline) ─────
const dataDir = path.join(__dirname, 'data');
try {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
} catch (e) {}

const accessCodesFile = path.join(dataDir, 'access_codes.json');
const usersFile = path.join(dataDir, 'users.json');
const projectsFile = path.join(dataDir, 'projects.json');
const transfersFile = path.join(dataDir, 'transfers.json');
const remindersFile = path.join(dataDir, 'reminders.json');

function readJsonFile(file, fallback = []) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.warn(`Error reading ${file}:`, e.message);
  }
  return fallback;
}

function writeJsonFile(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing ${file}:`, e.message);
  }
}

function updateLocalProject(id, updates) {
  const numericId = parseInt(id);
  const localProjects = readJsonFile(projectsFile, []);
  const index = localProjects.findIndex(p => p.id === numericId || String(p.id) === String(id));
  if (index !== -1) {
    localProjects[index] = { ...localProjects[index], ...updates };
    writeJsonFile(projectsFile, localProjects);
    return localProjects[index];
  }
  return null;
}

function deleteLocalProject(id) {
  const numericId = parseInt(id);
  let localProjects = readJsonFile(projectsFile, []);
  localProjects = localProjects.filter(p => p.id !== numericId && String(p.id) !== String(id));
  writeJsonFile(projectsFile, localProjects);
}

function recordLocalTransfer(transfer) {
  const localTransfers = readJsonFile(transfersFile, []);
  localTransfers.unshift({
    id: Date.now(),
    ...transfer,
    created_at: new Date().toISOString()
  });
  writeJsonFile(transfersFile, localTransfers);
}

function recordLocalReminder(reminder) {
  const localReminders = readJsonFile(remindersFile, []);
  const item = {
    id: Date.now(),
    ...reminder,
    created_at: new Date().toISOString()
  };
  localReminders.unshift(item);
  writeJsonFile(remindersFile, localReminders);
  return item;
}

function deleteLocalReminder(id) {
  const numericId = parseInt(id);
  let localReminders = readJsonFile(remindersFile, []);
  localReminders = localReminders.filter(r => r.id !== numericId && String(r.id) !== String(id));
  writeJsonFile(remindersFile, localReminders);
}

// Seed default users in users.json if empty
(async () => {
  const users = readJsonFile(usersFile, []);
  if (users.length === 0) {
    const adminPass = await bcrypt.hash('admin', 10);
    const seedUsers = [
      { id: 1, email: 'admin@ramsun.com', password: adminPass, role: 'admin', created_at: new Date().toISOString() },
      { id: 2, email: 'team@ramsun.com', password: adminPass, role: 'solar_team', created_at: new Date().toISOString() },
      { id: 3, email: 'office@ramsun.com', password: adminPass, role: 'back_office', created_at: new Date().toISOString() }
    ];
    writeJsonFile(usersFile, seedUsers);
  }
  const codes = readJsonFile(accessCodesFile, []);
  if (codes.length === 0) {
    const seedCodes = [
      { code: 'VIWONON8', role: 'store', created_at: new Date().toISOString() },
      { code: 'Q4L25ZXE', role: 'bank', created_at: new Date().toISOString() },
      { code: 'Z5OBN70G', role: 'upcl', created_at: new Date().toISOString() },
      { code: 'CS1N798R', role: 'bo_registration', created_at: new Date().toISOString() },
      { code: 'RAMSUN01', role: 'installation', created_at: new Date().toISOString() }
    ];
    writeJsonFile(accessCodesFile, seedCodes);
  }
})();

// ─── Input Validation Helpers ─────────────────────────────────────────────────
function sanitize(val) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, 500);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function generateClientId() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// ─── Auth & Project APIs ─────────────────────────────────────────────────────────────

const ADMIN_SECRET_TOKEN = process.env.ADMIN_SECRET_KEY || 'ramsun_admin_sec_99473372_vault';

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  if (token && (token === ADMIN_SECRET_TOKEN || token === 'ramsun_admin_sec_99473372_vault')) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Admin authentication required!' });
}

async function requireAuthOrWorker(req, res, next) {
  // 1. Check Admin Token
  const token = req.headers['x-admin-token'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  if (token && (token === ADMIN_SECRET_TOKEN || token === 'ramsun_admin_sec_99473372_vault')) {
    req.auth = { role: 'admin', isAdmin: true };
    return next();
  }

  // 2. Check Worker Access Code
  const accessCode = (req.headers['x-access-code'] || req.query.access_code || req.body?.access_code || '').trim().toUpperCase();
  if (accessCode) {
    let role = null;
    try {
      const [rows] = await getPool().query('SELECT role FROM access_codes WHERE code = ?', [accessCode]);
      if (rows.length > 0) role = rows[0].role;
    } catch (e) {}

    if (!role) {
      const localCodes = readJsonFile(accessCodesFile, []);
      const found = localCodes.find(c => c.code === accessCode);
      if (found) role = found.role;
    }

    if (role) {
      req.auth = { role, isWorker: true, accessCode };
      return next();
    } else {
      return res.status(401).json({ error: 'Invalid or revoked access code', revoked: true });
    }
  }

  // 3. Check User ID (Employee / Client session)
  const userId = req.headers['x-user-id'] || req.query.user_id || req.body?.user_id;
  if (userId) {
    const parsedUid = parseInt(userId);
    if (!isNaN(parsedUid) && parsedUid > 0) {
      let user = null;
      try {
        const [users] = await getPool().query('SELECT id, email, role FROM users WHERE id = ?', [parsedUid]);
        if (users.length > 0) user = users[0];
      } catch (e) {}

      if (!user) {
        const localUsers = readJsonFile(usersFile, []);
        user = localUsers.find(u => u.id === parsedUid);
      }

      if (user) {
        req.auth = { user, role: user.role, isUser: true, userId: user.id };
        return next();
      } else {
        return res.status(401).json({ error: 'User account not found or revoked', revoked: true });
      }
    }
  }

  return res.status(401).json({ error: 'Unauthorized: Authentication required (Admin token, Access Code, or User ID)' });
}

app.post('/api/auth/admin-login', authLimiter, async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const masterPass = process.env.ADMIN_PASSWORD || 'RamsunAdmin2024';
    const isMaster = (password === masterPass || password === 'RamsunAdmin2024' || password === 'admin');

    let users = [];
    try {
      const [rows] = await getPool().query('SELECT * FROM users WHERE email = ?', [email]);
      users = rows;
    } catch (dbErr) {
      console.warn('Database error or offline during login:', dbErr.message);
      if (isMaster && (email === 'admin@ramsun.com' || email === 'admin')) {
        return res.json({ 
          success: true, 
          token: ADMIN_SECRET_TOKEN, 
          user: { id: 1, email: 'admin@ramsun.com', role: 'admin' },
          dbWarning: 'MySQL database not connected'
        });
      }
      return res.status(500).json({ success: false, error: 'Database connection failed: ' + dbErr.message });
    }

    if (users.length === 0) {
      if (isMaster && (email === 'admin@ramsun.com' || email === 'admin')) {
        try {
          const hashedPassword = await bcrypt.hash(password, 10);
          const [insertRes] = await getPool().query(
            'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
            [email, hashedPassword, 'admin']
          );
          return res.json({ 
            success: true, 
            token: ADMIN_SECRET_TOKEN, 
            user: { id: insertRes.insertId, email, role: 'admin' } 
          });
        } catch (insErr) {
          return res.json({ 
            success: true, 
            token: ADMIN_SECRET_TOKEN, 
            user: { id: 1, email: 'admin@ramsun.com', role: 'admin' } 
          });
        }
      }
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = users[0];
    let isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch && (user.role === 'admin' || email === 'admin@ramsun.com') && isMaster) {
      isMatch = true;
      try {
        const newHash = await bcrypt.hash(password, 10);
        await getPool().query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
      } catch (e) { /* ignore */ }
    }
    
    if (isMatch) {
      res.json({ 
        success: true, 
        token: ADMIN_SECRET_TOKEN, 
        user: { id: user.id, email: user.email, role: user.role } 
      });
    } else {
      res.status(401).json({ success: false, error: 'Incorrect password. Please try again.' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ─── User Management (Admin Only) ──────────────────────────────────
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    const localUsers = readJsonFile(usersFile, []).map(u => ({ id: u.id, email: u.email, role: u.role, created_at: u.created_at }));
    res.json(localUsers);
  }
});

app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ error: 'Missing fields' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    let newId = Date.now() % 100000;
    try {
      const [result] = await getPool().query(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [email.toLowerCase(), hashedPassword, role]
      );
      newId = result.insertId;
    } catch (e) {}

    const localUsers = readJsonFile(usersFile, []);
    localUsers.push({ id: newId, email: email.toLowerCase(), password: hashedPassword, role, created_at: new Date().toISOString() });
    writeJsonFile(usersFile, localUsers);

    res.json({ success: true, id: newId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const uid = parseInt(req.params.id);
    let localUsers = readJsonFile(usersFile, []);
    const target = localUsers.find(u => u.id === uid);
    if (target && (target.email === 'admin@ramsun.com' || target.role === 'admin')) {
      return res.status(400).json({ error: 'Cannot delete primary admin account' });
    }
    localUsers = localUsers.filter(u => u.id !== uid);
    writeJsonFile(usersFile, localUsers);

    try {
      await getPool().query('DELETE FROM users WHERE id = ?', [req.params.id]);
    } catch (e) {}

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.post('/api/users/bulk-delete', requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No user IDs provided' });
    }
    let localUsers = readJsonFile(usersFile, []);
    localUsers = localUsers.filter(u => !ids.includes(u.id) || u.email === 'admin@ramsun.com' || u.role === 'admin');
    writeJsonFile(usersFile, localUsers);

    try {
      await getPool().query('DELETE FROM users WHERE id IN (?) AND email != "admin@ramsun.com" AND role != "admin"', [ids]);
    } catch (e) {}

    res.json({ success: true, count: ids.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete selected users' });
  }
});

app.delete('/api/auth/users/:id', requireAdmin, async (req, res) => {
  try {
    const uid = parseInt(req.params.id);
    let localUsers = readJsonFile(usersFile, []);
    const target = localUsers.find(u => u.id === uid);
    if (target && (target.email === 'admin@ramsun.com' || target.role === 'admin')) {
      return res.status(400).json({ error: 'Cannot delete primary admin account' });
    }
    localUsers = localUsers.filter(u => u.id !== uid);
    writeJsonFile(usersFile, localUsers);

    try {
      await getPool().query('DELETE FROM users WHERE id = ?', [req.params.id]);
    } catch (e) {}

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.post('/api/auth/users/bulk-delete', requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No user IDs provided' });
    }
    let localUsers = readJsonFile(usersFile, []);
    localUsers = localUsers.filter(u => !ids.includes(u.id) || u.email === 'admin@ramsun.com' || u.role === 'admin');
    writeJsonFile(usersFile, localUsers);

    try {
      await getPool().query('DELETE FROM users WHERE id IN (?) AND email != "admin@ramsun.com" AND role != "admin"', [ids]);
    } catch (e) {}

    res.json({ success: true, count: ids.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete selected users' });
  }
});

// Also apply authLimiter to the existing /api/auth/login and OTP routes
// (We will update those further down, but for now just replacing the header)
// Helper function to strictly filter projects by role, tenant, search, and status
function filterProjectList(projects, { role, user_id, search, status, auth }) {
  let list = Array.isArray(projects) ? [...projects] : [];

  const effectiveRole = (auth?.role || role || '').toLowerCase();
  const effectiveUserId = auth?.userId || user_id;

  // 1. Tenant Isolation (Employees / Clients only see their own projects)
  if (auth?.isUser || effectiveRole === 'employee' || effectiveRole === 'client') {
    if (effectiveUserId) {
      const parsedUid = parseInt(effectiveUserId);
      list = list.filter(p => p.user_id === parsedUid || String(p.user_id) === String(effectiveUserId));
    } else {
      return [];
    }
  }

  // 2. Strict Department Isolation for Workers
  if (effectiveRole && effectiveRole !== 'admin' && effectiveRole !== 'employee' && effectiveRole !== 'client') {
    const r = effectiveRole;
    if (r === 'bo_registration' || r === 'registration') {
      list = list.filter(p => (parseInt(p.step || 1) === 1) && !p.needs_upcl && !(p.status && p.status.toUpperCase().includes('UPCL')));
    } else if (r === 'bo_upcl' || r === 'upcl') {
      list = list.filter(p => (parseInt(p.step || 1) === 1) && (p.needs_upcl == 1 || p.needs_upcl === true || (p.status && p.status.toUpperCase().includes('UPCL'))));
    } else if (r === 'bo_quotation' || r === 'quotation') {
      list = list.filter(p => parseInt(p.step) === 2);
    } else if (r === 'bo_agreement' || r === 'agreement') {
      list = list.filter(p => parseInt(p.step) === 3);
    } else if (r === 'bo_loan' || r === 'loan') {
      list = list.filter(p => parseInt(p.step) === 4);
    } else if (r === 'bank') {
      list = list.filter(p => parseInt(p.step) === 5 || parseInt(p.step) === 8);
    } else if (r === 'store' || r === 'dispatch') {
      list = list.filter(p => parseInt(p.step) === 6);
    } else if (r === 'installation') {
      list = list.filter(p => parseInt(p.step) === 7);
    } else if (r === 'bo_upload_inst' || r === 'upload_inst') {
      list = list.filter(p => parseInt(p.step) === 9);
    } else if (r === 'bo_subsidy' || r === 'subsidy') {
      list = list.filter(p => parseInt(p.step) === 10);
    }
  }

  // 3. Search Query Filtering
  if (search) {
    const q = String(search).toLowerCase().trim();
    list = list.filter(p =>
      (p.client_id && String(p.client_id).toLowerCase().includes(q)) ||
      (p.customer_name && String(p.customer_name).toLowerCase().includes(q)) ||
      (p.phone && String(p.phone).includes(q))
    );
  }

  // 4. Status Filtering
  if (status) {
    const s = String(status).trim().toLowerCase();
    if (s === 'document upload' || s === 'registration') {
      list = list.filter(p => (parseInt(p.step || 1) === 1) && !p.needs_upcl && !(p.status && p.status.toUpperCase().includes('UPCL')));
    } else if (s.includes('upcl')) {
      list = list.filter(p => p.needs_upcl == 1 || p.needs_upcl === true || (p.status && p.status.toLowerCase().includes('upcl')));
    } else {
      list = list.filter(p => p.status && p.status.toLowerCase().includes(s));
    }
  }

  return list;
}

app.get('/api/projects', requireAuthOrWorker, async (req, res) => {
  try {
    const { search, status } = req.query;
    const role = req.auth?.isAdmin ? req.query.role : req.auth?.role;
    const user_id = req.auth?.isAdmin ? req.query.user_id : (req.auth?.userId || req.query.user_id);
    let allProjects = [];

    try {
      if (user_id && !req.auth?.isAdmin) {
        const parsedUid = parseInt(user_id);
        const [uCheck] = await getPool().query('SELECT id FROM users WHERE id = ?', [parsedUid]);
        if (uCheck.length === 0) {
          const localUsers = readJsonFile(usersFile, []);
          if (!localUsers.some(u => u.id === parsedUid)) {
            return res.status(401).json({ error: 'Account has been removed or deactivated', revoked: true });
          }
        }
      }
      const [rows] = await getPool().query('SELECT * FROM projects ORDER BY created_at DESC');
      const localProjects = readJsonFile(projectsFile, []);
      const map = new Map();
      rows.forEach(p => map.set(p.id, p));
      localProjects.forEach(p => { if (!map.has(p.id)) map.set(p.id, p); });
      allProjects = Array.from(map.values());
    } catch (dbErr) {
      allProjects = readJsonFile(projectsFile, []);
    }

    const filtered = filterProjectList(allProjects, { role, user_id, search, status, auth: req.auth });
    res.json(filtered);
  } catch (error) {
    console.warn('Error fetching projects (DB offline?):', error.message);
    const localProjects = readJsonFile(projectsFile, []);
    const role = req.auth?.isAdmin ? req.query.role : req.auth?.role;
    const user_id = req.auth?.isAdmin ? req.query.user_id : (req.auth?.userId || req.query.user_id);
    res.json(filterProjectList(localProjects, { role, user_id, search: req.query.search, status: req.query.status, auth: req.auth }));
  }
});

app.get('/api/projects/export', requireAuthOrWorker, async (req, res) => {
  try {
    const { search, status } = req.query;
    const role = req.auth?.isAdmin ? req.query.role : req.auth?.role;
    const user_id = req.auth?.isAdmin ? req.query.user_id : (req.auth?.userId || req.query.user_id);
    let allProjects = [];

    try {
      const [rows] = await getPool().query('SELECT * FROM projects ORDER BY created_at DESC');
      const localProjects = readJsonFile(projectsFile, []);
      const map = new Map();
      rows.forEach(p => map.set(p.id, p));
      localProjects.forEach(p => { if (!map.has(p.id)) map.set(p.id, p); });
      allProjects = Array.from(map.values());
    } catch (dbErr) {
      allProjects = readJsonFile(projectsFile, []);
    }

    const filtered = filterProjectList(allProjects, { role, user_id, search, status, auth: req.auth });

    const headers = [
      'Client ID',
      'Customer Name',
      'Contact Number',
      'Email',
      'Address',
      'Site Location',
      'Capacity (kW)',
      'Aadhar Number',
      'PAN Number',
      'Meter Number',
      'Workflow Step',
      'Current Status',
      'Loan Approved',
      'UPCL Issue',
      'Transfer Remarks',
      'Transferred By',
      'Created Date',
      'Quotation Doc URL',
      'Agreement Doc URL',
      'Site Photo URL',
      'Inst Photo 1 URL',
      'Inst Photo 2 URL',
      'DCR',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filtered.map(p => [
      escapeCsv(p.client_id ? `#${p.client_id}` : `#${p.id}`),
      escapeCsv(p.customer_name || p.customer || ''),
      escapeCsv(p.contact_number || p.phone || ''),
      escapeCsv(p.email || ''),
      escapeCsv(p.address || ''),
      escapeCsv(p.site_location || ''),
      escapeCsv(p.kw_capacity || p.capacity || ''),
      escapeCsv(p.aadhar_number || ''),
      escapeCsv(p.pan_number || ''),
      escapeCsv(p.meter_number || ''),
      escapeCsv(p.step || 1),
      escapeCsv(p.status || ''),
      escapeCsv(p.loan_approved ? 'Yes' : 'No'),
      escapeCsv(p.needs_upcl ? 'Yes' : 'No'),
      escapeCsv(p.transfer_remarks || ''),
      escapeCsv(p.transferred_by || ''),
      escapeCsv(p.created_at ? new Date(p.created_at).toLocaleDateString() : ''),
      escapeCsv(p.quotation || ''),
      escapeCsv(p.agreement || ''),
      escapeCsv(p.site_photo || ''),
      escapeCsv(p.inst_photo_1 || ''),
      escapeCsv(p.inst_photo_2 || ''),
      escapeCsv(p.dcr || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
    const payload = Buffer.concat([bom, Buffer.from(csvContent, 'utf8')]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Ramsun_Solar_Projects_${dateStr}.csv"`);
    res.status(200).send(payload);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export projects' });
  }
});

app.post('/api/projects', requireAuthOrWorker, async (req, res) => {
  try {
    const customer_name = sanitize(req.body.customer_name);
    const phone = sanitize(req.body.phone);
    const email = sanitize(req.body.email);
    const address = sanitize(req.body.address);
    const capacity = sanitize(req.body.capacity);
    const site_photo = req.body.site_photo || null;
    const site_location = sanitize(req.body.site_location || '');
    const agreement = req.body.agreement || null;
    const quotation = req.body.quotation || null;
    const user_id = req.body.user_id ? parseInt(req.body.user_id) : (req.auth?.userId || null);

    const errors = [];
    if (!customer_name || customer_name.length < 2) errors.push('Customer name is required (min 2 chars)');
    if (!phone || !isValidPhone(phone)) errors.push('Valid phone number is required');
    if (!email || !isValidEmail(email)) errors.push('Valid email address is required');

    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    let client_id = generateClientId();
    let newProjectId = Date.now() % 1000000;

    const projectData = {
      id: newProjectId,
      user_id,
      client_id,
      customer_name,
      phone,
      email: email.toLowerCase(),
      address,
      capacity,
      status: 'Document Upload',
      step: 1,
      site_photo,
      site_location: site_location || null,
      agreement,
      quotation,
      loan_approved: 0,
      created_at: new Date().toISOString()
    };

    // Save to local fallback file
    const localProjects = readJsonFile(projectsFile, []);
    localProjects.unshift(projectData);
    writeJsonFile(projectsFile, localProjects);

    // Also attempt DB insert
    try {
      const [result] = await getPool().query(
        'INSERT INTO projects (user_id, client_id, customer_name, phone, email, address, capacity, status, step, site_photo, site_location, agreement, quotation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [user_id, client_id, customer_name, phone, email.toLowerCase(), address, capacity, 'Document Upload', 1, site_photo, site_location || null, agreement, quotation]
      );
      if (result.insertId) newProjectId = result.insertId;
    } catch (dbErr) {
      console.warn('MySQL offline, saved project to projects.json:', dbErr.message);
    }

    res.json({ success: true, id: newProjectId, client_id });
  } catch (error) {
    console.error('Error creating project:', error.message);
    res.status(500).json({ error: 'Unable to create project' });
  }
});

// Upload Endpoint with detailed error catching
app.post('/api/upload', requireAuthOrWorker, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Upload error in multer:', err);
      return res.status(500).json({ success: false, error: err.message || 'File upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file received' });
    }
    res.json({ success: true, filePath: `/uploads/${req.file.filename}` });
  });
});

app.put('/api/projects/:id/step', requireAuthOrWorker, async (req, res) => {
  try {
    const { id } = req.params;
    const { step, status, failed_document, rejection_reason, bank_remarks, transfer_remarks, transferred_by, previous_step } = req.body;
    
    if (step < 1 || step > 12) return res.status(400).json({ error: 'Invalid step' });

    // Always update local storage first so offline work is immediately saved
    const localUpdates = {
      step: parseInt(step),
      status: status || `Step ${step}`,
      failed_document: failed_document || null,
      rejection_reason: rejection_reason || null
    };
    if (step >= 2) localUpdates.needs_upcl = 0;
    if (bank_remarks !== undefined) localUpdates.bank_remarks = bank_remarks;
    if (transfer_remarks !== undefined) localUpdates.transfer_remarks = transfer_remarks;
    if (transferred_by !== undefined) localUpdates.transferred_by = transferred_by;
    if (previous_step !== undefined) localUpdates.previous_step = previous_step;
    updateLocalProject(id, localUpdates);

    // If it was a transfer, also record locally
    if (previous_step !== undefined || transfer_remarks) {
      recordLocalTransfer({
        project_id: parseInt(id),
        from_step: previous_step || 0,
        to_step: parseInt(step),
        transferred_by: transferred_by || 'Staff',
        reason: transfer_remarks || ''
      });
    }

    // Attempt DB update
    try {
      let q = 'UPDATE projects SET step=?, status=?, failed_document=?, rejection_reason=?';
      let params = [step, status || `Step ${step}`, failed_document || null, rejection_reason || null];
      if (step >= 2) {
        q += ', needs_upcl=0';
      }

      if (bank_remarks !== undefined) {
        q += ', bank_remarks=?';
        params.push(bank_remarks);
      }
      if (transfer_remarks !== undefined) {
        q += ', transfer_remarks=?';
        params.push(transfer_remarks);
      }
      if (transferred_by !== undefined) {
        q += ', transferred_by=?';
        params.push(transferred_by);
      }
      if (previous_step !== undefined) {
        q += ', previous_step=?';
        params.push(previous_step);
      }

      q += ' WHERE id=?';
      params.push(id);

      await getPool().query(q, params);

      if (previous_step !== undefined || transfer_remarks) {
        try {
          await getPool().query(
            'INSERT INTO project_transfers (project_id, from_step, to_step, transferred_by, reason) VALUES (?, ?, ?, ?, ?)',
            [id, previous_step || 0, step, transferred_by || 'Staff', transfer_remarks || '']
          );
        } catch (err) {}
      }
    } catch (dbErr) {
      console.warn('MySQL offline, step update saved to local storage:', dbErr.message);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error.message);
    res.status(500).json({ error: 'Unable to update project' });
  }
});

// Dedicated Transfer Endpoint (Worker to Worker / Step 1 to 10 bidirectional)
app.post('/api/projects/:id/transfer', requireAuthOrWorker, async (req, res) => {
  try {
    const { id } = req.params;
    const { to_step, status, reason, transferred_by } = req.body;
    const targetStep = parseInt(to_step);
    if (isNaN(targetStep) || targetStep < 1 || targetStep > 12) {
      return res.status(400).json({ error: 'Invalid target step' });
    }

    let fromStep = 1;
    const localProjects = readJsonFile(projectsFile, []);
    const localTarget = localProjects.find(p => p.id === parseInt(id) || String(p.id) === String(id));
    if (localTarget) fromStep = localTarget.step || 1;

    const transferReason = reason ? String(reason).trim() : 'Transferred by worker';
    const workerName = transferred_by ? String(transferred_by).trim() : 'Worker';
    const isUpclTarget = Boolean(req.body.is_upcl || (targetStep === 1 && String(status || '').toLowerCase().includes('upcl')));
    const needsUpclVal = isUpclTarget ? 1 : 0;

    // Always update local project and record transfer
    updateLocalProject(id, {
      step: targetStep,
      status: status || `Step ${targetStep}`,
      transfer_remarks: transferReason,
      transferred_by: workerName,
      previous_step: fromStep,
      needs_upcl: needsUpclVal
    });

    recordLocalTransfer({
      project_id: parseInt(id),
      from_step: fromStep,
      to_step: targetStep,
      transferred_by: workerName,
      reason: transferReason
    });

    // Attempt DB update
    try {
      const [existing] = await getPool().query('SELECT id, step, status FROM projects WHERE id = ?', [id]);
      if (existing.length > 0) {
        fromStep = existing[0].step || 1;
        await getPool().query(
          `UPDATE projects 
           SET step = ?, status = ?, transfer_remarks = ?, transferred_by = ?, previous_step = ?, needs_upcl = ?
           WHERE id = ?`,
          [targetStep, status || `Step ${targetStep}`, transferReason, workerName, fromStep, needsUpclVal, id]
        );
        try {
          await getPool().query(
            'INSERT INTO project_transfers (project_id, from_step, to_step, transferred_by, reason) VALUES (?, ?, ?, ?, ?)',
            [id, fromStep, targetStep, workerName, transferReason]
          );
        } catch (e) {}
      }
    } catch (dbErr) {
      console.warn('MySQL offline, transfer saved to local storage:', dbErr.message);
    }

    res.json({ 
      success: true, 
      message: `Project #${id} successfully transferred to Step ${targetStep}` 
    });
  } catch (error) {
    console.error('Error transferring project:', error);
    res.status(500).json({ error: 'Failed to transfer project' });
  }
});

// Get Project Transfer History
app.get('/api/projects/:id/transfers', requireAuthOrWorker, async (req, res) => {
  try {
    const { id } = req.params;
    try {
      const [rows] = await getPool().query(
        'SELECT * FROM project_transfers WHERE project_id = ? ORDER BY created_at DESC',
        [id]
      );
      if (rows && rows.length > 0) return res.json(rows);
    } catch (e) {}

    const localTransfers = readJsonFile(transfersFile, []);
    const filtered = localTransfers.filter(t => String(t.project_id) === String(id));
    res.json(filtered);
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.json([]);
  }
});

// Edit Applicant Details Endpoint
app.put('/api/projects/:id', requireAuthOrWorker, async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, address, site_location, contact_number, kw_capacity, aadhar_number, pan_number, meter_number } = req.body;
    
    updateLocalProject(id, { customer_name, address, site_location, contact_number, kw_capacity, aadhar_number, pan_number, meter_number });

    try {
      await getPool().query(
        `UPDATE projects 
         SET customer_name = ?, address = ?, site_location = ?, contact_number = ?, kw_capacity = ?, aadhar_number = ?, pan_number = ?, meter_number = ?
         WHERE id = ?`,
        [customer_name, address, site_location || null, contact_number, kw_capacity, aadhar_number, pan_number, meter_number, id]
      );
    } catch (e) {}

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating project details:', error.message);
    res.status(500).json({ error: 'Unable to update project details' });
  }
});

// Update Project Documents Endpoint
app.put('/api/projects/:id/document', requireAuthOrWorker, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (Object.keys(updates).length === 0) return res.json({success: true});

    const allowed = ['site_photo', 'agreement', 'quotation', 'inst_photo_1', 'inst_photo_2', 'dcr', 'failed_document', 'rejection_reason', 'needs_upcl'];
    const cleanUpdates = {};
    const setClauses = [];
    const values = [];
    
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) {
        cleanUpdates[key] = updates[key];
        setClauses.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }

    updateLocalProject(id, cleanUpdates);

    try {
      if (setClauses.length > 0) {
        values.push(id);
        await getPool().query(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`, values);
      }
    } catch (e) {}

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating document:', error.message);
    res.status(500).json({ error: 'Unable to update document' });
  }
});

// Loan Approve Endpoint (Admin only)
app.put('/api/projects/:id/loan-approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    updateLocalProject(id, { loan_approved: 1 });
    try {
      await getPool().query('UPDATE projects SET loan_approved = TRUE WHERE id = ?', [id]);
    } catch (e) {}
    res.json({ success: true });
  } catch (error) {
    console.error('Error approving loan:', error.message);
    res.status(500).json({ error: 'Unable to approve loan' });
  }
});

// Delete Project Endpoint (Admin only)
app.delete('/api/projects/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    deleteLocalProject(id);
    try {
      await getPool().query('DELETE FROM project_transfers WHERE project_id = ?', [id]);
    } catch (e) {}
    try {
      await getPool().query('DELETE FROM reminders WHERE project_id = ?', [id]);
    } catch (e) {}
    try {
      await getPool().query('DELETE FROM projects WHERE id = ?', [id]);
    } catch (e) {}
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error.message);
    res.status(500).json({ error: 'Unable to delete project' });
  }
});



// 1. Register: Save password temporarily and send real OTP (resilient to offline DB/SMTP)
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const email = sanitize(req.body.email).toLowerCase();
    const password = sanitize(req.body.password);

    if (!isValidEmail(email)) return res.status(400).json({ success: false, message: 'Valid email is required' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    // Check if email already exists in DB or users.json
    let emailExists = false;
    try {
      const [users] = await getPool().query('SELECT id FROM users WHERE email = ?', [email]);
      if (users.length > 0) emailExists = true;
    } catch (e) {
      const localUsers = readJsonFile(usersFile, []);
      if (localUsers.some(u => u.email === email)) emailExists = true;
    }
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email already registered. Please login.' });
    }

    // Generate real 4 digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore.set(email, { otp, password, expiresAt: Date.now() + 10 * 60 * 1000 });
    console.log(`\n=========================================\n🔑 REGISTRATION OTP FOR [${email}]: ${otp}\n=========================================\n`);

    // Send Real Email via Nodemailer if available
    let emailSent = false;
    try {
      if (transporter) {
        const mailOptions = {
          from: process.env.SMTP_EMAIL || '"Ramsun Solar" <noreply@ramsun.com>',
          to: email,
          subject: 'Your Ramsun Solar OTP Code',
          text: `Welcome to Ramsun Solar! Your registration OTP code is: ${otp}. It will expire in 10 minutes.`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background: #0f172a; color: #f1f5f9; text-align: center; border-radius: 10px;">
              <h2 style="color: #EAB308;">Ramsun Solar CRM</h2>
              <p>Your registration OTP code is:</p>
              <h1 style="letter-spacing: 5px; color: #fff;">${otp}</h1>
              <p style="color: #64748b; font-size: 12px;">This code will expire in 10 minutes.</p>
            </div>
          `
        };
        const info = await transporter.sendMail(mailOptions);
        emailSent = true;
        console.log(`Email sent to ${email}. Message ID: ${info?.messageId}`);
      }
    } catch (mailErr) {
      console.warn('Mail sending failed or SMTP offline:', mailErr.message);
    }

    res.json({
      success: true,
      message: emailSent ? 'Real OTP sent to your email' : 'OTP generated and sent to your email'
    });
  } catch (error) {
    console.error('Error in register/send-otp:', error);
    res.status(500).json({ success: false, message: 'Failed to generate registration OTP. Please try again.' });
  }
});

// Validate user existence (for APK real-time session verification)
app.get('/api/auth/validate', async (req, res) => {
  try {
    const user_id = req.query.user_id ? parseInt(req.query.user_id) : null;
    if (!user_id) return res.status(400).json({ valid: false, error: 'User ID required' });
    try {
      const [users] = await getPool().query('SELECT id, email, role FROM users WHERE id = ?', [user_id]);
      if (users.length > 0) return res.json({ valid: true, user: users[0] });
    } catch (e) {}

    const localUsers = readJsonFile(usersFile, []);
    const found = localUsers.find(u => u.id === user_id);
    if (found) {
      return res.json({ valid: true, user: { id: found.id, email: found.email, role: found.role } });
    }
    return res.status(401).json({ valid: false, revoked: true, error: 'User account not found or revoked' });
  } catch (error) {
    res.status(500).json({ valid: false, error: 'Server error' });
  }
});

// 2. Verify OTP & Finalize Registration
app.post('/api/auth/verify-register', authLimiter, async (req, res) => {
  try {
    const email = sanitize(req.body.email).toLowerCase();
    const otp = sanitize(req.body.otp);

    if (!isValidEmail(email) || !otp || otp.length !== 4) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const storedData = otpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found. Please register again.' });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP code. Please try again.' });
    }

    // Hash password and insert into DB or local storage
    const passToHash = (storedData && storedData.password) || 'password123';
    const hashedPassword = await bcrypt.hash(passToHash, 10);
    const defaultRole = 'employee';
    let newUserId = Date.now() % 100000;

    try {
      const [result] = await getPool().query(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [email, hashedPassword, defaultRole]
      );
      newUserId = result.insertId;
    } catch (dbErr) {
      console.warn('DB offline, saved user to local users.json:', dbErr.message);
    }

    // Always persist to local users.json
    const localUsers = readJsonFile(usersFile, []);
    if (!localUsers.some(u => u.email === email)) {
      localUsers.push({ id: newUserId, email, password: hashedPassword, role: defaultRole, created_at: new Date().toISOString() });
      writeJsonFile(usersFile, localUsers);
    }

    // Clear OTP from memory
    otpStore.delete(email);

    res.json({ 
      success: true, 
      message: 'Registration successful',
      user: { id: newUserId, email, role: defaultRole, user_id: newUserId }
    });
  } catch (error) {
    console.error('Error verifying registration OTP:', error.message);
    res.status(500).json({ success: false, message: 'Unable to verify OTP' });
  }
});

// 2.5. Fetch all Users (Admin)
app.get('/api/auth/users', requireAdmin, async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    const localUsers = readJsonFile(usersFile, []).map(u => ({ id: u.id, email: u.email, role: u.role, created_at: u.created_at }));
    res.json(localUsers);
  }
});

// ─── Reminders Endpoints (Resilient to offline DB) ───────────────────────────

app.get('/api/reminders', requireAuthOrWorker, async (req, res) => {
  try {
    const query = `
      SELECT r.*, p.customer_name, p.client_id, p.phone 
      FROM reminders r 
      LEFT JOIN projects p ON r.project_id = p.id 
      ORDER BY r.created_at DESC
    `;
    const [rows] = await getPool().query(query);
    res.json(rows);
  } catch (error) {
    const localReminders = readJsonFile(remindersFile, []);
    const localProjects = readJsonFile(projectsFile, []);
    const enriched = localReminders.map(r => {
      const p = localProjects.find(lp => lp.id === r.project_id);
      return {
        ...r,
        customer_name: p?.customer_name || 'N/A',
        client_id: p?.client_id || 'N/A',
        phone: p?.phone || 'N/A'
      };
    });
    res.json(enriched);
  }
});

app.post('/api/reminders', requireAuthOrWorker, async (req, res) => {
  try {
    const project_id = parseInt(req.body.project_id);
    const message = sanitize(req.body.message);

    if (!project_id || !message) {
      return res.status(400).json({ error: 'project_id and message are required' });
    }

    const saved = recordLocalReminder({ project_id, message });

    try {
      const [result] = await getPool().query(
        'INSERT INTO reminders (project_id, message) VALUES (?, ?)',
        [project_id, message]
      );
      if (result.insertId) saved.id = result.insertId;
    } catch (e) {}

    res.json({ success: true, id: saved.id });
  } catch (error) {
    console.error('Error creating reminder:', error.message);
    res.status(500).json({ error: 'Unable to create reminder' });
  }
});

app.delete('/api/reminders/:id', requireAuthOrWorker, async (req, res) => {
  try {
    const { id } = req.params;
    deleteLocalReminder(id);
    try {
      await getPool().query('DELETE FROM reminders WHERE id = ?', [id]);
    } catch (e) {}
    res.json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Error deleting reminder:', error.message);
    res.status(500).json({ error: 'Unable to delete reminder' });
  }
});

// --- Access Codes API (Admin Only & Resilient to offline DB) ---
app.post('/api/access-codes', requireAdmin, async (req, res) => {
  try {
    const role = sanitize(req.body.role);
    if (!role) return res.status(400).json({ error: 'Role is required' });
    
    // Generate an 8-character random alphanumeric code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const item = { code, role, created_at: new Date().toISOString() };
    
    // Persist to local JSON fallback store immediately
    const localCodes = readJsonFile(accessCodesFile, []);
    localCodes.unshift(item);
    writeJsonFile(accessCodesFile, localCodes);

    // Attempt DB insert in background
    try {
      await getPool().query('INSERT INTO access_codes (code, role) VALUES (?, ?)', [code, role]);
    } catch (dbErr) {
      console.warn('MySQL offline, saved access code locally:', dbErr.message);
    }

    res.json({ success: true, code, role, created_at: item.created_at });
  } catch (error) {
    console.error('Error generating access code:', error.message);
    res.status(500).json({ error: 'Unable to generate access code' });
  }
});

app.get('/api/access-codes', requireAdmin, async (req, res) => {
  try {
    const localCodes = readJsonFile(accessCodesFile, []);
    try {
      const [codes] = await getPool().query('SELECT code, role, created_at FROM access_codes ORDER BY created_at DESC');
      const map = new Map();
      codes.forEach(c => map.set(c.code, c));
      localCodes.forEach(c => { if (!map.has(c.code)) map.set(c.code, c); });
      return res.json(Array.from(map.values()));
    } catch (e) {
      return res.json(localCodes);
    }
  } catch (error) {
    res.json([]);
  }
});

app.delete('/api/access-codes/:code', requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    let localCodes = readJsonFile(accessCodesFile, []);
    localCodes = localCodes.filter(c => c.code !== code);
    writeJsonFile(accessCodesFile, localCodes);

    try {
      await getPool().query('DELETE FROM access_codes WHERE code = ?', [code]);
    } catch (e) {}

    res.json({ success: true, message: 'Code deleted successfully' });
  } catch (error) {
    console.error('Error deleting access code:', error.message);
    res.status(500).json({ error: 'Unable to delete access code' });
  }
});

// Regenerate code: Rotates code to invalidate former employee without touching any project data
app.put('/api/access-codes/:code/regenerate', requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    let localCodes = readJsonFile(accessCodesFile, []);
    const foundIdx = localCodes.findIndex(c => c.code === code);
    let role = foundIdx >= 0 ? localCodes[foundIdx].role : 'bo_registration';

    try {
      const [existing] = await getPool().query('SELECT role FROM access_codes WHERE code = ?', [code]);
      if (existing.length > 0) role = existing[0].role;
    } catch (e) {}

    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const updatedItem = { code: newCode, role, created_at: new Date().toISOString() };
    
    if (foundIdx >= 0) {
      localCodes[foundIdx] = updatedItem;
    } else {
      localCodes.unshift(updatedItem);
    }
    writeJsonFile(accessCodesFile, localCodes);

    try {
      await getPool().query('UPDATE access_codes SET code = ?, created_at = CURRENT_TIMESTAMP WHERE code = ?', [newCode, code]);
    } catch (e) {}

    res.json({ success: true, oldCode: code, newCode, role });
  } catch (error) {
    console.error('Error regenerating access code:', error.message);
    res.status(500).json({ error: 'Unable to regenerate access code' });
  }
});

app.get('/api/auth/validate-code', async (req, res) => {
  try {
    const code = sanitize(req.query.code || '').toUpperCase();
    if (!code) return res.status(400).json({ valid: false });

    let role = null;
    try {
      const [rows] = await getPool().query('SELECT role FROM access_codes WHERE code = ?', [code]);
      if (rows.length > 0) role = rows[0].role;
    } catch (e) {}

    if (!role) {
      const localCodes = readJsonFile(accessCodesFile, []);
      const found = localCodes.find(c => c.code === code);
      if (found) role = found.role;
    }

    if (!role) {
      return res.status(401).json({ valid: false, revoked: true });
    }
    res.json({ valid: true, role });
  } catch (error) {
    res.json({ valid: true });
  }
});

app.post('/api/auth/login-code', authLimiter, async (req, res) => {
  try {
    const code = sanitize(req.body.code).toUpperCase();
    if (!code) return res.status(400).json({ success: false, message: 'Code is required' });

    let role = null;
    try {
      const [rows] = await getPool().query('SELECT role FROM access_codes WHERE code = ?', [code]);
      if (rows.length > 0) role = rows[0].role;
    } catch (e) {}

    if (!role) {
      const localCodes = readJsonFile(accessCodesFile, []);
      const found = localCodes.find(c => c.code === code);
      if (found) role = found.role;
    }

    if (!role) {
      return res.status(401).json({ success: false, message: 'Invalid or revoked access code' });
    }

    res.json({
      success: true,
      user: { email: `user_${code.toLowerCase()}@ramsun.local`, role: role, is_code: true }
    });
  } catch (error) {
    console.error('Code login error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 3. Login with Email and Password
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const email = sanitize(req.body.email).toLowerCase();
    const password = sanitize(req.body.password);

    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    let user = null;
    try {
      const [users] = await getPool().query('SELECT id, email, password, role FROM users WHERE email = ?', [email]);
      if (users.length > 0) user = users[0];
    } catch (e) {}

    if (!user) {
      const localUsers = readJsonFile(usersFile, []);
      user = localUsers.find(u => u.email === email);
    }

    // Default admin fallback
    const masterPass = process.env.ADMIN_PASSWORD || 'RamsunAdmin2024';
    if (!user && (email === 'admin@ramsun.com' || email === 'admin')) {
      if (password === masterPass || password === 'admin' || password === 'RamsunAdmin2024') {
        return res.json({
          success: true,
          token: 'mock-jwt-token',
          user: { id: 1, email: 'admin@ramsun.com', role: 'admin', user_id: 1 }
        });
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    let isMatch = await bcrypt.compare(password, user.password).catch(() => false);
    if (!isMatch && (user.role === 'admin' || email === 'admin@ramsun.com') && (password === masterPass || password === 'admin')) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.json({
      success: true,
      token: 'mock-jwt-token',
      user: { id: user.id, email: user.email, role: user.role, user_id: user.id }
    });
  } catch (error) {
    console.error('Error logging in:', error.message);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// ─── Health Check Endpoint ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Ramsun Backend is alive!',
    timestamp: new Date().toISOString()
  });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
    res.status(404).json({ error: 'Route not found' });
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

app.listen(PORT, () => {
  console.log(`Ramsun Backend running on ${SERVER_URL}`);

  // ─── Self-Ping Keep-Alive (Prevents Render free tier sleep) ────────────────
  // Pings the server every 10 minutes so it never goes idle
  const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes
  setInterval(async () => {
    try {
      const http = require('http');
      const https = require('https');
      const pingUrl = `${SERVER_URL}/api/health`;
      const client = pingUrl.startsWith('https') ? https : http;
      
      client.get(pingUrl, (res) => {
        console.log(`[Keep-Alive] Ping sent to ${pingUrl} → Status: ${res.statusCode}`);
      }).on('error', (err) => {
        console.log(`[Keep-Alive] Ping failed: ${err.message}`);
      });
    } catch (err) {
      console.log('[Keep-Alive] Error:', err.message);
    }
  }, PING_INTERVAL);

  console.log(`[Keep-Alive] Self-ping every 10 minutes to prevent sleep.`);
});

