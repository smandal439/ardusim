/**
 * test/intel8051_c.test.js — C → ASM transpiler (Keil C51 subset)
 * Run: node node_modules/vitest/vitest.mjs run test/intel8051_c.test.js
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

global.window = {};

const root = path.resolve(__dirname, '..');
beforeAll(() => {
  eval(fs.readFileSync(path.join(root, 'js/libraries/intel8051_c.js'), 'utf8'));
  eval(fs.readFileSync(path.join(root, 'js/libraries/intel8051_assembler.js'), 'utf8'));
  eval(fs.readFileSync(path.join(root, 'js/libraries/intel8051_emulator.js'), 'utf8'));
});

function compileAsm(src) {
  const r = window.Intel8051C.compile(src);
  expect(r.error).toBeUndefined();
  expect(r.asm).toBeTypeOf('string');
  const a = window.Intel8051Assembler.assemble(r.asm);
  expect(a.errors || []).toEqual([]);
  return r.asm;
}

describe('sniff', () => {
  it('detects reg51 include', () => {
    expect(window.Intel8051C.sniff('#include <reg51.h>\nvoid main(){}')).toBe(true);
  });
  it('detects sbit P1^n', () => {
    expect(window.Intel8051C.sniff('sbit LED = P1^7;')).toBe(true);
  });
  it('detects void main(', () => {
    expect(window.Intel8051C.sniff('void main() { }')).toBe(true);
  });
  it('does not match existing asm examples', () => {
    const dir = path.join(root, 'Examples');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\uFEFF/, '');
      const j = JSON.parse(raw);
      const code = j.code || '';
      const sketch = Object.values(j.files || {}).join('\n');
      const all = code + '\n' + sketch;
      if (!all.trim()) continue;
      // only check files that look like 8051 asm (have ORG or MOV patterns with 8051 tags/code)
      if (/ORG\s+00|;\s*Intel 8051|sketch\.asm/.test(all) || (j.tags || []).includes('8051')) {
        if (/^[\s;]/m.test(all) && /ORG|SJMP|ACALL|MOV\s+R|SETB|CLR\s+P/i.test(all)) {
          expect(window.Intel8051C.sniff(all), f).toBe(false);
        }
      }
    }
  });
  it('does not match empty/null', () => {
    expect(window.Intel8051C.sniff('')).toBe(false);
    expect(window.Intel8051C.sniff(null)).toBe(false);
  });
});

describe('compile basic', () => {
  it('compiles simple assignment and assembles', () => {
    const asm = compileAsm(`
      #include <reg51.h>
      void main() {
        unsigned char x;
        x = 1 + 2;
        P1 = x;
      }
    `);
    expect(asm).toContain('MAIN:');
    expect(asm).toContain('ORG 0000H');
    expect(asm).toContain('ORG 0030H');
    expect(asm).toContain('__DEF_ISR:');
    expect(asm).toContain('RETI');
  });

  it('emits full vector trampoline (unused → __DEF_ISR)', () => {
    const asm = compileAsm(`
      void main() { while (1); }
    `);
    expect(asm).toMatch(/ORG 0003H[\s\S]*LJMP __DEF_ISR/);
    expect(asm).toMatch(/ORG 000BH[\s\S]*LJMP __DEF_ISR/);
    expect(asm).toMatch(/ORG 0013H[\s\S]*LJMP __DEF_ISR/);
    expect(asm).toMatch(/ORG 001BH[\s\S]*LJMP __DEF_ISR/);
    expect(asm).toMatch(/ORG 0023H[\s\S]*LJMP __DEF_ISR/);
    expect(asm).toMatch(/LJMP __START/);
  });

  it('sbit LED = P1^7 resolves to bit 151 (0x97)', () => {
    const asm = compileAsm(`
      sbit LED = P1^7;
      void main() { LED = 1; }
    `);
    expect(asm).toMatch(/SETB 151/);
  });

  it('compiles blink with delay loops', () => {
    const asm = compileAsm(`
      #include <reg51.h>
      sbit LED = P1^7;
      void delay() {
        unsigned char i, j;
        for (i = 0; i < 50; i++)
          for (j = 0; j < 255; j++);
      }
      void main() {
        while (1) {
          LED = 0;
          delay();
          LED = 1;
          delay();
        }
      }
    `);
    expect(asm).toContain('MAIN:');
    expect(asm).toContain('_F_delay:');
    expect(asm).toMatch(/SETB 151|CLR 151/);
  });
});

describe('ISR support', () => {
  it('compiles interrupt 1 (Timer0) with vector at 000BH', () => {
    const asm = compileAsm(`
      #include <reg51.h>
      sbit LED = P1^7;
      unsigned char count;
      void timer0_isr() interrupt 1 {
        TH0 = 0x3C;
        TL0 = 0xB0;
        count++;
        if (count >= 20) { count = 0; LED = ~LED; }
      }
      void main() {
        TMOD = 0x01;
        TH0 = 0x3C;
        TL0 = 0xB0;
        IE = 0x82;
        TR0 = 1;
        while (1);
      }
    `);
    expect(asm).toMatch(/ORG 000BH\s*\n\s*LJMP _ISR_1/);
    expect(asm).toContain('_ISR_1:');
    expect(asm).toMatch(/_ISR_1:[\s\S]*PUSH PSW[\s\S]*PUSH ACC[\s\S]*PUSH B/);
    expect(asm).toMatch(/POP B[\s\S]*POP ACC[\s\S]*POP PSW[\s\S]*RETI/);
    expect(asm).toMatch(/SETB 140/); // TR0
    expect(asm).toMatch(/MOV 168/); // IE SFR 0xA8
  });

  it('rejects interrupt number out of range', () => {
    const r = window.Intel8051C.compile('void foo() interrupt 9 { } void main(){}');
    expect(r.error).toBeTruthy();
  });
});

describe('compile + execute', () => {
  function runAsm(asm, maxSteps) {
    const a = window.Intel8051Assembler.assemble(asm);
    expect(a.errors || []).toEqual([]);
    const cpu = new window.Intel8051Emulator();
    cpu.load(a.code);
    let steps = 0;
    while (steps < maxSteps && !cpu.halted) {
      cpu.step();
      steps++;
    }
    return cpu;
  }

  it('main writes 0x55 to P1 and halts via infinite loop end', () => {
    const asm = compileAsm(`
      void main() {
        P1 = 0x55;
        while (1);
      }
    `);
    const cpu = runAsm(asm, 500);
    expect(cpu.P1).toBe(0x55);
  });

  it('arithmetic: 7*6 stored to P1', () => {
    const asm = compileAsm(`
      void main() {
        unsigned char x;
        x = 7 * 6;
        P1 = x;
        while (1);
      }
    `);
    const cpu = runAsm(asm, 500);
    expect(cpu.P1).toBe(42);
  });

  it('if/else takes correct branch', () => {
    const asm = compileAsm(`
      void main() {
        unsigned char x;
        x = 3;
        if (x > 2) P1 = 0x0F; else P1 = 0xF0;
        while (1);
      }
    `);
    const cpu = runAsm(asm, 500);
    expect(cpu.P1).toBe(0x0F);
  });

  it('function call with param', () => {
    const asm = compileAsm(`
      void setp(unsigned char v) { P1 = v; }
      void main() { setp(0xA5); while (1); }
    `);
    const cpu = runAsm(asm, 500);
    expect(cpu.P1).toBe(0xA5);
  });

  it('for loop sums 1..5 into P1', () => {
    const asm = compileAsm(`
      void main() {
        unsigned char i, s;
        s = 0;
        for (i = 1; i <= 5; i++) s = s + i;
        P1 = s;
        while (1);
      }
    `);
    const cpu = runAsm(asm, 2000);
    expect(cpu.P1).toBe(15);
  });

  it('Timer0 ISR fires and toggles P1.7', () => {
    const asm = compileAsm(`
      #include <reg51.h>
      sbit LED = P1^7;
      void timer0_isr() interrupt 1 {
        LED = 0;
      }
      void main() {
        TMOD = 0x01;
        TH0 = 0xFF;
        TL0 = 0xF0;
        IE = 0x82;
        TR0 = 1;
        while (1);
      }
    `);
    const cpu = runAsm(asm, 5000);
    // TF0 should have fired at least once, ISR set P1.7 = 0
    expect(cpu.P1 & 0x80).toBe(0);
    expect(cpu._intPrioStack.length).toBe(0);
  });

  it('16-bit while(n--) runs the full count through MOV direct,direct', () => {
    const asm = compileAsm(`
      void main() {
        unsigned int n;
        unsigned char c;
        n = 5;
        c = 0;
        while (n--) c++;
        P1 = c;
        while (1);
      }
    `);
    const cpu = runAsm(asm, 5000);
    // n = 5 -> body runs for old values 5,4,3,2,1
    expect(cpu.P1).toBe(5);
  });

  it('Examples/i8051_c_blink.json toggles P1.7 (regression: LED not blinking)', () => {
    const raw = fs.readFileSync(path.join(root, 'Examples/i8051_c_blink.json'), 'utf8').replace(/^\uFEFF/, '');
    const src = JSON.parse(raw).files['sketch.c'];
    const asm = compileAsm(src);
    const a = window.Intel8051Assembler.assemble(asm);
    const cpu = new window.Intel8051Emulator();
    cpu.load(Array.from(a.code));
    let toggles = 0;
    let last = cpu.P1 & 0x80;
    for (let i = 0; i < 4_000_000 && toggles < 2; i++) {
      cpu.step();
      const bit = cpu.P1 & 0x80;
      if (bit !== last) { toggles += 1; last = bit; }
    }
    expect(toggles).toBe(2);
  });
});

describe('error reporting', () => {
  it('reports parse errors with line', () => {
    const r = window.Intel8051C.compile('void main() { x = ; }');
    expect(r.error).toBeTruthy();
    expect(typeof r.line).toBe('number');
  });

  it('reports unknown identifier', () => {
    const r = window.Intel8051C.compile('void main() { foo = 1; }');
    expect(r.error).toMatch(/Unknown identifier/);
  });

  it('requires main', () => {
    const r = window.Intel8051C.compile('void other() {}');
    expect(r.error).toMatch(/main/);
  });
});
