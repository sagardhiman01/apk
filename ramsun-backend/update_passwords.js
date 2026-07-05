const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function run() {
  try {
    const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'ramsun_solar' });
    const defaultPassword = await bcrypt.hash('password123', 10);
    
    // Update existing users where password is empty or not hashed properly
    await pool.query('UPDATE users SET password = ? WHERE password = "" OR password IS NULL', [defaultPassword]);
    
    console.log('Successfully updated default passwords to: password123');
    process.exit(0);
  } catch(e) {
    console.log('Error:', e.message);
    process.exit(1);
  }
}
run();
