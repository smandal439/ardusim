/**
 * test/intel8051_squarewave.test.js — 8051 square-wave example regression
 * Covers: RLC/RR/RRC fixes, XCH A,direct, CJNE A,@Ri, parity flag,
 * MOV C,<bit> encoding, end-to-end 1 kHz example frequency, emulated-time
 * simTime bookkeeping used by the logic analyzer.
 * Run: node node_modules/vitest/vitest.mjs run test/intel8051_squarewave.test.js
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

global.window = {};

const root = path.resolve(__dirname, '..');
beforeAll(() => {
  eval(fs.readFileSync(path.join(root, 'js/libraries/intel8051_emulator.js'), 'utf8'));
  eval(fs.readFileSync(path.join(root, 'js/libraries/intel8051_assembler.js'), 'utf8'));
  eval(fs.readFileSync(path.join(root, 'js/libraries/intel8051_c.js'), 'utf8'));
});

const CY = 0x80;

function run(bytes, init) {
  const c = new window.Intel8051Emulator();
  if (init) init(c);
  c.load(bytes, 0);
  c.PC = 0;
  for (let i = 0; i < bytes.length + 2; i++) {
    const pc = c.PC;
    c.step();
    if (c.PC === pc) break;
  }
  return c;
}

describe('emulator bit ops (regression: square wave stuck)', () => {
  it('RLC A shifts carry in from bit 7', () => {
    let c = run([0x33], (c) => { c.ACC = 0; c.PSW |= CY; });
    expect(c.ACC).toBe(1);
    expect(c.PSW & CY ? 1 : 0).toBe(0);
    c = run([0x33], (c) => { c.ACC = 0x80; c.PSW &= ~CY; });
    expect(c.ACC).toBe(0);
    expect(c.PSW & CY ? 1 : 0).toBe(1);
  });

  it('RR A rotates right (regression: was rotating left)', () => {
    expect(run([0x03], (c) => { c.ACC = 0x81; }).ACC).toBe(0xC0);
    expect(run([0x03], (c) => { c.ACC = 0x01; }).ACC).toBe(0x80);
  });

  it('RRC A moves bit 0 into carry and old carry into bit 7', () => {
    let c = run([0x13], (c) => { c.ACC = 0x01; c.PSW &= ~CY; });
    expect(c.ACC).toBe(0);
    expect(c.PSW & CY ? 1 : 0).toBe(1);
    c = run([0x13], (c) => { c.ACC = 0x00; c.PSW |= CY; });
    expect(c.ACC).toBe(0x80);
    expect(c.PSW & CY ? 1 : 0).toBe(0);
  });

  it('bit-load idiom (MOV A,#0; MOV C,bit; RLC A) reads a port bit', () => {
    expect(run([0x74, 0x00, 0xA2, 0x90, 0x33], (c) => { c.P1 = 0x01; }).ACC).toBe(1);
    expect(run([0x74, 0x00, 0xA2, 0x90, 0x33], (c) => { c.P1 = 0x00; }).ACC).toBe(0);
  });
});

describe('emulator missing opcodes', () => {
  it('XCH A,direct (0xC5) swaps ACC with the direct byte and advances PC', () => {
    const c = new window.Intel8051Emulator();
    c.load([0xC5, 0x20], 0);
    c.PC = 0;
    c.ACC = 0x5A;
    c.ram[0x20] = 0x33;
    c.step();
    expect(c.ACC).toBe(0x33);
    expect(c.ram[0x20]).toBe(0x5A);
    expect(c.PC).toBe(2);
  });

  it('CJNE A,@R0,#data (0xB6) jumps when not equal and sets CY correctly', () => {
    let c = new window.Intel8051Emulator();
    c.load([0xB6, 0x10, 0x05], 0);
    c.PC = 0;
    c.ACC = 5;
    c._rW(0, 0x30);
    c.ram[0x30] = 0x0C;
    c.step();
    expect(c.PC).toBe(8); // 3 + rel 5
    expect(c.PSW & CY ? 1 : 0).toBe(1); // 5 < 12

    c = new window.Intel8051Emulator();
    c.load([0xB7, 0x10, 0x05], 0);
    c.PC = 0;
    c.ACC = 0x10;
    c._rW(1, 0x40);
    c.ram[0x40] = 0x10;
    c.step();
    expect(c.PC).toBe(3); // equal -> no jump
    expect(c.PSW & CY ? 1 : 0).toBe(0);
  });
});

describe('parity flag', () => {
  it('PSW.P = 1 when ACC holds an odd number of 1-bits', () => {
    const p = (acc) => run([0x74, acc], () => {}).PSW & 0x01;
    expect(p(0x00)).toBe(0);
    expect(p(0x03)).toBe(0);
    expect(p(0x01)).toBe(1);
    expect(p(0xFF)).toBe(0);
    expect(p(0x7F)).toBe(1);
  });
});

describe('assembler carry-bit MOV (regression: wait loop hung)', () => {
  it('MOV C,<bit> encodes as A2 <bit>', () => {
    const a = window.Intel8051Assembler.assemble('MOV C, 141\n  END');
    expect(a.errors || []).toEqual([]);
    expect(a.code[0]).toBe(0xA2);
    expect(a.code[1]).toBe(141);
  });

  it('MOV <bit>,C encodes as 92 <bit>', () => {
    const a = window.Intel8051Assembler.assemble('MOV 144, C\n  END');
    expect(a.errors || []).toEqual([]);
    expect(a.code[0]).toBe(0x92);
    expect(a.code[1]).toBe(144);
  });
});

function compileExample() {
  const ex = JSON.parse(fs.readFileSync(path.join(root, 'Examples/8051_1khz_squarewave.json'), 'utf8'));
  const cr = window.Intel8051C.compile(ex.files['sketch.c']);
  expect(cr.error).toBeUndefined();
  const a = window.Intel8051Assembler.assemble(cr.asm);
  expect(a.errors || []).toEqual([]);
  const bytes = [];
  for (const k in a.code) bytes.push(a.code[k] & 0xFF);
  return bytes;
}

describe('Examples/8051_1khz_squarewave.json', () => {
  it('toggles P1.0 continuously (regression: output stuck HIGH)', () => {
    const cpu = new window.Intel8051Emulator();
    cpu.load(compileExample(), 0);
    let last = -1;
    const transitions = [];
    for (let i = 0; i < 4000000 && transitions.length < 7; i++) {
      cpu.step();
      const p10 = cpu.P1 & 1;
      if (p10 !== last) {
        if (last !== -1) transitions.push(cpu.cycles);
        last = p10;
      }
    }
    expect(transitions.length).toBeGreaterThanOrEqual(6);
    // Polling-loop quantization: half periods are 493/495 cycles (~1.01 kHz).
    for (let i = 1; i < transitions.length; i++) {
      const half = transitions[i] - transitions[i - 1];
      expect(half).toBeGreaterThanOrEqual(480);
      expect(half).toBeLessThanOrEqual(510);
    }
    // Rising-edge-to-rising-edge ≈ 988 cycles ≈ 1012 Hz at 12 MHz.
    const period = transitions[2] - transitions[0];
    const freq = 1000000 / period;
    expect(freq).toBeGreaterThan(1000);
    expect(freq).toBeLessThan(1025);
  });
});

describe('emulated-time simTime (logic analyzer timebase)', () => {
  function makeRuntime(bytes) {
    global.window.CircuitCanvas = { getBoardInst: () => null };
    eval(fs.readFileSync(path.join(root, 'js/libraries/intel8051.js'), 'utf8'));
    const lib = window.ArduinoLibs['Intel8051'];
    const self = { simTime: 0, _emitPinChange: null };
    const rt = lib.runtime(self);
    expect(rt._init8051(null, String.fromCharCode.apply(null, bytes))).toBe(true);
    return { rt, self };
  }

  it('advances simTime at emulated ms (sub-ms resolution per batch)', () => {
    const { rt, self } = makeRuntime(compileExample());
    expect(rt._step8051()).toBe(true);
    expect(self.simTime).toBeGreaterThan(0);
    expect(self.simTime).toBeLessThan(1); // ~14 cycles = 0.014 ms
  });

  it('is deterministic and reaches 1 ms in a bounded number of batches', () => {
    const { rt, self } = makeRuntime(compileExample());
    let batches = 0;
    while (self.simTime < 1 && batches < 100000) {
      rt._step8051();
      batches++;
    }
    expect(self.simTime).toBeGreaterThanOrEqual(1);
    expect(self.simTime).toBeLessThan(2);
    expect(batches).toBeLessThan(100000);
  });
});
