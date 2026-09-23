'use strict';
window.Intel8051C = (function () {

var SFRS = {
  P0:0x80, SP:0x81, DPL:0x82, DPH:0x83, PCON:0x87,
  TCON:0x88, TMOD:0x89, TL0:0x8A, TL1:0x8B, TH0:0x8C, TH1:0x8D,
  P1:0x90, SCON:0x98, SBUF:0x99, P2:0xA0, IE:0xA8, P3:0xB0, IP:0xB8,
  PSW:0xD0, ACC:0xE0, B:0xF0
};
var BIT_SFR = {
  IT0:0x88, IE0:0x89, IT1:0x8A, IE1:0x8B,
  TR0:0x8C, TF0:0x8D, TR1:0x8E, TF1:0x8F,
  RI:0x98, TI:0x99, RB8:0x9A, TB8:0x9B,
  REN:0x9C, SM2:0x9D, SM1:0x9E, SM0:0x9F,
  EX0:0xA8, ET0:0xA9, EX1:0xAA, ET1:0xAB, ES:0xAC, EA:0xAF,
  PX0:0xB8, PT0:0xB9, PX1:0xBA, PT1:0xBB, PS:0xBC,
  RXD:0xB0, TXD:0xB1, INT0:0xB2, INT1:0xB3, T0:0xB4, T1:0xB5, WR:0xB6, RD:0xB7,
  P:0xD0, F1:0xD1, OV:0xD2, RS0:0xD3, RS1:0xD4, F0:0xD5, AC:0xD6, CY:0xD7
};
var VECTORS = [0x0003, 0x000B, 0x0013, 0x001B, 0x0023];
var KEYWORDS = ('if else while for do return break continue switch case default ' +
  'void char int long short unsigned signed bit sbit sfr using reentrant static extern ' +
  'interrupt priority').split(' ');

function err(line, msg) { var e = new Error(msg); e.line = line || 0; return e; }
function hex4(v) {
  var s = (v >>> 0).toString(16).toUpperCase();
  while (s.length < 4) s = '0' + s;
  return s + 'H';
}

/* ── Preprocessor ── */
function preprocess(src) {
  var defines = {};
  var lines = src.split('\n');
  var out = [];
  var i;
  function expand(s) {
    for (var k in defines) {
      s = s.replace(new RegExp('\\b' + k + '\\b', 'g'), defines[k]);
    }
    return s;
  }
  for (i = 0; i < lines.length; i++) {
    var line = lines[i];
    var m = line.match(/^\s*#\s*define\s+(\w+)\s+(.*)$/);
    if (m) { defines[m[1]] = expand(m[2].trim()); continue; }
    if (/^\s*#\s*include\b/.test(line)) continue;
    if (/^\s*#\s*(if|ifdef|ifndef|else|elif|endif|undef|pragma|error|line)\b/.test(line)) continue;
    out.push(expand(line));
  }
  return out.join('\n');
}
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/* ── Lexer ── */
function lex(src) {
  var toks = [];
  var i = 0, line = 1, n = src.length;
  function push(type, value) { toks.push({ type: type, value: value, line: line }); }
  while (i < n) {
    var c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
      i += 2; continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      var s = i;
      while (i < n && /[a-zA-Z0-9_]/.test(src[i])) i++;
      var w = src.slice(s, i);
      push(KEYWORDS.indexOf(w) >= 0 ? 'kw' : 'id', w);
      continue;
    }
    if (/[0-9]/.test(c)) {
      var st = i;
      if (c === '0' && (src[i+1] === 'x' || src[i+1] === 'X')) {
        i += 2;
        while (i < n && /[0-9a-fA-F]/.test(src[i])) i++;
        push('num', parseInt(src.slice(st, i), 16));
      } else if (c === '0' && (src[i+1] === 'b' || src[i+1] === 'B')) {
        i += 2;
        while (i < n && /[01]/.test(src[i])) i++;
        push('num', parseInt(src.slice(st + 2, i), 2));
      } else {
        while (i < n && /[0-9]/.test(src[i])) i++;
        if (src[i] === 'H' || src[i] === 'h') {
          var hs = src.slice(st, i); i++;
          push('num', parseInt(hs, 16));
        } else push('num', parseInt(src.slice(st, i), 10));
      }
      continue;
    }
    var three = src.substr(i, 3);
    if (three === '<<=' || three === '>>=') { push('op', three); i += 3; continue; }
    var two = src.substr(i, 2);
    if (['==','!=','<=','>=','&&','||','<<','>>','++','--','+=','-=','*=','/=','%=','&=','|=','^='].indexOf(two) >= 0) {
      push('op', two); i += 2; continue;
    }
    if ('+-*/%=<>!&|^~?:;,.()[]{}'.indexOf(c) >= 0) { push('op', c); i++; continue; }
    throw err(line, 'Unexpected character: ' + c);
  }
  push('eof', '');
  return toks;
}

/* ── Parser ── */
function parse(toks) {
  var pos = 0;
  function peek() { return toks[pos]; }
  function next() { return toks[pos++]; }
  function at(type, value) {
    var t = toks[pos];
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }
  function eat(type, value) {
    if (!at(type, value)) throw err(peek().line, 'Expected ' + (value || type) + ' got ' + peek().value);
    return next();
  }
  function parseType() {
    var t = peek();
    if (t.type !== 'kw') throw err(t.line, 'Expected type');
    if (['void','char','int','long','short','unsigned','signed','bit','sbit','sfr'].indexOf(t.value) < 0)
      throw err(t.line, 'Expected type');
    var parts = [next().value];
    if (parts[0] === 'unsigned' || parts[0] === 'signed') {
      if (at('kw') && ['int','char','long','short'].indexOf(peek().value) >= 0) parts.push(next().value);
    } else if (at('kw') && ['int','char','long','short'].indexOf(peek().value) >= 0) {
      parts.push(next().value);
    }
    return parts.join(' ');
  }
  function isTypeStart() {
    var t = peek();
    return t.type === 'kw' && ['void','char','int','long','short','unsigned','signed','bit','sbit','sfr'].indexOf(t.value) >= 0;
  }

  function parsePrimary() {
    var t = peek();
    if (t.type === 'num') { next(); return { k: 'num', v: t.value, line: t.line }; }
    if (t.type === 'id') { next(); return { k: 'id', name: t.value, line: t.line }; }
    if (t.type === 'op' && t.value === '(') {
      next();
      var e = parseExpr();
      eat('op', ')');
      return e;
    }
    if (t.type === 'op' && (t.value === '~' || t.value === '!' || t.value === '-' || t.value === '+')) {
      next();
      var inner = parsePrimary();
      if (t.value === '+') return inner;
      return { k: 'un', op: t.value, e: inner, line: t.line };
    }
    if (t.type === 'op' && (t.value === '++' || t.value === '--')) {
      next();
      return { k: 'pre' + (t.value === '++' ? 'inc' : 'dec'), e: parsePrimary(), line: t.line };
    }
    throw err(t.line, 'Unexpected token ' + t.value);
  }

  function parsePostfix() {
    var e = parsePrimary();
    for (;;) {
      if (at('op', '++')) { next(); e = { k: 'postinc', e: e, line: e.line }; }
      else if (at('op', '--')) { next(); e = { k: 'postdec', e: e, line: e.line }; }
      else if (at('op', '[')) {
        var ln = peek().line; next();
        var idx = parseExpr();
        eat('op', ']');
        e = { k: 'index', base: e, idx: idx, line: ln };
      } else if (at('op', '(')) {
        var ln3 = peek().line; next();
        var args = [];
        if (!at('op', ')')) {
          args.push(parseExpr());
          while (at('op', ',')) { next(); args.push(parseExpr()); }
        }
        eat('op', ')');
        e = { k: 'call', fn: e, args: args, line: ln3 };
      } else break;
    }
    return e;
  }

  var PREC = { '||':1, '&&':2, '|':3, '^':4, '&':5,
    '==':6, '!=':6, '<':7, '>':7, '<=':7, '>=':7,
    '<<':8, '>>':8, '+':9, '-':9, '*':10, '/':10, '%':10 };

  function parseBinary(minPrec) {
    var left = parsePostfix();
    for (;;) {
      var t = peek();
      if (t.type !== 'op' || !(t.value in PREC)) break;
      var p = PREC[t.value];
      if (p < minPrec) break;
      next();
      var right = parseBinary(p + 1);
      left = { k: 'bin', op: t.value, l: left, r: right, line: t.line };
    }
    return left;
  }

  function parseAssign() {
    var left = parseBinary(1);
    var t = peek();
    if (t.type === 'op' && ['=','+=','-=','*=','/=','%=','&=','|=','^=','<<=','>>='].indexOf(t.value) >= 0) {
      next();
      var right = parseAssign();
      return { k: 'assign', op: t.value, l: left, r: right, line: t.line };
    }
    return left;
  }
  function parseExpr() {
    var c = parseAssign();
    if (at('op', '?')) {
      var ln = peek().line; next();
      var a = parseExpr();
      eat('op', ':');
      var b = parseExpr();
      return { k: 'cond', c: c, a: a, b: b, line: ln };
    }
    return c;
  }

  function parseBlock() {
    eat('op', '{');
    var stmts = [];
    while (!at('op', '}')) {
      if (at('eof')) throw err(peek().line, 'Unclosed block');
      stmts.push(parseStmt());
    }
    eat('op', '}');
    return { k: 'block', body: stmts };
  }

  function parseStmt() {
    var t = peek();
    if (t.type === 'op' && t.value === '{') return parseBlock();
    if (t.type === 'op' && t.value === ';') { next(); return { k: 'empty' }; }
    if (t.type === 'kw') {
      if (t.value === 'if') {
        next(); eat('op', '(');
        var c = parseExpr(); eat('op', ')');
        var th = parseStmt();
        var el = null;
        if (at('kw', 'else')) { next(); el = parseStmt(); }
        return { k: 'if', c: c, th: th, el: el, line: t.line };
      }
      if (t.value === 'while') {
        next(); eat('op', '(');
        var c2 = parseExpr(); eat('op', ')');
        return { k: 'while', c: c2, body: parseStmt(), line: t.line };
      }
      if (t.value === 'do') {
        next();
        var body = parseStmt();
        eat('kw', 'while'); eat('op', '(');
        var c3 = parseExpr(); eat('op', ')'); eat('op', ';');
        return { k: 'do', body: body, c: c3, line: t.line };
      }
      if (t.value === 'for') {
        next(); eat('op', '(');
        var init = null;
        if (!at('op', ';')) init = parseExpr();
        eat('op', ';');
        var cond = null;
        if (!at('op', ';')) cond = parseExpr();
        eat('op', ';');
        var incr = null;
        if (!at('op', ')')) incr = parseExpr();
        eat('op', ')');
        return { k: 'for', init: init, cond: cond, incr: incr, body: parseStmt(), line: t.line };
      }
      if (t.value === 'return') {
        next();
        var e = null;
        if (!at('op', ';')) e = parseExpr();
        eat('op', ';');
        return { k: 'return', e: e, line: t.line };
      }
      if (t.value === 'break') { next(); eat('op', ';'); return { k: 'break', line: t.line }; }
      if (t.value === 'continue') { next(); eat('op', ';'); return { k: 'continue', line: t.line }; }
      if (isTypeStart()) return parseDeclStmt();
    }
    var e2 = parseExpr();
    eat('op', ';');
    return { k: 'expr', e: e2, line: t.line };
  }

  function parseDeclStmt() {
    var line = peek().line;
    var type = parseType();
    var decls = [];
    for (;;) {
      var name = eat('id').value;
      var arr = null;
      if (at('op', '[')) { next(); arr = parseExpr(); eat('op', ']'); }
      var init = null;
      if (at('op', '=')) { next(); init = parseExpr(); }
      decls.push({ name: name, arr: arr, init: init });
      if (at('op', ',')) { next(); continue; }
      break;
    }
    eat('op', ';');
    return { k: 'decl', type: type, decls: decls, line: line };
  }

  function parseSbitSfr() {
    var t = next();
    var name = eat('id').value;
    eat('op', '=');
    var val = parseExpr();
    eat('op', ';');
    return { k: t.value, name: name, val: val, line: t.line };
  }

  function parseTop() {
    var items = [];
    while (!at('eof')) {
      var t = peek();
      if (t.type === 'op' && t.value === ';') { next(); continue; }
      if (t.type === 'kw' && (t.value === 'sbit' || t.value === 'sfr')) {
        items.push(parseSbitSfr());
        continue;
      }
      if (t.type === 'kw' && t.value === 'typedef') {
        while (!at('eof') && !at('op', ';')) next();
        next(); continue;
      }
      if (t.type === 'kw' && t.value === 'extern') { next(); continue; }
      var type = parseType();
      if (!at('id')) throw err(peek().line, 'Expected identifier');
      var name = next().value;
      if (at('op', '(')) {
        next();
        var params = [];
        if (!at('op', ')')) {
          if (at('kw', 'void') && toks[pos + 1] && toks[pos + 1].value === ')') {
            next();
          } else {
            for (;;) {
              if (at('op', ')')) break;
              var pt = parseType();
              var pn = null;
              if (at('id')) pn = next().value;
              params.push({ type: pt, name: pn });
              if (at('op', ',')) { next(); continue; }
              break;
            }
          }
        }
        eat('op', ')');
        var interrupt = null, priority = 0, reentrant = false, using = null;
        while (at('kw', 'interrupt') || at('kw', 'priority') || at('kw', 'reentrant') || at('kw', 'using')) {
          if (at('kw', 'interrupt')) { next(); interrupt = parseExpr(); }
          else if (at('kw', 'priority')) {
            next();
            if (at('op', '(')) { next(); priority = parseExpr(); eat('op', ')'); }
          } else if (at('kw', 'reentrant')) { next(); reentrant = true; }
          else if (at('kw', 'using')) {
            next();
            if (at('op', '(')) { next(); using = parseExpr(); eat('op', ')'); }
          }
        }
        var body = parseBlock();
        items.push({ k: 'func', type: type, name: name, params: params, body: body,
          interrupt: interrupt, priority: priority, reentrant: reentrant, using: using, line: t.line });
        continue;
      }
      var decls = [];
      var first = { name: name, arr: null, init: null };
      if (at('op', '[')) { next(); first.arr = parseExpr(); eat('op', ']'); }
      if (at('op', '=')) { next(); first.init = parseExpr(); }
      decls.push(first);
      while (at('op', ',')) {
        next();
        var dn = eat('id').value;
        var da = null, di = null;
        if (at('op', '[')) { next(); da = parseExpr(); eat('op', ']'); }
        if (at('op', '=')) { next(); di = parseExpr(); }
        decls.push({ name: dn, arr: da, init: di });
      }
      eat('op', ';');
      items.push({ k: 'global', type: type, decls: decls, line: t.line });
    }
    return items;
  }

  return parseTop();
}

/* ── Codegen ── */
function codegen(ast) {
  var lines = [];
  var labels = 0;
  var lblStack = [];
  var frameBase = 0x30;
  var bitAlloc = 0x20;
  var globals = {};
  var sbits = {};
  var sfrs = {};
  var funcs = {};
  var curFn = null;
  var locals = null;

  for (var sn in SFRS) sfrs[sn] = SFRS[sn];
  for (var bn in BIT_SFR) sbits[bn] = BIT_SFR[bn];

  function L(pfx) { return '_' + (pfx || 'L') + (labels++); }
  function emit(s) { lines.push(s); }

  function isIntType(t) { return /\b(int|long|short)\b/.test(t || '') && !/\bchar\b/.test(t || ''); }

  function allocLocal(name, type, size, isBit) {
    if (isBit) {
      if (bitAlloc > 0x2F) throw err(0, 'Out of bit-addressable RAM');
      var ba = bitAlloc++;
      locals[name] = { bit: ba, type: 'bit', isBit: true };
      return locals[name];
    }
    var sz = size || (isIntType(type) ? 2 : 1);
    var addr = frameBase;
    frameBase += sz;
    if (frameBase > 0x7F) throw err(0, 'Out of internal RAM for locals');
    locals[name] = { addr: addr, type: type, isBit: false, size: sz };
    return locals[name];
  }

  function lookup(name) {
    if (locals && locals[name]) return locals[name];
    if (globals[name]) return globals[name];
    if (sbits[name] !== undefined) return { bit: sbits[name], isBit: true, name: name };
    if (sfrs[name] !== undefined) return { addr: sfrs[name], isBit: false, name: name, size: 1, type: 'unsigned char', isSfr: true };
    return null;
  }

  function genExpr(e, wantInt) {
    switch (e.k) {
      case 'num':
        if (wantInt || e.v > 255) {
          emit('  MOV DPH, #' + ((e.v >> 8) & 0xFF));
          emit('  MOV DPL, #' + (e.v & 0xFF));
        } else emit('  MOV A, #' + (e.v & 0xFF));
        return;
      case 'id': {
        var sym = lookup(e.name);
        if (!sym) throw err(e.line, 'Unknown identifier ' + e.name);
        if (sym.isBit) {
          emit('  MOV A, #0');
          emit('  MOV C, ' + sym.bit);
          emit('  RLC A');
          return;
        }
        if (isIntType(sym.type) || sym.size === 2) {
          emit('  MOV DPL, ' + sym.addr);
          emit('  MOV DPH, ' + (sym.addr + 1));
        } else emit('  MOV A, ' + sym.addr);
        return;
      }
      case 'index': {
        if (e.base.k !== 'id') throw err(e.line, 'Only simple arrays supported');
        var bs = lookup(e.base.name);
        if (!bs) throw err(e.line, 'Unknown array ' + e.base.name);
        genExpr(e.idx, true);
        emit('  MOV R2, DPL');
        emit('  MOV A, #' + (bs.addr & 0xFF));
        emit('  ADD A, R2');
        emit('  MOV R0, A');
        emit('  MOV A, @R0');
        return;
      }
      case 'call': return genCall(e);
      case 'assign': return genAssign(e, wantInt);
      case 'cond': {
        var l1 = L('C'), l2 = L('C');
        genCondJmp(e.c, false, l1);
        genExpr(e.a, wantInt);
        emit('  SJMP ' + l2);
        emit(l1 + ':');
        genExpr(e.b, wantInt);
        emit(l2 + ':');
        return;
      }
      case 'bin': return genBin(e, wantInt);
      case 'un': {
        if (e.op === '!') {
          var l1 = L('N'), l2 = L('N');
          genExpr(e.e, false);
          emit('  JZ ' + l1);
          emit('  MOV A, #0');
          emit('  SJMP ' + l2);
          emit(l1 + ':');
          emit('  MOV A, #1');
          emit(l2 + ':');
          return;
        }
        if (e.op === '-') {
          genExpr(e.e, false);
          emit('  CPL A');
          emit('  ADD A, #1');
          if (wantInt) {
            var lz = L('SZ'), l2 = L('SZ');
            emit('  MOV DPL, A');
            emit('  JNB ACC.7, ' + lz);
            emit('  MOV DPH, #0FFH');
            emit('  SJMP ' + l2);
            emit(lz + ':');
            emit('  MOV DPH, #00H');
            emit(l2 + ':');
          }
          return;
        }
        if (e.op === '~') {
          genExpr(e.e, wantInt);
          if (wantInt) {
            emit('  MOV A, DPL');
            emit('  CPL A');
            emit('  MOV DPL, A');
            emit('  MOV A, DPH');
            emit('  CPL A');
            emit('  MOV DPH, A');
          } else emit('  CPL A');
          return;
        }
        throw err(e.line, 'Unsupported unary ' + e.op);
      }
      case 'postinc': case 'postdec': case 'preinc': case 'predec': {
        var isPre = e.k === 'preinc' || e.k === 'predec';
        var isInc = e.k === 'preinc' || e.k === 'postinc';
        var sym = resolveLvalue(e.e);
        var wi = !sym.ind && (isIntType(sym.type) || sym.size === 2);
        if (wi) {
          loadVarInt(sym);
          emit('  MOV R4, DPL');
          emit('  MOV R5, DPH');
          emit('  MOV A, DPL');
          if (isInc) {
            emit('  ADD A, #1');
            emit('  MOV DPL, A');
            emit('  MOV A, DPH');
            emit('  ADDC A, #0');
            emit('  MOV DPH, A');
          } else {
            emit('  CLR C');
            emit('  SUBB A, #1');
            emit('  MOV DPL, A');
            emit('  MOV A, DPH');
            emit('  SUBB A, #0');
            emit('  MOV DPH, A');
          }
          storeVarInt(sym);
          if (!isPre) {
            emit('  MOV DPL, R4');
            emit('  MOV DPH, R5');
          }
          return;
        }
        loadVar8(sym);
        if (!isPre) emit('  MOV R3, A');
        emit(isInc ? '  INC A' : '  DEC A');
        storeVar8(sym);
        if (!isPre) emit('  MOV A, R3');
        return;
      }
      default:
        throw err(e.line, 'Cannot generate expression: ' + e.k);
    }
  }

  function genCall(e) {
    var name = e.fn.k === 'id' ? e.fn.name : null;
    if (!name) throw err(e.line, 'Only direct function calls supported');
    if (e.args.length > 4) throw err(e.line, 'Too many arguments (max 4)');
    var fn = funcs[name];
    if (!fn) throw err(e.line, 'Unknown function ' + name);
    for (var i = 0; i < e.args.length; i++) {
      var pt = fn.params[i] ? fn.params[i].type : 'unsigned char';
      var want = isIntType(pt);
      genExpr(e.args[i], want);
      var pa = fn.paramAddrs[i];
      if (want) {
        emit('  MOV ' + pa + ', DPL');
        emit('  MOV ' + (pa + 1) + ', DPH');
      } else emit('  MOV ' + pa + ', A');
    }
    emit('  ACALL ' + fn.label);
  }

  function resolveLvalue(e) {
    if (e.k === 'id') {
      var sym = lookup(e.name);
      if (!sym) throw err(e.line, 'Unknown identifier ' + e.name);
      if (sym.isBit || sym.isSfr) return sym;
      if (sym.isBit) return sym;
      return sym;
    }
    if (e.k === 'index') {
      if (e.base.k !== 'id') throw err(e.line, 'Bad index base');
      var bs = lookup(e.base.name);
      if (!bs) throw err(e.line, 'Unknown array');
      genExpr(e.idx, true);
      emit('  MOV R2, DPL');
      emit('  MOV A, #' + (bs.addr & 0xFF));
      emit('  ADD A, R2');
      emit('  MOV R0, A');
      return { ind: true, base: bs };
    }
    throw err(e.line, 'Not an assignable expression');
  }

  function loadVar8(sym) {
    if (sym.ind) { emit('  MOV A, @R0'); return; }
    if (sym.isBit) {
      emit('  MOV A, #0');
      emit('  MOV C, ' + sym.bit);
      emit('  RLC A');
      return;
    }
    emit('  MOV A, ' + sym.addr);
  }

  function storeVar8(sym) {
    if (sym.ind) { emit('  MOV @R0, A'); return; }
    if (sym.isBit) {
      emit('  ANL A, #1');
      var l0 = L('B'), l1 = L('B');
      emit('  JZ ' + l0);
      emit('  SETB ' + sym.bit);
      emit('  SJMP ' + l1);
      emit(l0 + ':');
      emit('  CLR ' + sym.bit);
      emit(l1 + ':');
      return;
    }
    emit('  MOV ' + sym.addr + ', A');
  }

  function loadVarInt(sym) {
    emit('  MOV DPL, ' + sym.addr);
    emit('  MOV DPH, ' + (sym.addr + 1));
  }
  function storeVarInt(sym) {
    emit('  MOV ' + sym.addr + ', DPL');
    emit('  MOV ' + (sym.addr + 1) + ', DPH');
  }

  function genAssign(e, wantInt) {
    var op = e.op;
    var sym = resolveLvalue(e.l);
    var isIntV = !sym.ind && !sym.isBit && (isIntType(sym.type) || sym.size === 2);
    var useInt = wantInt || isIntV;

    if (op === '=') {
      genExpr(e.r, useInt);
      if (isIntV) storeVarInt(sym);
      else storeVar8(sym);
      return;
    }
    var binOp = op.slice(0, -1);
    if (useInt && isIntV) {
      loadVarInt(sym);
      emit('  MOV R4, DPL');
      emit('  MOV R5, DPH');
      genExpr(e.r, true);
      // left R4:R5, right DPL:DPH
      intAlu(binOp, 'R4', 'R5');
      storeVarInt(sym);
      return;
    }
    // 8-bit
    loadVar8(sym);
    emit('  MOV R3, A');
    genExpr(e.r, false);
    emit('  MOV R2, A');
    emit('  MOV A, R3');
    charAlu2(binOp, 'R2');
    storeVar8(sym);
  }

  function charAlu2(op, rhsReg) {
    // left already in A, right in rhsReg
    if (op === '+') { emit('  ADD A, ' + rhsReg); return; }
    if (op === '-') { emit('  CLR C'); emit('  SUBB A, ' + rhsReg); return; }
    if (op === '&') { emit('  ANL A, ' + rhsReg); return; }
    if (op === '|') { emit('  ORL A, ' + rhsReg); return; }
    if (op === '^') { emit('  XRL A, ' + rhsReg); return; }
    if (op === '*') { emit('  MOV B, ' + rhsReg); emit('  MUL AB'); return; }
    if (op === '/') { emit('  MOV B, ' + rhsReg); emit('  DIV AB'); return; }
    if (op === '%') { emit('  MOV B, ' + rhsReg); emit('  DIV AB'); emit('  MOV A, B'); return; }
    if (op === '<<') {
      var l1 = L('SL'), l2 = L('SL');
      emit('  MOV R4, A');
      emit('  MOV A, ' + rhsReg);
      emit('  JZ ' + l2);
      emit('  MOV R2, A');
      emit(l1 + ':');
      emit('  MOV A, R4');
      emit('  RL A');
      emit('  MOV R4, A');
      emit('  DJNZ R2, ' + l1);
      emit('  MOV A, R4');
      emit(l2 + ':');
      return;
    }
    if (op === '>>') {
      var l3 = L('SR'), l4 = L('SR');
      emit('  MOV R4, A');
      emit('  MOV A, ' + rhsReg);
      emit('  JZ ' + l4);
      emit('  MOV R2, A');
      emit(l3 + ':');
      emit('  MOV A, R4');
      emit('  RR A');
      emit('  MOV R4, A');
      emit('  DJNZ R2, ' + l3);
      emit('  MOV A, R4');
      emit(l4 + ':');
      return;
    }
    throw err(0, 'Unsupported char op ' + op);
  }

  function intAlu(op, leftLo, leftHi) {
    // left in leftLo:leftHi (R4/R5), right in DPL:DPH; result in DPL:DPH
    if (op === '+') {
      emit('  MOV A, DPL');
      emit('  ADD A, ' + leftLo);
      emit('  MOV DPL, A');
      emit('  MOV A, DPH');
      emit('  ADDC A, ' + leftHi);
      emit('  MOV DPH, A');
      return;
    }
    if (op === '-') {
      emit('  MOV A, ' + leftLo);
      emit('  CLR C');
      emit('  SUBB A, DPL');
      emit('  MOV DPL, A');
      emit('  MOV A, ' + leftHi);
      emit('  SUBB A, DPH');
      emit('  MOV DPH, A');
      return;
    }
    if (op === '&') {
      emit('  MOV A, DPL'); emit('  ANL A, ' + leftLo); emit('  MOV DPL, A');
      emit('  MOV A, DPH'); emit('  ANL A, ' + leftHi); emit('  MOV DPH, A');
      return;
    }
    if (op === '|') {
      emit('  MOV A, DPL'); emit('  ORL A, ' + leftLo); emit('  MOV DPL, A');
      emit('  MOV A, DPH'); emit('  ORL A, ' + leftHi); emit('  MOV DPH, A');
      return;
    }
    if (op === '^') {
      emit('  MOV A, DPL'); emit('  XRL A, ' + leftLo); emit('  MOV DPL, A');
      emit('  MOV A, DPH'); emit('  XRL A, ' + leftHi); emit('  MOV DPH, A');
      return;
    }
    if (op === '<<') {
      var l1 = L('SL'), l2 = L('SL');
      emit('  MOV A, ' + leftLo); // count in low of left? right count is in DPL
      // right count currently in DPL (low). left in R4:R5. Want left << DPL.
      emit('  MOV R2, DPL');
      emit('  MOV DPL, R4');
      emit('  MOV DPH, R5');
      emit('  MOV A, R2');
      emit('  JZ ' + l2);
      emit('  MOV R2, A');
      emit(l1 + ':');
      emit('  CLR C');
      emit('  MOV A, DPL');
      emit('  RLC A');
      emit('  MOV DPL, A');
      emit('  MOV A, DPH');
      emit('  RLC A');
      emit('  MOV DPH, A');
      emit('  DJNZ R2, ' + l1);
      emit(l2 + ':');
      return;
    }
    if (op === '>>') {
      var l3 = L('SR'), l4 = L('SR');
      emit('  MOV R2, DPL');
      emit('  MOV DPL, R4');
      emit('  MOV DPH, R5');
      emit('  MOV A, R2');
      emit('  JZ ' + l4);
      emit('  MOV R2, A');
      emit(l3 + ':');
      emit('  CLR C');
      emit('  MOV A, DPH');
      emit('  RRC A');
      emit('  MOV DPH, A');
      emit('  MOV A, DPL');
      emit('  RRC A');
      emit('  MOV DPL, A');
      emit('  DJNZ R2, ' + l3);
      emit(l4 + ':');
      return;
    }
    throw err(0, 'Unsupported int op ' + op);
  }

  function genBin(e, wantInt) {
    var op = e.op;
    if (op === '&&') {
      var lf = L('AND'), lend = L('AND');
      genExpr(e.l, false);
      emit('  JZ ' + lf);
      genExpr(e.r, false);
      emit('  JZ ' + lf);
      emit('  MOV A, #1');
      emit('  SJMP ' + lend);
      emit(lf + ':');
      emit('  MOV A, #0');
      emit(lend + ':');
      return;
    }
    if (op === '||') {
      var lt = L('OR'), lend2 = L('OR');
      genExpr(e.l, false);
      emit('  JNZ ' + lt);
      genExpr(e.r, false);
      emit('  JNZ ' + lt);
      emit('  MOV A, #0');
      emit('  SJMP ' + lend2);
      emit(lt + ':');
      emit('  MOV A, #1');
      emit(lend2 + ':');
      return;
    }
    if (['==','!=','<','>','<=','>='].indexOf(op) >= 0) {
      genExpr(e.l, false);
      emit('  MOV R3, A');
      genExpr(e.r, false);
      emit('  MOV R2, A');
      emit('  MOV A, R3');
      genCompare(op);
      return;
    }
    if (wantInt && ['+','-','&','|','^','<<','>>'].indexOf(op) >= 0) {
      genExpr(e.l, true);
      emit('  MOV R4, DPL');
      emit('  MOV R5, DPH');
      genExpr(e.r, true);
      intAlu(op, 'R4', 'R5');
      return;
    }
    genExpr(e.l, false);
    emit('  MOV R3, A');
    genExpr(e.r, false);
    emit('  MOV R2, A');
    emit('  MOV A, R3');
    charAlu2(op, 'R2');
  }

  function genCompare(op) {
    // A vs R2 -> A = 0/1
    var le = L('CMP'), l2 = L('CMP');
    if (op === '==') {
      emit('  CJNE A, R2, ' + le);
      emit('  MOV A, #1');
      emit('  SJMP ' + l2);
      emit(le + ':');
      emit('  MOV A, #0');
      emit(l2 + ':');
      return;
    }
    if (op === '!=') {
      emit('  CJNE A, R2, ' + le);
      emit('  MOV A, #0');
      emit('  SJMP ' + l2);
      emit(le + ':');
      emit('  MOV A, #1');
      emit(l2 + ':');
      return;
    }
    if (op === '<') {
      emit('  CLR C');
      emit('  SUBB A, R2');
      emit('  MOV A, #0');
      emit('  RLC A');
      return;
    }
    if (op === '>=') {
      emit('  CLR C');
      emit('  SUBB A, R2');
      emit('  MOV A, #0');
      emit('  RLC A');
      emit('  CPL A');
      emit('  ANL A, #1');
      return;
    }
    if (op === '>') {
      emit('  MOV R4, A');
      emit('  MOV A, R2');
      emit('  CLR C');
      emit('  SUBB A, R4');
      emit('  MOV A, #0');
      emit('  RLC A');
      return;
    }
    if (op === '<=') {
      emit('  MOV R4, A');
      emit('  MOV A, R2');
      emit('  CLR C');
      emit('  SUBB A, R4');
      emit('  MOV A, #0');
      emit('  RLC A');
      emit('  CPL A');
      emit('  ANL A, #1');
      return;
    }
    throw err(0, 'bad compare');
  }

  /* True when genExpr(e, false) leaves its result in DPTR:DPH (16-bit) rather than A. */
  function exprIsWide(e) {
    if (!e) return false;
    if (e.k === 'id') {
      var sym = lookup(e.name);
      return !!(sym && !sym.isBit && (isIntType(sym.type) || sym.size === 2));
    }
    if (e.k === 'postinc' || e.k === 'postdec' || e.k === 'preinc' || e.k === 'predec') {
      if (e.e.k !== 'id') return false;
      var s2 = lookup(e.e.name);
      return !!(s2 && !s2.isBit && (isIntType(s2.type) || s2.size === 2));
    }
    if (e.k === 'num') return e.v > 255;
    if (e.k === 'call') {
      var fn = e.fn && e.fn.k === 'id' ? funcs[e.fn.name] : null;
      return !!(fn && isIntType(fn.type));
    }
    if (e.k === 'assign') return e.l && e.l.k === 'id' && exprIsWide(e.l);
    if (e.k === 'cond') return exprIsWide(e.a) || exprIsWide(e.b);
    return false;
  }

  function genCondJmp(e, ifTrue, label) {
    if (e.k === 'bin' && ['==','!=','<','>','<=','>='].indexOf(e.op) >= 0) {
      genExpr(e.l, false);
      emit('  MOV R3, A');
      genExpr(e.r, false);
      emit('  MOV R2, A');
      emit('  MOV A, R3');
      genCmpJmp(e.op, ifTrue, label);
      return;
    }
    if (e.k === 'bin' && e.op === '&&') {
      if (ifTrue) {
        genCondJmp(e.l, true, label);
        genCondJmp(e.r, true, label);
      } else {
        var l1 = L('AND');
        genCondJmp(e.l, false, l1);
        genCondJmp(e.r, false, label);
        emit(l1 + ':');
      }
      return;
    }
    if (e.k === 'bin' && e.op === '||') {
      if (ifTrue) {
        genCondJmp(e.l, true, label);
        genCondJmp(e.r, true, label);
      } else {
        genCondJmp(e.l, false, label);
        genCondJmp(e.r, false, label);
      }
      return;
    }
    if (e.k === 'un' && e.op === '!') {
      genCondJmp(e.e, !ifTrue, label);
      return;
    }
    var wide = exprIsWide(e);
    genExpr(e, false);
    if (wide) {
      // 16-bit result is in DPTR:DPH -- test the whole word, not just A.
      emit('  MOV A, DPL');
      emit('  ORL A, DPH');
    }
    if (ifTrue) emit('  JNZ ' + label);
    else emit('  JZ ' + label);
  }

  function genCmpJmp(op, ifTrue, label) {
    var skip = L('SK');
    if (op === '==') {
      if (ifTrue) {
        emit('  CJNE A, R2, ' + skip);
        emit('  SJMP ' + label);
        emit(skip + ':');
      } else {
        emit('  CJNE A, R2, ' + label);
        emit('  SJMP ' + skip);
        emit(skip + ':');
      }
      return;
    }
    if (op === '!=') {
      if (ifTrue) {
        emit('  CJNE A, R2, ' + label);
        emit('  SJMP ' + skip);
        emit(skip + ':');
      } else {
        emit('  CJNE A, R2, ' + skip);
        emit('  SJMP ' + label);
        emit(skip + ':');
      }
      return;
    }
    if (op === '<') {
      emit('  CLR C');
      emit('  SUBB A, R2');
      emit(ifTrue ? '  JC ' + label : '  JNC ' + label);
      return;
    }
    if (op === '>=') {
      emit('  CLR C');
      emit('  SUBB A, R2');
      emit(ifTrue ? '  JNC ' + label : '  JC ' + label);
      return;
    }
    if (op === '>') {
      emit('  MOV R4, A');
      emit('  MOV A, R2');
      emit('  CLR C');
      emit('  SUBB A, R4');
      emit(ifTrue ? '  JC ' + label : '  JNC ' + label);
      return;
    }
    if (op === '<=') {
      emit('  MOV R4, A');
      emit('  MOV A, R2');
      emit('  CLR C');
      emit('  SUBB A, R4');
      emit(ifTrue ? '  JNC ' + label : '  JC ' + label);
      return;
    }
    throw err(0, 'bad cmp');
  }

  function genStmt(s) {
    switch (s.k) {
      case 'empty': return;
      case 'block':
        for (var i = 0; i < s.body.length; i++) genStmt(s.body[i]);
        return;
      case 'expr':
        genExpr(s.e, false);
        return;
      case 'decl':
        for (var j = 0; j < s.decls.length; j++) {
          var d = s.decls[j];
          var isBit = s.type === 'bit';
          if (isBit) {
            var sym = allocLocal(d.name, 'bit', 1, true);
            emit('  CLR ' + sym.bit);
          } else {
            var sz = isIntType(s.type) ? 2 : (d.arr ? constVal(d.arr) : 1);
            var sym2 = allocLocal(d.name, s.type, sz, false);
            if (d.init) {
              genExpr(d.init, isIntType(s.type));
              if (isIntType(s.type)) storeVarInt(sym2);
              else storeVar8(sym2);
            } else {
              if (sz === 1) emit('  MOV ' + sym2.addr + ', #0');
              else {
                for (var z = 0; z < sz; z++) emit('  MOV ' + (sym2.addr + z) + ', #0');
              }
            }
          }
        }
        return;
      case 'if': {
        var lelse = L('ELSE'), lend = L('FI');
        genCondJmp(s.c, false, s.el ? lelse : lend);
        genStmt(s.th);
        if (s.el) {
          emit('  SJMP ' + lend);
          emit(lelse + ':');
          genStmt(s.el);
        }
        emit(lend + ':');
        return;
      }
      case 'while': {
        var ltop = L('WH'), lend = L('WEND');
        lblStack.push({ cont: ltop, end: lend });
        emit(ltop + ':');
        genCondJmp(s.c, false, lend);
        genStmt(s.body);
        emit('  SJMP ' + ltop);
        emit(lend + ':');
        lblStack.pop();
        return;
      }
      case 'do': {
        var ltop = L('DO'), lend = L('DOEND'), lcont = L('DOC');
        lblStack.push({ cont: lcont, end: lend });
        emit(ltop + ':');
        genStmt(s.body);
        emit(lcont + ':');
        genCondJmp(s.c, true, ltop);
        emit(lend + ':');
        lblStack.pop();
        return;
      }
      case 'for': {
        var ltop = L('FOR'), lend = L('FOREND'), linc = L('FORI');
        if (s.init) genExpr(s.init, false);
        lblStack.push({ cont: linc, end: lend });
        emit(ltop + ':');
        if (s.cond) genCondJmp(s.cond, false, lend);
        genStmt(s.body);
        emit(linc + ':');
        if (s.incr) genExpr(s.incr, false);
        emit('  SJMP ' + ltop);
        emit(lend + ':');
        lblStack.pop();
        return;
      }
      case 'return':
        if (s.e) genExpr(s.e, curFn && isIntType(curFn.type));
        if (curFn && curFn.isIsr) {
          emit('  POP B');
          emit('  POP ACC');
          emit('  POP PSW');
          emit('  RETI');
        } else emit('  RET');
        return;
      case 'break': {
        if (!lblStack.length) throw err(s.line, 'break outside loop');
        emit('  SJMP ' + lblStack[lblStack.length - 1].end);
        return;
      }
      case 'continue': {
        if (!lblStack.length) throw err(s.line, 'continue outside loop');
        emit('  SJMP ' + lblStack[lblStack.length - 1].cont);
        return;
      }
      default:
        throw err(s.line, 'Unknown statement ' + s.k);
    }
  }

  function constVal(e) {
    if (e.k === 'num') return e.v;
    throw err(e.line, 'Constant array size expected');
  }

  function collect(items) {
    var i, it;
    for (i = 0; i < items.length; i++) {
      it = items[i];
      if (it.k === 'sbit') {
        var bv = it.val;
        if (bv.k === 'num') sbits[it.name] = bv.v;
        else if (bv.k === 'bin' && bv.op === '^') {
          var base = bv.l.k === 'id' ? bv.l.name : null;
          var bitn = bv.r.k === 'num' ? bv.r.v : null;
          if (base && bitn !== null) {
            if (sfrs[base] !== undefined) sbits[it.name] = sfrs[base] + bitn;
            else throw err(it.line, 'Unknown port ' + base);
          } else throw err(it.line, 'Bad sbit expression');
        } else throw err(it.line, 'Bad sbit value');
      } else if (it.k === 'sfr') {
        if (it.val.k !== 'num') throw err(it.line, 'sfr needs numeric address');
        sfrs[it.name] = it.val.v;
      } else if (it.k === 'global') {
        for (var g = 0; g < it.decls.length; g++) {
          var d = it.decls[g];
          var sz = isIntType(it.type) ? 2 : 1;
          if (d.arr && d.arr.k === 'num') sz = d.arr.v;
          var addr = frameBase;
          frameBase += sz;
          globals[d.name] = { addr: addr, type: it.type, isBit: false, size: sz, init: d.init, isGlobal: true };
        }
      } else if (it.k === 'func') {
        funcs[it.name] = {
          name: it.name, type: it.type, params: it.params, body: it.body,
          interrupt: it.interrupt, label: null, paramAddrs: [], isIsr: it.interrupt !== null
        };
      }
    }
    for (var fn in funcs) {
      var f = funcs[fn];
      f.paramAddrs = [];
      for (var p = 0; p < f.params.length; p++) {
        var psz = isIntType(f.params[p].type) ? 2 : 1;
        f.paramAddrs.push(frameBase);
        frameBase += psz;
      }
      if (f.isIsr) {
        if (!f.interrupt || f.interrupt.k !== 'num') throw err(0, 'interrupt number must be constant');
        var inum = f.interrupt.v;
        if (inum < 0 || inum > 4) throw err(0, 'interrupt number must be 0-4');
        f.isrNum = inum;
        f.label = '_ISR_' + inum;
      } else if (f.name === 'main') f.label = 'MAIN';
      else f.label = '_F_' + f.name;
    }
  }

  function genFuncBody(f, isIsr) {
    curFn = f;
    locals = {};
    for (var p = 0; p < f.params.length; p++) {
      if (f.params[p].name) {
        locals[f.params[p].name] = {
          addr: f.paramAddrs[p], type: f.params[p].type,
          isBit: false, size: isIntType(f.params[p].type) ? 2 : 1
        };
      }
    }
    genStmt(f.body);
    // implicit return
    if (isIsr) {
      emit('  POP B');
      emit('  POP ACC');
      emit('  POP PSW');
      emit('  RETI');
    } else emit('  RET');
    curFn = null;
    locals = null;
  }

  collect(ast);
  if (!funcs.main) throw err(0, 'void main() not found');

  var isrByNum = {};
  for (var fname in funcs) {
    var ff = funcs[fname];
    if (ff.isIsr) isrByNum[ff.isrNum] = ff;
  }

  emit('; Generated by Intel8051C (Keil C51 subset)');
  emit('  ORG 0000H');
  emit('  LJMP __START');
  for (var vi = 0; vi < 5; vi++) {
    emit('  ORG ' + hex4(VECTORS[vi]));
    emit(isrByNum[vi] ? '  LJMP ' + isrByNum[vi].label : '  LJMP __DEF_ISR');
  }
  emit('  ORG 0030H');
  emit('__START:');
  for (var gn in globals) {
    var gs = globals[gn];
    if (gs.init) {
      if (gs.init.k === 'num') {
        emit('  MOV ' + gs.addr + ', #' + (gs.init.v & 0xFF));
        if (gs.size >= 2) emit('  MOV ' + (gs.addr + 1) + ', #' + ((gs.init.v >> 8) & 0xFF));
      } else {
        locals = {};
        genExpr(gs.init, gs.size >= 2);
        if (gs.size >= 2) storeVarInt(gs); else storeVar8(gs);
        locals = null;
      }
    } else {
      for (var zi = 0; zi < gs.size; zi++) emit('  MOV ' + (gs.addr + zi) + ', #0');
    }
  }
  emit('  LCALL MAIN');
  emit('__HALT:');
  emit('  SJMP __HALT');

  emit('__DEF_ISR:');
  emit('  RETI');

  for (var ii = 0; ii < 5; ii++) {
    var isr = isrByNum[ii];
    if (!isr) continue;
    emit('');
    emit(isr.label + ':');
    emit('  PUSH PSW');
    emit('  PUSH ACC');
    emit('  PUSH B');
    if (isr.using && isr.using.k === 'num') emit('  MOV PSW, #' + ((isr.using.v & 3) << 3));
    genFuncBody(isr, true);
  }

  for (var fn2 in funcs) {
    var f2 = funcs[fn2];
    if (f2.isIsr) continue;
    emit('');
    emit(f2.label + ':');
    genFuncBody(f2, false);
  }

  emit('  END');
  return lines.join('\n');
}

function compile(src) {
  try {
    var cleaned = stripComments(src);
    var pre = preprocess(cleaned);
    var toks = lex(pre);
    var ast = parse(toks);
    var asm = codegen(ast);
    return { asm: asm };
  } catch (e) {
    return { error: e.message || String(e), line: e.line || 0 };
  }
}

function sniff(src) {
  if (!src) return false;
  return /#include\s*[<"]reg51|\bsbit\s+\w+\s*=\s*P[0-3]\s*\^|\bvoid\s+main\s*\(/.test(src);
}

return { compile: compile, sniff: sniff };
})();
