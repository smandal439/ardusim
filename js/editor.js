/* ═══════════════════════════════════════════════════════
   editor.js — Monaco Editor Integration (with Hash Sharing)
   ═══════════════════════════════════════════════════════ 
*/

'use strict';

const EditorManager = {
  editor: null,
  monacoReady: false,
  _autoCompileTimer: null,
  _lastCompileCode: '',

  DEFAULT_CODE: `/*
 * ArduSim — Arduino Online Simulator
 * Write your Arduino sketch below.
 * Click "Run" to start the simulation.
 *
 * Add components to the canvas on the right,
 * then connect their pins with wires.
 */

// Built-in LED pin
int ledPin = 13;

void setup() {
  // Run once at startup
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("ArduSim Ready!");
}

void loop() {
  // Runs repeatedly
  digitalWrite(ledPin, HIGH);
  Serial.println("LED ON");
  delay(1000);

  digitalWrite(ledPin, LOW);
  Serial.println("LED OFF");
  delay(1000);
}`,

  init() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (isMobile) {
      this._initMobileEditor();
      return;
    }

    if (typeof require !== 'function' || typeof require.config !== 'function') {
      console.error('Monaco loader not available');
      this._initFallback();
      return;
    }

    require(['vs/editor/editor.main'], () => {
      this._registerArduinoLanguage();
      this._createEditor();
      this.monacoReady = true;

      const hashLoaded = this.loadFromUrlHash();
      this.loadSavedTheme();
      this._listenSystemThemeChanges();

      if (window.App) window.App.onEditorReady(hashLoaded);
    }, (err) => {
      console.error('Monaco failed to load, falling back to plain text editor:', err);
      this._initFallback();
    });
  },

  _registerArduinoLanguage() {
    monaco.languages.register({ id: 'arduino' });

    monaco.languages.setMonarchTokensProvider('arduino', {
      keywords: [
        'void', 'int', 'long', 'float', 'double', 'byte', 'boolean', 'bool',
        'char', 'String', 'unsigned', 'const', 'return', 'if', 'else',
        'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
        'struct', 'class', 'new', 'delete', 'true', 'false',
        'uint8_t', 'uint16_t', 'uint32_t', 'int8_t', 'int16_t', 'int32_t',
        'volatile', 'static', 'extern', 'inline',
      ],
      arduino_constants: [
        'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN',
        'A0', 'A1', 'A2', 'A3', 'A4', 'A5',
        'D2', 'D4', 'D12', 'D13', 'D14', 'D15', 'D18', 'D19', 'D21', 'D22', 'D23', 'D25', 'D26', 'D27', 'D32', 'D33',
        'PI', 'TWO_PI', 'HALF_PI', 'DEG_TO_RAD', 'RAD_TO_DEG',
        'RISING', 'FALLING', 'CHANGE',
        'HEX', 'DEC', 'OCT', 'BIN',
      ],
      arduino_functions: [
        'setup', 'loop',
        'pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead',
        'delay', 'delayMicroseconds', 'millis', 'micros',
        'tone', 'noTone', 'pulseIn',
        'attachInterrupt', 'detachInterrupt',
        'map', 'constrain', 'random', 'randomSeed',
        'abs', 'min', 'max', 'sqrt', 'pow', 'sin', 'cos', 'tan',
        'ledcSetup', 'ledcAttachPin', 'ledcWrite', 'hallRead', 'touchRead', 'analogReadMilliVolts',
        'Serial', 'Servo', 'LiquidCrystal', 'Wire',
      ],
      arduino_library_classes: (() => {
        const cls = ['DHT', 'SimpleBME280', 'Adafruit_VL53L0X', 'Adafruit_SSD1306', 'Adafruit_ILI9341', 'Adafruit_GFX'];
        if (window.ArduinoLibs) {
          for (const lib of Object.values(window.ArduinoLibs)) {
            if (lib.classes) cls.push(...lib.classes);
          }
        }
        return cls;
      })(),
      tokenizer: {
        root: [
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@block_comment'],
          [/#[^\n]*/, 'preprocessor'],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/'([^'\\]|\\.)*'/, 'string'],
          [/\b\d+\.?\d*[fF]?\b/, 'number'],
          [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
          [/\b0b[01]+\b/, 'number.binary'],
          [/\b(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|LED_BUILTIN|A[0-5]|D\d+|HEX|DEC|OCT|BIN|RISING|FALLING|CHANGE|PI|TWO_PI|HALF_PI)\b/, 'constant'],
          [/\b(void|int|long|float|double|byte|boolean|bool|char|String|unsigned|const|return|if|else|for|while|do|switch|case|break|continue|true|false|static|volatile|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\b/, 'keyword'],
          [/\b(setup|loop|pinMode|digitalWrite|digitalRead|analogWrite|analogRead|delay|delayMicroseconds|millis|micros|tone|noTone|pulseIn|map|constrain|random|randomSeed|ledcSetup|ledcAttachPin|ledcWrite|hallRead|touchRead|analogReadMilliVolts|Serial|Servo|LiquidCrystal|Wire)\b/, 'arduino-api'],
          [/\b(DHT|SimpleBME280|Adafruit_VL53L0X|Adafruit_SSD1306|Adafruit_ILI9341|Adafruit_GFX|NeoPixel|FastLED|MFRC522|NewPing|Stepper|TinyGPS|ArduinoJson|WiFiClient|PubSubClient|WebServer|SoftwareSerial)\b/, 'arduino-api'],
          [/[a-zA-Z_]\w*/, 'identifier'],
        ],
        block_comment: [
          [/[^/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment'],
        ],
      }
    });

    monaco.languages.setLanguageConfiguration('arduino', {
      comments: { lineComment: '//', blockComment: ['/*', '*/'] },
      brackets: [['(', ')'], ['{', '}'], ['[', ']']],
      autoClosingPairs: [
        { open: '(', close: ')' }, { open: '{', close: '}' },
        { open: '[', close: ']' }, { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
      indentationRules: {
        increaseIndentPattern: /.*\{[^}"']*$/,
        decreaseIndentPattern: /^\s*\}/,
      },
    });

    // Register completions (dynamic — includes library functions + instance methods)
    monaco.languages.registerCompletionItemProvider('arduino', {
      provideCompletionItems(model, position) {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // ── Instance method completion (user typed "varName.") ──
        const dotMatch = textUntilPosition.match(/(\w+)\.\s*$/);
        if (dotMatch) {
          const varName = dotMatch[1];
          const fullCode = model.getValue();
          const varType = EditorManager._detectVarType(fullCode, varName);
          if (varType) {
            const methods = EditorManager._getInstanceMethods(varType);
            if (methods && methods.length) {
              return {
                suggestions: methods.map(m => ({
                  label: m.name,
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertTextRules: m.snippet ? 4 : undefined,
                  insertText: m.snippet || m.name + '($1)',
                  documentation: m.doc || '',
                  range,
                }))
              };
            }
          }
          // If we can't resolve the type, still allow typing
          return { suggestions: [] };
        }

        const snippets = [
          {
            label: 'setup', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'void setup() {\n\t${1:// Put your setup code here:}\n\n}', documentation: 'Setup function — runs once at start'
          },
          {
            label: 'loop', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'void loop() {\n\t${1:// Put your main code here:}\n\n}', documentation: 'Loop function — runs repeatedly'
          },
          {
            label: 'for', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:10}; ${1:i}++) {\n\t${3}\n}'
          },
          {
            label: 'if', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'if (${1:condition}) {\n\t${2}\n}'
          },
          { label: 'Serial.begin', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'Serial.begin(${1:9600});' },
          { label: 'Serial.println', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'Serial.println(${1:value});' },
          { label: 'Serial.print', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'Serial.print(${1:value});' },
          { label: 'pinMode', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'pinMode(${1:pin}, ${2:OUTPUT});' },
          { label: 'digitalWrite', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'digitalWrite(${1:pin}, ${2:HIGH});' },
          { label: 'digitalRead', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'digitalRead(${1:pin})' },
          { label: 'analogWrite', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'analogWrite(${1:pin}, ${2:value});' },
          { label: 'analogRead', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'analogRead(${1:pin})' },
          { label: 'delay', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'delay(${1:1000});' },
          { label: 'millis', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'millis()' },
          { label: 'micros', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'micros()' },
          { label: 'map', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'map(${1:value}, ${2:0}, ${3:1023}, ${4:0}, ${5:255})' },
          { label: 'constrain', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'constrain(${1:value}, ${2:low}, ${3:high})' },
          { label: 'random', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'random(${1:max})' },
          { label: 'ledcSetup', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'ledcSetup(${1:channel}, ${2:freq}, ${3:resolution});' },
          { label: 'ledcAttachPin', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'ledcAttachPin(${1:pin}, ${2:channel});' },
          { label: 'ledcWrite', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'ledcWrite(${1:channel}, ${2:duty});' },
          { label: 'esp_now_init', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'esp_now_init();' },
          { label: 'esp_now_add_peer', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'memcpy(${1:peerInfo}.peer_addr, ${2:macAddress}, 6);\n${1:peerInfo}.channel = 0;\n${1:peerInfo}.encrypt = false;\nesp_now_add_peer(&${1:peerInfo});' },
          { label: 'esp_now_send', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'esp_now_send(${1:macAddress}, (uint8_t *)&${2:data}, sizeof(${2:data}));' },
          { label: 'WiFi.mode', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'WiFi.mode(WIFI_STA);' },
          { label: 'WiFi.macAddress', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'WiFi.macAddress()' },
        ];

        // Dynamically add library classes and include hints
        if (window.ArduinoLibs) {
          for (const [libName, lib] of Object.entries(window.ArduinoLibs)) {
            if (lib.classes) {
              for (const cls of lib.classes) {
                snippets.push({
                  label: cls,
                  kind: monaco.languages.CompletionItemKind.Class,
                  insertTextRules: 4,
                  insertText: cls + ' ${1:varName}' + (lib.constructor ? '($2);' : ';'),
                  documentation: 'Construct a ' + cls + ' instance (' + libName + ' library)'
                });
              }
            }
            if (lib.includes) {
              for (const inc of lib.includes) {
                snippets.push({
                  label: '#include ' + inc,
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: '#include ' + inc,
                  documentation: 'Include ' + libName + ' library header'
                });
              }
            }
          }
        }

        return { suggestions: snippets.map(s => ({ ...s, range })) };
      }
    });

    // Register hover documentation for Arduino APIs and libraries
    monaco.languages.registerHoverProvider('arduino', {
      provideHover(model, position) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const docs = {
          pinMode: '**pinMode(pin, mode)**\n\nConfigures the specified pin to behave either as an input or an output.',
          digitalWrite: '**digitalWrite(pin, value)**\n\nWrites a `HIGH` or a `LOW` value to a digital pin.',
          digitalRead: '**digitalRead(pin)**\n\nReads the value from a specified digital pin (`HIGH` or `LOW`).',
          analogRead: '**analogRead(pin)**\n\nReads the value from the specified analog pin.',
          analogWrite: '**analogWrite(pin, value)**\n\nWrites an analog value (PWM wave) to a pin.',
          delay: '**delay(ms)**\n\nPauses the program for the amount of time (in milliseconds) specified.',
          millis: '**millis()**\n\nReturns the number of milliseconds since the Arduino board began running.',
          micros: '**micros()**\n\nReturns the number of microseconds since the Arduino board began running.',
          map: '**map(value, fromLow, fromHigh, toLow, toHigh)**\n\nRemaps a number from one range to another.',
          constrain: '**constrain(value, low, high)**\n\nConstrains a number to be within a range.',
          random: '**random(max)** or **random(min, max)**\n\nGenerate a random long integer.',
          tone: '**tone(pin, frequency, duration)**\n\nGenerates a square wave of the specified frequency.',
          noTone: '**noTone(pin)**\n\nStops the tone generated on a pin.',
          pulseIn: '**pulseIn(pin, value, timeout)**\n\nReads a pulse (either HIGH or LOW) on a pin.',
        };

        // Check library runtime methods
        if (window.ArduinoLibs) {
          for (const [libName, lib] of Object.entries(window.ArduinoLibs)) {
            if (lib.runtime) {
              try {
                const rt = lib.runtime({ _getPlugins: () => window.ArduinoLibs || {} });
                if (rt && typeof rt === 'object') {
                  for (const [methodName, methodFn] of Object.entries(rt)) {
                    if (typeof methodFn === 'function' && !docs[methodName]) {
                      docs[methodName] = `**${methodName}()**\n\nMethod from ${libName} library.`;
                    }
                  }
                }
              } catch (e) { /* plugin may need canvas */ }
            }
            if (lib.classes) {
              for (const cls of lib.classes) {
                if (!docs[cls]) {
                  docs[cls] = `**${cls}**\n\nClass from ${libName} library. Use \`new ${cls}()\` to create an instance.`;
                }
              }
            }
          }
        }

        if (docs[word.word]) {
          return { contents: [{ value: docs[word.word] }] };
        }
        return null;
      }
    });

    // Custom formatter for Arduino language
    this._registerArduinoFormatter();

    // Dark Theme
    monaco.editor.defineTheme('arduino-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5a6676', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'cc99cd' },
        { token: 'constant', foreground: 'f7c948' },
        { token: 'string', foreground: '7ec699' },
        { token: 'number', foreground: 'f08d49' },
        { token: 'preprocessor', foreground: 'cc9966' },
        { token: 'arduino-api', foreground: '6fb3d2', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'e6edf3' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#e6edf3',
        'editor.lineHighlightBackground': '#161b22',
        'editorCursor.foreground': '#00979c',
        'editor.selectionBackground': '#264f78',
        'editorLineNumber.foreground': '#484f58',
      }
    });

    // Light Theme
    monaco.editor.defineTheme('arduino-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a7b8c', fontStyle: 'italic' },
        { token: 'keyword', foreground: '9b59b6' },
        { token: 'constant', foreground: 'e67e22' },
        { token: 'string', foreground: '27ae60' },
        { token: 'number', foreground: 'd35400' },
        { token: 'preprocessor', foreground: '8e44ad' },
        { token: 'arduino-api', foreground: '2980b9', fontStyle: 'bold' },
        { token: 'identifier', foreground: '2c3e50' },
      ],
      colors: {
        'editor.background': '#fafbfc',
        'editor.foreground': '#2c3e50',
        'editor.lineHighlightBackground': '#f0f2f5',
        'editorCursor.foreground': '#00979c',
        'editor.selectionBackground': '#c8d6e5',
        'editorLineNumber.foreground': '#8395a7',
        'editor.overviewRulerBorder': '#e1e4e8',
        'editorGutter.background': '#fafbfc',
      }
    });
  },

  /**
   * Register custom formatter for Arduino language
   * This provides Format Document and Format Selection functionality
   */
  _registerArduinoFormatter() {
    const formatArduinoCode = (code, options = {}) => {
      const tabSize = options.tabSize || 2;
      const insertSpaces = options.insertSpaces !== false;
      const indent = insertSpaces ? ' '.repeat(tabSize) : '\t';

      let lines = code.split('\n');
      let formattedLines = [];
      let indentLevel = 0;
      let inBlockComment = false;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmed = line.trim();

        if (trimmed === '') {
          formattedLines.push('');
          continue;
        }

        if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
          formattedLines.push(trimmed);
          continue;
        }

        if (trimmed.startsWith('/*')) {
          inBlockComment = true;
          formattedLines.push(trimmed);
          continue;
        }
        if (trimmed.endsWith('*/')) {
          inBlockComment = false;
          formattedLines.push(trimmed);
          continue;
        }
        if (inBlockComment) {
          formattedLines.push(trimmed);
          continue;
        }

        let currentIndent = indentLevel;

        if (trimmed.startsWith('}')) {
          currentIndent = Math.max(0, indentLevel - 1);
        }

        let formattedLine = indent.repeat(currentIndent) + trimmed;

        if (trimmed.includes('{') && !trimmed.includes('}')) {
          indentLevel++;
        }
        if (trimmed.includes('}') && !trimmed.includes('{')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }

        formattedLines.push(formattedLine);
      }

      return formattedLines.join('\n');
    };

    monaco.languages.registerDocumentFormattingEditProvider('arduino', {
      provideDocumentFormattingEdits(model, options) {
        const code = model.getValue();
        const formattedCode = formatArduinoCode(code, options);

        return [{
          range: model.getFullModelRange(),
          text: formattedCode
        }];
      }
    });

    monaco.languages.registerDocumentRangeFormattingEditProvider('arduino', {
      provideDocumentRangeFormattingEdits(model, range, options) {
        const selectedCode = model.getValueInRange(range);
        const formattedCode = formatArduinoCode(selectedCode, options);

        return [{
          range: range,
          text: formattedCode
        }];
      }
    });
  },

  _createEditor() {
    const container = document.getElementById('editor-container');
    if (!container) return;

    this.editor = monaco.editor.create(container, {
      value: this.DEFAULT_CODE,
      language: 'arduino',
      theme: 'arduino-dark',
      fontSize: 15,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontLigatures: true,
      lineNumbers: 'on',
      minimap: { enabled: true, scale: 0.8 },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      folding: true,
      tabSize: 2,
      insertSpaces: true,
      mouseWheelZoom: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
    });

    container.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const currentSize = this.editor.getOption(monaco.editor.EditorOption.fontSize);
        const newSize = e.deltaY < 0 ? currentSize + 1 : currentSize - 1;
        const clampedSize = Math.max(8, Math.min(32, newSize));
        this.editor.updateOptions({ fontSize: clampedSize });
      }
    }, { passive: false });

    // Cursor position display
    this.editor.onDidChangeCursorPosition(e => {
      const pos = document.getElementById('editor-cursor');
      if (pos) pos.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });

    // Auto-save on change & auto-clear compilation error markers
    this.editor.onDidChangeModelContent(() => {
      this.clearErrors();

      if (window.StorageManager) window.StorageManager.markDirty();
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        if (window.CircuitCanvas && window.StorageManager && window.App) {
          const projectName = window.App.getProjectName ? window.App.getProjectName() : 'Untitled Project';
          window.StorageManager.autoSave(this.getCode(), window.CircuitCanvas.serialize(), projectName);
        }
      }, 2000);

      this._autoCompile();
    });

    // Keyboard Shortcuts
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
      if (window.App) window.App.run();
    });
    this.editor.addCommand(monaco.KeyCode.F5, () => {
      if (window.App) window.App.run();
    });
    this.editor.addCommand(monaco.KeyCode.F6, () => {
      if (window.App) window.App.stop();
    });

    // Format Document Shortcut (Shift+Alt+F)
    this.editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      this.formatCode(false);
    });

    // Native Format Selection Shortcut (Ctrl+K Ctrl+F)
    this.editor.addCommand(
      monaco.KeyMod.chord(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF
      ),
      () => this.formatCode(true)
    );

    // Copy Shareable URL Shortcut (Ctrl+Shift+S)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, async () => {
      const shareUrl = this.getShareableUrl();
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        if (window.App && window.App.showToast) {
          window.App.showToast("Shareable project URL copied to clipboard!");
        } else {
          alert("Shareable project URL copied to clipboard!");
        }
      }
    });

    // Theme Toggle Shortcut (Ctrl+Shift+T)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyT, () => {
      this.toggleTheme();
      const theme = this.editor._themeService?._theme?.themeName || 'arduino-dark';
      if (window.App && window.App.showToast) {
        window.App.showToast(`Theme switched to ${theme.replace('arduino-', '')} mode`);
      }
    });
  },

  _initFallback() {
    const container = document.getElementById('editor-container');
    if (!container) return;
    const ta = document.createElement('textarea');
    ta.value = this.DEFAULT_CODE;
    ta.style.cssText = `width:100%;height:100%;background:#0d1117;color:#e6edf3;font-family:'JetBrains Mono',monospace;font-size:13px;padding:12px;border:none;outline:none;resize:none;`;
    container.appendChild(ta);
    this._fallbackTA = ta;
    if (window.App) window.App.onEditorReady(this.loadFromUrlHash());
  },

  /* Mobile-optimized code editor with quick character toolbar */
  _initMobileEditor() {
    const container = document.getElementById('editor-container');
    if (!container) return;

    // Quick insertion toolbar for special characters
    const helperBar = document.createElement('div');
    helperBar.style.cssText = 'display:flex;gap:6px;padding:6px;background:#161b22;border-bottom:1px solid #21262d;overflow-x:auto;-webkit-overflow-scrolling:touch;';

    const symbols = ['{', '}', '(', ')', ';', '=', 'HIGH', 'LOW', 'INPUT', 'OUTPUT'];
    symbols.forEach(symbol => {
      const btn = document.createElement('button');
      btn.textContent = symbol;
      btn.style.cssText = 'background:#21262d;color:#e6edf3;border:1px solid #30363d;padding:4px 10px;border-radius:4px;font-family:"JetBrains Mono",monospace;font-size:12px;cursor:pointer;flex-shrink:0;';
      btn.onclick = (e) => {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        ta.value = ta.value.substring(0, start) + symbol + ta.value.substring(end);
        ta.selectionStart = ta.selectionEnd = start + symbol.length;
        ta.focus();
        updateLineNumbers();
      };
      helperBar.appendChild(btn);
    });

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;width:100%;height:calc(100% - 37px);overflow:hidden;background:#0d1117;';

    const gutter = document.createElement('div');
    gutter.style.cssText = 'width:40px;padding:12px 4px 12px 8px;text-align:right;color:#484f58;font-family:"JetBrains Mono",monospace;font-size:13px;line-height:1.6;overflow:hidden;user-select:none;flex-shrink:0;background:#0d1117;border-right:1px solid #21262d;';
    gutter.id = 'mobile-line-numbers';

    const ta = document.createElement('textarea');
    ta.value = this.DEFAULT_CODE;
    ta.spellcheck = false;
    ta.autocomplete = 'off';
    ta.autocorrect = 'off';
    ta.autocapitalize = 'off';
    ta.style.cssText = `flex:1;width:100%;background:#0d1117;color:#e6edf3;font-family:'JetBrains Mono',monospace;font-size:14px;padding:12px;border:none;outline:none;resize:none;tab-size:2;white-space:pre;line-height:1.6;overflow:auto;-webkit-overflow-scrolling:touch;`;

    wrapper.appendChild(gutter);
    wrapper.appendChild(ta);
    container.appendChild(helperBar);
    container.appendChild(wrapper);

    this._fallbackTA = ta;

    const updateLineNumbers = () => {
      const lines = ta.value.split('\n').length;
      gutter.innerHTML = Array.from({ length: lines }, (_, i) => `<div style="height:1.6em">${i + 1}</div>`).join('');
    };
    updateLineNumbers();

    ta.addEventListener('input', updateLineNumbers);
    ta.addEventListener('scroll', () => {
      gutter.scrollTop = ta.scrollTop;
    });

    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
        ta.selectionStart = ta.selectionEnd = start + 2;
        updateLineNumbers();
      }
    });

    ta.addEventListener('input', () => {
      if (window.StorageManager) window.StorageManager.markDirty();
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        if (window.CircuitCanvas && window.StorageManager && window.App) {
          const projectName = window.App.getProjectName ? window.App.getProjectName() : 'Untitled Project';
          window.StorageManager.autoSave(this.getCode(), window.CircuitCanvas.serialize(), projectName);
        }
      }, 2000);
    });

    this.monacoReady = false;
    if (window.App) window.App.onEditorReady(this.loadFromUrlHash());
  },

  getCode() {
    if (this.editor) return this.editor.getValue();
    if (this._fallbackTA) return this._fallbackTA.value;
    return '';
  },

  setCode(code) {
    if (this.editor) {
      this.editor.setValue(code);
      this.editor.revealLine(1);
    } else if (this._fallbackTA) {
      this._fallbackTA.value = code;
    }
  },

  /**
   * Format code in the editor
   * @param {boolean} selectionOnly - If true, format only selected text
   */
  formatCode(selectionOnly = false) {
    if (!this.editor || !this.monacoReady) {
      if (window.App && window.App.showToast) {
        window.App.showToast('Editor not ready', 'warning');
      }
      return;
    }

    try {
      const action = selectionOnly ?
        'editor.action.formatSelection' :
        'editor.action.formatDocument';

      const actionObj = this.editor.getAction(action);

      if (actionObj) {
        actionObj.run().then(() => {
          if (window.App && window.App.showToast) {
            window.App.showToast(selectionOnly ? 'Selection formatted' : 'Document formatted');
          }
        }).catch((err) => {
          console.error('Formatting error:', err);
          if (window.App && window.App.showToast) {
            window.App.showToast('Formatting failed', 'error');
          }
        });
      } else {
        const model = this.editor.getModel();
        if (model) {
          const code = model.getValue();
          const formatted = this._formatArduinoCode(code);
          model.setValue(formatted);
          if (window.App && window.App.showToast) {
            window.App.showToast('Document formatted (manual)');
          }
        }
      }
    } catch (err) {
      console.error('Formatting error:', err);
      if (window.App && window.App.showToast) {
        window.App.showToast('Formatting failed', 'error');
      }
    }
  },

  _formatArduinoCode(code) {
    const lines = code.split('\n');
    const formatted = [];
    let indentLevel = 0;
    const indent = '  ';

    for (let line of lines) {
      const trimmed = line.trim();

      if (trimmed === '') {
        formatted.push('');
        continue;
      }

      if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        formatted.push(trimmed);
        continue;
      }

      if (trimmed.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      formatted.push(indent.repeat(indentLevel) + trimmed);

      if (trimmed.endsWith('{') && !trimmed.includes('//')) {
        indentLevel++;
      }
    }

    return formatted.join('\n');
  },

  getShareableUrl() {
    const circuitData = window.CircuitCanvas ? window.CircuitCanvas.serialize() : null;
    const payload = {
      v: 1,
      code: this.getCode(),
      circuit: circuitData
    };

    try {
      const jsonString = JSON.stringify(payload);
      const encoded = btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g,
        (_, p1) => String.fromCharCode('0x' + p1)
      ));
      return `${window.location.origin}${window.location.pathname}#project=${encoded}`;
    } catch (err) {
      console.error("Failed to generate share URL:", err);
      return null;
    }
  },

  loadFromUrlHash() {
    const hash = window.location.hash;
    if (!hash.includes('#project=')) return false;

    try {
      const base64Data = hash.split('#project=')[1];
      const jsonString = decodeURIComponent(
        Array.prototype.map.call(atob(base64Data), c =>
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
      );

      const payload = JSON.parse(jsonString);

      if (payload.code) {
        this.setCode(payload.code);
      }

      if (payload.circuit && window.CircuitCanvas && window.CircuitCanvas.deserialize) {
        window.CircuitCanvas.deserialize(payload.circuit);
      }

      console.log("ArduSim project successfully restored from URL hash.");
      return true;
    } catch (err) {
      console.error("Failed to parse project from URL hash:", err);
      return false;
    }
  },

  toggleTheme() {
    if (!this.editor || !this.monacoReady) return;

    const currentTheme = this.editor._themeService?._theme?.themeName || 'arduino-dark';
    const newTheme = currentTheme === 'arduino-dark' ? 'arduino-light' : 'arduino-dark';

    this.editor.updateOptions({
      theme: newTheme,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on'
    });

    localStorage.setItem('ardusim-theme', newTheme);
    this.updateThemeButtonUI(newTheme);

    if (window.App && window.App.onThemeChange) {
      window.App.onThemeChange(newTheme);
    }

    return newTheme;
  },

  updateThemeButtonUI(theme) {
    const btn = document.getElementById('btn-theme');
    if (!btn) return;

    if (theme === 'arduino-light') {
      btn.innerHTML = '🌙';
      btn.title = 'Switch to Dark Theme';
      btn.classList.add('light-mode');
      btn.classList.remove('dark-mode');
    } else {
      btn.innerHTML = '☀️';
      btn.title = 'Switch to Light Theme';
      btn.classList.add('dark-mode');
      btn.classList.remove('light-mode');
    }

    document.body.classList.toggle('light-theme', theme === 'arduino-light');
    document.body.classList.toggle('dark-theme', theme !== 'arduino-light');
  },

  loadSavedTheme() {
    if (!this.editor || !this.monacoReady) return;

    let savedTheme = localStorage.getItem('ardusim-theme');

    if (!savedTheme || savedTheme === 'dark') {
      savedTheme = 'arduino-dark';
    } else if (savedTheme === 'light') {
      savedTheme = 'arduino-light';
    } else if (savedTheme !== 'arduino-dark' && savedTheme !== 'arduino-light') {
      savedTheme = this.detectSystemTheme();
    }

    this.editor.updateOptions({ theme: savedTheme });
    localStorage.setItem('ardusim-theme', savedTheme);
    this.updateThemeButtonUI(savedTheme);

    return savedTheme;
  },

  detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'arduino-dark';
    } else {
      return 'arduino-light';
    }
  },

  _listenSystemThemeChanges() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        if (!localStorage.getItem('ardusim-theme')) {
          const newTheme = e.matches ? 'arduino-dark' : 'arduino-light';
          if (this.editor && this.monacoReady) {
            this.editor.updateOptions({ theme: newTheme });
            this.updateThemeButtonUI(newTheme);
          }
        }
      });
    }
  },

  setTheme(dark) {
    if (this.editor && this.monacoReady) {
      const theme = dark ? 'arduino-dark' : 'arduino-light';
      this.editor.updateOptions({ theme });
      localStorage.setItem('ardusim-theme', theme);
      this.updateThemeButtonUI(theme);
    }
  },

  getAction(actionId) {
    if (!this.editor || !this.monacoReady) return null;
    return this.editor.getAction(actionId);
  },

  showError(line, msg) {
    if (!this.editor) return;
    const model = this.editor.getModel();
    monaco.editor.setModelMarkers(model, 'ardusim', [{
      severity: monaco.MarkerSeverity.Error,
      startLineNumber: line || 1,
      startColumn: 1,
      endLineNumber: line || 1,
      endColumn: 100,
      message: msg,
    }]);
    this._showErrorPanel(line, msg);
  },

  clearErrors() {
    if (!this.editor) return;
    const model = this.editor.getModel();
    if (model) monaco.editor.setModelMarkers(model, 'ardusim', []);
    this._hideErrorPanel();
  },

  _showErrorPanel(line, msg) {
    const panel = document.getElementById('editor-error-panel');
    const textEl = document.getElementById('editor-error-text');
    if (!panel || !textEl) return;
    const prefix = line > 0 ? `Line ${line}: ` : '';
    textEl.textContent = prefix + msg;
    panel.style.display = '';
    if (!this._errorCloseBound) {
      this._errorCloseBound = true;
      const btn = document.getElementById('editor-error-close');
      if (btn) btn.addEventListener('click', () => this.clearErrors());
    }
  },

  _hideErrorPanel() {
    const panel = document.getElementById('editor-error-panel');
    if (panel) panel.style.display = 'none';
  },

  /**
   * Auto-compile code on editor changes (debounced).
   * Validates syntax and shows errors as Monaco markers.
   */
  _autoCompile() {
    if (!window.App || !window.App.sim) return;
    if (window.App.isRunning) return;

    clearTimeout(this._autoCompileTimer);
    this._autoCompileTimer = setTimeout(() => this._doAutoCompile(), 800);
  },

  async _doAutoCompile() {
    const code = this.getCode();
    if (!code || code === this._lastCompileCode) return;
    this._lastCompileCode = code;

    try {
      const sim = window.App.sim;
      const board = window.App.canvas ? window.App.canvas.boardType || 'arduino_uno' : 'arduino_uno';
      sim.setBoard(board);

      const result = await sim.compile(code);

      if (result.ok) {
        this.clearErrors();
      } else {
        this._showCompileError(result.error, result.rawError);
      }
    } catch (err) {
      // Silently ignore — don't show transient errors during typing
    }
  },

  _showCompileError(errorMsg, rawError) {
    const { line, message } = this._extractLineFromError(errorMsg, rawError);

    if (line > 0) {
      this.showError(line, message);
    } else {
      this._showErrorPanel(0, message);
    }
  },

  _extractLineFromError(errorMsg, rawError) {
    let line = 0;
    let message = errorMsg || 'Unknown error';

    // Try to extract line from stack trace (compiled JS line)
    if (rawError && rawError.stack) {
      const m = rawError.stack.match(/<anonymous>:(\d+)(?::\d+)?/);
      if (m) {
        const compiledLine = parseInt(m[1], 10) - 1;
        if (compiledLine > 0) {
          line = this._mapCompiledLineToSource(compiledLine);
        }
      }
    }

    // Fallback: extract "line N" from error message
    if (line === 0) {
      const lineMatch = errorMsg.match(/line\s+(\d+)/i);
      if (lineMatch) line = parseInt(lineMatch[1], 10);
    }

    return { line, message };
  },

  /**
   * Best-effort mapping: compiled JS line → original Arduino source line.
   * The transpiler adds ~6-8 preamble lines (#define comments, preprocessor
   * stripping, constant replacements). We scan the original source for a
   * distinctive token near the error region.
   */
  _mapCompiledLineToSource(compiledLine) {
    const code = this.getCode();
    if (!code) return compiledLine;
    const srcLines = code.split('\n');

    // Heuristic: the transpiler strips comments and preprocessor lines,
    // so the compiled line count is <= source line count. Use a simple
    // ratio mapping and adjust for preprocessor/comment lines.
    const preprocessorOffset = srcLines.filter(l => {
      const t = l.trim();
      return t.startsWith('#') || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*');
    }).length;

    const estimated = Math.max(1, compiledLine - Math.floor(preprocessorOffset * 0.3));
    return Math.min(estimated, srcLines.length);
  },

  /**
   * Detect the type of a variable by scanning the source code for declarations.
   * e.g. "LiquidCrystal lcd(12, 11, 5, 4, 3, 2);" → "LiquidCrystal"
   */
  _detectVarType(code, varName) {
    if (!code || !varName) return null;

    // Pattern: TypeName varName(...)
    // Matches: LiquidCrystal lcd(...), Servo myServo(...), DHT dht(...), etc.
    const ctorPatterns = [
      /\b(\w+)\s+\w+\s*\([^)]*\)\s*;/g,
      /\b(\w+)\s+\w+\s*;/g,
    ];

    for (const pat of ctorPatterns) {
      let m;
      while ((m = pat.exec(code)) !== null) {
        const typeName = m[1];
        const line = code.substring(m.index, m.index + m[0].length);
        // Extract the variable name from the match
        const varMatch = line.match(new RegExp('\\b' + typeName + '\\s+(\\w+)'));
        if (varMatch && varMatch[1] === varName) {
          return typeName;
        }
      }
    }
    return null;
  },

  /**
   * Get instance methods for a library class type.
   * Returns an array of { name, snippet, doc } objects.
   */
  _getInstanceMethods(typeName) {
    const METHOD_MAP = {
      LiquidCrystal: [
        { name: 'begin', snippet: 'begin(${1:cols}, ${2:rows})', doc: 'Initialize the LCD (cols, rows)' },
        { name: 'setCursor', snippet: 'setCursor(${1:col}, ${2:row})', doc: 'Set the cursor position' },
        { name: 'print', snippet: 'print(${1:text})', doc: 'Print text to the LCD' },
        { name: 'println', snippet: 'println(${1:text})', doc: 'Print text with newline' },
        { name: 'write', snippet: 'write(${1:char})', doc: 'Write a single character' },
        { name: 'clear', snippet: 'clear()', doc: 'Clear the LCD screen' },
        { name: 'home', snippet: 'home()', doc: 'Move cursor to home position (0,0)' },
        { name: 'noDisplay', snippet: 'noDisplay()', doc: 'Turn off the display' },
        { name: 'display', snippet: 'display()', doc: 'Turn on the display' },
        { name: 'noBacklight', snippet: 'noBacklight()', doc: 'Turn off the backlight' },
        { name: 'backlight', snippet: 'backlight()', doc: 'Turn on the backlight' },
        { name: 'autoscroll', snippet: 'autoscroll()', doc: 'Enable autoscroll' },
        { name: 'noAutoscroll', snippet: 'noAutoscroll()', doc: 'Disable autoscroll' },
        { name: 'leftToRight', snippet: 'leftToRight()', doc: 'Set text direction left-to-right' },
        { name: 'rightToLeft', snippet: 'rightToLeft()', doc: 'Set text direction right-to-left' },
        { name: 'createChar', snippet: 'createChar(${1:location}, ${2:charmap})', doc: 'Create a custom character' },
      ],
      LiquidCrystal_I2C: [
        { name: 'init', snippet: 'init()', doc: 'Initialize the I2C LCD' },
        { name: 'begin', snippet: 'begin(${1:cols}, ${2:rows})', doc: 'Initialize the LCD (cols, rows)' },
        { name: 'setBacklight', snippet: 'setBacklight(${1:0or1})', doc: 'Set backlight on/off' },
        { name: 'setCursor', snippet: 'setCursor(${1:col}, ${2:row})', doc: 'Set the cursor position' },
        { name: 'print', snippet: 'print(${1:text})', doc: 'Print text to the LCD' },
        { name: 'println', snippet: 'println(${1:text})', doc: 'Print text with newline' },
        { name: 'write', snippet: 'write(${1:char})', doc: 'Write a single character' },
        { name: 'clear', snippet: 'clear()', doc: 'Clear the LCD screen' },
        { name: 'home', snippet: 'home()', doc: 'Move cursor to home position' },
        { name: 'noDisplay', snippet: 'noDisplay()', doc: 'Turn off the display' },
        { name: 'display', snippet: 'display()', doc: 'Turn on the display' },
        { name: 'noBacklight', snippet: 'noBacklight()', doc: 'Turn off the backlight' },
        { name: 'backlight', snippet: 'backlight()', doc: 'Turn on the backlight' },
        { name: 'autoscroll', snippet: 'autoscroll()', doc: 'Enable autoscroll' },
        { name: 'noAutoscroll', snippet: 'noAutoscroll()', doc: 'Disable autoscroll' },
        { name: 'leftToRight', snippet: 'leftToRight()', doc: 'Set text direction left-to-right' },
        { name: 'rightToLeft', snippet: 'rightToLeft()', doc: 'Set text direction right-to-left' },
        { name: 'createChar', snippet: 'createChar(${1:location}, ${2:charmap})', doc: 'Create a custom character' },
      ],
      Servo: [
        { name: 'attach', snippet: 'attach(${1:pin})', doc: 'Attach the servo to a pin' },
        { name: 'write', snippet: 'write(${1:angle})', doc: 'Set servo angle (0-180 degrees)' },
        { name: 'writeMicroseconds', snippet: 'writeMicroseconds(${1:value})', doc: 'Set servo position in microseconds' },
        { name: 'read', snippet: 'read()', doc: 'Read the current servo angle' },
        { name: 'readMicroseconds', snippet: 'readMicroseconds()', doc: 'Read the current pulse width in microseconds' },
        { name: 'attached', snippet: 'attached()', doc: 'Check if the servo is attached' },
        { name: 'detach', snippet: 'detach()', doc: 'Detach the servo' },
      ],
      DHT: [
        { name: 'begin', snippet: 'begin()', doc: 'Initialize the DHT sensor' },
        { name: 'readTemperature', snippet: 'readTemperature(${1:scale})', doc: 'Read temperature (no arg=Celsius, "F"=Fahrenheit)' },
        { name: 'readHumidity', snippet: 'readHumidity()', doc: 'Read relative humidity (%)' },
        { name: 'convertCtoF', snippet: 'convertCtoF(${1:c})', doc: 'Convert Celsius to Fahrenheit' },
        { name: 'convertFtoC', snippet: 'convertFtoC(${1:f})', doc: 'Convert Fahrenheit to Celsius' },
        { name: 'computeHeatIndex', snippet: 'computeHeatIndex(${1:temp}, ${2:humidity}, ${3:fahrenheit})', doc: 'Compute heat index' },
        { name: 'read32', snippet: 'read32(${1:scale})', doc: 'Read 32-bit temperature value' },
      ],
      Adafruit_SSD1306: [
        { name: 'begin', snippet: 'begin(${1:SSD1306_SWITCHCAPVCC}, ${2:0x3C})', doc: 'Initialize the OLED display' },
        { name: 'clearDisplay', snippet: 'clearDisplay()', doc: 'Clear the display buffer' },
        { name: 'display', snippet: 'display()', doc: 'Push buffer to screen' },
        { name: 'drawPixel', snippet: 'drawPixel(${1:x}, ${2:y}, ${3:color})', doc: 'Draw a single pixel' },
        { name: 'drawLine', snippet: 'drawLine(${1:x0}, ${2:y0}, ${3:x1}, ${4:y1}, ${5:color})', doc: 'Draw a line' },
        { name: 'drawRect', snippet: 'drawRect(${1:x}, ${2:y}, ${3:w}, ${4:h}, ${5:color})', doc: 'Draw a rectangle outline' },
        { name: 'fillRect', snippet: 'fillRect(${1:x}, ${2:y}, ${3:w}, ${4:h}, ${5:color})', doc: 'Draw a filled rectangle' },
        { name: 'drawRoundRect', snippet: 'drawRoundRect(${1:x}, ${2:y}, ${3:w}, ${4:h}, ${5:r}, ${6:color})', doc: 'Draw a rounded rectangle' },
        { name: 'fillRoundRect', snippet: 'fillRoundRect(${1:x}, ${2:y}, ${3:w}, ${4:h}, ${5:r}, ${6:color})', doc: 'Draw a filled rounded rectangle' },
        { name: 'drawCircle', snippet: 'drawCircle(${1:x0}, ${2:y0}, ${3:r}, ${4:color})', doc: 'Draw a circle outline' },
        { name: 'fillCircle', snippet: 'fillCircle(${1:x0}, ${2:y0}, ${3:r}, ${4:color})', doc: 'Draw a filled circle' },
        { name: 'drawTriangle', snippet: 'drawTriangle(${1:x0}, ${2:y0}, ${3:x1}, ${4:y1}, ${5:x2}, ${6:y2}, ${7:color})', doc: 'Draw a triangle outline' },
        { name: 'fillTriangle', snippet: 'fillTriangle(${1:x0}, ${2:y0}, ${3:x1}, ${4:y1}, ${5:x2}, ${6:y2}, ${7:color})', doc: 'Draw a filled triangle' },
        { name: 'drawChar', snippet: 'drawChar(${1:x}, ${2:y}, ${3:ch}, ${4:color}, ${5:bg}, ${6:size})', doc: 'Draw a single character' },
        { name: 'setCursor', snippet: 'setCursor(${1:x}, ${2:y})', doc: 'Set the text cursor position' },
        { name: 'setTextColor', snippet: 'setTextColor(${1:color})', doc: 'Set the text color' },
        { name: 'setTextSize', snippet: 'setTextSize(${1:size})', doc: 'Set the text size (1=small, 2=medium, etc.)' },
        { name: 'setTextWrap', snippet: 'setTextWrap(${1:wrap})', doc: 'Enable or disable text wrapping' },
        { name: 'print', snippet: 'print(${1:text})', doc: 'Print text at cursor position' },
        { name: 'println', snippet: 'println(${1:text})', doc: 'Print text with newline' },
        { name: 'cp437', snippet: 'cp437(${1:enable})', doc: 'Enable Code Page 437 font' },
        { name: 'setFont', snippet: 'setFont(${1:font})', doc: 'Set a custom font' },
        { name: 'getRotation', snippet: 'getRotation()', doc: 'Get current display rotation' },
        { name: 'getwidth', snippet: 'getwidth()', doc: 'Get display width' },
        { name: 'getheight', snippet: 'getheight()', doc: 'Get display height' },
        { name: 'dim', snippet: 'dim(${1:dim})', doc: 'Dim the display (true/false)' },
        { name: 'setContrast', snippet: 'setContrast(${1:contrast})', doc: 'Set display contrast (0-255)' },
        { name: 'invertDisplay', snippet: 'invertDisplay(${1:invert})', doc: 'Invert display colors' },
        { name: 'drawBitmap', snippet: 'drawBitmap(${1:x}, ${2:y}, ${3:bitmap}, ${4:w}, ${5:h}, ${6:color})', doc: 'Draw a bitmap image' },
      ],
      Adafruit_ILI9341: [
        { name: 'begin', snippet: 'begin()', doc: 'Initialize the TFT display' },
        { name: 'setRotation', snippet: 'setRotation(${1:rotation})', doc: 'Set display rotation (0-3)' },
        { name: 'fillScreen', snippet: 'fillScreen(${1:color})', doc: 'Fill entire screen with color' },
        { name: 'drawPixel', snippet: 'drawPixel(${1:x}, ${2:y}, ${3:color})', doc: 'Draw a single pixel' },
        { name: 'drawLine', snippet: 'drawLine(${1:x0}, ${2:y0}, ${3:x1}, ${4:y1}, ${5:color})', doc: 'Draw a line' },
        { name: 'drawRect', snippet: 'drawRect(${1:x}, ${2:y}, ${3:w}, ${4:h}, ${5:color})', doc: 'Draw a rectangle outline' },
        { name: 'fillRect', snippet: 'fillRect(${1:x}, ${2:y}, ${3:w}, ${4:h}, ${5:color})', doc: 'Draw a filled rectangle' },
        { name: 'drawCircle', snippet: 'drawCircle(${1:x0}, ${2:y0}, ${3:r}, ${4:color})', doc: 'Draw a circle outline' },
        { name: 'fillCircle', snippet: 'fillCircle(${1:x0}, ${2:y0}, ${3:r}, ${4:color})', doc: 'Draw a filled circle' },
        { name: 'drawTriangle', snippet: 'drawTriangle(${1:x0}, ${2:y0}, ${3:x1}, ${4:y1}, ${5:x2}, ${6:y2}, ${7:color})', doc: 'Draw a triangle' },
        { name: 'fillTriangle', snippet: 'fillTriangle(${1:x0}, ${2:y0}, ${3:x1}, ${4:y1}, ${5:x2}, ${6:y2}, ${7:color})', doc: 'Draw a filled triangle' },
        { name: 'setCursor', snippet: 'setCursor(${1:x}, ${2:y})', doc: 'Set text cursor position' },
        { name: 'setTextColor', snippet: 'setTextColor(${1:fg}, ${2:bg})', doc: 'Set text foreground and background color' },
        { name: 'setTextSize', snippet: 'setTextSize(${1:size})', doc: 'Set text size' },
        { name: 'setTextWrap', snippet: 'setTextWrap(${1:wrap})', doc: 'Enable/disable text wrapping' },
        { name: 'print', snippet: 'print(${1:text})', doc: 'Print text' },
        { name: 'println', snippet: 'println(${1:text})', doc: 'Print text with newline' },
        { name: 'drawChar', snippet: 'drawChar(${1:x}, ${2:y}, ${3:ch}, ${4:color}, ${5:bg}, ${6:size})', doc: 'Draw a character' },
        { name: 'drawBitmap', snippet: 'drawBitmap(${1:x}, ${2:y}, ${3:bitmap}, ${4:w}, ${5:h}, ${6:color})', doc: 'Draw a bitmap' },
        { name: 'invertDisplay', snippet: 'invertDisplay(${1:i})', doc: 'Invert display' },
        { name: 'width', snippet: 'width()', doc: 'Get display width' },
        { name: 'height', snippet: 'height()', doc: 'Get display height' },
      ],
      Adafruit_GFX: [
        { name: 'begin', snippet: 'begin(${1:args})', doc: 'Initialize the display' },
        { name: 'clearDisplay', snippet: 'clearDisplay()', doc: 'Clear the display buffer' },
        { name: 'display', snippet: 'display()', doc: 'Push buffer to screen' },
        { name: 'fillScreen', snippet: 'fillScreen(${1:color})', doc: 'Fill screen with color' },
        { name: 'drawPixel', snippet: 'drawPixel(${1:x}, ${2:y}, ${3:color})', doc: 'Draw a pixel' },
        { name: 'drawLine', snippet: 'drawLine(${1:x0}, ${2:y0}, ${3:x1}, ${4:y1}, ${5:color})', doc: 'Draw a line' },
        { name: 'drawRect', snippet: 'drawRect(${1:x}, ${2:y}, ${3:w}, ${4:h}, ${5:color})', doc: 'Draw rectangle outline' },
        { name: 'fillRect', snippet: 'fillRect(${1:x}, ${2:y}, ${3:w}, ${4:h}, ${5:color})', doc: 'Draw filled rectangle' },
        { name: 'drawCircle', snippet: 'drawCircle(${1:x0}, ${2:y0}, ${3:r}, ${4:color})', doc: 'Draw circle outline' },
        { name: 'fillCircle', snippet: 'fillCircle(${1:x0}, ${2:y0}, ${3:r}, ${4:color})', doc: 'Draw filled circle' },
        { name: 'drawTriangle', snippet: 'drawTriangle(${1:x0}, ${2:y0}, ${3:x1}, ${4:y1}, ${5:x2}, ${6:y2}, ${7:color})', doc: 'Draw triangle' },
        { name: 'fillTriangle', snippet: 'fillTriangle(${1:x0}, ${2:y0}, ${3:x1}, ${4:y1}, ${5:x2}, ${6:y2}, ${7:color})', doc: 'Draw filled triangle' },
        { name: 'drawRoundRect', snippet: 'drawRoundRect(${1:x}, ${2:y}, ${3:w}, ${4:h}, ${5:r}, ${6:color})', doc: 'Draw rounded rectangle' },
        { name: 'fillRoundRect', snippet: 'fillRoundRect(${1:x}, ${2:y}, ${3:w}, ${4:h}, ${5:r}, ${6:color})', doc: 'Draw filled rounded rectangle' },
        { name: 'setCursor', snippet: 'setCursor(${1:x}, ${2:y})', doc: 'Set cursor position' },
        { name: 'setTextColor', snippet: 'setTextColor(${1:color})', doc: 'Set text color' },
        { name: 'setTextSize', snippet: 'setTextSize(${1:size})', doc: 'Set text size' },
        { name: 'setTextWrap', snippet: 'setTextWrap(${1:wrap})', doc: 'Enable text wrapping' },
        { name: 'print', snippet: 'print(${1:text})', doc: 'Print text' },
        { name: 'println', snippet: 'println(${1:text})', doc: 'Print text with newline' },
        { name: 'drawChar', snippet: 'drawChar(${1:x}, ${2:y}, ${3:ch}, ${4:color}, ${5:bg}, ${6:size})', doc: 'Draw a character' },
        { name: 'drawBitmap', snippet: 'drawBitmap(${1:x}, ${2:y}, ${3:bitmap}, ${4:w}, ${5:h}, ${6:color})', doc: 'Draw bitmap' },
        { name: 'cp437', snippet: 'cp437(${1:enable})', doc: 'Enable CP437 charset' },
        { name: 'setRotation', snippet: 'setRotation(${1:r})', doc: 'Set rotation (0-3)' },
        { name: 'getRotation', snippet: 'getRotation()', doc: 'Get current rotation' },
        { name: 'width', snippet: 'width()', doc: 'Get width' },
        { name: 'height', snippet: 'height()', doc: 'Get height' },
      ],
      Adafruit_NeoPixel: [
        { name: 'begin', snippet: 'begin()', doc: 'Initialize the NeoPixel strip' },
        { name: 'show', snippet: 'show()', doc: 'Push pixel data to the strip' },
        { name: 'setPixelColor', snippet: 'setPixelColor(${1:n}, ${2:color})', doc: 'Set pixel color (n, packed RGB)' },
        { name: 'setPixelColorRGB', snippet: 'setPixelColor(${1:n}, ${2:r}, ${3:g}, ${4:b})', doc: 'Set pixel color (n, R, G, B)' },
        { name: 'getPixelColor', snippet: 'getPixelColor(${1:n})', doc: 'Get packed color of pixel n' },
        { name: 'setBrightness', snippet: 'setBrightness(${1:brightness})', doc: 'Set brightness (0-255)' },
        { name: 'getBrightness', snippet: 'getBrightness()', doc: 'Get current brightness' },
        { name: 'Color', snippet: 'Color(${1:r}, ${2:g}, ${3:b})', doc: 'Pack R, G, B into a single color value' },
        { name: 'numPixels', snippet: 'numPixels()', doc: 'Get number of pixels in the strip' },
        { name: 'clear', snippet: 'clear()', doc: 'Set all pixels to off' },
        { name: 'gamma32', snippet: 'gamma32(${1:color})', doc: 'Apply gamma correction (2.8)' },
      ],
      FastLED: [
        { name: 'addLeds', snippet: 'addLeds(${1:leds}, ${2:numLeds})', doc: 'Add LED array to FastLED' },
        { name: 'show', snippet: 'show()', doc: 'Push data to LEDs' },
        { name: 'setBrightness', snippet: 'setBrightness(${1:brightness})', doc: 'Set global brightness (0-255)' },
        { name: 'setPixelColor', snippet: 'setPixelColor(${1:n}, ${2:r}, ${3:g}, ${4:b})', doc: 'Set pixel RGB color' },
        { name: 'getPixelColor', snippet: 'getPixelColor(${1:n})', doc: 'Get pixel color' },
        { name: 'clear', snippet: 'clear()', doc: 'Clear all pixels' },
        { name: 'clear true', snippet: 'clear(${1:true})', doc: 'Clear including async data' },
        { name: 'delay', snippet: 'delay(${1:ms})', doc: 'Delay with show()' },
        { name: 'Color', snippet: 'Color(${1:r}, ${2:g}, ${3:b})', doc: 'Create a CRGB color' },
        { name: 'HSVtoRGB', snippet: 'HSVtoRGB(${1:h}, ${2:s}, ${3:v})', doc: 'Convert HSV to RGB' },
      ],
      NewPing: [
        { name: 'ping_cm', snippet: 'ping_cm()', doc: 'Measure distance in centimeters' },
        { name: 'ping_in', snippet: 'ping_in()', doc: 'Measure distance in inches' },
        { name: 'ping_median', snippet: 'ping_median(${1:iterations})', doc: 'Median of multiple readings (default 5)' },
        { name: 'ping', snippet: 'ping()', doc: 'Measure distance (cm)' },
        { name: 'convert_cm', snippet: 'convert_cm(${1:microseconds})', doc: 'Convert echo time to cm' },
        { name: 'convert_in', snippet: 'convert_in(${1:microseconds})', doc: 'Convert echo time to inches' },
        { name: 'timer_stop', snippet: 'timer_stop()', doc: 'Stop the ping timer' },
        { name: 'ping_timer', snippet: 'ping_timer(${1:callback})', doc: 'Non-blocking ping with callback' },
      ],
      Wire: [
        { name: 'begin', snippet: 'begin()', doc: 'Initialize I2C as master' },
        { name: 'beginTransmission', snippet: 'beginTransmission(${1:address})', doc: 'Begin transmission to device' },
        { name: 'write', snippet: 'write(${1:value})', doc: 'Write data to transmission buffer' },
        { name: 'endTransmission', snippet: 'endTransmission()', doc: 'End transmission and send data' },
        { name: 'requestFrom', snippet: 'requestFrom(${1:address}, ${2:quantity})', doc: 'Request bytes from a device' },
        { name: 'read', snippet: 'read()', doc: 'Read a byte from the buffer' },
        { name: 'available', snippet: 'available()', doc: 'Check bytes available to read' },
        { name: 'peek', snippet: 'peek()', doc: 'Peek at next byte without reading' },
        { name: 'flush', snippet: 'flush()', doc: 'Wait for transmission to complete' },
        { name: 'setClock', snippet: 'setClock(${1:freq})', doc: 'Set I2C clock frequency' },
        { name: 'onReceive', snippet: 'onReceive(${1:handler})', doc: 'Register receive handler' },
        { name: 'onRequest', snippet: 'onRequest(${1:handler})', doc: 'Register request handler' },
      ],
      Stepper: [
        { name: 'setSpeed', snippet: 'setSpeed(${1:rpm})', doc: 'Set motor speed in RPM' },
        { name: 'step', snippet: 'step(${1:steps})', doc: 'Move motor by number of steps' },
      ],
      SimpleBME280: [
        { name: 'begin', snippet: 'begin()', doc: 'Initialize the BME280 sensor' },
        { name: 'readTemperature', snippet: 'readTemperature()', doc: 'Read temperature in Celsius' },
        { name: 'readHumidity', snippet: 'readHumidity()', doc: 'Read humidity (%)' },
        { name: 'readPressure', snippet: 'readPressure()', doc: 'Read pressure (Pa)' },
        { name: 'readAltitude', snippet: 'readAltitude(${1:sealevel})', doc: 'Read altitude in meters' },
      ],
      Adafruit_VL53L0X: [
        { name: 'begin', snippet: 'begin()', doc: 'Initialize the ToF sensor' },
        { name: 'startRangeRead', snippet: 'startRangeRead()', doc: 'Start a non-blocking range reading' },
        { name: 'readRange', snippet: 'readRange()', doc: 'Read range in mm' },
        { name: 'readRangeComplete', snippet: 'readRangeComplete()', doc: 'Check if range reading is complete' },
        { name: 'rangeReadMillimeters', snippet: 'rangeReadMillimeters()', doc: 'Get range in mm (blocking)' },
      ],
      MFRC522: [
        { name: 'begin', snippet: 'begin(${1:mfrc522_bus}, ${2:slaveSelectPin})', doc: 'Initialize RFID reader' },
        { name: 'PICC_IsNewCardPresent', snippet: 'PICC_IsNewCardPresent()', doc: 'Check if a new card is present' },
        { name: 'PICC_ReadCardSerial', snippet: 'PICC_ReadCardSerial()', doc: 'Read card serial number' },
        { name: 'PICC_HaltA', snippet: 'PICC_HaltA()', doc: 'Halt the current card' },
        { name: 'PICC_DumpToSerial', snippet: 'PICC_DumpToSerial(&(mfrc522.uid))', doc: 'Dump card data to Serial' },
      ],
      TinyGPS: [
        { name: 'encode', snippet: 'encode(${1:c})', doc: 'Feed a character to the parser' },
        { name: 'is_Valid', snippet: 'is_Valid()', doc: 'Check if GPS fix is valid' },
        { name: 'f_get_position', snippet: 'f_get_position(${1:flat}, ${2:flon})', doc: 'Get latitude and longitude' },
        { name: 'f_altitude', snippet: 'f_altitude()', doc: 'Get altitude in meters' },
        { name: 'f_speed_kmph', snippet: 'f_speed_kmph()', doc: 'Get speed in km/h' },
        { name: 'f_course', snippet: 'f_course()', doc: 'Get course/bearing in degrees' },
        { name: 'satellites', snippet: 'satellites()', doc: 'Get number of satellites' },
      ],
      SoftwareSerial: [
        { name: 'begin', snippet: 'begin(${1:baud})', doc: 'Set baud rate' },
        { name: 'read', snippet: 'read()', doc: 'Read a byte' },
        { name: 'write', snippet: 'write(${1:value})', doc: 'Write a byte' },
        { name: 'print', snippet: 'print(${1:text})', doc: 'Print text' },
        { name: 'println', snippet: 'println(${1:text})', doc: 'Print text with newline' },
        { name: 'available', snippet: 'available()', doc: 'Check bytes available' },
        { name: 'peek', snippet: 'peek()', doc: 'Peek at next byte' },
        { name: 'listen', snippet: 'listen()', doc: 'Enable listening' },
        { name: 'isListening', snippet: 'isListening()', doc: 'Check if listening' },
        { name: 'overflow', snippet: 'overflow()', doc: 'Check buffer overflow' },
        { name: 'flush', snippet: 'flush()', doc: 'Wait for TX to complete' },
      ],
      CoapClient: [
        { name: 'get', snippet: 'get("${1:/path}")', doc: 'CoAP GET request' },
        { name: 'put', snippet: 'put("${1:/path}", ${2:data})', doc: 'CoAP PUT request' },
        { name: 'post', snippet: 'post("${1:/path}", ${2:data})', doc: 'CoAP POST request' },
        { name: 'delete', snippet: 'delete("${1:/path}")', doc: 'CoAP DELETE request' },
        { name: 'loop', snippet: 'loop()', doc: 'Poll for responses' },
      ],
      CoapServer: [
        { name: 'add_resource', snippet: 'add_resource("${1:/path}", ${2:handlerFn})', doc: 'Add a resource handler' },
        { name: 'start', snippet: 'start()', doc: 'Start the CoAP server' },
      ],
    };

    // Check direct match
    if (METHOD_MAP[typeName]) return METHOD_MAP[typeName];

    // Check if it inherits from Adafruit_GFX (SSD1306, ILI9341, etc.)
    if (METHOD_MAP.Adafruit_GFX) return METHOD_MAP.Adafruit_GFX;

    return null;
  },

  dispose() {
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
    if (this._fallbackTA) {
      this._fallbackTA.remove();
      this._fallbackTA = null;
    }
  }
};

window.EditorManager = EditorManager;