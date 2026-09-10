'use strict';
/* components/sensors.js — Sensor component definitions */


/* -------------- DHT11 Sensor with High-Contrast On-Body Live Data Display ------------------ */
defComp({
  id: 'dht11',
  name: 'DHT11 Sensor',
  category: 'Sensors',
  icon: '🌡️',
  desc: 'Digital temperature and humidity sensor with real-time on-body readout',
  width: 58,
  height: 88,
  defaultProps: { temperature: 25, humidity: 60 },
  interactive: [
    { field: 'temperature', label: 'Temp', min: 0, max: 50, step: 1, unit: '°C' },
    { field: 'humidity', label: 'Hum', min: 0, max: 100, step: 1, unit: '%' },
  ],
  pins: [
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 13, y: 88, side: 'bottom' },
    { id: 'data', label: 'DAT', type: PIN_TYPE.DIGITAL, x: 23, y: 88, side: 'bottom' },
    { id: 'nc', label: 'NC', type: PIN_TYPE.SIGNAL, x: 35, y: 88, side: 'bottom' },
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 45, y: 88, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;

    // Resolve current runtime state or fallback to props
    const temp = (inst.runtimeState && inst.runtimeState.temperature !== undefined)
      ? inst.runtimeState.temperature
      : (inst.props.temperature ?? 25);

    const hum = (inst.runtimeState && inst.runtimeState.humidity !== undefined)
      ? inst.runtimeState.humidity
      : (inst.props.humidity ?? 60);

    ctx.save();
    ctx.translate(x, y);

    // 1. Outer Housing Casing
    ctx.fillStyle = '#0e4194';
    roundRect(ctx, 3, 2, 52, 68, 5);
    ctx.fill();

    // 2. Main Blue Textured Plastic Body
    const bodyGrad = ctx.createLinearGradient(3, 2, 55, 70);
    bodyGrad.addColorStop(0, '#2b7cf8');
    bodyGrad.addColorStop(0.5, '#1964d8');
    bodyGrad.addColorStop(1, '#0e4cae');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 4, 3, 50, 66, 4);
    ctx.fill();

    // Top Rim Highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, 4);
    ctx.lineTo(50, 4);
    ctx.stroke();

    // 3. Sensor Vent Lattice (Top Half)
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const vx = 8 + col * 11;
        const vy = 8 + row * 8;

        // Dark Interior Cavity
        ctx.fillStyle = '#081a3e';
        roundRect(ctx, vx, vy, 8, 5.5, 1);
        ctx.fill();

        // Mesh Texture
        ctx.fillStyle = '#10306b';
        ctx.fillRect(vx + 1.5, vy + 1, 5, 3.5);
      }
    }

    // 4. Silkscreen Sensor ID
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 6.5px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DHT11 SENSOR', 29, 29);

    // 5. High-Contrast Live Data Display Window
    // Display Screen Bezel & Background
    ctx.fillStyle = '#060f1e';
    roundRect(ctx, 7, 33, 44, 26, 3);
    ctx.fill();

    ctx.strokeStyle = '#00c6ff';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Temperature Badge (Row 1)
    ctx.fillStyle = '#ff9800';
    ctx.font = 'bold 5.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('T:', 10, 43);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${temp}°C`, 48, 44);

    // Subtle Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(10, 47);
    ctx.lineTo(48, 47);
    ctx.stroke();

    // Humidity Badge (Row 2)
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 5.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('H:', 10, 55);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${hum}%`, 48, 56);

    // 6. Base Transition Molding & Silkscreen Pin Labels
    ctx.fillStyle = '#0d367c';
    ctx.fillRect(6, 65, 46, 4);

    const pinDefs = [
      { id: 'vcc', label: 'VCC', x: 13 },
      { id: 'data', label: 'DAT', x: 23 },
      { id: 'nc', label: 'NC', x: 35 },
      { id: 'gnd', label: 'GND', x: 45 },
    ];

    pinDefs.forEach(p => {
      // Pin Label Silkscreen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'bold 4.5px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, 64);

      // Pin Header Socket Collar
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(p.x - 2, 69, 4, 3);

      // Metallic Pin Lead
      const pinGrad = ctx.createLinearGradient(p.x - 1, 72, p.x + 1, 72);
      pinGrad.addColorStop(0, '#cfd8dc');
      pinGrad.addColorStop(0.5, '#ffffff');
      pinGrad.addColorStop(1, '#90a4ae');
      ctx.fillStyle = pinGrad;
      ctx.fillRect(p.x - 1.2, 72, 2.4, 16);
    });

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 64, 94);
    ctx.restore();
  }
});

/* ----------------------------Ultrasonic Sensor HC-SR04 -------------------------------- */
defComp({
  id: 'hcsr04',
  name: 'HC-SR04 Ultrasonic Sensor',
  category: 'Sensors',
  icon: '📡',
  desc: 'Authentic HC-SR04 Ultrasonic Ranging Module. Measures distance from 2cm to 400cm with real-time sonar wave visualization and high-precision transducer geometry.',
  width: 100,
  height: 85,
  defaultProps: { distance: 20 },
  interactive: [
    { field: 'distance', label: 'Distance', min: 2, max: 400, step: 1, unit: ' cm' },
  ],
  pins: [
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 16, y: 0, side: 'top' },
    { id: 'trig', label: 'TRIG', type: PIN_TYPE.DIGITAL, x: 38, y: 0, side: 'top' },
    { id: 'echo', label: 'ECHO', type: PIN_TYPE.DIGITAL, x: 60, y: 0, side: 'top' },
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 82, y: 0, side: 'top' },
  ],
  step(inst, sim) {
    if (!sim || !sim.isRunning) return;
    const canvas = window.CircuitCanvas;
    if (!canvas || !canvas._getConnectedPinNum) return;

    const trigPin = canvas._getConnectedPinNum(inst.id, 'trig');
    const echoPin = canvas._getConnectedPinNum(inst.id, 'echo');
    if (trigPin === null || echoPin === null) return;

    const trigKey = `pin_${trigPin}`;
    const echoKey = `pin_${echoPin}`;
    const trigHigh = !!sim.pinStates[trigKey];
    const prevTrigHigh = !!(inst.runtimeState && inst.runtimeState._prevTrig);
    const distance = Number(
      inst.runtimeState && inst.runtimeState.distance !== undefined
        ? inst.runtimeState.distance
        : inst.props.distance
    ) || 20;
    const simMs = sim.simTime || 0;

    // Trigger pulse detection (10µs trigger pulse falling edge)
    if (prevTrigHigh && !trigHigh) {
      const echoDurationUs = Math.max(116, Math.round(distance * 58)); // 58 µs per cm
      inst.runtimeState._echoEndMs = simMs + (echoDurationUs / 1000);
      inst.runtimeState._lastTrigTime = simMs;
      sim.pinStates[echoKey] = 1;
      sim._emitPinChange(echoKey, 1);
    }

    // Terminate echo pulse
    if (inst.runtimeState._echoEndMs && simMs >= inst.runtimeState._echoEndMs) {
      sim.pinStates[echoKey] = 0;
      sim._emitPinChange(echoKey, 0);
      inst.runtimeState._echoEndMs = null;
    }

    if (!inst.runtimeState) inst.runtimeState = {};
    inst.runtimeState._prevTrig = trigHigh;
  },
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const dist = (inst.runtimeState && inst.runtimeState.distance !== undefined)
      ? inst.runtimeState.distance
      : ((inst.props && inst.props.distance) || 20);
    const pct = Math.max(0, Math.min(1, (dist - 2) / 398));
    const isRunning = !!(sim && sim.isRunning);
    const simMs = sim ? (sim.simTime || 0) : 0;

    ctx.save();
    ctx.translate(x, y);

    // --- Helper Routine for Rounded Rectangles ---
    const drawRR = (rx, ry, rw, rh, rad = 3) => {
      ctx.beginPath();
      if (typeof roundRect === 'function') {
        roundRect(ctx, rx, ry, rw, rh, rad);
      } else if (ctx.roundRect) {
        ctx.roundRect(rx, ry, rw, rh, rad);
      } else {
        ctx.rect(rx, ry, rw, rh);
      }
    };

    // --- 1. PCB Drop Shadow & Blue Substrate ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    drawRR(2, 8, 96, 36, 4);
    ctx.fill();

    // Classic Blue HC-SR04 PCB Gradient
    const pcbGrad = ctx.createLinearGradient(0, 6, 100, 42);
    pcbGrad.addColorStop(0, '#1a56a6');
    pcbGrad.addColorStop(0.5, '#124182');
    pcbGrad.addColorStop(1, '#0b2b57');
    ctx.fillStyle = pcbGrad;
    drawRR(0, 6, 100, 36, 4);
    ctx.fill();

    // Copper Edge Chamfer & Silkscreen Border Line
    ctx.strokeStyle = '#081d3d';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 0.7;
    drawRR(2, 8, 96, 32, 2);
    ctx.stroke();

    // Gold Corner Mounting Holes
    [[5, 11], [95, 11], [5, 37], [95, 37]].forEach(([hx, hy]) => {
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(hx, hy, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#081d3d';
      ctx.beginPath(); ctx.arc(hx, hy, 1.4, 0, Math.PI * 2); ctx.fill();
    });

    // --- 2. SMD Components & Crystal Oscillator ---
    // 8MHz Crystal Oscillator (HC-49S Silver Oval Package)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    drawRR(45, 18, 10, 6, 3); ctx.fill();
    const xtalGrad = ctx.createLinearGradient(45, 17, 55, 23);
    xtalGrad.addColorStop(0, '#e6e6e6');
    xtalGrad.addColorStop(0.5, '#ffffff');
    xtalGrad.addColorStop(1, '#999999');
    ctx.fillStyle = xtalGrad;
    drawRR(45, 17, 10, 6, 3); ctx.fill();
    ctx.strokeStyle = '#666666'; ctx.lineWidth = 0.5; ctx.stroke();

    // SMD Microcontroller IC (Max232 / LM324 Sub-circuit)
    ctx.fillStyle = '#181818';
    drawRR(43, 27, 14, 8, 1); ctx.fill();
    ctx.fillStyle = '#444444';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(44 + i * 3, 25.5, 1.5, 1.5); // Top leads
      ctx.fillRect(44 + i * 3, 35, 1.5, 1.5);   // Bottom leads
    }
    // IC Pin 1 Dot
    ctx.fillStyle = '#666';
    ctx.beginPath(); ctx.arc(45, 29, 0.8, 0, Math.PI * 2); ctx.fill();

    // Passives (Resistors & Capacitors)
    ctx.fillStyle = '#222';
    [[11, 28], [11, 33], [86, 28], [86, 33]].forEach(([rx, ry]) => {
      ctx.fillRect(rx, ry, 3, 1.8);
      ctx.fillStyle = '#aaa';
      ctx.fillRect(rx, ry, 0.6, 1.8);
      ctx.fillRect(rx + 2.4, ry, 0.6, 1.8);
      ctx.fillStyle = '#222';
    });

    // --- 3. Ultrasonic Transducer Cans (T & R) ---
    const drawTransducer = (cx, cy, label) => {
      // Outer Casing Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.arc(cx + 1, cy + 1, 15, 0, Math.PI * 2); ctx.fill();

      // Metallic Aluminum Can Outer Bezel
      const canGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 15);
      canGrad.addColorStop(0, '#ffffff');
      canGrad.addColorStop(0.4, '#d0d5dd');
      canGrad.addColorStop(0.8, '#858e99');
      canGrad.addColorStop(1, '#4b525a');
      ctx.fillStyle = canGrad;
      ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();

      // Inner Dark Chamber Recess
      const innerGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 11);
      innerGrad.addColorStop(0, '#111317');
      innerGrad.addColorStop(0.8, '#23272e');
      innerGrad.addColorStop(1, '#515861');
      ctx.fillStyle = innerGrad;
      ctx.beginPath(); ctx.arc(cx, cy, 11.5, 0, Math.PI * 2); ctx.fill();

      // Mesh Screen Pattern (Diagonal Metallic Mesh Grille)
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = 'rgba(200, 210, 220, 0.35)';
      ctx.lineWidth = 0.6;
      for (let i = -12; i <= 12; i += 3) {
        ctx.beginPath(); ctx.moveTo(cx + i - 12, cy - 12); ctx.lineTo(cx + i + 12, cy + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + i + 12, cy - 12); ctx.lineTo(cx + i - 12, cy + 12); ctx.stroke();
      }

      // Central Piezoceramic Element Core
      const piezoGrad = ctx.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, 4.5);
      piezoGrad.addColorStop(0, '#4a5059');
      piezoGrad.addColorStop(0.7, '#1a1d21');
      piezoGrad.addColorStop(1, '#0d0e10');
      ctx.fillStyle = piezoGrad;
      ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#606873'; ctx.lineWidth = 0.5; ctx.stroke();

      ctx.restore();

      // Silkscreen Label under/near Transducers
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, cx, cy + 20);
    };

    // Draw Left (Transmitter 'T') & Right (Receiver 'R') Cans
    drawTransducer(26, 22, 'T');
    drawTransducer(74, 22, 'R');

    // --- 4. Ultrasonic Pulse Wave Animation ---
    if (isRunning) {
      const activePulse = inst.runtimeState && inst.runtimeState._lastTrigTime && (simMs - inst.runtimeState._lastTrigTime < 150);
      const waveAlpha = activePulse ? 0.85 : 0.35;
      const waveOffset = (simMs / 15) % 12;

      ctx.save();
      ctx.strokeStyle = `rgba(0, 229, 255, ${waveAlpha})`;
      ctx.lineWidth = 1.2;
      for (let r = 16 + waveOffset; r <= 36; r += 8) {
        const alphaArc = Math.max(0, 1 - (r / 38)) * waveAlpha;
        ctx.strokeStyle = `rgba(0, 229, 255, ${alphaArc})`;
        ctx.beginPath();
        ctx.arc(26, 22, r, -Math.PI / 4, Math.PI / 4);
        ctx.stroke();
      }
      ctx.restore();
    }

    // --- 5. Pin Headers & Silkscreen Markings ---
    // Black Header Base Shroud
    ctx.fillStyle = '#111111';
    drawRR(10, 3.5, 80, 5, 1); ctx.fill();

    // Standard Pin Positions [16, 38, 60, 82]
    const pinXList = [16, 38, 60, 82];
    pinXList.forEach(px => {
      // Gold Square Contact Pad
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(px - 1.5, 4, 3, 4);

      // Metallic Header Pin Lead
      const pinGrad = ctx.createLinearGradient(px - 1, 0, px + 1, 0);
      pinGrad.addColorStop(0, '#999999');
      pinGrad.addColorStop(0.5, '#ffffff');
      pinGrad.addColorStop(1, '#666666');
      ctx.fillStyle = pinGrad;
      ctx.fillRect(px - 0.8, 0, 1.6, 6);
    });

    // PCB Silkscreen Model Name & Pin Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 5.5px "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HC-SR04', 50, 14);

    ctx.font = 'bold 4px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText('VCC', 16, 11);
    ctx.fillText('TRIG', 38, 11);
    ctx.fillText('ECHO', 60, 11);
    ctx.fillText('GND', 82, 11);

    // --- 6. Lower Distance HUD Panel ---
    const hudY = 46;
    ctx.fillStyle = '#080c14';
    drawRR(-2, hudY, 104, 38, 5);
    ctx.fill();
    ctx.strokeStyle = isRunning ? 'rgba(0, 229, 255, 0.4)' : 'rgba(60, 70, 85, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // HUD Header Label
    ctx.fillStyle = isRunning ? '#80deea' : '#546e7a';
    ctx.font = 'bold 6px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TARGET DISTANCE', 4, hudY + 11);

    // Numeric Distance Readout
    ctx.fillStyle = isRunning ? '#00e5ff' : '#607d8b';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(dist)}`, 76, hudY + 15);

    // Unit Label
    ctx.fillStyle = isRunning ? 'rgba(0, 229, 255, 0.75)' : '#455a64';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('cm', 79, hudY + 15);

    // Interactive Track Bar (2cm - 400cm)
    const barX = 4, barY = hudY + 20, barW = 92, barH = 5;
    ctx.fillStyle = '#121924';
    drawRR(barX, barY, barW, barH, barH / 2);
    ctx.fill();

    if (pct > 0.005) {
      const fillGrad = ctx.createLinearGradient(barX, 0, barX + pct * barW, 0);
      fillGrad.addColorStop(0, isRunning ? '#00838f' : '#37474f');
      fillGrad.addColorStop(1, isRunning ? '#00e5ff' : '#78909c');
      ctx.fillStyle = fillGrad;
      drawRR(barX, barY, Math.max(barH, pct * barW), barH, barH / 2);
      ctx.fill();
    }

    // Slider Knob / Indicator
    const thumbX = barX + pct * barW;
    ctx.fillStyle = isRunning ? '#e0f7fa' : '#cfd8dc';
    ctx.beginPath(); ctx.arc(thumbX, barY + barH / 2, 3.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = isRunning ? '#00e5ff' : '#78909c';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Scale Min / Max Labels
    ctx.fillStyle = 'rgba(140, 160, 180, 0.6)';
    ctx.font = '5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('2cm', barX, barY + barH + 7);
    ctx.textAlign = 'right';
    ctx.fillText('400cm', barX + barW, barY + barH + 7);

    // Selection Box Overlay
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -4, 0, 108, 86);
    }

    ctx.restore();
  }
});

// defComp({
//   id: 'hcsr04',
//   name: 'HC-SR04 Ultrasonic',
//   category: 'Sensors',
//   icon: '📡',
//   desc: 'Ultrasonic distance sensor — measures 2cm to 400cm range. Drag the slider to set distance.',
//   width: 90,
//   height: 85,
//   defaultProps: { distance: 20 },
//   interactive: [
//     { field: 'distance', label: 'Distance', min: 2, max: 400, step: 1, unit: ' cm' },
//   ],
//   pins: [
//     { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 10, y: 0, side: 'top' },
//     { id: 'trig', label: 'TRIG', type: PIN_TYPE.DIGITAL, x: 30, y: 0, side: 'top' },
//     { id: 'echo', label: 'ECHO', type: PIN_TYPE.DIGITAL, x: 54, y: 0, side: 'top' },
//     { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 74, y: 0, side: 'top' },
//   ],
//   step(inst, sim) {
//     if (!sim || !sim.isRunning) return;
//     const canvas = window.CircuitCanvas;
//     if (!canvas || !canvas._getConnectedPinNum) return;

//     const trigPin = canvas._getConnectedPinNum(inst.id, 'trig');
//     const echoPin = canvas._getConnectedPinNum(inst.id, 'echo');
//     if (trigPin === null || echoPin === null) return;

//     const trigKey = `pin_${trigPin}`;
//     const echoKey = `pin_${echoPin}`;
//     const trigHigh = !!sim.pinStates[trigKey];
//     const prevTrigHigh = !!inst.runtimeState._prevTrig;
//     const distance = Number(inst.runtimeState && inst.runtimeState.distance !== undefined ? inst.runtimeState.distance : inst.props.distance) || 20;
//     const simMs = sim.simTime || 0;

//     // Detect falling edge of trigger (end of 10 µs pulse)
//     if (prevTrigHigh && !trigHigh) {
//       const echoDurationUs = Math.max(100, Math.round(distance * 58));
//       inst.runtimeState._echoEndMs = simMs + (echoDurationUs / 1000);
//       sim.pinStates[echoKey] = 1;
//       sim._emitPinChange(echoKey, 1);
//     }

//     // End echo pulse when time expires
//     if (inst.runtimeState._echoEndMs && simMs >= inst.runtimeState._echoEndMs) {
//       sim.pinStates[echoKey] = 0;
//       sim._emitPinChange(echoKey, 0);
//       inst.runtimeState._echoEndMs = null;
//     }

//     inst.runtimeState._prevTrig = trigHigh;
//   },
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const dist = (inst.runtimeState && inst.runtimeState.distance !== undefined)
//       ? inst.runtimeState.distance : ((inst.props && inst.props.distance) || 20);
//     const pct = Math.max(0, Math.min(1, (dist - 2) / 398));
//     const isRunning = !!(sim && sim.isRunning);

//     ctx.save();
//     ctx.translate(x, y);

//     // PCB shadow
//     ctx.fillStyle = 'rgba(0,0,0,0.18)';
//     roundRect(ctx, 2, 10, 90, 34, 5);
//     ctx.fill();

//     // PCB
//     ctx.fillStyle = '#0d3d0d';
//     roundRect(ctx, 0, 8, 90, 34, 5);
//     ctx.fill();
//     ctx.strokeStyle = '#2d8c2d';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // Transducer circles (eyes)
//     [20, 62].forEach(cx => {
//       ctx.fillStyle = '#999';
//       ctx.beginPath(); ctx.arc(cx, 24, 13, 0, Math.PI * 2); ctx.fill();
//       ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1; ctx.stroke();
//       ctx.fillStyle = '#444';
//       ctx.beginPath(); ctx.arc(cx, 24, 9, 0, Math.PI * 2); ctx.fill();
//       ctx.fillStyle = '#666';
//       ctx.beginPath(); ctx.arc(cx, 24, 5.5, 0, Math.PI * 2); ctx.fill();
//       // Inner highlight
//       ctx.fillStyle = 'rgba(255,255,255,0.08)';
//       ctx.beginPath(); ctx.arc(cx - 2, 22, 3, 0, Math.PI * 2); ctx.fill();
//     });

//     // HC-SR04 label
//     ctx.fillStyle = '#b0b0b0';
//     ctx.font = 'bold 6.5px sans-serif';
//     ctx.textAlign = 'center';
//     ctx.fillText('HC-SR04', 45, 37);

//     // Pin leads
//     ctx.strokeStyle = '#c8a84b';
//     ctx.lineWidth = 1.5;
//     [10, 30, 54, 74].forEach(px => {
//       ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, 8); ctx.stroke();
//     });

//     // ── Distance display panel below the PCB ──
//     // Background
//     ctx.fillStyle = '#0a0e13';
//     roundRect(ctx, -2, 44, 94, 38, 4);
//     ctx.fill();
//     ctx.strokeStyle = isRunning ? 'rgba(0,229,255,0.35)' : 'rgba(60,65,75,0.5)';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // "DISTANCE" label
//     ctx.fillStyle = isRunning ? 'rgba(200,220,240,0.7)' : 'rgba(130,140,150,0.6)';
//     ctx.font = `bold ${6}px "JetBrains Mono", monospace`;
//     ctx.textAlign = 'left';
//     ctx.fillText('DISTANCE', 4, 55);

//     // Distance value (large)
//     ctx.fillStyle = isRunning ? '#00e5ff' : '#546e7a';
//     ctx.font = `bold ${14}px "JetBrains Mono", monospace`;
//     ctx.textAlign = 'right';
//     ctx.fillText(`${Math.round(dist)}`, 72, 58);

//     // Unit
//     ctx.fillStyle = isRunning ? 'rgba(0,229,255,0.7)' : 'rgba(100,120,130,0.6)';
//     ctx.font = `bold ${8}px "JetBrains Mono", monospace`;
//     ctx.textAlign = 'left';
//     ctx.fillText('cm', 75, 58);

//     // Range bar (2–400 cm)
//     const barX = 4, barY = 63, barW = 82, barH = 5;
//     ctx.fillStyle = '#1a2230';
//     roundRect(ctx, barX, barY, barW, barH, barH / 2);
//     ctx.fill();
//     if (pct > 0.01) {
//       const grad = ctx.createLinearGradient(barX, 0, barX + pct * barW, 0);
//       grad.addColorStop(0, isRunning ? 'rgba(0,200,255,0.4)' : 'rgba(80,100,110,0.3)');
//       grad.addColorStop(1, isRunning ? '#00e5ff' : '#546e7a');
//       ctx.fillStyle = grad;
//       roundRect(ctx, barX, barY, Math.max(barH, pct * barW), barH, barH / 2);
//       ctx.fill();
//     }
//     // Thumb dot
//     const thumbX = barX + pct * barW;
//     ctx.fillStyle = isRunning ? '#b2ebf2' : '#90a4ae';
//     ctx.beginPath(); ctx.arc(thumbX, barY + barH / 2, 3.5, 0, Math.PI * 2); ctx.fill();
//     ctx.strokeStyle = 'rgba(255,255,255,0.5)';
//     ctx.lineWidth = 0.7;
//     ctx.stroke();

//     // Min/Max labels
//     ctx.fillStyle = 'rgba(140,160,170,0.5)';
//     ctx.font = `${5}px "JetBrains Mono", monospace`;
//     ctx.textAlign = 'left';
//     ctx.fillText('2', barX, barY + barH + 7);
//     ctx.textAlign = 'right';
//     ctx.fillText('400 cm', barX + barW, barY + barH + 7);

//     if (inst.selected) drawSelectionRect(ctx, -5, 5, 100, 80);
//     ctx.restore();
//   }
// });

/*---------------------------LDR Photoresistor ------------------------------------------ */
defComp({
  id: 'ldr',
  name: 'LDR Photoresistor Module',
  category: 'Sensors',
  icon: '💡',
  desc: 'Authentic Cadmium Sulfide (CdS) Photoresistor Module with voltage divider sub-circuit, dynamic light level aura, and real-time lux readout.',
  width: 50,
  height: 60,
  defaultProps: { light: 512 },
  interactive: [
    { field: 'light', label: 'Light Level', min: 0, max: 1023, step: 1, unit: ' lx' },
  ],
  pins: [
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 10, y: 60, side: 'bottom' },
    { id: 'a', label: 'AO', type: PIN_TYPE.ANALOG, x: 25, y: 60, side: 'bottom' },
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 40, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const light = (inst.runtimeState && inst.runtimeState.light !== undefined)
      ? inst.runtimeState.light
      : ((inst.props && inst.props.light) || 512);
    const pct = Math.max(0, Math.min(1, light / 1023));
    const isRunning = !!(sim && sim.isRunning);

    ctx.save();
    ctx.translate(x, y);

    // --- Safe Rounded Rect Helper ---
    const drawRR = (rx, ry, rw, rh, rad = 3) => {
      ctx.beginPath();
      if (typeof roundRect === 'function') {
        roundRect(ctx, rx, ry, rw, rh, rad);
      } else if (ctx.roundRect) {
        ctx.roundRect(rx, ry, rw, rh, rad);
      } else {
        ctx.rect(rx, ry, rw, rh);
      }
    };

    // --- 1. PCB Substrate & Shadow ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    drawRR(2, 4, 46, 52, 4);
    ctx.fill();

    // Dark Matte Sensor Module PCB Gradient
    const pcbGrad = ctx.createLinearGradient(0, 2, 50, 54);
    pcbGrad.addColorStop(0, '#1c2430');
    pcbGrad.addColorStop(0.5, '#121822');
    pcbGrad.addColorStop(1, '#0a0d14');
    ctx.fillStyle = pcbGrad;
    drawRR(0, 2, 50, 52, 4);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.8;
    drawRR(1.5, 3.5, 47, 49, 3);
    ctx.stroke();

    // Corner Gold Mounting Hole Rings
    [[5, 7], [45, 7]].forEach(([hx, hy]) => {
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a0d14';
      ctx.beginPath(); ctx.arc(hx, hy, 1, 0, Math.PI * 2); ctx.fill();
    });

    // --- 2. Ambient Light Dynamic Rays & Photonic Aura ---
    const centerX = 25, centerY = 20;

    if (pct > 0.02) {
      ctx.save();
      const auraGlow = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, 22);
      auraGlow.addColorStop(0, `rgba(255, 235, 120, ${pct * 0.55})`);
      auraGlow.addColorStop(0.6, `rgba(255, 200, 50, ${pct * 0.25})`);
      auraGlow.addColorStop(1, 'rgba(255, 200, 50, 0)');
      ctx.fillStyle = auraGlow;
      ctx.beginPath(); ctx.arc(centerX, centerY, 22, 0, Math.PI * 2); ctx.fill();

      // Incoming Light Rays
      ctx.strokeStyle = `rgba(255, 240, 150, ${Math.min(0.9, pct * 0.85)})`;
      ctx.lineWidth = 1;
      if (pct > 0.4) { ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 4; }

      [[-10, -8], [0, -12], [10, -8]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(centerX + dx * 1.5, centerY + dy * 1.5);
        ctx.lineTo(centerX + dx * 0.6, centerY + dy * 0.6);
        ctx.stroke();
      });
      ctx.restore();
    }

    // --- 3. Cadmium Sulfide (CdS) Sensor Cell ---
    // Ceramic Base Disc
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath(); ctx.arc(centerX + 0.8, centerY + 0.8, 12, 0, Math.PI * 2); ctx.fill();

    const ceramicGrad = ctx.createRadialGradient(centerX - 2, centerY - 2, 1, centerX, centerY, 12);
    ceramicGrad.addColorStop(0, '#f2ece1');
    ceramicGrad.addColorStop(0.7, '#dcd3c3');
    ceramicGrad.addColorStop(1, '#b0a593');
    ctx.fillStyle = ceramicGrad;
    ctx.beginPath(); ctx.arc(centerX, centerY, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8c806f'; ctx.lineWidth = 0.8; ctx.stroke();

    // Interlocking Metallic Electrodes (Comb pattern)
    ctx.strokeStyle = '#9ca5b0';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY - 4); ctx.lineTo(centerX + 3, centerY - 4);
    ctx.moveTo(centerX - 3, centerY); ctx.lineTo(centerX + 8, centerY);
    ctx.moveTo(centerX - 8, centerY + 4); ctx.lineTo(centerX + 3, centerY + 4);
    ctx.stroke();

    // Wavy Reddish-Orange Cadmium Sulfide (CdS) Zig-Zag Track
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY - 6);
    ctx.lineTo(centerX + 7, centerY - 6);
    ctx.lineTo(centerX + 7, centerY - 2);
    ctx.lineTo(centerX - 7, centerY - 2);
    ctx.lineTo(centerX - 7, centerY + 2);
    ctx.lineTo(centerX + 7, centerY + 2);
    ctx.lineTo(centerX + 7, centerY + 6);
    ctx.lineTo(centerX - 8, centerY + 6);
    ctx.stroke();

    // Translucent Resin Glass Epoxy Dome Highlight
    const domeGrad = ctx.createRadialGradient(centerX - 3, centerY - 4, 1, centerX, centerY, 11);
    domeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    domeGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.1)');
    domeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    ctx.fillStyle = domeGrad;
    ctx.beginPath(); ctx.arc(centerX, centerY, 11.5, 0, Math.PI * 2); ctx.fill();

    // --- 4. Voltage Divider Resistor & Sub-components ---
    // SMD 10k Divider Resistor
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(8, 36, 5, 2.5);
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(8, 36, 1, 2.5);
    ctx.fillRect(12, 36, 1, 2.5);

    // Power Indicator LED
    ctx.fillStyle = isRunning ? '#ff3333' : '#441111';
    if (isRunning) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 4; }
    ctx.beginPath(); ctx.arc(42, 37, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // --- 5. Pin Header Block (Bottom - Pins: 10, 25, 40) ---
    ctx.fillStyle = '#111111';
    drawRR(4, 50, 42, 4, 1); ctx.fill();

    const pinXList = [10, 25, 40];
    pinXList.forEach(px => {
      // Gold Contact Pad
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(px - 1.5, 50, 3, 3);

      // Silver Terminal Lead
      const leadGrad = ctx.createLinearGradient(px - 0.8, 52, px + 0.8, 60);
      leadGrad.addColorStop(0, '#cccccc');
      leadGrad.addColorStop(0.5, '#ffffff');
      leadGrad.addColorStop(1, '#888888');
      ctx.fillStyle = leadGrad;
      ctx.fillRect(px - 0.8, 53, 1.6, 7);
    });

    // --- 6. Silkscreen Labels & Mini Lux HUD ---
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 3.2px monospace';
    ctx.textAlign = 'center';

    ctx.fillText('VCC', 10, 48);
    ctx.fillText('AO', 25, 48);
    ctx.fillText('GND', 40, 48);

    // Mini Lux Display Panel
    ctx.fillStyle = '#080c14';
    drawRR(12, 40, 26, 6, 1.5);
    ctx.fill();
    ctx.strokeStyle = isRunning ? 'rgba(0, 229, 255, 0.4)' : 'rgba(60, 70, 85, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.fillStyle = isRunning ? '#00e5ff' : '#607d8b';
    ctx.font = 'bold 4px "JetBrains Mono", monospace';
    ctx.fillText(`${Math.round(light)}lx`, 25, 44.5);

    // Selection Outline Overlay
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -2, 0, 54, 62);
    }

    ctx.restore();
  }
});

// defComp({
//   id: 'ldr',
//   name: 'LDR Photoresistor',
//   category: 'Sensors',
//   icon: '💡',
//   desc: 'Light-dependent resistor — outputs analog light level from 0 to 1023',
//   width: 40,
//   height: 40,
//   defaultProps: { light: 512 },
//   interactive: [
//     { field: 'light', label: 'Light', min: 0, max: 1023, step: 1, unit: ' lx' },
//   ],
//   pins: [
//     { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 8, y: 40, side: 'bottom' },
//     { id: 'a', label: 'A', type: PIN_TYPE.ANALOG, x: 20, y: 40, side: 'bottom' },
//     { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 32, y: 40, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const light = inst.runtimeState && inst.runtimeState.light !== undefined ? inst.runtimeState.light : (inst.props.light || 512);
//     const pct = light / 1023;

//     ctx.save();
//     ctx.translate(x, y);

//     // Leads
//     ctx.strokeStyle = '#c8a84b';
//     ctx.lineWidth = 1.5;
//     [[8, 40], [20, 40], [32, 40]].forEach(([px, py]) => {
//       ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, 34); ctx.stroke();
//     });

//     // Body
//     ctx.fillStyle = '#2a2a2a';
//     roundRect(ctx, 2, 3, 36, 31, 4);
//     ctx.fill();
//     ctx.strokeStyle = '#555';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // Wavy resistive track
//     ctx.strokeStyle = '#c8b06a';
//     ctx.lineWidth = 1.5;
//     ctx.beginPath();
//     ctx.moveTo(8, 18);
//     ctx.lineTo(14, 12); ctx.lineTo(18, 24); ctx.lineTo(22, 12); ctx.lineTo(26, 24); ctx.lineTo(31, 18);
//     ctx.stroke();

//     // Light rays (animated with brightness)
//     const rayOn = pct > 0.05;
//     ctx.strokeStyle = rayOn ? '#ffee88' : '#666';
//     ctx.lineWidth = 1;
//     if (rayOn) { ctx.shadowColor = '#ffee88'; ctx.shadowBlur = 5; }
//     [[-2, 4], [14, -2], [30, 4]].forEach(([rx, ry]) => {
//       ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry - 5); ctx.stroke();
//     });
//     ctx.shadowBlur = 0;

//     ctx.fillStyle = '#aaa';
//     ctx.font = 'bold 6px sans-serif';
//     ctx.textAlign = 'center';
//     ctx.fillText('LDR', 20, 30);

//     if (inst.selected) drawSelectionRect(ctx, -3, 0, 46, 46);
//     ctx.restore();
//   }
// });

/* ------------------------------------PIR Motion Sensor --------------------------------- */
// defComp({
//   id: 'pir',
//   name: 'PIR Motion Sensor',
//   category: 'Sensors',
//   icon: '🚶',
//   desc: 'Passive infrared motion sensor — outputs HIGH when movement detected',
//   width: 50,
//   height: 40,
//   defaultProps: { motion: 0 },
//   interactive: [
//     { field: 'motion', label: 'Motion', min: 0, max: 1, step: 1, unit: '' },
//   ],
//   pins: [
//     { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 12, y: 40, side: 'bottom' },
//     { id: 'out', label: 'OUT', type: PIN_TYPE.DIGITAL, x: 25, y: 40, side: 'bottom' },
//     { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 38, y: 40, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const motion = inst.runtimeState && inst.runtimeState.motion !== undefined ? !!inst.runtimeState.motion : !!(inst.props.motion || 0);

//     ctx.save();
//     ctx.translate(x, y);

//     // Leads
//     ctx.strokeStyle = '#c8a84b';
//     ctx.lineWidth = 1.5;
//     [[12, 40], [25, 40], [38, 40]].forEach(([px, py]) => {
//       ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, 36); ctx.stroke();
//     });

//     // Board
//     ctx.fillStyle = '#1a5c1a';
//     roundRect(ctx, 2, 12, 46, 24, 3);
//     ctx.fill();
//     ctx.strokeStyle = '#2d8c2d';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // Sensor dome
//     ctx.fillStyle = motion ? '#e8f4ff' : '#cfd8e0';
//     ctx.beginPath();
//     ctx.arc(25, 12, 13, Math.PI, 0);
//     ctx.fill();
//     ctx.strokeStyle = '#aab4c0';
//     ctx.stroke();
//     ctx.fillStyle = motion ? '#3399ff' : '#77828e';
//     ctx.beginPath();
//     ctx.arc(25, 12, 7, Math.PI, 0);
//     ctx.fill();

//     // Indicator LED
//     ctx.fillStyle = motion ? '#ff5555' : '#442222';
//     ctx.beginPath(); ctx.arc(12, 22, 2.5, 0, Math.PI * 2); ctx.fill();
//     if (motion) { ctx.shadowColor = '#ff5555'; ctx.shadowBlur = 5; }
//     ctx.beginPath(); ctx.arc(12, 22, 2.5, 0, Math.PI * 2); ctx.fill();
//     ctx.shadowBlur = 0;

//     ctx.fillStyle = '#c8c8c8';
//     ctx.font = 'bold 6px sans-serif';
//     ctx.textAlign = 'center';
//     ctx.fillText(motion ? 'MOTION' : 'IDLE', 33, 28);

//     if (inst.selected) drawSelectionRect(ctx, -3, -3, 56, 46);
//     ctx.restore();
//   }
// });


defComp({
  id: 'pir',
  name: 'PIR Motion Sensor',
  category: 'Sensors',
  icon: '🚶',
  desc: 'Passive infrared motion sensor (HC-SR501) — outputs HIGH when movement detected',
  width: 56,
  height: 62,
  defaultProps: { motion: 0 },
  interactive: [
    { field: 'motion', label: 'Motion', min: 0, max: 1, step: 1, unit: '' },
  ],
  pins: [
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER,   x: 16, y: 62, side: 'bottom' },
    { id: 'out', label: 'OUT', type: PIN_TYPE.DIGITAL, x: 28, y: 62, side: 'bottom' },
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND,     x: 40, y: 62, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const motion = inst.runtimeState && inst.runtimeState.motion !== undefined 
      ? !!inst.runtimeState.motion 
      : !!(inst.props.motion || 0);

    ctx.save();
    ctx.translate(x, y);

    // Canvas helper for rounded rectangles
    const drawRoundRect = (cx, cy, w, h, r) => {
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cx, cy, w, h, r);
      } else {
        ctx.moveTo(cx + r, cy);
        ctx.lineTo(cx + w - r, cy);
        ctx.quadraticCurveTo(cx + w, cy, cx + w, cy + r);
        ctx.lineTo(cx + w, cy + h - r);
        ctx.quadraticCurveTo(cx + w, cy + h, cx + w - r, cy + h);
        ctx.lineTo(cx + r, cy + h);
        ctx.quadraticCurveTo(cx, cy + h, cx, cy + h - r);
        ctx.lineTo(cx, cy + r);
        ctx.quadraticCurveTo(cx, cy, cx + r, cy);
      }
      ctx.closePath();
    };

    // ----------------------------------------------------
    // 1. GREEN PCB BASE
    // ----------------------------------------------------
    const pcbGrad = ctx.createLinearGradient(0, 0, 56, 0);
    pcbGrad.addColorStop(0, '#0c3814');
    pcbGrad.addColorStop(0.5, '#165c24');
    pcbGrad.addColorStop(1, '#0a2f10');
    ctx.fillStyle = pcbGrad;
    drawRoundRect(0, 0, 56, 48, 3);
    ctx.fill();

    // PCB Edge Chamfer Highlight
    ctx.strokeStyle = '#278037';
    ctx.lineWidth = 0.8;
    drawRoundRect(0.5, 0.5, 55, 47, 2.5);
    ctx.stroke();

    // Corner Mounting Holes with Copper Rings
    [[4, 4], [52, 4], [4, 44], [52, 44]].forEach(([hx, hy]) => {
      ctx.fillStyle = '#061a0a';
      ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c5a059'; // Gold ring
      ctx.lineWidth = 0.7;
      ctx.stroke();
    });

    // ----------------------------------------------------
    // 2. PCB COMPONENTS (Trimpots, BISS0001 IC, Jumper)
    // ----------------------------------------------------
    // BISS0001 PIR Controller IC (SOP-16 Package)
    ctx.fillStyle = '#1c1d21';
    drawRoundRect(19, 3, 18, 8, 1);
    ctx.fill();
    ctx.fillStyle = '#61656c';
    ctx.font = '2.2px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BISS0001', 28, 8);

    // Sensitivity & Delay Adjustment Trimpots (Orange Ceramic)
    const drawTrimpot = (cx, cy, label) => {
      // Base
      ctx.fillStyle = '#d4920b';
      drawRoundRect(cx - 3, cy - 3, 6, 6, 1);
      ctx.fill();
      // Metallic dial center
      ctx.fillStyle = '#e8e8e8';
      ctx.beginPath(); ctx.arc(cx, cy, 1.8, 0, Math.PI * 2); ctx.fill();
      // Screw slot
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(cx - 1.2, cy - 0.8); ctx.lineTo(cx + 1.2, cy + 0.8);
      ctx.moveTo(cx - 1.2, cy + 0.8); ctx.lineTo(cx + 1.2, cy - 0.8);
      ctx.stroke();
      // Silkscreen Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 2.3px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, cx, cy + 5.5);
    };

    drawTrimpot(8, 38, 'SENS');
    drawTrimpot(48, 38, 'TIME');

    // Trigger Mode Jumper Block (L / H)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(44, 12, 8, 4); // Header housing
    // Gold pins
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(45.5, 13, 1, 2);
    ctx.fillRect(47.5, 13, 1, 2);
    ctx.fillRect(49.5, 13, 1, 2);
    // Yellow Jumper Cap (Set to H - Repeat Trigger)
    ctx.fillStyle = '#f5c518';
    drawRoundRect(47, 12, 3.5, 4, 0.8);
    ctx.fill();

    // ----------------------------------------------------
    // 3. MOTION INDICATOR LED
    // ----------------------------------------------------
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(8, 14, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = motion ? '#ff3333' : '#441111';
    ctx.beginPath(); ctx.arc(8, 14, 1.5, 0, Math.PI * 2); ctx.fill();

    if (motion) {
      ctx.save();
      ctx.shadowColor = '#ff3333';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(8, 14, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // ----------------------------------------------------
    // 4. FRESNEL LENS DOME (Translucent White Multi-Faceted)
    // ----------------------------------------------------
    const domeX = 28;
    const domeY = 24;
    const domeR = 15;

    // Translucent White Spherical Gradient
    const domeGrad = ctx.createRadialGradient(
      domeX - 4, domeY - 5, 2,
      domeX, domeY, domeR
    );
    if (motion) {
      // Subtle warm/reddish IR glow pass-through when motion detected
      domeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      domeGrad.addColorStop(0.5, 'rgba(255, 220, 200, 0.9)');
      domeGrad.addColorStop(1, 'rgba(210, 220, 230, 0.85)');
    } else {
      domeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      domeGrad.addColorStop(0.6, 'rgba(230, 238, 245, 0.9)');
      domeGrad.addColorStop(1, 'rgba(180, 195, 210, 0.85)');
    }

    ctx.fillStyle = domeGrad;
    ctx.beginPath(); ctx.arc(domeX, domeY, domeR, 0, Math.PI * 2); ctx.fill();

    // Dome Edge Shadow & Outline
    ctx.strokeStyle = 'rgba(120, 140, 160, 0.6)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Fresnel Lens Facet Grid Lines (Micro-lens Array Pattern)
    ctx.strokeStyle = 'rgba(150, 170, 190, 0.35)';
    ctx.lineWidth = 0.6;

    // Concentric Ring Rings
    [4, 8, 12].forEach((r) => {
      ctx.beginPath(); ctx.arc(domeX, domeY, r, 0, Math.PI * 2); ctx.stroke();
    });

    // Radial Facet Lines
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(domeX + Math.cos(angle) * 4, domeY + Math.sin(angle) * 4);
      ctx.lineTo(domeX + Math.cos(angle) * 14.5, domeY + Math.sin(angle) * 14.5);
      ctx.stroke();
    }

    // Specular Highlight Arc
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(domeX, domeY, domeR - 2, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();

    // ----------------------------------------------------
    // 5. SILKSCREEN LABELS
    // ----------------------------------------------------
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 3.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HC-SR501', 28, 45);

    // Pin Labels
    ctx.font = 'bold 2.8px monospace';
    ctx.fillText('VCC', 16, 46);
    ctx.fillText('OUT', 28, 46);
    ctx.fillText('GND', 40, 46);

    // ----------------------------------------------------
    // 6. HEADER PINS & MALE LEADS
    // ----------------------------------------------------
    const pinX = [16, 28, 40];

    // Black plastic pin header base
    ctx.fillStyle = '#111111';
    drawRoundRect(11, 47.5, 34, 4, 1);
    ctx.fill();

    pinX.forEach((px) => {
      // Golden Square Pad
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(px - 1.8, 48.5, 3.6, 2);

      // Metallic Extension Pins
      const pinGrad = ctx.createLinearGradient(px - 0.8, 50, px + 0.8, 50);
      pinGrad.addColorStop(0, '#888');
      pinGrad.addColorStop(0.5, '#fff');
      pinGrad.addColorStop(1, '#666');
      ctx.fillStyle = pinGrad;
      ctx.fillRect(px - 0.8, 50, 1.6, 12);
    });

    // Selection Halo
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -2, -2, 60, 66);
    }

    ctx.restore();
  }
});

/* -------------- LM35 Precision Centigrade Temperature Sensor (TO-92) ------------------ */
defComp({
  id: 'lm35_sensor',
  name: 'LM35 Temp Sensor',
  category: 'Sensors',
  icon: '🌡️',
  desc: 'Precision centigrade temperature sensor producing 10mV/°C linear analog output voltage (250mV at 25°C)',
  width: 60,
  height: 80,
  defaultProps: { temp: 25 },
  interactive: [
    { field: 'temp', label: 'Temperature', min: -40, max: 125, step: 1, unit: '°C' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC (+5V)', type: PIN_TYPE.POWER, x: 15, y: 80, side: 'bottom' },
    { id: 'OUT', label: 'VOUT', type: PIN_TYPE.ANALOG, x: 30, y: 80, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 45, y: 80, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const temp = Number(inst.runtimeState?.temp ?? inst.props.temp ?? 25);

    // Voltage scale factor: 10 mV / °C (0.01 V / °C)
    const vOut = temp * 0.01;

    ctx.save();
    ctx.translate(x, y);

    // 1. TO-92 Metallic Lead Pins
    const pinXs = [15, 30, 45];
    pinXs.forEach(px => {
      const pinGrad = ctx.createLinearGradient(px - 1.2, 38, px + 1.2, 38);
      pinGrad.addColorStop(0, '#90a4ae');
      pinGrad.addColorStop(0.5, '#ffffff');
      pinGrad.addColorStop(1, '#607d8b');
      ctx.fillStyle = pinGrad;
      ctx.fillRect(px - 1.2, 38, 2.4, 42);
    });

    // 2. TO-92 Molded Plastic Body
    const bodyGrad = ctx.createLinearGradient(0, 5, 0, 40);
    bodyGrad.addColorStop(0, '#455a64');
    bodyGrad.addColorStop(0.3, '#263238');
    bodyGrad.addColorStop(1, '#101214');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.moveTo(8, 38);
    ctx.lineTo(52, 38);
    ctx.arcTo(56, 38, 56, 5, 4);
    ctx.arcTo(56, 5, 4, 5, 18);
    ctx.arcTo(4, 5, 4, 38, 4);
    ctx.arcTo(4, 38, 8, 38, 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#546e7a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Flat Front Face Bevel Line
    ctx.fillStyle = '#1c2024';
    roundRect(ctx, 10, 32, 40, 6, 1);
    ctx.fill();

    // 3. Temperature Thermal Color Indicator LED
    // Normalizes -40°C (Blue) to 125°C (Red)
    const tRatio = Math.min(1, Math.max(0, (temp + 40) / 165));
    const r = Math.round(tRatio * 255);
    const b = Math.round((1 - tRatio) * 255);
    ctx.fillStyle = `rgb(${r}, 40, ${b})`;
    ctx.beginPath();
    ctx.arc(30, 15, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 4. Laser-Etched Silkscreen Markings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'bold 5.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LM35', 30, 23);
    ctx.font = 'bold 4px "JetBrains Mono", monospace';
    ctx.fillText('DZ', 30, 29);

    // 5. Real-Time Telemetry Readout
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 6px "JetBrains Mono", monospace';
    ctx.fillText(`${temp}°C`, 30, 47);

    ctx.fillStyle = '#ffc107';
    ctx.font = 'bold 5px "JetBrains Mono", monospace';
    ctx.fillText(`${(vOut * 1000).toFixed(0)}mV`, 30, 55);

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 60, 80);
    ctx.restore();
  }
});


/*-----------------------MPU6050 6-axis Accelerometer + Gyroscope (I2C @ 0x68)------------------------ */
defComp({
  id: 'mpu6050',
  name: 'MPU6050 6-Axis IMU Module',
  category: 'Sensors',
  icon: '🧭',
  desc: 'Authentic GY-521 MPU-6050 MotionTracking Module (3-axis Gyroscope + 3-axis Accelerometer with DMP). Features live 3D orientation vector visualization, I2C pull-ups, and onboard 3.3V LDO regulator.',
  width: 80,
  height: 85,
  defaultProps: { accelX: 0, accelY: 0, accelZ: 1024, gyroX: 0, gyroY: 0, gyroZ: 0 },
  interactive: [
    { field: 'accelX', label: 'Accel X', min: -2048, max: 2047, step: 10, unit: '' },
    { field: 'accelY', label: 'Accel Y', min: -2048, max: 2047, step: 10, unit: '' },
    { field: 'accelZ', label: 'Accel Z', min: -2048, max: 2047, step: 10, unit: '' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 16, y: 85, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 32, y: 85, side: 'bottom' },
    { id: 'SCL', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 48, y: 85, side: 'bottom' },
    { id: 'SDA', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 64, y: 85, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const isRunning = !!(sim && sim.isRunning);

    // Extract Accelerometer Values
    const ax = inst.runtimeState && inst.runtimeState.accelX !== undefined ? inst.runtimeState.accelX : (inst.props.accelX ?? 0);
    const ay = inst.runtimeState && inst.runtimeState.accelY !== undefined ? inst.runtimeState.accelY : (inst.props.accelY ?? 0);
    const az = inst.runtimeState && inst.runtimeState.accelZ !== undefined ? inst.runtimeState.accelZ : (inst.props.accelZ ?? 1024);

    ctx.save();
    ctx.translate(x, y);

    // --- Helper: Safe Rounded Rectangles ---
    const drawRR = (rx, ry, rw, rh, rad = 3) => {
      ctx.beginPath();
      if (typeof roundRect === 'function') {
        roundRect(ctx, rx, ry, rw, rh, rad);
      } else if (ctx.roundRect) {
        ctx.roundRect(rx, ry, rw, rh, rad);
      } else {
        ctx.rect(rx, ry, rw, rh);
      }
    };

    // --- 1. PCB Ground Shadow & Substrate ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    drawRR(2, 4, 76, 46, 4);
    ctx.fill();

    // Deep Cyan/Teal GY-521 PCB Gradient
    const pcbGrad = ctx.createLinearGradient(0, 2, 80, 48);
    pcbGrad.addColorStop(0, '#005b66');
    pcbGrad.addColorStop(0.5, '#00424b');
    pcbGrad.addColorStop(1, '#002930');
    ctx.fillStyle = pcbGrad;
    drawRR(0, 2, 80, 46, 4);
    ctx.fill();

    // PCB Edge Chamfer & Silkscreen Outer Border Line
    ctx.strokeStyle = '#001a1f';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 0.7;
    drawRR(2, 4, 76, 42, 2.5);
    ctx.stroke();

    // Gold Corner Mounting Holes with Copper Rings
    [[5, 7], [75, 7], [5, 41], [75, 41]].forEach(([hx, hy]) => {
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(hx, hy, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#001a1f';
      ctx.beginPath(); ctx.arc(hx, hy, 1.3, 0, Math.PI * 2); ctx.fill();
    });

    // --- 2. Onboard Sub-components (Regulator, Resistors, Capacitors) ---
    // KB33 / 662K LDO 3.3V Voltage Regulator (SOT-23 Package)
    ctx.fillStyle = '#181818';
    drawRR(12, 10, 6, 4, 0.8); ctx.fill();
    ctx.fillStyle = '#555';
    ctx.fillRect(11, 11, 1, 0.8);
    ctx.fillRect(11, 12.2, 1, 0.8);
    ctx.fillRect(18, 11.6, 1, 0.8);

    // SMD I2C Pull-Up Resistor Packs (472 / 4.7k)
    ctx.fillStyle = '#222';
    [[12, 18], [12, 22], [12, 26]].forEach(([rx, ry]) => {
      ctx.fillRect(rx, ry, 4, 2);
      ctx.fillStyle = '#b0b0b0';
      ctx.fillRect(rx, ry, 0.8, 2);
      ctx.fillRect(rx + 3.2, ry, 0.8, 2);
      ctx.fillStyle = '#222';
    });

    // SMD Decoupling Capacitors (0603 Brown/Tan Body)
    ctx.fillStyle = '#b8860b';
    [[64, 10], [64, 15], [64, 20]].forEach(([cx, cy]) => {
      ctx.fillRect(cx, cy, 4, 2);
      ctx.fillStyle = '#b0b0b0';
      ctx.fillRect(cx, cy, 0.8, 2);
      ctx.fillRect(cx + 3.2, cy, 0.8, 2);
      ctx.fillStyle = '#b8860b';
    });

    // Power Indicator LED (Red)
    ctx.fillStyle = isRunning ? '#ff3333' : '#441111';
    if (isRunning) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 5; }
    ctx.beginPath(); ctx.arc(66, 28, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // --- 3. MPU-6050 Main QFN-24 IC Chip ---
    const icX = 28, icY = 10, icW = 24, icH = 24;

    // IC Body Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    drawRR(icX + 1, icY + 1, icW, icH, 1.5); ctx.fill();

    // Matte Black Epoxy Package
    const icGrad = ctx.createLinearGradient(icX, icY, icX + icW, icY + icH);
    icGrad.addColorStop(0, '#2c2c2c');
    icGrad.addColorStop(0.5, '#1a1a1a');
    icGrad.addColorStop(1, '#111111');
    ctx.fillStyle = icGrad;
    drawRR(icX, icY, icW, icH, 1.5); ctx.fill();
    ctx.strokeStyle = '#050505'; ctx.lineWidth = 0.5; ctx.stroke();

    // QFN Metallic Pins around perimeter
    ctx.fillStyle = '#cccccc';
    for (let p = 0; p < 5; p++) {
      ctx.fillRect(icX + 3 + p * 4, icY - 0.8, 2, 0.8);       // Top
      ctx.fillRect(icX + 3 + p * 4, icY + icH, 2, 0.8);      // Bottom
      ctx.fillRect(icX - 0.8, icY + 3 + p * 4, 0.8, 2);       // Left
      ctx.fillRect(icX + icW, icY + 3 + p * 4, 0.8, 2);       // Right
    }

    // Pin 1 Alignment Indentation Dot
    ctx.fillStyle = '#444444';
    ctx.beginPath(); ctx.arc(icX + 3.5, icY + 3.5, 1, 0, Math.PI * 2); ctx.fill();

    // Laser-Etched Chip Markings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'bold 3.8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MPU-6050', icX + 12, icY + 12);
    ctx.font = '3px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText('INVEN SENSE', icX + 12, icY + 17);

    // --- 4. Silkscreen Text & Axis Vectors (X / Y / Z) ---
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GY-521', 40, 41);

    // Silkscreen Coordinate Axes Diagram (Left side)
    const axX = 21, axY = 35;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8;
    // X-Axis
    ctx.beginPath(); ctx.moveTo(axX, axY); ctx.lineTo(axX + 7, axY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(axX + 5, axY - 1.5); ctx.lineTo(axX + 7, axY); ctx.lineTo(axX + 5, axY + 1.5); ctx.fill();
    // Y-Axis
    ctx.beginPath(); ctx.moveTo(axX, axY); ctx.lineTo(axX, axY - 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(axX - 1.5, axY - 5); ctx.lineTo(axX, axY - 7); ctx.lineTo(axX + 1.5, axY - 5); ctx.fill();

    ctx.font = 'bold 3.5px sans-serif';
    ctx.fillText('X', axX + 9, axY + 1);
    ctx.fillText('Y', axX - 3, axY - 5);

    // --- 5. Pin Header Strip (Bottom - Pins: 16, 32, 48, 64) ---
    ctx.fillStyle = '#151515';
    drawRR(8, 44, 64, 5, 1); ctx.fill();

    const pinXList = [16, 32, 48, 64];
    pinXList.forEach(px => {
      // Gold Contact Square Pad
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(px - 1.5, 45, 3, 3);

      // Silver Terminal Pins
      const pinGrad = ctx.createLinearGradient(px - 1, 48, px + 1, 85);
      pinGrad.addColorStop(0, '#aaaaaa');
      pinGrad.addColorStop(0.5, '#ffffff');
      pinGrad.addColorStop(1, '#666666');
      ctx.fillStyle = pinGrad;
      ctx.fillRect(px - 0.9, 48, 1.8, 37);
    });

    // Pin Silkscreen Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 3.8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VCC', 16, 43);
    ctx.fillText('GND', 32, 43);
    ctx.fillText('SCL', 48, 43);
    ctx.fillText('SDA', 64, 43);

    // --- 6. Lower HUD 3D Orientation / Accel Data Panel ---
    const hudY = 51;
    ctx.fillStyle = '#060a12';
    drawRR(-2, hudY, 84, 32, 4);
    ctx.fill();
    ctx.strokeStyle = isRunning ? 'rgba(0, 229, 255, 0.4)' : 'rgba(50, 60, 75, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Normalized acceleration vector components
    const normX = Math.max(-1, Math.min(1, ax / 1024));
    const normY = Math.max(-1, Math.min(1, ay / 1024));
    const normZ = Math.max(-1, Math.min(1, az / 1024));

    // Dynamic Artificial Horizon / Crosshair Bubble
    const bubbleCenterX = 18, bubbleCenterY = hudY + 16;
    ctx.fillStyle = '#101726';
    ctx.beginPath(); ctx.arc(bubbleCenterX, bubbleCenterY, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)'; ctx.lineWidth = 0.8; ctx.stroke();

    // Crosshair Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath(); ctx.moveTo(bubbleCenterX - 9, bubbleCenterY); ctx.lineTo(bubbleCenterX + 9, bubbleCenterY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bubbleCenterX, bubbleCenterY - 9); ctx.lineTo(bubbleCenterX, bubbleCenterY + 9); ctx.stroke();

    // Moving Tilt Target
    const targetX = bubbleCenterX + normX * 7;
    const targetY = bubbleCenterY - normY * 7;
    ctx.fillStyle = isRunning ? '#00e5ff' : '#546e7a';
    if (isRunning) { ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 4; }
    ctx.beginPath(); ctx.arc(targetX, targetY, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Numeric G-Force Readouts
    ctx.fillStyle = isRunning ? '#80deea' : '#546e7a';
    ctx.font = 'bold 5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ACCELERATION', 33, hudY + 9);

    ctx.font = 'bold 4.5px "JetBrains Mono", monospace';
    ctx.fillStyle = isRunning ? '#00e5ff' : '#607d8b';
    ctx.fillText(`X:${normX >= 0 ? '+' : ''}${normX.toFixed(2)}g`, 33, hudY + 16);
    ctx.fillText(`Y:${normY >= 0 ? '+' : ''}${normY.toFixed(2)}g`, 33, hudY + 22);
    ctx.fillText(`Z:${normZ >= 0 ? '+' : ''}${normZ.toFixed(2)}g`, 33, hudY + 28);

    // Selection Box Overlay
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -4, 0, 88, 86);
    }

    ctx.restore();
  }
});

// defComp({
//   id: 'mpu6050',
//   name: 'MPU6050 IMU',
//   category: 'Sensors',
//   icon: '🧭',
//   desc: '6-axis Accelerometer + Gyroscope (I2C @ 0x68). Provides accel X/Y/Z Â±2g and gyro X/Y/Z Â±250Â°/s',
//   width: 72,   // Scaled from 36 to 72 (2x)
//   height: 64,  // Scaled from 32 to 64 (2x)
//   defaultProps: { accelX: 0, accelY: 0, accelZ: 1024, gyroX: 0, gyroY: 0, gyroZ: 0 },
//   interactive: [
//     { field: 'accelX', label: 'AccelX', min: -2048, max: 2047, step: 10, unit: '' },
//     { field: 'accelY', label: 'AccelY', min: -2048, max: 2047, step: 10, unit: '' },
//     { field: 'accelZ', label: 'AccelZ', min: -2048, max: 2047, step: 10, unit: '' },
//   ],
//   pins: [
//     { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 12, y: 64, side: 'bottom' },
//     { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 26, y: 64, side: 'bottom' },
//     { id: 'SCL', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 44, y: 64, side: 'bottom' },
//     { id: 'SDA', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 58, y: 64, side: 'bottom' },
//   ],

//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const scale = 2; // Scale factor

//     ctx.save();
//     ctx.translate(x, y);
//     ctx.scale(scale, scale); // Scales all vector drawing, fonts, and borders

//     // PCB body
//     ctx.fillStyle = '#1a1a2e';
//     roundRect(ctx, 0, 0, 36, 28, 3);
//     ctx.fill();
//     ctx.strokeStyle = '#333355';
//     ctx.lineWidth = 1;
//     roundRect(ctx, 0, 0, 36, 28, 3);
//     ctx.stroke();

//     // MPU6050 chip
//     ctx.fillStyle = '#111';
//     roundRect(ctx, 8, 4, 20, 16, 2);
//     ctx.fill();

//     // Chip marking
//     ctx.fillStyle = '#666';
//     ctx.font = 'bold 4px monospace';
//     ctx.textAlign = 'center';
//     ctx.fillText('MPU', 18, 11);
//     ctx.fillText('6050', 18, 16);

//     // I2C address label
//     ctx.fillStyle = '#00979c';
//     ctx.font = '4px monospace';
//     ctx.fillText('0x68', 18, 24);

//     // Pin leads
//     const pinXs = [6, 13, 22, 29];
//     ctx.strokeStyle = '#a0a0a0';
//     ctx.lineWidth = 1.5;
//     for (const px of pinXs) {
//       ctx.beginPath();
//       ctx.moveTo(px, 28);
//       ctx.lineTo(px, 32);
//       ctx.stroke();
//     }

//     if (inst.selected) drawSelectionRect(ctx, 0, 0, 36, 32);
//     ctx.restore();
//   }
// });


/* -------------- IR Obstacle Avoidance Sensor Module (Enlarged) ------------------ */
defComp({
  id: 'ir_obstacle',
  name: 'IR Obstacle Sensor',
  category: 'Sensors',
  icon: '🚧',
  desc: 'Infrared obstacle detection sensor module with LM393 comparator (Digital OUT: LOW when obstacle detected, 2â€“30cm range)',
  width: 54,
  height: 92,
  defaultProps: { detected: 0 },
  interactive: [
    { field: 'detected', label: 'Object', min: 0, max: 1, step: 1, unit: '' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 15, y: 92, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 27, y: 92, side: 'bottom' },
    { id: 'OUT', label: 'OUT', type: PIN_TYPE.DIGITAL, x: 39, y: 92, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const detected = Boolean(inst.runtimeState?.detected ?? inst.props.detected ?? 0);

    ctx.save();
    ctx.translate(x, y);

    // 1. Dual IR Optoelectronic Diodes (Protruding from Top)
    // --- IR Emitter (Clear/Blue-tinted 5mm LED, Left) ---
    // Metal Leads
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(13, 20); ctx.lineTo(13, 15);
    ctx.moveTo(17, 20); ctx.lineTo(17, 15);
    ctx.stroke();

    // Emitter Bulb Base & Rim
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(10.5, 14, 9, 2);

    // Emitter Dome
    const emitGrad = ctx.createRadialGradient(15, 8, 1, 15, 9, 6);
    emitGrad.addColorStop(0, detected ? '#ff8a80' : '#e1f5fe');
    emitGrad.addColorStop(0.6, detected ? '#ff1744' : '#81d4fa');
    emitGrad.addColorStop(1, detected ? '#b71c1c' : '#29b6f6');
    ctx.fillStyle = emitGrad;
    ctx.beginPath();
    ctx.arc(15, 9, 5, Math.PI, 0, false);
    ctx.lineTo(20, 14);
    ctx.lineTo(10, 14);
    ctx.closePath();
    ctx.fill();

    if (detected) {
      // Infrared Emission Glow Halo
      ctx.fillStyle = 'rgba(255, 23, 68, 0.35)';
      ctx.beginPath();
      ctx.arc(15, 9, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- IR Photodiode Receiver (Dark Tinted 5mm Lens, Right) ---
    // Metal Leads
    ctx.strokeStyle = '#cfd8dc';
    ctx.beginPath();
    ctx.moveTo(37, 20); ctx.lineTo(37, 15);
    ctx.moveTo(41, 20); ctx.lineTo(41, 15);
    ctx.stroke();

    // Receiver Bulb Base
    ctx.fillStyle = '#263238';
    ctx.fillRect(34.5, 14, 9, 2);

    // Dark Glossy Filter Dome
    const recvGrad = ctx.createRadialGradient(37.5, 7, 1, 39, 9, 6);
    recvGrad.addColorStop(0, '#546e7a');
    recvGrad.addColorStop(0.5, '#212121');
    recvGrad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = recvGrad;
    ctx.beginPath();
    ctx.arc(39, 9, 5, Math.PI, 0, false);
    ctx.lineTo(44, 14);
    ctx.lineTo(34, 14);
    ctx.closePath();
    ctx.fill();

    // 2. FR4 Sensor PCB Body
    ctx.fillStyle = '#0a3820';
    roundRect(ctx, 3, 18, 48, 56, 3.5);
    ctx.fill();

    ctx.strokeStyle = '#185934';
    ctx.lineWidth = 1;
    ctx.stroke();

    // PCB Mounting Hole
    ctx.fillStyle = '#c8a452';
    ctx.beginPath(); ctx.arc(27, 26, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#05180f';
    ctx.beginPath(); ctx.arc(27, 26, 1.8, 0, Math.PI * 2); ctx.fill();

    // 3. Sensitivity Trimpot (Blue Cermet Potentiometer)
    ctx.fillStyle = '#1565c0';
    roundRect(ctx, 29, 34, 18, 16, 2);
    ctx.fill();

    // Metal Adjustment Screw Rotor
    ctx.fillStyle = '#d4af37';
    ctx.beginPath(); ctx.arc(38, 42, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#614800';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(35, 42); ctx.lineTo(41, 42);
    ctx.moveTo(38, 39); ctx.lineTo(38, 45);
    ctx.stroke();

    // 4. LM393 Voltage Comparator IC
    ctx.fillStyle = '#1e2224';
    roundRect(ctx, 7, 34, 16, 16, 1.5);
    ctx.fill();

    // IC Pin 1 Notch & Leads
    ctx.fillStyle = '#101010';
    ctx.beginPath(); ctx.arc(10, 36.5, 1, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#9e9e9e';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(5.5, 36 + i * 3.5, 1.5, 1.2);
      ctx.fillRect(23, 36 + i * 3.5, 1.5, 1.2);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = 'bold 3.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LM393', 15, 43.5);

    // 5. Onboard SMD Indicator LEDs
    // Power Indicator LED (PWR - Red)
    ctx.fillStyle = '#263238';
    ctx.fillRect(8, 54, 5, 3.5);
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(9, 54.8, 3, 1.9);

    // Obstacle Detection LED (D-OUT - Green)
    ctx.fillStyle = '#263238';
    ctx.fillRect(41, 54, 5, 3.5);
    if (detected) {
      ctx.fillStyle = '#00e676';
      ctx.fillRect(42, 54.8, 3, 1.9);
      ctx.fillStyle = 'rgba(0, 230, 118, 0.45)';
      ctx.beginPath(); ctx.arc(43.5, 55.7, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#1b5e20';
      ctx.fillRect(42, 54.8, 3, 1.9);
    }

    // 6. Silkscreen Labels & Status Display
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(detected ? 'DETECT' : 'CLEAR', 27, 56.5);

    // Pin Names Silkscreen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = 'bold 4.5px "JetBrains Mono", sans-serif';
    ctx.fillText('VCC', 15, 68);
    ctx.fillText('GND', 27, 68);
    ctx.fillText('OUT', 39, 68);

    // 7. Male Header Socket Strip & Terminal Pins
    ctx.fillStyle = '#1c1c1c';
    roundRect(ctx, 8, 73, 38, 4.5, 1);
    ctx.fill();

    const pins = [15, 27, 39];
    pins.forEach(px => {
      // Solder Pad on PCB
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(px, 71.5, 1.5, 0, Math.PI * 2); ctx.fill();

      // Silver Lead Terminal
      const pinGrad = ctx.createLinearGradient(px - 1, 77, px + 1, 77);
      pinGrad.addColorStop(0, '#cfd8dc');
      pinGrad.addColorStop(0.5, '#ffffff');
      pinGrad.addColorStop(1, '#90a4ae');
      ctx.fillStyle = pinGrad;
      ctx.fillRect(px - 1.2, 77.5, 2.4, 14.5);
    });

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 60, 98);
    ctx.restore();
  }
});

/*---------------------Analog flex/bend sensor----------------------*/

defComp({
  id: 'flex_sensor',
  name: 'Flex Sensor',
  category: 'Sensors',
  icon: '',
  desc: 'Analog flex/bend sensor. Resistance increases when bent. Reads 0-1023 on analog pin',
  width: 50,
  height: 20,
  defaultProps: { bend: 0 },
  interactive: [
    { field: 'bend', label: 'Bend', min: 0, max: 1023, step: 1, unit: '' },
  ],
  pins: [
    { id: 'SIG', label: 'SIG', type: PIN_TYPE.ANALOG, x: 6, y: 20, side: 'bottom' },
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 25, y: 20, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 44, y: 20, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const bend = inst.runtimeState?.bend ?? inst.props.bend ?? 0;
    const bendFrac = bend / 1023;
    ctx.save();
    ctx.translate(x, y);

    // Flex strip body
    ctx.fillStyle = '#e8d5a3';
    roundRect(ctx, 2, 2, 46, 12, 2);
    ctx.fill();
    ctx.strokeStyle = '#c4a96a';
    ctx.lineWidth = 1;
    roundRect(ctx, 2, 2, 46, 12, 2);
    ctx.stroke();

    // Resistance track (changes with bend)
    ctx.strokeStyle = bendFrac > 0.5 ? '#cc3333' : '#333';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(6, 8);
    ctx.lineTo(44, 8);
    ctx.stroke();
    ctx.setLineDash([]);

    // Bend indicator arc
    ctx.strokeStyle = '#00979c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const arcRadius = 20 - bendFrac * 15;
    ctx.arc(25, 25, Math.max(5, arcRadius), Math.PI, Math.PI + Math.PI * bendFrac);
    ctx.stroke();

    // Value label
    ctx.fillStyle = '#333';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${bend}`, 25, 12);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(6, 14); ctx.lineTo(6, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(25, 14); ctx.lineTo(25, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(44, 14); ctx.lineTo(44, 20); ctx.stroke();

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 50, 20);
    ctx.restore();
  }
});

/*--------NTC Thermistor 10k ohms NTC thermistor. Resistance decreases with temperature------------- */
defComp({
  id: 'thermistor',
  name: 'NTC Thermistor',
  category: 'Sensors',
  icon: '🌡',
  desc: '10kÎ© NTC thermistor. Resistance decreases with temperature. Reads 0-1023 on analog pin',
  width: 24,
  height: 30,
  defaultProps: { temperature: 25 },
  interactive: [
    { field: 'temperature', label: 'Temp', min: -10, max: 80, step: 1, unit: 'Â°C' },
  ],
  pins: [
    { id: 'p1', label: 'T1', type: PIN_TYPE.ANALOG, x: 8, y: 30, side: 'bottom' },
    { id: 'p2', label: 'T2', type: PIN_TYPE.ANALOG, x: 16, y: 30, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const temp = inst.runtimeState?.temperature ?? inst.props.temperature ?? 25;
    ctx.save();
    ctx.translate(x, y);

    // Thermistor bead body
    const tempColor = temp > 50 ? '#cc3333' : temp > 25 ? '#cc8833' : '#3366cc';
    ctx.fillStyle = tempColor;
    ctx.beginPath();
    ctx.arc(12, 12, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Marking
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NTC', 12, 10);
    ctx.font = '4px monospace';
    ctx.fillText('10k', 12, 15);

    // Temperature readout
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 5px monospace';
    ctx.fillText(`${temp}Â°C`, 12, 26);

    // Wire leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(8, 20); ctx.lineTo(8, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, 20); ctx.lineTo(16, 30); ctx.stroke();

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 24, 30);
    ctx.restore();
  }
});

/* ---------------BME280 / BMP280  Precision Environment Sensor (I2C @ 0x76)-------------------*/

defComp({
  id: 'bme280',
  name: 'BME280 Sensor',
  category: 'Sensors',
  icon: '🎈',
  desc: 'BME280 precision barometric pressure, temperature, and humidity sensor (I2C @ 0x76)',
  width: 56,
  height: 76,
  defaultProps: { temperature: 25, humidity: 50, pressure: 1013 },
  interactive: [
    { field: 'temperature', label: 'Temp', min: -40, max: 85, step: 0.1, unit: 'Â°C' },
    { field: 'humidity', label: 'Hum', min: 0, max: 100, step: 1, unit: '%' },
    { field: 'pressure', label: 'Press', min: 300, max: 1100, step: 1, unit: 'hPa' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 10, y: 76, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 22, y: 76, side: 'bottom' },
    { id: 'SCL', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 34, y: 76, side: 'bottom' },
    { id: 'SDA', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 46, y: 76, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const temp = inst.runtimeState?.temperature ?? inst.props.temperature ?? 25;
    const hum = inst.runtimeState?.humidity ?? inst.props.humidity ?? 50;
    const pres = inst.runtimeState?.pressure ?? inst.props.pressure ?? 1013;
    const isPowered = sim?.isRunning ? (inst.runtimeState?.powered ?? true) : false;

    ctx.save();
    ctx.translate(x, y);

    // 1. Purple PCB Body (Classic GY-BME280 Breakout)
    ctx.fillStyle = '#2d1448';
    roundRect(ctx, 0, 0, 56, 64, 5);
    ctx.fill();
    ctx.strokeStyle = '#c5a059'; // Gold edge trim
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Mounting Hole
    ctx.fillStyle = '#12071f';
    ctx.beginPath();
    ctx.arc(28, 7, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 3. Metallic BME280 Sensor Package
    const sensorGrad = ctx.createLinearGradient(18, 14, 38, 28);
    sensorGrad.addColorStop(0, '#e0e0e0');
    sensorGrad.addColorStop(0.5, '#9e9e9e');
    sensorGrad.addColorStop(1, '#616161');
    ctx.fillStyle = sensorGrad;
    roundRect(ctx, 18, 14, 20, 14, 2);
    ctx.fill();
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Sensor Vent Hole
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(22, 18, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 4. Power LED Indicator
    ctx.fillStyle = isPowered ? '#00ff66' : '#225533';
    ctx.beginPath();
    ctx.arc(8, 14, 1.5, 0, Math.PI * 2);
    ctx.fill();
    if (isPowered) {
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 5. Digital Readout Display Screen
    ctx.fillStyle = '#050b14';
    roundRect(ctx, 4, 31, 48, 20, 3);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Live Readout Text (T, H, P)
    ctx.textAlign = 'left';

    // Temp
    ctx.fillStyle = '#ff9800';
    ctx.font = 'bold 4px monospace';
    ctx.fillText('T:', 6, 37);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${temp.toFixed(1)}Â°C`, 14, 37);

    // Humidity
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 4px monospace';
    ctx.fillText('H:', 6, 43);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.round(hum)}%`, 14, 43);

    // Pressure
    ctx.fillStyle = '#b388ff';
    ctx.font = 'bold 4px monospace';
    ctx.fillText('P:', 6, 49);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.round(pres)}hPa`, 14, 49);

    // 6. Silkscreen Pin Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 4.5px sans-serif';
    ctx.textAlign = 'center';
    const pinLabels = ['VCC', 'GND', 'SCL', 'SDA'];
    const pinXs = [10, 22, 34, 46];

    pinXs.forEach((px, idx) => {
      ctx.fillText(pinLabels[idx], px, 58);

      // Gold Solder Pads
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(px, 62, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Hole
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(px, 62, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Pin Leads extending to 76
      ctx.strokeStyle = '#d4d4d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, 64);
      ctx.lineTo(px, 76);
      ctx.stroke();

      // Pin Header Metallic Highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(px - 0.5, 64);
      ctx.lineTo(px - 0.5, 76);
      ctx.stroke();
    });

    // Selection Highlight Box
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -2, -2, 60, 80);
    }

    ctx.restore();
  }
});

/*----------------------VL53L0X  Time-of-Flight Laser Distance Sensor (I2C)--------------*/

defComp({
  id: 'vl53l0x',
  name: 'VL53L0X ToF Sensor',
  category: 'Sensors',
  icon: '📏',
  desc: 'VL53L0X laser Time-of-Flight distance sensor (I2C @ 0x29). Millimetre accuracy, 200cm range',
  width: 50,
  height: 60,
  defaultProps: { distance: 100 },
  interactive: [
    { field: 'distance', label: 'Dist', min: 0, max: 2000, step: 1, unit: 'mm' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,   x: 8,  y: 60, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND,     x: 20, y: 60, side: 'bottom' },
    { id: 'SCL', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 32, y: 60, side: 'bottom' },
    { id: 'SDA', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 44, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const dist = inst.runtimeState?.distance ?? inst.props.distance ?? 100;

    ctx.save();
    ctx.translate(x, y);

    // Canvas helper for rounded rectangles
    const drawRoundRect = (cx, cy, w, h, r) => {
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cx, cy, w, h, r);
      } else {
        ctx.moveTo(cx + r, cy);
        ctx.lineTo(cx + w - r, cy);
        ctx.quadraticCurveTo(cx + w, cy, cx + w, cy + r);
        ctx.lineTo(cx + w, cy + h - r);
        ctx.quadraticCurveTo(cx + w, cy + h, cx + w - r, cy + h);
        ctx.lineTo(cx + r, cy + h);
        ctx.quadraticCurveTo(cx, cy + h, cx, cy + h - r);
        ctx.lineTo(cx, cy + r);
        ctx.quadraticCurveTo(cx, cy, cx + r, cy);
      }
      ctx.closePath();
    };

    // ----------------------------------------------------
    // 1. PURPLE PCB BASE (GY-530 Style)
    // ----------------------------------------------------
    const pcbGrad = ctx.createLinearGradient(0, 0, 50, 0);
    pcbGrad.addColorStop(0, '#2d114d');
    pcbGrad.addColorStop(0.5, '#431973');
    pcbGrad.addColorStop(1, '#230b3e');
    ctx.fillStyle = pcbGrad;
    drawRoundRect(0, 0, 50, 48, 3.5);
    ctx.fill();

    // PCB Gold Chamfer Border & Traces
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 0.6;
    drawRoundRect(0.6, 0.6, 48.8, 46.8, 3);
    ctx.stroke();

    // Corner Mounting Holes with Gold Rings
    [[4, 4], [46, 4]].forEach(([hx, hy]) => {
      ctx.fillStyle = '#120521';
      ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // ----------------------------------------------------
    // 2. SMD COMPONENTS (Regulator, Resistors, Caps)
    // ----------------------------------------------------
    // SOT-23 Voltage Regulator (3.3V LDO)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(5, 23, 5, 6);
    // Regulator Leads
    ctx.fillStyle = '#ccc';
    ctx.fillRect(4, 24, 1, 1.2);
    ctx.fillRect(4, 26.8, 1, 1.2);
    ctx.fillRect(10, 25.4, 1, 1.2);

    // SMD 0603 Resistors & Capacitors Helper
    const drawSMD = (cx, cy, color, code) => {
      ctx.fillStyle = '#bbb'; // End caps
      ctx.fillRect(cx - 2.2, cy - 1, 4.4, 2);
      ctx.fillStyle = color; // Body
      ctx.fillRect(cx - 1.5, cy - 1, 3, 2);
      if (code) {
        ctx.fillStyle = '#fff';
        ctx.font = '1.8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(code, cx, cy + 0.6);
      }
    };

    drawSMD(38, 23, '#222', '103');
    drawSMD(43, 23, '#222', '472');
    drawSMD(38, 27, '#a88254'); // Brown ceramic capacitor
    drawSMD(43, 27, '#a88254');

    // Onboard Power LED
    ctx.fillStyle = '#222';
    ctx.fillRect(5, 14, 3, 2);
    ctx.fillStyle = '#33ff77';
    ctx.fillRect(5.5, 14.3, 2, 1.4);

    // ----------------------------------------------------
    // 3. VL53L0X OPTICAL SENSOR PACKAGE
    // ----------------------------------------------------
    const sensorX = 13;
    const sensorY = 7;
    const sensorW = 24;
    const sensorH = 13;

    // Metallic Sensor Casing Gradient
    const metalGrad = ctx.createLinearGradient(sensorX, sensorY, sensorX, sensorY + sensorH);
    metalGrad.addColorStop(0, '#d6d6d6');
    metalGrad.addColorStop(0.3, '#999999');
    metalGrad.addColorStop(0.7, '#cccccc');
    metalGrad.addColorStop(1, '#777777');
    ctx.fillStyle = metalGrad;
    drawRoundRect(sensorX, sensorY, sensorW, sensorH, 1.5);
    ctx.fill();

    // Dark Glass Optical Aperture Window
    ctx.fillStyle = '#0a0a10';
    drawRoundRect(sensorX + 2, sensorY + 2, sensorW - 4, sensorH - 4, 1);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // --- Left Aperture: VCSEL 940nm Infrared Laser Emitter ---
    ctx.fillStyle = '#181824';
    ctx.beginPath(); ctx.arc(19, 13.5, 3.2, 0, Math.PI * 2); ctx.fill();

    const isRanging = dist > 0;
    // VCSEL Iris & IR Glow Effect
    ctx.fillStyle = isRanging ? '#ff2255' : '#33111b';
    ctx.beginPath(); ctx.arc(19, 13.5, 1.8, 0, Math.PI * 2); ctx.fill();

    if (isRanging) {
      ctx.save();
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = dist < 300 ? 10 : 5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(19, 13.5, 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // --- Right Aperture: SPAD Receiver Array ---
    ctx.fillStyle = '#181824';
    ctx.beginPath(); ctx.arc(31, 13.5, 3.2, 0, Math.PI * 2); ctx.fill();
    // Silicon Photodiode Grid Pattern
    ctx.fillStyle = '#112233';
    ctx.fillRect(29.8, 12.3, 2.4, 2.4);
    ctx.strokeStyle = '#225588';
    ctx.lineWidth = 0.4;
    ctx.strokeRect(29.8, 12.3, 2.4, 2.4);

    // Optical Glass Reflection Highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sensorX + 3, sensorY + 3);
    ctx.lineTo(sensorX + 8, sensorY + 3);
    ctx.stroke();

    // ----------------------------------------------------
    // 4. DIGITAL DISTANCE READOUT DISPLAY
    // ----------------------------------------------------
    ctx.fillStyle = '#050a12';
    drawRoundRect(6, 32, 38, 10, 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // Glowing Matrix Text
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 4;
    ctx.font = 'bold 6.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${dist}mm`, 25, 39.5);
    ctx.shadowBlur = 0; // Reset glow

    // ----------------------------------------------------
    // 5. SILKSCREEN & PIN LABELS
    // ----------------------------------------------------
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 3px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VL53L0X', 25, 25);
    ctx.font = '2px sans-serif';
    ctx.fillText('GY-530', 25, 28);

    // Pin Silkscreen Above Header
    ctx.font = 'bold 2.5px monospace';
    ctx.fillText('VCC', 8, 45.5);
    ctx.fillText('GND', 20, 45.5);
    ctx.fillText('SCL', 32, 45.5);
    ctx.fillText('SDA', 44, 45.5);

    // ----------------------------------------------------
    // 6. HEADER PINS & MALE TERMINALS
    // ----------------------------------------------------
    const pinX = [8, 20, 32, 44];

    // Black plastic pin header block
    ctx.fillStyle = '#111111';
    drawRoundRect(4, 47, 42, 4, 1);
    ctx.fill();

    pinX.forEach((px) => {
      // Gold Solder Contacts
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(px - 1.8, 47.8, 3.6, 2.2);

      // Metallic Header Pins
      const pinGrad = ctx.createLinearGradient(px - 0.8, 50, px + 0.8, 50);
      pinGrad.addColorStop(0, '#777');
      pinGrad.addColorStop(0.5, '#fff');
      pinGrad.addColorStop(1, '#555');
      ctx.fillStyle = pinGrad;
      ctx.fillRect(px - 0.8, 50, 1.6, 10);
    });

    // Selection Halo
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -2, -2, 54, 64);
    }

    ctx.restore();
  }
});


/* --------------------------RC522  13.56MHz RFID Reader (SPI)------------------*/

defComp({
  id: 'rc522',
  name: 'RC522 RFID Reader',
  category: 'Sensors',
  icon: '💳',
  desc: 'RC522 13.56MHz RFID tag reader (SPI). For access control and security gate simulations',
  width: 60,
  height: 80,
  defaultProps: { tagPresent: false, uid: '00:00:00:00' },
  interactive: [
    { field: 'tagPresent', label: 'Tag', min: 0, max: 1, step: 1, unit: '' },
  ],
  pins: [
    { id: 'SDA', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 6, y: 80, side: 'bottom' },
    { id: 'SCK', label: 'SCK', type: PIN_TYPE.DIGITAL, x: 16, y: 80, side: 'bottom' },
    { id: 'MOSI', label: 'MOSI', type: PIN_TYPE.DIGITAL, x: 26, y: 80, side: 'bottom' },
    { id: 'MISO', label: 'MISO', type: PIN_TYPE.DIGITAL, x: 36, y: 80, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 46, y: 80, side: 'bottom' },
    { id: 'RST', label: 'RST', type: PIN_TYPE.DIGITAL, x: 8, y: 0, side: 'top' },
    { id: '3V3', label: '3V3', type: PIN_TYPE.POWER, x: 24, y: 0, side: 'top' },
    { id: 'IRQ', label: 'IRQ', type: PIN_TYPE.DIGITAL, x: 40, y: 0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const tagPresent = inst.runtimeState?.tagPresent ?? inst.props.tagPresent ?? false;

    ctx.save();
    ctx.translate(x, y);

    // PCB body
    ctx.fillStyle = '#0a2463';
    roundRect(ctx, 0, 8, 60, 64, 4);
    ctx.fill();
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Antenna coil (circular traces)
    ctx.strokeStyle = '#c8a452';
    ctx.lineWidth = 1.5;
    for (let r = 12; r <= 26; r += 4) {
      ctx.beginPath();
      ctx.arc(30, 36, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // RC522 chip
    ctx.fillStyle = '#111';
    roundRect(ctx, 18, 28, 24, 16, 2);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RC522', 30, 38);

    // Status LED
    ctx.fillStyle = tagPresent ? '#00ff00' : '#003300';
    ctx.beginPath();
    ctx.arc(50, 16, 3, 0, Math.PI * 2);
    ctx.fill();
    if (tagPresent) {
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Tag indicator
    ctx.fillStyle = '#0a0a1a';
    roundRect(ctx, 8, 52, 44, 10, 2);
    ctx.fill();
    ctx.fillStyle = tagPresent ? '#00ff88' : '#666';
    ctx.font = 'bold 5px monospace';
    ctx.fillText(tagPresent ? 'TAG DETECTED' : 'NO TAG', 30, 59);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    [6, 16, 26, 36, 46].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 72); ctx.lineTo(px, 80); ctx.stroke();
    });
    [8, 24, 40].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 8); ctx.lineTo(px, 0); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 64, 88);
    ctx.restore();
  }
});

/* ---------------------TSOP4838 IR Receiver (38kHz NEC/RC5)----------*/
  
defComp({
  id: 'ir_receiver',
  name: 'IR Receiver TSOP4838',
  category: 'Sensors',
  icon: '📲',
  desc: 'TSOP4838 38kHz IR receiver module. Decodes NEC/RC5 infrared remote control signals',
  width: 30,
  height: 50,
  defaultProps: { code: 0, decoding: false },
  interactive: [
    { field: 'code', label: 'Code', min: 0, max: 65535, step: 1, unit: '' },
  ],
  pins: [
    { id: 'OUT', label: 'OUT', type: PIN_TYPE.DIGITAL, x: 6, y: 50, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 15, y: 50, side: 'bottom' },
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 24, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const decoding = inst.runtimeState?.decoding ?? inst.props.decoding ?? false;
    const code = inst.runtimeState?.code ?? inst.props.code ?? 0;

    ctx.save();
    ctx.translate(x, y);

    // Body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 2, 4, 26, 36, 3);
    ctx.fill();

    // IR lens
    const lensGrad = ctx.createRadialGradient(15, 16, 2, 15, 16, 10);
    lensGrad.addColorStop(0, '#333');
    lensGrad.addColorStop(1, '#111');
    ctx.fillStyle = lensGrad;
    ctx.beginPath();
    ctx.arc(15, 16, 10, 0, Math.PI * 2);
    ctx.fill();

    // Receiving element
    ctx.fillStyle = decoding ? '#ff0000' : '#440000';
    ctx.beginPath();
    ctx.arc(15, 16, 4, 0, Math.PI * 2);
    ctx.fill();
    if (decoding) {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Label
    ctx.fillStyle = '#888';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TSOP', 15, 32);
    ctx.fillText('4838', 15, 37);

    // Code display
    if (code > 0) {
      ctx.fillStyle = '#0a0a1a';
      roundRect(ctx, 0, 42, 30, 6, 1);
      ctx.fill();
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 4px monospace';
      ctx.fillText(`0x${code.toString(16).toUpperCase().padStart(4, '0')}`, 15, 47);
    }

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    [6, 15, 24].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 30, 52);
    ctx.restore();
  }
});

/*--------------------------  HC-05 Bluetooth Module (UART)  -----------------*/

defComp({
  id: 'hc05',
  name: 'HC-05 Bluetooth',
  category: 'Sensors',
  icon: 'ᚼᛒ',
  desc: 'HC-05 serial-to-Bluetooth transceiver module (ZS-040 breakout). For mobile app communication',
  width: 54,
  height: 85,
  defaultProps: { connected: false, rxData: '' },
  interactive: [
    { field: 'connected', label: 'Conn', min: 0, max: 1, step: 1, unit: '' },
    { field: 'rxData', label: 'RX Data', type: 'text' },
  ],
  pins: [
    { id: 'STATE', label: 'STATE', type: PIN_TYPE.DIGITAL, x: 7,  y: 85, side: 'bottom' },
    { id: 'RXD',   label: 'RXD',   type: PIN_TYPE.DIGITAL, x: 15, y: 85, side: 'bottom' },
    { id: 'TXD',   label: 'TXD',   type: PIN_TYPE.DIGITAL, x: 23, y: 85, side: 'bottom' },
    { id: 'GND',   label: 'GND',   type: PIN_TYPE.GND,     x: 31, y: 85, side: 'bottom' },
    { id: 'VCC',   label: 'VCC',   type: PIN_TYPE.POWER,   x: 39, y: 85, side: 'bottom' },
    { id: 'EN',    label: 'EN',    type: PIN_TYPE.DIGITAL, x: 47, y: 85, side: 'bottom' },
  ],
  step(inst, sim) {
    if (!sim || !sim.isRunning) return;
    const connected = inst.runtimeState?.connected ?? inst.props?.connected ?? false;
    if (!connected) return;
    const rxData = inst.runtimeState?.rxData ?? inst.props?.rxData ?? '';
    if (typeof rxData === 'string' && rxData.length > 0) {
      sim.sendSerialInput(rxData);
      if (inst.runtimeState) inst.runtimeState.rxData = '';
      else inst.props.rxData = '';
    }
  },
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const connected = inst.runtimeState?.connected ?? inst.props.connected ?? false;
    const isRunning = sim && sim.isRunning;
    const time = Date.now();

    ctx.save();
    ctx.translate(x, y);

    // Canvas helper for rounded rectangles
    const drawRoundRect = (cx, cy, w, h, r) => {
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cx, cy, w, h, r);
      } else {
        ctx.moveTo(cx + r, cy);
        ctx.lineTo(cx + w - r, cy);
        ctx.quadraticCurveTo(cx + w, cy, cx + w, cy + r);
        ctx.lineTo(cx + w, cy + h - r);
        ctx.quadraticCurveTo(cx + w, cy + h, cx + w - r, cy + h);
        ctx.lineTo(cx + r, cy + h);
        ctx.quadraticCurveTo(cx, cy + h, cx, cy + h - r);
        ctx.lineTo(cx, cy + r);
        ctx.quadraticCurveTo(cx, cy, cx + r, cy);
      }
      ctx.closePath();
    };

    // ----------------------------------------------------
    // 1. BASE BREAKOUT PCB (ZS-040 Blue Board)
    // ----------------------------------------------------
    const pcbGrad = ctx.createLinearGradient(0, 0, 54, 0);
    pcbGrad.addColorStop(0, '#0c2340');
    pcbGrad.addColorStop(0.5, '#133863');
    pcbGrad.addColorStop(1, '#0b1d36');
    ctx.fillStyle = pcbGrad;
    drawRoundRect(0, 0, 54, 72, 3);
    ctx.fill();

    // PCB Edge Chamfer Highlight
    ctx.strokeStyle = '#2d588c';
    ctx.lineWidth = 0.8;
    drawRoundRect(0.5, 0.5, 53, 71, 2.5);
    ctx.stroke();

    // Corner Mounting Holes
    [ [4, 4], [50, 4] ].forEach(([hx, hy]) => {
      ctx.fillStyle = '#060f1c';
      ctx.beginPath(); ctx.arc(hx, hy, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c5a059'; // Gold copper ring
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // ----------------------------------------------------
    // 2. GREEN CASTELLATED SUB-MODULE BOARD
    // ----------------------------------------------------
    const subGrad = ctx.createLinearGradient(5, 6, 49, 6);
    subGrad.addColorStop(0, '#0d4218');
    subGrad.addColorStop(0.5, '#165c24');
    subGrad.addColorStop(1, '#0b3814');
    ctx.fillStyle = subGrad;
    drawRoundRect(5, 6, 44, 48, 2);
    ctx.fill();

    // Gold Castellated Soldering Pads (Edges of sub-module)
    ctx.fillStyle = '#d4af37';
    for (let py = 14; py <= 48; py += 4) {
      ctx.fillRect(4.2, py, 2, 1.6);  // Left pads
      ctx.fillRect(47.8, py, 2, 1.6); // Right pads
    }
    for (let px = 10; px <= 42; px += 4) {
      ctx.fillRect(px, 52.8, 1.6, 2); // Bottom pads
    }

    // ----------------------------------------------------
    // 3. MEANDER PCB ANTENNA (Gold Traces)
    // ----------------------------------------------------
    ctx.strokeStyle = '#e5c158';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(9, 18);
    ctx.lineTo(9, 9);
    ctx.lineTo(13, 9);
    ctx.lineTo(13, 16);
    ctx.lineTo(17, 16);
    ctx.lineTo(17, 9);
    ctx.lineTo(21, 9);
    ctx.lineTo(21, 16);
    ctx.lineTo(25, 16);
    ctx.lineTo(25, 9);
    ctx.stroke();

    // ----------------------------------------------------
    // 4. IC CHIPS & COMPONENTS ON SUB-MODULE
    // ----------------------------------------------------
    // CSR BC417 Main Controller Chip (QFN Package)
    ctx.fillStyle = '#1c1d21';
    drawRoundRect(14, 22, 18, 18, 1);
    ctx.fill();

    // QFN Metallic Pins
    ctx.fillStyle = '#a0a0a0';
    for (let p = 16; p <= 28; p += 3) {
      ctx.fillRect(12.8, p, 1.2, 1); // Left
      ctx.fillRect(32, p, 1.2, 1);   // Right
      ctx.fillRect(p, 20.8, 1, 1.2); // Top
      ctx.fillRect(p, 40, 1, 1.2);   // Bottom
    }

    // CSR Chip Markings
    ctx.fillStyle = '#7a7e85';
    ctx.font = 'bold 3.2px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CSR', 23, 29);
    ctx.font = '2.5px monospace';
    ctx.fillText('BC417', 23, 33);
    // Pin 1 Index Dot
    ctx.beginPath(); ctx.arc(16, 24, 0.6, 0, Math.PI * 2); ctx.fill();

    // 8Mbit External Flash Memory IC
    ctx.fillStyle = '#151618';
    drawRoundRect(35, 30, 10, 12, 1);
    ctx.fill();
    ctx.fillStyle = '#61656c';
    ctx.font = '2.2px monospace';
    ctx.fillText('4256', 40, 37);

    // 26MHz Quartz Crystal Oscillator (Silver Metal Can)
    const xtalGrad = ctx.createLinearGradient(35, 20, 45, 25);
    xtalGrad.addColorStop(0, '#c0c0c0');
    xtalGrad.addColorStop(0.5, '#f0f0f0');
    xtalGrad.addColorStop(1, '#8a8a8a');
    ctx.fillStyle = xtalGrad;
    drawRoundRect(35, 20, 10, 6, 1.5);
    ctx.fill();
    ctx.fillStyle = '#444';
    ctx.font = 'bold 2px sans-serif';
    ctx.fillText('26.0', 40, 24);

    // SMD Passives (0603 Resistors & Capacitors)
    const drawSMD = (cx, cy, isCap = false) => {
      ctx.fillStyle = isCap ? '#a87948' : '#222'; // Cap brown vs Resistor black
      ctx.fillRect(cx, cy, 3, 1.6);
      ctx.fillStyle = '#c0c0c0'; // Silver end caps
      ctx.fillRect(cx, cy, 0.6, 1.6);
      ctx.fillRect(cx + 2.4, cy, 0.6, 1.6);
    };
    drawSMD(10, 44, true);
    drawSMD(15, 44, false);
    drawSMD(20, 44, false);
    drawSMD(36, 45, true);

    // ----------------------------------------------------
    // 5. BREAKOUT COMPONENTS (Button, Regulator, LED)
    // ----------------------------------------------------
    // KEY / EN Tactile Push Button (Top Right)
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(44, 56, 5, 5); // Metal case
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(46.5, 58.5, 1.5, 0, Math.PI * 2); ctx.fill(); // Button actuator

    // 3.3V LDO Voltage Regulator (SOT-23 Package)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(8, 56, 6, 4);
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(7, 57, 1, 0.8);
    ctx.fillRect(7, 59, 1, 0.8);
    ctx.fillRect(14, 58, 1, 1);

    // ----------------------------------------------------
    // 6. REALISTIC STATE LED (Blinking / Solid Animation)
    // ----------------------------------------------------
    // LED State: Fast Blink when pairing (5Hz), Solid/Glow when connected
    let ledOn = false;
    if (isRunning) {
      if (connected) {
        ledOn = true;
      } else {
        ledOn = Math.floor(time / 200) % 2 === 0; // 5Hz Pairing Blink
      }
    }

    // Status LED Body
    ctx.fillStyle = '#222';
    drawRoundRect(24, 56, 6, 4, 1);
    ctx.fill();

    // LED Diode Glow
    ctx.fillStyle = ledOn ? '#00f0ff' : '#003344';
    ctx.beginPath(); ctx.arc(27, 58, 1.5, 0, Math.PI * 2); ctx.fill();

    if (ledOn) {
      ctx.save();
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = connected ? 10 : 6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(27, 58, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // ----------------------------------------------------
    // 7. SILKSCREEN TEXT & LABELS
    // ----------------------------------------------------
    ctx.fillStyle = '#f0f4f8';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HC-05', 27, 66);

    ctx.font = '3px sans-serif';
    ctx.fillText('KEY', 46.5, 64);

    // Pin Labels silkscreen at bottom of board
    ctx.font = 'bold 3px monospace';
    const pinLabels = ['STATE', 'RXD', 'TXD', 'GND', 'VCC', 'EN'];
    const pinX = [7, 15, 23, 31, 39, 47];
    pinX.forEach((px, idx) => {
      ctx.fillText(pinLabels[idx], px, 70);
    });

    // ----------------------------------------------------
    // 8. HEADER PINS & PADS
    // ----------------------------------------------------
    pinX.forEach((px) => {
      // Golden Square Pad
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(px - 2.2, 70.5, 4.4, 2);

      // Pin Hole
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(px, 71.5, 0.9, 0, Math.PI * 2); ctx.fill();

      // Pin Extension Metallic Shafts
      const pinGrad = ctx.createLinearGradient(px - 1, 72, px + 1, 72);
      pinGrad.addColorStop(0, '#888');
      pinGrad.addColorStop(0.5, '#fff');
      pinGrad.addColorStop(1, '#666');
      ctx.fillStyle = pinGrad;
      ctx.fillRect(px - 1, 72, 2, 13);
    });

    // Selection Halo
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -2, -2, 58, 89);
    }

    ctx.restore();
  }
});

/* ══════════════ CLASS-BASED SENSOR COMPONENTS ══════════════ */

class LDRComponent extends Component {
  getPins() {
    return [
      { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 10, y: 60, side: 'bottom' },
      { id: 'a', label: 'AO', type: PIN_TYPE.ANALOG, x: 25, y: 60, side: 'bottom' },
      { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 40, y: 60, side: 'bottom' },
    ];
  }
  update(canvas) {
    const aPin = this.getConnectedPinNum('a');
    if (aPin !== null) {
      const val = this.runtimeState.light !== undefined ? this.runtimeState.light : (this.props.light || 512);
      if (window.ArduinoSim && window.ArduinoSim.pinStates) {
        window.ArduinoSim.pinStates[`pin_${aPin}`] = val;
      }
    }
  }
}

class PIRComponent extends Component {
  getPins() {
    return [
      { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 16, y: 62, side: 'bottom' },
      { id: 'out', label: 'OUT', type: PIN_TYPE.DIGITAL, x: 28, y: 62, side: 'bottom' },
      { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 40, y: 62, side: 'bottom' },
    ];
  }
  update(canvas) {
    const outPin = this.getConnectedPinNum('out');
    if (outPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
      const motion = this.runtimeState.motion !== undefined ? !!this.runtimeState.motion : !!(this.props.motion || 0);
      window.ArduinoSim.pinStates[`pin_${outPin}`] = motion ? 1 : 0;
    }
  }
}

class LM35SensorComponent extends Component {
  getPins() {
    return [
      { id: 'VCC', label: 'VCC (+5V)', type: PIN_TYPE.POWER, x: 15, y: 80, side: 'bottom' },
      { id: 'OUT', label: 'VOUT', type: PIN_TYPE.ANALOG, x: 30, y: 80, side: 'bottom' },
      { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 45, y: 80, side: 'bottom' },
    ];
  }
  update(canvas) {
    const outPin = this.getConnectedPinNum('OUT');
    if (outPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
      const temp = this.runtimeState.temp !== undefined
        ? this.runtimeState.temp
        : (this.props.temp ?? 25);
      const voltage = Math.max(0, temp * 0.01);
      const adcVal = Math.max(0, Math.min(1023, Math.round((voltage / 5.0) * 1023)));
      window.ArduinoSim.pinStates[`pin_${outPin}`] = adcVal;
    }
  }
}

class IRObstacleComponent extends Component {
  getPins() {
    return [
      { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 15, y: 92, side: 'bottom' },
      { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 27, y: 92, side: 'bottom' },
      { id: 'OUT', label: 'OUT', type: PIN_TYPE.DIGITAL, x: 39, y: 92, side: 'bottom' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const detected = this.runtimeState?.detected ?? this.props.detected ?? 0;
    this.runtimeState.detected = detected;
    this.runtimeState.OUT = detected ? 0 : 1;
    const outPn = this.getConnectedPinNum('OUT');
    if (outPn !== null) sim.pinStates[`pin_${outPn}`] = detected ? 0 : 1;
  }
}

class FlexSensorComponent extends Component {
  getPins() {
    return [
      { id: 'SIG', label: 'SIG', type: PIN_TYPE.ANALOG, x: 15, y: 70, side: 'bottom' },
      { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 30, y: 70, side: 'bottom' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const bend = this.props.bend ?? 0;
    this.runtimeState.bend = bend;
    const sigPn = this.getConnectedPinNum('SIG');
    if (sigPn !== null) sim.pinStates[`pin_${sigPn}`] = bend;
  }
}

class ThermistorComponent extends Component {
  getPins() {
    return [
      { id: 'p1', label: '1', type: PIN_TYPE.ANALOG, x: 10, y: 50, side: 'bottom' },
      { id: 'p2', label: '2', type: PIN_TYPE.GND, x: 30, y: 50, side: 'bottom' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const temp = this.props.temperature ?? 25;
    this.runtimeState.temperature = temp;
    const analogVal = Math.round(((temp + 10) / 90) * 1023);
    const p1Pn = this.getConnectedPinNum('p1');
    if (p1Pn !== null) sim.pinStates[`pin_${p1Pn}`] = Math.max(0, Math.min(1023, analogVal));
  }
}

class MPU6050Component extends Component {
  getPins() {
    return [
      { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 15, y: 70, side: 'bottom' },
      { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 30, y: 70, side: 'bottom' },
      { id: 'SCL', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 45, y: 70, side: 'bottom' },
      { id: 'SDA', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 60, y: 70, side: 'bottom' },
    ];
  }
  update(canvas) {
    this.runtimeState.accelX = this.props.accelX ?? 0;
    this.runtimeState.accelY = this.props.accelY ?? 0;
    this.runtimeState.accelZ = this.props.accelZ ?? 1024;
    this.runtimeState.gyroX = this.props.gyroX ?? 0;
    this.runtimeState.gyroY = this.props.gyroY ?? 0;
    this.runtimeState.gyroZ = this.props.gyroZ ?? 0;
  }
}

registerComponent('ldr', LDRComponent);
registerComponent('pir', PIRComponent);
registerComponent('lm35_sensor', LM35SensorComponent);
registerComponent('ir_obstacle', IRObstacleComponent);
registerComponent('flex_sensor', FlexSensorComponent);
registerComponent('thermistor', ThermistorComponent);
registerComponent('mpu6050', MPU6050Component);

/* ═══════════════════════ GPS NEO-6M/8M Module ═══════════════════════ */

defComp({
  id: 'gps_neo6m',
  name: 'GPS NEO-6M/8M',
  category: 'Sensors',
  icon: '🛰️',
  desc: 'NEO-6M/8M GPS module with TinyGPS++ simulation — provides latitude, longitude, altitude, satellites, speed, time, and live NMEA stream via UART',
  width: 64,
  height: 80,
  defaultProps: { 
    latitude: 28.6139, 
    longitude: 77.2090, 
    altitude: 215, 
    satellites: 8,
    baudRate: 9600 
  },
  interactive: [
    { field: 'latitude', label: 'Lat', min: -90, max: 90, step: 0.0001, unit: '°' },
    { field: 'longitude', label: 'Lng', min: -180, max: 180, step: 0.0001, unit: '°' },
    { field: 'altitude', label: 'Alt', min: -500, max: 9000, step: 1, unit: 'm' },
    { field: 'satellites', label: 'Sats', min: 0, max: 20, step: 1, unit: '' },
    { field: 'baudRate', label: 'Baud', min: 4800, max: 115200, step: 4800, unit: 'bps' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 12, y: 80, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 26, y: 80, side: 'bottom' },
    { id: 'TX', label: 'TX', type: PIN_TYPE.DIGITAL, x: 40, y: 80, side: 'bottom' },
    { id: 'RX', label: 'RX', type: PIN_TYPE.DIGITAL, x: 54, y: 80, side: 'bottom' },
  ],
  
  step(inst, sim) {
    if (!sim?.isRunning) return;
    
    // Initialize runtime state if not present
    if (!inst.runtimeState) {
      inst.runtimeState = {
        latitude: inst.props.latitude ?? 28.6139,
        longitude: inst.props.longitude ?? 77.2090,
        altitude: inst.props.altitude ?? 215,
        satellites: inst.props.satellites ?? 8,
        powered: true,
        lastNmeaTime: 0,
        nmeaBuffer: ''
      };
    }

    const state = inst.runtimeState;

    // Always sync from props so slider changes take effect immediately
    if (inst.props.latitude !== undefined) state.latitude = inst.props.latitude;
    if (inst.props.longitude !== undefined) state.longitude = inst.props.longitude;
    if (inst.props.altitude !== undefined) state.altitude = inst.props.altitude;
    if (inst.props.satellites !== undefined) state.satellites = inst.props.satellites;

    const isPowered = state.powered;
    const sats = state.satellites ?? inst.props.satellites ?? 8;
    const hasFix = isPowered && sats > 0;

    if (!hasFix) return;

    // Simulate NMEA sentence generation ($GPGGA) every 1 second
    const now = sim.simTime ?? Date.now();
    if (!state.lastNmeaTime || now - state.lastNmeaTime >= 1000) {
      state.lastNmeaTime = now;
      
      const lat = state.latitude ?? inst.props.latitude;
      const lng = state.longitude ?? inst.props.longitude;
      const alt = state.altitude ?? inst.props.altitude;
      
      // Convert decimal degrees to NMEA coordinate format (DDMM.MMMM)
      const latDeg = Math.floor(Math.abs(lat));
      const latMin = (Math.abs(lat) - latDeg) * 60;
      const latStr = `${String(latDeg).padStart(2, '0')}${latMin.toFixed(4).padStart(7, '0')},${lat >= 0 ? 'N' : 'S'}`;

      const lngDeg = Math.floor(Math.abs(lng));
      const lngMin = (Math.abs(lng) - lngDeg) * 60;
      const lngStr = `${String(lngDeg).padStart(3, '0')}${lngMin.toFixed(4).padStart(7, '0')},${lng >= 0 ? 'E' : 'W'}`;

      // Construct a basic GGA sentence
      const timeStr = '123519.00'; // UTC placeholder
      const fixQuality = sats > 3 ? '1' : '0';
      const hdop = '1.0';
      const altUnit = 'M';
      
      const sentenceBody = `GPGGA,${timeStr},${latStr},${lngStr},${fixQuality},${sats},${hdop},${alt},${altUnit},0.0,M,,`;
      
      // Calculate NMEA checksum
      let checksum = 0;
      for (let i = 0; i < sentenceBody.length; i++) {
        checksum ^= sentenceBody.charCodeAt(i);
      }
      const checksumStr = checksum.toString(16).toUpperCase().padStart(2, '0');
      const fullSentence = `$${sentenceBody}*${checksumStr}\r\n`;

      state.nmeaBuffer = fullSentence;

      // Push NMEA characters into the simulator's serial input buffer
      // so Serial2.available() > 0 and Serial2.read() returns the bytes
      if (sim && typeof sim.sendSerialInput === 'function') {
        sim.sendSerialInput(fullSentence);
      }
    }
  },

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const lat = inst.runtimeState?.latitude ?? inst.props.latitude ?? 28.6139;
    const lng = inst.runtimeState?.longitude ?? inst.props.longitude ?? 77.2090;
    const alt = inst.runtimeState?.altitude ?? inst.props.altitude ?? 215;
    const sats = inst.runtimeState?.satellites ?? inst.props.satellites ?? 8;
    const isPowered = sim?.isRunning ? (inst.runtimeState?.powered ?? true) : false;
    const hasFix = isPowered && sats > 0;

    ctx.save();
    ctx.translate(x, y);

    // 1. Blue PCB Body (NEO-6M breakout board)
    ctx.fillStyle = '#1a3a6e';
    roundRect(ctx, 0, 0, 64, 68, 4);
    ctx.fill();
    ctx.strokeStyle = '#4a7ab5';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. GPS Antenna (ceramic patch — top portion) with subtle operational glow when fixed
    if (hasFix) {
      ctx.shadowColor = '#00ccff';
      ctx.shadowBlur = 6;
    }
    const antGrad = ctx.createLinearGradient(6, 3, 58, 25);
    antGrad.addColorStop(0, '#8a8a8a');
    antGrad.addColorStop(0.3, '#b0b0b0');
    antGrad.addColorStop(0.7, '#9a9a9a');
    antGrad.addColorStop(1, '#7a7a7a');
    ctx.fillStyle = antGrad;
    roundRect(ctx, 6, 3, 52, 22, 2);
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow
    
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Antenna center feed point
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(32, 14, 3, 0, Math.PI * 2);
    ctx.fill();

    // Antenna label
    ctx.fillStyle = '#333';
    ctx.font = 'bold 4px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GPS', 32, 15);

    // 3. NEO-6M Chip (black IC)
    const chipGrad = ctx.createLinearGradient(18, 28, 46, 42);
    chipGrad.addColorStop(0, '#2a2a2a');
    chipGrad.addColorStop(0.5, '#1a1a1a');
    chipGrad.addColorStop(1, '#111');
    ctx.fillStyle = chipGrad;
    roundRect(ctx, 18, 28, 28, 14, 1.5);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.3;
    ctx.stroke();

    // Chip label
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 3.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NEO-6M', 32, 36);

    // 4. Power LED
    ctx.fillStyle = isPowered ? '#00ff44' : '#223322';
    ctx.beginPath();
    ctx.arc(8, 30, 1.5, 0, Math.PI * 2);
    ctx.fill();
    if (isPowered) {
      ctx.shadowColor = '#00ff44';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 5. Fix LED (blinks when satellite fix acquired)
    const blinkOn = hasFix && ((sim?.time ?? Date.now()) % 1000 < 500);
    ctx.fillStyle = blinkOn ? '#00ccff' : '#112233';
    ctx.beginPath();
    ctx.arc(56, 30, 1.5, 0, Math.PI * 2);
    ctx.fill();
    if (blinkOn) {
      ctx.shadowColor = '#00ccff';
      ctx.shadowBlur = 5;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 6. Live Data Display Screen
    ctx.fillStyle = '#0a1628';
    roundRect(ctx, 4, 46, 56, 16, 2);
    ctx.fill();
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Lat/Lng readout
    ctx.textAlign = 'left';
    ctx.font = 'bold 4px monospace';

    ctx.fillStyle = '#00e5ff';
    ctx.fillText('LAT', 6, 52);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lat.toFixed(4), 20, 52);

    ctx.fillStyle = '#00e5ff';
    ctx.fillText('LNG', 6, 58);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lng.toFixed(4), 20, 58);

    // Satellites count
    ctx.fillStyle = '#ffab00';
    ctx.font = 'bold 4px monospace';
    ctx.fillText('SAT', 44, 52);
    ctx.fillStyle = hasFix ? '#00ff88' : '#ff4444';
    ctx.fillText(String(sats), 56, 52);

    // Altitude
    ctx.fillStyle = '#b388ff';
    ctx.fillText('ALT', 44, 58);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(alt + 'm', 56, 58);

    // 7. Silkscreen Pin Labels & Headers
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 4.5px sans-serif';
    ctx.textAlign = 'center';
    const pinLabels = ['VCC', 'GND', 'TX', 'RX'];
    const pinXs = [12, 26, 40, 54];

    pinXs.forEach((px, idx) => {
      ctx.fillText(pinLabels[idx], px, 68);

      // Gold Solder Pads
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(px, 72, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Hole
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(px, 72, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Pin Leads extending to 80
      ctx.strokeStyle = '#d4d4d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, 74);
      ctx.lineTo(px, 80);
      ctx.stroke();

      // Pin Header Metallic Highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(px - 0.5, 74);
      ctx.lineTo(px - 0.5, 80);
      ctx.stroke();
    });

    // Selection Highlight
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -2, -2, 68, 84);
    }

    ctx.restore();
  }
});

// defComp({
//   id: 'gps_neo6m',
//   name: 'GPS NEO-6M/8M',
//   category: 'Sensors',
//   icon: '🛰️',
//   desc: 'NEO-6M/8M GPS module with TinyGPS++ — provides latitude, longitude, altitude, satellites, speed, and time via UART',
//   width: 64,
//   height: 80,
//   defaultProps: { latitude: 28.6139, longitude: 77.2090, altitude: 215, satellites: 8 },
//   interactive: [
//     { field: 'latitude', label: 'Lat', min: -90, max: 90, step: 0.0001, unit: '°' },
//     { field: 'longitude', label: 'Lng', min: -180, max: 180, step: 0.0001, unit: '°' },
//     { field: 'altitude', label: 'Alt', min: -500, max: 9000, step: 1, unit: 'm' },
//     { field: 'satellites', label: 'Sats', min: 0, max: 20, step: 1, unit: '' },
//   ],
//   pins: [
//     { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 12, y: 80, side: 'bottom' },
//     { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 26, y: 80, side: 'bottom' },
//     { id: 'TX', label: 'TX', type: PIN_TYPE.DIGITAL, x: 40, y: 80, side: 'bottom' },
//     { id: 'RX', label: 'RX', type: PIN_TYPE.DIGITAL, x: 54, y: 80, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const lat = inst.runtimeState?.latitude ?? inst.props.latitude ?? 28.6139;
//     const lng = inst.runtimeState?.longitude ?? inst.props.longitude ?? 77.2090;
//     const alt = inst.runtimeState?.altitude ?? inst.props.altitude ?? 215;
//     const sats = inst.runtimeState?.satellites ?? inst.props.satellites ?? 8;
//     const isPowered = sim?.isRunning ? (inst.runtimeState?.powered ?? true) : false;
//     const hasFix = isPowered && sats > 0;

//     ctx.save();
//     ctx.translate(x, y);

//     // 1. Blue PCB Body (NEO-6M breakout board)
//     ctx.fillStyle = '#1a3a6e';
//     roundRect(ctx, 0, 0, 64, 68, 4);
//     ctx.fill();
//     ctx.strokeStyle = '#4a7ab5';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // 2. GPS Antenna (ceramic patch — top portion)
//     const antGrad = ctx.createLinearGradient(6, 3, 58, 25);
//     antGrad.addColorStop(0, '#8a8a8a');
//     antGrad.addColorStop(0.3, '#b0b0b0');
//     antGrad.addColorStop(0.7, '#9a9a9a');
//     antGrad.addColorStop(1, '#7a7a7a');
//     ctx.fillStyle = antGrad;
//     roundRect(ctx, 6, 3, 52, 22, 2);
//     ctx.fill();
//     ctx.strokeStyle = '#555';
//     ctx.lineWidth = 0.5;
//     ctx.stroke();

//     // Antenna center dot
//     ctx.fillStyle = '#666';
//     ctx.beginPath();
//     ctx.arc(32, 14, 3, 0, Math.PI * 2);
//     ctx.fill();

//     // Antenna label
//     ctx.fillStyle = '#333';
//     ctx.font = 'bold 4px sans-serif';
//     ctx.textAlign = 'center';
//     ctx.fillText('GPS', 32, 15);

//     // 3. NEO-6M Chip (black IC)
//     const chipGrad = ctx.createLinearGradient(18, 28, 46, 42);
//     chipGrad.addColorStop(0, '#2a2a2a');
//     chipGrad.addColorStop(0.5, '#1a1a1a');
//     chipGrad.addColorStop(1, '#111');
//     ctx.fillStyle = chipGrad;
//     roundRect(ctx, 18, 28, 28, 14, 1.5);
//     ctx.fill();
//     ctx.strokeStyle = '#444';
//     ctx.lineWidth = 0.3;
//     ctx.stroke();

//     // Chip label
//     ctx.fillStyle = '#aaa';
//     ctx.font = 'bold 3.5px monospace';
//     ctx.textAlign = 'center';
//     ctx.fillText('NEO-6M', 32, 36);

//     // 4. Power LED
//     ctx.fillStyle = isPowered ? '#00ff44' : '#223322';
//     ctx.beginPath();
//     ctx.arc(8, 30, 1.5, 0, Math.PI * 2);
//     ctx.fill();
//     if (isPowered) {
//       ctx.shadowColor = '#00ff44';
//       ctx.shadowBlur = 4;
//       ctx.fill();
//       ctx.shadowBlur = 0;
//     }

//     // 5. Fix LED (blinks when satellite fix acquired)
//     const blinkOn = hasFix && (Date.now() % 1000 < 500);
//     ctx.fillStyle = blinkOn ? '#00ccff' : '#112233';
//     ctx.beginPath();
//     ctx.arc(56, 30, 1.5, 0, Math.PI * 2);
//     ctx.fill();
//     if (blinkOn) {
//       ctx.shadowColor = '#00ccff';
//       ctx.shadowBlur = 5;
//       ctx.fill();
//       ctx.shadowBlur = 0;
//     }

//     // 6. Live Data Display
//     ctx.fillStyle = '#0a1628';
//     roundRect(ctx, 4, 46, 56, 16, 2);
//     ctx.fill();
//     ctx.strokeStyle = '#1e3a5f';
//     ctx.lineWidth = 0.5;
//     ctx.stroke();

//     // Lat/Lng readout
//     ctx.textAlign = 'left';
//     ctx.font = 'bold 4px monospace';

//     ctx.fillStyle = '#00e5ff';
//     ctx.fillText('LAT', 6, 52);
//     ctx.fillStyle = '#ffffff';
//     ctx.fillText(lat.toFixed(4), 20, 52);

//     ctx.fillStyle = '#00e5ff';
//     ctx.fillText('LNG', 6, 58);
//     ctx.fillStyle = '#ffffff';
//     ctx.fillText(lng.toFixed(4), 20, 58);

//     // Satellites count
//     ctx.fillStyle = '#ffab00';
//     ctx.font = 'bold 4px monospace';
//     ctx.fillText('SAT', 44, 52);
//     ctx.fillStyle = hasFix ? '#00ff88' : '#ff4444';
//     ctx.fillText(String(sats), 56, 52);

//     // Altitude
//     ctx.fillStyle = '#b388ff';
//     ctx.fillText('ALT', 44, 58);
//     ctx.fillStyle = '#ffffff';
//     ctx.fillText(alt + 'm', 56, 58);

//     // 7. Silkscreen Pin Labels
//     ctx.fillStyle = '#ffffff';
//     ctx.font = 'bold 4.5px sans-serif';
//     ctx.textAlign = 'center';
//     const pinLabels = ['VCC', 'GND', 'TX', 'RX'];
//     const pinXs = [12, 26, 40, 54];

//     pinXs.forEach((px, idx) => {
//       ctx.fillText(pinLabels[idx], px, 68);

//       // Gold Solder Pads
//       ctx.fillStyle = '#d4af37';
//       ctx.beginPath();
//       ctx.arc(px, 72, 2.5, 0, Math.PI * 2);
//       ctx.fill();

//       // Hole
//       ctx.fillStyle = '#1a1a1a';
//       ctx.beginPath();
//       ctx.arc(px, 72, 1.2, 0, Math.PI * 2);
//       ctx.fill();

//       // Pin Leads extending to 80
//       ctx.strokeStyle = '#d4d4d4';
//       ctx.lineWidth = 1.5;
//       ctx.beginPath();
//       ctx.moveTo(px, 74);
//       ctx.lineTo(px, 80);
//       ctx.stroke();

//       // Pin Header Metallic Highlight
//       ctx.strokeStyle = '#ffffff';
//       ctx.lineWidth = 0.5;
//       ctx.beginPath();
//       ctx.moveTo(px - 0.5, 74);
//       ctx.lineTo(px - 0.5, 80);
//       ctx.stroke();
//     });

//     // Selection Highlight
//     if (inst.selected && typeof drawSelectionRect === 'function') {
//       drawSelectionRect(ctx, -2, -2, 68, 84);
//     }

//     ctx.restore();
//   }
// });
