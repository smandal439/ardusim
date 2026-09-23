/**
 * test/pico2w_button.test.js — Regression tests for the "Pico 2 W Button" example.
 *
 * Two bugs made this example dead:
 *   1. Examples/pico2w_button.json wired the button across its *internally
 *      joined* legs (btn1 p1 + btn1 p2). Pressing the cap joins p1-p3 / p2-p4,
 *      so 3V3 never reached GP14. The switch must be read across p1/p3 (or p2/p4).
 *   2. canvas.js only copied solved voltages back into pinStates for INPUT and
 *      INPUT_PULLUP pins, so INPUT_PULLDOWN (used by this example) was ignored
 *      and GP14 could never read HIGH.
 *
 * Run: npx vitest run test/pico2w_button.test.js
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ── Minimal browser-like globals (same pattern as test/transpiler.test.js) ── */
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

/* Circuit model + canvas share one scope: canvas.js resolves ElectricalEngine,
   Component, defComp ... from that scope at runtime. */
const { CircuitCanvas } = loadScripts([
  'js/electrical.js',
  'js/components/base.js',
  'js/components/boards.js',
  'js/components/input.js',
  'js/components/output.js',
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

function buildRig(example) {
  const { canvasEl, wrapperEl } = makeCanvasStub();
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  cc.components = JSON.parse(JSON.stringify(example.circuit.components));
  cc.wires = JSON.parse(JSON.stringify(example.circuit.wires));

  const sim = new ArduinoSimulator();
  sim.board = 'pico2w';

  global.window.ArduinoSim = sim;
  global.window.CircuitCanvas = cc;
  return { cc, sim };
}

const waitFor = async (predicate, timeoutMs = 3000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise(r => setTimeout(r, 20));
  }
  return predicate();
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const example = JSON.parse(readSrc('Examples/pico2w_button.json'));

describe('Pico 2 W Button example', () => {
  let cc, sim, btn;

  beforeEach(() => {
    ({ cc, sim } = buildRig(example));
    btn = cc.components.find(c => c.id === 'btn1');
  });

  afterEach(() => {
    sim.stop();
    sim.onPinChange = null;
    global.window.ArduinoSim = null;
    global.window.CircuitCanvas = null;
  });

  it('reads the switch across its contact pairs (not the permanently joined legs)', () => {
    const btnLegs = new Set();
    for (const w of example.circuit.wires) {
      if (w.from.instId === 'btn1') btnLegs.add(w.from.pinId);
      if (w.to.instId === 'btn1') btnLegs.add(w.to.pinId);
    }
    // p1/p2 are one internal pair and p3/p4 the other — one leg from each pair
    // is required, otherwise pressing the cap cannot bridge anything.
    const diagonal = (btnLegs.has('p1') && btnLegs.has('p3')) || (btnLegs.has('p2') && btnLegs.has('p4'));
    expect(diagonal).toBe(true);
  });

  it('bridges 3V3 to GP14 in the electrical engine while the button is held', () => {
    cc.engine.buildGraph(cc.components, cc.wires);
    cc.engine.solve(cc);
    expect(cc.engine.getNetForPin('b1', 'GP14').sources.length).toBe(0);

    btn.runtimeState.pressed = true;
    cc.engine.buildGraph(cc.components, cc.wires);
    cc.engine.solve(cc);

    const pressedNet = cc.engine.getNetForPin('b1', 'GP14');
    expect(pressedNet.sources.length).toBe(1);
    expect(pressedNet.sources[0].voltage).toBeCloseTo(3.3, 2);
  });

  it('feeds solved voltages back into an INPUT_PULLDOWN pin', () => {
    // What pinMode(BTN_PIN, INPUT_PULLDOWN) does in setup()
    sim.pinModes['pin_14'] = 'INPUT_PULLDOWN';
    sim.pinStates['pin_14'] = 0;

    cc.updateSimState(sim.pinStates);
    expect(sim.pinStates['pin_14']).toBe(0); // released -> pulled low

    btn.runtimeState.pressed = true;
    cc.updateSimState(sim.pinStates);
    expect(sim.pinStates['pin_14']).toBe(1); // pressed -> driven by 3V3OUT
  });

  it('toggles the LED on GP15 when the sketch reads the pressed button', async () => {
    const errors = [];
    sim.onError = (msg) => errors.push(msg);
    sim.onPinChange = () => cc.updateSimState(sim.pinStates);
    // The app drives updateSimState() from canvas._render() on every animation
    // frame while the sketch runs — emulate that loop here.
    const frame = setInterval(() => cc.updateSimState(sim.pinStates), 16);

    // run() resolves only when the sketch is stopped, so keep the promise aside.
    const runPromise = sim.run(example.code);
    runPromise.catch(() => {});
    expect(await waitFor(() => sim.isRunning, 3000)).toBe(true);
    expect(errors).toEqual([]);

    try {
      // GP15 is only written on a press edge, so it stays untouched (= LED off)
      expect(await waitFor(() => !sim.pinStates['pin_15'], 1000)).toBe(true);

      btn.runtimeState.pressed = true;
      expect(await waitFor(() => sim.pinStates['pin_15'] === 1, 3000)).toBe(true); // 1st press -> LED on

      btn.runtimeState.pressed = false;
      expect(await waitFor(() => sim.pinStates['pin_14'] === 0, 1000)).toBe(true); // released level reaches GP14
      await sleep(150);                                                            // let loop() latch lastBtn
      expect(sim.pinStates['pin_15']).toBe(1);                                     // release keeps LED on

      btn.runtimeState.pressed = true;
      expect(await waitFor(() => sim.pinStates['pin_15'] === 0, 3000)).toBe(true); // 2nd press -> LED off
    } finally {
      btn.runtimeState.pressed = false;
      clearInterval(frame);
      sim.stop();
    }
  }, 20000);
});
