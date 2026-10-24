/**
 * MFRC522 RFID Library Plugin for ArduSim
 *
 * Provides RFID card simulation with draggable virtual tags.
 * Supports both MFRC522 (v1) and MFRC522v2 APIs.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['MFRC522'] = {
  classes: ['MFRC522'],
  includes: ['<MFRC522.h>', '<MFRC522v2.h>', '<MFRC522DriverSPI.h>', '<MFRC522DriverI2C.h>', '<MFRC522DriverPinSimple.h>', '<MFRC522Debug.h>'],

  transpile: [
    // ═══════ MFRC522v2 API: Driver & Constructor rules ═══════
    // MFRC522DriverPinSimple ss_pin(pin); → var ss_pin = _a.rfidDriverPin(pin)
    [/\bMFRC522DriverPinSimple\s+(\w+)\s*\(([^)]+)\)\s*;/g, 'var $1 = _a.rfidDriverPin($2)'],
    // MFRC522DriverSPI driver{pin}; → var driver = _a.rfidDriverSPI(pin)
    [/\bMFRC522DriverSPI\s+(\w+)\s*\{([^}]+)\}\s*;/g, 'var $1 = _a.rfidDriverSPI($2)'],
    // MFRC522DriverI2C driver{}; → var driver = _a.rfidDriverI2C()
    [/\bMFRC522DriverI2C\s+(\w+)\s*\{\s*\}\s*;/g, 'var $1 = _a.rfidDriverI2C()'],
    // MFRC522 mfrc522{driver}; → var mfrc522 = _a.rfidNewV2(driver)
    [/\bMFRC522\s+(\w+)\s*\{([^}]+)\}\s*;/g, 'var $1 = _a.rfidNewV2($2)'],
    // After classes mechanism: var name = new MFRC522(args) → var name = _a.rfidNew(args)
    [/\bvar\s+(\w+)\s*=\s*new\s+MFRC522\s*\(([^)]*)\)/g, 'var $1 = _a.rfidNew($2)'],

    // ═══════ MFRC522v2 API: MFRC522Debug static methods ═══════
    // MFRC522Debug::PCD_DumpVersionToSerial(mfrc522, Serial) → _a.rfidDumpVersion(mfrc522)
    [/\bMFRC522Debug\s*::\s*PCD_DumpVersionToSerial\s*\(\s*(\w+)\s*(?:,\s*\w+\s*)?\)/g, '_a.rfidDumpVersion($1)'],
    // MFRC522Debug::PICC_DumpToSerial(mfrc522, Serial, &(mfrc522.uid)) → _a.rfidDumpToSerial(mfrc522)
    [/\bMFRC522Debug\s*::\s*PICC_DumpToSerial\s*\(\s*(\w+)\s*(?:,\s*\w+\s*(?:,\s*&?\s*\(\s*\w+\.uid\s*\)\s*)?)?\)/g, '_a.rfidDumpToSerial($1)'],
    // MFRC522Debug::PICC_DumpDetailsToSerial(mfrc522, Serial) → _a.rfidDumpDetails(mfrc522)
    [/\bMFRC522Debug\s*::\s*PICC_DumpDetailsToSerial\s*\(\s*(\w+)\s*(?:,\s*\w+\s*)?\)/g, '_a.rfidDumpDetails($1)'],

    // ═══════ MFRC522 v1 API: Instance method rules ═══════
    [/\b(\w+)\.PCD_Init\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidInit(' + varName;
    }],
    [/\b(\w+)\.PCD_DumpVersionToSerial\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpVersion(' + varName;
    }],
    [/\b(\w+)\.PICC_IsNewCardPresent\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidIsNewCard(' + varName;
    }],
    [/\b(\w+)\.PICC_ReadCardSerial\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidReadCard(' + varName;
    }],
    [/\b(\w+)\.PICC_HaltA\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidHaltA(' + varName;
    }],
    [/\b(\w+)\.PCD_StopCrypto1\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidStopCrypto(' + varName;
    }],
    [/\b(\w+)\.uid\.uidByte\b/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidUidBytes(' + varName + ')';
    }],
    [/\b(\w+)\.uid\.size\b/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidUidSize(' + varName + ')';
    }],
    [/\b(\w+)\.MIFARE_Read\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidMifareRead(' + varName + ', ';
    }],
    [/\b(\w+)\.MIFARE_Write\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidMifareWrite(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_REQA\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidREQA(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_WUPA\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidWUPA(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_Select\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidSelect(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_ComputeBCC\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidComputeBCC(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_StopCrypto1\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidStopCrypto(' + varName;
    }],
    [/\b(\w+)\.PICC_DumpDetailsToSerial\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpDetails(' + varName;
    }],
    // v1: PICC_DumpToSerial(mfrc522, &(mfrc522.uid)) — 2 args
    [/\b(\w+)\.PICC_DumpToSerial\s*\(\s*(\w+)\s*,\s*&\s*\(\s*\w+\.uid\s*\)\s*\)/g, '_a.rfidDumpToSerial($2)'],
    // v1: PICC_DumpToSerial(&(mfrc522.uid)) — 1 arg with uid ref
    [/\b(\w+)\.PICC_DumpToSerial\s*\(\s*&\s*\(\s*(\w+)\.uid\s*\)\s*\)/g, '_a.rfidDumpToSerial($2)'],
    // v1: PICC_DumpToSerial(mfrc522) — 1 arg (fallback)
    [/\b(\w+)\.PICC_DumpToSerial\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpToSerial(' + varName;
    }],
    [/\b(\w+)\.PICC_DumpMifareClassicSectorToSerial\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpSector(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_DumpMifareClassicToSerial\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpClassic(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_DumpMifareUltralightToSerial\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpUltralight(' + varName + ', ';
    }],
    // Enum types: MFRC522::MIFARE_Key, MFRC522::PICC_Type → var
    [/\bMFRC522::MIFARE_Key\b/g, 'var'],
    [/\bMFRC522::PICC_Type\b/g, 'var'],
  ],

  runtime: function(self) {
    var _nextRfidId = 1;

    function _getRfid(obj) {
      if (!obj || !obj._rfidId) return null;
      return self._rfid && self._rfid[obj._rfidId];
    }

    function _parseUid(uid) {
      var hex = String(uid || '').replace(/[\s:-]/g, '');
      if (!/^[0-9a-f]+$/i.test(hex) || hex.length < 2 || hex.length % 2 !== 0) return null;
      var bytes = [];
      for (var i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
      return bytes;
    }

    function _findCard() {
      var canvas = window.CircuitCanvas;
      var components = canvas && Array.isArray(canvas.components) ? canvas.components : [];
      var reader = components.find(function(component) { return component.type === 'rc522'; });
      if (!reader) return null;

      var manualTagPresent = Number(
        reader.runtimeState && reader.runtimeState.tagPresent !== undefined
          ? reader.runtimeState.tagPresent
          : reader.props && reader.props.tagPresent
      ) > 0;
      if (manualTagPresent) {
        var manualUid = _parseUid(reader.props && reader.props.uid);
        return manualUid ? { key: 'manual:' + manualUid.join(','), uidBytes: manualUid, reader: reader } : null;
      }

      var readerX = Number(reader.x || 0) + Number(reader.width || 60) / 2;
      var readerY = Number(reader.y || 0) + Number(reader.height || 80) / 2;
      var nearest = null;
      var nearestDistance = 120;

      components.forEach(function(component) {
        if (component.type !== 'rfid_card') return;
        var cardX = Number(component.x || 0) + Number(component.width || 96) / 2;
        var cardY = Number(component.y || 0) + Number(component.height || 62) / 2;
        var distance = Math.hypot(cardX - readerX, cardY - readerY);
        if (distance > nearestDistance) return;

        var uidBytes = _parseUid(component.props && component.props.uid);
        if (!uidBytes) return;
        nearestDistance = distance;
        nearest = {
          key: (component.id || '') + ':' + uidBytes.join(':'),
          uidBytes: uidBytes,
          reader: reader,
        };
      });

      return nearest;
    }

    return {
      // ═══════ v1 API: MFRC522(csPin, rstPin) ═══════
      rfidNew: function(csPin, rstPin) {
        var id = '_rfid_' + _nextRfidId++;
        self._rfid = self._rfid || {};
        self._rfid[id] = { csPin: csPin, rstPin: rstPin, initialized: false, cardPresent: false, uidBytes: [0xA1, 0xB2, 0xC3, 0xD4], uidSize: 4 };
        self._serialLog('[MFRC522] Created CS=' + csPin + ' RST=' + rstPin + '\n', 'system');
        return { _rfidId: id, uid: { uidByte: null, size: 0 } };
      },

      // ═══════ v2 API: Driver & Constructor helpers ═══════
      rfidDriverPin: function(pin) {
        self._serialLog('[MFRC522] DriverPinSimple SS=' + pin + '\n', 'system');
        return { _type: 'rfidDriverPin', pin: pin };
      },
      rfidDriverSPI: function(pinObj) {
        var pin = (pinObj && pinObj.pin) ? pinObj.pin : pinObj;
        self._serialLog('[MFRC522] DriverSPI SS=' + pin + '\n', 'system');
        return { _type: 'rfidDriverSPI', ssPin: pin };
      },
      rfidDriverI2C: function() {
        self._serialLog('[MFRC522] DriverI2C (simulated)\n', 'system');
        return { _type: 'rfidDriverI2C' };
      },
      rfidNewV2: function(driver) {
        var id = '_rfid_' + _nextRfidId++;
        var csPin = (driver && driver.ssPin) ? driver.ssPin : 0;
        self._rfid = self._rfid || {};
        self._rfid[id] = { csPin: csPin, rstPin: 0, initialized: false, cardPresent: false, uidBytes: [0xA1, 0xB2, 0xC3, 0xD4], uidSize: 4 };
        self._serialLog('[MFRC522] Created v2 with driver (simulated)\n', 'system');
        return { _rfidId: id, uid: { uidByte: null, size: 0 } };
      },

      // ═══════ Shared instance methods (v1 & v2) ═══════
      rfidInit: function(obj) {
        var r = _getRfid(obj);
        if (r) {
          r.initialized = true;
          self._serialLog('[MFRC522] PCD_Init\n', 'system');
          self._serialLog('[MFRC522] Firmware: v0x92 (simulated)\n', 'system');
        }
      },
      rfidDumpVersion: function(obj) {
        self._serialLog('[MFRC522] PCD Version: v2.0 (simulated)\n', 'system');
      },
      rfidIsNewCard: function(obj) {
        var r = _getRfid(obj);
        if (!r || !r.initialized) return false;
        var card = _findCard();
        r.cardPresent = !!card;
        if (!card) {
          r.lastPresentKey = null;
          if (r.reader) {
            r.reader.runtimeState = r.reader.runtimeState || {};
            r.reader.runtimeState._rfidCardPresent = false;
          }
          r.reader = null;
          return false;
        }

        r.reader = card.reader;
        r.reader.runtimeState = r.reader.runtimeState || {};
        r.reader.runtimeState._rfidCardPresent = true;
        r.uidBytes = card.uidBytes;
        r.uidSize = card.uidBytes.length;
        if (r.lastPresentKey === card.key) return false;
        r.lastPresentKey = card.key;
        return true;
      },
      rfidReadCard: function(obj) {
        var r = _getRfid(obj);
        if (!r || !r.cardPresent) return false;
        obj.uid = { uidByte: r.uidBytes, size: r.uidSize };
        self._serialLog('[MFRC522] Card UID: ' + r.uidBytes.map(function(b) { return b.toString(16).toUpperCase().padStart(2, '0'); }).join(' ') + '\n', 'system');
        return true;
      },
      rfidHaltA: function(obj) { },
      rfidStopCrypto: function(obj) { },
      rfidUidBytes: function(obj) {
        var r = _getRfid(obj);
        return r ? r.uidBytes : [0];
      },
      rfidUidSize: function(obj) {
        var r = _getRfid(obj);
        return r ? r.uidSize : 0;
      },
      rfidMifareRead: function(obj, blockAddr, buf) {
        self._serialLog('[MFRC522] MIFARE_Read block ' + blockAddr + '\n', 'system');
        return true;
      },
      rfidMifareWrite: function(obj, blockAddr, buf) {
        self._serialLog('[MFRC522] MIFARE_Write block ' + blockAddr + '\n', 'system');
        return true;
      },
      rfidREQA: function(obj) { return 0; },
      rfidWUPA: function(obj) { return 0; },
      rfidSelect: function(obj) { return 0; },
      rfidComputeBCC: function(obj, buf) { return 0; },
      rfidDumpDetails: function(obj) { },
      rfidDumpToSerial: function(obj) { },
      rfidDumpSector: function(obj, uid, sector) { },
      rfidDumpClassic: function(obj, uid, type) { },
      rfidDumpUltralight: function(obj) { },
    };
  },

  constants: {
    PICC_TYPE_MIFARE_1K: 1,
    PICC_TYPE_MIFARE_4K: 2,
    PICC_TYPE_MIFARE_UL: 3,
    PICC_TYPE_NOT_COMPLETE: 0,
    STATUS_OK: 0,
    STATUS_ERROR: 1,
    STATUS_COLLISION: 2,
    STATUS_TIMEOUT: 3,
    STATUS_NO_ROOM: 4,
    STATUS_INTERNAL_ERROR: 5,
    STATUS_INVALID: 6,
    STATUS_CRC_WRONG: 7,
    STATUS_MIFARE_NACK: 8,
  },
};
