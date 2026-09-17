/**
 * ESP32 I2S Library Plugin for ArduSim
 *
 * Provides I2S audio output simulation with MAX98357A amplifier support.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['I2S'] = {
  classes: [],
  includes: ['<driver/i2s.h>'],

  transpile: [
    [/i2s_driver_install\s*\(([^)]*)\)\s*;/g, '_a.i2sDriverInstall($1);'],
    [/i2s_set_pin\s*\(([^)]*)\)\s*;/g, '_a.i2sSetPin($1);'],
    [/await\s+i2s_write\s*\(([^)]*)\)\s*;/g, 'await _a.i2sWrite($1);'],
    [/i2s_write\s*\(([^)]*)\)\s*;/g, 'await _a.i2sWrite($1);'],
    [/i2s_zero_dma_buffer\s*\(([^)]*)\)\s*;/g, '_a.i2sZeroDma($1);'],
    [/i2s_set_volume\s*\(([^,)]+)\s*,\s*([^)]+)\)/g, '_a.i2sSetVolume($1, $2);'],
  ],

  runtime: function(self) {
    return {
      i2sDriverInstall: function(port, config, flags, arg) {
        self._serialLog('[I2S] Driver installed\n', 'system');
      },
      i2sSetPin: function(port, pins) {
        self._serialLog('[I2S] Pins set BCLK=' + (pins.bck_io_num != null ? pins.bck_io_num : (pins.bck != null ? pins.bck : '?')) +
          ' LRCK=' + (pins.ws_io_num != null ? pins.ws_io_num : (pins.ws != null ? pins.ws : '?')) +
          ' DOUT=' + (pins.data_out_num != null ? pins.data_out_num : (pins.dout != null ? pins.dout : '?')) + '\n', 'system');
      },
      i2sWrite: async function(port, buf, len, written, timeout) {
        if (written) written.val = len;
        var vol = 1.0;
        try { vol = Math.max(0, Math.min(1, (self._i2sVolume != null ? self._i2sVolume : 80) / 100)); } catch(e) {}
        self._playI2SAudio(buf, len, { channels: 1, volume: vol });
        try {
          var cc = window.CircuitCanvas;
          if (cc && cc.components && buf) {
            var amp = cc.components.find(function(c) { return c.type === 'max98357a'; });
            if (amp) {
              var sum = 0, count = 0;
              var samples = Math.min(Math.floor(len / 2), 512);
              var view;
              if (buf instanceof ArrayBuffer) {
                view = new Int16Array(buf, 0, samples);
              } else if (ArrayBuffer.isView(buf)) {
                view = new Int16Array(buf.buffer, buf.byteOffset, samples);
              } else if (Array.isArray(buf)) {
                view = new Int16Array(buf.slice(0, samples));
              }
              if (view) {
                for (var i = 0; i < samples; i++) { sum += view[i] * view[i]; count++; }
              }
              var rms = count > 0 ? Math.sqrt(sum / count) : 0;
              var dinV = (rms / 32767) * 3.3;
              if (typeof cc._getConnectedPinNum === 'function') {
                var pinNum = cc._getConnectedPinNum(amp.id, 'din');
                if (pinNum !== null) self.pinStates['pin_' + pinNum] = dinV;
              }
              if (typeof cc._getConnectedPinNum === 'function') {
                var esp = cc.components.find(function(c) { return c.type === 'esp32_devkit_v1'; });
                if (esp) {
                  var d22num = cc._getConnectedPinNum(esp.id, 'D22');
                  if (d22num !== null) self.pinStates['pin_' + d22num] = dinV;
                }
              }
            }
          }
        } catch (e) { }
        return len;
      },
      i2sZeroDma: function(port) { },
      i2sSetVolume: function(port, volume) {
        self._i2sVolume = Math.max(0, Math.min(100, volume));
      },
    };
  },

  constants: {
    I2S_NUM_0: 0,
    I2S_NUM_1: 1,
    I2S_MODE_MASTER: 1,
    I2S_MODE_SLAVE: 2,
    I2S_MODE_TX: 4,
    I2S_MODE_RX: 8,
    I2S_BITS_PER_SAMPLE_8BIT: 1,
    I2S_BITS_PER_SAMPLE_16BIT: 2,
    I2S_BITS_PER_SAMPLE_24BIT: 3,
    I2S_BITS_PER_SAMPLE_32BIT: 4,
    I2S_CHANNEL_FMT_RIGHT_LEFT: 0,
    I2S_CHANNEL_FMT_ONLY_LEFT: 1,
    I2S_CHANNEL_FMT_ONLY_RIGHT: 2,
    I2S_COMM_FORMAT_I2S: 0,
    I2S_COMM_FORMAT_STAND_I2S: 1,
    ESP_INTR_FLAG_LEVEL1: 0,
    I2S_PIN_NO_CHANGE: -1,
  },
  constructor: null,
};
