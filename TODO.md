 # Multi-Sensor Update (3 Sensors - Separate DB Tables)

## Steps:
1. [✅] Update server.js: Migrate sensors→sensors1, create sensors2/sensors3, update APIs /sensors/:id
2. [✅] Update firmware/src/config.h: Add NUM_SENSORS=3
3. [✅] Update firmware/src/main.cpp: 3 PZEM instances (Serial1/2 + SoftwareSerial), send to /api/sensors/1,2,3
4. [✅] Update monitoring-i40.html: Tabs/sections for 3 sensors
5. [✅] Update statistics-i40.html & laporan-i40.html
6. [✅] Update check_sensors.js
7. [✅] Test: node server.js, pio upload, node check_sensors.js

Current: All systems updated and ready for 3-sensor monitoring.
