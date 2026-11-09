'use strict';

const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
const bg = new Image(), bgRuined = new Image(), hero = new Image(), avatar = new Image(), avatarTruong = new Image(), avatarAHuy = new Image(), avatarLuc = new Image();
bg.src = 'map.webp';
bgRuined.src = 'Lang_Du_Lam_Hoang_Tan_Toan_Canh.webp?v=ruins-seamheal02';
hero.src = 'hero.png';
avatar.src = 'tieu-pham-avatar.webp';
avatarTruong.src = 'Truong_Lang_Avatar_9KB.webp';
avatarAHuy.src = 'A_Huy_Avatar_Duoi_10KB.webp';
avatarLuc.src = 'Luc_Nham_Truc_Co_So_Ky_Avatar_Duoi10KB.webp';

const p = { ...PlayerRoster.tieuPham, x: 220, y: 316, face: 1, dir: 'down', walk: 0, hp: 100, maxHp: 100, mp: 0, maxMp: 0, realm: 'Phàm Nhân', level: 1 }, keys = new Set();
let W, H, scale, camX = 0, camY = 0, overview = false, running = false, ready = false, last = 0, jx = 0, jy = 0;
// Phần camera dùng tọa độ thế giới, không thay đổi tọa độ chân/hitbox nhân vật.
let smoothCamScale = null, smoothCamFocusX = null, smoothCamFocusY = null;
function resetCameraMotion() {
  smoothCamScale = smoothCamFocusX = smoothCamFocusY = null;
}

function canWalk(x, y) {
  return (typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside)
    ? TieuPhamHome.canWalk(x, y)
    : Collision.canWalk(x, y);
}

function resize() {
  resetCameraMotion();
  W = innerWidth;
  H = innerHeight;
  const d = Math.min(devicePixelRatio || 1, 2);
  canvas.width = W * d;
  canvas.height = H * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.imageSmoothingEnabled = false;
  scale = overview ? Math.min(W / 3072, H / 1331) : Math.max(W / 1200, H / 790);
}
addEventListener('resize', resize);
resize();

function questNavigationLocked() {
  const q2Locked = typeof Quest2 !== 'undefined' && Quest2.isNavigationLocked && Quest2.isNavigationLocked();
  const examReady = (typeof TieuPhamHome !== 'undefined' && TieuPhamHome.isExamReadyNow && TieuPhamHome.isExamReadyNow())
    || (typeof Quest1 !== 'undefined' && (Quest1.getState() === 'selection_ready' || Quest1.getState() === 'cinematic_active'));
  const q3Locked = typeof Quest3 !== 'undefined' && Quest3.isNavigationLocked && Quest3.isNavigationLocked();
  return !!(q2Locked || q3Locked || examReady);
}

function reset() {
  if(questNavigationLocked())return;
  resetCameraMotion();
  if (typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside) {
    TieuPhamHome.exit(p);
  } else {
    p.x = 220;
    p.y = 316;
    p.dir = 'down';
  }
  keys.clear();
  jx = jy = 0;
  overview = false;
  resize();
  if (typeof GameSave !== 'undefined') GameSave.save(true, p);
}

function input(e, on) {
  const k = e.key.toLowerCase();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Shift'].includes(e.key)) e.preventDefault();
  if(on&&!e.repeat&&k==='h'&&typeof TieuPhamHome!=='undefined'&&TieuPhamHome.inside){
    if(!(typeof Quest2!=='undefined'&&Quest2.isInputLocked&&Quest2.isInputLocked()))TieuPhamHome.interactBedHide(p);
  }
  if (on && !e.repeat && (k === 'j' || k === 'f' || k === 'e' || e.key === ' ')) {
    // Quest3 owns Space/Enter while a comic is shown; avoid double advancing.
    if (!(e.key === ' ' && typeof Quest3 !== 'undefined' && Quest3.isComicActive && Quest3.isComicActive())) triggerAction();
  }
  on ? keys.add(k) : keys.delete(k);
}
addEventListener('keydown', e => input(e, true));
addEventListener('keyup', e => input(e, false));
addEventListener('blur', () => {
  keys.clear();
  jx = jy = 0;
  running = false;
  document.querySelector('#stick i').style.transform = '';
});

document.getElementById('east').onclick = () => {
  if(questNavigationLocked())return;
  resetCameraMotion();
  if (typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside) TieuPhamHome.inside = false;
  if(bedHide)bedHide.hidden=true;
  p.x = 1845;
  p.y = 510;
  keys.clear();
  jx = jy = 0;
  overview = false;
  resize();
  if (typeof GameSave !== 'undefined') GameSave.save(true, p);
};
document.getElementById('home').onclick = reset;
document.getElementById('view').onclick = () => {
  if(questNavigationLocked())return;
  resetCameraMotion();
  if (typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside) TieuPhamHome.exit(p);
  overview = !overview;
  resize();
  document.getElementById('view').style.borderColor = overview ? '#ffe3a0' : '';
  if (typeof GameSave !== 'undefined') GameSave.save(true, p);
};
document.getElementById('full').onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
};

const stick = document.getElementById('stick'), knob = stick.querySelector('i');
let pointer = null;
function moveStick(e) {
  if (e.pointerId !== pointer) return;
  const r = stick.getBoundingClientRect();
  let x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2, d = Math.hypot(x, y);
  if (d > 38) { x *= 38 / d; y *= 38 / d; }
  jx = x / 38;
  jy = y / 38;
  knob.style.transform = `translate(${x}px,${y}px)`;
}
stick.onpointerdown = e => { pointer = e.pointerId; stick.setPointerCapture(pointer); moveStick(e); };
stick.onpointermove = moveStick;
function stopStick() { pointer = null; jx = jy = 0; knob.style.transform = ''; }
stick.onpointerup = stopStick;
stick.onpointercancel = stopStick;
stick.onlostpointercapture = stopStick;

const run = document.getElementById('run');
run.onpointerdown = e => { running = true; run.setPointerCapture(e.pointerId); run.style.background = '#a58e43bb'; };
function stopRun() { running = false; run.style.background = ''; }
run.onpointerup = stopRun;
run.onpointercancel = stopRun;
run.onlostpointercapture = stopRun;

function triggerAction() {
  if (typeof Quest2 !== 'undefined' && Quest2.isInputLocked && Quest2.isInputLocked()) return false;
  if (typeof Quest3 !== 'undefined' && Quest3.isInputLocked && Quest3.isInputLocked()) {
    if (Quest3.isComicActive && Quest3.isComicActive() && Quest3.interact) return Quest3.interact(p);
    return false;
  }
  if (typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside) {
    if (TieuPhamHome.interact(p)) return true;
    return TieuPham.triggerAttack(p);
  }
  if (typeof Quest2 !== 'undefined' && Quest2.isVillageRuined && Quest2.isVillageRuined()) {
    if (typeof Quest3 !== 'undefined' && Quest3.interact && Quest3.interact(p)) return true;
    return TieuPham.triggerAttack(p);
  } else {
    if (typeof Quest1 !== 'undefined' && Quest1.isAwaitingStoneTouch && Quest1.isAwaitingStoneTouch(p)) {
      if (Quest1.interact(p)) return true;
    }
    if (typeof Quest1 !== 'undefined' && Quest1.isNearChief(p, 56)) {
      if (Quest1.interact(p)) return true;
    }
    if (typeof AHuy !== 'undefined' && AHuy.isNear(p, 52)) {
      const attacked = TieuPham.triggerAttack(p);
      if (attacked) { AHuy.takeHit(p); return true; }
      if (AHuy.talk(p)) return true;
    }
    if (typeof ANguyet !== 'undefined' && ANguyet.isNear(p, 55) && ANguyet.talk(p)) return true;
    if (Villagers.talk(p)) return true;
    if (typeof TieuPhamHome !== 'undefined' && !questNavigationLocked() && Math.hypot(p.x - 221, p.y - 296) < 42) {
      TieuPhamHome.enter(p);
      return true;
    }
    const ok = TieuPham.triggerAttack(p);
    if (ok && typeof AHuy !== 'undefined' && AHuy.isNear(p, 52)) {
      AHuy.takeHit(p);
    }
    return ok;
  }
}

const bedHide=document.getElementById('bed-hide');
if(bedHide)bedHide.onclick=()=>{
  if(typeof Quest2!=='undefined'&&Quest2.isInputLocked&&Quest2.isInputLocked())return;
  if(typeof TieuPhamHome!=='undefined')TieuPhamHome.interactBedHide(p);
};

const punch = document.getElementById('punch');
let punchHeld = false;
if (punch) {
  punch.onpointerdown = e => {
    e.preventDefault();
    punchHeld = true;
    punch.setPointerCapture?.(e.pointerId);
    const ok = triggerAction();
    punch.style.transform = ok ? 'scale(0.91)' : 'scale(0.96)';
    if (ok) punch.style.background = 'radial-gradient(circle at 35% 30%,#c97d32ee,#4a2812ee)';
  };
  const stopPunch = () => {
    punchHeld = false;
    punch.style.transform = '';
    if (!(p.attackCooldown > 0)) punch.style.background = '';
  };
  punch.onpointerup = stopPunch;
  punch.onpointercancel = stopPunch;
  punch.onlostpointercapture = stopPunch;
}

canvas.addEventListener('pointerdown', e => {
  if (typeof Quest3 !== 'undefined' && Quest3.handleClick && Quest3.handleClick(e.clientX, e.clientY, W, H, p)) return;
  if (typeof Quest1 !== 'undefined' && Quest1.handleClickHUD && Quest1.handleClickHUD(e.clientX, e.clientY, W, p)) return;
  if (typeof TieuPham !== 'undefined' && TieuPham.handleClickHUD && TieuPham.handleClickHUD(e.clientX, e.clientY, W, p)) return;
  if (typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside) {
    const cam = TieuPhamHome.computeCamera ? TieuPhamHome.computeCamera(W, H, p) : { scale: 1, x: 0, y: 0 };
    const rx = e.clientX / cam.scale + cam.x, ry = e.clientY / cam.scale + cam.y;
    if (TieuPhamHome.handleCanvasClick(rx, ry, p)) return;
  }
  if (typeof Quest2 !== 'undefined' && Quest2.handleClick && Quest2.handleClick(e.clientX, e.clientY, p)) return;
});

function frame(t) {
  requestAnimationFrame(frame);
  if (!ready) return;

  const navLocked = questNavigationLocked();
  const isRuined = typeof Quest2 !== 'undefined' && Quest2.isVillageRuined && Quest2.isVillageRuined();
  for (const id of ['east', 'home', 'view', 'skiptime', 'skipday']) {
    const el = document.getElementById(id);
    const btnLocked = navLocked || ((id === 'skiptime' || id === 'skipday') && isRuined);
    if (el && el.disabled !== btnLocked) {
      el.disabled = btnLocked;
      el.style.opacity = btnLocked ? '.36' : '';
      const isQ2 = typeof Quest2 !== 'undefined' && Quest2.isNavigationLocked && Quest2.isNavigationLocked();
      el.title = btnLocked
        ? (isRuined && (id === 'skiptime' || id === 'skipday')
            ? 'Không thể tua thời gian trong cảnh làng hoang tàn'
            : isQ2
              ? 'Không thể dịch chuyển hoặc tua thời gian khi nhiệm vụ sinh tồn đang diễn ra'
              : 'Hãy tự đi bộ đến Quảng Trường Làng tham gia khảo nghiệm, không thể dịch chuyển!')
        : '';
    }
  }

  const inHome = typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside;
  const dtReal = last ? Math.max(0, (t - last) / 1000) : 0;
  let dt = Math.min(dtReal, 0.035);
  last = t;

  p.attackTimer = Math.max(0, (p.attackTimer || 0) - dt);
  p.attackCooldown = Math.max(0, (p.attackCooldown || 0) - dt);
  if (punch && !punchHeld) {
    if (p.attackCooldown > 0) {
      const pct = Math.round((1 - p.attackCooldown / (p.attackCooldownMax || 0.85)) * 360);
      punch.style.background = `conic-gradient(#d1a854cc ${pct}deg, #0d1c16eb ${pct}deg)`;
      punch.style.opacity = '0.78';
    } else {
      punch.style.background = '';
      punch.style.opacity = '';
    }
  }

  let dx = jx + (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  let dy = jy + (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  let len = Math.hypot(dx, dy);

  if (len > 0.12 && typeof Quest2 !== 'undefined' && Quest2.handleMovementIntent && Quest2.handleMovementIntent(p)) {
    dx = 0; dy = 0; len = 0;
  }

  const inPose = typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside && TieuPhamHome.pose !== 'none';
  const q1Locked = typeof Quest1 !== 'undefined' && (Quest1.isInputLocked ? Quest1.isInputLocked() : (Quest1.isDialogueActive() || (Quest1.isCinematicActive && Quest1.isCinematicActive())));
  const q2Locked = typeof Quest2 !== 'undefined' && Quest2.isInputLocked && Quest2.isInputLocked();
  const q3Locked = typeof Quest3 !== 'undefined' && Quest3.isInputLocked && Quest3.isInputLocked();
  const dialogueLocked = q1Locked || q2Locked || q3Locked;
  const isDeadOrDown = (p.knockedDown || p.hp <= 0) && typeof Quest2 !== 'undefined' && Quest2.getState && Quest2.getState() !== 'completed' && Quest2.getState() !== 'locked';
  if (dialogueLocked || isDeadOrDown) {
    dx = 0; dy = 0; len = 0;
  }

  p.sprinting = (running || keys.has('shift')) && !inPose && !dialogueLocked && !isDeadOrDown;
  const oldX = p.x, oldY = p.y;
  if (!inPose && !dialogueLocked && !isDeadOrDown && len > 0.12) {
    dx /= Math.max(1, len);
    dy /= Math.max(1, len);
    let v = (running || keys.has('shift') ? 200 : 115) * dt;
    if (!inHome && typeof Weather !== 'undefined' && (Weather.kind === 'storm' || Weather.kind === 'rain')) {
      const inPavilion = p.x >= 1918 && p.x <= 2092 && p.y >= 410 && p.y <= 482;
      if (!inPavilion) v *= (Weather.kind === 'storm' ? 0.88 : 0.94);
    }
    for (let i = 0; i < 3; i++) {
      if (canWalk(p.x + dx * v / 3, p.y)) p.x += dx * v / 3;
      if (canWalk(p.x, p.y + dy * v / 3)) p.y += dy * v / 3;
    }
    if (Math.abs(dx) > 0.1) p.face = dx < 0 ? -1 : 1;
    p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    p.walk += dt * (running || keys.has('shift') ? 18 : 11);
  } else if (!(typeof Quest1 !== 'undefined' && Quest1.isCinematicActive && Quest1.isCinematicActive() && Quest1.getCinematicStep && Quest1.getCinematicStep() === 6)) {
    p.walk = 0;
  }
  if (Math.hypot(p.x - oldX, p.y - oldY) < 0.01) p.walk = 0;
  if (typeof TieuPhamHome !== 'undefined') TieuPhamHome.checkTransition(p, dx, dy, dt);

  const worldP = inHome ? { ...p, x: 221, y: 314, sprinting: false } : p;
  Life.update(dt, t / 1000, worldP, Villagers.minutes);
  Weather.update(dt, Villagers.minutes, Villagers.day);
  if (typeof VillageMusic !== 'undefined' && VillageMusic.updateWeather) {
    VillageMusic.updateWeather(Weather.kind, Weather.rainIntensity, Weather.stormIntensity);
  }
  Villagers.update(dt, t / 1000, worldP);
  if (typeof AHuy !== 'undefined') AHuy.update(dt, t / 1000, worldP);
  if (typeof Quest1 !== 'undefined') Quest1.update(dt, t / 1000, worldP, Villagers);
  if (typeof Quest2 !== 'undefined') Quest2.update(dt,t/1000,p,Villagers,dtReal);
  if (typeof Quest3 !== 'undefined') Quest3.update(dt, t / 1000, p);
  if (typeof ANguyetStory !== 'undefined') ANguyetStory.update(dt, t / 1000, p);
  if (typeof ANguyet !== 'undefined') ANguyet.update(dt, t / 1000, p);
  VillageWork.update(dt, t / 1000, Villagers.minutes, Villagers.day, worldP);
  SnowCover.update(dt, Weather.kind);
  if (typeof GameSave !== 'undefined') GameSave.update(dt, p);

  if (inHome) {
    // Cảnh nội thất dùng camera khác; khi ra khỏi nhà phải bám nhân vật ngay.
    resetCameraMotion();
    TieuPhamHome.updateInterior(p, dt, len > 0.12);
    const cam = TieuPhamHome.computeCamera ? TieuPhamHome.computeCamera(W, H, p) : { scale: 1, x: 0, y: 0, worldW: W, worldH: H };
    ctx.save();
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-cam.x, -cam.y);
    TieuPhamHome.drawInterior(ctx, p, t / 1000, Villagers.minutes, cam);
    if (typeof Quest2 !== 'undefined' && Quest2.drawInHome) Quest2.drawInHome(ctx, t / 1000);
    ctx.restore();
    if (typeof TieuPham !== 'undefined' && TieuPham.drawHUD) TieuPham.drawHUD(ctx, p, W, H, t / 1000, dt);
    if (typeof Quest1 !== 'undefined' && Quest1.drawHUD) Quest1.drawHUD(ctx, p, W, H, t / 1000, dt);
    if (typeof Quest2 !== 'undefined' && Quest2.drawHUD) Quest2.drawHUD(ctx, p, W, H, t / 1000, dt);
    if (typeof Quest3 !== 'undefined' && Quest3.drawHUD) Quest3.drawHUD(ctx, p, W, H, t / 1000, dt);
    document.getElementById('place').textContent = 'Trong nhà Tiểu Phàm · Tiểu Phàm, 14 tuổi';
    return;
  }

  // Quét toàn cảnh khu mộ khi lại gần: đặc biệt cần cho màn hình dọc hẹp.
  // scale thường được giữ nguyên ở các phần khác của trò chơi.
  const graveView = !overview && typeof Quest3 !== 'undefined' && Quest3.getMemorialFraming
    ? Quest3.getMemorialFraming(p) : null;
  const wantedScale = graveView ? Math.min(scale, W / 590) : scale;
  // Ngắm trọn khu mộ ở gần trung tâm; sát rìa vùng ngắm thì dịch camera
  // nhẹ theo Tiểu Phàm để nhân vật không ra ngoài màn hình trước khi thoát vùng.
  const graveOffsetX = graveView ? p.x - graveView.x : 0;
  const graveOffsetY = graveView ? p.y - graveView.y : 0;
  const wantedFocusX = graveView
    ? graveView.x + Math.sign(graveOffsetX) * Math.max(0, Math.abs(graveOffsetX) - 145) * 0.8 : p.x;
  const wantedFocusY = graveView
    ? graveView.y + Math.sign(graveOffsetY) * Math.max(0, Math.abs(graveOffsetY) - 235) * 0.65 : p.y;
  if (smoothCamScale === null) {
    smoothCamScale = wantedScale;
    smoothCamFocusX = wantedFocusX;
    smoothCamFocusY = wantedFocusY;
  } else {
    // Nội suy độc lập khung hình: mượt trên điện thoại 30/60 FPS, không đổi đột ngột.
    const zoomEase = 1 - Math.exp(-5.8 * dt);
    const panEase = 1 - Math.exp(-8.5 * dt);
    smoothCamScale += (wantedScale - smoothCamScale) * zoomEase;
    smoothCamFocusX += (wantedFocusX - smoothCamFocusX) * panEase;
    smoothCamFocusY += (wantedFocusY - smoothCamFocusY) * panEase;
  }
  const worldScale = overview ? scale : smoothCamScale;
  const camFocusX = overview ? 1536 : smoothCamFocusX;
  const camFocusY = overview ? 665.5 : smoothCamFocusY;
  const viewW = W / worldScale, viewH = H / worldScale;
  camX = overview ? (3072 - viewW) / 2 : Math.max(0, Math.min(3072 - viewW, camFocusX - viewW / 2));
  camY = overview ? (1331 - viewH) / 2 : Math.max(0, Math.min(1331 - viewH, camFocusY - viewH / 2));
  // Căn về lưới pixel vật lý để giảm giật nền pixel-art khi camera di chuyển.
  const pixelRatio = Math.min(devicePixelRatio || 1, 2);
  camX = Math.round(camX * worldScale * pixelRatio) / (worldScale * pixelRatio);
  camY = Math.round(camY * worldScale * pixelRatio) / (worldScale * pixelRatio);
  if (typeof Quest1 !== 'undefined' && Quest1.getCameraOffset) {
    const off = Quest1.getCameraOffset();
    camX += off.x;
    camY += off.y;
  }

  ctx.fillStyle = '#142c24';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.scale(worldScale, worldScale);
  ctx.translate(-camX, -camY);

  const villageRuined = typeof Quest2 !== 'undefined' && Quest2.isVillageRuined && Quest2.isVillageRuined();
  const villageUnderAttack = typeof VillageRaidFX !== 'undefined' && VillageRaidFX.isRaidScene();
  const raidFireActive = typeof VillageRaidFX !== 'undefined' && VillageRaidFX.isRaidActive();
  const ruinScene = villageRuined || villageUnderAttack;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (ruinScene) ctx.drawImage(bgRuined, 0, 0, 3072, 1331);
  else ctx.drawImage(bg, 0, 0, 1536, 1024);
  ctx.restore();
  if (villageRuined && typeof RuinsAmbientFX !== 'undefined') RuinsAmbientFX.drawBloodCleanup(ctx);

  if (ruinScene) {
    // Nền hoang tàn đã được hợp nhất thành một ảnh duy nhất để xoá đường ghép map.
  }

  if(raidFireActive){ctx.save();ctx.fillStyle='rgba(7,12,26,0.59)';ctx.fillRect(0,0,3072,1331);ctx.restore();}
  const raidViewport = { x: camX - 170, y: camY - 190, w: W / worldScale + 340, h: H / worldScale + 380 };
  if (typeof VillageRaidFX !== 'undefined') VillageRaidFX.drawGround(ctx, raidViewport);
  if (villageRuined && typeof RuinsAmbientFX !== 'undefined') RuinsAmbientFX.drawGround(ctx, raidViewport);

  if (!ruinScene) {
    VillageSquare.draw(ctx);
    if (typeof Quest1 !== 'undefined' && Quest1.drawGround) Quest1.drawGround(ctx, t / 1000);
    VillageExpansion.draw(ctx);EastVillage.draw(ctx,t/1000);
    VillageWork.farms(ctx, t / 1000, Villagers.minutes);
    VillageDetail.ground(ctx);
    VillageDetail.farm(ctx, t / 1000);
    VillageArt.ground(ctx, t / 1000);
    RainShelter.ground(ctx);
    Life.ground(ctx, t / 1000);
    Weather.ground(ctx, t / 1000);
    Villagers.props(ctx, t / 1000);
    VillageWork.props(ctx, t / 1000);
    VillageDetail.props(ctx, t / 1000);
    VillageArt.props(ctx, t / 1000);
    RainShelter.back(ctx, t / 1000);
    VillageLighting.houseLights(ctx, t / 1000, VillageLighting.night(Villagers.minutes));
    SnowCover.draw(ctx);
    VillageLighting.fixtures(ctx, t / 1000, Villagers.minutes);
    if (typeof TieuPhamHome !== 'undefined') TieuPhamHome.drawExteriorDoor(ctx, p, t / 1000);
  }

  // Đất và bia mộ nằm dưới lớp nhân vật; cánh hoa do Quest3.drawWorld vẽ sau.
  if (ruinScene && typeof Quest3 !== 'undefined' && Quest3.drawGround) Quest3.drawGround(ctx);

  const actors = ruinScene
    ? [{ ...p, type: 'player' }]
    : [
        ...VillageWork.buffalo.filter(a => !a.hidden),
        ...Life.animals.filter(a => !a.hidden),
        ...Villagers.list.filter(n => !n.hidden && !Villagers.isGardenSceneHidden(n, p)).map(n => ({ ...n, type: 'npc' })),
        ...(!inHome && typeof AHuy !== 'undefined' && !AHuy.hidden ? [{ type: 'ahuy', y: AHuy.y, x: AHuy.x }] : []),
        ...(!inHome && typeof ANguyet !== 'undefined' && !ANguyet.hidden ? [{ type: 'a_nguyet', y: ANguyet.y, x: ANguyet.x }] : []),
        { ...p, type: 'player' }
      ].sort((a, b) => a.y - b.y);

  for (const a of actors) {
    if (a.type === 'player') TieuPham.draw(ctx, p, t / 1000);
    else if (a.type === 'ahuy') AHuy.draw(ctx, t / 1000);
    else if (a.type === 'a_nguyet') ANguyet.draw(ctx, t / 1000);
    else if (a.type === 'buffalo') VillageWork.animal(ctx, a, t / 1000);
    else if (a.type === 'npc') Villagers.draw(ctx, Villagers.list.find(n => n.id === a.id), t / 1000);
    else Life.animal(ctx, a, t / 1000);
  }

  if (typeof Quest1 !== 'undefined') Quest1.drawWorld(ctx, t / 1000);
  if (typeof Quest2 !== 'undefined') Quest2.drawWorld(ctx, t / 1000);
  if (typeof Quest3 !== 'undefined') Quest3.drawWorld(ctx, t / 1000);
  if (typeof ANguyetStory !== 'undefined') ANguyetStory.drawWorld(ctx, t / 1000);
  if (typeof VillageRaidFX !== 'undefined') VillageRaidFX.drawWorld(ctx,t/1000,raidViewport);
  if (villageRuined && typeof RuinsAmbientFX !== 'undefined') RuinsAmbientFX.drawWorld(ctx,t/1000,raidViewport);

  if (!ruinScene) {
    RainShelter.front(ctx, t / 1000);
    Life.air(ctx, t / 1000, Villagers.minutes);
    VillageArt.air(ctx, t / 1000);
    Weather.daylight(ctx, Villagers.minutes);
    VillageLighting.draw(ctx, t / 1000, Villagers.minutes, dt, Weather.kind, Villagers.list);
    Life.nocturnalAir(ctx, t / 1000, Villagers.minutes, Weather.kind);
  }

  ctx.restore();
  Weather.screen(ctx, W, H, { x: (1928 - camX) * worldScale, y: (405 - camY) * worldScale, w: 148 * worldScale, h: 76 * worldScale });
  if (typeof TieuPham !== 'undefined' && TieuPham.drawHUD) TieuPham.drawHUD(ctx, p, W, H, t / 1000, dt);
  if (typeof Quest1 !== 'undefined' && Quest1.drawHUD) Quest1.drawHUD(ctx, p, W, H, t / 1000, dt);
  if (typeof Quest2 !== 'undefined' && Quest2.drawHUD) Quest2.drawHUD(ctx, p, W, H, t / 1000, dt);
  if (typeof Quest3 !== 'undefined' && Quest3.drawHUD) Quest3.drawHUD(ctx, p, W, H, t / 1000, dt);

  document.getElementById('place').textContent = (
    villageRuined ? 'Làng Du Lãm Hoang Tàn · Phế Tích'
    : villageUnderAttack ? 'Làng Du Lãm · Huyết Dạ'
    : (p.x > 1536
        ? (p.y < 440 ? (p.x > 2280 ? 'Dinh trưởng làng' : 'Đồng lúa phía đông')
          : p.y < 870 && p.x > 2180 ? 'Vườn hoa'
          : p.y > 870 ? 'Chợ và khu dân cư đông' : 'Xóm đông')
        : p.y > 1024 ? 'Khu làng phía nam'
        : p.x > 1250 ? 'Cầu bên suối'
        : p.y > 800 ? 'Cổng làng'
        : p.y < 350 ? (p.x > 600 ? 'Đình làng cũ' : 'Xóm nhà Tiểu Phàm')
        : 'Sân làng')
  ) + ' · Tiểu Phàm, 14 tuổi';
}

Promise.all([
  bg.decode(),
  bgRuined.decode().catch(() => null),
  hero.decode(),
  avatar.decode().catch(() => null),
  avatarTruong.decode().catch(() => null),
  avatarAHuy.decode().catch(() => null),
  avatarLuc.decode().catch(() => null)
]).then(() => {
  VillageSquare.init();
  VillageExpansion.init(bg);
  EastVillage.init(bg);
  // Không nạp thêm 2 ảnh khu Đông/Nam: nền hoang tàn toàn cảnh đã chứa cả hai.
  // Giữ ruins-extension.js làm tài liệu/tương thích, không khởi tạo bộ ảnh dư RAM.
  if (typeof RuinsAmbientFX !== 'undefined') RuinsAmbientFX.init(bg);
  Life.init(bg);
  VillageWork.init();
  VillageDetail.init(bg);
  VillageArt.init();
  RainShelter.init();
  Villagers.init();
  Weather.init();
  SnowCover.init();
  if (typeof Quest1 !== 'undefined') Quest1.init(Villagers);
  if (typeof Quest2 !== 'undefined') Quest2.init();
  if (typeof Quest3 !== 'undefined') Quest3.init();
  if (typeof ANguyetStory !== 'undefined') ANguyetStory.init();

  let restored = null;
  if (typeof GameSave !== 'undefined') {
    restored = GameSave.load(p);
    if (restored) {
      const h = Math.floor(Villagers.minutes / 60), m = Math.floor(Villagers.minutes % 60), pad = n => String(n).padStart(2, '0');
      const clk = document.getElementById('clock');
      if (clk) clk.textContent = 'Ngày ' + Villagers.day + ' · ' + pad(h) + ':' + pad(m);
      const dtTime = document.getElementById('datetime-time');
      if (dtTime) dtTime.textContent = pad(h) + ':' + pad(m);
      const dtFull = document.getElementById('datetime-full');
      if (dtFull) dtFull.textContent = 'Thiên Nam năm 3619 - tháng 12 - ngày ' + Villagers.day + ' - ' + pad(h) + ':' + pad(m);
      const tEl = document.getElementById('toast');
      if (tEl) tEl.textContent = 'Tiểu Phàm, 14 tuổi — Đã khôi phục hành trình Ngày ' + Villagers.day + ' (' + pad(h) + ':' + pad(m) + ').';
    }
  }

  const titleScreen = document.getElementById('title-screen');
  const startBtn = document.getElementById('start-game-btn');
  const loadStatus = document.getElementById('title-loading-status');
  const subText = document.getElementById('title-subtext');

  function enterGameWorld() {
    ready = true;
    if (typeof LiepMaSFX !== 'undefined') LiepMaSFX.unlock();
    if (typeof Quest2 !== 'undefined' && Quest2.restoreAfterLoad) Quest2.restoreAfterLoad(p);
    if (typeof Quest3 !== 'undefined' && Quest3.restoreAfterLoad) Quest3.restoreAfterLoad(p);
    if (typeof VillageMusic !== 'undefined') {
      VillageMusic.init();
      VillageMusic.start();
    }
    if (titleScreen) {
      titleScreen.style.opacity = '0';
      titleScreen.style.pointerEvents = 'none';
      setTimeout(() => { try { titleScreen.remove(); } catch (e) {} }, 700);
    }
    const tEl = document.getElementById('toast');
    if (tEl) setTimeout(() => tEl.style.opacity = 0, 4500);
  }

  if (startBtn && titleScreen) {
    if (loadStatus) loadStatus.hidden = true;
    startBtn.hidden = false;
    if (subText) subText.hidden = false;
    startBtn.onclick = e => {
      e.stopPropagation();
      enterGameWorld();
    };
  } else {
    ready = true;
    if (typeof Quest2 !== 'undefined' && Quest2.restoreAfterLoad) Quest2.restoreAfterLoad(p);
    if (typeof Quest3 !== 'undefined' && Quest3.restoreAfterLoad) Quest3.restoreAfterLoad(p);
    const oldLoad = document.getElementById('loading');
    if (oldLoad) oldLoad.remove();
    const tEl = document.getElementById('toast');
    if (tEl) setTimeout(() => tEl.style.opacity = 0, 4500);
  }
}).catch(() => {
  const ls = document.getElementById('title-loading-status') || document.getElementById('loading');
  if (ls) ls.textContent = 'Không tải được bản đồ. Hãy tải lại trang.';
});

requestAnimationFrame(frame);
