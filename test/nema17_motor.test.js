/**
 * test/nema17_motor.test.js — NEMA 17 stepper motor model
 * Run: npx vitest run test/nema17_motor.test.js
 *
 *   - binds to the TB6600 that is actually wired to it (two motors stay independent)
 *   - falls back to Stepper.h (sim._steppers) and then to bare coil signals
 *   - derives the shaft angle from the motor's own stepAngle/microstep props
 *   - exposes microstep / stepAngle / telemetry properties
 *   - draw() renders the faceplate, telemetry strip and energized leads
 */
import { describe, it, expect, beforeEach } from 'vitest';
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

const { Nema17Component, COMPONENT_DEFS } = loadScripts([
  'js/electrical.js',
  'js/components/base.js',
  'js/components/boards.js',
  'js/components/input.js',
  'js/components/output.js',
  'js/components/passive.js',
  'js/components/power.js',
  'js/components/sensors.js',
  'js/components/actuators.js',
], ['Nema17Component', 'COMPONENT_DEFS']);

const DEF = COMPONENT_DEFS.nema17;

function motor(id, overrides) {
  const inst = {
    id,
    type: 'nema17',
    x: 0,
    y: 0,
    props: { ...DEF.defaultProps },
    runtimeState: {},
    selected: false,
  };
  if (overrides) Object.assign(inst, overrides);
  return inst;
}

function fakeCanvas({ components = [], wires = [], pinMap = {} }) {
  return {
    components,
    wires,
    _getConnectedPinNum(instId, pinId) {
      const key = `${instId}:${pinId}`;
      return key in pinMap ? pinMap[key] : null;
    },
  };
}

const wire = (fromInst, fromPin, toInst, toPin) => ({
  id: `w_${fromInst}_${fromPin}`,
  from: { instId: fromInst, pinId: fromPin },
  to: { instId: toInst, pinId: toPin },
});

/* Canvas-2D stub covering everything defComp.draw() touches. */
function mockCtx() {
  const calls = { fillText: [] };
  const grad = { addColorStop() {} };
  const ctx = {
    calls,
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {},
    rect() {}, roundRect() {}, fill() {}, stroke() {}, clip() {},
    fillRect() {}, strokeRect() {}, setLineDash() {}, measureText: () => ({ width: 10 }),
    createLinearGradient: () => grad, createRadialGradient: () => grad,
    fillText(t, ...rest) { calls.fillText.push([t, ...rest]); },
    strokeText() {},
  };
  return ctx;
}

beforeEach(() => {
  global.window.ArduinoSim = {
    isRunning: true,
    pinStates: {},
    _tb6600s: {},
    _steppers: {},
  };
});

describe('NEMA 17 — definition & properties', () => {
  it('exposes the coil pins on the bottom edge', () => {
    expect(DEF.pins.map(p => p.id)).toEqual(['A+', 'A-', 'B+', 'B-']);
    expect(DEF.pins.map(p => p.x)).toEqual([16, 32, 48, 64]);
    expect(new Nema17Component(motor('m')).getPins()).toEqual(DEF.pins);
  });

  it('defaults label, microstep, step angle and telemetry', () => {
    expect(DEF.defaultProps).toEqual({ label: 'NEMA 17', microstep: 16, stepAngle: 1.8, telemetry: 1 });
  });

  it('offers microstep / stepAngle / telemetry selects plus an on-canvas toggle', () => {
    const byField = (f) => DEF.interactive.filter(c => c.field === f);
    expect(byField('microstep').some(c => c.type === 'select')).toBe(true);
    expect(byField('stepAngle').some(c => c.type === 'select')).toBe(true);
    // the last entry wins in the side panel, so telemetry must end as a select
    const telemetry = byField('telemetry');
    expect(telemetry[telemetry.length - 1].type).toBe('select');
    const toggle = telemetry.find(c => c.type === 'toggle');
    expect(toggle.inline).toEqual({ x: 4, y: 76, w: 72, h: 12 });
  });
});

describe('NEMA 17 — TB6600 binding', () => {
  it('reads only the driver that is wired to it (two motors stay independent)', () => {
    const components = [motor('m1'), motor('m2'),
      { id: 'd1', type: 'tb6600', runtimeState: {} },
      { id: 'd2', type: 'tb6600', runtimeState: {} }];
    const wires = [wire('m1', 'A+', 'd1', 'A+'), wire('m2', 'A+', 'd2', 'A+')];
    const cv = fakeCanvas({ components, wires, pinMap: { 'd1:PUL': 2, 'd2:PUL': 5 } });

    global.window.ArduinoSim._tb6600s = {
      drv1: { pulPin: 2, position: 3200, angle: 360, microstep: 16, enabled: true },
      drv2: { pulPin: 5, position: -1600, angle: -180, microstep: 16, enabled: true },
    };

    const m1 = new Nema17Component(components[0]);
    const m2 = new Nema17Component(components[1]);
    m1.update(cv);
    m2.update(cv);

    expect(components[0].runtimeState.source).toBe('tb6600');
    expect(components[0].runtimeState.position).toBe(3200);
    expect(components[0].runtimeState.angle).toBeCloseTo(360, 6);

    expect(components[1].runtimeState.source).toBe('tb6600');
    expect(components[1].runtimeState.position).toBe(-1600);
    expect(components[1].runtimeState.angle).toBeCloseTo(-180, 6);
  });

  it('falls back to the driver component when the sketch uses raw digitalWrite()', () => {
    const components = [motor('m1'), { id: 'd1', type: 'tb6600', runtimeState: { position: 800, angle: 45, enabled: true } }];
    const wires = [wire('m1', 'B-', 'd1', 'B-')];
    // PUL is not on a board, so no library record can be matched
    const cv = fakeCanvas({ components, wires, pinMap: {} });

    const m = new Nema17Component(components[0]);
    m.update(cv);

    expect(components[0].runtimeState.source).toBe('tb6600');
    expect(components[0].runtimeState.position).toBe(800);
    // angle is recomputed from the motor's own stepAngle/microstep (800 * 1.8 / 16),
    // never copied from the driver's possibly-stale `angle` field.
    expect(components[0].runtimeState.angle).toBeCloseTo(90, 6);
  });

  it('derives the shaft angle from the motor stepAngle / microstep props', () => {
    const inst = motor('m1', { props: { ...DEF.defaultProps, stepAngle: 0.9, microstep: 8 } });
    const components = [inst, { id: 'd1', type: 'tb6600', runtimeState: {} }];
    const cv = fakeCanvas({
      components,
      wires: [wire('m1', 'A+', 'd1', 'A+')],
      pinMap: { 'd1:PUL': 2 },
    });
    global.window.ArduinoSim._tb6600s = {
      drv: { pulPin: 2, position: 800, angle: 45, microstep: 8, enabled: true },
    };

    new Nema17Component(inst).update(cv);
    // 800 micro-steps x 0.9°/8 = 90° — not the driver's 1.8°/8 assumption
    expect(inst.runtimeState.angle).toBeCloseTo(90, 6);
  });

  it('tracks rotation direction, motion and RPM telemetry', () => {
    const inst = motor('m1');
    const components = [inst, { id: 'd1', type: 'tb6600', runtimeState: {} }];
    const cv = fakeCanvas({ components, wires: [wire('m1', 'A+', 'd1', 'A+')], pinMap: { 'd1:PUL': 2 } });
    global.window.ArduinoSim._tb6600s = { drv: { pulPin: 2, position: 0, angle: 0, microstep: 16, enabled: true } };

    const comp = new Nema17Component(inst);
    comp.update(cv);
    expect(inst.runtimeState.moving).toBe(false);

    global.window.ArduinoSim._tb6600s.drv.position = 320;
    global.window.ArduinoSim._tb6600s.drv.angle = 36;
    comp.update(cv);
    expect(inst.runtimeState.dir).toBe(1);
    expect(inst.runtimeState.moving).toBe(true);
    expect(typeof inst.runtimeState.rpm).toBe('number');

    global.window.ArduinoSim._tb6600s.drv.position = 0;
    global.window.ArduinoSim._tb6600s.drv.angle = 0;
    comp.update(cv);
    expect(inst.runtimeState.dir).toBe(-1);
  });

  it('flags the energized coil pair from the bipolar step sequence', () => {
    const inst = motor('m1');
    const components = [inst, { id: 'd1', type: 'tb6600', runtimeState: {} }];
    const cv = fakeCanvas({ components, wires: [wire('m1', 'A+', 'd1', 'A+')], pinMap: { 'd1:PUL': 2 } });
    global.window.ArduinoSim._tb6600s = { drv: { pulPin: 2, position: 0, angle: 0, microstep: 16, enabled: true } };

    const comp = new Nema17Component(inst);
    comp.update(cv);
    expect([inst.runtimeState.coilA, inst.runtimeState.coilB]).toEqual([1, 1]);
    expect(inst.runtimeState.phase).toBe(0);

    global.window.ArduinoSim._tb6600s.drv.position = 16; // one full step later
    comp.update(cv);
    expect(inst.runtimeState.phase).toBe(1);
    expect([inst.runtimeState.coilA, inst.runtimeState.coilB]).toEqual([1, -1]);

    global.window.ArduinoSim._tb6600s.drv.enabled = false;
    comp.update(cv);
    expect([inst.runtimeState.coilA, inst.runtimeState.coilB]).toEqual([0, 0]);
  });
});

describe('NEMA 17 — other drive sources', () => {
  it('binds to a Stepper.h sketch wired into the coil pins', () => {
    const inst = motor('m3');
    const pinMap = { 'm3:A+': 8, 'm3:A-': 9, 'm3:B+': 10, 'm3:B-': 11 };
    const cv = fakeCanvas({ components: [inst], wires: [], pinMap });
    global.window.ArduinoSim._steppers = {
      s1: { pin1: 8, pin2: 9, pin3: 10, pin4: 11, pos: 200, stepsPerRev: 200, target: 200 },
    };

    new Nema17Component(inst).update(cv);
    expect(inst.runtimeState.source).toBe('stepper');
    expect(inst.runtimeState.position).toBe(200);
    expect(inst.runtimeState.angle).toBeCloseTo(360, 6);
  });

  it('counts full steps when the coils are driven straight from GPIO', () => {
    const inst = motor('m4');
    const pinMap = { 'm4:A+': 8, 'm4:A-': 9, 'm4:B+': 10, 'm4:B-': 11 };
    const cv = fakeCanvas({ components: [inst], wires: [], pinMap });
    const sim = global.window.ArduinoSim;
    const comp = new Nema17Component(inst);

    comp.update(cv);
    expect(inst.runtimeState.position).toBe(0);

    sim.pinStates.pin_8 = 1; // phase 1
    comp.update(cv);
    expect(inst.runtimeState.source).toBe('coil');
    expect(inst.runtimeState.position).toBe(16);
    expect(inst.runtimeState.angle).toBeCloseTo(1.8, 6);
    expect(inst.runtimeState.enabled).toBe(true);

    sim.pinStates.pin_10 = 1; // phase 3
    comp.update(cv);
    expect(inst.runtimeState.position).toBe(32);

    comp.update(cv); // no edge — must not double count
    expect(inst.runtimeState.position).toBe(32);

    delete sim.pinStates.pin_8;
    delete sim.pinStates.pin_10;
    comp.update(cv);
    expect(inst.runtimeState.enabled).toBe(false);
    expect([inst.runtimeState.coilA, inst.runtimeState.coilB]).toEqual([0, 0]);
  });
});

describe('NEMA 17 — telemetry toggle', () => {
  it('lets the side panel win over an earlier on-canvas click', () => {
    const inst = motor('m1');
    const comp = new Nema17Component(inst);
    const show = () => Number(inst.runtimeState.telemetry ?? inst.props.telemetry ?? 1) > 0;

    comp.update(null);
    expect(show()).toBe(true);

    inst.runtimeState.telemetry = 0; // strip clicked
    comp.update(null);
    expect(show()).toBe(false);

    inst.props.telemetry = 0; // panel set to Hide
    comp.update(null);
    expect(show()).toBe(false);

    inst.props.telemetry = 1; // panel set back to Show — must take effect
    comp.update(null);
    expect(show()).toBe(true);
  });
});

describe('NEMA 17 — draw()', () => {
  it('renders the faceplate, telemetry readout and lead labels without throwing', () => {
    const inst = motor('m1');
    inst.runtimeState = { angle: 90, position: 1600, rpm: 120, microstep: 16, coilA: 1, coilB: -1, moving: true, dir: 1 };
    const ctx = mockCtx();

    expect(() => DEF.draw(ctx, inst, global.window.ArduinoSim)).not.toThrow();

    const texts = ctx.calls.fillText.map(t => String(t[0]));
    expect(texts).toContain('90°');
    expect(texts).toContain('1600');
    expect(texts).toContain('1/16');
    expect(texts).toContain('120 rpm');
    expect(texts).toEqual(expect.arrayContaining(['A+', 'A-', 'B+', 'B-']));
  });

  it('hides the readout when telemetry is off but keeps a click target', () => {
    const inst = motor('m1', { props: { ...DEF.defaultProps, telemetry: 0 } });
    inst.runtimeState = { angle: 0, position: 0, telemetry: 0 };
    const ctx = mockCtx();

    DEF.draw(ctx, inst, global.window.ArduinoSim);

    const texts = ctx.calls.fillText.map(t => String(t[0]));
    expect(texts).not.toContain('0°');
    expect(texts.some(t => t.includes('telemetry'))).toBe(true);
  });

  it('does not throw when nothing has driven the motor yet', () => {
    const inst = motor('m1');
    expect(() => DEF.draw(mockCtx(), inst, null)).not.toThrow();
    expect(() => DEF.draw(mockCtx(), inst, global.window.ArduinoSim)).not.toThrow();
  });
});
