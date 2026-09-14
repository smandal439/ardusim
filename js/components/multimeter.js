'use strict';

/* ═══════════════════════════════════════════════════════
   Precision True-RMS Digital Multimeter (6000-Count)
   ═══════════════════════════════════════════════════════ */

defComp({
  id: 'multimeter',
  name: 'Digital Multimeter (DMM)',
  category: 'Instruments',
  icon: '🎛️',
  desc: 'True-RMS 6000-count digital multimeter with fast analog bar graph, continuity beeper, diode test, and auto-ranging',

  width: 190,
  height: 185,

  defaultProps: {
    mode: 'V_DC',
    hold: false,
    rel: false,
    range_auto: true,
  },

  interactive: [
    { field: 'mode', label: 'Rotary Dial Mode', type: 'select', options: [
      { value: 'V_DC',  label: 'DC Voltage (V⎓)' },
      { value: 'V_AC',  label: 'AC Voltage True-RMS (V~)' },
      { value: 'MV_DC', label: 'DC Millivolts (mV⎓)' },
      { value: 'RES',   label: 'Resistance (Ω)' },
      { value: 'CONT',  label: 'Continuity (🔊)' },
      { value: 'DIODE', label: 'Diode Test (⯈|)' },
      { value: 'A_DC',  label: 'DC Current (10A / A⎓)' },
      { value: 'A_AC',  label: 'AC Current (A~)' },
    ]},
    { field: 'hold', label: 'Data Hold', type: 'checkbox' },
    { field: 'rel',  label: 'Relative (Δ) Mode', type: 'checkbox' },
  ],

  pins: [
    { id: 'probe_amp', label: '10A',  type: PIN_TYPE.SIGNAL, x: 72,  y: 180,  side: 'bottom' },
    { id: 'probe_com', label: 'COM',  type: PIN_TYPE.GND,    x: 110,  y: 180,  side: 'bottom' },
    { id: 'probe_red', label: 'V/Ω',  type: PIN_TYPE.SIGNAL, x: 148, y: 180,  side: 'bottom' },
  ],

  /**
   * Continuous Measurement & Sampling Engine
   */
  step(inst, sim) {
    const rs = inst.runtimeState = inst.runtimeState || {
      buffer: [],
      bufIdx: 0,
      lastUpdate: 0,
      relOffset: 0,
      frozenText: null,
      frozenUnit: null,
    };
    const props = inst.props || {};
    const mode = props.mode || 'V_DC';

    // Probe Potentials — use _tracePinNet for accurate electrical path tracing
    const CC = window.CircuitCanvas;
    let vRed = 0, vCom = 0, vAmp = 0;
    if (CC && typeof CC._tracePinNet === 'function') {
      const _getNetV = (net) => {
        if (!net || !net.sources || net.sources.length === 0) return 0;
        const best = net.sources.sort((a, b) => b.voltage - a.voltage)[0];
        return best ? best.voltage : 0;
      };
      const redNet = CC._tracePinNet(inst.id, 'probe_red');
      const comNet = CC._tracePinNet(inst.id, 'probe_com');
      const ampNet = CC._tracePinNet(inst.id, 'probe_amp');
      vRed = _getNetV(redNet);
      vCom = _getNetV(comNet);
      vAmp = _getNetV(ampNet);
    } else if (sim && typeof sim.getPinVoltage === 'function') {
      vRed = sim.getPinVoltage(inst, 'probe_red') || 0;
      vCom = sim.getPinVoltage(inst, 'probe_com') || 0;
      vAmp = sim.getPinVoltage(inst, 'probe_amp') || 0;
    }
    const vDiff = vRed - vCom;

    // Buffer for True-RMS sliding window (128 samples)
    if (!rs.buffer || rs.buffer.length !== 128) {
      rs.buffer = new Float32Array(128);
      rs.bufIdx = 0;
    }
    rs.buffer[rs.bufIdx] = (mode === 'A_AC' || mode === 'A_DC') ? (vAmp - vCom) : vDiff;
    rs.bufIdx = (rs.bufIdx + 1) & 127;

    // Hold latch
    if (props.hold) {
      if (!rs.isHeld) {
        rs.isHeld = true;
        rs.heldText = rs.displayText;
        rs.heldUnit = rs.displayUnit;
      }
      return;
    }
    rs.isHeld = false;

    // Display values are computed by updateSimState() in canvas.js using
    // _tracePinNet and _measureResistanceBetween — do NOT overwrite here.
    // Only compute bar graph and mode indicator for this step.

    let bargraph = 0;
    switch (mode) {
      case 'V_DC': case 'MV_DC':
        bargraph = Math.min(Math.abs(mode === 'MV_DC' ? vDiff * 1000 : vDiff) / 10.0, 1.0);
        break;
      case 'V_AC': case 'A_AC': {
        let sumSq = 0;
        for (let i = 0; i < 128; i++) sumSq += rs.buffer[i] * rs.buffer[i];
        const rms = Math.sqrt(sumSq / 128);
        bargraph = Math.min(rms / 10.0, 1.0);
        break;
      }
      case 'A_DC':
        bargraph = Math.min(Math.abs((vAmp - vCom) / 0.01) / 10.0, 1.0);
        break;
      case 'DIODE':
        bargraph = Math.min(Math.max(0, vDiff) / 2.0, 1.0);
        break;
      default:
        bargraph = 0;
    }
    rs.barPct = isNaN(bargraph) ? 0 : Math.max(0, Math.min(1, bargraph));
  },

  _autoScale(val, baseUnit) {
    const abs = Math.abs(val);
    if (abs >= 1e6) return { text: (val / 1e6).toFixed(3), unit: 'M' + baseUnit };
    if (abs >= 1e3) return { text: (val / 1e3).toFixed(3), unit: 'k' + baseUnit };
    if (abs > 0 && abs < 1e-1 && baseUnit === 'V') return { text: (val * 1e3).toFixed(2), unit: 'mV' };
    if (abs > 0 && abs < 1e-1 && baseUnit === 'A') return { text: (val * 1e3).toFixed(2), unit: 'mA' };
    return { text: val.toFixed(3), unit: baseUnit };
  },

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const props = inst.props || {};
    const rs = inst.runtimeState || {};
    const mode = props.mode || 'V_DC';
    const W = 190, H = 185;

    const drawRRect = (c, rx, ry, rw, rh, rad) => {
      if (typeof roundRect === 'function') { roundRect(c, rx, ry, rw, rh, rad); return; }
      c.beginPath();
      c.moveTo(rx + rad, ry);
      c.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
      c.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
      c.arcTo(rx, ry + rh, rx, ry, rad);
      c.arcTo(rx, ry, rx + rw, ry, rad);
      c.closePath();
    };

    ctx.save();
    ctx.translate(x, y);

    // ── Rugged High-Visibility Holster (Yellow/Orange) ──
    const bootGrad = ctx.createLinearGradient(32, 0, W, H - 10);
    bootGrad.addColorStop(0, '#f39c12');
    bootGrad.addColorStop(0.5, '#e67e22');
    bootGrad.addColorStop(1, '#d35400');
    ctx.fillStyle = bootGrad;
    drawRRect(ctx, 32, 0, W - 32, H - 10, 14);
    ctx.fill();

    // Side Grip Ribs
    ctx.fillStyle = '#b84d05';
    for (let ribY = 24; ribY < H - 44; ribY += 12) {
      ctx.fillRect(W - 6, ribY, 4, 6);
    }

    // ── Dark Grey Bezel / Meter Core ──
    const bodyGrad = ctx.createLinearGradient(38, 4, W - 8, H - 14);
    bodyGrad.addColorStop(0, '#2d3436');
    bodyGrad.addColorStop(1, '#1e272e');
    ctx.fillStyle = bodyGrad;
    drawRRect(ctx, 37, 5, W - 43, H - 20, 10);
    ctx.fill();
    ctx.strokeStyle = '#111417';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Brand & Cert Markings
    ctx.fillStyle = '#8395a7';
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TRUE RMS', 45, 17);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f39c12';
    ctx.fillText('CAT IV 600V', W - 14, 17);

    // ── STN Backlit LCD Screen ──
    const lcdX = 44, lcdY = 22, lcdW = W - 56, lcdH = 50;
    ctx.fillStyle = '#9cb89d';
    drawRRect(ctx, lcdX, lcdY, lcdW, lcdH, 4);
    ctx.fill();
    ctx.strokeStyle = '#6f8a70';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // LCD Inset Bezel Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(lcdX, lcdY, lcdW, 6);

    // ── LCD Annunciators (Top Header Line) ──
    ctx.fillStyle = '#1b2a1c';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'left';

    const showHold = props.hold || rs.isHeld;
    const isRel = props.rel;
    ctx.fillText(props.range_auto !== false ? 'AUTO' : 'MANU', lcdX + 4, lcdY + 10);
    if (showHold) ctx.fillText('HOLD', lcdX + 32, lcdY + 10);
    if (isRel) ctx.fillText('\u0394 REL', lcdX + 58, lcdY + 10);

    ctx.textAlign = 'right';
    ctx.fillText(rs.displayMode || 'DC', lcdX + lcdW - 4, lcdY + 10);

    // ── LCD Main Value ──
    const readoutText = rs.isHeld ? (rs.heldText || '0.000') : (rs.displayText || '0.000');
    const readoutUnit = rs.isHeld ? (rs.heldUnit || 'V') : (rs.displayUnit || 'V');

    // Inactive 7-segment background ghost
    ctx.fillStyle = '#8ca68d';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('8.8.8.8', lcdX + lcdW - 30, lcdY + 36);

    // Active Digits
    ctx.fillStyle = '#0f1710';
    ctx.fillText(readoutText, lcdX + lcdW - 30, lcdY + 36);

    // Unit
    ctx.font = 'bold 10px monospace';
    ctx.fillText(readoutUnit, lcdX + lcdW - 4, lcdY + 36);

    // Continuity Beeper Icon + Sound
    if (rs.displayBeep && mode === 'CONT') {
      ctx.fillStyle = '#0f1710';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('\uD83D\uDD0A BEEP', lcdX + 4, lcdY + 36);

      // Play beep tone (only on rising edge to avoid restarting every frame)
      if (!rs._beepOsc) {
        try {
          if (!rs._audioCtx) rs._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const ctx2 = rs._audioCtx;
          if (ctx2.state === 'suspended') ctx2.resume();
          const osc = ctx2.createOscillator();
          const gain = ctx2.createGain();
          osc.type = 'sine';
          osc.frequency.value = 1000;
          gain.gain.value = 0.3;
          osc.connect(gain);
          gain.connect(ctx2.destination);
          osc.start();
          rs._beepOsc = osc;
          rs._beepGain = gain;
        } catch (e) { /* audio not available */ }
      }
    } else {
      // Stop beep when condition clears
      if (rs._beepOsc) {
        try {
          rs._beepGain.gain.setValueAtTime(rs._beepGain.gain.value, rs._audioCtx.currentTime);
          rs._beepGain.gain.linearRampToValueAtTime(0, rs._audioCtx.currentTime + 0.05);
          setTimeout(() => { try { rs._beepOsc.stop(); } catch(e) {} rs._beepOsc = null; rs._beepGain = null; }, 60);
        } catch (e) { rs._beepOsc = null; rs._beepGain = null; }
      }
    }

    // ── Analog Segmented Bar Graph ──
    const barSegments = 24;
    const activeSegs = Math.round((rs.barPct || 0) * barSegments);
    const barX = lcdX + 6;
    const barY = lcdY + 42;
    const segW = (lcdW - 14) / barSegments;

    for (let s = 0; s < barSegments; s++) {
      ctx.fillStyle = s < activeSegs ? '#0f1710' : '#8ca68d';
      ctx.fillRect(barX + s * segW, barY, segW - 1.5, 4);
    }

    // ── Functional Softkeys ──
    const _drawButton = (bx, by, bw, bh, text, isPressed) => {
      ctx.fillStyle = isPressed ? '#e74c3c' : '#3d4752';
      drawRRect(ctx, bx, by, bw, bh, 3);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 6px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, bx + bw / 2, by + bh - 2.5);
    };

    _drawButton(45, 78, 26, 9, 'HOLD', showHold);
    _drawButton(77, 78, 26, 9, 'RANGE', false);
    _drawButton(109, 78, 26, 9, 'REL \u0394', isRel);
    _drawButton(141, 78, 26, 9, 'SELECT', false);

    // ── 3D Physical Rotary Dial ──
    const dialX = W / 2 + 10;
    const dialY = 120;
    const dialR = 21;

    ctx.fillStyle = '#171a1e';
    ctx.beginPath(); ctx.arc(dialX, dialY, dialR + 2, 0, Math.PI * 2); ctx.fill();

    const dialGrad = ctx.createLinearGradient(dialX - dialR, dialY - dialR, dialX + dialR, dialY + dialR);
    dialGrad.addColorStop(0, '#485460');
    dialGrad.addColorStop(0.5, '#2d3436');
    dialGrad.addColorStop(1, '#1e272e');
    ctx.fillStyle = dialGrad;
    ctx.beginPath(); ctx.arc(dialX, dialY, dialR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();

    const modeAngles = {
      V_DC: -120, V_AC: -85, MV_DC: -50, RES: -15,
      CONT: 20, DIODE: 55, A_DC: 90, A_AC: 125,
    };
    const curAngleDeg = modeAngles[mode] || -120;
    const rad = (curAngleDeg * Math.PI) / 180;

    ctx.save();
    ctx.translate(dialX, dialY);
    ctx.rotate(rad);
    ctx.fillStyle = '#ff3838';
    ctx.fillRect(-2, -dialR + 2, 4, 12);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.font = 'bold 7px system-ui, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('V\u23C1', dialX - 25, dialY - 14);
    ctx.fillText('V~', dialX - 16, dialY - 25);
    ctx.fillText('\u03A9', dialX + 16, dialY - 25);
    ctx.fillText('\uD83D\uDD0A', dialX + 27, dialY - 14);
    ctx.fillText('A', dialX + 28, dialY + 14);
    ctx.fillText('OFF', dialX - 26, dialY + 14);

    // ── Bottom Connectors (flush with body) ──
    const connY = H - 28;

    const _drawTerminal = (tx, color, label) => {
      // Terminal ring
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(tx, connY + 8, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(tx, connY + 8, 6, 0, Math.PI * 2); ctx.fill();
      // Gold contact bore
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(tx, connY + 8, 2.5, 0, Math.PI * 2); ctx.fill();
      // Label above terminal
      ctx.fillStyle = color;
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, tx, connY - 4);
    };

    _drawTerminal(72, '#eccc68', '10A');
    _drawTerminal(110, '#484f63', 'COM');
    _drawTerminal(148, '#ff3838', 'V\u03A9\mA');

    // Selection Highlight
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, 28, -4, W - 20, H + 4);
    }

    ctx.restore();
  }
});