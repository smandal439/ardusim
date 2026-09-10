window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Adafruit_ILI9341'] = {
  classes: ['Adafruit_ILI9341'],
  includes:['<Adafruit_ILI9341.h>'],
  transpile: [
    [/(\w+)\.begin\s*\(\s*\)/g, '_a.tftBegin($1)'],
    [/(\w+)\.setTextColor\(/g, '_a.tftSetTextColor($1, '],
    [/(\w+)\.setTextSize\(/g, '_a.tftSetTextSize($1, '],
    [/(\w+)\.setTextWrap\(/g, '_a.tftSetTextWrap($1, '],
    [/(\w+)\.setRotation\(/g, '_a.tftSetRotation($1, '],
    [/(\w+)\.drawPixel\(/g, '_a.tftDrawPixel($1, '],
    [/(\w+)\.drawLine\(/g, '_a.tftDrawLine($1, '],
    [/(\w+)\.drawRect\(/g, '_a.tftDrawRect($1, '],
    [/(\w+)\.fillRect\(/g, '_a.tftFillRect($1, '],
    [/(\w+)\.drawCircle\(/g, '_a.tftDrawCircle($1, '],
    [/(\w+)\.fillCircle\(/g, '_a.tftFillCircle($1, '],
    [/(\w+)\.fillScreen\(/g, '_a.tftFillScreen($1, '],
    [/(\w+)\.drawRoundRect\(/g, '_a.tftDrawRoundRect($1, '],
    [/(\w+)\.fillRoundRect\(/g, '_a.tftFillRoundRect($1, '],
    [/(\w+)\.drawTriangle\(/g, '_a.tftDrawTriangle($1, '],
    [/(\w+)\.fillTriangle\(/g, '_a.tftFillTriangle($1, '],
    [/(\w+)\.drawChar\(/g, '_a.tftDrawChar($1, '],
  ],
  constants: {
    ILI9341_BLACK: 0x0000,
    ILI9341_WHITE: 0xFFFF,
    ILI9341_RED: 0xF800,
    ILI9341_GREEN: 0x07E0,
    ILI9341_BLUE: 0x001F,
    ILI9341_CYAN: 0x07FF,
    ILI9341_MAGENTA: 0xF81F,
    ILI9341_YELLOW: 0xFFE0,
    ILI9341_ORANGE: 0xFD20,
    ILI9341_DARKGREEN: 0x03E0,
    ILI9341_DARKGREY: 0x7BEF,
    ILI9341_NAVY: 0x000F,
    ILI9341_MAROON: 0x7800,
    ILI9341_PURPLE: 0x780F,
    ILI9341_OLIVE: 0x7BE0,
    ILI9341_LIGHTGREY: 0xC618,
    ILI9341_DARKCYAN: 0x03EF,
  },
  constructor: function(cs, dc, mosi, sck, rst) {
    return { __tft: true, cs: cs, dc: dc, mosi: mosi, sck: sck, rst: rst };
  },
  runtime: function(self) {
    var num = function(v) { return Math.round(Number(v) || 0); };
    var drawTft = function(op, extra) { self._emitEvent('tft_draw', Object.assign({ op: op }, extra)); };
    function tftFormatText(val, decimals) {
      var n = Number(val);
      if (typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && Number.isFinite(n))) {
        if (!Number.isInteger(n) && Number.isFinite(Number(decimals))) {
          return n.toFixed(Math.max(0, Math.min(6, Number(decimals))));
        }
      }
      return String(val);
    }
    return {
      tftBegin: function(varName) { self._emitEvent('tft_power', { on: true }); },
      tftSetCursor: function(varName, col, row) {
        if (varName && varName.__tft) self._tftCursor = { col: num(col), row: num(row) };
      },
      tftPrint: function(varName, val, decimals) {
        if (!varName || !varName.__tft) return;
        var text = tftFormatText(val, decimals);
        var cursor = self._tftCursor || { col: 0, row: 0 };
        var size = self._tftTextSize || 1;
        var fg = self._tftFgColor != null ? self._tftFgColor : 0xFFFF;
        var bg = self._tftBgColor != null ? self._tftBgColor : 0x0000;
        drawTft('print', { text: text, x: cursor.col, y: cursor.row, size: size, fg: fg, bg: bg });
        self._tftCursor = { col: cursor.col + text.length * 6 * size, row: cursor.row };
      },
      tftPrintln: function(varName, val, decimals) {
        if (!varName || !varName.__tft) return;
        var text = tftFormatText(val, decimals);
        var cursor = self._tftCursor || { col: 0, row: 0 };
        var size = self._tftTextSize || 1;
        var fg = self._tftFgColor != null ? self._tftFgColor : 0xFFFF;
        var bg = self._tftBgColor != null ? self._tftBgColor : 0x0000;
        drawTft('print', { text: text, x: cursor.col, y: cursor.row, size: size, fg: fg, bg: bg });
        self._tftCursor = { col: 0, row: cursor.row + 8 * size };
      },
      tftSetTextColor: function(varName, fg, bg) {
        if (varName && varName.__tft) {
          self._tftFgColor = num(fg) || 0xFFFF;
          self._tftBgColor = bg != null ? (num(bg) || 0x0000) : self._tftFgColor;
        }
      },
      tftSetTextSize: function(varName, s) {
        if (varName && varName.__tft) self._tftTextSize = Math.max(1, Math.round(Number(s) || 1));
      },
      tftSetTextWrap: function(varName, w) { },
      tftSetRotation: function(varName, r) { },
      tftDrawPixel: function(varName, x, y, color) {
        if (varName && varName.__tft) drawTft('pixel', { x: num(x), y: num(y), color: num(color) || 0xFFFF });
      },
      tftDrawLine: function(varName, x0, y0, x1, y1, color) {
        if (varName && varName.__tft) drawTft('line', { x0: num(x0), y0: num(y0), x1: num(x1), y1: num(y1), color: num(color) || 0xFFFF });
      },
      tftDrawRect: function(varName, x, y, w, h, color) {
        if (varName && varName.__tft) drawTft('rect', { x: num(x), y: num(y), w: num(w), h: num(h), color: num(color) || 0xFFFF });
      },
      tftFillRect: function(varName, x, y, w, h, color) {
        if (varName && varName.__tft) drawTft('fillRect', { x: num(x), y: num(y), w: num(w), h: num(h), color: num(color) || 0x0000 });
      },
      tftDrawCircle: function(varName, cx, cy, r, color) {
        if (varName && varName.__tft) drawTft('circle', { x: num(cx), y: num(cy), r: num(r), color: num(color) || 0xFFFF });
      },
      tftFillCircle: function(varName, cx, cy, r, color) {
        if (varName && varName.__tft) drawTft('fillCircle', { x: num(cx), y: num(cy), r: num(r), color: num(color) || 0x0000 });
      },
      tftFillScreen: function(varName, color) {
        if (varName && varName.__tft) drawTft('fillScreen', { color: num(color) || 0x0000 });
      },
      tftDrawRoundRect: function(varName, x, y, w, h, r, color) {
        if (varName && varName.__tft) drawTft('roundRect', { x: num(x), y: num(y), w: num(w), h: num(h), r: num(r), color: num(color) || 0xFFFF });
      },
      tftFillRoundRect: function(varName, x, y, w, h, r, color) {
        if (varName && varName.__tft) drawTft('fillRoundRect', { x: num(x), y: num(y), w: num(w), h: num(h), r: num(r), color: num(color) || 0x0000 });
      },
      tftDrawTriangle: function(varName, x0, y0, x1, y1, x2, y2, color) {
        if (varName && varName.__tft) drawTft('triangle', { x0: num(x0), y0: num(y0), x1: num(x1), y1: num(y1), x2: num(x2), y2: num(y2), color: num(color) || 0xFFFF });
      },
      tftFillTriangle: function(varName, x0, y0, x1, y1, x2, y2, color) {
        if (varName && varName.__tft) drawTft('fillTriangle', { x0: num(x0), y0: num(y0), x1: num(x1), y1: num(y1), x2: num(x2), y2: num(y2), color: num(color) || 0x0000 });
      },
      tftDrawChar: function(varName, x, y, c, color, bg, size) {
        if (varName && varName.__tft) drawTft('char', { x: num(x), y: num(y), char: String(c), color: num(color) || 0xFFFF, bg: num(bg) || 0x0000, size: num(size) || 1 });
      },
    };
  },
};
