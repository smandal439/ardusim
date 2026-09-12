/* ═══════════════════════════════════════════════════════
   compile.js — Server-side Arduino Compiler Module
   Compiles Arduino C++ sketches using avr-gcc / xtensa toolchains.
   Produces .hex firmware binaries with size analysis.
   ═══════════════════════════════════════════════════════ */

'use strict';

const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const { BOARDS } = require('./board-config');

const COMPILER_TIMEOUT_MS = 30000;
const MAX_CODE_LENGTH = 100_000;
const MAX_COMPILE_CACHE = 50;

/* ══════════════ COMPILE CACHE (LRU) ══════════════ */
const _cache = new Map();

function _cacheKey(code, boardType) {
  return crypto.createHash('sha256').update(code + ':' + boardType).digest('hex').slice(0, 32);
}

function _cacheGet(key) {
  if (!_cache.has(key)) return null;
  const entry = _cache.get(key);
  _cache.delete(key);
  _cache.set(key, entry);
  return entry;
}

function _cacheSet(key, value) {
  if (_cache.has(key)) _cache.delete(key);
  _cache.set(key, value);
  while (_cache.size > MAX_COMPILE_CACHE) {
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
}

/* ══════════════ TEMP DIRECTORY ══════════════ */
function _createTempDir() {
  const id = crypto.randomBytes(8).toString('hex');
  const dir = path.join(__dirname, '.tmp', 'build_' + id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function _cleanupTempDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    console.error('[Compiler] Cleanup error:', e.message);
  }
}

/* ══════════════ WRAP SKETCH ══════════════ */
function _buildMainCpp(code) {
  const lines = [
    '#include <Arduino.h>',
    '',
  ];

  const trimmed = code.trim();
  const hasSetup = /\bvoid\s+setup\s*\(/.test(trimmed);
  const hasLoop = /\bvoid\s+loop\s*\(/.test(trimmed);

  if (!hasSetup) {
    lines.push('void setup() {}');
    lines.push('');
  }

  if (!hasLoop) {
    lines.push('void loop() {}');
    lines.push('');
  }

  lines.push(code);

  return lines.join('\n');
}

/* ══════════════ ERROR PARSING ══════════════ */
function _parseCompilerOutput(stderr) {
  const errors = [];
  const warnings = [];
  const lines = (stderr || '').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const errorMatch = trimmed.match(/^(.+?):(\d+)(?::(\d+))?:\s*(error:.+)$/);
    if (errorMatch) {
      errors.push({
        file: errorMatch[1],
        line: parseInt(errorMatch[2], 10),
        column: errorMatch[3] ? parseInt(errorMatch[3], 10) : 0,
        message: errorMatch[4],
      });
      continue;
    }

    const warningMatch = trimmed.match(/^(.+?):(\d+)(?::(\d+))?:\s*(warning:.+)$/);
    if (warningMatch) {
      warnings.push({
        file: warningMatch[1],
        line: parseInt(warningMatch[2], 10),
        column: warningMatch[3] ? parseInt(warningMatch[3], 10) : 0,
        message: warningMatch[4],
      });
      continue;
    }

    if (trimmed.startsWith('error:') || trimmed.startsWith('fatal error:')) {
      errors.push({ file: '', line: 0, column: 0, message: trimmed });
    }
  }

  return { errors, warnings };
}

/* ══════════════ SIZE PARSING ══════════════ */
function _parseAvrSize(output, boardConfig) {
  const lines = output.trim().split('\n');
  if (lines.length < 2) return null;

  const parts = lines[1].trim().split(/\s+/);
  if (parts.length < 3) return null;

  const text = parseInt(parts[0], 10);
  const data = parseInt(parts[1], 10);
  const bss = parseInt(parts[2], 10);

  if (isNaN(text) || isNaN(data) || isNaN(bss)) return null;

  return {
    flash: text + data,
    ram: data + bss,
    text,
    data,
    bss,
    flashMax: boardConfig.flashMax,
    ramMax: boardConfig.ramMax,
    flashPercent: ((text + data) / boardConfig.flashMax * 100).toFixed(1),
    ramPercent: ((data + bss) / boardConfig.ramMax * 100).toFixed(1),
  };
}

/* ══════════════ RUN COMPILER ══════════════ */
async function _runCompiler(compiler, args, workDir, timeout = COMPILER_TIMEOUT_MS) {
  const opts = {
    cwd: workDir,
    timeout,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  };

  try {
    const { stdout, stderr } = await execFileAsync(compiler, args, opts);
    return { ok: true, stdout, stderr };
  } catch (err) {
    return {
      ok: false,
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || String(err),
    };
  }
}

/* ══════════════ MAIN COMPILE FUNCTION ══════════════ */
async function compileSketch(code, boardType) {
  const startTime = Date.now();

  if (typeof code !== 'string' || !code.trim()) {
    return { ok: false, error: 'No code provided', errors: [], warnings: [], duration: 0 };
  }

  if (code.length > MAX_CODE_LENGTH) {
    return { ok: false, error: 'Code exceeds maximum length (100 KB)', errors: [], warnings: [], duration: 0 };
  }

  const boardConfig = BOARDS[boardType];
  if (!boardConfig) {
    return { ok: false, error: Unknown board type: , errors: [], warnings: [], duration: 0 };
  }

  const cacheKey = _cacheKey(code, boardType);
  const cached = _cacheGet(cacheKey);
  if (cached) {
    return { ...cached, duration: Date.now() - startTime, cached: true };
  }

  const workDir = _createTempDir();

  try {
    // Write the main sketch file
    const mainCpp = _buildMainCpp(code);
    const mainPath = path.join(workDir, 'sketch.cpp');
    fs.writeFileSync(mainPath, mainCpp, 'utf8');

    const objectPath = path.join(workDir, 'sketch.o');
    const elfPath = path.join(workDir, 'sketch.elf');
    const hexPath = path.join(workDir, 'sketch.hex');
    const mapFile = path.join(workDir, 'sketch.map');

    const includeArgs = boardConfig.includePaths.flatMap(p => ['-I', p]);
    const defineArgs = boardConfig.defines.flatMap(d => ['-D', d]);

    // Step 1: Compile C++ to object
    const compileArgs = [
      ...boardConfig.cppFlags,
      ...defineArgs,
      ...includeArgs,
      '-o', objectPath,
      mainPath,
    ];

    const compileResult = await _runCompiler(boardConfig.compilerCpp, compileArgs, workDir);

    if (!compileResult.ok) {
      const parsed = _parseCompilerOutput(compileResult.stderr);
      const errorMsg = parsed.errors.length > 0
        ? parsed.errors.map(e => e.line > 0 ? Line :  : e.message).join('; ')
        : (compileResult.stderr || 'Compilation failed');
      return {
        ok: false,
        error: errorMsg,
        errors: parsed.errors,
        warnings: parsed.warnings,
        duration: Date.now() - startTime,
      };
    }

    // Step 2: Link to ELF
    const resolvedLinkerFlags = boardConfig.linkerFlags.map(f =>
      f.replace(/\$\{mapFile\}/g, mapFile)
    );

    const linkArgs = [
      ...resolvedLinkerFlags,
      elfPath,
      objectPath,
    ];

    const linkResult = await _runCompiler(boardConfig.compilerCpp, linkArgs, workDir);

    if (!linkResult.ok) {
      const parsed = _parseCompilerOutput(linkResult.stderr);
      const errorMsg = parsed.errors.length > 0
        ? parsed.errors.map(e => e.message).join('; ')
        : (linkResult.stderr || 'Linking failed');
      return {
        ok: false,
        error: errorMsg,
        errors: parsed.errors,
        warnings: parsed.warnings,
        duration: Date.now() - startTime,
      };
    }

    // Step 3: Convert ELF to HEX
    const objcopyArgs = ['-O', 'ihex', elfPath, hexPath];
    const objcopyResult = await _runCompiler(boardConfig.objcopy, objcopyArgs, workDir);

    if (!objcopyResult.ok) {
      return {
        ok: false,
        error: 'Failed to generate HEX file: ' + (objcopyResult.stderr || 'objcopy failed'),
        errors: [],
        warnings: [],
        duration: Date.now() - startTime,
      };
    }

    // Step 4: Read HEX file
    let hex;
    try {
      hex = fs.readFileSync(hexPath, 'utf8');
    } catch (e) {
      return {
        ok: false,
        error: 'Failed to read HEX file: ' + e.message,
        errors: [],
        warnings: [],
        duration: Date.now() - startTime,
      };
    }

    // Step 5: Get size info
    let size = null;
    try {
      const sizeResult = await _runCompiler(boardConfig.size, [elfPath], workDir);
      if (sizeResult.ok) {
        size = _parseAvrSize(sizeResult.stdout, boardConfig);
      }
    } catch (e) {
      // Size info is optional
    }

    const warnings = _parseCompilerOutput(compileResult.stderr).warnings;

    const result = {
      ok: true,
      hex,
      size,
      warnings,
      errors: [],
      duration: Date.now() - startTime,
      board: boardConfig.name,
      boardType,
    };

    _cacheSet(cacheKey, result);

    return result;

  } catch (err) {
    return {
      ok: false,
      error: 'Internal compiler error: ' + (err.message || String(err)),
      errors: [],
      warnings: [],
      duration: Date.now() - startTime,
    };
  } finally {
    _cleanupTempDir(workDir);
  }
}

/* ══════════════ TOOLCHAIN CHECK ══════════════ */
function checkToolchains() {
  const status = {};
  for (const [boardId, config] of Object.entries(BOARDS)) {
    status[boardId] = {
      name: config.name,
      available: false,
      compiler: config.compiler,
    };
    try {
      fs.accessSync(config.compiler, fs.constants.X_OK);
      status[boardId].available = true;
    } catch (e) {
      try {
        fs.accessSync(config.compiler + '.exe', fs.constants.X_OK);
        status[boardId].available = true;
      } catch (e2) {
        status[boardId].available = false;
      }
    }
  }
  return status;
}

module.exports = {
  compileSketch,
  checkToolchains,
  BOARDS,
};
