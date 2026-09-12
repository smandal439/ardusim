/* ═══════════════════════════════════════════════════════════════
   guide.js — Home page, Component Reference & Tutorials
   Enriched component descriptions, pin configurations, wiring
   examples and step-by-step guides for ArduSim.
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ── Pin type → human readable label ── */
const GUIDE_PIN_TYPE_LABELS = {
  digital: 'Digital',
  analog: 'Analog',
  power: 'Power',
  gnd: 'Ground',
  pwm: 'PWM',
  signal: 'Signal',
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT REFERENCE DATA
   Every entry documents one component: what it does, every pin,
   configurable properties, typical wiring and sample code.
   ═══════════════════════════════════════════════════════════════ */

const GUIDE_COMPONENTS = {
  /* ── BOARDS ── */
  arduino_uno: {
    id: 'arduino_uno',
    name: 'Arduino Uno R3',
    icon: '🎛️',
    category: 'Boards',
    grouped: true,
    longDesc: 'The Arduino Uno is the most popular Arduino board, powered by the ATmega328P 8-bit microcontroller running at 16 MHz. It exposes 14 digital I/O pins (6 with PWM), 6 analog inputs, and 5 V / 3.3 V power rails. Every ArduSim project starts here — the built-in "L" LED on pin 13 doubles as a debugging output.',
    use: 'The brain of your circuit. Connect output components (LEDs, buzzers, servos, displays) to its digital pins and read input components (buttons, sensors, potentiometers) from its digital or analog pins.',
    pins: {
      'D0–D13': { label: 'D0–D13', type: 'digital', desc: 'Digital I/O pins. D0 (RX) and D1 (TX) double as the serial port. PWM capable pins are D3, D5, D6, D9, D10 and D11.' },
      'D13': { label: 'D13', type: 'digital', desc: 'Also drives the built-in "L" LED (LED_BUILTIN).' },
      'A0–A5': { label: 'A0–A5', type: 'analog', desc: 'Analog input pins (10-bit, 0–1023). A4 (SDA) and A5 (SCL) also serve the I2C bus.' },
      '5V': { label: '5V', type: 'power', desc: '5 V regulated output for powering external components.' },
      '3V3': { label: '3.3V', type: 'power', desc: '3.3 V regulated output for low-voltage modules (OLED, ESP sensors).' },
      'VIN': { label: 'VIN', type: 'power', desc: 'Input voltage to the board (7–12 V via barrel jack).' },
      'GND': { label: 'GND', type: 'gnd', desc: 'Common ground — every component must share this reference.' },
      'AREF': { label: 'AREF', type: 'signal', desc: 'External analog reference voltage (advanced use).' },
      'RST': { label: 'RST', type: 'signal', desc: 'Reset line — pulling it low restarts the sketch.' },
    },
    props: { label: 'Board label shown on the canvas.' },
    wiring: 'Place the board, then wire every other component back to it: outputs to digital pins, sensors to analog pins, and always connect a GND rail.',
    code: `void setup() {
  pinMode(13, OUTPUT);   // built-in LED
  Serial.begin(9600);
}
void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}`,

    exampleId: 'blink',
  },

  esp32_devkit_v1: {
    id: 'esp32_devkit_v1',
    name: 'ESP32 DevKit V1',
    icon: '🔌',
    category: 'Boards',
    grouped: true,
    longDesc: 'The ESP32 DevKit V1 is a dual-core 240 MHz Wi-Fi + Bluetooth development board built around the ESP-WROOM-32 module. It works at 3.3 V logic and exposes 30 pins on two headers. GPIO2 drives the on-board blue LED (LED_BUILTIN). Great for connected / wireless projects.',
    use: 'A powerful alternative to the Uno. Use it for Wi-Fi, Bluetooth, dual-core code and projects that need more RAM. Many GPIOs support analog input and PWM output at the same time.',
    pins: {
      'VP / VN': { label: 'VP / VN', type: 'analog', desc: 'Analog inputs 36 and 39 — no internal pull-up.' },
      'D34 / D35': { label: 'D34 / D35', type: 'analog', desc: 'Analog input only (no output capability).' },
      'D32, D33': { label: 'D32 / D33', type: 'analog', desc: 'Analog + digital + DAC output.' },
      'D25, D26': { label: 'D25 / D26', type: 'analog', desc: 'Analog + digital + DAC output.' },
      'D27, D14': { label: 'D27 / D14', type: 'pwm', desc: 'Digital + PWM output.' },
      'D12, D13': { label: 'D12 / D13', type: 'pwm', desc: 'Digital + PWM output.' },
      'D23, D22': { label: 'D23 / D22', type: 'pwm', desc: 'Digital + PWM. D22 is the I2C clock (SCL).' },
      'D21': { label: 'D21', type: 'pwm', desc: 'Digital + PWM. Also the I2C data line (SDA).' },
      'D19, D18': { label: 'D19 / D18', type: 'pwm', desc: 'Digital + PWM output.' },
      'D5, D17': { label: 'D5 / D17', type: 'pwm', desc: 'Digital + PWM output.' },
      'D16, D4': { label: 'D16 / D4', type: 'pwm', desc: 'Digital + PWM output.' },
      'D2': { label: 'D2', type: 'pwm', desc: 'Digital + PWM. GPIO2 = LED_BUILTIN (on-board blue LED).' },
      'D15': { label: 'D15', type: 'pwm', desc: 'Digital + PWM output.' },
      'TX0 / RX0': { label: 'TX0 / RX0', type: 'signal', desc: 'Default UART serial pins (GPIO1 / GPIO3).' },
      'EN': { label: 'EN', type: 'signal', desc: 'Enable / reset pin.' },
      '3V3': { label: '3V3', type: 'power', desc: '3.3 V power rail.' },
      'VIN': { label: 'VIN', type: 'power', desc: '5 V USB / power input.' },
      'GND': { label: 'GND', type: 'gnd', desc: 'Common ground.' },
    },
    props: { label: 'Board label shown on the canvas.' },
    wiring: 'Place the board and wire outputs to GPIO pins, sensors to ADC-capable pins (VP/VN/D32–D35). Remember to power modules from 3V3, not 5V.',
    code: `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);  // GPIO2
  Serial.begin(115200);
}
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}`,
    exampleId: 'esp32_blink',
  },

  arduino_nano: {
    id: 'arduino_nano',
    name: 'Arduino Nano R3',
    icon: '🎛️',
    category: 'Boards',
    grouped: true,
    longDesc: 'Arduino Nano R3 is a compact, breadboard-friendly board based on the ATmega328P microcontroller. It offers the same functionality as the Arduino Uno R3 in a smaller form factor, ideal for space-constrained projects. The board runs at 16 MHz with 32 KB of Flash and 2 KB of RAM. Digital pin 13 controls the built-in LED.',
    use: 'Connect output components (LEDs, buzzers, displays) to digital pins and read input components (buttons, sensors, potentiometers) from analog pins. Perfect for compact projects that don\'t need the full size of an Uno.',
    pins: {
      'D0–D13': { label: 'D0–D13', type: 'digital', desc: 'Digital I/O pins. D0 (RX) and D1 (TX) double as the serial port. PWM capable pins are D3, D5, D6, D9, D10 and D11.' },
      'D13': { label: 'D13', type: 'digital', desc: 'Also drives the built-in "L" LED (LED_BUILTIN).' },
      'A0–A5': { label: 'A0–A5', type: 'analog', desc: 'Analog input pins (10-bit, 0–1023).' },
      '5V': { label: '5V', type: 'power', desc: '5 V regulated output for powering external components.' },
      '3V3': { label: '3.3V', type: 'power', desc: '3.3 V regulated output for low-voltage modules.' },
      'VIN': { label: 'VIN', type: 'power', desc: 'Input voltage to the board (7–12 V via barrel jack).' },
      'GND': { label: 'GND', type: 'gnd', desc: 'Common ground — every component must share this reference.' },
      'RST': { label: 'RST', type: 'signal', desc: 'Reset line — pulling it low restarts the sketch.' },
    },
    props: { label: 'Board label shown on the canvas.' },
    wiring: 'Place the board, then wire every other component back to it: outputs to digital pins, sensors to analog pins, and always connect a GND rail.',
    code: `void setup() {
  pinMode(13, OUTPUT);   // built-in LED
  Serial.begin(9600);
}
void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}`,
    exampleId: 'blink',
  },

  /* ── OUTPUTS ── */
  led: {
    id: 'led',
    name: 'LED',
    icon: '💡',
    category: 'Output',
    longDesc: 'A Light Emitting Diode that glows when current flows from the anode to the cathode. An LED has polarity — the longer leg is the anode (+). Always use a current-limiting resistor (typically 220 Ω) in series so the LED is not destroyed.',
    use: 'The universal "Hello World" output. Light an LED with digitalWrite(), fade it with analogWrite() on a PWM pin, or use it as an activity indicator.',
    pins: {
      anode: { label: '+', type: 'pwm', desc: 'Anode (long leg). Connect to a digital pin through a resistor. Accepts HIGH/LOW or PWM (0–255).' },
      cathode: { label: '−', type: 'gnd', desc: 'Cathode (short leg, flat side). Connect to GND.' },
    },
    props: {
      color: 'Hex colour of the LED body (e.g. #ff3333).',
      colorName: 'Human readable colour name.',
    },
    wiring: 'D13 → resistor → LED anode(+) ; LED cathode(−) → GND.',
    code: `void setup() {
  pinMode(13, OUTPUT);
}
void loop() {
  digitalWrite(13, HIGH);   // LED on
  delay(1000);
  digitalWrite(13, LOW);    // LED off
  delay(1000);
}`,
    exampleId: 'blink',
  },

  multi_led_array: {
    id: 'multi_led_array',
    name: 'Multi-Color LED Array',
    icon: '🚥',
    category: 'Output',
    longDesc: 'A compact module with four independent LEDs (Red, Yellow, Green, Blue) that share a single common ground. Each LED has its own drive pin, making traffic-light or status-panel circuits tidy and easy to wire.',
    use: 'Traffic lights, status indicators, sequencers. Drive each colour with its own digital pin or fade them individually with PWM.',
    pins: {
      led_r: { label: 'R', type: 'digital', desc: 'Red LED drive pin.' },
      led_y: { label: 'Y', type: 'digital', desc: 'Yellow LED drive pin.' },
      led_g: { label: 'G', type: 'digital', desc: 'Green LED drive pin.' },
      led_b: { label: 'B', type: 'digital', desc: 'Blue LED drive pin.' },
      gnd: { label: '−', type: 'gnd', desc: 'Common cathode — connect to GND.' },
    },
    props: {},
    wiring: 'R → D10, Y → D11, G → D12, B → D13 ; GND → GND.',
    code: `void setup() {
  for (int p = 10; p <= 13; p++) pinMode(p, OUTPUT);
}
void loop() {
  for (int p = 10; p <= 13; p++) {
    digitalWrite(p, HIGH);
    delay(300);
    digitalWrite(p, LOW);
  }
}`,
    exampleId: 'multi_colour_led_blink',
  },

  rgb_led: {
    id: 'rgb_led',
    name: 'RGB LED',
    icon: '🌈',
    category: 'Output',
    longDesc: 'A single LED package containing a red, green and blue die. By mixing the three channels with PWM you can produce almost any colour. This variant is a common-cathode LED — the shared pin goes to ground.',
    use: 'Full-colour lighting, mood lamps, colour-mixing demos. Each channel is driven from a PWM pin via analogWrite().',
    pins: {
      red: { label: 'R', type: 'pwm', desc: 'Red channel anode — PWM (0–255).' },
      green: { label: 'G', type: 'pwm', desc: 'Green channel anode — PWM (0–255).' },
      blue: { label: 'B', type: 'pwm', desc: 'Blue channel anode — PWM (0–255).' },
      gnd: { label: '−', type: 'gnd', desc: 'Common cathode — connect to GND.' },
    },
    props: {},
    wiring: 'R → D9, G → D10, B → D11 (PWM pins) ; GND → GND.',
    code: `void setup() {
  pinMode(9, OUTPUT); pinMode(10, OUTPUT); pinMode(11, OUTPUT);
}
void loop() {
  analogWrite(9, 255);  analogWrite(10, 0); analogWrite(11, 0);   // red
  delay(500);
  analogWrite(9, 0);    analogWrite(10, 255); analogWrite(11, 0); // green
  delay(500);
  analogWrite(9, 0);    analogWrite(10, 0); analogWrite(11, 255); // blue
  delay(500);
}`,
    exampleId: 'rainbow_rgb',
  },

  buzzer: {
    id: 'buzzer',
    name: 'Buzzer',
    icon: '🔔',
    category: 'Output',
    longDesc: 'A piezoelectric buzzer that converts an electrical signal into sound. The active variant beeps when it simply receives a HIGH level; the simulator also honours the tone() library so you can play melodies and frequencies.',
    use: 'Alarms, notifications, melodies. Drive it HIGH/LOW for a beep or use tone(pin, frequency) for musical tones.',
    pins: {
      vcc: { label: '+', type: 'digital', desc: 'Positive supply — connect to a digital pin (HIGH beeps).' },
      gnd: { label: '−', type: 'gnd', desc: 'Negative supply — connect to GND.' },
    },
    props: { frequency: 'Default tone frequency in Hz when driven by tone().' },
    wiring: 'D8 → buzzer(+) ; buzzer(−) → GND.',
    code: `void setup() {
  pinMode(8, OUTPUT);
}
void loop() {
  tone(8, 440);   // A4
  delay(300);
  noTone(8);
  delay(300);
}`,
    exampleId: 'buzzer_melody',
  },

  seg7: {
    id: 'seg7',
    name: '7-Segment Display',
    icon: '🔢',
    category: 'Output',
    longDesc: 'A single digit made from seven LED bars (a–g) plus a decimal point. Each segment is a separate LED; lighting the right combination shows any digit 0–9 or some letters. The common pin (COM) completes the circuit — set commonAnode false for a common-cathode module.',
    use: 'Numeric counters, clocks, scoreboards. Each segment maps to its own digital pin.',
    pins: {
      segA: { label: 'A', type: 'digital', desc: 'Top horizontal segment.' },
      segB: { label: 'B', type: 'digital', desc: 'Top-right vertical segment.' },
      segC: { label: 'C', type: 'digital', desc: 'Bottom-right vertical segment.' },
      segD: { label: 'D', type: 'digital', desc: 'Bottom horizontal segment.' },
      segE: { label: 'E', type: 'digital', desc: 'Bottom-left vertical segment.' },
      segF: { label: 'F', type: 'digital', desc: 'Top-left vertical segment.' },
      segG: { label: 'G', type: 'digital', desc: 'Middle horizontal segment.' },
      dp: { label: 'DP', type: 'digital', desc: 'Decimal point segment.' },
      com: { label: 'COM', type: 'power', desc: 'Common pin — connect to GND (common cathode) or 5V (common anode).' },
    },
    props: { commonAnode: 'true if the display is common-anode (COM to +5V).' },
    wiring: 'A→D2, B→D3, C→D4, D→D5, E→D6, F→D7, G→D8 ; COM → GND.',
    code: `// segment patterns for digits 0-9 (a,b,c,d,e,f,g)
byte digit[10] = { 0x3F,0x06,0x5B,0x4F,0x66,0x6D,0x7D,0x07,0x7F,0x6F };
byte pins[7] = {2,3,4,5,6,7,8};
int n = 0;
void setup(){ for(int i=0;i<7;i++) pinMode(pins[i],OUTPUT); }
void loop(){
  byte mask = digit[n % 10];
  for(int i=0;i<7;i++) digitalWrite(pins[i], (mask>>i)&1);
  n++; delay(1000);
}`,
    exampleId: 'seg7_counter',
  },

  lcd1602: {
    id: 'lcd1602',
    name: 'LCD 16×2',
    icon: '🖥️',
    category: 'Output',
    longDesc: 'A classic 16-column × 2-row character LCD driven by the Hitachi HD44780 controller. Used through the LiquidCrystal library, it needs 6 control/data lines (RS, EN, D4–D7) plus power. Perfect for text, sensor readouts and simple menus.',
    use: 'Displaying text and numeric values. The parallel version uses more pins; for a wiring-light option use the I2C version instead.',
    pins: {
      gnd: { label: 'GND', type: 'gnd', desc: 'Ground.' },
      vcc: { label: 'VCC', type: 'power', desc: '5 V power.' },
      vo: { label: 'V0', type: 'signal', desc: 'Contrast control (usually a potentiometer).' },
      rs: { label: 'RS', type: 'digital', desc: 'Register select — command vs. data.' },
      rw: { label: 'R/W', type: 'digital', desc: 'Read/Write — tie to GND for write-only.' },
      en: { label: 'EN', type: 'digital', desc: 'Enable pulse — latches the data.' },
      d4: { label: 'D4', type: 'digital', desc: 'Data line 4 (4-bit mode).' },
      d5: { label: 'D5', type: 'digital', desc: 'Data line 5 (4-bit mode).' },
      d6: { label: 'D6', type: 'digital', desc: 'Data line 6 (4-bit mode).' },
      d7: { label: 'D7', type: 'digital', desc: 'Data line 7 (4-bit mode).' },
    },
    props: {
      line1: 'Default text on the first row.',
      line2: 'Default text on the second row.',
    },
    wiring: 'VCC→5V, GND→GND, RS→D12, EN→D11, D4→D5, D5→D4, D6→D3, D7→D2.',
    code: `#include <LiquidCrystal.h>
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
void setup(){
  lcd.begin(16, 2);
  lcd.print("Hello, ArduSim!");
}
void loop(){
  lcd.setCursor(0, 1);
  lcd.print(millis()/1000);
  delay(100);
}`,
    exampleId: 'lcd_hello_world',
  },

  lcd1602_i2c: {
    id: 'lcd1602_i2c',
    name: 'LCD 16×2 (I2C)',
    icon: '🖥️',
    category: 'Output',
    longDesc: 'The same 16×2 character LCD but with a PCF8574 I2C backpack — only four wires are needed (GND, VCC, SDA, SCL) and the default address is 0x27. Use the LiquidCrystal_I2C library.',
    use: 'Text and data displays with minimal wiring — ideal when pins are scarce. Uses A4 (SDA) and A5 (SCL) on the Uno.',
    pins: {
      gnd: { label: 'GND', type: 'gnd', desc: 'Ground.' },
      vcc: { label: 'VCC', type: 'power', desc: '5 V power.' },
      sda: { label: 'SDA', type: 'digital', desc: 'I2C data line — connect to A4 (Uno) / D21 (ESP32).' },
      scl: { label: 'SCL', type: 'digital', desc: 'I2C clock line — connect to A5 (Uno) / D22 (ESP32).' },
    },
    props: {
      address: 'I2C address of the backpack (default 0x27).',
      line1: 'Default text on the first row.',
      line2: 'Default text on the second row.',
    },
    wiring: 'VCC→5V, GND→GND, SDA→A4, SCL→A5.',
    code: `#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(0x27, 16, 2);
void setup(){
  lcd.init();
  lcd.backlight();
  lcd.print("Hello, I2C!");
}
void loop(){
  lcd.setCursor(0, 1);
  lcd.print(millis()/1000);
  delay(100);
}`,
    exampleId: 'lcd_i2c',
  },

  oled_ssd1306: {
    id: 'oled_ssd1306',
    name: 'OLED 128×64 (I2C)',
    icon: '🖥️',
    category: 'Output',
    longDesc: 'A 128×64 monochrome OLED screen driven by the SSD1306 controller over I2C. Sharp, fast and low-power. Driven with the Adafruit_SSD1306 + Adafruit_GFX libraries, it can render text, lines, circles, rectangles and even pixel art.',
    use: 'Dashboards, graphs, small UI screens. Only four wires (GND, VCC, SCL, SDA); works at both 3.3 V and 5 V with the Uno at address 0x3C.',
    pins: {
      gnd: { label: 'GND', type: 'gnd', desc: 'Ground.' },
      vcc: { label: 'VCC', type: 'power', desc: '3.3 V / 5 V power.' },
      scl: { label: 'SCL', type: 'digital', desc: 'I2C clock — connect to A5 (Uno) / D22 (ESP32).' },
      sda: { label: 'SDA', type: 'digital', desc: 'I2C data — connect to A4 (Uno) / D21 (ESP32).' },
    },
    props: { address: 'I2C address of the display (default 0x3C).' },
    wiring: 'VCC→5V, GND→GND, SDA→A4, SCL→A5.',
    code: `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#define OLED_W 128
#define OLED_H 64
Adafruit_SSD1306 display(OLED_W, OLED_H, &Wire, -1);
void setup(){
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.println("Hello OLED!");
  display.display();
}
void loop(){}`,
    exampleId: 'oled_ssd1306',
  },

  /* ── INPUTS ── */
  push_button: {
    id: 'push_button',
    name: 'Push Button',
    icon: '🔘',
    category: 'Input',
    longDesc: 'A momentary tactile switch. The four legs form two internally-connected pairs — pressing the cap joins the pairs so current can flow. Read it with digitalRead() and an INPUT_PULLUP so the pin reads HIGH when released and LOW when pressed. Works standalone with ICs (no Arduino needed) — the simulator traces through the switch to find the voltage source on the other side.',
    use: 'User input — buttons, doorbells, triggers. Wire one side to a digital pin (with internal pull-up) and the other to GND. Toggle it by clicking on the canvas or pressing Space/Enter when selected.',
    pins: {
      p1: { label: '1', type: 'digital', desc: 'Leg 1 — one side of the switch contact.' },
      p2: { label: '2', type: 'digital', desc: 'Leg 2 — internally connected to leg 1.' },
      p3: { label: '3', type: 'digital', desc: 'Leg 3 — the other side of the switch contact.' },
      p4: { label: '4', type: 'digital', desc: 'Leg 4 — internally connected to leg 3.' },
    },
    props: {
      pressed: 'Simulated pressed state when toggled in the canvas.',
      label: 'Button label shown on the canvas.',
    },
    wiring: 'D2 → pin 1, pin 3 → GND. Enable INPUT_PULLUP in code.',
    code: `void setup(){
  pinMode(2, INPUT_PULLUP);
  Serial.begin(9600);
}
void loop(){
  if (digitalRead(2) == LOW) Serial.println("Pressed");
  delay(50);
}`,
    exampleId: 'button',
  },

  potentiometer: {
    id: 'potentiometer',
    name: 'Potentiometer',
    icon: '🎚️',
    category: 'Input',
    longDesc: 'A 10 kΩ variable resistor (rotary knob). The wiper picks a voltage between VCC and GND, giving a smooth 0–1023 analog value. In the simulator, drag the knob (or use the property panel) to change the value while the simulation runs. Works standalone with ICs (no Arduino needed) — the wiper output can drive other IC inputs directly.',
    use: 'Volume controls, brightness dimmers, position sensors. Connect the wiper to an analog input and read with analogRead().',
    pins: {
      vcc: { label: 'VCC', type: 'power', desc: 'Connect to 5 V (or 3.3 V).' },
      wiper: { label: 'OUT', type: 'analog', desc: 'Variable output — connect to an analog input (A0–A5).' },
      gnd: { label: 'GND', type: 'gnd', desc: 'Connect to GND.' },
    },
    props: {
      value: 'Current wiper position (0–1023).',
      maxValue: 'Full-scale value (default 1023).',
      resistance: 'Resistance in ohms (default 10000).',
    },
    wiring: 'VCC→5V, OUT→A0, GND→GND.',
    code: `void setup(){
  Serial.begin(9600);
}
void loop(){
  int v = analogRead(A0);
  Serial.println(v);
  delay(50);
}`,
    exampleId: 'potentiometer',
  },

  joystick: {
    id: 'joystick',
    name: 'Joystick Module',
    icon: '🕹️',
    category: 'Input',
    longDesc: 'A two-axis analog joystick with a push button (SW). Each axis is a pair of potentiometers giving a 0–1023 value (roughly 512 at centre), and the button reads as a digital input (LOW when pressed).',
    use: 'Game controllers, robotics, menu navigation. Read X and Y on two analog pins and the button on a digital pin.',
    pins: {
      gnd: { label: 'GND', type: 'gnd', desc: 'Ground.' },
      vcc: { label: 'VCC', type: 'power', desc: '5 V power.' },
      x: { label: 'X', type: 'analog', desc: 'X-axis analog output — connect to A0.' },
      y: { label: 'Y', type: 'analog', desc: 'Y-axis analog output — connect to A1.' },
      sw: { label: 'SW', type: 'digital', desc: 'Push button output (LOW when pressed).' },
    },
    props: {
      x: 'X-axis position (0–1023).',
      y: 'Y-axis position (0–1023).',
      sw: 'Button state (0 = released, 1 = pressed).',
    },
    wiring: 'VCC→5V, GND→GND, X→A0, Y→A1, SW→D2.',
    code: `void setup(){
  pinMode(2, INPUT_PULLUP);
  Serial.begin(9600);
}
void loop(){
  Serial.print("X="); Serial.print(analogRead(A0));
  Serial.print(" Y="); Serial.print(analogRead(A1));
  Serial.print(" SW="); Serial.println(digitalRead(2));
  delay(50);
}`,
    exampleId: 'joystick_led',
  },

  keypad: {
    id: 'keypad',
    name: '4\u00d74 Matrix Keypad',
    icon: '\u2328\ufe0f',
    category: 'Input',
    longDesc: 'A 16-button matrix keypad organized into 4 rows and 4 columns. Pressing a key creates a contact between its row and column lines, allowing 16 inputs using only 8 digital pins.',
    use: 'PIN/passcode entry, menu navigation, numerical input panels. Driven using the Arduino Keypad library.',
    pins: {
      r1: { label: 'R1', type: 'digital', desc: 'Row 1 output/input scan pin.' },
      r2: { label: 'R2', type: 'digital', desc: 'Row 2 output/input scan pin.' },
      r3: { label: 'R3', type: 'digital', desc: 'Row 3 output/input scan pin.' },
      r4: { label: 'R4', type: 'digital', desc: 'Row 4 output/input scan pin.' },
      c1: { label: 'C1', type: 'digital', desc: 'Column 1 scan pin.' },
      c2: { label: 'C2', type: 'digital', desc: 'Column 2 scan pin.' },
      c3: { label: 'C3', type: 'digital', desc: 'Column 3 scan pin.' },
      c4: { label: 'C4', type: 'digital', desc: 'Column 4 scan pin.' },
    },
    props: {
      activeKey: 'Active key coordinate state { row, col } when pressed.',
    },
    wiring: 'R1\u2013R4 \u2192 D9\u2013D6, C1\u2013C4 \u2192 D5\u2013D2.',
    code: `#include <Keypad.h>

const byte ROWS = 4;
const byte COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {9, 8, 7, 6};
byte colPins[COLS] = {5, 4, 3, 2};

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

void setup() {
  Serial.begin(9600);
}

void loop() {
  char key = keypad.getKey();
  if (key) {
    Serial.print("Key Pressed: ");
    Serial.println(key);
  }
}`,
    exampleId: 'keypad_interfacing',
  },

  /* ── ACTUATORS ── */
  servo: {
    id: 'servo',
    name: 'Servo Motor',
    icon: '⚙️',
    category: 'Actuators',
    longDesc: 'An RC servo motor that rotates to a precise angle between 0° and 180°. Driven by a 50 Hz PWM signal whose pulse width encodes the target angle — the Servo library does this for you with servo.write(angle).',
    use: 'Robotics, pan/tilt heads, gauges, automation. One signal wire + power and ground is all it needs.',
    pins: {
      signal: { label: 'SIG', type: 'pwm', desc: 'Control signal — connect to a PWM-capable pin (D9/D10 on Uno).' },
      vcc: { label: '+', type: 'power', desc: 'Power — 5 V.' },
      gnd: { label: '−', type: 'gnd', desc: 'Ground.' },
    },
    props: {
      angle: 'Target angle (0–180°).',
      minAngle: 'Minimum angle (default 0).',
      maxAngle: 'Maximum angle (default 180).',
    },
    wiring: 'SIG→D9, +→5V, −→GND.',
    code: `#include <Servo.h>
Servo s;
void setup(){ s.attach(9); }
void loop(){
  for (int a = 0; a <= 180; a++) { s.write(a); delay(10); }
  for (int a = 180; a >= 0; a--) { s.write(a); delay(10); }
}`,
    exampleId: 'servo_sweep',
  },

  dc_motor: {
    id: 'dc_motor',
    name: 'DC Motor',
    icon: '🌀',
    category: 'Actuators',
    longDesc: 'A brushed DC motor whose speed follows the PWM duty cycle applied to its input pin — 0 stops it, 255 is full speed. The shaft and fan spin proportionally to the PWM value so you can see speed at a glance.',
    use: 'Fans, wheels, pumps. Drive it from a PWM pin; pair with a transistor or motor driver in real hardware to handle the current.',
    pins: {
      in: { label: 'IN', type: 'pwm', desc: 'Speed input — PWM (0–255).' },
      gnd: { label: 'GND', type: 'gnd', desc: 'Ground.' },
    },
    props: { label: 'Motor label shown on the canvas.' },
    wiring: 'IN→D9 (PWM), GND→GND.',
    code: `void setup(){
  pinMode(9, OUTPUT);
}
void loop(){
  for (int s = 0; s <= 255; s++) { analogWrite(9, s); delay(10); }
  for (int s = 255; s >= 0; s--) { analogWrite(9, s); delay(10); }
}`,
    exampleId: 'dc_motor_speed',
  },

  relay: {
    id: 'relay',
    name: 'Relay Module',
    icon: '⚡',
    category: 'Actuators',
    longDesc: 'An electromagnetic relay module. A LOW/HIGH control signal on the input pin energises the coil and throws a switch between the Common (COM), Normally-Open (NO) and Normally-Closed (NC) terminals. Use it to switch higher-voltage loads safely.',
    use: 'Switching lamps, fans and other mains or high-current devices from a low-current logic pin. The status LED shows the relay state.',
    pins: {
      vcc: { label: 'VCC', type: 'power', desc: 'Module power — 5 V.' },
      gnd: { label: 'GND', type: 'gnd', desc: 'Ground.' },
      sig: { label: 'IN', type: 'digital', desc: 'Control signal — drives the coil.' },
      com: { label: 'COM', type: 'signal', desc: 'Common contact of the switched circuit.' },
      no: { label: 'NO', type: 'signal', desc: 'Normally-open contact — connects to COM when energised.' },
      nc: { label: 'NC', type: 'signal', desc: 'Normally-closed contact — connected to COM when idle.' },
    },
    props: { label: 'Relay label shown on the canvas.' },
    wiring: 'VCC→5V, GND→GND, IN→D9, 5V→COM, NO→LED anode.',
    code: `void setup(){
  pinMode(9, OUTPUT);
}
void loop(){
  digitalWrite(9, HIGH);   // relay on, COM→NO
  delay(1000);
  digitalWrite(9, LOW);    // relay off, COM→NC
  delay(1000);
}`,
    exampleId: 'relay_control',
  },

  /* ── SENSORS ── */
  dht11: {
    id: 'dht11',
    name: 'DHT11 Sensor',
    icon: '🌡️',
    category: 'Sensors',
    longDesc: 'A digital temperature and humidity sensor. It reports 0–50 °C temperature and 20–90 % relative humidity over a single data wire using a custom one-wire protocol (the DHT library handles it). Adjust the simulated values live from the property panel.',
    use: 'Weather stations, greenhouses, climate logging. Read temperature and humidity with the DHT library and print them to the Serial Monitor.',
    pins: {
      vcc: { label: 'VCC', type: 'power', desc: '3.3 V / 5 V power.' },
      data: { label: 'DAT', type: 'digital', desc: 'One-wire data signal — connect to a digital pin.' },
      nc: { label: 'NC', type: 'signal', desc: 'Not connected.' },
      gnd: { label: 'GND', type: 'gnd', desc: 'Ground.' },
    },
    props: {
      temperature: 'Simulated temperature in °C (0–50).',
      humidity: 'Simulated relative humidity in % (20–90).',
    },
    wiring: 'VCC→5V, DAT→D2, GND→GND.',
    code: `#include <DHT.h>
DHT dht(2, DHT11);
void setup(){
  Serial.begin(9600);
  dht.begin();
}
void loop(){
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  Serial.print("Temp: "); Serial.print(t); Serial.print(" C, ");
  Serial.print("Hum: "); Serial.println(h);
  delay(2000);
}`,
    exampleId: 'temperature',
  },

  hcsr04: {
    id: 'hcsr04',
    name: 'HC-SR04 Ultrasonic',
    icon: '📡',
    category: 'Sensors',
    longDesc: 'An ultrasonic distance sensor that measures 2–400 cm. Send a 10 µs HIGH pulse on TRIG; the ECHO pin then stays HIGH for a duration proportional to the distance. Distance (cm) = echoTime(µs) / 58.',
    use: 'Obstacle avoidance, parking sensors, tank level gauges. Set the simulated distance from the property panel and read it with pulseIn().',
    pins: {
      vcc: { label: 'VCC', type: 'power', desc: '5 V power.' },
      trig: { label: 'TRIG', type: 'digital', desc: 'Trigger — send a 10 µs HIGH pulse to start a measurement.' },
      echo: { label: 'ECHO', type: 'digital', desc: 'Echo — returns HIGH for the flight time of the ping.' },
      gnd: { label: 'GND', type: 'gnd', desc: 'Ground.' },
    },
    props: { distance: 'Simulated object distance in cm (2–400).' },
    wiring: 'VCC→5V, TRIG→D7, ECHO→D8, GND→GND.',
    code: `void setup(){
  pinMode(7, OUTPUT); pinMode(8, INPUT);
  Serial.begin(9600);
}
void loop(){
  digitalWrite(7, LOW);  delayMicroseconds(2);
  digitalWrite(7, HIGH); delayMicroseconds(10);
  digitalWrite(7, LOW);
  long t = pulseIn(8, HIGH);
  float cm = t / 58.0;
  Serial.print(cm); Serial.println(" cm");
  delay(200);
}`,
    exampleId: 'ultrasonic',
  },

  ldr: {
    id: 'ldr',
    name: 'LDR Photoresistor',
    icon: '💡',
    category: 'Sensors',
    longDesc: 'A light-dependent resistor whose resistance falls as light increases. Wired as a voltage divider it produces a 0–1023 analog value — low in bright light, high in darkness. Change the light level live from the property panel.',
    use: 'Automatic night lights, light meters, camera exposure. Read the light level on an analog pin.',
    pins: {
      vcc: { label: 'VCC', type: 'power', desc: '5 V power.' },
      a: { label: 'A', type: 'analog', desc: 'Analog output (0–1023) — connect to A0.' },
      gnd: { label: 'GND', type: 'gnd', desc: 'Ground.' },
    },
    props: { light: 'Simulated light level (0–1023, higher = brighter).' },
    wiring: 'VCC→5V, A→A0, GND→GND.',
    code: `void setup(){
  Serial.begin(9600);
}
void loop(){
  int light = analogRead(A0);
  Serial.print("Light: "); Serial.println(light);
  if (light < 300) Serial.println("Dark!");
  delay(200);
}`,
    exampleId: 'ldr_lamp',
  },

  pir: {
    id: 'pir',
    name: 'PIR Motion Sensor',
    icon: '🚶',
    category: 'Sensors',
    longDesc: 'A passive infrared motion sensor. When movement is detected inside its field of view, the OUT pin goes HIGH and its LED lights. Toggle the simulated motion in the property panel to trigger it.',
    use: 'Security alarms, automatic lights, presence detection. Read OUT with digitalRead().',
    pins: {
      vcc: { label: 'VCC', type: 'power', desc: '5 V power.' },
      out: { label: 'OUT', type: 'digital', desc: 'Motion output — HIGH while motion is detected.' },
      gnd: { label: 'GND', type: 'gnd', desc: 'Ground.' },
    },
    props: { motion: 'Simulated motion (0 = idle, 1 = motion detected).' },
    wiring: 'VCC→5V, OUT→D2, GND→GND.',
    code: `void setup(){
  pinMode(2, INPUT);
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}
void loop(){
  int m = digitalRead(2);
  digitalWrite(13, m);
  if (m) Serial.println("Motion detected!");
  delay(100);
}`,
    exampleId: 'pir_alarm',
  },

  lm35: {
    id: 'lm35',
    name: 'LM35 Temperature Sensor',
    icon: '🌡️',
    category: 'Sensors',
    longDesc: 'A precision analog centigrade temperature sensor. Output voltage is linearly proportional to Celsius temperature at 10 mV/\u00b0C, eliminating the need for complex calibration code.',
    use: 'Measuring ambient temperature. Read the output pin with analogRead() and scale the voltage value to calculate degrees Celsius.',
    pins: {
      vcc: { label: 'VCC', type: 'power', desc: 'Power supply \u2014 5 V.' },
      out: { label: 'OUT', type: 'analog', desc: 'Analog voltage output (10 mV/\u00b0C) \u2014 connect to A0\u2013A5.' },
      gnd: { label: 'GND', type: 'gnd', desc: 'Ground.' },
    },
    props: {
      temp: 'Simulated ambient temperature in \u00b0C (default 25\u00b0C).',
    },
    wiring: 'VCC\u21925V, OUT\u2192A0, GND\u2192GND.',
    code: `void setup() {
  Serial.begin(9600);
}
void loop() {
  int adcVal = analogRead(A0);
  float voltage = adcVal * (5.0 / 1023.0);
  float tempC = voltage * 100.0; // 10 mV per \u00b0C
  Serial.print("Temperature: ");
  Serial.print(tempC);
  Serial.println(" C");
  delay(1000);
}`,
    exampleId: 'lm35_temperature',
  },

  /* ── PASSIVES ── */
  resistor: {
    id: 'resistor',
    name: 'Resistor',
    icon: '⬛',
    category: 'Passive',
    longDesc: 'A two-terminal component that limits current. Its value in ohms is shown by the colour bands and adjustable in the property panel. A 220 Ω resistor in series with an LED is the classic current limiter.',
    use: 'Current limiting for LEDs, voltage dividers with sensors, pull-up/pull-down resistors for buttons.',
    pins: {
      p1: { label: '1', type: 'signal', desc: 'Terminal 1 (non-polarised).' },
      p2: { label: '2', type: 'signal', desc: 'Terminal 2 (non-polarised).' },
    },
    props: { value: 'Resistance in ohms (e.g. 220, 10000).' },
    wiring: 'In series anywhere in a circuit — polarity does not matter.',
    code: `// A resistor is a passive component; it needs no code.
// Example: LED anode -> resistor -> 5V limits LED current.`,
  },

  capacitor: {
    id: 'capacitor',
    name: 'Capacitor',
    icon: '⚡',
    category: 'Passive',
    longDesc: 'An electrolytic capacitor that stores charge. The positive (+) lead is the longer leg; observe polarity when wiring. Capacitors smooth power rails, hold state in timing circuits and block DC.',
    use: 'Decoupling/smoothing power supplies, RC timing, energy storage.',
    pins: {
      pos: { label: '+', type: 'signal', desc: 'Positive terminal (polarised).' },
      neg: { label: '−', type: 'gnd', desc: 'Negative terminal.' },
    },
    props: { value: 'Capacitance in µF (e.g. 100).' },
    wiring: 'Across the power rails: + to 5V and − to GND to smooth noise.',
    code: `// Capacitors are passive components and need no code.`,
  },

  breadboard: {
    id: 'breadboard',
    name: 'Breadboard',
    icon: '🟦',
    category: 'Passive',
    longDesc: 'A solderless prototyping board. The two long power rails on the edges carry + and − along the whole strip; the middle rows connect holes vertically. Use it to build neat, expandable circuits.',
    use: 'Breadboarding temporary circuits — connect power rails to the Arduino and plug LEDs, buttons and sensors into the middle rows.',
    pins: {},
    props: {},
    wiring: 'Wire the + rail to 5V and the − rail to GND, then build your circuit in the middle rows.',
    code: `// Breadboards are passive; they only route connections.`,
  },

  /* ── POWER ── */
  power_5v: {
    id: 'power_5v',
    name: '5V Power',
    icon: '⚡',
    category: 'Power',
    longDesc: 'A standalone 5 V supply terminal. Useful for breadboard power rails or for powering a sub-circuit independently of the board.',
    use: 'Provide a fixed 5 V rail anywhere on the canvas.',
    pins: {
      vcc: { label: '5V', type: 'power', desc: '5 V output terminal.' },
    },
    props: {},
    wiring: 'Connect the 5V terminal to whatever needs power (e.g. a breadboard + rail).',
    code: `// Power supplies need no code.`,
  },

  power_gnd: {
    id: 'power_gnd',
    name: 'GND',
    icon: '⏚',
    category: 'Power',
    longDesc: 'A standalone ground terminal. Every circuit needs a common ground reference — use this to give your components a clean ground rail.',
    use: 'Provide a ground rail anywhere on the canvas.',
    pins: {
      gnd: { label: 'GND', type: 'gnd', desc: 'Ground terminal.' },
    },
    props: {},
    wiring: 'Connect the GND terminal to the ground rail of your circuit.',
    code: `// Ground rails need no code.`,
  },

  /* ── INSTRUMENTS ── */
  multimeter: {
    id: 'multimeter',
    name: 'Digital Multimeter',
    icon: '🔧',
    category: 'Instruments',
    longDesc: 'A digital multimeter that measures DC/AC voltage, resistance, continuity, and DC current between two probe points. Select the mode from the properties panel — the LCD display updates live during simulation.',
    use: 'Measuring voltage across components, resistance of resistors, continuity of wires, and current through a series circuit. Place in parallel for voltage, in series for current.',
    pins: {
      probe_red: { label: 'V+', type: 'signal', desc: 'Red probe — positive measurement terminal.' },
      probe_com: { label: 'COM', type: 'gnd', desc: 'Black probe — common / ground terminal.' },
    },
    props: {
      mode: 'Measurement mode: V_DC (DC Voltage), V_AC (AC Voltage), A_DC (DC Current), RES (Resistance), CONT (Continuity).',
    },
    wiring: 'For voltage: connect V+ and COM in parallel across the component. For current: break the circuit and insert the DMM in series.',
    code: `// The multimeter is a measuring instrument — no Arduino code needed.`,
    exampleId: 'dmm_voltage',
  },

  func_gen: {
    id: 'func_gen',
    name: 'Function Generator',
    icon: '〜',
    category: 'Instruments',
    longDesc: 'A dual-channel DDS function generator that outputs sine, square, triangle, sawtooth, and noise waveforms. Each channel has independent frequency, amplitude, DC offset, phase, and duty cycle controls. The scope display shows live waveforms during simulation.',
    use: 'Signal source for testing circuits — drive LEDs, buzzers, servos, or logic circuits with configurable waveforms. CH1 and CH2 outputs are independent voltage sources.',
    pins: {
      ch1_out: { label: 'CH1', type: 'signal', desc: 'Channel 1 signal output.' },
      ch1_gnd: { label: 'GND1', type: 'gnd', desc: 'Channel 1 ground.' },
      ch2_out: { label: 'CH2', type: 'signal', desc: 'Channel 2 signal output.' },
      ch2_gnd: { label: 'GND2', type: 'gnd', desc: 'Channel 2 ground.' },
    },
    props: {
      ch1_wave: 'CH1 waveform: sine, square, triangle, sawtooth, noise.',
      ch1_freq: 'CH1 frequency in Hz (10–3000).',
      ch1_amp: 'CH1 peak-to-peak amplitude in volts (0.1–10).',
      ch1_offset: 'CH1 DC offset in volts (-5 to +5).',
      ch1_phase: 'CH1 phase in degrees (0–360).',
      ch1_duty: 'CH1 duty cycle in percent (5–95).',
      ch2_wave: 'CH2 waveform: sine, square, triangle, sawtooth, noise.',
      ch2_freq: 'CH2 frequency in Hz (10–3000).',
      ch2_amp: 'CH2 peak-to-peak amplitude in volts (0.1–10).',
      ch2_offset: 'CH2 DC offset in volts (-5 to +5).',
      ch2_phase: 'CH2 phase in degrees (0–360).',
      ch2_duty: 'CH2 duty cycle in percent (5–95).',
    },
    wiring: 'Connect CH1 or CH2 output to your circuit input. Connect the corresponding GND to the circuit ground.',
    code: `// The function generator is a signal source — no Arduino code needed.`,
    exampleId: 'func_gen_led',
  },

  /* ── NEOPIXEL EXTENSIONS ── */
  neopixel_strip: {
    id: 'neopixel_strip',
    name: 'NeoPixel Strip (8 LED)',
    icon: '🌈',
    category: 'Output',
    longDesc: 'An 8-pixel WS2812B addressable LED strip. Each pixel can be set to any RGB colour independently via a single data pin. The strip has DIN (data in) and DOUT (data out) so multiple strips can be daisy-chained.',
    use: 'Creating colour-cycling animations, status indicators, or ambient lighting effects driven from a single Arduino digital pin.',
    pins: {
      VCC: { label: 'VCC', type: 'power', desc: '5 V power supply.' },
      DIN: { label: 'DIN', type: 'digital', desc: 'Data input — connect to an Arduino digital pin (e.g. D6).' },
      GND: { label: 'GND', type: 'gnd', desc: 'Common ground.' },
      DOUT: { label: 'DOut', type: 'digital', desc: 'Data output — chain to the DIN of the next strip.' },
    },
    props: {
      numPixels: 'Number of pixels (default 8).',
      brightness: 'Global brightness 0–255.',
    },
    wiring: 'VCC → 5 V, GND → GND, DIN → Arduino D6 (or any digital pin). Use a 330–470 Ω resistor on the data line and a 1000 µF capacitor across VCC/GND for best results.',
    code: `#include <Adafruit_NeoPixel.h>

#define PIN        6
#define NUM_LEDS   8

Adafruit_NeoPixel strip(NUM_LEDS, PIN, NEO_GRB + NEO_KHZ800);

void setup() {
  strip.begin();
  strip.setBrightness(128);
  strip.show();
}

void loop() {
  for (int i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(255, 0, 0));  // red
    strip.show();
    delay(200);
    strip.setPixelColor(i, strip.Color(0, 0, 0));    // off
  }
}`,
    exampleId: 'neopixel_strip_chase',
  },

  neopixel_ring: {
    id: 'neopixel_ring',
    name: 'NeoPixel Ring (12 LED)',
    icon: '⭕',
    category: 'Output',
    longDesc: 'A 12-pixel WS2812B circular LED ring. The LEDs are arranged in a ring, ideal for clocks, compass displays, or decorative light patterns. Uses the same single-wire protocol as other NeoPixel products.',
    use: 'Building radial animations, rotary indicators, or circular colour effects. Works identically to the NeoPixel Strip in code — just a different physical layout.',
    pins: {
      VCC: { label: 'VCC', type: 'power', desc: '5 V power supply.' },
      DIN: { label: 'DIN', type: 'digital', desc: 'Data input — connect to an Arduino digital pin.' },
      DOUT: { label: 'DOut', type: 'digital', desc: 'Data output — chain to the next NeoPixel device.' },
      GND: { label: 'GND', type: 'gnd', desc: 'Common ground.' },
    },
    props: {
      numPixels: 'Number of pixels (default 12).',
      brightness: 'Global brightness 0–255.',
    },
    wiring: 'VCC → 5 V, GND → GND, DIN → Arduino D6. Same decoupling recommendations as the strip (1000 µF cap + 470 Ω resistor on DIN).',
    code: `#include <Adafruit_NeoPixel.h>

#define PIN        6
#define NUM_LEDS   12

Adafruit_NeoPixel ring(NUM_LEDS, PIN, NEO_GRB + NEO_KHZ800);

void setup() {
  ring.begin();
  ring.setBrightness(128);
  ring.show();
}

void loop() {
  // Chase one red LED around the ring
  for (int i = 0; i < NUM_LEDS; i++) {
    ring.clear();
    ring.setPixelColor(i, ring.Color(255, 0, 0));
    ring.show();
    delay(100);
  }
}`,
    exampleId: 'neopixel_color_cycle',
  },

  /* ── ICs ── */
  ic_555: {
    id: 'ic_555',
    name: '555 Timer IC',
    icon: '⏱️',
    category: 'ICs',
    longDesc: 'The classic 555 timer IC configured in astable mode. The simulator automatically detects connected R1, R2, and C values and calculates the real oscillation frequency using the standard formulas: f = 1.44 / ((R1 + 2×R2) × C). Works standalone without an Arduino — the OUT pin drives LEDs and other components directly.',
    use: 'Generating square waves, LED blinkers, tone generators, PWM sources. Connect R1 between VCC and DIS, R2 between DIS and THR, and C between THR/TRIG and GND.',
    pins: {
      GND: { label: 'GND', type: 'gnd', desc: 'Ground pin.' },
      TRIG: { label: 'TRIG', type: 'digital', desc: 'Trigger input — starts the cycle when voltage falls below 1/3 VCC.' },
      OUT: { label: 'OUT', type: 'digital', desc: 'Output pin — drives HIGH (~VCC) or LOW (GND).' },
      RST: { label: 'RST', type: 'digital', desc: 'Reset — tie to VCC to keep timer active.' },
      DIS: { label: 'DIS', type: 'digital', desc: 'Discharge pin — internal transistor sinks current to GND when OUT is LOW.' },
      THR: { label: 'THR', type: 'digital', desc: 'Threshold input — resets the cycle when voltage exceeds 2/3 VCC.' },
      CV: { label: 'CV', type: 'signal', desc: 'Control voltage — add a 0.1 µF cap to GND for noise bypass.' },
      VCC: { label: 'VCC', type: 'power', desc: 'Supply voltage (4.5–16 V).' },
    },
    props: {
      frequency: 'Fallback frequency in Hz (used when R/C values cannot be detected).',
      dutyCycle: 'Fallback duty cycle in % (used when R/C values cannot be detected).',
    },
    wiring: 'VCC→5V, GND→GND, RST→VCC, CV→0.1µF→GND, OUT→LED+resistor→GND. For astable: VCC→R1→DIS, DIS→R2→THR, THR→C→GND, TRIG→THR.',
    code: `// The 555 timer runs autonomously — no Arduino code needed.
// Set frequency/duty via component values:
//   R1, R2 (resistors) and C (capacitor) determine timing.
//   f = 1.44 / ((R1 + 2*R2) * C)`,
    exampleId: '555 Timer Astable LED Blinker',
  },

  max7219: {
    id: 'max7219',
    name: 'MAX7219 LED Matrix',
    icon: '🔴',
    category: 'ICs',
    longDesc: 'An 8×8 LED dot matrix driver using the MAX7219 chip with SPI interface. Supports cascading via DOUT→DIN. The simulator decodes SPI commands and renders the LED matrix on the canvas. Works with or without an Arduino.',
    use: 'Scrolling text displays, animations, bar graphs. Driven via SPI with DIN, CS, and CLK pins.',
    pins: {
      VCC: { label: 'VCC', type: 'power', desc: '5 V power supply.' },
      GND: { label: 'GND', type: 'gnd', desc: 'Ground.' },
      DIN: { label: 'DIN', type: 'digital', desc: 'SPI data input — connect to MOSI or any digital pin.' },
      CS: { label: 'CS', type: 'digital', desc: 'Chip select — active LOW. Latch data on rising edge.' },
      CLK: { label: 'CLK', type: 'digital', desc: 'SPI clock input.' },
      DOUT: { label: 'DOUT', type: 'digital', desc: 'Data output — chain to the next MAX7219 DIN.' },
    },
    props: {},
    wiring: 'VCC→5V, GND→GND, DIN→D11 (MOSI), CS→D10, CLK→D13 (SCK). For cascading: DOUT→next DIN.',
    code: `// Uses SPI to send 16-bit frames: [address][data]
// Address 0x01–0x08: row data (bit 0 = left, bit 7 = right)
// Address 0x09: decode mode (0x00 = no decode)
// Address 0x0A: intensity (0x00–0x0F)
// Address 0x0B: scan limit (0x07 = all 8 rows)
// Address 0x0C: shutdown (0x01 = normal operation)`,
    exampleId: 'max7219',
  },

  /* ── DISPLAYS ── */
  ili9341: {
    id: 'ili9341',
    name: 'ILI9341 TFT Display',
    icon: '🖥️',
    category: 'Output',
    longDesc: 'A 2.4″ 320×240 TFT LCD driven by the ILI9341 controller with SPI interface. Supports Adafruit_GFX drawing primitives — lines, rectangles, circles, triangles, text, and pixel-level control. The simulator renders a 5×7 ASCII font for text and colour RGB drawing primitives.',
    use: 'Colour graphics, dashboards, games, data visualization. Uses SPI: CS, DC, RST, MOSI, SCK, and LED backlight pins.',
    pins: {
      VCC: { label: 'VCC', type: 'power', desc: '3.3 V / 5 V power.' },
      GND: { label: 'GND', type: 'gnd', desc: 'Ground.' },
      CS: { label: 'CS', type: 'digital', desc: 'Chip select — active LOW.' },
      DC: { label: 'DC', type: 'digital', desc: 'Data/Command select — HIGH for data, LOW for command.' },
      RST: { label: 'RST', type: 'digital', desc: 'Hardware reset — active LOW.' },
      MOSI: { label: 'MOSI', type: 'digital', desc: 'SPI master-out data.' },
      SCK: { label: 'SCK', type: 'digital', desc: 'SPI clock.' },
      LED: { label: 'LED', type: 'power', desc: 'Backlight control — tie to VCC for always-on.' },
    },
    props: {},
    wiring: 'VCC→3.3V/5V, GND→GND, CS→D10, DC→D9, RST→D8, MOSI→D11, SCK→D13, LED→VCC.',
    code: `#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>

#define TFT_CS  10
#define TFT_DC   9
#define TFT_RST  8
Adafruit_ILI9341 tft(TFT_CS, TFT_DC, TFT_RST);

void setup() {
  tft.begin();
  tft.setRotation(0);
  tft.fillScreen(ILI9341_BLACK);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(10, 10);
  tft.println("Hello TFT!");
  tft.fillRect(50, 50, 100, 60, ILI9341_RED);
  tft.drawCircle(200, 120, 40, ILI9341_GREEN);
}
void loop() {}`,
    exampleId: 'ili9341',
  },

  /* ── SENSORS ── */
  ir_obstacle: {
    id: 'ir_obstacle',
    name: 'IR Obstacle Sensor',
    icon: '📡',
    category: 'Sensors',
    longDesc: 'An infrared obstacle detection sensor. When an object is detected within range, the OUT pin goes LOW (active-low). The LED indicator lights up when an obstacle is detected. Toggle the simulated detection in the property panel.',
    use: 'Obstacle avoidance robots, line followers, proximity detection. Read OUT with digitalRead().',
    pins: {
      VCC: { label: 'VCC', type: 'power', desc: '3.3 V / 5 V power.' },
      GND: { label: 'GND', type: 'gnd', desc: 'Ground.' },
      OUT: { label: 'OUT', type: 'digital', desc: 'Digital output — LOW when obstacle detected, HIGH when clear.' },
    },
    props: {
      detected: 'Simulated detection state (0 = clear, 1 = obstacle detected).',
    },
    wiring: 'VCC→5V, GND→GND, OUT→D2.',
    code: `void setup(){
  pinMode(2, INPUT);
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}
void loop(){
  int d = digitalRead(2);
  digitalWrite(13, d == LOW ? HIGH : LOW);
  Serial.println(d == LOW ? "Obstacle!" : "Clear");
  delay(100);
}`,
  },

  flex_sensor: {
    id: 'flex_sensor',
    name: 'Flex Sensor',
    icon: '〰️',
    category: 'Sensors',
    longDesc: 'A resistive flex sensor whose resistance increases when bent. Wired as a voltage divider, it produces a 0–1023 analog value proportional to the bend angle. Adjust the simulated bend value in the property panel.',
    use: 'Gesture detection, glove interfaces, robotics finger control. Read the analog output with analogRead().',
    pins: {
      p1: { label: '1', type: 'power', desc: 'Connect to 5V (through a fixed resistor for voltage divider).' },
      p2: { label: '2', type: 'analog', desc: 'Analog output — connect to an analog input pin.' },
    },
    props: {
      bend: 'Simulated bend angle (0 = straight, 1023 = fully bent).',
    },
    wiring: '5V→p1 (via 10kΩ resistor), p2→A0, other end of fixed resistor→GND.',
    code: `void setup(){
  Serial.begin(9600);
}
void loop(){
  int bend = analogRead(A0);
  Serial.print("Bend: ");
  Serial.println(bend);
  delay(50);
}`,
  },

  thermistor: {
    id: 'thermistor',
    name: 'NTC Thermistor',
    icon: '🌡️',
    category: 'Sensors',
    longDesc: 'A Negative Temperature Coefficient thermistor whose resistance decreases as temperature rises. Wired as a voltage divider, it produces an analog value proportional to temperature. Adjust the simulated temperature in the property panel.',
    use: 'Temperature measurement, thermal protection, environmental monitoring. Read the analog output with analogRead().',
    pins: {
      p1: { label: '1', type: 'analog', desc: 'Analog output — connect to an analog input pin.' },
      p2: { label: '2', type: 'gnd', desc: 'Connect to GND (through the thermistor to form a voltage divider).' },
    },
    props: {
      temperature: 'Simulated temperature in °C (default 25°C).',
    },
    wiring: '5V→10kΩ fixed resistor→p1, p1→A0, p2→GND.',
    code: `void setup(){
  Serial.begin(9600);
}
void loop(){
  int adc = analogRead(A0);
  float voltage = adc * (5.0 / 1023.0);
  Serial.print("ADC: ");
  Serial.print(adc);
  Serial.print(" Voltage: ");
  Serial.println(voltage, 2);
  delay(500);
}`,
  },

  /* ── PASSIVES ── */
  diode_1n4007: {
    id: 'diode_1n4007',
    name: '1N4007 Diode',
    icon: '▶',
    category: 'Passive',
    longDesc: 'A general-purpose silicon rectifier diode. Current flows from anode to cathode with a ~0.7 V forward voltage drop. Blocks reverse current. Used for polarity protection, rectification, and flyback protection.',
    use: 'Reverse polarity protection, rectifying AC, flyback diodes across inductive loads (relays, motors).',
    pins: {
      anode: { label: 'A', type: 'signal', desc: 'Anode — current flows INTO this pin (from positive side).' },
      cathode: { label: 'K', type: 'signal', desc: 'Cathode — current flows OUT of this pin (toward load/GND).' },
    },
    props: {},
    wiring: 'Place in series: anode to positive source, cathode to load.',
    code: `// Diodes are passive components — no code needed.
// Anode (+) -> Diode -> Cathode (-) -> Load`,
  },

  /* ── ACTUATORS ── */
  l298n: {
    id: 'l298n',
    name: 'L298N Motor Driver',
    icon: '🔌',
    category: 'Actuators',
    longDesc: 'Dual H-Bridge motor driver module. Controls direction and speed (PWM) for up to two DC motors independently. IN1/IN2 control Motor A direction, IN3/IN4 control Motor B. ENA/ENB accept PWM for speed control.',
    use: 'Driving DC motors, stepper motors, solenoids. IN1/IN2 set Motor A direction (HIGH/LOW = forward, LOW/HIGH = reverse), ENA sets speed via PWM.',
    pins: {
      IN1: { label: 'IN1', type: 'digital', desc: 'Motor A direction input 1.' },
      IN2: { label: 'IN2', type: 'digital', desc: 'Motor A direction input 2.' },
      IN3: { label: 'IN3', type: 'digital', desc: 'Motor B direction input 1.' },
      IN4: { label: 'IN4', type: 'digital', desc: 'Motor B direction input 2.' },
      ENA: { label: 'ENA', type: 'pwm', desc: 'Motor A speed (PWM) — jumper on for full speed.' },
      ENB: { label: 'ENB', type: 'pwm', desc: 'Motor B speed (PWM) — jumper on for full speed.' },
      OUT1: { label: 'M1+', type: 'signal', desc: 'Motor A positive terminal.' },
      OUT2: { label: 'M1-', type: 'signal', desc: 'Motor A negative terminal.' },
      OUT3: { label: 'M2+', type: 'signal', desc: 'Motor B positive terminal.' },
      OUT4: { label: 'M2-', type: 'signal', desc: 'Motor B negative terminal.' },
      VS: { label: 'VS', type: 'power', desc: 'Motor supply voltage (6–12V). 5V pin output when jumper is on.' },
      GND: { label: 'GND', type: 'gnd', desc: 'Common ground — must share GND with Arduino.' },
    },
    props: {},
    wiring: 'IN1→D8, IN2→D9, ENA→D10(PWM). VS→external 7–12V. GND→Arduino GND. OUT1/OUT2→Motor A.',
    code: `void setup(){
  pinMode(8, OUTPUT);
  pinMode(9, OUTPUT);
  pinMode(10, OUTPUT);
}
void loop(){
  digitalWrite(8, HIGH);   // IN1 HIGH
  digitalWrite(9, LOW);    // IN2 LOW  -> Motor A forward
  analogWrite(10, 200);    // ENA PWM  -> speed
  delay(2000);
  digitalWrite(8, LOW);
  digitalWrite(9, LOW);    // stop
  delay(1000);
}`,
    exampleId: 'l298n_dc_motor',
  },

  servo_continuous: {
    id: 'servo_continuous',
    name: 'Cont. Rotation Servo',
    icon: '⚙️',
    category: 'Actuators',
    longDesc: 'Continuous rotation servo motor. Unlike standard servos (0–180°), this spins continuously in both directions. A 1500µs pulse stops the motor; above 1500µs spins one direction, below spins the other. Speed is proportional to pulse width deviation.',
    use: 'Wheels on robots, conveyor belts, panning mechanisms. Use analogWrite or Servo library to set speed.',
    pins: {
      signal: { label: 'SIG', type: 'pwm', desc: 'PWM signal — pulse width controls speed and direction.' },
      vcc: { label: '+', type: 'power', desc: 'Power supply (4.8–6V typical).' },
      gnd: { label: '−', type: 'gnd', desc: 'Ground.' },
    },
    props: {
      speed: 'Simulated speed: −100% (full CCW) to +100% (full CW), 0% = stopped.',
    },
    wiring: 'SIG→D9 (PWM), +→5V (or external 5V), −→GND.',
    code: `void setup(){
  pinMode(9, OUTPUT);
}
void loop(){
  analogWrite(9, 255);  // Full CW
  delay(2000);
  analogWrite(9, 127);  // Stop (1500us)
  delay(1000);
  analogWrite(9, 0);    // Full CCW
  delay(2000);
  analogWrite(9, 127);  // Stop
  delay(1000);
}`,
    exampleId: 'servo_continuous_spin',
  },

  /* ── INPUT ── */
  rotary_encoder: {
    id: 'rotary_encoder',
    name: 'Rotary Encoder EC11',
    icon: '🎛️',
    category: 'Input',
    longDesc: 'EC11 rotary encoder with push button. Provides infinite rotation with quadrature output (A, B channels 90° out of phase). Turns left/right and presses like a button. Use interrupts for accurate position tracking.',
    use: 'Menu navigation, volume control, parameter adjustment. Use attachInterrupt() on pin A to count edges.',
    pins: {
      A: { label: 'A', type: 'digital', desc: 'Channel A — connect to interrupt pin (D2/D3).' },
      B: { label: 'B', type: 'digital', desc: 'Channel B — connect to digital input.' },
      SW: { label: 'SW', type: 'digital', desc: 'Push switch — active LOW (internal pull-up).' },
      GND: { label: 'GND', type: 'gnd', desc: 'Ground.' },
    },
    props: {
      position: 'Rotational position (drag slider to simulate turning).',
    },
    wiring: 'A→D2 (interrupt), B→D3, SW→D4 (INPUT_PULLUP), GND→GND.',
    code: `volatile int counter = 0;
void setup(){
  attachInterrupt(digitalPinToInterrupt(2), readEncoder, CHANGE);
  pinMode(4, INPUT_PULLUP);
  Serial.begin(9600);
}
void readEncoder(){
  int b = digitalRead(3);
  counter += (b == HIGH) ? 1 : -1;
}
void loop(){
  if (digitalRead(4) == LOW) counter = 0;
  Serial.println(counter);
  delay(100);
}`,
    exampleId: 'rotary_encoder_counter',
  },

  dip_switch: {
    id: 'dip_switch',
    name: 'DIP Switch 8-Pos',
    icon: '🎚️',
    category: 'Input',
    longDesc: '8-position DIP switch bank. Each toggle is an independent SPST switch — up = ON (HIGH), down = OFF (LOW). Commonly used for hardware address configuration, mode selection, or binary input.',
    use: 'Set binary input values, hardware configuration, mode selection. Read each pin with digitalRead().',
    pins: {
      '1': { label: '1', type: 'digital', desc: 'Switch 1 — bit 0 of binary value.' },
      '2': { label: '2', type: 'digital', desc: 'Switch 2 — bit 1 of binary value.' },
      '3': { label: '3', type: 'digital', desc: 'Switch 3 — bit 2.' },
      '4': { label: '4', type: 'digital', desc: 'Switch 4 — bit 3.' },
      '5': { label: '5', type: 'digital', desc: 'Switch 5 — bit 4.' },
      '6': { label: '6', type: 'digital', desc: 'Switch 6 — bit 5.' },
      '7': { label: '7', type: 'digital', desc: 'Switch 7 — bit 6.' },
      '8': { label: '8', type: 'digital', desc: 'Switch 8 — bit 7 (MSB).' },
    },
    props: {
      switches: '8-bit binary value (0–255). Each bit controls one switch position.',
    },
    wiring: 'Connect pins 1–8 to Arduino digital inputs D2–D9. Use INPUT_PULLUP for each pin.',
    code: `int pins[8] = {2,3,4,5,6,7,8,9};
void setup(){
  for(int i=0;i<8;i++) pinMode(pins[i], INPUT_PULLUP);
  Serial.begin(9600);
}
void loop(){
  int v=0;
  for(int i=0;i<8;i++)
    if(digitalRead(pins[i])==HIGH) v|=(1<<i);
  Serial.println(v);
  delay(200);
}`,
    exampleId: 'dip_switch_binary',
  },

  /* ── SENSORS / COMMUNICATION ── */
  hc05: {
    id: 'hc05',
    name: 'HC-05 Bluetooth',
    icon: '📶',
    category: 'Sensors',
    longDesc: 'HC-05 serial-to-Bluetooth transceiver module (UART). Pairs with a phone/tablet to send and receive data over Bluetooth Serial Port Profile (SPP). Defaults to 9600 baud. TXD→Arduino RX, RXD→Arduino TX (with voltage divider for 3.3V logic).',
    use: 'Wireless communication with phone apps, remote control, telemetry. Send characters from phone to Arduino via Bluetooth.',
    pins: {
      VCC: { label: 'VCC', type: 'power', desc: 'Power supply (3.6–6V).' },
      GND: { label: 'GND', type: 'gnd', desc: 'Ground.' },
      TXD: { label: 'TXD', type: 'digital', desc: 'Bluetooth TX → Arduino RX (D0).' },
      RXD: { label: 'RXD', type: 'digital', desc: 'Bluetooth RX → Arduino TX (D1) via voltage divider.' },
    },
    props: {
      connected: 'Toggle Bluetooth connection status (simulated).',
    },
    wiring: 'VCC→5V, GND→GND, TXD→Arduino D0 (RX), RXD→Arduino D1 (TX via 1kΩ/2kΩ divider).',
    code: `void setup(){
  Serial.begin(9600);
  pinMode(13, OUTPUT);
}
void loop(){
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '1') { digitalWrite(13, HIGH); Serial.println("LED ON"); }
    if (c == '0') { digitalWrite(13, LOW);  Serial.println("LED OFF"); }
  }
}`,
    exampleId: 'hc05_bluetooth_led',
  },

  ds3231: {
    id: 'ds3231',
    name: 'DS3231 RTC Module',
    icon: '🕐',
    category: 'Sensors',
    longDesc: 'DS3231 high-precision RTC (Real-Time Clock) module with battery backup — I2C @ 0x68. Provides year/month/day/hour/minute/second with ±2ppm accuracy, built-in temperature sensor, and two programmable alarms. Time is simulated in real-time during simulation.',
    use: 'Data logging with timestamps, clocks, scheduled events, alarm systems. Read time with the RTClib or Wire library and print to Serial/LCD.',
    pins: {
      VCC: { label: 'VCC', type: 'power', desc: '5V power supply.' },
      GND: { label: 'GND', type: 'gnd', desc: 'Ground.' },
      SCL: { label: 'SCL', type: 'digital', desc: 'I2C clock line — connect to A5 (Uno) or SCL.' },
      SDA: { label: 'SDA', type: 'digital', desc: 'I2C data line — connect to A4 (Uno) or SDA.' },
    },
    props: {
      hour: 'Initial hour (0–23).',
      minute: 'Initial minute (0–59).',
      second: 'Initial second (0–59).',
      day: 'Initial day (1–31).',
      month: 'Initial month (1–12).',
      year: 'Initial year (0–99, represents 2000–2099).',
      temperature: 'Simulated temperature in °C.',
    },
    wiring: 'VCC→5V, GND→GND, SCL→A5, SDA→A4.',
    code: `#include <Wire.h>
#include <RtcDS3231.h>

RtcDS3231<TwoWire> Rtc(Wire);

void setup(){
  Serial.begin(9600);
  Rtc.Begin();
  Rtc.SetDateTime(RtcDateTime(__DATE__, __TIME__));
}

void loop(){
  RtcDateTime now = Rtc.GetDateTime();
  Serial.print("Time: ");
  Serial.print(now.Hour());   Serial.print(":");
  Serial.print(now.Minute()); Serial.print(":");
  Serial.println(now.Second());

  float temp = Rtc.GetTemperature().AsFloatDegC();
  Serial.print("Temp: "); Serial.print(temp); Serial.println(" C");
  delay(1000);
}`,
    exampleId: 'ds3231_rtc',
  },

  vl53l0x: {
    id: 'vl53l0x',
    name: 'VL53L0X Time-of-Flight Sensor',
    icon: '📏',
    category: 'Sensors',
    longDesc: 'VL53L0X is a time-of-flight distance sensor that measures the distance to an object using laser light. It communicates via I2C and can measure distances from 30mm to 2m with high accuracy.',
    use: 'Distance measurement, obstacle detection, robotics, and automation. Read distance values using the Wire library or dedicated VL53L0X libraries.',
    pins: {
      VCC: { label: 'VCC', type: 'power', desc: '3.3V or 5V power supply.' },
      GND: { label: 'GND', type: 'gnd', desc: 'Ground.' },
      SDA: { label: 'SDA', type: 'digital', desc: 'I2C data line — connect to A4 (Uno) or SDA.' },
      SCL: { label: 'SCL', type: 'digital', desc: 'I2C clock line — connect to A5 (Uno) or SCL.' },
    },
    props: {
      distance: 'Simulated distance in millimeters (default 100mm).',
    },
    wiring: 'VCC→3.3V/5V, GND→GND, SDA→A4, SCL→A5.',
    code: `#include <Wire.h>
#include <Adafruit_VL53L0X.h>

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

const int ledClose = 7;
const int ledFar   = 8;

void setup() {
  Serial.begin(115200);
  pinMode(ledClose, OUTPUT);
  pinMode(ledFar, OUTPUT);

  Serial.println("VL53L0X Distance Sensor");

  if (!lox.begin()) {
    Serial.println(F("Failed to boot VL53L0X!"));
    // while (1);
  }
  Serial.println(F("Sensor ready."));
}

void loop() {
  VL53L0X_RangingMeasurementData_t measure;
  lox.rangingTest(&measure, false);

  if (measure.RangeStatus != 4) {
    int dist = measure.RangeMilliMeter;
    Serial.print("Distance: ");
    Serial.print(dist);
    Serial.println(" mm");

    if (dist < 100) {
      digitalWrite(ledClose, HIGH);
      digitalWrite(ledFar, LOW);
    } else if (dist < 300) {
      digitalWrite(ledClose, LOW);
      digitalWrite(ledFar, HIGH);
    } else {
      digitalWrite(ledClose, LOW);
      digitalWrite(ledFar, LOW);
    }
  } else {
    Serial.println("Out of range");
    digitalWrite(ledClose, LOW);
    digitalWrite(ledFar, LOW);
  }

  delay(100);
}`,
    exampleId: 'vl53l0x_proximity_sensor',
  },
  BME280: {
    id: 'bme280',
    name: 'BME280 Environmental Sensor',
    icon: '🌤️',
    category: 'Sensors',
    longDesc: 'BME280 is a combined humidity, pressure, and temperature sensor. It communicates via I2C and provides accurate measurements for weather monitoring and environmental applications.',
    use: 'Weather monitoring, indoor climate control, altitude estimation. Read sensor values using the Wire library or dedicated BME280 libraries.',
    pins: {
      VCC: { label: 'VCC', type: 'power', desc: '3.3V or 5V power supply.' },
      GND: { label: 'GND', type: 'gnd', desc: 'Ground.' },
      SDA: { label: 'SDA', type: 'digital', desc: 'I2C data line — connect to A4 (Uno) or SDA.' },
      SCL: { label: 'SCL', type: 'digital', desc: 'I2C clock line — connect to A5 (Uno) or SCL.' },
    },
    props: {
      temperature: 'Simulated temperature in Celsius (default 25°C).',
      pressure: 'Simulated pressure in hPa (default 1013.25 hPa).',
      humidity: 'Simulated humidity in % (default 50%).',
    },
    wiring: 'VCC→3.3V/5V, GND→GND, SDA→A4, SCL→A5.',
    code: `/*
 * Simple Weather Station with Air Quality
 *
 * Wiring:
 *   BME280:  VCC->5V  GND->GND  SCL->A5  SDA->A4
 *   MQ-2:    VCC->5V  GND->GND  A0->A0
 *   LCD I2C: VCC->5V  GND->GND  SCL->A5  SDA->A4
 *
 * Drag the Temp / Hum / hPa sliders on the BME280
 * and the Gas slider on the MQ-2 to simulate conditions.
 */

#include <Wire.h>
#include <SimpleBME280.h>
#include <LiquidCrystal_I2C.h>

SimpleBME280 bme;
LiquidCrystal_I2C lcd(0x27, 16, 2);

const int gasPin = A0;

void setup() {
  Serial.begin(115200);
  Wire.begin();
  bme.begin();
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Weather Station");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  delay(1500);
  lcd.clear();
  Serial.println("Simple Weather Station + Air Quality");
  Serial.println("-------------------------------------");
}

void loop() {
  float tempC   = bme.readTemperature();
  float humPct  = bme.readHumidity();
  float presPa  = bme.readPressure();
  int gasRaw    = analogRead(gasPin);

  Serial.print("Temp:      ");
  Serial.print(tempC, 1);
  Serial.println(" C");

  Serial.print("Humidity:  ");
  Serial.print(humPct, 1);
  Serial.println(" %");

  Serial.print("Pressure:  ");
  Serial.print(presPa / 100.0, 1);
  Serial.println(" hPa");

  Serial.print("Air Qual:  ");
  Serial.print(gasRaw);
  Serial.print(" (");
  if (gasRaw < 200) Serial.print("Good");
  else if (gasRaw < 400) Serial.print("Moderate");
  else if (gasRaw < 600) Serial.print("Poor");
  else Serial.print("Hazardous");
  Serial.println(")");

  Serial.println("-------------------------------------");

  // Line 1: Temp and Humidity
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(tempC, 1);
  lcd.print((char)223);
  lcd.print("C H:");
  lcd.print((int)humPct);
  lcd.print("%  ");

  // Line 2: Pressure and Air Quality
  lcd.setCursor(0, 1);
  lcd.print("P:");
  lcd.print((int)(presPa / 100.0));
  lcd.print("h Q:");
  if (gasRaw < 200) lcd.print("Good ");
  else if (gasRaw < 400) lcd.print("Mod  ");
  else if (gasRaw < 600) lcd.print("Poor ");
  else lcd.print("HIGH!");

  delay(2000);
}`,
    exampleId: 'weather_station_multi',
  },
};

/* ═══════════════════════════════════════════════════════════════
   LIBRARY REFERENCE DATA
   Each entry documents an Arduino library supported by ArduSim:
   what it does, include directive, key API functions, and example code.
   ═══════════════════════════════════════════════════════════════ */

const GUIDE_LIBRARIES = [
  /* ── CORE ── */
  {
    id: 'wire',
    name: 'Wire (I2C)',
    icon: '🔗',
    category: 'Core',
    include: '<Wire.h>',
    desc: 'I2C communication library for master/slave data exchange. Used to connect LCDs, sensors, RTC modules, and other I2C peripherals.',
    api: [
      { fn: 'Wire.begin()', desc: 'Join I2C bus as master (or slave with address)' },
      { fn: 'Wire.beginTransmission(addr)', desc: 'Start transmission to device at addr' },
      { fn: 'Wire.write(val)', desc: 'Write a byte to the buffer' },
      { fn: 'Wire.endTransmission()', desc: 'Send buffer and stop transmission' },
      { fn: 'Wire.requestFrom(addr, qty)', desc: 'Request qty bytes from device at addr' },
      { fn: 'Wire.read()', desc: 'Read next byte from buffer' },
      { fn: 'Wire.available()', desc: 'Number of bytes available to read' },
    ],
    code: `#include < Wire.h >

    void setup() {
    Wire.begin();
    Serial.begin(9600);

    // Scan for I2C devices
    for (byte addr = 1; addr < 127; addr++) {
      Wire.beginTransmission(addr);
      if (Wire.endTransmission() == 0) {
        Serial.print("Found device at 0x");
        Serial.println(addr, HEX);
      }
    }
  }

  void loop() { } `,
    exampleId: null,
  },
  {
    id: 'spi',
    name: 'SPI',
    icon: '🔗',
    category: 'Core',
    include: '<SPI.h>',
    desc: 'Serial Peripheral Interface library for high-speed synchronous data transfer. Used with SD cards, displays, and RF modules.',
    api: [
      { fn: 'SPI.begin()', desc: 'Initialize SPI bus' },
      { fn: 'SPI.beginTransaction(settings)', desc: 'Configure clock speed and mode' },
      { fn: 'SPI.transfer(val)', desc: 'Send/receive one byte' },
      { fn: 'SPI.endTransaction()', desc: 'Release the SPI bus' },
    ],
    code: `#include < SPI.h >

    void setup() {
    SPI.begin();
    Serial.begin(9600);
    Serial.println("SPI initialized");
  }

  void loop() {
  byte data = SPI.transfer(0x42);
    Serial.print("Received: 0x");
    Serial.println(data, HEX);
    delay(1000);
  } `,
    exampleId: null,
  },
  {
    id: 'eeprom',
    name: 'EEPROM',
    icon: '💾',
    category: 'Core',
    include: '<EEPROM.h>',
    desc: 'Read and write persistent data to simulated EEPROM (512 bytes). Data survives between simulation runs.',
    api: [
      { fn: 'EEPROM.read(addr)', desc: 'Read one byte from address' },
      { fn: 'EEPROM.write(addr, val)', desc: 'Write one byte to address' },
      { fn: 'EEPROM.update(addr, val)', desc: 'Write only if value differs' },
      { fn: 'EEPROM.get(addr, data)', desc: 'Read any type from address' },
      { fn: 'EEPROM.put(addr, data)', desc: 'Write any type to address' },
    ],
    code: `#include < EEPROM.h >

    void setup() {
    Serial.begin(9600);

    // Write a value
    EEPROM.write(0, 42);
    Serial.println("Wrote 42 to address 0");

  // Read it back
  byte val = EEPROM.read(0);
    Serial.print("Read from address 0: ");
    Serial.println(val);
  }

  void loop() { } `,
    exampleId: null,
  },

  /* ── DISPLAY ── */
  {
    id: 'liquidcrystal',
    name: 'LiquidCrystal',
    icon: '🖥️',
    category: 'Display',
    include: '<LiquidCrystal.h>',
    desc: 'Control HD44780 character LCD displays (16x2, 20x4) via parallel interface.',
    api: [
      { fn: 'lcd.begin(cols, rows)', desc: 'Initialize display dimensions' },
      { fn: 'lcd.clear()', desc: 'Clear display and reset cursor' },
      { fn: 'lcd.setCursor(col, row)', desc: 'Move cursor to position' },
      { fn: 'lcd.print(text)', desc: 'Print text at cursor position' },
      { fn: 'lcd.write(byte)', desc: 'Write a custom character' },
      { fn: 'lcd.noDisplay() / lcd.display()', desc: 'Turn display off/on' },
    ],
    code: `#include < LiquidCrystal.h >

    LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

  void setup() {
    lcd.begin(16, 2);
    lcd.print("Hello, World!");
    lcd.setCursor(0, 1);
    lcd.print("ArduSim LCD");
  }

  void loop() { } `,
    exampleId: null,
  },
  {
    id: 'liquidcrystal_i2c',
    name: 'LiquidCrystal_I2C',
    icon: '🖥️',
    category: 'Display',
    include: '<LiquidCrystal_I2C.h>',
    desc: 'Control HD44780 LCD displays via I2C backpack (PCF8574). Supports 16x2 and 20x4 displays.',
    api: [
      { fn: 'lcd.init() / lcd.begin()', desc: 'Initialize the LCD' },
      { fn: 'lcd.clear()', desc: 'Clear display' },
      { fn: 'lcd.setCursor(col, row)', desc: 'Set cursor position (0-indexed)' },
      { fn: 'lcd.print(text)', desc: 'Print text at cursor' },
      { fn: 'lcd.backlight() / lcd.noBacklight()', desc: 'Toggle backlight' },
      { fn: 'lcd.createChar(loc, charmap)', desc: 'Create custom character (8 max)' },
    ],
    code: `#include < Wire.h >
    #include < LiquidCrystal_I2C.h >

    // 16x2 LCD at address 0x27
    LiquidCrystal_I2C lcd(0x27, 16, 2);

  void setup() {
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print("Hello from I2C!");
    lcd.setCursor(0, 1);
    lcd.print("16x2 LCD Demo");
  }

  void loop() { } `,
    exampleId: 'lcd_i2c',
  },
  {
    id: 'adafruit_ssd1306',
    name: 'Adafruit SSD1306',
    icon: '🖥️',
    category: 'Display',
    include: '<Adafruit_SSD1306.h>',
    desc: 'Drive SSD1306-based 128x64 OLED displays over I2C or SPI.',
    api: [
      { fn: 'display.begin(SSD1306_SWITCHCAPVCC, addr)', desc: 'Initialize OLED (0x3C or 0x3D)' },
      { fn: 'display.clearDisplay()', desc: 'Clear the buffer' },
      { fn: 'display.display()', desc: 'Send buffer to screen' },
      { fn: 'display.drawPixel(x, y, color)', desc: 'Draw a single pixel' },
      { fn: 'display.setTextSize(n)', desc: 'Set text size (1-4)' },
      { fn: 'display.setTextColor(color)', desc: 'Set text color' },
      { fn: 'display.setCursor(x, y)', desc: 'Set text cursor' },
      { fn: 'display.print(text)', desc: 'Print text to buffer' },
    ],
    code: `#include < Wire.h >
    #include < Adafruit_GFX.h >
    #include < Adafruit_SSD1306.h >

    #define SCREEN_WIDTH 128
  #define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, & Wire, -1);

  void setup() {
    display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("OLED Display");
    display.println("128x64 SSD1306");
    display.display();
  }

  void loop() { } `,
    exampleId: 'oled_ssd1306',
  },

  /* ── SENSORS ── */
  {
    id: 'dht',
    name: 'DHT',
    icon: '🌡️',
    category: 'Sensors',
    include: '<DHT.h>',
    desc: 'Read temperature and humidity from DHT11 and DHT22 sensors.',
    api: [
      { fn: 'DHT pin(type)', desc: 'Create sensor object on pin with type (DHT11/DHT22)' },
      { fn: 'dht.begin()', desc: 'Initialize sensor' },
      { fn: 'dht.readTemperature()', desc: 'Read temperature in Celsius' },
      { fn: 'dht.readHumidity()', desc: 'Read humidity percentage' },
      { fn: 'dht.readHeatIndex()', desc: 'Calculate heat index' },
    ],
    code: `#include < DHT.h >

    #define DHTPIN 2
  #define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

  void setup() {
    Serial.begin(9600);
    dht.begin();
  }

  void loop() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
    Serial.print("Temp: "); Serial.print(temp); Serial.print(" C  ");
    Serial.print("Hum: "); Serial.print(hum); Serial.println(" %");
    delay(2000);
  } `,
    exampleId: 'temperature',
  },
  {
    id: 'newping',
    name: 'NewPing',
    icon: '📡',
    category: 'Sensors',
    include: '<NewPing.h>',
    desc: 'Ultrasonic sensor library for HC-SR04. Provides accurate distance measurement with multi-ping and median filtering.',
    api: [
      { fn: 'NewPing(trigger, echo, maxDist)', desc: 'Create sensor object' },
      { fn: 'sonar.ping_cm()', desc: 'Get distance in centimeters' },
      { fn: 'sonar.ping_in()', desc: 'Get distance in inches' },
      { fn: 'sonar.ping_median(iterations)', desc: 'Median-filtered ping' },
    ],
    code: `#include < NewPing.h >

    #define TRIGGER_PIN 9
  #define ECHO_PIN 10
  #define MAX_DISTANCE 200

NewPing sonar(TRIGGER_PIN, ECHO_PIN, MAX_DISTANCE);

  void setup() {
    Serial.begin(9600);
  }

  void loop() {
    delay(500);
  int dist = sonar.ping_cm();
    Serial.print("Distance: ");
    Serial.print(dist);
    Serial.println(" cm");
  } `,
    exampleId: 'ultrasonic',
  },

  /* ── ACTUATORS ── */
  {
    id: 'servo',
    name: 'Servo',
    icon: '⚙️',
    category: 'Actuators',
    include: '<Servo.h>',
    desc: 'Control servo motors (SG90, MG996R, etc.) via PWM. Supports angles from 0° to 180°.',
    api: [
      { fn: 'servo.attach(pin)', desc: 'Attach servo to pin' },
      { fn: 'servo.write(angle)', desc: 'Set angle (0-180°)' },
      { fn: 'servo.writeMicroseconds(us)', desc: 'Set pulse width (500-2400μs)' },
      { fn: 'servo.read()', desc: 'Read current angle' },
      { fn: 'servo.attached()', desc: 'Check if attached' },
      { fn: 'servo.detach()', desc: 'Detach from pin' },
    ],
    code: `#include < Servo.h >

    Servo myServo;
int pos = 0;

  void setup() {
    myServo.attach(9);
  }

  void loop() {
    for (pos = 0; pos <= 180; pos++) {
      myServo.write(pos);
      delay(15);
    }
    for (pos = 180; pos >= 0; pos--) {
      myServo.write(pos);
      delay(15);
    }
  } `,
    exampleId: 'servo_sweep',
  },
  {
    id: 'stepper',
    name: 'Stepper',
    icon: '⚙️',
    category: 'Actuators',
    include: '<Stepper.h>',
    desc: 'Control stepper motors like the 28BYJ-48 with ULN2003 driver board.',
    api: [
      { fn: 'Stepper(steps, pin1, pin2, pin3, pin4)', desc: 'Create stepper with pin connections' },
      { fn: 'stepper.setSpeed(rpm)', desc: 'Set rotation speed' },
      { fn: 'stepper.step(steps)', desc: 'Move number of steps (+ clockwise, - counter-clockwise)' },
    ],
    code: `#include < Stepper.h >

    #define STEPS_PER_REV 2048

Stepper myStepper(STEPS_PER_REV, 8, 10, 9, 11);

  void setup() {
    myStepper.setSpeed(10);  // 10 RPM
    Serial.begin(9600);
  }

  void loop() {
    myStepper.step(STEPS_PER_REV);
    Serial.println("One revolution CW");
    delay(500);
  } `,
    exampleId: 'stepper_motor',
  },

  /* ── WIRELESS ── */
  {
    id: 'wifi',
    name: 'WiFi',
    icon: '📶',
    category: 'Wireless',
    include: '<WiFi.h>',
    desc: 'Wi-Fi connectivity for ESP32. Connect to networks and create access points.',
    api: [
      { fn: 'WiFi.begin(ssid, pass)', desc: 'Connect to Wi-Fi network' },
      { fn: 'WiFi.status()', desc: 'Get connection status (WL_CONNECTED)' },
      { fn: 'WiFi.localIP()', desc: 'Get assigned IP address' },
      { fn: 'WiFi.macAddress()', desc: 'Get MAC address' },
      { fn: 'WiFi.mode(mode)', desc: 'Set mode (WIFI_STA, WIFI_AP, WIFI_AP_STA)' },
    ],
    code: `#include < WiFi.h >

const char* ssid = "YourSSID";
  const char* password = "YourPassword";

  void setup() {
    Serial.begin(115200);
    WiFi.begin(ssid, password);
    Serial.print("Connecting");
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println("\\nConnected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  }

  void loop() { } `,
    exampleId: null,
  },
  {
    id: 'espnow',
    name: 'ESP-NOW',
    icon: '📡',
    category: 'Wireless',
    include: ['<esp_now.h>', '<WiFi.h>'],
    desc: 'Peer-to-peer wireless communication between ESP32 boards without a router. Fast, low-power, ideal for sensor networks.',
    api: [
      { fn: 'esp_now_init()', desc: 'Initialize ESP-NOW' },
      { fn: 'esp_now_register_send_cb(fn)', desc: 'Register send callback' },
      { fn: 'esp_now_register_recv_cb(fn)', desc: 'Register receive callback' },
      { fn: 'esp_now_add_peer(&peerInfo)', desc: 'Add a peer device' },
      { fn: 'esp_now_send(addr, data, len)', desc: 'Send data to peer' },
    ],
    code: `#include < esp_now.h >
    #include < WiFi.h >

    uint8_t receiverMAC[] = { 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0x02};

  void OnDataSent(const uint8_t * mac, esp_now_send_status_t status) {
    Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Send OK" : "Send FAIL");
  }

  void setup() {
    Serial.begin(115200);
    WiFi.mode(WIFI_STA);
    esp_now_init();
    esp_now_register_send_cb(OnDataSent);
    Serial.println("ESP-NOW Sender ready");
  }

  void loop() {
  int data = 42;
    esp_now_send(receiverMAC, (uint8_t *) & data, sizeof(data));
    delay(1000);
  } `,
    exampleId: 'espnow_sender',
  },
  {
    id: 'zigbee',
    name: 'Zigbee',
    icon: '📡',
    category: 'Wireless',
    include: '<Zigbee.h>',
    desc: 'Zigbee mesh networking for IoT. Supports Coordinator/End Device architecture with short addresses, channels, and PAN IDs.',
    api: [
      { fn: 'Zigbee.begin(channel, panId)', desc: 'Initialize Zigbee network' },
      { fn: 'Zigbee.send(addr, data, len)', desc: 'Send data to a node' },
      { fn: 'Zigbee.onReceive(callback)', desc: 'Register receive callback' },
      { fn: 'Zigbee.onSend(callback)', desc: 'Register send status callback' },
      { fn: 'Zigbee.getNodeAddress()', desc: 'Get this node short address' },
      { fn: 'Zigbee.getPanId()', desc: 'Get PAN ID' },
      { fn: 'Zigbee.getChannel()', desc: 'Get current channel' },
      { fn: 'Zigbee.ping(destAddr)', desc: 'Ping a remote node' },
    ],
    code: `#include < Zigbee.h >

    uint16_t endDeviceAddr = 0x0001;

  void onSendStatus(int status) {
    Serial.println(status == 0 ? "Send OK" : "Send FAIL");
  }

  void setup() {
    Serial.begin(115200);
    pinMode(2, OUTPUT);

    Zigbee.begin(11, 0x1234);
    Zigbee.onSend(onSendStatus);

    Serial.print("Address: 0x");
    Serial.println(Zigbee.getNodeAddress(), HEX);
  }

  void loop() {
  int data = 42;
    Zigbee.send(endDeviceAddr, (uint8_t *) & data, sizeof(data));
    digitalWrite(2, HIGH);
    delay(50);
    digitalWrite(2, LOW);
    delay(2000);
  } `,
    exampleId: 'zigbee_sender_receiver',
  },
  {
    id: 'bluetoothserial',
    name: 'BluetoothSerial',
    icon: '📶',
    category: 'Wireless',
    include: '<BluetoothSerial.h>',
    desc: 'Classic Bluetooth SPP (Serial Port Profile) for ESP32. Serial-like communication between two Bluetooth devices.',
    api: [
      { fn: 'SerialBT.begin(name)', desc: 'Start Bluetooth with device name' },
      { fn: 'SerialBT.available()', desc: 'Check if data available' },
      { fn: 'SerialBT.read()', desc: 'Read incoming byte' },
      { fn: 'SerialBT.write(data)', desc: 'Send data' },
      { fn: 'SerialBT.print(text)', desc: 'Send text' },
      { fn: 'SerialBT.println(text)', desc: 'Send text with newline' },
    ],
    code: `#include < BluetoothSerial.h >

    BluetoothSerial SerialBT;

  void setup() {
    Serial.begin(115200);
    SerialBT.begin("ArduSim_BT");
    Serial.println("Bluetooth started!");
  }

  void loop() {
    if (SerialBT.available()) {
    char c = SerialBT.read();
      Serial.print("Received: ");
      Serial.println(c);
      SerialBT.print("Echo: ");
      SerialBT.println(c);
    }
  } `,
    exampleId: 'bluetooth_serial_bridge',
  },

  /* ── IOT PROTOCOLS ── */
  {
    id: 'pubsubclient',
    name: 'PubSubClient (MQTT)',
    icon: '📬',
    category: 'IoT',
    include: '<PubSubClient.h>',
    desc: 'MQTT publish/subscribe client for lightweight IoT messaging. Connect to brokers like HiveMQ, Mosquitto, or cloud services.',
    api: [
      { fn: 'client.setServer(server, port)', desc: 'Set MQTT broker address' },
      { fn: 'client.setCallback(callback)', desc: 'Set message callback' },
      { fn: 'client.connect(clientId)', desc: 'Connect to broker' },
      { fn: 'client.publish(topic, payload)', desc: 'Publish message to topic' },
      { fn: 'client.subscribe(topic)', desc: 'Subscribe to topic' },
      { fn: 'client.loop()', desc: 'Process incoming messages' },
    ],
    code: `#include < WiFi.h >
    #include < PubSubClient.h >

const char* mqtt_server = "broker.hivemq.com";
WiFiClient espClient;
PubSubClient client(espClient);

  void callback(char * topic, byte * payload, unsigned int length) {
    Serial.print("Message on "); Serial.println(topic);
  }

  void setup() {
    Serial.begin(115200);
    client.setServer(mqtt_server, 1883);
    client.setCallback(callback);
    // Connect WiFi first, then client.connect("ArduSim")
    // client.subscribe("arduim/test");
  }

  void loop() {
    client.loop();
  } `,
    exampleId: 'mqtt_esp32',
  },
  {
    id: 'coap',
    name: 'CoAP',
    icon: '🌐',
    category: 'IoT',
    include: '<coap.h>',
    desc: 'Constrained Application Protocol for resource-constrained IoT devices. RESTful API with GET/PUT/POST/DELETE methods.',
    api: [
      { fn: 'coap.begin()', desc: 'Initialize CoAP client' },
      { fn: 'coap.get(server, uri)', desc: 'GET request' },
      { fn: 'coap.put(server, uri, payload)', desc: 'PUT request' },
      { fn: 'coap.post(server, uri, payload)', desc: 'POST request' },
      { fn: 'coap.delete(server, uri)', desc: 'DELETE request' },
      { fn: 'coap.loop()', desc: 'Process CoAP messages' },
    ],
    code: `#include < coap.h >

    CoapClient client;

  void setup() {
    Serial.begin(115200);
    client.begin();
    Serial.println("CoAP Client ready");
  }

  void loop() {
    client.loop();
    delay(1000);
  } `,
    exampleId: 'coap_client',
  },
  {
    id: 'httpclient',
    name: 'HTTPClient',
    icon: '🌐',
    category: 'IoT',
    include: '<HTTPClient.h>',
    desc: 'Make HTTP requests (GET, POST, PUT, DELETE) from ESP32. Useful for REST APIs and web services.',
    api: [
      { fn: 'http.begin(url)', desc: 'Set request URL' },
      { fn: 'http.GET()', desc: 'Send GET request' },
      { fn: 'http.POST(data)', desc: 'Send POST request' },
      { fn: 'http.getString()', desc: 'Get response body as string' },
      { fn: 'http.end()', desc: 'Free resources' },
    ],
    code: `#include < WiFi.h >
    #include < HTTPClient.h >

    void setup() {
    Serial.begin(115200);
    // Connect WiFi first
  }

  void loop() {
    if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
      http.begin("http://httpbin.org/get");
    int code = http.GET();
      if (code > 0) {
        Serial.println(http.getString());
      }
      http.end();
    }
    delay(5000);
  } `,
    exampleId: null,
  },
  {
    id: 'webserver',
    name: 'WebServer',
    icon: '🌐',
    category: 'IoT',
    include: '<WebServer.h>',
    desc: 'Create a web server on ESP32. Serve HTML pages, handle REST endpoints, and build web dashboards.',
    api: [
      { fn: 'server.begin()', desc: 'Start the web server' },
      { fn: 'server.on(uri, handler)', desc: 'Register route handler' },
      { fn: 'server.handleClient()', desc: 'Process incoming requests' },
      { fn: 'server.send(code, type, content)', desc: 'Send HTTP response' },
    ],
    code: `#include < WiFi.h >
    #include < WebServer.h >

    WebServer server(80);

  void handleRoot() {
    server.send(200, "text/html", "<h1>ArduSim Web Server</h1>");
  }

  void setup() {
    Serial.begin(115200);
    // Connect WiFi first
    server.on("/", handleRoot);
    server.begin();
  }

  void loop() {
    server.handleClient();
  } `,
    exampleId: null,
  },

  /* ── AUDIO ── */
  {
    id: 'i2s',
    name: 'I2S',
    icon: '🔊',
    category: 'Audio',
    include: '<driver/i2s.h>',
    desc: 'Inter-IC Sound interface for ESP32. Play audio through I2S DACs and amplifiers like MAX98357A.',
    api: [
      { fn: 'i2s_driver_install()', desc: 'Install I2S driver' },
      { fn: 'i2s_set_pin()', desc: 'Configure I2S pins' },
      { fn: 'i2s_write()', desc: 'Write audio data to I2S' },
    ],
    code: `#include < driver / i2s.h >

    void setup() {
    Serial.begin(115200);
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = 44100,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    };
    i2s_driver_install(I2S_NUM_0, & i2s_config, 0, NULL);
    Serial.println("I2S initialized");
  }

  void loop() { } `,
    exampleId: 'esp32_i2s_music_player',
  },

  /* ── MISC ── */
  {
    id: 'arduinojson',
    name: 'ArduinoJson',
    icon: '📄',
    category: 'Utility',
    include: '<ArduinoJson.h>',
    desc: 'Parse and serialize JSON data. Essential for IoT APIs, configuration, and data exchange.',
    api: [
      { fn: 'deserializeJson(doc, json)', desc: 'Parse JSON string' },
      { fn: 'serializeJson(doc, buffer)', desc: 'Serialize to JSON string' },
      { fn: 'doc["key"]', desc: 'Access JSON values' },
      { fn: 'doc["key"] = value', desc: 'Set JSON values' },
    ],
    code: `#include < ArduinoJson.h >

    void setup() {
    Serial.begin(9600);

    StaticJsonDocument < 200 > doc;
    doc["sensor"] = "temp";
    doc["value"] = 23.5;
    doc["unit"] = "C";

  char buffer[200];
    serializeJson(doc, buffer);
    Serial.println(buffer);
  }

  void loop() { } `,
    exampleId: null,
  },
  {
    id: 'tinygps',
    name: 'TinyGPS++',
    icon: '🛰️',
    category: 'Utility',
    include: '<TinyGPS++.h>',
    desc: 'Parse GPS NMEA sentences from NEO-6M and other GPS modules. Extracts location, altitude, speed, and satellite data.',
    api: [
      { fn: 'gps.encode(c)', desc: 'Feed character from GPS serial' },
      { fn: 'gps.location.isValid()', desc: 'Check if location is valid' },
      { fn: 'gps.location.lat()', desc: 'Get latitude' },
      { fn: 'gps.location.lng()', desc: 'Get longitude' },
      { fn: 'gps.altitude.meters()', desc: 'Get altitude in meters' },
      { fn: 'gps.satellites.value()', desc: 'Get satellite count' },
    ],
    code: `#include < TinyGPS++.h >

    TinyGPSPlus gps;

  void setup() {
    Serial.begin(9600);
  }

  void loop() {
    while (Serial.available() > 0) {
      gps.encode(Serial.read());
      if (gps.location.isUpdated()) {
        Serial.print("Lat: "); Serial.println(gps.location.lat(), 6);
        Serial.print("Lng: "); Serial.println(gps.location.lng(), 6);
      }
    }
  } `,
    exampleId: 'gps_neo_6m_8m_tracker',
  },
  {
    id: 'irremote',
    name: 'IRremote',
    icon: '📺',
    category: 'Utility',
    include: '<IRremote.h>',
    desc: 'Send and receive infrared signals. Decode remote control protocols (NEC, Sony, RC5, etc.).',
    api: [
      { fn: 'irrecv.decode(&results)', desc: 'Decode incoming IR signal' },
      { fn: 'irsend.sendNEC(code)', desc: 'Send NEC protocol signal' },
      { fn: 'irsend.sendSony(code)', desc: 'Send Sony protocol signal' },
      { fn: 'irrecv.resume()', desc: 'Resume receiving next signal' },
    ],
    code: `#include < IRremote.h >

    IRrecv irrecv(2);
decode_results results;

  void setup() {
    Serial.begin(9600);
    irrecv.enableIRIn();
  }

  void loop() {
    if (irrecv.decode(& results)) {
      Serial.print("Code: 0x");
      Serial.println(results.value, HEX);
      irrecv.resume();
    }
  } `,
    exampleId: null,
  },
  {
    id: 'fastled',
    name: 'FastLED',
    icon: '🌈',
    category: 'Output',
    include: '<FastLED.h>',
    desc: 'Control addressable LED strips (WS2812B, SK6812, etc.). Extensive color palettes, effects, and animations.',
    api: [
      { fn: 'FastLED.addLeds<chip>(leds, n)', desc: 'Add LED strip' },
      { fn: 'FastLED.setBrightness(n)', desc: 'Set global brightness (0-255)' },
      { fn: 'leds[i] = CRGB(r,g,b)', desc: 'Set LED color' },
      { fn: 'fill_rainbow(leds, n, hue)', desc: 'Fill with rainbow' },
      { fn: 'FastLED.show()', desc: 'Update LEDs' },
    ],
    code: `#include < FastLED.h >

    #define NUM_LEDS 8
  #define DATA_PIN 6

CRGB leds[NUM_LEDS];

  void setup() {
    FastLED.addLeds < WS2812B, DATA_PIN, GRB > (leds, NUM_LEDS);
    FastLED.setBrightness(50);
  }

  void loop() {
    fill_rainbow(leds, NUM_LEDS, millis() / 10);
    FastLED.show();
    delay(30);
  } `,
    exampleId: 'neopixel_color_cycle',
  },
  {
    id: 'neopixel',
    name: 'Adafruit NeoPixel',
    icon: '🌈',
    category: 'Output',
    include: '<Adafruit_NeoPixel.h>',
    desc: 'Control NeoPixel (WS2812B) LED strips and matrices with a simple API.',
    api: [
      { fn: 'strip.begin()', desc: 'Initialize strip' },
      { fn: 'strip.setBrightness(n)', desc: 'Set brightness (0-255)' },
      { fn: 'strip.setPixelColor(i, r, g, b)', desc: 'Set pixel color' },
      { fn: 'strip.show()', desc: 'Update strip' },
      { fn: 'strip.Color(r, g, b)', desc: 'Create color value' },
    ],
    code: `#include < Adafruit_NeoPixel.h >

    #define NUM_LEDS 8
  #define PIN 6

Adafruit_NeoPixel strip(NUM_LEDS, PIN, NEO_GRB + NEO_KHZ800);

  void setup() {
    strip.begin();
    strip.setBrightness(50);
    strip.show();
  }

  void loop() {
    for (int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, strip.Color(255, 0, 0));
      strip.show();
      delay(200);
    }
  } `,
    exampleId: 'neopixel_color_cycle',
  },
  {
    id: 'mfrc522',
    name: 'MFRC522',
    icon: '💳',
    category: 'Utility',
    include: '<MFRC522.h>',
    desc: 'Read and write MIFARE RFID tags using the MFRC522 reader module (13.56 MHz).',
    api: [
      { fn: 'mfrc522.PCD_Init()', desc: 'Initialize RFID reader' },
      { fn: 'mfrc522.PICC_IsNewCardPresent()', desc: 'Check if a card is present' },
      { fn: 'mfrc522.PICC_ReadCardSerial()', desc: 'Read card UID' },
      { fn: 'mfrc522.PICC_HaltA()', desc: 'Stop card communication' },
    ],
    code: `#include < SPI.h >
    #include < MFRC522.h >

    #define SS_PIN 10
  #define RST_PIN 9
MFRC522 mfrc522(SS_PIN, RST_PIN);

  void setup() {
    Serial.begin(9600);
    SPI.begin();
    mfrc522.PCD_Init();
    Serial.println("RFID Reader ready");
  }

  void loop() {
    if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
      Serial.print("Card UID: ");
      for (byte i = 0; i < mfrc522.uid.size; i++) {
        Serial.print(mfrc522.uid.uidByte[i], HEX);
      }
      Serial.println();
      mfrc522.PICC_HaltA();
    }
  } `,
    exampleId: 'rfid_inventory_tracker',
  },
];

/* ═══════════════════════════════════════════════════════════════
   TUTORIALS / HOW TO USE
   Each guide explains a concept step-by-step and maps to a built-in
   example you can load with one click.
   ═══════════════════════════════════════════════════════════════ */

const GUIDE_TUTORIALS = [
  {
    id: 'getting-started',
    title: 'Getting Started with ArduSim',
    icon: '🚀',
    level: 'Beginner',
    tags: ['workspace', 'basics'],
    summary: 'Learn the workspace: code editor, circuit canvas, component library, serial monitor and the Run button.',
    steps: [
      'Take a look at the layout: code editor on the left, circuit canvas in the centre, component library on the right, and instruments (Serial Monitor, Output, Oscilloscope, Plotter, Pin Monitor) along the bottom.',
      'Every new project opens with the classic Blink example — an Arduino Uno with an LED on pin 13.',
      'Click the green Run button (or press F5) to compile and run the sketch. Watch the LED on the canvas blink and the status bar start its timer.',
      'Open the Serial Monitor tab at the bottom to see Serial.println() output live.',
      'Use the "Examples" button in the toolbar to browse and load other ready-made projects.',
      'Press F6 to stop, F7 to pause/resume. Drag the "Speed" selector to run the simulation up to 10× faster.',
    ],
    wiring: 'No wiring required — the built-in Blink circuit is already set up for you.',
    code: `void setup() {
    pinMode(13, OUTPUT);
    Serial.begin(9600);
  }
  void loop() {
    digitalWrite(13, HIGH);
    Serial.println("LED ON");
    delay(1000);
    digitalWrite(13, LOW);
    Serial.println("LED OFF");
    delay(1000);
  } `,
    exampleId: 'blink',
  },

  {
    id: 'blink',
    title: 'Blinking an LED',
    icon: '💡',
    level: 'Beginner',
    tags: ['LED', 'digital', 'output'],
    summary: 'The classic "Hello World" — turn an LED on and off at a fixed interval.',
    steps: [
      'From the component library drag an LED and a Resistor onto the canvas, or keep the default circuit.',
      'Wire D13 → resistor → LED anode, then LED cathode → GND. Click a pin, then click the next pin to draw a wire.',
      'In setup(), set pin 13 as OUTPUT with pinMode().',
      'In loop(), drive it HIGH, wait 1000 ms, drive it LOW, wait 1000 ms.',
      'Run the sketch (F5) and watch the LED pulse once per second.',
    ],
    wiring: 'D13 → 220 Ω resistor → LED anode(+) ; LED cathode(−) → GND.',
    code: `void setup() {
    pinMode(13, OUTPUT);
  }
  void loop() {
    digitalWrite(13, HIGH);
    delay(1000);
    digitalWrite(13, LOW);
    delay(1000);
  } `,
    exampleId: 'blink',
  },

  {
    id: 'fade',
    title: 'Fading an LED with PWM',
    icon: '🌅',
    level: 'Beginner',
    tags: ['PWM', 'analogWrite', 'LED'],
    summary: 'Use analogWrite() on a PWM pin to ramp LED brightness smoothly up and down.',
    steps: [
      'Wire an LED to pin 9 (a PWM pin) through a resistor, cathode to GND.',
      'Declare a brightness variable and a fadeAmount step.',
      'In loop(), analogWrite(9, brightness) then add fadeAmount.',
      'Reverse the direction whenever brightness hits 0 or 255.',
      'Watch the glow breathe in the simulation.',
    ],
    wiring: 'D9 → resistor → LED anode(+) ; LED cathode(−) → GND.',
    code: `int ledPin = 9;
int brightness = 0;
int fadeAmount = 5;
  void setup() {
    pinMode(ledPin, OUTPUT);
  }
  void loop() {
    analogWrite(ledPin, brightness);
    brightness += fadeAmount;
    if (brightness <= 0 || brightness >= 255) fadeAmount = -fadeAmount;
    delay(30);
  } `,
    exampleId: 'fade',
  },

  {
    id: 'button',
    title: 'Reading a Push Button',
    icon: '🔘',
    level: 'Beginner',
    tags: ['input', 'button', 'digitalRead'],
    summary: 'Read a button with INPUT_PULLUP and toggle an LED. Learn how to wire a four-leg switch.',
    steps: [
      'Place a push button. Wire D2 → pin 1 and pin 3 → GND. Wire the LED to D13 as in the Blink tutorial.',
      'Set pin 2 to INPUT_PULLUP — the pin reads HIGH when released, LOW when pressed.',
      'In loop(), read digitalRead(2). When LOW, light the LED.',
      'Optionally use the canvas to click the button and watch the state change live.',
    ],
    wiring: 'D2 → button pin 1 ; button pin 3 → GND ; D13 → LED.',
    code: `int buttonPin = 2;
int ledPin = 13;
  void setup() {
    pinMode(buttonPin, INPUT_PULLUP);
    pinMode(ledPin, OUTPUT);
  }
  void loop() {
    if (digitalRead(buttonPin) == LOW) digitalWrite(ledPin, HIGH);
    else digitalWrite(ledPin, LOW);
  } `,
    exampleId: 'button',
  },

  {
    id: 'potentiometer',
    title: 'Analog Input with a Potentiometer',
    icon: '🎚️',
    level: 'Beginner',
    tags: ['analogRead', 'potentiometer', 'sensor'],
    summary: 'Read a knob position as a 0–1023 value and print it to the Serial Monitor.',
    steps: [
      'Wire the potentiometer: VCC→5V, OUT→A0, GND→GND.',
      'In setup(), start Serial at 9600 baud.',
      'In loop(), read analogRead(A0) and Serial.println() the value.',
      'Open the Serial Monitor (bottom panel) and drag the knob in the simulation to watch values change.',
      'Tip: change the value in the property panel (right-click → Properties) for precise control.',
    ],
    wiring: 'VCC→5V, OUT→A0, GND→GND.',
    code: `void setup() {
    Serial.begin(9600);
  }
  void loop() {
  int value = analogRead(A0);
    Serial.println(value);
    delay(50);
  } `,
    exampleId: 'potentiometer',
  },

  {
    id: 'servo',
    title: 'Controlling a Servo Motor',
    icon: '⚙️',
    level: 'Intermediate',
    tags: ['servo', 'actuator', 'library'],
    summary: 'Sweep a servo between 0° and 180° using the Servo library.',
    steps: [
      'Place a servo. Wire SIG→D9, +→5V, −→GND.',
      'Include <Servo.h> and create a Servo object.',
      'Attach it to pin 9 in setup().',
      'In loop(), sweep the angle from 0 to 180 and back with write() and short delays.',
      'The servo arm on the canvas turns in real time.',
    ],
    wiring: 'SIG→D9, +→5V, −→GND.',
    code: `#include < Servo.h >
    Servo s;
  void setup() {
    s.attach(9);
  }
  void loop() {
    for (int a = 0; a <= 180; a++) { s.write(a); delay(10); }
    for (int a = 180; a >= 0; a--) { s.write(a); delay(10); }
  } `,
    exampleId: 'servo_sweep',
  },

  {
    id: 'lcd',
    title: 'Displaying Text on an LCD',
    icon: '🖥️',
    level: 'Intermediate',
    tags: ['LCD', 'display', 'library'],
    summary: 'Show text and live values on a 16×2 I2C LCD using just four wires.',
    steps: [
      'Place an LCD 16×2 (I2C). Wire VCC→5V, GND→GND, SDA→A4, SCL→A5.',
      'Include <LiquidCrystal_I2C.h> and create the object with the address 0x27.',
      'In setup(), call lcd.init() and lcd.backlight(), then lcd.print().',
      'In loop(), use setCursor() to update a value on the second row.',
      'Run it and watch the display update in the simulation.',
    ],
    wiring: 'VCC→5V, GND→GND, SDA→A4 (Uno), SCL→A5 (Uno).',
    code: `#include < LiquidCrystal_I2C.h >
    LiquidCrystal_I2C lcd(0x27, 16, 2);
  void setup() {
    lcd.init();
    lcd.backlight();
    lcd.print("Hello, I2C!");
  }
  void loop() {
    lcd.setCursor(0, 1);
    lcd.print(millis() / 1000);
    delay(100);
  } `,
    exampleId: 'lcd_i2c',
  },

  {
    id: 'dht',
    title: 'Temperature & Humidity with DHT11',
    icon: '🌡️',
    level: 'Intermediate',
    tags: ['sensor', 'temperature', 'DHT'],
    summary: 'Read temperature and humidity from a DHT11 and print both to the Serial Monitor.',
    steps: [
      'Place a DHT11. Wire VCC→5V, DAT→D2, GND→GND.',
      'Include <DHT.h> and create a DHT object on pin 2.',
      'Call dht.begin() in setup().',
      'In loop(), read readTemperature() and readHumidity() and print them.',
      'Adjust the simulated values in the property panel (right-click the sensor → Properties).',
    ],
    wiring: 'VCC→5V, DAT→D2, GND→GND.',
    code: `#include < DHT.h >
    DHT dht(2, DHT11);
  void setup() {
    Serial.begin(9600);
    dht.begin();
  }
  void loop() {
    Serial.print("Temp: ");
    Serial.print(dht.readTemperature());
    Serial.print(" C  Hum: ");
    Serial.println(dht.readHumidity());
    delay(2000);
  } `,
    exampleId: 'temperature',
  },

  {
    id: 'ultrasonic',
    title: 'Measuring Distance with HC-SR04',
    icon: '📡',
    level: 'Intermediate',
    tags: ['sensor', 'ultrasonic', 'distance'],
    summary: 'Trigger an ultrasonic sensor and read the distance from the echo pulse.',
    steps: [
      'Place an HC-SR04. Wire VCC→5V, TRIG→D7, ECHO→D8, GND→GND.',
      'Set TRIG as OUTPUT and ECHO as INPUT.',
      'Send a 10 µs HIGH pulse on TRIG, then pulseIn(ECHO, HIGH).',
      'Convert the echo time to centimetres: cm = t / 58.0.',
      'Change the simulated distance in the property panel to see the reading change.',
    ],
    wiring: 'VCC→5V, TRIG→D7, ECHO→D8, GND→GND.',
    code: `void setup() {
    pinMode(7, OUTPUT);
    pinMode(8, INPUT);
    Serial.begin(9600);
  }
  void loop() {
    digitalWrite(7, LOW); delayMicroseconds(2);
    digitalWrite(7, HIGH); delayMicroseconds(10);
    digitalWrite(7, LOW);
  long t = pulseIn(8, HIGH);
    Serial.print(t / 58.0); Serial.println(" cm");
    delay(200);
  } `,
    exampleId: 'ultrasonic',
  },

  {
    id: 'serial-plotter',
    title: 'Graphing Data with the Serial Plotter',
    icon: '📈',
    level: 'Intermediate',
    tags: ['plotter', 'serial', 'data'],
    summary: 'Visualise numeric sensor data live using the built-in Serial Plotter.',
    steps: [
      'Write code that Serial.print()s numbers — one per line, or multiple values separated by spaces or tabs.',
      'Open the Plotter tab at the bottom of the workspace.',
      'Run the sketch; each numeric line is graphed in real time with its own colour.',
      'The default serial_plotter example plots a sine wave and a triangle wave.',
    ],
    wiring: 'Potentiometer optional — this works with any numeric serial output.',
    code: `void setup() {
    Serial.begin(9600);
  }
  void loop() {
  float sine = 512 + 400 * sin(millis() / 1000.0);
  float tri = (millis() / 10) % 1023;
    Serial.print(sine);
    Serial.print(" ");
    Serial.println(tri);
    delay(10);
  } `,
    exampleId: 'serial_plotter',
  },

  {
    id: 'rgb',
    title: 'Making Colours with an RGB LED',
    icon: '🌈',
    level: 'Intermediate',
    tags: ['PWM', 'RGB', 'LED'],
    summary: 'Mix the red, green and blue channels with PWM to create a rainbow.',
    steps: [
      'Place an RGB LED. Wire R→D9, G→D10, B→D11, common(−)→GND.',
      'Each channel is driven with analogWrite() between 0 and 255.',
      'Sweep the hue by cycling the three channels with different phase offsets.',
      'Watch the bulb change colour smoothly on the canvas.',
    ],
    wiring: 'R→D9, G→D10, B→D11, −→GND.',
    code: `void setup() {
    pinMode(9, OUTPUT); pinMode(10, OUTPUT); pinMode(11, OUTPUT);
  }
  void loop() {
    for (int i = 0; i < 255; i++) {
      analogWrite(9, 255 - i);   // red falls
      analogWrite(10, i);         // green rises
      analogWrite(11, 255 - i);   // blue falls
      delay(10);
    }
  } `,
    exampleId: 'rainbow_rgb',
  },

  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    icon: '⌨️',
    level: 'Beginner',
    tags: ['shortcuts', 'productivity', 'keyboard'],
    summary: 'Speed up your workflow with these keyboard shortcuts for circuit editing and simulation.',
    steps: [
      'Select a push button on the canvas and press Space or Enter to toggle it — no need to click.',
      'Press R to rotate the selected component by 90°.',
      'Press Delete or Backspace to delete the selected component or wire.',
      'Press F to fit the entire circuit in view.',
      'Press Escape to cancel wiring mode, deselect, or close dialogs.',
      'Ctrl+C / Ctrl+V to copy and paste selected components.',
      'Ctrl+D to duplicate the selected component.',
      'Ctrl+Z to undo, Ctrl+Y or Ctrl+Shift+Z to redo.',
      'Ctrl+A to select all components on the canvas.',
      'F5 to run the simulation, F6 to stop, F7 to pause/resume.',
      'Ctrl+S to save the project, Ctrl+Shift+S to export as JSON.',
    ],
    wiring: 'N/A — these are editor/canvas shortcuts.',
    code: `// Shortcuts are for the simulator UI, not Arduino code.`,
  },
];

/* ═══════════════════════════════════════════════════════════════
   HOME PAGE CONTENT
   ═══════════════════════════════════════════════════════════════ */

const GUIDE_HOME = {
  tagline: 'Simulate Arduino circuits in your browser — no install, no hardware.',
  intro: 'ArduSim is a full Arduino development environment that runs entirely in your browser. Write Arduino C++ in a VS Code-grade editor, drag components onto a live circuit canvas, wire them up, and hit Run — the simulation, Serial Monitor, oscilloscope and plotter all respond instantly.',
  features: [
    { icon: '⚡', title: 'Real-time Simulation', desc: 'Arduino code transpiles and runs in the browser at 0.25×–10× speed with infinite-loop protection.' },
    { icon: '⌨️', title: 'VS Code-grade Editor', desc: 'Monaco-powered editor with autocomplete, syntax highlighting, diagnostics and formatting.' },
    { icon: '🔧', title: 'Drag & Drop Circuitry', desc: '25+ components, click-to-connect wiring, grid snapping, rotate/duplicate/undo and PNG export.' },
    { icon: '📟', title: 'Serial Monitor & Plotter', desc: 'Live bi-directional serial I/O, multi-channel oscilloscope and a real-time data plotter.' },
    { icon: '📊', title: 'Pin Monitor', desc: 'A live colour-coded board showing the state and mode of every pin.' },
    { icon: '💾', title: 'Project Management', desc: 'Auto-save, portable JSON export/import, saved projects and one-click URL sharing.' },
  ],
  steps: [
    { title: 'Pick a component', desc: 'Browse the library on the right and click a component to place it on the canvas.' },
    { title: 'Wire it up', desc: 'Click a pin, then click another pin to draw a wire. Connect everything back to the board and ground.' },
    { title: 'Write the code', desc: 'Write or paste Arduino C++ in the editor — autocomplete and IntelliSense guide you.' },
    { title: 'Run & debug', desc: 'Press Run (F5) and watch your circuit react. Use the Serial Monitor, Oscilloscope and Pin Monitor to debug.' },
  ],
  cta: 'View Full Guide →',
};

/* ═══════════════════════════════════════════════════════════════
   GUIDE MANAGER — renders Home / Components / Tutorials
   ═══════════════════════════════════════════════════════════════ */

class GuideManager {
  constructor() {
    this._activeTab = 'home';
    this._compQuery = '';
    this._compCategory = 'all';
    this._selectedComp = null;
    this._selectedTutorial = null;
    this._bindReady = false;
  }

  /* ── bind header tabs / close (called when the app is ready) ── */
  bind() {
    if (this._bindReady) return;
    this._bindReady = true;
    document.querySelectorAll('.guide-tab').forEach(tab => {
      tab.addEventListener('click', () => this._switchTab(tab.dataset.tab));
    });
  }

  /* ── open / close ── */
  open(tab = 'home') {
    const overlay = document.getElementById('guide-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    document.body.classList.add('guide-open');
    this._switchTab(tab);
  }

  close() {
    const overlay = document.getElementById('guide-overlay');
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('guide-open');
  }

  isOpen() {
    const overlay = document.getElementById('guide-overlay');
    return !!(overlay && !overlay.classList.contains('hidden'));
  }

  /* ── tab switching ── */
  _switchTab(tab) {
    this._activeTab = tab;
    document.querySelectorAll('.guide-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === tab));
    ['home', 'components', 'libraries', 'tutorials'].forEach(t => {
      const pane = document.getElementById(`guide-pane-${t}`);
      if (pane) pane.classList.toggle('active', t === tab);
    });
    if (tab === 'home') this._renderHome();
    if (tab === 'components') this._renderComponents();
    if (tab === 'libraries') this._renderLibraries();
    if (tab === 'tutorials') this._renderTutorials();
    const body = document.getElementById('guide-body');
    if (body) body.scrollTop = 0;
  }

  /* ── Home ── */
  _renderHome() {
    const root = document.getElementById('guide-pane-home');
    if (!root) return;
    const defs = (window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS) || {};
    const compCount = Object.keys(defs).length;

    const features = GUIDE_HOME.features.map(f => `
      <div class="gh-feature">
        <div class="gh-feature-icon">${f.icon}</div>
        <div>
          <h4>${this._esc(f.title)}</h4>
          <p>${this._esc(f.desc)}</p>
        </div>
      </div>`).join('');

    const steps = GUIDE_HOME.steps.map((s, i) => `
      <div class="gh-step">
        <div class="gh-step-num">${i + 1}</div>
        <div>
          <h4>${this._esc(s.title)}</h4>
          <p>${this._esc(s.desc)}</p>
        </div>
      </div>`).join('');

    root.innerHTML = `
      <div class="guide-hero">
        <div class="guide-hero-badge">100% in-browser · No installation</div>
        <div class="guide-hero-icon">🎛️</div>
        <h1>Welcome to <span class="grad">ArduSim</span></h1>
        <p class="guide-hero-tag">${this._esc(GUIDE_HOME.tagline)}</p>
        <p class="guide-hero-intro">${this._esc(GUIDE_HOME.intro)}</p>
        <div class="guide-hero-cta">
          <button class="gh-btn gh-btn-primary" id="gh-go-sim">⚡ Launch the Simulator</button>
          <button class="gh-btn gh-btn-ghost" id="gh-go-comp">Browse Components</button>
          <button class="gh-btn gh-btn-ghost" id="gh-go-tut">Read the Tutorials</button>
          <button class="gh-btn gh-btn-ghost" id="gh-go-guide">View Full Guide</button>
        </div>
        <div class="guide-hero-stats">
          <span><b>${compCount}+</b> components</span>
          <span><b>2</b> boards</span>
          <span><b>${GUIDE_TUTORIALS.length}</b> tutorials</span>
        </div>
      </div>

      <div class="gh-section">
        <h2 class="gh-section-title">Key Features</h2>
        <div class="gh-features-grid">${features}</div>
      </div>

      <div class="gh-section">
        <h2 class="gh-section-title">Get started in 4 steps</h2>
        <div class="gh-steps">${steps}</div>
      </div>

      <div class="gh-cta-band">
        <div>
          <h3>Ready to build your first circuit?</h3>
          <p>Load the built-in examples or dive straight into the simulator.</p>
        </div>
        <button class="gh-btn gh-btn-primary" id="gh-go-sim2">Start Simulating →</button>
      </div>

      <footer class="guide-footer">ArduSim · Free, open-source Arduino simulator for education and hobbyists.</footer>`;

    const bind = (id, fn) => {
      const el = root.querySelector(id);
      if (el) el.addEventListener('click', fn);
    };
    const closeAnd = (tab) => () => { this._switchTab(tab); };
    bind('#gh-go-sim', () => this.close());
    bind('#gh-go-sim2', () => this.close());
    bind('#gh-go-comp', closeAnd('components'));
    bind('#gh-go-tut', closeAnd('tutorials'));
    bind('#gh-go-guide', () => window.open('docs/ArduSim_Guide.html', '_blank'));
  }

  /* ── Component reference ── */
  _renderComponents() {
    const root = document.getElementById('guide-pane-components');
    if (!root) return;

    root.innerHTML = `
      <div class="gc-toolbar">
        <div class="library-search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></svg>
          <input type="text" id="gc-search" placeholder="Search components…" aria-label="Search components" />
        </div>
        <div class="library-filters" id="gc-filters">
          <button class="filter-chip active" data-filter="all">All</button>
        </div>
      </div>
      <div class="gc-grid" id="gc-grid"></div>`;

    // Build category filters from the catalog
    const catalog = (window.ArduinoComponents && window.ArduinoComponents.COMPONENT_CATALOG) || [];
    const cats = catalog.map(g => g.category);
    const filterBox = root.querySelector('#gc-filters');
    cats.forEach(c => {
      const b = document.createElement('button');
      b.className = 'filter-chip';
      b.dataset.filter = c;
      b.textContent = c;
      filterBox.appendChild(b);
    });

    root.querySelector('#gc-search').addEventListener('input', (e) => {
      this._compQuery = e.target.value.toLowerCase().trim();
      this._renderCompGrid(root);
    });
    filterBox.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      this._compCategory = chip.dataset.filter || 'all';
      filterBox.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c === chip));
      this._renderCompGrid(root);
    });

    this._renderCompGrid(root);
  }

  _renderCompGrid(root) {
    const grid = root.querySelector('#gc-grid');
    if (!grid) return;
    const defs = (window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS) || {};
    const ids = Object.keys(defs).sort();
    const q = this._compQuery;
    const cat = this._compCategory;

    const filtered = ids.filter(id => {
      const def = defs[id];
      const g = GUIDE_COMPONENTS[id];
      if (cat !== 'all' && def.category !== cat) return false;
      if (q) {
        const hay = `${def.name} ${def.desc} ${g ? g.longDesc : ''} ${(def.category || '')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    grid.innerHTML = filtered.length ? filtered.map(id => {
      const def = defs[id];
      const g = GUIDE_COMPONENTS[id];
      const short = (g && g.longDesc ? g.longDesc.split('.')[0] + '.' : def.desc);
      return `
        <button class="gc-card" data-comp="${this._esc(id)}">
          <div class="gc-card-head">
            <span class="gc-card-icon">${def.icon || '🔧'}</span>
            <div>
              <strong>${this._esc(def.name)}</strong>
              <span class="gc-card-cat">${this._esc(def.category)}</span>
            </div>
          </div>
          <p class="gc-card-desc">${this._esc(short)}</p>
        </button>`;
    }).join('') : `<div class="library-empty">No components match your search.</div>`;

    grid.querySelectorAll('.gc-card').forEach(card => {
      card.addEventListener('click', () => {
        this._selectedComp = card.dataset.comp;
        this._renderCompDetail(root, card.dataset.comp);
      });
    });
  }

  _renderCompDetail(root, id) {
    const def = (window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS[id]);
    if (!def) return;
    const g = GUIDE_COMPONENTS[id] || {};

    // Pin table (merge runtime pins with documented descriptions)
    const grouped = g.grouped || (!def.pins || def.pins.length === 0);
    const pinRows = grouped ? (() => {
      // Grouped pins (boards) — document by function group
      return Object.entries(g.pins || {}).map(([key, info]) => `
        <tr>
          <td><code class="gc-pin-label">${this._esc(info.label)}</code></td>
          <td><span class="gc-type gc-type-${this._esc(info.type)}">${this._esc(GUIDE_PIN_TYPE_LABELS[info.type] || this._cap(info.type))}</span></td>
          <td>${this._esc(info.desc)}</td>
        </tr>`).join('');
    })() : (def.pins && def.pins.length) ? def.pins.map(p => {
      const pinInfo = (g.pins && g.pins[p.id]) || {};
      const label = pinInfo.label || p.label || p.id;
      const typeLabel = GUIDE_PIN_TYPE_LABELS[p.type] || this._cap(p.type);
      const desc = pinInfo.desc || '';
      const pinNum = (def.id === 'arduino_uno' || def.id === 'arduino_nano') && /^[AD]\d+$/.test(p.id)
        ? this._pinToUnoNum(p.id) : null;
      return `
        <tr>
          <td><code class="gc-pin-label">${this._esc(label)}</code></td>
          <td><span class="gc-type gc-type-${this._esc(p.type)}">${this._esc(typeLabel)}</span></td>
          <td>${pinNum !== null ? `Arduino pin <b>${pinNum}</b>` : ''} ${this._esc(desc)}</td>
        </tr>`;
    }).join('') : '';

    const pinBlock = pinRows ? `
      <div class="gc-detail-section">
        <h3>Pin configuration</h3>
        <table class="gc-pin-table">
          <thead><tr><th>Pin</th><th>Type</th><th>Function</th></tr></thead>
          <tbody>${pinRows}</tbody>
        </table>
      </div>` : '';

    const propsBlock = Object.keys(g.props || {}).length ? `
      <div class="gc-detail-section">
        <h3>Configurable properties</h3>
        <ul class="gc-props">
          ${Object.entries(g.props).map(([k, v]) => `<li><code>${this._esc(k)}</code> — ${this._esc(v)}</li>`).join('')}
        </ul>
      </div>` : '';

    const codeBlock = g.code ? `
      <div class="gc-detail-section">
        <h3>Example sketch</h3>
        <div class="gc-code-wrap">
          <button class="gh-btn gh-btn-ghost gh-btn-sm gc-copy" title="Copy code">Copy</button>
          <pre class="gc-code"><code>${this._esc(g.code.trim())}</code></pre>
        </div>
      </div>` : '';

    root.innerHTML = `
      <button class="gh-btn gh-btn-ghost gh-btn-sm gc-back">← Back to all components</button>
      <div class="gc-detail">
        <div class="gc-detail-head">
          <span class="gc-card-icon gc-card-icon-lg">${def.icon || '🔧'}</span>
          <div>
            <h2>${this._esc(def.name)}</h2>
            <span class="gc-card-cat">${this._esc(def.category)}</span>
          </div>
          <div class="gc-detail-actions">
            <button class="gh-btn gh-btn-primary gh-btn-sm" data-place="${this._esc(id)}">Place on canvas</button>
            ${g.exampleId ? `<button class="gh-btn gh-btn-ghost gh-btn-sm" data-load="${this._esc(g.exampleId)}">Load example</button>` : ''}
          </div>
        </div>

        <div class="gc-detail-section">
          <h3>Description</h3>
          <p class="gc-long-desc">${this._esc(g.longDesc || def.desc)}</p>
        </div>

        <div class="gc-detail-section">
          <h3>Typical use</h3>
          <p class="gc-long-desc">${this._esc(g.use || '—')}</p>
        </div>

        ${pinBlock}

        <div class="gc-detail-section">
          <h3>Typical wiring</h3>
          <p class="gc-wiring">${this._esc(g.wiring || '—')}</p>
        </div>

        ${propsBlock}
        ${codeBlock}
      </div>`;

    root.querySelector('.gc-back').addEventListener('click', () => {
      this._selectedComp = null;
      this._renderComponents();
    });
    const placeBtn = root.querySelector('[data-place]');
    if (placeBtn) placeBtn.addEventListener('click', () => {
      this._placeComponent(placeBtn.dataset.place);
    });
    const loadBtn = root.querySelector('[data-load]');
    if (loadBtn) loadBtn.addEventListener('click', () => {
      this._loadExample(loadBtn.dataset.load);
    });
    const copyBtn = root.querySelector('.gc-copy');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      const codeEl = root.querySelector('.gc-code code');
      if (codeEl) this._copyText(codeEl.textContent, copyBtn);
    });
  }

  /* ── Libraries ── */
  _renderLibraries() {
    const root = document.getElementById('guide-pane-libraries');
    if (!root) return;

    if (this._selectedLibrary) {
      this._renderLibraryDetail(root, this._selectedLibrary);
      return;
    }

    const categories = {};
    GUIDE_LIBRARIES.forEach(lib => {
      if (!categories[lib.category]) categories[lib.category] = [];
      categories[lib.category].push(lib);
    });

    const catOrder = ['Core', 'Display', 'Sensors', 'Actuators', 'Wireless', 'IoT', 'Audio', 'Output', 'Utility'];

    let gridHtml = '';
    catOrder.forEach(cat => {
      const libs = categories[cat];
      if (!libs || libs.length === 0) return;
      gridHtml += `<h3 class="gl-cat-title">${this._esc(cat)}</h3>`;
      gridHtml += `<div class="gl-grid">`;
      libs.forEach(lib => {
        const includeText = Array.isArray(lib.include) ? lib.include.join(', ') : lib.include;
        gridHtml += `
          <button class="gl-card" data-lib="${this._esc(lib.id)}">
            <div class="gl-card-icon">${lib.icon}</div>
            <div class="gl-card-body">
              <h4>${this._esc(lib.name)}</h4>
              <p class="gl-card-include">${this._esc(includeText)}</p>
              <p class="gl-card-desc">${this._esc(lib.desc.substring(0, 100))}${lib.desc.length > 100 ? '...' : ''}</p>
            </div>
          </button>`;
      });
      gridHtml += `</div>`;
    });

    root.innerHTML = `
      <div class="gt-head">
        <h2>📚 Arduino Libraries</h2>
        <p>Complete reference for all Arduino libraries supported by ArduSim. Click any library to see its API, example code, and compatible components.</p>
        <div class="gl-stats">
          <span><strong>${GUIDE_LIBRARIES.length}</strong> libraries</span>
          <span><strong>${catOrder.filter(c => categories[c]).length}</strong> categories</span>
        </div>
      </div>
      ${gridHtml}`;

    root.querySelectorAll('.gl-card').forEach(card => {
      card.addEventListener('click', () => {
        this._selectedLibrary = card.dataset.lib;
        this._renderLibraries();
      });
    });
  }

  _renderLibraryDetail(root, id) {
    const lib = GUIDE_LIBRARIES.find(l => l.id === id);
    if (!lib) return;

    const includeText = Array.isArray(lib.include) ? lib.include.join(', ') : lib.include;

    const apiRows = (lib.api || []).map(a => `
      <tr>
        <td><code>${this._esc(a.fn)}</code></td>
        <td>${this._esc(a.desc)}</td>
      </tr>`).join('');

    root.innerHTML = `
      <button class="gh-btn gh-btn-ghost gh-btn-sm gc-back">← All libraries</button>
      <div class="gc-detail">
        <div class="gc-detail-head">
          <span class="gc-card-icon gc-card-icon-lg">${lib.icon}</span>
          <div>
            <h2>${this._esc(lib.name)}</h2>
            <span class="gl-lib-cat">${this._esc(lib.category)}</span>
          </div>
          <div class="gc-detail-actions">
            ${lib.exampleId ? `<button class="gh-btn gh-btn-primary gh-btn-sm" data-load="${this._esc(lib.exampleId)}">Load Example</button>` : ''}
          </div>
        </div>

        <div class="gc-detail-section">
          <h3>Description</h3>
          <p class="gc-long-desc">${this._esc(lib.desc)}</p>
        </div>

        <div class="gc-detail-section">
          <h3>Include Directive</h3>
          <pre class="gc-code"><code>#include ${this._esc(includeText)}</code></pre>
        </div>

        <div class="gc-detail-section">
          <h3>API Reference</h3>
          <div class="gl-api-table-wrap">
            <table class="gl-api-table">
              <thead><tr><th>Function</th><th>Description</th></tr></thead>
              <tbody>${apiRows}</tbody>
            </table>
          </div>
        </div>

        <div class="gc-detail-section">
          <h3>Example Code</h3>
          <div class="gc-code-wrap">
            <button class="gh-btn gh-btn-ghost gh-btn-sm gc-copy" title="Copy code">Copy</button>
            <pre class="gc-code"><code>${this._esc(lib.code.trim())}</code></pre>
          </div>
        </div>
      </div>`;

    root.querySelector('.gc-back').addEventListener('click', () => {
      this._selectedLibrary = null;
      this._renderLibraries();
    });
    const loadBtn = root.querySelector('[data-load]');
    if (loadBtn) loadBtn.addEventListener('click', () => {
      this._loadExample(loadBtn.dataset.load);
    });
    const copyBtn = root.querySelector('.gc-copy');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      const codeEl = root.querySelector('.gc-code code');
      if (codeEl) this._copyText(codeEl.textContent, copyBtn);
    });
  }

  /* ── Tutorials ── */
  _renderTutorials() {
    const root = document.getElementById('guide-pane-tutorials');
    if (!root) return;

    if (this._selectedTutorial) {
      this._renderTutorialDetail(root, this._selectedTutorial);
      return;
    }

    root.innerHTML = `
      <div class="gt-head">
        <h2>How to Use ArduSim</h2>
        <p>Step-by-step guides with ready-to-load examples. Every tutorial ends with a circuit you can open with one click.</p>
      </div>
      <div class="gt-grid">
        ${GUIDE_TUTORIALS.map(t => `
          <button class="gt-card" data-tut="${this._esc(t.id)}">
            <div class="gt-card-icon">${t.icon}</div>
            <div class="gt-card-body">
              <div class="gt-card-meta">
                <span class="gt-level gt-level-${this._esc(t.level.toLowerCase())}">${this._esc(t.level)}</span>
                <span class="gt-count">${(t.steps || []).length} steps</span>
              </div>
              <h3>${this._esc(t.title)}</h3>
              <p>${this._esc(t.summary)}</p>
              <div class="example-tags">${(t.tags || []).map(tag => `<span class="tag">${this._esc(tag)}</span>`).join('')}</div>
            </div>
          </button>`).join('')}
      </div>`;

    root.querySelectorAll('.gt-card').forEach(card => {
      card.addEventListener('click', () => {
        this._selectedTutorial = card.dataset.tut;
        this._renderTutorials();
      });
    });
  }

  _renderTutorialDetail(root, id) {
    const t = GUIDE_TUTORIALS.find(x => x.id === id);
    if (!t) return;
    const steps = (t.steps || []).map((s, i) => `
      <li class="gt-step">
        <span class="gt-step-num">${i + 1}</span>
        <span>${this._esc(s)}</span>
      </li>`).join('');

    root.innerHTML = `
      <button class="gh-btn gh-btn-ghost gh-btn-sm gc-back">← All tutorials</button>
      <div class="gc-detail">
        <div class="gc-detail-head">
          <span class="gc-card-icon gc-card-icon-lg">${t.icon}</span>
          <div>
            <h2>${this._esc(t.title)}</h2>
            <span class="gt-level gt-level-${this._esc(t.level.toLowerCase())}">${this._esc(t.level)}</span>
          </div>
          <div class="gc-detail-actions">
            ${t.exampleId ? `<button class="gh-btn gh-btn-primary gh-btn-sm" data-load="${this._esc(t.exampleId)}">Load this example</button>` : ''}
          </div>
        </div>

        <div class="gc-detail-section">
          <h3>Overview</h3>
          <p class="gc-long-desc">${this._esc(t.summary)}</p>
        </div>

        <div class="gc-detail-section">
          <h3>Steps</h3>
          <ol class="gt-steps">${steps}</ol>
        </div>

        <div class="gc-detail-section">
          <h3>Wiring</h3>
          <p class="gc-wiring">${this._esc(t.wiring || '—')}</p>
        </div>

        <div class="gc-detail-section">
          <h3>Sketch</h3>
          <div class="gc-code-wrap">
            <button class="gh-btn gh-btn-ghost gh-btn-sm gc-copy" title="Copy code">Copy</button>
            <pre class="gc-code"><code>${this._esc(t.code.trim())}</code></pre>
          </div>
        </div>
      </div>`;

    root.querySelector('.gc-back').addEventListener('click', () => {
      this._selectedTutorial = null;
      this._renderTutorials();
    });
    const loadBtn = root.querySelector('[data-load]');
    if (loadBtn) loadBtn.addEventListener('click', () => this._loadExample(loadBtn.dataset.load));
    const copyBtn = root.querySelector('.gc-copy');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      const codeEl = root.querySelector('.gc-code code');
      if (codeEl) this._copyText(codeEl.textContent, copyBtn);
    });
  }

  /* ── actions that talk to the app ── */
  _placeComponent(id) {
    const app = window.App;
    if (app && app.canvas && app.canvas.startPlacing) {
      this.close();
      app.canvas.startPlacing(id);
      const def = (window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS[id]);
      app.showToast(`${def ? def.name : id} selected — click on canvas to place`, 'info');
    }
  }

  _loadExample(exampleId) {
    const app = window.App;
    if (app && app.loadExampleById) {
      this.close();
      app.loadExampleById(exampleId);
    }
  }

  _copyText(text, btn) {
    const done = () => {
      if (btn) {
        const old = btn.textContent;
        btn.textContent = '✓ Copied';
        setTimeout(() => { btn.textContent = old; }, 1500);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => this._fallbackCopy(text, done));
    } else {
      this._fallbackCopy(text, done);
    }
  }

  _fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { }
    document.body.removeChild(ta);
    done();
  }

  /* ── helpers ── */
  _esc(s) {
    return String(s == null ? '' : s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  }

  _cap(s) {
    return String(s).charAt(0).toUpperCase() + String(s).slice(1);
  }

  _pinToUnoNum(pinId) {
    const m = /^A(\d+)$/.exec(pinId);
    if (m) return 14 + parseInt(m[1], 10);
    const d = /^D(\d+)$/.exec(pinId);
    if (d) return parseInt(d[1], 10);
    return null;
  }
}

/* ── expose ── */
window.GuideManager = new GuideManager();
window.GuideManagerData = { GUIDE_COMPONENTS, GUIDE_TUTORIALS, GUIDE_HOME };
window.GuidePinDescs = (function () {
  // flat map: component id -> pin id -> { label, type, desc }
  const map = {};
  Object.entries(GUIDE_COMPONENTS).forEach(([cid, info]) => {
    if (info.pins) {
      map[cid] = info.pins;
    }
  });
  return map;
})();