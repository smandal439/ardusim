/**
 * test/tm1637.test.js — TM1637 4-digit clock display:
 *   - plugin registration, include-gated activation, transpile rewrite
 *   - TM1637Display API: showNumberDec(Ex), setSegments, colon, brightness, clear
 *   - multi-module CLK targeting, end-to-end sketch execution
 *   - component pins/props/catalog + draw() glow/colour/off rendering
 *   - guide entry, example wiring, loader registrations
 * Run: npx vitest run test/tm1637.test.js
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ── Minimal browser-like globals (same pattern as test/seg7_display.test.js) ── */
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

const { CircuitCanvas, COMPONENT_CATALOG, PIN_TYPE } = loadScripts([
  'js/electrical.js',
  'js/components/base.js',
  'js/components/boards.js',
  'js/components/input.js',
  'js/components/output.js',
  'js/canvas.js',
], ['CircuitCanvas', 'COMPONENT_CATALOG', 'PIN_TYPE']);

const { ArduinoSimulator } = loadScripts([
  'js/simulator.js',
  'js/libraries/serial.js',
  'js/libraries/wire.js',
  'js/libraries/tm1637.js',
], ['ArduinoSimulator']);

const TM_LIB = global.window.ArduinoLibs['TM1637Display'];
const DIGITS = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F];
const MINUS = 0x40;

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
  return { canvasEl, wrapperEl };
}

/** Board + tm1637 on CLK=D2/DIO=D3 (+ optional second module on D5/D6). */
function makeCircuit({ second = false } = {}) {
  const components = [
    { id: 'b1', type: 'arduino_uno', x: 0, y: 0 },
    { id: 'd1', type: 'tm1637', x: 200, y: 100, props: {}, runtimeState: {} },
  ];
  const wires = [
    { id: 'w1', from: { instId: 'b1', pinId: 'D2' }, to: { instId: 'd1', pinId: 'CLK' } },
    { id: 'w2', from: { instId: 'b1', pinId: 'D3' }, to: { instId: 'd1', pinId: 'DIO' } },
  ];
  if (second) {
    components.push({ id: 'd2', type: 'tm1637', x: 400, y: 100, props: {}, runtimeState: {} });
    wires.push({ id: 'w3', from: { instId: 'b1', pinId: 'D5' }, to: { instId: 'd2', pinId: 'CLK' } });
    wires.push({ id: 'w4', from: { instId: 'b1', pinId: 'D6' }, to: { instId: 'd2', pinId: 'DIO' } });
  }
  return { components, wires };
}

function buildRig(circuit) {
  const { canvasEl, wrapperEl } = makeCanvasStub();
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  cc.components = JSON.parse(JSON.stringify(circuit.components));
  cc.wires = JSON.parse(JSON.stringify(circuit.wires));
  const sim = new ArduinoSimulator();
  sim.board = 'arduino_uno';
  global.window.ArduinoSim = sim;
  global.window.CircuitCanvas = cc;
  return {
    cc, sim,
    d1: cc.components.find(c => c.id === 'd1'),
    d2: cc.components.find(c => c.id === 'd2'),
  };
}

describe('tm1637 plugin — registration & activation', () => {
  const sim = new ArduinoSimulator();

  it('registers TM1637Display with the header include and class name', () => {
    expect(TM_LIB).toBeTruthy();
    expect(TM_LIB.classes).toEqual(['TM1637Display']);
    expect(TM_LIB.includes).toEqual(['<TM1637Display.h>']);
    expect(typeof TM_LIB.constructor).toBe('function');
  });

  it('exposes the TM1637 segment constants', () => {
    expect(TM_LIB.constants).toMatchObject({
      SEG_A: 0x01, SEG_B: 0x02, SEG_C: 0x04, SEG_D: 0x08,
      SEG_E: 0x10, SEG_F: 0x20, SEG_G: 0x40, SEG_DP: 0x80,
    });
  });

  it('activates only when the sketch includes TM1637Display.h', () => {
    const withInc = sim._getActivePlugins('#include <TM1637Display.h>\nvoid setup() {}');
    expect(withInc['TM1637Display']).toBe(TM_LIB);
    const noInc = sim._getActivePlugins('void setup() {}');
    expect(noInc['TM1637Display']).toBeUndefined();
  });

  it('is listed in the loader registrations (index.html, sw.js, fallback examples)', () => {
    expect(readSrc('index.html')).toContain('js/libraries/tm1637.js');
    expect(readSrc('sw.js')).toContain('js/libraries/tm1637.js');
    expect(readSrc('js/simulator.js')).toContain("'tm1637_clock'");
  });
});

describe('tm1637 plugin — transpile', () => {
  const sim = new ArduinoSimulator();

  it('rewrites the constructor to a JS new expression', () => {
    const out = sim.transpile('#include <TM1637Display.h>\nTM1637Display display(2, 3);\nvoid setup() {}');
    expect(out).toContain('new TM1637Display(2, 3)');
    expect(out).not.toMatch(/^\s*TM1637Display display\(/m);
  });

  it('substitutes #define pin numbers in the constructor call', () => {
    const out = sim.transpile(
      '#include <TM1637Display.h>\n#define CLK 2\n#define DIO 3\nTM1637Display display(CLK, DIO);\nvoid setup() {}');
    expect(out).toContain('new TM1637Display(2, 3)');
  });

  it('leaves TM1637 method calls untouched (no hijacking rules)', () => {
    const out = sim.transpile(
      '#include <TM1637Display.h>\nvoid loop() {\n  display.showNumberDec(1234, true);\n  display.setBrightness(7);\n  display.showColonSegment();\n  display.clear();\n}');
    expect(out).toContain('display.showNumberDec(1234, true)');
    expect(out).toContain('display.setBrightness(7)');
    expect(out).toContain('display.showColonSegment()');
    expect(out).toContain('display.clear()');
    expect(out).not.toContain('_a.segClear');
    expect(out).not.toContain('neopixelSetBrightness');
  });
});

describe('tm1637 constructor — digit API', () => {
  let rig, mod;
  beforeEach(() => {
    rig = buildRig(makeCircuit());
    mod = TM_LIB.constructor(2, 3);
  });
  afterEach(() => { global.window.ArduinoSim = null; global.window.CircuitCanvas = null; });

  it('right-aligns a plain number across all four digits', () => {
    mod.showNumberDec(1234);
    expect(rig.d1.runtimeState.digits).toEqual([DIGITS[1], DIGITS[2], DIGITS[3], DIGITS[4]]);
  });

  it('pads leading zeros only when requested', () => {
    mod.showNumberDec(45, true);
    expect(rig.d1.runtimeState.digits).toEqual([DIGITS[0], DIGITS[0], DIGITS[4], DIGITS[5]]);
    mod.showNumberDec(45);
    expect(rig.d1.runtimeState.digits).toEqual([0, 0, DIGITS[4], DIGITS[5]]);
  });

  it('renders a minus sign in the first cell of the range', () => {
    mod.showNumberDec(-7);
    expect(rig.d1.runtimeState.digits).toEqual([MINUS, 0, 0, DIGITS[7]]);
  });

  it('keeps only the least-significant digits when the number overflows', () => {
    mod.showNumberDec(12345);
    expect(rig.d1.runtimeState.digits).toEqual([DIGITS[2], DIGITS[3], DIGITS[4], DIGITS[5]]);
  });

  it('honours length and position arguments', () => {
    mod.showNumberDec(12, false, 2, 2);
    expect(rig.d1.runtimeState.digits).toEqual([0, 0, DIGITS[1], DIGITS[2]]);
  });

  it('writes raw segments through setSegments without touching other cells', () => {
    mod.setSegments([0x3F, 0x06]);
    expect(rig.d1.runtimeState.digits).toEqual([0x3F, 0x06, 0, 0]);
    mod.setSegments([0x5B], 1, 2);
    expect(rig.d1.runtimeState.digits).toEqual([0x3F, 0x06, 0x5B, 0]);
  });

  it('applies decimal-point bits from the dots nibble of showNumberDecEx', () => {
    mod.showNumberDecEx(12, 0x02); // dots bit1 -> second cell
    expect(rig.d1.runtimeState.digits).toEqual([0, 0x80, DIGITS[1], DIGITS[2]]);
    mod.showNumberDecEx(12, 0x08); // dots bit3 -> fourth cell
    expect(rig.d1.runtimeState.digits).toEqual([0, 0, DIGITS[1], DIGITS[2] | 0x80]);
  });

  it('blanks cells from the blanks nibble (high nibble) of showNumberDecEx', () => {
    mod.showNumberDecEx(1234, 0x40); // blank nibble bit2 -> third cell
    expect(rig.d1.runtimeState.digits).toEqual([DIGITS[1], DIGITS[2], 0, DIGITS[4]]);
  });

  it('clear() blanks digits and the colon', () => {
    mod.showNumberDec(1234);
    mod.showColonSegment();
    mod.clear();
    expect(rig.d1.runtimeState.digits).toEqual([0, 0, 0, 0]);
    expect(rig.d1.runtimeState.colon).toBe(0);
  });

  it('clamps setBrightness to 0..7 and forwards the on/off flag', () => {
    mod.setBrightness(99);
    expect(rig.d1.runtimeState.brightness).toBe(7);
    mod.setBrightness(-5);
    expect(rig.d1.runtimeState.brightness).toBe(0);
    mod.setBrightness(3, false);
    expect(rig.d1.runtimeState.brightness).toBe(3);
    expect(rig.d1.runtimeState.on).toBe(false);
    mod.setBrightness(5);
    expect(rig.d1.runtimeState.on).toBe(true);
  });

  it('toggles the colon through setColon / showColonSegment / hideColonSegment', () => {
    mod.setColon(true);
    expect(rig.d1.runtimeState.colon).toBe(1);
    mod.hideColonSegment();
    expect(rig.d1.runtimeState.colon).toBe(0);
    mod.showColonSegment();
    expect(rig.d1.runtimeState.colon).toBe(1);
    mod.setColon(false);
    expect(rig.d1.runtimeState.colon).toBe(0);
  });

  it('encodes single digits like the Arduino library', () => {
    expect(mod.encodeDigit(0)).toBe(0x3F);
    expect(mod.encodeDigit(8)).toBe(0x7F);
    expect(mod.encodeDigit(9)).toBe(0x6F);
    expect(mod.encodeDigit(12)).toBe(0);
  });
});

describe('tm1637 — multi-module CLK targeting', () => {
  let rig;
  beforeEach(() => { rig = buildRig(makeCircuit({ second: true })); });
  afterEach(() => { global.window.ArduinoSim = null; global.window.CircuitCanvas = null; });

  it('pushes to the module whose CLK pin is wired to the constructor argument', () => {
    const mod5 = TM_LIB.constructor(5, 6);
    mod5.showNumberDec(7);
    expect(rig.d2.runtimeState.digits).toEqual([0, 0, 0, DIGITS[7]]);
    expect(rig.d1.runtimeState.digits).toBeUndefined(); // never touched
  });

  it('falls back to the first module when no CLK matches', () => {
    const modX = TM_LIB.constructor(99, 99);
    modX.showNumberDec(7);
    expect(rig.d1.runtimeState.digits).toEqual([0, 0, 0, DIGITS[7]]);
  });
});

describe('tm1637 — end-to-end sketch', () => {
  let rig;
  beforeEach(() => { rig = buildRig(makeCircuit()); });
  afterEach(() => { global.window.ArduinoSim = null; global.window.CircuitCanvas = null; });

  it('runs setup()/loop() and paints the digits through the transpiled sketch', async () => {
    const sim = new ArduinoSimulator();
    const src = [
      '#include <TM1637Display.h>',
      '#define CLK 2',
      '#define DIO 3',
      'TM1637Display display(CLK, DIO);',
      'void setup() {',
      '  display.setBrightness(7);',
      '}',
      'void loop() {',
      '  display.showNumberDec(1234, true);',
      '  display.showColonSegment();',
      '}',
    ].join('\n');

    const out = sim.transpile(src);
    expect(out).toContain('new TM1637Display(2, 3)');

    const factory = new Function('TM1637Display', 'window', `${out}\n;return { setup, loop };`);
    const api = factory(TM_LIB.constructor, global.window);
    await api.setup();
    await api.loop();

    expect(rig.d1.runtimeState.digits).toEqual([DIGITS[1], DIGITS[2], DIGITS[3], DIGITS[4]]);
    expect(rig.d1.runtimeState.colon).toBe(1);
    expect(rig.d1.runtimeState.brightness).toBe(7);
    expect(rig.d1.runtimeState.on).toBe(true);
  });
});

describe('tm1637 component — pins, props & catalog', () => {
  const DEF = global.window.ArduinoComponents.COMPONENT_DEFS.tm1637;

  it('is registered as a component', () => {
    expect(DEF).toBeTruthy();
    expect(DEF.category).toBe('Output');
  });

  it('exposes GND/VCC/DIO/CLK bottom pins in module order', () => {
    const bottom = DEF.pins.filter(p => p.side === 'bottom');
    expect(bottom.map(p => p.id)).toEqual(['GND', 'VCC', 'DIO', 'CLK']);
    expect(bottom.map(p => p.x)).toEqual([16, 44, 72, 100]);
    expect(bottom.every(p => p.y === 66)).toBe(true);
    expect(bottom.map(p => p.type)).toEqual([PIN_TYPE.GND, PIN_TYPE.POWER, PIN_TYPE.DIGITAL, PIN_TYPE.DIGITAL]);
  });

  it('keeps every pin inside the component body', () => {
    for (const pin of DEF.pins) {
      expect(pin.x).toBeGreaterThanOrEqual(0);
      expect(pin.x).toBeLessThanOrEqual(DEF.width);
      expect(pin.y).toBeLessThanOrEqual(DEF.height);
    }
  });

  it('offers the LED colour menu only — brightness comes from the sketch', () => {
    expect(DEF.defaultProps.color).toBe('#ff3333');
    expect(DEF.defaultProps.colorName).toBe('Red');
    const colorCtrl = (DEF.interactive || []).find(i => i.field === 'color');
    expect(colorCtrl && colorCtrl.type).toBe('select');
    const hexes = colorCtrl.options.map(o => o.value);
    for (const h of ['#ff3333', '#33ff66', '#3399ff', '#ffee33', '#ff8833', '#ffffff']) {
      expect(hexes).toContain(h);
    }
    expect((DEF.interactive || []).find(i => i.field === 'brightness')).toBeUndefined();
  });

  it('appears in the Output catalog', () => {
    const outCat = COMPONENT_CATALOG.find(c => c.category === 'Output');
    expect(outCat.ids).toContain('tm1637');
  });
});

describe('tm1637 component — draw()', () => {
  const DEF = global.window.ArduinoComponents.COMPONENT_DEFS.tm1637;

  function recordCtx() {
    const state = { shadowBlurVals: [], fills: 0, gradients: 0, stopColors: [] };
    const ctx = new Proxy({ state }, {
      get(t, prop) {
        if (prop === 'state') return state;
        if (prop === 'measureText') return () => ({ width: 0 });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => { state.gradients++; return { addColorStop(_s, c) { state.stopColors.push(String(c)); } }; };
        }
        if (prop === 'fill') return () => { state.fills++; };
        if (prop in t) return t[prop];
        return () => {};
      },
      set(t, prop, v) {
        if (prop === 'shadowBlur') state.shadowBlurVals.push(v);
        t[prop] = v;
        return true;
      },
    });
    return ctx;
  }

  const maxBlur = (ctx) => (ctx.state.shadowBlurVals.length ? Math.max(...ctx.state.shadowBlurVals) : 0);
  const instAt = (runtimeState, props = {}) => ({
    x: 0, y: 0,
    props: { color: '#ff3333', colorName: 'Red', ...props },
    runtimeState,
    selected: false,
  });

  it('renders an all-dark module (PCB, ghosts) without any glow', () => {
    const ctx = recordCtx();
    DEF.draw(ctx, instAt({}));
    expect(ctx.state.fills).toBeGreaterThan(0);
    expect(maxBlur(ctx)).toBe(0);
    expect(ctx.state.gradients).toBeGreaterThan(0);
  });

  it('adds halos, glow shadows and gradients only for lit content', () => {
    const off = recordCtx();
    DEF.draw(off, instAt({}));
    const on = recordCtx();
    DEF.draw(on, instAt({ digits: [0x3F, 0, 0, 0], colon: 1, brightness: 7, on: true }));
    expect(on.state.fills).toBeGreaterThan(off.state.fills);
    expect(maxBlur(on)).toBeGreaterThan(0);
    expect(maxBlur(off)).toBe(0);
    expect(on.state.gradients).toBeGreaterThan(off.state.gradients);
  });

  it('tints lit segments with the selected colour', () => {
    const green = recordCtx();
    DEF.draw(green, instAt({ digits: [0x3F, 0, 0, 0] }, { color: '#33ff66' }));
    expect(green.state.stopColors.some(c => c.includes('51,255,102'))).toBe(true);

    const red = recordCtx();
    DEF.draw(red, instAt({ digits: [0x3F, 0, 0, 0] }, { color: '#ff3333' }));
    expect(red.state.stopColors.some(c => c.includes('255,51,51'))).toBe(true);
    expect(red.state.stopColors.some(c => c.includes('51,255,102'))).toBe(false);
  });

  it('goes fully dark when the display is switched off', () => {
    const ctx = recordCtx();
    DEF.draw(ctx, instAt({ digits: [0x3F, 0x3F, 0x3F, 0x3F], colon: 1, brightness: 7, on: false }));
    expect(ctx.state.fills).toBeGreaterThan(0);
    expect(maxBlur(ctx)).toBe(0);
  });

  it('scales glow with the sketch-driven brightness level', () => {
    const full = recordCtx();
    DEF.draw(full, instAt({ digits: [0x7F, 0, 0, 0], brightness: 7, on: true }));
    const dim = recordCtx();
    DEF.draw(dim, instAt({ digits: [0x7F, 0, 0, 0], brightness: 1, on: true }));
    expect(maxBlur(full)).toBeGreaterThan(0);
    expect(maxBlur(dim)).toBeLessThan(maxBlur(full));
  });

  it('tolerates a string brightness (as stored by older circuits)', () => {
    const ctx = recordCtx();
    expect(() => DEF.draw(ctx, instAt({ digits: [0x7F, 0, 0, 0], brightness: '5' }))).not.toThrow();
    expect(maxBlur(ctx)).toBeGreaterThan(0);
  });
});

describe('tm1637 — guide & example integration', () => {
  it('has a guide entry pointing at the clock example', () => {
    const guide = readSrc('js/guide.js');
    expect(guide).toMatch(/\btm1637:\s*\{/);
    expect(guide).toContain("exampleId: 'tm1637_clock'");
    expect(guide).toContain('TM1637 4-Digit Display');
  });

  it('ships the tm1637_clock example with correct wiring and include', () => {
    const ex = JSON.parse(readSrc('Examples/tm1637_clock.json'));
    expect(ex.id).toBe('tm1637_clock');
    expect(ex.code).toContain('#include <TM1637Display.h>');
    expect(ex.code).toContain('TM1637Display display(CLK, DIO);');
    expect(ex.circuit.components.some(c => c.type === 'tm1637')).toBe(true);

    const pinOf = (wire, id) => (wire.from.instId === id ? wire.from.pinId : wire.to.instId === id ? wire.to.pinId : null);
    const wFor = (pinId) => ex.circuit.wires.find(w => pinOf(w, 'd1') === pinId);
    expect(wFor('CLK')).toBeTruthy();
    expect(wFor('DIO')).toBeTruthy();
    expect(wFor('VCC')).toBeTruthy();
    expect(wFor('GND')).toBeTruthy();
    expect(pinOf(wFor('CLK'), 'b1')).toBe('D2');
    expect(pinOf(wFor('DIO'), 'b1')).toBe('D3');
    expect(pinOf(wFor('VCC'), 'b1')).toBe('5V');
    expect(pinOf(wFor('GND'), 'b1')).toBe('GND1');
  });

  it('is included in the generated examples data', () => {
    expect(readSrc('js/examples-data.js')).toContain('"tm1637_clock"');
  });
});
