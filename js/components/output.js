/* components/output.js — Output component definitions */
'use strict';

/*  Shared LED draw helper — used by all coloured LED variants  */
function drawLED(ctx, inst, sim) {
  const { x, y } = inst;
  const col = inst.props.color || '#ff3333';
  const brightness = (inst.runtimeState && inst.runtimeState.brightness !== undefined)
    ? inst.runtimeState.brightness
    : (getInstPinState(inst, 'anode', sim) > 1 ? getInstPinState(inst, 'anode', sim) / 255 : (getInstPinState(inst, 'anode', sim) > 0.05 ? 1 : 0));
  const isOn = (inst.runtimeState && inst.runtimeState.lit !== undefined)
    ? (inst.runtimeState.lit && brightness > 0.01)
    : (brightness > 0.02);
  const blown = !!(inst.runtimeState && inst.runtimeState.blown);

  ctx.save();
  ctx.translate(x, y);

  // Lead lines
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(15, 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(15, 42); ctx.lineTo(15, 60); ctx.stroke();

  // Flat side (cathode indicator)
  ctx.strokeStyle = isOn ? col : '#555';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(8, 42); ctx.lineTo(22, 42);
  ctx.stroke();

  // 1. Ambient Volumetric Glow Halo (Breathing illumination)
  if (isOn) {
    const glowR = 32 + brightness * 20;
    const halo = ctx.createRadialGradient(15, 30, 0, 15, 30, glowR);
    halo.addColorStop(0, hexToRgba(col, 0.55 * brightness));
    halo.addColorStop(0.3, hexToRgba(col, 0.28 * brightness));
    halo.addColorStop(0.7, hexToRgba(col, 0.08 * brightness));
    halo.addColorStop(1, hexToRgba(col, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(15, 30, glowR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Inner glow aura with shadow
  if (isOn) {
    ctx.shadowColor = col;
    ctx.shadowBlur = 18 + brightness * 14;
  }

  // 3. LED Bulb body
  ctx.fillStyle = isOn ? hexToRgba(col, 0.75 + 0.25 * brightness) : (blown ? 'rgba(52,52,58,0.95)' : hexToRgba(col, 0.3));
  ctx.beginPath();
  ctx.arc(15, 30, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isOn ? '#ffffff' : (blown ? 'rgba(30,30,34,0.9)' : hexToRgba(col, 0.5));
  ctx.lineWidth = isOn ? 1.5 : 1;
  ctx.stroke();

  // 4. Glowing Internal Core & Die
  if (isOn) {
    const coreGrad = ctx.createRadialGradient(15, 29, 0, 15, 29, 9);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.45, hexToRgba(col, 0.95));
    coreGrad.addColorStop(1, hexToRgba(col, 0.3));
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(15, 29, 8, 0, Math.PI * 2);
    ctx.fill();

    // Incandescent die center
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(13, 27, 4, 4);
  } else {
    ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
    ctx.fillRect(13, 27, 4, 4);
  }

  ctx.shadowBlur = 0;

  // 5. Specular 3D Glass Dome Highlight
  const glare = ctx.createRadialGradient(11, 23, 0, 15, 28, 12);
  glare.addColorStop(0, isOn ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)');
  glare.addColorStop(0.5, isOn ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)');
  glare.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glare;
  ctx.beginPath();
  ctx.arc(15, 30, 13, 0, Math.PI * 2);
  ctx.fill();

  // Top rim highlight arc
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(15, 30, 11, -Math.PI * 0.75, -Math.PI * 0.25);
  ctx.stroke();

  // Polarity marks
  ctx.fillStyle = '#aaa';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('+', 7, 18);
  ctx.fillText('−', 24, 46);

  if (inst.selected) drawSelectionRect(ctx, -3, -3, 36, 66);
  ctx.restore();
}

/* LED — Red (default) */
defComp({
  id: 'led',
  name: 'LED (Red)',
  category: 'Output',
  icon: '🔴',
  desc: 'Red light emitting diode — glows when current flows through the anode',
  width: 30,
  height: 60,
  defaultProps: { color: '#ff3333', colorName: 'Red' },
  pins: [
    { id: 'anode', label: '+', type: PIN_TYPE.PWM, x: 15, y: 0, side: 'top' },
    { id: 'cathode', label: '−', type: PIN_TYPE.GND, x: 15, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) { drawLED(ctx, inst, sim); }
});

/* LED — Green */
defComp({
  id: 'led_green',
  name: 'LED (Green)',
  category: 'Output',
  icon: '🟢',
  desc: 'Green light emitting diode — glows when current flows through the anode',
  width: 30,
  height: 60,
  defaultProps: { color: '#33ff66', colorName: 'Green' },
  pins: [
    { id: 'anode', label: '+', type: PIN_TYPE.PWM, x: 15, y: 0, side: 'top' },
    { id: 'cathode', label: '−', type: PIN_TYPE.GND, x: 15, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) { drawLED(ctx, inst, sim); }
});

/* LED — Blue */
defComp({
  id: 'led_blue',
  name: 'LED (Blue)',
  category: 'Output',
  icon: '🔵',
  desc: 'Blue light emitting diode — glows when current flows through the anode',
  width: 30,
  height: 60,
  defaultProps: { color: '#3399ff', colorName: 'Blue' },
  pins: [
    { id: 'anode', label: '+', type: PIN_TYPE.PWM, x: 15, y: 0, side: 'top' },
    { id: 'cathode', label: '−', type: PIN_TYPE.GND, x: 15, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) { drawLED(ctx, inst, sim); }
});

/* LED — Yellow */
defComp({
  id: 'led_yellow',
  name: 'LED (Yellow)',
  category: 'Output',
  icon: '🟡',
  desc: 'Yellow light emitting diode — glows when current flows through the anode',
  width: 30,
  height: 60,
  defaultProps: { color: '#ffee33', colorName: 'Yellow' },
  pins: [
    { id: 'anode', label: '+', type: PIN_TYPE.PWM, x: 15, y: 0, side: 'top' },
    { id: 'cathode', label: '−', type: PIN_TYPE.GND, x: 15, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) { drawLED(ctx, inst, sim); }
});

/* LED — Orange */
defComp({
  id: 'led_orange',
  name: 'LED (Orange)',
  category: 'Output',
  icon: '🟠',
  desc: 'Orange light emitting diode — glows when current flows through the anode',
  width: 30,
  height: 60,
  defaultProps: { color: '#ff8833', colorName: 'Orange' },
  pins: [
    { id: 'anode', label: '+', type: PIN_TYPE.PWM, x: 15, y: 0, side: 'top' },
    { id: 'cathode', label: '−', type: PIN_TYPE.GND, x: 15, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) { drawLED(ctx, inst, sim); }
});

/* LED — White */
defComp({
  id: 'led_white',
  name: 'LED (White)',
  category: 'Output',
  icon: '⚪',
  desc: 'White light emitting diode — glows when current flows through the anode',
  width: 30,
  height: 60,
  defaultProps: { color: '#ffffff', colorName: 'White' },
  pins: [
    { id: 'anode', label: '+', type: PIN_TYPE.PWM, x: 15, y: 0, side: 'top' },
    { id: 'cathode', label: '−', type: PIN_TYPE.GND, x: 15, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) { drawLED(ctx, inst, sim); }
});

/* ═══════════════════════════════════════════════════════
   LED Component Class — standard interface demonstration
   Migrates simulation logic from canvas.js switch/case
   ═══════════════════════════════════════════════════════ */
class LEDComponent extends Component {
  getPins() {
    return [
      { id: 'anode', label: '+', type: PIN_TYPE.PWM, x: 15, y: 0, side: 'top' },
      { id: 'cathode', label: '−', type: PIN_TYPE.GND, x: 15, y: 60, side: 'bottom' },
    ];
  }

  update(canvas) {
    // Use new ElectricalEngine API
    const source = this.getSource('anode');
    const hasGnd = this.hasGround('cathode');

    if (!hasGnd || !source || source.voltage <= 0) {
      this.runtimeState.val = 0;
      this.runtimeState.lit = false;
      this.runtimeState.brightness = 0;
      this.runtimeState.current_mA = 0;
      this.runtimeState.overload = false;
      this.runtimeState.blown = false;
      this.runtimeState._warnedBlown = false;
    } else {
      // Measure actual path resistance from cathode to ground through the circuit
      let pathR = 0;
      const engine = this.engine;
      if (engine) {
        const cathodeNet = this.getNet('cathode');
        if (cathodeNet) {
          for (const gnd of cathodeNet.grounds) {
            const r = engine.measureResistance(this.id, 'cathode', gnd.instId, gnd.pinId);
            if (r < Infinity) { pathR = r; break; }
          }
        }
      }
      const rTotal = Math.max(10, pathR + 25);
      const vSource = source.voltage;
      const vf = 2.0;
      const rawVal = source.rawVal;
      const isPWM = source.type === 'digital' && rawVal > 1 && rawVal < 255;

      if (isPWM) {
        const frac = rawVal / 255;
        const normBrightness = Math.max(0, Math.min(1.0, Math.pow(frac, 0.8)));
        this.runtimeState.val = rawVal;
        this.runtimeState.lit = normBrightness > 0.02;
        this.runtimeState.brightness = normBrightness;
        this.runtimeState.current_mA = vSource >= vf ? ((vSource - vf) / rTotal) * 1000 : 0;
      } else if (vSource < vf) {
        this.runtimeState.val = 0;
        this.runtimeState.lit = false;
        this.runtimeState.brightness = 0;
        this.runtimeState.current_mA = 0;
      } else {
        const i_mA = ((vSource - vf) / rTotal) * 1000;
        this.runtimeState.current_mA = i_mA;
        const normBrightness = Math.max(0, Math.min(1.0, Math.pow(i_mA / 14.0, 0.55)));
        this.runtimeState.val = rawVal;
        this.runtimeState.lit = normBrightness > 0.02;
        this.runtimeState.brightness = normBrightness;
      }

      const iLed = this.runtimeState.current_mA || 0;
      this.runtimeState.overload = iLed > 20;
      this.runtimeState.blown = iLed > 40;

      if (this.runtimeState.blown) {
        this.runtimeState.lit = false;
        this.runtimeState.brightness = 0;
        this.runtimeState.val = 0;
        if (!this.runtimeState._warnedBlown) {
          this.runtimeState._warnedBlown = true;
          if (window.OutputPanel) {
            window.OutputPanel.log(
              `LED (${this.id}) is over-current (~${Math.round(iLed)} mA) without a current-limiting resistor and has blown! Add a 220Ω resistor in series.`,
              'warn'
            );
          }
        }
      } else {
        this.runtimeState._warnedBlown = false;
      }
    }
  }

  render(ctx, sim) {
    drawLED(ctx, this.inst, sim);
  }
}

// Register LED variants with the component registry
registerComponent('led', LEDComponent);
registerComponent('led_green', LEDComponent);
registerComponent('led_blue', LEDComponent);
registerComponent('led_yellow', LEDComponent);
registerComponent('led_orange', LEDComponent);
registerComponent('led_white', LEDComponent);

/* ---------------------------------- Multi-Color LED Array------------------------------ */
// defComp({
//   id: 'multi_led_array',
//   name: 'Multi-Color LED Array',
//   category: 'Output',
//   icon: '🌈',
//   desc: 'Module with 4 individually controlled LEDs (Red, Yellow, Green, Blue) sharing a common ground',
//   width: 90,
//   height: 60,
//   defaultProps: {},
//   pins: [
//     { id: 'led_r', label: 'R', type: PIN_TYPE.DIGITAL, x: 15, y: 60, side: 'bottom' },
//     { id: 'led_y', label: 'Y', type: PIN_TYPE.DIGITAL, x: 30, y: 60, side: 'bottom' },
//     { id: 'led_g', label: 'G', type: PIN_TYPE.DIGITAL, x: 45, y: 60, side: 'bottom' },
//     { id: 'led_b', label: 'B', type: PIN_TYPE.DIGITAL, x: 60, y: 60, side: 'bottom' },
//     { id: 'gnd', label: 'âˆ’', type: PIN_TYPE.GND, x: 75, y: 60, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;

//     // Configuration for each LED in the module
//     const leds = [
//       { id: 'led_r', color: '#ff3333', label: 'R', x: 15 },
//       { id: 'led_y', color: '#ffcc00', label: 'Y', x: 30 },
//       { id: 'led_g', color: '#33cc33', label: 'G', x: 45 },
//       { id: 'led_b', color: '#3388ff', label: 'B', x: 60 },
//     ];

//     ctx.save();
//     ctx.translate(x, y);

//     // Module Housing Base
//     ctx.fillStyle = '#1e1e24';
//     roundRect(ctx, 4, 10, 82, 30, 4);
//     ctx.fill();
//     ctx.strokeStyle = '#3a3a42';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // Bottom Lead Pins
//     const pinXs = [15, 30, 45, 60, 75];
//     ctx.strokeStyle = '#888888';
//     ctx.lineWidth = 1.5;
//     pinXs.forEach(px => {
//       ctx.beginPath();
//       ctx.moveTo(px, 40);
//       ctx.lineTo(px, 60);
//       ctx.stroke();
//     });

//     // Common Cathode (GND) Mark
//     ctx.fillStyle = '#aaaaaa';
//     ctx.font = 'bold 8px sans-serif';
//     ctx.textAlign = 'center';
//     ctx.fillText('âˆ’', 75, 53);

//     // Render Individual LEDs
//     leds.forEach(led => {
//       const val = getInstPinState(inst, led.id, sim) || 0;
//       const brightness = val > 1 ? Math.min(val / 255, 1) : Math.max(val, 0);
//       const isOn = brightness > 0.02;
//       const col = led.color;
//       const lx = led.x;
//       const ly = 25;

//       // Pin Text Labels
//       ctx.fillStyle = '#aaaaaa';
//       ctx.font = 'bold 7px sans-serif';
//       ctx.fillText(led.label, lx, 53);

//       // 1. Ambient Volumetric Glow Halo (When Lit)
//       if (isOn) {
//         const glowRadius = 18 * brightness;
//         const halo = ctx.createRadialGradient(lx, ly, 0, lx, ly, glowRadius);
//         halo.addColorStop(0, hexToRgba(col, 0.65 * brightness));
//         halo.addColorStop(0.5, hexToRgba(col, 0.25 * brightness));
//         halo.addColorStop(1, hexToRgba(col, 0));
//         ctx.fillStyle = halo;
//         ctx.beginPath();
//         ctx.arc(lx, ly, glowRadius, 0, Math.PI * 2);
//         ctx.fill();
//       }

//       // 2. LED Bulb Lens Body
//       ctx.fillStyle = isOn ? hexToRgba(col, 0.9) : hexToRgba(col, 0.3);
//       ctx.beginPath();
//       ctx.arc(lx, ly, 6, 0, Math.PI * 2);
//       ctx.fill();

//       ctx.strokeStyle = isOn ? '#ffffff' : hexToRgba(col, 0.6);
//       ctx.lineWidth = 1;
//       ctx.stroke();

//       // 3. Bright Specular Highlight Core
//       if (isOn) {
//         ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
//         ctx.beginPath();
//         ctx.arc(lx - 2, ly - 2, 1.8, 0, Math.PI * 2);
//         ctx.fill();
//       }
//     });

//     if (inst.selected) drawSelectionRect(ctx, -2, 5, 94, 60);
//     ctx.restore();
//   }
// });

defComp({
  id: 'multi_led_array',
  name: '8-LED Spectrum Array (Inbuilt Resistors)',
  category: 'Output',
  icon: '🌈',
  desc: '8-channel multi-color LED bar module with integrated 220Ω current-limiting SMD resistors and common cathode ground.',
  width: 150,
  height: 70,
  defaultProps: { label: '8-LED ARRAY' },
  pins: [
    { id: 'l1', label: 'L1', type: PIN_TYPE.DIGITAL, x: 15, y: 70, side: 'bottom' },
    { id: 'l2', label: 'L2', type: PIN_TYPE.DIGITAL, x: 30, y: 70, side: 'bottom' },
    { id: 'l3', label: 'L3', type: PIN_TYPE.DIGITAL, x: 45, y: 70, side: 'bottom' },
    { id: 'l4', label: 'L4', type: PIN_TYPE.DIGITAL, x: 60, y: 70, side: 'bottom' },
    { id: 'l5', label: 'L5', type: PIN_TYPE.DIGITAL, x: 75, y: 70, side: 'bottom' },
    { id: 'l6', label: 'L6', type: PIN_TYPE.DIGITAL, x: 90, y: 70, side: 'bottom' },
    { id: 'l7', label: 'L7', type: PIN_TYPE.DIGITAL, x: 105, y: 70, side: 'bottom' },
    { id: 'l8', label: 'L8', type: PIN_TYPE.DIGITAL, x: 120, y: 70, side: 'bottom' },
    { id: 'gnd', label: '−', type: PIN_TYPE.GND, x: 135, y: 70, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;

    // 8 Rainbow LED configuration palette
    const leds = [
      { id: 'l1', color: '#ff2233', label: '1', x: 15 },  // Red
      { id: 'l2', color: '#ff7700', label: '2', x: 30 },  // Orange
      { id: 'l3', color: '#ffcc00', label: '3', x: 45 },  // Yellow
      { id: 'l4', color: '#22cc44', label: '4', x: 60 },  // Green
      { id: 'l5', color: '#00d8ff', label: '5', x: 75 },  // Cyan
      { id: 'l6', color: '#2266ff', label: '6', x: 90 },  // Blue
      { id: 'l7', color: '#b022ff', label: '7', x: 105 }, // Purple
      { id: 'l8', color: '#ffffff', label: '8', x: 120 }, // White
    ];

    const pinXs = [15, 30, 45, 60, 75, 90, 105, 120, 135];

    ctx.save();
    ctx.translate(x, y);

    // Canvas Helper for Rounded Rectangles
    const drawRoundRect = (cx, cy, w, h, r) => {
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cx, cy, w, h, r);
      } else {
        ctx.moveTo(cx + r, cy);
        ctx.lineTo(cx + w - r, cy);
        ctx.quadraticCurveTo(cx + w, cy, cx + w, cy + r);
        ctx.lineTo(cx + w, cy + h - r);
        ctx.quadraticCurveTo(cx + w, cy + h, cx + w - r, cy + h);
        ctx.lineTo(cx + r, cy + h);
        ctx.quadraticCurveTo(cx, cy + h, cx, cy + h - r);
        ctx.lineTo(cx, cy + r);
        ctx.quadraticCurveTo(cx, cy, cx + r, cy);
      }
      ctx.closePath();
    };

    // Helper to convert hex colors to RGBA for volumetric lighting
    const hexToRgba = (hex, alpha) => {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    };

    // ----------------------------------------------------
    // 1. PIN HEADERS & LEADS (Bottom Connection)
    // ----------------------------------------------------
    // Gold/Silver Extension Pins
    pinXs.forEach(px => {
      const pinGrad = ctx.createLinearGradient(px - 1, 52, px + 1, 70);
      pinGrad.addColorStop(0, '#888888');
      pinGrad.addColorStop(0.5, '#e0e0e0');
      pinGrad.addColorStop(1, '#666666');
      ctx.fillStyle = pinGrad;
      ctx.fillRect(px - 1, 52, 2, 18);
    });

    // Black Plastic Header Strip Housing
    ctx.fillStyle = '#111116';
    drawRoundRect(5, 50, 140, 5, 1);
    ctx.fill();
    ctx.strokeStyle = '#2d2d35';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // ----------------------------------------------------
    // 2. MAIN PCB BASE (Matte Black / Slate Finish)
    // ----------------------------------------------------
    const pcbGrad = ctx.createLinearGradient(0, 0, 150, 52);
    pcbGrad.addColorStop(0, '#12161f');
    pcbGrad.addColorStop(0.5, '#1a202c');
    pcbGrad.addColorStop(1, '#0f131a');
    ctx.fillStyle = pcbGrad;
    drawRoundRect(0, 0, 150, 52, 4);
    ctx.fill();

    // Outer Edge Chamfer Border
    ctx.strokeStyle = '#2b3548';
    ctx.lineWidth = 1;
    drawRoundRect(0.8, 0.8, 148.4, 50.4, 3.5);
    ctx.stroke();

    // Corner Mounting Holes with Copper Pads
    [[4, 4], [146, 4], [4, 48], [146, 48]].forEach(([hx, hy]) => {
      ctx.fillStyle = '#0a0d12';
      ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b8973e'; // Gold ring
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // ----------------------------------------------------
    // 3. SILKSCREEN TEXT & COPPER BUS TRACES
    // ----------------------------------------------------
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 5.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('8-LED ARRAY', 8, 9);

    ctx.font = 'bold 4px monospace';
    ctx.fillStyle = '#81a1c1';
    ctx.fillText('220Ω INBUILT', 8, 14);

    // Common Cathode Ground Bus Line
    ctx.strokeStyle = '#3b4252';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15, 24);
    ctx.lineTo(135, 24);
    ctx.lineTo(135, 46);
    ctx.stroke();

    // Solder Pads around Pin holes
    pinXs.forEach(px => {
      ctx.fillStyle = '#b8973e';
      ctx.beginPath(); ctx.arc(px, 46, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f131a';
      ctx.beginPath(); ctx.arc(px, 46, 0.8, 0, Math.PI * 2); ctx.fill();
    });

    // ----------------------------------------------------
    // 4. INBUILT SMD RESISTORS ROW (220Ω - 0805 Package)
    // ----------------------------------------------------
    leds.forEach(led => {
      const rx = led.x;
      const ry = 35;

      // Vertical copper trace connecting LED -> Resistor -> Pin
      ctx.strokeStyle = '#4c566a';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(rx, 24); ctx.lineTo(rx, 46);
      ctx.stroke();

      // SMD Resistor Silver End Caps
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(rx - 3.2, ry - 1.8, 6.4, 3.6);

      // SMD Resistor Black Body
      ctx.fillStyle = '#181818';
      ctx.fillRect(rx - 2.2, ry - 1.8, 4.4, 3.6);

      // "221" SMD Marking (220 Ohms)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 2.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('221', rx, ry + 0.8);
    });

    // ----------------------------------------------------
    // 5. INDIVIDUAL LEDS & DYNAMIC GLOW EFFECTS
    // ----------------------------------------------------
    leds.forEach(led => {
      // Pin reading logic with multi-simulator fallback
      let rawVal = 0;
      if (typeof getInstPinState === 'function') {
        rawVal = getInstPinState(inst, led.id, sim) || 0;
      } else if (sim && sim.pinStates) {
        rawVal = sim.pinStates[inst.id + '_' + led.id] || 0;
      }

      const brightness = rawVal > 1 ? Math.min(rawVal / 255, 1) : Math.max(rawVal, 0);
      const isOn = brightness > 0.02;
      const col = led.color;
      const lx = led.x;
      const ly = 19;

      // Pin Silkscreen Label
      ctx.fillStyle = '#d8dee9';
      ctx.font = 'bold 4.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(led.label, lx, 43);

      // Common Cathode Label at Right
      ctx.fillStyle = '#e5e9f0';
      ctx.font = 'bold 7px sans-serif';
      ctx.fillText('−', 135, 43);

      // --- A. Ambient Volumetric Glow Halo ---
      if (isOn) {
        ctx.save();
        const glowRadius = 16 * brightness;
        const halo = ctx.createRadialGradient(lx, ly, 0, lx, ly, glowRadius);
        halo.addColorStop(0, hexToRgba(col, 0.8 * brightness));
        halo.addColorStop(0.4, hexToRgba(col, 0.35 * brightness));
        halo.addColorStop(1, hexToRgba(col, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(lx, ly, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // --- B. Metallic LED Base Flange Ring ---
      ctx.fillStyle = '#222733';
      ctx.beginPath(); ctx.arc(lx, ly, 5.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#434c5e';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // --- C. Internal Anode/Cathode Leadframe Anvil ---
      ctx.fillStyle = isOn ? hexToRgba(col, 0.9) : '#3b4252';
      ctx.fillRect(lx - 1.5, ly - 0.5, 3, 2);

      // --- D. Epoxy Resin Bulb Lens ---
      const bulbGrad = ctx.createRadialGradient(lx - 1.5, ly - 1.5, 0.5, lx, ly, 4.5);
      if (isOn) {
        bulbGrad.addColorStop(0, '#ffffff');
        bulbGrad.addColorStop(0.3, col);
        bulbGrad.addColorStop(1, hexToRgba(col, 0.85));
      } else {
        bulbGrad.addColorStop(0, hexToRgba(col, 0.45));
        bulbGrad.addColorStop(0.7, hexToRgba(col, 0.2));
        bulbGrad.addColorStop(1, 'rgba(20, 25, 35, 0.8)');
      }

      ctx.fillStyle = bulbGrad;
      ctx.beginPath();
      ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isOn ? '#ffffff' : hexToRgba(col, 0.4);
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // --- E. Specular Curved Highlight ---
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(lx - 1.5, ly - 1.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Selection Box Overlay
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -2, -2, 154, 74);
    }

    ctx.restore();
  }
});

/*-----------------------------------------RGB LED----------------------------------------*/
defComp({
  id: 'rgb_led',
  name: 'RGB LED',
  category: 'Output',
  icon: '🌈',
  desc: 'Tri-color LED with red, green, and blue channels (common cathode)',
  width: 30,
  height: 70,
  defaultProps: {},
  pins: [
    { id: 'red', label: 'R', type: PIN_TYPE.PWM, x: 6, y: 0, side: 'top' },
    { id: 'green', label: 'G', type: PIN_TYPE.PWM, x: 15, y: 0, side: 'top' },
    { id: 'blue', label: 'B', type: PIN_TYPE.PWM, x: 24, y: 0, side: 'top' },
    { id: 'gnd', label: 'âˆ’', type: PIN_TYPE.GND, x: 15, y: 70, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const rVal = (inst.runtimeState && inst.runtimeState.red !== undefined) ? inst.runtimeState.red : getInstPinPWM(inst, 'red', sim);
    const gVal = (inst.runtimeState && inst.runtimeState.green !== undefined) ? inst.runtimeState.green : getInstPinPWM(inst, 'green', sim);
    const bVal = (inst.runtimeState && inst.runtimeState.blue !== undefined) ? inst.runtimeState.blue : getInstPinPWM(inst, 'blue', sim);
    const r = Math.min(255, Math.max(0, Math.round(rVal > 1 ? rVal : (rVal ? 255 : 0))));
    const g = Math.min(255, Math.max(0, Math.round(gVal > 1 ? gVal : (gVal ? 255 : 0))));
    const b = Math.min(255, Math.max(0, Math.round(bVal > 1 ? bVal : (bVal ? 255 : 0))));
    const totalLum = Math.min(1, (r * 0.299 + g * 0.587 + b * 0.114) / 255);
    const isOn = (r + g + b) > 5;
    const col = `rgb(${r},${g},${b})`;
    const time = Date.now() / 250;
    const pulse = isOn ? 1 + Math.sin(time) * 0.07 : 1;

    ctx.save();
    ctx.translate(x, y);

    // Leads (R, G, B, GND)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#cc4444'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(6, 22); ctx.stroke();
    ctx.strokeStyle = '#44cc44'; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(15, 18); ctx.stroke();
    ctx.strokeStyle = '#4444cc'; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(24, 22); ctx.stroke();
    ctx.strokeStyle = '#888'; ctx.beginPath(); ctx.moveTo(15, 48); ctx.lineTo(15, 70); ctx.stroke();

    // 1. Ambient Volumetric Glow Halo
    if (isOn) {
      const glowR = (36 + totalLum * 22) * pulse;
      const halo = ctx.createRadialGradient(15, 35, 0, 15, 35, glowR);
      halo.addColorStop(0, `rgba(${r},${g},${b},${0.5 * totalLum})`);
      halo.addColorStop(0.35, `rgba(${r},${g},${b},${0.24 * totalLum})`);
      halo.addColorStop(0.7, `rgba(${r},${g},${b},${0.07 * totalLum})`);
      halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(15, 35, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Glow shadow
    if (isOn) {
      ctx.shadowColor = col;
      ctx.shadowBlur = (20 + totalLum * 15) * pulse;
    }

    // 3. Bulb body
    ctx.fillStyle = isOn ? `rgba(${r},${g},${b},0.85)` : '#2a2a2a';
    ctx.beginPath();
    ctx.arc(15, 35, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isOn ? 'rgba(255,255,255,0.75)' : '#555';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. White hotspot core
    if (isOn) {
      const core = ctx.createRadialGradient(15, 34, 0, 15, 34, 9);
      core.addColorStop(0, '#ffffff');
      core.addColorStop(0.45, `rgba(${r},${g},${b},0.95)`);
      core.addColorStop(1, `rgba(${r},${g},${b},0.3)`);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(15, 34, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;

    // 5. Specular dome glare
    const glare = ctx.createRadialGradient(11, 28, 0, 15, 33, 13);
    glare.addColorStop(0, isOn ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)');
    glare.addColorStop(0.5, isOn ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)');
    glare.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glare;
    ctx.beginPath();
    ctx.arc(15, 35, 14, 0, Math.PI * 2);
    ctx.fill();

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 36, 76);
    ctx.restore();
  }
});

/* ---------------------------------------BUZZER--------------------------------- */
defComp({
  id: 'buzzer',
  name: 'Buzzer',
  category: 'Output',
  icon: '🔔',
  desc: 'Piezoelectric buzzer — produces a tone when a digital signal is applied',
  width: 40,
  height: 50,
  defaultProps: { frequency: 1000 },
  pins: [
    { id: 'vcc', label: '+', type: PIN_TYPE.DIGITAL, x: 12, y: 50, side: 'bottom' },
    { id: 'gnd', label: 'âˆ’', type: PIN_TYPE.GND, x: 28, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const isOn = inst.runtimeState && inst.runtimeState.active;

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(12, 50); ctx.lineTo(12, 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(28, 50); ctx.lineTo(28, 44); ctx.stroke();

    // Body ring
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(20, 24, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner circle
    ctx.fillStyle = isOn ? '#443311' : '#222';
    ctx.beginPath();
    ctx.arc(20, 24, 14, 0, Math.PI * 2);
    ctx.fill();

    // Piezo element
    ctx.fillStyle = isOn ? '#c8a84b' : '#888';
    ctx.beginPath();
    ctx.arc(20, 24, 8, 0, Math.PI * 2);
    ctx.fill();

    // Sound waves when active
    if (isOn) {
      ctx.strokeStyle = 'rgba(200,168,75,0.5)';
      ctx.lineWidth = 1.5;
      for (let r = 15; r <= 30; r += 7) {
        ctx.beginPath();
        ctx.arc(20, 24, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // + and âˆ’ marks
    ctx.fillStyle = '#888';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', 12, 48);
    ctx.fillText('âˆ’', 28, 48);

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 46, 56);
    ctx.restore();
  }
});

/* 7-SEGMENT DISPLAY  */
defComp({
  id: 'seg7',
  name: '7-Segment Display',
  category: 'Output',
  icon: '🔢',
  desc: 'Single-digit 7-segment LED display with decimal point',
  width: 50,
  height: 80,
  defaultProps: { commonAnode: false },
  pins: [
    { id: 'segA', label: 'A', type: PIN_TYPE.DIGITAL, x: 8, y: 0, side: 'top' },
    { id: 'segB', label: 'B', type: PIN_TYPE.DIGITAL, x: 16, y: 0, side: 'top' },
    { id: 'segC', label: 'C', type: PIN_TYPE.DIGITAL, x: 24, y: 0, side: 'top' },
    { id: 'segD', label: 'D', type: PIN_TYPE.DIGITAL, x: 32, y: 0, side: 'top' },
    { id: 'segE', label: 'E', type: PIN_TYPE.DIGITAL, x: 40, y: 0, side: 'top' },
    { id: 'segF', label: 'F', type: PIN_TYPE.DIGITAL, x: 48, y: 0, side: 'top' },
    { id: 'segG', label: 'G', type: PIN_TYPE.DIGITAL, x: 8, y: 80, side: 'bottom' },
    { id: 'dp', label: 'DP', type: PIN_TYPE.DIGITAL, x: 16, y: 80, side: 'bottom' },
    { id: 'com', label: 'COM', type: PIN_TYPE.POWER, x: 32, y: 80, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const segs = inst.runtimeState && inst.runtimeState.segments ? inst.runtimeState.segments : {};

    ctx.save();
    ctx.translate(x, y);

    // Body
    ctx.fillStyle = '#111';
    roundRect(ctx, 2, 8, 46, 65, 4);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw 7 segments
    const SEG_ON = '#ff2200';
    const SEG_OFF = '#2a0000';
    const sw = 5, sh = 18;
    // Segment positions: a(top), b(top-right), c(bottom-right), d(bottom), e(bottom-left), f(top-left), g(middle)
    const drawHSeg = (sy, active) => {
      ctx.fillStyle = active ? SEG_ON : SEG_OFF;
      ctx.beginPath();
      ctx.moveTo(14, sy); ctx.lineTo(16, sy - 3); ctx.lineTo(36, sy - 3);
      ctx.lineTo(38, sy); ctx.lineTo(36, sy + 3); ctx.lineTo(16, sy + 3);
      ctx.closePath(); ctx.fill();
    };
    const drawVSeg = (sx, sy, active) => {
      ctx.fillStyle = active ? SEG_ON : SEG_OFF;
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.lineTo(sx + 3, sy + 2); ctx.lineTo(sx + 3, sy + 16);
      ctx.lineTo(sx, sy + 18); ctx.lineTo(sx - 3, sy + 16); ctx.lineTo(sx - 3, sy + 2);
      ctx.closePath(); ctx.fill();
    };
    drawHSeg(16, segs.A); // a - top
    drawVSeg(38, 18, segs.B); // b - top right
    drawVSeg(38, 38, segs.C); // c - bottom right
    drawHSeg(56, segs.D); // d - bottom
    drawVSeg(14, 38, segs.E); // e - bottom left
    drawVSeg(14, 18, segs.F); // f - top left
    drawHSeg(36, segs.G); // g - middle

    // Decimal point
    ctx.fillStyle = segs.DP ? SEG_ON : SEG_OFF;
    ctx.beginPath();
    ctx.arc(44, 59, 3, 0, Math.PI * 2);
    ctx.fill();

    if (inst.selected) drawSelectionRect(ctx, -1, 5, 52, 78);
    ctx.restore();
  }
});

/* -------------- LCD 16x2 (Parallel HD44780 - Large Realistic Design) ------------------ */

defComp({
  id: 'lcd1602',
  name: 'LCD 16×2',
  category: 'Output',
  icon: '🖥️',
  desc: '16x2 character LCD display with HD44780-compatible 4-bit parallel interface (Enlarged)',
  width: 170,
  height: 90,
  // defaultProps: { line1: 'Hello, World!  ', line2: 'ArduSim v1.0   ' },
  pins: [
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 14, y: 90, side: 'bottom' },
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 28, y: 90, side: 'bottom' },
    { id: 'vo', label: 'V0', type: PIN_TYPE.SIGNAL, x: 42, y: 90, side: 'bottom' },
    { id: 'rs', label: 'RS', type: PIN_TYPE.DIGITAL, x: 56, y: 90, side: 'bottom' },
    { id: 'rw', label: 'R/W', type: PIN_TYPE.DIGITAL, x: 70, y: 90, side: 'bottom' },
    { id: 'en', label: 'EN', type: PIN_TYPE.DIGITAL, x: 84, y: 90, side: 'bottom' },
    { id: 'd4', label: 'D4', type: PIN_TYPE.DIGITAL, x: 112, y: 90, side: 'bottom' },
    { id: 'd5', label: 'D5', type: PIN_TYPE.DIGITAL, x: 126, y: 90, side: 'bottom' },
    { id: 'd6', label: 'D6', type: PIN_TYPE.DIGITAL, x: 140, y: 90, side: 'bottom' },
    { id: 'd7', label: 'D7', type: PIN_TYPE.DIGITAL, x: 154, y: 90, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const line1 = (inst.runtimeState && inst.runtimeState.line1 !== undefined ? inst.runtimeState.line1 : (inst.props.line1 || '')).padEnd(16, ' ').substring(0, 16);
    const line2 = (inst.runtimeState && inst.runtimeState.line2 !== undefined ? inst.runtimeState.line2 : (inst.props.line2 || '')).padEnd(16, ' ').substring(0, 16);
    const powered = Boolean(inst.runtimeState && inst.runtimeState.powered);

    ctx.save();
    ctx.translate(x, y);

    // 1. PCB Main Board (FR4 Dark Forest Green Mask)
    ctx.fillStyle = '#0a3020';
    roundRect(ctx, 0, 0, 170, 74, 4);
    ctx.fill();

    // Corner Mounting Holes with Annular Gold Rings
    const screwHoles = [[6, 6], [164, 6], [6, 68], [164, 68]];
    screwHoles.forEach(([hx, hy]) => {
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#05180f';
      ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI * 2); ctx.fill();
    });

    // Board Model Silkscreen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = 'bold 6px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('1602A HD44780', 14, 69);

    // 2. Metal Bezel Frame (Dark Anodized Stamped Metal Enclosure)
    const bezelX = 10, bezelY = 5, bezelW = 150, bezelH = 55;
    ctx.fillStyle = '#1e2224';
    roundRect(ctx, bezelX, bezelY, bezelW, bezelH, 3);
    ctx.fill();

    // Metallic Outer Rim Highlight & Shadow
    ctx.strokeStyle = '#3a3f44';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Metal Locking Tabs (Stamped Casing Clasps)
    ctx.fillStyle = '#121517';
    [[bezelX + 30, bezelY - 1], [bezelX + 114, bezelY - 1], [bezelX + 30, bezelY + bezelH - 2], [bezelX + 114, bezelY + bezelH - 2]].forEach(([tx, ty]) => {
      ctx.fillRect(tx, ty, 8, 3.5);
    });

    // 3. Active LCD Glass Area
    const glassX = 16, glassY = 10, glassW = 138, glassH = 45;
    if (powered) {
      // Classic HD44780 Yellow-Green Backlight Gradient
      const bgGrad = ctx.createLinearGradient(glassX, glassY, glassX, glassY + glassH);
      bgGrad.addColorStop(0, '#a5db3b');
      bgGrad.addColorStop(1, '#81b827');
      ctx.fillStyle = bgGrad;
    } else {
      // Unpowered Liquid Crystal
      ctx.fillStyle = '#23301a';
    }
    ctx.fillRect(glassX, glassY, glassW, glassH);

    // Inner Glass Shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(glassX + 0.5, glassY + 0.5, glassW - 1, glassH - 1);

    // 4. Character Matrix Cells (16x2 Grid Background Ghosting)
    const cellW = 7.5, cellH = 16.5, startX = 20, row1Y = 13.5, row2Y = 33.5;
    ctx.fillStyle = powered ? 'rgba(0, 0, 0, 0.055)' : 'rgba(255, 255, 255, 0.025)';
    for (let c = 0; c < 16; c++) {
      ctx.fillRect(startX + c * 8.4, row1Y, cellW, cellH);
      ctx.fillRect(startX + c * 8.4, row2Y, cellW, cellH);
    }

    // 5. Active Text Segments
    ctx.font = 'bold 12.5px "JetBrains Mono", "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    if (powered) {
      // Fluid Sub-Pixel Drop Shadow
      ctx.fillStyle = 'rgba(20, 35, 10, 0.25)';
      for (let i = 0; i < 16; i++) {
        ctx.fillText(line1[i], startX + i * 8.4 + 0.5, row1Y + 2);
        ctx.fillText(line2[i], startX + i * 8.4 + 0.5, row2Y + 2);
      }
      ctx.fillStyle = '#11220a';
    } else {
      ctx.fillStyle = '#2c3d23';
    }

    for (let i = 0; i < 16; i++) {
      ctx.fillText(line1[i], startX + i * 8.4, row1Y + 1.5);
      ctx.fillText(line2[i], startX + i * 8.4, row2Y + 1.5);
    }

    // 6. Pinout Silkscreen Labels
    const pins = [
      { label: 'GND', x: 14 }, { label: 'VCC', x: 28 }, { label: 'V0', x: 42 },
      { label: 'RS', x: 56 }, { label: 'RW', x: 70 }, { label: 'E', x: 84 },
      { label: 'D4', x: 112 }, { label: 'D5', x: 126 }, { label: 'D6', x: 140 }, { label: 'D7', x: 154 }
    ];

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'bold 5px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    pins.forEach(p => {
      ctx.fillText(p.label, p.x, 69);
    });

    // 7. Molded Plastic Header Shroud & Gold Pin Leads
    ctx.fillStyle = '#181818';
    roundRect(ctx, 8, 73, 154, 5, 1);
    ctx.fill();

    pins.forEach(p => {
      // Solder Pad on PCB
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(p.x, 70.5, 1.5, 0, Math.PI * 2); ctx.fill();

      // Gold Lead Terminal
      ctx.fillStyle = '#ffd066';
      ctx.fillRect(p.x - 1.2, 78, 2.4, 12);
    });

    if (inst.selected) drawSelectionRect(ctx, -4, -4, 178, 98);
    ctx.restore();
  }
});
/* -------------------- LCD 16x2 (I2C Backpack - Large Realistic Design) ------------------ */
defComp({
  id: 'lcd1602_i2c',
  name: 'LCD 16x2 (I2C)',
  category: 'Output',
  icon: '🖥️',
  desc: '16x2 character LCD display with integrated PCF8574 I2C daughterboard adapter (Enlarged)',
  width: 170,
  height: 90,
  defaultProps: { address: '0x27' },
  interactive: [
    { field: 'address', label: 'I2C Address', type: 'text' },
  ],
  pins: [
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 50, y: 90, side: 'bottom' },
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 70, y: 90, side: 'bottom' },
    { id: 'sda', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 90, y: 90, side: 'bottom' },
    { id: 'scl', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 110, y: 90, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const line1 = (inst.runtimeState && inst.runtimeState.line1 !== undefined ? inst.runtimeState.line1 : (inst.props.line1 || '')).padEnd(16, ' ').substring(0, 16);
    const line2 = (inst.runtimeState && inst.runtimeState.line2 !== undefined ? inst.runtimeState.line2 : (inst.props.line2 || '')).padEnd(16, ' ').substring(0, 16);
    const powered = Boolean(inst.runtimeState && inst.runtimeState.powered);

    ctx.save();
    ctx.translate(x, y);

    // 1. Main Display PCB (FR4 Dark Green/Blue Mask) - Enlarged
    ctx.fillStyle = '#0a3020';
    roundRect(ctx, 0, 0, 170, 70, 4);
    ctx.fill();

    // Corner Mounting Holes with Gold Annular Rings
    const screwHoles = [[6, 6], [164, 6], [6, 64], [164, 64]];
    screwHoles.forEach(([hx, hy]) => {
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#05180f';
      ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI * 2); ctx.fill();
    });

    // 2. Metal Enclosure Bezel - Enlarged & Proportional
    const bezelX = 10, bezelY = 5, bezelW = 150, bezelH = 54;
    ctx.fillStyle = '#1e2224';
    roundRect(ctx, bezelX, bezelY, bezelW, bezelH, 3);
    ctx.fill();

    ctx.strokeStyle = '#3a3f44';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Stamped Metal Bezel Clamps
    ctx.fillStyle = '#121517';
    [[bezelX + 30, bezelY - 1], [bezelX + 114, bezelY - 1], [bezelX + 30, bezelY + bezelH - 2], [bezelX + 114, bezelY + bezelH - 2]].forEach(([tx, ty]) => {
      ctx.fillRect(tx, ty, 8, 3.5);
    });

    // 3. LCD Active Matrix Glass (High-Contrast HD44780 Backlight)
    const glassX = 16, glassY = 10, glassW = 138, glassH = 44;
    if (powered) {
      const grad = ctx.createLinearGradient(glassX, glassY, glassX, glassY + glassH);
      grad.addColorStop(0, '#a5db3b');
      grad.addColorStop(1, '#81b827');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = '#23301a';
    }
    ctx.fillRect(glassX, glassY, glassW, glassH);

    // Inner Glass Shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(glassX + 0.5, glassY + 0.5, glassW - 1, glassH - 1);

    // 4. Character Cells (5x8 Grid Ghost Matrix) - Scaled Up
    const cellW = 7.5, cellH = 16, startX = 20, row1Y = 13, row2Y = 32;
    ctx.fillStyle = powered ? 'rgba(0, 0, 0, 0.055)' : 'rgba(255, 255, 255, 0.025)';
    for (let c = 0; c < 16; c++) {
      ctx.fillRect(startX + c * 8.4, row1Y, cellW, cellH);
      ctx.fillRect(startX + c * 8.4, row2Y, cellW, cellH);
    }

    // 5. Active Text Segments - Larger Readable Font
    ctx.font = 'bold 12.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    if (powered) {
      ctx.fillStyle = 'rgba(20, 35, 10, 0.25)';
      for (let i = 0; i < 16; i++) {
        ctx.fillText(line1[i], startX + i * 8.4 + 0.5, row1Y + 2);
        ctx.fillText(line2[i], startX + i * 8.4 + 0.5, row2Y + 2);
      }
      ctx.fillStyle = '#11220a';
    } else {
      ctx.fillStyle = '#2c3d23';
    }

    for (let i = 0; i < 16; i++) {
      ctx.fillText(line1[i], startX + i * 8.4, row1Y + 1.5);
      ctx.fillText(line2[i], startX + i * 8.4, row2Y + 1.5);
    }

    // 6. I2C Daughterboard (Piggyback PCB - Dark Blue FR4) - Scaled & Repositioned
    const bpX = 30, bpY = 64, bpW = 110, bpH = 20;
    ctx.fillStyle = '#0f2744';
    roundRect(ctx, bpX, bpY, bpW, bpH, 2.5);
    ctx.fill();
    ctx.strokeStyle = '#1e4878';
    ctx.lineWidth = 1;
    ctx.stroke();

    // PCF8574 Expander IC (SOIC Package)
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(bpX + 6, bpY + 4, 18, 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '5.5px "JetBrains Mono", monospace';
    ctx.fillText('PCF8574', bpX + 7, bpY + 8);
    // Pin 1 Notch/Dot
    ctx.fillStyle = '#444';
    ctx.beginPath(); ctx.arc(bpX + 9, bpY + 6.5, 0.8, 0, Math.PI * 2); ctx.fill();

    // Contrast Trimpot (Blue casing with brass center dial)
    ctx.fillStyle = '#1d4ed8';
    roundRect(ctx, bpX + 90, bpY + 3, 12, 12, 1.5);
    ctx.fill();
    ctx.fillStyle = '#eab308';
    ctx.beginPath(); ctx.arc(bpX + 96, bpY + 9, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bpX + 93.5, bpY + 9); ctx.lineTo(bpX + 98.5, bpY + 9);
    ctx.moveTo(bpX + 96, bpY + 6.5); ctx.lineTo(bpX + 96, bpY + 11.5);
    ctx.stroke();

    // Backlight Jumper Cap (Black 2-pin shunt)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(bpX + 74, bpY + 4.5, 8, 10);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(bpX + 75.5, bpY + 3, 1.5, 1.5);
    ctx.fillRect(bpX + 79, bpY + 3, 1.5, 1.5);

    // Silkscreen Pin Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '6px "JetBrains Mono", sans-serif';
    ctx.fillText('GND', bpX + 17, bpY + 13);
    ctx.fillText('VCC', bpX + 37, bpY + 13);
    ctx.fillText('SDA', bpX + 57, bpY + 13);
    ctx.fillText('SCL', bpX + 77, bpY + 13);

    // 7. 4-Pin Header Mold & Terminals
    ctx.fillStyle = '#181818';
    roundRect(ctx, 43, 84, 84, 6, 1);
    ctx.fill();

    const pinXs = [50, 70, 90, 110];
    pinXs.forEach(px => {
      // Solder Joint on Adapter PCB
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(px, 80, 1.8, 0, Math.PI * 2); ctx.fill();
      // Gold Pin Lead
      ctx.fillStyle = '#ffd066';
      ctx.fillRect(px - 1.2, 84, 2.4, 6);
    });

    if (inst.selected) drawSelectionRect(ctx, -4, -4, 178, 98);
    ctx.restore();
  }
});
/* -------------------- LCD 20x4 (I2C Backpack - Large Realistic Design) ------------------ */
defComp({
  id: 'lcd2004_i2c',
  name: 'LCD 20x4 (I2C)',
  category: 'Output',
  icon: '🖥️',
  desc: '20x4 character LCD display with integrated PCF8574 I2C daughterboard adapter',
  width: 210,
  height: 110,
  defaultProps: { address: '0x27' },
  interactive: [
    { field: 'address', label: 'I2C Address', type: 'text' },
  ],
  pins: [
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 60, y: 110, side: 'bottom' },
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 85, y: 110, side: 'bottom' },
    { id: 'sda', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 110, y: 110, side: 'bottom' },
    { id: 'scl', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 135, y: 110, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const rs = inst.runtimeState || {};
    const line1 = (rs.line1 !== undefined ? rs.line1 : (inst.props.line1 || '')).padEnd(20, ' ').substring(0, 20);
    const line2 = (rs.line2 !== undefined ? rs.line2 : (inst.props.line2 || '')).padEnd(20, ' ').substring(0, 20);
    const line3 = (rs.line3 !== undefined ? rs.line3 : (inst.props.line3 || '')).padEnd(20, ' ').substring(0, 20);
    const line4 = (rs.line4 !== undefined ? rs.line4 : (inst.props.line4 || '')).padEnd(20, ' ').substring(0, 20);
    const powered = Boolean(rs.powered);

    ctx.save();
    ctx.translate(x, y);

    // 1. Main Display PCB (FR4 Dark Green Mask)
    ctx.fillStyle = '#0a3020';
    roundRect(ctx, 0, 0, 210, 90, 4);
    ctx.fill();

    // Corner Mounting Holes with Gold Annular Rings
    const screwHoles = [[6, 6], [204, 6], [6, 84], [204, 84]];
    screwHoles.forEach(([hx, hy]) => {
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#05180f';
      ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI * 2); ctx.fill();
    });

    // 2. Metal Enclosure Bezel
    const bezelX = 10, bezelY = 5, bezelW = 190, bezelH = 70;
    ctx.fillStyle = '#1e2224';
    roundRect(ctx, bezelX, bezelY, bezelW, bezelH, 3);
    ctx.fill();
    ctx.strokeStyle = '#3a3f44';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Stamped Metal Bezel Clamps
    ctx.fillStyle = '#121517';
    [[bezelX + 40, bezelY - 1], [bezelX + 144, bezelY - 1], [bezelX + 40, bezelY + bezelH - 2], [bezelX + 144, bezelY + bezelH - 2]].forEach(([tx, ty]) => {
      ctx.fillRect(tx, ty, 8, 3.5);
    });

    // 3. LCD Active Matrix Glass (HD44780 Backlight)
    const glassX = 16, glassY = 10, glassW = 178, glassH = 58;
    if (powered) {
      const grad = ctx.createLinearGradient(glassX, glassY, glassX, glassY + glassH);
      grad.addColorStop(0, '#a5db3b');
      grad.addColorStop(1, '#81b827');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = '#23301a';
    }
    ctx.fillRect(glassX, glassY, glassW, glassH);

    // Inner Glass Shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(glassX + 0.5, glassY + 0.5, glassW - 1, glassH - 1);

    // 4. Character Cells (4 rows x 20 cols)
    const cellW = 7.5, cellH = 12, startX = 20, gap = 8.4;
    const row1Y = 12, row2Y = 24, row3Y = 36, row4Y = 48;
    ctx.fillStyle = powered ? 'rgba(0, 0, 0, 0.055)' : 'rgba(255, 255, 255, 0.025)';
    for (let c = 0; c < 20; c++) {
      ctx.fillRect(startX + c * gap, row1Y, cellW, cellH);
      ctx.fillRect(startX + c * gap, row2Y, cellW, cellH);
      ctx.fillRect(startX + c * gap, row3Y, cellW, cellH);
      ctx.fillRect(startX + c * gap, row4Y, cellW, cellH);
    }

    // 5. Active Text Segments
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    if (powered) {
      ctx.fillStyle = 'rgba(20, 35, 10, 0.25)';
      for (let i = 0; i < 20; i++) {
        ctx.fillText(line1[i], startX + i * gap + 0.5, row1Y + 2);
        ctx.fillText(line2[i], startX + i * gap + 0.5, row2Y + 2);
        ctx.fillText(line3[i], startX + i * gap + 0.5, row3Y + 2);
        ctx.fillText(line4[i], startX + i * gap + 0.5, row4Y + 2);
      }
      ctx.fillStyle = '#11220a';
    } else {
      ctx.fillStyle = '#2c3d23';
    }

    for (let i = 0; i < 20; i++) {
      ctx.fillText(line1[i], startX + i * gap, row1Y + 1.5);
      ctx.fillText(line2[i], startX + i * gap, row2Y + 1.5);
      ctx.fillText(line3[i], startX + i * gap, row3Y + 1.5);
      ctx.fillText(line4[i], startX + i * gap, row4Y + 1.5);
    }

    // 6. I2C Daughterboard (Piggyback PCB)
    const bpX = 40, bpY = 84, bpW = 130, bpH = 20;
    ctx.fillStyle = '#0f2744';
    roundRect(ctx, bpX, bpY, bpW, bpH, 2.5);
    ctx.fill();
    ctx.strokeStyle = '#1e4878';
    ctx.lineWidth = 1;
    ctx.stroke();

    // PCF8574 Expander IC
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(bpX + 6, bpY + 4, 18, 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '5.5px "JetBrains Mono", monospace';
    ctx.fillText('PCF8574', bpX + 7, bpY + 8);
    ctx.fillStyle = '#444';
    ctx.beginPath(); ctx.arc(bpX + 9, bpY + 6.5, 0.8, 0, Math.PI * 2); ctx.fill();

    // Contrast Trimpot
    ctx.fillStyle = '#1d4ed8';
    roundRect(ctx, bpX + 105, bpY + 3, 12, 12, 1.5);
    ctx.fill();
    ctx.fillStyle = '#eab308';
    ctx.beginPath(); ctx.arc(bpX + 111, bpY + 9, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bpX + 108.5, bpY + 9); ctx.lineTo(bpX + 113.5, bpY + 9);
    ctx.moveTo(bpX + 111, bpY + 6.5); ctx.lineTo(bpX + 111, bpY + 11.5);
    ctx.stroke();

    // Backlight Jumper
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(bpX + 88, bpY + 4.5, 8, 10);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(bpX + 89.5, bpY + 3, 1.5, 1.5);
    ctx.fillRect(bpX + 93, bpY + 3, 1.5, 1.5);

    // Silkscreen Pin Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '6px "JetBrains Mono", sans-serif';
    ctx.fillText('GND', bpX + 17, bpY + 13);
    ctx.fillText('VCC', bpX + 42, bpY + 13);
    ctx.fillText('SDA', bpX + 67, bpY + 13);
    ctx.fillText('SCL', bpX + 92, bpY + 13);

    // 7. 4-Pin Header
    ctx.fillStyle = '#181818';
    roundRect(ctx, 53, 104, 89, 6, 1);
    ctx.fill();

    const pinXs = [60, 85, 110, 135];
    pinXs.forEach(px => {
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(px, 100, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd066';
      ctx.fillRect(px - 1.2, 104, 2.4, 6);
    });

    if (inst.selected) drawSelectionRect(ctx, -4, -4, 218, 118);
    ctx.restore();
  }
});
/*---------------------------------OLED 128x64 (SSD1306, I2C)----------------------------- */

/* --------------------- OLED 128x64 SSD1306 (Realistic Design) ------------------ */
defComp({
  id: 'oled_ssd1306',
  name: 'OLED 128x64 (I2C)',
  category: 'Output',
  icon: '🖥️',
  desc: '0.96" 128x64 monochrome OLED display with SSD1306 I2C controller',
  width: 132,
  height: 76,
  defaultProps: { address: '0x3C' },
  interactive: [
    { field: 'address', label: 'I2C Addr', type: 'text' },
  ],
  pins: [
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 36, y: 76, side: 'bottom' },
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 52, y: 76, side: 'bottom' },
    { id: 'scl', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 68, y: 76, side: 'bottom' },
    { id: 'sda', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 84, y: 76, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const o = inst.runtimeState && inst.runtimeState.oled;
    const powered = Boolean(o && o.power);

    ctx.save();
    ctx.translate(x, y);

    // 1. Blue FR4 Module PCB Board
    ctx.fillStyle = '#0a1628';
    roundRect(ctx, 0, 0, 132, 68, 3);
    ctx.fill();

    // Subtle PCB copper ground plane edge
    ctx.strokeStyle = '#183153';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4 Corner Gold-Plated Mounting Holes
    const screwHoles = [[4, 4], [128, 4], [4, 64], [128, 64]];
    screwHoles.forEach(([hx, hy]) => {
      ctx.fillStyle = '#c8a452'; // Gold pad
      ctx.beginPath(); ctx.arc(hx, hy, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#040b14'; // Drill hole
      ctx.beginPath(); ctx.arc(hx, hy, 1.4, 0, Math.PI * 2); ctx.fill();
    });

    // PCB Silkscreen Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('0.96" OLED', 8, 65);

    ctx.textAlign = 'right';
    ctx.fillText(inst.props.address || '0x3C', 124, 65);

    // 2. Ultra-Thin Protective Glass Panel Substrate
    const glassX = 1.5, glassY = 2, glassW = 129, glassH = 55;

    // Glass Outer Shadow & Bevel
    ctx.fillStyle = '#03070d';
    roundRect(ctx, glassX, glassY, glassW, glassH, 1.5);
    ctx.fill();

    // Glass Polished Edge Reflection Highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Bottom Kapton Flex Ribbon Connector (amber ribbon peek under glass)
    ctx.fillStyle = '#995c00';
    ctx.fillRect(40, 56, 52, 2.5);
    ctx.fillStyle = '#b36b00';
    for (let rx = 42; rx < 90; rx += 3) {
      ctx.fillRect(rx, 56, 1.2, 2.5);
    }

    // 3. Active 128x64 OLED Matrix Area
    const screenX = 2, screenY = 3, screenW = 128, screenH = 52;
    // Deep Infinite Pitch Black OLED Base
    ctx.fillStyle = powered ? '#010306' : '#040810';
    ctx.fillRect(screenX, screenY, screenW, screenH);

    // 4. Pixel & Buffer Rendering
    const litColor = o && o.invert ? '#010306' : '#38bdf8'; // Vivid Cyan-Blue OLED Emissive
    const dimColor = o && o.invert ? '#38bdf8' : '#010306';

    if (o && o.pixels) {
      if (o.invert) {
        ctx.fillStyle = dimColor;
        ctx.fillRect(screenX, screenY, screenW, screenH);
      }
      ctx.fillStyle = litColor;
      const px = o.pixels;
      for (let i = 0; i < px.length; i++) {
        if (!px[i]) continue;
        ctx.fillRect(screenX + (i % 128), screenY + ((i / 128) | 0), 1, 1);
      }
    }

    // Text Overlay Layer (Adafruit_GFX / SSD1306 driver compatibility)
    if (o && o.texts) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (const t of o.texts) {
        ctx.font = `${t.size * 8}px "JetBrains Mono", monospace`;
        ctx.fillStyle = (o.invert ? t.color === 0 : t.color === 1) ? '#38bdf8' : '#010306';
        ctx.fillText(t.text, screenX + t.x, screenY + t.y);
      }
    }

    // Glass Surface Specular Reflection Glare
    const glareGrad = ctx.createLinearGradient(screenX, screenY, screenX + screenW, screenY + screenH);
    glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
    glareGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.01)');
    glareGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = glareGrad;
    ctx.fillRect(screenX, screenY, screenW, screenH);

    // 5. Standby Screen (When unpowered or booting)
    if (!powered) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SSD1306 OLED', 66, 29);
    }

    // 6. I2C Pinout Silkscreen Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 5px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GND', 36, 62);
    ctx.fillText('VCC', 52, 62);
    ctx.fillText('SCL', 68, 62);
    ctx.fillText('SDA', 84, 62);

    // 7. 4-Pin Male Header Strip & Solder Terminals
    ctx.fillStyle = '#111111';
    roundRect(ctx, 28, 66, 64, 4, 1);
    ctx.fill();

    const pinXs = [36, 52, 68, 84];
    pinXs.forEach(px => {
      // Circular Gold PCB Solder Pad
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(px, 60, 1.2, 0, Math.PI * 2); ctx.fill();
      // Gold Contact Pin Lead
      ctx.fillStyle = '#ffd066';
      ctx.fillRect(px - 1, 68, 2, 8);
    });

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 138, 82);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════
   12V Incandescent Bulb — glows warm amber when powered
   ═══════════════════════════════════════════════════════ */
defComp({
  id: 'bulb_12v',
  name: '12V Incandescent Bulb',
  category: 'Output',
  icon: '💡',
  desc: '12V miniature incandescent bulb (w3x16d) — glows warm amber when connected to a voltage source with complete ground path',
  width: 40,
  height: 80,
  defaultProps: {},
  pins: [
    { id: 'anode', label: '+', type: PIN_TYPE.POWER, x: 20, y: 0, side: 'top' },
    { id: 'cathode', label: '−', type: PIN_TYPE.GND, x: 20, y: 80, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const brightness = (inst.runtimeState && inst.runtimeState.brightness !== undefined)
      ? inst.runtimeState.brightness
      : 0;
    const isOn = brightness > 0.02;
    const blown = !!(inst.runtimeState && inst.runtimeState.blown);

    ctx.save();
    ctx.translate(x, y);

    // Lead wires
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(20, 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, 62); ctx.lineTo(20, 80); ctx.stroke();

    // ── Edison Screw Base (Brass) ──
    const baseGrad = ctx.createLinearGradient(12, 52, 28, 62);
    baseGrad.addColorStop(0, '#b8860b');
    baseGrad.addColorStop(0.3, '#daa520');
    baseGrad.addColorStop(0.7, '#cd9b1d');
    baseGrad.addColorStop(1, '#8b6914');
    ctx.fillStyle = baseGrad;
    roundRect(ctx, 12, 52, 16, 12, 2);
    ctx.fill();

    // Thread grooves on base
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.6;
    for (let ty = 54; ty < 63; ty += 2.5) {
      ctx.beginPath(); ctx.moveTo(13, ty); ctx.lineTo(27, ty); ctx.stroke();
    }

    // Base bottom contact (insulator + tip)
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 15, 63, 10, 3, 1);
    ctx.fill();
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath(); ctx.arc(20, 66, 2, 0, Math.PI * 2); ctx.fill();

    // ── Glass Envelope (Pear / A19 shape) ──
    // Outer glass shell
    const glassGrad = ctx.createLinearGradient(8, 18, 32, 52);
    glassGrad.addColorStop(0, isOn ? 'rgba(255,240,200,0.15)' : 'rgba(200,210,220,0.12)');
    glassGrad.addColorStop(0.5, isOn ? 'rgba(255,230,170,0.08)' : 'rgba(180,190,200,0.06)');
    glassGrad.addColorStop(1, isOn ? 'rgba(255,220,140,0.05)' : 'rgba(160,170,180,0.04)');
    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.moveTo(14, 52);
    ctx.quadraticCurveTo(14, 42, 12, 35);
    ctx.quadraticCurveTo(8, 22, 20, 18);
    ctx.quadraticCurveTo(32, 22, 28, 35);
    ctx.quadraticCurveTo(26, 42, 26, 52);
    ctx.closePath();
    ctx.fill();

    // Glass rim
    ctx.strokeStyle = isOn ? 'rgba(255,240,200,0.5)' : 'rgba(180,190,200,0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // ── Warm Glow Halo (volumetric light) ──
    if (isOn) {
      const glowR = 36 + brightness * 18;
      const halo = ctx.createRadialGradient(20, 36, 0, 20, 36, glowR);
      halo.addColorStop(0, 'rgba(255, 200, 80, ' + (0.5 * brightness) + ')');
      halo.addColorStop(0.25, 'rgba(255, 170, 50, ' + (0.3 * brightness) + ')');
      halo.addColorStop(0.6, 'rgba(255, 140, 30, ' + (0.1 * brightness) + ')');
      halo.addColorStop(1, 'rgba(255, 120, 20, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(20, 36, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Filament Support Wires ──
    ctx.strokeStyle = isOn ? '#c0a060' : '#888';
    ctx.lineWidth = 0.8;
    // Left support
    ctx.beginPath(); ctx.moveTo(17, 52); ctx.lineTo(16, 38); ctx.lineTo(14, 34); ctx.stroke();
    // Right support
    ctx.beginPath(); ctx.moveTo(23, 52); ctx.lineTo(24, 38); ctx.lineTo(26, 34); ctx.stroke();

    // ── Tungsten Filament (coiled wire) ──
    if (isOn) {
      // Filament glow
      const filGrad = ctx.createLinearGradient(14, 33, 26, 33);
      filGrad.addColorStop(0, 'rgba(255, 255, 220, ' + (0.95 * brightness) + ')');
      filGrad.addColorStop(0.3, 'rgba(255, 200, 100, ' + (0.85 * brightness) + ')');
      filGrad.addColorStop(0.5, 'rgba(255, 255, 240, ' + (1.0 * brightness) + ')');
      filGrad.addColorStop(0.7, 'rgba(255, 200, 100, ' + (0.85 * brightness) + ')');
      filGrad.addColorStop(1, 'rgba(255, 255, 220, ' + (0.95 * brightness) + ')');
      ctx.strokeStyle = filGrad;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = 'rgba(255, 200, 80, ' + (0.9 * brightness) + ')';
      ctx.shadowBlur = 8 + brightness * 10;
    } else {
      ctx.strokeStyle = blown ? '#555' : '#999';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
    }

    // Coiled filament path
    ctx.beginPath();
    ctx.moveTo(14, 34);
    const coils = 6;
    const coilW = 12 / coils;
    for (let i = 0; i < coils; i++) {
      const cx = 15 + i * coilW;
      ctx.lineTo(cx + coilW * 0.25, 31);
      ctx.lineTo(cx + coilW * 0.75, 37);
    }
    ctx.lineTo(26, 34);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Inner Glass Fill Glow ──
    if (isOn) {
      const innerGlow = ctx.createRadialGradient(20, 36, 2, 20, 36, 18);
      innerGlow.addColorStop(0, 'rgba(255, 220, 120, ' + (0.35 * brightness) + ')');
      innerGlow.addColorStop(0.6, 'rgba(255, 180, 60, ' + (0.12 * brightness) + ')');
      innerGlow.addColorStop(1, 'rgba(255, 150, 30, 0)');
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(20, 36, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Specular Glass Highlight ──
    const glare = ctx.createRadialGradient(16, 26, 0, 20, 34, 16);
    glare.addColorStop(0, isOn ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)');
    glare.addColorStop(0.4, isOn ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)');
    glare.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glare;
    ctx.beginPath();
    ctx.arc(20, 36, 18, 0, Math.PI * 2);
    ctx.fill();

    // Top rim highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(20, 32, 10, -Math.PI * 0.8, -Math.PI * 0.2);
    ctx.stroke();

    // Polarity marks
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', 10, 14);
    ctx.fillText('\u2212', 30, 76);

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 46, 86);
    ctx.restore();
  }
});

/*-----------------------------Addressable RGB LED (WS2812B)------------------------------ */

defComp({
  id: 'neopixel',
  name: 'WS2812B NeoPixel',
  category: 'Output',
  icon: '💠',
  desc: 'Addressable RGB LED (WS2812B). Single pixel â€” data pin receives color via NeoPixel library',
  width: 40,   // Scaled from 20 to 40 (2x)
  height: 48,  // Scaled from 24 to 48 (2x)
  defaultProps: { r: 0, g: 0, b: 0, brightness: 255 },
  // interactive: [
  //   { field: 'r', label: 'R', min: 0, max: 255, step: 1, unit: '' },
  //   { field: 'g', label: 'G', min: 0, max: 255, step: 1, unit: '' },
  //   { field: 'b', label: 'B', min: 0, max: 255, step: 1, unit: '' },
  // ],
  pins: [
    // Scaled pin offsets by 2x
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 12, y: 48, side: 'bottom' },
    { id: 'DOUT', label: 'DOut', type: PIN_TYPE.DIGITAL, x: 20, y: 48, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 28, y: 48, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const rs = inst.runtimeState || {};
    const r = rs.r ?? inst.props.r ?? 0;
    const g = rs.g ?? inst.props.g ?? 0;
    const b = rs.b ?? inst.props.b ?? 0;
    const brightness = rs.brightness ?? inst.props.brightness ?? 255;
    const scale = 2; // Scale factor

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale); // Scales all vector drawing, fonts, and borders

    // LED body
    const rgb = `rgb(${Math.round(r * brightness / 255)}, ${Math.round(g * brightness / 255)}, ${Math.round(b * brightness / 255)})`;
    const isOn = r > 0 || g > 0 || b > 0;

    if (isOn) {
      // Glow effect
      ctx.shadowColor = rgb;
      ctx.shadowBlur = 12;
    }

    ctx.fillStyle = isOn ? rgb : '#222';
    roundRect(ctx, 2, 2, 16, 16, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    // LED lens highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(10, 9, 5, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    roundRect(ctx, 2, 2, 16, 16, 3);
    ctx.stroke();

    // Color label
    ctx.fillStyle = '#aaa';
    ctx.font = '4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`R${r}`, 6, 22);
    ctx.fillText(`G${g}`, 10, 22);
    ctx.fillText(`B${b}`, 14, 22);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(6, 18); ctx.lineTo(6, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 18); ctx.lineTo(10, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, 18); ctx.lineTo(14, 24); ctx.stroke();

    // Uses base dimensions because the canvas context is already scaled
    if (inst.selected) drawSelectionRect(ctx, 0, 0, 20, 24);
    ctx.restore();
  }
});

// ==========================================
// 1. NEOPIXEL STRIP (8 LEDs - ENLARGED & BRIGHTENED)
// ==========================================
defComp({
  id: 'neopixel_strip',
  name: 'NeoPixel Strip (8 LED)',
  category: 'Output',
  icon: '✨',
  desc: '8-Pixel WS2812B LED strip with enlarged high-intensity diodes.',
  width: 180,
  height: 48,
  defaultProps: { numPixels: 8, r: 0, g: 0, b: 0, brightness: 255 },
  // interactive: [
  //   { field: 'r', label: 'R', min: 0, max: 255, step: 1, unit: '' },
  //   { field: 'g', label: 'G', min: 0, max: 255, step: 1, unit: '' },
  //   { field: 'b', label: 'B', min: 0, max: 255, step: 1, unit: '' },
  // ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 16, y: 48, side: 'bottom' },
    { id: 'DIN', label: 'DIN', type: PIN_TYPE.DIGITAL, x: 32, y: 48, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 48, y: 48, side: 'bottom' },
    { id: 'DOUT', label: 'DOut', type: PIN_TYPE.DIGITAL, x: 164, y: 48, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const rs = inst.runtimeState || {};
    const brightness = rs.brightness ?? inst.props.brightness ?? 255;
    const numPixels = inst.props.numPixels || 8;

    const pixelColors = rs.pixels || Array(numPixels).fill({
      r: rs.r ?? inst.props.r ?? 0,
      g: rs.g ?? inst.props.g ?? 0,
      b: rs.b ?? inst.props.b ?? 0,
    });

    ctx.save();
    ctx.translate(x, y);

    // PCB Substrate
    ctx.fillStyle = '#1e1e1e';
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 0, 4, 180, 28, 4);
    ctx.fill();
    ctx.stroke();

    // Solder pads
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(4, 8, 4, 4); ctx.fillRect(4, 16, 4, 4); ctx.fillRect(4, 24, 4, 4);
    ctx.fillRect(172, 8, 4, 4); ctx.fillRect(172, 16, 4, 4); ctx.fillRect(172, 24, 4, 4);

    const startX = 16;
    const stepX = 18.5;

    for (let i = 0; i < numPixels; i++) {
      const px = startX + i * stepX;
      const py = 8.5;
      const pix = pixelColors[i] || { r: 0, g: 0, b: 0 };
      const pr = pix.r ?? 0;
      const pg = pix.g ?? 0;
      const pb = pix.b ?? 0;

      const rgb = `rgb(${Math.round(pr * brightness / 255)}, ${Math.round(pg * brightness / 255)}, ${Math.round(pb * brightness / 255)})`;
      const isOn = pr > 0 || pg > 0 || pb > 0;

      // Enlarged LED Housing (15x18)
      ctx.fillStyle = '#2a2a2a';
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.fillRect(px, py, 15, 18);
      ctx.strokeRect(px, py, 15, 18);

      const cx = px + 7.5;
      const cy = py + 9;
      const lensRadius = 6.5; // Enlarged lens radius (was 5)

      // Emissive Chip Surface & Multi-layer Glow
      ctx.save();
      if (isOn) {
        // High-intensity bloom
        ctx.shadowColor = rgb;
        ctx.shadowBlur = 20; // Increased blur for brighter glow
      }
      ctx.fillStyle = isOn ? rgb : '#111';
      ctx.beginPath();
      ctx.arc(cx, cy, lensRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Bright die core highlight when active
      if (isOn) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Outer radial glow bloom
      if (isOn) {
        const glowRadius = 20; // Increased glow radius for more pronounced effect
        const glow = ctx.createRadialGradient(cx, cy, lensRadius * 0.5, cx, cy, glowRadius);
        glow.addColorStop(0, `rgba(${Math.round(pr * brightness / 255)}, ${Math.round(pg * brightness / 255)}, ${Math.round(pb * brightness / 255)}, 0.45)`);
        glow.addColorStop(0.5, `rgba(${Math.round(pr * brightness / 255)}, ${Math.round(pg * brightness / 255)}, ${Math.round(pb * brightness / 255)}, 0.15)`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Lens specular highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(cx - 2.2, cy - 2.2, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Direction arrow
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(88, 30); ctx.lineTo(94, 30); ctx.lineTo(94, 28);
    ctx.lineTo(98, 31); ctx.lineTo(94, 34); ctx.lineTo(94, 32); ctx.lineTo(88, 32);
    ctx.closePath();
    ctx.fill();

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 180, 48);
    ctx.restore();
  }
});

// ==========================================
// 2. NEOPIXEL RING (12 LEDs - ENLARGED & BRIGHTENED)
// ==========================================
defComp({
  id: 'neopixel_ring',
  name: 'NeoPixel Ring (12 LED)',
  category: 'Output',
  icon: '🧿',
  desc: '12-Pixel WS2812B circular LED ring module with enlarged high-intensity diodes.',
  width: 120,
  height: 128,
  defaultProps: { numPixels: 12, r: 0, g: 0, b: 0, brightness: 255 },
  // interactive: [
  //   { field: 'r', label: 'R', min: 0, max: 255, step: 1, unit: '' },
  //   { field: 'g', label: 'G', min: 0, max: 255, step: 1, unit: '' },
  //   { field: 'b', label: 'B', min: 0, max: 255, step: 1, unit: '' },
  // ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 36, y: 128, side: 'bottom' },
    { id: 'DIN', label: 'DIN', type: PIN_TYPE.DIGITAL, x: 52, y: 128, side: 'bottom' },
    { id: 'DOUT', label: 'DOut', type: PIN_TYPE.DIGITAL, x: 68, y: 128, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 84, y: 128, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const rs = inst.runtimeState || {};
    const brightness = rs.brightness ?? inst.props.brightness ?? 255;
    const numPixels = inst.props.numPixels || 12;

    const pixelColors = rs.pixels || Array(numPixels).fill({
      r: rs.r ?? inst.props.r ?? 0,
      g: rs.g ?? inst.props.g ?? 0,
      b: rs.b ?? inst.props.b ?? 0,
    });

    const centerX = 60;
    const centerY = 60;
    const outerRadius = 56;
    const innerRadius = 34;
    const ringRadius = (outerRadius + innerRadius) / 2;

    ctx.save();
    ctx.translate(x, y);

    // PCB Annular Ring Base
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2, false);
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
    ctx.fillStyle = '#1e1e1e';
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Port labels
    ctx.fillStyle = '#666';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IN', centerX - 12, centerY + 28);
    ctx.fillText('OUT', centerX + 12, centerY + 28);

    const lensRadius = 5.5; // Enlarged lens radius (was 4)

    for (let i = 0; i < numPixels; i++) {
      const angle = (i * 2 * Math.PI / numPixels) - (Math.PI / 2);
      const px = centerX + ringRadius * Math.cos(angle);
      const py = centerY + ringRadius * Math.sin(angle);

      const pix = pixelColors[i] || { r: 0, g: 0, b: 0 };
      const pr = pix.r ?? 0;
      const pg = pix.g ?? 0;
      const pb = pix.b ?? 0;

      const rgb = `rgb(${Math.round(pr * brightness / 255)}, ${Math.round(pg * brightness / 255)}, ${Math.round(pb * brightness / 255)})`;
      const isOn = pr > 0 || pg > 0 || pb > 0;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle + Math.PI / 2);

      // Enlarged Package Housing (14x14, was 12x12)
      ctx.fillStyle = '#2b2b2b';
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 0.8;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeRect(-7, -7, 14, 14);

      // Emissive LED Lens & Enhanced Glow
      ctx.save();
      if (isOn) {
        ctx.shadowColor = rgb;
        ctx.shadowBlur = 18; // Increased bloom intensity (was 8)
      }
      ctx.fillStyle = isOn ? rgb : '#111';
      ctx.beginPath();
      ctx.arc(0, 0, lensRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Bright die core highlight when active
      if (isOn) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Specular highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(-1.8, -1.8, 2.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 120, 128);
    ctx.restore();
  }
});

// ==========================================
// 3. NEOPIXEL 8x8 NeoPixel Matrix (64 LEDs)
// ==========================================

defComp({
  id: 'neopixel_8x8_matrix',
  name: '8x8 NeoPixel Matrix',
  category: 'Output',
  icon: '🔳',
  // icon: '🎨',
  desc: '8x8 addressable RGB LED matrix (WS2812B). Features single-wire serial digital control with cascaded DOUT line and 24-bit color depth per pixel.',
  width: 180,
  height: 205,
  defaultProps: {
    brightness: 1.0,
    pixels: null, // Array of 64 hex color strings (e.g. ['#ff0000', ...]); falls back to default pattern if undriven
  },
  interactive: [
    { field: 'brightness', label: 'Brightness', type: 'slider', min: 0.1, max: 1.0, step: 0.05, unit: '', inline: { x: 135, y: 178, w: 38, h: 18 } },
  ],
  pins: [
    { id: '5V', label: '5V', type: PIN_TYPE.POWER, x: 35, y: 195, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 70, y: 195, side: 'bottom' },
    { id: 'DIN', label: 'DIN', type: PIN_TYPE.INPUT, x: 105, y: 195, side: 'bottom' },
    { id: 'DOUT', label: 'DOUT', type: PIN_TYPE.OUTPUT, x: 140, y: 195, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const brightness = Number(inst.runtimeState?.brightness ?? inst.props.brightness ?? 1.0);
    const pixelData = inst.runtimeState?.pixels ?? inst.props.pixels;

    ctx.save();
    ctx.translate(x, y);

    // PCB Base Substrate
    ctx.fillStyle = '#121417';
    roundRect(ctx, 0, 0, 180, 205, 6);
    ctx.fill();

    // Silk Screen Outer Border
    ctx.strokeStyle = '#2a2f35';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 3, 3, 174, 199, 4);
    ctx.stroke();

    // Corner Mounting Holes
    const holes = [[10, 10], [170, 10], [10, 168], [170, 168]];
    holes.forEach(([hx, hy]) => {
      ctx.fillStyle = '#0a0b0d';
      ctx.strokeStyle = '#3a424a';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1c2024';
      ctx.beginPath(); ctx.arc(hx, hy, 2.2, 0, Math.PI * 2); ctx.fill();
    });

    // Silkscreen Header & Labels
    ctx.fillStyle = '#eceff1';
    ctx.font = 'bold 8px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('8x8 NEOPIXEL MATRIX', 90, 13);

    ctx.fillStyle = '#607d8b';
    ctx.font = 'bold 6px "JetBrains Mono", monospace';
    ctx.fillText('WS2812B · 64-RGB LEDS', 90, 21);

    // Matrix Grid Geometry
    const startX = 16;
    const startY = 25;
    const step = 18.5;

    // Render 64 WS2812B 5050 LED Packages
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const index = r * 8 + c;
        const cx = startX + c * step + step / 2;
        const cy = startY + r * step + step / 2;

        // Determine pixel color
        let color = '#000000';
        if (Array.isArray(pixelData) && pixelData[index] !== undefined && pixelData[index] !== null) {
          const px = pixelData[index];
          if (typeof px === 'string') {
            color = px;
          } else if (typeof px === 'number') {
            const r = (px >> 16) & 0xFF, g = (px >> 8) & 0xFF, b = px & 0xFF;
            color = `rgb(${r},${g},${b})`;
          } else if (typeof px === 'object') {
            color = `rgb(${px.r || 0},${px.g || 0},${px.b || 0})`;
          }
        } else {
          // Default standby preview pattern (diagonal gradient) if no active signal buffer
          const hue = ((r + c) / 14) * 360;
          color = `hsl(${hue}, 80%, ${Math.round(20 * brightness)}%)`;
        }

        // White 5050 PLCC-4 Package Frame
        ctx.fillStyle = '#e0e0e0';
        roundRect(ctx, cx - 7.5, cy - 7.5, 15, 15, 2);
        ctx.fill();

        // Package Notch Corner
        ctx.fillStyle = '#bdbdbd';
        ctx.beginPath();
        ctx.moveTo(cx - 7.5, cy - 4.5);
        ctx.lineTo(cx - 4.5, cy - 7.5);
        ctx.lineTo(cx - 7.5, cy - 7.5);
        ctx.fill();

        // Dark Circular Lens Well
        ctx.fillStyle = '#15181c';
        ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, Math.PI * 2); ctx.fill();

        // Central LED Die Base
        ctx.fillStyle = '#263238';
        ctx.fillRect(cx - 2, cy - 2, 4, 4);

        // LED Emission Glow / Lit State
        const isLit = color !== '#000000' && color !== 'black' && brightness > 0;
        if (isLit) {
          const glowGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 10);
          glowGrad.addColorStop(0, '#ffffff');
          glowGrad.addColorStop(0.3, color);
          glowGrad.addColorStop(1, 'transparent');

          ctx.save();
          ctx.globalAlpha = brightness;
          ctx.fillStyle = glowGrad;
          ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();

          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = '#101214';
          ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // Bottom Pad Terminal Blocks & Pin Labels
    const padLocations = [
      { x: 35, label: '5V' },
      { x: 70, label: 'GND' },
      { x: 105, label: 'DIN' },
      { x: 140, label: 'DOUT' }
    ];

    ctx.fillStyle = '#181b1e';
    roundRect(ctx, 20, 175, 140, 22, 3);
    ctx.fill();

    padLocations.forEach(pad => {
      // Solder Pad Rim
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(pad.x, 184, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#08080a';
      ctx.beginPath(); ctx.arc(pad.x, 184, 2.5, 0, Math.PI * 2); ctx.fill();

      // Pin Label
      ctx.fillStyle = '#b0bec5';
      ctx.font = 'bold 6.5px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pad.label, pad.x, 194);
    });

    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -2, -2, 184, 209);
    }
    ctx.restore();
  }
});

/*---------------------MAX7219 8x8 LED matrix display driver (SPI)----------------------- */
defComp({
  id: 'max7219',
  name: 'MAX7219 LED Matrix',
  category: 'Output',
  icon: '▦',
  desc: 'MAX7219 8x8 LED matrix display driver (SPI). Daisy-chainable for scrolling text and animations',
  width: 80,
  height: 100,
  defaultProps: { pattern: 0 },
  interactive: [],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 8, y: 100, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 22, y: 100, side: 'bottom' },
    { id: 'DIN', label: 'DIN', type: PIN_TYPE.DIGITAL, x: 36, y: 100, side: 'bottom' },
    { id: 'CS', label: 'CS', type: PIN_TYPE.DIGITAL, x: 50, y: 100, side: 'bottom' },
    { id: 'CLK', label: 'CLK', type: PIN_TYPE.DIGITAL, x: 64, y: 100, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const rows = inst.runtimeState?._spi?.rows;

    ctx.save();
    ctx.translate(x, y);

    // PCB body
    ctx.fillStyle = '#1a1a2e';
    roundRect(ctx, 0, 0, 80, 88, 4);
    ctx.fill();

    // 8x8 LED matrix
    ctx.fillStyle = '#0a0a0a';
    roundRect(ctx, 8, 8, 64, 64, 2);
    ctx.fill();

    // LED grid
    for (let row = 0; row < 8; row++) {
      const rowData = rows ? rows[row] : 0;
      for (let col = 0; col < 8; col++) {
        const bit = (rowData >> (7 - col)) & 1;
        const lx = 12 + col * 7.5;
        const ly = 12 + row * 7.5;
        ctx.fillStyle = bit ? '#ff3333' : '#1a0a0a';
        ctx.fillRect(lx, ly, 6, 6);
        if (bit) {
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 3;
          ctx.fillRect(lx, ly, 6, 6);
          ctx.shadowBlur = 0;
        }
      }
    }

    // MAX7219 chip
    ctx.fillStyle = '#111';
    roundRect(ctx, 24, 76, 32, 8, 1);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MAX7219', 40, 81);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    [8, 22, 36, 50, 64].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 88); ctx.lineTo(px, 100); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -2, -2, 84, 104);
    ctx.restore();
  }
});

/*-------------------ILI9341 2.4" 240x320 TFT LCD display (SPI)------------------- */
defComp({
  id: 'ili9341',
  name: 'ILI9341 TFT Display',
  category: 'Output',
  icon: '📱',
  desc: 'ILI9341 2.4" 240x320 TFT LCD display (SPI). Full-color with Adafruit_GFX support',
  width: 160,
  height: 140,
  defaultProps: {},
  interactive: [],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 16, y: 140, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 40, y: 140, side: 'bottom' },
    { id: 'CS', label: 'CS', type: PIN_TYPE.DIGITAL, x: 64, y: 140, side: 'bottom' },
    { id: 'DC', label: 'DC', type: PIN_TYPE.DIGITAL, x: 88, y: 140, side: 'bottom' },
    { id: 'MOSI', label: 'MOSI', type: PIN_TYPE.DIGITAL, x: 112, y: 140, side: 'bottom' },
    { id: 'SCK', label: 'SCK', type: PIN_TYPE.DIGITAL, x: 136, y: 140, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const tft = inst.runtimeState?.tft;
    const powered = !!tft?.power;

    ctx.save();
    ctx.translate(x, y);

    // Blue PCB board
    ctx.fillStyle = '#0a2a5e';
    roundRect(ctx, 0, 0, 160, 130, 6);
    ctx.fill();
    ctx.strokeStyle = '#1a4a8e';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4 corner mounting holes
    [[6, 6], [154, 6], [6, 124], [154, 124]].forEach(([hx, hy]) => {
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a2a5e';
      ctx.beginPath(); ctx.arc(hx, hy, 1.8, 0, Math.PI * 2); ctx.fill();
    });

    // Display bezel (black frame)
    ctx.fillStyle = '#111';
    roundRect(ctx, 8, 4, 144, 100, 3);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Screen area â€” render framebuffer or show default blue
    const screenX = 12, screenY = 8, screenW = 136, screenH = 92;

    if (tft && tft.pixels) {
      // Render 240x320 framebuffer scaled to screen
      const fbW = 320, fbH = 240;
      const scaleX = screenW / fbW, scaleY = screenH / fbH;
      const px = tft.pixels;
      for (let fy = 0; fy < fbH; fy++) {
        for (let fx = 0; fx < fbW; fx++) {
          const idx = (fy * fbW + fx) * 3;
          const r = px[idx] || 0, g = px[idx + 1] || 0, b = px[idx + 2] || 0;
          if (r === 0 && g === 0 && b === 0) continue;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(screenX + fx * scaleX, screenY + fy * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
        }
      }
    } else {
      // Default powered-off / idle screen
      ctx.fillStyle = powered ? '#001030' : '#080810';
      ctx.fillRect(screenX, screenY, screenW, screenH);
    }

    // Glass glare
    const glare = ctx.createLinearGradient(screenX, screenY, screenX + screenW, screenY + screenH);
    glare.addColorStop(0, 'rgba(255,255,255,0.06)');
    glare.addColorStop(0.4, 'rgba(255,255,255,0.01)');
    glare.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = glare;
    ctx.fillRect(screenX, screenY, screenW, screenH);

    // Bottom label area
    ctx.fillStyle = '#333';
    roundRect(ctx, 10, 106, 140, 16, 2);
    ctx.fill();
    ctx.fillStyle = '#999';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ILI9341  240x320 TFT', 80, 116);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    [16, 40, 64, 88, 112, 136].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 120); ctx.lineTo(px, 140); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -4, -4, 168, 148);
    ctx.restore();
  }
});

/* ══════════════ CLASS-BASED COMPONENTS ══════════════ */

class Bulb12VComponent extends Component {
  getPins() {
    return [
      { id: 'anode', label: '+', type: PIN_TYPE.PWM, x: 15, y: 0, side: 'top' },
      { id: 'cathode', label: '−', type: PIN_TYPE.GND, x: 15, y: 55, side: 'bottom' },
    ];
  }
  update(canvas) {
    const source = this.getSource('anode');
    const hasGnd = this.hasGround('cathode');
    if (!hasGnd || !source || source.voltage <= 0) {
      this.runtimeState.brightness = 0;
      this.runtimeState.blown = false;
      this.runtimeState._warnedBlown = false;
    } else {
      // Measure path resistance from cathode to ground
      let pathR = 0;
      const engine = this.engine;
      if (engine) {
        const cathodeNet = this.getNet('cathode');
        if (cathodeNet) {
          for (const gnd of cathodeNet.grounds) {
            const r = engine.measureResistance(this.id, 'cathode', gnd.instId, gnd.pinId);
            if (r < Infinity) { pathR = r; break; }
          }
        }
      }
      const vSource = source.voltage;
      this.runtimeState.brightness = Math.max(0, Math.min(1.0, vSource / 12.0));
      if (vSource > 16) {
        this.runtimeState.blown = true;
        this.runtimeState.brightness = 0;
        if (!this.runtimeState._warnedBlown) {
          this.runtimeState._warnedBlown = true;
          if (window.OutputPanel) {
            window.OutputPanel.log(
              `12V Bulb (${this.id}) has blown! Applied voltage: ${vSource.toFixed(1)}V exceeds maximum rating.`,
              'warn'
            );
          }
        }
      } else {
        this.runtimeState.blown = false;
        this.runtimeState._warnedBlown = false;
      }
    }
  }
}
registerComponent('bulb_12v', Bulb12VComponent);

class RGBLEDComponent extends Component {
  getPins() {
    return [
      { id: 'red', label: 'R', type: PIN_TYPE.PWM, x: 6, y: 0, side: 'top' },
      { id: 'green', label: 'G', type: PIN_TYPE.PWM, x: 15, y: 0, side: 'top' },
      { id: 'blue', label: 'B', type: PIN_TYPE.PWM, x: 24, y: 0, side: 'top' },
      { id: 'gnd', label: '−', type: PIN_TYPE.GND, x: 15, y: 70, side: 'bottom' },
    ];
  }
  update(canvas) {
    const hasGnd = this.hasGround('gnd');
    if (!hasGnd) {
      this.runtimeState.r = 0; this.runtimeState.g = 0; this.runtimeState.b = 0;
      this.runtimeState.red = 0; this.runtimeState.green = 0; this.runtimeState.blue = 0;
    } else {
      // Measure path resistance from gnd to ground through the circuit
      let gndPathR = 0;
      const engine = this.engine;
      if (engine) {
        const gndNet = this.getNet('gnd');
        if (gndNet) {
          for (const gnd of gndNet.grounds) {
            const r = engine.measureResistance(this.id, 'gnd', gnd.instId, gnd.pinId);
            if (r < Infinity) { gndPathR = r; break; }
          }
        }
      }
      const traceChannel = (pinId, vf) => {
        const src = this.getSource(pinId);
        if (!src || src.voltage < vf) return 0;
        const rTotal = Math.max(10, gndPathR + 25);
        const i_mA = ((src.voltage - vf) / rTotal) * 1000;
        const norm = Math.max(0, Math.min(1.0, Math.pow(i_mA / 14.0, 0.55)));
        return Math.round(norm * 255);
      };
      this.runtimeState.r = traceChannel('red', 1.8);
      this.runtimeState.g = traceChannel('green', 2.2);
      this.runtimeState.b = traceChannel('blue', 2.8);
      this.runtimeState.red = this.runtimeState.r;
      this.runtimeState.green = this.runtimeState.g;
      this.runtimeState.blue = this.runtimeState.b;
    }
  }
}
registerComponent('rgb_led', RGBLEDComponent);

class BuzzerComponent extends Component {
  getPins() {
    return [
      { id: 'vcc', label: '+', type: PIN_TYPE.DIGITAL, x: 12, y: 50, side: 'bottom' },
      { id: 'gnd', label: '−', type: PIN_TYPE.GND, x: 28, y: 50, side: 'bottom' },
    ];
  }
  update(canvas) {
    const source = this.getSource('vcc');
    const hasGnd = this.hasGround('gnd');
    this.runtimeState.active = source && source.voltage > 1.5 && hasGnd;
  }
}
registerComponent('buzzer', BuzzerComponent);
