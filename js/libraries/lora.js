// js/libraries/lora.js — LoRa.h Plugin (Sandeep Mistry)
//
// Simulates LoRa long-range wireless communication between boards.
// Cross-board message delivery via shared bus (window._loraBus).
//
// Demonstrates ALL aspects of LoRa:
//   - Frequency configuration (EU 868MHz, US 915MHz, etc.)
//   - Spreading Factor (SF6-SF12): range vs data rate tradeoff
//   - Bandwidth (7.8kHz – 500kHz): throughput vs sensitivity
//   - Coding Rate (4/5 – 4/8): error correction vs overhead
//   - TX Power (2-20 dBm): range vs power consumption
//   - RSSI & SNR: signal quality metrics
//   - Packet-based communication with CRC
//   - Sleep / Idle modes for power management
//
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['LoRa'] = {
  // Lower number = runs earlier; must beat SD (default 50) so LoRa.print()
  // is rewritten before SD's broad (\w+).print() rule can hijack it.
  priority: 10,
  classes: [],
  includes: ['<LoRa.h>'],

  transpile: [
    // LoRa.setPins(ssPin, rstPin, dio0Pin) → (no-op, simulated SPI)
    // Require non-empty args so the replacement comment's empty () won't re-match on the 2nd pass
    [/\bLoRa\.setPins\s*\([^)]+\)/g, '/* LoRa.setPins() - simulated */'],

    // LoRa.begin(freq) → _a.loraBegin(freq)
    // Also handles scientific notation like 868E6, 915E6
    [/\bLoRa\.begin\s*\(\s*(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*\)/g, '_a.loraBegin($1)'],

    // LoRa.setSpreadingFactor(sf) → _a.loraSetSpreadingFactor(sf)
    [/\bLoRa\.setSpreadingFactor\s*\(\s*(\d+)\s*\)/g, '_a.loraSetSpreadingFactor($1)'],

    // LoRa.setSignalBandwidth(bw) → _a.loraSetBandwidth(bw)
    [/\bLoRa\.setSignalBandwidth\s*\(\s*(\d+(?:\.\d+)?)\s*\)/g, '_a.loraSetBandwidth($1)'],

    // LoRa.setCodingRate4(cr) → _a.loraSetCodingRate(cr)
    [/\bLoRa\.setCodingRate4\s*\(\s*(\d+)\s*\)/g, '_a.loraSetCodingRate($1)'],

    // LoRa.setTxPower(txPower) → _a.loraSetTxPower(txPower)
    [/\bLoRa\.setTxPower\s*\(\s*(\d+)\s*\)/g, '_a.loraSetTxPower($1)'],

    // LoRa.setPreambleLength(len) → _a.loraSetPreambleLength(len)
    [/\bLoRa\.setPreambleLength\s*\(\s*(\d+)\s*\)/g, '_a.loraSetPreambleLength($1)'],

    // LoRa.setSyncWord(word) → _a.loraSetSyncWord(word) — accepts decimal and hex (0x12)
    [/\bLoRa\.setSyncWord\s*\(\s*(0[xX][0-9a-fA-F]+|\d+)\s*\)/g, '_a.loraSetSyncWord($1)'],

    // LoRa.enableCrc() → _a.loraEnableCrc()
    [/\bLoRa\.enableCrc\s*\(\s*\)/g, '_a.loraEnableCrc()'],

    // LoRa.disableCrc() → _a.loraDisableCrc()
    [/\bLoRa\.disableCrc\s*\(\s*\)/g, '_a.loraDisableCrc()'],

    // LoRa.enableInvertIQ() → _a.loraEnableInvertIQ()
    [/\bLoRa\.enableInvertIQ\s*\(\s*\)/g, '_a.loraEnableInvertIQ()'],

    // LoRa.disableInvertIQ() → _a.loraDisableInvertIQ()
    [/\bLoRa\.disableInvertIQ\s*\(\s*\)/g, '_a.loraDisableInvertIQ()'],

    // LoRa.beginPacket() → _a.loraBeginPacket()
    [/\bLoRa\.beginPacket\s*\(\s*\)/g, '_a.loraBeginPacket()'],

    // LoRa.endPacket() → _a.loraEndPacket()
    [/\bLoRa\.endPacket\s*\(\s*\)/g, '_a.loraEndPacket()'],

    // LoRa.write(val) → _a.loraWrite(val)
    [/\bLoRa\.write\s*\(([^)]+)\)/g, '_a.loraWrite($1)'],

    // LoRa.print(str) → _a.loraPrint(str)
    [/\bLoRa\.print\s*\(([^)]+)\)/g, '_a.loraPrint($1)'],

    // LoRa.println(str) → _a.loraPrintln(str)
    [/\bLoRa\.println\s*\(([^)]+)\)/g, '_a.loraPrintln($1)'],

    // LoRa.parsePacket() → _a.loraParsePacket()
    [/\bLoRa\.parsePacket\s*\(\s*\)/g, '_a.loraParsePacket()'],

    // LoRa.available() → _a.loraAvailable()
    [/\bLoRa\.available\s*\(\s*\)/g, '_a.loraAvailable()'],

    // LoRa.read() → _a.loraRead()
    [/\bLoRa\.read\s*\(\s*\)/g, '_a.loraRead()'],

    // LoRa.packetRssi() → _a.loraPacketRssi()
    [/\bLoRa\.packetRssi\s*\(\s*\)/g, '_a.loraPacketRssi()'],

    // LoRa.packetSnr() → _a.loraPacketSnr()
    [/\bLoRa\.packetSnr\s*\(\s*\)/g, '_a.loraPacketSnr()'],

    // LoRa.packetFrequencyError() → _a.loraPacketFrequencyError()
    [/\bLoRa\.packetFrequencyError\s*\(\s*\)/g, '_a.loraPacketFrequencyError()'],

    // LoRa.random() → _a.loraRandom()
    [/\bLoRa\.random\s*\(\s*\)/g, '_a.loraRandom()'],

    // LoRa.sleep() → _a.loraSleep()
    [/\bLoRa\.sleep\s*\(\s*\)/g, '_a.loraSleep()'],

    // LoRa.idle() → _a.loraIdle()
    [/\bLoRa\.idle\s*\(\s*\)/g, '_a.loraIdle()'],

    // LoRa.end() → _a.loraEnd()
    [/\bLoRa\.end\s*\(\s*\)/g, '_a.loraEnd()'],

    // LoRa.dumpRegisters() → _a.loraDumpRegisters()
    [/\bLoRa\.dumpRegisters\s*\(\s*\)/g, '_a.loraDumpRegisters()'],
  ],

  constants: {
    // Spreading Factors
    LORA_SF6: 6,
    LORA_SF7: 7,
    LORA_SF8: 8,
    LORA_SF9: 9,
    LORA_SF10: 10,
    LORA_SF11: 11,
    LORA_SF12: 12,

    // Common Bandwidths (Hz)
    LORA_BW_7_8K: 7800,
    LORA_BW_10_4K: 10400,
    LORA_BW_15_6K: 15600,
    LORA_BW_20_8K: 20800,
    LORA_BW_31_25K: 31250,
    LORA_BW_41_7K: 41700,
    LORA_BW_62_5K: 62500,
    LORA_BW_125K: 125000,
    LORA_BW_250K: 250000,
    LORA_BW_500K: 500000,

    // Coding Rates
    LORA_CR_4_5: 5,
    LORA_CR_4_6: 6,
    LORA_CR_4_7: 7,
    LORA_CR_4_8: 8,

    // Common Frequencies (Hz)
    LORA_FREQ_EU_868: 868000000,
    LORA_FREQ_US_915: 915000000,
    LORA_FREQ_AU_915: 915000000,
    LORA_FREQ_AS_923: 923000000,
    LORA_FREQ_IN_865: 865000000,
  },

  runtime: function(self) {
    // ── Shared LoRa bus (global between all simulator instances) ──
    // The component (communication.js) may have already created the bus with
    // transmitPacket().  If so, reuse it; otherwise create a minimal bus.
    if (!window._loraBus) {
      window._loraBus = {
        nodes: {},
      };
    }
    var bus = window._loraBus;

    var _myNodeId = null;
    var _initialized = false;
    var _frequency = 868000000;  // Default EU 868 MHz
    var _spreadingFactor = 7;   // Default SF7
    var _bandwidth = 125000;    // Default 125 kHz
    var _codingRate = 5;        // Default 4/5
    var _txPower = 14;          // Default 14 dBm
    var _preambleLength = 8;
    var _syncWord = 0x12;
    var _crcEnabled = true;
    var _invertIQ = false;

    // TX state
    var _txBuffer = [];
    var _txActive = false;

    // RX state
    var _rxBuffer = [];
    var _lastPacketRssi = -100;
    var _lastPacketSnr = 0;

    function _getMyNode() {
      if (_myNodeId !== null) return bus.nodes[_myNodeId];
      return null;
    }

    // ── LoRa PHY simulation ──
    // Calculates data rate based on SF, BW, CR
    // Bit Rate = SF * (BW / 2^SF) * (4 / CR)
    function _calcBitRate() {
      var symbolRate = _bandwidth / Math.pow(2, _spreadingFactor);
      var bitsPerSymbol = _spreadingFactor;
      var rawBitRate = bitsPerSymbol * symbolRate;
      var crFactor = 4 / _codingRate;
      return rawBitRate * crFactor;
    }

    // Estimated sensitivity (dBm) based on SF and BW
    // Rough model: sensitivity ≈ -128 + 10*log10(BW/125000) + (SF-7)*2.5
    function _calcSensitivity() {
      var bwFactor = 10 * Math.log10(_bandwidth / 125000);
      var sfFactor = (_spreadingFactor - 7) * 2.5;
      return -128 + bwFactor + sfFactor;
    }

    // Estimate packet airtime (ms) for a given payload size
    // T_packet ≈ (preamble + header + payload) * symbolTime
    function _calcPacketAirtime(payloadBytes) {
      var de = (_spreadingFactor <= 6) ? 0 : 1; // low data rate optimize
      var crVal = _codingRate;
      var ih = 0; // implicit header = 0
      var crc = _crcEnabled ? 1 : 0;

      var preambleSymbols = _preambleLength + 4.25 + 0.25;
      var headerBits = (ih === 0) ? 20 : 0;
      var payloadSymbNb = 8 + Math.max(0, Math.ceil(
        (8 * payloadBytes - 4 * _spreadingFactor + 28 + 16 * crc - 20 * ih + (4 * (_spreadingFactor - 2 * de)) / _spreadingFactor) /
        (4 * (_spreadingFactor - 2 * de))
      )) * (crVal);

      // T_sym = 2^SF / BW; payload airtime = n_payload_symbols * T_sym
      var tSymbol = Math.pow(2, _spreadingFactor) / _bandwidth;
      var payloadTime = payloadSymbNb * tSymbol;
      var headerTime = headerBits / _bandwidth;
      var totalTime = (preambleSymbols * tSymbol + payloadTime + headerTime) * 1000; // ms
      return Math.max(1, Math.round(totalTime * 10) / 10);
    }

    // Calculate RSSI based on distance on canvas (log-distance path loss model)
    function _calcRssi(targetX, targetY) {
      var myNode = _getMyNode();
      if (!myNode || !myNode.x) return -100;
      var dx = myNode.x - targetX;
      var dy = myNode.y - targetY;
      var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      // Path loss at 868 MHz: PL = 20*log10(d) + 20*log10(f) - 27.55
      var pathLoss = 20 * Math.log10(dist) + 20 * Math.log10(_frequency / 1000000) - 27.55;
      var rssi = _txPower - pathLoss;
      return Math.max(-120, Math.min(-20, Math.round(rssi)));
    }

    // Calculate SNR based on SF and distance
    function _calcSnr(targetX, targetY) {
      var rssi = _calcRssi(targetX, targetY);
      // SNR = RSSI - Noise Floor (rough: -120 dBm for BW=125kHz)
      var noiseFloor = -174 + 10 * Math.log10(_bandwidth);
      var snr = rssi - noiseFloor;
      return Math.max(-20, Math.min(10, Math.round(snr * 10) / 10));
    }

    function _freqToStr(freq) {
      if (freq >= 1000000) return (freq / 1000000).toFixed(1) + ' MHz';
      if (freq >= 1000) return (freq / 1000).toFixed(1) + ' kHz';
      return freq + ' Hz';
    }

    function _dataToStr(data) {
      if (data instanceof Uint8Array || Array.isArray(data)) {
        var arr = Array.isArray(data) ? data : Array.from(data);
        var str = '';
        var allPrintable = true;
        for (var i = 0; i < arr.length; i++) {
          var c = arr[i];
          if (c >= 32 && c < 127) {
            str += String.fromCharCode(c);
          } else {
            allPrintable = false;
            break;
          }
        }
        if (allPrintable && str.length > 0) return '"' + str + '"';
        return arr.map(function(b) { return b.toString(16).toUpperCase().padStart(2, '0'); }).join(' ');
      }
      if (typeof data === 'string') return '"' + data + '"';
      return String(data);
    }

    return {
      loraBegin: function(freq) {
        _myNodeId = self.boardIndex || 0;
        _frequency = freq || 868000000;

        bus.nodes[_myNodeId] = {
          frequency: _frequency,
          spreadingFactor: _spreadingFactor,
          bandwidth: _bandwidth,
          codingRate: _codingRate,
          txPower: _txPower,
          syncWord: _syncWord,
          crcEnabled: _crcEnabled,
          initialized: true,
          simulator: self,
          x: 0, y: 0, // Updated by component step()
        };

        _initialized = true;

        self._serialLog('[LoRa] Initialized at ' + _freqToStr(_frequency) + '\n', 'system');
        self._serialLog('[LoRa] SF=' + _spreadingFactor + ' BW=' + (_bandwidth / 1000) + 'kHz CR=4/' + _codingRate + '\n', 'system');
        self._serialLog('[LoRa] TX Power=' + _txPower + 'dBm  Sensitivity=' + _calcSensitivity() + 'dBm\n', 'system');
        self._serialLog('[LoRa] Bit Rate=' + (_calcBitRate() / 1000).toFixed(1) + ' kbps\n', 'system');

        // Report nearby nodes (only library board nodes — skip component-bus string IDs)
        var peerCount = 0;
        for (var nid in bus.nodes) {
          var peerIdx = parseInt(nid, 10);
          if (!isNaN(peerIdx) && String(peerIdx) === String(nid) &&
              peerIdx !== _myNodeId && bus.nodes[nid].initialized) {
            peerCount++;
          }
        }
        if (peerCount > 0) {
          self._serialLog('[LoRa] Found ' + peerCount + ' peer(s) on same frequency\n', 'system');
        }

        return 1; // success (matches LoRa.h: 1 = ok, 0 = fail)
      },

      loraSetSpreadingFactor: function(sf) {
        if (sf < 6 || sf > 12) {
          self._serialLog('[LoRa] Invalid SF=' + sf + ' (must be 6-12)\n', 'system');
          return;
        }
        _spreadingFactor = sf;
        var node = _getMyNode();
        if (node) node.spreadingFactor = sf;
        self._serialLog('[LoRa] Spreading Factor = SF' + sf + ' → ' +
          (sf <= 9 ? 'Higher data rate, shorter range' : 'Lower data rate, longer range') + '\n', 'system');
        self._serialLog('[LoRa] Bit Rate = ' + (_calcBitRate() / 1000).toFixed(1) + ' kbps\n', 'system');
      },

      loraSetBandwidth: function(bw) {
        _bandwidth = bw;
        var node = _getMyNode();
        if (node) node.bandwidth = bw;
        self._serialLog('[LoRa] Bandwidth = ' + _freqToStr(bw) + '\n', 'system');
        self._serialLog('[LoRa] Bit Rate = ' + (_calcBitRate() / 1000).toFixed(1) + ' kbps\n', 'system');
      },

      loraSetCodingRate: function(cr) {
        if (cr < 5 || cr > 8) {
          self._serialLog('[LoRa] Invalid CR=' + cr + ' (must be 5-8 for 4/5 to 4/8)\n', 'system');
          return;
        }
        _codingRate = cr;
        var node = _getMyNode();
        if (node) node.codingRate = cr;
        self._serialLog('[LoRa] Coding Rate = 4/' + cr + '\n', 'system');
      },

      loraSetTxPower: function(power) {
        _txPower = Math.max(2, Math.min(20, power));
        var node = _getMyNode();
        if (node) node.txPower = _txPower;
        self._serialLog('[LoRa] TX Power = ' + _txPower + ' dBm\n', 'system');
      },

      loraSetPreambleLength: function(len) {
        _preambleLength = len;
        self._serialLog('[LoRa] Preamble Length = ' + len + ' symbols\n', 'system');
      },

      loraSetSyncWord: function(word) {
        _syncWord = word;
        var node = _getMyNode();
        if (node) node.syncWord = word;
        self._serialLog('[LoRa] Sync Word = 0x' + word.toString(16).toUpperCase().padStart(2, '0') + '\n', 'system');
      },

      loraEnableCrc: function() {
        _crcEnabled = true;
        var node = _getMyNode();
        if (node) node.crcEnabled = true;
        self._serialLog('[LoRa] CRC enabled\n', 'system');
      },

      loraDisableCrc: function() {
        _crcEnabled = false;
        var node = _getMyNode();
        if (node) node.crcEnabled = false;
        self._serialLog('[LoRa] CRC disabled\n', 'system');
      },

      loraEnableInvertIQ: function() {
        _invertIQ = true;
        var node = _getMyNode();
        if (node) node.invertIQ = true;
        self._serialLog('[LoRa] Invert IQ enabled (point-to-point mode)\n', 'system');
      },

      loraDisableInvertIQ: function() {
        _invertIQ = false;
        var node = _getMyNode();
        if (node) node.invertIQ = false;
        self._serialLog('[LoRa] Invert IQ disabled (normal mode)\n', 'system');
      },

      loraBeginPacket: function() {
        if (!_initialized) {
          self._serialLog('[LoRa] Error: call LoRa.begin() first\n', 'system');
          return -1;
        }
        _txBuffer = [];
        _txActive = true;
        return 0;
      },

      loraWrite: function(val) {
        if (!_txActive) return 0;
        if (typeof val === 'number') {
          _txBuffer.push(val & 0xFF);
        } else if (typeof val === 'string') {
          for (var i = 0; i < val.length; i++) {
            _txBuffer.push(val.charCodeAt(i) & 0xFF);
          }
        } else if (Array.isArray(val)) {
          for (var j = 0; j < val.length; j++) {
            _txBuffer.push(val[j] & 0xFF);
          }
        }
        return 1;
      },

      loraPrint: function(val) {
        if (!_txActive) return;
        var str = String(val);
        for (var i = 0; i < str.length; i++) {
          _txBuffer.push(str.charCodeAt(i) & 0xFF);
        }
      },

      loraPrintln: function(val) {
        self._a.loraPrint(String(val) + '\n');
      },

      loraEndPacket: function() {
        if (!_txActive || _txBuffer.length === 0) {
          _txActive = false;
          return 0;
        }
        _txActive = false;

        var payload = new Uint8Array(_txBuffer);
        var airtime = _calcPacketAirtime(payload.length);

        self._serialLog('[LoRa] TX ' + payload.length + 'B @ ' + _freqToStr(_frequency) +
          ' | SF' + _spreadingFactor + ' BW' + (_bandwidth / 1000) + 'k | ' + airtime + 'ms\n', 'system');
        self._serialLog('[LoRa] Payload: ' + _dataToStr(payload) + '\n', 'system');

        // Deliver to all other board nodes on the same frequency with matching sync word.
        // The bus is shared with communication.js component nodes (string IDs like
        // "lora_tx") — only deliver to numeric library board indexes.
        var delivered = false;
        for (var nid in bus.nodes) {
          var destIdx = parseInt(nid, 10);
          if (isNaN(destIdx) || String(destIdx) !== String(nid)) continue;
          if (destIdx !== _myNodeId) {
            var target = bus.nodes[nid];
            if (target.initialized && target.frequency === _frequency &&
                target.syncWord === _syncWord && target.simulator) {
              // IQ inversion filter: inverted nodes only talk to inverted nodes
              if (_invertIQ && !target.invertIQ) continue;

              // Calculate simulated RSSI/SNR based on canvas distance
              var myNode = _getMyNode();
              var rssi = myNode ? _calcRssi(target.x || 0, target.y || 0) : -50;
              var snr = myNode ? _calcSnr(target.x || 0, target.y || 0) : 0;

              (function(t, r, s, pkt, at, boardNum) {
                setTimeout(function() {
                  // Store packet in target's RX buffer
                  t._rxBuffer = Array.from(pkt);
                  t._lastPacketRssi = r;
                  t._lastPacketSnr = s;
                  t._lastPacketAirtime = at;

                  self._serialLog('[LoRa] → Delivered to Board ' + boardNum +
                    ' | RSSI=' + r + 'dBm SNR=' + s + 'dB\n', 'system');
                }, Math.max(5, airtime / (self.speed || 1)));
              })(target, rssi, snr, payload, airtime, destIdx + 1);

              delivered = true;
            }
          }
        }

        if (!delivered) {
          self._serialLog('[LoRa] No peers found on ' + _freqToStr(_frequency) + '\n', 'system');
        }

        _txBuffer = [];
        return 1;
      },

      loraParsePacket: function() {
        var node = _getMyNode();
        if (node && node._rxBuffer && node._rxBuffer.length > 0) {
          // Move RX buffer to read state
          _rxBuffer = node._rxBuffer;
          _lastPacketRssi = node._lastPacketRssi || -100;
          _lastPacketSnr = node._lastPacketSnr || 0;
          node._rxBuffer = [];
          self._serialLog('[LoRa] RX ' + _rxBuffer.length + 'B | RSSI=' + _lastPacketRssi +
            'dBm SNR=' + _lastPacketSnr + 'dB\n', 'system');
          return _rxBuffer.length;
        }
        return 0;
      },

      loraAvailable: function() {
        return _rxBuffer.length;
      },

      loraRead: function() {
        if (_rxBuffer.length === 0) return -1;
        return _rxBuffer.shift();
      },

      loraPacketRssi: function() {
        return _lastPacketRssi;
      },

      loraPacketSnr: function() {
        return _lastPacketSnr;
      },

      loraPacketFrequencyError: function() {
        // Simulated frequency error in Hz (typically ±10ppm)
        return Math.round((Math.random() * 20 - 10) * (_frequency / 1000000)) / 1000;
      },

      loraRandom: function() {
        return Math.floor(Math.random() * 256);
      },

      loraSleep: function() {
        self._serialLog('[LoRa] Entering sleep mode (low power)\n', 'system');
      },

      loraIdle: function() {
        self._serialLog('[LoRa] Entering idle mode\n', 'system');
      },

      loraEnd: function() {
        if (_myNodeId !== null && bus.nodes[_myNodeId]) {
          delete bus.nodes[_myNodeId];
          self._serialLog('[LoRa] Module shut down\n', 'system');
        }
        _initialized = false;
        _myNodeId = null;
      },

      loraDumpRegisters: function() {
        self._serialLog('[LoRa] Register dump:\n', 'system');
        self._serialLog('  Reg 0x01: OpMode     = 0x01 (LoRa mode)\n', 'system');
        self._serialLog('  Reg 0x06: FrfMsb     = 0x' + ((_frequency >> 16) & 0xFF).toString(16).toUpperCase() + '\n', 'system');
        self._serialLog('  Reg 0x07: FrfMid     = 0x' + ((_frequency >> 8) & 0xFF).toString(16).toUpperCase() + '\n', 'system');
        self._serialLog('  Reg 0x08: FrfLsb     = 0x' + (_frequency & 0xFF).toString(16).toUpperCase() + '\n', 'system');
        self._serialLog('  Reg 0x1E: Spreading  = 0x' + ((_spreadingFactor << 4) | 0x07).toString(16).toUpperCase() + '\n', 'system');
        self._serialLog('  Reg 0x1D: BW/CR/CRC  = 0x' + ((Math.log2(_bandwidth / 125000) << 4) | ((_codingRate - 5) << 1) | (_crcEnabled ? 1 : 0)).toString(16).toUpperCase() + '\n', 'system');
        self._serialLog('  Reg 0x09: Preamble    = 0x' + (_preambleLength >> 8).toString(16).toUpperCase() + '\n', 'system');
        self._serialLog('  Reg 0x0A: Preamble    = 0x' + (_preambleLength & 0xFF).toString(16).toUpperCase() + '\n', 'system');
        self._serialLog('  Reg 0x39: SyncWord   = 0x' + _syncWord.toString(16).toUpperCase().padStart(2, '0') + '\n', 'system');
      },
    };
  },

  constructor: null,
};
