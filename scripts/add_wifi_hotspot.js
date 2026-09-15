#!/usr/bin/env node
/**
 * Adds a wifi_module component to all WiFi-related example circuits.
 * Usage: node scripts/add_wifi_hotspot.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// All WiFi.begin() example files with their SSID/password
const WIFI_EXAMPLES = [
  // ArduSimNet / simulator
  { file: 'Examples/esp32_ntp_clock_lcd.json',              ssid: 'ArduSimNet', password: 'simulator' },
  { file: 'Examples/esp32_server.json',                      ssid: 'ArduSimNet', password: 'simulator' },
  { file: 'Examples/mqtt_esp32.json',                        ssid: 'ArduSimNet', password: 'simulator' },
  { file: 'Examples/ds3231_rtc_clock_sync_with_ntp.json',   ssid: 'ArduSimNet', password: 'simulator' },
  // YOUR_WIFI_SSID / YOUR_WIFI_PASS
  { file: 'Examples/dual_core_mqtt.json',                   ssid: 'YOUR_WIFI_SSID', password: 'YOUR_WIFI_PASSWORD' },
  { file: 'Examples/esp32_i2s_local_radio_player_2.json',   ssid: 'YOUR_WIFI_SSID', password: 'YOUR_WIFI_PASS' },
  { file: 'Examples/esp32_i2s_local_radio_player.json',     ssid: 'YOUR_WIFI_SSID', password: 'YOUR_WIFI_PASS' },
  { file: 'Examples/esp32_i2s_local_test.json',             ssid: 'YOUR_WIFI_SSID', password: 'YOUR_WIFI_PASS' },
  { file: 'Examples/esp32_i2s_music_player.json',           ssid: 'YOUR_WIFI_SSID', password: 'YOUR_WIFI_PASS' },
  { file: 'Examples/esp32_i2s_online_radio_player.json',    ssid: 'YOUR_WIFI_SSID', password: 'YOUR_WIFI_PASS' },
  // HomeNet / password
  { file: 'Examples/esp32_fade.json',                       ssid: 'HomeNet', password: 'password' },
  // project/saved
  { file: 'project/saved/esp32_i2s_online_music_player_2026-09-03.json',       ssid: 'YOUR_WIFI_SSID', password: 'YOUR_WIFI_PASS' },
  { file: 'project/saved/esp32_ntp_clock__lcd__2026-08-21 (1).json',           ssid: 'ArduSimNet', password: 'simulator' },
];

let updated = 0;
let skipped = 0;

for (const { file, ssid, password } of WIFI_EXAMPLES) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${file}`);
    skipped++;
    continue;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!data.circuit || !Array.isArray(data.circuit.components)) {
    console.log(`SKIP (no circuit): ${file}`);
    skipped++;
    continue;
  }

  // Skip if already has wifi_module
  if (data.circuit.components.some(c => c.type === 'wifi_module')) {
    console.log(`SKIP (already has wifi_module): ${file}`);
    skipped++;
    continue;
  }

  // Find ESP32 board to position hotspot near it
  const esp32 = data.circuit.components.find(c => c.type === 'esp32_devkit_v1');
  const espX = esp32 ? esp32.x : 200;
  const espY = esp32 ? esp32.y : 100;

  // Place hotspot above and to the right of the ESP32
  const hotspot = {
    id: 'wifi_hotspot_1',
    type: 'wifi_module',
    x: espX + 180,
    y: espY - 20,
    rotation: 0,
    props: {
      ssid: ssid,
      password: password,
      channel: 6,
      ipAddress: '192.168.4.1',
    },
  };

  data.circuit.components.push(hotspot);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`UPDATED: ${file} (ssid="${ssid}", pw="${password}")`);
  updated++;
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
