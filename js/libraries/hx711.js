/**
 * HX711 Load Cell Amplifier Library Plugin for ArduSim
 *
 * Supports the bogde/HX711 Arduino library.
 * Transpiles HX711 constructor and method calls to runtime reads
 * from the connected load cell via the hx711 component.
 *
 * Typical Arduino code:
 *   #include "HX711.h"
 *   HX711 scale(DT_PIN, SCK_PIN);
 *   void setup() { scale.set_scale(2280); scale.tare(); }
 *   void loop() { Serial.println(scale.get_units(), 1); }
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['HX711'] = {
  classes: ['HX711'],
  includes: ['<HX711.h>', '"HX711.h"'],

  transpile: [
    /* HX711 varName(DT_PIN, SCK_PIN); → handled by generic constructor at line 256 */
  ],

  constructor: function (dtPin, sckPin) {
    function _findHx711() {
      var canvas = window.CircuitCanvas;
      if (!canvas || !Array.isArray(canvas.components)) return null;
      return canvas.components.find(function (c) { return c.type === 'hx711'; }) || null;
    }

    var _scale = 1.0;
    var _offset = 0;
    var _tareValue = 0;
    var _isReady = true;

    return {
      begin: function () { },
      is_ready: function () { return true; },

      set_scale: function (factor) {
        _scale = factor || 1.0;
        var inst = _findHx711();
        if (inst && inst.runtimeState) inst.runtimeState._scale = _scale;
      },
      get_scale: function () { return _scale; },

      set_offset: function (off) { _offset = off || 0; },
      get_offset: function () { return _offset; },

      tare: function () {
        var inst = _findHx711();
        if (inst) {
          var rs = inst.runtimeState || {};
          var raw = rs._netWeight ?? 0;
          _tareValue = raw;
          _offset = raw;
        } else {
          _tareValue = 0;
          _offset = 0;
        }
      },

      get_units: function (samples) {
        var inst = _findHx711();
        if (!inst) return 0;
        var rs = inst.runtimeState || {};
        var raw = rs._netWeight ?? 0;
        return (raw - _offset) / _scale;
      },

      get_value: function (samples) {
        var inst = _findHx711();
        if (!inst) return 0;
        var rs = inst.runtimeState || {};
        var raw = rs._netWeight ?? 0;
        return raw - _offset;
      },

      read: function () {
        var inst = _findHx711();
        if (!inst) return 0;
        var rs = inst.runtimeState || {};
        return rs._netWeight ?? 0;
      },

      power_down: function () { },
      power_up: function () { },
    };
  },

  runtime: function (self) {
    return {};
  },
};
