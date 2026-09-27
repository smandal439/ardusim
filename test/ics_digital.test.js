/**
 * test/ics_digital.test.js — Digital ICs panel flattening + new ICs:
 *   - catalog: Digital ICs has no inner dropdown, flat id list complete
 *   - defs/classes registered for 74HC02, 74HC86, 74HC139, 74HC153, 74HC164, 74HC4017
 *   - real pinouts (def pins === class pins, datasheet order)
 *   - logic: NOR/XOR truth tables, decoder one-hot, MUX select, shift register,
 *     decade counter with clock inhibit/reset/carry
 *   - draw() smoke test for each new def
 *   - example circuits: wire endpoints resolve to real component pins
 * Run: npx vitest run test/ics_digital.test.js
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* Minimal browser-like globals (same pattern as test/tm1637.test.js) */
global.window = {
  ArduinoLibs: {},
  ArduinoComponents: { COMPONENT_DEFS: {} },
  CircuitCanvas: null,
  EXAMPLE_SKETCHES: [],
  addEventListener() {},
  removeEventListener() {},
};
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  createElement: () => ({ style: {}, getContext: () => null, appendChild() {} }),
  addEventListener() {},
  removeEventListener() {},
};
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};

function loadScripts(files, names) {
  const code = files.map(readSrc).join('\n;\n');
  const fn = new Function('window', 'document',
    code + '\n;return {' + names.map(n => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ') + '};');
  return fn(global.window, global.document);
}

const { COMPONENT_CATALOG, COMPONENT_DEFS, getComponentClass, createComponent, PIN_TYPE } = loadScripts([
  'js/components/base.js',
  'js/components/power.js',
  'js/components/function_generator.js',
  'js/components/probe.js',
  'js/components/ics.js',
  'js/components/ic_8255.js',
], ['COMPONENT_CATALOG', 'COMPONENT_DEFS', 'getComponentClass', 'createComponent', 'PIN_TYPE']);

const NEW_IDS = ['ic_74hc02', 'ic_74hc86', 'ic_74hc139', 'ic_74hc153', 'ic_74hc164', 'ic_74hc4017'];
const ALL_IDS = ['ic_555', 'ic_74hc00', 'ic_74hc02', 'ic_74hc04', 'ic_74hc08', 'ic_74hc32', 'ic_74hc86',
  'ic_74hc74', 'ic_74hc47', 'ic_74hc138', 'ic_74hc139', 'ic_74hc148', 'ic_74hc153', 'ic_74hc164',
  'ic_74hc165', 'ic_74hc193', 'ic_74hc245', 'ic_74hc595', 'ic_74hc4017', 'ic_8255', 'lm741'];
const EXPECT_PINS = { ic_74hc02: 14, ic_74hc86: 14, ic_74hc139: 16, ic_74hc153: 16, ic_74hc164: 14, ic_74hc4017: 16 };

const EXAMPLE_FILES = [
  '7402_test_with_logic_analyzer.json',
  '7486_test_with_logic_analyzer.json',
  '74139_test_with_logic_analyzer.json',
  '74153_test_with_logic_analyzer.json',
  '74164_test_with_logic_analyzer.json',
  '4017_test_with_logic_analyzer.json',
];

/* ── simulation stubs ─────────────────────────────────────── */
function installSim() {
  global.window.ArduinoSim = {
    pinStates: {},
    voltages: {},
    getPinVoltage(inst, pinId) { return this.voltages[pinId] || 0; },
  };
  return global.window.ArduinoSim;
}

function makeIC(type) {
  const comp = createComponent({ id: `t_${type}`, type, x: 0, y: 0, rotation: 0, props: {} });
  expect(comp, `createComponent(${type})`).toBeTruthy();
  comp.getConnectedPinNum = () => null; // drive every input via getPinVoltage
  return comp;
}

function pinCtx() {
  return new Proxy({}, {
    get(_, prop) {
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop() {} });
      return () => {};
    },
    set: () => true,
  });
}

/* ═══════════════ catalog / registration ═══════════════ */
describe('Digital ICs component panel', () => {
  const group = COMPONENT_CATALOG.find(g => g.category === 'Digital ICs');

  it('has no inner dropdown menu (flattened)', () => {
    expect(group).toBeTruthy();
    expect(group.dropdown).toBeUndefined();
  });

  it('lists all 21 ICs as flat items', () => {
    expect(group.ids).toEqual(ALL_IDS);
    for (const id of ALL_IDS) {
      expect(COMPONENT_DEFS[id], `def ${id}`).toBeTruthy();
      expect(COMPONENT_DEFS[id].category, `category ${id}`).toBe('Digital ICs');
    }
  });

  it('Instruments probe dropdown is untouched', () => {
    const inst = COMPONENT_CATALOG.find(g => g.category === 'Instruments');
    expect(inst.dropdown).toBeTruthy();
    expect(inst.dropdown.id).toBe('probe');
  });
});

describe('new IC registration', () => {
  for (const id of NEW_IDS) {
    it(`${id}: def + registered class + identical pins`, () => {
      const def = COMPONENT_DEFS[id];
      expect(def).toBeTruthy();
      expect(def.pins.length).toBe(EXPECT_PINS[id]);
      const Cls = getComponentClass(id);
      expect(Cls, `class ${id}`).toBeTruthy();
      const clsPins = Cls.prototype.getPins().map(p => p.id);
      const defPins = def.pins.map(p => p.id);
      expect(clsPins).toEqual(defPins);
      // unique pin ids
      expect(new Set(defPins).size).toBe(defPins.length);
      // VCC/GND present
      expect(defPins).toContain('VCC');
      expect(defPins).toContain('GND');
      expect(def.pins.find(p => p.id === 'VCC').type).toBe(PIN_TYPE.POWER);
      expect(def.pins.find(p => p.id === 'GND').type).toBe(PIN_TYPE.GND);
    });
  }

  it('datasheet pin order spot checks', () => {
    const pins = id => COMPONENT_DEFS[id].pins;
    // 74HC02: pin1=Y1 (output-first layout)
    expect(pins('ic_74hc02')[0].id).toBe('Y1');
    expect(pins('ic_74hc02').map(p => p.id)).toEqual(['Y1', 'A1', 'B1', 'Y2', 'A2', 'B2', 'GND', 'VCC', 'Y4', 'B4', 'A4', 'Y3', 'B3', 'A3']);
    // 74HC86: standard family layout
    expect(pins('ic_74hc86').map(p => p.id)).toEqual(['A1', 'B1', 'Y1', 'A2', 'B2', 'Y2', 'GND', 'VCC', 'B4', 'A4', 'Y4', 'B3', 'A3', 'Y3']);
    // 74HC139: 16-pin, E1 pin1, GND pin8, VCC pin16
    expect(pins('ic_74hc139')[0].id).toBe('E1');
    expect(pins('ic_74hc139')[7].id).toBe('GND');
    expect(pins('ic_74hc139')[8].id).toBe('VCC');
    expect(pins('ic_74hc139')[15].id).toBe('Y3_2');
    // 74HC153: S0 on pin 14 (top row x=34)
    expect(pins('ic_74hc153').find(p => p.id === 'S0').x).toBe(34);
    expect(pins('ic_74hc153').find(p => p.id === 'S0').side).toBe('top');
    // 74HC164: CP pin 8, MR pin 9
    expect(pins('ic_74hc164').find(p => p.id === 'CP').side).toBe('top');
    expect(pins('ic_74hc164').find(p => p.id === 'MR').side).toBe('top');
    // 74HC4017: 16-pin with Q0-Q9 + carry
    const ids = pins('ic_74hc4017').map(p => p.id);
    for (let i = 0; i < 10; i++) expect(ids).toContain(`Q${i}`);
    expect(ids).toContain('Q59');
    expect(ids).toContain('CP0');
    expect(ids).toContain('CP1');
    expect(ids).toContain('MR');
  });
});

/* ═══════════════ logic ═══════════════ */
describe('74HC02 quad NOR logic', () => {
  const table = [[0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 1, 0]];
  for (const [a, b, y] of table) {
    it(`1Y = NOR(${a},${b}) = ${y}`, () => {
      const sim = installSim();
      const ic = makeIC('ic_74hc02');
      sim.voltages = { A1: a, B1: b };
      ic.update(null);
      expect(ic.runtimeState.Y1 ? 1 : 0).toBe(y);
    });
  }
  it('writes output to connected arduino pin', () => {
    const sim = installSim();
    const ic = makeIC('ic_74hc02');
    ic.getConnectedPinNum = (id) => (id === 'Y1' ? 7 : null);
    sim.voltages = { A1: 0, B1: 0 };
    ic.update(null);
    expect(sim.pinStates.pin_7).toBe(255);
  });
});

describe('74HC86 quad XOR logic', () => {
  const table = [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]];
  for (const [a, b, y] of table) {
    it(`1Y = XOR(${a},${b}) = ${y}`, () => {
      const sim = installSim();
      const ic = makeIC('ic_74hc86');
      sim.voltages = { A1: a, B1: b };
      ic.update(null);
      expect(ic.runtimeState.Y1 ? 1 : 0).toBe(y);
    });
  }
});

describe('74HC139 dual 2-to-4 decoder', () => {
  it('disabled (E HIGH) forces all outputs HIGH', () => {
    const sim = installSim();
    const ic = makeIC('ic_74hc139');
    sim.voltages = { E1: 1, A0_1: 1, A1_1: 1 };
    ic.update(null);
    for (const y of ['Y0_1', 'Y1_1', 'Y2_1', 'Y3_1']) expect(ic.runtimeState[y]).toBe(255);
  });

  it('enabled: one-hot active-LOW output per select code', () => {
    const sim = installSim();
    const ic = makeIC('ic_74hc139');
    const ys = ['Y0_1', 'Y1_1', 'Y2_1', 'Y3_1'];
    for (let sel = 0; sel < 4; sel++) {
      sim.voltages = { E1: 0, A0_1: sel & 1, A1_1: (sel >> 1) & 1 };
      ic.update(null);
      ys.forEach((y, i) => expect(ic.runtimeState[y], `sel=${sel} ${y}`).toBe(i === sel ? 0 : 255));
    }
  });

  it('second decoder unit is independent', () => {
    const sim = installSim();
    const ic = makeIC('ic_74hc139');
    sim.voltages = { E2: 0, A0_2: 1, A1_2: 0, E1: 0, A0_1: 0, A1_1: 0 };
    ic.update(null);
    expect(ic.runtimeState.Y1_2).toBe(0);
    expect(ic.runtimeState.Y0_1).toBe(0);
    expect(ic.runtimeState.Y1_1).toBe(255);
  });
});

describe('74HC153 dual 4-input mux', () => {
  function setup(v) {
    const sim = installSim();
    const ic = makeIC('ic_74hc153');
    sim.voltages = Object.assign({ I0_1: 1, I1_1: 0, I2_1: 1, I3_1: 0, S0: 0, S1: 0, E1: 0 }, v);
    ic.update(null);
    return ic;
  }

  it('routes selected input to output (1/0/1/0 pattern)', () => {
    expect(setup({ S0: 0, S1: 0 }).runtimeState.Y1).toBe(255); // I0
    expect(setup({ S0: 1, S1: 0 }).runtimeState.Y1).toBe(0);   // I1
    expect(setup({ S0: 0, S1: 1 }).runtimeState.Y1).toBe(255); // I2
    expect(setup({ S0: 1, S1: 1 }).runtimeState.Y1).toBe(0);   // I3
  });

  it('disabled (E HIGH) forces output LOW', () => {
    expect(setup({ E1: 1, S0: 0, S1: 0 }).runtimeState.Y1).toBe(0);
  });

  it('second mux unit has independent enable and inputs', () => {
    const ic = setup({ E1: 1, E2: 0, I0_2: 1, I1_2: 1, I2_2: 1, I3_2: 1, S0: 0, S1: 0 });
    expect(ic.runtimeState.Y1).toBe(0);
    expect(ic.runtimeState.Y2).toBe(255);
  });

  it('exposes select state for the indicator dots', () => {
    const ic = setup({ S0: 1, S1: 0 });
    expect(ic.runtimeState.S0).toBe(255);
    expect(ic.runtimeState.S1).toBe(0);
  });
});

describe('74HC164 serial-in shift register', () => {
  function tick(ic, cp) {
    const sim = global.window.ArduinoSim;
    sim.voltages.CP = cp;
    ic.update(null);
  }

  it('/MR LOW asynchronously clears all outputs', () => {
    const sim = installSim();
    const ic = makeIC('ic_74hc164');
    sim.voltages = { MR: 1, DSA: 1, DSB: 1, CP: 0 };
    tick(ic, 0); tick(ic, 1); // shift a 1 in
    expect(ic.runtimeState.Q0).toBe(255);
    sim.voltages.MR = 0;
    ic.update(null);
    for (let i = 0; i < 8; i++) expect(ic.runtimeState[`Q${i}`]).toBe(0);
  });

  it('shifts a HIGH bit in on each rising clock edge', () => {
    const sim = installSim();
    const ic = makeIC('ic_74hc164');
    sim.voltages = { MR: 1, DSA: 1, DSB: 1, CP: 0 };
    ic.update(null);
    tick(ic, 1); // rising edge → Q0 = 1
    expect(ic.runtimeState.Q0).toBe(255);
    expect(ic.runtimeState.Q1).toBe(0);
    tick(ic, 0); tick(ic, 1); // next rising edge → 1 moves to Q1
    expect(ic.runtimeState.Q0).toBe(255); // still shifting 1s in
    expect(ic.runtimeState.Q1).toBe(255);
  });

  it('data inputs are ANDed (DSA=1, DSB=0 shifts a 0)', () => {
    const sim = installSim();
    const ic = makeIC('ic_74hc164');
    sim.voltages = { MR: 1, DSA: 1, DSB: 1, CP: 0 };
    ic.update(null);
    tick(ic, 1); // Q0 = 1
    sim.voltages.DSB = 0;
    tick(ic, 0); tick(ic, 1);
    expect(ic.runtimeState.Q1).toBe(255); // previous 1 moved
    expect(ic.runtimeState.Q0).toBe(0);   // ANDed input = 0
  });

  it('no shift while clock stays HIGH (edge-triggered only)', () => {
    const sim = installSim();
    const ic = makeIC('ic_74hc164');
    sim.voltages = { MR: 1, DSA: 1, DSB: 1, CP: 0 };
    ic.update(null);
    tick(ic, 1);
    const before = ic.runtimeState.bits;
    ic.update(null); ic.update(null); // CP still HIGH
    expect(ic.runtimeState.bits).toBe(before);
  });
});

describe('74HC4017 decade counter', () => {
  function edge(ic, level) {
    global.window.ArduinoSim.voltages.CP0 = level;
    ic.update(null);
  }

  it('MR HIGH resets to count 0 (Q0 one-hot)', () => {
    const sim = installSim();
    const ic = makeIC('ic_74hc4017');
    sim.voltages = { MR: 1, CP0: 0, CP1: 0 };
    ic.update(null);
    expect(ic.runtimeState.count).toBe(0);
    expect(ic.runtimeState.Q0).toBe(255);
    expect(ic.runtimeState.Q59).toBe(255); // carry HIGH during 0-4
  });

  it('advances one-hot on each CP0 rising edge', () => {
    const sim = installSim();
    const ic = makeIC('ic_74hc4017');
    sim.voltages = { MR: 1, CP0: 0, CP1: 0 };
    ic.update(null);
    sim.voltages.MR = 0;
    for (let step = 1; step <= 12; step++) {
      edge(ic, 0); edge(ic, 1);
      expect(ic.runtimeState.count, `step ${step}`).toBe(step % 10);
      let high = 0;
      for (let i = 0; i < 10; i++) if (ic.runtimeState[`Q${i}`] === 255) high++;
      expect(high, `one-hot at step ${step}`).toBe(1);
    }
  });

  it('CP1 HIGH inhibits counting', () => {
    const sim = installSim();
    const ic = makeIC('ic_74hc4017');
    sim.voltages = { MR: 1, CP0: 0, CP1: 1 };
    ic.update(null);
    sim.voltages.MR = 0;
    edge(ic, 0); edge(ic, 1);
    expect(ic.runtimeState.count).toBe(0);
  });

  it('Q5-9 carry goes LOW while counting 5-9', () => {
    const sim = installSim();
    const ic = makeIC('ic_74hc4017');
    sim.voltages = { MR: 1, CP0: 0, CP1: 0 };
    ic.update(null);
    sim.voltages.MR = 0;
    for (let step = 1; step <= 5; step++) { edge(ic, 0); edge(ic, 1); }
    expect(ic.runtimeState.count).toBe(5);
    expect(ic.runtimeState.Q59).toBe(0);
    for (let step = 6; step <= 10; step++) { edge(ic, 0); edge(ic, 1); }
    expect(ic.runtimeState.count).toBe(0);
    expect(ic.runtimeState.Q59).toBe(255);
  });

  it('falling edge on CP1 advances while CP0 is HIGH', () => {
    const sim = installSim();
    const ic = makeIC('ic_74hc4017');
    sim.voltages = { MR: 1, CP0: 1, CP1: 1 };
    ic.update(null);
    sim.voltages.MR = 0;
    ic.update(null); // settle with MR low, CP1 high
    sim.voltages.CP1 = 0;
    ic.update(null); // falling edge on CP1, CP0 HIGH → count
    expect(ic.runtimeState.count).toBe(1);
  });
});

/* ═══════════════ draw smoke ═══════════════ */
describe('new IC draw()', () => {
  for (const id of NEW_IDS) {
    it(`${id} draws without throwing`, () => {
      const def = COMPONENT_DEFS[id];
      const ctx = pinCtx();
      const rs = {};
      const states = id === 'ic_74hc139' ? ['Y0_1', 'Y1_2'] :
        id === 'ic_74hc153' ? ['S0', 'Y2'] :
          id === 'ic_74hc164' ? ['Q0', 'Q7'] :
            id === 'ic_74hc4017' ? ['Q0', 'Q9'] : [];
      for (const s of states) rs[s] = 255;
      expect(() => def.draw(ctx, { x: 10, y: 20, runtimeState: rs, selected: true }, null)).not.toThrow();
      expect(() => def.draw(ctx, { x: 0, y: 0, runtimeState: {}, selected: false }, null)).not.toThrow();
    });
  }
});

/* ═══════════════ example circuits ═══════════════ */
describe('digital IC example circuits', () => {
  for (const file of EXAMPLE_FILES) {
    it(`${file} — valid components and wire endpoints`, () => {
      const ex = JSON.parse(readSrc(path.join('Examples', file)));
      expect(ex.id).toBe(file.replace('.json', ''));
      expect(ex.circuit.components.length).toBeGreaterThan(3);
      expect(ex.circuit.wires.length).toBeGreaterThan(3);
      const types = Object.fromEntries(ex.circuit.components.map(c => [c.id, c.type]));
      for (const [, type] of Object.entries(types)) {
        expect(COMPONENT_DEFS[type], `${file}: def for ${type}`).toBeTruthy();
      }
      for (const w of ex.circuit.wires) {
        for (const end of [w.from, w.to]) {
          const type = types[end.instId];
          expect(type, `${file}: wire ${w.id} instance ${end.instId}`).toBeTruthy();
          const def = COMPONENT_DEFS[type];
          const Cls = getComponentClass(type);
          const defPinIds = (def.pins || []).map(p => p.id);
          const clsPinIds = Cls ? Cls.prototype.getPins().map(p => p.id) : defPinIds;
          expect(defPinIds.includes(end.pinId) || clsPinIds.includes(end.pinId),
            `${file}: ${type}.${end.pinId}`).toBe(true);
        }
      }
      // ICs must be powered in every example
      const icType = ex.circuit.components.find(c => c.type.startsWith('ic_'))?.type;
      expect(icType).toBeTruthy();
      const icId = ex.circuit.components.find(c => c.type === icType).id;
      const icPins = ex.circuit.wires.filter(w => w.from.instId === icId || w.to.instId === icId).map(w =>
        w.from.instId === icId ? w.from.pinId : w.to.pinId);
      expect(icPins).toContain('VCC');
      expect(icPins).toContain('GND');
    });
  }

  it('examples are registered in the loader fallback list', () => {
    const simSrc = readSrc('js/simulator.js');
    for (const file of EXAMPLE_FILES) {
      const id = file.replace('.json', '');
      expect(simSrc.includes(`'${id}'`), `fallback list has ${id}`).toBe(true);
    }
  });

  it('examples are present in built examples-data', () => {
    const dataSrc = readSrc('js/examples-data.js');
    for (const file of EXAMPLE_FILES) {
      const id = file.replace('.json', '');
      expect(dataSrc.includes(`"${id}"`) || dataSrc.includes(`'${id}'`), `examples-data has ${id}`).toBe(true);
    }
  });
});
