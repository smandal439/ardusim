/**
 * test/bulb_polarity.test.js — 12V incandescent bulb is non-polar:
 *   - lights with source/ground wired in either orientation
 *   - lights when driven from a digital pin in either orientation
 *   - stays dark for incomplete circuits (open pin, no source, no ground)
 *   - net tracing crosses the bulb from the cathode side too
 * Run: npx vitest run test/bulb_polarity.test.js
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
  'js/components/power.js',
  'js/components/input.js',
  'js/components/output.js',
  'js/canvas.js',
], ['CircuitCanvas']);

function makeRig(circuit) {
  const ctx = new Proxy({}, {
    get(_, p) {
      if (p === 'measureText') return () => ({ width: 0 });
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
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
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  cc.components = JSON.parse(JSON.stringify(circuit.components));
  cc.wires = JSON.parse(JSON.stringify(circuit.wires));
  return cc;
}

const BULB = { id: 'bl', type: 'bulb_12v', x: 200, y: 0, runtimeState: {} };

/** power_5v/power_gnd driving the bulb. srcPin/gndPin pick the orientation. */
function supplyCircuit({ srcPin = 'anode', gndPin = 'cathode', bothWired = true } = {}) {
  const wires = [
    { id: 'w1', from: { instId: 'v5', pinId: 'vcc' }, to: { instId: 'bl', pinId: srcPin } },
  ];
  if (bothWired) {
    wires.push({ id: 'w2', from: { instId: 'bl', pinId: gndPin }, to: { instId: 'g', pinId: 'gnd' } });
  }
  return {
    components: [
      { id: 'v5', type: 'power_5v', x: 0, y: 0 },
      { id: 'g', type: 'power_gnd', x: 0, y: 100 },
      { ...BULB, runtimeState: {} },
    ],
    wires,
  };
}

/** Board D9 HIGH driving the bulb in the given orientation. */
function digitalCircuit({ srcPin = 'anode', gndPin = 'cathode' } = {}) {
  return {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 0, y: 0 },
      { ...BULB, runtimeState: {} },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D9' }, to: { instId: 'bl', pinId: srcPin } },
      { id: 'w2', from: { instId: 'bl', pinId: gndPin }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  };
}

function brightnessOf(circuit, sim) {
  const cc = makeRig(circuit);
  global.window.ArduinoSim = sim || null;
  cc.updateSimState(sim ? sim.pinStates : {});
  global.window.ArduinoSim = null;
  return cc.components.find(c => c.id === 'bl').runtimeState.brightness;
}

const digitalSim = () => ({
  pinStates: { pin_9: 255 },
  pinModes: { pin_9: 'OUTPUT' },
  setPinState(k, v) { this.pinStates[k] = v; },
});

describe('bulb_12v — non-polar lighting', () => {
  it('lights with source on anode and ground on cathode (forward)', () => {
    expect(brightnessOf(supplyCircuit())).toBeCloseTo(5 / 12, 5);
  });

  it('lights with source on cathode and ground on anode (reversed)', () => {
    expect(brightnessOf(supplyCircuit({ srcPin: 'cathode', gndPin: 'anode' }))).toBeCloseTo(5 / 12, 5);
  });

  it('lights identically in both orientations', () => {
    const fwd = brightnessOf(supplyCircuit());
    const rev = brightnessOf(supplyCircuit({ srcPin: 'cathode', gndPin: 'anode' }));
    expect(fwd).toBe(rev);
  });

  it('lights from a digital pin HIGH in forward orientation', () => {
    expect(brightnessOf(digitalCircuit(), digitalSim())).toBeCloseTo(5 / 12, 5);
  });

  it('lights from a digital pin HIGH in reversed orientation', () => {
    expect(brightnessOf(digitalCircuit({ srcPin: 'cathode', gndPin: 'anode' }), digitalSim()))
      .toBeCloseTo(5 / 12, 5);
  });
});

describe('bulb_12v — incomplete circuits stay dark', () => {
  it('stays dark when only one pin is wired', () => {
    expect(brightnessOf(supplyCircuit({ bothWired: false }))).toBe(0);
  });

  it('stays dark with no supply on either pin (both grounded)', () => {
    const circuit = supplyCircuit();
    circuit.wires = [
      { id: 'w1', from: { instId: 'bl', pinId: 'anode' }, to: { instId: 'g', pinId: 'gnd' } },
      { id: 'w2', from: { instId: 'bl', pinId: 'cathode' }, to: { instId: 'g', pinId: 'gnd' } },
    ];
    expect(brightnessOf(circuit)).toBe(0);
  });

  it('stays dark with no ground on either pin (both supplied)', () => {
    const circuit = supplyCircuit();
    circuit.wires = [
      { id: 'w1', from: { instId: 'v5', pinId: 'vcc' }, to: { instId: 'bl', pinId: 'anode' } },
      { id: 'w2', from: { instId: 'v5', pinId: 'vcc' }, to: { instId: 'bl', pinId: 'cathode' } },
    ];
    expect(brightnessOf(circuit)).toBe(0);
  });
});

describe('bulb_12v — net tracing across the filament', () => {
  it('sees the supply through the bulb when tracing from the cathode side', () => {
    // supply → anode, trace starts behind the bulb at cathode:
    // the old forward-only pass-through blocked this entry direction.
    const cc = makeRig({
      components: [
        { id: 'v5', type: 'power_5v', x: 0, y: 0 },
        { id: 'bl', type: 'bulb_12v', x: 200, y: 0, runtimeState: {} },
        { id: 'r1', type: 'resistor', x: 400, y: 0, props: { value: 220 } },
      ],
      wires: [
        { id: 'w1', from: { instId: 'v5', pinId: 'vcc' }, to: { instId: 'bl', pinId: 'anode' } },
        { id: 'w2', from: { instId: 'bl', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      ],
    });
    const net = cc._tracePinNet('r1', 'p1', []);
    expect(net.sources.length).toBeGreaterThan(0);
    expect(net.sources[0].voltage).toBe(5);
    expect(net.sources[0].resistance).toBeGreaterThanOrEqual(12); // filament resistance accumulated
  });

  it('sees the supply through a reversed bulb (cathode fed)', () => {
    const cc = makeRig({
      components: [
        { id: 'v5', type: 'power_5v', x: 0, y: 0 },
        { id: 'bl', type: 'bulb_12v', x: 200, y: 0, runtimeState: {} },
        { id: 'r1', type: 'resistor', x: 400, y: 0, props: { value: 220 } },
      ],
      wires: [
        { id: 'w1', from: { instId: 'v5', pinId: 'vcc' }, to: { instId: 'bl', pinId: 'cathode' } },
        { id: 'w2', from: { instId: 'bl', pinId: 'anode' }, to: { instId: 'r1', pinId: 'p1' } },
      ],
    });
    const net = cc._tracePinNet('r1', 'p1', []);
    expect(net.sources.length).toBeGreaterThan(0);
    expect(net.sources[0].voltage).toBe(5);
  });
});
