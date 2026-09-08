/* ═══════════════════════════════════════════════════════
   remote.js — Phone-side MQTT client for remote control
   Connects to HiveMQ broker, sends pin commands,
   receives serial output and pin state updates.
   ═══════════════════════════════════════════════════════ */

'use strict';

class ArduSimRemote {
  constructor() {
    this.client = null;
    this.sessionId = null;
    this.connected = false;
    this.broker = 'wss://broker.hivemq.com:8884/mqtt';
    this.pinUpdateCount = 0;

    // Pin name → pinKey mapping
    // Arduino Uno digital pins (D0-D13)
    this.digitalPins = [];
    for (let i = 0; i <= 13; i++) {
      this.digitalPins.push({ pin: i, key: `pin_${i}`, label: `D${i}` });
    }
    // ESP32 extra digital pins (not on Uno)
    this.esp32DigitalPins = [
      { pin: 14, key: 'pin_14', label: 'D14' },
      { pin: 15, key: 'pin_15', label: 'D15' },
      { pin: 16, key: 'pin_16', label: 'D16' },
      { pin: 17, key: 'pin_17', label: 'D17' },
      { pin: 18, key: 'pin_18', label: 'D18' },
      { pin: 19, key: 'pin_19', label: 'D19' },
      { pin: 21, key: 'pin_21', label: 'D21' },
      { pin: 22, key: 'pin_22', label: 'D22' },
      { pin: 23, key: 'pin_23', label: 'D23' },
      { pin: 25, key: 'pin_25', label: 'D25' },
      { pin: 26, key: 'pin_26', label: 'D26' },
      { pin: 27, key: 'pin_27', label: 'D27' },
    ];

    // Arduino Uno analog pins (A0-A5 → pin_14-pin_19)
    this.analogPins = [
      ...Array.from({ length: 6 }, (_, i) => ({
        pin: i, key: `pin_${14 + i}`, label: `A${i}`, max: 1023, type: 'analog'
      })),
    ];

    // PWM pins (both Uno and ESP32)
    this.pwmPins = [
      { pin: 3,  key: 'pin_3',  label: 'D3 (PWM)',  max: 255, type: 'pwm' },
      { pin: 5,  key: 'pin_5',  label: 'D5 (PWM)',  max: 255, type: 'pwm' },
      { pin: 6,  key: 'pin_6',  label: 'D6 (PWM)',  max: 255, type: 'pwm' },
      { pin: 9,  key: 'pin_9',  label: 'D9 (PWM)',  max: 255, type: 'pwm' },
      { pin: 10, key: 'pin_10', label: 'D10 (PWM)', max: 255, type: 'pwm' },
      { pin: 11, key: 'pin_11', label: 'D11 (PWM)', max: 255, type: 'pwm' },
    ];

    // ESP32 analog-only input pins (ADC1, safe to use with WiFi)
    this.esp32AnalogPins = [
      { pin: 36, key: 'pin_36', label: 'VP (A0)', max: 4095, type: 'analog' },
      { pin: 39, key: 'pin_39', label: 'VN (A1)', max: 4095, type: 'analog' },
      { pin: 34, key: 'pin_34', label: 'D34',      max: 4095, type: 'analog' },
      { pin: 35, key: 'pin_35', label: 'D35',      max: 4095, type: 'analog' },
      { pin: 32, key: 'pin_32', label: 'D32 (A4)', max: 4095, type: 'analog' },
      { pin: 33, key: 'pin_33', label: 'D33 (A5)', max: 4095, type: 'analog' },
    ];

    // ESP32 extra PWM pins
    this.esp32PwmPins = [
      { pin: 4,  key: 'pin_4',  label: 'D4 (PWM)',  max: 255, type: 'pwm' },
      { pin: 12, key: 'pin_12', label: 'D12 (PWM)', max: 255, type: 'pwm' },
      { pin: 13, key: 'pin_13', label: 'D13 (PWM)', max: 255, type: 'pwm' },
      { pin: 14, key: 'pin_14', label: 'D14 (PWM)', max: 255, type: 'pwm' },
      { pin: 15, key: 'pin_15', label: 'D15 (PWM)', max: 255, type: 'pwm' },
      { pin: 16, key: 'pin_16', label: 'D16 (PWM)', max: 255, type: 'pwm' },
      { pin: 17, key: 'pin_17', label: 'D17 (PWM)', max: 255, type: 'pwm' },
      { pin: 18, key: 'pin_18', label: 'D18 (PWM)', max: 255, type: 'pwm' },
      { pin: 19, key: 'pin_19', label: 'D19 (PWM)', max: 255, type: 'pwm' },
      { pin: 21, key: 'pin_21', label: 'D21 (PWM)', max: 255, type: 'pwm' },
      { pin: 22, key: 'pin_22', label: 'D22 (PWM)', max: 255, type: 'pwm' },
      { pin: 23, key: 'pin_23', label: 'D23 (PWM)', max: 255, type: 'pwm' },
    ];

    this._init();
  }

  _init() {
    // Check URL for session param
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('session');
    if (sessionParam) {
      document.getElementById('session-id').value = sessionParam;
      // Auto-connect after short delay
      setTimeout(() => this._connect(), 300);
    }

    document.getElementById('btn-connect').addEventListener('click', () => this._connect());
    document.getElementById('btn-disconnect').addEventListener('click', () => this._disconnect());
    document.getElementById('btn-send').addEventListener('click', () => this._sendSerial());
    document.getElementById('serial-text').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._sendSerial();
    });

    this._buildDigitalPins();
    this._buildAnalogPins();
    this._initBoardSelector();
  }

  _initBoardSelector() {
    const btns = document.querySelectorAll('.board-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const board = btn.dataset.board;
        document.body.classList.toggle('board-esp32', board === 'esp32');
        document.body.classList.toggle('board-uno', board === 'uno');
      });
    });
    // Default to Uno
    document.body.classList.add('board-uno');
  }

  _connect() {
    const input = document.getElementById('session-id');
    const id = (input.value || '').trim();
    if (!id) { input.focus(); return; }

    this.sessionId = id;
    this._setStatus('connecting');

    try {
      this.client = window.mqtt.connect(this.broker, {
        clientId: `ArduSimPhone_${Math.random().toString(36).slice(2, 18)}`,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        keepalive: 30,
      });
    } catch (e) {
      this._setStatus('error');
      document.getElementById('connect-hint').textContent = 'Failed to connect to broker';
      return;
    }

    this.client.on('connect', () => {
      this.connected = true;
      this._setStatus('connected');
      document.getElementById('connect-section').classList.add('hidden');
      document.getElementById('control-panel').classList.remove('hidden');
      // Subscribe to state updates and serial output
      this.client.subscribe(`ardusim/state/${id}`);
      this.client.subscribe(`ardusim/pin/${id}`);
      this.client.subscribe(`ardusim/serial-out/${id}`);
      // Request full pin state
      this._publish({ type: 'get_pins' });
    });

    this.client.on('message', (topic, payload) => {
      try {
        const data = JSON.parse(payload.toString());
        if (topic.includes('/state/')) this._handlePinStates(data);
        else if (topic.includes('/pin/')) this._handlePinChange(data);
        else if (topic.includes('/serial-out/')) this._handleSerial(data);
      } catch (e) { /* ignore */ }
    });

    this.client.on('error', () => {
      this._setStatus('error');
      document.getElementById('connect-hint').textContent = 'Connection error — try again';
    });

    this.client.on('close', () => {
      if (this.connected) {
        this.connected = false;
        this._setStatus('disconnected');
      }
    });
  }

  _disconnect() {
    if (this.client) { try { this.client.end(true); } catch (e) {} }
    this.client = null;
    this.connected = false;
    this.sessionId = null;
    document.getElementById('control-panel').classList.add('hidden');
    document.getElementById('connect-section').classList.remove('hidden');
    this._setStatus('disconnected');
  }

  _setStatus(state) {
    const el = document.getElementById('conn-status');
    el.className = 'conn-status';
    const map = {
      connecting: 'Connecting...',
      connected: 'Connected',
      disconnected: 'Disconnected',
      error: 'Error',
    };
    el.textContent = map[state] || state;
    if (state === 'connected') el.classList.add('connected');
  }

  _publish(data) {
    if (!this.client || !this.connected) return;
    this.client.publish(`ardusim/cmd/${this.sessionId}`, JSON.stringify(data));
  }

  // ── Digital Pins ──
  _buildDigitalPins() {
    const grid = document.getElementById('digital-pins');
    // Arduino Uno D0-D13
    for (const p of this.digitalPins) {
      const btn = document.createElement('button');
      btn.className = 'pin-btn';
      btn.dataset.key = p.key;
      btn.innerHTML = `<span class="pin-label">${p.label}</span><span class="pin-state">OFF</span>`;
      btn.addEventListener('click', () => {
        const isOn = btn.classList.contains('on');
        const val = isOn ? 0 : 1;
        this._publish({ type: 'pin', pin: p.key, value: val });
        this._updateDigitalUI(btn, val);
      });
      grid.appendChild(btn);
    }
    // ESP32 extra pins
    for (const p of this.esp32DigitalPins) {
      const btn = document.createElement('button');
      btn.className = 'pin-btn esp32-only';
      btn.dataset.key = p.key;
      btn.innerHTML = `<span class="pin-label">${p.label}</span><span class="pin-state">OFF</span>`;
      btn.addEventListener('click', () => {
        const isOn = btn.classList.contains('on');
        const val = isOn ? 0 : 1;
        this._publish({ type: 'pin', pin: p.key, value: val });
        this._updateDigitalUI(btn, val);
      });
      grid.appendChild(btn);
    }
  }

  _updateDigitalUI(btn, val) {
    if (val) {
      btn.classList.add('on');
      btn.querySelector('.pin-state').textContent = 'ON';
    } else {
      btn.classList.remove('on');
      btn.querySelector('.pin-state').textContent = 'OFF';
    }
  }

  // ── Analog / PWM Pins ──
  _buildAnalogPins() {
    const grid = document.getElementById('analog-pins');

    // Arduino Uno A0-A5
    for (const p of this.analogPins) {
      this._addSlider(grid, p, '0 – 1023');
    }
    // Arduino Uno PWM
    for (const p of this.pwmPins) {
      this._addSlider(grid, p, '0 – 255');
    }
    // ESP32 analog-only input pins (ADC1)
    for (const p of this.esp32AnalogPins) {
      this._addSlider(grid, p, '0 – 4095', 'esp32-only');
    }
    // ESP32 extra PWM pins
    for (const p of this.esp32PwmPins) {
      this._addSlider(grid, p, '0 – 255', 'esp32-only');
    }
  }

  _addSlider(grid, p, rangeText, extraClass) {
    const div = document.createElement('div');
    div.className = 'analog-pin' + (extraClass ? ` ${extraClass}` : '');
    div.dataset.key = p.key;
    div.innerHTML = `
      <div class="pin-header">
        <span class="pin-name">${p.label}</span>
        <span class="pin-value" id="val-${p.key}">0</span>
      </div>
      <div class="pin-range">${rangeText}</div>
      <input type="range" min="0" max="${p.max}" value="0" step="1">
    `;
    const slider = div.querySelector('input[type="range"]');
    let debounceTimer = null;
    slider.addEventListener('input', () => {
      const val = parseInt(slider.value, 10);
      div.querySelector('.pin-value').textContent = val;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this._publish({ type: 'pin', pin: p.key, value: val });
      }, 50);
    });
    grid.appendChild(div);
  }

  // ── Serial ──
  _sendSerial() {
    const input = document.getElementById('serial-text');
    const text = input.value;
    if (!text) return;
    this._publish({ type: 'serial', text });
    this._appendSerial(`> ${text}`, 'info');
    input.value = '';
  }

  _handleSerial(data) {
    if (data.text) this._appendSerial(data.text);
  }

  _appendSerial(text, cls) {
    const output = document.getElementById('serial-output');
    const empty = output.querySelector('.serial-empty');
    if (empty) empty.remove();
    const line = document.createElement('div');
    line.className = 'serial-line' + (cls ? ` ${cls}` : '');
    line.textContent = text;
    output.appendChild(line);
    // Keep max 100 lines
    while (output.children.length > 100) output.removeChild(output.firstChild);
    output.scrollTop = output.scrollHeight;
  }

  // ── Incoming state ──
  _handlePinStates(states) {
    // Full state snapshot: { pin_0: 0, pin_13: 1, ... }
    for (const [key, val] of Object.entries(states)) {
      // Update digital buttons
      const btn = document.querySelector(`.pin-btn[data-key="${key}"]`);
      if (btn) this._updateDigitalUI(btn, val);
      // Update analog sliders
      const slider = document.querySelector(`.analog-pin[data-key="${key}"] input[type="range"]`);
      if (slider) {
        slider.value = val;
        const valEl = document.getElementById(`val-${key}`);
        if (valEl) valEl.textContent = val;
      }
    }
  }

  _handlePinChange(data) {
    if (data.pin && typeof data.value === 'number') {
      this.pinUpdateCount++;
      document.getElementById('pin-count').textContent = `${this.pinUpdateCount} pins updated`;
      // Update UI for this specific pin
      const btn = document.querySelector(`.pin-btn[data-key="${data.pin}"]`);
      if (btn) this._updateDigitalUI(btn, data.value);
      const slider = document.querySelector(`.analog-pin[data-key="${data.pin}"] input[type="range"]`);
      if (slider) {
        slider.value = data.value;
        const valEl = document.getElementById(`val-${data.pin}`);
        if (valEl) valEl.textContent = data.value;
      }
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.remote = new ArduSimRemote();
});
