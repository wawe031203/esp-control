const axios = require('axios');

async function toggleRelay(id, state) {
  const baseURL = 'http://localhost:3000/api';
  try {
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    console.log(`Toggling Relay ${id} to ${state ? 'ON' : 'OFF'}...`);
    const res = await axios.put(`${baseURL}/relays/${id}`, { state }, { headers });
    console.log('Server response:', res.data);
  } catch (err) {
    console.error('Failed:', err.response ? err.response.data : err.message);
  }
}

const relayId = process.argv[2] || 3;
const relayState = process.argv[3] === 'on' ? 1 : 0;

toggleRelay(relayId, relayState);
