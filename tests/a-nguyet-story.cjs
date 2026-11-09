'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const saved=new Map();
const storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
let stageQ1='not_started', stageQ2='locked',ruined=false,chat=false,current=null;
const npc={x:872,y:700,dir:'right',hidden:false, walk:0,
  place(x,y){this.x=x;this.y=y;this.walk=0;},stop(){this.walk=0;},
  moveTo(x,y,dt,t,speed){let dx=x-this.x,dy=y-this.y,d=Math.hypot(dx,dy);let n=Math.min(speed*dt,d);this.x+=dx/d*n||0;this.y+=dy/d*n||0;this.walk=t*10;return Math.hypot(x-this.x,y-this.y)<16;}};
const savedMessages=[];
const Q1={getState:()=>stageQ1,isDialogueActive:()=>chat,showToast:s=>savedMessages.push(s),
  startDialogue(script){current=script;chat=true;},
  closeDialogue(){chat=false;current=null;}};
const Q2={getState:()=>stageQ2,isVillageRuined:()=>ruined};
const player={x:684,y:554};
const mockWeather={kind:'rain',rainIntensity:0.9,stormIntensity:0,snowIntensity:0,clearRain(){this.kind='sun';this.rainIntensity=0;this.stormIntensity=0;this.snowIntensity=0;}};
const ctx={ANguyet:npc,Quest1:Q1,Quest2:Q2,Villagers:{day:3,minutes:16*60},Weather:mockWeather,
  TieuPhamHome:{inside:false},GameSave:{save(){}},
  localStorage:storage,console,Math};
vm.createContext(ctx);const script=fs.readFileSync('public/game/a-nguyet-story.js','utf8');
vm.runInContext(script,ctx);vm.runInContext('this.story=ANguyetStory',ctx);
let S=ctx.story;S.init();S.update(.1,1,player);assert.equal(S.getStage(),'locked');
assert.equal(S.isWeatherProtected(),false);
stageQ1='completed';chat=true;S.update(.1,1,player);
assert.equal(S.getStage(),'locked','must let chief finish his final consolation');
chat=false;S.update(.1,1,player);assert.equal(S.getStage(),'seeking');
assert.equal(S.isWeatherProtected(),true,'weather must be protected while A Nguyet story is active');
assert.equal(mockWeather.kind,'sun','rain must be cleared immediately when A Nguyet story begins');
assert.equal(mockWeather.rainIntensity,0);
assert(!chat,'first move should not forcibly start dialogue from far away');
for(let i=0;i<80&&!chat;i++)S.update(.2,2+i*.2,player);
assert(chat,'A Nguyet should approach player automatically');
assert.equal(S.getStage(),'invitation');
assert(current.some(o=>o.speaker==='A Nguyệt'&&o.avatar==='A_Nguyet_Avatar_Duoi_10KB.webp'));
let opts=current[current.length-1].choices;
assert.equal(opts.length,3);opts[0].onSelect();
assert.equal(S.getStage(),'escort');assert(!chat);
ctx.Villagers.minutes=9*60; // Giả lập vừa khảo nghiệm xong lúc 09:00 sáng
// Follow her at 100px distance to the existing east-village flower beds.
for(let i=0;i<300&&S.getStage()!=='garden';i++){
  player.x=npc.x-55;player.y=npc.y+18;
  S.update(.15,20+i*.15,player);
  if(S.getStage()==='waiting'){player.x=2400;player.y=730;S.update(.15,20+i*.15,player);}
}
assert.equal(S.getStage(),'garden','garden scene should trigger only when both arrive');
assert(ctx.Villagers.minutes>=18*60,'time must fast-forward to evening (>= 18:00) upon reaching the garden');
let fireflyDraws=0;
const mockG={save(){},restore(){},fillRect(){fireflyDraws++;},createRadialGradient(){return{addColorStop(){}};}};
S.drawWorld(mockG,25);
assert(fireflyDraws>=80,'abundant garden fireflies must render in the flower garden at evening');
assert(chat);
const romanceOpts=current[current.length-1].choices;
assert.equal(romanceOpts.length,3);
romanceOpts[1].onSelect();
assert(chat); assert(current.some(o=>o.text.includes('chỉ đỏ')));
const final=current[current.length-1];assert.equal(typeof final.onFinish,'function');final.onFinish();
assert.equal(S.hasBracelet(),true);assert.equal(S.getData().affection,3);assert.equal(S.getStage(),'farewell');
assert(saved.get('lang_du_lam_a_nguyet_story_v1').includes('hasBracelet'));
S.saveState();const x=npc.x,y=npc.y;
// Reload restores red thread, current NPC coordinates, and story continuation.
vm.runInContext(script.replace('const ANguyetStory =','const ReloadedStory ='),ctx);
vm.runInContext('this.reloaded=ReloadedStory',ctx);const reload=ctx.reloaded;
npc.place(872,700);reload.init();
assert(Math.abs(npc.x-x)<.2&&Math.abs(npc.y-y)<.2,'reload must not teleport NPC back to start');
assert(reload.hasBracelet());
// Night remains governed by Quest2 and does not destroy keepsake.
ruined=true;stageQ2='ruins_explore';chat=false;player.x=2398;player.y=730;
reload.update(.1,300,player);assert.equal(reload.getStage(),'clue_found');
assert.equal(reload.getData().clueFound,true);assert(chat);
assert(current.some(line=>line.text.includes('còn sống hay không')));
current[current.length-1].onFinish();assert(reload.hasBracelet());
// Did not go to the garden -> still possible to trigger original 00:00 quest.
ruined=false;stageQ2='ready_to_rest';stageQ1='completed';S.resetState();
S.update(.1,400,{x:0,y:0});stageQ2='midnight_wake';S.update(.1,401,{x:0,y:0});
assert.equal(S.getStage(),'missed','sleeping without meeting must remain a valid branch');
console.log('PASS A NGUYET STORY: chief handoff, approach, 3 choices, escort, garden romance, keepsake, reload, ruined ribbon, optional skip.');
