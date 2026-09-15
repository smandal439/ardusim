// js/libraries/tft_espi.js — TFT_eSPI Display Library plugin
//
// Supports: TFT_eSPI fast TFT display (ILI9341, ST7789, etc.)
// Usage:
//   TFT_eSPI tft = TFT_eSPI();
//   tft.init();
//   tft.setRotation(1);
//   tft.fillScreen(TFT_BLACK);
//   tft.setTextColor(TFT_WHITE, TFT_BLACK);
//   tft.drawString("Hello", 10, 10, 4);
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['TFT_eSPI'] = {
  classes: ['TFT_eSPI'],
  includes: ['<TFT_eSPI.h>'],

  transpile: [
    // tft.init()
    [/(\w+)\.init\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftInit(' + v + ')';
    }],
    // tft.begin()
    [/(\w+)\.begin\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftInit(' + v + ')';
    }],
    // tft.setRotation(rotation)
    [/(\w+)\.setRotation\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftSetRotation(' + v + ', ' + a + ')';
    }],
    // tft.fillScreen(color)
    [/(\w+)\.fillScreen\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftFillScreen(' + v + ', ' + a + ')';
    }],
    // tft.fillScreen(color)
    [/(\w+)\.fill\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftFillScreen(' + v + ', ' + a + ')';
    }],
    // tft.setTextColor(fg, bg)
    [/(\w+)\.setTextColor\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftSetTextColor(' + v + ', ' + a + ')';
    }],
    // tft.setTextSize(size)
    [/(\w+)\.setTextSize\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftSetTextSize(' + v + ', ' + a + ')';
    }],
    // tft.setTextDatum(datum)
    [/(\w+)\.setTextDatum\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftSetTextDatum(' + v + ', ' + a + ')';
    }],
    // tft.drawString(str, x, y, font)
    [/(\w+)\.drawString\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftDrawString(' + v + ', ' + a + ')';
    }],
    // tft.setCursor(x, y)
    [/(\w+)\.setCursor\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftSetCursor(' + v + ', ' + a + ')';
    }],
    // tft.print(data)
    [/(\w+)\.print\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftPrint(' + v + ', ' + a + ')';
    }],
    // tft.println(data)
    [/(\w+)\.println\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftPrintln(' + v + ', ' + a + ')';
    }],
    // tft.drawPixel(x, y, color)
    [/(\w+)\.drawPixel\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftDrawPixel(' + v + ', ' + a + ')';
    }],
    // tft.drawLine(x0, y0, x1, y1, color)
    [/(\w+)\.drawLine\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftDrawLine(' + v + ', ' + a + ')';
    }],
    // tft.drawFastHLine(x, y, w, color)
    [/(\w+)\.drawFastHLine\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftDrawFastHLine(' + v + ', ' + a + ')';
    }],
    // tft.drawFastVLine(x, y, h, color)
    [/(\w+)\.drawFastVLine\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftDrawFastVLine(' + v + ', ' + a + ')';
    }],
    // tft.drawRect(x, y, w, h, color)
    [/(\w+)\.drawRect\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftDrawRect(' + v + ', ' + a + ')';
    }],
    // tft.fillRect(x, y, w, h, color)
    [/(\w+)\.fillRect\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftFillRect(' + v + ', ' + a + ')';
    }],
    // tft.drawCircle(cx, cy, r, color)
    [/(\w+)\.drawCircle\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftDrawCircle(' + v + ', ' + a + ')';
    }],
    // tft.fillCircle(cx, cy, r, color)
    [/(\w+)\.fillCircle\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftFillCircle(' + v + ', ' + a + ')';
    }],
    // tft.drawRoundRect(x, y, w, h, r, color)
    [/(\w+)\.drawRoundRect\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftDrawRoundRect(' + v + ', ' + a + ')';
    }],
    // tft.fillRoundRect(x, y, w, h, r, color)
    [/(\w+)\.fillRoundRect\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftFillRoundRect(' + v + ', ' + a + ')';
    }],
    // tft.drawTriangle(x0,y0,x1,y1,x2,y2,color)
    [/(\w+)\.drawTriangle\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftDrawTriangle(' + v + ', ' + a + ')';
    }],
    // tft.fillTriangle(x0,y0,x1,y1,x2,y2,color)
    [/(\w+)\.fillTriangle\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftFillTriangle(' + v + ', ' + a + ')';
    }],
    // tft.pushSprite(x, y)
    [/(\w+)\.pushSprite\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftPushSprite(' + v + ', ' + a + ')';
    }],
    // tft.width()
    [/(\w+)\.width\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftWidth(' + v + ')';
    }],
    // tft.height()
    [/(\w+)\.height\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftHeight(' + v + ')';
    }],
    // tft.setTextColor(fg) single-arg variant
    [/(\w+)\.setTextColor\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftSetTextColor(' + v + ', ' + a + ')';
    }],
    // tft.drawChar(x, y, c, color, bg, size)
    [/(\w+)\.drawChar\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftDrawChar(' + v + ', ' + a + ')';
    }],
    // tft.setTextSize(s)
    [/(\w+)\.setTextSize\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.tftSetTextSize(' + v + ', ' + a + ')';
    }],
  ],

  constants: {
    TFT_BLACK: 0x0000,
    TFT_NAVY: 0x000F,
    TFT_DARKGREEN: 0x03E0,
    TFT_DARKCYAN: 0x03EF,
    TFT_MAROON: 0x7800,
    TFT_PURPLE: 0x780F,
    TFT_OLIVE: 0x7BE0,
    TFT_LIGHTGREY: 0xC618,
    TFT_DARKGREY: 0x7BEF,
    TFT_BLUE: 0x001F,
    TFT_GREEN: 0x07E0,
    TFT_CYAN: 0x07FF,
    TFT_RED: 0xF800,
    TFT_MAGENTA: 0xF81F,
    TFT_YELLOW: 0xFFE0,
    TFT_WHITE: 0xFFFF,
    TFT_ORANGE: 0xFD20,
    TFT_GREENYELLOW: 0xAFE5,
    TFT_PINK: 0xF81F,
    // Text datum constants
    TL_DATUM: 0,
    TC_DATUM: 1,
    TR_DATUM: 2,
    ML_DATUM: 3,
    MC_DATUM: 4,
    MR_DATUM: 5,
    BL_DATUM: 6,
    BC_DATUM: 7,
    BR_DATUM: 8,
  },

  constructor: function() {
    return {
      __tft: true,
      _w: 240,
      _h: 320,
      _rotation: 0,
      _textSize: 2,
      _textFg: 0xFFFF,
      _textBg: 0x0000,
      _cursorX: 0,
      _cursorY: 0,
      _textDatum: 0,
      init: function() {},
      begin: function() {},
      setRotation: function(r) { this._rotation = r; },
      fillScreen: function(c) {},
      setTextColor: function(fg, bg) { this._textFg = fg; this._textBg = bg !== undefined ? bg : fg; },
      setTextSize: function(s) { this._textSize = s; },
      setTextDatum: function(d) { this._textDatum = d; },
      setCursor: function(x, y) { this._cursorX = x; this._cursorY = y; },
      drawString: function(str, x, y, font) {},
      print: function(v) {},
      println: function(v) {},
      drawPixel: function(x, y, c) {},
      drawLine: function(x0, y0, x1, y1, c) {},
      drawFastHLine: function(x, y, w, c) {},
      drawFastVLine: function(x, y, h, c) {},
      drawRect: function(x, y, w, h, c) {},
      fillRect: function(x, y, w, h, c) {},
      drawCircle: function(cx, cy, r, c) {},
      fillCircle: function(cx, cy, r, c) {},
      drawRoundRect: function(x, y, w, h, r, c) {},
      fillRoundRect: function(x, y, w, h, r, c) {},
      drawTriangle: function(x0, y0, x1, y1, x2, y2, c) {},
      fillTriangle: function(x0, y0, x1, y1, x2, y2, c) {},
      pushSprite: function(x, y) {},
      drawChar: function(x, y, c, color, bg, size) {},
      width: function() { return this._w; },
      height: function() { return this._h; },
    };
  },

  runtime: function(self) {
    function num(v) { return Math.round(Number(v) || 0); }
    function emitTft(op, extra) { self._emitEvent('tft_draw', Object.assign({ op: op }, extra)); }

    return {
      tftInit: function(v) {
        self._emitEvent('tft_power', { on: true });
      },
      tftSetRotation: function(v, r) {
        if (v) v._rotation = num(r);
      },
      tftFillScreen: function(v, color) {
        emitTft('fillScreen', { color: num(color) });
      },
      tftSetTextColor: function(v, fg, bg) {
        if (v) { v._textFg = num(fg); v._textBg = bg !== undefined ? num(bg) : num(fg); }
      },
      tftSetTextSize: function(v, s) {
        if (v) v._textSize = Math.max(1, num(s));
      },
      tftSetTextDatum: function(v, d) {
        if (v) v._textDatum = num(d);
      },
      tftSetCursor: function(v, x, y) {
        if (v) { v._cursorX = num(x); v._cursorY = num(y); }
      },
      tftDrawString: function(v, str, x, y, font) {
        var text = String(str !== undefined ? str : '').replace(/"/g, '');
        emitTft('print', { text: text, x: num(x), y: num(y), size: (v ? v._textSize : 2), fg: (v ? v._textFg : 0xFFFF), bg: (v ? v._textBg : 0x0000) });
      },
      tftPrint: function(v, val) {
        var text = String(val !== undefined ? val : '');
        var cursor = v ? { x: v._cursorX, y: v._cursorY } : { x: 0, y: 0 };
        var size = v ? v._textSize : 2;
        emitTft('print', { text: text, x: cursor.x, y: cursor.y, size: size, fg: (v ? v._textFg : 0xFFFF), bg: (v ? v._textBg : 0x0000) });
        if (v) v._cursorX += text.length * 6 * size;
      },
      tftPrintln: function(v, val) {
        var text = String(val !== undefined ? val : '');
        var cursor = v ? { x: v._cursorX, y: v._cursorY } : { x: 0, y: 0 };
        var size = v ? v._textSize : 2;
        emitTft('print', { text: text, x: cursor.x, y: cursor.y, size: size, fg: (v ? v._textFg : 0xFFFF), bg: (v ? v._textBg : 0x0000) });
        if (v) { v._cursorX = 0; v._cursorY += 8 * size; }
      },
      tftDrawPixel: function(v, x, y, color) {
        emitTft('pixel', { x: num(x), y: num(y), color: num(color) || 0xFFFF });
      },
      tftDrawLine: function(v, x0, y0, x1, y1, color) {
        emitTft('line', { x0: num(x0), y0: num(y0), x1: num(x1), y1: num(y1), color: num(color) || 0xFFFF });
      },
      tftDrawFastHLine: function(v, x, y, w, color) {
        emitTft('line', { x0: num(x), y0: num(y), x1: num(x) + num(w) - 1, y1: num(y), color: num(color) || 0xFFFF });
      },
      tftDrawFastVLine: function(v, x, y, h, color) {
        emitTft('line', { x0: num(x), y0: num(y), x1: num(x), y1: num(y) + num(h) - 1, color: num(color) || 0xFFFF });
      },
      tftDrawRect: function(v, x, y, w, h, color) {
        emitTft('rect', { x: num(x), y: num(y), w: num(w), h: num(h), color: num(color) || 0xFFFF });
      },
      tftFillRect: function(v, x, y, w, h, color) {
        emitTft('fillRect', { x: num(x), y: num(y), w: num(w), h: num(h), color: num(color) || 0x0000 });
      },
      tftDrawCircle: function(v, cx, cy, r, color) {
        emitTft('circle', { x: num(cx), y: num(cy), r: num(r), color: num(color) || 0xFFFF });
      },
      tftFillCircle: function(v, cx, cy, r, color) {
        emitTft('fillCircle', { x: num(cx), y: num(cy), r: num(r), color: num(color) || 0x0000 });
      },
      tftDrawRoundRect: function(v, x, y, w, h, r, color) {
        emitTft('roundRect', { x: num(x), y: num(y), w: num(w), h: num(h), r: num(r), color: num(color) || 0xFFFF });
      },
      tftFillRoundRect: function(v, x, y, w, h, r, color) {
        emitTft('fillRoundRect', { x: num(x), y: num(y), w: num(w), h: num(h), r: num(r), color: num(color) || 0x0000 });
      },
      tftDrawTriangle: function(v, x0, y0, x1, y1, x2, y2, color) {
        emitTft('triangle', { x0: num(x0), y0: num(y0), x1: num(x1), y1: num(y1), x2: num(x2), y2: num(y2), color: num(color) || 0xFFFF });
      },
      tftFillTriangle: function(v, x0, y0, x1, y1, x2, y2, color) {
        emitTft('fillTriangle', { x0: num(x0), y0: num(y0), x1: num(x1), y1: num(y1), x2: num(x2), y2: num(y2), color: num(color) || 0x0000 });
      },
      tftPushSprite: function(v, x, y) {},
      tftDrawChar: function(v, x, y, c, color, bg, size) {
        emitTft('char', { x: num(x), y: num(y), char: String(c), color: num(color) || 0xFFFF, bg: num(bg) || 0x0000, size: num(size) || 2 });
      },
      tftWidth: function(v) { return v ? v._w : 240; },
      tftHeight: function(v) { return v ? v._h : 320; },
    };
  },
};
