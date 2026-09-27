/**
 * test/ic_logic_tags.test.js — Logic-level forcing machinery for digital ICs:
 *   - classifyICTags() splits an IC's digital pins into input / output tags
 *   - props.forcedInputs drives IC logic (class _readDigitalInput, canvas
 *     _readDigitalInput/_hasDigitalInputSource, getPinVoltage origin + wire end)
 *   - forced inputs compute real outputs (74HC02 NOR end-to-end)
 *   - every IC output pin is exposed in runtimeState for the output tags
 *   - forcedInputs survives canvas.serialize(); UI hooks present in source
 * Run: node node_modules\vitest\vitest.mjs run test/ic_logic_tags.test.js
 */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

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
  'js/components/power.js',
  'js/components/function_generator.js',
  'js/components/input.js',
  'js/components/probe.js',
  'js/components/passive.js',
  'js/components/ics.js',
  'js/canvas.js',
], ['CircuitCanvas']);

const { ArduinoSimulator } = loadScripts(['js/simulator.js'], ['ArduinoSimulator']);

const DEFS = () => window.ArduinoComponents.COMPONENT_DEFS;
const getClazz = (type) => window.ArduinoComponents.getComponentClass(type);
const classify = (type) => window.classifyICTags(type, (DEFS()[type] || {}).pins || []);

function bareCanvas(components = [], wires = []) {
  const fake = Object.create(CircuitCanvas.prototype);
  fake.components = components;
  fake.wires = wires;
  return fake;
}
function wiresBetween(aId, aPin, bId, bPin) {
  return [{ id: 'w1', from: { instId: aId, pinId: aPin }, to: { instId: bId, pinId: bPin } }];
}

afterEach(() => { window.CircuitCanvas = null; });

describe('classifyICTags — input/output tag grouping', () => {
  it('74HC02: Y pins out, A/B pins in', () => {
    const t = classify('ic_74hc02');
    expect([...t.outputs].sort()).toEqual(['Y1', 'Y2', 'Y3', 'Y4']);
    expect([...t.inputs].sort()).toEqual(['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4']);
  });

  it('74HC595: Q pins out, control pins in', () => {
    const t = classify('ic_74hc595');
    expect([...t.outputs].sort()).toEqual(['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'QHn']);
    expect([...t.inputs].sort()).toEqual(['OE', 'RCLK', 'SER', 'SRCLK', 'SRCLR']);
  });

  it('74HC139: both units\' Y pins out, E/A pins in', () => {
    const t = classify('ic_74hc139');
    expect([...t.outputs].sort()).toEqual(['Y0_1', 'Y0_2', 'Y1_1', 'Y1_2', 'Y2_1', 'Y2_2', 'Y3_1', 'Y3_2']);
    expect(t.inputs).toContain('E1');
    expect(t.inputs).toContain('A0_1');
    expect(t.inputs.length).toBeGreaterThan(4);
  });

  it('74HC4017: Q0-Q9 + Q59 out, clock/reset pins in', () => {
    const t = classify('ic_74hc4017');
    expect([...t.outputs].sort()).toEqual(['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q59', 'Q6', 'Q7', 'Q8', 'Q9']);
    expect(t.inputs).toContain('CP0');
    expect(t.inputs).toContain('MR');
  });

  it('555 has output tag only (inputs are not forceable — no class update)', () => {
    const t = classify('ic_555');
    expect(t.outputs).toEqual(['OUT']);
    expect(t.inputs).toEqual([]);
  });

  it('non-IC and analog-only types return null', () => {
    expect(classify('potentiometer')).toBeNull();
    expect(classify('lm741')).toBeNull();
    expect(classify('push_button')).toBeNull();
  });
});

describe('forced input level → IC logic', () => {
  it('Component.getForcedLevel returns 0/1/null', () => {
    const C = getClazz('ic_74hc86');
    const c = new C({ id: 'ic1', type: 'ic_74hc86', props: {}, runtimeState: {} });
    expect(c.getForcedLevel('A1')).toBeNull();
    c.props.forcedInputs = { A1: 1, B1: 0 };
    expect(c.getForcedLevel('A1')).toBe(1);
    expect(c.getForcedLevel('B1')).toBe(0);
    expect(c.getForcedLevel('Y1')).toBeNull();
  });

  it('class _readDigitalInput honours the force (74HC86)', () => {
    window.CircuitCanvas = { _getConnectedPinNum: () => null, components: [], wires: [] };
    const C = getClazz('ic_74hc86');
    const inst = { id: 'ic1', type: 'ic_74hc86', props: { forcedInputs: { A1: 1 } }, runtimeState: {} };
    const c = new C(inst);
    expect(c._readDigitalInput('A1')).toBe(1);
    inst.props.forcedInputs.A1 = 0;
    expect(c._readDigitalInput('A1')).toBe(0);
    expect(c._readDigitalInput('B1')).toBe(0); // unforced, unconnected
  });

  it('74HC02 computes NOR outputs from forced inputs end-to-end', () => {
    window.CircuitCanvas = { _getConnectedPinNum: () => null, components: [], wires: [] };
    const C = getClazz('ic_74hc02');
    const inst = { id: 'ic1', type: 'ic_74hc02', props: { forcedInputs: { A1: 0, B1: 0 } }, runtimeState: {} };
    const c = new C(inst);
    c.update(null);
    expect(inst.runtimeState.Y1).toBe(255); // 0 NOR 0 = 1
    inst.props.forcedInputs = { A1: 1, B1: 1 };
    c.update(null);
    expect(inst.runtimeState.Y1).toBe(0); // 1 NOR 1 = 0
    inst.props.forcedInputs = { A1: 1, B1: 0 };
    c.update(null);
    expect(inst.runtimeState.Y1).toBe(0); // 1 NOR 0 = 0
  });

  it('canvas _readDigitalInput / _hasDigitalInputSource honour the force', () => {
    const ic = { id: 'ic1', type: 'ic_74hc02', props: { forcedInputs: { A1: 1 } }, runtimeState: {} };
    const fake = bareCanvas([ic], []);
    expect(fake._readDigitalInput('ic1', 'A1')).toBe(1);
    expect(fake._hasDigitalInputSource('ic1', 'A1')).toBe(true);
    ic.props.forcedInputs.A1 = 0;
    expect(fake._readDigitalInput('ic1', 'A1')).toBe(0);
    delete ic.props.forcedInputs.A1;
    expect(fake._readDigitalInput('ic1', 'A1')).toBe(0); // unforced, no wire
    expect(fake._hasDigitalInputSource('ic1', 'A1')).toBe(false);
  });

  it('getPinVoltage returns 5/0 for a forced origin pin', () => {
    window.CircuitCanvas = bareCanvas([], []);
    const sim = new ArduinoSimulator();
    const ic = { id: 'ic1', type: 'ic_74hc02', props: { forcedInputs: { A1: 1 } }, runtimeState: {} };
    expect(sim.getPinVoltage(ic, 'A1')).toBe(5);
    ic.props.forcedInputs.A1 = 0;
    expect(sim.getPinVoltage(ic, 'A1')).toBe(0);
    expect(sim.getPinVoltage(ic, 'B1')).toBe(0);
  });

  it('getPinVoltage sees a forced pin through a wire (probe → IC input)', () => {
    const ic = { id: 'ic1', type: 'ic_74hc02', props: { forcedInputs: { A1: 1 } }, runtimeState: {} };
    const probe = { id: 'la1', type: 'la_probe_ch1', runtimeState: {} };
    window.CircuitCanvas = bareCanvas([probe, ic], wiresBetween('la1', 'tip', 'ic1', 'A1'));
    const sim = new ArduinoSimulator();
    expect(sim.getPinVoltage(probe, 'tip')).toBe(5);
    ic.props.forcedInputs.A1 = 0;
    expect(sim.getPinVoltage(probe, 'tip')).toBe(0);
  });
});

describe('every IC output pin is readable for the output tags', () => {
  const TYPES = [
    'ic_74hc00', 'ic_74hc04', 'ic_74hc08', 'ic_74hc32', 'ic_74hc595', 'ic_74hc138',
    'ic_74hc245', 'ic_74hc74', 'ic_74hc165', 'ic_74hc193', 'ic_74hc47', 'ic_74hc148',
    'ic_74hc02', 'ic_74hc86', 'ic_74hc139', 'ic_74hc153', 'ic_74hc164', 'ic_74hc4017',
  ];
  for (const type of TYPES) {
    it(`${type}: update() stores every classified output in runtimeState`, () => {
      window.CircuitCanvas = bareCanvas([], []);
      const t = classify(type);
      expect(t).not.toBeNull();
      expect(t.outputs.length).toBeGreaterThan(0);
      const C = getClazz(type);
      expect(C).toBeTruthy();
      const inst = { id: 'u1', type, props: {}, runtimeState: {} };
      const c = new C(inst);
      // two passes (inputs 0 then 1) so edge-triggered outputs latch too
      for (const lvl of [0, 1]) {
        const fi = {};
        for (const pinId of t.inputs) fi[pinId] = lvl;
        c.props.forcedInputs = fi;
        c.update(null);
      }
      for (const out of t.outputs) {
        expect(Object.keys(inst.runtimeState), `${type}.${out} present`).toContain(out);
        expect([0, 1, 255], `${type}.${out} value`).toContain(Number(inst.runtimeState[out]));
      }
    });
  }
});

describe('persistence + source wiring', () => {
  it('canvas.serialize() keeps props.forcedInputs', () => {
    const inst = { id: 'ic1', type: 'ic_74hc02', x: 0, y: 0, rotation: 0,
      props: { forcedInputs: { A1: 1, B2: 0 } }, runtimeState: {} };
    const out = CircuitCanvas.prototype.serialize.call({ components: [inst], wires: [] });
    expect(out.components[0].props.forcedInputs).toEqual({ A1: 1, B2: 0 });
  });

  it('ics.js: all 18 class _readDigitalInput bodies check the force first', () => {
    const src = readSrc('js/components/ics.js');
    expect(src.split('const forced = this.getForcedLevel(pinId);').length - 1).toBe(18);
  });

  it('source hooks: canvas force lookup, base helper, hidden modal prop row', () => {
    expect(readSrc('js/canvas.js').includes('_getForcedLevel(instId, pinId)')).toBe(true);
    expect(readSrc('js/canvas.js').includes('function classifyICTags(type, pins)')).toBe(true);
    expect(readSrc('js/components/base.js').includes('getForcedLevel(pinId)')).toBe(true);
    const app = readSrc('js/app.js');
    expect(app.includes("if (key === 'forcedInputs') return;")).toBe(true);
    expect(app.includes('_refreshIcLvlTags')).toBe(false); // panel tags moved to canvas
  });

  it('simulator getPinVoltage checks forced levels at both ends', () => {
    const src = readSrc('js/simulator.js');
    expect(src.includes('const forcedSelf = inst.props && inst.props.forcedInputs;')).toBe(true);
    expect(src.includes('const forcedFar = other.props && other.props.forcedInputs;')).toBe(true);
  });
});
