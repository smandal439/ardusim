/**
 * test/logic_analyzer_cursor.test.js — cursor ΔT accuracy on a rolling window
 * Bug: each cursor click converted pixel→time against the CURRENT end of data.
 * With a running sim the window scrolls between clicks, so ΔT included the
 * scroll delta (user saw 562ms for a 1ms cycle). Fix: freeze the display
 * window while cursors are active.
 * Run: node node_modules/vitest/vitest.mjs run test/logic_analyzer_cursor.test.js
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

global.window = {};
global.ResizeObserver = class { observe() {} disconnect() {} };
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};

const root = path.resolve(__dirname, '..');
const W = 800;
const LABEL_W = 60;
const PLOT_W = W - LABEL_W;

beforeAll(() => {
  const src = fs.readFileSync(path.join(root, 'js/logic-analyzer.js'), 'utf8');
  eval(src + '\nwindow.LogicAnalyzer = LogicAnalyzer;');
});

function makeCtx() {
  return new Proxy({}, {
    get(_, prop) {
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop() {} });
      }
      return () => undefined;
    },
    set() { return true; },
  });
}

function makeLA() {
  const canvasEl = {
    width: W, height: 300, parentElement: null, style: {},
    getContext: () => makeCtx(),
    addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  };
  const la = new window.LogicAnalyzer(canvasEl);
  la.canvas.width = W;
  la.canvas.height = 300;
  return la;
}

/* 1 kHz square wave: half period 0.5 ms, sampled every 25 µs */
function feedSquare(la, fromMs, toMs) {
  for (let i = Math.round(fromMs * 40); i <= Math.round(toMs * 40); i++) {
    const t = i / 40;
    la.sample(t, { pin_2: (Math.floor(t / 0.5) % 2) ? 1 : 0 });
  }
}

describe('LA cursor ΔT on a scrolling window', () => {
  it('measures one 1 kHz cycle as ~1ms even when the sim advances between clicks', () => {
    const la = makeLA();
    la.setTimebase('0.5'); // 500µs/div → 5ms window
    feedSquare(la, 0, 10);

    const xA = LABEL_W + PLOT_W * 0.5;
    la._setCursorA(xA);
    expect(la.cursorA).not.toBeNull();

    // User takes time to aim cursor B while the sim keeps running: the
    // window scrolls forward by 561 ms (this produced the reported 562ms).
    feedSquare(la, 10, 571);

    // One 1 kHz cycle = 1ms = 20% of the 5ms window
    const xB = LABEL_W + PLOT_W * 0.7;
    la._setCursorB(xB);

    const dt = Math.abs(la.cursorB - la.cursorA);
    expect(dt).toBeGreaterThan(0.9);
    expect(dt).toBeLessThan(1.1);
  });

  it('freezes the display window while a cursor is active', () => {
    const la = makeLA();
    la.setTimebase('0.5');
    feedSquare(la, 0, 10);

    const x = LABEL_W + PLOT_W * 0.5;
    la._setCursorA(x);
    const t1 = la._pixelToTime(x);

    feedSquare(la, 10, 500); // sim advances while aiming cursor B
    const t2 = la._pixelToTime(x);
    expect(t2).toBeCloseTo(t1, 6);

    la._render(); // frozen frame must render without throwing
  });

  it('resumes the live window once both cursors are cleared', () => {
    const la = makeLA();
    la.setTimebase('0.5');
    feedSquare(la, 0, 10);

    const x = LABEL_W + PLOT_W * 0.5;
    la._setCursorA(x);
    la._setCursorB(x + 50);
    expect(la.cursorA).not.toBeNull();

    la._setCursorA(x); // third click clears both
    expect(la.cursorA).toBeNull();
    expect(la.cursorB).toBeNull();
    expect(la._cursorEpoch).toBeNull();

    feedSquare(la, 10, 1000);
    const t = la._pixelToTime(x);
    expect(t).toBeGreaterThan(990); // tracks live data again
  });

  it('clear() releases the frozen window', () => {
    const la = makeLA();
    la.setTimebase('0.5');
    feedSquare(la, 0, 10);
    la._setCursorA(LABEL_W + PLOT_W * 0.5);
    expect(la._cursorEpoch).not.toBeNull();
    la.clear();
    expect(la._cursorEpoch).toBeNull();
  });
});

describe('frequency measurement with cursors placed on one cycle', () => {
  it('finds both rising edges when cursors land slightly inside them', () => {
    const la = makeLA();
    la.setTimebase('0.5');
    const d = [];
    for (let i = 0; i < 40; i++) {
      d.push({ t: i, v: 1 });
      d.push({ t: i + 0.5, v: 0 });
    }
    la.data['D2'] = d;

    // Cursors a pixel or two inside the rises at t=5ms and t=6ms
    la.cursorA = 5.01;
    la.cursorB = 5.99;
    const m = la._measureBetweenCursors(la.channels[0]);
    expect(m).not.toBeNull();
    expect(m.risingEdges).toBe(2);
    expect(m.frequency).toBeGreaterThan(990);
    expect(m.frequency).toBeLessThan(1010);
    expect(m.dt).toBeCloseTo(0.98, 5);
  });
});
