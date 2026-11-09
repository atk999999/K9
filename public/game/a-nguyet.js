'use strict';
// A Nguyệt sử dụng body chung, đường đi (Villagers.route) và không can thiệp đội hình khảo nghiệm.
const ANguyet = (() => {
  const state = {name:'A Nguyệt', x:872, y:700, dir:'right', walk:0, hidden:false};
  let waypoints = [], destination = null, replanDelay = 0, stalled = 0;
  const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
  const q2Active = () => typeof Quest2 !== 'undefined' && Quest2.getState && !['locked','ready_to_rest'].includes(Quest2.getState());
  function place(x,y){
    state.x=x; state.y=y; state.walk=0;
    waypoints=[]; destination=null; replanDelay=0; stalled=0;
  }
  function stop(){waypoints=[]; destination=null; state.walk=0;}
  function moveTo(x,y,dt,t,speed=85){
    if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(dt))return false;
    const desired=[x,y], here=[state.x,state.y];
    if(dist(here,desired)<14){stop();return true;}
    replanDelay=Math.max(0,replanDelay-dt);
    if(!destination||dist(destination,desired)>42||(!waypoints.length)||replanDelay<=0){
      destination=desired; replanDelay=2.1;
      waypoints=(typeof Villagers!=='undefined'&&Villagers.route)?Villagers.route(here,desired):[];
    }
    if(!waypoints.length){state.walk=0;return false;}
    let budget=Math.max(0,speed*dt), moved=0;
    // Mỗi đoạn di chuyển vẫn phải vượt kiểm tra va chạm tại từng bước nhỏ.
    while(budget>.01&&waypoints.length){
      const wp=waypoints[0],dx=wp[0]-state.x,dy=wp[1]-state.y,length=Math.hypot(dx,dy);
      if(length<2){waypoints.shift();continue;}
      const amount=Math.min(budget,length,8),nx=state.x+dx/length*amount,ny=state.y+dy/length*amount;
      if(typeof Collision!=='undefined'&&!Collision.canWalk(nx,ny)){
        replanDelay=0;waypoints=[];break;
      }
      state.x=nx;state.y=ny;moved+=amount;budget-=amount;
      state.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
      if(amount>=length-.1)waypoints.shift();
    }
    state.walk=moved>.1?t*10:0;
    stalled=moved>.1?0:stalled+dt;
    if(stalled>2){replanDelay=0;stalled=0;}
    return dist([state.x,state.y],desired)<16;
  }
  function update(dt,t,player){
    const ruined=typeof Quest2!=='undefined'&&Quest2.isVillageRuined&&Quest2.isVillageRuined();
    const ceremony=typeof Quest1!=='undefined'&&Quest1.isCeremonyActive&&Quest1.isCeremonyActive();
    const h=typeof Villagers!=='undefined'?Villagers.minutes/60:12;
    const story=typeof ANguyetStory!=='undefined'?ANguyetStory.getStage():null;
    const eventActive=story&&['seeking','invitation','escort','ahead','waiting','garden','farewell'].includes(story);
    state.hidden=ruined||ceremony||q2Active()||(!eventActive&&(h<6||h>=20));
    if(state.hidden){state.walk=0;return;}
    if(!eventActive){state.walk=0;if(player&&Math.hypot(player.x-state.x,player.y-state.y)<80)state.dir=player.x<state.x?'left':'right';}
  }
  function isNear(player,r=52){return !state.hidden&&!!player&&Math.hypot(player.x-state.x,player.y-state.y)<r;}
  function talk(player){
    if(!isNear(player,66))return false;
    if(typeof ANguyetStory!=='undefined'&&ANguyetStory.talk(player))return true;
    const el=document.getElementById('dialog'), title=document.getElementById('dialog-title'), body=document.getElementById('dialog-body');
    if(!el||!title||!body)return false;
    el.hidden=false;title.textContent='A Nguyệt · Thiếu nữ cùng làng';
    body.textContent='Ngày hôm nay hoa ngoài vườn nở rất đẹp. Tiểu Phàm, khi nào rảnh thì đến xem nhé!';return true;
  }
  function draw(ctx,t){
    if(state.hidden)return;
    if(typeof SharedBody!=='undefined') SharedBody.draw(ctx,state,t,'a_nguyet',{label:'A Nguyệt',labelOffset:-86});
    if(typeof ANguyetStory!=='undefined'&&ANguyetStory.showMarker()){
      ctx.save();ctx.translate(state.x,state.y-91);ctx.textAlign='center';ctx.font='bold 18px sans-serif';
      ctx.fillStyle='#ffebaa';ctx.strokeStyle='#28362e';ctx.lineWidth=3;
      ctx.strokeText('!',0,-9);ctx.fillText('!',0,-9);ctx.restore();
    }
  }
  return {name:state.name, get x(){return state.x},get y(){return state.y},get hidden(){return state.hidden}, get walk(){return state.walk},
    place,stop,moveTo,update,draw,isNear,talk};
})();
