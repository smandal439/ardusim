window.ArduinoLibs = window.ArduinoLibs || {};

window.ArduinoLibs['OneWire'] = {
  classes: ['OneWire'],
  includes: ['<OneWire.h>', '<DallasTemperature.h>'],
  transpile: [],
  constants: {
    ONEWIRE_SEARCH: 0xF0,
    ONEWIRE_READ: 0x33,
    ONEWIRE_MATCH: 0x55,
    ONEWIRE_SKIP: 0xCC,
    ONEWIRE_CONVERT_T: 0x44,
    ONEWIRE_READ_SCRATCHPAD: 0xBE,
  },
  constructor: function(pin) {
    var cursor = 0;

    function devices() {
      var components = window.CircuitCanvas && window.CircuitCanvas.components;
      return Array.isArray(components)
        ? components.filter(function(component) { return component.type === 'ds18b20'; })
        : [];
    }

    function addressFor(index) {
      var rom = [0x28, 0xFF, 0, 0, 0, 0, (index + 1) & 0xFF];
      var crc = 0;
      for (var byteIndex = 0; byteIndex < rom.length; byteIndex++) {
        var value = rom[byteIndex];
        for (var bitIndex = 0; bitIndex < 8; bitIndex++) {
          var mix = (crc ^ value) & 1;
          crc >>= 1;
          if (mix) crc ^= 0x8C;
          value >>= 1;
        }
      }
      rom.push(crc);
      return rom;
    }

    return {
      pin: Number(pin) || 0,
      begin: function() {},
      reset: function() { return devices().length > 0; },
      reset_search: function() { cursor = 0; },
      search: function(address) {
        if (cursor >= devices().length) return false;
        var rom = addressFor(cursor++);
        if (address) {
          for (var i = 0; i < rom.length; i++) address[i] = rom[i];
        }
        return true;
      },
      select: function() {},
      skip: function() {},
      write: function() {},
      read: function() { return 0; },
      read_bit: function() { return 0; },
      write_bit: function() {},
      depower: function() {},
      addressFor: addressFor,
      deviceCount: function() { return devices().length; },
    };
  },
};
