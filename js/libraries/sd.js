// js/libraries/sd.js — SD Card module plugin
//
// Supports: SD card via SPI for data logging, file operations, and binary audio
// Usage:
//   SD.begin(CS_PIN);
//   File myFile = SD.open("data.txt", FILE_WRITE);
//   myFile.println("Hello");
//   myFile.close();
//   if (SD.exists("song.pcm")) { ... }
//   File dir = SD.open("/");
//   while (File entry = dir.openNextFile()) { ... }
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
    // SD.exists(filename)
    [/SD\.exists\s*\(([^)]+)\)/g, '_a.sdExists($1)'],
    // dir.openNextFile()
    [/(\w+)\.openNextFile\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server)$/i.test(v)) return m;
      return '_a.sdOpenNextFile(' + v + ')';
    }],
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
    // file.read(buf, len) — binary read into buffer
    [/(\w+)\.read\s*\(([^,)]+)\s*,\s*([^)]+)\)/g, function(m, v, buf, len) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m;
      return '_a.sdReadBuf(' + v + ', ' + buf + ', ' + len + ')';
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
    // file.isDirectory()
    [/(\w+)\.isDirectory\s*\(\s*\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|WiFi|client|http|stream|server)$/i.test(v)) return m;
      return '_a.sdIsDirectory(' + v + ')';
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
      _binary: false,
      _isDir: false,
      _dirIndex: 0,
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
      isDirectory: function() { return false; },
    };
  },

  runtime: function(self) {
    var files = {};
    var nextId = 1;

    function getFile(id) { return files[id] || null; }

    var BINARY_EXTS = /\.(pcm|raw|wav|bin|mp3|ogg|flac)$/i;

    function isBinaryFile(name) {
      return BINARY_EXTS.test(name);
    }

    // Load pre-uploaded files from SD card component's runtimeState
    function loadComponentFiles() {
      var cc = window.CircuitCanvas;
      if (!cc || !cc.components) return;
      for (var i = 0; i < cc.components.length; i++) {
        var comp = cc.components[i];
        if (comp.type === 'sd_card' && comp.runtimeState && comp.runtimeState.uploadedFiles) {
          var uploaded = comp.runtimeState.uploadedFiles;
          var names = Object.keys(uploaded);
          for (var j = 0; j < names.length; j++) {
            var fname = names[j];
            if (!files[fname]) {
              var data = uploaded[fname];
              if (data instanceof Uint8Array) {
                files[fname] = { name: fname, bytes: data, binary: true, pos: 0, data: '', length: data.length };
              } else {
                files[fname] = { name: fname, data: String(data), binary: false, pos: 0, length: String(data).length };
              }
            }
          }
        }
      }
    }

    return {
      sdBegin: function(csPin) {
        loadComponentFiles();
        var fileCount = Object.keys(files).length;
        self._serialLog('[SD] Initialized (CS pin ' + (csPin || 4) + ')' + (fileCount > 0 ? ', ' + fileCount + ' files loaded' : '') + '\n', 'system');
        return true;
      },
      sdOpen: function(filename, mode) {
        var name = String(filename).replace(/"/g, '');
        var m = mode ? String(mode).replace(/"/g, '') : 'r';

        // Reload component files in case they changed
        if (!files[name]) loadComponentFiles();

        if (m === 'r' && !files[name]) {
          self._serialLog('[SD] File not found: ' + name + '\n', 'data');
          return { __sdFile: true, _id: 0, _name: name, _notFound: true };
        }

        if (!files[name]) {
          files[name] = { name: name, data: '', binary: isBinaryFile(name), pos: 0, length: 0 };
        }
        var f = files[name];
        f.pos = 0;
        f.mode = m;
        var id = nextId++;
        files['_' + id] = f;

        var sizeInfo = f.binary ? f.length + ' bytes' : f.data.length + ' bytes';
        self._serialLog('[SD] Opened: ' + name + ' (' + sizeInfo + ')\n', 'data');
        return { __sdFile: true, _id: id, _name: name };
      },
      sdExists: function(filename) {
        var name = String(filename).replace(/"/g, '');
        if (files[name]) return true;
        loadComponentFiles();
        return !!files[name];
      },
      sdOpenDir: function(path) {
        var dirPath = String(path || '/').replace(/"/g, '');
        loadComponentFiles();
        var names = Object.keys(files).filter(function(n) { return !n.startsWith('_'); });
        var id = nextId++;
        files['_dir' + id] = { _isDir: true, _dirIndex: 0, _entries: names, name: dirPath };
        return { __sdFile: true, _id: id, _name: dirPath, _isDir: true };
      },
      sdOpenNextFile: function(dirObj) {
        if (!dirObj || !dirObj._id) return { __sdFile: true, _id: 0, _name: '', _notFound: true };
        var dir = getFile('_dir' + dirObj._id);
        if (!dir || !dir._isDir) return { __sdFile: true, _id: 0, _name: '', _notFound: true };
        if (dir._dirIndex >= dir._entries.length) return { __sdFile: true, _id: 0, _name: '', _notFound: true };
        var fname = dir._entries[dir._dirIndex++];
        var f = files[fname];
        if (!f) return { __sdFile: true, _id: 0, _name: '', _notFound: true };
        var id = nextId++;
        files['_' + id] = f;
        return { __sdFile: true, _id: id, _name: fname, _isDir: false };
      },
      sdPrintln: function(obj, data) {
        if (!obj || !obj._id) return;
        var f = getFile('_' + obj._id) || getFile(obj._name);
        if (!f) return;
        var text = String(data !== undefined ? data : '');
        f.data += text + '\n';
        f.length = f.data.length;
        f.pos = f.data.length;
      },
      sdPrint: function(obj, data) {
        if (!obj || !obj._id) return;
        var f = getFile('_' + obj._id) || getFile(obj._name);
        if (!f) return;
        var text = String(data !== undefined ? data : '');
        f.data += text;
        f.length = f.data.length;
        f.pos = f.data.length;
      },
      sdWrite: function(obj, data) {
        if (!obj || !obj._id) return;
        var f = getFile('_' + obj._id) || getFile(obj._name);
        if (!f) return;
        f.data += String(data);
        f.length = f.data.length;
        f.pos = f.data.length;
      },
      sdClose: function(obj) {
        if (!obj || !obj._id) return;
        var f = getFile('_' + obj._id);
        if (f) {
          var sz = f.binary ? (f.bytes ? f.bytes.length : 0) : f.data.length;
          self._serialLog('[SD] Closed: ' + f.name + ' (' + sz + ' bytes)\n', 'data');
        }
      },
      sdAvailable: function(obj) {
        if (!obj || !obj._id) return 0;
        var f = getFile('_' + obj._id);
        if (!f) return 0;
        if (f.binary && f.bytes) return Math.max(0, f.bytes.length - f.pos);
        return f.data ? Math.max(0, f.data.length - f.pos) : 0;
      },
      sdRead: function(obj) {
        if (!obj || !obj._id) return -1;
        var f = getFile('_' + obj._id);
        if (!f) return -1;
        // Binary file: return raw byte
        if (f.binary && f.bytes) {
          if (f.pos >= f.bytes.length) return -1;
          return f.bytes[f.pos++];
        }
        // Text file: return char code
        if (!f.data || f.pos >= f.data.length) return -1;
        return f.data.charCodeAt(f.pos++);
      },
      sdReadBuf: function(obj, buf, len) {
        if (!obj || !obj._id) return 0;
        var f = getFile('_' + obj._id);
        if (!f) return 0;
        var count = 0;
        for (var i = 0; i < len; i++) {
          var b = -1;
          if (f.binary && f.bytes) {
            if (f.pos < f.bytes.length) b = f.bytes[f.pos++];
          } else {
            if (f.data && f.pos < f.data.length) b = f.data.charCodeAt(f.pos++);
          }
          if (b < 0) break;
          if (buf && typeof buf === 'object') {
            if (buf instanceof Uint8Array || buf instanceof Int16Array || ArrayBuffer.isView(buf)) {
              buf[i] = b;
            } else if (Array.isArray(buf)) {
              buf[i] = b;
            }
          }
          count++;
        }
        return count;
      },
      sdSeek: function(obj, pos) {
        if (!obj || !obj._id) return false;
        var f = getFile('_' + obj._id);
        if (!f) return false;
        var maxLen = (f.binary && f.bytes) ? f.bytes.length : (f.data ? f.data.length : 0);
        f.pos = Math.max(0, Math.min(maxLen, pos));
        return true;
      },
      sdSize: function(obj) {
        if (!obj || !obj._id) return 0;
        var f = getFile('_' + obj._id);
        if (!f) return 0;
        if (f.binary && f.bytes) return f.bytes.length;
        return f.data ? f.data.length : 0;
      },
      sdName: function(obj) {
        if (!obj || !obj._id) return '';
        var f = getFile('_' + obj._id);
        return f ? f.name : '';
      },
      sdIsDirectory: function(obj) {
        if (!obj || !obj._id) return false;
        var f = getFile('_' + obj._id);
        return f ? !!f._isDir : false;
      },
    };
  },
};
