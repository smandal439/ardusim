'use strict';
window.Intel8085Assembler = (function () {
  var REG = { A: 7, B: 0, C: 1, D: 2, E: 3, H: 5, L: 6, M: 7 };
  var RP_LXI = { B: 0, D: 1, H: 2, SP: 3 };
  var RP_PP = { B: 0, D: 1, H: 2, PSW: 3 };
  var REG_BASE = { ADD: 0x80, ADC: 0x88, SUB: 0x90, SBB: 0x98, ANA: 0xA0, XRA: 0xA8, ORA: 0xB0, CMP: 0xB8 };

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

  function assemble(source) {
    var lines = source.split('\n');
    var errors = [], labels = {}, org = 0, output = [], fixups = [];

    function err(ln, msg) { errors.push({ line: ln + 1, message: msg }); }

    function runPass() {
      var pc = org, out = [];
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
        if (mn === 'ORG') { var ov = parseNum(parts[idx] || ''); if (ov !== null) { org = ov; pc = ov; } continue; }
        if (mn === 'END') break;
        if (mn === 'EQU') continue;
        if (mn === 'DB') {
          while (idx < parts.length) {
            var t = parts[idx++].trim();
            if (t.startsWith('"') && t.endsWith('"')) {
              for (var j = 1; j < t.length - 1; j++) { out.push(t.charCodeAt(j) & 0xFF); pc++; }
            } else {
              var dv = parseNum(t);
              if (dv !== null) { out.push(dv & 0xFF); pc++; }
              else { fixups.push({ offset: out.length, tokens: [t], size: 1 }); out.push(0); pc++; }
            }
          }
          continue;
        }
        if (mn === 'DW') {
          while (idx < parts.length) {
            var dw = parseNum(parts[idx++]);
            if (dw !== null) { out.push(dw & 0xFF); out.push((dw >> 8) & 0xFF); pc += 2; }
            else { fixups.push({ offset: out.length, tokens: [parts[idx-1]], size: 2 }); out.push(0); out.push(0); pc += 2; }
          }
          continue;
        }
        // NOP
        if (mn === 'NOP') { out.push(0x00); pc++; continue; }
        // HLT
        if (mn === 'HLT') { out.push(0x76); pc++; continue; }
        // EI DI
        if (mn === 'EI') { out.push(0xFB); pc++; continue; }
        if (mn === 'DI') { out.push(0xF3); pc++; continue; }
        // XCHG SPHL PCHL XTHL
        if (mn === 'XCHG') { out.push(0xEB); pc++; continue; }
        if (mn === 'SPHL') { out.push(0xF9); pc++; continue; }
        if (mn === 'PCHL') { out.push(0xE9); pc++; continue; }
        if (mn === 'XTHL') { out.push(0xE3); pc++; continue; }
        // RLC RRC RAL RAR CMA STC CMC DAA
        if (mn === 'RLC') { out.push(0x07); pc++; continue; }
        if (mn === 'RRC') { out.push(0x0F); pc++; continue; }
        if (mn === 'RAL') { out.push(0x17); pc++; continue; }
        if (mn === 'RAR') { out.push(0x1F); pc++; continue; }
        if (mn === 'CMA') { out.push(0x2F); pc++; continue; }
        if (mn === 'STC') { out.push(0x37); pc++; continue; }
        if (mn === 'CMC') { out.push(0x3F); pc++; continue; }
        if (mn === 'DAA') { out.push(0x27); pc++; continue; }
        // RET and conditional returns
        var retMap = { RET: 0xC9, RC: 0xD8, RNC: 0xD0, RZ: 0xC8, RNZ: 0xC0, RP: 0xF0, RM: 0xF8, RPE: 0xE8, RPO: 0xE0 };
        if (mn in retMap) { out.push(retMap[mn]); pc++; continue; }
        // RST
        if (mn === 'RST') {
          var rn = parts[idx] ? parts[idx].trim() : '';
          var rnVal = -1;
          if (/^\d+$/.test(rn)) rnVal = parseInt(rn);
          else { var rnv = parseNum(rn); if (rnv !== null) rnVal = rnv; }
          if (rnVal < 0 || rnVal > 7) { err(i, 'Invalid RST: ' + rn); continue; }
          out.push(0xC7 + rnVal * 8); pc++; continue;
        }
        // IN OUT
        if (mn === 'IN' || mn === 'OUT') {
          var pv = parseNum(parts[idx] || '');
          if (pv === null) { err(i, 'Invalid port'); continue; }
          out.push(mn === 'IN' ? 0xDB : 0xD3);
          out.push(pv & 0xFF); pc += 2; continue;
        }
        // ADI ACI SUI SBI ANI XRI ORI CPI
        var immMap = { ADI: 0xC6, ACI: 0xCE, SUI: 0xD6, SBI: 0xDE, ANI: 0xE6, XRI: 0xEE, ORI: 0xF6, CPI: 0xFE };
        if (mn in immMap) {
          var iv = parseNum(parts[idx] || '');
          if (iv === null) { err(i, 'Invalid immediate'); continue; }
          out.push(immMap[mn]); out.push(iv & 0xFF); pc += 2; continue;
        }
        // INR DCR
        if (mn === 'INR' || mn === 'DCR') {
          var rr = (parts[idx] || '').toUpperCase();
          if (!(rr in REG)) { err(i, 'Invalid register: ' + rr); continue; }
          out.push((mn === 'INR' ? 0x04 : 0x05) + REG[rr] * 8); pc++; continue;
        }
        // ADD ADC SUB SBB ANA XRA ORA CMP
        if (mn in REG_BASE) {
          var sr = (parts[idx] || '').toUpperCase();
          if (!(sr in REG)) { err(i, 'Invalid register: ' + sr); continue; }
          out.push(REG_BASE[mn] + REG[sr]); pc++; continue;
        }
        // MOV
        if (mn === 'MOV') {
          var d = REG[(parts[idx] || '').toUpperCase()], s = REG[(parts[idx + 1] || '').toUpperCase()];
          if (d === undefined || s === undefined) { err(i, 'Invalid MOV operands'); continue; }
          out.push(0x40 + d * 8 + s); pc++; continue;
        }
        // MVI
        if (mn === 'MVI') {
          var mr = (parts[idx] || '').toUpperCase();
          if (!(mr in REG)) { err(i, 'Invalid MVI register: ' + mr); continue; }
          var md = parseNum(parts[idx + 1] || '');
          if (md === null) { err(i, 'Invalid MVI data'); continue; }
          out.push(0x06 + REG[mr] * 8); out.push(md & 0xFF); pc += 2; continue;
        }
        // LXI
        if (mn === 'LXI') {
          var lrp = (parts[idx] || '').toUpperCase();
          if (!(lrp in RP_LXI)) { err(i, 'Invalid LXI pair: ' + lrp); continue; }
          var ld = parseNum(parts[idx + 1] || '');
          if (ld === null) {
            var lbl = (parts[idx + 1] || '').trim().toUpperCase();
            if (labels[lbl] !== undefined) ld = labels[lbl];
          }
          if (ld === null) { err(i, 'Invalid LXI data'); continue; }
          out.push(0x01 + RP_LXI[lrp] * 0x10);
          out.push(ld & 0xFF); out.push((ld >> 8) & 0xFF); pc += 3; continue;
        }
        // LDA STA LHLD SHLD
        var mem16 = { LDA: 0x3A, STA: 0x32, LHLD: 0x2A, SHLD: 0x22 };
        if (mn in mem16) {
          var av = parseNum(parts[idx] || '');
          if (av === null) {
            var lbl = (parts[idx] || '').trim().toUpperCase();
            if (labels[lbl] !== undefined) av = labels[lbl];
          }
          if (av === null) { err(i, 'Invalid address'); continue; }
          out.push(mem16[mn]); out.push(av & 0xFF); out.push((av >> 8) & 0xFF); pc += 3; continue;
        }
        // LDAX STAX
        if (mn === 'LDAX' || mn === 'STAX') {
          var lrp2 = (parts[idx] || '').toUpperCase();
          if (!(lrp2 in RP_PP)) { err(i, 'Invalid pair: ' + lrp2); continue; }
          out.push((mn === 'LDAX' ? 0x0A : 0x02) + RP_PP[lrp2] * 0x10); pc++; continue;
        }
        // INX DCX DAD
        var rp16 = { INX: 0x03, DCX: 0x0B, DAD: 0x09 };
        if (mn in rp16) {
          var rrp = (parts[idx] || '').toUpperCase();
          if (!(rrp in RP_LXI)) { err(i, 'Invalid pair: ' + rrp); continue; }
          out.push(rp16[mn] + RP_LXI[rrp] * 0x10); pc++; continue;
        }
        // PUSH POP
        if (mn === 'PUSH' || mn === 'POP') {
          var ppr = (parts[idx] || '').toUpperCase();
          if (!(ppr in RP_PP)) { err(i, 'Invalid pair: ' + ppr); continue; }
          out.push((mn === 'PUSH' ? 0xC5 : 0xC1) + RP_PP[ppr] * 0x10); pc++; continue;
        }
        // JMP and conditional jumps
        var jmpMap = { JMP: 0xC3, JC: 0xDA, JNC: 0xD2, JZ: 0xCA, JNZ: 0xC2, JP: 0xF2, JM: 0xFA, JPE: 0xEA, JPO: 0xE2 };
        if (mn in jmpMap) {
          var jv = parseNum(parts[idx] || '');
          if (jv === null && labels[parts[idx] ? parts[idx].trim().toUpperCase() : ''] !== undefined)
            jv = labels[parts[idx].trim().toUpperCase()];
          if (jv === null) { err(i, 'Invalid jump address'); continue; }
          out.push(jmpMap[mn]); out.push(jv & 0xFF); out.push((jv >> 8) & 0xFF); pc += 3; continue;
        }
        // CALL and conditional calls
        var callMap = { CALL: 0xCD, CC: 0xDC, CNC: 0xD4, CZ: 0xCC, CNZ: 0xC4, CP: 0xF4, CM: 0xFC, CPE: 0xEC, CPO: 0xE4 };
        if (mn in callMap) {
          var cv = parseNum(parts[idx] || '');
          if (cv === null && labels[parts[idx] ? parts[idx].trim().toUpperCase() : ''] !== undefined)
            cv = labels[parts[idx].trim().toUpperCase()];
          if (cv === null) { err(i, 'Invalid call address'); continue; }
          out.push(callMap[mn]); out.push(cv & 0xFF); out.push((cv >> 8) & 0xFF); pc += 3; continue;
        }
        err(i, 'Unknown instruction: ' + mn);
      }
      return out;
    }

    // Pass 1
    runPass();
    var pass1 = output.slice();
    // Pass 2 (labels now collected)
    errors = [];
    output = runPass();
    // Apply fixups
    for (var f = 0; f < fixups.length; f++) {
      var fx = fixups[f];
      var fv = parseNum(fx.tokens[0]);
      if (fv === null && labels[fx.tokens[0].toUpperCase()] !== undefined)
        fv = labels[fx.tokens[0].toUpperCase()];
      if (fv !== null) {
        if (fx.size === 1) output[fx.offset] = fv & 0xFF;
        else { output[fx.offset] = fv & 0xFF; output[fx.offset + 1] = (fv >> 8) & 0xFF; }
      }
    }
    return { code: new Uint8Array(output), errors: errors, labels: labels, entryPoint: org };
  }

  return { assemble: assemble };
})();
