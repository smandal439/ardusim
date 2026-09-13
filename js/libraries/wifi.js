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
    // WiFi.RSSI() → _a.wifiRSSI()
    [/\bWiFi\.RSSI\s*\(\s*\)/g, '_a.wifiRSSI()'],
    // WiFi.scanNetworks() → _a.wifiScanNetworks()
    [/\bWiFi\.scanNetworks\s*\(\s*\)/g, '_a.wifiScanNetworks()'],
    // WiFi.SSID() → _a.wifiSSID()
    [/\bWiFi\.SSID\s*\(\s*\)/g, '_a.wifiSSID()'],
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
          return { ssid: c.props.ssid, password: c.props.password, channel: c.props.channel || 6, ipAddress: c.props.ipAddress || '192.168.4.1' };
        }
      }
      return null;
    }

    /** Generate a client IP in the same subnet as the gateway. */
    function _clientIpFromGateway(gw) {
      var parts = gw.split('.');
      if (parts.length !== 4) return '192.168.4.105';
      parts[3] = '105';
      return parts.join('.');
    }

    return {
      wifiBegin: function(ssid, pass) {
        const hotspot = _findHotspot(ssid);
        if (!hotspot) {
          self._wifiConnected = false;
          self._wifiClientIP = null;
          self._wifiSSID = null;
          self._serialLog('[ESP32 Wi-Fi] SSID not found: "' + ssid + '"\n', 'system');
          return;
        }
        if (hotspot.password !== pass) {
          self._wifiConnected = false;
          self._wifiClientIP = null;
          self._wifiSSID = null;
          self._serialLog('[ESP32 Wi-Fi] Wrong password for "' + ssid + '"\n', 'system');
          return;
        }
        const clientIP = _clientIpFromGateway(hotspot.ipAddress);
        self._serialLog('[ESP32 Wi-Fi] Connecting to "' + ssid + '"...\n', 'system');
        setTimeout(function() {
          self._wifiConnected = true;
          self._wifiClientIP = clientIP;
          self._wifiSSID = ssid;
          self._serialLog('[ESP32 Wi-Fi] Connected! IP: ' + clientIP + '\n', 'system');
        }, Math.max(50, 800 / self.speed));
      },
      wifiLocalIP: function() { return self._wifiClientIP || '0.0.0.0'; },
      wifiSoftAPIP: function() { return '192.168.4.1'; },
      wifiStatus: function() { return self._wifiConnected ? 3 : 6; },
      wifiDisconnect: function() {
        self._wifiConnected = false;
        self._wifiSSID = null;
        self._serialLog('[ESP32 Wi-Fi] Disconnected\n', 'system');
      },
      wifiReconnect: function() { self._serialLog('[ESP32 Wi-Fi] Reconnected\n', 'system'); },
      wifiMode: function() { },
      wifiSoftAP: function(ssid, pass) {
        self._serialLog('[ESP32 Wi-Fi] SoftAP "' + ssid + '" started\n', 'system');
      },
      wifiRSSI: function() {
        if (!self._wifiConnected || !self._wifiSSID) return 0;
        var hotspot = _findHotspot(self._wifiSSID);
        if (!hotspot) return -90;
        var txPower = hotspot.txPower || 20;
        var baseRssi = txPower - 40;
        return baseRssi + Math.round((Math.sin(Date.now() / 3000) * 3));
      },
      wifiScanNetworks: function() {
        var canvas = window.CircuitCanvas;
        if (!canvas || !Array.isArray(canvas.components)) return 0;
        var count = 0;
        for (var i = 0; i < canvas.components.length; i++) {
          if (canvas.components[i].type === 'wifi_module') count++;
        }
        self._wifiScanResults = [];
        for (var j = 0; j < canvas.components.length; j++) {
          var c = canvas.components[j];
          if (c.type === 'wifi_module' && c.props) {
            self._wifiScanResults.push(c.props.ssid || '');
          }
        }
        return count;
      },
      wifiSSID: function() { return self._wifiSSID || ''; },
    };
  },
};
