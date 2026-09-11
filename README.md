# ArduSim — Online Arduino Circuit Simulator

<div align="center">
  <h3>⚡ Real-time Arduino C++ execution, interactive component drag-and-drop, serial monitor & oscilloscope — all in the browser. No installation needed.</h3>
</div>

---

## ✨ Key Features

### 🖥️ Professional Code Editor
- **Monaco Editor Integration**: Full VS Code-grade editing experience.
- **Syntax Highlighting**: Custom Monarch tokenizer tailored for Arduino C++ syntax, keywords, and constants.
- **IntelliSense & Autocomplete**: Built-in completions with documentation for Arduino core APIs (`pinMode`, `digitalWrite`, `analogRead`, `delay`, `millis`, etc.), libraries (`Wire`, `SPI`, `EEPROM`, `Servo`, `LiquidCrystal`), and snippets (`setup`, `loop`, `for`, `blink-led`).
- **Real-time Diagnostics & Squiggles**: Automatic syntax validation and runtime error markers.
- **Font Controls & Word Wrap**: Easy readability toggles and keybindings.

### ⚡ Robust Arduino Execution Engine
- **In-Browser C++ Transpiler**: Converts Arduino code to safe, asynchronous JavaScript execution on the fly.
- **Infinite-Loop Protection**: Automatically throttles non-yielding tight loops to prevent browser hanging.
- **Real-time FPS & Timing**: Status bar displays exact simulation time and frame-rates.
- **Library Support**:
  - `Servo` (angle writes and positioning)
  - `LiquidCrystal` & `LiquidCrystal_I2C` (16x2 and 20x4 text display, cursor control)
  - `Wire` (I2C communication stubs)
  - `SPI` (bus communication stubs)
  - `EEPROM` (512-byte persistent simulation)
  - `Zigbee` (mesh networking with Coordinator/End Device architecture)
  - `ESP-NOW` (peer-to-peer wireless communication)
  - `BluetoothSerial` (Classic Bluetooth SPP)
  - `CoAP` / `coap-simple` (Constrained Application Protocol)
  - `PubSubClient` (MQTT publish/subscribe)
  - `WiFi` (Wi-Fi connection simulation)
  - `HTTPClient` & `WebServer` (HTTP requests and server)
  - `DHT` (DHT11/22 temperature & humidity sensor)
  - `NewPing` (HC-SR04 ultrasonic sensor)
  - `Adafruit_SSD1306` & `Adafruit_GFX` (OLED display)
  - `Adafruit_MPU6050` (accelerometer/gyroscope)
  - `BME280` (weather sensor)
  - `FastLED` & `Adafruit_NeoPixel` (LED strip control)
  - `MFRC522` (RFID reader)
  - `IRremote` (infrared remote)
  - `TinyGPS++` (GPS NMEA parsing)
  - `ArduinoJson` (JSON serialization)
  - `Stepper` (stepper motor control)
  - `SoftwareSerial` (software serial ports)
  - `tone()` / `noTone()` (Web Audio API synthesis)
- **Speed Control**: Variable simulation speeds (0.25× to 10×).

### 🎨 High-Performance Circuit Canvas
- **Vector-based HTML5 Canvas**: Smooth rendering with 60 FPS pan and zoom.
- **Grid Snapping**: Precision component positioning with visual alignment.
- **Interactive Wiring**: Click-to-connect pin-to-pin wiring with live signal coloring (HIGH/LOW/PWM).
- **Clipboard & Manipulation**: `Ctrl+C` / `Ctrl+V`, `Ctrl+D` (Duplicate), `R` (Rotate), `Del` (Delete), and Undo/Redo history stack.
- **Context Menu**: Right-click actions for properties, rotation, duplication, and deletion.
- **Exporting**: One-click circuit diagram export to PNG.

### 📊 Diagnostic Instruments
- **Serial Monitor**:
  - Live bi-directional communication.
  - Multi-line buffer (up to 5,000 lines).
  - Search & filter live serial output.
  - HEX inspection and microsecond timestamps.
  - One-click clipboard copy and text export.
- **Digital Oscilloscope**: Real-time multi-channel waveform capture for PWM and analog signals with configurable timebase and edge triggering.
- **Serial Plotter**: Graphs numeric `Serial.print` / `Serial.println` values in real time.
- **Pin Monitor**: Live color-coded status board of all 20 Arduino pins (D0–D13, A0–A5) with level indicators, direction modes, and PWM bars.

### 💾 Project & State Management
- **Debounced Auto-Save**: Seamless persistence to `localStorage` with quota protection.
- **Unsaved Changes Indicator**: Warning dot and `beforeunload` browser guard.
- **Project Naming**: Rename projects directly in the navigation header.
- **Portable JSON File Export/Import**: Full schema migration and backward compatibility.
- **Instant URL Sharing**: Unicode-safe base64 project encoding for sharing circuits via a single link.
- **Progressive Web App (PWA)**: Installable as a standalone desktop or mobile web application.

### 📱 Remote Control (Phone Control)
- **Control from Your Phone**: Toggle digital pins, adjust analog sliders, and send serial messages from your phone.
- **No App Install Required**: Opens in any mobile browser — uses MQTT over WebSocket for real-time communication.
- **Session-Based**: Each simulation gets a unique session code. Share the URL with anyone on the same network.
- **Full Pin Control**: Toggle D0-D13, adjust A0-A5 (0-1023), control PWM pins D3/D5/D6/D9/D10/D11 (0-255).
- **Serial Communication**: Send text to the Arduino's Serial input from your phone.

---

## 🧭 Interface Guide

### Top Navigation Bar
A clean, compact toolbar keeps everything within reach without cluttering the workspace:

| Control | Purpose |
|---|---|
| **Examples** | Open the built-in example project gallery. |
| **Speed** | Adjust simulation speed from 0.25× to 10×. |
| **Board** | Switch between Arduino Uno and ESP32 DevKit V1 targets. |
| **Run / Stop / Pause** | Control the simulation lifecycle. |
| **File ▾** (dropdown) | **New**, **Save**, **Download**, **Load**, **Saved Projects**, and **Share**. |
| **View ▾** (dropdown) | Focus the **Code** editor, **Circuit** canvas, or **Serial** monitor. |
| **Theme & Shortcuts** | Toggle dark/light theme and view the keyboard reference. |
| **Remote** (phone icon) | Open remote control modal — shows session code and URL for phone access. |

> The **File** and **View** menus are dropdowns that collapse secondary actions, keeping the header short and the canvas maximized. Menus close on outside click or <kbd>ESC</kbd>.

### Main Workspace
- **Left** — Code Editor with line numbers, cursor position, and live compile diagnostics.
- **Center** — Circuit Canvas with zoom controls, undo/redo, clear, and PNG export.
- **Right** — Searchable Component Library.
- **Bottom** — Tabbed instruments: Serial Monitor, Output, Oscilloscope, Plotter, and Pin Monitor.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| <kbd>F5</kbd> | Compile & Run simulation | Global |
| <kbd>F6</kbd> | Stop simulation | Global |
| <kbd>F7</kbd> | Pause / Resume simulation | Global |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save project to file | Global |
| <kbd>Ctrl</kbd> + <kbd>R</kbd> | Verify / Compile sketch | Editor |
| <kbd>Ctrl</kbd> + <kbd>F</kbd> | Find & Replace | Editor |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> | Format code | Editor |
| <kbd>Ctrl</kbd> + <kbd>Space</kbd> | Trigger autocomplete | Editor |
| <kbd>Del</kbd> / <kbd>Backspace</kbd> | Delete selected component or wire | Canvas |
| <kbd>R</kbd> | Rotate selected component (90°) | Canvas |
| <kbd>Ctrl</kbd> + <kbd>C</kbd> | Copy selected component | Canvas |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Paste component | Canvas |
| <kbd>Ctrl</kbd> + <kbd>D</kbd> | Duplicate selected component | Canvas |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo canvas action | Canvas |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> | Redo canvas action | Canvas |
| <kbd>F</kbd> | Fit circuit to view | Canvas |
| <kbd>ESC</kbd> | Cancel wiring / placing / deselect / close menus | Global |

---

## 📦 Component Library

- **Boards**: Arduino Uno R3 (ATmega328P), ESP32 DevKit V1
- **Outputs**: Standard LED (Red, Green, Blue, Yellow, Orange, White), RGB LED, Multi-LED Array, 16x2 LCD Display (HD44780/I2C), 20x4 LCD Display (HD44780/I2C), OLED Display (SSD1306), Piezo Buzzer, 7-Segment Display, NeoPixel Strip, NeoPixel Ring, NeoPixel 8x8 Matrix, MAX7219 LED Matrix, ILI9341 TFT, 12V Bulb
- **Inputs**: Push Button, Potentiometer (Rotary Angle Sensor), Joystick, 4x4 Keypad, Rotary Encoder, DIP Switch
- **Actuators**: Micro Servo Motor (SG90), Continuous Rotation Servo, DC Motor, Relay Module, Stepper Motor (28BYJ-48), L298N Motor Driver
- **Audio**: MAX98357A I2S Amplifier, 4 Ohm Speaker
- **Sensors**: DHT11 Temperature & Humidity, HC-SR04 Ultrasonic, LDR Light Sensor, PIR Motion, MPU6050 Accelerometer/Gyro, DS3231 RTC, IR Obstacle, Flex Sensor, Thermistor, LM35 Temperature, BME280 Weather, VL53L0X Proximity, MFRC522 RFID, IR Receiver, HC-05 Bluetooth, NEO-6M GPS
- **Passives & Power**: Resistors (custom resistance), Capacitors, Diode (1N4007), Breadboard, 5V Power Supply, Ground (GND) Rail, MB102 Power Supply, Bench Power Supply
- **Digital ICs**: 555 Timer, 74HC00 (NAND), 74HC04 (NOT), 74HC08 (AND), 74HC32 (OR), 74HC74 (Dual DFF), 74HC47 (BCD→7Seg), 74HC148 (Encoder), 74HC595 (Shift Register), 74HC138 (Decoder), 74HC165 (PISO), 74HC193 (Counter), 74HC245 (Buffer), LM741 Op-Amp
- **Instruments**: Multimeter, Function Generator, DSO 4-Channel Oscilloscope
- **Probes**: Oscilloscope (2ch), DSO (4ch), Logic Analyzer (8ch)

---

## 📱 Remote Control

Control your simulated Arduino circuit from your phone! No app install required.

### Quick Start
1. Build your circuit and write your Arduino sketch
2. Click **Run** to start the simulation
3. Click the **Remote button** (phone icon) in the header
4. Copy the URL and open it on your phone
5. Toggle digital pins, adjust analog sliders, and send serial messages

### How It Works
The simulator and phone communicate through a public MQTT broker (HiveMQ) over WebSocket. Each simulation gets a unique session code so multiple users don't interfere with each other.

```
Phone (browser)  ←→  HiveMQ Broker  ←→  Simulator (browser)
```

### Phone Interface
- **Digital Pins (D0-D13)**: Tap to toggle HIGH/LOW
- **Analog Pins (A0-A5)**: Slide to set value 0-1023
- **PWM Pins (D3,D5,D6,D9,D0,D11)**: Slide to set duty cycle 0-255
- **Serial Monitor**: Send text to Arduino's Serial input

### Example Projects
- **Remote Control LEDs**: Toggle 4 LEDs from your phone
- **Remote Servo Control**: Use A0 slider to control servo angle
- **Zigbee Sender/Receiver**: Basic Coordinator→End Device communication
- **Zigbee Sensor Network**: End Device reads potentiometer, sends via Zigbee
- **Zigbee LED Control**: Bidirectional ON/OFF commands with ACK
- **ESP-NOW Sender/Receiver**: Peer-to-peer wireless data transfer
- **Bluetooth Serial Bridge**: ESP32-to-ESP32 Bluetooth communication
- **CoAP Client/Server**: RESTful IoT protocol demonstration
- **MQTT ESP32**: Publish/Subscribe messaging via broker

> See the **Examples** panel in the simulator for these projects.

---

## 📡 Wireless Communication Protocols

The simulator supports multiple wireless communication protocols for multi-board projects. Each protocol uses a shared global bus to deliver messages between boards in real-time.

### ESP-NOW (Peer-to-Peer)
- **Library**: `<esp_now.h>` + `<WiFi.h>`
- **Pattern**: Direct peer-to-peer communication with MAC addresses
- **Features**: Unicast & broadcast, send/receive callbacks, peer management
- **Examples**: ESP-NOW Sender/Receiver, Bidirectional Communication, DIP Switch to 8 LEDs

### Zigbee (Mesh Network)
- **Library**: `<Zigbee.h>`
- **Pattern**: Coordinator/End Device architecture with short addresses
- **Features**: Channel & PAN ID configuration, node discovery, ping, bidirectional messaging
- **Architecture**:
  - Board 0 = Coordinator (address `0x0000`)
  - Board 1 = End Device (address `0x0001`)
- **API**:
  ```cpp
  Zigbee.begin(channel, panId);      // Initialize network
  Zigbee.send(addr, data, len);      // Send data
  Zigbee.onReceive(callback);        // Register receive handler
  Zigbee.getNodeAddress();           // Get short address
  Zigbee.getPanId();                 // Get PAN ID
  Zigbee.ping(destAddr);             // Ping a node
  ```
- **Examples**: Zigbee Sender/Receiver, Sensor Network, Bidirectional LED Control

### Bluetooth Serial
- **Library**: `<BluetoothSerial.h>`
- **Pattern**: Classic Bluetooth SPP between two ESP32 boards
- **Features**: Serial-like communication over Bluetooth
- **Example**: Bluetooth Serial Bridge

### CoAP (Constrained Application Protocol)
- **Library**: `<coap.h>` or `<coap-simple.h>`
- **Pattern**: RESTful IoT protocol (GET/PUT/POST/DELETE)
- **Features**: Resource discovery, confirmable/non-confirmable messages
- **Examples**: CoAP Client/Server, DIP Switch to 8 LEDs

### MQTT (Message Queuing Telemetry Transport)
- **Library**: `<PubSubClient.h>`
- **Pattern**: Publish/Subscribe messaging via broker
- **Features**: Topic-based routing, QoS levels
- **Example**: MQTT ESP32

---

## 🚀 Getting Started

No build step or Node.js environment is required. You can host this static web app on GitHub Pages, Netlify, Vercel, or any standard HTTP web server.

1. Clone this repository:
   ```bash
   git clone https://github.com/smandal439/Online-Circuit-Simulator.git
   ```
2. Open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).

---

## 🗂️ Project Structure

```
├── index.html          # Application shell & layout
├── remote.html         # Phone remote control page
├── css/
│   ├── style.css       # Main styling, themes, and responsive rules
│   └── remote.css      # Phone remote control styles
├── js/
│   ├── app.js          # Core app logic, UI bindings, dropdowns
│   ├── canvas.js       # Circuit canvas, wiring, pan/zoom
│   ├── simulator.js    # Arduino code transpilation & execution
│   ├── editor.js       # Monaco editor integration
│   ├── serial_monitor.js # Serial monitor
│   ├── oscilloscope.js # Oscilloscope rendering
│   ├── plotter.js      # Serial plotter
│   ├── output.js       # Compile & debug output
│   ├── storage.js      # localStorage persistence & file IO
│   ├── remote-control.js # Simulator-side MQTT bridge for remote control
│   ├── remote.js       # Phone-side MQTT client
│   ├── components/     # Component definitions (boards, LEDs, sensors, etc.)
│   ├── libraries/      # Arduino library simulation plugins (38+ libraries)
│   └── utils.js        # Shared helpers
├── Examples/           # 108+ example project JSON files
├── circuits/            # Circuit JSON data used by examples
├── projects/
│   └── saved/           # User-exported/saved project JSON snapshots
├── docs/
│   ├── ArduSim_Guide.html       # Detailed architecture and usage guide
│   ├── PLAN_dso_fullscreen.md   # DSO implementation plan
│   └── dso-implementation-notes.txt
├── server.js           # Node.js backend (optional, for saved projects)
├── data/                # Runtime SQLite database (created by server.js)
├── sw.js               # Service worker for PWA
└── manifest.json       # PWA manifest
```

---

## Add A Custom Example

1. Build or load your circuit and code in the simulator.
2. Open **File** and choose **Save as Example**.
3. Enter the example name, description, and comma-separated tags.
4. Put the downloaded JSON file in `Examples/`.
5. Run the Node server and refresh the simulator; the new file will appear automatically in **Examples**.

For static hosting without `/api/examples`, also add the file's base name to the fallback list in `window.loadExamplesFromFiles` in `js/simulator.js`.

The downloaded file includes the required `id`, `name`, `icon`, `desc`, `tags`, `circuit`, and `code` fields. Use a unique example name so its generated `id` does not collide with another example.

## 📄 License

MIT License. Open source and free for educational and commercial use.