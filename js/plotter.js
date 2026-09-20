/* -------------------------------------------------------
   plotter.js — Serial Plotter (like the Arduino IDE Serial Plotter)
   Graphs numeric values sent over Serial.
   Supported formats per line:
     - "25 60 90"                  → series V0, V1, V2
     - "temp:25.5 humidity:60"     → labeled series
     - "12,34,56"                  → comma separated
   Lines starting with "[" (ArduSim system logs) are ignored.
   ------------------------------------------------------- */

'use strict';

class SerialPlotter {
  constructor(canvasEl) {
    this.canvas   = canvasEl;
    this.ctx      = canvasEl.getContext('2d');
    this.paused   = false;
    this._buffer  = '';
    this.series   = {};   // name → array of values (oldest → newest)
    this.order    = [];
    this.maxSamples = 300;

    this.palette = ['#00e5ff', '#ff9800', '#4caf50', '#e91e63', '#ffee33',
                    '#9c27b0', '#00e676', '#ff5252', '#40c4ff', '#ffab40'];

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

  /* Feed raw serial text; complete lines are parsed for numeric series. */
  addSerial(text) {
    if (this.paused || typeof text !== 'string' || !text) return;
    this._buffer += text;
    if (this._buffer.length > 65536) this._buffer = this._buffer.slice(-65536);

    let idx;
    while ((idx = this._buffer.indexOf('\n')) !== -1) {
      const line = this._buffer.slice(0, idx).trim();
      this._buffer = this._buffer.slice(idx + 1);
      if (line) this._parseLine(line);
    }
  }

  _parseLine(line) {
    // Skip ArduSim system/debug lines like [ArduSim], [MQTT], [ESP32]...
    if (line[0] === '[') return;

    const tokens = line.split(/[\s,]+/).filter(Boolean);
    let auto = 0;
    for (const tok of tokens) {
      let name = null;
      let val = NaN;

      // "label:123.4" or "label=12.3"
      const labeled = tok.match(/^([A-Za-z_][\w]*)\s*[:=]\s*(-?[\d.]+(?:[eE][-+]?\d+)?)$/);
      if (labeled) {
        name = labeled[1];
        val = parseFloat(labeled[2]);
      } else {
        const n = parseFloat(tok);
        if (!Number.isNaN(n)) { name = `V${auto++}`; val = n; }
      }

      if (name && !Number.isNaN(val)) {
        let s = this.series[name];
        if (!s) {
          s = this.series[name] = [];
          this.order.push(name);
        }
        s.push(val);
        if (s.length > this.maxSamples) s.shift();
      }
    }
  }

  _render() {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;
    if (!W || !H) return;

    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, W, H);

    const names = this.order;
    if (!names.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Serial Plotter — send numeric values via Serial.print/println', W / 2, H / 2);
      return;
    }

    // Global Y range across all series
    let min = Infinity, max = -Infinity;
    for (const name of names) {
      const arr = this.series[name];
      if (!arr) continue;
      for (const v of arr) { if (v < min) min = v; if (v > max) max = v; }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) { min = 0; max = 1; }
    if (max === min) { min -= 1; max += 1; }
    const pad = (max - min) * 0.1;
    min -= pad;
    max += pad;

    this._drawGrid(ctx, W, H);

    const dx = W / this.maxSamples;
    names.forEach((name, i) => {
      const arr = this.series[name];
      if (!arr || arr.length < 2) return;
      const color = this.palette[i % this.palette.length];
      const len = arr.length;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 3;
      ctx.beginPath();
      for (let k = 0; k < len; k++) {
        const x = W - (len - 1 - k) * dx;
        const y = H - ((arr[k] - min) / (max - min)) * H;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Legend
      ctx.fillStyle = color;
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${name}: ${arr[len - 1]}`, 8, 14 + i * 12);
    });
  }

  _drawGrid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 10; i++) {
      const x = (i / 10) * W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      const y = (i / 10) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  clear() {
    this.series = {};
    this.order = [];
    this._buffer = '';
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }
}

window.SerialPlotterClass = SerialPlotter;
