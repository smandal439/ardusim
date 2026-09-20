'use strict';
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Intel8085'] = {
  classes: [],
  includes: [],
  priority: 1,
  constants: {},
  transpile: [],

  runtime: function (self) {
    var cpu = null;

    function syncPins() {
      if (!cpu) return;
      var canvas = window.CircuitCanvas;
      if (!canvas) return;
      var board = null;
      if (typeof canvas.getBoardInst === 'function') board = canvas.getBoardInst();
      if (!board) return;
      var def = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
      if (!def || !def[board.type]) return;

      for (var pin of def[board.type].pins) {
        if (pin.side === 'left' && pin.id >= 'AD0' && pin.id <= 'AD7') {
          var bit = parseInt(pin.id.slice(2));
          var pinKey = 'pin_' + pin.id;
          var val = (cpu.A >> bit) & 1;
          self.pinStates[pinKey] = val;
          self.pinStates['pin_' + pin.id] = val;
          self._emitPinChange(pinKey, val);
        }
      }
    }

    function readPortCb(port) {
      var canvas = window.CircuitCanvas;
      if (!canvas) return 0;
      var board = null;
      if (typeof canvas.getBoardInst === 'function') board = canvas.getBoardInst();
      if (!board) return 0;
      var def = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
      if (!def || !def[board.type]) return 0;

      for (var pin of def[board.type].pins) {
        if (pin.id === 'AD' + port && port >= 0 && port <= 7) {
          var pinKey = 'pin_' + pin.id;
          if (typeof canvas._readDigitalInput === 'function') {
            return canvas._readDigitalInput(board.id, pin.id) & 0xFF;
          }
        }
      }
      return self.pinStates['port_' + port] || 0;
    }

    function writePortCb(port, val) {
      self.pinStates['port_' + port] = val;
      var canvas = window.CircuitCanvas;
      if (!canvas) return;
      var board = null;
      if (typeof canvas.getBoardInst === 'function') board = canvas.getBoardInst();
      if (!board) return;
      var def = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
      if (!def || !def[board.type]) return;

      if (port <= 7) {
        for (var bit = 0; bit < 8; bit++) {
          var pinId = 'AD' + bit;
          var v = (val >> bit) & 1;
          var pinKey = 'pin_' + pinId;
          self.pinStates[pinKey] = v;
          self.pinStates['pin_' + pinId] = v;
          self._emitPinChange(pinKey, v);
        }
      }
      if (port === 0xFF) {
        if (self._serialLog) self._serialLog(String.fromCharCode(val));
      }
    }

    return {
      _init8085: function () {
        if (!window.Intel8085Emulator) {
          self._serialLog('[8085] Emulator not loaded\n', 'error');
          return false;
        }
        cpu = new window.Intel8085Emulator();
        cpu._portReadCb = readPortCb;
        cpu._portWriteCb = writePortCb;

        var canvas = window.CircuitCanvas;
        if (canvas) {
          var board = typeof canvas.getBoardInst === 'function' ? canvas.getBoardInst() : null;
          if (board) {
            var code = self._asmCode8085;
            if (code) {
              cpu.load(code, 0);
              self._serialLog('[8085] Program loaded (' + code.length + ' bytes)\n', 'system');
            }
          }
        }
        cpu.halted = false;
        return true;
      },

      _step8085: function (n) {
        if (!cpu || cpu.halted) return;
        n = n || 1000;
        for (var i = 0; i < n && !cpu.halted; i++) {
          cpu.step();
        }
        syncPins();
      },

      _8085_reset: function () {
        if (cpu) cpu.reset();
      },

      _8085_getRegisters: function () {
        if (!cpu) return null;
        return {
          A: cpu.A, B: cpu.B, C: cpu.C, D: cpu.D,
          E: cpu.E, H: cpu.H, L: cpu.L,
          SP: cpu.SP, PC: cpu.PC,
          S: !!(cpu.F & 128), Z: !!(cpu.F & 64),
          AC: !!(cpu.F & 16), P: !!(cpu.F & 4), CY: !!(cpu.F & 1),
          halted: cpu.halted
        };
      },

      _8085_readPort: function (port) { return cpu ? cpu.readPort(port) : 0; },
      _8085_writePort: function (port, val) { if (cpu) cpu.writePort(port, val); },
    };
  },
};
