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
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));

// Multer Setup for File Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

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
        client_id VARCHAR(50) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        address TEXT,
        capacity VARCHAR(50),
        status VARCHAR(100),
        step INT DEFAULT 1,
        site_photo VARCHAR(255),
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check if admin user exists, if not create one
    const adminEmail = 'admin@ramsun.com';
    const [adminCheck] = await dbPool.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (adminCheck.length === 0) {
      const bcrypt = require('bcryptjs');
      const adminPassword = process.env.ADMIN_PASSWORD || 'RamsunAdmin2024';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await dbPool.query(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [adminEmail, hashedPassword, 'admin']
      );
      console.log('Admin user created automatically.');
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

app.post('/api/auth/admin-login', authLimiter, (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.trim() : null;
  
  if (!adminPassword) {
    return res.status(500).json({ success: false, error: 'Server misconfiguration: ADMIN_PASSWORD not set' });
  }

  if (password === adminPassword) {
    res.json({ success: true, token: 'fake-admin-token-123' });
  } else {
    res.status(401).json({ success: false, error: `Wrong password. Server has: [${adminPassword}]` });
  }
});

// Also apply authLimiter to the existing /api/auth/login and OTP routes
// (We will update those further down, but for now just replacing the header)
app.get('/api/projects', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT * FROM projects WHERE 1=1';
    let params = [];
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
    const agreement = req.body.agreement || null;
    const quotation = req.body.quotation || null;

    const errors = [];
    if (!customer_name || customer_name.length < 2) errors.push('Customer name is required (min 2 chars)');
    if (!phone || !isValidPhone(phone)) errors.push('Valid phone number is required');
    if (!email || !isValidEmail(email)) errors.push('Valid email address is required');

    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    let client_id = generateClientId();
    // In production, you'd check for uniqueness collision in a loop. Assuming 8 random digits won't collide soon.

    const [result] = await getPool().query(
      'INSERT INTO projects (client_id, customer_name, phone, email, address, capacity, status, step, site_photo, agreement, quotation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [client_id, customer_name, phone, email.toLowerCase(), address, capacity, 'Document Upload', 1, site_photo, agreement, quotation]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Error creating project:', error.message);
    res.status(500).json({ error: 'Unable to create project' });
  }
});

// Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  res.json({ success: true, filePath: `/uploads/${req.file.filename}` });
});

app.put('/api/projects/:id/step', async (req, res) => {
  try {
    const { id } = req.params;
    const step = parseInt(req.body.step);
    const status = sanitize(req.body.status);
    const failed_document = req.body.failed_document || null;
    const rejection_reason = req.body.rejection_reason || null;

    if (isNaN(step) || step < 1 || step > 5) return res.status(400).json({ error: 'Invalid step value (must be 1-5)' });
    if (!status) return res.status(400).json({ error: 'Status is required' });

    await getPool().query('UPDATE projects SET step = ?, status = ?, failed_document = ?, rejection_reason = ? WHERE id = ?', [step, status, failed_document, rejection_reason, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error.message);
    res.status(500).json({ error: 'Unable to update project' });
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
      user: { id: result.insertId, email, role: defaultRole }
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
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.json({
      success: true,
      token: 'mock-jwt-token',
      user: { id: user.id, email: user.email, role: user.role }
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

