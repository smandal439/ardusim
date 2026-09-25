/**
 * test/avr_registers.test.js — AVR register-sketch support:
 *   - DDRx/PORTx/PINx rewrites -> _a.avr* runtime helpers
 *   - Arduino binary.h constants (B00100000 -> 0b00100000)
 *   - avr/io.h bit macros (PB5/DDB5/PINC3), _BV(n), cli()/sei()
 * Run: npx vitest run test/avr_registers.test.js
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/* ── Minimal browser-like globals (same pattern as test/transpiler.test.js) ── */
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

const ROOT = path.resolve(__dirname, '..');
eval(fs.readFileSync(path.join(ROOT, 'js', 'simulator.js'), 'utf8'));

const libsDir = path.join(ROOT, 'js', 'libraries');
for (const libFile of ['serial.js', 'wire.js']) {
  const libPath = path.join(libsDir, libFile);
  if (fs.existsSync(libPath)) eval(fs.readFileSync(libPath, 'utf8'));
}

const sim = new window.ArduinoSimulator();

const resetPins = () => {
  sim.pinStates = {};
  sim.pinModes = {};
  sim._avrState = null;
};

describe('transpile() — AVR binary constants', () => {
  it('converts B00100000 to a JS binary literal', () => {
    const out = sim.transpile('void setup() { DDRB = B00100000; }');
    expect(out).toContain('0b00100000');
    expect(out).not.toMatch(/\bB00100000\b/);
  });

  it('converts short macros like B101', () => {
    const out = sim.transpile('void setup() { int x = B101; }');
    expect(out).toContain('0b101');
    expect(out).not.toMatch(/\bB101\b/);
  });

  it('leaves variables the sketch declares (int B10) alone', () => {
    const out = sim.transpile('int B10 = 3;\nvoid setup() { int x = B10; }');
    expect(out).toContain('B10 = 3');
    expect(out).toContain('let x = B10');
    expect(out).not.toContain('0b10');
  });

  it('leaves binary-looking text inside strings and comments alone', () => {
    const out = sim.transpile('void setup() { Serial.println("B00100000"); // B111\n }');
    expect(out).toContain('"B00100000"');
    expect(out).toContain('// B111');
  });
});

describe('transpile() — AVR register rewrites', () => {
  it('DDRB = expr -> _a.avrWriteDdr', () => {
    const out = sim.transpile('void setup() { DDRB = B00100000; }');
    expect(out).toContain('_a.avrWriteDdr("B", (0b00100000))');
  });

  it('PORTB = expr -> _a.avrWritePort', () => {
    const out = sim.transpile('void setup() { PORTB = B00100000; }');
    expect(out).toContain('_a.avrWritePort("B", (0b00100000))');
  });

  it('compound PORTB |= x -> write(read op x)', () => {
    const out = sim.transpile('void setup() { PORTB |= (1 << 5); }');
    expect(out).toContain('_a.avrWritePort("B", (_a.avrReadPort("B") | ((1 << 5))))');
    expect(out).not.toMatch(/\bPORTB\b/);
  });

  it('rewrites reads of PINB / DDRB / PORTB', () => {
    const out = sim.transpile('void setup() { uint8_t v = PINB; int d = DDRB; int p = PORTB; }');
    expect(out).toContain('_a.avrReadPin("B")');
    expect(out).toContain('_a.avrReadDdr("B")');
    expect(out).toContain('_a.avrReadPort("B")');
    expect(out).not.toMatch(/\bPINB\b|\bDDRB\b|\bPORTB\b/);
  });

  it('maps PORTD -> port D and PORTC -> port C', () => {
    const out = sim.transpile('void setup() { DDRD = 0xFF; PORTC = 0x3F; }');
    expect(out).toContain('_a.avrWriteDdr("D", (0xFF))');
    expect(out).toContain('_a.avrWritePort("C", (0x3F))');
  });

  it('rewrites PORTB++ / ++PORTB', () => {
    const out = sim.transpile('void setup() { PORTB++; ++PORTB; }');
    expect(out).not.toMatch(/\bPORTB\b/);
    expect(out).toContain('_a.avrWritePort("B", (_a.avrReadPort("B") + 1))');
  });

  it('keeps register names inside strings and comments literal', () => {
    const out = sim.transpile('void setup() { Serial.println("PORTB = 5"); // PORTB comment\n }');
    expect(out).toContain('"PORTB = 5"');
    expect(out).toContain('// PORTB comment');
    expect(out).not.toContain('avrWritePort');
    expect(out).not.toContain('avrReadPort');
  });

  it('converts bit-number macros and _BV', () => {
    const out = sim.transpile('void setup() { if (PINB & (1 << PB5)) { PORTB |= _BV(0); } }');
    expect(out).toContain('(1 << 5)');
    expect(out).toContain('(1 << (0))');
    expect(out).not.toMatch(/\bPB5\b/);
    expect(out).toContain('_a.avrReadPin("B")');
  });

  it('maps cli()/sei() onto the Arduino interrupt APIs', () => {
    const out = sim.transpile('void setup() { cli(); sei(); }');
    expect(out).toContain('_a.noInterrupts(');
    expect(out).toContain('_a.interrupts(');
    expect(out).not.toMatch(/\bcli\s*\(/);
    expect(out).not.toMatch(/\bsei\s*\(/);
  });
});

describe('AVR register runtime', () => {
  it('DDRx/PORTx drive the Uno pin map (B -> D8-D13)', () => {
    resetPins();
    const A = sim.buildContext()._a;
    A.avrWriteDdr('B', 0b00100000);
    expect(sim.pinModes['pin_13']).toBe('OUTPUT');
    expect(sim.pinModes['pin_8']).toBe('INPUT');
    A.avrWritePort('B', 0b00100000);
    expect(sim.pinStates['pin_13']).toBe(1);
    A.avrWritePort('B', 0);
    expect(sim.pinStates['pin_13']).toBe(0);
    expect(A.avrReadPort('B')).toBe(0);
    expect(A.avrReadDdr('B')).toBe(0b00100000);
    expect(A.avrReadPin('B') & 0b00100000).toBe(0);
    A.avrTogglePort('B', 0b00100000);
    expect(sim.pinStates['pin_13']).toBe(1);
    expect(A.avrReadPin('B') & 0b00100000).toBe(32);
  });

  it('PORTD maps to D0-D7 and PORTC to A0-A5 (D14-D19)', () => {
    resetPins();
    const A = sim.buildContext()._a;
    A.avrWriteDdr('D', 0xFF);
    A.avrWritePort('D', 0b10101010);
    expect(sim.pinStates['pin_0']).toBe(0);
    expect(sim.pinStates['pin_1']).toBe(1);
    expect(sim.pinStates['pin_6']).toBe(0);
    expect(sim.pinStates['pin_7']).toBe(1);
    A.avrWriteDdr('C', 0x3F);
    A.avrWritePort('C', 0x01);
    expect(sim.pinModes['pin_14']).toBe('OUTPUT');
    expect(sim.pinStates['pin_14']).toBe(1);
    expect(sim.pinStates['pin_15']).toBe(0);
    // Nano A6/A7 are not on PORTC
    expect(sim.pinModes['pin_20']).toBeUndefined();
    expect(sim.pinModes['pin_21']).toBeUndefined();
  });

  it('input-direction bits follow the PORTx latch as pull-ups', () => {
    resetPins();
    const A = sim.buildContext()._a;
    A.avrWriteDdr('B', 0);          // all input
    A.avrWritePort('B', 0b00000001); // PB0 pull-up on, rest off
    expect(sim.pinModes['pin_8']).toBe('INPUT_PULLUP');
    expect(sim.pinModes['pin_9']).toBe('INPUT');
    expect(sim.pinModes['pin_13']).toBe('INPUT');
  });

  it('compiles and runs a register-style blink sketch', async () => {
    resetPins();
    const sketch = `
void setup() {
  DDRB = B00100000;
  PORTB = B00100000;
}
void loop() {
  PORTB = 0;
}
`;
    const res = await sim.compile(sketch);
    expect(res.ok, res.error).toBe(true);
    const { fn, vals } = sim._compiledCtx;
    const { setup, loop } = fn(...vals);
    await setup();
    expect(sim.pinModes['pin_13']).toBe('OUTPUT');
    expect(sim.pinStates['pin_13']).toBe(1);
    await loop();
    expect(sim.pinStates['pin_13']).toBe(0);
  });
});
