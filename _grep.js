const fs = require('fs');
const src = fs.readFileSync('js/simulator.js', 'utf8');
const lines = src.split('\n');
lines.forEach((l, i) => {
  if (l.includes('new RegExp'))
    console.log('Line ' + (i+1) + ': ' + l.trim().substring(0, 150));
});
