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

  var SFR = {
    P0: 0x80, P1: 0x90, P2: 0xA0, P3: 0xB0,
    SP: 0x81, DPL: 0x82, DPH: 0x83, PCON: 0x87,
    TCON: 0x88, TMOD: 0x89, TL0: 0x8A, TL1: 0x8B, TH0: 0x8C, TH1: 0x8D,
    SCON: 0x98, SBUF: 0x99, IE: 0xA8, IP: 0xB8, PSW: 0xD0, ACC: 0xE0, B: 0xF0
  };

  var BIT_ADDR = {
    'IT0': 0x88, 'IE0': 0x89, 'IT1': 0x8A, 'IE1': 0x8B,
    'TR0': 0x8C, 'TF0': 0x8D, 'TR1': 0x8E, 'TF1': 0x8F,
    'RI': 0x98, 'TI': 0x99, 'RB8': 0x9A, 'TB8': 0x9B,
    'REN': 0x9C, 'SM2': 0x9D, 'SM1': 0x9E, 'SM0': 0x9F,
    'EX0': 0xA8, 'ET0': 0xA9, 'EX1': 0xAA, 'ET1': 0xAB,
    'ES': 0xAC, 'EA': 0xAF,
    'PX0': 0xB8, 'PT0': 0xB9, 'PX1': 0xBA, 'PT1': 0xBB, 'PS': 0xBC,
    'RXD': 0xB0, 'TXD': 0xB1, 'INT0': 0xB2, 'INT1': 0xB3,
    'T0': 0xB4, 'T1': 0xB5, 'WR': 0xB6, 'RD': 0xB7,
    'P': 0xD0, 'F1': 0xD1, 'OV': 0xD2, 'RS0': 0xD3, 'RS1': 0xD4,
    'F0': 0xD5, 'AC': 0xD6, 'CY': 0xD7
  };

  function resolveBitAddr(s) {
    s = s.trim().toUpperCase();
    if (BIT_ADDR[s] !== undefined) return BIT_ADDR[s];
    var m = s.match(/^(P[0-3])\.([0-7])$/);
    if (m) return SFR[m[1]] + parseInt(m[2]);
    if (SFR[s] !== undefined) return SFR[s];
    return parseNum(s);
  }

  function assemble(source) {
    var lines = source.split('\n');
    var errors = [], labels = {}, org = 0, output = [];

    function err(ln, msg) { errors.push({ line: ln + 1, message: msg }); }

    function pass(collectLabels) {
      var out = [];
      var pc = org;
      if (collectLabels) labels = {};

      function emit(b) {
        while (out.length <= pc) out.push(0);
        out[pc] = b & 0xFF;
        pc++;
      }
      function emit16(v) { emit((v >> 8) & 0xFF); emit(v & 0xFF); }

      for (var i = 0; i < lines.length; i++) {
        var parts = tokenize(lines[i]);
        if (!parts) continue;
        var idx = 0;

        if (parts[idx] && parts[idx].endsWith(':')) {
          var lbl = parts[idx].slice(0, -1).toUpperCase();
          if (collectLabels) labels[lbl] = pc;
          idx++;
        }
        if (idx >= parts.length) continue;
        var mn = parts[idx].toUpperCase(); idx++;

        if (mn === 'ORG') { var v = parseNum(parts[idx] || ''); if (v !== null) { org = v; pc = v; } continue; }
        if (mn === 'END') break;
        if (mn === 'EQU') continue;

        if (mn === 'DB') {
          while (idx < parts.length) {
            var t = parts[idx++].trim();
            if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
              for (var j = 1; j < t.length - 1; j++) emit(t.charCodeAt(j));
            } else {
              var dv = parseNum(t);
              emit(dv !== null ? dv : 0);
            }
          }
          continue;
        }

        var raw1 = idx < parts.length ? parts[idx] : null;
        var raw2 = idx + 1 < parts.length ? parts[idx + 1] : null;
        var raw3 = idx + 2 < parts.length ? parts[idx + 2] : null;
        var r1 = raw1 ? raw1.toUpperCase().replace(/,$/, '') : '';
        var r2 = raw2 ? raw2.toUpperCase().replace(/,$/, '') : '';

        function isA(s) { return s === 'A' || s === 'ACC'; }
        function isReg(s) { return /^R[0-7]$/.test(s); }
        function rNum(s) { return parseInt(s[1]); }
        function isImm(s) { return s && s.startsWith('#'); }
        function immVal(s) {
          var u = s.slice(1).toUpperCase();
          if (labels[u] !== undefined) return labels[u];
          return parseNum(u) || 0;
        }
        function isAtRi(s) { return /^@R[01]$/.test(s); }
        function isDPTR(s) { return s === 'DPTR'; }
        function isAB(s) { return s === 'AB'; }
        function isAtDPTR(s) { return s === '@DPTR'; }
        function dirVal(s) {
          var u = s.toUpperCase();
          if (SFR[u] !== undefined) return SFR[u];
          var v = parseNum(u);
          return v;
        }
        function tgtAddr(s) {
          var u = s.toUpperCase();
          if (u === '$') return pc;
          if (labels[u] !== undefined) return labels[u];
          return parseNum(u);
        }
        function relOf(target, after) {
          var d = target - after;
          if (d < -128 || d > 127) { err(i, 'Relative offset out of range'); return 0; }
          return d & 0xFF;
        }

        switch (mn) {
          case 'NOP': emit(0x00); break;
          case 'RET': emit(0x22); break;
          case 'RETI': emit(0x32); break;
          case 'RL': emit(0x23); break;
          case 'RLC': emit(0x33); break;
          case 'RR': emit(0x03); break;
          case 'RRC': emit(0x13); break;
          case 'SWAP': emit(0xC4); break;
          case 'MUL': emit(0xA4); break;
          case 'DIV': emit(0x84); break;
          case 'DA': emit(0xD4); break;
          case 'JMP': emit(0x73); break;

          case 'CLR':
            if (isA(r1)) { emit(0xE4); idx++; }
            else if (r1 === 'C' || r1 === 'CY') { emit(0xC3); idx++; }
            else { emit(0xC2); emit(resolveBitAddr(raw1)); idx++; }
            break;
          case 'SETB':
            if (r1 === 'C' || r1 === 'CY') { emit(0xD3); idx++; }
            else { emit(0xD2); emit(resolveBitAddr(raw1)); idx++; }
            break;
          case 'CPL':
            if (isA(r1)) { emit(0xF4); idx++; }
            else if (r1 === 'C' || r1 === 'CY') { emit(0xB3); idx++; }
            else { emit(0xB2); emit(resolveBitAddr(raw1)); idx++; }
            break;

          case 'INC':
            if (isA(r1)) { emit(0x04); idx++; }
            else if (isDPTR(r1)) { emit(0xA3); idx++; }
            else if (isReg(r1)) { emit(0x08 + rNum(r1)); idx++; }
            else if (isAtRi(r1)) { emit(0x06 + parseInt(r1[2])); idx++; }
            else { emit(0x05); emit(dirVal(r1)); idx++; }
            break;
          case 'DEC':
            if (isA(r1)) { emit(0x14); idx++; }
            else if (isReg(r1)) { emit(0x18 + rNum(r1)); idx++; }
            else if (isAtRi(r1)) { emit(0x16 + parseInt(r1[2])); idx++; }
            else { emit(0x15); emit(dirVal(r1)); idx++; }
            break;

          case 'ADD':
            if (isA(r1)) { idx++;
              if (isImm(r2)) { emit(0x24); emit(immVal(r2)); idx++; }
              else if (isReg(r2)) { emit(0x28 + rNum(r2)); idx++; }
              else if (isAtRi(r2)) { emit(0x26 + parseInt(r2[2])); idx++; }
              else { emit(0x25); emit(dirVal(r2)); idx++; }
            }
            break;
          case 'ADDC':
            if (isA(r1)) { idx++;
              if (isImm(r2)) { emit(0x34); emit(immVal(r2)); idx++; }
              else if (isReg(r2)) { emit(0x38 + rNum(r2)); idx++; }
              else if (isAtRi(r2)) { emit(0x36 + parseInt(r2[2])); idx++; }
              else { emit(0x35); emit(dirVal(r2)); idx++; }
            }
            break;
          case 'SUBB':
            if (isA(r1)) { idx++;
              if (isImm(r2)) { emit(0x94); emit(immVal(r2)); idx++; }
              else if (isReg(r2)) { emit(0x98 + rNum(r2)); idx++; }
              else if (isAtRi(r2)) { emit(0x96 + parseInt(r2[2])); idx++; }
              else { emit(0x95); emit(dirVal(r2)); idx++; }
            }
            break;

          case 'ANL':
            if (isA(r1)) { idx++;
              if (isImm(r2)) { emit(0x54); emit(immVal(r2)); idx++; }
              else if (isReg(r2)) { emit(0x58 + rNum(r2)); idx++; }
              else if (isAtRi(r2)) { emit(0x56 + parseInt(r2[2])); idx++; }
              else { emit(0x55); emit(dirVal(r2)); idx++; }
            } else {
              emit(0x52); emit(dirVal(r1)); idx++;
              if (isA(r2)) { idx++; }
              else if (isImm(r2)) { emit(immVal(r2)); idx++; }
            }
            break;
          case 'ORL':
            if (isA(r1)) { idx++;
              if (isImm(r2)) { emit(0x44); emit(immVal(r2)); idx++; }
              else if (isReg(r2)) { emit(0x48 + rNum(r2)); idx++; }
              else if (isAtRi(r2)) { emit(0x46 + parseInt(r2[2])); idx++; }
              else { emit(0x45); emit(dirVal(r2)); idx++; }
            } else {
              emit(0x42); emit(dirVal(r1)); idx++;
              if (isA(r2)) { idx++; }
              else if (isImm(r2)) { emit(immVal(r2)); idx++; }
            }
            break;
          case 'XRL':
            if (isA(r1)) { idx++;
              if (isImm(r2)) { emit(0x64); emit(immVal(r2)); idx++; }
              else if (isReg(r2)) { emit(0x68 + rNum(r2)); idx++; }
              else if (isAtRi(r2)) { emit(0x66 + parseInt(r2[2])); idx++; }
              else { emit(0x65); emit(dirVal(r2)); idx++; }
            } else {
              emit(0x62); emit(dirVal(r1)); idx++;
              if (isA(r2)) { idx++; }
              else if (isImm(r2)) { emit(immVal(r2)); idx++; }
            }
            break;

          case 'XCH':
            if (isA(r1)) { idx++;
              if (isReg(r2)) { emit(0xC8 + rNum(r2)); idx++; }
              else if (isAtRi(r2)) { emit(0xC6 + parseInt(r2[2])); idx++; }
              else { emit(0xC5); emit(dirVal(r2)); idx++; }
            }
            break;
          case 'XCHD':
            if (isA(r1)) { idx++; emit(0xD6 + parseInt(r2[2])); idx++; }
            else { emit(0xD6 + parseInt(r1[2])); idx++; }
            break;

          case 'MOV':
            if (isA(r1)) { idx++;
              if (isImm(r2)) { emit(0x74); emit(immVal(r2)); idx++; }
              else if (isReg(r2)) { emit(0xE8 + rNum(r2)); idx++; }
              else if (isAtRi(r2)) { emit(0xE6 + parseInt(r2[2])); idx++; }
              else if (isAtDPTR(r2)) { emit(0xE0); idx++; }
              else { emit(0xE5); emit(dirVal(r2)); idx++; }
            } else if (isReg(r1)) {
              var rn = rNum(r1); idx++;
              if (isImm(r2)) { emit(0x78 + rn); emit(immVal(r2)); idx++; }
              else if (isA(r2)) { emit(0xF8 + rn); idx++; }
              else { emit(0xA8 + rn); emit(dirVal(r2)); idx++; }
            } else if (isAtRi(r1)) {
              var ri = parseInt(r1[2]); idx++;
              if (isImm(r2)) { emit(0x76 + ri); emit(immVal(r2)); idx++; }
              else if (isA(r2)) { emit(0xF6 + ri); idx++; }
              else { emit(0x86 + ri); emit(dirVal(r2)); idx++; }
            } else if (isDPTR(r1)) {
              idx++;
              if (isImm(r2)) { var dv = immVal(r2); emit(0x90); emit((dv >> 8) & 0xFF); emit(dv & 0xFF); idx++; }
            } else {
              var d1 = dirVal(r1); idx++;
              if (isA(r2)) { emit(0xF5); emit(d1); idx++; }
              else if (isImm(r2)) { emit(0x75); emit(d1); emit(immVal(r2)); idx++; }
              else if (isReg(r2)) { emit(0x88 + rNum(r2)); emit(d1); idx++; }
              else if (isAtRi(r2)) { emit(0x86 + parseInt(r2[2])); emit(d1); idx++; }
              // MOV dest_direct, src_direct -> 85 src_direct dest_direct (Keil/Intel encoding)
              else { emit(0x85); emit(dirVal(r2)); emit(d1); idx++; }
            }
            break;

          case 'MOVX':
            if (isA(r1)) { idx++;
              if (isAtDPTR(r2)) { emit(0xE0); idx++; }
              else if (isAtRi(r2)) { emit(0xE2 + parseInt(r2[2])); idx++; }
            } else if (isAtDPTR(r1)) { idx++;
              if (isA(r2)) { emit(0xF0); idx++; }
            } else if (isAtRi(r1)) { idx++;
              if (isA(r2)) { emit(0xF2 + parseInt(r1[2])); idx++; }
            }
            break;

          case 'MOVC':
            if (isA(r1)) { idx++;
              if (r2 === '@A+DPTR') { emit(0x93); idx++; }
              else if (r2 === '@A+PC') { emit(0x83); idx++; }
            }
            break;

          case 'PUSH': emit(0xC0); emit(dirVal(r1)); idx++; break;
          case 'POP': emit(0xD0); emit(dirVal(r1)); idx++; break;

          case 'SJMP': {
            var ta = tgtAddr(r1); idx++;
            if (ta !== null) { emit(0x80); emit(relOf(ta, pc + 1)); }
            else { err(i, 'SJMP target not found'); emit(0x80); emit(0xFE); }
            break;
          }
          case 'AJMP': {
            var ta = tgtAddr(r1); idx++;
            if (ta !== null) { emit(0x01 | (((ta >> 11) & 7) << 5)); emit(ta & 0xFF); }
            else { err(i, 'AJMP target not found'); emit(0x01); emit(0x00); }
            break;
          }
          case 'LJMP': {
            var ta = tgtAddr(r1); idx++;
            if (ta !== null) { emit(0x02); emit16(ta); }
            else { err(i, 'LJMP target not found'); emit(0x02); emit16(0); }
            break;
          }
          case 'ACALL': {
            var ta = tgtAddr(r1); idx++;
            if (ta !== null) { emit(0x11 | (((ta >> 11) & 7) << 5)); emit(ta & 0xFF); }
            else { err(i, 'ACALL target not found'); emit(0x11); emit(0x00); }
            break;
          }
          case 'LCALL': {
            var ta = tgtAddr(r1); idx++;
            if (ta !== null) { emit(0x12); emit16(ta); }
            else { err(i, 'LCALL target not found'); emit(0x12); emit16(0); }
            break;
          }

          case 'JZ': {
            var ta = tgtAddr(r1); idx++;
            emit(0x60); emit(ta !== null ? relOf(ta, pc + 1) : 0xFE);
            break;
          }
          case 'JNZ': {
            var ta = tgtAddr(r1); idx++;
            emit(0x70); emit(ta !== null ? relOf(ta, pc + 1) : 0x02);
            break;
          }
          case 'JC': {
            var ta = tgtAddr(r1); idx++;
            emit(0x40); emit(ta !== null ? relOf(ta, pc + 1) : 0xFE);
            break;
          }
          case 'JNC': {
            var ta = tgtAddr(r1); idx++;
            emit(0x50); emit(ta !== null ? relOf(ta, pc + 1) : 0x02);
            break;
          }

          case 'JB': {
            var ba = resolveBitAddr(raw1); var ta = tgtAddr(r2); idx += 2;
            emit(0x20); emit(ba); emit(ta !== null ? relOf(ta, pc + 1) : 0xFE);
            break;
          }
          case 'JNB': {
            var ba = resolveBitAddr(raw1); var ta = tgtAddr(r2); idx += 2;
            emit(0x30); emit(ba); emit(ta !== null ? relOf(ta, pc + 1) : 0xFE);
            break;
          }
          case 'JBC': {
            var ba = resolveBitAddr(raw1); var ta = tgtAddr(r2); idx += 2;
            emit(0x10); emit(ba); emit(ta !== null ? relOf(ta, pc + 1) : 0xFE);
            break;
          }

          case 'CJNE':
            if (isA(r1)) { idx++;
              if (isImm(r2)) { var ta = tgtAddr(raw3); emit(0xB4); emit(immVal(r2)); emit(ta !== null ? relOf(ta, pc + 1) : 0x00); idx += 2; }
              else { var d = dirVal(r2); var ta = tgtAddr(raw3); emit(0xB5); emit(d); emit(ta !== null ? relOf(ta, pc + 1) : 0x00); idx += 2; }
            } else if (isReg(r1)) { var rn = rNum(r1); idx++;
              var ta = tgtAddr(raw3); emit(0xB8 + rn); emit(immVal(r2)); emit(ta !== null ? relOf(ta, pc + 1) : 0x00); idx += 2;
            }
            break;

          case 'DJNZ':
            if (isReg(r1)) {
              var rn = rNum(r1); idx++;
              var ta = tgtAddr(r2); idx++;
              emit(0xD8 + rn); emit(ta !== null ? relOf(ta, pc + 1) : 0xFE);
            } else {
              var d = dirVal(r1); idx++;
              var ta = tgtAddr(r2); idx++;
              emit(0xD5); emit(d); emit(ta !== null ? relOf(ta, pc + 1) : 0xFD);
            }
            break;

          default:
            err(i, 'Unknown instruction: ' + mn);
            break;
        }
      }
      return out;
    }

    pass(true);
    errors = [];
    output = pass(false);

    return { code: new Uint8Array(output), errors: errors, labels: labels, entryPoint: org };
  }

  return { assemble: assemble };
})();
