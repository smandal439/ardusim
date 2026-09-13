/**
 * WiFi Library Plugin for ArduSim (ESP32)
 *
 * Provides WiFi simulation.
 * Supports: begin, localIP, softAPIP, status, disconnect, mode, softAP, reconnect,
 *           RSSI, SSID, BSSIDstr, channel, encryptionType, scanNetworks.
 *
 * WiFi.begin(ssid, password) searches the canvas for a wifi_module (Wi-Fi Hotspot)
 * component with matching SSID. Connection succeeds only if the hotspot exists and
 * the password matches. Without a hotspot on the canvas, WiFi code will not connect.
 *
 * WiFi.scanNetworks() populates scan results from all wifi_module components on the
 * canvas. WiFi.SSID(i), WiFi.RSSI(i), WiFi.channel(i), WiFi.encryptionType(i)
 * return per-network data from the scan.
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
    // WiFi.RSSI(i) or WiFi.RSSI() → _a.wifiRSSI(i) or _a.wifiRSSI()
    [/\bWiFi\.RSSI\s*\(/g, '_a.wifiRSSI('],
    // WiFi.scanNetworks() → _a.wifiScanNetworks()
    [/\bWiFi\.scanNetworks\s*\(/g, '_a.wifiScanNetworks('],
    // WiFi.SSID(i) or WiFi.SSID() → _a.wifiSSID(i) or _a.wifiSSID()
    [/\bWiFi\.SSID\s*\(/g, '_a.wifiSSID('],
    // WiFi.channel(i) or WiFi.channel() → _a.wifiChannel(i) or _a.wifiChannel()
    [/\bWiFi\.channel\s*\(/g, '_a.wifiChannel('],
    // WiFi.encryptionType(i) → _a.wifiEncryptionType(i)
    [/\bWiFi\.encryptionType\s*\(/g, '_a.wifiEncryptionType('],
    // WiFi.BSSIDstr(i) → _a.wifiBSSIDstr(i)
    [/\bWiFi\.BSSIDstr\s*\(/g, '_a.wifiBSSIDstr('],
  ],

  constants: {
    WL_CONNECTED: 3, WL_IDLE_STATUS: 0, WL_NO_SSID_AVAIL: 1,
    WL_SCAN_COMPLETED: 2, WL_CONNECT_FAILED: 4, WL_CONNECTION_LOST: 5, WL_DISCONNECTED: 6,
    WIFI_STA: 1, WIFI_AP: 2, WIFI_AP_STA: 3,
    WIFI_AUTH_OPEN: 0, WIFI_AUTH_WEP: 1, WIFI_AUTH_WPA_PSK: 2,
    WIFI_AUTH_WPA2_PSK: 3, WIFI_AUTH_WPA_WPA2_PSK: 4, WIFI_AUTH_WPA3_PSK: 5,
  },

  constructor: null,

  runtime: function(self) {
    function _findHotspot(ssid) {
      var canvas = window.CircuitCanvas;
      if (!canvas || !Array.isArray(canvas.components)) return null;
      for (var i = 0; i < canvas.components.length; i++) {
        var c = canvas.components[i];
        if (c.type !== 'wifi_module') continue;
        if (c.props && c.props.ssid === ssid) {
          return {
            ssid: c.props.ssid, password: c.props.password,
            channel: c.props.channel || 6, ipAddress: c.props.ipAddress || '192.168.4.1',
            security: c.props.security || 'WPA2-PSK', txPower: c.props.txPower ?? 20,
            x: c.x, y: c.y, width: c.width || 80, height: c.height || 80,
          };
        }
      }
      return null;
    }

    function _getBoardCenter() {
      var canvas = window.CircuitCanvas;
      if (!canvas || !Array.isArray(canvas.components)) return null;
      for (var i = 0; i < canvas.components.length; i++) {
        var c = canvas.components[i];
        if (c.type === 'esp32_devkit_v1') {
          return { x: c.x + (c.width || 120) / 2, y: c.y + (c.height || 120) / 2 };
        }
      }
      return null;
    }

    function _calcRSSI(txPower, boardCx, boardCy, apX, apY, apW, apH) {
      var dx = (apX + apW / 2) - boardCx;
      var dy = (apY + apH / 2) - boardCy;
      var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var rssi = txPower - (20 * Math.log10(dist / 10));
      return Math.max(-95, Math.min(-30, Math.round(rssi)));
    }

    function _genBSSID(id) {
      var hash = 0;
      var str = String(id);
      for (var i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
      }
      var h = (hash >>> 0).toString(16).padStart(8, '0');
      return '02:' + h.slice(0, 2) + ':' + h.slice(2, 4) + ':' + h.slice(4, 6) + ':00:01';
    }

    function _clientIpFromGateway(gw) {
      var parts = gw.split('.');
      if (parts.length !== 4) return '192.168.4.105';
      parts[3] = '105';
      return parts.join('.');
    }

    function _securityToAuthType(security) {
      if (!security || security === 'OPEN') return 0;
      if (security === 'WEP') return 1;
      if (security === 'WPA-PSK') return 2;
      if (security === 'WPA2-PSK') return 3;
      if (security === 'WPA/WPA2-PSK') return 4;
      if (security === 'WPA3-PSK') return 5;
      return 3;
    }

    return {
      wifiBegin: function(ssid, pass) {
        var hotspot = _findHotspot(ssid);
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
        var clientIP = _clientIpFromGateway(hotspot.ipAddress);
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

      wifiRSSI: function(idx) {
        if (idx !== undefined && idx !== null) {
          var scan = self._wifiScanResults || [];
          if (idx >= 0 && idx < scan.length) return scan[idx].rssi;
          return 0;
        }
        if (!self._wifiConnected || !self._wifiSSID) return 0;
        var hotspot = _findHotspot(self._wifiSSID);
        if (!hotspot) return -90;
        var board = _getBoardCenter();
        if (!board) return -50;
        return _calcRSSI(hotspot.txPower || 20, board.x, board.y,
                         hotspot.x, hotspot.y, hotspot.width, hotspot.height);
      },

      wifiScanNetworks: function() {
        var canvas = window.CircuitCanvas;
        self._wifiScanResults = [];
        if (!canvas || !Array.isArray(canvas.components)) return 0;
        var board = _getBoardCenter();
        for (var j = 0; j < canvas.components.length; j++) {
          var c = canvas.components[j];
          if (c.type === 'wifi_module' && c.props && !c.props.hidden) {
            var rssi = board
              ? _calcRSSI(c.props.txPower ?? 20, board.x, board.y,
                          c.x, c.y, c.width || 80, c.height || 80)
              : -40;
            self._wifiScanResults.push({
              ssid: c.props.ssid || '',
              rssi: rssi,
              channel: c.props.channel || 6,
              authType: _securityToAuthType(c.props.security),
              bssid: _genBSSID(c.id),
            });
          }
        }
        return self._wifiScanResults.length;
      },

      wifiSSID: function(idx) {
        if (idx !== undefined && idx !== null) {
          var scan = self._wifiScanResults || [];
          if (idx >= 0 && idx < scan.length) return scan[idx].ssid;
          return '';
        }
        return self._wifiSSID || '';
      },

      wifiChannel: function(idx) {
        if (idx !== undefined && idx !== null) {
          var scan = self._wifiScanResults || [];
          if (idx >= 0 && idx < scan.length) return scan[idx].channel;
          return 0;
        }
        if (!self._wifiConnected || !self._wifiSSID) return 0;
        var hotspot = _findHotspot(self._wifiSSID);
        return hotspot ? hotspot.channel : 0;
      },

      wifiEncryptionType: function(idx) {
        var scan = self._wifiScanResults || [];
        if (idx >= 0 && idx < scan.length) return scan[idx].authType;
        return 0;
      },

      wifiBSSIDstr: function(idx) {
        var scan = self._wifiScanResults || [];
        if (idx >= 0 && idx < scan.length) return scan[idx].bssid || '00:00:00:00:00:00';
        return '00:00:00:00:00:00';
      },
    };
  },
};
