'use strict';

defComp({
  id: 'wifi_module',
  name: 'Wi-Fi Hotspot',
  category: 'Communication',
  icon: '\u{1f4f6}',
  desc: 'Simulated Wi-Fi access point. The ESP32 must match this SSID and password to connect.',
  width: 70,
  height: 70,

  defaultProps: {
    ssid: 'ArduSim_Network',
    password: 'password123',
    channel: 6,
  },

  interactive: [
    { field: 'ssid',     label: 'Wi-Fi SSID',  type: 'text' },
    { field: 'password', label: 'Password',     type: 'text' },
    { field: 'channel',  label: 'Channel',      type: 'number', min: 1, max: 13, step: 1 },
  ],

  pins: [],

  step(inst, sim) {
    if (!window._wifiBus) window._wifiBus = { hotspots: {} };
    if (sim && sim.isRunning) {
      window._wifiBus.hotspots[inst.id] = {
        ssid: inst.props.ssid,
        password: inst.props.password,
        channel: inst.props.channel || 6,
        simulator: sim,
      };
    } else {
      delete window._wifiBus.hotspots[inst.id];
    }
  },

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const ssid = inst.props.ssid || 'ArduSim_Network';
    const isRunning = !!(sim && sim.isRunning);
    const w = 70, h = 70;

    ctx.save();
    ctx.translate(x, y);

    const drawRR = (rx, ry, rw, rh, rad) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, rad);
      else ctx.rect(rx, ry, rw, rh);
    };

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    drawRR(3, 5, w - 2, h - 2, 5); ctx.fill();

    // Body gradient
    const grad = ctx.createLinearGradient(0, 2, 0, h - 2);
    grad.addColorStop(0, '#1a2a3a');
    grad.addColorStop(0.5, '#0f1c2b');
    grad.addColorStop(1, '#0a1320');
    ctx.fillStyle = grad;
    drawRR(1, 3, w - 2, h - 4, 5); ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.8;
    drawRR(2, 4, w - 4, h - 6, 4); ctx.stroke();

    // Antenna left
    ctx.strokeStyle = 'rgba(180,210,240,0.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(22, 14);
    ctx.lineTo(16, 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(180,210,240,0.9)';
    ctx.beginPath(); ctx.arc(16, 2, 2.2, 0, Math.PI * 2); ctx.fill();

    // Antenna right
    ctx.beginPath();
    ctx.moveTo(48, 14);
    ctx.lineTo(54, 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(180,210,240,0.9)';
    ctx.beginPath(); ctx.arc(54, 2, 2.2, 0, Math.PI * 2); ctx.fill();

    // Signal arcs when running
    if (isRunning) {
      ctx.strokeStyle = 'rgba(80,200,120,0.45)';
      ctx.lineWidth = 1.5;
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath();
        ctx.arc(35, 8, 4 + r * 4, -Math.PI * 0.75, -Math.PI * 0.25);
        ctx.stroke();
      }
    }

    // LED indicator
    ctx.fillStyle = isRunning ? '#2ecc71' : 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.arc(35, 22, 3, 0, Math.PI * 2); ctx.fill();
    if (isRunning) {
      ctx.fillStyle = 'rgba(46,204,113,0.25)';
      ctx.beginPath(); ctx.arc(35, 22, 6, 0, Math.PI * 2); ctx.fill();
    }

    // Wi-Fi icon in center
    ctx.fillStyle = isRunning ? 'rgba(46,204,113,0.9)' : 'rgba(255,255,255,0.35)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('\u{1F4F6}', 35, 42);

    // SSID label
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    const label = ssid.length > 10 ? ssid.slice(0, 9) + '\u2026' : ssid;
    ctx.fillText(label, 35, 56);

    // Category label
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '7px sans-serif';
    ctx.fillText('Wi-Fi Hotspot', 35, 65);

    ctx.restore();
  },
});
