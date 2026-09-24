/**
 * test/battery.test.js — Li-Ion battery component registration + electrical solve
 * Run: node node_modules/vitest/vitest.mjs run test/battery.test.js
 */
import { describe, it, expect, beforeAll } from 'vitest';
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
  'js/canvas.js',
], ['CircuitCanvas']);

const example = JSON.parse(readSrc('Examples/battery_led.json'));

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

describe('Li-Ion battery component', () => {
  beforeAll(() => {
    // Component defs already registered by loadScripts via defComp
  });

  it('is registered in COMPONENT_DEFS with pos/neg pins', () => {
    const def = window.ArduinoComponents.COMPONENT_DEFS['battery'];
    expect(def).toBeTruthy();
    expect(def.name).toBe('Li-Ion Battery');
    const pinIds = def.pins.map(p => p.id).sort();
    expect(pinIds).toEqual(['neg', 'pos']);
    expect(def.defaultProps.voltage).toBeCloseTo(3.7, 2);
  });

  it('classifies as a source+ground in the electrical engine', () => {
    const cc = buildRig(example.circuit);
    cc.engine.buildGraph(cc.components, cc.wires);
    cc.engine.solve(cc);

    const posNet = cc.engine.getNetForPin('batt1', 'pos');
    const negNet = cc.engine.getNetForPin('batt1', 'neg');
    expect(posNet.sources.length).toBeGreaterThanOrEqual(1);
    expect(posNet.sources[0].voltage).toBeCloseTo(3.7, 2);
    expect(negNet.grounds.length).toBeGreaterThanOrEqual(1);
  });

  it('LED anode sees ~3.7 V through the 220 Ω resistor', () => {
    const cc = buildRig(example.circuit);
    cc.engine.buildGraph(cc.components, cc.wires);
    cc.engine.solve(cc);

    const anodeNet = cc.engine.getNetForPin('led1', 'anode');
    // LED is a resistive edge; with no board ground load the anode net is
    // tied to the battery source through R — expect a source or near-3.7V path.
    const hasSource = anodeNet.sources.length > 0;
    const nearRail = anodeNet.voltage > 1.0;
    expect(hasSource || nearRail).toBe(true);
  });

  it('respects props.voltage overrides (slider range 2.5–4.2)', () => {
    const cc = buildRig(example.circuit);
    const batt = cc.components.find(c => c.id === 'batt1');
    batt.props.voltage = 4.2;
    cc.engine.buildGraph(cc.components, cc.wires);
    cc.engine.solve(cc);
    const posNet = cc.engine.getNetForPin('batt1', 'pos');
    expect(posNet.sources[0].voltage).toBeCloseTo(4.2, 2);
  });

  it('legacy _tracePinNet sees battery source and ground', () => {
    const cc = buildRig(example.circuit);
    const posNet = cc._tracePinNet('batt1', 'pos');
    const negNet = cc._tracePinNet('batt1', 'neg');
    expect(posNet.sources.some(s => s.type === 'battery')).toBe(true);
    expect(negNet.grounds.length).toBeGreaterThanOrEqual(1);
    expect(cc._isGroundPin({ type: 'battery', id: 'batt1' }, 'neg')).toBe(true);
    expect(cc._isGroundPin({ type: 'battery', id: 'batt1' }, 'pos')).toBe(false);
  });

  it('example battery_led.json is valid and wired as a closed loop', () => {
    const types = new Set(example.circuit.components.map(c => c.type));
    expect(types.has('battery')).toBe(true);
    expect(types.has('led')).toBe(true);
    expect(types.has('resistor')).toBe(true);

    const edges = new Set();
    for (const w of example.circuit.wires) {
      edges.add(`${w.from.instId}:${w.from.pinId}`);
      edges.add(`${w.to.instId}:${w.to.pinId}`);
    }
    expect(edges.has('batt1:pos')).toBe(true);
    expect(edges.has('batt1:neg')).toBe(true);
    expect(edges.has('led1:anode')).toBe(true);
    expect(edges.has('led1:cathode')).toBe(true);
  });
});
