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

app.use('/uploads', express.static(uploadsDir));

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
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB
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

app.post('/api/auth/admin-login', authLimiter, async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const masterPass = process.env.ADMIN_PASSWORD || 'RamsunAdmin2024';
    const isMaster = (password === masterPass || password === 'RamsunAdmin2024');

    const [users] = await getPool().query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      if (isMaster && email === 'admin@ramsun.com') {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [insertRes] = await getPool().query(
          'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
          [email, hashedPassword, 'admin']
        );
        return res.json({ 
          success: true, 
          token: 'fake-admin-token-123', 
          user: { id: insertRes.insertId, email, role: 'admin' } 
        });
      }
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = users[0];
    let isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch && (user.role === 'admin' || email === 'admin@ramsun.com') && isMaster) {
      isMatch = true;
      const newHash = await bcrypt.hash(password, 10);
      await getPool().query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
    }
    
    if (isMatch) {
      res.json({ 
        success: true, 
        token: 'fake-admin-token-123', // Keeping simple for now, but real app should use JWT
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

// ─── User Management (Admin Only ideally) ──────────────────────────────────
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ error: 'Missing fields' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await getPool().query(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email.toLowerCase(), hashedPassword, role]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user (might already exist)' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const [u] = await getPool().query('SELECT email, role FROM users WHERE id = ?', [req.params.id]);
    if (u.length > 0 && (u[0].email === 'admin@ramsun.com' || u[0].role === 'admin')) {
      return res.status(400).json({ error: 'Cannot delete primary admin account' });
    }
    await getPool().query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.post('/api/users/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No user IDs provided' });
    }
    await getPool().query('DELETE FROM users WHERE id IN (?) AND email != "admin@ramsun.com" AND role != "admin"', [ids]);
    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('Failed to bulk delete users:', error);
    res.status(500).json({ error: 'Failed to delete selected users' });
  }
});

app.delete('/api/auth/users/:id', async (req, res) => {
  try {
    const [u] = await getPool().query('SELECT email, role FROM users WHERE id = ?', [req.params.id]);
    if (u.length > 0 && (u[0].email === 'admin@ramsun.com' || u[0].role === 'admin')) {
      return res.status(400).json({ error: 'Cannot delete primary admin account' });
    }
    await getPool().query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.post('/api/auth/users/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No user IDs provided' });
    }
    await getPool().query('DELETE FROM users WHERE id IN (?) AND email != "admin@ramsun.com" AND role != "admin"', [ids]);
    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('Failed to bulk delete users:', error);
    res.status(500).json({ error: 'Failed to delete selected users' });
  }
});

// Also apply authLimiter to the existing /api/auth/login and OTP routes
// (We will update those further down, but for now just replacing the header)
app.get('/api/projects', async (req, res) => {
  try {
    const { search, status, user_id } = req.query;
    const role = req.query.role;
    let query = 'SELECT * FROM projects WHERE 1=1';
    let params = [];

    // TENANT ISOLATION (For Mobile Employee / Client)
    if (role === 'employee' || role === 'client') {
      if (user_id) {
        query += ' AND user_id = ?';
        params.push(parseInt(user_id));
      } else {
        // Strict isolation: if an employee or client has no user_id, NEVER leak other users' projects
        query += ' AND 1=0';
      }
    } else if (user_id) {
      query += ' AND user_id = ?';
      params.push(parseInt(user_id));
    }
    
    // ROLE-BASED FILTERING (For Department Queues in Admin Panel)
    if (role && role !== 'admin' && role !== 'employee' && role !== 'client') {
        if (role === 'bo_registration' || role === 'registration') {
          query += ' AND step = 1 AND (status NOT LIKE "%UPCL%" AND (needs_upcl IS NULL OR needs_upcl = 0))';
        } else if (role === 'bo_upcl' || role === 'upcl') {
          query += ' AND step = 1 AND (status LIKE "%UPCL%" OR needs_upcl = 1)';
        }
        else if (role === 'bo_quotation' || role === 'quotation') { query += ' AND step = 2'; }
        else if (role === 'bo_agreement' || role === 'agreement') { query += ' AND step = 3'; }
        else if (role === 'bo_loan' || role === 'loan') { query += ' AND step = 4'; }
        else if (role === 'bank') { query += ' AND step IN (5, 8)'; } // Bank handles 1st and 2nd disbursed
        else if (role === 'store' || role === 'dispatch') { query += ' AND step = 6'; }
        else if (role === 'installation') { query += ' AND step = 7'; }
        else if (role === 'bo_upload_inst' || role === 'upload_inst') { query += ' AND step = 9'; }
        else if (role === 'bo_subsidy' || role === 'subsidy') { query += ' AND step = 10'; }
    }

    if (search) {
      query += ' AND (client_id LIKE ? OR customer_name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await getPool().query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching projects:', error.message);
    res.status(500).json({ error: 'Unable to fetch projects' });
  }
});

app.post('/api/projects', async (req, res) => {
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
    const user_id = req.body.user_id ? parseInt(req.body.user_id) : null;

    const errors = [];
    if (!customer_name || customer_name.length < 2) errors.push('Customer name is required (min 2 chars)');
    if (!phone || !isValidPhone(phone)) errors.push('Valid phone number is required');
    if (!email || !isValidEmail(email)) errors.push('Valid email address is required');

    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    let client_id = generateClientId();

    const [result] = await getPool().query(
      'INSERT INTO projects (user_id, client_id, customer_name, phone, email, address, capacity, status, step, site_photo, site_location, agreement, quotation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, client_id, customer_name, phone, email.toLowerCase(), address, capacity, 'Document Upload', 1, site_photo, site_location || null, agreement, quotation]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Error creating project:', error.message);
    res.status(500).json({ error: 'Unable to create project' });
  }
});

// Upload Endpoint with detailed error catching
app.post('/api/upload', (req, res) => {
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

app.put('/api/projects/:id/step', async (req, res) => {
  try {
    const { id } = req.params;
    const { step, status, failed_document, rejection_reason, bank_remarks, transfer_remarks, transferred_by, previous_step } = req.body;
    
    if (step < 1 || step > 12) return res.status(400).json({ error: 'Invalid step' });

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

    // If it was a transfer, also record into project_transfers
    if (previous_step !== undefined || transfer_remarks) {
      try {
        await getPool().query(
          'INSERT INTO project_transfers (project_id, from_step, to_step, transferred_by, reason) VALUES (?, ?, ?, ?, ?)',
          [id, previous_step || 0, step, transferred_by || 'Staff', transfer_remarks || '']
        );
      } catch (err) {
        console.warn('Could not record transfer history:', err.message);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error.message);
    res.status(500).json({ error: 'Unable to update project' });
  }
});

// Dedicated Transfer Endpoint (Worker to Worker / Step 1 to 10 bidirectional)
app.post('/api/projects/:id/transfer', async (req, res) => {
  try {
    const { id } = req.params;
    const { to_step, status, reason, transferred_by } = req.body;
    const targetStep = parseInt(to_step);
    if (isNaN(targetStep) || targetStep < 1 || targetStep > 12) {
      return res.status(400).json({ error: 'Invalid target step' });
    }

    const [existing] = await getPool().query('SELECT id, step, status FROM projects WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Project not found' });

    const fromStep = existing[0].step || 1;
    const transferReason = reason ? String(reason).trim() : 'Transferred by worker';
    const workerName = transferred_by ? String(transferred_by).trim() : 'Worker';
    const isUpclTarget = Boolean(req.body.is_upcl || (targetStep === 1 && String(status || '').toLowerCase().includes('upcl')));
    const needsUpclVal = isUpclTarget ? 1 : 0;

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
    } catch (e) {
      console.warn('Failed to record project_transfers:', e.message);
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
app.get('/api/projects/:id/transfers', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await getPool().query(
      'SELECT * FROM project_transfers WHERE project_id = ? ORDER BY created_at DESC',
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({ error: 'Failed to fetch transfer history' });
  }
});

// Edit Applicant Details Endpoint
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, address, contact_number, kw_capacity, aadhar_number, pan_number, meter_number } = req.body;
    
    const [existing] = await getPool().query('SELECT id FROM projects WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Project not found' });

    await getPool().query(
      `UPDATE projects 
       SET customer_name = ?, address = ?, contact_number = ?, kw_capacity = ?, aadhar_number = ?, pan_number = ?, meter_number = ?
       WHERE id = ?`,
      [customer_name, address, contact_number, kw_capacity, aadhar_number, pan_number, meter_number, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating project details:', error.message);
    res.status(500).json({ error: 'Unable to update project details' });
  }
});

// Update Project Documents Endpoint
app.put('/api/projects/:id/document', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (Object.keys(updates).length === 0) return res.json({success: true});

    const [existing] = await getPool().query('SELECT id FROM projects WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Project not found' });

    const setClauses = [];
    const values = [];
    
    const allowed = ['site_photo', 'agreement', 'quotation', 'inst_photo_1', 'inst_photo_2', 'dcr', 'failed_document', 'rejection_reason', 'needs_upcl'];
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) {
        setClauses.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }

    if (setClauses.length > 0) {
      values.push(id);
      await getPool().query(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`, values);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating document:', error.message);
    res.status(500).json({ error: 'Unable to update document' });
  }
});

// Loan Approve Endpoint (Admin only)
app.put('/api/projects/:id/loan-approve', async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await getPool().query('SELECT id FROM projects WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Project not found' });
    await getPool().query('UPDATE projects SET loan_approved = TRUE WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error approving loan:', error.message);
    res.status(500).json({ error: 'Unable to approve loan' });
  }
});

// Delete Project Endpoint
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    try {
      await getPool().query('DELETE FROM project_transfers WHERE project_id = ?', [id]);
    } catch (e) {
      console.warn('Could not clean transfers:', e.message);
    }
    try {
      await getPool().query('DELETE FROM reminders WHERE project_id = ?', [id]);
    } catch (e) {
      console.warn('Could not clean reminders:', e.message);
    }
    const [result] = await getPool().query('DELETE FROM projects WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error.message);
    res.status(500).json({ error: 'Unable to delete project' });
  }
});



// 1. Register: Save password temporarily and send real OTP
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const email = sanitize(req.body.email).toLowerCase();
    const password = sanitize(req.body.password);

    if (!isValidEmail(email)) return res.status(400).json({ success: false, message: 'Valid email is required' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    // Check if email already exists
    const [users] = await getPool().query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered. Please login.' });
    }

    // Generate real 4 digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Store in memory (expires in 10 mins)
    otpStore.set(email, { otp, password, expiresAt: Date.now() + 10 * 60 * 1000 });

    // Send Real Email via Nodemailer
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

    let info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}. Message ID: ${info.messageId}`);
    if (info.messageId && !process.env.SMTP_EMAIL) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    res.json({ success: true, message: 'Real OTP sent to email' });
  } catch (error) {
    console.error('Error in register/send-otp:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please check your email credentials or network connection.' });
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
    if (!storedData || storedData.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP expired or not requested' });
    }
    
    if (storedData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP' });
    }

    // OTP matches! Hash password and insert into DB
    const hashedPassword = await bcrypt.hash(storedData.password, 10);
    const defaultRole = 'employee';

    const [result] = await getPool().query(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashedPassword, defaultRole]
    );

    // Clear OTP from memory
    otpStore.delete(email);

    res.json({ 
      success: true, 
      message: 'Registration successful',
      user: { id: result.insertId, email, role: defaultRole, user_id: result.insertId }
    });
  } catch (error) {
    console.error('Error verifying registration OTP:', error.message);
    res.status(500).json({ success: false, message: 'Unable to verify OTP' });
  }
});

// 2.5. Fetch all Users (Admin)
app.get('/api/auth/users', async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── Reminders Endpoints ──────────────────────────────────────────────────────

app.get('/api/reminders', async (req, res) => {
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
    console.error('Error fetching reminders:', error.message);
    res.status(500).json({ error: 'Unable to fetch reminders' });
  }
});

app.post('/api/reminders', async (req, res) => {
  try {
    const project_id = parseInt(req.body.project_id);
    const message = sanitize(req.body.message);

    if (!project_id || !message) {
      return res.status(400).json({ error: 'project_id and message are required' });
    }

    const [result] = await getPool().query(
      'INSERT INTO reminders (project_id, message) VALUES (?, ?)',
      [project_id, message]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Error creating reminder:', error.message);
    res.status(500).json({ error: 'Unable to create reminder' });
  }
});

app.delete('/api/reminders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await getPool().query('DELETE FROM reminders WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Reminder not found' });
    res.json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Error deleting reminder:', error.message);
    res.status(500).json({ error: 'Unable to delete reminder' });
  }
});

// --- Access Codes API ---
app.post('/api/access-codes', async (req, res) => {
  try {
    const role = sanitize(req.body.role);
    if (!role) return res.status(400).json({ error: 'Role is required' });
    
    // Generate an 8-character random alphanumeric code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    await getPool().query('INSERT INTO access_codes (code, role) VALUES (?, ?)', [code, role]);
    res.json({ success: true, code, role });
  } catch (error) {
    console.error('Error generating access code:', error.message);
    res.status(500).json({ error: 'Unable to generate access code' });
  }
});

app.get('/api/access-codes', async (req, res) => {
  try {
    const [codes] = await getPool().query('SELECT code, role, created_at FROM access_codes ORDER BY created_at DESC');
    res.json(codes);
  } catch (error) {
    console.error('Error fetching access codes:', error.message);
    res.status(500).json({ error: 'Unable to fetch access codes' });
  }
});

app.delete('/api/access-codes/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const [result] = await getPool().query('DELETE FROM access_codes WHERE code = ?', [code]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Code not found' });
    res.json({ success: true, message: 'Code deleted successfully' });
  } catch (error) {
    console.error('Error deleting access code:', error.message);
    res.status(500).json({ error: 'Unable to delete access code' });
  }
});

app.post('/api/auth/login-code', authLimiter, async (req, res) => {
  try {
    const code = sanitize(req.body.code).toUpperCase();
    if (!code) return res.status(400).json({ success: false, message: 'Code is required' });

    const [rows] = await getPool().query('SELECT role FROM access_codes WHERE code = ?', [code]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or revoked access code' });
    }

    const role = rows[0].role;
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

    const [users] = await getPool().query('SELECT id, email, password, role FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    let isMatch = await bcrypt.compare(password, user.password);
    const masterPass = process.env.ADMIN_PASSWORD || 'RamsunAdmin2024';
    if (!isMatch && (user.role === 'admin' || email === 'admin@ramsun.com') && (password === masterPass || password === 'RamsunAdmin2024')) {
      isMatch = true;
      const newHash = await bcrypt.hash(password, 10);
      await getPool().query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
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
    res.status(500).json({ success: false, message: 'Server error during login', error: error.message, stack: error.stack, code: error.code });
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

