const axios = require('axios');

async function checkLogin() {
  const baseURL = 'http://localhost:3000/api';
  try {
    const res = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    console.log('Login Result:', res.data);
  } catch (err) {
    console.error('Login Failed:', err.response ? err.response.data : err.message);
  }
}

checkLogin();
