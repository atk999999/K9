'use strict';

/**
 * NHIỆM VỤ 2: HUYẾT DẠ YÊU ẢNH (血夜妖影)
 * Thể loại: Kinh dị sinh tồn 2D (Survival Horror) & Rượt đuổi nghẹt thở
 * Kích hoạt: Ngay sau khi hoàn thành Nhiệm vụ 1, Tiểu Phàm về nhà ngủ.
 */
const Quest2 = (() => {
  const STORAGE_KEY = 'lang_du_lam_quest2_v1';

  const STATES = {
    LOCKED: 'locked',                         // Chưa xong Quest 1
    READY_TO_REST: 'ready_to_rest',           // Đã xong Quest 1, cần về nhà ngủ
    SLEEPING_START: 'sleeping_start',         // Lên giường, fade tối màn hình
    MIDNIGHT_WAKE: 'midnight_wake',           // 00:00, bừng tỉnh, tiếng hét xóm đông
    WINDOW_SHADOW: 'window_shadow',           // Bóng đen Liệp Ma ngoài cửa sổ
    COUNTDOWN_HIDE: 'countdown_hide',         // 10 giây sinh tử để trốn
    ATTACK_BED: 'attack_bed',                 // Chọn gầm giường -> Liệp Ma đập nát giường -> Chết
    ATTACK_WARDROBE: 'attack_wardrobe',       // Chọn tủ gỗ -> Liệp Ma xé toạc cửa tủ -> Chết
    ATTACK_DOOR_EARLY: 'attack_door_early',   // Chọn chạy ra cửa trong 10s -> Chạm mặt Liệp Ma -> Chết
    ATTACK_TIMEOUT: 'attack_timeout',         // Hết 10s chưa trốn -> Liệp Ma đạp cửa bắt tại chỗ -> Chết
    HIDING_JAR: 'hiding_jar',                 // Nấp trong chum -> Liệp Ma phá nhà rồi bỏ đi
    AFTER_LEAVING_DECISION: 'after_decision', // Bước ngoặt: Ra ngoài làng hay Nấp tới sáng
    CHASE_VILLAGE: 'chase_village',           // Nhánh A: Chạy trốn tự do trên map làng, Liệp Ma rượt đuổi
    CHASE_CAUGHT: 'chase_caught',             // Nhánh A: Bị Liệp Ma bắt kịp tử vong
    TIME_SKIP_DAWN: 'time_skip_dawn',         // Nhánh B: Nấp tới 06:00 sáng
    RUINS_EXPLORE: 'ruins_explore',           // Bước ra làng hoang tàn, hiện bảng tổng kết
    COMPLETED: 'completed'                    // Hoàn thành nhiệm vụ 2
  };

  let questData = {
    version: 1,
    state: STATES.LOCKED,
    completed: false,
    ruinsActive: false,
    bedBroken: false,
    wardrobeBroken: false,
    jarBroken: false,
    wallBroken: false,
    survivedInJar: false
  };

  // Liệp Ma Sprite Config (1152x1536, 8 rows x 6 cols, 192x192 px/frame)
  const LIEP_MA_IMG = new Image();
  let liepMaLoaded = false;
  LIEP_MA_IMG.onload = () => { liepMaLoaded = true; };
  LIEP_MA_IMG.src = 'liep-ma/liep-ma-sprites.webp?v=liepma-canonical-01';

  const LIEP_MA_ANIMS = {
    idle:   { row: 0, fps: 4, frames: 6, loop: true },
    walk:   { row: 1, fps: 5, frames: 6, loop: true },
    sniff:  { row: 2, fps: 4, frames: 6, loop: true },
    run:    { row: 3, fps: 9, frames: 6, loop: true },
    attack: { row: 4, fps: 7, frames: 6, loop: false },
    bite:   { row: 5, fps: 8,  frames: 6, loop: false },
    hit:    { row: 6, fps: 9,  frames: 6, loop: false },
    death:  { row: 7, fps: 7,  frames: 6, loop: false }
  };

  // Entity Liệp Ma trong hoạt cảnh / rượt đuổi
  let monster = {
    active: false,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    speed: 220, // Tốc độ ngoài làng; khi ở trong nhà sẽ bị giảm riêng để bớt lao như máy.
    action: 'walk',
    frame: 0,
    frameTimer: 0,
    facing: 1, // 1: nhìn phải, -1: nhìn trái
    scale: 0.52 // Dáng gù thấp như hồi ức 05.webp, vẫn cao hơn Tiểu Phàm nhưng không trùm nội thất.
  };

  // Hoạt cảnh phá nhà khi Tiểu Phàm nấp trong chum.
  // Dùng chung mốc va chạm và toạ độ với renderer: đồ vật chỉ vỡ khi
  // sprite Liệp Ma đã tới gần, giơ vuốt và chém trúng vật thể tương ứng.
  const JAR_RAID = Object.freeze({
    // Kéo giãn tiết tấu: Liệp Ma bước chậm hơn, dừng đánh hơi rõ hơn trước mỗi cú đánh.
    bedSwing: 4.88, bedImpact: 5.22, bedSwingEnd: 5.72,
    wardrobeSwing: 9.75, wardrobeImpact: 10.10, wardrobeSwingEnd: 10.65,
    jarTap: 15.52, departure: 16.55, finished: 18.83
  });

  function jarRaidPose(time) {
    const t = Math.max(0, time);
    const move = (start, end, fromX, fromY, toX, toY, facing) => {
      const u = Math.max(0, Math.min(1, (t - start) / (end - start)));
      // Đi chậm lúc bắt đầu và lúc dừng, không giật vị trí khi đổi động tác.
      const eased = u * u * (3 - 2 * u);
      return { x: fromX + (toX - fromX) * eased, y: fromY + (toY - fromY) * eased, facing, action: 'walk' };
    };
    if (t < 1.25) return { x: 374, y: 148, facing: -1, action: 'idle' };
    if (t < 2.75) return { x: 374, y: 152, facing: 1, action: 'sniff' };
    if (t < 4.32) return move(2.75, 4.32, 374, 152, 491, 219, 1);
    if (t < JAR_RAID.bedSwing) return { x: 491, y: 219, facing: 1, action: 'sniff' };
    if (t < JAR_RAID.bedSwingEnd) return { x: 491, y: 219, facing: 1, action: 'attack' };
    if (t < 8.85) return move(JAR_RAID.bedSwingEnd, 8.85, 491, 219, 207, 197, -1);
    if (t < JAR_RAID.wardrobeSwing) return { x: 207, y: 197, facing: -1, action: 'sniff' };
    if (t < JAR_RAID.wardrobeSwingEnd) return { x: 207, y: 197, facing: -1, action: 'attack' };
    if (t < 14.45) return move(JAR_RAID.wardrobeSwingEnd, 14.45, 207, 197, 555, 350, 1);
    if (t < JAR_RAID.departure) return { x: 555, y: 350, facing: 1, action: 'sniff' };
    return move(JAR_RAID.departure, JAR_RAID.finished, 555, 350, 374, 155, -1);
  }

  function strikeFurniture(furniture) {
    const bed = furniture === 'bed';
    if (bed ? questData.bedBroken : questData.wardrobeBroken) return;
    if (bed) questData.bedBroken = true;
    else questData.wardrobeBroken = true;
    const impactX = bed ? 522 : 150;
    const impactY = bed ? 157 : 143;
    spawnDebrisBurst(impactX, impactY, 'wood');
    // Ba vết vuốt hiện đúng ở mặt đồ vật ngay khi khung hình chém trúng.
    clawMarks.push({ x: impactX, y: impactY, alpha: 1, color: '#f5c68c', wood: true });
    screenShake = 18;
    playClawWoodSound();
    playWoodCrashSound();
    saveState();
    showToast(bed
      ? '⚡ XOẸT! Liệp Ma quật móng vuốt vào thành giường — khung gỗ gãy sập, dăm gỗ bắn tung!'
      : '⚡ RẮC! Móng vuốt Liệp Ma xé toạc hai cánh tủ — bản lề bung ra, gỗ vỡ rơi xuống sàn!');
  }

  // Timers & cinematic state
  let stateTimer = 0;
  let countdownTimer = 10.0;
  let heartbeatTimer = 0;
  let screenFadeAlpha = 0;
  let screenShake = 0;
  let nightAmbientAlpha = 0;
  let cinematicSubStep = 0;
  let deathReason = '';

  // Combat, Damage, Destruction Shards & Detection FX
  let damageTexts = [];
  let clawMarks = [];
  let debrisParticles = [];
  let monsterAlertPulse = 0;
  let bloodFlash = 0;
  let chaseAttackCooldown = 0;

  // Web Audio API Synthesizer cho SFX kinh dị
  function getAudioCtx() {
    if (typeof VillageMusic !== 'undefined' && VillageMusic.isMuted) return null;
    try {
      if (typeof VillageMusic !== 'undefined' && VillageMusic.audioCtx) {
        return VillageMusic.audioCtx;
      }
      if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
        if (!window._langDuLamSfxCtx) {
          window._langDuLamSfxCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return window._langDuLamSfxCtx;
      }
    } catch (e) {}
    return null;
  }

  function playHeartbeatSound() {
    const actx = getAudioCtx();
    if (!actx || actx.state === 'suspended') return;
    try {
      const now = actx.currentTime;
      // Nhịp 1: thình (trầm)
      const osc1 = actx.createOscillator();
      const gain1 = actx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(55, now);
      osc1.frequency.exponentialRampToValueAtTime(32, now + 0.14);
      gain1.gain.setValueAtTime(0.55, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc1.connect(gain1);
      gain1.connect(actx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Nhịp 2: thịch (nhẹ hơn, sau 0.18s)
      const osc2 = actx.createOscillator();
      const gain2 = actx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(48, now + 0.18);
      osc2.frequency.exponentialRampToValueAtTime(28, now + 0.32);
      gain2.gain.setValueAtTime(0.42, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc2.connect(gain2);
      gain2.connect(actx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.36);
    } catch (e) {}
  }

  function playClawWoodSound() {
    const actx = getAudioCtx();
    if (!actx || actx.state === 'suspended') return;
    try {
      const now = actx.currentTime;
      const bufferSize = actx.sampleRate * 0.25;
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }
      const noise = actx.createBufferSource();
      noise.buffer = buffer;
      const filter = actx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(4.5, now);

      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);
      noise.start(now);
    } catch (e) {}
  }

  function playWoodCrashSound() {
    const actx = getAudioCtx();
    if (!actx || actx.state === 'suspended') return;
    try {
      const now = actx.currentTime;
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(now);
      osc.stop(now + 0.52);

      // Noise crack
      const bSize = actx.sampleRate * 0.35;
      const buf = actx.createBuffer(1, bSize, actx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bSize; i++) d[i] = (Math.random() * 2 - 1);
      const src = actx.createBufferSource();
      src.buffer = buf;
      const f = actx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(800, now);
      const ngain = actx.createGain();
      ngain.gain.setValueAtTime(0.6, now);
      ngain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      src.connect(f);
      f.connect(ngain);
      ngain.connect(actx.destination);
      src.start(now);
    } catch (e) {}
  }

  function playJarTapSound() {
    const actx = getAudioCtx();
    if (!actx || actx.state === 'suspended') return;
    try {
      const now = actx.currentTime;
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  function playMonsterGrowlSound(kind = 'grr-near', factor = 1) {
    if (typeof LiepMaSFX !== 'undefined') { LiepMaSFX.play(kind, factor); return; }
    const actx = getAudioCtx();
    if (!actx || actx.state === 'suspended') return;
    try {
      const now = actx.currentTime;
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(85, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.4);
      osc.frequency.linearRampToValueAtTime(95, now + 0.8);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.45, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.95);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(now);
      osc.stop(now + 1.0);
    } catch (e) {}
  }

  // Khởi tạo & Lưu trữ trạng thái
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && typeof d.state === 'string') {
          questData = { ...questData, ...d };
        }
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(questData));
    } catch (e) {}
  }

  const NIGHT_MUSIC_STATES = new Set([
    STATES.MIDNIGHT_WAKE,
    STATES.WINDOW_SHADOW,
    STATES.COUNTDOWN_HIDE,
    STATES.ATTACK_BED,
    STATES.ATTACK_WARDROBE,
    STATES.ATTACK_DOOR_EARLY,
    STATES.ATTACK_TIMEOUT,
    STATES.HIDING_JAR,
    STATES.AFTER_LEAVING_DECISION,
    STATES.CHASE_VILLAGE,
    STATES.CHASE_CAUGHT,
    STATES.TIME_SKIP_DAWN
  ]);

  function isNightRaidMusicActive() {
    if (questData.ruinsActive || !NIGHT_MUSIC_STATES.has(questData.state)) return false;
    if (questData.state === STATES.TIME_SKIP_DAWN && typeof Villagers !== 'undefined' && Villagers.minutes >= 360) {
      return false;
    }
    return true;
  }

  function isRuinsMusicActive() {
    if (questData.ruinsActive || questData.state === STATES.RUINS_EXPLORE || questData.state === STATES.COMPLETED) {
      return true;
    }
    if (questData.state === STATES.TIME_SKIP_DAWN && typeof Villagers !== 'undefined' && Villagers.minutes >= 360) {
      return true;
    }
    return false;
  }

  function syncNightRaidMusic() {
    if (typeof VillageMusic === 'undefined') return;
    if (isNightRaidMusicActive()) {
      if (typeof VillageMusic.setSceneMode === 'function') VillageMusic.setSceneMode('raid_night');
      else if (typeof VillageMusic.setRaidNightMode === 'function') VillageMusic.setRaidNightMode(true);
    } else if (isRuinsMusicActive()) {
      if (typeof VillageMusic.setSceneMode === 'function') VillageMusic.setSceneMode('ruins');
      else if (typeof VillageMusic.setRuinsMorningMode === 'function') VillageMusic.setRuinsMorningMode(true);
      else if (typeof VillageMusic.setRaidNightMode === 'function') VillageMusic.setRaidNightMode(false);
    } else {
      if (typeof VillageMusic.setSceneMode === 'function') VillageMusic.setSceneMode('peaceful');
      else if (typeof VillageMusic.setRaidNightMode === 'function') VillageMusic.setRaidNightMode(false);
    }
  }

  // Persist meaningful transitions, even when a browser refresh occurs before autosave.
  function transitionTo(nextState) {
    questData.state = nextState;
    syncNightRaidMusic();
    saveState();
  }

  function init() {
    loadState();
    // Kiểm tra liên tục nếu Quest 1 đã hoàn thành thì mở khóa Quest 2
    if (questData.state === STATES.LOCKED) {
      if (typeof Quest1 !== 'undefined' && Quest1.getState && Quest1.getState() === 'completed') {
        transitionTo(STATES.READY_TO_REST);
        saveState();
      }
    }
    syncNightRaidMusic();
  }

  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = 1;
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => { el.style.opacity = 0; }, 4200);
  }

  // Kích hoạt khi Tiểu Phàm nằm ngủ sau khi Quest 1 hoàn thành
  function triggerRestAtHome(player) {
    if (questData.state !== STATES.READY_TO_REST) return false;
    transitionTo(STATES.SLEEPING_START);
    stateTimer = 0;
    screenFadeAlpha = 0;
    saveState();
    showToast('Tiểu Phàm mệt mỏi nằm xuống giường, chìm vào giấc ngủ sau ngày dài...');
    return true;
  }

  // Bắt đầu thức giấc nửa đêm (00:00)
  function startMidnightWake(player) {
    transitionTo(STATES.MIDNIGHT_WAKE);
    stateTimer = 0;
    nightAmbientAlpha = 0.22;
    screenFadeAlpha = 0;

    // Đặt giờ làng thành 00:00 (nửa đêm)
    if (typeof Villagers !== 'undefined') {
      Villagers.minutes = 0; // 00:00
      const clockEl = document.getElementById('clock');
      if (clockEl) clockEl.textContent = `Ngày ${Villagers.day || 3} · 00:00`;
      const timeEl = document.getElementById('datetime-time');
      if (timeEl) timeEl.textContent = '00:00';
    }

    // Đặt Tiểu Phàm đứng cạnh giường (chống kẹt giường) & hồi phục 100 HP
    if (player) {
      player.x = 532;
      player.y = 232;
      player.dir = 'down';
      player.walk = 0;
      player.hp = player.maxHp || 100;
      player.knockedDown = false;
    }
    if (typeof p !== 'undefined' && p) {
      p.hp = p.maxHp || 100;
      p.knockedDown = false;
    }
    if (typeof TieuPhamHome !== 'undefined') {
      if (typeof TieuPhamHome.wakeForQuest === 'function') TieuPhamHome.wakeForQuest(player);
      TieuPhamHome.inside = true;
    }
    saveState();

    playHeartbeatSound();
    playMonsterGrowlSound('grr-distant', .85);
    showToast('⚡ MỘT TIẾNG THÉT THÊ LƯƠNG XÉ TOẠC MÀN ĐÊM! TIỂU PHÀM CHOÀNG TỈNH!');
  }

  // Tạo hiệu ứng mảnh vỡ văng tung tóe (gỗ gãy, mảnh sành gốm, giọt nước bắn, vách vỡ)
  function spawnDebrisBurst(x, y, kind = 'wood') {
    const count = kind === 'wall' ? 22 : kind === 'jar' ? 20 : kind === 'water' ? 14 : 18;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const spd = 45 + Math.random() * 115;
      let col = '#6e4c2f';
      let shape = 'splinter';
      let w = 6 + Math.random() * 8;
      let h = 2 + Math.random() * 2.8;
      if (kind === 'wood') {
        const palette = ['#47311e', '#6e4c2f', '#8c6440', '#ccb37c', '#586b64'];
        col = palette[i % palette.length];
        shape = i % 5 === 0 ? 'cloth' : 'splinter';
      } else if (kind === 'jar') {
        if (i % 2 === 0) {
          const palette = ['#855336', '#b87d56', '#4a2e1d', '#6e442b'];
          col = palette[i % palette.length];
          shape = 'shard';
          w = 5 + Math.random() * 5;
          h = 4 + Math.random() * 4;
        } else {
          col = 'rgba(135, 212, 235, 0.85)';
          shape = 'drop';
          w = 2.5 + Math.random() * 2;
          h = 2.5 + Math.random() * 2;
        }
      } else if (kind === 'water') {
        col = i % 2 === 0 ? 'rgba(145, 218, 240, 0.85)' : 'rgba(88, 162, 188, 0.8)';
        shape = 'drop';
        w = 2 + Math.random() * 2.2;
        h = 2 + Math.random() * 2.2;
      } else {
        const palette = ['#543a24', '#7a593d', '#a68967', '#3b2717'];
        col = palette[i % palette.length];
        shape = 'splinter';
      }
      debrisParticles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 14,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 35,
        gravity: 210,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 9,
        w,
        h,
        color: col,
        shape,
        alpha: 1.0
      });
    }
  }

  // Chọn chỗ trốn trong đêm tập kích
  function chooseHideSpot(spotId, player) {
    if (![STATES.MIDNIGHT_WAKE, STATES.WINDOW_SHADOW, STATES.COUNTDOWN_HIDE].includes(questData.state)) return false;
    const pl = player || (typeof p !== 'undefined' ? p : null);
    stateTimer = 0;
    cinematicSubStep = 0;
    monsterAlertPulse = 0;

    if (typeof TieuPhamHome !== 'undefined' && typeof TieuPhamHome.onQuestHideSpot === 'function') {
      TieuPhamHome.onQuestHideSpot(spotId, pl);
    }

    if (spotId === 'bed') {
      // Trốn gầm giường
      transitionTo(STATES.ATTACK_BED);
      questData.wallBroken = true;
      screenShake = 20;
      playWoodCrashSound();
      spawnDebrisBurst(374, 136, 'wall');
      if (pl) { pl.x = 548; pl.y = 198; pl.walk = 0; }
      showToast('Tiểu Phàm chui vội xuống gầm giường! RẦM!! Liệp Ma phá vỡ mảng tường lớn bước vào phòng...');
    } else if (spotId === 'wardrobe') {
      // Trốn trong tủ
      transitionTo(STATES.ATTACK_WARDROBE);
      questData.wallBroken = true;
      screenShake = 20;
      playWoodCrashSound();
      spawnDebrisBurst(374, 136, 'wall');
      if (pl) { pl.x = 129; pl.y = 160; pl.walk = 0; }
      showToast('Tiểu Phàm chui tọt vào tủ áo! RẦM!! Liệp Ma phá vỡ toác mảng tường lớn bước vào phòng...');
    } else if (spotId === 'door') {
      // Chạy ra cửa ngay lúc này
      transitionTo(STATES.ATTACK_DOOR_EARLY);
      questData.wallBroken = true;
      screenShake = 20;
      playWoodCrashSound();
      spawnDebrisBurst(374, 136, 'wall');
      if (pl) { pl.x = 352; pl.y = 398; pl.walk = 0; }
      showToast('Tiểu Phàm giật cửa lao ra, Liệp Ma đã sừng sững chặn ngay trước bậc thềm!');
    } else if (spotId === 'jar') {
      // Trốn trong chum nước (CON ĐƯỜNG DUY NHẤT)
      transitionTo(STATES.HIDING_JAR);
      questData.survivedInJar = true;
      questData.wallBroken = true;
      screenShake = 22;
      playWoodCrashSound();
      spawnDebrisBurst(596, 366, 'water');
      spawnDebrisBurst(374, 136, 'wall');
      if (pl) { pl.x = 596; pl.y = 381; pl.walk = 0; }
      showToast('Tiểu Phàm nhảy vào chum nước! RẦM!! Liệp Ma phá vỡ 1 mảng tường lớn và đi vào!');
    }
    saveState();
    return true;
  }

  // Tạo hiệu ứng số sát thương và vệt cào móng vuốt
  function spawnDamage(x, y, dmg, isCrit = false) {
    damageTexts.push({
      text: `-${dmg} HP`,
      x: x + (Math.random() - 0.5) * 16,
      y: y - 28,
      vy: -40,
      alpha: 1.0,
      color: isCrit ? '#ff1e32' : '#ff4d4d',
      font: isCrit ? 'bold 15px Georgia, serif' : 'bold 13px Georgia, serif'
    });
    clawMarks.push({ x, y: y - 10, alpha: 1.0 });
    bloodFlash = 0.65;
    screenShake = 16;
  }

  // YÊU CẦU: Yêu ma phải tấn công người và HP về 0 mới tính tử vong
  function applyMonsterAttack(player, damage, attackAnim = 'attack', reason = 'Bị Liệp Ma tấn công') {
    const targetPlayer = player || (typeof p !== 'undefined' ? p : null);
    updateMonsterAnim(0.016, attackAnim);
    playClawWoodSound();
    playMonsterGrowlSound();

    let curHp = 100;
    if (targetPlayer && typeof targetPlayer.hp === 'number') {
      curHp = targetPlayer.hp;
    } else if (typeof p !== 'undefined' && p && typeof p.hp === 'number') {
      curHp = p.hp;
    }

    const newHp = Math.max(0, curHp - damage);
    if (targetPlayer) {
      targetPlayer.hp = newHp;
    }
    if (typeof p !== 'undefined' && p) {
      p.hp = newHp;
    }

    const tx = targetPlayer ? targetPlayer.x : monster.x;
    const ty = targetPlayer ? targetPlayer.y : monster.y;
    spawnDamage(tx, ty, damage, newHp === 0);

    // CHỈ KHI HP VỀ 0 MỚI TÍNH LÀ TỬ VONG
    if (newHp <= 0) {
      if (targetPlayer) {
        targetPlayer.hp = 0;
        targetPlayer.knockedDown = true;
      }
      if (typeof p !== 'undefined' && p) {
        p.hp = 0;
        p.knockedDown = true;
      }
      setTimeout(() => {
        triggerDeath(reason);
      }, 850);
      return true; // Đã cạn kiệt HP
    }
    return false; // Còn sống
  }

  // Trigger chết và hiển thị màn hình Game Over (chỉ kích hoạt khi HP = 0)
  function triggerDeath(reason) {
    const pl = typeof p !== 'undefined' ? p : null;
    if (pl) {
      pl.hp = 0;
      pl.knockedDown = true;
    }
    deathReason = reason;
    screenShake = 18;
    playMonsterGrowlSound();

    setTimeout(() => {
      openDeathModal(reason);
    }, 900);
  }

  function openDeathModal(reason) {
    let modal = document.getElementById('quest2-death-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'quest2-death-modal';
      modal.className = 'quest2-death-overlay';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="quest2-death-card">
        <div class="death-skull">💀</div>
        <div class="death-title">KHÍ HUYẾT CẠN KIỆT (0 / 100 HP)</div>
        <div class="death-subtitle">NGƯƠI ĐÃ CHẾT</div>
        <div class="death-reason">${reason}</div>
        <div class="death-hint">✦ Trước sức mạnh tuyệt đối của yêu ma Luyện Khí kỳ, phàm nhân chỉ có thể dùng mưu trí ẩn nhẫn che giấu khí tức. ✦</div>
        <button id="quest2-retry-btn" class="quest2-retry-button">
          ↺ Chơi Lại Từ Đầu (00:00 Nửa Đêm)
        </button>
      </div>
    `;
    modal.hidden = false;

    const btn = document.getElementById('quest2-retry-btn');
    if (btn) {
      btn.onclick = () => {
        modal.hidden = true;
        retryFromCheckpoint();
      };
    }
  }

  function retryFromCheckpoint(player) {
    if(typeof LiepMaSFX !== 'undefined') LiepMaSFX.stop();
    const pl = player || (typeof p !== 'undefined' ? p : null);
    screenFadeAlpha = 0;
    screenShake = 0;
    damageTexts = [];
    clawMarks = [];
    debrisParticles = [];
    monsterAlertPulse = 0;
    bloodFlash = 0;

    // YÊU CẦU: Chết là chơi lại từ đầu (00:00 Nửa đêm)
    transitionTo(STATES.MIDNIGHT_WAKE);
    questData.bedBroken = false;
    questData.wardrobeBroken = false;
    questData.jarBroken = false;
    questData.wallBroken = false;
    questData.survivedInJar = false;
    questData.ruinsActive = false;
    questData.completed = false;
    saveState();

    // Hồi phục đầy đủ 100 HP cho Tiểu Phàm
    if (pl) {
      pl.hp = pl.maxHp || 100;
      pl.knockedDown = false;
    }
    if (typeof p !== 'undefined' && p) {
      p.hp = p.maxHp || 100;
      p.knockedDown = false;
    }

    startMidnightWake(pl);
    showToast('Chơi lại từ đầu: 00:00 Nửa đêm — Tiếng thét xé toạc màn đêm!');
  }

  // Cập nhật Sprite Liệp Ma
  function updateMonsterAnim(dt, action) {
    if (monster.action !== action) {
      monster.action = action;
      monster.frame = 0;
      monster.frameTimer = 0;
    }
    const baseCfg = LIEP_MA_ANIMS[action] || LIEP_MA_ANIMS.idle;
    const isIndoor = [
      STATES.WINDOW_SHADOW, STATES.ATTACK_TIMEOUT, STATES.ATTACK_BED,
      STATES.ATTACK_WARDROBE, STATES.ATTACK_DOOR_EARLY, STATES.HIDING_JAR
    ].includes(questData.state);
    // Khi ở trong nhà: bước chân chậm rãi, nặng nề (3.8 FPS) và đánh hơi sâu lắng (3.5 FPS)
    const fps = isIndoor ? (action === 'walk' ? 3.8 : action === 'sniff' ? 3.5 : baseCfg.fps) : baseCfg.fps;
    monster.frameTimer += dt;
    const frameDur = 1.0 / fps;
    if (monster.frameTimer >= frameDur) {
      monster.frameTimer -= frameDur;
      if (monster.frame + 1 < baseCfg.frames) {
        monster.frame++;
      } else if (baseCfg.loop) {
        monster.frame = 0;
      }
    }
  }

  function getRenderContext() {
    return {
      STATES,
      questData,
      stateTimer,
      countdownTimer,
      monster,
      jarRaidPose: questData.state === STATES.HIDING_JAR ? jarRaidPose(stateTimer) : null,
      jarRaidTimeline: JAR_RAID,
      liepMaLoaded,
      LIEP_MA_IMG,
      LIEP_MA_ANIMS,
      monsterAlertPulse,
      bloodFlash,
      nightAmbientAlpha,
      screenShake,
      screenFadeAlpha,
      debrisParticles,
      clawMarks,
      damageTexts
    };
  }

  // Vẽ Sprite Liệp Ma (const shadowW in quest2-render.js)
  function drawMonster(ctx, x, y, facing = 1, timeSec = 0) {
    Quest2Render.drawMonster(ctx, x, y, facing, timeSec, getRenderContext());
  }

  // -------------------------------------------------------------
  // UPDATE LOOP CHÍNH CỦA NHIỆM VỤ 2
  // -------------------------------------------------------------
  function update(dt, timeSec, player, villagers, dtReal = dt) {
    // Tự động kiểm tra mở khóa sau Quest 1
    if (questData.state === STATES.LOCKED) {
      if (typeof Quest1 !== 'undefined' && Quest1.getState && Quest1.getState() === 'completed') {
        transitionTo(STATES.READY_TO_REST);
        saveState();
        const anActive = typeof ANguyetStory !== 'undefined' && ANguyetStory.getStage &&
          !['farewell', 'completed', 'missed'].includes(ANguyetStory.getStage());
        if (!anActive) {
          showToast('✦ Nhiệm Vụ 2 Bắt Đầu: Hãy về nhà nằm lên giường nghỉ ngơi.');
        }
      }
      return;
    }

    stateTimer += dt;
    syncNightRaidMusic();
    if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 24);
    if (monsterAlertPulse > 0) monsterAlertPulse = Math.max(0, monsterAlertPulse - dt * 1.15);

    // Cập nhật các hiệu ứng chiến đấu sát thương, vệt cào, mảnh vỡ & màn hình chớp máu
    if (bloodFlash > 0) bloodFlash = Math.max(0, bloodFlash - dt * 1.6);
    for (let i = damageTexts.length - 1; i >= 0; i--) {
      const d = damageTexts[i];
      d.y += d.vy * dt;
      d.alpha -= dt * 0.9;
      if (d.alpha <= 0) damageTexts.splice(i, 1);
    }
    for (let i = clawMarks.length - 1; i >= 0; i--) {
      const c = clawMarks[i];
      c.alpha -= dt * 1.5;
      if (c.alpha <= 0) clawMarks.splice(i, 1);
    }
    for (let i = debrisParticles.length - 1; i >= 0; i--) {
      const pt = debrisParticles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += pt.gravity * dt;
      pt.rot += pt.vrot * dt;
      pt.alpha -= dt * 0.78;
      if (pt.alpha <= 0) debrisParticles.splice(i, 1);
    }

    // 1. SLEEPING_START: Fade tối màn hình rồi chuyển sang 00:00
    if (questData.state === STATES.SLEEPING_START) {
      screenFadeAlpha = Math.min(1.0, stateTimer / 1.4);
      if (stateTimer >= 1.6) {
        startMidnightWake(player);
      }
    }

    // 2. MIDNIGHT_WAKE: Thức giấc, màn hình mờ sáng, nghe tiếng cào vách
    else if (questData.state === STATES.MIDNIGHT_WAKE) {
      nightAmbientAlpha = 0.22;
      if (stateTimer % 1.2 < dt) playHeartbeatSound();
      if (stateTimer >= 2.2) {
        transitionTo(STATES.WINDOW_SHADOW);
        stateTimer = 0;
        cinematicSubStep = 0;
        playClawWoodSound();
        playMonsterGrowlSound('grr-distant');
        showToast('Có thứ gì đó cực kỳ to lớn... đang dừng lại ngoài cửa sổ nhà ngươi!');
      }
    }

    // 3. WINDOW_SHADOW: Bóng đen ngoài cửa sổ (wx:344, wy:68)
    else if (questData.state === STATES.WINDOW_SHADOW) {
      updateMonsterAnim(dt, 'sniff');
      if (stateTimer % 1.0 < dt) playHeartbeatSound();
      if (stateTimer >= 1.2 && cinematicSubStep === 0) {
        cinematicSubStep = 1;
        playClawWoodSound();
        playMonsterGrowlSound('sniff');
      }
      if (stateTimer >= 3.8) {
        // Chuyển sang 10 giây sinh tử để trốn (không hiển thị hướng dẫn)
        transitionTo(STATES.COUNTDOWN_HIDE);
        countdownTimer = 10.0;
        stateTimer = 0;
      }
    }

    // 4. COUNTDOWN_HIDE: 10 Giây sinh tử
    else if (questData.state === STATES.COUNTDOWN_HIDE) {
      // dt is capped for physics; the 10-second deadline is wall-clock time.
      countdownTimer = Math.max(0, countdownTimer - Math.max(0, dtReal));
      // Ba đợt cào tường leo thang, không phát liên tục theo từng khung hình.
      const breachProgress = 1 - countdownTimer / 10;
      const impactThresholds = [0.24, 0.52, 0.79];
      if (cinematicSubStep < impactThresholds.length && breachProgress >= impactThresholds[cinematicSubStep]) {
        cinematicSubStep++;
        screenShake = Math.max(screenShake, 3 + cinematicSubStep * 2.5);
        playClawWoodSound();
      }
      heartbeatTimer += dt;
      const hbInterval = Math.max(0.35, countdownTimer / 12);
      if (heartbeatTimer >= hbInterval) {
        heartbeatTimer = 0;
        playHeartbeatSound();
      }

      // Tự động kiểm tra vị trí người chơi tới gần chum nước hoặc chạy ra cửa chính
      // (Giường và tủ gỗ yêu cầu nhấn nút tương tác CHUI GẦM / TRỐN TỦ hoặc chạm trực tiếp để tránh vô tình bước sượt qua đầu giường bị tính chết)
      if (player && typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside) {
        // Chum nước góc nhà: x: 570..624, y: 355..405
        if (player.x >= 566 && player.x <= 628 && player.y >= 352 && player.y <= 408) {
          chooseHideSpot('jar', player);
          return;
        }
        // Cửa chính: y >= 410
        if (player.y >= 410) {
          chooseHideSpot('door', player);
          return;
        }
      }

      // Hết 10 giây chưa chọn chỗ trốn
      if (countdownTimer <= 0) {
        transitionTo(STATES.ATTACK_TIMEOUT);
        questData.wallBroken = true;
        stateTimer = 0;
        cinematicSubStep = 0;
        screenShake = 22;
        playWoodCrashSound();
        spawnDebrisBurst(374, 136, 'wall');
        showToast('⚡ RẦM!! Liệp Ma phá vỡ toạc một mảng tường lớn bước vào phòng...');
      }
    }

    // 4b. ATTACK_TIMEOUT: Chần chừ không trốn -> Liệp Ma bước vào, đánh hơi phát hiện rồi mới lao tới tấn công
    else if (questData.state === STATES.ATTACK_TIMEOUT) {
      if (stateTimer < 0.8) {
        updateMonsterAnim(dt, 'sniff');
      } else if (stateTimer < 1.4) {
        updateMonsterAnim(dt, 'walk');
      } else if (stateTimer < 2.4) {
        updateMonsterAnim(dt, 'attack');
      } else {
        updateMonsterAnim(dt, 'bite');
      }
      if (stateTimer >= 0.8 && cinematicSubStep < 1) {
        cinematicSubStep = 1;
        monsterAlertPulse = 1.05;
        questData.jarBroken = true;
        spawnDebrisBurst(596, 381, 'jar');
        playMonsterGrowlSound('grr-near');
        showToast('❗ Liệp Ma đã khóa chặt ánh mắt đỏ rực vào ngươi!');
      }
      if (stateTimer >= 1.4 && cinematicSubStep < 2) {
        cinematicSubStep = 2;
        applyMonsterAttack(player, 50, 'attack', 'Liệp Ma phá vỡ tường từng bước tiến vào cào rách người ngươi!');
      }
      if (stateTimer >= 2.6 && cinematicSubStep < 3) {
        cinematicSubStep = 3;
        applyMonsterAttack(player, 50, 'bite', 'Ngươi chần chừ không kịp tìm chỗ trốn. Liệp Ma phá vỡ tường lao vào kết liễu ngươi!');
      }
    }

    // 5. ATTACK_BED: Liệp Ma bước vào đánh hơi -> Khựng lại phát hiện mùi dưới gầm giường -> Đập sập giường -> Vồ cắn
    else if (questData.state === STATES.ATTACK_BED) {
      if (stateTimer < 1.3) {
        // Giai đoạn 1 (0.0s -> 1.3s): Bước vào phòng chậm rãi & hạ đầu đánh hơi tìm kiếm
        updateMonsterAnim(dt, stateTimer < 0.8 ? 'sniff' : 'walk');
      } else if (stateTimer < 2.3) {
        // Giai đoạn 2 (1.3s -> 2.3s): Dừng sát mép giường, áp sát mặt rà mũi sát sàn đánh hơi & gầm gừ
        updateMonsterAnim(dt, 'sniff');
      } else if (stateTimer < 4.2) {
        // Giai đoạn 3 & 4a (2.3s -> 4.2s): Đập sập giường & vồ cào đòn 1
        updateMonsterAnim(dt, 'attack');
      } else {
        // Giai đoạn 4b (>= 4.2s): Đòn kết liễu thứ 2
        updateMonsterAnim(dt, 'bite');
      }

      if (stateTimer >= 1.5 && cinematicSubStep < 1) {
        cinematicSubStep = 1;
        monsterAlertPulse = 1.1;
        playMonsterGrowlSound('sniff');
        playMonsterGrowlSound('grr-near');
        showToast('❗ Liệp Ma dừng bước trước giường... Mũi phập phồng đánh hơi luồng khí nóng dưới gầm giường!');
      }
      if (stateTimer >= 2.3 && cinematicSubStep < 2) {
        cinematicSubStep = 2;
        questData.bedBroken = true;
        questData.jarBroken = true;
        screenShake = 18;
        playWoodCrashSound();
        spawnDebrisBurst(548, 165, 'wood');
        spawnDebrisBurst(596, 381, 'jar');
        showToast('⚡ RẦM!! Liệp Ma gầm thét, vung trọn móng vuốt đập sập nát chiếc giường gỗ!');
      }
      if (stateTimer >= 3.3 && cinematicSubStep < 3) {
        cinematicSubStep = 3;
        applyMonsterAttack(player, 50, 'attack', 'Liệp Ma bổ nát giường kéo ngươi ra cào xé!');
      }
      if (stateTimer >= 4.4 && cinematicSubStep < 4) {
        cinematicSubStep = 4;
        applyMonsterAttack(player, 50, 'bite', 'Liệp Ma ngửi thấy mùi người trên giường, giơ vuốt đập nát vụn khung gỗ và cắn xé ngươi dưới gầm!');
      }
    }

    // 6. ATTACK_WARDROBE: Liệp Ma bước vào đánh hơi -> Khựng lại phát hiện trước khe tủ -> Xé toạc cánh tủ -> Vồ cắn
    else if (questData.state === STATES.ATTACK_WARDROBE) {
      if (stateTimer < 1.3) {
        // Giai đoạn 1 (0.0s -> 1.3s): Bước vào phòng chậm rãi & hạ đầu đánh hơi tìm kiếm
        updateMonsterAnim(dt, stateTimer < 0.8 ? 'sniff' : 'walk');
      } else if (stateTimer < 2.3) {
        // Giai đoạn 2 (1.3s -> 2.3s): Khựng lại trước tủ gỗ, áp sát mắt mũi vào khe cửa đánh hơi phát hiện
        updateMonsterAnim(dt, 'sniff');
      } else if (stateTimer < 4.2) {
        // Giai đoạn 3 & 4a (2.3s -> 4.2s): Giật tung cánh tủ & vồ cào đòn 1
        updateMonsterAnim(dt, 'attack');
      } else {
        // Giai đoạn 4b (>= 4.2s): Đòn kết liễu thứ 2
        updateMonsterAnim(dt, 'bite');
      }

      if (stateTimer >= 1.5 && cinematicSubStep < 1) {
        cinematicSubStep = 1;
        monsterAlertPulse = 1.1;
        playMonsterGrowlSound('sniff');
        playMonsterGrowlSound('grr-near');
        showToast('❗ Liệp Ma dừng bước trước tủ gỗ... Hơi thở nóng rực phả thẳng vào khe cửa tủ!');
      }
      if (stateTimer >= 2.3 && cinematicSubStep < 2) {
        cinematicSubStep = 2;
        questData.wardrobeBroken = true;
        questData.jarBroken = true;
        screenShake = 18;
        playWoodCrashSound();
        spawnDebrisBurst(129, 135, 'wood');
        spawnDebrisBurst(596, 381, 'jar');
        showToast('⚡ RẦM!! Liệp Ma giật tung toác hai cánh cửa tủ, mảnh gỗ vỡ bắn khắp sàn!');
      }
      if (stateTimer >= 3.3 && cinematicSubStep < 3) {
        cinematicSubStep = 3;
        applyMonsterAttack(player, 50, 'attack', 'Liệp Ma giật toạc cánh tủ cào rách người ngươi!');
      }
      if (stateTimer >= 4.4 && cinematicSubStep < 4) {
        cinematicSubStep = 4;
        applyMonsterAttack(player, 50, 'bite', 'Liệp Ma áp mắt vào khe cửa tủ rồi giật tung toác 2 cánh cửa, kéo ngươi ra vồ cắn tan xác!');
      }
    }

    // 7. ATTACK_DOOR_EARLY: Chạy ra cửa chạm mặt Liệp Ma (có nhịp khựng phát hiện trước khi vồ)
    else if (questData.state === STATES.ATTACK_DOOR_EARLY) {
      if (stateTimer < 1.1) {
        updateMonsterAnim(dt, 'sniff');
      } else if (stateTimer < 2.1) {
        updateMonsterAnim(dt, 'attack');
      } else {
        updateMonsterAnim(dt, 'bite');
      }
      if (stateTimer >= 0.25 && cinematicSubStep < 1) {
        cinematicSubStep = 1;
        monsterAlertPulse = 1.05;
        playMonsterGrowlSound('sniff');
        playMonsterGrowlSound('grr-near');
      }
      if (stateTimer >= 1.2 && cinematicSubStep < 2) {
        cinematicSubStep = 2;
        applyMonsterAttack(player, 50, 'attack', 'Vừa mở cửa lao ra bậc thềm, ngươi đã bị Liệp Ma vồ cào toác ngực!');
      }
      if (stateTimer >= 2.3 && cinematicSubStep < 3) {
        cinematicSubStep = 3;
        applyMonsterAttack(player, 50, 'bite', 'Vừa mở cửa lao ra bậc thềm, ngươi đã đâm sầm vào ngực Liệp Ma và bị nó đè bẹp cắn xé tức thì!');
      }
    }

    // 8. HIDING_JAR: hai cú chém hữu hình, không tự phá đồ khi quái vừa đi vào.
    else if (questData.state === STATES.HIDING_JAR) {
      const raid = jarRaidPose(stateTimer);
      updateMonsterAnim(dt, raid.action);

      // Vỡ vách khi xuất hiện; chỉ vách nhà chịu tác động ở giai đoạn này.
      if (cinematicSubStep < 1) {
        cinematicSubStep = 1;
        questData.wallBroken = true;
        screenShake = 22;
        playWoodCrashSound();
        showToast('⚡ RẦM! Liệp Ma bước qua bức tường vừa bị phá, chậm rãi rà soát căn phòng...');
      }
      if (stateTimer >= 1.1 && cinematicSubStep < 2) {
        cinematicSubStep = 2;
        playMonsterGrowlSound('sniff');
      }
      if (stateTimer >= 4.32 && cinematicSubStep < 3) {
        cinematicSubStep = 3;
        playMonsterGrowlSound('grr-near');
        showToast('Liệp Ma dừng trước giường, nhe nanh rồi giơ cao móng vuốt...');
      }
      // Thời điểm va chạm cố định, khớp động tác chém trong quest2-render.js.
      if (stateTimer >= JAR_RAID.bedImpact) strikeFurniture('bed');
      if (stateTimer >= 8.85 && cinematicSubStep < 4) {
        cinematicSubStep = 4;
        playMonsterGrowlSound('sniff');
        showToast('Nó quay sang chiếc tủ, ghé sát khe cửa và vung vuốt...');
      }
      if (stateTimer >= JAR_RAID.wardrobeImpact) strikeFurniture('wardrobe');
      if (stateTimer >= 14.45 && cinematicSubStep < 5) {
        cinematicSubStep = 5;
        playMonsterGrowlSound('sniff');
        showToast('Liệp Ma khom người xuống cạnh chum nước, hít hà tìm hơi người sống...');
      }
      if (stateTimer >= JAR_RAID.jarTap && cinematicSubStep < 6) {
        cinematicSubStep = 6;
        playJarTapSound();
        spawnDebrisBurst(596, 366, 'water');
        showToast('Cộc... cộc... Móng vuốt khẽ gõ nắp chum. Tiểu Phàm nín thở.');
      }
      if (stateTimer >= JAR_RAID.departure && cinematicSubStep < 7) {
        cinematicSubStep = 7;
        playMonsterGrowlSound('grr-near');
        showToast('Không bắt được mùi người... Liệp Ma quay người rời khỏi căn nhà đổ nát.');
      }
      if (stateTimer >= JAR_RAID.finished) {
        transitionTo(STATES.AFTER_LEAVING_DECISION);
        stateTimer = 0;
      }
    }

    // 8b. AFTER_LEAVING_DECISION (Tự tương tác môi trường: di chuyển/bấm nút là trèo ra, chờ 5s là tới sáng)
    else if (questData.state === STATES.AFTER_LEAVING_DECISION) {
      // Nếu người chơi có thao tác di chuyển, lập tức trèo ra khỏi chum chạy trốn ngoài làng (Nhánh A)
      if (player && player.walk > 0) {
        startVillageChase(player);
        return;
      }
      // Nếu người chơi kiên nhẫn ẩn mình 5 giây trong chum mà không di chuyển (Nhánh B)
      if (stateTimer >= 5.0) {
        startWaitUntilDawn();
        return;
      }
    }

    // 9. CHASE_VILLAGE (Nhánh A: Tự do chạy trốn trên map làng, Liệp Ma phát hiện rồi rượt đuổi)
    else if (questData.state === STATES.CHASE_VILLAGE) {
      chaseAttackCooldown = Math.max(0, chaseAttackCooldown - dt);
      const targetPl = player || (typeof p !== 'undefined' ? p : null);
      if (targetPl) {
        const dx = targetPl.x - monster.x;
        const dy = targetPl.y - monster.y;
        const dist = Math.hypot(dx, dy);
        const inHomeChase = typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside;

        monster.facing = dx >= 0 ? 1 : -1;
        // 0.45s đầu tiên Liệp Ma khựng lại, đánh hơi rồi mới tăng tốc.
        if (stateTimer < 0.45) {
          updateMonsterAnim(dt, 'sniff');
          return;
        }

        let chaseAction = 'run';
        let canAdvance = true;
        if (dist < 48) {
          chaseAction = 'attack';
        } else if (inHomeChase) {
          // Trong nhà: bớt cảm giác lao như máy. Liệp Ma vừa đi vừa rà mùi.
          monster.speed = 112;
          const phase = (stateTimer - 0.45) % 1.15;
          if (phase < 0.28) {
            chaseAction = 'sniff';
            canAdvance = false;
          } else {
            chaseAction = 'walk';
          }
        } else {
          monster.speed = 220;
          chaseAction = 'run';
        }
        updateMonsterAnim(dt, chaseAction);

        if (dist > 28 && canAdvance) {
          const moveDist = monster.speed * dt;
          monster.x += (dx / dist) * moveDist;
          monster.y += (dy / dist) * moveDist;
        }

        // Tấn công khi bắt kịp người chơi (dist <= 40)
        if (dist <= 40 && chaseAttackCooldown <= 0) {
          const curHp = typeof targetPl.hp === 'number' ? targetPl.hp : 100;
          if (curHp > 50) {
            // Đòn thứ 1: vồ cào lưng -> trừ 50 HP (còn 50 HP)
            applyMonsterAttack(targetPl, 50, 'attack', 'Liệp Ma vồ cào lưng ngươi!');
            chaseAttackCooldown = 1.0;
            showToast('⚠️ Bị Liệp Ma cào toác lưng (-50 HP)! Ngươi còn 50 HP! Mau chạy trốn!');
          } else {
            // Đòn thứ 2: kết liễu -> trừ 50 HP (HP về 0)
            transitionTo(STATES.CHASE_CAUGHT);
            stateTimer = 0;
            applyMonsterAttack(targetPl, 50, 'bite', 'Liệp Ma chạy bằng 2 chân với tốc độ vượt trội gấp đôi phàm nhân! Ngươi không thể thoát bằng cách chạy bộ giữa đêm tối!');
          }
        }
      }
    }

    else if (questData.state === STATES.CHASE_CAUGHT) {
      updateMonsterAnim(dt, 'bite');
    }

    // 10. TIME_SKIP_DAWN (Nhánh B: Nấp tới 06:00 sáng)
    else if (questData.state === STATES.TIME_SKIP_DAWN) {
      if (stateTimer < 2.0) {
        screenFadeAlpha = Math.min(1.0, stateTimer / 1.5);
      } else if (stateTimer < 3.5) {
        // Chuyển giờ làng tới 06:00 sáng bình minh
        if (typeof Villagers !== 'undefined') {
          Villagers.minutes = 360; // 06:00 AM
          const clockEl = document.getElementById('clock');
          if (clockEl) clockEl.textContent = `Ngày ${Villagers.day || 4} · 06:00`;
          const timeEl = document.getElementById('datetime-time');
          if (timeEl) timeEl.textContent = '06:00';
        }
        screenFadeAlpha = Math.max(0, 1.0 - (stateTimer - 2.0) / 1.5);
      } else {
        // Trời sáng, Tiểu Phàm trèo ra khỏi chum ngay trong nhà, tự di chuyển ra map làng
        transitionTo(STATES.RUINS_EXPLORE);
        questData.completed = true;
        questData.ruinsActive = true;
        syncNightRaidMusic();
        if(typeof LiepMaSFX !== 'undefined') LiepMaSFX.stop();
        if (player && typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside) {
          player.x = 556;
          player.y = 356;
          player.dir = 'down';
        }
        saveState();
        if (typeof GameSave !== 'undefined' && GameSave.save) GameSave.save(true, player);
        stateTimer = 0;
        showToast('☀️ Trời đã sáng (06:00)... Tiếng gầm rú ngoài làng đã tắt hẳn. Mau bước ra cửa xem tình hình!');
        openVictoryModal();
      }
    }
  }

  // Đã xóa bảng hiển thị hoàn thành nhiệm vụ theo yêu cầu
  function openVictoryModal() {
    const modal = typeof document !== 'undefined' ? document.getElementById('quest2-victory-modal') : null;
    if (modal) modal.hidden = true;
    questData.completed = true;
    questData.ruinsActive = true;
    saveState();

    const pl = typeof p !== 'undefined' ? p : null;
    const inHome = typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside;
    if (pl && inHome) {
      if (pl.x > 560 && pl.y > 348) {
        pl.x = 556;
        pl.y = 356;
        pl.dir = 'down';
      }
    }
    if (typeof GameSave !== 'undefined' && GameSave.save) GameSave.save(true, pl);
    if (!inHome && typeof Quest3 !== 'undefined' && typeof Quest3.triggerFromDawn === 'function') {
      Quest3.triggerFromDawn(pl, true);
    }
  }

  // Bắt đầu Nhánh A: Trèo ra khỏi chum trong nhà, tự chạy ra cửa hoặc bị Liệp Ma truy sát
  function startVillageChase(player) {
    transitionTo(STATES.CHASE_VILLAGE);
    stateTimer = 0;
    monsterAlertPulse = 1.1;
    const inHome = typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside;
    if (player && inHome) {
      player.x = 556;
      player.y = 356;
      player.dir = 'down';
      monster.x = 374;
      monster.y = 148;
    } else {
      if (player) {
        player.x = 221;
        player.y = 314;
      }
      monster.x = 160;
      monster.y = 230;
      monster.speed = 220;
    }
    monster.speed = inHome ? 112 : 220;
    playMonsterGrowlSound();
    saveState();
  }

  function onPlayerExitHome(player) {
    if (questData.state === STATES.CHASE_VILLAGE) {
      monster.x = 160;
      monster.y = 230;
      monster.speed = 220;
    }
  }

  // Called by actual keyboard/joystick movement, including when the player is inside a solid jar.
  function handleMovementIntent(player) {
    if (questData.state !== STATES.AFTER_LEAVING_DECISION) return false;
    startVillageChase(player);
    return true;
  }

  function isNavigationLocked() {
    return questData.state !== STATES.LOCKED &&
      questData.state !== STATES.READY_TO_REST &&
      questData.state !== STATES.RUINS_EXPLORE &&
      questData.state !== STATES.COMPLETED;
  }

  // Freeze autonomous day/night time while a scripted midnight survival scene controls the clock.
  function isWorldTimeFrozen() { return isNavigationLocked(); }

  // Resume policy: interrupted combat/cinematic replays safely from 00:00.
  // Called after the generic game save has restored the player/world positions.
  function restoreAfterLoad(player) {
    if (questData.state === STATES.RUINS_EXPLORE) {
      questData.completed = true;
      questData.ruinsActive = true;
      syncNightRaidMusic();
      const pl = player || (typeof p !== 'undefined' ? p : null);
      if (pl && typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside) {
        if (pl.x > 560 && pl.y > 348) {
          pl.x = 556; pl.y = 356; pl.dir = 'down';
        }
        if (typeof GameSave !== 'undefined' && GameSave.save) GameSave.save(true, pl);
      }
      if (typeof Quest3 !== 'undefined' && Quest3.isStarted && Quest3.isStarted()) {
        transitionTo(STATES.COMPLETED);
        questData.completed = true;
        saveState();
        Quest3.restoreAfterLoad(pl);
        return 'completed';
      }
      openVictoryModal();
      return 'victory';
    }
    if (questData.state === STATES.COMPLETED) {
      questData.completed = true;
      questData.ruinsActive = true;
      syncNightRaidMusic();
      const pl = player || (typeof p !== 'undefined' ? p : null);
      const inHome = typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside;
      if (pl && inHome) {
        if (pl.x > 560 && pl.y > 348) {
          pl.x = 556; pl.y = 356; pl.dir = 'down';
        }
        if (typeof GameSave !== 'undefined' && GameSave.save) GameSave.save(true, pl);
      }
      if (typeof Quest3 !== 'undefined') {
        if (Quest3.isStarted && Quest3.isStarted()) {
          Quest3.restoreAfterLoad(pl);
        } else if (!inHome && typeof Quest3.triggerFromDawn === 'function') {
          Quest3.triggerFromDawn(pl, true);
        }
      }
      return 'completed';
    }
    const interrupted = [
      STATES.SLEEPING_START, STATES.MIDNIGHT_WAKE, STATES.WINDOW_SHADOW,
      STATES.COUNTDOWN_HIDE, STATES.ATTACK_BED, STATES.ATTACK_WARDROBE,
      STATES.ATTACK_DOOR_EARLY, STATES.ATTACK_TIMEOUT, STATES.HIDING_JAR,
      STATES.AFTER_LEAVING_DECISION, STATES.CHASE_VILLAGE,
      STATES.CHASE_CAUGHT, STATES.TIME_SKIP_DAWN
    ].includes(questData.state);
    if (!interrupted) return 'unchanged';
    questData.bedBroken = false;
    questData.wardrobeBroken = false;
    questData.jarBroken = false;
    questData.wallBroken = false;
    questData.survivedInJar = false;
    questData.ruinsActive = false;
    questData.completed = false;
    stateTimer = 0;
    countdownTimer = 10;
    cinematicSubStep = 0;
    nightAmbientAlpha = 0.22;
    damageTexts = [];
    clawMarks = [];
    debrisParticles = [];
    monsterAlertPulse = 0;
    bloodFlash = 0;
    if (typeof TieuPhamHome !== 'undefined') TieuPhamHome.inside = true;
    startMidnightWake(player || (typeof p !== 'undefined' ? p : null));
    saveState();
    return 'midnight';
  }

  // Bắt đầu Nhánh B: Tiếp tục nấp trong chum tới bình minh
  function startWaitUntilDawn() {
    transitionTo(STATES.TIME_SKIP_DAWN);
    stateTimer = 0;
    showToast('Tiểu Phàm cắn chặt môi, kiên nhẫn ẩn mình dưới lớp bùn nước chờ trời sáng...');
  }

  // -------------------------------------------------------------
  // VẼ HUD & CÁC LỚP CINEMATIC TRÊN MÀN HÌNH (TÁCH SANG quest2-render.js)
  // -------------------------------------------------------------
  function drawHUD(ctx, player, screenW, screenH, timeSec, dt) {
    Quest2Render.drawHUD(ctx, player, screenW, screenH, timeSec, dt, getRenderContext());
  }

  function isInputLocked() {
    return [
      STATES.SLEEPING_START,
      STATES.ATTACK_BED,
      STATES.ATTACK_WARDROBE,
      STATES.ATTACK_DOOR_EARLY,
      STATES.ATTACK_TIMEOUT,
      STATES.HIDING_JAR,
      STATES.TIME_SKIP_DAWN,
      STATES.CHASE_CAUGHT
    ].includes(questData.state);
  }

  // Xử lý Click / Chạm màn hình cho Quest 2 (chỉ nhận vùng chum nước hoặc cửa ra vào để tránh chạm nhầm HUD)
  function handleClick(rx, ry, player) {
    if (questData.state === STATES.AFTER_LEAVING_DECISION) {
      if (rx >= 260 && ry >= 320) {
        startVillageChase(player);
        return true;
      }
    }
    return false;
  }

  function drawWorld(ctx, timeSec) {
    Quest2Render.drawWorld(ctx, timeSec, getRenderContext());
  }

  // VillageRaidFX.drawInterior(ctx,timeSec) được gọi trong Quest2Render.drawInHome
  function drawInHome(ctx, timeSec) {
    Quest2Render.drawInHome(ctx, timeSec, getRenderContext());
  }

  return {
    init,
    update,
    drawHUD,
    drawWorld,
    drawInHome,
    handleClick,
    triggerRestAtHome,
    chooseHideSpot,
    startVillageChase,
    onPlayerExitHome,
    startWaitUntilDawn,
    retryFromCheckpoint,
    startMidnightWake,
    openVictoryModal,
    saveState,
    restoreAfterLoad,
    handleMovementIntent,
    isInputLocked,
    isNavigationLocked,
    isWorldTimeFrozen,
    isNightRaidMusicActive,
    isRuinsMusicActive,
    getState: () => questData.state,
    getStateTimer: () => stateTimer,
    getCinematicSubStep: () => cinematicSubStep,
    isHidingInJar: () => Boolean(questData.survivedInJar && (questData.state === STATES.HIDING_JAR || questData.state === STATES.AFTER_LEAVING_DECISION || questData.state === STATES.TIME_SKIP_DAWN)),
    isHidingInWardrobe: () => Boolean(questData.state === STATES.ATTACK_WARDROBE),
    isHidingUnderBed: () => Boolean(questData.state === STATES.ATTACK_BED),
    isCompleted: () => questData.completed,
    isVillageRuined: () => questData.ruinsActive,
    isBedBroken: () => questData.bedBroken,
    isWardrobeBroken: () => questData.wardrobeBroken,
    isJarBroken: () => Boolean(questData.jarBroken),
    isWallBroken: () => questData.wallBroken,
    getData: () => ({ ...questData }),
    resetState: () => {
      questData = {
        version: 1,
        state: STATES.LOCKED,
        completed: false,
        ruinsActive: false,
        bedBroken: false,
        wardrobeBroken: false,
        jarBroken: false,
        wallBroken: false,
        survivedInJar: false
      };
      debrisParticles = [];
      monsterAlertPulse = 0;
      syncNightRaidMusic();
      saveState();
    }
  };
})();
