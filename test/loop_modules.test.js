/**
 * test/loop_modules.test.js — 0-5V → 4-20mA transmitter + 4-20mA → 5V receiver
 *   - def/catalog/guide registration
 *   - transmitter transfer function: I = 4 + (Vin / 5) × 16 mA
 *   - receiver transfer function:    Vout = (I − 4) / 16 × 5 V
 *   - end-to-end chain: battery → transmitter → loop → receiver → Arduino A0
 *   - draw() smoke rendering
 * Run: npx vitest run test/loop_modules.test.js
 */
import { describe, it, expect, beforeEach } from 'vitest';
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
  'js/components/power.js',
  'js/components/sensors.js',
  'js/components/boards.js',
  'js/canvas.js',
], ['CircuitCanvas']);

const { COMPONENT_DEFS, COMPONENT_CLASSES, COMPONENT_CATALOG } = window.ArduinoComponents;

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

function buildRig(components, wires) {
  const { canvasEl, wrapperEl } = makeCanvasStub();
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  cc.components = components;
  cc.wires = wires;
  global.window.CircuitCanvas = cc;
  return cc;
}

function makeInstance(id, type, props = {}) {
  const def = COMPONENT_DEFS[type];
  return {
    id, type, x: 0, y: 0,
    width: def.width, height: def.height,
    props: { ...def.defaultProps, ...props },
    runtimeState: {},
  };
}

const wire = (fromInst, fromPin, toInst, toPin) => ({
  from: { instId: fromInst, pinId: fromPin },
  to: { instId: toInst, pinId: toPin },
});

function makeComponent(inst, canvas) {
  const Cls = COMPONENT_CLASSES[inst.type];
  const comp = new Cls(inst);
  comp.canvas = canvas || null;
  return comp;
}

beforeEach(() => {
  global.window.CircuitCanvas = null;
});

describe('module registration', () => {
  it('defines both components with 5 pins', () => {
    const tx = COMPONENT_DEFS['v_to_i_420ma'];
    const rx = COMPONENT_DEFS['i_to_v_420ma'];
    expect(tx).toBeTruthy();
    expect(rx).toBeTruthy();
    expect(tx.name).toBe('0-5V to 4-20mA Transmitter');
    expect(rx.name).toBe('4-20mA to 5V Converter');
    expect(tx.category).toBe('Sensors');
    expect(rx.category).toBe('Sensors');
    expect(tx.pins.map(p => p.id)).toEqual(['VIN', 'OUT+', 'OUT-', 'VCC', 'GND']);
    expect(rx.pins.map(p => p.id)).toEqual(['IIN+', 'IIN-', 'VOUT', 'VCC', 'GND']);
    expect(tx.interactive[0].field).toBe('vin');
    expect(rx.interactive[0].field).toBe('loopCurrent');
    expect(tx.search).toMatch(/4-20ma/);
    expect(rx.search).toMatch(/arduino/);
  });

  it('registers behaviour classes', () => {
    expect(COMPONENT_CLASSES['v_to_i_420ma']).toBeTruthy();
    expect(COMPONENT_CLASSES['i_to_v_420ma']).toBeTruthy();
    const tx = makeComponent(makeInstance('t', 'v_to_i_420ma'));
    expect(tx.getPins().map(p => p.id)).toEqual(['VIN', 'OUT+', 'OUT-', 'VCC', 'GND']);
  });

  it('appears in the component catalog (Sensors group)', () => {
    const sensors = COMPONENT_CATALOG.find(g => g.category === 'Sensors');
    expect(sensors.ids).toContain('v_to_i_420ma');
    expect(sensors.ids).toContain('i_to_v_420ma');
  });

  it('has guide reference entries', () => {
    const guide = readSrc('js/guide.js');
    expect(guide).toContain('v_to_i_420ma:');
    expect(guide).toContain('i_to_v_420ma:');
  });
});

describe('0-5V to 4-20mA transmitter', () => {
  it('maps 0V → 4mA, 2.5V → 12mA, 5V → 20mA when VIN is unconnected', () => {
    for (const [vin, expected] of [[0, 4], [1.25, 8], [2.5, 12], [5, 20]]) {
      const inst = makeInstance('tx', 'v_to_i_420ma', { vin });
      makeComponent(inst).update(null);
      expect(inst.runtimeState.current).toBeCloseTo(expected, 5);
    }
  });

  it('reads the wired input voltage instead of the slider', () => {
    const batt = makeInstance('batt1', 'battery', { voltage: 3.7 });
    const tx = makeInstance('tx', 'v_to_i_420ma', { vin: 0 });
    const cc = buildRig([batt, tx], [wire('batt1', 'pos', 'tx', 'VIN')]);
    cc.engine.buildGraph(cc.components, cc.wires);
    cc.engine.solve(cc);

    makeComponent(tx, cc).update(cc);
    expect(tx.runtimeState.vin).toBeCloseTo(3.7, 1);
    expect(tx.runtimeState.current).toBeCloseTo(4 + (3.7 / 5) * 16, 3);
  });

  it('drives the loop pin with the shunt voltage V = I × 250Ω', () => {
    const tx = makeInstance('tx', 'v_to_i_420ma', { vin: 5 });
    const cc = buildRig([tx], []);
    makeComponent(tx, cc).update(cc);
    cc.engine.buildGraph(cc.components, cc.wires);
    cc.engine.solve(cc);

    const outNet = cc.engine.getNetForPin('tx', 'OUT+');
    expect(outNet.sources.length).toBe(1);
    expect(outNet.voltage).toBeCloseTo(20 / 4, 5); // 5.0 V across the 250Ω shunt
    const gndNet = cc.engine.getNetForPin('tx', 'GND');
    expect(gndNet.grounds.length).toBe(1);
  });

  it('draws without throwing', () => {
    const { ctx } = makeCanvasStub();
    const inst = makeInstance('tx', 'v_to_i_420ma', { vin: 2.5 });
    expect(() => COMPONENT_DEFS['v_to_i_420ma'].draw(ctx, inst, { isRunning: true })).not.toThrow();
  });
});

describe('4-20mA to 5V receiver', () => {
  it('maps 4mA → 0V, 12mA → 2.5V, 20mA → 5V from the manual slider', () => {
    for (const [loopCurrent, expected] of [[4, 0], [12, 2.5], [20, 5]]) {
      const inst = makeInstance('rx', 'i_to_v_420ma', { loopCurrent });
      makeComponent(inst).update(null);
      expect(inst.runtimeState.loopMa).toBeCloseTo(loopCurrent, 5);
      expect(inst.runtimeState.vOut).toBeCloseTo(expected, 5);
    }
  });

  it('derives the loop current from the loop voltage (250Ω shunt)', () => {
    const batt = makeInstance('batt1', 'battery', { voltage: 3.7 });
    const rx = makeInstance('rx', 'i_to_v_420ma', { loopCurrent: 4 });
    const cc = buildRig([batt, rx], [
      wire('batt1', 'pos', 'rx', 'IIN+'),
      wire('batt1', 'neg', 'rx', 'IIN-'),
    ]);
    cc.engine.buildGraph(cc.components, cc.wires);
    cc.engine.solve(cc);

    makeComponent(rx, cc).update(cc);
    // 3.7 V across 250 Ω = 14.8 mA → Vout = (14.8 − 4) / 16 × 5 = 3.375 V
    expect(rx.runtimeState.loopMa).toBeCloseTo(14.8, 4);
    expect(rx.runtimeState.vOut).toBeCloseTo(3.375, 4);
  });

  it('draws without throwing', () => {
    const { ctx } = makeCanvasStub();
    const inst = makeInstance('rx', 'i_to_v_420ma', { loopCurrent: 16 });
    expect(() => COMPONENT_DEFS['i_to_v_420ma'].draw(ctx, inst, { isRunning: true })).not.toThrow();
  });
});

describe('end-to-end chain (battery → TX → loop → RX → Arduino A0)', () => {
  function buildChain() {
    const batt = makeInstance('batt1', 'battery', { voltage: 3.7 });
    const tx = makeInstance('tx', 'v_to_i_420ma', { vin: 0 });
    const rx = makeInstance('rx', 'i_to_v_420ma', { loopCurrent: 20 });
    const uno = makeInstance('uno', 'arduino_uno');
    const wires = [
      wire('batt1', 'pos', 'tx', 'VIN'),
      wire('batt1', 'neg', 'uno', 'GND1'),
      wire('tx', 'OUT+', 'rx', 'IIN+'),
      wire('tx', 'OUT-', 'rx', 'IIN-'),
      wire('rx', 'VOUT', 'uno', 'A0'),
      wire('rx', 'GND', 'uno', 'GND2'),
    ];
    const cc = buildRig([batt, tx, rx, uno], wires);
    cc.engine.buildGraph(cc.components, cc.wires);
    cc.engine.solve(cc);

    // Same order as canvas._updateSimStateInner: update components, then re-solve
    makeComponent(tx, cc).update(cc);
    makeComponent(rx, cc).update(cc);
    cc.engine.buildGraph(cc.components, cc.wires);
    cc.engine.solve(cc);
    return { cc, batt, tx, rx, uno };
  }

  it('transfers the input voltage through the loop unchanged', () => {
    const { tx, rx } = buildChain();
    expect(tx.runtimeState.current).toBeCloseTo(4 + (3.7 / 5) * 16, 2); // 15.84 mA
    expect(rx.runtimeState.loopMa).toBeCloseTo(tx.runtimeState.current, 5);
    expect(rx.runtimeState.vOut).toBeCloseTo(tx.runtimeState.vin, 1); // unity transfer
    expect(rx.runtimeState.vOut).toBeCloseTo(3.7, 1);
  });

  it('presents the loop and output voltages to the electrical engine', () => {
    const { cc, tx, rx } = buildChain();
    const mA = tx.runtimeState.current;
    expect(cc.engine.getVoltageAtPin(tx.id, 'OUT+')).toBeCloseTo(mA / 4, 4);
    expect(cc.engine.getVoltageAtPin(rx.id, 'IIN+')).toBeCloseTo(mA / 4, 4);
    expect(cc.engine.getVoltageAtPin(rx.id, 'VOUT')).toBeCloseTo(rx.runtimeState.vOut, 4);
  });

  it('analogRead(A0) sees the receiver output voltage', () => {
    const { cc, rx, uno } = buildChain();
    const adc = cc._readAnalogInput(uno.id, 'A0');
    expect(adc).toBeGreaterThan(0);
    expect(adc).toBe(Math.round((rx.runtimeState.vOut / 5) * 1023));
    expect(adc).toBeCloseTo(Math.round((3.7 / 5) * 1023), -1);
  });
});
