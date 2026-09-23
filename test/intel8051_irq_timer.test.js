/**
 * test/intel8051_irq_timer.test.js — Timer ticking + interrupt controller
 * Run: node node_modules/vitest/vitest.mjs run test/intel8051_irq_timer.test.js
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

global.window = {};

const root = path.resolve(__dirname, '..');
beforeAll(() => {
  eval(fs.readFileSync(path.join(root, 'js/libraries/intel8051_emulator.js'), 'utf8'));
  eval(fs.readFileSync(path.join(root, 'js/libraries/intel8051_assembler.js'), 'utf8'));
});

function asm(code) {
  const r = window.Intel8051Assembler.assemble(code);
  expect(r.errors || []).toEqual([]);
  return Array.from(r.code);
}

function run(cpu, steps) {
  for (let i = 0; i < steps; i++) cpu.step();
}

describe('Timer modes', () => {
  it('mode 1 (16-bit) sets TF0 after overflow', () => {
    const cpu = new window.Intel8051Emulator();
    cpu.TMOD = 0x01;
    cpu.TH0 = 0xFF;
    cpu.TL0 = 0xFE;
    cpu.TCON |= 0x10;
    run(cpu, 3);
    expect(cpu.TCON & 0x20).toBeTruthy();
    expect(cpu.TH0).toBe(0x00);
    expect(cpu.TL0).toBe(0x01);
  });

  it('mode 2 (8-bit auto-reload) preserves TH0', () => {
    const cpu = new window.Intel8051Emulator();
    cpu.TMOD = 0x02;
    cpu.TH0 = 0xFC;
    cpu.TL0 = 0xFE;
    cpu.TCON |= 0x10;
    run(cpu, 4);
    expect(cpu.TCON & 0x20).toBeTruthy();
    expect(cpu.TH0).toBe(0xFC);
    expect(cpu.TL0).toBeLessThanOrEqual(0xFF);
  });

  it('TR0=0 means timer does not tick', () => {
    const cpu = new window.Intel8051Emulator();
    cpu.TMOD = 0x01;
    cpu.TH0 = 0x00;
    cpu.TL0 = 0x00;
    run(cpu, 10);
    expect(cpu.TL0).toBe(0x00);
    expect(cpu.TCON & 0x20).toBeFalsy();
  });

  it('mode 0 (13-bit) counts in TH0+TL0 low5', () => {
    const cpu = new window.Intel8051Emulator();
    cpu.TMOD = 0x00;
    cpu.TH0 = 0xFF;
    cpu.TL0 = 0x1F;
    cpu.TCON |= 0x10;
    run(cpu, 1);
    expect(cpu.TCON & 0x20).toBeTruthy();
    expect(cpu.TH0).toBe(0x00);
    expect(cpu.TL0).toBe(0x00);
  });
});

describe('Interrupt controller', () => {
  it('Timer0 interrupt vectors to 0x000B when EA|ET0|TF0', () => {
    const cpu = new window.Intel8051Emulator();
    const code = asm(`
      ORG 0000H
      LJMP MAIN
      ORG 000BH
      MOV A, #55H
      RETI
      ORG 0030H
    MAIN: SJMP $
    `);
    cpu.load(code);
    cpu.IE = 0x82;
    cpu.TCON = 0x10 | 0x20;
    cpu.TMOD = 0x01;
    cpu.PC = 0x0030;
    const retPC = cpu.PC;
    cpu.step();
    expect(cpu.PC).toBe(0x000B);
    expect(cpu.TCON & 0x20).toBeFalsy();
    expect(cpu._intPrioStack.length).toBe(1);
    expect(cpu.ram[cpu.SP]).toBe(retPC & 0xFF);
    run(cpu, 2);
    expect(cpu.ACC).toBe(0x55);
    expect(cpu.PC).toBe(retPC);
    expect(cpu._intPrioStack.length).toBe(0);
  });

  it('RET does not pop interrupt stack', () => {
    const cpu = new window.Intel8051Emulator();
    cpu._intPrioStack.push(0);
    cpu.SP = 0x07;
    cpu._push(0x12);
    cpu._push(0x34);
    cpu.xram[0] = 0x22;
    cpu.PC = 0;
    cpu.step();
    expect(cpu.PC).toBe(0x1234);
    expect(cpu._intPrioStack.length).toBe(1);
  });

  it('RETI pops interrupt stack', () => {
    const cpu = new window.Intel8051Emulator();
    cpu._intPrioStack.push(0);
    cpu.SP = 0x07;
    cpu._push(0x12);
    cpu._push(0x34);
    cpu.xram[0] = 0x32;
    cpu.PC = 0;
    cpu.step();
    expect(cpu.PC).toBe(0x1234);
    expect(cpu._intPrioStack.length).toBe(0);
  });

  it('high priority can interrupt low priority ISR', () => {
    const cpu = new window.Intel8051Emulator();
    cpu._intPrioStack.push(0);
    expect(cpu._irqAccept(1)).toBe(true);
    expect(cpu._irqAccept(0)).toBe(false);
  });

  it('high in service blocks everything', () => {
    const cpu = new window.Intel8051Emulator();
    cpu._intPrioStack.push(1);
    expect(cpu._irqAccept(1)).toBe(false);
    expect(cpu._irqAccept(0)).toBe(false);
  });

  it('nested stack [0,1] then RETI restores low-only blocking', () => {
    const cpu = new window.Intel8051Emulator();
    cpu._intPrioStack.push(0);
    cpu._intPrioStack.push(1);
    expect(cpu._irqAccept(0)).toBe(false);
    expect(cpu._irqAccept(1)).toBe(false);
    cpu._intPrioStack.pop();
    expect(cpu._irqAccept(0)).toBe(false);
    expect(cpu._irqAccept(1)).toBe(true);
  });

  it('EA=0 blocks all interrupts', () => {
    const cpu = new window.Intel8051Emulator();
    const code = asm(`
      ORG 0000H
      LJMP MAIN
      ORG 000BH
      MOV A, #01H
      RETI
      ORG 0030H
    MAIN: NOP
    `);
    cpu.load(code);
    cpu.PC = 0x0030;
    cpu.IE = 0x02;
    cpu.TCON |= 0x20;
    cpu.step();
    expect(cpu.PC).toBe(0x0031);
    expect(cpu._intPrioStack.length).toBe(0);
  });

  it('serial interrupt fires on TI and does not auto-clear TI', () => {
    const cpu = new window.Intel8051Emulator();
    const code = asm(`
      ORG 0000H
      LJMP MAIN
      ORG 0023H
      RETI
      ORG 0030H
    MAIN: SJMP $
    `);
    cpu.load(code);
    cpu.PC = 0x0030;
    cpu.IE = 0x90;
    cpu.SCON |= 0x02;
    cpu.step();
    expect(cpu.PC).toBe(0x0023);
    expect(cpu.SCON & 0x02).toBeTruthy();
    cpu.SCON &= ~0x02;
    cpu.step();
    expect(cpu.PC).toBe(0x0030);
  });

  it('edge-mode INT0 sets IE0 on falling edge via _rd', () => {
    const cpu = new window.Intel8051Emulator();
    let pinState = 1;
    cpu._rd = () => pinState;
    cpu.TCON = 0x01;
    cpu._prevInt0 = 1;
    cpu._sampleExtInt();
    expect(cpu.TCON & 0x02).toBeFalsy();
    pinState = 0;
    cpu._sampleExtInt();
    expect(cpu.TCON & 0x02).toBeTruthy();
  });

  it('level-mode INT0 sets IE0 while pin low', () => {
    const cpu = new window.Intel8051Emulator();
    cpu._rd = () => 0;
    cpu.TCON = 0x00;
    cpu._sampleExtInt();
    expect(cpu.TCON & 0x02).toBeTruthy();
    cpu._rd = () => 1;
    cpu._sampleExtInt();
    expect(cpu.TCON & 0x02).toBeFalsy();
  });
});

describe('reset clears IRQ state', () => {
  it('reset empties priority stack and pin history', () => {
    const cpu = new window.Intel8051Emulator();
    cpu._intPrioStack.push(1);
    cpu._prevInt0 = 1;
    cpu.reset();
    expect(cpu._intPrioStack.length).toBe(0);
    expect(cpu._prevInt0).toBe(0);
    expect(cpu.IE).toBe(0);
    expect(cpu.TCON).toBe(0);
  });
});
