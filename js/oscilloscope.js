/* -------------------------------------------------------
   oscilloscope.js — Real-time Oscilloscope with Enhanced Grid & Slider
   ------------------------------------------------------- */

'use strict';

class Oscilloscope {
  constructor(canvasEl) {
    this.canvas  = canvasEl;
    this.ctx     = canvasEl.getContext('2d');
    this.paused  = false;

    /* Config */
    this.ch1Pin   = 'A0';
    this.ch2Pin   = 'none';
    this.timebase = 500; // ms per div
    this.gridDivs = 10;
    this.voltageDivs = 8; // Number of vertical divisions

    /* Horizontal offset (slider value) - percentage of viewport */
    this.horizontalOffset = 0; // 0 to 100 (0 = latest data, 100 = oldest)
    this._offsetSamples = 0; // Calculated sample offset

    /* Data buffers */
    this.ch1Data = [];
    this.ch2Data = [];
    this.maxSamples = 2000;

    /* Signal grid configuration */
    this.signalLevels = {
      HIGH: 1023,
      LOW: 0,
      threshold: 512
    };

    /* Colors */
    this.CH1_COLOR = '#73ff00';
    // this.CH1_COLOR = '#00e5ff';
    this.CH2_COLOR = '#ff9800';
    this.GRID_COLOR = 'rgba(255,255,255,0.06)';
    this.GRID_MAJOR = 'rgba(255,255,255,0.12)';
    this.GRID_TRIGGER = 'rgba(255,0,0,0.15)';
    this.BG_COLOR   = '#0a0e14';
    this.TRIGGER_COLOR = '#ff0044';

    /* Trigger settings */
    this.triggerChannel = 1;
    this.triggerLevel = 512;
    this.triggerRising = true;
    this.triggerEnabled = false;
    this._triggerPosition = 0;

    /* RAF */
    this._rafId  = null;
    this._lastSampleTime = 0;

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(canvasEl.parentElement || canvasEl);
    this._resize();

    this._startRender();
  }

  _resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.canvas.width  = parent.clientWidth  || 800;
    this.canvas.height = parent.clientHeight || 120;
  }

  _startRender() {
    const loop = () => {
      this._render();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  /* Called every tick from the app (e.g., every 50ms) */
  sample(simTime, pinStates) {
    if (this.paused) return;
    const now = performance.now();
    if (now - this._lastSampleTime < 10) return; // max 100 samples/sec — use real clock
    this._lastSampleTime = now;

    const states = (pinStates && typeof pinStates === 'object') ? pinStates : {};

    const v1 = this._readChannel(this.ch1Pin, states);
    const v2 = this._readChannel(this.ch2Pin, states);

    this.ch1Data.push({ t: simTime, v: v1 });
    this.ch2Data.push({ t: simTime, v: v2 });

    if (this.ch1Data.length > this.maxSamples) this.ch1Data.shift();
    if (this.ch2Data.length > this.maxSamples) this.ch2Data.shift();

    // Update trigger position
    if (this.triggerEnabled) {
      this._updateTrigger();
    }
  }

  _readChannel(pinName, pinStates) {
    if (!pinName || pinName === 'none') return 0;

    // Probe channel — read from probe component's runtimeState
    if (pinName.startsWith('probe:')) {
      const probeId = pinName.slice(6);
      const probe = this._findProbe(probeId);
      return probe && probe.runtimeState ? (probe.runtimeState.voltage || 0) : 0;
    }

    // Standard Arduino pin
    const pinNum = this._pinNameToNum(pinName);
    return pinNum !== null ? (pinStates[`pin_${pinNum}`] || 0) : 0;
  }

  _findProbe(probeId) {
    const canvas = window.CircuitCanvas;
    if (!canvas) return null;
    const comps = canvas.components || [];
    // Check dedicated oscilloscope probes first
    if (probeId === 'osc_probe_ch1' || probeId === 'osc_probe_ch2') {
      for (let i = 0; i < comps.length; i++) {
        if (comps[i].type === probeId) return comps[i];
      }
    }
    // Fallback: generic probe
    for (let i = 0; i < comps.length; i++) {
      if (comps[i].type === 'probe' && comps[i].id === probeId) return comps[i];
    }
    return null;
  }

  getProbes() {
    const canvas = window.CircuitCanvas;
    if (!canvas) return [];
    const comps = canvas.components || [];
    const probes = [];
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i];
      if (c.type === 'osc_probe_ch1' || c.type === 'osc_probe_ch2') {
        probes.push({ id: c.type, label: c.runtimeState?.label || c.type });
      }
    }
    return probes;
  }

  refreshProbeOptions(ch1El, ch2El) {
    const probes = this.getProbes();
    [ch1El, ch2El].forEach(sel => {
      if (!sel) return;
      const prevVal = sel.value; // preserve current selection
      const existing = sel.querySelectorAll('.probe-option');
      existing.forEach(el => el.remove());
      probes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = 'probe:' + p.id;
        opt.textContent = p.label;
        opt.className = 'probe-option';
        sel.appendChild(opt);
      });
      // Restore selection if still present
      if (prevVal && sel.querySelector(`option[value="${prevVal}"]`)) {
        sel.value = prevVal;
      }
      // Sync internal state
      if (sel.id === 'osc-ch1') this.ch1Pin = sel.value;
      if (sel.id === 'osc-ch2') this.ch2Pin = sel.value;
    });
  }

  _updateTrigger() {
    const data = this.triggerChannel === 1 ? this.ch1Data : this.ch2Data;
    if (data.length < 2) return;

    const triggerValue = this.triggerLevel;
    let found = false;

    for (let i = data.length - 2; i >= 0; i--) {
      const current = data[i];
      const next = data[i + 1];
      
      if (this.triggerRising) {
        if (current.v <= triggerValue && next.v > triggerValue) {
          this._triggerPosition = data.length - i;
          found = true;
          break;
        }
      } else {
        if (current.v >= triggerValue && next.v < triggerValue) {
          this._triggerPosition = data.length - i;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      this._triggerPosition = 0;
    }
  }

  _render() {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;
    if (!W || !H) return;

    ctx.fillStyle = this.BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // Calculate visible data range based on horizontal offset
    const now = this.ch1Data.length > 0 ? this.ch1Data[this.ch1Data.length - 1].t : 0;
    const windowMs = this.timebase * this.gridDivs;
    const totalDataMs = this.ch1Data.length > 0 ? this.ch1Data[this.ch1Data.length - 1].t - this.ch1Data[0].t : windowMs;
    
    // Calculate offset in time
    const offsetMs = (this.horizontalOffset / 100) * Math.max(totalDataMs - windowMs, 0);
    
    // Determine view window
    let startT = now - windowMs - offsetMs;
    let endT = now - offsetMs;

    // If we have less data than window, shift to show latest
    if (this.ch1Data.length > 0 && startT < this.ch1Data[0].t) {
      startT = this.ch1Data[0].t;
      endT = startT + windowMs;
    }

    this._drawGrid(ctx, W, H, startT, endT);
    this._drawTriggerIndicator(ctx, W, H);
    this._drawWaveform(ctx, W, H, this.ch1Data, this.CH1_COLOR, 1023, startT, endT, 'CH1');
    if (this.ch2Pin !== 'none') {
      this._drawWaveform(ctx, W, H, this.ch2Data, this.CH2_COLOR, 1023, startT, endT, 'CH2');
    }
    this._drawLabels(ctx, W, H, startT, endT);
    this._drawSliderInfo(ctx, W, H);
  }

  _drawGrid(ctx, W, H, startT, endT) {
    const divW = W / this.gridDivs;
    const divH = H / this.voltageDivs;
    const timePerDiv = (endT - startT) / this.gridDivs;

    // Vertical lines (time divisions)
    for (let i = 0; i <= this.gridDivs; i++) {
      const x = i * divW;
      ctx.strokeStyle = i % 5 === 0 ? this.GRID_MAJOR : this.GRID_COLOR;
      ctx.lineWidth = i % 5 === 0 ? 1 : 0.5;
      ctx.beginPath(); 
      ctx.moveTo(x, 0); 
      ctx.lineTo(x, H); 
      ctx.stroke();

      // Time labels
      if (i < this.gridDivs) {
        const time = startT + (i * timePerDiv);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${time.toFixed(0)}ms`, x + divW/2, H - 4);
      }
    }

    // Horizontal lines (voltage divisions)
    for (let i = 0; i <= this.voltageDivs; i++) {
      const y = i * divH;
      ctx.strokeStyle = i % 4 === 0 ? this.GRID_MAJOR : this.GRID_COLOR;
      ctx.lineWidth = i % 4 === 0 ? 1 : 0.5;
      ctx.beginPath(); 
      ctx.moveTo(0, y); 
      ctx.lineTo(W, y); 
      ctx.stroke();

      // Voltage labels
      const voltage = ((this.voltageDivs - i) / this.voltageDivs) * 5; // 0-5V
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${voltage.toFixed(1)}V`, 4, y - 2);
    }

    // Center line (0V reference) - brighter
    const zeroY = H - (0 / 5) * H * 0.9 - H * 0.05;
    if (zeroY > 0 && zeroY < H) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); 
      ctx.moveTo(0, zeroY); 
      ctx.lineTo(W, zeroY); 
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5V reference line (top)
    const fiveVY = H - (5 / 5) * H * 0.9 - H * 0.05;
    if (fiveVY > 0 && fiveVY < H) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); 
      ctx.moveTo(0, fiveVY); 
      ctx.lineTo(W, fiveVY); 
      ctx.stroke();
    }

    // Grid labels
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.timebase}ms/div`, W - 4, 12);
    ctx.fillText('5V/div', W - 4, H - 4);
  }

  _drawTriggerIndicator(ctx, W, H) {
    if (!this.triggerEnabled || this._triggerPosition === 0) return;

    const triggerX = (this._triggerPosition / this.maxSamples) * W;
    if (triggerX > 0 && triggerX < W) {
      ctx.strokeStyle = this.TRIGGER_COLOR;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(triggerX, 0);
      ctx.lineTo(triggerX, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Trigger label
      ctx.fillStyle = this.TRIGGER_COLOR;
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▼ TRIG', triggerX, 14);
    }
  }

  _drawWaveform(ctx, W, H, data, color, maxVal, startT, endT, channel) {
    if (data.length < 2) return;

    const windowMs = endT - startT;
    if (windowMs <= 0) return;

    // Filter data for digital signals
    const threshold = this.signalLevels.threshold;
    const isDigital = data.some(d => d.v === 0 || d.v === 1023);

    ctx.strokeStyle = color;
    ctx.lineWidth = isDigital ? 2 : 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = isDigital ? 8 : 4;
    ctx.beginPath();

    let first = true;
    let lastX = 0, lastY = 0;

    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      if (pt.t < startT || pt.t > endT) continue;
      
      const x = ((pt.t - startT) / windowMs) * W;
      const y = H - (pt.v / maxVal) * H * 0.9 - H * 0.05;

      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        // For digital signals, draw perfect square waves
        if (isDigital) {
          const prev = data[i-1];
          if (prev && (prev.v <= threshold && pt.v > threshold) || (prev.v >= threshold && pt.v < threshold)) {
            // Draw vertical line at transition
            ctx.lineTo(x, lastY);
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        } else {
          ctx.lineTo(x, y);
        }
      }
      lastX = x;
      lastY = y;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawLabels(ctx, W, H, startT, endT) {
    // Channel labels
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    
    ctx.fillStyle = this.CH1_COLOR;
    const ch1Val = this.ch1Data.length > 0 ? this.ch1Data[this.ch1Data.length - 1].v : 0;
    const ch1Label = this.ch1Pin && this.ch1Pin.startsWith('probe:')
      ? this.ch1Pin.slice(6).replace('probe', 'P')
      : this.ch1Pin;
    ctx.fillText(`CH1: ${ch1Label} (${ch1Val.toFixed(1)})`, 8, 16);

    if (this.ch2Pin !== 'none') {
      ctx.fillStyle = this.CH2_COLOR;
      const ch2Val = this.ch2Data.length > 0 ? this.ch2Data[this.ch2Data.length - 1].v : 0;
      const ch2Label = this.ch2Pin && this.ch2Pin.startsWith('probe:')
        ? this.ch2Pin.slice(6).replace('probe', 'P')
        : this.ch2Pin;
      ctx.fillText(`CH2: ${ch2Label} (${ch2Val.toFixed(1)})`, 8, 30);
    }

    // Time window info
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Window: ${(endT - startT).toFixed(0)}ms`, W - 8, 28);

    // Sample count
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(`Samples: ${this.ch1Data.length}`, 8, H - 4);

    // Digital signal indicator
    if (this.ch1Data.length > 0) {
      const isDigital = this.ch1Data.some(d => d.v === 0 || d.v === 1023);
      if (isDigital) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.textAlign = 'right';
        ctx.fillText('DIGITAL', W - 8, H - 20);
      }
    }

    // Pause indicator
    if (this.paused) {
      ctx.fillStyle = 'rgba(255,150,0,0.8)';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⏸ PAUSED', W/2, 20);
    }

    // Trigger status
    if (this.triggerEnabled) {
      ctx.fillStyle = this.TRIGGER_COLOR;
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`TRIG: CH${this.triggerChannel} ${this.triggerRising ? '↑' : '↓'} ${this.triggerLevel}`, W - 8, 40);
    }
  }

  _drawSliderInfo(ctx, W, H) {
    // Draw horizontal slider indicator
    if (this.horizontalOffset > 0) {
      const sliderWidth = 100;
      const sliderX = W - sliderWidth - 8;
      const sliderY = H - 20;
      
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(sliderX, sliderY, sliderWidth, 4);
      
      const pos = sliderX + (this.horizontalOffset / 100) * sliderWidth;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(pos - 2, sliderY - 2, 4, 8);
      
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '7px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`↔ ${this.horizontalOffset}%`, W/2, H - 4);
    }
  }

  setChannel(ch, pinName) {
    if (ch === 1) { this.ch1Pin = pinName; this.ch1Data = []; }
    if (ch === 2) { this.ch2Pin = pinName; this.ch2Data = []; }
  }

  setTimebase(ms) {
    this.timebase = parseInt(ms) || 500;
  }

  setVoltageDivs(divs) {
    this.voltageDivs = parseInt(divs) || 8;
  }

  setHorizontalOffset(percent) {
    this.horizontalOffset = Math.max(0, Math.min(100, parseInt(percent) || 0));
  }

  setTrigger(channel, level, rising) {
    this.triggerChannel = channel;
    this.triggerLevel = parseInt(level) || 512;
    this.triggerRising = rising !== undefined ? rising : true;
    this.triggerEnabled = true;
    this._triggerPosition = 0;
  }

  disableTrigger() {
    this.triggerEnabled = false;
    this._triggerPosition = 0;
  }

  clear() {
    this.ch1Data = [];
    this.ch2Data = [];
    this._triggerPosition = 0;
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  _pinNameToNum(name) {
    const map = { 
      A0:14, A1:15, A2:16, A3:17, A4:18, A5:19, 
      D3:3, D5:5, D6:6, D9:9, D10:10, D11:11, D13:13 
    };
    return map[name] !== undefined ? map[name] : null;
  }
}

window.OscilloscopeClass = Oscilloscope;