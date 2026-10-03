/**
 * test/tb6600_stepper.test.js — TB6600 driver + NEMA 17 rotation
 * Run: npx vitest run test/tb6600_stepper.test.js
 *
 * Guards the bug where `_a.tb6600Step()` was never awaited: the sketch raced
 * ahead and launched overlapping forward/reverse moves that cancelled each
 * other, so the motor shaft never visibly turned.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

/* ── Minimal browser-like globals for the transpiler ── */
global.window = {
  ArduinoLibs: {},
  CppTypes: {
    getTypePattern() {
      return 'void|bool|char|int|float|double|long|short|byte|boolean|unsigned|signed|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|ssize_t';
    },
    getFullTypeRegex() {
      const pat = this.getTypePattern();
      return new RegExp(`(?:const\\s+)?(?:unsigned\\s+)?(?:${pat})\\s*\\*?\\s*`, 'g');
    },
  },
  ArduinoComponents: { COMPONENT_DEFS: {} },
  CircuitCanvas: null,
};

const src = fs.readFileSync(path.join(ROOT, 'js', 'simulator.js'), 'utf8');
eval(src);
for (const f of ['serial.js', 'wire.js', 'tb6600.js']) {
  const p = path.join(ROOT, 'js', 'libraries', f);
  if (fs.existsSync(p)) eval(fs.readFileSync(p, 'utf8'));
}

const sim = new window.ArduinoSimulator();

const EXAMPLE = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'Examples', 'tb6600_stepper.json'), 'utf8'),
);
const SKETCH = EXAMPLE.code || EXAMPLE.files['sketch.ino'];

function freshSim() {
  const s = new window.ArduinoSimulator();
  s.isRunning = true;
  s.speed = 1;
  s.pinStates = {};
  s._serialLog = () => {};
  s._tb6600s = {};
  const emits = [];
  s._emitPinChange = (k, v) => { s.pinStates[k] = v; emits.push([k, v]); };
  s.onPinChange = () => {};
  const rt = window.ArduinoLibs['TB6600'].runtime(s);
  Object.assign(s, rt);
  s.emits = emits;
  return s;
}

describe('TB6600 — transpile of the example sketch', () => {
  const js = sim.transpile(SKETCH);

  it('awaits the blocking step() call', () => {
    expect(js).toMatch(/await\s+_a\.tb6600Step\(/);
    expect(js).not.toMatch(/await\s+await/);
  });

  it('does not rewrite the wiring comments as constructors', () => {
    expect(js).toContain('TB6600 PUL (Pulse)');
    expect(js).toContain('TB6600 DIR (Direction)');
    expect(js).toContain('TB6600 ENA (Enable)');
  });

  it('transpiles the driver constructor', () => {
    expect(js).toMatch(/var stepper = _a\.tb6600New\(PUL_PIN, DIR_PIN, ENA_PIN\)/);
    expect(js).not.toContain('TB6600 stepper(');
  });

  it('activates the TB6600 plugin via its include guard', () => {
    expect(window.ArduinoLibs['TB6600'].includes).toContain('<TB6600.h>');
    expect(SKETCH).toContain('#include <TB6600.h>');
  });

  it('resetting the simulator clears stale driver state', () => {
    expect(src).toMatch(/this\._steppers = \{\};\s*\n\s*this\._tb6600s = \{\};/);
  });
});

describe('TB6600 — example circuit wiring', () => {
  const by = (id) => EXAMPLE.circuit.components.find((c) => c.id === id);
  const wire = (from, to) => EXAMPLE.circuit.wires.some(
    (w) => w.from.instId === from && w.to.instId === to,
  );

  it('contains the Arduino, driver and motor', () => {
    expect(by('b1').type).toBe('arduino_uno');
    expect(by('tb1').type).toBe('tb6600');
    expect(by('m1').type).toBe('nema17');
  });

  it('routes PUL/DIR/ENA from D2/D3/D4 and both grounds', () => {
    expect(wire('b1', 'tb1')).toBe(true);
    for (const pin of ['PUL', 'DIR', 'ENA', 'GND']) {
      expect(EXAMPLE.circuit.wires.some(
        (w) => w.from.instId === 'b1' && w.to.instId === 'tb1' && w.to.pinId === pin,
      )).toBe(true);
    }
  });

  it('links all four motor phases', () => {
    for (const pin of ['A+', 'A-', 'B+', 'B-']) {
      expect(EXAMPLE.circuit.wires.some(
        (w) => w.from.instId === 'tb1' && w.to.instId === 'm1' && w.to.pinId === pin,
      )).toBe(true);
    }
  });
});

describe('TB6600 — runtime rotation', () => {
  it('rotates a full turn forward and back', async () => {
    const s = freshSim();
    s._delayPromise = () => Promise.resolve();

    const drv = s.tb6600New(2, 3, 4);
    s.tb6600Begin(drv);
    s.tb6600SetMicrostep(drv, 16);
    s.tb6600SetSpeed(drv, 200);
    const d = s._tb6600s[drv._tb6600Id];

    await s.tb6600Step(drv, 3200);
    expect(d.position).toBe(3200);
    expect(d.angle).toBeCloseTo(360, 0);
    expect(s.pinStates['pin_3']).toBe(1);

    // DIR is a digital pin: 1 = clockwise, 0 = counter-clockwise.
    await s.tb6600Step(drv, -3200);
    expect(d.position).toBe(0);
    expect(d.angle).toBeCloseTo(0, 0);
    expect(s.pinStates['pin_3']).toBe(0);
  });

  it('emits a real square wave on the PUL pin', async () => {
    const s = freshSim();
    s._delayPromise = () => Promise.resolve();

    const drv = s.tb6600New(2, 3, 4);
    s.tb6600Begin(drv);
    s.tb6600SetMicrostep(drv, 16);
    s.tb6600SetSpeed(drv, 200);
    await s.tb6600Step(drv, 400);

    const pul = s.emits.filter(([k]) => k === 'pin_2');
    expect(pul.length).toBeGreaterThan(2);
    expect(pul.some(([, v]) => v === 1)).toBe(true);
    expect(pul.some(([, v]) => v === 0)).toBe(true);
    expect(s.pinStates['pin_2']).toBe(0);
  });

  it('paces the animation from the RPM passed to setSpeed()', async () => {
    const measured = async (rpm) => {
      const s = freshSim();
      let total = 0;
      s._delayPromise = (ms) => { total += ms; return Promise.resolve(); };
      const drv = s.tb6600New(2, 3, 4);
      s.tb6600Begin(drv);
      s.tb6600SetMicrostep(drv, 16);
      s.tb6600SetSpeed(drv, rpm);
      await s.tb6600Step(drv, 3200);
      return total;
    };

    // 3200 micro-steps at 200 RPM => 1 ms each => ~3.2 s of animation.
    expect(await measured(200)).toBeGreaterThan(2800);
    expect(await measured(200)).toBeLessThan(4000);
    // 600 RPM => three times faster.
    expect(await measured(600)).toBeGreaterThan(800);
    expect(await measured(600)).toBeLessThan(1600);
  });

  it('runs the example sketch end to end', async () => {
    const s = freshSim();
    s._delayPromise = () => Promise.resolve();

    const js = s.transpile(SKETCH);
    const api = Object.assign({}, window.ArduinoLibs['TB6600'].runtime(s), {
      delay: () => Promise.resolve(),
      serialBegin: () => {},
      serialPrint: () => {},
      serialPrintln: () => {},
    });
    const sketch = new Function('_a', `${js}\nreturn { setup, loop };`)(api);
    await sketch.setup();
    await sketch.loop();

    const d = Object.values(s._tb6600s)[0];
    expect(d).toBeTruthy();
    expect(d.position).toBe(3200);
    expect(d.angle).toBeCloseTo(360, 0);
  });
});
