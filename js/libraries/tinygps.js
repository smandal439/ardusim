/**
 * TinyGPS++ Library Plugin for ArduSim
 * 
 * Provides GPS simulation with mock NMEA data.
 * Supports: location, date, time, satellites, HDOP, speed, course.
 * 
 * Usage in Arduino code:
 *   #include <TinyGPS++.h>
 *   TinyGPSPlus gps;
 *   void loop() {
 *     while (Serial.available()) gps.encode(Serial.read());
 *     if (gps.location.isValid()) {
 *       Serial.println(gps.location.lat());
 *     }
 *   }
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['TinyGPSPlus'] = {
  classes: ['TinyGPSPlus'],
  includes: ['<TinyGPS++.h>'],

  transpile: [
    // Location methods
    [/\.location\.isValid\s*\(\s*\)/g, '._gps_locationIsValid()'],
    [/\.location\.lat\s*\(\s*\)/g, '._gps_locationLat()'],
    [/\.location\.lng\s*\(\s*\)/g, '._gps_locationLng()'],
    [/\.location\.age\s*\(\s*\)/g, '._gps_locationAge()'],
    // Altitude methods
    [/\.altitude\.isValid\s*\(\s*\)/g, '._gps_altitudeIsValid()'],
    [/\.altitude\.meters\s*\(\s*\)/g, '._gps_altitudeMeters()'],
    [/\.altitude\.feet\s*\(\s*\)/g, '._gps_altitudeFeet()'],
    [/\.altitude\.kilometers\s*\(\s*\)/g, '._gps_altitudeKm()'],
    [/\.altitude\.miles\s*\(\s*\)/g, '._gps_altitudeMiles()'],
    [/\.altitude\.nauticalMiles\s*\(\s*\)/g, '._gps_altitudeNmi()'],
    [/\.altitude\.age\s*\(\s*\)/g, '._gps_altitudeAge()'],
    // Date methods
    [/\.date\.isValid\s*\(\s*\)/g, '._gps_dateIsValid()'],
    [/\.date\.year\s*\(\s*\)/g, '._gps_dateYear()'],
    [/\.date\.month\s*\(\s*\)/g, '._gps_dateMonth()'],
    [/\.date\.day\s*\(\s*\)/g, '._gps_dateDay()'],
    [/\.date\.age\s*\(\s*\)/g, '._gps_dateAge()'],
    // Time methods
    [/\.time\.isValid\s*\(\s*\)/g, '._gps_timeIsValid()'],
    [/\.time\.hour\s*\(\s*\)/g, '._gps_timeHour()'],
    [/\.time\.minute\s*\(\s*\)/g, '._gps_timeMinute()'],
    [/\.time\.second\s*\(\s*\)/g, '._gps_timeSecond()'],
    [/\.time\.centisecond\s*\(\s*\)/g, '._gps_timeCentisecond()'],
    [/\.time\.age\s*\(\s*\)/g, '._gps_timeAge()'],
    // satellites / HDOP
    [/\.satellites\.isValid\s*\(\s*\)/g, '._gps_satellitesIsValid()'],
    [/\.satellites\.value\s*\(\s*\)/g, '._gps_satellites()'],
    [/\.satellites\.age\s*\(\s*\)/g, '._gps_satellitesAge()'],
    [/\.hdop\.isValid\s*\(\s*\)/g, '._gps_hdopIsValid()'],
    [/\.hdop\.hdop\s*\(\s*\)/g, '._gps_hdop()'],
    [/\.hdop\.value\s*\(\s*\)/g, '._gps_hdop()'],
    [/\.hdop\.age\s*\(\s*\)/g, '._gps_hdopAge()'],
    // Speed / Course
    [/\.speed\.isValid\s*\(\s*\)/g, '._gps_speedIsValid()'],
    [/\.speed\.kmph\s*\(\s*\)/g, '._gps_speedKmph()'],
    [/\.speed\.mps\s*\(\s*\)/g, '._gps_speedMps()'],
    [/\.speed\.mph\s*\(\s*\)/g, '._gps_speedMph()'],
    [/\.speed\.knots\s*\(\s*\)/g, '._gps_speedKnots()'],
    [/\.course\.isValid\s*\(\s*\)/g, '._gps_courseIsValid()'],
    [/\.course\.deg\s*\(\s*\)/g, '._gps_courseDeg()'],
    // Chars processed
    [/\.charsProcessed\s*\(\s*\)/g, '._gps_charsProcessed()'],
    [/\.failedChecksum\s*\(\s*\)/g, '._gps_failedChecksum()'],
    [/\.passedChecksum\s*\(\s*\)/g, '._gps_passedChecksum()'],
    // encode method
    [/\.encode\s*\(/g, '._gps_encode('],
  ],

  constants: {
    GPS_INVALID_F32: 1000.0,
    GPS_INVALID_DDW: 999999.999,
    GPS_INVALID_TIME: 0xFFFFFFFF,
    GPS_INVALID_DATE: 0xFFFFFFFF,
    GPS_INVALID_AGE: 0xFFFFFFFF,
  },

  constructor: function() {
    // Read GPS data from canvas component if available
    var canvas = window.CircuitCanvas;
    var gpsInst = null;
    if (canvas && Array.isArray(canvas.components)) {
      gpsInst = canvas.components.find(function(c) { return c.type === 'gps_neo6m'; }) || null;
    }
    function getProp(key, fallback) {
      if (!gpsInst) return fallback;
      if (gpsInst.runtimeState && gpsInst.runtimeState[key] !== undefined) return gpsInst.runtimeState[key];
      if (gpsInst.props && gpsInst.props[key] !== undefined) return gpsInst.props[key];
      return fallback;
    }
    return {
      __class: 'TinyGPSPlus',
      _data: {
        lat: getProp('latitude', 28.6139),
        lng: getProp('longitude', 77.2090),
        locationValid: true,
        locationAge: 0,
        altitudeValid: true,
        altitudeMeters: getProp('altitude', 215.0),
        altitudeAge: 0,
        dateValid: true,
        year: 2026,
        month: 9,
        day: 4,
        dateAge: 0,
        timeValid: true,
        hour: 12,
        minute: 30,
        second: 15,
        centisecond: 50,
        timeAge: 0,
        satellitesValid: true,
        satellites: getProp('satellites', 8),
        satellitesAge: 0,
        hdopValid: true,
        hdop: 1.2,
        hdopAge: 0,
        speedValid: true,
        speedKmph: 0,
        courseValid: true,
        courseDeg: 0,
        charsProcessed: 0,
        failedChecksum: 0,
        passedChecksum: 0,
      },
      // encode: feed a single character (returns true if new sentence decoded)
      _gps_encode: function(c) {
        this._data.charsProcessed++;
        // Sync from canvas GPS component on every character for instant availability
        var canvas = window.CircuitCanvas;
        if (canvas && Array.isArray(canvas.components)) {
          var inst = canvas.components.find(function(c) { return c.type === 'gps_neo6m'; });
          if (inst) {
            var pr = inst.props || {};
            this._data.lat = pr.latitude || this._data.lat;
            this._data.lng = pr.longitude || this._data.lng;
            this._data.altitudeMeters = pr.altitude || this._data.altitudeMeters;
            this._data.satellites = pr.satellites || this._data.satellites;
          }
        }
        // Every 100 characters, count as a decoded sentence
        if (this._data.charsProcessed % 100 === 0) {
          this._data.passedChecksum++;
          this._data.speedKmph = Math.random() * 60;
          this._data.courseDeg = Math.random() * 360;
        }
        return true;
      },
      // Location
      _gps_locationIsValid: function() { return this._data.locationValid; },
      _gps_locationLat: function() { return this._data.lat; },
      _gps_locationLng: function() { return this._data.lng; },
      _gps_locationAge: function() { return this._data.locationAge; },
      // Altitude
      _gps_altitudeIsValid: function() { return this._data.altitudeValid; },
      _gps_altitudeMeters: function() { return this._data.altitudeMeters; },
      _gps_altitudeFeet: function() { return this._data.altitudeMeters * 3.28084; },
      _gps_altitudeKm: function() { return this._data.altitudeMeters / 1000.0; },
      _gps_altitudeMiles: function() { return this._data.altitudeMeters * 0.000621371; },
      _gps_altitudeNmi: function() { return this._data.altitudeMeters * 0.000539957; },
      _gps_altitudeAge: function() { return this._data.altitudeAge; },
      // Date
      _gps_dateIsValid: function() { return this._data.dateValid; },
      _gps_dateYear: function() { return this._data.year; },
      _gps_dateMonth: function() { return this._data.month; },
      _gps_dateDay: function() { return this._data.day; },
      _gps_dateAge: function() { return this._data.dateAge; },
      // Time
      _gps_timeIsValid: function() { return this._data.timeValid; },
      _gps_timeHour: function() { return this._data.hour; },
      _gps_timeMinute: function() { return this._data.minute; },
      _gps_timeSecond: function() { return this._data.second; },
      _gps_timeCentisecond: function() { return this._data.centisecond; },
      _gps_timeAge: function() { return this._data.timeAge; },
      // Satellites
      _gps_satellitesIsValid: function() { return this._data.satellitesValid; },
      _gps_satellites: function() { return this._data.satellites; },
      _gps_satellitesAge: function() { return this._data.satellitesAge; },
      // HDOP
      _gps_hdopIsValid: function() { return this._data.hdopValid; },
      _gps_hdop: function() { return this._data.hdop; },
      _gps_hdopAge: function() { return this._data.hdopAge; },
      // Speed
      _gps_speedIsValid: function() { return this._data.speedValid; },
      _gps_speedKmph: function() { return this._data.speedKmph; },
      _gps_speedMps: function() { return this._data.speedKmph / 3.6; },
      _gps_speedMph: function() { return this._data.speedKmph * 0.621371; },
      _gps_speedKnots: function() { return this._data.speedKmph * 0.539957; },
      // Course
      _gps_courseIsValid: function() { return this._data.courseValid; },
      _gps_courseDeg: function() { return this._data.courseDeg; },
      // Stats
      _gps_charsProcessed: function() { return this._data.charsProcessed; },
      _gps_failedChecksum: function() { return this._data.failedChecksum; },
      _gps_passedChecksum: function() { return this._data.passedChecksum; },
    };
  },
};
