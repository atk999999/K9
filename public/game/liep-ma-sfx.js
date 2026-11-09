'use strict';
/** Liệp Ma audio: local, low-size Ogg/MP3 clips with WebAudio fallback.
 * Starts only after a player has pressed 'BẮT ĐẦU'. Obeys global audio mute.
 * No network services, no autoplay loops, no sounds after daybreak.
 */
const LiepMaSFX = (() => {
  const BASE = 'liep-ma/sfx/';
  const NAMES = ['grr-near','grr-distant','sniff','ominous-rumble'];
  const volumes = {'grr-near':.66,'grr-distant':.38,'sniff':.32,'ominous-rumble':.20};
  const delays = {'grr-near':.55,'grr-distant':1.25,'sniff':.28,'ominous-rumble':2.2};
  const clips = Object.create(null);
  const recent = Object.create(null);
  let enabled = false;
  let initialized = false;
  let codec = '.mp3';
  function isMuted(){return typeof VillageMusic !== 'undefined' && !!VillageMusic.isMuted;}
  function init(){
    if(initialized)return;
    if(typeof Audio === 'undefined') return;
    try {
      const test = new Audio();
      if(test.canPlayType && test.canPlayType('audio/ogg; codecs="opus"') !== '') codec = '.ogg';
      for(const name of NAMES){
        const c=new Audio(BASE + name + codec);
        c.preload='auto'; c.loop=false; c.volume=volumes[name];
        clips[name]=c;
      }
      initialized = true;
    } catch(_) { /* fallback oscillator remains available */ }
  }
  // Called synchronously by the Start button: a user gesture authorizes future playback.
  function unlock(){ enabled=true; init(); }
  function fallback(kind, volume){
    try {
      const ac = typeof VillageMusic !== 'undefined' ? VillageMusic.audioCtx : null;
      if(!ac || ac.state!=='running')return;
      const now=ac.currentTime, osc=ac.createOscillator(), gain=ac.createGain();
      osc.type = kind==='sniff'?'triangle':'sawtooth';
      const low = kind==='grr-distant'?51:kind==='sniff'?170:69;
      osc.frequency.setValueAtTime(low,now);
      osc.frequency.linearRampToValueAtTime(low*.71,now+.38);
      gain.gain.setValueAtTime(.001,now);
      gain.gain.linearRampToValueAtTime(Math.min(.14,volume*.21),now+.09);
      gain.gain.exponentialRampToValueAtTime(.001,now+.60);
      osc.connect(gain);gain.connect(ac.destination);
      osc.start(now);osc.stop(now+.62);
    }catch(_){}
  }
  function play(kind='grr-near', factor=1){
    if(!enabled || isMuted() || !NAMES.includes(kind)) return false;
    // Audio timestamps use performance.now if available; this also works on phones offline.
    const ms=(typeof performance!=='undefined' && performance.now)?performance.now():Date.now();
    if(recent[kind]!==undefined && ms-recent[kind] < delays[kind]*1000)return false;
    recent[kind]=ms;
    init();
    const c=clips[kind],volume=Math.min(.95,Math.max(0,(volumes[kind]||.5)*factor));
    if(c){
      try {
        c.pause();c.currentTime=0;c.volume=volume;
        const promise=c.play();
        if(promise && promise.catch) promise.catch(()=>fallback(kind,volume));
        return true;
      } catch (_) { /* fall through */ }
    }
    fallback(kind,volume);
    return true;
  }
  function stop(){
    for(const c of Object.values(clips))try{c.pause();c.currentTime=0;}catch(_){}
  }
  return {init,unlock,play,stop, get enabled(){return enabled;}, get codec(){return codec;}};
})();
