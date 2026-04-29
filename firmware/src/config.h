#pragma once

// ============================================================
//  KONFIGURASI UTAMA — PSTI ENERGY MONITOR
// ============================================================

// --- WiFi ---
#define WIFI_SSID     "IQBAL"
#define WIFI_PASSWORD "12345678"

// --- IP Static ESP32 (Agar Server Selalu Tahu IP ESP32) ---
#define USE_STATIC_IP true
#define ESP_IP        10, 10, 40, 200
#define ESP_GATEWAY   10, 10, 40, 1
#define ESP_SUBNET    255, 255, 255, 0

// --- Server Node.js (VPS Cloud Domain) ---
#define SERVER_HOST   "skml.buildsys.site"
#define SERVER_PORT   80
#define SERVER_BASE   "http://" SERVER_HOST 
#define STRINGIFY(x) #x
#define TOSTRING(x) STRINGIFY(x)

// Kredensial login ESP32 ke server
#define ESP_USERNAME  "admin"
#define ESP_PASSWORD  "admin123"

// --- PZEM 1 ---
#define PZEM1_RX_PIN   33
#define PZEM1_TX_PIN   32

// --- PZEM 2 ---
#define PZEM2_RX_PIN   19
#define PZEM2_TX_PIN   18


// --- PZEM 3 ---
#define PZEM3_RX_PIN   16
#define PZEM3_TX_PIN   17

// --- Multi Sensor Config ---
#define NUM_SENSORS  3
#define SENSOR1_RX   PZEM1_RX_PIN
#define SENSOR1_TX   PZEM1_TX_PIN
#define SENSOR2_RX   PZEM2_RX_PIN
#define SENSOR2_TX   PZEM2_TX_PIN
#define SENSOR3_RX   PZEM3_RX_PIN
#define SENSOR3_TX   PZEM3_TX_PIN

// --- Pin Relay (Active LOW) ---
#define RELAY1_PIN    14
#define RELAY2_PIN    25
#define RELAY3_PIN    26
#define RELAY4_PIN    27
#define RELAY_COUNT   4

// --- Timing ---
#define SENSOR_INTERVAL_MS   5000   // Kirim data sensor tiap 5 detik
#define RELAY_POLL_MS        1000   // Dipercepat ke 1 detik untuk VPS
#define WIFI_RECONNECT_MS   10000   // Cek WiFi tiap 10 detik

