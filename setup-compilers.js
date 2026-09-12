/* ═══════════════════════════════════════════════════════
   setup-compilers.js — Toolchain Auto-Installer
   Downloads and installs avr-gcc and xtensa-esp32-elf
   toolchains for server-side Arduino compilation.
   
   Run: node setup-compilers.js
   ═══════════════════════════════════════════════════════ */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const http = require('node:http');
const { execSync } = require('node:child_process');
const zlib = require('node:zlib');
const { pipeline } = require('node:stream/promises');

const TOOLCHAIN_DIR = path.join(__dirname, 'compiler', 'toolchains');

const TOOLCHAINS = {
  avr: {
    name: 'AVR-GCC (Arduino Uno/Nano/Mega)',
    platforms: {
      win32: {
        url: 'https://github.com/arduino/avrdude/releases/download/7.3-arduino.1/avr7-gnu-toolchain-7.3.0.1486-win32.any.zip',
        archive: 'avr-gcc.zip',
        extract: 'zip',
      },
      linux: {
        url: 'https://github.com/arduino/avrdude/releases/download/7.3-arduino.1/avr7-gnu-toolchain-7.3.0.1486-x86_64-linux-any.tar.gz',
        archive: 'avr-gcc.tar.gz',
        extract: 'tar.gz',
      },
      darwin: {
        url: 'https://github.com/arduino/avrdude/releases/download/7.3-arduino.1/avr7-gnu-toolchain-7.3.0.1486-mac-x86_64.tar.gz',
        archive: 'avr-gcc.tar.gz',
        extract: 'tar.gz',
      },
    },
  },
  xtensa: {
    name: 'Xtensa ESP32 GCC',
    platforms: {
      win32: {
        url: 'https://github.com/espressif/xtensa-esp-elf/releases/download/v14.2.0/esp-14.2.0-20241119-esp32-elf.msvc.zip',
        archive: 'xtensa-esp32.zip',
        extract: 'zip',
      },
      linux: {
        url: 'https://github.com/espressif/xtensa-esp-elf/releases/download/v14.2.0/esp-14.2.0-20241119-esp32-elf-linux-amd64.tar.gz',
        archive: 'xtensa-esp32.tar.gz',
        extract: 'tar.gz',
      },
      darwin: {
        url: 'https://github.com/espressif/xtensa-esp-elf/releases/download/v14.2.0/esp-14.2.0-20241119-esp32-elf-macos.tar.gz',
        archive: 'xtensa-esp32.tar.gz',
        extract: 'tar.gz',
      },
    },
  },
};

function _download(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);

    proto.get(url, { headers: { 'User-Agent': 'ArduSim-Compiler/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return _download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(HTTP  for ));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(resolve); });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function _extract(archivePath, destDir, type) {
  if (type === 'zip') {
    if (process.platform === 'win32') {
      execSync(powershell -Command "Expand-Archive -Path '' -DestinationPath '' -Force", { stdio: 'inherit' });
    } else {
      execSync(unzip -o "" -d "", { stdio: 'inherit' });
    }
  } else if (type === 'tar.gz') {
    execSync(	ar -xzf "" -C "", { stdio: 'inherit' });
  }
}

async function installToolchain(toolchainId) {
  const toolchain = TOOLCHAINS[toolchainId];
  if (!toolchain) {
    console.error(Unknown toolchain: );
    return false;
  }

  const platform = toolchain.platforms[process.platform];
  if (!platform) {
    console.error(Unsupported platform:  for );
    return false;
  }

  const destDir = path.join(TOOLCHAIN_DIR, toolchainId);
  if (fs.existsSync(destDir)) {
    console.log(${toolchain.name} already installed at );
    return true;
  }

  console.log(Installing ...);
  console.log(  URL: );

  fs.mkdirSync(TOOLCHAIN_DIR, { recursive: true });

  const archivePath = path.join(TOOLCHAIN_DIR, platform.archive);

  try {
    console.log('  Downloading...');
    await _download(platform.url, archivePath);

    console.log('  Extracting...');
    _extract(archivePath, TOOLCHAIN_DIR, platform.extract);

    // Clean up archive
    fs.unlinkSync(archivePath);

    // Verify installation
    const binDir = path.join(destDir, 'bin');
    if (fs.existsSync(binDir)) {
      console.log(  Installed to: );
      return true;
    } else {
      console.warn(  Warning: bin directory not found at );
      console.warn(  You may need to adjust paths in compiler/board-config.js);
      return true;
    }
  } catch (err) {
    console.error(  Failed to install :, err.message);
    if (fs.existsSync(archivePath)) {
      try { fs.unlinkSync(archivePath); } catch (e) {}
    }
    return false;
  }
}

async function main() {
  console.log('=== ArduSim Compiler Toolchain Installer ===\n');

  fs.mkdirSync(TOOLCHAIN_DIR, { recursive: true });

  const results = {};
  for (const [id, tc] of Object.entries(TOOLCHAINS)) {
    console.log(\n---  ---);
    results[id] = await installToolchain(id);
  }

  console.log('\n=== Installation Summary ===');
  for (const [id, tc] of Object.entries(TOOLCHAINS)) {
    const status = results[id] ? 'OK' : 'FAILED';
    console.log(  : );
  }

  const allOk = Object.values(results).every(Boolean);
  if (allOk) {
    console.log('\nAll toolchains installed successfully!');
    console.log('You can now compile Arduino sketches using the server-side compiler.');
  } else {
    console.log('\nSome toolchains failed to install.');
    console.log('Check the errors above and try again, or install manually.');
  }

  return allOk;
}

if (require.main === module) {
  main().then(ok => process.exit(ok ? 0 : 1));
}

module.exports = { installToolchain, TOOLCHAINS };
