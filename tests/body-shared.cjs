'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let canvasDepth=0,rendered=0,activeStyle='',paletteCalls=[];
function mockContext(){const obj={
  save(){canvasDepth++}, restore(){assert(canvasDepth>0,'restore without save');canvasDepth--},
  drawImage(){rendered++;for(const n of arguments)if(typeof n==='number')assert(Number.isFinite(n),'drawImage coordinate must be finite')},
  measureText(str){return{width:String(str).length*6}},
  createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}},
  set fillStyle(v){activeStyle=v;paletteCalls.push(v)},get fillStyle(){return activeStyle},
};return new Proxy(obj,{get(o,k){if(k in o)return o[k];return(...args)=>{for(const n of args)if(typeof n==='number')assert(Number.isFinite(n),String(k)+' nonfinite')}} ,set(o,k,v){o[k]=v;return true}})}
const g=mockContext();const nodes=new Map();
const doc={createElement:()=>({width:96,height:112,getContext:()=>g}),getElementById:(id)=>{if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:''});return nodes.get(id)}};
const c={document:doc,window:{},Character:{draw(){}},console};vm.createContext(c);
const read=(f)=>fs.readFileSync('public/game/'+f+'.js','utf8');
for(const file of ['tieu-pham','body-shared','a-nguyet'])vm.runInContext(read(file),c,{filename:file+'.js'});
vm.runInContext('this.body=SharedBody; this.player=TieuPham; this.nguyet=ANguyet',c);
assert.deepEqual(Object.keys(c.body.presets).sort(),['a_huy','a_nguyet','luc_nham','tieu_pham','truong'].sort());
const base={x:100,y:100,dir:'down',walk:1,sprinting:false};
for(const name of Object.keys(c.body.presets)){
  const start=rendered;
  c.body.draw(g,base,1,name,{label:name});
  assert(rendered>start,'drawImage never called for '+name);
  assert.equal(canvasDepth,0,'unbalanced Canvas state for '+name);
}
// Player colors must not be polluted after an NPC render.
paletteCalls=[];c.body.draw(g,base,1,'a_huy');const yellow=paletteCalls.includes('#bb8d4e');
assert(yellow,'A Huy clothing tint not applied');
paletteCalls=[];c.player.draw(g,base,1);assert(paletteCalls.includes('#988368'),'player palette leaked from NPC variant');
assert(!paletteCalls.includes('#bb8d4e'),'A Huy palette leaking into player rendering');
c.player.applyOutfit(1);c.body.draw(g,base,1,'a_huy');
paletteCalls=[];c.player.draw(g,base,1);assert(paletteCalls.includes('#5c7887'),'player selected outfit lost when another NPC was rendered');
c.player.applyOutfit(0);
for(const dir of ['up','down','left','right']){
  c.body.draw(g,{...base,dir,walk:0},2,'truong');
  c.body.draw(g,{...base,dir,walk:1.2},2,'a_nguyet');
  assert.equal(canvasDepth,0);
}
// A Nguyet's independent NPC does not interfere with 24-villager work/ceremony roster.
c.nguyet.update(0.016,2,{x:880,y:718});
assert.equal(c.nguyet.hidden,false);
assert(c.nguyet.isNear({x:890,y:720}), 'A Nguyet proximity failed');
assert(c.nguyet.talk({x:890,y:720}), 'A Nguyet dialogue failed');
assert.equal(nodes.get('dialog-title').textContent,'A Nguyệt · Thiếu nữ cùng làng');
c.nguyet.draw(g,2);assert.equal(canvasDepth,0);
// Once ruined, this NPC must not be present.
vm.runInContext('this.Quest2={isVillageRuined:()=>true};',c);
c.nguyet.update(.016,3,{x:880,y:718});assert(c.nguyet.hidden,'A Nguyet visible in ruins');
console.log('PASS BODY: shared 5 presets; Canvas transforms balanced; 4 directions; no palette leak; A Nguyet dialogue/ruins visibility');
