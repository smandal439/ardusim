/* components/boards.js — Arduino & ESP32 board definitions */
// 'use strict';

/* ──────────────────── Arduino BOARDS ──────────────────── */
defComp({
  id: 'arduino_uno',
  name: 'Arduino Uno R3',
  category: 'Boards',
  icon: '🎛️',
  desc: 'ATmega328P microcontroller board with digital and analog I/O pins',
  width: 230,
  height: 150,
  defaultProps: { label: 'UNO' },
  pins: [
    // Digital pins top row (D0â€“D13, from left), then GND + AREF
    { id:'D0',   label:'D0',   type:PIN_TYPE.DIGITAL, x: 10, y: 12, side:'top' },
    { id:'D1',   label:'D1',   type:PIN_TYPE.DIGITAL, x: 24, y: 12, side:'top' },
    { id:'D2',   label:'D2',   type:PIN_TYPE.DIGITAL, x: 38, y: 12, side:'top' },
    { id:'D3',   label:'D3~',  type:PIN_TYPE.PWM,     x: 52, y: 12, side:'top' },
    { id:'D4',   label:'D4',   type:PIN_TYPE.DIGITAL, x: 66, y: 12, side:'top' },
    { id:'D5',   label:'D5~',  type:PIN_TYPE.PWM,     x: 80, y: 12, side:'top' },
    { id:'D6',   label:'D6~',  type:PIN_TYPE.PWM,     x: 94, y: 12, side:'top' },
    { id:'D7',   label:'D7',   type:PIN_TYPE.DIGITAL, x:108, y: 12, side:'top' },
    { id:'D8',   label:'D8',   type:PIN_TYPE.DIGITAL, x:122, y: 12, side:'top' },
    { id:'D9',   label:'D9~',  type:PIN_TYPE.PWM,     x:136, y: 12, side:'top' },
    { id:'D10',  label:'D10~', type:PIN_TYPE.PWM,     x:150, y: 12, side:'top' },
    { id:'D11',  label:'D11~', type:PIN_TYPE.PWM,     x:164, y: 12, side:'top' },
    { id:'D12',  label:'D12',  type:PIN_TYPE.DIGITAL, x:178, y: 12, side:'top' },
    { id:'D13',  label:'D13',  type:PIN_TYPE.DIGITAL, x:192, y: 12, side:'top' },
    // Power top
    { id:'GND_D', label:'GND',  type:PIN_TYPE.GND,    x:206, y: 12, side:'top' },
    { id:'AREF',  label:'AREF', type:PIN_TYPE.SIGNAL, x:220, y: 12, side:'top' },
    // Analog pins bottom row (left)
    { id:'A0', label:'A0', type:PIN_TYPE.ANALOG, x: 14, y:134, side:'bottom' },
    { id:'A1', label:'A1', type:PIN_TYPE.ANALOG, x: 28, y:134, side:'bottom' },
    { id:'A2', label:'A2', type:PIN_TYPE.ANALOG, x: 42, y:134, side:'bottom' },
    { id:'A3', label:'A3', type:PIN_TYPE.ANALOG, x: 56, y:134, side:'bottom' },
    { id:'A4', label:'A4', type:PIN_TYPE.ANALOG, x: 70, y:134, side:'bottom' },
    { id:'A5', label:'A5', type:PIN_TYPE.ANALOG, x: 84, y:134, side:'bottom' },
    // Power bottom (right)
    { id:'VIN',  label:'VIN',  type:PIN_TYPE.POWER, x:104, y:134, side:'bottom' },
    { id:'GND1', label:'GND',  type:PIN_TYPE.GND,   x:118, y:134, side:'bottom' },
    { id:'GND2', label:'GND',  type:PIN_TYPE.GND,   x:132, y:134, side:'bottom' },
    { id:'5V',   label:'5V',   type:PIN_TYPE.POWER, x:146, y:134, side:'bottom' },
    { id:'3V3',  label:'3.3V', type:PIN_TYPE.POWER, x:160, y:134, side:'bottom' },
    { id:'RST',  label:'RST',  type:PIN_TYPE.SIGNAL,x:174, y:134, side:'bottom' },
    //I2C PIN on right side
    { id:'SDA',  label:'SDA',  type:PIN_TYPE.SIGNAL, x:220, y:100, side:'right' },
    { id:'SCL',  label:'SCL',  type:PIN_TYPE.SIGNAL, x:220, y:110, side:'right' },
    { id:'5V2',  label:'5V',   type:PIN_TYPE.POWER, x:220, y:120, side:'right' },
    { id:'GND3', label:'GND',  type:PIN_TYPE.GND,   x:220, y:130, side:'right' },

  ],
  draw(ctx, inst, sim) {
    const { x, y, width: W, height: H } = inst;

    /*-------------------------------PCB body-------------------------*/
    ctx.save();
    ctx.translate(x, y);

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#1e6d33');
    grad.addColorStop(0.45, '#187a30');
    grad.addColorStop(1, '#0f4d1d');
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, W, H, 8);
    ctx.fill();
    ctx.strokeStyle = '#194c24';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // -------------------------- Silkscreen frame -------------------------
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, 5, 5, W - 10, H - 10, 6);
    ctx.stroke();

    // ---------------------- Subtle copper traces ----------------------------
    ctx.strokeStyle = 'rgba(170,220,150,0.10)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(14, 22 + i * 9);
      ctx.lineTo(46, 22 + i * 9);
      ctx.stroke();
    }
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(196, 22 + i * 11);
      ctx.lineTo(218, 22 + i * 11);
      ctx.stroke();
    }

    // -------------------- USB Type-B connector (left edge) -------------------------
    ctx.fillStyle = '#7f8c8d';
    roundRect(ctx, -16, 32, 18, 26, 3);
    ctx.fill();
    ctx.fillStyle = '#3a3a3a';
    roundRect(ctx, -13, 35, 12, 20, 2);
    ctx.fill();
    ctx.fillStyle = '#d5d8dc';
    roundRect(ctx, -10, 42, 9, 5, 1);
    ctx.fill();

    // ------------------ 16U2 USB-serial chip (top-left) --------------------------
    ctx.fillStyle = '#101010';
    roundRect(ctx, 10, 34, 18, 16, 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = '#666';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(10, 37 + i * 4); ctx.lineTo(6, 37 + i * 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(28, 37 + i * 4); ctx.lineTo(32, 37 + i * 4); ctx.stroke();
    }
    ctx.fillStyle = '#ccc';
    ctx.font = '5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('16U2', 19, 44);

    // â”€â”€ ATmega328P DIP (center) â”€â”€
    const chipX = 70, chipY = 60, chipW = 76, chipH = 32;
    ctx.fillStyle = '#0c0c0c';
    roundRect(ctx, chipX, chipY, chipW, chipH, 3);
    ctx.fill();
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = '#888';
    for (let i = 0; i < 14; i++) {
      const px = chipX + 3 + i * (chipW - 6) / 13;
      ctx.beginPath(); ctx.moveTo(px, chipY); ctx.lineTo(px, chipY - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, chipY + chipH); ctx.lineTo(px, chipY + chipH + 6); ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const py = chipY + 5 + i * 11;
      ctx.beginPath(); ctx.moveTo(chipX, py); ctx.lineTo(chipX - 6, py); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(chipX + chipW, py); ctx.lineTo(chipX + chipW + 6, py); ctx.stroke();
    }
    // notch
    ctx.fillStyle = '#0c0c0c';
    ctx.beginPath();
    ctx.arc(chipX + chipW / 2, chipY, 4, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8d8d8';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.fillText('ATmega328P', chipX + chipW / 2, chipY + 14);
    ctx.font = '5px JetBrains Mono, monospace';
    ctx.fillText('- P U -', chipX + chipW / 2, chipY + 22);

    // â”€â”€ ICSP header (right of chip) â”€â”€
    ctx.fillStyle = '#151517';
    roundRect(ctx, 168, 62, 20, 24, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const sx = 174 + col * 8;
        const sy = 67 + row * 7;
        ctx.fillStyle = '#c8b06a';
        ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0c0c0e';
        ctx.beginPath(); ctx.arc(sx, sy, 0.9, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = '#bfbfbf';
    ctx.font = '4.5px sans-serif';
    ctx.fillText('ICSP', 178, 60);

    // â”€â”€ Crystal oscillator â”€â”€
    ctx.fillStyle = '#b0b0b0';
    roundRect(ctx, 42, 78, 22, 9, 2);
    ctx.fill();
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#f0f0f0';
    ctx.font = '5px sans-serif';
    ctx.fillText('16MHz', 53, 85);
    ctx.strokeStyle = '#999';
    ctx.beginPath(); ctx.moveTo(46, 87); ctx.lineTo(46, 92); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(60, 87); ctx.lineTo(60, 92); ctx.stroke();

    // â”€â”€ Reset button (bottom-left) â”€â”€
    ctx.fillStyle = '#c43c3c';
    roundRect(ctx, 10, 92, 18, 18, 3);
    ctx.fill();
    ctx.strokeStyle = '#7a2020';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ff7373';
    roundRect(ctx, 13, 95, 12, 6, 2);
    ctx.fill();
    ctx.fillStyle = '#bfbfbf';
    ctx.font = '5px sans-serif';
    ctx.fillText('RST', 19, 116);

    // â”€â”€ Barrel jack (bottom-left edge) â”€â”€
    ctx.fillStyle = '#1c1c1c';
    roundRect(ctx, -14, 100, 20, 26, 4);
    ctx.fill();
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath(); ctx.arc(-4, 113, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath(); ctx.arc(-4, 113, 3, 0, Math.PI * 2); ctx.fill();

    // â”€â”€ Voltage regulator (SOT-223, right-bottom) â”€â”€
    ctx.fillStyle = '#2e2e2e';
    roundRect(ctx, 156, 102, 18, 20, 2);
    ctx.fill();
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#3d3d3d';
    roundRect(ctx, 158, 96, 14, 6, 2);
    ctx.fill();
    ctx.strokeStyle = '#666';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(160 + i * 5, 122); ctx.lineTo(160 + i * 5, 128); ctx.stroke();
    }
    ctx.fillStyle = '#d8d8d8';
    ctx.font = '5px sans-serif';
    ctx.fillText('5V', 165, 115);

    // â”€â”€ Electrolytic capacitors â”€â”€
    const caps = [
      { cx: 132, cy: 112, r: 5,   t: '1' },
      { cx: 120, cy: 112, r: 4.2, t: '2' },
    ];
    for (const c of caps) {
      ctx.fillStyle = '#101010';
      ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = '#d8d8d8';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r - 1, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.fillStyle = '#eee';
      ctx.font = `${c.r}px sans-serif`;
      ctx.fillText(c.t, c.cx, c.cy + c.r * 0.35);
    }

    // â”€â”€ Status LEDs â”€â”€
    const lit = sim && sim.pinStates && (sim.pinStates['pin_13'] || 0) > 0;
    drawLED_on_board(ctx, 150, 36, lit ? '#ffee33' : '#555', 3.5);  // L (D13)
    drawLED_on_board(ctx, 12, 62, '#ff4d4d', 3);  // TX
    drawLED_on_board(ctx, 22, 62, '#ff4d4d', 3);  // RX
    drawLED_on_board(ctx, 32, 62, '#33ff66', 3);  // ON
    ctx.fillStyle = '#bfbfbf';
    ctx.font = '5px sans-serif';
    ctx.fillText('L', 150, 46);
    ctx.fillText('TX', 12, 72);
    ctx.fillText('RX', 22, 72);
    ctx.fillText('ON', 32, 72);

    // â”€â”€ Header strips â”€â”€
    const topHoles = [], analogHoles = [], powerHoles = [];
    for (let i = 0; i < 16; i++) topHoles.push(10 + i * 14);
    for (let i = 0; i < 6; i++) { analogHoles.push(14 + i * 14); powerHoles.push(104 + i * 14); }
    drawHeaderStrip(ctx, 4, 6, 222, topHoles, 12);
    drawHeaderStrip(ctx, 4, 128, 94, analogHoles, 134);
    drawHeaderStrip(ctx, 96, 128, 90, powerHoles, 134);

    // â”€â”€ Silkscreen labels â”€â”€
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ARDUINO', 196, 48);
    ctx.font = 'bold 6px sans-serif';
    ctx.fillText('UNO', 196, 57);

    // â”€â”€ Pin labels (silkscreen, always readable) â”€â”€
    ctx.font = 'bold 5px JetBrains Mono, monospace';
    const paintPinLabel = (cx, baseline, text) => {
      const w = ctx.measureText(text).width + 5;
      ctx.fillStyle = 'rgba(8,44,18,0.9)';
      roundRect(ctx, cx - w / 2, baseline - 4.5, w, 7, 2);
      ctx.fill();
      ctx.fillStyle = '#eef9ec';
      ctx.fillText(text, cx, baseline + 1);
    };
    const topLabels   = ['D0','D1','D2','D3~','D4','D5~','D6~','D7','D8','D9~','D10~','D11~','D12','D13','GND','AREF'];
    const analogLabels = ['A0','A1','A2','A3','A4','A5'];
    const powerLabels  = ['VIN','GND','GND','5V','3.3V','RST'];
    const i2cLabels= ['SDA','SCL','5V','GND'];
    for (let i = 0; i < 16; i++) paintPinLabel(topHoles[i], 25, topLabels[i]);
    for (let i = 0; i < 6; i++)  paintPinLabel(analogHoles[i], 120, analogLabels[i]);
    for (let i = 0; i < 6; i++)  paintPinLabel(powerHoles[i], 120, powerLabels[i]);
    for (let i = 0; i < 4; i++)  paintPinLabel(205, 100 + i * 10, i2cLabels[i]);   

    // Vertical "MADE IN ITALY" on the right edge
    ctx.save();
    ctx.translate(220, 36);
    ctx.rotate(Math.PI / 2);
    ctx.font = '5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText('MADE IN ITALY', 0, 0);
    ctx.restore();

    // â”€â”€ Selection outline â”€â”€
    if (inst.selected) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      roundRect(ctx, -3, -3, W + 6, H + 6, 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
});
/* ──────────────────── Arduino BOARDS blue ──────────────────── */
// defComp({
//   id: 'arduino_uno',
//   name: 'Arduino Uno R3',
//   category: 'Boards',
//   icon: '🎛️',
//   desc: 'ATmega328P microcontroller board with digital, analog, and power I/O headers',
//   width: 230,
//   height: 150,
//   defaultProps: { label: 'UNO' },
//   pins: [
//     // Digital pins top row (D0–D13, GND, AREF)
//     { id: 'D0', label: 'D0/RX', type: PIN_TYPE.DIGITAL, x: 10, y: 12, side: 'top' },
//     { id: 'D1', label: 'D1/TX', type: PIN_TYPE.DIGITAL, x: 24, y: 12, side: 'top' },
//     { id: 'D2', label: 'D2', type: PIN_TYPE.DIGITAL, x: 38, y: 12, side: 'top' },
//     { id: 'D3', label: 'D3~', type: PIN_TYPE.PWM, x: 52, y: 12, side: 'top' },
//     { id: 'D4', label: 'D4', type: PIN_TYPE.DIGITAL, x: 66, y: 12, side: 'top' },
//     { id: 'D5', label: 'D5~', type: PIN_TYPE.PWM, x: 80, y: 12, side: 'top' },
//     { id: 'D6', label: 'D6~', type: PIN_TYPE.PWM, x: 94, y: 12, side: 'top' },
//     { id: 'D7', label: 'D7', type: PIN_TYPE.DIGITAL, x: 108, y: 12, side: 'top' },
//     { id: 'D8', label: 'D8', type: PIN_TYPE.DIGITAL, x: 122, y: 12, side: 'top' },
//     { id: 'D9', label: 'D9~', type: PIN_TYPE.PWM, x: 136, y: 12, side: 'top' },
//     { id: 'D10', label: 'D10~', type: PIN_TYPE.PWM, x: 150, y: 12, side: 'top' },
//     { id: 'D11', label: 'D11~', type: PIN_TYPE.PWM, x: 164, y: 12, side: 'top' },
//     { id: 'D12', label: 'D12', type: PIN_TYPE.DIGITAL, x: 178, y: 12, side: 'top' },
//     { id: 'D13', label: 'D13', type: PIN_TYPE.DIGITAL, x: 192, y: 12, side: 'top' },
//     { id: 'GND_D', label: 'GND', type: PIN_TYPE.GND, x: 206, y: 12, side: 'top' },
//     { id: 'AREF', label: 'AREF', type: PIN_TYPE.SIGNAL, x: 220, y: 12, side: 'top' },

//     // Analog pins bottom row
//     { id: 'A0', label: 'A0', type: PIN_TYPE.ANALOG, x: 14, y: 134, side: 'bottom' },
//     { id: 'A1', label: 'A1', type: PIN_TYPE.ANALOG, x: 28, y: 134, side: 'bottom' },
//     { id: 'A2', label: 'A2', type: PIN_TYPE.ANALOG, x: 42, y: 134, side: 'bottom' },
//     { id: 'A3', label: 'A3', type: PIN_TYPE.ANALOG, x: 56, y: 134, side: 'bottom' },
//     { id: 'A4', label: 'A4', type: PIN_TYPE.ANALOG, x: 70, y: 134, side: 'bottom' },
//     { id: 'A5', label: 'A5', type: PIN_TYPE.ANALOG, x: 84, y: 134, side: 'bottom' },

//     // Power bottom row
//     { id: 'VIN', label: 'VIN', type: PIN_TYPE.POWER, x: 104, y: 134, side: 'bottom' },
//     { id: 'GND1', label: 'GND', type: PIN_TYPE.GND, x: 118, y: 134, side: 'bottom' },
//     { id: 'GND2', label: 'GND', type: PIN_TYPE.GND, x: 132, y: 134, side: 'bottom' },
//     { id: '5V', label: '5V', type: PIN_TYPE.POWER, x: 146, y: 134, side: 'bottom' },
//     { id: '3V3', label: '3.3V', type: PIN_TYPE.POWER, x: 160, y: 134, side: 'bottom' },
//     { id: 'RST', label: 'RST', type: PIN_TYPE.SIGNAL, x: 174, y: 134, side: 'bottom' },

//     // Auxiliary I2C / Power right side
//     { id: 'SDA', label: 'SDA', type: PIN_TYPE.SIGNAL, x: 220, y: 95, side: 'right' },
//     { id: 'SCL', label: 'SCL', type: PIN_TYPE.SIGNAL, x: 220, y: 107, side: 'right' },
//     { id: '5V2', label: '5V', type: PIN_TYPE.POWER, x: 220, y: 119, side: 'right' },
//     { id: 'GND3', label: 'GND', type: PIN_TYPE.GND, x: 220, y: 131, side: 'right' }
//   ],

//   draw(ctx, inst, sim) {
//     const { x, y, width: W, height: H } = inst;

//     ctx.save();
//     ctx.translate(x, y);

//     // Canvas helper for rounded rectangles
//     const drawRoundRect = (cx, cy, w, h, r) => {
//       ctx.beginPath();
//       if (ctx.roundRect) {
//         ctx.roundRect(cx, cy, w, h, r);
//       } else {
//         ctx.moveTo(cx + r, cy);
//         ctx.lineTo(cx + w - r, cy);
//         ctx.quadraticCurveTo(cx + w, cy, cx + w, cy + r);
//         ctx.lineTo(cx + w, cy + h - r);
//         ctx.quadraticCurveTo(cx + w, cy + h, cx + w - r, cy + h);
//         ctx.lineTo(cx + r, cy + h);
//         ctx.quadraticCurveTo(cx, cy + h, cx, cy + h - r);
//         ctx.lineTo(cx, cy + r);
//         ctx.quadraticCurveTo(cx, cy, cx + r, cy);
//       }
//       ctx.closePath();
//     };

//     // Helper for rendering surface-mount / status LEDs
//     const drawLED = (lx, ly, color, label, isLit) => {
//       ctx.fillStyle = '#222';
//       drawRoundRect(lx - 2.5, ly - 2, 5, 4, 1);
//       ctx.fill();

//       ctx.fillStyle = isLit ? color : '#3d3d3d';
//       ctx.beginPath();
//       ctx.arc(lx, ly, 1.4, 0, Math.PI * 2);
//       ctx.fill();

//       if (isLit) {
//         ctx.save();
//         ctx.shadowColor = color;
//         ctx.shadowBlur = 6;
//         ctx.fillStyle = '#ffffff';
//         ctx.beginPath();
//         ctx.arc(lx, ly, 0.9, 0, Math.PI * 2);
//         ctx.fill();
//         ctx.restore();
//       }

//       if (label) {
//         ctx.fillStyle = '#ffffff';
//         ctx.font = 'bold 4px sans-serif';
//         ctx.textAlign = 'center';
//         ctx.fillText(label, lx, ly + 6);
//       }
//     };

//     // Helper for rendering black plastic female headers
//     const drawHeaderBlock = (hx, hy, count, horizontal = true) => {
//       ctx.fillStyle = '#111111';
//       const bw = horizontal ? count * 14 : 6;
//       const bh = horizontal ? 8 : count * 12;
//       drawRoundRect(hx, hy, bw, bh, 1.5);
//       ctx.fill();

//       ctx.fillStyle = '#050505';
//       ctx.strokeStyle = '#444444';
//       ctx.lineWidth = 0.5;

//       for (let i = 0; i < count; i++) {
//         const px = horizontal ? hx + 3 + i * 14 : hx + 1.5;
//         const py = horizontal ? hy + 2 : hy + 3 + i * 12;
//         ctx.fillRect(px, py, 3, 3);
//         ctx.strokeRect(px, py, 3, 3);
//       }
//     };

//     // ----------------------------------------------------
//     // 1. PCB BODY (Authentic Arduino Teal / Blue PCB Color)
//     // ----------------------------------------------------
//     const pcbGrad = ctx.createLinearGradient(0, 0, W, H);
//     pcbGrad.addColorStop(0, '#006699');
//     pcbGrad.addColorStop(0.5, '#005f8d');
//     pcbGrad.addColorStop(1, '#004a6f');
//     ctx.fillStyle = pcbGrad;
//     drawRoundRect(0, 0, W, H, 6);
//     ctx.fill();

//     ctx.strokeStyle = '#00334e';
//     ctx.lineWidth = 1.2;
//     ctx.stroke();

//     // Silkscreen Border Frame
//     ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
//     ctx.lineWidth = 0.8;
//     drawRoundRect(3, 3, W - 6, H - 6, 4);
//     ctx.stroke();

//     // Ground & Power Copper Planes / Traces
//     ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
//     ctx.lineWidth = 1;
//     for (let i = 0; i < 8; i++) {
//       ctx.beginPath();
//       ctx.moveTo(15, 25 + i * 12);
//       ctx.lineTo(55, 25 + i * 12);
//       ctx.stroke();
//     }

//     // Mounting Holes (4 Corners)
//     [[14, 18], [152, 18], [68, 138], [216, 138]].forEach(([mx, my]) => {
//       ctx.fillStyle = '#00334e';
//       ctx.beginPath(); ctx.arc(mx, my, 3.5, 0, Math.PI * 2); ctx.fill();
//       ctx.strokeStyle = '#d4af37'; // Gold copper ring
//       ctx.lineWidth = 1;
//       ctx.stroke();
//     });

//     // ----------------------------------------------------
//     // 2. CONNECTORS (USB Type-B & DC Power Barrel Jack)
//     // ----------------------------------------------------
//     // Metallic USB Type-B Port (Left-top overhang)
//     ctx.fillStyle = '#b0b8c0';
//     drawRoundRect(-14, 28, 18, 22, 2);
//     ctx.fill();

//     const usbMetalGrad = ctx.createLinearGradient(-14, 28, 4, 50);
//     usbMetalGrad.addColorStop(0, '#d8e0e8');
//     usbMetalGrad.addColorStop(0.5, '#9fa8b0');
//     usbMetalGrad.addColorStop(1, '#687078');
//     ctx.fillStyle = usbMetalGrad;
//     drawRoundRect(-12, 30, 15, 18, 1);
//     ctx.fill();

//     ctx.fillStyle = '#222';
//     drawRoundRect(-10, 34, 11, 10, 1);
//     ctx.fill();

//     ctx.fillStyle = '#ffffff'; // White plastic insert
//     drawRoundRect(-8, 38, 7, 4, 0.5);
//     ctx.fill();

//     // Black DC Power Barrel Jack (Left-bottom overhang)
//     ctx.fillStyle = '#1c1d21';
//     drawRoundRect(-12, 94, 22, 24, 3);
//     ctx.fill();

//     ctx.fillStyle = '#2d2f36';
//     ctx.beginPath(); ctx.arc(-2, 106, 6, 0, Math.PI * 2); ctx.fill();

//     ctx.fillStyle = '#111';
//     ctx.beginPath(); ctx.arc(-2, 106, 3.5, 0, Math.PI * 2); ctx.fill();

//     ctx.fillStyle = '#c5a059'; // Center metal pin
//     ctx.beginPath(); ctx.arc(-2, 106, 1.2, 0, Math.PI * 2); ctx.fill();

//     // ----------------------------------------------------
//     // 3. MAIN IC: ATmega328P (DIP-28 Socketed Chip)
//     // ----------------------------------------------------
//     const chipX = 72, chipY = 62, chipW = 76, chipH = 28;

//     // Plastic DIP Socket
//     ctx.fillStyle = '#181818';
//     drawRoundRect(chipX - 2, chipY - 2, chipW + 4, chipH + 4, 2);
//     ctx.fill();

//     // ATmega328P IC Body
//     const icGrad = ctx.createLinearGradient(chipX, chipY, chipX, chipY + chipH);
//     icGrad.addColorStop(0, '#2d2d2d');
//     icGrad.addColorStop(0.5, '#1f1f1f');
//     icGrad.addColorStop(1, '#111111');
//     ctx.fillStyle = icGrad;
//     drawRoundRect(chipX, chipY, chipW, chipH, 2);
//     ctx.fill();

//     // Silver DIP Pins
//     ctx.fillStyle = '#c0c0c0';
//     for (let i = 0; i < 14; i++) {
//       const px = chipX + 4 + i * (chipW - 8) / 13;
//       ctx.fillRect(px - 1, chipY - 5, 2, 4);
//       ctx.fillRect(px - 1, chipY + chipH + 1, 2, 4);
//     }

//     // Pin 1 Notch & Dot
//     ctx.fillStyle = '#151515';
//     ctx.beginPath();
//     ctx.arc(chipX, chipY + chipH / 2, 3.5, -Math.PI / 2, Math.PI / 2);
//     ctx.fill();

//     ctx.fillStyle = '#888888';
//     ctx.beginPath();
//     ctx.arc(chipX + 8, chipY + chipH / 2 + 6, 1.2, 0, Math.PI * 2);
//     ctx.fill();

//     // Chip Markings
//     ctx.fillStyle = '#e0e0e0';
//     ctx.font = 'bold 6.5px sans-serif';
//     ctx.textAlign = 'center';
//     ctx.fillText('ATMEGA328P-PU', chipX + chipW / 2 + 2, chipY + 12);
//     ctx.font = '4.5px monospace';
//     ctx.fillStyle = '#aaaaaa';
//     ctx.fillText('MICROCHIP 2622', chipX + chipW / 2 + 2, chipY + 20);

//     // ----------------------------------------------------
//     // 4. USB INTERFACE IC (ATmega16U2 SMD Chip)
//     // ----------------------------------------------------
//     ctx.fillStyle = '#1c1c1c';
//     drawRoundRect(20, 32, 16, 16, 1);
//     ctx.fill();

//     // QFP Pin leads
//     ctx.strokeStyle = '#aaaaaa';
//     ctx.lineWidth = 0.6;
//     for (let i = 0; i < 4; i++) {
//       ctx.beginPath(); ctx.moveTo(20, 34 + i * 3.5); ctx.lineTo(17, 34 + i * 3.5); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(36, 34 + i * 3.5); ctx.lineTo(39, 34 + i * 3.5); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(22 + i * 3.5, 32); ctx.lineTo(22 + i * 3.5, 29); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(22 + i * 3.5, 48); ctx.lineTo(22 + i * 3.5, 51); ctx.stroke();
//     }

//     ctx.fillStyle = '#bfbfbf';
//     ctx.font = '4px sans-serif';
//     ctx.textAlign = 'center';
//     ctx.fillText('16U2', 28, 41);

//     // ----------------------------------------------------
//     // 5. VOLTAGE REGULATORS, CRYSTAL & PASSIVES
//     // ----------------------------------------------------
//     // 16MHz Metal Can Crystal Oscillator
//     const xtalGrad = ctx.createLinearGradient(44, 76, 62, 86);
//     xtalGrad.addColorStop(0, '#f0f0f0');
//     xtalGrad.addColorStop(1, '#a0a0a0');
//     ctx.fillStyle = xtalGrad;
//     drawRoundRect(44, 76, 18, 9, 3);
//     ctx.fill();
//     ctx.strokeStyle = '#777';
//     ctx.lineWidth = 0.6;
//     ctx.stroke();

//     ctx.fillStyle = '#333';
//     ctx.font = 'bold 3.5px monospace';
//     ctx.fillText('16.000', 53, 82);

//     // 5V Voltage Regulator (SOT-223 Package)
//     ctx.fillStyle = '#222222';
//     drawRoundRect(158, 96, 16, 18, 1);
//     ctx.fill();
//     ctx.fillStyle = '#888888'; // Heat sink tab
//     ctx.fillRect(160, 92, 12, 4);

//     // Reset Push Button
//     ctx.fillStyle = '#c8c8c8';
//     drawRoundRect(8, 70, 12, 12, 1);
//     ctx.fill();
//     ctx.fillStyle = '#d9534f'; // Red button core
//     ctx.beginPath(); ctx.arc(14, 76, 3.5, 0, Math.PI * 2); ctx.fill();

//     // ICSP Header Pins
//     ctx.fillStyle = '#111';
//     drawRoundRect(168, 58, 16, 22, 1);
//     ctx.fill();
//     for (let r = 0; r < 3; r++) {
//       for (let c = 0; c < 2; c++) {
//         ctx.fillStyle = '#d4af37';
//         ctx.fillRect(171 + c * 7, 61 + r * 6, 2, 2);
//       }
//     }
//     ctx.fillStyle = '#ffffff';
//     ctx.font = 'bold 3.5px sans-serif';
//     ctx.fillText('ICSP', 176, 56);

//     // ----------------------------------------------------
//     // 6. STATUS LEDS (ON, L / D13, TX, RX)
//     // ----------------------------------------------------
//     const d13Lit = sim && sim.pinStates && (sim.pinStates['D13'] || sim.pinStates['pin_13']) > 0;
//     const isPowered = true; // Board active in simulator

//     drawLED(32, 54, '#00ff66', 'ON', isPowered);
//     drawLED(152, 34, '#ffcc00', 'L', d13Lit);
//     drawLED(12, 54, '#ff3333', 'TX', false);
//     drawLED(22, 54, '#ff3333', 'RX', false);

//     // ----------------------------------------------------
//     // 7. FEMALE PIN HEADERS & SILKSCREEN LABELS
//     // ----------------------------------------------------
//     // Top Digital Header
//     drawHeaderBlock(6, 4, 16, true);
//     // Bottom Analog Header
//     drawHeaderBlock(10, 138, 6, true);
//     // Bottom Power Header
//     drawHeaderBlock(100, 138, 6, true);
//     // Right Auxiliary Header
//     drawHeaderBlock(220, 90, 4, false);

//     // Silkscreen Pin Text Labels
//     ctx.fillStyle = '#ffffff';
//     ctx.font = 'bold 4.5px monospace';
//     ctx.textAlign = 'center';

//     const topLabels = ['D0', 'D1', 'D2', 'D3~', 'D4', 'D5~', 'D6~', 'D7', 'D8', 'D9~', 'D10~', 'D11~', 'D12', 'D13', 'GND', 'AREF'];
//     topLabels.forEach((lbl, i) => {
//       ctx.fillText(lbl, 10 + i * 14, 18);
//     });

//     const analogLabels = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
//     analogLabels.forEach((lbl, i) => {
//       ctx.fillText(lbl, 14 + i * 14, 134);
//     });

//     const powerLabels = ['VIN', 'GND', 'GND', '5V', '3.3V', 'RST'];
//     powerLabels.forEach((lbl, i) => {
//       ctx.fillText(lbl, 104 + i * 14, 134);
//     });

//     // ----------------------------------------------------
//     // 8. BRANDING LOGO & TEXT
//     // ----------------------------------------------------
//     ctx.fillStyle = '#ffffff';
//     ctx.font = 'bold 11px sans-serif';
//     ctx.textAlign = 'left';
//     ctx.fillText('ARDUINO', 160, 36);

//     ctx.font = 'bold 8px sans-serif';
//     ctx.fillStyle = '#7bc1e8';
//     ctx.fillText('UNO', 160, 46);

//     // "MADE IN ITALY" Vertical Text
//     ctx.save();
//     ctx.translate(214, 32);
//     ctx.rotate(Math.PI / 2);
//     ctx.font = 'bold 4px sans-serif';
//     ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
//     ctx.fillText('MADE IN ITALY', 0, 0);
//     ctx.restore();

//     // Selection Halo
//     if (inst.selected && typeof drawSelectionRect === 'function') {
//       drawSelectionRect(ctx, -14, -2, W + 18, H + 4);
//     }

//     ctx.restore();
//   }
// });


/* ──────────────────── Arduino Nano ──────────────────── */
defComp({
  id: 'arduino_nano',
  name: 'Arduino Nano R3',
  category: 'Boards',
  icon: '🎛️',
  desc: 'ATmega328P board — standard breadboard-friendly form factor',
  width: 230,
  height: 80,
  defaultProps: { label: 'NANO' },
  pins: [
    // Top Row (D13 to VIN)
    { id:'D13', label:'D13', type:PIN_TYPE.DIGITAL, x: 15, y: 12, side:'top' },
    { id:'3V3', label:'3V3', type:PIN_TYPE.POWER,   x: 29, y: 12, side:'top' },
    { id:'REF', label:'REF', type:PIN_TYPE.SIGNAL,  x: 43, y: 12, side:'top' },
    { id:'A0',  label:'A0',  type:PIN_TYPE.ANALOG,  x: 57, y: 12, side:'top' },
    { id:'A1',  label:'A1',  type:PIN_TYPE.ANALOG,  x: 71, y: 12, side:'top' },
    { id:'A2',  label:'A2',  type:PIN_TYPE.ANALOG,  x: 85, y: 12, side:'top' },
    { id:'A3',  label:'A3',  type:PIN_TYPE.ANALOG,  x: 99, y: 12, side:'top' },
    { id:'A4',  label:'A4',  type:PIN_TYPE.ANALOG,  x:113, y: 12, side:'top' },
    { id:'A5',  label:'A5',  type:PIN_TYPE.ANALOG,  x:127, y: 12, side:'top' },
    { id:'A6',  label:'A6',  type:PIN_TYPE.ANALOG,  x:141, y: 12, side:'top' },
    { id:'A7',  label:'A7',  type:PIN_TYPE.ANALOG,  x:155, y: 12, side:'top' },
    { id:'5V',  label:'5V',  type:PIN_TYPE.POWER,   x:169, y: 12, side:'top' },
    { id:'RST1',label:'RST', type:PIN_TYPE.SIGNAL,  x:183, y: 12, side:'top' },
    { id:'GND1',label:'GND', type:PIN_TYPE.GND,     x:197, y: 12, side:'top' },
    { id:'VIN', label:'VIN', type:PIN_TYPE.POWER,   x:211, y: 12, side:'top' },

    // Bottom Row (TX0 to D12)
    { id:'TX0', label:'TX',  type:PIN_TYPE.SIGNAL,  x: 15, y: 68, side:'bottom' },
    { id:'RX0', label:'RX',  type:PIN_TYPE.SIGNAL,  x: 29, y: 68, side:'bottom' },
    { id:'RST2',label:'RST', type:PIN_TYPE.SIGNAL,  x: 43, y: 68, side:'bottom' },
    { id:'GND2',label:'GND', type:PIN_TYPE.GND,     x: 57, y: 68, side:'bottom' },
    { id:'D2',  label:'D2',  type:PIN_TYPE.DIGITAL, x: 71, y: 68, side:'bottom' },
    { id:'D3',  label:'D3~', type:PIN_TYPE.PWM,     x: 85, y: 68, side:'bottom' },
    { id:'D4',  label:'D4',  type:PIN_TYPE.DIGITAL, x: 99, y: 68, side:'bottom' },
    { id:'D5',  label:'D5~', type:PIN_TYPE.PWM,     x:113, y: 68, side:'bottom' },
    { id:'D6',  label:'D6~', type:PIN_TYPE.PWM,     x:127, y: 68, side:'bottom' },
    { id:'D7',  label:'D7',  type:PIN_TYPE.DIGITAL, x:141, y: 68, side:'bottom' },
    { id:'D8',  label:'D8',  type:PIN_TYPE.DIGITAL, x:155, y: 68, side:'bottom' },
    { id:'D9',  label:'D9~', type:PIN_TYPE.PWM,     x:169, y: 68, side:'bottom' },
    { id:'D10', label:'D10~',type:PIN_TYPE.PWM,     x:183, y: 68, side:'bottom' },
    { id:'D11', label:'D11~',type:PIN_TYPE.PWM,     x:197, y: 68, side:'bottom' },
    { id:'D12', label:'D12', type:PIN_TYPE.DIGITAL, x:211, y: 68, side:'bottom' }
  ],
  draw(ctx, inst, sim) {
    const { x, y, width: W, height: H } = inst;

    ctx.save();
    ctx.translate(x, y);

    // --- 1. PCB BOARD (Authentic Arduino Teal/Blue Matte Finish) ---
    const pcbGrad = ctx.createLinearGradient(0, 0, W, H);
    pcbGrad.addColorStop(0, '#00878a');
    pcbGrad.addColorStop(0.5, '#007376');
    pcbGrad.addColorStop(1, '#005457');
    ctx.fillStyle = pcbGrad;
    roundRect(ctx, 0, 0, W, H, 5);
    ctx.fill();

    // Board Outline / Edge bevel
    ctx.strokeStyle = '#003a3c';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Silkscreen Inner Framing Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 0.8;
    roundRect(ctx, 3, 3, W - 6, H - 6, 4);
    ctx.stroke();

    // --- 2. SOLDER PADS & SILKSCREEN LABELS FOR PINS ---
    const topLabels = ['D13','3V3','REF','A0','A1','A2','A3','A4','A5','A6','A7','5V','RST','GND','VIN'];
    const botLabels = ['TX','RX','RST','GND','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12'];

    for (let i = 0; i < 15; i++) {
      const px = 15 + i * 14;

      // Top Pin Pad
      drawPinPad(ctx, px, 12);
      // Top Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 6px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(topLabels[i], px, 21);

      // Bottom Pin Pad
      drawPinPad(ctx, px, 68);
      // Bottom Label
      ctx.fillText(botLabels[i], px, 62);
    }

    // --- 3. MINI-USB CONNECTOR (Left Edge) ---
    // Outer Shield
    const usbGrad = ctx.createLinearGradient(0, 26, 0, 54);
    usbGrad.addColorStop(0, '#e0e2e5');
    usbGrad.addColorStop(0.5, '#a3a8b0');
    usbGrad.addColorStop(1, '#6b7078');
    ctx.fillStyle = usbGrad;
    roundRect(ctx, 0, 28, 20, 24, 2);
    ctx.fill();
    ctx.strokeStyle = '#4a4e54';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // USB Port Opening
    ctx.fillStyle = '#1c1e21';
    roundRect(ctx, 0, 33, 14, 14, 1);
    ctx.fill();

    // Internal Plastic Tongue
    ctx.fillStyle = '#3a3d42';
    ctx.fillRect(0, 38, 10, 4);

    // USB Mounting Solder Tabs
    ctx.fillStyle = '#b5b9c0';
    ctx.fillRect(14, 25, 4, 3);
    ctx.fillRect(14, 52, 4, 3);

    // --- 4. RESET BUTTON ---
    ctx.fillStyle = '#3a3d40';
    roundRect(ctx, 28, 33, 12, 14, 2);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Silver Button Cap & Plunger
    ctx.fillStyle = '#c5c9ce';
    ctx.beginPath();
    ctx.arc(34, 40, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(34, 40, 2, 0, Math.PI * 2);
    ctx.fill();

    // --- 5. ATMEGA328P IC (Center TQFP-32 Package) ---
    const chipX = 125;
    const chipY = 40;
    const chipS = 22;

    // Chip Pins (8 on each of the 4 sides)
    ctx.fillStyle = '#b0b5bc';
    for (let i = 0; i < 6; i++) {
      const offset = -7.5 + i * 3;
      // Top & Bottom pins
      ctx.fillRect(chipX + offset - 0.7, chipY - chipS/2 - 2.5, 1.4, 3);
      ctx.fillRect(chipX + offset - 0.7, chipY + chipS/2 - 0.5, 1.4, 3);
      // Left & Right pins
      ctx.fillRect(chipX - chipS/2 - 2.5, chipY + offset - 0.7, 3, 1.4);
      ctx.fillRect(chipX + chipS/2 - 0.5, chipY + offset - 0.7, 3, 1.4);
    }

    // Main Plastic Chip Body
    const chipGrad = ctx.createLinearGradient(chipX - 11, chipY - 11, chipX + 11, chipY + 11);
    chipGrad.addColorStop(0, '#2a2d32');
    chipGrad.addColorStop(1, '#15171a');
    ctx.fillStyle = chipGrad;
    roundRect(ctx, chipX - chipS/2, chipY - chipS/2, chipS, chipS, 2);
    ctx.fill();

    // Pin 1 Indicator Dot
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(chipX - 7, chipY - 7, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Chip Markings
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MEGA328P', chipX, chipY - 1);
    ctx.fillText('-AU', chipX, chipY + 6);

    // --- 6. 16 MHz CRYSTAL RESONATOR ---
    ctx.fillStyle = '#d0d4d9';
    roundRect(ctx, 95, 35, 14, 10, 4);
    ctx.fill();
    ctx.strokeStyle = '#7a7e85';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.fillStyle = '#555';
    ctx.font = 'bold 4.5px sans-serif';
    ctx.fillText('16.000', 102, 41);

    // --- 7. VOLTAGE REGULATOR (AMS1117-5.0 SOT-223) ---
    ctx.fillStyle = '#1c1e21';
    roundRect(ctx, 168, 33, 12, 14, 1);
    ctx.fill();
    // Metal Heat Tab
    ctx.fillStyle = '#b0b5bc';
    ctx.fillRect(166, 36, 2, 8);
    // 3 Pins
    ctx.fillRect(180, 34, 2.5, 2);
    ctx.fillRect(180, 39, 2.5, 2);
    ctx.fillRect(180, 44, 2.5, 2);

    // --- 8. STATUS LEDs (ON, L, TX, RX) ---
    const isD13Lit = sim && sim.pinStates && (sim.pinStates.D13 || sim.pinStates.pin_13);

    // Power LED (Green)
    drawSMD_LED(ctx, 48, 28, '#22ff44', true, 'ON');
    // Pin 13 LED (Yellow/Amber)
    drawSMD_LED(ctx, 48, 40, '#ffaa00', isD13Lit, 'L');
    // TX LED
    drawSMD_LED(ctx, 48, 49, '#ffaa00', false, 'TX');
    // RX LED
    drawSMD_LED(ctx, 48, 58, '#ffaa00', false, 'RX');

    // --- 9. PASSIVE COMPONENTS (SMD Resistors & Capacitors) ---
    drawSMD_Component(ctx, 62, 33, '#a57548'); // Tan Capacitor
    drawSMD_Component(ctx, 62, 42, '#333333'); // Black Resistor
    drawSMD_Component(ctx, 62, 50, '#333333'); // Black Resistor
    drawSMD_Component(ctx, 72, 36, '#a57548'); // Tan Capacitor
    drawSMD_Component(ctx, 72, 46, '#a57548'); // Tan Capacitor
    drawSMD_Component(ctx, 150, 35, '#333333');
    drawSMD_Component(ctx, 150, 45, '#a57548');

    // --- 10. 2x3 ICSP HEADER (Right Edge) ---
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 192, 31, 14, 18, 1);
    ctx.fill();
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = '#d4af37'; // Gold pins
        ctx.beginPath();
        ctx.arc(195 + c * 4, 35 + r * 10, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- 11. SILKSCREEN BRANDING TEXT ---
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Arduino', 82, 28);
    ctx.font = '8px sans-serif';
    ctx.fillText('NANO', 82, 57);

    ctx.font = 'bold 5px sans-serif';
    ctx.fillText('ICSP', 199, 28);

    if (inst.selected) drawSelectionRect(ctx, -2, -2, W + 4, H + 4);
    ctx.restore();
  }
});

// --- HELPER DRAWING FUNCTIONS ---

function drawPinPad(ctx, x, y) {
  // Outer Copper/Gold Ring
  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.arc(x, y, 3.8, 0, Math.PI * 2);
  ctx.fill();

  // Silver Solder Collar
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(x, y, 2.6, 0, Math.PI * 2);
  ctx.fill();

  // Center Drill Hole
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(x, y, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawSMD_LED(ctx, x, y, color, isLit, label) {
  // Metallic End Caps
  ctx.fillStyle = '#a0a5ad';
  ctx.fillRect(x - 3, y - 1.5, 6, 3);

  // LED Body
  ctx.fillStyle = isLit ? color : '#3a3d40';
  ctx.fillRect(x - 1.8, y - 1.5, 3.6, 3);

  // Glow Effect when Lit
  if (isLit) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, y - 1, 2, 2);
    ctx.shadowBlur = 0; // Reset
  }

  // Tiny Silkscreen Label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 5px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 5, y + 2);
}

function drawSMD_Component(ctx, x, y, bodyColor) {
  ctx.fillStyle = '#b0b5bc';
  ctx.fillRect(x - 2.5, y - 1.2, 5, 2.4);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x - 1.5, y - 1.2, 3, 2.4);
}

/* ──────────────────── esp32_devkit_v1 BOARDS ──────────────────── */
defComp({
  id: 'esp32_devkit_v1',
  name: 'ESP32 DevKit V1',
  category: 'Boards',
  icon: '🛜',
  desc: 'ESP-WROOM-32 dual-core 3.3V WiFi/BLE development board',
  width: 170,
  height: 272,
  defaultProps: { label: 'ESP32' },
  pins: [
    // Left header (from top)
    { id: 'EN', label: 'EN', type: PIN_TYPE.SIGNAL, x: 16, y: 40, side: 'left', gpio: 0 },
    { id: 'VP', label: 'VP', type: PIN_TYPE.ANALOG, x: 16, y: 55, side: 'left', gpio: 36 },
    { id: 'VN', label: 'VN', type: PIN_TYPE.ANALOG, x: 16, y: 70, side: 'left', gpio: 39 },
    { id: 'D34', label: 'D34', type: PIN_TYPE.ANALOG, x: 16, y: 85, side: 'left', gpio: 34 },
    { id: 'D35', label: 'D35', type: PIN_TYPE.ANALOG, x: 16, y: 100, side: 'left', gpio: 35 },
    { id: 'D32', label: 'D32', type: PIN_TYPE.ANALOG, x: 16, y: 115, side: 'left', gpio: 32 },
    { id: 'D33', label: 'D33', type: PIN_TYPE.ANALOG, x: 16, y: 130, side: 'left', gpio: 33 },
    { id: 'D25', label: 'D25', type: PIN_TYPE.ANALOG, x: 16, y: 145, side: 'left', gpio: 25 },
    { id: 'D26', label: 'D26', type: PIN_TYPE.ANALOG, x: 16, y: 160, side: 'left', gpio: 26 },
    { id: 'D27', label: 'D27', type: PIN_TYPE.PWM, x: 16, y: 175, side: 'left', gpio: 27 },
    { id: 'D14', label: 'D14', type: PIN_TYPE.PWM, x: 16, y: 190, side: 'left', gpio: 14 },
    { id: 'D12', label: 'D12', type: PIN_TYPE.PWM, x: 16, y: 205, side: 'left', gpio: 12 },
    { id: 'D13', label: 'D13', type: PIN_TYPE.PWM, x: 16, y: 220, side: 'left', gpio: 13 },
    { id: 'GND1', label: 'GND', type: PIN_TYPE.GND, x: 16, y: 235, side: 'left' },
    { id: 'VIN', label: 'VIN', type: PIN_TYPE.POWER, x: 16, y: 250, side: 'left' },
    // Right header (from top)
    { id: 'D23', label: 'D23', type: PIN_TYPE.PWM, x: 154, y: 40, side: 'right', gpio: 23 },
    { id: 'D22', label: 'D22', type: PIN_TYPE.PWM, x: 154, y: 55, side: 'right', gpio: 22 },
    { id: 'TX0', label: 'TX0', type: PIN_TYPE.SIGNAL, x: 154, y: 70, side: 'right', gpio: 1 },
    { id: 'RX0', label: 'RX0', type: PIN_TYPE.SIGNAL, x: 154, y: 85, side: 'right', gpio: 3 },
    { id: 'D21', label: 'D21', type: PIN_TYPE.PWM, x: 154, y: 100, side: 'right', gpio: 21 },
    { id: 'D19', label: 'D19', type: PIN_TYPE.PWM, x: 154, y: 115, side: 'right', gpio: 19 },
    { id: 'D18', label: 'D18', type: PIN_TYPE.PWM, x: 154, y: 130, side: 'right', gpio: 18 },
    { id: 'D5', label: 'D5', type: PIN_TYPE.PWM, x: 154, y: 145, side: 'right', gpio: 5 },
    { id: 'D17', label: 'D17', type: PIN_TYPE.PWM, x: 154, y: 160, side: 'right', gpio: 17 },
    { id: 'D16', label: 'D16', type: PIN_TYPE.PWM, x: 154, y: 175, side: 'right', gpio: 16 },
    { id: 'D4', label: 'D4', type: PIN_TYPE.PWM, x: 154, y: 190, side: 'right', gpio: 4 },
    { id: 'D2', label: 'D2', type: PIN_TYPE.PWM, x: 154, y: 205, side: 'right', gpio: 2 },
    { id: 'D15', label: 'D15', type: PIN_TYPE.PWM, x: 154, y: 220, side: 'right', gpio: 15 },
    { id: 'GND2', label: 'GND', type: PIN_TYPE.GND, x: 154, y: 235, side: 'right' },
    { id: '3V3', label: '3V3', type: PIN_TYPE.POWER, x: 154, y: 250, side: 'right' },
  ],
  draw(ctx, inst, sim) {
    const { x, y, width: W, height: H } = inst;
    const WROOM_W = 92, WROOM_H = 118, WROOM_X = 39, WROOM_Y = 22;

    ctx.save();
    ctx.translate(x, y);

    // ── PCB Body ──
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#16202a');
    grad.addColorStop(0.3, '#1e2d3a');
    grad.addColorStop(0.6, '#1a2632');
    grad.addColorStop(1, '#0e151d');
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, W, H, 6);
    ctx.fill();

    ctx.shadowColor = 'rgba(0,100,200,0.05)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#2a3a4a';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 0, 0, W, H, 6);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── PCB Antenna Pattern ──
    ctx.strokeStyle = '#c8b06a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(WROOM_X + 15, WROOM_Y - 4);
    ctx.lineTo(WROOM_X + 77, WROOM_Y - 4);
    ctx.lineTo(WROOM_X + 77, WROOM_Y - 14);
    ctx.lineTo(WROOM_X + 60, WROOM_Y - 14);
    ctx.lineTo(WROOM_X + 60, WROOM_Y - 8);
    ctx.lineTo(WROOM_X + 40, WROOM_Y - 8);
    ctx.lineTo(WROOM_X + 40, WROOM_Y - 14);
    ctx.lineTo(WROOM_X + 15, WROOM_Y - 14);
    ctx.stroke();

    // ── Silkscreen Frame ──
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    roundRect(ctx, 3, 3, W - 6, H - 6, 5);
    ctx.stroke();

    // ── ESP-WROOM-32 Metal Shield ──
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#b8c2cc';
    roundRect(ctx, WROOM_X, WROOM_Y, WROOM_W, WROOM_H, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    const shieldGrad = ctx.createLinearGradient(WROOM_X, WROOM_Y, WROOM_X, WROOM_Y + WROOM_H);
    shieldGrad.addColorStop(0, '#d0d8e0');
    shieldGrad.addColorStop(0.3, '#c0c8d0');
    shieldGrad.addColorStop(0.7, '#b0b8c0');
    shieldGrad.addColorStop(1, '#a0a8b0');
    ctx.fillStyle = shieldGrad;
    roundRect(ctx, WROOM_X, WROOM_Y, WROOM_W, WROOM_H, 3);
    ctx.fill();

    ctx.strokeStyle = '#8a949e';
    ctx.lineWidth = 1;
    roundRect(ctx, WROOM_X, WROOM_Y, WROOM_W, WROOM_H, 3);
    ctx.stroke();

    // Shield trace grid pattern
    ctx.strokeStyle = 'rgba(60,70,80,0.2)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(WROOM_X + 6, WROOM_Y + 14 + i * 9);
      ctx.lineTo(WROOM_X + WROOM_W - 6, WROOM_Y + 14 + i * 9);
      ctx.stroke();
    }

    // Shield Text
    ctx.fillStyle = '#2a333d';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ESP-WROOM-32', WROOM_X + WROOM_W / 2, WROOM_Y + WROOM_H / 2 + 8);
    ctx.font = '5px monospace';
    ctx.fillStyle = '#3a4350';
    ctx.fillText('FLASH 4MB · DUAL CORE · WiFi+BT', WROOM_X + WROOM_W / 2, WROOM_Y + WROOM_H / 2 + 22);

    // ── Crystal Oscillator ──
    ctx.fillStyle = '#0d0d0d';
    roundRect(ctx, 8, 34, 16, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#3d464e';
    roundRect(ctx, 146, 34, 16, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#aaa';
    ctx.font = '4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('32kHz', 16, 42);

    // ── USB Connector ──
    ctx.fillStyle = '#5a6370';
    roundRect(ctx, W / 2 - 11, H - 26, 22, 26, 3);
    ctx.fill();
    ctx.fillStyle = '#2a2f36';
    roundRect(ctx, W / 2 - 7, H - 20, 14, 8, 1);
    ctx.fill();
    ctx.fillStyle = '#c8b06a';
    for (let i = 0; i < 4; i++) {
      roundRect(ctx, W / 2 - 5 + i * 3, H - 18, 1.5, 4, 0.5);
      ctx.fill();
    }

    // ── Tactile Buttons ──
    const drawButton = (bx, label) => {
      ctx.fillStyle = '#222';
      roundRect(ctx, bx - 6, H - 20, 12, 10, 2);
      ctx.fill();
      ctx.fillStyle = '#555';
      roundRect(ctx, bx - 4, H - 18, 8, 6, 1);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 4px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, bx, H - 22);
    };
    drawButton(30, 'EN');
    drawButton(W - 30, 'BOOT');

    // ── Header Strips ──
    const pinsList = inst.pins || this.pins || [];
    const leftYs = pinsList.filter(p => p.side === 'left').map(p => p.y);
    const rightYs = pinsList.filter(p => p.side === 'right').map(p => p.y);

    const drawVertHeader = (hx, holeYs, holeX) => {
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#14181c';
      roundRect(ctx, hx, 32, 16, H - 62, 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      for (const hy of holeYs) {
        ctx.fillStyle = '#c8b06a';
        ctx.shadowColor = 'rgba(200,176,106,0.2)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(holeX, hy, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0a0a0c';
        ctx.beginPath();
        ctx.arc(holeX, hy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawVertHeader(8, leftYs, 16);
    drawVertHeader(146, rightYs, 154);

    // ── Pin Labels ──
    ctx.font = 'bold 5px monospace';
    for (const pin of pinsList) {
      const pw = ctx.measureText(pin.label).width + 4;
      const bx = pin.side === 'left' ? pin.x - 3 - pw : pin.x + 3;

      let bgColor = 'rgba(6,12,18,0.85)';
      if (pin.type === PIN_TYPE.POWER) bgColor = 'rgba(180,40,40,0.8)';
      else if (pin.type === PIN_TYPE.GND) bgColor = 'rgba(40,40,40,0.8)';
      else if (pin.type === PIN_TYPE.ANALOG) bgColor = 'rgba(30,80,120,0.8)';
      else if (pin.type === PIN_TYPE.PWM) bgColor = 'rgba(120,80,30,0.8)';

      ctx.fillStyle = bgColor;
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 2;
      roundRect(ctx, bx, pin.y - 3.5, pw, 7, 1.5);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#dbe4ea';
      ctx.textAlign = pin.side === 'left' ? 'right' : 'left';
      ctx.fillText(pin.label, bx + (pin.side === 'left' ? pw - 2 : 2), pin.y + 1.5);
    }

    // ── Built-in LED (GPIO2) ──
    const ledCx = 66, ledCy = 208;
    const lit = sim && sim.pinStates && (sim.pinStates.pin_2 || 0) > 0;
    drawLED_on_board(ctx, ledCx, ledCy, lit ? '#ffdd33' : '#444', 4);
    ctx.fillStyle = '#8b949e';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('L', ledCx, ledCy + 10);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '4px monospace';
    ctx.fillText('GPIO2', ledCx, ledCy - 6);

    // ── WiFi STATUS ICON (HIGH VISIBILITY WITH BACKGROUND BOX) ──
    const wifiX = WROOM_X + WROOM_W / 2;
    const wifiY = WROOM_Y + 22;
    const wifiOn = sim && (sim._wifiConnected || sim.wifiConnected);
    const wifiColor = wifiOn ? '#00f0ff' : '#667788';

    ctx.save();

    // WiFi Badge Container Box
    const bgW = 36;
    const bgH = 28;
    const bgX = wifiX - bgW / 2;
    const bgY = wifiY - 13;

    ctx.fillStyle = '#0f141c';
    roundRect(ctx, bgX, bgY, bgW, bgH, 3);
    ctx.fill();

    ctx.strokeStyle = wifiOn ? 'rgba(0, 240, 255, 0.6)' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, bgX, bgY, bgW, bgH, 3);
    ctx.stroke();

    // Active Glow effect
    if (wifiOn) {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
    }

    ctx.strokeStyle = wifiColor;
    ctx.fillStyle = wifiColor;
    ctx.lineCap = 'round';

    // Base point
    ctx.beginPath();
    ctx.arc(wifiX, wifiY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Concentric WiFi Arcs
    const startAngle = -Math.PI * 0.75; // -135°
    const endAngle = -Math.PI * 0.25;   // -45°
    const arcs = [4, 7, 10];

    arcs.forEach(r => {
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(wifiX, wifiY, r, startAngle, endAngle);
      ctx.stroke();
    });

    // WiFi Text Label
    ctx.shadowBlur = 0;
    ctx.fillStyle = wifiOn ? '#00f0ff' : '#8899aa';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WiFi', wifiX, wifiY + 11);
    ctx.restore();

    // ── Board Name ──
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ESP32', W / 2, H - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '8px monospace';
    ctx.fillText('DEVKIT V1', W / 2, H - 0.5);
    ctx.shadowBlur = 0;

    // ── Selection Outline ──
    if (inst.selected) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      roundRect(ctx, -3, -3, W + 6, H + 6, 8);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
});



function drawHeaderStrip(ctx, x, y, width, holeXs, baselineY, pinColor = '#c8b06a') {
  // Black strip
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 3;
  ctx.fillStyle = '#111111';
  roundRect(ctx, x, baselineY - 10, width, 20, 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 0.5;
  roundRect(ctx, x, baselineY - 10, width, 20, 2);
  ctx.stroke();

  // Pins
  for (const hx of holeXs) {
    ctx.fillStyle = pinColor;
    ctx.shadowColor = 'rgba(200,176,106,0.2)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(hx, baselineY, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b0b0d';
    ctx.beginPath();
    ctx.arc(hx, baselineY, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Helper: drawLED_on_board (enhanced) ───
function drawLED_on_board(ctx, cx, cy, color, radius) {
  // LED glow
  if (color !== '#444' && color !== '#555') {
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
  }
  // LED body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // LED highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // LED ring
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
}