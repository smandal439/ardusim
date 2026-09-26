/**
 * test/seg7_display.test.js — 7-segment display realism:
 *   - per-segment brightness (PWM duty) instead of binary on/off
 *   - common-anode polarity (LOW lights the segment, inputs can't sink)
 *   - COM supply check (cathode needs a ground, anode needs a source)
 *   - draw() renders ghosts/glow without throwing
 * Run: npx vitest run test/seg7_display.test.js
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ── Minimal browser-like globals (same pattern as test/pico2w_button.test.js) ── */
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
  'js/libraries/wire.js',
], ['ArduinoSimulator']);

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

/** seg7 on D2..D8 (segments a..g), optional COM wire to a board pin. */
function makeCircuit({ commonAnode = false, comPin = 'GND1' } = {}) {
  const segPins = ['segA', 'segB', 'segC', 'segD', 'segE', 'segF', 'segG'];
  const wires = segPins.map((p, i) => ({
    id: 'w' + i, from: { instId: 'b1', pinId: 'D' + (i + 2) }, to: { instId: 's7', pinId: p },
  }));
  if (comPin) wires.push({ id: 'wcom', from: { instId: 's7', pinId: 'com' }, to: { instId: 'b1', pinId: comPin } });
  return {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 0, y: 0 },
      { id: 's7', type: 'seg7', x: 200, y: 100, props: { commonAnode }, runtimeState: {} },
    ],
    wires,
  };
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
  return { cc, sim, seg: cc.components.find(c => c.id === 's7') };
}

const drive = (cc, sim) => cc.updateSimState(sim.pinStates);

describe('seg7 — common cathode (default)', () => {
  let cc, sim, seg;
  beforeEach(() => ({ cc, sim, seg } = buildRig(makeCircuit())));
  afterEach(() => { global.window.ArduinoSim = null; global.window.CircuitCanvas = null; });

  it('lights a segment on digital HIGH and darkens it on LOW', () => {
    sim.pinModes['pin_2'] = 'OUTPUT';
    sim.pinStates['pin_2'] = 1;
    drive(cc, sim);
    expect(seg.runtimeState.segments.A).toBe(1);

    sim.pinStates['pin_2'] = 0;
    drive(cc, sim);
    expect(seg.runtimeState.segments.A).toBe(0);
  });

  it('maps PWM duty to segment brightness', () => {
    sim.pinModes['pin_2'] = 'OUTPUT';
    sim.pinStates['pin_2'] = 128;
    drive(cc, sim);
    expect(seg.runtimeState.segments.A).toBeCloseTo(128 / 255, 5);

    sim.pinStates['pin_3'] = 255;
    drive(cc, sim);
    expect(seg.runtimeState.segments.B).toBe(1);
  });

  it('keeps an unwired segment dark', () => {
    drive(cc, sim);
    expect(seg.runtimeState.segments.A).toBe(0);
  });

  it('goes dark when COM is wired to a supply instead of ground', () => {
    const rig = buildRig(makeCircuit({ comPin: '5V' }));
    rig.sim.pinModes['pin_2'] = 'OUTPUT';
    rig.sim.pinStates['pin_2'] = 1;
    drive(rig.cc, rig.sim);
    expect(rig.seg.runtimeState.segments.A).toBe(0);
    global.window.ArduinoSim = null;
    global.window.CircuitCanvas = null;
  });
});

describe('seg7 — common anode', () => {
  let cc, sim, seg;
  beforeEach(() => ({ cc, sim, seg } = buildRig(makeCircuit({ commonAnode: true, comPin: '5V' }))));
  afterEach(() => { global.window.ArduinoSim = null; global.window.CircuitCanvas = null; });

  it('lights a segment when its pin sinks (LOW)', () => {
    sim.pinModes['pin_2'] = 'OUTPUT';
    sim.pinStates['pin_2'] = 0;
    drive(cc, sim);
    expect(seg.runtimeState.segments.A).toBe(1);
  });

  it('is dark when its pin is HIGH', () => {
    sim.pinModes['pin_2'] = 'OUTPUT';
    sim.pinStates['pin_2'] = 1;
    drive(cc, sim);
    expect(seg.runtimeState.segments.A).toBe(0);
  });

  it('inverts PWM duty for brightness', () => {
    sim.pinModes['pin_2'] = 'OUTPUT';
    sim.pinStates['pin_2'] = 128;
    drive(cc, sim);
    expect(seg.runtimeState.segments.A).toBeCloseTo(1 - 128 / 255, 5);
  });

  it('stays dark for a high-Z input pin even if feedback wrote a 0', () => {
    sim.pinModes['pin_2'] = 'INPUT';
    sim.pinStates['pin_2'] = 0;
    drive(cc, sim);
    expect(seg.runtimeState.segments.A).toBe(0);
  });

  it('stays dark for a pin the sketch never wrote', () => {
    drive(cc, sim);
    expect(seg.runtimeState.segments.A).toBe(0);
  });

  it('goes dark when COM has no supply', () => {
    const rig = buildRig(makeCircuit({ commonAnode: true, comPin: 'GND1' }));
    rig.sim.pinModes['pin_2'] = 'OUTPUT';
    rig.sim.pinStates['pin_2'] = 0;
    drive(rig.cc, rig.sim);
    expect(rig.seg.runtimeState.segments.A).toBe(0);
    global.window.ArduinoSim = null;
    global.window.CircuitCanvas = null;
  });
});

describe('seg7 — draw()', () => {
  const SEG_DEF = window.ArduinoComponents.COMPONENT_DEFS.seg7;

  function recordCtx() {
    const state = { shadowBlur: 0, shadowBlurVals: [], fills: 0, gradients: 0, stopColors: [], fillStyleVals: [] };
    const ctx = new Proxy({ state }, {
      get(t, prop) {
        if (prop === 'state') return state;
        if (prop === 'measureText') return () => ({ width: 0 });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => { state.gradients++; return { addColorStop(_stop, color) { state.stopColors.push(String(color)); } }; };
        }
        if (prop === 'fill') return () => { state.fills++; };
        if (prop in t) return t[prop];
        return () => {};
      },
      set(t, prop, v) {
        if (prop === 'shadowBlur') state.shadowBlurVals.push(v);
        if (prop === 'fillStyle' && typeof v === 'string') state.fillStyleVals.push(v);
        t[prop] = v;
        return true;
      },
    });
    return ctx;
  }

  const instAt = (segments, props = {}) => ({
    x: 0, y: 0,
    props: { commonAnode: false, color: '#ff3333', colorName: 'Red', brightness: 100, ...props },
    runtimeState: { segments },
    selected: false,
  });

  it('renders an all-off display with ghost segments and no glow', () => {
    const ctx = recordCtx();
    SEG_DEF.draw(ctx, instAt({ A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, DP: 0 }));
    expect(ctx.state.fills).toBeGreaterThan(0);
    expect(Math.max(0, ...ctx.state.shadowBlurVals ?? [0])).toBe(0);
    expect(ctx.state.gradients).toBe(2); // body gradient + sheen only
  });

  it('adds halos and glow shadow only for lit segments', () => {
    const off = recordCtx();
    SEG_DEF.draw(off, instAt({}));
    const on = recordCtx();
    SEG_DEF.draw(on, instAt({ A: 1, G: 0.5 }));
    expect(on.state.fills).toBeGreaterThan(off.state.fills);
    expect(Math.max(...on.state.shadowBlurVals)).toBeGreaterThan(0);
    expect(on.state.gradients).toBeGreaterThan(off.state.gradients);
  });

  it('accepts legacy boolean segment state', () => {
    const ctx = recordCtx();
    expect(() => SEG_DEF.draw(ctx, instAt({ A: true, DP: true }))).not.toThrow();
    expect(Math.max(...ctx.state.shadowBlurVals)).toBeGreaterThan(0);
  });

  it('tints lit segments with the selected colour', () => {
    const green = recordCtx();
    SEG_DEF.draw(green, instAt({ A: 1 }, { color: '#33ff66' }));
    expect(green.state.stopColors.some(c => c.includes('51,255,102'))).toBe(true);

    const red = recordCtx();
    SEG_DEF.draw(red, instAt({ A: 1 }, { color: '#ff3333' }));
    expect(red.state.stopColors.some(c => c.includes('255,51,51'))).toBe(true);
    expect(red.state.stopColors.some(c => c.includes('51,255,102'))).toBe(false);
  });

  it('scales overall intensity with the brightness setting', () => {
    const full = recordCtx();
    SEG_DEF.draw(full, instAt({ A: 1 }, { brightness: 100 }));
    const dim = recordCtx();
    SEG_DEF.draw(dim, instAt({ A: 1 }, { brightness: 10 }));
    const off = recordCtx();
    SEG_DEF.draw(off, instAt({ A: 1 }, { brightness: 0 }));

    expect(Math.max(...dim.state.shadowBlurVals)).toBeLessThan(Math.max(...full.state.shadowBlurVals));
    expect(off.state.gradients).toBe(2); // body + sheen only — no halo, no lit fill
    expect(Math.max(...off.state.shadowBlurVals)).toBe(0);
  });

  it('tolerates a string brightness (as stored by the properties modal)', () => {
    const ctx = recordCtx();
    SEG_DEF.draw(ctx, instAt({ A: 1 }, { brightness: '50' }));
    expect(Math.max(...ctx.state.shadowBlurVals)).toBeGreaterThan(0);
    expect(ctx.state.stopColors.some(c => c.includes('255,51,51'))).toBe(true);
  });
});

describe('seg7 — pin layout & property menus', () => {
  const DEF = window.ArduinoComponents.COMPONENT_DEFS.seg7;

  it('spreads the bottom pins evenly across the full width', () => {
    expect(DEF.pins.filter(p => p.side === 'bottom').map(p => p.id)).toEqual(['segG', 'dp', 'com']);
    expect(DEF.pins.filter(p => p.side === 'bottom').map(p => p.x)).toEqual([8, 28, 48]);
    expect(DEF.pins.filter(p => p.side === 'top').map(p => p.x)).toEqual([8, 16, 24, 32, 40, 48]);
  });

  it('keeps all pins inside the component body span', () => {
    for (const pin of DEF.pins) expect(pin.x).toBeGreaterThanOrEqual(0);
    expect(Math.max(...DEF.pins.map(p => p.x))).toBeLessThanOrEqual(DEF.width);
  });

  it('offers LED colour and brightness menus via interactive props', () => {
    expect(DEF.defaultProps.color).toBe('#ff3333');
    expect(DEF.defaultProps.colorName).toBe('Red');
    expect(DEF.defaultProps.brightness).toBe(100);

    const colorCtrl = (DEF.interactive || []).find(i => i.field === 'color');
    expect(colorCtrl && colorCtrl.type).toBe('select');
    const hexes = colorCtrl.options.map(o => o.value);
    for (const h of ['#ff3333', '#33ff66', '#3399ff', '#ffee33', '#ff8833', '#ffffff']) {
      expect(hexes).toContain(h);
    }

    const briCtrl = (DEF.interactive || []).find(i => i.field === 'brightness');
    expect(briCtrl && briCtrl.type).toBe('select');
    expect(briCtrl.options.map(o => o.value)).toEqual([100, 75, 50, 25, 10]);
  });
});
