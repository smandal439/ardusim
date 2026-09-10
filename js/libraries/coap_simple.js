// js/libraries/coap_simple.js — coap-simple.h Plugin for ESP32
//
// Simulates the coap-simple.h library with callback-based server API:
//   Coap coap(udp);
//   coap.server(callback, "path");
//   coap.start();
//   coap.loop();
//   coap.sendResponse(ip, port, msgid, resp);
//
// Cross-board communication uses shared window._coapServerState (same as CoapServer/CoapClient).
// Callback signature: void callback(CoapPacket &packet, IPAddress ip, int port)

window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['CoAP-Simple'] = {
  priority: 53,  // runs before the existing CoAP plugin (54)
  classes: [],
  includes: ['<coap-simple.h>', '<WiFiUdp.h>'],

  transpile: [
    // WiFiUDP varName; → var varName = {};
    [/\bWiFiUDP\s+(\w+)\s*;/g, 'var $1 = {};'],

    // Coap varName(udpVar); → var varName = _a.coapSimpleCreate();
    [/\bCoap\s+(\w+)\s*\(\s*(\w+)\s*\)\s*;/g, 'var $1 = _a.coapSimpleCreate();'],
    // Coap varName; → var varName = _a.coapSimpleCreate();
    [/\bCoap\s+(\w+)\s*;/g, 'var $1 = _a.coapSimpleCreate();'],

    // CoapPacket &varName (parameter in callback signature) → varName
    // Must run before CoapPacket varName; rule
    [/\bCoapPacket\s*&\s*/g, ''],

    // CoapPacket varName; → var varName = { payload: null, payloadlen: 0, messageid: 0 };
    [/\bCoapPacket\s+(\w+)\s*;/g, 'var $1 = { payload: null, payloadlen: 0, messageid: 0 };'],

    // CoapPacket *varName; → var varName = { payload: null, payloadlen: 0, messageid: 0 };
    [/\bCoapPacket\s*\*\s*(\w+)\s*;/g, 'var $1 = { payload: null, payloadlen: 0, messageid: 0 };'],

    // IPAddress varName; → var varName = {};
    [/\bIPAddress\s+(\w+)\s*;/g, 'var $1 = {};'],
    // IPAddress varName(a, b, c, d); → var varName = [a, b, c, d];
    [/\bIPAddress\s+(\w+)\s*\(\s*([^)]+)\s*\)\s*;/g, 'var $1 = [$2];'],

    // Strip IPAddress type in parameter lists: IPAddress ip → ip
    // (runs after the more specific IPAddress rules above)
    [/\bIPAddress\s+/g, ''],

    // varName.server(callbackFn, "path") → _a.coapSimpleServer(varName, callbackFn, "path")
    [/\b(\w+)\.server\s*\(\s*(\w+)\s*,\s*("[^"]*"|'[^']*')\s*\)/g, '_a.coapSimpleServer($1, $2, $3)'],

    // varName.start() → _a.coapSimpleStart(varName)
    // NOTE: intentionally NOT included here — coap.js .start() rule handles it
    // and coapServerStart is patched to support __coapSimple objects too.

    // varName.loop() → await _a.coapSimpleLoop(varName)
    // NOTE: intentionally NOT included here — coap.js .loop() rule handles it

    // varName.sendResponse(ip, port, msgid, resp) → _a.coapSimpleSendResponse(varName, ip, port, msgid, resp)
    [/\b(\w+)\.sendResponse\s*\(([^)]+)\)/g, '_a.coapSimpleSendResponse($1, $2)'],
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
  },

  runtime: function(self) {
    // Ensure shared state exists (used by both coap.js and coap_simple.js)
    if (!window._coapServerState) {
      window._coapServerState = {
        servers: {},
        nextServerId: 0,
        defaultResources: {},
        serverStates: {},
      };
    }
    var state = window._coapServerState;

    return {
      coapSimpleCreate: function() {
        var id = state.nextServerId++;
        state.servers[id] = {
          port: 5683,
          resources: {},
          started: false,
          isCallbackBased: true,
        };
        state.serverStates[id] = { started: false, resources: {} };
        return { __coapSimple: true, _id: id, _pendingResponse: null };
      },

      coapSimpleServer: function(serverObj, handlerFn, path) {
        if (serverObj && serverObj.__coapSimple) {
          var srv = state.servers[serverObj._id];
          if (srv) {
            // Normalize path: ensure leading slash (matches coap.js _parseUrl behavior)
            var normalizedPath = path;
            if (typeof path === 'string') {
              normalizedPath = path.replace(/^["']|["']$/g, '');
              if (!normalizedPath.startsWith('/')) normalizedPath = '/' + normalizedPath;
            }
            var fn = handlerFn;
            var serverRef = serverObj;
            srv.resources[normalizedPath] = async function(payload) {
              // Build a mock CoapPacket
              var packet = {
                payload: payload || '',
                payloadlen: (payload || '').length,
                messageid: Math.floor(Math.random() * 65535),
              };
              // Mock IPAddress for the "remote client"
              var ip = [192, 168, 4, 2];
              var port = 5684;

              // Reset pending response
              serverRef._pendingResponse = null;

              try {
                await fn(packet, ip, port);
              } catch (e) {
                self._serialLog('[CoAP-Simple] Callback error: ' + e.message + '\n', 'error');
              }

              // Return whatever sendResponse set, or default
              if (serverRef._pendingResponse !== null) {
                return serverRef._pendingResponse;
              }
              return '';
            };
            self._serialLog('[CoAP-Simple] Resource registered: ' + normalizedPath + '\n', 'system');
          }
        }
      },

      coapSimpleStart: function(serverObj) {
        if (serverObj && serverObj.__coapSimple) {
          var srv = state.servers[serverObj._id];
          if (srv) {
            srv.started = true;
            self._serialLog('[CoAP-Simple] Server started on port ' + srv.port + '\n', 'system');
            self._serialLog('[CoAP-Simple] Resources: ' + Object.keys(srv.resources).join(', ') + '\n', 'system');
          }
        }
      },

      coapSimpleLoop: function(serverObj) {
        // No-op in simulation; real coap-simple would poll for UDP packets
      },

      coapSimpleSendResponse: function(serverObj, ip, port, msgid, resp) {
        if (serverObj && serverObj.__coapSimple) {
          var responseStr = typeof resp === 'string' ? resp : String(resp);
          serverObj._pendingResponse = responseStr;
          self._serialLog('[CoAP-Simple] Response sent: ' + responseStr + '\n', 'system');
        }
      },
    };
  },
};
