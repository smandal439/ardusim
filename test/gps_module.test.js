import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const readSrc = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

global.window = {
  ArduinoLibs: {},
  ArduinoComponents: { COMPONENT_DEFS: {} },
  CircuitCanvas: null,
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

const sourceFiles = [
  'js/electrical.js',
  'js/components/base.js',
  'js/components/boards.js',
  'js/components/input.js',
  'js/components/output.js',
  'js/components/passive.js',
  'js/components/power.js',
  'js/components/sensors.js',
];
const loadComponents = new Function(
  'window',
  'document',
  sourceFiles.map(readSrc).join('\n;\n') +
    '\n;return window.ArduinoComponents.COMPONENT_DEFS;',
);
const COMPONENT_DEFS = loadComponents(global.window, global.document);
new Function('window', readSrc('js/libraries/tinygps.js'))(global.window);
const gpsDef = COMPONENT_DEFS.gps_neo6m;
const createGps = (overrides = {}) => ({
  type: 'gps_neo6m',
  props: { ...gpsDef.defaultProps, ...overrides },
  runtimeState: {},
});
const checksumValid = sentence => {
  const [body, checksum] = sentence.slice(1).trim().split('*');
  let actual = 0;
  for (const char of body) actual ^= char.charCodeAt(0);
  return actual === parseInt(checksum, 16);
};
const decodeStream = text => {
  const parser = global.window.ArduinoLibs.TinyGPSPlus.constructor();
  let decoded = 0;
  for (const char of text) if (parser._gps_encode(char)) decoded++;
  return { parser, decoded };
};

afterEach(() => {
  global.window.CircuitCanvas = null;
});

describe('GPS NEO-6M/8M simulation', () => {
  it('emits checksummed GGA and RMC sentences and decodes their fix data', () => {
    const gps = createGps({ speedKmph: 36, courseDeg: 90 });
    const sent = [];
    const sim = { isRunning: true, simTime: 0, sendSerialInput: value => sent.push(value) };

    gpsDef.step(gps, sim);
    sim.simTime = 3000;
    gpsDef.step(gps, sim);

    const sentences = sent.at(-1).trim().split('\r\n');
    expect(sentences.map(sentence => sentence.slice(3, 6))).toEqual(['GGA', 'RMC']);
    expect(sentences.every(checksumValid)).toBe(true);
    const rmcFields = sentences[1].slice(1, sentences[1].indexOf('*')).split(',');

    const { parser, decoded } = decodeStream(sentences.join('\r\n') + '\r\n');
    expect(decoded).toBe(2);
    expect(parser._gps_locationIsValid()).toBe(true);
    expect(parser._gps_locationLat()).toBeCloseTo(28.6139, 4);
    expect(parser._gps_locationLng()).toBeCloseTo(77.209, 4);
    expect(parser._gps_speedKmph()).toBeCloseTo(36, 1);
    expect(parser._gps_courseDeg()).toBeCloseTo(90, 1);
    expect(parser._gps_satellites()).toBe(8);
    expect(parser._gps_timeIsValid()).toBe(true);
    expect(`${String(parser._gps_timeHour()).padStart(2, '0')}${String(parser._gps_timeMinute()).padStart(2, '0')}${String(parser._gps_timeSecond()).padStart(2, '0')}`)
      .toBe(rmcFields[1].slice(0, 6));
    expect(parser._gps_dateIsValid()).toBe(true);
    expect(`${String(parser._gps_dateDay()).padStart(2, '0')}${String(parser._gps_dateMonth()).padStart(2, '0')}${String(parser._gps_dateYear()).slice(-2)}`)
      .toBe(rmcFields[9]);
    expect(parser._gps_passedChecksum()).toBe(2);
  });

  it('requires four satellites and an acquisition interval before reporting a fix', () => {
    const gps = createGps({ satellites: 3 });
    const sent = [];
    const sim = { isRunning: true, simTime: 0, sendSerialInput: value => sent.push(value) };

    gpsDef.step(gps, sim);
    expect(sent[0]).toContain('GPGGA');
    expect(sent[0]).toContain(',0,3,,');
    expect(sent[0]).toContain(',V,,,,,,,');
    expect(decodeStream(sent[0]).parser._gps_locationIsValid()).toBe(false);

    gps.runtimeState.satellites = 8;
    sim.simTime = 1000;
    gpsDef.step(gps, sim);
    sim.simTime = 3000;
    gpsDef.step(gps, sim);
    expect(gps.runtimeState.hasFix).toBe(false);
    sim.simTime = 4000;
    gpsDef.step(gps, sim);
    expect(gps.runtimeState.hasFix).toBe(true);
    expect(sent.at(-1)).toContain(',1,8,');

    gps.runtimeState.satellites = 0;
    sim.simTime = 5000;
    gpsDef.step(gps, sim);
    expect(gps.runtimeState.hasFix).toBe(false);
    expect(sent.at(-1)).toContain(',V,,,,,,,');
  });

  it('moves along the configured course after acquiring a fix', () => {
    const gps = createGps({ speedKmph: 36, courseDeg: 90 });
    const sim = { isRunning: true, simTime: 0, sendSerialInput() {} };

    gpsDef.step(gps, sim);
    sim.simTime = 3000;
    gpsDef.step(gps, sim);
    const initialLongitude = gps.runtimeState.longitude;
    sim.simTime = 4000;
    gpsDef.step(gps, sim);

    expect(gps.runtimeState.longitude).toBeGreaterThan(initialLongitude);
    expect(gps.runtimeState.latitude).toBeCloseTo(28.6139, 5);
  });

  it('stops transmitting while powered off and reacquires after power returns', () => {
    const gps = createGps({ powered: false });
    const sent = [];
    const sim = { isRunning: true, simTime: 0, sendSerialInput: value => sent.push(value) };

    gpsDef.step(gps, sim);
    expect(sent).toEqual([]);

    gps.runtimeState.powered = true;
    sim.simTime = 1000;
    gpsDef.step(gps, sim);
    expect(sent).toHaveLength(1);
    expect(gps.runtimeState.hasFix).toBe(false);
  });

  it('rejects invalid NMEA checksums without reporting decoded data', () => {
    const parser = global.window.ArduinoLibs.TinyGPSPlus.constructor();
    const invalidSentence = '$GPGGA,123519.00,2836.8340,N,07712.5400,E,1,08,1.0,215.0,M,0.0,M,,*00\r\n';

    let decoded = false;
    for (const char of invalidSentence) decoded = parser._gps_encode(char) || decoded;

    expect(decoded).toBe(false);
    expect(parser._gps_passedChecksum()).toBe(0);
    expect(parser._gps_failedChecksum()).toBe(1);
    expect(parser._gps_locationIsValid()).toBe(false);
  });
});
