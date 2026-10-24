/**
 * SoftwareSerial Library Plugin for ArduSim
 *
 * Provides SoftwareSerial simulation.
 * Supports: begin, write, println, read, available, peek, end, flush, listen, isListening.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['SoftwareSerial'] = {
  classes: ['SoftwareSerial'],
  includes: ['<SoftwareSerial.h>'],
  priority: 40,

  transpile: [
    [/[\s\S]+/g, function(code) {
      var serials = [];
      var match;
      var declaration = /\bSoftwareSerial\s+(\w+)\s*\(|\bvar\s+(\w+)\s*=\s*_a\.softwareSerialNew\s*\(/g;
      while ((match = declaration.exec(code)) !== null) serials.push(match[1] || match[2]);
      serials.forEach(function(name) {
        var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        code = code.replace(new RegExp('\\b' + escaped + '\\.begin\\s*\\(([^)]*)\\)', 'g'),
          '_a.softSerialBegin(' + name + ', $1)');
      });
      return code;
    }],
    [/\bSoftwareSerial\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.softwareSerialNew($2)'],
    [/\b(\w+)\.println\s*\(/g, function(match, v) {
      if (v === 'Serial') return match;
      return '_a.genericPrintln(' + v + ', ';
    }],
    [/\b(\w+)\.listen\s*\(/g, '_a.softSerialListen($1)'],
    [/\b(\w+)\.isListening\s*\(/g, '_a.softSerialIsListening($1)'],
  ],

  runtime: function(self) {
    return {
      softwareSerialNew: function(rxPin, txPin) {
        var id = '_ss_' + rxPin + '_' + txPin;
        var buf = [];
        self._softSerial = self._softSerial || {};
        self._softSerial[id] = { rxPin: rxPin, txPin: txPin, buf: buf, listening: false };
        self._serialLog('[SoftwareSerial] Created rx=' + rxPin + ' tx=' + txPin + '\n', 'system');
        return { _ssId: id, rxPin: rxPin, txPin: txPin };
      },
      softSerialBegin: function(obj, baud) {
        var ch = self._softSerial && self._softSerial[obj._ssId];
        if (ch) { ch.listening = true; ch.baud = baud; }
        self._serialLog('[SoftwareSerial] begin(' + baud + ')\n', 'system');
      },
      softSerialWrite: function(obj, val) {
        var ch = self._softSerial && self._softSerial[obj._ssId];
        if (ch) { self._serialLog('[SoftwareSerial] write(' + val + ')\n', 'data'); }
      },
      softSerialPrintln: function(obj, val) {
        self._serialLog(String(val) + '\n', 'data');
      },
      genericPrintln: function(obj, val) {
        var text = String(val);
        if (obj && obj.__tft) {
          var cursor = self._tftCursor || { col: 0, row: 0 };
          var size = self._tftTextSize || 1;
          var fg = self._tftFgColor != null ? self._tftFgColor : 0xFFFF;
          var bg = self._tftBgColor != null ? self._tftBgColor : 0x0000;
          self._emitEvent('tft_draw', { op: 'print', text: text, x: cursor.col, y: cursor.row, size: size, fg: fg, bg: bg });
          self._tftCursor = { col: 0, row: cursor.row + 8 * size };
          return;
        }
        if (obj && obj.__oled) {
          var cursor2 = self._lcdCursor || { col: 0, row: 0 };
          var size2 = self._oledTextSize || 1;
          self._emitEvent('oled_draw', { op: 'print', text: text, cursor: { col: cursor2.col, row: cursor2.row }, size: size2, color: self._oledTextColor === 0 ? 0 : 1 });
          self._lcdCursor = { col: 0, row: cursor2.row + 8 * size2 };
          return;
        }
        if (obj && obj._ssId) {
          self._serialLog(text + '\n', 'data');
          return;
        }
        self._serialLog(text + '\n', 'data');
      },
      softSerialRead: function(obj) {
        var ch = self._softSerial && self._softSerial[obj._ssId];
        if (ch && ch.buf.length > 0) return ch.buf.shift().charCodeAt(0);
        return -1;
      },
      softSerialAvailable: function(obj) {
        var ch = self._softSerial && self._softSerial[obj._ssId];
        return ch ? ch.buf.length : 0;
      },
      softSerialPeek: function(obj) {
        var ch = self._softSerial && self._softSerial[obj._ssId];
        if (ch && ch.buf.length > 0) return ch.buf[0].charCodeAt(0);
        return -1;
      },
      softSerialEnd: function(obj) {
        var ch = self._softSerial && self._softSerial[obj._ssId];
        if (ch) ch.listening = false;
      },
      softSerialFlush: function(obj) { },
      softSerialListen: function(obj) {
        var ch = self._softSerial && self._softSerial[obj._ssId];
        if (ch) ch.listening = true;
      },
      softSerialIsListening: function(obj) {
        var ch = self._softSerial && self._softSerial[obj._ssId];
        return ch ? ch.listening : false;
      },
    };
  },

  constants: {},
  constructor: function(args) {
    return { rx: args[0] || 0, tx: args[1] || 0 };
  },
};
