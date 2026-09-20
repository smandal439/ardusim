/* -------------------------------------------------------
   thumbnails.js — Render serialized circuit data to small preview images
   Used by the Examples and Saved Projects modals.
   ------------------------------------------------------- */

'use strict';

const CircuitThumbnail = {
  _cache: new Map(),
  _cacheMax: 300,

  _getDefs() {
    return (window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS) || {};
  },

  /* Sanitize raw project data the same way CircuitCanvas.deserialize does */
  _sanitize(circuit) {
    const defs = this._getDefs();
    const GRID = 10;
    const seenIds = new Set();
    const components = (circuit && Array.isArray(circuit.components) ? circuit.components : [])
      .filter(c => c && typeof c === 'object' && c.type && defs[c.type] && c.id)
      .map(c => {
        const def = defs[c.type];
        const x = Number(c.x);
        const y = Number(c.y);
        const rot = Number(c.rotation);
        return {
          id: String(c.id),
          type: c.type,
          x: Number.isFinite(x) ? Math.round(x / GRID) * GRID : 0,
          y: Number.isFinite(y) ? Math.round(y / GRID) * GRID : 0,
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
    const wires = (circuit && Array.isArray(circuit.wires) ? circuit.wires : [])
      .filter(w => w && w.from && w.to && idSet.has(w.from.instId) && idSet.has(w.to.instId))
      .filter(w => {
        if (w.from.instId === w.to.instId && w.from.pinId === w.to.pinId) return false;
        const a = `${w.from.instId}:${w.from.pinId}:${w.to.instId}:${w.to.pinId}`;
        const b = `${w.to.instId}:${w.to.pinId}:${w.from.instId}:${w.from.pinId}`;
        if (seenWires.has(a) || seenWires.has(b)) return false;
        seenWires.add(a);
        seenWires.add(b);
        return true;
      })
      .map(w => ({
        id: String(w.id || 'w'),
        from: { instId: String(w.from.instId), pinId: String(w.from.pinId) },
        to:   { instId: String(w.to.instId),   pinId: String(w.to.pinId) },
      }));

    return { components, wires };
  },

  _cacheKey(width, height, data) {
    const comps = data.components.map(c =>
      c.id + '|' + c.type + '|' + c.x + '|' + c.y + '|' + c.rotation + '|' + JSON.stringify(c.props)
    ).join(';');
    const wires = data.wires.map(w =>
      w.from.instId + ':' + w.from.pinId + '-' + w.to.instId + ':' + w.to.pinId
    ).join(';');
    return width + 'x' + height + ':' + comps + '::' + wires;
  },

  /* Render a serialized circuit into a PNG data URL (or null if empty) */
  render(circuit, width = 320, height = 180) {
    const data = this._sanitize(circuit);
    if (!data.components.length) return null;

    const key = this._cacheKey(width, height, data);
    if (this._cache.has(key)) return this._cache.get(key);

    const dpr = Math.min(window.devicePixelRatio || 2, 2);
    const cw = Math.max(2, Math.round(width * dpr));
    const ch = Math.max(2, Math.round(height * dpr));
    const cv = document.createElement('canvas');
    cv.width = cw;
    cv.height = ch;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(0, 0, cw, ch);

    const defs = this._getDefs();

    // Fit-to-view bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of data.components) {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + c.width);
      maxY = Math.max(maxY, c.y + c.height);
    }
    if (!Number.isFinite(minX)) return null;
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const pad = 24 * dpr;
    const scale = Math.min((cw - pad * 2) / bw, (ch - pad * 2) / bh, 2.4 * dpr);
    const ox = (cw - bw * scale) / 2 - minX * scale;
    const oy = (ch - bh * scale) / 2 - minY * scale;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    // ── Wires ──
    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3a6ea8';
    for (const w of data.wires) {
      const instA = data.components.find(c => c.id === w.from.instId);
      const instB = data.components.find(c => c.id === w.to.instId);
      if (!instA || !instB) continue;
      const p1 = this._pinWorldPos(instA, defs[instA.type], w.from.pinId);
      const p2 = this._pinWorldPos(instB, defs[instB.type], w.to.pinId);
      if (!p1 || !p2) continue;
      // Orthogonal (right-angle) routing like the main canvas
      const mx = (p1.x + p2.x) / 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(mx, p1.y);
      ctx.lineTo(mx, p2.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();

    // ── Components ──
    for (const c of data.components) {
      const def = defs[c.type];
      if (!def) continue;
      ctx.save();
      if (c.rotation) {
        const cx = c.x + c.width / 2;
        const cy = c.y + c.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(c.rotation * Math.PI / 2);
        ctx.translate(-cx, -cy);
      }
      try {
        def.draw(ctx, c, null);
      } catch (e) {
        // A single component must never break the whole thumbnail
      }
      ctx.restore();
    }

    ctx.restore();

    const url = cv.toDataURL('image/png');
    if (this._cache.size >= this._cacheMax) {
      this._cache.delete(this._cache.keys().next().value);
    }
    this._cache.set(key, url);
    return url;
  },

  /* Render into an existing <img> element */
  applyTo(imgEl, circuit, width, height) {
    const url = this.render(circuit, width, height);
    if (url) imgEl.src = url;
    else imgEl.classList.add('thumbnail-empty');
    return url;
  },

  _pinWorldPos(inst, def, pinId) {
    const pin = (def.pins || []).find(p => p.id === pinId);
    if (!pin) return null;
    return { x: inst.x + pin.x, y: inst.y + pin.y };
  },
};

window.CircuitThumbnail = CircuitThumbnail;
