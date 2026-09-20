'use strict';
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Intel8051'] = {
  classes: [],
  constants: {
    P0: 0, P1: 1, P2: 2, P3: 3,
    P0_0: 0, P0_1: 1, P0_2: 2, P0_3: 3, P0_4: 4, P0_5: 5, P0_6: 6, P0_7: 7,
    P1_0: 10, P1_1: 11, P1_2: 12, P1_3: 13, P1_4: 14, P1_5: 15, P1_6: 16, P1_7: 17,
    P2_0: 20, P2_1: 21, P2_2: 22, P2_3: 23, P2_4: 24, P2_5: 25, P2_6: 26, P2_7: 27,
    P3_0: 30, P3_1: 31, P3_2: 32, P3_3: 33, P3_4: 34, P3_5: 35, P3_6: 36, P3_7: 37,
    P3_0_RXD: 30, P3_1_TXD: 31, P3_2_INT0: 32, P3_3_INT1: 33,
    P3_4_T0: 34, P3_5_T1: 35, P3_6_WR: 36, P3_7_RD: 37,
    LED: 17, BUTTON: 10, SPEAKER: 34, HIGH: 1, LOW: 0, INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2
  },
  transpile: function (code) {
    if (typeof window.Intel8051Assembler === 'undefined') {
      return '//__ASM_ERROR__\n' + JSON.stringify({ error: 'Intel 8051 assembler not loaded!' }); }
    try { var result = window.Intel8051Assembler.assemble(code);
    } catch (e) { return '//__ASM_ERROR__\n' + JSON.stringify({ error: e.message }); }
    if (result.errors && result.errors.length > 0) {
      return '//__ASM_ERROR__\n' + JSON.stringify({ error: result.errors.join('\n') }); }
    var bytes = [];
    for (var k in result.code) { bytes.push(result.code[k] & 0xFF); }
    var hex = bytes.map(function(b) { return ('0' + b.toString(16)).slice(-2).toUpperCase(); }).join(' ');
    var binary = String.fromCharCode.apply(null, bytes);
    return '//__8051_ASM_DATA__\n' + JSON.stringify({hex: hex, binary: binary});
  },
  runtime: function (self) {
    var cpu = null;
    var serialBuf = '';
    function syncPort(port, val) {
      var b = window.CircuitCanvas.getBoardInst();
      if (!b) return;
      var defs = window.ArduinoComponents.COMPONENT_DEFS;
      if (!defs || !defs[b.type]) return;
      var pins = ['P0','P1','P2','P3'][port] + '.';
      for (var i = 0; i < 8; i++) {
        var pid = pins + i;
          var pin = defs[b.type].pins.find(function(p) { return p.id === pid; });
          if (pin) { window.CircuitCanvas._writeDigitalOutput(b.id, pid, (val >> i) & 1); }}
    }
    function readPort(port, pin) {
      var b = window.CircuitCanvas.getBoardInst();
      if (!b) return 0;
      var pid = ['P0','P1','P2','P3'][port] + '.' + pin;
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
      ['P0','P1','P2','P3'].forEach(function(pn) {
        var val = 0;
        for (var i = 0; i < 8; i++) {
          var pid = pn + '.' + i;
          var pin = defs[b.type].pins.find(function(p) { return p.id === pid; });
          if (pin) {
            var iv = window.CircuitCanvas._readDigitalInput(b.id, pid);
            if (iv !== undefined && iv !== null) {
              if (iv & 1) val |= (1 << i);
            }
          }
        }
        if (pn === 'P0') cpu.P0 = (cpu.P0 & 0xF0) | (val & 0x0F);
        if (pn === 'P1') cpu.P1 = val;
        if (pn === 'P2') cpu.P2 = val;
        if (pn === 'P3') cpu.P3 = (cpu.P3 & 0xF0) | (val & 0x0F);
      }); }
    return {
      _init8051: function (hex, bin) {
        cpu = new window.Intel8051Emulator();
        cpu._portWriteCb = syncPort;
        cpu._portReadCb = readPort;
        cpu._serialLogCb = function(ch) { serialBuf += ch; };
        var bytes = [];
        for (var i = 0; i < bin.length; i++) {
          bytes.push(bin.charCodeAt(i) & 0xFF); }
        cpu.load(bytes);
        self._8051Registers = {};
        return true;
      },
      _step8051: function () {
        if (!cpu || cpu.halted) return false;
        pinMonitor();
        for (var i = 0; i < 10; i++) {
          if (cpu.halted) break;
          cpu.step();
          syncPort(0, cpu.P0);
          syncPort(1, cpu.P1);
          syncPort(2, cpu.P2);
          syncPort(3, cpu.P3);
        }
        if (serialBuf.length > 0) {
          var c = serialBuf;
          serialBuf = '';
          var el = document.getElementById('output');
          if (el) { el.style.display = 'block'; el.value += c; el.scrollTop = el.scrollHeight; }
        }
        self._8051Registers = {
          ACC: cpu.ACC, B: cpu.B, SP: cpu.SP, PC: cpu.PC,
          DPH: cpu.DPH, DPL: cpu.DPL, PSW: cpu.PSW,
          P0: cpu.P0, P1: cpu.P1, P2: cpu.P2, P3: cpu.P3
        };
        return !cpu.halted;
      },
      _8051_getRegisters: function () {
        if (!cpu) return null;
        var flags = [];
        if (cpu.PSW & 0x80) flags.push('CY');
        if (cpu.PSW & 0x40) flags.push('AC');
        if (cpu.PSW & 0x20) flags.push('F0');
        if (cpu.PSW & 0x08) flags.push('RS1');
        if (cpu.PSW & 0x04) flags.push('RS0');
        if (cpu.PSW & 0x02) flags.push('OV');
        return {
          'ACC': cpu.ACC, 'B': cpu.B, 'SP': cpu.SP,
          'PC': cpu.PC, 'DPTR': (cpu.DPH << 8) | cpu.DPL,
          'PSW': cpu.PSW, 'Flags': flags.join(' '),
          'P0': cpu.P0, 'P1': cpu.P1, 'P2': cpu.P2, 'P3': cpu.P3,
          'R0': cpu._rR(0), 'R1': cpu._rR(1), 'R2': cpu._rR(2), 'R3': cpu._rR(3),
          'R4': cpu._rR(4), 'R5': cpu._rR(5), 'R6': cpu._rR(6), 'R7': cpu._rR(7)
        };
      }
    };
  }
};