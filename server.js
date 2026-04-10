require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

const axios = require('axios');


// Redirect root to login
app.get('/', (req, res) => {
  res.redirect('/login/login.html');
});

app.use(express.static(path.join(__dirname, 'login123')));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initDB() {
  const connection = await pool.getConnection();
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE,
      password_hash VARCHAR(255),
      level ENUM('admin','operator')
    )
  `);
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS sensors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      voltage DECIMAL(6,2),
      current DECIMAL(6,3),
      power DECIMAL(8,2),
      energy DECIMAL(10,3),
      frequency DECIMAL(5,2),
      pf DECIMAL(4,3)
    )
  `);

  // Tambah kolom baru jika belum ada (untuk update schema lama)
  try {
    await connection.execute('ALTER TABLE sensors ADD COLUMN IF NOT EXISTS frequency DECIMAL(5,2)');
    await connection.execute('ALTER TABLE sensors ADD COLUMN IF NOT EXISTS pf DECIMAL(4,3)');
  } catch(e) { /* kolom sudah ada */ }
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS relays (
      id TINYINT PRIMARY KEY,
      state TINYINT DEFAULT 0,
      cycles INT DEFAULT 0,
      last_changed DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key_name VARCHAR(100) PRIMARY KEY,
      value VARCHAR(255)
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      relay_id TINYINT,
      on_time TIME,
      off_time TIME,
      is_active TINYINT DEFAULT 1
    )
  `);
  
  // Default user
  const hash = bcrypt.hashSync('admin123', 10);
  await connection.execute('INSERT IGNORE INTO users VALUES (1, "admin", ?, "admin")', [hash]);

  // Default settings
  await connection.execute('INSERT IGNORE INTO settings (key_name, value) VALUES ("electricity_tariff", "1444.7")');
  
  // Init relays
  for (let i = 1; i <= 4; i++) {
    await connection.execute('INSERT IGNORE INTO relays (id) VALUES (?)', [i]);
  }
  
  connection.release();
  console.log('✅ MySQL tables ready');
}

initDB().catch(console.error);

// Public endpoints (no auth needed)
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1');
    res.json({ status: 'OK', db: 'MySQL' });
  } catch {
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, level: user.level }, JWT_SECRET, { expiresIn: '30m' });
    res.json({ token, user: { id: user.id, username: user.username, level: user.level } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected endpoints (auth middleware)
app.use('/api', (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/sensors', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const [rows] = await pool.execute('SELECT * FROM sensors ORDER BY id DESC LIMIT ?', [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint untuk polling data terbaru (real-time monitoring)
app.get('/api/sensors/latest', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM sensors ORDER BY id DESC LIMIT 1');
    if (rows.length === 0) return res.json(null);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sensors', async (req, res) => {
  const { voltage, current, power, energy, frequency, pf } = req.body;
  try {
    const [result] = await pool.execute(
      'INSERT INTO sensors (voltage, current, power, energy, frequency, pf) VALUES (?, ?, ?, ?, ?, ?)',
      [
        voltage  ?? null,
        current  ?? null,
        power    ?? null,
        energy   ?? null,
        frequency ?? null,
        pf       ?? null
      ]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/relays', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM relays ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/relays/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM relays WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Relay not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/relays/:id', async (req, res) => {
  const { state } = req.body;
  const id = req.params.id;
  try {
    await pool.execute(
      'UPDATE relays SET state = ?, cycles = cycles + 1, last_changed = NOW() WHERE id = ?',
      [state ? 1 : 0, id]
    );
    const [rows] = await pool.execute('SELECT * FROM relays WHERE id = ?', [id]);

    // Response langsung ke browser (tidak tunggu ESP32)
    res.json(rows[0]);

    // Push ke ESP32 secara async background
    const ESP32_IP = (process.env.ESP32_IP || '192.168.1.100').split(/[\s#]/)[0].trim();
    const axios = require('axios');
    axios.post(`http://${ESP32_IP}/relay/${id}`, { state: state ? 1 : 0 }, { timeout: 3000 })
      .then(() => console.log(`📡 Push ESP32 Relay ${id}: ${state ? 'ON' : 'OFF'}`))
      .catch(e  => console.warn(`⚠  Push ESP32 (polling mode ok): ${e.message}`));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SETTINGS & BILLING API
app.get('/api/settings/:key', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT value FROM settings WHERE key_name = ?', [req.params.key]);
    res.json(rows[0] || { value: '0' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/settings/:key', async (req, res) => {
  const { value } = req.body;
  try {
    await pool.execute('INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?', [req.params.key, value, value]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// SCHEDULES API
app.get('/api/schedules', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM schedules ORDER BY relay_id');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/schedules', async (req, res) => {
  const { relay_id, on_time, off_time } = req.body;
  try {
    const [result] = await pool.execute('INSERT INTO schedules (relay_id, on_time, off_time) VALUES (?, ?, ?)', [relay_id, on_time, off_time]);
    res.json({ id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/schedules/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM schedules WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {

  console.log(`🚀 Server: http://localhost:${PORT}`);
  
  // SCHEDULER HEARTBEAT (Every 1 minute)
  setInterval(async () => {
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
    
    try {
      const [schedules] = await pool.execute('SELECT * FROM schedules WHERE is_active = 1');
      for (const task of schedules) {
        const onT = task.on_time.substring(0, 5);
        const offT = task.off_time.substring(0, 5);
        
        let targetState = -1;
        if (currentTime === onT) targetState = 1;
        else if (currentTime === offT) targetState = 0;

        if (targetState !== -1) {
          console.log(`⏰ Schedule Triggered! Relay ${task.relay_id} -> ${targetState === 1 ? 'ON' : 'OFF'}`);
          await pool.execute('UPDATE relays SET state = ? WHERE id = ?', [targetState, task.relay_id]);
          
          const ESP32_IP = (process.env.ESP32_IP || '192.168.1.100').split(/[\s#]/)[0].trim();
          axios.post(`http://${ESP32_IP}/relay/${task.relay_id}`, { state: targetState }, { timeout: 2000 }).catch(() => {});
        }
      }
    } catch (e) { console.error('Scheduler Error:', e.message); }
  }, 60000);
});


