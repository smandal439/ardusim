// Simulate CppTypes.getTypePattern() and test all the new RegExp() calls

const CppTypes = {
  primitives: [
    'void', 'bool', 'char', 'unsigned char', 'signed char',
    'int', 'unsigned int', 'signed int',
    'short', 'unsigned short', 'signed short',
    'long', 'unsigned long', 'signed long',
    'long long', 'unsigned long long',
    'float', 'double', 'long double',
    'byte', 'boolean',
  ],
  fixedWidth: [
    'int8_t', 'uint8_t',
    'int16_t', 'uint16_t',
    'int32_t', 'uint32_t',
    'int64_t', 'uint64_t',
    'int_least8_t', 'uint_least8_t',
    'int_least16_t', 'uint_least16_t',
    'int_least32_t', 'uint_least32_t',
    'int_fast8_t', 'uint_fast8_t',
    'int_fast16_t', 'uint_fast16_t',
    'int_fast32_t', 'uint_fast32_t',
    'intptr_t', 'uintptr_t',
    'size_t', 'ssize_t',
    'ptrdiff_t',
  ],
  espIdf: [
    'esp_err_t',
    'esp_now_peer_info_t',
    'esp_now_send_status_t',
    'gpio_num_t',
    'i2s_mode_t',
    'i2s_bits_per_sample_t',
    'i2s_channel_fmt_t',
    'i2s_comm_format_t',
  ],
  freertos: [
    'TaskFunction_t',
    'TickType_t',
    'BaseType_t',
    'UBaseType_t',
    'TaskHandle_t',
    'QueueHandle_t',
    'SemaphoreHandle_t',
    'EventGroupHandle_t',
    'TimerHandle_t',
    'portMUX_TYPE',
    'StaticTask_t',
    'StackType_t',
  ],
  additional: [
    'CoapPacket',
    'IPAddress',
    'WiFiUDP',
    'String',
  ],
  _typePattern: null,
  getTypePattern() {
    if (this._typePattern) return this._typePattern;
    const all = [
      ...this.primitives,
      ...this.fixedWidth,
      ...this.espIdf,
      ...(this.freertos || []),
      ...(this.additional || []),
    ];
    all.sort((a, b) => b.length - a.length);
    const escaped = all.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    this._typePattern = escaped.join('|');
    return this._typePattern;
  },
  getFullTypeRegex() {
    const typePat = this.getTypePattern();
    return new RegExp(
      `(?:const\\s+)?(?:unsigned\\s+)?(?:${typePat})\\s*\\*?\\s*`,
      'g'
    );
  },
};

const _typePat = CppTypes.getTypePattern();
console.log('Type pattern length:', _typePat.length);
console.log('First 200 chars:', _typePat.substring(0, 200));
console.log('Last 200 chars:', _typePat.substring(_typePat.length - 200));

// Test all the new RegExp() calls from the transpiler
const regexTests = [
  { name: 'Step 142', pat: `\\b(?:void|int|float|double|long|unsigned|unsigned\\s+long|unsigned\\s+int|unsigned\\s+char|byte|boolean|bool|char\\s*\\*?|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`, flags: 'g' },
  { name: 'Step 146', pat: `\\b(?:const\\s+)?(?:unsigned\\s+)?(?:${_typePat})\\s*[&*]?\\s*`, flags: 'g' },
  { name: 'Step 167', pat: `\\((?:unsigned\\s+char|unsigned\\s+long|unsigned\\s+int|unsigned\\s+short|unsigned|long\\s+long|long|int|short|byte|float|double)\\)\\s*(?=[a-zA-Z0-9_\\(])`, flags: 'g' },
  { name: 'Step 171', pat: `\\b(?:unsigned\\s+)?(?:${_typePat})\\s+(\\w+)(?=\\s*[=;,\\[\\)])`, flags: 'g' },
  { name: 'Step 181', pat: `\\bconst\\s+((?:unsigned\\s+)?(?:${_typePat}))\\s*\\*?\\s*`, flags: 'g' },
  { name: 'Step 228', pat: `\\bServo\\s+(\\w+)\\s*(?:\\(([^)]*)\\))?\\s*;`, flags: 'g' },
  { name: 'Step 444', pat: `\\bdelay\\b(?=\\s*\\()`, flags: 'g' },
  { name: 'Step 487', pat: `(?<!function\\s)(?<!await\\s)(?<![\\w.])\\bsetup\\s*\\(`, flags: 'g' },
  { name: 'Step 493', pat: `\\((?:${_typePat}|size_t)\\)\\s*`, flags: 'g' },
  { name: 'Step 497', pat: `\\*\\(\\s*(?:${_typePat}|size_t)\\s*\\*\\)\\s*(\\w+)`, flags: 'g' },
];

for (const test of regexTests) {
  try {
    new RegExp(test.pat, test.flags);
    console.log(`  OK: ${test.name}`);
  } catch (e) {
    console.log(`  FAIL: ${test.name} - ${e.message}`);
    console.log('    Pattern (first 200):', test.pat.substring(0, 200));
  }
}

// Also test fullTypeRegex source manipulation
try {
  const ft = CppTypes.getFullTypeRegex();
  const src = ft.source;
  const manipulated = src.replace(/^/, '(?:').replace(/$/, '').replace(/\(\?:const\\s\+\)/g, '(?:const\\s+)?').replace(/\(\?:unsigned\\s\+\)/g, '(?:unsigned\\s+)?');
  console.log('\nFullTypeRegex source manipulation OK');
} catch (e) {
  console.log('\nFullTypeRegex source manipulation FAIL:', e.message);
}
