require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkTables() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    const connection = await pool.getConnection();
    
    // List all tables
    const [tables] = await connection.execute('SHOW TABLES;');
    console.log('=== TABEL DI DATABASE ===');
    tables.forEach(t => console.log('-', Object.values(t)[0]));
    
    // Check row counts
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users;');
    const [sensorCount] = await connection.execute('SELECT COUNT(*) as count FROM sensors;');
    const [relayCount] = await connection.execute('SELECT COUNT(*) as count FROM relays;');
    
    console.log('\n=== JUMLAH DATA DALAM TABEL ===');
    console.log('✓ users:', userCount[0].count, 'row(s)');
    console.log('✓ sensors:', sensorCount[0].count, 'row(s)');
    console.log('✓ relays:', relayCount[0].count, 'row(s)');
    
    console.log('\n=== DATA USERS ===');
    const [users] = await connection.execute('SELECT id, username, level FROM users;');
    console.log(users);
    
    console.log('\n=== DATA RELAYS ===');
    const [relays] = await connection.execute('SELECT * FROM relays;');
    console.log(relays);
    
    connection.release();
    pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkTables();
