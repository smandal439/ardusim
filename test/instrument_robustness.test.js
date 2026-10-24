/**
 * test/instrument_robustness.test.js — hardening for the Function Generator and
 * the DSO (canvas component + fullscreen overlay).
 *
 * Four regressions this file pins down:
 *
 *  1. The fullscreen control panel registered each control under an element id
 *     such as `dso-fs-timebase`, and the drag/click handlers write
 *     `runtimeState[el.field]`. Because `field` *was* that id, the Time/Div
 *     slider, the Trigger Level slider and the Trigger Mode/Source/Slope and
 *     Math Operation selects all wrote into properties nothing ever reads —
 *     dead controls. Every `field` must now be a real property name.
 *
 *  2. Time/Div and V/Div are divisors while the trace is drawn. A hand-typed 0
 *     or a NaN smuggled in through a legacy project turned the geometry into
 *     Infinity/NaN and silently blanked the screen, so those props are clamped
 *     on read (_dsoProp / _dsoFsProp) and on write (clampPropValue).
 *
 *  3. The properties panel used to accept anything typed into a number field,
 *     which is how the values in (2) got in at all. It now mirrors the control's
 *     declared min/max/step onto the field and clamps on Apply.
 *
 *  4. The function generator fed raw Number(...) results into the waveform
 *     math, so "Infinity" / 1e999 / duty=1000% could drive a pin with a
 *     non-finite voltage, and powered:"0" read as ON (Boolean("0") is true).
 *
 * Run: npx vitest run test/instrument_robustness.test.js
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ── Minimal browser-like globals (same pattern as test/slide_switch.test.js) ── */
global.window = {
  ArduinoLibs: {},
  ArduinoComponents: { COMPONENT_DEFS: {} },
  ArduinoSim: null,
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

/** Evaluate script files in one shared scope and return the requested declarations. */
function loadScripts(files, names) {
  const code = files.map(readSrc).join('\n;\n');
  const fn = new Function('window', 'document',
    code + '\n;return {' + names.map(n => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ') + '};');
  return fn(global.window, global.document);
}

const { COMPONENT_DEFS, clampPropValue, _fgNum, _fgBool, _dsoProp, _dsoBool } = loadScripts([
  'js/components/base.js',
  'js/components/function_generator.js',
  'js/components/dso.js',
], ['COMPONENT_DEFS', 'clampPropValue', '_fgNum', '_fgBool', '_dsoProp', '_dsoBool']);

const { DSOFullscreen, _dsoFsProp, _dsoFsBool, _dsoFsSliderProgress, _dsoFsSliderValue } = loadScripts([
  'js/dso-fullscreen.js',
], ['DSOFullscreen', '_dsoFsProp', '_dsoFsBool', '_dsoFsSliderProgress', '_dsoFsSliderValue']);

const { CircuitCanvas, _canvasSliderProgress, _canvasSliderValue } = loadScripts([
  'js/electrical.js',
  'js/components/base.js',
  'js/components/function_generator.js',
  'js/canvas.js',
], ['CircuitCanvas', '_canvasSliderProgress', '_canvasSliderValue']);

const DSO_ID = 'dso_4ch';
const dsoDef = COMPONENT_DEFS[DSO_ID];
const fgDef = COMPONENT_DEFS.func_gen;

/* ── Headless canvas harness ── */
function makeCtx() {
  return new Proxy({}, {
    get(_, prop) {
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop() {} });
      }
      return () => {};
    },
    set: () => true,
  });
}

function makeDsoInst() {
  return { type: DSO_ID, x: 0, y: 0, props: { ...dsoDef.defaultProps }, runtimeState: {} };
}

/** The reader the renderer hands to _drawControlPanel: runtimeState ?? props ?? default. */
function readerFor(inst) {
  return (field, def) => (inst.runtimeState[field] !== undefined ? inst.runtimeState[field] : (inst.props[field] ?? def));
}

/** Draw the fullscreen control panel and return the hit-test table it built. */
function drawPanel(fs, inst) {
  fs.inst = inst;
  fs._elements = {};
  fs._drawControlPanel(makeCtx(), 0, 0, 260, 700, readerFor(inst), true, true, false);
  return fs._elements;
}

/** Exactly what the drag handler does with a `range` element. */
function emulateDrag(inst, el, val) {
  inst.runtimeState[el.field] = val;
  inst.props[el.field] = val;
}

function fgInst(overrides = {}) {
  return { type: 'func_gen', x: 0, y: 0, props: { ...fgDef.defaultProps, ...overrides }, runtimeState: {} };
}

/* ══════════════════════════════════════════════════════════════════════════
   1. Fullscreen control wiring
   ═══════════════════════════════════════════════════════════════════════ */
describe('fullscreen DSO control wiring', () => {
  it('def has the DSO definition', () => {
    expect(dsoDef, 'COMPONENT_DEFS.dso_4ch').toBeTruthy();
    expect(fgDef, 'COMPONENT_DEFS.func_gen').toBeTruthy();
  });

  it('every control writes to a property the DSO actually reads', () => {
    const els = drawPanel(new DSOFullscreen(), makeDsoInst());
    const knownProps = new Set(Object.keys(dsoDef.defaultProps));
    // Two pseudo-props the panel owns itself rather than the component definition.
    const panelOwned = new Set(['_autoSet', 'paused']);

    const fields = Object.values(els).map(e => e.field);
    expect(fields.length).toBeGreaterThan(10);
    for (const f of fields) {
      expect(f, `control field must be set`).toBeTruthy();
      expect(f.startsWith('dso-fs-'),
        `control "${f}" is an element id, not a property name — the renderer will never see the write`).toBe(false);
      expect(knownProps.has(f) || panelOwned.has(f),
        `"${f}" is not a property of dso_4ch`).toBe(true);
    }
  });

  it('the dead dso-fs-* ids are no longer registered', () => {
    const els = drawPanel(new DSOFullscreen(), makeDsoInst());
    const dead = [
      'dso-fs-timebase', 'dso-fs-trig-level', 'dso-fs-trig-mode',
      'dso-fs-trig-source', 'dso-fs-trig-slope', 'dso-fs-math-op',
      'dso-fs-display-mode',
    ];
    for (const id of dead) {
      expect(els[id], `${id} should no longer exist`).toBeUndefined();
    }
  });

  it('Time/Div slider drag reaches the timebase the renderer reads', () => {
    const inst = makeDsoInst();
    const els = drawPanel(new DSOFullscreen(), inst);

    const timebase = els.timebase;
    expect(timebase, 'Time/Div control').toBeTruthy();
    expect(timebase.type).toBe('range');
    expect(timebase.value).toBe(0.001);

    emulateDrag(inst, timebase, 0.01);

    // _dsoFsProp is what the render path's P() delegates to.
    expect(_dsoFsProp(inst.runtimeState, inst.props, 'timebase', 0.001)).toBe(0.01);
    expect(inst.props.timebase).toBe(0.01);
  });

  it('trigger level / mode / source / slope and math reach their properties', () => {
    const inst = makeDsoInst();
    const els = drawPanel(new DSOFullscreen(), inst);
    const expectations = {
      trig_level: 4.2,
      trig_mode: 'norm',
      trig_source: 'ch2',
      trig_slope: 'falling',
      math_op: 'add',
    };

    for (const [field, val] of Object.entries(expectations)) {
      const el = els[field];
      expect(el, `control for ${field}`).toBeTruthy();
      if (el.type === 'range') emulateDrag(inst, el, val);
      else { inst.runtimeState[el.field] = val; inst.props[el.field] = val; }
      expect(_dsoFsProp(inst.runtimeState, inst.props, field, dsoDef.defaultProps[field]),
        `${field} should be readable after interacting with its control`).toBe(val);
    }
  });

  it('renders the math channel without throwing', () => {
    // The math branch referenced `tS`, but that const is declared inside the
    // channels.forEach callback above it — out of scope here. Enabling a math
    // operation therefore threw ReferenceError from the render loop. It could
    // never happen before because the fullscreen Math select wrote to a dead
    // property, so the operation stayed 'off' and && short-circuited.
    const fs = new DSOFullscreen();
    fs.ctx = makeCtx();
    fs._canvasW = 1024;
    fs._canvasH = 768;
    const inst = makeDsoInst();
    inst.props.math_op = 'add';
    inst._buffers = {
      ch1: Array.from({ length: 64 }, (_, i) => Math.sin(i / 5)),
      ch2: Array.from({ length: 64 }, (_, i) => Math.cos(i / 5)),
      ch3: [], ch4: [],
      t: Array.from({ length: 64 }, (_, i) => i * 0.001),
    };
    fs.inst = inst;

    expect(() => fs._render()).not.toThrow();
    // the same frame rebuilds the control hit table
    expect(fs._elements.timebase.field).toBe('timebase');
  });

  it('renders spectrum and XY views without throwing', () => {
    // Two latent crashes hid behind the dead View select:
    //  • dbMin/dbMax were const-declared inside the specChannels.forEach
    //    callback but read by the grid-label loop *after* it closed.
    //  • the label loop read buf.t with no guard, but _buffers is created
    //    lazily by step() and is still undefined until the DSO has run.
    const fs = new DSOFullscreen();
    fs.ctx = makeCtx();
    fs._canvasW = 1024;
    fs._canvasH = 768;

    const buffers = {
      ch1: Array.from({ length: 128 }, (_, i) => Math.sin(i / 5)),
      ch2: Array.from({ length: 128 }, (_, i) => Math.cos(i / 5)),
      ch3: [], ch4: [],
      t: Array.from({ length: 128 }, (_, i) => i * 0.001),
    };
    const withBuf = { ...makeDsoInst(), _buffers: buffers };
    const noBuf = makeDsoInst();               // fresh placement, sim not started

    const hadDSP = 'DSP' in globalThis;
    const prevDSP = globalThis.DSP;
    globalThis.DSP = {
      computeFFT: () => ({
        magnitude: new Array(16).fill(-40),
        freqAxis: Array.from({ length: 16 }, (_, k) => k * 100),
      }),
    };
    try {
      fs.inst = withBuf;
      fs._dsoMode = 'spectrum';
      expect(() => fs._render(), 'spectrum with a buffer').not.toThrow();

      fs.inst = noBuf;
      expect(() => fs._render(), 'spectrum before the DSO has ever run').not.toThrow();

      fs.inst = withBuf;
      fs._dsoMode = 'xy';
      expect(() => fs._render(), 'xy view').not.toThrow();

      fs._dsoMode = 'scope';
      expect(() => fs._render(), 'back to scope view').not.toThrow();
    } finally {
      if (hadDSP) globalThis.DSP = prevDSP; else delete globalThis.DSP;
    }
  });

  it('fullscreen View shares dsoMode with the canvas component', () => {
    const fs = new DSOFullscreen();

    fs.inst = { props: { dsoMode: 'xy' }, runtimeState: {} };
    fs._syncControlsFromInst();
    expect(fs._dsoMode).toBe('xy');

    // runtimeState wins, same as every other property
    fs.inst = { props: { dsoMode: 'scope' }, runtimeState: { dsoMode: 'spectrum' } };
    fs._syncControlsFromInst();
    expect(fs._dsoMode).toBe('spectrum');

    // an unknown value falls back to the default view instead of blanking
    fs.inst = { props: { dsoMode: 'nonsense' }, runtimeState: {} };
    fs._syncControlsFromInst();
    expect(fs._dsoMode).toBe('scope');

    const els = drawPanel(fs, makeDsoInst());
    expect(els.dsoMode, 'View control').toBeTruthy();
    expect(els.dsoMode.type).toBe('select');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. Divisor props bounded on read
   ═══════════════════════════════════════════════════════════════════════ */
describe('DSO divisor props are bounded at read time', () => {
  const readFs = (rs, props, field, def) => _dsoFsProp(rs || {}, props || {}, field, def);

  it('fullscreen: Time/Div, V/Div, Position and Trigger Level are clamped', () => {
    expect(readFs(null, { timebase: 0 }, 'timebase', 0.001)).toBe(0.00001);
    expect(readFs(null, { timebase: -1 }, 'timebase', 0.001)).toBe(0.00001);
    expect(readFs(null, { timebase: 99 }, 'timebase', 0.001)).toBe(0.1);
    expect(readFs(null, { timebase: 'nope' }, 'timebase', 0.001)).toBe(0.001);
    expect(readFs(null, { timebase: undefined }, 'timebase', 0.001)).toBe(0.001);
    expect(readFs(null, { timebase: '0.002' }, 'timebase', 0.001)).toBe(0.002);

    expect(readFs(null, { ch1_vdiv: 0 }, 'ch1_vdiv', 1)).toBe(0.05);
    expect(readFs(null, { ch2_vdiv: 0 }, 'ch2_vdiv', 2)).toBe(0.05);
    expect(readFs(null, { ch1_pos: 400 }, 'ch1_pos', 2)).toBe(4);
    expect(readFs(null, { trig_level: 1e9 }, 'trig_level', 0)).toBe(10);
  });

  it('fullscreen: runtimeState still beats props, unbounded props pass through', () => {
    expect(readFs({ timebase: 0.01 }, { timebase: 0.001 }, 'timebase', 0.001)).toBe(0.01);
    expect(readFs(null, { trig_mode: 'norm' }, 'trig_mode', 'auto')).toBe('norm');
    expect(readFs(null, { ch1_en: false }, 'ch1_en', true)).toBe(false);
  });

  it('canvas component: _dsoProp applies the same bounds', () => {
    expect(_dsoProp({}, { timebase: 0 }, 'timebase', 0.001)).toBe(0.00001);
    expect(_dsoProp({}, { ch1_vdiv: 0 }, 'ch1_vdiv', 1)).toBe(0.05);
    expect(_dsoProp({}, { ch2_vdiv: 0 }, 'ch2_vdiv', 2)).toBe(0.05);
    expect(_dsoProp({}, { trig_level: -1e9 }, 'trig_level', 0)).toBe(-10);
    // 4-arg shape used by step()
    expect(_dsoProp({ timebase: 0.05 }, { timebase: 0.001 }, 'timebase', 0.001)).toBe(0.05);
    expect(_dsoProp({ ch1_vdiv: 0 }, { ch1_vdiv: 1 }, 'ch1_vdiv', 1)).toBe(0.05);
    // untouched when there is nothing to bound
    expect(_dsoProp({}, { math_op: 'add' }, 'math_op', 'off')).toBe('add');
  });
});

describe('DSO controls are scale-aware and normalize boolean values', () => {
  it('uses logarithmic scales for timebase and volts per division', () => {
    const controls = Object.fromEntries(dsoDef.interactive.map(ctrl => [ctrl.field, ctrl]));
    for (const field of ['timebase', 'ch1_vdiv', 'ch2_vdiv']) {
      expect(controls[field].scale, field).toBe('log');
    }
    expect(controls.timebase.step).toBeUndefined();

    const timeControl = controls.timebase;
    const geometricMidpoint = Math.sqrt(timeControl.min * timeControl.max);
    expect(_canvasSliderProgress(geometricMidpoint, timeControl.min, timeControl.max, 'log')).toBeCloseTo(0.5);
    expect(_canvasSliderValue(0.5, timeControl.min, timeControl.max, 'log')).toBeCloseTo(geometricMidpoint);
    expect(_canvasSliderProgress(NaN, timeControl.min, timeControl.max, 'log')).toBe(0);
    expect(_canvasSliderValue(NaN, timeControl.min, timeControl.max, 'log')).toBe(timeControl.min);

    const inst = makeDsoInst();
    CircuitCanvas.prototype._updateSliderValue.call({}, {
      inst,
      ctrl: timeControl,
      rect: { x: 0, width: 100 },
    }, 50, 0);
    expect(inst.runtimeState.timebase).toBeCloseTo(geometricMidpoint);
  });

  it('uses the same logarithmic scale in fullscreen controls', () => {
    const elements = drawPanel(new DSOFullscreen(), makeDsoInst());
    expect(elements.timebase.scale).toBe('log');
    expect(elements.ch1_vdiv.scale).toBe('log');
    const midpoint = Math.sqrt(elements.timebase.min * elements.timebase.max);
    expect(_dsoFsSliderProgress(midpoint, elements.timebase.min, elements.timebase.max, 'log')).toBeCloseTo(0.5);
    expect(_dsoFsSliderValue(0.5, elements.timebase.min, elements.timebase.max, 'log')).toBeCloseTo(midpoint);
    expect(_dsoFsSliderProgress(Infinity, elements.timebase.min, elements.timebase.max, 'log')).toBe(0);
    expect(_dsoFsSliderValue(NaN, elements.timebase.min, elements.timebase.max, 'log')).toBe(elements.timebase.min);
  });

  it('treats serialized false values as off across both displays', () => {
    for (const value of ['0', 'false', 'off', 'no', '', 0, false]) {
      expect(_dsoBool(value), `component value ${JSON.stringify(value)}`).toBe(false);
      expect(_dsoFsBool(value), `fullscreen value ${JSON.stringify(value)}`).toBe(false);
    }
    for (const value of ['1', 'true', 'on', 'yes', 1, true]) {
      expect(_dsoBool(value), `component value ${JSON.stringify(value)}`).toBe(true);
      expect(_dsoFsBool(value), `fullscreen value ${JSON.stringify(value)}`).toBe(true);
    }

    const inst = makeDsoInst();
    inst.props.powered = '0';
    dsoDef.step(inst, { simTime: 0 });
    expect(inst._buffers).toBeUndefined();
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. Properties panel write path
   ═══════════════════════════════════════════════════════════════════════ */
describe('clampPropValue — the properties panel write path', () => {
  it('clamps the DSO fields the sliders already bounded', () => {
    expect(clampPropValue(dsoDef, 'timebase', 0)).toBe(0.00001);
    expect(clampPropValue(dsoDef, 'timebase', 5)).toBe(0.1);
    expect(clampPropValue(dsoDef, 'ch1_vdiv', 0)).toBe(0.05);
    expect(clampPropValue(dsoDef, 'ch2_vdiv', 0)).toBe(0.05);
    expect(clampPropValue(dsoDef, 'trig_level', -99)).toBe(-10);
  });

  it('snaps to the declared step without leaving float dust', () => {
    expect(clampPropValue(dsoDef, 'timebase', 0.0007)).toBe(0.0007);
    expect(clampPropValue(dsoDef, 'ch1_vdiv', 1.33)).toBe(1.35);
    expect(clampPropValue(dsoDef, 'ch1_pos', 2.04)).toBe(2);
  });

  it('bounds every new function generator setting', () => {
    expect(clampPropValue(fgDef, 'ch1_duty', 1000)).toBe(99);
    expect(clampPropValue(fgDef, 'ch2_duty', -50)).toBe(1);
    expect(clampPropValue(fgDef, 'ch1_freq', -440)).toBe(0);
    expect(clampPropValue(fgDef, 'ch1_freq', 0.5)).toBe(0.5);   // examples run at 0.5 Hz
    expect(clampPropValue(fgDef, 'ch2_freq', 1e12)).toBe(10000000);
    expect(clampPropValue(fgDef, 'ch1_amp', 500)).toBe(10);
    expect(clampPropValue(fgDef, 'ch1_offset', -99)).toBe(-5);
    expect(clampPropValue(fgDef, 'ch1_phase', 720)).toBe(360);
  });

  it('leaves alone everything it has no business changing', () => {
    expect(clampPropValue(dsoDef, 'ch1_en', true)).toBe(true);       // not a number
    expect(clampPropValue(undefined, 'timebase', 5)).toBe(5);        // no definition
    expect(clampPropValue(dsoDef, 'not_a_prop', 5)).toBe(5);         // no control
    expect(clampPropValue(fgDef, 'ch1_wave', 'sine')).toBe('sine');  // select
    expect(clampPropValue(dsoDef, 'timebase', NaN)).toBeNaN();       // caller substitutes
  });

  it('properties panel mirrors the limits onto the field and clamps on Apply', () => {
    const app = readSrc('js/app.js');
    // _applyPropsModal funnels every number through clampPropValue
    expect(app.includes('clampPropValue(def, key, val)')).toBe(true);
    // _buildPropsModal exposes min/max/step so the browser can hint them
    expect(app.includes('input.min = iDef.min')).toBe(true);
    expect(app.includes('input.max = iDef.max')).toBe(true);
    expect(app.includes('input.step = iDef.step')).toBe(true);
    // and uses the control's own label rather than the raw property name
    expect(app.includes("(iDef && iDef.label) || key.replace(/_/g, ' ')")).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. Function generator
   ═══════════════════════════════════════════════════════════════════════ */
describe('function generator hardening', () => {
  const sim = { simTime: 137, setPinVoltage() {} };

  it('_fgNum coerces, rejects non-finite and clamps', () => {
    expect(_fgNum(undefined, 0, 1, 100)).toBe(0);
    expect(_fgNum('abc', 0, 1, 100)).toBe(0);
    expect(_fgNum(Infinity, 0, 1, 100)).toBe(0);
    expect(_fgNum(-Infinity, 5, 1, 100)).toBe(5);
    expect(_fgNum(-440, 0, 1, 100)).toBe(1);
    expect(_fgNum(1e9, 0, 1, 100)).toBe(100);
    expect(_fgNum('42', 0, 1, 100)).toBe(42);
  });

  it('recognizes string-valued power states', () => {
    for (const off of ['0', 'false', 'off', 'no', '', 0, false]) {
      expect(_fgBool(off), `powered=${JSON.stringify(off)}`).toBe(false);
      const inst = fgInst({ powered: off });
      fgDef.step(inst, sim);
      expect(inst.runtimeState.ch1_voltage).toBe(0);
      expect(inst.runtimeState.ch2_voltage).toBe(0);
    }
    for (const on of ['1', 'true', 'on', 'yes', 1, true]) {
      expect(_fgBool(on), `powered=${JSON.stringify(on)}`).toBe(true);
    }
  });

  it('drives a real waveform with the default settings', () => {
    const inst = fgInst();
    fgDef.step(inst, sim);
    expect(inst.runtimeState.ch1_voltage).toBeGreaterThan(0);
    expect(inst.runtimeState.ch2_voltage).toBeLessThan(0);
  });

  it('powered:"0" means off — Boolean("0") is truthy', () => {
    for (const off of ['0', 0, false]) {
      const inst = fgInst({ powered: off });
      fgDef.step(inst, sim);
      const tag = `powered=${JSON.stringify(off)}`;
      expect(inst.runtimeState.ch1_voltage, `${tag} ch1`).toBe(0);
      expect(inst.runtimeState.ch2_voltage, `${tag} ch2`).toBe(0);
    }
  });

  it('never drives a pin with a non-finite or out-of-range voltage', () => {
    const mirror = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace('ch1_', 'ch2_'), v]));
    const POISON = [
      { ch1_freq: Infinity }, { ch1_freq: -Infinity }, { ch1_freq: NaN },
      { ch1_freq: 'not-a-number' }, { ch1_freq: -440 }, { ch1_freq: 1e999 },
      { ch1_amp: Infinity }, { ch1_amp: 'abc' }, { ch1_amp: -50 },
      { ch1_offset: 1e999 }, { ch1_offset: -1e999 }, { ch1_offset: 'garbage' },
      { ch1_phase: NaN }, { ch1_phase: Infinity }, { ch1_phase: -720 },
      { ch1_duty: 1000 }, { ch1_duty: -50 }, { ch1_duty: 'abc' },
      { ch1_wave: 'not-a-wave' },
      { ch1_freq: 0, ch1_amp: 0, ch1_duty: 0 },
    ];
    const WAVES = ['sine', 'square', 'triangle', 'sawtooth', 'noise', 'unknown'];
    const TIMES = [0, 1, 137, 5000];

    // offset is bounded to ±5 V and amplitude to 10 Vpp, so a valid output can
    // never leave ±10 V.
    for (const wave of WAVES) {
      for (const poison of POISON) {
        for (const simTime of TIMES) {
          const inst = fgInst({
            ch1_wave: wave, ch2_wave: wave,
            ...poison, ...mirror(poison),
          });
          fgDef.step(inst, { ...sim, simTime });
          for (const ch of ['ch1', 'ch2']) {
            const v = inst.runtimeState[ch + '_voltage'];
            const ctx = `${wave} ${JSON.stringify(poison)} t=${simTime} ${ch}`;
            expect(Number.isFinite(v), `${ctx} -> ${v}`).toBe(true);
            expect(Math.abs(v), `${ctx} out of range -> ${v}`).toBeLessThanOrEqual(10);
          }
        }
      }
    }
  });

  it('declares bounded controls for all ten generator settings', () => {
    const byField = Object.fromEntries(fgDef.interactive.map(c => [c.field, c]));
    const fields = [
      'ch1_freq', 'ch1_amp', 'ch1_offset', 'ch1_phase', 'ch1_duty',
      'ch2_freq', 'ch2_amp', 'ch2_offset', 'ch2_phase', 'ch2_duty',
    ];
    for (const f of fields) {
      const c = byField[f];
      expect(c, `missing interactive control for ${f}`).toBeTruthy();
      expect(typeof c.min, `${f}.min`).toBe('number');
      expect(typeof c.max, `${f}.max`).toBe('number');
      expect(c.min, `${f}.min must be below max`).toBeLessThan(c.max);
      expect(typeof c.label, `${f}.label`).toBe('string');
      if (f.endsWith('_freq')) {
        // Deliberately unstepped: the bundled examples run at 0.5 Hz and
        // snapping to a whole number would silently change them.
        expect(c.step, `${f} must not snap`).toBeUndefined();
        expect(c.min, `${f}.min must allow sub-1 Hz`).toBeLessThanOrEqual(0.5);
      } else {
        expect(typeof c.step, `${f}.step`).toBe('number');
      }
    }
  });

  it('an on-canvas slider write drives the pins, not the stale prop', () => {
    // CircuitCanvas._updateSliderValue writes runtimeState and nothing else.
    // step() must read through it, or dragging a slider would be a no-op.
    const inst = fgInst();               // props.ch1_amp is 5
    inst.runtimeState.ch1_amp = 0;       // dragged to the left stop
    fgDef.step(inst, sim);
    expect(inst.runtimeState.ch1_voltage, 'props.ch1_amp=5 must not leak through').toBe(0);

    inst.runtimeState.ch1_amp = 10;
    fgDef.step(inst, sim);
    expect(Math.abs(inst.runtimeState.ch1_voltage)).toBeGreaterThan(0);
    expect(Math.abs(inst.runtimeState.ch1_voltage)).toBeLessThanOrEqual(5); // offset 0, amp 10 -> ±5
  });

  it('runtimeState.powered wins over props.powered', () => {
    const inst = fgInst({ powered: 1 });     // inline toggles also write only runtimeState
    inst.runtimeState.powered = 0;
    fgDef.step(inst, sim);
    expect(inst.runtimeState.ch1_voltage).toBe(0);
    expect(inst.runtimeState.ch2_voltage).toBe(0);
  });

  it('the drawn front-panel readout follows runtimeState too', () => {
    const texts = [];
    const ctx = new Proxy({}, {
      get(_, prop) {
        if (prop === 'measureText') return () => ({ width: 0 });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => ({ addColorStop() {} });
        }
        return (...args) => { if (prop === 'fillText') texts.push(String(args[0])); };
      },
      set: () => true,
    });
    const inst = fgInst();               // props.ch1_amp is 5
    inst.runtimeState.ch1_amp = 10;      // dragged on the canvas

    expect(() => fgDef.draw(ctx, inst, { simTime: 137, setPinVoltage() {} })).not.toThrow();
    expect(texts.some(s => s.includes('10.0Vpp')),
      'the card must show the dragged amplitude, not props.ch1_amp=5').toBe(true);
    expect(texts.some(s => s.includes('5.0Vpp'))).toBe(false);
  });

  it('keeps the sub-1 Hz frequency used by the bundled examples', () => {
    const inst = fgInst({ ch1_freq: 0.5, ch2_freq: 1 });
    fgDef.step(inst, sim);
    expect(inst.runtimeState.ch1_voltage).not.toBe(0);
    // and the properties panel must not round it away either
    expect(clampPropValue(fgDef, 'ch1_freq', 0.5)).toBe(0.5);
  });

  it('puts sliders on the canvas for the linear ranges only', () => {
    const inst = { type: 'func_gen', x: 0, y: 0, props: { ...fgDef.defaultProps } };
    const rects = CircuitCanvas.prototype._getInteractiveRects.call({}, inst);
    const fields = rects.map(r => r.ctrl.field);

    // linear, genuinely useful as sliders
    for (const f of ['ch1_amp', 'ch1_offset', 'ch1_phase', 'ch1_duty',
      'ch2_amp', 'ch2_offset', 'ch2_phase', 'ch2_duty']) {
      expect(fields, `${f} should be an on-canvas slider`).toContain(f);
    }
    // frequency is log-scale: a linear 1 Hz … 10 MHz slider would be unusable,
    // so it stays a bounded number field (the canvas keeps its +/- buttons).
    expect(fields).not.toContain('ch1_freq');
    expect(fields).not.toContain('ch2_freq');
    // selects are rendered by the component, not by the slider layer
    expect(fields).not.toContain('ch1_wave');
    expect(fields).not.toContain('ch2_wave');
  });

  it('the on-canvas freq buttons obey the same limits', () => {
    // Regression: the old Math.max(1, …) *raised* 0.5 Hz to 1 Hz when you
    // pressed "freq down", because it clamped below the value it had just
    // computed rather than against the component's real floor.
    const down = fgInst({ ch1_freq: 0.5 });
    CircuitCanvas.prototype._handleFuncGenButtonClick.call({}, down, 'ch1FreqDown');
    expect(down.props.ch1_freq).toBe(0);

    // …and the buttons cannot walk past the panel's ceiling either.
    const up = fgInst({ ch1_freq: 10000000 });
    CircuitCanvas.prototype._handleFuncGenButtonClick.call({}, up, 'ch1FreqUp');
    expect(up.props.ch1_freq).toBe(10000000);

    // a non-finite stored value cannot make the button write NaN
    const broken = fgInst({ ch1_freq: Infinity });
    CircuitCanvas.prototype._handleFuncGenButtonClick.call({}, broken, 'ch1FreqUp');
    expect(Number.isFinite(broken.props.ch1_freq)).toBe(true);
  });
});
