# Firmware ESP32 – PSTI Energy Monitor

## Skema Wiring

### PZEM-004T → ESP32
| PZEM Pin | ESP32 Pin | Keterangan |
|----------|-----------|------------|
| TX       | GPIO 16   | RX2 ESP32  |
| RX       | GPIO 17   | TX2 ESP32  |
| 5V       | 5V        | Power      |
| GND      | GND       | Ground     |

> ⚠ PZEM butuh 5V — jangan hubungkan ke 3.3V

### Relay 4-CH → ESP32
| Relay  | ESP32 Pin | Keterangan         |
|--------|-----------|--------------------|
| IN1    | GPIO 14   | Relay 1 (LMP-01)  |
| IN2    | GPIO 25   | Relay 2 (PMP-01)  |
| IN3    | GPIO 26   | Relay 3 (FAN-01)  |
| IN4    | GPIO 27   | Relay 4 (AUX-04)  |
| VCC    | 5V        | Power modul relay  |
| GND    | GND       | Ground             |

> Modul relay Active-LOW: pin HIGH = relay OFF, pin LOW = relay ON

---

## Cara Upload Firmware

### 1. Edit Konfigurasi
Buka `src/config.h` dan ubah:
```cpp
#define WIFI_SSID     "NAMA_WIFI_ANDA"
#define WIFI_PASSWORD "PASSWORD_WIFI_ANDA"
#define SERVER_HOST   "192.168.1.10"   // IP komputer server (bukan localhost!)
```

> Cek IP komputer server: buka CMD → ketik `ipconfig` → lihat **IPv4 Address**

### 2. Buka di VS Code dengan PlatformIO
```
File → Open Folder → pilih folder firmware/
```

### 3. Build & Upload
- Klik ✅ (Build) di toolbar bawah PlatformIO
- Klik → (Upload) untuk flash ke ESP32
- Klik 🔌 (Monitor) untuk lihat output Serial

### 4. Output Normal di Serial Monitor
```
========================================
  PSTI Energy Monitor v2.0 - Booting
========================================
[RELAY] 4 relay diinisialisasi → semua OFF
[PZEM] Serial2 RX=16 TX=17 @ 9600 baud
[WIFI] Menghubungkan ke 'NamaWiFi'........
[WIFI] ✅ Terhubung! IP: 192.168.1.50
[AUTH] Login attempt 1/3...
[AUTH] ✅ Login berhasil!
[BOOT] ✅ Setup selesai, mulai monitoring...

[PZEM] V=220.3V  I=1.250A  P=275.4W  E=0.012kWh  F=50.00Hz  PF=0.95
[HTTP] ✅ Data sensor terkirim ke database
[RELAY] Relay 1: OFF → ON
```

---

## Troubleshooting

| Masalah | Kemungkinan Penyebab | Solusi |
|---------|---------------------|--------|
| `[PZEM] Tidak ada respons` | Kabel TX/RX terbalik | Tukar pin RX↔TX |
| `[PZEM] Tidak ada respons` | PZEM belum dapat tegangan AC | Hubungkan ke sumber AC |
| `[WIFI] Gagal terhubung` | SSID/password salah | Cek config.h |
| `[AUTH] Login gagal` | SERVER_HOST salah | Gunakan IP LAN, bukan localhost |
| `[HTTP] POST gagal 401` | Token expired | ESP32 auto re-login |
| Relay tidak merespons | Pin wiring salah | Cek tabel wiring di atas |
