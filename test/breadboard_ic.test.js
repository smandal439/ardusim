/**
 * test/breadboard_ic.test.js — Breadboard ↔ digital-IC compatibility:
 *   - getPinVoltage walks wires THROUGH breadboard internal nodes
 *   - rail/column ties (power_5v/power_gnd), button pass-through,
 *     board outputs, IC→IC chaining, LA probes, cross-half isolation
 *   - canvas _readDigitalInput / _hasDigitalInputSource breadboard hop
 *   - engine _breadboardGroup mirrors passive.js pin scheme;
 *     _getInternalConnections joins each column node
 *   - new-IC source-level checks (IC_OUTPUT_MAP, _classifyComponent)
 * Run: npx vitest run test/breadboard_ic.test.js
 */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* Minimal browser-like globals (same pattern as test/tm1637.test.js) */
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

const { CircuitCanvas, ElectricalEngine, COMPONENT_DEFS, PIN_TYPE } = loadScripts([
  'js/electrical.js',
  'js/components/base.js',
  'js/components/power.js',
  'js/components/function_generator.js',
  'js/components/input.js',
  'js/components/probe.js',
  'js/components/passive.js',
  'js/components/ics.js',
  'js/canvas.js',
], ['CircuitCanvas', 'ElectricalEngine', 'COMPONENT_DEFS', 'PIN_TYPE']);

const { ArduinoSimulator } = loadScripts(['js/simulator.js'], ['ArduinoSimulator']);

const BOARD_TYPES = new Set(['arduino_uno', 'arduino_nano', 'esp32_devkit_v1', 'lpc2148',
  'stm32f746_disco', 'pico2w', 'intel_8085', 'intel_8051']);

/* ---- circuit helpers (plain objects; BFS reads type/id/runtimeState) ---- */
function pinNum(pinId) {
  const d = /^D(\d+)$/.exec(pinId); if (d) return parseInt(d[1], 10);
  const a = /^A(\d+)$/.exec(pinId); if (a) return 14 + parseInt(a[1], 10);
  return null;
}
function makeCanvas(components, wires) {
  const stub = { components, wires, engine: null };
  stub._pinToNumber = pinNum;
  stub._getWireTarget = (instId, pid) => {
    for (const wire of wires) {
      if (wire.from.instId === instId && wire.from.pinId === pid) {
        const inst = components.find(c => c.id === wire.to.instId);
        return inst ? { inst, pinId: wire.to.pinId } : null;
      }
      if (wire.to.instId === instId && wire.to.pinId === pid) {
        const inst = components.find(c => c.id === wire.from.instId);
        return inst ? { inst, pinId: wire.from.pinId } : null;
      }
    }
    return null;
  };
  stub._getConnectedPinNum = (instId, pid) => {
    const inst = components.find(c => c.id === instId);
    if (inst && BOARD_TYPES.has(inst.type)) return pinNum(pid);
    for (const w of wires) {
      let far = null;
      if (w.from.instId === instId && w.from.pinId === pid) far = w.to;
      else if (w.to.instId === instId && w.to.pinId === pid) far = w.from;
      if (!far) continue;
      const oi = components.find(c => c.id === far.instId);
      if (oi && BOARD_TYPES.has(oi.type)) return pinNum(far.pinId);
    }
    return null;
  };
  return stub;
}
let wireSeq = 0;
function w(a, aPin, b, bPin) {
  return { id: `w${++wireSeq}`, from: { instId: a.id, pinId: aPin }, to: { instId: b.id, pinId: bPin } };
}
function el(type, id, runtimeState = {}) {
  return { id, type, x: 0, y: 0, rotation: 0, props: {}, runtimeState };
}

afterEach(() => { global.window.CircuitCanvas = null; });

/* ═══════════════ engine grouping ═══════════════ */
describe('electrical engine breadboard grouping', () => {
  const eng = new ElectricalEngine('t');

  it('uses the passive.js pin-id scheme (ut/ub/lt/lb + rails)', () => {
    expect(eng._breadboardGroup('ut5')).toBe('u5');
    expect(eng._breadboardGroup('ub5')).toBe('u5');
    expect(eng._breadboardGroup('lt5')).toBe('l5');
    expect(eng._breadboardGroup('lb5')).toBe('l5');
    expect(eng._breadboardGroup('rp')).toBe('rail_tp');
    expect(eng._breadboardGroup('bn')).toBe('rail_bn');
    expect(eng._breadboardGroup('1a')).toBe(null); // legacy dead ids stay null
  });

  it('upper and lower halves are separate nodes', () => {
    expect(eng._breadboardGroup('ut5')).not.toBe(eng._breadboardGroup('lt5'));
  });

  it('_getInternalConnections joins each column node (utN ↔ ubN)', () => {
    const bb = { id: 'bb1', type: 'breadboard' };
    const conns = eng._getInternalConnections(bb);
    const hasPair = (a, b) => conns.some(([x, y]) =>
      (x === `bb1:${a}` && y === `bb1:${b}`) || (x === `bb1:${b}` && y === `bb1:${a}`));
    expect(hasPair('ut5', 'ub5')).toBe(true);
    expect(hasPair('lt7', 'lb7')).toBe(true);
    expect(hasPair('ut5', 'lt5')).toBe(false);
    expect(hasPair('ut5', 'ut6')).toBe(false);
  });

  it('source classifies all six new ICs via _classifyComponent', () => {
    const src = readSrc('js/electrical.js');
    const re = /case 'ic_74hc02':[\s\S]*?case 'ic_74hc4017':[\s\S]*?case 'lm741':\s*this\._classifyIC\(inst\);/;
    expect(re.test(src)).toBe(true);
  });
});

/* ═══════════════ getPinVoltage through breadboard nodes ═══════════════ */
describe('getPinVoltage walks through breadboard nodes', () => {
  const sim = new ArduinoSimulator();

  it('resolves same-column holes (fn on ut5 → IC input on ub5)', () => {
    const bb = el('breadboard', 'bb');
    const fn = el('func_gen', 'fn', { ch1_voltage: 5 });
    const ic = el('ic_74hc86', 'ic1');
    global.window.CircuitCanvas = makeCanvas([bb, fn, ic], [w(fn, 'ch1_out', bb, 'ut5'), w(ic, 'A1', bb, 'ub5')]);
    expect(sim.getPinVoltage(ic, 'A1')).toBe(5);
  });

  it('cross-half is NOT connected (ut5 vs lt5)', () => {
    const bb = el('breadboard', 'bb');
    const fn = el('func_gen', 'fn', { ch1_voltage: 5 });
    const ic = el('ic_74hc02', 'ic1');
    global.window.CircuitCanvas = makeCanvas([bb, fn, ic], [w(fn, 'ch1_out', bb, 'ut5'), w(ic, 'A1', bb, 'lt5')]);
    expect(sim.getPinVoltage(ic, 'A1')).toBe(0);
  });

  it('power_5v tie through a column → 5V', () => {
    const bb = el('breadboard', 'bb');
    const pw = el('power_5v', 'pw');
    const ic = el('ic_74hc153', 'ic1');
    global.window.CircuitCanvas = makeCanvas([bb, pw, ic], [w(pw, 'vcc', bb, 'ub3'), w(ic, 'I0_1', bb, 'ut3')]);
    expect(sim.getPinVoltage(ic, 'I0_1')).toBe(5);
  });

  it('power rail rp feeds an IC pin wired to the same rail', () => {
    const bb = el('breadboard', 'bb');
    const pw = el('power_5v', 'pw');
    const ic = el('ic_74hc164', 'ic1');
    global.window.CircuitCanvas = makeCanvas([bb, pw, ic], [w(pw, 'vcc', bb, 'rp'), w(ic, 'MR', bb, 'rp')]);
    expect(sim.getPinVoltage(ic, 'MR')).toBe(5);
  });

  it('power_gnd tie → 0V', () => {
    const bb = el('breadboard', 'bb');
    const pg = el('power_gnd', 'pg');
    const ic = el('ic_74hc164', 'ic1');
    global.window.CircuitCanvas = makeCanvas([bb, pg, ic], [w(pg, 'gnd', bb, 'ub9'), w(ic, 'Q0', bb, 'ut9')]);
    expect(sim.getPinVoltage(ic, 'Q0')).toBe(0);
  });

  it('IC output reaches an LA probe through the node (HIGH and LOW)', () => {
    const bb = el('breadboard', 'bb');
    const ic = el('ic_74hc86', 'ic1', { Y1: 255 });
    const la = el('la_probe_ch3', 'la3');
    global.window.CircuitCanvas = makeCanvas([bb, ic, la], [w(ic, 'Y1', bb, 'ub7'), w(la, 'tip', bb, 'ut7')]);
    expect(sim.getPinVoltage(la, 'tip')).toBe(5);
    ic.runtimeState.Y1 = 0;
    expect(sim.getPinVoltage(la, 'tip')).toBe(0);
  });

  it('IC output feeds another IC input through the node (chaining)', () => {
    const bb = el('breadboard', 'bb');
    const src = el('ic_74hc08', 'ic1', { Y1: 255 });
    const dst = el('ic_74hc02', 'ic2');
    global.window.CircuitCanvas = makeCanvas([bb, src, dst],
      [w(src, 'Y1', bb, 'ut11'), w(dst, 'A1', bb, 'ub11')]);
    expect(sim.getPinVoltage(dst, 'A1')).toBe(5);
  });

  it('board output reaches an IC input through the node', () => {
    const bb = el('breadboard', 'bb');
    const b1 = el('arduino_uno', 'b1');
    const ic = el('ic_74hc86', 'ic1');
    global.window.CircuitCanvas = makeCanvas([bb, b1, ic],
      [w(b1, 'D2', bb, 'ut13'), w(ic, 'B1', bb, 'ub13')]);
    sim.pinStates['pin_2'] = 255;
    expect(sim.getPinVoltage(ic, 'B1')).toBeGreaterThan(0);
    sim.pinStates['pin_2'] = 0;
    expect(sim.getPinVoltage(ic, 'B1')).toBe(0);
    delete sim.pinStates['pin_2'];
  });

  it('push button passes through the node (5V → button → IC)', () => {
    const bb = el('breadboard', 'bb');
    const pw = el('power_5v', 'pw');
    const btn = el('push_button', 'btn', { pressed: false });
    const ic = el('ic_74hc02', 'ic1');
    global.window.CircuitCanvas = makeCanvas([bb, pw, btn, ic],
      [w(pw, 'vcc', btn, 'p2'), w(btn, 'p1', bb, 'ut15'), w(ic, 'A1', bb, 'ub15')]);
    expect(sim.getPinVoltage(ic, 'A1')).toBe(5); // unpressed: p1–p2 closed
    btn.runtimeState.pressed = true;             // pressed: p1–p3 closed (p3 open → unresolved)
    expect(sim.getPinVoltage(ic, 'A1')).toBe(0);
  });

  it('two breadboards chained by a wire pass the signal', () => {
    const bb1 = el('breadboard', 'bb1');
    const bb2 = el('breadboard', 'bb2');
    const fn = el('func_gen', 'fn', { ch1_voltage: 3.3 });
    const ic = el('ic_74hc139', 'ic1');
    global.window.CircuitCanvas = makeCanvas([bb1, bb2, fn, ic],
      [w(fn, 'ch1_out', bb2, 'ut5'), w(bb1, 'ub5', bb2, 'ut5'), w(ic, 'E1', bb1, 'ub5')]);
    expect(sim.getPinVoltage(ic, 'E1')).toBe(3.3);
  });

  it('LA probe reads through a direct wire to power (no regression)', () => {
    const pw = el('power_5v', 'pw');
    const la = el('la_probe_ch1', 'la1');
    global.window.CircuitCanvas = makeCanvas([pw, la], [w(pw, 'vcc', la, 'tip')]);
    expect(sim.getPinVoltage(la, 'tip')).toBe(5);
  });
});

/* ═══════════════ canvas digital readers ═══════════════ */
describe('canvas _readDigitalInput / _hasDigitalInputSource through breadboard', () => {
  const proto = CircuitCanvas.prototype;

  function fakeCanvas(components, wires) {
    const stub = makeCanvas(components, wires);
    stub._readDigitalInput = proto._readDigitalInput.bind(stub);
    stub._hasDigitalInputSource = proto._hasDigitalInputSource.bind(stub);
    stub._getForcedLevel = proto._getForcedLevel.bind(stub);
    return stub;
  }

  it('reads a func_gen HIGH/LOW through the node', () => {
    const bb = el('breadboard', 'bb');
    const fn = el('func_gen', 'fn', { ch1_voltage: 5 });
    const b1 = el('arduino_uno', 'b1');
    const c = fakeCanvas([bb, fn, b1], [w(fn, 'ch1_out', bb, 'ut5'), w(b1, 'D4', bb, 'ub5')]);
    expect(c._readDigitalInput('b1', 'D4')).toBe(1);
    fn.runtimeState.ch1_voltage = 0;
    expect(c._readDigitalInput('b1', 'D4')).toBe(0);
  });

  it('reads a board-driven node HIGH through the breadboard', () => {
    const bb = el('breadboard', 'bb');
    const b1 = el('arduino_uno', 'b1');
    const b2 = el('arduino_uno', 'b2');
    const c = fakeCanvas([bb, b1, b2], [w(b1, 'D5', bb, 'ut6'), w(b2, 'D6', bb, 'ub6')]);
    global.window.ArduinoSim.pinStates['pin_5'] = 255;
    expect(c._readDigitalInput('b2', 'D6')).toBe(1);
    global.window.ArduinoSim.pinStates['pin_5'] = 0;
    expect(c._readDigitalInput('b2', 'D6')).toBe(0);
    delete global.window.ArduinoSim.pinStates['pin_5'];
  });

  it('cross-half node reads 0', () => {
    const bb = el('breadboard', 'bb');
    const fn = el('func_gen', 'fn', { ch1_voltage: 5 });
    const b1 = el('arduino_uno', 'b1');
    const c = fakeCanvas([bb, fn, b1], [w(fn, 'ch1_out', bb, 'ut5'), w(b1, 'D4', bb, 'lt5')]);
    expect(c._readDigitalInput('b1', 'D4')).toBe(0);
  });

  it('active-LOW 74HC139 output default resolves through the node', () => {
    const bb = el('breadboard', 'bb');
    const ic = el('ic_74hc139', 'ic1', {}); // runtimeState empty → idle HIGH
    const b1 = el('arduino_uno', 'b1');
    const c = fakeCanvas([bb, ic, b1], [w(ic, 'Y0_1', bb, 'ut8'), w(b1, 'D7', bb, 'ub8')]);
    expect(c._readDigitalInput('b1', 'D7')).toBe(1);
    ic.runtimeState.Y0_1 = 0; // asserted (low)
    expect(c._readDigitalInput('b1', 'D7')).toBe(0);
  });

  it('_hasDigitalInputSource sees a source through the node', () => {
    const bb = el('breadboard', 'bb');
    const fn = el('func_gen', 'fn', { ch1_voltage: 5 });
    const b1 = el('arduino_uno', 'b1');
    const c = fakeCanvas([bb, fn, b1], [w(fn, 'ch1_out', bb, 'ut9'), w(b1, 'D8', bb, 'ub9')]);
    expect(c._hasDigitalInputSource('b1', 'D8')).toBe(true);
    // isolated probe on an otherwise empty node → no source anywhere
    const la = el('la_probe_ch1', 'la1');
    const c2 = fakeCanvas([bb, la], [w(la, 'tip', bb, 'ut10')]);
    expect(c2._hasDigitalInputSource('la1', 'tip')).toBe(false);
  });
});

/* ═══════════════ source-level coverage ═══════════════ */
describe('source-level checks for new IC + breadboard paths', () => {
  it('canvas IC_OUTPUT_MAP lists all six new ICs (139 active-LOW)', () => {
    const src = readSrc('js/canvas.js');
    for (const id of ['ic_74hc02', 'ic_74hc86', 'ic_74hc139', 'ic_74hc153', 'ic_74hc164', 'ic_74hc4017']) {
      expect(src.includes(`${id}: {`), `IC_OUTPUT_MAP has ${id}`).toBe(true);
    }
    expect(/ic_74hc139: \{\s*pins: \['Y0_1'/.test(src)).toBe(true);
    expect(/ic_74hc4017: \{\s*pins: \['Q0'/.test(src)).toBe(true);
  });

  it('canvas readers contain the breadboard hop', () => {
    const src = readSrc('js/canvas.js');
    expect(src.includes('1b. Breadboard: every hole on the same internal node reads as one signal')).toBe(true);
    expect(src.includes('if (this._readDigitalInput(other.id, p.id, visited) === 1) return 1;')).toBe(true);
    expect(src.includes('if (this._hasDigitalInputSource(other.id, p.id, visited)) return true;')).toBe(true);
  });

  it('breadboard defs exist and are registered', () => {
    expect(COMPONENT_DEFS.breadboard).toBeTruthy();
    expect(COMPONENT_DEFS.breadboard_small).toBeTruthy();
    expect(typeof global.window._breadboardGetGroup).toBe('function');
    expect(PIN_TYPE).toBeTruthy();
  });
});
