(function(){
'use strict';
var REGS=['B','C','D','E','H','L','M','A'];
var RPAIRS={B:0,D:1,H:2,SP:3,PSW:5};

function parseNum(s){
  s=s.trim();
  if(/^[0-9A-Fa-f]+H$/i.test(s))return parseInt(s.slice(0,-1),16);
  if(/^[01]+B$/i.test(s))return parseInt(s.slice(0,-1),2);
  if(/^0[xX][0-9A-Fa-f]+$/i.test(s))return parseInt(s,16);
  if(/^0[bB][01]+$/.test(s))return parseInt(s.slice(2),2);
  var v=parseInt(s,10);return isNaN(v)?null:v;
}

function isReg(s){return REGS.indexOf(s.toUpperCase())>=0;}

function toNum(op,symbols,pass,ln,errs){
  op=op.trim();
  if(op==='')return null;
  var u=op.toUpperCase();
  if(symbols[u]!==undefined)return symbols[u];
  if(symbols.hasOwnProperty(op))return symbols[op];
  var v=parseNum(op);
  if(v!==null)return v;
  if(pass===2)errs.push('Line '+ln+': undefined symbol: '+op);
  return 0;
}

function parseLine(line){
  var raw=line, inStr=false, ci=-1;
  for(var i=0;i<line.length;i++){
    if(line[i]==='"'||line[i]==="'")inStr=!inStr;
    if(!inStr&&line[i]===';'){ci=i;break;}
  }
  var nc=ci>=0?line.substring(0,ci):line;
  var cmt=ci>=0?line.substring(ci+1).trim():'';
  var s=nc.replace(/\t/g,' ').trim();
  var label='',mnemonic='',operand='';
  var di=-1;inStr=false;
  for(var j=0;j<s.length;j++){
    if(s[j]==='"'||s[j]==="'")inStr=!inStr;
    if(!inStr&&s[j]===':'){di=j;break;}
  }
  if(di>=0){label=s.substring(0,di).trim();s=s.substring(di+1).trim();}
  if(s.length>0){
    var sp=s.split(/[ \t]+/);
    mnemonic=sp[0].toUpperCase();
    if(sp.length>1)operand=sp.slice(1).join(' ').trim();
  }
  return{raw:raw,label:label,mnemonic:mnemonic,operand:operand,comment:cmt};
}

function sizeOf(m,parts,symbols,ln,errs){
  if(m==='NOP'||m==='SPHL'||m==='XCHG'||m==='CMA'||m==='STC'||m==='CMC'
    ||m==='RLC'||m==='RRC'||m==='RAL'||m==='RAR'||m==='DAA'||m==='PCHL'
    ||m==='HLT'||m==='EI'||m==='DI')return 1;
  if(m==='RST')return 1;
  if(m==='PUSH'||m==='POP')return 1;
  if(m==='INX'||m==='DCX'||m==='DAD')return 1;
  if(m==='IN'||m==='OUT')return 2;
  if(m==='LXI')return 3;
  if(m==='LDA'||m==='STA'||m==='LHLD'||m==='SHLD')return 3;
  if(m==='LDAX'||m==='STAX')return 1;
  if(m==='MOV')return 1;
  if(m==='MVI')return 2;
  if(m==='ADI'||m==='ACI'||m==='SUI'||m==='SBI'||m==='ANI'||m==='XRI'||m==='ORI'||m==='CPI')return 2;
  if(m==='ADD'||m==='ADC'||m==='SUB'||m==='SBB'||m==='ANA'||m==='XRA'||m==='ORA'||m==='CMP')return 1;
  if(m==='INR'||m==='DCR')return 1;
  var jmps=['JMP','JC','JNC','JZ','JNZ','JP','JM','JPE','JPO'];
  if(jmps.indexOf(m)>=0)return 3;
  var calls=['CALL','CC','CNC','CZ','CNZ','CP','CM','CPE','CPO'];
  if(calls.indexOf(m)>=0)return 3;
  var rets=['RET','RC','RNC','RZ','RNZ','RP','RM','RPE','RPO'];
  if(rets.indexOf(m)>=0)return 1;
  if(m==='PCHL')return 1;
  errs.push('Line '+ln+': unknown instruction: '+m);
  return 0;
}

function encode(m,parts,addr,symbols,ln,errs){
  var b=[];

  // Single-byte no-operand
  if(m==='NOP'){b.push(0x00);return b;}
  if(m==='SPHL'){b.push(0xF9);return b;}
  if(m==='XCHG'){b.push(0xEB);return b;}
  if(m==='CMA'){b.push(0x2F);return b;}
  if(m==='STC'){b.push(0x37);return b;}
  if(m==='CMC'){b.push(0x3F);return b;}
  if(m==='RLC'){b.push(0x07);return b;}
  if(m==='RRC'){b.push(0x0F);return b;}
  if(m==='RAL'){b.push(0x17);return b;}
  if(m==='RAR'){b.push(0x1F);return b;}
  if(m==='DAA'){b.push(0x27);return b;}
  if(m==='PCHL'){b.push(0xE9);return b;}
  if(m==='HLT'){b.push(0x76);return b;}
  if(m==='EI'){b.push(0xFB);return b;}
  if(m==='DI'){b.push(0xF3);return b;}

  // RST n
  if(m==='RST'){var rn=toNum(parts[0],symbols,2,ln,errs);b.push(0xC7+(rn&7)*8);return b;}

  // IN/OUT
  if(m==='IN'){b.push(0xDB);var v=toNum(parts[0],symbols,2,ln,errs);b.push(v!==null?(v&0xFF):0);return b;}
  if(m==='OUT'){b.push(0xD3);var v2=toNum(parts[0],symbols,2,ln,errs);b.push(v2!==null?(v2&0xFF):0);return b;}

  // LXI rp, imm16
  if(m==='LXI'){
    var rp=parts[0].toUpperCase();
    var rm={B:0,D:1,H:2,SP:3};
    b.push(0x01|((rm[rp]||0)<<4));
    var a16=toNum(parts[1],symbols,2,ln,errs);
    b.push(a16!==null?(a16&0xFF):0);
    b.push(a16!==null?((a16>>8)&0xFF):0);
    return b;
  }

  // LDA/STA/LHLD/SHLD addr
  var dirMap={LDA:0x3A,STA:0x32,LHLD:0x2A,SHLD:0x22};
  if(dirMap[m]!==undefined){
    b.push(dirMap[m]);
    var da=toNum(parts[0],symbols,2,ln,errs);
    b.push(da!==null?(da&0xFF):0);
    b.push(da!==null?((da>>8)&0xFF):0);
    return b;
  }

  // LDAX/STAX rp
  if(m==='LDAX'){var lr=parts[0].toUpperCase();b.push(lr==='D'?0x1A:0x0A);return b;}
  if(m==='STAX'){var sr=parts[0].toUpperCase();b.push(sr==='D'?0x12:0x02);return b;}

  // PUSH/POP
  if(m==='PUSH'){var pp=parts[0].toUpperCase();var pm={B:0xC5,D:0xD5,H:0xE5,PSW:0xF5};b.push(pm[pp]||0xC5);return b;}
  if(m==='POP'){var po=parts[0].toUpperCase();var pom={B:0xC1,D:0xD1,H:0xE1,PSW:0xF1};b.push(pom[po]||0xC1);return b;}

  // INX/DCX/DAD
  if(m==='INX'){var ix=parts[0].toUpperCase();var ixm={B:0x03,D:0x13,H:0x23,SP:0x33};b.push(ixm[ix]||0x03);return b;}
  if(m==='DCX'){var dx=parts[0].toUpperCase();var dxm={B:0x0B,D:0x1B,H:0x2B,SP:0x3B};b.push(dxm[dx]||0x0B);return b;}
  if(m==='DAD'){var dd=parts[0].toUpperCase();var ddm={B:0x09,D:0x19,H:0x29,SP:0x39};b.push(ddm[dd]||0x09);return b;}

  // MOV r,r
  if(m==='MOV'){
    var dr=parts[0].toUpperCase();
    var src=parts[1].toUpperCase();
    var di2=REGS.indexOf(dr);
    var si=REGS.indexOf(src);
    b.push(0x40+di2*8+si);
    return b;
  }

  // MVI r,imm8
  if(m==='MVI'){
    var mr=parts[0].toUpperCase();
    var mm={B:0x06,C:0x0E,D:0x16,E:0x1E,H:0x26,L:0x2E,M:0x36,A:0x3E};
    b.push(mm[mr]||0x06);
    var iv=toNum(parts[1],symbols,2,ln,errs);
    b.push(iv!==null?(iv&0xFF):0);
    return b;
  }

  // ALU reg (ADD/ADC/SUB/SBB/ANA/XRA/ORA/CMP)
  var aluM={ADD:0x80,ADC:0x88,SUB:0x90,SBB:0x98,ANA:0xA0,XRA:0xA8,ORA:0xB0,CMP:0xB8};
  if(aluM[m]!==undefined){
    var ri=REGS.indexOf(parts[0].toUpperCase());
    b.push(aluM[m]+ri);
    return b;
  }

  // Immediate ALU (ADI/ACI/SUI/SBI/ANI/XRI/ORA_I/CPI)
  var immM={ADI:0xC6,ACI:0xCE,SUI:0xD6,SBI:0xDE,ANI:0xE6,XRI:0xEE,ORI:0xF6,CPI:0xFE};
  if(immM[m]!==undefined){
    b.push(immM[m]);
    var imv=toNum(parts[0],symbols,2,ln,errs);
    b.push(imv!==null?(imv&0xFF):0);
    return b;
  }

  // INR/DCR r
  if(m==='INR'){var ir=REGS.indexOf(parts[0].toUpperCase());b.push(0x04+ir*8);return b;}
  if(m==='DCR'){var dr2=REGS.indexOf(parts[0].toUpperCase());b.push(0x05+dr2*8);return b;}

  // JMP/CALL addr
  var jm={JMP:0xC3,JC:0xDA,JNC:0xD2,JZ:0xCA,JNZ:0xC2,JP:0xF2,JM:0xFA,JPE:0xEA,JPO:0xE2};
  var cm={CALL:0xCD,CC:0xDC,CNC:0xD4,CZ:0xCC,CNZ:0xC4,CP:0xF4,CM:0xFC,CPE:0xEC,CPO:0xE4};
  if(jm[m]!==undefined){
    b.push(jm[m]);
    var ja=toNum(parts[0],symbols,2,ln,errs);
    b.push(ja!==null?(ja&0xFF):0);
    b.push(ja!==null?((ja>>8)&0xFF):0);
    return b;
  }
  if(cm[m]!==undefined){
    b.push(cm[m]);
    var ca=toNum(parts[0],symbols,2,ln,errs);
    b.push(ca!==null?(ca&0xFF):0);
    b.push(ca!==null?((ca>>8)&0xFF):0);
    return b;
  }

  // RET and conditional
  var rm2={RET:0xC9,RC:0xD8,RNC:0xD0,RZ:0xC8,RNZ:0xC0,RP:0xF0,RM:0xF8,RPE:0xE8,RPO:0xE0};
  if(rm2[m]!==undefined){b.push(rm2[m]);return b;}

  errs.push('Line '+ln+': cannot encode: '+m);
  return b;
}

function assemble(code){
  var errs=[];var syms={};
  var lines=code.split(/\r?\n/);
  var parsed=lines.map(function(l){return parseLine(l);});
  var addr=0,outB=[],li=[];

  // Pass 1
  for(var i=0;i<parsed.length;i++){
    var p=parsed[i];
    var m=p.mnemonic.toUpperCase();
    var op=p.operand;
    var pts=op.split(',').map(function(x){return x.trim();});
    if(p.label)syms[p.label]=addr;
    if(m===''||m==';'){li.push({addr:addr,bytes:[],raw:p.raw});continue;}
    // Handle 'label EQU value' syntax (no colon)
    if(m!=='EQU'&&m!=='ORG'&&m!=='DB'&&m!=='DW'&&m!=='END'){
      var _eup=op.toUpperCase().split(/[ \t]+/);
      if(_eup[0]==='EQU'&&_eup.length>1){
        var _eqv=toNum(_eup.slice(1).join(' '),syms,1,i+1,errs);
        syms[m]=_eqv!==null?_eqv:0;
        li.push({addr:addr,bytes:[],raw:p.raw});continue;
      }
    }
    if(m==='ORG'){var ov=toNum(op,syms,1,i+1,errs);addr=ov!==null?ov:0;li.push({addr:addr,bytes:[],raw:p.raw});continue;}
    if(m==='DB'){
      var cnt=0;
      for(var d=0;d<pts.length;d++){
        var pp=pts[d].trim();
        if(pp.startsWith('"')&&pp.endsWith('"'))cnt+=pp.length-2;else cnt+=1;
      }
      addr+=cnt;li.push({addr:addr,bytes:[],raw:p.raw});continue;
    }
    if(m==='DW'){addr+=pts.length*2;li.push({addr:addr,bytes:[],raw:p.raw});continue;}
    if(m==='EQU'){if(p.label){var ev=toNum(op,syms,1,i+1,errs);syms[p.label]=ev!==null?ev:0;}li.push({addr:addr,bytes:[],raw:p.raw});continue;}
    if(m==='END'){li.push({addr:addr,bytes:[],raw:p.raw});break;}
    var nb=sizeOf(m,pts,syms,i+1,errs);
    addr+=nb;
    li.push({addr:addr,bytes:[],raw:p.raw});
  }

  // Pass 2
  addr=0;outB=[];li=[];
  for(var i2=0;i2<parsed.length;i2++){
    var p2=parsed[i2];
    var m2=p2.mnemonic.toUpperCase();
    var op2=p2.operand;
    var pts2=op2.split(',').map(function(x){return x.trim();});
    if(m2===''||m2==';'){li.push({addr:addr,bytes:[],raw:p2.raw});continue;}
    // Handle 'label EQU value' syntax (no colon)
    if(m2!=='EQU'&&m2!=='ORG'&&m2!=='DB'&&m2!=='DW'&&m2!=='END'){
      var _eup2=op2.toUpperCase().split(/[ \t]+/);
      if(_eup2[0]==='EQU'&&_eup2.length>1){
        li.push({addr:addr,bytes:[],raw:p2.raw});continue;
      }
    }
    if(m2==='ORG'){var nv=toNum(op2,syms,2,i2+1,errs);addr=nv!==null?nv:0;li.push({addr:addr,bytes:[],raw:p2.raw});continue;}
    if(m2==='DB'){
      var dbb=[];
      for(var db=0;db<pts2.length;db++){
        var dp=pts2[db].trim();
        if(dp.startsWith('"')&&dp.endsWith('"')&&dp.length>=2){
          var st=dp.substring(1,dp.length-1);
          for(var si=0;si<st.length;si++)dbb.push(st.charCodeAt(si)&0xFF);
        }else{
          var dv=toNum(dp,syms,2,i2+1,errs);
          dbb.push(dv!==null?(dv&0xFF):0);
        }
      }
      outB.push.apply(outB,dbb);addr+=dbb.length;
      li.push({addr:addr,bytes:dbb,raw:p2.raw});continue;
    }
    if(m2==='DW'){
      var dwb=[];
      for(var dw=0;dw<pts2.length;dw++){
        var dvw=toNum(pts2[dw],syms,2,i2+1,errs);
        var vl=dvw!==null?dvw:0;
        dwb.push(vl&0xFF);dwb.push((vl>>8)&0xFF);
      }
      outB.push.apply(outB,dwb);addr+=dwb.length;
      li.push({addr:addr,bytes:dwb,raw:p2.raw});continue;
    }
    if(m2==='EQU'||m2==='END'){li.push({addr:addr,bytes:[],raw:p2.raw});if(m2==='END')break;continue;}
    var ib=encode(m2,pts2,addr,syms,i2+1,errs);
    outB.push.apply(outB,ib);addr+=ib.length;
    li.push({addr:addr,bytes:ib,raw:p2.raw});
  }

  var hx=[];
  for(var h=0;h<outB.length;h++){
    var hb=outB[h].toString(16).toUpperCase();
    if(hb.length<2)hb='0'+hb;hx.push(hb);
  }
  var hex=hx.join(' ');

  var bn=[];
  for(var bb=0;bb<outB.length;bb++){
    var bs=outB[bb].toString(2);
    while(bs.length<8)bs='0'+bs;bn.push(bs);
  }
  var binary=bn.join(' ');

  return{hex:hex,binary:binary,errors:errs,symbols:syms,lines:li};
}

window.Intel8085Assembler={assemble:assemble};
})();
