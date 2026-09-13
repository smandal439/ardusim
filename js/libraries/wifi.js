/**
 * WiFi Library Plugin for ArduSim (ESP32)
 *
 * Provides WiFi simulation.
 * Supports: begin, localIP, softAPIP, status, disconnect, mode, softAP, reconnect.
 *
 * WiFi.begin(ssid, password) searches the canvas for a wifi_module (Wi-Fi Hotspot)
 * component with matching SSID. Connection succeeds only if the hotspot exists and
 * the password matches. Without a hotspot on the canvas, WiFi code will not connect.
 *
 * Usage in Arduino code:
 *   #include <WiFi.h>
 *   WiFi.begin(ssid, password);
 *   WiFi.localIP();
 *   WiFi.softAPIP();
 *   WiFi.status();
 *   WiFi.disconnect();
 *   WiFi.mode(WIFI_STA);
 *   WiFi.softAP(ssid, password);
 *   WiFi.reconnect();
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['WiFi'] = {
  classes: [],
  includes: ['<WiFi.h>'],

  transpile: [
    // WiFi.begin() → _a.wifiBegin()
    [/\bWiFi\.begin\s*\(/g, '_a.wifiBegin('],
    // WiFi.localIP() → _a.wifiLocalIP()
    [/\bWiFi\.localIP\s*\(/g, '_a.wifiLocalIP('],
    // WiFi.softAPIP() → _a.wifiSoftAPIP()
    [/\bWiFi\.softAPIP\s*\(/g, '_a.wifiSoftAPIP('],
    // WiFi.status() → _a.wifiStatus()
    [/\bWiFi\.status\s*\(/g, '_a.wifiStatus('],
    // WiFi.disconnect() → _a.wifiDisconnect()
    [/\bWiFi\.disconnect\s*\(/g, '_a.wifiDisconnect('],
    // WiFi.mode() → _a.wifiMode()
    [/\bWiFi\.mode\s*\(/g, '_a.wifiMode('],
    // WiFi.softAP() → _a.wifiSoftAP()
    [/\bWiFi\.softAP\s*\(/g, '_a.wifiSoftAP('],
    // WiFi.reconnect() → _a.wifiReconnect()
    [/\bWiFi\.reconnect\s*\(/g, '_a.wifiReconnect('],
  ],

  constants: { WL_CONNECTED: 3, WL_IDLE_STATUS: 0, WL_NO_SSID_AVAIL: 1, WL_SCAN_COMPLETED: 2, WL_CONNECT_FAILED: 4, WL_CONNECTION_LOST: 5, WL_DISCONNECTED: 6, WIFI_STA: 1, WIFI_AP: 2, WIFI_AP_STA: 3 },

  constructor: null,

  runtime: function(self) {
    /**
     * Find a matching Wi-Fi Hotspot on the canvas.
     * Searches CircuitCanvas.components directly (avoids timing issues with
     * the render-loop bus that may not yet be populated during setup()).
     */
    function _findHotspot(ssid) {
      var canvas = window.CircuitCanvas;
      if (!canvas || !Array.isArray(canvas.components)) return null;
      for (var i = 0; i < canvas.components.length; i++) {
        var c = canvas.components[i];
        if (c.type !== 'wifi_module') continue;
        if (c.props && c.props.ssid === ssid) {
          return { ssid: c.props.ssid, password: c.props.password, channel: c.props.channel || 6 };
        }
      }
      return null;
    }

    return {
      wifiBegin: function(ssid, pass) {
        const hotspot = _findHotspot(ssid);
        if (!hotspot) {
          self._wifiConnected = false;
          self._serialLog('[ESP32 Wi-Fi] SSID not found: "' + ssid + '"\n', 'system');
          return;
        }
        if (hotspot.password !== pass) {
          self._wifiConnected = false;
          self._serialLog('[ESP32 Wi-Fi] Wrong password for "' + ssid + '"\n', 'system');
          return;
        }
        self._serialLog('[ESP32 Wi-Fi] Connecting to "' + ssid + '"...\n', 'system');
        setTimeout(function() {
          self._wifiConnected = true;
          self._serialLog('[ESP32 Wi-Fi] Connected! IP: 192.168.1.105\n', 'system');
        }, Math.max(50, 800 / self.speed));
      },
      wifiLocalIP: function() { return '192.168.1.105'; },
      wifiSoftAPIP: function() { return '192.168.4.1'; },
      wifiStatus: function() { return self._wifiConnected ? 3 : 6; },
      wifiDisconnect: function() {
        self._wifiConnected = false;
        self._serialLog('[ESP32 Wi-Fi] Disconnected\n', 'system');
      },
      wifiReconnect: function() { self._serialLog('[ESP32 Wi-Fi] Reconnected\n', 'system'); },
      wifiMode: function() { },
      wifiSoftAP: function(ssid, pass) {
        self._serialLog('[ESP32 Wi-Fi] SoftAP "' + ssid + '" started\n', 'system');
      },
    };
  },
};
