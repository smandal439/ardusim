/* -------------------------------------------------------
   api.js — Frontend client for the ArduSim Node backend
   Talks to the REST API served by server.js (same origin).
   When the app is opened without the backend (e.g. file://),
   every call falls back gracefully and returns empty results.
   ------------------------------------------------------- */

'use strict';

const ArduSimApi = {
  base: '/api',
  _timeoutMs: 2500,

  /* Best-effort check: is the Node backend reachable? */
  async isAvailable() {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), this._timeoutMs);
      const res = await fetch(this.base + '/health', { signal: ctrl.signal });
      clearTimeout(timer);
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  async _req(method, url, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this._timeoutMs);
    opts.signal = ctrl.signal;
    try {
      const res = await fetch(this.base + url, opts);
      clearTimeout(timer);
      if (!res.ok) throw new Error(`API ${method} ${url} -> ${res.status}`);
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  },

  listProjects()   { return this._req('GET', '/projects'); },
  getProject(id)   { return this._req('GET', '/projects/' + encodeURIComponent(id)); },
  saveProject(p)   { return this._req('POST', '/projects', p); },
  deleteProject(id){ return this._req('DELETE', '/projects/' + encodeURIComponent(id)); },
  listExamples()   { return this._req('GET', '/examples'); },
};

window.ArduSimApi = ArduSimApi;