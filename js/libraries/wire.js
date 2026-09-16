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
    /* ── I2C bus pin helpers ── */
    function _i2cPins() {
      if (self.board === 'esp32_devkit_v1') return { sda: 21, scl: 22 };
      if (self.board === 'stm32f746_disco') return { sda: 18, scl: 19 };
      return { sda: 18, scl: 19 }; /* Arduino Uno / Nano: A4=18, A5=19 */
    }
    function _setSda(v) {
      const k = 'pin_' + _i2cPins().sda;
      if (self.pinStates[k] !== v) { self.pinStates[k] = v; self._emitPinChange(k, v); }
    }
    function _setScl(v) {
      const k = 'pin_' + _i2cPins().scl;
      if (self.pinStates[k] !== v) { self.pinStates[k] = v; self._emitPinChange(k, v); }
    }
    function _i2cStart() { _setScl(1); _setSda(1); _setSda(0); _setScl(0); }
    function _i2cStop()  { _setScl(0); _setSda(0); _setScl(1); _setSda(1); }
    function _i2cByte(b) {
      for (var i = 7; i >= 0; i--) { _setScl(0); _setSda((b >> i) & 1); _setScl(1); }
      _setScl(0); _setSda(1); _setScl(1); _setScl(0);
    }

    return {
      wireBegin: function() {
        self._serialLog('[Wire] I2C begin\n', 'system');
        _setSda(1); _setScl(1);
      },
      wireBeginTransmission: function(addr) {
        self._wireTxAddr = Number(addr) || 0;
        _i2cStart();
        _i2cByte((self._wireTxAddr << 1) | 0);
      },
      wireWrite: function(val) {
        if (self._wireTxAddr === 0x68) self._wireRegPtr = Number(val) & 0xFF;
        _i2cByte(Number(val) & 0xFF);
        return 1;
      },
      wireEndTransmission: function() {
        _i2cStop();
        self._wireTxAddr = null;
        _setSda(1); _setScl(1);
        return 0;
      },
      wireRequestFrom: function(addr, qty) {
        qty = Number(qty) || 0;
        _i2cStart();
        _i2cByte(((Number(addr) || 0) << 1) | 1);
        if ((Number(addr) || 0) === 0x68) {
          const canvas = window.CircuitCanvas;
          const components = (canvas && Array.isArray(canvas.components)) ? canvas.components : [];
          const hasMpu   = components.some(c => c.type === 'mpu6050');
          const hasDs3231 = components.some(c => c.type === 'ds3231');
          if (hasMpu && !hasDs3231) {
            self._wireRxQueue = self._mpuReadRegs(self._wireRegPtr ?? 0x3B, qty);
          } else if (hasDs3231 && !hasMpu) {
            self._wireRxQueue = self._ds3231ReadRegs(self._wireRegPtr ?? 0x00, qty);
          } else if (hasMpu && hasDs3231) {
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
        for (var i = 0; i < qty; i++) {
          var byte = (self._wireRxQueue && self._wireRxQueue.length) ? self._wireRxQueue.shift() : 0;
          _i2cByte(byte);
        }
        _i2cStop();
        _setSda(1); _setScl(1);
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
