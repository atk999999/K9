'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const game = path.join(__dirname, '../public/game');
const drawn = [];
const mockCtx = { drawImage: (...args) => drawn.push(args), save(){}, restore(){}, beginPath(){}, ellipse(){}, fill(){}, fillRect(){}, stroke(){}, fillText(){} };
const dom = new Map();
const createEl = () => ({hidden:true,style:{},appendChild(){},innerHTML:'',textContent:'',onload:null,onerror:null});
const getElementById = id => {if (!dom.has(id)) dom.set(id, createEl()); return dom.get(id);};
const store = new Map();
class MockImage {
  constructor(){this.complete = false; this.naturalWidth = 0;}
  set src(v){this._src = v; this.complete = true;this.naturalWidth = 620;this.naturalHeight = 465; if(this.onload)this.onload();}
  get src(){return this._src;}
}
const sandbox = {
  console, Date, URL, Image:MockImage, Math,
  setTimeout(){return 1;},clearTimeout(){},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))},
  window:{addEventListener(){},location:{href:'http://localhost:3000/game/index.html',origin:'http://localhost:3000'}},
  document:{baseURI:'http://localhost:3000/game/index.html',getElementById,createElement:createEl,body:createEl()},
  Quest2:{getData:()=>({ruinsActive:true}),isVillageRuined:()=>true},
  Villagers:{minutes:360,day:4},
  TieuPhamHome:{inside:false},
  VillageMusic:{isMuted:true},
  GameSave:{save(){}},
  LiepMaSFX:{stop(){}},
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(game,'quest3-comic.js'),'utf8')+'\n'+fs.readFileSync(path.join(game,'quest3.js'),'utf8')+'\nthis.Quest3=Quest3;',sandbox);
const Q = sandbox.Quest3;
Q.init();
Q.drawGround(mockCtx);
assert.equal(drawn.length,0,'Không vẽ nghĩa trang trước khi đắp mộ');
const pre = Q.getFlags();
Object.assign(pre,{quest3_started:true,quest3_survivor_search_complete:true,quest3_ay_nguyet_search_started:true,quest3_blue_ribbon_collected:true});
sandbox.localStorage.setItem(Q.STORAGE_KEY,JSON.stringify(pre));
Q.loadState();
assert.equal(Q.interact({x:505,y:745}),true,'Nhấn ĐẮP MỘ phải bắt đầu hồi ức');
assert.equal(Q.isComicActive(),true);
assert.match(getElementById('quest3-comic-img').src,/\/game\/webp\/15\.webp$/,'Ảnh đào mộ 15.webp hiển thị');
assert.equal(Q.getFlags().quest3_memorial_complete,false,'Chưa hoàn thành trước cảnh quỳ');
Q.drawGround(mockCtx);
assert.equal(drawn.length,1,'Ảnh AI phải xuất hiện sau nút ĐẮP MỘ');
assert.match(drawn[0][0].src,/nghia_trang_tuong_niem.webp/);
Q.advanceComicPanel();
assert.match(getElementById('quest3-comic-img').src,/\/game\/webp\/16\.webp$/,'Ảnh hồi ức 16.webp hiển thị');
Q.advanceComicPanel();
assert.equal(Q.getFlags().quest3_memorial_complete,true);
Q.drawGround(mockCtx);
assert.equal(drawn.length,2,'Ảnh AI còn trên bản đồ sau hồi ức');
assert.equal(Q.getGraves().length,60);
assert.equal(Q.isGraveBlocked(194,753),true);
assert.equal(Q.isGraveBlocked(505,745),false);
// Tải lại khi đang ở khung ảnh 16, chưa hoàn thành nhiệm vụ.
const mid = Q.getFlags();
mid.quest3_memorial_complete=false;
mid.comic_checkpoint={scene:'memorial',index:1};
sandbox.localStorage.setItem(Q.STORAGE_KEY,JSON.stringify(mid));
Q.resetState();
sandbox.localStorage.setItem(Q.STORAGE_KEY,JSON.stringify(mid));
Q.restoreAfterLoad({x:505,y:745});
const beforeDraw=drawn.length;
Q.drawGround(mockCtx);
assert.equal(drawn.length,beforeDraw+1,'Tải lại ở panel 16 vẫn có nghĩa trang');
console.log('PASS: Nhấn ĐẮP MỘ -> hình AI -> hồi ức 15/16 -> tồn tại sau cảnh và khi tải lại.');
