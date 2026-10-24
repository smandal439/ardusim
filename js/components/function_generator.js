'use strict';

/* Read a numeric generator setting, coerced, finite and clamped to its
   declared range. Raw Number(...) conversions let "Infinity" or a hand-typed
   1e999 through, which reaches the waveform math as Infinity and turns the
   sample into NaN — an invalid voltage on the output pin. */
function _fgNum(v, def, min, max) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}

function _fgBool(value) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['', '0', 'false', 'off', 'no'].includes(normalized)) return false;
    if (['1', 'true', 'on', 'yes'].includes(normalized)) return true;
  }
  return Boolean(value);
}

defComp({
  id: 'func_gen',
  name: 'Function Generator',
  category: 'Instruments',
  icon: '〜',
  desc: 'Dual channel DDS function generator — sine, square, triangle, sawtooth, and noise waveforms with phase & duty cycle control',

  width: 300,
  height: 190,

  defaultProps: {
    powered: 1,
    ch1_wave: 'sine',  ch1_freq: 440,  ch1_amp: 5.0,  ch1_offset: 0,  ch1_phase: 0,   ch1_duty: 50,
    ch2_wave: 'square', ch2_freq: 880, ch2_amp: 3.0, ch2_offset: 0, ch2_phase: 90,  ch2_duty: 50,
  },

  interactive: [
    { field: 'powered', label: 'Power', type: 'toggle', min: 0, max: 1, step: 1, unit: '', inline: { x: 265, y: 28, w: 26, h: 42 } },
    { field: 'ch1_wave', label: 'CH1 Wave', type: 'select', options: [
      { value: 'sine',     label: 'Sine' },
      { value: 'square',   label: 'Square' },
      { value: 'triangle', label: 'Triangle' },
      { value: 'sawtooth', label: 'Sawtooth' },
      { value: 'noise',    label: 'Noise' },
    ]},
    { field: 'ch2_wave', label: 'CH2 Wave', type: 'select', options: [
      { value: 'sine',     label: 'Sine' },
      { value: 'square',   label: 'Square' },
      { value: 'triangle', label: 'Triangle' },
      { value: 'sawtooth', label: 'Sawtooth' },
      { value: 'noise',    label: 'Noise' },
    ]},
    // Limits follow the guide's documented ranges. Frequency is a log-scale
    // quantity, so it stays a bounded number field in the properties panel (a
    // linear 0 Hz … 10 MHz slider would be unusable) while the component keeps
    // its on-canvas +/- buttons for coarse stepping. It deliberately has no
    // `step`: the bundled examples run at 0.5 Hz and snapping would round them.
    { field: 'ch1_freq',   label: 'CH1 Freq',   type: 'number', min: 0, max: 10000000, unit: 'Hz' },
    { field: 'ch2_freq',   label: 'CH2 Freq',   type: 'number', min: 0, max: 10000000, unit: 'Hz' },
    { field: 'ch1_amp',    label: 'CH1 Amp',    min: 0,   max: 10,  step: 0.1, unit: 'Vpp' },
    { field: 'ch1_offset', label: 'CH1 Offset', min: -5,  max: 5,   step: 0.1, unit: 'V' },
    { field: 'ch1_phase',  label: 'CH1 Phase',  min: 0,   max: 360, step: 1,   unit: '\u00b0' },
    { field: 'ch1_duty',   label: 'CH1 Duty',   min: 1,   max: 99,  step: 1,   unit: '%' },
    { field: 'ch2_amp',    label: 'CH2 Amp',    min: 0,   max: 10,  step: 0.1, unit: 'Vpp' },
    { field: 'ch2_offset', label: 'CH2 Offset', min: -5,  max: 5,   step: 0.1, unit: 'V' },
    { field: 'ch2_phase',  label: 'CH2 Phase',  min: 0,   max: 360, step: 1,   unit: '\u00b0' },
    { field: 'ch2_duty',   label: 'CH2 Duty',   min: 1,   max: 99,  step: 1,   unit: '%' },
  ],

  pins: [
    { id: 'ch1_out', label: 'CH1',  type: PIN_TYPE.SIGNAL, x: 80,  y: 190, side: 'bottom' },
    { id: 'ch1_gnd', label: 'GND1', type: PIN_TYPE.GND,   x: 110, y: 190, side: 'bottom' },
    { id: 'ch2_out', label: 'CH2',  type: PIN_TYPE.SIGNAL, x: 170, y: 190, side: 'bottom' },
    { id: 'ch2_gnd', label: 'GND2', type: PIN_TYPE.GND,   x: 200, y: 190, side: 'bottom' },
  ],

  step(inst, sim) {
    inst.runtimeState = inst.runtimeState || {};
    const rs = inst.runtimeState;
    const props = inst.props || {};
    // The on-canvas sliders write runtimeState only (CircuitCanvas._updateSliderValue),
    // while the properties panel writes both — so read through runtimeState first,
    // exactly as the DSO does. Otherwise dragging a slider would leave the pins
    // sitting on the stale prop and the control would appear dead.
    const P = (field, def) => (rs[field] !== undefined ? rs[field] : (props[field] ?? def));
    const rawT = sim && typeof sim.simTime === 'number' ? sim.simTime / 1000 : performance.now() / 1000;
    const t = Number.isFinite(rawT) ? rawT : 0;
    // "0", 0 and false all mean off — Boolean("0") would have left it running.
    const powered = _fgBool(P('powered', 1));
    const evaluate = (channel) => {
      if (!powered) return 0;
      const wave = P(`${channel}_wave`, 'sine') || 'sine';
      // Same ranges the properties panel and the on-canvas controls enforce,
      // so the voltage on the pins can never disagree with what the UI shows.
      const freq = _fgNum(P(`${channel}_freq`), 0, 0, 10000000);
      const amp = _fgNum(P(`${channel}_amp`), 0, 0, 10);
      const offset = _fgNum(P(`${channel}_offset`), 0, -5, 5);
      const phase = _fgNum(P(`${channel}_phase`), 0, 0, 360) / 360;
      const duty = _fgNum(P(`${channel}_duty`), 50, 1, 99) / 100;
      const tau = ((t * freq + phase) % 1 + 1) % 1;
      let normalized;
      switch (wave) {
        case 'square': normalized = tau < duty ? 1 : -1; break;
        case 'triangle': normalized = tau < duty ? -1 + 2 * tau / duty : 1 - 2 * (tau - duty) / (1 - duty); break;
        case 'sawtooth': normalized = 2 * tau - 1; break;
        case 'noise': normalized = Math.sin(t * freq * 137.5) * 0.7 + Math.sin(t * freq * 239.1) * 0.3; break;
        default: normalized = Math.sin(2 * Math.PI * tau); break;
      }
      const out = offset + normalized * amp / 2;
      // Last line of defence: never drive a pin with a non-finite voltage.
      return Number.isFinite(out) ? out : 0;
    };

    inst.runtimeState.ch1_voltage = evaluate('ch1');
    inst.runtimeState.ch2_voltage = evaluate('ch2');
    if (sim && typeof sim.setPinVoltage === 'function') {
      sim.setPinVoltage(inst, 'ch1_out', inst.runtimeState.ch1_voltage);
      sim.setPinVoltage(inst, 'ch1_gnd', 0);
      sim.setPinVoltage(inst, 'ch2_out', inst.runtimeState.ch2_voltage);
      sim.setPinVoltage(inst, 'ch2_gnd', 0);
    }
  },

  _btnRects: {},

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const props = inst.props || {};
    // Same read order as step(): the on-canvas sliders write runtimeState only,
    // so look there first or the drawn readout would lag behind the pins.
    const rs = inst.runtimeState || {};
    const P = (field, def) => (rs[field] !== undefined ? rs[field] : (props[field] ?? def));
    // Coerce and clamp with the *same* bounds step() uses, so the picture on
    // the front panel can never disagree with the waveform driven onto the pins.
    const num = (field, def, min, max) => _fgNum(P(field), def, min, max);
    const W = 300, H = 190;
    // Match step(): "0"/0/false all mean off, so the display can't disagree
    // with the waveform that is actually being driven onto the pins.
    const isPowered = _fgBool(P('powered', 1));

    ctx.save();
    ctx.translate(x, y);

    // Store button rects for hit testing
    if (!inst._btnRects) inst._btnRects = {};

    // ── Main body ──
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#2a2e38'); bg.addColorStop(0.5, '#22262f'); bg.addColorStop(1, '#181b22');
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, W, H - 25, 10);
    ctx.fill();
    ctx.strokeStyle = '#0c0e12';
    ctx.lineWidth = 3;
    ctx.stroke();

    // ── Top bar ──
    ctx.fillStyle = '#1a1d24';
    ctx.fillRect(8, 6, W - 16, 18);

    // Brand Logo
    ctx.fillStyle = isPowered ? '#00d4e6' : '#1a2a30';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DDS-8000', 14, 18);

    ctx.fillStyle = isPowered ? '#606878' : '#2a2e38';
    ctx.font = '7px sans-serif';
    ctx.fillText('DUAL-CHANNEL FUNCTION GENERATOR', 65, 18);

    // Power LED
    ctx.fillStyle = isPowered ? '#00e676' : '#1b3a24';
    ctx.beginPath(); ctx.arc(W - 55, 15, 2.5, 0, Math.PI * 2); ctx.fill();
    if (isPowered) {
      ctx.fillStyle = 'rgba(0,230,118,0.3)';
      ctx.beginPath(); ctx.arc(W - 55, 15, 5, 0, Math.PI * 2); ctx.fill();
    }

    // ── Scope screen ──
    const scrX = 10, scrY = 28, scrW = W - 20, scrH = 56;
    ctx.fillStyle = '#020406';
    roundRect(ctx, scrX - 2, scrY - 2, scrW + 4, scrH + 4, 4);
    ctx.fill();
    ctx.fillStyle = '#010204';
    roundRect(ctx, scrX, scrY, scrW, scrH, 3);
    ctx.fill();
    ctx.strokeStyle = '#2a3040';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (isPowered) {
      // Graticule
      ctx.strokeStyle = '#0c1420';
      ctx.lineWidth = 0.5;
      for (let gx = 1; gx < 10; gx++) {
        const gxPos = scrX + (scrW / 10) * gx;
        ctx.beginPath(); ctx.moveTo(gxPos, scrY); ctx.lineTo(gxPos, scrY + scrH); ctx.stroke();
      }
      for (let gy = 1; gy < 6; gy++) {
        const gyPos = scrY + (scrH / 6) * gy;
        ctx.beginPath(); ctx.moveTo(scrX, gyPos); ctx.lineTo(scrX + scrW, gyPos); ctx.stroke();
      }
      // Zero line
      ctx.strokeStyle = '#182838';
      ctx.lineWidth = 0.8;
      const zeroY = scrY + scrH / 2;
      ctx.beginPath(); ctx.moveTo(scrX, zeroY); ctx.lineTo(scrX + scrW, zeroY); ctx.stroke();

      // Draw waveform traces on screen
      const ch1Freq = num('ch1_freq', 440, 0, 10000000);
      const ch2Freq = num('ch2_freq', 880, 0, 10000000);
      const baseFreq = ch1Freq || ch2Freq || 100;
      const timeWindow = 2.5 / baseFreq;
      const dt = timeWindow / scrW;
      const vScale = (scrH / 2) / 6.0;

      const _sampleWave = (wave, t, freq, amp, offset, phaseDeg, duty) => {
        const phaseRad = (phaseDeg * Math.PI) / 180;
        const tau = ((t * freq + phaseRad / (2 * Math.PI)) % 1 + 1) % 1;
        const dutyFrac = duty / 100;
        let v = 0;
        switch (wave) {
          case 'sine':     v = Math.sin(2 * Math.PI * tau); break;
          case 'square':   v = tau < dutyFrac ? 1 : -1; break;
          case 'triangle': v = tau < dutyFrac ? -1 + 2 * (tau / dutyFrac) : 1 - 2 * ((tau - dutyFrac) / (1 - dutyFrac)); break;
          case 'sawtooth': v = 2 * tau - 1; break;
          case 'noise':    v = Math.sin(t * freq * 137.5) * 0.7 + Math.sin(t * freq * 239.1) * 0.3; break;
          default:         v = Math.sin(2 * Math.PI * tau); break;
        }
        return offset + v * (amp / 2);
      };

      // CH1 trace (cyan) with glow
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 4;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let px = 0; px < scrW; px++) {
        const t = px * dt;
        const v = _sampleWave(P('ch1_wave', 'sine'), t, ch1Freq, num('ch1_amp', 5, 0, 10), num('ch1_offset', 0, -5, 5), num('ch1_phase', 0, 0, 360), num('ch1_duty', 50, 1, 99));
        const py = zeroY - v * vScale;
        if (px === 0) ctx.moveTo(scrX + px, py); else ctx.lineTo(scrX + px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // CH2 trace (pink) with glow
      ctx.shadowColor = '#ff3366';
      ctx.shadowBlur = 4;
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let px = 0; px < scrW; px++) {
        const t = px * dt;
        const v = _sampleWave(P('ch2_wave', 'square'), t, ch2Freq, num('ch2_amp', 3, 0, 10), num('ch2_offset', 0, -5, 5), num('ch2_phase', 90, 0, 360), num('ch2_duty', 50, 1, 99));
        const py = zeroY - v * vScale;
        if (px === 0) ctx.moveTo(scrX + px, py); else ctx.lineTo(scrX + px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // OSD labels
      ctx.fillStyle = 'rgba(2, 4, 8, 0.75)';
      roundRect(ctx, scrX + 2, scrY + 2, 60, 12, 2);
      ctx.fill();
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('CH1: ' + _fmtFreq(ch1Freq), scrX + 5, scrY + 10);

      ctx.fillStyle = 'rgba(2, 4, 8, 0.75)';
      roundRect(ctx, scrX + 66, scrY + 2, 60, 12, 2);
      ctx.fill();
      ctx.fillStyle = '#ff3366';
      ctx.fillText('CH2: ' + _fmtFreq(ch2Freq), scrX + 69, scrY + 10);
    } else {
      ctx.fillStyle = '#111418';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('\u2014 STANDBY \u2014', scrX + scrW / 2, scrY + scrH / 2 + 4);
    }

    // ── Channel cards ──
    const cardY = 88, cardH = 88, cardGap = 8;
    const cardW = (scrW - cardGap) / 2;

    const _drawCard = (cx, cy, cw, ch, label, labelColor, wave, freq, amp, offset, phase, duty) => {
      // Card background
      ctx.fillStyle = isPowered ? '#181b22' : '#13151a';
      roundRect(ctx, cx, cy, cw, ch, 6);
      ctx.fill();
      // Color top border
      ctx.fillStyle = isPowered ? labelColor : '#22262f';
      roundRect(ctx, cx, cy, cw, 3, 6);
      ctx.fill();
      // Label
      ctx.fillStyle = isPowered ? labelColor : '#333945';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, cx + 8, cy + 16);
      // Wave type badge
      const waveLabels = { sine: 'SIN', square: 'SQR', triangle: 'TRI', sawtooth: 'SAW', noise: 'NOI' };
      ctx.fillStyle = isPowered ? '#2b303c' : '#1a1d22';
      const badgeW = 30;
      roundRect(ctx, cx + cw - badgeW - 8, cy + 6, badgeW, 14, 3);
      ctx.fill();
      ctx.fillStyle = isPowered ? labelColor : '#333945';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(waveLabels[wave] || 'SIN', cx + cw - badgeW / 2 - 8, cy + 16);

      // Parameters
      ctx.fillStyle = isPowered ? '#8c9ba5' : '#3a3f48';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      const lineH = 13;
      let py = cy + 30;
      ctx.fillText('Freq: ' + _fmtFreq(freq), cx + 8, py); py += lineH;
      ctx.fillText('Amp:  ' + amp.toFixed(1) + 'Vpp', cx + 8, py); py += lineH;
      ctx.fillText('Off:  ' + offset.toFixed(1) + 'V', cx + 8, py); py += lineH;
      ctx.fillText('Phs:  ' + phase + '\u00B0', cx + 8, py); py += lineH;
      ctx.fillText('Duty: ' + duty + '%', cx + 8, py);
    };

    const ch1Freq = num('ch1_freq', 440, 0, 10000000);
    const ch2Freq = num('ch2_freq', 880, 0, 10000000);

    _drawCard(scrX, cardY, cardW, cardH, 'CHANNEL 1', '#00e5ff',
      P('ch1_wave', 'sine'), ch1Freq, num('ch1_amp', 5, 0, 10), num('ch1_offset', 0, -5, 5), num('ch1_phase', 0, 0, 360), num('ch1_duty', 50, 1, 99));
    _drawCard(scrX + cardW + cardGap, cardY, cardW, cardH, 'CHANNEL 2', '#ff3366',
      P('ch2_wave', 'square'), ch2Freq, num('ch2_amp', 3, 0, 10), num('ch2_offset', 0, -5, 5), num('ch2_phase', 90, 0, 360), num('ch2_duty', 50, 1, 99));

    // ── Interactive Control Buttons ──
    const _ctrlBtn = (bx, by, bw, lbl, col, active) => {
      const bg = ctx.createLinearGradient(bx, by, bx, by + 14);
      if (active) { bg.addColorStop(0, col); bg.addColorStop(1, _darken(col, 0.3)); }
      else { bg.addColorStop(0, '#222830'); bg.addColorStop(1, '#181c22'); }
      ctx.fillStyle = bg;
      roundRect(ctx, bx, by, bw, 14, 3);
      ctx.fill();
      ctx.strokeStyle = active ? '#0a0c10' : '#1a1e28';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = active ? '#ffffff' : '#6a7488';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, bx + bw / 2, by + 10);
    };

    // CH1 Wave Selector
    const waveLabels = { sine: 'SIN', square: 'SQR', triangle: 'TRI', sawtooth: 'SAW', noise: 'NOI' };
    const waveOpts = ['sine', 'square', 'triangle', 'sawtooth', 'noise'];
    const ch1Wave = P('ch1_wave', 'sine') || 'sine';
    const freqBtnW = 28;
    _ctrlBtn(scrX, cardY + cardH + 6, cardW / 2 - freqBtnW - 4, waveLabels[ch1Wave] || 'SIN', '#00e5ff', isPowered);
    inst._btnRects.ch1Wave = { x: scrX, y: cardY + cardH + 6, w: cardW / 2 - freqBtnW - 4, h: 14, field: 'ch1_wave', options: waveOpts };

    // CH1 Freq +/- buttons
    _ctrlBtn(scrX + cardW / 2 - freqBtnW - 2, cardY + cardH + 6, freqBtnW / 2, '\u25B2', '#00e5ff', isPowered);
    inst._btnRects.ch1FreqUp = { x: scrX + cardW / 2 - freqBtnW - 2, y: cardY + cardH + 6, w: freqBtnW / 2, h: 14, field: 'ch1_freq_up' };
    _ctrlBtn(scrX + cardW / 2 - freqBtnW / 2 - 2, cardY + cardH + 6, freqBtnW / 2, '\u25BC', '#00e5ff', isPowered);
    inst._btnRects.ch1FreqDown = { x: scrX + cardW / 2 - freqBtnW / 2 - 2, y: cardY + cardH + 6, w: freqBtnW / 2, h: 14, field: 'ch1_freq_down' };

    // CH2 Wave Selector
    const ch2Wave = P('ch2_wave', 'square') || 'square';
    _ctrlBtn(scrX + cardW / 2 + 2, cardY + cardH + 6, cardW / 2 - freqBtnW - 4, waveLabels[ch2Wave] || 'SQR', '#ff3366', isPowered);
    inst._btnRects.ch2Wave = { x: scrX + cardW / 2 + 2, y: cardY + cardH + 6, w: cardW / 2 - freqBtnW - 4, h: 14, field: 'ch2_wave', options: waveOpts };

    // CH2 Freq +/- buttons
    _ctrlBtn(scrX + cardW - freqBtnW - 2, cardY + cardH + 6, freqBtnW / 2, '\u25B2', '#ff3366', isPowered);
    inst._btnRects.ch2FreqUp = { x: scrX + cardW - freqBtnW - 2, y: cardY + cardH + 6, w: freqBtnW / 2, h: 14, field: 'ch2_freq_up' };
    _ctrlBtn(scrX + cardW - freqBtnW / 2 - 2, cardY + cardH + 6, freqBtnW / 2, '\u25BC', '#ff3366', isPowered);
    inst._btnRects.ch2FreqDown = { x: scrX + cardW - freqBtnW / 2 - 2, y: cardY + cardH + 6, w: freqBtnW / 2, h: 14, field: 'ch2_freq_down' };

    // Power toggle switch
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

    drawToggleSwitch(265, 28, 26, 42, isPowered, 'POWER');

    // ── BNC Connectors ──
    const _bnc = (bx, by, lbl, col) => {
      ctx.fillStyle = '#2a2e38';
      ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a4050';
      ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
      const mg = ctx.createLinearGradient(bx - 5, by - 5, bx + 5, by + 5);
      mg.addColorStop(0, '#c8d0da'); mg.addColorStop(0.4, '#8090a0');
      mg.addColorStop(0.6, '#606878'); mg.addColorStop(1, '#3a4050');
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0c0e12';
      ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(bx, by, 8.5, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, bx, by + 16);
    };

    const bncY = H - 35;
    if (isPowered) {
      _bnc(50,  bncY, 'CH1', '#00e5ff');
      _bnc(110, bncY, 'GND1', '#7a889b');
      _bnc(190, bncY, 'CH2', '#ff3366');
      _bnc(250, bncY, 'GND2', '#7a889b');
    } else {
      _bnc(50,  bncY, 'CH1', '#3a4050');
      _bnc(110, bncY, 'GND1', '#3a4050');
      _bnc(190, bncY, 'CH2', '#3a4050');
      _bnc(250, bncY, 'GND2', '#3a4050');
    }

    // ── Selection highlight ──
    if (inst.selected) drawSelectionRect(ctx, -4, -4, W + 8, H + 4);

    ctx.restore();
  }
});

function _fmtFreq(hz) {
  if (hz >= 1e6) return (hz / 1e6).toFixed(2) + ' MHz';
  if (hz >= 1e3) return (hz / 1e3).toFixed(2) + ' kHz';
  return hz.toFixed(0) + ' Hz';
}

function _darken(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - amt))},${Math.round(g * (1 - amt))},${Math.round(b * (1 - amt))})`;
}

/////////////////////////////////////////////////////////////////////////////////////////////
// 'use strict';

// defComp({
//   id: 'func_gen',
//   name: 'Function Generator',
//   category: 'Instruments',
//   icon: '〜',
//   desc: 'Precision Dual-Channel DDS Function Generator with BNC outputs, independent phase/duty modulation, and dual-trace phosphor display',

//   width: 290,
//   height: 205,

//   defaultProps: {
//     ch1_en: true,   ch1_wave: 'sine',     ch1_freq: 1000, ch1_amp: 5.0,  ch1_offset: 0.0, ch1_phase: 0,   ch1_duty: 50,
//     ch2_en: true,   ch2_wave: 'square',   ch2_freq: 2000, ch2_amp: 3.3,  ch2_offset: 0.0, ch2_phase: 90,  ch2_duty: 50,
//     timebase_auto: true,
//   },

//   interactive: [
//     // Channel 1 Controls
//     { field: 'ch1_en',     label: 'CH1 Output', type: 'checkbox' },
//     { field: 'ch1_wave',   label: 'CH1 Wave',   type: 'select', options: [
//       { value: 'sine',      label: 'Sine (SIN)' },
//       { value: 'square',    label: 'Square (SQR)' },
//       { value: 'triangle',  label: 'Triangle (TRI)' },
//       { value: 'sawtooth',  label: 'Sawtooth / Ramp Up' },
//       { value: 'ramp_down', label: 'Ramp Down' },
//       { value: 'pulse',     label: 'Narrow Pulse' },
//       { value: 'noise',     label: 'Pseudo-Random Noise' },
//       { value: 'dc',        label: 'Pure DC' },
//     ]},
//     { field: 'ch1_freq',   label: 'CH1 Freq',   min: 1,    max: 100000, step: 1,   unit: 'Hz' },
//     { field: 'ch1_amp',    label: 'CH1 Amp',    min: 0.0,  max: 20.0,   step: 0.1, unit: 'Vpp' },
//     { field: 'ch1_offset', label: 'CH1 Offset', min: -10,  max: 10,     step: 0.1, unit: 'V' },
//     { field: 'ch1_phase',  label: 'CH1 Phase',  min: 0,    max: 360,    step: 1,   unit: '°' },
//     { field: 'ch1_duty',   label: 'CH1 Duty',   min: 1,    max: 99,     step: 1,   unit: '%' },

//     // Channel 2 Controls
//     { field: 'ch2_en',     label: 'CH2 Output', type: 'checkbox' },
//     { field: 'ch2_wave',   label: 'CH2 Wave',   type: 'select', options: [
//       { value: 'sine',      label: 'Sine (SIN)' },
//       { value: 'square',    label: 'Square (SQR)' },
//       { value: 'triangle',  label: 'Triangle (TRI)' },
//       { value: 'sawtooth',  label: 'Sawtooth / Ramp Up' },
//       { value: 'ramp_down', label: 'Ramp Down' },
//       { value: 'pulse',     label: 'Narrow Pulse' },
//       { value: 'noise',     label: 'Pseudo-Random Noise' },
//       { value: 'dc',        label: 'Pure DC' },
//     ]},
//     { field: 'ch2_freq',   label: 'CH2 Freq',   min: 1,    max: 100000, step: 1,   unit: 'Hz' },
//     { field: 'ch2_amp',    label: 'CH2 Amp',    min: 0.0,  max: 20.0,   step: 0.1, unit: 'Vpp' },
//     { field: 'ch2_offset', label: 'CH2 Offset', min: -10,  max: 10,     step: 0.1, unit: 'V' },
//     { field: 'ch2_phase',  label: 'CH2 Phase',  min: 0,    max: 360,    step: 1,   unit: '°' },
//     { field: 'ch2_duty',   label: 'CH2 Duty',   min: 1,    max: 99,     step: 1,   unit: '%' },
//   ],

//   pins: [
//     { id: 'ch1_out', label: 'CH1',  type: PIN_TYPE.SIGNAL, x: 65,  y: 205, side: 'bottom' },
//     { id: 'ch1_gnd', label: 'GND1', type: PIN_TYPE.GND,    x: 95,  y: 205, side: 'bottom' },
//     { id: 'ch2_out', label: 'CH2',  type: PIN_TYPE.SIGNAL, x: 195, y: 205, side: 'bottom' },
//     { id: 'ch2_gnd', label: 'GND2', type: PIN_TYPE.GND,    x: 225, y: 205, side: 'bottom' },
//   ],

//   /**
//    * Continuous Signal Synthesizer
//    */
//   _evalSignal(wave, t, freq, vpp, offset, phaseDeg, dutyPct) {
//     const phaseRad = (phaseDeg * Math.PI) / 180;
//     const tau = ((t * freq + phaseRad / (2 * Math.PI)) % 1 + 1) % 1;
//     const duty = dutyPct / 100;
//     let norm = 0;

//     switch (wave) {
//       case 'sine':
//         norm = Math.sin(2 * Math.PI * tau);
//         break;
//       case 'square':
//         norm = tau < duty ? 1.0 : -1.0;
//         break;
//       case 'triangle':
//         norm = tau < duty ? -1.0 + 2.0 * (tau / duty) : 1.0 - 2.0 * ((tau - duty) / (1.0 - duty));
//         break;
//       case 'sawtooth':
//         norm = 2.0 * tau - 1.0;
//         break;
//       case 'ramp_down':
//         norm = 1.0 - 2.0 * tau;
//         break;
//       case 'pulse':
//         norm = tau < Math.min(duty, 0.1) ? 1.0 : -1.0;
//         break;
//       case 'noise':
//         // High-frequency deterministic PRNG hash (avoids floating frame flicker)
//         const sampleIdx = Math.floor(t * Math.max(freq, 20000));
//         const hash = Math.sin(sampleIdx * 12.9898 + 78.233) * 43758.5453;
//         norm = (hash - Math.floor(hash)) * 2.0 - 1.0;
//         break;
//       case 'dc':
//         norm = 0.0;
//         break;
//       default:
//         norm = Math.sin(2 * Math.PI * tau);
//         break;
//     }

//     return offset + norm * (vpp / 2.0);
//   },

//   /**
//    * Electrical Simulation Step Handler
//    */
//   step(inst, sim) {
//     const props = inst.props || {};
//     const t = sim && typeof sim.time === 'number' ? sim.time : performance.now() / 1000;

//     // Channel 1 Output
//     let v1 = 0;
//     if (props.ch1_en !== false) {
//       v1 = this._evalSignal(
//         props.ch1_wave || 'sine', t, props.ch1_freq || 1000, props.ch1_amp ?? 5,
//         props.ch1_offset || 0, props.ch1_phase || 0, props.ch1_duty ?? 50
//       );
//     }

//     // Channel 2 Output
//     let v2 = 0;
//     if (props.ch2_en !== false) {
//       v2 = this._evalSignal(
//         props.ch2_wave || 'square', t, props.ch2_freq || 2000, props.ch2_amp ?? 3.3,
//         props.ch2_offset || 0, props.ch2_phase || 90, props.ch2_duty ?? 50
//       );
//     }

//     if (sim && typeof sim.setPinVoltage === 'function') {
//       sim.setPinVoltage(inst, 'ch1_out', v1);
//       sim.setPinVoltage(inst, 'ch1_gnd', 0.0);
//       sim.setPinVoltage(inst, 'ch2_out', v2);
//       sim.setPinVoltage(inst, 'ch2_gnd', 0.0);
//     }
//   },

//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const props = inst.props || {};
//     const W = 290, H = 205;
//     const t = sim && typeof sim.time === 'number' ? sim.time : performance.now() / 1000;

//     // Safe round rect fallback
//     const drawRRect = (c, rx, ry, rw, rh, rad) => {
//       if (typeof roundRect === 'function') { roundRect(c, rx, ry, rw, rh, rad); return; }
//       c.beginPath();
//       c.moveTo(rx + rad, ry);
//       c.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
//       c.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
//       c.arcTo(rx, ry + rh, rx, ry, rad);
//       c.arcTo(rx, ry, rx + rw, ry, rad);
//       c.closePath();
//     };

//     ctx.save();
//     ctx.translate(x, y);

//     // ── Outer Enclosure ──
//     ctx.fillStyle = '#1e222b';
//     drawRRect(ctx, 0, 0, W, H - 25, 10);
//     ctx.fill();
//     ctx.strokeStyle = '#12151a';
//     ctx.lineWidth = 3;
//     ctx.stroke();

//     // Subtle brushed bevel
//     ctx.strokeStyle = '#323846';
//     ctx.lineWidth = 1;
//     drawRRect(ctx, 1.5, 1.5, W - 3, H - 28, 9);
//     ctx.stroke();

//     // ── Header Title & Status Bar ──
//     ctx.fillStyle = '#2a303c';
//     ctx.fillRect(10, 6, W - 20, 18);
    
//     ctx.fillStyle = '#00e5ff';
//     ctx.font = 'bold 9px monospace';
//     ctx.textAlign = 'left';
//     ctx.fillText('DDS-8000', 16, 18);
    
//     ctx.fillStyle = '#8c9ba5';
//     ctx.font = '8px sans-serif';
//     ctx.fillText('DUAL ARBITRARY GENERATOR', 68, 18);

//     // Live Run LED
//     const isRunning = (props.ch1_en !== false) || (props.ch2_en !== false);
//     ctx.fillStyle = isRunning ? '#2ed573' : '#57606f';
//     ctx.beginPath(); ctx.arc(W - 18, 15, 3.5, 0, Math.PI * 2); ctx.fill();
//     if (isRunning) {
//       ctx.fillStyle = 'rgba(46, 213, 115, 0.4)';
//       ctx.beginPath(); ctx.arc(W - 18, 15, 6.5, 0, Math.PI * 2); ctx.fill();
//     }

//     // ── Dual-Trace Display Screen ──
//     const scrX = 10, scrY = 28, scrW = W - 20, scrH = 64;
//     ctx.fillStyle = '#06080b';
//     drawRRect(ctx, scrX, scrY, scrW, scrH, 5);
//     ctx.fill();
//     ctx.strokeStyle = '#333b48';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // Scope Graticule with Center Axis Sub-divisions
//     ctx.save();
//     drawRRect(ctx, scrX, scrY, scrW, scrH, 5);
//     ctx.clip(); // Mask scope viewport

//     const divsX = 10;
//     const divsY = 6;
//     ctx.strokeStyle = '#151b24';
//     ctx.lineWidth = 0.5;

//     for (let gx = 1; gx < divsX; gx++) {
//       const px = scrX + (scrW / divsX) * gx;
//       ctx.beginPath(); ctx.moveTo(px, scrY); ctx.lineTo(px, scrY + scrH); ctx.stroke();
//     }
//     for (let gy = 1; gy < divsY; gy++) {
//       const py = scrY + (scrH / divsY) * gy;
//       ctx.beginPath(); ctx.moveTo(scrX, py); ctx.lineTo(scrX + scrW, py); ctx.stroke();
//     }

//     // Reticle Center Axes with Tick marks
//     const zeroY = scrY + scrH / 2;
//     const midX = scrX + scrW / 2;
//     ctx.strokeStyle = '#273344';
//     ctx.lineWidth = 0.8;
//     ctx.beginPath(); ctx.moveTo(scrX, zeroY); ctx.lineTo(scrX + scrW, zeroY); ctx.stroke();
//     ctx.beginPath(); ctx.moveTo(midX, scrY); ctx.lineTo(midX, scrY + scrH); ctx.stroke();

//     // Waveform Simulation Bounds
//     const f1 = props.ch1_freq || 1000;
//     const f2 = props.ch2_freq || 2000;
//     const baseFreq = Math.min(f1 > 0 ? f1 : 1000, f2 > 0 ? f2 : 2000);
//     const windowTime = 2.5 / baseFreq;
//     const dt = windowTime / scrW;
//     const vScale = (scrH / 2) / 10.0; // Scale: ±10V Peak Screen Max

//     // Render CH2 Trace (Back Layer - Pink Phosphor)
//     if (props.ch2_en !== false) {
//       ctx.strokeStyle = '#ff3366';
//       ctx.shadowColor = '#ff3366';
//       ctx.shadowBlur = 4;
//       ctx.lineWidth = 1.6;
//       ctx.beginPath();
//       for (let px = 0; px < scrW; px++) {
//         const v = this._evalSignal(
//           props.ch2_wave || 'square', (t % windowTime) + px * dt, f2,
//           props.ch2_amp ?? 3.3, props.ch2_offset || 0, props.ch2_phase || 90, props.ch2_duty ?? 50
//         );
//         const py = zeroY - v * vScale;
//         if (px === 0) ctx.moveTo(scrX + px, py); else ctx.lineTo(scrX + px, py);
//       }
//       ctx.stroke();
//     }

//     // Render CH1 Trace (Front Layer - Cyan Phosphor)
//     if (props.ch1_en !== false) {
//       ctx.strokeStyle = '#00e5ff';
//       ctx.shadowColor = '#00e5ff';
//       ctx.shadowBlur = 4;
//       ctx.lineWidth = 1.6;
//       ctx.beginPath();
//       for (let px = 0; px < scrW; px++) {
//         const v = this._evalSignal(
//           props.ch1_wave || 'sine', (t % windowTime) + px * dt, f1,
//           props.ch1_amp ?? 5.0, props.ch1_offset || 0, props.ch1_phase || 0, props.ch1_duty ?? 50
//         );
//         const py = zeroY - v * vScale;
//         if (px === 0) ctx.moveTo(scrX + px, py); else ctx.lineTo(scrX + px, py);
//       }
//       ctx.stroke();
//     }

//     ctx.restore(); // Exit screen clipping & glow

//     // ── Channel Parameter Modules ──
//     const cardY = 96, cardH = 76, cardGap = 8;
//     const cardW = (scrW - cardGap) / 2;

//     const _calcVrms = (wave, vpp, off) => {
//       const vpk = vpp / 2;
//       let ac = vpk / Math.SQRT2;
//       if (wave === 'square' || wave === 'pulse') ac = vpk;
//       else if (wave === 'triangle' || wave === 'sawtooth' || wave === 'ramp_down' || wave === 'noise') ac = vpk / Math.sqrt(3);
//       else if (wave === 'dc') ac = 0;
//       return Math.sqrt(ac * ac + off * off);
//     };

//     const _drawChannelBay = (cx, cy, cw, ch, isEn, title, col, wave, freq, vpp, off, phs, duty) => {
//       ctx.fillStyle = '#141820';
//       drawRRect(ctx, cx, cy, cw, ch, 6);
//       ctx.fill();

//       // Top Header Accent
//       ctx.fillStyle = isEn ? col : '#444c5a';
//       ctx.fillRect(cx, cy, cw, 2);

//       // Title & Status
//       ctx.fillStyle = isEn ? col : '#667385';
//       ctx.font = 'bold 9px monospace';
//       ctx.textAlign = 'left';
//       ctx.fillText(title, cx + 6, cy + 13);

//       // Wave Badge
//       const waveMap = { sine: 'SIN', square: 'SQR', triangle: 'TRI', sawtooth: 'SAW', ramp_down: 'RAMP', pulse: 'PULS', noise: 'NOIS', dc: 'DC' };
//       ctx.fillStyle = '#222936';
//       drawRRect(ctx, cx + cw - 32, cy + 4, 28, 12, 3);
//       ctx.fill();
//       ctx.fillStyle = isEn ? '#ffffff' : '#667385';
//       ctx.font = 'bold 7px monospace';
//       ctx.textAlign = 'center';
//       ctx.fillText(waveMap[wave] || 'SIN', cx + cw - 18, cy + 13);

//       // Data Matrix
//       ctx.fillStyle = '#7e8d9f';
//       ctx.font = '8px monospace';
//       ctx.textAlign = 'left';
//       const col2 = cx + cw / 2 + 2;

//       ctx.fillText('F:' + _fmtFreq(freq), cx + 6, cy + 28);
//       ctx.fillText('A:' + vpp.toFixed(1) + 'Vpp', cx + 6, cy + 41);
//       ctx.fillText('O:' + (off >= 0 ? '+' : '') + off.toFixed(1) + 'V', cx + 6, cy + 54);

//       ctx.fillText('P:' + phs + '°', col2, cy + 28);
//       ctx.fillText('D:' + duty + '%', col2, cy + 41);
//       ctx.fillStyle = isEn ? col : '#7e8d9f';
//       ctx.fillText('~' + _calcVrms(wave, vpp, off).toFixed(2) + 'V', col2, cy + 54);
//     };

//     _drawChannelBay(
//       scrX, cardY, cardW, cardH, props.ch1_en !== false,
//       'CH1', '#00e5ff', props.ch1_wave || 'sine', f1,
//       props.ch1_amp ?? 5, props.ch1_offset || 0, props.ch1_phase || 0, props.ch1_duty ?? 50
//     );

//     _drawChannelBay(
//       scrX + cardW + cardGap, cardY, cardW, cardH, props.ch2_en !== false,
//       'CH2', '#ff3366', props.ch2_wave || 'square', f2,
//       props.ch2_amp ?? 3.3, props.ch2_offset || 0, props.ch2_phase || 90, props.ch2_duty ?? 50
//     );

//     // ── BNC Connector Terminals ──
//     const _drawBNCPort = (px, py, label, col, isSignal) => {
//       // Hex nut flange
//       ctx.fillStyle = '#5a6270';
//       ctx.beginPath(); ctx.arc(px, py, 7.5, 0, Math.PI * 2); ctx.fill();
//       // Outer Shield Collar
//       ctx.fillStyle = '#aab4be';
//       ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
//       // Black Dielectric Ring
//       ctx.fillStyle = '#111317';
//       ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
//       // Gold Center Pin / Receptacle
//       ctx.fillStyle = isSignal ? (col || '#e6b800') : '#666';
//       ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();

//       // Label below BNC
//       ctx.fillStyle = col || '#8c9ba5';
//       ctx.font = 'bold 7px sans-serif';
//       ctx.textAlign = 'center';
//       ctx.fillText(label, px, py + 14);
//     };

//     _drawBNCPort(65,  183, 'CH1',  '#00e5ff', true);
//     _drawBNCPort(95,  183, 'GND',  '#7a889b', false);
//     _drawBNCPort(195, 183, 'CH2',  '#ff3366', true);
//     _drawBNCPort(225, 183, 'GND',  '#7a889b', false);

//     // Selection Halo
//     if (inst.selected && typeof drawSelectionRect === 'function') {
//       drawSelectionRect(ctx, -4, -4, W + 8, H + 8);
//     }

//     ctx.restore();
//   }
// });

// function _fmtFreq(hz) {
//   if (hz >= 1e6) return (hz / 1e6).toFixed(2) + 'M';
//   if (hz >= 1e3) return (hz / 1e3).toFixed(1) + 'k';
//   return hz.toFixed(0);
// }


// 'use strict';

// defComp({
//   id: 'func_gen',
//   name: 'Dual DDS Function Generator',
//   category: 'Instruments',
//   icon: '〜',
//   desc: 'Professional Dual-Channel DDS Waveform Generator with AM/FM/Sweep modulation, 50Ω/High-Z output mode, inter-channel sync, and real-time dual trace TFT screen.',

//   width: 320,
//   height: 220,

//   defaultProps: {
//     // Channel 1 Configuration
//     ch1_en: true,
//     ch1_wave: 'sine',
//     ch1_freq: 1000,
//     ch1_amp: 5.0,
//     ch1_offset: 0.0,
//     ch1_phase: 0,
//     ch1_duty: 50,
//     ch1_load: 'highz', // '50' or 'highz'
//     ch1_mod: 'none',   // 'none', 'am', 'fm', 'sweep'
//     ch1_mod_freq: 10,
//     ch1_mod_depth: 50, // AM % or FM Dev Hz

//     // Channel 2 Configuration
//     ch2_en: true,
//     ch2_wave: 'square',
//     ch2_freq: 2000,
//     ch2_amp: 3.3,
//     ch2_offset: 0.0,
//     ch2_phase: 90,
//     ch2_duty: 50,
//     ch2_load: 'highz',
//     ch2_mod: 'none',
//     ch2_mod_freq: 5,
//     ch2_mod_depth: 30,

//     // Inter-Channel Synchronization
//     ch_sync: 'off',    // 'off', 'freq_track', 'phase_sync'
//   },

//   interactive: [
//     // --- Channel 1 Primary ---
//     { field: 'ch1_en',       label: 'CH1 Output',  type: 'checkbox' },
//     { field: 'ch1_wave',     label: 'CH1 Waveform', type: 'select', options: [
//       { value: 'sine',       label: 'Sine (SIN)' },
//       { value: 'square',     label: 'Square (SQR)' },
//       { value: 'triangle',   label: 'Triangle (TRI)' },
//       { value: 'sawtooth',   label: 'Ramp Up / Saw' },
//       { value: 'ramp_down',  label: 'Ramp Down' },
//       { value: 'pulse',      label: 'Variable Pulse' },
//       { value: 'exp_rise',   label: 'Exponential Rise' },
//       { value: 'noise',      label: 'Gaussian / PRNG Noise' },
//       { value: 'dc',         label: 'DC Offset Only' },
//     ]},
//     { field: 'ch1_freq',      label: 'CH1 Freq',    min: 0.1,  max: 25000000, step: 1,   unit: 'Hz' },
//     { field: 'ch1_amp',       label: 'CH1 Amp',     min: 0.001, max: 20.0,    step: 0.01, unit: 'Vpp' },
//     { field: 'ch1_offset',    label: 'CH1 Offset',  min: -10,   max: 10,      step: 0.05, unit: 'V' },
//     { field: 'ch1_phase',     label: 'CH1 Phase',   min: 0,     max: 360,     step: 1,    unit: '°' },
//     { field: 'ch1_duty',      label: 'CH1 Duty/Symmetry', min: 0.1, max: 99.9, step: 0.1, unit: '%' },
//     { field: 'ch1_load',      label: 'CH1 Impedance', type: 'select', options: [
//       { value: 'highz', label: 'High-Z (1MΩ)' },
//       { value: '50',    label: '50 Ω Load' }
//     ]},
//     { field: 'ch1_mod',       label: 'CH1 Modulation', type: 'select', options: [
//       { value: 'none',  label: 'Off' },
//       { value: 'am',    label: 'AM (Amplitude Mod)' },
//       { value: 'fm',    label: 'FM (Frequency Mod)' },
//       { value: 'sweep', label: 'Linear Freq Sweep' }
//     ]},
//     { field: 'ch1_mod_freq',  label: 'CH1 Mod Freq', min: 0.1, max: 50000, step: 0.1, unit: 'Hz' },
//     { field: 'ch1_mod_depth', label: 'CH1 Mod Depth/Dev', min: 0, max: 100, step: 1, unit: '%' },

//     // --- Channel 2 Primary ---
//     { field: 'ch2_en',       label: 'CH2 Output',  type: 'checkbox' },
//     { field: 'ch2_wave',     label: 'CH2 Waveform', type: 'select', options: [
//       { value: 'sine',       label: 'Sine (SIN)' },
//       { value: 'square',     label: 'Square (SQR)' },
//       { value: 'triangle',   label: 'Triangle (TRI)' },
//       { value: 'sawtooth',   label: 'Ramp Up / Saw' },
//       { value: 'ramp_down',  label: 'Ramp Down' },
//       { value: 'pulse',      label: 'Variable Pulse' },
//       { value: 'exp_rise',   label: 'Exponential Rise' },
//       { value: 'noise',      label: 'Gaussian / PRNG Noise' },
//       { value: 'dc',         label: 'DC Offset Only' },
//     ]},
//     { field: 'ch2_freq',      label: 'CH2 Freq',    min: 0.1,  max: 25000000, step: 1,   unit: 'Hz' },
//     { field: 'ch2_amp',       label: 'CH2 Amp',     min: 0.001, max: 20.0,    step: 0.01, unit: 'Vpp' },
//     { field: 'ch2_offset',    label: 'CH2 Offset',  min: -10,   max: 10,      step: 0.05, unit: 'V' },
//     { field: 'ch2_phase',     label: 'CH2 Phase',   min: 0,     max: 360,     step: 1,    unit: '°' },
//     { field: 'ch2_duty',      label: 'CH2 Duty/Symmetry', min: 0.1, max: 99.9, step: 0.1, unit: '%' },
//     { field: 'ch2_load',      label: 'CH2 Impedance', type: 'select', options: [
//       { value: 'highz', label: 'High-Z (1MΩ)' },
//       { value: '50',    label: '50 Ω Load' }
//     ]},

//     // --- Global Controls ---
//     { field: 'ch_sync',      label: 'Channel Sync Mode', type: 'select', options: [
//       { value: 'off',        label: 'Independent Operations' },
//       { value: 'freq_track', label: 'CH2 Tracks CH1 Frequency' },
//       { value: 'phase_sync', label: 'Synchronize Phase & Freq' }
//     ]}
//   ],

//   pins: [
//     { id: 'ch1_out', label: 'CH1 OUT', type: PIN_TYPE.SIGNAL, x: 70,  y: 220, side: 'bottom' },
//     { id: 'ch1_gnd', label: 'GND1',    type: PIN_TYPE.GND,    x: 100, y: 220, side: 'bottom' },
//     { id: 'ch2_out', label: 'CH2 OUT', type: PIN_TYPE.SIGNAL, x: 220, y: 220, side: 'bottom' },
//     { id: 'ch2_gnd', label: 'GND2',    type: PIN_TYPE.GND,    x: 250, y: 220, side: 'bottom' },
//   ],

//   /**
//    * Real-Time DDS Signal Synthesizer Core
//    */
//   _evalSignal(wave, t, freq, vpp, offset, phaseDeg, dutyPct, loadMode, modMode, modFreq, modDepth) {
//     // 50Ω termination halves open-circuit output voltage when loaded down
//     const openCircuitScale = loadMode === '50' ? 0.5 : 1.0;
//     const effectiveVpp = vpp * openCircuitScale;
//     const effectiveOffset = offset * openCircuitScale;

//     // Apply Modulation Pipeline
//     let instFreq = freq;
//     let ampModFactor = 1.0;

//     if (modMode === 'am') {
//       const amSignal = Math.sin(2 * Math.PI * (modFreq || 10) * t);
//       ampModFactor = 1.0 + ((modDepth || 50) / 100) * amSignal;
//     } else if (modMode === 'fm') {
//       const devHz = ((modDepth || 50) / 100) * freq * 0.5;
//       instFreq += devHz * Math.sin(2 * Math.PI * (modFreq || 5) * t);
//     } else if (modMode === 'sweep') {
//       const sweepPeriod = 1.0 / Math.max(modFreq || 1, 0.01);
//       const sweepProgress = (t % sweepPeriod) / sweepPeriod;
//       const targetFreq = freq * Math.max(1.0 + (modDepth || 50) / 10, 1.1);
//       instFreq = freq + (targetFreq - freq) * sweepProgress;
//     }

//     const phaseRad = (phaseDeg * Math.PI) / 180;
//     const tau = ((t * instFreq + phaseRad / (2 * Math.PI)) % 1 + 1) % 1;
//     const duty = Math.min(Math.max(dutyPct / 100, 0.001), 0.999);
//     let norm = 0;

//     switch (wave) {
//       case 'sine':
//         norm = Math.sin(2 * Math.PI * tau);
//         break;
//       case 'square':
//         norm = tau < duty ? 1.0 : -1.0;
//         break;
//       case 'triangle':
//         norm = tau < duty ? -1.0 + 2.0 * (tau / duty) : 1.0 - 2.0 * ((tau - duty) / (1.0 - duty));
//         break;
//       case 'sawtooth':
//         norm = 2.0 * tau - 1.0;
//         break;
//       case 'ramp_down':
//         norm = 1.0 - 2.0 * tau;
//         break;
//       case 'pulse':
//         const riseFrac = 0.05;
//         if (tau < riseFrac) norm = -1.0 + 2.0 * (tau / riseFrac);
//         else if (tau < duty) norm = 1.0;
//         else if (tau < duty + riseFrac) norm = 1.0 - 2.0 * ((tau - duty) / riseFrac);
//         else norm = -1.0;
//         break;
//       case 'exp_rise':
//         norm = 2.0 * ((Math.exp(3.0 * tau) - 1.0) / (Math.exp(3.0) - 1.0)) - 1.0;
//         break;
//       case 'noise':
//         const sampleIdx = Math.floor(t * Math.max(instFreq, 25000));
//         const hash = Math.sin(sampleIdx * 12.9898 + 78.233) * 43758.5453;
//         norm = (hash - Math.floor(hash)) * 2.0 - 1.0;
//         break;
//       case 'dc':
//         norm = 0.0;
//         break;
//       default:
//         norm = Math.sin(2 * Math.PI * tau);
//         break;
//     }

//     return effectiveOffset + (norm * (effectiveVpp / 2.0)) * ampModFactor;
//   },

//   /**
//    * Electrical Simulation Step
//    */
//   step(inst, sim) {
//     const props = inst.props || {};
//     const t = sim && typeof sim.time === 'number' ? sim.time : performance.now() / 1000;

//     let f1 = props.ch1_freq || 1000;
//     let f2 = props.ch2_freq || 2000;
//     let phase2 = props.ch2_phase || 90;

//     // Handle Inter-Channel Sync Modes
//     if (props.ch_sync === 'freq_track' || props.ch_sync === 'phase_sync') {
//       f2 = f1;
//     }
//     if (props.ch_sync === 'phase_sync') {
//       phase2 = props.ch1_phase || 0;
//     }

//     // Synthesize Channel 1 Output
//     let v1 = 0;
//     if (props.ch1_en !== false) {
//       v1 = this._evalSignal(
//         props.ch1_wave || 'sine', t, f1, props.ch1_amp ?? 5.0,
//         props.ch1_offset || 0, props.ch1_phase || 0, props.ch1_duty ?? 50,
//         props.ch1_load || 'highz', props.ch1_mod || 'none', props.ch1_mod_freq || 10, props.ch1_mod_depth || 50
//       );
//     }

//     // Synthesize Channel 2 Output
//     let v2 = 0;
//     if (props.ch2_en !== false) {
//       v2 = this._evalSignal(
//         props.ch2_wave || 'square', t, f2, props.ch2_amp ?? 3.3,
//         props.ch2_offset || 0, phase2, props.ch2_duty ?? 50,
//         props.ch2_load || 'highz', props.ch2_mod || 'none', props.ch2_mod_freq || 5, props.ch2_mod_depth || 30
//       );
//     }

//     if (sim && typeof sim.setPinVoltage === 'function') {
//       sim.setPinVoltage(inst, 'ch1_out', v1);
//       sim.setPinVoltage(inst, 'ch1_gnd', 0.0);
//       sim.setPinVoltage(inst, 'ch2_out', v2);
//       sim.setPinVoltage(inst, 'ch2_gnd', 0.0);
//     }
//   },

//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const props = inst.props || {};
//     const W = 320, H = 220;
//     const t = sim && typeof sim.time === 'number' ? sim.time : performance.now() / 1000;

//     const drawRRect = (c, rx, ry, rw, rh, rad) => {
//       if (typeof roundRect === 'function') { roundRect(c, rx, ry, rw, rh, rad); return; }
//       c.beginPath();
//       c.moveTo(rx + rad, ry);
//       c.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
//       c.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
//       c.arcTo(rx, ry + rh, rx, ry, rad);
//       c.arcTo(rx, ry, rx + rw, ry, rad);
//       c.closePath();
//     };

//     ctx.save();
//     ctx.translate(x, y);

//     // ── Instrument Outer Enclosure (Industrial Anodized Aluminum) ──
//     const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
//     bgGrad.addColorStop(0, '#2c323e');
//     bgGrad.addColorStop(0.5, '#21252f');
//     bgGrad.addColorStop(1, '#181b22');
//     ctx.fillStyle = bgGrad;
//     drawRRect(ctx, 0, 0, W, H - 25, 8);
//     ctx.fill();
//     ctx.strokeStyle = '#0f1116';
//     ctx.lineWidth = 3;
//     ctx.stroke();

//     // Corner Bumpers
//     ctx.fillStyle = '#111317';
//     drawRRect(ctx, 0, 0, 12, 12, 3); ctx.fill();
//     drawRRect(ctx, W - 12, 0, 12, 12, 3); ctx.fill();
//     drawRRect(ctx, 0, H - 37, 12, 12, 3); ctx.fill();
//     drawRRect(ctx, W - 12, H - 37, 12, 12, 3); ctx.fill();

//     // ── Header Branding & Status Bar ──
//     ctx.fillStyle = '#171a21';
//     ctx.fillRect(12, 6, W - 24, 18);
    
//     ctx.fillStyle = '#00f0ff';
//     ctx.font = 'bold 10px "JetBrains Mono", monospace';
//     ctx.textAlign = 'left';
//     ctx.fillText('DDS-9000 PRO', 18, 18);
    
//     ctx.fillStyle = '#8a99ad';
//     ctx.font = '8px sans-serif';
//     ctx.fillText('DUAL-CHANNEL SYNTHESIZER', 98, 18);

//     // Master Sync LED Indicator
//     const isSync = props.ch_sync && props.ch_sync !== 'off';
//     ctx.fillStyle = isSync ? '#ffaa00' : '#3a4250';
//     ctx.beginPath(); ctx.arc(W - 45, 15, 3, 0, Math.PI * 2); ctx.fill();
//     ctx.fillStyle = '#8a99ad';
//     ctx.font = '6px sans-serif';
//     ctx.fillText('SYNC', W - 62, 17);

//     // Live Power LED
//     const isRunning = (props.ch1_en !== false) || (props.ch2_en !== false);
//     ctx.fillStyle = isRunning ? '#00ff66' : '#555';
//     ctx.beginPath(); ctx.arc(W - 18, 15, 3.5, 0, Math.PI * 2); ctx.fill();
//     if (isRunning) {
//       ctx.fillStyle = 'rgba(0, 255, 102, 0.35)';
//       ctx.beginPath(); ctx.arc(W - 18, 15, 7, 0, Math.PI * 2); ctx.fill();
//     }

//     // ── Color LCD / TFT Display Screen ──
//     const scrX = 12, scrY = 28, scrW = 205, scrH = 75;
//     ctx.fillStyle = '#05070a';
//     drawRRect(ctx, scrX, scrY, scrW, scrH, 4);
//     ctx.fill();
//     ctx.strokeStyle = '#394252';
//     ctx.lineWidth = 1.2;
//     ctx.stroke();

//     // Graticule & Grid Reticle
//     ctx.save();
//     drawRRect(ctx, scrX, scrY, scrW, scrH, 4);
//     ctx.clip();

//     const divsX = 10, divsY = 6;
//     ctx.strokeStyle = '#121822';
//     ctx.lineWidth = 0.6;
//     for (let gx = 1; gx < divsX; gx++) {
//       const px = scrX + (scrW / divsX) * gx;
//       ctx.beginPath(); ctx.moveTo(px, scrY); ctx.lineTo(px, scrY + scrH); ctx.stroke();
//     }
//     for (let gy = 1; gy < divsY; gy++) {
//       const py = scrY + (scrH / divsY) * gy;
//       ctx.beginPath(); ctx.moveTo(scrX, py); ctx.lineTo(scrX + scrW, py); ctx.stroke();
//     }

//     // Zero-Volt Reference Axis
//     const zeroY = scrY + scrH / 2;
//     ctx.strokeStyle = '#1e2838';
//     ctx.lineWidth = 1.0;
//     ctx.beginPath(); ctx.moveTo(scrX, zeroY); ctx.lineTo(scrX + scrW, zeroY); ctx.stroke();

//     // Frequencies & Timebase Bounds
//     let f1 = props.ch1_freq || 1000;
//     let f2 = props.ch2_freq || 2000;
//     let phs2 = props.ch2_phase || 90;
//     if (props.ch_sync === 'freq_track' || props.ch_sync === 'phase_sync') f2 = f1;
//     if (props.ch_sync === 'phase_sync') phs2 = props.ch1_phase || 0;

//     const baseFreq = Math.min(f1 > 0 ? f1 : 1000, f2 > 0 ? f2 : 2000);
//     const windowTime = 2.5 / baseFreq;
//     const dt = windowTime / scrW;
//     const vScale = (scrH / 2) / 10.0;

//     // Render CH2 Trace (Magenta Phosphor)
//     if (props.ch2_en !== false) {
//       ctx.strokeStyle = '#ff2a70';
//       ctx.shadowColor = '#ff2a70';
//       ctx.shadowBlur = 4;
//       ctx.lineWidth = 1.5;
//       ctx.beginPath();
//       for (let px = 0; px < scrW; px++) {
//         const v = this._evalSignal(
//           props.ch2_wave || 'square', (t % windowTime) + px * dt, f2,
//           props.ch2_amp ?? 3.3, props.ch2_offset || 0, phs2, props.ch2_duty ?? 50,
//           props.ch2_load || 'highz', props.ch2_mod || 'none', props.ch2_mod_freq || 5, props.ch2_mod_depth || 30
//         );
//         const py = zeroY - v * vScale;
//         if (px === 0) ctx.moveTo(scrX + px, py); else ctx.lineTo(scrX + px, py);
//       }
//       ctx.stroke();
//     }

//     // Render CH1 Trace (Cyan Phosphor)
//     if (props.ch1_en !== false) {
//       ctx.strokeStyle = '#00f0ff';
//       ctx.shadowColor = '#00f0ff';
//       ctx.shadowBlur = 4;
//       ctx.lineWidth = 1.5;
//       ctx.beginPath();
//       for (let px = 0; px < scrW; px++) {
//         const v = this._evalSignal(
//           props.ch1_wave || 'sine', (t % windowTime) + px * dt, f1,
//           props.ch1_amp ?? 5.0, props.ch1_offset || 0, props.ch1_phase || 0, props.ch1_duty ?? 50,
//           props.ch1_load || 'highz', props.ch1_mod || 'none', props.ch1_mod_freq || 10, props.ch1_mod_depth || 50
//         );
//         const py = zeroY - v * vScale;
//         if (px === 0) ctx.moveTo(scrX + px, py); else ctx.lineTo(scrX + px, py);
//       }
//       ctx.stroke();
//     }

//     ctx.restore(); // Exit Screen Context

//     // ── Right Control Panel (Rotary Encoder Knob & Pushbuttons) ──
//     const ctrlX = 227;
//     // Main Rotary Encoder Knob
//     const kx = ctrlX + 40, ky = 52;
//     const knobGrad = ctx.createRadialGradient(kx - 3, ky - 3, 2, kx, ky, 22);
//     knobGrad.addColorStop(0, '#505866');
//     knobGrad.addColorStop(0.7, '#242830');
//     knobGrad.addColorStop(1, '#15171c');
//     ctx.fillStyle = knobGrad;
//     ctx.beginPath(); ctx.arc(kx, ky, 22, 0, Math.PI * 2); ctx.fill();
//     ctx.strokeStyle = '#0e1014'; ctx.lineWidth = 1.5; ctx.stroke();

//     // Knob Finger Dimple
//     const dimpleAngle = (t * 0.5) % (Math.PI * 2);
//     const dx = kx + 14 * Math.cos(dimpleAngle);
//     const dy = ky + 14 * Math.sin(dimpleAngle);
//     ctx.fillStyle = '#111317';
//     ctx.beginPath(); ctx.arc(dx, dy, 3.5, 0, Math.PI * 2); ctx.fill();

//     // Keypad Pushbuttons
//     const drawSoftBtn = (bx, by, bw, bh, txt, isActive, activeCol) => {
//       ctx.fillStyle = isActive ? activeCol : '#2b313d';
//       drawRRect(ctx, bx, by, bw, bh, 3);
//       ctx.fill();
//       ctx.strokeStyle = '#191d24'; ctx.lineWidth = 1; ctx.stroke();

//       ctx.fillStyle = isActive ? '#ffffff' : '#9ab0c7';
//       ctx.font = 'bold 7px sans-serif';
//       ctx.textAlign = 'center';
//       ctx.fillText(txt, bx + bw / 2, by + bh / 2 + 2.5);
//     };

//     drawSoftBtn(ctrlX + 6,  84, 32, 16, 'CH1', props.ch1_en !== false, '#0099cc');
//     drawSoftBtn(ctrlX + 44, 84, 32, 16, 'CH2', props.ch2_en !== false, '#cc0055');

//     // ── Readout Dashboard Bays ──
//     const cardY = 108, cardH = 75, cardW = (W - 32) / 2;

//     const _calcVrms = (wave, vpp, off, loadMode) => {
//       const openCircuitScale = loadMode === '50' ? 0.5 : 1.0;
//       const effectiveVpp = vpp * openCircuitScale;
//       const effectiveOffset = off * openCircuitScale;
//       const vpk = effectiveVpp / 2;
//       let ac = vpk / Math.SQRT2;
//       if (wave === 'square' || wave === 'pulse') ac = vpk;
//       else if (wave === 'triangle' || wave === 'sawtooth' || wave === 'ramp_down' || wave === 'noise') ac = vpk / Math.sqrt(3);
//       else if (wave === 'dc') ac = 0;
//       return Math.sqrt(ac * ac + effectiveOffset * effectiveOffset);
//     };

//     const _drawChannelBay = (cx, cy, cw, ch, isEn, title, col, wave, freq, vpp, off, phs, duty, loadMode, modMode) => {
//       ctx.fillStyle = '#11141b';
//       drawRRect(ctx, cx, cy, cw, ch, 5);
//       ctx.fill();

//       // Top Header Line
//       ctx.fillStyle = isEn ? col : '#3b4350';
//       ctx.fillRect(cx, cy, cw, 2);

//       // Title & Load Indicator
//       ctx.fillStyle = isEn ? col : '#627083';
//       ctx.font = 'bold 9px monospace';
//       ctx.textAlign = 'left';
//       ctx.fillText(title, cx + 6, cy + 12);

//       ctx.fillStyle = loadMode === '50' ? '#ffaa00' : '#526072';
//       ctx.font = 'bold 7px monospace';
//       ctx.fillText(loadMode === '50' ? '50Ω' : 'High-Z', cx + 32, cy + 12);

//       // Wave Badge
//       const waveMap = {
//         sine: 'SIN', square: 'SQR', triangle: 'TRI', sawtooth: 'SAW',
//         ramp_down: 'RAMP', pulse: 'PULSE', exp_rise: 'EXP', noise: 'NOISE', dc: 'DC'
//       };
//       ctx.fillStyle = '#1c222d';
//       drawRRect(ctx, cx + cw - 38, cy + 3, 34, 12, 3);
//       ctx.fill();
//       ctx.fillStyle = isEn ? '#ffffff' : '#627083';
//       ctx.font = 'bold 7px monospace';
//       ctx.textAlign = 'center';
//       ctx.fillText(waveMap[wave] || 'SIN', cx + cw - 21, cy + 11);

//       // Matrix Data
//       ctx.fillStyle = '#899bb0';
//       ctx.font = '8px monospace';
//       ctx.textAlign = 'left';
//       const col2 = cx + cw / 2 + 2;

//       ctx.fillText('F:' + _fmtFreq(freq), cx + 6, cy + 27);
//       ctx.fillText('A:' + vpp.toFixed(2) + 'Vpp', cx + 6, cy + 40);
//       ctx.fillText('O:' + (off >= 0 ? '+' : '') + off.toFixed(1) + 'V', cx + 6, cy + 53);

//       ctx.fillText('P:' + phs + '°', col2, cy + 27);
//       ctx.fillText('D:' + duty + '%', col2, cy + 40);
//       ctx.fillStyle = isEn ? col : '#899bb0';
//       ctx.fillText('~' + _calcVrms(wave, vpp, off, loadMode).toFixed(2) + 'V', col2, cy + 53);

//       // Modulation Active Tag
//       if (modMode && modMode !== 'none') {
//         ctx.fillStyle = '#ffaa00';
//         ctx.font = 'bold 6px sans-serif';
//         ctx.fillText('MOD:' + modMode.toUpperCase(), cx + 6, cy + 66);
//       }
//     };

//     _drawChannelBay(
//       scrX, cardY, cardW, cardH, props.ch1_en !== false,
//       'CH1', '#00f0ff', props.ch1_wave || 'sine', f1,
//       props.ch1_amp ?? 5.0, props.ch1_offset || 0, props.ch1_phase || 0, props.ch1_duty ?? 50,
//       props.ch1_load || 'highz', props.ch1_mod || 'none'
//     );

//     _drawChannelBay(
//       scrX + cardW + 8, cardY, cardW, cardH, props.ch2_en !== false,
//       'CH2', '#ff2a70', props.ch2_wave || 'square', f2,
//       props.ch2_amp ?? 3.3, props.ch2_offset || 0, phs2, props.ch2_duty ?? 50,
//       props.ch2_load || 'highz', props.ch2_mod || 'none'
//     );

//     // ── Metallic BNC Terminals with Ground Lug ──
//     const _drawBNCPort = (px, py, label, col, isSignal) => {
//       // Outer Nut Flange
//       ctx.fillStyle = '#424956';
//       ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
//       // Metallic Shield Ring
//       const metalGrad = ctx.createLinearGradient(px - 6, py - 6, px + 6, py + 6);
//       metalGrad.addColorStop(0, '#d6dee8');
//       metalGrad.addColorStop(0.5, '#8592a3');
//       metalGrad.addColorStop(1, '#475161');
//       ctx.fillStyle = metalGrad;
//       ctx.beginPath(); ctx.arc(px, py, 6.5, 0, Math.PI * 2); ctx.fill();
//       // Insulating Black Ring
//       ctx.fillStyle = '#0a0c0f';
//       ctx.beginPath(); ctx.arc(px, py, 4.2, 0, Math.PI * 2); ctx.fill();
//       // Gold Center Pin / Receptacle Terminal
//       ctx.fillStyle = isSignal ? (col || '#ffd700') : '#778899';
//       ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();

//       // Terminal Labeling
//       ctx.fillStyle = col || '#899bb0';
//       ctx.font = 'bold 7px sans-serif';
//       ctx.textAlign = 'center';
//       ctx.fillText(label, px, py + 14);
//     };

//     _drawBNCPort(70,  198, 'CH1 OUT', '#00f0ff', true);
//     _drawBNCPort(100, 198, 'GND',     '#7a889b', false);
//     _drawBNCPort(220, 198, 'CH2 OUT', '#ff2a70', true);
//     _drawBNCPort(250, 198, 'GND',     '#7a889b', false);

//     // Selection Halo
//     if (inst.selected && typeof drawSelectionRect === 'function') {
//       drawSelectionRect(ctx, -4, -4, W + 8, H + 8);
//     }

//     ctx.restore();
//   }
// });

// function _fmtFreq(hz) {
//   if (hz >= 1e6) return (hz / 1e6).toFixed(2) + 'MHz';
//   if (hz >= 1e3) return (hz / 1e3).toFixed(1) + 'kHz';
//   return hz.toFixed(1) + 'Hz';
// }