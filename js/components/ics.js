/* ═══════════════════════════════════════════════════════════
   components/ics.js — Digital IC component definitions
   Real 74-series & 555 DIP pinouts (breadboard 17px pin spacing)
   
   Standard Horizontal DIP Pinout Rules (Notch on LEFT):
   - Bottom row (x=0 to right): Pins 1, 2, ..., N/2
   - Top row (x=0 to right):    Pins N, N-1, ..., (N/2)+1
   - Pin 1 dot: Located at lower-left near Pin 1
   - Notch: Semi-circle on left edge of IC body
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════════
   555 TIMER IC (NE555 / LM555) — 8-Pin DIP
   
   Real pinout:
   Pin 1: GND    Pin 8: VCC
   Pin 2: TRIG   Pin 7: DIS (Discharge)
   Pin 3: OUT    Pin 6: THR (Threshold)
   Pin 4: RST    Pin 5: CV  (Control Voltage)
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_555',
  name: '555 Timer IC',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'NE555 precision timer — operates in astable, monostable, or bistable mode',
  width: 68,
  height: 50,
  defaultProps: { mode: 'astable', frequency: 1000, dutyCycle: 50 },
  pins: [
    /* Bottom row (pins 1-4, left to right) */
    { id: 'GND',  label: '1', type: PIN_TYPE.GND,     x:  0, y: 50, side: 'bottom' },
    { id: 'TRIG', label: '2', type: PIN_TYPE.DIGITAL, x: 17, y: 50, side: 'bottom' },
    { id: 'OUT',  label: '3', type: PIN_TYPE.DIGITAL, x: 34, y: 50, side: 'bottom' },
    { id: 'RST',  label: '4', type: PIN_TYPE.DIGITAL, x: 51, y: 50, side: 'bottom' },
    /* Top row (pins 8-5, left to right) */
    { id: 'VCC',  label: '8', type: PIN_TYPE.POWER,   x:  0, y:  0, side: 'top' },
    { id: 'DIS',  label: '7', type: PIN_TYPE.DIGITAL, x: 17, y:  0, side: 'top' },
    { id: 'THR',  label: '6', type: PIN_TYPE.DIGITAL, x: 34, y:  0, side: 'top' },
    { id: 'CV',   label: '5', type: PIN_TYPE.SIGNAL,  x: 51, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const outHigh = inst.runtimeState && inst.runtimeState.outHigh;

    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    [0, 17, 34, 51].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    });

    // DIP body
    const grad = ctx.createLinearGradient(0, 10, 68, 40);
    grad.addColorStop(0, '#1a1a1a');
    grad.addColorStop(1, '#0c0c0c');
    ctx.fillStyle = grad;
    roundRect(ctx, -6, 10, 63, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Left notch
    ctx.beginPath();
    ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666';
    ctx.stroke();

    // Pin 1 dot (bottom-left)
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(0, 32, 2, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NE555', 25, 23);

    // Output indicator LED
    ctx.fillStyle = outHigh ? '#33ff66' : '#334433';
    ctx.beginPath();
    ctx.arc(25, 32, 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (outHigh) { ctx.shadowColor = '#33ff66'; ctx.shadowBlur = 4; }
    ctx.beginPath();
    ctx.arc(25, 32, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 72, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC00 — Quad 2-Input NAND Gate (14-pin DIP)
   
   Real pinout:
   Pin 1: 1A    Pin 8:  3Y
   Pin 2: 1B    Pin 9:  3A
   Pin 3: 1Y    Pin 10: 3B
   Pin 4: 2A    Pin 11: 4Y
   Pin 5: 2B    Pin 12: 4A
   Pin 6: 2Y    Pin 13: 4B
   Pin 7: GND   Pin 14: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc00',
  name: '74HC00 Quad NAND',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Quad 2-input NAND gate — outputs LOW only when both inputs are HIGH',
  width: 119,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-7, left to right) */
    { id: 'A1',  label: '1A',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'B1',  label: '1B',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'Y1',  label: '1Y',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'A2',  label: '2A',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'B2',  label: '2B',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'Y2',  label: '2Y',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND,     x: 102, y: 50, side: 'bottom' },
    /* Top row (pins 14-8, left to right) */
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'B4',  label: '4B',  type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'A4',  label: '4A',  type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'Y4',  label: '4Y',  type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'B3',  label: '3B',  type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'A3',  label: '3A',  type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'Y3',  label: '3Y',  type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 114, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC00', 51, 23);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Quad NAND', 51, 32);

    // NAND Gate symbols
    const drawNandGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 3); ctx.lineTo(cx, cy - 3);
      ctx.arc(cx, cy, 3, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(cx - 5, cy + 3); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 4, cy, 1, 0, Math.PI * 2); ctx.stroke();
    };
    drawNandGate(20, 25); drawNandGate(36, 25);
    drawNandGate(66, 25); drawNandGate(82, 25);

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 123, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC04 — Hex Inverter / NOT Gate (14-pin DIP)
   
   Real pinout:
   Pin 1: 1A    Pin 8:  4Y
   Pin 2: 1Y    Pin 9:  4A
   Pin 3: 2A    Pin 10: 5Y
   Pin 4: 2Y    Pin 11: 5A
   Pin 5: 3A    Pin 12: 6Y
   Pin 6: 3Y    Pin 13: 6A
   Pin 7: GND   Pin 14: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc04',
  name: '74HC04 Hex NOT',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Hex inverter — 6 NOT gates that invert input signals',
  width: 119,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-7) */
    { id: 'A1',  label: '1',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'Y1',  label: '2',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'A2',  label: '3',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'Y2',  label: '4',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'A3',  label: '5',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'Y3',  label: '6',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'GND', label: '7',  type: PIN_TYPE.GND,     x: 102, y: 50, side: 'bottom' },
    /* Top row (pins 14-8) */
    { id: 'VCC', label: '14', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'A6',  label: '13', type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'Y6',  label: '12', type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'A5',  label: '11', type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'Y5',  label: '10', type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'A4',  label: '9',  type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'Y4',  label: '8',  type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 114, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC04', 51, 23);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Hex NOT', 51, 32);

    // NOT gate symbols
    const drawNotGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 3); ctx.lineTo(cx + 2, cy); ctx.lineTo(cx - 4, cy + 3);
      ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 3.5, cy, 1, 0, Math.PI * 2); ctx.stroke();
    };
    drawNotGate(18, 25); drawNotGate(34, 25); drawNotGate(68, 25); drawNotGate(84, 25);

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 123, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC08 — Quad 2-Input AND Gate (14-pin DIP)
   
   Real pinout:
   Pin 1: 1A    Pin 8:  3Y
   Pin 2: 1B    Pin 9:  3A
   Pin 3: 1Y    Pin 10: 3B
   Pin 4: 2A    Pin 11: 4Y
   Pin 5: 2B    Pin 12: 4A
   Pin 6: 2Y    Pin 13: 4B
   Pin 7: GND   Pin 14: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc08',
  name: '74HC08 Quad AND',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Quad 2-input AND gate — outputs HIGH only when both inputs are HIGH',
  width: 119,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-7, left to right) */
    { id: 'A1',  label: '1A',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'B1',  label: '1B',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'Y1',  label: '1Y',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'A2',  label: '2A',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'B2',  label: '2B',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'Y2',  label: '2Y',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND,     x: 102, y: 50, side: 'bottom' },
    /* Top row (pins 14-8, left to right) */
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'B4',  label: '4B',  type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'A4',  label: '4A',  type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'Y4',  label: '4Y',  type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'B3',  label: '3B',  type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'A3',  label: '3A',  type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'Y3',  label: '3Y',  type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 114, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC08', 51, 23);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Quad AND', 51, 32);

    // AND gate symbols
    const drawAndGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 3); ctx.lineTo(cx, cy - 3);
      ctx.arc(cx, cy, 3, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(cx - 5, cy + 3); ctx.closePath(); ctx.stroke();
    };
    drawAndGate(20, 25); drawAndGate(36, 25);
    drawAndGate(66, 25); drawAndGate(82, 25);

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 123, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC32 — Quad 2-Input OR Gate (14-pin DIP)
   
   Real pinout:
   Pin 1: 1A    Pin 8:  3Y
   Pin 2: 1B    Pin 9:  3A
   Pin 3: 1Y    Pin 10: 3B
   Pin 4: 2A    Pin 11: 4Y
   Pin 5: 2B    Pin 12: 4A
   Pin 6: 2Y    Pin 13: 4B
   Pin 7: GND   Pin 14: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc32',
  name: '74HC32 Quad OR',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Quad 2-input OR gate — outputs HIGH when either input is HIGH',
  width: 119,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-7, left to right) */
    { id: 'A1',  label: '1A',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'B1',  label: '1B',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'Y1',  label: '1Y',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'A2',  label: '2A',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'B2',  label: '2B',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'Y2',  label: '2Y',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND,     x: 102, y: 50, side: 'bottom' },
    /* Top row (pins 14-8, left to right) */
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'B4',  label: '4B',  type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'A4',  label: '4A',  type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'Y4',  label: '4Y',  type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'B3',  label: '3B',  type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'A3',  label: '3A',  type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'Y3',  label: '3Y',  type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 114, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC32', 51, 23);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Quad OR', 51, 32);

    // OR gate symbols
    const drawOrGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 3);
      ctx.quadraticCurveTo(cx - 1, cy, cx - 5, cy + 3);
      ctx.quadraticCurveTo(cx + 1, cy + 4, cx + 5, cy);
      ctx.quadraticCurveTo(cx + 1, cy - 4, cx - 5, cy - 3);
      ctx.stroke();
    };
    drawOrGate(20, 25); drawOrGate(36, 25);
    drawOrGate(66, 25); drawOrGate(82, 25);

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 123, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC595 — 8-Bit Shift Register (16-pin DIP)
   
   Real pinout:
   Pin 1: QB      Pin 9:  QH' (Serial Out / Q7S)
   Pin 2: QC      Pin 10: SRCLR' (Shift Register Clear)
   Pin 3: QD      Pin 11: SRCLK (Shift Clock)
   Pin 4: QE      Pin 12: RCLK (Latch Clock)
   Pin 5: QF      Pin 13: OE' (Output Enable)
   Pin 6: QG      Pin 14: SER (Serial Input)
   Pin 7: QH      Pin 15: QA
   Pin 8: GND     Pin 16: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc595',
  name: '74HC595 Shift Reg',
  category: 'Digital ICs',
  icon: '⮗',
  desc: '8-bit serial-in parallel-out shift register with output latch',
  width: 136,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-8, left to right) */
    { id: 'QA',    label: 'Q0',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'QB',    label: 'Q1',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'QC',    label: 'Q2',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'QD',    label: 'Q3',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'QE',    label: 'Q4',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'QF',    label: 'Q5',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'QG',    label: 'Q6',  type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
    { id: 'GND',   label: 'GND', type: PIN_TYPE.GND,     x: 119, y: 50, side: 'bottom' },
    /* Top row (pins 16-9, left to right) */
    { id: 'VCC',   label: 'VCC', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'QHn',   label: "Q7'",type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'QH',    label: 'Q7',  type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'SRCLR', label: '/RST', type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'SRCLK', label: 'SRCLK',type:PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'RCLK',  label: 'RCLK',type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'OE',    label: '/OE', type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
    { id: 'SER',   label: 'SER', type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const state = inst.runtimeState || {};
    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 7; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 131, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC595', 59, 21);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('8-Bit Shift Reg', 59, 28);

    // Output state indicators (8 LEDs for QA-QH)
    const bits = state.bits || 0;
    for (let i = 0; i < 8; i++) {
      const bitOn = (bits >> i) & 1;
      const lx = 8 + i * 14;
      ctx.fillStyle = bitOn ? '#33ff66' : '#334433';
      ctx.beginPath();
      ctx.arc(lx, 34, 2, 0, Math.PI * 2);
      ctx.fill();
      if (bitOn) { ctx.shadowColor = '#33ff66'; ctx.shadowBlur = 3; }
      ctx.beginPath();
      ctx.arc(lx, 34, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 140, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC138 — 3-to-8 Line Decoder (16-pin DIP)
   
   Real pinout:
   Pin 1: A0 (Addr bit 0)    Pin 9:  Y6' (Output 6)
   Pin 2: A1 (Addr bit 1)    Pin 10: Y5' (Output 5)
   Pin 3: A2 (Addr bit 2)    Pin 11: Y4' (Output 4)
   Pin 4: G2A' (Enable 2A)   Pin 12: Y3' (Output 3)
   Pin 5: G2B' (Enable 2B)   Pin 13: Y2' (Output 2)
   Pin 6: G1   (Enable 1)    Pin 14: Y1' (Output 1)
   Pin 7: Y7' (Output 7)     Pin 15: Y0' (Output 0)
   Pin 8: GND                Pin 16: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc138',
  name: '74HC138 Decoder',
  category: 'Digital ICs',
  icon: '⮗',
  desc: '3-to-8 line decoder — activates one of 8 active-LOW outputs based on 3-bit address',
  width: 136,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-8, left to right) */
    { id: 'A0',   label: 'A0',   type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'A1',   label: 'A1',   type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'A2',   label: 'A2',   type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'G2A',  label: 'G2A',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'G2B',  label: 'G2B',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'G1',   label: 'G1',   type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'Y7',   label: 'Y7',   type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
    { id: 'GND',  label: 'GND',  type: PIN_TYPE.GND,     x: 119, y: 50, side: 'bottom' },
    /* Top row (pins 16-9, left to right) */
    { id: 'VCC',  label: 'VCC',  type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'Y0',   label: 'Y0',   type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'Y1',   label: 'Y1',   type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'Y2',   label: 'Y2',   type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'Y3',   label: 'Y3',   type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'Y4',   label: 'Y4',   type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'Y5',   label: 'Y5',   type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
    { id: 'Y6',   label: 'Y6',   type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const state = inst.runtimeState || {};
    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 7; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 131, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC138', 59, 21);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('3-to-8 Decoder', 59, 28);

    // Active output indicator LEDs (8 LEDs)
    const activeY = state.activeOutput;
    for (let i = 0; i < 8; i++) {
      const isActive = activeY === i;
      const lx = 8 + i * 14;
      ctx.fillStyle = isActive ? '#ff3333' : '#332222';
      ctx.beginPath();
      ctx.arc(lx, 34, 2, 0, Math.PI * 2);
      ctx.fill();
      if (isActive) { ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 3; }
      ctx.beginPath();
      ctx.arc(lx, 34, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 140, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC245 — Octal Bus Transceiver (Full 20-pin DIP)
   
   Real pinout:
   Pin 1: DIR    Pin 11: B8
   Pin 2: A1     Pin 12: B7
   Pin 3: A2     Pin 13: B6
   Pin 4: A3     Pin 14: B5
   Pin 5: A4     Pin 15: B4
   Pin 6: A5     Pin 16: B3
   Pin 7: A6     Pin 17: B2
   Pin 8: A7     Pin 18: B1
   Pin 9: A8     Pin 19: OE'
   Pin 10: GND   Pin 20: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc245',
  name: '74HC245 Bus Xcvr',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Octal bus transceiver — bidirectional 8-bit data buffer with 3-state outputs',
  width: 170,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-10, left to right) */
    { id: 'DIR', label: 'DIR', type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'A1',  label: 'A1',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'A2',  label: 'A2',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'A3',  label: 'A3',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'A4',  label: 'A4',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'A5',  label: 'A5',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'A6',  label: 'A6',  type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
    { id: 'A7',  label: 'A7',  type: PIN_TYPE.DIGITAL, x: 119, y: 50, side: 'bottom' },
    { id: 'A8',  label: 'A8',  type: PIN_TYPE.DIGITAL, x: 136, y: 50, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND,     x: 153, y: 50, side: 'bottom' },
    /* Top row (pins 20-11, left to right) */
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'OE',  label: '/OE', type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'B1',  label: 'B1',  type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'B2',  label: 'B2',  type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'B3',  label: 'B3',  type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'B4',  label: 'B4',  type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'B5',  label: 'B5',  type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
    { id: 'B6',  label: 'B6',  type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
    { id: 'B7',  label: 'B7',  type: PIN_TYPE.DIGITAL, x: 136, y:  0, side: 'top' },
    { id: 'B8',  label: 'B8',  type: PIN_TYPE.DIGITAL, x: 153, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const state = inst.runtimeState || {};
    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 9; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 165, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC245', 76, 21);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Bus Transceiver', 76, 28);

    // Direction indicator arrow
    const dir = state.direction; // true = A to B, false = B to A
    ctx.strokeStyle = dir ? '#33ff66' : '#ff3333';
    ctx.lineWidth = 1.5;
    if (dir) {
      ctx.beginPath(); ctx.moveTo(66, 34); ctx.lineTo(86, 34);
      ctx.lineTo(82, 31); ctx.moveTo(86, 34); ctx.lineTo(82, 37);
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(86, 34); ctx.lineTo(66, 34);
      ctx.lineTo(70, 31); ctx.moveTo(66, 34); ctx.lineTo(70, 37);
      ctx.stroke();
    }
    ctx.fillStyle = '#888';
    ctx.font = '5px sans-serif';
    ctx.fillText('A', 60, 36);
    ctx.fillText('B', 92, 36);

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 174, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC74 — Dual D-Type Flip-Flop (14-pin DIP)
   
   Real pinout:
   Pin 1: 1CLR'  Pin 8:  2CLK
   Pin 2: 1D     Pin 9:  2D
   Pin 3: 1CLK   Pin 10: 2CLR'
   Pin 4: 1PRE'  Pin 11: 2PRE'
   Pin 5: 1Q     Pin 12: 2Q
   Pin 6: 1Q'    Pin 13: 2Q'
   Pin 7: GND    Pin 14: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc74',
  name: '74HC74 Dual DFF',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Dual D-type flip-flop — positive-edge triggered with preset and clear',
  width: 119,
  height: 50,
  defaultProps: {},
  pins: [
    { id: 'CLR1', label: '/CLR1', type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'D1',   label: 'D1',    type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'CLK1', label: 'CLK1',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'PRE1', label: '/PRE1', type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'Q1',   label: 'Q1',    type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'Q1n',  label: "Q1'",   type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'GND',  label: 'GND',   type: PIN_TYPE.GND,     x: 102, y: 50, side: 'bottom' },
    { id: 'VCC',  label: 'VCC',   type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'CLK2', label: 'CLK2',  type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'Q2n',  label: "Q2'",   type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'Q2',   label: 'Q2',    type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'PRE2', label: '/PRE2', type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'CLR2', label: '/CLR2', type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'D2',   label: 'D2',    type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 114, 30, 3); ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC74', 51, 23);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Dual D Flip-Flop', 51, 32);
    // Q output indicators
    const state = inst.runtimeState || {};
    const drawQ = (cx, high) => {
      ctx.fillStyle = high ? '#33ff66' : '#334433';
      ctx.beginPath(); ctx.arc(cx, 36, 2, 0, Math.PI * 2); ctx.fill();
      if (high) { ctx.shadowColor = '#33ff66'; ctx.shadowBlur = 3; ctx.beginPath(); ctx.arc(cx, 36, 2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    };
    drawQ(68, state.Q1); drawQ(85, state.Q2);
    if (inst.selected) drawSelectionRect(ctx, -10, -4, 123, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC165 — 8-Bit Parallel-In Shift Register (16-pin DIP)
   
   Real pinout:
   Pin 1: SH/LD'   Pin 9:  Q7'
   Pin 2: CLK       Pin 10: SER
   Pin 3: E         Pin 11: F
   Pin 4: F         Pin 12: G
   Pin 5: G         Pin 13: H
   Pin 6: H         Pin 14: CLK INH
   Pin 7: Q7        Pin 15: A
   Pin 8: GND       Pin 16: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc165',
  name: '74HC165 PISO',
  category: 'Digital ICs',
  icon: '⮗',
  desc: '8-bit parallel-in serial-out shift register',
  width: 136,
  height: 50,
  defaultProps: {},
  pins: [
    { id: 'SHLD',  label: '/SHLD', type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'CLK',   label: 'CLK',   type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'E',     label: 'E',     type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'F',     label: 'F',     type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'G',     label: 'G',     type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'H',     label: 'H',     type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'Q7',    label: 'Q7',    type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
    { id: 'GND',   label: 'GND',   type: PIN_TYPE.GND,     x: 119, y: 50, side: 'bottom' },
    { id: 'VCC',   label: 'VCC',   type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'A',     label: 'A',     type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'CLKINH',label: 'CLKINH',type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'Hn',    label: "H'",    type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'Gn',    label: "G'",    type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'Fn',    label: "F'",    type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'SER',   label: 'SER',   type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
    { id: 'Q7n',   label: "Q7'",   type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const state = inst.runtimeState || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
    for (let i = 0; i <= 7; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 131, 30, 3); ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC165', 59, 21);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('8-Bit PISO Shift Reg', 59, 28);
    const bits = state.bits || 0;
    for (let i = 0; i < 8; i++) {
      const bitOn = (bits >> (7 - i)) & 1;
      const lx = 8 + i * 14;
      ctx.fillStyle = bitOn ? '#33ff66' : '#334433';
      ctx.beginPath(); ctx.arc(lx, 34, 2, 0, Math.PI * 2); ctx.fill();
      if (bitOn) { ctx.shadowColor = '#33ff66'; ctx.shadowBlur = 3; ctx.beginPath(); ctx.arc(lx, 34, 2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    }
    if (inst.selected) drawSelectionRect(ctx, -10, -4, 140, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC193 — 4-Bit Synchronous Up/Down Counter (16-pin DIP)
   
   Real pinout:
   Pin 1: CPU (Count Up)    Pin 9:  BO' (Borrow)
   Pin 2: CPD (Count Down)  Pin 10: CO' (Carry)
   Pin 3: PL' (Parallel Load) Pin 11: C
   Pin 4: TCD (TC DOWN)     Pin 12: B
   Pin 5: TC UP             Pin 13: A
   Pin 6: Q_A               Pin 14: MR (Master Reset)
   Pin 7: Q_B               Pin 15: D
   Pin 8: GND               Pin 16: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc193',
  name: '74HC193 Counter',
  category: 'Digital ICs',
  icon: '⮗',
  desc: '4-bit synchronous up/down counter with parallel load and clear',
  width: 136,
  height: 50,
  defaultProps: {},
  pins: [
    { id: 'CPU', label: 'CPU',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'CPD', label: 'CPD',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'PL',  label: '/PL',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'TC_D',label: 'TC_D', type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'TC_U',label: 'TC_U', type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'QA',  label: 'QA',   type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'QB',  label: 'QB',   type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
    { id: 'GND', label: 'GND',  type: PIN_TYPE.GND,     x: 119, y: 50, side: 'bottom' },
    { id: 'VCC', label: 'VCC',  type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'MR',  label: 'MR',   type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'DD',  label: 'D',    type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'A',   label: 'A',    type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'B',   label: 'B',    type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'C',   label: 'C',    type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'CO',  label: 'CO',   type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
    { id: 'BO',  label: 'BO',   type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const state = inst.runtimeState || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
    for (let i = 0; i <= 7; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 131, 30, 3); ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC193', 59, 21);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('4-Bit Up/Down Counter', 59, 28);
    // Show current count as hex
    const count = state.count || 0;
    ctx.fillStyle = '#33ff66';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.fillText(count.toString(16).toUpperCase().padStart(2, '0'), 59, 38);
    // QA-QD output indicators
    for (let i = 0; i < 4; i++) {
      const bitOn = (count >> i) & 1;
      const lx = 85 + i * 14;
      ctx.fillStyle = bitOn ? '#33ff66' : '#334433';
      ctx.beginPath(); ctx.arc(lx, 36, 2, 0, Math.PI * 2); ctx.fill();
    }
    if (inst.selected) drawSelectionRect(ctx, -10, -4, 140, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC47 — BCD-to-7-Segment Decoder/Driver (16-pin DIP)
   
   Real pinout:
   Pin 1: A     Pin 9:  e
   Pin 2: B     Pin 10: d
   Pin 3: C     Pin 11: g
   Pin 4: D     Pin 12: c
   Pin 5: LT'   Pin 13: b
   Pin 6: RBI'  Pin 14: a
   Pin 7: BI'/RBO' Pin 15: f
   Pin 8: GND   Pin 16: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc47',
  name: '74HC47 BCD→7Seg',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'BCD to 7-segment decoder/driver — active-LOW outputs for common anode displays',
  width: 136,
  height: 50,
  defaultProps: {},
  pins: [
    { id: 'A',   label: 'A',   type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'B',   label: 'B',   type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'C',   label: 'C',   type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'D',   label: 'D',   type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'LT',  label: '/LT', type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'RBI', label: '/RBI',type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'BI',  label: '/BI', type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND,     x: 119, y: 50, side: 'bottom' },
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'f',   label: 'f',   type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'a',   label: 'a',   type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'b',   label: 'b',   type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'c',   label: 'c',   type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'g',   label: 'g',   type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'd',   label: 'd',   type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
    { id: 'e',   label: 'e',   type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const state = inst.runtimeState || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
    for (let i = 0; i <= 7; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 131, 30, 3); ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC47', 59, 21);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('BCD→7-Seg Decoder', 59, 28);
    // Show decoded digit as hex
    const segs = state.segments || 0x7F;
    ctx.fillStyle = '#33ff66';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.fillText('0x' + (segs & 0xFF).toString(16).toUpperCase().padStart(2, '0'), 59, 38);
    if (inst.selected) drawSelectionRect(ctx, -10, -4, 140, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC148 — 8-to-3 Line Priority Encoder (16-pin DIP)
   
   Real pinout:
   Pin 1: EI'     Pin 9:  A0
   Pin 2: I0      Pin 10: I7
   Pin 3: I1      Pin 11: I6
   Pin 4: I2      Pin 12: I5
   Pin 5: I3      Pin 13: I4
   Pin 6: A1      Pin 14: GS'
   Pin 7: A2      Pin 15: EO'
   Pin 8: GND     Pin 16: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc148',
  name: '74HC148 Encoder',
  category: 'Digital ICs',
  icon: '⮗',
  desc: '8-to-3 line priority encoder — encodes highest-priority active input to 3-bit binary',
  width: 136,
  height: 50,
  defaultProps: {},
  pins: [
    { id: 'EI',  label: '/EI', type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'I0',  label: 'I0',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'I1',  label: 'I1',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'I2',  label: 'I2',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'I3',  label: 'I3',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'A1',  label: 'A1',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'A2',  label: 'A2',  type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND,     x: 119, y: 50, side: 'bottom' },
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'EO',  label: '/EO', type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'GS',  label: '/GS', type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'I4',  label: 'I4',  type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'I5',  label: 'I5',  type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'I6',  label: 'I6',  type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'I7',  label: 'I7',  type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
    { id: 'A0',  label: 'A0',  type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const state = inst.runtimeState || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
    for (let i = 0; i <= 7; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 131, 30, 3); ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC148', 59, 21);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('8-to-3 Priority Encoder', 59, 28);
    // Show encoded value
    const code = state.code != null ? state.code : 7;
    ctx.fillStyle = '#33ff66';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.fillText('Y=' + code, 59, 38);
    if (inst.selected) drawSelectionRect(ctx, -10, -4, 140, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   LM741 — General-Purpose Operational Amplifier (8-pin DIP)
   
   Real pinout:
   Pin 1: OFFSET N1   Pin 5: OFFSET N2
   Pin 2: IN- (Inverting)   Pin 6: OUT
   Pin 3: IN+ (Non-Inverting)   Pin 7: VCC+
   Pin 4: VCC-         Pin 8: NC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'lm741',
  name: 'LM741 Op-Amp',
  category: 'Digital ICs',
  icon: '📐',
  desc: 'LM741 general-purpose operational amplifier — differential input, single-ended output',
  width: 68,
  height: 50,
  defaultProps: {},
  pins: [
    { id: 'OFF1', label: '1',  type: PIN_TYPE.DIGITAL, x:  0, y: 50, side: 'bottom' },
    { id: 'INN',  label: '2',  type: PIN_TYPE.SIGNAL,  x: 17, y: 50, side: 'bottom' },
    { id: 'INP',  label: '3',  type: PIN_TYPE.SIGNAL,  x: 34, y: 50, side: 'bottom' },
    { id: 'VCCN', label: '4',  type: PIN_TYPE.GND,     x: 51, y: 50, side: 'bottom' },
    { id: 'OFF2', label: '5',  type: PIN_TYPE.DIGITAL, x:  0, y:  0, side: 'top' },
    { id: 'OUT',  label: '6',  type: PIN_TYPE.SIGNAL,  x: 17, y:  0, side: 'top' },
    { id: 'VCCP', label: '7',  type: PIN_TYPE.POWER,   x: 34, y:  0, side: 'top' },
    { id: 'NC',   label: '8',  type: PIN_TYPE.DIGITAL, x: 51, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const state = inst.runtimeState || {};
    ctx.save();
    ctx.translate(x, y);
    // Pin leads
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
    [0, 17, 34, 51].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    });
    // DIP body
    const grad = ctx.createLinearGradient(0, 10, 68, 40);
    grad.addColorStop(0, '#1a1a1a');
    grad.addColorStop(1, '#0c0c0c');
    ctx.fillStyle = grad;
    roundRect(ctx, -6, 10, 63, 30, 3); ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();
    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();
    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();
    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LM741', 25, 23);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Op-Amp', 25, 32);
    // Output level indicator
    const vOut = state.vOut || 0;
    const intensity = Math.min(1, Math.abs(vOut) / 5);
    ctx.fillStyle = vOut > 0.1 ? `rgba(51,255,102,${intensity})` : vOut < -0.1 ? `rgba(255,51,51,${intensity})` : '#334433';
    ctx.beginPath(); ctx.arc(25, 38, 2.5, 0, Math.PI * 2); ctx.fill();
    if (Math.abs(vOut) > 0.1) { ctx.shadowColor = vOut > 0 ? '#33ff66' : '#ff3333'; ctx.shadowBlur = 4; ctx.beginPath(); ctx.arc(25, 38, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    if (inst.selected) drawSelectionRect(ctx, -10, -4, 72, 58);
    ctx.restore();
  }
});

/* ══════════════ CLASS-BASED IC COMPONENTS ══════════════ */

class IC74HC00Component extends Component {
  getPins() {
    return [
      { id: 'A1', label: '1A', type: PIN_TYPE.DIGITAL, x: 0, y: 50, side: 'bottom' },
      { id: 'B1', label: '1B', type: PIN_TYPE.DIGITAL, x: 17, y: 50, side: 'bottom' },
      { id: 'Y1', label: '1Y', type: PIN_TYPE.DIGITAL, x: 34, y: 50, side: 'bottom' },
      { id: 'A2', label: '2A', type: PIN_TYPE.DIGITAL, x: 51, y: 50, side: 'bottom' },
      { id: 'B2', label: '2B', type: PIN_TYPE.DIGITAL, x: 68, y: 50, side: 'bottom' },
      { id: 'Y2', label: '2Y', type: PIN_TYPE.DIGITAL, x: 85, y: 50, side: 'bottom' },
      { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 102, y: 50, side: 'bottom' },
      { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 0, y: 0, side: 'top' },
      { id: 'B4', label: '4B', type: PIN_TYPE.DIGITAL, x: 17, y: 0, side: 'top' },
      { id: 'A4', label: '4A', type: PIN_TYPE.DIGITAL, x: 34, y: 0, side: 'top' },
      { id: 'Y4', label: '4Y', type: PIN_TYPE.DIGITAL, x: 51, y: 0, side: 'top' },
      { id: 'B3', label: '3B', type: PIN_TYPE.DIGITAL, x: 68, y: 0, side: 'top' },
      { id: 'A3', label: '3A', type: PIN_TYPE.DIGITAL, x: 85, y: 0, side: 'top' },
      { id: 'Y3', label: '3Y', type: PIN_TYPE.DIGITAL, x: 102, y: 0, side: 'top' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const read = (id) => this._readDigitalInput(id);
    const gates = [['A1', 'B1', 'Y1'], ['A2', 'B2', 'Y2'], ['A3', 'B3', 'Y3'], ['A4', 'B4', 'Y4']];
    for (const [a, b, y] of gates) {
      const outVal = (read(a) & read(b)) ? 0 : 1;
      this.runtimeState[y] = outVal ? 255 : 0;
      const pn = this.getConnectedPinNum(y);
      if (pn !== null) sim.pinStates[`pin_${pn}`] = outVal ? 255 : 0;
    }
  }
  _readDigitalInput(pinId) {
    const pn = this.getConnectedPinNum(pinId);
    if (pn !== null) {
      const val = window.ArduinoSim?.pinStates?.[`pin_${pn}`] || 0;
      return val > 128 ? 1 : 0;
    }
    const sim = window.ArduinoSim;
    if (sim && typeof sim.getPinVoltage === 'function') {
      return sim.getPinVoltage(this, pinId) > 0 ? 1 : 0;
    }
    return 0;
  }
}

class IC74HC04Component extends Component {
  getPins() {
    return [
      { id: 'A1', label: '1A',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
      { id: 'Y1', label: '1Y',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
      { id: 'A2', label: '2A',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
      { id: 'Y2', label: '2Y',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
      { id: 'A3', label: '3A',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
      { id: 'Y3', label: '3Y',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
      { id: 'GND', label: 'GND', type: PIN_TYPE.GND,     x: 102, y: 50, side: 'bottom' },
      { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
      { id: 'A6', label: '6A',  type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
      { id: 'Y6', label: '6Y',  type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
      { id: 'A5', label: '5A',  type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
      { id: 'Y5', label: '5Y',  type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
      { id: 'A4', label: '4A',  type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
      { id: 'Y4', label: '4Y',  type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const read = (id) => this._readDigitalInput(id);
    const gates = [['A1', 'Y1'], ['A2', 'Y2'], ['A3', 'Y3'], ['A4', 'Y4'], ['A5', 'Y5'], ['A6', 'Y6']];
    for (const [a, y] of gates) {
      const outVal = read(a) ? 0 : 1;
      this.runtimeState[y] = outVal ? 255 : 0;
      const pn = this.getConnectedPinNum(y);
      if (pn !== null) sim.pinStates[`pin_${pn}`] = outVal ? 255 : 0;
    }
  }
  _readDigitalInput(pinId) {
    const pn = this.getConnectedPinNum(pinId);
    if (pn !== null) {
      const val = window.ArduinoSim?.pinStates?.[`pin_${pn}`] || 0;
      return val > 128 ? 1 : 0;
    }
    const sim = window.ArduinoSim;
    if (sim && typeof sim.getPinVoltage === 'function') {
      return sim.getPinVoltage(this, pinId) > 0 ? 1 : 0;
    }
    return 0;
  }
}

class IC74HC08Component extends Component {
  getPins() {
    return [
      { id: 'A1', label: '1A', type: PIN_TYPE.DIGITAL, x: 0, y: 50, side: 'bottom' },
      { id: 'B1', label: '1B', type: PIN_TYPE.DIGITAL, x: 17, y: 50, side: 'bottom' },
      { id: 'Y1', label: '1Y', type: PIN_TYPE.DIGITAL, x: 34, y: 50, side: 'bottom' },
      { id: 'A2', label: '2A', type: PIN_TYPE.DIGITAL, x: 51, y: 50, side: 'bottom' },
      { id: 'B2', label: '2B', type: PIN_TYPE.DIGITAL, x: 68, y: 50, side: 'bottom' },
      { id: 'Y2', label: '2Y', type: PIN_TYPE.DIGITAL, x: 85, y: 50, side: 'bottom' },
      { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 102, y: 50, side: 'bottom' },
      { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 0, y: 0, side: 'top' },
      { id: 'B4', label: '4B', type: PIN_TYPE.DIGITAL, x: 17, y: 0, side: 'top' },
      { id: 'A4', label: '4A', type: PIN_TYPE.DIGITAL, x: 34, y: 0, side: 'top' },
      { id: 'Y4', label: '4Y', type: PIN_TYPE.DIGITAL, x: 51, y: 0, side: 'top' },
      { id: 'B3', label: '3B', type: PIN_TYPE.DIGITAL, x: 68, y: 0, side: 'top' },
      { id: 'A3', label: '3A', type: PIN_TYPE.DIGITAL, x: 85, y: 0, side: 'top' },
      { id: 'Y3', label: '3Y', type: PIN_TYPE.DIGITAL, x: 102, y: 0, side: 'top' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const read = (id) => this._readDigitalInput(id);
    const gates = [['A1', 'B1', 'Y1'], ['A2', 'B2', 'Y2'], ['A3', 'B3', 'Y3'], ['A4', 'B4', 'Y4']];
    for (const [a, b, y] of gates) {
      const outVal = read(a) & read(b);
      this.runtimeState[y] = outVal ? 255 : 0;
      const pn = this.getConnectedPinNum(y);
      if (pn !== null) sim.pinStates[`pin_${pn}`] = outVal ? 255 : 0;
    }
  }
  _readDigitalInput(pinId) {
    const pn = this.getConnectedPinNum(pinId);
    if (pn !== null) {
      const val = window.ArduinoSim?.pinStates?.[`pin_${pn}`] || 0;
      return val > 128 ? 1 : 0;
    }
    const sim = window.ArduinoSim;
    if (sim && typeof sim.getPinVoltage === 'function') {
      return sim.getPinVoltage(this, pinId) > 0 ? 1 : 0;
    }
    return 0;
  }
}

class IC74HC32Component extends Component {
  getPins() {
    return [
      { id: 'A1', label: '1A', type: PIN_TYPE.DIGITAL, x: 0, y: 50, side: 'bottom' },
      { id: 'B1', label: '1B', type: PIN_TYPE.DIGITAL, x: 17, y: 50, side: 'bottom' },
      { id: 'Y1', label: '1Y', type: PIN_TYPE.DIGITAL, x: 34, y: 50, side: 'bottom' },
      { id: 'A2', label: '2A', type: PIN_TYPE.DIGITAL, x: 51, y: 50, side: 'bottom' },
      { id: 'B2', label: '2B', type: PIN_TYPE.DIGITAL, x: 68, y: 50, side: 'bottom' },
      { id: 'Y2', label: '2Y', type: PIN_TYPE.DIGITAL, x: 85, y: 50, side: 'bottom' },
      { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 102, y: 50, side: 'bottom' },
      { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 0, y: 0, side: 'top' },
      { id: 'B4', label: '4B', type: PIN_TYPE.DIGITAL, x: 17, y: 0, side: 'top' },
      { id: 'A4', label: '4A', type: PIN_TYPE.DIGITAL, x: 34, y: 0, side: 'top' },
      { id: 'Y4', label: '4Y', type: PIN_TYPE.DIGITAL, x: 51, y: 0, side: 'top' },
      { id: 'B3', label: '3B', type: PIN_TYPE.DIGITAL, x: 68, y: 0, side: 'top' },
      { id: 'A3', label: '3A', type: PIN_TYPE.DIGITAL, x: 85, y: 0, side: 'top' },
      { id: 'Y3', label: '3Y', type: PIN_TYPE.DIGITAL, x: 102, y: 0, side: 'top' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const read = (id) => this._readDigitalInput(id);
    const gates = [['A1', 'B1', 'Y1'], ['A2', 'B2', 'Y2'], ['A3', 'B3', 'Y3'], ['A4', 'B4', 'Y4']];
    for (const [a, b, y] of gates) {
      const outVal = read(a) | read(b);
      this.runtimeState[y] = outVal ? 255 : 0;
      const pn = this.getConnectedPinNum(y);
      if (pn !== null) sim.pinStates[`pin_${pn}`] = outVal ? 255 : 0;
    }
  }
  _readDigitalInput(pinId) {
    const pn = this.getConnectedPinNum(pinId);
    if (pn !== null) {
      const val = window.ArduinoSim?.pinStates?.[`pin_${pn}`] || 0;
      return val > 128 ? 1 : 0;
    }
    const sim = window.ArduinoSim;
    if (sim && typeof sim.getPinVoltage === 'function') {
      return sim.getPinVoltage(this, pinId) > 0 ? 1 : 0;
    }
    return 0;
  }
}

class IC74HC595Component extends Component {
  getPins() {
    return [
      { id: 'QA', label: 'Q0', type: PIN_TYPE.DIGITAL, x: 0, y: 50, side: 'bottom' },
      { id: 'QB', label: 'Q1', type: PIN_TYPE.DIGITAL, x: 17, y: 50, side: 'bottom' },
      { id: 'QC', label: 'Q2', type: PIN_TYPE.DIGITAL, x: 34, y: 50, side: 'bottom' },
      { id: 'QD', label: 'Q3', type: PIN_TYPE.DIGITAL, x: 51, y: 50, side: 'bottom' },
      { id: 'QE', label: 'Q4', type: PIN_TYPE.DIGITAL, x: 68, y: 50, side: 'bottom' },
      { id: 'QF', label: 'Q5', type: PIN_TYPE.DIGITAL, x: 85, y: 50, side: 'bottom' },
      { id: 'QG', label: 'Q6', type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
      { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 119, y: 50, side: 'bottom' },
      { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 0, y: 0, side: 'top' },
      { id: 'QHn', label: "Q7'", type: PIN_TYPE.DIGITAL, x: 17, y: 0, side: 'top' },
      { id: 'QH', label: 'Q7', type: PIN_TYPE.DIGITAL, x: 34, y: 0, side: 'top' },
      { id: 'SRCLR', label: '/RST', type: PIN_TYPE.DIGITAL, x: 51, y: 0, side: 'top' },
      { id: 'SRCLK', label: 'SRCLK', type: PIN_TYPE.DIGITAL, x: 68, y: 0, side: 'top' },
      { id: 'RCLK', label: 'RCLK', type: PIN_TYPE.DIGITAL, x: 85, y: 0, side: 'top' },
      { id: 'OE', label: '/OE', type: PIN_TYPE.DIGITAL, x: 102, y: 0, side: 'top' },
      { id: 'SER', label: 'SER', type: PIN_TYPE.DIGITAL, x: 119, y: 0, side: 'top' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const read = (id) => this._readDigitalInput(id);
    const write = (id, val) => {
      const pn = this.getConnectedPinNum(id);
      if (pn !== null) sim.pinStates[`pin_${pn}`] = val ? 255 : 0;
    };

    if (this.runtimeState._shiftReg === undefined) this.runtimeState._shiftReg = 0;
    if (this.runtimeState._latchReg === undefined) this.runtimeState._latchReg = 0;
    if (this.runtimeState._lastSRCLK === undefined) this.runtimeState._lastSRCLK = 0;
    if (this.runtimeState._lastRCLK === undefined) this.runtimeState._lastRCLK = 0;

    const srclk = read('SRCLK');
    const rclk = read('RCLK');
    const oe = read('OE');
    const srclr = read('SRCLR');

    if (srclr === 0) {
      this.runtimeState._shiftReg = 0;
      this.runtimeState._lastSRCLK = srclk;
      this.runtimeState._lastRCLK = rclk;
      return;
    }

    if (srclk === 1 && this.runtimeState._lastSRCLK === 0) {
      const ser = read('SER');
      this.runtimeState._shiftReg = ((this.runtimeState._shiftReg << 1) | ser) & 0xFF;
    }
    this.runtimeState._lastSRCLK = srclk;

    if (rclk === 1 && this.runtimeState._lastRCLK === 0) {
      this.runtimeState._latchReg = this.runtimeState._shiftReg;
    }
    this.runtimeState._lastRCLK = rclk;

    const outputActive = oe === 0;
    const output = outputActive ? this.runtimeState._latchReg : 0;
    this.runtimeState.bits = output;

    ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH'].forEach((pinId, i) => {
      const bitVal = (output >> i) & 1;
      this.runtimeState[pinId] = bitVal ? 255 : 0;
      write(pinId, bitVal);
    });

    const q7nVal = (~this.runtimeState._shiftReg >> 7) & 1;
    this.runtimeState.QHn = q7nVal ? 255 : 0;
    write('QHn', q7nVal);
  }
  _readDigitalInput(pinId) {
    const pn = this.getConnectedPinNum(pinId);
    if (pn !== null) {
      const val = window.ArduinoSim?.pinStates?.[`pin_${pn}`] || 0;
      return val > 128 ? 1 : 0;
    }
    const sim = window.ArduinoSim;
    if (sim && typeof sim.getPinVoltage === 'function') {
      return sim.getPinVoltage(this, pinId) > 0 ? 1 : 0;
    }
    return 0;
  }
}

class IC74HC138Component extends Component {
  getPins() {
    return [
      { id: 'A0',   label: 'A0',   type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
      { id: 'A1',   label: 'A1',   type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
      { id: 'A2',   label: 'A2',   type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
      { id: 'G2A',  label: 'G2A',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
      { id: 'G2B',  label: 'G2B',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
      { id: 'G1',   label: 'G1',   type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
      { id: 'Y7',   label: 'Y7',   type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
      { id: 'GND',  label: 'GND',  type: PIN_TYPE.GND,     x: 119, y: 50, side: 'bottom' },
      { id: 'VCC',  label: 'VCC',  type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
      { id: 'Y0',   label: 'Y0',   type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
      { id: 'Y1',   label: 'Y1',   type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
      { id: 'Y2',   label: 'Y2',   type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
      { id: 'Y3',   label: 'Y3',   type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
      { id: 'Y4',   label: 'Y4',   type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
      { id: 'Y5',   label: 'Y5',   type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
      { id: 'Y6',   label: 'Y6',   type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const read = (id) => this._readDigitalInput(id);
    const write = (id, val) => {
      const pn = this.getConnectedPinNum(id);
      if (pn !== null) sim.pinStates[`pin_${pn}`] = val ? 255 : 0;
    };
    const a0 = read('A0'), a1 = read('A1'), a2 = read('A2');
    const g1 = read('G1'), g2a = read('G2A'), g2b = read('G2B');
    const enabled = g1 === 1 && g2a === 0 && g2b === 0;
    const addr = (a2 << 2) | (a1 << 1) | a0;
    for (let i = 0; i < 8; i++) {
      const outVal = (enabled && i === addr) ? 0 : 1;
      this.runtimeState[`Y${i}`] = outVal ? 255 : 0;
      write(`Y${i}`, outVal);
    }
    this.runtimeState.activeOutput = enabled ? addr : -1;
  }
  _readDigitalInput(pinId) {
    const pn = this.getConnectedPinNum(pinId);
    if (pn !== null) {
      const val = window.ArduinoSim?.pinStates?.[`pin_${pn}`] || 0;
      return val > 128 ? 1 : 0;
    }
    const sim = window.ArduinoSim;
    if (sim && typeof sim.getPinVoltage === 'function') {
      return sim.getPinVoltage(this, pinId) > 0 ? 1 : 0;
    }
    return 0;
  }
}

class IC74HC245Component extends Component {
  getPins() {
    return [
      { id: 'DIR', label: 'DIR', type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
      { id: 'A1',  label: 'A1',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
      { id: 'A2',  label: 'A2',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
      { id: 'A3',  label: 'A3',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
      { id: 'A4',  label: 'A4',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
      { id: 'A5',  label: 'A5',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
      { id: 'A6',  label: 'A6',  type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
      { id: 'A7',  label: 'A7',  type: PIN_TYPE.DIGITAL, x: 119, y: 50, side: 'bottom' },
      { id: 'A8',  label: 'A8',  type: PIN_TYPE.DIGITAL, x: 136, y: 50, side: 'bottom' },
      { id: 'GND', label: 'GND', type: PIN_TYPE.GND,     x: 153, y: 50, side: 'bottom' },
      { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
      { id: 'OE',  label: '/OE', type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
      { id: 'B1',  label: 'B1',  type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
      { id: 'B2',  label: 'B2',  type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
      { id: 'B3',  label: 'B3',  type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
      { id: 'B4',  label: 'B4',  type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
      { id: 'B5',  label: 'B5',  type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
      { id: 'B6',  label: 'B6',  type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
      { id: 'B7',  label: 'B7',  type: PIN_TYPE.DIGITAL, x: 136, y:  0, side: 'top' },
      { id: 'B8',  label: 'B8',  type: PIN_TYPE.DIGITAL, x: 153, y:  0, side: 'top' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const read = (id) => this._readDigitalInput(id);
    const readVal = (id) => {
      const pn = this.getConnectedPinNum(id);
      return pn !== null ? (sim.pinStates[`pin_${pn}`] || 0) : 0;
    };
    const writeVal = (id, val) => {
      const pn = this.getConnectedPinNum(id);
      if (pn !== null) sim.pinStates[`pin_${pn}`] = val;
    };
    const dir = read('DIR');
    const oe = read('OE');
    this.runtimeState.direction = dir;
    if (oe === 1) {
      for (let i = 1; i <= 8; i++) {
        this.runtimeState[`A${i}`] = 0;
        this.runtimeState[`B${i}`] = 0;
        writeVal(`A${i}`, 0);
        writeVal(`B${i}`, 0);
      }
    } else if (dir === 1) {
      for (let i = 1; i <= 8; i++) {
        const val = readVal(`A${i}`);
        this.runtimeState[`B${i}`] = val;
        writeVal(`B${i}`, val);
      }
    } else {
      for (let i = 1; i <= 8; i++) {
        const val = readVal(`B${i}`);
        this.runtimeState[`A${i}`] = val;
        writeVal(`A${i}`, val);
      }
    }
  }
  _readDigitalInput(pinId) {
    const pn = this.getConnectedPinNum(pinId);
    if (pn !== null) {
      const val = window.ArduinoSim?.pinStates?.[`pin_${pn}`] || 0;
      return val > 128 ? 1 : 0;
    }
    const sim = window.ArduinoSim;
    if (sim && typeof sim.getPinVoltage === 'function') {
      return sim.getPinVoltage(this, pinId) > 0 ? 1 : 0;
    }
    return 0;
  }
}

class IC74HC74Component extends Component {
  getPins() {
    return [
      { id: 'CLR1', label: '/CLR1', type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
      { id: 'D1',   label: 'D1',    type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
      { id: 'CLK1', label: 'CLK1',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
      { id: 'PRE1', label: '/PRE1', type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
      { id: 'Q1',   label: 'Q1',    type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
      { id: 'Q1n',  label: "Q1'",   type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
      { id: 'GND',  label: 'GND',   type: PIN_TYPE.GND,     x: 102, y: 50, side: 'bottom' },
      { id: 'VCC',  label: 'VCC',   type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
      { id: 'CLK2', label: 'CLK2',  type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
      { id: 'Q2n',  label: "Q2'",   type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
      { id: 'Q2',   label: 'Q2',    type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
      { id: 'PRE2', label: '/PRE2', type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
      { id: 'CLR2', label: '/CLR2', type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
      { id: 'D2',   label: 'D2',    type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const read = (id) => this._readDigitalInput(id);
    const write = (id, val) => {
      const pn = this.getConnectedPinNum(id);
      if (pn !== null) sim.pinStates[`pin_${pn}`] = val ? 255 : 0;
    };
    if (this.runtimeState._lastCLK1 === undefined) this.runtimeState._lastCLK1 = 0;
    if (this.runtimeState._lastCLK2 === undefined) this.runtimeState._lastCLK2 = 0;
    if (this.runtimeState.Q1 === undefined) this.runtimeState.Q1 = 0;
    if (this.runtimeState.Q2 === undefined) this.runtimeState.Q2 = 0;

    const clr1 = read('CLR1'), pre1 = read('PRE1');
    const clk1 = read('CLK1'), d1 = read('D1');
    if (clr1 === 0) {
      this.runtimeState.Q1 = 0;
    } else if (pre1 === 0) {
      this.runtimeState.Q1 = 1;
    } else if (clk1 === 1 && this.runtimeState._lastCLK1 === 0) {
      this.runtimeState.Q1 = d1;
    }
    this.runtimeState._lastCLK1 = clk1;
    write('Q1', this.runtimeState.Q1);
    write('Q1n', this.runtimeState.Q1 ? 0 : 1);

    const clr2 = read('CLR2'), pre2 = read('PRE2');
    const clk2 = read('CLK2'), d2 = read('D2');
    if (clr2 === 0) {
      this.runtimeState.Q2 = 0;
    } else if (pre2 === 0) {
      this.runtimeState.Q2 = 1;
    } else if (clk2 === 1 && this.runtimeState._lastCLK2 === 0) {
      this.runtimeState.Q2 = d2;
    }
    this.runtimeState._lastCLK2 = clk2;
    write('Q2', this.runtimeState.Q2);
    write('Q2n', this.runtimeState.Q2 ? 0 : 1);
  }
  _readDigitalInput(pinId) {
    const pn = this.getConnectedPinNum(pinId);
    if (pn !== null) {
      const val = window.ArduinoSim?.pinStates?.[`pin_${pn}`] || 0;
      return val > 128 ? 1 : 0;
    }
    const sim = window.ArduinoSim;
    if (sim && typeof sim.getPinVoltage === 'function') {
      return sim.getPinVoltage(this, pinId) > 0 ? 1 : 0;
    }
    return 0;
  }
}

class IC74HC165Component extends Component {
  getPins() {
    return [
      { id: 'SHLD',   label: '/SHLD', type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
      { id: 'CLK',    label: 'CLK',   type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
      { id: 'E',      label: 'E',     type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
      { id: 'F',      label: 'F',     type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
      { id: 'G',      label: 'G',     type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
      { id: 'H',      label: 'H',     type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
      { id: 'Q7',     label: 'Q7',    type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
      { id: 'GND',    label: 'GND',   type: PIN_TYPE.GND,     x: 119, y: 50, side: 'bottom' },
      { id: 'VCC',    label: 'VCC',   type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
      { id: 'A',      label: 'A',     type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
      { id: 'CLKINH', label: 'CLKINH',type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
      { id: 'Hn',     label: "H'",    type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
      { id: 'Gn',     label: "G'",    type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
      { id: 'Fn',     label: "F'",    type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
      { id: 'SER',    label: 'SER',   type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
      { id: 'Q7n',    label: "Q7'",   type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const read = (id) => this._readDigitalInput(id);
    const write = (id, val) => {
      const pn = this.getConnectedPinNum(id);
      if (pn !== null) sim.pinStates[`pin_${pn}`] = val ? 255 : 0;
    };
    if (this.runtimeState._lastCLK165 === undefined) this.runtimeState._lastCLK165 = 0;
    if (this.runtimeState.bits === undefined) this.runtimeState.bits = 0;

    const shld = read('SHLD');
    const clk = read('CLK');
    const clkInh = read('CLKINH');

    if (shld === 0) {
      let val = 0;
      const pinOrder = ['A', 'E', 'F', 'G', 'H', 'Fn', 'Gn', 'Hn'];
      for (let i = 0; i < 8; i++) {
        if (read(pinOrder[i])) val |= (1 << i);
      }
      this.runtimeState.bits = val;
    } else if (clk === 1 && this.runtimeState._lastCLK165 === 0 && clkInh === 0) {
      const ser = read('SER');
      this.runtimeState.bits = ((this.runtimeState.bits << 1) | ser) & 0xFF;
    }
    this.runtimeState._lastCLK165 = clk;
    write('Q7', (this.runtimeState.bits >> 7) & 1);
    write('Q7n', (this.runtimeState.bits >> 7) & 1 ? 0 : 1);
  }
  _readDigitalInput(pinId) {
    const pn = this.getConnectedPinNum(pinId);
    if (pn !== null) {
      const val = window.ArduinoSim?.pinStates?.[`pin_${pn}`] || 0;
      return val > 128 ? 1 : 0;
    }
    const sim = window.ArduinoSim;
    if (sim && typeof sim.getPinVoltage === 'function') {
      return sim.getPinVoltage(this, pinId) > 0 ? 1 : 0;
    }
    return 0;
  }
}

class IC74HC193Component extends Component {
  getPins() {
    return [
      { id: 'CPU',  label: 'CPU',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
      { id: 'CPD',  label: 'CPD',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
      { id: 'PL',   label: '/PL',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
      { id: 'TC_D', label: 'TC_D', type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
      { id: 'TC_U', label: 'TC_U', type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
      { id: 'QA',   label: 'QA',   type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
      { id: 'QB',   label: 'QB',   type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
      { id: 'GND',  label: 'GND',  type: PIN_TYPE.GND,     x: 119, y: 50, side: 'bottom' },
      { id: 'VCC',  label: 'VCC',  type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
      { id: 'MR',   label: 'MR',   type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
      { id: 'DD',   label: 'D',    type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
      { id: 'A',    label: 'A',    type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
      { id: 'B',    label: 'B',    type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
      { id: 'C',    label: 'C',    type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
      { id: 'CO',   label: 'CO',   type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
      { id: 'BO',   label: 'BO',   type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const read = (id) => this._readDigitalInput(id);
    const write = (id, val) => {
      const pn = this.getConnectedPinNum(id);
      if (pn !== null) sim.pinStates[`pin_${pn}`] = val ? 255 : 0;
    };
    if (this.runtimeState.count === undefined) this.runtimeState.count = 0;
    if (this.runtimeState._lastCPU === undefined) this.runtimeState._lastCPU = 0;
    if (this.runtimeState._lastCPD === undefined) this.runtimeState._lastCPD = 0;

    const mr = read('MR');
    const pl = read('PL');
    const cpu = read('CPU');
    const cpd = read('CPD');

    if (mr) {
      this.runtimeState.count = 0;
    } else if (pl === 0) {
      let val = 0;
      if (read('A'))  val |= 1;
      if (read('B'))  val |= 2;
      if (read('C'))  val |= 4;
      if (read('DD')) val |= 8;
      this.runtimeState.count = val & 0xF;
    } else {
      if (cpu === 1 && this.runtimeState._lastCPU === 0) {
        this.runtimeState.count = (this.runtimeState.count + 1) & 0xF;
      }
      if (cpd === 1 && this.runtimeState._lastCPD === 0) {
        this.runtimeState.count = (this.runtimeState.count - 1) & 0xF;
      }
    }
    this.runtimeState._lastCPU = cpu;
    this.runtimeState._lastCPD = cpd;
    const c = this.runtimeState.count;
    write('QA', c & 1);
    write('QB', (c >> 1) & 1);
    write('CO', (c === 0xF) ? 0 : 1);
    write('BO', (c === 0x0) ? 0 : 1);
    write('TC_U', c === 0xF ? 1 : 0);
    write('TC_D', c === 0x0 ? 1 : 0);
  }
  _readDigitalInput(pinId) {
    const pn = this.getConnectedPinNum(pinId);
    if (pn !== null) {
      const val = window.ArduinoSim?.pinStates?.[`pin_${pn}`] || 0;
      return val > 128 ? 1 : 0;
    }
    const sim = window.ArduinoSim;
    if (sim && typeof sim.getPinVoltage === 'function') {
      return sim.getPinVoltage(this, pinId) > 0 ? 1 : 0;
    }
    return 0;
  }
}

class IC74HC47Component extends Component {
  getPins() {
    return [
      { id: 'A',   label: 'A',   type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
      { id: 'B',   label: 'B',   type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
      { id: 'C',   label: 'C',   type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
      { id: 'D',   label: 'D',   type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
      { id: 'LT',  label: '/LT', type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
      { id: 'RBI', label: '/RBI',type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
      { id: 'BI',  label: '/BI', type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
      { id: 'GND', label: 'GND', type: PIN_TYPE.GND,     x: 119, y: 50, side: 'bottom' },
      { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
      { id: 'f',   label: 'f',   type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
      { id: 'a',   label: 'a',   type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
      { id: 'b',   label: 'b',   type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
      { id: 'c',   label: 'c',   type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
      { id: 'g',   label: 'g',   type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
      { id: 'd',   label: 'd',   type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
      { id: 'e',   label: 'e',   type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const read = (id) => this._readDigitalInput(id);
    const write = (id, val) => {
      const pn = this.getConnectedPinNum(id);
      if (pn !== null) sim.pinStates[`pin_${pn}`] = val ? 255 : 0;
    };
    let bcd = 0;
    if (read('A')) bcd |= 1;
    if (read('B')) bcd |= 2;
    if (read('C')) bcd |= 4;
    if (read('D')) bcd |= 8;
    const segTable = [0x3F,0x06,0x5B,0x4F,0x66,0x6D,0x7D,0x07,0x7F,0x6F,
                       0x77,0x7C,0x39,0x5E,0x79,0x71];
    const lt = read('LT');
    const bi = read('BI');
    let segments;
    if (bi === 0) {
      segments = 0x00;
    } else if (lt === 0) {
      segments = 0x7F;
    } else {
      segments = segTable[bcd] || 0x7F;
    }
    this.runtimeState.segments = segments;
    write('a', (segments & 0x01) ? 0 : 1);
    write('b', (segments & 0x02) ? 0 : 1);
    write('c', (segments & 0x04) ? 0 : 1);
    write('d', (segments & 0x08) ? 0 : 1);
    write('e', (segments & 0x10) ? 0 : 1);
    write('f', (segments & 0x20) ? 0 : 1);
    write('g', (segments & 0x40) ? 0 : 1);
  }
  _readDigitalInput(pinId) {
    const pn = this.getConnectedPinNum(pinId);
    if (pn !== null) {
      const val = window.ArduinoSim?.pinStates?.[`pin_${pn}`] || 0;
      return val > 128 ? 1 : 0;
    }
    const sim = window.ArduinoSim;
    if (sim && typeof sim.getPinVoltage === 'function') {
      return sim.getPinVoltage(this, pinId) > 0 ? 1 : 0;
    }
    return 0;
  }
}

class IC74HC148Component extends Component {
  getPins() {
    return [
      { id: 'EI',  label: '/EI', type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
      { id: 'I0',  label: 'I0',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
      { id: 'I1',  label: 'I1',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
      { id: 'I2',  label: 'I2',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
      { id: 'I3',  label: 'I3',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
      { id: 'A1',  label: 'A1',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
      { id: 'A2',  label: 'A2',  type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
      { id: 'GND', label: 'GND', type: PIN_TYPE.GND,     x: 119, y: 50, side: 'bottom' },
      { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
      { id: 'EO',  label: '/EO', type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
      { id: 'GS',  label: '/GS', type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
      { id: 'I4',  label: 'I4',  type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
      { id: 'I5',  label: 'I5',  type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
      { id: 'I6',  label: 'I6',  type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
      { id: 'I7',  label: 'I7',  type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
      { id: 'A0',  label: 'A0',  type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const read = (id) => this._readDigitalInput(id);
    const write = (id, val) => {
      const pn = this.getConnectedPinNum(id);
      if (pn !== null) sim.pinStates[`pin_${pn}`] = val ? 255 : 0;
    };
    const ei = read('EI');
    const inputs = [0,1,2,3,4,5,6,7].map(i => !read(`I${i}`));
    let activeIdx = -1;
    for (let i = 7; i >= 0; i--) {
      if (inputs[i]) { activeIdx = i; break; }
    }
    const anyActive = activeIdx >= 0;
    if (ei === 1) {
      write('A0', 0); write('A1', 0); write('A2', 0);
      write('GS', 0); write('EO', 0);
      this.runtimeState.code = null;
    } else {
      if (anyActive) {
        write('A0', activeIdx & 1);
        write('A1', (activeIdx >> 1) & 1);
        write('A2', (activeIdx >> 2) & 1);
        write('GS', 1);
        write('EO', 0);
      } else {
        write('A0', 1); write('A1', 1); write('A2', 1);
        write('GS', 0);
        write('EO', 1);
      }
      this.runtimeState.code = anyActive ? activeIdx : null;
    }
  }
  _readDigitalInput(pinId) {
    const pn = this.getConnectedPinNum(pinId);
    if (pn !== null) {
      const val = window.ArduinoSim?.pinStates?.[`pin_${pn}`] || 0;
      return val > 128 ? 1 : 0;
    }
    const sim = window.ArduinoSim;
    if (sim && typeof sim.getPinVoltage === 'function') {
      return sim.getPinVoltage(this, pinId) > 0 ? 1 : 0;
    }
    return 0;
  }
}

registerComponent('ic_74hc00', IC74HC00Component);
registerComponent('ic_74hc04', IC74HC04Component);
registerComponent('ic_74hc08', IC74HC08Component);
registerComponent('ic_74hc32', IC74HC32Component);
registerComponent('ic_74hc595', IC74HC595Component);
registerComponent('ic_74hc138', IC74HC138Component);
registerComponent('ic_74hc245', IC74HC245Component);
registerComponent('ic_74hc74', IC74HC74Component);
registerComponent('ic_74hc165', IC74HC165Component);
registerComponent('ic_74hc193', IC74HC193Component);
registerComponent('ic_74hc47', IC74HC47Component);
registerComponent('ic_74hc148', IC74HC148Component);
