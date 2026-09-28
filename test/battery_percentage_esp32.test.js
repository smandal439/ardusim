/**
 * test/battery_percentage_esp32.test.js — battery divider → ESP32 ADC → Serial %
 * Run: node node_modules/vitest/vitest.mjs run test/battery_percentage_esp32.test.js
 *
 * Regression: the example used to print "Voltage: 0.00 V" forever because the
 * sketch read a non-ADC GPIO (13) and analogReadMilliVolts() picked up only
 * the digital 0/1 feedback value left in pinStates between frames.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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
  createElement: () => ({ style: {}, getContext: () => null, appendChild() {} }),
  addEventListener() {},
  removeEventListener() {},
};
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function loadScripts(files, names) {
  const code = files.map(readSrc).join('\n;\n');
  const fn = new Function('window', 'document',
    code + '\n;return {' + names.map(n => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ') + '};');
  return fn(global.window, global.document);
}

const { CircuitCanvas } = loadScripts([
  'js/electrical.js',
  'js/components/base.js',
  'js/components/passive.js',
  'js/components/power.js',
  'js/components/output.js',
  'js/canvas.js',
], ['CircuitCanvas']);

const example = JSON.parse(readSrc('Examples/battery_percentage_esp32.json'));

function buildRig(circuit) {
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
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  cc.components = JSON.parse(JSON.stringify(circuit.components));
  cc.wires = JSON.parse(JSON.stringify(circuit.wires));
  global.window.CircuitCanvas = cc;
  cc.engine.buildGraph(cc.components, cc.wires);
  cc.engine.solve(cc);
  return cc;
}

describe('battery percentage esp32 example', () => {
  it('wires the divider midpoint to an ADC-capable pin (D34), not a digital pin', () => {
    const board = example.circuit.components.find(c => c.type === 'esp32_devkit_v1');
    const wiredPins = example.circuit.wires
      .filter(w => w.from.instId === board.id || w.to.instId === board.id)
      .map(w => (w.from.instId === board.id ? w.from.pinId : w.to.pinId));
    expect(wiredPins).toContain('D34');
    expect(wiredPins).not.toContain('D13');
    expect(example.files['sketch.ino']).toMatch(/adcPin\s*=\s*34/);
  });

  it('solves ~1.85 V at the divider midpoint (and on the multimeter)', () => {
    const cc = buildRig(example.circuit);
    const board = cc.components.find(c => c.type === 'esp32_devkit_v1');
    expect(cc.engine.getVoltageAtPin(board.id, 'D34')).toBeCloseTo(1.85, 2);

    const mm = cc.components.find(c => c.type === 'multimeter');
    const vRed = cc.engine.getVoltageAtPin(mm.id, 'probe_red');
    const vCom = cc.engine.getVoltageAtPin(mm.id, 'probe_com');
    expect(vRed - vCom).toBeCloseTo(1.85, 2);
  });

  it('sketch prints the reconstructed battery voltage (~3.7 V) and a sane %', async () => {
    // Load every library plugin + the simulator engine (mirrors lora_battery_tx.test.js)
    const loadOne = (rel) => {
      try {
        const fn = new Function('window', 'document', readSrc(rel));
        fn(global.window, global.document);
      } catch (e) {
        console.warn('[test] skip', rel, '-', e.message);
      }
    };
    const libDir = path.join(ROOT, 'js', 'libraries');
    for (const f of fs.readdirSync(libDir).filter(f => f.endsWith('.js'))) {
      loadOne(path.join('js', 'libraries', f));
    }
    loadOne('js/simulator.js');
    expect(global.window.ArduinoSimulator).toBeTruthy();

    const cc = buildRig(example.circuit);

    const logs = [];
    const sim = new global.window.ArduinoSimulator();
    sim.board = 'esp32_devkit_v1';
    sim.boardIndex = 0;
    sim.speed = 1e6; // delay() shouldn't cost real time in tests
    sim._serialLog = (m) => logs.push(String(m));
    global.window.ArduinoSim = sim;

    const r = await sim.compile(example.files['sketch.ino']);
    expect(r.ok).toBe(true);
    const sketch = sim._compiledCtx.fn(...sim._compiledCtx.vals);
    await sketch.setup();
    await sketch.loop();

    const out = logs.join('');
    const volt = out.match(/Voltage:\s*(-?[\d.]+)/);
    expect(volt, `serial output:\n${out}`).toBeTruthy();
    const batteryV = parseFloat(volt[1]);
    expect(batteryV, `serial output:\n${out}`).toBeGreaterThan(3.5);
    expect(batteryV).toBeLessThan(3.9);

    const pct = out.match(/(\d+)\s*%/);
    expect(pct, `serial output:\n${out}`).toBeTruthy();
    const percentage = parseInt(pct[1], 10);
    expect(percentage).toBeGreaterThan(50);
    expect(percentage).toBeLessThan(90);
  }, 30000);
});
