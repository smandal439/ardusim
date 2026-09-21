/**
 * ArduinoJson Library Plugin for ArduSim
 * 
 * Provides JSON parsing/serialization simulation.
 * Supports: StaticJsonDocument, DynamicJsonDocument, deserializeJson, serializeJson.
 * 
 * Usage in Arduino code:
 *   #include <ArduinoJson.h>
 *   StaticJsonDocument<256> doc;
 *   deserializeJson(doc, input);
 *   float temp = doc["temperature"];
 *   doc["status"] = "ok";
 *   char output[128];
 *   serializeJson(doc, output);
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['ArduinoJson'] = {
  classes: ['StaticJsonDocument', 'DynamicJsonDocument', 'JsonDocument'],
  includes: ['<ArduinoJson.h>'],
  priority: 100,
  transpile: [
    // deserializeJson(doc, input) → doc._deserialize(input)
    [/\bdeserializeJson\s*\(([^,]+),\s*([^)]+)\)/g, '$1._deserialize($2)'],
    // serializeJson(doc, output) → doc._serialize(output)
    [/\bserializeJson\s*\(([^,]+),\s*([^)]+)\)/g, '$1._serialize($2)'],
    // serializeJsonPretty(doc, output) → doc._serializePretty(output)
    [/\bserializeJsonPretty\s*\(([^,]+),\s*([^)]+)\)/g, '$1._serializePretty($2)'],
    // doc.containsKey("key") → doc._containsKey("key")
    [/\.containsKey\s*\(/g, '._containsKey('],
    // doc.is<T>() → doc._isType()
    [/\.is\s*\(\s*\)/g, '._isType()'],
    // doc.as<T>() → doc._asType()
    [/\.as\s*\(\s*\)/g, '._asType()'],
    // doc.size() → doc._size()
    [/\.size\s*\(\s*\)/g, '._size()'],
    // doc.clear() → doc._clear()  (skip LCD/display objects — they have their own clear)
    [/(\w+)\.clear\s*\(\s*\)/g, function(m, v) { if (/^(lcd|display|screen|tft|oled|lcd\d*|my\w*lcd|my\w*display|my\w*screen|my\w*tft|my\w*oled)$/i.test(v)) return m; return v + '._clear()'; }],
    // doc.shrinkToFit() → no-op
    [/\.shrinkToFit\s*\(\s*\)/g, '._noop()'],
    // doc.overflowed() → doc._overflowed()
    [/\.overflowed\s*\(\s*\)/g, '._overflowed()'],
    // doc.memoryUsage() → doc._memoryUsage()
    [/\.memoryUsage\s*\(\s*\)/g, '._memoryUsage()'],
    // doc.capacity() → doc._capacity()
    [/\.capacity\s*\(\s*\)/g, '._capacity()'],
    // doc.to<T>() → doc._to()
    [/\.to\s*\(\s*\)/g, '._to()'],
  ],

  constants: {
    DeserializationOk: 0,
    DeserializationIncompleteInput: 1,
    DeserializationInvalidInput: 2,
    DeserializationNoMemory: 3,
    DeserializationTooDeep: 4,
  },

  constructor: function(capacity) {
    const cap = Number(capacity) || 256;
    const doc = {
      __class: 'ArduinoJson',
      _data: {},
      _cap: cap,
      // Parse JSON string into the document
      _deserialize: function(input) {
        try {
          const str = typeof input === 'string' ? input : String(input);
          this._data = JSON.parse(str);
          return 0; // DeserializationOk
        } catch (e) {
          return 2; // DeserializationInvalidInput
        }
      },
      // Serialize document to string (fills char array)
      _serialize: function(output) {
        const str = JSON.stringify(this._data);
        if (typeof output === 'object' && output !== null) {
          for (let i = 0; i < str.length && i < output.length; i++) {
            output[i] = str.charCodeAt(i);
          }
        }
        return str.length;
      },
      _serializePretty: function(output) {
        const str = JSON.stringify(this._data, null, 2);
        if (typeof output === 'object' && output !== null) {
          for (let i = 0; i < str.length && i < output.length; i++) {
            output[i] = str.charCodeAt(i);
          }
        }
        return str.length;
      },
      _containsKey: function(key) {
        return this._data && this._data.hasOwnProperty(key);
      },
      _isType: function() { return true; },
      _asType: function() { return this._data; },
      _size: function() {
        if (Array.isArray(this._data)) return this._data.length;
        if (typeof this._data === 'object' && this._data !== null) return Object.keys(this._data).length;
        return 0;
      },
      _clear: function() { this._data = {}; },
      _noop: function() {},
      _overflowed: function() { return false; },
      _memoryUsage: function() { return JSON.stringify(this._data).length; },
      _capacity: function() { return this._cap; },
      _to: function() { return this._data; },
    };
    // Use Proxy so doc["key"] and doc.key both work for reading/writing JSON fields
    return new Proxy(doc, {
      get: function(target, prop) {
        if (prop in target) return target[prop];
        return target._data[prop];
      },
      set: function(target, prop, value) {
        if (prop in target && prop !== '_data') {
          target[prop] = value;
        } else {
          target._data[prop] = value;
        }
        return true;
      },
      has: function(target, prop) {
        return prop in target || (target._data && prop in target._data);
      },
    });
  },
};
