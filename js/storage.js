/* ═══════════════════════════════════════════════════════
   storage.js — Save / Load / Share / Auto-save
   ═══════════════════════════════════════════════════════ */

'use strict';

const StorageManager = {
  VERSION: '2.0',
  LS_KEY: 'ardusim_project',
  LS_SETTINGS_KEY: 'ardusim_settings',
  LS_SAVED_KEY: 'ardusim_saved_projects',

  _lastSavedAt: null,
  _isDirty: false,

  /* ── Mark project as dirty (unsaved) ── */
  markDirty() {
    this._isDirty = true;
    this._updateDirtyIndicator();
  },

  markClean() {
    this._isDirty = false;
    this._updateDirtyIndicator();
  },

  isDirty() {
    return this._isDirty;
  },

  _updateDirtyIndicator() {
    const dot = document.getElementById('unsaved-dot');
    if (dot) dot.classList.toggle('hidden', !this._isDirty);
  },

  /* ── Version migration ── */
  _migrateProject(project) {
    if (!project || typeof project !== 'object') return null;
    if (!project.circuit || typeof project.circuit !== 'object') project.circuit = { components: [], wires: [] };
    if (!Array.isArray(project.circuit.components)) project.circuit.components = [];
    if (!Array.isArray(project.circuit.wires)) project.circuit.wires = [];
    if (typeof project.name !== 'string' || !project.name.trim()) project.name = 'Untitled Project';

    // v1.0/v1.1 → v2.0: migrate single code string to files dict
    if (!project.files || typeof project.files !== 'object' || Object.keys(project.files).length === 0) {
      const code = typeof project.code === 'string' ? project.code : '';
      project.files = { 'sketch.ino': code };
      delete project.code;
    }

    project.version = this.VERSION;
    return project;
  },

  /* ── Save project to the Saved Projects library ── */
  saveToLibrary(files, circuitData, projectName = 'Untitled Project', board2Code = '') {
    const projects = this.getSavedProjects();
    const project = {
      id:       this._genId(),
      version:  this.VERSION,
      savedAt:  new Date().toISOString(),
      name:     projectName,
      files:    files || { 'sketch.ino': '' },
      circuit:  circuitData,
      board2Code,
    };
    // Re-saving keeps the original id (upsert by project name)
    const idx = projects.findIndex(p => p.name === projectName);
    if (idx >= 0) { project.id = projects[idx].id; projects.splice(idx, 1); }
    projects.unshift(project);
    try {
      localStorage.setItem(this.LS_SAVED_KEY, JSON.stringify(projects));
      this._lastSavedAt = Date.now();
      this.markClean();
      this.showToast(`"${projectName}" saved to Saved Projects`, 'success');
      this._pushToServer(project);
      return project;
    } catch (e) {
      this.showToast('Save failed: ' + e.message, 'error');
      return null;
    }
  },

  getSavedProjects() {
    try { return JSON.parse(localStorage.getItem(this.LS_SAVED_KEY) || '[]'); }
    catch (e) { return []; }
  },

  deleteSavedProject(id) {
    const projects = this.getSavedProjects().filter(p => p.id !== id);
    try {
      localStorage.setItem(this.LS_SAVED_KEY, JSON.stringify(projects));
      this.showToast('Project deleted', 'success');
      this._deleteOnServer(id); // fire-and-forget
      return true;
    } catch (e) { return false; }
  },

  _genId() {
    return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  /* ── Backend sync (Node server) ── */
  async _serverAvailable() {
    try {
      return !!(window.ArduSimApi && await window.ArduSimApi.isAvailable());
    } catch (e) { return false; }
  },

  async _pushToServer(project) {
    try {
      if (await this._serverAvailable()) await window.ArduSimApi.saveProject(project);
    } catch (e) { /* offline / server down — local copy is kept */ }
  },

  async _deleteOnServer(id) {
    try {
      if (await this._serverAvailable()) await window.ArduSimApi.deleteProject(id);
    } catch (e) { /* ignore */ }
  },

  /* Pull server projects into localStorage, then push any local-only ones up.
     Returns { merged, pushed } so the caller can show a status toast. */
  async syncFromServer() {
    try {
      if (!(await this._serverAvailable())) return { merged: 0, pushed: 0 };
      const data = await window.ArduSimApi.listProjects();
      const serverProjects = Array.isArray(data) ? data : (data.projects || []);
      const local = this.getSavedProjects();
      const serverIds = new Set();

      for (const sp of serverProjects) {
        const mig = this._migrateProject(sp);
        if (!mig || !mig.id) continue;
        serverIds.add(mig.id);
        const idx = local.findIndex(l => l.id === mig.id);
        if (idx >= 0) local[idx] = mig;
        else local.unshift(mig);
      }

      localStorage.setItem(this.LS_SAVED_KEY, JSON.stringify(local));

      let pushed = 0;
      for (const lp of local) {
        if (!serverIds.has(lp.id)) {
          try { await window.ArduSimApi.saveProject(lp); pushed++; } catch (e) { /* ignore */ }
        }
      }
      return { merged: serverProjects.length, pushed };
    } catch (e) {
      return { merged: 0, pushed: 0 };
    }
  },

  /* ── Download project as JSON file ── */
  downloadProject(files, circuitData, projectName = 'ArduSim Project', board2Code = '') {
    const project = {
      version:  this.VERSION,
      savedAt:  new Date().toISOString(),
      name:     projectName,
      files:    files || { 'sketch.ino': '' },
      circuit:  circuitData,
    };
    if (board2Code) project.board2Code = board2Code;
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    const safeName = projectName.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
    a.download = `${safeName}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this._lastSavedAt = Date.now();
    this.markClean();
    this.showToast('Project downloaded!', 'success');
  },

  /* ── Download project as ZIP file ── */
  async downloadProjectZip(files, circuitData, projectName = 'ArduSim Project', board2Code = '') {
    // Load JSZip dynamically if not already available
    if (typeof JSZip === 'undefined') {
      try {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'js/lib/jszip.min.js';
          s.onload = resolve;
          s.onerror = () => reject(new Error('Failed to load jszip.min.js from local path'));
          document.head.appendChild(s);
        });
      } catch (e1) {
        try {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            s.onload = resolve;
            s.onerror = () => reject(new Error('Failed to load JSZip from CDN'));
            document.head.appendChild(s);
          });
        } catch (e2) {
          this.showToast('Could not load ZIP library. Please check your connection.', 'error');
          return;
        }
      }
    }
    const zip = new JSZip();

    // Project metadata
    const project = {
      version:  this.VERSION,
      savedAt:  new Date().toISOString(),
      name:     projectName,
      circuit:  circuitData,
    };
    if (board2Code) project.board2Code = board2Code;

    // Add project.json with metadata + circuit
    zip.file('project.json', JSON.stringify(project, null, 2));

    // Add each source file
    const allFiles = files || { 'sketch.ino': '' };
    const srcFolder = zip.folder('src');
    for (const [name, content] of Object.entries(allFiles)) {
      srcFolder.file(name, content || '');
    }

    // Generate ZIP and trigger download
    try {
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = projectName.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
      a.download = `${safeName}_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this._lastSavedAt = Date.now();
      this.markClean();
      this.showToast('Project downloaded as ZIP!', 'success');
    } catch (err) {
      console.error('[StorageManager] ZIP export failed:', err);
      this.showToast('ZIP export failed: ' + err.message, 'error');
    }
  },

  downloadExample(files, circuitData, name, description, tags, board2Code = '') {
    const id = name.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'custom_example';
    const example = {
      id,
      name,
      icon: '🔧',
      desc: description || `A custom ${name} circuit example.`,
      tags: String(tags || '').split(',').map(tag => tag.trim()).filter(Boolean),
      circuit: circuitData,
      files: files || { 'sketch.ino': '' },
    };
    if (board2Code) example.board2Code = board2Code;
    const json = JSON.stringify(example, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast(`Example JSON downloaded: ${id}.json`, 'success');
  },

  /* ── Load project from file ── */
  loadFromFile(callback) {
    const input = document.getElementById('file-input');
    if (!input) return;
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const raw = JSON.parse(ev.target.result);
          const project = this._migrateProject(raw);
          if (!project) throw new Error('Invalid project file');
          callback(project);
          this._lastSavedAt = Date.now();
          this.markClean();
          this.showToast(`"${project.name}" loaded!`, 'success');
        } catch (err) {
          this.showToast('Failed to load project: ' + err.message, 'error');
        }
      };
      reader.onerror = () => this.showToast('Could not read file', 'error');
      reader.readAsText(file);
      input.value = '';
    };
    input.click();
  },

  /* ── Save to localStorage (auto-save) ── */
  autoSave(files, circuitData, projectName = 'Untitled Project', board2Code = '') {
    try {
      const project = {
        version:   this.VERSION,
        files:     files || { 'sketch.ino': '' },
        circuit:   circuitData,
        name:      projectName,
        savedAt:   Date.now(),
      };
      if (board2Code) project.board2Code = board2Code;
      const json = JSON.stringify(project);
      localStorage.setItem(this.LS_KEY, json);
      this._lastSavedAt = Date.now();
      this.markClean();
      this._updateAutoSaveStatus();
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        this.showToast('Auto-save failed: browser storage is full. Please save your project to a file.', 'error');
      }
      // Silently ignore other errors
    }
  },

  _updateAutoSaveStatus() {
    const el = document.getElementById('autosave-status');
    if (!el || !this._lastSavedAt) return;
    const d = new Date(this._lastSavedAt);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    el.textContent = `Auto-saved ${hh}:${mm}:${ss}`;
    el.title = `Last auto-saved at ${d.toLocaleString()}`;
  },

  /* ── Load from localStorage ── */
  autoLoad() {
    try {
      const raw = localStorage.getItem(this.LS_KEY);
      if (!raw) return null;
      const project = JSON.parse(raw);
      return this._migrateProject(project);
    } catch (e) { return null; }
  },

  /* ── Share via URL ── */
  shareUrl(files, circuitData, board2Code = '') {
    try {
      const data = JSON.stringify({ files, circuit: circuitData, board2Code: board2Code || undefined });
      // Use btoa with URI encoding for unicode safety
      const compressed = btoa(unescape(encodeURIComponent(data)));
      const url = `${window.location.origin}${window.location.pathname}?project=${compressed}`;
      if (url.length > 8000) {
        this.showToast('Project too large to share via URL. Please use the Save file option.', 'warn');
        return;
      }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url)
          .then(() => this.showToast('Share URL copied to clipboard!', 'success'))
          .catch(() => this._fallbackCopy(url));
      } else {
        this._fallbackCopy(url);
      }
    } catch (e) {
      this.showToast('Failed to generate share URL', 'error');
    }
  },

  /* ── Load from URL ── */
  loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('project');
    if (!encoded) return null;
    try {
      const raw = decodeURIComponent(escape(atob(encoded)));
      const project = JSON.parse(raw);
      return this._migrateProject(project);
    } catch (e) { return null; }
  },

  /* ── Save settings ── */
  saveSettings(settings) {
    try {
      localStorage.setItem(this.LS_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
  },

  /* ── Load settings ── */
  loadSettings() {
    try {
      const raw = localStorage.getItem(this.LS_SETTINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },

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
    this.showToast('Share URL copied!', 'success');
  },

  showToast(msg, type = 'info') {
    if (window.App) window.App.showToast(msg, type);
  },
};

window.StorageManager = StorageManager;
