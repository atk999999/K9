const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(stored = null, playError = null) {
  let resolveResume;
  let playCalls = 0;
  let context;
  const listeners = {};
  const storage = new Map();
  if (stored) storage.set('lang_du_lam_bgm_state', stored);
  const param = () => ({value: 1, setValueAtTime(v){this.value=v;}, linearRampToValueAtTime(v){this.value=v;}, exponentialRampToValueAtTime(v){this.value=v;}});
  const node = () => ({gain:param(), frequency:param(), Q:param(), connect(){}, disconnect(){}, start(){}, stop(){}});
  class AudioCtx {
    constructor(){this.state='suspended';this.currentTime=1;this.sampleRate=44100;this.destination=node();context=this;}
    resume(){return new Promise(resolve => { resolveResume=()=>{this.state='running';resolve();}; });}
    createGain(){return node();} createOscillator(){return node();}
    createBiquadFilter(){return node();} createDynamicsCompressor(){let x=node();['threshold','knee','ratio','attack','release'].forEach(k=>x[k]=param());return x;}
    createBuffer(){return {getChannelData(){return new Float32Array(16)}};}
    createBufferSource(){return node();} createMediaElementSource(){return node();}
  }
  let audio;
  class FakeAudio {
    constructor(){this.events={};this.src='';this.volume=1;this.paused=true; audio=this;}
    addEventListener(name,fn){(this.events[name] ||= []).push(fn);}
    fire(name){for(const fn of (this.events[name]||[]))fn({type:name});}
    load(){}
    removeAttribute(name){if(name==='src')this.src='';}
    play(){playCalls++;if(playError){return Promise.reject(Object.assign(new Error('Audio blocked'),{name:playError}));}this.paused=false;this.fire('playing');return Promise.resolve();}
    pause(){this.paused=true;this.fire('pause');}
  }
  const label = {textContent:''}; const classes=new Set();
  const button={onclick:null,classList:{add(k){classes.add(k);},remove(k){classes.delete(k);},contains(k){return classes.has(k)}},querySelector(sel){return sel==='.music-text'?label:null},setAttribute(){}};
  const sandbox={Audio:FakeAudio,window:{AudioContext:AudioCtx,addEventListener(name,fn){(listeners[name] ||= []).push(fn);}},document:{getElementById(id){return id==='music-btn'?button:null},addEventListener(){}},localStorage:{getItem(k){return storage.get(k)||null;},setItem(k,v){storage.set(k,v);}},setTimeout,clearTimeout,console,Date};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('public/game/music.js','utf8')+';this.Music=VillageMusic;',sandbox);
  return {Music:sandbox.Music, audio:()=>audio, context:()=>context, resolve:()=>resolveResume?.(), plays:()=>playCalls, label:()=>label.textContent, stored:()=>storage.get('lang_du_lam_bgm_state'),button,fireGesture:()=>listeners.pointerdown.forEach(fn=>fn({type:'pointerdown'}))};
}

(async()=>{
  {
    const s=setup();s.Music.init();
    const promise=s.Music.start();
    assert.equal(s.plays(),1,'audio.play must be called before the asynchronous resume completes');
    assert.equal(s.context().state,'suspended');
    s.resolve();await promise;
    assert.equal(s.Music.isFilePlaying,true);
    assert.equal(s.label(),'Nhạc: Bật');
    s.Music.pause();console.log('PASS AUDIO-01: start audio in same mobile gesture before await');
  }
  {
    const s=setup();s.Music.init();s.audio().fire('error');
    assert(s.audio().src.endsWith('.mp3'),'OGG error must load MP3 fallback');
    s.audio().fire('canplay');
    const promise=s.Music.start();s.resolve();await promise;
    assert.equal(s.Music.isFilePlaying,true,'MP3 fallback should start after canplay');
    s.Music.pause();console.log('PASS AUDIO-02: OGG error switches to MP3 and plays');
  }
  {
    const s=setup('muted');s.Music.init();
    assert.equal(s.Music.isMuted,true);
    s.button.onclick({stopPropagation(){}});
    assert.equal(s.stored(),'unmuted','unmute click must persist correct storage');
    assert.equal(s.plays(),1);
    s.resolve();await new Promise(setImmediate);
    assert.equal(s.Music.isFilePlaying,true);
    s.Music.pause();console.log('PASS AUDIO-03: user unmute works and persists');
  }
  {
    const s=setup(null,'NotAllowedError');s.Music.init();
    const promise=s.Music.start();s.resolve();await promise;
    assert.equal(s.Music.isFilePlaying,false,'blocked media must not claim file playing');
    assert.equal(s.label(),'Nhạc: Bật','synth fallback plays if AudioContext is available');
    s.Music.pause();console.log('PASS AUDIO-04: denied HTML audio triggers synthesized fallback');
  }
  {
    const s=setup(null,'NotSupportedError');s.Music.init();
    const promise=s.Music.start();s.resolve();await promise;
    assert(s.audio().src.endsWith('.mp3') || s.audio().src==='', 'unsupported OGG must attempt MP3 fallback');
    assert(s.plays()>=2,'fallback must attempt play');
    s.Music.pause();console.log('PASS AUDIO-05: play() NotSupportedError tries alternate codec');
  }
  {
    const s=setup();s.Music.init();const started=s.Music.start();s.resolve();await started;
    assert.equal(s.plays(),1);
    s.audio().fire('error');
    assert(s.audio().src.endsWith('.mp3'));
    s.audio().fire('canplay');
    await Promise.resolve();
    assert.equal(s.plays(),2,'MP3 must automatically resume after OGG playback fails');
    assert.equal(s.Music.isFilePlaying,true);
    s.Music.pause();console.log('PASS AUDIO-06: runtime OGG playback error auto starts MP3 fallback');
  }
  {
    const s=setup(null,'NotAllowedError');s.Music.init();const started=s.Music.start();s.resolve();await started;
    const blockedCount=s.plays();
    s.audio().fire('canplay');
    assert.equal(s.plays(),blockedCount,'canplay must not loop play() after autoplay was blocked');
    s.fireGesture();
    await new Promise(setImmediate);
    assert(s.plays()>blockedCount,'new user gesture should retry blocked playback');
    s.Music.pause();console.log('PASS AUDIO-07: permission error waits for gesture rather than retry loop');
  }
  {
    const s=setup();s.Music.init();const started=s.Music.start();s.resolve();await started;
    assert.equal(s.audio().src,'01_Lang_Du_Lam_Mot_Ngay_Binh_Yen.ogg');
    s.Music.setSceneMode('raid_night');
    assert.equal(s.Music.isRaidNightMode,true);
    assert.equal(s.audio().src,'Nhac_Dem_Liep_Ma.ogg','Liệp Ma night mode must switch BGM to Nhac_Dem_Liep_Ma.ogg');
    s.Music.setSceneMode('ruins');
    assert.equal(s.Music.isRuinsMorningMode,true);
    assert.equal(s.audio().src,'Loi_Hen_Cat_10s_Can_Bang.ogg','Ruined village morning mode must switch BGM to Loi_Hen_Cat_10s_Can_Bang.ogg');
    s.Music.setSceneMode('peaceful');
    assert.equal(s.Music.isRaidNightMode,false);
    assert.equal(s.Music.isRuinsMorningMode,false);
    assert.equal(s.audio().src,'01_Lang_Du_Lam_Mot_Ngay_Binh_Yen.ogg','Peaceful mode must restore peaceful BGM');
    s.Music.pause();console.log('PASS AUDIO-08: Liệp Ma night mode and ruined village morning mode switch BGM tracks accurately');
  }
  console.log('ALL AUDIO REGRESSIONS PASSED');
})().catch(err=>{console.error(err);process.exitCode=1;});
