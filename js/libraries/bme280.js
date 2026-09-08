/**
 * SimpleBME280 Library Plugin for ArduSim
 * 
 * Supports: SimpleBME280, BME280 temperature/humidity/pressure sensor
 * Usage:
 *   SimpleBME280 bme;
 *   bme.begin();
 *   float temp = bme.readTemperature();
 *   float hum = bme.readHumidity();
 *   float pres = bme.readPressure();
 *   float alt = bme.readAltitude(1013.25);
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['BME280'] = {
  classes: ['SimpleBME280'],
  includes: ['<SimpleBME280.h>'],

  transpile: [
    // .begin() — match bme/sensor/bmp/bme280 prefix + class name
    [/\b(\w+)\.begin\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280Begin(' + v + ');';
      return m;
    }],
    // .readTemperature() — with and without semicolon
    [/\b(\w+)\.readTemperature\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadTemp(' + v + ');';
      return m;
    }],
    [/\b(\w+)\.readTemperature\s*\(\s*\)/g, function(m, v) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadTemp(' + v + ')';
      return m;
    }],
    // .readHumidity()
    [/\b(\w+)\.readHumidity\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadHum(' + v + ');';
      return m;
    }],
    [/\b(\w+)\.readHumidity\s*\(\s*\)/g, function(m, v) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadHum(' + v + ')';
      return m;
    }],
    // .readPressure()
    [/\b(\w+)\.readPressure\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadPres(' + v + ');';
      return m;
    }],
    [/\b(\w+)\.readPressure\s*\(\s*\)/g, function(m, v) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadPres(' + v + ')';
      return m;
    }],
    // .readAltitude(seaLevel)
    [/\b(\w+)\.readAltitude\s*\(\s*([^)]+)\)\s*;/g, function(m, v, sl) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadAlt(' + v + ', ' + sl + ');';
      return m;
    }],
    [/\b(\w+)\.readAltitude\s*\(\s*([^)]+)\)/g, function(m, v, sl) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadAlt(' + v + ', ' + sl + ')';
      return m;
    }],
  ],

  constructor: function() {
    return {
      __class: 'SimpleBME280',
      begin: function() {},
      readTemperature: function() { return 25; },
      readHumidity: function() { return 50; },
      readPressure: function() { return 101325; },
      readAltitude: function(seaLevel) { return 0; },
    };
  },

  runtime: function(self) {
    function findInst() {
      var canvas = window.CircuitCanvas;
      if (!canvas || !Array.isArray(canvas.components)) return null;
      return canvas.components.find(function(c) { return c.type === 'bme280'; }) || null;
    }
    return {
      bme280Begin: function(obj) { return true; },
      bme280ReadTemp: function(obj) {
        var inst = findInst();
        if (!inst) return 25;
        return (inst.runtimeState && inst.runtimeState.temperature !== undefined) ? inst.runtimeState.temperature : (inst.props ? inst.props.temperature : 25);
      },
      bme280ReadHum: function(obj) {
        var inst = findInst();
        if (!inst) return 50;
        return (inst.runtimeState && inst.runtimeState.humidity !== undefined) ? inst.runtimeState.humidity : (inst.props ? inst.props.humidity : 50);
      },
      bme280ReadPres: function(obj) {
        var inst = findInst();
        var hpa = 1013.25;
        if (inst) {
          hpa = (inst.runtimeState && inst.runtimeState.pressure !== undefined) ? inst.runtimeState.pressure : (inst.props ? inst.props.pressure : 1013.25);
        }
        return hpa * 100;
      },
      bme280ReadAlt: function(obj, seaLevel) {
        var pres = findInst();
        var hpa = 1013.25;
        if (pres) {
          hpa = (pres.runtimeState && pres.runtimeState.pressure !== undefined) ? pres.runtimeState.pressure : (pres.props ? pres.props.pressure : 1013.25);
        }
        var presPa = hpa * 100;
        return 44330.0 * (1.0 - Math.pow(presPa / 100.0 / (seaLevel || 1013.25), 0.1903));
      },
    };
  },
};
