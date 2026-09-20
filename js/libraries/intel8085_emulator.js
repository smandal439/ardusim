'use strict';
window.Intel8085Emulator = (function () {
  function Cpu() {
    this.A=0;this.B=0;this.C=0;this.D=0;this.E=0;this.H=0;this.L=0;
    this.F=0;this.SP=0xFFF8;this.PC=0;
    this.memory=new Uint8Array(65536);
    this.ports=new Uint8Array(256);
    this.halted=false;this.cycles=0;
    this._portWriteCb=null;this._portReadCb=null;
  }
  var CY=1,P=4,AC=16,Z=64,S=128;
  function par(v){v&=0xFF;var p=0;while(v){p^=v&1;v>>=1;}return p?0:P;}
  function hc(a,b){return((a&0x0F)+(b&0x0F))&0x10;}
  var RN=['B','C','D','E','H','L','M','A'];
  Cpu.prototype={
    reset:function(){this.A=0;this.B=0;this.C=0;this.D=0;this.E=0;this.H=0;this.L=0;this.F=0;this.SP=0xFFF8;this.PC=0;this.halted=false;this.cycles=0;},
    load:function(code,addr){addr=addr||0;for(var i=0;i<code.length;i++)this.memory[(addr+i)&0xFFFF]=code[i];},
    readPort:function(p){if(this._portReadCb)return this._portReadCb(p&0xFF);return this.ports[p&0xFF];},
    writePort:function(p,v){this.ports[p&0xFF]=v&0xFF;if(this._portWriteCb)this._portWriteCb(p&0xFF,v&0xFF);},
    getReg:function(n){return RN[n]==='M'?this._getM():this[RN[n]];},
    setReg:function(n,v){if(RN[n]==='M')this._setM(v);else this[RN[n]]=v;},
    _getM:function(){return this.memory[(this.H<<8)|this.L];},
    _setM:function(v){this.memory[(this.H<<8)|this.L]=v&0xFF;},
    _rp:function(o){var i=(o>>4)&3;return i===0?(this.B<<8)|this.C:i===1?(this.D<<8)|this.E:i===2?(this.H<<8)|this.L:this.SP;},
    _srp:function(o,v){v&=0xFFFF;var i=(o>>4)&3;if(i===0){this.B=(v>>8)&0xFF;this.C=v&0xFF;}else if(i===1){this.D=(v>>8)&0xFF;this.E=v&0xFF;}else if(i===2){this.H=(v>>8)&0xFF;this.L=v&0xFF;}else this.SP=v;},
    _pp:function(o){var i=(o>>4)&3;return i===0?(this.B<<8)|this.C:i===1?(this.D<<8)|this.E:i===2?(this.H<<8)|this.L:((this.A<<8)|(this.F|0x02));},
    _spp:function(o,v){v&=0xFFFF;var i=(o>>4)&3;if(i===0){this.B=(v>>8)&0xFF;this.C=v&0xFF;}else if(i===1){this.D=(v>>8)&0xFF;this.E=v&0xFF;}else if(i===2){this.H=(v>>8)&0xFF;this.L=v&0xFF;}else{this.A=(v>>8)&0xFF;this.F=(v&0xD7)|0x02;}},
    _push16:function(v){this.SP=(this.SP-2)&0xFFFF;this.memory[this.SP]=v&0xFF;this.memory[(this.SP+1)&0xFFFF]=(v>>8)&0xFF;},
    _pop16:function(){var l=this.memory[this.SP],h=this.memory[(this.SP+1)&0xFFFF];this.SP=(this.SP+2)&0xFFFF;return(h<<8)|l;},
    _sf:function(r,cy,ac){this.F=0;if(r&0x80)this.F|=S;if((r&0xFF)===0)this.F|=Z;if(ac)this.F|=AC;this.F|=par(r&0xFF);if(cy)this.F|=CY;},
    _inc:function(v){var r=(v+1)&0xFF;this.F=(this.F&(~(Z|S|AC|P)));if(r&0x80)this.F|=S;if(r===0)this.F|=Z;if((v&0x0F)===0x0F)this.F|=AC;this.F|=par(r);return r;},
    _dec:function(v){var r=(v-1)&0xFF;this.F=(this.F&(~(Z|S|AC|P)));if(r&0x80)this.F|=S;if(r===0)this.F|=Z;if((v&0x0F)===0)this.F|=AC;this.F|=par(r);return r;},
    _addOp:function(v){var ac=hc(this.A,v);var r=this.A+v;this.A=r&0xFF;this._sf(this.A,r>0xFF,ac);},
    _adcOp:function(v){var cy=this.F&CY?1:0;var ac=hc(this.A,v);var r=this.A+v+cy;this.A=r&0xFF;this._sf(this.A,r>0x100,ac);},
    _subOp:function(v){var ac=(this.A&0x0F)<(v&0x0F);var r=this.A-v;this.A=r&0xFF;this._sf(this.A,r<0,ac);},
    _sbbOp:function(v){var cy=this.F&CY?1:0;var ac=(this.A&0x0F)<((v&0x0F)+cy);var r=this.A-v-cy;this.A=r&0xFF;this._sf(this.A,r<0,ac);},
    _anaOp:function(v){var ac=((this.A|v)&0x08)!==0;this.A&=v;this._sf(this.A,false,ac);this.F&=~CY;},
    _xraOp:function(v){this.A^=v;this._sf(this.A,false,false);this.F&=~CY;},
    _oraOp:function(v){this.A|=v;this._sf(this.A,false,false);this.F&=~CY;},
    _cmpOp:function(v){var ac=(this.A&0x0F)<(v&0x0F);var r=this.A-v;this._sf(r&0xFF,r<0,ac);},
    step:function(){
      if(this.halted)return 7;
      var op=this.memory[this.PC],lo,hi,v,r;
      this.PC=(this.PC+1)&0xFFFF;
      if(op===0x00)return 4;
      if(op===0x76){this.halted=true;return 7;}
      if(op===0xFB||op===0xF3)return 4;
      if(op===0x2F){this.A=(~this.A)&0xFF;return 4;}
      if(op===0x37){this.F|=CY;return 4;}
      if(op===0x3F){this.F^=CY;return 4;}
      if(op===0x27){var da=this.A,ocy=this.F&CY?1:0;this.F&=~AC;if((this.F&AC)||(da&0x0F)>9){da+=6;this.F|=AC;}else this.F&=~AC;this.F&=~CY;if(ocy||(da&0xF0)>0x90||(this.F&AC)){da+=0x60;this.F|=CY;}this.A=da&0xFF;this.F=(this.F&(~(S|Z|P)))|(this.A&0x80?S:0)|(this.A===0?Z:0)|par(this.A);return 4;}
      if(op===0xEB){var t=this.D;this.D=this.H;this.H=t;t=this.E;this.E=this.L;this.L=t;return 4;}
      if(op===0xF9){this.SP=(this.H<<8)|this.L;return 6;}
      if(op===0xE9){this.PC=(this.H<<8)|this.L;return 6;}
      if(op===0xE3){lo=this.memory[this.SP];hi=this.memory[(this.SP+1)&0xFFFF];this.memory[this.SP]=this.L;this.memory[(this.SP+1)&0xFFFF]=this.H;this.H=hi;this.L=lo;return 16;}
      if(op===0x07){var c7=(this.A>>7)&1;this.A=((this.A<<1)|c7)&0xFF;this.F=(this.F&~CY)|(c7?CY:0);return 4;}
      if(op===0x0F){var lsb=this.A&1;this.A=((this.A>>1)|(lsb<<7))&0xFF;this.F=(this.F&~CY)|(lsb?CY:0);return 4;}
      if(op===0x17){var oc=(this.F&CY)?1:0;var c1=(this.A>>7)&1;this.A=((this.A<<1)|oc)&0xFF;this.F=(this.F&~CY)|(c1?CY:0);return 4;}
      if(op===0x1F){var oc2=(this.F&CY)?1:0;var lsb2=this.A&1;this.A=((this.A>>1)|(oc2<<7))&0xFF;this.F=(this.F&~CY)|(lsb2?CY:0);return 4;}
      if(op>=0x40&&op<=0x7F&&op!==0x76){var d=(op>>3)&7,s=op&7;var sv=this.getReg(s);this.setReg(d,sv);return 7;}
      if((op&0xC7)===0x06){r=(op>>3)&7;v=this.memory[this.PC];this.PC=(this.PC+1)&0xFFFF;this.setReg(r,v);return 7;}
      if((op&0xCF)===0x01){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];this.PC=(this.PC+2)&0xFFFF;this._srp(op,(hi<<8)|lo);return 10;}
      if((op&0xC7)===0x04){r=(op>>3)&7;this.setReg(r,this._inc(this.getReg(r)));return 5;}
      if((op&0xC7)===0x05){r=(op>>3)&7;this.setReg(r,this._dec(this.getReg(r)));return 5;}
      if((op&0xCF)===0x03){this._srp(op,(this._rp(op)+1)&0xFFFF);return 6;}
      if((op&0xCF)===0x0B){this._srp(op,(this._rp(op)-1)&0xFFFF);return 6;}
      if((op&0xCF)===0x09){var hl=(this.H<<8)|this.L;var dv=this._rp(op);var dr=hl+dv;this.H=(dr>>8)&0xFF;this.L=dr&0xFF;this.F=(dr>0xFFFF)?(this.F|CY):(this.F&~CY);return 10;}
      if(op>=0x80&&op<=0x87){this._addOp(this.getReg(op&7));return 4;}
      if(op>=0x88&&op<=0x8F){this._adcOp(this.getReg(op&7));return 4;}
      if(op>=0x90&&op<=0x97){this._subOp(this.getReg(op&7));return 4;}
      if(op>=0x98&&op<=0x9F){this._sbbOp(this.getReg(op&7));return 4;}
      if(op>=0xA0&&op<=0xA7){this._anaOp(this.getReg(op&7));return 4;}
      if(op>=0xA8&&op<=0xAF){this._xraOp(this.getReg(op&7));return 4;}
      if(op>=0xB0&&op<=0xB7){this._oraOp(this.getReg(op&7));return 4;}
      if(op>=0xB8&&op<=0xBF){this._cmpOp(this.getReg(op&7));return 4;}
      if(op===0xC6||op===0xCE||op===0xD6||op===0xDE||op===0xE6||op===0xEE||op===0xF6||op===0xFE){
        v=this.memory[this.PC];this.PC=(this.PC+1)&0xFFFF;
        if(op===0xC6)this._addOp(v);else if(op===0xCE)this._adcOp(v);else if(op===0xD6)this._subOp(v);else if(op===0xDE)this._sbbOp(v);
        else if(op===0xE6)this._anaOp(v);else if(op===0xEE)this._xraOp(v);else if(op===0xF6)this._oraOp(v);else this._cmpOp(v);
        return 7;
      }
      if(op===0xC9){this.PC=this._pop16();return 10;}
      if(op===0xC7||op===0xCF||op===0xD7||op===0xDF||op===0xE7||op===0xEF||op===0xF7||op===0xFF){
        this._push16(this.PC);this.PC=(op-0xC7);return 12;
      }
      if(op===0xDB){v=this.memory[this.PC];this.PC=(this.PC+1)&0xFFFF;this.A=this.readPort(v);return 10;}
      if(op===0xD3){v=this.memory[this.PC];this.PC=(this.PC+1)&0xFFFF;this.writePort(v,this.A);return 10;}
      if(op===0xC5||op===0xD5||op===0xE5||op===0xF5){this._push16(this._pp(op));return 12;}
      if(op===0xC1||op===0xD1||op===0xE1||op===0xF1){this._spp(op,this._pop16());return 10;}
      if(op===0xC3){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];this.PC=(hi<<8)|lo;return 10;}
      if(op===0xDA){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(this.F&CY){this.PC=(hi<<8)|lo;}else this.PC=(this.PC+2)&0xFFFF;return this.F&CY?10:7;}
      if(op===0xD2){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(!(this.F&CY)){this.PC=(hi<<8)|lo;}else this.PC=(this.PC+2)&0xFFFF;return!(this.F&CY)?10:7;}
      if(op===0xCA){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(this.F&Z){this.PC=(hi<<8)|lo;}else this.PC=(this.PC+2)&0xFFFF;return this.F&Z?10:7;}
      if(op===0xC2){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(!(this.F&Z)){this.PC=(hi<<8)|lo;}else this.PC=(this.PC+2)&0xFFFF;return!(this.F&Z)?10:7;}
      if(op===0xF2){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(!(this.F&S)){this.PC=(hi<<8)|lo;}else this.PC=(this.PC+2)&0xFFFF;return!(this.F&S)?10:7;}
      if(op===0xFA){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(this.F&S){this.PC=(hi<<8)|lo;}else this.PC=(this.PC+2)&0xFFFF;return this.F&S?10:7;}
      if(op===0xEA){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(this.F&P){this.PC=(hi<<8)|lo;}else this.PC=(this.PC+2)&0xFFFF;return this.F&P?10:7;}
      if(op===0xE2){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(!(this.F&P)){this.PC=(hi<<8)|lo;}else this.PC=(this.PC+2)&0xFFFF;return!(this.F&P)?10:7;}
      if(op===0xCD){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];this._push16((this.PC+2)&0xFFFF);this.PC=(hi<<8)|lo;return 18;}
      if(op===0xDC){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(this.F&CY){this._push16((this.PC+2)&0xFFFF);this.PC=(hi<<8)|lo;return 18;}else{this.PC=(this.PC+2)&0xFFFF;return 9;}}
      if(op===0xD4){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(!(this.F&CY)){this._push16((this.PC+2)&0xFFFF);this.PC=(hi<<8)|lo;return 18;}else{this.PC=(this.PC+2)&0xFFFF;return 9;}}
      if(op===0xCC){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(this.F&Z){this._push16((this.PC+2)&0xFFFF);this.PC=(hi<<8)|lo;return 18;}else{this.PC=(this.PC+2)&0xFFFF;return 9;}}
      if(op===0xC4){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(!(this.F&Z)){this._push16((this.PC+2)&0xFFFF);this.PC=(hi<<8)|lo;return 18;}else{this.PC=(this.PC+2)&0xFFFF;return 9;}}
      if(op===0xF4){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(!(this.F&S)){this._push16((this.PC+2)&0xFFFF);this.PC=(hi<<8)|lo;return 18;}else{this.PC=(this.PC+2)&0xFFFF;return 9;}}
      if(op===0xFC){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(this.F&S){this._push16((this.PC+2)&0xFFFF);this.PC=(hi<<8)|lo;return 18;}else{this.PC=(this.PC+2)&0xFFFF;return 9;}}
      if(op===0xEC){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(this.F&P){this._push16((this.PC+2)&0xFFFF);this.PC=(hi<<8)|lo;return 18;}else{this.PC=(this.PC+2)&0xFFFF;return 9;}}
      if(op===0xE4){lo=this.memory[this.PC];hi=this.memory[(this.PC+1)&0xFFFF];if(!(this.F&P)){this._push16((this.PC+2)&0xFFFF);this.PC=(hi<<8)|lo;return 18;}else{this.PC=(this.PC+2)&0xFFFF;return 9;}}
      if(op===0xD0||op===0xD8||op===0xC0||op===0xC8||op===0xF0||op===0xF8||op===0xE0||op===0xE8){
        var cond=false;
        if(op===0xD0)cond=!(this.F&CY);else if(op===0xD8)cond=!!(this.F&CY);
        else if(op===0xC0)cond=!(this.F&Z);else if(op===0xC8)cond=!!(this.F&Z);
        else if(op===0xF0)cond=!(this.F&S);else if(op===0xF8)cond=!!(this.F&S);
        else if(op===0xE0)cond=!(this.F&P);else if(op===0xE8)cond=!!(this.F&P);
        if(cond){this.PC=this._pop16();return 12;}return 6;
      }
      return 4;
    }
  };
  return Cpu;
})();
