// js/libraries/max6675.js — MAX6675 Thermocouple Amplifier plugin
//
// Supports: MAX6675 K-type thermocouple-to-digital converter (SPI)
// Usage:
//   MAX6675 thermocouple(CLK, CS, DO);
//   float temp = thermocouple.readCelsius();
//   float tempF = thermocouple.readFahrenheit();
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['MAX6675'] = {
  classes: ['MAX6675'],
  includes: ['<max6675.h>'],

  transpile: [
    // thermocouple.readCelsius()
    [/(\w+)\.readCelsius\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.max6675ReadCelsius(' + v + ')';
    }],
    // thermocouple.readFahrenheit()
    [/(\w+)\.readFahrenheit\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.max6675ReadFahrenheit(' + v + ')';
    }],
  ],

  constructor: function(clk, cs, doPin) {
    return {
      __max6675: true,
      clk: clk,
      cs: cs,
      doPin: doPin,
      readCelsius: function() { return 25; },
      readFahrenheit: function() { return 77; },
    };
  },

  runtime: function(self) {
    function findInst() {
      var canvas = window.CircuitCanvas;
      if (!canvas || !Array.isArray(canvas.components)) return null;
      return canvas.components.find(function(c) { return c.type === 'max6675'; }) || null;
    }
    return {
      max6675ReadCelsius: function(obj) {
        var inst = findInst();
        if (!inst) return 25;
        return (inst.runtimeState && inst.runtimeState.temperature !== undefined) ? inst.runtimeState.temperature : (inst.props ? inst.props.temperature : 25);
      },
      max6675ReadFahrenheit: function(obj) {
        var c = self._a.max6675ReadCelsius(obj);
        return c * 9.0 / 5.0 + 32;
      },
    };
  },
};
