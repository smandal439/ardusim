'use strict';
window.Intel8051Emulator = (function () {
function Cpu(){this.ACC=0;this.B=0;this.SP=0x07;this.PC=0;this.DPL=0;this.DPH=0;this.PSW=0;
this.P0=0xFF;this.P1=0xFF;this.P2=0xFF;this.P3=0xFF;
this.IE=0;this.IP=0;this.TCON=0;this.TMOD=0;
this.TH0=0;this.TL0=0;this.TH1=0;this.TL1=0;
this.SCON=0;this.SBUF=0;this.PCON=0;
this.ram=new Uint8Array(256);this.xram=new Uint8Array(65536);
this.halted=false;this.cycles=0;
this._portWriteCb=null;this._portReadCb=null;this._serialLogCb=null;}
var CY=0x80,AC=0x40,F0=0x20,RS1=0x08,RS0=0x04,OV=0x02,PB=0x01;
function par(x){x^=x>>4;x^=x>>2;x^=x>>1;return(~x)&1;}
Cpu.prototype={
reset:function(){this.ACC=0;this.B=0;this.SP=0x07;this.PC=0;this.PSW=0;this.P0=0xFF;this.P1=0xFF;this.P2=0xFF;this.P3=0xFF;this.halted=false;this.cycles=0;},
load:function(code,addr){addr=addr||0;for(var i=0;i<code.length;i++)this.xram[(addr+i)&0xFFFF]=code[i];},
_bk:function(){return((this.PSW&RS1)>>2)+((this.PSW&RS0)>>4);},
_rR:function(n){return n<8?this.ram[this._bk()*8+n]:0;},
_rW:function(n,v){if(n<8)this.ram[this._bk()*8+n]=v&0xFF;},
_push:function(v){this.SP=(this.SP+1)&0xFF;this.ram[this.SP]=v&0xFF;},
_pop:function(){var v=this.ram[this.SP];this.SP=(this.SP-1)&0xFF;return v;},
_rb:function(a){var ba=a&0xF8,bi=a&7;return(this._rs(ba)>>bi)&1;},
_wb:function(a,v){var ba=a&0xF8,bi=a&7,c=this._rs(ba);if(v)c|=(1<<bi);else c&=~(1<<bi);this._ws(ba,c);},
_rs:function(a){if(a===0xE0)return this.ACC;if(a===0xF0)return this.B;if(a===0xD0)return this.PSW;
if(a===0x81)return this.SP;if(a===0x82)return this.DPL;if(a===0x83)return this.DPH;
if(a===0x80)return this.P0;if(a===0x90)return this.P1;if(a===0xA0)return this.P2;if(a===0xB0)return this.P3;
if(a===0xA8)return this.IE;if(a===0xB8)return this.IP;
if(a===0x88)return this.TCON;if(a===0x89)return this.TMOD;
if(a===0x8C)return this.TH0;if(a===0x8A)return this.TL0;
if(a===0x8D)return this.TH1;if(a===0x8B)return this.TL1;
if(a===0x98)return this.SCON;if(a===0x87)return this.PCON;
return this.ram[a]||0;},
_ws:function(a,v){v&=0xFF;
if(a===0xE0){this.ACC=v;return;}if(a===0xF0){this.B=v;return;}
if(a===0xD0){this.PSW=v;return;}if(a===0x81){this.SP=v;return;}
if(a===0x82){this.DPL=v;return;}if(a===0x83){this.DPH=v;return;}
if(a===0x80){this.P0=v;this._sync(0,v);return;}
if(a===0x90){this.P1=v;this._sync(1,v);return;}
if(a===0xA0){this.P2=v;this._sync(2,v);return;}
if(a===0xB0){this.P3=v;this._sync(3,v);return;}
if(a===0xA8){this.IE=v;return;}if(a===0xB8){this.IP=v;return;}
if(a===0x88){this.TCON=v;return;}if(a===0x89){this.TMOD=v;return;}
if(a===0x8C){this.TH0=v;return;}if(a===0x8A){this.TL0=v;return;}
if(a===0x8D){this.TH1=v;return;}if(a===0x8B){this.TL1=v;return;}
if(a===0x98){this.SCON=v;return;}if(a===0x87){this.PCON=v;return;}
if(a===0x99){if(this._serialLogCb)this._serialLogCb(String.fromCharCode(v));return;}
this.ram[a]=v;},
_sync:function(p,v){
var c=window.CircuitCanvas;if(!c)return;
var b=typeof c.getBoardInst==='function'?c.getBoardInst():null;if(!b)return;
var d=window.ArduinoComponents&&window.ArduinoComponents.COMPONENT_DEFS;
if(!d||!d[b.type])return;
var pn=['P0','P1','P2','P3'][p];
for(var i=0;i<8;i++){var pid=pn+'.'+i;
var pin=d[b.type].pins.find(function(x){return x.id===pid;});
if(pin){var val=(v>>i)&1;var pk='pin_'+pid;
window.ArduinoSim.pinStates[pk]=val;window.ArduinoSim.pinStates['pin_'+pid]=val;
window.ArduinoSim._emitPinChange(pk,val);}}},
_rd:function(p,b){
var c=window.CircuitCanvas;if(!c)return 0;
var br=typeof c.getBoardInst==='function'?c.getBoardInst():null;if(!br)return 0;
var pid=['P0','P1','P2','P3'][p]+'.'+b;
return typeof c._readDigitalInput==='function'?c._readDigitalInput(br.id,pid)&1:0;},
_add:function(v){var ac=((this.ACC&0x0F)+(v&0x0F))>0x0F;var r=this.ACC+v;var ov=((~(this.ACC^v)&(this.ACC^r))&0x80)!==0;this.ACC=r&0xFF;this.PSW=(this.PSW&~(CY|AC|OV))|(r>0xFF?CY:0)|(ac?AC:0)|(ov?OV:0)|(par(this.ACC)?PB:0);},
_adc:function(v){var cy=this.PSW&CY?1:0;var ac=((this.ACC&0x0F)+(v&0x0F)+cy)>0x0F;var r=this.ACC+v+cy;var ov=((~(this.ACC^v)&(this.ACC^r))&0x80)!==0;this.ACC=r&0xFF;this.PSW=(this.PSW&~(CY|AC|OV))|(r>0xFF?CY:0)|(ac?AC:0)|(ov?OV:0)|(par(this.ACC)?PB:0);},
_sbb:function(v){var cy=this.PSW&CY?1:0;var r=this.ACC-v-cy;var ac=(this.ACC&0x0F)<((v&0x0F)+cy);var ov=r<-128||r>127;this.ACC=r&0xFF;this.PSW=(this.PSW&~(CY|AC|OV))|(r<0?CY:0)|(ac?AC:0)|(ov?OV:0)|(par(this.ACC)?PB:0);},
step:function(){if(this.halted)return 1;
var op=this.xram[this.PC],a,v,ba,rel,d,i;this.PC=(this.PC+1)&0xFFFF;
if(op===0x00)return 1;
if(op===0x80){rel=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this.PC=(this.PC+(rel>127?rel-256:rel))&0xFFFF;return 2;}
if(op===0x02){d=(this.xram[this.PC]<<8)|this.xram[(this.PC+1)&0xFFFF];this.PC=d;return 2;}
if(op===0x12){d=(this.xram[this.PC]<<8)|this.xram[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;this._push((this.PC>>8)&0xFF);this._push(this.PC&0xFF);this.PC=d;return 2;}
if(op===0x22){var h=this._pop(),l=this._pop();this.PC=(h<<8)|l;return 2;}
if(op===0x32){var h2=this._pop(),l2=this._pop();this.PC=(h2<<8)|l2;return 2;}
if(op===0x73){this.PC=((this.DPH<<8)|this.DPL)+this.ACC;return 2;}
if(op===0x03){this.ACC=((this.ACC<<1)|(this.ACC>>7))&0xFF;this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0x13){var t=this.PSW&CY?1:0;this.PSW=(this.PSW&~CY)|(this.ACC&1?CY:0);this.ACC=((this.ACC>>1)|(t<<7))&0xFF;this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0x23){this.ACC=((this.ACC<<1)|(this.ACC>>7))&0xFF;this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0x33){var t2=this.PSW&CY?1:0;this.PSW=(this.PSW&~CY)|(this.ACC&0x80?CY:0);this.ACC=((this.ACC<<1)|t2)&0xFF;this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0xC4){this.ACC=((this.ACC>>4)|(this.ACC<<4))&0xFF;return 1;}
if(op===0xE4){this.ACC=0;this.PSW=(this.PSW&~PB)|(par(0)?PB:0);return 1;}
if(op===0xF4){this.ACC=(~this.ACC)&0xFF;this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0xA4){var mr=this.ACC*this.B;this.ACC=mr&0xFF;this.B=(mr>>8)&0xFF;this.PSW=(this.PSW&~(CY|OV))|(this.B?OV:0)|(par(this.ACC)?PB:0);return 4;}
if(op===0x84){if(this.B===0){this.PSW|=CY|OV;}else{this.ACC=Math.floor(this.ACC/this.B);this.PSW&=~(CY|OV);this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);}return 4;}
if(op===0xD4){var da=this.ACC;if((this.ACC&0x0F)>9||(this.PSW&AC))da+=6;if((da&0xF0)>0x90||(this.PSW&CY))da+=0x60;if(da>0xFF)this.PSW|=CY;this.ACC=da&0xFF;this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0xC3){this.PSW&=~CY;return 1;}
if(op===0xD3){this.PSW|=CY;return 1;}
if(op===0xB3){this.PSW^=CY;return 1;}
if(op===0x60){rel=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;if(this.ACC===0)this.PC=(this.PC+(rel>127?rel-256:rel))&0xFFFF;return 2;}
if(op===0x70){rel=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;if(this.ACC!==0)this.PC=(this.PC+(rel>127?rel-256:rel))&0xFFFF;return 2;}
if(op===0x40){rel=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;if(this.PSW&CY)this.PC=(this.PC+(rel>127?rel-256:rel))&0xFFFF;return 2;}
if(op===0x50){rel=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;if(!(this.PSW&CY))this.PC=(this.PC+(rel>127?rel-256:rel))&0xFFFF;return 2;}
if(op===0x74){this.ACC=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0x78){this._rW(0,this.xram[this.PC]);this.PC=(this.PC+1)&0xFFFF;return 1;}
if(op===0x79){this._rW(1,this.xram[this.PC]);this.PC=(this.PC+1)&0xFFFF;return 1;}
if(op===0x7A){this._rW(2,this.xram[this.PC]);this.PC=(this.PC+1)&0xFFFF;return 1;}
if(op===0x7B){this._rW(3,this.xram[this.PC]);this.PC=(this.PC+1)&0xFFFF;return 1;}
if(op===0x7C){this._rW(4,this.xram[this.PC]);this.PC=(this.PC+1)&0xFFFF;return 1;}
if(op===0x7D){this._rW(5,this.xram[this.PC]);this.PC=(this.PC+1)&0xFFFF;return 1;}
if(op===0x7E){this._rW(6,this.xram[this.PC]);this.PC=(this.PC+1)&0xFFFF;return 1;}
if(op===0x7F){this._rW(7,this.xram[this.PC]);this.PC=(this.PC+1)&0xFFFF;return 1;}
if(op>=0xE8&&op<=0xEF){this.ACC=this._rR(op-0xE8);this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op>=0xF8&&op<=0xFF){this._rW(op-0xF8,this.ACC);return 1;}
if(op===0xF5){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._ws(a,this.ACC);return 2;}
if(op===0xE5){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this.ACC=this._rs(a);this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 2;}
if(op===0x75){d=this.xram[this.PC];v=this.xram[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;this._ws(d,v);return 2;}
if(op===0x85){var s2=this.xram[this.PC];d=this.xram[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;this._ws(d,this._rs(s2));return 2;}
if(op>=0xA8&&op<=0xAF){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._rW(op-0xA8,this._rs(a));return 2;}
if(op>=0x88&&op<=0x8F){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._ws(a,this._rR(op-0x88));return 2;}
if(op===0x90){this.DPH=this.xram[this.PC];this.DPL=this.xram[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;return 2;}
if(op===0xF6||op===0xF7){this.ram[this._rR(op-0xF6)&0x7F]=this.ACC;return 1;}
if(op===0xE6||op===0xE7){this.ACC=this.ram[this._rR(op-0xE6)&0x7F];this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0x76||op===0x77){this.ram[this._rR(op-0x76)&0x7F]=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;return 1;}
if(op===0xC0){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._push(this._rs(a));return 2;}
if(op===0xD0){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._ws(a,this._pop());return 2;}
if(op===0xC6||op===0xC7){var tmp=this.ACC;var ri=this._rR(op-0xC6)&0x7F;this.ACC=this.ram[ri];this.ram[ri]=tmp;this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0xC8||op===0xC9||op===0xCA||op===0xCB||op===0xCC||op===0xCD||op===0xCE||op===0xCF){var tmp2=this.ACC;this.ACC=this._rR(op-0xC8);this._rW(op-0xC8,tmp2);this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op>=0x28&&op<=0x2F){this._add(this._rR(op-0x28));return 1;}
if(op===0x25){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._add(this._rs(a));return 2;}
if(op===0x26||op===0x27){this._add(this.ram[this._rR(op-0x26)&0x7F]);return 1;}
if(op===0x24){v=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._add(v);return 1;}
if(op>=0x38&&op<=0x3F){this._adc(this._rR(op-0x38));return 1;}
if(op===0x35){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._adc(this._rs(a));return 2;}
if(op===0x36||op===0x37){this._adc(this.ram[this._rR(op-0x36)&0x7F]);return 1;}
if(op===0x34){v=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._adc(v);return 1;}
if(op>=0x98&&op<=0x9F){this._sbb(this._rR(op-0x98));return 1;}
if(op===0x95){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._sbb(this._rs(a));return 2;}
if(op===0x96||op===0x97){this._sbb(this.ram[this._rR(op-0x96)&0x7F]);return 1;}
if(op===0x94){v=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._sbb(v);return 1;}
if(op===0x04){this.ACC=(this.ACC+1)&0xFF;this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op>=0x08&&op<=0x0F){i=op-0x08;this._rW(i,(this._rR(i)+1)&0xFF);return 1;}
if(op===0x05){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._ws(a,(this._rs(a)+1)&0xFF);return 2;}
if(op===0x06||op===0x07){var ri2=this._rR(op-0x06)&0x7F;this.ram[ri2]=(this.ram[ri2]+1)&0xFF;return 1;}
if(op===0xA3){var dp=((this.DPH<<8)|this.DPL)+1;this.DPH=(dp>>8)&0xFF;this.DPL=dp&0xFF;return 2;}
if(op===0x14){this.ACC=(this.ACC-1)&0xFF;this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op>=0x18&&op<=0x1F){i=op-0x18;this._rW(i,(this._rR(i)-1)&0xFF);return 1;}
if(op===0x15){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._ws(a,(this._rs(a)-1)&0xFF);return 2;}
if(op===0x16||op===0x17){var ri3=this._rR(op-0x16)&0x7F;this.ram[ri3]=(this.ram[ri3]-1)&0xFF;return 1;}
if(op>=0x58&&op<=0x5F){this.ACC&=this._rR(op-0x58);this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0x55){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this.ACC&=this._rs(a);this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 2;}
if(op===0x56||op===0x57){this.ACC&=this.ram[this._rR(op-0x56)&0x7F];this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0x54){v=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this.ACC&=v;this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0x52){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._ws(a,this._rs(a)&this.ACC);return 2;}
if(op===0x53){a=this.xram[this.PC];v=this.xram[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;this._ws(a,this._rs(a)&v);return 2;}
if(op>=0x48&&op<=0x4F){this.ACC|=this._rR(op-0x48);this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0x45){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this.ACC|=this._rs(a);this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 2;}
if(op===0x46||op===0x47){this.ACC|=this.ram[this._rR(op-0x46)&0x7F];this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0x44){v=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this.ACC|=v;this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0x42){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._ws(a,this._rs(a)|this.ACC);return 2;}
if(op===0x43){a=this.xram[this.PC];v=this.xram[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;this._ws(a,this._rs(a)|v);return 2;}
if(op>=0x68&&op<=0x6F){this.ACC^=this._rR(op-0x68);this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0x65){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this.ACC^=this._rs(a);this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 2;}
if(op===0x66||op===0x67){this.ACC^=this.ram[this._rR(op-0x66)&0x7F];this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0x64){v=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this.ACC^=v;this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if(op===0x62){a=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._ws(a,this._rs(a)^this.ACC);return 2;}
if(op===0x63){a=this.xram[this.PC];v=this.xram[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;this._ws(a,this._rs(a)^v);return 2;}
if(op===0xC2){ba=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._wb(ba,0);return 2;}
if(op===0xD2){ba=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._wb(ba,1);return 2;}
if(op===0xB2){ba=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._wb(ba,this._rb(ba)?0:1);return 2;}
if(op===0x20){ba=this.xram[this.PC];rel=this.xram[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;if(this._rb(ba))this.PC=(this.PC+(rel>127?rel-256:rel))&0xFFFF;return 2;}
if(op===0x30){ba=this.xram[this.PC];rel=this.xram[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;if(!this._rb(ba))this.PC=(this.PC+(rel>127?rel-256:rel))&0xFFFF;return 2;}
if(op===0x10){ba=this.xram[this.PC];rel=this.xram[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;if(this._rb(ba)){this._wb(ba,0);this.PC=(this.PC+(rel>127?rel-256:rel))&0xFFFF;}return 2;}
if(op===0x82){ba=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;if(this._rb(ba))this.PSW|=CY;else this.PSW&=~CY;return 2;}
if(op===0xB0){ba=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;if(!this._rb(ba))this.PSW|=CY;else this.PSW&=~CY;return 2;}
if(op===0x72){ba=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;if(this._rb(ba))this.PSW|=CY;return 2;}
if(op===0xA0){ba=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;if(!this._rb(ba))this.PSW|=CY;return 2;}
if(op===0xA2){ba=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;if(this._rb(ba))this.PSW|=CY;else this.PSW&=~CY;return 2;}
if(op===0x92){ba=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._wb(ba,this.PSW&CY?1:0);return 2;}
if(op===0xB5){d=this.xram[this.PC];rel=this.xram[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;if(this.ACC!==this._rs(d))this.PC=(this.PC+(rel>127?rel-256:rel))&0xFFFF;if(this.ACC<this._rs(d))this.PSW|=CY;else this.PSW&=~CY;return 2;}
if(op===0xB4){v=this.xram[this.PC];rel=this.xram[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;if(this.ACC!==v)this.PC=(this.PC+(rel>127?rel-256:rel))&0xFFFF;if(this.ACC<v)this.PSW|=CY;else this.PSW&=~CY;return 2;}
if(op>=0xB8&&op<=0xBF){i=op-0xB8;v=this.xram[this.PC];rel=this.xram[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;if(this._rR(i)!==v)this.PC=(this.PC+(rel>127?rel-256:rel))&0xFFFF;if(this._rR(i)<v)this.PSW|=CY;else this.PSW&=~CY;return 2;}
if(op>=0xD8&&op<=0xDF){i=op-0xD8;var rv=(this._rR(i)-1)&0xFF;this._rW(i,rv);rel=this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;if(rv!==0)this.PC=(this.PC+(rel>127?rel-256:rel))&0xFFFF;return 2;}
if(op===0xD5){a=this.xram[this.PC];rel=this.xram[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;var dv=(this._rs(a)-1)&0xFF;this._ws(a,dv);if(dv!==0)this.PC=(this.PC+(rel>127?rel-256:rel))&0xFFFF;return 2;}
if(op===0xF0){this.xram[(this.DPH<<8)|this.DPL]=this.ACC;return 2;}
if(op===0xE0){this.ACC=this.xram[(this.DPH<<8)|this.DPL];this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 2;}
if(op===0x93){this.ACC=this.xram[((this.DPH<<8)|this.DPL)+this.ACC];this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 2;}
if(op===0x83){this.ACC=this.xram[this.PC+this.ACC];this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 2;}
if(op===0xD6||op===0xD7){var ri4=this._rR(op-0xD6)&0x7F;var lo=this.ram[ri4]&0x0F;this.ram[ri4]=(this.ram[ri4]&0xF0)|(this.ACC&0x0F);this.ACC=(this.ACC&0xF0)|lo;this.PSW=(this.PSW&~PB)|(par(this.ACC)?PB:0);return 1;}
if((op&0x1F)===0x11){var pa=((this.PC&0xF800)|((op&0xE0)<<3))|this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this._push((this.PC>>8)&0xFF);this._push(this.PC&0xFF);this.PC=pa;return 2;}
if((op&0x1F)===0x01){var pa2=((this.PC&0xF800)|((op&0xE0)<<3))|this.xram[this.PC];this.PC=(this.PC+1)&0xFFFF;this.PC=pa2;return 2;}
return 1;
}};return Cpu;})();