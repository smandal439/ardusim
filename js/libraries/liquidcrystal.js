/**
 * LiquidCrystal Library Plugin for ArduSim
 * 
 * Classic HD44780 character LCD (direct pin connection).
 * Usage: LiquidCrystal lcd(RS, EN, D4, D5, D6, D7);
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['LiquidCrystal'] = {
  classes: ['LiquidCrystal'],
  includes: ['<LiquidCrystal.h>'],
  priority: 98,

  transpile: [
    [/(\w+)\.begin\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/g, function(m, v, a, b) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|SoftwareSerial|Serial2|Serial1|dht)$/i.test(v)) return m; return '_a.lcdBegin(' + v + ', ' + a + ', ' + b + ')'; }],
    [/(\w+)\.begin\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|SoftwareSerial|Serial2|Serial1|dht)$/i.test(v)) return m; return '_a.lcdBegin(' + v + ')'; }],
    [/(\w+)\.setCursor\s*\(([^)]+)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdSetCursor(' + v + ', ' + a + ')'; }],
    [/(\w+)\.print\s*\(([^)]*)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdPrint(' + v + ', ' + a + ')'; }],
    [/(\w+)\.println\s*\(([^)]*)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdPrintln(' + v + ', ' + a + ')'; }],
    [/(\w+)\.clear\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdClear(' + v + ')'; }],
    [/(\w+)\.home\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdHome(' + v + ')'; }],
    [/(\w+)\.write\s*\(([^)]*)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|Servo|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdWrite(' + v + ', ' + a + ')'; }],
    [/(\w+)\.noDisplay\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdNoDisplay(' + v + ')'; }],
    [/(\w+)\.display\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdDisplay(' + v + ')'; }],
    [/(\w+)\.noBlink\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdNoBlink(' + v + ')'; }],
    [/(\w+)\.blink\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdBlink(' + v + ')'; }],
    [/(\w+)\.noCursor\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdNoCursor(' + v + ')'; }],
    [/(\w+)\.cursor\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdCursor(' + v + ')'; }],
    [/(\w+)\.scrollDisplayLeft\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdScrollDisplayLeft(' + v + ')'; }],
    [/(\w+)\.scrollDisplayRight\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdScrollDisplayRight(' + v + ')'; }],
    [/(\w+)\.autoscroll\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdAutoscroll(' + v + ')'; }],
    [/(\w+)\.noAutoscroll\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdNoAutoscroll(' + v + ')'; }],
    [/(\w+)\.leftToRight\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdLeftToRight(' + v + ')'; }],
    [/(\w+)\.rightToLeft\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdRightToLeft(' + v + ')'; }],
    [/(\w+)\.createChar\s*\(([^)]*)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdCreateChar(' + v + ', ' + a + ')'; }],
  ],

  constructor: function(rs, en, d4, d5, d6, d7) {
    return { __class: 'LiquidCrystal', rs: rs, en: en, d4: d4, d5: d5, d6: d6, d7: d7 };
  },

  runtime: function(self) {
    var _uid = 0;
    var _cursors = {};

    function getCursor(varName) {
      var id = varName._lcdUid;
      if (id == null) { id = varName._lcdUid = ++_uid; _cursors[id] = { col: 0, row: 0 }; }
      return _cursors[id] || (_cursors[id] = { col: 0, row: 0 });
    }
    function setCursor(varName, c) { _cursors[varName._lcdUid] = c; }

    function getDims(varName) {
      return { cols: 16, rows: 2 };
    }
    function advanceCursor(cursor, len, dims) {
      var col = cursor.col + len;
      var row = cursor.row;
      while (col >= dims.cols) { col -= dims.cols; row = (row + 1) % dims.rows; }
      return { col: col, row: row };
    }

    return {
      lcdBegin: function(varName, cols, rows) {
        if (varName && varName._ssId) {
          var ch = self._softSerial && self._softSerial[varName._ssId];
          if (ch) { ch.listening = true; ch.baud = cols; }
          self._serialLog('[SoftwareSerial] begin(' + cols + ')\n', 'system');
          return;
        }
        if (varName && varName._npId) { self._serialLog('[NeoPixel] begin\n', 'system'); return; }
        if (varName && varName.__webserver) {
          var cfg = (self._web = self._web || { port: 80, routes: [], reqIdx: 0, lastHit: 0 });
          cfg.port = Number(cols) || cfg.port || 80;
          self._serialLog('[WebServer] HTTP server started on port ' + cfg.port + '\n', 'system');
          return;
        }
        if (varName && varName.__oled) { if (varName.begin) varName.begin(cols, rows); return; }
        if (varName && varName.__vl53l0x) { return varName.begin(); }
        if (varName && varName.__tft) { self._emitEvent('tft_power', { on: true }); return; }
        self._emitEvent('lcd_power', { on: true });
      },
      lcdSetCursor: function(varName, col, row) {
        if (varName && varName.__oled) { if (varName.setCursor) varName.setCursor(col, row); return; }
        if (varName && varName.__tft) { self._tftCursor = { col: Number(col) || 0, row: Number(row) || 0 }; return; }
        setCursor(varName, { col: Number(col) || 0, row: Number(row) || 0 });
      },
      lcdPrint: function(varName, val, decimals) {
        if (varName && varName.__oled) { if (varName.print) varName.print(val); return; }
        if (varName && varName._ssId) {
          var ch = self._softSerial && self._softSerial[varName._ssId];
          if (ch) self._serialLog(String(val) + '\n', 'data');
          return;
        }
        var numericValue = typeof val === 'number' ? val : Number(val);
        var hasNumericValue = typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && Number.isFinite(numericValue));
        var text = hasNumericValue && Number.isFinite(numericValue) && !Number.isInteger(numericValue)
          ? numericValue.toFixed(Number.isFinite(Number(decimals)) ? Math.max(0, Math.min(6, Number(decimals))) : 2)
          : String(val);
        if (varName && varName.__tft) {
          var tc = self._tftCursor || { col: 0, row: 0 };
          var ts = self._tftTextSize || 1;
          var fg = self._tftFgColor != null ? self._tftFgColor : 0xFFFF;
          var bg = self._tftBgColor != null ? self._tftBgColor : 0x0000;
          self._emitEvent('tft_draw', { op: 'print', text: text, x: tc.col, y: tc.row, size: ts, fg: fg, bg: bg });
          self._tftCursor = { col: tc.col + text.length * 6 * ts, row: tc.row };
          return;
        }
        var cursor = getCursor(varName);
        self._emitEvent('lcd_print', { text: text, cursor: { col: cursor.col, row: cursor.row } });
        var dims = getDims(varName);
        setCursor(varName, advanceCursor(cursor, text.length, dims));
      },
      lcdPrintln: function(varName, val, decimals) {
        if (varName && varName.__oled) { if (varName.println) varName.println(val); return; }
        if (varName && varName._ssId) {
          var ch = self._softSerial && self._softSerial[varName._ssId];
          if (ch) self._serialLog(String(val) + '\n', 'data');
          return;
        }
        var numericValue = typeof val === 'number' ? val : Number(val);
        var hasNumericValue = typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && Number.isFinite(numericValue));
        var text = hasNumericValue && Number.isFinite(numericValue) && !Number.isInteger(numericValue)
          ? numericValue.toFixed(Number.isFinite(Number(decimals)) ? Math.max(0, Math.min(6, Number(decimals))) : 2)
          : String(val);
        var cursor = getCursor(varName);
        self._emitEvent('lcd_print', { text: text, cursor: { col: cursor.col, row: cursor.row } });
        var dims = getDims(varName);
        setCursor(varName, { col: 0, row: (cursor.row + 1) % dims.rows });
      },
      lcdClear: function(varName) {
        if (varName && varName._npId) {
          var np = self._neopixels && self._neopixels[varName._npId];
          if (np) np.pixels.fill(0);
          return;
        }
        if (varName && varName.__oled) { self._emitEvent('oled_draw', { op: 'clear', addr: varName.addr || 0x3C }); return; }
        if (varName && varName.__tft) { self._emitEvent('tft_draw', { op: 'fillScreen', color: 0x0000 }); return; }
        self._emitEvent('lcd_clear', {});
        setCursor(varName, { col: 0, row: 0 });
      },
      lcdHome: function(varName) { setCursor(varName, { col: 0, row: 0 }); },
      lcdWrite: function(varName, val) {
        if (varName && varName.__oled) { if (varName.print) varName.print(String.fromCharCode(Number(val))); return; }
        var cursor = getCursor(varName);
        self._emitEvent('lcd_print', { text: String.fromCharCode(Number(val)), cursor: { col: cursor.col, row: cursor.row } });
        var dims = getDims(varName);
        setCursor(varName, advanceCursor(cursor, 1, dims));
      },
      lcdDisplay: function(varName) {
        if (varName && varName.__oled) return;
        self._emitEvent('lcd_power', { on: true });
      },
      lcdNoDisplay: function(varName) {
        if (varName && varName.__oled) return;
        self._emitEvent('lcd_power', { on: false });
      },
      lcdNoBlink: function(varName) { /* cursor blink off — visual only, no-op in sim */ },
      lcdBlink: function(varName) { /* cursor blink on — visual only, no-op in sim */ },
      lcdNoCursor: function(varName) { /* hide cursor — visual only, no-op in sim */ },
      lcdCursor: function(varName) { /* show cursor — visual only, no-op in sim */ },
      lcdScrollDisplayLeft: function(varName) { self._emitEvent('lcd_scroll', { dir: 'left' }); },
      lcdScrollDisplayRight: function(varName) { self._emitEvent('lcd_scroll', { dir: 'right' }); },
      lcdAutoscroll: function(varName) { /* autoscroll on — no-op in sim */ },
      lcdNoAutoscroll: function(varName) { /* autoscroll off — no-op in sim */ },
      lcdLeftToRight: function(varName) { /* text direction — no-op in sim */ },
      lcdRightToLeft: function(varName) { /* text direction — no-op in sim */ },
      lcdCreateChar: function(varName, slot, bitmap) { /* custom char — no-op in sim */ },
    };
  },
};
