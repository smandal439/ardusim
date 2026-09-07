// window.ArduinoLibs = window.ArduinoLibs || {};
// window.ArduinoLibs['Adafruit_VL53L0X'] = {
//   classes: ['Adafruit_VL53L0X'],
//   includes: ['<Adafruit_VL53L0X.h>'],
//   transpile: [],
//   constants: {},
// };


// js/libraries/vl53l0x.js
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['VL53L0X'] = {
includes: ['<Adafruit_VL53L0X.h>'],
  // Class names this library provides
  classes: ['VL53L0X', 'Adafruit_VL53L0X'],
  
  // No transpile rules — method names stay as-is (matches constructor object)
  transpile: [],

  // Runtime — empty (all logic lives in constructor which reads from CircuitCanvas)
  runtime: function(self) { return {}; },

  // Constructor — what `new Adafruit_VL53L0X(args)` returns
  constructor: function(args) {
    return {
      init: function(i2c_addr) { return true; },
      begin: function(i2c_addr) { return true; },
      rangingTest: function(measure, verbose) {
        var canvas = window.CircuitCanvas;
        var inst = canvas && canvas.components.find(function(c) { return c.type === 'vl53l0x'; });
        if (inst) {
          var dist = (inst.runtimeState && inst.runtimeState.distance !== undefined)
            ? inst.runtimeState.distance
            : (inst.props ? inst.props.distance : 100);
          measure.RangeMilliMeter = dist;
          measure.RangeStatus = dist > 0 ? 0 : 4;
        } else {
          measure.RangeMilliMeter = 0;
          measure.RangeStatus = 4;
        }
      },
      readRangeSingleMillimeters: function() { return 200; },
      readRangeContinuousMillimeters: function() { return 200; },
      readRange: function() { return 200; },
      setTimeout: function(timeout) {},
      timeoutOccurred: function() { return false; },
      startContinuous: function(period_ms) {},
      stopContinuous: function() {},
      setAddress: function(new_addr) {},
    };
  },

  // Constants — injected as global variables
  constants: {
    VL53L0X_ADDRESS_DEFAULT: 0x29,
    VL53L0X_OUT_OF_RANGE: 8190,
    VL53L0X_SENSE_DEFAULT: 0,
    VL53L0X_SENSE_HIGH_ACCURACY: 1,
    VL53L0X_SENSE_LONG_RANGE: 2,
    VL53L0X_SENSE_HIGH_SPEED: 3,
  },
};