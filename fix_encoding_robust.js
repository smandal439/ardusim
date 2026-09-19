const fs = require('fs');
const path = require('path');

// Build Unicode -> CP1252 byte reverse map
// CP1252 maps bytes 0x00-0xFF to Unicode codepoints
const cp1252Forward = new Uint16Array(256);
cp1252Forward[0x80] = 0x20AC; cp1252Forward[0x81] = 0xFFFD; cp1252Forward[0x82] = 0x201A;
cp1252Forward[0x83] = 0x0192; cp1252Forward[0x84] = 0x201E; cp1252Forward[0x85] = 0x2026;
cp1252Forward[0x86] = 0x2020; cp1252Forward[0x87] = 0x2021; cp1252Forward[0x88] = 0x02C6;
cp1252Forward[0x89] = 0x2030; cp1252Forward[0x8A] = 0x0160; cp1252Forward[0x8B] = 0x2039;
cp1252Forward[0x8C] = 0x0152; cp1252Forward[0x8D] = 0xFFFD; cp1252Forward[0x8E] = 0x017D;
cp1252Forward[0x8F] = 0xFFFD; cp1252Forward[0x90] = 0xFFFD; cp1252Forward[0x91] = 0x2018;
cp1252Forward[0x92] = 0x2019; cp1252Forward[0x93] = 0x201C; cp1252Forward[0x94] = 0x201D;
cp1252Forward[0x95] = 0x2022; cp1252Forward[0x96] = 0x2013; cp1252Forward[0x97] = 0x2014;
cp1252Forward[0x98] = 0x02DC; cp1252Forward[0x99] = 0x2122; cp1252Forward[0x9A] = 0x0161;
cp1252Forward[0x9B] = 0x203A; cp1252Forward[0x9C] = 0x0153; cp1252Forward[0x9D] = 0xFFFD;
cp1252Forward[0x9E] = 0x017E; cp1252Forward[0x9F] = 0x0178;
for (let i = 0x00; i < 0x80; i++) cp1252Forward[i] = i;
for (let i = 0xA0; i <= 0xFF; i++) cp1252Forward[i] = i;

const unicodeToByte = new Map();
for (let b = 0; b < 256; b++) {
  const u = cp1252Forward[b];
  if (u !== 0xFFFD) unicodeToByte.set(u, b);
}

function canDecodeToByte(cp) { return unicodeToByte.has(cp); }
function toByte(cp) { return unicodeToByte.get(cp); }

function fixFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const result = [];
  let i = 0;
  let fixes = 0;

  while (i < text.length) {
    const cp = text.codePointAt(i);
    const charLen = cp > 0xFFFF ? 2 : 1;

    if (!canDecodeToByte(cp)) {
      result.push(text.substring(i, i + charLen));
      i += charLen;
      continue;
    }

    // Accumulate consecutive decodable chars
    const bytes = [];
    let j = i;
    while (j < text.length) {
      const cp2 = text.codePointAt(j);
      const l2 = cp2 > 0xFFFF ? 2 : 1;
      if (!canDecodeToByte(cp2)) break;
      bytes.push(toByte(cp2));
      j += l2;
    }

    const seqLen = j - i;
    if (seqLen < 2) {
      result.push(text.substring(i, i + charLen));
      i += charLen;
      continue;
    }

    // Try to decode the bytes as UTF-8
    const buf = Buffer.from(bytes);
    let decoded;
    try {
      decoded = buf.toString('utf8');
    } catch (e) {
      result.push(text.substring(i, j));
      i = j;
      continue;
    }

    // Check for replacement characters (invalid UTF-8)
    if (decoded.includes('\uFFFD')) {
      result.push(text.substring(i, j));
      i = j;
      continue;
    }

    // Check if decoding produced fewer characters (meaning it was double-encoded)
    const decodedChars = [...decoded];
    if (decodedChars.length < seqLen) {
      result.push(decoded);
      fixes += seqLen - decodedChars.length;
      i = j;
    } else {
      result.push(text.substring(i, j));
      i = j;
    }
  }

  if (fixes > 0) {
    let output = result.join('');
    // Remove BOM if present
    if (output.charCodeAt(0) === 0xFEFF) output = output.substring(1);
    fs.writeFileSync(filePath, output, 'utf8');
  }
  return fixes;
}

// Collect all source files
const root = process.argv[2] || '.';
const extensions = ['.html', '.js', '.css', '.json'];
const skipDirs = ['node_modules', '.git', 'dist'];
const skipFiles = ['fix_encoding_robust.js'];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.includes(entry.name)) walk(fullPath);
    } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
      if (!skipFiles.includes(entry.name)) {
        const fixes = fixFile(fullPath);
        if (fixes > 0) console.log(fullPath + ': fixed ' + fixes + ' double-encoded chars');
      }
    }
  }
}

walk(root);
console.log('Done.');
