'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..');
const f=fs.readFileSync(path.join(root,'public/game/village-raid-fx.js'),'utf8');
const fire=fs.readFileSync(path.join(root,'public/game/fire-fx.js'),'utf8');
const game=fs.readFileSync(path.join(root,'public/game/game.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/game/index.html'),'utf8');
const q=fs.readFileSync(path.join(root,'public/game/quest2.js'),'utf8');
let state='locked',ruined=false,drawCount=0,stack=0,deepest=0;
const canvas={
 save(){stack++;deepest=Math.max(stack,deepest);},
 restore(){stack--;assert(stack>=0,'negative canvas save stack')},
 createRadialGradient(){return {addColorStop(){}}},
 createLinearGradient(){return {addColorStop(){}}},
 beginPath(){},rect(){},clip(){},ellipse(...args){for(const a of args)assert(Number.isFinite(a));},
 fillRect(...args){for(const a of args)assert(Number.isFinite(a));drawCount++;},
 fill(){drawCount++;},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},translate(){},rotate(){}
};
const sandbox={Quest2:{getState:()=>state,isVillageRuined:()=>ruined},Math,Set,Image:class {set src(v){this.complete=false;this.naturalWidth=0;}}};
vm.createContext(sandbox);
vm.runInContext(fire+';'+f+';this.VillageRaidFX=VillageRaidFX;',sandbox);
const FX=sandbox.VillageRaidFX;
assert(!FX.isRaidActive(),'peace should have no fire');
assert(!FX.isRaidScene(),'peace should have no ruined map');
FX.drawGround(canvas);FX.drawWorld(canvas,1);FX.drawInterior(canvas,1);
assert.strictEqual(drawCount,0,'peace must draw no FX');
for(const st of ['midnight_wake','window_shadow','hiding_jar','chase_village','time_skip_dawn']){
 state=st;ruined=false;
 assert(FX.isRaidActive(),'fire absent in '+st);
 drawCount=0;
 FX.drawGround(canvas,{x:0,y:0,w:1500,h:1000});
 FX.drawWorld(canvas,123.5,{x:0,y:0,w:1500,h:1000});
 FX.drawInterior(canvas,123.5);
 assert(drawCount>20,'no visual effect in '+st);
 assert.strictEqual(stack,0,'unbalanced canvas stack in '+st);
}
state='time_skip_dawn';ruined=false;
sandbox.Villagers={minutes:360};
assert(FX.isRaidScene(),'dawn fade must still show ruined map');
assert(!FX.isRaidActive(),'fire must stop at 06:00 before the victory card');
drawCount=0;FX.drawWorld(canvas,5);FX.drawInterior(canvas,5);
assert.strictEqual(drawCount,0,'active flame visible after 06:00');
state='completed';ruined=true;drawCount=0;
assert(!FX.isRaidActive(),'fire still running after dawn');
FX.drawGround(canvas);FX.drawWorld(canvas,0);FX.drawInterior(canvas,0);
assert.strictEqual(drawCount,0,'dawn must have no fire or smoke');
state='chase_village';ruined=true;
assert(!FX.isRaidActive(),'ruinsActive overrides stale combat state');
state='chase_village';ruined=false;drawCount=0;
FX.drawWorld(canvas,1,{x:4000,y:4000,w:100,h:100});
assert.strictEqual(drawCount,0,'particles far outside camera should be skipped');
assert(html.includes('village-raid-fx.js?v=raid190-fire12'),'missing updated effect script inclusion');
assert(html.indexOf('village-raid-fx.js')<html.indexOf('game.js'),'effect script must load before main game');
assert(game.includes('if (ruinScene) ctx.drawImage(bgRuined, 0, 0, 3072, 1331)'), 'night and morning must share unified ruins map');
assert(game.includes('VillageRaidFX.isRaidScene()'),'dawn map can flash back to intact village');
assert(game.includes('raidFireActive'),'no distinction between night tint and 06:00 dawn');
assert(game.includes('VillageRaidFX.drawWorld(ctx,t/1000,raidViewport)'),'night particles not rendered on map');
assert(game.includes('if(raidFireActive)'), 'night tint not applied');
assert(q.includes('VillageRaidFX.drawInterior(ctx,timeSec)'), 'night glow in indoor window missing');
assert(fs.existsSync(path.join(root,'public/game/Lang_Du_Lam_Hoang_Tan.webp')),'original ruined map missing');
console.log('PASS RAID FX: night fire/smoke/embers/blood, dawn fire-off, far-camera culling, original map retained, balanced Canvas state.');
