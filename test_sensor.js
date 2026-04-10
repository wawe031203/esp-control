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

    const sensorData = {
      voltage: 220.0,
      current: 2.50,
      power: 550.0,
      energy: 12.40,
      frequency: 50.0,
      pf: 0.95
    };

    console.log('Sending Real-time Sensor Data to Database...');
    const res = await axios.post(`${baseURL}/sensors`, sensorData, { headers });
    
    if (res.status === 200 || res.status === 201) {
      console.log('✅ Success! Data sent to MySQL.');
      console.log('Values sent:');
      console.table(sensorData);
    }
  } catch (err) {
    console.error('❌ Failed to send data:', err.response ? err.response.data : err.message);
  }
}

simulateSensor();
