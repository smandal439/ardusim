window.ArduinoLibs = window.ArduinoLibs || {};

window.ArduinoLibs['Adafruit_BMP280'] = {
  classes: ['Adafruit_BMP280'],
  includes: ['<Adafruit_BMP280.h>'],
  transpile: [],
  constants: {
    BMP280_ADDRESS: 0x77,
    BMP280_ADDRESS_ALT: 0x76,
    BMP280_CHIPID: 0x58,
    BMP280_SAMPLING_NONE: 0,
    BMP280_SAMPLING_X1: 1,
    BMP280_SAMPLING_X2: 2,
    BMP280_SAMPLING_X4: 3,
    BMP280_SAMPLING_X8: 4,
    BMP280_SAMPLING_X16: 5,
    BMP280_FILTER_OFF: 0,
    BMP280_FILTER_X2: 1,
    BMP280_FILTER_X4: 2,
    BMP280_FILTER_X8: 3,
    BMP280_FILTER_X16: 4,
    BMP280_STANDBY_MS_1: 0,
    BMP280_STANDBY_MS_10: 6,
    BMP280_STANDBY_MS_20: 7,
    BMP280_STANDBY_MS_63: 1,
    BMP280_STANDBY_MS_125: 2,
    BMP280_STANDBY_MS_250: 3,
    BMP280_STANDBY_MS_500: 4,
    BMP280_STANDBY_MS_1000: 5,
  },
  constructor: function(address) {
    function findSensor() {
      var components = window.CircuitCanvas && window.CircuitCanvas.components;
      if (!Array.isArray(components)) return null;
      return components.find(function(component) {
        return component.type === 'bme280' || component.type === 'bmp280';
      }) || null;
    }

    function read(property, fallback) {
      var component = findSensor();
      if (!component) return NaN;
      var state = component.runtimeState || {};
      var props = component.props || {};
      var value = state[property] !== undefined ? state[property] : props[property];
      return Number.isFinite(Number(value)) ? Number(value) : fallback;
    }

    return {
      address: Number(address) || 0x77,
      begin: function() { return findSensor() !== null; },
      readTemperature: function() { return read('temperature', 25); },
      readPressure: function() { return read('pressure', 1013.25) * 100; },
      readAltitude: function(seaLevelPressure) {
        var pressure = this.readPressure();
        if (!Number.isFinite(pressure)) return NaN;
        var seaLevel = Number(seaLevelPressure) || 1013.25;
        return 44330 * (1 - Math.pow(pressure / (seaLevel * 100), 0.1903));
      },
      takeForcedMeasurement: function() { return findSensor() !== null; },
      setSampling: function() {},
      getStatus: function() { return findSensor() ? 0 : 1; },
      sensorID: function() { return findSensor() ? 0x58 : 0; },
      getMeasurementDuration: function() { return 0; },
    };
  },
};
