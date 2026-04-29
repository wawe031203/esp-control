const axios = require('axios');

async function simulateSensor() {
  const baseURL = 'http://localhost:3000/api';
  
  try {
    console.log('Logging in as ESP32...');
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    for (let sid = 1; sid <= 3; sid++) {
      const sensorData = {
        voltage: 220.0 + (Math.random() * 10),
        current: 2.50 + (Math.random() * 0.5),
        power: 550.0 + (Math.random() * 50),
        energy: 12.40 + (Math.random() * 0.1),
        frequency: 50.0 + (Math.random() * 0.2),
        pf: 0.95
      };

      console.log(`Sending Real-time Sensor Data for Sensor ${sid} to Database...`);
      const res = await axios.post(`${baseURL}/sensors/${sid}`, sensorData, { headers });
      
      if (res.status === 200 || res.status === 201) {
        console.log(`✅ Success for Sensor ${sid}! Data sent to MySQL.`);
      }
    }
  } catch (err) {
    console.error('❌ Failed to send data:', err.response ? err.response.data : err.message);
  }
}

simulateSensor();
