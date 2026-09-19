const fs = require('fs');
const files = ['js/components/actuators.js', 'js/components/sensors.js', 'js/components/passive.js', 'js/components/output.js', 'js/components/boards.js'];
files.forEach(f => {
  try {
    const t = fs.readFileSync(f, 'utf8');
    const lines = t.split('\n');
    lines.forEach((line, i) => {
      const m = line.match(/icon:\s*['"]([^'"]+)['"]/);
      if (m) {
        const icon = m[1];
        const bad = [...icon].some(c => {
          const cp = c.codePointAt(0);
          return cp === 0x00E2 || cp === 0x0090 || cp === 0x00F0 || cp === 0x0178;
        });
        if (bad) {
          const cps = [...icon].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
          console.log(f + ' L' + (i+1) + ': ' + icon + ' ' + cps.join(' '));
        }
      }
    });
  } catch(e) {}
});
