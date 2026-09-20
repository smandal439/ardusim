'use strict';
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Intel8085'] = {
  classes: {},
  constants: {
    PA0: 0, PA1: 1, PA2: 2, PA3: 3, PA4: 4, PA5: 5, PA6: 6, PA7: 7,
    PB0: 8, PB1: 9, PB2: 10, PB3: 11, PB4: 12, PB5: 13, PB6: 14, PB7: 15,
    PC0: 16, PC1: 17, PC2: 18, PC3: 19, PC4: 20, PC5: 21, PC6: 22, PC7: 23,
    HIGH: 1, LOW: 0, INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2
  },
  transpile: function (code) {
    if (typeof window.Intel8085Assembler === 'undefined') {
      alert('Intel 8085 assembler not loaded!'); return ''; }
    try { var result = window.Intel8085Assembler.assemble(code);
    } catch (e) { console.error('8085 ASM Error:', e.message); alert('Assembly Error:\n' + e.message); return ''; }
    if (result.errors && result.errors.length > 0) {
      alert('Assembly Errors:\n' + result.errors.map(function(e) { return 'Line ' + e.line + ': ' + e.message; }).join('\n')); return ''; }
    return '//__8085_ASM_DATA__\n' + JSON.stringify({hex: result.hex, binary: result.binary});
  },
  runtime: function (self) {
    var cpu = null;
    var serialBuf = '';
    function syncPort(port, val) {
      var b = window.CircuitCanvas.getBoardInst();
      if (!b) return;
      var defs = window.ArduinoComponents.COMPONENT_DEFS;
      if (!defs || !defs[b.type]) return;
      var portNames = ['PA', 'PB', 'PC'];
      var pins = portNames[port] + '.';
      for (var i = 0; i < 8; i++) {
        var pid = pins + i;
        var pin = defs[b.type].pins.find(function(p) { return p.id === pid; });
        if (pin) { var pk = 'pin_' + pid;
          window.CircuitCanvas._writeDigitalOutput(b.id, pk, (val >> i) & 1); }}
    }
    function readPort(port, bit) {
      var b = window.CircuitCanvas.getBoardInst();
      if (!b) return 0;
      var portNames = ['PA', 'PB', 'PC'];
      var pid = portNames[port] + '.' + bit;
      return window.CircuitCanvas._readDigitalInput(b.id, pid) & 1;
    }
    function readAllPins(port) {
      var val = 0;
      for (var i = 0; i < 8; i++) {
        if (readPort(port, i)) val |= (1 << i); }
      return val; }
    function pinMonitor() {
      if (!cpu) return;
      var b = window.CircuitCanvas.getBoardInst();
      if (!b) return;
      var defs = window.ArduinoComponents.COMPONENT_DEFS;
      if (!defs || !defs[b.type]) return;
      ['PA', 'PB', 'PC'].forEach(function(pn) {
        var val = 0;
        for (var i = 0; i < 8; i++) {
          var pid = pn + '.' + i;
          var pin = defs[b.type].pins.find(function(p) { return p.id === pid; });
          if (pin) { var pk = 'pin_' + pid;
            var iv = window.CircuitCanvas._readDigitalInput(b.id, pid);
            if (iv !== undefined && iv !== null) {
              if (iv & 1) val |= (1 << i); }}
        if (pn === 'PA') cpu.ports[0] = val;
        if (pn === 'PB') cpu.ports[1] = val;
        if (pn === 'PC') cpu.ports[2] = val;
      }); }
    return {
      _init8085: function (hex, bin) {
        if (!window.Intel8085Emulator) {
          self._serialLog('[8085] Emulator not loaded\n', 'error'); return false; }
        cpu = new window.Intel8085Emulator();
        cpu._portWriteCb = function(port, val) {
          syncPort(port, val);
          if (port === 0xFF) { if (self._serialLog) self._serialLog(String.fromCharCode(val)); }
        };
        cpu._portReadCb = readPort;
        cpu._serialLogCb = function(ch) { serialBuf += ch; };
        var bytes = [];
        for (var i = 0; i < bin.length; i++) {
          bytes.push(bin.charCodeAt(i) & 0xFF); }
        cpu.load(bytes, 0);
        self._8085Registers = {};
        return true;
      },
      _step8085: function () {
        if (!cpu || cpu.halted) return false;
        pinMonitor();
        for (var i = 0; i < 10; i++) {
          if (cpu.halted) break;
          cpu.step();
          syncPort(0, cpu.ports[0]);
          syncPort(1, cpu.ports[1]);
          syncPort(2, cpu.ports[2]);
        }
        if (serialBuf.length > 0) {
          var c = serialBuf;
          serialBuf = '';
          var el = document.getElementById('output');
          if (el) { el.style.display = 'block'; el.value += c; el.scrollTop = el.scrollHeight; }
        }
        self._8085Registers = {
          A: cpu.A, B: cpu.B, C: cpu.C, D: cpu.D,
          E: cpu.E, H: cpu.H, L: cpu.L,
          SP: cpu.SP, PC: cpu.PC,
          Flags: (cpu.F & 128 ? 'S ' : '') + (cpu.F & 64 ? 'Z ' : '') + (cpu.F & 16 ? 'AC ' : '') + (cpu.F & 4 ? 'P ' : '') + (cpu.F & 1 ? 'CY' : ''),
          portA: cpu.ports[0], portB: cpu.ports[1], portC: cpu.ports[2]
        };
        return !cpu.halted;
      },
      _8085_getRegisters: function () {
        if (!cpu) return null;
        return {
          'A': cpu.A, 'B': cpu.B, 'C': cpu.C, 'D': cpu.D,
          'E': cpu.E, 'H': cpu.H, 'L': cpu.L,
          'SP': cpu.SP, 'PC': cpu.PC,
          'Flags': (cpu.F & 128 ? 'S ' : '') + (cpu.F & 64 ? 'Z ' : '') + (cpu.F & 16 ? 'AC ' : '') + (cpu.F & 4 ? 'P ' : '') + (cpu.F & 1 ? 'CY' : ''),
          'portA': cpu.ports[0], 'portB': cpu.ports[1], 'portC': cpu.ports[2]
        };
      }
    };
  }
};
