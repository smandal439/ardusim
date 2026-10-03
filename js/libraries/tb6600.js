/**
 * TB6600 Stepper Motor Driver Library Plugin for ArduSim
 *
 * Provides pulse/direction control simulation for TB6600 drivers.
 * Typical usage: digitalWrite() pulse generation on PUL/DIR/ENA pins.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['TB6600'] = {
  classes: ['TB6600', 'TB6600Driver'],
  includes: ['<TB6600.h>'],

  transpile: [
    // TB6600 driver(PUL, DIR, ENA);  or  new TB6600Driver(PUL, DIR, ENA);
    [/\bnew\s+TB6600(?:Driver)?\s*\(([^)]+)\)/g, '_a.tb6600New($1)'],
    // Trailing `;` required so wiring notes inside comments such as
    // "TB6600 PUL (Pulse)" are not rewritten into constructor calls.
    [/\bTB6600\s+(\w+)\s*\(([^)]+)\)\s*;/g, function(match, varName, args) {
      return 'var ' + varName + ' = _a.tb6600New(' + args + ');';
    }],
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
          angle: 0,
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
        if (self.pinStates[dirKey] !== dirVal) {
          self.pinStates[dirKey] = dirVal;
          self._emitPinChange(dirKey, dirVal);
        }

        var pulKey = 'pin_' + d.pulPin;
        var dir = n > 0 ? 1 : -1;
        var absN = Math.abs(n);
        var stepAngle = 1.8 / (d.microstep || 16);

        // Real ms per micro-step derived from the RPM passed to setSpeed().
        // 200 RPM is the baseline (1 ms per micro-step = 1000 steps/s), so a
        // 1/16-microstepped NEMA 17 (3200 usteps/rev) completes a turn in
        // ~3.2 s at 200 RPM, ~1.6 s at 400 RPM and ~0.8 s at 800+ RPM.
        var perStepMs = Math.max(0.2, 200 / Math.max(Number(d.speed) || 200, 1));
        // Aim for one timer per ~33 ms slice. A revolution is 3200 micro-steps,
        // and one chained setTimeout() per micro-step gets clamped to 4 ms by
        // the browser (worse on Windows, ~15 ms), stretching the animation into
        // minutes. ~30 slices/s keeps PUL as a visible square wave while only
        // costing a hundred timers per revolution.
        var sliceMs = 33;

        var advance = function(count) {
          if (!count) return;
          d.position += dir * count;
          d.angle = (d.angle || 0) + dir * count * stepAngle;
        };

        var pulHigh = 1;
        var done = 0;
        while (done < absN) {
          if (!self.isRunning) return;
          var chunk = Math.round(sliceMs / perStepMs);
          if (!(chunk > 0)) chunk = 1;
          if (chunk > absN - done) chunk = absN - done;

          // Alternate PUL high/low each slice so the pin reads as a square wave
          self.pinStates[pulKey] = pulHigh;
          self._emitPinChange(pulKey, pulHigh);
          pulHigh = pulHigh ? 0 : 1;

          advance(chunk);
          done += chunk;

          try {
            await self._delayPromise((chunk * perStepMs) / (self.speed || 1));
          } catch (e) { return; }
        }

        if (self.pinStates[pulKey]) {
          self.pinStates[pulKey] = 0;
          self._emitPinChange(pulKey, 0);
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
