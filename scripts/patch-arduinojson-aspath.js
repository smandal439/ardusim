const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'js', 'libraries', 'arduinojson.js');
let s = fs.readFileSync(p, 'utf8');

if (s.includes('_asPath')) {
  console.log('already patched');
  process.exit(0);
}

const isRule = "    [/\\.is\\s*(?:<[^>]*>)?\\s*\\(\\s*\\)/g, '._isType()'],";
const asRule = "    [/\\.as\\s*(?:<[^>]*>)?\\s*\\(\\s*\\)/g, '._asType()'],";

const pathRules = [
  '    // doc["key"].as<T>() → doc._asPath("key")  (run BEFORE bare .as rule)',
  '    // field access returns a raw value with no _asType method',
  '    [/([A-Za-z_$][\\w$]*(?:\\s*\\[\\s*"[^"]+"\\s*\\])+\\s*)\\.as\\s*(?:<[^>]*>)?\\s*\\(\\s*\\)/g, function(m, expr) {',
  '      const keys = [];',
  '      const re = /\\[\\s*"([^"]+)"\\s*\\]/g;',
  '      let k;',
  '      while ((k = re.exec(expr))) keys.push("\'" + k[1] + "\'");',
  '      const obj = expr.replace(/\\s*\\[\\s*"[^"]+"\\s*\\]/g, "");',
  '      return obj + "._asPath(" + keys.join(",") + ")";',
  '    }],',
  '    // doc["key"].is<T>() → doc._isPath("key")  (run BEFORE bare .is rule)',
  '    [/([A-Za-z_$][\\w$]*(?:\\s*\\[\\s*"[^"]+"\\s*\\])+\\s*)\\.is\\s*(?:<[^>]*>)?\\s*\\(\\s*\\)/g, function(m, expr) {',
  '      const keys = [];',
  '      const re = /\\[\\s*"([^"]+)"\\s*\\]/g;',
  '      let k;',
  '      while ((k = re.exec(expr))) keys.push("\'" + k[1] + "\'");',
  '      const obj = expr.replace(/\\s*\\[\\s*"[^"]+"\\s*\\]/g, "");',
  '      return obj + "._isPath(" + keys.join(",") + ")";',
  '    }],',
].join('\n');

if (!s.includes(isRule)) {
  console.error('isRule not found');
  process.exit(1);
}
if (!s.includes(asRule)) {
  console.error('asRule not found');
  process.exit(1);
}
s = s.replace(isRule, pathRules + '\n' + isRule);

const asType = '      _asType: function() { return this._data; },';
const methods = [
  asType,
  '      // doc["a"]["b"].as<T>() → doc._asPath("a","b")',
  '      _asPath: function() {',
  '        let v = this._data;',
  '        for (let i = 0; i < arguments.length; i++) {',
  '          if (v == null) return undefined;',
  '          v = v[arguments[i]];',
  '        }',
  '        return v;',
  '      },',
  '      // doc["key"].is<T>() → doc._isPath("key")',
  '      _isPath: function() {',
  '        let v = this._data;',
  '        for (let i = 0; i < arguments.length; i++) {',
  "          if (v == null || typeof v !== 'object') return false;",
  '          v = v[arguments[i]];',
  '        }',
  '        return v !== undefined && v !== null;',
  '      },',
].join('\n');

if (!s.includes(asType)) {
  console.error('asType not found');
  process.exit(1);
}
s = s.replace(asType, methods);

fs.writeFileSync(p, s);
console.log('patched OK');
