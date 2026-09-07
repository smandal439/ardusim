// js/libraries/adafruit_ssd1306.js — Adafruit_SSD1306 128×64 OLED I2C plugin
//
// Strategy: Only transpile SSD1306-SPECIFIC methods (.clearDisplay, .display, etc.)
// that have no overlap with LCD/GFX. All inherited Adafruit_GFX methods (.print,
// .setCursor, .drawPixel, etc.) are implemented as real JS methods on the object
// returned by the constructor. This avoids the transpiler hijacking lcd.print() etc.
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Adafruit_SSD1306'] = {
  priority: 101,
  classes: ['Adafruit_SSD1306'],
  includes: ['<Adafruit_SSD1306.h>'],

  // Only SSD1306-SPECIFIC methods that no other plugin defines.
  // Shared methods (.print, .setCursor, .drawPixel, etc.) live on the constructor object.
  transpile: [
    [/(\w+)\.clearDisplay\s*\(\s*\)/g, function (m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledClearDisplay(' + v + ')'; }],
    [/(\w+)\.display\s*\(\s*\)/g, function (m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledFlush(' + v + ')'; }],
    [/(\w+)\.invertDisplay\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledInvertDisplay(' + v + ', ' + a + ')'; }],
    [/(\w+)\.dim\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledDim(' + v + ', ' + a + ')'; }],
    [/(\w+)\.setContrast\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledSetContrast(' + v + ', ' + a + ')'; }],
  ],

  constants: {
    SSD1306_SWITCHCAPVCC: 0x01,
    SSD1306_EXTERNALVCC: 0x02,
    SSD1306_I2C_ADDRESS: 0x3C,
    SSD1306_WHITE: 1,
    SSD1306_BLACK: 0,
    SSD1306_SETCONTRAST: 0x81,
    SSD1306_SETVCOMDETECT: 0xDB,
  },

  constructor: function (width, height, wire, reset) {
    // Per-instance self lookup using WeakMap (supports multiple simulators)
    if (!window.ArduinoLibs['Adafruit_SSD1306']._selfMap) {
      window.ArduinoLibs['Adafruit_SSD1306']._selfMap = new WeakMap();
    }
    var _selfMap = window.ArduinoLibs['Adafruit_SSD1306']._selfMap;
    function getSelf() {
      // Try all known simulators
      if (window.App && window.App.sim && _selfMap.has(window.App.sim)) return _selfMap.get(window.App.sim);
      if (window.App && window.App.sim2 && _selfMap.has(window.App.sim2)) return _selfMap.get(window.App.sim2);
      return null;
    }

    var _addr = 0x3C;
    var _cursorX = 0, _cursorY = 0;
    var _textSize = 1, _textColor = 1, _textWrap = true;

    function emit(data) {
      var s = getSelf();
      if (s) s._emitEvent('oled_draw', data);
    }

    return {
      __oled: true,
      addr: _addr,
      _w: width || 128,
      _h: height || 64,
      wire: wire,
      reset: reset,

      // --- Adafruit_GFX inherited methods (no transpile needed) ---

      begin: function (mode, addr) {
        if (addr !== undefined) _addr = Number(addr) || 0x3C;
        this.addr = _addr;
        var s = getSelf();
        if (s) s._emitEvent('oled_power', { addr: _addr });
      },

      print: function (msg) {
        var text = String(msg !== undefined ? msg : '');
        emit({ op: 'print', text: text, cursor: { col: _cursorX, row: _cursorY }, size: _textSize, color: _textColor, addr: _addr });
        _cursorX += text.length * 6 * _textSize;
      },

      println: function (msg) {
        var text = String(msg !== undefined ? msg : '');
        emit({ op: 'print', text: text, cursor: { col: _cursorX, row: _cursorY }, size: _textSize, color: _textColor, addr: _addr });
        _cursorX = 0;
        _cursorY += 8 * _textSize;
      },

      setCursor: function (x, y) { _cursorX = Number(x) || 0; _cursorY = Number(y) || 0; },
      setTextColor: function (fg, bg) { _textColor = fg !== undefined ? Number(fg) : 1; },
      setTextSize: function (s) { _textSize = Number(s) || 1; },
      setTextWrap: function (w) { _textWrap = !!w; },
      setRotation: function (r) { /* ignored for 128×64 mono */ },

      drawPixel: function (x, y, color) { emit({ op: 'pixel', x: Number(x) || 0, y: Number(y) || 0, color: color !== undefined ? Number(color) : 1, addr: _addr }); },
      drawLine: function (x0, y0, x1, y1, color) { emit({ op: 'line', x0: Number(x0), y0: Number(y0), x1: Number(x1), y1: Number(y1), color: color !== undefined ? Number(color) : 1, addr: _addr }); },
      drawFastHLine: function (x, y, w, color) { emit({ op: 'line', x0: Number(x), y0: Number(y), x1: (Number(x) || 0) + (Number(w) || 0) - 1, y1: Number(y), color: color !== undefined ? Number(color) : 1, addr: _addr }); },
      drawFastVLine: function (x, y, h, color) { emit({ op: 'line', x0: Number(x), y0: Number(y), x1: Number(x), y1: (Number(y) || 0) + (Number(h) || 0) - 1, color: color !== undefined ? Number(color) : 1, addr: _addr }); },
      drawRect: function (x, y, w, h, color) { emit({ op: 'rect', x: Number(x), y: Number(y), w: Number(w), h: Number(h), color: color !== undefined ? Number(color) : 1, addr: _addr }); },
      fillRect: function (x, y, w, h, color) { emit({ op: 'fillRect', x: Number(x), y: Number(y), w: Number(w), h: Number(h), color: color !== undefined ? Number(color) : 1, addr: _addr }); },
      fillScreen: function (color) { emit({ op: 'fillScreen', color: color !== undefined ? Number(color) : 1, addr: _addr }); },
      drawCircle: function (cx, cy, r, color) { emit({ op: 'circle', x: Number(cx), y: Number(cy), r: Number(r), color: color !== undefined ? Number(color) : 1, addr: _addr }); },
      fillCircle: function (cx, cy, r, color) { emit({ op: 'fillCircle', x: Number(cx), y: Number(cy), r: Number(r), color: color !== undefined ? Number(color) : 1, addr: _addr }); },
      drawTriangle: function (x0, y0, x1, y1, x2, y2, color) { emit({ op: 'triangle', x0: Number(x0), y0: Number(y0), x1: Number(x1), y1: Number(y1), x2: Number(x2), y2: Number(y2), color: color !== undefined ? Number(color) : 1, addr: _addr }); },
      fillTriangle: function (x0, y0, x1, y1, x2, y2, color) { emit({ op: 'fillTriangle', x0: Number(x0), y0: Number(y0), x1: Number(x1), y1: Number(y1), x2: Number(x2), y2: Number(y2), color: color !== undefined ? Number(color) : 1, addr: _addr }); },
      drawRoundRect: function (x, y, w, h, r, color) { emit({ op: 'roundRect', x: Number(x), y: Number(y), w: Number(w), h: Number(h), r: Number(r), color: color !== undefined ? Number(color) : 1, addr: _addr }); },
      fillRoundRect: function (x, y, w, h, r, color) { emit({ op: 'fillRoundRect', x: Number(x), y: Number(y), w: Number(w), h: Number(h), r: Number(r), color: color !== undefined ? Number(color) : 1, addr: _addr }); },

      width: function () { return this._w || 128; },
      height: function () { return this._h || 64; },
      getRotation: function () { return 0; },
    };
  },

  runtime: function (self) {
    // Per-instance self storage via WeakMap
    if (!window.ArduinoLibs['Adafruit_SSD1306']._selfMap) {
      window.ArduinoLibs['Adafruit_SSD1306']._selfMap = new WeakMap();
    }
    window.ArduinoLibs['Adafruit_SSD1306']._selfMap.set(self, self);

    return {
      oledClearDisplay: function (v) {
        self._emitEvent('oled_draw', { op: 'clear', addr: v.addr || 0x3C });
      },
      oledFlush: function (v) {
        // Framebuffer updates are immediate in the simulator — no-op
      },
      oledInvertDisplay: function (v, flag) {
        self._emitEvent('oled_draw', { op: 'invert', invert: !!flag, addr: v.addr || 0x3C });
      },
      oledDim: function (v, flag) {
        self._emitEvent('oled_draw', { op: 'dim', dimmed: !!flag, addr: v.addr || 0x3C });
      },
      oledSetContrast: function (v, val) {
        self._emitEvent('oled_draw', { op: 'contrast', contrast: Number(val) || 0, addr: v.addr || 0x3C });
      },
    };
  },
};
