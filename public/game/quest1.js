'use strict';

/**
 * NHIỆM VỤ 1: TIÊN DUYÊN KHỞI ĐẦU
 * Hồi 1: Lời Báo Của Trưởng Làng
 * Hồi 2: Tiên Nhân Giáng Lâm — Khảo Nghiệm Linh Căn
 */
const Quest1 = (() => {
  const STORAGE_KEY = 'lang_du_lam_quest1_v1';

  const {
    STATES,
    AVATARS,
    SQUARE_CENTER,
    LEGACY_SQUARE_CENTER,
    LUC_NHAM_STAND,
    CHIEF_SQUARE_POS,
    STONE_POS,
    TEST_STAND_POS,
    PHAM_SQUARE_POS,
    AHUY_SQUARE_POS,
    AHUY_PASSED_POS,
    CANDIDATE_STATES,
    STONE_STATES,
    TEENAGER_QUEUE_SLOTS,
    FARMER_WATCH_SLOTS,
    VILLAGER_WATCH_SLOTS
  } = Quest1Data;

  let questData = {
    version: 1,
    state: STATES.CHIEF_APPROACHING,
    approachDelay: 30.0,
    hasMetChief: false,
    registeredDay: null,
    choice: null,
    history: [],
    spiritualRoot: null,
    rivalryReaction: null,
    completed: false
  };

  let questDetailTimer = 0;

  let initialized = false;
  let dialogueActive = false;
  let currentScript = [];
  let scriptIndex = 0;
  let isTyping = false;
  let displayedText = '';
  let fullText = '';
  let typeIndex = 0;
  let typeTimer = null;
  let routeTimer = 0;
  let calloutCooldown = 0;
  let toastTimer = 0;
  let toastMessage = '';
  let cachedChief = null;
  let cachedVillagers = null;
  let cachedPlayer = null;

  // Cinematic & Ceremony State Variables
  let cinematicStep = 0;
  let cinematicTimer = 0;
  let stepSubPhase = 'init';
  let stepSubTimer = 0;
  let currentCandidateIdx = 0;
  let candidateRegistry = {};
  let phamAutoWalk = false;
  let phamWalkButtonRect = null;
  let stoneTouchButtonRect = null;
  let cameraOffset = { x: 0, y: 0 };
  let targetCameraOffset = { x: 0, y: 0 };
  let screenShake = 0;
  let swordTrail = [];
  let shockwave = { active: false, x: 0, y: 0, radius: 0, maxR: 64, alpha: 1 };
  let dustParticles = [];
  let spiritualPillars = [];
  let chaoticMotes = [];
  let observationStone = {
    visible: false,
    alpha: 0,
    scale: 0,
    z: 0,
    beamAlpha: 0,
    state: STONE_STATES.IDLE,
    stateTimer: 0,
    activeRoot: null, // 'five_intro', 'npc', 'tam_linh_can', 'ngu_tap_can'
    glowColor: null,
    rumble: 0
  };

  let lucNhamEntity = {
    visible: false,
    mode: 'fly_in', // 'fly_in', 'hover', 'ground', 'takeoff', 'fly_away'
    x: 1080,
    y: 160,
    z: 280,
    vx: -180,
    vy: 120,
    vz: -160,
    swordScale: 1,
    swordSheathed: false,
    facing: 1,
    casting: false,
    capeWave: 0,
    auraAlpha: 0.8
  };

  // -------------------------------------------------------------
  // AUDIO SYNTHESIZER (TÁCH SANG quest1-data.js)
  // -------------------------------------------------------------
  const {
    getAudioCtx,
    playSwordCrySound,
    playLandingShockSound,
    playStoneSummonSound,
    playTamLinhCanSound,
    playNguTapCanSound
  } = Quest1Data;

  // -------------------------------------------------------------
  // LƯU & TẢI TRẠNG THÁI
  // -------------------------------------------------------------
  function loadState() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.version === 1) {
            questData = { ...questData, ...parsed };
            if (questData.state === STATES.CINEMATIC_ACTIVE) {
              questData.state = STATES.SELECTION_READY;
            }
            if (questData.approachDelay === undefined) {
              questData.approachDelay = questData.state === STATES.CHIEF_APPROACHING ? 30.0 : 0;
            }
          }
        }
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(questData));
      }
    } catch (e) {}
  }

  loadState();

  // -------------------------------------------------------------
  // HỘI THOẠI HỒI 1 (TÁCH SANG quest1-data.js)
  // -------------------------------------------------------------
  const { SCRIPT_OPENING, getRevisitScript } = Quest1Data.createAct1Scripts({
    startDialogue: (s) => startDialogue(s),
    closeDialogue: () => closeDialogue(),
    completeRegistration: () => completeRegistration(),
    setQuestChoiceState: (st, ch) => {
      questData.state = st;
      questData.choice = ch;
      saveState();
    },
    getQuestData: () => questData
  });

  function completeRegistration() {
    const curDay = typeof Villagers !== 'undefined' && Villagers.day ? Villagers.day : 1;
    questData.state = STATES.REGISTERED;
    questData.choice = 'registered';
    questData.registeredDay = curDay;
    if (cachedChief) cachedChief.spokenLine = '';
    saveState();
    closeDialogue();
    showToast(
      'Nhiệm vụ đã nhận: Tiên Duyên Khởi Đầu\nMục tiêu: Chờ hai ngày, đến quảng trường làng tham gia tuyển chọn linh căn.'
    );
  }

  function showToast(msg) {
    toastMessage = msg;
    toastTimer = 6.0;

    const toastEl = document.getElementById('quest-toast');
    if (toastEl) {
      toastEl.hidden = false;
      const lines = msg.split('\n');
      const titleEl = document.getElementById('quest-toast-title');
      const bodyEl = document.getElementById('quest-toast-body');
      if (titleEl) titleEl.textContent = lines[0] || '';
      if (bodyEl) bodyEl.textContent = lines.slice(1).join('\n') || '';
      toastEl.style.opacity = '1';
    }
  }

  function showResultCard(info) {
    const card = document.getElementById('quest-result-card');
    if (!card) return;
    const nameEl = document.getElementById('result-name');
    const rootEl = document.getElementById('result-root');
    const typeEl = document.getElementById('result-type');
    const gradeEl = document.getElementById('result-grade');

    if (nameEl) nameEl.textContent = info.name || '';
    if (rootEl) rootEl.textContent = info.root || '';
    if (typeEl) typeEl.textContent = info.type || '';
    if (gradeEl) gradeEl.textContent = info.grade || '';

    // Kết quả được lưu và được tiên nhân đọc trong hội thoại,
    // không mở khung giữa màn hình che Quan Trắc Thạch.
    card.hidden = true;
  }

  function hideResultCard() {
    const card = document.getElementById('quest-result-card');
    if (card) {
      card.hidden = true;
    }
  }

  // -------------------------------------------------------------
  // DIALOGUE UI CONTROLLER (TYPEWRITER, CHOICES, NEXT)
  // -------------------------------------------------------------
  function startDialogue(script) {
    if (!script || !script.length) return;
    currentScript = script;
    scriptIndex = 0;
    dialogueActive = true;
    questData.hasMetChief = true;
    saveState();

    // Face each other
    if (cachedChief && typeof p !== 'undefined') {
      cachedChief.route = [];
      cachedChief.walk = 0;
      cachedChief.dir = p.x > cachedChief.x ? 1 : -1;
      p.walk = 0;
    }

    renderCurrentStep();
  }

  function resolveAvatar(step) {
    if (!step) return AVATARS.truong;
    const speaker = (step.speaker || '').trim();
    if (speaker === 'Tiểu Phàm' || speaker === 'Trương Tiểu Phàm') {
      return AVATARS.tieuPham;
    }
    if (speaker === 'A Huy') {
      return AVATARS.aHuy;
    }
    if (speaker === 'Lục Nham') {
      return AVATARS.lucNham;
    }
    if (speaker === 'Trưởng làng') {
      return AVATARS.truong;
    }
    return step.avatar || AVATARS.truong;
  }

  function renderCurrentStep() {
    if (scriptIndex >= currentScript.length) {
      closeDialogue();
      return;
    }

    const step = currentScript[scriptIndex];
    const container = document.getElementById('quest-dialog');
    const speakerEl = document.getElementById('quest-speaker-name');
    const roleEl = document.getElementById('quest-speaker-role');
    const avatarEl = document.getElementById('quest-avatar');
    const textEl = document.getElementById('quest-dialog-text');
    const promptEl = document.getElementById('quest-prompt-tap');
    const choicesEl = document.getElementById('quest-choices');

    if (!container || !textEl) {
      return;
    }

    container.hidden = false;
    if (speakerEl) speakerEl.textContent = step.speaker;
    if (roleEl) roleEl.textContent = step.role || '';
    if (avatarEl) {
      const targetAvatar = resolveAvatar(step);
      avatarEl.src = targetAvatar;
      avatarEl.alt = step.speaker;
      avatarEl.onerror = () => {
        if (step.speaker === 'Tiểu Phàm' || step.speaker === 'Trương Tiểu Phàm') {
          avatarEl.src = 'tieu-pham-avatar.webp';
        } else if (step.speaker === 'Trưởng làng') {
          avatarEl.src = 'Truong_Lang_Avatar_9KB.webp';
        } else if (step.speaker === 'Lục Nham') {
          avatarEl.src = 'luc-nham-avatar.webp';
        }
      };
      if (avatarEl.classList && avatarEl.classList.remove) {
        avatarEl.classList.remove('quest-avatar-enter');
        if (avatarEl.offsetWidth !== undefined) void avatarEl.offsetWidth;
        avatarEl.classList.add('quest-avatar-enter');
      }
    }
    if (textEl && textEl.classList && textEl.classList.remove) {
      textEl.classList.remove('quest-text-fadeIn');
      if (textEl.offsetWidth !== undefined) void textEl.offsetWidth;
      textEl.classList.add('quest-text-fadeIn');
    }

    // Prepare typewriter
    fullText = step.text;
    displayedText = '';
    typeIndex = 0;
    isTyping = true;
    textEl.textContent = '';
    if (promptEl) promptEl.hidden = true;
    if (choicesEl) {
      choicesEl.hidden = true;
      choicesEl.innerHTML = '';
    }

    if (typeof clearInterval !== 'undefined') clearInterval(typeTimer);
    if (typeof setInterval !== 'undefined') {
      typeTimer = setInterval(() => {
        if (typeIndex < fullText.length) {
          typeIndex++;
          displayedText = fullText.slice(0, typeIndex);
          textEl.textContent = displayedText;
        } else {
          finishTyping();
        }
      }, 24);
    } else {
      finishTyping();
    }
  }

  function finishTyping() {
    if (!isTyping) return;
    if (typeof clearInterval !== 'undefined') clearInterval(typeTimer);
    isTyping = false;
    displayedText = fullText;

    const textEl = document.getElementById('quest-dialog-text');
    const promptEl = document.getElementById('quest-prompt-tap');
    const choicesEl = document.getElementById('quest-choices');
    if (textEl) textEl.textContent = fullText;

    const step = currentScript[scriptIndex];
    if (step && step.choices && step.choices.length) {
      if (promptEl) promptEl.hidden = true;
      if (choicesEl) {
        choicesEl.hidden = false;
        choicesEl.innerHTML = '';
        step.choices.forEach((c) => {
          const btn = document.createElement('button');
          btn.className = 'quest-choice-btn';
          btn.textContent = c.label;
          btn.onclick = (e) => {
            e.stopPropagation();
            c.onSelect();
          };
          choicesEl.appendChild(btn);
        });
      }
    } else {
      if (promptEl) promptEl.hidden = false;
    }
  }

  function handleBoxClick() {
    if (!dialogueActive) return;
    if (isTyping) {
      finishTyping();
      return;
    }
    const step = currentScript[scriptIndex];
    if (step && step.choices && step.choices.length) {
      return;
    }

    if (step && typeof step.onFinish === 'function') {
      step.onFinish();
      return;
    }

    scriptIndex++;
    if (scriptIndex < currentScript.length) {
      renderCurrentStep();
    } else {
      closeDialogue();
    }
  }

  function closeDialogue() {
    if (typeof clearInterval !== 'undefined') clearInterval(typeTimer);
    isTyping = false;
    dialogueActive = false;
    currentScript = [];
    scriptIndex = 0;

    const container = document.getElementById('quest-dialog');
    if (container) container.hidden = true;

    if (cachedChief) {
      cachedChief.pause = 1.0;
    }
  }

  // -------------------------------------------------------------
  // HỆ THỐNG ĐIỀU KHIỂN ĐỘI HÌNH 4 KHU VỰC & TRẠNG THÁI THIẾU NIÊN
  // -------------------------------------------------------------
  function initCandidateRegistry() {
    candidateRegistry = {};
    TEENAGER_QUEUE_SLOTS.forEach((slot) => {
      candidateRegistry[slot.id] = {
        id: slot.id,
        name: slot.name,
        status: CANDIDATE_STATES.WAITING,
        queuePos: { x: slot.x, y: slot.y },
        exitPos: { x: slot.exitX, y: slot.exitY },
        waypoints: [],
        testable: slot.testable,
        testedCount: 0
      };
    });
  }

  initCandidateRegistry();

  function walkActorAlongWaypoints(actor, waypoints, speed, dt, t) {
    if (!actor || !waypoints || !waypoints.length) return true;
    let budget = speed * dt;
    while (budget > 0 && waypoints.length) {
      const target = waypoints[0];
      const dx = target.x - actor.x;
      const dy = target.y - actor.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 1.5) {
        actor.x = target.x;
        actor.y = target.y;
        waypoints.shift();
        continue;
      }
      const stepLen = Math.min(dist, budget);
      const nx = actor.x + (dx / dist) * stepLen;
      const ny = actor.y + (dy / dist) * stepLen;
      actor.x = nx;
      actor.y = ny;
      budget -= stepLen;
      if (Math.abs(dx) > 0.3) {
        actor.dir = dx >= 0 ? 1 : -1;
      }
      actor.walk = (t || 1) * 10;
      if (stepLen >= dist - 1.5) {
        actor.x = target.x;
        actor.y = target.y;
        waypoints.shift();
      }
    }
    if (!waypoints.length) {
      actor.walk = 0;
      return true;
    }
    return false;
  }

  function buildWaypointsToStone(startX, startY) {
    const pts = [];
    // Nếu đứng ở hàng 2 (y >= 590), đi qua hành lang trống giữa hàng (x = 676) để không chạm ai
    if (startY > 580) {
      pts.push({ x: 676, y: 552 });
    } else if (Math.abs(startX - TEST_STAND_POS.x) > 25) {
      pts.push({ x: startX, y: 542 });
    }
    pts.push({ x: TEST_STAND_POS.x, y: TEST_STAND_POS.y });
    return pts;
  }

  function buildWaypointsToExit(startX, startY, exitX, exitY) {
    const pts = [];
    if (exitX < TEST_STAND_POS.x) {
      pts.push({ x: 585, y: 518 });
      pts.push({ x: exitX, y: exitY });
    } else {
      pts.push({ x: 745, y: 505 });
      pts.push({ x: exitX, y: exitY });
    }
    return pts;
  }

  function arrangeSquareSquad(villagers, resetRegistry = false) {
    if (!villagers || !villagers.list) return false;
    if (resetRegistry || !Object.keys(candidateRegistry).length) {
      initCandidateRegistry();
    }

    const inCinematic = questData.state === STATES.CINEMATIC_ACTIVE;

    // KHU A — Vị trí chủ trì (phía trên vòng tròn hoa văn: Lục Nham bên trái, Trưởng làng bên phải)
    if (cachedChief) {
      cachedChief.state = 'ceremony';
      cachedChief.hidden = false;
      cachedChief.x = CHIEF_SQUARE_POS.x;
      cachedChief.y = CHIEF_SQUARE_POS.y;
      cachedChief.dir = -1; // Hướng về trung tâm & hàng thiếu niên
      cachedChief.route = [];
      cachedChief.walk = 0;
      cachedChief.pause = 9999;
      cachedChief.spokenLine = '';
      cachedChief.reachingStone = false;
      cachedChief.showCeremonyName = true;
    }

    // KHU C — Hàng thiếu niên (xếp thành hàng ngay ngắn phía dưới vòng tròn)
    TEENAGER_QUEUE_SLOTS.forEach((slot) => {
      const reg = candidateRegistry[slot.id];
      const status = reg ? reg.status : CANDIDATE_STATES.WAITING;

      if (slot.id === 'aHuy') {
        if (typeof AHuy !== 'undefined') {
          AHuy.hidden = false;
          if (!inCinematic || status === CANDIDATE_STATES.WAITING) {
            AHuy.takeScenePosition(slot.x, slot.y, -1);
            AHuy.reachingStone = false;
            AHuy.showCeremonyName = cinematicStep === 1;
          } else if (status === CANDIDATE_STATES.EXITED && cinematicStep < 8) {
            AHuy.takeScenePosition(reg.exitPos.x, reg.exitPos.y, -1);
            AHuy.reachingStone = false;
            AHuy.showCeremonyName = false;
          }
        }
        return;
      }

      if (slot.id === 'tieuPham') {
        return;
      }

      const npc = villagers.list.find((n) => n.id === slot.id);
      if (npc) {
        npc.state = 'ceremony';
        npc.hidden = false;
        npc.route = [];
        npc.pause = 9999;
        npc.spokenLine = '';
        if (!inCinematic || status === CANDIDATE_STATES.WAITING) {
          npc.x = slot.x;
          npc.y = slot.y;
          npc.dir = slot.x <= SQUARE_CENTER.x ? 1 : -1;
          npc.walk = 0;
          npc.reachingStone = false;
          npc.showCeremonyName = false;
        } else if (status === CANDIDATE_STATES.EXITED) {
          npc.x = reg.exitPos.x;
          npc.y = reg.exitPos.y;
          npc.dir = 1;
          npc.walk = 0;
          npc.reachingStone = false;
          npc.showCeremonyName = false;
        }
      }
    });

    // KHU D — Dân làng: Nông dân đứng riêng bên trái ngoài quảng trường, người lớn tuổi & dân làng đứng bên phải
    FARMER_WATCH_SLOTS.forEach((slot) => {
      const npc = villagers.list.find((n) => n.id === slot.id);
      if (npc) {
        npc.state = 'ceremony';
        npc.hidden = false;
        npc.x = slot.x;
        npc.y = slot.y;
        npc.dir = slot.dir;
        npc.route = [];
        npc.walk = 0;
        npc.pause = 9999;
        npc.spokenLine = '';
        npc.reachingStone = false;
        npc.showCeremonyName = false;
      }
    });

    VILLAGER_WATCH_SLOTS.forEach((slot) => {
      const npc = villagers.list.find((n) => n.id === slot.id);
      if (npc) {
        npc.state = 'ceremony';
        npc.hidden = false;
        npc.x = slot.x;
        npc.y = slot.y;
        npc.dir = slot.dir;
        npc.route = [];
        npc.walk = 0;
        npc.pause = 9999;
        npc.spokenLine = '';
        npc.reachingStone = false;
        npc.showCeremonyName = false;
      }
    });

    return true;
  }

  function orientCrowdToCenter(villagers) {
    if (!villagers || !villagers.list) return;
    villagers.list.forEach((n) => {
      if (n.state === 'ceremony' && !n.hidden) {
        n.dir = n.x <= STONE_POS.x ? 1 : -1;
      }
    });
    if (typeof AHuy !== 'undefined' && !AHuy.hidden) {
      const ahReg = candidateRegistry.aHuy;
      if (!ahReg || ahReg.status === CANDIDATE_STATES.WAITING) {
        AHuy.takeScenePosition(AHUY_SQUARE_POS.x, AHUY_SQUARE_POS.y, -1);
      }
    }
  }

  function verifySquadPositions(villagers) {
    if (!villagers || !villagers.list) return false;
    arrangeSquareSquad(villagers, false);
    return true;
  }

  function startCinematic(player, villagers) {
    questData.state = STATES.CINEMATIC_ACTIVE;
    cinematicStep = 1;
    cinematicTimer = 0;
    stepSubPhase = 'init';
    stepSubTimer = 0;
    currentCandidateIdx = 0;
    phamAutoWalk = false;
    saveState();

    arrangeSquareSquad(villagers, true);
    verifySquadPositions(villagers);

    // Đưa Tiểu Phàm vào đúng vị trí hàng thiếu niên (Khu C)
    player.x = PHAM_SQUARE_POS.x;
    player.y = PHAM_SQUARE_POS.y;
    player.dir = 'up';
    player.walk = 0;
    player.reachingStone = false;
    if (typeof p !== 'undefined' && p) {
      p.x = PHAM_SQUARE_POS.x;
      p.y = PHAM_SQUARE_POS.y;
      p.dir = 'up';
      p.walk = 0;
      p.reachingStone = false;
    }
    if (typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside) {
      TieuPhamHome.inside = false;
    }

    // Đặt góc máy nhìn bao quát quảng trường & không bị hộp thoại che khuất
    targetCameraOffset = { x: 0, y: -38 };
    cameraOffset = { x: 0, y: -38 };

    // PHÂN CẢNH 1: HỘI THOẠI MỞ ĐẦU KHI TẬP TRUNG ĐỘI HÌNH
    startDialogue([
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Các vị hương thân! Hôm nay là ngày trọng đại của làng chúng ta. Tiên nhân từ tiên môn sắp giáng lâm, mong mọi người đứng đúng vị trí, giữ trật tự, chớ gây ồn ào!'
      },
      {
        speaker: 'A Huy',
        role: 'Bạn cùng tuổi · 14 tuổi',
        avatar: AVATARS.aHuy,
        text: 'Tiểu Phàm, ngươi cũng đến rồi à? Hừ, hôm nay ta nhất định phải được tiên nhân thu nhận. Đến lúc đó, ngươi đừng có mà ghen tị đấy!'
      },
      {
        speaker: 'Tiểu Phàm',
        role: 'Thiếu Niên · 14 tuổi',
        avatar: AVATARS.tieuPham,
        text: 'Còn chưa khảo nghiệm, sao ngươi biết mình sẽ được chọn?'
      },
      {
        speaker: 'A Huy',
        role: 'Bạn cùng tuổi · 14 tuổi',
        avatar: AVATARS.aHuy,
        text: 'Cứ chờ xem!',
        onFinish: () => {
          closeDialogue();
          if (typeof AHuy !== 'undefined') AHuy.showCeremonyName = false;
          // Tiếng kiếm minh vang lên
          playSwordCrySound();
          cinematicStep = 2; // Chuyển sang ngự kiếm giáng lâm tại Khu A (bên trái Trưởng làng)
          cinematicTimer = 0;
          stepSubPhase = 'flying';
          stepSubTimer = 0;
          lucNhamEntity.visible = true;
          lucNhamEntity.mode = 'fly_in';
          lucNhamEntity.swordSheathed = false;
          lucNhamEntity.casting = false;
          lucNhamEntity.x = 1040;
          lucNhamEntity.y = 140;
          lucNhamEntity.z = 300;
          targetCameraOffset = { x: -12, y: -88 };
        }
      }
    ]);
  }

  // -------------------------------------------------------------
  // DANH SÁCH KHẢO NGHIỆM TUẦN TỰ (PHÂN CẢNH 4)
  // -------------------------------------------------------------
  const NPC_TEST_QUEUE = [
    {
      id: 'an',
      name: 'Tiểu An',
      callLine: 'Người đầu tiên, Tiểu An, tiến lên khảo nghiệm linh căn!',
      resultLine: 'Không có linh căn. Lùi sang khu vực bên trái, người tiếp theo.'
    },
    {
      id: 'minh',
      name: 'Tiểu Minh',
      callLine: 'Người thứ hai, Tiểu Minh, tiến lên trước Quan Trắc Thạch!',
      resultLine: 'Linh khí quá yếu, không đạt yêu cầu. Người tiếp theo.'
    },
    {
      id: 'cuc',
      name: 'Bé Cúc',
      callLine: 'Người tiếp theo, Bé Cúc, bước lên khảo nghiệm!',
      resultLine: 'Đáng tiếc, ngươi không có tư chất nhập đạo. Lui xuống đi.'
    }
  ];

  // -------------------------------------------------------------
  // UPDATE VÀ RENDER GAME LOOP
  // -------------------------------------------------------------
  function init(villagers) {
    if (!villagers || !villagers.list) return;
    cachedVillagers = villagers;
    cachedChief = villagers.list.find((n) => n.id === 'truong');

    const container = document.getElementById('quest-dialog');
    if (container) container.onclick = handleBoxClick;
    const nextBtn = document.getElementById('quest-prompt-tap');
    if (nextBtn) nextBtn.onclick = handleBoxClick;

    if (questData.state === STATES.CHIEF_APPROACHING && cachedChief) {
      cachedChief.x = 480;
      cachedChief.y = 350;
      cachedChief.home = [480, 350];
      cachedChief.dir = -1;
      cachedChief.route = [];
      cachedChief.walk = 0;
      cachedChief.pause = 0;
      cachedChief.spokenLine = '';
    }

    if (questData.state === STATES.COMPLETED || questData.completed) {
      if (typeof AHuy !== 'undefined') {
        AHuy.hidden = true;
        AHuy.reachingStone = false;
        AHuy.showCeremonyName = false;
      }
      if (villagers && typeof villagers.disbandCeremony === 'function') {
        villagers.disbandCeremony();
      } else if (villagers && villagers.list) {
        villagers.list.forEach((n) => {
          if (n.state === 'ceremony' || n.pause >= 1000) {
            n.state = '';
            n.pause = 0;
            n.reachingStone = false;
            n.showCeremonyName = false;
            n.route = [];
            n.arrived = false;
            if (villagers.plan) villagers.plan(n);
          }
        });
      }
    }

    ensureStoneSpritesLoaded();
    initialized = true;
  }

  function update(dt, t, player, villagers) {
    if (!initialized && villagers) init(villagers);
    if (!cachedChief && villagers && villagers.list) {
      cachedChief = villagers.list.find((n) => n.id === 'truong');
    }
    cachedVillagers = villagers;
    cachedPlayer = player;

    if (questData.state === STATES.COMPLETED || questData.completed) {
      if (typeof AHuy !== 'undefined') {
        AHuy.hidden = true;
        AHuy.reachingStone = false;
        AHuy.showCeremonyName = false;
      }
      const vList = villagers || cachedVillagers || (typeof Villagers !== 'undefined' ? Villagers : null);
      if (vList && vList.list) {
        let hasStuck = false;
        for (let i = 0; i < vList.list.length; i++) {
          const n = vList.list[i];
          if (n.state === 'ceremony' || n.pause >= 1000 || (n.reachingStone && !dialogueActive)) {
            hasStuck = true;
            break;
          }
        }
        if (hasStuck) {
          if (typeof vList.disbandCeremony === 'function') {
            vList.disbandCeremony();
          } else {
            vList.list.forEach((n) => {
              if (n.state === 'ceremony' || n.pause >= 1000) {
                n.state = '';
                n.pause = 0;
                n.reachingStone = false;
                n.showCeremonyName = false;
                n.route = [];
                n.arrived = false;
                if (vList.plan) vList.plan(n);
              }
            });
          }
        }
      }
    }

    if (screenShake > 0) {
      screenShake = Math.max(0, screenShake - dt);
    }

    // Cập nhật ngày theo dõi (Chờ 2 ngày trong game)
    const currentDay = villagers && villagers.day ? villagers.day : 1;
    if (
      (questData.state === STATES.REGISTERED || questData.state === STATES.AWAITING_SELECTION) &&
      questData.registeredDay != null &&
      currentDay >= Math.max(3, questData.registeredDay + 2)
    ) {
      questData.state = STATES.SELECTION_READY;
      saveState();
      showToast(
        'Tiếng chuông vang vọng khắp Làng Du Lãm.\nHôm nay chính là ngày tiên nhân giáng lâm tuyển chọn đệ tử! Mau đến quảng trường!'
      );
    }

    // Toast Timer
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) {
        const toastEl = document.getElementById('quest-toast');
        if (toastEl) toastEl.style.opacity = '0';
      }
    }

    // Khi ở trạng thái SELECTION_READY:
    // Dân làng xếp hàng ngay ngắn theo 4 khu vực tại quảng trường, Tiểu Phàm tới gần sẽ tự động kích hoạt
    if (questData.state === STATES.SELECTION_READY) {
      arrangeSquareSquad(villagers, false);

      // Nếu đang trong nhà (ngủ/nghỉ), không kích hoạt cinematic từ xa
      if (typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside) {
        return;
      }

      const distToSquare = Math.hypot(player.x - SQUARE_CENTER.x, player.y - SQUARE_CENTER.y);
      const distToLegacy = Math.hypot(player.x - LEGACY_SQUARE_CENTER.x, player.y - LEGACY_SQUARE_CENTER.y);
      if ((distToSquare <= 145 || distToLegacy <= 96) && !dialogueActive) {
        startCinematic(player, villagers);
        return;
      }
    }

    // HỒI 1: Trưởng làng tiếp cận
    if (questData.state === STATES.CHIEF_APPROACHING) {
      if (!cachedChief) return;

      // Nếu Tiểu Phàm đang ở trong nhà (ngủ/nghỉ), Trưởng làng đứng chờ ở sân trước cửa, không kích hoạt đối thoại xuyên tường
      if (typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside) {
        cachedChief.route = [];
        cachedChief.walk = 0;
        cachedChief.x = 236;
        cachedChief.y = 326;
        cachedChief.dir = -1;
        return;
      }

      // Đảm bảo Trưởng Làng luôn trong phạm vi xóm gần nhà Tiểu Phàm
      if (cachedChief.x > 750 || cachedChief.y > 600 || cachedChief.x < 180) {
        cachedChief.x = 480;
        cachedChief.y = 350;
        cachedChief.home = [480, 350];
        cachedChief.route = [];
      }

      const distToPlayer = Math.hypot(cachedChief.x - player.x, cachedChief.y - player.y);

      if (dialogueActive) {
        cachedChief.route = [];
        cachedChief.walk = 0;
        cachedChief.dir = player.x > cachedChief.x ? 1 : -1;
        return;
      }

      if (questData.approachDelay > 0) {
        questData.approachDelay = Math.max(0, questData.approachDelay - dt);
        if (questData.approachDelay === 0) saveState();

        // Trong 30s đầu: Đứng chờ tại chỗ, quay mặt về phía Tiểu Phàm
        cachedChief.route = [];
        cachedChief.walk = 0;
        cachedChief.dir = player.x > cachedChief.x ? 1 : -1;

        if (distToPlayer <= 56) {
          cachedChief.route = [];
          cachedChief.walk = 0;
          cachedChief.dir = player.x > cachedChief.x ? 1 : -1;
          cachedChief.spokenLine = 'Nhóc con! Nhóc con! Mau lại đây!';
          cachedChief.pause = 3.5;
          if (!dialogueActive) {
            questData.approachDelay = 0;
            saveState();
            startDialogue(SCRIPT_OPENING);
          }
        }
        return;
      }

      // Hết 30 giây: Trưởng làng chủ động tìm và tiến lại gần Tiểu Phàm
      if (distToPlayer <= 56) {
        cachedChief.route = [];
        cachedChief.walk = 0;
        cachedChief.dir = player.x > cachedChief.x ? 1 : -1;
        cachedChief.spokenLine = 'Nhóc con! Nhóc con! Mau lại đây!';
        cachedChief.pause = 3.5;
        if (!dialogueActive) startDialogue(SCRIPT_OPENING);
      } else {
        routeTimer -= dt;
        if (routeTimer <= 0 || !cachedChief.route || !cachedChief.route.length) {
          routeTimer = 0.8;
          if (villagers && typeof villagers.route === 'function') {
            cachedChief.route = villagers.route([cachedChief.x, cachedChief.y], [player.x, player.y]);
          }
        }

        calloutCooldown -= dt;
        if (calloutCooldown <= 0) {
          calloutCooldown = 3.5;
          cachedChief.spokenLine = 'Tiểu Phàm! Đợi lão phu một chút!';
        }

        let budget = 78 * dt;
        while (budget > 0 && cachedChief.route && cachedChief.route.length) {
          const [tx, ty] = cachedChief.route[0];
          const dx = tx - cachedChief.x,
            dy = ty - cachedChief.y;
          const len = Math.hypot(dx, dy);
          const amount = Math.min(len, budget);
          if (len < 0.1) {
            cachedChief.route.shift();
            continue;
          }
          const nx = cachedChief.x + (dx / len) * amount;
          const ny = cachedChief.y + (dy / len) * amount;
          if (typeof Collision === 'undefined' || Collision.canWalk(nx, ny)) {
            cachedChief.x = nx;
            cachedChief.y = ny;
            budget -= amount;
            cachedChief.walk = t * 9;
            if (Math.abs(dx) > 0.4) cachedChief.dir = dx < 0 ? -1 : 1;
            if (amount === len) cachedChief.route.shift();
          } else {
            if (villagers && typeof villagers.route === 'function') {
              cachedChief.route = villagers.route([cachedChief.x, cachedChief.y], [player.x, player.y]);
            }
            break;
          }
        }

        // Bước trực tiếp nếu không còn lộ trình trung gian nhưng khoảng cách vẫn > 56px
        if ((!cachedChief.route || !cachedChief.route.length) && distToPlayer > 56) {
          const directDx = player.x - cachedChief.x;
          const directDy = player.y - cachedChief.y;
          const directDist = Math.hypot(directDx, directDy);
          if (directDist > 0.1) {
            const stepLen = Math.min(directDist, 78 * dt);
            const nx = cachedChief.x + (directDx / directDist) * stepLen;
            const ny = cachedChief.y + (directDy / directDist) * stepLen;
            if (typeof Collision === 'undefined' || Collision.canWalk(nx, ny)) {
              cachedChief.x = nx;
              cachedChief.y = ny;
              cachedChief.walk = t * 9;
              if (Math.abs(directDx) > 0.4) cachedChief.dir = directDx < 0 ? -1 : 1;
            }
          }
        }
      }
      return;
    }

    // ---------------------------------------------------------
    // CẬP NHẬT TIẾN TRÌNH CINEMATIC HỒI 2
    // ---------------------------------------------------------
    if (questData.state === STATES.CINEMATIC_ACTIVE) {
      updateCinematicSequence(dt, t, player, villagers);
    }
  }

  function triggerPhamStoneTouch(player) {
    const pl = player || cachedPlayer || (typeof p !== 'undefined' ? p : null);
    if (cinematicStep !== 6) return false;
    if (stepSubPhase !== 'await_touch' && stepSubPhase !== 'player_walk' && stepSubPhase !== 'prompt_touch') {
      return false;
    }
    if (dialogueActive) closeDialogue();
    if (pl) {
      pl.x = TEST_STAND_POS.x;
      pl.y = TEST_STAND_POS.y;
      pl.dir = 'up';
      pl.walk = 0;
      pl.reachingStone = true;
    }
    if (typeof p !== 'undefined' && p) {
      p.x = TEST_STAND_POS.x;
      p.y = TEST_STAND_POS.y;
      p.dir = 'up';
      p.walk = 0;
      p.reachingStone = true;
    }
    if (candidateRegistry.tieuPham) {
      candidateRegistry.tieuPham.status = CANDIDATE_STATES.TESTING;
    }
    observationStone.state = STONE_STATES.TESTING;
    observationStone.stateTimer = 0;
    observationStone.activeRoot = null;
    stepSubPhase = 'testing';
    stepSubTimer = 0;
    targetCameraOffset = { x: 0, y: -64 };
    return true;
  }

  function updateCinematicSequence(dt, t, player, villagers) {
    cinematicTimer += dt;
    stepSubTimer += dt;
    observationStone.stateTimer += dt;

    // Giữ nguyên đội hình chuẩn cho các NPC ở trạng thái WAITING / EXITED
    arrangeSquareSquad(villagers, false);

    // Chuyển động camera mượt mà (lerp)
    const camLerp = Math.min(1, dt * 5.5);
    cameraOffset.x += (targetCameraOffset.x - cameraOffset.x) * camLerp;
    cameraOffset.y += (targetCameraOffset.y - cameraOffset.y) * camLerp;

    // Cập nhật hạt bụi xung kích
    for (let i = dustParticles.length - 1; i >= 0; i--) {
      const dp = dustParticles[i];
      dp.x += dp.vx * dt;
      dp.y += dp.vy * dt;
      dp.alpha -= dt * 1.8;
      if (dp.alpha <= 0) dustParticles.splice(i, 1);
    }

    // Cập nhật sóng xung kích
    if (shockwave.active) {
      shockwave.radius += dt * 145;
      shockwave.alpha = Math.max(0, 1 - shockwave.radius / shockwave.maxR);
      if (shockwave.radius >= shockwave.maxR) {
        shockwave.active = false;
      }
    }

    // Cập nhật vệt kiếm quang
    if (lucNhamEntity.visible && !lucNhamEntity.swordSheathed) {
      const swordX = lucNhamEntity.x;
      const swordY = lucNhamEntity.y - (lucNhamEntity.z || 0);
      swordTrail.unshift({ x: swordX, y: swordY, alpha: 0.85 });
      if (swordTrail.length > 18) swordTrail.pop();
    } else if (swordTrail.length) {
      swordTrail.shift();
    }

    // Cập nhật các cột sáng và đốm sáng
    if (spiritualPillars.length) {
      spiritualPillars.forEach((col) => {
        col.height = Math.min(col.maxH, col.height + dt * 160);
        col.glowPhase = (col.glowPhase || 0) + dt * 6;
      });
    }

    for (let i = chaoticMotes.length - 1; i >= 0; i--) {
      const m = chaoticMotes[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.alpha -= dt * 0.85;
      if (m.alpha <= 0) chaoticMotes.splice(i, 1);
    }

    // ---------------------------------------------------------
    // PHÂN CẢNH 2: LỤC NHAM NGỰ KIẾM GIÁNG LÂM TẠI KHU A (BÊN TRÁI TRƯỞNG LÀNG)
    // ---------------------------------------------------------
    if (cinematicStep === 2) {
      const targetX = LUC_NHAM_STAND.x;
      const targetY = LUC_NHAM_STAND.y;

      if (stepSubPhase === 'flying') {
        const progress = Math.min(1, cinematicTimer / 2.4);
        const ease = 1 - Math.pow(1 - progress, 3); // Cubic Ease-Out

        lucNhamEntity.x = 1040 + (targetX - 1040) * ease;
        lucNhamEntity.y = 140 + (targetY - 140) * ease;
        lucNhamEntity.z = Math.max(0, 300 * (1 - ease));

        if (progress >= 1) {
          lucNhamEntity.mode = 'ground';
          lucNhamEntity.x = targetX;
          lucNhamEntity.y = targetY;
          lucNhamEntity.z = 0;
          lucNhamEntity.facing = 1; // Hướng về trung tâm & hàng thiếu niên
          screenShake = 0.14;
          playLandingShockSound();

          shockwave.active = true;
          shockwave.x = lucNhamEntity.x;
          shockwave.y = lucNhamEntity.y + 12;
          shockwave.radius = 0;
          shockwave.maxR = 54;
          shockwave.alpha = 1;

          for (let i = 0; i < 14; i++) {
            const ang = (i / 14) * Math.PI * 2;
            dustParticles.push({
              x: shockwave.x,
              y: shockwave.y,
              vx: Math.cos(ang) * (28 + Math.random() * 36),
              vy: Math.sin(ang) * (12 + Math.random() * 16),
              size: 2 + Math.random() * 2.2,
              alpha: 0.8
            });
          }

          stepSubPhase = 'landed_wait';
          stepSubTimer = 0;
          targetCameraOffset = { x: -16, y: -92 };
        }
      } else if (stepSubPhase === 'landed_wait') {
        if (stepSubTimer >= 0.25) {
          lucNhamEntity.swordSheathed = true;
        }
        if (stepSubTimer >= 0.45 && !dialogueActive) {
          stepSubPhase = 'greeting_dialogue';
          startDialogue([
            {
              speaker: 'Dân làng',
              role: 'Quần Chúng',
              avatar: AVATARS.truong,
              text: 'Tiên nhân! Là tiên nhân thật sự! Trời ơi, ngự kiếm phi hành! Không ngờ đời này ta lại có thể tận mắt nhìn thấy tiên nhân!'
            },
            {
              speaker: 'Trưởng làng',
              role: 'Bậc Trưởng Bối · 60 tuổi',
              avatar: AVATARS.truong,
              text: 'Lão hủ là trưởng làng Du Lãm, cung nghênh tiên sư đại giá quang lâm! Đường sá xa xôi, chẳng hay tiên sư có cần nghỉ ngơi đôi chút?'
            },
            {
              speaker: 'Lục Nham',
              role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
              avatar: AVATARS.lucNham,
              text: 'Không cần đa lễ. Ta là Lục Nham, đệ tử ngoại môn phụ trách tuyển chọn lần này. Phụng mệnh tông môn đến các thôn làng khảo nghiệm linh căn. Kẻ có tư chất thích hợp, ta sẽ dẫn về tông môn tu hành.'
            },
            {
              speaker: 'Trưởng làng',
              role: 'Bậc Trưởng Bối · 60 tuổi',
              avatar: AVATARS.truong,
              text: 'Đa tạ tiên sư đã ban cho đám trẻ trong làng một cơ duyên lớn lao! Lão hủ đã cho tập hợp tất cả thiếu niên đủ tuổi ngay ngắn phía dưới, xin tiên sư xem xét.'
            },
            {
              speaker: 'Lục Nham',
              role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
              avatar: AVATARS.lucNham,
              text: 'Ừm. Khởi trận khảo nghiệm đi.',
              onFinish: () => {
                closeDialogue();
                // Chuyển sang Phân cảnh 3: Lục Nham phất tay triệu hồi Quan Trắc Thạch
                cinematicStep = 3;
                cinematicTimer = 0;
                stepSubPhase = 'summon_descend';
                stepSubTimer = 0;
                lucNhamEntity.casting = true;
                observationStone.visible = true;
                observationStone.alpha = 0;
                observationStone.scale = 0.35;
                observationStone.z = 140; // Hạ từ trên không trung xuống chính giữa hoa văn (Khu B)
                observationStone.beamAlpha = 1.0;
                observationStone.state = STONE_STATES.IDLE;
                observationStone.activeRoot = 'five_intro';
                targetCameraOffset = { x: 0, y: -74 };
                playStoneSummonSound();
              }
            }
          ]);
        }
      }
      return;
    }

    // ---------------------------------------------------------
    // PHÂN CẢNH 3: LỤC NHAM PHẤT TAY TRIỆU HỒI QUAN TRẮC THẠCH HẠ XUỐNG KHU B
    // ---------------------------------------------------------
    if (cinematicStep === 3) {
      if (stepSubPhase === 'summon_descend') {
        const pDesc = Math.min(1, stepSubTimer / 1.5);
        const ease = 1 - Math.pow(1 - pDesc, 3);
        observationStone.alpha = Math.min(1, pDesc * 1.4);
        observationStone.scale = 0.35 + 0.65 * ease;
        observationStone.z = Math.max(0, 140 * (1 - ease));
        observationStone.beamAlpha = Math.max(0, 1 - pDesc * 0.65);

        if (pDesc >= 1) {
          // Quan Trắc Thạch chạm đất chính giữa hoa văn hình tròn (680, 498)!
          observationStone.z = 0;
          observationStone.scale = 1;
          observationStone.alpha = 1;
          observationStone.beamAlpha = 0;
          observationStone.state = STONE_STATES.IDLE;
          observationStone.activeRoot = null;
          lucNhamEntity.casting = false;

          // Khi đá chạm đất, vòng tròn pháp trận phát sáng & toàn bộ đám đông hướng mặt về trung tâm
          playLandingShockSound();
          screenShake = 0.12;
          shockwave.active = true;
          shockwave.x = STONE_POS.x;
          shockwave.y = STONE_POS.y + 12;
          shockwave.radius = 4;
          shockwave.maxR = 76;
          shockwave.alpha = 1;
          orientCrowdToCenter(villagers);

          stepSubPhase = 'summon_settled';
          stepSubTimer = 0;
        }
      } else if (stepSubPhase === 'summon_settled') {
        if (stepSubTimer >= 0.35 && !dialogueActive) {
          stepSubPhase = 'summon_dialogue';
          startDialogue([
            {
              speaker: 'Lục Nham',
              role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
              avatar: AVATARS.lucNham,
              text: 'Đây là Quan Trắc Thạch, pháp khí chuyên dùng để khảo nghiệm linh căn. Phàm nhân muốn tu tiên, trước hết phải có tư chất cảm ứng linh khí thiên địa.'
            },
            {
              speaker: 'Lục Nham',
              role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
              avatar: AVATARS.lucNham,
              text: 'Khi được xướng danh, từng người một bước lên phía trước viên đá, đặt tay lên mặt đá. Chớ vận lực, chớ kinh hoảng, chỉ cần giữ tâm thần bình tĩnh.'
            },
            {
              speaker: 'Trưởng làng',
              role: 'Bậc Trưởng Bối · 60 tuổi',
              avatar: AVATARS.truong,
              text: 'Các thiếu niên nghe rõ chưa? Lão phu gọi tên ai thì người đó mới được rời hàng tiến lên! Tuyệt đối không được tự ý chen lấn!',
              onFinish: () => {
                closeDialogue();
                cinematicStep = 4; // Khảo nghiệm tuần tự từng thiếu niên NPC
                cinematicTimer = 0;
                currentCandidateIdx = 0;
                stepSubPhase = 'call';
                stepSubTimer = 0;
              }
            }
          ]);
        }
      }
      return;
    }

    // ---------------------------------------------------------
    // PHÂN CẢNH 4: CƠ CHẾ XƯỚNG DANH TUẦN TỰ TỪNG THIẾU NIÊN NPC
    // WAITING -> CALLED -> WALKING -> TESTING -> RESULT -> EXITED
    // ---------------------------------------------------------
    if (cinematicStep === 4) {
      if (currentCandidateIdx >= NPC_TEST_QUEUE.length) {
        cinematicStep = 5;
        cinematicTimer = 0;
        stepSubPhase = 'call';
        stepSubTimer = 0;
        return;
      }

      const candInfo = NPC_TEST_QUEUE[currentCandidateIdx];
      const reg = candidateRegistry[candInfo.id];
      const npc = villagers && villagers.list ? villagers.list.find((n) => n.id === candInfo.id) : null;

      if (!npc || !reg) {
        currentCandidateIdx++;
        stepSubPhase = 'call';
        stepSubTimer = 0;
        return;
      }

      if (stepSubPhase === 'call') {
        if (!dialogueActive) {
          reg.status = CANDIDATE_STATES.CALLED;
          npc.showCeremonyName = true;
          observationStone.state = STONE_STATES.IDLE;
          observationStone.glowColor = null;
          targetCameraOffset = { x: 0, y: -56 };

          stepSubPhase = 'calling_dialogue';
          startDialogue([
            {
              speaker: 'Trưởng làng',
              role: 'Bậc Trưởng Bối · 60 tuổi',
              avatar: AVATARS.truong,
              text: candInfo.callLine,
              onFinish: () => {
                closeDialogue();
                reg.status = CANDIDATE_STATES.WALKING;
                reg.waypoints = buildWaypointsToStone(npc.x, npc.y);
                stepSubPhase = 'walk_to_stone';
                stepSubTimer = 0;
              }
            }
          ]);
        }
      } else if (stepSubPhase === 'walk_to_stone') {
        const arrived = walkActorAlongWaypoints(npc, reg.waypoints, 88, dt, t);
        // Chống kẹt đường đi (anti-stuck fallback)
        if (arrived || stepSubTimer >= 2.2) {
          npc.x = TEST_STAND_POS.x;
          npc.y = TEST_STAND_POS.y;
          npc.walk = 0;
          npc.dir = 1; // Hướng về Quan Trắc Thạch
          npc.reachingStone = true; // Đưa tay chạm vào đá
          reg.waypoints = [];
          reg.status = CANDIDATE_STATES.TESTING;
          observationStone.state = STONE_STATES.TESTING;
          observationStone.stateTimer = 0;
          stepSubPhase = 'testing';
          stepSubTimer = 0;
        }
      } else if (stepSubPhase === 'testing') {
        npc.x = TEST_STAND_POS.x;
        npc.y = TEST_STAND_POS.y;
        npc.reachingStone = true;

        if (stepSubTimer >= 0.45 && observationStone.state === STONE_STATES.TESTING) {
          observationStone.state = STONE_STATES.NO_ROOT;
          observationStone.stateTimer = 0;
          observationStone.glowColor = 'rgba(165, 175, 172, 0.35)';
        }

        if (stepSubTimer >= 0.9 && !dialogueActive) {
          reg.status = CANDIDATE_STATES.RESULT;
          reg.testedCount++;
          stepSubPhase = 'result_dialogue';
          startDialogue([
            {
              speaker: 'Lục Nham',
              role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
              avatar: AVATARS.lucNham,
              text: candInfo.resultLine,
              onFinish: () => {
                closeDialogue();
                npc.reachingStone = false;
                observationStone.state = STONE_STATES.RESET;
                observationStone.stateTimer = 0;
                observationStone.glowColor = null;
                reg.waypoints = buildWaypointsToExit(npc.x, npc.y, reg.exitPos.x, reg.exitPos.y);
                stepSubPhase = 'walk_to_exit';
                stepSubTimer = 0;
              }
            }
          ]);
        }
      } else if (stepSubPhase === 'walk_to_exit') {
        const arrived = walkActorAlongWaypoints(npc, reg.waypoints, 95, dt, t);
        if (arrived || stepSubTimer >= 2.0) {
          npc.x = reg.exitPos.x;
          npc.y = reg.exitPos.y;
          npc.walk = 0;
          npc.dir = 1;
          npc.reachingStone = false;
          npc.showCeremonyName = false;
          reg.waypoints = [];
          reg.status = CANDIDATE_STATES.EXITED;
          observationStone.state = STONE_STATES.IDLE;
          currentCandidateIdx++;
          stepSubPhase = 'call';
          stepSubTimer = 0;
        }
      }
      return;
    }

    // ---------------------------------------------------------
    // PHÂN CẢNH 5: KHẢO NGHIỆM A HUY (TAM LINH CĂN)
    // ---------------------------------------------------------
    if (cinematicStep === 5) {
      const ahReg = candidateRegistry.aHuy;

      if (stepSubPhase === 'call') {
        if (!dialogueActive) {
          if (ahReg) ahReg.status = CANDIDATE_STATES.CALLED;
          if (typeof AHuy !== 'undefined') {
            AHuy.showCeremonyName = true;
            AHuy.reachingStone = false;
          }
          observationStone.state = STONE_STATES.IDLE;
          targetCameraOffset = { x: 10, y: -56 };

          stepSubPhase = 'calling_dialogue';
          startDialogue([
            {
              speaker: 'Trưởng làng',
              role: 'Bậc Trưởng Bối · 60 tuổi',
              avatar: AVATARS.truong,
              text: 'Người tiếp theo, A Huy! Tiến lên khảo nghiệm!'
            },
            {
              speaker: 'A Huy',
              role: 'Bạn cùng tuổi · 14 tuổi',
              avatar: AVATARS.aHuy,
              text: 'Hê hê, cuối cùng cũng tới lượt bổn thiếu gia! Tiểu Phàm, mở to mắt mà nhìn cho kỹ xem tiên nhân tương lai tỏa sáng thế nào nhé!',
              onFinish: () => {
                closeDialogue();
                if (ahReg) ahReg.status = CANDIDATE_STATES.WALKING;
                stepSubPhase = 'walk_to_stone';
                stepSubTimer = 0;
                targetCameraOffset = { x: 0, y: -62 };
              }
            }
          ]);
        }
      } else if (stepSubPhase === 'walk_to_stone') {
        let arrived = true;
        if (typeof AHuy !== 'undefined' && AHuy.walkToward) {
          arrived = AHuy.walkToward(TEST_STAND_POS.x, TEST_STAND_POS.y, 76, dt);
        }
        if (arrived || stepSubTimer >= 1.8) {
          if (typeof AHuy !== 'undefined') {
            AHuy.takeScenePosition(TEST_STAND_POS.x, TEST_STAND_POS.y, -1);
            AHuy.reachingStone = true;
          }
          if (ahReg) ahReg.status = CANDIDATE_STATES.TESTING;
          observationStone.state = STONE_STATES.TESTING;
          observationStone.stateTimer = 0;
          stepSubPhase = 'testing_swirl';
          stepSubTimer = 0;
        }
      } else if (stepSubPhase === 'testing_swirl') {
        if (stepSubTimer >= 0.45) {
          // Quan Trắc Thạch bùng phát Tam Linh Căn!
          if (ahReg) {
            ahReg.status = CANDIDATE_STATES.RESULT;
            ahReg.testedCount++;
          }
          screenShake = 0.22;
          observationStone.state = STONE_STATES.HAS_ROOT;
          observationStone.stateTimer = 0;
          observationStone.activeRoot = 'tam_linh_can';
          playTamLinhCanSound();

          spiritualPillars = [
            { color: '#ff4d4d', glow: 'rgba(255, 77, 77, 0.7)', x: STONE_POS.x - 22, height: 0, maxH: 82 },
            { color: '#e5b94c', glow: 'rgba(229, 185, 76, 0.7)', x: STONE_POS.x, height: 0, maxH: 90 },
            { color: '#4da6ff', glow: 'rgba(77, 166, 255, 0.7)', x: STONE_POS.x + 22, height: 0, maxH: 84 }
          ];

          showResultCard({
            name: 'A Huy',
            root: 'Hỏa — Thổ — Thủy',
            type: 'Tam Linh Căn',
            grade: 'Phẩm chất: Trung đẳng'
          });

          stepSubPhase = 'result_wait';
          stepSubTimer = 0;
        }
      } else if (stepSubPhase === 'result_wait') {
        if (stepSubTimer >= 0.9 && !dialogueActive) {
          stepSubPhase = 'result_dialogue';
          startDialogue([
            {
              speaker: 'Lục Nham',
              role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
              avatar: AVATARS.lucNham,
              text: 'Ồ? Hỏa, Thổ, Thủy... Tam Linh Căn. Không tệ... Dẫu không phải tư chất thượng thừa, nhưng đã đủ điều kiện bước lên tiên lộ. Nếu chịu khó tu luyện, ngày sau chưa chắc không thể Trúc Cơ.'
            },
            {
              speaker: 'A Huy',
              role: 'Đệ Tử Nhập Môn · 14 tuổi',
              avatar: AVATARS.aHuy,
              text: 'Ha ha! Đa tạ tiên sư! Đệ tử biết ngay bổn thiếu gia có mệnh tiên nhân mà! Nhất định đệ tử sẽ chăm chỉ tu hành!'
            },
            {
              speaker: 'Lục Nham',
              role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
              avatar: AVATARS.lucNham,
              text: 'Thu tay lại, sang đứng ở khu vực được chọn bên phải, chờ khảo nghiệm kết thúc.'
            },
            {
              speaker: 'Trưởng làng',
              role: 'Bậc Trưởng Bối · 60 tuổi',
              avatar: AVATARS.truong,
              text: 'Ha ha ha! Tốt! Tốt lắm! Làng Du Lãm chúng ta cuối cùng cũng xuất hiện một người có tiên duyên!'
            },
            {
              speaker: 'Dân làng',
              role: 'Quần Chúng',
              avatar: AVATARS.truong,
              text: 'A Huy thật có phúc! Cha mẹ nó phen này nở mày nở mặt rồi!',
              onFinish: () => {
                closeDialogue();
                hideResultCard();
                if (typeof AHuy !== 'undefined') AHuy.reachingStone = false;
                observationStone.activeRoot = null;
                observationStone.state = STONE_STATES.RESET;
                observationStone.stateTimer = 0;
                spiritualPillars = [];
                stepSubPhase = 'walk_to_exit';
                stepSubTimer = 0;
              }
            }
          ]);
        }
      } else if (stepSubPhase === 'walk_to_exit') {
        let arrived = true;
        if (typeof AHuy !== 'undefined' && AHuy.walkToward) {
          arrived = AHuy.walkToward(AHUY_PASSED_POS.x, AHUY_PASSED_POS.y, 84, dt);
        }
        if (arrived || stepSubTimer >= 1.8) {
          if (typeof AHuy !== 'undefined') {
            AHuy.takeScenePosition(AHUY_PASSED_POS.x, AHUY_PASSED_POS.y, -1);
            AHuy.reachingStone = false;
            AHuy.showCeremonyName = false;
          }
          if (ahReg) ahReg.status = CANDIDATE_STATES.EXITED;
          observationStone.state = STONE_STATES.IDLE;
          cinematicStep = 6; // Chuyển sang lượt Tiểu Phàm
          cinematicTimer = 0;
          stepSubPhase = 'call';
          stepSubTimer = 0;
        }
      }
      return;
    }

    // ---------------------------------------------------------
    // PHÂN CẢNH 6: KHẢO NGHIỆM TIỂU PHÀM (NGƯỜI CHƠI ĐIỀU KHIỂN & TƯƠNG TÁC)
    // ---------------------------------------------------------
    if (cinematicStep === 6) {
      const phamReg = candidateRegistry.tieuPham;

      if (stepSubPhase === 'call') {
        if (!dialogueActive) {
          if (phamReg) phamReg.status = CANDIDATE_STATES.CALLED;
          observationStone.state = STONE_STATES.IDLE;
          targetCameraOffset = { x: 0, y: -36 };

          stepSubPhase = 'calling_dialogue';
          startDialogue([
            {
              speaker: 'Trưởng làng',
              role: 'Bậc Trưởng Bối · 60 tuổi',
              avatar: AVATARS.truong,
              text: 'Tiểu Phàm, tiến lên!',
              choices: [
                {
                  id: 'auto_walk_stone',
                  label: 'Bước lên trước Quan Trắc Thạch (Tự động di chuyển)',
                  onSelect: () => {
                    closeDialogue();
                    if (phamReg) phamReg.status = CANDIDATE_STATES.WALKING;
                    phamAutoWalk = true;
                    stepSubPhase = 'player_walk';
                    stepSubTimer = 0;
                    targetCameraOffset = { x: 0, y: -48 };
                  }
                },
                {
                  id: 'manual_walk_stone',
                  label: 'Tự mình bước lên vị trí khảo nghiệm (Tự điều khiển)',
                  onSelect: () => {
                    closeDialogue();
                    if (phamReg) phamReg.status = CANDIDATE_STATES.WALKING;
                    phamAutoWalk = false;
                    stepSubPhase = 'player_walk';
                    stepSubTimer = 0;
                    targetCameraOffset = { x: 0, y: -48 };
                  }
                }
              ],
              onFinish: () => {
                closeDialogue();
                if (phamReg) phamReg.status = CANDIDATE_STATES.WALKING;
                phamAutoWalk = true;
                stepSubPhase = 'player_walk';
                stepSubTimer = 0;
                targetCameraOffset = { x: 0, y: -48 };
              }
            }
          ]);
        }
      } else if (stepSubPhase === 'player_walk') {
        // Giữ người chơi trong phạm vi trung tâm quảng trường để tránh đi lạc
        player.x = Math.max(560, Math.min(800, player.x));
        player.y = Math.max(480, Math.min(620, player.y));

        if (phamAutoWalk) {
          const dx = TEST_STAND_POS.x - player.x;
          const dy = TEST_STAND_POS.y - player.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 2) {
            const stepLen = Math.min(dist, 86 * dt);
            player.x += (dx / dist) * stepLen;
            player.y += (dy / dist) * stepLen;
            player.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
            player.walk = (t || 1) * 11;
            if (typeof p !== 'undefined' && p) {
              p.x = player.x;
              p.y = player.y;
              p.dir = player.dir;
              p.walk = player.walk;
            }
          }
        }

        const distToStand = Math.hypot(player.x - TEST_STAND_POS.x, player.y - TEST_STAND_POS.y);
        if (distToStand <= 22 || (phamAutoWalk && stepSubTimer >= 1.5)) {
          player.x = TEST_STAND_POS.x;
          player.y = TEST_STAND_POS.y;
          player.dir = 'up';
          player.walk = 0;
          if (typeof p !== 'undefined' && p) {
            p.x = TEST_STAND_POS.x;
            p.y = TEST_STAND_POS.y;
            p.dir = 'up';
            p.walk = 0;
          }
          stepSubPhase = 'prompt_touch';
          stepSubTimer = 0;
          targetCameraOffset = { x: 0, y: -62 };
          startDialogue([
            {
              speaker: 'Lục Nham',
              role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
              avatar: AVATARS.lucNham,
              text: 'Đặt tay lên Quan Trắc Thạch, giữ tâm thần bình tĩnh.',
              onFinish: () => {
                closeDialogue();
                stepSubPhase = 'await_touch';
                stepSubTimer = 0;
              }
            }
          ]);
        }
      } else if (stepSubPhase === 'await_touch') {
        // Chờ người chơi tương tác với Quan Trắc Thạch (Không kích hoạt kết quả trước khi người chơi tương tác!)
        player.x = TEST_STAND_POS.x;
        player.y = TEST_STAND_POS.y;
        player.dir = 'up';
        player.walk = 0;
      } else if (stepSubPhase === 'testing') {
        player.x = TEST_STAND_POS.x;
        player.y = TEST_STAND_POS.y;
        player.dir = 'up';
        player.reachingStone = true;
        if (typeof p !== 'undefined' && p) p.reachingStone = true;

        if (stepSubTimer >= 0.5 && observationStone.state === STONE_STATES.TESTING) {
          observationStone.state = STONE_STATES.HAS_ROOT;
          observationStone.stateTimer = 0;
          observationStone.activeRoot = 'ngu_tap_can';
          playNguTapCanSound();

          const colors = ['#f5d76e', '#5cd65c', '#4da6ff', '#ff4d4d', '#cca370'];
          for (let i = 0; i < 28; i++) {
            chaoticMotes.push({
              x: STONE_POS.x + (Math.random() - 0.5) * 24,
              y: STONE_POS.y - 12 + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 35,
              vy: -15 - Math.random() * 25,
              color: colors[i % 5],
              size: 2.2 + Math.random() * 2,
              alpha: 0.95
            });
          }

          showResultCard({
            name: 'Tiểu Phàm',
            root: 'Kim — Mộc — Thủy — Hỏa — Thổ',
            type: 'Ngũ Hành Tạp Linh Căn',
            grade: 'Phẩm chất: Hạ đẳng'
          });

          questData.spiritualRoot = 'Ngũ Hành Tạp Linh Căn';
          saveState();
          if (phamReg) {
            phamReg.status = CANDIDATE_STATES.RESULT;
            phamReg.testedCount++;
          }
        }

        if (stepSubTimer >= 1.2 && !dialogueActive) {
          stepSubPhase = 'result_dialogue';
          startDialogue([
            {
              speaker: 'Lục Nham',
              role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
              avatar: AVATARS.lucNham,
              text: 'Kim, Mộc, Thủy, Hỏa, Thổ... Ngũ Hành Tạp Linh Căn. Ngũ hành hỗn tạp, linh khí khó tụ. Với tư chất này, dù có dốc sức tu luyện, tiến cảnh cũng chậm chạp hơn người thường rất nhiều.'
            },
            {
              speaker: 'Lục Nham',
              role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
              avatar: AVATARS.lucNham,
              text: 'Tiên đạo vô vọng...'
            },
            {
              speaker: 'Tiểu Phàm',
              role: 'Thiếu Niên · 14 tuổi',
              avatar: AVATARS.tieuPham,
              text: 'Tiên sư... chẳng lẽ có linh căn mà vẫn không thể tu tiên sao?'
            },
            {
              speaker: 'Lục Nham',
              role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
              avatar: AVATARS.lucNham,
              text: 'Có linh căn không đồng nghĩa với có tiên duyên. Con đường tu hành tranh đoạt với thiên địa. Kẻ tư chất xuất chúng còn có thể bỏ mạng giữa đường, huống chi là Ngũ Hành Tạp Linh Căn. Ta không nói ngươi tuyệt đối không thể tu luyện. Nhưng với điều kiện của tông môn, không thể thu nhận ngươi.'
            },
            {
              speaker: 'Tiểu Phàm',
              role: 'Thiếu Niên · 14 tuổi',
              avatar: AVATARS.tieuPham,
              text: '... Ta hiểu rồi.',
              onFinish: () => {
                closeDialogue();
                hideResultCard();
                player.reachingStone = false;
                if (typeof p !== 'undefined' && p) p.reachingStone = false;
                observationStone.activeRoot = null;
                observationStone.state = STONE_STATES.RESET;
                observationStone.stateTimer = 0;
                // Lùi Tiểu Phàm về vị trí hàng
                player.x = PHAM_SQUARE_POS.x;
                player.y = PHAM_SQUARE_POS.y;
                player.dir = 'up';
                if (typeof p !== 'undefined' && p) {
                  p.x = PHAM_SQUARE_POS.x;
                  p.y = PHAM_SQUARE_POS.y;
                  p.dir = 'up';
                }
                if (phamReg) phamReg.status = CANDIDATE_STATES.EXITED;
                cinematicStep = 7; // Trưởng làng an ủi
                cinematicTimer = 0;
                stepSubPhase = 'init';
                stepSubTimer = 0;
                targetCameraOffset = { x: 0, y: -42 };
              }
            }
          ]);
        }
      }
      return;
    }

    // ---------------------------------------------------------
    // PHÂN CẢNH 7: TRƯỞNG LÀNG AN ỦI
    // ---------------------------------------------------------
    if (cinematicStep === 7) {
      if (!dialogueActive && stepSubTimer >= 0.3) {
        stepSubPhase = 'dialogue';
        startDialogue([
          {
            speaker: 'Trưởng làng',
            role: 'Bậc Trưởng Bối · 60 tuổi',
            avatar: AVATARS.truong,
            text: 'Nhóc con... Haizz, tạo hóa trêu ngươi. Lão phu vốn còn mong ngươi có thể cùng A Huy bước lên tiên lộ.'
          },
          {
            speaker: 'Trưởng làng',
            role: 'Bậc Trưởng Bối · 60 tuổi',
            avatar: AVATARS.truong,
            text: 'Nhưng ngươi chớ quá đau lòng. Tu tiên hay không cũng chẳng quyết định giá trị một đời người. Dù không được tiên môn thu nhận, ngươi vẫn là đứa trẻ của làng Du Lãm chúng ta.'
          },
          {
            speaker: 'Trưởng làng',
            role: 'Bậc Trưởng Bối · 60 tuổi',
            avatar: AVATARS.truong,
            text: 'Lão phu già rồi, chẳng hiểu hết chuyện tiên đạo. Nhưng lão phu tin rằng, con đường của một người không nên chỉ được định đoạt bởi một khối đá.',
            onFinish: () => {
              closeDialogue();
              cinematicStep = 8; // A Huy khiêu khích
              cinematicTimer = 0;
              stepSubPhase = 'init';
              stepSubTimer = 0;
            }
          }
        ]);
      }
      return;
    }

    // ---------------------------------------------------------
    // PHÂN CẢNH 8: A HUY KHIÊU KHÍCH & 3 LỰA CHỌN PHẢN ỨNG
    // ---------------------------------------------------------
    if (cinematicStep === 8) {
      if (!dialogueActive && stepSubTimer >= 0.3 && stepSubPhase === 'init') {
        stepSubPhase = 'dialogue';
        if (typeof AHuy !== 'undefined') {
          AHuy.takeScenePosition(player.x + 36, player.y - 6, -1);
          AHuy.showCeremonyName = true;
        }

        startDialogue([
          {
            speaker: 'A Huy',
            role: 'Đệ Tử Tiên Môn · 14 tuổi',
            avatar: AVATARS.aHuy,
            text: 'Ha ha ha! Tiểu Phàm, ngươi nghe rõ chưa? Ngũ Hành Tạp Linh Căn! Ta còn tưởng ngươi có bản lĩnh gì ghê gớm lắm! Ngày trước ngươi còn dám cãi lời ta. Bây giờ thì sao? Ta sắp trở thành đệ tử tiên môn, còn ngươi vẫn chỉ là một tên phàm nhân trong làng!',
            choices: [
              {
                id: 'defiant',
                label: '“Hừ, hôm nay ngươi hơn ta, chưa chắc cả đời đều hơn ta!”',
                onSelect: () => {
                  questData.rivalryReaction = 'defiant';
                  saveState();
                  startDialogue([
                    {
                      speaker: 'Tiểu Phàm',
                      role: 'Thiếu Niên · 14 tuổi',
                      avatar: AVATARS.tieuPham,
                      text: 'Hừ, hôm nay ngươi hơn ta, chưa chắc cả đời đều hơn ta!'
                    },
                    {
                      speaker: 'A Huy',
                      role: 'Đệ Tử Tiên Môn · 14 tuổi',
                      avatar: AVATARS.aHuy,
                      text: 'Ha ha! Khẩu khí lớn thật! Vậy ta sẽ chờ xem một tên Tạp Linh Căn như ngươi có thể làm nên trò trống gì!'
                    },
                    ...SCRIPT_STOP_BY_LUC
                  ]);
                }
              },
              {
                id: 'lucky',
                label: '“Có gì đáng khoe khoang? Chẳng qua ngươi may mắn hơn ta mà thôi.”',
                onSelect: () => {
                  questData.rivalryReaction = 'lucky';
                  saveState();
                  startDialogue([
                    {
                      speaker: 'Tiểu Phàm',
                      role: 'Thiếu Niên · 14 tuổi',
                      avatar: AVATARS.tieuPham,
                      text: 'Có gì đáng khoe khoang? Chẳng qua ngươi may mắn hơn ta mà thôi.'
                    },
                    {
                      speaker: 'A Huy',
                      role: 'Đệ Tử Tiên Môn · 14 tuổi',
                      avatar: AVATARS.aHuy,
                      text: 'May mắn? Hừ! Trong tiên đạo, tư chất chính là vốn liếng. Ngươi không có, thì đừng trách trời bất công!'
                    },
                    ...SCRIPT_STOP_BY_LUC
                  ]);
                }
              },
              {
                id: 'silent',
                label: '“...” (Im lặng, không đáp)',
                onSelect: () => {
                  questData.rivalryReaction = 'silent';
                  saveState();
                  startDialogue([
                    {
                      speaker: 'Tiểu Phàm',
                      role: 'Thiếu Niên · 14 tuổi',
                      avatar: AVATARS.tieuPham,
                      text: '...'
                    },
                    {
                      speaker: 'A Huy',
                      role: 'Đệ Tử Tiên Môn · 14 tuổi',
                      avatar: AVATARS.aHuy,
                      text: 'Sao thế? Không còn lời nào để nói à? Xem ra ngươi cũng biết thân biết phận rồi!'
                    },
                    ...SCRIPT_STOP_BY_LUC
                  ]);
                }
              }
            ]
          }
        ]);
      }
      return;
    }

    // ---------------------------------------------------------
    // PHÂN CẢNH 10: RỜI LÀNG (PHI KIẾM CẤT CÁNH BAY ĐI)
    // ---------------------------------------------------------
    if (cinematicStep === 10) {
      const progress = Math.min(1, cinematicTimer / 3.2);
      const ease = Math.pow(progress, 2.6);

      lucNhamEntity.mode = 'fly_away';
      lucNhamEntity.swordSheathed = false;
      lucNhamEntity.swordScale = 1.6;
      targetCameraOffset = { x: 0, y: -80 };

      // Phi kiếm cất cánh chở Lục Nham và A Huy bay về góc chân trời
      lucNhamEntity.x = LUC_NHAM_STAND.x + ease * 520;
      lucNhamEntity.y = LUC_NHAM_STAND.y - ease * 440;
      lucNhamEntity.z = ease * 340;

      if (typeof AHuy !== 'undefined') {
        AHuy.takeScenePosition(lucNhamEntity.x - 18, lucNhamEntity.y + 4);
      }

      if (progress >= 1) {
        cinematicStep = 11;
        targetCameraOffset = { x: 0, y: 0 };
        cameraOffset = { x: 0, y: 0 };
        completeQuest(player, villagers);
      }
    }
  }

  // PHÂN CẢNH 9: LỤC NHAM NGĂN LẠI VÀ CHUYỂN TIẾP RỜI LÀNG
  const SCRIPT_STOP_BY_LUC = [
    {
      speaker: 'Lục Nham',
      role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
      avatar: AVATARS.lucNham,
      text: 'Đủ rồi. Chưa bước chân vào tiên môn đã sinh lòng kiêu ngạo, ngươi tưởng có Tam Linh Căn là có thể tung hoành thiên hạ sao? Tu tiên không chỉ xét tư chất, mà còn phải xét tâm tính. Nếu giữ thái độ này, sớm muộn cũng tự chuốc lấy tai họa.'
    },
    {
      speaker: 'A Huy',
      role: 'Đệ Tử Tiên Môn · 14 tuổi',
      avatar: AVATARS.aHuy,
      text: 'Đệ tử biết sai! Xin tiên sư trách phạt!'
    },
    {
      speaker: 'Lục Nham',
      role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
      avatar: AVATARS.lucNham,
      text: 'Biết sai thì sửa. Lần sau chớ tái phạm.'
    },
    {
      speaker: 'Lục Nham',
      role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
      avatar: AVATARS.lucNham,
      text: 'Tiểu tử, ngươi cũng không cần quá để tâm. Đại đạo vô tình, nhưng thiên địa rộng lớn, không ai có thể nhìn thấu hết mọi cơ duyên. Chỉ là hôm nay, ta không thể đưa ngươi đi.'
    },
    {
      speaker: 'Lục Nham',
      role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
      avatar: AVATARS.lucNham,
      text: 'Khảo nghiệm đến đây kết thúc. Lần tuyển chọn này, chỉ có A Huy đạt yêu cầu nhập môn. A Huy, tiến lên.'
    },
    {
      speaker: 'A Huy',
      role: 'Đệ Tử Tiên Môn · 14 tuổi',
      avatar: AVATARS.aHuy,
      text: 'Có đệ tử!'
    },
    {
      speaker: 'Lục Nham',
      role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
      avatar: AVATARS.lucNham,
      text: 'Ngươi hãy theo ta trở về tông môn. Từ hôm nay, ngươi cần đoạn tuyệt sự lười biếng của phàm tục, chuyên tâm tu hành.'
    },
    {
      speaker: 'Trưởng làng',
      role: 'Bậc Trưởng Bối · 60 tuổi',
      avatar: AVATARS.truong,
      text: 'Tiên sư! Đa tạ ngài đã ban cho làng chúng ta cơ duyên này! Còn A Huy, sau này dù tu hành đến cảnh giới nào, cũng chớ quên nơi mình sinh ra.'
    },
    {
      speaker: 'A Huy',
      role: 'Đệ Tử Tiên Môn · 14 tuổi',
      avatar: AVATARS.aHuy,
      text: 'Trưởng làng cứ yên tâm! Ngày sau ta tu luyện thành công, nhất định sẽ trở về!'
    },
    {
      speaker: 'A Huy',
      role: 'Đệ Tử Tiên Môn · 14 tuổi',
      avatar: AVATARS.aHuy,
      text: 'Tiểu Phàm, bảo trọng nhé. Lần sau gặp lại, chỉ e ngươi phải gọi ta một tiếng tiên sư rồi! Ha ha!'
    },
    {
      speaker: 'Lục Nham',
      role: 'Tiên Môn Đệ Tử · Trúc Cơ Sơ Kỳ',
      avatar: AVATARS.lucNham,
      text: 'Lên đây. Đứng vững, chớ vọng động.',
      onFinish: () => {
        closeDialogue();
        observationStone.visible = false;
        playSwordCrySound();
        cinematicStep = 10; // Bắt đầu cất cánh bay đi
        cinematicTimer = 0;
        stepSubPhase = 'fly_away';
        stepSubTimer = 0;
      }
    }
  ];

  function completeQuest(player, villagers) {
    questData.state = STATES.COMPLETED;
    questData.completed = true;
    saveState();

    if (typeof AHuy !== 'undefined') {
      AHuy.hidden = true;
      AHuy.reachingStone = false;
      AHuy.showCeremonyName = false;
    }
    lucNhamEntity.visible = false;
    if (player) player.reachingStone = false;
    if (typeof p !== 'undefined' && p) p.reachingStone = false;

    // Giải tán dân làng ngay khi tiên nhân rời đi để không còn ai đứng bất động
    const vList = villagers || cachedVillagers || (typeof Villagers !== 'undefined' ? Villagers : null);
    if (vList && typeof vList.disbandCeremony === 'function') {
      vList.disbandCeremony();
    } else if (vList && vList.list) {
      vList.list.forEach((n) => {
        n.state = '';
        n.pause = 0;
        n.reachingStone = false;
        n.showCeremonyName = false;
        n.route = [];
        n.arrived = false;
        n.spokenLine = '';
        if (vList.plan) vList.plan(n);
      });
    }

    // Trưởng làng tiễn biệt
    startDialogue([
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Haizz... đi rồi. Nhóc con, về thôi. Đường đời còn dài. Hôm nay không có tiên duyên, chưa chắc ngày mai đã không có cơ hội khác. Chỉ cần ngươi còn sống, còn bước tiếp, thì mọi chuyện vẫn chưa phải kết thúc.',
        onFinish: () => {
          closeDialogue();
          showToast(
            'Nhiệm vụ hoàn thành: Tiên Duyên Khởi Đầu!\nTiểu Phàm xác định tư chất: Ngũ Hành Tạp Linh Căn.\nA Huy đã theo Lục Nham bước lên tiên lộ.'
          );
          // Giải tán dân làng trở lại sinh hoạt bình thường
          const vList = villagers || cachedVillagers || (typeof Villagers !== 'undefined' ? Villagers : null);
          if (vList && typeof vList.disbandCeremony === 'function') {
            vList.disbandCeremony();
          } else if (vList && vList.list) {
            vList.list.forEach((n) => {
              n.state = '';
              n.pause = 0;
              n.reachingStone = false;
              n.showCeremonyName = false;
              n.route = [];
              n.arrived = false;
              n.spokenLine = '';
              if (vList.plan) vList.plan(n);
            });
          }
          if (typeof GameSave !== 'undefined' && typeof GameSave.save === 'function') {
            GameSave.save(true, player);
          }
        }
      }
    ]);
  }

  // -------------------------------------------------------------
  // DRAWING HỆ THỐNG VẬT THỂ, QUAN TRẮC THẠCH 5 TRẠNG THÁI & CINEMATIC (TÁCH SANG quest1-render.js)
  // -------------------------------------------------------------
  const STONE_SPRITE_DEFS = Quest1Render.STONE_SPRITE_DEFS;
  const stoneSprites = Quest1Render.stoneSprites;
  const ensureStoneSpritesLoaded = Quest1Render.ensureStoneSpritesLoaded;

  function getRenderContext() {
    return {
      STATES,
      SQUARE_CENTER,
      STONE_POS,
      TEST_STAND_POS,
      STONE_STATES,
      questData,
      dialogueActive,
      cachedChief,
      observationStone,
      shockwave,
      dustParticles,
      cinematicStep,
      stepSubPhase,
      lucNhamEntity,
      spiritualPillars,
      chaoticMotes,
      swordTrail,
      phamAutoWalk,
      questDetailTimer,
      setQuestDetailTimer: (v) => { questDetailTimer = v; },
      setPhamWalkButtonRect: (r) => { phamWalkButtonRect = r; },
      setStoneTouchButtonRect: (r) => { stoneTouchButtonRect = r; },
      isQuestBoardVisible,
      getQuestHUDInfo
    };
  }

  function drawGround(ctx, t) {
    Quest1Render.drawGround(ctx, t, getRenderContext());
  }

  function drawWorld(ctx, t) {
    Quest1Render.drawWorld(ctx, t, getRenderContext());
  }

  // -------------------------------------------------------------
  // TƯƠNG TÁC
  // -------------------------------------------------------------
  function isNearChief(player, dist = 56) {
    if (!cachedChief || cachedChief.hidden) return false;
    return Math.hypot(cachedChief.x - player.x, cachedChief.y - player.y) <= dist;
  }

  function isAwaitingStoneTouch(player) {
    if (questData.state !== STATES.CINEMATIC_ACTIVE || cinematicStep !== 6) return false;
    return stepSubPhase === 'await_touch';
  }

  function talk(player) {
    if (isAwaitingStoneTouch(player)) {
      return triggerPhamStoneTouch(player);
    }
    if (!cachedChief) return false;
    if (dialogueActive) return true;

    cachedChief.dir = player.x > cachedChief.x ? 1 : -1;
    cachedChief.pause = 4.0;

    if (questData.state === STATES.CHIEF_APPROACHING) {
      questData.approachDelay = 0;
      saveState();
      startDialogue(SCRIPT_OPENING);
      return true;
    }

    const script = getRevisitScript();
    startDialogue(script);
    return true;
  }

  function interact(player) {
    if (isAwaitingStoneTouch(player)) {
      return triggerPhamStoneTouch(player);
    }
    if (isNearChief(player, 56)) {
      return talk(player);
    }
    return false;
  }

  // -------------------------------------------------------------
  // BẢNG NHIỆM VỤ DƯỚI AVATAR NGƯỜI CHƠI (PHƯƠNG ÁN A - CANVAS 2D)
  // -------------------------------------------------------------
  function isQuestBoardVisible() {
    if (dialogueActive) return false;
    if (typeof Quest2 !== 'undefined' && Quest2.isNightRaidMusicActive && Quest2.isNightRaidMusicActive()) return false;
    const s = questData.state;
    return (
      s === STATES.REGISTERED ||
      s === STATES.AWAITING_SELECTION ||
      s === STATES.SELECTION_READY ||
      s === STATES.CINEMATIC_ACTIVE ||
      s === STATES.COMPLETED
    );
  }

  function getQuestHUDInfo() {
    const currentDay = typeof Villagers !== 'undefined' && Villagers.day ? Villagers.day : 1;

    if (
      questData.state === STATES.SELECTION_READY ||
      (currentDay >= 3 && questData.state !== STATES.COMPLETED && questData.state !== STATES.CINEMATIC_ACTIVE)
    ) {
      return {
        title: 'Tiên Nhân Giáng Lâm',
        tag: 'Đại Sự',
        tagColor: '#ef4444',
        objective: 'Đến Quảng Trường Làng ngay!',
        status: '⚡ Cấp báo',
        statusColor: '#ffe066',
        urgent: true,
        hint: 'Tiên nhân tiên môn sắp giáng thế tại sân làng. Mau tới xem khảo nghiệm linh căn!'
      };
    }

    if (questData.state === STATES.CINEMATIC_ACTIVE) {
      let obj = 'Chứng kiến nghi thức khảo nghiệm';
      if (cinematicStep === 6 && stepSubPhase === 'player_walk') {
        obj = 'Tiến lên trước Quan Trắc Thạch';
      } else if (cinematicStep === 6 && stepSubPhase === 'await_touch') {
        obj = 'Chạm tay vào Quan Trắc Thạch';
      }
      return {
        title: 'Khảo Nghiệm Linh Căn',
        tag: 'Kỳ Duyên',
        tagColor: '#38bdf8',
        objective: obj,
        status: 'Đang diễn ra',
        statusColor: '#67e8f9',
        urgent: cinematicStep === 6,
        hint: 'Khảo nghiệm linh căn tuần tự tại Quan Trắc Thạch.'
      };
    }

    if (questData.state === STATES.COMPLETED) {
      if (typeof Quest3 !== 'undefined' && Quest3.isCompleted && Quest3.isCompleted()) {
        return null;
      }
      if (typeof Quest3 !== 'undefined' && Quest3.getHUDInfo) {
        const q3 = Quest3.getHUDInfo();
        if (q3) return q3;
      }
      if (typeof ANguyetStory !== 'undefined' && ANguyetStory.getHUDInfo) {
        const interlude = ANguyetStory.getHUDInfo();
        if (interlude) return interlude;
      }
      return {title:'Tiên Duyên Khởi Đầu',tag:'Tiếp Theo',tagColor:'#b7d6a2',
        objective:'Về nhà nghỉ ngơi',status:'Nghỉ ngơi',statusColor:'#a5e3bd',urgent:false,
        hint:'Buổi khảo nghiệm đã kết thúc. Hãy về nghỉ ngơi.'};
    }

    if (questData.state === STATES.REGISTERED || questData.state === STATES.AWAITING_SELECTION) {
      const regDay = questData.registeredDay || 1;
      const targetDay = regDay + 2;
      const daysLeft = Math.max(0, targetDay - currentDay);
      const dayText = daysLeft === 0 ? 'Hôm nay giáng lâm' : `Còn ${daysLeft} ngày (Ngày ${targetDay})`;
      return {
        title: 'Tiên Duyên Khởi Đầu',
        tag: 'Chờ Đợi',
        tagColor: '#22c55e',
        objective: `Chờ tuyển chọn · ${dayText}`,
        status: `Ngày ${currentDay}`,
        statusColor: '#86efac',
        urgent: false,
        hint: 'Trưởng làng đã ghi tên ngươi vào danh sách. Hãy rèn luyện thể chất và chờ tiên nhân đến làng.'
      };
    }

    if (questData.state === STATES.CONSIDERING) {
      return {
        title: 'Tiên Duyên Khởi Đầu',
        tag: 'Cân Nhắc',
        tagColor: '#f59e0b',
        objective: 'Gặp Trưởng Làng để đổi ý',
        status: 'Suy nghĩ',
        statusColor: '#fde047',
        urgent: false,
        hint: 'Ngươi vẫn còn thời gian suy nghĩ. Hãy tìm Trưởng Làng nếu muốn ghi tên tham dự tuyển chọn.'
      };
    }

    if (questData.state === STATES.DECLINED) {
      return {
        title: 'Tiên Duyên Khởi Đầu',
        tag: 'Từ Chối',
        tagColor: '#94a3b8',
        objective: 'Có thể đổi ý với Trưởng Làng',
        status: 'An yên',
        statusColor: '#cbd5e1',
        urgent: false,
        hint: 'Ngươi đã chọn sống đời bình yên. Trước khi tiên nhân rời làng, ngươi vẫn có thể đổi ý.'
      };
    }

    return {
      title: 'Tiên Duyên Khởi Đầu',
      tag: 'Tiếp Nhận',
      tagColor: '#eab308',
      objective: 'Trò chuyện cùng Trưởng Làng',
      status: '[!] Đang chờ',
      statusColor: '#fef08a',
      urgent: false,
      hint: 'Trưởng làng có tin đại sự muốn báo cho thiếu niên trong làng.'
    };
  }

  function drawHUD(ctx, p, W, H, t, dt = 0.016) {
    Quest1Render.drawHUD(ctx, p, W, H, t, dt, getRenderContext());
  }

  function handleClickHUD(cx, cy, W, player) {
    if (phamWalkButtonRect) {
      const b = phamWalkButtonRect;
      if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
        phamAutoWalk = true;
        return true;
      }
    }
    if (stoneTouchButtonRect) {
      const b = stoneTouchButtonRect;
      if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
        return triggerPhamStoneTouch(player);
      }
    }
    if (isAwaitingStoneTouch(player)) {
      // Cho phép nhấn trực tiếp vào vùng giữa màn hình (nơi đặt Quan Trắc Thạch)
      if (cx >= W * 0.28 && cx <= W * 0.72 && cy >= 120 && cy <= 520) {
        return triggerPhamStoneTouch(player);
      }
    }
    if (!isQuestBoardVisible()) return false;
    const hx = 12,
      hy = 12;
    const isNarrow = W < 430;
    const barW = isNarrow ? 116 : 132;
    const panelW = barW + 58;
    const qx = hx;
    const qy = hy + 50 + 6;
    const qw = panelW;
    const qh = 42;

    if (cx >= qx && cx <= qx + qw && cy >= qy && cy <= qy + qh) {
      questDetailTimer = questDetailTimer > 0 ? 0 : 4.5;
      return true;
    }
    return false;
  }

  return {
    STATES,
    CANDIDATE_STATES,
    STONE_STATES,
    AVATARS,
    SQUARE_CENTER,
    STONE_POS,
    TEST_STAND_POS,
    LUC_NHAM_STAND,
    CHIEF_SQUARE_POS,
    PHAM_SQUARE_POS,
    AHUY_SQUARE_POS,
    AHUY_PASSED_POS,
    init,
    update,
    drawGround,
    drawWorld,
    drawHUD,
    handleClickHUD,
    isQuestBoardVisible,
    getQuestHUDInfo,
    talk,
    interact,
    touchStone: triggerPhamStoneTouch,
    isNearChief,
    isAwaitingStoneTouch,
    isDialogueActive: () => dialogueActive,
    isCinematicActive: () => questData.state === STATES.CINEMATIC_ACTIVE,
    isCeremonyActive: () =>
      questData.state === STATES.SELECTION_READY || questData.state === STATES.CINEMATIC_ACTIVE,
    shouldShowPhamName: () => {
      if (questData.state !== STATES.CINEMATIC_ACTIVE && questData.state !== STATES.SELECTION_READY) return true;
      return cinematicStep === 1 || cinematicStep === 6 || cinematicStep === 7 || cinematicStep === 8;
    },
    isInputLocked: () => {
      if (dialogueActive) return true;
      if (questData.state === STATES.CINEMATIC_ACTIVE) {
        // Cho phép người chơi tự điều khiển Tiểu Phàm bước lên vị trí khảo nghiệm ở Phân cảnh 6
        if (cinematicStep === 6 && stepSubPhase === 'player_walk' && !phamAutoWalk) {
          return false;
        }
        return true;
      }
      return false;
    },
    isChiefControlled: () => {
      if (questData.state === STATES.COMPLETED || questData.completed) return false;
      return (
        questData.state === STATES.CHIEF_APPROACHING ||
        questData.state === STATES.CINEMATIC_ACTIVE ||
        questData.state === STATES.SELECTION_READY ||
        dialogueActive
      );
    },
    getCameraOffset: () => cameraOffset,
    getState: () => questData.state,
    getCinematicStep: () => cinematicStep,
    getStepSubPhase: () => stepSubPhase,
    getCandidateRegistry: () => candidateRegistry,
    getObservationStone: () => observationStone,
    getLucNhamEntity: () => lucNhamEntity,
    STONE_SPRITE_DEFS,
    getStoneSprites: () => stoneSprites,
    getData: () => ({ ...questData }),
    get state() {
      return questData.state;
    },
    set state(v) {
      questData.state = v;
      saveState();
    },
    get registeredDay() {
      return questData.registeredDay;
    },
    set registeredDay(v) {
      questData.registeredDay = v;
      saveState();
    },
    get approachDelay() {
      return questData.approachDelay;
    },
    set approachDelay(v) {
      questData.approachDelay = v;
      saveState();
    },
    resetState: () => {
      questData = {
        version: 1,
        state: STATES.CHIEF_APPROACHING,
        approachDelay: 30.0,
        hasMetChief: false,
        registeredDay: null,
        choice: null,
        history: [],
        spiritualRoot: null,
        rivalryReaction: null,
        completed: false
      };
      saveState();
      closeDialogue();
      if (typeof ANguyetStory !== 'undefined' && ANguyetStory.resetState) ANguyetStory.resetState();
      hideResultCard();
      cinematicStep = 0;
      cinematicTimer = 0;
      stepSubPhase = 'init';
      stepSubTimer = 0;
      currentCandidateIdx = 0;
      phamAutoWalk = false;
      questDetailTimer = 0;
      cameraOffset = { x: 0, y: 0 };
      targetCameraOffset = { x: 0, y: 0 };
      observationStone.visible = false;
      observationStone.state = STONE_STATES.IDLE;
      observationStone.activeRoot = null;
      lucNhamEntity.visible = false;
      initCandidateRegistry();
      if (typeof AHuy !== 'undefined') {
        AHuy.hidden = false;
        AHuy.reachingStone = false;
        AHuy.showCeremonyName = false;
        if (typeof AHuy.takeScenePosition === 'function') {
          AHuy.takeScenePosition(295, 335, -1);
        }
      }
      if (cachedChief) {
        cachedChief.state = 'work';
        cachedChief.x = 480;
        cachedChief.y = 350;
        cachedChief.home = [480, 350];
        cachedChief.dir = -1;
        cachedChief.route = [];
        cachedChief.walk = 0;
        cachedChief.pause = 0;
        cachedChief.spokenLine = '';
        cachedChief.reachingStone = false;
        cachedChief.showCeremonyName = false;
      }
    },
    startDialogue,
    closeDialogue,
    completeQuest,
    showToast,
    saveState,
    get cachedChief() {
      return cachedChief;
    }
  };
})();
