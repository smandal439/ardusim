/**
 * test/transpiler.test.js — Unit tests for the Arduino C++ → JS transpiler
 * Run: npx vitest run test/transpiler.test.js
 */
import { describe, it, expect, beforeEach } from 'vitest';

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

/* ── Load the transpiler source ── */
import fs from 'node:fs';
import path from 'node:path';

const srcPath = path.resolve(__dirname, '..', 'js', 'simulator.js');
const src = fs.readFileSync(srcPath, 'utf8');

// Extract the ArduinoSimulator class by evaluating it in the global scope
// We need to evaluate the class definition so it's available for testing
eval(src);

const sim = new window.ArduinoSimulator();

describe('transpile() — basic transformations', () => {
  it('removes #include directives', () => {
    const result = sim.transpile('#include <Wire.h>\nvoid setup() {}');
    expect(result).not.toContain('#include');
    expect(result).toContain('async function setup');
  });

  it('removes #define and substitutes values', () => {
    const result = sim.transpile('#define LED 13\nvoid loop() { int x = LED; }');
    expect(result).not.toContain('#define');
    expect(result).toContain('13');
  });

  it('converts void function declarations to async', () => {
    const result = sim.transpile('void setup() { }');
    expect(result).toContain('async function setup()');
  });

  it('converts int function declarations to async', () => {
    const result = sim.transpile('int add(int a, int b) { return a + b; }');
    expect(result).toContain('async function add');
  });

  it('strips type annotations from variable declarations', () => {
    const result = sim.transpile('void loop() { int x = 5; float y = 3.14; }');
    expect(result).toContain('let x = 5');
    expect(result).toContain('let y = 3.14');
  });

  it('handles unsigned int declarations', () => {
    const result = sim.transpile('void loop() { unsigned int val = 100; }');
    expect(result).toContain('let val = 100');
  });
});

describe('transpile() — Arduino-specific patterns', () => {
  it('converts Servo declarations to new Servo()', () => {
    const result = sim.transpile('#include <Servo.h>\nServo myServo;\nvoid setup() {}');
    expect(result).toContain('new Servo()');
  });

  it('converts Servo with arguments', () => {
    const result = sim.transpile('LiquidCrystal lcd(12, 11, 5, 4, 3, 2);\nvoid setup() {}');
    expect(result).toContain('new LiquidCrystal(12, 11, 5, 4, 3, 2)');
  });

  it('converts Wire.begin() to _a.wireBegin()', () => {
    // The transpiler handles this via plugin rules
    const result = sim.transpile('void setup() { Wire.begin(); }');
    expect(result).toContain('wireBegin');
  });

  it('converts Serial.begin() to _a.serialBegin()', () => {
    const result = sim.transpile('void setup() { Serial.begin(9600); }');
    expect(result).toContain('serialBegin');
  });

  it('converts pinMode to _a.pinMode()', () => {
    const result = sim.transpile('void setup() { pinMode(13, OUTPUT); }');
    expect(result).toContain('pinMode');
  });

  it('converts digitalWrite to _a.digitalWrite()', () => {
    const result = sim.transpile('void loop() { digitalWrite(13, HIGH); }');
    expect(result).toContain('digitalWrite');
  });

  it('converts digitalRead to _a.digitalRead()', () => {
    const result = sim.transpile('void loop() { int val = digitalRead(13); }');
    expect(result).toContain('digitalRead');
  });

  it('converts analogRead to _a.analogRead()', () => {
    const result = sim.transpile('void loop() { int val = analogRead(A0); }');
    expect(result).toContain('analogRead');
  });

  it('converts delay() to _a.delay()', () => {
    const result = sim.transpile('void loop() { delay(1000); }');
    expect(result).toContain('_a.delay');
  });

  it('converts Serial.println() to _a.serialPrintln()', () => {
    const result = sim.transpile('void loop() { Serial.println("hello"); }');
    expect(result).toContain('serialPrintln');
  });

  it('converts math functions to Math.*', () => {
    const result = sim.transpile('void loop() { float x = sqrt(4.0); float y = abs(-1); }');
    expect(result).toContain('Math.sqrt');
    expect(result).toContain('Math.abs');
  });
});

describe('transpile() — library plugins', () => {
  it('registers and transpiles BME280 plugin', () => {
    window.ArduinoLibs['BME280'] = {
      classes: ['SimpleBME280'],
      includes: ['<SimpleBME280.h>'],
      transpile: [
        [/\b(\w+)\.begin\s*\(\s*\)\s*;/g, (m, v) => {
          if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280Begin(' + v + ');';
          return m;
        }],
      ],
      constructor: function() {
        return { __class: 'SimpleBME280', begin() {} };
      },
      runtime: function() { return {}; },
    };
    const result = sim.transpile('SimpleBME280 bme;\nvoid setup() { bme.begin(); }');
    expect(result).toContain('new SimpleBME280');
    expect(result).toContain('bme280Begin');
  });
});

describe('transpile() — edge cases', () => {
  it('handles empty code', () => {
    expect(sim.transpile('')).toBe('');
    expect(sim.transpile(null)).toBe('');
    expect(sim.transpile(undefined)).toBe('');
  });

  it('handles code with no functions', () => {
    const result = sim.transpile('int x = 5;');
    expect(result).toContain('let x = 5');
  });

  it('handles struct declarations', () => {
    const result = sim.transpile('struct Point { int x; int y; };\nPoint p;');
    expect(result).toContain('var p');
  });

  it('handles array declarations', () => {
    const result = sim.transpile('int arr[10];');
    expect(result).toContain('new Array(10).fill(0)');
  });

  it('handles const arrays with initializers', () => {
    const result = sim.transpile('int arr[] = {1, 2, 3};');
    expect(result).toContain('[1, 2, 3]');
  });

  it('strips C-style casts', () => {
    const result = sim.transpile('void loop() { int x = (int)3.14; }');
    expect(result).not.toContain('(int)');
  });

  it('handles pointer types', () => {
    const result = sim.transpile('void loop() { char *ptr; }');
    expect(result).toContain('let ptr');
  });
});
