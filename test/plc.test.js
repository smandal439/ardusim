import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const sourcePath = path.resolve(__dirname, '..', 'js', 'plc.js');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(sourcePath, 'utf8'), context);
const { defaultProgram, generateArduinoCode, normalizeProgram } = context.window.PLCLadder;
context.window.ArduinoLibs = {};
context.window.ArduinoComponents = { COMPONENT_DEFS: {} };
context.window.CppTypes = {
  getTypePattern() {
    return 'void|bool|char|int|float|double|long|short|byte|boolean|unsigned|signed|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|ssize_t';
  },
  getFullTypeRegex() {
    const pattern = this.getTypePattern();
    return new RegExp(`(?:const\\s+)?(?:unsigned\\s+)?(?:${pattern})\\s*\\*?\\s*`, 'g');
  },
};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '..', 'js', 'simulator.js'), 'utf8'), context);
const simulator = Object.create(context.window.ArduinoSimulator.prototype);
simulator.board = 'arduino_uno';

describe('PLC ladder transpiler', () => {
  it('maps NO/NC contacts and output coils to the documented PLC pins', () => {
    const code = generateArduinoCode({
      rungs: [
        { elements: [{ type: 'NO', input: 'I0_0' }], output: 'Q0_0' },
        { elements: [{ type: 'NC', input: 'I0_1' }], output: 'Q0_1' },
      ],
    });

    expect(code).toContain('pinMode(2, INPUT_PULLUP);');
    expect(code).toContain('digitalRead(2) == LOW');
    expect(code).toContain('digitalRead(3) == HIGH');
    expect(code).toContain('digitalWrite(8, _plcOutput8 ? HIGH : LOW);');
    expect(code).toContain('digitalWrite(9, _plcOutput9 ? HIGH : LOW);');
  });

  it('combines rungs driving the same coil instead of overwriting earlier rungs', () => {
    const code = generateArduinoCode({
      rungs: [
        { elements: [{ type: 'NO', input: 'I0_0' }], output: 'Q0_0' },
        { elements: [{ type: 'NO', input: 'I0_1' }], output: 'Q0_0' },
      ],
    });

    expect(code.match(/bool _plcOutput8 = false;/g)).toHaveLength(1);
    expect(code).toContain('_plcOutput8 = _plcOutput8 || _plcRung0;');
    expect(code).toContain('_plcOutput8 = _plcOutput8 || _plcRung1;');
  });

  it('generates TON, TOF, and CTU state with presets and reset input', () => {
    const code = generateArduinoCode({
      rungs: [{
        elements: [
          { type: 'TON', preset: 250 },
          { type: 'TOF', preset: 500 },
          { type: 'CTU', preset: 3, resetInput: 'I0_3' },
        ],
        output: 'Q0_3',
      }],
    });

    expect(code).toContain('const unsigned long plcNow = millis();');
    expect(code).toContain('_plcTON0Start');
    expect(code).toContain('plcNow - _plcTON0Start >= 250');
    expect(code).toContain('plcNow - _plcTOF1Start >= 500');
    expect(code).toContain('digitalRead(5) == LOW');
    expect(code).toContain('_plcCTU2Count >= 3');
  });

  it('transpiles generated timer/counter code into valid executable JavaScript', () => {
    const code = generateArduinoCode({
      rungs: [{
        elements: [
          { type: 'NO', input: 'I0_0' },
          { type: 'TON', preset: 250 },
          { type: 'TOF', preset: 500 },
          { type: 'CTU', preset: 3, resetInput: 'I0_3' },
        ],
        output: 'Q0_0',
      }],
    });

    const javascript = simulator.transpile(code);
    expect(() => new Function(javascript)).not.toThrow();
  });

  it('rejects invalid pins, presets, and empty runnable programs', () => {
    expect(() => normalizeProgram({
      rungs: [{ elements: [{ type: 'NO', input: 'D2' }], output: 'Q0_0' }],
    })).toThrow(/invalid input/i);
    expect(() => normalizeProgram({
      rungs: [{ elements: [{ type: 'CTU', preset: 65536, resetInput: 'I0_3' }], output: 'Q0_0' }],
    })).toThrow(/preset/i);
    expect(() => generateArduinoCode({ rungs: [] })).toThrow(/at least one rung/i);
  });

  it('provides a usable default rung and preserves its ladder mode', () => {
    const program = defaultProgram();
    program.mode = 'ladder';
    const normalized = normalizeProgram(program);
    expect(normalized.mode).toBe('ladder');
    expect(normalized.rungs[0]).toEqual({
      elements: [{ type: 'NO', input: 'I0_0' }],
      output: 'Q0_0',
    });
  });
});
