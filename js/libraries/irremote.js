/**
 * IRremote Library Plugin for ArduSim
 *
 * Provides IR send/receive simulation with serial logging.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['IRremote'] = {
  classes: ['IRsend', 'IRrecv'],
  includes: ['<IRremote.h>'],

  transpile: [
    [/decode_results\s+(\w+)\s*;/g, 'var $1 = { protocol: 0, value: 0, bits: 0 };'],
    [/IRsend\s+(\w+)\((\d+)\)/g, 'var $1 = _a.irsendNew($2)'],
    [/IRrecv\s+(\w+)\((\d+)\)/g, 'var $1 = _a.irrecvNew($2)'],
    [/(\w+)\.sendNEC\(/g, '_a.irsendNEC($1, '],
    [/(\w+)\.sendSony\(/g, '_a.irsendSony($1, '],
    [/(\w+)\.sendRC5\(/g, '_a.irsendRC5($1, '],
    [/(\w+)\.sendRC6\(/g, '_a.irsendRC6($1, '],
    [/(\w+)\.sendRaw\(/g, '_a.irsendRaw($1, '],
    [/(\w+)\.enableIRIn\(\)/g, '_a.irrecvEnableIRIn($1)'],
    [/(\w+)\.resume\(\)/g, '_a.irrecvResume($1)'],
    [/(\w+)\.decode\(&(\w+)\)/g, '_a.irrecvDecode($1, $2)'],
    [/(\w+)\.stopIRSend\(\)/g, '_a.irsendStop($1)'],
  ],

  runtime: function(self) {
    return {
      irsendNew: function(pin) {
        self._irsend = self._irsend || {};
        self._irsend.pin = pin;
        return { _irId: 'irsend' };
      },
      irrecvNew: function(pin) {
        self._irrecv = self._irrecv || {};
        self._irrecv.pin = pin;
        self._irrecv.results = { protocol: 0, value: 0, bits: 0 };
        return { _irId: 'irrecv' };
      },
      irsendNEC: function(obj, data, nbits) {
        self._serialLog('[IRremote] Send NEC: 0x' + Number(data).toString(16).toUpperCase() + ' (' + (nbits || 32) + ' bits)\n', 'system');
      },
      irsendSony: function(obj, data, nbits) {
        self._serialLog('[IRremote] Send Sony: 0x' + Number(data).toString(16).toUpperCase() + ' (' + (nbits || 12) + ' bits)\n', 'system');
      },
      irsendRC5: function(obj, data, nbits) {
        self._serialLog('[IRremote] Send RC5: 0x' + Number(data).toString(16).toUpperCase() + ' (' + (nbits || 14) + ' bits)\n', 'system');
      },
      irsendRC6: function(obj, data, nbits) {
        self._serialLog('[IRremote] Send RC6: 0x' + Number(data).toString(16).toUpperCase() + ' (' + (nbits || 20) + ' bits)\n', 'system');
      },
      irsendRaw: function(buf, len, hz) {
        self._serialLog('[IRremote] Send raw: ' + len + ' samples\n', 'system');
      },
      irsendStop: function(obj) { },
      irrecvEnableIRIn: function(obj) {
        self._serialLog('[IRremote] IR receiver enabled\n', 'system');
      },
      irrecvDecode: function(obj, results) {
        var r = self._irrecv ? self._irrecv.results : { protocol: 0, value: 0, bits: 0 };
        if (results) {
          results.protocol = r.protocol;
          results.value = r.value;
          results.bits = r.bits;
        }
        return false;
      },
      irrecvResume: function(obj) { },
    };
  },

  constants: {
    DECODE_SUPPORTED: true,
    NECBITS: 32,
    USE_FAST: false,
  },
};
