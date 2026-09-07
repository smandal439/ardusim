/*
 * components/passive.js — Passive component definitions
 */

'use strict';
/* -------------------- RESISTOR -------------------------- */
defComp({
  id: 'resistor',
  name: 'Resistor',
  category: 'Passive',
  icon: '⬛',
  desc: 'Fixed value resistor with color band marking',
  width: 20,
  height: 60,
  defaultProps: { value: 220, unit: 'Ω' },
  interactive: [
    {
      field: 'unit', label: 'Unit', type: 'select', options: [
        { value: 'Ω', label: 'Ω (Ohm)' },
        { value: 'kΩ', label: 'kΩ (kiloohm)' },
        { value: 'MΩ', label: 'MΩ (megaohm)' },
      ]
    },
  ],
  pins: [
    { id: 'p1', label: '1', type: PIN_TYPE.SIGNAL, x: 10, y: 0, side: 'top' },
    { id: 'p2', label: '2', type: PIN_TYPE.SIGNAL, x: 10, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const val = inst.props.value || 220;
    const bands = resistorBands(val);

    ctx.save();
    ctx.translate(x, y);

    // Lead wires
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(10, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 44); ctx.lineTo(10, 60); ctx.stroke();

    // Body
    ctx.fillStyle = '#d4c4a0';
    roundRect(ctx, 2, 16, 16, 28, 3);
    ctx.fill();
    ctx.strokeStyle = '#b0a080';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Color bands
    const bandX = [5, 9, 13, 17];
    const bandColors = [...bands, '#c0a040'];
    bandColors.forEach((col, i) => {
      if (i >= 4) return;
      ctx.fillStyle = col;
      ctx.fillRect(bandX[i], 16, 3, 28);
    });

    // Tolerance band (last)
    ctx.fillStyle = '#c0a040';
    ctx.fillRect(17, 20, 3, 20);

    // Value label
    ctx.fillStyle = '#555';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(10, 30);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 6px sans-serif';
    ctx.fillText(formatResistance(val, inst.props.unit), 0, 2);
    ctx.restore();

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 26, 66);
    ctx.restore();
  }
});

/*----------------------Capacitor ----------------------------- */
defComp({
  id: 'capacitor',
  name: 'Capacitor',
  category: 'Passive',
  icon: '⚡',
  desc: 'Electrolytic capacitor — stores electrical charge between two plates',
  width: 20,
  height: 60,
  defaultProps: { value: 100, unit: 'µF' },
  interactive: [
    {
      field: 'unit', label: 'Unit', type: 'select', options: [
        { value: 'mF', label: 'mF (millifarad)' },
        { value: 'µF', label: 'µF (microfarad)' },
        { value: 'nF', label: 'nF (nanofarad)' },
        { value: 'pF', label: 'pF (picofarad)' },
      ]
    },
  ],
  pins: [
    { id: 'pos', label: '+', type: PIN_TYPE.SIGNAL, x: 10, y: 0, side: 'top' },
    { id: 'neg', label: 'âˆ’', type: PIN_TYPE.GND, x: 10, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);
    // Leads
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(10, 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 38); ctx.lineTo(10, 60); ctx.stroke();
    // Plates
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(2, 22); ctx.lineTo(18, 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, 30); ctx.lineTo(18, 30); ctx.stroke();
    // + mark
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('+', 4, 22);
    // Body curve
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(10, 30, 8, 0, Math.PI);
    ctx.stroke();
    // Value
    ctx.fillStyle = '#888'; ctx.font = '6px sans-serif';
    ctx.save(); ctx.translate(10, 34); ctx.rotate(-Math.PI / 2);
    ctx.fillText((inst.props.value || 100) + (inst.props.unit || 'µF'), 0, 2);
    ctx.restore();
    if (inst.selected) drawSelectionRect(ctx, -3, -3, 26, 66);
    ctx.restore();
  }
});

/* -------- BREADBOARD (Realistic Half-Size / 400 Tie-Points) ----------- */
function _genBreadboardPins() {
  const W = 580, cols = 30, startX = 42, stepX = (W - 84) / (cols - 1);
  const upperTopY = 55, upperBotY = 107;
  const lowerTopY = 123, lowerBotY = 175;
  const pins = [];

  for (let c = 0; c < cols; c++) {
    const hx = Math.round(startX + c * stepX);
    const n = c + 1;
    // Upper half: top pin (row a) and bottom pin (row e) — same electrical node
    pins.push({ id: `ut${n}`, label: `${n}a`, type: PIN_TYPE.SIGNAL, x: hx, y: upperTopY, side: 'top' });
    pins.push({ id: `ub${n}`, label: `${n}e`, type: PIN_TYPE.SIGNAL, x: hx, y: upperBotY, side: 'top' });
    // Lower half: top pin (row f) and bottom pin (row j) — same electrical node
    pins.push({ id: `lt${n}`, label: `${n}f`, type: PIN_TYPE.SIGNAL, x: hx, y: lowerTopY, side: 'bottom' });
    pins.push({ id: `lb${n}`, label: `${n}j`, type: PIN_TYPE.SIGNAL, x: hx, y: lowerBotY, side: 'bottom' });
  }

  // Power rails (each rail represents a continuous electrical node)
  pins.push({ id: 'rp', label: '+', type: PIN_TYPE.POWER, x: 30, y: 19, side: 'top' });
  pins.push({ id: 'rn', label: '-', type: PIN_TYPE.GND, x: 30, y: 31, side: 'top' });
  pins.push({ id: 'bp', label: '+', type: PIN_TYPE.POWER, x: 30, y: 189, side: 'bottom' });
  pins.push({ id: 'bn', label: '-', type: PIN_TYPE.GND, x: 30, y: 201, side: 'bottom' });
  return pins;
}

function _breadboardGetGroup(pinId) {
  if (pinId === 'rp') return 'rail_tp';
  if (pinId === 'rn') return 'rail_tn';
  if (pinId === 'bp') return 'rail_bp';
  if (pinId === 'bn') return 'rail_bn';
  const m = pinId.match(/^([ul])([tb])(\d+)$/);
  if (m) return m[1] + m[3];
  return null;
}
window._breadboardGetGroup = _breadboardGetGroup;

/* ════════════════ Small Breadboard (16-column) ════════════════ */
function _genSmallBreadboardPins() {
  const W = 320, H = 170, cols = 16, startX = 36, stepX = (W - 72) / (cols - 1);
  const upperTopY = 45, upperBotY = 90;
  const lowerTopY = 102, lowerBotY = 147;
  const pins = [];

  for (let c = 0; c < cols; c++) {
    const hx = Math.round(startX + c * stepX);
    const n = c + 1;
    pins.push({ id: `ut${n}`, label: `${n}a`, type: PIN_TYPE.SIGNAL, x: hx, y: upperTopY, side: 'top' });
    pins.push({ id: `ub${n}`, label: `${n}e`, type: PIN_TYPE.SIGNAL, x: hx, y: upperBotY, side: 'top' });
    pins.push({ id: `lt${n}`, label: `${n}f`, type: PIN_TYPE.SIGNAL, x: hx, y: lowerTopY, side: 'bottom' });
    pins.push({ id: `lb${n}`, label: `${n}j`, type: PIN_TYPE.SIGNAL, x: hx, y: lowerBotY, side: 'bottom' });
  }

  pins.push({ id: 'rp', label: '+', type: PIN_TYPE.POWER, x: 24, y: 14, side: 'top' });
  pins.push({ id: 'rn', label: '-', type: PIN_TYPE.GND, x: 24, y: 24, side: 'top' });
  pins.push({ id: 'bp', label: '+', type: PIN_TYPE.POWER, x: 24, y: H - 24, side: 'bottom' });
  pins.push({ id: 'bn', label: '-', type: PIN_TYPE.GND, x: 24, y: H - 14, side: 'bottom' });
  return pins;
}

defComp({
  id: 'breadboard_small',
  name: 'Breadboard (Small)',
  category: 'Passive',
  icon: '🟦',
  desc: '170 tie-point mini breadboard — 16 columns × 2 halves (upper a–e, lower f–j) + 4 power rails. Ideal for DIP IC circuits',
  width: 320,
  height: 170,
  defaultProps: {},
  pins: _genSmallBreadboardPins(),
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const W = 320, H = 170;
    ctx.save();
    ctx.translate(x, y);

    // 1. Base Housing
    ctx.fillStyle = '#dfdbd0';
    roundRect(ctx, 0, 0, W, H, 6);
    ctx.fill();
    const bodyGrad = ctx.createLinearGradient(0, 0, 0, H);
    bodyGrad.addColorStop(0, '#fcfbfa');
    bodyGrad.addColorStop(0.5, '#f4f1ea');
    bodyGrad.addColorStop(1, '#ebe6dc');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 2, 2, W - 4, H - 4, 5);
    ctx.fill();
    ctx.strokeStyle = '#c4bfb2'; ctx.lineWidth = 1;
    roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 6); ctx.stroke();

    // Side tabs
    ctx.fillStyle = '#d4cfc2';
    roundRect(ctx, -2, H / 2 - 10, 3, 20, 2); ctx.fill();
    roundRect(ctx, W - 1, H / 2 - 10, 3, 20, 2); ctx.fill();

    // 2. Center DIP Trough
    const midY = H / 2;
    const grooveH = 10;
    const grooveGrad = ctx.createLinearGradient(0, midY - grooveH / 2, 0, midY + grooveH / 2);
    grooveGrad.addColorStop(0, '#b8b4a6');
    grooveGrad.addColorStop(0.25, '#d3cfc3');
    grooveGrad.addColorStop(0.75, '#e8e5dc');
    grooveGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grooveGrad;
    ctx.fillRect(12, midY - grooveH / 2, W - 24, grooveH);

    // 3. Power Rail Stripes
    const railX1 = 28, railX2 = W - 28;
    ctx.strokeStyle = '#e53935'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(railX1, 10); ctx.lineTo(railX2, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(railX1, H - 10); ctx.lineTo(railX2, H - 10); ctx.stroke();
    ctx.strokeStyle = '#1e88e5';
    ctx.beginPath(); ctx.moveTo(railX1, 28); ctx.lineTo(railX2, 28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(railX1, H - 28); ctx.lineTo(railX2, H - 28); ctx.stroke();

    // Polarity glyphs
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e53935';
    ctx.fillText('+', 18, 10); ctx.fillText('+', W - 18, 10);
    ctx.fillText('+', 18, H - 10); ctx.fillText('+', W - 18, H - 10);
    ctx.fillStyle = '#1e88e5';
    ctx.fillText('−', 18, 28); ctx.fillText('−', W - 18, 28);
    ctx.fillText('−', 18, H - 28); ctx.fillText('−', W - 18, H - 28);

    // 4. Tie-Hole Renderer
    function drawTieHole(hx, hy) {
      ctx.fillStyle = '#dcd7cc';
      ctx.fillRect(hx - 3, hy - 3, 6, 6);
      ctx.fillStyle = '#181715';
      ctx.fillRect(hx - 2, hy - 2, 4, 4);
      ctx.fillStyle = '#52504a';
      ctx.fillRect(hx - 1, hy - 0.8, 2, 1.6);
    }

    // 5. 16-Column Grid
    const cols = 16, startX = 36, stepX = (W - 72) / (cols - 1);
    const upperRowsY = [45, 56, 67, 78, 90];
    const lowerRowsY = [102, 113, 124, 135, 147];
    const rowLabelsUpper = ['a', 'b', 'c', 'd', 'e'];
    const rowLabelsLower = ['f', 'g', 'h', 'i', 'j'];

    ctx.fillStyle = '#7a766c';
    ctx.font = 'bold 8px "JetBrains Mono", sans-serif';
    for (let r = 0; r < 5; r++) {
      ctx.fillText(rowLabelsUpper[r], 18, upperRowsY[r]);
      ctx.fillText(rowLabelsUpper[r], W - 18, upperRowsY[r]);
      ctx.fillText(rowLabelsLower[r], 18, lowerRowsY[r]);
      ctx.fillText(rowLabelsLower[r], W - 18, lowerRowsY[r]);
    }

    for (let col = 0; col < cols; col++) {
      const hx = startX + col * stepX;
      const colNum = col + 1;
      if (colNum === 1 || colNum % 5 === 0 || colNum === cols) {
        ctx.fillStyle = '#666157';
        ctx.font = 'bold 7.5px "JetBrains Mono", sans-serif';
        ctx.fillText(colNum.toString(), hx, 36);
        ctx.fillText(colNum.toString(), hx, H - 36);
      }
      for (let r = 0; r < 5; r++) drawTieHole(hx, upperRowsY[r]);
      for (let r = 0; r < 5; r++) drawTieHole(hx, lowerRowsY[r]);
    }

    // 6. Power Rail Sockets (12-hole grouped arrays)
    for (let i = 0; i < 12; i++) {
      const groupOffset = Math.floor(i / 4) * 6;
      const hx = 38 + i * ((W - 90) / 11) + groupOffset;
      drawTieHole(hx, 14);
      drawTieHole(hx, 24);
      drawTieHole(hx, H - 24);
      drawTieHole(hx, H - 14);
    }

    if (inst.selected) drawSelectionRect(ctx, -4, -4, W + 8, H + 8);
    ctx.restore();
  }
});

defComp({
  id: 'breadboard',
  name: 'Breadboard',
  category: 'Passive',
  icon: '🟦',
  desc: '400 tie-point solderless breadboard — 30 columns × 2 halves (upper a–e, lower f–j) + 4 power rails',
  width: 580,
  height: 220,
  defaultProps: {},
  pins: _genBreadboardPins(),
  draw(ctx, inst, sim) {
    const { x, y, width: W, height: H } = inst;
    ctx.save();
    ctx.translate(x, y);

    // 1. Base Housing & Bevel
    ctx.fillStyle = '#dfdbd0';
    roundRect(ctx, 0, 0, W, H, 8);
    ctx.fill();

    // Top surface (molded ABS off-white plastic)
    const bodyGrad = ctx.createLinearGradient(0, 0, 0, H);
    bodyGrad.addColorStop(0, '#fcfbfa');
    bodyGrad.addColorStop(0.5, '#f4f1ea');
    bodyGrad.addColorStop(1, '#ebe6dc');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 2, 2, W - 4, H - 4, 6);
    ctx.fill();

    // Exterior border rim
    ctx.strokeStyle = '#c4bfb2';
    ctx.lineWidth = 1.2;
    roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 8);
    ctx.stroke();

    // Side Interlocking Tabs & Notches
    ctx.fillStyle = '#d4cfc2';
    roundRect(ctx, -2, H / 2 - 14, 4, 28, 2);
    ctx.fill();
    roundRect(ctx, W - 2, H / 2 - 14, 4, 28, 2);
    ctx.fill();

    // 2. Center DIP Isolation Trough (IC Divider Canal)
    const midY = H / 2;
    const grooveH = 12;
    const grooveGrad = ctx.createLinearGradient(0, midY - grooveH / 2, 0, midY + grooveH / 2);
    grooveGrad.addColorStop(0, '#b8b4a6');
    grooveGrad.addColorStop(0.25, '#d3cfc3');
    grooveGrad.addColorStop(0.75, '#e8e5dc');
    grooveGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grooveGrad;
    ctx.fillRect(16, midY - grooveH / 2, W - 32, grooveH);

    // 3. Power Rail Stripes & Polarity Indicators
    const railX1 = 34;
    const railX2 = W - 34;

    // Top Rails (+ Red, - Blue)
    ctx.strokeStyle = '#e53935';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(railX1, 13);
    ctx.lineTo(railX2, 13);
    ctx.stroke();

    ctx.strokeStyle = '#1e88e5';
    ctx.beginPath();
    ctx.moveTo(railX1, 37);
    ctx.lineTo(railX2, 37);
    ctx.stroke();

    // Bottom Rails (+ Red, - Blue)
    ctx.strokeStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(railX1, H - 37);
    ctx.lineTo(railX2, H - 37);
    ctx.stroke();

    ctx.strokeStyle = '#1e88e5';
    ctx.beginPath();
    ctx.moveTo(railX1, H - 13);
    ctx.lineTo(railX2, H - 13);
    ctx.stroke();

    // Polarity Glyphs
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#e53935';
    ctx.fillText('+', 22, 13);
    ctx.fillText('+', W - 22, 13);
    ctx.fillText('+', 22, H - 37);
    ctx.fillText('+', W - 22, H - 37);

    ctx.fillStyle = '#1e88e5';
    ctx.fillText('−', 22, 37);
    ctx.fillText('−', W - 22, 37);
    ctx.fillText('−', 22, H - 13);
    ctx.fillText('−', W - 22, H - 13);

    // 4. Spring Contact Tie-Hole Renderer
    function drawTieHole(hx, hy) {
      // Cavity Bevel
      ctx.fillStyle = '#dcd7cc';
      ctx.fillRect(hx - 3.5, hy - 3.5, 7, 7);

      // Dark Interior Well
      ctx.fillStyle = '#181715';
      ctx.fillRect(hx - 2.5, hy - 2.5, 5, 5);

      // Nickel-Plated Spring Clip Reflection
      ctx.fillStyle = '#52504a';
      ctx.fillRect(hx - 1.5, hy - 1, 3, 2);
    }

    // 5. 30 Pin Columns & Matrix Grid
    const cols = 30;
    const startX = 42;
    const stepX = (W - 84) / (cols - 1);

    const upperRowsY = [55, 68, 81, 94, 107];
    const lowerRowsY = [123, 136, 149, 162, 175];
    const rowLabelsUpper = ['a', 'b', 'c', 'd', 'e'];
    const rowLabelsLower = ['f', 'g', 'h', 'i', 'j'];

    // Silkscreen Row Coordinates
    ctx.fillStyle = '#7a766c';
    ctx.font = 'bold 9px "JetBrains Mono", sans-serif';

    for (let r = 0; r < 5; r++) {
      ctx.fillText(rowLabelsUpper[r], 24, upperRowsY[r]);
      ctx.fillText(rowLabelsUpper[r], W - 24, upperRowsY[r]);
      ctx.fillText(rowLabelsLower[r], 24, lowerRowsY[r]);
      ctx.fillText(rowLabelsLower[r], W - 24, lowerRowsY[r]);
    }

    // Column Indicators & Terminals
    for (let col = 0; col < cols; col++) {
      const hx = startX + col * stepX;
      const colNum = col + 1;

      if (colNum === 1 || colNum % 5 === 0) {
        ctx.fillStyle = '#666157';
        ctx.font = 'bold 8.5px "JetBrains Mono", sans-serif';
        ctx.fillText(colNum.toString(), hx, 46);
        ctx.fillText(colNum.toString(), hx, H - 46);
      }

      // Upper rows (a–e)
      for (let r = 0; r < 5; r++) drawTieHole(hx, upperRowsY[r]);

      // Lower rows (f–j)
      for (let r = 0; r < 5; r++) drawTieHole(hx, lowerRowsY[r]);
    }

    // 6. Power Distribution Bus Sockets (5-hole grouped arrays)
    for (let i = 0; i < 25; i++) {
      const groupOffset = Math.floor(i / 5) * 8;
      const hx = 45 + i * ((W - 122) / 24) + groupOffset;

      drawTieHole(hx, 19);
      drawTieHole(hx, 31);
      drawTieHole(hx, H - 31);
      drawTieHole(hx, H - 19);
    }

    if (inst.selected) drawSelectionRect(ctx, -4, -4, W + 8, H + 8);
    ctx.restore();
  }
});

/*-----------------------diode_1n4007---------------------- */
defComp({
  id: 'diode_1n4007',
  name: '1N4007 Diode',
  category: 'Passive',
  icon: '',
  desc: 'General-purpose rectifier diode. 1A forward current, 1000V reverse voltage. 0.7V forward drop',
  width: 40,
  height: 14,
  defaultProps: {},
  interactive: [],
  pins: [
    { id: 'anode', label: 'A', type: PIN_TYPE.SIGNAL, x: 4, y: 14, side: 'bottom' },
    { id: 'cathode', label: 'K', type: PIN_TYPE.SIGNAL, x: 36, y: 14, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const rs = inst.runtimeState || {};
    const conducting = rs.conducting || false;
    ctx.save();
    ctx.translate(x, y);

    // Body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 8, 2, 24, 10, 2);
    ctx.fill();

    // Cathode band
    ctx.fillStyle = '#888';
    ctx.fillRect(26, 2, 3, 10);

    // Diode symbol (triangle + bar)
    ctx.fillStyle = conducting ? '#00cc66' : '#555';
    ctx.beginPath();
    ctx.moveTo(12, 7);
    ctx.lineTo(22, 3);
    ctx.lineTo(22, 11);
    ctx.closePath();
    ctx.fill();

    // Cathode bar
    ctx.strokeStyle = conducting ? '#00cc66' : '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(22, 3);
    ctx.lineTo(22, 11);
    ctx.stroke();

    // Arrow direction
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, 7);
    ctx.lineTo(18, 7);
    ctx.lineTo(16, 5);
    ctx.moveTo(18, 7);
    ctx.lineTo(16, 9);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#aaa';
    ctx.font = '4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('1N4007', 18, 8);

    // Wire leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(4, 7); ctx.lineTo(8, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32, 7); ctx.lineTo(36, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 7); ctx.lineTo(4, 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(36, 7); ctx.lineTo(36, 14); ctx.stroke();

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 40, 14);
    ctx.restore();
  }
});
