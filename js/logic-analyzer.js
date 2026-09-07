/* ═══════════════════════════════════════════════════════
   logic-analyzer.js — Multi-channel digital Logic Analyzer
   Captures and displays digital pin states (HIGH/LOW) over time.
   Dual cursor measurement: frequency, period, duty cycle.
   ═══════════════════════════════════════════════════════ */

'use strict';

class LogicAnalyzer {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.paused = false;

    /* Channel configuration — up to 8 digital channels */
    this.channels = [
      { pin: 'D2',  label: 'CH1', color: '#00e5ff', enabled: true },
      { pin: 'D3',  label: 'CH2', color: '#ff9800', enabled: true },
      { pin: 'D4',  label: 'CH3', color: '#4caf50', enabled: true },
      { pin: 'D5',  label: 'CH4', color: '#ff5722', enabled: true },
      { pin: 'D6',  label: 'CH5', color: '#ab47bc', enabled: false },
      { pin: 'D7',  label: 'CH6', color: '#ffee33', enabled: false },
      { pin: 'D8',  label: 'CH7', color: '#e91e63', enabled: false },
      { pin: 'D13', label: 'CH8', color: '#76ff03', enabled: false },
    ];

    /* Timing */
    this.timebase = 200; // ms per division
    this.gridDivs = 10;

    /* Data — ring buffer per channel */
    this.maxSamples = 4000;
    this.data = {};
    this.channels.forEach(ch => { this.data[ch.pin] = []; });

    /* Dual cursor measurement */
    this.cursorA = null; // Cursor A (left click) — time value in ms
    this.cursorB = null; // Cursor B (right click) — time value in ms
    this._cursorAx = null; // pixel position for rendering
    this._cursorBx = null;

    /* Colors */
    this.BG_COLOR = '#0a0e14';
    this.GRID_COLOR = 'rgba(255,255,255,0.06)';
    this.GRID_MAJOR = 'rgba(255,255,255,0.12)';
    this.LABEL_BG = 'rgba(255,255,255,0.05)';
    this.TEXT_COLOR = 'rgba(255,255,255,0.4)';
    this.CURSOR_A_COLOR = '#ffe600';
    this.CURSOR_B_COLOR = '#00e5ff';

    /* RAF */
    this._rafId = null;
    this._lastSampleTime = 0;

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(canvasEl.parentElement || canvasEl);
    this._resize();

    /* Drag state */
    this._dragging = null; // 'A' or 'B' or null
    this._dragOffsetX = 0;
    this._dragThreshold = 8; // px proximity to grab a cursor
    this._wasDragged = false; // suppress click after drag
    this._clickSuppressed = false; // suppress click when mousedown hit a cursor

    /* Mouse events — left click = Cursor A, right click = Cursor B, drag to reposition */
    canvasEl.addEventListener('mousedown', (e) => {
      const rect = canvasEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const hit = this._hitTestCursor(x);
      if (hit) {
        this._dragging = hit;
        this._wasDragged = false;
        this._clickSuppressed = true;
        const cursorX = hit === 'A' ? this._cursorAx : this._cursorBx;
        this._dragOffsetX = x - (cursorX || x);
        e.preventDefault();
        canvasEl.style.cursor = 'ew-resize';
      }
    });

    canvasEl.addEventListener('mouseup', (e) => {
      if (this._dragging) {
        this._dragging = null;
        canvasEl.style.cursor = 'default';
        e.preventDefault();
        return;
      }
    });

    canvasEl.addEventListener('click', (e) => {
      if (this._clickSuppressed) { this._clickSuppressed = false; return; }
      if (this._wasDragged) { this._wasDragged = false; return; }
      const rect = canvasEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      this._setCursorA(x);
    });
    canvasEl.addEventListener('contextmenu', (e) => {
      if (this._clickSuppressed) { this._clickSuppressed = false; e.preventDefault(); return; }
      if (this._wasDragged) { this._wasDragged = false; e.preventDefault(); return; }
      e.preventDefault();
      const rect = canvasEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      this._setCursorB(x);
    });
    canvasEl.addEventListener('mousemove', (e) => {
      const rect = canvasEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      this._mouseX = x;

      if (this._dragging) {
        const labelW = 60;
        const plotW = canvasEl.width - labelW;
        const clampedX = Math.max(labelW, Math.min(labelW + plotW, x - this._dragOffsetX));
        const t = this._pixelToTime(clampedX);
        if (t !== null) {
          this._wasDragged = true;
          if (this._dragging === 'A') {
            this.cursorA = t;
            this._cursorAx = clampedX;
          } else {
            this.cursorB = t;
            this._cursorBx = clampedX;
          }
          // Keep A < B
          if (this.cursorA !== null && this.cursorB !== null && this.cursorA > this.cursorB) {
            [this.cursorA, this.cursorB] = [this.cursorB, this.cursorA];
            [this._cursorAx, this._cursorBx] = [this._cursorBx, this._cursorAx];
            this._dragging = this._dragging === 'A' ? 'B' : 'A';
          }
        }
        e.preventDefault();
      } else {
        canvasEl.style.cursor = this._hitTestCursor(x) ? 'ew-resize' : 'default';
      }
    });
    canvasEl.addEventListener('mouseleave', () => {
      this._mouseX = null;
      if (this._dragging) {
        this._dragging = null;
        canvasEl.style.cursor = 'default';
      }
    });

    this._startRender();
  }

  _resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.canvas.width = parent.clientWidth || 800;
    this.canvas.height = parent.clientHeight || 150;
  }

  _startRender() {
    const loop = () => {
      this._render();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  /* ── Cursor hit testing for drag ── */
  _hitTestCursor(x) {
    const threshold = this._dragThreshold;
    if (this._cursorAx !== null && Math.abs(x - this._cursorAx) <= threshold) return 'A';
    if (this._cursorBx !== null && Math.abs(x - this._cursorBx) <= threshold) return 'B';
    return null;
  }

  /* ── Cursor placement ── */
  _pixelToTime(x) {
    const { canvas } = this;
    const W = canvas.width;
    const labelW = 60;
    const plotW = W - labelW;
    if (x < labelW || plotW <= 0) return null;
    const activeChannels = this.channels.filter(ch => ch.enabled);
    const windowMs = this.timebase * this.gridDivs;
    let now = 0;
    for (const ch of activeChannels) {
      const d = this.data[ch.pin];
      if (d.length > 0) {
        const last = d[d.length - 1].t;
        if (last > now) now = last;
      }
    }
    const startT = now - windowMs;
    return startT + ((x - labelW) / plotW) * windowMs;
  }

  _timeToPixel(t, startT, windowMs, labelW, plotW) {
    return labelW + ((t - startT) / windowMs) * plotW;
  }

  _setCursorA(x) {
    const t = this._pixelToTime(x);
    if (t === null) return;
    if (this.cursorA !== null && this.cursorB !== null) {
      // Both cursors set — clicking clears both and starts fresh
      this.cursorA = null;
      this.cursorB = null;
      this._cursorAx = null;
      this._cursorBx = null;
    } else if (this.cursorA === null) {
      this.cursorA = t;
      this._cursorAx = x;
    } else {
      // Cursor A already set — replace it
      this.cursorA = t;
      this._cursorAx = x;
    }
  }

  _setCursorB(x) {
    const t = this._pixelToTime(x);
    if (t === null) return;
    if (this.cursorA !== null && this.cursorB !== null) {
      // Both cursors set — right-click clears both
      this.cursorA = null;
      this.cursorB = null;
      this._cursorAx = null;
      this._cursorBx = null;
    } else if (this.cursorB === null && this.cursorA !== null) {
      this.cursorB = t;
      this._cursorBx = x;
      // Ensure A < B
      if (this.cursorA > this.cursorB) {
        [this.cursorA, this.cursorB] = [this.cursorB, this.cursorA];
        [this._cursorAx, this._cursorBx] = [this._cursorBx, this._cursorAx];
      }
    }
  }

  /* ── Measurement calculations ── */
  _measureBetweenCursors(ch) {
    if (this.cursorA === null || this.cursorB === null) return null;
    const data = this.data[ch.pin];
    if (data.length < 2) return null;

    const tA = Math.min(this.cursorA, this.cursorB);
    const tB = Math.max(this.cursorA, this.cursorB);
    const dt = tB - tA;
    if (dt <= 0) return null;

    // Find all edges (rising and falling) across entire dataset
    const edges = [];
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      if (prev.v !== curr.v) {
        edges.push({ t: curr.t, type: curr.v === 1 ? 'rise' : 'fall' });
      }
    }

    // Filter edges within cursor range (with 1ms tolerance)
    const margin = 1;
    const rangeEdges = edges.filter(e => e.t >= tA - margin && e.t <= tB + margin);

    // Count rising edges in range
    const risingEdges = rangeEdges.filter(e => e.type === 'rise');

    // Calculate high time between cursors
    let highTime = 0;
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      const segStart = Math.max(prev.t, tA);
      const segEnd = Math.min(curr.t, tB);
      if (segEnd > segStart && prev.v === 1) {
        highTime += segEnd - segStart;
      }
    }

    // Frequency from rising edges
    let period = null;
    let frequency = null;
    if (risingEdges.length >= 2) {
      const firstT = risingEdges[0].t;
      const lastT = risingEdges[risingEdges.length - 1].t;
      period = (lastT - firstT) / (risingEdges.length - 1);
      frequency = 1000 / period; // Hz (period is in ms)
    }

    const dutyCycle = dt > 0 ? (highTime / dt) * 100 : null;

    // State at each cursor
    const stateA = this._getStateAtTime(ch, tA);
    const stateB = this._getStateAtTime(ch, tB);

    return {
      dt, period, frequency, dutyCycle,
      risingEdges: risingEdges.length, stateA, stateB,
      voltageA: stateA ? 5 : 0,
      voltageB: stateB ? 5 : 0,
    };
  }

  _getStateAtTime(ch, t) {
    const data = this.data[ch.pin];
    if (data.length === 0) return 0;
    let lastVal = data[0].v;
    for (let i = 0; i < data.length; i++) {
      if (data[i].t > t) break;
      lastVal = data[i].v;
    }
    return lastVal;
  }

  /* ── Called every simulation tick ── */
  sample(simTime, pinStates) {
    if (this.paused) return;
    const now = performance.now();
    if (now - this._lastSampleTime < 10) return;
    this._lastSampleTime = now;

    const states = (pinStates && typeof pinStates === 'object') ? pinStates : {};

    for (const ch of this.channels) {
      if (!ch.enabled) continue;
      const raw = this._readChannel(ch.pin, states);
      const high = raw > 0;
      this.data[ch.pin].push({ t: simTime, v: high ? 1 : 0 });
      if (this.data[ch.pin].length > this.maxSamples) this.data[ch.pin].shift();
    }
  }

  _readChannel(pinName, pinStates) {
    if (!pinName || pinName === 'none') return 0;

    if (pinName.startsWith('probe:')) {
      const probeId = pinName.slice(6);
      const probe = this._findProbe(probeId);
      return probe && probe.runtimeState ? (probe.runtimeState.voltage || 0) : 0;
    }

    const pinNum = this._pinNameToNum(pinName);
    return pinNum !== null ? (pinStates[`pin_${pinNum}`] || 0) : 0;
  }

  _findProbe(probeId) {
    const canvas = window.CircuitCanvas;
    if (!canvas) return null;
    const comps = canvas.components || [];
    if (probeId.startsWith('la_probe_ch')) {
      for (let i = 0; i < comps.length; i++) {
        if (comps[i].type === probeId) return comps[i];
      }
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
      if (c.type && c.type.startsWith('la_probe_ch')) {
        probes.push({ id: c.type, label: c.runtimeState?.label || c.type });
      }
    }
    return probes;
  }

  refreshProbeOptions() {
    const probes = this.getProbes();
    document.querySelectorAll('.la-ch-select').forEach(sel => {
      const prevVal = sel.value;
      const existing = sel.querySelectorAll('.probe-option');
      existing.forEach(el => el.remove());
      probes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = 'probe:' + p.id;
        opt.textContent = p.label;
        opt.className = 'probe-option';
        sel.appendChild(opt);
      });
      if (prevVal && sel.querySelector(`option[value="${prevVal}"]`)) {
        sel.value = prevVal;
        const idx = parseInt(sel.dataset.ch);
        if (!isNaN(idx)) this.setChannel(idx, sel.value);
      }
    });
  }

  /* ── Rendering ── */
  _render() {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;
    if (!W || !H) return;

    ctx.fillStyle = this.BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    const activeChannels = this.channels.filter(ch => ch.enabled);
    const channelCount = activeChannels.length || 1;
    const labelW = 60;
    const plotW = W - labelW;
    const bottomPad = 10;
    const channelH = Math.floor((H - bottomPad) / channelCount);
    const windowMs = this.timebase * this.gridDivs;

    // Determine time window from data
    let now = 0;
    for (const ch of activeChannels) {
      const d = this.data[ch.pin];
      if (d.length > 0) {
        const last = d[d.length - 1].t;
        if (last > now) now = last;
      }
    }
    const startT = now - windowMs;
    const endT = now;

    // Draw grid
    this._drawGrid(ctx, labelW, plotW, H, channelCount, channelH, startT, endT);

    // Draw each channel
    activeChannels.forEach((ch, i) => {
      const y0 = i * channelH;
      const yMid = y0 + channelH / 2;
      const color = ch.color;

      // Channel separator line
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(labelW, y0);
        ctx.lineTo(W, y0);
        ctx.stroke();
      }

      // Label background
      ctx.fillStyle = this.LABEL_BG;
      ctx.fillRect(0, y0, labelW, channelH);

      // Channel label
      ctx.fillStyle = color;
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ch.label, labelW / 2, yMid - 6);

      ctx.fillStyle = this.TEXT_COLOR;
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.fillText(ch.pin, labelW / 2, yMid + 8);

      // HIGH / LOW state label
      const d = this.data[ch.pin];
      const lastVal = d.length > 0 ? d[d.length - 1].v : 0;
      ctx.fillStyle = lastVal ? color : 'rgba(255,255,255,0.2)';
      ctx.font = 'bold 7px JetBrains Mono, monospace';
      ctx.fillText(lastVal ? 'HIGH' : 'LOW', labelW / 2, yMid + 20);

      // Draw waveform
      this._drawChannelWaveform(ctx, ch, d, labelW, plotW, y0, channelH, startT, endT, color);
    });

    // Draw cursors
    this._drawCursors(ctx, labelW, plotW, H, startT, endT, windowMs, activeChannels);

    // Bottom info bar
    this._drawInfoBar(ctx, W, H, activeChannels, startT, endT);
  }

  _drawGrid(ctx, labelW, plotW, H, channelCount, channelH, startT, endT) {
    const windowMs = endT - startT;
    if (windowMs <= 0) return;

    // Vertical time grid lines
    for (let i = 0; i <= this.gridDivs; i++) {
      const x = labelW + (i / this.gridDivs) * plotW;
      ctx.strokeStyle = i % 5 === 0 ? this.GRID_MAJOR : this.GRID_COLOR;
      ctx.lineWidth = i % 5 === 0 ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();

      // Time labels at bottom
      if (i < this.gridDivs) {
        const t = startT + (i / this.gridDivs) * windowMs;
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '7px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${t.toFixed(0)}ms`, x + (plotW / this.gridDivs) / 2, H - 3);
      }
    }

    // Channel HIGH/LOW reference lines
    for (let i = 0; i < channelCount; i++) {
      const y0 = i * channelH;
      const yHigh = y0 + channelH * 0.25;
      const yLow = y0 + channelH * 0.75;

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(labelW, yLow);
      ctx.lineTo(labelW + plotW, yLow);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(labelW, yHigh);
      ctx.lineTo(labelW + plotW, yHigh);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  _drawChannelWaveform(ctx, ch, data, labelW, plotW, y0, channelH, startT, endT, color) {
    if (data.length < 2) return;

    const windowMs = endT - startT;
    if (windowMs <= 0) return;

    const yHigh = y0 + channelH * 0.25;
    const yLow = y0 + channelH * 0.75;
    const yPad = 4;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    let started = false;
    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      if (pt.t < startT - 100) continue;
      if (pt.t > endT + 100) break;

      const x = labelW + ((pt.t - startT) / windowMs) * plotW;
      const y = pt.v ? yHigh + yPad : yLow - yPad;

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        const prev = data[i - 1];
        const prevY = prev.v ? yHigh + yPad : yLow - yPad;
        if (prevY !== y) {
          ctx.lineTo(x, prevY);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawCursors(ctx, labelW, plotW, H, startT, endT, windowMs, activeChannels) {
    if (windowMs <= 0) return;

    // Draw Cursor A
    if (this.cursorA !== null) {
      const xA = this._timeToPixel(this.cursorA, startT, windowMs, labelW, plotW);
      if (xA >= labelW && xA <= labelW + plotW) {
        this._cursorAx = xA;
        ctx.strokeStyle = this.CURSOR_A_COLOR;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(xA, 0);
        ctx.lineTo(xA, H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cursor A label
        ctx.fillStyle = this.CURSOR_A_COLOR;
        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('A', xA, 10);

        // Draw state dots at cursor position for each channel
        activeChannels.forEach((ch, i) => {
          const y0 = i * Math.floor(H / activeChannels.length);
          const yHigh = y0 + Math.floor(H / activeChannels.length) * 0.25 + 4;
          const yLow = y0 + Math.floor(H / activeChannels.length) * 0.75 - 4;
          const state = this._getStateAtTime(ch, this.cursorA);
          const y = state ? yHigh : yLow;
          ctx.fillStyle = ch.color;
          ctx.beginPath();
          ctx.arc(xA, y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // Draw Cursor B
    if (this.cursorB !== null) {
      const xB = this._timeToPixel(this.cursorB, startT, windowMs, labelW, plotW);
      if (xB >= labelW && xB <= labelW + plotW) {
        this._cursorBx = xB;
        ctx.strokeStyle = this.CURSOR_B_COLOR;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(xB, 0);
        ctx.lineTo(xB, H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cursor B label
        ctx.fillStyle = this.CURSOR_B_COLOR;
        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('B', xB, 10);

        // Draw state dots at cursor position for each channel
        activeChannels.forEach((ch, i) => {
          const y0 = i * Math.floor(H / activeChannels.length);
          const yHigh = y0 + Math.floor(H / activeChannels.length) * 0.25 + 4;
          const yLow = y0 + Math.floor(H / activeChannels.length) * 0.75 - 4;
          const state = this._getStateAtTime(ch, this.cursorB);
          const y = state ? yHigh : yLow;
          ctx.fillStyle = ch.color;
          ctx.beginPath();
          ctx.arc(xB, y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // Draw measurement panel between cursors
    if (this.cursorA !== null && this.cursorB !== null) {
      const xA = this._cursorAx;
      const xB = this._cursorBx;
      if (xA != null && xB != null) {
        this._drawMeasurementPanel(ctx, xA, xB, labelW, plotW, H, activeChannels);
      }
    }

    // Single cursor readout at bottom
    if (this.cursorA !== null && this.cursorB === null) {
      const xA = this._cursorAx;
      if (xA != null && xA >= labelW) {
        ctx.fillStyle = this.CURSOR_A_COLOR;
        ctx.globalAlpha = 0.8;
        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`A: ${this.cursorA.toFixed(1)}ms`, xA, H - 2);
        ctx.globalAlpha = 1;
      }
    }
    if (this.cursorB !== null && this.cursorA === null) {
      const xB = this._cursorBx;
      if (xB != null && xB >= labelW) {
        ctx.fillStyle = this.CURSOR_B_COLOR;
        ctx.globalAlpha = 0.8;
        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`B: ${this.cursorB.toFixed(1)}ms`, xB, H - 2);
        ctx.globalAlpha = 1;
      }
    }
  }

  _drawMeasurementPanel(ctx, xA, xB, labelW, plotW, H, activeChannels) {
    const panelX = Math.min(xA, xB) + 4;
    const panelW = Math.abs(xB - xA) - 8;
    if (panelW < 60) return; // too narrow to show panel

    // Draw shaded region between cursors
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(Math.min(xA, xB), 0, Math.abs(xB - xA), H);

    // Top measurement panel
    const panelY = 2;
    const panelH = 20 + activeChannels.length * 14;
    const px = Math.min(xA, xB) + 4;

    ctx.fillStyle = 'rgba(10,14,20,0.9)';
    ctx.fillRect(px, panelY, panelW, panelH);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, panelY, panelW, panelH);

    let y = panelY + 15;
    ctx.textAlign = 'left';

    // Delta time
    const dt = Math.abs(this.cursorB - this.cursorA);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText(`ΔT: ${this._fmtTime(dt)}`, px + 6, y);
    y += 14;

    // Frequency (from first active channel)
    if (activeChannels.length > 0) {
      const m = this._measureBetweenCursors(activeChannels[0]);
      if (m && m.frequency !== null) {
        ctx.fillStyle = activeChannels[0].color;
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.fillText(`f: ${this._fmtFreq(m.frequency)}`, px + 6, y);
        y += 14;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.fillText(`f: --`, px + 6, y);
        y += 14;
      }
    }

    // Per-channel state at cursors
    activeChannels.forEach((ch) => {
      const m = this._measureBetweenCursors(ch);
      if (!m) return;
      ctx.fillStyle = ch.color;
      ctx.font = '10px JetBrains Mono, monospace';
      const stateStr = `${m.stateA ? 'HIGH' : 'LOW'} → ${m.stateB ? 'HIGH' : 'LOW'}`;
      const dutyStr = m.dutyCycle !== null ? `  Duty: ${m.dutyCycle.toFixed(1)}%` : '';
      ctx.fillText(`${ch.label}: ${stateStr}${dutyStr}`, px + 6, y);
      y += 14;
    });
  }

  _fmtTime(ms) {
    if (ms >= 1000) return (ms / 1000).toFixed(2) + 's';
    if (ms >= 1) return ms.toFixed(2) + 'ms';
    return (ms * 1000).toFixed(0) + 'μs';
  }

  _fmtFreq(hz) {
    if (hz >= 1000000) return (hz / 1000000).toFixed(2) + 'MHz';
    if (hz >= 1000) return (hz / 1000).toFixed(2) + 'kHz';
    return hz.toFixed(2) + 'Hz';
  }

  _drawInfoBar(ctx, W, H, activeChannels, startT, endT) {
    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.timebase}ms/div · ${activeChannels.length} ch`, W - 8, 12);

    // Measurement instructions
    if (this.cursorA === null && this.cursorB === null) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.textAlign = 'center';
      ctx.fillText('Click: Cursor A · Right-click: Cursor B · Drag to move', W / 2, H - 4);
    }

    if (this.paused) {
      ctx.fillStyle = 'rgba(255,150,0,0.8)';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', W / 2, 14);
    }
  }

  /* ── Pin name to Arduino pin number ── */
  _pinNameToNum(name) {
    const map = {
      D0: 0, D1: 1, D2: 2, D3: 3, D4: 4, D5: 5, D6: 6, D7: 7,
      D8: 8, D9: 9, D10: 10, D11: 11, D12: 12, D13: 13,
      A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19,
      GPIO0: 0, GPIO1: 1, GPIO2: 2, GPIO3: 3, GPIO4: 4, GPIO5: 5,
      GPIO6: 6, GPIO7: 7, GPIO8: 8, GPIO9: 9, GPIO10: 10, GPIO11: 11,
      GPIO12: 12, GPIO13: 13, GPIO14: 14, GPIO15: 15, GPIO16: 16,
      GPIO17: 17, GPIO18: 18, GPIO19: 19, GPIO20: 20, GPIO21: 21,
      GPIO22: 22, GPIO23: 23, GPIO24: 24, GPIO25: 25, GPIO26: 26,
      GPIO27: 27, GPIO32: 32, GPIO33: 33, GPIO34: 34, GPIO35: 35,
      GPIO36: 36, GPIO37: 37, GPIO38: 38, GPIO39: 39,
      D14: 14, D15: 15, D16: 16, D17: 17, D18: 18, D19: 19,
      D21: 21, D22: 22, D23: 23, D25: 25, D26: 26, D27: 27,
      D32: 32, D33: 33, D34: 34, D35: 35, D36: 36, D39: 39,
    };
    return map[name] !== undefined ? map[name] : null;
  }

  /* ── Public API ── */
  setChannel(index, pinName) {
    if (index < 0 || index >= this.channels.length) return;
    this.channels[index].pin = pinName;
    this.data[pinName] = [];
  }

  setChannelEnabled(index, enabled) {
    if (index < 0 || index >= this.channels.length) return;
    this.channels[index].enabled = enabled;
  }

  setTimebase(ms) {
    this.timebase = parseInt(ms) || 200;
  }

  clear() {
    this.channels.forEach(ch => { this.data[ch.pin] = []; });
    this.cursorA = null;
    this.cursorB = null;
    this._cursorAx = null;
    this._cursorBx = null;
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  destroy() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._ro?.disconnect();
  }
}

window.LogicAnalyzerClass = LogicAnalyzer;
