// js/libraries/bh1750.js — BH1750 Light Intensity Sensor plugin
//
// Supports: BH1750 ambient light sensor (I2C)
// Usage:
//   BH1750 light;
//   light.begin();
//   float lux = light.readLightLevel();
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['BH1750'] = {
  classes: ['BH1750'],
  includes: ['<BH1750.h>'],

  transpile: [
    // BH1750:: enum constants → numeric values
    [/\bBH1750\s*::\s*CONTINUOUS_HIGH_RES_MODE_2\b/g, '0x11'],
    [/\bBH1750\s*::\s*CONTINUOUS_HIGH_RES_MODE\b/g, '0x10'],
    [/\bBH1750\s*::\s*CONTINUOUS_LOW_RES_MODE\b/g, '0x13'],
    [/\bBH1750\s*::\s*ONE_TIME_HIGH_RES_MODE_2\b/g, '0x21'],
    [/\bBH1750\s*::\s*ONE_TIME_HIGH_RES_MODE\b/g, '0x20'],
    [/\bBH1750\s*::\s*ONE_TIME_LOW_RES_MODE\b/g, '0x23'],
    // light.begin(mode)
    [/(\w+)\.begin\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.bh1750Begin(' + v + ', ' + a + ')';
    }],
    // light.readLightLevel()
    [/(\w+)\.readLightLevel\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.bh1750ReadLight(' + v + ')';
    }],
    // light.configure(mode)
    [/(\w+)\.configure\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.bh1750Configure(' + v + ', ' + a + ')';
    }],
  ],

  constants: {
    BH1750_I2CADDR: 0x23,
    BH1750_CONTINUOUS_HIGH_RES_MODE: 0x10,
    BH1750_CONTINUOUS_HIGH_RES_MODE_2: 0x11,
    BH1750_CONTINUOUS_LOW_RES_MODE: 0x13,
    BH1750_ONE_TIME_HIGH_RES_MODE: 0x20,
    BH1750_ONE_TIME_HIGH_RES_MODE_2: 0x21,
    BH1750_ONE_TIME_LOW_RES_MODE: 0x23,
  },

  constructor: function() {
    return {
      __bh1750: true,
      addr: 0x23,
      mode: 0x10,
      begin: function(mode) { this.mode = mode || 0x10; },
      readLightLevel: function() { return 400; },
      configure: function(mode) { this.mode = mode; },
    };
  },

  runtime: function(self) {
    function findInst() {
      var canvas = window.CircuitCanvas;
      if (!canvas || !Array.isArray(canvas.components)) return null;
      return canvas.components.find(function(c) { return c.type === 'bh1750'; }) || null;
    }
    return {
      bh1750Begin: function(obj, mode) {
        if (obj) obj.mode = mode || 0x10;
        self._serialLog('[BH1750] Initialized\n', 'system');
        return true;
      },
      bh1750ReadLight: function(obj) {
        var inst = findInst();
        if (!inst) return 400;
        return (inst.runtimeState && inst.runtimeState.lux !== undefined) ? inst.runtimeState.lux : (inst.props ? inst.props.lux : 400);
      },
      bh1750Configure: function(obj, mode) {
        if (obj) obj.mode = mode;
      },
    };
  },
};
