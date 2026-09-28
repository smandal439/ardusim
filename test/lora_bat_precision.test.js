/**
 * test/lora_bat_precision.test.js — LoRa weather-station battery percentage:
 * the TX sketch computes a float percentage, but the transpiler strips the
 * (int) cast, so an unrounded value leaked into the JSON ("bat":65.52941176470587).
 * The sketch now rounds to 2 decimal places — this test proves it end-to-end.
 * Run: node node_modules/vitest/vitest.mjs run test/lora_bat_precision.test.js
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

global.window = {
  ArduinoLibs: {}, ArduinoComponents: { COMPONENT_DEFS: {} },
  ArduinoSim: null, CircuitCanvas: null, EXAMPLE_SKETCHES: [],
  addEventListener() {}, removeEventListener() {},
};
global.document = {
  getElementById: () => null, querySelector: () => null,
  createElement: () => ({ style: {}, getContext: () => null, appendChild() {} }),
  addEventListener() {}, removeEventListener() {},
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
  'js/electrical.js', 'js/components/base.js', 'js/components/passive.js',
  'js/components/power.js', 'js/components/output.js', 'js/canvas.js',
], ['CircuitCanvas']);

const example = JSON.parse(readSrc('Examples/lora_weather_station_sensor_tx_receiver_display copy.json'));

function buildRig(circuit) {
  const ctx = new Proxy({}, {
    get(_, prop) {
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop() {} });
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
    clientWidth: 900, clientHeight: 600, appendChild() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 600 }),
  };
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  cc.components = JSON.parse(JSON.stringify(circuit.components));
  cc.wires = JSON.parse(JSON.stringify(circuit.wires));
  cc.engine.buildGraph(cc.components, cc.wires);
  cc.engine.solve(cc);
  global.window.CircuitCanvas = cc;
  return cc;
}

describe('patched LoRa percentage sketch', () => {
  beforeAll(() => {
    const loadOne = (rel) => {
      try { new Function('window', 'document', readSrc(rel))(global.window, global.document); }
      catch (e) { console.warn('[test] skip', rel, '-', e.message); }
    };
    const libDir = path.join(ROOT, 'js', 'libraries');
    for (const f of fs.readdirSync(libDir).filter(f => f.endsWith('.js'))) {
      loadOne(path.join('js', 'libraries', f));
    }
    loadOne('js/simulator.js');
  });

  it('TX "bat" field has at most 2 decimal places', async () => {
    buildRig(example.circuit);

    const txLogs = [];
    const txSim = new global.window.ArduinoSimulator();
    txSim.board = 'esp32_devkit_v1';
    txSim.boardIndex = 0;
    txSim.speed = 1000;
    txSim._serialLog = (m) => txLogs.push(String(m));
    global.window.ArduinoSim = txSim;
    const r = await txSim.compile(example.files['sketch.ino']);
    expect(r.ok).toBe(true);
    const tx = txSim._compiledCtx.fn(...txSim._compiledCtx.vals);
    await tx.setup();
    await tx.loop();
    await new Promise((res) => setTimeout(res, 100));

    const out = txLogs.join('');
    const m = out.match(/"bat":\s*(-?[\d.]+)/);
    expect(m, `TX serial:\n${out.slice(0, 700)}`).toBeTruthy();
    const raw = m[1];
    console.log('[bat raw] =', raw);
    const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
    // the original bug: 65.52941176470587
    expect(raw).not.toMatch(/\.\d{3,}/);
  }, 30000);
});
