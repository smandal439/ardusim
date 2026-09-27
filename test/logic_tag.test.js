/**
 * test/logic_tag.test.js — Draggable on-canvas logic-level tags:
 *   - defs + catalog registration (Logic group)
 *   - auto-attach: drop near a classified IC pin links, wrong kind / far = detach
 *   - click toggles the forced level (attached) or the source level (free)
 *   - right-click releases a forced level
 *   - wired input tag acts as a constant 0/1 source on every resolution path
 *   - output tag reads the attached IC pin / wired net (draw shows OUT:n)
 *   - position sync, dotted connector rects, hit-testing, serialization
 * Run: node node_modules\vitest\vitest.mjs run test/logic_tag.test.js
 */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

global.window = {
  ArduinoLibs: {},
  ArduinoComponents: { COMPONENT_DEFS: {} },
  CircuitCanvas: null,
  App: null,
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

const { CircuitCanvas, logicTagAttachedLevel } = loadScripts([
  'js/electrical.js',
  'js/components/base.js',
  'js/components/power.js',
  'js/components/function_generator.js',
  'js/components/input.js',
  'js/components/probe.js',
  'js/components/passive.js',
  'js/components/ics.js',
  'js/components/logic_tag.js',
  'js/canvas.js',
], ['CircuitCanvas', 'logicTagAttachedLevel']);

const { ArduinoSimulator } = loadScripts(['js/simulator.js'], ['ArduinoSimulator']);

const DEFS = () => window.ArduinoComponents.COMPONENT_DEFS;
const CATALOG = () => window.ArduinoComponents.COMPONENT_CATALOG;

function bareCanvas(components = [], wires = []) {
  const fake = Object.create(CircuitCanvas.prototype);
  fake.components = components;
  fake.wires = wires;
  fake.zoom = 1;
  fake.panX = 0;
  fake.panY = 0;
  fake.mode = 'idle';
  fake.dragging = null;
  fake._lvlTagRects = [];
  fake._onChanged = () => {};
  fake._pushHistory = () => {};
  return fake;
}
function wiresBetween(aId, aPin, bId, bPin) {
  return [{ id: 'w1', from: { instId: aId, pinId: aPin }, to: { instId: bId, pinId: bPin } }];
}
function el(type, id, x, y, props = {}) {
  const def = DEFS()[type];
  return { id, type, x, y, rotation: 0, props: { ...(def.defaultProps || {}), ...props }, runtimeState: {} };
}
function tag(type, x, y, props = {}) {
  return el(type, `t_${Math.random().toString(36).slice(2, 8)}`, x, y, props);
}
const noopCtx = {
  save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
  fill() {}, fillText() {}, translate() {}, setLineDash() {}, arc() {}, clearRect() {},
  closePath() {}, quadraticCurveTo() {}, strokeRect() {}, rotate() {}, scale() {},
  set strokeStyle(v) {}, set fillStyle(v) {}, set lineWidth(v) {}, set font(v) {},
  set textAlign(v) {}, set textBaseline(v) {}, set shadowColor(v) {}, set shadowBlur(v) {},
};

afterEach(() => { window.CircuitCanvas = null; window.App = null; });

describe('def + catalog registration', () => {
  it('registers both tag defs with pins, flags and default level', () => {
    const din = DEFS().logic_level_in;
    const dout = DEFS().logic_level_out;
    expect(din).toBeTruthy();
    expect(dout).toBeTruthy();
    expect(din.pins.map(p => p.id)).toEqual(['out']);
    expect(dout.pins.map(p => p.id)).toEqual(['in']);
    expect(din.hideLabel).toBe(true);
    expect(dout.hidePinLabels).toBe(true);
    expect(din.defaultProps.level).toBe(1);
    expect(typeof din.draw).toBe('function');
    expect(typeof dout.draw).toBe('function');
  });

  it('appears in the component catalog as a Logic group', () => {
    const g = CATALOG().find(g => g.category === 'Logic');
    expect(g).toBeTruthy();
    expect(g.ids).toEqual(['logic_level_in', 'logic_level_out']);
  });
});

describe('auto-attach on drop', () => {
  it('input tag attaches to a nearby IC input pin', () => {
    const ic = el('ic_74hc00', 'u1', 100, 100);
    const probe = bareCanvas([ic], []);
    const wp = probe._pinWorldPos(ic, DEFS().ic_74hc00.pins.find(p => p.id === 'A1'));
    const t = tag('logic_level_in', wp.x - 16, wp.y - 8);
    probe.components.push(t);
    probe._tryAttachTag(t);
    expect(t.props.attach).toEqual({ instId: 'u1', pinId: 'A1' });
  });

  it('input tag refuses an output pin', () => {
    const ic = el('ic_74hc00', 'u1', 100, 100);
    const probe = bareCanvas([ic], []);
    const wp = probe._pinWorldPos(ic, DEFS().ic_74hc00.pins.find(p => p.id === 'Y1'));
    const t = tag('logic_level_in', wp.x - 16, wp.y - 8);
    probe.components.push(t);
    probe._tryAttachTag(t);
    expect(t.props.attach).toBeUndefined();
  });

  it('output tag attaches to an output pin but not an input pin', () => {
    const ic = el('ic_74hc00', 'u1', 100, 100);
    const probe = bareCanvas([ic], []);
    const t = tag('logic_level_out', 0, 0);
    probe.components.push(t);

    const outWp = probe._pinWorldPos(ic, DEFS().ic_74hc00.pins.find(p => p.id === 'Y2'));
    t.x = outWp.x - 16; t.y = outWp.y - 8;
    probe._tryAttachTag(t);
    expect(t.props.attach).toEqual({ instId: 'u1', pinId: 'Y2' });

    const inWp = probe._pinWorldPos(ic, DEFS().ic_74hc00.pins.find(p => p.id === 'B3'));
    t.x = inWp.x - 16; t.y = inWp.y - 8;
    probe._tryAttachTag(t);
    expect(t.props.attach).toBeUndefined();
  });

  it('dropping far away detaches', () => {
    const ic = el('ic_74hc00', 'u1', 100, 100);
    const t = tag('logic_level_in', 0, 0, { attach: { instId: 'u1', pinId: 'A1' } });
    const probe = bareCanvas([ic, t], []);
    probe._tryAttachTag(t);
    expect(t.props.attach).toBeUndefined();
  });
});

describe('click / right-click behaviour', () => {
  it('clicking an attached tag flips the forced level (effective → opposite)', () => {
    const ic = el('ic_74hc00', 'u1', 0, 0, { forcedInputs: {} });
    const t = tag('logic_level_in', 0, 0, { attach: { instId: 'u1', pinId: 'A1' }, level: 1 });
    const fake = bareCanvas([ic, t], []);
    // unforced & unwired effective = 0 → first click forces 1
    fake._toggleLogicTag(t);
    expect(ic.props.forcedInputs.A1).toBe(1);
    // second click flips to 0
    fake._toggleLogicTag(t);
    expect(ic.props.forcedInputs.A1).toBe(0);
  });

  it('clicking a free tag flips its own source level', () => {
    const t = tag('logic_level_in', 0, 0, { level: 1 });
    const fake = bareCanvas([t], []);
    fake._toggleLogicTag(t);
    expect(t.props.level).toBe(0);
    fake._toggleLogicTag(t);
    expect(t.props.level).toBe(1);
  });

  it('right-click releases a force and reports it (menu suppressed)', () => {
    const ic = el('ic_74hc00', 'u1', 0, 0, { forcedInputs: { A1: 1 } });
    const t = tag('logic_level_in', 0, 0, { attach: { instId: 'u1', pinId: 'A1' } });
    const fake = bareCanvas([ic, t], []);
    expect(fake._releaseLogicTag(t)).toBe(true);
    expect(ic.props.forcedInputs.A1).toBeUndefined();
    expect(fake._releaseLogicTag(t)).toBe(false); // nothing forced anymore
  });

  it('mouse-up without movement toggles; with movement re-attaches', () => {
    const ic = el('ic_74hc00', 'u1', 100, 100);
    const t = tag('logic_level_in', 0, 0, { level: 1 });
    const fake = bareCanvas([ic, t], []);
    // click (no move)
    fake.mode = 'dragging';
    fake.dragging = { inst: t, moved: false };
    fake._onMouseUp({});
    expect(t.props.level).toBe(0);
    // drag onto the A1 pin → attach
    const wp = fake._pinWorldPos(ic, DEFS().ic_74hc00.pins.find(p => p.id === 'A1'));
    t.x = wp.x - 16; t.y = wp.y - 8;
    fake.mode = 'dragging';
    fake.dragging = { inst: t, moved: true };
    fake._onMouseUp({});
    expect(t.props.attach).toEqual({ instId: 'u1', pinId: 'A1' });
  });

  it('placing an input tag right on a pin auto-attaches', () => {
    const ic = el('ic_74hc00', 'u1', 100, 100);
    const fake = bareCanvas([ic], []);
    fake._snap = (v) => v;
    const wp = fake._pinWorldPos(ic, DEFS().ic_74hc00.pins.find(p => p.id === 'B1'));
    fake.placingType = 'logic_level_in';
    const placed = fake._placeComponent({ x: wp.x, y: wp.y });
    expect(placed).toBeTruthy();
    expect(placed.props.attach).toEqual({ instId: 'u1', pinId: 'B1' });
  });
});

describe('wired input tag = constant logic source', () => {
  it('canvas _readDigitalInput / _hasDigitalInputSource see the wired level', () => {
    const ic = el('ic_74hc00', 'u1', 0, 0);
    const t = tag('logic_level_in', 0, 0, { level: 1 });
    const fake = bareCanvas([ic, t], wiresBetween('u1', 'A1', t.id, 'out'));
    expect(fake._readDigitalInput('u1', 'A1')).toBe(1);
    expect(fake._hasDigitalInputSource('u1', 'A1')).toBe(true);
    t.props.level = 0;
    expect(fake._readDigitalInput('u1', 'A1')).toBe(0);
    expect(fake._hasDigitalInputSource('u1', 'A1')).toBe(true);
  });

  it('getPinVoltage resolves the wired tag at the far end (probe → tag)', () => {
    const t = tag('logic_level_in', 0, 0, { level: 1 });
    const probe = el('la_probe_ch1', 'la1', 0, 0);
    window.CircuitCanvas = bareCanvas([probe, t], wiresBetween('la1', 'tip', t.id, 'out'));
    const sim = new ArduinoSimulator();
    expect(sim.getPinVoltage(probe, 'tip')).toBe(5);
    t.props.level = 0;
    expect(sim.getPinVoltage(probe, 'tip')).toBe(0);
  });

  it('getPinVoltage resolves the wired tag as an IC input source', () => {
    const ic = el('ic_74hc00', 'u1', 0, 0);
    const t = tag('logic_level_in', 0, 0, { level: 1 });
    window.CircuitCanvas = bareCanvas([ic, t], wiresBetween('u1', 'A1', t.id, 'out'));
    const sim = new ArduinoSimulator();
    expect(sim.getPinVoltage(ic, 'A1')).toBe(5);
    t.props.level = 0;
    expect(sim.getPinVoltage(ic, 'A1')).toBe(0);
  });

  it('electrical.js classifies the tag as a 5V source / ground', () => {
    const src = readSrc('js/electrical.js');
    expect(src.includes("case 'logic_level_in':")).toBe(true);
    expect(src.includes("addSource('out', 'logic_high', 5.0, 255)")).toBe(true);
    expect(src.includes("addGround('out', 'logic_low')")).toBe(true);
  });

  it('standalone source type keeps the sim chain updating without a sketch', () => {
    expect(readSrc('js/canvas.js')).toMatch(/standaloneTypes = new Set\(\[[^\]]*'logic_level_in'/);
  });
});

describe('output tag reads its level', () => {
  it('attached: logicTagAttachedLevel reads the target IC runtimeState', () => {
    const ic = el('ic_74hc00', 'u1', 0, 0);
    ic.runtimeState.Y1 = 255;
    const t = tag('logic_level_out', 0, 0, { attach: { instId: 'u1', pinId: 'Y1' } });
    const fake = bareCanvas([ic, t], []);
    expect(logicTagAttachedLevel(fake, t)).toEqual({ lvl: 1, forced: false });
    ic.runtimeState.Y1 = 0;
    expect(logicTagAttachedLevel(fake, t)).toEqual({ lvl: 0, forced: false });
  });

  it('wired: canvas resolves the net to the IC output pin', () => {
    const ic = el('ic_74hc00', 'u1', 0, 0);
    ic.runtimeState.Y3 = 255;
    const t = tag('logic_level_out', 0, 0);
    const fake = bareCanvas([ic, t], wiresBetween(t.id, 'in', 'u1', 'Y3'));
    expect(fake._readDigitalInput(t.id, 'in')).toBe(1);
    ic.runtimeState.Y3 = 0;
    expect(fake._readDigitalInput(t.id, 'in')).toBe(0);
  });

  it('draw renders OUT:<level> from the live canvas read', () => {
    const ic = el('ic_74hc00', 'u1', 0, 0);
    ic.runtimeState.Y1 = 255;
    const t = tag('logic_level_out', 0, 0, { attach: { instId: 'u1', pinId: 'Y1' } });
    const fake = bareCanvas([ic, t], []);
    window.App = { canvas: fake };
    const texts = [];
    const ctx = { ...noopCtx, fillText: (s) => texts.push(s), strokeStyle: '', fillStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '' };
    DEFS().logic_level_out.draw(ctx, { ...t });
    expect(texts).toContain('OUT:1');
    window.App = null;
  });

  it('input tag draw shows forced state with the amber ring', () => {
    const ic = el('ic_74hc00', 'u1', 0, 0, { forcedInputs: { A1: 1 } });
    const t = tag('logic_level_in', 0, 0, { attach: { instId: 'u1', pinId: 'A1' } });
    const fake = bareCanvas([ic, t], []);
    window.App = { canvas: fake };
    const texts = [];
    const ctx = {
      ...noopCtx,
      fillText: (s) => texts.push(s),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
    };
    DEFS().logic_level_in.draw(ctx, { ...t });
    expect(texts).toContain('IN:1');
    expect(ctx.strokeStyle).toBe('#f5b942'); // forced → amber ring
    window.App = null;
  });

  it('stale attach links are cleaned up', () => {
    const t = tag('logic_level_out', 5, 5, { attach: { instId: 'gone', pinId: 'Y1' } });
    const fake = bareCanvas([t], []);
    expect(logicTagAttachedLevel(fake, t)).toBeNull();
    expect(t.props.attach).toBeUndefined();
  });
});

describe('position sync, connector rects and hit-testing', () => {
  it('attached tag follows its pin and lands in the hit rects', () => {
    const ic = el('ic_74hc00', 'u1', 100, 100);
    const t = tag('logic_level_in', 0, 0, { attach: { instId: 'u1', pinId: 'A1' } });
    const fake = bareCanvas([ic, t], []);
    const wp = fake._pinWorldPos(ic, DEFS().ic_74hc00.pins.find(p => p.id === 'A1'));
    fake._drawLvlTags(noopCtx);
    // tag centre sits 20 world-units outward of the pin
    const cx = t.x + 16;
    const cy = t.y + 8;
    expect(Math.hypot(cx - wp.x, cy - wp.y)).toBeCloseTo(20, 0);
    expect(fake._lvlTagRects).toHaveLength(1);
    const hit = fake._hitTestTag(cx, cy);
    expect(hit && hit.inst).toBe(t);
    expect(fake._hitTestTag(-100, -100)).toBeNull();
  });

  it('moving the IC drags the attached tag along next frame', () => {
    const ic = el('ic_74hc00', 'u1', 100, 100);
    const t = tag('logic_level_in', 0, 0, { attach: { instId: 'u1', pinId: 'A1' } });
    const fake = bareCanvas([ic, t], []);
    fake._drawLvlTags(noopCtx);
    const before = { x: t.x, y: t.y };
    ic.x += 50;
    ic.y += 30;
    fake._drawLvlTags(noopCtx);
    expect(t.x).toBeCloseTo(before.x + 50, 5);
    expect(t.y).toBeCloseTo(before.y + 30, 5);
  });
});

describe('persistence + integration hooks', () => {
  it('canvas.serialize() keeps attach + level', () => {
    const t = { id: 't1', type: 'logic_level_in', x: 4, y: 8, rotation: 0,
      props: { level: 0, attach: { instId: 'u1', pinId: 'A1' } }, runtimeState: {} };
    const out = CircuitCanvas.prototype.serialize.call({ components: [t], wires: [] });
    expect(out.components[0].props).toEqual({ level: 0, attach: { instId: 'u1', pinId: 'A1' } });
  });

  it('source hooks: canvas tag pipeline, index.html script, sw precache, modal cleanup', () => {
    const canvas = readSrc('js/canvas.js');
    expect(canvas.includes('_drawLvlTags(ctx)')).toBe(true);
    expect(canvas.includes('_tryAttachTag(inst)')).toBe(true);
    expect(canvas.includes('_toggleLogicTag(inst)')).toBe(true);
    expect(canvas.includes('if (other.type === \'logic_level_in\') return')).toBe(true);
    expect(readSrc('index.html').includes('js/components/logic_tag.js')).toBe(true);
    expect(readSrc('sw.js').includes('js/components/logic_tag.js')).toBe(true);
    const app = readSrc('js/app.js');
    expect(app.includes('_icLvlIn')).toBe(false);   // properties-panel tags removed
    expect(app.includes('props-pin-lvl')).toBe(false);
    expect(readSrc('css/style.css').includes('.props-pin .lvl-tag')).toBe(false);
  });
});
