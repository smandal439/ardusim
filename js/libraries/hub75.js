// js/libraries/hub75.js — ESP32-HUB75-MatrixPanelI2S-DMA.h plugin
//
// Emulates the mrcodetastic/ESP32-HUB75-MatrixPanelI2S-DMA library against the
// rgb_matrix_64x64 canvas component. Drawing calls write a packed RGBA
// framebuffer into inst.runtimeState.driver (picked up by rgb_matrix_64x64.step()
// when the canvas simulation is running). The HUB75 GPIO pin map is kept for
// wiring realism; no pin-level DMA protocol is simulated.
//
// Usage:
//   MatrixPanel_I2S_DMA *dma_display = nullptr;
//   HUB75_I2S_CFG mxconfig(64, 64, 1);
//   dma_display = new MatrixPanel_I2S_DMA(mxconfig);
//   dma_display->begin();
//   dma_display->fillScreen(dma_display->color4bit(0, 0, 15));

window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['MatrixPanel_I2S_DMA'] = {
  classes: ['MatrixPanel_I2S_DMA', 'HUB75_I2S_CFG'],
  includes: ['<ESP32-HUB75-MatrixPanelI2S-DMA.h>'],
  priority: 50,

  transpile: [
    // MatrixPanel_I2S_DMA *dma_display = nullptr;  ->  var dma_display = null;
    [/\bMatrixPanel_I2S_DMA\s*\*\s*(\w+)\s*=\s*nullptr\s*;/g, 'var $1 = null;'],
    // MatrixPanel_I2S_DMA *dma_display;  ->  var dma_display = null;
    [/\bMatrixPanel_I2S_DMA\s*\*\s*(\w+)\s*;/g, 'var $1 = null;'],
    // C++ pointer member access  ->  JS property access. Only active when the
    // HUB75 header is #included, so other sketches are unaffected.
    [/\b([A-Za-z_]\w*)\s*->\s*([A-Za-z_]\w*)/g, '$1.$2'],
  ],

  constants: {
    // HUB75_I2S_CFG::shift_driver
    SHIFTREG: 0,
    FM6124: 1,
    FM6126A: 2,
    ICN2038S: 3,
    MBI5124: 4,
    SM5266P: 5,
    DP3246_SM5368: 6,
  },

  // One factory serves both classes, disambiguated by the first argument:
  //   new HUB75_I2S_CFG(w, h, chain)     -> config object (__hub75cfg)
  //   new MatrixPanel_I2S_DMA(mxconfig)  -> display object
  constructor: function (a, b, c) {
    function num(v) { return Math.round(Number(v) || 0); }

    // Library default GPIOs (ESP32 default-pins.hpp of the real library).
    // E is -1 upstream (must be set for 1/32-scan 64x64 panels); the simulator
    // defaults it to GPIO32 so the bundled example can wire all 16 lines.
    function defaultCfg() {
      return {
        __hub75cfg: true,
        mx_width: 64,
        mx_height: 64,
        chain_length: 1,
        driver: 0, // SHIFTREG
        double_buff: false,
        clkphase: true,
        latch_blanking: 1,
        min_refresh_rate: 60,
        gpio: {
          r1: 25, g1: 26, b1: 27,
          r2: 14, g2: 12, b2: 13,
          a: 23, b: 19, c: 5, d: 17, e: 32,
          lat: 4, oe: 15, clk: 16,
        },
      };
    }

    if (!(a && typeof a === 'object' && a.__hub75cfg)) {
      // HUB75_I2S_CFG(w = 64, h = 64, chain = 1)
      var cfg = defaultCfg();
      if (a !== undefined && a !== null) cfg.mx_width = num(a) || 64;
      if (b !== undefined && b !== null) cfg.mx_height = num(b) || 64;
      if (c !== undefined && c !== null) cfg.chain_length = num(c) || 1;
      return cfg;
    }

    // ── MatrixPanel_I2S_DMA(mxconfig) ──
    var panel = a;
    var W = panel.mx_width || 64;
    var H = panel.mx_height || 64;
    var fb = new Uint32Array(W * H);
    var drv = { fb: fb, powered: false, brightness: 255, width: W, height: H };
    var st = {
      textSize: 1,
      fg: { r: 255, g: 255, b: 255 },
      bg: null,
      cursorX: 0,
      cursorY: 0,
    };

    // Classic 5x7 ASCII font (0x20-0x7E), 5 bytes per glyph, LSB = top row.
    var FONT = [
      0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x5F,0x00,0x00,
      0x00,0x07,0x00,0x07,0x00,0x14,0x7F,0x14,0x7F,0x14,
      0x24,0x2A,0x7F,0x2A,0x12,0x23,0x13,0x08,0x64,0x62,
      0x36,0x49,0x56,0x20,0x50,0x00,0x08,0x07,0x03,0x00,
      0x00,0x1C,0x22,0x41,0x00,0x00,0x41,0x22,0x1C,0x00,
      0x2A,0x1C,0x7F,0x1C,0x2A,0x08,0x08,0x3E,0x08,0x08,
      0x00,0x80,0x70,0x30,0x00,0x08,0x08,0x08,0x08,0x08,
      0x00,0x00,0x60,0x60,0x00,0x20,0x10,0x08,0x04,0x02,
      0x3E,0x51,0x49,0x45,0x3E,0x00,0x42,0x7F,0x40,0x00,
      0x72,0x49,0x49,0x49,0x46,0x21,0x41,0x49,0x4D,0x33,
      0x18,0x14,0x12,0x7F,0x10,0x27,0x45,0x45,0x45,0x39,
      0x3C,0x4A,0x49,0x49,0x31,0x41,0x21,0x11,0x09,0x07,
      0x36,0x49,0x49,0x49,0x36,0x46,0x49,0x49,0x29,0x1E,
      0x00,0x00,0x14,0x00,0x00,0x00,0x40,0x34,0x00,0x00,
      0x00,0x08,0x14,0x22,0x41,0x14,0x14,0x14,0x14,0x14,
      0x00,0x41,0x22,0x14,0x08,0x02,0x01,0x59,0x09,0x06,
      0x3E,0x41,0x5D,0x59,0x4E,0x7C,0x12,0x11,0x12,0x7C,
      0x7F,0x49,0x49,0x49,0x36,0x3E,0x41,0x41,0x41,0x22,
      0x7F,0x41,0x41,0x41,0x3E,0x7F,0x49,0x49,0x49,0x41,
      0x7F,0x09,0x09,0x09,0x01,0x3E,0x41,0x41,0x51,0x73,
      0x7F,0x08,0x08,0x08,0x7F,0x00,0x41,0x7F,0x41,0x00,
      0x20,0x40,0x41,0x3F,0x01,0x7F,0x08,0x14,0x22,0x41,
      0x7F,0x40,0x40,0x40,0x40,0x7F,0x02,0x1C,0x02,0x7F,
      0x7F,0x04,0x08,0x10,0x7F,0x3E,0x41,0x41,0x41,0x3E,
      0x7F,0x09,0x09,0x09,0x06,0x41,0x51,0x21,0x5E,0x00,
      0x7F,0x09,0x19,0x29,0x46,0x26,0x49,0x49,0x49,0x32,
      0x03,0x01,0x7F,0x01,0x03,0x3F,0x40,0x40,0x40,0x3F,
      0x1F,0x20,0x40,0x20,0x1F,0x3F,0x40,0x38,0x40,0x3F,
      0x63,0x14,0x08,0x14,0x63,0x03,0x04,0x78,0x04,0x03,
      0x61,0x59,0x49,0x4D,0x43,0x00,0x7F,0x41,0x41,0x00,
      0x02,0x04,0x08,0x10,0x20,0x00,0x41,0x41,0x7F,0x00,
      0x04,0x02,0x01,0x02,0x04,0x40,0x40,0x40,0x40,0x40,
      0x00,0x03,0x07,0x08,0x00,0x20,0x54,0x54,0x78,0x40,
      0x7F,0x28,0x44,0x44,0x38,0x38,0x44,0x44,0x44,0x28,
      0x38,0x44,0x44,0x28,0x7F,0x38,0x54,0x54,0x54,0x18,
      0x00,0x08,0x7E,0x09,0x02,0x18,0xA4,0xA4,0x9C,0x78,
      0x7F,0x08,0x04,0x04,0x78,0x00,0x44,0x7D,0x40,0x00,
      0x20,0x40,0x40,0x3D,0x00,0x7F,0x10,0x28,0x44,0x00,
      0x00,0x41,0x7F,0x40,0x00,0x7C,0x04,0x78,0x04,0x78,
      0x7C,0x08,0x04,0x04,0x78,0x38,0x44,0x44,0x44,0x38,
      0xFC,0x18,0x24,0x24,0x18,0x18,0x24,0x24,0x18,0xFC,
      0x7C,0x08,0x04,0x04,0x08,0x48,0x54,0x54,0x54,0x24,
      0x04,0x04,0x3F,0x44,0x24,0x3C,0x40,0x40,0x20,0x7C,
      0x1C,0x20,0x40,0x20,0x1C,0x3C,0x40,0x30,0x40,0x3C,
      0x44,0x28,0x10,0x28,0x44,0x4C,0x90,0x90,0x90,0x7C,
      0x44,0x64,0x54,0x4C,0x44,0x00,0x08,0x36,0x41,0x00,
      0x00,0x00,0x77,0x00,0x00,0x00,0x41,0x36,0x08,0x00,
      0x02,0x01,0x02,0x04,0x02,
    ];

    function rgb(c) {
      if (c && typeof c === 'object') {
        return { r: num(c.r), g: num(c.g), b: num(c.b) };
      }
      var n = Number(c) || 0;
      return { r: (n >> 16) & 0xFF, g: (n >> 8) & 0xFF, b: n & 0xFF };
    }

    function setPx(x, y, col) {
      x = num(x); y = num(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      // Same packing as the rgb_matrix_64x64 component: 0xAABBGGRR
      fb[y * W + x] = (255 << 24) | ((col.b & 0xFF) << 16) | ((col.g & 0xFF) << 8) | (col.r & 0xFF);
    }

    function push() {
      var cc = window.CircuitCanvas;
      if (!cc || !Array.isArray(cc.components)) return null;
      var inst = cc.components.find(function (c) { return c.type === 'rgb_matrix_64x64'; });
      if (!inst) return null;
      if (!inst.runtimeState) inst.runtimeState = {};
      inst.runtimeState.driver = drv;
      return inst;
    }

    function drawChar(cx, cy, ch, fg, bg, sz) {
      var code = ch.charCodeAt(0);
      if (code < 32 || code > 126) return;
      var idx = (code - 32) * 5;
      for (var col = 0; col < 5; col++) {
        var bits = FONT[idx + col] || 0;
        for (var row = 0; row < 7; row++) {
          var on = (bits & (1 << row)) !== 0;
          for (var dy = 0; dy < sz; dy++) {
            for (var dx = 0; dx < sz; dx++) {
              if (on) setPx(cx + col * sz + dx, cy + row * sz + dy, fg);
              else if (bg) setPx(cx + col * sz + dx, cy + row * sz + dy, bg);
            }
          }
        }
      }
    }

    var mod = {
      // ── lifecycle ──
      begin: function () {
        drv.powered = true;
        fb.fill(0);
        push();
        return true;
      },
      setBrightness8: function (b) {
        var v = num(b);
        drv.brightness = v < 0 ? 0 : v > 255 ? 255 : v;
        push();
      },
      flipDMABuffer: function () {},
      clearScreen: function () {
        fb.fill(0);
        push();
      },
      fillScreen: function (c) {
        var col = rgb(c);
        for (var i = 0; i < fb.length; i++) {
          fb[i] = (255 << 24) | ((col.b & 0xFF) << 16) | ((col.g & 0xFF) << 8) | (col.r & 0xFF);
        }
        push();
      },
      getCfg: function () { return panel; },
      width: function () { return W; },
      height: function () { return H; },

      // color4bit(r, g, b) — 4-bit-per-channel colour (0-15 each) -> 8-bit RGB
      color4bit: function (r, g, b) {
        function s(v) {
          var n = num(v);
          return (n < 0 ? 0 : n > 15 ? 15 : n) * 17;
        }
        return { r: s(r), g: s(g), b: s(b) };
      },

      // ── text ──
      setCursor: function (x, y) { st.cursorX = num(x); st.cursorY = num(y); },
      setTextSize: function (s) { st.textSize = Math.max(1, num(s)); },
      setTextColor: function (fg, bg) {
        st.fg = rgb(fg);
        st.bg = bg !== undefined && bg !== null ? rgb(bg) : null;
      },
      print: function (val) {
        var text = String(val !== undefined && val !== null ? val : '');
        var sz = st.textSize;
        for (var i = 0; i < text.length; i++) {
          drawChar(st.cursorX, st.cursorY, text.charAt(i), st.fg, st.bg, sz);
          st.cursorX += 6 * sz;
        }
        push();
      },
      println: function (val) {
        mod.print(val);
        st.cursorX = 0;
        st.cursorY += 8 * st.textSize;
        push();
      },

      // ── drawing ──
      drawPixel: function (x, y, c) { setPx(x, y, rgb(c)); push(); },
      drawLine: function (x0, y0, x1, y1, c) {
        x0 = num(x0); y0 = num(y0); x1 = num(x1); y1 = num(y1);
        var col = rgb(c);
        var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        var dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        var err = dx + dy;
        for (;;) {
          setPx(x0, y0, col);
          if (x0 === x1 && y0 === y1) break;
          var e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
        push();
      },
      drawFastHLine: function (x, y, w, c) {
        var col = rgb(c);
        for (var i = 0; i < num(w); i++) setPx(num(x) + i, y, col);
        push();
      },
      drawFastVLine: function (x, y, h, c) {
        var col = rgb(c);
        for (var i = 0; i < num(h); i++) setPx(x, num(y) + i, col);
        push();
      },
      drawRect: function (x, y, w, h, c) {
        x = num(x); y = num(y); w = num(w); h = num(h);
        var col = rgb(c);
        for (var i = 0; i < w; i++) { setPx(x + i, y, col); setPx(x + i, y + h - 1, col); }
        for (var j = 0; j < h; j++) { setPx(x, y + j, col); setPx(x + w - 1, y + j, col); }
        push();
      },
      fillRect: function (x, y, w, h, c) {
        x = num(x); y = num(y); w = num(w); h = num(h);
        var col = rgb(c);
        for (var py = y; py < y + h; py++) {
          for (var px = x; px < x + w; px++) setPx(px, py, col);
        }
        push();
      },
      drawCircle: function (cx, cy, r, c) {
        cx = num(cx); cy = num(cy); r = num(r);
        var col = rgb(c);
        var x = r, y = 0, err = 1 - r;
        while (x >= y) {
          setPx(cx + x, cy + y, col); setPx(cx - x, cy + y, col);
          setPx(cx + x, cy - y, col); setPx(cx - x, cy - y, col);
          setPx(cx + y, cy + x, col); setPx(cx - y, cy + x, col);
          setPx(cx + y, cy - x, col); setPx(cx - y, cy - x, col);
          y++;
          if (err < 0) err += 2 * y + 1;
          else { x--; err += 2 * (y - x) + 1; }
        }
        push();
      },
      fillCircle: function (cx, cy, r, c) {
        cx = num(cx); cy = num(cy); r = num(r);
        var col = rgb(c);
        for (var yy = -r; yy <= r; yy++) {
          for (var xx = -r; xx <= r; xx++) {
            if (xx * xx + yy * yy <= r * r) setPx(cx + xx, cy + yy, col);
          }
        }
        push();
      },
    };

    push(); // register an (unpowered, black) driver so the component can find us
    return mod;
  },
};
