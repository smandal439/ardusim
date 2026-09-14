// Test the exact transpiler flow for LoRa sender code
const fs = require('fs');
const src = fs.readFileSync('js/simulator.js', 'utf8');

// Extract the transpile function by loading it in a simulated env
// First, let's just manually trace the regex replacements

const code = `/*
 * LoRa Sender — Board 1
 * Sends a counter message every 2 seconds
 * Uses LoRa.h library with SX1276/RFM95W module
 */

#include <SPI.h>
#include <LoRa.h>

#define SS_PIN   10
#define RST_PIN  9
#define DIO0_PIN 2

int counter = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial);

  Serial.println("LoRa Sender Starting...");

  LoRa.setPins(SS_PIN, RST_PIN, DIO0_PIN);

  if (!LoRa.begin(868E6)) {
    Serial.println("LoRa init failed!");
    while (1);
  }

  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125000);
  LoRa.setCodingRate4(5);
  LoRa.setTxPower(14);
  LoRa.setSyncWord(0x12);
  LoRa.enableCrc();

  Serial.println("LoRa Sender ready!");
  Serial.println("---");
}

void loop() {
  counter++;

  Serial.print("Sending packet #");
  Serial.println(counter);

  LoRa.beginPacket();
  LoRa.print("Hello #");
  LoRa.print(counter);
  LoRa.endPacket();

  Serial.println("Packet sent!");
  Serial.println("---");

  delay(2000);
}`;

let js = code;

// Step 1: Handle #define macros
const defines = {};
js = js.replace(/^[ \t]*#define\s+(\w+)\s+(.+?)[ \t]*(?:\/\/.*)?$/gm, (_, name, value) => {
  defines[name] = value.trim();
  return `/* #define ${name} ${value} */`;
});
console.log("=== After step 1 (defines extracted) ===");
console.log(js.substring(0, 500));
console.log("Defines:", JSON.stringify(defines));

// Step 2: Remove other preprocessor directives
js = js.replace(/^[ \t]*#[^\n]*/gm, '');
console.log("\n=== After step 2 (preprocessor removed) ===");
console.log(js.substring(0, 500));

// Step 3: Apply #define substitutions
for (const [name, value] of Object.entries(defines)) {
  if (!/^[A-Za-z_]\w*$/.test(name)) continue;
  if (/^\w+\s*\(/.test(value)) continue;
  js = js.replace(new RegExp(`\\b${name}\\b`, 'g'), () => value);
}
console.log("\n=== After step 3 (define substitutions) ===");
console.log(js.substring(0, 500));

// Step 4: Replace function declarations
const userFnNames = new Set();
js = js.replace(/\bF\s*\(\s*("[^"]*"|'[^']*')\s*\)/g, '$1');

// Build type pattern - simplified version matching what CppTypes provides
const _typePat = 'unsigned long long|long long|unsigned long|signed long|long double|unsigned short|signed short|unsigned int|signed int|unsigned char|signed char|esp_now_peer_info_t|esp_now_send_status_t|esp_now_send_cb_t|esp_now_recv_cb_t|i2s_pin_config_t|i2s_comm_format_t|i2s_bits_per_sample_t|i2s_channel_fmt_t|i2s_mode_t|gpio_num_t|esp_err_t|EventGroupHandle_t|SemaphoreHandle_t|QueueHandle_t|TaskHandle_t|TickType_t|BaseType_t|UBaseType_t|TaskFunction_t|TimerHandle_t|StaticTask_t|StackType_t|portMUX_TYPE|int_least8_t|uint_least8_t|int_least16_t|uint_least16_t|int_least32_t|uint_least32_t|int_fast8_t|uint_fast8_t|int_fast16_t|uint_fast16_t|int_fast32_t|uint_fast32_t|ptrdiff_t|intptr_t|uintptr_t|int64_t|uint64_t|int32_t|uint32_t|int16_t|uint16_t|int8_t|uint8_t|size_t|ssize_t|unsigned|boolean|byte|double|float|short|signed|String|void|bool|char|long|int';

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

console.log("\n=== After step 4 (function declarations) ===");
console.log(js.substring(0, 600));
console.log("User function names:", [...userFnNames]);

// Step 4b: Plugin transpile rules (simulated)
// Serial plugin
const serialRules = [
  [/\bSerial\.begin\s*\(/g, '_a.serialBegin('],
  [/\bSerial\.print\s*\(/g, '_a.serialPrint('],
  [/\bSerial\.println\s*\(/g, '_a.serialPrintln('],
  [/\bSerial\.printf\s*\(/g, '_a.serialPrintf('],
  [/\bSerial\.read\s*\(/g, '_a.serialRead('],
  [/\bSerial\.available\s*\(/g, '_a.serialAvailable('],
  [/\bSerial\.write\s*\(/g, '_a.serialWrite('],
  [/\bSerial\.flush\s*\(/g, '_a.serialFlush('],
  [/\bSerial\.parseInt\s*\(/g, '_a.serialParseInt('],
  [/\bSerial\.parseFloat\s*\(/g, '_a.serialParseFloat('],
  [/\bSerial\.peek\s*\(/g, '_a.serialPeek('],
  [/while\s*\(\s*!Serial\s*\)\s*;/g, '/* while(!Serial) */'],
];

// LoRa plugin
const loraRules = [
  [/\bLoRa\.setPins\s*\([^)]*\)/g, '/* LoRa.setPins() - simulated */'],
  [/\bLoRa\.begin\s*\(\s*(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*\)/g, '_a.loraBegin($1)'],
  [/\bLoRa\.setSpreadingFactor\s*\(\s*(\d+)\s*\)/g, '_a.loraSetSpreadingFactor($1)'],
  [/\bLoRa\.setSignalBandwidth\s*\(\s*(\d+(?:\.\d+)?)\s*\)/g, '_a.loraSetBandwidth($1)'],
  [/\bLoRa\.setCodingRate4\s*\(\s*(\d+)\s*\)/g, '_a.loraSetCodingRate($1)'],
  [/\bLoRa\.setTxPower\s*\(\s*(\d+)\s*\)/g, '_a.loraSetTxPower($1)'],
  [/\bLoRa\.setPreambleLength\s*\(\s*(\d+)\s*\)/g, '_a.loraSetPreambleLength($1)'],
  [/\bLoRa\.setSyncWord\s*\(\s*(0[xX][0-9a-fA-F]+|\d+)\s*\)/g, '_a.loraSetSyncWord($1)'],
  [/\bLoRa\.enableCrc\s*\(\s*\)/g, '_a.loraEnableCrc()'],
  [/\bLoRa\.disableCrc\s*\(\s*\)/g, '_a.loraDisableCrc()'],
  [/\bLoRa\.enableInvertIQ\s*\(\s*\)/g, '_a.loraEnableInvertIQ()'],
  [/\bLoRa\.disableInvertIQ\s*\(\s*\)/g, '_a.loraDisableInvertIQ()'],
  [/\bLoRa\.beginPacket\s*\(\s*\)/g, '_a.loraBeginPacket()'],
  [/\bLoRa\.endPacket\s*\(\s*\)/g, '_a.loraEndPacket()'],
  [/\bLoRa\.write\s*\(([^)]+)\)/g, '_a.loraWrite($1)'],
  [/\bLoRa\.print\s*\(([^)]+)\)/g, '_a.loraPrint($1)'],
  [/\bLoRa\.println\s*\(([^)]+)\)/g, '_a.loraPrintln($1)'],
  [/\bLoRa\.parsePacket\s*\(\s*\)/g, '_a.loraParsePacket()'],
  [/\bLoRa\.available\s*\(\s*\)/g, '_a.loraAvailable()'],
  [/\bLoRa\.read\s*\(\s*\)/g, '_a.loraRead()'],
  [/\bLoRa\.packetRssi\s*\(\s*\)/g, '_a.loraPacketRssi()'],
  [/\bLoRa\.packetSnr\s*\(\s*\)/g, '_a.loraPacketSnr()'],
  [/\bLoRa\.packetFrequencyError\s*\(\s*\)/g, '_a.loraPacketFrequencyError()'],
  [/\bLoRa\.random\s*\(\s*\)/g, '_a.loraRandom()'],
  [/\bLoRa\.sleep\s*\(\s*\)/g, '_a.loraSleep()'],
  [/\bLoRa\.idle\s*\(\s*\)/g, '_a.loraIdle()'],
  [/\bLoRa\.end\s*\(\s*\)/g, '_a.loraEnd()'],
  [/\bLoRa\.dumpRegisters\s*\(\s*\)/g, '_a.loraDumpRegisters()'],
];

// Apply serial first (priority 1)
for (const [pattern, replacement] of serialRules) {
  js = js.replace(pattern, replacement);
}
console.log("\n=== After serial plugin ===");
console.log(js.substring(0, 600));

// Apply LoRa (priority 57)
for (const [pattern, replacement] of loraRules) {
  js = js.replace(pattern, replacement);
}
console.log("\n=== After LoRa plugin ===");
console.log(js.substring(0, 600));

// Step 5: Handle variable declarations
js = js.replace(new RegExp(`\\((?:unsigned\\s+char|unsigned\\s+long|unsigned\\s+int|unsigned\\s+short|unsigned|long\\s+long|long|int|short|byte|float|double)\\)\\s*(?=[a-zA-Z0-9_\\(])`, 'g'), '');
js = js.replace(/\bunsigned\s+char\s+(\w+)(?=\s*[=;,\[\)])/g, 'let $1');
js = js.replace(new RegExp(`\\b(?:unsigned\\s+)?(?:${_typePat})\\s+(\\w+)(?=\\s*[=;,\\[\\)])`, 'g'), 'let $1');
js = js.replace(/\bchar\s+(\w+)(?=\s*[=;,\[\)])/g, 'let $1');
js = js.replace(/\bunsigned\s+(\w+)(?=\s*[=;,\[\)])/g, 'let $1');
js = js.replace(/\bconst\s+let\b/g, 'let');
js = js.replace(/\bconst\s+var\b/g, 'var');
js = js.replace(/\bconst\s+async\b/g, 'async');
js = js.replace(new RegExp(`\\bconst\\s+((?:unsigned\\s+)?(?:${_typePat}))\\s*\\*?\\s*`, 'g'), '$1 ');
js = js.replace(/\bchar\s*\*\s+(\w+)\s*\[\s*\]\s*=\s*\{([^}]*)\}/g, 'var $1 = [$2]');

// Step 5b: pointer dereference
js = js.replace(/->/g, '.');
js = js.replace(/([,(]\s*)&(\w+)/g, '$1$2');
js = js.replace(/\bconst\s+let\b/g, 'let');
js = js.replace(/\bconst\s+var\b/g, 'var');

console.log("\n=== After variable declarations ===");
console.log(js.substring(0, 600));

// Step 8: delay → await
js = js.replace(/\bdelay\s*\(/g, 'await _a.delay(');

console.log("\n=== After delay async ===");
console.log(js);

// Now try to parse it
try {
  new Function(js);
  console.log("\n=== PARSE SUCCESS ===");
} catch(e) {
  console.log("\n=== PARSE ERROR ===");
  console.log(e.constructor.name + ": " + e.message);
}
