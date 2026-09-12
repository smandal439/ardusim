/* ═══════════════════════════════════════════════════════
   simulator.js — Arduino C++ Interpreter & Execution Engine
   ═══════════════════════════════════════════════════════ */

'use strict';

class ArduinoSimulator {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.simTime = 0; // ms
    this.speed = 1;
    this.board = 'arduino_uno'; // arduino_uno | esp32_devkit_v1
    this.boardIndex = 0; // 0 = primary, 1 = secondary (for dual-board)
    this.pinStates = {}; // pinKey → value (0-255, or 0/1)
    this.pinModes = {}; // pinKey → INPUT/OUTPUT/INPUT_PULLUP
    this.serialBaud = 9600;
    this.serialInputBuffer = [];
    this._loopAbortController = null;
    this._loopPromise = null;
    this.onSerial = null;  // callback(text, type)
    this.onStart = null;  // callback() — fired when the simulation loop actually starts
    this.onPinChange = null;  // callback(pinKey, value)
    this.onError = null;  // callback(err)
    this.onStatus = null;  // callback(msg)
    this.onStop = null;  // callback()
    this.onTick = null;  // callback(simTime, fps, loopCount)
    this._toneActive = {};
    this._toneCtx = null;
    this._toneOscillators = {};
    this._startRealTime = 0;
    this._delays = [];
    this._mqttOpen = []; // live MQTT.js connections to close on stop/run
    this._customDelay = null;
    // FPS / loop tracking
    this._fps = 0;
    this._fpsFrames = 0;
    this._fpsLast = 0;
    this._loopCount = 0;
    this._fpsInterval = null;
    this._runSeq = 0;
    // Infinite-loop guard: max iterations per real-second without a delay
    this._iterSinceDelay = 0;
    this._MAX_TIGHT_ITERS = 50000;
    // EEPROM simulation (512 bytes)
    this._eeprom = new Uint8Array(512);
    // ESP32 LEDC PWM channel registry: channel → { pin, freq, resolution, maxDuty }
    this._ledcChannels = {};
  }

  /* ══════════════ LIBRARY PLUGIN SYSTEM ══════════════ */
  _getPlugins() {
    return window.ArduinoLibs || {};
  }

  /**
   * Extract #include directives from source code BEFORE they are stripped.
   * Returns a Set of header names, e.g. {"esp_now.h", "WiFi.h"}
   */
  _extractIncludes(code) {
    const includes = new Set();
    const re = /^[ \t]*#\s*include\s*[<"]([^>"]+)[>"]/gm;
    let m;
    while ((m = re.exec(code)) !== null) {
      includes.add(m[1]);
    }
    return includes;
  }

  /**
   * Filter plugins: only return those whose `includes` array overlaps with
   * the sketch's #include directives. Plugins with NO includes are always active.
   * This prevents e.g. BluetoothSerial rules from running on an ESP-NOW sketch.
   */
  _getActivePlugins(code) {
    const all = this._getPlugins();
    const sketchIncludes = this._extractIncludes(code);
    const active = {};

    for (const [name, lib] of Object.entries(all)) {
      // Plugins with no includes array (or empty) are always active
      if (!lib.includes || lib.includes.length === 0) {
        active[name] = lib;
        continue;
      }
      // Check if ANY of this plugin's includes appear in the sketch
      for (const inc of lib.includes) {
        // Normalize: strip < > " ' wrappers for comparison
        const normalized = inc.replace(/^[<"']|[>"]$/g, '');
        if (sketchIncludes.has(normalized)) {
          active[name] = lib;
          break;
        }
      }
    }
    return active;
  }

  /* ══════════════ TRANSPILER ══════════════ */
  transpile(code) {
    if (typeof code !== 'string') code = '';
    // Store active plugins for buildContext() to use (avoids re-scanning)
    this._activePlugins = this._getActivePlugins(code);
    let js = code;

    // Remove comments temporarily for processing, then restore
    // Actually keep comments — they're valid JS too

    // 1. Handle #define macros (simple value replacement)
    const defines = {};
    js = js.replace(/^[ \t]*#define\s+(\w+)\s+(.+?)[ \t]*(?:\/\/.*)?$/gm, (_, name, value) => {
      defines[name] = value.trim();
      return `/* #define ${name} ${value} */`;
    });

    // 2. Remove other preprocessor directives
    js = js.replace(/^[ \t]*#[^\n]*/gm, '');

    // 3. Apply #define substitutions (simple word replacement)
    //    Skip function-like macros (e.g. #define FOO(x) ...) but allow
    //    parenthesized constants (e.g. #define SEALEVELPRESSURE_HPA (1013.25)).
    for (const [name, value] of Object.entries(defines)) {
      if (!/^[A-Za-z_]\w*$/.test(name)) continue;
      if (/^\w+\s*\(/.test(value)) continue; // function-like macro — leave untouched
      js = js.replace(new RegExp(`\\b${name}\\b`, 'g'), () => value);
    }

    // 4. Replace function declarations (return type + name + params + brace)
    const userFnNames = new Set();
    js = js.replace(/\bF\s*\(\s*("[^"]*"|'[^']*')\s*\)/g, '$1');
    // Build type pattern from centralized definitions
    const _types = window.CppTypes;
    const _typePat = _types ? _types.getTypePattern() :
      'void|bool|char|int|float|double|long|short|byte|boolean|unsigned|signed|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|ssize_t';
    const _fullTypePat = _types ? _types.getFullTypeRegex().source.replace(/^/, '(?:').replace(/$/, '').replace(/\(\?:const\\s\+\)/g, '(?:const\\s+)?').replace(/\(\?:unsigned\\s\+\)/g, '(?:unsigned\\s+)?') : `(?:const\\s+)?(?:unsigned\\s+)?(?:${_typePat})\\s*\\*?\\s*`;

    js = js.replace(
      new RegExp(`\\b(?:void|int|float|double|long|unsigned|unsigned\\s+long|unsigned\\s+int|unsigned\\s+char|byte|boolean|bool|char\\s*\\*?|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`, 'g'),
      (match, name, params) => {
        userFnNames.add(name);
        const cleanParams = params.replace(
          new RegExp(`\\b(?:const\\s+)?(?:unsigned\\s+)?(?:${_typePat})\\s*[&*]?\\s*`, 'g'), ''
        );
        return `async function ${name}(${cleanParams}) {`;
      }
    );

    // 4b. Plugin-specific transpile rules (BEFORE variable declarations)
    //     so plugin rules like esp_now_peer_info_t can match before Type→let stripping
    //     Only apply plugins whose #include headers are present in the sketch.
    const _plugins = this._activePlugins;
    const _pluginEntries = Object.entries(_plugins).sort((a, b) => (a[1].priority || 50) - (b[1].priority || 50));
    for (const [_libName, _lib] of _pluginEntries) {
      if (_lib.transpile) {
        for (const [_pattern, _replacement] of _lib.transpile) {
          js = js.replace(_pattern, _replacement);
        }
      }
    }

    // 5. Handle variable declarations (not already transformed)
    // Strip C-style casts: (unsigned char)1 → 1, (long)expr → expr
    js = js.replace(new RegExp(`\\((?:unsigned\\s+char|unsigned\\s+long|unsigned\\s+int|unsigned\\s+short|unsigned|long\\s+long|long|int|short|byte|float|double)\\)\\s*(?=[a-zA-Z0-9_\\(])`, 'g'), '');
    // unsigned char x; → let x;  (MUST be before plain char rule)
    js = js.replace(/\bunsigned\s+char\s+(\w+)(?=\s*[=;,\[\)])/g, 'let $1');
    // Type var = ...; → let var = ...; (using centralized types)
    js = js.replace(new RegExp(`\\b(?:unsigned\\s+)?(?:${_typePat})\\s+(\\w+)(?=\\s*[=;,\\[\\)])`, 'g'), 'let $1');
    // char x = 'a'; → let x = 'a';
    js = js.replace(/\bchar\s+(\w+)(?=\s*[=;,\[\)])/g, 'let $1');
    // Standalone unsigned x; → let x; (unsigned alone = unsigned int in C)
    js = js.replace(/\bunsigned\s+(\w+)(?=\s*[=;,\[\)])/g, 'let $1');
    // Handle const
    js = js.replace(/\bconst\s+let\b/g, 'let');
    js = js.replace(/\bconst\s+var\b/g, 'var');
    js = js.replace(/\bconst\s+async\b/g, 'async');
    // Strip const before type keywords: const int x = 5; → int x = 5;
    js = js.replace(new RegExp(`\\bconst\\s+((?:unsigned\\s+)?(?:${_typePat}))\\s*\\*?\\s*`, 'g'), '$1 ');
    // char* name[] = { ... } → var name = [ ... ]  (C-style string array)
    js = js.replace(/\bchar\s*\*\s+(\w+)\s*\[\s*\]\s*=\s*\{([^}]*)\}/g, 'var $1 = [$2]');

    // C++ pointer dereference: stream->method() → stream.method()
    js = js.replace(/->/g, '.');
    // C++ address-of in function args: func(&var) → func(var)
    js = js.replace(/([,(]\s*)&(\w+)/g, '$1$2');
    // Re-clean const after pointer rule may have introduced 'const var'
    js = js.replace(/\bconst\s+let\b/g, 'let');
    js = js.replace(/\bconst\s+var\b/g, 'var');

    // C++ std math functions → JavaScript Math.*
    // atan2 is provided by js/libraries/math.js plugin
    js = js.replace(/\bsqrt\s*\(/g, 'Math.sqrt(');
    js = js.replace(/\babs\s*\(/g, 'Math.abs(');
    js = js.replace(/\bpow\s*\(/g, 'Math.pow(');
    js = js.replace(/\bsin\s*\(/g, 'Math.sin(');
    js = js.replace(/\bcos\s*\(/g, 'Math.cos(');
    js = js.replace(/\btan\s*\(/g, 'Math.tan(');
    js = js.replace(/\bround\s*\(/g, 'Math.round(');
    js = js.replace(/\bfloor\s*\(/g, 'Math.floor(');
    js = js.replace(/\bceil\s*\(/g, 'Math.ceil(');
    // Bare PI constant → Math.PI (word boundary so "Serial" etc. unchanged)
    js = js.replace(/\bPI\b/g, 'Math.PI');

    // Object-style library declarations:
    // Servo myServo;  →  let myServo = new Servo();
    // LiquidCrystal lcd(12, 11, 5, 4, 3, 2);  →  let lcd = new LiquidCrystal(12, 11, 5, 4, 3, 2);
    // WiFiClient espClient;  →  let espClient = new WiFiClient();
    // PubSubClient client(espClient);  →  let client = new PubSubClient(espClient);
    // WebServer server(80);  →  let server = new WebServer(80);
    // Adafruit_SSD1306 display(128, 64, &Wire, -1);  →  let display = new Adafruit_SSD1306(128, 64, Wire, -1);
    // Adafruit_ILI9341 tft(CS, DC, MOSI, SCK, RESET);  →  let tft = new Adafruit_ILI9341(CS, DC, MOSI, SCK, RESET);
    js = js.replace(/\b(Servo|LiquidCrystal|LiquidCrystal_I2C|WiFiClient|PubSubClient|WebServer|Adafruit_SSD1306|Adafruit_ILI9341|SimpleBME280|Adafruit_VL53L0X|DHT|Stepper)\s+(\w+)\s*(?:\(([^)]*)\))?\s*;/g, 'let $2 = new $1($3)');
    // Adafruit_VL53L0X lox = Adafruit_VL53L0X();  →  let lox = new Adafruit_VL53L0X();
    js = js.replace(/\b(Adafruit_VL53L0X)\s+(\w+)\s*=\s*\1\s*\(([^)]*)\)\s*;?/g, function (_, t, n, a) { return 'let ' + n + ' = new ' + t + '(' + a + ');'; });

    // Plugin-provided class constructors
    const plugins = this._activePlugins;
    // Sort plugins: lower priority runs first; LCD plugins run last (priority 100) so their
    // broad \w+ rules don't hijack method calls from Servo, Wire, SPI, etc.
    const pluginEntries = Object.entries(plugins).sort((a, b) => (a[1].priority || 50) - (b[1].priority || 50));
    for (const [libName, lib] of pluginEntries) {
      if (lib.classes) {
        for (const cls of lib.classes) {
          // ClassName varName; or ClassName varName(args);
          js = js.replace(new RegExp(`\\b${cls}\\s+(\\w+)\\s*(?:\\(([^)]*)\\))?\\s*;`, 'g'), `var $1 = new ${cls}($2)`);
          // ClassName varName = ClassName(args);
          js = js.replace(new RegExp(`\\b${cls}\\s+(\\w+)\\s*=\\s*${cls}\\s*\\(([^)]*)\\)\\s*;`, 'g'), `var $1 = new ${cls}($2)`);
        }
      }
    }

    // 5c. Second pass: re-apply plugin transpile rules after class constructors
    //     so `new Stepper(...)` created by constructor detection gets transpiled
    for (const [_libName, _lib] of pluginEntries) {
      if (_lib.transpile) {
        for (const [_pattern, _replacement] of _lib.transpile) {
          js = js.replace(_pattern, _replacement);
        }
      }
    }

    // Pre-pass: remove typedef/struct definitions BEFORE generic constructor detection
    // typedef struct { ... } Name; → remove
    js = js.replace(/\btypedef\s+struct\s*\{[^}]*\}\s*\w+\s*;/g, '');
    // struct Name { ... }; → remove
    js = js.replace(/\bstruct\s+\w+\s*\{[^}]*\}\s*;/g, '');
    // struct Name varName; → var varName = {};
    js = js.replace(/\bstruct\s+(\w+)\s+(\w+)\s*;/g, 'var $2 = {};');
    // PascalCaseTypeName varName; → var varName = {};  (catches struct/class instances like DataPacket myData;)
    js = js.replace(/\b([A-Z]\w+)\s+(\w+)\s*;/g, function (match, typeName, varName) {
      if (/^(Serial|Wire|SPI|WiFi|WiFiClient|EEPROM|Stream|Print|HardwareSerial|Serial1|Serial2)$/.test(typeName)) return match;
      if (/^(If|Else|For|While|Do|Switch|Case|Return|Function|Var|Let|Const|Import|Export|New|Delete|Try|Catch|Finally|Throw|Async|Await|Yield|Static|Super|With|Debugger|In|Of|This|Void|Typeof|Instanceof|Null|Undefined|True|False|Break|Continue|Default)$/.test(typeName)) return match;
      return 'var ' + varName + ' = {};';
    });

    // Generic fallback: any PascalCase identifier used as constructor
    js = js.replace(/\b([A-Z][A-Za-z0-9_]{2,})\s+(\w+)\s*(?:\(([^)]*)\))?\s*;/g, function (match, cls, name, args) {
      // Skip already-handled known types and JS keywords
      if (/^(Servo|LiquidCrystal|WiFiClient|PubSubClient|WebServer|Serial|String|Array|Object|Math|Date|RegExp|Error|Promise|Map|Set|JSON|Number|Boolean|Function|true|false|null|undefined|NaN|Infinity)$/.test(cls)) return match;
      return `var ${name} = new ${cls}(${args || ''})`;
    });

    // C++ passes I2C objects by reference: `&Wire` is invalid JS. Strip the `&`
    // only inside Adafruit_SSD1306 constructors to avoid breaking `a & b`.
    js = js.replace(/new\s+Adafruit_SSD1306\s*\(([^)]*)\)/g, (_, args) => `new Adafruit_SSD1306(${args.replace(/&\s*/g, '')})`);
    js = js.replace(/new\s+Adafruit_ILI9341\s*\(([^)]*)\)/g, (_, args) => `new Adafruit_ILI9341(${args.replace(/&\s*/g, '')})`);

    // 6. Handle arrays: int arr[10] → let arr = new Array(10).fill(0)
    js = js.replace(/let\s+(\w+)\s*\[(\d+)\]\s*=\s*\{([^}]*)\}/g, 'let $1 = [$3]');
    js = js.replace(/let\s+(\w+)\s*\[\s*\]\s*=\s*\{([^}]*)\}/g, 'let $1 = [$2]');
    js = js.replace(/let\s+(\w+)\s*\[(\d+)\](?!\s*=)/g, 'let $1 = new Array($2).fill(0)');
    js = js.replace(/let\s+(\w+)\s*\[\s*\](?!\s*=)/g, 'let $1 = []');
    // Also handle var arrays (from pointer/const stripping): var arr[] = {...} → var arr = [...]
    js = js.replace(/var\s+(\w+)\s*\[\s*\]\s*=\s*\{([^}]*)\}/g, 'var $1 = [$2]');
    // C-style char arrays with string literals: char str[20] = "hi"; / char msg[] = "hi";
    js = js.replace(/let\s+(\w+)\s*\[\s*\d*\s*\]\s*=\s*("[^"]*"|'[^']*')/g, 'let $1 = $2');
    // Pointer declarations: WiFiClient* stream = ... → var stream = ...
    js = js.replace(/\b(\w+)\s*\*\s+(\w+)\s*=/g, 'var $2 =');
    // Re-clean const after pointer rule may have introduced 'const var' or 'const let'
    js = js.replace(/\bconst\s+let\b/g, 'let');
    js = js.replace(/\bconst\s+var\b/g, 'var');

    // 7. Boolean literals
    js = js.replace(/\btrue\b/g, 'true');
    // sizeof(expr) → expr.length (simplified — works for arrays/buffers)
    js = js.replace(/\bsizeof\s*\((\w+)\)/g, '$1.length');
    // Arduino String .c_str() → already a JS string, just strip
    js = js.replace(/\.\s*c_str\s*\(\s*\)/g, '');
    // Preserve C++ integer division for common clock field calculations.
    js = js.replace(/\blet\s+(hours|minutes)\s*=\s*([^;\n]+?)\s*\/\s*(\d+)\s*;/g, 'let $1 = Number.parseInt(($2) / $3, 10);');
    js = js.replace(/\bfalse\b/g, 'false');

    // Strip leftover C storage/qualifier keywords that are invalid JS
    // Strip C storage/qualifier keywords that may appear before any type
    js = js.replace(/\b(?:static|volatile|extern|register)\s+(?=async\b)/g, '');
    js = js.replace(/\b(?:static|volatile|extern|register)\s+(?=\w)/g, '');
    // Clean const after the above rule may have introduced 'const var' etc.
    js = js.replace(/\bconst\s+let\b/g, 'let');
    js = js.replace(/\bconst\s+var\b/g, 'var');

    // 7a. Convert C char literals to charCode numbers: '1' → 49, 'A' → 65, '\n' → 10
    // Only single-quoted single characters (not double-quoted strings or multi-char)
    js = js.replace(/'\\n'/g, '10');
    js = js.replace(/'\\r'/g, '13');
    js = js.replace(/'\\t'/g, '9');
    js = js.replace(/'\\\\'/g, '92');
    js = js.replace(/''/g, '0');
    js = js.replace(/'.'/g, (match) => match.charCodeAt(1));

    // 8. Arduino constants
    js = js.replace(/\bHIGH\b/g, '1');
    js = js.replace(/\bLOW\b/g, '0');
    js = js.replace(/\bINPUT_PULLUP\b/g, '"INPUT_PULLUP"');
    js = js.replace(/\bINPUT\b/g, '"INPUT"');
    js = js.replace(/\bOUTPUT\b/g, '"OUTPUT"');
    if (this.board === 'esp32_devkit_v1') {
      // ESP32 DevKit V1: built-in LED is on GPIO2; the common analog
      // pins map to the board's ADC-capable GPIOs.
      js = js.replace(/\bLED_BUILTIN\b/g, '2');
      js = js.replace(/\bA0\b/g, '36');
      js = js.replace(/\bA1\b/g, '39');
      js = js.replace(/\bA2\b/g, '34');
      js = js.replace(/\bA3\b/g, '35');
      js = js.replace(/\bA4\b/g, '32');
      js = js.replace(/\bA5\b/g, '33');
    } else if (this.board === 'arduino_nano') {
      // Arduino Nano: ATmega328P, LED on D13, A0-A7 analog pins (A0=14..A7=21)
      js = js.replace(/\bLED_BUILTIN\b/g, '13');
      js = js.replace(/\bA0\b/g, '14');
      js = js.replace(/\bA1\b/g, '15');
      js = js.replace(/\bA2\b/g, '16');
      js = js.replace(/\bA3\b/g, '17');
      js = js.replace(/\bA4\b/g, '18');
      js = js.replace(/\bA5\b/g, '19');
      js = js.replace(/\bA6\b/g, '20');
      js = js.replace(/\bA7\b/g, '21');
    } else {
      js = js.replace(/\bLED_BUILTIN\b/g, '13');
      js = js.replace(/\bA0\b/g, '14');
      js = js.replace(/\bA1\b/g, '15');
      js = js.replace(/\bA2\b/g, '16');
      js = js.replace(/\bA3\b/g, '17');
      js = js.replace(/\bA4\b/g, '18');
      js = js.replace(/\bA5\b/g, '19');
    }
    js = js.replace(/\bDEC\b/g, '10');
    js = js.replace(/\bHEX\b/g, '16');
    js = js.replace(/\bOCT\b/g, '8');
    js = js.replace(/\bBIN\b/g, '2');
    js = js.replace(/\bMSBFIRST\b/g, '1');
    js = js.replace(/\bLSBFIRST\b/g, '0');

    // 9b. Strip unsupported C++ type declarations
    js = js.replace(/\bunsigned\s+long\s+/g, 'var ');
    js = js.replace(/\bunsigned\s+int\s+/g, 'var ');
    js = js.replace(/\bunsigned\s+short\s+/g, 'var ');
    js = js.replace(/\bunsigned\s+char\s+/g, 'var ');
    js = js.replace(/\bconst\s+char\s*\*\s*/g, 'var ');
    js = js.replace(/\bconst\s+String\s*/g, 'var ');
    js = js.replace(/\bconst\s+int\s+/g, 'var ');
    js = js.replace(/\bconst\s+float\s+/g, 'var ');
    js = js.replace(/\bconst\s+double\s+/g, 'var ');
    js = js.replace(/\bint\s+(?=[a-zA-Z_])/g, 'var ');
    js = js.replace(/\bfloat\s+(?=[a-zA-Z_])/g, 'var ');
    js = js.replace(/\bdouble\s+(?=[a-zA-Z_])/g, 'var ');
    js = js.replace(/\blong\s+(?=[a-zA-Z_])/g, 'var ');
    js = js.replace(/\bshort\s+(?=[a-zA-Z_])/g, 'var ');
    js = js.replace(/\bchar\s+(?=[a-zA-Z_])/g, 'var ');
    js = js.replace(/\bbyte\s+(?=[a-zA-Z_])/g, 'var ');
    js = js.replace(/\bString\s+/g, 'var ');

    // 9c. Map Arduino API calls to _a.* (provided by buildContext + plugins)
    // Standard C math (sin, cos, atan2, sqrt, etc.) is mapped by the regex
    // rules in Section 4 to Math.*. Only Arduino-specific and plugin-provided
    // functions that need _a.* prefix are listed here.
    const API = [
      ['delay', '_a.delay'],
      ['delayMicroseconds', '_a.delayMicroseconds'],
      ['pinMode', '_a.pinMode'],
      ['digitalWrite', '_a.digitalWrite'],
      ['digitalRead', '_a.digitalRead'],
      ['analogWrite', '_a.analogWrite'],
      ['analogRead', '_a.analogRead'],
      ['millis', '_a.millis'],
      ['micros', '_a.micros'],
      ['tone', '_a.tone'],
      ['noTone', '_a.noTone'],
      ['pulseIn', '_a.pulseIn'],
      ['attachInterrupt', '_a.attachInterrupt'],
      ['detachInterrupt', '_a.detachInterrupt'],
      ['randomSeed', '_a.randomSeed'],
      ['random', '_a.random'],
      ['ntpEpoch', '_a.ntpEpoch'],
      ['map', '_a.map'],
      ['constrain', '_a.constrain'],
      ['atan2', '_a.atan2'],
      ['min', '_a.min'],
      ['max', '_a.max'],
      ['sin8', '_a.sin8'],
      ['cos8', '_a.cos8'],
      ['shiftIn', '_a.shiftIn'],
      ['shiftOut', '_a.shiftOut'],
      ['bitRead', '_a.bitRead'],
      ['bitWrite', '_a.bitWrite'],
      ['bitSet', '_a.bitSet'],
      ['bitClear', '_a.bitClear'],
      ['bit', '_a.bit'],
      ['lowByte', '_a.lowByte'],
      ['highByte', '_a.highByte'],
      ['sensorValue', '_a.sensorValue'],
      ['digitalPinToInterrupt', '_a.digitalPinToInterrupt'],
      // ESP32 APIs
      ['ledcSetup', '_a.ledcSetup'],
      ['ledcSetupChannel', '_a.ledcSetupChannel'],
      ['ledcAttachPin', '_a.ledcAttachPin'],
      ['ledcAttach', '_a.ledcAttach'],
      ['ledcWrite', '_a.ledcWrite'],
      ['ledcRead', '_a.ledcRead'],
      ['dacWrite', '_a.dacWrite'],
      ['analogReadMilliVolts', '_a.analogReadMilliVolts'],
      ['analogReadMicroVolts', '_a.analogReadMicroVolts'],
      ['touchRead', '_a.touchRead'],
      ['hallRead', '_a.hallRead'],
      ['temperatureRead', '_a.temperatureRead'],
      ['digitalPinToInterrupt', '_a.digitalPinToInterrupt'],
    ];

    for (const [orig, mapped] of API) {
      js = js.replace(new RegExp(`\\b${orig}\\b(?=\\s*\\()`, 'g'), mapped);
    }

    // Convert &ref args in I2S calls to reference objects: &bytesWritten → __i2sRef1
    // then read back after: bytesWritten = __i2sRef1.val
    js = js.replace(/(await\s+)?(_a\.i2s\w+)\s*\(([^)]*)\)/g, (_, awaitPrefix, fn, args) => {
      let refCount = 0;
      const refNames = [];
      const newArgs = args.replace(/&\s*(\w+)/g, (m, refName) => {
        refCount++;
        const rn = '__i2sRef' + refCount;
        refNames.push({ ref: rn, var: refName });
        return rn;
      });
      let prefix = '';
      for (const r of refNames) {
        prefix += 'var ' + r.ref + '={val:0};';
      }
      let result = (awaitPrefix || '') + fn + '(' + newArgs + ')';
      for (const r of refNames) {
        result += ';' + r.var + '=' + r.ref + '.val';
      }
      return prefix + result;
    });
    // I2S designated-initializer structs → plain JS objects
    js = js.replace(/\b(i2s_config_t|i2s_pin_config_t)\s+(\w+)\s*=\s*\{/g, 'var $2 = {');
    // Designated initializers: only lines starting with whitespace + .field =
    js = js.replace(/^\s+\.(\w+)\s*=\s*/gm, '  $1: ');
    // Strip I2S type casts: (i2s_mode_t)(...) → (...)
    js = js.replace(/\(i2s_mode_t\)\s*/g, '');

    // Make delay async
    js = js.replace(/_a\.delay\s*\(/g, 'await _a.delay(');
    js = js.replace(/_a\.delayMicroseconds\s*\(/g, 'await _a.delayMicroseconds(');
    js = js.replace(/_a\.pulseIn\s*\(/g, 'await _a.pulseIn(');

    // Stepper.step() is blocking on real hardware — await the animated motion
    js = js.replace(/(?<!await\s)_a\.stepperStep\s*\(/g, 'await _a.stepperStep(');

    // Auto-await calls to user-defined functions (they were transpiled to `async`,
    // so an unawaited call would assign a Promise instead of the returned value).
    for (const name of userFnNames) {
      js = js.replace(
        new RegExp(`(?<!function\\s)(?<!await\\s)(?<![\\w.])\\b${name}\\s*\\(`, 'g'),
        `await ${name}(`
      );
    }

    // Remove C++ type casts like (int), (float), etc.
    js = js.replace(new RegExp(`\\((?:${_typePat}|size_t)\\)\\s*`, 'g'), '');

    // C++ pointer dereference: *(type *)var → var
    // e.g. *(int *)data → data, *(float *)ptr → ptr
    js = js.replace(new RegExp(`\\*\\(\\s*(?:${_typePat}|size_t)\\s*\\*\\)\\s*(\\w+)`, 'g'), '$1');

    // memcpy(&dest, src, sizeof(dest)) → dest = src (for struct copy)
    // Also matches after sizeof has been replaced with .length
    js = js.replace(/\bmemcpy\s*\(\s*&(\w+)\s*,\s*(\w+)\s*,\s*(?:\1\.length|sizeof\s*\(\s*\1\s*\))\s*\)/g, '$1 = $2');

    // memcpy(dest, src, len) → _a.memcpy(dest, src, len) — fallback
    js = js.replace(/\bmemcpy\s*\(([^)]+)\)/g, '_a.memcpy($1)');

    // StructType varName = { field: value, ... }; → var varName = { field: value, ... };
    js = js.replace(/\b(\w+)\s+(\w+)\s*=\s*\{/g, function (match, type, name) {
      // Skip known keywords, function calls, etc.
      if (/^(var|let|const|function|return|if|else|for|while|do|switch|case|break|continue|new|delete|typeof|instanceof|void|null|undefined|true|false|this|class|extends|import|export|default|try|catch|finally|throw|async|await|yield|static|super|with|debugger|in|of)$/.test(type)) return match;
      return 'var ' + name + ' = {';
    });

    // String() → String()  (already fine for JS)
    // String to string comparison: == for strings works in JS, so fine
    // .charAt(), .length, .indexOf() — all work in JS

    // Fix: handle C++ string char arrays declared as: char str[20];
    // Already handled above

    // Arduino String methods are in-place but JS String.prototype methods return new strings.
    // Convert: command.trim();  →  command = command.trim();
    // Convert: command.toLowerCase();  →  command = command.toLowerCase();
    // Convert: command.toUpperCase();  →  command = command.toUpperCase();
    js = js.replace(/\b(\w+)\.trim\(\)\s*;/g, function (_, v) { return v + ' = ' + v + '.trim();'; });
    js = js.replace(/\b(\w+)\.toLowerCase\(\)\s*;/g, function (_, v) { return v + ' = ' + v + '.toLowerCase();'; });
    js = js.replace(/\b(\w+)\.toUpperCase\(\)\s*;/g, function (_, v) { return v + ' = ' + v + '.toUpperCase();'; });

    return js;
  }

  /* ══════════════ EXECUTION CONTEXT ══════════════ */
  buildContext() {
    const self = this;

    const result = {
      _a: {
        /* Pin control */
        pinMode(pin, mode) {
          const key = `pin_${pin}`;
          self.pinModes[key] = mode;
          self._emitPinChange(key, self.pinStates[key] || 0);
        },
        digitalWrite(pin, val) {
          const key = `pin_${pin}`;
          const v = val ? 1 : 0;
          self.pinStates[key] = v;
          self._emitPinChange(key, v);
        },
        digitalRead(pin) {
          const key = `pin_${pin}`;

          // Live keypad column detection: compute column state on-read
          // based on current row pin states, so each scan row gets correct values.
          const canvas = window.CircuitCanvas;
          if (canvas && canvas.components && canvas.wires) {
            const keyMap = [
              ['1', '2', '3', 'A'],
              ['4', '5', '6', 'B'],
              ['7', '8', '9', 'C'],
              ['*', '0', '#', 'D']
            ];
            for (const inst of canvas.components) {
              if (inst.type !== 'keypad_4x4') continue;
              const pressedKey = inst.runtimeState?.pressedKey ?? inst.props?.pressedKey ?? null;
              if (!pressedKey) continue;
              // Find which column pin of this keypad is connected to the Arduino pin being read
              let colIdx = -1;
              for (let c = 0; c < 4; c++) {
                const cPinId = 'C' + (c + 1);
                for (const w of canvas.wires) {
                  let arduinoPinNum = null;
                  if (w.from.instId === inst.id && w.from.pinId === cPinId) {
                    const other = canvas.components.find(ci => ci.id === w.to.instId);
                    if (other && (other.type === 'arduino_uno' || other.type === 'arduino_nano' || other.type === 'esp32_devkit_v1')) {
                      arduinoPinNum = canvas._pinToNumber(w.to.pinId);
                    }
                  } else if (w.to.instId === inst.id && w.to.pinId === cPinId) {
                    const other = canvas.components.find(ci => ci.id === w.from.instId);
                    if (other && (other.type === 'arduino_uno' || other.type === 'arduino_nano' || other.type === 'esp32_devkit_v1')) {
                      arduinoPinNum = canvas._pinToNumber(w.from.pinId);
                    }
                  }
                  if (arduinoPinNum === pin) { colIdx = c; break; }
                }
                if (colIdx >= 0) break;
              }
              if (colIdx < 0) continue;
              // Find which row and column the pressed key is on
              let pressedRow = -1, pressedCol = -1;
              for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                  if (keyMap[r][c] === pressedKey) { pressedRow = r; pressedCol = c; }
                }
              }
              if (pressedRow < 0 || pressedCol < 0) continue;
              // Only respond if the scanned column matches the pressed key's column
              if (colIdx !== pressedCol) return 1;
              // Check if that row pin is currently LOW
              const rPinId = 'R' + (pressedRow + 1);
              for (const w of canvas.wires) {
                let rPinNum = null;
                if (w.from.instId === inst.id && w.from.pinId === rPinId) {
                  const other = canvas.components.find(ci => ci.id === w.to.instId);
                  if (other && (other.type === 'arduino_uno' || other.type === 'arduino_nano' || other.type === 'esp32_devkit_v1')) {
                    rPinNum = canvas._pinToNumber(w.to.pinId);
                  }
                } else if (w.to.instId === inst.id && w.to.pinId === rPinId) {
                  const other = canvas.components.find(ci => ci.id === w.from.instId);
                  if (other && (other.type === 'arduino_uno' || other.type === 'arduino_nano' || other.type === 'esp32_devkit_v1')) {
                    rPinNum = canvas._pinToNumber(w.from.pinId);
                  }
                }
                if (rPinNum !== null) {
                  const rState = self.pinStates[`pin_${rPinNum}`];
                  if (rState === 0) return 0;
                  break;
                }
              }
              return 1;
            }
          }

          const state = self.pinStates[key];
          if (self.pinModes[key] === 'INPUT_PULLUP') {
            return state !== undefined ? state : 1;
          }
          return state || 0;
        },
        analogWrite(pin, val) {
          const key = `pin_${pin}`;
          const v = Math.max(0, Math.min(255, Math.round(Number(val) || 0)));
          self.pinStates[key] = v;
          self._emitPinChange(key, v);
        },
        analogRead(pin) {
          const key = `pin_${pin}`;
          const pinNum = Number(pin);
          const canvas = window.CircuitCanvas;

          // Read the actual component connected to this analog pin.  This is
          // important for interactive inputs such as a potentiometer: the
          // sketch may call analogRead() before the next canvas animation
          // frame has copied the component value into pinStates.
          if (canvas && Number.isFinite(pinNum) && typeof canvas._readAnalogInput === 'function') {
            const board = typeof canvas.getBoardInstByIndex === 'function'
              ? canvas.getBoardInstByIndex(self.boardIndex)
              : (typeof canvas.getBoardInst === 'function' ? canvas.getBoardInst() : null);
            if (board) {
              let label = null;
              if (board.type === 'arduino_uno') {
                const unoMap = { 14: 'A0', 15: 'A1', 16: 'A2', 17: 'A3', 18: 'A4', 19: 'A5' };
                label = unoMap[pinNum] || null;
              } else if (board.type === 'arduino_nano') {
                const nanoMap = { 14: 'A0', 15: 'A1', 16: 'A2', 17: 'A3', 18: 'A4', 19: 'A5', 20: 'A6', 21: 'A7' };
                label = nanoMap[pinNum] || null;
              } else if (board.type === 'esp32_devkit_v1') {
                const espMap = { 36: 'A0', 39: 'A1', 34: 'A2', 35: 'A3', 32: 'A4', 33: 'A5' };
                label = espMap[pinNum] || null;
              }

              if (label) {
                const measured = Number(canvas._readAnalogInput(board.id, label));
                if (Number.isFinite(measured)) {
                  const adc = Math.max(0, Math.min(1023, Math.round(measured)));
                  if (self.pinStates[key] !== adc) {
                    self.pinStates[key] = adc;
                    self._emitPinChange(key, adc);
                  }
                  return adc;
                }
              }
            }
          }

          const v = self.pinStates[key];
          return v !== undefined && v !== null && !Number.isNaN(v) ? v : 0;
        },

        /* Timing */
        async delay(ms) {
          ms = Number(ms);
          if (!Number.isFinite(ms) || ms < 0) ms = 0;
          const realMs = ms / self.speed;
          self.simTime += ms;
          self._iterSinceDelay = 0;
          await self._delayPromise(realMs);
        },
        async delayMicroseconds(us) {
          us = Number(us);
          if (!Number.isFinite(us) || us < 0) us = 0;
          const ms = us / 1000;
          const realMs = ms / self.speed;
          self.simTime += ms;
          self._iterSinceDelay = 0;
          await self._delayPromise(realMs);
        },
        millis() { return self.simTime; },
        micros() { return self.simTime * 1000; },

        /* NTP — returns current UTC epoch seconds from the browser clock */
        ntpEpoch() { return Math.floor(Date.now() / 1000); },

        /* Math, bit operations, shift — provided by js/libraries/math.js plugin */

        /* Interactive sensor widgets (sliders on the canvas).
           Reads a value from a placed sensor component by instance id or type.
           Returns -999 if no matching component/field is found.
           Example: sensorValue('dht11', 'temperature') or sensorValue('pot1', 'value') */
        sensorValue(instIdOrType, field) {
          const canvas = window.CircuitCanvas;
          if (!canvas || !Array.isArray(canvas.components)) return -999;
          const comps = canvas.components;
          let inst = comps.find(c => c.id === instIdOrType);
          if (!inst) inst = comps.find(c => c.type === instIdOrType);
          if (!inst) return -999;
          const rs = inst.runtimeState || {};
          if (rs[field] !== undefined) return rs[field];
          const props = inst.props || {};
          return props[field] !== undefined ? props[field] : -999;
        },

        /* Tone */
        tone(pin, freq, duration) {
          const key = `pin_${pin}`;
          freq = Number(freq);
          if (!Number.isFinite(freq) || freq <= 0) freq = 440;
          self._startTone(key, freq);
          if (duration) setTimeout(() => self._stopTone(key), (Number(duration) || 0) / self.speed);
        },
        noTone(pin) { self._stopTone(`pin_${pin}`); },

        /* Pulse */
        async pulseIn(pin, val, timeout) {
          const key = `pin_${pin}`;
          const targetHigh = (val === 1 || val === HIGH);

          // Helper: advance simTime and yield (mirrors the context's delay())
          const advanceMs = async (ms) => {
            ms = Number(ms) || 0;
            const realMs = ms / self.speed;
            self.simTime += ms;
            self._iterSinceDelay = 0;
            await self._delayPromise(realMs);
          };

          // Try to find an HC-SR04 connected to this echo pin — compute directly
          const canvas = window.CircuitCanvas;
          if (canvas && canvas._getConnectedPinNum) {
            for (const inst of (canvas.components || [])) {
              if (inst.type === 'hcsr04') {
                const echoPinNum = canvas._getConnectedPinNum(inst.id, 'echo');
                if (echoPinNum === pin) {
                  const dist = Number(inst.runtimeState && inst.runtimeState.distance !== undefined ? inst.runtimeState.distance : (inst.props && inst.props.distance)) || 20;
                  const echoUs = Math.max(100, Math.round(dist * 58));
                  // Simulate: set echo HIGH, advance time, set echo LOW
                  self.pinStates[key] = targetHigh ? 1 : 0;
                  self._emitPinChange(key, targetHigh ? 1 : 0);
                  await advanceMs(echoUs / 1000);
                  self.pinStates[key] = targetHigh ? 0 : 1;
                  self._emitPinChange(key, targetHigh ? 0 : 1);
                  return echoUs;
                }
              }
            }
          }

          // Fallback: poll pinStates until pulse detected or timeout
          const timeoutMs = timeout != null ? (timeout / 1000) : 1000;
          const deadline = self.simTime + timeoutMs;
          const target = targetHigh ? 1 : 0;

          // Wait for pin to reach target state
          while ((self.pinStates[key] || 0) !== target) {
            if (self.simTime >= deadline) return 0;
            await advanceMs(0.1);
          }
          const startMs = self.simTime;

          // Wait for pin to leave target state
          while ((self.pinStates[key] || 0) === target) {
            if (self.simTime >= deadline) return Math.round((self.simTime - startMs) * 1000);
            await advanceMs(0.1);
          }

          return Math.round((self.simTime - startMs) * 1000);
        },

        /* Interrupts */
        attachInterrupt(num, fn, mode) { },
        detachInterrupt(num) { },

        /* Memory copy (general fallback) */
        memcpy(dest, src, len) {
          if (typeof dest === 'object' && typeof src === 'object') {
            if (Array.isArray(src)) {
              Object.assign(dest, src);
            } else {
              for (var k in src) { dest[k] = src[k]; }
            }
          }
          return dest;
        },

        /* ══════════ ESP32 — LEDC PWM ══════════ */
        ledcSetup(channel, freq, resolution) {
          const res = Number(resolution) || 8;
          self._ledcChannels[channel] = {
            freq: Number(freq) || 5000,
            resolution: res,
            maxDuty: Math.pow(2, res) - 1,
          };
          self._serialLog(`[ESP32] LEDC channel ${channel} → ${self._ledcChannels[channel].freq}Hz (${res}-bit)\n`, 'system');
          return self._ledcChannels[channel].maxDuty;
        },
        ledcSetupChannel(channel, freq, resolution) {
          return this.ledcSetup(channel, freq, resolution);
        },
        ledcAttachPin(pin, channel) {
          const cfg = self._ledcChannels[channel] || (self._ledcChannels[channel] = { freq: 5000, resolution: 8, maxDuty: 255 });
          cfg.pin = Number(pin);
          self._serialLog(`[ESP32] LEDC: attached GPIO ${cfg.pin} to channel ${channel}\n`, 'system');
          return 0;
        },
        ledcAttach(pin, freq, resolution) {
          // Modern (v3+) ESP32 core API: ledcAttach(pin, freq, resolution)
          const res = Number(resolution) || 8;
          self._ledcChannels[Number(pin)] = {
            pin: Number(pin),
            freq: Number(freq) || 5000,
            resolution: res,
            maxDuty: Math.pow(2, res) - 1,
          };
          self._serialLog(`[ESP32] LEDC: attached GPIO ${Number(pin)} → ${Number(freq) || 5000}Hz (${res}-bit)\n`, 'system');
          return true;
        },
        ledcWrite(channelOrPin, duty) {
          let pin;
          const cfg = self._ledcChannels[channelOrPin];
          if (cfg && cfg.pin !== undefined) {
            pin = cfg.pin;
          } else {
            // Also accept a bare GPIO pin (ledcWrite(pin, duty)) or a channel
            // that was attached by GPIO number (new API style).
            pin = Number(channelOrPin);
          }
          if (!Number.isFinite(pin)) return;
          const maxDuty = (cfg && cfg.maxDuty) || 255;
          const v = Math.max(0, Math.min(255, Math.round((Number(duty) || 0) / maxDuty * 255)));
          self.pinStates[`pin_${pin}`] = v;
          self._emitPinChange(`pin_${pin}`, v);
        },
        ledcRead(channelOrPin) {
          const cfg = self._ledcChannels[channelOrPin];
          const pin = cfg && cfg.pin !== undefined ? cfg.pin : Number(channelOrPin);
          if (!Number.isFinite(pin)) return 0;
          return self.pinStates[`pin_${pin}`] || 0;
        },

        /* ══════════ ESP32 — analog / DAC / sensors ══════════ */
        dacWrite(pin, value) {
          const key = `pin_${pin}`;
          const v = Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
          self.pinStates[key] = v;
          self._emitPinChange(key, v);
        },
        analogReadMilliVolts(pin) {
          const v = self.pinStates[`pin_${pin}`];
          if (v === undefined || v === null) return 0;
          // Simulation stores analog values in the 0–1023 range (10-bit)
          return Math.round((Number(v) || 0) * 3300 / 1023);
        },
        analogReadMicroVolts(pin) { return this.analogReadMilliVolts(pin) * 1000; },
        touchRead(pin) { return 0; },
        hallRead() { return 0; },
        temperatureRead() { return 25.0; },
        digitalPinToInterrupt(pin) { return Number(pin); },

      },

      /* Global constants */
      HIGH: 1, LOW: 0,
      INPUT: 'INPUT', OUTPUT: 'OUTPUT', INPUT_PULLUP: 'INPUT_PULLUP',
      RISING: 'RISING', FALLING: 'FALLING', CHANGE: 'CHANGE',
      A0: this.board === 'esp32_devkit_v1' ? 36 : 14,
      A1: this.board === 'esp32_devkit_v1' ? 39 : 15,
      A2: this.board === 'esp32_devkit_v1' ? 34 : 16,
      A3: this.board === 'esp32_devkit_v1' ? 35 : 17,
      A4: this.board === 'esp32_devkit_v1' ? 32 : 18,
      A5: this.board === 'esp32_devkit_v1' ? 33 : 19,
      // Nano-only analog pins (ADC6/ADC7, no digital I/O on real hardware)
      ...(this.board === 'arduino_nano' ? { A6: 20, A7: 21 } : {}),
      LED_BUILTIN: this.board === 'esp32_devkit_v1' ? 2 : 13,
      // Math constants (PI, TWO_PI, HALF_PI, DEG_TO_RAD, RAD_TO_DEG, etc.)
      // are provided by js/libraries/math.js plugin
      // ESP32 Wi-Fi constants
      WIFI_STA: 1, WIFI_AP: 2, WIFI_AP_STA: 3,
      WL_CONNECTED: 3, WL_DISCONNECTED: 6,
      HTTP_CODE_OK: 200, HTTP_CODE_NOT_FOUND: 404,
      portMAX_DELAY: 0xFFFFFFFF,
      // NULL is provided by js/libraries/math.js plugin
      // ESP32 I2S driver constants
      I2S_NUM_0: 0, I2S_NUM_1: 1,
      I2S_MODE_MASTER: 1, I2S_MODE_SLAVE: 2,
      I2S_MODE_TX: 4, I2S_MODE_RX: 8,
      I2S_BITS_PER_SAMPLE_8BIT: 1, I2S_BITS_PER_SAMPLE_16BIT: 2, I2S_BITS_PER_SAMPLE_24BIT: 3, I2S_BITS_PER_SAMPLE_32BIT: 4,
      I2S_CHANNEL_FMT_RIGHT_LEFT: 0, I2S_CHANNEL_FMT_ONLY_LEFT: 1, I2S_CHANNEL_FMT_ONLY_RIGHT: 2,
      I2S_COMM_FORMAT_I2S: 0, I2S_COMM_FORMAT_STAND_I2S: 1,
      ESP_INTR_FLAG_LEVEL1: 0,
      I2S_PIN_NO_CHANGE: -1,
      // ESP32 WebServer HTTP method constants
      HTTP_GET: 'GET', HTTP_POST: 'POST', HTTP_PUT: 'PUT', HTTP_DELETE: 'DELETE',
      HTTP_HEAD: 'HEAD', HTTP_OPTIONS: 'OPTIONS', HTTP_PATCH: 'PATCH', HTTP_ANY: 'ANY',
      // Adafruit_SSD1306 constants
      SSD1306_SWITCHCAPVCC: 0x01, SSD1306_EXTERNALVCC: 0x02,
      SSD1306_I2C_ADDRESS: 0x3C, SSD1306_WHITE: 1, SSD1306_BLACK: 0,
      SSD1306_SETCONTRAST: 0x81, SSD1306_SETVCOMDETECT: 0xDB,
      // Adafruit_ILI9341 common RGB565 color constants
      ILI9341_BLACK: 0x0000, ILI9341_WHITE: 0xFFFF, ILI9341_RED: 0xF800,
      ILI9341_GREEN: 0x07E0, ILI9341_BLUE: 0x001F, ILI9341_CYAN: 0x07FF,
      ILI9341_MAGENTA: 0xF81F, ILI9341_YELLOW: 0xFFE0, ILI9341_ORANGE: 0xFD20,
      ILI9341_DARKGREEN: 0x03E0, ILI9341_DARKGREY: 0x7BEF, ILI9341_NAVY: 0x000F,
      ILI9341_MAROON: 0x7800, ILI9341_PURPLE: 0x780F, ILI9341_OLIVE: 0x7BE0,
      ILI9341_LIGHTGREY: 0xC618, ILI9341_DARKCYAN: 0x03EF,

      /* Servo/LCD class stubs */
      Servo: function () { return {}; },

      /* VL53L0X ToF distance sensor stub — reads distance from placed component */
      Adafruit_VL53L0X: function () {
        return {
          begin() { return true; },
          rangingTest(measure, verbose) {
            const canvas = window.CircuitCanvas;
            const inst = canvas && canvas.components.find(c => c.type === 'vl53l0x');
            if (inst) {
              const dist = inst.runtimeState?.distance ?? inst.props?.distance ?? 100;
              measure.RangeMilliMeter = dist;
              measure.RangeStatus = dist > 0 ? 0 : 4;
            } else {
              measure.RangeMilliMeter = 0;
              measure.RangeStatus = 4;
            }
          },
        };
      },

      /* VL53L0X measurement data struct — used as VL53L0X_RangingMeasurementData_t measure; */
      VL53L0X_RangingMeasurementData_t: function () {
        this.RangeStatus = 4;
        this.RangeMilliMeter = 0;
      },

      /* Library stubs (instances) */
      Wire: { begin() { }, requestFrom() { return 0; }, beginTransmission() { }, endTransmission() { return 0; }, write() { return 1; }, read() { return 0; }, available() { return 0; } },
      SPI: { begin() { }, transfer() { return 0; }, end() { }, setClockDivider() { }, setBitOrder() { }, setDataMode() { } },
      /* ESP32 Wi-Fi object stub */
      WiFi: {
        begin(ssid, pass) {
          self._serialLog(`[ESP32 Wi-Fi] Connecting to "${ssid}"...\n`, 'system');
          setTimeout(() => {
            self._wifiConnected = true;
            self._serialLog('[ESP32 Wi-Fi] Connected! IP: 192.168.1.105\n', 'system');
          }, Math.max(50, 800 / self.speed));
        },
        localIP() { return '192.168.1.105'; },
        softAPIP() { return '192.168.4.1'; },
        status() { return self._wifiConnected ? 3 : 6; },
        disconnect() { self._wifiConnected = false; },
        mode() { },
        macAddress() {
          // Return a deterministic MAC based on board index
          const idx = self.boardIndex || 0;
          return 'AA:BB:CC:DD:EE:' + String(idx + 1).padStart(2, '0');
        },
        softAP(ssid) { self._serialLog(`[ESP32 Wi-Fi] SoftAP "${ssid}" started\n`, 'system'); },
        setAutoConnect() { },
        reconnect() { self._serialLog('[ESP32 Wi-Fi] Reconnected\n', 'system'); },
      },
      /* ESP32 Wi-Fi client + MQTT (PubSubClient).
         When the MQTT.js library is loaded (index.html), this also publishes
         to a real public broker over WebSockets (HiveMQ public broker by
         default), so you can watch the messages in MQTTX / any MQTT client.
         If no real broker can be reached, a local in-page broker is used as a
         fallback so the pub/sub demo still works offline. */
      WiFiClient: function () { return { connected() { return true; }, available() { return 0; }, readBytes() { return 0; } }; },

      PubSubClient: function () {
        const broker = (self._mqtt = self._mqtt || { subs: new Map(), connected: false });
        // Unique per-session suffix so a shared public broker doesn't clash
        // with other users running the same example.
        // Reuse existing session ID (set in run()) or generate new one
        const session = self.sessionId || Math.random().toString(36).slice(2, 18);
        self.sessionId = session;
        const ns = (topic) => `${topic}/${session}`;
        const bare = (topic) => (String(topic).endsWith(`/${session}`)
          ? String(topic).slice(0, -(session.length + 1))
          : String(topic));

        let connected = false;
        let cb = null;
        let real = null;       // real MQTT.js client
        let realReady = false; // real broker connected
        const pendingSubs = new Set();

        const deliver = (topic, payload) => {
          if (!cb) return;
          try {
            cb(topic, payload, String(payload).length);
          } catch (e) {
            self._serialLog(`[MQTT] callback error: ${e && e.message ? e.message : e}\n`, 'system');
          }
        };

        const tryRealConnect = (clientId) => {
          if (typeof window.mqtt !== 'function' || !window.WebSocket) {
            self._serialLog('[MQTT] MQTT.js not loaded — using local broker only\n', 'system');
            return;
          }
          const cfg = window.ArduSimMQTT || {};
          const url = cfg.url || 'wss://broker.hivemq.com:8884/mqtt';
          try {
            real = window.mqtt.connect(url, {
              clientId,
              clean: true,
              connectTimeout: cfg.timeout || 10000,
              reconnectPeriod: 3000, // keep retrying so the live broker comes up if it was briefly unreachable
              keepalive: 30,
            });
            self._mqttOpen.push(real);
            real.on('connect', () => {
              realReady = true;
              self._serialLog(`[MQTT] Live broker connected (${url}) as "${clientId}"\n`, 'system');
              self._serialLog(`[MQTT] Watch it in MQTTX → subscribe to: ${ns('ardusim/temp')} (and ${ns('ardusim/led')})\n`, 'system');
              for (const t of pendingSubs) real.subscribe(t);
              pendingSubs.clear();
            });
            real.on('message', (topic, payload) => {
              deliver(bare(topic), payload.toString());
            });
            real.on('error', (e) => {
              self._serialLog(`[MQTT] Live broker error: ${e && e.message ? e.message : e}\n`, 'system');
            });
            real.on('close', () => {
              if (realReady) self._serialLog('[MQTT] Live broker connection closed — retrying...\n', 'system');
              realReady = false;
            });
            // If the public broker can't be reached at all, say so once so the
            // user knows the demo is running in local-only mode.
            setTimeout(() => {
              if (!realReady) {
                self._serialLog('[MQTT] Public broker unreachable (check internet access) — running local broker only\n', 'system');
              }
            }, 12000);
          } catch (e) {
            self._serialLog(`[MQTT] Live broker unavailable — using local broker only (${e && e.message ? e.message : e})\n`, 'system');
          }
        };

        return {
          setServer(host, port) {
            self._serialLog(`[MQTT] Broker ${host}:${port}\n`, 'system');
          },
          setCallback(callback) { cb = callback; },
          connect(id) {
            const clientId = id || `ArduSim_${Math.random().toString(36).slice(2, 18)}`;
            connected = true;
            broker.connected = true;
            self._serialLog(`[MQTT] Connecting as "${clientId}"...\n`, 'system');
            tryRealConnect(clientId);
            return true;
          },
          disconnect() {
            connected = false;
            broker.connected = false;
            if (real) {
              try { real.end(true); } catch (e) { /* noop */ }
              real = null;
            }
            realReady = false;
            self._serialLog('[MQTT] Disconnected\n', 'system');
          },
          connected() { return connected; },
          subscribe(topic) {
            const t = String(topic);
            if (!broker.subs.has(t)) broker.subs.set(t, new Set());
            broker.subs.get(t).add(deliver);
            self._serialLog(`[MQTT] Subscribed "${t}"\n`, 'system');
            if (real) {
              if (realReady) real.subscribe(ns(t));
              else pendingSubs.add(ns(t));
            }
            return true;
          },
          unsubscribe(topic) {
            const t = String(topic);
            if (broker.subs.has(t)) broker.subs.get(t).delete(deliver);
            if (real && realReady) real.unsubscribe(ns(t));
            return true;
          },
          publish(topic, payload) {
            const t = String(topic);
            const msg = String(payload);
            self._serialLog(`[MQTT] Publish "${t}" → ${msg}\n`, 'system');
            if (real) {
              try {
                real.publish(ns(t), msg, { qos: 0, retain: false });
              } catch (e) { /* noop */ }
            }
            // Local delivery: while the live broker is connected the message also
            // returns through its own subscription, so only deliver locally when
            // there is no real broker to avoid double-delivering to the callback.
            if (!realReady) {
              const listeners = broker.subs.get(t);
              if (listeners) for (const l of [...listeners]) l(t, msg);
            }
            return true;
          },
          loop() { return true; },
        };
      },
    };

    // Inject plugin-provided runtime functions, constructors, and constants
    // Use active plugins set by transpile(); fallback to all if not set
    const plugins = this._activePlugins || this._getPlugins();
    for (const [libName, lib] of Object.entries(plugins)) {
      if (lib.runtime) {
        const rt = lib.runtime(self);
        if (rt && typeof rt === 'object') Object.assign(result._a, rt);
      }
      if (lib.constructor) {
        result[libName] = lib.constructor;
        if (lib.classes) {
          for (const cls of lib.classes) {
            if (cls !== libName) result[cls] = lib.constructor;
          }
        }
      }
      if (lib.constants) {
        Object.assign(result, lib.constants);
      }
    }

    return result;
  }

  /* ══════════════ COMPILE & RUN ══════════════ */
  async compile(code) {
    try {
      if (typeof code !== 'string') code = '';
      if (code.length > 100_000) {
        return { ok: false, error: 'Code exceeds maximum length (100 KB). Please shorten your sketch.' };
      }
      const js = this.transpile(code);
      const ctx = this.buildContext();
      const rawKeys = Object.keys(ctx);
      const rawVals = Object.values(ctx);
      const filtered = [];
      const reserved = new Set([
        'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else',
        'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new',
        'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield'
      ]);

      for (let i = 0; i < rawKeys.length; i += 1) {
        const key = rawKeys[i];
        if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) continue;
        if (reserved.has(key)) continue;
        filtered.push({ key, val: rawVals[i] });
      }

      const keys = filtered.map(entry => entry.key);
      const vals = filtered.map(entry => entry.val);

      // Wrap the sketch in a block so user `let`/`const` names may shadow the
      // injected context params (e.g. a sketch declaring its own HIGH/A0).
      // The `return` lives inside the same block, so setup/loop stay in scope.
      const body = `{\n${js}\n\nif(typeof setup === "undefined") throw new Error("Missing setup() function. Every Arduino sketch needs a setup() function."); if(typeof loop === "undefined") throw new Error("Missing loop() function. Every Arduino sketch needs a loop() function."); return { setup, loop };\n}`;

      // Try to build the function — will throw on syntax errors
      const fn = new Function(...keys, body);
      this._compiledFn = fn;
      this._compiledCtx = { keys, vals, fn };
      this._compiledJs = js;
      return { ok: true, compiledJs: js };
    } catch (err) {
      const friendly = this._friendlyError(err && err.message ? err.message : String(err), err);
      return { ok: false, error: friendly, rawError: err && err.message ? err.message : String(err) };
    }
  }

  async run(code) {
    if (this.isRunning) this.stop();
    if (typeof code !== 'string') code = '';
    this.simTime = 0;
    this.pinStates = {};
    this.pinModes = {};
    this._steppers = {};
    this._delays = [];
    this._wireTxAddr = null;
    this._wireRegPtr = 0x3B;
    this._wireRxQueue = [];
    this._neopixels = {};
    this._lcdLines = ['', ''];
    this._lcdCursor = { col: 0, row: 0 };
    this._mqtt = { subs: new Map(), connected: false };
    this._wifiConnected = false;
    this._startRealTime = Date.now();
    this._fpsFrames = 0;
    this._fpsLast = Date.now();
    this._fps = 0;
    this._loopCount = 0;
    this._iterSinceDelay = 0;
    // Reset ESP-NOW bus for this board
    if (window._espnowBus) {
      // Remove this board's entry so it can re-register
      for (var bid in window._espnowBus.boards) {
        if (window._espnowBus.boards[bid].simulator === this) {
          delete window._espnowBus.boards[bid];
        }
      }
    }
    // Generate session ID for remote control (every run)
    this.sessionId = Math.random().toString(36).slice(2, 18);

    // Compile first
    const result = await this.compile(code);
    if (!result.ok) {
      this._emitError(result.error);
      return false;
    }

    this.isRunning = true;
    this.isPaused = false;
    this._resumeAudio();
    const runId = ++this._runSeq;

    const { keys, vals, fn } = this._compiledCtx;

    this._serialLog('[ArduSim] Simulation started\n', 'system');
    if (this.onStart) this.onStart();

    // Start FPS ticker
    this._fpsInterval = setInterval(() => this._tickFps(), 500);

    let hadError = false;

    try {
      const { setup, loop } = fn(...vals);

      // Run setup once
      await setup();

      // Run loop repeatedly
      while (this.isRunning && runId === this._runSeq) {
        if (this.isPaused) {
          await new Promise(resolve => { this._resumeResolve = resolve; });
        }
        this._iterSinceDelay++;
        // Infinite-loop guard: yield if no delay has been called in many iterations
        if (this._iterSinceDelay > this._MAX_TIGHT_ITERS) {
          this._iterSinceDelay = 0;
          this.simTime += 1;
          await new Promise(r => setTimeout(r, 1));
        }
        await loop();
        this._loopCount++;
        // Yield to UI thread every iteration — advance simTime so millis() progresses
        this.simTime += 1;
        await new Promise(r => setTimeout(r, 0));
      }
    } catch (err) {
      if (err && err.message !== 'SIMULATION_STOPPED') {
        hadError = true;
        const friendly = this._friendlyError(err.message ? err.message : String(err), err instanceof Error ? err : undefined);
        this._emitError(friendly);
        this._serialLog(`[Error] ${friendly}\n`, 'error');
      }
    } finally {
      if (runId === this._runSeq) {
        if (this._fpsInterval) {
          clearInterval(this._fpsInterval);
          this._fpsInterval = null;
        }
        // Release any pending pause
        if (this._resumeResolve) {
          const r = this._resumeResolve;
          this._resumeResolve = null;
          r();
        }
      }
    }

    if (runId === this._runSeq) {
      this.isRunning = false;
      this._serialLog('[ArduSim] Simulation stopped\n', 'system');
      if (this.onStop) this.onStop();
    }
    return !hadError;
  }

  /* Start execution of already-compiled code (non-blocking, for dual-board parallel run) */
  _startExecution() {
    if (!this._compiledCtx) return;
    this.sessionId = Math.random().toString(36).slice(2, 18);
    this.isRunning = true;
    this.isPaused = false;
    this._resumeAudio();
    const runId = ++this._runSeq;
    const { keys, vals, fn } = this._compiledCtx;

    this._serialLog('[ArduSim] Simulation started\n', 'system');
    if (this.onStart) this.onStart();

    // Start FPS ticker
    this._fpsInterval = setInterval(() => this._tickFps(), 500);

    const self = this;
    (async () => {
      let hadError = false;
      try {
        const { setup, loop } = fn(...vals);
        await setup();
        while (self.isRunning && runId === self._runSeq) {
          if (self.isPaused) {
            await new Promise(resolve => { self._resumeResolve = resolve; });
          }
          self._iterSinceDelay++;
          if (self._iterSinceDelay > self._MAX_TIGHT_ITERS) {
            self._iterSinceDelay = 0;
            self.simTime += 1;
            await new Promise(r => setTimeout(r, 1));
          }
          await loop();
          self._loopCount++;
          self.simTime += 1;
          await new Promise(r => setTimeout(r, 0));
        }
      } catch (err) {
        if (err && err.message !== 'SIMULATION_STOPPED') {
          hadError = true;
          const friendly = self._friendlyError(err.message ? err.message : String(err), err instanceof Error ? err : undefined);
          self._emitError(friendly);
          self._serialLog(`[Error] ${friendly}\n`, 'error');
        }
      } finally {
        if (runId === self._runSeq) {
          if (self._fpsInterval) { clearInterval(self._fpsInterval); self._fpsInterval = null; }
          if (self._resumeResolve) { const r = self._resumeResolve; self._resumeResolve = null; r(); }
        }
      }
      if (runId === self._runSeq) {
        self.isRunning = false;
        self._serialLog('[ArduSim] Simulation stopped\n', 'system');
        if (self.onStop) self.onStop();
      }
    })();
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this._i2sNextAudioTime = 0;
    this._runSeq++;
    // Close any live MQTT connections
    for (const c of this._mqttOpen) {
      try { c.end(true); } catch (e) { /* noop */ }
    }
    this._mqttOpen = [];
    this._mqtt = { subs: new Map(), connected: false };
    // Cancel all pending delays
    for (const d of this._delays) {
      clearTimeout(d.id);
      if (d.reject) d.reject(new Error('SIMULATION_STOPPED'));
    }
    this._delays = [];
    if (this._resumeResolve) {
      const r = this._resumeResolve;
      this._resumeResolve = null;
      r();
    }
    this._stopAllTones();
  }

  /* ══════════════ MPU6050 (0x68) register read emulation ══════════════
     Serves Wire.requestFrom(0x68, n) starting at the register pointer set
     by a preceding Wire.write(reg). Values come from the placed mpu6050
     component's interactive sliders (runtimeState/props). */
  _mpuReadRegs(start, qty) {
    const canvas = window.CircuitCanvas;
    let ax = 0, ay = 0, az = 0, gx = 0, gy = 0, gz = 0;
    const inst = (canvas && Array.isArray(canvas.components))
      ? canvas.components.find(c => c.type === 'mpu6050') : null;
    if (inst) {
      const rs = inst.runtimeState || {};
      const pr = inst.props || {};
      const rd = (f) => Math.round(Number(rs[f] !== undefined ? rs[f] : pr[f]) || 0);
      ax = rd('accelX'); ay = rd('accelY'); az = rd('accelZ');
      gx = rd('gyroX'); gy = rd('gyroY'); gz = rd('gyroZ');
    }
    const tempRaw = -3920; /* ≈ 25 °C — raw/340 + 36.53 */
    const regs = {};
    const put16 = (a, v) => {
      v = Math.max(-32768, Math.min(32767, v | 0));
      if (v < 0) v += 65536;
      regs[a] = (v >> 8) & 0xFF;
      regs[a + 1] = v & 0xFF;
    };
    put16(0x3B, ax); put16(0x3D, ay); put16(0x3F, az);   /* ACCEL_XOUT..ZOUT */
    put16(0x41, tempRaw);                                 /* TEMP_OUT */
    put16(0x43, gx); put16(0x45, gy); put16(0x47, gz);   /* GYRO_XOUT..ZOUT */
    regs[0x75] = 0x68;                                    /* WHO_AM_I */
    const out = [];
    for (let i = 0; i < qty; i++) out.push(regs[(start + i) & 0xFF] || 0);
    return out;
  }

  /* ══════════════ DS3231 RTC (0x68) register read emulation ══════════════
     Serves Wire.requestFrom(0x68, n) starting at the register pointer set
     by a preceding Wire.write(reg). Values come from the placed ds3231
     component's runtime state (time, date, temperature). */
  _ds3231ReadRegs(start, qty) {
    const canvas = window.CircuitCanvas;
    const inst = (canvas && Array.isArray(canvas.components))
      ? canvas.components.find(c => c.type === 'ds3231') : null;
    let hour = 12, minute = 0, second = 0;
    let day = 1, month = 1, year = 26;
    let temp = 25.0;
    if (inst) {
      const rs = inst.runtimeState || {};
      const pr = inst.props || {};
      hour = rs.hour ?? pr.hour ?? 12;
      minute = rs.minute ?? pr.minute ?? 0;
      second = rs.second ?? pr.second ?? 0;
      day = rs.day ?? pr.day ?? 1;
      month = rs.month ?? pr.month ?? 1;
      year = rs.year ?? pr.year ?? 26;
      temp = rs.temperature ?? pr.temperature ?? 25.0;
    }
    const toBCD = (v) => ((Math.floor(v / 10) & 0x0F) << 4) | (Math.floor(v) % 10);
    const tempInt = Math.floor(temp);
    const tempFrac = Math.round((temp - tempInt) * 4); /* 0.25°C steps → 0..3 */
    const regs = {};
    /* Time & date registers (DS3231 datasheet Table 3) */
    regs[0x00] = toBCD(second) & 0x7F;  /* 0x00 = seconds (bit 7 = CH, 0 = running) */
    regs[0x01] = toBCD(minute);          /* 0x01 = minutes */
    regs[0x02] = toBCD(hour);            /* 0x02 = hours (24h mode) */
    regs[0x03] = 1;                      /* 0x03 = day of week (1-7) */
    regs[0x04] = toBCD(day);             /* 0x04 = date */
    regs[0x05] = toBCD(month);           /* 0x05 = month + century bit */
    regs[0x06] = toBCD(year);            /* 0x06 = year (00-99) */
    /* Alarm 1 registers (0x07-0x0A) — default 0 */
    regs[0x07] = 0; regs[0x08] = 0; regs[0x09] = 0; regs[0x0A] = 0;
    /* Alarm 2 registers (0x0B-0x0D) — default 0 */
    regs[0x0B] = 0; regs[0x0C] = 0; regs[0x0D] = 0;
    /* Control register 0x0E: INTCN=1 (no square wave), default */
    regs[0x0E] = 0x04;
    /* Status register 0x0F */
    regs[0x0F] = 0x00;
    /* Temperature registers 0x11-0x12 (signed 8.2 fixed point) */
    regs[0x11] = tempInt & 0xFF;
    regs[0x12] = (tempFrac & 0x03) << 6;
    const out = [];
    for (let i = 0; i < qty; i++) out.push(regs[(start + i) & 0xFF] || 0);
    return out;
  }

  /* Pausable sketch delay — records start/duration so pause() can freeze it */
  _delayPromise(realMs) {
    const entry = {
      duration: Math.max(0, realMs),
      start: Date.now(),
      id: null,
      frozen: false,
      resolve: null,
      reject: null,
    };
    const startTimer = () => {
      entry.id = setTimeout(() => {
        const idx = this._delays.indexOf(entry);
        if (idx !== -1) this._delays.splice(idx, 1);
        if (entry.resolve) entry.resolve();
      }, Math.max(0, entry.duration));
    };
    return new Promise((resolve, reject) => {
      entry.resolve = resolve;
      entry.reject = reject;
      startTimer();
      this._delays.push(entry);
    });
  }

  pause() {
    this.isPaused = true;
    // Freeze any in-flight sketch delay so pause takes effect immediately
    const now = Date.now();
    for (const d of this._delays) {
      if (d.frozen) continue;
      const remaining = Math.max(0, d.duration - (now - d.start));
      clearTimeout(d.id);
      d.frozen = true;
      d.duration = remaining;
    }
  }

  resume() {
    this.isPaused = false;
    // Restart any frozen delays with their remaining time
    const now = Date.now();
    for (const d of this._delays) {
      if (!d.frozen) continue;
      d.frozen = false;
      d.start = now;
      d.id = setTimeout(() => {
        const idx = this._delays.indexOf(d);
        if (idx !== -1) this._delays.splice(idx, 1);
        if (d.resolve) d.resolve();
      }, Math.max(0, d.duration));
    }
    if (this._resumeResolve) {
      const r = this._resumeResolve;
      this._resumeResolve = null;
      r();
    }
  }

  setSpeed(s) {
    const v = parseFloat(s);
    this.speed = Number.isFinite(v) ? Math.min(100, Math.max(0.01, v)) : 1;
  }

  setBoard(board) {
    this.board = ['arduino_uno', 'esp32_devkit_v1', 'arduino_nano'].includes(board) ? board : 'arduino_uno';
  }

  /* ── FPS tracking ── */
  _tickFps() {
    const now = Date.now();
    const elapsed = now - this._fpsLast;
    if (elapsed > 0) {
      this._fps = Math.round((this._loopCount * 1000) / elapsed);
    }
    this._loopCount = 0;
    this._fpsLast = now;
    if (this.onTick) this.onTick(this.simTime, this._fps);
  }

  /* ── Friendly error messages ── */
  _friendlyError(msg, err) {
    if (!msg) msg = 'An unknown error occurred';
    let line = '';
    // Runtime errors carry the compiled-code line in their stack as the first
    // "<anonymous>:N" frame. Syntax errors from `new Function` do not, and the
    // first such frame would instead be the transpiler itself — so skip them.
    if (err && err.stack && !(err instanceof SyntaxError)) {
      const m = String(err.stack).match(/<anonymous>:(\d+)(?::\d+)?/);
      if (m) {
        const n = parseInt(m[1], 10) - 1; // account for the wrapper block offset
        line = ` — line ${n > 0 ? n : 1}`;
      }
    }
    if (err instanceof SyntaxError) return `Syntax error: ${msg}. Check for missing semicolons or braces.`;
    if (err instanceof ReferenceError) {
      const name = msg.match(/([A-Za-z_$][\w$]*)\s+is not defined/);
      return `'${name ? name[1] : 'value'}' is not defined${line}. Did you forget to declare a variable or include a library?`;
    }
    if (err instanceof TypeError) return `Type error${line}: ${msg}. Check for null values or wrong argument types.`;
    if (err instanceof RangeError) return `Range error${line}: ${msg}. Check for values out of allowed range.`;
    if (msg.includes('Missing setup()')) return 'Missing setup() function. Every Arduino sketch needs a setup() function.';
    if (msg.includes('Missing loop()')) return 'Missing loop() function. Every Arduino sketch needs a loop() function.';
    if (msg.includes('Maximum call stack')) return 'Stack overflow: infinite recursion detected. Check your function calls.';
    if (msg.includes('is not defined')) {
      const m = msg.match(/'([^']+)' is not defined/);
      if (m) return `'${m[1]}' is not defined${line}. Did you forget to declare a variable or include a library?`;
    }
    return msg + line;
  }

  sendSerialInput(text) {
    if (typeof text !== 'string') return;
    for (const ch of text) {
      this.serialInputBuffer.push(ch);
    }
    // Never let the input buffer grow without bound
    if (this.serialInputBuffer.length > 4096) {
      this.serialInputBuffer.splice(0, this.serialInputBuffer.length - 4096);
    }
  }

  setPinState(pinKey, value) {
    if (typeof pinKey !== 'string') return;
    this.pinStates[pinKey] = value;
    this._emitPinChange(pinKey, value);
  }

  setPinVoltage(inst, pinId, voltage) {
    if (!inst || !pinId) return;
    this.pinStates[`${inst.id}_${pinId}`] = voltage;
  }

  /* ══════════════ TONE ══════════════ */
  _initAudio() {
    if (!this._toneCtx) {
      try {
        this._toneCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { }
    }
  }

  _resumeAudio() {
    this._initAudio();
    if (this._toneCtx && this._toneCtx.state === 'suspended') {
      this._toneCtx.resume().catch(() => { });
    }
  }

  _playI2SAudio(buf, len) {
    this._resumeAudio();
    const ctx = this._toneCtx;
    if (!ctx || !buf || len < 4 || ctx.state !== 'running') return;

    try {
      let byteView;
      if (buf instanceof ArrayBuffer) {
        byteView = new Uint8Array(buf, 0, Math.min(len, buf.byteLength));
      } else if (ArrayBuffer.isView(buf)) {
        byteView = new Uint8Array(buf.buffer, buf.byteOffset, Math.min(len, buf.byteLength));
      } else if (Array.isArray(buf)) {
        byteView = Uint8Array.from(buf.slice(0, len));
      } else {
        return;
      }
      const sampleCount = Math.floor(byteView.byteLength / 4);
      const audioBuffer = ctx.createBuffer(2, sampleCount, 44100);
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      const view = new DataView(byteView.buffer, byteView.byteOffset, byteView.byteLength);
      for (let i = 0; i < sampleCount; i++) {
        left[i] = view.getInt16(i * 4, true) / 32768;
        right[i] = view.getInt16(i * 4 + 2, true) / 32768;
      }

      const now = ctx.currentTime;
      if (!this._i2sNextAudioTime || this._i2sNextAudioTime < now) {
        this._i2sNextAudioTime = now + 0.02;
      }
      if (this._i2sNextAudioTime - now > 0.5) return;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      if (!this._i2sOutputGain) {
        this._i2sOutputGain = ctx.createGain();
        this._i2sOutputGain.gain.value = 0.55;
        this._i2sOutputFilter = ctx.createBiquadFilter();
        this._i2sOutputFilter.type = 'lowpass';
        this._i2sOutputFilter.frequency.value = 12000;
        this._i2sOutputGain.connect(this._i2sOutputFilter);
        this._i2sOutputFilter.connect(ctx.destination);
      }
      source.connect(this._i2sOutputGain);
      source.start(this._i2sNextAudioTime);
      this._i2sNextAudioTime += audioBuffer.duration;
    } catch (e) { }
  }

  _startTone(key, freq) {
    this._initAudio();
    if (!this._toneCtx) return;
    this._stopTone(key);
    try {
      const osc = this._toneCtx.createOscillator();
      const gain = this._toneCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.value = 0.1;
      osc.connect(gain);
      gain.connect(this._toneCtx.destination);
      osc.start();
      this._toneOscillators[key] = { osc, gain };
      this._emitEvent('buzzer_on', { key, freq });
    } catch (e) {
      console.error('[ArduSim] Audio error:', e);
    }
  }

  _stopTone(key) {
    if (this._toneOscillators[key]) {
      try { this._toneOscillators[key].osc.stop(); } catch (e) { }
      delete this._toneOscillators[key];
    }
    this._emitEvent('buzzer_off', { key });
  }

  _stopAllTones() {
    for (const key of Object.keys(this._toneOscillators)) {
      try { this._toneOscillators[key].osc.stop(); } catch (e) { }
      delete this._toneOscillators[key];
    }
    this._toneOscillators = {};
  }

  /* ══════════════ INTERNALS ══════════════ */
  _serialLog(text, type = 'data') {
    if (this.onSerial) this.onSerial(text, type);
  }

  _emitPinChange(key, val) {
    // Reset tight-iter counter whenever a pin changes (means the sketch is doing work)
    this._iterSinceDelay = 0;
    if (this.onPinChange) this.onPinChange(key, val);
  }

  _emitError(msg) {
    if (this.onError) this.onError(msg);
  }

  _emitEvent(type, data) {
    if (this.onEvent) this.onEvent(type, data);
  }

  /* Get human-readable pin name */
  static pinLabel(key) {
    if (!key.startsWith('pin_')) return key;
    const n = parseInt(key.replace('pin_', ''));
    if (n === 14) return 'A0';
    if (n === 15) return 'A1';
    if (n === 16) return 'A2';
    if (n === 17) return 'A3';
    if (n === 18) return 'A4';
    if (n === 19) return 'A5';
    return `D${n}`;
  }

  getPinVoltage(inst, pinId) {
    if (!window.CircuitCanvas) return 0;

    // 1. Try Arduino/ESP32 board pin lookup
    if (typeof window.CircuitCanvas._getConnectedPinNum === 'function') {
      const pinNum = window.CircuitCanvas._getConnectedPinNum(inst.id, pinId);
      if (pinNum !== null) return this.pinStates[`pin_${pinNum}`] || 0;
    }

    // 2. Try direct pinStates lookup
    const directVal = this.pinStates[`${inst.id}_${pinId}`];
    if (directVal !== undefined) return directVal;

    // 3. Follow wire to the connected component and read its output voltage
    if (typeof window.CircuitCanvas._getWireTarget === 'function') {
      const target = window.CircuitCanvas._getWireTarget(inst.id, pinId);
      if (target) {
        const other = target.inst;
        // Function Generator output
        if (other.type === 'func_gen') {
          const rs = other.runtimeState || {};
          if (target.pinId === 'ch1_out') return rs.ch1_voltage || 0;
          if (target.pinId === 'ch2_out') return rs.ch2_voltage || 0;
        }
        // IC output pins
        const IC_OUT = {
          ic_555: ['OUT'],
          ic_74hc00: ['Y1', 'Y2', 'Y3', 'Y4'],
          ic_74hc04: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'],
          ic_74hc08: ['Y1', 'Y2', 'Y3', 'Y4'],
          ic_74hc32: ['Y1', 'Y2', 'Y3', 'Y4'],
          ic_74hc595: ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'QHn'],
          ic_74hc138: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'],
          ic_74hc245: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'],
          ic_74hc74: ['Q1', 'Q1n', 'Q2', 'Q2n'],
          ic_74hc165: ['Q7', 'Q7n'],
          ic_74hc193: ['QA', 'QB', 'CO', 'BO', 'TC_U', 'TC_D'],
          ic_74hc47: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
          ic_74hc148: ['A0', 'A1', 'A2', 'GS', 'EO'],
          lm741: ['OUT'],
        };
        if (IC_OUT[other.type] && IC_OUT[other.type].includes(target.pinId)) {
          if (other.type === 'lm741') {
            return other.runtimeState ? (other.runtimeState.vOut || 0) : 0;
          }
          const raw = other.runtimeState && other.runtimeState[target.pinId] != null
            ? other.runtimeState[target.pinId] : 0;
          return raw > 1 ? (raw / 255) * 5.0 : raw > 0 ? 5.0 : 0;
        }
        // Potentiometer wiper
        if (other.type === 'potentiometer' && target.pinId === 'wiper') {
          return (other.runtimeState && other.runtimeState.wiper != null) ? (other.runtimeState.wiper / 1023) * 5.0 : 0;
        }
        // Op-amp output
        if (other.type === 'lm741' && target.pinId === 'OUT') {
          return other.runtimeState ? (other.runtimeState.vOut || 0) : 0;
        }
        // Probe pass-through — return voltage sampled at probe tip
        if (other.type === 'probe' || other.type.startsWith('osc_probe_') || other.type.startsWith('dso_probe_')) {
          return other.runtimeState ? (other.runtimeState.voltage || 0) : 0;
        }
        // Another DSO reading from a source — recurse
        if (other.type === 'dso_4ch') {
          return 0;
        }
      }
    }

    return 0;
  }


}

/* ═══════════════ EXAMPLE SKETCHES ═══════════════ */
/* ═══════════════════════════════════════════════════════════
   EXAMPLE CIRCUITS — serialized project data loaded on the canvas
   when an example is opened. Matches the pins of each example code.
   ═══════════════════════════════════════════════════════════ */
/* Examples are now loaded from the examples/ folder as individual JSON files. */

/* Export */
window.ArduinoSimulator = ArduinoSimulator;
window.ArduinoSim = new ArduinoSimulator();
window.EXAMPLE_SKETCHES = [];
window.loadExamplesFromFiles = async function () {
  // The Node server discovers every JSON file, including user-added examples.
  try {
    const apiRes = await fetch('/api/examples?ts=' + Date.now());
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (Array.isArray(data.examples)) {
        window.EXAMPLE_SKETCHES = data.examples;
        console.log('[ArduSim] Loaded ' + data.examples.length + ' examples from server');
        return;
      }
    }
  } catch (e) { /* static hosting uses the bundled fallback list */ }

  const files = [
    '7408_test_with_logic_analyzer', 'and_gate', 'astable_555', 'blink', 'bluetooth_serial_bridge', 'bme280_weather',
    'bmp280_altitude', 'button', 'buzzer_melody', 'coap_client', 'coap_dip_switch_to_8_led', 'coap_simple_server',
    'continuous_rotation_servo_control_by_pot', 'counter', 'custom_plugin_demo', 'dc_motor_speed', 'dip_switch_and_led_array', 'dip_switch_binary',
    'dmm_current', 'dmm_resistance', 'dmm_voltage', 'ds3231_rtc_clock', 'ds3231_rtc_clock_sync_with_ntp', 'dso_oscilloscope',
    'esp32_blink', 'esp32_fade', 'esp32_hub75_matrixpaneli2s_dma', 'esp32_i2s_local_radio_player', 'esp32_i2s_local_radio_player_2', 'esp32_i2s_local_test',
    'esp32_i2s_music_player', 'esp32_i2s_online_radio_player', 'esp32_ntp_clock_lcd', 'esp32_server', 'esp_now_dip_switch_to_8_led', 'esp_now_sender_with_receiver',
    'espnow_led_control', 'espnow_receiver', 'espnow_sender', 'fade', 'flex_sensor_bending_measurement', 'func_gen_dual',
    'func_gen_led', 'gps_neo_6m_8m_tracker', 'hc05_bluetooth_led', 'ic_nand_test', 'ili9341', 'inverting_amplifier',
    'ir_obstacle_led', 'joystick_led', 'keypad_interfacing', 'l298n_dc_motor', 'lcd', 'lcd_hello_world',
    'lcd_i2c', 'lcd_i2c_display_20x4', 'lcd_print_remotely', 'ldr_lamp', 'led_array_blink_pattern', 'lm35_temperature',
    'lm35_temperature_sensor', 'logic_analyzer_test', 'max7219', 'morse', 'morse_code_using_serial_data', 'mpu6050_accel',
    'mpu6050_accelerometer_2', 'mqtt_esp32', 'multi_colour_led_blink', 'nano_blink', 'neopixel_8x8_matrix_rainbow_2', 'neopixel_8x8_matrix_rainbow_3',
    'neopixel_8x8_matrix_rainbow_4', 'neopixel_color_cycle', 'neopixel_strip_chase', 'neopixel_strip_color_pattern', 'not_gate_test', 'oled_ssd1306',
    'opamp_741_non_inverting', 'or_gate', 'pir_alarm', 'plugin_tutorial', 'potentiometer', 'print_binary_data',
    'rainbow_rgb', 'read_rfid_card_raw_data', 'relay_control', 'remote_control_leds', 'remote_servo_control', 'rfid_inventory_tracker',
    'rotary_encoder_counter', 'rotary_encoder_servo', 'seg7_counter', 'serial_plotter', 'serial_plotter_sine_and_triangle', 'servo_continuous_spin',
    'servo_sweep', 'shift_resister_circuit', 'simplebme280_altimeter_on_lcd', 'simplebme280_altitude', 'simplebme280_basic', 'stepper_motor',
    'temperature', 'traffic_light', 'two_lcd', 'ultrasonic', 'ultrasonic_distance_pulsein', 'vl53l0x_proximity_sensor',
    'voltage_divider', 'weather_station_multi', 'weather_station_simple', 'weather_station_tft', 'zigbee_led_control',
    'zigbee_sender_receiver', 'zigbee_sensor_network'
  ];

  const sketches = [];
  const cacheBust = '?v=' + Date.now();
  for (const name of files) {
    try {
      const res = await fetch('Examples/' + name + '.json' + cacheBust);
      if (res.ok) {
        sketches.push(await res.json());
      } else {
        console.warn('[ArduSim] Example HTTP ' + res.status + ': ' + name);
      }
    } catch (e) { console.warn('[ArduSim] Failed to load example: ' + name, e); }
  }
  console.log('[ArduSim] Loaded ' + sketches.length + '/' + files.length + ' examples');
  window.EXAMPLE_SKETCHES = sketches;
};
