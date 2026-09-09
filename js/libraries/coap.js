// js/libraries/coap.js — CoAP Plugin for ESP32
//
// Simulates CoAP (Constrained Application Protocol) over UDP.
// Supports client (GET/PUT/POST/DELETE) and server with mock resources.
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['CoAP'] = {
  priority: 54,
  classes: ['CoapClient', 'CoapServer'],
  includes: ['<CoapClient.h>', '<CoapServer.h>'],

  transpile: [
    // CoapClient varName; → var varName = _a.coapCreateClient();
    [/\bCoapClient\s+(\w+)\s*;/g, 'var $1 = _a.coapCreateClient();'],

    // CoapServer varName(port); → var varName = _a.coapCreateServer(port);
    [/\bCoapServer\s+(\w+)\s*\(\s*(\d+)\s*\)/g, 'var $1 = _a.coapCreateServer($2);'],
    [/\bCoapServer\s+(\w+)\s*;/g, 'var $1 = _a.coapCreateServer(5683);'],

    // CoapResponse varName; → var varName = { code: 0, payload: null, valid: false };
    [/\bCoapResponse\s+(\w+)\s*;/g, 'var $1 = { code: 0, payload: null, valid: false };'],

    // varName.get(url) → _a.coapGet(varName, url)
    [/\b(\w+)\.get\s*\(\s*("[^"]*"|'[^']*')\s*\)/g, '_a.coapGet($1, $2)'],
    [/\b(\w+)\.get\s*\(\s*(\w+)\s*\)/g, '_a.coapGet($1, $2)'],

    // varName.put(url, data) → _a.coapPut(varName, url, data)
    [/\b(\w+)\.put\s*\(\s*("[^"]*"|'[^']*')\s*,\s*([^)]+)\)/g, '_a.coapPut($1, $2, $3)'],
    [/\b(\w+)\.put\s*\(\s*(\w+)\s*,\s*([^)]+)\)/g, '_a.coapPut($1, $2, $3)'],

    // varName.post(url, data) → _a.coapPost(varName, url, data)
    [/\b(\w+)\.post\s*\(\s*("[^"]*"|'[^']*')\s*,\s*([^)]+)\)/g, '_a.coapPost($1, $2, $3)'],
    [/\b(\w+)\.post\s*\(\s*(\w+)\s*,\s*([^)]+)\)/g, '_a.coapPost($1, $2, $3)'],

    // varName.delete(url) → _a.coapDelete(varName, url)
    [/\b(\w+)\.delete\s*\(\s*("[^"]*"|'[^']*')\s*\)/g, '_a.coapDelete($1, $2)'],
    [/\b(\w+)\.delete\s*\(\s*(\w+)\s*\)/g, '_a.coapDelete($1, $2)'],

    // varName.loop() → _a.coapLoop(varName)
    [/\b(\w+)\.loop\s*\(\s*\)/g, '_a.coapLoop($1)'],

    // Server methods
    // server.add_resource(path, handlerFn) → _a.coapAddResource(server, path, handlerFn)
    [/\b(\w+)\.add_resource\s*\(\s*("[^"]*"|'[^']*')\s*,\s*(\w+)\s*\)/g, '_a.coapAddResource($1, $2, $3)'],
    // server.start() → _a.coapServerStart(server)
    [/\b(\w+)\.start\s*\(\s*\)/g, '_a.coapServerStart($1)'],

    // CoapOption varName(index); → var varName = _a.coapOption(index);
    [/\bCoapOption\s+(\w+)\s*\(\s*(\d+)\s*\)/g, 'var $1 = _a.coapOption($2)'],
    [/\bCoapOption\s+(\w+)\s*;/g, 'var $1 = _a.coapOption(0)'],
  ],

  constants: {
    COAP_GET: 1,
    COAP_POST: 2,
    COAP_PUT: 3,
    COAP_DELETE: 4,
    COAP_OK: 0,
    COAP_CREATED: 65,
    COAP_DELETED: 66,
    COAP_VALID: 67,
    COAP_CHANGED: 68,
    COAP_CONTENT: 69,
    COAP_BAD_REQUEST: 128,
    COAP_UNAUTHORIZED: 129,
    COAP_NOT_FOUND: 132,
    COAP_METHOD_NOT_ALLOWED: 133,
    COAP_INTERNAL_ERROR: 160,
    COAP_SERVICE_UNAVAILABLE: 163,
    COAP_OPTION_URI_HOST: 3,
    COAP_OPTION_URI_PORT: 7,
    COAP_OPTION_URI_PATH: 11,
    COAP_OPTION_URI_QUERY: 15,
  },

  runtime: function(self) {
    // ── Simulated CoAP server resources (shared across all instances) ──
    if (!window._coapServerState) {
      window._coapServerState = {
        servers: {},       // serverId → { port, resources: { path: handlerFn } }
        nextServerId: 0,
        defaultResources: {
          '/sensor/temp': function() { return JSON.stringify({ temperature: 22.5 + Math.random() * 5, unit: 'C' }); },
          '/sensor/humidity': function() { return JSON.stringify({ humidity: 45 + Math.random() * 20, unit: '%' }); },
          '/sensor/light': function() { return JSON.stringify({ lux: 100 + Math.random() * 900 }); },
          '/led': function() { return JSON.stringify({ state: 'off', color: '#000000' }); },
          '/system/info': function() { return JSON.stringify({ uptime: Math.floor(Date.now() / 1000), freeHeap: 200000 + Math.floor(Math.random() * 50000) }); },
        },
        serverStates: {},  // serverId → { started, resources }
      };
    }
    const state = window._coapServerState;

    function _parseUrl(url) {
      var str = typeof url === 'string' ? url : String(url);
      // Strip quotes
      str = str.replace(/^["']|["']$/g, '');
      // Remove coap:// prefix
      str = str.replace(/^coap:\/\//, '');
      // Remove host:port prefix if present
      var pathStart = str.indexOf('/');
      if (pathStart >= 0) return str.substring(pathStart);
      return str.startsWith('/') ? str : '/' + str;
    }

    function _resolveResponse(respObj, code, payload) {
      if (respObj) {
        respObj.code = code;
        respObj.payload = payload;
        respObj.valid = true;
      }
    }

    return {
      coapCreateClient: function() {
        return {
          __coapClient: true,
          _pending: null,
        };
      },

      coapCreateServer: function(port) {
        var id = state.nextServerId++;
        state.servers[id] = {
          port: port || 5683,
          resources: {},
          started: false,
        };
        // Pre-populate with default resources
        for (var path in state.defaultResources) {
          state.servers[id].resources[path] = state.defaultResources[path];
        }
        state.serverStates[id] = { started: false, resources: {} };
        return { __coapServer: true, _id: id, _port: port || 5683 };
      },

      coapOption: function(index) {
        return { index: index };
      },

      coapGet: function(client, url) {
        var path = _parseUrl(url);
        self._serialLog('[CoAP] GET ' + path + '\n', 'system');

        // Find a running server that has this resource
        var result = null;
        for (var sid in state.servers) {
          var srv = state.servers[sid];
          if (srv.started && srv.resources[path]) {
            try {
              result = srv.resources[path]();
            } catch (e) {
              result = null;
            }
            break;
          }
        }

        if (result === null) {
          // Return 404
          self._serialLog('[CoAP] 404 Not Found: ' + path + '\n', 'system');
          return { code: 132, payload: '{"error":"not found"}', valid: true };
        }

        self._serialLog('[CoAP] 205 Content: ' + result + '\n', 'system');
        return { code: 69, payload: result, valid: true };
      },

      coapPut: function(client, url, data) {
        var path = _parseUrl(url);
        var payload = typeof data === 'string' ? data : JSON.stringify(data);
        self._serialLog('[CoAP] PUT ' + path + ' <- ' + payload + '\n', 'system');

        // Check if server has this resource
        for (var sid in state.servers) {
          var srv = state.servers[sid];
          if (srv.started) {
            if (srv.resources[path]) {
              // Update resource
              var prevHandler = srv.resources[path];
              var value = payload;
              srv.resources[path] = function() { return value; };
              self._serialLog('[CoAP] 204 Changed: ' + path + '\n', 'system');
              return { code: 68, payload: '', valid: true };
            } else {
              // Create new resource
              var val = payload;
              srv.resources[path] = function() { return val; };
              self._serialLog('[CoAP] 201 Created: ' + path + '\n', 'system');
              return { code: 65, payload: '', valid: true };
            }
          }
        }
        self._serialLog('[CoAP] 163 Service Unavailable\n', 'system');
        return { code: 163, payload: '{"error":"no server"}', valid: true };
      },

      coapPost: function(client, url, data) {
        var path = _parseUrl(url);
        var payload = typeof data === 'string' ? data : JSON.stringify(data);
        self._serialLog('[CoAP] POST ' + path + ' <- ' + payload + '\n', 'system');

        // Simulate POST to existing resource
        for (var sid in state.servers) {
          var srv = state.servers[sid];
          if (srv.started && srv.resources[path]) {
            try {
              var result = srv.resources[path](payload);
              return { code: 69, payload: result || '', valid: true };
            } catch (e) {
              return { code: 160, payload: '{"error":"internal"}', valid: true };
            }
          }
        }
        return { code: 132, payload: '{"error":"not found"}', valid: true };
      },

      coapDelete: function(client, url) {
        var path = _parseUrl(url);
        self._serialLog('[CoAP] DELETE ' + path + '\n', 'system');

        for (var sid in state.servers) {
          var srv = state.servers[sid];
          if (srv.started && srv.resources[path]) {
            delete srv.resources[path];
            self._serialLog('[CoAP] 66 Deleted: ' + path + '\n', 'system');
            return { code: 66, payload: '', valid: true };
          }
        }
        return { code: 132, payload: '{"error":"not found"}', valid: true };
      },

      coapLoop: function(clientOrServer) {
        // No-op in simulation; real CoAP would poll for responses
      },

      coapAddResource: function(serverObj, path, handlerFn) {
        if (serverObj && serverObj.__coapServer) {
          var srv = state.servers[serverObj._id];
          if (srv) {
            // Wrap the handler to return a string
            var fn = handlerFn;
            srv.resources[path] = function(payload) {
              try {
                return fn(payload || '');
              } catch (e) {
                return '{"error":"handler failed"}';
              }
            };
            self._serialLog('[CoAP] Resource added: ' + path + '\n', 'system');
          }
        }
      },

      coapServerStart: function(serverObj) {
        if (serverObj && serverObj.__coapServer) {
          var srv = state.servers[serverObj._id];
          if (srv) {
            srv.started = true;
            self._serialLog('[CoAP] Server started on port ' + srv.port + '\n', 'system');
            self._serialLog('[CoAP] Resources: ' + Object.keys(srv.resources).join(', ') + '\n', 'system');
          }
        }
      },
    };
  },

  constructor: {
    CoapClient: function() {
      return window.ArduinoLibs['CoAP'].runtime(this).coapCreateClient();
    },
    CoapServer: function(port) {
      return window.ArduinoLibs['CoAP'].runtime(this).coapCreateServer(port);
    },
  },
};
