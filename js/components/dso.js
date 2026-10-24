'use strict';

/* Numeric props that are used as divisors (V/Div, Time/Div) or as pixel
   multipliers (Position, Trigger Level) while the trace is drawn. A legacy
   project or a hand-typed value of 0 / NaN / Infinity turns the geometry into
   NaN and silently blanks the screen, so they are clamped at read time.
   Every call site keeps going through the component's P() helper, which means
   this covers the draw, the trigger line, the OSD and the measurements. */
const _DSO_BOUNDS = {
  timebase:   [0.00001, 0.1],
  ch1_vdiv:   [0.05, 20],
  ch2_vdiv:   [0.05, 20],
  ch1_pos:    [-4, 4],
  ch2_pos:    [-4, 4],
  trig_level: [-10, 10],
};

function _dsoProp(rs, props, field, def) {
  const v = rs[field] !== undefined ? rs[field] : (props[field] ?? def);
  const lim = _DSO_BOUNDS[field];
  if (!lim) return v;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(lim[1], Math.max(lim[0], n)) : def;
}

function _dsoBool(value) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['', '0', 'false', 'off', 'no'].includes(normalized)) return false;
    if (['1', 'true', 'on', 'yes'].includes(normalized)) return true;
  }
  return Boolean(value);
}

defComp({
  id: 'dso_4ch',
  name: '2-Channel Digital Storage Oscilloscope',
  category: 'Instruments',
  icon: '∿',
  desc: '2-Channel DSO with phosphor display, AC/DC coupling, trigger, measurements, cursors, math channel, and fullscreen mode.',

  width: 440,
  height: 300,

  defaultProps: {
    powered: 1,
    runStop: 1,
    singleTrigger: 0,
    autoSet: 0,
    timebase: 0.001,
    trig_source: 'ch1',
    trig_level: 0.0,
    trig_mode: 'auto',
    trig_slope: 'rising',
    ch1_en: true,  ch1_vdiv: 1.0,  ch1_pos: 2.0,  ch1_coupling: 'dc', ch1_probe: 1,
    ch2_en: true,  ch2_vdiv: 2.0,  ch2_pos: 0.0,  ch2_coupling: 'dc', ch2_probe: 1,
    math_op: 'off',
    dsoMode: 'scope',
  },

  interactive: [
    { field: 'powered',     label: 'Power',      type: 'toggle', min: 0, max: 1, step: 1, unit: '', inline: { x: 388, y: 38, w: 26, h: 42 } },
    { field: 'runStop',     label: 'Run/Stop',   type: 'toggle', min: 0, max: 1, step: 1, unit: '', inline: { x: 316, y: 185, w: 38, h: 18 } },
    { field: 'singleTrigger', label: 'Single',   type: 'toggle', min: 0, max: 1, step: 1, unit: '', inline: { x: 358, y: 185, w: 38, h: 18 } },
    { field: 'autoSet',     label: 'Auto Set',    type: 'toggle', min: 0, max: 1, step: 1, unit: '', inline: { x: 316, y: 209, w: 38, h: 16 } },
    { field: 'timebase',    label: 'Time/Div',     min: 0.00001, max: 0.1, scale: 'log', unit: 's' },
    { field: 'trig_source', label: 'Trig Source',  type: 'select', options: [
      { value: 'ch1', label: 'CH1' }, { value: 'ch2', label: 'CH2' }
    ]},
    { field: 'trig_level',  label: 'Trig Level',   min: -10, max: 10, step: 0.1, unit: 'V' },
    { field: 'trig_slope',  label: 'Trig Slope',   type: 'select', options: [
      { value: 'rising', label: 'Rising' }, { value: 'falling', label: 'Falling' }
    ]},
    { field: 'ch1_en',       label: 'CH1 Enable',   type: 'checkbox' },
    { field: 'ch1_vdiv',     label: 'CH1 V/Div',    min: 0.05, max: 20, step: 0.05, scale: 'log', unit: 'V' },
    { field: 'ch1_pos',      label: 'CH1 Position',  min: -4, max: 4, step: 0.1, unit: 'div' },
    { field: 'ch1_coupling', label: 'CH1 Coupling',  type: 'select', options: [
      { value: 'dc', label: 'DC' }, { value: 'ac', label: 'AC' }, { value: 'gnd', label: 'GND' }
    ]},
    { field: 'ch2_en',       label: 'CH2 Enable',   type: 'checkbox' },
    { field: 'ch2_vdiv',     label: 'CH2 V/Div',    min: 0.05, max: 20, step: 0.05, scale: 'log', unit: 'V' },
    { field: 'ch2_pos',      label: 'CH2 Position',  min: -4, max: 4, step: 0.1, unit: 'div' },
    { field: 'ch2_coupling', label: 'CH2 Coupling',  type: 'select', options: [
      { value: 'dc', label: 'DC' }, { value: 'ac', label: 'AC' }, { value: 'gnd', label: 'GND' }
    ]},
    { field: 'dsoMode', label: 'Display Mode', type: 'select', options: [
      { value: 'scope', label: 'Scope' }, { value: 'spectrum', label: 'Spectrum' }, { value: 'xy', label: 'XY' }
    ]},
  ],

  pins: [
    { id: 'ch1_in', label: 'CH1', type: PIN_TYPE.SIGNAL, x: 50,  y: 300, side: 'bottom' },
    { id: 'ch2_in', label: 'CH2', type: PIN_TYPE.SIGNAL, x: 120, y: 300, side: 'bottom' },
    { id: 'gnd',    label: 'GND', type: PIN_TYPE.GND,    x: 350, y: 300, side: 'bottom' },
  ],

  step(inst, sim) {
    const isPowered = _dsoBool(inst.runtimeState?.powered ?? inst.props?.powered ?? 1);
    if (!isPowered) return;

    const rs = inst.runtimeState || {};
    const P = _dsoProp;
    const isRunning = _dsoBool(rs.runStop !== undefined ? rs.runStop : (inst.props?.runStop ?? 1));
    const isSingleArmed = _dsoBool(rs.singleTrigger !== undefined ? rs.singleTrigger : (inst.props?.singleTrigger ?? 0));
    const isPaused = _dsoBool(rs.paused);

    if (!inst._buffers) {
      inst._buffers = { ch1: [], ch2: [], ch3: [], ch4: [], t: [] };
      inst._triggered = false;
    }

    const t = sim && typeof sim.simTime === 'number' ? sim.simTime / 1000 : performance.now() / 1000;
    inst._lastSimTime = t;
    const avSim = window.ArduinoSim;
    const readV = (pin) => {
      if (sim && typeof sim.getPinVoltage === 'function') return sim.getPinVoltage(inst, pin);
      if (avSim && typeof avSim.getPinVoltage === 'function') return avSim.getPinVoltage(inst, pin);
      return 0;
    };
    const readChannel = (pin, probeType) => {
      const wireV = readV(pin);
      if (Math.abs(wireV) > 0.001) return wireV;
      const probe = _dsoFindProbe(probeType);
      return probe && probe.runtimeState ? (probe.runtimeState.voltage || 0) : 0;
    };

    const buf = inst._buffers;
    const divsX = 12;
    const scrW = 280;
    const timebase = P(rs, inst.props, 'timebase', 0.001);
    const totalTime = timebase * divsX;
    const measurementTime = buf.t.length > 1 ? Math.max(buf.t[buf.t.length - 1] - buf.t[0], 1e-9) : totalTime;

    if (!isRunning && !isSingleArmed) {
      inst._computeMeas = inst._computeMeas || {};
      ['ch1', 'ch2', 'ch3', 'ch4'].forEach((chId, i) => {
        const probeFactor = P(rs, inst.props, chId + '_probe', 1);
        const rawSamples = buf[chId] && buf[chId].length > 0 ? buf[chId] : null;
        const samples = rawSamples ? rawSamples.map(v => v * probeFactor) : null;
        inst._computeMeas[chId] = dsoComputeMeasurements(samples, measurementTime);
      });
      return;
    }

    const probeFactor1 = P(rs, inst.props, 'ch1_probe', 1);
    const probeFactor2 = P(rs, inst.props, 'ch2_probe', 1);
    const probeFactor3 = P(rs, inst.props, 'ch3_probe', 1);
    const probeFactor4 = P(rs, inst.props, 'ch4_probe', 1);

    // Cache raw (un-probed) voltages so trigger and measurement can access them
    const v1 = readChannel('ch1_in', 'dso_probe_ch1');
    const v2 = readChannel('ch2_in', 'dso_probe_ch2');
    const v3 = readChannel('ch3_in', 'dso_probe_ch3');
    const v4 = readChannel('ch4_in', 'dso_probe_ch4');

    // Store previous voltages for sub-frame interpolation, then update
    const prevV = inst._lastRawV || [v1, v2, v3, v4];
    inst._lastRawV = [v1, v2, v3, v4];

    // Pause: skip sampling but keep last buffer
    if (isPaused) {
      inst._computeMeas = inst._computeMeas || {};
      ['ch1', 'ch2', 'ch3', 'ch4'].forEach((chId) => {
        const probeFactor = P(rs, inst.props, chId + '_probe', 1);
        const rawSamples = buf[chId] && buf[chId].length > 0 ? buf[chId] : null;
        const samples = rawSamples ? rawSamples.map(v => v * probeFactor) : null;
        inst._computeMeas[chId] = dsoComputeMeasurements(samples, measurementTime);
      });
      return;
    }

    // Detect connected function generators for sub-frame analytical sampling
    const _findConnectedFG = (dsoInst, pinId) => {
      const cc = window.CircuitCanvas;
      if (cc && typeof cc._getWireTarget === 'function') {
        const target = cc._getWireTarget(dsoInst.id, pinId);
        if (target && target.inst && target.inst.type === 'func_gen') return target.inst;
      }
      if (cc && Array.isArray(cc.wires) && Array.isArray(cc.components)) {
        for (const wire of cc.wires) {
          const matchesFrom = wire.from?.instId === dsoInst.id && wire.from?.pinId === pinId;
          const matchesTo = wire.to?.instId === dsoInst.id && wire.to?.pinId === pinId;
          if (!matchesFrom && !matchesTo) continue;
          const otherId = matchesFrom ? wire.to?.instId : wire.from?.instId;
          const other = cc.components.find(component => component.id === otherId);
          if (other?.type === 'func_gen') return other;
        }
      }
      return null;
    };

    const _calcWaveAnalytical = (fgInst, chPin, sampleT) => {
      if (!fgInst) return null;
      const fgProps = fgInst.props || {};
      const isWave = chPin === 'ch1_out';
      const wave = fgProps[isWave ? 'ch1_wave' : 'ch2_wave'] || 'sine';
      const freq = fgProps[isWave ? 'ch1_freq' : 'ch2_freq'] || 440;
      const amp = fgProps[isWave ? 'ch1_amp' : 'ch2_amp'] || 5;
      const offset = fgProps[isWave ? 'ch1_offset' : 'ch2_offset'] || 0;
      const phaseDeg = fgProps[isWave ? 'ch1_phase' : 'ch2_phase'] || 0;
      const duty = fgProps[isWave ? 'ch1_duty' : 'ch2_duty'] || 50;
      const phaseRad = phaseDeg * Math.PI / 180;
      const tau = ((sampleT * freq + phaseRad / (2 * Math.PI)) % 1 + 1) % 1;
      const dutyFrac = duty / 100;
      let v = 0;
      switch (wave) {
        case 'sine':     v = Math.sin(2 * Math.PI * tau); break;
        case 'square':   v = tau < dutyFrac ? 1 : -1; break;
        case 'triangle': v = tau < dutyFrac ? -1 + 2 * (tau / dutyFrac) : 1 - 2 * ((tau - dutyFrac) / (1 - dutyFrac)); break;
        case 'sawtooth': v = 2 * tau - 1; break;
        case 'noise':    v = Math.sin(sampleT * freq * 137.5) * 0.7 + Math.sin(sampleT * freq * 239.1) * 0.3; break;
        default:         v = Math.sin(2 * Math.PI * tau); break;
      }
      return offset + v * (amp / 2);
    };

    const fg1 = _findConnectedFG(inst, 'ch1_in');
    const fg2 = _findConnectedFG(inst, 'ch2_in');
    const fg3 = _findConnectedFG(inst, 'ch3_in');
    const fg4 = _findConnectedFG(inst, 'ch4_in');
    const hasFG = fg1 || fg2 || fg3 || fg4;

    // Sub-frame analytical sampling when function generators are connected
    // Keep enough analytical samples for the complete screen window without
    // trying to simulate an impossible 1 GHz capture rate.
    const TARGET_RATE = 1000000;
    const MAX_SAMPLES = 200000;
    const MAX_PER_FRAME = 50000;
    const maxSamples = Math.max(1024, Math.min(MAX_SAMPLES, Math.ceil(TARGET_RATE * totalTime)));
    const lastT = inst._lastSampleTime || 0;
    const dt = t - lastT;
    let subFramePushed = false;

    if (hasFG && dt > 0 && buf.t.length > 0) {
      const numSamples = Math.min(Math.ceil(dt * TARGET_RATE), maxSamples - buf.t.length, MAX_PER_FRAME);
      if (numSamples > 1) {
        for (let i = 0; i < numSamples; i++) {
          const frac = (i + 1) / numSamples;
          const sampleT = lastT + dt * frac;
          buf.t.push(sampleT);
          buf.ch1.push(fg1 ? _calcWaveAnalytical(fg1, 'ch1_out', sampleT) * probeFactor1 : (prevV[0] + (v1 - prevV[0]) * frac) * probeFactor1);
          buf.ch2.push(fg2 ? _calcWaveAnalytical(fg2, 'ch2_out', sampleT) * probeFactor2 : (prevV[1] + (v2 - prevV[1]) * frac) * probeFactor2);
          buf.ch3.push(fg3 ? _calcWaveAnalytical(fg3, 'ch3_out', sampleT) * probeFactor3 : (prevV[2] + (v3 - prevV[2]) * frac) * probeFactor3);
          buf.ch4.push(fg4 ? _calcWaveAnalytical(fg4, 'ch4_out', sampleT) * probeFactor4 : (prevV[3] + (v4 - prevV[3]) * frac) * probeFactor4);
        }
        subFramePushed = true;
      }
    }

    // Push live sample (skip if sub-frame already covered this step)
    if (!subFramePushed) {
      buf.ch1.push(v1 * probeFactor1);
      buf.ch2.push(v2 * probeFactor2);
      buf.ch3.push(v3 * probeFactor3);
      buf.ch4.push(v4 * probeFactor4);
      buf.t.push(t);
    }
    inst._lastSampleTime = t;

    // Trim buffer
    if (buf.t.length > maxSamples) {
      const excess = buf.t.length - maxSamples;
      buf.ch1.splice(0, excess); buf.ch2.splice(0, excess);
      buf.ch3.splice(0, excess); buf.ch4.splice(0, excess);
      buf.t.splice(0, excess);
    }

    const capturedTime = buf.t.length > 1 ? Math.max(buf.t[buf.t.length - 1] - buf.t[0], 1e-9) : totalTime;

    // Single trigger logic
    if (isSingleArmed && !inst._triggered) {
      const trigSource = P(rs, inst.props, 'trig_source', 'ch1');
      const trigLevel = P(rs, inst.props, 'trig_level', 0);
      const trigSlope = P(rs, inst.props, 'trig_slope', 'rising');
      const chSamples = buf[trigSource];
      if (chSamples && chSamples.length >= 2) {
        const prev = chSamples[chSamples.length - 2];
        const curr = chSamples[chSamples.length - 1];
        const triggered = trigSlope === 'rising'
          ? (prev < trigLevel && curr >= trigLevel)
          : (prev > trigLevel && curr <= trigLevel);
        if (triggered) {
          inst._triggered = true;
          rs.singleTrigger = 0;
          rs.runStop = 0;
        }
      }
    }

    // Compute measurements for each enabled channel
    inst._computeMeas = inst._computeMeas || {};
    ['ch1', 'ch2', 'ch3', 'ch4'].forEach((chId) => {
      const probeFactor = P(rs, inst.props, chId + '_probe', 1);
      const rawSamples = buf[chId] && buf[chId].length > 0 ? buf[chId] : null;
      const samples = rawSamples ? rawSamples.map(v => v * probeFactor) : null;
      inst._computeMeas[chId] = dsoComputeMeasurements(samples, capturedTime);
    });

    // Auto-set: triggered when autoSet prop toggles to 1
    const isAutoSet = _dsoBool(rs.autoSet !== undefined ? rs.autoSet : (inst.props.autoSet ?? 0));
    if (isAutoSet) {
      _dsoAutoSet(inst, rs, buf, P);
      rs.autoSet = 0;
      inst.props.autoSet = 0;
    }
  },

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const props = inst.props || {};
    const rs = inst.runtimeState || {};
    const W = 440, H = 300;
    const t = sim && typeof sim.time === 'number' ? sim.time : performance.now() / 1000;
    const isPowered = _dsoBool(inst.runtimeState?.powered ?? inst.props?.powered ?? 1);
    const isRunning = _dsoBool(rs.runStop !== undefined ? rs.runStop : (inst.props?.runStop ?? 1));
    const isSingleArmed = _dsoBool(rs.singleTrigger !== undefined ? rs.singleTrigger : (inst.props?.singleTrigger ?? 0));

    const P = (field, def) => _dsoProp(rs, props, field, def);

    const _rr = (c, rx, ry, rw, rh, rad) => {
      if (typeof roundRect === 'function') { roundRect(c, rx, ry, rw, rh, rad); return; }
      c.beginPath(); c.moveTo(rx + rad, ry);
      c.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
      c.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
      c.arcTo(rx, ry + rh, rx, ry, rad);
      c.arcTo(rx, ry, rx + rw, ry, rad); c.closePath();
    };

    ctx.save();
    ctx.translate(x, y);

    // ── Chassis Body ──
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#2a2e38'); bg.addColorStop(0.5, '#22262f'); bg.addColorStop(1, '#181b22');
    ctx.fillStyle = bg;
    _rr(ctx, 0, 0, W, H - 40, 10); ctx.fill();
    ctx.strokeStyle = '#0c0e12'; ctx.lineWidth = 3; ctx.stroke();

    // ── Bezel Screws ──
    const _screw = (sx, sy) => {
      ctx.fillStyle = '#3a3f4a';
      ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a1d22'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = '#4a4f5a'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(sx - 2.5, sy); ctx.lineTo(sx + 2.5, sy); ctx.stroke();
    };
    _screw(12, 12); _screw(W - 12, 12); _screw(12, H - 52); _screw(W - 12, H - 52);

    // ── Top Bar ──
    ctx.fillStyle = '#1a1d24';
    ctx.fillRect(10, 6, W - 20, 20);

    // Brand Logo
    ctx.fillStyle = isPowered ? '#00d4e6' : '#1a2a30';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DSO-4100', 18, 20);

    ctx.fillStyle = isPowered ? '#606878' : '#2a2e38';
    ctx.font = '7px sans-serif';
    ctx.fillText('2-CH DIGITAL STORAGE OSCILLOSCOPE', 82, 20);

    // Run/Stop status
    if (isPowered) {
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'right';
      if (!isRunning) {
        ctx.fillStyle = '#ff3366';
        ctx.fillText('STOP', W - 80, 20);
      } else if (isSingleArmed) {
        ctx.fillStyle = '#ffaa00';
        ctx.fillText('READY', W - 80, 20);
      } else {
        ctx.fillStyle = '#00ff66';
        ctx.fillText('TRIG\'D', W - 80, 20);
      }
    }

    // Power LED
    ctx.fillStyle = isPowered ? '#00e676' : '#1b3a24';
    ctx.beginPath(); ctx.arc(W - 18, 15, 3, 0, Math.PI * 2); ctx.fill();
    if (isPowered) {
      ctx.fillStyle = 'rgba(0,230,118,0.3)';
      ctx.beginPath(); ctx.arc(W - 18, 15, 6, 0, Math.PI * 2); ctx.fill();
    }

    // ── Screen Panel ──
    const scrX = 12, scrY = 32, scrW = 280, scrH = 170;
    ctx.fillStyle = '#020406';
    _rr(ctx, scrX - 2, scrY - 2, scrW + 4, scrH + 4, 5); ctx.fill();
    ctx.fillStyle = '#010204';
    _rr(ctx, scrX, scrY, scrW, scrH, 3); ctx.fill();
    ctx.strokeStyle = '#2a3040'; ctx.lineWidth = 1; ctx.stroke();

    // ── Phosphor Screen Clip ──
    ctx.save();
    _rr(ctx, scrX, scrY, scrW, scrH, 3);
    ctx.clip();

    // Screen Background Gradient
    const scrGrad = ctx.createRadialGradient(scrX + scrW / 2, scrY + scrH / 2, 20, scrX + scrW / 2, scrY + scrH / 2, scrW * 0.6);
    scrGrad.addColorStop(0, '#060a10');
    scrGrad.addColorStop(1, '#020306');
    ctx.fillStyle = scrGrad;
    ctx.fillRect(scrX, scrY, scrW, scrH);

    // ── Grid Graticule ──
    const divsX = 12, divsY = 8;
    const dW = scrW / divsX, dH = scrH / divsY;
    const cy = scrY + scrH / 2;
    const cx = scrX + scrW / 2;

    ctx.strokeStyle = '#0c1420';
    ctx.lineWidth = 0.6;
    for (let i = 1; i < divsX; i++) {
      const px = scrX + dW * i;
      ctx.beginPath(); ctx.moveTo(px, scrY); ctx.lineTo(px, scrY + scrH); ctx.stroke();
    }
    for (let i = 1; i < divsY; i++) {
      const py = scrY + dH * i;
      ctx.beginPath(); ctx.moveTo(scrX, py); ctx.lineTo(scrX + scrW, py); ctx.stroke();
    }

    // Center crosshair
    ctx.strokeStyle = '#182838';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(scrX, cy); ctx.lineTo(scrX + scrW, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, scrY); ctx.lineTo(cx, scrY + scrH); ctx.stroke();

    // Sub-tick marks
    ctx.fillStyle = '#203040';
    for (let i = 0; i <= divsX * 4; i++) {
      const tx = scrX + (scrW / (divsX * 4)) * i;
      ctx.fillRect(tx, cy - 1, 0.5, 2);
    }
    for (let i = 0; i <= divsY * 4; i++) {
      const ty = scrY + (scrH / (divsY * 4)) * i;
      ctx.fillRect(cx - 1, ty, 2, 0.5);
    }

    // ── Waveform Rendering ──
    const channels = [
      { id: 'ch1', en: _dsoBool(P('ch1_en', true)), col: '#ffe600', glow: '#ffe600', vdiv: P('ch1_vdiv', 1), pos: P('ch1_pos', 2), coup: P('ch1_coupling', 'dc') },
      { id: 'ch2', en: _dsoBool(P('ch2_en', true)), col: '#00e5ff', glow: '#00e5ff', vdiv: P('ch2_vdiv', 2), pos: P('ch2_pos', 0), coup: P('ch2_coupling', 'dc') },
    ];

    const buf = inst._buffers;
    const totalTime = P('timebase', 0.001) * divsX;

    // Binary search: find index i where tS[i] <= target < tS[i+1]
    const _dsoBinSearch = (tS, target) => {
      let lo = 0, hi = tS.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (tS[mid] <= target) lo = mid; else hi = mid - 1;
      }
      return lo;
    };

    if (isPowered) {

    channels.forEach((ch) => {
      if (!ch.en) return;
      const samples = buf && buf[ch.id] && buf[ch.id].length > 0 ? buf[ch.id] : null;
      const tS = buf && buf.t && buf.t.length > 0 ? buf.t : null;

      let meanV = 0;
      if (ch.coup === 'ac' && samples) {
        meanV = samples.reduce((a, b) => a + b, 0) / samples.length;
      }

        const pts = [];
        for (let px = 0; px < scrW; px++) {
          let v = 0;
          if (ch.coup === 'gnd') {
            v = 0;
          } else if (samples && tS && samples.length > 1) {
            const target = t - totalTime * (1 - px / scrW);
            const idx = _dsoBinSearch(tS, target);
            // Linear interpolation between bracketing samples
            if (idx < samples.length - 1 && tS[idx + 1] !== tS[idx]) {
              const frac = (target - tS[idx]) / (tS[idx + 1] - tS[idx]);
              v = samples[idx] + (samples[idx + 1] - samples[idx]) * Math.max(0, Math.min(1, frac));
            } else {
              v = samples[idx];
            }
            if (ch.coup === 'ac') v -= meanV;
            }
        pts.push({ px: scrX + px, py: cy - (v * (dH / ch.vdiv)) - (ch.pos * dH) });
      }

      // Glow layer
      ctx.strokeStyle = ch.glow;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 4;
      ctx.shadowColor = ch.glow;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
      ctx.stroke();

      // Main trace
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
      ctx.stroke();

      // Bright core
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.6;
      ctx.shadowBlur = 2;
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Ground reference marker
      const baseY = cy - (ch.pos * dH);
      if (baseY >= scrY && baseY <= scrY + scrH) {
        ctx.fillStyle = ch.col;
        ctx.beginPath();
        ctx.moveTo(scrX, baseY);
        ctx.lineTo(scrX + 6, baseY - 3);
        ctx.lineTo(scrX + 6, baseY + 3);
        ctx.closePath(); ctx.fill();
      }
    });

    // ── Math Channel ──
    const mathOp = P('math_op', 'off');
    const tS = buf && buf.t && buf.t.length > 0 ? buf.t : null;
    if (mathOp !== 'off' && buf && buf.ch1 && buf.ch1.length > 1 && tS) {
      const ch1Samples = buf.ch1;
      const ch2Samples = buf.ch2 || [];
      const mathPts = [];
      const pf1 = P('ch1_probe', 1);
      const pf2 = P('ch2_probe', 1);
      const vdiv = P('ch1_vdiv', 1);
      const pos = 0;
      for (let px = 0; px < scrW; px++) {
        const target = t - totalTime * (1 - px / scrW);
        const idx = _dsoBinSearch(tS, target);
        const v1 = (ch1Samples[idx] || 0) * pf1;
        const v2 = (ch2Samples[idx] || 0) * pf2;
        let vm = 0;
        if (mathOp === 'add') vm = v1 + v2;
        else if (mathOp === 'sub') vm = v1 - v2;
        else if (mathOp === 'abs') vm = Math.abs(v1 - v2);
        else if (mathOp === 'mul') vm = v1 * v2;
        mathPts.push({ px: scrX + px, py: cy - (vm * (dH / vdiv)) - (pos * dH) });
      }
        // Math trace (magenta)
        ctx.strokeStyle = '#ff00ff';
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        mathPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
        ctx.stroke();
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        mathPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    // ── Spectrum Analyzer Mode ──
    if (P('dsoMode', 'scope') === 'spectrum' && typeof DSP !== 'undefined') {
      const specChannels = channels.filter(c => c.en);
      specChannels.forEach((ch) => {
        const samples = buf && buf[ch.id] && buf[ch.id].length > 0 ? buf[ch.id] : null;
        const tS = buf && buf.t && buf.t.length > 0 ? buf.t : null;
        if (!samples || samples.length < 64 || !tS || tS.length < 2) return;

        const totalTimeBuf = tS[tS.length - 1] - tS[0];
        const sampleRate = totalTimeBuf > 0 ? samples.length / totalTimeBuf : 0;
        if (sampleRate <= 0) return;

        const fftResult = DSP.computeFFT(samples, sampleRate);
        const mag = fftResult.magnitude;
        const fAxis = fftResult.freqAxis;
        const maxFreq = sampleRate / 2;
        const dbMin = -80, dbMax = 10;

        ctx.strokeStyle = ch.col;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 3;
        ctx.shadowColor = ch.col;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        for (let px = 0; px < scrW; px++) {
          const freq = (px / scrW) * maxFreq;
          let binIdx = 0;
          for (let k = 0; k < fAxis.length; k++) { if (fAxis[k] >= freq) { binIdx = k; break; } }
          const db = Math.max(dbMin, Math.min(dbMax, mag[binIdx]));
          const py = scrY + scrH - ((db - dbMin) / (dbMax - dbMin)) * scrH;
          if (px === 0) ctx.moveTo(scrX + px, py); else ctx.lineTo(scrX + px, py);
        }
        ctx.stroke();
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        for (let px = 0; px < scrW; px++) {
          const freq = (px / scrW) * maxFreq;
          let binIdx = 0;
          for (let k = 0; k < fAxis.length; k++) { if (fAxis[k] >= freq) { binIdx = k; break; } }
          const db = Math.max(dbMin, Math.min(dbMax, mag[binIdx]));
          const py = scrY + scrH - ((db - dbMin) / (dbMax - dbMin)) * scrH;
          if (px === 0) ctx.moveTo(scrX + px, py); else ctx.lineTo(scrX + px, py);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });
    }

    // ── XY Mode ──
    if (P('dsoMode', 'scope') === 'xy' && buf && buf.ch1 && buf.ch2 && buf.ch1.length > 1) {
      const ch1Samples = buf.ch1;
      const ch2Samples = buf.ch2;
      const len = Math.min(ch1Samples.length, ch2Samples.length);
      const pf1 = P('ch1_probe', 1);
      const pf2 = P('ch2_probe', 1);

      let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
      for (let i = 0; i < len; i++) {
        const vx = ch1Samples[i] * pf1;
        const vy = ch2Samples[i] * pf2;
        if (vx < xmin) xmin = vx; if (vx > xmax) xmax = vx;
        if (vy < ymin) ymin = vy; if (vy > ymax) ymax = vy;
      }
      const xRange = Math.max(Math.abs(xmin), Math.abs(xmax), 0.1);
      const yRange = Math.max(Math.abs(ymin), Math.abs(ymax), 0.1);

      ctx.strokeStyle = '#ffe600';
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const px = cx + (ch1Samples[i] * pf1 / xRange) * (scrW / 2) * 0.8;
        const py = cy - (ch2Samples[i] * pf2 / yRange) * (scrH / 2) * 0.8;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 3;
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const px = cx + (ch1Samples[i] * pf1 / xRange) * (scrW / 2) * 0.8;
        const py = cy - (ch2Samples[i] * pf2 / yRange) * (scrH / 2) * 0.8;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // ── Trigger Level Line ──
    const trigV = P('trig_level', 0);
    const trigCh = channels.find(c => c.id === (P('trig_source', 'ch1')));
    if (trigCh && P('dsoMode', 'scope') === 'scope') {
      const trigY = cy - (trigV * (dH / trigCh.vdiv)) - (trigCh.pos * dH);
      if (trigY >= scrY && trigY <= scrY + scrH) {
        ctx.strokeStyle = 'rgba(255, 170, 0, 0.5)';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(scrX, trigY); ctx.lineTo(scrX + scrW, trigY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(scrX + scrW, trigY);
        ctx.lineTo(scrX + scrW - 6, trigY - 3);
        ctx.lineTo(scrX + scrW - 6, trigY + 3);
        ctx.closePath(); ctx.fill();
      }
    }

    // Scan line effect
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let sy = scrY; sy < scrY + scrH; sy += 2) {
      ctx.fillRect(scrX, sy, scrW, 1);
    }
    } else {
      ctx.fillStyle = '#111418';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('\u2014 STANDBY \u2014', scrX + scrW / 2, scrY + scrH / 2 + 4);
    }

    ctx.restore(); // End screen clip

    // ── Top OSD Bar ──
    const osdY = scrY + 4;
    ctx.fillStyle = 'rgba(2, 4, 8, 0.75)';
    _rr(ctx, scrX + 2, osdY, scrW - 4, 14, 2); ctx.fill();

    const _osd = (ox, txt, col, en) => {
      ctx.fillStyle = en ? col : '#303848';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(txt, ox, osdY + 10);
    };
    _osd(scrX + 8, '1:' + _fmtV(P('ch1_vdiv', 1)) + (P('ch1_coupling', 'dc') === 'ac' ? '~' : '='), '#ffe600', _dsoBool(P('ch1_en', true)));
    _osd(scrX + 72, '2:' + _fmtV(P('ch2_vdiv', 2)) + (P('ch2_coupling', 'dc') === 'ac' ? '~' : '='), '#00e5ff', _dsoBool(P('ch2_en', true)));

    // Timebase on right
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'right';
    const modeLabel = P('dsoMode', 'scope') === 'spectrum' ? ' | FFT' : P('dsoMode', 'scope') === 'xy' ? ' | XY' : '';
    ctx.fillText(_fmtT(P('timebase', 0.001)) + '/div' + modeLabel, scrX + scrW - 8, osdY + 10);

    // Math channel label
    if (P('math_op', 'off') !== 'off') {
      ctx.fillStyle = '#ff00ff';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'left';
      const mathOp = P('math_op', 'off');
      const mathLabel = mathOp === 'add' ? 'M:CH1+CH2' : mathOp === 'sub' ? 'M:CH1-CH2' : mathOp === 'mul' ? 'M:CH1*CH2' : 'M:|CH1-CH2|';
      ctx.fillText(mathLabel, scrX + 8, osdY + 22);
    }

    // Paused overlay
    const isPaused = _dsoBool(P('paused', false));
    if (isPaused) {
      ctx.fillStyle = 'rgba(255, 170, 0, 0.12)';
      ctx.fillRect(scrX, scrY, scrW, scrH);
      ctx.fillStyle = '#ffaa00';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('\u23F8 PAUSED', scrX + scrW / 2, scrY + scrH / 2 + 4);
    }

    // ── Bottom OSD Bar ──
    const osdBotY = scrY + scrH - 16;
    ctx.fillStyle = 'rgba(2, 4, 8, 0.75)';
    _rr(ctx, scrX + 2, osdBotY, scrW - 4, 14, 2); ctx.fill();

    ctx.fillStyle = '#ffaa00';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    const trigSrc = (P('trig_source', 'ch1')).toUpperCase();
    const trigSlope = P('trig_slope', 'rising') === 'falling' ? '\\' : '/';
    ctx.fillText('T:' + trigSrc + ' ' + trigSlope + ' ' + _fmtV(P('trig_level', 0)), scrX + 8, osdBotY + 10);

    ctx.fillStyle = '#7a889b';
    ctx.textAlign = 'right';
    ctx.fillText(P('trig_mode', 'auto') === 'norm' ? 'NORM' : P('trig_mode', 'auto') === 'single' ? 'SINGLE' : 'AUTO', scrX + scrW - 8, osdBotY + 10);

    // Sample rate
    if (buf && buf.t && buf.t.length > 1) {
      const totalTimeBuf = buf.t[buf.t.length - 1] - buf.t[0];
      const sampleRate = totalTimeBuf > 0 ? buf.t.length / totalTimeBuf : 0;
      if (sampleRate > 0) {
        ctx.fillStyle = '#4a5264';
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(_fmtRate(sampleRate), scrX + scrW / 2, osdBotY + 10);
      }
    }

    // ── Measurement Display (below screen) ──
    const measY = scrY + scrH + 4;
    const meas = inst._computeMeas || {};
    const measCh = channels.find(c => c.en) || channels[0];
    const m = meas[measCh.id];
    if (m && isPowered) {
      const mode = P('dsoMode', 'scope');
      ctx.fillStyle = 'rgba(2, 4, 8, 0.6)';
      _rr(ctx, scrX, measY, scrW, mode === 'spectrum' ? 28 : 16, 2); ctx.fill();
      ctx.font = '6.5px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = measCh.col;
      const freqStr = m.frequency > 0 ? ' f=' + _fmtFreq(m.frequency) : '';
      const vppStr = ' Vpp=' + _fmtV(m.vpp);
      const vrmsStr = ' Vrms=' + _fmtV(m.vrms);
      const dutyStr = m.dutyCycle > 0 ? ' D=' + m.dutyCycle.toFixed(1) + '%' : '';
      ctx.fillText(vppStr + vrmsStr + freqStr + dutyStr, scrX + 4, measY + 11);
      if (mode === 'spectrum') {
        ctx.fillStyle = '#ff00ff';
        ctx.fillText('FFT: ' + measCh.id.toUpperCase() + '  |  Hann Window  |  Radix-2', scrX + 4, measY + 23);
      }
    }

    // ── Right Panel Controls ──
    const panX = 306;

    ctx.fillStyle = isPowered ? '#1a1d24' : '#13151a';
    _rr(ctx, panX - 4, 32, W - panX + 4, scrH + 20, 6); ctx.fill();
    ctx.strokeStyle = '#2a2e38'; ctx.lineWidth = 0.8; ctx.stroke();

    ctx.fillStyle = isPowered ? '#4a5264' : '#2a2e38';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CONTROLS', panX + 52, 42);

    // Store button rects for hit testing
    if (!inst._btnRects) inst._btnRects = {};

    // ── Rotary Knobs ──
    const _knob = (kx, ky, r, label, col) => {
      const kg = ctx.createRadialGradient(kx - 1.5, ky - 1.5, 0.5, kx, ky, r);
      kg.addColorStop(0, '#4a5060'); kg.addColorStop(0.6, '#282d38'); kg.addColorStop(1, '#14171e');
      ctx.fillStyle = kg;
      ctx.beginPath(); ctx.arc(kx, ky, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0a0c10'; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.strokeStyle = '#3a3f4a'; ctx.lineWidth = 0.4;
      for (let a = 0; a < Math.PI * 2; a += 0.3) {
        ctx.beginPath();
        ctx.moveTo(kx + Math.cos(a) * (r - 2), ky + Math.sin(a) * (r - 2));
        ctx.lineTo(kx + Math.cos(a) * (r - 0.5), ky + Math.sin(a) * (r - 0.5));
        ctx.stroke();
      }

      ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(kx, ky - r + 3);
      ctx.stroke();

      ctx.fillStyle = '#5a6070';
      ctx.beginPath(); ctx.arc(kx, ky, 2, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#6a7488';
      ctx.font = '5.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, kx, ky + r + 9);
    };

    _knob(panX + 20, 68, 16, 'SEC/DIV', isPowered ? '#a0b0c0' : '#3a4050');
    _knob(panX + 60, 68, 16, 'VOLTS/DIV', isPowered ? '#a0b0c0' : '#3a4050');
    _knob(panX + 40, 120, 13, 'TRIG LVL', isPowered ? '#ffaa00' : '#3a3a2a');

    // ── Channel Buttons ──
    const _chBtn = (bx, by, bw, lbl, col, active) => {
      const cbg = ctx.createLinearGradient(bx, by, bx, by + 14);
      cbg.addColorStop(0, active ? col : '#222830');
      cbg.addColorStop(1, active ? _darken(col, 0.3) : '#181c22');
      ctx.fillStyle = cbg;
      _rr(ctx, bx, by, bw, 14, 3); ctx.fill();
      ctx.strokeStyle = active ? '#0a0c10' : '#1a1e28'; ctx.lineWidth = 1; ctx.stroke();

      ctx.fillStyle = active ? col : '#2a3040';
      ctx.beginPath(); ctx.arc(bx + bw / 2, by - 3, 2, 0, Math.PI * 2); ctx.fill();
      if (active) { ctx.shadowColor = col; ctx.shadowBlur = 3; ctx.beginPath(); ctx.arc(bx + bw / 2, by - 3, 2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }

      ctx.fillStyle = active ? '#000000' : '#6a7488';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, bx + bw / 2, by + 10);
    };

    const btnY = 136;
    const chBtnW = 21;
    const chBtnGap = 1;
    _chBtn(panX + 4,              btnY, chBtnW, 'CH1', '#ffe600', isPowered && _dsoBool(P('ch1_en', true)));
    _chBtn(panX + 4 + chBtnW + chBtnGap, btnY, chBtnW, 'CH2', '#00e5ff', isPowered && _dsoBool(P('ch2_en', true)));

    inst._btnRects.ch1 = { x: panX + 4,              y: btnY, w: chBtnW, h: 14, field: 'ch1_en' };
    inst._btnRects.ch2 = { x: panX + 4 + chBtnW + chBtnGap, y: btnY, w: chBtnW, h: 14, field: 'ch2_en' };

    // ── Small Control Button Helper ──
    const _ctrlBtn = (bx, by, bw, bh, lbl, col, active) => {
      const bg = ctx.createLinearGradient(bx, by, bx, by + bh);
      if (active) { bg.addColorStop(0, col); bg.addColorStop(1, _darken(col, 0.3)); }
      else { bg.addColorStop(0, '#222830'); bg.addColorStop(1, '#181c22'); }
      ctx.fillStyle = bg;
      _rr(ctx, bx, by, bw, bh, 3); ctx.fill();
      ctx.strokeStyle = active ? '#0a0c10' : '#1a1e28'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = active ? '#ffffff' : '#6a7488';
      ctx.font = 'bold 5.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, bx + bw / 2, by + bh / 2 + 2);
    };

    // ── Trigger Source + Slope ──
    const trigSrcY = btnY + 16;
    const trigBtnW = 44;
    const trigSrcBtn = P('trig_source', 'ch1').toUpperCase();
    _ctrlBtn(panX + 4, trigSrcY, trigBtnW, 12, 'TRG:' + trigSrcBtn, '#ffaa00', isPowered);
    inst._btnRects.trigSrc = { x: panX + 4, y: trigSrcY, w: trigBtnW, h: 12, field: 'trig_source' };

    const trigSlopeBtn = P('trig_slope', 'rising');
    const slopeLabel = trigSlopeBtn === 'rising' ? '/ RISE' : '\\ FALL';
    _ctrlBtn(panX + 52, trigSrcY, trigBtnW, 12, slopeLabel, '#ffaa00', isPowered);
    inst._btnRects.trigSlope = { x: panX + 52, y: trigSrcY, w: trigBtnW, h: 12, field: 'trig_slope' };

    // ── Run/Stop + Single ──
    const rsY = trigSrcY + 14;
    const rsW = 42;
    const rsBg = ctx.createLinearGradient(panX + 4, rsY, panX + 4, rsY + 14);
    if (isRunning) { rsBg.addColorStop(0, '#1a3520'); rsBg.addColorStop(1, '#0e2210'); }
    else { rsBg.addColorStop(0, '#351a1a'); rsBg.addColorStop(1, '#220e0e'); }
    ctx.fillStyle = rsBg;
    _rr(ctx, panX + 4, rsY, rsW, 14, 3); ctx.fill();
    ctx.strokeStyle = '#0a0c10'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = isRunning ? '#00ff66' : '#ff3366';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isRunning ? 'RUN' : 'STOP', panX + 4 + rsW / 2, rsY + 10);
    inst._btnRects.runStop = { x: panX + 4, y: rsY, w: rsW, h: 14, field: 'runStop' };

    const sglBg = ctx.createLinearGradient(panX + 52, rsY, panX + 52, rsY + 14);
    if (isSingleArmed) { sglBg.addColorStop(0, '#35351a'); sglBg.addColorStop(1, '#22220e'); }
    else { sglBg.addColorStop(0, '#222830'); sglBg.addColorStop(1, '#181c22'); }
    ctx.fillStyle = sglBg;
    _rr(ctx, panX + 52, rsY, rsW, 14, 3); ctx.fill();
    ctx.strokeStyle = '#0a0c10'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = isSingleArmed ? '#ffaa00' : '#6a7488';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SINGLE', panX + 52 + rsW / 2, rsY + 10);
    inst._btnRects.single = { x: panX + 52, y: rsY, w: rsW, h: 14, field: 'singleTrigger' };

    // Pause button
    const pauBg = ctx.createLinearGradient(panX + 100, rsY, panX + 100, rsY + 14);
    if (isPaused) { pauBg.addColorStop(0, '#352515'); pauBg.addColorStop(1, '#221a0e'); }
    else { pauBg.addColorStop(0, '#222830'); pauBg.addColorStop(1, '#181c22'); }
    ctx.fillStyle = pauBg;
    _rr(ctx, panX + 100, rsY, 30, 14, 3); ctx.fill();
    ctx.strokeStyle = '#0a0c10'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = isPaused ? '#ffaa00' : '#6a7488';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOLD', panX + 115, rsY + 10);
    inst._btnRects.pause = { x: panX + 100, y: rsY, w: 30, h: 14, field: 'paused' };

    // ── Auto Set + Fullscreen ──
    const autoY = rsY + 15;
    const autoBg = ctx.createLinearGradient(panX + 4, autoY, panX + 4, autoY + 14);
    autoBg.addColorStop(0, '#1a2550');
    autoBg.addColorStop(1, '#0e1a30');
    ctx.fillStyle = autoBg;
    _rr(ctx, panX + 4, autoY, rsW, 14, 3); ctx.fill();
    ctx.strokeStyle = isPowered ? '#3070a0' : '#2a2e38'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = isPowered ? '#40a0ff' : '#4a5264';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AUTO', panX + 4 + rsW / 2, autoY + 10);
    inst._btnRects.autoSet = { x: panX + 4, y: autoY, w: rsW, h: 14, field: 'autoSet' };

    ctx.fillStyle = isPowered ? '#1a2550' : '#181c22';
    _rr(ctx, panX + 52, autoY, rsW, 14, 3); ctx.fill();
    ctx.strokeStyle = isPowered ? '#00979c' : '#2a2e38'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = isPowered ? '#00d4e6' : '#4a5264';
    ctx.font = 'bold 5.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('\u26F6 FULL', panX + 52 + rsW / 2, autoY + 10);
    inst._btnRects.fullscreen = { x: panX + 52, y: autoY, w: rsW, h: 14, field: '_fullscreen' };

    // ── Display Mode + Math ──
    const modeY = autoY + 15;
    const modeW = 44;
    const dsoMode = P('dsoMode', 'scope');
    const modeLabels = { scope: 'SCOPE', spectrum: 'SPECTRUM', xy: 'XY' };
    const modeColors = { scope: '#00d4e6', spectrum: '#ff00ff', xy: '#ffe600' };
    _ctrlBtn(panX + 4, modeY, modeW, 12, modeLabels[dsoMode] || 'SCOPE', modeColors[dsoMode] || '#00d4e6', isPowered);
    inst._btnRects.dsoMode = { x: panX + 4, y: modeY, w: modeW, h: 12, field: 'dsoMode' };

    const mathOp = P('math_op', 'off');
    const mathLabels = { off: 'MATH:OFF', add: 'CH1+CH2', sub: 'CH1-CH2', mul: 'CH1*CH2', abs: '|CH1-CH2|' };
    _ctrlBtn(panX + 52, modeY, modeW, 12, mathLabels[mathOp] || 'MATH', mathOp !== 'off' ? '#ff00ff' : '#4a5264', isPowered && mathOp !== 'off');
    inst._btnRects.mathOp = { x: panX + 52, y: modeY, w: modeW, h: 12, field: 'math_op' };

    // ── Coupling Buttons (CH1 & CH2) ──
    const coupY = modeY + 14;
    const ch1Coup = P('ch1_coupling', 'dc').toUpperCase();
    _ctrlBtn(panX + 4, coupY, modeW, 12, 'CH1:' + ch1Coup, '#ffe600', isPowered && _dsoBool(P('ch1_en', true)));
    inst._btnRects.ch1Coupling = { x: panX + 4, y: coupY, w: modeW, h: 12, field: 'ch1_coupling' };

    const ch2Coup = P('ch2_coupling', 'dc').toUpperCase();
    _ctrlBtn(panX + 52, coupY, modeW, 12, 'CH2:' + ch2Coup, '#00e5ff', isPowered && _dsoBool(P('ch2_en', true)));
    inst._btnRects.ch2Coupling = { x: panX + 52, y: coupY, w: modeW, h: 12, field: 'ch2_coupling' };

    // ── Power toggle switch ──
    function drawToggleSwitch(tx, ty, tw, th, isOn, label) {
      ctx.fillStyle = '#0e1114';
      roundRect(ctx, tx, ty, tw, th, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,90,100,0.4)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      const trackW = tw * 0.7;
      const trackH = 8;
      const trackX = tx + (tw - trackW) / 2;
      const trackY = ty + th / 2 - 2;
      ctx.fillStyle = '#080a0c';
      roundRect(ctx, trackX, trackY, trackW, trackH, trackH / 2);
      ctx.fill();

      if (isOn) {
        const grad = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0);
        grad.addColorStop(0, 'rgba(0,230,118,0.2)');
        grad.addColorStop(1, 'rgba(0,230,118,0.65)');
        ctx.fillStyle = grad;
        roundRect(ctx, trackX, trackY, trackW, trackH, trackH / 2);
        ctx.fill();
      }

      const thumbR = 5;
      const thumbX = isOn ? trackX + trackW - thumbR - 1 : trackX + thumbR + 1;
      const thumbY = trackY + trackH / 2;
      if (isFinite(thumbX) && isFinite(thumbY)) {
        const thumbGrad = ctx.createRadialGradient(thumbX - 1, thumbY - 1, 0.5, thumbX, thumbY, thumbR);
        thumbGrad.addColorStop(0, isOn ? '#c8e6c9' : '#b0bec5');
        thumbGrad.addColorStop(1, isOn ? '#2e7d32' : '#546e7a');
        ctx.fillStyle = thumbGrad;
        ctx.beginPath();
        ctx.arc(thumbX, thumbY, thumbR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      const ledX = tx + tw / 2;
      const ledY = ty + 5;
      ctx.fillStyle = isOn ? '#00e676' : '#1b3a24';
      ctx.beginPath(); ctx.arc(ledX, ledY, 2, 0, Math.PI * 2); ctx.fill();
      if (isOn) {
        ctx.fillStyle = 'rgba(0,230,118,0.3)';
        ctx.beginPath(); ctx.arc(ledX, ledY, 4.5, 0, Math.PI * 2); ctx.fill();
      }

      ctx.fillStyle = isOn ? '#eceff1' : '#78909c';
      ctx.font = 'bold 5.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, tx + tw / 2, ty + th - 3);
    }

    drawToggleSwitch(388, 38, 26, 42, isPowered, 'POWER');

    // ── BNC Connectors ──
    const _bnc = (bx, by, lbl, col) => {
      ctx.fillStyle = '#2a2e38';
      ctx.beginPath(); ctx.arc(bx, by, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a4050';
      ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
      const mg = ctx.createLinearGradient(bx - 7, by - 7, bx + 7, by + 7);
      mg.addColorStop(0, '#c8d0da'); mg.addColorStop(0.4, '#8090a0');
      mg.addColorStop(0.6, '#606878'); mg.addColorStop(1, '#3a4050');
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0c0e12';
      ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(bx, by, 10.5, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, bx, by + 18);
    };

    const bncY = 248;
    if (isPowered) {
      _bnc(50,  bncY, 'CH1', '#ffe600');
      _bnc(120, bncY, 'CH2', '#00e5ff');
      _bnc(350, bncY, 'GND', '#7a889b');
    } else {
      _bnc(50,  bncY, 'CH1', '#3a4050');
      _bnc(120, bncY, 'CH2', '#3a4050');
      _bnc(350, bncY, 'GND', '#3a4050');
    }

    // ── Bottom Edge Label ──
    ctx.fillStyle = '#2a2e38';
    ctx.fillRect(10, H - 38, W - 20, 1);
    ctx.fillStyle = isPowered ? '#3a4050' : '#22262f';
    ctx.font = '5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('2-CH DSO  |  100MHz  |  1 MSa/s  |  FFT  |  XY', W / 2, H - 28);

    // ── Selection ──
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -4, -4, W + 8, H + 8);
    }

    ctx.restore();
  }
});

/* ── Measurement Engine ── */
function dsoComputeMeasurements(samples, measurementTime) {
  if (!samples || samples.length < 2) return { vmax: 0, vmin: 0, vpp: 0, vrms: 0, mean: 0, frequency: 0, period: 0, dutyCycle: 0 };
  let vmax = -Infinity, vmin = Infinity, sum = 0, sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    if (v > vmax) vmax = v;
    if (v < vmin) vmin = v;
    sum += v;
    sumSq += v * v;
  }
  if (!isFinite(vmax)) vmax = 0;
  if (!isFinite(vmin)) vmin = 0;
  const vpp = vmax - vmin;
  const mean = samples.length > 0 ? sum / samples.length : 0;
  const vrms = samples.length > 0 ? Math.sqrt(sumSq / samples.length) : 0;

  // Frequency from zero crossings
  const risingCrossings = [];
  for (let i = 1; i < samples.length; i++) {
    if (samples[i - 1] < 0 && samples[i] >= 0) risingCrossings.push(i);
  }
  let frequency = 0;
  if (risingCrossings.length > 1 && measurementTime > 0) {
    const sampleRate = (samples.length - 1) / measurementTime;
    const averagePeriodSamples = (risingCrossings[risingCrossings.length - 1] - risingCrossings[0]) / (risingCrossings.length - 1);
    frequency = averagePeriodSamples > 0 ? sampleRate / averagePeriodSamples : 0;
  }
  const period = frequency > 0 ? 1 / frequency : 0;

  // Duty cycle
  let highCount = 0;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i] > 0) highCount++;
  }
  const dutyCycle = samples.length > 0 ? (highCount / samples.length) * 100 : 0;

  return { vmax, vmin, vpp, vrms, mean, frequency, period, dutyCycle };
}

/* ── Auto-Set Engine ── */
function _dsoAutoSet(inst, rs, buf, P) {
  const chIds = ['ch1', 'ch2', 'ch3', 'ch4'];
  for (const chId of chIds) {
    if (!P(rs, inst.props, chId + '_en', chId === 'ch1' || chId === 'ch2')) continue;
    const samples = buf && buf[chId] && buf[chId].length > 10 ? buf[chId] : null;
    if (!samples) continue;

    let vmin = Infinity, vmax = -Infinity;
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] < vmin) vmin = samples[i];
      if (samples[i] > vmax) vmax = samples[i];
    }
    if (!isFinite(vmin) || !isFinite(vmax)) continue;

    const vpp = vmax - vmin;
    const vCenter = (vmax + vmin) / 2;

    const targetVdiv = vpp / 6;
    const vdivSteps = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
    let autoVdiv = vdivSteps[0];
    for (const s of vdivSteps) { if (s >= targetVdiv) { autoVdiv = s; break; } }
    rs[chId + '_vdiv'] = autoVdiv;
    inst.props[chId + '_vdiv'] = autoVdiv;

    const autoPos = -(vCenter / autoVdiv) * 4;
    rs[chId + '_pos'] = Math.max(-4, Math.min(4, autoPos));
    inst.props[chId + '_pos'] = rs[chId + '_pos'];

    rs.trig_level = vCenter;
    inst.props.trig_level = vCenter;
    rs.trig_source = chId;
    inst.props.trig_source = chId;

    const trigCh = chId;
    const risingCrossings = [];
    for (let i = 1; i < samples.length; i++) {
      if (samples[i - 1] < 0 && samples[i] >= 0) risingCrossings.push(i);
    }
    const totalT = buf.t && buf.t.length > 1 ? buf.t[buf.t.length - 1] - buf.t[0] : 1;
    const sampleRate = totalT > 0 ? (samples.length - 1) / totalT : 0;
    const periodSamples = risingCrossings.length > 1
      ? (risingCrossings[risingCrossings.length - 1] - risingCrossings[0]) / (risingCrossings.length - 1)
      : 0;
    const freq = periodSamples > 0 ? sampleRate / periodSamples : 0;
    if (freq > 0) {
      const period = 1 / freq;
      const targetTimebase = (period * 3) / 12;
      const timebaseSteps = [0.00001, 0.00002, 0.00005, 0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1];
      let autoTimebase = timebaseSteps[0];
      for (const s of timebaseSteps) { if (s >= targetTimebase) { autoTimebase = s; break; } }
      rs.timebase = autoTimebase;
      inst.props.timebase = autoTimebase;
    }
    break;
  }
}

/* ── Probe Finder ── */
function _dsoFindProbe(probeType) {
  const canvas = window.CircuitCanvas;
  if (!canvas) return null;
  const comps = canvas.components || [];
  for (let i = 0; i < comps.length; i++) {
    if (comps[i].type === probeType) return comps[i];
  }
  return null;
}

/* ── Helpers ── */
function _darken(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - amt))},${Math.round(g * (1 - amt))},${Math.round(b * (1 - amt))})`;
}

function _fmtT(s) {
  if (s >= 1) return s.toFixed(1) + 's';
  if (s >= 1e-3) return (s * 1e3).toFixed(0) + 'ms';
  if (s >= 1e-6) return (s * 1e6).toFixed(0) + 'us';
  return (s * 1e9).toFixed(0) + 'ns';
}

function _fmtV(v) {
  if (Math.abs(v) >= 1) return v.toFixed(v % 1 === 0 ? 0 : 1) + 'V';
  return (v * 1000).toFixed(0) + 'mV';
}

function _fmtFreq(f) {
  if (f >= 1e6) return (f / 1e6).toFixed(2) + 'MHz';
  if (f >= 1e3) return (f / 1e3).toFixed(2) + 'kHz';
  return f.toFixed(1) + 'Hz';
}

function _fmtRate(r) {
  if (r >= 1e9) return (r / 1e9).toFixed(1) + 'GSa/s';
  if (r >= 1e6) return (r / 1e6).toFixed(1) + 'MSa/s';
  if (r >= 1e3) return (r / 1e3).toFixed(1) + 'KSa/s';
  return r.toFixed(0) + 'Sa/s';
}
