/* ═══════════════════════════════════════════════════════
   canvas.js — Circuit Canvas (HTML5 Canvas, drag/drop, wiring, pan/zoom)
   ═══════════════════════════════════════════════════════ */

'use strict';

class CircuitCanvas {
  constructor(canvasEl, wrapperEl) {
    this.canvas = canvasEl;
    this.wrapper = wrapperEl;
    this.ctx = canvasEl.getContext('2d');

    /* State */
    this.components = [];  // { id, type, x, y, props, runtimeState, selected, rotation }
    this.wires = [];  // { id, from:{instId,pinId}, to:{instId,pinId}, color, waypoints:[] }
    this.selected = null;
    this.selectedWire = null;
    this._hasStandalonePower = false;

    /* Electrical engine */
    this.engine = new ElectricalEngine();

    /* Viewport */
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.GRID = 5;

    /* Interaction state machine */
    this.mode = 'idle';   // idle | dragging | panning | wiring | placing | wiredrag
    this.dragging = null;     // { inst, offsetX, offsetY }
    this.wiringFrom = null;     // { inst, pin, wx, wy }
    this.wireMouse = null;     // { x, y } world coords
    this.placingType = null;
    this._wireOffsets = {};       // wireId -> {hx, hy} routing hint for wire reshape
    this.draggingWire = null;     // { wireId, segIdx } — which wire segment is being dragged
    this.placingMouse = null;

    /* History */
    this.history = [];
    this.historyIdx = -1;

    /* Resize */
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.wrapper);
    this._resize();

    /* Events */
    this._bindEvents();
    this._rafId = requestAnimationFrame(() => this._render());

    /* Callbacks */
    this.onWireChanged = null;
    this.onCompChanged = null;
    this.onPinClick = null;  // (inst, pin) when user clicks a pin
    this.onContextMenu = null;

    /* Pin tooltip */
    this.tooltipEl = null;
    this._tipKey = null;
  }

  /* ══════════════ RESIZE ══════════════ */
  _resize() {
    const w = this.wrapper.clientWidth;
    const h = this.wrapper.clientHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    if (this.panX === 0 && this.panY === 0) {
      this.panX = w / 2 - 200;
      this.panY = h / 2 - 150;
    }
  }

  /* ══════════════ RENDER ══════════════ */
  _render() {
    const { ctx, canvas, zoom, panX, panY } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Refresh active simulation states for live glowing & component updates
    const sim = window.ArduinoSim;
    if (sim && sim.isRunning && sim.pinStates) {
      this.updateSimState(sim.pinStates);
    } else if (this._hasStandalonePower) {
      // Without a running sketch, update components that provide their own
      // voltage (bench power supply, MB102, power_5v, function generator, etc.)
      this.updateSimState({});
    }

    // Sample oscilloscope and logic analyzer from probe components even in standalone mode
    if (this._hasStandalonePower && !sim?.isRunning) {
      const app = window.App;
      if (app) {
        if (app.osc && !app.osc.paused) {
          app.osc.sample(performance.now(), {});
        }
        if (app.la && !app.la.paused) {
          app.la.sample(performance.now(), {});
        }
      }
    }

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    this._drawGrid(ctx);
    this._drawWires(ctx);
    this._drawComponents(ctx);
    try { this._drawInteractives(ctx); } catch (_e) { /* guard interactive rendering */ }
    this._drawOverlays(ctx);

    ctx.restore();
    this._rafId = requestAnimationFrame(() => this._render());
  }

  _drawGrid(ctx) {
    const G = this.GRID;
    const invZ = 1 / this.zoom;
    const startX = Math.floor(-this.panX * invZ / G) * G;
    const startY = Math.floor(-this.panY * invZ / G) * G;
    const endX = startX + (this.canvas.width * invZ) + G;
    const endY = startY + (this.canvas.height * invZ) + G;

    ctx.strokeStyle = this.zoom < 0.5 ? 'transparent' : 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5 / this.zoom;

    for (let x = startX; x <= endX; x += G) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += G) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    // Major grid
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1 / this.zoom;
    const MG = G * 5;
    const msX = Math.floor(-this.panX * invZ / MG) * MG;
    const msY = Math.floor(-this.panY * invZ / MG) * MG;
    for (let x = msX; x <= endX; x += MG) {
      ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
    }
    for (let y = msY; y <= endY; y += MG) {
      ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
    }

    // Origin marker
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5 / this.zoom;
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke();
  }

  _drawComponents(ctx) {
    const { COMPONENT_DEFS, getComponentClass } = window.ArduinoComponents;
    const sim = window.ArduinoSim;

    for (const inst of this.components) {
      const def = COMPONENT_DEFS[inst.type];
      if (!def) continue;

      if (typeof def.step === 'function') {
        def.step(inst, sim?.isRunning ? sim : null);
      }

      ctx.save();
      if (inst.rotation) {
        const cx = inst.x + def.width / 2;
        const cy = inst.y + def.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(inst.rotation * Math.PI / 2);
        ctx.translate(-cx, -cy);
      }

      // Prefer class-based render() over def.draw()
      const CompClass = getComponentClass(inst.type);
      if (CompClass && typeof inst._componentInstance === 'object' && typeof inst._componentInstance.render === 'function') {
        inst._componentInstance.render(ctx, sim?.isRunning ? sim : null);
      } else {
        def.draw(ctx, { ...inst }, sim?.isRunning ? sim : null);
      }

      // Draw pins
      if (this.zoom >= 0.5) {
        this._drawPins(ctx, inst, def);
      }

      ctx.restore();
    }

    // Draw placing ghost
    if (this.mode === 'placing' && this.placingMouse && this.placingType) {
      const def = COMPONENT_DEFS[this.placingType];
      if (def) {
        const gx = this._snap(this.placingMouse.x - def.width / 2);
        const gy = this._snap(this.placingMouse.y - def.height / 2);
        ctx.save();
        ctx.globalAlpha = 0.5;
        def.draw(ctx, { id: '__ghost__', type: this.placingType, x: gx, y: gy, width: def.width, height: def.height, props: def.defaultProps || {}, selected: false }, null);
        ctx.restore();
      }
    }
  }

  _drawPins(ctx, inst, def) {
    const sim = window.ArduinoSim;

    for (const pin of def.pins) {
      const wx = inst.x + pin.x;
      const wy = inst.y + pin.y;

      // Check if wired
      const isWired = this.wires.some(w =>
        (w.from.instId === inst.id && w.from.pinId === pin.id) ||
        (w.to.instId === inst.id && w.to.pinId === pin.id)
      );

      // Get pin state
      const pinKey = `pin_${this._pinToNumber(pin.id)}`;
      const val = sim.isRunning ? (sim.pinStates[pinKey] || 0) : 0;

      // Pin color
      let pinColor;
      if (pin.type === 'gnd') pinColor = '#666';
      else if (pin.type === 'power') pinColor = '#cc3333';
      else if (pin.type === 'pwm') pinColor = val > 0 ? `rgba(188,140,255,${0.4 + val / 255 * 0.6})` : '#555';
      else if (pin.type === 'analog') pinColor = '#e8c840';
      else pinColor = val > 0 ? '#ff5555' : '#3388cc';

      // Wiring highlight
      const isWiringFrom = this.wiringFrom && this.wiringFrom.inst.id === inst.id && this.wiringFrom.pin.id === pin.id;
      const isWiringTarget = this.mode === 'wiring';

      // Draw pin
      ctx.beginPath();
      ctx.arc(wx, wy, isWired ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isWiringFrom ? '#00e5ff' : (isWired ? pinColor : '#3a3a3a');
      ctx.fill();
      ctx.strokeStyle = isWiringTarget ? 'rgba(0,229,255,0.5)' : (isWired ? pinColor : '#555');
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.stroke();

      // Hover ring
      if (isWiringTarget && !isWiringFrom) {
        ctx.beginPath();
        ctx.arc(wx, wy, 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,229,255,0.3)';
        ctx.lineWidth = 1 / this.zoom;
        ctx.stroke();
      }

      // Pin label (only when zoomed in enough) — boards have baked-in labels
      const isBoard = inst.type === 'arduino_uno' || inst.type === 'esp32_devkit_v1' || inst.type === 'arduino_nano';
      if (this.zoom >= 1 && !isBoard) {
        ctx.fillStyle = '#888';
        ctx.font = `${8 / this.zoom}px Inter, sans-serif`;
        ctx.textAlign = pin.side === 'top' ? 'center' : 'center';
        const lx = wx;
        const ly = pin.side === 'top' ? wy - 8 / this.zoom : wy + 12 / this.zoom;
        ctx.fillText(pin.label, lx, ly);
      }
    }
  }

  // ─── Wire routing (Wokwi / Tinkercad style orthogonal traces) ───
  // A wire exits each pin straight out from the component side, then runs
  // horizontally/vertically with right-angle bends, avoiding component bodies.

  // Rotate a pin's local (pin.x, pin.y) offset around the component centre
  // by inst.rotation × 90° CW and return the world position.
  _pinWorldPos(inst, pin) {
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
    const def = defs && defs[inst.type];
    const cx = (def ? def.width : 40) / 2;
    const cy = (def ? def.height : 40) / 2;
    let dx = pin.x - cx;
    let dy = pin.y - cy;
    const rot = (inst.rotation || 0) % 4;
    for (let i = 0; i < rot; i++) { const t = dx; dx = -dy; dy = t; }
    return { x: inst.x + cx + dx, y: inst.y + cy + dy };
  }

  _getPinExitDir(instId, pinId) {
    const inst = this.components.find(c => c.id === instId);
    if (!inst) return { x: 0, y: 1 };
    const def = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS[inst.type];
    if (!def) return { x: 0, y: 1 };
    const pin = def.pins.find(p => p.id === pinId);
    if (!pin) return { x: 0, y: 1 };
    let side = pin.side;
    if (!side) {
      const w = def.width || 40, h = def.height || 40;
      side = pin.y < h * 0.5 ? 'top' : (pin.y > h * 0.5 ? 'bottom' : (pin.x < w * 0.5 ? 'left' : 'right'));
    }
    const dirs = { top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    let d = dirs[side] || { x: 0, y: 1 };
    const rot = (inst.rotation || 0) % 4;
    for (let i = 0; i < rot; i++) d = { x: -d.y, y: d.x }; // rotate 90° clockwise
    return d;
  }

  _componentRects() {
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
    const rects = [];
    for (const c of this.components) {
      const def = defs && defs[c.type];
      if (!def) continue;
      rects.push({ x: c.x - 6, y: c.y - 6, w: (def.width || 40) + 12, h: (def.height || 40) + 12 });
    }
    return rects;
  }

  // Liang–Barsky: does segment (a→b) intersect axis-aligned rect r?
  _segHitsRect(ax, ay, bx, by, r) {
    const l = r.x, t = r.y, ri = r.x + r.w, b = r.y + r.h;
    if ((ax < l && bx < l) || (ax > ri && bx > ri) || (ay < t && by < t) || (ay > b && by > b)) return false;
    let tmin = 0, tmax = 1;
    const dx = bx - ax, dy = by - ay;
    const p = [-dx, dx, -dy, dy];
    const q = [ax - l, ri - ax, ay - t, b - ay];
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) {
        if (q[i] < 0) return false;
      } else {
        const r0 = q[i] / p[i];
        if (p[i] < 0) { if (r0 > tmax) return false; if (r0 > tmin) tmin = r0; }
        else { if (r0 < tmin) return false; if (r0 < tmax) tmax = r0; }
      }
    }
    return tmin <= tmax;
  }

  _scorePath(pts) {
    const rects = this._componentRects();
    let penalty = 0, len = 0;
    // Score from index 1..len-1 — excludes the pin→stub end segments
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      len += Math.hypot(b.x - a.x, b.y - a.y);
      for (const r of rects) {
        if (this._segHitsRect(a.x, a.y, b.x, b.y, r)) penalty++;
      }
    }
    return { penalty, bends: pts.length - 2, len };
  }

  _laneCandidates(a, b, hint) {
    const push = (arr, v) => { if (arr.every(e => Math.abs(e - v) > 1)) arr.push(v); };
    const xLanes = [], yLanes = [];
    push(xLanes, (a.x + b.x) / 2); push(xLanes, a.x - 30); push(xLanes, a.x + 30);
    push(xLanes, b.x - 30); push(xLanes, b.x + 30);
    push(yLanes, (a.y + b.y) / 2); push(yLanes, a.y - 30); push(yLanes, a.y + 30);
    push(yLanes, b.y - 30); push(yLanes, b.y + 30);
    if (hint) { push(xLanes, hint.x); push(yLanes, hint.y); }
    return { xLanes, yLanes };
  }

  // Build an orthogonal polyline from pin1 (p1, exiting along d1) to pin2 (p2, exiting d2).
  _routePath(p1, d1, p2, d2, hint) {
    const STUB = 24;
    const s1 = { x: p1.x + d1.x * STUB, y: p1.y + d1.y * STUB };
    const s2 = d2 && (d2.x || d2.y) ? { x: p2.x + d2.x * STUB, y: p2.y + d2.y * STUB } : { x: p2.x, y: p2.y };
    const a = s1, b = s2;

    const candidates = [];
    const mk = (...pts) => candidates.push([a, ...pts, b]);

    if (hint) {
      // Dragging: force the route through the cursor (orthogonal bends around it)
      mk({ x: hint.x, y: a.y }, { x: hint.x, y: b.y });
      mk({ x: a.x, y: hint.y }, { x: b.x, y: hint.y });
      mk({ x: hint.x, y: a.y }, { x: hint.x, y: hint.y }, { x: b.x, y: hint.y });
      mk({ x: a.x, y: hint.y }, { x: hint.x, y: hint.y }, { x: hint.x, y: b.y });
    } else {
      // Two L shapes
      mk({ x: b.x, y: a.y });          // horizontal then vertical
      mk({ x: a.x, y: b.y });          // vertical then horizontal

      // Z shapes through lanes
      const { xLanes, yLanes } = this._laneCandidates(a, b, hint);
      for (const lane of xLanes) mk({ x: lane, y: a.y }, { x: lane, y: b.y });
      for (const lane of yLanes) mk({ x: a.x, y: lane }, { x: b.x, y: lane });
    }

    // Pick the best candidate: least body crossings, then fewest bends, then shortest
    let best = null, bestScore = null;
    for (const cand of candidates) {
      const sc = this._scorePath(cand);
      if (!bestScore ||
        sc.penalty < bestScore.penalty ||
        (sc.penalty === bestScore.penalty && sc.bends < bestScore.bends) ||
        (sc.penalty === bestScore.penalty && sc.bends === bestScore.bends && sc.len < bestScore.len)) {
        best = cand;
        bestScore = sc;
      }
    }
    return [p1, ...(best || [a, b]), p2];
  }

  _wirePath(wire) {
    const p1 = this._getPinWorldPos(wire.from.instId, wire.from.pinId);
    const p2 = this._getPinWorldPos(wire.to.instId, wire.to.pinId);
    if (!p1 || !p2) return null;
    if (wire.waypoints && Array.isArray(wire.waypoints) && wire.waypoints.length > 0) {
      return [p1, ...wire.waypoints.map(wp => ({ x: wp.x, y: wp.y })), p2];
    }
    const d1 = this._getPinExitDir(wire.from.instId, wire.from.pinId);
    const d2 = this._getPinExitDir(wire.to.instId, wire.to.pinId);
    const off = this._wireOffsets && this._wireOffsets[wire.id];
    const hint = off && Number.isFinite(off.hx) ? { x: off.hx, y: off.hy } : null;
    return this._routePath(p1, d1, p2, d2, hint);
  }

  _drawWires(ctx) {
    const sim = window.ArduinoSim;

    for (const wire of this.wires) {
      const p1 = this._getPinWorldPos(wire.from.instId, wire.from.pinId);
      const p2 = this._getPinWorldPos(wire.to.instId, wire.to.pinId);
      if (!p1 || !p2) continue;

      const isSelected = this.selectedWire && this.selectedWire.id === wire.id;

      // Determine color: custom color takes priority, then dynamic sim state
      let color;
      if (wire.color) {
        color = wire.color;
      } else {
        const pinKey = this._getPinKey(wire.from.instId, wire.from.pinId);
        const val = sim?.isRunning ? (sim.pinStates[pinKey] || 0) : 0;
        const pinType = this._getPinType(wire.from.instId, wire.from.pinId);
        if (pinType === 'gnd') color = '#444';
        else if (pinType === 'power') color = '#994444';
        else if (val > 1 && val <= 255) color = `rgba(247,201,72,${0.6 + val / 255 * 0.4})`;
        else color = val > 0 ? '#cc3333' : '#2266aa';
      }

      const pts = this._wirePath(wire);
      if (pts) this._drawWire(ctx, pts, color, isSelected, wire);
    }

    // Active wire preview
    if (this.mode === 'wiring' && this.wiringFrom && this.wireMouse) {
      const p1 = { x: this.wiringFrom.wx, y: this.wiringFrom.wy };
      const d1 = this._getPinExitDir(this.wiringFrom.instId, this.wiringFrom.pinId);
      const pts = this._routePath(p1, d1, this.wireMouse, null, this.wireMouse);
      this._drawWire(ctx, pts, '#00e5ff', true, null);
    }
  }

  _drawWire(ctx, pts, color, highlighted, wire) {
    if (!pts || pts.length < 2) return;
    ctx.save();

    // Selection glow behind wire
    if (highlighted) {
      ctx.strokeStyle = 'rgba(0,229,255,0.25)';
      ctx.lineWidth = 8 / this.zoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }

    // Main wire stroke
    ctx.strokeStyle = highlighted ? '#00e5ff' : color;
    ctx.lineWidth = highlighted ? 3 / this.zoom : 2 / this.zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (highlighted) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 6;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    // Junction dots at the pins
    ctx.shadowBlur = 0;
    ctx.fillStyle = highlighted ? '#00e5ff' : color;
    ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, 3 / this.zoom, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(pts[pts.length - 1].x, pts[pts.length - 1].y, 3 / this.zoom, 0, Math.PI * 2); ctx.fill();

    // Draw bend-point handles on selected wire
    if (highlighted && wire && Array.isArray(wire.waypoints) && wire.waypoints.length > 0) {
      ctx.fillStyle = '#00e5ff';
      ctx.strokeStyle = '#0d1117';
      ctx.lineWidth = 1.5 / this.zoom;
      for (const wp of wire.waypoints) {
        const sz = 4 / this.zoom;
        ctx.fillRect(wp.x - sz, wp.y - sz, sz * 2, sz * 2);
        ctx.strokeRect(wp.x - sz, wp.y - sz, sz * 2, sz * 2);
      }
    }

    ctx.restore();

  }

  // ─── Interactive on-canvas controls (sliders for sensors / potentiometer) ───
  _drawInteractives(ctx) {
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
    if (!defs || this.zoom < 0.4) return;
    for (const inst of this.components) {
      const def = defs[inst.type];
      if (!def || !Array.isArray(def.interactive) || def.interactive.length === 0) continue;
      const rects = this._getInteractiveRects(inst);
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        // Skip inline toggles — they're drawn by the component's own draw()
        if (r.ctrl.type === 'toggle' && r.ctrl.inline) continue;
        this._drawSlider(ctx, inst, r.ctrl, r);
      }
    }
  }

  _getInteractiveRects(inst) {
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
    const def = defs && defs[inst.type];
    if (!def || !Array.isArray(def.interactive)) return [];
    const w = Math.max(60, def.width || 60);
    const h = def.height || 40;
    const allCtrls = def.interactive.filter(c => (!c.type || c.type === 'range' || c.type === 'toggle') && c.type !== 'select' && c.type !== 'checkbox');
    const result = [];
    let yOff = 16;

    for (const ctrl of allCtrls) {
      if (ctrl.type === 'toggle' && ctrl.inline) {
        result.push({
          x: inst.x + ctrl.inline.x,
          y: inst.y + ctrl.inline.y,
          width: ctrl.inline.w,
          height: ctrl.inline.h,
          ctrl,
        });
      } else {
        const rh = 12;
        result.push({
          x: inst.x,
          y: inst.y + h + yOff,
          width: w,
          height: rh,
          ctrl,
        });
        yOff += rh + 5;
      }
    }
    return result;
  }

  _getInteractiveValue(inst, ctrl) {
    const rs = inst.runtimeState || {};
    if (rs[ctrl.field] !== undefined) return rs[ctrl.field];
    const props = inst.props || {};
    if (props[ctrl.field] !== undefined) return props[ctrl.field];
    return ctrl.min;
  }

  _formatSliderValue(value, ctrl) {
    const v = Number(value);
    if (Number.isInteger(ctrl.step)) return String(Math.round(v));
    return String(Math.round(v * 10) / 10);
  }

  _drawSlider(ctx, inst, ctrl, rect) {
    if (ctrl.type === 'toggle') return this._drawToggle(ctx, inst, ctrl, rect);
    // Default: range slider
    const value = this._getInteractiveValue(inst, ctrl);
    const range = ctrl.max - ctrl.min || 1;
    const pct = Math.max(0, Math.min(1, (value - ctrl.min) / range));
    const active = !!(window.ArduinoSim && window.ArduinoSim.isRunning);
    const invZ = 1 / this.zoom;

    ctx.save();

    // Label
    ctx.fillStyle = active ? 'rgba(220,240,255,0.95)' : 'rgba(160,165,175,0.8)';
    ctx.font = `bold ${7.5 * invZ}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(ctrl.label, rect.x, rect.y - 2 * invZ);

    // Value badge
    ctx.textAlign = 'right';
    ctx.fillStyle = active ? '#00e5ff' : '#78909c';
    ctx.fillText(this._formatSliderValue(value, ctrl) + (ctrl.unit || ''), rect.x + rect.width, rect.y - 2 * invZ);

    // Track background
    ctx.fillStyle = '#0d1114';
    ctx.strokeStyle = active ? 'rgba(0,151,156,0.5)' : 'rgba(100,100,110,0.4)';
    ctx.lineWidth = 1;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, rect.height / 2);
    ctx.fill();
    ctx.stroke();

    // Fill bar
    if (pct > 0.01) {
      const grad = ctx.createLinearGradient(rect.x, 0, rect.x + pct * rect.width, 0);
      grad.addColorStop(0, active ? 'rgba(0,151,156,0.3)' : 'rgba(100,100,120,0.3)');
      grad.addColorStop(1, active ? 'rgba(0,151,156,0.85)' : 'rgba(100,100,120,0.6)');
      ctx.fillStyle = grad;
      roundRect(ctx, rect.x, rect.y, Math.max(rect.height, pct * rect.width), rect.height, rect.height / 2);
      ctx.fill();
    }

    // Thumb
    const tx = rect.x + pct * rect.width;
    const thumbY = rect.y + rect.height / 2;
    if (isFinite(tx) && isFinite(thumbY)) {
      const thumbGrad = ctx.createRadialGradient(tx - 1, thumbY - 1, 1, tx, thumbY, 5);
      thumbGrad.addColorStop(0, active ? '#b2ebf2' : '#cfd8dc');
      thumbGrad.addColorStop(1, active ? '#00bcd4' : '#78909c');
      ctx.fillStyle = thumbGrad;
      ctx.beginPath();
      ctx.arc(tx, thumbY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawToggle(ctx, inst, ctrl, rect) {
    const value = this._getInteractiveValue(inst, ctrl);
    const isOn = Number(value) > 0;
    const active = !!(window.ArduinoSim && window.ArduinoSim.isRunning);
    const invZ = 1 / this.zoom;
    const cx = rect.x + 22;
    const cy = rect.y + rect.height / 2;
    const trackW = 36;
    const trackH = 10;

    ctx.save();

    // Label
    ctx.fillStyle = active ? 'rgba(220,240,255,0.95)' : 'rgba(160,165,175,0.8)';
    ctx.font = `bold ${7.5 * invZ}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(ctrl.label, rect.x, rect.y - 1 * invZ);

    // Status badge
    ctx.textAlign = 'right';
    ctx.fillStyle = isOn ? (active ? '#00e676' : '#4caf50') : (active ? '#ff5252' : '#b71c1c');
    ctx.font = `bold ${7 * invZ}px "JetBrains Mono", monospace`;
    ctx.fillText(isOn ? 'ON' : 'OFF', rect.x + rect.width, rect.y - 1 * invZ);

    // Track groove
    ctx.fillStyle = '#0d1114';
    ctx.strokeStyle = 'rgba(80,90,100,0.5)';
    ctx.lineWidth = 1;
    roundRect(ctx, cx - trackW / 2, cy - trackH / 2, trackW, trackH, trackH / 2);
    ctx.fill();
    ctx.stroke();

    // Fill arc when ON
    if (isOn) {
      const grad = ctx.createLinearGradient(cx - trackW / 2, 0, cx + trackW / 2, 0);
      grad.addColorStop(0, 'rgba(0,230,118,0.25)');
      grad.addColorStop(1, 'rgba(0,230,118,0.7)');
      ctx.fillStyle = grad;
      roundRect(ctx, cx - trackW / 2, cy - trackH / 2, trackW, trackH, trackH / 2);
      ctx.fill();
    }

    // Thumb
    const thumbX = isOn ? cx + trackW / 2 - 6 : cx - trackW / 2 + 6;
    if (isFinite(thumbX) && isFinite(cy)) {
      const thumbGrad = ctx.createRadialGradient(thumbX - 1, cy - 1, 1, thumbX, cy, 6);
      thumbGrad.addColorStop(0, isOn ? '#b9f6ca' : '#cfd8dc');
      thumbGrad.addColorStop(1, isOn ? '#00c853' : '#78909c');
      ctx.fillStyle = thumbGrad;
      ctx.beginPath();
      ctx.arc(thumbX, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.restore();
  }

  _hitTestSlider(wx, wy) {
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
    if (!defs) return null;
    for (const inst of this.components) {
      const def = defs[inst.type];
      if (!def || !Array.isArray(def.interactive) || def.interactive.length === 0) continue;
      const rects = this._getInteractiveRects(inst);
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        // Skip inline toggles — they are handled by _hitTestInlineToggle
        if (r.ctrl.type === 'toggle' && r.ctrl.inline) continue;
        if (wx >= r.x - 6 && wx <= r.x + r.width + 6 && wy >= r.y - 8 && wy <= r.y + r.height + 8) {
          return { inst, ctrl: r.ctrl, rect: r };
        }
      }
    }
    return null;
  }

  _hitTestInlineToggle(wx, wy) {
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
    if (!defs) return null;
    for (const inst of this.components) {
      const def = defs[inst.type];
      if (!def || !Array.isArray(def.interactive)) continue;
      for (const ctrl of def.interactive) {
        if (ctrl.type !== 'toggle' || !ctrl.inline) continue;
        const rx = inst.x + ctrl.inline.x;
        const ry = inst.y + ctrl.inline.y;
        const rw = ctrl.inline.w;
        const rh = ctrl.inline.h;
        if (wx >= rx && wx <= rx + rw && wy >= ry && wy <= ry + rh) {
          return { inst, ctrl };
        }
      }
    }
    return null;
  }

  _hitTestDsoButton(wx, wy) {
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
    if (!defs) return null;
    for (const inst of this.components) {
      if (inst.type !== 'dso_4ch') continue;
      const btnRects = inst._btnRects;
      if (!btnRects) continue;
      const lx = wx - inst.x;
      const ly = wy - inst.y;
      for (const [key, rect] of Object.entries(btnRects)) {
        if (lx >= rect.x && lx <= rect.x + rect.w && ly >= rect.y && ly <= rect.y + rect.h) {
          return { inst, key, rect };
        }
      }
    }
    return null;
  }

  _handleDsoButtonClick(inst, key) {
    const rs = inst.runtimeState || {};
    const props = inst.props || {};

    const cycleOptions = (field, options) => {
      const cur = rs[field] !== undefined ? rs[field] : (props[field] ?? options[0]);
      const idx = options.indexOf(cur);
      const next = options[(idx + 1) % options.length];
      rs[field] = next;
      props[field] = next;
    };

    switch (key) {
      case 'ch1':
      case 'ch2':
      case 'ch3':
      case 'ch4': {
        const field = key + '_en';
        const defVal = (key === 'ch1' || key === 'ch2');
        const cur = rs[field] !== undefined ? rs[field] : (props[field] ?? defVal);
        rs[field] = !cur;
        props[field] = !cur;
        break;
      }
      case 'runStop': {
        const cur = rs.runStop !== undefined ? rs.runStop : (props.runStop ?? 1);
        rs.runStop = cur ? 0 : 1;
        props.runStop = rs.runStop;
        break;
      }
      case 'single': {
        const cur = rs.singleTrigger !== undefined ? rs.singleTrigger : (props.singleTrigger ?? 0);
        rs.singleTrigger = cur ? 0 : 1;
        props.singleTrigger = rs.singleTrigger;
        break;
      }
      case 'autoSet': {
        rs.autoSet = 1;
        props.autoSet = 1;
        break;
      }
      case 'fullscreen': {
        if (window.App) window.App.openDSOFullscreen(inst);
        break;
      }
      case 'trigSrc': {
        cycleOptions('trig_source', ['ch1', 'ch2', 'ch3', 'ch4']);
        break;
      }
      case 'trigSlope': {
        cycleOptions('trig_slope', ['rising', 'falling']);
        break;
      }
      case 'dsoMode': {
        cycleOptions('dsoMode', ['scope', 'spectrum', 'xy']);
        break;
      }
      case 'mathOp': {
        cycleOptions('math_op', ['off', 'add', 'sub', 'abs', 'mul']);
        break;
      }
      case 'ch1Coupling': {
        cycleOptions('ch1_coupling', ['dc', 'ac', 'gnd']);
        break;
      }
      case 'ch2Coupling': {
        cycleOptions('ch2_coupling', ['dc', 'ac', 'gnd']);
        break;
      }
      case 'pause': {
        rs.paused = !rs.paused;
        break;
      }
    }
  }

  _hitTestFuncGenButton(wx, wy) {
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
    if (!defs) return null;
    for (const inst of this.components) {
      if (inst.type !== 'func_gen') continue;
      const btnRects = inst._btnRects;
      if (!btnRects) continue;
      const lx = wx - inst.x;
      const ly = wy - inst.y;
      for (const [key, rect] of Object.entries(btnRects)) {
        if (lx >= rect.x && lx <= rect.x + rect.w && ly >= rect.y && ly <= rect.y + rect.h) {
          return { inst, key, rect };
        }
      }
    }
    return null;
  }

  _handleFuncGenButtonClick(inst, key) {
    const rs = inst.runtimeState || {};
    const props = inst.props || {};

    const cycleOptions = (field, options) => {
      const cur = rs[field] !== undefined ? rs[field] : (props[field] ?? options[0]);
      const idx = options.indexOf(cur);
      const next = options[(idx + 1) % options.length];
      rs[field] = next;
      props[field] = next;
    };

    const waveOpts = ['sine', 'square', 'triangle', 'sawtooth', 'noise'];

    const freqSteps = [1, 10, 100, 1000, 10000, 100000, 1000000];
    const shiftFreq = (field, dir) => {
      const cur = rs[field] !== undefined ? rs[field] : (props[field] ?? 440);
      let step = 1;
      for (const s of freqSteps) { if (cur >= s) step = s; }
      const newVal = Math.max(1, Math.min(10000000, cur + dir * step));
      rs[field] = newVal;
      props[field] = newVal;
    };

    switch (key) {
      case 'ch1Wave': {
        cycleOptions('ch1_wave', waveOpts);
        break;
      }
      case 'ch2Wave': {
        cycleOptions('ch2_wave', waveOpts);
        break;
      }
      case 'ch1FreqUp': {
        shiftFreq('ch1_freq', 1);
        break;
      }
      case 'ch1FreqDown': {
        shiftFreq('ch1_freq', -1);
        break;
      }
      case 'ch2FreqUp': {
        shiftFreq('ch2_freq', 1);
        break;
      }
      case 'ch2FreqDown': {
        shiftFreq('ch2_freq', -1);
        break;
      }
    }
  }

  _hitTestDipSwitch(wx, wy) {
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
    if (!defs) return null;
    for (const inst of this.components) {
      if (inst.type !== 'dip_switch') continue;
      const def = defs[inst.type];
      if (!def) continue;
      const lx = wx - inst.x;
      const ly = wy - inst.y;
      for (let i = 0; i < 8; i++) {
        const sx = 12 + i * 16;
        if (lx >= sx - 8 && lx <= sx + 12 && ly >= 6 && ly <= 42) {
          return { inst, bit: i };
        }
      }
    }
    return null;
  }

  _hitTestKeypadButton(wx, wy) {
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
    if (!defs) return null;
    const keyMap = [
      ['1','2','3','A'],
      ['4','5','6','B'],
      ['7','8','9','C'],
      ['*','0','#','D']
    ];
    const btnW = 24, btnH = 20, startX = 14, startY = 14, gapX = 6, gapY = 6;
    for (const inst of this.components) {
      if (inst.type !== 'keypad_4x4') continue;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const kx = inst.x + startX + col * (btnW + gapX);
          const ky = inst.y + startY + row * (btnH + gapY);
          if (wx >= kx && wx <= kx + btnW && wy >= ky && wy <= ky + btnH) {
            return { inst, key: keyMap[row][col] };
          }
        }
      }
    }
    return null;
  }

  _updateSliderValue(drag, wx, wy) {
    const { inst, ctrl, rect } = drag;

    // Toggle: click anywhere to flip
    if (ctrl.type === 'toggle') {
      inst.runtimeState = inst.runtimeState || {};
      const cur = Number(inst.runtimeState[ctrl.field] ?? inst.props?.[ctrl.field] ?? ctrl.min);
      inst.runtimeState[ctrl.field] = cur > 0 ? ctrl.min : ctrl.max;
      return;
    }

    // Knob or range slider: drag horizontally
    const pct = Math.max(0, Math.min(1, (wx - rect.x) / rect.width));
    let value = ctrl.min + pct * (ctrl.max - ctrl.min);
    if (ctrl.step) value = Math.round(value / ctrl.step) * ctrl.step;
    value = Math.max(ctrl.min, Math.min(ctrl.max, value));
    inst.runtimeState = inst.runtimeState || {};
    inst.runtimeState[ctrl.field] = value;
  }

  _drawOverlays(ctx) {
    // Draw component labels
    if (this.zoom >= 0.7) {
      for (const inst of this.components) {
        const def = window.ArduinoComponents.COMPONENT_DEFS[inst.type];
        if (!def) continue;
        const labelText = inst.props.label || def.name;
        ctx.save();
        ctx.fillStyle = 'rgba(200,200,200,0.6)';
        ctx.font = `${11 / this.zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(labelText, inst.x + def.width / 2, inst.y - 8 / this.zoom);
        ctx.restore();
      }
    }
  }

  /* ══════════════ COMPONENT MANAGEMENT ══════════════ */
  addComponent(type, worldX, worldY) {
    const def = window.ArduinoComponents.COMPONENT_DEFS[type];
    if (!def) return null;
    const wx = Number.isFinite(Number(worldX)) ? Number(worldX) : 0;
    const wy = Number.isFinite(Number(worldY)) ? Number(worldY) : 0;

    const inst = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      x: this._snap(wx - def.width / 2),
      y: this._snap(wy - def.height / 2),
      width: def.width,
      height: def.height,
      props: { ...(def.defaultProps || {}) },
      runtimeState: {},
      selected: false,
      rotation: 0,
    };

    this._pushHistory();
    this.components.push(inst);
    this._onChanged();
    return inst;
  }

  removeComponent(id) {
    this._pushHistory();
    this.wires = this.wires.filter(w => w.from.instId !== id && w.to.instId !== id);
    this.components = this.components.filter(c => c.id !== id);
    if (this.selected && this.selected.id === id) this.selected = null;
    this._onChanged();
  }

  addWire(fromInstId, fromPinId, toInstId, toPinId, color = null, waypoints = []) {
    // Never allow a pin to be wired to itself
    if (fromInstId === toInstId && fromPinId === toPinId) return null;

    // Avoid duplicate wires
    const exists = this.wires.some(w =>
      (w.from.instId === fromInstId && w.from.pinId === fromPinId && w.to.instId === toInstId && w.to.pinId === toPinId) ||
      (w.from.instId === toInstId && w.from.pinId === toPinId && w.to.instId === fromInstId && w.to.pinId === fromPinId)
    );
    if (exists) return null;

    this._pushHistory();
    const wire = {
      id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      from: { instId: fromInstId, pinId: fromPinId },
      to: { instId: toInstId, pinId: toPinId },
      color: color || null,
      waypoints: Array.isArray(waypoints) ? waypoints.map(wp => ({ x: wp.x, y: wp.y })) : []
    };
    this.wires.push(wire);
    this._onChanged();
    return wire;
  }

  setWireColor(wireId, color) {
    const wire = this.wires.find(w => w.id === wireId);
    if (!wire) return;
    this._pushHistory();
    wire.color = color || null;
    this._onChanged();
  }

  _simplifyWaypoints(wire) {
    if (!wire || !wire.waypoints || wire.waypoints.length === 0) return;
    const p1 = this._getPinWorldPos(wire.from.instId, wire.from.pinId);
    const p2 = this._getPinWorldPos(wire.to.instId, wire.to.pinId);
    if (!p1 || !p2) return;

    let pts = [p1, ...wire.waypoints, p2];
    let simplified = [pts[0]];

    for (let i = 1; i < pts.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const curr = pts[i];
      const next = pts[i + 1];

      // Skip duplicate consecutive points
      if (Math.abs(curr.x - prev.x) < 0.5 && Math.abs(curr.y - prev.y) < 0.5) continue;

      // Skip redundant collinear points on straight line
      const isCollinearX = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
      const isCollinearY = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
      if (isCollinearX || isCollinearY) continue;

      simplified.push(curr);
    }
    simplified.push(p2);

    wire.waypoints = simplified.slice(1, -1).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  }

  removeWire(id) {
    this._pushHistory();
    this.wires = this.wires.filter(w => w.id !== id);
    if (this.selectedWire && this.selectedWire.id === id) this.selectedWire = null;
    this._onChanged();
  }

  clearCanvas() {
    this._pushHistory();
    this.components = [];
    this.wires = [];
    this.selected = null;
    this.selectedWire = null;
    this._onChanged();
  }

  rotateSelected() {
    const selComps = this.components.filter(c => c.selected);
    if (selComps.length === 0 && this.selected) selComps.push(this.selected);
    if (selComps.length === 0) return;
    this._pushHistory();
    for (const c of selComps) {
      c.rotation = ((c.rotation || 0) + 1) % 4;
    }
    this._onChanged();
  }

  deleteSelected() {
    const selComps = this.components.filter(c => c.selected);
    if (selComps.length > 0) {
      this._pushHistory();
      const ids = new Set(selComps.map(c => c.id));
      this.wires = this.wires.filter(w => !ids.has(w.from.instId) && !ids.has(w.to.instId));
      this.components = this.components.filter(c => !ids.has(c.id));
      this.selected = null;
      this.selectedWire = null;
      this._onChanged();
      return;
    }
    if (this.selectedWire) { this.removeWire(this.selectedWire.id); }
  }

  selectAll() {
    this.components.forEach(c => c.selected = true);
    this.selected = this.components[this.components.length - 1] || null;
  }

  duplicateSelected() {
    // Collect all selected components
    let selComps = this.components.filter(c => c.selected);
    if (selComps.length === 0 && this.selected) selComps = [this.selected];
    if (selComps.length === 0) return null;

    this._pushHistory();
    this._selectAll(false);

    const selIds = new Set(selComps.map(c => c.id));
    const selWires = this.wires.filter(w => selIds.has(w.from.instId) && selIds.has(w.to.instId));
    const offset = this.GRID * 2;
    const idMap = {};
    const dupes = [];

    for (const orig of selComps) {
      const def = window.ArduinoComponents.COMPONENT_DEFS[orig.type];
      const newId = `${orig.type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      idMap[orig.id] = newId;
      const copy = {
        id: newId,
        type: orig.type,
        x: orig.x + offset,
        y: orig.y + offset,
        width: def ? def.width : orig.width,
        height: def ? def.height : orig.height,
        props: JSON.parse(JSON.stringify(orig.props || (def ? def.defaultProps : {}))),
        runtimeState: {},
        selected: true,
        rotation: orig.rotation || 0,
      };
      this.components.push(copy);
      dupes.push(copy);
    }

    for (const w of selWires) {
      const nf = idMap[w.from.instId], nt = idMap[w.to.instId];
      if (nf && nt) this.addWire(nf, w.from.pinId, nt, w.to.pinId, w.color, w.waypoints);
    }

    this.selected = dupes[dupes.length - 1] || null;
    this.selectedWire = null;
    this._onChanged();
    return this.selected;
  }

  copySelected() {
    // Collect all components where selected === true
    let selComps = this.components.filter(c => c.selected);
    // Fall back to single selected component
    if (selComps.length === 0 && this.selected) selComps = [this.selected];
    if (selComps.length === 0) return;

    const selIds = new Set(selComps.map(c => c.id));
    // Only copy wires where BOTH endpoints are in the selected set
    const selWires = this.wires.filter(w =>
      selIds.has(w.from.instId) && selIds.has(w.to.instId)
    );

    this._clipboard = {
      components: JSON.parse(JSON.stringify(selComps)),
      wires: JSON.parse(JSON.stringify(selWires)),
    };
  }

  paste() {
    if (!this._clipboard) return;
    const { components: origComps, wires: origWires } = this._clipboard;
    if (!origComps || origComps.length === 0) return;

    this._pushHistory();
    this._selectAll(false);

    // Compute bounding box of clipboard components for offset
    let minX = Infinity, minY = Infinity;
    for (const c of origComps) {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
    }

    const offset = this.GRID * 4;
    const idMap = {}; // oldId → newId
    const pastedComps = [];

    for (const orig of origComps) {
      const def = window.ArduinoComponents.COMPONENT_DEFS[orig.type];
      const newId = `${orig.type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      idMap[orig.id] = newId;
      const copy = {
        id: newId,
        type: orig.type,
        x: orig.x + offset,
        y: orig.y + offset,
        width: def ? def.width : orig.width,
        height: def ? def.height : orig.height,
        props: JSON.parse(JSON.stringify(orig.props || {})),
        runtimeState: {},
        selected: true,
        rotation: orig.rotation || 0,
      };
      this.components.push(copy);
      pastedComps.push(copy);
    }

    // Remap and add wires
    for (const origWire of (origWires || [])) {
      const newFromId = idMap[origWire.from.instId];
      const newToId = idMap[origWire.to.instId];
      if (!newFromId || !newToId) continue;
      this.addWire(newFromId, origWire.from.pinId, newToId, origWire.to.pinId, origWire.color, origWire.waypoints);
    }

    this.selected = pastedComps[pastedComps.length - 1] || null;
    this.selectedWire = null;

    // Update clipboard positions for sequential pastes
    for (const c of this._clipboard.components) {
      c.x += offset;
      c.y += offset;
    }

    this._onChanged();
  }

  startPlacing(type) {
    this.mode = 'placing';
    this.placingType = type;
    this.canvas.style.cursor = 'crosshair';
    // Show hint
    const hint = document.getElementById('placing-hint');
    const nameEl = document.getElementById('placing-name');
    if (hint && nameEl) {
      const def = window.ArduinoComponents.COMPONENT_DEFS[type];
      nameEl.textContent = def ? def.name : type;
      hint.classList.remove('hidden');
    }
    // Notify app that placing mode started
    if (this.onPlacingChanged) this.onPlacingChanged(true, type);
  }

  cancelPlacing() {
    this.mode = 'idle';
    this.placingType = null;
    this.placingMouse = null;
    this.canvas.style.cursor = '';
    const hint = document.getElementById('placing-hint');
    if (hint) hint.classList.add('hidden');
    // Remove active class from sidebar
    document.querySelectorAll('.comp-item').forEach(el => el.classList.remove('placing'));
    // Notify app that placing mode ended
    if (this.onPlacingChanged) this.onPlacingChanged(false);
  }

  /* ══════════════ EVENT HANDLING ══════════════ */
  _bindEvents() {
    const canvas = this.canvas;

    canvas.addEventListener('mousedown', e => this._onMouseDown(e));
    canvas.addEventListener('mousemove', e => this._onMouseMove(e));
    canvas.addEventListener('mouseup', e => this._onMouseUp(e));
    canvas.addEventListener('wheel', e => this._onWheel(e), { passive: false });
    canvas.addEventListener('dblclick', e => this._onDblClick(e));
    canvas.addEventListener('contextmenu', e => this._onContextMenu(e));
    canvas.addEventListener('mouseleave', () => this._hidePinTooltip());

    // Touch events for mobile
    canvas.addEventListener('touchstart', e => this._onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', e => this._onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', e => this._onTouchEnd(e), { passive: false });

    document.addEventListener('keydown', e => this._onKeyDown(e));
    document.addEventListener('mouseup', () => { if (this.mode === 'panning') this.mode = 'idle'; });
  }

  /* ═══════════════ TOUCH HANDLERS ═══════════════ */
  _onTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      this._pinchStart = this._getTouchDist(e.touches);
      this._pinchCenter = this._getTouchCenter(e.touches);
      this._isPinching = true;
      return;
    }
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const offsetX = touch.clientX - rect.left;
      const offsetY = touch.clientY - rect.top;
      this._longPressTimer = setTimeout(() => {
        this._onLongPress(offsetX, offsetY);
      }, 500);
      this._touchStartPos = { x: touch.clientX, y: touch.clientY };
      // Simulate mouse event for single tap
      this._onMouseDown({ button: 0, offsetX, offsetY, clientX: touch.clientX, clientY: touch.clientY, altKey: false });
    }
  }

  _onTouchMove(e) {
    if (this._isPinching && e.touches.length === 2) {
      e.preventDefault();
      const dist = this._getTouchDist(e.touches);
      const center = this._getTouchCenter(e.touches);
      const factor = dist / this._pinchStart;
      const rect = this.canvas.getBoundingClientRect();
      const mx = center.x - rect.left;
      const my = center.y - rect.top;

      this.panX -= (mx - this.panX) * (factor - 1);
      this.panY -= (my - this.panY) * (factor - 1);
      this.zoom = Math.max(0.1, Math.min(4, this.zoom * factor));
      this._pinchStart = dist;
      this._pinchCenter = center;
      this._updateZoomDisplay();
      return;
    }
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const offsetX = touch.clientX - rect.left;
      const offsetY = touch.clientY - rect.top;
      // Cancel long press if moved too far
      if (this._touchStartPos) {
        const dx = touch.clientX - this._touchStartPos.x;
        const dy = touch.clientY - this._touchStartPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > 10) {
          clearTimeout(this._longPressTimer);
        }
      }
      this._onMouseMove({ offsetX, offsetY, clientX: touch.clientX, clientY: touch.clientY, button: 0 });
    }
  }

  _onTouchEnd(e) {
    clearTimeout(this._longPressTimer);
    this._isPinching = false;
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const rect = this.canvas.getBoundingClientRect();
      const offsetX = touch.clientX - rect.left;
      const offsetY = touch.clientY - rect.top;
      this._onMouseUp({ offsetX, offsetY, clientX: touch.clientX, clientY: touch.clientY, button: 0 });
    }
  }

  _getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _getTouchCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  _onLongPress(offsetX, offsetY) {
    const world = this._toWorld(offsetX, offsetY);
    const comp = this._hitTestComp(world.x, world.y);
    if (comp) {
      this._selectAll(false);
      comp.selected = true;
      this.selected = comp;
      if (window.App) window.App._showContextMenu(comp, offsetX + this.canvas.getBoundingClientRect().left, offsetY + this.canvas.getBoundingClientRect().top);
    }
  }

  _onMouseDown(e) {
    const world = this._toWorld(e.offsetX, e.offsetY);
    this._lastMouse = { x: e.clientX, y: e.clientY };

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle/Alt+left = pan
      this.mode = 'panning';
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button === 0) {
      if (this.mode === 'placing') {
        this._placeComponent(world);
        return;
      }

      // Check pin click first (start wiring)
      const pinHit = this._hitTestPin(world.x, world.y);
      if (pinHit) {
        if (this.mode === 'wiring') {
          // Complete wire if compatible pin
          if (pinHit.inst.id !== this.wiringFrom.inst.id) {
            this.addWire(this.wiringFrom.inst.id, this.wiringFrom.pin.id, pinHit.inst.id, pinHit.pin.id);
          }
          this._endWiring();
        } else {
          // Start wiring
          this._startWiring(pinHit.inst, pinHit.pin, pinHit.worldX, pinHit.worldY);
        }
        return;
      }

      if (this.mode === 'wiring') {
        this._endWiring();
        return;
      }

      // Interactive on-canvas slider (potentiometer / sensor value)
      const sliderHit = this._hitTestSlider(world.x, world.y);
      if (sliderHit) {
        this._selectAll(false);
        this.selected = null;
        this.selectedWire = null;
        this.mode = 'sliderdrag';
        this.sliderDrag = sliderHit;
        this._updateSliderValue(sliderHit, world.x, world.y);
        return;
      }

      // Inline toggle inside a component (Power/Output switches on bench supply)
      const inlineHit = this._hitTestInlineToggle(world.x, world.y);
      if (inlineHit) {
        const { inst, ctrl } = inlineHit;
        inst.runtimeState = inst.runtimeState || {};
        const cur = Number(inst.runtimeState[ctrl.field] ?? inst.props?.[ctrl.field] ?? ctrl.min);
        inst.runtimeState[ctrl.field] = cur > 0 ? ctrl.min : ctrl.max;
        this._selectAll(false);
        inst.selected = true;
        this.selected = inst;
        return;
      }

      // DSO button clicks (channel toggles, trigger, mode, etc.)
      const dsoHit = this._hitTestDsoButton(world.x, world.y);
      if (dsoHit) {
        const { inst, key } = dsoHit;
        inst.runtimeState = inst.runtimeState || {};
        this._handleDsoButtonClick(inst, key);
        this._selectAll(false);
        inst.selected = true;
        this.selected = inst;
        return;
      }

      // Function Generator button clicks (wave selectors)
      const funcGenHit = this._hitTestFuncGenButton(world.x, world.y);
      if (funcGenHit) {
        const { inst, key } = funcGenHit;
        inst.runtimeState = inst.runtimeState || {};
        this._handleFuncGenButtonClick(inst, key);
        this._selectAll(false);
        inst.selected = true;
        this.selected = inst;
        return;
      }

      // DIP switch individual toggle
      const dipHit = this._hitTestDipSwitch(world.x, world.y);
      if (dipHit) {
        const { inst, bit } = dipHit;
        inst.runtimeState = inst.runtimeState || {};
        const cur = inst.runtimeState.switches ?? inst.props.switches ?? 0;
        inst.runtimeState.switches = cur ^ (1 << bit);
        this._selectAll(false);
        inst.selected = true;
        this.selected = inst;
        return;
      }

      // Keypad button click — press on click, auto-release after 150ms
      const keypadHit = this._hitTestKeypadButton(world.x, world.y);
      if (keypadHit) {
        const { inst, key } = keypadHit;
        inst.runtimeState = inst.runtimeState || {};
        // Clear any pending release timer
        if (inst.runtimeState._keyReleaseTimer) clearTimeout(inst.runtimeState._keyReleaseTimer);
        inst.runtimeState.pressedKey = key;
        this._selectAll(false);
        inst.selected = true;
        this.selected = inst;
        this._render();
        // Auto-release after 150ms
        inst.runtimeState._keyReleaseTimer = setTimeout(() => {
          inst.runtimeState.pressedKey = null;
          this._render();
        }, 150);
        return;
      }

      // Check wire click (select and/or start dragging segment/handle)
      const wireDetail = this._hitTestWireDetails(world.x, world.y);
      if (wireDetail) {
        this._selectAll(false);
        this.selectedWire = wireDetail.wire;
        this.selected = null;

        const wire = wireDetail.wire;
        const p1 = this._getPinWorldPos(wire.from.instId, wire.from.pinId);
        const p2 = this._getPinWorldPos(wire.to.instId, wire.to.pinId);

        // If wire doesn't have waypoints yet, initialize them from current polyline
        if ((!wire.waypoints || wire.waypoints.length === 0) && wireDetail.pts && wireDetail.pts.length > 2) {
          wire.waypoints = wireDetail.pts.slice(1, -1).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
        }

        const currentPts = this._wirePath(wire) || wireDetail.pts;

        this.mode = 'wiredrag';
        this.draggingWire = {
          wireId: wire.id,
          handleIdx: wireDetail.handleIdx,
          segIdx: wireDetail.segIdx,
          startWorld: { x: world.x, y: world.y },
          initialWaypoints: (wire.waypoints || []).map(p => ({ x: p.x, y: p.y })),
          pts: currentPts.map(p => ({ x: p.x, y: p.y })),
          moved: false
        };
        this.canvas.style.cursor = 'grabbing';
        return;
      }

      // Check component click
      const compHit = this._hitTestComp(world.x, world.y);
      if (compHit) {
        if (!e.shiftKey) this._selectAll(false);
        compHit.selected = true;
        this.selected = compHit;
        this.selectedWire = null;

        // --- New: toggle push_button pressed state on click ---
        if (compHit.type === 'push_button') {
          const inst = compHit;
          inst.runtimeState = inst.runtimeState || {};
          inst.runtimeState.pressed = !inst.runtimeState.pressed;
        }
        // ------------------------------------------------

        this.mode = 'dragging';
        this.dragging = {
          inst: compHit,
          offsetX: world.x - compHit.x,
          offsetY: world.y - compHit.y,
          startX: compHit.x,
          startY: compHit.y,
          moved: false,
        };
        return;
      }

      // Click on empty space — deselect
      this._selectAll(false);
      this.selected = null;
      this.selectedWire = null;

      // Start pan
      this.mode = 'panning';
      this.canvas.style.cursor = 'grabbing';
    }
  }

  _onMouseMove(e) {
    const world = this._toWorld(e.offsetX, e.offsetY);
    this._updateCoords(e.offsetX, e.offsetY, world);

    if (this.mode === 'panning') {
      const dx = e.clientX - this._lastMouse.x;
      const dy = e.clientY - this._lastMouse.y;
      this.panX += dx;
      this.panY += dy;
      this._lastMouse = { x: e.clientX, y: e.clientY };
      this._hidePinTooltip();
      return;
    }

    if (this.mode === 'dragging' && this.dragging) {
      const newX = this._snap(world.x - this.dragging.offsetX);
      const newY = this._snap(world.y - this.dragging.offsetY);
      this.dragging.inst.x = newX;
      this.dragging.inst.y = newY;
      this.dragging.moved = true;
      this._lastMouse = { x: e.clientX, y: e.clientY };
      this._hidePinTooltip();
      return;
    }

    if (this.mode === 'sliderdrag' && this.sliderDrag) {
      this._updateSliderValue(this.sliderDrag, world.x, world.y);
      return;
    }

    if (this.mode === 'wiredrag' && this.draggingWire) {
      const wire = this.wires.find(w => w.id === this.draggingWire.wireId);
      if (!wire) return;

      const p1 = this._getPinWorldPos(wire.from.instId, wire.from.pinId);
      const p2 = this._getPinWorldPos(wire.to.instId, wire.to.pinId);
      if (!p1 || !p2) return;

      this.draggingWire.moved = true;
      const snapX = this._snap(world.x);
      const snapY = this._snap(world.y);

      // Case 1: Dragging an existing waypoint handle directly
      if (this.draggingWire.handleIdx >= 0 && wire.waypoints && wire.waypoints[this.draggingWire.handleIdx]) {
        wire.waypoints[this.draggingWire.handleIdx].x = snapX;
        wire.waypoints[this.draggingWire.handleIdx].y = snapY;
        this._render();
        return;
      }

      // Case 2: Dragging a segment
      const initPts = [p1, ...this.draggingWire.initialWaypoints.map(p => ({ x: p.x, y: p.y })), p2];
      const segIdx = this.draggingWire.segIdx;

      if (segIdx >= 0 && segIdx < initPts.length - 1) {
        const a = initPts[segIdx];
        const b = initPts[segIdx + 1];
        const isHoriz = Math.abs(a.y - b.y) <= 2;
        const isVert = Math.abs(a.x - b.x) <= 2;

        if (isHoriz) {
          if (initPts.length === 2) {
            wire.waypoints = [
              { x: a.x, y: snapY },
              { x: b.x, y: snapY }
            ];
          } else if (segIdx === 0) {
            const nextWp = initPts[1];
            wire.waypoints = [
              { x: a.x, y: snapY },
              { x: nextWp.x, y: snapY },
              ...initPts.slice(2, -1)
            ];
          } else if (segIdx === initPts.length - 2) {
            const prevWp = initPts[initPts.length - 2];
            wire.waypoints = [
              ...initPts.slice(1, -2),
              { x: prevWp.x, y: snapY },
              { x: b.x, y: snapY }
            ];
          } else {
            const wps = this.draggingWire.initialWaypoints.map(p => ({ ...p }));
            const wpAIdx = segIdx - 1;
            const wpBIdx = segIdx;
            if (wps[wpAIdx]) wps[wpAIdx].y = snapY;
            if (wps[wpBIdx]) wps[wpBIdx].y = snapY;
            wire.waypoints = wps;
          }
        } else if (isVert) {
          if (initPts.length === 2) {
            wire.waypoints = [
              { x: snapX, y: a.y },
              { x: snapX, y: b.y }
            ];
          } else if (segIdx === 0) {
            const nextWp = initPts[1];
            wire.waypoints = [
              { x: snapX, y: a.y },
              { x: snapX, y: nextWp.y },
              ...initPts.slice(2, -1)
            ];
          } else if (segIdx === initPts.length - 2) {
            const prevWp = initPts[initPts.length - 2];
            wire.waypoints = [
              ...initPts.slice(1, -2),
              { x: snapX, y: prevWp.y },
              { x: snapX, y: b.y }
            ];
          } else {
            const wps = this.draggingWire.initialWaypoints.map(p => ({ ...p }));
            const wpAIdx = segIdx - 1;
            const wpBIdx = segIdx;
            if (wps[wpAIdx]) wps[wpAIdx].x = snapX;
            if (wps[wpBIdx]) wps[wpBIdx].x = snapX;
            wire.waypoints = wps;
          }
        } else {
          if (segIdx === 0) {
            wire.waypoints = [{ x: snapX, y: snapY }, ...initPts.slice(2, -1)];
          } else {
            const wps = this.draggingWire.initialWaypoints.map(p => ({ ...p }));
            if (wps[segIdx - 1]) {
              wps[segIdx - 1].x = snapX;
              wps[segIdx - 1].y = snapY;
            }
            wire.waypoints = wps;
          }
        }
      }

      this._render();
      return;
    }

    if (this.mode === 'wiring') {
      this.wireMouse = world;
      this._hidePinTooltip();
      return;
    }

    if (this.mode === 'placing') {
      this.placingMouse = world;
      this._hidePinTooltip();
      return;
    }

    // Hover cursor + pin tooltip
    const pin = this._hitTestPin(world.x, world.y);
    const comp = this._hitTestComp(world.x, world.y);
    const wireDetail = this._hitTestWireDetails(world.x, world.y);

    if (pin) {
      this.canvas.style.cursor = 'crosshair';
      this._showPinTooltip(pin, e);
    } else {
      this._hidePinTooltip();
      if (comp) {
        this.canvas.style.cursor = 'move';
      } else if (wireDetail) {
        this.canvas.style.cursor = 'grab';
      } else {
        this.canvas.style.cursor = '';
      }
    }
  }

  _onMouseUp(e) {
    if (this.mode === 'dragging' && this.dragging) {
      if (this.dragging.moved) {
        this._pushHistory();
        this._onChanged();
      }
      this.mode = 'idle';
      this.dragging = null;
    }
    if (this.mode === 'panning') {
      this.mode = 'idle';
      this.canvas.style.cursor = '';
    }
    if (this.mode === 'sliderdrag') {
      this.mode = 'idle';
      this.sliderDrag = null;
    }
    if (this.mode === 'wiredrag' && this.draggingWire) {
      const wire = this.wires.find(w => w.id === this.draggingWire.wireId);
      if (wire) {
        this._simplifyWaypoints(wire);
      }
      if (this.draggingWire.moved) {
        this._pushHistory();
        this._onChanged();
      }
      this.mode = 'idle';
      this.draggingWire = null;
      this.canvas.style.cursor = '';
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Zoom around mouse position
    this.panX -= (mx - this.panX) * (factor - 1);
    this.panY -= (my - this.panY) * (factor - 1);
    this.zoom = Math.max(0.1, Math.min(4, this.zoom * factor));

    this._updateZoomDisplay();
  }

  _onDblClick(e) {
    const world = this._toWorld(e.offsetX, e.offsetY);
    const comp = this._hitTestComp(world.x, world.y);
    if (comp && window.App) {
      if (comp.type === 'dso_4ch') {
        window.App.openDSOFullscreen(comp);
        return;
      }
      window.App.openPropsModal(comp);
    }
  }

  _onContextMenu(e) {
    e.preventDefault();
    const world = this._toWorld(e.offsetX, e.offsetY);
    const comp = this._hitTestComp(world.x, world.y);
    const wire = this._hitTestWire(world.x, world.y);
    if (comp) {
      this._selectAll(false);
      comp.selected = true;
      this.selected = comp;
      this.selectedWire = null;
    } else if (wire) {
      this._selectAll(false);
      this.selectedWire = wire;
      this.selected = null;
    }
    if (this.onContextMenu) {
      this.onContextMenu(comp || (wire ? { type: 'wire', id: wire.id, wire } : null), e.clientX, e.clientY);
    }
  }

  _onKeyDown(e) {
    // Only handle when canvas is in focus (not in editor)
    const t = e.target;
    if (t && typeof t.closest === 'function' && t.closest('#editor-container')) return;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    // Prevent repeated actions when key is held down (for single-press actions)
    if (e.repeat && !e.ctrlKey && !e.metaKey) return;

    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.deleteSelected(); }
    if (e.key === 'r' || e.key === 'R') { this.rotateSelected(); }
    if ((e.key === ' ' || e.key === 'Enter') && this.selected && this.selected.type === 'push_button') {
      e.preventDefault();
      this.selected.runtimeState = this.selected.runtimeState || {};
      this.selected.runtimeState.pressed = !this.selected.runtimeState.pressed;
    }
    if (e.key === 'Escape') {
      if (this.mode === 'placing') this.cancelPlacing();
      if (this.mode === 'wiring') this._endWiring();
      this._selectAll(false);
      this.selected = null;
      this.selectedWire = null;
    }
    if (e.key === 'f' || e.key === 'F') { this.fitView(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'c') { this.copySelected(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'v') { this.paste(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'd') { e.preventDefault(); this.duplicateSelected(); }
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
    if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); this.redo(); }
    if (e.ctrlKey && e.key === 'a') { e.preventDefault(); this.selectAll(); }
  }

  /* ══════════════ WIRING ══════════════ */
  _startWiring(inst, pin, wx, wy) {
    this.mode = 'wiring';
    this.wiringFrom = { inst, pin, wx, wy };
    this.wireMouse = { x: wx, y: wy };
    const hint = document.getElementById('wiring-hint');
    if (hint) hint.classList.remove('hidden');
    this.canvas.style.cursor = 'crosshair';
  }

  _endWiring() {
    this.mode = 'idle';
    this.wiringFrom = null;
    this.wireMouse = null;
    this.canvas.style.cursor = '';
    const hint = document.getElementById('wiring-hint');
    if (hint) hint.classList.add('hidden');
  }

  /* ══════════════ HIT TESTING ══════════════ */
  _hitTestPin(wx, wy) {
    const { COMPONENT_DEFS } = window.ArduinoComponents;
    const radius = Math.max(8, 10 / this.zoom);

    for (const inst of [...this.components].reverse()) {
      const def = COMPONENT_DEFS[inst.type];
      if (!def) continue;
      for (const pin of def.pins) {
        const wp = this._pinWorldPos(inst, pin);
        const px = wp.x;
        const py = wp.y;
        const dist = Math.sqrt((wx - px) ** 2 + (wy - py) ** 2);
        if (dist <= radius) {
          return { inst, pin, worldX: px, worldY: py };
        }
      }
    }
    return null;
  }

  /* ══════════════ PIN TOOLTIP ══════════════ */
  _pinTypeLabel(type) {
    const map = {
      digital: 'Digital I/O',
      pwm: 'PWM (Digital)',
      analog: 'Analog In (A/D)',
      power: 'Power',
      gnd: 'Ground',
      signal: 'Signal',
    };
    return map[type] || type;
  }

  _showPinTooltip(hit, e) {
    if (this.mode !== 'idle') return;
    if (!this.tooltipEl) this.tooltipEl = document.getElementById('pin-tooltip');
    const el = this.tooltipEl;
    if (!el) return;

    const { inst, pin } = hit;
    const key = `${inst.id}|${pin.id}`;
    const def = window.ArduinoComponents.COMPONENT_DEFS[inst.type];
    const typeLabel = this._pinTypeLabel(pin.type);
    const pinNum = this._pinToNumber(pin.id);
    const sim = window.ArduinoSim;
    const running = !!(sim && sim.isRunning);

    // Rebuild content only when hovering a different pin
    if (key !== this._tipKey) {
      this._tipKey = key;
      el.innerHTML = '';
      const frag = document.createDocumentFragment();

      const compName = (inst.props && inst.props.label)
        ? inst.props.label
        : ((def && def.name) || inst.type);
      const title = document.createElement('div');
      title.className = 'pin-tip-title';
      title.textContent = `${compName} · ${pin.label}`;
      frag.appendChild(title);

      const addRow = (k, v, cls) => {
        const row = document.createElement('div');
        row.className = 'pin-tip-row';
        const kEl = document.createElement('span');
        kEl.textContent = k;
        const vEl = document.createElement('b');
        vEl.textContent = v;
        if (cls) vEl.className = cls;
        row.appendChild(kEl);
        row.appendChild(vEl);
        frag.appendChild(row);
      };

      addRow('Type', typeLabel);
      // Pin function description from the guide reference
      const pinDoc = window.GuidePinDescs && window.GuidePinDescs[inst.type];
      if (pinDoc) {
        if (pinDoc[pin.id] && pinDoc[pin.id].desc) {
          addRow('Function', pinDoc[pin.id].desc);
        } else {
          // Board-style grouped pins (e.g. D0–D13, VP / VN): find a matching group
          const match = Object.entries(pinDoc).find(([k, v]) =>
            v.label && this._pinMatchesGroup(pin.id, v.label));
          if (match && match[1].desc) addRow('Function', match[1].desc);
        }
      }
      if (inst.type === 'esp32_devkit_v1') {
        const espAliases = { VP: 36, VN: 39, TX0: 1, RX0: 3, EN: 0 };
        if (pin.id in espAliases || /^D\d+$/.test(pin.id)) {
          addRow('GPIO', pinNum);
        }
      } else if ((inst.type === 'arduino_uno' || inst.type === 'arduino_nano') && /^[AD]\d+$/.test(pin.id)) {
        addRow('Arduino Pin', pinNum);
      }
      if (running) {
        const val = sim.pinStates ? (sim.pinStates[`pin_${pinNum}`] || 0) : 0;
        if (pin.type === 'gnd') addRow('State', '0V', 'pin-tip-low');
        else if (pin.type === 'power') addRow('State', pin.label, 'pin-tip-high');
        else if (pin.type === 'pwm' && val > 0) addRow('State', `PWM ${val}`, 'pin-tip-high');
        else addRow('State', val > 0 ? 'HIGH' : 'LOW', val > 0 ? 'pin-tip-high' : 'pin-tip-low');
      } else {
        addRow('State', 'Idle');
      }
      el.appendChild(frag);
    }

    // Follow cursor and clamp to viewport
    const pad = 14;
    el.classList.remove('hidden');
    el.style.left = `${e.clientX + pad}px`;
    el.style.top = `${e.clientY + pad}px`;
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth - 8) el.style.left = `${Math.max(8, e.clientX - r.width - pad)}px`;
    if (r.bottom > window.innerHeight - 8) el.style.top = `${Math.max(8, e.clientY - r.height - pad)}px`;
  }

  _hidePinTooltip() {
    this._tipKey = null;
    if (this.tooltipEl) this.tooltipEl.classList.add('hidden');
  }

  _hitTestComp(wx, wy) {
    const { COMPONENT_DEFS } = window.ArduinoComponents;
    for (const inst of [...this.components].reverse()) {
      const def = COMPONENT_DEFS[inst.type];
      if (!def) continue;
      if (wx >= inst.x && wx <= inst.x + def.width &&
        wy >= inst.y && wy <= inst.y + def.height) {
        return inst;
      }
    }
    return null;
  }

  _hitTestWire(wx, wy) {
    const detail = this._hitTestWireDetails(wx, wy);
    return detail ? detail.wire : null;
  }

  _hitTestWireDetails(wx, wy) {
    const threshold = Math.max(6, 8 / this.zoom);
    let best = null;

    for (const wire of [...this.wires].reverse()) {
      const pts = this._wirePath(wire);
      if (!pts || pts.length < 2) continue;

      // Check waypoint handles if wire has waypoints
      if (wire.waypoints && Array.isArray(wire.waypoints)) {
        for (let j = 0; j < wire.waypoints.length; j++) {
          const wp = wire.waypoints[j];
          const dist = Math.hypot(wx - wp.x, wy - wp.y);
          if (dist <= threshold + 4) {
            return { wire, pts, segIdx: -1, handleIdx: j, dist };
          }
        }
      }

      // Check segments
      for (let i = 0; i < pts.length - 1; i++) {
        const d = this._distToSegment(wx, wy, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        if (d <= threshold) {
          if (!best || d < best.dist) {
            best = { wire, pts, segIdx: i, handleIdx: -1, dist: d };
          }
        }
      }
    }
    return best;
  }

  _distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
    const nx = x1 + t * dx, ny = y1 + t * dy;
    return Math.sqrt((px - nx) ** 2 + (py - ny) ** 2);
  }

  /* ══════════════ UTILITIES ══════════════ */
  _toWorld(sx, sy) {
    return {
      x: (sx - this.panX) / this.zoom,
      y: (sy - this.panY) / this.zoom,
    };
  }

  _snap(v) { return Math.round(v / this.GRID) * this.GRID; }

  _selectAll(sel) { this.components.forEach(c => c.selected = sel); }

  _getPinWorldPos(instId, pinId) {
    const inst = this.components.find(c => c.id === instId);
    if (!inst) return null;
    const def = window.ArduinoComponents.COMPONENT_DEFS[inst.type];
    if (!def) return null;
    const pin = def.pins.find(p => p.id === pinId);
    if (!pin) return null;
    return this._pinWorldPos(inst, pin);
  }

  _getPinKey(instId, pinId) {
    const inst = this.components.find(c => c.id === instId);
    if (!inst) return null;
    return `pin_${this._pinToNumber(pinId)}`;
  }

  _getPinType(instId, pinId) {
    const inst = this.components.find(c => c.id === instId);
    if (!inst) return 'digital';
    const def = window.ArduinoComponents.COMPONENT_DEFS[inst.type];
    if (!def) return 'digital';
    const pin = def.pins.find(p => p.id === pinId);
    return pin ? pin.type : 'digital';
  }

  _pinToNumber(pinId) {
    const analogMap = { A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19, A6: 20, A7: 21 };
    if (pinId in analogMap) return analogMap[pinId];
    // ESP32 DevKit V1 pin aliases
    const esp32Map = { VP: 36, VN: 39, TX0: 1, RX0: 3, EN: 0 };
    if (pinId in esp32Map) return esp32Map[pinId];
    const n = parseInt(pinId.replace(/[^0-9]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  /* Match a pin like D7/A3/VP against a group label like "D0–D13",
     "A0–A5", "VP / VN" or "D34 / D35". */
  _pinMatchesGroup(pinId, groupLabel) {
    const label = String(groupLabel || '').trim();
    // Range form: "D0–D13"
    if (label.includes('–') || label.includes('-')) {
      const parts = label.split(/[–-]/);
      if (parts.length !== 2) return false;
      const m = /^([AD])(\d+)$/.exec(pinId);
      if (!m) return false;
      const letter = m[1];
      const num = parseInt(m[2], 10);
      const start = /^([AD])(\d+)$/.exec(parts[0].trim());
      const end = /^([AD])(\d+)$/.exec(parts[1].trim());
      if (!start || !end || start[1] !== letter || end[1] !== letter) return false;
      return num >= parseInt(start[2], 10) && num <= parseInt(end[2], 10);
    }
    // List form: "VP / VN" — match if pinId appears on either side
    return label.split('/').map(s => s.trim()).includes(pinId);
  }

  _placeComponent(world) {
    if (!this.placingType) return;
    const inst = this.addComponent(this.placingType, world.x, world.y);
    // Don't cancel placing — allow multiple placement
    // Press ESC to stop
    return inst;
  }

  _updateCoords(sx, sy, world) {
    const el = document.getElementById('canvas-coords');
    if (el) el.textContent = `X: ${Math.round(world.x)}  Y: ${Math.round(world.y)}`;
  }

  _updateZoomDisplay() {
    const el = document.getElementById('zoom-display');
    if (el) el.textContent = `${Math.round(this.zoom * 100)}%`;
  }

  _onChanged() {
    const compEl = document.getElementById('canvas-comp-count');
    const wireEl = document.getElementById('canvas-wire-count');
    if (compEl) compEl.textContent = `${this.components.length} component${this.components.length !== 1 ? 's' : ''}`;
    if (wireEl) wireEl.textContent = `${this.wires.length} wire${this.wires.length !== 1 ? 's' : ''}`;
    // Detect standalone power sources so DMM/function-gen update without running Arduino sketch
    const standaloneTypes = new Set(['power_5v', 'power_gnd', 'mb102_power', 'bench_power_supply', 'func_gen']);
    this._hasStandalonePower = this.components.some(c => standaloneTypes.has(c.type));
    // Rebuild electrical graph
    this.engine.buildGraph(this.components, this.wires);
    if (this.onCompChanged) this.onCompChanged();
  }

  /* ══════════════ VIEWPORT ══════════════ */
  fitView() {
    if (this.components.length === 0) {
      this.panX = this.canvas.width / 2 - 200;
      this.panY = this.canvas.height / 2 - 100;
      this.zoom = 1;
      this._updateZoomDisplay();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const inst of this.components) {
      const def = window.ArduinoComponents.COMPONENT_DEFS[inst.type];
      if (!def) continue;
      minX = Math.min(minX, inst.x - 20);
      minY = Math.min(minY, inst.y - 20);
      maxX = Math.max(maxX, inst.x + def.width + 20);
      maxY = Math.max(maxY, inst.y + def.height + 20);
    }

    const w = this.canvas.width, h = this.canvas.height;
    const cw = maxX - minX, ch = maxY - minY;
    const safeCw = cw > 0 && Number.isFinite(cw) ? cw : 1;
    const safeCh = ch > 0 && Number.isFinite(ch) ? ch : 1;
    this.zoom = Math.min(4, Math.max(0.2, Math.min(w / safeCw, h / safeCh) * 0.9));
    this.panX = (w - safeCw * this.zoom) / 2 - minX * this.zoom;
    this.panY = (h - safeCh * this.zoom) / 2 - minY * this.zoom;
    this._updateZoomDisplay();
  }

  zoomIn() { this.zoom = Math.min(4, this.zoom * 1.2); this._updateZoomDisplay(); }
  zoomOut() { this.zoom = Math.max(0.1, this.zoom / 1.2); this._updateZoomDisplay(); }

  /* ══════════════ HISTORY ══════════════ */
  _serializeState() {
    return JSON.stringify({ components: this.components, wires: this.wires }, (key, val) => {
      if (key === '_componentInstance') return undefined;
      return val;
    });
  }

  _pushHistory() {
    const state = this._serializeState();
    this.history = this.history.slice(0, this.historyIdx + 1);
    this.history.push(state);
    if (this.history.length > 50) this.history.shift();
    this.historyIdx = this.history.length - 1;
  }

  undo() {
    if (this.historyIdx <= 0) return;
    this.historyIdx--;
    this._restoreState(this.history[this.historyIdx]);
  }

  redo() {
    if (this.historyIdx >= this.history.length - 1) return;
    this.historyIdx++;
    this._restoreState(this.history[this.historyIdx]);
  }

  _restoreState(json) {
    try {
      const { components, wires } = JSON.parse(json);
      this.components = components;
      this.wires = (Array.isArray(wires) ? wires : []).map(w => ({
        ...w,
        color: (typeof w.color === 'string' && w.color.length > 0) ? w.color : null,
        waypoints: Array.isArray(w.waypoints)
          ? w.waypoints.filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y)).map(p => ({ x: Number(p.x), y: Number(p.y) }))
          : []
      }));
      this.selected = null;
      this.selectedWire = null;
      this._onChanged();
    } catch (e) { }
  }

  /* ══════════════ SERIALIZE ══════════════ */
  serialize() {
    return {
      components: this.components.map(c => ({
        id: c.id,
        type: c.type,
        x: c.x,
        y: c.y,
        rotation: c.rotation,
        props: c.props,
      })),
      wires: this.wires,
    };
  }

  deserialize(data) {
    if (!data || typeof data !== 'object') return;
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS
      ? window.ArduinoComponents.COMPONENT_DEFS : {};

    // Sanitize components: keep only known types with valid ids/positions
    const seenIds = new Set();
    const components = (Array.isArray(data.components) ? data.components : [])
      .filter(c => c && typeof c === 'object' && c.type && defs[c.type] && c.id)
      .map(c => {
        const def = defs[c.type];
        const x = Number(c.x);
        const y = Number(c.y);
        const rot = Number(c.rotation);
        return {
          id: String(c.id),
          type: c.type,
          x: Number.isFinite(x) ? Math.round(x / this.GRID) * this.GRID : 0,
          y: Number.isFinite(y) ? Math.round(y / this.GRID) * this.GRID : 0,
          width: def.width,
          height: def.height,
          props: Object.assign({}, def.defaultProps || {},
            (c.props && typeof c.props === 'object') ? c.props : {}),
          runtimeState: {},
          selected: false,
          rotation: Number.isFinite(rot) ? ((Math.round(rot) % 4) + 4) % 4 : 0,
        };
      })
      .filter(c => {
        if (seenIds.has(c.id)) return false;
        seenIds.add(c.id);
        return true;
      });

    const idSet = new Set(components.map(c => c.id));
    const seenWires = new Set();
    const wires = (Array.isArray(data.wires) ? data.wires : [])
      .filter(w => w && w.from && w.to && idSet.has(w.from.instId) && idSet.has(w.to.instId))
      .map(w => ({
        id: String(w.id || `wire_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
        from: { instId: String(w.from.instId), pinId: String(w.from.pinId) },
        to: { instId: String(w.to.instId), pinId: String(w.to.pinId) },
        color: (typeof w.color === 'string' && w.color.length > 0) ? w.color : null,
        waypoints: Array.isArray(w.waypoints)
          ? w.waypoints.filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y)).map(p => ({ x: Number(p.x), y: Number(p.y) }))
          : []
      }))
      .filter(w => {
        if (w.from.instId === w.to.instId && w.from.pinId === w.to.pinId) return false;
        const a = `${w.from.instId}:${w.from.pinId}:${w.to.instId}:${w.to.pinId}`;
        const b = `${w.to.instId}:${w.to.pinId}:${w.from.instId}:${w.from.pinId}`;
        if (seenWires.has(a) || seenWires.has(b)) return false;
        seenWires.add(a);
        seenWires.add(b);
        return true;
      });

    this.components = components;
    this.wires = wires;
    this.selected = null;
    this.selectedWire = null;

    // Reset history so undo can't roll back into a blank/empty state
    this.history = [this._serializeState()];
    this.historyIdx = 0;

    this._onChanged();
    setTimeout(() => this.fitView(), 100);
  }

  exportPNG() {
    try {
      // Render to a temp canvas with white background
      const tmp = document.createElement('canvas');
      tmp.width = this.canvas.width;
      tmp.height = this.canvas.height;
      const tc = tmp.getContext('2d');
      tc.fillStyle = '#0d1117';
      tc.fillRect(0, 0, tmp.width, tmp.height);
      tc.drawImage(this.canvas, 0, 0);
      const a = document.createElement('a');
      a.href = tmp.toDataURL('image/png');
      a.download = 'circuit.png';
      a.click();
    } catch (e) {
      console.error('[ArduSim] Export PNG failed:', e);
      if (window.App && window.App.showToast) window.App.showToast('Could not export image', 'error');
    }
  }

  /* ══════════════ SIM HELPERS ══════════════ */
  // Get Arduino Uno instance (first one found)
  getArduinoInst() {
    return this.components.find(c => c.type === 'arduino_uno') || null;
  }

  // Get whichever microcontroller board instance is placed (first one found)
  getBoardInst() {
    return this.components.find(c => c.type === 'arduino_uno' || c.type === 'esp32_devkit_v1' || c.type === 'arduino_nano') || null;
  }

  // Update component display based on simulation state and circuit electrical paths
  updateSimState(pinStates) {
    const { getComponentClass } = window.ArduinoComponents;

    // Solve electrical graph first
    this.engine.solve(this);

    for (const inst of this.components) {
      // ── Class-based component: delegate to update() ──
      const CompClass = getComponentClass(inst.type);
      if (CompClass) {
        if (!inst._componentInstance || inst._componentInstance.type !== inst.type) {
          inst._componentInstance = new CompClass(inst);
        }
        inst._componentInstance.canvas = this;
        inst._componentInstance.update(this);
        continue; // skip legacy switch/case
      }

      // ── Legacy defComp() fallback ──
      switch (inst.type) {
        case 'led':
        case 'led_green':
        case 'led_blue':
        case 'led_yellow':
        case 'led_orange':
        case 'led_white':
          {
            // 1. Trace Anode (+) to voltage sources & series resistance
            const anodeNet = this._tracePinNet(inst.id, 'anode');
            // 2. Trace Cathode (-) to Ground paths & series resistance
            const cathodeNet = this._tracePinNet(inst.id, 'cathode');

            const hasGround = cathodeNet.grounds.length > 0;
            const bestSource = anodeNet.sources.sort((a, b) => b.voltage - a.voltage)[0] || null;

            if (!hasGround || !bestSource || bestSource.voltage <= 0) {
              // No complete circuit: missing ground or missing voltage source -> OFF
              inst.runtimeState.val = 0;
              inst.runtimeState.lit = false;
              inst.runtimeState.brightness = 0;
              inst.runtimeState.current_mA = 0;
              inst.runtimeState.overload = false;
              inst.runtimeState.blown = false;
              inst.runtimeState._warnedBlown = false;
            } else {
              // Complete circuit! Calculate total resistance (anode path + cathode path + Arduino pin resistance)
              const bestGround = cathodeNet.grounds.sort((a, b) => a.resistance - b.resistance)[0];
              const rTotal = Math.max(10, (bestSource.resistance || 0) + (bestGround.resistance || 0) + 25);
              const vSource = bestSource.voltage; // e.g. 5.0V or PWM duty cycle
              const vf = 2.0; // typical LED forward voltage drop (V)
              const rawVal = bestSource.rawVal;

              // PWM (analogWrite, value 2–254 on a digital pin): brightness follows the
              // duty cycle directly so fades are clearly visible, even below Vf.
              const isPWM = bestSource.type === 'digital' && rawVal > 1 && rawVal < 255;

              if (isPWM) {
                const frac = rawVal / 255;
                // Slight perceptual ease so the eye sees a smooth ramp
                const normBrightness = Math.max(0, Math.min(1.0, Math.pow(frac, 0.8)));
                inst.runtimeState.val = rawVal;
                inst.runtimeState.lit = normBrightness > 0.02;
                inst.runtimeState.brightness = normBrightness;
                inst.runtimeState.current_mA = vSource >= vf ? ((vSource - vf) / rTotal) * 1000 : 0;
              } else if (vSource < vf) {
                inst.runtimeState.val = 0;
                inst.runtimeState.lit = false;
                inst.runtimeState.brightness = 0;
                inst.runtimeState.current_mA = 0;
              } else {
                // Current in mA: I = (V_source - Vf) / R_total * 1000
                const i_mA = ((vSource - vf) / rTotal) * 1000;
                inst.runtimeState.current_mA = i_mA;

                // LED nominal full brightness is ~15mA (standard 220 ohm resistor gives ~12.2mA -> ~0.93)
                // Human perceptual brightness response: (I / 14mA)^0.55
                const normBrightness = Math.max(0, Math.min(1.0, Math.pow(i_mA / 14.0, 0.55)));

                inst.runtimeState.val = rawVal;
                inst.runtimeState.lit = normBrightness > 0.02;
                inst.runtimeState.brightness = normBrightness;
              }

              // ── Overload / failure detection ──
              // A standard LED is rated for ~20 mA. Above 20 mA it's stressed (warning),
              // above 40 mA (e.g. connected straight to 5V without a resistor) it "blows".
              const iLed = inst.runtimeState.current_mA || 0;
              inst.runtimeState.overload = iLed > 20;
              inst.runtimeState.blown = iLed > 40;

              if (inst.runtimeState.blown) {
                inst.runtimeState.lit = false;
                inst.runtimeState.brightness = 0;
                inst.runtimeState.val = 0;
                if (!inst.runtimeState._warnedBlown) {
                  inst.runtimeState._warnedBlown = true;
                  if (window.OutputPanel) {
                    window.OutputPanel.log(
                      `LED (${inst.id}) is over-current (~${Math.round(iLed)} mA) without a current-limiting resistor and has blown! Add a 220Ω resistor in series.`,
                      'warn'
                    );
                  }
                }
              } else {
                inst.runtimeState._warnedBlown = false;
              }
            }
            break;
          }
        case 'bulb_12v': {
          const anodeHasWire = this.wires.some(w =>
            (w.from.instId === inst.id && w.from.pinId === 'anode') ||
            (w.to.instId === inst.id && w.to.pinId === 'anode')
          );
          const cathodeHasWire = this.wires.some(w =>
            (w.from.instId === inst.id && w.from.pinId === 'cathode') ||
            (w.to.instId === inst.id && w.to.pinId === 'cathode')
          );
          if (!anodeHasWire || !cathodeHasWire) {
            inst.runtimeState.brightness = 0;
            inst.runtimeState.blown = false;
            inst.runtimeState._warnedBlown = false;
            break;
          }

          const anodeNet = this._tracePinNet(inst.id, 'anode', ['bulb_12v']);
          const cathodeNet = this._tracePinNet(inst.id, 'cathode', ['bulb_12v']);

          const hasGround = cathodeNet.grounds.length > 0;
          const bestSource = anodeNet.sources.sort((a, b) => b.voltage - a.voltage)[0] || null;

          if (!hasGround || !bestSource || bestSource.voltage <= 0) {
            inst.runtimeState.brightness = 0;
            inst.runtimeState.blown = false;
            inst.runtimeState._warnedBlown = false;
          } else {
            const bestGround = cathodeNet.grounds.sort((a, b) => a.resistance - b.resistance)[0];
            const rTotal = Math.max(1, (bestSource.resistance || 0) + (bestGround.resistance || 0));
            const vSource = bestSource.voltage;

            // 12V incandescent: brightness scales linearly with voltage up to 12V
            const normBrightness = Math.max(0, Math.min(1.0, vSource / 12.0));
            inst.runtimeState.brightness = normBrightness;

            // Blow if voltage exceeds 16V (over-voltage)
            if (vSource > 16) {
              inst.runtimeState.blown = true;
              inst.runtimeState.brightness = 0;
              if (!inst.runtimeState._warnedBlown) {
                inst.runtimeState._warnedBlown = true;
                if (window.OutputPanel) {
                  window.OutputPanel.log(
                    `12V Bulb (${inst.id}) has blown! Applied voltage: ${vSource.toFixed(1)}V exceeds maximum rating.`,
                    'warn'
                  );
                }
              }
            } else {
              inst.runtimeState.blown = false;
              inst.runtimeState._warnedBlown = false;
            }
          }
          break;
        }
        case 'rgb_led': {
          // Cathode must be connected to GND
          const cathodeNet = this._tracePinNet(inst.id, 'gnd');
          const hasGround = cathodeNet.grounds.length > 0;

          if (!hasGround) {
            inst.runtimeState.red = 0;
            inst.runtimeState.green = 0;
            inst.runtimeState.blue = 0;
            inst.runtimeState.r = 0;
            inst.runtimeState.g = 0;
            inst.runtimeState.b = 0;
          } else {
            const bestGround = cathodeNet.grounds.sort((a, b) => a.resistance - b.resistance)[0];
            const gndR = bestGround.resistance || 0;

            const traceChannel = (pinId, vf) => {
              const net = this._tracePinNet(inst.id, pinId);
              const source = net.sources.sort((a, b) => b.voltage - a.voltage)[0] || null;
              if (!source || source.voltage < vf) return 0;
              const rTotal = Math.max(10, (source.resistance || 0) + gndR + 25);
              const i_mA = ((source.voltage - vf) / rTotal) * 1000;
              const norm = Math.max(0, Math.min(1.0, Math.pow(i_mA / 14.0, 0.55)));
              return Math.round(norm * 255);
            };

            inst.runtimeState.r = traceChannel('red', 1.8);
            inst.runtimeState.g = traceChannel('green', 2.2);
            inst.runtimeState.b = traceChannel('blue', 2.8);
            inst.runtimeState.red = inst.runtimeState.r;
            inst.runtimeState.green = inst.runtimeState.g;
            inst.runtimeState.blue = inst.runtimeState.b;
          }
          break;
        }
        case 'bench_power_supply': {
          const bsPowered = Boolean(inst.runtimeState?.powered ?? inst.props?.powered ?? 1);
          const bsOutOn = bsPowered && Boolean(inst.runtimeState?.outputEnabled ?? inst.props?.outputEnabled ?? 1);
          const vSet = Number(inst.runtimeState?.voltageSet ?? inst.props?.voltageSet ?? 12.0);
          const iLim = Number(inst.runtimeState?.currentLimit ?? inst.props?.currentLimit ?? 2.5);

          inst.runtimeState.actualCurrentPos = 0;
          inst.runtimeState.actualCurrentNeg = 0;
          inst.runtimeState.actualCurrent5V = 0;
          inst.runtimeState.mode = 'CV';

          if (bsOutOn && vSet > 0) {
            const posNet = this._tracePinNet(inst.id, 'POS');
            const posGrounds = posNet.grounds;
            const posSources = posNet.sources;

            if (posGrounds.length > 0) {
              let invRSum = 0;
              for (const g of posGrounds) {
                const r = Math.max(0.1, g.resistance || 0.1);
                invRSum += 1 / r;
              }
              const loadR = invRSum > 0 ? 1 / invRSum : 999999;
              let iAct = vSet / Math.max(0.1, loadR);
              if (iAct > iLim) { iAct = iLim; inst.runtimeState.mode = 'CC'; }
              inst.runtimeState.actualCurrentPos = Math.round(iAct * 1000) / 1000;
            } else if (posSources.length <= 1) {
              inst.runtimeState.actualCurrentPos = 0;
            }

            const negNet = this._tracePinNet(inst.id, 'NEG');
            const negGrounds = negNet.grounds;
            const negSources = negNet.sources;

            if (negGrounds.length > 0) {
              let invRSumN = 0;
              for (const g of negGrounds) {
                const r = Math.max(0.1, g.resistance || 0.1);
                invRSumN += 1 / r;
              }
              const loadRN = invRSumN > 0 ? 1 / invRSumN : 999999;
              let iActN = vSet / Math.max(0.1, loadRN);
              if (iActN > iLim) { iActN = iLim; inst.runtimeState.mode = 'CC'; }
              inst.runtimeState.actualCurrentNeg = Math.round(iActN * 1000) / 1000;
            } else if (negSources.length <= 1) {
              inst.runtimeState.actualCurrentNeg = 0;
            }
          }

          if (bsPowered) {
            const vcc5vNet = this._tracePinNet(inst.id, 'VCC_5V');
            const gnd5vNet = this._tracePinNet(inst.id, 'GND_5V');
            const gnd5vGrounds = gnd5vNet.grounds;
            const gnd5vSources = gnd5vNet.sources;

            if (gnd5vGrounds.length > 0) {
              let invRSum5V = 0;
              for (const g of gnd5vGrounds) {
                const r = Math.max(0.1, g.resistance || 0.1);
                invRSum5V += 1 / r;
              }
              const loadR5V = invRSum5V > 0 ? 1 / invRSum5V : 999999;
              let iAct5V = 5.0 / Math.max(0.1, loadR5V);
              if (iAct5V > 5.0) iAct5V = 5.0;
              inst.runtimeState.actualCurrent5V = Math.round(iAct5V * 1000) / 1000;
            } else if (gnd5vSources.length <= 1) {
              inst.runtimeState.actualCurrent5V = 0;
            }
          }
          break;
        }
        case 'mb102_power': {
          const mbPowered = Boolean(inst.runtimeState?.powered ?? inst.props?.powered ?? 1);
          if (mbPowered) {
            // MB102 is always CV mode with fixed regulators
            inst.runtimeState.mode = 'CV';
          }
          break;
        }
        case 'buzzer': {
          const vccNet = this._tracePinNet(inst.id, 'vcc');
          const gndNet = this._tracePinNet(inst.id, 'gnd');
          const hasVcc = vccNet.sources.length > 0 && vccNet.sources[0].voltage > 1.5;
          const hasGnd = gndNet.grounds.length > 0;
          inst.runtimeState.active = hasVcc && hasGnd;
          break;
        }
        case 'seg7': {
          const segPins = ['segA', 'segB', 'segC', 'segD', 'segE', 'segF', 'segG', 'dp'];
          const segKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DP'];
          const segments = {};
          segPins.forEach((pinId, i) => {
            const pinNum = this._getConnectedPinNum(inst.id, pinId);
            let on = false;
            if (pinNum !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
              on = !!window.ArduinoSim.pinStates[`pin_${pinNum}`];
            }
            segments[segKeys[i]] = on;
          });
          inst.runtimeState.segments = segments;
          break;
        }
        case 'potentiometer': {
          const wiperPin = this._getConnectedPinNum(inst.id, 'wiper');
          const vccNet = this._tracePinNet(inst.id, 'vcc');
          const gndNet = this._tracePinNet(inst.id, 'gnd');
          const hasGnd = gndNet.grounds.length > 0;
          if (vccNet.sources.length > 0 && hasGnd) {
            const src = vccNet.sources[0];
            const val = inst.runtimeState.value !== undefined ? inst.runtimeState.value : (inst.props.value || 512);
            const maxVal = inst.props.maxValue || 1023;
            const ratio = Math.max(0, Math.min(1, val / maxVal));
            const outVoltage = src.voltage * ratio;
            const adcVal = Math.round((outVoltage / 5.0) * 1023);
            inst.runtimeState.wiper = adcVal;
            if (wiperPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
              window.ArduinoSim.pinStates[`pin_${wiperPin}`] = adcVal;
            }
          }
          break;
        }
        case 'push_button': {
          const pressed = inst.runtimeState.pressed;
          const p1 = this._getConnectedPinNum(inst.id, 'p1');
          const p3 = this._getConnectedPinNum(inst.id, 'p3');
          if (p1 !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
            if (pressed) {
              window.ArduinoSim.pinStates[`pin_${p1}`] = 0; // pressed → connects to GND → LOW
            } else {
              window.ArduinoSim.pinStates[`pin_${p1}`] = 1; // not pressed → INPUT_PULLUP → HIGH
            }
          }
          break;
        }
        case 'servo': {
          if (inst.runtimeState._servoDriven) break;
          const sigPin = this._getConnectedPinNum(inst.id, 'signal');
          let pwm = 0;
          if (sigPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
            pwm = window.ArduinoSim.pinStates[`pin_${sigPin}`] || 0;
          }
          inst.runtimeState.angle = Math.round((pwm / 255) * 180);
          break;
        }
        case 'servo_continuous': {
          const sigPin = this._getConnectedPinNum(inst.id, 'signal');
          let pwm = 0;
          if (sigPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
            pwm = window.ArduinoSim.pinStates[`pin_${sigPin}`] || 0;
          }
          const center = 127;
          const speed = Math.max(-100, Math.min(100, Math.round(((pwm - center) / center) * 100)));
          inst.runtimeState.speed = speed;
          break;
        }
        case 'dip_switch': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const switches = inst.runtimeState?.switches ?? inst.props.switches ?? 0;
          for (let i = 0; i < 8; i++) {
            const pinNum = this._getConnectedPinNum(inst.id, String(i + 1));
            if (pinNum !== null) {
              sim.pinStates[`pin_${pinNum}`] = (switches >> i) & 1 ? 1 : 0;
            }
          }
          break;
        }
        case 'rotary_encoder': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const position = inst.runtimeState?.position ?? inst.props.position ?? 0;
          const pressed = inst.runtimeState?.pressed ?? inst.props.pressed ?? false;
          const aPin = this._getConnectedPinNum(inst.id, 'A');
          const bPin = this._getConnectedPinNum(inst.id, 'B');
          const swPin = this._getConnectedPinNum(inst.id, 'SW');
          if (aPin !== null) sim.pinStates[`pin_${aPin}`] = Math.abs(position) % 2;
          if (bPin !== null) sim.pinStates[`pin_${bPin}`] = Math.abs(Math.floor(position / 2)) % 2;
          if (swPin !== null) sim.pinStates[`pin_${swPin}`] = pressed ? 0 : 1;
          break;
        }
        case 'relay': {
          const sigPin = this._getConnectedPinNum(inst.id, 'sig');
          const sigOn = sigPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates
            ? !!window.ArduinoSim.pinStates[`pin_${sigPin}`] : false;
          const wasActive = inst.runtimeState.active;
          inst.runtimeState.active = sigOn;
          // Tick sound on state change
          if (wasActive !== undefined && wasActive !== sigOn) {
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'square';
              osc.frequency.value = 1200;
              gain.gain.value = 0.15;
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.05);
            } catch (e) {}
          }
          break;
        }
        case 'dc_motor': {
          let pwm = 0;

          // 1. Try Arduino PWM pin
          const inPin = this._getConnectedPinNum(inst.id, 'in');
          if (inPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
            pwm = window.ArduinoSim.pinStates[`pin_${inPin}`] || 0;
          }

          // 2. Try L298N motor driver output
          if (pwm === 0) {
            const target = this._getWireTarget(inst.id, 'in');
            if (target && target.inst.type === 'l298n') {
              const l298 = target.inst;
              const pinId = target.pinId;
              if (pinId === 'OUT1' || pinId === 'OUT2') pwm = Math.abs((l298.runtimeState?.motorA || 0)) * 255;
              else if (pinId === 'OUT3' || pinId === 'OUT4') pwm = Math.abs((l298.runtimeState?.motorB || 0)) * 255;
            }
          }

          // 3. Direct DC power (bench supply, power_5v, battery, etc.)
          let speed = Math.max(0, Math.min(1, (Number(pwm) || 0) / 255));
          if (speed === 0) {
            const inNet = this._tracePinNet(inst.id, 'in');
            const gndNet = this._tracePinNet(inst.id, 'gnd');
            const hasGnd = gndNet.grounds.length > 0;
            if (hasGnd && inNet.sources.length > 0) {
              const bestSource = inNet.sources.sort((a, b) => b.voltage - a.voltage)[0];
              if (bestSource && bestSource.voltage > 0) {
                speed = Math.min(1, bestSource.voltage / 12);
              }
            }
          }

          inst.runtimeState.speed = speed;
          inst.runtimeState.rpm = Math.round(speed * 120);
          break;
        }
        case 'l298n': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const readPin = (pid) => {
            const pn = this._getConnectedPinNum(inst.id, pid);
            return pn !== null ? (sim.pinStates[`pin_${pn}`] || 0) : 0;
          };
          const in1 = readPin('IN1'), in2 = readPin('IN2');
          const in3 = readPin('IN3'), in4 = readPin('IN4');
          const ena = readPin('ENA'), enb = readPin('ENB');
          let motorA = 0;
          if (in1 && !in2) motorA = ena / 255;
          else if (!in1 && in2) motorA = -(ena / 255);
          let motorB = 0;
          if (in3 && !in4) motorB = enb / 255;
          else if (!in3 && in4) motorB = -(enb / 255);
          inst.runtimeState.motorA = motorA;
          inst.runtimeState.motorB = motorB;
          break;
        }
        case 'ldr': {
          const aPin = this._getConnectedPinNum(inst.id, 'a');
          if (aPin !== null) {
            const val = inst.runtimeState.light !== undefined ? inst.runtimeState.light : (inst.props.light || 512);
            if (window.ArduinoSim && window.ArduinoSim.pinStates) {
              window.ArduinoSim.pinStates[`pin_${aPin}`] = val;
            }
          }
          break;
        }
        case 'pir': {
          const outPin = this._getConnectedPinNum(inst.id, 'out');
          if (outPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
            const motion = inst.runtimeState.motion !== undefined ? !!inst.runtimeState.motion : !!(inst.props.motion || 0);
            window.ArduinoSim.pinStates[`pin_${outPin}`] = motion ? 1 : 0;
          }
          break;
        }
        case 'joystick': {
          if (window.ArduinoSim && window.ArduinoSim.pinStates) {
            const xPin = this._getConnectedPinNum(inst.id, 'x');
            const yPin = this._getConnectedPinNum(inst.id, 'y');
            const swPin = this._getConnectedPinNum(inst.id, 'sw');
            const xv = inst.runtimeState.x !== undefined ? inst.runtimeState.x : (inst.props.x || 512);
            const yv = inst.runtimeState.y !== undefined ? inst.runtimeState.y : (inst.props.y || 512);
            const swPressed = inst.runtimeState.sw !== undefined ? !!inst.runtimeState.sw : !!(inst.props.sw || 0);
            if (xPin !== null) window.ArduinoSim.pinStates[`pin_${xPin}`] = xv;
            if (yPin !== null) window.ArduinoSim.pinStates[`pin_${yPin}`] = yv;
            if (swPin !== null) window.ArduinoSim.pinStates[`pin_${swPin}`] = swPressed ? 0 : 1; // INPUT_PULLUP
          }
          break;
        }

        case 'ic_555': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;

          const vccNet = this._tracePinNet(inst.id, 'VCC');
          const gndNet = this._tracePinNet(inst.id, 'GND');
          const hasVcc = vccNet.sources.some(s => s.voltage >= 4.5);
          const hasGnd = gndNet.grounds.length > 0;

          if (!hasVcc || !hasGnd) {
            inst.runtimeState.outHigh = false;
            break;
          }

          const trigPin = this._getConnectedPinNum(inst.id, 'TRIG');
          const thrPin = this._getConnectedPinNum(inst.id, 'THR');
          const rstPin = this._getConnectedPinNum(inst.id, 'RST');
          const outPin = this._getConnectedPinNum(inst.id, 'OUT');
          const disPin = this._getConnectedPinNum(inst.id, 'DIS');

          let resetActive = true;
          if (rstPin !== null) {
            resetActive = (sim.pinStates[`pin_${rstPin}`] || 0) > 0;
          }

          if (!resetActive) {
            inst.runtimeState.outHigh = false;
            if (outPin !== null) sim.pinStates[`pin_${outPin}`] = 0;
            if (disPin !== null) sim.pinStates[`pin_${disPin}`] = 0;
            break;
          }

          if (!inst.runtimeState._lastTime) inst.runtimeState._lastTime = Date.now();
          if (inst.runtimeState._capVoltage === undefined) inst.runtimeState._capVoltage = 0;

          const now = Date.now();
          const dt = (now - inst.runtimeState._lastTime) / 1000;
          inst.runtimeState._lastTime = now;

          // ── Resolve actual R1, R2, C from connected components ──
          let r1 = null, r2 = null, capC = null;
          const self = this;

          const _getOhms = (c) => {
            let v = c.runtimeState?.value ?? c.props?.value ?? 0;
            const u = c.runtimeState?.unit || c.props?.unit || 'Ω';
            if (u === 'kΩ') v *= 1e3;
            if (u === 'MΩ') v *= 1e6;
            return v;
          };
          const _getFarads = (c) => {
            let v = c.runtimeState?.value ?? c.props?.value ?? 0;
            const u = c.runtimeState?.unit || c.props?.unit || 'F';
            if (u === 'µF') v *= 1e-6;
            if (u === 'nF') v *= 1e-9;
            if (u === 'pF') v *= 1e-12;
            if (u === 'mF') v *= 1e-3;
            return v;
          };
          const _findConnectedComps = (pinId, type) => {
            const results = [];
            for (const w of self.wires) {
              let tid;
              if (w.from.instId === inst.id && w.from.pinId === pinId) tid = w.to.instId;
              else if (w.to.instId === inst.id && w.to.pinId === pinId) tid = w.from.instId;
              else continue;
              const c = self.components.find(x => x.id === tid);
              if (c && c.type === type) results.push(c);
            }
            return results;
          };

          // Find all resistors connected to any 555 pin and identify R1, R2
          const _allResistors = new Map();
          for (const pid of ['DIS', 'VCC', 'THR', 'TRIG']) {
            for (const comp of _findConnectedComps(pid, 'resistor')) {
              _allResistors.set(comp.id, comp);
            }
          }
          for (const [, r] of _allResistors) {
            const rPins = [];
            for (const w of self.wires) {
              if (w.from.instId === r.id || w.to.instId === r.id) {
                const otherInstId = w.from.instId === r.id ? w.to.instId : w.from.instId;
                if (otherInstId === inst.id) {
                  rPins.push(w.from.instId === r.id ? w.from.pinId : w.to.pinId);
                }
              }
            }
            if (rPins.includes('VCC') && rPins.includes('DIS')) r1 = _getOhms(r);
            else if (rPins.includes('DIS') && rPins.includes('THR')) r2 = _getOhms(r);
            else if (r1 == null && rPins.includes('VCC')) r1 = _getOhms(r);
            else if (r2 == null && rPins.includes('THR')) r2 = _getOhms(r);
            else if (r1 == null) r1 = _getOhms(r);
            else if (r2 == null) r2 = _getOhms(r);
          }

          // Find C from THR or TRIG pin
          const capComps = _findConnectedComps('THR', 'capacitor');
          const trigCapComps = _findConnectedComps('TRIG', 'capacitor');
          const allCaps = [...new Set([...capComps, ...trigCapComps])];
          if (allCaps.length > 0) capC = _getFarads(allCaps[0]);

          // ── Calculate timing from component values ──
          let tHigh, tLow;
          if (r1 != null && r2 != null && capC != null && capC > 0 && r1 > 0 && r2 > 0) {
            // Real 555 astable formulas
            tHigh = 0.693 * (r1 + r2) * capC;
            tLow = 0.693 * r2 * capC;
          } else {
            // Fallback to props when components not resolved
            const freq = inst.props.frequency || 1000;
            const duty = (inst.props.dutyCycle || 50) / 100;
            const period = 1 / freq;
            tHigh = period * duty;
            tLow = period * (1 - duty);
          }
          const vThresh = 2 / 3;
          const vTrig = 1 / 3;

          let cv = inst.runtimeState._capVoltage;

          if (inst.runtimeState.outHigh) {
            cv = Math.min(1.0, cv + dt / tHigh * 0.8);
            if (cv >= vThresh) {
              inst.runtimeState.outHigh = false;
              cv = vThresh;
            }
          } else {
            cv = Math.max(0, cv - dt / tLow * 0.8);
            if (cv <= vTrig) {
              inst.runtimeState.outHigh = true;
              cv = vTrig;
            }
          }

          inst.runtimeState._capVoltage = cv;

          const outVal = inst.runtimeState.outHigh ? 255 : 0;
          const disVal = inst.runtimeState.outHigh ? 0 : 255;
          inst.runtimeState.OUT = outVal;
          inst.runtimeState.DIS = disVal;
          if (outPin !== null) sim.pinStates[`pin_${outPin}`] = outVal;
          if (disPin !== null) sim.pinStates[`pin_${disPin}`] = disVal;

          const capScaled = Math.round(cv * 255);
          if (thrPin !== null) sim.pinStates[`pin_${thrPin}`] = capScaled;
          if (trigPin !== null) sim.pinStates[`pin_${trigPin}`] = capScaled;
          break;
        }

        case 'ic_74hc00': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const ps = sim.pinStates;
          const read = (id) => this._readDigitalInput(inst.id, id);
          const gates = [['A1', 'B1', 'Y1'], ['A2', 'B2', 'Y2'], ['A3', 'B3', 'Y3'], ['A4', 'B4', 'Y4']];
          for (const [a, b, y] of gates) {
            const outVal = (read(a) & read(b)) ? 0 : 1;
            inst.runtimeState[y] = outVal ? 255 : 0;
            const pn = this._getConnectedPinNum(inst.id, y);
            if (pn !== null) ps[`pin_${pn}`] = outVal ? 255 : 0;
          }
          break;
        }

        case 'ic_74hc04': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const ps = sim.pinStates;
          const read = (id) => this._readDigitalInput(inst.id, id);
          const gates = [
            ['A1', 'Y1'], ['A2', 'Y2'], ['A3', 'Y3'], ['A4', 'Y4'], ['A5', 'Y5'], ['A6', 'Y6']
          ];
          for (const [a, y] of gates) {
            const outVal = read(a) ? 0 : 1;
            inst.runtimeState[y] = outVal ? 255 : 0;
            const pn = this._getConnectedPinNum(inst.id, y);
            if (pn !== null) ps[`pin_${pn}`] = outVal ? 255 : 0;
          }
          break;
        }

        case 'ic_74hc08': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const ps = sim.pinStates;
          const read = (id) => this._readDigitalInput(inst.id, id);
          const gates = [['A1', 'B1', 'Y1'], ['A2', 'B2', 'Y2'], ['A3', 'B3', 'Y3'], ['A4', 'B4', 'Y4']];
          for (const [a, b, y] of gates) {
            const outVal = read(a) & read(b);
            inst.runtimeState[y] = outVal ? 255 : 0;
            const pn = this._getConnectedPinNum(inst.id, y);
            if (pn !== null) ps[`pin_${pn}`] = outVal ? 255 : 0;
          }
          break;
        }

        case 'ic_74hc32': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const ps = sim.pinStates;
          const read = (id) => this._readDigitalInput(inst.id, id);
          const gates = [['A1', 'B1', 'Y1'], ['A2', 'B2', 'Y2'], ['A3', 'B3', 'Y3'], ['A4', 'B4', 'Y4']];
          for (const [a, b, y] of gates) {
            const outVal = read(a) | read(b);
            inst.runtimeState[y] = outVal ? 255 : 0;
            const pn = this._getConnectedPinNum(inst.id, y);
            if (pn !== null) ps[`pin_${pn}`] = outVal ? 255 : 0;
          }
          break;
        }

        case 'ic_74hc595': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const ps = sim.pinStates;
          const read = (id) => this._readDigitalInput(inst.id, id);
          const write = (id, val) => {
            const pn = this._getConnectedPinNum(inst.id, id);
            if (pn !== null) ps[`pin_${pn}`] = val ? 255 : 0;
          };

          if (inst.runtimeState._shiftReg === undefined) inst.runtimeState._shiftReg = 0;
          if (inst.runtimeState._latchReg === undefined) inst.runtimeState._latchReg = 0;
          if (inst.runtimeState._lastSRCLK === undefined) inst.runtimeState._lastSRCLK = 0;
          if (inst.runtimeState._lastRCLK === undefined) inst.runtimeState._lastRCLK = 0;

          const srclk = read('SRCLK');
          const rclk = read('RCLK');
          const oe = read('OE');
          const srclr = read('SRCLR');

          if (srclr === 0) {
            inst.runtimeState._shiftReg = 0;
            inst.runtimeState._lastSRCLK = srclk;
            inst.runtimeState._lastRCLK = rclk;
            break;
          }

          if (srclk === 1 && inst.runtimeState._lastSRCLK === 0) {
            const ser = read('SER');
            inst.runtimeState._shiftReg = ((inst.runtimeState._shiftReg << 1) | ser) & 0xFF;
          }
          inst.runtimeState._lastSRCLK = srclk;

          if (rclk === 1 && inst.runtimeState._lastRCLK === 0) {
            inst.runtimeState._latchReg = inst.runtimeState._shiftReg;
          }
          inst.runtimeState._lastRCLK = rclk;

          const outputActive = oe === 0;
          const output = outputActive ? inst.runtimeState._latchReg : 0;
          inst.runtimeState.bits = output;

          ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH'].forEach((pinId, i) => {
            const bitVal = (output >> i) & 1;
            inst.runtimeState[pinId] = bitVal ? 255 : 0;
            write(pinId, bitVal);
          });
          const q7nVal = (inst.runtimeState._shiftReg >> 7) & 1;
          inst.runtimeState.QHn = q7nVal ? 255 : 0;
          write('QHn', q7nVal);
          break;
        }

        case 'ic_74hc138': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const ps = sim.pinStates;
          const read = (id) => this._readDigitalInput(inst.id, id);
          const write = (id, val) => {
            const pn = this._getConnectedPinNum(inst.id, id);
            if (pn !== null) ps[`pin_${pn}`] = val ? 255 : 0;
          };

          const a0 = read('A0');
          const a1 = read('A1');
          const a2 = read('A2');
          const g1 = read('G1');
          const g2a = read('G2A');
          const g2b = read('G2B');

          const enabled = g1 === 1 && g2a === 0 && g2b === 0;
          const addr = (a2 << 2) | (a1 << 1) | a0;

          for (let i = 0; i < 8; i++) {
            const outVal = (enabled && i === addr) ? 0 : 1;
            inst.runtimeState[`Y${i}`] = outVal ? 255 : 0;
            write(`Y${i}`, outVal);
          }
          inst.runtimeState.activeOutput = enabled ? addr : -1;
          break;
        }

        case 'ic_74hc245': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const ps = sim.pinStates;
          const read = (id) => this._readDigitalInput(inst.id, id);
          const readVal = (id) => {
            const pn = this._getConnectedPinNum(inst.id, id);
            return pn !== null ? (ps[`pin_${pn}`] || 0) : 0;
          };
          const writeVal = (id, val) => {
            const pn = this._getConnectedPinNum(inst.id, id);
            if (pn !== null) ps[`pin_${pn}`] = val;
          };

          const dir = read('DIR');
          const oe = read('OE');

          inst.runtimeState.direction = dir;

          if (oe === 1) {
            for (let i = 1; i <= 8; i++) {
              inst.runtimeState[`A${i}`] = 0;
              inst.runtimeState[`B${i}`] = 0;
              writeVal(`A${i}`, 0);
              writeVal(`B${i}`, 0);
            }
          } else if (dir === 1) {
            for (let i = 1; i <= 8; i++) {
              const val = readVal(`A${i}`);
              inst.runtimeState[`B${i}`] = val;
              writeVal(`B${i}`, val);
            }
          } else {
            for (let i = 1; i <= 8; i++) {
              const val = readVal(`B${i}`);
              inst.runtimeState[`A${i}`] = val;
              writeVal(`A${i}`, val);
            }
          }
          break;
        }

        case 'ic_74hc74': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const ps = sim.pinStates;
          const read = (id) => this._readDigitalInput(inst.id, id);
          const write = (id, val) => {
            const pn = this._getConnectedPinNum(inst.id, id);
            if (pn !== null) ps[`pin_${pn}`] = val ? 255 : 0;
          };
          // Initialize edge detectors
          if (inst.runtimeState._lastCLK1 === undefined) inst.runtimeState._lastCLK1 = 0;
          if (inst.runtimeState._lastCLK2 === undefined) inst.runtimeState._lastCLK2 = 0;
          if (inst.runtimeState.Q1 === undefined) inst.runtimeState.Q1 = 0;
          if (inst.runtimeState.Q2 === undefined) inst.runtimeState.Q2 = 0;
          // Flip-flop 1: CLR1, PRE1 are active-LOW
          const clr1 = read('CLR1');
          const pre1 = read('PRE1');
          const clk1 = read('CLK1');
          const d1 = read('D1');
          if (clr1 === 0) {
            inst.runtimeState.Q1 = 0;
          } else if (pre1 === 0) {
            inst.runtimeState.Q1 = 1;
          } else if (clk1 === 1 && inst.runtimeState._lastCLK1 === 0) {
            inst.runtimeState.Q1 = d1;
          }
          inst.runtimeState._lastCLK1 = clk1;
          write('Q1', inst.runtimeState.Q1);
          write('Q1n', inst.runtimeState.Q1 ? 0 : 1);
          // Flip-flop 2
          const clr2 = read('CLR2');
          const pre2 = read('PRE2');
          const clk2 = read('CLK2');
          const d2 = read('D2');
          if (clr2 === 0) {
            inst.runtimeState.Q2 = 0;
          } else if (pre2 === 0) {
            inst.runtimeState.Q2 = 1;
          } else if (clk2 === 1 && inst.runtimeState._lastCLK2 === 0) {
            inst.runtimeState.Q2 = d2;
          }
          inst.runtimeState._lastCLK2 = clk2;
          write('Q2', inst.runtimeState.Q2);
          write('Q2n', inst.runtimeState.Q2 ? 0 : 1);
          break;
        }

        case 'ic_74hc165': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const ps = sim.pinStates;
          const read = (id) => this._readDigitalInput(inst.id, id);
          const write = (id, val) => {
            const pn = this._getConnectedPinNum(inst.id, id);
            if (pn !== null) ps[`pin_${pn}`] = val ? 255 : 0;
          };
          if (inst.runtimeState._lastCLK165 === undefined) inst.runtimeState._lastCLK165 = 0;
          if (inst.runtimeState.bits === undefined) inst.runtimeState.bits = 0;
          const shld = read('SHLD'); // active LOW = parallel load
          const clk = read('CLK');
          const clkInh = read('CLKINH');
          if (shld === 0) {
            // Parallel load A-H
            let val = 0;
            for (let i = 0; i < 8; i++) {
              const pinId = ['A','E','F','G','H','Fn','Gn','Hn'][i];
              if (read(pinId)) val |= (1 << i);
            }
            inst.runtimeState.bits = val;
          } else if (clk === 1 && inst.runtimeState._lastCLK165 === 0 && clkInh === 0) {
            // Shift left, insert SER at LSB
            const ser = read('SER');
            inst.runtimeState.bits = ((inst.runtimeState.bits << 1) | ser) & 0xFF;
          }
          inst.runtimeState._lastCLK165 = clk;
          // Q7 = MSB, Q7n = !MSB
          write('Q7', (inst.runtimeState.bits >> 7) & 1);
          write('Q7n', (inst.runtimeState.bits >> 7) & 1 ? 0 : 1);
          break;
        }

        case 'ic_74hc193': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const ps = sim.pinStates;
          const read = (id) => this._readDigitalInput(inst.id, id);
          const write = (id, val) => {
            const pn = this._getConnectedPinNum(inst.id, id);
            if (pn !== null) ps[`pin_${pn}`] = val ? 255 : 0;
          };
          if (inst.runtimeState.count === undefined) inst.runtimeState.count = 0;
          if (inst.runtimeState._lastCPU === undefined) inst.runtimeState._lastCPU = 0;
          if (inst.runtimeState._lastCPD === undefined) inst.runtimeState._lastCPD = 0;
          const mr = read('MR'); // Master Reset (active HIGH)
          const pl = read('PL'); // Parallel Load (active LOW)
          const cpu = read('CPU');
          const cpd = read('CPD');
          if (mr) {
            inst.runtimeState.count = 0;
          } else if (pl === 0) {
            // Parallel load from A,B,C,D,DD inputs
            let val = 0;
            if (read('A'))  val |= 1;
            if (read('B'))  val |= 2;
            if (read('C'))  val |= 4;
            if (read('DD')) val |= 8;
            inst.runtimeState.count = val & 0xF;
          } else {
            if (cpu === 1 && inst.runtimeState._lastCPU === 0) {
              inst.runtimeState.count = (inst.runtimeState.count + 1) & 0xF;
            }
            if (cpd === 1 && inst.runtimeState._lastCPD === 0) {
              inst.runtimeState.count = (inst.runtimeState.count - 1) & 0xF;
            }
          }
          inst.runtimeState._lastCPU = cpu;
          inst.runtimeState._lastCPD = cpd;
          const c = inst.runtimeState.count;
          write('QA', c & 1); write('QB', (c >> 1) & 1);
          write('CO', (c === 0xF) ? 0 : 1);  // Carry: low when count=15
          write('BO', (c === 0x0) ? 0 : 1);  // Borrow: low when count=0
          write('TC_U', c === 0xF ? 1 : 0);
          write('TC_D', c === 0x0 ? 1 : 0);
          break;
        }

        case 'ic_74hc47': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const ps = sim.pinStates;
          const read = (id) => this._readDigitalInput(inst.id, id);
          const write = (id, val) => {
            const pn = this._getConnectedPinNum(inst.id, id);
            if (pn !== null) ps[`pin_${pn}`] = val ? 255 : 0;
          };
          // BCD input
          let bcd = 0;
          if (read('A')) bcd |= 1;
          if (read('B')) bcd |= 2;
          if (read('C')) bcd |= 4;
          if (read('D')) bcd |= 8;
          // 7-segment decode table (active LOW: 0=on, 1=off) — segments a-g
          const segTable = [0x3F,0x06,0x5B,0x4F,0x66,0x6D,0x7D,0x07,0x7F,0x6F,0x77,0x7C,0x39,0x5E,0x79,0x71];
          const lt = read('LT');
          const bi = read('BI');
          let segments;
          if (bi === 0) {
            segments = 0x00; // blanking
          } else if (lt === 0) {
            segments = 0x7F; // lamp test: all on
          } else {
            segments = segTable[bcd] || 0x7F;
          }
          inst.runtimeState.segments = segments;
          // Active LOW outputs: write inverted segments
          write('a', (segments & 0x01) ? 0 : 1);
          write('b', (segments & 0x02) ? 0 : 1);
          write('c', (segments & 0x04) ? 0 : 1);
          write('d', (segments & 0x08) ? 0 : 1);
          write('e', (segments & 0x10) ? 0 : 1);
          write('f', (segments & 0x20) ? 0 : 1);
          write('g', (segments & 0x40) ? 0 : 1);
          break;
        }

        case 'ic_74hc148': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const ps = sim.pinStates;
          const read = (id) => this._readDigitalInput(inst.id, id);
          const write = (id, val) => {
            const pn = this._getConnectedPinNum(inst.id, id);
            if (pn !== null) ps[`pin_${pn}`] = val ? 255 : 0;
          };
          const ei = read('EI'); // active LOW enable
          // Read inputs I0-I7 (active LOW: 0 = active)
          const inputs = [0,1,2,3,4,5,6,7].map(i => !read(`I${i}`));
          let activeIdx = -1;
          for (let i = 7; i >= 0; i--) {
            if (inputs[i]) { activeIdx = i; break; }
          }
          const anyActive = activeIdx >= 0;
          if (ei === 1) {
            // Disabled: all outputs HIGH
            write('A0', 0); write('A1', 0); write('A2', 0);
            write('GS', 0); write('EO', 0);
            inst.runtimeState.code = null;
          } else {
            if (anyActive) {
              write('A0', activeIdx & 1);
              write('A1', (activeIdx >> 1) & 1);
              write('A2', (activeIdx >> 2) & 1);
              write('GS', 1); // group select active
              write('EO', 0);
            } else {
              write('A0', 1); write('A1', 1); write('A2', 1);
              write('GS', 0);
              write('EO', 1); // no input active
            }
            inst.runtimeState.code = anyActive ? activeIdx : null;
          }
          break;
        }

        case 'lm741': {
          const sim = window.ArduinoSim;
          const ps = (sim && sim.pinStates) || {};
          // Read analog voltages at IN+ and IN-
          const readAnalog = (id) => {
            const pn = this._getConnectedPinNum(inst.id, id);
            if (pn !== null) return (ps[`pin_${pn}`] || 0) * 5.0 / 1023.0;
            // Check for IC output sources
            const wireTarget = this._getWireTarget(inst.id, id);
            if (wireTarget) {
              const other = wireTarget.inst;
              if (other.type === 'potentiometer' && wireTarget.pinId === 'wiper') {
                return (other.runtimeState?.wiper || 0) * 5.0 / 1023.0;
              }
              if (other.type === 'lm741' && wireTarget.pinId === 'OUT') {
                return other.runtimeState?.vOut || 0;
              }
            }
            return 0;
          };
          const vInp = readAnalog('INP');
          const vInn = readAnalog('INN');
          const vccp = 5.0;  // Assume 5V rail
          const vccn = 0;
          const diff = vInp - vInn;
          let vOut = diff * 100000; // High open-loop gain
          vOut = Math.max(vccn, Math.min(vccp, vOut)); // Clamp to supply rails
          inst.runtimeState.vOut = vOut;
          // Write output voltage scaled to pin state (0-1023 for 0-5V)
          const pn = this._getConnectedPinNum(inst.id, 'OUT');
          if (pn !== null) ps[`pin_${pn}`] = Math.round((vOut / 5.0) * 1023);
          break;
        }

        /* ── MPU6050 IMU (I2C sensor — writes accel values to pin states) ── */
        case 'mpu6050': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          // User-adjustable values are exposed via interactive props
          inst.runtimeState.accelX = inst.props.accelX ?? 0;
          inst.runtimeState.accelY = inst.props.accelY ?? 0;
          inst.runtimeState.accelZ = inst.props.accelZ ?? 1024;
          inst.runtimeState.gyroX = inst.props.gyroX ?? 0;
          inst.runtimeState.gyroY = inst.props.gyroY ?? 0;
          inst.runtimeState.gyroZ = inst.props.gyroZ ?? 0;
          break;
        }

        /* ── 28BYJ-48 Stepper Motor (reads 4 digital pins, computes angle) ── */
        case 'stepper_28byj': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const ps = sim.pinStates;
          const readBit = (id) => {
            const pn = this._getConnectedPinNum(inst.id, id);
            return pn !== null ? ((ps[`pin_${pn}`] || 0) > 0 ? 1 : 0) : 0;
          };
          const in1 = readBit('IN1'), in2 = readBit('IN2');
          const in3 = readBit('IN3'), in4 = readBit('IN4');
          // Half-step sequence lookup: pattern → step delta
          const pattern = (in1) | (in2 << 1) | (in3 << 2) | (in4 << 3);
          const prev = inst.runtimeState._lastPattern ?? 0;
          const stepAngle = 5.625 / 64;

          // Preferred: track the Stepper library object's position so CW/CCW
          // and multi-step frames are rendered exactly (delta carries sign).
          let matched = null;
          const pinNums = ['IN1', 'IN2', 'IN3', 'IN4']
            .map(id => this._getConnectedPinNum(inst.id, id));
          if (sim._steppers && pinNums.every(p => p !== null)) {
            const want = [...new Set(pinNums)].sort((a, b) => a - b).join(',');
            for (const k in sim._steppers) {
              const s = sim._steppers[k];
              const have = [...new Set([s.pin1, s.pin2, s.pin3, s.pin4].filter(p => p != null))]
                .sort((a, b) => a - b).join(',');
              if (have === want) { matched = s; break; }
            }
          }
          if (matched) {
            if (inst.runtimeState._lastPos !== undefined) {
              const delta = matched.pos - inst.runtimeState._lastPos;
              if (delta) inst.runtimeState.angle = (inst.runtimeState.angle ?? 0) + delta * stepAngle;
            }
            inst.runtimeState._lastPos = matched.pos;
          } else if (pattern !== 0 && pattern !== prev) {
            // Fallback: no Stepper object — any coil change = one step forward
            inst.runtimeState.angle = (inst.runtimeState.angle ?? 0) + stepAngle;
          }
          inst.runtimeState._lastPattern = pattern;
          inst.runtimeState.active = pattern !== 0 || (!!matched && matched.pos !== matched.target);
          break;
        }

        /* ── WS2812B NeoPixel (single LED — reads color from props/runtimeState) ── */
        case 'neopixel': {
          if (inst.runtimeState.r === undefined) inst.runtimeState.r = inst.props.r ?? 0;
          if (inst.runtimeState.g === undefined) inst.runtimeState.g = inst.props.g ?? 0;
          if (inst.runtimeState.b === undefined) inst.runtimeState.b = inst.props.b ?? 0;
          if (inst.runtimeState.brightness === undefined) inst.runtimeState.brightness = inst.props.brightness ?? 255;
          break;
        }

        /* ── WS2812B NeoPixel Strip (8-pixel — reads pixel array from runtimeState) ── */
        case 'neopixel_strip': {
          const npStripBri = inst.props.brightness ?? 255;
          if (inst.runtimeState.brightness === undefined) inst.runtimeState.brightness = npStripBri;
          if (!Array.isArray(inst.runtimeState.pixels)) {
            const numPx = inst.props.numPixels || 8;
            inst.runtimeState.pixels = Array(numPx).fill({ r: inst.props.r ?? 0, g: inst.props.g ?? 0, b: inst.props.b ?? 0 });
          }
          break;
        }

        /* ── WS2812B NeoPixel Ring (12-pixel — reads pixel array from runtimeState) ── */
        case 'neopixel_ring': {
          const npRingBri = inst.props.brightness ?? 255;
          if (inst.runtimeState.brightness === undefined) inst.runtimeState.brightness = npRingBri;
          if (!Array.isArray(inst.runtimeState.pixels)) {
            const numPx = inst.props.numPixels || 12;
            inst.runtimeState.pixels = Array(numPx).fill({ r: inst.props.r ?? 0, g: inst.props.g ?? 0, b: inst.props.b ?? 0 });
          }
          break;
        }

        /* ── WS2812B NeoPixel 8x8 Matrix (64-pixel — reads pixel array from runtimeState) ── */
        case 'neopixel_8x8_matrix': {
          const npRingBri = inst.props.brightness ?? 255;
          if (inst.runtimeState.brightness === undefined) inst.runtimeState.brightness = npRingBri;
          if (!Array.isArray(inst.runtimeState.pixels)) {
            const numPx = inst.props.numPixels || 64;
            inst.runtimeState.pixels = Array(numPx).fill({ r: inst.props.r ?? 0, g: inst.props.g ?? 0, b: inst.props.b ?? 0 });
          }
          break;
        }

        /* ── IR Obstacle Sensor (writes digital to connected pin) ── */
        case 'ir_obstacle': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const detected = inst.runtimeState?.detected ?? inst.props.detected ?? 0;
          inst.runtimeState.detected = detected;
          inst.runtimeState.OUT = detected ? 0 : 1;
          const outPn = this._getConnectedPinNum(inst.id, 'OUT');
          if (outPn !== null) sim.pinStates[`pin_${outPn}`] = detected ? 0 : 1;
          break;
        }

        /* ── Flex Sensor (writes analog value to connected pin) ── */
        case 'flex_sensor': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const bend = inst.props.bend ?? 0;
          inst.runtimeState.bend = bend;
          const sigPn = this._getConnectedPinNum(inst.id, 'SIG');
          if (sigPn !== null) sim.pinStates[`pin_${sigPn}`] = bend;
          break;
        }

        /* ── NTC Thermistor (writes analog value to connected pin) ── */
        case 'thermistor': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;
          const temp = inst.props.temperature ?? 25;
          inst.runtimeState.temperature = temp;
          // Convert temperature to analog value (simplified: 0-1023 maps to -10-80°C)
          const analogVal = Math.round(((temp + 10) / 90) * 1023);
          const p1Pn = this._getConnectedPinNum(inst.id, 'p1');
          if (p1Pn !== null) sim.pinStates[`pin_${p1Pn}`] = Math.max(0, Math.min(1023, analogVal));
          break;
        }

        /* ── 1N4007 Diode (pass-through with forward voltage drop) ── */
        case 'diode_1n4007': {
          // Diode participates in _tracePinNet for electrical simulation
          // Here we just track its conducting state for visual feedback
          const anodeNet = this._tracePinNet(inst.id, 'anode');
          const cathodeNet = this._tracePinNet(inst.id, 'cathode');
          const hasSource = anodeNet.sources.length > 0;
          const hasGround = cathodeNet.grounds.length > 0;
          inst.runtimeState.conducting = hasSource && hasGround;
          break;
        }

        /* ── Digital Multimeter — measures voltage / resistance / continuity ── */
        case 'multimeter': {
          const mode = inst.runtimeState.mode || inst.props.mode || 'V_DC';

          // Helper: get best source voltage from a traced net
          const getNetVoltage = (net) => {
            if (!net || !net.sources || net.sources.length === 0) return 0;
            const best = net.sources.sort((a, b) => b.voltage - a.voltage)[0];
            return best ? best.voltage : 0;
          };
          // Helper: check if net has ground
          const hasGround = (net) => net && net.grounds && net.grounds.length > 0;
          // Helper: total resistance of a net path
          const getNetResistance = (net) => {
            if (!net || !net.sources || net.sources.length === 0) return Infinity;
            const best = net.sources.sort((a, b) => b.voltage - a.voltage)[0];
            return best ? (best.resistance || 0) : 0;
          };

          const redNet = this._tracePinNet(inst.id, 'probe_red');
          const comNet = this._tracePinNet(inst.id, 'probe_com');

          let displayText = '0.000';
          let displayUnit = 'V';
          let displayMode = 'DC';
          let displayBeep = false;

          switch (mode) {
            case 'V_DC': {
              const vRed = getNetVoltage(redNet);
              const vCom = getNetVoltage(comNet);
              const diff = vRed - vCom;
              const absV = Math.abs(diff);
              const sign = diff < 0 ? '-' : '';
              let disp = absV;
              let pfx = '';
              if (absV >= 1e6) { disp = absV / 1e6; pfx = 'M'; }
              else if (absV >= 1e3) { disp = absV / 1e3; pfx = 'k'; }
              else if (absV > 0 && absV < 0.001) { disp = absV * 1e6; pfx = 'µ'; }
              else if (absV > 0 && absV < 1) { disp = absV * 1e3; pfx = 'm'; }
              const decimals = disp >= 100 ? 1 : 3;
              displayText = sign + disp.toFixed(decimals);
              displayUnit = pfx + 'V';
              displayMode = 'DC';
              break;
            }
            case 'V_AC': {
              // Simplified: treat same as DC for simulation (AC RMS ≈ DC equivalent in this sim)
              const vRed = getNetVoltage(redNet);
              const vCom = getNetVoltage(comNet);
              const rms = Math.abs(vRed - vCom);
              let disp = rms;
              let pfx = '';
              if (rms >= 1e6) { disp = rms / 1e6; pfx = 'M'; }
              else if (rms >= 1e3) { disp = rms / 1e3; pfx = 'k'; }
              else if (rms > 0 && rms < 1) { disp = rms * 1e3; pfx = 'm'; }
              const decimals = disp >= 100 ? 1 : 3;
              displayText = disp.toFixed(decimals);
              displayUnit = pfx + 'V';
              displayMode = 'AC';
              break;
            }
            case 'A_DC': {
              // Current mode: DMM is in series — find V source on red side, GND on COM side
              const redHasSrc = redNet.sources.length > 0;
              const comHasGnd = comNet.grounds.length > 0;

              if (redHasSrc && comHasGnd) {
                const best = redNet.sources.sort((a, b) => b.voltage - a.voltage)[0];
                const voltage = best.voltage || 0;
                const redR = best.resistance || 0;
                const comGnd = comNet.grounds[0];
                const comR = comGnd ? (comGnd.resistance || 0) : 0;
                const totalR = redR + comR;

                if (totalR > 0 && voltage > 0) {
                  const amps = voltage / totalR;
                  let disp, pfx;
                  if (amps >= 1) { disp = amps; pfx = 'A'; }
                  else if (amps >= 0.001) { disp = amps * 1000; pfx = 'mA'; }
                  else { disp = amps * 1e6; pfx = 'µA'; }
                  const decimals = disp >= 100 ? 1 : 3;
                  displayText = disp.toFixed(decimals);
                  displayUnit = pfx;
                } else {
                  displayText = '0.000';
                  displayUnit = 'mA';
                }
              } else {
                displayText = '0.000';
                displayUnit = 'mA';
              }
              displayMode = 'DC';
              break;
            }
            case 'RES': {
              const redHasSrc = redNet.sources.length > 0;
              const comHasSrc = comNet.sources.length > 0;

              if (redHasSrc && comHasSrc) {
                displayText = 'Err';
                displayUnit = '';
                displayMode = 'Ω';
              } else {
                const totalR = this._measureResistanceBetween(inst.id, 'probe_red', inst.id, 'probe_com');
                if (totalR < Infinity && totalR > 0) {
                  let disp = totalR;
                  let pfx = '';
                  if (totalR >= 1e6) { disp = totalR / 1e6; pfx = 'M'; }
                  else if (totalR >= 1e3) { disp = totalR / 1e3; pfx = 'k'; }
                  const decimals = disp >= 100 ? 1 : 2;
                  displayText = disp.toFixed(decimals);
                  displayUnit = pfx + 'Ω';
                  displayMode = 'AUTO';
                } else {
                  displayText = 'O.L';
                  displayUnit = 'MΩ';
                  displayMode = 'AUTO';
                }
              }
              break;
            }
            case 'CONT': {
              const totalR = this._measureResistanceBetween(inst.id, 'probe_red', inst.id, 'probe_com');
              const threshold = 40;
              if (totalR <= threshold && totalR > 0) {
                displayText = totalR.toFixed(1);
                displayUnit = 'Ω';
                displayBeep = true;
              } else {
                displayText = 'O.L';
                displayUnit = 'Ω';
                displayBeep = false;
              }
              displayMode = 'CONT';
              break;
            }
            case 'MV_DC': {
              const vRed = getNetVoltage(redNet);
              const vCom = getNetVoltage(comNet);
              const diff = (vRed - vCom) * 1000;
              const sign = diff < 0 ? '-' : '';
              displayText = sign + Math.abs(diff).toFixed(1);
              displayUnit = 'mV';
              displayMode = 'DC';
              break;
            }
            case 'DIODE': {
              const vRed = getNetVoltage(redNet);
              const vCom = getNetVoltage(comNet);
              const diff = vRed - vCom;
              if (diff > 0.05 && diff < 3.0) {
                displayText = diff.toFixed(3);
              } else {
                displayText = 'O.L';
              }
              displayUnit = 'V';
              displayMode = 'DIODE';
              break;
            }
            case 'A_AC': {
              const ampNet = this._tracePinNet(inst.id, 'probe_amp');
              const vAmp = getNetVoltage(ampNet);
              const vCom = getNetVoltage(comNet);
              const amps = Math.abs(vAmp - vCom) / 0.01;
              let disp, pfx;
              if (amps >= 1) { disp = amps; pfx = 'A'; }
              else if (amps >= 0.001) { disp = amps * 1000; pfx = 'mA'; }
              else { disp = amps * 1e6; pfx = 'µA'; }
              const decimals = disp >= 100 ? 1 : 3;
              displayText = disp.toFixed(decimals);
              displayUnit = pfx;
              displayMode = 'AC';
              break;
            }
          }

          inst.runtimeState.displayText = displayText;
          inst.runtimeState.displayUnit = displayUnit;
          inst.runtimeState.displayMode = displayMode;
          inst.runtimeState.displayBeep = displayBeep;
          inst.runtimeState.mode = mode;
          break;
        }

        /* ── Dual Channel Function Generator — outputs voltage waveforms ── */
        case 'func_gen': {
          const props = inst.props || {};
          const sim = window.ArduinoSim;
          const t = sim && sim.isRunning ? (sim.simTime || 0) / 1000 : performance.now() / 1000;

          const calcWave = (wave, freq, amp, offset, phaseDeg, duty) => {
            const phaseRad = (phaseDeg || 0) * Math.PI / 180;
            const tau = ((t * freq + phaseRad / (2 * Math.PI)) % 1 + 1) % 1;
            const dutyFrac = (duty || 50) / 100;
            let v = 0;
            switch (wave) {
              case 'sine': v = Math.sin(2 * Math.PI * tau); break;
              case 'square': v = tau < dutyFrac ? 1 : -1; break;
              case 'triangle': v = tau < dutyFrac ? -1 + 2 * (tau / dutyFrac) : 1 - 2 * ((tau - dutyFrac) / (1 - dutyFrac)); break;
              case 'sawtooth': v = 2 * tau - 1; break;
              case 'noise': v = Math.sin(t * freq * 137.5) * 0.7 + Math.sin(t * freq * 239.1) * 0.3; break;
              default: v = Math.sin(2 * Math.PI * tau); break;
            }
            return offset + v * (amp / 2);
          };

          const ch1V = calcWave(props.ch1_wave || 'sine', props.ch1_freq || 440, props.ch1_amp || 5, props.ch1_offset || 0, props.ch1_phase || 0, props.ch1_duty || 50);
          const ch2V = calcWave(props.ch2_wave || 'square', props.ch2_freq || 880, props.ch2_amp || 3, props.ch2_offset || 0, props.ch2_phase || 90, props.ch2_duty || 50);

          inst.runtimeState.ch1_voltage = ch1V;
          inst.runtimeState.ch2_voltage = ch2V;
          break;
        }

        case 'lm35_sensor': {
          const outPin = this._getConnectedPinNum(inst.id, 'OUT');
          if (outPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
            // Temperature in °C (default 25°C)
            const temp = inst.runtimeState.temp !== undefined 
              ? inst.runtimeState.temp 
              : (inst.props.temp ?? 25);

            // LM35 outputs 10mV/°C (0.01V/°C). Map to 10-bit ADC (0-1023) based on a 5.0V VREF:
            const voltage = Math.max(0, temp * 0.01);
            const adcVal = Math.max(0, Math.min(1023, Math.round((voltage / 5.0) * 1023)));

            window.ArduinoSim.pinStates[`pin_${outPin}`] = adcVal;
          }
          break;
        }

        case 'keypad_4x4': {
          // Keypad column state is computed live in digitalRead() — no cached update needed.
          break;
        }

        /* ── MAX7219 — SPI bit-bang decoder ── */
        case 'max7219': {
          const sim = window.ArduinoSim;
          if (!sim || !sim.pinStates) break;

          const dinPn = this._getConnectedPinNum(inst.id, 'DIN');
          const csPn  = this._getConnectedPinNum(inst.id, 'CS');
          const clkPn = this._getConnectedPinNum(inst.id, 'CLK');

          const dinVal = dinPn !== null ? (sim.pinStates[`pin_${dinPn}`] ? 1 : 0) : this._readDigitalInput(inst.id, 'DIN');
          const csVal  = csPn !== null ? (sim.pinStates[`pin_${csPn}`]  ? 1 : 0) : this._readDigitalInput(inst.id, 'CS');
          const clkVal = clkPn !== null ? (sim.pinStates[`pin_${clkPn}`] ? 1 : 0) : this._readDigitalInput(inst.id, 'CLK');

          if (!inst.runtimeState._spi) {
            inst.runtimeState._spi = {
              shiftReg: 0,
              bitCount: 0,
              prevClk: 0,
              prevCs: 1,
              rows: new Uint8Array(8),
              regs: {},
            };
          }
          const spi = inst.runtimeState._spi;
          const prevCs  = spi.prevCs;
          const prevClk = spi.prevClk;

          if (prevCs === 1 && csVal === 0) {
            spi.shiftReg = 0;
            spi.bitCount = 0;
          }

          if (csVal === 0 && prevClk === 0 && clkVal === 1) {
            spi.shiftReg = ((spi.shiftReg << 1) | dinVal) & 0xFFFF;
            spi.bitCount++;
          }

          if (prevCs === 0 && csVal === 1 && spi.bitCount >= 16) {
            const addr = (spi.shiftReg >> 8) & 0x0F;
            const data = spi.shiftReg & 0xFF;
            spi.regs[addr] = data;

            if (addr >= 1 && addr <= 8) {
              spi.rows[addr - 1] = data;
            }
          }

          spi.prevClk = clkVal;
          spi.prevCs  = csVal;
          break;
        }
      }
    }
  }

  // Electrical graph network tracer: traverses wires and series components to discover sources & ground nodes
  _tracePinNet(startInstId, startPinId, skipInternalTypes) {
    const queue = [{ instId: startInstId, pinId: startPinId, resistance: 0 }];
    const visited = new Set();
    const sources = [];
    const grounds = [];
    skipInternalTypes = skipInternalTypes || [];

    while (queue.length > 0) {
      const current = queue.shift();
      const nodeKey = `${current.instId}:${current.pinId}`;

      const inst = this.components.find(c => c.id === current.instId);
      if (!inst) continue;

      // Allow ground pins to be re-visited (for parallel path resistance calculation)
      // but don't trace further from them
      const isGroundPin = this._isGroundPin(inst, current.pinId);
      if (isGroundPin) {
        grounds.push({ type: 'gnd', instId: inst.id, pinId: current.pinId, resistance: current.resistance });
        continue;
      }

      if (visited.has(nodeKey)) {
        // Parallel path discovery: follow wires-only from visited node to find ground/source pins
        const wq = [{ iid: current.instId, pid: current.pinId, d: 0 }];
        const wv = new Set();
        while (wq.length > 0) {
          const wn = wq.shift();
          const wk = wn.iid + ':' + wn.pid;
          if (wv.has(wk) || wn.d > 10) continue;
          wv.add(wk);
          for (const w of this.wires) {
            let ni, np;
            if (w.from.instId === wn.iid && w.from.pinId === wn.pid) { ni = w.to.instId; np = w.to.pinId; }
            else if (w.to.instId === wn.iid && w.to.pinId === wn.pid) { ni = w.from.instId; np = w.from.pinId; }
            else continue;
            const ninst = this.components.find(c => c.id === ni);
            if (!ninst) continue;
            if (this._isGroundPin(ninst, np)) {
              grounds.push({ type: 'gnd', instId: ni, pinId: np, resistance: current.resistance });
            } else {
              wq.push({ iid: ni, pid: np, d: wn.d + 1 });
            }
          }
        }
        continue;
      }
      visited.add(nodeKey);

      // 1. Arduino Uno / Nano Pins
      if (inst.type === 'arduino_uno' || inst.type === 'arduino_nano') {
        const pinId = current.pinId;
        if (pinId === 'GND1' || pinId === 'GND2' || pinId === 'GND_D' || pinId === 'GND') {
          grounds.push({ type: 'gnd', instId: inst.id, pinId, resistance: current.resistance });
        } else if (pinId === '5V' || pinId === 'VIN'||pinId === '5V2') {
          sources.push({ type: '5v', voltage: 5.0, rawVal: 255, resistance: current.resistance });
        } else if (pinId === '3V3') {
          sources.push({ type: '3v3', voltage: 3.3, rawVal: 168, resistance: current.resistance });
        } else {
          // Digital or Analog pin (D0–D13, A0–A5)
          const pinNum = this._pinToNumber(pinId);
          const pinKey = `pin_${pinNum}`;
          const sim = window.ArduinoSim;
          const rawVal = sim && sim.pinStates ? (sim.pinStates[pinKey] || 0) : 0;

          if (rawVal > 0) {
            const voltage = 5.0 * (rawVal > 1 ? (rawVal / 255) : 1.0);
            sources.push({ type: 'digital', pinNum, pinKey, voltage, rawVal, resistance: current.resistance });
          } else {
            // Pin is LOW (0V) -> can act as current sink (GND)
            grounds.push({ type: 'digital_low', pinNum, pinKey, resistance: current.resistance });
          }
        }
        continue;
      }

      // 1b. ESP32 DevKit V1 Pins
      if (inst.type === 'esp32_devkit_v1') {
        const pinId = current.pinId;
        if (pinId === 'GND1' || pinId === 'GND2' || pinId === 'GND') {
          grounds.push({ type: 'gnd', instId: inst.id, pinId, resistance: current.resistance });
        } else if (pinId === 'VIN') {
          sources.push({ type: '5v', voltage: 5.0, rawVal: 255, resistance: current.resistance });
        } else if (pinId === '3V3') {
          sources.push({ type: '3v3', voltage: 3.3, rawVal: 168, resistance: current.resistance });
        } else if (pinId === 'EN') {
          // Reset line — not a usable GPIO
        } else {
          // GPIO (D0–D35), analog ADC pins (VP/VN/D32–D35), UART (TX0/RX0)
          const pinNum = this._pinToNumber(pinId);
          const pinKey = `pin_${pinNum}`;
          const sim = window.ArduinoSim;
          const rawVal = sim && sim.pinStates ? (sim.pinStates[pinKey] || 0) : 0;

          if (rawVal > 0) {
            const voltage = 3.3 * (rawVal > 1 ? (rawVal / 255) : 1.0);
            sources.push({ type: 'digital', pinNum, pinKey, voltage, rawVal, resistance: current.resistance });
          } else {
            grounds.push({ type: 'digital_low', pinNum, pinKey, resistance: current.resistance });
          }
        }
        continue;
      }

      // 2. Power and Ground components
      if (inst.type === 'power_5v') {
        sources.push({ type: '5v', voltage: 5.0, rawVal: 255, resistance: current.resistance });
        continue;
      }
      if (inst.type === 'power_gnd') {
        grounds.push({ type: 'gnd', instId: inst.id, pinId: 'gnd', resistance: current.resistance });
        continue;
      }

      // 2b. MB102 Breadboard Power Supply
      if (inst.type === 'mb102_power') {
        const mbPowered = Boolean(inst.runtimeState?.powered ?? inst.props?.powered ?? 1);
        const topV = inst.props?.topVoltage ?? '5V';
        const botV = inst.props?.bottomVoltage ?? '3.3V';
        const voltageMap = { '5V': 5.0, '3.3V': 3.3, 'OFF': 0 };

        if (mbPowered) {
          if ((current.pinId === 'vcc_t' || current.pinId === 'aux_5v') && voltageMap[topV] > 0) {
            sources.push({ type: topV, voltage: voltageMap[topV], rawVal: 255, resistance: current.resistance });
          }
          if (current.pinId === 'aux_3v3' && voltageMap[botV] > 0) {
            sources.push({ type: '3.3V', voltage: 3.3, rawVal: 168, resistance: current.resistance });
          }
          if (current.pinId === 'vcc_b' && voltageMap[botV] > 0) {
            sources.push({ type: botV, voltage: voltageMap[botV], rawVal: 168, resistance: current.resistance });
          }
        }
        if (current.pinId === 'gnd_t' || current.pinId === 'gnd_b' || current.pinId === 'aux_gnd') {
          grounds.push({ type: 'gnd', instId: inst.id, pinId: current.pinId, resistance: current.resistance });
        }
        continue;
      }

      // 2c. Benchtop DC Power Supply (split-rail: +V, -V, GND, 5V)
      if (inst.type === 'bench_power_supply') {
        const bsPowered = Boolean(inst.runtimeState?.powered ?? inst.props?.powered ?? 1);
        const bsOutOn = bsPowered && Boolean(inst.runtimeState?.outputEnabled ?? inst.props?.outputEnabled ?? 1);
        const vSet = Number(inst.runtimeState?.voltageSet ?? inst.props?.voltageSet ?? 12.0);

        if (current.pinId === 'POS' && bsOutOn && vSet > 0) {
          sources.push({ type: 'bench_v+', voltage: vSet, rawVal: 255, resistance: current.resistance });
        }
        if (current.pinId === 'NEG' && bsOutOn && vSet > 0) {
          sources.push({ type: 'bench_v-', voltage: -vSet, rawVal: 0, resistance: current.resistance });
        }
        if (current.pinId === 'GND') {
          grounds.push({ type: 'gnd', instId: inst.id, pinId: current.pinId, resistance: current.resistance });
        }

        if (bsPowered && current.pinId === 'VCC_5V') {
          sources.push({ type: '5V_fixed', voltage: 5.0, rawVal: 255, resistance: current.resistance });
        }
        if (bsPowered && current.pinId === 'GND_5V') {
          grounds.push({ type: 'gnd', instId: inst.id, pinId: current.pinId, resistance: current.resistance });
        }
        // Do NOT continue — let wire-following at bottom of loop execute
        // so the trace can leave the bench_supply through connected wires
      }

      // 3. Resistor internal pass-through (p1 <-> p2)
      if (inst.type === 'resistor') {
        const rVal = (Number(inst.props.value) || 220) * (inst.props.unit === 'kΩ' ? 1e3 : inst.props.unit === 'MΩ' ? 1e6 : 1);
        const otherPin = current.pinId === 'p1' ? 'p2' : 'p1';
        queue.push({
          instId: inst.id,
          pinId: otherPin,
          resistance: current.resistance + rVal,
        });
      }

      // 3b. 12V Bulb internal pass-through (anode -> cathode only, ~12Ω nominal)
      // Directional: only allows trace in forward current direction (anode→cathode)
      // to prevent cross-circuit leakage through shared rails
      if (inst.type === 'bulb_12v' && !skipInternalTypes.includes('bulb_12v')) {
        if (current.pinId === 'anode') {
          queue.push({
            instId: inst.id,
            pinId: 'cathode',
            resistance: current.resistance + 12,
          });
        }
      }

      // 4. Push Button internal pass-through
      if (inst.type === 'push_button') {
        const isPressed = inst.runtimeState && inst.runtimeState.pressed;
        if (current.pinId === 'p1') queue.push({ instId: inst.id, pinId: 'p2', resistance: current.resistance });
        if (current.pinId === 'p2') queue.push({ instId: inst.id, pinId: 'p1', resistance: current.resistance });
        if (current.pinId === 'p3') queue.push({ instId: inst.id, pinId: 'p4', resistance: current.resistance });
        if (current.pinId === 'p4') queue.push({ instId: inst.id, pinId: 'p3', resistance: current.resistance });

        if (isPressed) {
          if (current.pinId === 'p1' || current.pinId === 'p2') {
            queue.push({ instId: inst.id, pinId: 'p3', resistance: current.resistance });
            queue.push({ instId: inst.id, pinId: 'p4', resistance: current.resistance });
          } else {
            queue.push({ instId: inst.id, pinId: 'p1', resistance: current.resistance });
            queue.push({ instId: inst.id, pinId: 'p2', resistance: current.resistance });
          }
        }
      }

      // 4b. Relay internal pass-through (COM ↔ NO when active, COM ↔ NC when inactive)
      if (inst.type === 'relay') {
        const relayOn = !!(inst.runtimeState && inst.runtimeState.active);
        if (current.pinId === 'com') {
          queue.push({ instId: inst.id, pinId: relayOn ? 'no' : 'nc', resistance: current.resistance });
        } else if (current.pinId === 'no' && relayOn) {
          queue.push({ instId: inst.id, pinId: 'com', resistance: current.resistance });
        } else if (current.pinId === 'nc' && !relayOn) {
          queue.push({ instId: inst.id, pinId: 'com', resistance: current.resistance });
        }
      }

      // 4b1. Digital IC output pins act as voltage sources
      const IC_OUTPUT_PINS = {
        ic_555: ['OUT', 'DIS'],
        ic_74hc04: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'],
        ic_74hc00: ['Y1', 'Y2', 'Y3', 'Y4'],
        ic_74hc08: ['Y1', 'Y2', 'Y3', 'Y4'],
        ic_74hc32: ['Y1', 'Y2', 'Y3', 'Y4'],
        ic_74hc595: ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'QHn'],
        ic_74hc138: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'],
        ic_74hc245: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'],
        ic_74hc74: ['Q1', 'Q1n', 'Q2', 'Q2n'],
        ic_74hc165: ['Q7', 'Q7n'],
        ic_74hc193: ['QA', 'QB', 'CO', 'BO', 'TC_U', 'TC_D'],
        ic_74hc47: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        ic_74hc148: ['A0', 'A1', 'A2', 'GS', 'EO'],
        lm741: ['OUT'],
      };
      if (IC_OUTPUT_PINS[inst.type] && IC_OUTPUT_PINS[inst.type].includes(current.pinId)) {
        let rawVal;
        if (inst.type === 'lm741') {
          rawVal = inst.runtimeState && inst.runtimeState.vOut != null
            ? Math.round((inst.runtimeState.vOut / 5.0) * 255) : 0;
        } else {
          rawVal = inst.runtimeState && inst.runtimeState[current.pinId] != null
            ? inst.runtimeState[current.pinId] : 0;
        }
        if (rawVal > 0) {
          const voltage = 5.0 * (rawVal > 1 ? (rawVal / 255) : 1.0);
          sources.push({ type: 'ic_out', voltage, rawVal, resistance: current.resistance });
        } else {
          grounds.push({ type: 'ic_out_low', resistance: current.resistance });
        }
      }

      // 4b2. Function generator output pins act as voltage sources
      if (inst.type === 'func_gen') {
        const rs = inst.runtimeState || {};
        if (current.pinId === 'ch1_out') {
          const v = rs.ch1_voltage != null ? rs.ch1_voltage : 0;
          if (v > 0) {
            sources.push({ type: 'func_gen', voltage: v, resistance: current.resistance });
          } else {
            grounds.push({ type: 'func_gen_low', resistance: current.resistance });
          }
        } else if (current.pinId === 'ch2_out') {
          const v = rs.ch2_voltage != null ? rs.ch2_voltage : 0;
          if (v > 0) {
            sources.push({ type: 'func_gen', voltage: v, resistance: current.resistance });
          } else {
            grounds.push({ type: 'func_gen_low', resistance: current.resistance });
          }
        }
      }

      // 4c. Breadboard internal connectivity
      if (inst.type === 'breadboard' || inst.type === 'breadboard_small') {
        const defs = window.ArduinoComponents?.COMPONENT_DEFS;
        const def = defs && defs[inst.type];
        if (def) {
          const myGroup = window._breadboardGetGroup(current.pinId);
          if (myGroup) {
            for (const otherPin of def.pins) {
              if (otherPin.id === current.pinId) continue;
              const otherGroup = window._breadboardGetGroup(otherPin.id);
              if (otherGroup === myGroup) {
                queue.push({ instId: inst.id, pinId: otherPin.id, resistance: current.resistance });
              }
            }
          }
        }
      }

      // 5. Traverse connected wires
      for (const wire of this.wires) {
        if (wire.from.instId === current.instId && wire.from.pinId === current.pinId) {
          queue.push({
            instId: wire.to.instId,
            pinId: wire.to.pinId,
            resistance: current.resistance,
          });
        } else if (wire.to.instId === current.instId && wire.to.pinId === current.pinId) {
          queue.push({
            instId: wire.from.instId,
            pinId: wire.from.pinId,
            resistance: current.resistance,
          });
        }
      }
    }

    return { sources, grounds };
  }

  // Quick check if a pin is a ground-type pin (for parallel path re-visiting)
  _isGroundPin(inst, pinId) {
    if (inst.type === 'arduino_uno' || inst.type === 'arduino_nano') {
      return pinId === 'GND1' || pinId === 'GND2' || pinId === 'GND_D' || pinId === 'GND';
    }
    if (inst.type === 'esp32_devkit_v1') {
      return pinId === 'GND1' || pinId === 'GND2' || pinId === 'GND';
    }
    if (inst.type === 'power_gnd') return true;
    if (inst.type === 'bench_power_supply') return pinId === 'GND' || pinId === 'GND_5V';
    if (inst.type === 'mb102_power') return pinId === 'gnd_t' || pinId === 'gnd_b' || pinId === 'aux_gnd';
    if (inst.type === 'battery') return pinId === 'neg';
    // Arduino digital pin LOW acts as ground
    if (inst.type === 'arduino_uno' || inst.type === 'arduino_nano' || inst.type === 'esp32_devkit_v1') {
      const pinNum = this._pinToNumber(pinId);
      if (pinNum != null) {
        const sim = window.ArduinoSim;
        const rawVal = sim && sim.pinStates ? (sim.pinStates[`pin_${pinNum}`] || 0) : 0;
        if (rawVal === 0) return true;
      }
    }
    // IC output LOW acts as ground
    const IC_OUTPUT_PINS = {
      ic_555: ['OUT'],
      ic_74hc04: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'],
      ic_74hc00: ['Y1', 'Y2', 'Y3', 'Y4'],
      ic_74hc08: ['Y1', 'Y2', 'Y3', 'Y4'],
      ic_74hc32: ['Y1', 'Y2', 'Y3', 'Y4'],
      ic_74hc595: ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'QHn'],
      ic_74hc138: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'],
      ic_74hc245: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'],
      ic_74hc74: ['Q1', 'Q1n', 'Q2', 'Q2n'],
      ic_74hc165: ['Q7', 'Q7n'],
      ic_74hc193: ['QA', 'QB', 'CO', 'BO', 'TC_U', 'TC_D'],
      ic_74hc47: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      ic_74hc148: ['A0', 'A1', 'A2', 'GS', 'EO'],
      lm741: ['OUT'],
    };
    if (IC_OUTPUT_PINS[inst.type] && IC_OUTPUT_PINS[inst.type].includes(pinId)) {
      const rawVal = inst.runtimeState && inst.runtimeState[pinId] != null ? inst.runtimeState[pinId] : 0;
      if (rawVal === 0) return true;
    }
    return false;
  }

  // Measure total resistance along the shortest resistive path between two pins
  _measureResistanceBetween(startInstId, startPinId, targetInstId, targetPinId) {
    const queue = [{ instId: startInstId, pinId: startPinId, resistance: 0 }];
    const visited = new Set();
    while (queue.length > 0) {
      const current = queue.shift();
      const nodeKey = `${current.instId}:${current.pinId}`;
      if (visited.has(nodeKey)) continue;
      visited.add(nodeKey);

      // Check if we reached the target pin
      if (current.instId === targetInstId && current.pinId === targetPinId) {
        return current.resistance;
      }

      const inst = this.components.find(c => c.id === current.instId);
      if (!inst) continue;

      // Resistor pass-through — add resistance
      if (inst.type === 'resistor') {
        const rVal = (Number(inst.props && inst.props.value) || 220) * (inst.props.unit === 'kΩ' ? 1e3 : inst.props.unit === 'MΩ' ? 1e6 : 1);
        const otherPin = current.pinId === 'p1' ? 'p2' : 'p1';
        queue.push({ instId: inst.id, pinId: otherPin, resistance: current.resistance + rVal });
        // Also skip past the resistor to the next connected component
        for (const wire of this.wires) {
          if (wire.from.instId === inst.id && wire.from.pinId === otherPin) {
            queue.push({ instId: wire.to.instId, pinId: wire.to.pinId, resistance: current.resistance + rVal });
          } else if (wire.to.instId === inst.id && wire.to.pinId === otherPin) {
            queue.push({ instId: wire.from.instId, pinId: wire.from.pinId, resistance: current.resistance + rVal });
          }
        }
        continue;
      }

      // Diode pass-through (forward biased only: anode → cathode)
      if (inst.type === 'diode_1n4007' && current.pinId === 'anode') {
        queue.push({ instId: inst.id, pinId: 'cathode', resistance: current.resistance + 0.7 });
      }

      // Breadboard internal connectivity
      if (inst.type === 'breadboard' || inst.type === 'breadboard_small') {
        const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
        const def = defs && defs[inst.type];
        if (def) {
          const myGroup = window._breadboardGetGroup(current.pinId);
          if (myGroup) {
            for (const otherPin of def.pins) {
              if (otherPin.id === current.pinId) continue;
              const otherGroup = window._breadboardGetGroup(otherPin.id);
              if (otherGroup === myGroup) {
                queue.push({ instId: inst.id, pinId: otherPin.id, resistance: current.resistance });
              }
            }
          }
        }
      }

      // Push button pass-through
      if (inst.type === 'push_button') {
        const isPressed = inst.runtimeState && inst.runtimeState.pressed;
        if (current.pinId === 'p1') queue.push({ instId: inst.id, pinId: 'p2', resistance: current.resistance });
        if (current.pinId === 'p2') queue.push({ instId: inst.id, pinId: 'p1', resistance: current.resistance });
        if (current.pinId === 'p3') queue.push({ instId: inst.id, pinId: 'p4', resistance: current.resistance });
        if (current.pinId === 'p4') queue.push({ instId: inst.id, pinId: 'p3', resistance: current.resistance });
        if (isPressed) {
          if (current.pinId === 'p1' || current.pinId === 'p2') {
            queue.push({ instId: inst.id, pinId: 'p3', resistance: current.resistance });
            queue.push({ instId: inst.id, pinId: 'p4', resistance: current.resistance });
          } else {
            queue.push({ instId: inst.id, pinId: 'p1', resistance: current.resistance });
            queue.push({ instId: inst.id, pinId: 'p2', resistance: current.resistance });
          }
        }
      }

      // Relay pass-through
      if (inst.type === 'relay') {
        const relayOn = !!(inst.runtimeState && inst.runtimeState.active);
        if (current.pinId === 'com') queue.push({ instId: inst.id, pinId: relayOn ? 'no' : 'nc', resistance: current.resistance });
        else if (current.pinId === 'no' && relayOn) queue.push({ instId: inst.id, pinId: 'com', resistance: current.resistance });
        else if (current.pinId === 'nc' && !relayOn) queue.push({ instId: inst.id, pinId: 'com', resistance: current.resistance });
      }

      // 12V Bulb pass-through (anode → cathode, 12Ω nominal)
      if (inst.type === 'bulb_12v' && current.pinId === 'anode') {
        queue.push({ instId: inst.id, pinId: 'cathode', resistance: current.resistance + 12 });
      }
      if (inst.type === 'bulb_12v' && current.pinId === 'cathode') {
        queue.push({ instId: inst.id, pinId: 'anode', resistance: current.resistance + 12 });
      }

      // Traverse connected wires
      for (const wire of this.wires) {
        if (wire.from.instId === current.instId && wire.from.pinId === current.pinId) {
          queue.push({ instId: wire.to.instId, pinId: wire.to.pinId, resistance: current.resistance });
        } else if (wire.to.instId === current.instId && wire.to.pinId === current.pinId) {
          queue.push({ instId: wire.from.instId, pinId: wire.from.pinId, resistance: current.resistance });
        }
      }
    }
    return Infinity; // no path found
  }

  _getWireTarget(instId, pinId) {
    for (const wire of this.wires) {
      if (wire.from.instId === instId && wire.from.pinId === pinId) {
        const inst = this.components.find(c => c.id === wire.to.instId);
        return inst ? { inst, pinId: wire.to.pinId } : null;
      }
      if (wire.to.instId === instId && wire.to.pinId === pinId) {
        const inst = this.components.find(c => c.id === wire.from.instId);
        return inst ? { inst, pinId: wire.from.pinId } : null;
      }
    }
    return null;
  }

  _getConnectedPinNum(instId, pinId) {
    for (const wire of this.wires) {
      let otherInstId, otherPinId;
      if (wire.from.instId === instId && wire.from.pinId === pinId) {
        otherInstId = wire.to.instId;
        otherPinId = wire.to.pinId;
      } else if (wire.to.instId === instId && wire.to.pinId === pinId) {
        otherInstId = wire.from.instId;
        otherPinId = wire.from.pinId;
      } else continue;

      const otherInst = this.components.find(c => c.id === otherInstId);
      if (!otherInst) continue;
      if (otherInst.type === 'arduino_uno' || otherInst.type === 'arduino_nano' || otherInst.type === 'esp32_devkit_v1') {
        return this._pinToNumber(otherPinId);
      }
    }
    return null;
  }

  // _readDigitalInput(fromInstId, pinId) {
  //   const wireTarget = this._getWireTarget(fromInstId, pinId);
  //   if (!wireTarget) return 0;
  //   const other = wireTarget.inst;
  //   if (other.type === 'power_5v') return 1;
  //   if (other.type === 'power_gnd') return 0;
  //   if (other.type === 'push_button') {
  //     const pressed = other.runtimeState && other.runtimeState.pressed;
  //     const tp = wireTarget.pinId;
  //     if (pressed) {
  //       if (tp === 'p1' || tp === 'p2') return this._readDigitalInput(other.id, 'p3');
  //       return this._readDigitalInput(other.id, 'p1');
  //     }
  //     if (tp === 'p1') return this._readDigitalInput(other.id, 'p2');
  //     if (tp === 'p2') return this._readDigitalInput(other.id, 'p1');
  //     if (tp === 'p3') return this._readDigitalInput(other.id, 'p4');
  //     if (tp === 'p4') return this._readDigitalInput(other.id, 'p3');
  //     return 0;
  //   }
  //   if (other.type === 'func_gen') {
  //     const rs = other.runtimeState || {};
  //     const v = wireTarget.pinId === 'ch1_out' ? (rs.ch1_voltage || 0)
  //       : wireTarget.pinId === 'ch2_out' ? (rs.ch2_voltage || 0) : 0;
  //     return v > 0 ? 1 : 0;
  //   }
  //   const pn = this._getConnectedPinNum(fromInstId, pinId);
  //   if (pn !== null) {
  //     const sim = window.ArduinoSim;
  //     return (sim && sim.pinStates && (sim.pinStates[`pin_${pn}`] || 0) > 0) ? 1 : 0;
  //   }
  //   const IC_OUT = {
  //     ic_555: ['OUT'],
  //     potentiometer: ['wiper'],
  //     ic_74hc00: ['Y1', 'Y2', 'Y3', 'Y4'],
  //     ic_74hc04: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'],
  //     ic_74hc08: ['Y1', 'Y2', 'Y3', 'Y4'],
  //     ic_74hc32: ['Y1', 'Y2', 'Y3', 'Y4'],
  //     ic_74hc595: ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'QHn'],
  //     ic_74hc138: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'],
  //     ic_74hc245: ['A1','A2','A3','A4','A5','A6','A7','A8','B1','B2','B3','B4','B5','B6','B7','B8'],
  //     ic_74hc74: ['Q1', 'Q1n', 'Q2', 'Q2n'],
  //     ic_74hc165: ['Q7', 'Q7n'],
  //     ic_74hc193: ['QA', 'QB', 'CO', 'BO', 'TC_U', 'TC_D'],
  //     ic_74hc47: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  //     ic_74hc148: ['A0', 'A1', 'A2', 'GS', 'EO'],
  //     lm741: ['OUT'],
  //   };
  //   if (IC_OUT[other.type] && IC_OUT[other.type].includes(wireTarget.pinId)) {
  //     const raw = other.runtimeState && other.runtimeState[wireTarget.pinId] != null
  //       ? other.runtimeState[wireTarget.pinId] : 0;
  //     return raw > 0 ? 1 : 0;
  //   }
  //   return 0;
  // }
  _readDigitalInput(fromInstId, pinId, visited = new Set()) {
  // Prevent infinite recursion loops across connected components
  const visitKey = `${fromInstId}:${pinId}`;
  if (visited.has(visitKey)) return 0;
  visited.add(visitKey);

  const wireTarget = this._getWireTarget(fromInstId, pinId);
  if (!wireTarget) return 0;

  const other = wireTarget.inst;
  const targetPin = wireTarget.pinId;

  // 1. Power rails
  if (other.type === 'power_5v') return 1;
  if (other.type === 'power_gnd') return 0;

  // 2. Pass-through components (Resistors)
  if (other.type === 'resistor') {
    const otherPin = targetPin === 'p1' ? 'p2' : 'p1';
    return this._readDigitalInput(other.id, otherPin, visited);
  }

  // 3. Push buttons
  if (other.type === 'push_button') {
    const pressed = other.runtimeState && other.runtimeState.pressed;
    if (pressed) {
      const nextPin = (targetPin === 'p1' || targetPin === 'p2') ? 'p3' : 'p1';
      return this._readDigitalInput(other.id, nextPin, visited);
    }
    // Unpressed: pass through adjacent terminal pairs (p1-p2 or p3-p4)
    const pairMap = { p1: 'p2', p2: 'p1', p3: 'p4', p4: 'p3' };
    return pairMap[targetPin] ? this._readDigitalInput(other.id, pairMap[targetPin], visited) : 0;
  }

  // 4. Analog signal sources (with 2.5V CMOS digital thresholding)
  if (other.type === 'func_gen') {
    const rs = other.runtimeState || {};
    const v = targetPin === 'ch1_out' ? (rs.ch1_voltage || 0)
            : targetPin === 'ch2_out' ? (rs.ch2_voltage || 0) : 0;
    return v >= 2.5 ? 1 : 0;
  }

  if (other.type === 'potentiometer' && targetPin === 'wiper') {
    const v = (other.runtimeState && other.runtimeState.voltage) || 0;
    return v >= 2.5 ? 1 : 0;
  }

  // 5. Arduino Pin state bridge
  const pn = this._getConnectedPinNum(fromInstId, pinId);
  if (pn !== null) {
    const sim = window.ArduinoSim;
    return (sim && sim.pinStates && (sim.pinStates[`pin_${pn}`] || 0) > 0) ? 1 : 0;
  }

  // 6. Integrated Circuits with Active-LOW default handling
  const IC_OUT = {
    ic_555: { pins: ['OUT'], activeLow: [] },
    ic_74hc00: { pins: ['Y1', 'Y2', 'Y3', 'Y4'], activeLow: [] },
    ic_74hc04: { pins: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'], activeLow: [] },
    ic_74hc08: { pins: ['Y1', 'Y2', 'Y3', 'Y4'], activeLow: [] },
    ic_74hc32: { pins: ['Y1', 'Y2', 'Y3', 'Y4'], activeLow: [] },
    ic_74hc595: { pins: ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'QHn'], activeLow: [] },
    ic_74hc138: { pins: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'], activeLow: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'] },
    ic_74hc245: { pins: ['A1','A2','A3','A4','A5','A6','A7','A8','B1','B2','B3','B4','B5','B6','B7','B8'], activeLow: [] },
    ic_74hc74: { pins: ['Q1', 'Q1n', 'Q2', 'Q2n'], activeLow: ['Q1n', 'Q2n'] },
    ic_74hc165: { pins: ['Q7', 'Q7n'], activeLow: ['Q7n'] },
    ic_74hc193: { pins: ['QA', 'QB', 'QC', 'QD', 'CO', 'BO'], activeLow: ['CO', 'BO'] },
    ic_74hc47: { pins: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], activeLow: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] },
    ic_74hc148: { pins: ['A0', 'A1', 'A2', 'GS', 'EO'], activeLow: ['A0', 'A1', 'A2', 'GS', 'EO'] },
    lm741: { pins: ['OUT'], activeLow: [] }
  };

  const icSpec = IC_OUT[other.type];
  if (icSpec && icSpec.pins.includes(targetPin)) {
    const rs = other.runtimeState || {};
    if (rs[targetPin] !== undefined) {
      return rs[targetPin] > 0 ? 1 : 0;
    }
    // Default fallback: Active-LOW pins default to 1, others to 0
    return icSpec.activeLow.includes(targetPin) ? 1 : 0;
  }

  return 0;
}

  _readAnalogInput(fromInstId, pinId) {
    const wireTarget = this._getWireTarget(fromInstId, pinId);
    if (!wireTarget) return 0;
    const other = wireTarget.inst;
    if (other.type === 'power_5v') return 1023;
    if (other.type === 'power_gnd') return 0;
    if (other.type === 'push_button') {
      const pressed = other.runtimeState && other.runtimeState.pressed;
      const tp = wireTarget.pinId;
      if (pressed) {
        if (tp === 'p1' || tp === 'p2') return this._readAnalogInput(other.id, 'p3');
        return this._readAnalogInput(other.id, 'p1');
      }
      if (tp === 'p1') return this._readAnalogInput(other.id, 'p2');
      if (tp === 'p2') return this._readAnalogInput(other.id, 'p1');
      if (tp === 'p3') return this._readAnalogInput(other.id, 'p4');
      if (tp === 'p4') return this._readAnalogInput(other.id, 'p3');
      return 0;
    }
    // For a potentiometer wiper, return the component's live value directly.
    // Do this before resolving the Arduino pin number; otherwise analogRead()
    // can simply read the previous cached pinState value.
    if (other.type === 'potentiometer' && wireTarget.pinId === 'wiper') {
      const value = other.runtimeState?.value ?? other.props?.value ?? 512;
      const maxValue = Number(other.props?.maxValue ?? 1023);
      return Math.max(0, Math.min(1023, Math.round((Number(value) / maxValue) * 1023)));
    }

    const pn = this._getConnectedPinNum(fromInstId, pinId);
    if (pn !== null) {
      const sim = window.ArduinoSim;
      return (sim && sim.pinStates) ? (sim.pinStates[`pin_${pn}`] || 0) : 0;
    }
    const IC_OUT2 = {
      ic_555: ['OUT'],
      potentiometer: ['wiper'],
      ic_74hc00: ['Y1', 'Y2', 'Y3', 'Y4'],
      ic_74hc04: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'],
      ic_74hc08: ['Y1', 'Y2', 'Y3', 'Y4'],
      ic_74hc32: ['Y1', 'Y2', 'Y3', 'Y4'],
      ic_74hc595: ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'QHn'],
      ic_74hc138: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'],
      ic_74hc245: ['A1','A2','A3','A4','A5','A6','A7','A8','B1','B2','B3','B4','B5','B6','B7','B8'],
      ic_74hc74: ['Q1', 'Q1n', 'Q2', 'Q2n'],
      ic_74hc165: ['Q7', 'Q7n'],
      ic_74hc193: ['QA', 'QB', 'CO', 'BO', 'TC_U', 'TC_D'],
      ic_74hc47: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      ic_74hc148: ['A0', 'A1', 'A2', 'GS', 'EO'],
      lm741: ['OUT'],
    };
    if (IC_OUT2[other.type] && IC_OUT2[other.type].includes(wireTarget.pinId)) {
      const raw = other.runtimeState && other.runtimeState[wireTarget.pinId] != null
        ? other.runtimeState[wireTarget.pinId] : 0;
      return Math.round((raw / 255) * 1023);
    }
    return 0;
  }

  _writeDigitalOutput(fromInstId, pinId, val) {
    const sim = window.ArduinoSim;
    const ps = sim ? sim.pinStates : null;
    const pn = this._getConnectedPinNum(fromInstId, pinId);
    if (pn !== null && ps) ps[`pin_${pn}`] = val ? 255 : 0;
    const wireTarget = this._getWireTarget(fromInstId, pinId);
    if (!wireTarget) return;
    const other = wireTarget.inst;
    const IC_OUT = {
      ic_555: ['OUT'],
      ic_74hc00: ['Y1', 'Y2', 'Y3', 'Y4'],
      ic_74hc04: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'],
      ic_74hc08: ['Y1', 'Y2', 'Y3', 'Y4'],
      ic_74hc32: ['Y1', 'Y2', 'Y3', 'Y4'],
      ic_74hc595: ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'QHn'],
      ic_74hc138: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'],
      ic_74hc245: ['A1','A2','A3','A4','A5','A6','A7','A8','B1','B2','B3','B4','B5','B6','B7','B8'],
      ic_74hc74: ['Q1', 'Q1n', 'Q2', 'Q2n'],
      ic_74hc165: ['Q7', 'Q7n'],
      ic_74hc193: ['QA', 'QB', 'CO', 'BO', 'TC_U', 'TC_D'],
      ic_74hc47: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      ic_74hc148: ['A0', 'A1', 'A2', 'GS', 'EO'],
      lm741: ['OUT'],
    };
    if (IC_OUT[other.type] && IC_OUT[other.type].includes(wireTarget.pinId)) {
      other.runtimeState[wireTarget.pinId] = val ? 255 : 0;
    }
  }
}

/* Export */
window.CircuitCanvas = null; // Will be set in app.js
window.CircuitCanvasClass = CircuitCanvas;
