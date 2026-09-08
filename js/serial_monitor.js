/* ═══════════════════════════════════════════════════════
   serial_monitor.js — Serial Monitor (enhanced)
   ═══════════════════════════════════════════════════════ */

'use strict';

class SerialMonitor {
  constructor() {
    this.outputEl   = document.getElementById('serial-output');
    this.inputEl    = document.getElementById('serial-input');
    this.sendBtn    = document.getElementById('btn-serial-send');
    this.clearBtn   = document.getElementById('btn-clear-serial');
    this.exportBtn  = document.getElementById('btn-export-serial');
    this.copyBtn    = document.getElementById('btn-copy-serial');
    this.baudSel    = document.getElementById('serial-baud');
    this.eolSel     = document.getElementById('serial-eol');
    this.autoScroll = document.getElementById('serial-autoscroll');
    this.showTS     = document.getElementById('serial-timestamp');
    this.showHex    = document.getElementById('serial-show-hex');
    this.searchEl   = document.getElementById('serial-search');
    this.lineCountEl = document.getElementById('serial-line-count');

    this.buffer = '';
    this.lineCount = 0;
    this.maxLines = 5000;
    this._pendingFlush = null;
    this._searchTerm = '';
    this._allLines = []; // store { text, type } for filtering
    this._baudWarned = false;

    this._bind();
  }

  _bind() {
    this.sendBtn    && this.sendBtn.addEventListener('click', () => this._sendInput());
    this.clearBtn   && this.clearBtn.addEventListener('click', () => this.clear());
    this.exportBtn  && this.exportBtn.addEventListener('click', () => this._export());
    this.copyBtn    && this.copyBtn.addEventListener('click', () => this._copyAll());
    this.inputEl    && this.inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') this._sendInput();
    });
    this.searchEl && this.searchEl.addEventListener('input', e => {
      this._searchTerm = (e.target.value || '').toLowerCase();
      this._applyFilter();
    });
    this.baudSel && this.baudSel.addEventListener('change', () => {
      this._baudWarned = false;
    });
  }

  isBaudMismatched() {
    if (!this.baudSel || !window.ArduinoSim) return false;
    const monitorBaud = parseInt(this.baudSel.value, 10);
    const codeBaud = window.ArduinoSim.serialBaud;
    return Number.isFinite(monitorBaud) && Number.isFinite(codeBaud) && monitorBaud !== codeBaud;
  }

  _warnBaudMismatch() {
    if (this._baudWarned) return;
    this._baudWarned = true;
    const codeBaud = window.ArduinoSim ? window.ArduinoSim.serialBaud : '?';
    this._appendLine(`⚠ Baud rate mismatch — code uses ${codeBaud} baud, monitor is set to ${this.baudSel.value} baud. Serial data suppressed.`, 'warning');
  }

  receive(text, type = 'data') {
    if (typeof text !== 'string' || !text) return;
    if (type === 'data' && this.isBaudMismatched()) {
      this._warnBaudMismatch();
      return;
    }
    this.buffer += text;
    // Never let an unflushed buffer grow without bound
    if (this.buffer.length > 131072) {
      this.buffer = this.buffer.slice(-131072);
    }
    // Buffer and flush on newline or after short delay
    if (!this._pendingFlush) {
      this._pendingFlush = setTimeout(() => {
        this._flush();
        this._pendingFlush = null;
      }, 16);
    }
    if (this.buffer.includes('\n')) {
      clearTimeout(this._pendingFlush);
      this._pendingFlush = null;
      this._flush();
    }
  }

  _flush() {
    if (!this.buffer || !this.outputEl) return;
    const lines = this.buffer.split('\n');
    this.buffer = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i < lines.length - 1) {
        this._appendLine(line, 'data');
      } else if (line.length > 0) {
        this._appendPartial(line, 'data');
      }
    }
  }

  _appendLine(text, type) {
    if (!this.outputEl) return;
    this.lineCount++;

    // Store for filter
    this._allLines.push({ text, type });
    if (this._allLines.length > this.maxLines) this._allLines.shift();

    // Enforce max DOM lines
    while (this.outputEl.childElementCount >= this.maxLines) {
      const first = this.outputEl.firstChild;
      if (first) this.outputEl.removeChild(first);
    }

    const span = this._buildLineEl(text, type);

    // Apply current filter
    if (this._searchTerm && !text.toLowerCase().includes(this._searchTerm)) {
      span.classList.add('serial-hidden');
    }

    this.outputEl.appendChild(span);
    this.outputEl.appendChild(document.createTextNode('\n'));

    this._updateLineCount();

    if (this.autoScroll && this.autoScroll.checked) {
      this.outputEl.scrollTop = this.outputEl.scrollHeight;
    }
  }

  _appendPartial(text, type) {
    if (!this.outputEl) return;
    const last = this.outputEl.lastElementChild;
    if (last && last.classList.contains('serial-line') && !last.dataset.complete) {
      last.innerHTML += this._escapeHtml(text);
    } else {
      const span = document.createElement('span');
      span.className = `serial-line ${type}`;
      span.innerHTML = (this.showTS && this.showTS.checked ? `<span class="serial-timestamp">${this._timestamp()}</span>` : '') + this._escapeHtml(text);
      this.outputEl.appendChild(span);
    }
    if (this.autoScroll && this.autoScroll.checked) {
      this.outputEl.scrollTop = this.outputEl.scrollHeight;
    }
  }

  _buildLineEl(text, type) {
    const span = document.createElement('span');
    span.className = `serial-line ${type}`;
    span.dataset.complete = '1';

    let content = '';
    if (this.showTS && this.showTS.checked) {
      content += `<span class="serial-timestamp">${this._timestamp()}</span>`;
    }
    if (this.showHex && this.showHex.checked) {
      content += `<span class="serial-hex">${this._toHex(text)}</span>  `;
    }
    content += this._escapeHtml(text);
    span.innerHTML = content;
    return span;
  }

  log(text, type = 'system') {
    this._appendLine(text, type);
  }

  clear() {
    if (this.outputEl) this.outputEl.innerHTML = '';
    this.lineCount = 0;
    this.buffer = '';
    this._allLines = [];
    this._updateLineCount();
  }

  _sendInput() {
    if (!this.inputEl) return;
    const text = this.inputEl.value;
    if (!text) return;
    let eol = (this.eolSel && this.eolSel.value) || '';
    // HTML option values store literal "\n" / "\r\n" — interpret as actual control characters
    eol = eol.replace(/\\r\\n/g, '\r\n').replace(/\\r/g, '\r').replace(/\\n/g, '\n');
    const toSend = text + eol;
    this.inputEl.value = '';

    this._appendLine(`> ${text}`, 'info');

    if (window.ArduinoSim) {
      window.ArduinoSim.sendSerialInput(toSend);
    }
  }

  _export() {
    if (!this.outputEl) return;
    const text = this._allLines.map(l => l.text).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial_log_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  _copyAll() {
    const text = this._allLines.map(l => l.text).join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        if (window.App) window.App.showToast('Serial output copied!', 'success');
      }).catch(() => this._fallbackCopy(text));
    } else {
      this._fallbackCopy(text);
    }
  }

  _fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    if (window.App) window.App.showToast('Serial output copied!', 'success');
  }

  _applyFilter() {
    if (!this.outputEl) return;
    const term = this._searchTerm;
    this.outputEl.querySelectorAll('.serial-line').forEach(el => {
      const text = el.textContent.toLowerCase();
      el.classList.toggle('serial-hidden', !!term && !text.includes(term));
    });
  }

  _updateLineCount() {
    if (this.lineCountEl) {
      this.lineCountEl.textContent = `${this.lineCount} line${this.lineCount !== 1 ? 's' : ''}`;
    }
  }

  _timestamp() {
    const now = new Date();
    return `[${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}]`;
  }

  _toHex(str) {
    return Array.from(str).map(c => c.charCodeAt(0).toString(16).padStart(2,'0').toUpperCase()).join(' ');
  }

  _escapeHtml(str) {
    return escapeHtml(str);
  }
}

window.SerialMonitor = null; // Set in app.js
window.SerialMonitorClass = SerialMonitor;
