window.ArduinoLibs = window.ArduinoLibs || {};

window.ArduinoLibs['DallasTemperature'] = {
  classes: ['DallasTemperature'],
  includes: ['<DallasTemperature.h>'],
  transpile: [],
  constants: {
    DEVICE_DISCONNECTED_C: -127,
    DEVICE_DISCONNECTED_F: -196.6,
    DEVICE_FAULT_OPEN: -127,
    DEVICE_FAULT_SHORT: 85,
    TEMPERATURE_PRECISION: 12,
  },
  constructor: function(oneWire) {
    function devices() {
      var components = window.CircuitCanvas && window.CircuitCanvas.components;
      return Array.isArray(components)
        ? components.filter(function(component) { return component.type === 'ds18b20'; })
        : [];
    }

    function temperature(component) {
      if (!component) return -127;
      var state = component.runtimeState || {};
      var props = component.props || {};
      var value = state.temperature !== undefined ? state.temperature : props.temperature;
      return Number.isFinite(Number(value)) ? Number(value) : 25;
    }

    function findIndex(address) {
      if (!oneWire || typeof oneWire.addressFor !== 'function') return -1;
      var target = Array.from(address || []);
      return devices().findIndex(function(_, index) {
        return oneWire.addressFor(index).every(function(byte, byteIndex) {
          return target[byteIndex] === byte;
        });
      });
    }

    return {
      begin: function() {},
      requestTemperatures: function() {},
      requestTemperaturesByAddress: function() {},
      requestTemperaturesByIndex: function() {},
      getDeviceCount: function() { return devices().length; },
      getDS18Count: function() { return devices().length; },
      getTempCByIndex: function(index) { return temperature(devices()[Number(index)]); },
      getTempFByIndex: function(index) { return this.getTempCByIndex(index) * 9 / 5 + 32; },
      getTempC: function(address) { return temperature(devices()[findIndex(address)]); },
      getTempF: function(address) { return this.getTempC(address) * 9 / 5 + 32; },
      getAddress: function(address, index) {
        var component = devices()[Number(index)];
        if (!component || !oneWire || typeof oneWire.addressFor !== 'function') return false;
        var rom = oneWire.addressFor(Number(index));
        for (var i = 0; i < rom.length; i++) address[i] = rom[i];
        return true;
      },
      isConnected: function(address) { return findIndex(address) >= 0; },
      setResolution: function() { return true; },
      getResolution: function() { return 12; },
      setWaitForConversion: function() {},
      setCheckForConversion: function() {},
      millisToWaitForConversion: function() { return 750; },
    };
  },
};
