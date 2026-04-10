/* ============================================================
   PSTI – ESP32 Energy Monitoring & Instant Relay Control
   ============================================================ */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>
#include "config.h"

// ── PZEM & Server ──────────────────────────────────────────
PZEM004Tv30 pzem(Serial2, PZEM_RX_PIN, PZEM_TX_PIN);
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

// ── Prototypes ─────────────────────────────────────────────
bool connectWiFi();
bool loginToServer();
bool sendSensorData(float v, float i, float p, float e, float f, float pf);
void pollRelayStatus();
void applyRelayStates(bool states[], int count);
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
    Serial.println(F("  PSTI SYSTEM READY - INSTANT CONTROL"));
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
    loginToServer();

    // Setup Web Server Routes for Instant Push
    server.on("/relay/1", HTTP_POST, handleRelayControl);
    server.on("/relay/2", HTTP_POST, handleRelayControl);
    server.on("/relay/3", HTTP_POST, handleRelayControl);
    server.on("/relay/4", HTTP_POST, handleRelayControl);
    server.begin();
    Serial.println(F("[HTTP] Instant Control Server Started on Port 80"));

    Serial.println(F("[BOOT] System Fully Prepared. Monitoring..."));
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
        float v = pzem.voltage();
        if (!isnan(v)) {
            sendSensorData(v, pzem.current(), pzem.power(), pzem.energy(), pzem.frequency(), pzem.pf());
        } else {
            Serial.println(F("[PZEM] Check Connection (AC Power Required)"));
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

    if (server.hasArg("plain")) {
        JsonDocument doc;
        deserializeJson(doc, server.arg("plain"));
        bool state = (doc["state"] | 0) == 1;

        int idx = id - 1;
        relayState[idx] = state;
        digitalWrite(RELAY_PINS[idx], state ? LOW : HIGH);

        Serial.printf("[PUSH] Relay %d set to %s\n", id, state ? "ON" : "OFF");
        server.send(200, "application/json", "{\"success\":true}");
    } else {
        server.send(400, "application/json", "{\"error\":\"No data\"}");
    }
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
bool sendSensorData(float v, float i, float p, float e, float f, float pf) {
    HTTPClient http;
    http.begin(String(SERVER_BASE) + "/api/sensors");
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
    
    if (code == 200) Serial.println(F("[SENSOR] Data Updated in Database"));
    else if (code == 401) loginToServer();
    
    return (code == 200);
}

void pollRelayStatus() {
    String body = serverGet("/api/relays");
    if (body.isEmpty()) return;

    JsonDocument doc;
    if (deserializeJson(doc, body) || !doc.is<JsonArray>()) return;

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
    String body = (code == 200) ? http.getString() : "";
    http.end();
    return body;
}

String buildAuthHeader() { return "Bearer " + jwtToken; }
