require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  let pool;
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
    });
    
    console.log("=== PSTI SYSTEM STATUS CHECK ===");
    
    for (let sid = 1; sid <= 3; sid++) {
      console.log(`\n--- Sensor ${sid} (Last 3 Readings) ---`);
      try {
        const [rows] = await pool.execute(`SELECT id, timestamp, voltage, current, power, energy FROM sensors${sid} ORDER BY id DESC LIMIT 3`);
        if (rows.length > 0) {
          console.table(rows);
        } else {
          console.log(`No data found in sensors${sid}`);
        }
      } catch (e) {
        console.error(`Error reading sensors${sid}:`, e.message);
      }
    }

    console.log("\n--- Relay Status ---");
    const [relays] = await pool.execute('SELECT id, state, cycles, last_changed FROM relays');
    console.table(relays);

    console.log("\n--- Schedules ---");
    const [schedules] = await pool.execute('SELECT * FROM schedules');
    if (schedules.length > 0) {
      console.table(schedules);
    } else {
      console.log("No schedules configured.");
    }

    console.log("\n--- Settings ---");
    const [settings] = await pool.execute('SELECT * FROM settings');
    console.table(settings);
    
    console.log("\n✅ Check complete.");
    process.exit(0);
  } catch(e) {
    console.error("\n❌ Database Connection Failed:");
    console.error(e.message);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
})();

