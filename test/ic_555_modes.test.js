/**
 * test/ic_555_modes.test.js — 555 timer: astable vs monostable
 * Run: npx vitest run test/ic_555_modes.test.js
 *
 *   - resolves R1/R2/C from real wiring (trigger pull-ups are not timing parts)
 *   - monostable: TRIG low asserts OUT for t = 1.1·R·C, release counts it down
 *   - TRIG held low keeps the pulse asserted (datasheet level-sensitive trigger)
 *   - RST grounded forces the output low
 *   - astable keeps its real 0.693·(R1+R2)·C / 0.693·R2·C timing (regression)
 *   - DIS polarity: released while charging, pulled to GND while discharging
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
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, getContext: () => null, appendChild() {}, addEventListener() {} }),
  addEventListener() {},
  removeEventListener() {},
  body: { appendChild() {} },
  documentElement: { style: {} },
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

const { CircuitCanvas, COMPONENT_DEFS } = loadScripts([
  'js/electrical.js',
  'js/components/base.js',
  'js/components/boards.js',
  'js/components/input.js',
  'js/components/output.js',
  'js/components/passive.js',
  'js/components/power.js',
  'js/components/sensors.js',
  'js/components/actuators.js',
  'js/components/audio.js',
  'js/components/ics.js',
  'js/canvas.js',
], ['CircuitCanvas', 'COMPONENT_DEFS']);

const DEF = COMPONENT_DEFS.ic_555;

/* Canvas-2D stub covering everything ic_555.draw() touches. */
function mockCtx() {
  const calls = { fillText: [], fillRect: [] };
  const grad = { addColorStop() {} };
  return {
    calls,
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {},
    rect() {}, roundRect() {}, fill() {}, stroke() {}, clip() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, arcTo() {}, ellipse() {},
    strokeRect() {}, setLineDash() {}, measureText: () => ({ width: 10 }),
    createLinearGradient: () => grad, createRadialGradient: () => grad,
    fillText(t, ...rest) { calls.fillText.push([t, ...rest]); },
    fillRect(x, y, w, h) { calls.fillRect.push([x, y, w, h]); },
    strokeText() {},
  };
}

/** CircuitCanvas with components/wires loaded from a real Examples/*.json file. */
function makeCanvas(exampleName) {
  const ex = JSON.parse(fs.readFileSync(path.join(ROOT, 'Examples', exampleName + '.json'), 'utf8'));
  const cv = Object.create(CircuitCanvas.prototype);
  cv.components = ex.circuit.components.map(c => ({
    ...c,
    props: { ...(COMPONENT_DEFS[c.type]?.defaultProps || {}), ...(c.props || {}) },
    runtimeState: {},
    selected: false,
  }));
  cv.wires = ex.circuit.wires.map(w => ({ ...w }));
  return cv;
}

/** 555 + rails + button only — no R/C network, so props are the timing source. */
function minimalMonostable(pulseTime) {
  const cv = Object.create(CircuitCanvas.prototype);
  const mk = (id, type, props) => ({
    id, type, x: 0, y: 0,
    props: { ...(COMPONENT_DEFS[type]?.defaultProps || {}), ...(props || {}) },
    runtimeState: {}, selected: false,
  });
  cv.components = [
    mk('u1', 'ic_555', { mode: 'monostable', pulseTime }),
    mk('v1', 'power_5v'),
    mk('g1', 'power_gnd'),
    mk('b1', 'push_button'),
  ];
  cv.wires = [
    { id: 'w1', from: { instId: 'u1', pinId: 'VCC' }, to: { instId: 'v1', pinId: 'vcc' } },
    { id: 'w2', from: { instId: 'u1', pinId: 'GND' }, to: { instId: 'g1', pinId: 'gnd' } },
    { id: 'w3', from: { instId: 'u1', pinId: 'RST' }, to: { instId: 'v1', pinId: 'vcc' } },
    { id: 'w4', from: { instId: 'u1', pinId: 'TRIG' }, to: { instId: 'b1', pinId: 'p1' } },
    { id: 'w5', from: { instId: 'g1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'p3' } },
  ];
  return cv;
}

const icOf = (cv) => cv.components.find(c => c.type === 'ic_555');
const btnOf = (cv) => cv.components.find(c => c.type === 'push_button');
/** Step the 555 at an explicit millisecond timestamp. */
const step = (cv, ms) => { cv._updateIc555(icOf(cv), ms); return icOf(cv).runtimeState; };

beforeEach(() => {
  global.window.ArduinoSim = { pinStates: {}, pinModes: {} };
});

describe('ic_555 — definition', () => {
  it('keeps the real NE555 pin order and astable default mode', () => {
    expect(DEF.pins.map(p => p.id)).toEqual(['GND', 'TRIG', 'OUT', 'RST', 'VCC', 'DIS', 'THR', 'CV']);
    expect(DEF.defaultProps.mode).toBe('astable');
    expect(DEF.defaultProps.pulseTime).toBe(1);
  });

  it('offers astable/monostable as a side-panel mode select', () => {
    const sel = (DEF.interactive || []).find(c => c.field === 'mode');
    expect(sel).toBeTruthy();
    expect(sel.type).toBe('select');
    expect(sel.options.map(o => o.value)).toEqual(['astable', 'monostable']);
  });
});

describe('ic_555 — R/C auto-detection', () => {
  it('finds the timing R and C but ignores the TRIG pull-up', () => {
    const cv = makeCanvas('555_timer_monostable');
    const { r1, r2, capC } = cv._resolve555RC(icOf(cv));
    expect(r1).toBeCloseTo(100e3, 6);   // 100 kΩ VCC → DIS/THR
    expect(r2).toBeNull();               // the 10 kΩ trigger pull-up is not timing
    expect(capC).toBeCloseTo(10e-6, 12); // 10 µF on THR
  });

  it('finds both astable resistors (R1 = VCC→DIS, R2 = DIS→THR)', () => {
    const cv = makeCanvas('555_timer_astable_led_blinker');
    const { r1, r2, capC } = cv._resolve555RC(icOf(cv));
    expect(r1).toBeCloseTo(10e3, 6);
    expect(r2).toBeCloseTo(10e3, 6);
    expect(capC).toBeCloseTo(100e-6, 12);
  });
});

describe('ic_555 — monostable', () => {
  it('lights for exactly 1.1·R·C ≈ 1.1 s after a TRIG pulse', () => {
    const cv = makeCanvas('555_timer_monostable');
    const btn = btnOf(cv);

    let rs = step(cv, 0);
    expect(rs.tPulse).toBeCloseTo(1.1, 9);
    expect(rs.outHigh).toBe(false);
    expect(rs.OUT).toBe(0);
    expect(rs.DIS).toBe(0);        // idle: timing cap held discharged
    expect(rs._mState).toBe('idle');

    btn.runtimeState.pressed = true;
    rs = step(cv, 100);
    expect(rs.outHigh).toBe(true);
    expect(rs.OUT).toBe(255);
    expect(rs.DIS).toBe(255);      // released so the cap can charge
    expect(rs._mState).toBe('timing');

    btn.runtimeState.pressed = false;
    rs = step(cv, 200);
    expect(rs.outHigh).toBe(true);
    expect(rs.pulseProgress).toBeCloseTo(100 / 1100, 6);

    rs = step(cv, 100 + 550);      // half way
    expect(rs.outHigh).toBe(true);
    expect(rs.pulseProgress).toBeCloseTo(0.5, 6);
    expect(rs._capVoltage).toBeCloseTo((2 / 3) * 0.5, 6);

    rs = step(cv, 100 + 1099);     // one millisecond before the end
    expect(rs.outHigh).toBe(true);

    rs = step(cv, 100 + 1100);     // pulse complete
    expect(rs.outHigh).toBe(false);
    expect(rs.OUT).toBe(0);
    expect(rs.DIS).toBe(0);        // back to conducting: cap discharges
    expect(rs.pulseProgress).toBe(0);
    expect(rs._mState).toBe('idle');
  });

  it('holds the output high while TRIG is held low, then times from release', () => {
    const cv = makeCanvas('555_timer_monostable');
    const btn = btnOf(cv);

    btn.runtimeState.pressed = true;
    step(cv, 100);
    // 10 s later, still pressed — well past the 1.1 s pulse width
    const held = step(cv, 100 + 10000);
    expect(held.outHigh).toBe(true);
    expect(held.pulseProgress).toBe(0);

    btn.runtimeState.pressed = false;
    expect(step(cv, 10100 + 100).outHigh).toBe(true);
    expect(step(cv, 10100 + 1100).outHigh).toBe(false);
  });

  it('re-triggers after the pulse has ended', () => {
    const cv = makeCanvas('555_timer_monostable');
    const btn = btnOf(cv);

    btn.runtimeState.pressed = true;
    step(cv, 100);
    btn.runtimeState.pressed = false;
    expect(step(cv, 100 + 1100).outHigh).toBe(false);

    btn.runtimeState.pressed = true;
    expect(step(cv, 5000).outHigh).toBe(true);
    expect(step(cv, 5000)._mState).toBe('timing');
  });

  it('falls back to the pulseTime prop when no R/C network is wired', () => {
    const cv = minimalMonostable(2);
    const ic = icOf(cv);
    const btn = btnOf(cv);

    cv._updateIc555(ic, 0);
    expect(cv._resolve555RC(ic).r1).toBeNull();
    expect(cv._resolve555RC(ic).capC).toBeNull();
    expect(ic.runtimeState.tPulse).toBeCloseTo(2, 9);

    btn.runtimeState.pressed = true;
    cv._updateIc555(ic, 100);
    expect(ic.runtimeState.outHigh).toBe(true);

    btn.runtimeState.pressed = false;
    cv._updateIc555(ic, 200);
    expect(ic.runtimeState.outHigh).toBe(true);

    cv._updateIc555(ic, 100 + 2000);
    expect(ic.runtimeState.outHigh).toBe(false);
  });

  it('forces the output low when RST is grounded', () => {
    const cv = makeCanvas('555_timer_monostable');
    const ic = icOf(cv);
    const btn = btnOf(cv);
    const gnd = cv.components.find(c => c.type === 'power_gnd');

    btn.runtimeState.pressed = true;
    cv._updateIc555(ic, 100);
    expect(ic.runtimeState.outHigh).toBe(true);

    cv.wires.push({
      id: 'wire_rst_gnd',
      from: { instId: ic.id, pinId: 'RST' },
      to: { instId: gnd.id, pinId: 'gnd' },
    });
    btn.runtimeState.pressed = false;

    cv._updateIc555(ic, 200);
    expect(ic.runtimeState.outHigh).toBe(false);
    expect(ic.runtimeState.OUT).toBe(0);
    expect(ic.runtimeState.pulseProgress).toBe(0);
  });

  it('clears the one-shot state when the mode switches to astable', () => {
    const cv = makeCanvas('555_timer_monostable');
    const ic = icOf(cv);
    const btn = btnOf(cv);

    btn.runtimeState.pressed = true;
    cv._updateIc555(ic, 100);
    expect(ic.runtimeState._mState).toBe('timing');

    ic.props.mode = 'astable';
    btn.runtimeState.pressed = false;
    cv._updateIc555(ic, 200);

    expect(ic.runtimeState._mode).toBe('astable');
    expect(ic.runtimeState._mState).toBe('idle');
    expect(ic.runtimeState.pulseProgress).toBe(0);
    expect(ic.runtimeState.tPulse).toBeUndefined();
  });
});

describe('ic_555 — astable regression', () => {
  it('uses the real 0.693 formulas and toggles at the computed thresholds', () => {
    const cv = makeCanvas('555_timer_astable_led_blinker');
    const ic = icOf(cv);

    cv._updateIc555(ic, 0);
    expect(ic.runtimeState.tHigh).toBeCloseTo(0.693 * (10e3 + 10e3) * 100e-6, 9); // 1.386 s
    expect(ic.runtimeState.tLow).toBeCloseTo(0.693 * 10e3 * 100e-6, 9);          // 0.693 s
    expect(ic.runtimeState.outHigh).toBe(true);   // cap starts below 1/3 VCC

    // charging toward 2/3 VCC (0.693·(R1+R2)·C · (1/3) / 0.8 ≈ 578 ms)
    cv._updateIc555(ic, 578);
    expect(ic.runtimeState.outHigh).toBe(false);
    expect(ic.runtimeState.DIS).toBe(0);          // discharging: DIS sinks to GND

    // discharging toward 1/3 VCC (0.693·R2·C · (1/3) / 0.8 ≈ 289 ms)
    cv._updateIc555(ic, 578 + 289);
    expect(ic.runtimeState.outHigh).toBe(true);
    expect(ic.runtimeState.DIS).toBe(255);        // charging: DIS released
  });

  it('keeps oscillating across many cycles', () => {
    const cv = makeCanvas('555_timer_astable_led_blinker');
    const ic = icOf(cv);
    let toggles = 0;
    let prev = null;
    for (let t = 0; t <= 20000; t += 25) {
      cv._updateIc555(ic, t);
      if (prev !== null && ic.runtimeState.outHigh !== prev) toggles++;
      prev = ic.runtimeState.outHigh;
    }
    // The model sweeps the cap with a fixed 0.8/tHalf slew (pre-existing), so
    // the realised half-periods are 0.4167·tHigh and 0.4167·tLow ≈ 0.866 s per
    // full cycle → ~46 toggles in 20 s. Guard against a stalled oscillator as
    // well as an accidentally accelerated one.
    expect(toggles).toBeGreaterThanOrEqual(30);
    expect(toggles).toBeLessThanOrEqual(60);
  });
});

describe('ic_555 — draw()', () => {
  it('renders the faceplate, mode badge and monostable progress bar', () => {
    const cv = makeCanvas('555_timer_monostable');
    const ic = icOf(cv);
    ic.runtimeState = { outHigh: true, pulseProgress: 0.4 };

    const ctx = mockCtx();
    expect(() => DEF.draw(ctx, ic, global.window.ArduinoSim)).not.toThrow();

    const texts = ctx.calls.fillText.map(t => String(t[0]));
    expect(texts).toContain('NE555');
    expect(texts).toContain('MONO');
    expect(ctx.calls.fillRect).toContainEqual([-2, 36, 55 * 0.4, 3]);
  });

  it('labels the astable mode and omits the progress bar', () => {
    const cv = makeCanvas('555_timer_astable_led_blinker');
    const ic = icOf(cv);
    ic.runtimeState = { outHigh: false };

    const ctx = mockCtx();
    expect(() => DEF.draw(ctx, ic, global.window.ArduinoSim)).not.toThrow();

    const texts = ctx.calls.fillText.map(t => String(t[0]));
    expect(texts).toContain('AST');
    expect(texts).not.toContain('MONO');
    expect(ctx.calls.fillRect).toHaveLength(0);
  });

  it('does not throw before anything has driven the timer', () => {
    const cv = makeCanvas('555_timer_monostable');
    expect(() => DEF.draw(mockCtx(), icOf(cv), null)).not.toThrow();
  });
});
