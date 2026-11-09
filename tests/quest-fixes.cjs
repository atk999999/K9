'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.join(__dirname, '../public/game');
const text = name => fs.readFileSync(path.join(root, name), 'utf8');

function newEnvironment(seedStorage) {
  const storage = seedStorage || new Map();
  const dom = new Map();
  let appended = [];
  const ctx = new Proxy({measureText: () => ({width: 92})}, {get(obj, key) {
    if (key in obj) return obj[key];
    return () => ['createLinearGradient', 'createRadialGradient'].includes(key) ? {addColorStop(){}} : undefined;
  }});
  function node(){ return {hidden:true, style:{}, textContent:'', innerHTML:'', children:[],getContext:()=>ctx,appendChild(x){this.children.push(x);appended.push(x);return x;},setAttribute(){},addEventListener(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100}},focus(){}}; }
  const document={ getElementById(id){
    const existing=appended.find(x=>x.id===id);
    if(existing) return existing;
    if(id==='quest2-victory-modal'||id==='quest2-death-modal')return null;
    if(!dom.has(id))dom.set(id,node());return dom.get(id);
  },createElement:()=>node(),body:node()};
  const p={x:221,y:314,hp:100,maxHp:100,mp:0,walk:0,dir:'down'};
  const c={console,document,window:{},p,localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,String(v))},removeItem(k){storage.delete(k)}},
    Character:{},Image:class{constructor(){this.src=''}},setTimeout(){return 1},clearTimeout(){},setInterval(){},clearInterval(){},
    Villagers:{day:3,minutes:480,sleepToNextDay(){this.day++;this.minutes=360;return this.day}},Quest1:{getState(){return 'completed'}}};
  vm.createContext(c);
  const run = code => vm.runInContext(code,c);
  run(text('tieu-pham.js'));
  run(text('tieu-pham-home.js'));
  run(text('quest2-render.js'));
  run(text('quest2.js'));
  return {c,p,Quest2:run('Quest2'),Home:run('TieuPhamHome'),store:storage,dom,appended};
}

// Case Q2-02 / Q2-03: direct real TieuPhamHome (read-only pose) with nightly sleep.
{
  const {p,c,Quest2:Q,Home:H} = newEnvironment();
  Q.init();H.enter(p);H.sleepInBed(p);
  assert.equal(Q.getState(), 'sleeping_start');
  for(let i=0;i<47;i++) { Q.update(.035, i*.035, p, c.Villagers);H.updateInterior(p,.035,false); }
  assert.equal(Q.getState(),'midnight_wake');
  assert.equal(H.pose,'none');
  assert.equal(c.Villagers.day,3, 'quest sleep must not advance the ordinary sleep day');
  assert.equal(c.Villagers.minutes,0,'midnight time must be controlled by Quest2');
  assert.deepStrictEqual([p.x,p.y],[532,232]);
  console.log('PASS Q2-02/Q2-03: no pose setter exception, no accidental day advance');
}

// Case Q2-01/Q2-04/Q2-05: real reachable jar position and instant persistence.
{
  const {p,c,Quest2:Q,Home:H,store} = newEnvironment();
  Q.init();H.enter(p);H.sleepInBed(p);
  Q.update(2,2,p,c.Villagers);
  Q.update(2.5,4.5,p,c.Villagers);
  Q.update(4,8.5,p,c.Villagers);
  assert.equal(Q.getState(),'countdown_hide');
  p.x=566;p.y=352;
  assert.equal(H.canWalk(566,352),true,'jar edge needs to be reachable');
  Q.update(.035,9,p,c.Villagers);
  assert.equal(Q.getState(),'hiding_jar');
  assert.equal(JSON.parse(store.get('lang_du_lam_quest2_v1')).state,'hiding_jar');
  assert.equal(H.canWalk(p.x,p.y),false,'jar itself is a solid obstacle');
  Q.update(18.9,30.7,p,c.Villagers);
  assert.equal(Q.getState(),'after_decision');
  p.walk=0;
  assert.equal(Q.handleMovementIntent(p),true,'movement input must exit from solid jar');
  assert.equal(Q.getState(),'chase_village');
  assert.equal(H.inside,true,'climbing out of jar keeps player inside house to walk out');
  assert.deepStrictEqual([p.x,p.y],[556,356]);
  // Walking through the front door transitions outside to the village map
  p.x=352;p.y=416;
  assert.equal(H.checkTransition(p,0,1,0.5),true,'walking to front door exits house to village map');
  assert.equal(H.inside,false,'player is now outside on the village map');
  assert.equal(JSON.parse(store.get('lang_du_lam_quest2_v1')).state,'chase_village');
  console.log('PASS Q2-01/Q2-04/Q2-05: jar trigger, save, climb out inside house, and walk out front door');
}

// Case Q2-06: victory completion modal is removed, player stays free without blocking popup.
{
  const store = new Map([['lang_du_lam_quest2_v1', JSON.stringify({version:1,state:'ruins_explore',completed:false,ruinsActive:true,survivedInJar:true})]]);
  const {p,Quest2:Q,appended} = newEnvironment(store);
  Q.init();
  assert.equal(Q.getState(),'ruins_explore');
  assert.equal(Q.restoreAfterLoad(p),'victory');
  const modal=appended.find(x=>x.id==='quest2-victory-modal');
  assert.equal(modal, undefined, 'victory completion modal must not be displayed');
  assert.equal(Q.isCompleted(), true);
  console.log('PASS Q2-06: victory completion modal removed as requested');
}

// Durable load contract: an interrupted chase replays the last safe checkpoint.
{
  const store = new Map([['lang_du_lam_quest2_v1', JSON.stringify({version:1,state:'chase_village',completed:false,ruinsActive:false,bedBroken:true,wallBroken:true,survivedInJar:true})]]);
  const {p,c,Quest2:Q,Home:H} = newEnvironment(store);
  Q.init();H.inside=false;
  p.x=2100;p.y=500;p.hp=30;
  assert.equal(Q.restoreAfterLoad(p),'midnight');
  assert.equal(Q.getState(),'midnight_wake');
  assert.equal(H.inside,true);
  assert.equal(H.pose,'none');
  assert.deepStrictEqual([p.x,p.y,p.hp],[532,232,100]);
  assert.equal(JSON.parse(store.get('lang_du_lam_quest2_v1')).state,'midnight_wake');
  console.log('PASS Q2-save: chase refresh resumes at 00:00 with 100 HP');
}

// Navigation, map and integration are verified against the actual wiring script.
{
  const game=text('game.js'), home=text('tieu-pham.js'), npc=text('npcs.js'), html=text('index.html');
  assert(game.includes('Quest2.update(dt,t/1000,p,Villagers,dtReal)'), 'must pass the real player to Quest2');
  assert(game.includes('Quest2.handleMovementIntent(p)'), 'joystick intent must reach Quest2');
  assert(game.includes('if(questNavigationLocked())return;'), 'fast travel must be blocked during chase');
  assert(npc.includes("Quest2.isNavigationLocked&&Quest2.isNavigationLocked()"), 'time controls must be blocked');
  assert(game.includes('if (ruinScene) ctx.drawImage(bgRuined, 0, 0, 3072, 1331)'), 'unified ruins map must be rendered at original world coordinates');
  assert(game.includes('VillageExpansion.draw(ctx);EastVillage.draw(ctx,t/1000)'), 'all extended regions must be drawn');
  assert(html.includes('ruins-extension.js'), 'ruins overlay must be loaded before game.js');
  assert(home.includes('wakeForQuest'), 'safe midnight pose reset must exist');
  console.log('PASS Q2-01/Q2-07/Q2-08: real player wiring, protected navigation and extended ruins');
}

// Case Q1-01: honor registration rather than forcing exam for all players on day 3.
{
  const rootScript=text('quest1.js');
  const doc={getElementById(){return null},createElement(){return {style:{},appendChild(){},setAttribute(){}}}};
  const store=new Map();
  const c={console,document:doc,window:{},Image:class{},setTimeout(){return 1},clearTimeout(){},setInterval(){},clearInterval(){},
    localStorage:{getItem(k){return store.get(k)||null},setItem(k,v){store.set(k,String(v))}},
    Villagers:{day:3,minutes:500,list:[]},AHuy:{hidden:false,takeScenePosition(){}},TieuPhamHome:{inside:true}};
  vm.createContext(c);
  vm.runInContext(text('quest1-data.js') + '\n' + text('quest1-render.js') + '\n' + rootScript,c);
  const Q=vm.runInContext('Quest1',c);
  for(const state of ['declined','considering','chief_approaching','not_started']){
    Q.resetState();Q.state=state;
    Q.update(.02,10,{x:215,y:300,hp:100},c.Villagers);
    assert.equal(Q.getState(),state,`must not force exam on ${state}`);
  }
  Q.resetState();Q.state='registered';Q.registeredDay=1;
  Q.update(.02,10,{x:215,y:300,hp:100},c.Villagers);
  assert.equal(Q.getState(),'selection_ready','registered on day 1 should progress by day 3');
  console.log('PASS Q1-01: decline/consider states retained; registered players progress on schedule');
}
console.log('ALL QUEST FIX REGRESSIONS PASSED');
