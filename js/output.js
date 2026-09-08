/* ═══════════════════════════════════════════════════════
   output.js — Compile / Debug Output panel
   Displays code errors, verify/compile results and runtime
   debug messages alongside the Serial Monitor.
   ═══════════════════════════════════════════════════════ */

'use strict';

class OutputPanel {
  constructor() {
    this.logEl = document.getElementById('output-log');
    this.clearBtn = document.getElementById('btn-clear-output');
    this.lineCountEl = document.getElementById('output-line-count');
    this._allLines = [];
    this.maxLines = 500;
    this._bind();
  }

  _bind() {
    this.clearBtn && this.clearBtn.addEventListener('click', () => this.clear());
  }

  log(text, type = 'info') {
    if (typeof text !== 'string' || !text || !this.logEl) return;
    this._allLines.push({ text, type });
    if (this._allLines.length > this.maxLines) this._allLines.shift();

    while (this.logEl.childElementCount >= this.maxLines) {
      const first = this.logEl.firstChild;
      if (first) this.logEl.removeChild(first);
    }

    const span = document.createElement('span');
    span.className = `output-line ${type}`;
    span.innerHTML = `<span class="output-ts">${this._timestamp()}</span>${this._escapeHtml(text)}`;
    this.logEl.appendChild(span);

    if (this.lineCountEl) {
      this.lineCountEl.textContent = `${this._allLines.length} line${this._allLines.length !== 1 ? 's' : ''}`;
    }
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  clear() {
    if (this.logEl) this.logEl.innerHTML = '';
    this._allLines = [];
    if (this.lineCountEl) this.lineCountEl.textContent = '0 lines';
  }

  _timestamp() {
    const now = new Date();
    return `[${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}]`;
  }

  _escapeHtml(str) {
    return escapeHtml(str);
  }
}

window.OutputPanel = null; // Set in app.js
window.OutputPanelClass = OutputPanel;