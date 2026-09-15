// js/libraries/ina219.js — INA219 Current/Power Monitor plugin
//
// Supports: Adafruit_INA219 current/power sensor (I2C addr 0x40)
// Usage:
//   Adafruit_INA219 ina219;
//   ina219.begin();
//   float busVoltage = ina219.getBusVoltage_V();
//   float current = ina219.getCurrent_mA();
//   float power = ina219.getPower_mW();
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Adafruit_INA219'] = {
  classes: ['Adafruit_INA219'],
  includes: ['<Adafruit_INA219.h>'],

  transpile: [
    // ina219.begin()
    [/(\w+)\.begin\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.ina219Begin(' + v + ')';
    }],
    // ina219.getBusVoltage_V()
    [/(\w+)\.getBusVoltage_V\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.ina219GetBusVoltage(' + v + ')';
    }],
    // ina219.getShuntVoltage_mV()
    [/(\w+)\.getShuntVoltage_mV\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.ina219GetShuntVoltage(' + v + ')';
    }],
    // ina219.getCurrent_mA()
    [/(\w+)\.getCurrent_mA\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.ina219GetCurrent(' + v + ')';
    }],
    // ina219.getPower_mW()
    [/(\w+)\.getPower_mW\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.ina219GetPower(' + v + ')';
    }],
    // ina219.setCalibration_32V_2A()
    [/(\w+)\.setCalibration_32V_2A\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.ina219SetCalibration32V2A(' + v + ')';
    }],
    // ina219.setCalibration_16V_400mA()
    [/(\w+)\.setCalibration_16V_400mA\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.ina219SetCalibration16V400mA(' + v + ')';
    }],
  ],

  constants: {
    INA219_I2CADDR_DEFAULT: 0x40,
    INA219_CONFIG_BVOLTRANGE_16V: 0x0000,
    INA219_CONFIG_BVOLTRANGE_32V: 0x2000,
    INA219_CONFIG_GAIN_1_40MV: 0x0000,
    INA219_CONFIG_GAIN_2_80MV: 0x0800,
    INA219_CONFIG_GAIN_4_160MV: 0x1000,
    INA219_CONFIG_GAIN_8_320MV: 0x1800,
    INA219_CONFIG_BADCRES_12BIT: 0x0180,
    INA219_CONFIG_BADCRES_12BIT_1S: 0x0180,
    INA219_CONFIG_BADCRES_12BIT_2S: 0x0190,
    INA219_CONFIG_BADCRES_12BIT_4S: 0x01A0,
    INA219_CONFIG_BADCRES_12BIT_8S: 0x01B0,
    INA219_CONFIG_BADCRES_12BIT_16S: 0x01C0,
    INA219_CONFIG_BADCRES_12BIT_32S: 0x01D0,
    INA219_CONFIG_BADCRES_12BIT_64S: 0x01E0,
    INA219_CONFIG_BADCRES_12BIT_128S: 0x01F0,
    INA219_CONFIG_SADCRES_12BIT: 0x0018,
    INA219_CONFIG_MODE_CONT_SHUNT_BUS: 0x0007,
  },

  constructor: function() {
    return {
      __ina219: true,
      addr: 0x40,
      begin: function() {},
      getBusVoltage_V: function() { return 5.0; },
      getShuntVoltage_mV: function() { return 0; },
      getCurrent_mA: function() { return 100; },
      getPower_mW: function() { return 500; },
      setCalibration_32V_2A: function() {},
      setCalibration_16V_400mA: function() {},
    };
  },

  runtime: function(self) {
    function findInst() {
      var canvas = window.CircuitCanvas;
      if (!canvas || !Array.isArray(canvas.components)) return null;
      return canvas.components.find(function(c) { return c.type === 'ina219'; }) || null;
    }
    return {
      ina219Begin: function(obj) {
        self._serialLog('[INA219] Initialized at I2C address 0x40\n', 'system');
        return true;
      },
      ina219GetBusVoltage: function(obj) {
        var inst = findInst();
        if (!inst) return 5.0;
        return (inst.runtimeState && inst.runtimeState.voltage !== undefined) ? inst.runtimeState.voltage : (inst.props ? inst.props.voltage : 5.0);
      },
      ina219GetShuntVoltage: function(obj) {
        var inst = findInst();
        if (!inst) return 0;
        return (inst.runtimeState && inst.runtimeState.shuntVoltage !== undefined) ? inst.runtimeState.shuntVoltage : 0;
      },
      ina219GetCurrent: function(obj) {
        var inst = findInst();
        if (!inst) return 100;
        return (inst.runtimeState && inst.runtimeState.current !== undefined) ? inst.runtimeState.current : (inst.props ? inst.props.current : 100);
      },
      ina219GetPower: function(obj) {
        var inst = findInst();
        if (!inst) return 500;
        return (inst.runtimeState && inst.runtimeState.power !== undefined) ? inst.runtimeState.power : (inst.props ? inst.props.power : 500);
      },
      ina219SetCalibration32V2A: function(obj) {},
      ina219SetCalibration16V400mA: function(obj) {},
    };
  },
};
