import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

global.window = {
  ArduinoComponents: {
    COMPONENT_DEFS: {
      test_component: { name: 'Test Component', width: 40, height: 30 },
      hidden_label_component: { name: 'Hidden Label Component', width: 40, height: 30, hideLabel: true },
    },
  },
  prompt: () => null,
};
global.document = {
  getElementById: () => null,
  querySelectorAll: () => [],
};

const canvasSource = fs.readFileSync(path.join(ROOT, 'js/canvas.js'), 'utf8');
const { CircuitCanvas } = new Function(
  'window',
  'document',
  `${canvasSource}\n;return { CircuitCanvas };`
)(global.window, global.document);

function createCanvas() {
  const canvas = Object.create(CircuitCanvas.prototype);
  canvas.components = [];
  canvas.wires = [];
  canvas.annotations = [];
  canvas.selected = null;
  canvas.selectedWire = null;
  canvas.selectedAnnotation = null;
  canvas.zoom = 1;
  canvas.panX = 0;
  canvas.panY = 0;
  canvas.GRID = 5;
  canvas.ctx = {
    font: '10px sans-serif',
    measureText: text => ({ width: text.length * 7 }),
  };
  canvas._viewportWidth = 500;
  canvas._viewportHeight = 300;
  canvas.canvas = { width: 500, height: 300, style: {} };
  canvas._onChanged = vi.fn();
  canvas.history = [];
  canvas.historyIdx = -1;
  canvas._pushHistory();
  return canvas;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('circuit labels and annotations', () => {
  it('creates, serializes, and restores text annotations', () => {
    const canvas = createCanvas();
    const annotation = canvas.addTextAnnotation('Power rail', 12, 18);
    canvas.components = [{
      id: 'component-1',
      type: 'test_component',
      x: 5,
      y: 10,
      rotation: 0,
      props: { label: 'R1' },
    }];

    expect(annotation).toMatchObject({ text: 'Power rail', x: 10, y: 20 });
    expect(canvas.serialize().components[0].props.label).toBe('R1');
    expect(canvas.serialize().annotations).toEqual([
      { id: annotation.id, text: 'Power rail', x: 10, y: 20 },
    ]);

    canvas.deserialize(canvas.serialize());
    expect(canvas.annotations).toHaveLength(1);
    expect(canvas.annotations[0]).toMatchObject({ text: 'Power rail', x: 10, y: 20 });
    expect(canvas.components[0].props.label).toBe('R1');
  });

  it('loads old circuits and normalizes malformed annotation data', () => {
    vi.useFakeTimers();
    const canvas = createCanvas();
    canvas.deserialize({ components: [], wires: [] });
    expect(canvas.annotations).toEqual([]);

    canvas.deserialize({
      components: [],
      wires: [],
      annotations: [
        { id: 'valid', text: 'Note', x: 10, y: 15 },
        { id: 'blank', text: '  ', x: 0, y: 0 },
        { id: 'invalid-position', text: 'Also ignored', x: 'bad', y: 4 },
      ],
    });
    expect(canvas.annotations).toEqual([
      { id: 'valid', text: 'Note', x: 10, y: 15, selected: false },
      { id: 'invalid-position', text: 'Also ignored', x: 0, y: 4, selected: false },
    ]);
  });

  it('includes component labels and text annotations in canvas overlays', () => {
    const canvas = createCanvas();
    canvas.components = [{
      type: 'test_component',
      x: 10,
      y: 20,
      props: { label: 'R1' },
    }, {
      type: 'hidden_label_component',
      x: 100,
      y: 20,
      props: { label: 'Q1' },
    }];
    canvas.annotations = [{ id: 'note', text: 'VCC', x: 60, y: 70 }];
    const labels = [];
    const ctx = {
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      save() {},
      restore() {},
      fillText: (text, x, y) => labels.push({ text, x, y }),
      strokeText() {},
      measureText: text => ({ width: text.length * 7 }),
      strokeRect() {},
    };

    canvas._drawOverlays(ctx);

    expect(labels.map(label => label.text)).toContain('R1');
    expect(labels.map(label => label.text)).toContain('Q1');
    expect(labels.map(label => label.text)).toContain('VCC');
    expect(ctx.fillStyle).toBe('#ffffff');
  });

  it('supports annotation hit testing, deletion, and undo', () => {
    const canvas = createCanvas();
    const annotation = canvas.addTextAnnotation('Ground', 10, 10);
    expect(canvas._hitTestAnnotation(15, 15)).toBe(annotation);

    canvas.deleteSelected();
    expect(canvas.annotations).toHaveLength(0);
    canvas.undo();
    expect(canvas.annotations[0]).toMatchObject({ text: 'Ground', x: 10, y: 10 });
    canvas.redo();
    expect(canvas.annotations).toHaveLength(0);
  });

  it('places and moves annotations through canvas interactions', () => {
    const canvas = createCanvas();
    window.prompt = vi.fn(() => 'VCC');
    canvas.startTextPlacement();
    canvas._onMouseDown({
      button: 0,
      offsetX: 12,
      offsetY: 18,
      clientX: 12,
      clientY: 18,
    });

    expect(canvas.mode).toBe('placingText');
    expect(canvas.annotations[0]).toMatchObject({ text: 'VCC', x: 10, y: 20 });

    canvas.cancelPlacing();
    canvas._hitTestTag = () => null;
    canvas._hidePinTooltip = vi.fn();
    canvas._onMouseDown({
      button: 0,
      offsetX: 12,
      offsetY: 22,
      clientX: 12,
      clientY: 22,
    });
    canvas._onMouseMove({
      offsetX: 37,
      offsetY: 47,
      clientX: 37,
      clientY: 47,
    });
    canvas._onMouseUp({});

    expect(canvas.annotations[0]).toMatchObject({ x: 35, y: 45 });
    canvas.undo();
    expect(canvas.annotations[0]).toMatchObject({ x: 10, y: 20 });
  });
});
