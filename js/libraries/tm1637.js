// js/libraries/tm1637.js — TM1637Display.h plugin (Avishay-style API)
// Emulates the 4-digit TM1637 clock/counter module against the tm1637 canvas
// component. Display content lives in the component's runtimeState; the CLK/DIO
// pins are present for wiring realism but no serial protocol is simulated.

window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['TM1637Display'] = {
  classes: ['TM1637Display'],
  includes: ['<TM1637Display.h>'],
  priority: 50,

  // TM1637Display display(CLK, DIO); -> var display = new TM1637Display(CLK, DIO)
  // (handled by the generic classes pass in the transpiler)

  constructor: function (clk, dio) {
    var state = {
      digits: [0, 0, 0, 0],
      colon: 0,
      brightness: 7,
      on: true,
    };

    // Segment bits: 0=A 1=B 2=C 3=D 4=E 5=F 6=G 7=DP
    var DIGITS = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F];
    var MINUS = 0x40; // SEG_G

    function push() {
      var cc = window.CircuitCanvas;
      if (!cc || !Array.isArray(cc.components)) return null;
      var comps = cc.components.filter(function (c) { return c.type === 'tm1637'; });
      if (comps.length === 0) return null;
      // Prefer the module whose CLK pin is wired to the constructor's clk pin
      var pick = null;
      for (var i = 0; i < comps.length; i++) {
        var n = null;
        try { n = cc._getConnectedPinNum(comps[i].id, 'CLK'); } catch (e) { n = null; }
        if (n !== null && Number(n) === Number(clk)) { pick = comps[i]; break; }
      }
      if (!pick) pick = comps[0];
      if (!pick.runtimeState) pick.runtimeState = {};
      pick.runtimeState.digits = state.digits.slice();
      pick.runtimeState.colon = state.colon;
      pick.runtimeState.brightness = state.brightness;
      pick.runtimeState.on = state.on;
      return pick;
    }

    function clampRange(length, pos) {
      length = (length === undefined || length === null) ? 4 : Math.floor(Number(length));
      pos = (pos === undefined || pos === null) ? 0 : Math.floor(Number(pos));
      if (!isFinite(length)) length = 4;
      if (!isFinite(pos)) pos = 0;
      pos = Math.max(0, Math.min(3, pos));
      length = Math.max(0, Math.min(4 - pos, length));
      return { length: length, pos: pos };
    }

    // Writes |num| into positions [pos, pos+length): right-aligned, high digits
    // truncated, left pad = blank (or '0' when leadingZero). Negative numbers
    // put a minus sign in the first cell of the range.
    function writeNumber(num, leadingZero, length, pos) {
      var r = clampRange(length, pos);
      length = r.length;
      pos = r.pos;
      if (length === 0) return r;
      num = Number(num);
      if (!isFinite(num)) num = 0;
      var neg = num < 0;
      var mag = String(Math.floor(Math.abs(num)));
      var avail = length - (neg ? 1 : 0);
      if (avail <= 0) {
        state.digits[pos] = neg ? MINUS : 0;
        return r;
      }
      if (mag.length > avail) mag = mag.slice(-avail);
      var padded = '';
      while (padded.length + mag.length < avail) padded += leadingZero ? '0' : ' ';
      var s = padded + mag; // length === avail
      var cells = neg ? [MINUS] : [];
      for (var i = 0; i < avail; i++) {
        var ch = s.charAt(i);
        cells.push(ch === ' ' ? 0 : DIGITS[Number(ch)]);
      }
      for (var j = 0; j < length; j++) state.digits[pos + j] = cells[j];
      return r;
    }

    var mod = {
      // setBrightness(brightness 0-7, on = true)
      setBrightness: function (brightness, on) {
        var b = Math.round(Number(brightness));
        state.brightness = isFinite(b) ? Math.max(0, Math.min(7, b)) : 7;
        state.on = (on === undefined) ? true : !!on;
        push();
      },

      // setSegments(segments[], length = 4, pos = 0)
      setSegments: function (segments, length, pos) {
        if (!segments || typeof segments.length !== 'number') return;
        var r = clampRange(length, pos);
        for (var i = 0; i < r.length && i < segments.length; i++) {
          var v = Number(segments[i]);
          state.digits[r.pos + i] = (isFinite(v) ? v : 0) & 0xFF;
        }
        push();
      },

      // showNumberDec(num, leadingZero = false, length = 4, pos = 0)
      showNumberDec: function (num, leadingZero, length, pos) {
        writeNumber(num, !!leadingZero, length, pos);
        push();
      },

      // showNumberDecEx(num, dots_and_blanks, leadingZero = false, length = 4, pos = 0)
      // Lower nibble of dots_and_blanks: DP bit per cell (bit0 = first cell of
      // the written range). Upper nibble: blank the same cells.
      showNumberDecEx: function (num, dotsAndBlanks, leadingZero, length, pos) {
        var r = writeNumber(num, !!leadingZero, length, pos);
        var flags = Math.floor(Number(dotsAndBlanks)) || 0;
        var dots = flags & 0x0F;
        var blanks = (flags >> 4) & 0x0F;
        for (var i = 0; i < r.length; i++) {
          if ((blanks >> i) & 1) state.digits[r.pos + i] = 0;
          else if ((dots >> i) & 1) state.digits[r.pos + i] |= 0x80;
        }
        push();
      },

      // Colon helpers (clock module). Also available as setColon(on).
      setColon: function (on) {
        state.colon = on ? 1 : 0;
        push();
      },
      showColonSegment: function () {
        state.colon = 1;
        push();
      },
      hideColonSegment: function () {
        state.colon = 0;
        push();
      },

      clear: function () {
        state.digits = [0, 0, 0, 0];
        state.colon = 0;
        push();
      },

      encodeDigit: function (e) {
        var n = Math.floor(Number(e));
        return (isFinite(n) && n >= 0 && n <= 9) ? DIGITS[n] : 0;
      },
    };

    push(); // seed the component with defaults on construction
    return mod;
  },

  constants: {
    SEG_A: 0x01,
    SEG_B: 0x02,
    SEG_C: 0x04,
    SEG_D: 0x08,
    SEG_E: 0x10,
    SEG_F: 0x20,
    SEG_G: 0x40,
    SEG_DP: 0x80,
  },
};
