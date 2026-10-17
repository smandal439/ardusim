/**
 * test/examples_led_resistors.test.js — series-resistor wiring of the shipped
 * LED examples.
 *
 * Two examples (GPS NEO-6M/8M Tracker, BH1750 Light Sensor) carried a stray
 * wire from a board GND pin straight onto the LED cathode *alongside* the
 * intended 220Ω series resistor. The bare wire shorts the resistor out, so the
 * LED's over-current check measures a 0Ω return path and computes
 * (Vsource − 2.0V) / 25Ω ≈ 52 mA on a 3.3 V pin (≈120 mA on 5 V), declaring
 * the LED blown on every frame:
 *
 *   LED (led_green) is over-current (~52 mA) without a current-limiting
 *   resistor and has blown! Add a 220Ω resistor in series.
 *
 * …while a 220Ω resistor is sitting right there, just bypassed. The LED could
 * therefore never light even though the sketch drove its pin HIGH.
 *
 * Run: npx vitest run test/examples_led_resistors.test.js
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
  OutputPanel: null,
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

const { CircuitCanvas } = loadScripts([
  'js/electrical.js',
  'js/components/base.js',
  'js/components/boards.js',
  'js/components/passive.js',
  'js/components/input.js',
  'js/components/output.js',
  'js/components/sensors.js',
  'js/canvas.js',
], ['CircuitCanvas']);

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
  return { canvasEl, wrapperEl };
}

function buildRig(example, board) {
  const { canvasEl, wrapperEl } = makeCanvasStub();
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  // Exactly how App._loadExampleCircuit() brings an example in: deserialize()
  // filters to known types and seeds every component with runtimeState: {}.
  cc.deserialize(example.circuit);

  const sim = new ArduinoSimulator();
  sim.board = board;

  global.window.ArduinoSim = sim;
  global.window.CircuitCanvas = cc;
  return { cc, sim };
}

/** Drive pins, run every component's update(), capture the console output. */
function drive(cc, sim, pinValues) {
  const logs = [];
  global.window.OutputPanel = { log: (msg, level) => logs.push({ msg, level }) };
  try {
    for (const [key, value] of Object.entries(pinValues)) sim.pinStates[key] = value;
    cc.updateSimState(sim.pinStates);
  } finally {
    global.window.OutputPanel = null;
  }
  return logs;
}

/** Board GND pins wired straight onto `ledId`'s `pinId` — no resistor between. */
function directGroundWires(example, ledId, pinId = 'cathode') {
  const comps = example.circuit.components;
  const typeOf = (id) => (comps.find(c => c.id === id) || {}).type || '';
  const hits = [];
  for (const w of example.circuit.wires) {
    let other = null;
    if (w.from.instId === ledId && w.from.pinId === pinId) other = w.to;
    else if (w.to.instId === ledId && w.to.pinId === pinId) other = w.from;
    if (!other) continue;
    if (/^GND/.test(other.pinId) && /arduino|esp32|pico|stm32|lpc|intel/i.test(typeOf(other.instId))) {
      hits.push(other);
    }
  }
  return hits;
}

const overCurrent = (logs) => logs.filter(l => /over-current/.test(l.msg));

/** True when something resistive is in series with the LED's cathode. */
function hasSeriesResistor(example, ledId) {
  const comps = example.circuit.components;
  const typeOf = (id) => (comps.find(c => c.id === id) || {}).type || '';
  for (const w of example.circuit.wires) {
    let other = null;
    if (w.from.instId === ledId && w.from.pinId === 'cathode') other = w.to;
    else if (w.to.instId === ledId && w.to.pinId === 'cathode') other = w.from;
    if (other && typeOf(other.instId) === 'resistor') return true;
  }
  return false;
}

const gpsExample = JSON.parse(readSrc('Examples/gps_neo_6m_8m_tracker.json'));
const bhExample = JSON.parse(readSrc('Examples/bh1750_light_sensor.json'));

describe('GPS NEO-6M/8M Tracker example', () => {
  let cc, sim, green, red, resistors;

  beforeEach(() => {
    ({ cc, sim } = buildRig(gpsExample, 'esp32_devkit_v1'));
    green = cc.components.find(c => c.id === 'led_green');
    red = cc.components.find(c => c.id === 'led_red');
    resistors = cc.components.filter(c => c.type === 'resistor');
  });

  afterEach(() => {
    sim.stop();
    global.window.ArduinoSim = null;
    global.window.CircuitCanvas = null;
    global.window.OutputPanel = null;
  });

  it('keeps a 220Ω current-limiting resistor in series with each LED', () => {
    expect(resistors.length).toBe(2);
    for (const r of resistors) expect(r.props.value).toBe(220);
  });

  it('does not wire a board ground pin straight onto the green LED cathode', () => {
    // THE BUG: a bare GND→cathode wire sat next to the resistor and shorted it
    // out, so the LED read as if it had no series resistor at all.
    expect(directGroundWires(gpsExample, 'led_green')).toEqual([]);
    expect(directGroundWires(gpsExample, 'led_red')).toEqual([]);
  });

  it('measures 220Ω from the green LED cathode back to a board ground', () => {
    cc.engine.buildGraph(cc.components, cc.wires);
    cc.engine.solve(cc);
    expect(cc.engine.measureResistance('led_green', 'cathode', 'esp1', 'GND1'))
      .toBeCloseTo(220, 6);
  });

  it('lights the green LED instead of blowing it when GPIO2 is HIGH', () => {
    const logs = drive(cc, sim, { pin_2: 1, pin_4: 0, pin_5: 0 });

    expect(green.runtimeState.lit, 'green LED must light').toBe(true);
    expect(green.runtimeState.blown, 'green LED must not be marked blown').toBe(false);
    // 3.3V − 2.0V Vf across 220Ω (+25Ω internal) ≈ 5.3 mA — far under the
    // 20 mA overload / 40 mA blown thresholds.
    expect(green.runtimeState.current_mA).toBeGreaterThan(0);
    expect(green.runtimeState.current_mA).toBeLessThan(20);
    expect(overCurrent(logs), 'no over-current warning may be logged').toEqual([]);
  });

  it('keeps the red LED on its own resistor as well', () => {
    const logs = drive(cc, sim, { pin_2: 0, pin_4: 1, pin_5: 0 });

    expect(red.runtimeState.lit).toBe(true);
    expect(red.runtimeState.blown).toBe(false);
    expect(red.runtimeState.current_mA).toBeLessThan(20);
    expect(overCurrent(logs), 'no over-current warning may be logged').toEqual([]);
  });
});

describe('BH1750 Light Sensor example', () => {
  let cc, sim, led;

  beforeEach(() => {
    ({ cc, sim } = buildRig(bhExample, 'arduino_uno'));
    led = cc.components.find(c => c.id === 'led1');
  });

  afterEach(() => {
    sim.stop();
    global.window.ArduinoSim = null;
    global.window.CircuitCanvas = null;
    global.window.OutputPanel = null;
  });

  it('does not wire a board ground pin straight onto the LED cathode', () => {
    expect(directGroundWires(bhExample, 'led1')).toEqual([]);
  });

  it('measures 220Ω from the LED cathode back to a board ground', () => {
    cc.engine.buildGraph(cc.components, cc.wires);
    cc.engine.solve(cc);
    expect(cc.engine.measureResistance('led1', 'cathode', 'b1', 'GND2'))
      .toBeCloseTo(220, 6);
  });

  it('lights the LED instead of blowing it when D9 is HIGH', () => {
    const logs = drive(cc, sim, { pin_9: 1 });

    expect(led.runtimeState.lit, 'LED must light').toBe(true);
    expect(led.runtimeState.blown, 'LED must not be marked blown').toBe(false);
    // 5V − 2.0V Vf across 220Ω (+25Ω internal) ≈ 12.2 mA.
    expect(led.runtimeState.current_mA).toBeGreaterThan(0);
    expect(led.runtimeState.current_mA).toBeLessThan(20);
    expect(overCurrent(logs), 'no over-current warning may be logged').toEqual([]);
  });
});

describe('every shipped example', () => {
  it('never shorts an LED series resistor out with a bare ground wire', () => {
    // The precise authoring slip behind both bugs above: a resistor *and* a
    // direct board-GND wire land on the same cathode, so the wire wins, the
    // resistor is bypassed and the LED blows anyway. Examples that have no
    // resistor at all are a different (content) issue and are not checked here.
    const dir = path.join(ROOT, 'Examples');
    const offenders = [];
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      let ex;
      try { ex = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); }
      catch { continue; }
      if (!ex || !ex.circuit || !Array.isArray(ex.circuit.components)) continue;
      for (const led of ex.circuit.components.filter(c => c && /^led/.test(c.type || ''))) {
        if (!hasSeriesResistor(ex, led.id)) continue;
        const strays = directGroundWires(ex, led.id);
        if (strays.length) {
          offenders.push(`${file}#${led.id} -> ${strays.map(s => `${s.instId}.${s.pinId}`).join(', ')}`);
        }
      }
    }
    expect(offenders, 'LEDs whose series resistor is bypassed by a direct ground wire')
      .toEqual([]);
  });
});
