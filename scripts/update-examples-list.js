#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const examplesDir = path.join(root, 'Examples');
const simPath = path.join(root, 'js', 'simulator.js');

// 1. Scan Examples/ for all .json files
const files = fs.readdirSync(examplesDir)
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace('.json', ''))
  .sort();

// 2. Read simulator.js
let src = fs.readFileSync(simPath, 'utf8');

// 3. Find and replace the hardcoded const files = [...] block
const pattern = /const files = \[[\s\S]*?\];/;
const match = src.match(pattern);

if (!match) {
  console.error('ERROR: Could not find const files = [...] in simulator.js');
  process.exit(1);
}

// Build the replacement array, 6 entries per line
const lines = [];
for (let i = 0; i < files.length; i += 6) {
  lines.push('    ' + files.slice(i, i + 6).map(f => "'" + f + "'").join(', '));
}
const replacement = 'const files = [\n' + lines.join(',\n') + '\n  ];';

src = src.replace(pattern, replacement);
fs.writeFileSync(simPath, src, 'utf8');

console.log('Updated simulator.js with ' + files.length + ' examples');
