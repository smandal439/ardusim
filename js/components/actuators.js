'use strict';
/* components/actuators.js — Actuator component definitions */

/* ─── SERVO MOTOR ─── */
defComp({
  id: 'servo',
  name: 'Servo Motor',
  category: 'Actuators',
  icon: '⚙️',
  desc: 'RC servo motor — rotates 0 to 180 degrees based on PWM signal',
  width: 60,
  height: 50,
  defaultProps: { angle: 90, minAngle: 0, maxAngle: 180 },
  pins: [
    { id: 'signal', label: 'SIG', type: PIN_TYPE.PWM, x: 8, y: 50, side: 'bottom' },
    { id: 'vcc', label: '+', type: PIN_TYPE.POWER, x: 25, y: 50, side: 'bottom' },
    { id: 'gnd', label: '−', type: PIN_TYPE.GND, x: 42, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const angle = inst.runtimeState && inst.runtimeState.angle !== undefined
      ? inst.runtimeState.angle : (inst.props.angle || 90);
    const rad = (angle - 90) * Math.PI / 180;

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#f5c842'; // signal = yellow
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(8, 50); ctx.lineTo(8, 44); ctx.stroke();
    ctx.strokeStyle = '#cc3333';
    ctx.beginPath(); ctx.moveTo(25, 50); ctx.lineTo(25, 44); ctx.stroke();
    ctx.strokeStyle = '#333';
    ctx.beginPath(); ctx.moveTo(42, 50); ctx.lineTo(42, 44); ctx.stroke();

    // Body
    const bodyGrad = ctx.createLinearGradient(0, 5, 60, 45);
    bodyGrad.addColorStop(0, '#3a3a3a');
    bodyGrad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 0, 5, 60, 40, 6);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Gear hub
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(30, 22, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(30, 22, 7, 0, Math.PI * 2);
    ctx.fill();

    // Servo arm
    ctx.save();
    ctx.translate(30, 22);
    ctx.rotate(rad);
    ctx.fillStyle = '#aaa';
    roundRect(ctx, -4, -20, 8, 22, 3);
    ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.beginPath();
    ctx.arc(0, -18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Center hub
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(30, 22, 4, 0, Math.PI * 2);
    ctx.fill();

    // Angle display
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(angle) + '°', 30, 40);

    if (inst.selected) drawSelectionRect(ctx, -3, 2, 66, 55);
    ctx.restore();
  }
});

/* ─── Electromagnetic Relay Module ─── */

defComp({
  id: 'relay',
  name: 'Relay Module',
  category: 'Actuators',
  icon: '⚡',
  desc: 'Electromagnetic relay module (Songle 5V) — digital signal switches COM between NO and NC contacts',
  width: 90,
  height: 60,
  defaultProps: { label: 'RELAY' },
  pins: [
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 12, y: 60, side: 'bottom' },
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 24, y: 60, side: 'bottom' },
    { id: 'sig', label: 'IN', type: PIN_TYPE.DIGITAL, x: 36, y: 60, side: 'bottom' },
    { id: 'com', label: 'COM', type: PIN_TYPE.SIGNAL, x: 54, y: 60, side: 'bottom' },
    { id: 'no', label: 'NO', type: PIN_TYPE.SIGNAL, x: 66, y: 60, side: 'bottom' },
    { id: 'nc', label: 'NC', type: PIN_TYPE.SIGNAL, x: 78, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const active = !!(inst.runtimeState && inst.runtimeState.active);

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
    // 1. BASE MODULE PCB (Blue Mask)
    // ----------------------------------------------------
    const pcbGrad = ctx.createLinearGradient(0, 0, 90, 0);
    pcbGrad.addColorStop(0, '#0f3860');
    pcbGrad.addColorStop(0.5, '#1b5288');
    pcbGrad.addColorStop(1, '#0c2e50');
    ctx.fillStyle = pcbGrad;
    drawRoundRect(0, 0, 90, 48, 3.5);
    ctx.fill();

    // PCB Edge Chamfer Line
    ctx.strokeStyle = '#2d72b8';
    ctx.lineWidth = 0.8;
    drawRoundRect(0.6, 0.6, 88.8, 46.8, 3);
    ctx.stroke();

    // Corner Mounting Holes with Copper Rings
    [[4, 4], [86, 4], [4, 44], [86, 44]].forEach(([hx, hy]) => {
      ctx.fillStyle = '#061320';
      ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#d4af37'; // Gold copper ring
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // ----------------------------------------------------
    // 2. SONGLE BLUE RELAY CUBE
    // ----------------------------------------------------
    const rX = 38, rY = 5, rW = 48, rH = 28;

    // Relay Casing Gradient
    const relayGrad = ctx.createLinearGradient(rX, rY, rX, rY + rH);
    relayGrad.addColorStop(0, '#2b82d9');
    relayGrad.addColorStop(0.3, '#1a6ec7');
    relayGrad.addColorStop(1, '#0e4e93');
    ctx.fillStyle = relayGrad;
    drawRoundRect(rX, rY, rW, rH, 2);
    ctx.fill();

    // Top Bevel Highlight on Relay Box
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(rX + 2, rY + 1);
    ctx.lineTo(rX + rW - 2, rY + 1);
    ctx.stroke();

    // Songle Relay Silk Markings
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 4.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SONGLE', rX + 4, rY + 8);

    ctx.font = '3px monospace';
    ctx.fillText('SRD-05VDC-SL-C', rX + 4, rY + 14);
    ctx.font = '2.5px sans-serif';
    ctx.fillStyle = '#d0e4ff';
    ctx.fillText('10A 250VAC  10A 30VDC', rX + 4, rY + 20);
    ctx.fillText('10A 125VAC  10A 28VDC', rX + 4, rY + 24);

    // ----------------------------------------------------
    // 3. OPTOCOUPLER & CONTROL CIRCUITRY (Left Side)
    // ----------------------------------------------------
    // Optocoupler IC (EL817 4-Pin DIP Package)
    ctx.fillStyle = '#1c1d21';
    drawRoundRect(14, 6, 12, 10, 1);
    ctx.fill();
    ctx.fillStyle = '#7a7e85';
    ctx.font = 'bold 2.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('817C', 20, 12);
    // Pin 1 Dot
    ctx.beginPath(); ctx.arc(16, 8, 0.6, 0, Math.PI * 2); ctx.fill();

    // Flyback Diode & Driver Transistor (SOT-23)
    ctx.fillStyle = '#111';
    ctx.fillRect(8, 22, 5, 3); // SMD Diode
    ctx.fillStyle = '#ccc';
    ctx.fillRect(8, 22, 1, 3); // Diode cathode bar

    ctx.fillStyle = '#181818';
    ctx.fillRect(18, 22, 6, 4); // SOT-23 Transistor

    // High/Low Trigger Selection Jumper Block
    ctx.fillStyle = '#111';
    ctx.fillRect(28, 6, 6, 10);
    // Gold pins
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(30, 8, 2, 1.5);
    ctx.fillRect(30, 11, 2, 1.5);
    ctx.fillRect(30, 14, 2, 1.5);
    // Yellow Jumper Cap (Default to Low Level Trigger)
    ctx.fillStyle = '#f5c518';
    drawRoundRect(29, 7.5, 4, 4.5, 0.8);
    ctx.fill();

    // ----------------------------------------------------
    // 4. POWER & RELAY STATUS LEDs
    // ----------------------------------------------------
    // Power LED (Green - Always ON when board receives power)
    ctx.fillStyle = '#222';
    drawRoundRect(6, 32, 4, 3, 0.8);
    ctx.fill();
    ctx.fillStyle = '#00ff66';
    ctx.beginPath(); ctx.arc(8, 33.5, 1, 0, Math.PI * 2); ctx.fill();

    // Relay Active LED (Red / Green Glow when active)
    ctx.fillStyle = '#222';
    drawRoundRect(28, 32, 4, 3, 0.8);
    ctx.fill();

    ctx.fillStyle = active ? '#ff3333' : '#441111';
    ctx.beginPath(); ctx.arc(30, 33.5, 1, 0, Math.PI * 2); ctx.fill();

    if (active) {
      ctx.save();
      ctx.shadowColor = '#ff3333';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(30, 33.5, 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // ----------------------------------------------------
    // 5. BLUE HIGH-VOLTAGE SCREW TERMINAL BLOCK
    // ----------------------------------------------------
    const termX = 48, termY = 35, termW = 38, termH = 12;

    const termGrad = ctx.createLinearGradient(termX, termY, termX, termY + termH);
    termGrad.addColorStop(0, '#1d8142');
    termGrad.addColorStop(0.5, '#156131');
    termGrad.addColorStop(1, '#0e4221');
    ctx.fillStyle = termGrad;
    drawRoundRect(termX, termY, termW, termH, 1.5);
    ctx.fill();

    // Metallic Terminal Screws
    [54, 66, 78].forEach((sx) => {
      // Metal Housing Entry
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(sx, termY + 5, 2.5, 0, Math.PI * 2); ctx.fill();

      // Silver Screw Head
      const screwGrad = ctx.createLinearGradient(sx - 2, termY + 3, sx + 2, termY + 7);
      screwGrad.addColorStop(0, '#e0e0e0');
      screwGrad.addColorStop(1, '#888888');
      ctx.fillStyle = screwGrad;
      ctx.beginPath(); ctx.arc(sx, termY + 5, 2, 0, Math.PI * 2); ctx.fill();

      // Screw Slot (+)
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(sx - 1.2, termY + 5); ctx.lineTo(sx + 1.2, termY + 5);
      ctx.moveTo(sx, termY + 3.8); ctx.lineTo(sx, termY + 6.2);
      ctx.stroke();
    });

    // ----------------------------------------------------
    // 6. SILKSCREEN LABELS
    // ----------------------------------------------------
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 3px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PWR', 8, 38);
    ctx.fillText('IN_LED', 30, 38);

    // Terminal Block Labels
    ctx.font = 'bold 3px monospace';
    ctx.fillText('COM', 54, 33);
    ctx.fillText('NO', 66, 33);
    ctx.fillText('NC', 78, 33);

    // Input Pin Labels
    ctx.fillText('VCC', 12, 45);
    ctx.fillText('GND', 24, 45);
    ctx.fillText('IN', 36, 45);

    // ----------------------------------------------------
    // 7. HEADER PINS & TERMINAL CONNECTIONS
    // ----------------------------------------------------
    // Control Male Header Pins (VCC, GND, IN)
    ctx.fillStyle = '#111111';
    drawRoundRect(8, 47, 32, 4, 1);
    ctx.fill();

    [12, 24, 36].forEach((px) => {
      // Golden Solder Contact Pad
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(px - 1.8, 47.8, 3.6, 2);

      // Gold Header Pin Extension
      const pinGrad = ctx.createLinearGradient(px - 0.8, 50, px + 0.8, 50);
      pinGrad.addColorStop(0, '#888');
      pinGrad.addColorStop(0.5, '#fff');
      pinGrad.addColorStop(1, '#666');
      ctx.fillStyle = pinGrad;
      ctx.fillRect(px - 0.8, 50, 1.6, 10);
    });

    // Terminal Output Leads (COM, NO, NC)
    [54, 66, 78].forEach((px) => {
      // Golden Solder Contact Pad
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(px - 1.8, 47.8, 3.6, 2);

      // Screw Wire Entry Leads
      const leadGrad = ctx.createLinearGradient(px - 1, 50, px + 1, 50);
      leadGrad.addColorStop(0, '#555');
      leadGrad.addColorStop(0.5, '#aaa');
      leadGrad.addColorStop(1, '#444');
      ctx.fillStyle = leadGrad;
      ctx.fillRect(px - 1, 50, 2, 10);
    });

    // Selection Halo
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -2, -2, 94, 64);
    }

    ctx.restore();
  }
});

/* ─── DC MOTOR ─── */
// defComp({
//   id: 'dc_motor',
//   name: 'DC Motor',
//   category: 'Actuators',
//   icon: '🌀',
//   desc: 'Brushed DC motor (Enlarged Front View) — speed controlled by PWM',
//   width: 80,
//   height: 100,
//   defaultProps: { label: 'MOTOR' },
//   pins: [
//     { id: 'in', label: 'IN', type: PIN_TYPE.PWM, x: 30, y: 100, side: 'bottom' },
//     { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 50, y: 100, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const speed = inst.runtimeState?.speed ?? 0;
//     const rpm = inst.runtimeState?.rpm ?? Math.round(Math.abs(speed) * 3000);
//     const t = sim?.simTime ?? 0;
//     const cx = 40, cy = 40; // Center of front casing

//     ctx.save();
//     ctx.translate(x, y);

//     // --- 1. Rear Terminal Leads & Solder Tabs ---
//     ctx.lineWidth = 3;
//     // IN Pin (Brass Lead)
//     ctx.strokeStyle = '#d4af37';
//     ctx.beginPath(); ctx.moveTo(30, 68); ctx.lineTo(30, 100); ctx.stroke();
//     // GND Pin (Silver Lead)
//     ctx.strokeStyle = '#a0a5aa';
//     ctx.beginPath(); ctx.moveTo(50, 68); ctx.lineTo(50, 100); ctx.stroke();

//     // Red (+) and Black (-) Terminal Solder Points
//     ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(30, 68, 4.5, 0, Math.PI * 2); ctx.fill();
//     ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(50, 68, 4.5, 0, Math.PI * 2); ctx.fill();

//     // --- 2. Outer Metallic Motor Body ---
//     // Casing Drop Shadow
//     ctx.fillStyle = 'rgba(0,0,0,0.25)';
//     ctx.beginPath(); ctx.arc(cx, cy + 3, 34, 0, Math.PI * 2); ctx.fill();

//     // Metallic Can Body
//     const casingGrad = ctx.createRadialGradient(cx - 10, cy - 10, 3, cx, cy, 34);
//     casingGrad.addColorStop(0.0, '#ffffff');
//     casingGrad.addColorStop(0.3, '#bcc1c9');
//     casingGrad.addColorStop(0.7, '#676b73');
//     casingGrad.addColorStop(1.0, '#2b2d31');

//     ctx.fillStyle = casingGrad;
//     ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
//     ctx.strokeStyle = '#1d1f22';
//     ctx.lineWidth = 1.5;
//     ctx.stroke();

//     // Front Face Stamped Ring
//     ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
//     ctx.lineWidth = 1.2;
//     ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();

//     // --- 3. Mounting Holes & Heat Vents ---
//     ctx.fillStyle = '#18191c';
//     // Left & Right Screw Mounts
//     ctx.beginPath(); ctx.arc(22, cy, 3.2, 0, Math.PI * 2); ctx.fill();
//     ctx.beginPath(); ctx.arc(58, cy, 3.2, 0, Math.PI * 2); ctx.fill();

//     // Stamped Air Vent Slits
//     if (typeof roundRect === 'function') {
//       roundRect(ctx, 33, 13, 14, 3.5, 1.5); ctx.fill();
//       roundRect(ctx, 33, 63.5, 14, 3.5, 1.5); ctx.fill();
//     } else {
//       ctx.fillRect(33, 13, 14, 3.5);
//       ctx.fillRect(33, 63.5, 14, 3.5);
//     }

//     // --- 4. Central Raised Bearing Hub ---
//     const hubGrad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 11);
//     hubGrad.addColorStop(0, '#f0f3f7');
//     hubGrad.addColorStop(0.5, '#959a9e');
//     hubGrad.addColorStop(1, '#3a3d42');

//     ctx.fillStyle = hubGrad;
//     ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
//     ctx.strokeStyle = '#222';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // Brass Bushing Ring
//     ctx.strokeStyle = '#d4af37';
//     ctx.lineWidth = 1.5;
//     ctx.beginPath(); ctx.arc(cx, cy, 7.5, 0, Math.PI * 2); ctx.stroke();

//     // --- 5. Blade Animation (Low Voltage Visuals + High Speed Blur) ---
//     ctx.save();
//     ctx.translate(cx, cy);

//     const absSpeed = Math.abs(speed);
//     const isLowVoltage = absSpeed > 0.001 && absSpeed <= 0.3;
//     const isHighSpeed = absSpeed > 0.3;

//     // Angle tracking with low-voltage smooth minimum rotation boost
//     if (!inst.runtimeState) inst.runtimeState = {};
//     if (inst.runtimeState.angle === undefined) inst.runtimeState.angle = 0;

//     // Low voltage speed scaling ensures blades clearly spin even at very low duty cycles
//     const rotationMult = isLowVoltage ? Math.max(0.08, absSpeed) * 16 : speed * 12;

//     if (sim?.dt) {
//       inst.runtimeState.angle += Math.sign(speed || 1) * rotationMult * sim.dt;
//     } else {
//       inst.runtimeState.angle = t * 0.003 * Math.sign(speed || 1) * (isLowVoltage ? 8 : speed * 10);
//     }
//     const angle = inst.runtimeState.angle;

//     // --- LOW VOLTAGE EFFECT: Soft pulsating power halo around hub ---
//     if (isLowVoltage) {
//       const pulse = Math.sin(t * 8) * 0.2 + 0.8;
//       ctx.strokeStyle = `rgba(241, 196, 15, ${0.4 * pulse})`;
//       ctx.lineWidth = 2;
//       ctx.beginPath();
//       ctx.arc(0, 0, 13, 0, Math.PI * 2);
//       ctx.stroke();
//     }

//     // --- HIGH SPEED EFFECT: Motion Blur Disk (Only active when speed > 0.3) ---
//     if (isHighSpeed) {
//       const blurAlpha = Math.min(0.5, (absSpeed - 0.3) * 0.7);
//       const blurGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 27);
//       blurGrad.addColorStop(0, 'rgba(52, 152, 219, 0)');
//       blurGrad.addColorStop(0.6, `rgba(52, 152, 219, ${blurAlpha * 0.6})`);
//       blurGrad.addColorStop(1, `rgba(41, 128, 185, ${blurAlpha * 0.2})`);

//       ctx.fillStyle = blurGrad;
//       ctx.beginPath();
//       ctx.arc(0, 0, 27, 0, Math.PI * 2);
//       ctx.fill();
//     }

//     // --- BLADE RENDER PASS ---
//     // At low voltage: High opacity & crisp borders (0 blur noise). At high speed: Increased transparency.
//     const bladeOpacity = isLowVoltage ? 0.95 : Math.max(0.3, 1 - absSpeed * 0.5);
//     const blurSteps = isHighSpeed ? 3 : 1;

//     for (let step = blurSteps - 1; step >= 0; step--) {
//       const stepOffset = Math.sign(speed || 1) * step * 0.12;
//       const stepAngle = angle - stepOffset;
//       const stepAlpha = step === 0 ? bladeOpacity : (bladeOpacity * 0.3) / step;

//       ctx.save();
//       ctx.rotate(stepAngle);

//       ctx.fillStyle = `rgba(52, 152, 219, ${stepAlpha})`;
//       ctx.strokeStyle = isLowVoltage 
//         ? `rgba(21, 67, 96, ${stepAlpha})` 
//         : `rgba(41, 128, 185, ${stepAlpha})`;
//       ctx.lineWidth = isLowVoltage ? 1.8 : 1.5;

//       for (let i = 0; i < 3; i++) {
//         ctx.save();
//         ctx.rotate((i * Math.PI * 2) / 3);

//         ctx.beginPath();
//         ctx.moveTo(0, 0);
//         ctx.bezierCurveTo(-10, -10, -11, -25, 0, -27);
//         ctx.bezierCurveTo(11, -25, 10, -10, 0, 0);
//         ctx.fill();
//         ctx.stroke();

//         // Low Voltage Details: Highlight edge lines on blades
//         if (isLowVoltage) {
//           ctx.strokeStyle = `rgba(255, 255, 255, ${stepAlpha * 0.6})`;
//           ctx.lineWidth = 1;
//           ctx.beginPath();
//           ctx.moveTo(-2, -5);
//           ctx.lineTo(0, -25);
//           ctx.stroke();
//         }

//         ctx.restore();
//       }

//       ctx.restore();
//     }

//     // --- HIGH SPEED EFFECT: Dynamic Motion Arc Streaks ---
//     if (isHighSpeed) {
//       const arcAlpha = Math.min(0.7, (absSpeed - 0.3) * 0.8);
//       const arcDir = Math.sign(speed || 1);

//       ctx.strokeStyle = `rgba(255, 255, 255, ${arcAlpha})`;
//       ctx.lineWidth = 2.5;
//       ctx.beginPath();
//       ctx.arc(0, 0, 24, angle, angle + Math.PI * 1.2 * arcDir, arcDir < 0);
//       ctx.stroke();
//     }

//     // --- CENTRAL STEEL D-SHAFT (Rotates synchronously) ---
//     ctx.save();
//     ctx.rotate(angle);

//     const shaftGrad = ctx.createRadialGradient(-1.5, -1.5, 0, 0, 0, 5.5);
//     shaftGrad.addColorStop(0, '#ffffff');
//     shaftGrad.addColorStop(0.7, '#7f8c8d');
//     shaftGrad.addColorStop(1, '#2c3e50');

//     ctx.fillStyle = shaftGrad;
//     ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill();

//     ctx.strokeStyle = '#1a1a1a';
//     ctx.lineWidth = 1.5;
//     ctx.beginPath(); ctx.moveTo(-4, -1.5); ctx.lineTo(4, -1.5); ctx.stroke();

//     ctx.restore();
//     ctx.restore();

//     // --- 6. RPM & Readout Text ---
//     const isActive = absSpeed > 0.001;
//     ctx.fillStyle = isActive ? (isLowVoltage ? '#f39c12' : '#00ffcc') : '#8a8e96';
//     ctx.font = '600 10px "Courier New", monospace';
//     ctx.textAlign = 'center';

//     const dirSymbol = speed > 0.001 ? '↻ ' : speed < -0.001 ? '↺ ' : '';
//     ctx.fillText(`${dirSymbol}${rpm} RPM`, cx, 94);

//     if (inst.selected && typeof drawSelectionRect === 'function') {
//       drawSelectionRect(ctx, 3, 3, 74, 95);
//     }

//     ctx.restore();
//   }
// });

defComp({
  id: 'dc_motor',
  name: 'DC Motor',
  category: 'Actuators',
  icon: '🌀',
  desc: 'Brushed DC motor (Enlarged Front View) — speed controlled by PWM',
  width: 80,
  height: 100,
  defaultProps: { label: 'MOTOR' },
  pins: [
    { id: 'in', label: 'IN', type: PIN_TYPE.PWM, x: 30, y: 100, side: 'bottom' },
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 50, y: 100, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const speed = inst.runtimeState?.speed ?? 0;
    const rpm = inst.runtimeState?.rpm ?? Math.round(Math.abs(speed) * 3000);
    const t = sim?.simTime ?? 0;
    const cx = 40, cy = 40; // Center of front casing

    ctx.save();
    ctx.translate(x, y);

    // --- 1. Rear Terminal Leads & Solder Tabs ---
    ctx.lineWidth = 3;
    // IN Pin (Brass Lead)
    ctx.strokeStyle = '#d4af37';
    ctx.beginPath(); ctx.moveTo(30, 68); ctx.lineTo(30, 100); ctx.stroke();
    // GND Pin (Silver Lead)
    ctx.strokeStyle = '#a0a5aa';
    ctx.beginPath(); ctx.moveTo(50, 68); ctx.lineTo(50, 100); ctx.stroke();

    // Red (+) and Black (-) Terminal Solder Points
    ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(30, 68, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(50, 68, 4.5, 0, Math.PI * 2); ctx.fill();

    // --- 2. Outer Metallic Motor Body ---
    // Casing Drop Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(cx, cy + 3, 34, 0, Math.PI * 2); ctx.fill();

    // Metallic Can Body
    const casingGrad = ctx.createRadialGradient(cx - 10, cy - 10, 3, cx, cy, 34);
    casingGrad.addColorStop(0.0, '#ffffff');
    casingGrad.addColorStop(0.3, '#bcc1c9');
    casingGrad.addColorStop(0.7, '#676b73');
    casingGrad.addColorStop(1.0, '#2b2d31');

    ctx.fillStyle = casingGrad;
    ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1d1f22';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Front Face Stamped Ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();

    // --- 3. Mounting Holes & Heat Vents ---
    ctx.fillStyle = '#18191c';
    // Left & Right Screw Mounts
    ctx.beginPath(); ctx.arc(22, cy, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(58, cy, 3.2, 0, Math.PI * 2); ctx.fill();

    // Stamped Air Vent Slits
    roundRect(ctx, 33, 13, 14, 3.5, 1.5); ctx.fill();
    roundRect(ctx, 33, 63.5, 14, 3.5, 1.5); ctx.fill();

    // --- 4. Central Raised Bearing Hub ---
    const hubGrad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 11);
    hubGrad.addColorStop(0, '#f0f3f7');
    hubGrad.addColorStop(0.5, '#959a9e');
    hubGrad.addColorStop(1, '#3a3d42');

    ctx.fillStyle = hubGrad;
    ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Brass Bushing Ring
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 7.5, 0, Math.PI * 2); ctx.stroke();

    // --- 5. Front Fan & Rotor Shaft ---
    ctx.save();
    ctx.translate(cx, cy);

    const absSpeed = Math.abs(speed);
    const angle = t * 0.05 * speed;
    ctx.rotate(angle);

    const opacity = Math.max(0.35, 1 - absSpeed * 0.45);

    // 3-Blade Front Fan
    ctx.fillStyle = `rgba(52, 152, 219, ${opacity})`;
    ctx.strokeStyle = `rgba(41, 128, 185, ${opacity})`;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 3);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-10, -10, -11, -25, 0, -27);
      ctx.bezierCurveTo(11, -25, 10, -10, 0, 0);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // High-Speed Motion Blur Arc
    if (absSpeed > 0.01) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.65, absSpeed * 0.5)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 21, 0, Math.PI * 1.6 * Math.sign(speed));
      ctx.stroke();
    }

    // Steel Shaft Tip (D-Profile)
    const shaftGrad = ctx.createRadialGradient(-1.5, -1.5, 0, 0, 0, 5.5);
    shaftGrad.addColorStop(0, '#ffffff');
    shaftGrad.addColorStop(0.7, '#7f8c8d');
    shaftGrad.addColorStop(1, '#2c3e50');

    ctx.fillStyle = shaftGrad;
    ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill();

    // D-Shaft Cutout Line
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-4, -1.5); ctx.lineTo(4, -1.5); ctx.stroke();

    ctx.restore();

    // --- 6. RPM & Readout Text ---
    const isActive = absSpeed > 0.01;
    ctx.fillStyle = isActive ? '#00ffcc' : '#8a8e96';
    ctx.font = '600 10px "Courier New", monospace';
    ctx.textAlign = 'center';

    const dirSymbol = speed > 0.01 ? '↻ ' : speed < -0.01 ? '↺ ' : '';
    ctx.fillText(`${dirSymbol}${rpm} RPM`, cx, 94);

    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, 3, 3, 74, 95);
    }

    ctx.restore();
  }
});

// defComp({
//   id: 'dc_motor',
//   name: 'DC Motor',
//   category: 'Actuators',
//   icon: '🌀',
//   desc: 'Brushed DC motor (Enlarged Front View) — speed controlled by PWM',
//   width: 80,
//   height: 100,
//   defaultProps: { label: 'MOTOR' },
//   pins: [
//     { id: 'in', label: 'IN', type: PIN_TYPE.PWM, x: 30, y: 100, side: 'bottom' },
//     { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 50, y: 100, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const speed = inst.runtimeState?.speed ?? 0;
//     const rpm = inst.runtimeState?.rpm ?? Math.round(Math.abs(speed) * 3000);
//     const t = sim?.simTime ?? 0;
//     const cx = 40, cy = 40; // Center of front casing

//     ctx.save();
//     ctx.translate(x, y);

//     // --- 1. Rear Terminal Leads & Solder Tabs ---
//     ctx.lineWidth = 3;
//     // IN Pin (Brass Lead)
//     ctx.strokeStyle = '#d4af37';
//     ctx.beginPath(); ctx.moveTo(30, 68); ctx.lineTo(30, 100); ctx.stroke();
//     // GND Pin (Silver Lead)
//     ctx.strokeStyle = '#a0a5aa';
//     ctx.beginPath(); ctx.moveTo(50, 68); ctx.lineTo(50, 100); ctx.stroke();

//     // Red (+) and Black (-) Terminal Solder Points
//     ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(30, 68, 4.5, 0, Math.PI * 2); ctx.fill();
//     ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(50, 68, 4.5, 0, Math.PI * 2); ctx.fill();

//     // --- 2. Outer Metallic Motor Body ---
//     // Casing Drop Shadow
//     ctx.fillStyle = 'rgba(0,0,0,0.25)';
//     ctx.beginPath(); ctx.arc(cx, cy + 3, 34, 0, Math.PI * 2); ctx.fill();

//     // Metallic Can Body
//     const casingGrad = ctx.createRadialGradient(cx - 10, cy - 10, 3, cx, cy, 34);
//     casingGrad.addColorStop(0.0, '#ffffff');
//     casingGrad.addColorStop(0.3, '#bcc1c9');
//     casingGrad.addColorStop(0.7, '#676b73');
//     casingGrad.addColorStop(1.0, '#2b2d31');

//     ctx.fillStyle = casingGrad;
//     ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
//     ctx.strokeStyle = '#1d1f22';
//     ctx.lineWidth = 1.5;
//     ctx.stroke();

//     // Front Face Stamped Ring
//     ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
//     ctx.lineWidth = 1.2;
//     ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();

//     // --- 3. Mounting Holes & Heat Vents ---
//     ctx.fillStyle = '#18191c';
//     // Left & Right Screw Mounts
//     ctx.beginPath(); ctx.arc(22, cy, 3.2, 0, Math.PI * 2); ctx.fill();
//     ctx.beginPath(); ctx.arc(58, cy, 3.2, 0, Math.PI * 2); ctx.fill();

//     // Stamped Air Vent Slits
//     if (typeof roundRect === 'function') {
//       roundRect(ctx, 33, 13, 14, 3.5, 1.5); ctx.fill();
//       roundRect(ctx, 33, 63.5, 14, 3.5, 1.5); ctx.fill();
//     } else {
//       ctx.fillRect(33, 13, 14, 3.5);
//       ctx.fillRect(33, 63.5, 14, 3.5);
//     }

//     // --- 4. Central Raised Bearing Hub ---
//     const hubGrad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 11);
//     hubGrad.addColorStop(0, '#f0f3f7');
//     hubGrad.addColorStop(0.5, '#959a9e');
//     hubGrad.addColorStop(1, '#3a3d42');

//     ctx.fillStyle = hubGrad;
//     ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
//     ctx.strokeStyle = '#222';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // Brass Bushing Ring
//     ctx.strokeStyle = '#d4af37';
//     ctx.lineWidth = 1.5;
//     ctx.beginPath(); ctx.arc(cx, cy, 7.5, 0, Math.PI * 2); ctx.stroke();

//     // --- 5. Front Fan & Rotor Shaft (Spinning Blade Animation) ---
//     ctx.save();
//     ctx.translate(cx, cy);

//     const absSpeed = Math.abs(speed);

//     // Continuous angle integration (prevents jump when speed changes dynamically)
//     if (!inst.runtimeState) inst.runtimeState = {};
//     if (inst.runtimeState.angle === undefined) inst.runtimeState.angle = 0;

//     if (sim?.dt) {
//       inst.runtimeState.angle += speed * sim.dt * 12;
//     } else {
//       inst.runtimeState.angle = t * 0.02 * speed;
//     }
//     const angle = inst.runtimeState.angle;

//     // A. Swept Motion Blur Radial Disk (High RPM illusion)
//     if (absSpeed > 0.05) {
//       const blurAlpha = Math.min(0.5, absSpeed * 0.55);
//       const blurGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 27);
//       blurGrad.addColorStop(0, 'rgba(52, 152, 219, 0)');
//       blurGrad.addColorStop(0.6, `rgba(52, 152, 219, ${blurAlpha * 0.6})`);
//       blurGrad.addColorStop(1, `rgba(41, 128, 185, ${blurAlpha * 0.2})`);

//       ctx.fillStyle = blurGrad;
//       ctx.beginPath();
//       ctx.arc(0, 0, 27, 0, Math.PI * 2);
//       ctx.fill();
//     }

//     // B. Multi-pass Motion Blur Trails (Ghost Blades)
//     const blurSteps = absSpeed > 0.3 ? 3 : 1;
//     const baseOpacity = Math.max(0.25, 1 - absSpeed * 0.45);

//     for (let step = blurSteps - 1; step >= 0; step--) {
//       const stepOffset = Math.sign(speed || 1) * step * 0.12 * Math.min(1, absSpeed);
//       const stepAngle = angle - stepOffset;
//       const stepAlpha = step === 0 ? baseOpacity : (baseOpacity * 0.3) / step;

//       ctx.save();
//       ctx.rotate(stepAngle);

//       ctx.fillStyle = `rgba(52, 152, 219, ${stepAlpha})`;
//       ctx.strokeStyle = `rgba(41, 128, 185, ${stepAlpha})`;
//       ctx.lineWidth = 1.5;

//       for (let i = 0; i < 3; i++) {
//         ctx.save();
//         ctx.rotate((i * Math.PI * 2) / 3);

//         ctx.beginPath();
//         ctx.moveTo(0, 0);
//         ctx.bezierCurveTo(-10, -10, -11, -25, 0, -27);
//         ctx.bezierCurveTo(11, -25, 10, -10, 0, 0);
//         ctx.fill();
//         ctx.stroke();

//         ctx.restore();
//       }

//       ctx.restore();
//     }

//     // C. Dynamic Rotational Arc Streaks
//     if (absSpeed > 0.08) {
//       const arcAlpha = Math.min(0.7, absSpeed * 0.7);
//       const arcDir = Math.sign(speed || 1);

//       ctx.strokeStyle = `rgba(255, 255, 255, ${arcAlpha})`;
//       ctx.lineWidth = 2.5;
//       ctx.beginPath();
//       ctx.arc(0, 0, 24, angle, angle + Math.PI * 1.2 * arcDir, arcDir < 0);
//       ctx.stroke();

//       ctx.strokeStyle = `rgba(174, 214, 241, ${arcAlpha * 0.7})`;
//       ctx.lineWidth = 1.5;
//       ctx.beginPath();
//       ctx.arc(0, 0, 16, angle + 0.8, angle + 0.8 + Math.PI * 0.8 * arcDir, arcDir < 0);
//       ctx.stroke();
//     }

//     // D. Central Steel D-Shaft Tip (Rotates in sync)
//     ctx.save();
//     ctx.rotate(angle);

//     const shaftGrad = ctx.createRadialGradient(-1.5, -1.5, 0, 0, 0, 5.5);
//     shaftGrad.addColorStop(0, '#ffffff');
//     shaftGrad.addColorStop(0.7, '#7f8c8d');
//     shaftGrad.addColorStop(1, '#2c3e50');

//     ctx.fillStyle = shaftGrad;
//     ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill();

//     // D-Shaft Cutout Line
//     ctx.strokeStyle = '#1a1a1a';
//     ctx.lineWidth = 1.5;
//     ctx.beginPath(); ctx.moveTo(-4, -1.5); ctx.lineTo(4, -1.5); ctx.stroke();

//     ctx.restore();
//     ctx.restore();

//     // --- 6. RPM & Readout Text ---
//     const isActive = absSpeed > 0.01;
//     ctx.fillStyle = isActive ? '#00ffcc' : '#8a8e96';
//     ctx.font = '600 10px "Courier New", monospace';
//     ctx.textAlign = 'center';

//     const dirSymbol = speed > 0.01 ? '↻ ' : speed < -0.01 ? '↺ ' : '';
//     ctx.fillText(`${dirSymbol}${rpm} RPM`, cx, 94);

//     if (inst.selected && typeof drawSelectionRect === 'function') {
//       drawSelectionRect(ctx, 3, 3, 74, 95);
//     }

//     ctx.restore();
//   }
// });

/* -------------- 28BYJ-48 Stepper Motor + ULN2003 Driver (Realistic Design) ------------------ */
defComp({
  id: 'stepper_28byj',
  name: '28BYJ-48 Stepper',
  category: 'Actuators',
  icon: 'Ⓜ️',
  desc: '5V 4-phase unipolar stepper motor with ULN2003 driver (2048 steps/rev, 5.625Â°/step)',
  width: 100,
  height: 100,
  defaultProps: { angle: 0 },
  interactive: [],
  pins: [
    { id: 'IN1', label: 'IN1', type: PIN_TYPE.DIGITAL, x: 20, y: 100, side: 'bottom' },
    { id: 'IN2', label: 'IN2', type: PIN_TYPE.DIGITAL, x: 40, y: 100, side: 'bottom' },
    { id: 'IN3', label: 'IN3', type: PIN_TYPE.DIGITAL, x: 60, y: 100, side: 'bottom' },
    { id: 'IN4', label: 'IN4', type: PIN_TYPE.DIGITAL, x: 80, y: 100, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const angle = inst.runtimeState?.angle ?? inst.props.angle ?? 0;
    const rad = (angle * Math.PI) / 180;

    ctx.save();
    ctx.translate(x, y);

    // ==========================================
    // 1. 28BYJ-48 MOTOR ENCLOSURE (Top Section)
    // ==========================================

    // Stamped Metal Mounting Ears (Flanges)
    ctx.fillStyle = '#b0bec5';
    roundRect(ctx, 8, 22, 84, 12, 5);
    ctx.fill();
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Screw Mounting Slots on Ears
    [[14, 28], [86, 28]].forEach(([hx, hy]) => {
      ctx.fillStyle = '#455a64';
      ctx.beginPath();
      ctx.ellipse(hx, hy, 3.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cfd8dc';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // Cylindrical Motor Body (Nickel-Plated Steel Sheen)
    const motorGrad = ctx.createRadialGradient(44, 22, 3, 50, 28, 25);
    motorGrad.addColorStop(0, '#ffffff');
    motorGrad.addColorStop(0.35, '#cfd8dc');
    motorGrad.addColorStop(0.75, '#90a4ae');
    motorGrad.addColorStop(1, '#546e7a');
    ctx.fillStyle = motorGrad;
    ctx.beginPath();
    ctx.arc(50, 28, 24, 0, Math.PI * 2);
    ctx.fill();

    // Motor Outer Rim Ring
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Molded Blue Wire Strain Relief Casing (Authentic 28BYJ-48 feature)
    ctx.fillStyle = '#1565c0';
    roundRect(ctx, 18, 6, 16, 9, 2);
    ctx.fill();
    ctx.strokeStyle = '#0d47a1';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 5 Colored Motor Wires (Blue, Pink, Yellow, Orange, Red)
    const wireColors = ['#1e88e5', '#ec407a', '#fbc02d', '#fb8c00', '#e53935'];
    wireColors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(20 + i * 2.5, 2, 1.8, 5);
    });

    // Raised Bearing Collar
    const collarGrad = ctx.createRadialGradient(48, 26, 1, 50, 28, 9);
    collarGrad.addColorStop(0, '#e0e0e0');
    collarGrad.addColorStop(1, '#757575');
    ctx.fillStyle = collarGrad;
    ctx.beginPath();
    ctx.arc(50, 28, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Brass D-Cut Shaft & Needle Indicator (Rotates with angle)
    ctx.save();
    ctx.translate(50, 28);
    ctx.rotate(rad);

    // Brass Shaft Base
    const brassGrad = ctx.createRadialGradient(-1, -1, 1, 0, 0, 5);
    brassGrad.addColorStop(0, '#ffe082');
    brassGrad.addColorStop(0.6, '#ffd54f');
    brassGrad.addColorStop(1, '#b58105');
    ctx.fillStyle = brassGrad;
    ctx.beginPath();
    // Flattened D-shaft profile
    ctx.arc(0, 0, 5, -Math.PI * 0.72, Math.PI * 0.72, false);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8d6200';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // High-Visibility Index Pointer (Red needle + Hub pin)
    ctx.strokeStyle = '#e53935';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(19, 0);
    ctx.stroke();

    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.arc(19, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Angle Overlay Tag
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    roundRect(ctx, 33, 43, 34, 10, 3);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(((angle % 360) + 360) % 360)}Â°`, 50, 48);

    // ==========================================
    // 2. ULN2003 DRIVER BOARD (Bottom Section)
    // ==========================================

    // Blue FR4 Driver PCB
    const pcbX = 8, pcbY = 56, pcbW = 84, pcbH = 34;
    ctx.fillStyle = '#0f2744';
    roundRect(ctx, pcbX, pcbY, pcbW, pcbH, 3);
    ctx.fill();
    ctx.strokeStyle = '#1e4976';
    ctx.lineWidth = 1;
    ctx.stroke();

    // PCB Mounting Holes
    [[pcbX + 4, pcbY + 4], [pcbX + pcbW - 4, pcbY + 4]].forEach(([hx, hy]) => {
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(hx, hy, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#061322';
      ctx.beginPath(); ctx.arc(hx, hy, 1.2, 0, Math.PI * 2); ctx.fill();
    });

    // ULN2003A Darlington Transistor IC (SOIC-16 Package)
    ctx.fillStyle = '#1c1c1c';
    roundRect(ctx, pcbX + 5, pcbY + 11, 28, 12, 1);
    ctx.fill();

    // IC Pin 1 Notch & Silkscreen
    ctx.fillStyle = '#333333';
    ctx.beginPath(); ctx.arc(pcbX + 7.5, pcbY + 14, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('ULN2003A', pcbX + 9.5, pcbY + 17);

    // IC Gull-Wing Leads
    ctx.fillStyle = '#b0bec5';
    for (let p = 0; p < 6; p++) {
      ctx.fillRect(pcbX + 8 + p * 4, pcbY + 9.5, 1.8, 1.5);
      ctx.fillRect(pcbX + 8 + p * 4, pcbY + 23, 1.8, 1.5);
    }

    // 4-Phase Stepper Status Indicator LEDs (A, B, C, D)
    const activePhase = Math.floor((((angle % 360) + 360) % 360) / 90) % 4;
    for (let i = 0; i < 4; i++) {
      const lx = pcbX + 40 + i * 10;
      const ly = pcbY + 12;
      const isLit = activePhase === i;

      // SMD LED Body
      ctx.fillStyle = '#212121';
      roundRect(ctx, lx, ly, 7, 5, 1);
      ctx.fill();

      // LED Lens & Glow
      ctx.fillStyle = isLit ? '#facc15' : '#713f12';
      ctx.fillRect(lx + 1.5, ly + 1.2, 4, 2.6);

      if (isLit) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
        ctx.beginPath();
        ctx.arc(lx + 3.5, ly + 2.5, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Phase Labels A, B, C, D
      ctx.fillStyle = isLit ? '#fef08a' : 'rgba(255, 255, 255, 0.4)';
      ctx.font = '4.5px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(['A', 'B', 'C', 'D'][i], lx + 3.5, ly + 9.5);
    }

    // Silkscreen Pin Labels (IN1..IN4)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 5px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('IN1', 20, 84);
    ctx.fillText('IN2', 40, 84);
    ctx.fillText('IN3', 60, 84);
    ctx.fillText('IN4', 80, 84);

    // Black Header Connector Shroud
    ctx.fillStyle = '#141414';
    roundRect(ctx, 12, 88, 76, 4, 1);
    ctx.fill();

    // 4 Input Pin Leads (Gold Terminals)
    const pinXs = [20, 40, 60, 80];
    pinXs.forEach(px => {
      // PCB Solder Pad
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(px, 87, 1.3, 0, Math.PI * 2); ctx.fill();
      // Gold Pin Header Lead
      ctx.fillStyle = '#ffd066';
      ctx.fillRect(px - 1.2, 91, 2.4, 9);
    });

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 106, 106);
    ctx.restore();
  }
});


/*------------L298N dual H-bridge motor driver-----------*/
defComp({
  id: 'l298n',
  name: 'L298N Motor Driver',
  category: 'Actuators',
  icon: '⏩',
  desc: 'Authentic dual H-bridge L298N module with evenly spaced bottom logic pins, finned heatsink, blue screw terminals, and live status LEDs.',
  width: 100,
  height: 80,
  defaultProps: {},
  pins: [
    { id: 'IN1', label: 'IN1', type: PIN_TYPE.DIGITAL, x: 10, y: 80, side: 'bottom' },
    { id: 'IN2', label: 'IN2', type: PIN_TYPE.DIGITAL, x: 23, y: 80, side: 'bottom' },
    { id: 'IN3', label: 'IN3', type: PIN_TYPE.DIGITAL, x: 36, y: 80, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 50, y: 80, side: 'bottom' },
    { id: 'IN4', label: 'IN4', type: PIN_TYPE.DIGITAL, x: 64, y: 80, side: 'bottom' },
    { id: 'ENA', label: 'ENA', type: PIN_TYPE.PWM, x: 77, y: 80, side: 'bottom' },
    { id: 'ENB', label: 'ENB', type: PIN_TYPE.PWM, x: 90, y: 80, side: 'bottom' },
    { id: 'OUT1', label: 'M1+', type: PIN_TYPE.SIGNAL, x: 10, y: 0, side: 'top' },
    { id: 'OUT2', label: 'M1-', type: PIN_TYPE.SIGNAL, x: 30, y: 0, side: 'top' },
    { id: 'VS', label: 'VS', type: PIN_TYPE.POWER, x: 50, y: 0, side: 'top' },
    { id: 'OUT3', label: 'M2+', type: PIN_TYPE.SIGNAL, x: 70, y: 0, side: 'top' },
    { id: 'OUT4', label: 'M2-', type: PIN_TYPE.SIGNAL, x: 90, y: 0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const mA = inst.runtimeState?.motorA ?? 0;
    const mB = inst.runtimeState?.motorB ?? 0;
    const isPowered = sim?.powered ?? true;

    ctx.save();
    ctx.translate(x, y);

    // --- Helper: Safe Rounded Rectangles ---
    const drawRR = (rx, ry, rw, rh, rad = 2) => {
      if (typeof roundRect === 'function') {
        roundRect(ctx, rx, ry, rw, rh, rad);
      } else {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, rad);
        else ctx.rect(rx, ry, rw, rh);
      }
    };

    // --- 1. PCB Ground Shadow & Red Substrate ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    drawRR(2, 8, 96, 66, 4);
    ctx.fill();

    // Classic L298N Red PCB Gradient
    const pcbGrad = ctx.createLinearGradient(0, 6, 100, 72);
    pcbGrad.addColorStop(0, '#bd1c1c');
    pcbGrad.addColorStop(0.5, '#990f0f');
    pcbGrad.addColorStop(1, '#6e0707');

    ctx.fillStyle = pcbGrad;
    drawRR(2, 6, 96, 66, 4);
    ctx.fill();

    // PCB Outer Chamfer & Silkscreen Border
    ctx.strokeStyle = '#4a0303';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 0.8;
    drawRR(4, 8, 92, 62, 3);
    ctx.stroke();

    // Corner Mounting Holes with Gold Copper Rings
    [[7, 11], [93, 11], [7, 67], [93, 67]].forEach(([hx, hy]) => {
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1c0505';
      ctx.beginPath(); ctx.arc(hx, hy, 1.8, 0, Math.PI * 2); ctx.fill();
    });

    // --- 2. Flyback Diodes (8 SMD Black Rectangles) ---
    ctx.fillStyle = '#111';
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 0.5;
    const diodeCoords = [
      [18, 20], [18, 26], [18, 32], [18, 38], // Left bridge diodes
      [78, 20], [78, 26], [78, 32], [78, 38]  // Right bridge diodes
    ];
    diodeCoords.forEach(([dx, dy]) => {
      drawRR(dx, dy, 5, 3, 0.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ddd';
      ctx.fillRect(dx + 3.8, dy, 1.2, 3);
      ctx.fillStyle = '#111';
    });

    // --- 3. Black Finned Aluminum Heatsink ---
    const hsX = 27, hsY = 14, hsW = 46, hsH = 26;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(hsX + 1, hsY + 1, hsW, hsH);

    const hsGrad = ctx.createLinearGradient(hsX, hsY, hsX + hsW, hsY);
    hsGrad.addColorStop(0, '#1c1d21');
    hsGrad.addColorStop(0.5, '#3a3d45');
    hsGrad.addColorStop(1, '#1c1d21');
    ctx.fillStyle = hsGrad;
    drawRR(hsX, hsY, hsW, hsH, 2);
    ctx.fill();

    // Vertical Cooling Fins (6 Fins)
    ctx.fillStyle = '#111215';
    for (let f = 0; f < 6; f++) {
      const fx = hsX + 4 + f * 7;
      ctx.fillRect(fx, hsY + 2, 3, hsH - 4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(fx + 2, hsY + 2, 1, hsH - 4);
      ctx.fillStyle = '#111215';
    }

    // Heatsink Mounting Bolt
    const screwGrad = ctx.createRadialGradient(50, 27, 0, 50, 27, 4);
    screwGrad.addColorStop(0, '#ffffff');
    screwGrad.addColorStop(0.6, '#8e959e');
    screwGrad.addColorStop(1, '#2c3138');
    ctx.fillStyle = screwGrad;
    ctx.beginPath(); ctx.arc(50, 27, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(48, 27); ctx.lineTo(52, 27); ctx.stroke();

    // Multiwatt-15 L298N IC Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 5px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('L298N', 50, 36);

    // --- 4. Electrolytic Capacitors ---
    [[12, 46], [84, 46]].forEach(([cx, cy]) => {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.arc(cx + 1, cy + 1, 5, 0, Math.PI * 2); ctx.fill();

      const capGrad = ctx.createRadialGradient(cx - 1.5, cy - 1.5, 1, cx, cy, 5);
      capGrad.addColorStop(0, '#444');
      capGrad.addColorStop(0.7, '#1a1a1a');
      capGrad.addColorStop(1, '#050505');
      ctx.fillStyle = capGrad;
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#8a929a';
      ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a3e42'; ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy); ctx.lineTo(cx + 2, cy);
      ctx.moveTo(cx, cy - 2); ctx.lineTo(cx, cy + 2);
      ctx.stroke();
    });

    // 5V Regulator IC (78M05)
    ctx.fillStyle = '#1c1c1c';
    drawRR(45, 45, 10, 7, 1); ctx.fill();
    ctx.fillStyle = '#666'; ctx.fillRect(47, 43, 6, 2);

    // --- 5. Blue Screw Terminal Blocks ---
    const drawBlueTerminal = (tx, ty, tw, th, screwPositions) => {
      const termGrad = ctx.createLinearGradient(tx, ty, tx, ty + th);
      termGrad.addColorStop(0, '#246bce');
      termGrad.addColorStop(0.5, '#174ea6');
      termGrad.addColorStop(1, '#0f387a');
      ctx.fillStyle = termGrad;
      drawRR(tx, ty, tw, th, 1.5); ctx.fill();
      ctx.strokeStyle = '#0a2552'; ctx.lineWidth = 0.8; ctx.stroke();

      screwPositions.forEach(sx => {
        ctx.fillStyle = '#0a101d';
        ctx.fillRect(sx - 3, ty + 1, 6, 3);

        const scrGrad = ctx.createRadialGradient(sx - 0.5, ty + 8, 0, sx, ty + 8, 3.2);
        scrGrad.addColorStop(0, '#f5e08c');
        scrGrad.addColorStop(0.6, '#c4a233');
        scrGrad.addColorStop(1, '#6e5611');
        ctx.fillStyle = scrGrad;
        ctx.beginPath(); ctx.arc(sx, ty + 8, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3d2e03'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(sx, ty + 8, 3.2, 0, Math.PI * 2); ctx.stroke();

        ctx.strokeStyle = '#1f1701'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(sx - 2, ty + 8); ctx.lineTo(sx + 2, ty + 8); ctx.stroke();
      });
    };

    drawBlueTerminal(5, 4, 30, 12, [10, 30]);
    drawBlueTerminal(43, 4, 14, 12, [50]);
    drawBlueTerminal(65, 4, 30, 12, [70, 90]);

    // --- 6. Male Header Pins & Jumpers (Bottom - Even Spacing) ---
    // Black Header Bar across all bottom pins
    ctx.fillStyle = '#151515';
    drawRR(6, 68, 88, 6, 1); ctx.fill();

    // Evenly spaced bottom pins: [10, 23, 36, 50, 64, 77, 90]
    const pinXList = [10, 23, 36, 50, 64, 77, 90];
    pinXList.forEach(px => {
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(px - 1.2, 69, 2.4, 4);

      ctx.strokeStyle = '#a0a0a0'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(px, 74); ctx.lineTo(px, 80); ctx.stroke();
    });

    // Top Leads
    [10, 30, 50, 70, 90].forEach(px => {
      ctx.strokeStyle = '#a0a0a0'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(px, 4); ctx.lineTo(px, 0); ctx.stroke();
    });

    // Yellow Jumpers on ENA (77) & ENB (90)
    [77, 90].forEach(jx => {
      const jGrad = ctx.createLinearGradient(jx - 2.5, 67, jx + 2.5, 73);
      jGrad.addColorStop(0, '#f39c12');
      jGrad.addColorStop(0.5, '#f1c40f');
      jGrad.addColorStop(1, '#d35400');
      ctx.fillStyle = jGrad;
      drawRR(jx - 2.5, 67, 5, 6, 1); ctx.fill();
      ctx.strokeStyle = '#7e5109'; ctx.lineWidth = 0.5; ctx.stroke();
    });

    // --- 7. Status LEDs (Power & Motor Direction) ---
    const pwrOn = isPowered;
    ctx.fillStyle = pwrOn ? '#ff3333' : '#441111';
    if (pwrOn) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 5; }
    ctx.beginPath(); ctx.arc(38, 48, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = mA > 0 ? '#2ecc71' : mA < 0 ? '#e74c3c' : '#223322';
    if (mA !== 0) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.arc(22, 57, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = mB > 0 ? '#2ecc71' : mB < 0 ? '#e74c3c' : '#223322';
    if (mB !== 0) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.arc(78, 57, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // --- 8. Silkscreen Text & Labeling ---
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 4.5px sans-serif';
    ctx.textAlign = 'center';

    ctx.fillText('OUT1  OUT2', 20, 19);
    ctx.fillText('POWER', 50, 19);
    ctx.fillText('OUT3  OUT4', 80, 19);

    // Header Pin Labels matching new x positions
    ctx.font = 'bold 3.2px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText('IN1', 10, 66);
    ctx.fillText('IN2', 23, 66);
    ctx.fillText('IN3', 36, 66);
    ctx.fillText('GND', 50, 66);
    ctx.fillText('IN4', 64, 66);
    ctx.fillText('ENA', 77, 66);
    ctx.fillText('ENB', 90, 66);

    // Motor State Readout
    ctx.font = 'bold 3.8px monospace';
    const aPct = Math.round(Math.abs(mA) * 100);
    const bPct = Math.round(Math.abs(mB) * 100);

    ctx.fillStyle = mA !== 0 ? '#00ffcc' : 'rgba(255,255,255,0.4)';
    ctx.fillText(mA !== 0 ? `${aPct}% ${mA > 0 ? 'FWD' : 'REV'}` : 'M1: OFF', 22, 62);

    ctx.fillStyle = mB !== 0 ? '#00ffcc' : 'rgba(255,255,255,0.4)';
    ctx.fillText(mB !== 0 ? `${bPct}% ${mB > 0 ? 'FWD' : 'REV'}` : 'M2: OFF', 78, 62);

    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -1, 1, 102, 78);
    }

    ctx.restore();
  }
});

// defComp({
//   id: 'l298n',
//   name: 'L298N Motor Driver',
//   category: 'Actuators',
//   icon: '⏩',
//   desc: 'Authentic dual H-bridge L298N module with red PCB, finned heatsink, blue screw terminals, and live status LEDs.',
//   width: 100,
//   height: 80,
//   defaultProps: {},
//   pins: [
//     { id: 'IN1', label: 'IN1', type: PIN_TYPE.DIGITAL, x: 10, y: 80, side: 'bottom' },
//     { id: 'IN2', label: 'IN2', type: PIN_TYPE.DIGITAL, x: 26, y: 80, side: 'bottom' },
//     { id: 'IN3', label: 'IN3', type: PIN_TYPE.DIGITAL, x: 42, y: 80, side: 'bottom' },
//     { id: 'IN4', label: 'IN4', type: PIN_TYPE.DIGITAL, x: 58, y: 80, side: 'bottom' },
//     { id: 'ENA', label: 'ENA', type: PIN_TYPE.PWM, x: 74, y: 80, side: 'bottom' },
//     { id: 'ENB', label: 'ENB', type: PIN_TYPE.PWM, x: 90, y: 80, side: 'bottom' },
//     { id: 'OUT1', label: 'M1+', type: PIN_TYPE.SIGNAL, x: 10, y: 0, side: 'top' },
//     { id: 'OUT2', label: 'M1-', type: PIN_TYPE.SIGNAL, x: 30, y: 0, side: 'top' },
//     { id: 'OUT3', label: 'M2+', type: PIN_TYPE.SIGNAL, x: 70, y: 0, side: 'top' },
//     { id: 'OUT4', label: 'M2-', type: PIN_TYPE.SIGNAL, x: 90, y: 0, side: 'top' },
//     { id: 'VS', label: 'VS', type: PIN_TYPE.POWER, x: 50, y: 0, side: 'top' },
//     { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 50, y: 80, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const mA = inst.runtimeState?.motorA ?? 0;
//     const mB = inst.runtimeState?.motorB ?? 0;
//     const isPowered = sim?.powered ?? true;

//     ctx.save();
//     ctx.translate(x, y);

//     // --- Helper: Safe Rounded Rectangles ---
//     const drawRR = (rx, ry, rw, rh, rad = 2) => {
//       if (typeof roundRect === 'function') {
//         roundRect(ctx, rx, ry, rw, rh, rad);
//       } else {
//         ctx.beginPath();
//         if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, rad);
//         else ctx.rect(rx, ry, rw, rh);
//       }
//     };

//     // --- 1. PCB Ground Shadow & Red Substrate ---
//     ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
//     drawRR(2, 8, 96, 66, 4);
//     ctx.fill();

//     // Classic L298N Red PCB Gradient
//     const pcbGrad = ctx.createLinearGradient(0, 6, 100, 72);
//     pcbGrad.addColorStop(0, '#bd1c1c');
//     pcbGrad.addColorStop(0.5, '#990f0f');
//     pcbGrad.addColorStop(1, '#6e0707');

//     ctx.fillStyle = pcbGrad;
//     drawRR(2, 6, 96, 66, 4);
//     ctx.fill();

//     // PCB Outer Chamfer & Silkscreen Border
//     ctx.strokeStyle = '#4a0303';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
//     ctx.lineWidth = 0.8;
//     drawRR(4, 8, 92, 62, 3);
//     ctx.stroke();

//     // Corner Mounting Holes with Gold Copper Rings
//     [[7, 11], [93, 11], [7, 67], [93, 67]].forEach(([hx, hy]) => {
//       ctx.fillStyle = '#d4af37';
//       ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, Math.PI * 2); ctx.fill();
//       ctx.fillStyle = '#1c0505';
//       ctx.beginPath(); ctx.arc(hx, hy, 1.8, 0, Math.PI * 2); ctx.fill();
//     });

//     // --- 2. Flyback Diodes (8 SMD Black Rectangles) ---
//     ctx.fillStyle = '#111';
//     ctx.strokeStyle = '#888';
//     ctx.lineWidth = 0.5;
//     const diodeCoords = [
//       [18, 20], [18, 26], [18, 32], [18, 38], // Left bridge diodes
//       [78, 20], [78, 26], [78, 32], [78, 38]  // Right bridge diodes
//     ];
//     diodeCoords.forEach(([dx, dy]) => {
//       drawRR(dx, dy, 5, 3, 0.5); ctx.fill(); ctx.stroke();
//       // Cathode silver line
//       ctx.fillStyle = '#ddd';
//       ctx.fillRect(dx + 3.8, dy, 1.2, 3);
//       ctx.fillStyle = '#111';
//     });

//     // --- 3. Black Finned Aluminum Heatsink ---
//     const hsX = 27, hsY = 14, hsW = 46, hsH = 26;

//     // Base drop shadow
//     ctx.fillStyle = 'rgba(0,0,0,0.5)';
//     ctx.fillRect(hsX + 1, hsY + 1, hsW, hsH);

//     // Main Heatsink Body
//     const hsGrad = ctx.createLinearGradient(hsX, hsY, hsX + hsW, hsY);
//     hsGrad.addColorStop(0, '#1c1d21');
//     hsGrad.addColorStop(0.5, '#3a3d45');
//     hsGrad.addColorStop(1, '#1c1d21');
//     ctx.fillStyle = hsGrad;
//     drawRR(hsX, hsY, hsW, hsH, 2);
//     ctx.fill();

//     // Vertical Cooling Fins (6 Fins)
//     ctx.fillStyle = '#111215';
//     for (let f = 0; f < 6; f++) {
//       const fx = hsX + 4 + f * 7;
//       ctx.fillRect(fx, hsY + 2, 3, hsH - 4);
//       // Highlight on fin edge
//       ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
//       ctx.fillRect(fx + 2, hsY + 2, 1, hsH - 4);
//       ctx.fillStyle = '#111215';
//     }

//     // Heatsink Mounting Bolt (Center Silver Screw)
//     const screwGrad = ctx.createRadialGradient(50, 27, 0, 50, 27, 4);
//     screwGrad.addColorStop(0, '#ffffff');
//     screwGrad.addColorStop(0.6, '#8e959e');
//     screwGrad.addColorStop(1, '#2c3138');
//     ctx.fillStyle = screwGrad;
//     ctx.beginPath(); ctx.arc(50, 27, 4, 0, Math.PI * 2); ctx.fill();
//     ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1;
//     ctx.beginPath(); ctx.moveTo(48, 27); ctx.lineTo(52, 27); ctx.stroke();

//     // Multiwatt-15 L298N IC Label
//     ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
//     ctx.font = 'bold 5px "Courier New", monospace';
//     ctx.textAlign = 'center';
//     ctx.fillText('L298N', 50, 36);

//     // --- 4. Electrolytic Capacitors ---
//     [[12, 46], [84, 46]].forEach(([cx, cy]) => {
//       // Body Shadow
//       ctx.fillStyle = 'rgba(0,0,0,0.3)';
//       ctx.beginPath(); ctx.arc(cx + 1, cy + 1, 5, 0, Math.PI * 2); ctx.fill();

//       // Black Body
//       const capGrad = ctx.createRadialGradient(cx - 1.5, cy - 1.5, 1, cx, cy, 5);
//       capGrad.addColorStop(0, '#444');
//       capGrad.addColorStop(0.7, '#1a1a1a');
//       capGrad.addColorStop(1, '#050505');
//       ctx.fillStyle = capGrad;
//       ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();

//       // Top Metallic Vent Cap
//       ctx.fillStyle = '#8a929a';
//       ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
//       ctx.strokeStyle = '#3a3e42'; ctx.lineWidth = 0.6;
//       ctx.beginPath();
//       ctx.moveTo(cx - 2, cy); ctx.lineTo(cx + 2, cy);
//       ctx.moveTo(cx, cy - 2); ctx.lineTo(cx, cy + 2);
//       ctx.stroke();
//     });

//     // 5V Regulator IC (78M05)
//     ctx.fillStyle = '#1c1c1c';
//     drawRR(45, 45, 10, 7, 1); ctx.fill();
//     ctx.fillStyle = '#666'; ctx.fillRect(47, 43, 6, 2);

//     // --- 5. Blue Screw Terminal Blocks ---
//     const drawBlueTerminal = (tx, ty, tw, th, screwPositions) => {
//       // Block Body
//       const termGrad = ctx.createLinearGradient(tx, ty, tx, ty + th);
//       termGrad.addColorStop(0, '#246bce');
//       termGrad.addColorStop(0.5, '#174ea6');
//       termGrad.addColorStop(1, '#0f387a');
//       ctx.fillStyle = termGrad;
//       drawRR(tx, ty, tw, th, 1.5); ctx.fill();
//       ctx.strokeStyle = '#0a2552'; ctx.lineWidth = 0.8; ctx.stroke();

//       // Wire Entry Slots & Brass Screws
//       screwPositions.forEach(sx => {
//         // Wire Hole
//         ctx.fillStyle = '#0a101d';
//         ctx.fillRect(sx - 3, ty + 1, 6, 3);

//         // Brass Screw Cap
//         const scrGrad = ctx.createRadialGradient(sx - 0.5, ty + 8, 0, sx, ty + 8, 3.2);
//         scrGrad.addColorStop(0, '#f5e08c');
//         scrGrad.addColorStop(0.6, '#c4a233');
//         scrGrad.addColorStop(1, '#6e5611');
//         ctx.fillStyle = scrGrad;
//         ctx.beginPath(); ctx.arc(sx, ty + 8, 3.2, 0, Math.PI * 2); ctx.fill();
//         ctx.strokeStyle = '#3d2e03'; ctx.lineWidth = 0.8;
//         ctx.beginPath(); ctx.arc(sx, ty + 8, 3.2, 0, Math.PI * 2); ctx.stroke();

//         // Screw Slot
//         ctx.strokeStyle = '#1f1701'; ctx.lineWidth = 0.8;
//         ctx.beginPath(); ctx.moveTo(sx - 2, ty + 8); ctx.lineTo(sx + 2, ty + 8); ctx.stroke();
//       });
//     };

//     // Motor A Terminal (Left: OUT1, OUT2)
//     drawBlueTerminal(5, 4, 30, 12, [10, 30]);
//     // Power Terminal (Center: VS)
//     drawBlueTerminal(43, 4, 14, 12, [50]);
//     // Motor B Terminal (Right: OUT3, OUT4)
//     drawBlueTerminal(65, 4, 30, 12, [70, 90]);

//     // --- 6. Male Header Pins & Jumpers (Bottom) ---
//     // Black Header Bar
//     ctx.fillStyle = '#151515';
//     drawRR(6, 68, 88, 6, 1); ctx.fill();

//     const pinXList = [10, 26, 42, 50, 58, 74, 90];
//     pinXList.forEach(px => {
//       // Golden Pin Pad
//       ctx.fillStyle = '#d4af37';
//       ctx.fillRect(px - 1.2, 69, 2.4, 4);

//       // Lead extending to component boundary
//       ctx.strokeStyle = '#a0a0a0'; ctx.lineWidth = 1.2;
//       ctx.beginPath(); ctx.moveTo(px, 74); ctx.lineTo(px, 80); ctx.stroke();
//     });

//     // Top Leads to boundary
//     [10, 30, 50, 70, 90].forEach(px => {
//       ctx.strokeStyle = '#a0a0a0'; ctx.lineWidth = 1.2;
//       ctx.beginPath(); ctx.moveTo(px, 4); ctx.lineTo(px, 0); ctx.stroke();
//     });

//     // Yellow Jumpers on ENA & ENB
//     [74, 90].forEach(jx => {
//       const jGrad = ctx.createLinearGradient(jx - 2.5, 67, jx + 2.5, 73);
//       jGrad.addColorStop(0, '#f39c12');
//       jGrad.addColorStop(0.5, '#f1c40f');
//       jGrad.addColorStop(1, '#d35400');
//       ctx.fillStyle = jGrad;
//       drawRR(jx - 2.5, 67, 5, 6, 1); ctx.fill();
//       ctx.strokeStyle = '#7e5109'; ctx.lineWidth = 0.5; ctx.stroke();
//     });

//     // --- 7. Status LEDs (Power & Motor Direction) ---
//     // Power LED (Red)
//     const pwrOn = isPowered;
//     ctx.fillStyle = pwrOn ? '#ff3333' : '#441111';
//     if (pwrOn) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 5; }
//     ctx.beginPath(); ctx.arc(38, 48, 1.8, 0, Math.PI * 2); ctx.fill();
//     ctx.shadowBlur = 0;

//     // Motor A Indicator LED
//     ctx.fillStyle = mA > 0 ? '#2ecc71' : mA < 0 ? '#e74c3c' : '#223322';
//     if (mA !== 0) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6; }
//     ctx.beginPath(); ctx.arc(22, 57, 1.8, 0, Math.PI * 2); ctx.fill();
//     ctx.shadowBlur = 0;

//     // Motor B Indicator LED
//     ctx.fillStyle = mB > 0 ? '#2ecc71' : mB < 0 ? '#e74c3c' : '#223322';
//     if (mB !== 0) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6; }
//     ctx.beginPath(); ctx.arc(78, 57, 1.8, 0, Math.PI * 2); ctx.fill();
//     ctx.shadowBlur = 0;

//     // --- 8. Silkscreen Text & Labeling ---
//     ctx.fillStyle = '#ffffff';
//     ctx.font = 'bold 4.5px sans-serif';
//     ctx.textAlign = 'center';

//     // Output Labels
//     ctx.fillText('OUT1  OUT2', 20, 19);
//     ctx.fillText('POWER', 50, 19);
//     ctx.fillText('OUT3  OUT4', 80, 19);

//     // Header Pin Labels
//     ctx.font = 'bold 3.5px monospace';
//     ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
//     ctx.fillText('IN1', 10, 66);
//     ctx.fillText('IN2', 26, 66);
//     ctx.fillText('IN3', 42, 66);
//     ctx.fillText('GND', 50, 66);
//     ctx.fillText('IN4', 58, 66);
//     ctx.fillText('ENA', 74, 66);
//     ctx.fillText('ENB', 90, 66);

//     // Motor State Readout Overlay
//     ctx.font = 'bold 3.8px monospace';
//     const aPct = Math.round(Math.abs(mA) * 100);
//     const bPct = Math.round(Math.abs(mB) * 100);

//     ctx.fillStyle = mA !== 0 ? '#00ffcc' : 'rgba(255,255,255,0.4)';
//     ctx.fillText(mA !== 0 ? `${aPct}% ${mA > 0 ? 'FWD' : 'REV'}` : 'M1: OFF', 22, 62);

//     ctx.fillStyle = mB !== 0 ? '#00ffcc' : 'rgba(255,255,255,0.4)';
//     ctx.fillText(mB !== 0 ? `${bPct}% ${mB > 0 ? 'FWD' : 'REV'}` : 'M2: OFF', 78, 62);

//     if (inst.selected && typeof drawSelectionRect === 'function') {
//       drawSelectionRect(ctx, -1, 1, 102, 78);
//     }

//     ctx.restore();
//   }
// });

// defComp({
//   id: 'l298n',
//   name: 'L298N Motor Driver',
//   category: 'Actuators',
//   icon: '⏩',
//   desc: 'L298N dual H-bridge motor driver. Controls direction and PWM speed for two DC motors',
//   width: 100,
//   height: 80,
//   defaultProps: {},
//   pins: [
//     { id: 'IN1', label: 'IN1', type: PIN_TYPE.DIGITAL, x: 10, y: 80, side: 'bottom' },
//     { id: 'IN2', label: 'IN2', type: PIN_TYPE.DIGITAL, x: 26, y: 80, side: 'bottom' },
//     { id: 'IN3', label: 'IN3', type: PIN_TYPE.DIGITAL, x: 42, y: 80, side: 'bottom' },
//     { id: 'IN4', label: 'IN4', type: PIN_TYPE.DIGITAL, x: 58, y: 80, side: 'bottom' },
//     { id: 'ENA', label: 'ENA', type: PIN_TYPE.PWM, x: 74, y: 80, side: 'bottom' },
//     { id: 'ENB', label: 'ENB', type: PIN_TYPE.PWM, x: 90, y: 80, side: 'bottom' },
//     { id: 'OUT1', label: 'M1+', type: PIN_TYPE.SIGNAL, x: 10, y: 0, side: 'top' },
//     { id: 'OUT2', label: 'M1-', type: PIN_TYPE.SIGNAL, x: 30, y: 0, side: 'top' },
//     { id: 'OUT3', label: 'M2+', type: PIN_TYPE.SIGNAL, x: 70, y: 0, side: 'top' },
//     { id: 'OUT4', label: 'M2-', type: PIN_TYPE.SIGNAL, x: 90, y: 0, side: 'top' },
//     { id: 'VS', label: 'VS', type: PIN_TYPE.POWER, x: 50, y: 0, side: 'top' },
//     { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 50, y: 80, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;

//     ctx.save();
//     ctx.translate(x, y);

//     // PCB body
//     ctx.fillStyle = '#0a3d0a';
//     roundRect(ctx, 0, 8, 100, 64, 4);
//     ctx.fill();
//     ctx.strokeStyle = '#1a5c1a';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // L298N heatsink
//     ctx.fillStyle = '#333';
//     roundRect(ctx, 30, 16, 40, 24, 2);
//     ctx.fill();
//     ctx.fillStyle = '#555';
//     ctx.font = 'bold 5px monospace';
//     ctx.textAlign = 'center';
//     ctx.fillText('L298N', 50, 30);

//     // Motor output terminals
//     ctx.fillStyle = '#c8a452';
//     [[15, 12], [35, 12], [65, 12], [85, 12]].forEach(([tx, ty]) => {
//       ctx.beginPath();
//       ctx.arc(tx, ty, 4, 0, Math.PI * 2);
//       ctx.fill();
//     });

//     // Status LEDs â€” green when motor runs forward, red when reverse, dim when stopped
//     const mA = inst.runtimeState?.motorA ?? 0;
//     const mB = inst.runtimeState?.motorB ?? 0;
//     // Motor A LED
//     ctx.fillStyle = mA > 0 ? '#00ff00' : mA < 0 ? '#ff4444' : '#333';
//     if (mA !== 0) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 4; }
//     ctx.beginPath(); ctx.arc(10, 50, 2, 0, Math.PI * 2); ctx.fill();
//     ctx.shadowBlur = 0;
//     // Motor B LED
//     ctx.fillStyle = mB > 0 ? '#00ff00' : mB < 0 ? '#ff4444' : '#333';
//     if (mB !== 0) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 4; }
//     ctx.beginPath(); ctx.arc(20, 50, 2, 0, Math.PI * 2); ctx.fill();
//     ctx.shadowBlur = 0;

//     // Labels
//     ctx.fillStyle = '#aaa';
//     ctx.font = 'bold 4px monospace';
//     ctx.textAlign = 'center';
//     ctx.fillText('MOTOR A', 22, 60);
//     ctx.fillText('MOTOR B', 78, 60);
//     ctx.fillStyle = '#0f0';
//     ctx.font = 'bold 3.5px monospace';
//     const aPct = Math.round(Math.abs(mA) * 100);
//     const bPct = Math.round(Math.abs(mB) * 100);
//     ctx.fillText(mA !== 0 ? `${aPct}% ${mA > 0 ? 'FWD' : 'REV'}` : 'STOP', 22, 66);
//     ctx.fillText(mB !== 0 ? `${bPct}% ${mB > 0 ? 'FWD' : 'REV'}` : 'STOP', 78, 66);

//     // Pin leads
//     ctx.strokeStyle = '#a0a0a0';
//     ctx.lineWidth = 1.5;
//     [10, 26, 42, 58, 74, 90].forEach(px => {
//       ctx.beginPath(); ctx.moveTo(px, 72); ctx.lineTo(px, 80); ctx.stroke();
//     });
//     [10, 30, 50, 70, 90].forEach(px => {
//       ctx.beginPath(); ctx.moveTo(px, 8); ctx.lineTo(px, 0); ctx.stroke();
//     });

//     if (inst.selected) drawSelectionRect(ctx, -2, -4, 104, 88);
//     ctx.restore();
//   }
// });

/*------------------Continuous rotation servo motor------------------ */
defComp({
  id: 'servo_continuous',
  name: 'Cont. Rotation Servo',
  category: 'Actuators',
  icon: '♾️',
  desc: 'Continuous rotation servo motor. Variable speed control in both directions (not 0-180Â° positioning)',
  width: 60,
  height: 50,
  defaultProps: { speed: 0 },
  // interactive: [
  //   { field: 'speed', label: 'Speed', min: -100, max: 100, step: 1, unit: '%' },
  // ],
  pins: [
    { id: 'signal', label: 'SIG', type: PIN_TYPE.PWM, x: 8, y: 50, side: 'bottom' },
    { id: 'vcc', label: '+', type: PIN_TYPE.POWER, x: 25, y: 50, side: 'bottom' },
    { id: 'gnd', label: 'âˆ’', type: PIN_TYPE.GND, x: 42, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const speed = inst.runtimeState?.speed ?? inst.props.speed ?? 0;
    const rotation = Date.now() * speed * 0.01;

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#f5c842';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(8, 50); ctx.lineTo(8, 44); ctx.stroke();
    ctx.strokeStyle = '#cc3333';
    ctx.beginPath(); ctx.moveTo(25, 50); ctx.lineTo(25, 44); ctx.stroke();
    ctx.strokeStyle = '#333';
    ctx.beginPath(); ctx.moveTo(42, 50); ctx.lineTo(42, 44); ctx.stroke();

    // Body
    const bodyGrad = ctx.createLinearGradient(0, 5, 60, 45);
    bodyGrad.addColorStop(0, '#3a3a3a');
    bodyGrad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 0, 5, 60, 40, 6);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Gear hub
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(30, 22, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(30, 22, 7, 0, Math.PI * 2); ctx.fill();

    // Rotating arm
    ctx.save();
    ctx.translate(30, 22);
    ctx.rotate(rotation);
    ctx.fillStyle = '#aaa';
    roundRect(ctx, -4, -20, 8, 22, 3);
    ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.beginPath(); ctx.arc(0, -18, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Center hub
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(30, 22, 4, 0, Math.PI * 2); ctx.fill();

    // Speed display
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    const dir = speed > 0 ? 'CW' : speed < 0 ? 'CCW' : 'STOP';
    ctx.fillText(`${Math.abs(speed)}% ${dir}`, 30, 42);

    if (inst.selected) drawSelectionRect(ctx, -3, 2, 66, 55);
    ctx.restore();
  }
});

/* ══════════════ CLASS-BASED ACTUATOR COMPONENTS ══════════════ */

class ServoComponent extends Component {
  getPins() {
    return [
      { id: 'signal', label: 'SIG', type: PIN_TYPE.PWM, x: 8, y: 50, side: 'bottom' },
      { id: 'vcc', label: '+', type: PIN_TYPE.POWER, x: 25, y: 50, side: 'bottom' },
      { id: 'gnd', label: '−', type: PIN_TYPE.GND, x: 42, y: 50, side: 'bottom' },
    ];
  }
  update(canvas) {
    if (this.runtimeState._servoDriven) return;
    const sigPin = this.getConnectedPinNum('signal');
    let pwm = 0;
    if (sigPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
      pwm = window.ArduinoSim.pinStates[`pin_${sigPin}`] || 0;
    }
    this.runtimeState.angle = Math.round((pwm / 255) * 180);
  }
}

class ServoContinuousComponent extends Component {
  getPins() {
    return [
      { id: 'signal', label: 'SIG', type: PIN_TYPE.PWM, x: 8, y: 50, side: 'bottom' },
      { id: 'vcc', label: '+', type: PIN_TYPE.POWER, x: 25, y: 50, side: 'bottom' },
      { id: 'gnd', label: '−', type: PIN_TYPE.GND, x: 42, y: 50, side: 'bottom' },
    ];
  }
  update(canvas) {
    const sigPin = this.getConnectedPinNum('signal');
    let pwm = 0;
    if (sigPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
      pwm = window.ArduinoSim.pinStates[`pin_${sigPin}`] || 0;
    }
    const center = 127;
    this.runtimeState.speed = Math.max(-100, Math.min(100, Math.round(((pwm - center) / center) * 100)));
  }
}

class RelayComponent extends Component {
  getPins() {
    return [
      { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 12, y: 60, side: 'bottom' },
      { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 24, y: 60, side: 'bottom' },
      { id: 'sig', label: 'IN', type: PIN_TYPE.DIGITAL, x: 36, y: 60, side: 'bottom' },
      { id: 'com', label: 'COM', type: PIN_TYPE.SIGNAL, x: 54, y: 60, side: 'bottom' },
      { id: 'no', label: 'NO', type: PIN_TYPE.SIGNAL, x: 66, y: 60, side: 'bottom' },
      { id: 'nc', label: 'NC', type: PIN_TYPE.SIGNAL, x: 78, y: 60, side: 'bottom' },
    ];
  }
  update(canvas) {
    const sigPin = this.getConnectedPinNum('sig');
    const sigOn = sigPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates
      ? !!window.ArduinoSim.pinStates[`pin_${sigPin}`] : false;
    const wasActive = this.runtimeState.active;
    this.runtimeState.active = sigOn;
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
  }
}

class DCMotorComponent extends Component {
  getPins() {
    return [
      { id: 'in', label: 'IN', type: PIN_TYPE.PWM, x: 30, y: 100, side: 'bottom' },
      { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 50, y: 100, side: 'bottom' },
    ];
  }
  update(canvas) {
    let pwm = 0;
    const inPin = this.getConnectedPinNum('in');
    if (inPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
      pwm = window.ArduinoSim.pinStates[`pin_${inPin}`] || 0;
    }
    if (pwm === 0) {
      const targets = this.findConnected('in', 'l298n');
      if (targets.length > 0) {
        const l298 = targets[0];
        const canvas = window.CircuitCanvas;
        let pinId = null;
        if (canvas && canvas._getWireTarget) {
          const wt = canvas._getWireTarget(this.id, 'in');
          if (wt && wt.inst.type === 'l298n') pinId = wt.pinId;
        }
        if (pinId === 'OUT1' || pinId === 'OUT2') pwm = Math.abs((l298.runtimeState?.motorA || 0)) * 255;
        else if (pinId === 'OUT3' || pinId === 'OUT4') pwm = Math.abs((l298.runtimeState?.motorB || 0)) * 255;
      }
    }
    let speed = Math.max(0, Math.min(1, (Number(pwm) || 0) / 255));
    if (speed === 0) {
      const source = this.getSource('in');
      const hasGnd = this.hasGround('gnd');
      if (hasGnd && source && source.voltage > 0) {
        speed = Math.min(1, source.voltage / 12);
      }
    }
    this.runtimeState.speed = speed;
    this.runtimeState.rpm = Math.round(speed * 120);
  }
}

class L298NComponent extends Component {
  getPins() {
    return [
      { id: 'IN1', label: 'IN1', type: PIN_TYPE.DIGITAL, x: 10, y: 80, side: 'bottom' },
      { id: 'IN2', label: 'IN2', type: PIN_TYPE.DIGITAL, x: 23, y: 80, side: 'bottom' },
      { id: 'IN3', label: 'IN3', type: PIN_TYPE.DIGITAL, x: 36, y: 80, side: 'bottom' },
      { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 50, y: 80, side: 'bottom' },
      { id: 'IN4', label: 'IN4', type: PIN_TYPE.DIGITAL, x: 64, y: 80, side: 'bottom' },
      { id: 'ENA', label: 'ENA', type: PIN_TYPE.PWM, x: 77, y: 80, side: 'bottom' },
      { id: 'ENB', label: 'ENB', type: PIN_TYPE.PWM, x: 90, y: 80, side: 'bottom' },
      { id: 'OUT1', label: 'M1+', type: PIN_TYPE.SIGNAL, x: 10, y: 0, side: 'top' },
      { id: 'OUT2', label: 'M1-', type: PIN_TYPE.SIGNAL, x: 30, y: 0, side: 'top' },
      { id: 'VS', label: 'VS', type: PIN_TYPE.POWER, x: 50, y: 0, side: 'top' },
      { id: 'OUT3', label: 'M2+', type: PIN_TYPE.SIGNAL, x: 70, y: 0, side: 'top' },
      { id: 'OUT4', label: 'M2-', type: PIN_TYPE.SIGNAL, x: 90, y: 0, side: 'top' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const readPin = (pid) => {
      const pn = this.getConnectedPinNum(pid);
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
    this.runtimeState.motorA = motorA;
    this.runtimeState.motorB = motorB;
  }
}

class Stepper28BYJComponent extends Component {
  getPins() {
    return [
      { id: 'IN1', label: 'IN1', type: PIN_TYPE.DIGITAL, x: 20, y: 100, side: 'bottom' },
      { id: 'IN2', label: 'IN2', type: PIN_TYPE.DIGITAL, x: 40, y: 100, side: 'bottom' },
      { id: 'IN3', label: 'IN3', type: PIN_TYPE.DIGITAL, x: 60, y: 100, side: 'bottom' },
      { id: 'IN4', label: 'IN4', type: PIN_TYPE.DIGITAL, x: 80, y: 100, side: 'bottom' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const ps = sim.pinStates;
    const readBit = (id) => {
      const pn = this.getConnectedPinNum(id);
      return pn !== null ? ((ps[`pin_${pn}`] || 0) > 0 ? 1 : 0) : 0;
    };
    const in1 = readBit('IN1'), in2 = readBit('IN2');
    const in3 = readBit('IN3'), in4 = readBit('IN4');
    const pattern = (in1) | (in2 << 1) | (in3 << 2) | (in4 << 3);
    const prev = this.runtimeState._lastPattern ?? 0;
    const stepAngle = 5.625 / 64;

    let matched = null;
    const pinNums = ['IN1', 'IN2', 'IN3', 'IN4']
      .map(id => this.getConnectedPinNum(id));
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
      if (this.runtimeState._lastPos !== undefined) {
        const delta = matched.pos - this.runtimeState._lastPos;
        if (delta) this.runtimeState.angle = (this.runtimeState.angle ?? 0) + delta * stepAngle;
      }
      this.runtimeState._lastPos = matched.pos;
    } else if (pattern !== 0 && pattern !== prev) {
      this.runtimeState.angle = (this.runtimeState.angle ?? 0) + stepAngle;
    }
    this.runtimeState._lastPattern = pattern;
    this.runtimeState.active = pattern !== 0 || (!!matched && matched.pos !== matched.target);
  }
}

registerComponent('servo', ServoComponent);
registerComponent('servo_continuous', ServoContinuousComponent);
registerComponent('relay', RelayComponent);
registerComponent('dc_motor', DCMotorComponent);
registerComponent('l298n', L298NComponent);
registerComponent('stepper_28byj', Stepper28BYJComponent);
