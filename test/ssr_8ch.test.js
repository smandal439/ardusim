/**
 * test/ssr_8ch.test.js — 5V 8-Channel Solid State Relay Module
 * Run: npx vitest run test/ssr_8ch.test.js
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

const { CircuitCanvas, COMPONENT_DEFS, getComponentClass, COMPONENT_CATALOG } = loadScripts([
  'js/electrical.js',
  'js/components/base.js',
  'js/components/passive.js',
  'js/components/power.js',
  'js/components/output.js',
  'js/components/boards.js',
  'js/components/actuators.js',
  'js/canvas.js',
], ['CircuitCanvas', 'COMPONENT_DEFS', 'getComponentClass', 'COMPONENT_CATALOG']);

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

// battery(+) — 220 Ω — out1a ; out1b — battery(−)
function ssrLoopCircuit() {
  return {
    components: [
      { id: 'batt1', type: 'battery', x: 0, y: 0, props: { voltage: 3.7 }, runtimeState: {} },
      { id: 'r1', type: 'resistor', x: 60, y: 0, props: { value: 220, unit: 'Ω' }, runtimeState: {} },
      { id: 'ssr1', type: 'ssr_8ch', x: 140, y: 0, props: { trigger: 'high' }, runtimeState: { channels: [false, false, false, false, false, false, false, false] } },
    ],
    wires: [
      { from: { instId: 'batt1', pinId: 'pos' }, to: { instId: 'r1', pinId: 'p1' } },
      { from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'ssr1', pinId: 'out1a' } },
      { from: { instId: 'ssr1', pinId: 'out1b' }, to: { instId: 'batt1', pinId: 'neg' } },
    ],
  };
}

describe('ssr_8ch — registration', () => {
  it('is registered with the 26 module pins', () => {
    const def = COMPONENT_DEFS['ssr_8ch'];
    expect(def).toBeTruthy();
    expect(def.width).toBe(200);
    expect(def.height).toBe(96);

    const pinIds = def.pins.map(p => p.id);
    expect(pinIds.length).toBe(26);
    expect(pinIds.filter(id => /^out\d[ab]$/.test(id)).length).toBe(16);
    expect(pinIds.filter(id => /^in\d$/.test(id)).length).toBe(8);
    expect(pinIds).toContain('vcc');
    expect(pinIds).toContain('gnd');

    const out1a = def.pins.find(p => p.id === 'out1a');
    expect(out1a.side).toBe('top');
    expect(out1a.y).toBe(0);
    const in1 = def.pins.find(p => p.id === 'in1');
    expect(in1.side).toBe('bottom');
    expect(in1.y).toBe(96);

    expect(typeof getComponentClass('ssr_8ch')).toBe('function');
    const inst = { id: 'x', type: 'ssr_8ch', x: 0, y: 0, props: {}, runtimeState: {} };
    const comp = new (getComponentClass('ssr_8ch'))(inst);
    expect(comp.getPins().map(p => p.id)).toEqual(pinIds);
  });

  it('appears in the Actuators catalog with a high/low trigger select', () => {
    const cat = COMPONENT_CATALOG.find(c => c.category === 'Actuators');
    expect(cat.ids).toContain('ssr_8ch');

    const def = COMPONENT_DEFS['ssr_8ch'];
    expect(def.defaultProps.trigger).toBe('high');
    const trig = def.interactive.find(i => i.field === 'trigger');
    expect(trig.type).toBe('select');
    expect(trig.options.map(o => o.value)).toEqual(['high', 'low']);
  });

  it('draws without throwing (screw terminals, chips, header)', () => {
    const def = COMPONENT_DEFS['ssr_8ch'];
    const texts = [];
    const ctx = new Proxy({}, {
      get(_, prop) {
        if (prop === 'fillText') return (t) => texts.push(String(t));
        if (prop === 'measureText') return () => ({ width: 0 });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => ({ addColorStop() {} });
        }
        return () => {};
      },
      set: () => true,
    });
    const inst = {
      x: 0, y: 0, props: { trigger: 'high' },
      runtimeState: { channels: [true, false, false, false, false, false, false, false] },
      selected: false,
    };
    expect(() => def.draw(ctx, inst, null)).not.toThrow();
    expect(texts).toContain('HIGH TRIGGER');
    expect(texts).toContain('5V 8CH SSR MODULE');
    expect(texts).toContain('PWR');
  });
});

describe('ssr_8ch — guide & example integration', () => {
  it('has a guide entry pointing at the chaser example', () => {
    const guide = readSrc('js/guide.js');
    expect(guide).toMatch(/\bssr_8ch:\s*\{/);
    expect(guide).toContain("exampleId: 'ssr_8ch_chaser'");
    expect(guide).toContain('5V 8-Channel SSR Module');
    expect(guide).toContain('out8b');
  });

  it('ships the ssr_8ch_chaser example wired from D2..D9 to IN1..IN8', () => {
    const ex = JSON.parse(readSrc('Examples/ssr_8ch_chaser.json'));
    expect(ex.id).toBe('ssr_8ch_chaser');
    expect(ex.circuit.components.some(c => c.type === 'ssr_8ch')).toBe(true);

    const pinOf = (wire, id) => (wire.from.instId === id ? wire.from.pinId
      : wire.to.instId === id ? wire.to.pinId : null);
    for (let i = 1; i <= 8; i++) {
      const wl = ex.circuit.wires.find(w =>
        (w.from.instId === 'b1' && w.from.pinId === `D${i + 1}`)
        || (w.to.instId === 'b1' && w.to.pinId === `D${i + 1}`));
      expect(wl).toBeTruthy();
      expect(pinOf(wl, 'ssr1')).toBe(`in${i}`);
    }

    expect(ex.circuit.components.filter(c => c.type === 'resistor').length).toBe(8);
    expect(ex.circuit.components.filter(c => c.type === 'led').length).toBe(8);
    // Components are sized from their defs — no baked-in scaled dimensions
    expect(ex.circuit.components.find(c => c.id === 'b1').width).toBeUndefined();
    expect(ex.circuit.components.find(c => c.id === 'ssr1').width).toBeUndefined();

    // Every wire endpoint must exist on the component definition
    for (const wl of ex.circuit.wires) {
      for (const end of [wl.from, wl.to]) {
        const inst = ex.circuit.components.find(c => c.id === end.instId);
        expect(inst).toBeTruthy();
        expect(COMPONENT_DEFS[inst.type].pins.some(p => p.id === end.pinId)).toBe(true);
      }
    }
    expect(ex.circuit.wires.length).toBe(42);
  });
});

describe('ssr_8ch — channel logic', () => {
  const make = (props = {}) => {
    const Cls = getComponentClass('ssr_8ch');
    const inst = { id: 'ssr1', type: 'ssr_8ch', x: 0, y: 0, props: { trigger: 'high', ...props }, runtimeState: {} };
    return new Cls(inst);
  };

  it('closes channels from input voltages (high-level trigger)', () => {
    const comp = make();
    global.window.ArduinoSim = {
      getPinVoltage: (i, pid) => (pid === 'in1' ? 5 : pid === 'in4' ? 3 : 0),
      pinStates: {},
    };
    comp.update();
    expect(comp.runtimeState.channels).toEqual([true, false, false, true, false, false, false, false]);
    global.window.ArduinoSim = null;
  });

  it('inverts every channel for low-level trigger', () => {
    const comp = make({ trigger: 'low' });
    global.window.ArduinoSim = {
      getPinVoltage: (i, pid) => (pid === 'in1' ? 5 : 0),
      pinStates: {},
    };
    comp.update();
    expect(comp.runtimeState.channels).toEqual([false, true, true, true, true, true, true, true]);
    global.window.ArduinoSim = null;
  });

  it('honours a forced input level over the solved voltage', () => {
    const comp = make({ forcedInputs: { in2: false } });
    global.window.ArduinoSim = {
      getPinVoltage: (i, pid) => (pid === 'in1' || pid === 'in2' ? 5 : 0),
      pinStates: {},
    };
    comp.update();
    expect(comp.runtimeState.channels[0]).toBe(true);
    expect(comp.runtimeState.channels[1]).toBe(false);
    global.window.ArduinoSim = null;
  });

  it('defaults to all-open with no simulator', () => {
    global.window.ArduinoSim = null;
    const comp = make();
    comp.update();
    expect(comp.runtimeState.channels).toEqual([false, false, false, false, false, false, false, false]);
  });
});

describe('ssr_8ch — electrical continuity', () => {
  it('keeps the output pair isolated while the channel is off', () => {
    const cc = buildRig(ssrLoopCircuit());
    global.window.ArduinoSim = { getPinVoltage: () => 0, pinStates: {} };
    cc.updateSimState({});

    const ssr = cc.components.find(c => c.id === 'ssr1');
    expect(ssr.runtimeState.channels[0]).toBe(false);
    expect(cc.engine.getNetForPin('ssr1', 'out1a'))
      .not.toBe(cc.engine.getNetForPin('ssr1', 'out1b'));
    expect(cc.engine.measureResistance('ssr1', 'out1b', 'batt1', 'pos')).toBe(Infinity);
    global.window.ArduinoSim = null;
  });

  it('shorts the output pair when the input goes high (pre-update path)', () => {
    const cc = buildRig(ssrLoopCircuit());
    global.window.ArduinoSim = {
      getPinVoltage: (i, pid) => (pid === 'in1' ? 5 : 0),
      pinStates: {},
    };
    cc.updateSimState({});

    const ssr = cc.components.find(c => c.id === 'ssr1');
    // pre-update ran before buildGraph, so the closed channel is in the graph
    expect(ssr.runtimeState.channels[0]).toBe(true);
    expect(cc.engine.getNetForPin('ssr1', 'out1a'))
      .toBe(cc.engine.getNetForPin('ssr1', 'out1b'));
    expect(cc.engine.measureResistance('ssr1', 'out1b', 'batt1', 'pos')).toBe(220);
    // other channels stay isolated from channel 1
    expect(cc.engine.getNetForPin('ssr1', 'out2a'))
      .not.toBe(cc.engine.getNetForPin('ssr1', 'out1a'));
    global.window.ArduinoSim = null;
  });
});

describe('ssr_8ch — LED load through the output pair', () => {
  it('gives the LED a ground path only while the channel closes', () => {
    const cc = buildRig({
      components: [
        { id: 'batt1', type: 'battery', x: 0, y: 0, props: { voltage: 3.7 }, runtimeState: {} },
        { id: 'r1', type: 'resistor', x: 60, y: 0, props: { value: 220, unit: 'Ω' }, runtimeState: {} },
        { id: 'led1', type: 'led', x: 120, y: 0, props: { color: '#ff3333', colorName: 'Red' }, runtimeState: {} },
        { id: 'ssr1', type: 'ssr_8ch', x: 200, y: 0, props: { trigger: 'high' }, runtimeState: { channels: [false, false, false, false, false, false, false, false] } },
      ],
      wires: [
        { from: { instId: 'batt1', pinId: 'pos' }, to: { instId: 'r1', pinId: 'p1' } },
        { from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'led1', pinId: 'anode' } },
        { from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'ssr1', pinId: 'out1a' } },
        { from: { instId: 'ssr1', pinId: 'out1b' }, to: { instId: 'batt1', pinId: 'neg' } },
      ],
    });
    global.window.ArduinoSim = null;

    // Channel open: anode side still sees +, cathode side is stranded
    let anode = cc._tracePinNet('led1', 'anode');
    let cathode = cc._tracePinNet('led1', 'cathode');
    expect(anode.sources.length).toBeGreaterThan(0);
    expect(cathode.grounds.length).toBe(0);

    // Close channel 1: trace now crosses the SSR to battery(−)
    cc.components.find(c => c.id === 'ssr1').runtimeState.channels[0] = true;
    cathode = cc._tracePinNet('led1', 'cathode');
    expect(cathode.grounds.length).toBeGreaterThan(0);
    expect(cathode.grounds[0].instId).toBe('batt1');
    anode = cc._tracePinNet('led1', 'anode');
    expect(anode.sources.length).toBeGreaterThan(0);
  });
});
