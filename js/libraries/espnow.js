// js/libraries/espnow.js — ESP-NOW Plugin for ESP32
//
// Simulates ESP-NOW peer-to-peer wireless communication between boards.
// Cross-board message delivery via shared bus (window._espnowBus).
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['ESP-NOW'] = {
  priority: 55,
  classes: [],
  includes: ['<esp_now.h>', '<WiFi.h>'],

  transpile: [
    // esp_now_peer_info_t varName; → var varName = { peer_addr: new Uint8Array(6), channel: 0, encrypt: false, lmk: null }
    [/\besp_now_peer_info_t\s+(\w+)\s*;/g, 'var $1 = { peer_addr: new Uint8Array([0,0,0,0,0,0]), channel: 0, encrypt: false, lmk: null };'],

    // esp_now_init() → _a.espnowInit()
    [/\besp_now_init\s*\(\s*\)/g, '_a.espnowInit()'],

    // esp_now_register_send_cb(OnDataSent) → _a.espnowRegisterSendCb(OnDataSent)
    [/\besp_now_register_send_cb\s*\(\s*(\w+)\s*\)/g, '_a.espnowRegisterSendCb($1)'],
    [/\besp_now_register_send_cb\s*\(\s*esp_now_send_cb_t\s*\(\s*(\w+)\s*\)\s*\)/g, '_a.espnowRegisterSendCb($1)'],

    // esp_now_register_recv_cb(OnDataRecv) → _a.espnowRegisterRecvCb(OnDataRecv)
    [/\besp_now_register_recv_cb\s*\(\s*(\w+)\s*\)/g, '_a.espnowRegisterRecvCb($1)'],
    [/\besp_now_register_recv_cb\s*\(\s*esp_now_recv_cb_t\s*\(\s*(\w+)\s*\)\s*\)/g, '_a.espnowRegisterRecvCb($1)'],

    // memcpy(peerInfo.peer_addr, addr, 6) → _a.espnowSetPeerAddr(peerInfo, addr)
    [/\bmemcpy\s*\(\s*(\w+)\.peer_addr\s*,\s*(\w+)\s*,\s*6\s*\)/g, '_a.espnowSetPeerAddr($1, $2)'],

    // esp_now_add_peer(&peerInfo) → _a.espnowAddPeer(peerInfo)
    [/\besp_now_add_peer\s*\(\s*&(\w+)\s*\)/g, '_a.espnowAddPeer($1)'],

    // esp_now_send(addr, (uint8_t *)&data, sizeof(data)) → _a.espnowSend(addr, data)
    [/\besp_now_send\s*\(\s*(\w+)\s*,\s*\(uint8_t\s*\*\)\s*&(\w+)\s*,\s*sizeof\s*\(\s*\2\s*\)\s*\)/g,
      '_a.espnowSend($1, $2)'],

    // esp_err_t varName = ... → var varName = ...
    [/\besp_err_t\s+(\w+)\s*=/g, 'var $1 ='],

    // esp_now_send_status_t varName → var varName
    [/\besp_now_send_status_t\s+(\w+)/g, 'var $1'],

    // esp_now_recv_cb_t type stripping (for callback typedef in register calls)
    [/\besp_now_recv_cb_t\s*/g, ''],
    [/\besp_now_send_cb_t\s*/g, ''],

    // esp_now_peer_info_t type in cast contexts
    [/\(esp_now_peer_info_t\s*\*\)/g, '(null)'],
  ],

  constants: {
    ESP_OK: 0,
    ESP_FAIL: -1,
    ESP_NOW_SEND_SUCCESS: 0,
    ESP_NOW_SEND_FAIL: 1,
    ESP_NOW_MAX_DATA_LEN: 250,
  },

  runtime: function(self) {
    // ── Shared ESP-NOW bus (global between all simulator instances) ──
    if (!window._espnowBus) {
      window._espnowBus = {
        boards: {},
        nextBoardId: 0,
      };
    }
    const bus = window._espnowBus;

    let _myBoardId = null;

    function _getMyBoard() {
      if (_myBoardId !== null) return bus.boards[_myBoardId];
      return null;
    }

    function _parseMac(addr) {
      if (Array.isArray(addr)) {
        return addr.map(function(b) {
          return (typeof b === 'number' ? b : parseInt(b, 16))
            .toString(16).toUpperCase().padStart(2, '0');
        }).join(':');
      }
      if (typeof addr === 'string') return addr;
      return null;
    }

    return {
      espnowInit: function() {
        _myBoardId = bus.nextBoardId++;
        var mac = 'AA:BB:CC:DD:EE:' + String(_myBoardId + 1).padStart(2, '0');
        bus.boards[_myBoardId] = {
          mac: mac,
          macBytes: mac.split(':').map(function(h) { return parseInt(h, 16); }),
          recvCb: null,
          sendCb: null,
          peers: {},
          initialized: true,
          simulator: self,
        };
        self._serialLog('[ESP-NOW] Initialized. MAC: ' + mac + '\n', 'system');
        return 0;
      },

      espnowRegisterSendCb: function(cb) {
        var board = _getMyBoard();
        if (board) board.sendCb = cb;
      },

      espnowRegisterRecvCb: function(cb) {
        var board = _getMyBoard();
        if (board) board.recvCb = cb;
      },

      espnowSetPeerAddr: function(peerInfoObj, addrArray) {
        if (!peerInfoObj) return;
        var addr;
        if (Array.isArray(addrArray)) {
          addr = new Uint8Array(addrArray.map(function(b) {
            return typeof b === 'number' ? b : parseInt(b, 16);
          }));
        } else if (typeof addrArray === 'string') {
          addr = new Uint8Array(addrArray.split(':').map(function(h) { return parseInt(h, 16); }));
        }
        if (addr && addr.length === 6) {
          peerInfoObj.peer_addr = addr;
        }
      },

      espnowAddPeer: function(peerInfoObj) {
        var board = _getMyBoard();
        if (!board || !peerInfoObj) return -1;
        var addrStr = Array.from(peerInfoObj.peer_addr).map(function(b) {
          return b.toString(16).toUpperCase().padStart(2, '0');
        }).join(':');
        board.peers[addrStr] = {
          addr: addrStr,
          addrBytes: Array.from(peerInfoObj.peer_addr),
          channel: peerInfoObj.channel || 0,
          encrypt: peerInfoObj.encrypt || false,
        };
        self._serialLog('[ESP-NOW] Peer added: ' + addrStr + '\n', 'system');
        return 0;
      },

      espnowSend: function(addrArray, dataObj) {
        var board = _getMyBoard();
        if (!board || !board.initialized) return -1;

        var targetAddr = _parseMac(addrArray);
        if (!targetAddr) return -1;

        // Serialize data
        var payload;
        if (dataObj instanceof ArrayBuffer) {
          payload = new Uint8Array(dataObj);
        } else if (ArrayBuffer.isView(dataObj)) {
          payload = new Uint8Array(dataObj.buffer, dataObj.byteOffset, dataObj.byteLength);
        } else if (typeof dataObj === 'object' && dataObj !== null) {
          try {
            var jsonStr = JSON.stringify(dataObj);
            payload = new TextEncoder().encode(jsonStr);
          } catch (e) {
            payload = new Uint8Array(0);
          }
        } else if (typeof dataObj === 'string') {
          payload = new TextEncoder().encode(dataObj);
        } else if (typeof dataObj === 'number') {
          payload = new Uint8Array([dataObj & 0xFF]);
        } else {
          payload = new Uint8Array(0);
        }

        self._serialLog('[ESP-NOW] TX ' + payload.length + 'B -> ' + targetAddr + '\n', 'system');

        // Find target board(s) and deliver
        var delivered = false;

        if (targetAddr === 'FF:FF:FF:FF:FF:FF') {
          // Broadcast
          for (var bid in bus.boards) {
            if (parseInt(bid) !== _myBoardId) {
              var b = bus.boards[bid];
              if (b.recvCb && b.simulator) {
                (function(target) {
                  setTimeout(function() {
                    try { target.recvCb(board.macBytes, payload, payload.length, true); } catch (e) {}
                  }, Math.max(5, 10 / (self.speed || 1)));
                })(b);
                delivered = true;
              }
            }
          }
        } else {
          // Unicast
          for (var bid2 in bus.boards) {
            if (bus.boards[bid2].mac === targetAddr) {
              var target = bus.boards[bid2];
              if (target.recvCb && target.simulator) {
                (function(t) {
                  setTimeout(function() {
                    try { t.recvCb(board.macBytes, payload, payload.length, false); } catch (e) {}
                  }, Math.max(5, 10 / (self.speed || 1)));
                })(target);
                delivered = true;
              }
              break;
            }
          }
        }

        // Trigger send callback with status
        var status = delivered ? 0 : 1; // ESP_NOW_SEND_SUCCESS or FAIL
        if (board.sendCb) {
          setTimeout(function() {
            try { board.sendCb(board.macBytes, status); } catch (e) {}
          }, Math.max(5, 10 / (self.speed || 1)));
        }

        return 0; // ESP_OK
      },

      espnowSendRaw: function(addrArray, dataPtr, len) {
        return self._a.espnowSend(addrArray, dataPtr);
      },
    };
  },

  constructor: null,
};
