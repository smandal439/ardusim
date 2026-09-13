/**
 * TB6600 Stepper Motor Driver Library Plugin for ArduSim
 *
 * Provides pulse/direction control simulation for TB6600 drivers.
 * Typical usage: digitalWrite() pulse generation on PUL/DIR/ENA pins.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['TB6600'] = {
  classes: ['TB6600Driver'],
  includes: [],

  transpile: [
    // TB6600Driver driver(PUL_PIN, DIR_PIN, ENA_PIN);
    [/\bnew\s+TB6600Driver\s*\(([^)]+)\)/g, '_a.tb6600New($1)'],
    // driver.begin();
    [/\b(\w+)\.begin\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.tb6600Begin(' + varName + ')';
    }],
    // driver.step(steps);
    [/\b(\w+)\.step\s*\(([^)]+)\)/g, function(match, varName, args) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.tb6600Step(' + varName + ', ' + args + ')';
    }],
    // driver.setSpeed(speed);
    [/\b(\w+)\.setSpeed\s*\(([^)]+)\)/g, function(match, varName, args) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.tb6600SetSpeed(' + varName + ', ' + args + ')';
    }],
    // driver.enable();
    [/\b(\w+)\.enable\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.tb6600Enable(' + varName + ')';
    }],
    // driver.disable();
    [/\b(\w+)\.disable\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.tb6600Disable(' + varName + ')';
    }],
    // driver.setMicrostep(ms);
    [/\b(\w+)\.setMicrostep\s*\(([^)]+)\)/g, function(match, varName, args) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.tb6600SetMicrostep(' + varName + ', ' + args + ')';
    }],
    // driver.getPosition();
    [/\b(\w+)\.getPosition\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.tb6600GetPosition(' + varName + ')';
    }],
    // driver.resetPosition();
    [/\b(\w+)\.resetPosition\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.tb6600ResetPosition(' + varName + ')';
    }],
  ],

  runtime: function(self) {
    return {
      tb6600New: function(pulPin, dirPin, enaPin) {
        var id = '_tb6600_' + pulPin + '_' + dirPin;
        self._tb6600s = self._tb6600s || {};
        self._tb6600s[id] = {
          pulPin: pulPin,
          dirPin: dirPin,
          enaPin: enaPin != null ? enaPin : -1,
          speed: 500,
          enabled: true,
          position: 0,
          microstep: 16,
        };
        self._serialLog('[TB6600] Created PUL=' + pulPin + ' DIR=' + dirPin + ' ENA=' + (enaPin != null ? enaPin : 'none') + '\n', 'system');
        return { _tb6600Id: id };
      },

      tb6600Begin: function(obj) {
        var d = self._tb6600s && self._tb6600s[obj._tb6600Id];
        if (!d) return;
        var key;
        key = 'pin_' + d.pulPin;
        self.pinStates[key] = 0;
        self._emitPinChange(key, 0);
        key = 'pin_' + d.dirPin;
        self.pinStates[key] = 0;
        self._emitPinChange(key, 0);
        if (d.enaPin >= 0) {
          key = 'pin_' + d.enaPin;
          self.pinStates[key] = 1;
          self._emitPinChange(key, 1);
        }
        d.enabled = true;
        self._serialLog('[TB6600] begin() - pins initialized\n', 'system');
      },

      tb6600Step: async function(obj, steps) {
        var d = self._tb6600s && self._tb6600s[obj._tb6600Id];
        if (!d || !d.enabled) return;
        var n = Math.round(Number(steps)) || 0;
        if (n === 0) return;

        // Set direction pin
        var dirKey = 'pin_' + d.dirPin;
        var dirVal = n > 0 ? 1 : 0;
        self.pinStates[dirKey] = dirVal;
        self._emitPinChange(dirKey, dirVal);

        var pulKey = 'pin_' + d.pulPin;
        var halfPeriod = Math.max(50, Math.round(500000 / Math.max(d.speed, 1)));
        var dir = n > 0 ? 1 : -1;
        var absN = Math.abs(n);

        for (var i = 0; i < absN; i++) {
          if (!self.isRunning) return;

          // Pulse HIGH
          self.pinStates[pulKey] = 1;
          self._emitPinChange(pulKey, 1);
          try {
            await self._delayPromise(halfPeriod / (self.speed || 1));
          } catch (e) { return; }

          // Pulse LOW
          self.pinStates[pulKey] = 0;
          self._emitPinChange(pulKey, 0);
          try {
            await self._delayPromise(halfPeriod / (self.speed || 1));
          } catch (e) { return; }

          d.position += dir;
        }

        self._serialLog('[TB6600] step(' + n + ') -> pos=' + d.position + '\n', 'system');
      },

      tb6600SetSpeed: function(obj, speed) {
        var d = self._tb6600s && self._tb6600s[obj._tb6600Id];
        if (d) d.speed = Number(speed) || 500;
      },

      tb6600Enable: function(obj) {
        var d = self._tb6600s && self._tb6600s[obj._tb6600Id];
        if (!d) return;
        d.enabled = true;
        if (d.enaPin >= 0) {
          var key = 'pin_' + d.enaPin;
          self.pinStates[key] = 1;
          self._emitPinChange(key, 1);
        }
        self._serialLog('[TB6600] enabled\n', 'system');
      },

      tb6600Disable: function(obj) {
        var d = self._tb6600s && self._tb6600s[obj._tb6600Id];
        if (!d) return;
        d.enabled = false;
        if (d.enaPin >= 0) {
          var key = 'pin_' + d.enaPin;
          self.pinStates[key] = 0;
          self._emitPinChange(key, 0);
        }
        self._serialLog('[TB6600] disabled\n', 'system');
      },

      tb6600SetMicrostep: function(obj, ms) {
        var d = self._tb6600s && self._tb6600s[obj._tb6600Id];
        if (d) d.microstep = Number(ms) || 16;
      },

      tb6600GetPosition: function(obj) {
        var d = self._tb6600s && self._tb6600s[obj._tb6600Id];
        return d ? d.position : 0;
      },

      tb6600ResetPosition: function(obj) {
        var d = self._tb6600s && self._tb6600s[obj._tb6600Id];
        if (d) d.position = 0;
      },
    };
  },

  constants: {},
};
