'use strict';
window.Intel8051Assembler = (function () {
  function parseNum(s) {
    s = s.trim();
    if (!s) return null;
    if (/^0[bB][01]+$/.test(s)) return parseInt(s.slice(2), 2) & 0xFFFF;
    if (/^[01]+[bB]$/.test(s)) return parseInt(s.slice(0, -1), 2) & 0xFFFF;
    if (/^0[xX][0-9a-fA-F]+$/.test(s)) return parseInt(s, 16) & 0xFFFF;
    if (/^[0-9a-fA-F]+[hH]$/.test(s)) return parseInt(s.slice(0, -1), 16) & 0xFFFF;
    if (/^-?\d+$/.test(s)) return parseInt(s, 10) & 0xFFFF;
    return null;
  }
  function tokenize(line) {
    var semi = line.indexOf(';');
    if (semi >= 0) line = line.substring(0, semi);
    line = line.trim();
    if (!line) return null;
    var parts = [], cur = '';
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === ',' || ch === '\t' || ch === ' ') {
        if (cur.trim()) parts.push(cur.trim());
        cur = '';
      } else { cur += ch; }
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts.length ? parts : null;
  }

  var SFR = {P0:0x80,P1:0x90,P2:0xA0,P3:0xB0,SP:0x81,DPL:0x82,DPH:0x83,PCON:0x87,
    TCON:0x88,TMOD:0x89,TL0:0x8A,TL1:0x8B,TH0:0x8C,TH1:0x8D,
    SCON:0x98,SBUF:0x99,IE:0xA8,IP:0xB8,PSW:0xD0,ACC:0xE0,B:0xF0};

  function parseOperand(s) {
    if (!s) return null;
    s = s.trim();
    var u = s.toUpperCase();
    if (u === 'A' || u === 'ACC') return { type: 'A' };
    if (/^R[0-7]$/.test(u)) return { type: 'R', num: parseInt(u[1]) };
    if (u === 'AB') return { type: 'AB' };
    if (u === 'DPTR') return { type: 'DPTR' };
    if (u === '@A') return { type: 'AT_A' };
    if (u === '@R0' || u === '@R1') return { type: 'AT_R', num: parseInt(u[2]) };
    if (/^#(.+)$/.test(s)) {
      var val = parseNum(s.slice(1));
      return { type: 'IMM', val: val !== null ? val : 0 };
    }
    var v = parseNum(s);
    if (v !== null) return { type: 'ADDR', val: v };
    return { type: 'LABEL', name: u };
  }

  function assemble(source) {
    var lines = source.split('\n');
    var errors = [], labels = {}, org = 0, output = [];

    function err(ln, msg) { errors.push({ line: ln + 1, message: msg }); }

    function emit(b) { output.push(b & 0xFF); }

    function runPass() {
      var pc = org;
      var out = [];
      for (var i = 0; i < lines.length; i++) {
        var parts = tokenize(lines[i]);
        if (!parts) continue;
        var idx = 0;
        if (parts[idx] && parts[idx].endsWith(':')) {
          labels[parts[idx].slice(0, -1).toUpperCase()] = pc;
          idx++;
        }
        if (idx >= parts.length) continue;
        var mn = parts[idx].toUpperCase(); idx++;
        if (mn === 'ORG') { var v = parseNum(parts[idx] || ''); if (v !== null) { org = v; pc = v; } continue; }
        if (mn === 'END') break;
        if (mn === 'DB') {
          while (idx < parts.length) {
            var t = parts[idx++].trim();
            if (t.startsWith('"') && t.endsWith('"')) {
              for (var j = 1; j < t.length - 1; j++) { out.push(t.charCodeAt(j) & 0xFF); pc++; }
            } else { var dv = parseNum(t); out.push(dv !== null ? dv & 0xFF : 0); pc++; }
          }
          continue;
        }
        if (mn === 'DW') {
          while (idx < parts.length) {
            var dw = parseNum(parts[idx++]);
            if (dw !== null) { out.push(dw & 0xFF); out.push((dw >> 8) & 0xFF); pc += 2; }
            else { out.push(0); out.push(0); pc += 2; }
          }
          continue;
        }

        var op1 = parts[idx] ? parseOperand(parts[idx]) : null;
        var op2 = parts[idx + 1] ? parseOperand(parts[idx + 1]) : null;
        var op1u = parts[idx] ? parts[idx].trim().toUpperCase() : '';
        var op2u = parts[idx + 1] ? parts[idx + 1].trim().toUpperCase() : '';

        function addr(o) { return o ? (o.type === 'LABEL' ? (labels[o.name] !== undefined ? labels[o.name] : 0) : o.val || 0) : 0; }
        function imm(o) { return o ? (o.type === 'IMM' ? o.val : o.type === 'ADDR' ? o.val : 0) : 0; }

        var size = 1;
        var b0 = 0;

        switch (mn) {
          case 'NOP': b0 = 0x00; size = 1; break;
          case 'SJMP': b0 = 0x80; size = 2; break;
          case 'LJMP': b0 = 0x02; size = 3; break;
          case 'AJMP': b0 = 0x01; size = 2; break;
          case 'LCALL': b0 = 0x12; size = 3; break;
          case 'ACALL': b0 = 0x11; size = 2; break;
          case 'RET': b0 = 0x22; size = 1; break;
          case 'RETI': b0 = 0x32; size = 1; break;

          case 'JMP': b0 = 0x73; size = 1; break;
          case 'JZ': b0 = 0x60; size = 2; break;
          case 'JNZ': b0 = 0x70; size = 2; break;
          case 'JC': b0 = 0x40; size = 2; break;
          case 'JNC': b0 = 0x50; size = 2; break;
          case 'JB': b0 = 0x20; size = 3; break;
          case 'JNB': b0 = 0x30; size = 3; break;
          case 'JBC': b0 = 0x10; size = 3; break;
          case 'JCB': b0 = 0x40; size = 2; break;
          case 'JNC': b0 = 0x50; size = 2; break;
          case 'DJNZ': size = 2; break;

          case 'MOV': size = 3; break;
          case 'MOVX': size = 1; break;
          case 'MOVC': size = 1; break;
          case 'PUSH': b0 = 0xC0; size = 2; break;
          case 'POP': b0 = 0xD0; size = 2; break;
          case 'XCH': b0 = 0xC8; size = 1; break;
          case 'XCHD': b0 = 0xD6; size = 1; break;
          case 'SWAP': b0 = 0xC4; size = 1; break;

          case 'ADD': b0 = 0x28; size = 1; break;
          case 'ADDC': b0 = 0x38; size = 1; break;
          case 'SUBB': b0 = 0x98; size = 1; break;
          case 'INC': b0 = 0x08; size = 1; break;
          case 'DEC': b0 = 0x18; size = 1; break;
          case 'MUL': b0 = 0xA4; size = 1; break;
          case 'DIV': b0 = 0x84; size = 1; break;
          case 'DA': b0 = 0xD4; size = 1; break;

          case 'ANL': size = 3; break;
          case 'ORL': size = 3; break;
          case 'XRL': size = 3; break;
          case 'CLR': b0 = 0xE4; size = 1; break;
          case 'CPL': b0 = 0xF4; size = 1; break;
          case 'RL': b0 = 0x23; size = 1; break;
          case 'RLC': b0 = 0x33; size = 1; break;
          case 'RR': b0 = 0x03; size = 1; break;
          case 'RRC': b0 = 0x13; size = 1; break;

          case 'SETB': b0 = 0xD2; size = 2; break;
          case 'CJNE': size = 3; break;

          default: err(i, 'Unknown mnemonic: ' + mn); continue;
        }

        if (mn === 'DJNZ') size = 2;
        if (mn === 'SJMP' || mn === 'AJMP') size = 2;
        if (mn === 'LJMP' || mn === 'LCALL') size = 3;
        if (mn === 'ACALL') size = 2;

        for (var s = 0; s < size; s++) { out.push(0); pc++; }
      }
      return out;
    }

    runPass();
    output = runPass();
    return { code: new Uint8Array(output), errors: errors, labels: labels, entryPoint: org };
  }

  return { assemble: assemble };
})();
