/**
 * Intel 8085 Two-Pass Assembler
 * Supports all 8085 instructions, labels, directives, and number formats.
 */
window.Intel8085Assembler = (function () {
    "use strict";
    var REG = { B: 0, C: 1, D: 2, E: 3, H: 5, L: 6, M: 7, A: 7 };
    var RP = { B: 0, D: 1, H: 2, SP: 3 };
    var RP_PSW = { B: 0, D: 1, H: 2, PSW: 3 };
    var ALU = { ADD: 0x80, ADC: 0x88, SUB: 0x90, SBB: 0x98, ANA: 0xA0, XRA: 0xA8, ORA: 0xB0, CMP: 0xB8 };
    var IMM8 = { ADI: 0xC6, ACI: 0xCE, SUI: 0xD6, SBI: 0xDE, ANI: 0xE6, XRI: 0xEE, ORI: 0xF6, CPI: 0xFE };
    var MEM16 = { LDA: 0x3A, STA: 0x32, LHLD: 0x2A, SHLD: 0x22 };
    var CJMP = { JC: 0xDA, JNC: 0xD2, JZ: 0xCA, JNZ: 0xC2, JP: 0xF2, JM: 0xFA, JPE: 0xEA, JPO: 0xE2 };
    var CCALL = { CC: 0xDC, CNC: 0xD4, CZ: 0xCC, CNZ: 0xC4, CP: 0xF4, CM: 0xFC, CPE: 0xEC, CPO: 0xE4 };
    var CRET = { RC: 0xD8, RNC: 0xD0, RZ: 0xC8, RNZ: 0xC0, RP: 0xF0, RM: 0xF8, RPE: 0xE8, RPO: 0xE0 };
    var _mn = {};
    (function () { var n = ["NOP","HLT","EI","DI","XCHG","SPHL","PCHL","XTHL","RLC","RRC","RAL","RAR","CMA","STC","CMC","DAA","MOV","MVI","LXI","LDAX","STAX","LDA","STA","LHLD","SHLD","ADD","ADC","SUB","SBB","ANA","XRA","ORA","CMP","ADI","ACI","SUI","SBI","ANI","XRI","ORI","CPI","INR","DCR","INX","DCX","DAD","JMP","CALL","RET","RST","JC","JNC","JZ","JNZ","JP","JM","JPE","JPO","CC","CNC","CZ","CNZ","CP","CM","CPE","CPO","RC","RNC","RZ","RNZ","RP","RM","RPE","RPO","PUSH","POP","IN","OUT","ORG","EQU","END","DB","DW","B","C","D","E","H","L","M","A","SP","PSW"]; for (var i = 0; i < n.length; i++) _mn[n[i]] = true; })();
    function isMnemonic(t) { return _mn[t.toUpperCase()] === true; }
    function parseNumber(s) {
        if (s == null || s === "") return null; s = s.trim();
        if (/^0[bB][01]+$/.test(s)) return parseInt(s.substring(2), 2);
        if (/^[0-9a-fA-F][0-9a-fA-F]*[hH]$/.test(s)) return parseInt(s.substring(0, s.length - 1), 16);
        if (/^0[xX][0-9a-fA-F]+$/.test(s)) return parseInt(s, 16);
        if (/^[0-9]+$/.test(s)) return parseInt(s, 10);
        if (/^-[0-9]+$/.test(s)) return parseInt(s, 10);
        return null; }
    function cleanSource(source) {
        var lines = source.split(/\r?\n/); var result = [];
        for (var i = 0; i < lines.length; i++) { var line = lines[i];
            var ci = line.indexOf(";"); if (ci >= 0) line = line.substring(0, ci);
            ci = line.indexOf("//"); if (ci >= 0) line = line.substring(0, ci);
            result.push(line); } return result; }
    function tokenize(line) { return line.split(/[,\\s]+/).filter(function (t) { return t.length > 0; }); }
    function evalExpr(tokenStr, labels, pc) {
        var s = tokenStr.trim();
        s = s.replace(/\$/g, "(" + pc + ")");
        var ln = Object.keys(labels).sort(function (a, b) { return b.length - a.length; });
        for (var i = 0; i < ln.length; i++) {
            var re = new RegExp("\\\\b" + ln[i].replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, "\\\\$&") + "\\\\b", "g");
            s = s.replace(re, "(" + labels[ln[i]] + ")");
        }
        s = s.replace(/\b([0-9a-fA-F][0-9a-fA-F]*)[hH]\b/g, function(m,n){return "0x"+n;});
        s = s.replace(/\b0[bB]([01]+)\b/g, function(m,n){return "0b"+n;});
        s = s.replace(/\b0+(\d+)\b/g, function(m,d){return d;});
        try {
            if (/^[0-9a-fA-FxXbB\s+\-*/()]+$/.test(s)) {
                var val = Function("\\"use strict\\"; return (" + s + ")")();
                if (typeof val === "number" && isFinite(val)) return val | 0;
            }
        } catch(e){} return NaN; }
    function instrSize(tokens, pc, labels) {
        var op = tokens[0].toUpperCase();
        if (op === "ORG" || op === "EQU" || op === "END") return 0;
        if (op === "DB") { var t=0; for(var i=1;i<tokens.length;i++){if(tokens[i].charAt(0)==="\"")t+=tokens[i].length-2;else t++;} return t; }
        if (op === "DW") return (tokens.length - 1) * 2;
        if (op === "NOP" || op === "MOV" || op === "INR" || op === "DCR") return 1;
        if (op === "MVI") return 2;
        if (op === "LXI") return 3;
        if (op === "LDAX" || op === "STAX") return 1;
        if (MEM16[op]) return 3;
        if (op === "XCHG" || op === "SPHL" || op === "PCHL" || op === "XTHL") return 1;
        if (ALU[op]) return 1;
        if (IMM8[op]) return 2;
        if (op === "INX" || op === "DCX" || op === "DAD") return 1;
        if (op === "DAA" || op === "CMA" || op === "STC" || op === "CMC") return 1;
        if (op === "RLC" || op === "RRC" || op === "RAL" || op === "RAR") return 1;
        if (op === "JMP" || CJMP[op]) return 3;
        if (op === "CALL" || CCALL[op]) return 3;
        if (op === "RET" || CRET[op]) return 1;
        if (op === "RST") return 1;
        if (op === "PUSH" || op === "POP") return 1;
        if (op === "EI" || op === "DI" || op === "HLT") return 1;
        if (op === "IN" || op === "OUT") return 2;
        return 0; }
    function parseLine(tokens) {
        var label = null;
        if (tokens.length === 0) return { label: null, op: null, tokens: [] };
        var first = tokens[0];
        if (first.charAt(first.length - 1) === ":") {
            label = first.substring(0, first.length - 1).toUpperCase(); tokens = tokens.slice(1);
        } else if (tokens.length > 1 && !isMnemonic(first) && isMnemonic(tokens[1])) {
            label = first.toUpperCase(); tokens = tokens.slice(1); }
        if (tokens.length === 0) return { label: label, op: null, tokens: [] };
        return { label: label, op: tokens[0].toUpperCase(), tokens: tokens }; }
    function pass1(lines) {
        var labels = {}, errors = [], pc = 0;
        for (var li = 0; li < lines.length; li++) {
            var raw = lines[li].trim(); if (raw === "") continue;
            var tk = tokenize(raw); if (tk.length === 0) continue;
            var p = parseLine(tk); var label = p.label, op = p.op; tk = p.tokens;
            if (label) { if (labels.hasOwnProperty(label)) errors.push({line:li+1,message:"Duplicate label '" + label + "'"}); else labels[label] = pc; }
            if (!op) continue;
            if (op === "ORG") { var a = evalExpr(tk[1], labels, pc); if (!isNaN(a)) pc = a & 0xFFFF; continue; }
            if (op === "EQU") { if (!label) errors.push({line:li+1,message:"EQU without label"}); else { var v = evalExpr(tk[1], labels, pc); if (isNaN(v)) errors.push({line:li+1,message:"Invalid EQU"}); else labels[label] = v & 0xFFFF; } continue; }
            if (op === "END") break;
            var size = instrSize(tk, pc, labels);
            if (size === 0) errors.push({line:li+1,message:"Unknown instruction '" + op + "'"});
            pc += size; }
        return { labels: labels, errors: errors }; }
    function pass2(lines, labels, maxAddr) {
        var code = new Uint8Array(maxAddr + 1), errors = [], pc = 0, entryPoint = 0x0000;
        function emit(b) { if (pc >= 0 && pc < code.length) code[pc] = b & 0xFF; pc++; }
        function emit16(v) { emit(v & 0xFF); emit((v >> 8) & 0xFF); }
        for (var li = 0; li < lines.length; li++) {
            var raw = lines[li].trim(); if (raw === "") continue;
            var tk = tokenize(raw); if (tk.length === 0) continue;
            var p = parseLine(tk); var op = p.op; tk = p.tokens; if (!op) continue;
            if (op === "ORG") { var a = evalExpr(tk[1], labels, pc); if (!isNaN(a)) pc = a & 0xFFFF; continue; }
            if (op === "EQU") continue;
            if (op === "END") { if (tk.length > 1) { var ep = evalExpr(tk[1], labels, pc); if (!isNaN(ep)) entryPoint = ep & 0xFFFF; } break; }
            if (op === "DB") { for (var i=1;i<tk.length;i++){var t=tk[i];if(t.charAt(0)==="\x22"){var s=t.substring(1,t.length-1);for(var ci=0;ci<s.length;ci++)emit(s.charCodeAt(ci));}else{var v=evalExpr(t,labels,pc);if(isNaN(v)){errors.push({line:li+1,message:"Invalid DB value"});emit(0);}else emit(v&0xFF);}} continue; }
            if (op === "DW") { for (var i=1;i<tk.length;i++){var v=evalExpr(tk[i],labels,pc);if(isNaN(v)){errors.push({line:li+1,message:"Invalid DW value"});emit16(0);}else emit16(v&0xFFFF);} continue; }
            if (op==="NOP"){emit(0x00);continue;} if (op==="HLT"){emit(0x76);continue;}
            if (op==="EI"){emit(0xFB);continue;} if (op==="DI"){emit(0xF3);continue;}
            if (op==="XCHG"){emit(0xEB);continue;} if (op==="SPHL"){emit(0xF9);continue;}
            if (op==="PCHL"){emit(0xE9);continue;} if (op==="XTHL"){emit(0xE3);continue;}
            if (op==="RLC"){emit(0x07);continue;} if (op==="RRC"){emit(0x0F);continue;}
            if (op==="RAL"){emit(0x17);continue;} if (op==="RAR"){emit(0x1F);continue;}
            if (op==="CMA"){emit(0x2F);continue;} if (op==="STC"){emit(0x37);continue;}
            if (op==="CMC"){emit(0x3F);continue;} if (op==="DAA"){emit(0x27);continue;}
            if (op==="RET"){emit(0xC9);continue;}
            if (CRET[op]!=null){emit(CRET[op]);continue;}
            if (op==="RST"){var n=parseNumber(tk[1]);if(n==null||n<0||n>7){errors.push({line:li+1,message:"Invalid RST"});emit(0xC7);}else emit(0xC7+n*8);continue;}
            if (op==="PUSH"||op==="POP"){var rp=(tk[1]||"").toUpperCase(),rv=RP_PSW[rp];if(rv==null){errors.push({line:li+1,message:"Invalid pair for "+op});emit(op==="PUSH"?0xC5:0xC1);}else emit((op==="PUSH"?0xC5:0xC1)+rv*0x10);continue;}
            if (op==="MOV"){var pt=tk.slice(1).join("").toUpperCase().split(",");if(pt.length<2)pt=[tk[1]||"",tk[2]||""];var dst=pt[0].trim(),src=pt[1].trim();var dv=REG[dst],sv=REG[src];if(dv==null||sv==null){errors.push({line:li+1,message:"Invalid MOV"});emit(0x40);}else emit(0x40+dv*8+sv);continue;}
            if (op==="MVI"){var rg=(tk[1]||"").toUpperCase().split(",")[0].trim(),rv=REG[rg];if(rv==null){errors.push({line:li+1,message:"Invalid MVI register"});emit(0x06);emit(0);}else{emit(0x06+rv*8);var d=evalExpr(tk[2]||(tk[1]||"").split(",")[1]||"0",labels,pc);emit(isNaN(d)?0:(d&0xFF));}continue;}
            if (op==="LXI"){var ra=(tk[1]||"").toUpperCase().split(",")[0].trim(),rp=RP[ra];if(rp==null){errors.push({line:li+1,message:"Invalid LXI pair"});emit(0x01);emit(0);emit(0);}else{emit(0x01+rp*0x10);var ds=((tk[1]||"").split(",")[1]||tk[2]||"0").trim();var dv=evalExpr(ds,labels,pc);if(isNaN(dv)){errors.push({line:li+1,message:"Invalid LXI value"});emit(0);emit(0);}else emit16(dv&0xFFFF);}continue;}
            if (op==="LDAX"||op==="STAX"){var rp=(tk[1]||"").toUpperCase(),rv=RP[rp];if(rv==null||rp==="SP"){errors.push({line:li+1,message:"Invalid pair for "+op});emit(op==="LDAX"?0x0A:0x02);}else emit((op==="LDAX"?0x0A:0x02)+rv*0x10);continue;}
            if (MEM16[op]){emit(MEM16[op]);var addr=evalExpr(tk[1],labels,pc);if(isNaN(addr)){errors.push({line:li+1,message:"Invalid address for "+op});emit(0);emit(0);}else emit16(addr&0xFFFF);continue;}
            if (ALU[op]){var rg=(tk[1]||"").toUpperCase().split(",")[0].trim(),rv=REG[rg];if(rv==null){errors.push({line:li+1,message:"Invalid ALU register"});emit(ALU[op]);}else emit(ALU[op]+rv);continue;}
            if (IMM8[op]){emit(IMM8[op]);var data=evalExpr(tk[1],labels,pc);if(isNaN(data)){errors.push({line:li+1,message:"Invalid immediate"});emit(0);}else emit(data&0xFF);continue;}
            if (op==="INR"||op==="DCR"){var rg=(tk[1]||"").toUpperCase().trim(),rv=REG[rg];if(rv==null){errors.push({line:li+1,message:"Invalid register"});emit(op==="INR"?0x04:0x05);}else emit((op==="INR"?0x04:0x05)+rv*8);continue;}
            if (op==="INX"||op==="DCX"||op==="DAD"){var rp=(tk[1]||"").toUpperCase().trim(),rv=RP[rp];if(rv==null){errors.push({line:li+1,message:"Invalid pair for "+op});emit(op==="INX"?0x03:op==="DCX"?0x0B:0x09);}else{var b=op==="INX"?0x03:op==="DCX"?0x0B:0x09;emit(b+rv*0x10);}continue;}
            if (op==="JMP"||op==="CALL"){emit(op==="JMP"?0xC3:0xCD);var addr=evalExpr(tk[1],labels,pc);if(isNaN(addr)){errors.push({line:li+1,message:"Invalid "+op+" address"});emit(0);emit(0);}else emit16(addr&0xFFFF);continue;}
            if (CJMP[op]){emit(CJMP[op]);var addr=evalExpr(tk[1],labels,pc);if(isNaN(addr)){errors.push({line:li+1,message:"Invalid "+op+" address"});emit(0);emit(0);}else emit16(addr&0xFFFF);continue;}
            if (CCALL[op]){emit(CCALL[op]);var addr=evalExpr(tk[1],labels,pc);if(isNaN(addr)){errors.push({line:li+1,message:"Invalid "+op+" address"});emit(0);emit(0);}else emit16(addr&0xFFFF);continue;}
            if (op==="IN"||op==="OUT"){emit(op==="IN"?0xDB:0xD3);var port=evalExpr(tk[1],labels,pc);if(isNaN(port)){errors.push({line:li+1,message:"Invalid port"});emit(0);}else emit(port&0xFF);continue;}
            errors.push({line:li+1,message:"Unknown instruction: "+op});
        }
        return { code: code, errors: errors, entryPoint: entryPoint }; }
    function assemble(source) {
        var lines = cleanSource(source);
        var p1 = pass1(lines);
        var labels = p1.labels;
        var errors = p1.errors.slice();
        var maxAddr = 0, pc = 0;
        for (var li = 0; li < lines.length; li++) {
            var raw = lines[li].trim(); if (raw === "") continue;
            var tk = tokenize(raw); if (tk.length === 0) continue;
            var p = parseLine(tk); var op = p.op; tk = p.tokens; if (!op) continue;
            if (op === "ORG") { var a = evalExpr(tk[1], labels, pc); if (!isNaN(a)) pc = a & 0xFFFF; continue; }
            if (op === "EQU" || op === "END") continue;
            var size = instrSize(tk, pc, labels);
            if (pc + size > maxAddr) maxAddr = pc + size; pc += size; }
        if (maxAddr === 0) maxAddr = 0x0100;
        var p2 = pass2(lines, labels, maxAddr);
        errors = errors.concat(p2.errors);
        var usedEnd = p2.code.length;
        for (var i = p2.code.length - 1; i >= 0; i--) { if (p2.code[i] !== 0) { usedEnd = i + 1; break; } }
        var trimmed = new Uint8Array(usedEnd);
        for (var i = 0; i < usedEnd; i++) trimmed[i] = p2.code[i];
        return { code: trimmed, errors: errors, labels: labels, entryPoint: p2.entryPoint };
    }
    return { assemble: assemble };
})();
