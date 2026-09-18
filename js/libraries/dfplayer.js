/**
 * DFPlayer Mini Library Plugin for ArduSim
 *
 * Provides DFPlayer Mini MP3 module simulation.
 * Supports: begin, play, pause, next, previous, volume, EQ, loop, reset.
 *
 * Usage in Arduino code:
 *   #include <DFRobotDFPlayerMini.h>
 *   DFRobotDFPlayerMini myDFPlayer;
 *   myDFPlayer.begin(Serial2);
 *   myDFPlayer.volume(25);
 *   myDFPlayer.play(1);
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['DFRobotDFPlayerMini'] = {
  classes: ['DFRobotDFPlayerMini'],
  includes: ['<DFRobotDFPlayerMini.h>'],

  transpile: [
    [/\b(\w+)\.begin\s*\(([^)]+)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerBegin(' + v + ', ' + a + ')';
    }],
    [/\b(\w+)\.volume\s*\(([^)]+)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerVolume(' + v + ', ' + a + ')';
    }],
    [/\b(\w+)\.play\s*\(([^)]+)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerPlay(' + v + ', ' + a + ')';
    }],
    [/\b(\w+)\.pause\s*\(\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerPause(' + v + ')';
    }],
    [/\b(\w+)\.stop\s*\(\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerStop(' + v + ')';
    }],
    [/\b(\w+)\.next\s*\(\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerNext(' + v + ')';
    }],
    [/\b(\w+)\.previous\s*\(\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerPrevious(' + v + ')';
    }],
    [/\b(\w+)\.loop\s*\(([^)]+)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerLoop(' + v + ', ' + a + ')';
    }],
    [/\b(\w+)\.EQ\s*\(([^)]+)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerEQ(' + v + ', ' + a + ')';
    }],
    [/\b(\w+)\.outputSetting\s*\(([^)]+)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerOutputSetting(' + v + ', ' + a + ')';
    }],
    [/\b(\w+)\.enableLoopAll\s*\(\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerEnableLoopAll(' + v + ')';
    }],
    [/\b(\w+)\.disableLoopAll\s*\(\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerDisableLoopAll(' + v + ')';
    }],
    [/\b(\w+)\.enableLoopFolder\s*\(([^)]+)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerEnableLoopFolder(' + v + ', ' + a + ')';
    }],
    [/\b(\w+)\.disableLoopFolder\s*\(([^)]+)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerDisableLoopFolder(' + v + ', ' + a + ')';
    }],
    [/\b(\w+)\.enableLoopOne\s*\(\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerEnableLoopOne(' + v + ')';
    }],
    [/\b(\w+)\.disableLoopOne\s*\(\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerDisableLoopOne(' + v + ')';
    }],
    [/\b(\w+)\.readState\s*\(\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerReadState(' + v + ')';
    }],
    [/\b(\w+)\.readVolume\s*\(\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerReadVolume(' + v + ')';
    }],
    [/\b(\w+)\.readEQ\s*\(\)/g, function(m, v) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerReadEQ(' + v + ')';
    }],
    [/\b(\w+)\.readFileCount\s*\(([^)]+)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerReadFileCount(' + v + ', ' + a + ')';
    }],
    [/\b(\w+)\.readCurrentFileNumber\s*\(([^)]+)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerReadCurrentFileNumber(' + v + ', ' + a + ')';
    }],
    [/\b(\w+)\.readFileCountInFolder\s*\(([^)]+)\)/g, function(m, v, a) {
      if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m;
      return '_a.dfplayerReadFileCountInFolder(' + v + ', ' + a + ')';
    }],
  ],

  constants: {
    DFPLAYER_EQ_NORMAL: 0,
    DFPLAYER_EQ_POP: 1,
    DFPLAYER_EQ_ROCK: 2,
    DFPLAYER_EQ_JAZZ: 3,
    DFPLAYER_EQ_CLASSIC: 4,
    DFPLAYER_EQ_BASS: 5,
    DFPLAYER_SOURCE_U_DISK: 1,
    DFPLAYER_SOURCE_SD: 2,
    DFPLAYER_SOURCE_AUX: 3,
    DFPLAYER_SOURCE_SLEEP: 4,
    DFPLAYER_SOURCE_FLASH: 5,
    DFPLAYER_LOOP_NONE: 0,
    DFPLAYER_LOOP_FOLDER: 1,
    DFPLAYER_LOOP_SINGLE: 2,
    DFPLAYER_LOOP_RANDOM: 3,
  },

  runtime: function(self) {
    return {
      dfplayerBegin: function(varName, serialPort) {
        self._serialLog('[DFPlayer] begin() - initialized\n', 'system');
        if (varName && typeof varName === 'object') {
          varName._dfplayer = true;
        }
      },
      dfplayerVolume: function(varName, volume) {
        volume = Math.max(0, Math.min(30, Number(volume) || 15));
        self._serialLog('[DFPlayer] volume(' + volume + ')\n', 'data');
        self._emitEvent('dfplayer', { cmd: 0x06, param: volume });
      },
      dfplayerPlay: function(varName, track) {
        track = Math.max(1, Math.min(3000, Number(track) || 1));
        self._serialLog('[DFPlayer] play(track ' + track + ')\n', 'data');
        self._emitEvent('dfplayer', { cmd: 0x03, param: track });
      },
      dfplayerPause: function(varName) {
        self._serialLog('[DFPlayer] pause()\n', 'data');
        self._emitEvent('dfplayer', { cmd: 0x0E, param: 0 });
      },
      dfplayerStop: function(varName) {
        self._serialLog('[DFPlayer] stop()\n', 'data');
        self._emitEvent('dfplayer', { cmd: 0x0E, param: 0 });
      },
      dfplayerNext: function(varName) {
        self._serialLog('[DFPlayer] next()\n', 'data');
        self._emitEvent('dfplayer', { cmd: 0x01, param: 0 });
      },
      dfplayerPrevious: function(varName) {
        self._serialLog('[DFPlayer] previous()\n', 'data');
        self._emitEvent('dfplayer', { cmd: 0x02, param: 0 });
      },
      dfplayerLoop: function(varName, track) {
        track = Math.max(1, Math.min(3000, Number(track) || 1));
        self._serialLog('[DFPlayer] loop(track ' + track + ')\n', 'data');
        self._emitEvent('dfplayer', { cmd: 0x03, param: track });
      },
      dfplayerEQ: function(varName, eq) {
        eq = Math.max(0, Math.min(5, Number(eq) || 0));
        self._serialLog('[DFPlayer] EQ(' + eq + ')\n', 'data');
        self._emitEvent('dfplayer', { cmd: 0x07, param: eq });
      },
      dfplayerOutputSetting: function(varName, drive, gain) {
        self._serialLog('[DFPlayer] outputSetting(drive=' + drive + ', gain=' + gain + ')\n', 'data');
      },
      dfplayerEnableLoopAll: function(varName) {
        self._serialLog('[DFPlayer] enableLoopAll()\n', 'data');
        self._emitEvent('dfplayer', { cmd: 0x08, param: 0 });
      },
      dfplayerDisableLoopAll: function(varName) {
        self._serialLog('[DFPlayer] disableLoopAll()\n', 'data');
        self._emitEvent('dfplayer', { cmd: 0x08, param: 1 });
      },
      dfplayerEnableLoopFolder: function(varName, folder) {
        self._serialLog('[DFPlayer] enableLoopFolder(' + folder + ')\n', 'data');
        self._emitEvent('dfplayer', { cmd: 0x08, param: 2 });
      },
      dfplayerDisableLoopFolder: function(varName, folder) {
        self._serialLog('[DFPlayer] disableLoopFolder(' + folder + ')\n', 'data');
        self._emitEvent('dfplayer', { cmd: 0x08, param: 3 });
      },
      dfplayerEnableLoopOne: function(varName) {
        self._serialLog('[DFPlayer] enableLoopOne()\n', 'data');
        self._emitEvent('dfplayer', { cmd: 0x11, param: 0 });
      },
      dfplayerDisableLoopOne: function(varName) {
        self._serialLog('[DFPlayer] disableLoopOne()\n', 'data');
        self._emitEvent('dfplayer', { cmd: 0x11, param: 1 });
      },
      dfplayerReadState: function(varName) {
        self._serialLog('[DFPlayer] readState() -> playing\n', 'data');
        return 1;
      },
      dfplayerReadVolume: function(varName) {
        self._serialLog('[DFPlayer] readVolume() -> 15\n', 'data');
        return 15;
      },
      dfplayerReadEQ: function(varName) {
        self._serialLog('[DFPlayer] readEQ() -> 0\n', 'data');
        return 0;
      },
      dfplayerReadFileCount: function(varName, source) {
        self._serialLog('[DFPlayer] readFileCount() -> 0\n', 'data');
        return 0;
      },
      dfplayerReadCurrentFileNumber: function(varName, source) {
        self._serialLog('[DFPlayer] readCurrentFileNumber() -> 1\n', 'data');
        return 1;
      },
      dfplayerReadFileCountInFolder: function(varName, folder) {
        self._serialLog('[DFPlayer] readFileCountInFolder(' + folder + ') -> 0\n', 'data');
        return 0;
      },
    };
  },

  constructor: function(args) {
    return { _dfplayer: true };
  },
};
