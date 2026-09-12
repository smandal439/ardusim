/* ═══════════════════════════════════════════════════════
   js/electrical.js — Electrical Connection Engine
   Circuit graph builder, net tracer, voltage/current solver.
   ═══════════════════════════════════════════════════════ */

'use strict';

/**
 * Net — a set of electrically connected pins sharing the same voltage.
 */
class Net {
  constructor(id) {
    this.id = id;
    /** @type {Map<string,{instId:string, pinId:string}>} pinId → { instId, pinId } */
    this.pins = new Map();
    /** @type {{voltage:number, type:string, resistance:number, rawVal?:number}[]} */
    this.sources = [];
    /** @type {{instId:string, pinId:string, resistance:number}[]} */
    this.grounds = [];
    /** Resolved voltage for this net */
    this.voltage = 0;
    /** Total equivalent resistance to ground */
    this.resistanceToGround = Infinity;
  }

  addPin(instId, pinId) {
    this.pins.set(`${instId}:${pinId}`, { instId, pinId });
  }

  hasPin(instId, pinId) {
    return this.pins.has(`${instId}:${pinId}`);
  }
}

/**
 * ElectricalEngine — builds circuit graph and solves voltages.
 *
 * Usage:
 *   const engine = new ElectricalEngine(components, wires);
 *   engine.solve();
 *   const net = engine.getNetForPin('comp_1', 'anode');
 *   console.log(net.voltage);
 */
class ElectricalEngine {
  constructor() {
    /** @type {import('./components/base').Component[]} */
    this.components = [];
    /** @type {{from:{instId:string,pinId:string}, to:{instId:string,pinId:string}}[]} */
    this.wires = [];
    /** @type {Map<string,Net>} netKey → Net */
    this.nets = new Map();
    /** @type {Map<string,Net>} "instId:pinId" → Net */
    this.pinToNet = new Map();
    /** Ground net reference */
    this.groundNet = null;
  }

  /* ═══════════════ GRAPH CONSTRUCTION ═══════════════ */

  /**
   * Build the circuit graph from components and wires.
   * Call this whenever the circuit changes.
   */
  buildGraph(components, wires) {
    this.components = components || [];
    this.wires = wires || [];
    this.nets.clear();
    this.pinToNet.clear();
    this.groundNet = null;

    // 1. Union-Find to group connected pins into nets
    const parent = new Map();
    const find = (key) => {
      if (!parent.has(key)) parent.set(key, key);
      let root = key;
      while (parent.get(root) !== root) root = parent.get(root);
      // Path compression
      let curr = key;
      while (curr !== root) { const next = parent.get(curr); parent.set(curr, root); curr = next; }
      return root;
    };
    const union = (a, b) => {
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    };

    // Register all component pins
    const { COMPONENT_DEFS } = window.ArduinoComponents || {};
    for (const inst of this.components) {
      const def = COMPONENT_DEFS && COMPONENT_DEFS[inst.type];
      if (!def || !def.pins) continue;
      for (const pin of def.pins) {
        const key = `${inst.id}:${pin.id}`;
        find(key); // ensure it exists
      }
    }

    // Union pins connected by wires
    for (const wire of this.wires) {
      const a = `${wire.from.instId}:${wire.from.pinId}`;
      const b = `${wire.to.instId}:${wire.to.pinId}`;
      union(a, b);
    }

    // Union pins connected through component internals
    for (const inst of this.components) {
      const connections = this._getInternalConnections(inst);
      for (const [a, b] of connections) {
        union(a, b);
      }
    }

    // 2. Build Net objects from union-find groups
    const groups = new Map(); // rootKey → Net
    for (const [key] of parent) {
      const root = find(key);
      if (!groups.has(root)) groups.set(root, new Net(root));
      const net = groups.get(root);
      const [instId, pinId] = key.split(':');
      net.addPin(instId, pinId);
      this.pinToNet.set(key, net);
    }

    // Also create nets for unconnected pins (isolated)
    for (const inst of this.components) {
      const def = COMPONENT_DEFS && COMPONENT_DEFS[inst.type];
      if (!def || !def.pins) continue;
      for (const pin of def.pins) {
        const key = `${inst.id}:${pin.id}`;
        if (!this.pinToNet.has(key)) {
          const net = new Net(key);
          net.addPin(inst.id, pin.id);
          this.pinToNet.set(key, net);
          this.nets.set(key, net);
        }
      }
    }

    // Move grouped nets to main map
    for (const [, net] of groups) {
      this.nets.set(net.id, net);
    }
  }

  /**
   * Get internal pin connections for a component (e.g., switch contacts).
   * Returns array of [pinA_key, pinB_key] pairs.
   * Resistors and capacitors are NOT shorted — they are resistive elements
   * solved by the nodal analysis in solve().
   */
  _getInternalConnections(inst) {
    const conns = [];
    const key = (pin) => `${inst.id}:${pin}`;

    switch (inst.type) {
      // Resistors and capacitors are NOT shorted here.
      // They are modeled as conductance edges in the nodal solver.
      case 'resistor':
      case 'capacitor':
        break;
      case 'diode_1n4007':
        // Forward-biased: anode → cathode (handled in solve, not graph)
        break;
      case 'push_button': {
        const pressed = inst.runtimeState?.pressed;
        if (pressed) {
          conns.push([key('p1'), key('p3')]);
          conns.push([key('p2'), key('p4')]);
        } else {
          conns.push([key('p1'), key('p2')]);
          conns.push([key('p3'), key('p4')]);
        }
        break;
      }
      case 'relay': {
        const active = inst.runtimeState?.active;
        if (active) {
          conns.push([key('com'), key('no')]);
        } else {
          conns.push([key('com'), key('nc')]);
        }
        break;
      }
      case 'breadboard':
      case 'breadboard_small': {
        // Breadboard groups: rows a-e share a rail, rows f-j share a rail
        const groups = {};
        const def = (window.ArduinoComponents?.COMPONENT_DEFS || {})[inst.type];
        if (def && def.pins) {
          for (const pin of def.pins) {
            const g = this._breadboardGroup(pin.id);
            if (g) {
              if (!groups[g]) groups[g] = [];
              groups[g].push(pin.id);
            }
          }
        }
        for (const pinIds of Object.values(groups)) {
          for (let i = 1; i < pinIds.length; i++) {
            conns.push([key(pinIds[0]), key(pinIds[i])]);
          }
        }
        break;
      }
      // Switches: just pass-through
      case 'dip_switch':
        // DIP switch doesn't have internal connections (each switch is separate)
        break;
    }
    return conns;
  }

  _breadboardGroup(pinId) {
    // Simplified breadboard grouping
    // Power rails: VCC, GND
    // Component area: columns 1-30, rows a-e (top), f-j (bottom)
    if (!pinId) return null;
    if (pinId === 'VCC' || pinId === 'vcc' || pinId === 'vcc_t' || pinId === 'vcc_b') return 'vcc';
    if (pinId === 'GND' || pinId === 'gnd' || pinId === 'gnd_t' || pinId === 'gnd_b') return 'gnd';
    // Rows a-e in same column share a connection
    const match = pinId.match(/^(\d+)([a-e])$/);
    if (match) return `top_${match[1]}`;
    const match2 = pinId.match(/^(\d+)([f-j])$/);
    if (match2) return `bot_${match2[1]}`;
    return null;
  }

  /* ═══════════════ NET SOLVING ═══════════════ */

  /**
   * Solve the circuit using nodal analysis (Gauss-Seidel iteration).
   * Computes correct voltages for resistive networks including voltage dividers.
   * Call after buildGraph().
   * @param {CircuitCanvas} canvas — canvas instance for pin number resolution
   */
  solve(canvas) {
    const { COMPONENT_DEFS } = window.ArduinoComponents || {};
    this._canvas = canvas || null;

    // Clear previous solve data
    for (const [, net] of this.nets) {
      net.sources = [];
      net.grounds = [];
      net.voltage = 0;
      net.resistanceToGround = Infinity;
    }

    // 1. Classify components — identify voltage sources and grounds
    for (const inst of this.components) {
      this._classifyComponent(inst);
    }

    // 2. Build adjacency list from resistive elements (resistors, bulbs, diodes, etc.)
    //    Each edge connects two nets with a resistance value.
    const adjacency = new Map(); // netId → [{ net, resistance }]
    const addEdge = (netA, netB, resistance) => {
      if (!netA || !netB || netA === netB || resistance <= 0) return;
      if (!adjacency.has(netA.id)) adjacency.set(netA.id, []);
      if (!adjacency.has(netB.id)) adjacency.set(netB.id, []);
      adjacency.get(netA.id).push({ net: netB, resistance });
      adjacency.get(netB.id).push({ net: netA, resistance });
    };

    for (const inst of this.components) {
      const net1 = this.getNetForPin(inst.id, 'p1');
      const net2 = this.getNetForPin(inst.id, 'p2');
      if (!net1 || !net2) continue;

      switch (inst.type) {
        case 'resistor': {
          const r = (Number(inst.props?.value) || 220)
            * (inst.props?.unit === 'kΩ' ? 1e3 : inst.props?.unit === 'MΩ' ? 1e6 : 1);
          addEdge(net1, net2, Math.max(r, 0.01));
          break;
        }
        case 'capacitor':
          // DC steady-state: capacitor is open circuit (very high resistance)
          addEdge(net1, net2, 1e9);
          break;
        case 'diode_1n4007': {
          // Simple diode model: ~0.7V forward drop, high reverse resistance
          // Approximated as a low resistance forward-biased path
          const v1 = net1.voltage || 0;
          const v2 = net2.voltage || 0;
          if (v1 > v2) {
            addEdge(net1, net2, 10); // forward-biased: low resistance
          } else {
            addEdge(net1, net2, 1e9); // reverse-biased: open circuit
          }
          break;
        }
        case 'bulb_12v':
          addEdge(net1, net2, 12); // nominal 12Ω filament
          break;
        case 'led':
        case 'led_green':
        case 'led_blue':
        case 'led_yellow':
        case 'led_orange':
        case 'led_white':
          // LED: modeled as a forward voltage drop with small resistance
          addEdge(net1, net2, 20); // ~20Ω effective resistance
          break;
      }
    }

    // 3. Initialize voltages from sources and grounds
    const fixedNets = new Set();
    for (const [, net] of this.nets) {
      if (net.sources.length > 0) {
        net.voltage = net.sources.sort((a, b) => b.voltage - a.voltage)[0].voltage;
        fixedNets.add(net.id);
      } else if (net.grounds.length > 0) {
        net.voltage = 0;
        fixedNets.add(net.id);
      }
    }

    // 4. Gauss-Seidel iterative relaxation to solve KCL at each free node
    //    For each free node: V = Σ(V_neighbor / R_neighbor) / Σ(1 / R_neighbor)
    for (let iter = 0; iter < 200; iter++) {
      let maxDelta = 0;
      for (const [netId, net] of this.nets) {
        if (fixedNets.has(netId)) continue;
        const neighbors = adjacency.get(netId);
        if (!neighbors || neighbors.length === 0) continue;

        // KCL: sum of currents leaving this node = 0
        // Σ (V_net - V_neighbor) / R_neighbor = 0
        // V_net × Σ(1/R) = Σ(V_neighbor / R)
        let sumG = 0;
        let sumVG = 0;
        for (const { net: neighbor, resistance } of neighbors) {
          const g = 1 / resistance;
          sumG += g;
          sumVG += neighbor.voltage * g;
        }
        if (sumG > 0) {
          const newV = sumVG / sumG;
          maxDelta = Math.max(maxDelta, Math.abs(newV - net.voltage));
          net.voltage = newV;
        }
      }
      if (maxDelta < 0.0001) break; // converged
    }

    // 5. Calculate equivalent resistance to ground for each net
    for (const [, net] of this.nets) {
      net.resistanceToGround = this._calcResistanceToGround(net);
    }
  }

  /**
   * Classify a component's pins as voltage sources or grounds.
   */
  _classifyComponent(inst) {
    const netOf = (pinId) => this.getNetForPin(inst.id, pinId);
    const addSource = (pinId, type, voltage, rawVal, resistance) => {
      const net = netOf(pinId);
      if (net) net.sources.push({ type, voltage, rawVal: rawVal ?? 255, resistance: resistance || 0 });
    };
    const addGround = (pinId, type, resistance) => {
      const net = netOf(pinId);
      if (net) net.grounds.push({ instId: inst.id, pinId, resistance: resistance || 0 });
    };

    switch (inst.type) {
      case 'arduino_uno':
      case 'arduino_nano':
      case 'esp32_devkit_v1': {
        const maxV = inst.type === 'esp32_devkit_v1' ? 3.3 : 5.0;
        const sim = window.ArduinoSim;

        // Iterate over all pins on this component that have nets
        for (const [pinKey, net] of this.pinToNet) {
          if (!pinKey.startsWith(inst.id + ':')) continue;
          const pinId = pinKey.slice(inst.id.length + 1);

          if (pinId === '5V' || pinId === 'VIN' || pinId === '5V2') {
            addSource(pinId, '5v', 5.0, 255);
          } else if (pinId === '3V3') {
            addSource(pinId, '3v3', 3.3, 168);
          } else if (pinId === 'GND1' || pinId === 'GND2' || pinId === 'GND_D' || pinId === 'GND') {
            addGround(pinId, 'gnd');
          } else {
            const pinNum = this._canvas?._pinToNumber?.(pinId);
            if (pinNum != null) {
              const rawVal = sim?.pinStates?.[`pin_${pinNum}`] || 0;
              if (rawVal > 0) {
                addSource(pinId, 'digital', maxV * (rawVal > 1 ? rawVal / 255 : 1), rawVal);
              } else {
                addGround(pinId, 'digital_low');
              }
            }
          }
        }
        break;
      }
      case 'power_5v':
        addSource('vcc', '5v', 5.0, 255);
        addGround('gnd', 'gnd');
        break;
      case 'power_gnd':
        addGround('gnd', 'gnd');
        break;
      case 'mb102_power': {
        const powered = inst.runtimeState?.powered ?? inst.props?.powered ?? 1;
        if (powered) {
          const topV = inst.props?.topVoltage ?? '5V';
          const voltageMap = { '5V': 5.0, '3.3V': 3.3, 'OFF': 0 };
          if (voltageMap[topV] > 0) addSource('vcc_t', topV, voltageMap[topV], 255);
          addSource('aux_5v', '5v', 5.0, 255);
        }
        addGround('gnd_t', 'gnd');
        addGround('gnd_b', 'gnd');
        addGround('aux_gnd', 'gnd');
        break;
      }
      case 'bench_power_supply': {
        const powered = inst.runtimeState?.powered ?? inst.props?.powered ?? 1;
        const outputOn = powered && (inst.runtimeState?.outputEnabled ?? inst.props?.outputEnabled ?? 1);
        const vSet = inst.runtimeState?.voltageSet ?? inst.props?.voltageSet ?? 12.0;
        if (outputOn && vSet > 0) {
          addSource('POS', 'bench_v+', vSet, 255);
          addSource('NEG', 'bench_v-', -vSet, 0);
        }
        if (powered) addSource('VCC_5V', '5V_fixed', 5.0, 255);
        addGround('GND', 'gnd');
        addGround('GND_5V', 'gnd');
        break;
      }
      case 'battery': {
        const voltage = inst.runtimeState?.voltage ?? inst.props?.voltage ?? 9;
        addSource('pos', 'battery', voltage, 255);
        addGround('neg', 'gnd');
        break;
      }
      case 'ic_555':
      case 'ic_74hc04':
      case 'ic_74hc00':
      case 'ic_74hc08':
      case 'ic_74hc32':
      case 'ic_74hc595':
      case 'ic_74hc138':
      case 'ic_74hc245':
      case 'ic_74hc74':
      case 'ic_74hc165':
      case 'ic_74hc193':
      case 'ic_74hc47':
      case 'ic_74hc148':
      case 'lm741':
        this._classifyIC(inst);
        break;
      case 'func_gen': {
        const rs = inst.runtimeState || {};
        if (rs.ch1_voltage > 0) addSource('ch1_out', 'func_gen', rs.ch1_voltage, 255);
        if (rs.ch2_voltage > 0) addSource('ch2_out', 'func_gen', rs.ch2_voltage, 255);
        break;
      }
    }
  }

  _classifyIC(inst) {
    const IC_OUTPUT_PINS = {
      ic_555: ['OUT', 'DIS'],
      ic_74hc04: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'],
      ic_74hc00: ['Y1', 'Y2', 'Y3', 'Y4'],
      ic_74hc08: ['Y1', 'Y2', 'Y3', 'Y4'],
      ic_74hc32: ['Y1', 'Y2', 'Y3', 'Y4'],
      ic_74hc595: ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'QHn'],
      ic_74hc138: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'],
      ic_74hc245: ['A1','A2','A3','A4','A5','A6','A7','A8','B1','B2','B3','B4','B5','B6','B7','B8'],
      ic_74hc74: ['Q1', 'Q1n', 'Q2', 'Q2n'],
      ic_74hc165: ['Q7', 'Q7n'],
      ic_74hc193: ['QA', 'QB', 'CO', 'BO', 'TC_U', 'TC_D'],
      ic_74hc47: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      ic_74hc148: ['A0', 'A1', 'A2', 'GS', 'EO'],
      lm741: ['OUT'],
    };
    const outPins = IC_OUTPUT_PINS[inst.type] || [];
    for (const pinId of outPins) {
      const net = this.getNetForPin(inst.id, pinId);
      if (!net) continue;
      let rawVal;
      if (inst.type === 'lm741') {
        rawVal = inst.runtimeState?.vOut != null
          ? Math.round((inst.runtimeState.vOut / 5.0) * 255) : 0;
      } else {
        rawVal = inst.runtimeState?.[pinId] ?? 0;
      }
      if (rawVal > 0) {
        net.sources.push({ type: 'ic_out', voltage: 5.0 * (rawVal > 1 ? rawVal / 255 : 1), rawVal, resistance: 0 });
      } else {
        net.grounds.push({ instId: inst.id, pinId, resistance: 0 });
      }
    }
  }

  _calcResistanceToGround(net) {
    if (net.grounds.length === 0) return Infinity;
    if (net.grounds.length === 1) return net.grounds[0].resistance || 0;
    // Parallel resistance formula: 1/R = sum(1/Ri)
    let invR = 0;
    for (const g of net.grounds) {
      const r = Math.max(0.1, g.resistance || 0.1);
      invR += 1 / r;
    }
    return invR > 0 ? 1 / invR : Infinity;
  }

  /* ═══════════════ QUERY API ═══════════════ */

  /**
   * Get the Net for a specific pin on a component.
   * @returns {Net|null}
   */
  getNetForPin(instId, pinId) {
    return this.pinToNet.get(`${instId}:${pinId}`) || null;
  }

  /**
   * Get voltage at a pin.
   * @returns {number} voltage in volts
   */
  getVoltageAtPin(instId, pinId) {
    const net = this.getNetForPin(instId, pinId);
    return net ? net.voltage : 0;
  }

  /**
   * Get the best (highest) voltage source connected to a pin.
   * @returns {{voltage:number, rawVal:number, type:string, resistance:number}|null}
   */
  getSourceAtPin(instId, pinId) {
    const net = this.getNetForPin(instId, pinId);
    if (!net || net.sources.length === 0) return null;
    return net.sources.sort((a, b) => b.voltage - a.voltage)[0];
  }

  /**
   * Check if a pin has a ground path.
   */
  hasGroundAtPin(instId, pinId) {
    const net = this.getNetForPin(instId, pinId);
    return net ? net.grounds.length > 0 : false;
  }

  /**
   * Measure equivalent resistance between two pins, handling parallel paths correctly.
   * Finds all simple paths and combines them using the parallel formula.
   */
  measureResistance(startInstId, startPinId, endInstId, endPinId) {
    const adj = new Map();
    const addEdge = (a, b, r) => {
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a).push({ key: b, r });
      adj.get(b).push({ key: a, r });
    };

    // Wire edges (zero resistance)
    for (const wire of this.wires) {
      addEdge(`${wire.from.instId}:${wire.from.pinId}`, `${wire.to.instId}:${wire.to.pinId}`, 0);
    }

    // Component internal edges
    for (const inst of this.components) {
      const key = (pin) => `${inst.id}:${pin}`;
      if (inst.type === 'resistor') {
        const r = (Number(inst.props?.value) || 220)
          * (inst.props?.unit === 'kΩ' ? 1e3 : inst.props?.unit === 'MΩ' ? 1e6 : 1);
        addEdge(key('p1'), key('p2'), Math.max(r, 0.01));
      } else if (inst.type === 'diode_1n4007') {
        addEdge(key('anode'), key('cathode'), 0.7);
      } else if (inst.type === 'bulb_12v') {
        addEdge(key('anode'), key('cathode'), 12);
      } else if (inst.type === 'led' || inst.type === 'led_green' || inst.type === 'led_blue'
        || inst.type === 'led_yellow' || inst.type === 'led_orange' || inst.type === 'led_white') {
        addEdge(key('anode'), key('cathode'), 20);
      } else if (inst.type === 'push_button') {
        const pressed = inst.runtimeState?.pressed;
        if (pressed) { addEdge(key('p1'), key('p3'), 0); addEdge(key('p2'), key('p4'), 0); }
        else { addEdge(key('p1'), key('p2'), 0); addEdge(key('p3'), key('p4'), 0); }
      } else if (inst.type === 'relay') {
        const on = inst.runtimeState?.active;
        addEdge(key('com'), key(on ? 'no' : 'nc'), 0);
      }
    }

    const startKey = `${startInstId}:${startPinId}`;
    const endKey = `${endInstId}:${endPinId}`;
    if (!adj.has(startKey) || !adj.has(endKey)) return Infinity;

    // DFS to find all simple paths, collect their resistances
    const pathResistances = [];
    const dfs = (currentKey, visited, totalR) => {
      if (pathResistances.length >= 200) return;
      if (currentKey === endKey) { pathResistances.push(totalR); return; }
      const neighbors = adj.get(currentKey);
      if (!neighbors) return;
      for (const { key: nextKey, r } of neighbors) {
        if (visited.has(nextKey)) continue;
        visited.add(nextKey);
        dfs(nextKey, visited, totalR + r);
        visited.delete(nextKey);
      }
    };
    dfs(startKey, new Set([startKey]), 0);

    if (pathResistances.length === 0) return Infinity;

    // Parallel combination: 1/R_total = Σ(1/Ri)
    let totalConductance = 0;
    for (const r of pathResistances) {
      if (r > 0) totalConductance += 1 / r;
    }
    return totalConductance > 0 ? 1 / totalConductance : Infinity;
  }

  /**
   * Calculate current through a path between two pins.
   * I = V / R (Ohm's law)
   */
  calculateCurrent(startInstId, startPinId, endInstId, endPinId) {
    const vStart = this.getVoltageAtPin(startInstId, startPinId);
    const vEnd = this.getVoltageAtPin(endInstId, endPinId);
    const r = this.measureResistance(startInstId, startPinId, endInstId, endPinId);
    if (r === Infinity || r === 0) return 0;
    const vDiff = vStart - vEnd;
    return vDiff / r;
  }

  /**
   * Check if a complete circuit exists (source → component → ground).
   */
  hasCompleteCircuit(instId, sourcePin, groundPin) {
    const hasSource = this.getSourceAtPin(instId, sourcePin) !== null;
    const hasGround = this.hasGroundAtPin(instId, groundPin);
    if (!hasSource || !hasGround) return false;
    // Check there's a path from source to ground through this component
    const r = this.measureResistance(instId, sourcePin, instId, groundPin);
    return r < Infinity;
  }
}

/* ═══════════════ EXPORT ═══════════════ */
window.ElectricalEngine = ElectricalEngine;
window.Net = Net;