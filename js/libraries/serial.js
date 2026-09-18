/**
 * Serial Library Plugin for ArduSim
 *
 * Provides the core Serial (HardwareSerial) simulation.
 * Serial is always available on Arduino boards — no #include needed.
 *
 * Transpile: Serial.begin() → _a.serialBegin()
 *            Serial.print()  → _a.serialPrint()
 *            etc.
 *
 * Runtime: serialBegin, serialPrint, serialRead, etc.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Serial'] = {
  classes: [],
  includes: [],
  priority: 1,

  transpile: [
    [/\bSerial\.begin\s*\(/g, '_a.serialBegin('],
    [/\bSerial\.print\s*\(/g, '_a.serialPrint('],
    [/\bSerial\.println\s*\(/g, '_a.serialPrintln('],
    [/\bSerial\.printf\s*\(/g, '_a.serialPrintf('],
    [/\bSerial\.read\s*\(/g, '_a.serialRead('],
    [/\bSerial\.available\s*\(/g, '_a.serialAvailable('],
    [/\bSerial\.write\s*\(/g, '_a.serialWrite('],
    [/\bSerial\.flush\s*\(/g, '_a.serialFlush('],
    [/\bSerial\.parseInt\s*\(/g, '_a.serialParseInt('],
    [/\bSerial\.parseFloat\s*\(/g, '_a.serialParseFloat('],
    [/\bSerial\.peek\s*\(/g, '_a.serialPeek('],
    [/\bSerial\.readString\s*\(/g, '_a.serialReadString('],
    [/\bSerial\.readStringUntil\s*\(/g, '_a.serialReadStringUntil('],
    [/\bSerial\.readBytes\s*\(/g, '_a.serialReadBytes('],
    [/\bSerial\.readBytesUntil\s*\(/g, '_a.serialReadBytesUntil('],
    [/\bSerial\.readLine\s*\(/g, '_a.serialReadLine('],
    // while (!Serial); → no-op (Serial is always available in simulation)
    [/while\s*\(\s*!Serial\s*\)\s*;/g, '/* while(!Serial) */'],
    // Also handle Serial1, Serial2 (ESP32 additional UARTs)
    [/\bSerial1\.begin\s*\(/g, '_a.serial1Begin('],
    [/\bSerial1\.print\s*\(/g, '_a.serial1Print('],
    [/\bSerial1\.println\s*\(/g, '_a.serial1Println('],
    [/\bSerial1\.read\s*\(/g, '_a.serial1Read('],
    [/\bSerial1\.available\s*\(/g, '_a.serial1Available('],
    [/\bSerial1\.write\s*\(/g, '_a.serial1Write('],
    [/\bSerial2\.begin\s*\(/g, '_a.serial2Begin('],
    [/\bSerial2\.print\s*\(/g, '_a.serial2Print('],
    [/\bSerial2\.println\s*\(/g, '_a.serial2Println('],
    [/\bSerial2\.read\s*\(/g, '_a.serial2Read('],
    [/\bSerial2\.available\s*\(/g, '_a.serial2Available('],
    [/\bSerial2\.write\s*\(/g, '_a.serial2Write('],
  ],

  constants: {
    SERIAL_5N1: 0x800000,
    SERIAL_6N1: 0x800008,
    SERIAL_7N1: 0x800010,
    SERIAL_8N1: 0x800018,
    SERIAL_5N2: 0x800020,
    SERIAL_6N2: 0x800028,
    SERIAL_7N2: 0x800030,
    SERIAL_8N2: 0x800038,
    SERIAL_5E1: 0x800040,
    SERIAL_6E1: 0x800048,
    SERIAL_7E1: 0x800050,
    SERIAL_8E1: 0x800058,
    SERIAL_5E2: 0x800060,
    SERIAL_6E2: 0x800068,
    SERIAL_7E2: 0x800070,
    SERIAL_8E2: 0x800078,
    SERIAL_5O1: 0x800080,
    SERIAL_6O1: 0x800088,
    SERIAL_7O1: 0x800090,
    SERIAL_8O1: 0x800098,
    SERIAL_5O2: 0x8000A0,
    SERIAL_6O2: 0x8000A8,
    SERIAL_7O2: 0x8000B0,
    SERIAL_8O2: 0x8000B8,
    LSBFIRST: 0,
    MSBFIRST: 1,
  },

  runtime: function(self) {
    /* ── UART TX pin helpers — simulate frame on the hardware TX pin ── */
    function _uartTxPin() {
      if (self.board === 'esp32_devkit_v1') return 1;  /* GPIO1 = TX0 */
      return 1; /* Arduino Uno/Nano D1 */
    }
    function _uartRxPin() {
      if (self.board === 'esp32_devkit_v1') return 3;  /* GPIO3 = RX0 */
      return 0; /* Arduino Uno/Nano D0 */
    }
    function _setPin(pin, v) {
      var k = 'pin_' + pin;
      if (self.pinStates[k] !== v) { self.pinStates[k] = v; self._emitPinChange(k, v); }
    }
    function _uartTxByte(b) {
      var tx = _uartTxPin();
      _setPin(tx, 0); /* start bit */
      for (var i = 0; i < 8; i++) { _setPin(tx, (b >> i) & 1); }
      _setPin(tx, 1); /* stop bit */
    }
    function _uartTxStr(str) {
      var tx = _uartTxPin();
      _setPin(tx, 1); /* idle HIGH */
      for (var i = 0; i < str.length; i++) { _uartTxByte(str.charCodeAt(i) & 0xFF); }
      _setPin(tx, 1); /* idle HIGH */
    }

    return {
      /* Serial */
      serialBegin: function(baud) {
        self.serialBaud = baud;
        self._serialLog('[Serial] Opened at ' + baud + ' baud\n', 'system');
        _setPin(_uartTxPin(), 1);
        _setPin(_uartRxPin(), 1);
      },
      serialPrint: function(val, fmt) {
        var str;
        if (fmt === 16) str = parseInt(val).toString(16).toUpperCase();
        else if (fmt === 2) str = parseInt(val).toString(2);
        else if (fmt === 8) str = parseInt(val).toString(8);
        else if (typeof val === 'number' && !Number.isInteger(val)) {
          var dec = fmt !== undefined ? fmt : 2;
          str = val.toFixed(dec);
        } else str = String(val);
        self._serialLog(str, 'data');
        _uartTxStr(str);
      },
      serialPrintln: function(val, fmt) {
        var str;
        if (val === undefined) str = '';
        else if (fmt === 16) str = parseInt(val).toString(16).toUpperCase();
        else if (fmt === 2) str = parseInt(val).toString(2);
        else if (fmt === 8) str = parseInt(val).toString(8);
        else if (typeof val === 'number' && !Number.isInteger(val)) {
          var dec = fmt !== undefined ? fmt : 2;
          str = val.toFixed(dec);
        } else str = String(val);
        self._serialLog(str + '\n', 'data');
        _uartTxStr(str + '\n');
      },
      serialPrintf: function(fmt) {
        var args = Array.prototype.slice.call(arguments, 1);
        var i = 0;
        var str = String(fmt).replace(/%([-+# 0]*)(\d*)(?:\.(\d+))?([dusfxXeEgGoc])/g, function(_, flags, width, prec, spec) {
          var v = args[i++];
          if (v === undefined) return '';
          var decimals = prec !== undefined ? Number(prec) : (spec === 'f' ? 6 : undefined);
          switch (spec) {
            case 'd': case 'u': return String(Math.trunc(Number(v)));
            case 's': return String(v);
            case 'f': return Number(v).toFixed(decimals);
            case 'x': return Math.round(Number(v)).toString(16);
            case 'X': return Math.round(Number(v)).toString(16).toUpperCase();
            case 'e': return Number(v).toExponential();
            case 'E': return Number(v).toExponential().toUpperCase();
            case 'g': return String(Number(v));
            case 'G': return String(Number(v)).toUpperCase();
            case 'o': return Math.round(Number(v)).toString(8);
            case 'c': return String.fromCharCode(v);
            default: return String(v);
          }
        });
        self._serialLog(str, 'data');
        _uartTxStr(str);
      },
      serialRead: function() {
        return self.serialInputBuffer.length > 0
          ? self.serialInputBuffer.shift().charCodeAt(0)
          : -1;
      },
      serialAvailable: function() { return self.serialInputBuffer.length; },
      serialWrite: function(val) { self._serialLog(String.fromCharCode(val), 'data'); _uartTxByte(val & 0xFF); },
      serialFlush: function() { },
      serialParseInt: function() {
        var buf = self.serialInputBuffer;
        var i = 0;
        while (i < buf.length && !((buf[i] >= '0' && buf[i] <= '9') || buf[i] === '-' || buf[i] === '+')) i++;
        if (i >= buf.length) return 0;
        var start = i;
        if (buf[i] === '-' || buf[i] === '+') i++;
        while (i < buf.length && buf[i] >= '0' && buf[i] <= '9') i++;
        var num = parseInt(self.serialInputBuffer.slice(start, i).join(''), 10);
        self.serialInputBuffer = self.serialInputBuffer.slice(i);
        return isNaN(num) ? 0 : num;
      },
      serialParseFloat: function() {
        var buf = self.serialInputBuffer;
        var i = 0;
        while (i < buf.length && !((buf[i] >= '0' && buf[i] <= '9') || buf[i] === '-' || buf[i] === '+' || buf[i] === '.')) i++;
        if (i >= buf.length) return 0.0;
        var start = i;
        if (buf[i] === '-' || buf[i] === '+') i++;
        while (i < buf.length && buf[i] >= '0' && buf[i] <= '9') i++;
        if (i < buf.length && buf[i] === '.') {
          i++;
          while (i < buf.length && buf[i] >= '0' && buf[i] <= '9') i++;
        }
        if (i < buf.length && (buf[i] === 'e' || buf[i] === 'E')) {
          i++;
          if (i < buf.length && (buf[i] === '+' || buf[i] === '-')) i++;
          while (i < buf.length && buf[i] >= '0' && buf[i] <= '9') i++;
        }
        var num = parseFloat(self.serialInputBuffer.slice(start, i).join(''));
        self.serialInputBuffer = self.serialInputBuffer.slice(i);
        return isNaN(num) ? 0.0 : num;
      },
      serialPeek: function() {
        return self.serialInputBuffer.length > 0 ? self.serialInputBuffer[0].charCodeAt(0) : -1;
      },
      serialReadString: function() {
        var s = self.serialInputBuffer.join('');
        self.serialInputBuffer = [];
        return s;
      },
      serialReadStringUntil: function(terminator) {
        var t = typeof terminator === 'number' ? String.fromCharCode(terminator) : String(terminator);
        var currentString = self.serialInputBuffer.join('');
        var index = currentString.indexOf(t);

        if (index === -1) {
          if (currentString.length > 0) {
            var partial = currentString;
            self.serialInputBuffer = [];
            return partial;
          }
          return '';
        }

        var lengthToRead = index + t.length;
        var result = currentString.slice(0, lengthToRead);
        var leftover = currentString.slice(lengthToRead);
        self.serialInputBuffer = leftover ? [leftover] : [];

        return result;
      },
      serialReadBytes: function(count) {
        var n = Math.min(count || 1, self.serialInputBuffer.length);
        var chars = self.serialInputBuffer.splice(0, n);
        return chars.map(function(c) { return c.charCodeAt(0); });
      },
      serialReadBytesUntil: function(terminator) {
        var t = typeof terminator === 'number' ? String.fromCharCode(terminator) : String(terminator);
        var result = [];
        while (self.serialInputBuffer.length > 0) {
          var ch = self.serialInputBuffer.shift();
          result.push(ch.charCodeAt(0));
          if (ch === t) break;
        }
        return result;
      },
      serialReadLine: function() {
        var idx = self.serialInputBuffer.indexOf('\n');
        if (idx === -1) {
          var s = self.serialInputBuffer.join('');
          self.serialInputBuffer = [];
          return s;
        }
        var line = self.serialInputBuffer.splice(0, idx + 1).join('');
        return line.endsWith('\n') ? line.slice(0, -1) : line;
      },

      /* Serial1 (ESP32 UART1) — TX=GPIO9, RX=GPIO10 */
      serial1Begin: function(baud) { self.serialBaud = baud; self._serialLog('[Serial1] Opened at ' + baud + ' baud\n', 'system'); _setPin(9, 1); _setPin(10, 1); },
      serial1Print: function(val, fmt) {
        var str;
        if (fmt === 16) str = parseInt(val).toString(16).toUpperCase();
        else if (fmt === 2) str = parseInt(val).toString(2);
        else if (fmt === 8) str = parseInt(val).toString(8);
        else if (typeof val === 'number' && !Number.isInteger(val)) {
          var dec = fmt !== undefined ? fmt : 2;
          str = val.toFixed(dec);
        } else str = String(val);
        self._serialLog(str, 'data');
        _setPin(9, 1); for (var i = 0; i < str.length; i++) { _setPin(9, 0); for (var b = 0; b < 8; b++) { _setPin(9, (str.charCodeAt(i) >> b) & 1); } _setPin(9, 1); }
      },
      serial1Println: function(val, fmt) {
        var str;
        if (val === undefined) str = '';
        else if (fmt === 16) str = parseInt(val).toString(16).toUpperCase();
        else if (fmt === 2) str = parseInt(val).toString(2);
        else if (fmt === 8) str = parseInt(val).toString(8);
        else if (typeof val === 'number' && !Number.isInteger(val)) {
          var dec = fmt !== undefined ? fmt : 2;
          str = val.toFixed(dec);
        } else str = String(val);
        self._serialLog(str + '\n', 'data');
        _setPin(9, 1); var s = str + '\n'; for (var i = 0; i < s.length; i++) { _setPin(9, 0); for (var b = 0; b < 8; b++) { _setPin(9, (s.charCodeAt(i) >> b) & 1); } _setPin(9, 1); }
      },
      serial1Read: function() {
        return self.serialInputBuffer.length > 0
          ? self.serialInputBuffer.shift().charCodeAt(0)
          : -1;
      },
      serial1Available: function() { return self.serialInputBuffer.length; },
      serial1Write: function(val) { self._serialLog(String.fromCharCode(val), 'data'); _setPin(9, 0); for (var b = 0; b < 8; b++) { _setPin(9, (val >> b) & 1); } _setPin(9, 1); },

      /* Serial2 (ESP32 UART2) — TX=GPIO16, RX=GPIO17 */
      serial2Begin: function(baud) { self.serialBaud = baud; self._serialLog('[Serial2] Opened at ' + baud + ' baud\n', 'system'); _setPin(16, 1); _setPin(17, 1); },
      serial2Print: function(val, fmt) {
        var str;
        if (fmt === 16) str = parseInt(val).toString(16).toUpperCase();
        else if (fmt === 2) str = parseInt(val).toString(2);
        else if (fmt === 8) str = parseInt(val).toString(8);
        else if (typeof val === 'number' && !Number.isInteger(val)) {
          var dec = fmt !== undefined ? fmt : 2;
          str = val.toFixed(dec);
        } else str = String(val);
        self._serialLog(str, 'data');
        _setPin(16, 1); for (var i = 0; i < str.length; i++) { _setPin(16, 0); for (var b = 0; b < 8; b++) { _setPin(16, (str.charCodeAt(i) >> b) & 1); } _setPin(16, 1); }
      },
      serial2Println: function(val, fmt) {
        var str;
        if (val === undefined) str = '';
        else if (fmt === 16) str = parseInt(val).toString(16).toUpperCase();
        else if (fmt === 2) str = parseInt(val).toString(2);
        else if (fmt === 8) str = parseInt(val).toString(8);
        else if (typeof val === 'number' && !Number.isInteger(val)) {
          var dec = fmt !== undefined ? fmt : 2;
          str = val.toFixed(dec);
        } else str = String(val);
        self._serialLog(str + '\n', 'data');
        _setPin(16, 1); var s = str + '\n'; for (var i = 0; i < s.length; i++) { _setPin(16, 0); for (var b = 0; b < 8; b++) { _setPin(16, (s.charCodeAt(i) >> b) & 1); } _setPin(16, 1); }
      },
      serial2Read: function() {
        return self.serialInputBuffer.length > 0
          ? self.serialInputBuffer.shift().charCodeAt(0)
          : -1;
      },
      serial2Available: function() { return self.serialInputBuffer.length; },
      serial2Write: function(val) { self._serialLog(String.fromCharCode(val), 'data'); _setPin(16, 0); for (var b = 0; b < 8; b++) { _setPin(16, (val >> b) & 1); } _setPin(16, 1); },
    };
  },
};
