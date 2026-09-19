const fs = require('fs');
const t = fs.readFileSync('js/components/base.js', 'utf8');
const lines = t.split('\n');
lines.forEach((line, i) => {
  const m = line.match(/icon:\s*['"]([^'"]+)['"]/);
  if (m) {
    const icon = m[1];
    const bad = [...icon].filter(c => {
      const cp = c.codePointAt(0);
      return cp === 0x00E2 || cp === 0x0090 || cp === 0x00F0 || cp === 0x0178 || cp === 0x201C || cp === 0x00AE || cp === 0x2014;
    });
    if (bad.length > 0) {
      const cps = [...icon].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
      console.log(`L${i+1}: icon='${icon}' ${cps.join(' ')}`);
    }
  }
});
