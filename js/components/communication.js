'use strict';

defComp({
  id: 'wifi_module',
  name: 'Wi-Fi Hotspot',
  category: 'Communication',
  icon: '\u{1f4f6}',
  desc: 'Simulated Wi-Fi Access Point with RSSI calculation, client tracking, and real-time status indicators.',
  search: 'wifi hotspot wireless router access point internet network',
  width: 80,
  height: 80,

  defaultProps: {
    ssid: 'ArduSim_Network',
    password: 'password123',
    channel: 6,
    ipAddress: '192.168.4.1',
    txPower: 20, // dBm
    security: 'WPA2-PSK',
    hidden: false,
  },

  interactive: [
    { field: 'ssid',      label: 'Wi-Fi SSID',   type: 'text' },
    { field: 'password',  label: 'Password',     type: 'text' },
    { field: 'channel',   label: 'Channel',      type: 'number', min: 1, max: 13, step: 1 },
    { field: 'security',  label: 'Security',     type: 'select', options: [{ value: 'WPA2-PSK', label: 'WPA2-PSK' }, { value: 'OPEN', label: 'OPEN' }] },
    { field: 'ipAddress', label: 'Gateway IP',   type: 'text' },
    { field: 'txPower',   label: 'TX Power dBm', type: 'number', min: 0, max: 20, step: 1 },
    { field: 'hidden',    label: 'Hide SSID',    type: 'boolean' },
  ],

  pins: [],

  step(inst, sim) {
    if (!window._wifiBus) {
      window._wifiBus = {
        hotspots: {},
        // Calculates signal strength (RSSI in dBm) based on physical distance on canvas
        getSignalStrength(hotspotId, clientX, clientY) {
          const ap = this.hotspots[hotspotId];
          if (!ap || !ap.active) return -100;
          const dx = (ap.x + ap.width / 2) - clientX;
          const dy = (ap.y + ap.height / 2) - clientY;
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const rssi = ap.txPower - (20 * Math.log10(dist / 10)); // Log-distance path loss
          return Math.max(-95, Math.min(-30, Math.round(rssi)));
        }
      };
    }

    const isRunning = !!(sim && sim.isRunning);

    if (isRunning) {
      if (!inst._state) {
        inst._state = {
          clients: new Map(),
          lastTxTime: 0,
        };
      }

      window._wifiBus.hotspots[inst.id] = {
        id: inst.id,
        ssid: inst.props.ssid || 'ArduSim_Network',
        password: inst.props.password || '',
        channel: inst.props.channel || 6,
        security: inst.props.security || 'WPA2-PSK',
        ipAddress: inst.props.ipAddress || '192.168.4.1',
        txPower: inst.props.txPower ?? 20,
        hidden: !!inst.props.hidden,
        active: true,
        x: inst.x,
        y: inst.y,
        width: inst.width || 80,
        height: inst.height || 80,
        clients: inst._state.clients,
        // Call this when data packets are transmitted to trigger flash animation
        triggerTx() {
          if (inst._state) inst._state.lastTxTime = Date.now();
        },
        simulator: sim,
      };
    } else {
      delete window._wifiBus.hotspots[inst.id];
      if (inst._state) inst._state.clients.clear();
    }
  },

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const w = inst.width || 80;
    const h = inst.height || 80;
    const ssid = inst.props.ssid || 'ArduSim_Network';
    const isRunning = !!(sim && sim.isRunning);
    const state = inst._state || { clients: new Map(), lastTxTime: 0 };
    const clientCount = state.clients ? state.clients.size : 0;
    const isTxActive = isRunning && (Date.now() - state.lastTxTime < 150);

    ctx.save();
    ctx.translate(x, y);

    const drawRR = (rx, ry, rw, rh, rad) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, rad);
      else ctx.rect(rx, ry, rw, rh);
    };

    // --- Drop Shadow ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    drawRR(4, 6, w - 2, h - 2, 8);
    ctx.fill();

    // --- Main Housing Gradient ---
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#232b38');
    bgGrad.addColorStop(0.4, '#18202c');
    bgGrad.addColorStop(1, '#0f141d');
    ctx.fillStyle = bgGrad;
    drawRR(2, 4, w - 4, h - 6, 8);
    ctx.fill();

    // Outer Bezel Ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    drawRR(2, 4, w - 4, h - 6, 8);
    ctx.stroke();

    // --- OLED Screen Glass ---
    ctx.fillStyle = '#0a0d14';
    drawRR(8, 26, w - 16, 32, 4);
    ctx.fill();
    ctx.strokeStyle = isRunning ? 'rgba(0, 210, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)';
    ctx.stroke();

    // --- Dual Tilted Antennas ---
    const drawAntenna = (ax, ay, angle) => {
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(angle);
      ctx.strokeStyle = '#3a4659';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -14);
      ctx.stroke();
      ctx.fillStyle = '#607088';
      ctx.beginPath();
      ctx.arc(0, -14, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawAntenna(18, 10, -0.2);
    drawAntenna(w - 18, 10, 0.2);

    // --- Animated Wi-Fi Signal Waves ---
    if (isRunning) {
      const now = Date.now();
      const wavePhase = (now % 1200) / 1200;

      ctx.lineWidth = 1.8;
      for (let i = 0; i < 3; i++) {
        const opacity = Math.max(0, 1 - ((wavePhase + i * 0.33) % 1));
        const radius = 4 + (((wavePhase + i * 0.33) % 1) * 12);

        ctx.strokeStyle = `rgba(0, 212, 255, ${opacity * 0.85})`;
        ctx.beginPath();
        ctx.arc(w / 2, 10, radius, -Math.PI * 0.75, -Math.PI * 0.25);
        ctx.stroke();
      }
    }

    // --- LED Status Lights (PWR, LINK, TX) ---
    // Power LED (Green)
    ctx.fillStyle = isRunning ? '#2ecc71' : '#333a42';
    ctx.beginPath(); ctx.arc(14, 18, 2, 0, Math.PI * 2); ctx.fill();

    // Link/Wi-Fi LED (Cyan)
    ctx.fillStyle = isRunning ? '#00d2ff' : '#333a42';
    ctx.beginPath(); ctx.arc(22, 18, 2, 0, Math.PI * 2); ctx.fill();

    // Activity/TX LED (Amber)
    ctx.fillStyle = isTxActive ? '#f39c12' : '#333a42';
    ctx.beginPath(); ctx.arc(30, 18, 2, 0, Math.PI * 2); ctx.fill();

    if (isRunning) {
      ctx.fillStyle = 'rgba(0, 210, 255, 0.3)';
      ctx.beginPath(); ctx.arc(22, 18, 4.5, 0, Math.PI * 2); ctx.fill();
    }

    // --- Client Count / Status Badge ---
    if (isRunning && clientCount > 0) {
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${clientCount} dev`, w - 10, 20);
    } else if (inst.props.hidden) {
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('HIDDEN', w - 10, 20);
    }

    // --- OLED Screen Display Content ---
    // SSID
    if (inst.props.hidden && !isRunning) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('·········', w / 2, 40);
    } else {
      ctx.fillStyle = isRunning ? '#00d2ff' : 'rgba(255,255,255,0.3)';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      const displaySsid = ssid.length > 11 ? ssid.slice(0, 10) + '…' : ssid;
      ctx.fillText(displaySsid, w / 2, 40);
    }

    // IP Address / Status
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '8px monospace';
    const subtext = isRunning ? (inst.props.ipAddress || '192.168.4.1') : 'OFFLINE';
    ctx.fillText(subtext, w / 2, 51);

    // --- Bottom Channel & Security Spec ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`CH:${inst.props.channel || 6} • ${inst.props.security || 'WPA2'}`, w / 2, 68);

    ctx.restore();
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// LoRa Module Component — RFM95W / SX1276 based LoRa transceiver
// ══════════════════════════════════════════════════════════════════════════════
defComp({
  id: 'lora_module',
  name: 'LoRa Module',
  category: 'Communication',
  icon: '\u{1F4E1}',
  desc: 'SX1276 / RFM95W LoRa long-range wireless transceiver. Simulates RF parameter matching, Time-on-Air (ToA) calculation, RSSI/SNR path-loss, and SPI bus interface.',
  search: 'lora rfm95 sx1276 long range wireless radio frequency spi',
  width: 80,
  height: 98,

  defaultProps: {
    frequency: 868000000,
    spreadingFactor: 7,
    bandwidth: 125000,
    codingRate: 5, // 5 = 4/5, 6 = 4/6, 7 = 4/7, 8 = 4/8
    txPower: 14,
    syncWord: 0x12,
    crcEnabled: true,
    preambleLen: 8,
    payloadLen: 16,
  },

  interactive: [
    {
      field: 'frequency', label: 'Frequency Band', type: 'select',
      options: [
        { value: 433000000, label: '433 MHz (Asia/EU)' },
        { value: 868000000, label: '868 MHz (Europe)' },
        { value: 915000000, label: '915 MHz (US/AU)' },
        { value: 923000000, label: '923 MHz (Asia)' },
      ],
    },
    {
      field: 'spreadingFactor', label: 'Spreading Factor', type: 'select',
      options: [
        { value: 6,  label: 'SF6  (Fast, Short Range)' },
        { value: 7,  label: 'SF7  (Default)' },
        { value: 8,  label: 'SF8' },
        { value: 9,  label: 'SF9' },
        { value: 10, label: 'SF10' },
        { value: 11, label: 'SF11' },
        { value: 12, label: 'SF12 (Slow, Max Range)' },
      ],
    },
    {
      field: 'bandwidth', label: 'Bandwidth', type: 'select',
      options: [
        { value: 7800,   label: '7.8 kHz' },
        { value: 15600,  label: '15.6 kHz' },
        { value: 31250,  label: '31.25 kHz' },
        { value: 62500,  label: '62.5 kHz' },
        { value: 125000, label: '125 kHz (Default)' },
        { value: 250000, label: '250 kHz' },
        { value: 500000, label: '500 kHz' },
      ],
    },
    {
      field: 'codingRate', label: 'Coding Rate', type: 'select',
      options: [
        { value: 5, label: '4/5 (Min Overhead)' },
        { value: 6, label: '4/6' },
        { value: 7, label: '4/7' },
        { value: 8, label: '4/8 (Max Redundancy)' },
      ],
    },
    { field: 'txPower', label: 'TX Power (dBm)', type: 'number', min: 2, max: 20, step: 1 },
    { field: 'syncWord', label: 'Sync Word (0x)', type: 'number', min: 0, max: 255, step: 1 },
    { field: 'payloadLen', label: 'Simulated Payload (Bytes)', type: 'number', min: 1, max: 255, step: 1 },
    { field: 'crcEnabled', label: 'CRC Enabled', type: 'boolean' },
  ],

  // Hardware Interface Header Pins along the bottom edge
  pins: [
    { id: '3V3',  label: '3V3',  type: 'power',  x: 8,  y: 98, side: 'bottom' },
    { id: 'GND',  label: 'GND',  type: 'gnd',    x: 18, y: 98, side: 'bottom' },
    { id: 'SCK',  label: 'SCK',  type: 'signal', x: 28, y: 98, side: 'bottom' },
    { id: 'MISO', label: 'MISO', type: 'signal', x: 38, y: 98, side: 'bottom' },
    { id: 'MOSI', label: 'MOSI', type: 'signal', x: 48, y: 98, side: 'bottom' },
    { id: 'NSS',  label: 'NSS',  type: 'signal', x: 58, y: 98, side: 'bottom' },
    { id: 'DIO0', label: 'DIO0', type: 'digital', x: 68, y: 98, side: 'bottom' },
    { id: 'RST',  label: 'RST',  type: 'signal', x: 78, y: 98, side: 'bottom' },
  ],

  step(inst, sim) {
    if (!window._loraBus) {
      window._loraBus = { nodes: {} };
    }

    // Ensure transmitPacket is always available on the bus (library may have
    // created the bus first without it).
    if (!window._loraBus.transmitPacket) {
      window._loraBus.transmitPacket = function(senderId, payloadHex) {
        const sender = this.nodes[senderId];
        if (!sender || !sender.active) return;

        sender.lastTxTime = Date.now();
        sender.txCount = (sender.txCount || 0) + 1;

        Object.values(this.nodes).forEach((target) => {
          if (target.id === senderId || !target.active) return;

          const freqMatch = Math.abs(target.frequency - sender.frequency) < 100000;
          const sfMatch = target.spreadingFactor === sender.spreadingFactor;
          const bwMatch = target.bandwidth === sender.bandwidth;
          const syncMatch = target.syncWord === sender.syncWord;

          if (freqMatch && sfMatch && bwMatch && syncMatch) {
            const dx = sender.x - target.x;
            const dy = sender.y - target.y;
            const distMeters = Math.max(1, Math.sqrt(dx * dx + dy * dy) * 0.5);
            const freqMHz = sender.frequency / 1e6;
            const fspl = 20 * Math.log10(distMeters) + 20 * Math.log10(freqMHz) - 27.55;
            const rssi = Math.max(-130, Math.min(-30, Math.round(sender.txPower - fspl)));
            const snr = Math.max(-20, Math.min(15, parseFloat(((rssi + 110) / 4).toFixed(1))));

            target.lastRxTime = Date.now();
            target.rxCount = (target.rxCount || 0) + 1;
            target.lastRxMeta = {
              from: senderId,
              payload: payloadHex || 'HELLO LORA',
              rssi,
              snr,
              toa: sender.airtimeMs,
            };

            if (typeof payloadHex === 'string') {
              var bytes = [];
              for (var k = 0; k < payloadHex.length; k++) {
                bytes.push(payloadHex.charCodeAt(k) & 0xFF);
              }
              target._rxBuffer = bytes;
            } else if (payloadHex instanceof Uint8Array || Array.isArray(payloadHex)) {
              target._rxBuffer = Array.from(payloadHex);
            } else {
              target._rxBuffer = [];
            }
            target._lastPacketRssi = rssi;
            target._lastPacketSnr = snr;

            if (target.inst && target.inst.setPin) {
              target.inst.setPin('DIO0', 1);
            }
          }
        });
      };
    }

    const isRunning = !!(sim && sim.isRunning);

    if (isRunning) {
      if (!inst._state) {
        inst._state = {
          lastTxTime: 0,
          lastRxTime: 0,
          txCount: 0,
          rxCount: 0,
          lastRxMeta: null,
        };
      }

      // Exact LoRa Time-on-Air (ToA) calculation in milliseconds
      const sf = Number(inst.props.spreadingFactor) || 7;
      const bw = Number(inst.props.bandwidth) || 125000;
      const cr = Number(inst.props.codingRate) || 5;
      const payloadLen = Number(inst.props.payloadLen) || 16;
      const preambleLen = Number(inst.props.preambleLen) || 8;
      const crc = inst.props.crcEnabled !== false ? 1 : 0;

      const tSymbol = (Math.pow(2, sf) / bw) * 1000; // ms per symbol
      const tPreamble = (preambleLen + 4.25 + 0.25) * tSymbol;

      const de = sf >= 11 ? 1 : 0; // low data rate optimize
      const payloadNumerator = 8 * payloadLen - 4 * sf + 28 + 16 * crc + (4 * (sf - 2 * de)) / sf;
      const bitsPerSymbol = 4 * (sf - 2 * de);
      const payloadSymbols = 8 + Math.max(0, Math.ceil(payloadNumerator / bitsPerSymbol)) * cr;
      const airtimeMs = Math.round(tPreamble + (payloadSymbols * tSymbol));

      // Register / update node on the central bus
      window._loraBus.nodes[inst.id] = {
        id: inst.id,
        inst,
        frequency: Number(inst.props.frequency) || 868000000,
        spreadingFactor: sf,
        bandwidth: bw,
        codingRate: cr,
        txPower: Number(inst.props.txPower) || 14,
        syncWord: Number(inst.props.syncWord) ?? 0x12,
        airtimeMs,
        active: true,
        x: inst.x + (inst.width || 80) / 2,
        y: inst.y + (inst.height || 98) / 2,
        lastTxTime: inst._state.lastTxTime,
        lastRxTime: inst._state.lastRxTime,
        lastRxMeta: inst._state.lastRxMeta,
        txCount: inst._state.txCount,
        rxCount: inst._state.rxCount,
        send: (payload) => window._loraBus.transmitPacket(inst.id, payload),
      };
    } else {
      window._loraBus?.nodes && delete window._loraBus.nodes[inst.id];
      if (inst._state) {
        inst._state.lastRxMeta = null;
      }
    }
  },

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const w = inst.width || 80;
    const h = inst.height || 98;
    const isRunning = !!(sim && sim.isRunning);
    const busNode = window._loraBus?.nodes[inst.id];
    const state = inst._state || { lastTxTime: 0, lastRxTime: 0, txCount: 0, rxCount: 0 };

    const lastTxTime = busNode ? busNode.lastTxTime : state.lastTxTime;
    const lastRxTime = busNode ? busNode.lastRxTime : state.lastRxTime;
    const airtime = busNode ? busNode.airtimeMs : 36;
    const lastRxMeta = busNode ? busNode.lastRxMeta : null;

    const isTxActive = isRunning && (Date.now() - lastTxTime < Math.max(250, airtime));
    const isRxActive = isRunning && (Date.now() - lastRxTime < Math.max(250, airtime));

    const freq = Number(inst.props.frequency) || 868000000;
    const sf = Number(inst.props.spreadingFactor) || 7;
    const bw = Number(inst.props.bandwidth) || 125000;
    const cr = Number(inst.props.codingRate) || 5;

    ctx.save();
    ctx.translate(x, y);

    const drawRR = (rx, ry, rw, rh, rad) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, rad);
      else ctx.rect(rx, ry, rw, rh);
    };

    // --- Drop Shadow ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    drawRR(3, 5, w - 2, h - 10, 6);
    ctx.fill();

    // --- PCB Base (Dark Emerald Green) ---
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h - 8);
    bgGrad.addColorStop(0, '#153828');
    bgGrad.addColorStop(0.5, '#0b2419');
    bgGrad.addColorStop(1, '#061710');
    ctx.fillStyle = bgGrad;
    drawRR(0, 0, w, h - 8, 6);
    ctx.fill();

    ctx.strokeStyle = 'rgba(46, 204, 113, 0.25)';
    ctx.lineWidth = 1;
    drawRR(0, 0, w, h - 8, 6);
    ctx.stroke();

    // --- Helical Spring Antenna ---
    const antX = w / 2;
    const antBaseY = 4;
    const antTopY = -14;

    // Brass antenna mount socket
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(antX - 4, antBaseY - 2, 8, 4);

    // Copper helical coil
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const coils = 5;
    const coilH = antBaseY - antTopY;
    for (let i = 0; i <= coils * 16; i++) {
      const t = i / (coils * 16);
      const cy = antBaseY - 2 - t * coilH;
      const cx = antX + Math.sin(t * coils * Math.PI * 2) * 3.5;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(antX, antTopY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // --- RF Wave Signal Animation ---
    if (isTxActive || isRxActive) {
      const waveColor = isTxActive ? '231, 76, 60' : '52, 152, 219';
      const now = Date.now();
      const wavePhase = (now % 700) / 700;
      ctx.lineWidth = 1.5;

      for (let i = 0; i < 3; i++) {
        const opacity = Math.max(0, 1 - ((wavePhase + i * 0.33) % 1));
        const radius = 4 + (((wavePhase + i * 0.33) % 1) * 16);
        ctx.strokeStyle = `rgba(${waveColor}, ${opacity * 0.8})`;
        ctx.beginPath();
        ctx.arc(antX, antTopY, radius, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
      }
    }

    // --- Metal IC Shielding Housing (SX1276) ---
    const chipX = 10;
    const chipY = 18;
    const chipW = w - 20;
    const chipH = 26;

    ctx.fillStyle = '#222831';
    drawRR(chipX, chipY, chipW, chipH, 3);
    ctx.fill();
    ctx.strokeStyle = '#393e46';
    ctx.lineWidth = 1;
    drawRR(chipX, chipY, chipW, chipH, 3);
    ctx.stroke();

    // Gold castellated solder pads on IC sides
    ctx.fillStyle = '#d4af37';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(chipX - 2, chipY + 4 + i * 5, 2.5, 3);
      ctx.fillRect(chipX + chipW - 0.5, chipY + 4 + i * 5, 2.5, 3);
    }

    // Laser-etched text on IC shield
    ctx.fillStyle = isRunning ? '#2ecc71' : '#7f8c8d';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SEMTECH', chipX + chipW / 2, chipY + 10);
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText('SX1276', chipX + chipW / 2, chipY + 19);

    // --- Diagnostic Status LEDs ---
    const ledY = 50;
    const drawLED = (lx, active, colorHex, glowColor, label) => {
      ctx.fillStyle = active ? colorHex : '#1a2228';
      ctx.beginPath(); ctx.arc(lx, ledY, 2.5, 0, Math.PI * 2); ctx.fill();
      if (active) {
        ctx.fillStyle = glowColor;
        ctx.beginPath(); ctx.arc(lx, ledY, 4.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, lx, ledY + 8);
    };

    drawLED(18, isRunning, '#2ecc71', 'rgba(46, 204, 113, 0.35)', 'PWR');
    drawLED(40, isTxActive, '#e74c3c', 'rgba(231, 76, 60, 0.4)', 'TX');
    drawLED(62, isRxActive, '#3498db', 'rgba(52, 152, 219, 0.4)', 'RX');

    // --- Monochrome OLED Screen Glass ---
    const oledX = 6;
    const oledY = 62;
    const oledW = w - 12;
    const oledH = 24;

    ctx.fillStyle = '#080d12';
    drawRR(oledX, oledY, oledW, oledH, 3);
    ctx.fill();
    ctx.strokeStyle = isRunning ? 'rgba(46, 204, 113, 0.3)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.8;
    drawRR(oledX, oledY, oledW, oledH, 3);
    ctx.stroke();

    if (isRunning) {
      // Line 1: Freq & SF
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 7.5px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${(freq / 1e6).toFixed(1)}M`, oledX + 4, oledY + 8);

      ctx.textAlign = 'right';
      ctx.fillText(`SF${sf} CR4/${cr}`, oledX + oledW - 4, oledY + 8);

      // Line 2: BW & Calculated Airtime
      ctx.fillStyle = '#3498db';
      ctx.font = '6.5px monospace';
      ctx.textAlign = 'left';
      const bwStr = bw >= 1000 ? `${bw / 1000}kHz` : `${bw}Hz`;
      ctx.fillText(bwStr, oledX + 4, oledY + 16);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#f39c12';
      ctx.fillText(`${airtime}ms`, oledX + oledW - 4, oledY + 16);

      // Line 3: Live telemetry (RSSI / Packet counters)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';

      if (lastRxMeta && (Date.now() - lastRxTime < 3000)) {
        ctx.fillText(`RSSI:${lastRxMeta.rssi} SNR:${lastRxMeta.snr}`, oledX + oledW / 2, oledY + 22);
      } else {
        const txC = busNode?.txCount || 0;
        const rxC = busNode?.rxCount || 0;
        ctx.fillText(`TX:${txC}  RX:${rxC}  PWR:${inst.props.txPower || 14}dBm`, oledX + oledW / 2, oledY + 22);
      }
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DISCONNECTED', oledX + oledW / 2, oledY + 14);
    }

    // --- Bottom Gold Connector Pins ---
    const pinNames = ['3V3', 'GND', 'SCK', 'MISO', 'MOSI', 'NSS', 'DIO0', 'RST'];
    pinNames.forEach((pName, idx) => {
      const px = 8 + idx * 10;
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(px - 2.5, h - 8, 5, 8);
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(px, h - 4, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Pin text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pName, px, h - 9);
    });

    ctx.restore();
  },
});

/* ═══════════════════════ SD Card Module (SPI) ═══════════════════════ */

// defComp({
//   id: 'sd_card',
//   name: 'SD Card Module',
//   category: 'Communication',
//   icon: '💾',
//   desc: 'SD card reader/writer module (SPI interface). Supports FAT16/FAT32, micro SD up to 32GB.',
//   width: 56,
//   height: 72,
//   defaultProps: {},
//   interactive: [],
//   pins: [
//     { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 10, y: 72, side: 'bottom' },
//     { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 22, y: 72, side: 'bottom' },
//     { id: 'MISO', label: 'MISO', type: PIN_TYPE.DIGITAL, x: 34, y: 72, side: 'bottom' },
//     { id: 'MOSI', label: 'MOSI', type: PIN_TYPE.DIGITAL, x: 46, y: 72, side: 'bottom' },
//     { id: 'SCK', label: 'SCK', type: PIN_TYPE.DIGITAL, x: 16, y: 0, side: 'top' },
//     { id: 'CS', label: 'CS', type: PIN_TYPE.DIGITAL, x: 40, y: 0, side: 'top' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const isRunning = !!(sim && sim.isRunning);

//     ctx.save();
//     ctx.translate(x, y);

//     const drawRR = (rx, ry, rw, rh, rad) => {
//       ctx.beginPath();
//       if (typeof roundRect === 'function') roundRect(ctx, rx, ry, rw, rh, rad);
//       else if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, rad);
//       else ctx.rect(rx, ry, rw, rh);
//     };

//     // 1. Dark blue PCB
//     const pcbGrad = ctx.createLinearGradient(0, 0, 56, 56);
//     pcbGrad.addColorStop(0, '#0c1a3a');
//     pcbGrad.addColorStop(1, '#0a1530');
//     ctx.fillStyle = pcbGrad;
//     drawRR(0, 0, 56, 56, 3);
//     ctx.fill();
//     ctx.strokeStyle = '#1e3d6e'; ctx.lineWidth = 0.8; ctx.stroke();

//     // 2. SD card slot (metallic)
//     const slotGrad = ctx.createLinearGradient(6, 6, 50, 30);
//     slotGrad.addColorStop(0, '#b0bec5');
//     slotGrad.addColorStop(0.3, '#eceff1');
//     slotGrad.addColorStop(0.7, '#cfd8dc');
//     slotGrad.addColorStop(1, '#90a4ae');
//     ctx.fillStyle = slotGrad;
//     drawRR(6, 6, 44, 22, 3);
//     ctx.fill();
//     ctx.strokeStyle = '#78909c'; ctx.lineWidth = 0.8; ctx.stroke();

//     // SD card insertion slot
//     ctx.fillStyle = '#333';
//     drawRR(10, 10, 36, 14, 2);
//     ctx.fill();

//     // 3. Voltage regulator (3.3V)
//     ctx.fillStyle = '#1a1a1a';
//     drawRR(6, 32, 8, 5, 1);
//     ctx.fill();
//     ctx.fillStyle = '#888';
//     ctx.font = '2px monospace';
//     ctx.textAlign = 'center';
//     ctx.fillText('3.3V', 10, 35);

//     // 4. Status LEDs
//     ctx.fillStyle = isRunning ? '#00ff44' : '#223322';
//     ctx.beginPath(); ctx.arc(48, 34, 1.5, 0, Math.PI * 2); ctx.fill();
//     if (isRunning) { ctx.shadowColor = '#00ff44'; ctx.shadowBlur = 3; ctx.fill(); ctx.shadowBlur = 0; }

//     // 5. Label
//     ctx.fillStyle = '#fff';
//     ctx.font = 'bold 4px "JetBrains Mono", monospace';
//     ctx.textAlign = 'center';
//     ctx.fillText('SD CARD', 28, 40);

//     ctx.fillStyle = 'rgba(255,255,255,0.4)';
//     ctx.font = '2.5px monospace';
//     ctx.fillText('SPI MODULE', 28, 46);

//     // 6. Pin labels & leads
//     ctx.fillStyle = '#fff'; ctx.font = 'bold 2.8px monospace'; ctx.textAlign = 'center';
//     ['VCC', 'GND', 'MISO', 'MOSI'].forEach((lbl, i) => ctx.fillText(lbl, 10 + i * 12, 58));

//     ctx.fillStyle = '#111'; drawRR(4, 58, 48, 3, 1); ctx.fill();
//     [10, 22, 34, 46].forEach(px => {
//       ctx.fillStyle = '#d4af37'; ctx.fillRect(px - 1.5, 59, 3, 2);
//       const g = ctx.createLinearGradient(px - 0.8, 61, px + 0.8, 61);
//       g.addColorStop(0, '#aaa'); g.addColorStop(0.5, '#fff'); g.addColorStop(1, '#666');
//       ctx.fillStyle = g; ctx.fillRect(px - 0.8, 61, 1.6, 11);
//     });

//     // Top pins (SCK, CS)
//     ctx.fillStyle = '#fff'; ctx.font = 'bold 2.8px monospace'; ctx.textAlign = 'center';
//     ctx.fillText('SCK', 16, -4);
//     ctx.fillText('CS', 40, -4);

//     ctx.fillStyle = '#111'; drawRR(8, -6, 40, 3, 1); ctx.fill();
//     [16, 40].forEach(px => {
//       ctx.fillStyle = '#d4af37'; ctx.fillRect(px - 1.5, -6, 3, 2);
//       const g = ctx.createLinearGradient(px - 0.8, -4, px + 0.8, -4);
//       g.addColorStop(0, '#aaa'); g.addColorStop(0.5, '#fff'); g.addColorStop(1, '#666');
//       ctx.fillStyle = g; ctx.fillRect(px - 0.8, -4, 1.6, 6);
//     });

//     if (inst.selected) drawSelectionRect(ctx, -8, -8, 72, 88);
//     ctx.restore();
//   }
// });

// class SDCardComponent extends Component {
//   getPins() {
//     return [
//       { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 10, y: 72, side: 'bottom' },
//       { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 22, y: 72, side: 'bottom' },
//       { id: 'MISO', label: 'MISO', type: PIN_TYPE.DIGITAL, x: 34, y: 72, side: 'bottom' },
//       { id: 'MOSI', label: 'MOSI', type: PIN_TYPE.DIGITAL, x: 46, y: 72, side: 'bottom' },
//       { id: 'SCK', label: 'SCK', type: PIN_TYPE.DIGITAL, x: 16, y: 0, side: 'top' },
//       { id: 'CS', label: 'CS', type: PIN_TYPE.DIGITAL, x: 40, y: 0, side: 'top' },
//     ];
//   }
//   update() {}
// }
// registerComponent('sd_card', SDCardComponent);


// Helper for rounded rectangles with fallback
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
}

defComp({
  id: 'sd_card',
  name: 'Micro SD Card Module',
  category: 'Communication',
  icon: '💾',
  desc: 'MicroSD card adapter module with SPI interface & onboard 3.3V level conversion. Right-click to upload files to the virtual SD card.',
  width: 60,
  height: 72,
  defaultProps: {
    cardInserted: true
  },
  runtimeState: {
    uploadedFiles: {}
  },
  interactive: [
    {
      id: 'toggle_card',
      type: 'click',
      bounds: { x: 10, y: 4, width: 40, height: 26 },
      action(inst) {
        inst.props.cardInserted = !inst.props.cardInserted;
      }
    }
  ],
  contextMenu: [
    {
      label: 'Upload files to SD card',
      icon: '📁',
      action(inst) {
        var input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.style.display = 'none';
        input.onchange = function(e) {
          var files = e.target.files;
          if (!files || files.length === 0) return;
          if (!inst.runtimeState) inst.runtimeState = {};
          if (!inst.runtimeState.uploadedFiles) inst.runtimeState.uploadedFiles = {};
          var pending = files.length;
          for (var i = 0; i < files.length; i++) {
            (function(file) {
              var reader = new FileReader();
              reader.onload = function(ev) {
                var data = new Uint8Array(ev.target.result);
                inst.runtimeState.uploadedFiles[file.name] = data;
                pending--;
                if (pending === 0) {
                  if (window.CircuitCanvas && window.CircuitCanvas.render) {
                    window.CircuitCanvas.render();
                  }
                }
              };
              reader.readAsArrayBuffer(file);
            })(files[i]);
          }
        };
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
      }
    },
    {
      label: 'View loaded files',
      icon: '📋',
      action(inst) {
        var uploaded = (inst.runtimeState && inst.runtimeState.uploadedFiles) || {};
        var names = Object.keys(uploaded);
        if (names.length === 0) {
          window._serialLog && window._serialLog('[SD Card] No files loaded. Right-click > "Upload files to SD card" to add files.\n', 'system');
          return;
        }
        window._serialLog && window._serialLog('[SD Card] Loaded files (' + names.length + '):\n', 'system');
        names.forEach(function(name) {
          var size = uploaded[name] ? uploaded[name].length : 0;
          window._serialLog && window._serialLog('  ' + name + ' (' + size + ' bytes)\n', 'data');
        });
      }
    },
    {
      label: 'Clear all files',
      icon: '🗑️',
      action(inst) {
        if (inst.runtimeState) inst.runtimeState.uploadedFiles = {};
        if (window.CircuitCanvas && window.CircuitCanvas.render) {
          window.CircuitCanvas.render();
        }
        window._serialLog && window._serialLog('[SD Card] All files cleared.\n', 'system');
      }
    }
  ],
  pins: [
    { id: 'CS',   label: 'CS',   type: PIN_TYPE.DIGITAL, x: 10, y: 72, side: 'bottom' },
    { id: 'SCK',  label: 'SCK',  type: PIN_TYPE.DIGITAL, x: 18, y: 72, side: 'bottom' },
    { id: 'MOSI', label: 'MOSI', type: PIN_TYPE.DIGITAL, x: 26, y: 72, side: 'bottom' },
    { id: 'MISO', label: 'MISO', type: PIN_TYPE.DIGITAL, x: 34, y: 72, side: 'bottom' },
    { id: 'VCC',  label: 'VCC',  type: PIN_TYPE.POWER,   x: 42, y: 72, side: 'bottom' },
    { id: 'GND',  label: 'GND',  type: PIN_TYPE.GND,     x: 50, y: 72, side: 'bottom' }
  ],
  draw(ctx, inst, sim) {
    const { x, y, props = {} } = inst;
    const isRunning = !!(sim && sim.isRunning);
    const cardInserted = props.cardInserted !== false;

    ctx.save();
    ctx.translate(x, y);

    // 1. PCB Base Board
    const pcbGrad = ctx.createLinearGradient(0, 0, 60, 72);
    pcbGrad.addColorStop(0, '#0d1f3d');
    pcbGrad.addColorStop(1, '#081326');
    ctx.fillStyle = pcbGrad;
    drawRoundedRect(ctx, 0, 0, 60, 66, 4);
    ctx.fill();
    ctx.strokeStyle = '#1e3d6e';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Corner Mounting Holes
    ctx.fillStyle = '#050a14';
    ctx.strokeStyle = '#2c5282';
    ctx.lineWidth = 0.6;
    [[4, 4], [56, 4], [4, 62], [56, 62]].forEach(([hx, hy]) => {
      ctx.beginPath();
      ctx.arc(hx, hy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // 2. MicroSD Metal Socket
    const slotGrad = ctx.createLinearGradient(10, 6, 50, 32);
    slotGrad.addColorStop(0, '#cfd8dc');
    slotGrad.addColorStop(0.5, '#eceff1');
    slotGrad.addColorStop(1, '#90a4ae');
    ctx.fillStyle = slotGrad;
    drawRoundedRect(ctx, 10, 6, 40, 24, 2);
    ctx.fill();
    ctx.strokeStyle = '#607d8b';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Internal Slot cavity or Inserted Card
    if (cardInserted) {
      // MicroSD Card Body
      ctx.fillStyle = '#1c1c1c';
      drawRoundedRect(ctx, 13, 2, 34, 25, 2);
      ctx.fill();
      
      // Card Label Notch & Text
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(15, 4, 30, 8);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 3px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('32GB SD', 30, 10);
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '2px monospace';
      ctx.fillText('MicroSD HC', 30, 20);
    } else {
      // Ejected / Empty Slot Interior
      ctx.fillStyle = '#111111';
      drawRoundedRect(ctx, 14, 8, 32, 20, 1);
      ctx.fill();

      // Gold Pin Contacts inside empty slot
      ctx.fillStyle = '#d4af37';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(17 + i * 3.2, 10, 1.8, 8);
      }
    }

    // 3. Level Shifter IC (74LVC125A)
    ctx.fillStyle = '#151515';
    drawRoundedRect(ctx, 20, 34, 20, 10, 1);
    ctx.fill();
    ctx.fillStyle = '#888888';
    ctx.font = '2.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LVC125A', 30, 40);

    // IC Pins
    ctx.fillStyle = '#b0bec5';
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(21 + i * 2.5, 32.5, 1.2, 1.5);
      ctx.fillRect(21 + i * 2.5, 44, 1.2, 1.5);
    }

    // 4. 3.3V LDO Voltage Regulator (AMS1117 SOT-223)
    ctx.fillStyle = '#1a1a1a';
    drawRoundedRect(ctx, 6, 34, 8, 8, 1);
    ctx.fill();
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(8, 32.5, 4, 1.5); // Large tab

    // 5. Indicator LEDs
    // Power LED (Red)
    ctx.fillStyle = isRunning ? '#ff2222' : '#441111';
    ctx.beginPath(); ctx.arc(8, 48, 1.5, 0, Math.PI * 2); ctx.fill();
    if (isRunning) {
      ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 4; ctx.fill(); ctx.shadowBlur = 0;
    }

    // Activity LED (Green)
    const active = isRunning && cardInserted;
    ctx.fillStyle = active ? '#00ff44' : '#113311';
    ctx.beginPath(); ctx.arc(52, 48, 1.5, 0, Math.PI * 2); ctx.fill();
    if (active) {
      ctx.shadowColor = '#00ff44'; ctx.shadowBlur = 4; ctx.fill(); ctx.shadowBlur = 0;
    }

    ctx.fillStyle = '#888888';
    ctx.font = '2px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PWR', 8, 52);
    ctx.fillText('ACT', 52, 52);

    // 6. Header Pin Labels & Gold Headers
    const pinXCoords = [10, 18, 26, 34, 42, 50];
    const pinLabels = ['CS', 'SCK', 'MOSI', 'MISO', 'VCC', 'GND'];

    // Header Strip Base
    ctx.fillStyle = '#111111';
    drawRoundedRect(ctx, 6, 58, 48, 6, 1);
    ctx.fill();

    pinXCoords.forEach((px, i) => {
      // Pin Label on PCB
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 2.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pinLabels[i], px, 56);

      // Gold Pad
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(px - 1.5, 59, 3, 4);

      // Metal Pin Lead extending down
      const leadGrad = ctx.createLinearGradient(px - 0.8, 63, px + 0.8, 63);
      leadGrad.addColorStop(0, '#90a4ae');
      leadGrad.addColorStop(0.5, '#ffffff');
      leadGrad.addColorStop(1, '#607d8b');
      ctx.fillStyle = leadGrad;
      ctx.fillRect(px - 0.8, 63, 1.6, 9);
    });

    // File count badge
    var uploaded = (inst.runtimeState && inst.runtimeState.uploadedFiles) || {};
    var fileCount = Object.keys(uploaded).length;
    if (fileCount > 0) {
      ctx.fillStyle = '#1a73e8';
      ctx.beginPath();
      ctx.arc(54, 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 6px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(fileCount), 54, 4);
      ctx.textBaseline = 'alphabetic';

      // Tooltip on hover
      if (inst.runtimeState && inst.runtimeState._hovered) {
        var tooltipY = -10;
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(0, tooltipY - 4, 60, fileCount * 8 + 8, 3);
        else ctx.rect(0, tooltipY - 4, 60, fileCount * 8 + 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '6px monospace';
        ctx.textAlign = 'left';
        var fileNames = Object.keys(uploaded);
        for (var fi = 0; fi < Math.min(fileNames.length, 8); fi++) {
          var fname = fileNames[fi];
          var fsize = uploaded[fname] ? uploaded[fname].length : 0;
          ctx.fillText(fname.substring(0, 12) + ' (' + fsize + ')', 4, tooltipY + 4 + fi * 8);
        }
        if (fileNames.length > 8) {
          ctx.fillText('...+' + (fileNames.length - 8) + ' more', 4, tooltipY + 4 + 8 * 8);
        }
      }
    }

    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -2, -2, 64, 76);
    }

    ctx.restore();
  }
});

class SDCardComponent extends Component {
  getPins() {
    return [
      { id: 'CS',   label: 'CS',   type: PIN_TYPE.DIGITAL, x: 10, y: 72, side: 'bottom' },
      { id: 'SCK',  label: 'SCK',  type: PIN_TYPE.DIGITAL, x: 18, y: 72, side: 'bottom' },
      { id: 'MOSI', label: 'MOSI', type: PIN_TYPE.DIGITAL, x: 26, y: 72, side: 'bottom' },
      { id: 'MISO', label: 'MISO', type: PIN_TYPE.DIGITAL, x: 34, y: 72, side: 'bottom' },
      { id: 'VCC',  label: 'VCC',  type: PIN_TYPE.POWER,   x: 42, y: 72, side: 'bottom' },
      { id: 'GND',  label: 'GND',  type: PIN_TYPE.GND,     x: 50, y: 72, side: 'bottom' }
    ];
  }

  update(sim) {
    // Optional: Simulates SPI activity or presence checks
  }
}

registerComponent('sd_card', SDCardComponent);