(function(){
"use strict";
window.Intel8051Assembler=function(){};
var P=window.Intel8051Assembler.prototype;
var SF={ACC:0xE0,B:0xF0,PSW:0xD0,SP:0x81,DPL:0x82,DPH:0x83,P0:0x80,P1:0x90,P2:0xA0,P3:0xB0,IE:0xA8,IP:0xB8,TCON:0x88,TMOD:0x89,TH0:0x8C,TL0:0x8A,TH1:0x8D,TL1:0x8B,SCON:0x98,SBUF:0x99,PCON:0x87};
function iR(s){return/^R([0-7])$/i.test(s)}function rN(s){return parseInt(s[1])}
function iI(s){return/^@R([01])$/i.test(s)}function iN(s){return parseInt(s[2])}
function pN(s){if(!s)return NaN;s=s.trim();if(/^0x/i.test(s))return parseInt(s,16);if(/^0b/i.test(s))return parseInt(s.slice(2),2);if(/H$/i.test(s))return parseInt(s.slice(0,-1),16);return parseInt(s,10)}
function p8(s){s=s.trim();if(s[0]==="#")s=s.slice(1);var n=pN(s);return isNaN(n)?null:n&0xFF}
function p16(s){s=s.trim();if(s[0]==="#")s=s.slice(1);var n=pN(s);return isNaN(n)?null:n&0xFFFF}
function pD(s,L,pc){s=s.trim();if(s==="$")return{t:"D",v:pc&0xFF};if(iR(s))return{t:"R",v:rN(s)};if(iI(s))return{t:"I",v:iN(s)};var u=s.toUpperCase();if(L&&L[u]!=null)return{t:"D",v:L[u]};if(SF[u]!=null)return{t:"D",v:SF[u]};var n=pN(s);return isNaN(n)?{t:"X",v:0}:{t:"D",v:n&0xFF}}
function pB(s,L){s=s.trim();var c=false;if(s[0]==="/"){c=true;s=s.slice(1)}var u=s.toUpperCase();if(u==="C")return{a:0xD2,c:c};if(SF[u])return{a:SF[u],c:c};var d=s.indexOf(".");if(d>=0){var ba=s.slice(0,d).toUpperCase(),bp=parseInt(s.slice(d+1));if(SF[ba])return{a:SF[ba],bit:bp,c:c}}var n=pN(s);return isNaN(n)?null:{a:n>>3,bit:n&7,c:c}}
function pR(pc,t,L,nx){var v,nx2=nx||2;if(t==="$")v=pc-(pc+nx2);else if(L&&L[t.toUpperCase()]!=null)v=L[t.toUpperCase()]-(pc+nx2);else v=pN(t);if(isNaN(v))return null;v&=0xFFFF;if(v>32767)v-=65536;return v&0xFF}
function pA1(pc,s,L){if(s==="$")return pc;var a=L&&L[s.toUpperCase()]!=null?L[s.toUpperCase()]:pN(s);return isNaN(a)?null:a&0x7FF}
function pA2(s,L){var a=L&&L[s.toUpperCase()]!=null?L[s.toUpperCase()]:pN(s);return isNaN(a)?null:a&0xFFFF}
function cS(s){var p=[],d=0,c="";for(var i=0;i<s.length;i++){var ch=s[i];if(ch==="(")d++;else if(ch===")")d--;else if(ch===","&&d===0){p.push(c);c="";continue}c+=ch}if(c)p.push(c);return p}
function enc(I,O,pc,L){var a=O?cS(O.trim()):[],n=a.length;
if(I==="NOP"&&!n)return[0];if(I==="RET"&&!n)return[0x22];if(I==="RETI"&&!n)return[0x32];
if(I==="MUL"&&n===1&&a[0].trim().toUpperCase()==="AB")return[164];
if(I==="DIV"&&n===1&&a[0].trim().toUpperCase()==="AB")return[132];
if(n===1&&a[0].trim().toUpperCase()==="A"){var m={CLR:228,CPL:244,RL:35,RLC:51,RR:3,RRC:19,SWAP:196,DA:212};if(m[I])return[m[I]]}
if(n===1&&a[0].trim().toUpperCase()==="C"){var m2={CLR:195,CPL:179,SETB:211};if(m2[I])return[m2[I]]}
if((I==="CLR"||I==="CPL"||I==="SETB")&&n===1){var b=pB(a[0],L);if(b)return[I==="CLR"?194:I==="CPL"?178:210,b.a&255]}
if(I==="MOV"&&n===2){var la=a[0].trim().toUpperCase(),ra=a[1].trim().toUpperCase();
if(la==="C"&&ra!=="C"){var b0=pB(a[1],L);if(b0)return[162,b0.a&0xFF]}
if(ra==="C"&&la!=="C"){var b1=pB(a[0],L);if(b1)return[146,b1.a&0xFF]}}
if((I==="ANL"||I==="ORL")&&n===2&&a[0].trim().toUpperCase()==="C"){var b2=pB(a[1],L);if(b2)return[I==="ANL"?(b2.c?176:130):(b2.c?160:114),b2.a&255]}
if((I==="JB"||I==="JNB"||I==="JBC")&&n===2){var b3=pB(a[0],L);var r4=pR(pc,a[1],L,3);if(b3&&r4!=null){var jbo=I==="JB"?0x20:I==="JNB"?0x30:0x10;return[jbo,b3.a&0xFF,r4&0xFF]}}
if((I==="JZ"||I==="JNZ")&&n===1){var r=pR(pc,a[0],L,2);if(r!=null)return[I==="JZ"?96:112,r]}
if((I==="JC"||I==="JNC")&&n===1){var r2=pR(pc,a[0],L,2);if(r2!=null)return[I==="JC"?64:80,r2]}
if(I==="SJMP"&&n===1){var r3=pR(pc,a[0],L,2);if(r3!=null)return[128,r3]}
if(I==="JMP"&&n===1&&a[0].trim().toUpperCase()==="@A+DPTR")return[115];
if(I==="LJMP"&&n===1){var v1=pA2(a[0],L);if(v1!=null)return[2,(v1>>8)&255,v1&255]}
if(I==="AJMP"&&n===1){var v2=pA1(pc,a[0],L);if(v2!=null)return[1|((v2>>8)&7)<<5,v2&255]}
if(I==="ACALL"&&n===1){var v3=pA1(pc,a[0],L);if(v3!=null)return[17|((v3>>8)&7)<<5,v3&255]}
if(I==="LCALL"&&n===1){var v4=pA2(a[0],L);if(v4!=null)return[18,(v4>>8)&255,v4&255]}
if(I==="CJNE"&&n===3){var cA=a[0].trim().toUpperCase(),cB=a[1].trim(),cr=pR(pc,a[2],L,3);if(cr==null)return null;
if(cA==="A"){if(cB[0]==="#"){var im=p8(cB);if(im!=null)return[180,im,cr]}var d=pD(cB,L,pc);if(d.t==="D")return[181,d.v,cr]}
if(iR(cA))return[184+rN(cA),p8(cB)&255,cr];if(iI(cA))return[182+iN(cA),p8(cB)&255,cr]}
if(I==="DJNZ"&&n===2){if(iR(a[0])){var r5=pR(pc,a[1],L,2);if(r5!=null)return[216+rN(a[0]),r5]}var d2=pD(a[0],L,pc);var r6=pR(pc,a[1],L,3);if(d2.t!=="X"&&r6!=null)return[213,d2.v,r6]}
if(I==="MOVX"&&n===2){var x1=a[0].trim().toUpperCase(),x2=a[1].trim().toUpperCase();
if(x1==="A"){if(x2==="@DPTR")return[224];if(iI(a[1].trim()))return[226+iN(a[1].trim())]}
if(x2==="A"){if(x1==="@DPTR")return[240];if(iI(a[0].trim()))return[242+iN(a[0].trim())]}}
if(I==="MOVC"){var mc=n===2?a[1].trim().toUpperCase():a[0].trim().toUpperCase();if(mc==="@A+DPTR")return[0x93];if(mc==="@A+PC")return[0x83]}
if(I==="XCH"&&n===2&&a[0].trim().toUpperCase()==="A"){if(iR(a[1]))return[200+rN(a[1])];if(iI(a[1]))return[198+iN(a[1])];var xd=pD(a[1],L,pc);if(xd.t!=="X")return[197,xd.v]}
if(I==="XCHD"&&n===2&&a[0].trim().toUpperCase()==="A"&&iI(a[1]))return[214+iN(a[1])];
if((I==="PUSH"||I==="POP")&&n===1){var pp=pD(a[0],L,pc);if(pp.t!=="X")return[I==="PUSH"?192:208,pp.v]}
if((I==="INC"||I==="DEC")&&n===1){var bi=I==="INC"?4:20,o1=a[0].trim().toUpperCase();
if(o1==="A")return[bi];if(iR(a[0].trim()))return[bi+4+rN(a[0].trim())];
if(iI(a[0].trim()))return[bi+2+iN(a[0].trim())];if(I==="INC"&&o1==="DPTR")return[163];
var id=pD(a[0],L,pc);if(id.t!=="X")return[bi+1,id.v]}
if(I==="MOV"&&n===2&&a[0].trim().toUpperCase()==="DPTR"){var h16=p16(a[1]);if(h16!=null)return[144,(h16>>8)&255,h16&255]}
if(I==="MOV"&&n===2){var lh=a[0].trim().toUpperCase(),rh=a[1].trim();
if(lh==="A"){if(iR(rh))return[232+rN(rh)];if(iI(rh))return[230+iN(rh)];if(rh[0]==="#"){var iA=p8(rh);if(iA!=null)return[116,iA]}var mA2=pD(rh,L,pc);if(mA2.t!=="X")return[229,mA2.v]}
if(iR(lh)){var rn=rN(lh);if(rh.toUpperCase()==="A")return[248+rn];if(rh[0]==="#"){var iR2=p8(rh);if(iR2!=null)return[120+rn,iR2]}var mR=pD(rh,L,pc);if(mR.t!=="X")return[168+rn,mR.v]}
if(iI(lh)){var ri=iN(lh);if(rh.toUpperCase()==="A")return[246+ri];if(rh[0]==="#"){var iI2=p8(rh);if(iI2!=null)return[118+ri,iI2]}var mI=pD(rh,L,pc);if(mI.t!=="X")return[166+ri,mI.v]}
var mD=pD(lh,L,pc);if(mD.t!=="X"){if(rh.toUpperCase()==="A")return[245,mD.v];
if(iR(rh))return[136+rN(rh),mD.v];if(iI(rh))return[134+iN(rh),mD.v];
if(rh[0]==="#"){var iD=p8(rh);if(iD!=null)return[117,mD.v,iD]}var mS=pD(rh,L,pc);if(mS.t!=="X")return[133,mS.v,mD.v]}}
if((I==="ANL"||I==="ORL"||I==="XRL"||I==="ADD"||I==="ADDC"||I==="SUBB")&&n===2){
var mb={ANL:88,ORL:72,XRL:104,ADD:40,ADDC:56,SUBB:152};
var mbi={ANL:86,ORL:70,XRL:102,ADD:38,ADDC:54,SUBB:150};
var mbh={ANL:84,ORL:68,XRL:100,ADD:36,ADDC:52,SUBB:148};
var mbd={ANL:85,ORL:69,XRL:101,ADD:37,ADDC:53,SUBB:149};
var mdda={ANL:82,ORL:66,XRL:98};
var mddh={ANL:83,ORL:67,XRL:99};
var la2=a[0].trim().toUpperCase(),ra2=a[1].trim();
if(la2==="A"){if(iR(ra2))return[mb[I]+rN(ra2)];if(iI(ra2))return[mbi[I]+iN(ra2)];if(ra2[0]==="#"){var im6=p8(ra2);if(im6!=null)return[mbh[I],im6]}var od=pD(ra2,L,pc);if(od.t!=="X")return[mbd[I],od.v]}
var od2=pD(la2,L,pc);if(od2.t!=="X"){if(ra2.toUpperCase()==="A")return[mdda[I],od2.v];
if(ra2[0]==="#"){var im7=p8(ra2);if(im7!=null)return[mddh[I],od2.v,im7]}}}
return null}
function estB(I,O){var a=O?cS(O.trim()):[],n=a.length;
if(I==="NOP"||I==="RET"||I==="RETI"||I==="MUL"||I==="DIV"||I==="INC"&&n===1&&a[0].trim().toUpperCase()==="DPTR")return 1;
if(I==="CLR"||I==="CPL"||I==="SETB"||I==="RL"||I==="RLC"||I==="RR"||I==="RRC"||I==="SWAP"||I==="DA")return 1;
if(I==="MOVX"||I==="MOVC"||I==="JMP"||I==="XCHD")return 1;
if(I==="MOV"&&n===2){var l=a[0].trim().toUpperCase();if(l==="DPTR")return 3}
if((I==="JZ"||I==="JNZ"||I==="JC"||I==="JNC"||I==="SJMP"||I==="AJMP"||I==="ACALL")&&n===1)return 2;
if((I==="JB"||I==="JNB"||I==="JBC")&&n===2)return 3;
if(I==="LJMP"||I==="LCALL")return 3;
if(I==="CJNE"&&n===3)return 3;
if(I==="DJNZ"){if(iR(a[0]))return 2;return 3}
if(I==="INC"||I==="DEC")return n===1?(iR(a[0])||iI(a[0]))?1:2:2;
if(I==="PUSH"||I==="POP")return 2;
if(I==="MOV"&&n===2){var la=a[0].trim().toUpperCase(),ra=a[1].trim();
if(la==="A"){if(ra[0]==="#")return 2;return 2}if(iR(la))return ra[0]==="#"?2:2;if(iI(la))return ra[0]==="#"?2:2;return 3}
if((I==="ANL"||I==="ORL"||I==="XRL"||I==="ADD"||I==="ADDC"||I==="SUBB")&&n===2)return 2;
if(I==="XCH")return 2;
return 2}
function assemble(code){var LF=String.fromCharCode(10),CR=String.fromCharCode(13);
var lines=code.split(CR+LF);if(lines.length===1)lines=code.split(LF);
var labels={},errors=[],pc=0,rawLines=[];
for(var i=0;i<lines.length;i++){var raw=lines[i].replace(/;.*$/,"").trim();if(!raw)continue;
var lm=raw.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)/);var rest=raw;
if(lm){var lb=lm[1].toUpperCase();rest=lm[2].trim();if(labels[lb]!=null)errors.push("Line "+(i+1)+": Duplicate label "+lb);labels[lb]=pc}
if(!rest)continue;var pm=rest.match(/^([A-Za-z]+)\s*(.*)?$/);
if(!pm){errors.push("Line "+(i+1)+": Invalid instruction");pc++;continue}
var inst=pm[1].toUpperCase(),ops=pm[2]||"";
if(inst==="ORG"){var ov=pN(ops);if(!isNaN(ov))pc=ov&0xFFFF;else errors.push("Line "+(i+1)+": Invalid ORG");rawLines.push({l:i+1,a:pc,i:inst,o:ops});continue}
if(inst==="END"){rawLines.push({l:i+1,a:pc,i:inst,o:ops});break}
if(inst==="DB"){var items=cS(ops),cnt=0;for(var j=0;j<items.length;j++){var it=items[j].trim();if(it[0]==="\""||it[0]==="'")cnt+=it.length-2;else cnt++}rawLines.push({l:i+1,a:pc,i:inst,o:ops,b:cnt});pc+=cnt;continue}
if(inst==="DW"){var items2=cS(ops);rawLines.push({l:i+1,a:pc,i:inst,o:ops,b:items2.length*2});pc+=items2.length*2;continue}
var bLen=estB(inst,ops);
rawLines.push({l:i+1,a:pc,i:inst,o:ops,b:bLen});pc+=bLen}
var hx=[],ch=[],chA=0,chS=false,addr=0;
function flush(){if(!ch.length)return;var s=":"+("0"+ch.length.toString(16)).slice(-2).toUpperCase();
var ah=(chA>>8)&255,al=chA&255;
s+=("0"+ah.toString(16)).slice(-2).toUpperCase();s+=("0"+al.toString(16)).slice(-2).toUpperCase();s+="00";
var sm=ch.length+ah+al;for(var ci=0;ci<ch.length;ci++){s+=("0"+ch[ci].toString(16)).slice(-2).toUpperCase();sm+=ch[ci]}
s+=("0"+(((~sm)+1)&255).toString(16)).slice(-2).toUpperCase();hx.push(s);ch=[]}
var info=[];
for(var k=0;k<rawLines.length;k++){var ln=rawLines[k];
if(ln.i==="ORG"){flush();addr=ln.a;chA=addr;chS=false;continue}
if(ln.i==="END"){flush();continue}
if(ln.i==="DB"){var it3=cS(ln.o);for(var j2=0;j2<it3.length;j2++){var it4=it3[j2].trim();if(!chS){chA=addr;chS=true}
if(it4[0]==="\""||it4[0]==="'"){var st=it4.slice(1,-1);for(var ci2=0;ci2<st.length;ci2++){ch.push(st.charCodeAt(ci2)&255);addr++}}
else{var v=pN(it4);ch.push(isNaN(v)?0:v&255);addr++}}info.push(ln);continue}
if(ln.i==="DW"){var it5=cS(ln.o);for(var j3=0;j3<it5.length;j3++){var vw=pN(it5[j3].trim());if(!chS){chA=addr;chS=true}
if(!isNaN(vw)){ch.push((vw>>8)&255);ch.push(vw&255)}else{ch.push(0);ch.push(0)}addr+=2}info.push(ln);continue}
var enc3=enc(ln.i,ln.o,addr,labels);
if(enc3){if(!chS){chA=addr;chS=true}for(var b2=0;b2<enc3.length;b2++){ch.push(enc3[b2]&255);addr++}info.push({l:ln.l,a:ln.a,i:ln.i,o:ln.o,b:enc3.length})}else{errors.push("Line "+ln.l+": Unknown instruction: "+ln.i+" "+ln.o);info.push({l:ln.l,a:ln.a,i:ln.i,o:ln.o,b:0,e:true});addr++}}
flush()
var hexStr=hx.join(LF);var binArr=[];
for(var p=0;p<hx.length;p++){var h=hx[p];for(var q=9;q<h.length-2;q+=2)binArr.push(parseInt(h.substr(q,2),16))}
var binStr="";for(var r=0;r<binArr.length;r++)binStr+=("00000000"+binArr[r].toString(2)).slice(-8)+" ";
var sym={};for(var sl in labels)sym[sl]=labels[sl];var lineInfo=[];
for(var li=0;li<info.length;li++){var ln2=info[li];
lineInfo.push({line:ln2.l,addr:ln2.a,inst:ln2.i,ops:ln2.o,bytes:ln2.b||0,error:ln2.e||false})}
return{hex:hexStr.trim(),binary:binStr.trim(),errors:errors,symbols:sym,lines:lineInfo}}
P.assemble=assemble;
})();

