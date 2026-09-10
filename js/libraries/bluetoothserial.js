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

    // SerialBT.begin("name") → _a.btSerialBegin("name")
    [/\bSerialBT\.begin\s*\(\s*("[^"]*"|'[^']*')\s*\)/g, '_a.btSerialBegin($2)'],

    // SerialBT.write(val) → _a.btSerialWrite(val)
    [/\bSerialBT\.write\s*\(([^)]+)\)/g, '_a.btSerialWrite($1)'],

    // SerialBT.print(val) → _a.btSerialPrint(val)
    [/\bSerialBT\.print\s*\(([^)]+)\)/g, '_a.btSerialPrint($1)'],

    // SerialBT.println(val) → _a.btSerialPrintln(val)
    [/\bSerialBT\.println\s*\(([^)]+)\)/g, '_a.btSerialPrintln($1)'],

    // SerialBT.available() → _a.btSerialAvailable()
    [/\bSerialBT\.available\s*\(\s*\)/g, '_a.btSerialAvailable()'],

    // SerialBT.read() → _a.btSerialRead()
    [/\bSerialBT\.read\s*\(\s*\)/g, '_a.btSerialRead()'],

    // SerialBT.hasClient() → _a.btSerialHasClient()
    [/\bSerialBT\.hasClient\s*\(\s*\)/g, '_a.btSerialHasClient()'],
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
      btSerialBegin: function(name) {
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

      btSerialWrite: function(val) {
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

      btSerialPrint: function(val) {
        self._a.btSerialWrite(String(val));
      },

      btSerialPrintln: function(val) {
        self._a.btSerialWrite(String(val) + '\n');
      },

      btSerialAvailable: function() {
        var board = _getMyBoard();
        if (!board) return 0;
        return board.inputBuffer.length;
      },

      btSerialRead: function() {
        var board = _getMyBoard();
        if (!board || board.inputBuffer.length === 0) return -1;
        return board.inputBuffer.shift();
      },

      btSerialHasClient: function() {
        var target = _findOtherBoard();
        return target && target.initialized ? 1 : 0;
      },
    };
  },

  constructor: null,
};
