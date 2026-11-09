'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../public/game');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');
function canvasRecorder(){
 let tr={x:0,y:0}, stack=[];const logs=[];
 const ctx=new Proxy({
  save(){stack.push({...tr})},restore(){assert(stack.length, 'unbalanced restore');tr=stack.pop()},
  translate(x,y){tr.x+=x;tr.y+=y},fillText(text){logs.push(String(text))},
  measureText(text){return {width:String(text).length*6}},
  createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}}
 },{get(obj,key){if(key in obj)return obj[key];if(typeof key==='symbol')return;return ()=>{};}});
 return {ctx,logs,get translation(){return tr},get stackDepth(){return stack.length}};
}
function questEnv(seedStorage){
 const storage=seedStorage||new Map(), nodes=new Map(), canvas=canvasRecorder();
 function node(){return {style:{},hidden:true,innerHTML:'',textContent:'',getContext(){return canvas.ctx},appendChild(){},addEventListener(){},setAttribute(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100}}};}
 const document={body:node(),getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement(){return node()}};
 const p={x:221,y:314,hp:100,maxHp:100,mp:0,walk:0,dir:'down'};
 const mockMath=Object.create(Math);mockMath.random=()=>1;
 const env={console,Math:mockMath,document,p,window:{},Character:{},Image:class{set src(s){this._src=s}},
  localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,String(v))},removeItem(k){storage.delete(k)}},
  setTimeout(){return 1},clearTimeout(){},setInterval(){},clearInterval(){},
  Villagers:{day:3,minutes:480,sleepToNextDay(){this.day++;this.minutes=360;return this.day}},
  Quest1:{getState(){return 'completed'},registeredDay:null,STATES:{SELECTION_READY:'selection_ready'}}};
 vm.createContext(env); const run=code=>vm.runInContext(code,env);
 run(source('tieu-pham.js'));run(source('tieu-pham-home.js'));run(source('quest2-render.js'));run(source('quest2.js'));
 return {Q:run('Quest2'),H:run('TieuPhamHome'),T:run('TieuPham'),p,env,storage,nodes,canvas};
}
function reachCountdown(e){
 const {Q,H,p,env}=e;
 Q.init();H.enter(p);H.sleepInBed(p);
 Q.update(2,2,p,env.Villagers);Q.update(2.5,4.5,p,env.Villagers);Q.update(4,8.5,p,env.Villagers);
 assert.equal(Q.getState(),'countdown_hide');
}
// QA-01: transform must be identical before/after every HUD & interior draw, even during shake or shattered furniture states.
{
 const e=questEnv();
 e.T.drawSleeping(e.canvas.ctx,548,160,1.5);
 assert.equal(e.canvas.stackDepth,0);
 e.H.enter(e.p);e.H.drawInterior(e.canvas.ctx,e.p,2.0);
 assert.equal(e.canvas.stackDepth,0);
 reachCountdown(e);e.Q.chooseHideSpot('bed',e.p);
 e.Q.update(2.5,11.0,e.p,e.env.Villagers);
 assert.equal(e.Q.isBedBroken(),true);
 assert.equal(e.Q.isJarBroken(),true);
 e.H.drawInterior(e.canvas.ctx,e.p,11.0);
 e.Q.drawInHome(e.canvas.ctx,11.0);
 assert.equal(e.canvas.stackDepth,0);
 for(let i=0;i<3;i++){
  e.Q.drawHUD(e.canvas.ctx,e.p,390,844,9+i,.016);
  assert.deepEqual(e.canvas.translation,{x:0,y:0});
  assert.equal(e.canvas.stackDepth,0);
 }
 console.log('PASS QA-01: no accumulated canvas translation or leaked save stack across sleeping, intact & shattered states');
}
// QA-02: the real doorway triggers the scripted death branch (not a scene exit).
{
 const e=questEnv();reachCountdown(e);e.p.x=352;e.p.y=412;
 assert.equal(e.H.canWalk(e.p.x,e.p.y),true);
 assert.equal(e.H.checkTransition(e.p,0,1,1),true);
 assert.equal(e.Q.getState(),'attack_door_early');
 assert.equal(e.H.inside,true);
 assert.equal(e.p.y,398);
 console.log('PASS QA-02: doorway routes to attack_door_early and stays in scene');
}
// QA-03: zero HP must be treated as zero rather than default 100.
{
 const e=questEnv();e.p.hp=0;
 e.T.handleClickHUD(30,30,390,e.p);e.T.drawHUD(e.canvas.ctx,e.p,390,844,1,.016);
 assert(e.canvas.logs.some(s=>s.includes('Khí Huyết: 0/100 HP')));
 assert(!e.canvas.logs.some(s=>s.includes('Khí Huyết: 100/100 HP')));
 console.log('PASS QA-03: HP 0/100 displayed correctly');
}
// QA-04: do not write an identical state twice; forced writes still work.
{
 const data=new Map();let writeCount=0,clock=0;
 const c={console,window:{},document:{},
  Date:{now:()=>++clock*1000},
  localStorage:{setItem(k,v){data.set(k,v);if(k==='lang_du_lam_game_save_v1')writeCount++},getItem(k){return data.get(k)||null},removeItem(k){data.delete(k)}},
  p:{x:221,y:314,hp:100,maxHp:100},Villagers:{day:1,minutes:480},TieuPhamHome:{inside:false},TieuPham:{outfitIdx:0}};
 vm.createContext(c);const G=vm.runInContext(source('game-save.js')+'\nGameSave;',c);
 assert.equal(G.save(true),true);assert.equal(writeCount,1);
 assert.equal(G.save(false),false);assert.equal(G.save(false),false);assert.equal(writeCount,1);
 c.p.hp=70;assert.equal(G.save(false),true);assert.equal(writeCount,2);
 assert.equal(G.save(true),true);assert.equal(writeCount,3);
 assert.equal(G.load(c.p)!==null,true);assert.equal(G.save(false),false);assert.equal(writeCount,3);
 console.log('PASS QA-04: stable save dedupe, forced save, load dedupe');
}
// QA-05: ruined house cannot be re-entered from outside, and player inside walks out through the front door.
{
 const data=new Map([['lang_du_lam_quest2_v1',JSON.stringify({version:1,state:'completed',completed:true,ruinsActive:true})]]);
 const e=questEnv(data);e.Q.init();assert.equal(e.Q.isVillageRuined(),true);
 e.p.x=221;e.p.y=296;
 assert.equal(e.H.checkTransition(e.p,0,-1,1),false);
 assert.equal(e.H.inside,false);
 e.H.enter(e.p);assert.equal(e.Q.restoreAfterLoad(e.p),'completed');
 assert.equal(e.H.inside,true,'player is not auto-teleported outside');
 e.p.x=352;e.p.y=416;
 assert.equal(e.H.checkTransition(e.p,0,1,1),true,'player walks out front door to village map');
 assert.equal(e.H.inside,false);assert.deepEqual([e.p.x,e.p.y],[221,314]);
 const epilogue=questEnv(new Map([['lang_du_lam_quest2_v1',JSON.stringify({version:1,state:'ruins_explore',completed:false,ruinsActive:true})]]));
 epilogue.Q.init();epilogue.H.enter(epilogue.p);
 assert.equal(epilogue.Q.restoreAfterLoad(epilogue.p),'victory');
 assert.equal(epilogue.H.inside,true,'player stays inside house until walking out');
 epilogue.p.x=352;epilogue.p.y=416;
 assert.equal(epilogue.H.checkTransition(epilogue.p,0,1,1),true);
 assert.equal(epilogue.H.inside,false);
 console.log('PASS QA-05: no intact home re-entry after ruins, and player walks out of house manually');
}
// QA-06: physically-clamped dt at low FPS must not inflate the survival deadline.
for(const fps of [15,20,30,60]){
 const e=questEnv();reachCountdown(e);
 const dtPhysics=Math.min(1/fps,.035),dtReal=1/fps;
 for(let frame=0;frame<Math.round(10*fps)+2 && e.Q.getState()==='countdown_hide';frame++){
  e.Q.update(dtPhysics,frame/fps,e.p,e.env.Villagers,dtReal);
 }
 assert.equal(e.Q.getState(),'attack_timeout',`at ${fps} FPS`);
 console.log(`PASS QA-06: 10-second deadline at ${fps} FPS`);
}
// QA-07: ruined villagers must stop movement & talking, keep in-game clock and memorial.
{
 const nodes=new Map(),keys=[];
 const doc={getElementById(id){if(!nodes.has(id))nodes.set(id,{hidden:true,style:{},textContent:'',innerHTML:'',onclick:null});return nodes.get(id)},addEventListener(){} };
 const env={console,document:doc,window:{},addEventListener(type,handler){keys.push(type)},
  Collision:{polygons:[],canWalk(){return true}},
  Quest2:{isVillageRuined(){return true},isWorldTimeFrozen(){return false}}};
 vm.createContext(env);
 vm.runInContext(source('npcs.js'),env);
 const V=vm.runInContext('Villagers',env);V.init();
 const first=V.list[0],oldX=first.x,oldY=first.y,oldDay=V.day,oldTime=V.minutes;
 V.update(1,2,{x:oldX,y:oldY,hp:100});
 assert.equal(V.minutes,oldTime+2);assert.equal(V.day,oldDay);
 assert.equal(first.x,oldX);assert.equal(first.y,oldY);
 assert.equal(V.nearest,null);
 assert.equal(V.talk({x:oldX,y:oldY,hp:100}),false);
 assert.equal(nodes.get('people').textContent,'Người xưa');
 nodes.get('people').onclick();
 assert.equal(nodes.get('dialog').hidden,false);
 assert(nodes.get('dialog-title').textContent.includes('Người xưa'));
 assert(nodes.get('dialog-body').textContent.includes('phế tích'));
 assert(nodes.get('clock').textContent.length>0,'world clock continues updating');
 console.log('PASS QA-07: NPC activity halted after ruins, memorial shown, time continues');
}
// QA-08: uploaded interior furniture WebP sprites replace old code-drawn furniture.
{
 const homeCode = source('tieu-pham-home.js');
 assert(!homeCode.includes('drawHangerShirt'), 'old procedural clothes hanger function must be removed');
 assert(!homeCode.includes('drawFoldedClothes'), 'old procedural folded clothes function must be removed');
 const requiredFiles = [
  'sap_quan_ao/sap_quan_ao_nhe.webp',
  'bep_lo/bep_lo.webp',
  'ban_va_nen/ban_go.webp',
  ...Array.from({length:8}, (_,i)=>`ban_va_nen/nen_0${i+1}.webp`)
 ];
 for (const f of requiredFiles) {
  assert(fs.existsSync(path.join(root, f)), `missing furniture sprite in public/game/${f}`);
 }
 console.log('PASS QA-08: uploaded furniture WebP sprites (sap_quan_ao, bep_lo, ban_go + 8 candle frames) verified');
}
// QA-09: hide under bed, inside wardrobe, and inside water jar when no quest is active AND during Quest 2 without standing still.
{
 const e = questEnv();
 let drawCount = 0;
 const origDraw = e.T.draw;
 e.T.draw = function(...args) { drawCount++; return origDraw.apply(this, args); };

 // 1) No quest active (Quest2 is locked/ready_to_rest not active):
 e.Q.resetState();
 assert.equal(e.Q.getState(), 'locked');
 e.H.enter(e.p);

 // Hide in wardrobe via interact near wardrobe (x=129, y=206)
 e.p.x = 129; e.p.y = 206;
 e.H.updateInterior(e.p, 0.016, false);
 assert.equal(e.H.nearProp?.id, 'wardrobe');
 assert.equal(e.H.interact(e.p), true);
 assert.equal(e.H.pose, 'hiding_wardrobe');
 drawCount = 0;
 e.H.drawInterior(e.canvas.ctx, e.p, 1.0);
 assert.equal(drawCount, 0, 'player sprite must be hidden inside wardrobe, not standing still');
 // Holding movement from before hiding must not pop player out prematurely
 e.H.updateInterior(e.p, 0.5, true);
 assert.equal(e.H.pose, 'hiding_wardrobe', 'holding movement key during hide entry must not eject player');
 // Releasing movement then moving exits wardrobe to walkable tile
 e.H.updateInterior(e.p, 0.016, false);
 e.H.updateInterior(e.p, 0.016, true);
 assert.equal(e.H.pose, 'none');
 assert.equal(e.H.canWalk(e.p.x, e.p.y), true);

 // Hide and sleep are now two separate bed controls (x=532, y=232).
 e.p.x = 532; e.p.y = 232;
 e.H.updateInterior(e.p, 0.3, false);
 assert.equal(e.H.nearProp?.id, 'bed');
 assert.equal(e.nodes.get('bed-hide').hidden, false, 'secondary NÚP GẦM button is visible near intact bed');
 assert.equal(e.H.interactBedHide(e.p), true);
 assert.equal(e.H.pose, 'hiding_bed');
 drawCount = 0;
 e.H.drawInterior(e.canvas.ctx, e.p, 1.5);
 assert.equal(drawCount, 0, 'player sprite must be hidden under bed, not standing still');
 assert.equal(e.H.interact(e.p), true, 'pressing main action again exits from under bed');
 assert.equal(e.H.pose, 'none');
 assert.equal(e.H.canWalk(e.p.x, e.p.y), true);
 e.H.updateInterior(e.p, .3, false);
 const dayBeforeSleep=e.env.Villagers.day;
 assert.equal(e.H.interact(e.p), true, 'main button must sleep, NOT hide under the bed');
 assert.equal(e.H.pose, 'sleeping');
 e.H.updateInterior(e.p, .7, false);
 assert.equal(e.env.Villagers.day, dayBeforeSleep+1, 'regular sleeping advances exactly one day');
 e.H.updateInterior(e.p, .7, false);
 assert.equal(e.H.pose, 'none', 'sleep automatically wakes into a walkable location');
 assert.equal(e.H.canWalk(e.p.x, e.p.y), true);

 // Hide in water jar via canvas click and via interact
 assert.equal(e.H.handleCanvasClick(596, 381, e.p), true);
 assert.equal(e.H.pose, 'hiding_jar');
 drawCount = 0;
 e.H.drawInterior(e.canvas.ctx, e.p, 2.0);
 assert.equal(drawCount, 0, 'player sprite must be hidden inside water jar, not standing still');
 assert.equal(e.H.handleCanvasClick(596, 381, e.p), true);
 assert.equal(e.H.pose, 'none');
 assert.equal(e.H.canWalk(e.p.x, e.p.y), true);

 // 2) Quest 2 early hide during midnight_wake / window_shadow and full hiding during attack_wardrobe / attack_bed:
 e.Q.init();
 assert.equal(e.Q.getState(), 'ready_to_rest');
 e.H.sleepInBed(e.p);
 e.Q.update(2.0, 2.0, e.p, e.env.Villagers); // transitions to midnight_wake
 assert.equal(e.Q.getState(), 'midnight_wake');
 e.p.x = 129; e.p.y = 206;
 assert.equal(e.H.interact(e.p), true, 'pressing hide during midnight_wake must work immediately');
 assert.equal(e.Q.getState(), 'attack_wardrobe');
 e.Q.update(3.5, 5.5, e.p, e.env.Villagers); // cinematicSubStep = 3 (wardrobe broken, first hit)
 drawCount = 0;
 e.H.drawInterior(e.canvas.ctx, e.p, 5.5);
 assert.equal(drawCount, 0, 'player must not pop out standing still during attack_wardrobe');
 // Night survival mode is still entirely controlled by Quest2.
 const night=questEnv();reachCountdown(night);
 night.p.x=532;night.p.y=232;
 night.H.updateInterior(night.p,.016,false);
 assert.equal(night.nodes.get('bed-hide').hidden,true,'separate bed-hide control must disappear during survival countdown');
 assert.equal(night.H.interactBedHide(night.p),false,'bed shortcut must not bypass the Quest2 choice');
 assert.equal(night.H.interact(night.p),true,'main interaction still chooses hiding place during survival');
 assert.equal(night.Q.getState(),'attack_bed');
 console.log('PASS QA-09: bed sleep & hide are independent; normal hide sprites and Quest2 survival choices remain functional');
}
console.log('ALL 9 QA FIXES PASSED');
