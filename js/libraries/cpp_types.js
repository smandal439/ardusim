// js/libraries/cpp_types.js — Centralized C++ type definitions for the transpiler
//
// This file defines all C++ datatypes recognized by the simulator.
// It is used by the transpiler to:
//  1. Strip type declarations from variable declarations
//  2. Clean function parameter types
//  3. Provide type hints for the editor auto-complete
window.CppTypes = {
  // ── Primitive types ──
  primitives: [
    'void', 'bool', 'char', 'unsigned char', 'signed char',
    'int', 'unsigned int', 'signed int',
    'short', 'unsigned short', 'signed short',
    'long', 'unsigned long', 'signed long',
    'long long', 'unsigned long long',
    'float', 'double', 'long double',
    'byte', 'boolean',
  ],

  // ── Fixed-width integer types ──
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

  // ── Arduino/ESP32 specific types ──
  arduino: [
    'String',
    'Stream',
    'Print',
    'HardwareSerial',
    'TwoWire',
    'SPIClass',
    'Servo',
    'LiquidCrystal',
    'Adafruit_SSD1306',
    'Adafruit_ILI9341',
    'Adafruit_GFX',
    'Adafruit_NeoPixel',
    'Adafruit_VL53L0X',
    'Adafruit_BME280',
    'Adafruit_MPU6050',
    'DHT',
    'NewPing',
    'MFRC522',
    'TinyGPS',
    'SoftwareSerial',
    'PubSubClient',
    'WiFiClient',
    'CoapClient',
    'CoapServer',
    'CoapResponse',
    'CoapOption',
    'Coap',
    'CoapPacket',
    'IPAddress',
    'WiFiUDP',
    'Stepper',
    'esp_now_peer_info_t',
    'esp_now_send_status_t',
    'esp_now_recv_cb_t',
    'esp_now_send_cb_t',
    'i2s_config_t',
    'i2s_pin_config_t',
    'VL53L0X_RangingMeasurementData_t',
  ],

  // ── ESP-IDF types ──
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

  // ── Additional types recognized by the type pattern (for parameter/variable stripping) ──
  additional: [
    'CoapPacket',
    'IPAddress',
    'WiFiUDP',
    'String',
  ],

  // ── Constants that are also type-like ──
  constants: [
    'HIGH', 'LOW',
    'INPUT', 'OUTPUT', 'INPUT_PULLUP',
    'LED_BUILTIN',
    'A0', 'A1', 'A2', 'A3', 'A4', 'A5',
    'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13',
    'PI', 'HALF_PI', 'TWO_PI', 'DEG_TO_RAD', 'RAD_TO_deg',
    'CHANGE', 'FALLING', 'RISING',
    'LSBFIRST', 'MSBFIRST',
    'SPI_MODE0', 'SPI_MODE1', 'SPI_MODE2', 'SPI_MODE3',
    'WIFI_STA', 'WIFI_AP', 'WIFI_AP_STA',
    'WL_CONNECTED', 'WL_IDLE_STATUS', 'WL_NO_SSID_AVAIL', 'WL_SCAN_COMPLETED', 'WL_CONNECT_FAILED', 'WL_CONNECTION_LOST', 'WL_DISCONNECTED',
    'ESP_OK', 'ESP_FAIL', 'ESP_NOW_SEND_SUCCESS', 'ESP_NOW_SEND_FAIL', 'ESP_NOW_MAX_DATA_LEN',
    'COAP_GET', 'COAP_POST', 'COAP_PUT', 'COAP_DELETE',
    'COAP_OK', 'COAP_CREATED', 'COAP_DELETED', 'COAP_VALID', 'COAP_CHANGED', 'COAP_CONTENT',
    'COAP_BAD_REQUEST', 'COAP_UNAUTHORIZED', 'COAP_NOT_FOUND', 'COAP_METHOD_NOT_ALLOWED', 'COAP_INTERNAL_ERROR', 'COAP_SERVICE_UNAVAILABLE',
    'SSD1306_SWITCHCAPVCC', 'SSD1306_EXTERNALVCC', 'SSD1306_I2C_ADDRESS',
    'SSD1306_WHITE', 'SSD1306_BLACK',
    'ILI9341_BLACK', 'ILI9341_BLUE', 'ILI9341_RED', 'ILI9341_GREEN', 'ILI9341_WHITE',
    'NEO_GRB', 'NEO_KHZ800', 'NEO_KHZ400',
    'DHT11', 'DHT22', 'AM2302',
    'RFID效果图_13.56_MHZ',
    'PIEZO_HZ',
  ],

  // ── Build a regex-safe alternation of all type keywords ──
  _typePattern: null,
  getTypePattern() {
    if (this._typePattern) return this._typePattern;
    const all = [
      ...this.primitives,
      ...this.fixedWidth,
      ...this.espIdf,
      ...(this.additional || []),
    ];
    // Sort longest-first so 'unsigned int' matches before 'int'
    all.sort((a, b) => b.length - a.length);
    // Escape for regex
    const escaped = all.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    this._typePattern = escaped.join('|');
    return this._typePattern;
  },

  // ── Build a regex that matches: [const] [unsigned] Type [*] ──
  getFullTypeRegex() {
    const typePat = this.getTypePattern();
    return new RegExp(
      `(?:const\\s+)?(?:unsigned\\s+)?(?:${typePat})\\s*\\*?\\s*`,
      'g'
    );
  },

  // ── Build a regex for variable declarations: Type varname [= ...] ──
  getVarDeclRegex() {
    const typePat = this.getTypePattern();
    return new RegExp(
      `\\b(?:unsigned\\s+)?(?:${typePat})\\s+(\\w+)(?=\\s*[=;,\\[\\)])`,
      'g'
    );
  },

  // ── Check if a name is a known type ──
  isType(name) {
    const n = String(name).trim();
    return this.primitives.includes(n) ||
           this.fixedWidth.includes(n) ||
           this.arduino.includes(n) ||
           this.espIdf.includes(n);
  },
};
