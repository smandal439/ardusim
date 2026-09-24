/**
 * test/lora_battery_tx.test.js — LoRa Weather Station battery → ADC → LoRa pipeline
 * Run: node node_modules/vitest/vitest.mjs run test/lora_battery_tx.test.js
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

const example = JSON.parse(readSrc('Examples/lora_weather_station_sensor_tx_receiver_display.json'));

function makeCanvasStub() {
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
  return { canvasEl, wrapperEl };
}

function buildRig(circuit) {
  const { canvasEl, wrapperEl } = makeCanvasStub();
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  cc.components = JSON.parse(JSON.stringify(circuit.components));
  cc.wires = JSON.parse(JSON.stringify(circuit.wires));
  global.window.CircuitCanvas = cc;
  return cc;
}

function solvedRig() {
  const cc = buildRig(example.circuit);
  cc.engine.buildGraph(cc.components, cc.wires);
  cc.engine.solve(cc);
  return cc;
}

describe('LoRa weather station: battery divider → ESP32 ADC', () => {
  it('battery wired to VIN keeps the rail at 3.7 V (board 5 V source yields)', () => {
    const cc = solvedRig();
    const txVin = cc.engine.getVoltageAtPin('tx_board', 'VIN');
    const rxVin = cc.engine.getVoltageAtPin('rx_board', 'VIN');
    expect(txVin).toBeCloseTo(3.7, 2);
    expect(rxVin).toBeCloseTo(3.7, 2);
    // the fixed 5 V rail must not be injected when a battery feeds it
    const vinNet = cc.engine.getNetForPin('tx_board', 'VIN');
    expect(vinNet.sources.every(s => s.type !== '5v')).toBe(true);
  });

  it('input-only ADC pin D34 is passive — not grounded by default', () => {
    const cc = solvedRig();
    const net = cc.engine.getNetForPin('tx_board', 'D34');
    expect(net).toBeTruthy();
    expect(net.grounds.length).toBe(0);
  });

  it('100 kΩ/100 kΩ divider puts ~1.85 V on D34', () => {
    const cc = solvedRig();
    const v = cc.engine.getVoltageAtPin('tx_board', 'D34');
    expect(v).toBeCloseTo(1.85, 2);
  });

  it('_readAnalogInput scales the divider voltage to ADC counts (~574/1023)', () => {
    const cc = solvedRig();
    const raw = cc._readAnalogInput('tx_board', 'D34');
    expect(Number.isFinite(raw)).toBe(true);
    expect(raw).toBeGreaterThanOrEqual(560);
    expect(raw).toBeLessThanOrEqual(590);
  });

  it('sketch ADC math (12-bit, 2:1 divider) reconstructs ≈3.7 V', () => {
    const cc = solvedRig();
    const raw10 = cc._readAnalogInput('tx_board', 'D34');
    const raw12 = Math.round((raw10 / 1023) * 4095); // ESP32 analogRead scaling
    const voltage = (raw12 / 4095) * 3.3 * 2.0;      // sketch readBatteryVoltage()
    expect(voltage).toBeGreaterThan(3.6);
    expect(voltage).toBeLessThan(3.8);
  });

  it('example sketch reads the ADC, sends bat, and receiver parses it', () => {
    const tx = example.files['sketch.ino'];
    expect(tx).toMatch(/pinMode\(BATT_ADC,\s*INPUT\)/);
    expect(tx).toMatch(/analogRead\(BATT_ADC\)/);
    expect(tx).toMatch(/const int ADC_RESOLUTION = 4095;/);
    expect(tx).toMatch(/doc\["bat"\]/);
    expect(example.board2Code).toMatch(/doc\["bat"\]\.as<float>\(\)/);
    expect(example.board2Code).toMatch(/lastBat/);
  });
});

describe('LoRa weather station: end-to-end (TX payload → RX display)', () => {
  beforeAll(() => {
    // Load every library plugin + the simulator engine (mirrors scripts/test-lora-runtime.js)
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
  });

  it('TX evaluates battery voltage and RX displays it', async () => {
    // Static circuit: solve the electrical graph once before sketches run.
    const cc = solvedRig();
    global.window.CircuitCanvas = cc;

    // Receiver registers on the LoRa bus during setup — do it first so the
    // TX packet has a listener when it goes on the air.
    const rxLogs = [];
    const rxSim = new global.window.ArduinoSimulator();
    rxSim.board = 'esp32_devkit_v1';
    rxSim.boardIndex = 1;
    rxSim.speed = 1000;
    rxSim._serialLog = (m) => rxLogs.push(String(m));
    const rRx = await rxSim.compile(example.board2Code);
    expect(rRx.ok).toBe(true);
    const rx = rxSim._compiledCtx.fn(...rxSim._compiledCtx.vals);
    await rx.setup();

    // Transmitter
    const txLogs = [];
    const txSim = new global.window.ArduinoSimulator();
    txSim.board = 'esp32_devkit_v1';
    txSim.boardIndex = 0;
    txSim.speed = 1000;
    txSim._serialLog = (m) => txLogs.push(String(m));
    global.window.ArduinoSim = txSim;
    const rTx = await txSim.compile(example.files['sketch.ino']);
    expect(rTx.ok).toBe(true);
    const tx = txSim._compiledCtx.fn(...txSim._compiledCtx.vals);
    await tx.setup();
    await tx.loop();

    // LoRa delivery runs on a real timer (airtime ≈ 57 ms) — wait it out.
    await new Promise((res) => setTimeout(res, 250));

    const txOut = txLogs.join('');
    const batMatch = txOut.match(/"bat":\s*(-?[\d.]+)/);
    expect(batMatch, `TX serial must carry a bat field:\n${txOut.slice(0, 600)}`).toBeTruthy();
    const bat = parseFloat(batMatch[1]);
    expect(bat, `TX serial dump:\n${txOut.slice(0, 900)}`).toBeGreaterThan(3.6);
    expect(bat).toBeLessThan(3.8);

    // Receiver loop: parse the packet and print/display it.
    global.window.ArduinoSim = rxSim;
    await rx.loop();
    const rxOut = rxLogs.join('');
    expect(rxOut, `RX serial must show received battery:\n${rxOut.slice(0, 600)}`).toMatch(/Bat:3\.\d/);
  }, 30000);
});
