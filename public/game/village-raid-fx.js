'use strict';
/**
 * LÀNG DU LÃM – HIỆU ỨNG HUYẾT DẠ (Canvas only)
 * No generated/repainted map. Runs on top of the existing Lang_Du_Lam_Hoang_Tan.webp.
 * 00:00-06:00: fire, smoke, ember flecks, slight scorch and tiny blood drops.
 * Dawn: stop all dynamic FX; show the ORIGINAL ruins map unchanged.
 * World coordinates, collision geometry and save data are never modified.
 */
const VillageRaidFX = (() => {
  const RAID_STATES = new Set([
    'midnight_wake', 'window_shadow', 'countdown_hide',
    'attack_bed', 'attack_wardrobe', 'attack_door_early', 'attack_timeout',
    'hiding_jar', 'after_decision', 'chase_village', 'chase_caught', 'time_skip_dawn'
  ]);

  // Locations of actual roofs / ruined timber in the EXISTING 1536x1024 map,
  // and supplementary houses in the eastern/southern extensions (3072x1331).
  const FIRES = [
    [218, 217, 18, 0.2],   // west home roof
    [385, 246, 15, 1.5],   // northwest home
    [787, 110, 27, 2.2],  // north hall
    [237, 458, 17, 3.8],  // southwest home
    [1111, 308, 16, 2.7], // eastern river home
    [945, 637, 15, 4.8],  // southern two homes
    [1147, 642, 18, 5.6],
    [1676, 703, 17, 0.9], // existing east expansion homes
    [1991, 696, 18, 1.9],
    [2151, 1064, 18, 3.1],
    [2554, 1059, 14, 4.7],
    [2885, 275, 17, 3.9]
  ];
  // Không đổ máu trước nhà Tiểu Phàm (đã dọn sạch cả lớp nền).
  const BLOOD = [
    [549, 523, 0.55], [898, 485, -0.24],
    [1205, 471, 0.18], [813, 886, 0.24], [1734, 742, -0.35],
    [2011, 568, 0.61], [2458, 918, -0.34], [2798, 656, 0.4]
  ];

  function isRaidScene() {
    // Keep the same ORIGINAL ruined map through the midnight-to-dawn fade,
    // even when the flames have stopped; never briefly show the intact village.
    if (typeof Quest2 === 'undefined' || !Quest2 || typeof Quest2.getState !== 'function') return false;
    if (Quest2.isVillageRuined && Quest2.isVillageRuined()) return false;
    return RAID_STATES.has(Quest2.getState());
  }
  function isRaidActive() {
    if (!isRaidScene()) return false;
    // 06:00: no active fire, smoke or drifting ember particles, even during fade.
    if(typeof Quest2 !== 'undefined' && Quest2.getState() === 'time_skip_dawn'
      && typeof Villagers !== 'undefined' && Villagers.minutes >= 360) return false;
    return true;
  }

  function isVisible(x,y,range,viewport){
    return !viewport || (x+range>=viewport.x && y+range>=viewport.y &&
      x-range<=viewport.x+viewport.w && y-range<=viewport.y+viewport.h);
  }

  function drawGround(ctx, viewport) {
    if (!isRaidActive()) return;
    ctx.save();
    for (const [x, y, size] of FIRES) {
      if(!isVisible(x,y,size*2,viewport)) continue;
      // Semi-transparent scorching: no collision, no base-map pixel replacement.
      ctx.fillStyle = 'rgba(24,18,16,0.30)';
      ctx.beginPath();ctx.ellipse(x, y+9, size*1.38, size*.55, 0, 0, Math.PI*2);ctx.fill();
    }
    for (const [x,y,angle] of BLOOD) {
      if(!isVisible(x,y,12,viewport)) continue;
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);
      ctx.fillStyle = 'rgba(99,18,23,0.55)';
      ctx.beginPath();ctx.ellipse(0,0,4.5,1.6,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle = 'rgba(122,26,28,0.53)';
      ctx.fillRect(7,-1,2.3,1.2);ctx.fillRect(-6,3,1.5,1.5);
      ctx.restore();
    }
    ctx.restore();
  }

  // Shadows cast away from burning roof timbers. Four soft lobes shift with
  // the flame; image pixels, game collision, and geometry remain untouched.
  function castFireShadows(ctx, x, y, size, phase, seconds) {
    const sway = Math.sin(seconds * 7.6 + phase) * size * .14;
    ctx.save();
    ctx.translate(x, y + size*.14);
    ctx.rotate(-.41 + sway / (size * 9));
    for (let k=0; k<3; k++) {
      const len = size * (1.7 + .48*k + .13*Math.sin(seconds*9 + phase+k));
      const x0 = -size*.75 + k*size*.62;
      const gradient=ctx.createLinearGradient(x0,0,x0+size*.68,len);
      gradient.addColorStop(0,'rgba(9,8,15,0.24)');
      gradient.addColorStop(.55,'rgba(9,8,15,0.11)');
      gradient.addColorStop(1,'rgba(9,8,15,0)');
      ctx.fillStyle=gradient;
      ctx.beginPath();
      ctx.moveTo(x0-size*.13,0);
      ctx.lineTo(x0+size*.14,0);
      ctx.lineTo(x0+size*.7+size*.05*Math.sin(seconds*7+phase+k),len);
      ctx.lineTo(x0+size*.16,len);
      ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }

  function flame(ctx, x, y, size, phase, seconds) {
    if (typeof FireFX !== 'undefined') FireFX.draw(ctx,x,y,size,phase,seconds,1);
  }

  function smoke(ctx,x,y,size,phase,seconds) {
    if (typeof FireFX !== 'undefined') FireFX.smoke(ctx,x,y,size,phase,seconds,1,1);
  }

  function drawWorld(ctx, seconds, viewport) {
    if (!isRaidActive()) return;
    ctx.save();
    // Distant fires; smoke follows the same anchored roof, not the camera.
    for(const [x,y,size,phase] of FIRES){
      if(!isVisible(x,y,size*5,viewport)) continue;
      castFireShadows(ctx,x,y,size,phase,seconds);
      flame(ctx,x,y,size,phase,seconds);
      smoke(ctx,x,y,size,phase,seconds);
      for(let k=0;k<3;k++){
        const age = (seconds*21 + k*23 + phase*17) % 86;
        const px = x + Math.sin(seconds*2+phase+k*2)*11 + (k-1)*5;
        ctx.fillStyle=`rgba(255,${125+k*34},49,${(0.55*(1-age/86)).toFixed(3)})`;
        ctx.fillRect(px,y-10-age, k%2?1.8:2.2,2.2);
      }
    }
    // Sparse glowing ash drifting in the wind (deterministic, not flickering noise).
    for(const [x,y,size,phase] of FIRES){
      if(!isVisible(x,y,size*5,viewport)) continue;
      for(let j=0;j<5;j++){
        const life=(seconds*(13+j*1.9) + j*19 + phase*12) % 100;
        const px=x+Math.sin(seconds*.9+phase+j*2.3)*7+life*.19;
        const py=y-8-life*.91;
        const a=.35*(1-life/100);
        ctx.fillStyle=`rgba(255,${137+j*18},79,${a.toFixed(3)})`;
        ctx.fillRect(px,py,1.4,1.4);
      }
    }
    ctx.restore();
  }

  // From inside Tiểu Phàm's house, flickering warm light and smoke can be
  // glimpsed THROUGH THE EXISTING WINDOW only. This does not redraw interior.
  function drawInterior(ctx, seconds) {
    if (!isRaidActive()) return;
    ctx.save();
    ctx.beginPath();ctx.rect(345,68,82,52);ctx.clip();
    const flicker=0.22+0.11*Math.sin(seconds*9)+0.06*Math.sin(seconds*15.3);
    const grad=ctx.createRadialGradient(389,110,2,389,110,90);
    grad.addColorStop(0,`rgba(255,118,31,${Math.max(.08,flicker).toFixed(3)})`);
    grad.addColorStop(1,'rgba(255,77,15,0)');
    ctx.fillStyle=grad;ctx.fillRect(344,67,84,56);
    for(let i=0;i<4;i++){
      let rise=(seconds*9+i*17)%58;
      ctx.beginPath();ctx.ellipse(357+i*19+Math.sin(seconds+i)*4,119-rise,7+i*1.4,4+i*.6,0,0,Math.PI*2);
      ctx.fillStyle=`rgba(75,66,62,${.07+.045*(1-rise/58)})`;ctx.fill();
    }
    ctx.restore();
    // Thin moving firelight on the floor with a corresponding soft dark edge.
    ctx.save();
    const swing=Math.sin(seconds*9.3)*12;
    ctx.beginPath();
    ctx.moveTo(355,120);ctx.lineTo(414,120);
    ctx.lineTo(460+swing,235);ctx.lineTo(296+swing,235);
    ctx.closePath();
    const spill=ctx.createLinearGradient(383,119,380,238);
    spill.addColorStop(0,'rgba(255,119,37,0.18)');
    spill.addColorStop(1,'rgba(255,103,25,0)');
    ctx.fillStyle=spill;ctx.fill();
    ctx.fillStyle=`rgba(12,8,9,${(.10+.04*Math.sin(seconds*8.1)).toFixed(3)})`;
    ctx.fillRect(347,121,7,70);
    ctx.restore();
  }

  return { isRaidScene, isRaidActive, drawGround, drawWorld, drawInterior };
})();
