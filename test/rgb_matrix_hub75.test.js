/**
 * test/rgb_matrix_hub75.test.js — RGB LED Matrix 64x64 + HUB75 DMA plugin:
 *   - rgb_matrix_64x64 component step() contract (canvas calls def.step, not def.update)
 *   - driver-framebuffer mode (hub75 library streaming wins over procedural patterns)
 *   - ESP32-HUB75-MatrixPanelI2S-DMA plugin registration, include-gating, transpile
 *   - HUB75_I2S_CFG defaults / MatrixPanel_I2S_DMA drawing API
 *   - bundled examples: rgb_matrix_demo + esp32_hub75_matrixpaneli2s_dma
 *   - end-to-end: transpiled example sketch paints the matrix driver framebuffer
 * Run: npx vitest run test/rgb_matrix_hub75.test.js
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ── Minimal browser-like globals (same pattern as test/tm1637.test.js) ── */
global.window = {
  ArduinoLibs: {},
  ArduinoComponents: { COMPONENT_DEFS: {} },
  CircuitCanvas: null,
  EXAMPLE_SKETCHES: [],
  addEventListener() {},
  removeEventListener() {},
};
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  createElement: () => ({ style: {}, getContext: () => null, appendChild() {} }),
  addEventListener() {},
  removeEventListener() {},
};
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};

function loadScripts(files, names) {
  const code = files.map(readSrc).join('\n;\n');
  const fn = new Function('window', 'document',
    code + '\n;return {' + names.map(n => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ') + '};');
  return fn(global.window, global.document);
}

const { CircuitCanvas } = loadScripts([
  'js/electrical.js',
  'js/components/base.js',
  'js/components/boards.js',
  'js/components/input.js',
  'js/components/output.js',
  'js/canvas.js',
], ['CircuitCanvas']);

const { ArduinoSimulator } = loadScripts([
  'js/simulator.js',
  'js/libraries/serial.js',
  'js/libraries/math.js',
  'js/libraries/hub75.js',
], ['ArduinoSimulator']);

const HUB_LIB = global.window.ArduinoLibs['MatrixPanel_I2S_DMA'];
const DEF = global.window.ArduinoComponents.COMPONENT_DEFS.rgb_matrix_64x64;
const DEFS = global.window.ArduinoComponents.COMPONENT_DEFS;

const PACK = (r, g, b) => ((255 << 24) | ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)) >>> 0;

function makeCanvasStub() {
  const ctx = new Proxy({}, {
    get(_, prop) {
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop() {} });
      }
      return () => {};
    },
    set: () => true,
  });
  const canvasEl = {
    width: 900, height: 600, style: {}, parentElement: null,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 600 }),
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, focus() {},
  };
  const wrapperEl = {
    clientWidth: 900, clientHeight: 600,
    appendChild() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 600 }),
  };
  return { canvasEl, wrapperEl, ctx };
}

function buildRig() {
  const { canvasEl, wrapperEl } = makeCanvasStub();
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  cc.components = [{ id: 'mx1', type: 'rgb_matrix_64x64', x: 200, y: 100, props: { brightness: 80, testPattern: 1 }, runtimeState: {} }];
  cc.wires = [];
  const sim = new ArduinoSimulator();
  sim.board = 'esp32_devkit_v1';
  global.window.ArduinoSim = sim;
  global.window.CircuitCanvas = cc;
  return { cc, sim, mx1: cc.components[0] };
}

const runningSim = () => ({ isRunning: true, time: 1000 });

function litCount(fb) {
  let n = 0;
  for (let i = 0; i < fb.length; i++) {
    const v = fb[i] >>> 0;
    if ((v & 0xFFFFFF) !== 0) n++;
  }
  return n;
}

/* ── bundled examples ──────────────────────────────────────────── */
const exDemo = JSON.parse(readSrc('Examples/rgb_matrix_demo.json'));
const exHub = JSON.parse(readSrc('Examples/esp32_hub75_matrixpaneli2s_dma.json'));

function expectValidCircuit(ex) {
  const byId = Object.fromEntries(ex.circuit.components.map(c => [c.id, c]));
  expect(Object.keys(byId).length).toBe(ex.circuit.components.length);
  for (const w of ex.circuit.wires) {
    for (const end of [w.from, w.to]) {
      const inst = byId[end.instId];
      expect(inst, `wire ${w.id}: unknown component ${end.instId}`).toBeTruthy();
      const def = DEFS[inst.type];
      expect(def, `wire ${w.id}: no def for ${inst.type}`).toBeTruthy();
      const pin = def.pins.find(p => p.id === end.pinId);
      expect(pin, `wire ${w.id}: ${inst.type} has no pin ${end.pinId}`).toBeTruthy();
    }
  }
}

/* ══════════════════════════════════════════════════════════════════ */

describe('rgb_matrix_64x64 component — step() contract', () => {
  afterEach(() => { global.window.CircuitCanvas = null; });

  it('defines step() — the canvas pipeline hook (regression: was update())', () => {
    expect(DEF).toBeTruthy();
    expect(typeof DEF.step).toBe('function');
    expect(DEF.update).toBeUndefined();
  });

  it('creates a packed framebuffer with lit gradient pixels while running', () => {
    const inst = { id: 'm', type: 'rgb_matrix_64x64', x: 0, y: 0, props: { brightness: 80, testPattern: 1 }, runtimeState: {} };
    DEF.step(inst, runningSim());
    expect(inst.runtimeState.framebuffer).toBeInstanceOf(Uint32Array);
    expect(inst.runtimeState.framebuffer.length).toBe(64 * 64);
    expect(litCount(inst.runtimeState.framebuffer)).toBeGreaterThan(1000);
    // gradient corner: x=63 -> full red channel (scaled by 80% brightness)
    const corner = inst.runtimeState.framebuffer[63 * 64 + 63] >>> 0;
    expect(corner & 0xFF).toBe(204); // 255 * 0.8
  });

  it('is a no-op without a running simulation', () => {
    const inst = { id: 'm', type: 'rgb_matrix_64x64', x: 0, y: 0, props: {}, runtimeState: {} };
    DEF.step(inst, null);
    expect(inst.runtimeState.framebuffer).toBeUndefined();
  });

  it('prefers a powered hub75 driver framebuffer over procedural patterns', () => {
    const driverFb = new Uint32Array(64 * 64);
    driverFb[10] = PACK(1, 2, 3);
    const inst = {
      id: 'm', type: 'rgb_matrix_64x64', x: 0, y: 0, props: { testPattern: 1 },
      runtimeState: { driver: { fb: driverFb, powered: true, brightness: 255 } },
    };
    DEF.step(inst, runningSim());
    expect(inst.runtimeState.framebuffer).toBe(driverFb);
    expect(inst.runtimeState.framebuffer[10] >>> 0).toBe(PACK(1, 2, 3));
  });

  it('falls back to procedural patterns when the driver is unpowered', () => {
    const driverFb = new Uint32Array(64 * 64);
    const inst = {
      id: 'm', type: 'rgb_matrix_64x64', x: 0, y: 0, props: { brightness: 80, testPattern: 1 },
      runtimeState: { driver: { fb: driverFb, powered: false } },
    };
    DEF.step(inst, runningSim());
    expect(inst.runtimeState.framebuffer).not.toBe(driverFb);
    expect(litCount(inst.runtimeState.framebuffer)).toBeGreaterThan(1000);
  });
});

describe('hub75 plugin — registration & activation', () => {
  const sim = new ArduinoSimulator();

  it('registers MatrixPanel_I2S_DMA with both class names and the header include', () => {
    expect(HUB_LIB).toBeTruthy();
    expect(HUB_LIB.classes).toEqual(['MatrixPanel_I2S_DMA', 'HUB75_I2S_CFG']);
    expect(HUB_LIB.includes).toEqual(['<ESP32-HUB75-MatrixPanelI2S-DMA.h>']);
    expect(typeof HUB_LIB.constructor).toBe('function');
    expect(typeof HUB_LIB.transpile).toBe('object');
  });

  it('activates only when the sketch includes the HUB75 header', () => {
    const withInc = sim._getActivePlugins('#include <ESP32-HUB75-MatrixPanelI2S-DMA.h>\nvoid setup() {}');
    expect(withInc['MatrixPanel_I2S_DMA']).toBe(HUB_LIB);
    const noInc = sim._getActivePlugins('void setup() {}');
    expect(noInc['MatrixPanel_I2S_DMA']).toBeUndefined();
  });

  it('is listed in the loader registrations (index.html, sw.js, fallback examples)', () => {
    expect(readSrc('index.html')).toContain('js/libraries/hub75.js');
    expect(readSrc('sw.js')).toContain('js/libraries/hub75.js');
    expect(readSrc('js/simulator.js')).toContain("'esp32_hub75_matrixpaneli2s_dma'");
    expect(readSrc('js/simulator.js')).toContain("'rgb_matrix_demo'");
  });
});

describe('hub75 plugin — transpile', () => {
  const sim = new ArduinoSimulator();
  const hdr = '#include <ESP32-HUB75-MatrixPanelI2S-DMA.h>\n';

  it('rewrites the pointer declaration (nullptr init) to a JS var', () => {
    const out = sim.transpile(hdr + 'MatrixPanel_I2S_DMA *dma_display = nullptr;\nvoid setup() {}');
    expect(out).toContain('var dma_display = null;');
    expect(out).not.toContain('nullptr');
  });

  it('rewrites bare pointer declarations too', () => {
    const out = sim.transpile(hdr + 'MatrixPanel_I2S_DMA *dma_display;\nvoid setup() {}');
    expect(out).toContain('var dma_display = null;');
  });

  it('rewrites C++ -> member access to JS property access', () => {
    const out = sim.transpile(hdr + 'void loop() {\n  dma_display->begin();\n  dma_display->clearScreen();\n}');
    expect(out).toContain('dma_display.begin()');
    expect(out).toContain('dma_display.clearScreen()');
    expect(out).not.toContain('->');
  });

  it('rewrites both class declarations to new expressions', () => {
    const out = sim.transpile(
      hdr + 'MatrixPanel_I2S_DMA *dma_display = nullptr;\nvoid setup() {\n  HUB75_I2S_CFG mxconfig(64, 64, 1);\n  dma_display = new MatrixPanel_I2S_DMA(mxconfig);\n}');
    expect(out).toContain('new HUB75_I2S_CFG(64, 64, 1)');
    expect(out).toContain('new MatrixPanel_I2S_DMA(mxconfig)');
  });
});

describe('hub75 constructor — config + display API', () => {
  let rig, cfg, disp;
  beforeEach(() => {
    rig = buildRig();
    cfg = HUB_LIB.constructor(); // new HUB75_I2S_CFG()
    disp = HUB_LIB.constructor(cfg); // new MatrixPanel_I2S_DMA(mxconfig)
  });
  afterEach(() => { global.window.ArduinoSim = null; global.window.CircuitCanvas = null; });

  it('HUB75_I2S_CFG defaults match the real library GPIO map (E set for 64x64)', () => {
    expect(cfg.__hub75cfg).toBe(true);
    expect(cfg.mx_width).toBe(64);
    expect(cfg.mx_height).toBe(64);
    expect(cfg.chain_length).toBe(1);
    expect(cfg.gpio).toMatchObject({
      r1: 25, g1: 26, b1: 27,
      r2: 14, g2: 12, b2: 13,
      a: 23, b: 19, c: 5, d: 17, e: 32,
      lat: 4, oe: 15, clk: 16,
    });
  });

  it('accepts width/height/chain overrides', () => {
    const c = HUB_LIB.constructor(128, 64, 2);
    expect(c.mx_width).toBe(128);
    expect(c.mx_height).toBe(64);
    expect(c.chain_length).toBe(2);
  });

  it('begin() powers the driver on the first rgb_matrix_64x64 component', () => {
    expect(rig.mx1.runtimeState.driver.powered).toBe(false);
    expect(disp.begin()).toBe(true);
    expect(rig.mx1.runtimeState.driver.powered).toBe(true);
    expect(rig.mx1.runtimeState.driver.fb.length).toBe(64 * 64);
  });

  it('setBrightness8 clamps and stores the brightness', () => {
    disp.begin();
    disp.setBrightness8(60);
    expect(rig.mx1.runtimeState.driver.brightness).toBe(60);
    disp.setBrightness8(999);
    expect(rig.mx1.runtimeState.driver.brightness).toBe(255);
  });

  it('color4bit scales 0-15 channels to 0-255', () => {
    expect(disp.color4bit(15, 0, 0)).toEqual({ r: 255, g: 0, b: 0 });
    expect(disp.color4bit(0, 15, 0)).toEqual({ r: 0, g: 255, b: 0 });
    expect(disp.color4bit(0, 0, 15)).toEqual({ r: 0, g: 0, b: 255 });
    expect(disp.color4bit(1, 2, 3)).toEqual({ r: 17, g: 34, b: 51 });
  });

  it('fillRect paints packed AABBGGRR pixels', () => {
    disp.begin();
    disp.fillRect(2, 3, 4, 5, disp.color4bit(15, 0, 0));
    const fb = rig.mx1.runtimeState.driver.fb;
    expect(fb[3 * 64 + 2] >>> 0).toBe(PACK(255, 0, 0));
    expect(fb[(3 + 4) * 64 + (2 + 3)] >>> 0).toBe(PACK(255, 0, 0));
    expect(fb[0] >>> 0).toBe(0); // outside
  });

  it('drawRect strokes the border only', () => {
    disp.begin();
    disp.drawRect(0, 0, 4, 4, disp.color4bit(0, 15, 0));
    const fb = rig.mx1.runtimeState.driver.fb;
    expect(fb[0] >>> 0).toBe(PACK(0, 255, 0));
    expect(fb[3] >>> 0).toBe(PACK(0, 255, 0));
    expect(fb[3 * 64] >>> 0).toBe(PACK(0, 255, 0));
    expect(fb[1 * 64 + 1] >>> 0).toBe(0); // interior untouched
  });

  it('clearScreen zeroes the framebuffer', () => {
    disp.begin();
    disp.fillScreen(disp.color4bit(15, 15, 15));
    expect(litCount(rig.mx1.runtimeState.driver.fb)).toBe(64 * 64);
    disp.clearScreen();
    expect(litCount(rig.mx1.runtimeState.driver.fb)).toBe(0);
  });

  it('print() renders 5x7 glyphs at the cursor', () => {
    disp.begin();
    disp.setCursor(0, 0);
    disp.setTextColor(disp.color4bit(15, 15, 15));
    disp.print('I'); // 'I' glyph: 0x00,0x41,0x7F,0x41,0x00
    const fb = rig.mx1.runtimeState.driver.fb;
    // column 1: rows 0 and 6 lit (0x41), rows 1-5 dark; middle column full
    expect(fb[0 * 64 + 1] >>> 0).toBe(PACK(255, 255, 255));
    expect(fb[6 * 64 + 1] >>> 0).toBe(PACK(255, 255, 255));
    expect(fb[1 * 64 + 1] >>> 0).toBe(0);
    expect(fb[3 * 64 + 2] >>> 0).toBe(PACK(255, 255, 255)); // 0x7F column
  });

  it('width()/height() report the panel size and width()/height() defaults to 64', () => {
    expect(disp.width()).toBe(64);
    expect(disp.height()).toBe(64);
    const wide = HUB_LIB.constructor(HUB_LIB.constructor(128, 64, 1));
    expect(wide.width()).toBe(128);
    expect(wide.height()).toBe(64);
  });
});

describe('bundled examples — rgb_matrix_demo & esp32_hub75', () => {
  const sim = new ArduinoSimulator();

  it('rgb_matrix_demo sketch compiles', async () => {
    const r = await sim.compile(exDemo.code);
    expect(r.ok, r.error || '').toBe(true);
  });

  it('rgb_matrix_demo circuit wires resolve to real component pins', () => {
    expect(exDemo.circuit.components.some(c => c.type === 'rgb_matrix_64x64')).toBe(true);
    expect(exDemo.circuit.components.some(c => c.type === 'arduino_uno')).toBe(true);
    expectValidCircuit(exDemo);
  });

  it('esp32_hub75 example sketch compiles with the plugin active', async () => {
    const r = await sim.compile(exHub.code);
    expect(r.ok, r.error || r.rawError || '').toBe(true);
  });

  it('esp32_hub75 example circuit has an ESP32, the matrix, and valid HUB75 wiring', () => {
    expect(exHub.circuit.components.length).toBe(2);
    expect(exHub.circuit.components.some(c => c.type === 'esp32_devkit_v1')).toBe(true);
    expect(exHub.circuit.components.some(c => c.type === 'rgb_matrix_64x64')).toBe(true);
    expect(exHub.circuit.wires.length).toBe(16); // 14 signal + 2 GND
    expectValidCircuit(exHub);
    // library-default GPIO mapping is what the sketch comment promises
    const esp = exHub.circuit.components.find(c => c.type === 'esp32_devkit_v1');
    const mx = exHub.circuit.components.find(c => c.type === 'rgb_matrix_64x64');
    const pinOf = (instId, pinId) => {
      const w = exHub.circuit.wires.find(w => w.from.instId === instId && w.from.pinId === pinId);
      return w && w.to.instId === mx.id ? w.to.pinId : null;
    };
    expect(pinOf(esp.id, 'D25')).toBe('R1');
    expect(pinOf(esp.id, 'D26')).toBe('G1');
    expect(pinOf(esp.id, 'D27')).toBe('B1');
    expect(pinOf(esp.id, 'D4')).toBe('LAT');
    expect(pinOf(esp.id, 'D15')).toBe('OE');
    expect(pinOf(esp.id, 'D16')).toBe('CLK');
    expect(pinOf(esp.id, 'D32')).toBe('E');
  });
});

describe('hub75 — end-to-end example sketch', () => {
  let rig;
  beforeEach(() => { rig = buildRig(); });
  afterEach(() => { global.window.ArduinoSim = null; global.window.CircuitCanvas = null; });

  it('runs setup()/loop() from the bundled example and paints the driver framebuffer', async () => {
    const sim = new ArduinoSimulator();
    const out = sim.transpile(exHub.code);
    expect(out).toContain('var dma_display = null;');
    expect(out).not.toContain('->');

    const _a = {
      serialBegin() {}, serialPrint() {}, serialPrintln() {},
      delay: async () => {},
    };
    const factory = new Function(
      'MatrixPanel_I2S_DMA', 'HUB75_I2S_CFG', '_a', 'window',
      `${out}\n;return { setup, loop };`);
    const api = factory(HUB_LIB.constructor, HUB_LIB.constructor, _a, global.window);
    await api.setup();
    await api.loop();

    const drv = rig.mx1.runtimeState.driver;
    expect(drv.powered).toBe(true);
    expect(drv.brightness).toBe(60);
    const fb = drv.fb;
    // red outer border + green inner border from the sketch
    expect(fb[0] >>> 0).toBe(PACK(255, 0, 0));
    expect(fb[1 * 64 + 1] >>> 0).toBe(PACK(0, 255, 0));
    // blue fillRect(10, 10, 44, 44) from the end of loop()
    expect(fb[20 * 64 + 20] >>> 0).toBe(PACK(0, 0, 255));
    // white text 'WAVESHARE' at (8, 28) — some glyph pixel in the text band
    let textLit = 0;
    for (let y = 28; y < 35; y++) {
      for (let x = 8; x < 62; x++) {
        if ((fb[y * 64 + x] >>> 0) !== 0 && !(x >= 10 && x < 54 && y >= 10 && y < 54)) textLit++;
      }
    }
    // 'W' starts at x=8 (left of the blue box) — must be lit
    expect(textLit).toBeGreaterThan(0);
  });

  it('component step() adopts the driver framebuffer after the sketch runs', async () => {
    const sim = new ArduinoSimulator();
    const out = sim.transpile(exHub.code);
    const _a = { serialBegin() {}, serialPrint() {}, serialPrintln() {}, delay: async () => {} };
    const factory = new Function(
      'MatrixPanel_I2S_DMA', 'HUB75_I2S_CFG', '_a', 'window',
      `${out}\n;return { setup, loop };`);
    const api = factory(HUB_LIB.constructor, HUB_LIB.constructor, _a, global.window);
    await api.setup();
    await api.loop();

    DEF.step(rig.mx1, runningSim());
    expect(rig.mx1.runtimeState.framebuffer).toBe(rig.mx1.runtimeState.driver.fb);

    // draw() smoke test: renders without throwing once powered + framebuffer present
    const { ctx } = makeCanvasStub();
    expect(() => DEF.draw(ctx, rig.mx1, runningSim())).not.toThrow();
  });
});
