/**
 * DS3231 RTC Library Plugin for ArduSim
 *
 * Supports the RTClib Arduino library (Adafruit) for DS3231.
 * Provides RtcDateTime, RtcTemperature, and RtcDS3231<TwoWire> stubs
 * that read from the placed ds3231 component's runtime state.
 *
 * Typical Arduino code:
 *   #include <Wire.h>
 *   #include <RtcDS3231.h>
 *
 *   RtcDS3231<TwoWire> Rtc(Wire);
 *
 *   void setup() {
 *     Rtc.Begin();
 *     Rtc.SetDateTime(RtcDateTime(__DATE__, __TIME__));
 *   }
 *   void loop() {
 *     RtcDateTime now = Rtc.GetDateTime();
 *     float temp = Rtc.GetTemperature();
 *   }
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['RtcDS3231'] = {
  classes: ['RtcDS3231', 'RtcDateTime', 'RtcTemperature', 'TwoWire'],
  includes: ['<Wire.h>', '<RtcDS3231.h>'],
  transpile: [
    /* Include lines — strip */
    [/#include\s*<RtcDS3231\.h>/g, ''],
    [/#include\s*<Wire\.h>/g, ''],

    /* RtcDS3231<TwoWire> Rtc(Wire); → var Rtc = new _a._RtcDS3231(); */
    [/RtcDS3231\s*<\s*TwoWire\s*>\s+(\w+)\s*\(\s*Wire\s*\)\s*;/g, 'var $1 = new _a._RtcDS3231();'],

    /* RtcDS3231<TwoWire> Rtc(Wire, 0x68); — with custom address */
    [/RtcDS3231\s*<\s*TwoWire\s*>\s+(\w+)\s*\(\s*Wire\s*,\s*([^)]+)\)\s*;/g, 'var $1 = new _a._RtcDS3231($2);'],

    /* RtcDateTime type assignments from method calls:
       RtcDateTime now = Rtc.GetDateTime();  →  var now = Rtc._getDateTime(); */
    [/RtcDateTime\s+(\w+)\s*=\s*(\w+)\.GetDateTime\s*\(\s*\)\s*;/g, 'var $1 = $2._getDateTime();'],

    /* RtcTemperature type assignments from method calls:
       RtcTemperature temp = Rtc.GetTemperature();  →  var temp = Rtc._getTemperature(); */
    [/RtcTemperature\s+(\w+)\s*=\s*(\w+)\.GetTemperature\s*\(\s*\)\s*;/g, 'var $1 = $2._getTemperature();'],

    /* RtcDateTime constructors — bare: RtcDateTime now(2026,9,11,10,30,0); */
    [/RtcDateTime\s+(\w+)\s*\(([^)]*)\)\s*;/g, 'var $1 = new _a._RtcDateTime($2);'],

    /* RtcDateTime without assignment: RtcDateTime now; → var now = {}; */
    [/RtcDateTime\s+(\w+)\s*;/g, 'var $1 = {};'],

    /* new RtcDateTime(...) expressions */
    [/new\s+RtcDateTime\s*\(([^)]*)\)/g, 'new _a._RtcDateTime($1)'],

    /* RtcTemperature constructors — bare: RtcTemperature t(25.0); */
    [/RtcTemperature\s+(\w+)\s*\(([^)]*)\)\s*;/g, 'var $1 = new _a._RtcTemperature($2);'],

    /* RtcTemperature without assignment: RtcTemperature temp; → var temp = {}; */
    [/RtcTemperature\s+(\w+)\s*;/g, 'var $1 = {};'],

    /* Method calls */
    [/(\w+)\.Begin\s*\(\)/g, '$1._begin()'],
    [/(\w+)\.GetDateTime\s*\(\)/g, '$1._getDateTime()'],
    [/(\w+)\.SetDateTime\s*\(([^)]+)\)/g, '$1._setDateTime($2)'],
    [/(\w+)\.GetTemperature\s*\(\)/g, '$1._getTemperature()'],
    [/(\w+)\.IsDateTimeValid\s*\(\)/g, '$1._isDateTimeValid()'],
    [/(\w+)\.IsRunning\s*\(\)/g, '$1._isRunning()'],
    [/(\w+)\.SetIsRunning\s*\(([^)]+)\)/g, '$1._setIsRunning($2)'],
    [/(\w+)\.ForceSetRamData\s*\(([^)]+)\)/g, '$1._noop()'],

    /* RtcDateTime accessors */
    [/(\w+)\.TotalSeconds\s*\(\)/g, '$1._totalSeconds()'],
    [/(\w+)\.Year\s*\(\)/g, '$1._year()'],
    [/(\w+)\.Month\s*\(\)/g, '$1._month()'],
    [/(\w+)\.Day\s*\(\)/g, '$1._day()'],
    [/(\w+)\.Hour\s*\(\)/g, '$1._hour()'],
    [/(\w+)\.Minute\s*\(\)/g, '$1._minute()'],
    [/(\w+)\.Second\s*\(\)/g, '$1._second()'],

    /* RtcTemperature accessors */
    [/(\w+)\.AsFloatDegC\s*\(\)/g, '$1._asFloatDegC()'],
    [/(\w+)\.AsWholeDegrees\s*\(\)/g, '$1._asWholeDegrees()'],
  ],

  constants: {
    DS3231_ADDRESS: 0x68,
    DS3231 CENTURY: 0x80,
    DS3231_Control: 0x0E,
    DS3231_StatusReg: 0x0F,
    DS3231_Temperature: 0x11,
  },

  constructor: function () {
    return { __class: 'RtcDS3231' };
  },

  runtime: function (self) {
    /* Helper: find the ds3231 component on the canvas */
    function _findDs3231() {
      var canvas = window.CircuitCanvas;
      var comps = (canvas && Array.isArray(canvas.components)) ? canvas.components : null;
      return comps ? comps.find(function (c) { return c.type === 'ds3231'; }) : null;
    }

    /* Helper: read time from component */
    function _readTime() {
      var comp = _findDs3231();
      if (!comp) return { year: 2026, month: 1, day: 1, hour: 12, minute: 0, second: 0 };
      var rs = comp.runtimeState || {};
      var pr = comp.props || {};
      return {
        year:   2000 + (rs.year   ?? pr.year   ?? 26),
        month:  rs.month  ?? pr.month  ?? 1,
        day:    rs.day    ?? pr.day    ?? 1,
        hour:   rs.hour   ?? pr.hour   ?? 12,
        minute: rs.minute ?? pr.minute ?? 0,
        second: rs.second ?? pr.second ?? 0,
      };
    }

    /* Helper: write time to component */
    function _writeTime(t) {
      var comp = _findDs3231();
      if (!comp) return;
      if (!comp.runtimeState) comp.runtimeState = {};
      var rs = comp.runtimeState;
      rs.year   = (t.year - 2000) & 0xFF;
      rs.month  = t.month;
      rs.day    = t.day;
      rs.hour   = t.hour;
      rs.minute = t.minute;
      rs.second = t.second;
      rs._initialized = true;
      rs._lastTick = (window.ArduinoSim && window.ArduinoSim.simTime) || 0;
    }

    return {
      _RtcDS3231: function (addr) {
        this.address = addr || 0x68;

        this._begin = function () {
          var comp = _findDs3231();
          if (comp) {
            self._serialLog('[DS3231] Initialized at I2C 0x' + this.address.toString(16) + '\n', 'system');
            return true;
          }
          self._serialLog('[DS3231] Warning: No DS3231 component found on canvas!\n', 'error');
          return false;
        };

        this._getDateTime = function () {
          var t = _readTime();
          return new _a._RtcDateTime(t.year, t.month, t.day, t.hour, t.minute, t.second);
        };

        this._setDateTime = function (dt) {
          if (dt && typeof dt._year === 'function') {
            _writeTime({
              year: dt._year(), month: dt._month(), day: dt._day(),
              hour: dt._hour(), minute: dt._minute(), second: dt._second()
            });
          }
        };

        this._getTemperature = function () {
          var comp = _findDs3231();
          var temp = 25.0;
          if (comp) {
            var rs = comp.runtimeState || {};
            var pr = comp.props || {};
            temp = rs.temperature ?? pr.temperature ?? 25.0;
          }
          return new _a._RtcTemperature(temp);
        };

        this._isDateTimeValid = function () { return true; };
        this._isRunning = function () { return true; };
        this._setIsRunning = function () {};
        this._noop = function () {};
      },

      _RtcDateTime: function (yr, mo, dy, hr, mi, se) {
        /* Accept both (yr, mo, dy, hr, mi, se) and (__DATE__, __TIME__) strings */
        if (typeof yr === 'string') {
          /* Parse "MMM DD YYYY" and "HH:MM:SS" from __DATE__ / __TIME__ */
          var parts = yr.split(' ');
          var months = { JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12 };
          this._yr = parseInt(parts[2]) || 2026;
          this._mo = months[parts[0]] || 1;
          this._dy = parseInt(parts[1]) || 1;
          if (typeof mo === 'string') {
            var tp = mo.split(':');
            this._hr = parseInt(tp[0]) || 0;
            this._mi = parseInt(tp[1]) || 0;
            this._se = parseInt(tp[2]) || 0;
          } else {
            this._hr = 0; this._mi = 0; this._se = 0;
          }
        } else {
          this._yr = yr || 2026;
          this._mo = mo || 1;
          this._dy = dy || 1;
          this._hr = hr || 0;
          this._mi = mi || 0;
          this._se = se || 0;
        }
        this._year = function ()  { return this._yr; };
        this._month = function () { return this._mo; };
        this._day = function ()   { return this._dy; };
        this._hour = function ()  { return this._hr; };
        this._minute = function () { return this._mi; };
        this._second = function () { return this._se; };
        this._totalSeconds = function () {
          return this._se + this._mi * 60 + this._hr * 3600 +
                 this._dy * 86400 + this._mo * 2592000 + this._yr * 31536000;
        };
      },

      _RtcTemperature: function (degC) {
        this._degC = degC || 25.0;
        this._asFloatDegC = function () { return this._degC; };
        this._asWholeDegrees = function () { return Math.floor(this._degC); };
      },
    };
  },
};
