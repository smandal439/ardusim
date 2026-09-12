'use strict';

defComp({
  id: 'max98357a',
  name: 'MAX98357A I2S Class-D Amp',
  category: 'audio',
  icon: '🔊',
  desc: '3.2W Monaural Class-D I2S Audio Amplifier with digital input, flexible gain control, dynamic BTL differential output, and shutdown mode.',

  width: 90,
  height: 110,

  defaultProps: {
    label: 'MAX98357A',
    gain: '12dB',           // '3dB', '6dB', '9dB', '12dB', '15dB'
    channel_mode: 'stereo_mix', // 'left', 'right', 'stereo_mix'
  },

  interactive: [
    {
      field: 'gain',
      label: 'Gain Select',
      type: 'select',
      options: [
        { value: '3dB', label: '3 dB' },
        { value: '6dB', label: '6 dB' },
        { value: '9dB', label: '9 dB' },
        { value: '12dB', label: '12 dB (Default)' },
        { value: '15dB', label: '15 dB' },
      ],
    },
    {
      field: 'channel_mode',
      label: 'Channel Mode',
      type: 'select',
      options: [
        { value: 'left', label: 'Left Channel' },
        { value: 'right', label: 'Right Channel' },
        { value: 'stereo_mix', label: 'Stereo Mix (L+R)/2' },
      ],
    },
  ],

  pins: [
    // Speaker Output Terminals (Top)
    { id: 'out_p', label: 'OUT+', type: PIN_TYPE.SIGNAL, x: 30, y: 0, side: 'top' },
    { id: 'out_n', label: 'OUT-', type: PIN_TYPE.SIGNAL, x: 60, y: 0, side: 'top' },

    // Digital & Power Header Pins (Bottom)
    { id: 'lrc', label: 'LRC', type: PIN_TYPE.SIGNAL, x: 12, y: 110, side: 'bottom' },
    { id: 'bclk', label: 'BCLK', type: PIN_TYPE.SIGNAL, x: 24, y: 110, side: 'bottom' },
    { id: 'din', label: 'DIN', type: PIN_TYPE.SIGNAL, x: 36, y: 110, side: 'bottom' },
    { id: 'gain', label: 'GAIN', type: PIN_TYPE.SIGNAL, x: 48, y: 110, side: 'bottom' },
    { id: 'sd', label: 'SD', type: PIN_TYPE.SIGNAL, x: 60, y: 110, side: 'bottom' },
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 72, y: 110, side: 'bottom' },
    { id: 'vin', label: 'VIN', type: PIN_TYPE.POWER, x: 84, y: 110, side: 'bottom' },
  ],

  /**
   * Internal Signal & Class-D Amplifier Engine
   */
  step(inst, sim) {
    if (!inst.runtimeState) {
      inst.runtimeState = { powered: false, active: false, outputV: 0, gainFactor: 4.0 };
    }

    const props = inst.props || {};
    const vVin = (sim && typeof sim.getPinVoltage === 'function') ? sim.getPinVoltage(inst, 'vin') : 0;
    const vGnd = (sim && typeof sim.getPinVoltage === 'function') ? sim.getPinVoltage(inst, 'gnd') : 0;
    const vSd = (sim && typeof sim.getPinVoltage === 'function') ? sim.getPinVoltage(inst, 'sd') : 0;
    const vDin = (sim && typeof sim.getPinVoltage === 'function') ? sim.getPinVoltage(inst, 'din') : 0;

    const vSupply = vVin - vGnd;
    const isPowered = vSupply >= 2.5 && vSupply <= 5.5;

    // SD mode: >1.4V enables amp, <0.16V disables/shutdown
    const isActive = isPowered && (vSd > 0.8 || vSd === 0);

    // Gain lookup
    const gainMap = { '3dB': 1.41, '6dB': 2.0, '9dB': 2.82, '12dB': 4.0, '15dB': 5.62 };
    const gainFactor = gainMap[props.gain] || 4.0;

    let outP = 0;
    let outN = 0;

    if (isActive) {
      // BTL Output centered around VDD / 2
      const centerV = vSupply / 2;
      const audioSignal = (vDin - 1.65);
      const amplified = Math.min(Math.max(audioSignal * (gainFactor / 4.0), -centerV), centerV);

      outP = centerV + amplified;
      outN = centerV - amplified;
    }

    inst.runtimeState.powered = isPowered;
    inst.runtimeState.active = isActive;
    inst.runtimeState.outputV = Math.abs(outP - outN);
    inst.runtimeState.gainFactor = gainFactor;

    if (sim && typeof sim.setPinVoltage === 'function') {
      sim.setPinVoltage(inst, 'out_p', outP);
      sim.setPinVoltage(inst, 'out_n', outN);
    }
  },

  /**
   * Component Render Pipeline
   */
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const props = inst.props || {};
    const state = inst.runtimeState || { powered: false, active: false, outputV: 0 };
    const W = 90, H = 110;

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

    // ── 1. Breakout PCB (Purple Board Style) ──
    const pcbGrad = ctx.createLinearGradient(0, 0, W, H);
    pcbGrad.addColorStop(0, '#3b1d5a');
    pcbGrad.addColorStop(1, '#230f38');
    ctx.fillStyle = pcbGrad;
    drawRRect(ctx, 0, 0, W, H, 6);
    ctx.fill();

    // Silk Screen Outline
    ctx.strokeStyle = '#5c338e';
    ctx.lineWidth = 1.5;
    drawRRect(ctx, 2, 2, W - 4, H - 4, 5);
    ctx.stroke();

    // Plated Mounting Holes
    ctx.fillStyle = '#180a26';
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 1;
    [[6, 8], [W - 6, 8], [6, H - 18], [W - 6, H - 18]].forEach(([hx, hy]) => {
      ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });

    // ── 2. Top Screw Terminal Block (Speaker Out) ──
    ctx.fillStyle = '#2d3748';
    drawRRect(ctx, 18, 2, 54, 20, 3);
    ctx.fill();

    // Screw Terminal Slots
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(24, 6, 12, 12);
    ctx.fillRect(54, 6, 12, 12);

    // Gold Screws
    ctx.fillStyle = '#d4af37';
    ctx.beginPath(); ctx.arc(30, 12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(60, 12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6d1c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(28, 12); ctx.lineTo(32, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(58, 12); ctx.lineTo(62, 12); ctx.stroke();

    // Terminal Silk Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('OUT+', 30, 30);
    ctx.fillText('OUT-', 60, 30);

    // ── 3. Central MAX98357A QFN IC Chip ──
    const chipX = 33, chipY = 44, chipS = 24;
    ctx.fillStyle = '#121316';
    drawRRect(ctx, chipX, chipY, chipS, chipS, 2);
    ctx.fill();
    ctx.strokeStyle = '#2c313a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pin 1 Dot
    ctx.fillStyle = '#666';
    ctx.beginPath(); ctx.arc(chipX + 4, chipY + 4, 1.2, 0, Math.PI * 2); ctx.fill();

    // Chip Markings
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MAX', chipX + 12, chipY + 11);
    ctx.fillText('98357', chipX + 12, chipY + 18);

    // QFN Side Pads
    ctx.fillStyle = '#cbd5e1';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(chipX - 2, chipY + 4 + i * 5, 2, 2.5);
      ctx.fillRect(chipX + chipS, chipY + 4 + i * 5, 2, 2.5);
      ctx.fillRect(chipX + 4 + i * 5, chipY - 2, 2.5, 2);
      ctx.fillRect(chipX + 4 + i * 5, chipY + chipS, 2.5, 2);
    }

    // ── 4. SMD Passive Components ──
    // Ferrite Beads
    ctx.fillStyle = '#334155';
    drawRRect(ctx, 22, 34, 6, 10, 1); ctx.fill();
    drawRRect(ctx, 62, 34, 6, 10, 1); ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(22, 34, 6, 2); ctx.fillRect(22, 42, 6, 2);
    ctx.fillRect(62, 34, 6, 2); ctx.fillRect(62, 42, 6, 2);

    // Capacitors
    ctx.fillStyle = '#b45309';
    drawRRect(ctx, 16, 52, 8, 4, 1); ctx.fill();
    drawRRect(ctx, 66, 52, 8, 4, 1); ctx.fill();

    // Power Indicator LED
    const isLit = state.powered && state.active;
    ctx.fillStyle = isLit ? '#22c55e' : '#334155';
    ctx.beginPath(); ctx.arc(14, 38, 2.5, 0, Math.PI * 2); ctx.fill();
    if (isLit) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.beginPath(); ctx.arc(14, 38, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font = '6px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PWR', 20, 40);

    // ── 5. Silk Screen Branding ──
    ctx.fillStyle = '#e9d5ff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MAX98357A I2S', W / 2, 76);

    ctx.fillStyle = '#c084fc';
    ctx.font = '7px monospace';
    ctx.fillText(`GAIN: ${props.gain || '12dB'}`, W / 2, 86);

    // ── 6. Bottom Pins & Labels ──
    const pins = [
      { x: 12, label: 'LRC' },
      { x: 24, label: 'BCLK' },
      { x: 36, label: 'DIN' },
      { x: 48, label: 'GAIN' },
      { x: 60, label: 'SD' },
      { x: 72, label: 'GND' },
      { x: 84, label: 'VIN' },
    ];

    pins.forEach((p) => {
      ctx.fillStyle = '#180a26';
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, H - 10, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 6.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, H - 18);
    });

    // Selection Halo
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -3, -3, W + 6, H + 6);
    }

    ctx.restore();
  }
});

defComp({
  id: 'speaker_4ohm',
  name: 'Dynamic Loudspeaker',
  category: 'audio',
  icon: '🔊',
  desc: 'Dynamic electrodynamic speaker with differential BTL inputs, real-time physical cone excursion, RMS power calculation, and animated acoustic wave emission.',

  width: 100,
  height: 100,

  defaultProps: {
    label: 'SPEAKER',
    impedance: 4,      // 4Ω, 8Ω, or 16Ω
    power_rating: 3.0, // Maximum Rated Wattage (W)
  },

  // interactive: [
  //   {
  //     field: 'impedance',
  //     label: 'Impedance',
  //     type: 'select',
  //     options: [
  //       { value: 4, label: '4 Ω (3.2W Max @ 5V)' },
  //       { value: 8, label: '8 Ω (1.8W Max @ 5V)' },
  //       { value: 16, label: '16 Ω' },
  //     ],
  //   },
  //   {
  //     field: 'power_rating',
  //     label: 'Power Rating',
  //     min: 0.5,
  //     max: 20.0,
  //     step: 0.5,
  //     unit: 'W',
  //   },
  // ],

  pins: [
    { id: 'pos', label: '+', type: PIN_TYPE.SIGNAL, x: 35, y: 100, side: 'bottom' },
    { id: 'neg', label: '-', type: PIN_TYPE.SIGNAL, x: 65, y: 100, side: 'bottom' },
  ],

  /**
   * Electrodynamic Cone Physics & Power Dissipation Calculations
   */
  step(inst, sim) {
    if (!inst.runtimeState) {
      inst.runtimeState = { vDiff: 0, vRms: 0, power: 0, excursion: 0 };
    }

    const props = inst.props || {};
    const R = Number(props.impedance) || 4;

    // Read differential voltage across speaker voice coil (+) and (-)
    const vPos = (sim && typeof sim.getPinVoltage === 'function') ? sim.getPinVoltage(inst, 'pos') : 0;
    const vNeg = (sim && typeof sim.getPinVoltage === 'function') ? sim.getPinVoltage(inst, 'neg') : 0;

    const vDiff = vPos - vNeg;
    const absV = Math.abs(vDiff);

    // Smooth instantaneous peak voltage into visual RMS approximation
    const prevRms = inst.runtimeState.vRms || 0;
    const targetRms = absV / Math.SQRT2;
    const vRms = prevRms + (targetRms - prevRms) * 0.25;

    // P = V_rms^2 / R
    const power = (vRms * vRms) / R;

    inst.runtimeState.vDiff = vDiff;
    inst.runtimeState.vRms = vRms;
    inst.runtimeState.power = power;

    // Normalized cone displacement offset (-1.0 to +1.0)
    inst.runtimeState.excursion = Math.min(Math.max(vDiff / 5.0, -1.0), 1.0);
  },

  /**
   * Realistic Speaker Canvas Graphic Rendering
   */
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const props = inst.props || {};
    const state = inst.runtimeState || { vDiff: 0, vRms: 0, power: 0, excursion: 0 };
    const t = sim && typeof sim.time === 'number' ? sim.time : performance.now() / 1000;
    const W = 100, H = 100;

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

    const cx = 50, cy = 42;
    const outerR = 36;
    const exc = state.excursion || 0;
    const powerW = state.power || 0;
    const isActive = powerW > 0.005 || Math.abs(state.vDiff) > 0.02;

    // ── 1. Acoustic Sound Waves (Expanding Ripple Effect) ──
    if (isActive) {
      const wavePhase = (t * 7) % 1;
      const numWaves = 3;

      for (let i = 0; i < numWaves; i++) {
        const waveProgress = (wavePhase + i / numWaves) % 1;
        const rWave = outerR + waveProgress * 20;
        const alpha = (1 - waveProgress) * Math.min(powerW * 1.8, 0.75);

        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha.toFixed(2)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, rWave, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // ── 2. Metallic Chassis Basket Outer Rim ──
    const frameGrad = ctx.createRadialGradient(cx - 5, cy - 5, outerR - 10, cx, cy, outerR + 4);
    frameGrad.addColorStop(0, '#3a3f4d');
    frameGrad.addColorStop(0.7, '#1f232c');
    frameGrad.addColorStop(1, '#111318');

    ctx.fillStyle = frameGrad;
    ctx.beginPath(); ctx.arc(cx, cy, outerR + 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0b0c0f'; ctx.lineWidth = 2; ctx.stroke();

    // Screw Mounting Holes
    ctx.fillStyle = '#08090c';
    const holeDist = outerR + 1;
    [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach(ang => {
      const hx = cx + Math.cos(ang) * holeDist;
      const hy = cy + Math.sin(ang) * holeDist;
      ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI * 2); ctx.fill();
    });

    // ── 3. Flexible Rubber Surround Ring ──
    const surroundR = outerR - 2;
    const surroundGrad = ctx.createRadialGradient(cx, cy, surroundR - 8, cx, cy, surroundR);
    surroundGrad.addColorStop(0, '#1c1f26');
    surroundGrad.addColorStop(0.5, '#343a47');
    surroundGrad.addColorStop(1, '#15171d');

    ctx.fillStyle = surroundGrad;
    ctx.beginPath(); ctx.arc(cx, cy, surroundR, 0, Math.PI * 2); ctx.fill();

    // ── 4. Polypropylene Cone (Excursion Motion Scaling) ──
    const coneRadius = Math.max(surroundR - 7 + exc * 1.5, 12);
    const coneGrad = ctx.createRadialGradient(cx + exc * 2, cy + exc * 2, 4, cx, cy, coneRadius);
    coneGrad.addColorStop(0, '#2d3340');
    coneGrad.addColorStop(0.8, '#181b22');
    coneGrad.addColorStop(1, '#0e1014');

    ctx.fillStyle = coneGrad;
    ctx.beginPath(); ctx.arc(cx, cy, coneRadius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#282e3a'; ctx.lineWidth = 1; ctx.stroke();

    // Concentric Texture Ridges
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cx, cy, coneRadius * 0.7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, coneRadius * 0.45, 0, Math.PI * 2); ctx.stroke();

    // ── 5. Dust Cap (Center Dome) ──
    const capR = Math.max(10 + exc * 0.8, 6);
    const capGrad = ctx.createRadialGradient(cx - capR * 0.3, cy - capR * 0.3, 1, cx, cy, capR);
    capGrad.addColorStop(0, '#4a5366');
    capGrad.addColorStop(0.6, '#1a1d26');
    capGrad.addColorStop(1, '#090a0d');

    ctx.fillStyle = capGrad;
    ctx.beginPath(); ctx.arc(cx, cy, capR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#12141a'; ctx.lineWidth = 0.8; ctx.stroke();

    // ── 6. Bottom Terminal Block & Flexible Lead Wires ──
    ctx.fillStyle = '#1c2029';
    drawRRect(ctx, 20, 82, 60, 12, 3);
    ctx.fill();
    ctx.strokeStyle = '#2e3545'; ctx.lineWidth = 1; ctx.stroke();

    // Braided Tinsel Wires
    ctx.strokeStyle = '#a0aab8';
    ctx.lineWidth = 1.2;
    // POS Lead (+)
    ctx.beginPath(); ctx.moveTo(35, 82); ctx.quadraticCurveTo(38, 68, cx - 12, cy + 18); ctx.stroke();
    // NEG Lead (-)
    ctx.beginPath(); ctx.moveTo(65, 82); ctx.quadraticCurveTo(62, 68, cx + 12, cy + 18); ctx.stroke();

    // Solder Terminal Labels
    ctx.fillStyle = '#ff5555';
    ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('+', 35, 91);
    ctx.fillStyle = '#8a99ad';
    ctx.fillText('-', 65, 91);

    // ── 7. Telemetry & Specs Display ──
    const imp = props.impedance || 4;
    ctx.fillStyle = isActive ? '#00f0ff' : '#64748b';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';

    if (isActive) {
      const pDisp = powerW >= 1 ? `${powerW.toFixed(1)}W` : `${(powerW * 1000).toFixed(0)}mW`;
      ctx.fillText(`${imp}Ω | ${pDisp}`, cx, 12);
    } else {
      ctx.fillText(`${imp}Ω / ${props.power_rating || 3}W`, cx, 12);
    }

    // Selection Halo
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -3, -3, W + 6, H + 6);
    }

    ctx.restore();
  }
});