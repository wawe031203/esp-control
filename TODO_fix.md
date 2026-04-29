# TODO: Fix Relay + Sensor Issues

## Masalah
1. Relay tidak hidup/mati saat dashboard aktif
2. Sensor sudah terpasang & listrik mengalir tapi tidak terbaca

## Progress

### 1. server.js ✅
- [x] Fix default ESP32_IP dari 192.168.1.100 → 192.168.100.100
- [x] Tambah helper pushRelayToESP32 dengan better error handling
- [x] Endpoint PUT /api/relays/:id gunakan helper
- [x] Scheduler gunakan helper push yang sama

### 2. firmware/src/main.cpp ✅
- [x] Fix handleRelayControl() — baca JSON body lebih robust + log detail
- [x] Fix pollRelayStatus() — auto-relogin saat 401
- [x] Fix serverGet() — return "401" signal untuk trigger re-login
- [x] Fix sensor reading — tambah retry 3x sebelum menyerah

### 3. relay-control-i40.html ✅
- [x] Refactor sync() — jangan re-render seluruh relay grid
- [x] Update DOM selektif (class active + checked state saja)
- [x] Hapus flicker relay tiap 3 detik

## Langkah Selanjutnya (User Action Required)

1. **Restart Server Node.js** agar perubahan `server.js` aktif.
2. **Flash Ulang ESP32** dengan firmware yang sudah diperbarui (`firmware/src/main.cpp`).
3. **Verifikasi Wiring PZEM** (sangat penting untuk sensor):
   - PZEM RX → ESP32 TX
   - PZEM TX → ESP32 RX
   - Pastikan polaritas 5V/GND benar.
4. **Buka Dashboard** dan tes toggle relay — seharusnya sekarang langsung merespons tanpa flicker.
5. **Cek Serial Monitor ESP32** saat boot — seharusnya muncul log `[SENSOR X] Reading...` dan nilai voltase/arus jika wiring benar.

