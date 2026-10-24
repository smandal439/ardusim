window.ArduinoLibs = window.ArduinoLibs || {};

window.ArduinoLibs['Preferences'] = {
  classes: ['Preferences'],
  includes: ['<Preferences.h>'],
  transpile: [],
  constants: {
    PT_I8: 0,
    PT_U8: 1,
    PT_I16: 2,
    PT_U16: 3,
    PT_I32: 4,
    PT_U32: 5,
    PT_I64: 6,
    PT_U64: 7,
    PT_STR: 8,
    PT_BLOB: 9,
  },
  constructor: function() {
    var stores = window.ArduinoSim._preferencesStores ||
      (window.ArduinoSim._preferencesStores = new Map());
    var namespace = '';
    var values = null;
    var readOnly = false;

    function canWrite() {
      return values !== null && !readOnly;
    }

    function setValue(key, value, size) {
      if (!canWrite()) return 0;
      values.set(String(key), value);
      return size;
    }

    function getValue(key, fallback, type) {
      if (!values || !values.has(String(key))) return fallback;
      var entry = values.get(String(key));
      return entry && entry.type === type ? entry.value : fallback;
    }

    function toText(value) {
      if (Array.isArray(value)) {
        if (typeof value[0] === 'number') {
          var codes = [];
          for (var i = 0; i < value.length && value[i] !== 0; i++) codes.push(value[i] & 0xFF);
          return String.fromCharCode.apply(null, codes);
        }
        return value.join('').split('\0', 1)[0];
      }
      return String(value);
    }

    return {
      begin: function(name, isReadOnly) {
        namespace = String(name || '');
        if (!namespace) return false;
        if (!stores.has(namespace)) stores.set(namespace, new Map());
        values = stores.get(namespace);
        readOnly = Boolean(isReadOnly);
        return true;
      },
      end: function() {
        namespace = '';
        values = null;
        readOnly = false;
      },
      clear: function() {
        if (!canWrite()) return false;
        values.clear();
        return true;
      },
      remove: function(key) {
        return canWrite() ? values.delete(String(key)) : false;
      },
      isKey: function(key) {
        return Boolean(values && values.has(String(key)));
      },
      getType: function(key) {
        var entry = values && values.get(String(key));
        return entry ? entry.type : 255;
      },
      putChar: function(key, value) { return setValue(key, { type: 0, value: Number(value) | 0 }, 1); },
      putUChar: function(key, value) { return setValue(key, { type: 1, value: Number(value) & 0xFF }, 1); },
      putShort: function(key, value) { return setValue(key, { type: 2, value: Number(value) | 0 }, 2); },
      putUShort: function(key, value) { return setValue(key, { type: 3, value: Number(value) & 0xFFFF }, 2); },
      putInt: function(key, value) { return setValue(key, { type: 4, value: Number(value) | 0 }, 4); },
      putUInt: function(key, value) { return setValue(key, { type: 5, value: Number(value) >>> 0 }, 4); },
      putLong64: function(key, value) { return setValue(key, { type: 6, value: Number(value) }, 8); },
      putULong64: function(key, value) { return setValue(key, { type: 7, value: Number(value) }, 8); },
      putFloat: function(key, value) { return setValue(key, { type: 5, value: Number(value) }, 4); },
      putDouble: function(key, value) { return setValue(key, { type: 7, value: Number(value) }, 8); },
      putBool: function(key, value) { return setValue(key, { type: 1, value: Boolean(value) }, 1); },
      putString: function(key, value) {
        var text = toText(value);
        return setValue(key, { type: 8, value: text }, text.length);
      },
      putBytes: function(key, value, length) {
        var bytes = Array.from(value || []);
        if (Number(length) > 0) bytes = bytes.slice(0, Number(length));
        return setValue(key, { type: 9, value: bytes }, bytes.length);
      },
      getChar: function(key, fallback) { return getValue(key, fallback || 0, 0); },
      getUChar: function(key, fallback) { return getValue(key, fallback || 0, 1); },
      getShort: function(key, fallback) { return getValue(key, fallback || 0, 2); },
      getUShort: function(key, fallback) { return getValue(key, fallback || 0, 3); },
      getInt: function(key, fallback) { return getValue(key, fallback || 0, 4); },
      getUInt: function(key, fallback) { return getValue(key, fallback || 0, 5); },
      getLong64: function(key, fallback) { return getValue(key, fallback || 0, 6); },
      getULong64: function(key, fallback) { return getValue(key, fallback || 0, 7); },
      getFloat: function(key, fallback) { return getValue(key, fallback || 0, 5); },
      getDouble: function(key, fallback) { return getValue(key, fallback || 0, 7); },
      getBool: function(key, fallback) { return getValue(key, Boolean(fallback), 1); },
      getString: function(key, fallback) { return getValue(key, fallback || '', 8); },
      getBytesLength: function(key) {
        var bytes = getValue(key, null, 9);
        return bytes ? bytes.length : 0;
      },
      getBytes: function(key, buffer, length) {
        var bytes = getValue(key, null, 9);
        if (!bytes) return 0;
        var count = Math.min(bytes.length, Number(length) || bytes.length);
        if (buffer && typeof buffer.length === 'number') {
          for (var i = 0; i < count && i < buffer.length; i++) buffer[i] = bytes[i];
        }
        return count;
      },
      freeEntries: function() {
        return values ? Math.max(0, 100 - values.size) : 0;
      },
    };
  },
};
