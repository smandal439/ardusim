'use strict';
/* components/input.js — Input component definitions */

/* ═══════════════════════════════════════════════════════
   4-Pin Tactile Push Button Component
   ═══════════════════════════════════════════════════════ */

defComp({
  id: 'push_button',
  name: 'Push Button',
  category: 'Input',
  icon: '🔘',
  desc: 'Tactile push button — bridges the two rails when pressed (momentary or latching)',
  width: 40,
  height: 40,
  defaultProps: { pressed: false, label: 'BTN', mode: 'latching' },
  interactive: [
    {
      field: 'mode',
      label: 'Action',
      type: 'select',
      options: [
        { value: 'momentary', label: 'Momentary — hold to press' },
        { value: 'latching', label: 'Latching — click to toggle' },
      ],
    },
  ],

  pins: [
    { id: 'p1', label: '1', type: PIN_TYPE.DIGITAL, x: 8, y: 0, side: 'top' },
    { id: 'p2', label: '2', type: PIN_TYPE.DIGITAL, x: 32, y: 0, side: 'top' },
    { id: 'p3', label: '3', type: PIN_TYPE.DIGITAL, x: 8, y: 40, side: 'bottom' },
    { id: 'p4', label: '4', type: PIN_TYPE.DIGITAL, x: 32, y: 40, side: 'bottom' },
  ],

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    // runtimeState is what the click/keyboard handlers drive — it must win over
    // the stored prop even when it is explicitly false (released again).
    const pressed = !!(inst.runtimeState?.pressed ?? inst.props?.pressed);

    ctx.save();
    ctx.translate(x, y);

    // ── Outer Pin Terminal Leads ──
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    [[8, 0], [32, 0], [8, 40], [32, 40]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py < 20 ? 10 : 30);
      ctx.stroke();
    });

    // ── Main Body Housing ──
    ctx.fillStyle = '#222';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(4, 8, 32, 24, 4);
    } else if (typeof roundRect === 'function') {
      roundRect(ctx, 4, 8, 32, 24, 4);
    } else {
      ctx.rect(4, 8, 32, 24);
    }
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Vertical Internal Side Bus Rails ──
    // Left side rail (Pin 1 to Pin 3)
    ctx.strokeStyle = pressed ? '#00e5ff' : '#aaa';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(8, 10); ctx.lineTo(8, 30); ctx.stroke();

    // Right side rail (Pin 2 to Pin 4)
    ctx.strokeStyle = pressed ? '#00e5ff' : '#aaa';
    ctx.beginPath(); ctx.moveTo(32, 10); ctx.lineTo(32, 30); ctx.stroke();

    // ── Internal Contact Points & Bridging Bar ──
    if (pressed) {
      // CLOSED STATE: Active bridge connects left rail (x=8) straight to right rail (x=32)
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(8, 20);
      ctx.lineTo(32, 20);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Contact point nodes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(8, 20, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(32, 20, 2, 0, Math.PI * 2); ctx.fill();
    } else {
      // OPEN STATE: Contact stubs with open central gap and suspended bridge bar above
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1.5;

      // Left terminal contact stub
      ctx.beginPath(); ctx.moveTo(8, 20); ctx.lineTo(13, 20); ctx.stroke();
      // Right terminal contact stub
      ctx.beginPath(); ctx.moveTo(32, 20); ctx.lineTo(27, 20); ctx.stroke();

      // Disconnected bridge bar suspended above contact gap (Open Circuit)
      ctx.strokeStyle = '#e74c3c';
      ctx.beginPath(); ctx.moveTo(13, 15); ctx.lineTo(27, 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(20, 15); ctx.lineTo(20, 11); ctx.stroke(); // Actuator stem
    }

    // ── Tactile Button Center Plunger Cap ──
    const capRadius = pressed ? 6.5 : 7.5;
    ctx.fillStyle = pressed ? '#1b4f72' : '#2980b9';
    ctx.beginPath();
    ctx.arc(20, 20, capRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pressed ? '#00e5ff' : '#5DADE2';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Specular Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(pressed ? 18.5 : 18, pressed ? 18.5 : 18, 2, 0, Math.PI * 2);
    ctx.fill();

    // ── Selection Boundary ──
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -3, -3, 46, 46);
    }

    ctx.restore();
  }
});
/* ─── POTENTIOMETER ─── */
defComp({
  id: 'potentiometer',
  name: 'Potentiometer',
  category: 'Input',
  icon: '🎚️',
  desc: '10k-ohm variable resistor with wiper output (0-1023)',
  width: 50,
  height: 60,
  defaultProps: { value: 512, maxValue: 1023, resistance: 10000 },
  interactive: [
    { field: 'value', label: 'Wiper', min: 0, max: 1023, step: 1 },
  ],
  pins: [
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 8, y: 60, side: 'bottom' },
    { id: 'wiper', label: 'OUT', type: PIN_TYPE.ANALOG, x: 25, y: 60, side: 'bottom' },
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 42, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const val = (inst.runtimeState && inst.runtimeState.value !== undefined) ? inst.runtimeState.value : (inst.props.value || 512);
    const pct = val / (inst.props.maxValue || 1023);
    const angle = -2.2 + pct * 4.4; // from -2.2 to +2.2 rad

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    [[8, 60], [25, 60], [42, 60]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, 46);
      ctx.stroke();
    });

    // Body
    ctx.fillStyle = '#2a2a2a';
    roundRect(ctx, 2, 5, 46, 42, 5);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Dial ring
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(25, 26, 16, -Math.PI * 0.8 + Math.PI * 0.5, Math.PI * 0.8 + Math.PI * 0.5);
    ctx.stroke();

    // Dial fill (colored arc showing value)
    ctx.strokeStyle = '#00979c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const startA = -Math.PI * 0.8 + Math.PI * 0.5;
    ctx.arc(25, 26, 16, startA, startA + pct * Math.PI * 1.6);
    ctx.stroke();

    // Knob
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(25, 26, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Indicator line
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(25, 26);
    ctx.lineTo(25 + Math.sin(angle) * 8, 26 - Math.cos(angle) * 8);
    ctx.stroke();

    // Value display
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(val, 25, 10);

    // Pin labels
    ctx.fillStyle = '#888';
    ctx.font = '6px sans-serif';
    ctx.fillText('V', 8, 56);
    ctx.fillText('W', 25, 56);
    ctx.fillText('G', 42, 56);

    if (inst.selected) drawSelectionRect(ctx, -3, 2, 56, 65);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════
   Potentiometer Component Class — standard interface
   ═══════════════════════════════════════════════════════ */
class PotentiometerComponent extends Component {
  getPins() {
    return [
      { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 8, y: 60, side: 'bottom' },
      { id: 'wiper', label: 'OUT', type: PIN_TYPE.ANALOG, x: 25, y: 60, side: 'bottom' },
      { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 42, y: 60, side: 'bottom' },
    ];
  }

  update(canvas) {
    const source = this.getSource('vcc');
    const hasGnd = this.hasGround('gnd');

    if (source && hasGnd) {
      const val = this.runtimeState.value !== undefined ? this.runtimeState.value : (this.props.value || 512);
      const maxVal = this.props.maxValue || 1023;
      const ratio = Math.max(0, Math.min(1, val / maxVal));
      const outVoltage = source.voltage * ratio;
      const adcVal = Math.round((outVoltage / 5.0) * 1023);
      this.runtimeState.wiper = adcVal;
      this.writePin('wiper', adcVal);
    }
  }

  render(ctx, sim) {
    drawPotentiometer(ctx, this.inst, sim);
  }
}

// Helper draw function for potentiometer
function drawPotentiometer(ctx, inst, sim) {
  const { x, y } = inst;
  const val = (inst.runtimeState && inst.runtimeState.value !== undefined) ? inst.runtimeState.value : (inst.props.value || 512);
  const pct = val / (inst.props.maxValue || 1023);
  const angle = -2.2 + pct * 4.4;

  ctx.save();
  ctx.translate(x, y);

  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1.5;
  [[8, 60], [25, 60], [42, 60]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, 46);
    ctx.stroke();
  });

  ctx.fillStyle = '#2a2a2a';
  roundRect(ctx, 2, 5, 46, 42, 5);
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = '#888';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(25, 26, 16, -Math.PI * 0.8 + Math.PI * 0.5, Math.PI * 0.8 + Math.PI * 0.5);
  ctx.stroke();

  ctx.strokeStyle = '#00979c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const startA = -Math.PI * 0.8 + Math.PI * 0.5;
  ctx.arc(25, 26, 16, startA, startA + pct * Math.PI * 1.6);
  ctx.stroke();

  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.arc(25, 26, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(25, 26);
  ctx.lineTo(25 + Math.sin(angle) * 8, 26 - Math.cos(angle) * 8);
  ctx.stroke();

  ctx.fillStyle = '#aaa';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(val, 25, 10);

  ctx.fillStyle = '#888';
  ctx.font = '6px sans-serif';
  ctx.fillText('V', 8, 56);
  ctx.fillText('W', 25, 56);
  ctx.fillText('G', 42, 56);

  if (inst.selected) drawSelectionRect(ctx, -3, 2, 56, 65);
  ctx.restore();
}

registerComponent('potentiometer', PotentiometerComponent);

/* ─── Joystick ─── */
defComp({
  id: 'joystick',
  name: 'Joystick Module',
  category: 'Input',
  icon: '🕹️',
  desc: '2-axis analog joystick with center-push button (X, Y, switch)',
  width: 60,
  height: 60,
  defaultProps: { x: 512, y: 512, sw: 0 },
  interactive: [
    { field: 'x', label: 'X', min: 0, max: 1023, step: 1 },
    { field: 'y', label: 'Y', min: 0, max: 1023, step: 1 },
    { field: 'sw', label: 'SW', min: 0, max: 1, step: 1 },
  ],
  pins: [
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 8, y: 60, side: 'bottom' },
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 20, y: 60, side: 'bottom' },
    { id: 'x', label: 'X', type: PIN_TYPE.ANALOG, x: 32, y: 60, side: 'bottom' },
    { id: 'y', label: 'Y', type: PIN_TYPE.ANALOG, x: 44, y: 60, side: 'bottom' },
    { id: 'sw', label: 'SW', type: PIN_TYPE.DIGITAL, x: 56, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const xv = inst.runtimeState && inst.runtimeState.x !== undefined ? inst.runtimeState.x : (inst.props.x || 512);
    const yv = inst.runtimeState && inst.runtimeState.y !== undefined ? inst.runtimeState.y : (inst.props.y || 512);
    const pressed = inst.runtimeState && inst.runtimeState.sw !== undefined ? !!inst.runtimeState.sw : !!(inst.props.sw || 0);
    const stickX = (xv / 1023 - 0.5) * 12;
    const stickY = (yv / 1023 - 0.5) * 12;

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#c8a84b';
    ctx.lineWidth = 1.5;
    [[8, 60], [20, 60], [32, 60], [44, 60], [56, 60]].forEach(([px, py]) => {
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, 54); ctx.stroke();
    });

    // Base
    ctx.fillStyle = '#26303a';
    roundRect(ctx, 2, 6, 56, 48, 5);
    ctx.fill();
    ctx.strokeStyle = '#4a5a68';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Thumb pad base
    ctx.fillStyle = '#34424e';
    ctx.beginPath(); ctx.arc(30, 28, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#55677a';
    ctx.stroke();

    // Direction guides
    ctx.strokeStyle = '#55677a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(30, 12); ctx.lineTo(30, 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 42); ctx.lineTo(30, 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, 28); ctx.lineTo(16, 28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(44, 28); ctx.lineTo(46, 28); ctx.stroke();

    // Stick
    ctx.save();
    ctx.translate(30 + stickX, 28 + stickY);
    ctx.fillStyle = '#c8d0d8';
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a96a2';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#f0f4f8';
    ctx.beginPath(); ctx.arc(-2.5, -2.5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // SW indicator
    ctx.fillStyle = pressed ? '#ff5555' : '#444';
    ctx.beginPath(); ctx.arc(44, 46, 3, 0, Math.PI * 2); ctx.fill();

    if (inst.selected) drawSelectionRect(ctx, -3, 3, 66, 63);
    ctx.restore();
  }
});


/* -------------- 4x4 Matrix Membrane Keypad ------------------ */
defComp({
  id: 'keypad_4x4',
  name: '4x4 Matrix Keypad',
  category: 'Input',
  icon: '⌨️',
  desc: '16-button matrix keypad with 8-pin interface (4 Row pins, 4 Column pins) for microcontroller scanning',
  width: 140,
  height: 160,
  defaultProps: {
    pressedKey: null,
  },
  pins: [
    { id: 'R1', label: 'R1', type: PIN_TYPE.DIGITAL, x: 20, y: 160, side: 'bottom' },
    { id: 'R2', label: 'R2', type: PIN_TYPE.DIGITAL, x: 34, y: 160, side: 'bottom' },
    { id: 'R3', label: 'R3', type: PIN_TYPE.DIGITAL, x: 48, y: 160, side: 'bottom' },
    { id: 'R4', label: 'R4', type: PIN_TYPE.DIGITAL, x: 62, y: 160, side: 'bottom' },
    { id: 'C1', label: 'C1', type: PIN_TYPE.DIGITAL, x: 78, y: 160, side: 'bottom' },
    { id: 'C2', label: 'C2', type: PIN_TYPE.DIGITAL, x: 92, y: 160, side: 'bottom' },
    { id: 'C3', label: 'C3', type: PIN_TYPE.DIGITAL, x: 106, y: 160, side: 'bottom' },
    { id: 'C4', label: 'C4', type: PIN_TYPE.DIGITAL, x: 120, y: 160, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const pressedKey = inst.runtimeState?.pressedKey ?? inst.props.pressedKey ?? null;

    const keys = [
      ['1', '2', '3', 'A'],
      ['4', '5', '6', 'B'],
      ['7', '8', '9', 'C'],
      ['*', '0', '#', 'D']
    ];

    ctx.save();
    ctx.translate(x, y);

    // 1. Black Flexible Polymer Membrane Backing Sheet
    ctx.fillStyle = '#181a1b';
    roundRect(ctx, 4, 4, 132, 142, 6);
    ctx.fill();
    ctx.strokeStyle = '#2d3135';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Graphic Outline Bevel Frame
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 8, 8, 124, 114, 4);
    ctx.stroke();

    // 2. Render 4x4 Keypad Buttons
    const btnW = 24;
    const btnH = 20;
    const startX = 14;
    const startY = 14;
    const gapX = 6;
    const gapY = 6;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const keyChar = keys[row][col];
        const kx = startX + col * (btnW + gapX);
        const ky = startY + row * (btnH + gapY);
        const isPressed = (pressedKey === keyChar);
        const isLetter = ['A', 'B', 'C', 'D'].includes(keyChar);

        // (Keypad column state is computed live in simulator digitalRead)

        // Button Surface Base
        const btnGrad = ctx.createLinearGradient(kx, ky, kx, ky + btnH);
        if (isPressed) {
          btnGrad.addColorStop(0, '#ffa000');
          btnGrad.addColorStop(1, '#ff6f00');
        } else if (isLetter) {
          btnGrad.addColorStop(0, '#37474f');
          btnGrad.addColorStop(1, '#212121');
        } else {
          btnGrad.addColorStop(0, '#424242');
          btnGrad.addColorStop(1, '#1c1c1c');
        }

        ctx.fillStyle = btnGrad;
        roundRect(ctx, kx, ky, btnW, btnH, 3);
        ctx.fill();

        // Key Border Highlight & Inset Shadow
        ctx.strokeStyle = isPressed ? '#ffe082' : (isLetter ? '#78909c' : '#616161');
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Key Characters / Legend Printing
        ctx.fillStyle = isPressed ? '#000000' : (isLetter ? '#ffb74d' : '#ffffff');
        ctx.font = 'bold 10px "JetBrains Mono", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(keyChar, kx + btnW / 2, ky + btnH / 2 + 3.5);
      }
    }

    // 3. Ribbon Cable Escape Connector Tail
    ctx.fillStyle = '#101213';
    ctx.fillRect(12, 122, 116, 16);

    // Flex cable trace silkscreen lines
    ctx.strokeStyle = '#c8a452';
    ctx.lineWidth = 0.8;
    const pinXs = [20, 34, 48, 62, 78, 92, 106, 120];
    pinXs.forEach(px => {
      ctx.beginPath();
      ctx.moveTo(px, 122);
      ctx.lineTo(px, 148);
      ctx.stroke();
    });

    // Silkscreen Pin Labels
    ctx.fillStyle = '#b0bec5';
    ctx.font = 'bold 5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ['R1', 'R2', 'R3', 'R4', 'C1', 'C2', 'C3', 'C4'].forEach((lbl, idx) => {
      ctx.fillText(lbl, pinXs[idx], 130);
    });

    // Bottom Solder Pad Headers
    pinXs.forEach(px => {
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(px, 150, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f1112';
      ctx.beginPath(); ctx.arc(px, 150, 1, 0, Math.PI * 2); ctx.fill();
    });

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 140, 160);
    ctx.restore();
  }
});

/*---------------------EC11 rotary encoder with push button----------------------- */

defComp({
  id: 'rotary_encoder',
  name: 'Rotary Encoder EC11',
  category: 'Input',
  icon: '🔄',
  desc: 'EC11 rotary encoder with push button. Infinite rotation with quadrature output (A, B) + switch',
  width: 40,
  height: 50,
  defaultProps: { position: 0, pressed: false },
  interactive: [
    { field: 'position', label: 'Pos', min: -100, max: 100, step: 1, unit: '' },
  ],
  pins: [
    { id: 'A', label: 'A', type: PIN_TYPE.DIGITAL, x: 6, y: 50, side: 'bottom' },
    { id: 'B', label: 'B', type: PIN_TYPE.DIGITAL, x: 16, y: 50, side: 'bottom' },
    { id: 'SW', label: 'SW', type: PIN_TYPE.DIGITAL, x: 26, y: 50, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 36, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const pressed = inst.runtimeState?.pressed ?? inst.props.pressed ?? false;
    const position = inst.runtimeState?.position ?? inst.props.position ?? 0;

    ctx.save();
    ctx.translate(x, y);

    // Shaft
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(20, 18, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#aaa';
    ctx.beginPath(); ctx.arc(20, 18, 5, 0, Math.PI * 2); ctx.fill();

    // Knob
    ctx.fillStyle = pressed ? '#333' : '#444';
    ctx.beginPath(); ctx.arc(20, 18, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Knob indicator
    const angle = (position * 3.6) * Math.PI / 180;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 18);
    ctx.lineTo(20 + Math.cos(angle) * 10, 18 + Math.sin(angle) * 10);
    ctx.stroke();

    // Position display
    ctx.fillStyle = '#0a0a1a';
    roundRect(ctx, 2, 34, 36, 10, 2);
    ctx.fill();
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${position}`, 20, 42);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    [6, 16, 26, 36].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 44); ctx.lineTo(px, 50); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -2, -2, 44, 54);
    ctx.restore();
  }
});

/*--------------------------8-position DIP switch bank----------------------------- */
defComp({
  id: 'dip_switch',
  name: 'DIP Switch 8-Pos',
  category: 'Input',
  icon: '🎚',
  desc: '8-position DIP switch bank. Multi-position toggle for hardware settings and binary input',
  width: 140,
  height: 60,
  defaultProps: { switches: 0 },
  // interactive: [
  //   { field: 'switches', label: 'Value', min: 0, max: 255, step: 1, unit: '' },
  // ],
  pins: [
    { id: '1', label: '1', type: PIN_TYPE.DIGITAL, x: 12, y: 60, side: 'bottom' },
    { id: '2', label: '2', type: PIN_TYPE.DIGITAL, x: 28, y: 60, side: 'bottom' },
    { id: '3', label: '3', type: PIN_TYPE.DIGITAL, x: 44, y: 60, side: 'bottom' },
    { id: '4', label: '4', type: PIN_TYPE.DIGITAL, x: 60, y: 60, side: 'bottom' },
    { id: '5', label: '5', type: PIN_TYPE.DIGITAL, x: 76, y: 60, side: 'bottom' },
    { id: '6', label: '6', type: PIN_TYPE.DIGITAL, x: 92, y: 60, side: 'bottom' },
    { id: '7', label: '7', type: PIN_TYPE.DIGITAL, x: 108, y: 60, side: 'bottom' },
    { id: '8', label: '8', type: PIN_TYPE.DIGITAL, x: 124, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const switches = inst.runtimeState?.switches ?? inst.props.switches ?? 0;

    ctx.save();
    ctx.translate(x, y);

    // Body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 0, 4, 140, 44, 5);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Switches
    for (let i = 0; i < 8; i++) {
      const isOn = (switches >> i) & 1;
      const sx = 12 + i * 16;

      // Switch housing
      ctx.fillStyle = '#333';
      roundRect(ctx, sx - 5, 10, 12, 24, 2);
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Switch toggle
      ctx.fillStyle = isOn ? '#00cc00' : '#cc0000';
      roundRect(ctx, sx - 3, isOn ? 12 : 24, 8, 8, 1);
      ctx.fill();

      // ON/OFF text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(isOn ? 'ON' : 'OFF', sx + 1, isOn ? 18 : 30);

      // Label
      ctx.fillStyle = '#aaa';
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, sx + 1, 44);
    }

    // Binary value display
    ctx.fillStyle = '#0a0a1a';
    roundRect(ctx, 30, 48, 80, 8, 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(switches.toString(2).padStart(8, '0'), 70, 55);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const px = 12 + i * 16;
      ctx.beginPath(); ctx.moveTo(px, 48); ctx.lineTo(px, 60); ctx.stroke();
    }

    if (inst.selected) drawSelectionRect(ctx, -3, 0, 146, 64);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════
   SPDT Slide ("Slider") Switch
   ═══════════════════════════════════════════════════════ */

/* Which throw the common blade is currently touching: 'a' (left) or 'b'
   (right). `position` lives in both runtimeState and props, and the
   properties-panel <select> writes it as a string — so always coerce. */
function slideSwitchThrow(inst) {
  const pos = inst.runtimeState?.position ?? inst.props?.position ?? 0;
  return Number(pos) === 1 ? 'b' : 'a';
}
window._slideSwitchThrow = slideSwitchThrow;

/* Shared by the component def and its class so the pin lists can't drift. */
const SLIDE_SWITCH_PINS = [
  { id: 'a', label: 'A', type: PIN_TYPE.DIGITAL, x: 14, y: 56, side: 'bottom' },
  { id: 'com', label: 'COM', type: PIN_TYPE.DIGITAL, x: 28, y: 56, side: 'bottom' },
  { id: 'b', label: 'B', type: PIN_TYPE.DIGITAL, x: 42, y: 56, side: 'bottom' },
];

defComp({
  id: 'slide_switch',
  name: 'Slide Switch (SPDT)',
  category: 'Input',
  icon: '↔️',
  desc: '3-position SPDT slide switch — COM touches throw A or throw B. Click it to slide.',
  width: 56,
  height: 56,
  defaultProps: { position: 0, label: 'SLIDE SW' },
  interactive: [
    {
      field: 'position',
      label: 'Position',
      type: 'select',
      options: [
        { value: '0', label: 'A  (COM ↔ A)' },
        { value: '1', label: 'B  (COM ↔ B)' },
      ],
    },
  ],
  pins: SLIDE_SWITCH_PINS,

  draw(ctx, inst) {
    const { x, y } = inst;
    const onA = slideSwitchThrow(inst) === 'a';

    const box = (bx, by, bw, bh, r) => {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, by, bw, bh, r);
      else if (typeof roundRect === 'function') roundRect(ctx, bx, by, bw, bh, r);
      else ctx.rect(bx, by, bw, bh);
    };

    ctx.save();
    ctx.translate(x, y);

    // ── Terminal leads: body underside down to the three solder pins ──
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8f8f8f';
    ctx.lineWidth = 1.6;
    for (const px of [14, 28, 42]) {
      ctx.beginPath();
      ctx.moveTo(px, 42);
      ctx.lineTo(px, 56);
      ctx.stroke();
    }
    // Blades carrying signal right now: COM plus the selected throw
    ctx.strokeStyle = '#00e5ff';
    for (const px of [28, onA ? 14 : 42]) {
      ctx.beginPath();
      ctx.moveTo(px, 42);
      ctx.lineTo(px, 56);
      ctx.stroke();
    }
    ctx.fillStyle = '#c9c9cf';
    for (const px of [14, 28, 42]) {
      ctx.beginPath();
      ctx.arc(px, 56, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Body housing ──
    box(2, 6, 52, 36, 5);
    ctx.fillStyle = '#232327';
    ctx.fill();
    ctx.strokeStyle = '#4a4a50';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Slide track ──
    box(8, 13, 40, 15, 7.5);
    ctx.fillStyle = '#0d0d11';
    ctx.fill();
    ctx.strokeStyle = '#3a3a40';
    ctx.stroke();

    // ── Throw contacts at either end of the track ──
    ctx.beginPath();
    ctx.arc(14, 20.5, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = onA ? '#00e5ff' : '#56565d';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(42, 20.5, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = onA ? '#56565d' : '#00e5ff';
    ctx.fill();

    // ── Sliding actuator ──
    const cx = onA ? 14 : 42;
    box(cx - 7, 10, 14, 21, 3);
    ctx.fillStyle = '#46464d';
    ctx.fill();
    ctx.strokeStyle = '#00e5ff'; // the blade is live in either position
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.34)';
    ctx.fillRect(cx - 5, 12.5, 3, 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.lineWidth = 1;
    for (const gx of [cx + 1, cx + 3.5, cx + 5.5]) {
      ctx.beginPath();
      ctx.moveTo(gx, 15);
      ctx.lineTo(gx, 26);
      ctx.stroke();
    }

    // ── Throw labels ──
    ctx.textAlign = 'center';
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = onA ? '#00e5ff' : '#7e7e87';
    ctx.fillText('A', 14, 39);
    ctx.fillStyle = onA ? '#7e7e87' : '#00e5ff';
    ctx.fillText('B', 42, 39);
    ctx.font = '6px monospace';
    ctx.fillStyle = '#66666e';
    ctx.fillText('COM', 28, 39);

    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -3, 3, 62, 58);
    }

    ctx.restore();
  }
});

/* ══════════════ CLASS-BASED INPUT COMPONENTS ══════════════ */

class PushButtonComponent extends Component {
  getPins() {
    return [
      { id: 'p1', label: '1', type: PIN_TYPE.DIGITAL, x: 8, y: 0, side: 'top' },
      { id: 'p2', label: '2', type: PIN_TYPE.DIGITAL, x: 32, y: 0, side: 'top' },
      { id: 'p3', label: '3', type: PIN_TYPE.DIGITAL, x: 8, y: 40, side: 'bottom' },
      { id: 'p4', label: '4', type: PIN_TYPE.DIGITAL, x: 32, y: 40, side: 'bottom' },
    ];
  }
  update(canvas) {
    const pressed = this.runtimeState.pressed;
    const p1 = this.getConnectedPinNum('p1');
    if (p1 !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
      window.ArduinoSim.pinStates[`pin_${p1}`] = pressed ? 0 : 1;
    }
  }
}

class JoystickComponent extends Component {
  getPins() {
    return [
      { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 8, y: 60, side: 'bottom' },
      { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 20, y: 60, side: 'bottom' },
      { id: 'x', label: 'X', type: PIN_TYPE.ANALOG, x: 32, y: 60, side: 'bottom' },
      { id: 'y', label: 'Y', type: PIN_TYPE.ANALOG, x: 44, y: 60, side: 'bottom' },
      { id: 'sw', label: 'SW', type: PIN_TYPE.DIGITAL, x: 56, y: 60, side: 'bottom' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const xv = this.runtimeState.x !== undefined ? this.runtimeState.x : (this.props.x || 512);
    const yv = this.runtimeState.y !== undefined ? this.runtimeState.y : (this.props.y || 512);
    const swPressed = this.runtimeState.sw !== undefined ? !!this.runtimeState.sw : !!(this.props.sw || 0);
    const xPin = this.getConnectedPinNum('x');
    const yPin = this.getConnectedPinNum('y');
    const swPin = this.getConnectedPinNum('sw');
    if (xPin !== null) sim.pinStates[`pin_${xPin}`] = xv;
    if (yPin !== null) sim.pinStates[`pin_${yPin}`] = yv;
    if (swPin !== null) sim.pinStates[`pin_${swPin}`] = swPressed ? 0 : 1;
  }
}

class RotaryEncoderComponent extends Component {
  getPins() {
    return [
      { id: 'A', label: 'A', type: PIN_TYPE.DIGITAL, x: 6, y: 50, side: 'bottom' },
      { id: 'B', label: 'B', type: PIN_TYPE.DIGITAL, x: 16, y: 50, side: 'bottom' },
      { id: 'SW', label: 'SW', type: PIN_TYPE.DIGITAL, x: 26, y: 50, side: 'bottom' },
      { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 36, y: 50, side: 'bottom' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const position = this.runtimeState?.position ?? this.props.position ?? 0;
    const pressed = this.runtimeState?.pressed ?? this.props.pressed ?? false;
    const aPin = this.getConnectedPinNum('A');
    const bPin = this.getConnectedPinNum('B');
    const swPin = this.getConnectedPinNum('SW');
    if (aPin !== null) sim.pinStates[`pin_${aPin}`] = Math.abs(position) % 2;
    if (bPin !== null) sim.pinStates[`pin_${bPin}`] = Math.abs(Math.floor(position / 2)) % 2;
    if (swPin !== null) sim.pinStates[`pin_${swPin}`] = pressed ? 0 : 1;
  }
}

class DipSwitchComponent extends Component {
  getPins() {
    return [
      { id: '1', label: '1', type: PIN_TYPE.DIGITAL, x: 12, y: 60, side: 'bottom' },
      { id: '2', label: '2', type: PIN_TYPE.DIGITAL, x: 28, y: 60, side: 'bottom' },
      { id: '3', label: '3', type: PIN_TYPE.DIGITAL, x: 44, y: 60, side: 'bottom' },
      { id: '4', label: '4', type: PIN_TYPE.DIGITAL, x: 60, y: 60, side: 'bottom' },
      { id: '5', label: '5', type: PIN_TYPE.DIGITAL, x: 76, y: 60, side: 'bottom' },
      { id: '6', label: '6', type: PIN_TYPE.DIGITAL, x: 92, y: 60, side: 'bottom' },
      { id: '7', label: '7', type: PIN_TYPE.DIGITAL, x: 108, y: 60, side: 'bottom' },
      { id: '8', label: '8', type: PIN_TYPE.DIGITAL, x: 124, y: 60, side: 'bottom' },
    ];
  }
  update(canvas) {
    const sim = window.ArduinoSim;
    if (!sim || !sim.pinStates) return;
    const switches = this.runtimeState?.switches ?? this.props.switches ?? 0;
    for (let i = 0; i < 8; i++) {
      const pinNum = this.getConnectedPinNum(String(i + 1));
      if (pinNum !== null) {
        sim.pinStates[`pin_${pinNum}`] = (switches >> i) & 1 ? 1 : 0;
      }
    }
  }
}

class SlideSwitchComponent extends Component {
  getPins() {
    return SLIDE_SWITCH_PINS;
  }
  update(canvas) {
    /* The engine shorts COM to the selected throw inside buildGraph(), so a pin
       the sketch configured as INPUT / INPUT_PULLUP / INPUT_PULLDOWN is already
       resolved — and edge-emitted for attachInterrupt() — by the voltage
       feed-back pass that runs before this. Only a pin nobody ever ran pinMode()
       on is left behind (digitalRead() would sit at its default 0 for it), so
       mirror the level wired to the selected throw there. */
    const sim = window.ArduinoSim;
    if (!sim || !sim.isRunning || !sim.pinStates || !canvas) return;
    const pinNum = this.getConnectedPinNum('com');
    if (pinNum === null) return;
    const key = `pin_${pinNum}`;
    if (sim.pinModes && sim.pinModes[key]) return; // configured pins are owned elsewhere
    if (typeof canvas._readDigitalInput !== 'function') return;
    const level = canvas._readDigitalInput(this.inst.id, slideSwitchThrow(this.inst)) ? 1 : 0;
    if (sim.pinStates[key] !== level) sim.setPinState(key, level);
  }
}

registerComponent('push_button', PushButtonComponent);
registerComponent('joystick', JoystickComponent);
registerComponent('rotary_encoder', RotaryEncoderComponent);
registerComponent('dip_switch', DipSwitchComponent);
registerComponent('slide_switch', SlideSwitchComponent);
