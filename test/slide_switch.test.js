/**
 * test/slide_switch.test.js — the SPDT Slide Switch component.
 *
 * The switch is a purely passive SPDT contact: the engine must short COM to the
 * selected throw (exactly like a relay shorts COM to NO/NC), and every reader
 * (_tracePinNet, _readDigitalInput, _readAnalogInput, resistance measurement)
 * has to follow that same single path — the unselected throw is open.
 *
 * Run: npx vitest run test/slide_switch.test.js
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ── Minimal browser-like globals (same pattern as test/water_flow.test.js) ── */
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

const { CircuitCanvas, COMPONENT_DEFS, COMPONENT_CATALOG } = loadScripts([
  'js/electrical.js',
  'js/components/base.js',
  'js/components/boards.js',
  'js/components/input.js',
  'js/components/output.js',
  'js/components/passive.js',
  'js/components/power.js',
  'js/components/sensors.js',
  'js/canvas.js',
], ['CircuitCanvas', 'COMPONENT_DEFS', 'COMPONENT_CATALOG']);

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

/**
 * Wires one Arduino Uno to three slide switches, each with its own supplies so
 * the three nets stay independent:
 *   sw1  COM -> D2,  throw A -> GND,  throw B -> 5 V   (sketch reads D2)
 *   sw2  COM -> 5 V, throw A -> D5                     (reads backwards: D5 -> A)
 *   sw3  COM -> A0,  throw A -> GND,  throw B -> 5 V    (analogRead path)
 */
function buildRig() {
  const { canvasEl, wrapperEl, ctx } = makeCanvasStub();
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  const comp = (id, type, x, y, props) => ({ id, type, x, y, props: props || {}, runtimeState: {} });
  cc.components = [
    comp('u1', 'arduino_uno', 60, 40, { label: 'UNO' }),
    comp('sw1', 'slide_switch', 420, 200, { position: 0 }),
    comp('sw2', 'slide_switch', 420, 340, { position: 0 }),
    comp('sw3', 'slide_switch', 420, 480, { position: 0 }),
    comp('p5', 'power_5v', 640, 200),
    comp('pg', 'power_gnd', 640, 120),
    comp('p5b', 'power_5v', 640, 340),
    comp('p5c', 'power_5v', 640, 480),
    comp('pgc', 'power_gnd', 640, 560),
  ];
  const wire = (id, a, b, c, d) => ({ id, from: { instId: a, pinId: b }, to: { instId: c, pinId: d } });
  cc.wires = [
    wire('w1', 'u1', 'D2', 'sw1', 'com'),
    wire('w2', 'sw1', 'a', 'pg', 'gnd'),
    wire('w3', 'sw1', 'b', 'p5', 'vcc'),
    wire('w4', 'u1', 'D5', 'sw2', 'a'),
    wire('w5', 'sw2', 'com', 'p5b', 'vcc'),
    wire('w6', 'u1', 'A0', 'sw3', 'com'),
    wire('w7', 'sw3', 'a', 'pgc', 'gnd'),
    wire('w8', 'sw3', 'b', 'p5c', 'vcc'),
  ];

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

const on = (cc, id) => cc.components.find(c => c.id === id);

/** Slide a switch and settle a few simulation frames. */
async function slide(cc, id, position) {
  const sw = on(cc, id);
  cc._toggleSlideSwitch(sw);
  expect(sw.runtimeState.position).toBe(position);
  await new Promise(r => setTimeout(r, 60));
}

/** Every "L=<digit>" reading in the serial stream, in order. */
function levels(logs) {
  const text = Array.isArray(logs) ? logs.join('') : logs;
  return (text.match(/L=\d/g) || []).map(s => Number(s.slice(2)));
}

const WITH_PINMODE = `void setup() {
  pinMode(2, INPUT);
  Serial.begin(9600);
}
void loop() {
  Serial.print("L=");
  Serial.println(digitalRead(2));
  delay(100);
}`;

/* No pinMode() at all — the switch still has to track the slider. */
const WITHOUT_PINMODE = `void setup() {
  Serial.begin(9600);
}
void loop() {
  Serial.print("L=");
  Serial.println(digitalRead(2));
  delay(100);
}`;

describe('Slide Switch (SPDT) component', () => {
  let cc, sim, ctx, logs, frame;

  beforeEach(() => {
    ({ cc, sim, ctx } = buildRig());
    logs = [];
    sim._serialLog = (m) => logs.push(String(m));
    // The app runs updateSimState() + component draw on every animation frame
    // while the sketch runs — emulate that loop here.
    frame = setInterval(() => {
      cc.updateSimState(sim.pinStates);
      try { cc._drawComponents(ctx); } catch { /* drawing is not under test */ }
    }, 16);
  });

  afterEach(() => {
    clearInterval(frame);
    sim.stop();
    global.window.ArduinoSim = null;
    global.window.CircuitCanvas = null;
  });

  /* ── Registration ─────────────────────────────────────────────── */

  it('is defined, listed in the palette and documented in the guide', () => {
    const def = COMPONENT_DEFS.slide_switch;
    expect(def).toBeTruthy();
    expect(def.category).toBe('Input');
    expect(def.width).toBe(56);
    expect(def.height).toBe(56);
    expect(typeof def.draw).toBe('function');
    expect(def.interactive.map(c => c.field)).toContain('position');

    const input = COMPONENT_CATALOG.find(c => c.category === 'Input');
    expect(input.ids).toContain('slide_switch');

    expect(readSrc('js/guide.js')).toMatch(/^\s{2}slide_switch:\s*\{/m);
    expect(readSrc('README.md')).toContain('Slide Switch (SPDT)');
  });

  it('exposes three pins with the common in the centre', () => {
    const pins = COMPONENT_DEFS.slide_switch.pins;
    expect(pins.map(p => p.id)).toEqual(['a', 'com', 'b']);
    expect(pins.map(p => p.x)).toEqual([14, 28, 42]); // COM sits between the throws
    expect(pins.every(p => p.side === 'bottom')).toBe(true);
  });

  it('draws without throwing in either position', () => {
    const def = COMPONENT_DEFS.slide_switch;
    const inst = on(cc, 'sw1');
    expect(() => def.draw(ctx, inst)).not.toThrow();
    inst.runtimeState.position = 1;
    expect(() => def.draw(ctx, inst)).not.toThrow();
  });

  /* ── Throw resolution ─────────────────────────────────────────── */

  it('resolves the throw from props or runtimeState, including panel-written strings', () => {
    const t = global.window._slideSwitchThrow;
    expect(typeof t).toBe('function');
    expect(t({ props: { position: 0 } })).toBe('a');
    expect(t({ props: { position: 1 } })).toBe('b');
    // The properties-panel <select> writes strings into both stores.
    expect(t({ props: { position: '1' } })).toBe('b');
    expect(t({ runtimeState: { position: '1' }, props: { position: 0 } })).toBe('b');
    expect(t({ runtimeState: { position: 0 }, props: { position: '1' } })).toBe('a');
    expect(t({ props: {} })).toBe('a');
  });

  it('toggles on click and reports the change', () => {
    const sw = on(cc, 'sw1');
    let changed = 0;
    cc._onChanged = () => { changed++; };

    cc._toggleSlideSwitch(sw);
    expect(sw.runtimeState.position).toBe(1);
    cc._toggleSlideSwitch(sw);
    expect(sw.runtimeState.position).toBe(0);
    expect(changed).toBe(2);
    expect(() => cc._toggleSlideSwitch({ type: 'push_button' })).not.toThrow();
  });

  /* ── Electrical model ─────────────────────────────────────────── */

  it('shorts COM to the selected throw and only that throw', () => {
    const sw = on(cc, 'sw1');
    expect(cc.engine._getInternalConnections(sw)).toEqual([['sw1:com', 'sw1:a']]);
    sw.runtimeState.position = 1;
    expect(cc.engine._getInternalConnections(sw)).toEqual([['sw1:com', 'sw1:b']]);
    sw.runtimeState.position = '0'; // string form from the property panel
    expect(cc.engine._getInternalConnections(sw)).toEqual([['sw1:com', 'sw1:a']]);
  });

  it('traces the net through the selected throw only', () => {
    const sw = on(cc, 'sw1');
    const gnds = (r) => r.grounds.map(g => `${g.instId || ''}:${g.pinId || ''}`);
    const has5v = (r) => r.sources.some(s => s.type === '5v');

    // COM -> A -> GND: the 5 V throw must be out of reach.
    let n = cc._tracePinNet('sw1', 'com');
    expect(gnds(n)).toContain('pg:gnd');
    expect(has5v(n)).toBe(false);

    sw.runtimeState.position = 1;
    n = cc._tracePinNet('sw1', 'com');
    expect(has5v(n)).toBe(true);
    expect(gnds(n)).not.toContain('pg:gnd');
  });

  it('reads the level through the switch, both directions', () => {
    // Board -> COM -> selected throw
    expect(cc._readDigitalInput('u1', 'D2')).toBe(0); // A -> GND
    expect(cc._readDigitalInput('u1', 'D5')).toBe(1); // A -> 5 V (sw2 reads backwards)

    on(cc, 'sw1').runtimeState.position = 1;
    on(cc, 'sw2').runtimeState.position = 1;
    expect(cc._readDigitalInput('u1', 'D2')).toBe(1); // B -> 5 V
    expect(cc._readDigitalInput('u1', 'D5')).toBe(0); // B is open
    expect(cc._hasDigitalInputSource('u1', 'D5')).toBe(false);
    expect(cc._hasDigitalInputSource('u1', 'D2')).toBe(true);
  });

  it('sends analogRead through the switch and reports 0 on the open throw', () => {
    expect(cc._readAnalogInput('u1', 'A0')).toBe(0); // A -> GND
    on(cc, 'sw3').runtimeState.position = 1;
    expect(cc._readAnalogInput('u1', 'A0')).toBe(1023); // B -> 5 V
    on(cc, 'sw3').runtimeState.position = 0;
    expect(cc._readAnalogInput('u1', 'A0')).toBe(0);
  });

  it('measures zero resistance across the closed contact', () => {
    cc.updateSimState(sim.pinStates); // build the wire/internal-edge graph first

    expect(cc.engine.measureResistance('u1', 'D2', 'pg', 'gnd')).toBeLessThan(1e-6);
    // ...and the open side is unreachable.
    expect(cc.engine.measureResistance('u1', 'D2', 'p5', 'vcc')).toBe(Infinity);

    on(cc, 'sw1').runtimeState.position = 1;
    expect(cc.engine.measureResistance('u1', 'D2', 'p5', 'vcc')).toBeLessThan(1e-6);
    expect(cc.engine.measureResistance('u1', 'D2', 'pg', 'gnd')).toBe(Infinity);
  });

  /* ── End to end ───────────────────────────────────────────────── */

  it('feeds the wired digital pin so the sketch sees both positions', async () => {
    const errors = [];
    sim.onError = (msg) => errors.push(msg);

    const runPromise = sim.run(WITH_PINMODE);
    runPromise.catch(() => {});
    expect(await waitFor(() => sim.isRunning, 3000)).toBe(true);

    try {
      expect(await waitFor(() => sim.pinModes['pin_2'] === 'INPUT', 2000)).toBe(true);
      // Position A shorts COM to GND, so D2 must read LOW.
      expect(await waitFor(() => levels(logs).includes(0), 5000)).toBe(true);

      const mark = logs.length;
      await slide(cc, 'sw1', 1); // now COM -> 5 V
      expect(await waitFor(() => sim.pinStates['pin_2'] === 1, 5000)).toBe(true);
      expect(await waitFor(() => levels(logs.slice(mark)).includes(1), 5000)).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      sim.stop();
    }
  }, 20000);

  it('works even when the sketch never calls pinMode()', async () => {
    const errors = [];
    sim.onError = (msg) => errors.push(msg);

    const runPromise = sim.run(WITHOUT_PINMODE);
    runPromise.catch(() => {});
    expect(await waitFor(() => sim.isRunning, 3000)).toBe(true);

    try {
      expect(await waitFor(() => levels(logs).includes(0), 5000)).toBe(true);
      expect(sim.pinModes['pin_2']).toBeUndefined();

      const mark = logs.length;
      await slide(cc, 'sw1', 1);
      expect(await waitFor(() => levels(logs.slice(mark)).includes(1), 5000)).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      sim.stop();
    }
  }, 20000);
});
