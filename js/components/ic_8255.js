'use strict';
/* ═══════════════════════════════════════════════════════
   Intel 8255 PPI — Programmable Peripheral Interface
   Modes 0, 1, 2 + Bit Set/Reset on Port C
   Dual interface: direct (property panel) + pin-based
   ═══════════════════════════════════════════════════════ */

defComp({
  id: 'ic_8255',
  name: 'Intel 8255 PPI',
  category: 'ICs',
  icon: '🔲',
  desc: 'Intel 8255 Programmable Peripheral Interface — 3 ports (PA, PB, PC), Modes 0/1/2, bit set/reset',
  width: 260,
  height: 260,
  defaultProps: { label: '8255' },
  interactive: ['controlWord'],
  pins: [
    // Port A — left side
    { id: 'PA0', label: 'PA0', type: PIN_TYPE.DIGITAL, x: 10, y: 20, side: 'left' },
    { id: 'PA1', label: 'PA1', type: PIN_TYPE.DIGITAL, x: 10, y: 34, side: 'left' },
    { id: 'PA2', label: 'PA2', type: PIN_TYPE.DIGITAL, x: 10, y: 48, side: 'left' },
    { id: 'PA3', label: 'PA3', type: PIN_TYPE.DIGITAL, x: 10, y: 62, side: 'left' },
    { id: 'PA4', label: 'PA4', type: PIN_TYPE.DIGITAL, x: 10, y: 76, side: 'left' },
    { id: 'PA5', label: 'PA5', type: PIN_TYPE.DIGITAL, x: 10, y: 90, side: 'left' },
    { id: 'PA6', label: 'PA6', type: PIN_TYPE.DIGITAL, x: 10, y: 104, side: 'left' },
    { id: 'PA7', label: 'PA7', type: PIN_TYPE.DIGITAL, x: 10, y: 118, side: 'left' },
    // Port B — right side
    { id: 'PB0', label: 'PB0', type: PIN_TYPE.DIGITAL, x: 250, y: 20, side: 'right' },
    { id: 'PB1', label: 'PB1', type: PIN_TYPE.DIGITAL, x: 250, y: 34, side: 'right' },
    { id: 'PB2', label: 'PB2', type: PIN_TYPE.DIGITAL, x: 250, y: 48, side: 'right' },
    { id: 'PB3', label: 'PB3', type: PIN_TYPE.DIGITAL, x: 250, y: 62, side: 'right' },
    { id: 'PB4', label: 'PB4', type: PIN_TYPE.DIGITAL, x: 250, y: 76, side: 'right' },
    { id: 'PB5', label: 'PB5', type: PIN_TYPE.DIGITAL, x: 250, y: 90, side: 'right' },
    { id: 'PB6', label: 'PB6', type: PIN_TYPE.DIGITAL, x: 250, y: 104, side: 'right' },
    { id: 'PB7', label: 'PB7', type: PIN_TYPE.DIGITAL, x: 250, y: 118, side: 'right' },
    // Port C — bottom
    { id: 'PC0', label: 'PC0', type: PIN_TYPE.DIGITAL, x: 30, y: 250, side: 'bottom' },
    { id: 'PC1', label: 'PC1', type: PIN_TYPE.DIGITAL, x: 55, y: 250, side: 'bottom' },
    { id: 'PC2', label: 'PC2', type: PIN_TYPE.DIGITAL, x: 80, y: 250, side: 'bottom' },
    { id: 'PC3', label: 'PC3', type: PIN_TYPE.DIGITAL, x: 105, y: 250, side: 'bottom' },
    { id: 'PC4', label: 'PC4', type: PIN_TYPE.DIGITAL, x: 130, y: 250, side: 'bottom' },
    { id: 'PC5', label: 'PC5', type: PIN_TYPE.DIGITAL, x: 155, y: 250, side: 'bottom' },
    { id: 'PC6', label: 'PC6', type: PIN_TYPE.DIGITAL, x: 180, y: 250, side: 'bottom' },
    { id: 'PC7', label: 'PC7', type: PIN_TYPE.DIGITAL, x: 205, y: 250, side: 'bottom' },
    // Control signals — top
    { id: 'CS',  label: 'CS',  type: PIN_TYPE.SIGNAL, x: 60,  y: 0, side: 'top' },
    { id: 'RD',  label: 'RD',  type: PIN_TYPE.SIGNAL, x: 90,  y: 0, side: 'top' },
    { id: 'WR',  label: 'WR',  type: PIN_TYPE.SIGNAL, x: 120, y: 0, side: 'top' },
    { id: 'A0',  label: 'A0',  type: PIN_TYPE.SIGNAL, x: 150, y: 0, side: 'top' },
    { id: 'A1',  label: 'A1',  type: PIN_TYPE.SIGNAL, x: 180, y: 0, side: 'top' },
    { id: 'RST', label: 'RST', type: PIN_TYPE.SIGNAL, x: 210, y: 0, side: 'top' },
    // Data bus — bottom-right
    { id: 'D0', label: 'D0', type: PIN_TYPE.DIGITAL, x: 130, y: 260, side: 'bottom' },
    { id: 'D1', label: 'D1', type: PIN_TYPE.DIGITAL, x: 145, y: 260, side: 'bottom' },
    { id: 'D2', label: 'D2', type: PIN_TYPE.DIGITAL, x: 160, y: 260, side: 'bottom' },
    { id: 'D3', label: 'D3', type: PIN_TYPE.DIGITAL, x: 175, y: 260, side: 'bottom' },
    { id: 'D4', label: 'D4', type: PIN_TYPE.DIGITAL, x: 190, y: 260, side: 'bottom' },
    { id: 'D5', label: 'D5', type: PIN_TYPE.DIGITAL, x: 205, y: 260, side: 'bottom' },
    { id: 'D6', label: 'D6', type: PIN_TYPE.DIGITAL, x: 220, y: 260, side: 'bottom' },
    { id: 'D7', label: 'D7', type: PIN_TYPE.DIGITAL, x: 235, y: 260, side: 'bottom' },
    // Power
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 250, y: 230, side: 'right' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND,   x: 10,  y: 230, side: 'left' },
  ],

  _initState(inst) {
    if (inst.runtimeState._inited) return;
    const rs = inst.runtimeState;
    rs._inited = true;
    rs.directMode = true;
    rs.controlWord = 0x9B;
    rs.portA = { mode: 0, dir: 1, value: 0xFF, intEn: false };
    rs.portB = { mode: 0, dir: 1, value: 0xFF, intEn: false };
    rs.portC = { dir_upper: 1, dir_lower: 1, value: 0xFF };
    rs.dataBus = 0;
    rs.handshake = { STB_A: 0, IBF_A: 0, INTR_A: 0, OBF_A: 0, ACK_A: 0, INTE_A: 0,
                     STB_B: 0, IBF_B: 0, INTR_B: 0, OBF_B: 0, ACK_B: 0, INTE_B: 0 };
  },

  _applyControlWord(rs, cw) {
    rs.controlWord = cw & 0xFF;
    if (cw & 0x80) {
      rs.portA.mode = (cw >> 5) & 3;
      rs.portA.dir = (cw >> 4) & 1;
      rs.portC.dir_upper = (cw >> 3) & 1;
      rs.portB.mode = (cw >> 2) & 1;
      rs.portB.dir = (cw >> 1) & 1;
      rs.portC.dir_lower = cw & 1;
    } else {
      const bit = (cw >> 1) & 7;
      const val = cw & 1;
      if (val) rs.portC.value |= (1 << bit);
      else rs.portC.value &= ~(1 << bit);
    }
  },

  _readPin(inst, sim, pinId) {
    const b = window.CircuitCanvas;
    if (!b) return 0;
    const ps = sim ? sim.pinStates : null;
    if (!ps) return 0;
    const pn = b._getConnectedPinNum ? b._getConnectedPinNum(inst.id, pinId) : null;
    if (pn !== null) return (ps['pin_' + pn] || 0) > 0 ? 1 : 0;
    return 0;
  },

  _readDataBus(inst, sim) {
    let val = 0;
    for (let i = 0; i < 8; i++) {
      if (this._readPin(inst, sim, 'D' + i)) val |= (1 << i);
    }
    return val;
  },

  _writeDataBus(inst, sim, val) {
    const b = window.CircuitCanvas;
    if (!b) return;
    for (let i = 0; i < 8; i++) {
      b._writeDigitalOutput(inst.id, 'D' + i, (val >> i) & 1);
    }
  },

  _writePortPins(inst, rs) {
    const b = window.CircuitCanvas;
    if (!b) return;
    const ports = [
      { prefix: 'PA', val: rs.portA.value, dir: rs.portA.dir },
      { prefix: 'PB', val: rs.portB.value, dir: rs.portB.dir },
      { prefix: 'PC', val: rs.portC.value, dir: rs.portC.dir_lower }
    ];
    ports.forEach(p => {
      for (let i = 0; i < 8; i++) {
        b._writeDigitalOutput(inst.id, p.prefix + i, (p.val >> i) & 1);
      }
    });
  },

  _handleHandshakes(rs) {
    if (rs.portA.mode === 1 && rs.portA.dir === 1) {
      rs.handshake.IBF_A = rs.portA.value !== rs.portA._lastRead ? 1 : 0;
      rs.handshake.INTR_A = (rs.handshake.IBF_A && rs.handshake.INTE_A) ? 1 : 0;
      rs.portA._lastRead = rs.portA.value;
    }
    if (rs.portA.mode === 1 && rs.portA.dir === 0) {
      rs.handshake.OBF_A = rs.portA._dirty ? 0 : 1;
      rs.handshake.INTR_A = (rs.handshake.OBF_A && rs.handshake.ACK_A && rs.handshake.INTE_A) ? 1 : 0;
      rs.portA._dirty = false;
    }
    if (rs.portA.mode === 2) {
      rs.handshake.OBF_A = rs.portA._dirty ? 0 : 1;
      rs.handshake.IBF_A = 0;
      rs.handshake.INTR_A = ((rs.handshake.OBF_A && rs.handshake.ACK_A) || rs.handshake.IBF_A) ? rs.handshake.INTE_A : 0;
      rs.portA._dirty = false;
    }
  },

  step(inst, sim) {
    this._initState(inst);
    const rs = inst.runtimeState;
    if (rs.directMode) {
      this._applyControlWord(rs, rs.controlWord);
      this._writePortPins(inst, rs);
      this._handleHandshakes(rs);
      return;
    }
    const cs = this._readPin(inst, sim, 'CS');
    const rd = this._readPin(inst, sim, 'RD');
    const wr = this._readPin(inst, sim, 'WR');
    const a0 = this._readPin(inst, sim, 'A0');
    const a1 = this._readPin(inst, sim, 'A1');
    const rst = this._readPin(inst, sim, 'RST');
    if (rst) {
      this._applyControlWord(rs, 0x9B);
      this._writePortPins(inst, rs);
      return;
    }
    if (cs) return;
    const addr = (a1 << 1) | a0;
    if (!wr) {
      const data = this._readDataBus(inst, sim);
      if (addr === 3) this._applyControlWord(rs, data);
      else if (addr === 0) { rs.portA.value = data; rs.portA._dirty = true; }
      else if (addr === 1) { rs.portB.value = data; rs.portB._dirty = true; }
      else if (addr === 2) { rs.portC.value = data; }
    }
    if (!rd) {
      let data = 0;
      if (addr === 0) data = rs.portA.value;
      else if (addr === 1) data = rs.portB.value;
      else if (addr === 2) data = rs.portC.value;
      else data = rs.controlWord;
      this._writeDataBus(inst, sim, data);
    }
    this._handleHandshakes(rs);
    this._writePortPins(inst, rs);
  },

  draw(ctx, inst, sim) {
    const { x, y, width: W, height: H } = inst;
    ctx.save();
    ctx.translate(x, y);

    const rs = inst.runtimeState || {};
    this._initState(inst);

    // PCB background
    ctx.fillStyle = '#0a1e3a';
    roundRect(ctx, 0, 0, W, H, 6);
    ctx.fill();
    ctx.strokeStyle = '#1a3e6a';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 0, 0, W, H, 6);
    ctx.stroke();

    // Chip body
    ctx.fillStyle = '#1a1a2e';
    roundRect(ctx, 50, 14, 160, 220, 4);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    roundRect(ctx, 50, 14, 160, 220, 4);
    ctx.stroke();

    // Notch
    ctx.beginPath();
    ctx.arc(130, 22, 8, 0, Math.PI);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(68, 32, 3, 0, Math.PI * 2);
    ctx.fill();

    // Chip label
    ctx.fillStyle = '#888';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Intel', 130, 80);
    ctx.fillText('8255', 130, 96);
    ctx.font = '9px monospace';
    ctx.fillText('PPI', 130, 112);

    // Mode display
    const modeA = rs.portA ? rs.portA.mode : 0;
    const modeB = rs.portB ? rs.portB.mode : 0;
    ctx.font = '8px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.fillText('A: Mode ' + modeA + (rs.portA?.dir ? ' IN' : ' OUT'), 130, 135);
    ctx.fillText('B: Mode ' + modeB + (rs.portB?.dir ? ' IN' : ' OUT'), 130, 148);
    ctx.fillText('CW: 0x' + (rs.controlWord || 0x9B).toString(16).toUpperCase().padStart(2, '0'), 130, 165);

    // Port labels
    ctx.font = '7px monospace';
    ctx.fillStyle = '#777';
    ctx.textAlign = 'center';
    ctx.fillText('PORT A', 30, 14);
    ctx.fillText('PORT B', 230, 14);
    ctx.fillText('PORT C', 118, 248);
    ctx.fillText('DATA', 183, 248);

    // Port A/B LEDs inside chip
    const _ps = sim && sim.pinStates ? sim.pinStates : {};
    const _ledR = 2.5;
    const _drawLed = (cx, cy, isHigh) => {
      if (isHigh) { ctx.shadowColor = '#00ff44'; ctx.shadowBlur = 5; }
      ctx.fillStyle = isHigh ? '#00ff44' : '#1a2a1a';
      ctx.beginPath(); ctx.arc(cx, cy, _ledR, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    };

    // Port A LEDs (left column inside chip)
    for (let i = 0; i < 8; i++) {
      const lx = 65, ly = 30 + i * 22;
      _drawLed(lx, ly, !!_ps[inst.id + '_PA' + i]);
      ctx.fillStyle = '#555';
      ctx.font = '5px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('PA' + i, lx + 6, ly + 2);
    }

    // Port B LEDs (right column inside chip)
    for (let i = 0; i < 8; i++) {
      const lx = 195, ly = 30 + i * 22;
      _drawLed(lx, ly, !!_ps[inst.id + '_PB' + i]);
      ctx.fillStyle = '#555';
      ctx.font = '5px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('PB' + i, lx - 6, ly + 2);
    }

    // Port A value hex
    let paVal = 0;
    if (rs.portA) paVal = rs.portA.value;
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('0x' + (paVal & 0xFF).toString(16).toUpperCase().padStart(2, '0'), 130, 185);

    // Port B value hex
    let pbVal = 0;
    if (rs.portB) pbVal = rs.portB.value;
    ctx.fillText('0x' + (pbVal & 0xFF).toString(16).toUpperCase().padStart(2, '0'), 130, 198);

    // Port C value hex
    let pcVal = 0;
    if (rs.portC) pcVal = rs.portC.value;
    ctx.fillText('0x' + (pcVal & 0xFF).toString(16).toUpperCase().padStart(2, '0'), 130, 218);

    // Pin label rendering
    const pinsList = this.pins;
    ctx.font = 'bold 5px monospace';
    for (let pli = 0; pli < pinsList.length; pli++) {
      const pin = pinsList[pli];
      if (pin.side !== 'left' && pin.side !== 'right' && pin.side !== 'top' && pin.side !== 'bottom') continue;
      const pw = ctx.measureText(pin.label).width + 6;
      let bx, by;
      if (pin.side === 'left') { bx = pin.x - 2 - pw; by = pin.y - 4.5; }
      else if (pin.side === 'right') { bx = pin.x + 2; by = pin.y - 4.5; }
      else if (pin.side === 'top') { bx = pin.x - pw / 2; by = pin.y + 2; }
      else { bx = pin.x - pw / 2; by = pin.y - 14; }
      let bgColor = 'rgba(10,30,58,0.9)';
      if (pin.type === PIN_TYPE.POWER) bgColor = 'rgba(160,30,30,0.9)';
      else if (pin.type === PIN_TYPE.GND) bgColor = 'rgba(35,35,40,0.9)';
      else if (pin.type === PIN_TYPE.SIGNAL) bgColor = 'rgba(50,50,80,0.9)';
      ctx.fillStyle = bgColor;
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 2;
      roundRect(ctx, bx, by, pw, 9, 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#e6edf3';
      ctx.textAlign = (pin.side === 'left' || pin.side === 'top') ? 'right' : 'left';
      if (pin.side === 'top' || pin.side === 'bottom') ctx.textAlign = 'center';
      ctx.fillText(pin.label, bx + (pin.side === 'left' ? pw - 3 : pin.side === 'right' ? 3 : pw / 2), by + 7);
    }

    // Selection outline
    if (inst && inst.selected) {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      roundRect(ctx, -2, -2, W + 4, H + 4, 12);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
});
