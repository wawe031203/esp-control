require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
    });
    
    for (let i = 1; i <= 3; i++) {
        console.log(`\n--- SENSOR ${i} (Table: sensors${i}) ---`);
        const [rows] = await pool.execute(`SELECT * FROM sensors${i} ORDER BY id DESC LIMIT 3`);
        if (rows.length > 0) {
            console.table(rows);
        } else {
            console.log("No data found.");
        }
    }

    console.log(`\n--- RELAYS (Table: relays) ---`);
    const [relays] = await pool.execute(`SELECT * FROM relays`);
    console.table(relays);
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
