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

// Load libraries only (components need browser canvas; not needed for compile)
for (const f of fs.readdirSync(path.join(root, 'js/libraries')).filter((f) => f.endsWith('.js'))) {
  try {
    eval(fs.readFileSync(path.join(root, 'js/libraries', f), 'utf8'));
  } catch (e) {
    console.log('lib fail', f, e.message);
  }
}
eval(fs.readFileSync(path.join(root, 'js/simulator.js'), 'utf8'));

async function main() {
  const sim = new ArduinoSimulator();
  sim.board = 'esp32_devkit_v1';
  sim._serialLog = (msg) => process.stdout.write(String(msg));

  const files = ['lora_sender_receiver.json', 'lora_weather_station.json'];
  let pass = true;

  for (const f of files) {
    const ex = JSON.parse(fs.readFileSync(path.join(root, 'Examples', f), 'utf8'));
    for (const [name, code] of [
      ['code', ex.code],
      ['board2Code', ex.board2Code],
    ]) {
      if (!code) continue;
      const result = await sim.compile(code);
      if (!result.ok) {
        console.log('FAIL compile', f, name, '->', result.error);
        pass = false;
        continue;
      }
      console.log('OK compile', f, name);

      // Instantiate and call setup once
      try {
        const ctx = sim._compiledCtx;
        const fnInstance = ctx.fn(...ctx.vals);
        await fnInstance.setup();
        console.log('  setup OK', f, name);
        // one loop
        await fnInstance.loop();
        console.log('  loop OK', f, name);
      } catch (e) {
        console.log('  FAIL run', f, name, '->', e.message);
        pass = false;
      }
    }
  }

  // Unit-test return values
  const lora = window.ArduinoLibs['LoRa'].runtime({ boardIndex: 0, speed: 1, _serialLog: () => {} });
  const r1 = lora.loraBegin(868e6);
  console.log('loraBegin =>', r1, r1 === 1 ? 'OK' : 'BAD');
  if (r1 !== 1) pass = false;

  const ssd = window.ArduinoLibs['Adafruit_SSD1306'].constructor(128, 64, null, -1);
  const r2 = ssd.begin(0x01, 0x3c);
  console.log('oled begin =>', r2, r2 === true ? 'OK' : 'BAD');
  if (r2 !== true) pass = false;

  console.log(pass ? 'ALL PASS' : 'SOME FAILURES');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error('HARNESS ERROR', e);
  process.exit(1);
});
