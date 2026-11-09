'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=name=>fs.readFileSync(path.join(__dirname,'../public/game',name),'utf8');
function makeEnv(seed=new Map()){
  const dom=new Map();
  const ctx=new Proxy({measureText:()=>({width:80})},{get:(o,k)=>k in o?o[k]:()=>{}});
  const env={console,Math,Date,JSON,Image:class{set src(value){}},Character:{},window:{addEventListener(){}},
    document:{addEventListener(){},createElement(){return {width:0,height:0,getContext:()=>ctx,style:{}}},getElementById(id){if(!dom.has(id))dom.set(id,{style:{},textContent:'',innerHTML:'',hidden:true});return dom.get(id)}},
    localStorage:{getItem(k){return seed.get(k)||null},setItem(k,v){seed.set(k,String(v))},removeItem(k){seed.delete(k)}},
    setTimeout(){return 1},clearTimeout(){},
    Quest1:{isCinematicActive(){return false},getState(){return 'locked'}},
    Quest2:{isVillageRuined(){return false},getState(){return 'locked'}},
    Villagers:{day:3,minutes:480,sleepToNextDay(){this.day++;this.minutes=360;return this.day}},
    VillageWork:{grain:36,homeGrain:12},TieuPham:{outfitIdx:0,applyOutfit(){}},
    p:{x:221,y:314,hp:100,maxHp:100,walk:0,dir:'down'}
  };
  vm.createContext(env);
  for(const f of ['collision.js','tieu-pham.js','tieu-pham-home.js','game-save.js'])vm.runInContext(source(f),env);
  return {env,seed,H:vm.runInContext('TieuPhamHome',env),G:vm.runInContext('GameSave',env),C:vm.runInContext('Collision',env)};
}
function saveAndLoad(pose){
  const a=makeEnv();a.H.enter(a.env.p);
  if(pose==='sleeping')a.H.sleepInBed(a.env.p);
  else if(pose==='sitting')a.H.sitAtTable(a.env.p);
  assert.equal(a.H.pose,pose);
  assert.equal(a.G.save(true,a.env.p),true);
  let saved=JSON.parse(a.seed.get(a.G.SAVE_KEY));
  assert.equal(saved.homePose,pose);
  const b=makeEnv(a.seed);const prevDay=b.env.Villagers.day;
  b.G.load(b.env.p);
  assert.equal(b.H.inside,true);
  assert.equal(b.H.pose,'none');
  assert.equal(b.H.canWalk(b.env.p.x,b.env.p.y),true);
  assert.notDeepEqual([b.env.p.x,b.env.p.y],[saved.player.x,saved.player.y]);
  const initial=[b.env.p.x,b.env.p.y];
  assert(b.H.canWalk(initial[0]+5,initial[1]),'can move right');
  assert(b.H.canWalk(initial[0],initial[1]+5),'can move down');
  assert.equal(b.env.Villagers.day,prevDay,'loading cannot silently advance day');
  console.log('PASS FIN-01 new saved pose '+pose+': safe walkable resume');
  // Existing real-world saves do not contain homePose: they also must be fixed.
  delete saved.homePose;
  a.seed.set(a.G.SAVE_KEY,JSON.stringify(saved));
  const legacy=makeEnv(a.seed);legacy.G.load(legacy.env.p);
  assert.equal(legacy.H.canWalk(legacy.env.p.x,legacy.env.p.y),true);
  assert.equal(legacy.H.pose,'none');
  console.log('PASS FIN-01 legacy pose '+pose+': safe migration');
}
saveAndLoad('sleeping');saveAndLoad('sitting');
{
  const a=makeEnv();a.H.enter(a.env.p);
  // A corrupted/old game save in another solid prop is also repaired.
  a.env.p.x=596;a.env.p.y=381;a.G.save(true,a.env.p);
  const b=makeEnv(a.seed);b.G.load(b.env.p);
  assert(b.H.canWalk(b.env.p.x,b.env.p.y));
  console.log('PASS FIN-01 miscellaneous furniture: nearest clear interior spawn');
}
{
  const a=makeEnv(),c=a.C;
  assert.equal(c.canWalk(200,700,false),false,'intact crop fencing remains solid');
  assert.equal(c.canWalk(200,700,true),true,'ruined field must be passable');
  assert.equal(c.canWalk(568,302,false),false,'intact tree canopy collision retained');
  assert.equal(c.canWalk(568,302,true),true,'gone canopy cannot act as invisible wall');
  assert.equal(c.canWalk(240,240,true),false,'visibly standing ruined hut remains solid');
  assert.equal(c.canWalk(680,168,true),false,'chief house ruins remain solid');
  assert.equal(c.canWalk(1400,360,true),false,'river still blocks walking');
  assert.equal(c.canWalk(1320,510,true),true,'bridge remains passable');
  assert.equal(c.canWalk(668,509,true),false,'visible central stone well remains solid');
  assert.equal(c.canWalk(540,340,true),false,'visible fallen timber remains solid');
  a.env.Quest2.isVillageRuined=()=>true;
  assert.equal(c.canWalk(200,700),true,'world phase auto switching');
  a.env.Quest2.isVillageRuined=()=>false;
  assert.equal(c.canWalk(200,700),false,'switching back cannot corrupt intact map collision');
  console.log('PASS FIN-03 phase-dependent ruins/normal obstacles and protected river/bridge');
  // Dynamic polygons registered by village modules must not resurrect invisible props.
  c.polygons.push({name:'Lò rèn',points:[[2200,520],[2260,520],[2260,580],[2200,580]]});
  assert.equal(c.canWalk(2230,555,false),false);
  assert.equal(c.canWalk(2230,555,true),true);
  c.polygons.push({name:'Nhà xóm đông',points:[[1810,670],[1910,670],[1910,790],[1810,790]]});
  assert.equal(c.canWalk(1850,730,true),false);
  console.log('PASS FIN-03 late-registered props ignored in ruins, visible houses retained');
}
// Flood fill on a representative set of roads to catch an accidentally sealed map.
{
 const {C}=makeEnv();
 const STEP=16,COLS=192,ROWS=83,mark=new Uint8Array(COLS*ROWS),q=new Int32Array(COLS*ROWS);
 const id=(x,y)=>Math.floor(y/STEP)*COLS+Math.floor(x/STEP);
 const at=i=>[i%COLS*STEP+8,Math.floor(i/COLS)*STEP+8];
 let start=id(220,314),head=0,tail=0;q[tail++]=start;mark[start]=1;
 while(head<tail){const t=q[head++],x=t%COLS,y=Math.floor(t/COLS);
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=COLS||yy>=ROWS)continue;
   const k=yy*COLS+xx;if(mark[k])continue;
   const [cx,cy]=at(k);if(!C.canWalk(cx,cy,true))continue;
   mark[k]=1;q[tail++]=k;
  }
 }
 for(const [name,x,y]of [['central square',680,570],['bridge',1320,510],['east village',1840,510],['south village',680,1190]]){
  const target=id(x,y);if(!mark[target]){
   // A nearby tile is acceptable when a point lies precisely on a prop.
   let reached=false;for(let r=1;r<=3&&!reached;r++)for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++){
    const xx=Math.floor(x/STEP)+dx,yy=Math.floor(y/STEP)+dy;
    if(xx>=0&&yy>=0&&xx<COLS&&yy<ROWS&&mark[yy*COLS+xx])reached=true;
   }
   assert(reached,'ruins access disconnected: '+name);
  }
 }
 console.log('PASS FIN-03 representative ruins roads mutually reachable');
}
console.log('ALL FIN-01 / FIN-03 REGRESSIONS PASSED');
