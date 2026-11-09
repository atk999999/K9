'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/game/ruins-ambient-fx.js'), 'utf8');
const fire = fs.readFileSync(path.join(root, 'public/game/fire-fx.js'), 'utf8');
const game = fs.readFileSync(path.join(root, 'public/game/game.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/game/index.html'), 'utf8');
let ruined = false, calls = 0, stack = 0;
const gradient = () => ({addColorStop(){}});
const ctx = {
  save(){stack++;}, restore(){stack--; assert(stack>=0);},
  translate(){}, scale(){}, beginPath(){}, arc(){}, ellipse(){calls++;},
  fill(){calls++;}, fillRect(){calls++;}, drawImage(){calls++;},
  moveTo(){}, quadraticCurveTo(){}, closePath(){},
  createRadialGradient: gradient, createLinearGradient: gradient
};
const fakeCanvas = () => ({width:0,height:0,getContext:()=>ctx});
const runtime = {Math,Image:class {set src(v){this.complete=false;this.naturalWidth=0;}}, Quest2: {isVillageRuined: () => ruined}, Villagers: {minutes: 900},
  Weather: {kind:'sun'}, document: {createElement:() => fakeCanvas()}};
vm.createContext(runtime);
vm.runInContext(fire+'\n'+source+'\nthis.RuinsAmbientFX=RuinsAmbientFX;', runtime);
const FX = runtime.RuinsAmbientFX;
assert(!FX.isActive(), 'before ruins no post-attack flames');
FX.drawGround(ctx); FX.drawWorld(ctx,10); FX.drawBloodCleanup(ctx);
assert.equal(calls,0);
ruined = true;
assert(FX.isActive());
assert(FX.init({naturalWidth:1536,naturalHeight:1024}), 'repair generated using in-game source map');
assert(FX.PATH_REPAIR.x < 220 && FX.PATH_REPAIR.y < 315, 'cover player-home walkway');
assert(FX.HOTSPOTS.length>=8, 'fires in several distant burned structures');
calls = 0;
FX.drawBloodCleanup(ctx); FX.drawGround(ctx,{x:0,y:0,w:1450,h:1000});
FX.drawWorld(ctx,5,{x:0,y:0,w:1450,h:1000});
assert(calls>50, 'no visible smoke/fire at 15:00');
assert.equal(stack,0, 'canvas state leak');
calls = 0;
FX.drawWorld(ctx,12,{x:4000,y:4000,w:100,h:100});
assert.equal(calls,0, 'offscreen culling');
runtime.Weather.kind='rain';
FX.drawWorld(ctx,17,{x:0,y:0,w:350,h:500});
assert.equal(stack,0, 'canvas state leak in rain');
assert(html.includes('ruins-ambient-fx.js') && html.indexOf('ruins-ambient-fx.js') < html.indexOf('game.js'), 'script order');
assert(game.includes('RuinsAmbientFX.init(bg)'), 'source terrain patch init');
assert(game.includes('RuinsAmbientFX.drawBloodCleanup(ctx)'), 'player-home blood removal is unused');
assert(game.includes('RuinsAmbientFX.drawGround(ctx, raidViewport)'), 'missing ember glow');
assert(game.includes('RuinsAmbientFX.drawWorld(ctx,t/1000,raidViewport)'), 'missing smoke/fire animation');
assert(game.includes('if (villageRuined && typeof RuinsAmbientFX'), 'only after ruined');
console.log('PASS: daytime fires, smoke, embers, rainy intensity, walkway repair and offscreen culling.');
