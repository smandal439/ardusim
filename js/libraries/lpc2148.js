/**
 * LPC2148 Register-Level Plugin for ArduSim
 *
 * Provides real LPC2148 ARM7 register definitions and transpilation.
 * Users write authentic C code using IO0DIR, IO0SET, IO0CLR, IO0PIN etc.
 * The transpiler rewrites register operations to simulator runtime calls.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['LPC2148'] = {
  classes: [],
  includes: [],
  priority: 2,

  constants: {
    IO0DIR:  0xE0028008,
    IO0SET:  0xE0028004,
    IO0CLR:  0xE002800C,
    IO0PIN:  0xE0028000,
    IO1DIR:  0xE0029008,
    IO1SET:  0xE0029004,
    IO1CLR:  0xE002900C,
    IO1PIN:  0xE0029000,
    PINSEL0: 0xE002C000,
    PINSEL1: 0xE002C004,
    PINSEL2: 0xE002C014,
    U0RBR:   0xE000C000,
    U0THR:   0xE000C000,
    U0DLL:   0xE000C000,
    U0DLM:   0xE000C004,
    U0LCR:   0xE000C00C,
    U0LSR:   0xE000C014,
    U0FCR:   0xE000C008,
    U0TER:   0xE000C030,
    U1RBR:   0xE0010000,
    U1THR:   0xE0010000,
    U1DLL:   0xE0010000,
    U1DLM:   0xE0010004,
    U1LCR:   0xE001000C,
    U1LSR:   0xE0010014,
    T0IR:    0xE0004000,
    T0TCR:   0xE0004004,
    T0TC:    0xE0004008,
    T0PR:    0xE000400C,
    T0PC:    0xE0004010,
    T0MCR:   0xE0004014,
    T0MR0:   0xE0004018,
    T0MR1:   0xE000401C,
    T0MR2:   0xE0004020,
    T0MR3:   0xE0004024,
    T0CCR:   0xE0004028,
    T0CR0:   0xE000402C,
    T1IR:    0xE0008000,
    T1TCR:   0xE0008004,
    T1TC:    0xE0008008,
    T1PR:    0xE000800C,
    T1PC:    0xE0008010,
    T1MCR:   0xE0008014,
    T1MR0:   0xE0008018,
    AD0CR:   0xE0034000,
    AD0GDR:  0xE0034004,
    AD0INTEN:0xE003400C,
    AD0DR0:  0xE0034010,
    AD0DR1:  0xE0034014,
    AD0DR2:  0xE0034018,
    AD0DR3:  0xE003401C,
    AD0DR4:  0xE0034020,
    AD0DR5:  0xE0034024,
    AD0DR6:  0xE0034028,
    AD0DR7:  0xE003402C,
    DACR:    0xE000C500,
    S0CR:    0xE0020000,
    S0SR:    0xE0020004,
    S0DR:    0xE0020008,
    S0CPSR:  0xE0020010,
    I2C0CONSET: 0xE001C000,
    I2C0STAT:   0xE001C004,
    I2C0DAT:    0xE001C008,
    I2C0SCLL:   0xE001C010,
    I2C0SCLH:   0xE001C014,
    PCLKSEL0: 0xE001C1A4,
    PCLKSEL1: 0xE001C1A8,
    LED1: 12,
    LED2: 13,
    LED3: 14,
    LED4: 15,
    LSR_DR:   0x01,
    LSR_THRE: 0x20,
    LSR_TEMT: 0x40,
    ADC_CR_START:    (1 << 24),
    ADC_CR_BURST:    (1 << 16),
    ADC_CR_PDN:      (1 << 21),
    PINSEL0_TXD0:  (1 << 0),
    PINSEL0_RXD0:  (1 << 2),
    PINSEL0_TXD1:  (1 << 4),
    PINSEL0_RXD1:  (1 << 6),
    PINSEL0_SCK0:  (1 << 8),
    PINSEL0_MISO0: (1 << 10),
    PINSEL0_MOSI0: (1 << 12),
    PINSEL0_SSEL0: (1 << 14),
  },

  transpile: [
    [/\bdelay_ms\s*\(/g, 'await delay('],
    [/\bdelay_us\s*\(/g, 'await delayMicroseconds('],

    // Compound assignments (must precede simple assignment)
    [/\b(IO[01](?:SET|CLR|PIN|DIR))\s*\|=\s*([^;]+)/g,
     '_regW($1, _regR($1) | ($2))'],
    [/\b(IO[01](?:SET|CLR|PIN|DIR))\s*&=\s*~\s*\(([^)]+)\)/g,
     '_regW($1, _regR($1) & ~($2))'],
    [/\b(IO[01](?:SET|CLR|PIN|DIR))\s*&=\s*~\s*(\S+)/g,
     '_regW($1, _regR($1) & ~($2))'],
    [/\b(IO[01](?:SET|CLR|PIN|DIR))\s*&=\s*([^;]+)/g,
     '_regW($1, _regR($1) & ($2))'],
    [/\b(IO[01](?:SET|CLR|PIN|DIR))\s*\^=\s*([^;]+)/g,
     '_regW($1, _regR($1) ^ ($2))'],
    [/\b(IO[01](?:SET|CLR|PIN|DIR))\s*<<=\s*([^;]+)/g,
     '_regW($1, _regR($1) << ($2))'],
    [/\b(IO[01](?:SET|CLR|PIN|DIR))\s*>>=\s*([^;]+)/g,
     '_regW($1, _regR($1) >> ($2))'],

    // Simple assignment
    [/\b(IO[01](?:SET|CLR|PIN|DIR))\s*=\s*([^;]+)/g,
     '_regW($1, ($2))'],

    // Register reads (rvalue)
    [/\b(?<!_reg[WR]\()(IO[01](?:SET|CLR|PIN|DIR))\b/g, '_regR($1)'],

    // Pointer-based register access
    [/\*\s*\(\s*\(\s*volatile\s+(?:unsigned\s+)?(?:long|int|short|char)\s*\*\s*\)\s*(0x[0-9A-Fa-f]+)\s*\)\s*=\s*([^;]+)/g,
     '_regW($1, ($2))'],
    [/\*\s*\(\s*\(\s*volatile\s+(?:unsigned\s+)?(?:long|int|short|char)\s*\*\s*\)\s*(0x[0-9A-Fa-f]+)\s*\)/g,
     '_regR($1)'],

    // Final pass: inline register hex addresses so they don't depend on constant injection
    [/\bIO0DIR\b/g, '0xE0028008'],
    [/\bIO0SET\b/g, '0xE0028004'],
    [/\bIO0CLR\b/g, '0xE002800C'],
    [/\bIO0PIN\b/g, '0xE0028000'],
    [/\bIO1DIR\b/g, '0xE0029008'],
    [/\bIO1SET\b/g, '0xE0029004'],
    [/\bIO1CLR\b/g, '0xE002900C'],
    [/\bIO1PIN\b/g, '0xE0029000'],
    [/\bPINSEL0\b/g, '0xE002C000'],
    [/\bPINSEL1\b/g, '0xE002C004'],
    [/\bPINSEL2\b/g, '0xE002C014'],
    [/\bU0RBR\b/g, '0xE000C000'],
    [/\bU0THR\b/g, '0xE000C000'],
    [/\bU0DLL\b/g, '0xE000C000'],
    [/\bU0DLM\b/g, '0xE000C004'],
    [/\bU0LCR\b/g, '0xE000C00C'],
    [/\bU0LSR\b/g, '0xE000C014'],
    [/\bU0FCR\b/g, '0xE000C008'],
    [/\bU0TER\b/g, '0xE000C030'],
    [/\bU1RBR\b/g, '0xE0010000'],
    [/\bU1THR\b/g, '0xE0010000'],
    [/\bU1DLL\b/g, '0xE0010000'],
    [/\bU1DLM\b/g, '0xE0010004'],
    [/\bU1LCR\b/g, '0xE001000C'],
    [/\bU1LSR\b/g, '0xE0010014'],
    [/\bT0IR\b/g, '0xE0004000'],
    [/\bT0TCR\b/g, '0xE0004004'],
    [/\bT0TC\b/g, '0xE0004008'],
    [/\bT0PR\b/g, '0xE000400C'],
    [/\bT0PC\b/g, '0xE0004010'],
    [/\bT0MCR\b/g, '0xE0004014'],
    [/\bT0MR0\b/g, '0xE0004018'],
    [/\bT0MR1\b/g, '0xE000401C'],
    [/\bT0MR2\b/g, '0xE0004020'],
    [/\bT0MR3\b/g, '0xE0004024'],
    [/\bT0CCR\b/g, '0xE0004028'],
    [/\bT0CR0\b/g, '0xE000402C'],
    [/\bT1IR\b/g, '0xE0008000'],
    [/\bT1TCR\b/g, '0xE0008004'],
    [/\bT1TC\b/g, '0xE0008008'],
    [/\bT1PR\b/g, '0xE000800C'],
    [/\bT1PC\b/g, '0xE0008010'],
    [/\bT1MCR\b/g, '0xE0008014'],
    [/\bT1MR0\b/g, '0xE0008018'],
    [/\bAD0CR\b/g, '0xE0034000'],
    [/\bAD0GDR\b/g, '0xE0034004'],
    [/\bAD0INTEN\b/g, '0xE003400C'],
    [/\bAD0DR0\b/g, '0xE0034010'],
    [/\bAD0DR1\b/g, '0xE0034014'],
    [/\bAD0DR2\b/g, '0xE0034018'],
    [/\bAD0DR3\b/g, '0xE003401C'],
    [/\bAD0DR4\b/g, '0xE0034020'],
    [/\bAD0DR5\b/g, '0xE0034024'],
    [/\bAD0DR6\b/g, '0xE0034028'],
    [/\bAD0DR7\b/g, '0xE003402C'],
    [/\bDACR\b/g, '0xE000C500'],
    [/\bS0CR\b/g, '0xE0020000'],
    [/\bS0SR\b/g, '0xE0020004'],
    [/\bS0DR\b/g, '0xE0020008'],
    [/\bS0CPSR\b/g, '0xE0020010'],
    [/\bI2C0CONSET\b/g, '0xE001C000'],
    [/\bI2C0STAT\b/g, '0xE001C004'],
    [/\bI2C0DAT\b/g, '0xE001C008'],
    [/\bI2C0SCLL\b/g, '0xE001C010'],
    [/\bI2C0SCLH\b/g, '0xE001C014'],
    [/\bPCLKSEL0\b/g, '0xE001C1A4'],
    [/\bPCLKSEL1\b/g, '0xE001C1A8'],
  ],

  runtime: function (self) {
    var regs = {};
    regs[0xE0028000] = 0;
    regs[0xE0028008] = 0;
    regs[0xE0029000] = 0;
    regs[0xE0029008] = 0;
    regs[0xE000C000] = 0;
    regs[0xE000C008] = 0x01;
    regs[0xE0010000] = 0;
    regs[0xE0010008] = 0x01;
    regs[0xE002C000] = 0;

    function _uartHandler(ch) {
      if (self._serialLog) self._serialLog(String.fromCharCode(ch));
    }

    function _readReg(addr) {
      if (regs[addr] === undefined) regs[addr] = 0;

      if (addr === 0xE0028000) {
        var val = regs[addr] & 0xFF000000;
        for (var bit = 0; bit < 24; bit++) {
          var pinKey = 'pin_P0_' + bit;
          var pinState = self.pinStates[pinKey];
          if (pinState && pinState > 0) val |= (1 << bit);
        }
        regs[addr] = val;
      }

      if (addr === 0xE0029000) {
        var val2 = regs[addr] & 0x0000FFFF;
        for (var bit2 = 16; bit2 < 32; bit2++) {
          var pk = 'pin_P1_' + bit2;
          var ps = self.pinStates[pk];
          if (ps && ps > 0) val2 |= (1 << bit2);
        }
        regs[addr] = val2;
      }

      if (addr === 0xE000C014) return regs[addr] | 0x60;
      // UART1 LSR
      if (addr === 0xE0010014) return regs[addr] | 0x60;
      if (addr === 0xE000C000) {
        if (self._lpc2148_uart0_rx && self._lpc2148_uart0_rx.length > 0)
          return self._lpc2148_uart0_rx.shift();
        return 0;
      }
      // UART1 RBR
      if (addr === 0xE0010000) {
        if (self._lpc2148_uart1_rx && self._lpc2148_uart1_rx.length > 0)
          return self._lpc2148_uart1_rx.shift();
        return 0;
      }
      // Timer0 TC: increment if enabled
      if (addr === 0xE0004008) {
        var tcr = regs[0xE0004004] || 0;
        if (tcr & 1) {
          regs[0xE0004008] = (regs[0xE0004008] || 0) + 1;
          var mr0 = regs[0xE0004018] || 0;
          var mcr = regs[0xE0004014] || 0;
          if (mr0 > 0 && (regs[0xE0004008] || 0) >= mr0) {
            if (mcr & 1) regs[0xE0004008] = 0;
            if (mcr & 2) regs[0xE0004000] = (regs[0xE0004000] || 0) | 1;
          }
        }
        return regs[0xE0004008] || 0;
      }
      // Timer1 TC: increment if enabled
      if (addr === 0xE0008008) {
        var tcr1 = regs[0xE0008004] || 0;
        if (tcr1 & 1) {
          regs[0xE0008008] = (regs[0xE0008008] || 0) + 1;
          var mr0_1 = regs[0xE0008018] || 0;
          var mcr1 = regs[0xE0008014] || 0;
          if (mr0_1 > 0 && (regs[0xE0008008] || 0) >= mr0_1) {
            if (mcr1 & 1) regs[0xE0008008] = 0;
            if (mcr1 & 2) regs[0xE0008000] = (regs[0xE0008000] || 0) | 1;
          }
        }
        return regs[0xE0008008] || 0;
      }
      if (addr === 0xE0034004) return regs[addr] || 0;

      return regs[addr];
    }

    function _writeReg(addr, val) {
      regs[addr] = val;

      if (addr === 0xE0028004) {
        for (var b = 0; b < 32; b++) {
          if (val & (1 << b)) {
            var k = 'pin_P0_' + b;
            self.pinStates[k] = 1;
            self._emitPinChange(k, 1);
          }
        }
      }
      if (addr === 0xE002800C) {
        for (var b2 = 0; b2 < 32; b2++) {
          if (val & (1 << b2)) {
            var k2 = 'pin_P0_' + b2;
            self.pinStates[k2] = 0;
            self._emitPinChange(k2, 0);
          }
        }
      }
      if (addr === 0xE0028000) {
        for (var b3 = 0; b3 < 32; b3++) {
          var k3 = 'pin_P0_' + b3;
          var nv = (val & (1 << b3)) ? 1 : 0;
          if (self.pinStates[k3] !== nv) {
            self.pinStates[k3] = nv;
            self._emitPinChange(k3, nv);
          }
        }
      }
      if (addr === 0xE0028008) {
        for (var b4 = 0; b4 < 32; b4++) {
          self.pinModes['pin_P0_' + b4] = (val & (1 << b4)) ? 'OUTPUT' : 'INPUT';
        }
      }
      if (addr === 0xE0029004) {
        for (var b5 = 16; b5 < 32; b5++) {
          if (val & (1 << b5)) {
            var k5 = 'pin_P1_' + b5;
            self.pinStates[k5] = 1;
            self._emitPinChange(k5, 1);
          }
        }
      }
      if (addr === 0xE002900C) {
        for (var b6 = 16; b6 < 32; b6++) {
          if (val & (1 << b6)) {
            var k6 = 'pin_P1_' + b6;
            self.pinStates[k6] = 0;
            self._emitPinChange(k6, 0);
          }
        }
      }
      if (addr === 0xE0029008) {
        for (var b7 = 16; b7 < 32; b7++) {
          self.pinModes['pin_P1_' + b7] = (val & (1 << b7)) ? 'OUTPUT' : 'INPUT';
        }
      }
      if (addr === 0xE000C000) {
        _uartHandler(val & 0xFF);
      }
      // UART1 TX (U1THR)
      if (addr === 0xE0010000) {
        _uartHandler(val & 0xFF);
      }
      // Timer0 TC: increment counter on write
      if (addr === 0xE0004008) {
        regs[0xE0004008] = val;
      }
      // Timer0 TCR: enable/reset
      if (addr === 0xE0004004) {
        regs[0xE0004004] = val;
      }
      // Timer1 TCR: enable/reset
      if (addr === 0xE0008004) {
        regs[0xE0008004] = val;
      }
      if (addr === 0xE0034000) {
        if (val & (1 << 24)) {
          var channel = val & 0x0F;
          var pinId = 'P0_' + (26 + channel);
          var pinKey2 = 'pin_' + pinId;
          var raw = self.pinStates[pinKey2] || 0;
          var adc = Math.min(1023, Math.round(raw * 1023));
          regs[0xE0034004] = (adc << 6) | (1 << 31);
          regs[0xE0034010 + channel * 4] = (adc << 6) | (1 << 31);
        }
      }
      if (addr === 0xE000C500) {
        var dac = (val >> 6) & 0x3FF;
        self.pinStates['pin_DAC'] = dac;
        self._emitPinChange('pin_DAC', dac);
      }
      // PINSEL0: store and set alternate pin functions
      if (addr === 0xE002C000) {
        regs[0xE002C000] = val;
        for (var pn = 0; pn < 16; pn++) {
          var func = (val >> (pn * 2)) & 0x03;
          var pk = 'pin_P0_' + pn;
          if (func === 1) self.pinModes[pk] = 'ALT1';
          else if (func === 2) self.pinModes[pk] = 'ALT2';
          else if (func === 3) self.pinModes[pk] = 'ALT3';
        }
      }
      if (addr === 0xE002C004) {
        regs[0xE002C004] = val;
      }
      }
    }

    return { _regR: _readReg, _regW: _writeReg };
  },
};
