/* -------------------------------------------------------
   remote-control.js — Simulator-side MQTT bridge
   Creates a dedicated MQTT connection to relay pin
   commands between a phone remote and the simulator.
   ------------------------------------------------------- */

'use strict';

class RemoteControl {
  constructor() {
    this.client = null;
    this.sessionId = null;
    this.connected = false;
    this._onStateUpdate = null; // callback(url, sessionId)
    this._onDisconnect = null;
    this._broker = null;
  }

  _getBrokerUrl() {
    if (this._broker) return this._broker;
    const cfg = window.ArduSimMQTT || {};
    return cfg.url || 'wss://broker.hivemq.com:8884/mqtt';
  }

  start(sessionId) {
    if (this.client) this.stop();
    if (!sessionId || typeof window.mqtt !== 'function') return;

    this.sessionId = sessionId;
    const clientId = `ArduSimRC_${Math.random().toString(36).slice(2, 18)}`;

    try {
      this.client = window.mqtt.connect(this._getBrokerUrl(), {
        clientId,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        keepalive: 30,
      });
    } catch (e) {
      console.warn('[Remote] MQTT connect failed:', e);
      return;
    }

    this.client.on('connect', () => {
      this.connected = true;
      console.log('[Remote] Connected to broker, session:', sessionId);
      // Subscribe to commands from phone
      this.client.subscribe(`ardusim/cmd/${sessionId}`);
      this.client.subscribe(`ardusim/serial/${sessionId}`);
      this._notifyState();
    });

    this.client.on('message', (topic, payload) => {
      const msg = payload.toString();
      try {
        const data = JSON.parse(msg);
        this._handleMessage(data);
      } catch (e) { /* ignore malformed */ }
    });

    this.client.on('error', (err) => {
      console.warn('[Remote] MQTT error:', err.message);
    });

    this.client.on('close', () => {
      this.connected = false;
    });
  }

  _handleMessage(data) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.isRunning) return;

    if (data.type === 'pin') {
      // { type: 'pin', pin: 'pin_13', value: 1 }
      if (typeof data.pin === 'string' && typeof data.value === 'number') {
        sim.setPinState(data.pin, data.value);
      }
    } else if (data.type === 'serial') {
      // { type: 'serial', text: 'hello' }
      if (typeof data.text === 'string') {
        sim.sendSerialInput(data.text);
      }
    } else if (data.type === 'get_pins') {
      // Phone requests full pin state snapshot
      this._publishPinStates();
    }
  }

  _publishPinStates() {
    if (!this.client || !this.connected || !this.sessionId) return;
    const sim = window.ArduinoSim;
    if (!sim) return;

    const states = {};
    for (const [k, v] of Object.entries(sim.pinStates)) {
      states[k] = v;
    }
    this.client.publish(`ardusim/state/${this.sessionId}`, JSON.stringify(states));
  }

  publishPinChange(pinKey, value) {
    if (!this.client || !this.connected || !this.sessionId) return;
    this.client.publish(
      `ardusim/pin/${this.sessionId}`,
      JSON.stringify({ pin: pinKey, value })
    );
  }

  publishSerial(text) {
    if (!this.client || !this.connected || !this.sessionId) return;
    this.client.publish(
      `ardusim/serial-out/${this.sessionId}`,
      JSON.stringify({ text })
    );
  }

  _notifyState() {
    if (!this._onStateUpdate) return;
    const host = window.location.hostname || '127.0.0.1';
    const isGitHubPages = host.endsWith('.github.io');
    const pagePath = isGitHubPages ? '/remote.html' : '/remote';
    let basePath = '';
    if (isGitHubPages) {
      const segs = window.location.pathname.split('/').filter(Boolean);
      if (segs.length > 0) basePath = '/' + segs[0];
    }
    const sessionQS = `?session=${this.sessionId}`;

    // If already on HTTPS, use it directly
    if (window.location.protocol === 'https:') {
      const port = window.location.port || '443';
      const portStr = (isGitHubPages || !port || port === '443') ? '' : `:${port}`;
      this._onStateUpdate(`https://${host}${portStr}${basePath}${pagePath}${sessionQS}`, this.sessionId);
      return;
    }

    // On HTTP — fetch /api/host to check if HTTPS is available
    fetch('/api/host').then(r => r.json()).then(info => {
      const httpsPort = info.httpsPort;
      if (httpsPort && httpsPort !== 443) {
        this._onStateUpdate(`https://${host}:${httpsPort}${basePath}${pagePath}${sessionQS}`, this.sessionId);
      } else {
        this._onStateUpdate(`http://${host}${basePath}${pagePath}${sessionQS}`, this.sessionId);
      }
    }).catch(() => {
      const port = window.location.port || '3000';
      const portStr = (isGitHubPages || !port || port === '3000') ? '' : `:${port}`;
      this._onStateUpdate(`http://${host}${portStr}${basePath}${pagePath}${sessionQS}`, this.sessionId);
    });
  }

  stop() {
    if (this.client) {
      try { this.client.end(true); } catch (e) { /* noop */ }
      this.client = null;
    }
    this.connected = false;
    this.sessionId = null;
  }
}

window.RemoteControl = RemoteControl;
