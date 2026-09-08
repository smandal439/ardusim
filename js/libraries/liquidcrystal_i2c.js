window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['LiquidCrystal_I2C'] = {
  classes: ['LiquidCrystal_I2C'],
  includes: ['<LiquidCrystal_I2C.h>'],
  priority: 98,
  transpile: [
    [/(\w+)\.init\(\)/g, function (m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|SoftwareSerial|Serial2|Serial1|dht)$/i.test(v)) return m; return '_a.lcdBegin(' + v + ')'; }],
    [/(\w+)\.init\((\w+),\s*(\w+)\)/g, function (m, v, a, b) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|SoftwareSerial|Serial2|Serial1|dht)$/i.test(v)) return m; return '_a.lcdBegin(' + v + ', ' + a + ', ' + b + ')'; }],
    [/(\w+)\.begin\(\)/g, function (m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|SoftwareSerial|Serial2|Serial1|dht)$/i.test(v)) return m; return '_a.lcdBegin(' + v + ')'; }],
    [/(\w+)\.begin\((\w+),\s*(\w+)\)/g, function (m, v, a, b) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|SoftwareSerial|Serial2|Serial1|dht)$/i.test(v)) return m; return '_a.lcdBegin(' + v + ', ' + a + ', ' + b + ')'; }],
    [/(\w+)\.setCursor\((\w+),\s*(\w+)\)/g, function (m, v, a, b) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdSetCursor(' + v + ', ' + a + ', ' + b + ')'; }],
    [/(\w+)\.print\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdPrint(' + v + ', ' + a + ')'; }],
    [/(\w+)\.println\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdPrintln(' + v + ', ' + a + ')'; }],
    [/(\w+)\.clear\(\)/g, function (m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdClear(' + v + ')'; }],
    [/(\w+)\.home\(\)/g, function (m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdHome(' + v + ')'; }],
    [/(\w+)\.write\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|Servo|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdWrite(' + v + ', ' + a + ')'; }],
    [/(\w+)\.backlight\(\)/g, function (m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdBacklight(' + v + ', true)'; }],
    [/(\w+)\.noBacklight\(\)/g, function (m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdBacklight(' + v + ', false)'; }],
    [/(\w+)\.createChar\(([^,]+),\s*([^)]+)\)/g, function (m, v, loc, charmap) { return '_a.lcdCreateChar(' + v + ', ' + loc + ', ' + charmap + ')'; }],
  ],
  constants: {},
  constructor: function (addr, cols, rows) {
    return { __class: 'LiquidCrystal_I2C', addr: addr, cols: Number(cols) || 16, rows: Number(rows) || 2 };
  },

  runtime: function (self) {
    function getDimensions(varName) {
      return {
        cols: (varName && varName.cols) || 16,
        rows: (varName && varName.rows) || 2
      };
    }

    function advanceCursor(cursor, textLength, dims) {
      var col = cursor.col + textLength;
      var row = cursor.row;
      while (col >= dims.cols) {
        col -= dims.cols;
        row = (row + 1) % dims.rows;
      }
      return { col: col, row: row };
    }

    function formatText(val, decimals) {
      var numericValue = typeof val === 'number' ? val : Number(val);
      var hasNumericValue = typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && Number.isFinite(numericValue));
      return hasNumericValue && Number.isFinite(numericValue) && !Number.isInteger(numericValue)
        ? numericValue.toFixed(Number.isFinite(Number(decimals)) ? Math.max(0, Math.min(6, Number(decimals))) : 2)
        : String(val);
    }

    return {
      lcdBegin: function (varName, cols, rows) {
        if (varName && varName.__oled) { if (varName.begin) varName.begin(cols, rows); return; }
        if (varName && varName.__tft) { self._emitEvent('tft_power', { on: true }); return; }
        if (cols) varName.cols = Number(cols);
        if (rows) varName.rows = Number(rows);
        self._emitEvent('lcd_power', { addr: varName.addr });
      },
      lcdSetCursor: function (varName, col, row) {
        if (varName && varName.__oled) { if (varName.setCursor) varName.setCursor(col, row); return; }
        if (varName && varName.__tft) { self._tftCursor = { col: Number(col) || 0, row: Number(row) || 0 }; return; }
        if (!self._lcdCursors) self._lcdCursors = {};
        self._lcdCursors[varName.addr] = { col: Number(col) || 0, row: Number(row) || 0 };
      },
      lcdPrint: function (varName, val, decimals) {
        if (varName && varName.__oled) { if (varName.print) varName.print(val); return; }
        if (varName && varName.__tft) {
          var text = formatText(val, decimals);
          var cursor = self._tftCursor || { col: 0, row: 0 };
          var size = self._tftTextSize || 1;
          var fg = self._tftFgColor != null ? self._tftFgColor : 0xFFFF;
          var bg = self._tftBgColor != null ? self._tftBgColor : 0x0000;
          self._emitEvent('tft_draw', { op: 'print', text: text, x: cursor.col, y: cursor.row, size: size, fg: fg, bg: bg });
          self._tftCursor = { col: cursor.col + text.length * 6 * size, row: cursor.row };
          return;
        }
        var text = formatText(val, decimals);
        if (!self._lcdCursors) self._lcdCursors = {};
        var cursor = self._lcdCursors[varName.addr] || { col: 0, row: 0 };
        var dims = getDimensions(varName);
        self._emitEvent('lcd_print', { text: text, cursor: { col: cursor.col, row: cursor.row }, addr: varName.addr });
        self._lcdCursors[varName.addr] = advanceCursor(cursor, text.length, dims);
      },
      lcdPrintln: function (varName, val, decimals) {
        if (varName && varName.__oled) { if (varName.println) varName.println(val); return; }
        if (varName && varName.__tft) {
          var text = formatText(val, decimals);
          var cursor = self._tftCursor || { col: 0, row: 0 };
          var size = self._tftTextSize || 1;
          var fg = self._tftFgColor != null ? self._tftFgColor : 0xFFFF;
          var bg = self._tftBgColor != null ? self._tftBgColor : 0x0000;
          self._emitEvent('tft_draw', { op: 'print', text: text, x: cursor.col, y: cursor.row, size: size, fg: fg, bg: bg });
          self._tftCursor = { col: 0, row: cursor.row + 8 * size };
          return;
        }
        var text = formatText(val, decimals);
        if (!self._lcdCursors) self._lcdCursors = {};
        var cursor = self._lcdCursors[varName.addr] || { col: 0, row: 0 };
        var dims = getDimensions(varName);
        self._emitEvent('lcd_print', { text: text, cursor: { col: cursor.col, row: cursor.row }, addr: varName.addr });
        self._lcdCursors[varName.addr] = { col: 0, row: (cursor.row + 1) % dims.rows };
      },
      lcdClear: function (varName) {
        if (varName && varName.__oled) { self._emitEvent('oled_draw', { op: 'clear', addr: varName.addr || 0x3C }); return; }
        self._emitEvent('lcd_clear', { addr: varName.addr });
        if (!self._lcdCursors) self._lcdCursors = {};
        self._lcdCursors[varName.addr] = { col: 0, row: 0 };
      },
      lcdHome: function (varName) {
        if (varName && varName.__oled) { if (varName.setCursor) varName.setCursor(0, 0); return; }
        if (!self._lcdCursors) self._lcdCursors = {};
        self._lcdCursors[varName.addr] = { col: 0, row: 0 };
      },
      lcdWrite: function (varName, val) {
        if (varName && varName.__oled) { if (varName.print) varName.print(val); return; }
        var text = typeof val === 'number' ? String.fromCharCode(val) : String(val);
        if (!self._lcdCursors) self._lcdCursors = {};
        var cursor = self._lcdCursors[varName.addr] || { col: 0, row: 0 };
        var dims = getDimensions(varName);
        self._emitEvent('lcd_print', { text: text, cursor: { col: cursor.col, row: cursor.row }, addr: varName.addr });
        self._lcdCursors[varName.addr] = advanceCursor(cursor, text.length, dims);
      },
      lcdBacklight: function (varName, state) {
        if (varName && varName.__oled) { return; }
        self._emitEvent('lcd_backlight', { backlight: Boolean(state), addr: varName.addr });
      },
      lcdCreateChar: function (varName, location, charmap) {
        if (varName && varName.__oled) { return; }
        self._emitEvent('lcd_create_char', { location: Number(location), charmap: charmap, addr: varName.addr });
      }
    };
  },
};
