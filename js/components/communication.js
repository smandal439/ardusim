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
    { field: 'security',  label: 'Security',     type: 'select', options: ['WPA2-PSK', 'OPEN'] },
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
    ctx.fillStyle = isRunning ? '#00d2ff' : 'rgba(255,255,255,0.3)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    const displaySsid = ssid.length > 11 ? ssid.slice(0, 10) + '…' : ssid;
    ctx.fillText(displaySsid, w / 2, 40);

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