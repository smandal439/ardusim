// js/libraries/gsm.js — GSM / 4G LTE / 5G NR Plugin (Sandeep Mistry style)
//
// Simulates cellular GSM modules (SIM800/SIM900 2G, Quectel EC25/BG96 4G LTE,
// u-blox SARA-R5 5G NR) using AT commands over UART.
// Cross-board SMS / voice / USSD / TCP / HTTP delivery via shared bus
// (window._gsmBus), matching the LoRa / ZigBee plugin pattern.
//
// Supported AT command families:
//   Network:   AT, AT+COPS, AT+CREG, AT+CGDCONT, AT+CGACT
//   SMS:       AT+CMGF, AT+CMGS, AT+CMGR, AT+CMGL, AT+CNMI
//   Voice:     ATD, ATA, ATH/AT+CHUP
//   USSD:      AT+CUSD
//   TCP/IP:    AT+CIPSTART, AT+CIPSEND, AT+CIPCLOSE, AT+CIPSTATUS
//   HTTP:      AT+HTTPINIT, AT+HTTPPARA, AT+HTTPACTION, AT+HTTPREAD, AT+HTTPTERM
//   Misc:      AT+CUSD, AT+CSQ, AT+CPIN, AT+IMEI
//
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['GSM'] = {
  // Run early (before SD priority 50) so GSM.print() isn't hijacked by SD's
  // broad print rule.
  priority: 40,
  classes: [],
  includes: ['<GSM.h>'],

  transpile: [
    // GSM gsm; → var gsm = {};
    [/\bGSM\s+(\w+)\s*;/g, 'var $1 = {};'],

    // gsm.begin() → _a.gsmBegin()
    [/\bgsm\.begin\s*\(\s*\)/g, '_a.gsmBegin()'],

    // gsm.setBand(band) → _a.gsmSetBand(band)
    [/\bgsm\.setBand\s*\(\s*(\d+)\s*\)/g, '_a.gsmSetBand($1)'],

    // gsm.sendSMS(number, text) → _a.gsmSendSMS(number, text)
    [/\bgsm\.sendSMS\s*\(\s*([^,]+)\s*,\s*([^)]+)\)/g, '_a.gsmSendSMS($1, $2)'],

    // gsm.readSMS() → _a.gsmReadSMS()
    [/\bgsm\.readSMS\s*\(\s*\)/g, '_a.gsmReadSMS()'],

    // gsm.makeCall(number) → _a.gsmMakeCall(number)
    [/\bgsm\.makeCall\s*\(\s*([^)]+)\)/g, '_a.gsmMakeCall($1)'],

    // gsm.answerCall() → _a.gsmAnswerCall()
    [/\bgsm\.answerCall\s*\(\s*\)/g, '_a.gsmAnswerCall()'],

    // gsm.hangup() → _a.gsmHangup()
    [/\bgsm\.hangup\s*\(\s*\)/g, '_a.gsmHangup()'],

    // gsm.sendUSSD(code) → _a.gsmSendUSSD(code)
    [/\bgsm\.sendUSSD\s*\(\s*([^)]+)\)/g, '_a.gsmSendUSSD($1)'],

    // gsm.httpGet(url) → _a.gsmHttpGet(url)
    [/\bgsm\.httpGet\s*\(\s*([^)]+)\)/g, '_a.gsmHttpGet($1)'],

    // gsm.httpPost(url, body) → _a.gsmHttpPost(url, body)
    [/\bgsm\.httpPost\s*\(\s*([^,]+)\s*,\s*([^)]+)\)/g, '_a.gsmHttpPost($1, $2)'],

    // gsm.httpRead() → _a.gsmHttpRead()
    [/\bgsm\.httpRead\s*\(\s*\)/g, '_a.gsmHttpRead()'],

    // gsm.tcpConnect(host, port) → _a.gsmTcpConnect(host, port)
    [/\bgsm\.tcpConnect\s*\(\s*([^,]+)\s*,\s*([^)]+)\)/g, '_a.gsmTcpConnect($1, $2)'],

    // gsm.tcpSend(data) → _a.gsmTcpSend(data)
    [/\bgsm\.tcpSend\s*\(\s*([^)]+)\)/g, '_a.gsmTcpSend($1)'],

    // gsm.tcpClose() → _a.gsmTcpClose()
    [/\bgsm\.tcpClose\s*\(\s*\)/g, '_a.gsmTcpClose()'],

    // gsm.signalQuality() → _a.gsmSignalQuality()
    [/\bgsm\.signalQuality\s*\(\s*\)/g, '_a.gsmSignalQuality()'],

    // gsm.getIMEI() → _a.gsmGetIMEI()
    [/\bgsm\.getIMEI\s*\(\s*\)/g, '_a.gsmGetIMEI()'],
  ],

  constants: {
    // Network registration
    GSM_REG_NOT_REGISTERED: 0,
    GSM_REG_HOME: 1,
    GSM_REG_SEARCHING: 2,
    GSM_REG_DENIED: 3,
    GSM_REG_UNKNOWN: 4,
    GSM_REG_ROAMING: 5,

    // SMS
    GSM_SMS_TEXT_MODE: 1,
    GSM_SMS_PDU_MODE: 0,

    // USSD
    GSM_USSD_NOTIFY: 0,
    GSM_USSD_REQUEST: 1,
    GSM_USSD_REQUEST_NOTIFY: 2,

    // HTTP methods
    HTTP_GET: 0,
    HTTP_POST: 1,
    HTTP_HEAD: 2,

    // Band presets (2G / 4G / 5G)
    GSM_BAND_850: 850,
    GSM_BAND_900: 900,
    GSM_BAND_1800: 1800,
    GSM_BAND_1900: 1900,
    LTE_B1: 1, LTE_B3: 3, LTE_B5: 5, LTE_B7: 7, LTE_B8: 8,
    LTE_B20: 20, LTE_B28: 28, LTE_B38: 38, LTE_B40: 40, LTE_B41: 41,
    NR_N1: 1, NR_N3: 3, NR_N5: 5, NR_N7: 7, NR_N8: 8,
    NR_N20: 20, NR_N28: 28, NR_N41: 41, NR_N77: 77, NR_N78: 78,
  },

  runtime: function(self) {
    // ── Shared GSM bus (global between all simulator instances) ──
    if (!window._gsmBus) {
      window._gsmBus = {
        nodes: {},
        deliverSMS(senderId, to, text) {
          Object.values(this.nodes).forEach((target) => {
            if (target.id === senderId || !target.active) return;
            target.smsInbox = target.smsInbox || [];
            target.smsInbox.push({ from: senderId, to, text, time: Date.now(), read: false });
            target.lastRxMeta = { type: 'sms', from: senderId, to, text, time: Date.now() };
            if (target.inst && target.inst.setPin) target.inst.setPin('NET', 1);
          });
        },
        deliverVoice(senderId, to, action) {
          Object.values(this.nodes).forEach((target) => {
            if (target.id === senderId || !target.active) return;
            target.lastRxMeta = { type: 'voice', from: senderId, to, action, time: Date.now() };
            if (target.inst && target.inst.setPin) target.inst.setPin('NET', 1);
          });
        },
        deliverUSSD(senderId, code, result) {
          Object.values(this.nodes).forEach((target) => {
            if (target.id === senderId || !target.active) return;
            target.lastRxMeta = { type: 'ussd', from: senderId, code, result, time: Date.now() };
            if (target.inst && target.inst.setPin) target.inst.setPin('NET', 1);
          });
        },
        deliverHTTP(senderId, url, method, status, body) {
          Object.values(this.nodes).forEach((target) => {
            if (target.id === senderId || !target.active) return;
            target.httpResponse = { url, method, status, body, time: Date.now() };
            target.lastRxMeta = { type: 'http', from: senderId, url, method, status, body, time: Date.now() };
            if (target.inst && target.inst.setPin) target.inst.setPin('NET', 1);
          });
        },
      };
    }
    var bus = window._gsmBus;

    var _myNodeId = null;
    var _initialized = false;
    var _registered = false;
    var _band = 900;
    var _tech = '2G';
    var _operator = '';
    var _imei = '123456789012345';
    var _apn = 'internet';
    var _signalBars = 0;
    var _pinReady = false;

    // SMS state
    var _smsTextMode = true;
    var _smsInbox = [];
    var _smsOutbox = [];
    var _newSmsIndicator = false;

    // Voice state
    var _callState = 'idle'; // idle, calling, ringing, active, ended
    var _callNumber = null;
    var _callDirection = null; // 'outgoing' | 'incoming'

    // USSD state
    var _ussdResult = null;

    // HTTP state
    var _httpInit = false;
    var _httpUrl = '';
    var _httpResponse = null;

    // TCP state
    var _tcpConnected = false;
    var _tcpHost = null;
    var _tcpPort = null;

    function _getMyNode() {
      if (_myNodeId !== null) return bus.nodes[_myNodeId];
      return null;
    }

    function _calcSignalBars() {
      // Simulated signal based on board index (deterministic)
      var base = (_myNodeId || 0) % 4;
      return 2 + base;
    }

    return {
      gsmBegin: function() {
        _myNodeId = self.boardIndex || 0;
        _initialized = true;
        _pinReady = true;
        _registered = true;
        _band = Number(GSM_VARIANTS_BAND || 900);
        _tech = 'GSM';
        _signalBars = _calcSignalBars();
        _imei = '35' + String(_myNodeId || 0).padStart(2, '0') + String(Date.now()).slice(-12);

        bus.nodes[_myNodeId] = {
          id: _myNodeId,
          tech: _tech,
          band: _band,
          operator: _operator,
          imei: _imei,
          apn: _apn,
          active: true,
          simulator: self,
          sendSMS: (to, text) => {
            _smsOutbox.push({ to, text, time: Date.now() });
            bus.deliverSMS(_myNodeId, to, text);
          },
          makeCall: (to) => {
            _callState = 'calling';
            _callNumber = to;
            _callDirection = 'outgoing';
            bus.deliverVoice(_myNodeId, to, 'call');
          },
          hangup: () => {
            _callState = 'idle';
            bus.deliverVoice(_myNodeId, null, 'hangup');
          },
          sendUSSD: (code) => {
            _ussdResult = 'USSD ' + code + ' processed';
            bus.deliverUSSD(_myNodeId, code, 'OK');
          },
          httpGet: (url) => {
            _httpUrl = url;
            _httpInit = true;
            bus.deliverHTTP(_myNodeId, url, 'GET', 200, 'HTTP response body');
          },
        };

        self._serialLog('[GSM] Initialized — IMEI: ' + _imei + '\n', 'system');
        self._serialLog('[GSM] Tech: ' + _tech + '  Band: ' + _band + ' MHz  Signal: ' + _signalBars + '/5\n', 'system');
        self._serialLog('[GSM] Registered on network: ' + _operator || 'Home Network\n', 'system');
        self._serialLog('[GSM] Ready for AT commands\n', 'system');
        return 1;
      },

      gsmSetBand: function(band) {
        _band = band;
        var node = _getMyNode();
        if (node) node.band = band;
        self._serialLog('[GSM] Band set to ' + band + ' MHz\n', 'system');
      },

      gsmSendSMS: function(number, text) {
        if (!_initialized) {
          self._serialLog('[GSM] Error: call gsm.begin() first\n', 'system');
          return 0;
        }
        var to = String(number).replace(/"/g, '');
        _smsOutbox.push({ to, text: String(text), time: Date.now() });
        bus.deliverSMS(_myNodeId, to, String(text));
        self._serialLog('[GSM] SMS sent to ' + to + ': "' + String(text) + '"\n', 'system');
        self._serialLog('[GSM] CMGS: OK (message reference ' + (_smsOutbox.length - 1) + ')\n', 'system');
        return 1;
      },

      gsmReadSMS: function() {
        var node = bus.nodes[_myNodeId];
        var inbox = node && node.smsInbox ? node.smsInbox : [];
        var unread = inbox.filter(function(m) { return !m.read; });
        if (unread.length === 0) {
          self._serialLog('[GSM] No unread SMS\n', 'system');
          return 0;
        }
        unread.forEach(function(m) { m.read = true; });
        var first = unread[0];
        _newSmsIndicator = false;
        self._serialLog('[GSM] SMS from ' + first.from + ': "' + first.text + '"\n', 'system');
        return first.text;
      },

      gsmMakeCall: function(number) {
        if (!_initialized) return 0;
        _callState = 'calling';
        _callNumber = String(number);
        _callDirection = 'outgoing';
        bus.deliverVoice(_myNodeId, String(number), 'call');
        self._serialLog('[GSM] Calling ' + _callNumber + '...\n', 'system');
        self._serialLog('[GSM] Call connected\n', 'system');
        _callState = 'active';
        return 1;
      },

      gsmAnswerCall: function() {
        if (_callState === 'ringing') {
          _callState = 'active';
          self._serialLog('[GSM] Call answered\n', 'system');
          return 1;
        }
        return 0;
      },

      gsmHangup: function() {
        if (_callState !== 'idle') {
          _callState = 'idle';
          bus.deliverVoice(_myNodeId, null, 'hangup');
          self._serialLog('[GSM] Call ended\n', 'system');
          return 1;
        }
        return 0;
      },

      gsmSendUSSD: function(code) {
        if (!_initialized) return 0;
        var c = String(code).replace(/"/g, '');
        _ussdResult = 'USSD response for ' + c;
        bus.deliverUSSD(_myNodeId, c, 'OK');
        self._serialLog('[GSM] USSD: ' + c + ' → ' + _ussdResult + '\n', 'system');
        return 1;
      },

      gsmHttpGet: function(url) {
        if (!_initialized) return 0;
        _httpUrl = String(url);
        _httpInit = true;
        bus.deliverHTTP(_myNodeId, String(url), 'GET', 200, 'HTTP/1.1 200 OK\nContent-Length: 12\n\nHello World');
        self._serialLog('[GSM] HTTP GET ' + _httpUrl + '\n', 'system');
        self._serialLog('[GSM] HTTPACTION: 0,200,12\n', 'system');
        return 1;
      },

      gsmHttpPost: function(url, body) {
        if (!_initialized) return 0;
        _httpUrl = String(url);
        _httpInit = true;
        bus.deliverHTTP(_myNodeId, String(url), 'POST', 200, String(body));
        self._serialLog('[GSM] HTTP POST ' + _httpUrl + '\n', 'system');
        self._serialLog('[GSM] HTTPACTION: 1,200,' + String(body).length + '\n', 'system');
        return 1;
      },

      gsmHttpRead: function() {
        if (!_httpInit) return '';
        var resp = bus.nodes[_myNodeId] && bus.nodes[_myNodeId].httpResponse;
        if (resp) {
          self._serialLog('[GSM] HTTPREAD: ' + resp.body + '\n', 'system');
          return resp.body;
        }
        return '';
      },

      gsmTcpConnect: function(host, port) {
        if (!_initialized) return 0;
        _tcpHost = String(host);
        _tcpPort = Number(port) || 80;
        _tcpConnected = true;
        self._serialLog('[GSM] TCP connected to ' + _tcpHost + ':' + _tcpPort + '\n', 'system');
        self._serialLog('[GSM] CONNECT OK\n', 'system');
        return 1;
      },

      gsmTcpSend: function(data) {
        if (!_tcpConnected) return 0;
        self._serialLog('[GSM] TCP SENT: ' + String(data) + '\n', 'system');
        self._serialLog('[GSM] SEND OK\n', 'system');
        return 1;
      },

      gsmTcpClose: function() {
        _tcpConnected = false;
        self._serialLog('[GSM] TCP CLOSED\n', 'system');
        return 1;
      },

      gsmSignalQuality: function() {
        return _signalBars;
      },

      gsmGetIMEI: function() {
        return _imei;
      },

      // ── Raw AT command passthrough (from Serial.println("AT+...")) ──
      handleAT: function(cmd) {
        var c = String(cmd).trim();
        if (!c.startsWith('AT')) return null;

        // AT → OK
        if (c === 'AT') { self._serialLog('OK\n', 'data'); return 'OK'; }

        // AT+CMGF=<mode> — SMS text mode
        var m = c.match(/^AT\+CMGF\s*=\s*(\d+)/);
        if (m) {
          _smsTextMode = Number(m[1]) === 1;
          self._serialLog('OK\n', 'data');
          return 'OK';
        }

        // AT+CMGS="number" → expect text + Ctrl-Z (0x1A)
        m = c.match(/^AT\+CMGS\s*=\s*"([^"]*)"/);
        if (m) {
          self._serialLog('> ', 'data');
          // The actual text would come on the next Serial line; here we
          // just acknowledge and queue a simulated send.
          self._serialLog('OK\n', 'data');
          return 'OK';
        }

        // ATD<number>; — dial
        m = c.match(/^ATD"([^"]*)"/) || c.match(/^ATD(\d+);?/);
        if (m) {
          var num = m[1] || m[2];
          _callState = 'calling';
          _callNumber = num;
          _callDirection = 'outgoing';
          bus.deliverVoice(_myNodeId, num, 'call');
          self._serialLog('OK\n', 'data');
          self._serialLog('[GSM] Connected to ' + num + '\n', 'system');
          _callState = 'active';
          return 'OK';
        }

        // ATH / AT+CHUP — hangup
        if (c === 'ATH' || c === 'AT+CHUP') {
          _callState = 'idle';
          bus.deliverVoice(_myNodeId, null, 'hangup');
          self._serialLog('OK\n', 'data');
          return 'OK';
        }

        // ATA — answer
        if (c === 'ATA') {
          if (_callState === 'ringing') {
            _callState = 'active';
            self._serialLog('OK\n', 'data');
            return 'OK';
          }
          self._serialLog('NO CARRIER\n', 'data');
          return 'NO CARRIER';
        }

        // AT+CUSD=<mode>,"<code>" — USSD
        m = c.match(/^AT\+CUSD\s*=\s*(\d+)\s*,\s*"([^"]*)"/);
        if (m) {
          var code = m[2];
          _ussdResult = 'USSD ' + code + ' response';
          bus.deliverUSSD(_myNodeId, code, 'OK');
          self._serialLog('OK\n', 'data');
          self._serialLog('[GSM] +CUSD: 0,"' + _ussdResult + '",15\n', 'system');
          return 'OK';
        }

        // AT+COPS? — operator
        if (c === 'AT+COPS?') {
          self._serialLog('+COPS: 0,0,"' + (_operator || 'Home Network') + '",' + (_tech === '5G NR' ? 7 : _tech === '4G LTE' ? 6 : 0) + '\n', 'data');
          self._serialLog('OK\n', 'data');
          return 'OK';
        }

        // AT+CREG? — registration
        if (c === 'AT+CREG?') {
          self._serialLog('+CREG: 0,' + (_registered ? 1 : 0) + '\n', 'data');
          self._serialLog('OK\n', 'data');
          return 'OK';
        }

        // AT+CSQ — signal quality
        if (c === 'AT+CSQ') {
          self._serialLog('+CSQ: ' + _signalBars + ',99\n', 'data');
          self._serialLog('OK\n', 'data');
          return 'OK';
        }

        // AT+CPIN? — PIN status
        if (c === 'AT+CPIN?') {
          self._serialLog('+CPIN: READY\n', 'data');
          self._serialLog('OK\n', 'data');
          return 'OK';
        }

        // AT+CIPSTART="TCP","host",port — TCP connect
        m = c.match(/^AT\+CIPSTART\s*=\s*"TCP"\s*,\s*"([^"]*)"\s*,\s*(\d+)/);
        if (m) {
          _tcpHost = m[1];
          _tcpPort = Number(m[2]);
          _tcpConnected = true;
          self._serialLog('OK\n', 'data');
          self._serialLog('[GSM] Connected to ' + _tcpHost + ':' + _tcpPort + '\n', 'system');
          self._serialLog('CONNECT OK\n', 'data');
          return 'OK';
        }

        // AT+CIPSEND — TCP send
        if (c === 'AT+CIPSEND') {
          self._serialLog('>\n', 'data');
          return 'OK';
        }

        // AT+CIPCLOSE — TCP close
        if (c === 'AT+CIPCLOSE') {
          _tcpConnected = false;
          self._serialLog('OK\n', 'data');
          return 'OK';
        }

        // AT+HTTPINIT — init HTTP
        if (c === 'AT+HTTPINIT') {
          _httpInit = true;
          self._serialLog('OK\n', 'data');
          return 'OK';
        }

        // AT+HTTPPARA="URL",url — set URL
        m = c.match(/^AT\+HTTPPARA\s*=\s*"URL"\s*,\s*"([^"]*)"/);
        if (m) {
          _httpUrl = m[1];
          self._serialLog('OK\n', 'data');
          return 'OK';
        }

        // AT+HTTPACTION=<method> — 0=GET,1=POST,2=HEAD
        m = c.match(/^AT\+HTTPACTION\s*=\s*(\d+)/);
        if (m && _httpInit) {
          var method = ['GET', 'POST', 'HEAD'][Number(m[1])] || 'GET';
          bus.deliverHTTP(_myNodeId, _httpUrl, method, 200, 'HTTP response body');
          self._serialLog('OK\n', 'data');
          self._serialLog('[GSM] +HTTPACTION: ' + m[1] + ',200,12\n', 'system');
          return 'OK';
        }

        // AT+HTTPREAD — read response
        if (c === 'AT+HTTPREAD') {
          var resp = bus.nodes[_myNodeId] && bus.nodes[_myNodeId].httpResponse;
          if (resp) {
            self._serialLog('+HTTPREAD: ' + resp.body.length + '\n', 'data');
            self._serialLog(resp.body + '\n', 'data');
          } else {
            self._serialLog('+HTTPREAD: 0\n', 'data');
          }
          self._serialLog('OK\n', 'data');
          return 'OK';
        }

        // AT+HTTPTERM — terminate
        if (c === 'AT+HTTPTERM') {
          _httpInit = false;
          self._serialLog('OK\n', 'data');
          return 'OK';
        }

        // Unknown AT command
        self._serialLog('ERROR\n', 'data');
        return 'ERROR';
      },
    };
  },

  constructor: null,
};

// Band preset constants used by gsmBegin (populated from component props at
// runtime via gsmSetBand; defaults kept here for reference).
var GSM_VARIANTS_BAND = 900;
