require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

const API_BASE = 'http://localhost:3000/api';
let token = '';

async function login() {
    try {
        const res = await axios.post(`${API_BASE}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        token = res.data.token;
        return true;
    } catch (e) {
        console.error('❌ Login Gagal. Pastikan server sudah jalan.');
        return false;
    }
}

function formatVal(val, unit, decimals = 2) {
    if (val === null || val === undefined) return '--'.padStart(8) + ' ' + unit;
    return parseFloat(val).toFixed(decimals).padStart(8) + ' ' + unit;
}

async function monitor() {
    if (!token && !(await login())) return;

    try {
        const res = await axios.get(`${API_BASE}/sensors/latest`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = res.data;
        
        console.clear();
        console.log('\x1b[36m%s\x1b[0m', '=============================================================');
        console.log('\x1b[36m%s\x1b[0m', '         PSTI ENERGY MONITOR - TERMINAL REAL-TIME            ');
        console.log('\x1b[36m%s\x1b[0m', '=============================================================');
        console.log(` Waktu: ${new Date().toLocaleString('id-ID')} | User: admin`);
        console.log('-------------------------------------------------------------');
        
        console.log(' SENSOR    | VOLTAGE   | CURRENT   | POWER     | ENERGY    ');
        console.log('-----------|-----------|-----------|-----------|-----------');

        for (let i = 1; i <= 3; i++) {
            const s = data[`sensor${i}`];
            const name = ` SENSOR 0${i} `;
            const v = formatVal(s?.voltage, 'V', 1);
            const a = formatVal(s?.current, 'A', 3);
            const w = formatVal(s?.power, 'W', 1);
            const k = formatVal(s?.energy, 'kWh', 3);
            
            let color = '\x1b[0m'; // Default
            if (s?.power > 100) color = '\x1b[33m'; // Amber for high power
            if (s?.voltage < 180) color = '\x1b[31m'; // Red for low voltage
            
            console.log(`${color}${name}|${v} |${a} |${w} |${k}\x1b[0m`);
        }

        console.log('-------------------------------------------------------------');
        console.log(' [Status: Server Online] | Tekan Ctrl+C untuk berhenti');

    } catch (e) {
        if (e.response?.status === 401) {
            token = ''; // Retry login next cycle
        } else {
            console.log('⚠️ Menunggu data dari server...');
        }
    }
}

console.log('Memulai monitor...');
setInterval(monitor, 2000);
monitor();
