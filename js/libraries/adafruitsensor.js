// js/libraries/adafruitsensor.js — Adafruit Unified Sensor base library plugin
//
// Base dependency for Adafruit sensor libraries (MPU6050, BME280, etc.)
// Provides sensors_event_t struct and basic sensor abstraction.
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Adafruit_Sensor'] = {
  classes: ['Adafruit_Sensor', 'sensors_event_t', 'sensors_t'],
  includes: ['<Adafruit_Sensor.h>'],
  priority: 10,

  transpile: [
    // sensors_event_t event; → var event = { ... };
    [/\bsensors_event_t\s+(\w+)\s*;/g, 'var $1 = { acceleration:{x:0,y:0,z:0}, gyro:{x:0,y:0,z:0}, temperature:0, magnetic:{x:0,y:0,z:0}, light:0, pressure:0, humidity:0 };'],

    // sensors_t sensor; → var sensor = { ... };
    [/\bsensors_t\s+(\w+)\s*;/g, 'var $1 = { sensor_id:0, type:0, name:"" };'],

    // obj.getEvent(&event) → _a.sensorGetEvent(obj, event)
    [/(\w+)\.getEvent\s*\(\s*&(\w+)\s*\)/g, function(m, v, e) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial)$/i.test(v)) return m;
      return '_a.sensorGetEvent(' + v + ', ' + e + ')';
    }],

    // obj.getSensor(&sensor) → _a.sensorGetSensor(obj, sensor)
    [/(\w+)\.getSensor\s*\(\s*&(\w+)\s*\)/g, function(m, v, s) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial)$/i.test(v)) return m;
      return '_a.sensorGetSensor(' + v + ', ' + s + ')';
    }],

    // obj.enableAutoRange(flag) → _a.sensorEnableAutoRange(obj, flag)
    [/(\w+)\.enableAutoRange\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial)$/i.test(v)) return m;
      return '_a.sensorEnableAutoRange(' + v + ', ' + a + ')';
    }],

    // obj.printSensorDetails() → _a.sensorPrintDetails(obj)
    [/(\w+)\.printSensorDetails\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial)$/i.test(v)) return m;
      return '_a.sensorPrintDetails(' + v + ')';
    }],
  ],

  constants: {
    SENSOR_TYPE_ACCELEROMETER: 1,
    SENSOR_TYPE_MAGNETIC_FIELD: 2,
    SENSOR_TYPE_ORIENTATION: 3,
    SENSOR_TYPE_GYROSCOPE: 4,
    SENSOR_TYPE_LIGHT: 5,
    SENSOR_TYPE_PRESSURE: 6,
    SENSOR_TYPE_RELATIVE_HUMIDITY: 7,
    SENSOR_TYPE_TEMPERATURE: 8,
    SENSOR_TYPE_GRAVITY: 9,
    SENSOR_TYPE_LINEAR_ACCELERATION: 10,
    SENSOR_TYPE_ROTATION_VECTOR: 11,
    SENSOR_TYPE_HUMIDITY: 12,
    SENSOR_TYPE_AMBIENT_TEMPERATURE: 13,
    SENSOR_TYPE_OBJECT_TEMPERATURE: 14,
    SENSOR_TYPE_VOLTAGE: 15,
    SENSOR_TYPE_CURRENT: 16,
    SENSOR_TYPE_COLOR: 17,
  },

  constructor: function() {
    return {
      begin: function() { return true; },
      getEvent: function() { return true; },
      getSensor: function() { return true; },
      enableAutoRange: function() {},
      printSensorDetails: function() {},
    };
  },

  runtime: function(self) {
    return {
      sensorGetEvent: function(obj, event) {
        if (event) {
          event.temperature = 25;
          event.acceleration = { x: 0, y: 0, z: 9.81 };
          event.gyro = { x: 0, y: 0, z: 0 };
          event.magnetic = { x: 0, y: 0, z: 0 };
          event.light = 400;
          event.pressure = 1013.25;
          event.humidity = 50;
        }
        return true;
      },
      sensorGetSensor: function(obj, sensor) {
        if (sensor) {
          sensor.sensor_id = 0;
          sensor.type = 0;
          sensor.name = 'Unknown Sensor';
        }
        return true;
      },
      sensorEnableAutoRange: function(obj, flag) {},
      sensorPrintDetails: function(obj) {
        self._serialLog('[Sensor] Sensor details: Unknown\n', 'system');
      },
    };
  },
};
