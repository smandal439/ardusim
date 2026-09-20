'use strict';
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Intel8085'] = {
  classes: {},
  constants: {
    PA0: 0, PA1: 1, PA2: 2, PA3: 3, PA4: 4, PA5: 5, PA6: 6, PA7: 7,
    PB0: 8, PB1: 9, PB2: 10, PB3: 11, PB4: 12, PB5: 13, PB6: 14, PB7: 15,
    PC0: 16, PC1: 17, PC2: 18, PC3: 19, PC4: 20, PC5: 21, PC6: 22, PC7: 23,
    VCC: 24, GND: 25,
    HIGH: 1, LOW: 0, INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2
  },
  transpile: function (code) {
    if (typeof window.Intel8085Assembler === 'undefined') {
      alert('Intel 8085 assembler not loaded!'); return '';
    }
    try { var result = window.Intel8085Assembler.assemble(code); }
    catch (e) { console.error('8085 ASM Error:', e.message); alert('Assembly Error:\n' + e.message); return ''; }
    if (result.errors && result.errors.length > 0) {
      alert('Assembly Errors:\n' + result.errors.join('\n')); return '';
    }
    return '//__8085_ASM_DATA__\n' + JSON.stringify({ hex: result.hex, binary: result.binary });
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
      var pn = portNames[port];
      if (!pn) return;
      for (var i = 0; i < 8; i++) {
        var pid = pn + i;
        var pin = defs[b.type].pins.find(function (p) { return p.id === pid; });
        if (pin) {
          var pk = 'pin_' + pid;
          window.CircuitCanvas._writeDigitalOutput(b.id, pk, (val >> i) & 1);
        }
      }
    }

    function readPort(port, bit) {
      var b = window.CircuitCanvas.getBoardInst();
      if (!b) return 0;
      var portNames = ['PA', 'PB', 'PC'];
      var pn = portNames[port];
      if (!pn) return 0;
      var pid = pn + bit;
      return window.CircuitCanvas._readDigitalInput(b.id, pid) & 1;
    }

    function readAllPortBits(port) {
      var val = 0;
      for (var i = 0; i < 8; i++) {
        if (readPort(port, i)) val |= (1 << i);
      }
      return val;
    }

    function pollInputPorts() {
      if (!cpu) return;
      var b = window.CircuitCanvas.getBoardInst();
      if (!b) return;
      var defs = window.ArduinoComponents.COMPONENT_DEFS;
      if (!defs || !defs[b.type]) return;
      var portNames = ['PA', 'PB', 'PC'];
      for (var p = 0; p < 3; p++) {
        var val = 0;
        for (var i = 0; i < 8; i++) {
          var pid = portNames[p] + i;
          var pin = defs[b.type].pins.find(function (x) { return x.id === pid; });
          if (pin) {
            var pk = 'pin_' + pid;
            var iv = window.CircuitCanvas._readDigitalInput(b.id, pid);
            if (iv !== undefined && iv !== null && (iv & 1)) val |= (1 << i);
          }
        }
        if (p === 0) cpu.portA = val;
        if (p === 1) cpu.portB = val;
        if (p === 2) cpu.portC = val;
      }
    }

    function writeSerialMonitor(ch) {
      if (ch === '\n' || ch === '\r') {
        var el = document.getElementById('output');
        if (el) { el.style.display = 'block'; el.value += serialBuf + '\n'; el.scrollTop = el.scrollHeight; }
        serialBuf = '';
      } else {
        serialBuf += ch;
      }
    }

    return {
      _init8085: function (hex, bin) {
        cpu = new window.Intel8085Emulator();
        cpu._portWriteCb = function (port, val) { syncPort(port, val); };
        cpu._portReadCb = function (port, bit) { return readPort(port, bit); };
        cpu._serialLogCb = function (ch) { writeSerialMonitor(ch); };
        var bytes = [];
        for (var i = 0; i < bin.length; i++) {
          bytes.push(bin.charCodeAt(i) & 0xFF);
        }
        cpu.load(bytes);
        self._8085Registers = {};
        return true;
      },

      _step8085: function () {
        if (!cpu || cpu.halted) return false;
        pollInputPorts();
        for (var i = 0; i < 10000; i++) {
          if (cpu.halted) break;
          cpu.step();
        }
        syncPort(0, cpu.portA);
        syncPort(1, cpu.portB);
        syncPort(2, cpu.portC);
        if (serialBuf.length > 0) {
          var pending = serialBuf;
          serialBuf = '';
          var el = document.getElementById('output');
          if (el) { el.style.display = 'block'; el.value += pending; el.scrollTop = el.scrollHeight; }
        }
        self._8085Registers = {
          A: cpu.A, F: cpu.F, B: cpu.B, C: cpu.C,
          D: cpu.D, E: cpu.E, H: cpu.H, L: cpu.L,
          SP: cpu.SP, PC: cpu.PC,
          portA: cpu.portA, portB: cpu.portB, portC: cpu.portC,
          halted: cpu.halted, cycles: cpu.cycles
        };
        return !cpu.halted;
      },

      _8085_getRegisters: function () {
        if (!cpu) return null;
        var flags = [];
        if (cpu.F & 0x80) flags.push('S');
        if (cpu.F & 0x40) flags.push('Z');
        if (cpu.F & 0x10) flags.push('AC');
        if (cpu.F & 0x04) flags.push('P');
        if (cpu.F & 0x01) flags.push('CY');
        return {
          'A': cpu.A, 'F': cpu.F, 'Flags': flags.join(' '),
          'B': cpu.B, 'C': cpu.C, 'D': cpu.D, 'E': cpu.E,
          'H': cpu.H, 'L': cpu.L,
          'SP': cpu.SP, 'PC': cpu.PC,
          'PortA': cpu.portA, 'PortB': cpu.portB, 'PortC': cpu.portC,
          'halted': cpu.halted, 'cycles': cpu.cycles
        };
      }
    };
  }
};