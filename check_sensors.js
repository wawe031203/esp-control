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

    console.log('Fetching latest sensor data...');
    const res = await axios.get(`${baseURL}/sensors/latest`, { headers });
    console.log('Latest Sensor Data:', res.data);
  } catch (err) {
    console.error('Failed:', err.response ? err.response.data : err.message);
  }
}

checkSensors();
