'use strict';
/* ═══════════════════════════════════════════════════════
   Intel 8255 PPI — Programmable Peripheral Interface
   Modes 0, 1, 2 + Bit Set/Reset on Port C
   busMode 'manual'   — ports driven from the property panel
   busMode 'external' — real CS/RD/WR/A0/A1/D0-D7 bus cycles
   ═══════════════════════════════════════════════════════ */

defComp({
  id: 'ic_8255',
  name: 'Intel 8255 PPI',
  category: 'Digital ICs',
  icon: '🔲',
  desc: 'Intel 8255 Programmable Peripheral Interface — 3 ports (PA, PB, PC), Modes 0/1/2, bit set/reset',
  width: 260,
  height: 260,
  defaultProps: {
    label: '8255',
    busMode: 'manual',
    modeA: '0',
    modeB: '0',
    dirA: 'in',
    dirB: 'in',
    dirCupper: 'in',
    dirClower: 'in',
    paValue: 255,
    pbValue: 255,
    pcValue: 255,
  },
  interactive: [
    {
      field: 'busMode', label: 'Bus Mode', type: 'select', options: [
        { value: 'manual', label: 'Manual (panel driven)' },
        { value: 'external', label: 'External bus (CS/RD/WR)' },
      ]
    },
    {
      field: 'modeA', label: 'Port A Mode', type: 'select', options: [
        { value: '0', label: 'Mode 0 — basic I/O' },
        { value: '1', label: 'Mode 1 — strobed I/O' },
        { value: '2', label: 'Mode 2 — bidirectional bus' },
      ]
    },
    {
      field: 'modeB', label: 'Port B Mode', type: 'select', options: [
        { value: '0', label: 'Mode 0 — basic I/O' },
        { value: '1', label: 'Mode 1 — strobed I/O' },
      ]
    },
    {
      field: 'dirA', label: 'Port A Direction', type: 'select', options: [
        { value: 'out', label: 'Output' },
        { value: 'in', label: 'Input' },
      ]
    },
    {
      field: 'dirB', label: 'Port B Direction', type: 'select', options: [
        { value: 'out', label: 'Output' },
        { value: 'in', label: 'Input' },
      ]
    },
    {
      field: 'dirCupper', label: 'Port C Upper (PC4-7)', type: 'select', options: [
        { value: 'out', label: 'Output' },
        { value: 'in', label: 'Input' },
      ]
    },
    {
      field: 'dirClower', label: 'Port C Lower (PC0-3)', type: 'select', options: [
        { value: 'out', label: 'Output' },
        { value: 'in', label: 'Input' },
      ]
    },
    { field: 'paValue', label: 'Port A Value', min: 0, max: 255, step: 1, unit: '' },
    { field: 'pbValue', label: 'Port B Value', min: 0, max: 255, step: 1, unit: '' },
    { field: 'pcValue', label: 'Port C Value', min: 0, max: 255, step: 1, unit: '' },
  ],
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
    { id: 'CS',  label: 'CS̄',  type: PIN_TYPE.SIGNAL, x: 60,  y: 0, side: 'top' },
    { id: 'RD',  label: 'RD̄',  type: PIN_TYPE.SIGNAL, x: 90,  y: 0, side: 'top' },
    { id: 'WR',  label: 'WR̄',  type: PIN_TYPE.SIGNAL, x: 120, y: 0, side: 'top' },
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

  /* ── state ─────────────────────────────────────────── */
  _initState(inst) {
    if (inst.runtimeState._inited) return;
    const rs = inst.runtimeState;
    rs._inited = true;
    rs.controlWord = 0x9B;
    rs.portA = { mode: 0, dir: 1, value: 0xFF, intEn: false };
    rs.portB = { mode: 0, dir: 1, value: 0xFF, intEn: false };
    rs.portC = { dir_upper: 1, dir_lower: 1, value: 0xFF };
    rs.dataBus = 0;
    rs.handshake = { STB_A: 0, IBF_A: 0, INTR_A: 0, OBF_A: 0, ACK_A: 0, INTE_A: 0,
                     STB_B: 0, IBF_B: 0, INTR_B: 0, OBF_B: 0, ACK_B: 0, INTE_B: 0 };
    rs._busLvl = { cs: 0, rd: 1, wr: 1, a0: 0, a1: 0, rst: 0 };
    rs._busData = 0;
    rs._wrPrev = 1;
  },

  /* ── control word ──────────────────────────────────── */
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

  /* Compose the datasheet control word from the manual-mode panel props. */
  _cwFromProps(inst) {
    const p = inst.props || {};
    const modeA = p.modeA === '1' ? 1 : p.modeA === '2' ? 2 : 0;
    const modeB = p.modeB === '1' ? 1 : 0;
    const dirA = p.dirA === 'in' ? 1 : 0;
    const dirB = p.dirB === 'in' ? 1 : 0;
    const dirCu = p.dirCupper === 'in' ? 1 : 0;
    const dirCl = p.dirClower === 'in' ? 1 : 0;
    return 0x80 | (modeA << 5) | (dirA << 4) | (dirCu << 3) | (modeB << 2) | (dirB << 1) | dirCl;
  },

  /* Push a bus-written control word back into the panel props. */
  _syncPropsFromCW(inst, cw) {
    inst.props = inst.props || {};
    inst.props.modeA = String((cw >> 5) & 3);
    inst.props.dirA = ((cw >> 4) & 1) ? 'in' : 'out';
    inst.props.dirCupper = ((cw >> 3) & 1) ? 'in' : 'out';
    inst.props.modeB = ((cw >> 2) & 1) ? '1' : '0';
    inst.props.dirB = ((cw >> 1) & 1) ? 'in' : 'out';
    inst.props.dirClower = (cw & 1) ? 'in' : 'out';
  },

  /* ── pin / bus plumbing ────────────────────────────── */
  _canvas() {
    return window.CircuitCanvas || null;
  },

  /* Sample a single pin: panel force first, then the wire graph, else 0. */
  _samplePin(inst, pinId) {
    const b = this._canvas();
    if (!b) return 0;
    if (typeof b._getForcedLevel === 'function') {
      const forced = b._getForcedLevel(inst.id, pinId);
      if (forced !== null) return forced ? 1 : 0;
    }
    if (typeof b._readDigitalInput !== 'function') return 0;
    return b._readDigitalInput(inst.id, pinId) & 1;
  },

  _readDataBus(inst) {
    let val = 0;
    for (let i = 0; i < 8; i++) {
      if (this._samplePin(inst, 'D' + i)) val |= (1 << i);
    }
    return val;
  },

  _writeDataBus(inst, val) {
    const b = this._canvas();
    if (!b) return;
    for (let i = 0; i < 8; i++) {
      b._writeDigitalOutput(inst.id, 'D' + i, (val >> i) & 1);
    }
  },

  /* Immediate bus hook — called by CircuitCanvas._writeDigitalOutput the
     moment a far-end driver (an 8085 port, a DIP switch, …) changes one of
     the 8255's pins. Without this the bus would only be sampled once per
     rendered frame and every WR̄ pulse would be missed. */
  _onBusPin(inst, pinId, val) {
    this._initState(inst);
    const rs = inst.runtimeState;
    const lvl = rs._busLvl;
    const v = val ? 1 : 0;

    if (pinId === 'D0' || pinId === 'D1' || pinId === 'D2' || pinId === 'D3' ||
        pinId === 'D4' || pinId === 'D5' || pinId === 'D6' || pinId === 'D7') {
      const bit = 1 << Number(pinId.charAt(1));
      if (v) rs._busData |= bit; else rs._busData &= ~bit;
    } else if (pinId === 'CS') lvl.cs = v;
    else if (pinId === 'RD') lvl.rd = v;
    else if (pinId === 'WR') lvl.wr = v;
    else if (pinId === 'A0') lvl.a0 = v;
    else if (pinId === 'A1') lvl.a1 = v;
    else if (pinId === 'RST') lvl.rst = v;
    else return;

    if ((inst.props && inst.props.busMode) === 'external') {
      this._busEval(inst);
    }
  },

  /* One bus evaluation: level-sensitive RST/CS, edge-sensitive WR̄, level
     sensitive RD̄. Guarded by _wrPrev so a single falling edge is applied
     exactly once even when _onBusPin and the per-frame poll both see it. */
  _busEval(inst) {
    const rs = inst.runtimeState;
    // _writeDataBus() re-enters _onBusPin() for each D pin — stop the cycle.
    if (rs._busBusy) return;
    rs._busBusy = true;
    try {
      this._busEvalInner(inst);
    } finally {
      rs._busBusy = false;
    }
  },

  _busEvalInner(inst) {
    const rs = inst.runtimeState;
    const lvl = rs._busLvl;

    if (rs._wrPrev === undefined) rs._wrPrev = lvl.wr;
    const wrFalling = rs._wrPrev === 1 && lvl.wr === 0;
    rs._wrPrev = lvl.wr;

    if (lvl.rst) {
      this._applyControlWord(rs, 0x9B);
      this._syncPropsFromCW(inst, 0x9B);
      rs._busData = 0;
      return;
    }
    if (lvl.cs) return;                 // CS̄ active low — deselected

    if (wrFalling) {
      const addr = ((lvl.a1 & 1) << 1) | (lvl.a0 & 1);
      const data = rs._busData & 0xFF;
      if (addr === 3) {
        this._applyControlWord(rs, data);
        if (data & 0x80) this._syncPropsFromCW(inst, data);
      } else if (addr === 0) rs.portA.value = data;
      else if (addr === 1) rs.portB.value = data;
      else if (addr === 2) rs.portC.value = data;
    }
    if (!lvl.rd) {
      const addr = ((lvl.a1 & 1) << 1) | (lvl.a0 & 1);
      let data = 0;
      if (addr === 0) data = rs.portA.value;
      else if (addr === 1) data = rs.portB.value;
      else if (addr === 2) data = rs.portC.value;
      else data = rs.controlWord;
      this._writeDataBus(inst, data);
    }
  },

  /* ── port direction handling ───────────────────────── */
  _writePortPins(inst, rs) {
    const b = this._canvas();
    if (!b) return;

    const drive = (pid, bit, isOut) => {
      rs[pid] = bit ? 255 : 0;                    // visible to _tracePinNet/_isGroundPin
      if (isOut) b._writeDigitalOutput(inst.id, pid, bit);
    };

    for (let i = 0; i < 8; i++) {
      drive('PA' + i, (rs.portA.value >> i) & 1, rs.portA.dir === 0);
      drive('PB' + i, (rs.portB.value >> i) & 1, rs.portB.dir === 0);
    }
    for (let i = 0; i < 8; i++) {
      const isOut = (i < 4 ? rs.portC.dir_lower : rs.portC.dir_upper) === 0;
      drive('PC' + i, (rs.portC.value >> i) & 1, isOut);
    }
  },

  /* Input ports sample the wire instead of driving it. */
  _sampleInputPorts(inst, rs) {
    const sample8 = (prefix) => {
      let v = 0;
      for (let i = 0; i < 8; i++) if (this._samplePin(inst, prefix + i)) v |= (1 << i);
      return v;
    };
    if (rs.portA.dir === 1) rs.portA.value = sample8('PA');
    if (rs.portB.dir === 1) rs.portB.value = sample8('PB');
    if (rs.portC.dir_lower === 1) {
      rs.portC.value = (rs.portC.value & 0xF0) | (sample8('PC') & 0x0F);
    }
    if (rs.portC.dir_upper === 1) {
      rs.portC.value = (rs.portC.value & 0x0F) | (sample8('PC') & 0xF0);
    }
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

  /* ── per-frame update ──────────────────────────────── */
  step(inst, sim) {
    this._initState(inst);
    const rs = inst.runtimeState;
    const external = (inst.props && inst.props.busMode) === 'external';

    if (external) {
      // Slow fallback poll for hand-built buses that never call _onBusPin.
      const read = (id) => this._samplePin(inst, id);
      const lvl = rs._busLvl;
      lvl.cs = read('CS'); lvl.rd = read('RD'); lvl.wr = read('WR');
      lvl.a0 = read('A0'); lvl.a1 = read('A1'); lvl.rst = read('RST');
      this._busEval(inst);
    } else {
      this._applyControlWord(rs, this._cwFromProps(inst));
      rs.portA.value = Number(inst.props?.paValue) || 0;
      rs.portB.value = Number(inst.props?.pbValue) || 0;
      rs.portC.value = Number(inst.props?.pcValue) || 0;
      this._sampleInputPorts(inst, rs);
    }

    this._writePortPins(inst, rs);
    this._handleHandshakes(rs);
  },

  /* ── rendering ─────────────────────────────────────── */
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
    const dirTxt = (d) => (d === 0 ? 'OUT' : 'IN');
    ctx.font = '8px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.fillText('A: Mode ' + (rs.portA ? rs.portA.mode : 0) + ' ' + dirTxt(rs.portA ? rs.portA.dir : 1), 130, 135);
    ctx.fillText('B: Mode ' + (rs.portB ? rs.portB.mode : 0) + ' ' + dirTxt(rs.portB ? rs.portB.dir : 1), 130, 148);
    ctx.fillText('CW: 0x' + (rs.controlWord || 0x9B).toString(16).toUpperCase().padStart(2, '0'), 130, 165);

    // Bus-mode badge
    const isExternal = (inst.props && inst.props.busMode) === 'external';
    ctx.fillStyle = isExternal ? '#ffb347' : '#777';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(isExternal ? 'BUS' : 'MANUAL', 130, 176);

    // Port labels
    ctx.font = '7px monospace';
    ctx.fillStyle = '#777';
    ctx.textAlign = 'center';
    ctx.fillText('PORT A', 30, 14);
    ctx.fillText('PORT B', 230, 14);
    ctx.fillText('PORT C', 118, 248);
    ctx.fillText('DATA', 183, 248);

    const _ledR = 2.5;
    const _drawLed = (cx, cy, isHigh) => {
      if (isHigh) { ctx.shadowColor = '#00ff44'; ctx.shadowBlur = 5; }
      ctx.fillStyle = isHigh ? '#00ff44' : '#1a2a1a';
      ctx.beginPath(); ctx.arc(cx, cy, _ledR, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    };

    // Port A / Port B bit LEDs
    for (let i = 0; i < 8; i++) {
      const lx = 65, ly = 30 + i * 22;
      _drawLed(lx, ly, !!rs['PA' + i]);
      ctx.fillStyle = '#555';
      ctx.font = '5px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('PA' + i, lx + 6, ly + 2);
    }
    for (let i = 0; i < 8; i++) {
      const lx = 195, ly = 30 + i * 22;
      _drawLed(lx, ly, !!rs['PB' + i]);
      ctx.fillStyle = '#555';
      ctx.font = '5px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('PB' + i, lx - 6, ly + 2);
    }

    // Port value hex
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    const hex = (v) => '0x' + ((v || 0) & 0xFF).toString(16).toUpperCase().padStart(2, '0');
    ctx.fillText(hex(rs.portA && rs.portA.value), 130, 190);
    ctx.fillText(hex(rs.portB && rs.portB.value), 130, 200);
    ctx.fillText(hex(rs.portC && rs.portC.value), 130, 214);

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
