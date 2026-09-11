/**
 * Wire (I2C) Library Plugin for ArduSim
 *
 * Provides I2C simulation with MPU6050 (0x68) and DS3231 (0x68) register emulation.
 * Supports: begin, requestFrom, beginTransmission, endTransmission, write, read, available.
 *
 * Usage in Arduino code:
 *   #include <Wire.h>
 *   Wire.begin();
 *   Wire.beginTransmission(0x68);
 *   Wire.write(0x00);
 *   Wire.endTransmission();
 *   Wire.requestFrom(0x68, 2);
 *   while (Wire.available()) {
 *     byte b = Wire.read();
 *   }
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Wire'] = {
  classes: [],
  includes: ['<Wire.h>'],
  transpile: [
    [/\bWire\.begin\s*\(/g, '_a.wireBegin('],
    [/\bWire\.requestFrom\s*\(/g, '_a.wireRequestFrom('],
    [/\bWire\.beginTransmission\s*\(/g, '_a.wireBeginTransmission('],
    [/\bWire\.endTransmission\s*\(/g, '_a.wireEndTransmission('],
    [/\bWire\.write\s*\(/g, '_a.wireWrite('],
    [/\bWire\.read\s*\(/g, '_a.wireRead('],
    [/\bWire\.available\s*\(/g, '_a.wireAvailable('],
  ],

  runtime: function(self) {
    return {
      wireBegin: function() { self._serialLog('[Wire] I2C begin\n', 'system'); },
      wireBeginTransmission: function(addr) {
        self._wireTxAddr = Number(addr) || 0;
      },
      wireWrite: function(val) {
        if (self._wireTxAddr === 0x68) self._wireRegPtr = Number(val) & 0xFF;
        return 1;
      },
      wireEndTransmission: function() {
        self._wireTxAddr = null;
        return 0;
      },
      wireRequestFrom: function(addr, qty) {
        qty = Number(qty) || 0;
        if ((Number(addr) || 0) === 0x68) {
          /* Dispatch to whichever I2C device at 0x68 is present */
          const canvas = window.CircuitCanvas;
          const components = (canvas && Array.isArray(canvas.components)) ? canvas.components : [];
          const hasMpu   = components.some(c => c.type === 'mpu6050');
          const hasDs3231 = components.some(c => c.type === 'ds3231');
          if (hasMpu && !hasDs3231) {
            self._wireRxQueue = self._mpuReadRegs(self._wireRegPtr ?? 0x3B, qty);
          } else if (hasDs3231 && !hasMpu) {
            self._wireRxQueue = self._ds3231ReadRegs(self._wireRegPtr ?? 0x00, qty);
          } else if (hasMpu && hasDs3231) {
            /* Both present — use last-used register range to guess intent */
            if (self._wireRegPtr >= 0x00 && self._wireRegPtr <= 0x13) {
              self._wireRxQueue = self._ds3231ReadRegs(self._wireRegPtr, qty);
            } else {
              self._wireRxQueue = self._mpuReadRegs(self._wireRegPtr ?? 0x3B, qty);
            }
          } else {
            self._wireRxQueue = [];
          }
        } else {
          self._wireRxQueue = [];
        }
        return qty;
      },
      wireRead: function() {
        return (self._wireRxQueue && self._wireRxQueue.length) ? self._wireRxQueue.shift() : 0;
      },
      wireAvailable: function() { return (self._wireRxQueue && self._wireRxQueue.length) || 0; },
    };
  },

  constants: {},
};
