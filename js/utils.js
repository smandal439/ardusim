/* -------------------------------------------------------
   utils.js — Shared utilities for ArduSim
   ------------------------------------------------------- */

'use strict';

/* ── Debounce ── */
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* ── Throttle ── */
function throttle(fn, limit) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= limit) {
      last = now;
      return fn.apply(this, args);
    }
  };
}

/* ── Deep clone (JSON-safe) ── */
function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return obj;
  }
}

/* ── Escape HTML ── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Format bytes ── */
function formatBytes(bytes) {
  const b = Number(bytes);
  if (!Number.isFinite(b)) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

/* ── Format duration ── */
function formatDuration(ms) {
  const v = Number(ms);
  if (!Number.isFinite(v)) return '0ms';
  if (v < 1000) return `${v.toFixed(0)}ms`;
  if (v < 60000) return `${(v / 1000).toFixed(2)}s`;
  const m = Math.floor(v / 60000);
  const s = ((v % 60000) / 1000).toFixed(1);
  return `${m}m ${s}s`;
}

/* ── Confirm dialog ── */
const ConfirmDialog = {
  _resolve: null,

  show(message, title = 'Confirm') {
    return new Promise((resolve) => {
      this._resolve = resolve;
      const overlay = document.getElementById('confirm-overlay');
      const msgEl   = document.getElementById('confirm-message');
      const titleEl = document.getElementById('confirm-title');
      if (!overlay) { resolve(window.confirm(message)); return; }
      if (titleEl) titleEl.textContent = title;
      if (msgEl)   msgEl.textContent   = message;
      overlay.classList.remove('hidden');
      overlay.classList.add('active');
      const okBtn     = document.getElementById('confirm-ok');
      const cancelBtn = document.getElementById('confirm-cancel');
      const cleanup = () => {
        overlay.classList.add('hidden');
        overlay.classList.remove('active');
        okBtn?.removeEventListener('click', onOk);
        cancelBtn?.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKey);
      };
      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      const onKey = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); onOk(); }
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      };
      okBtn?.addEventListener('click', onOk);
      cancelBtn?.addEventListener('click', onCancel);
      document.addEventListener('keydown', onKey);
      overlay?.addEventListener('click', (e) => { if (e.target === overlay) onCancel(); }, { once: true });
    });
  },
};

/* ── Simple EventEmitter ── */
class EventEmitter {
  constructor() {
    this._listeners = {};
  }

  on(event, listener) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(listener);
    return this;
  }

  off(event, listener) {
    if (!this._listeners[event]) return this;
    this._listeners[event] = this._listeners[event].filter(l => l !== listener);
    return this;
  }

  once(event, listener) {
    const wrapper = (...args) => { this.off(event, wrapper); listener(...args); };
    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    const listeners = this._listeners[event] || [];
    listeners.forEach(l => { try { l(...args); } catch (e) { console.error(e); } });
  }
}

/* ── Generate unique ID ── */
let _idCounter = 0;
function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${++_idCounter}`;
}

/* ── Export ── */
window.Utils = {
  debounce,
  throttle,
  deepClone,
  escapeHtml,
  formatBytes,
  formatDuration,
  uid,
  ConfirmDialog,
  EventEmitter,
};
