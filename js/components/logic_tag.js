/*
 * components/logic_tag.js — Draggable logic-level tags
 *
 *   logic_level_in  — drop near an IC input pin to attach (click toggles the
 *                     forced 0/1), or drop in empty space and wire it as a
 *                     constant logic source.
 *   logic_level_out — drop near an IC output pin to display its level, or
 *                     wire it to probe any net.
 *
 * Attach state lives in props.attach = { instId, pinId } (serialized with the
 * circuit); forced levels live in the target's props.forcedInputs.
 */

'use strict';

/** Shared pill renderer for both tags. */
function drawLogicTagPill(ctx, inst, text, hi, forced, selected) {
  const w = 32;
  const h = 16;
  ctx.save();
  ctx.translate(inst.x, inst.y);
  ctx.fillStyle = hi ? '#2ea043' : '#4a4f56';
  roundRect(ctx, 0, 0, w, h, 5);
  ctx.fill();
  if (forced) {
    ctx.strokeStyle = '#f5b942';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 0.75, 0.75, w - 1.5, h - 1.5, 4.5);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 9px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 0.5);
  ctx.textBaseline = 'alphabetic';
  if (selected) drawSelectionRect(ctx, -3, -3, w + 6, h + 6);
  ctx.restore();
}

/**
 * Resolve an attached tag's target level.
 * Returns { lvl, forced } or null when the tag is free / target is gone
 * (stale attach links are cleaned up here).
 */
function logicTagAttachedLevel(canvas, inst) {
  const a = inst.props && inst.props.attach;
  if (!a) return null;
  const target = canvas && (canvas.components || []).find(c => c.id === a.instId);
  if (!target) {
    delete inst.props.attach;
    return null;
  }
  if (inst.type === 'logic_level_in') {
    const fi = target.props && target.props.forcedInputs;
    if (fi && fi[a.pinId] !== undefined) return { lvl: fi[a.pinId] ? 1 : 0, forced: true };
    const lvl = canvas && typeof canvas._readDigitalInput === 'function'
      ? (canvas._readDigitalInput(a.instId, a.pinId) ? 1 : 0)
      : 0;
    return { lvl, forced: false };
  }
  // Output tag reads the target IC's stored output directly (0 / 1 / 255)
  const raw = target.runtimeState ? target.runtimeState[a.pinId] : undefined;
  return { lvl: Number(raw) > 0 ? 1 : 0, forced: false };
}

function logicTagCanvas() {
  return (window.App && window.App.canvas) || null;
}

/* ─────────────────────────── INPUT tag ─────────────────────────── */

defComp({
  id: 'logic_level_in',
  name: 'Logic Input Tag',
  category: 'Logic',
  icon: '🏷️',
  desc: 'Drop next to an IC input pin and click it to force 1/0 — or wire it as a constant logic source',
  search: 'logic tag level input force toggle high low source 0 1',
  width: 32,
  height: 16,
  hideLabel: true,
  hidePinLabels: true,
  defaultProps: { level: 1 },
  pins: [
    { id: 'out', label: 'OUT', type: PIN_TYPE.DIGITAL, x: 32, y: 8, side: 'right' },
  ],
  draw(ctx, inst) {
    const props = inst.props || {};
    let lvl = props.level ? 1 : 0;
    let forced = false;
    const att = logicTagAttachedLevel(logicTagCanvas(), inst);
    if (att) { lvl = att.lvl; forced = att.forced; }
    drawLogicTagPill(ctx, inst, 'IN:' + lvl, lvl, forced, inst.selected);
  },
});

/* ─────────────────────────── OUTPUT tag ─────────────────────────── */

defComp({
  id: 'logic_level_out',
  name: 'Logic Output Tag',
  category: 'Logic',
  icon: '🏷️',
  desc: 'Drop next to an IC output pin to show its 0/1 level live — or wire it to probe a net',
  search: 'logic tag level output probe read show 0 1 indicator',
  width: 32,
  height: 16,
  hideLabel: true,
  hidePinLabels: true,
  defaultProps: {},
  pins: [
    { id: 'in', label: 'IN', type: PIN_TYPE.DIGITAL, x: 0, y: 8, side: 'left' },
  ],
  draw(ctx, inst) {
    let lvl = 0;
    const canvas = logicTagCanvas();
    const att = logicTagAttachedLevel(canvas, inst);
    if (att) {
      lvl = att.lvl;
    } else if (canvas && typeof canvas._readDigitalInput === 'function') {
      lvl = canvas._readDigitalInput(inst.id, 'in') ? 1 : 0;
    }
    drawLogicTagPill(ctx, inst, 'OUT:' + lvl, lvl, false, inst.selected);
  },
});
