'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'public/game/liep-ma-sfx.js'),'utf8');
const game=fs.readFileSync(path.join(root,'public/game/game.js'),'utf8');
const q=fs.readFileSync(path.join(root,'public/game/quest2.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/game/index.html'),'utf8');
for(const name of ['grr-near','grr-distant','sniff','ominous-rumble']){
 for(const ext of ['ogg','mp3']){
  const file=path.join(root,'public/game/liep-ma/sfx',`${name}.${ext}`);
  assert(fs.existsSync(file),'missing sound file: '+file);
  assert(fs.statSync(file).size>1200,'empty or too small audio: '+file);
 }
}
assert(html.includes('<script src="liep-ma-sfx.js?v=monster189"></script>'));
assert(html.indexOf('liep-ma-sfx.js')<html.indexOf('quest2.js'));
assert(game.includes('LiepMaSFX.unlock()'),'start tap must unlock sound');
assert(q.includes("playMonsterGrowlSound('grr-distant'"),'midnight growl missing');
assert(q.includes("playMonsterGrowlSound('sniff'"),'sniff sound missing');
assert(q.includes("if(typeof LiepMaSFX !== 'undefined') LiepMaSFX.stop()"),'dawn must stop monster sounds');
assert(q.includes('const shadowW'),'monster lacks ground shadow');
let played=0,paused=0,volume=0,muted=false;
let current=0;
const mockClock={now:()=>current};
class MockAudio {
 constructor(src=''){this.src=src;this.currentTime=0;this.volume=0;this.preload='';}
 canPlayType(){return 'probably'}
 pause(){paused++}
 play(){played++;volume=this.volume;return Promise.resolve()}
}
const sandbox={Audio:MockAudio,Math,Object,performance:mockClock,Date,VillageMusic:{get isMuted(){return muted}},Promise};
vm.createContext(sandbox);
vm.runInContext(source+';this.LiepMaSFX=LiepMaSFX;',sandbox);
const S=sandbox.LiepMaSFX;
assert(!S.play('grr-near'),'must not autoplay before Start click');
S.unlock();
assert(S.codec==='.ogg');
assert(S.play('grr-near'));
assert(played===1 && volume>.1);
assert(!S.play('grr-near'),'cooldown should suppress duplicate growls');
current+=2000;muted=true;
assert(!S.play('grr-near'),'muted state must prevent sound');
assert(played===1);
muted=false;
assert(S.play('sniff'),'sniff absent');
assert(played===2);
S.stop();
assert(paused>=4,'stop must stop active clips');
console.log('PASS MONSTER SFX: valid audio assets, HTML load order, unlock, mute, cooldown, grr/sniff event bindings, dawn stop, sprite ground shadow.');
