/**
 * test/water_flow.test.js — YF-S201 Water Flow Meter example.
 *
 * The example was dead because:
 *   1. `water_flow_sensor` defined `update(inst, sim, dt)` — but the renderer
 *      only ever calls `def.step(inst, sim)` (canvas.js `_drawComponents`), so
 *      the pulse generator never advanced.
 *   2. Nothing drove the SIG net, so pin D2 never toggled and the sketch's
 *      `attachInterrupt(..., RISING)` never fired — pulseCount stayed 0.
 *
 * Run: npx vitest run test/water_flow.test.js
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ── Minimal browser-like globals (same pattern as test/pico2w_button.test.js) ── */
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

/** Evaluate script files in one shared scope and return the requested declarations. */
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
  'js/canvas.js',
], ['CircuitCanvas', 'COMPONENT_DEFS']);

const { ArduinoSimulator } = loadScripts([
  'js/simulator.js',
  'js/libraries/serial.js',
  'js/libraries/wire.js',
], ['ArduinoSimulator']);

/* ── Headless canvas harness ── */
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

function buildRig(example) {
  const { canvasEl, wrapperEl, ctx } = makeCanvasStub();
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  cc.components = JSON.parse(JSON.stringify(example.circuit.components));
  cc.wires = JSON.parse(JSON.stringify(example.circuit.wires));

  const sim = new ArduinoSimulator();

  global.window.ArduinoSim = sim;
  global.window.CircuitCanvas = cc;
  return { cc, sim, ctx };
}

const waitFor = async (predicate, timeoutMs = 3000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise(r => setTimeout(r, 20));
  }
  return predicate();
};

const example = JSON.parse(readSrc('Examples/water_flow.json'));

/** Parse "Flow: 12.34 L/min" out of the captured serial stream. */
function latestFlow(logs) {
  const lines = logs.join('').split(/\r?\n/).filter(l => l.includes('Flow:'));
  if (!lines.length) return null;
  const m = /Flow:\s*(-?[\d.]+)\s*L\/min/.exec(lines[lines.length - 1]);
  return m ? Number(m[1]) : null;
}

/** Every "Flow: X L/min" reading in the stream, in order. */
function allFlows(logs) {
  const text = Array.isArray(logs) ? logs.join('') : logs;
  return (text.match(/Flow:\s*(-?[\d.]+)\s*L\/min/g) || [])
    .map(s => Number(/Flow:\s*(-?[\d.]+)/.exec(s)[1]));
}

describe('YF-S201 Water Flow Meter example', () => {
  let cc, sim, ctx, flow, logs, frame;

  beforeEach(() => {
    ({ cc, sim, ctx } = buildRig(example));
    flow = cc.components.find(c => c.id === 'comp_flow');
    logs = [];
    sim._serialLog = (m) => logs.push(String(m));
    // The app runs updateSimState() + component draw/step on every animation
    // frame while the sketch runs — emulate that loop here.
    frame = setInterval(() => {
      cc.updateSimState(sim.pinStates);
      try { cc._drawComponents(ctx); } catch { /* drawing is not under test */ }
    }, 16);
  });

  afterEach(() => {
    clearInterval(frame);
    sim.stop();
    sim.onPinChange = null;
    global.window.ArduinoSim = null;
    global.window.CircuitCanvas = null;
  });

  it('exposes the pulse generator to the renderer (step, not update)', () => {
    // canvas.js `_drawComponents` only calls `def.step(inst, sim)`.
    expect(typeof COMPONENT_DEFS.water_flow_sensor.step).toBe('function');
    expect(COMPONENT_DEFS.water_flow_sensor.step).not.toBe(COMPONENT_DEFS.water_flow_sensor.update);
  });

  it('advances the pulse phase while the simulation runs', async () => {
    sim.isRunning = true;
    sim.simTime = 0;
    cc._drawComponents(ctx); // first frame only latches the clock
    expect(flow.runtimeState).toBeTruthy();
    expect(flow.runtimeState.pulseHigh).toBe(false);

    sim.simTime = 1000; // 1 s of simulated time
    cc._drawComponents(ctx);

    // At 5 L/min the sensor emits 450 pulses/L → 7.5 Hz per L/min → 37.5 Hz.
    expect(Number.isFinite(flow.runtimeState.pulses)).toBe(true);
    expect(flow.runtimeState.pulses).toBeGreaterThanOrEqual(35);
    expect(flow.runtimeState.pulses).toBeLessThanOrEqual(40);
  });

  it('drives the wired SIG pin so the sketch interrupt fires', async () => {
    const errors = [];
    sim.onError = (msg) => errors.push(msg);

    const runPromise = sim.run(example.code);
    runPromise.catch(() => {});
    expect(await waitFor(() => sim.isRunning, 3000)).toBe(true);
    expect(errors).toEqual([]);

    try {
      // pinMode(2, INPUT_PULLUP) must be in effect for the feed-back path.
      expect(await waitFor(() => sim.pinModes['pin_2'] === 'INPUT_PULLUP', 2000)).toBe(true);
      // The ISR toggles LED 13 on every pulse — no pulses, no toggling.
      expect(await waitFor(() => sim.pinStates['pin_13'] === 1, 5000)).toBe(true);
    } finally {
      sim.stop();
    }
  }, 20000);

  it('prints a non-zero flow rate on Serial', async () => {
    const errors = [];
    sim.onError = (msg) => errors.push(msg);

    const runPromise = sim.run(example.code);
    runPromise.catch(() => {});
    expect(await waitFor(() => sim.isRunning, 3000)).toBe(true);

    try {
      expect(await waitFor(() => logs.join('').includes('YF-S201 Water Flow Meter'), 3000)).toBe(true);
      const ok = await waitFor(() => {
        const f = latestFlow(logs);
        return f !== null && f > 0;
      }, 8000);
      expect(errors).toEqual([]);
      expect(ok, `flow never became non-zero; serial was: ${logs.join('')}`).toBe(true);
    } finally {
      sim.stop();
    }
  }, 20000);

  it('reports the actual flow rate (~5 L/min), not a cumulative count', async () => {
    const errors = [];
    sim.onError = (msg) => errors.push(msg);

    const runPromise = sim.run(example.code);
    runPromise.catch(() => {});
    expect(await waitFor(() => sim.isRunning, 3000)).toBe(true);

    try {
      // Let it settle for a few sample windows past the first (partial) one.
      expect(await waitFor(() => allFlows(logs.join('')).length >= 8, 8000)).toBe(true);
      expect(errors).toEqual([]);

      const text = logs.join('');
      const flows = allFlows(text).slice(4); // skip warm-up windows

      // The sensor is set to 5 L/min, so every windowed reading must sit near
      // 5 — the old sketch never reset pulseCount, so "Flow" climbed forever.
      expect(flows.length).toBeGreaterThan(0);
      for (const f of flows) {
        expect(f, `flow reading ${f} outside tolerance\n${text}`).toBeGreaterThan(3);
        expect(f, `flow reading ${f} outside tolerance\n${text}`).toBeLessThan(7);
      }

      // ...and nothing may fall through to the binary formatter: an exact
      // integer like 5.0 used to print as "101" instead of "5.00".
      expect(text).not.toMatch(/Flow:\s*\d{3,}\s*L\/min/);
    } finally {
      sim.stop();
    }
  }, 20000);
});
