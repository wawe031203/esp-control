const axios = require('axios');

async function testRelay() {
  const baseURL = 'http://localhost:3000/api';
  
  try {
    console.log('Logging in...');
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    console.log('Login successful.');

    const headers = { Authorization: `Bearer ${token}` };

    console.log('Turning Relay 1 ON...');
    const onRes = await axios.put(`${baseURL}/relays/1`, { state: 1 }, { headers });
    console.log('Response:', onRes.data);

    console.log('Waiting 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));

    console.log('Turning Relay 1 OFF...');
    const offRes = await axios.put(`${baseURL}/relays/1`, { state: 0 }, { headers });
    console.log('Response:', offRes.data);

    console.log('Test completed successfully!');
  } catch (err) {
    console.error('Test failed:', err.response ? err.response.data : err.message);
  }
}

testRelay();
