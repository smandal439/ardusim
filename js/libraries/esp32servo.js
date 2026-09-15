// js/libraries/esp32servo.js — ESP32Servo Library plugin
//
// Supports: ESP32Servo for ESP32-based servo control
// Usage:
//   Servo myServo;
//   myServo.attach(pin, min, max);
//   myServo.write(angle);
//   int angle = myServo.read();
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['ESP32Servo'] = {
  classes: ['Servo'],
  includes: ['<ESP32Servo.h>'],
  priority: 45,

  transpile: [
    // myServo.attach(pin) / myServo.attach(pin, min, max)
    [/(\w+)\.attach\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.esp32ServoAttach(' + v + ', ' + a + ')';
    }],
    // myServo.write(angle)
    [/(\w+)\.write\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.esp32ServoWrite(' + v + ', ' + a + ')';
    }],
    // myServo.writeMicroseconds(us)
    [/(\w+)\.writeMicroseconds\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.esp32ServoWriteMs(' + v + ', ' + a + ')';
    }],
    // myServo.read()
    [/(\w+)\.read\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.esp32ServoRead(' + v + ')';
    }],
    // myServo.readMicroseconds()
    [/(\w+)\.readMicroseconds\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.esp32ServoReadMs(' + v + ')';
    }],
    // myServo.detach()
    [/(\w+)\.detach\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.esp32ServoDetach(' + v + ')';
    }],
    // myServo.attached()
    [/(\w+)\.attached\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.esp32ServoAttached(' + v + ')';
    }],
    // myServo.setPeriodHertz(hertz)
    [/(\w+)\.setPeriodHertz\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.esp32ServoSetPeriodHertz(' + v + ', ' + a + ')';
    }],
  ],

  constants: {
    SERVO_MIN: 544,
    SERVO_MAX: 2400,
    REFRESH_CMS: 20,
  },

  constructor: function() {
    return {
      __servo: true,
      _servoPin: -1,
      _angle: 90,
      _min: 544,
      _max: 2400,
      _hertz: 50,
      _attached: false,
      attach: function(pin, min, max) { this._servoPin = pin; this._min = min || 544; this._max = max || 2400; this._attached = true; },
      write: function(angle) { this._angle = Math.max(0, Math.min(180, angle)); },
      writeMicroseconds: function(us) { this._angle = Math.round(((us - this._min) / (this._max - this._min)) * 180); },
      read: function() { return this._angle; },
      readMicroseconds: function() { return Math.round(this._min + (this._angle / 180) * (this._max - this._min)); },
      detach: function() { this._attached = false; },
      attached: function() { return this._attached; },
      setPeriodHertz: function(hertz) { this._hertz = hertz; },
    };
  },

  runtime: function(self) {
    var instances = new Map();
    var nextId = 1;

    function getInst(obj) {
      if (!obj) return null;
      if (!obj._esp32ServoId) {
        obj._esp32ServoId = nextId++;
        instances.set(obj._esp32ServoId, { pin: -1, angle: 90, attached: false });
      }
      return instances.get(obj._esp32ServoId);
    }

    return {
      esp32ServoAttach: function(obj, pin, min, max) {
        var inst = getInst(obj);
        if (!inst) return -1;
        inst.pin = pin;
        inst.min = min || 544;
        inst.max = max || 2400;
        inst.attached = true;
        return pin;
      },
      esp32ServoWrite: function(obj, angle) {
        var inst = getInst(obj);
        if (!inst || !inst.attached) return;
        inst.angle = Math.max(0, Math.min(180, Number(angle) || 0));
        var pwm = Math.round((inst.angle / 180) * 255);
        var key = 'pin_' + inst.pin;
        self.pinStates[key] = pwm;
        self._emitPinChange(key, pwm);
        self._emitEvent('servo', { angle: inst.angle, pin: inst.pin });
      },
      esp32ServoWriteMs: function(obj, us) {
        var inst = getInst(obj);
        if (!inst || !inst.attached) return;
        inst.angle = Math.round((((us || 1500) - (inst.min || 544)) / ((inst.max || 2400) - (inst.min || 544))) * 180);
        inst.angle = Math.max(0, Math.min(180, inst.angle));
        var pwm = Math.round((inst.angle / 180) * 255);
        var key = 'pin_' + inst.pin;
        self.pinStates[key] = pwm;
        self._emitPinChange(key, pwm);
        self._emitEvent('servo', { angle: inst.angle, pin: inst.pin });
      },
      esp32ServoRead: function(obj) {
        var inst = getInst(obj);
        return inst ? inst.angle : 90;
      },
      esp32ServoReadMs: function(obj) {
        var inst = getInst(obj);
        if (!inst) return 1500;
        return Math.round((inst.min || 544) + (inst.angle / 180) * ((inst.max || 2400) - (inst.min || 544)));
      },
      esp32ServoDetach: function(obj) {
        var inst = getInst(obj);
        if (inst) inst.attached = false;
      },
      esp32ServoAttached: function(obj) {
        var inst = getInst(obj);
        return inst ? inst.attached : false;
      },
      esp32ServoSetPeriodHertz: function(obj, hertz) {
        var inst = getInst(obj);
        if (inst) inst.hertz = hertz;
      },
    };
  },
};
