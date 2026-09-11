// js/libraries/zigbee.js — Zigbee Plugin for ESP32
//
// Simulates Zigbee mesh networking between boards.
// Cross-board message delivery via shared bus (window._zigbeeBus).
//
// Architecture:
//   Board 0 = Coordinator (node address 0x0000)
//   Board 1 = End Device  (node address 0x0001)
//   Board 2 = Router      (node address 0x0002, if needed)
//
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Zigbee'] = {
  priority: 55,
  classes: [],
  includes: ['<Zigbee.h>'],

  transpile: [
    // Zigbee.begin(channel, panId) → _a.zigbeeBegin(channel, panId)
    [/\bZigbee\.begin\s*\(\s*(\d+)\s*,\s*(\w+)\s*\)/g, '_a.zigbeeBegin($1, $2)'],

    // Zigbee.begin(channel) → _a.zigbeeBegin(channel)
    [/\bZigbee\.begin\s*\(\s*(\d+)\s*\)/g, '_a.zigbeeBegin($1)'],

    // Zigbee.send(destAddr, data, len) → _a.zigbeeSend(destAddr, data, len)
    [/\bZigbee\.send\s*\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*\)/g, '_a.zigbeeSend($1, $2, $3)'],

    // Zigbee.send(destAddr, data) → _a.zigbeeSend(destAddr, data, data.length)
    [/\bZigbee\.send\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, '_a.zigbeeSend($1, $2, -1)'],

    // Zigbee.onReceive(callback) → _a.zigbeeOnReceive(callback)
    [/\bZigbee\.onReceive\s*\(\s*(\w+)\s*\)/g, '_a.zigbeeOnReceive($1)'],

    // Zigbee.onSend(callback) → _a.zigbeeOnSend(callback)
    [/\bZigbee\.onSend\s*\(\s*(\w+)\s*\)/g, '_a.zigbeeOnSend($1)'],

    // Zigbee.getNodeAddress() → _a.zigbeeGetNodeAddress()
    [/\bZigbee\.getNodeAddress\s*\(\s*\)/g, '_a.zigbeeGetNodeAddress()'],

    // Zigbee.getPanId() → _a.zigbeeGetPanId()
    [/\bZigbee\.getPanId\s*\(\s*\)/g, '_a.zigbeeGetPanId()'],

    // Zigbee.getChannel() → _a.zigbeeGetChannel()
    [/\bZigbee\.getChannel\s*\(\s*\)/g, '_a.zigbeeGetChannel()'],

    // Zigbee.setNodeAddress(addr) → _a.zigbeeSetNodeAddress(addr)
    [/\bZigbee\.setNodeAddress\s*\(\s*(\w+)\s*\)/g, '_a.zigbeeSetNodeAddress($1)'],

    // Zigbee.setPanId(panId) → _a.zigbeeSetPanId(panId)
    [/\bZigbee\.setPanId\s*\(\s*(\w+)\s*\)/g, '_a.zigbeeSetPanId($1)'],

    // Zigbee.setChannel(channel) → _a.zigbeeSetChannel(channel)
    [/\bZigbee\.setChannel\s*\(\s*(\w+)\s*\)/g, '_a.zigbeeSetChannel($1)'],

    // Zigbee.getNeighbourCount() → _a.zigbeeGetNeighbourCount()
    [/\bZigbee\.getNeighbourCount\s*\(\s*\)/g, '_a.zigbeeGetNeighbourCount()'],

    // Zigbee.getNeighbourAddress(index) → _a.zigbeeGetNeighbourAddress(index)
    [/\bZigbee\.getNeighbourAddress\s*\(\s*(\w+)\s*\)/g, '_a.zigbeeGetNeighbourAddress($1)'],

    // Zigbee.hasChild(parentAddr, childAddr) → _a.zigbeeHasChild(parentAddr, childAddr)
    [/\bZigbee\.hasChild\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, '_a.zigbeeHasChild($1, $2)'],

    // Zigbee.leave() → _a.zigbeeLeave()
    [/\bZigbee\.leave\s*\(\s*\)/g, '_a.zigbeeLeave()'],

    // Zigbee.reset() → _a.zigbeeReset()
    [/\bZigbee\.reset\s*\(\s*\)/g, '_a.zigbeeReset()'],

    // ZigbeePing(destAddr) → _a.zigbeePing(destAddr)
    [/\bZigbeePing\s*\(\s*(\w+)\s*\)/g, '_a.zigbeePing($1)'],

    // ZigbeeSend(destAddr, data, len) → _a.zigbeeSend(destAddr, data, len)
    [/\bZigbeeSend\s*\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*\)/g, '_a.zigbeeSend($1, $2, $3)'],

    // ZigbeeReceive(addr, data, len) — used in callbacks, no transpile needed
    // uint16_t varName → var varName
    [/\buint16_t\s+(\w+)\s*=/g, 'var $1 ='],
    [/\buint16_t\s+(\w+)\s*;/g, 'var $1;'],

    // uint8_t varName → var varName
    [/\buint8_t\s+(\w+)\s*=/g, 'var $1 ='],
    [/\buint8_t\s+(\w+)\s*;/g, 'var $1;'],

    // int varName — leave as-is (already valid JS)
  ],

  constants: {
    ZIGBEE_OK: 0,
    ZIGBEE_FAIL: -1,
    ZIGBEE_SEND_SUCCESS: 0,
    ZIGBEE_SEND_FAIL: 1,
    ZIGBEE_CHANNEL_11: 11,
    ZIGBEE_CHANNEL_12: 12,
    ZIGBEE_CHANNEL_13: 13,
    ZIGBEE_CHANNEL_14: 14,
    ZIGBEE_CHANNEL_15: 15,
    ZIGBEE_CHANNEL_16: 16,
    ZIGBEE_CHANNEL_17: 17,
    ZIGBEE_CHANNEL_18: 18,
    ZIGBEE_CHANNEL_19: 19,
    ZIGBEE_CHANNEL_20: 20,
    ZIGBEE_CHANNEL_21: 21,
    ZIGBEE_CHANNEL_22: 22,
    ZIGBEE_CHANNEL_23: 23,
    ZIGBEE_CHANNEL_24: 24,
    ZIGBEE_CHANNEL_25: 25,
    ZIGBEE_CHANNEL_26: 26,
    ZIGBEE_COORDINATOR: 0,
    ZIGBEE_ROUTER: 1,
    ZIGBEE_END_DEVICE: 2,
    ZIGBEE_BROADCAST: 0xFFFF,
    ZIGBEE_MAX_DATA_LEN: 128,
  },

  runtime: function(self) {
    // ── Shared Zigbee bus (global between all simulator instances) ──
    if (!window._zigbeeBus) {
      window._zigbeeBus = {
        nodes: {},
        panId: 0x1234,
        channel: 11,
      };
    }
    var bus = window._zigbeeBus;

    var _myNodeId = null;
    var _myShortAddr = null;
    var _recvCb = null;
    var _sendCb = null;
    var _initialized = false;
    var _channel = 11;
    var _panId = 0x1234;

    function _getMyNode() {
      if (_myNodeId !== null) return bus.nodes[_myNodeId];
      return null;
    }

    function _findNodeByAddr(addr) {
      for (var nid in bus.nodes) {
        if (bus.nodes[nid].shortAddr === addr) {
          return bus.nodes[nid];
        }
      }
      return null;
    }

    function _addrToStr(addr) {
      return '0x' + addr.toString(16).toUpperCase().padStart(4, '0');
    }

    function _dataToStr(data) {
      if (data instanceof Uint8Array || Array.isArray(data)) {
        var arr = Array.isArray(data) ? data : Array.from(data);
        // Try to decode as string first
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
        // Otherwise show hex
        return arr.map(function(b) { return b.toString(16).toUpperCase().padStart(2, '0'); }).join(' ');
      }
      if (typeof data === 'string') return '"' + data + '"';
      if (typeof data === 'number') return '0x' + (data & 0xFFFF).toString(16).toUpperCase();
      return String(data);
    }

    return {
      zigbeeBegin: function(channel, panId) {
        _myNodeId = self.boardIndex || 0;

        // Auto-assign short addresses
        if (_myNodeId === 0) {
          _myShortAddr = 0x0000; // Coordinator
        } else {
          _myShortAddr = 0x0000 + _myNodeId; // End Device / Router
        }

        _channel = channel || 11;
        _panId = panId || 0x1234;
        bus.channel = _channel;
        bus.panId = _panId;

        bus.nodes[_myNodeId] = {
          shortAddr: _myShortAddr,
          channel: _channel,
          panId: _panId,
          role: _myNodeId === 0 ? 0 : 2, // Coordinator or End Device
          recvCb: null,
          sendCb: null,
          initialized: true,
          simulator: self,
        };

        var roleStr = _myNodeId === 0 ? 'Coordinator' : 'End Device';
        self._serialLog('[Zigbee] Initialized as ' + roleStr + '\n', 'system');
        self._serialLog('[Zigbee] Short Addr: ' + _addrToStr(_myShortAddr) + '\n', 'system');
        self._serialLog('[Zigbee] PAN ID: ' + _addrToStr(_panId) + '  Channel: ' + _channel + '\n', 'system');

        // Scan for existing nodes
        var peerCount = 0;
        for (var nid in bus.nodes) {
          if (parseInt(nid) !== _myNodeId) peerCount++;
        }
        if (peerCount > 0) {
          self._serialLog('[Zigbee] Found ' + peerCount + ' peer(s) on network\n', 'system');
        }

        _initialized = true;
        return 0; // ZIGBEE_OK
      },

      zigbeeOnReceive: function(cb) {
        _recvCb = cb;
        var node = _getMyNode();
        if (node) node.recvCb = cb;
      },

      zigbeeOnSend: function(cb) {
        _sendCb = cb;
        var node = _getMyNode();
        if (node) node.sendCb = cb;
      },

      zigbeeGetNodeAddress: function() {
        return _myShortAddr;
      },

      zigbeeGetPanId: function() {
        return _panId;
      },

      zigbeeGetChannel: function() {
        return _channel;
      },

      zigbeeSetNodeAddress: function(addr) {
        _myShortAddr = addr;
        var node = _getMyNode();
        if (node) node.shortAddr = addr;
        self._serialLog('[Zigbee] Node address set to ' + _addrToStr(addr) + '\n', 'system');
      },

      zigbeeSetPanId: function(panId) {
        _panId = panId;
        bus.panId = panId;
        var node = _getMyNode();
        if (node) node.panId = panId;
        self._serialLog('[Zigbee] PAN ID set to ' + _addrToStr(panId) + '\n', 'system');
      },

      zigbeeSetChannel: function(channel) {
        _channel = channel;
        bus.channel = channel;
        var node = _getMyNode();
        if (node) node.channel = channel;
        self._serialLog('[Zigbee] Channel set to ' + channel + '\n', 'system');
      },

      zigbeeGetNeighbourCount: function() {
        var count = 0;
        for (var nid in bus.nodes) {
          if (parseInt(nid) !== _myNodeId && bus.nodes[nid].initialized) {
            count++;
          }
        }
        return count;
      },

      zigbeeGetNeighbourAddress: function(index) {
        var i = 0;
        for (var nid in bus.nodes) {
          if (parseInt(nid) !== _myNodeId && bus.nodes[nid].initialized) {
            if (i === index) return bus.nodes[nid].shortAddr;
            i++;
          }
        }
        return 0;
      },

      zigbeeHasChild: function(parentAddr, childAddr) {
        // Simple check: if childAddr exists in bus and parentAddr is coordinator
        var child = _findNodeByAddr(childAddr);
        return child ? 1 : 0;
      },

      zigbeeLeave: function() {
        if (_myNodeId !== null && bus.nodes[_myNodeId]) {
          delete bus.nodes[_myNodeId];
          self._serialLog('[Zigbee] Left network\n', 'system');
        }
        _initialized = false;
        _myNodeId = null;
        _myShortAddr = null;
        return 0;
      },

      zigbeeReset: function() {
        self._serialLog('[Zigbee] Reset\n', 'system');
        return self._a.zigbeeBegin(_channel, _panId);
      },

      zigbeePing: function(destAddr) {
        if (!_initialized) return -1;
        var target = _findNodeByAddr(destAddr);
        if (!target || !target.simulator) {
          self._serialLog('[Zigbee] Ping to ' + _addrToStr(destAddr) + ': FAIL (no route)\n', 'system');
          return -1;
        }
        self._serialLog('[Zigbee] Ping to ' + _addrToStr(destAddr) + ': OK\n', 'system');
        return 0;
      },

      zigbeeSend: function(destAddr, data, len) {
        if (!_initialized) return -1;

        // Serialize data
        var payload;
        if (data instanceof ArrayBuffer) {
          payload = new Uint8Array(data);
        } else if (ArrayBuffer.isView(data)) {
          payload = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        } else if (Array.isArray(data)) {
          payload = new Uint8Array(data);
        } else if (typeof data === 'string') {
          payload = new TextEncoder().encode(data);
        } else if (typeof data === 'number') {
          payload = new Uint8Array([data & 0xFF]);
        } else {
          payload = new Uint8Array(0);
        }

        // Truncate to len if specified
        if (len > 0 && len < payload.length) {
          payload = payload.slice(0, len);
        }

        self._serialLog('[Zigbee] TX ' + payload.length + 'B -> ' + _addrToStr(destAddr) + ' | ' + _dataToStr(payload) + '\n', 'system');

        // Find target node
        var targetNode = null;
        if (destAddr === 0xFFFF) {
          // Broadcast to all peers
          var delivered = false;
          for (var nid in bus.nodes) {
            if (parseInt(nid) !== _myNodeId) {
              var node = bus.nodes[nid];
              if (node.recvCb && node.simulator) {
                (function(n) {
                  setTimeout(function() {
                    try { n.recvCb(payload, payload.length); } catch (e) {}
                  }, Math.max(5, 15 / (self.speed || 1)));
                })(node);
                delivered = true;
              }
            }
          }
          // Trigger send callback
          if (_sendCb) {
            (function(status) {
              setTimeout(function() {
                try { _sendCb(status); } catch (e) {}
              }, Math.max(5, 15 / (self.speed || 1)));
            })(delivered ? 0 : 1);
          }
          return delivered ? 0 : -1;
        } else {
          // Unicast
          targetNode = _findNodeByAddr(destAddr);
          if (!targetNode || !targetNode.simulator) {
            self._serialLog('[Zigbee] TX FAIL: no route to ' + _addrToStr(destAddr) + '\n', 'system');
            if (_sendCb) {
              setTimeout(function() {
                try { _sendCb(1); } catch (e) {} // ZIGBEE_SEND_FAIL
              }, Math.max(5, 15 / (self.speed || 1)));
            }
            return -1;
          }

          // Deliver message
          var targetRef = targetNode;
          setTimeout(function() {
            if (targetRef.recvCb) {
              try { targetRef.recvCb(payload, payload.length); } catch (e) {}
            }
          }, Math.max(5, 15 / (self.speed || 1)));

          // Trigger send callback
          if (_sendCb) {
            setTimeout(function() {
              try { _sendCb(0); } catch (e) {} // ZIGBEE_SEND_SUCCESS
            }, Math.max(5, 15 / (self.speed || 1)));
          }

          return 0;
        }
      },

      zigbeeSendRaw: function(destAddr, dataPtr, len) {
        return self._a.zigbeeSend(destAddr, dataPtr, len);
      },
    };
  },

  constructor: null,
};
