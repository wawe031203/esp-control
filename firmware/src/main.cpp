/* ============================================================
   PSTI – ESP32 Energy Monitoring & Instant Relay Control
   (Multi-Sensor Edition: 3 PZEM Sensors)
   ============================================================ */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>
#include "config.h"

// ── PZEM Multi Sensor ──────────────────────────────────────
// Sensor 1: Hardware Serial 2 (GPIO 32, 33)
PZEM004Tv30 pzem1(Serial2, PZEM1_RX_PIN, PZEM1_TX_PIN);

// Sensor 2: Hardware Serial 1 (GPIO 16, 17)
PZEM004Tv30 pzem2(Serial1, PZEM2_RX_PIN, PZEM2_TX_PIN);

// Sensor 3: Hardware Serial 0 (GPIO 4, 5)
PZEM004Tv30 pzem3(Serial, PZEM3_RX_PIN, PZEM3_TX_PIN);

WebServer server(80);

// ── Relay State ────────────────────────────────────────────
const uint8_t RELAY_PINS[RELAY_COUNT] = {
    RELAY1_PIN, RELAY2_PIN, RELAY3_PIN, RELAY4_PIN
};
bool relayState[RELAY_COUNT] = {false, false, false, false};

// ── Variables ──────────────────────────────────────────────
String jwtToken = "";
unsigned long lastSensorMs  = 0;
unsigned long lastRelayMs   = 0;
unsigned long lastWifiCheck = 0;

// Store last valid readings for each sensor
struct SensorData {
    float v = 0, i = 0, p = 0, e = 0, f = 0, pf = 0;
};
SensorData lastReadings[3];

// ── Prototypes ─────────────────────────────────────────────
bool connectWiFi();
bool loginToServer();
bool sendSensorData(int sid, float v, float i, float p, float e, float f, float pf);
void pollRelayStatus();
void handleRelayControl();
String serverGet(const String& endpoint);
String buildAuthHeader();

// =============================================================
//  SETUP
// =============================================================
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println(F("\n\n========================================"));
    Serial.println(F("  PSTI SYSTEM READY - MULTI SENSOR"));
    Serial.println(F("========================================"));

    // Init Relays (All OFF)
    for (int i = 0; i < RELAY_COUNT; i++) {
        pinMode(RELAY_PINS[i], OUTPUT);
        digitalWrite(RELAY_PINS[i], HIGH);
    }

    // Connect WiFi
    if (!connectWiFi()) {
        Serial.println(F("[WIFI] Critical Error. Restarting..."));
        delay(5000);
        ESP.restart();
    }

    // Auth
    if (!loginToServer()) {
        Serial.println(F("[AUTH] Login failed. Will retry later..."));
    }

    // Init PZEM Serials
    Serial2.begin(9600, SERIAL_8N1, PZEM1_RX_PIN, PZEM1_TX_PIN);
    Serial.printf("[BOOT] PZEM 1 Serial (H2) Init on RX:%d, TX:%d\n", PZEM1_RX_PIN, PZEM1_TX_PIN);

    Serial1.begin(9600, SERIAL_8N1, PZEM2_RX_PIN, PZEM2_TX_PIN);
    Serial.printf("[BOOT] PZEM 2 Serial (H1) Init on RX:%d, TX:%d\n", PZEM2_RX_PIN, PZEM2_TX_PIN);

    // PZEM3 pakai Serial0 (Pin 4, 5)
    // Kita panggil begin() ulang untuk mengubah baud ke 9600 dan pindah pin
    Serial.begin(9600, SERIAL_8N1, PZEM3_RX_PIN, PZEM3_TX_PIN);
    // Catatan: Setelah ini, log debug ke USB mungkin terganggu karena Serial0 digunakan PZEM

    // Setup Web Server Routes for Instant Push
    server.on("/relay/1", HTTP_POST, handleRelayControl);
    server.on("/relay/2", HTTP_POST, handleRelayControl);
    server.on("/relay/3", HTTP_POST, handleRelayControl);
    server.on("/relay/4", HTTP_POST, handleRelayControl);
    server.begin();
    Serial.println(F("[HTTP] Instant Control Server Started on Port 80"));

    Serial.println(F("[BOOT] System Fully Prepared. Monitoring 3 Sensors..."));
}

// =============================================================
//  LOOP
// =============================================================
void loop() {
    server.handleClient(); // Handle instant commands from web
    unsigned long now = millis();

    // WiFi Watchdog
    if (now - lastWifiCheck >= WIFI_RECONNECT_MS) {
        lastWifiCheck = now;
        if (WiFi.status() != WL_CONNECTED) connectWiFi();
    }

    // Sensor Monitoring (Every 5s)
    if (now - lastSensorMs >= SENSOR_INTERVAL_MS) {
        lastSensorMs = now;
        
        PZEM004Tv30* sensors[] = { &pzem1, &pzem2, &pzem3 };

        for (int s = 0; s < 3; s++) {
            int sid = s + 1;
            if (sid != 3) Serial.printf("[SENSOR %d] Reading...\n", sid);

            float v = 0, i = 0, p = 0, e = 0, f = 0, pf = 0;
            bool valid = false;
            
            // Retry up to 1 times (no retry) for robust reading to avoid heavy lag if disconnected
            for (int retry = 0; retry < 1 && !valid; retry++) {
                if (sid != 3 && retry > 0) {
                    Serial.printf("[SENSOR %d] Retry %d/1...\n", sid, retry);
                    delay(50);
                }
                v = sensors[s]->voltage();
                if (!isnan(v)) {
                    delay(5); i = sensors[s]->current();
                    delay(5); p = sensors[s]->power();
                    delay(5); e = sensors[s]->energy();
                    delay(5); f = sensors[s]->frequency();
                    delay(5); pf = sensors[s]->pf();
                    valid = true;
                }
            }

            if (valid) {
                lastReadings[s].v  = v;
                lastReadings[s].i  = i;
                lastReadings[s].p  = p;
                lastReadings[s].e  = e;
                lastReadings[s].f  = f;
                lastReadings[s].pf = pf;
                
                // Gunakan sid != 3 untuk log agar tidak mengganggu port PZEM 3 (Serial0)
                if (sid != 3) {
                    Serial.printf("[DEBUG] S%d -> V: %.1f, I: %.2f, P: %.1f\n", sid, v, i, p);
                }
                
                if (WiFi.status() == WL_CONNECTED) {
                    sendSensorData(sid, v, i, p, e, f, pf);
                }
            } else {
                if (sid != 3) {
                    Serial.printf("[ERROR] S%d failed. Check wiring or AC power.\n", sid);
                }
            }
        }
    }

    // Backup Polling (Every 2s - if push fails)
    if (now - lastRelayMs >= RELAY_POLL_MS) {
        lastRelayMs = now;
        if (!jwtToken.isEmpty()) pollRelayStatus();
    }
}

// =============================================================
//  INSTANT CONTROL HANDLER (PUSH)
// =============================================================
void handleRelayControl() {
    String uri = server.uri(); // e.g. /relay/1
    int id = uri.substring(7).toInt(); // get "1"
    
    if (id < 1 || id > RELAY_COUNT) {
        server.send(400, "application/json", "{\"error\":\"Invalid ID\"}");
        return;
    }

    String body = server.arg("plain");
    if (body.length() == 0) {
        server.send(400, "application/json", "{\"error\":\"No data\"}");
        return;
    }

    Serial.printf("[RELAY] Raw body: %s\n", body.c_str());

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, body);
    if (err) {
        Serial.printf("[RELAY] JSON parse error: %s\n", err.c_str());
        server.send(400, "application/json", "{\"error\":\"Bad JSON\"}");
        return;
    }

    bool state = (doc["state"] | 0) == 1;
    int idx = id - 1;
    relayState[idx] = state;
    digitalWrite(RELAY_PINS[idx], state ? LOW : HIGH);

    Serial.printf("[PUSH] Relay %d set to %s\n", id, state ? "ON" : "OFF");
    server.send(200, "application/json", "{\"success\":true}");
}

// =============================================================
//  WIFI & AUTH
// =============================================================
bool connectWiFi() {
    WiFi.mode(WIFI_STA);
    
    #if USE_STATIC_IP
    IPAddress ip(ESP_IP);
    IPAddress gateway(ESP_GATEWAY);
    IPAddress subnet(ESP_SUBNET);
    WiFi.config(ip, gateway, subnet);
    #endif

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);
    
    int t = 0;
    while (WiFi.status() != WL_CONNECTED && t++ < 40) {
        delay(500);
        Serial.print('.');
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("[WIFI] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
        return true;
    }
    return false;
}

bool loginToServer() {
    HTTPClient http;
    http.begin(String(SERVER_BASE) + "/api/auth/login");
    http.addHeader("Content-Type", "application/json");
    
    JsonDocument doc;
    doc["username"] = ESP_USERNAME;
    doc["password"] = ESP_PASSWORD;
    String payload;
    serializeJson(doc, payload);

    int code = http.POST(payload);
    if (code == 200) {
        JsonDocument res;
        deserializeJson(res, http.getString());
        jwtToken = res["token"].as<String>();
        http.end();
        return true;
    }
    http.end();
    return false;
}

// =============================================================
//  HTTP OPERATIONS
// =============================================================
bool sendSensorData(int sid, float v, float i, float p, float e, float f, float pf) {
    HTTPClient http;
    http.begin(String(SERVER_BASE) + "/api/sensors/" + String(sid));
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", buildAuthHeader());

    JsonDocument doc;
    doc["voltage"]   = v;
    doc["current"]   = i;
    doc["power"]     = p;
    doc["energy"]    = e;
    doc["frequency"] = f;
    doc["pf"]        = pf;

    String payload;
    serializeJson(doc, payload);
    int code = http.POST(payload);
    http.end();
    
    if (code == 200 || code == 201) {
        Serial.printf("[SENSOR %d] Data Updated\n", sid);
    } else if (code == 401) {
        Serial.printf("[SENSOR %d] Unauthorized (401), Retrying login...\n", sid);
        loginToServer();
    } else {
        Serial.printf("[SENSOR %d] Failed to send: %d. Check server connection.\n", sid, code);
    }
    
    return (code == 200);
}

void pollRelayStatus() {
    String body = serverGet("/api/relays");
    if (body.isEmpty()) return;

    // If unauthorized, try re-login once
    if (body == "401") {
        Serial.println("[POLL] Token expired, re-logging in...");
        if (loginToServer()) {
            body = serverGet("/api/relays");
        }
        if (body.isEmpty() || body == "401") return;
    }

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, body);
    if (err || !doc.is<JsonArray>()) {
        Serial.printf("[POLL] JSON parse error: %s\n", err.c_str());
        return;
    }

    for (JsonObject r : doc.as<JsonArray>()) {
        int id = r["id"] | 0;
        if (id < 1 || id > RELAY_COUNT) continue;
        bool state = (r["state"] | 0) == 1;
        int idx = id - 1;
        if (state != relayState[idx]) {
            relayState[idx] = state;
            digitalWrite(RELAY_PINS[idx], state ? LOW : HIGH);
            Serial.printf("[POLL] Relay %d set to %s\n", id, state ? "ON" : "OFF");
        }
    }
}

String serverGet(const String& endpoint) {
    HTTPClient http;
    http.begin(String(SERVER_BASE) + endpoint);
    http.addHeader("Authorization", buildAuthHeader());
    int code = http.GET();
    String body = "";
    if (code == 200) {
        body = http.getString();
    } else if (code == 401) {
        body = "401"; // Signal to re-login
    }
    http.end();
    return body;
}

String buildAuthHeader() { return "Bearer " + jwtToken; }
