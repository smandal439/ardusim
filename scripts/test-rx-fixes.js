const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = global;
window.ArduinoLibs = {};
window.CppTypes = null;
global.document = {
  createElement: () => ({ getContext: () => null, style: {}, appendChild() {}, setAttribute() {} }),
  getElementById: () => null,
  addEventListener() {},
  body: { appendChild() {} },
};
global.navigator = { userAgent: 'node' };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.requestAnimationFrame = () => {};
global.performance = { now: () => Date.now() };

for (const f of fs.readdirSync(path.join(root, 'js/libraries')).filter((f) => f.endsWith('.js'))) {
  try {
    eval(fs.readFileSync(path.join(root, 'js/libraries', f), 'utf8'));
  } catch (e) {
    console.log('lib fail', f, e.message);
  }
}
eval(fs.readFileSync(path.join(root, 'js/simulator.js'), 'utf8'));

let pass = true;
function check(name, cond, detail) {
  if (cond) console.log('OK  ', name);
  else {
    console.log('FAIL', name, detail || '');
    pass = false;
  }
}

// 1. Transpile board2Code: no display_a, drawLine kept as method
const sim = new ArduinoSimulator();
sim.board = 'esp32_devkit_v1';
const ex = JSON.parse(fs.readFileSync(path.join(root, 'Examples/lora_weather_station.json'), 'utf8'));
const js = sim.transpile(ex.board2Code);
check('no display_a mangling', !js.includes('display_a'), js.match(/.*display_a.*/)?.[0]);
check('drawLine stays on display', /display\.drawLine\(/.test(js), js.match(/.*drawLine.*/)?.[0]);
check('no bare gfxDrawLine without _a', !/[a-z]_a\.gfx/.test(js));

// 2. ArduinoJson deserializes byte array (RX path)
const AJ = window.ArduinoLibs['ArduinoJson'];
const doc = AJ.constructor(128);
const json = '{"id":"ws-01","pkt":1,"temp":25.5,"hum":60,"bat":3.7}';
const bytes = [];
for (let i = 0; i < json.length; i++) bytes.push(json.charCodeAt(i));
bytes.push(0); // NUL
const err = doc._deserialize(bytes);
check('deserialize byte[] err=0', err === 0, 'err=' + err);
check('deserialize data id', doc._data && doc._data.id === 'ws-01', JSON.stringify(doc._data));
// RX field access: doc["id"].as<String>() must not become doc["id"]._asType()
check('transpile doc["id"].as path', /doc\._asPath\('id'\)/.test(js), js.match(/.*_asPath.*/)?.[0]);
check('_asPath returns id', doc._asPath('id') === 'ws-01', String(doc._asPath('id')));
check('_asPath returns temp', doc._asPath('temp') === 25.5, String(doc._asPath('temp')));
check('_asType on doc still works', doc._asType() && doc._asType().id === 'ws-01');

// 3. Serial prints byte array as C string
const SerialLib = window.ArduinoLibs['Serial'];
const logs = [];
const simStub = {
  board: 'esp32_devkit_v1',
  pinStates: {},
  _emitPinChange() {},
  _serialLog(s) { logs.push(s); },
  serialInputBuffer: [],
};
const rt = SerialLib.runtime(simStub);
rt.serialPrintln(bytes);
const printed = logs.join('');
check('serial prints JSON string', printed.includes('"id":"ws-01"'), printed);
check('serial no comma-joined codes', !printed.includes('123,34,105'), printed.slice(0, 80));

// 4. serializeJson 3-arg still works
const doc2 = AJ.constructor(128);
doc2._data = { hello: 'world' };
const buf = new Array(64).fill(0);
const n = doc2._serialize(buf);
check('serialize fills buffer', n > 0 && String(buf).includes('"hello"'), String(buf).toString());

// 5. LoRa bus ignores string component IDs
eval(fs.readFileSync(path.join(root, 'js/libraries/lora.js'), 'utf8'));
window._loraBus = { nodes: {} };
// Simulate component node (string ID) + two boards
window._loraBus.nodes['lora_tx'] = { id: 'lora_tx', active: true, frequency: 868e6 };
const loraLib = window.ArduinoLibs['LoRa'];
const self0 = { boardIndex: 0, speed: 1, _serialLog(s) { logs.push(s); }, board: 'arduino_uno' };
const self1 = { boardIndex: 1, speed: 1, _serialLog(s) { logs.push(s); }, board: 'arduino_uno' };
const rt0 = loraLib.runtime(self0);
const rt1 = loraLib.runtime(self1);
rt0.loraBegin(868e6);
rt1.loraBegin(868e6);
check('board0 registered', window._loraBus.nodes[0] && window._loraBus.nodes[0].initialized);
check('board1 registered', window._loraBus.nodes[1] && window._loraBus.nodes[1].initialized);
check('component node intact', window._loraBus.nodes['lora_tx']);

// TX from board0
logs.length = 0;
rt0.loraBeginPacket();
rt0.loraPrint('{"id":"ws-01"}');
rt0.loraEndPacket();
// delivery is via setTimeout(airtime≈57ms) — wait longer
setTimeout(() => {
  const out = logs.join('');
  check('delivered to Board 2 not NaN', out.includes('Delivered to Board 2'), out);
  check('no Board NaN', !out.includes('Board NaN'), out);
  console.log(pass ? 'ALL PASS' : 'SOME FAILURES');
  process.exit(pass ? 0 : 1);
}, 120);
