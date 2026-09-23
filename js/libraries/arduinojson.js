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
    // StaticJsonDocument<128> doc; → var doc = new StaticJsonDocument(128)
    // (the generic class-constructor pass cannot match template args)
    [/\b(StaticJsonDocument|DynamicJsonDocument)\s*<\s*(\d+)\s*>\s+(\w+)\s*;/g, 'var $3 = new $1($2)'],
    // DeserializationError err = ... → var err = ...  (strip C++ result type)
    [/\bDeserializationError\s+(\w+)\s*=/g, 'var $1 ='],
    // deserializeJson(doc, input) → doc._deserialize(input)
    [/\bdeserializeJson\s*\(([^,]+),\s*([^)]+)\)/g, '$1._deserialize($2)'],
    // serializeJson(doc, output) → doc._serialize(output)
    // Also 3-arg form: serializeJson(doc, buf, sizeof(buf)) — drop size arg
    // Nested parens in sizeof(...) handled via ([^()]|\([^)]*\))*
    [/\bserializeJson\s*\(([^,]+),\s*([^,)]+)(?:\s*,\s*(?:[^()]|\([^)]*\))*)?\)/g, '$1._serialize($2)'],
    // serializeJsonPretty(doc, output) → doc._serializePretty(output)
    [/\bserializeJsonPretty\s*\(([^,]+),\s*([^,)]+)(?:\s*,\s*(?:[^()]|\([^)]*\))*)?\)/g, '$1._serializePretty($2)'],
    // doc.containsKey("key") → doc._containsKey("key")
    [/\.containsKey\s*\(/g, '._containsKey('],
    // doc.is<T>() / doc.is() → doc._isType()
    // doc["key"].as<T>() → doc._asPath("key")  (run BEFORE bare .as rule)
    // field access returns a raw value with no _asType method
    [/([A-Za-z_$][\w$]*(?:\s*\[\s*"[^"]+"\s*\])+\s*)\.as\s*(?:<[^>]*>)?\s*\(\s*\)/g, function(m, expr) {
      const keys = [];
      const re = /\[\s*"([^"]+)"\s*\]/g;
      let k;
      while ((k = re.exec(expr))) keys.push("'" + k[1] + "'");
      const obj = expr.replace(/\s*\[\s*"[^"]+"\s*\]/g, "");
      return obj + "._asPath(" + keys.join(",") + ")";
    }],
    // doc["key"].is<T>() → doc._isPath("key")  (run BEFORE bare .is rule)
    [/([A-Za-z_$][\w$]*(?:\s*\[\s*"[^"]+"\s*\])+\s*)\.is\s*(?:<[^>]*>)?\s*\(\s*\)/g, function(m, expr) {
      const keys = [];
      const re = /\[\s*"([^"]+)"\s*\]/g;
      let k;
      while ((k = re.exec(expr))) keys.push("'" + k[1] + "'");
      const obj = expr.replace(/\s*\[\s*"[^"]+"\s*\]/g, "");
      return obj + "._isPath(" + keys.join(",") + ")";
    }],
    [/\.is\s*(?:<[^>]*>)?\s*\(\s*\)/g, '._isType()'],
    // doc.as<T>() / doc.as() → doc._asType()  (e.g. .as<String>(), .as<float>())
    [/\.as\s*(?:<[^>]*>)?\s*\(\s*\)/g, '._asType()'],
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
    // doc.to<T>() / doc.to() → doc._to()
    [/\.to\s*(?:<[^>]*>)?\s*\(\s*\)/g, '._to()'],
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
    // Coerce sketch input to a JSON string. Handles C char[] buffers that
    // hold byte values (e.g. filled by LoRa.read / serial) — String(array)
    // would join with commas and break JSON.parse.
    function _coerceJsonInput(input) {
      if (typeof input === 'string') return input;
      if (input == null) return '';
      // Typed or plain array of byte/char values → decode until NUL
      if (typeof input === 'object' && typeof input.length === 'number') {
        let s = '';
        for (let i = 0; i < input.length; i++) {
          const c = input[i];
          if (c === 0 || c === undefined || c === null) break;
          s += (typeof c === 'number') ? String.fromCharCode(c & 0xff) : String(c);
        }
        return s;
      }
      return String(input);
    }
    // Fill a JS array as a C char[]: store char codes, null-terminate, and
    // give it a toString so Serial.println / LoRa.print print the JSON string
    // instead of "123,34,105,..."
    function _fillCharBuf(buf, str) {
      if (buf == null) return;
      if (typeof buf === 'string') return; // cannot mutate
      if (typeof buf !== 'object') return;
      const n = typeof buf.length === 'number' ? buf.length : str.length;
      for (let i = 0; i < str.length && i < n; i++) {
        buf[i] = str.charCodeAt(i);
      }
      // null-terminate if there's room (array pre-filled with 0s otherwise)
      if (str.length < n) buf[str.length] = 0;
      if (Array.isArray(buf) || typeof buf.length === 'number') {
        buf.toString = function () {
          let s = '';
          for (let i = 0; i < this.length; i++) {
            const c = this[i];
            if (c === 0 || c === undefined || c === null) break;
            s += (typeof c === 'number' ? String.fromCharCode(c & 0xff) : String(c));
          }
          return s;
        };
        buf.valueOf = buf.toString;
      }
    }
    const doc = {
      __class: 'ArduinoJson',
      _data: {},
      _cap: cap,
      // Parse JSON string into the document
      // Accepts: string, or C char[] as number array (byte values from LoRa.read etc.)
      _deserialize: function(input) {
        try {
          const str = _coerceJsonInput(input);
          this._data = JSON.parse(str);
          return 0; // DeserializationOk
        } catch (e) {
          return 2; // DeserializationInvalidInput
        }
      },
      // Serialize document to string (fills char array)
      _serialize: function(output) {
        const str = JSON.stringify(this._data);
        _fillCharBuf(output, str);
        return str.length;
      },
      _serializePretty: function(output) {
        const str = JSON.stringify(this._data, null, 2);
        _fillCharBuf(output, str);
        return str.length;
      },
      _containsKey: function(key) {
        return this._data && this._data.hasOwnProperty(key);
      },
      _isType: function() { return true; },
      _asType: function() { return this._data; },
      // doc["a"]["b"].as<T>() → doc._asPath("a","b")
      _asPath: function() {
        let v = this._data;
        for (let i = 0; i < arguments.length; i++) {
          if (v == null) return undefined;
          v = v[arguments[i]];
        }
        return v;
      },
      // doc["key"].is<T>() → doc._isPath("key")
      _isPath: function() {
        let v = this._data;
        for (let i = 0; i < arguments.length; i++) {
          if (v == null || typeof v !== 'object') return false;
          v = v[arguments[i]];
        }
        return v !== undefined && v !== null;
      },
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
        if (prop === '_data') {
          target._data = value;
        } else if (prop in target) {
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
