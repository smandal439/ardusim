/**
 * test/push_button_mode.test.js — Momentary vs Latching action for the push button.
 *
 * A real tactile switch is momentary: its contacts are only closed while your
 * finger is on it. The simulator historically always behaved like a latching
 * (stay-in) switch, so that stays the default — but the properties panel now
 * offers an Action select that switches the button between the two.
 *
 * Run: npx vitest run test/push_button_mode.test.js
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ── Minimal browser-like globals (same pattern as test/slide_switch.test.js) ── */
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
  querySelectorAll: () => [],
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

/** Uno D2 -> button leg 1, leg 2 -> 5 V rail, leg 3 -> GND rail.
 *  Released: leg 1 only reaches leg 2 (5 V, so D2 reads HIGH).
 *  Pressed : leg 1 reaches leg 3 (GND, so D2 reads LOW). */
function buildRig() {
  const { canvasEl, wrapperEl } = makeCanvasStub();
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  const comp = (id, type, x, y, props) => ({ id, type, x, y, props: props || {}, runtimeState: {} });
  cc.components = [
    comp('u1', 'arduino_uno', 60, 40, { label: 'UNO' }),
    comp('b1', 'push_button', 400, 200, { label: 'BTN', mode: 'latching' }),
    comp('p5', 'power_5v', 640, 200),
    comp('pg', 'power_gnd', 640, 300),
  ];
  cc.wires = [
    { id: 'w1', from: { instId: 'u1', pinId: 'D2' }, to: { instId: 'b1', pinId: 'p1' } },
    { id: 'w2', from: { instId: 'b1', pinId: 'p2' }, to: { instId: 'p5', pinId: 'vcc' } },
    { id: 'w3', from: { instId: 'b1', pinId: 'p3' }, to: { instId: 'pg', pinId: 'gnd' } },
  ];

  const sim = new ArduinoSimulator();
  global.window.ArduinoSim = sim;
  global.window.CircuitCanvas = cc;
  // Keep undo-history / dirty-flag side effects out of these focused tests.
  cc._pushHistory = () => {};
  cc._onChanged = () => {};
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

const on = (cc, id) => cc.components.find(c => c.id === id);

/** A synthetic pointer-down at the centre of a component (never on one of its pins). */
function downAt(cc, inst) {
  return {
    offsetX: (inst.x + 20) * cc.zoom + cc.panX,
    offsetY: (inst.y + 20) * cc.zoom + cc.panY,
    clientX: 0, clientY: 0,
    button: 0, altKey: false, shiftKey: false, ctrlKey: false, metaKey: false,
    preventDefault() {},
  };
}
const upEvt = () => ({ button: 0, preventDefault() {} });
const keyEvt = (key) => ({ key, target: null, repeat: false, preventDefault() {} });

/** Every "L=<digit>" reading in the serial stream, in order. */
function levels(logs) {
  const text = Array.isArray(logs) ? logs.join('') : logs;
  return (text.match(/L=\d/g) || []).map(s => Number(s.slice(2)));
}

const SKETCH = `void setup() {
  pinMode(2, INPUT_PULLUP);
  Serial.begin(9600);
}
void loop() {
  Serial.print("L=");
  Serial.println(digitalRead(2));
  delay(50);
}`;

describe('Push Button — Momentary / Latching action', () => {
  let cc, sim, frame;

  beforeEach(() => {
    ({ cc, sim } = buildRig());
    frame = setInterval(() => cc.updateSimState(sim.pinStates), 16);
  });

  afterEach(() => {
    clearInterval(frame);
    sim.stop();
    global.window.ArduinoSim = null;
    global.window.CircuitCanvas = null;
  });

  /* ── Property ─────────────────────────────────────────────────── */

  it('exposes an Action select offering both momentary and latching', () => {
    const def = COMPONENT_DEFS.push_button;
    expect(def.defaultProps.mode).toBe('latching');

    const ctrl = def.interactive.find(c => c.field === 'mode');
    expect(ctrl).toBeTruthy();
    expect(ctrl.type).toBe('select');
    expect(ctrl.options.map(o => o.value)).toEqual(['momentary', 'latching']);

    // Selects live in the properties panel only — they must not become an
    // on-canvas widget that would swallow clicks meant for the button.
    expect(cc._getInteractiveRects(on(cc, 'b1'))).toEqual([]);

    expect(readSrc('js/guide.js')).toContain("mode: 'Action. Momentary");
    expect(readSrc('js/guide.js')).toContain('Momentary (hold to press) or Latching (click to toggle)');
  });

  it('treats an unset mode as latching (backwards compatible)', () => {
    const b1 = on(cc, 'b1');
    expect(cc._isMomentaryButton(b1)).toBe(false);

    b1.props.mode = 'momentary';
    expect(cc._isMomentaryButton(b1)).toBe(true);

    // Also honoured from runtimeState, as written by the properties modal.
    delete b1.props.mode;
    b1.runtimeState.mode = 'momentary';
    expect(cc._isMomentaryButton(b1)).toBe(true);

    expect(cc._isMomentaryButton({ type: 'slide_switch' })).toBe(false);
    expect(cc._isMomentaryButton({ type: 'push_button' })).toBe(false);
    expect(cc._isMomentaryButton(null)).toBe(false);
  });

  /* ── Pointer interaction ──────────────────────────────────────── */

  it('latching: each click toggles and the state survives the mouseup', () => {
    const b1 = on(cc, 'b1');

    cc._onMouseDown(downAt(cc, b1));
    expect(b1.runtimeState.pressed).toBe(true);
    cc._onMouseUp(upEvt());
    expect(b1.runtimeState.pressed).toBe(true); // still closed

    cc._onMouseDown(downAt(cc, b1));
    expect(b1.runtimeState.pressed).toBe(false);
    cc._onMouseUp(upEvt());
    expect(b1.runtimeState.pressed).toBe(false);
    expect(cc._pointerHeldButton).toBeNull();
  });

  it('momentary: closes on pointer-down and reopens on pointer-up', () => {
    const b1 = on(cc, 'b1');
    b1.props.mode = 'momentary';

    cc._onMouseDown(downAt(cc, b1));
    expect(b1.runtimeState.pressed).toBe(true);
    expect(cc._pointerHeldButton).toBe(b1);

    cc._onMouseUp(upEvt());
    expect(b1.runtimeState.pressed).toBe(false);
    expect(cc._pointerHeldButton).toBeNull();
  });

  it('momentary: opens even when the pointer is released off the canvas', () => {
    const b1 = on(cc, 'b1');
    b1.props.mode = 'momentary';

    cc._onMouseDown(downAt(cc, b1));
    expect(b1.runtimeState.pressed).toBe(true);

    // The canvas never receives that mouseup, so the document-level safety net
    // has to let go of it.
    cc._releasePointerHeldButton();
    expect(b1.runtimeState.pressed).toBe(false);
    expect(cc._pointerHeldButton).toBeNull();
  });

  it('does not press the button when the drag was a component move', () => {
    const b1 = on(cc, 'b1');
    b1.props.mode = 'momentary';

    cc._onMouseDown(downAt(cc, b1));
    cc.dragging.moved = true; // user dragged the button somewhere else
    cc._onMouseUp(upEvt());
    expect(b1.runtimeState.pressed).toBe(false);
  });

  /* ── Keyboard interaction ─────────────────────────────────────── */

  it('keyboard: latching toggles on each press of Space/Enter', () => {
    const b1 = on(cc, 'b1');
    cc.selected = b1;

    cc._onKeyDown(keyEvt(' '));
    expect(b1.runtimeState.pressed).toBe(true);
    cc._onKeyDown(keyEvt('Enter'));
    expect(b1.runtimeState.pressed).toBe(false);
    cc._onKeyUp(keyEvt(' '));
    expect(b1.runtimeState.pressed).toBe(false);
    expect(cc._keyHeldButton).toBeUndefined();
  });

  it('keyboard: momentary is closed only while the key is held', () => {
    const b1 = on(cc, 'b1');
    b1.props.mode = 'momentary';
    cc.selected = b1;

    cc._onKeyDown(keyEvt(' '));
    expect(b1.runtimeState.pressed).toBe(true);
    expect(cc._keyHeldButton).toBe(b1);

    cc._onKeyUp(keyEvt(' '));
    expect(b1.runtimeState.pressed).toBe(false);
    expect(cc._keyHeldButton).toBeNull();
  });

  /* ── Electrical ───────────────────────────────────────────────── */

  it('closes the internal contacts in both directions', () => {
    const b1 = on(cc, 'b1');
    cc.updateSimState(sim.pinStates);

    expect(cc.engine._getInternalConnections(b1))
      .toEqual([['b1:p1', 'b1:p2'], ['b1:p3', 'b1:p4']]);
    expect(cc.engine.measureResistance('u1', 'D2', 'pg', 'gnd')).toBe(Infinity);

    b1.runtimeState.pressed = true;
    expect(cc.engine._getInternalConnections(b1))
      .toEqual([['b1:p1', 'b1:p3'], ['b1:p2', 'b1:p4']]);
    expect(cc.engine.measureResistance('u1', 'D2', 'pg', 'gnd')).toBe(0);
  });

  it('reads the level through the switch in _readDigitalInput', () => {
    const b1 = on(cc, 'b1');
    // Released: leg 1 only reaches leg 2, which is tied to 5 V.
    expect(cc._readDigitalInput('u1', 'D2')).toBe(1);
    // Pressed: leg 1 now reaches leg 3, which lands on the GND rail.
    b1.runtimeState.pressed = true;
    expect(cc._readDigitalInput('u1', 'D2')).toBe(0);
    b1.runtimeState.pressed = false;
    expect(cc._readDigitalInput('u1', 'D2')).toBe(1);
  });

  /* ── End to end ───────────────────────────────────────────────── */

  it('feeds the running sketch through both actions', async () => {
    const logs = [];
    const errors = [];
    sim._serialLog = (m) => logs.push(String(m));
    sim.onError = (msg) => errors.push(msg);
    const b1 = on(cc, 'b1');

    const runPromise = sim.run(SKETCH);
    runPromise.catch(() => {});
    expect(await waitFor(() => sim.isRunning, 3000)).toBe(true);

    try {
      expect(await waitFor(() => sim.pinModes['pin_2'] === 'INPUT_PULLUP', 2000)).toBe(true);
      expect(await waitFor(() => sim.pinStates['pin_2'] === 1, 3000)).toBe(true);

      // --- Latching (default): a full click leaves it closed ---
      cc._onMouseDown(downAt(cc, b1));
      cc._onMouseUp(upEvt());
      expect(await waitFor(() => sim.pinStates['pin_2'] === 0, 3000)).toBe(true);
      await new Promise(r => setTimeout(r, 150)); // give the sketch time to sample it
      expect(levels(logs)).toContain(0);

      cc._onMouseDown(downAt(cc, b1));
      cc._onMouseUp(upEvt());
      expect(await waitFor(() => sim.pinStates['pin_2'] === 1, 3000)).toBe(true);
      await new Promise(r => setTimeout(r, 150));
      expect(levels(logs)).toContain(1);

      // --- Momentary: only while the pointer is held ---
      b1.props.mode = 'momentary';
      const before = levels(logs.join('')).length;
      cc._onMouseDown(downAt(cc, b1));
      expect(await waitFor(() => sim.pinStates['pin_2'] === 0, 3000)).toBe(true);
      await new Promise(r => setTimeout(r, 150));
      const held = levels(logs.join(''));
      expect(held.length).toBeGreaterThan(before);
      expect(held[held.length - 1]).toBe(0);

      cc._onMouseUp(upEvt());
      expect(await waitFor(() => sim.pinStates['pin_2'] === 1, 3000)).toBe(true);
      await new Promise(r => setTimeout(r, 150));
      expect(levels(logs)).toContain(1);
      expect(errors).toEqual([]);
    } finally {
      sim.stop();
    }
  }, 20000);
});
