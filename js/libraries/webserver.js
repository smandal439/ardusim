window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['WebServer'] = {
  classes: ['WebServer'],
  includes: ['<ESP8266WebServer.h>', '<WebServer.h>'],
  constructor: function(port) {
    return { __webserver: true, port: port };
  },
  transpile: [
    [/(\w+)\.begin\s*\(\s*\)/g, '_a.serverBegin($1)'],
    [/(\w+)\.on\(/g, '_a.serverOn($1, '],
    [/(\w+)\.send\(/g, '_a.serverSend($1, '],
    [/(\w+)\.hasArg\(/g, '_a.serverHasArg($1, '],
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
  runtime: function(self) {
    function _serveRootPage(cfg) {
      if (!cfg.routes.length) return;
      var rootRoute = cfg.routes[0];
      self._webResp = null;
      cfg._routeParams = {};
      Promise.resolve()
        .then(function() { return rootRoute.handler(); })
        .then(function() {
          var resp = self._webResp || { code: 200, type: 'text/html', content: '' };
          if (resp.type.indexOf('html') !== -1 && resp.content && self._emitWebPage) {
            self._emitWebPage({ code: resp.code, type: resp.type, content: resp.content, url: rootRoute.path, method: rootRoute.method });
          }
        })
        .catch(function(e) {
          if (self._serialLog) self._serialLog('[WebServer] Root page error: ' + (e && e.message ? e.message : e) + '\n', 'system');
        });
    }

    return {
      serverBegin: function(server) {
        self._serialLog('[WebServer] Server started on port ' + (server && server.port ? server.port : 80) + '\n', 'system');
        var cfg = self._web;
        if (cfg) cfg._started = true;
      },
      serverOn: function(server, path, m3, m4) {
        var cfg = (self._web = self._web || { port: 80, routes: [], _pendingRequests: [] });
        var handler = typeof m3 === 'function' ? m3 : m4;
        var method = typeof m3 === 'function' ? 'GET' : String(m3 || 'GET').replace('HTTP_', '');
        if (typeof handler === 'function') {
          cfg.routes.push({ path: String(path), method: method, handler: handler });
          self._serialLog('[WebServer] Route registered: ' + method + ' ' + path + '\n', 'system');
        } else {
          self._serialLog('[WebServer] on("' + path + '"): handler is not a function - route ignored\n', 'system');
        }
        if (!cfg._triggerRoute) {
          cfg._triggerRoute = function(targetPath) {
            var cleanPath = targetPath;
            var params = {};
            var qIdx = targetPath.indexOf('?');
            if (qIdx !== -1) {
              cleanPath = targetPath.substring(0, qIdx);
              targetPath.substring(qIdx + 1).split('&').forEach(function(pair) {
                var kv = pair.split('=');
                if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
              });
            }
            cfg._routeParams = params;
            for (var i = 0; i < cfg.routes.length; i++) {
              if (cfg.routes[i].path === cleanPath) {
                var route = cfg.routes[i];
                self._webResp = null;
                Promise.resolve()
                  .then(function() {
                    return route.handler();
                  })
                  .then(function() {
                    var resp = self._webResp || { code: 200, type: 'text/plain', content: '' };
                    self._serialLog('[WebServer] ' + route.method + ' ' + route.path + ' -> ' + resp.code + '\n', 'system');
                    if (resp.type.indexOf('html') !== -1 && resp.content && self._emitWebPage) {
                      self._emitWebPage({ code: resp.code, type: resp.type, content: resp.content, url: route.path, method: route.method });
                    } else if (cleanPath !== '/' && !self._webResp) {
                      _serveRootPage(cfg);
                    }
                  })
                  .catch(function(e) {
                    self._serialLog('[WebServer] Trigger error (' + route.path + '): ' + (e && e.message ? e.message : e) + '\n', 'system');
                  });
                return;
              }
            }
            self._serialLog('[WebServer] Route not found: ' + targetPath + '\n', 'system');
          };
        }
      },
      serverSend: function(server, code, type, content) {
        self._webResp = { code: Number(code) || 200, type: String(type || ''), content: String(content || '') };
      },
      serverArg: function(server, name) {
        var cfg = self._web;
        if (cfg && cfg._routeParams && cfg._routeParams[name] !== undefined) {
          return cfg._routeParams[name];
        }
        return '';
      },
      serverHasArg: function(server, name) {
        var cfg = self._web;
        return !!(cfg && cfg._routeParams && cfg._routeParams[name] !== undefined);
      },
      serverHandleClient: function(server) {
        var cfg = self._web;
        if (!cfg || !cfg.routes.length) return;
        if (!cfg._pendingRequests) cfg._pendingRequests = [];
        if (cfg._pendingRequests.length > 0) {
          var req = cfg._pendingRequests.shift();
          self._webResp = null;
          cfg._routeParams = req.params;
          Promise.resolve()
            .then(function() { return req.route.handler(); })
            .then(function() {
              var resp = self._webResp || { code: 200, type: 'text/html', content: '' };
              if (self._serialLog) self._serialLog('[WebServer] ' + req.route.method + ' ' + req.route.path + ' -> ' + resp.code + ' (' + resp.type + ')\n', 'system');
              if (resp.type.indexOf('html') !== -1 && resp.content && self._emitWebPage) {
                self._emitWebPage({ code: resp.code, type: resp.type, content: resp.content, url: req.route.path, method: req.route.method });
              } else if (req.route.path !== '/' && !self._webResp) {
                _serveRootPage(cfg);
              }
            })
            .catch(function(e) {
              if (self._serialLog) self._serialLog('[WebServer] ' + req.route.method + ' ' + req.route.path + ' handler error: ' + (e && e.message ? e.message : e) + '\n', 'system');
            });
        } else if (!cfg._servedInitial && cfg._started) {
          cfg._servedInitial = true;
          _serveRootPage(cfg);
        }
      },
    };
  },
};
