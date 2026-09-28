/**
 * test/resistor_bands.test.js — Resistor colour bands honour the unit:
 *   - resistorBands() math (ohms in → colours out)
 *   - draw() band colours change when unit goes Ω → kΩ → MΩ
 *   - value label follows the unit ("220", "220kΩ", "220MΩ")
 *   - the electrical engine still scales resistance by the unit
 * Run: node node_modules\vitest\vitest.mjs run test/resistor_bands.test.js
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

global.window = {
  ArduinoLibs: {},
  ArduinoComponents: { COMPONENT_DEFS: {} },
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

const code = [
  readSrc('js/components/base.js'),
  readSrc('js/components/passive.js'),
].join('\n;\n');
const loader = new Function('window', 'document',
  code + '\n;return { resistorBands };');
const { resistorBands } = loader(global.window, global.document);

const DEFS = global.window.ArduinoComponents.COMPONENT_DEFS;

/** Recording 2-D context: keeps fillStyle at each fillRect/fillText call. */
function recorder() {
  const rects = [];
  const texts = [];
  const ctx = {
    save() {}, restore() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() {}, quadraticCurveTo() {}, stroke() {},
    fill() {}, translate() {}, rotate() {}, setLineDash() {}, arc() {},
    fillRect(x, y, w, h) { rects.push({ x, y, w, h, fillStyle: ctx.fillStyle }); },
    fillText(text, x, y) { texts.push({ text, fillStyle: ctx.fillStyle }); },
    strokeStyle: '', fillStyle: '', lineWidth: 0, font: '',
    textAlign: '', textBaseline: '',
  };
  return { ctx, rects, texts };
}

/** Draw a resistor with the given props; return the 3 colour-band rects (y=16). */
function drawBands(props) {
  const { ctx, rects, texts } = recorder();
  DEFS.resistor.draw(ctx, { x: 0, y: 0, props, selected: false }, null);
  const bands = rects.filter(r => r.y === 16 && r.w === 3 && r.x <= 13);
  return { bands, texts };
}

const BROWN = '#884400';
const YELLOW = '#ffff00';
const VIOLET = '#aa00aa';

describe('resistorBands() math', () => {
  it('encodes significant digits + multiplier for a value in ohms', () => {
    expect(resistorBands(220)).toEqual(['#ff0000', '#ff0000', BROWN]);
    expect(resistorBands(220000)).toEqual(['#ff0000', '#ff0000', YELLOW]);
    expect(resistorBands(220e6)).toEqual(['#ff0000', '#ff0000', VIOLET]);
  });
});

describe('resistor draw() honours props.unit', () => {
  it('band colours differ between Ω, kΩ and MΩ for the same numeric value', () => {
    const ohm = drawBands({ value: 220, unit: '\u03A9' });
    const kilo = drawBands({ value: 220, unit: 'k\u03A9' });
    const mega = drawBands({ value: 220, unit: 'M\u03A9' });

    expect(ohm.bands).toHaveLength(3);
    expect(kilo.bands).toHaveLength(3);
    expect(mega.bands).toHaveLength(3);

    // Third (multiplier) band is where the unit shows up
    expect(ohm.bands[2].fillStyle).toBe(BROWN);   // 220 Ω  → ×10
    expect(kilo.bands[2].fillStyle).toBe(YELLOW); // 220 kΩ → ×10⁴
    expect(mega.bands[2].fillStyle).toBe(VIOLET); // 220 MΩ → ×10⁷

    // Significant-digit bands stay identical across units
    expect(kilo.bands[0]).toEqual(ohm.bands[0]);
    expect(kilo.bands[1]).toEqual(ohm.bands[1]);
  });

  it('value label shows the unit', () => {
    expect(drawBands({ value: 220, unit: '\u03A9' }).texts.map(t => t.text))
      .toContain('220\u03A9');
    expect(drawBands({ value: 220, unit: 'k\u03A9' }).texts.map(t => t.text))
      .toContain('220k\u03A9');
  });
});

describe('unit scaling elsewhere', () => {
  it('electrical engine scales resistor edges by the unit', () => {
    const src = readSrc('js/electrical.js');
    expect(src).toContain("unit === 'k\u03A9' ? 1e3");
    expect(src).toContain("unit === 'M\u03A9' ? 1e6");
  });

  it('index.html loads a cache-busted passive.js', () => {
    expect(readSrc('index.html')).toMatch(/passive\.js\?v=2026\d{4}-\d+/);
  });
});
