const mysql = require('mysql2/promise');
async function run() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'ramsun_solar' });
  await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id VARCHAR(8) DEFAULT NULL UNIQUE');
  await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS failed_document VARCHAR(255) DEFAULT NULL');
  await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL');
  console.log('Columns added!');
  process.exit(0);
}
run();
