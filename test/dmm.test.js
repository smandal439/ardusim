/**
 * test/dmm.test.js — Digital Multimeter current mode + rotary DC symbol
 * Run: npx vitest run test/dmm.test.js
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

global.window = {
  ArduinoLibs: {},
  ArduinoComponents: { COMPONENT_DEFS: {} },
  ArduinoSim: null,
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

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function loadScripts(files, names) {
  const code = files.map(readSrc).join('\n;\n');
  const fn = new Function('window', 'document',
    code + '\n;return {' + names.map(n => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ') + '};');
  return fn(global.window, global.document);
}

const { CircuitCanvas } = loadScripts([
  'js/electrical.js',
  'js/components/base.js',
  'js/components/passive.js',
  'js/components/power.js',
  'js/components/output.js',
  'js/components/multimeter.js',
  'js/canvas.js',
], ['CircuitCanvas']);

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

function buildRig(circuit) {
  const { canvasEl, wrapperEl } = makeCanvasStub();
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  cc.components = JSON.parse(JSON.stringify(circuit.components));
  cc.wires = JSON.parse(JSON.stringify(circuit.wires));
  global.window.CircuitCanvas = cc;
  return cc;
}

// battery(+) — 220 Ω — <dmmPin> ; COM — battery(−)
function seriesCircuit(dmmPin) {
  return {
    components: [
      { id: 'batt1', type: 'battery', x: 0, y: 0, props: { voltage: 3.7 }, runtimeState: {} },
      { id: 'r1', type: 'resistor', x: 60, y: 0, props: { value: 220, unit: 'Ω' }, runtimeState: {} },
      { id: 'dmm1', type: 'multimeter', x: 140, y: 0, props: { mode: 'V_DC' }, runtimeState: {} },
    ],
    wires: [
      { from: { instId: 'batt1', pinId: 'pos' }, to: { instId: 'r1', pinId: 'p1' } },
      { from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'dmm1', pinId: dmmPin } },
      { from: { instId: 'dmm1', pinId: 'probe_com' }, to: { instId: 'batt1', pinId: 'neg' } },
    ],
  };
}

// battery(+) — 220 Ω — COM ; V/Ω — battery(−)
function loadOnComCircuit() {
  return {
    components: [
      { id: 'batt1', type: 'battery', x: 0, y: 0, props: { voltage: 3.7 }, runtimeState: {} },
      { id: 'r1', type: 'resistor', x: 60, y: 0, props: { value: 220, unit: 'Ω' }, runtimeState: {} },
      { id: 'dmm1', type: 'multimeter', x: 140, y: 0, props: { mode: 'V_DC' }, runtimeState: {} },
    ],
    wires: [
      { from: { instId: 'batt1', pinId: 'pos' }, to: { instId: 'r1', pinId: 'p1' } },
      { from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'dmm1', pinId: 'probe_com' } },
      { from: { instId: 'dmm1', pinId: 'probe_red' }, to: { instId: 'batt1', pinId: 'neg' } },
    ],
  };
}

function isolatedCircuit(mode) {
  return {
    components: [
      { id: 'dmm1', type: 'multimeter', x: 0, y: 0, props: { mode }, runtimeState: {} },
    ],
    wires: [],
  };
}

const EXPECT_MA = (3.7 / 220) * 1000; // ≈ 16.818 mA

describe('Digital Multimeter (DMM)', () => {
  it('is registered with the three probe jacks', () => {
    const def = window.ArduinoComponents.COMPONENT_DEFS['multimeter'];
    expect(def).toBeTruthy();
    const pinIds = def.pins.map(p => p.id);
    expect(pinIds).toEqual(['probe_amp', 'probe_com', 'probe_red']);
  });

  it('draws the DC rotary position without unsupported glyphs', () => {
    const def = window.ArduinoComponents.COMPONENT_DEFS['multimeter'];
    const texts = [];
    let strokes = 0;
    const ctx = new Proxy({}, {
      get(_, prop) {
        if (prop === 'fillText') return (t) => texts.push(String(t));
        if (prop === 'stroke') return () => { strokes += 1; };
        if (prop === 'measureText') return () => ({ width: 0 });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => ({ addColorStop() {} });
        }
        return () => {};
      },
      set: () => true,
    });
    def.draw(ctx, { x: 0, y: 0, props: { mode: 'V_DC' }, runtimeState: {}, selected: false }, null);

    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) {
      expect(t).not.toContain('\u23C1'); // old rotary DC label (tofu box)
      expect(t).not.toContain('\u2393'); // U+2393 often missing in canvas fonts
    }
    expect(texts).toContain('V');
    expect(strokes).toBeGreaterThan(0); // vector solid-over-dashed DC bars
  });

  it('switching the rotary to A_DC after a tick engages the short and reads mA', () => {
    const cc = buildRig(seriesCircuit('probe_red'));
    const dmm = cc.components.find(c => c.id === 'dmm1');

    // First tick in voltage mode: jacks must be isolated
    cc.updateSimState({});
    expect(['V', 'mV', 'kV']).toContain(dmm.runtimeState.displayUnit);
    expect(cc.engine.getNetForPin('dmm1', 'probe_red'))
      .not.toBe(cc.engine.getNetForPin('dmm1', 'probe_com'));

    // Now switch modes (the old bug: runtimeState.mode kept winning)
    dmm.props.mode = 'A_DC';
    cc.updateSimState({});

    expect(cc.engine.getNetForPin('dmm1', 'probe_red'))
      .toBe(cc.engine.getNetForPin('dmm1', 'probe_com'));
    expect(cc.engine.getNetForPin('dmm1', 'probe_amp'))
      .toBe(cc.engine.getNetForPin('dmm1', 'probe_com'));

    expect(dmm.runtimeState.displayUnit).toBe('mA');
    expect(parseFloat(dmm.runtimeState.displayText)).toBeCloseTo(EXPECT_MA, 2);
    expect(dmm.runtimeState.amps).toBeCloseTo(EXPECT_MA / 1000, 6);
  });

  it('measures current wired through the 10A jack', () => {
    const cc = buildRig(seriesCircuit('probe_amp'));
    const dmm = cc.components.find(c => c.id === 'dmm1');
    dmm.props.mode = 'A_DC';
    cc.updateSimState({});

    expect(dmm.runtimeState.displayUnit).toBe('mA');
    expect(parseFloat(dmm.runtimeState.displayText)).toBeCloseTo(EXPECT_MA, 2);
  });

  it('measures current when the load sits on the COM side', () => {
    const cc = buildRig(loadOnComCircuit());
    const dmm = cc.components.find(c => c.id === 'dmm1');
    dmm.props.mode = 'A_DC';
    cc.updateSimState({});

    expect(dmm.runtimeState.displayUnit).toBe('mA');
    expect(parseFloat(dmm.runtimeState.displayText)).toBeCloseTo(EXPECT_MA, 2);
  });

  it('switching back to V_DC breaks the internal short again', () => {
    const cc = buildRig(seriesCircuit('probe_red'));
    const dmm = cc.components.find(c => c.id === 'dmm1');
    dmm.props.mode = 'A_DC';
    cc.updateSimState({});
    dmm.props.mode = 'V_DC';
    cc.updateSimState({});

    expect(cc.engine.getNetForPin('dmm1', 'probe_red'))
      .not.toBe(cc.engine.getNetForPin('dmm1', 'probe_com'));
    expect(['V', 'mV', 'kV']).toContain(dmm.runtimeState.displayUnit);
  });

  it('shows 0.000 with nothing connected in current mode', () => {
    const cc = buildRig(isolatedCircuit('A_DC'));
    cc.updateSimState({});
    const dmm = cc.components.find(c => c.id === 'dmm1');
    expect(dmm.runtimeState.displayText).toBe('0.000');
  });

  it('drives the analog bargraph in current mode', () => {
    const cc = buildRig(seriesCircuit('probe_red'));
    const dmm = cc.components.find(c => c.id === 'dmm1');
    dmm.props.mode = 'A_DC';
    cc.updateSimState({});

    const def = window.ArduinoComponents.COMPONENT_DEFS['multimeter'];
    def.step(dmm, null);
    expect(dmm.runtimeState.barPct).toBeGreaterThan(0);
    expect(dmm.runtimeState.barPct).toBeLessThanOrEqual(1);
  });
});
