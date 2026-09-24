/* Verify webserver route handling: AJAX fetch must NOT re-serve the root page;
   navigation (link click) MUST re-serve it so state changes become visible. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const src = fs.readFileSync(path.join(ROOT, 'js/libraries/webserver.js'), 'utf8');

const emitted = [];
const serial = [];
const self = {
  _serialLog: (m) => serial.push(m),
  _emitWebPage: (r) => emitted.push(r),
  _web: null,
};

// Evaluate the library and grab its runtime
const fn = new Function('window', src + ';return window.ArduinoLibs["WebServer"];');
const lib = fn({ ArduinoLibs: {} });
const rt = lib.runtime(self);

// Simulated sketch state
let duty = -1;
let htmlPage = '<html><body>dashboard value=' + duty + '</body></html>';

// Routes exactly like http_slider_pwm_led.json
rt.serverOn({ port: 80 }, '/', () => {
  rt.serverSend({ port: 80 }, 200, 'text/html', htmlPage);
});
rt.serverOn({ port: 80 }, '/slider', () => {
  const v = Number(rt.serverArg({ port: 80 }, 'value'));
  if (!Number.isNaN(v)) duty = v;
  rt.serverSend({ port: 80 }, 200, 'text/plain', 'OK');
});
let ledOn = false;
rt.serverOn({ port: 80 }, '/led1/on', () => {
  ledOn = true;
  rt.serverSend({ port: 80 }, 200, 'text/plain', 'LED1 ON');
});
rt.serverBegin({ port: 80 });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  let pass = 0, fail = 0;
  const check = (name, cond) => {
    if (cond) { pass++; console.log('  OK  ', name); }
    else { fail++; console.log('  FAIL', name); }
  };

  // ── 1. AJAX fetch (slider drag) ──
  emitted.length = 0;
  self._webResp = null;
  self._web._triggerRoute('/slider?value=128', { ajax: true });
  await sleep(30);
  check('ajax: duty updated to 128', duty === 128);
  check('ajax: fetch response is OK text/plain', self._webResp && self._webResp.content === 'OK' && self._webResp.type === 'text/plain');
  check('ajax: page NOT re-emitted (slider stays put)', emitted.length === 0);

  // ── 2. Rapid drag events ──
  emitted.length = 0;
  for (const v of [10, 100, 200, 255]) {
    self._web._triggerRoute('/slider?value=' + v, { ajax: true });
    await sleep(10);
  }
  await sleep(30);
  check('ajax rapid: final duty 255', duty === 255);
  check('ajax rapid: still no re-emit', emitted.length === 0);

  // ── 3. Navigation link click (GPIO dashboard style) ──
  htmlPage = '<html><body>dashboard value=' + duty + '</body></html>';
  emitted.length = 0;
  self._web._triggerRoute('/led1/on'); // no opts -> navigation
  await sleep(30);
  const navEmit = emitted.find(r => r.url === '/');
  check('nav: handler ran (ledOn true)', ledOn === true);
  check('nav: root page re-served after non-HTML handler', !!navEmit && navEmit.content.indexOf('dashboard') !== -1);

  // ── 4. Route params still parsed for ajax ──
  check('serial log shows route hit', serial.some(m => m.indexOf('/slider') !== -1 && m.indexOf('200') !== -1));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
