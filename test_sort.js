var w={Intel8085Emulator:null, Intel8085Assembler:null};
eval(require('fs').readFileSync('./js/libraries/intel8085_assembler.js','utf8').replace('window.','w.'));
eval(require('fs').readFileSync('./js/libraries/intel8085_emulator.js','utf8').replace('window.','w.'));

var src = [
  'ORG 8000H',
  'START:',
  '  LXI H, 9050H',
  '  MVI D, 00H',
  '  MVI C, 02H',
  'CHECK:',
  '  MOV A, M',
  '  INX H',
  '  CMP M',
  '  JC NEXTBYTE',
  '  JZ NEXTBYTE',
  '  MOV B, M',
  '  MOV M, A',
  '  DCX H',
  '  MOV M, B',
  '  INX H',
  '  MVI D, 01H',
  'NEXTBYTE:',
  '  DCR C',
  '  JNZ CHECK',
  '  MOV A, D',
  '  CPI 01H',
  '  JZ START',
  '  HLT',
  'ORG 9050H',
  '  DB 87H, 56H, 75H',
  'END'
].join('\n');

var r = w.Intel8085Assembler.assemble(src);
if (r.errors.length) { console.log('ERRORS:', r.errors); process.exit(1); }

var cpu = new w.Intel8085Emulator();
for (var s = 0; s < r.segments.length; s++) {
  var seg = r.segments[s];
  var b = [];
  for (var j = 0; j < seg.data.length; j++) b.push(seg.data[j]);
  cpu.load(b, seg.addr);
}

console.log('Initial memory at 9050H:', [cpu.memory[0x9050], cpu.memory[0x9051], cpu.memory[0x9052]].map(function(x){return x.toString(16).toUpperCase();}).join(', '));

cpu.PC = 0x8000;
var maxSteps = 500;
for (var c = 0; c < maxSteps && !cpu.halted; c++) {
  var pc = cpu.PC;
  var op = cpu.memory[pc];
  
  // Decode instruction name for logging
  var name = '??';
  if (op === 0x21) name = 'LXI H,d16';
  else if (op === 0x16) name = 'MVI D,d8';
  else if (op === 0x0E) name = 'MVI C,d8';
  else if (op === 0x7E) name = 'MOV A,M';
  else if (op === 0x23) name = 'INX H';
  else if (op === 0xBE) name = 'CMP M';
  else if (op === 0xDA) name = 'JC addr';
  else if (op === 0xCA) name = 'JZ addr';
  else if (op === 0x46) name = 'MOV B,M';
  else if (op === 0x77) name = 'MOV M,A';
  else if (op === 0x2B) name = 'DCX H';
  else if (op === 0x70) name = 'MOV M,B';
  else if (op === 0x16) name = 'MVI D,d8';
  else if (op === 0x0D) name = 'DCR C';
  else if (op === 0xC2) name = 'JNZ addr';
  else if (op === 0x7A) name = 'MOV A,D';
  else if (op === 0xFE) name = 'CPI d8';
  else if (op === 0xCA) name = 'JZ addr';
  else if (op === 0x76) name = 'HLT';
  
  var prevA = cpu.A;
  var prevC = cpu.C;
  var prevHL = (cpu.H << 8) | cpu.L;
  
  cpu.step();
  
  var memStr = [cpu.memory[0x9050], cpu.memory[0x9051], cpu.memory[0x9052]].map(function(x){return ('0'+x.toString(16)).slice(-2).toUpperCase();}).join(' ');
  
  if (op === 0x21 || op === 0x16 || op === 0x0E || op === 0x7E || op === 0xBE || 
      op === 0x46 || op === 0x77 || op === 0x70 || op === 0x0D || op === 0xC2 || 
      op === 0xCA || op === 0xDA || op === 0xFE || op === 0x76 || op === 0x7A ||
      op === 0x23 || op === 0x2B) {
    console.log(c + ': PC=' + ('0000'+pc.toString(16)).slice(-4).toUpperCase() + 
      ' ' + name + 
      ' A=' + ('0'+prevA.toString(16)).slice(-2).toUpperCase() +
      ' HL=' + ('0000'+prevHL.toString(16)).slice(-4).toUpperCase() +
      ' C=' + ('0'+prevC.toString(16)).slice(-2).toUpperCase() +
      ' F=' + ('0'+cpu.F.toString(16)).slice(-2).toUpperCase() +
      ' | [' + memStr + ']');
  }
}

console.log('\nFinal memory at 9050H:', [cpu.memory[0x9050], cpu.memory[0x9051], cpu.memory[0x9052]].map(function(x){return x.toString(16).toUpperCase();}).join(', '));
console.log('Halted:', cpu.halted);
