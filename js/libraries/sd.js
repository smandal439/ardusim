// js/libraries/sd.js — SD Card module plugin
//
// Supports: SD card via SPI for data logging and file operations
// Usage:
//   SD.begin(CS_PIN);
//   File myFile = SD.open("data.txt", FILE_WRITE);
//   myFile.println("Hello");
//   myFile.close();
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['SD'] = {
  classes: ['SD', 'File'],
  includes: ['<SD.h>', '<SPI.h>'],

  transpile: [
    // SD.begin(csPin)
    [/SD\.begin\s*\(([^)]*)\)/g, '_a.sdBegin($1)'],
    // SD.open(filename, mode)
    [/SD\.open\s*\(([^,)]+)\s*,\s*([^)]+)\)/g, '_a.sdOpen($1, $2)'],
    [/SD\.open\s*\(([^)]+)\)/g, '_a.sdOpen($1)'],
    // file.println(data)
    [/(\w+)\.println\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.sdPrintln(' + v + ', ' + a + ')';
    }],
    // file.print(data)
    [/(\w+)\.print\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.sdPrint(' + v + ', ' + a + ')';
    }],
    // file.write(data)
    [/(\w+)\.write\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.sdWrite(' + v + ', ' + a + ')';
    }],
    // file.close()
    [/(\w+)\.close\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.sdClose(' + v + ')';
    }],
    // file.available()
    [/(\w+)\.available\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.sdAvailable(' + v + ')';
    }],
    // file.read()
    [/(\w+)\.read\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.sdRead(' + v + ')';
    }],
    // file.seek(pos)
    [/(\w+)\.seek\s*\(([^)]*)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.sdSeek(' + v + ', ' + a + ')';
    }],
    // file.size()
    [/(\w+)\.size\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.sdSize(' + v + ')';
    }],
    // file.name()
    [/(\w+)\.name\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.sdName(' + v + ')';
    }],
  ],

  constants: {
    SD_CHIP_SELECT_PIN: 4,
    FILE_WRITE: 'w',
    FILE_READ: 'r',
  },

  constructor: function() {
    return {
      __sdFile: true,
      _name: '',
      _mode: '',
      _pos: 0,
      _data: '',
      open: function(name, mode) { return {}; },
      println: function(data) {},
      print: function(data) {},
      write: function(data) {},
      close: function() {},
      available: function() { return 0; },
      read: function() { return -1; },
      seek: function(pos) { return false; },
      size: function() { return 0; },
      name: function() { return ''; },
    };
  },

  runtime: function(self) {
    var files = {};
    var nextId = 1;

    function getFile(id) { return files[id] || null; }

    return {
      sdBegin: function(csPin) {
        self._serialLog('[SD] Initialized (CS pin ' + (csPin || 4) + ')\n', 'system');
        return true;
      },
      sdOpen: function(filename, mode) {
        var name = String(filename).replace(/"/g, '');
        var m = mode ? String(mode).replace(/"/g, '') : 'r';
        if (!files[name]) {
          files[name] = { name: name, data: '', pos: 0, mode: m };
        }
        var f = files[name];
        f.pos = 0;
        f.mode = m;
        var id = nextId++;
        files['_' + id] = f;
        self._serialLog('[SD] Opened: ' + name + '\n', 'data');
        return { __sdFile: true, _id: id, _name: name };
      },
      sdPrintln: function(obj, data) {
        if (!obj || !obj._id) return;
        var f = getFile('_' + obj._id) || getFile(obj._name);
        if (!f) return;
        var text = String(data !== undefined ? data : '');
        f.data += text + '\n';
        f.pos = f.data.length;
      },
      sdPrint: function(obj, data) {
        if (!obj || !obj._id) return;
        var f = getFile('_' + obj._id) || getFile(obj._name);
        if (!f) return;
        var text = String(data !== undefined ? data : '');
        f.data += text;
        f.pos = f.data.length;
      },
      sdWrite: function(obj, data) {
        if (!obj || !obj._id) return;
        var f = getFile('_' + obj._id) || getFile(obj._name);
        if (!f) return;
        f.data += String(data);
        f.pos = f.data.length;
      },
      sdClose: function(obj) {
        if (!obj || !obj._id) return;
        var f = getFile('_' + obj._id);
        if (f) {
          self._serialLog('[SD] Closed: ' + f.name + ' (' + f.data.length + ' bytes)\n', 'data');
        }
      },
      sdAvailable: function(obj) {
        if (!obj || !obj._id) return 0;
        var f = getFile('_' + obj._id);
        return f ? Math.max(0, f.data.length - f.pos) : 0;
      },
      sdRead: function(obj) {
        if (!obj || !obj._id) return -1;
        var f = getFile('_' + obj._id);
        if (!f || f.pos >= f.data.length) return -1;
        return f.data.charCodeAt(f.pos++);
      },
      sdSeek: function(obj, pos) {
        if (!obj || !obj._id) return false;
        var f = getFile('_' + obj._id);
        if (!f) return false;
        f.pos = Math.max(0, Math.min(f.data.length, pos));
        return true;
      },
      sdSize: function(obj) {
        if (!obj || !obj._id) return 0;
        var f = getFile('_' + obj._id);
        return f ? f.data.length : 0;
      },
      sdName: function(obj) {
        if (!obj || !obj._id) return '';
        var f = getFile('_' + obj._id);
        return f ? f.name : '';
      },
    };
  },
};
