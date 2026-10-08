/**
 * test/wire_potential.test.js — wire ends must share one potential.
 * The electrical engine solves one voltage per net; getPinVoltage consults
 * that net first so every pin on the same wire reads the same value
 * regardless of which end the reader starts from (vantage symmetry).
 * Run: node node_modules\vitest\vitest.mjs run test/wire_potential.test.js
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

const { CircuitCanvas } = loadScripts([
  'js/electrical.js',
  'js/components/base.js',
  'js/components/boards.js',
  'js/components/input.js',
  'js/components/output.js',
  'js/components/power.js',
  'js/components/logic_tag.js',
  'js/components/probe.js',
  'js/components/ics.js',
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

function buildRig(circuit) {
  const { canvasEl, wrapperEl } = makeCanvasStub();
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  cc.components = JSON.parse(JSON.stringify(circuit.components));
  cc.wires = JSON.parse(JSON.stringify(circuit.wires));
  const sim = new ArduinoSimulator();
  sim.board = 'arduino_uno';
  global.window.ArduinoSim = sim;
  global.window.CircuitCanvas = cc;
  return { cc, sim };
}

const drive = (cc, sim) => cc.updateSimState(sim.pinStates);
const gv = (sim, cc, id, pin) => sim.getPinVoltage(cc.components.find(c => c.id === id), pin);
const ev = (cc, id, pin) => cc.engine.getVoltageAtPin(id, pin);
const W = (n, fi, fp, ti, tp) => ({ id: n, from: { instId: fi, pinId: fp }, to: { instId: ti, pinId: tp } });

afterEach(() => { global.window.ArduinoSim = null; global.window.CircuitCanvas = null; });

describe('same net reads the same potential from every vantage', () => {
  let cc, sim;
  beforeEach(() => {
    ({ cc, sim } = buildRig({
      components: [
        { id: 'lg', type: 'logic_level_in', x: 0, y: 0, props: { level: 1 }, runtimeState: {} },
        { id: 'ic', type: 'ic_74hc00', x: 100, y: 0, props: {}, runtimeState: {} },
        { id: 'pr', type: 'la_probe_ch1', x: 200, y: 0, props: {}, runtimeState: {} },
      ],
      wires: [W('w1', 'lg', 'out', 'ic', '1A'), W('w2', 'pr', 'tip', 'ic', '1A')],
    }));
  });

  it('logic_level_in HIGH, gate input and probe all read 5V', () => {
    drive(cc, sim);
    expect(gv(sim, cc, 'lg', 'out')).toBe(5);
    expect(gv(sim, cc, 'ic', '1A')).toBe(5);
    expect(gv(sim, cc, 'pr', 'tip')).toBe(5);
    expect(ev(cc, 'lg', 'out')).toBe(5);
    expect(ev(cc, 'ic', '1A')).toBe(5);
    expect(ev(cc, 'pr', 'tip')).toBe(5);
  });

  it('engine reports one voltage object shared by all three pins', () => {
    drive(cc, sim);
    const n1 = cc.engine.getNetForPin('lg', 'out');
    const n2 = cc.engine.getNetForPin('ic', '1A');
    const n3 = cc.engine.getNetForPin('pr', 'tip');
    expect(n1).toBe(n2);
    expect(n2).toBe(n3);
  });
});

describe('source pin reads its own voltage', () => {
  let cc, sim;
  beforeEach(() => {
    ({ cc, sim } = buildRig({
      components: [
        { id: 'p5', type: 'power_5v', x: 0, y: 0, props: {}, runtimeState: {} },
        { id: 'pr', type: 'la_probe_ch1', x: 100, y: 0, props: {}, runtimeState: {} },
      ],
      wires: [W('w1', 'p5', 'vcc', 'pr', 'tip')],
    }));
  });

  it('power_5v.vcc and its probe neighbor both read 5V', () => {
    drive(cc, sim);
    expect(gv(sim, cc, 'p5', 'vcc')).toBe(5);
    expect(gv(sim, cc, 'pr', 'tip')).toBe(5);
  });
});

describe('both ends of a wire agree across a polar component', () => {
  let cc, sim;
  beforeEach(() => {
    ({ cc, sim } = buildRig({
      components: [
        { id: 'p5', type: 'power_5v', x: 0, y: 0, props: {}, runtimeState: {} },
        { id: 'led', type: 'led', x: 100, y: 0, props: {}, runtimeState: {} },
        { id: 'pr', type: 'la_probe_ch1', x: 200, y: 0, props: {}, runtimeState: {} },
      ],
      wires: [W('w1', 'p5', 'vcc', 'led', 'anode'), W('w2', 'led', 'cathode', 'pr', 'tip')],
    }));
  });

  it('direct wire ends (vcc and anode) both read 5V', () => {
    drive(cc, sim);
    expect(gv(sim, cc, 'p5', 'vcc')).toBe(5);
    expect(gv(sim, cc, 'led', 'anode')).toBe(5);
  });

  it('both ends of the cathode wire agree (same net, same voltage)', () => {
    drive(cc, sim);
    expect(gv(sim, cc, 'led', 'cathode')).toBe(gv(sim, cc, 'pr', 'tip'));
    expect(ev(cc, 'led', 'cathode')).toBe(ev(cc, 'pr', 'tip'));
  });
});

describe('gate chain — input and output nets stay consistent', () => {
  let cc, sim;
  beforeEach(() => {
    ({ cc, sim } = buildRig({
      components: [
        { id: 'lg', type: 'logic_level_in', x: 0, y: 0, props: { level: 1 }, runtimeState: {} },
        { id: 'inv', type: 'ic_74hc04', x: 100, y: 0, props: {}, runtimeState: {} },
        { id: 'prIn', type: 'la_probe_ch1', x: 150, y: 0, props: {}, runtimeState: {} },
        { id: 'prOut', type: 'la_probe_ch1', x: 200, y: 50, props: {}, runtimeState: {} },
      ],
      wires: [W('w1', 'lg', 'out', 'inv', '1A'), W('w2', 'prIn', 'tip', 'inv', '1A'), W('w3', 'inv', 'Y1', 'prOut', 'tip')],
    }));
  });

  it('input net reads 5V everywhere', () => {
    drive(cc, sim);
    expect(gv(sim, cc, 'lg', 'out')).toBe(5);
    expect(gv(sim, cc, 'inv', '1A')).toBe(5);
    expect(gv(sim, cc, 'prIn', 'tip')).toBe(5);
  });

  it('inverter output: ic pin and probe on the same wire read equal', () => {
    drive(cc, sim);
    drive(cc, sim);
    expect(gv(sim, cc, 'inv', 'Y1')).toBe(gv(sim, cc, 'prOut', 'tip'));
    expect(ev(cc, 'inv', 'Y1')).toBe(ev(cc, 'prOut', 'tip'));
  });
});

describe('legacy walk fallback (engineless stub)', () => {
  it('probe next to logic_level_in still resolves 5V without an engine', () => {
    const sim = new ArduinoSimulator();
    global.window.ArduinoSim = sim;
    const lg = { id: 'lg', type: 'logic_level_in', props: { level: 1 }, runtimeState: {} };
    const pr = { id: 'pr', type: 'la_probe_ch1', props: {}, runtimeState: {} };
    global.window.CircuitCanvas = {
      components: [lg, pr],
      wires: [W('w1', 'lg', 'out', 'pr', 'tip')],
    };
    expect(sim.getPinVoltage(lg, 'out')).toBe(0);
    expect(sim.getPinVoltage(pr, 'tip')).toBe(5);
  });
});
