/*
 * components/power.js — Power component definitions
 */

'use strict';
/*--------------------------- Power Supply------------------------------------- */
defComp({
  id: 'power_5v',
  name: '5V Power',
  category: 'Power',
  icon: '⚡',
  desc: '5V DC power supply terminal',
  width: 30,
  height: 30,
  defaultProps: {},
  pins: [
    { id: 'vcc', label: '5V', type: PIN_TYPE.POWER, x: 15, y: 30, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#cc3333';
    roundRect(ctx, 2, 2, 26, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('5V', 15, 16);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(15, 24); ctx.lineTo(15, 30); ctx.stroke();
    if (inst.selected) drawSelectionRect(ctx, -2, -2, 34, 34);
    ctx.restore();
  }
});

defComp({
  id: 'power_gnd',
  name: 'GND',
  category: 'Power',
  icon: '⏚',
  desc: 'Ground (GND) reference terminal',
  width: 30,
  height: 30,
  defaultProps: {},
  pins: [
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 15, y: 0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(15, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(26, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 17); ctx.lineTo(22, 17); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 22); ctx.lineTo(18, 22); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GND', 15, 30);
    if (inst.selected) drawSelectionRect(ctx, -2, -2, 34, 34);
    ctx.restore();
  }
});

/* -------------- Li-Ion Battery (single cell, 3.7 V nominal) ------------------ */
// defComp({
//   id: 'battery',
//   name: 'Li-Ion Battery',
//   category: 'Power',
//   icon: '🔋',
//   desc: 'Single-cell Li-Ion battery, 3.7 V nominal (2.5–4.2 V) — POS (+) and NEG (−) terminals',
//   width: 74,
//   height: 44,
//   defaultProps: {
//     voltage: 3.7,
//   },
//   interactive: [
//     { field: 'voltage', label: 'Voltage', min: 2.5, max: 4.2, step: 0.05, unit: 'V' },
//   ],
//   pins: [
//     { id: 'pos', label: '+', type: PIN_TYPE.POWER, x: 72, y: 22, side: 'right' },
//     { id: 'neg', label: '−', type: PIN_TYPE.GND, x: 2, y: 22, side: 'left' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const v = Number(inst.runtimeState?.voltage ?? inst.props?.voltage ?? 3.7);
//     const soc = Math.max(0, Math.min(1, (v - 2.5) / (4.2 - 2.5)));
//     const bodyX = 6, bodyY = 4, bodyW = 58, bodyH = 36, r = 6;

//     ctx.save();
//     ctx.translate(x, y);

//     // Lead stubs
//     ctx.strokeStyle = '#8a9099';
//     ctx.lineWidth = 2.5;
//     ctx.beginPath(); ctx.moveTo(0, 22); ctx.lineTo(bodyX, 22); ctx.stroke();
//     ctx.beginPath(); ctx.moveTo(bodyX + bodyW, 22); ctx.lineTo(74, 22); ctx.stroke();

//     // Positive nub
//     ctx.fillStyle = '#b0b6bd';
//     roundRect(ctx, bodyX + bodyW, 14, 8, 16, 2);
//     ctx.fill();

//     // Cell body
//     const grad = ctx.createLinearGradient(0, bodyY, 0, bodyY + bodyH);
//     grad.addColorStop(0, '#3d4652');
//     grad.addColorStop(0.45, '#2a313b');
//     grad.addColorStop(1, '#1a1f26');
//     ctx.fillStyle = grad;
//     roundRect(ctx, bodyX, bodyY, bodyW, bodyH, r);
//     ctx.fill();
//     ctx.strokeStyle = '#0e1116';
//     ctx.lineWidth = 1;
//     roundRect(ctx, bodyX, bodyY, bodyW, bodyH, r);
//     ctx.stroke();

//     // Charge-level bar
//     const barX = bodyX + 4, barY = bodyY + bodyH - 9, barW = bodyW - 8, barH = 5;
//     ctx.fillStyle = '#12161c';
//     roundRect(ctx, barX, barY, barW, barH, 2);
//     ctx.fill();
//     if (soc > 0) {
//       const fillW = Math.max(2, barW * soc);
//       ctx.fillStyle = soc > 0.5 ? '#2e7d32' : soc > 0.2 ? '#f9a825' : '#c62828';
//       roundRect(ctx, barX, barY, fillW, barH, 2);
//       ctx.fill();
//     }

//     // Labels
//     ctx.fillStyle = '#eceff1';
//     ctx.font = 'bold 9px sans-serif';
//     ctx.textAlign = 'center';
//     ctx.fillText('Li-Ion', bodyX + bodyW / 2, bodyY + 14);
//     ctx.fillStyle = '#90a4ae';
//     ctx.font = '8px sans-serif';
//     ctx.fillText(`${v.toFixed(2)} V`, bodyX + bodyW / 2, bodyY + 24);

//     // + / − polarity marks
//     ctx.fillStyle = '#ef5350';
//     ctx.font = 'bold 11px sans-serif';
//     ctx.textAlign = 'left';
//     ctx.fillText('+', bodyX + bodyW + 10, 12);
//     ctx.fillStyle = '#90a4ae';
//     ctx.textAlign = 'right';
//     ctx.fillText('−', bodyX - 2, 12);

//     if (inst.selected) drawSelectionRect(ctx, -3, -1, 80, 46);
//     ctx.restore();
//   }
// });
/* ──────────────────── LI-ION BATTERY MODEL (ENHANCED) ──────────────────── */
const BATT_V_MIN = 2.5;
const BATT_V_MAX = 4.2;

function batterySocFromVoltage(v) {
  return Math.max(0, Math.min(1, (Number(v) - BATT_V_MIN) / (BATT_V_MAX - BATT_V_MIN)));
}

function batterySeedSoc(inst) {
  inst.runtimeState = inst.runtimeState || {};
  const v = inst.runtimeState.voltage ?? inst.props?.voltage ?? 3.7;
  inst.runtimeState._soc = batterySocFromVoltage(v);
  return inst.runtimeState._soc;
}

window.batterySeedSoc = batterySeedSoc;
window.batterySocFromVoltage = batterySocFromVoltage;

defComp({
  id: 'battery',
  name: 'Li-Ion Battery',
  category: 'Power',
  icon: '🔋',
  desc: 'Single-cell Li-Ion battery, 3.7 V nominal (2.5–4.2 V). Drains under load — lower Capacity (mAh) in Properties to see voltage drop faster. Drag Voltage to recharge/reset.',
  width: 144,
  height: 78,
  defaultProps: {
    voltage: 3.7,
    capacity_mah: 5,
    r_int: 0.15,
  },
  interactive: [
    { field: 'voltage', label: 'Voltage', min: 2.5, max: 4.2, step: 0.05, unit: 'V' },
  ],
  pins: [
    { id: 'pos', label: '+', type: PIN_TYPE.POWER, x: 142, y: 39, side: 'right' },
    { id: 'neg', label: '−', type: PIN_TYPE.GND,   x: 2,  y: 39, side: 'left' },
  ],
  step(inst, sim) {
    const rs = inst.runtimeState = inst.runtimeState || {};
    const props = inst.props || {};

    const useSim = !!(sim && sim.isRunning && typeof sim.simTime === 'number');
    const now = useSim
      ? sim.simTime
      : (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const base = useSim ? 'sim' : 'wall';

    if (rs._timeBase !== base) {
      rs._timeBase = base;
      rs._lastTick = now;
    }

    const last = rs._lastTick;
    rs._lastTick = now;
    let dtMs = now - last;
    // simTime reset (Run) or first frame / clock jump — skip integrate
    if (!Number.isFinite(dtMs) || dtMs <= 0 || dtMs > 60000) dtMs = 0;

    if (rs._soc == null) batterySeedSoc(inst);
    let soc = Math.max(0, Math.min(1, rs._soc));

    const capMah = Math.max(0.1, Number(rs.capacity_mah ?? props.capacity_mah ?? 5));
    const rInt = Math.max(0, Number(rs.r_int ?? props.r_int ?? 0.15));

    let iA = 0;
    const engine = window.CircuitCanvas && window.CircuitCanvas.engine;
    if (engine && typeof engine.calculateCurrent === 'function') {
      const raw = engine.calculateCurrent(inst.id, 'pos', inst.id, 'neg');
      if (Number.isFinite(raw)) iA = raw;
    }
    const iDis = Math.max(0, iA);

    if (dtMs > 0 && iDis > 1e-6) {
      const dAh = (iDis * (dtMs / 1000)) / 3600;
      soc = Math.max(0, soc - dAh / (capMah / 1000));
    }

    rs._soc = soc;
    const vOcv = BATT_V_MIN + soc * (BATT_V_MAX - BATT_V_MIN);
    rs.voltage = Math.max(0, vOcv - iDis * rInt);
  },
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const W = 144, H = 78;
    const v = Number(inst.runtimeState?.voltage ?? inst.props?.voltage ?? 3.7);
    const soc = inst.runtimeState?._soc != null
      ? Math.max(0, Math.min(1, inst.runtimeState._soc))
      : batterySocFromVoltage(v);
    const socPct = Math.round(soc * 100);

    const bodyX = 18, bodyY = 9, bodyW = 102, bodyH = 60, r = 9;

    ctx.save();
    ctx.translate(x, y);

    // ── Terminal Lead Stubs ──
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 39); ctx.lineTo(bodyX, 39); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bodyX + bodyW + 12, 39); ctx.lineTo(W, 39); ctx.stroke();

    // ── Negative Terminal Metallic Cap (Left) ──
    const negCapGrad = ctx.createLinearGradient(0, bodyY, 0, bodyY + bodyH);
    negCapGrad.addColorStop(0, '#b0bec5');
    negCapGrad.addColorStop(0.3, '#eceff1');
    negCapGrad.addColorStop(0.7, '#90a4ae');
    negCapGrad.addColorStop(1, '#546e7a');
    ctx.fillStyle = negCapGrad;
    roundRect(ctx, bodyX - 5, bodyY + 5, 8, bodyH - 10, 3);
    ctx.fill();

    // ── Positive Terminal Button Nipple (Right) ──
    const posCapGrad = ctx.createLinearGradient(0, bodyY + 18, 0, bodyY + bodyH - 18);
    posCapGrad.addColorStop(0, '#cfd8dc');
    posCapGrad.addColorStop(0.4, '#ffffff');
    posCapGrad.addColorStop(0.8, '#90a4ae');
    posCapGrad.addColorStop(1, '#607d8b');
    ctx.fillStyle = posCapGrad;
    roundRect(ctx, bodyX + bodyW, 24, 11, 30, 4);
    ctx.fill();
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Positive Insulation Ring
    ctx.fillStyle = '#1e88e5';
    roundRect(ctx, bodyX + bodyW - 3, 18, 5, 42, 2);
    ctx.fill();

    // ── Main Battery Sleeve (Metallic Cylinder Finish) ──
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    const wrapGrad = ctx.createLinearGradient(0, bodyY, 0, bodyY + bodyH);
    wrapGrad.addColorStop(0, '#1a232a');
    wrapGrad.addColorStop(0.25, '#2c3b47');
    wrapGrad.addColorStop(0.5, '#1e2830');
    wrapGrad.addColorStop(0.8, '#141a20');
    wrapGrad.addColorStop(1, '#0b0f13');
    ctx.fillStyle = wrapGrad;
    roundRect(ctx, bodyX, bodyY, bodyW, bodyH, r);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Body Border
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 1.5;
    roundRect(ctx, bodyX, bodyY, bodyW, bodyH, r);
    ctx.stroke();

    // Cylindrical Glass Reflection Streak
    const shineGrad = ctx.createLinearGradient(0, bodyY, 0, bodyY + bodyH / 2);
    shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shineGrad;
    roundRect(ctx, bodyX + 2, bodyY + 2, bodyW - 4, bodyH / 2 - 2, { tl: r, tr: r, bl: 0, br: 0 });
    ctx.fill();

    // ── State of Charge (SOC) Bar Gauge ──
    const barX = bodyX + 9, barY = bodyY + bodyH - 16, barW = bodyW - 18, barH = 9;
    ctx.fillStyle = '#0a0d12';
    roundRect(ctx, barX, barY, barW, barH, 3);
    ctx.fill();
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (soc > 0) {
      const fillW = Math.max(4, barW * soc);
      let socColor = '#00e676'; // High (>50%)
      let socGlow = 'rgba(0, 230, 118, 0.4)';
      if (soc <= 0.2) {
        socColor = '#ff1744';  // Critical (<=20%)
        socGlow = 'rgba(255, 23, 68, 0.4)';
      } else if (soc <= 0.5) {
        socColor = '#ffb300';  // Medium (20–50%)
        socGlow = 'rgba(255, 179, 0, 0.4)';
      }

      ctx.fillStyle = socColor;
      ctx.shadowColor = socGlow;
      ctx.shadowBlur = 5;
      roundRect(ctx, barX + 0.5, barY + 0.5, fillW - 1, barH - 1, 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // ── Text & Voltage / SOC % Readout ──
    ctx.fillStyle = '#eceff1';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Li-Ion 18650', bodyX + bodyW / 2, bodyY + 20);

    ctx.fillStyle = soc > 0.2 ? '#b0bec5' : '#ff8a80';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${v.toFixed(2)}V · ${socPct}%`, bodyX + bodyW / 2, bodyY + 35);

    // ── Terminal Polarity Badges ──
    // Positive Badge (+)
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(bodyX + bodyW - 12, bodyY + 15, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', bodyX + bodyW - 12, bodyY + 19);

    // Negative Badge (−)
    ctx.fillStyle = '#455a64';
    ctx.beginPath();
    ctx.arc(bodyX + 12, bodyY + 15, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('−', bodyX + 12, bodyY + 19);

    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -3, -2, W + 6, H + 4);
    }

    ctx.restore();
  }
});
/* -------------- MB102 Breadboard Power Supply Module (3.3V / 5V Dual Rail) ------------------ */
defComp({
  id: 'mb102_power',
  name: 'MB102 Power Supply',
  category: 'Power',
  icon: '⚡',
  desc: 'MB102 3.3V/5V breadboard power supply module with DC barrel jack, USB-A input/output, dual AMS1117 regulators, and rail selector jumpers',
  width: 160,
  height: 96,
  defaultProps: {
    powered: 1,
    topVoltage: '5V',
    bottomVoltage: '3.3V',
  },
  interactive: [
    { field: 'powered', label: 'Power Switch', min: 0, max: 1, step: 1, unit: '' },
    { field: 'topVoltage', label: 'Top Rail', type: 'select', options: ['OFF', '3.3V', '5V'] },
    { field: 'bottomVoltage', label: 'Bottom Rail', type: 'select', options: ['OFF', '3.3V', '5V'] },
  ],
  pins: [
    { id: 'vcc_t', label: 'VCC_TOP', type: PIN_TYPE.POWER, x: 148, y: 12, side: 'top' },
    { id: 'gnd_t', label: 'GND_TOP', type: PIN_TYPE.GND, x: 148, y: 22, side: 'top' },
    { id: 'aux_gnd', label: 'GND', type: PIN_TYPE.GND, x: 104, y: 44, side: 'right' },
    { id: 'aux_3v3', label: '3.3V', type: PIN_TYPE.POWER, x: 104, y: 52, side: 'right' },
    { id: 'aux_5v', label: '5V', type: PIN_TYPE.POWER, x: 104, y: 60, side: 'right' },
    { id: 'vcc_b', label: 'VCC_BOT', type: PIN_TYPE.POWER, x: 148, y: 74, side: 'bottom' },
    { id: 'gnd_b', label: 'GND_BOT', type: PIN_TYPE.GND, x: 148, y: 84, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const isPowered = Boolean(inst.runtimeState?.powered ?? inst.props.powered ?? 1);
    const topV = inst.props.topVoltage ?? '5V';
    const botV = inst.props.bottomVoltage ?? '3.3V';

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#14171a';
    roundRect(ctx, 4, 4, 152, 88, 5);
    ctx.fill();

    ctx.strokeStyle = '#222830';
    ctx.lineWidth = 1.2;
    roundRect(ctx, 6, 6, 148, 84, 4);
    ctx.stroke();

    const holes = [[8, 8], [8, 88], [152, 8], [152, 88]];
    holes.forEach(([hx, hy]) => {
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a0d10';
      ctx.beginPath(); ctx.arc(hx, hy, 1.8, 0, Math.PI * 2); ctx.fill();
    });

    const jackGrad = ctx.createLinearGradient(6, 10, 6, 36);
    jackGrad.addColorStop(0, '#2e3238');
    jackGrad.addColorStop(0.5, '#191b1e');
    jackGrad.addColorStop(1, '#0e1012');
    ctx.fillStyle = jackGrad;
    roundRect(ctx, 6, 10, 32, 24, 2);
    ctx.fill();

    ctx.strokeStyle = '#8a939e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(6, 12, 5, 20);

    ctx.fillStyle = '#08080a';
    ctx.beginPath(); ctx.arc(6, 22, 6.5, -Math.PI / 2, Math.PI / 2); ctx.fill();

    ctx.fillStyle = '#d4af37';
    ctx.beginPath(); ctx.arc(6, 22, 2.2, -Math.PI / 2, Math.PI / 2); ctx.fill();

    const usbGrad = ctx.createLinearGradient(6, 48, 6, 78);
    usbGrad.addColorStop(0, '#dce3eb');
    usbGrad.addColorStop(0.3, '#bcc5cf');
    usbGrad.addColorStop(0.7, '#8f9aa6');
    usbGrad.addColorStop(1, '#5f6974');
    ctx.fillStyle = usbGrad;
    roundRect(ctx, 6, 48, 30, 26, 2);
    ctx.fill();

    ctx.fillStyle = '#1c2024';
    ctx.fillRect(6, 52, 4, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 55, 6, 4);
    ctx.fillRect(14, 63, 6, 4);

    ctx.fillStyle = '#1e2227';
    roundRect(ctx, 44, 26, 18, 18, 2);
    ctx.fill();
    ctx.strokeStyle = '#424952';
    ctx.lineWidth = 1;
    ctx.stroke();

    const btnRadius = isPowered ? 5.8 : 6.8;
    const btnGrad = ctx.createRadialGradient(53, 35, 1, 53, 35, btnRadius);
    btnGrad.addColorStop(0, isPowered ? '#ff5252' : '#d32f2f');
    btnGrad.addColorStop(0.7, isPowered ? '#d50000' : '#9a0007');
    btnGrad.addColorStop(1, '#5c0000');
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.arc(53, 35, btnRadius, 0, Math.PI * 2);
    ctx.fill();

    const regulators = [
      { label: 'AMS1117\n5.0', y: 15 },
      { label: 'AMS1117\n3.3', y: 55 }
    ];

    regulators.forEach(reg => {
      ctx.fillStyle = '#cfd8dc';
      roundRect(ctx, 68, reg.y - 3, 14, 3, 0.5);
      ctx.fill();

      ctx.fillStyle = '#1e2022';
      roundRect(ctx, 67, reg.y, 16, 15, 1.5);
      ctx.fill();

      ctx.fillStyle = '#b0bec5';
      ctx.fillRect(68.5, reg.y + 15, 2.5, 3);
      ctx.fillRect(73.5, reg.y + 15, 2.5, 3);
      ctx.fillRect(78.5, reg.y + 15, 2.5, 3);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 3.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const lines = reg.label.split('\n');
      ctx.fillText(lines[0], 75, reg.y + 6);
      ctx.fillText(lines[1], 75, reg.y + 11);
    });

    const caps = [{ x: 50, y: 64 }, { x: 50, y: 78 }];
    caps.forEach(cap => {
      const capGrad = ctx.createRadialGradient(cap.x, cap.y, 1, cap.x, cap.y, 5);
      capGrad.addColorStop(0, '#546e7a');
      capGrad.addColorStop(0.7, '#263238');
      capGrad.addColorStop(1, '#101416');
      ctx.fillStyle = capGrad;
      ctx.beginPath(); ctx.arc(cap.x, cap.y, 5, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#cfd8dc';
      ctx.beginPath();
      ctx.arc(cap.x, cap.y, 5, -Math.PI / 4, Math.PI / 4);
      ctx.lineTo(cap.x, cap.y);
      ctx.closePath();
      ctx.fill();
    });

    ctx.fillStyle = '#212529';
    roundRect(ctx, 47, 10, 6, 8, 1);
    ctx.fill();

    if (isPowered) {
      ctx.fillStyle = 'rgba(0, 230, 118, 0.35)';
      ctx.beginPath(); ctx.arc(50, 14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#00e676';
      ctx.beginPath(); ctx.arc(50, 14, 2.4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#1b5e20';
      ctx.beginPath(); ctx.arc(50, 14, 2.2, 0, Math.PI * 2); ctx.fill();
    }

    function drawJumperBlock(jx, jy, selectedVal) {
      ctx.fillStyle = '#1a1a1a';
      roundRect(ctx, jx - 1, jy - 1, 18, 8, 1);
      ctx.fill();

      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#ffd066';
        ctx.beginPath(); ctx.arc(jx + 2.5 + i * 5.5, jy + 3, 1.2, 0, Math.PI * 2); ctx.fill();
      }

      ctx.fillStyle = '#fbc02d';
      ctx.strokeStyle = '#c49000';
      ctx.lineWidth = 0.5;

      if (selectedVal === '5V') {
        roundRect(ctx, jx + 0.5, jy + 0.5, 9, 5, 1);
        ctx.fill(); ctx.stroke();
      } else if (selectedVal === '3.3V') {
        roundRect(ctx, jx + 6, jy + 0.5, 9, 5, 1);
        ctx.fill(); ctx.stroke();
      }
    }

    drawJumperBlock(96, 18, topV);
    drawJumperBlock(96, 72, botV);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 5.5px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MB-102', 124, 42);
    ctx.fillText('POWER MODULE', 124, 49);

    ctx.font = 'bold 4.5px "JetBrains Mono", sans-serif';
    ctx.fillText('ON/OFF', 53, 49);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = 'bold 4px "JetBrains Mono", monospace';
    ctx.fillText('5V  OFF 3V3', 105, 14);
    ctx.fillText('5V  OFF 3V3', 105, 85);

    const railPins = [
      { label: '+', color: '#e53935', x: 148, y: 12 },
      { label: '-', color: '#1e88e5', x: 148, y: 22 },
      { label: '+', color: '#e53935', x: 148, y: 74 },
      { label: '-', color: '#1e88e5', x: 148, y: 84 },
    ];

    railPins.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(p.label, p.x - 7, p.y + 3);

      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ffd066';
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = '#1c1c1c';
    roundRect(ctx, 92, 38, 16, 24, 1.5);
    ctx.fill();

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = '#ffd066';
        ctx.beginPath();
        ctx.arc(96 + c * 8, 42 + r * 5.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 160, 96);
    ctx.restore();
  }
});

/* -------------- Dual-Rail Benchtop DC Power Supply (5V/5A Fixed + ±0–32V/0–5A Split-Rail) ------------------ */
defComp({

  id: 'bench_power_supply',
  name: 'Benchtop Power Supply',
  category: 'Power',
  icon: '🎛️',
  desc: 'Dual-rail bench supply: fixed 5V/5A output plus adjustable split ±0–32V / 0–5A rails for op-amp circuits — POS=+V, NEG=−V, GND=0V center-tap',
  width: 310,
  height: 210,
  defaultProps: {
    powered: 1,
    outputEnabled: 1,
    voltageSet: 12.0,
    currentLimit: 2.5,
    actualCurrentPos: 0.0,
    actualCurrentNeg: 0.0,
    mode: 'CV',
    actualCurrent5V: 0.0,
  },
  interactive: [
    { field: 'powered', label: 'Power', type: 'toggle', min: 0, max: 1, step: 1, unit: '', inline: { x: 78, y: 148, w: 32, h: 42 } },
    { field: 'outputEnabled', label: 'Output', type: 'toggle', min: 0, max: 1, step: 1, unit: '', inline: { x: 26, y: 148, w: 32, h: 42 } },
    { field: 'voltageSet', label: 'Voltage (\u00b1)', min: 0.0, max: 32.0, step: 0.1, unit: 'V' },
    { field: 'currentLimit', label: 'Current (per rail)', min: 0.0, max: 5.0, step: 0.05, unit: 'A' },
  ],
  pins: [
    { id: 'VCC_5V', label: '5V', type: PIN_TYPE.POWER, x: 160, y: 182, side: 'bottom' },
    { id: 'GND_5V', label: '5V GND', type: PIN_TYPE.GND, x: 183, y: 182, side: 'bottom' },
    { id: 'POS', label: '+V', type: PIN_TYPE.POWER, x: 205, y: 182, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 232, y: 182, side: 'bottom' },
    { id: 'NEG', label: '\u2212V', type: PIN_TYPE.POWER, x: 259, y: 182, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const isPowered = Boolean(inst.runtimeState?.powered ?? inst.props.powered ?? 1);
    const isOutOn = isPowered && Boolean(inst.runtimeState?.outputEnabled ?? inst.props.outputEnabled ?? 1);
    const vSet = Number(inst.runtimeState?.voltageSet ?? inst.props.voltageSet ?? 12.0);
    const iLim = Number(inst.runtimeState?.currentLimit ?? inst.props.currentLimit ?? 2.5);
    const iPos = isOutOn ? Number(inst.runtimeState?.actualCurrentPos ?? inst.props.actualCurrentPos ?? 0.0) : 0.0;
    const iNeg = isOutOn ? Number(inst.runtimeState?.actualCurrentNeg ?? inst.props.actualCurrentNeg ?? 0.0) : 0.0;
    const iAct5V = isPowered ? Number(inst.runtimeState?.actualCurrent5V ?? inst.props.actualCurrent5V ?? 0.0) : 0.0;
    const mode = inst.runtimeState?.mode ?? inst.props.mode ?? 'CV';
    const pOut = isOutOn ? vSet * (iPos + iNeg) : 0.0;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#1c2024';
    roundRect(ctx, 0, 0, 310, 210, 8);
    ctx.fill();

    const panelGrad = ctx.createLinearGradient(0, 4, 0, 206);
    panelGrad.addColorStop(0, '#32383e');
    panelGrad.addColorStop(0.3, '#262b30');
    panelGrad.addColorStop(1, '#1e2226');
    ctx.fillStyle = panelGrad;
    roundRect(ctx, 4, 4, 302, 202, 6);
    ctx.fill();

    ctx.fillStyle = '#0f1214';
    roundRect(ctx, 8, 2, 26, 4, 1); ctx.fill();
    roundRect(ctx, 276, 2, 26, 4, 1); ctx.fill();
    roundRect(ctx, 8, 204, 26, 4, 1); ctx.fill();
    roundRect(ctx, 276, 204, 26, 4, 1); ctx.fill();

    ctx.fillStyle = '#eceff1';
    ctx.font = 'bold 9px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DC POWER SUPPLY', 14, 18);

    ctx.fillStyle = '#78909c';
    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    ctx.fillText('DPS-SPLIT PRO \u00b7 5V/5A + \u00b132V/5A', 14, 28);

    ctx.fillStyle = '#121518';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(230 + i * 16, 14, 11, 2.5);
    }

    ctx.fillStyle = '#0a0d0f';
    roundRect(ctx, 12, 34, 160, 112, 4);
    ctx.fill();
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (isPowered) {
      ctx.textAlign = 'right';

      ctx.fillStyle = 'rgba(0, 229, 255, 0.06)';
      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      ctx.fillText('+88.8', 115, 56);
      ctx.fillStyle = 'rgba(255, 80, 80, 0.06)';
      ctx.fillText('\u221288.8', 115, 78);
      ctx.fillStyle = 'rgba(0, 230, 118, 0.06)';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText('8.888', 98, 98);
      ctx.fillStyle = 'rgba(255, 171, 0, 0.06)';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillText('888.8', 115, 118);
      ctx.fillStyle = 'rgba(255, 171, 0, 0.06)';
      ctx.fillText('888.8', 115, 138);

      ctx.fillStyle = isOutOn ? '#00e5ff' : '#0097a7';
      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      ctx.fillText('+' + vSet.toFixed(1), 115, 56);

      ctx.fillStyle = isOutOn ? '#ff5252' : '#7f1d1d';
      ctx.fillText('\u2212' + vSet.toFixed(1), 115, 78);

      ctx.fillStyle = isOutOn ? '#00e676' : '#2e7d32';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText('+' + iPos.toFixed(2) + '/' + '\u2212' + iNeg.toFixed(2), 115, 98);

      ctx.fillStyle = isOutOn ? '#ffab00' : '#c67c00';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillText(pOut.toFixed(1).padStart(5, '0'), 115, 118);

      ctx.fillStyle = '#78909c';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText('5V:', 36, 136);
      ctx.fillStyle = isPowered ? '#ff9100' : '#5d4037';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText(iAct5V.toFixed(2) + 'A', 58, 136);

      ctx.font = 'bold 11px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#00e5ff'; ctx.fillText('V+', 122, 54);
      ctx.fillStyle = '#ff5252'; ctx.fillText('V\u2212', 122, 76);
      ctx.fillStyle = '#00e676'; ctx.fillText('A', 122, 96);
      ctx.font = 'bold 9px "JetBrains Mono", sans-serif';
      ctx.fillStyle = '#ffab00'; ctx.fillText('W', 122, 117);

      const isCV = mode === 'CV' && isOutOn;
      ctx.fillStyle = isCV ? '#00e676' : '#1b3a24';
      ctx.beginPath(); ctx.arc(148, 44, 3, 0, Math.PI * 2); ctx.fill();
      if (isCV) { ctx.fillStyle = 'rgba(0, 230, 118, 0.4)'; ctx.beginPath(); ctx.arc(148, 44, 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.font = 'bold 6.5px "JetBrains Mono", sans-serif';
      ctx.fillStyle = isCV ? '#ffffff' : '#546e7a';
      ctx.fillText('CV', 154, 46);

      const isCC = mode === 'CC' && isOutOn;
      ctx.fillStyle = isCC ? '#ff1744' : '#3a141a';
      ctx.beginPath(); ctx.arc(148, 58, 3, 0, Math.PI * 2); ctx.fill();
      if (isCC) { ctx.fillStyle = 'rgba(255, 23, 68, 0.4)'; ctx.beginPath(); ctx.arc(148, 58, 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = isCC ? '#ffffff' : '#546e7a';
      ctx.fillText('CC', 154, 60);

      ctx.fillStyle = isOutOn ? '#29b6f6' : '#132836';
      ctx.beginPath(); ctx.arc(148, 72, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isOutOn ? '#ffffff' : '#546e7a';
      ctx.fillText('ON', 154, 74);
    } else {
      ctx.fillStyle = '#1a2327';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('\u2014 STANDBY \u2014', 92, 90);
    }

    function drawRotaryKnob(kx, ky, label, valueText, accentColor) {
      ctx.fillStyle = '#181b1e';
      ctx.beginPath(); ctx.arc(kx, ky, 19, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 1;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        ctx.beginPath();
        ctx.moveTo(kx + Math.cos(a) * 16, ky + Math.sin(a) * 16);
        ctx.lineTo(kx + Math.cos(a) * 19, ky + Math.sin(a) * 19);
        ctx.stroke();
      }

      const knobGrad = ctx.createRadialGradient(kx - 4, ky - 4, 1, kx, ky, 15);
      knobGrad.addColorStop(0, '#cfd8dc');
      knobGrad.addColorStop(0.5, '#90a4ae');
      knobGrad.addColorStop(1, '#455a64');
      ctx.fillStyle = knobGrad;
      ctx.beginPath(); ctx.arc(kx, ky, 15, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = accentColor;
      ctx.beginPath(); ctx.arc(kx + 9, ky - 6, 2, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#b0bec5';
      ctx.font = 'bold 7.5px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, kx, ky + 28);

      ctx.fillStyle = accentColor;
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillText(valueText, kx, ky - 23);
    }

    drawRotaryKnob(240, 56, 'VOLTAGE', '\u00b1' + vSet.toFixed(1) + 'V', '#00e5ff');
    drawRotaryKnob(240, 116, 'CURRENT', iLim.toFixed(2) + 'A', '#00e676');

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
      ctx.font = 'bold 5.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, tx + tw / 2, ty + th - 3);
    }

    drawToggleSwitch(78, 148, 32, 42, isPowered, 'POWER');
    drawToggleSwitch(26, 148, 32, 42, isOutOn, 'OUTPUT');

    function drawBindingPost(bx, by, colorHex, rimColor, symbol, label) {
      ctx.fillStyle = '#14181b';
      ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2); ctx.fill();

      const postGrad = ctx.createRadialGradient(bx - 3, by - 3, 2, bx, by, 9);
      postGrad.addColorStop(0, rimColor);
      postGrad.addColorStop(0.7, colorHex);
      postGrad.addColorStop(1, '#0d1012');
      ctx.fillStyle = postGrad;
      ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#08080a';
      ctx.beginPath(); ctx.arc(bx, by, 2.8, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#eceff1';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(symbol, bx, by + 3);

      ctx.fillStyle = '#78909c';
      ctx.font = 'bold 6px "JetBrains Mono", sans-serif';
      ctx.fillText(label, bx, by - 15);
    }

    ctx.fillStyle = '#546e7a';
    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FIXED 5V/5A', 171, 147);
    ctx.fillText('SPLIT RAIL \u00b132V/5A', 232, 147);

    drawBindingPost(160, 166, '#ff6d00', '#ffab40', '5V', '5V');
    drawBindingPost(183, 166, '#2e7d32', '#66bb6a', '\u2300', '5VGND');
    drawBindingPost(205, 166, '#d50000', '#ff5252', '+', '+V');
    drawBindingPost(232, 166, '#2e7d32', '#00e676', '\u2300', 'GND');
    drawBindingPost(259, 166, '#1565c0', '#42a5f5', '\u2212', '\u2212V');

    if (inst.selected) drawSelectionRect(ctx, -2, -2, 314, 214);
    ctx.restore();
  }
});

// defComp({
//   id: 'bench_power_supply',
//   name: 'Benchtop Power Supply',
//   category: 'Power',
//   icon: '🎛️',
//   desc: 'Dual-rail bench supply: fixed 5V/5A output plus adjustable split ±0–32V / 0–5A rails for op-amp circuits — POS=+V, NEG=−V, GND=0V center-tap',
//   width: 310,
//   height: 210,
//   defaultProps: {
//     powered: 1,
//     outputEnabled: 1,
//     voltageSet: 12.0,
//     currentLimit: 2.5,
//     actualCurrentPos: 0.0,
//     actualCurrentNeg: 0.0,
//     mode: 'CV',
//     actualCurrent5V: 0.0,
//   },
//   interactive: [
//     { field: 'powered',       label: 'Power',           type: 'toggle', min: 0.0, max: 1.0,  step: 1,    unit: '',  inline: { x: 78,  y: 148, w: 32, h: 42 } },
//     { field: 'outputEnabled', label: 'Output',          type: 'toggle', min: 0.0, max: 1.0,  step: 1,    unit: '',  inline: { x: 26,  y: 148, w: 32, h: 42 } },
//     { field: 'voltageSet',    label: 'Voltage (\u00b1)', type: 'knob',   min: 0.0, max: 32.0, step: 0.1,  unit: 'V', inline: { x: 220, y: 36,  w: 40, h: 40 } },
//     { field: 'currentLimit',  label: 'Current (rail)',  type: 'knob',   min: 0.0, max: 5.0,  step: 0.05, unit: 'A', inline: { x: 220, y: 96,  w: 40, h: 40 } },
//   ],
//   pins: [
//     { id: 'VCC_5V',  label: '5V',     type: PIN_TYPE.POWER, x: 155, y: 166, side: 'bottom' },
//     { id: 'GND_5V',  label: '5V GND', type: PIN_TYPE.GND,   x: 182, y: 166, side: 'bottom' },
//     { id: 'POS',     label: '+V',     type: PIN_TYPE.POWER, x: 209, y: 166, side: 'bottom' },
//     { id: 'GND',     label: 'GND',    type: PIN_TYPE.GND,   x: 236, y: 166, side: 'bottom' },
//     { id: 'NEG',     label: '\u2212V',type: PIN_TYPE.POWER, x: 263, y: 166, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const isPowered = Boolean(inst.runtimeState?.powered ?? inst.props.powered ?? 1);
//     const isOutOn = isPowered && Boolean(inst.runtimeState?.outputEnabled ?? inst.props.outputEnabled ?? 1);
//     const vSet = Number(inst.runtimeState?.voltageSet ?? inst.props.voltageSet ?? 12.0);
//     const iLim = Number(inst.runtimeState?.currentLimit ?? inst.props.currentLimit ?? 2.5);
//     const iPos = isOutOn ? Number(inst.runtimeState?.actualCurrentPos ?? inst.props.actualCurrentPos ?? 0.0) : 0.0;
//     const iNeg = isOutOn ? Number(inst.runtimeState?.actualCurrentNeg ?? inst.props.actualCurrentNeg ?? 0.0) : 0.0;
//     const iAct5V = isPowered ? Number(inst.runtimeState?.actualCurrent5V ?? inst.props.actualCurrent5V ?? 0.0) : 0.0;
//     const mode = inst.runtimeState?.mode ?? inst.props.mode ?? 'CV';
//     const pOut = isOutOn ? vSet * (iPos + iNeg) : 0.0;

//     ctx.save();
//     ctx.translate(x, y);

//     // Main Chassis
//     ctx.fillStyle = '#1c2024';
//     roundRect(ctx, 0, 0, 310, 210, 8);
//     ctx.fill();

//     const panelGrad = ctx.createLinearGradient(0, 4, 0, 206);
//     panelGrad.addColorStop(0, '#32383e');
//     panelGrad.addColorStop(0.3, '#262b30');
//     panelGrad.addColorStop(1, '#1e2226');
//     ctx.fillStyle = panelGrad;
//     roundRect(ctx, 4, 4, 302, 202, 6);
//     ctx.fill();

//     // Corner Accents / Screws
//     ctx.fillStyle = '#0f1214';
//     roundRect(ctx, 8, 2, 26, 4, 1); ctx.fill();
//     roundRect(ctx, 276, 2, 26, 4, 1); ctx.fill();
//     roundRect(ctx, 8, 204, 26, 4, 1); ctx.fill();
//     roundRect(ctx, 276, 204, 26, 4, 1); ctx.fill();

//     // Branding Header
//     ctx.fillStyle = '#eceff1';
//     ctx.font = 'bold 9px "JetBrains Mono", sans-serif';
//     ctx.textAlign = 'left';
//     ctx.fillText('DC POWER SUPPLY', 14, 18);

//     ctx.fillStyle = '#78909c';
//     ctx.font = 'bold 7px "JetBrains Mono", monospace';
//     ctx.fillText('DPS-SPLIT PRO \u00b7 5V/5A + \u00b132V/5A', 14, 28);

//     // Heat Vents Graphics
//     ctx.fillStyle = '#121518';
//     for (let i = 0; i < 4; i++) {
//       ctx.fillRect(230 + i * 16, 14, 11, 2.5);
//     }

//     // LCD Display Frame
//     ctx.fillStyle = '#0a0d0f';
//     roundRect(ctx, 12, 34, 160, 112, 4);
//     ctx.fill();
//     ctx.strokeStyle = '#455a64';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     if (isPowered) {
//       ctx.textAlign = 'right';

//       // Unlit 7-Segment Background LCD Shadows
//       ctx.fillStyle = 'rgba(0, 229, 255, 0.05)';
//       ctx.font = 'bold 20px "JetBrains Mono", monospace';
//       ctx.fillText('+88.8', 115, 56);
//       ctx.fillStyle = 'rgba(255, 80, 80, 0.05)';
//       ctx.fillText('\u221288.8', 115, 78);
//       ctx.fillStyle = 'rgba(0, 230, 118, 0.05)';
//       ctx.font = 'bold 12px "JetBrains Mono", monospace';
//       ctx.fillText('8.88A / 8.88A', 115, 98);
//       ctx.fillStyle = 'rgba(255, 171, 0, 0.05)';
//       ctx.font = 'bold 14px "JetBrains Mono", monospace';
//       ctx.fillText('888.8', 115, 118);

//       // Active LCD Readouts
//       ctx.fillStyle = isOutOn ? '#00e5ff' : '#007788';
//       ctx.font = 'bold 20px "JetBrains Mono", monospace';
//       ctx.fillText('+' + vSet.toFixed(1), 115, 56);

//       ctx.fillStyle = isOutOn ? '#ff5252' : '#882222';
//       ctx.fillText('\u2212' + vSet.toFixed(1), 115, 78);

//       ctx.fillStyle = isOutOn ? '#00e676' : '#1b5e20';
//       ctx.font = 'bold 12px "JetBrains Mono", monospace';
//       ctx.fillText(iPos.toFixed(2) + 'A / ' + iNeg.toFixed(2) + 'A', 115, 98);

//       ctx.fillStyle = isOutOn ? '#ffab00' : '#8c6d00';
//       ctx.font = 'bold 14px "JetBrains Mono", monospace';
//       ctx.fillText(pOut.toFixed(1).padStart(5, '0'), 115, 118);

//       // 5V Fixed Rail Indicator
//       ctx.fillStyle = '#78909c';
//       ctx.font = 'bold 9px "JetBrains Mono", monospace';
//       ctx.fillText('5V:', 36, 136);
//       ctx.fillStyle = isPowered ? '#ff9100' : '#5d4037';
//       ctx.font = 'bold 11px "JetBrains Mono", monospace';
//       ctx.fillText(iAct5V.toFixed(2) + 'A', 80, 136);

//       // LCD Unit Labels
//       ctx.font = 'bold 11px "JetBrains Mono", sans-serif';
//       ctx.textAlign = 'left';
//       ctx.fillStyle = '#00e5ff'; ctx.fillText('V+', 122, 54);
//       ctx.fillStyle = '#ff5252'; ctx.fillText('V\u2212', 122, 76);
//       ctx.fillStyle = '#00e676'; ctx.fillText('A', 122, 96);
//       ctx.font = 'bold 9px "JetBrains Mono", sans-serif';
//       ctx.fillStyle = '#ffab00'; ctx.fillText('W', 122, 117);

//       // Status Indicators (CV / CC / ON)
//       const isCV = mode === 'CV' && isOutOn;
//       ctx.fillStyle = isCV ? '#00e676' : '#1b3a24';
//       ctx.beginPath(); ctx.arc(148, 44, 3, 0, Math.PI * 2); ctx.fill();
//       if (isCV) { ctx.fillStyle = 'rgba(0, 230, 118, 0.4)'; ctx.beginPath(); ctx.arc(148, 44, 6, 0, Math.PI * 2); ctx.fill(); }
//       ctx.font = 'bold 6.5px "JetBrains Mono", sans-serif';
//       ctx.fillStyle = isCV ? '#ffffff' : '#546e7a';
//       ctx.fillText('CV', 154, 46);

//       const isCC = mode === 'CC' && isOutOn;
//       ctx.fillStyle = isCC ? '#ff1744' : '#3a141a';
//       ctx.beginPath(); ctx.arc(148, 58, 3, 0, Math.PI * 2); ctx.fill();
//       if (isCC) { ctx.fillStyle = 'rgba(255, 23, 68, 0.4)'; ctx.beginPath(); ctx.arc(148, 58, 6, 0, Math.PI * 2); ctx.fill(); }
//       ctx.fillStyle = isCC ? '#ffffff' : '#546e7a';
//       ctx.fillText('CC', 154, 60);

//       ctx.fillStyle = isOutOn ? '#29b6f6' : '#132836';
//       ctx.beginPath(); ctx.arc(148, 72, 3, 0, Math.PI * 2); ctx.fill();
//       ctx.fillStyle = isOutOn ? '#ffffff' : '#546e7a';
//       ctx.fillText('ON', 154, 74);
//     } else {
//       ctx.fillStyle = '#1a2327';
//       ctx.font = 'bold 11px "JetBrains Mono", monospace';
//       ctx.textAlign = 'center';
//       ctx.fillText('\u2014 STANDBY \u2014', 92, 90);
//     }

//     // Dynamic Rotary Knob Rendering
//     function drawRotaryKnob(kx, ky, label, valueText, valRatio, accentColor) {
//       ctx.fillStyle = '#181b1e';
//       ctx.beginPath(); ctx.arc(kx, ky, 19, 0, Math.PI * 2); ctx.fill();

//       ctx.strokeStyle = '#37474f';
//       ctx.lineWidth = 1;
//       for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
//         ctx.beginPath();
//         ctx.moveTo(kx + Math.cos(a) * 16, ky + Math.sin(a) * 16);
//         ctx.lineTo(kx + Math.cos(a) * 19, ky + Math.sin(a) * 19);
//         ctx.stroke();
//       }

//       const knobGrad = ctx.createRadialGradient(kx - 4, ky - 4, 1, kx, ky, 15);
//       knobGrad.addColorStop(0, '#cfd8dc');
//       knobGrad.addColorStop(0.5, '#90a4ae');
//       knobGrad.addColorStop(1, '#455a64');
//       ctx.fillStyle = knobGrad;
//       ctx.beginPath(); ctx.arc(kx, ky, 15, 0, Math.PI * 2); ctx.fill();

//       // Dynamic Indicator Dot based on setting ratio (270 deg sweep)
//       const angle = -Math.PI * 0.75 + (valRatio * Math.PI * 1.5);
//       const dotX = kx + Math.cos(angle) * 10;
//       const dotY = ky + Math.sin(angle) * 10;

//       ctx.fillStyle = accentColor;
//       ctx.beginPath(); ctx.arc(dotX, dotY, 2, 0, Math.PI * 2); ctx.fill();

//       ctx.fillStyle = '#b0bec5';
//       ctx.font = 'bold 7.5px "JetBrains Mono", sans-serif';
//       ctx.textAlign = 'center';
//       ctx.fillText(label, kx, ky + 28);

//       ctx.fillStyle = accentColor;
//       ctx.font = 'bold 7px "JetBrains Mono", monospace';
//       ctx.fillText(valueText, kx, ky - 23);
//     }

//     drawRotaryKnob(240, 56, 'VOLTAGE', '\u00b1' + vSet.toFixed(1) + 'V', vSet / 32.0, '#00e5ff');
//     drawRotaryKnob(240, 116, 'CURRENT', iLim.toFixed(2) + 'A', iLim / 5.0, '#00e676');

//     // Toggle Switch Component
//     function drawToggleSwitch(tx, ty, tw, th, isOn, label) {
//       ctx.fillStyle = '#0e1114';
//       roundRect(ctx, tx, ty, tw, th, 3);
//       ctx.fill();
//       ctx.strokeStyle = 'rgba(80,90,100,0.4)';
//       ctx.lineWidth = 0.8;
//       ctx.stroke();

//       const trackW = tw * 0.7;
//       const trackH = 8;
//       const trackX = tx + (tw - trackW) / 2;
//       const trackY = ty + th / 2 - 2;
//       ctx.fillStyle = '#080a0c';
//       roundRect(ctx, trackX, trackY, trackW, trackH, trackH / 2);
//       ctx.fill();

//       if (isOn) {
//         const grad = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0);
//         grad.addColorStop(0, 'rgba(0,230,118,0.2)');
//         grad.addColorStop(1, 'rgba(0,230,118,0.65)');
//         ctx.fillStyle = grad;
//         roundRect(ctx, trackX, trackY, trackW, trackH, trackH / 2);
//         ctx.fill();
//       }

//       const thumbR = 5;
//       const thumbX = isOn ? trackX + trackW - thumbR - 1 : trackX + thumbR + 1;
//       const thumbY = trackY + trackH / 2;
//       if (Number.isFinite(thumbX) && Number.isFinite(thumbY)) {
//         const thumbGrad = ctx.createRadialGradient(thumbX - 1, thumbY - 1, 0.5, thumbX, thumbY, thumbR);
//         thumbGrad.addColorStop(0, isOn ? '#c8e6c9' : '#b0bec5');
//         thumbGrad.addColorStop(1, isOn ? '#2e7d32' : '#546e7a');
//         ctx.fillStyle = thumbGrad;
//         ctx.beginPath();
//         ctx.arc(thumbX, thumbY, thumbR, 0, Math.PI * 2);
//         ctx.fill();
//         ctx.strokeStyle = 'rgba(255,255,255,0.5)';
//         ctx.lineWidth = 0.6;
//         ctx.stroke();
//       }

//       const ledX = tx + tw / 2;
//       const ledY = ty + 5;
//       ctx.fillStyle = isOn ? '#00e676' : '#1b3a24';
//       ctx.beginPath(); ctx.arc(ledX, ledY, 2, 0, Math.PI * 2); ctx.fill();
//       if (isOn) {
//         ctx.fillStyle = 'rgba(0,230,118,0.3)';
//         ctx.beginPath(); ctx.arc(ledX, ledY, 4.5, 0, Math.PI * 2); ctx.fill();
//       }

//       ctx.fillStyle = isOn ? '#eceff1' : '#78909c';
//       ctx.font = 'bold 5.5px "JetBrains Mono", monospace';
//       ctx.textAlign = 'center';
//       ctx.fillText(label, tx + tw / 2, ty + th - 3);
//     }

//     drawToggleSwitch(78, 148, 32, 42, isPowered, 'POWER');
//     drawToggleSwitch(26, 148, 32, 42, isOutOn, 'OUTPUT');

//     // Binding Posts
//     function drawBindingPost(bx, by, colorHex, rimColor, symbol, label) {
//       ctx.fillStyle = '#14181b';
//       ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2); ctx.fill();

//       const postGrad = ctx.createRadialGradient(bx - 3, by - 3, 2, bx, by, 9);
//       postGrad.addColorStop(0, rimColor);
//       postGrad.addColorStop(0.7, colorHex);
//       postGrad.addColorStop(1, '#0d1012');
//       ctx.fillStyle = postGrad;
//       ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();

//       ctx.fillStyle = '#d4af37';
//       ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, Math.PI * 2); ctx.fill();

//       ctx.fillStyle = '#08080a';
//       ctx.beginPath(); ctx.arc(bx, by, 2.8, 0, Math.PI * 2); ctx.fill();

//       ctx.fillStyle = '#eceff1';
//       ctx.font = 'bold 9px "JetBrains Mono", monospace';
//       ctx.textAlign = 'center';
//       ctx.fillText(symbol, bx, by + 3);

//       ctx.fillStyle = '#78909c';
//       ctx.font = 'bold 6px "JetBrains Mono", sans-serif';
//       ctx.fillText(label, bx, by - 15);
//     }

//     ctx.fillStyle = '#546e7a';
//     ctx.font = 'bold 7px "JetBrains Mono", monospace';
//     ctx.textAlign = 'center';
//     ctx.fillText('FIXED 5V', 168, 145);
//     ctx.fillText('SPLIT RAIL \u00b132V', 236, 145);

//     drawBindingPost(155, 166, '#ff6d00', '#ffab40', '5V', '5V');
//     drawBindingPost(182, 166, '#2e7d32', '#66bb6a', '\u2300', '5VGND');
//     drawBindingPost(209, 166, '#d50000', '#ff5252', '+', '+V');
//     drawBindingPost(236, 166, '#2e7d32', '#00e676', '\u2300', 'GND');
//     drawBindingPost(263, 166, '#1565c0', '#42a5f5', '\u2212', '\u2212V');

//     if (inst.selected && typeof drawSelectionRect === 'function') {
//       drawSelectionRect(ctx, -2, -2, 314, 214);
//     }
//     ctx.restore();
//   }
// });