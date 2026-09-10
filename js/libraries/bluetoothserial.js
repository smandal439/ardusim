// js/libraries/bluetoothserial.js — BluetoothSerial.h Plugin for ESP32
//
// Simulates the BluetoothSerial library (Classic Bluetooth SPP).
// Cross-board communication via shared bus (window._btSerialBus).
// When Board1 calls SerialBT.write(), data is pushed to Board2's input buffer and vice versa.
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['BluetoothSerial'] = {
  priority: 56,
  classes: [],
  includes: ['<BluetoothSerial.h>'],

  transpile: [
    // BluetoothSerial varName; → var varName = {};
    [/\bBluetoothSerial\s+(\w+)\s*;/g, 'var $1 = {};'],

    // varName.begin("name") → _a.btSerialBegin(varName, "name")
    [/\b(\w+)\.begin\s*\(\s*("[^"]*"|'[^']*')\s*\)/g, '_a.btSerialBegin($1, $2)'],

    // varName.write(val) → _a.btSerialWrite(varName, val)
    [/\b(\w+)\.write\s*\(([^)]+)\)/g, '_a.btSerialWrite($1, $2)'],

    // varName.print(val) → _a.btSerialPrint(varName, val)
    [/\b(\w+)\.print\s*\(([^)]+)\)/g, '_a.btSerialPrint($1, $2)'],

    // varName.println(val) → _a.btSerialPrintln(varName, val)
    [/\b(\w+)\.println\s*\(([^)]+)\)/g, '_a.btSerialPrintln($1, $2)'],

    // varName.available() → _a.btSerialAvailable(varName)
    [/\b(\w+)\.available\s*\(\s*\)/g, '_a.btSerialAvailable($1)'],

    // varName.read() → _a.btSerialRead(varName)
    [/\b(\w+)\.read\s*\(\s*\)/g, '_a.btSerialRead($1)'],

    // varName.hasClient() → _a.btSerialHasClient(varName)
    [/\b(\w+)\.hasClient\s*\(\s*\)/g, '_a.btSerialHasClient($1)'],
  ],

  constants: {},

  runtime: function(self) {
    // ── Shared Bluetooth bus (global between all simulator instances) ──
    if (!window._btSerialBus) {
      window._btSerialBus = {
        boards: {},
      };
    }
    var bus = window._btSerialBus;

    var _myBoardId = null;
    var _btName = '';

    function _getMyBoard() {
      if (_myBoardId !== null) return bus.boards[_myBoardId];
      return null;
    }

    function _findOtherBoard() {
      for (var bid in bus.boards) {
        if (parseInt(bid) !== _myBoardId) {
          return bus.boards[bid];
        }
      }
      return null;
    }

    return {
      btSerialBegin: function(btObj, name) {
        _myBoardId = self.boardIndex || 0;
        _btName = name || ('ESP32_BT' + (_myBoardId + 1));

        bus.boards[_myBoardId] = {
          name: _btName,
          inputBuffer: [],
          initialized: true,
          simulator: self,
        };

        self._serialLog('[Bluetooth] Started as "' + _btName + '"\n', 'system');
      },

      btSerialWrite: function(btObj, val) {
        var board = _getMyBoard();
        if (!board || !board.initialized) return;

        var target = _findOtherBoard();
        if (!target || !target.initialized) {
          self._serialLog('[Bluetooth] TX failed: no paired device\n', 'system');
          return;
        }

        var bytes;
        if (typeof val === 'number') {
          bytes = [val & 0xFF];
        } else if (typeof val === 'string') {
          bytes = [];
          for (var i = 0; i < val.length; i++) {
            bytes.push(val.charCodeAt(i) & 0xFF);
          }
        } else {
          bytes = [];
        }

        // Push each byte to the other board's input buffer
        for (var j = 0; j < bytes.length; j++) {
          target.inputBuffer.push(bytes[j]);
        }

        self._serialLog('[Bluetooth] TX ' + bytes.length + 'B -> "' + target.name + '"\n', 'system');
      },

      btSerialPrint: function(btObj, val) {
        self._a.btSerialWrite(btObj, String(val));
      },

      btSerialPrintln: function(btObj, val) {
        self._a.btSerialWrite(btObj, String(val) + '\n');
      },

      btSerialAvailable: function(btObj) {
        var board = _getMyBoard();
        if (!board) return 0;
        return board.inputBuffer.length;
      },

      btSerialRead: function(btObj) {
        var board = _getMyBoard();
        if (!board || board.inputBuffer.length === 0) return -1;
        return board.inputBuffer.shift();
      },

      btSerialHasClient: function(btObj) {
        var target = _findOtherBoard();
        return target && target.initialized ? 1 : 0;
      },
    };
  },

  constructor: null,
};
