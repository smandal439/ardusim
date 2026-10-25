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
    function decodeCoordinate(value, hemisphere, maxDegrees) {
      if (!value || !/^[0-9]+(?:\.[0-9]+)?$/.test(value)) return null;
      const degreesDigits = hemisphere === 'N' || hemisphere === 'S' ? 2 : 3;
      if (degreesDigits === 2 && hemisphere !== 'N' && hemisphere !== 'S' ||
          degreesDigits === 3 && hemisphere !== 'E' && hemisphere !== 'W') return null;
      const degrees = Number(value.slice(0, degreesDigits));
      const minutes = Number(value.slice(degreesDigits));
      if (!Number.isFinite(degrees) || !Number.isFinite(minutes) ||
          minutes >= 60 || degrees > maxDegrees || degrees === maxDegrees && minutes > 0) return null;
      const coordinate = degrees + minutes / 60;
      return hemisphere === 'S' || hemisphere === 'W' ? -coordinate : coordinate;
    }
    function updateTime(data, value) {
      const match = /^(\d{2})(\d{2})(\d{2})(?:\.(\d+))?$/.exec(value || '');
      data.timeValid = false;
      if (!match) return;
      const [hour, minute, second] = match.slice(1, 4).map(Number);
      if (hour > 23 || minute > 59 || second > 59) return;
      data.hour = hour;
      data.minute = minute;
      data.second = second;
      data.centisecond = Number(`0.${match[4] || '0'}`) * 100 | 0;
      data.timeValid = true;
    }
    function updatePosition(data, fields, latIndex, lngIndex) {
      const lat = decodeCoordinate(fields[latIndex], fields[latIndex + 1], 90);
      const lng = decodeCoordinate(fields[lngIndex], fields[lngIndex + 1], 180);
      if (lat === null || lng === null) {
        data.locationValid = false;
        return false;
      }
      data.lat = lat;
      data.lng = lng;
      data.locationValid = true;
      return true;
    }
    function decodeSentence(sentence, data) {
      const checksumAt = sentence.indexOf('*');
      if (sentence[0] !== '$' || checksumAt < 0 || !/^[0-9A-Fa-f]{2}$/.test(sentence.slice(checksumAt + 1))) {
        return false;
      }
      const body = sentence.slice(1, checksumAt);
      let checksum = 0;
      for (let i = 0; i < body.length; i++) checksum ^= body.charCodeAt(i);
      if (checksum !== parseInt(sentence.slice(checksumAt + 1), 16)) return false;

      const fields = body.split(',');
      const type = fields[0].slice(-3);
      if (type === 'GGA' && fields.length >= 10) {
        updateTime(data, fields[1]);
        data.satellites = Number(fields[7]) || 0;
        data.satellitesValid = fields[7] !== '';
        data.hdop = Number(fields[8]) || 0;
        data.hdopValid = fields[8] !== '';
        const hasFix = Number(fields[6]) > 0;
        data.locationValid = hasFix && updatePosition(data, fields, 2, 4);
        data.altitudeMeters = Number(fields[9]) || 0;
        data.altitudeValid = hasFix && fields[9] !== '';
        return true;
      }
      if (type === 'RMC' && fields.length >= 10) {
        updateTime(data, fields[1]);
        const date = /^(\d{2})(\d{2})(\d{2})$/.exec(fields[9]);
        if (date) {
          const shortYear = Number(date[3]);
          data.day = Number(date[1]);
          data.month = Number(date[2]);
          data.year = shortYear >= 80 ? 1900 + shortYear : 2000 + shortYear;
          const daysInMonth = new Date(Date.UTC(data.year, data.month, 0)).getUTCDate();
          data.dateValid = data.month >= 1 && data.month <= 12 &&
            data.day >= 1 && data.day <= daysInMonth;
        } else {
          data.dateValid = false;
        }
        const hasFix = fields[2] === 'A';
        if (hasFix) updatePosition(data, fields, 3, 5);
        else data.locationValid = false;
        data.speedKmph = (Number(fields[7]) || 0) * 1.852;
        data.speedValid = hasFix && fields[7] !== '';
        data.courseDeg = Number(fields[8]) || 0;
        data.courseValid = hasFix && fields[8] !== '';
        return true;
      }
      return false;
    }
    return {
      __class: 'TinyGPSPlus',
      _data: {
        lat: getProp('latitude', 28.6139),
        lng: getProp('longitude', 77.2090),
        locationValid: false,
        locationAge: 0,
        altitudeValid: false,
        altitudeMeters: getProp('altitude', 215.0),
        altitudeAge: 0,
        dateValid: false,
        year: 0,
        month: 0,
        day: 0,
        dateAge: 0,
        timeValid: false,
        hour: 0,
        minute: 0,
        second: 0,
        centisecond: 0,
        timeAge: 0,
        satellitesValid: false,
        satellites: getProp('satellites', 8),
        satellitesAge: 0,
        hdopValid: false,
        hdop: 0,
        hdopAge: 0,
        speedValid: false,
        speedKmph: 0,
        courseValid: false,
        courseDeg: 0,
        charsProcessed: 0,
        failedChecksum: 0,
        passedChecksum: 0,
      },
      _gps_sentenceBuffer: '',
      // encode: feed a single character (returns true if new sentence decoded)
      _gps_encode: function(c) {
        this._data.charsProcessed++;
        var character = typeof c === 'number' ? String.fromCharCode(c) : String(c);
        if (character === '$') this._gps_sentenceBuffer = '$';
        else if (this._gps_sentenceBuffer) this._gps_sentenceBuffer += character;
        if (character !== '\n') return false;
        if (!this._gps_sentenceBuffer) return false;

        var sentence = this._gps_sentenceBuffer.trim();
        this._gps_sentenceBuffer = '';
        if (decodeSentence(sentence, this._data)) {
          this._data.passedChecksum++;
          return true;
        }
        this._data.failedChecksum++;
        return false;
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
