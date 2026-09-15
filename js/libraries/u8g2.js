// js/libraries/u8g2.js — U8g2 Monochrome Display Library plugin
//
// Supports: U8g2 for I2C/SPI monochrome displays (SSD1306, SH1106, etc.)
// Usage:
//   U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0);
//   u8g2.begin();
//   u8g2.clearBuffer();
//   u8g2.setFont(u8g2_font_ncenB08_tr);
//   u8g2.drawStr(0, 15, "Hello");
//   u8g2.sendBuffer();
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['U8g2'] = {
  classes: ['U8G2_SSD1306_128X64_NONAME_F_HW_I2C', 'U8G2_SSD1306_128X64_ALT_F_HW_I2C', 'U8G2_SH1106_128X64_NONAME_F_HW_I2C', 'U8G2_SSD1306_128X64_VCOMH0_F_HW_I2C', 'U8G2_SSD1306_128X64_1_3_HW_I2C', 'U8G2_SSD1306_64X32_1F_F_HW_I2C', 'U8G2_SSD1306_96X16_1F_F_HW_I2C'],
  includes: ['<U8g2lib.h>'],

  transpile: [
    // u8g2.begin()
    [/(\w+)\.begin\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2Begin(' + v + ')';
    }],
    // u8g2.clearBuffer()
    [/(\w+)\.clearBuffer\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2ClearBuffer(' + v + ')';
    }],
    // u8g2.sendBuffer()
    [/(\w+)\.sendBuffer\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2SendBuffer(' + v + ')';
    }],
    // u8g2.setFont(font)
    [/(\w+)\.setFont\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2SetFont(' + v + ', ' + a + ')';
    }],
    // u8g2.setDrawColor(color)
    [/(\w+)\.setDrawColor\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2SetDrawColor(' + v + ', ' + a + ')';
    }],
    // u8g2.setFontMode(mode)
    [/(\w+)\.setFontMode\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2SetFontMode(' + v + ', ' + a + ')';
    }],
    // u8g2.drawStr(x, y, str)
    [/(\w+)\.drawStr\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2DrawStr(' + v + ', ' + a + ')';
    }],
    // u8g2.drawPixel(x, y)
    [/(\w+)\.drawPixel\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2DrawPixel(' + v + ', ' + a + ')';
    }],
    // u8g2.drawBox(x, y, w, h)
    [/(\w+)\.drawBox\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2DrawBox(' + v + ', ' + a + ')';
    }],
    // u8g2.drawFrame(x, y, w, h)
    [/(\w+)\.drawFrame\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2DrawFrame(' + v + ', ' + a + ')';
    }],
    // u8g2.drawRBox(x, y, w, h, r)
    [/(\w+)\.drawRBox\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2DrawRBox(' + v + ', ' + a + ')';
    }],
    // u8g2.drawRFrame(x, y, w, h, r)
    [/(\w+)\.drawRFrame\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2DrawRFrame(' + v + ', ' + a + ')';
    }],
    // u8g2.drawCircle(cx, cy, r, opt)
    [/(\w+)\.drawCircle\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2DrawCircle(' + v + ', ' + a + ')';
    }],
    // u8g2.drawDisc(cx, cy, r, opt)
    [/(\w+)\.drawDisc\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2DrawDisc(' + v + ', ' + a + ')';
    }],
    // u8g2.drawLine(x0, y0, x1, y1)
    [/(\w+)\.drawLine\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2DrawLine(' + v + ', ' + a + ')';
    }],
    // u8g2.drawHLine(x, y, w)
    [/(\w+)\.drawHLine\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2DrawHLine(' + v + ', ' + a + ')';
    }],
    // u8g2.drawVLine(x, y, h)
    [/(\w+)\.drawVLine\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2DrawVLine(' + v + ', ' + a + ')';
    }],
    // u8g2.drawTriangle(x0,y0,x1,y1,x2,y2)
    [/(\w+)\.drawTriangle\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2DrawTriangle(' + v + ', ' + a + ')';
    }],
    // u8g2.getWidth()
    [/(\w+)\.getWidth\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2GetWidth(' + v + ')';
    }],
    // u8g2.getHeight()
    [/(\w+)\.getHeight\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2GetHeight(' + v + ')';
    }],
    // u8g2.setFontPosTop()
    [/(\w+)\.setFontPosTop\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2SetFontPosTop(' + v + ')';
    }],
    // u8g2.setFontPosBaseline()
    [/(\w+)\.setFontPosBaseline\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2SetFontPosBaseline(' + v + ')';
    }],
    // u8g2.setFontPosBottom()
    [/(\w+)\.setFontPosBottom\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.u8g2SetFontPosBottom(' + v + ')';
    }],
  ],

  constants: {
    U8G2_R0: 0,
    U8G2_R1: 1,
    U8G2_R2: 2,
    U8G2_R3: 3,
    U8G2_MIRROR: 4,
    U8G2_DRAW_ALL: 255,
    // Common font names (passed as string constants)
    u8g2_font_ncenB08_tr: 'u8g2_font_ncenB08_tr',
    u8g2_font_ncenB14_tr: 'u8g2_font_ncenB14_tr',
    u8g2_font_5x7_tr: 'u8g2_font_5x7_tr',
    u8g2_font_5x7_tf: 'u8g2_font_5x7_tf',
    u8g2_font_6x10_tr: 'u8g2_font_6x10_tr',
    u8g2_font_6x10_tf: 'u8g2_font_6x10_tf',
    u8g2_font_7x14_tr: 'u8g2_font_7x14_tr',
    u8g2_font_7x14_tf: 'u8g2_font_7x14_tf',
    u8g2_font_8x13_tr: 'u8g2_font_8x13_tr',
    u8g2_font_8x13_tf: 'u8g2_font_8x13_tf',
    u8g2_font_9x15_tr: 'u8g2_font_9x15_tr',
    u8g2_font_9x15_tf: 'u8g2_font_9x15_tf',
    u8g2_font_10x20_tr: 'u8g2_font_10x20_tr',
    u8g2_font_10x20_tf: 'u8g2_font_10x20_tf',
  },

  constructor: function(rotation) {
    return {
      __u8g2: true,
      _w: 128,
      _h: 64,
      _rotation: rotation || 0,
      _font: 'u8g2_font_ncenB08_tr',
      _drawColor: 1,
      _fontMode: 0,
      _fontPosTop: false,
      begin: function() {},
      clearBuffer: function() {},
      sendBuffer: function() {},
      setFont: function(font) { this._font = font; },
      setDrawColor: function(c) { this._drawColor = c; },
      setFontMode: function(m) { this._fontMode = m; },
      drawStr: function(x, y, str) {},
      drawPixel: function(x, y) {},
      drawBox: function(x, y, w, h) {},
      drawFrame: function(x, y, w, h) {},
      drawRBox: function(x, y, w, h, r) {},
      drawRFrame: function(x, y, w, h, r) {},
      drawCircle: function(cx, cy, r, opt) {},
      drawDisc: function(cx, cy, r, opt) {},
      drawLine: function(x0, y0, x1, y1) {},
      drawHLine: function(x, y, w) {},
      drawVLine: function(x, y, h) {},
      drawTriangle: function(x0, y0, x1, y1, x2, y2) {},
      getWidth: function() { return this._w; },
      getHeight: function() { return this._h; },
      setFontPosTop: function() { this._fontPosTop = true; },
      setFontPosBaseline: function() { this._fontPosTop = false; },
      setFontPosBottom: function() { this._fontPosTop = false; },
    };
  },

  runtime: function(self) {
    function num(v) { return Math.round(Number(v) || 0); }
    function emitU8g2(op, extra) { self._emitEvent('u8g2_draw', Object.assign({ op: op }, extra)); }

    return {
      u8g2Begin: function(v) {
        self._emitEvent('u8g2_power', { on: true });
      },
      u8g2ClearBuffer: function(v) {
        emitU8g2('clear');
      },
      u8g2SendBuffer: function(v) {
        emitU8g2('send');
      },
      u8g2SetFont: function(v, font) {
        if (v) v._font = String(font).replace(/"/g, '');
      },
      u8g2SetDrawColor: function(v, c) {
        if (v) v._drawColor = num(c);
      },
      u8g2SetFontMode: function(v, m) {
        if (v) v._fontMode = num(m);
      },
      u8g2DrawStr: function(v, x, y, str) {
        var text = String(str !== undefined ? str : '').replace(/"/g, '');
        emitU8g2('drawStr', { x: num(x), y: num(y), text: text, font: v ? v._font : 'u8g2_font_ncenB08_tr', color: v ? v._drawColor : 1 });
      },
      u8g2DrawPixel: function(v, x, y) {
        emitU8g2('pixel', { x: num(x), y: num(y), color: v ? v._drawColor : 1 });
      },
      u8g2DrawBox: function(v, x, y, w, h) {
        emitU8g2('box', { x: num(x), y: num(y), w: num(w), h: num(h), color: v ? v._drawColor : 1 });
      },
      u8g2DrawFrame: function(v, x, y, w, h) {
        emitU8g2('frame', { x: num(x), y: num(y), w: num(w), h: num(h), color: v ? v._drawColor : 1 });
      },
      u8g2DrawRBox: function(v, x, y, w, h, r) {
        emitU8g2('rbox', { x: num(x), y: num(y), w: num(w), h: num(h), r: num(r), color: v ? v._drawColor : 1 });
      },
      u8g2DrawRFrame: function(v, x, y, w, h, r) {
        emitU8g2('rframe', { x: num(x), y: num(y), w: num(w), h: num(h), r: num(r), color: v ? v._drawColor : 1 });
      },
      u8g2DrawCircle: function(v, cx, cy, r, opt) {
        emitU8g2('circle', { x: num(cx), y: num(cy), r: num(r), opt: num(opt), color: v ? v._drawColor : 1 });
      },
      u8g2DrawDisc: function(v, cx, cy, r, opt) {
        emitU8g2('disc', { x: num(cx), y: num(cy), r: num(r), opt: num(opt), color: v ? v._drawColor : 1 });
      },
      u8g2DrawLine: function(v, x0, y0, x1, y1) {
        emitU8g2('line', { x0: num(x0), y0: num(y0), x1: num(x1), y1: num(y1), color: v ? v._drawColor : 1 });
      },
      u8g2DrawHLine: function(v, x, y, w) {
        emitU8g2('hline', { x: num(x), y: num(y), w: num(w), color: v ? v._drawColor : 1 });
      },
      u8g2DrawVLine: function(v, x, y, h) {
        emitU8g2('vline', { x: num(x), y: num(y), h: num(h), color: v ? v._drawColor : 1 });
      },
      u8g2DrawTriangle: function(v, x0, y0, x1, y1, x2, y2) {
        emitU8g2('triangle', { x0: num(x0), y0: num(y0), x1: num(x1), y1: num(y1), x2: num(x2), y2: num(y2), color: v ? v._drawColor : 1 });
      },
      u8g2GetWidth: function(v) { return v ? v._w : 128; },
      u8g2GetHeight: function(v) { return v ? v._h : 64; },
      u8g2SetFontPosTop: function(v) { if (v) v._fontPosTop = true; },
      u8g2SetFontPosBaseline: function(v) { if (v) v._fontPosTop = false; },
      u8g2SetFontPosBottom: function(v) { if (v) v._fontPosTop = false; },
    };
  },
};
