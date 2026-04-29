const axios = require('axios');

async function checkSensors() {
  const baseURL = 'http://localhost:3000/api';
  try {
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('Fetching latest sensor data (All 3 Sensors)...');
    const res = await axios.get(`${baseURL}/sensors/latest`, { headers });
    
    for (let i = 1; i <= 3; i++) {
        const data = res.data[`sensor${i}`];
        if (data) {
            console.log(`\n--- SENSOR ${i} ---`);
            console.log(`Voltage: ${data.voltage}V`);
            console.log(`Current: ${data.current}A`);
            console.log(`Power:   ${data.power}W`);
            console.log(`Energy:  ${data.energy}kWh`);
        } else {
            console.log(`\n--- SENSOR ${i} ---`);
            console.log('No data available.');
        }
    }
  } catch (err) {
    console.error('Failed:', err.response ? err.response.data : err.message);
  }
}

checkSensors();
