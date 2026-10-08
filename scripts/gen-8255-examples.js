/* One-off generator for the two new 8255 example circuits. Run once, then delete. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EX = path.join(ROOT, 'Examples');

const wire = (id, fromInst, fromPin, toInst, toPin) => ({
  id,
  from: { instId: fromInst, pinId: fromPin },
  to: { instId: toInst, pinId: toPin },
  color: null,
  waypoints: [],
  routeStyle: 'orthogonal',
  bezierCtrl: null,
});

const comp = (id, type, x, y, props) => ({
  id, type, x, y, rotation: 0, props: props || {},
});

/* ── 1. 8255 PPI LED Demo (manual mode) ─────────────────────────────── */
{
  const CHIP = 'u1_8255', ARR_A = 'arrA', ARR_B = 'arrB', ARR_C = 'arrC';
  const V5 = 'v5', GND = 'gnd';

  const components = [
    comp(CHIP, 'ic_8255', 320, 150, {
      label: '8255', busMode: 'manual',
      modeA: '0', modeB: '0', dirA: 'out', dirB: 'out',
      dirCupper: 'out', dirClower: 'out',
      paValue: 0xAA, pbValue: 0x0F, pcValue: 0xC3,
    }),
    comp(ARR_A, 'multi_led_array', 90, 250, { label: 'PORT A' }),
    comp(ARR_B, 'multi_led_array', 600, 250, { label: 'PORT B' }),
    comp(ARR_C, 'multi_led_array', 320, 470, { label: 'PORT C' }),
    comp(V5, 'power_5v', 700, 400, {}),
    comp(GND, 'power_gnd', 260, 430, {}),
  ];

  const wires = [];
  for (let i = 0; i < 8; i++) {
    wires.push(wire(`w_pa${i}`, CHIP, `PA${i}`, ARR_A, `l${i + 1}`));
    wires.push(wire(`w_pb${i}`, CHIP, `PB${i}`, ARR_B, `l${i + 1}`));
    wires.push(wire(`w_pc${i}`, CHIP, `PC${i}`, ARR_C, `l${i + 1}`));
  }
  wires.push(wire('w_vcc', CHIP, 'VCC', V5, 'vcc'));
  wires.push(wire('w_gnd', CHIP, 'GND', GND, 'gnd'));
  wires.push(wire('w_arrA_gnd', ARR_A, 'gnd', GND, 'gnd'));
  wires.push(wire('w_arrB_gnd', ARR_B, 'gnd', GND, 'gnd'));
  wires.push(wire('w_arrC_gnd', ARR_C, 'gnd', GND, 'gnd'));

  const example = {
    id: '8255_ppi_led_demo',
    name: '8255 PPI LED Demo',
    icon: '\u{1f5a5}',
    desc: 'Intel 8255 PPI in manual mode: all three ports are configured as Mode 0 outputs and drive an 8-LED array each. Set the Port A/B/C direction and value controls in the Properties panel — an input port stops driving its pins and samples whatever is wired to them instead. Control word 0x80 = all outputs.',
    tags: ['8255', 'ppi', 'led', 'digital-ic'],
    circuit: { components, wires },
    code: '/*\n * 8255 PPI LED Demo\n *\n * No CPU in this circuit — the 8255 is in Bus Mode "Manual", so the\n * properties panel is the "processor".\n *\n *   8255 PA0-PA7 -> 8-LED array (Port A)\n *   8255 PB0-PB7 -> 8-LED array (Port B)\n *   8255 PC0-PC7 -> 8-LED array (Port C)\n *   8255 VCC -> 5V, 8255 GND -> GND\n *   /CS /RD /WR left unconnected (only used in External bus mode)\n *\n * Press Run, then open Properties and try:\n *   - Port A Value = 0xAA (10101010) — alternating pattern\n *   - Port B Direction = Input      — the array goes dark, the port now\n *                                     samples the wire instead of driving it\n *   - Port A Mode = 2               — bidirectional bus mode on Port A\n *\n * Control word = 1 D7 D6 D5 D4 D3 D2 D1 D0\n *   D7      = 1 (mode set flag)\n *   D6,D5   = Port A mode (00 = Mode 0)\n *   D4      = Port A direction (1 = input)\n *   D3      = Port C upper direction (1 = input)\n *   D2      = Port B mode (0 = Mode 0)\n *   D1      = Port B direction (1 = input)\n *   D0      = Port C lower direction (1 = input)\n *   0x80 = all outputs, 0x9B = all inputs.\n */\n',
  };
  fs.writeFileSync(path.join(EX, '8255_ppi_led_demo.json'), JSON.stringify(example, null, 2), 'utf8');
  console.log('wrote 8255_ppi_led_demo.json  (' + components.length + ' components, ' + wires.length + ' wires)');
}

/* ── 2. 8255 PPI + 8085 external bus ────────────────────────────────── */
{
  const CPU = 'cpu8085', CHIP = 'u1_8255', ARR = 'arrA';
  const V5 = 'v5', GND = 'gnd';

  const components = [
    comp(CPU, 'intel_8085', 120, 180, { label: '8085' }),
    comp(CHIP, 'ic_8255', 700, 180, {
      label: '8255', busMode: 'external',
      modeA: '0', modeB: '0', dirA: 'out', dirB: 'out',
      dirCupper: 'out', dirClower: 'out',
      paValue: 0, pbValue: 0, pcValue: 0,
    }),
    comp(ARR, 'multi_led_array', 700, 520, { label: 'PORT A' }),
    comp(V5, 'power_5v', 1010, 460, {}),
    comp(GND, 'power_gnd', 640, 460, {}),
  ];

  const wires = [];
  /* PA0-7 of the 8085 act as the data bus D0-D7 */
  for (let i = 0; i < 8; i++) {
    wires.push(wire(`w_db${i}`, CPU, `PA.${i}`, CHIP, `D${i}`));
  }
  /* PB0..PB3 = A0, A1, /RD ; PB7 = /WR  (WR is the highest bit so A0/A1/RD
     have already settled by the time its falling edge is seen) */
  wires.push(wire('w_a0', CPU, 'PB.0', CHIP, 'A0'));
  wires.push(wire('w_a1', CPU, 'PB.1', CHIP, 'A1'));
  wires.push(wire('w_rd', CPU, 'PB.2', CHIP, 'RD'));
  wires.push(wire('w_wr', CPU, 'PB.7', CHIP, 'WR'));
  /* Chip select tied low: the 8255 is the only device on this bus */
  wires.push(wire('w_cs', CHIP, 'CS', GND, 'gnd'));
  /* Port A of the 8255 drives the LED array */
  for (let i = 0; i < 8; i++) {
    wires.push(wire(`w_pa${i}`, CHIP, `PA${i}`, ARR, `l${i + 1}`));
  }
  wires.push(wire('w_arr_gnd', ARR, 'gnd', GND, 'gnd'));
  wires.push(wire('w_cpu_vcc', CPU, 'VCC', V5, 'vcc'));
  wires.push(wire('w_cpu_gnd', CPU, 'GND', GND, 'gnd'));
  wires.push(wire('w_chip_vcc', CHIP, 'VCC', V5, 'vcc'));
  wires.push(wire('w_chip_gnd', CHIP, 'GND', GND, 'gnd'));

  const asm = [
    '; ---------------------------------------------------------------',
    '; 8085 + 8255 PPI over a bit-banged external bus',
    ';',
    ';   8085 PA0-PA7  ->  8255 D0-D7   (data bus)',
    ';   8085 PB0      ->  8255 A0      (register select bit 0)',
    ';   8085 PB1      ->  8255 A1      (register select bit 1)',
    ';   8085 PB2      ->  8255 /RD     (read strobe)',
    ';   8085 PB7      ->  8255 /WR     (write strobe)',
    ';   8255 /CS      ->  GND          (always selected)',
    ';   8255 PA0-PA7  ->  8-LED array',
    ';',
    '; Port B control byte:',
    ';   bit7 = /WR   bit2 = /RD   bit1 = A1   bit0 = A0',
    ';   idle   = 84H | addr    (WR=1, RD=1)',
    ';   write  = 44H | addr    (WR=0, RD=1)',
    ';   read   = 80H | addr    (WR=1, RD=0)',
    ';',
    '; A1A0: 00 = Port A   01 = Port B   10 = Port C   11 = control word',
    '; ---------------------------------------------------------------',
    '',
    '        MVI A, 80H      ; control word: A/B/C all Mode 0 outputs',
    '        OUT 00H         ; data bus <- 80H',
    '        MVI A, 87H      ; idle, A1A0 = 11b (control word register)',
    '        OUT 01H',
    '        MVI A, 47H      ; /WR low -> latch 80H into the CWR',
    '        OUT 01H',
    '        MVI A, 87H      ; release /WR',
    '        OUT 01H',
    '',
    'LOOP:   MVI A, AAH      ; 10101010 pattern',
    '        OUT 00H         ; data bus <- AAh',
    '        MVI A, 84H      ; idle, A1A0 = 00b (Port A)',
    '        OUT 01H',
    '        MVI A, 44H      ; /WR low -> Port A <- AAh',
    '        OUT 01H',
    '        MVI A, 84H      ; release /WR',
    '        OUT 01H',
    '',
    '        MVI A, 55H      ; 01010101 pattern',
    '        OUT 00H',
    '        MVI A, 84H',
    '        OUT 01H',
    '        MVI A, 44H      ; /WR low -> Port A <- 55H',
    '        OUT 01H',
    '        MVI A, 84H',
    '        OUT 01H',
    '',
    '        JMP LOOP        ; keep blinking',
    '',
  ].join('\n');

  const example = {
    id: '8255_ppi_8085_bus',
    name: '8255 PPI 8085 Bus',
    icon: '\u{1f4a5}',
    desc: 'An Intel 8085 drives an Intel 8255 PPI over a bit-banged external bus: PA0-PA7 carry D0-D7, PB0/PB1 select the register, PB2 is /RD and PB7 is /WR, with /CS tied to GND. The program writes the control word 0x80 (all ports Mode 0 outputs) and then blinks Port A between AAh and 55h.',
    tags: ['8255', '8085', 'ppi', 'bus', 'microprocessor'],
    circuit: { components, wires },
    files: { 'sketch.asm': asm },
  };
  fs.writeFileSync(path.join(EX, '8255_ppi_8085_bus.json'), JSON.stringify(example, null, 2), 'utf8');
  console.log('wrote 8255_ppi_8085_bus.json  (' + components.length + ' components, ' + wires.length + ' wires)');
}
