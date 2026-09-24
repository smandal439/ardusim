/** Temporary debug for the e2e analogRead path — delete after use. */
import { describe, it, expect } from 'vitest';
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
    clientWidth: 900, clientHeight: 600,
    appendChild() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 600 }),
  };
  const cc = new CircuitCanvas(canvasEl, wrapperEl);
  cc.components = JSON.parse(JSON.stringify(circuit.components));
  cc.wires = JSON.parse(JSON.stringify(circuit.wires));
  global.window.CircuitCanvas = cc;
  return cc;
}

describe('debug e2e analogRead', () => {
  it('traces why analogRead returns 0', async () => {
    const cc = buildRig(example.circuit);
    cc.engine.buildGraph(cc.components, cc.wires);
    cc.engine.solve(cc);

    console.log('DBG _readAnalogInput =', cc._readAnalogInput('tx_board', 'D34'));
    console.log('DBG engine V(D34) =', cc.engine.getVoltageAtPin('tx_board', 'D34'));
    console.log('DBG board0 =', cc.getBoardInstByIndex(0)?.id, cc.getBoardInstByIndex(0)?.type);

    const loadOne = (rel) => {
      try {
        const fn = new Function('window', 'document', readSrc(rel));
        fn(global.window, global.document);
      } catch (e) {
        console.warn('[test] skip', rel, '-', e.message);
      }
    };
    const libDir = path.join(ROOT, 'js', 'libraries');
    for (const f of fs.readdirSync(libDir).filter(f => f.endsWith('.js'))) loadOne(path.join('js', 'libraries', f));
    loadOne('js/simulator.js');

    // --- exact e2e sequence: RX first ---
    const rxLogs = [];
    const rxSim = new global.window.ArduinoSimulator();
    rxSim.board = 'esp32_devkit_v1';
    rxSim.boardIndex = 1;
    rxSim.speed = 1000;
    rxSim._serialLog = (m) => rxLogs.push(String(m));
    const rRx = await rxSim.compile(example.board2Code);
    console.log('DBG rx compile =', rRx.ok, rRx.error || '');
    const rx = rxSim._compiledCtx.fn(...rxSim._compiledCtx.vals);
    await rx.setup();
    console.log('DBG rx setup done; CircuitCanvas still cc ?', global.window.CircuitCanvas === cc);
    console.log('DBG _readAnalogInput after rx setup =', cc._readAnalogInput('tx_board', 'D34'));

    const txLogs = [];
    const txSim = new global.window.ArduinoSimulator();
    txSim.board = 'esp32_devkit_v1';
    txSim.boardIndex = 0;
    txSim.speed = 1000;
    txSim._serialLog = (m) => txLogs.push(String(m));
    global.window.ArduinoSim = txSim;
    const rTx = await txSim.compile(example.files['sketch.ino']);
    console.log('DBG tx compile =', rTx.ok, rTx.error || '');
    const compiled = txSim._compiledJs || '';
    const iAB = compiled.indexOf('analogRead');
    console.log('DBG compiled analogRead ctx:', JSON.stringify(compiled.slice(Math.max(0, iAB - 120), iAB + 160)));
    const iRV = compiled.indexOf('readBatteryVoltage');
    console.log('DBG compiled readBattery:', JSON.stringify(compiled.slice(Math.max(0, iRV - 60), iRV + 320)));
    console.log('DBG _a.analogRead(34) pre-setup =', txSim._a && txSim._a.analogRead(34));
    txSim.onError = (e) => console.log('DBG TX onError:', e && (e.stack || e.message || String(e)));
    const tx = txSim._compiledCtx.fn(...txSim._compiledCtx.vals);
    await tx.setup();
    console.log('DBG _a.analogRead(34) post-setup =', txSim._a.analogRead(34));
    console.log('DBG engine V(D34) pre-loop =', cc.engine.getVoltageAtPin('tx_board', 'D34'));
    try {
      await tx.loop();
    } catch (e) {
      console.log('DBG loop threw:', e && (e.stack || e.message || String(e)));
    }
    console.log('DBG TX out:', JSON.stringify(txLogs.join('').slice(0, 800)));
    console.log('DBG engine V(D34) post-loop =', cc.engine.getVoltageAtPin('tx_board', 'D34'));
    console.log('DBG _readAnalogInput post-loop =', cc._readAnalogInput('tx_board', 'D34'));

    expect(true).toBe(true);
  }, 30000);
});
