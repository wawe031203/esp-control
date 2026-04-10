const axios = require('axios');

async function toggleRelay() {
  const baseURL = 'http://localhost:3000/api';
  try {
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('Toggling Relay 1 to OFF...');
    const res = await axios.put(`${baseURL}/relays/1`, { state: 0 }, { headers });
    console.log('Update Result:', res.data);
    
    // Check DB
    console.log('Checking Relay 1 state in DB...');
    const statusRes = await axios.get(`${baseURL}/relays/1`, { headers });
    console.log('Current DB State:', statusRes.data);
  } catch (err) {
    console.error('Failed:', err.response ? err.response.data : err.message);
  }
}

toggleRelay();
