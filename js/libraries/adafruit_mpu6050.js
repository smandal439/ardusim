// js/libraries/adafruit_mpu6050.js
window.ArduinoLibs = window.ArduinoLibs || {};

window.ArduinoLibs['Adafruit_MPU6050'] = {
  classes: ['Adafruit_MPU6050', 'sensors_event_t'],
  includes: ['<Adafruit_MPU6050.h>', '<Adafruit_Sensor.h>'],
  dependencies: ['Wire', 'Adafruit_Sensor'],
//   priority: 110,
  transpile: [
    // Include & setup matches
    [/#include\s*<Adafruit_MPU6050\.h>/g, ''],
    [/#include\s*<Adafruit_Sensor\.h>/g, ''],

    // Object creation & initialization
    [/Adafruit_MPU6050\s+([a-zA-Z0-9_]+)\s*;/g, 'var $1 = new _a._Adafruit_MPU6050();'],
    [/sensors_event_t\s+([a-zA-Z0-9_]+(?:\s*,\s*[a-zA-Z0-9_]+)*)\s*;/g, (_, names) =>
      names.split(',').map(name => `var ${name.trim()} = { acceleration: {x:0, y:0, z:0}, gyro: {x:0, y:0, z:0}, temperature: 0 };`).join(' ')],

    // Method calls
    [/\.begin\s*\(([^)]*)\)/g, '._begin($1)'],
    [/\.getEvent\s*\(\s*&([^,]+)\s*,\s*&([^,]+)\s*,\s*&([^)]+)\s*\)/g, '._getEvent($1, $2, $3)'],
    [/\.setAccelerometerRange\s*\(([^)]*)\)/g, '._setAccelRange($1)'],
    [/\.setGyroRange\s*\(([^)]*)\)/g, '._setGyroRange($1)'],
    [/\.setFilterBandwidth\s*\(([^)]*)\)/g, '._setFilterBandwidth($1)']
  ],

  runtime: function(self) {
    function findMpu6050() {
      var canvas = window.CircuitCanvas;
      return canvas && Array.isArray(canvas.components)
        ? canvas.components.find(function(comp) { return comp.type === 'mpu6050'; })
        : null;
    }

    return {
      _Adafruit_MPU6050: function() {
        this.address = 0x68;
        this.accelRange = 0; // MPU6050_RANGE_2_G
        this.gyroRange = 0;  // MPU6050_RANGE_250_DEG
        this.bandwidth = 0;

        this._begin = function(addr) {
          if (addr !== undefined) this.address = addr;
          var comp = findMpu6050();
          if (comp) {
            self._serialLog('[MPU6050] Initialized at I2C address 0x' + this.address.toString(16) + '\n', 'system');
            return true;
          }
          self._serialLog('[MPU6050] Warning: No MPU6050 component found on I2C bus!\n', 'error');
          return false;
        };

        this._getEvent = function(a, g, temp) {
          var comp = findMpu6050();
          
          // Raw hardware values from component props/runtime state (default 1024 = ~1G)
          var axRaw = comp ? (comp.runtimeState?.accelX ?? comp.props?.accelX ?? 0) : 0;
          var ayRaw = comp ? (comp.runtimeState?.accelY ?? comp.props?.accelY ?? 0) : 0;
          var azRaw = comp ? (comp.runtimeState?.accelZ ?? comp.props?.accelZ ?? 1024) : 1024;

          var gxRaw = comp ? (comp.runtimeState?.gyroX ?? comp.props?.gyroX ?? 0) : 0;
          var gyRaw = comp ? (comp.runtimeState?.gyroY ?? comp.props?.gyroY ?? 0) : 0;
          var gzRaw = comp ? (comp.runtimeState?.gyroZ ?? comp.props?.gyroZ ?? 0) : 0;

          // Standard conversions: 1024 raw units = 9.81 m/s² (1g), gyro in rad/s
          var SENSITIVITY_ACCEL = 1024 / 9.81;
          var SENSITIVITY_GYRO = 131.0 * (180.0 / Math.PI); // LSB per rad/s

          if (a) {
            a.acceleration = {
              x: axRaw / SENSITIVITY_ACCEL,
              y: ayRaw / SENSITIVITY_ACCEL,
              z: azRaw / SENSITIVITY_ACCEL
            };
          }

          if (g) {
            g.gyro = {
              x: gxRaw / SENSITIVITY_GYRO,
              y: gyRaw / SENSITIVITY_GYRO,
              z: gzRaw / SENSITIVITY_GYRO
            };
          }

          if (temp) {
            temp.temperature = comp ? (comp.runtimeState?.temp ?? comp.props?.temp ?? 23.5) : 23.5;
          }

          return true;
        };

        this._setAccelRange = function(range) { this.accelRange = range; };
        this._setGyroRange = function(range) { this.gyroRange = range; };
        this._setFilterBandwidth = function(bw) { this.bandwidth = bw; };
      }
    };
  },

  constructor: function(_args) {
    return {
      begin: function() { return true; },
      getEvent: function() { return true; },
      setAccelerometerRange: function() {},
      setGyroRange: function() {},
      setFilterBandwidth: function() {}
    };
  },

  constants: {
    MPU6050_I2CADDR_DEFAULT: 0x68,
    MPU6050_RANGE_2_G: 0,
    MPU6050_RANGE_4_G: 1,
    MPU6050_RANGE_8_G: 2,
    MPU6050_RANGE_16_G: 3,
    MPU6050_RANGE_250_DEG: 0,
    MPU6050_RANGE_500_DEG: 1,
    MPU6050_RANGE_1000_DEG: 2,
    MPU6050_RANGE_2000_DEG: 3,
    MPU6050_BAND_260_HZ: 0,
    MPU6050_BAND_184_HZ: 1,
    MPU6050_BAND_94_HZ: 2,
    MPU6050_BAND_44_HZ: 3,
    MPU6050_BAND_21_HZ: 4,
    MPU6050_BAND_10_HZ: 5,
    MPU6050_BAND_5_HZ: 6
  }
};