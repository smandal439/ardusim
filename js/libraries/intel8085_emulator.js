(function(){
'use strict';
function Intel8085Emulator(){
this.a=0;this.b=0;this.c=0;this.d=0;this.e=0;this.h=0;this.l=0;
this.sp=0;this.pc=0;this.flags=0x02;
this.mem=new Uint8Array(65536);this.ports=new Uint8Array(256);
this._portWriteCb=null;this._portReadCb=null;this._serialLogCb=null;
this.halted=false;this.ie=false;this.intPending=false;this.intVect=0;
}
var F={S:0x80,Z:0x40,AC:0x10,P:0x04,CY:0x01};
var pT=new Uint8Array(256);
(function(){for(var i=0;i<256;i++){var c=0,x=i;while(x){c+=x&1;x>>=1;}pT[i]=c&1?0:4;}})();
Intel8085Emulator.prototype.reset=function(){
this.a=0;this.b=0;this.c=0;this.d=0;this.e=0;this.h=0;this.l=0;
this.sp=0;this.pc=0;this.flags=0x02;this.halted=false;this.ie=false;this.intPending=false;};
Intel8085Emulator.prototype.load=function(arr,addr){
addr=addr||0;for(var i=0;i<arr.length;i++)this.mem[(addr+i)&0xFFFF]=arr[i];};
function uSZP(f,v){v&=0xFF;f&=~(F.S|F.Z|F.P);if(v&0x80)f|=F.S;if(!v)f|=F.Z;f|=pT[v];return f;}
function wM(s,a,v){s.mem[a&0xFFFF]=v&0xFF;}
function rM(s,a){return s.mem[a&0xFFFF];}
function fk(s){return rM(s,s.pc++);}
function fk2(s){var l=fk(s);return l|(fk(s)<<8);}
var RN=["b","c","d","e","h","l","_m","a"];
function gR(s,r){return r===6?rM(s,(s.h<<8)|s.l):s[RN[r]];}
function sR(s,r,v){if(r===6)wM(s,(s.h<<8)|s.l,v);else s[RN[r]]=v&0xFF;}
function rpG(s,r){
switch(r){case 0:return(s.b<<8)|s.c;case 1:return(s.d<<8)|s.e;
case 2:return(s.h<<8)|s.l;case 3:return s.sp;case 4:return(s.a<<8)|s.flags;}}
function rpS(s,r,v){v&=0xFFFF;
switch(r){case 0:s.b=(v>>8)&0xFF;s.c=v&0xFF;break;case 1:s.d=(v>>8)&0xFF;s.e=v&0xFF;break;
case 2:s.h=(v>>8)&0xFF;s.l=v&0xFF;break;case 3:s.sp=v;break;
case 4:s.a=(v>>8)&0xFF;s.flags=(v&0xFF)|0x02;break;}}
function cC(f,cc){
switch(cc){case 0:return!(f&F.Z);case 1:return!!(f&F.Z);case 2:return!(f&F.CY);
case 3:return!!(f&F.CY);case 4:return!(f&F.P);case 5:return!!(f&F.P);
case 6:return!(f&F.S);case 7:return!!(f&F.S);}}
function psh(s,v){wM(s,--s.sp,(v>>8)&0xFF);wM(s,--s.sp,v&0xFF);}
function pop(s){var l=rM(s,s.sp++);var h=rM(s,s.sp++);return(l|(h<<8))&0xFFFF;}
function doAdd(s,v){var cy=(s.flags&F.CY)?1:0;
var ac=((s.a&0xF)+(v&0xF))>0xF?1:0;var r=(s.a+v+cy)&0xFF;
s.flags=uSZP(s.flags,r);s.flags=ac?s.flags|F.AC:s.flags&~F.AC;
s.flags=(s.a+v+cy>0xFF)?s.flags|F.CY:s.flags&~F.CY;s.a=r;}
function doAdc(s,v){var cy=(s.flags&F.CY)?1:0;
var ac=((s.a&0xF)+(v&0xF)+cy)>0xF?1:0;var r=(s.a+v+cy)&0xFF;
s.flags=uSZP(s.flags,r);s.flags=ac?s.flags|F.AC:s.flags&~F.AC;
s.flags=(s.a+v+cy>0xFF)?s.flags|F.CY:s.flags&~F.CY;s.a=r;}
function doSub(s,v){var cy=(s.flags&F.CY)?1:0;var r=(s.a-v-cy)&0xFF;
s.flags=uSZP(s.flags,r);s.flags=(s.a<(v+cy))?s.flags|F.CY:s.flags&~F.CY;
s.flags=((s.a&0xF)<((v&0xF)+cy))?s.flags|F.AC:s.flags&~F.AC;s.a=r;}
function doSbb(s,v){var cy=(s.flags&F.CY)?1:0;var r=(s.a-v-cy)&0xFF;
s.flags=uSZP(s.flags,r);s.flags=(s.a<(v+cy))?s.flags|F.CY:s.flags&~F.CY;
s.flags=((s.a&0xF)<((v&0xF)+cy))?s.flags|F.AC:s.flags&~F.AC;s.a=r;}
function doAnd(s,v){var r=s.a&v;s.flags=uSZP(s.flags,r);s.flags|=F.AC;s.a=r;}
function doXor(s,v){var r=s.a^v;s.flags=uSZP(s.flags,r);s.flags&=~(F.AC|F.CY);s.a=r;}
function doOr(s,v){var r=s.a|v;s.flags=uSZP(s.flags,r);s.flags&=~(F.AC|F.CY);s.a=r;}
function doCmp(s,v){var cy=(s.flags&F.CY)?1:0;var r=(s.a-v)&0xFF;
s.flags=uSZP(s.flags,r);s.flags=(s.a<v)?s.flags|F.CY:s.flags&~F.CY;
s.flags=((s.a&0xF)<(v&0xF))?s.flags|F.AC:s.flags&~F.AC;}
function doDAA(s){var a=s.a;if((a&0xF)>9||s.flags&F.AC){a+=6;}
if((a&0xF0)>0x90||s.flags&F.CY){a+=0x60;s.flags|=F.CY;}else{s.flags&=~F.CY;}
s.flags=uSZP(s.flags,a);s.a=a&0xFF;}
Intel8085Emulator.prototype.step=function(){
if(this.halted)return{cycles:7,ir:0x76};
var op=fk(this);var cy=4;
if(op>=0x40&&op<=0x7F){
if(op===0x76){this.halted=true;return{cycles:7,ir:op};}
sR(this,(op>>3)&7,gR(this,op&7));
cy=(op&7===6||(op>>3&7)===6)?7:4;
}else if(op>=0x80&&op<=0x87){doAdd(this,gR(this,op&7));cy=(op&7===6)?7:4;
}else if(op>=0x88&&op<=0x8F){doAdc(this,gR(this,op&7));cy=(op&7===6)?7:4;
}else if(op>=0x90&&op<=0x97){doSub(this,gR(this,op&7));cy=(op&7===6)?7:4;
}else if(op>=0x98&&op<=0x9F){doSbb(this,gR(this,op&7));cy=(op&7===6)?7:4;
}else if(op>=0xA0&&op<=0xA7){doAnd(this,gR(this,op&7));cy=(op&7===6)?7:4;
}else if(op>=0xA8&&op<=0xAF){doXor(this,gR(this,op&7));cy=(op&7===6)?7:4;
}else if(op>=0xB0&&op<=0xB7){doOr(this,gR(this,op&7));cy=(op&7===6)?7:4;
}else if(op>=0xB8&&op<=0xBF){doCmp(this,gR(this,op&7));cy=(op&7===6)?7:4;
}else{switch(op){
case 0x00:break;
case 0x01:this.c=fk(this);this.b=fk(this);cy=10;break;
case 0x02:wM(this,(this.b<<8)|this.c,this.a);cy=7;break;
case 0x03:rpS(this,0,rpG(this,0)+1);cy=6;break;
case 0x04:this.b++;this.flags=uSZP(this.flags,this.b);cy=4;break;
case 0x05:this.b--;this.flags=uSZP(this.flags,this.b);cy=4;break;
case 0x06:this.b=fk(this);cy=7;break;
case 0x07:{var b7=(this.a&0x80)?1:0;this.a=((this.a<<1)|b7)&0xFF;
if(b7)this.flags|=F.CY;else this.flags&=~F.CY;cy=4;break;}
case 0x08:break;
case 0x09:{var h2=(this.h<<8)|this.l;var s2=h2+((this.b<<8)|this.c);
if(s2>0xFFFF)this.flags|=F.CY;else this.flags&=~F.CY;
this.h=(s2>>8)&0xFF;this.l=s2&0xFF;cy=10;break;}
case 0x0A:this.a=rM(this,(this.b<<8)|this.c);cy=7;break;
case 0x0B:rpS(this,0,rpG(this,0)-1);cy=6;break;
case 0x0C:this.c++;this.flags=uSZP(this.flags,this.c);cy=4;break;
case 0x0D:this.c--;this.flags=uSZP(this.flags,this.c);cy=4;break;
case 0x0E:this.c=fk(this);cy=7;break;
case 0x0F:{var a0=this.a&1;this.a=(this.a>>1)|(a0?0x80:0);
if(a0)this.flags|=F.CY;else this.flags&=~F.CY;cy=4;break;}
case 0x10:break;
case 0x11:this.e=fk(this);this.d=fk(this);cy=10;break;
case 0x12:wM(this,(this.d<<8)|this.e,this.a);cy=7;break;
case 0x13:rpS(this,1,rpG(this,1)+1);cy=6;break;
case 0x14:this.d++;this.flags=uSZP(this.flags,this.d);cy=4;break;
case 0x15:this.d--;this.flags=uSZP(this.flags,this.d);cy=4;break;
case 0x16:this.d=fk(this);cy=7;break;
case 0x17:{var c1=(this.flags&F.CY)?1:0;var b1=(this.a&0x80)?1:0;
this.a=((this.a<<1)|c1)&0xFF;if(b1)this.flags|=F.CY;else this.flags&=~F.CY;cy=4;break;}
case 0x18:break;
case 0x19:{var h2=(this.h<<8)|this.l;var s2=h2+((this.d<<8)|this.e);
if(s2>0xFFFF)this.flags|=F.CY;else this.flags&=~F.CY;
this.h=(s2>>8)&0xFF;this.l=s2&0xFF;cy=10;break;}
case 0x1A:this.a=rM(this,(this.d<<8)|this.e);cy=7;break;
case 0x1B:rpS(this,1,rpG(this,1)-1);cy=6;break;
case 0x1C:this.e++;this.flags=uSZP(this.flags,this.e);cy=4;break;
case 0x1D:this.e--;this.flags=uSZP(this.flags,this.e);cy=4;break;
case 0x1E:this.e=fk(this);cy=7;break;
case 0x1F:{var c1=(this.flags&F.CY)?1:0;var a0=this.a&1;
this.a=(this.a>>1)|(c1?0x80:0);if(a0)this.flags|=F.CY;else this.flags&=~F.CY;cy=4;break;}
case 0x20:break;
case 0x21:this.l=fk(this);this.h=fk(this);cy=10;break;
case 0x22:{var ad=fk2(this);wM(this,ad,this.l);wM(this,ad+1,this.h);cy=16;break;}
case 0x23:rpS(this,2,rpG(this,2)+1);cy=6;break;
case 0x24:this.h++;this.flags=uSZP(this.flags,this.h);cy=4;break;
case 0x25:this.h--;this.flags=uSZP(this.flags,this.h);cy=4;break;
case 0x26:this.h=fk(this);cy=7;break;
case 0x27:doDAA(this);cy=4;break;
case 0x28:break;
case 0x29:{var h2=(this.h<<8)|this.l;var s2=h2+h2;
if(s2>0xFFFF)this.flags|=F.CY;else this.flags&=~F.CY;
this.h=(s2>>8)&0xFF;this.l=s2&0xFF;cy=10;break;}
case 0x2A:{var ad=fk2(this);this.l=rM(this,ad);this.h=rM(this,ad+1);cy=16;break;}
case 0x2B:rpS(this,2,rpG(this,2)-1);cy=6;break;
case 0x2C:this.l++;this.flags=uSZP(this.flags,this.l);cy=4;break;
case 0x2D:this.l--;this.flags=uSZP(this.flags,this.l);cy=4;break;
case 0x2E:this.l=fk(this);cy=7;break;
case 0x2F:this.a=(~this.a)&0xFF;cy=4;break;
case 0x30:break;
case 0x31:this.sp=fk2(this);cy=10;break;
case 0x32:{var ad=fk2(this);wM(this,ad,this.a);cy=13;break;}
case 0x33:this.sp=(this.sp+1)&0xFFFF;cy=6;break;
case 0x34:{var ad=(this.h<<8)|this.l;var v=rM(this,ad)+1;wM(this,ad,v&0xFF);
this.flags=uSZP(this.flags,v);cy=10;break;}
case 0x35:{var ad=(this.h<<8)|this.l;var v=rM(this,ad)-1;wM(this,ad,v&0xFF);
this.flags=uSZP(this.flags,v&0xFF);cy=10;break;}
case 0x36:{var ad=(this.h<<8)|this.l;wM(this,ad,fk(this));cy=10;break;}
case 0x37:this.flags|=F.CY;this.flags&=~F.AC;cy=4;break;
case 0x38:break;
case 0x39:{var h2=(this.h<<8)|this.l;var s2=h2+this.sp;
if(s2>0xFFFF)this.flags|=F.CY;else this.flags&=~F.CY;
this.h=(s2>>8)&0xFF;this.l=s2&0xFF;cy=10;break;}
case 0x3A:{var ad=fk2(this);this.a=rM(this,ad);cy=13;break;}
case 0x3B:this.sp=(this.sp-1)&0xFFFF;cy=6;break;
case 0x3C:this.a++;this.flags=uSZP(this.flags,this.a);cy=4;break;
case 0x3D:this.a--;this.flags=uSZP(this.flags,this.a);cy=4;break;
case 0x3E:this.a=fk(this);cy=7;break;
case 0x3F:this.flags^=F.CY;this.flags&=~F.AC;cy=4;break;
default:
var cc=(op>>3)&7;
if(op===0xC3){this.pc=fk2(this);cy=10;
}else if(op===0xC6){doAdd(this,fk(this));cy=7;
}else if(op===0xC9){this.pc=pop(this);cy=10;
}else if(op===0xCB){cy=4;
}else if(op===0xCD){var ad=fk2(this);psh(this,this.pc);this.pc=ad;cy=18;
}else if(op===0xCE){doAdc(this,fk(this));cy=7;
}else if(op===0xD3){var port=fk(this);if(this._portWriteCb)this._portWriteCb(port,this.a);this.ports[port]=this.a;cy=10;
}else if(op===0xD6){doSub(this,fk(this));cy=7;
}else if(op===0xDB){var port=fk(this);this.a=this._portReadCb?this._portReadCb(port):this.ports[port];cy=10;
}else if(op===0xDE){doSbb(this,fk(this));cy=7;
}else if(op===0xE3){var v1=rM(this,this.sp);var v2=rM(this,this.sp+1);
var v3=(this.h<<8)|this.l;wM(this,this.sp,v3&0xFF);wM(this,this.sp+1,(v3>>8)&0xFF);
this.l=v1;this.h=v2;cy=18;
}else if(op===0xE6){doAnd(this,fk(this));cy=7;
}else if(op===0xE9){this.pc=(this.h<<8)|this.l;cy=6;
}else if(op===0xEB){var t=this.h;this.h=this.d;this.d=t;t=this.l;this.l=this.e;this.e=t;cy=4;
}else if(op===0xEE){doXor(this,fk(this));cy=7;
}else if(op===0xF3){this.ie=false;cy=4;
}else if(op===0xF6){doOr(this,fk(this));cy=7;
}else if(op===0xF9){this.sp=(this.h<<8)|this.l;cy=6;
}else if(op===0xFB){this.ie=true;cy=4;
}else if(op===0xFE){doCmp(this,fk(this));cy=7;
}else if((op&0xC7)===0xC0){if(cC(this.flags,cc)){this.pc=pop(this);cy=12;}else{cy=6;}
}else if((op&0xC7)===0xC1){var v=pop(this);var rp=(op>>4)&3;
if(rp===0){this.c=v&0xFF;this.b=(v>>8)&0xFF;}
else if(rp===1){this.e=v&0xFF;this.d=(v>>8)&0xFF;}
else if(rp===2){this.l=v&0xFF;this.h=(v>>8)&0xFF;}
else{this.a=(v>>8)&0xFF;this.flags=(v&0xFF)|0x02;}cy=10;
}else if((op&0xC7)===0xC2){var ad=fk2(this);if(cC(this.flags,cc))this.pc=ad;cy=10;
}else if((op&0xC7)===0xC4){var ad=fk2(this);if(cC(this.flags,cc)){psh(this,this.pc);this.pc=ad;cy=18;}else{cy=12;}
}else if((op&0xC7)===0xC5){var rp=(op>>4)&3;
if(rp===0)psh(this,(this.b<<8)|this.c);
else if(rp===1)psh(this,(this.d<<8)|this.e);
else if(rp===2)psh(this,(this.h<<8)|this.l);
else psh(this,(this.a<<8)|(this.flags&0xF5)|0x02);cy=11;
}else if((op&0xC7)===0xC7){psh(this,this.pc);this.pc=((op>>3)&7)<<3;cy=11;
}else{cy=4;}
}}
return{cycles:cy,ir:op};};
Intel8085Emulator.prototype.getRegisters=function(){
return{a:this.a,b:this.b,c:this.c,d:this.d,e:this.e,h:this.h,l:this.l,
sp:this.sp,pc:this.pc,flags:this.flags,
s:!!(this.flags&F.S),z:!!(this.flags&F.Z),ac:!!(this.flags&F.AC),
p:!!(this.flags&F.P),cy:!!(this.flags&F.CY)};};
Intel8085Emulator.prototype.setRegister=function(name,val){
val&=0xFFFF;switch(name.toLowerCase()){
case"a":this.a=val&0xFF;break;case"b":this.b=val&0xFF;break;
case"c":this.c=val&0xFF;break;case"d":this.d=val&0xFF;break;
case"e":this.e=val&0xFF;break;case"h":this.h=val&0xFF;break;
case"l":this.l=val&0xFF;break;case"sp":this.sp=val;break;
case"pc":this.pc=val;break;case"flags":this.flags=val|0x02;break;}};
Intel8085Emulator.prototype.readMemory=function(addr){return this.mem[addr&0xFFFF];};
Intel8085Emulator.prototype.writeMemory=function(addr,val){this.mem[addr&0xFFFF]=val&0xFF;};
Intel8085Emulator.prototype.disassemble=function(addr,count){
var res=[];var sPC=this.pc;this.pc=addr&0xFFFF;
var rn=["B","C","D","E","H","L","M","A"];
var rp2=["BC","DE","HL","PSW"];var ccn=["NZ","Z","NC","C","PO","PE","P","M"];
for(var i=0;i<count;i++){var sp=this.pc;var o=fk(this);var inst="";
if(o>=0x40&&o<=0x7F){if(o===0x76)inst="HLT";else inst="MOV "+rn[(o>>3)&7]+","+rn[o&7];}
else if(o>=0x80&&o<=0xBF){var ops=["ADD","ADC","SUB","SBB","ANA","XRA","ORA","CMP"];
inst=ops[(o>>3)&7]+" "+rn[o&7];}
else{switch(o){
case 0x00:inst="NOP";break;case 0x01:inst="LXI B,d16";this.pc+=2;break;
case 0x02:inst="STAX B";break;case 0x03:inst="INX B";break;
case 0x04:inst="INR B";break;case 0x05:inst="DCR B";break;
case 0x06:inst="MVI B,d8";this.pc++;break;case 0x07:inst="RLC";break;
case 0x09:inst="DAD B";break;case 0x0A:inst="LDAX B";break;
case 0x0B:inst="DCX B";break;case 0x0C:inst="INR C";break;
case 0x0D:inst="DCR C";break;case 0x0E:inst="MVI C,d8";this.pc++;break;
case 0x0F:inst="RRC";break;
case 0x11:inst="LXI D,d16";this.pc+=2;break;case 0x12:inst="STAX D";break;
case 0x13:inst="INX D";break;case 0x14:inst="INR D";break;
case 0x15:inst="DCR D";break;case 0x16:inst="MVI D,d8";this.pc++;break;
case 0x17:inst="RAL";break;case 0x19:inst="DAD D";break;
case 0x1A:inst="LDAX D";break;case 0x1B:inst="DCX D";break;
case 0x1C:inst="INR E";break;case 0x1D:inst="DCR E";break;
case 0x1E:inst="MVI E,d8";this.pc++;break;case 0x1F:inst="RAR";break;
case 0x21:inst="LXI H,d16";this.pc+=2;break;case 0x22:inst="SHLD addr";this.pc+=2;break;
case 0x23:inst="INX H";break;case 0x24:inst="INR H";break;
case 0x25:inst="DCR H";break;case 0x26:inst="MVI H,d8";this.pc++;break;
case 0x27:inst="DAA";break;case 0x29:inst="DAD H";break;
case 0x2A:inst="LHLD addr";this.pc+=2;break;case 0x2B:inst="DCX H";break;
case 0x2C:inst="INR L";break;case 0x2D:inst="DCR L";break;
case 0x2E:inst="MVI L,d8";this.pc++;break;case 0x2F:inst="CMA";break;
case 0x31:inst="LXI SP,d16";this.pc+=2;break;case 0x32:inst="STA addr";this.pc+=2;break;
case 0x33:inst="INX SP";break;case 0x34:inst="INR M";break;
case 0x35:inst="DCR M";break;case 0x36:inst="MVI M,d8";this.pc++;break;
case 0x37:inst="STC";break;case 0x39:inst="DAD SP";break;
case 0x3A:inst="LDA addr";this.pc+=2;break;case 0x3B:inst="DCX SP";break;
case 0x3C:inst="INR A";break;case 0x3D:inst="DCR A";break;
case 0x3E:inst="MVI A,d8";this.pc++;break;case 0x3F:inst="CMC";break;
default:
if((o&0xC7)===0xC0)inst="R"+ccn[(o>>3)&7];
else if((o&0xC7)===0xC1)inst="POP "+rp2[(o>>4)&3];
else if((o&0xC7)===0xC2){inst="J"+ccn[(o>>3)&7]+" addr";this.pc+=2;}
else if(o===0xC3){inst="JMP addr";this.pc+=2;}
else if((o&0xC7)===0xC4){inst="C"+ccn[(o>>3)&7]+" addr";this.pc+=2;}
else if((o&0xC7)===0xC5)inst="PUSH "+rp2[(o>>4)&3];
else if(o===0xC6){inst="ADI d8";this.pc++;}
else if((o&0xC7)===0xC7)inst="RST "+((o>>3)&7);
else if(o===0xC9)inst="RET";
else if(o===0xCD){inst="CALL addr";this.pc+=2;}
else if(o===0xCE){inst="ACI d8";this.pc++;}
else if(o===0xD3){inst="OUT d8";this.pc++;}
else if(o===0xD6){inst="SUI d8";this.pc++;}
else if(o===0xDB){inst="IN d8";this.pc++;}
else if(o===0xDE){inst="SBI d8";this.pc++;}
else if(o===0xE3)inst="XTHL";
else if(o===0xE6){inst="ANI d8";this.pc++;}
else if(o===0xE9)inst="PCHL";
else if(o===0xEB)inst="XCHG";
else if(o===0xEE){inst="XRI d8";this.pc++;}
else if(o===0xF1)inst="POP PSW";
else if(o===0xF3)inst="DI";
else if(o===0xF5)inst="PUSH PSW";
else if(o===0xF6){inst="ORI d8";this.pc++;}
else if(o===0xF9)inst="SPHL";
else if(o===0xFB)inst="EI";
else if(o===0xFE){inst="CPI d8";this.pc++;}
else inst="DB $"+o.toString(16).toUpperCase().padStart(2,"0");
}}
res.push({addr:sp,end:this.pc,bytes:Array.from(this.mem.slice(sp,this.pc)),mnemonic:inst});
}
this.pc=sPC;return res;};
if(typeof window!=="undefined")window.Intel8085Emulator=Intel8085Emulator;
if(typeof module!=="undefined"&&module.exports)module.exports=Intel8085Emulator;
})();
