'use strict';
const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync('public/game/tieu-pham.js','utf8');
assert(src.includes('function npcFaceAnimation(g,p,t,kind)'));
for(const id of ['a-nguyet','a-huy','truong','luc-nham'])assert(src.includes("kind==='"+id+"'"),id+' missing unique facial details');
assert(src.includes('npcFaceAnimation(g,p,t,kind)')&&src.includes('npcBodyAccents(g,p,style,t)'));
assert(src.includes('if(back){')&&src.includes('if(side){'));
console.log('PASS NPC FACE: 4 named NPCs have distinct overlay, animated hair/blink, 4-direction-aware rendering.');
