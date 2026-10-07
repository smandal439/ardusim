/**
 * test/serial_print.test.js — `Serial.print()` second-argument semantics.
 *
 * Arduino overloads that argument:
 *     print(double, int digits)   // "5.00"
 *     print(int,    int base)     // BIN/HEX/OCT/DEC
 * The interpreter only sees a JS number, so `Serial.print(x, 2)` and
 * `Serial.print(x, BIN)` both used to arrive as the bare value 2 and print
 * binary — e.g. the YF-S201 example's "5.00 L/min" came out as "101".
 *
 * The transpiler now routes an explicit `BIN` to `serialPrintBin()` before BIN
 * is folded to 2, leaving a small literal count as an unambiguous digit count.
 *
 * Run: npx vitest run test/serial_print.test.js
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/* ── Minimal browser-like globals for the transpiler (same as transpiler.test.js) ── */
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

const src = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'simulator.js'), 'utf8');
eval(src);

const libsDir = path.resolve(__dirname, '..', 'js', 'libraries');
for (const libFile of ['serial.js', 'wire.js']) {
  const p = path.join(libsDir, libFile);
  if (fs.existsSync(p)) eval(fs.readFileSync(p, 'utf8'));
}

const sim = new window.ArduinoSimulator();
const serial = window.ArduinoLibs['Serial'].runtime(sim);

/** Capture everything written by the print call under test. */
function printed() {
  const out = [];
  sim._serialLog = (m) => out.push(String(m));
  return out;
}

describe('Serial.print transpile — BIN vs digit count', () => {
  it('routes `Serial.print(x, BIN)` to serialPrintBin', () => {
    const js = sim.transpile('void setup() { Serial.begin(9600); }\nvoid loop() { int v = 84; Serial.print(v, BIN); }');
    expect(js).toContain('serialPrintBin(v)');
    // ...and must not leave a bare `2` behind for the generic formatter.
    expect(js).not.toMatch(/serialPrint\s*\([^)]*,\s*2\s*\)/);
  });

  it('routes `Serial.println(x, BIN)` to serialPrintlnBin', () => {
    const js = sim.transpile('void loop() { int v = 84; Serial.println(v, BIN); }');
    expect(js).toContain('serialPrintlnBin(v)');
  });

  it('leaves a literal digit count on the generic print path', () => {
    const js = sim.transpile('void loop() { float f = 2.5; Serial.print(f, 2); }');
    expect(js).toContain('serialPrint(f, 2)');
    expect(js).not.toContain('serialPrintBin');
  });

  it('does not let the BIN → 2 constant rewrite corrupt serialPrintBin', () => {
    const js = sim.transpile('void loop() { int v = 84; Serial.println(v, BIN); }');
    expect(js).not.toContain('serialPrintlnBin2');
    expect(js).toContain('serialPrintlnBin(v)');
  });
});

describe('Serial.print runtime — formatting', () => {
  it('treats a small literal as a decimal-digit count for whole numbers', () => {
    const out = printed();
    serial.serialPrint(5, 2);
    expect(out.join('')).toBe('5.00'); // Arduino prints "5.00", not "5"
  });

  it('formats non-whole numbers to the requested digits', () => {
    const out = printed();
    serial.serialPrint(2.53, 2);
    expect(out.join('')).toBe('2.53');
  });

  it('still prints binary for an explicit BIN argument', () => {
    const out = printed();
    serial.serialPrintBin(84);
    expect(out.join('')).toBe('1010100');
  });

  it('keeps HEX (16) and OCT (8) as radices', () => {
    let out = printed();
    serial.serialPrint(255, 16);
    expect(out.join('')).toBe('FF');

    out = printed();
    serial.serialPrint(8, 8);
    expect(out.join('')).toBe('10');
  });

  it('appends a newline from println', () => {
    const out = printed();
    serial.serialPrintln(0, 1);
    expect(out.join('')).toBe('0.0\n');
  });
});
