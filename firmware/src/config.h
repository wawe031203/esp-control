#pragma once

// ============================================================
//  KONFIGURASI UTAMA — PSTI ENERGY MONITOR
// ============================================================

// --- WiFi ---
#define WIFI_SSID     "Faiz"
#define WIFI_PASSWORD "12345678"

// --- IP Static ESP32 (Agar Server Selalu Tahu IP ESP32) ---
#define USE_STATIC_IP true
#define ESP_IP        192, 168, 100, 100
#define ESP_GATEWAY   192, 168, 100, 1
#define ESP_SUBNET    255, 255, 255, 0

// --- Server Node.js (IP Laptop/PC Anda) ---
#define SERVER_HOST   "192.168.100.25"
#define SERVER_PORT   3000
#define SERVER_BASE   "http://" SERVER_HOST ":" STRINGIFY(SERVER_PORT)

// Kredensial login ESP32 ke server
#define ESP_USERNAME  "admin"
#define ESP_PASSWORD  "admin123"

// --- Pin PZEM-004T ---
#define PZEM_RX_PIN   16   // ESP32 RX2 <- TX PZEM
#define PZEM_TX_PIN   17   // ESP32 TX2 -> RX PZEM

// --- Pin Relay (Active LOW) ---
#define RELAY1_PIN    14
#define RELAY2_PIN    25
#define RELAY3_PIN    26
#define RELAY4_PIN    27
#define RELAY_COUNT   4

// --- Timing ---
#define SENSOR_INTERVAL_MS   5000   // Kirim data sensor tiap 5 detik
#define RELAY_POLL_MS        2000   // Backup polling tiap 2 detik
#define WIFI_RECONNECT_MS   10000   // Cek WiFi tiap 10 detik

// Helper macro
#define STRINGIFY2(x) #x
#define STRINGIFY(x)  STRINGIFY2(x)
