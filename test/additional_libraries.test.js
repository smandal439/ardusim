import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

global.window = {
  ArduinoLibs: {},
  ArduinoComponents: { COMPONENT_DEFS: {} },
  CircuitCanvas: null,
  CppTypes: {
    getTypePattern() {
      return 'void|bool|char|int|float|double|long|short|byte|boolean|unsigned|signed|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|ssize_t';
    },
    getFullTypeRegex() {
      const pattern = this.getTypePattern();
      return new RegExp(`(?:const\\s+)?(?:unsigned\\s+)?(?:${pattern})\\s*\\*?\\s*`, 'g');
    },
  },
};

const root = path.resolve(__dirname, '..');
eval(fs.readFileSync(path.join(root, 'js', 'simulator.js'), 'utf8'));
for (const file of [
  'preferences.js',
  'onewire.js',
  'dallastemperature.js',
  'adafruit_bmp280.js',
  'serial.js',
]) {
  eval(fs.readFileSync(path.join(root, 'js', 'libraries', file), 'utf8'));
}

beforeEach(() => {
  window.CircuitCanvas = null;
});

describe('additional library transpilation', () => {
  it('runs a common DS18B20 and ESP32 Preferences sketch', async () => {
    window.CircuitCanvas = {
      components: [
        { type: 'ds18b20', props: { temperature: 26.5 } },
        { type: 'bme280', props: { temperature: 22, pressure: 1000 } },
      ],
    };
    const sim = new window.ArduinoSimulator();
    const output = [];
    sim._serialLog = text => output.push(String(text));
    const result = await sim.compile(`
      #include <OneWire.h>
      #include <DallasTemperature.h>
      #include <Preferences.h>
      #include <Adafruit_BMP280.h>
      OneWire oneWire(4);
      DallasTemperature sensors(&oneWire);
      Preferences preferences;
      Adafruit_BMP280 bmp;
      void setup() {
        Serial.begin(115200);
        preferences.begin("settings", false);
        preferences.putInt("boots", 3);
        sensors.begin();
        bmp.begin();
        Serial.println(sensors.getTempCByIndex(0));
        Serial.println(preferences.getInt("boots", 0));
        Serial.println(bmp.readTemperature());
      }
      void loop() { delay(1000); }
    `);

    expect(result.ok).toBe(true);
    const { vals, fn } = sim._compiledCtx;
    const sketch = fn(...vals);
    await sketch.setup();
    expect(output.join('')).toContain('26.50\n3\n22\n');
  });
});

describe('DallasTemperature and OneWire simulation', () => {
  it('reads temperature from placed DS18B20 components and resolves ROM addresses', () => {
    window.CircuitCanvas = {
      components: [
        { type: 'ds18b20', props: { temperature: 24.5 } },
        { type: 'ds18b20', runtimeState: { temperature: 31 } },
      ],
    };
    const OneWire = window.ArduinoLibs.OneWire.constructor;
    const DallasTemperature = window.ArduinoLibs.DallasTemperature.constructor;
    const bus = new OneWire(4);
    const sensors = new DallasTemperature(bus);
    const address = new Uint8Array(8);

    expect(bus.search(address)).toBe(true);
    expect(address[0]).toBe(0x28);
    expect(sensors.getDeviceCount()).toBe(2);
    expect(sensors.getTempCByIndex(0)).toBe(24.5);
    expect(sensors.getTempFByIndex(1)).toBeCloseTo(87.8);
    expect(sensors.getAddress(address, 0)).toBe(true);
    expect(sensors.getTempC(address)).toBe(24.5);
  });

  it('returns the disconnected-device sentinel when no DS18B20 is placed', () => {
    const sensors = new window.ArduinoLibs.DallasTemperature.constructor(
      new window.ArduinoLibs.OneWire.constructor(4)
    );

    expect(sensors.getDeviceCount()).toBe(0);
    expect(sensors.getTempCByIndex(0)).toBe(-127);
  });
});

describe('Adafruit_BMP280 simulation', () => {
  it('reads temperature and pressure from the placed BME280 component', () => {
    window.CircuitCanvas = {
      components: [{
        type: 'bme280',
        props: { temperature: 22.5, pressure: 1000 },
      }],
    };
    const bmp = new window.ArduinoLibs.Adafruit_BMP280.constructor();

    expect(bmp.begin()).toBe(true);
    expect(bmp.readTemperature()).toBe(22.5);
    expect(bmp.readPressure()).toBe(100000);
    expect(bmp.readAltitude(1013.25)).toBeGreaterThan(0);
  });

  it('reports initialization failure if no compatible sensor is placed', () => {
    const bmp = new window.ArduinoLibs.Adafruit_BMP280.constructor();

    expect(bmp.begin()).toBe(false);
    expect(Number.isNaN(bmp.readTemperature())).toBe(true);
  });
});

describe('ESP32 Preferences simulation', () => {
  it('stores typed values per namespace across instances', () => {
    const namespace = `preferences-test-${Date.now()}`;
    const Preferences = window.ArduinoLibs.Preferences.constructor;
    const first = new Preferences();
    const second = new Preferences();

    expect(first.begin(namespace, false)).toBe(true);
    expect(first.putInt('count', 17)).toBe(4);
    expect(first.putString('mode', 'auto')).toBe(4);
    expect(first.putString('label', ['o', 'k', '\0', 'x'])).toBe(2);
    expect(first.putString('ssid', [65, 114, 100, 117, 105, 110, 111, 0])).toBe(7);
    first.end();

    expect(second.begin(namespace, true)).toBe(true);
    expect(second.getInt('count', 0)).toBe(17);
    expect(second.getString('mode', '')).toBe('auto');
    expect(second.getString('label', '')).toBe('ok');
    expect(second.getString('ssid', '')).toBe('Arduino');
    expect(second.isKey('count')).toBe(true);
    expect(second.putInt('count', 18)).toBe(0);
    second.end();
  });

  it('removes and clears keys and respects namespace isolation', () => {
    const Preferences = window.ArduinoLibs.Preferences.constructor;
    const first = new Preferences();
    const other = new Preferences();
    first.begin(`preferences-clear-${Date.now()}`, false);
    other.begin(`preferences-other-${Date.now()}`, false);
    first.putBool('enabled', true);

    expect(first.getBool('enabled', false)).toBe(true);
    expect(first.remove('enabled')).toBe(true);
    expect(first.isKey('enabled')).toBe(false);
    first.putInt('value', 3);
    expect(first.clear()).toBe(true);
    expect(first.isKey('value')).toBe(false);
    expect(other.isKey('value')).toBe(false);
  });
});

describe('new library example sketches', () => {
  const examples = [
    {
      file: 'onewire_ds18b20_temperature.json',
      componentType: 'ds18b20',
      serialIncludes: ['DS18B20 devices found: 1', 'Temperature: 26.5 C'],
    },
    {
      file: 'esp32_preferences_settings.json',
      componentType: 'esp32_devkit_v1',
      serialIncludes: ['Boot count: 7', 'Device: ArduSim ESP32', 'bootCount found'],
    },
    {
      file: 'esp32_bmp280_weather_monitor.json',
      componentType: 'bme280',
      serialIncludes: ['BMP280 ready', 'Temperature: 24.5 C', 'Pressure: 1008.0 hPa'],
    },
  ];

  it.each(examples)('loads and runs $file', async ({ file, componentType, serialIncludes }) => {
    const example = JSON.parse(fs.readFileSync(path.join(root, 'Examples', file), 'utf8'));
    const components = example.circuit.components;
    const board = components.find(component =>
      ['arduino_uno', 'esp32_devkit_v1'].includes(component.type)
    );
    expect(board).toBeDefined();
    expect(components.some(component => component.type === componentType)).toBe(true);
    window.CircuitCanvas = { components };

    const sim = new window.ArduinoSimulator();
    sim.setBoard(board.type);
    const output = [];
    sim._serialLog = text => output.push(String(text));
    const result = await sim.compile(example.code);
    expect(result.ok).toBe(true);

    const { vals, fn } = sim._compiledCtx;
    const sketch = fn(...vals);
    sim.speed = 1000;
    await sketch.setup();
    await sketch.loop();
    const serialOutput = output.join('');
    for (const expected of serialIncludes) {
      expect(serialOutput).toContain(expected);
    }
  });
});
