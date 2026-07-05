-- Database: ramsun_solar

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'solar_team', 'back_office', 'office', 'employee', 'dispatch') NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id VARCHAR(8) DEFAULT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  capacity VARCHAR(10) DEFAULT NULL,
  status VARCHAR(50) DEFAULT 'Document Upload',
  step INT DEFAULT 1,
  site_photo VARCHAR(500),
  agreement VARCHAR(500),
  quotation VARCHAR(500),
  loan_approved BOOLEAN DEFAULT FALSE,
  failed_document VARCHAR(255) DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_steps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  status ENUM('pending', 'completed') DEFAULT 'pending',
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS project_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by INT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Add missing columns if upgrading from old schema
ALTER TABLE projects ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS capacity VARCHAR(10) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT '';

-- Insert default users (password is 'password123' hashed)
INSERT IGNORE INTO users (email, password, role) VALUES 
('admin@ramsun.com', '$2a$10$wYpS3D.N/qJc3R7J4lX3x.H1W/Jq9x.9lTq0Z4I3x9/Q1wQ/O9M5G', 'admin'),
('team@ramsun.com', '$2a$10$wYpS3D.N/qJc3R7J4lX3x.H1W/Jq9x.9lTq0Z4I3x9/Q1wQ/O9M5G', 'solar_team'),
('office@ramsun.com', '$2a$10$wYpS3D.N/qJc3R7J4lX3x.H1W/Jq9x.9lTq0Z4I3x9/Q1wQ/O9M5G', 'back_office');

-- Insert sample projects
INSERT IGNORE INTO projects (id, customer_name, phone, email, address, capacity, status, step) VALUES
(1, 'Ramesh Singh', '9876543210', 'ramesh@example.com', '123 Main Road, Dehradun, Uttarakhand 248001', '5', 'Registration', 1),
(2, 'Anita Sharma', '9876543211', 'anita@example.com', '45 MG Road, Haridwar, Uttarakhand 249401', '3', 'UPCL Approval', 1),
(3, 'Vikram Gupta', '9876543212', 'vikram@example.com', '78 Rajpur Road, Dehradun, Uttarakhand 248009', '10', 'Loan Apply', 2),
(4, 'Sita Ram', '9876543213', 'sita@example.com', '56 Nainital Road, Haldwani, Uttarakhand 263139', '7', 'Installation', 4);
