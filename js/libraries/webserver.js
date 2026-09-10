window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['WebServer'] = {
  classes: ['WebServer'],
  includes: ['<ESP8266WebServer.h>', '<WebServer.h>'],
  constructor: function(port) {
    return { __class: 'WebServer', port: port };
  },
  transpile: [
    [/(\w+)\.on\(/g, '_a.serverOn($1, '],
    [/(\w+)\.send\(/g, '_a.serverSend($1, '],
    [/(\w+)\.arg\(/g, '_a.serverArg($1, '],
    [/(\w+)\.handleClient\(/g, '_a.serverHandleClient($1, '],
  ],
  constants: {
    HTTP_GET: 'GET',
    HTTP_POST: 'POST',
    HTTP_PUT: 'PUT',
    HTTP_DELETE: 'DELETE',
    HTTP_HEAD: 'HEAD',
    HTTP_OPTIONS: 'OPTIONS',
    HTTP_PATCH: 'PATCH',
    HTTP_ANY: 'ANY',
  },
  constructor: function(port) {
    return { __webserver: true, port: port };
  },
  runtime: function(self) {
    return {
      serverOn: function(server, path, m3, m4) {
        var cfg = (self._web = self._web || { port: 80, routes: [], reqIdx: 0, lastHit: 0 });
        var handler = typeof m3 === 'function' ? m3 : m4;
        var method = typeof m3 === 'function' ? 'GET' : String(m3 || 'GET').replace('HTTP_', '');
        if (typeof handler === 'function') {
          cfg.routes.push({ path: String(path), method: method, handler: handler });
          self._serialLog('[WebServer] Route registered: ' + method + ' ' + path + '\n', 'system');
        } else {
          self._serialLog('[WebServer] on("' + path + '"): handler is not a function - route ignored\n', 'system');
        }
      },
      serverSend: function(server, code, type, content) {
        self._webResp = { code: Number(code) || 200, type: String(type || ''), content: String(content || '') };
      },
      serverArg: function(server, name) { return ''; },
      serverHandleClient: function(server) {
        var cfg = self._web;
        if (!cfg || !cfg.routes.length) return;
        var now = Date.now();
        if (now - (cfg.lastHit || 0) < 1500) return;
        cfg.lastHit = now;
        var route = cfg.routes[cfg.reqIdx = ((cfg.reqIdx || 0) % cfg.routes.length)];
        cfg.reqIdx++;
        self._webResp = null;
        Promise.resolve()
          .then(function() { return route.handler(); })
          .then(function() {
            var resp = self._webResp || { code: 200, type: 'text/html', content: '' };
            self._serialLog('[WebServer] ' + route.method + ' ' + route.path + ' -> ' + resp.code + ' (' + resp.type + ')\n', 'system');
          })
          .catch(function(e) {
            self._serialLog('[WebServer] ' + route.method + ' ' + route.path + ' handler error: ' + (e && e.message ? e.message : e) + '\n', 'system');
          });
      },
    };
  },
};
