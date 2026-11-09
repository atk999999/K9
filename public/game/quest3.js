'use strict';

/**
 * LÀNG DU LÃM – KỊCH BẢN SAU BÌNH MINH
 * NHIỆM VỤ 3: TÌM KIẾM NGƯỜI SỐNG SÓT (VÀ HỒI ỨC ĐÊM TẬP KÍCH)
 *
 * Tuân thủ 100% tài liệu kịch bản TXT:
 * - Phương án 1: Phát chuỗi Hồi ức Đêm Tập Kích (01.webp -> 08.webp) khi sống sót qua đêm tới bình minh 06:00,
 *   nối tiếp 09.webp (Bước ra khỏi nhà) & 10.webp (Làng hoang tàn).
 * - Giai đoạn 1: Kiểm tra 4 địa điểm (0/4) theo thứ tự tự do, lưu tiến độ từng điểm ngay lập tức.
 * - Giai đoạn 2: Đủ 4/4 -> Sự thật trong im lặng (11.webp -> 12.webp) -> Mục tiêu: Tìm kiếm A Nguyệt.
 * - Giai đoạn 3: Nhặt Ruy Băng Xanh Của A Nguyệt gần Cổng Làng (13.webp -> 14.webp), giữ nguyên Vòng Chỉ Đỏ.
 *   Trạng thái A Nguyệt = missing_unknown (tuyệt đối không khẳng định tử vong, không lập mộ A Nguyệt).
 * - Giai đoạn 4: An Táng Cố Nhân dưới gốc cây anh đào (15.webp -> 60 ngôi mộ AI -> 16.webp).
 * - Giai đoạn 5: Tiến đến Cổng Làng & Rời Làng (17.webp), nhạc hạ dần rồi fade out.
 */
const Quest3 = (() => {
  const STORAGE_KEY = 'lang_du_lam_quest3_v1';

  // Tọa độ các điểm tương tác trên map hoang tàn có sẵn (không thay đổi tọa độ/hitbox map gốc)
  const SEARCH_LOCATIONS = {
    elder: {
      id: 'elder',
      flag: 'quest3_search_elder',
      name: 'Nhà Trưởng Làng',
      x: 765,
      y: 262,
      radius: 78,
      memorySpeaker: 'Hồi ức · Trưởng Làng',
      memoryAvatar: 'Truong_Lang_Avatar_9KB.webp',
      memoryText: '❝ “Tiểu Phàm, dù có linh căn hay không, con vẫn là đứa trẻ kiên cường và lương thiện nhất của Làng Du Lãm này…” ❞',
      narration: 'Cửa gãy, nền nhà ngổn ngang, không có tiếng người.',
      lines: [
        '“Trưởng làng! Là ta đây!”',
        '“…Không ai trả lời.”'
      ]
    },
    square: {
      id: 'square',
      flag: 'quest3_search_square',
      name: 'Quảng Trường Khảo Nghiệm',
      x: 735,
      y: 518,
      radius: 82,
      memorySpeaker: 'Hồi ức · Buổi Khảo Nghiệm Hôm Qua',
      memoryAvatar: 'tieu-pham-avatar.webp',
      memoryText: '❝ Mới chiều qua, cả làng còn đứng chật kín quanh đài đá hoa sen, hồi hộp nhìn từng cột sáng linh căn bay lên bầu trời… ❞',
      narration: 'Nơi từng tập trung dân làng nay vắng lặng, chỉ còn dấu vết hỗn loạn.',
      lines: [
        '“Hôm qua… mọi người còn đứng ở đây.”',
        '“Chẳng lẽ chỉ sau một đêm…”'
      ]
    },
    houses: {
      id: 'houses',
      flag: 'quest3_search_houses',
      name: 'Khu Nhà Dân / Đường Làng',
      x: 420,
      y: 505,
      altX: 955,
      altY: 760,
      radius: 82,
      memorySpeaker: 'Hồi ức · Bà Con Thôn Xóm',
      memoryAvatar: 'tieu-pham-avatar.webp',
      memoryText: '❝ “Thóc gặt xong phải chở ngay về kho làng kẻo sương xuống… Tối nay nhà thím nấu chè đậu, sang ăn nhé Tiểu Phàm!” ❞',
      narration: 'Vài cánh cửa đổ, vết cào, vệt máu nhỏ và đồ dùng rơi vãi.',
      lines: [
        '“Có ai còn sống không!? Xin hãy lên tiếng!”',
        '“Chỉ có tiếng gió…”'
      ]
    },
    garden: {
      id: 'garden',
      flag: 'quest3_search_garden',
      name: 'Vườn Hoa Phía Đông',
      x: 2400,
      y: 730,
      radius: 88,
      memorySpeaker: 'Hồi ức · A Nguyệt Dưới Giàn Hoa',
      memoryAvatar: 'A_Nguyet_Avatar_Duoi_10KB.webp',
      memoryText: '❝ “Ngày mai, khi mặt trời mọc, ngươi lại đến đây nhé. Chúng ta cùng ngắm hoa thêm lần nữa. Không được thất hứa đâu!” ❞',
      narration: 'Nơi Tiểu Phàm và A Nguyệt từng tâm sự, trao vòng chỉ đỏ. Giàn hoa dập nát, không còn bóng người.',
      lines: [
        '“A Nguyệt… ngươi đã từng đợi ta ở đây.”',
        '“Ngươi đi đâu rồi?”'
      ]
    }
  };

  const RIBBON_SPOT = {
    x: 690,
    y: 885,
    radius: 72,
    name: 'Dải Ruy Băng Xanh'
  };

  const MEMORIAL_SPOT = {
    x: 505,
    y: 745,
    treeX: 454,
    treeY: 680,
    radius: 100,
    name: 'Nghĩa Trang Cố Nhân · Gốc Anh Đào'
  };

  // Khu nghĩa trang AI: nền được vẽ trực tiếp từ ảnh WebP trong game,
  // không tạo đất, mộ hoặc cây bằng Canvas. Gốc ảnh phủ vườn hoang phía tây,
  // vẫn chừa đường chính x=690 và điểm đứng làm lễ ở x=505.
  const MEMORIAL_LAYOUT = Object.freeze({
    cacheX: 85, cacheY: 580, cacheW: 500, cacheH: 375,
    columnsLeft: [145, 170, 194, 219, 243, 269],
    columnsRight: [321, 346, 370, 396, 420, 444],
    rows: [691, 720, 753, 790, 825],
    aisleX: 296,
    clearingCenterX: 505,
    clearingCenterY: 745
  });

  const GATE_SPOT = {
    x: 690,
    y: 965,
    radius: 78,
    name: 'Cổng Làng Du Lãm'
  };

  // Danh sách 24 tên NPC thật có trong dữ liệu npcs.js (Tuyệt đối không có A Nguyệt, không tự bịa 50 tên)
  const KNOWN_VILLAGER_NAMES = [
    'Trưởng làng', 'Lão Trần', 'A Liên', 'Lão Ngư', 'Đại Sơn', 'Thiết Hổ',
    'Hồng Nương', 'Tiểu An', 'Bác Bình', 'Cô Đào', 'A Phúc', 'Tiểu Lan',
    'Cô Mai', 'Chú Lộc', 'Cô Thu', 'Thợ Mộc', 'A Khang', 'Bà Tâm',
    'Tiểu Minh', 'A Yến', 'A Tùng', 'Tiểu Cúc', 'Tiểu Sen', 'Dược bá'
  ];

  const TOTAL_GRAVES = 60; // 60 mộ trên ảnh AI (24 bia tên NPC + 36 mộ tưởng niệm)

  function createDefaultFlags() {
    return {
      version: 1,
      quest2_survived: false,
      player_exits_home: false,
      quest3_night_flashback_seen: false,
      quest3_started: false,
      quest3_search_elder: false,
      quest3_search_square: false,
      quest3_search_houses: false,
      quest3_search_garden: false,
      quest3_survivor_search_complete: false,
      quest3_ay_nguyet_search_started: false,
      quest3_blue_ribbon_collected: false,
      quest3_memorial_complete: false,
      quest3_village_departed: false,
      ay_nguyet_status: 'unknown', // Chuyển thành 'missing_unknown' khi nhặt ruy băng
      inventory_blue_ribbon: null,
      comic_checkpoint: null,
      quest3_timeline_day: null
    };
  }

  // Nhịp truyện từ 06:00 đến khoảng 15:00: mốc giờ tối thiểu theo tiến độ.
  // Không tua ngược đồng hồ nếu người chơi đi vòng/khám phá lâu hơn dự kiến.
  const STORY_TIME = Object.freeze({
    SEARCH: [0, 7 * 60 + 15, 8 * 60 + 30, 9 * 60 + 45, 11 * 60 + 15],
    TRUTH: 11 * 60 + 30,
    RIBBON: 12 * 60 + 15,
    DIG_START: 13 * 60,
    DIG_DONE: 14 * 60 + 45,
    MEMORIAL_DONE: 15 * 60
  });
  let flags = createDefaultFlags();

  function reachStoryTime(target, player) {
    if (typeof Villagers === 'undefined' || !Number.isFinite(Villagers.minutes)) return false;
    if (!Number.isInteger(flags.quest3_timeline_day)) flags.quest3_timeline_day = Villagers.day;
    // Không áp mốc của ngày xảy ra huyết nạn lên các ngày về sau.
    if (Number.isFinite(Villagers.day) && Villagers.day !== flags.quest3_timeline_day) return false;
    const next = Math.max(Villagers.minutes, target);
    if (next <= Villagers.minutes) return false;
    Villagers.minutes = next;
    // Lưu đồng bộ giờ + cờ nhiệm vụ. Khi nạp lại không bị lệch đồng hồ.
    if (typeof GameSave !== 'undefined' && GameSave.save) GameSave.save(true, player);
    return true;
  }

  // Đọc hồi ức / lời thoại không làm trôi thêm hàng giờ vì thời gian người chơi đọc lâu.
  function isStoryClockPaused() {
    return !!activeComic || (typeof Quest1 !== 'undefined' &&
      typeof Quest1.isDialogueActive === 'function' && Quest1.isDialogueActive());
  }


  // Trạng thái trình chiếu Motion Comic & Hoạt cảnh
  let activeComic = null; // { queue: [...], index: 0, timer: 0, autoAdvance: false, onComplete: fn }
  let activeSceneLock = false;
  let departureWalkTimer = 0;
  let departureFadeAlpha = 0;
  let memorialBuildAlpha = 0;
  // Chống nhảy khung khi đi qua ranh giới của vùng ngắm nghĩa trang.
  let memorialFramingActive = false;
  let memorialGroundImage = null;
  let memorialGroundFailed = false;
  let graveList = [];
  let cherryPetals = [];

  // Dữ liệu NPC/hitbox khớp 60 bia mộ nhìn thấy trên ảnh AI.
  // Mọi tên chính thức trong truyện được giữ nguyên, không có mộ A Nguyệt.
  function initGravesData() {
    if (graveList.length > 0) return;
    const cols = MEMORIAL_LAYOUT.columnsLeft.concat(MEMORIAL_LAYOUT.columnsRight);
    for (const y of MEMORIAL_LAYOUT.rows) {
      for (const x of cols) {
        const idx = graveList.length;
        const knownName = idx < KNOWN_VILLAGER_NAMES.length ? KNOWN_VILLAGER_NAMES[idx] : null;
        graveList.push({
          index: idx + 1, x, y,
          name: knownName ? `Mộ phần · ${knownName}` : 'Mộ tưởng niệm',
          subtitle: knownName ? 'Cố nhân Làng Du Lãm' : 'Mộ tưởng niệm cố nhân Làng Du Lãm (Không tìm thấy di hài)'
        });
      }
    }
    cherryPetals = Array.from({ length: 32 }, (_, i) => ({
      x: 430 + ((i * 37) % 115),
      y: 625 + ((i * 29) % 215),
      speedY: 8 + (i % 5) * 2.5,
      driftX: 6 + (i % 4) * 2.3,
      phase: i * 1.13,
      size: 2 + (i % 3) * 0.7
    }));
  }

  function resolveGameAssetUrl(relPath) {
    const clean = String(relPath || '').replace(/^\/+/, '').replace(/^\.\//, '');
    if (!clean) return '';
    if (typeof window !== 'undefined' && window.location) {
      try { return new URL(clean, window.location.href).href; } catch (e) {}
    }
    return clean;
  }

  // Nạp trước, KHÔNG vẽ trước sự kiện ĐẮP MỘ. Chỉ dùng ảnh AI:
  // không còn nhánh dựng bia mộ, cây, đất bằng lệnh Canvas.
  function loadMemorialGroundImage() {
    if (memorialGroundImage || memorialGroundFailed || typeof Image === 'undefined') return;
    const asset = new Image();
    memorialGroundImage = asset;
    asset.decoding = 'async';
    asset.onerror = () => { memorialGroundFailed = true; };
    asset.src = resolveGameAssetUrl('nghia_trang_tuong_niem.webp?v=5');
  }

  // -------------------------------------------------------------
  // LƯU & TẢI TRẠNG THÁI (MỤC X)
  // -------------------------------------------------------------
  function saveState() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
      }
    } catch (e) {}
  }

  function loadState() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            flags = { ...createDefaultFlags(), ...parsed };
          }
        }
      }
    } catch (e) {}
  }

  function getSearchCount() {
    let c = 0;
    if (flags.quest3_search_elder) c++;
    if (flags.quest3_search_square) c++;
    if (flags.quest3_search_houses) c++;
    if (flags.quest3_search_garden) c++;
    return c;
  }

  // -------------------------------------------------------------
  // ÂM THANH & HIỆU ỨNG (MỤC IX)
  // -------------------------------------------------------------
  function getAudioCtx() {
    if (typeof VillageMusic !== 'undefined' && VillageMusic.isMuted) return null;
    try {
      if (typeof VillageMusic !== 'undefined' && VillageMusic.audioCtx) return VillageMusic.audioCtx;
      if (typeof window !== 'undefined' && window._langDuLamSfxCtx) return window._langDuLamSfxCtx;
    } catch (e) {}
    return null;
  }

  function ensureMorningRuinsAudio(volumeFactor = 1.0) {
    // Tuyệt đối tắt tiếng GRR của Liệp Ma lúc bình minh
    if (typeof LiepMaSFX !== 'undefined' && typeof LiepMaSFX.stop === 'function') {
      LiepMaSFX.stop();
    }
    if (typeof VillageMusic !== 'undefined') {
      if (typeof VillageMusic.setSceneMode === 'function') {
        VillageMusic.setSceneMode('ruins');
      } else if (typeof VillageMusic.setRuinsMorningMode === 'function') {
        VillageMusic.setRuinsMorningMode(true);
      }
    }
  }

  function playSoftWindSfx() {
    const actx = getAudioCtx();
    if (!actx || actx.state === 'suspended') return;
    try {
      const now = actx.currentTime;
      const len = Math.floor((actx.sampleRate || 44100) * 0.6);
      const buf = actx.createBuffer(1, len, actx.sampleRate || 44100);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI) * 0.12;
      }
      const src = actx.createBufferSource();
      src.buffer = buf;
      const filter = actx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);
      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);
      src.start(now);
    } catch (e) {}
  }

  function playSoilDigSfx() {
    const actx = getAudioCtx();
    if (!actx || actx.state === 'suspended') return;
    try {
      const now = actx.currentTime;
      const len = Math.floor((actx.sampleRate || 44100) * 0.22);
      const buf = actx.createBuffer(1, len, actx.sampleRate || 44100);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35)) * 0.25;
      }
      const src = actx.createBufferSource();
      src.buffer = buf;
      const filter = actx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, now);
      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);
      src.start(now);
    } catch (e) {}
  }

  function showBannerToast(title, body) {
    if (typeof document === 'undefined') return;
    const banner = document.getElementById('quest-toast');
    const titleEl = document.getElementById('quest-toast-title');
    const bodyEl = document.getElementById('quest-toast-body');
    if (banner && titleEl && bodyEl) {
      titleEl.textContent = title;
      bodyEl.textContent = body;
      banner.hidden = false;
      banner.style.opacity = '1';
      clearTimeout(banner._q3Timer);
      banner._q3Timer = setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => { banner.hidden = true; }, 600);
      }, 4200);
    }
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = `${title} — ${body}`;
      toast.style.opacity = '1';
      clearTimeout(toast._hideTimer);
      toast._hideTimer = setTimeout(() => { toast.style.opacity = '0'; }, 4200);
    }
  }

  // -------------------------------------------------------------
  // TRÌNH PHÁT MOTION COMIC THEO TỪNG MỐC (TÁCH SANG quest3-comic.js)
  // -------------------------------------------------------------
  const PANEL_FRAMING = Quest3Comic.PANEL_FRAMING;

  const comicCtrl = {
    getActiveComic: () => activeComic,
    advanceComicPanel: () => advanceComicPanel(),
    skipComicSequence: () => skipComicSequence()
  };

  function ensureComicOverlayDOM() {
    return Quest3Comic.ensureComicOverlayDOM(comicCtrl);
  }

  function renderCurrentComicSlide() {
    Quest3Comic.renderCurrentComicSlide(comicCtrl);
  }


  function completeComicScene(kind, player) {
    const pl = player || (typeof p !== 'undefined' ? p : null);
    switch (kind) {
      case 'dawn': {
      flags.quest3_night_flashback_seen = true;
      flags.quest3_started = true;
      if (!Number.isInteger(flags.quest3_timeline_day) && typeof Villagers !== 'undefined') flags.quest3_timeline_day = Villagers.day;
      saveState();
      if (typeof GameSave !== 'undefined' && GameSave.save) GameSave.save(true, pl);
      showBannerToast(
        'NHIỆM VỤ 3 – TÌM KIẾM NGƯỜI SỐNG SÓT',
        `Mục tiêu: Kiểm tra 4 địa điểm (${getSearchCount()}/4).`
      );
    
        break;
      }
      case 'stage2': {
      flags.quest3_survivor_search_complete = true;
      flags.quest3_ay_nguyet_search_started = true;
      reachStoryTime(STORY_TIME.TRUTH, pl);
      saveState();
      showBannerToast(
        'Mục tiêu mới: TÌM KIẾM A NGUYỆT',
        'Hãy lần theo dấu vết về phía Cổng Làng để tìm tung tích A Nguyệt.'
      );
    
        break;
      }
      case 'ribbon': {
      flags.quest3_blue_ribbon_collected = true;
      flags.ay_nguyet_status = 'missing_unknown';
      reachStoryTime(STORY_TIME.RIBBON, pl);
      flags.inventory_blue_ribbon = {
        id: 'blue_ribbon_a_nguyet',
        name: 'Ruy Băng Xanh Của A Nguyệt',
        type: 'Kỷ vật / Manh mối',
        description: 'Dải ruy băng nhuốm bụi tro, từng buộc trên mái tóc của A Nguyệt. Số phận chủ nhân vẫn chưa rõ.'
      };
      if (typeof ANguyetStory !== 'undefined' && ANguyetStory.saveState) {
        try { ANguyetStory.saveState(); } catch (e) {}
      }
      saveState();
      showBannerToast(
        'Nhận: RUY BĂNG XANH CỦA A NGUYỆT',
        'Nhiệm vụ tiếp nối: AN TÁNG CỐ NHÂN — Đến dưới gốc cây anh đào lập mộ tưởng niệm dân làng.'
      );
    
        break;
      }
      case 'memorial': {
      flags.quest3_memorial_complete = true;
      memorialBuildAlpha = 1;
      reachStoryTime(STORY_TIME.MEMORIAL_DONE, pl);
      saveState();
      if (typeof GameSave !== 'undefined' && GameSave.save) GameSave.save(true, pl);
      showBannerToast(
        'Đã hoàn thành: AN TÁNG CỐ NHÂN',
        'Mục tiêu mới: TIẾN ĐẾN CỔNG LÀNG để rời khỏi Làng Du Lãm.'
      );
    
        break;
      }
      case 'depart': {
      flags.quest3_village_departed = true;
      departureWalkTimer = 2.8;
      departureFadeAlpha = 0;
      saveState();
      if (typeof GameSave !== 'undefined' && GameSave.save) GameSave.save(true, pl);
      if (typeof VillageMusic !== 'undefined' && typeof VillageMusic.pause === 'function') {
        setTimeout(() => {
          try { VillageMusic.pause(); } catch (e) {}
        }, 1800);
      }
    
        break;
      }
      default: break;
    }
  }

  function playComicSequence(queue, onComplete, sceneKind = null, includeNightFlashback = false) {
    if (!Array.isArray(queue) || queue.length === 0) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }
    if (typeof Quest3Comic.preloadComicPanels === 'function') Quest3Comic.preloadComicPanels(queue);
    activeComic = {
      queue,
      index: 0,
      timer: 0,
      autoAdvance: false,
      onComplete: onComplete || null,
      sceneKind
    };
    activeSceneLock = true;
    if (sceneKind) { flags.comic_checkpoint = { scene: sceneKind, index: 0, includeNightFlashback: !!includeNightFlashback }; saveState(); }
    renderCurrentComicSlide();
  }

  function finishComicSequence() {
    const overlay = typeof document !== 'undefined' ? document.getElementById('quest3-comic-overlay') : null;
    if (overlay) overlay.hidden = true;
    const cb = activeComic ? activeComic.onComplete : null;
    activeComic = null;
    activeSceneLock = false;
    flags.comic_checkpoint = null;
    saveState();
    if (typeof cb === 'function') {
      cb();
    }
  }

  function advanceComicPanel() {
    if (!activeComic) return false;
    activeComic.index++;
    activeComic.timer = 0;
    if (flags.comic_checkpoint) { flags.comic_checkpoint.index = activeComic.index; saveState(); }
    if (activeComic.index >= activeComic.queue.length) {
      finishComicSequence();
    } else {
      renderCurrentComicSlide();
    }
    return true;
  }

  function skipComicSequence() {
    if (!activeComic) return false;
    finishComicSequence();
    return true;
  }

  const NIGHT_FLASHBACK_PANELS = Quest3Comic.NIGHT_FLASHBACK_PANELS;
  const DAWN_OPENING_PANELS = Quest3Comic.getDawnOpeningPanels(() => {
    ensureMorningRuinsAudio();
    playSoftWindSfx();
  });

  // -------------------------------------------------------------
  // CÁC GIAI ĐOẠN NHIỆM VỤ 3 (MỤC II -> VII)
  // -------------------------------------------------------------

  // Kích hoạt khi Tiểu Phàm sống sót qua Nhiệm vụ 2 (trong chum) và bước ra lúc 06:00
  function triggerFromDawn(player, includeNightFlashback = true) {
    if (flags.quest3_started) return false;

    const survived = Boolean(
      flags.quest2_survived ||
      (typeof Quest2 !== 'undefined' && Quest2.getData && (Quest2.getData().survivedInJar || Quest2.getData().ruinsActive)) ||
      (typeof Quest2 !== 'undefined' && Quest2.isVillageRuined && Quest2.isVillageRuined())
    );
    const mins = (typeof Villagers !== 'undefined' && typeof Villagers.minutes === 'number') ? Villagers.minutes : 360;
    if (!survived || mins < 360) return false;

    flags.quest2_survived = true;
    flags.player_exits_home = true;
    if (!Number.isInteger(flags.quest3_timeline_day) && typeof Villagers !== 'undefined') flags.quest3_timeline_day = Villagers.day;
    ensureMorningRuinsAudio();

    const pl = player || (typeof p !== 'undefined' ? p : null);
    if (pl && typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside) {
      if (pl.x > 560 && pl.y > 348) {
        pl.x = 556;
        pl.y = 356;
        pl.dir = 'down';
      }
    }

    const sequence = [];
    if (includeNightFlashback && !flags.quest3_night_flashback_seen) {
      sequence.push(...NIGHT_FLASHBACK_PANELS);
    }
    sequence.push(...DAWN_OPENING_PANELS);

    playComicSequence(sequence, () => completeComicScene('dawn', pl), 'dawn', includeNightFlashback);

    return true;
  }

  // Kiểm tra 1 trong 4 địa điểm (Mục III)
  function inspectLocation(locKey, player) {
    const loc = SEARCH_LOCATIONS[locKey];
    if (!loc || !flags.quest3_started) return false;
    if (flags[loc.flag]) return false;

    // Lưu tiến độ từng điểm ngay khi kiểm tra
    flags[loc.flag] = true;
    const count = getSearchCount();
    reachStoryTime(STORY_TIME.SEARCH[count], player);
    saveState();
    playSoftWindSfx();

    const script = [
      {
        speaker: loc.memorySpeaker,
        role: 'Ký ức Làng Du Lãm',
        avatar: loc.memoryAvatar,
        text: `${loc.memoryText}\n\n(${loc.narration})`
      },
      {
        speaker: 'Tiểu Phàm',
        role: `Tìm kiếm người sống sót (${count}/4)`,
        avatar: 'tieu-pham-avatar.webp',
        text: `${loc.lines.join('\n')}\n\n[Đã kiểm tra: ${loc.name} — ${count}/4]`,
        onFinish: () => {
          if (typeof Quest1 !== 'undefined' && Quest1.closeDialogue) Quest1.closeDialogue();
          showBannerToast(
            `Đã kiểm tra: ${loc.name} (${count}/4)`,
            count < 4
              ? `Tiếp tục tìm kiếm người sống sót tại các địa điểm còn lại (${count}/4).`
              : 'Đã kiểm tra đủ 4 địa điểm trong làng.'
          );
          if (count >= 4 && !flags.quest3_survivor_search_complete) {
            triggerStage2TruthInSilence(player);
          }
        }
      }
    ];

    if (typeof Quest1 !== 'undefined' && typeof Quest1.startDialogue === 'function') {
      Quest1.startDialogue(script);
    } else if (count >= 4 && !flags.quest3_survivor_search_complete) {
      triggerStage2TruthInSilence(player);
    }

    return true;
  }

  // Giai đoạn 2: Sự thật trong im lặng (survivor_search_count = 4) (Mục IV)
  function triggerStage2TruthInSilence(player) {
    if (flags.quest3_survivor_search_complete) return false;
    if (getSearchCount() < 4) return false;

    playComicSequence(Quest3Comic.STAGE2_PANELS, () => completeComicScene('stage2', player), 'stage2');

    return true;
  }

  // Giai đoạn 3: Nhặt Dải Ruy Băng Xanh gần Cổng Làng (Mục V)
  function collectBlueRibbon(player) {
    if (!flags.quest3_ay_nguyet_search_started || flags.quest3_blue_ribbon_collected) return false;
    playSoftWindSfx();

    playComicSequence(Quest3Comic.RIBBON_PANELS, () => completeComicScene('ribbon', player), 'ribbon');

    return true;
  }

  // Giai đoạn 4: An Táng Cố Nhân dưới gốc cây anh đào (Mục VI)
  function buildMemorialAndKneel(player) {
    if (!flags.quest3_blue_ribbon_collected || flags.quest3_memorial_complete) return false;
    initGravesData();
    loadMemorialGroundImage();
    playSoilDigSfx();
    reachStoryTime(STORY_TIME.DIG_START, player);

    const pl = player || (typeof p !== 'undefined' ? p : null);
    if (pl) {
      pl.x = MEMORIAL_SPOT.x;
      pl.y = MEMORIAL_SPOT.y;
      pl.dir = 'right';
      pl.face = 1;
      pl.walk = 0;
    }

    const panels = Quest3Comic.getMemorialPanels(
      () => {
        playSoilDigSfx();
        memorialBuildAlpha = 1;
      },
      () => {
        reachStoryTime(STORY_TIME.DIG_DONE, pl);
        playSoftWindSfx();
      }
    );

    playComicSequence(panels, () => completeComicScene('memorial', pl), 'memorial');

    return true;
  }

  // Giai đoạn 5: Rời Làng tại Cổng Làng (Mục VII)
  function departVillage(player) {
    if (!flags.quest3_memorial_complete || flags.quest3_village_departed) return false;
    playSoftWindSfx();

    const pl = player || (typeof p !== 'undefined' ? p : null);
    if (pl) {
      pl.x = GATE_SPOT.x;
      pl.y = GATE_SPOT.y;
      pl.dir = 'down';
      pl.walk = 0;
    }

    playComicSequence(Quest3Comic.DEPART_PANELS, () => completeComicScene('depart', pl), 'depart');

    return true;
  }

  // -------------------------------------------------------------
  // TƯƠNG TÁC & KIỂM TRA KHOẢNG CÁCH
  // -------------------------------------------------------------
  function distTo(player, x, y) {
    if (!player) return Infinity;
    return Math.hypot(player.x - x, player.y - y);
  }

  function getNearestInteractTarget(player) {
    if (!player || !flags.quest3_started) return null;
    if (typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside) return null;

    // Giai đoạn 1: 4 điểm tìm người sống sót
    if (!flags.quest3_survivor_search_complete) {
      for (const key of Object.keys(SEARCH_LOCATIONS)) {
        const loc = SEARCH_LOCATIONS[key];
        if (flags[loc.flag]) continue;
        const d1 = distTo(player, loc.x, loc.y);
        const d2 = (loc.altX && loc.altY) ? distTo(player, loc.altX, loc.altY) : Infinity;
        const d = Math.min(d1, d2);
        if (d <= loc.radius) {
          return { type: 'search', key, label: `Kiểm tra · ${loc.name}`, x: d1 <= d2 ? loc.x : loc.altX, y: d1 <= d2 ? loc.y : loc.altY };
        }
      }
      return null;
    }

    // Giai đoạn 3: Nhặt Ruy Băng Xanh gần Cổng Làng
    if (flags.quest3_ay_nguyet_search_started && !flags.quest3_blue_ribbon_collected) {
      if (distTo(player, RIBBON_SPOT.x, RIBBON_SPOT.y) <= RIBBON_SPOT.radius) {
        return { type: 'ribbon', label: 'Nhặt · Ruy Băng Xanh Của A Nguyệt', x: RIBBON_SPOT.x, y: RIBBON_SPOT.y };
      }
      return null;
    }

    // Giai đoạn 4: An Táng Cố Nhân dưới gốc cây anh đào
    if (flags.quest3_blue_ribbon_collected && !flags.quest3_memorial_complete) {
      if (distTo(player, MEMORIAL_SPOT.x, MEMORIAL_SPOT.y) <= MEMORIAL_SPOT.radius) {
        return { type: 'memorial', label: 'Đắp Mộ · An Táng Cố Nhân', x: MEMORIAL_SPOT.x, y: MEMORIAL_SPOT.y };
      }
      return null;
    }

    // Giai đoạn 5: Rời Làng tại Cổng Làng
    if (flags.quest3_memorial_complete && !flags.quest3_village_departed) {
      if (distTo(player, GATE_SPOT.x, GATE_SPOT.y) <= GATE_SPOT.radius) {
        return { type: 'depart', label: 'Rời Khỏi Làng Du Lãm', x: GATE_SPOT.x, y: GATE_SPOT.y };
      }
    }

    return null;
  }

  function interact(player) {
    const pl = player || (typeof p !== 'undefined' ? p : null);
    if (activeComic) {
      return advanceComicPanel();
    }
    const target = getNearestInteractTarget(pl);
    if (!target) return false;

    if (target.type === 'search') return inspectLocation(target.key, pl);
    if (target.type === 'ribbon') return collectBlueRibbon(pl);
    if (target.type === 'memorial') return buildMemorialAndKneel(pl);
    if (target.type === 'depart') return departVillage(pl);
    return false;
  }

  // Chỉ hitbox bia mộ AI; hành lang giữa và khu vực quỳ không bị khóa.
  function isGraveBlocked(x, y) {
    if (!flags.quest3_memorial_complete) return false;
    if (x < 130 || x > 458 || y < 678 || y > 840) return false;
    initGravesData();
    for (const grave of graveList) {
      if (Math.abs(x - grave.x) < 10 && Math.abs(y - grave.y) < 8) return true;
    }
    return false;
  }

  // Một khung ngắm rộng hơn khi đứng gần nghĩa trang; không tác động hệ thống
  // điều khiển, lưu trữ hay vị trí camera ngoài khu nghĩa trang.
  function getMemorialFraming(player) {
    if (!flags.quest3_blue_ribbon_collected || flags.quest3_village_departed || !player) {
      memorialFramingActive = false;
      return null;
    }
    const distance = distTo(player, MEMORIAL_SPOT.x, MEMORIAL_SPOT.y);
    // Vào trong 210, nhưng chỉ thoát hẳn sau 270 đơn vị: không bật/tắt
    // liên tục khi nhân vật dao động qua mép vùng nghĩa trang.
    if (!memorialFramingActive && distance <= 210) memorialFramingActive = true;
    else if (memorialFramingActive && distance >= 270) memorialFramingActive = false;
    return memorialFramingActive ? { x: 375, y: 765 } : null;
  }

  // -------------------------------------------------------------
  // UPDATE & DRAW TRONG GAME LOOP
  // -------------------------------------------------------------
  function update(dt, timeSec, player) {
    initGravesData();

    // Hoạt cảnh bước qua cổng làng hướng về khu rừng ở cuối Giai đoạn 5
    if (departureWalkTimer > 0) {
      departureWalkTimer = Math.max(0, departureWalkTimer - dt);
      const pl = player || (typeof p !== 'undefined' ? p : null);
      if (pl && pl.y < 1018) {
        pl.y = Math.min(1018, pl.y + 38 * dt);
        pl.dir = 'down';
        pl.walk += dt * 9;
      }
      departureFadeAlpha = Math.min(0.75, (2.8 - departureWalkTimer) / 2.8 * 0.75);
    }

    // Cập nhật cánh hoa anh đào rơi chậm khi đã lập mộ
    if (flags.quest3_memorial_complete) {
      for (let i = 0; i < cherryPetals.length; i++) {
        const pt = cherryPetals[i];
        pt.y += pt.speedY * dt;
        pt.x += Math.sin(timeSec * 1.4 + pt.phase) * pt.driftX * dt;
        if (pt.y > 879) {
          pt.y = MEMORIAL_SPOT.treeY - 94;
          pt.x = MEMORIAL_SPOT.treeX - 65 + ((i * 37) % 168);
        }
      }
    }

    // Cập nhật nút tương tác (#talk & #punch-label) khi lại gần mốc nhiệm vụ 3
    if (typeof document !== 'undefined' && flags.quest3_started && (typeof TieuPhamHome === 'undefined' || !TieuPhamHome.inside)) {
      const talkBtn = document.getElementById('talk');
      const punchBtn = document.getElementById('punch');
      const punchLbl = document.getElementById('punch-label');
      if (activeComic || departureWalkTimer > 0) {
        if (talkBtn) talkBtn.hidden = true;
      } else {
        const target = getNearestInteractTarget(player);
        if (target) {
          if (talkBtn) {
            talkBtn.hidden = false;
            talkBtn.textContent = target.label;
          }
          const icon = target.type === 'ribbon' ? '🎗️' : target.type === 'memorial' ? '🌸' : target.type === 'depart' ? '⛩️' : '🔍';
          const lbl = target.type === 'ribbon' ? 'NHẶT' : target.type === 'memorial' ? 'ĐẮP MỘ' : target.type === 'depart' ? 'RỜI LÀNG' : 'KIỂM TRA';
          if (punchLbl) punchLbl.textContent = lbl;
          if (punchBtn) {
            if (punchBtn.firstChild && punchBtn.firstChild.nodeType === 3) punchBtn.firstChild.nodeValue = icon;
            if (punchBtn.classList && typeof punchBtn.classList.toggle === 'function') punchBtn.classList.toggle('interact-ready', true);
          }
        }
      }
    }
  }

  function drawMarkerRing(ctx, x, y, timeSec, color = '#ffd97d', label = '') {
    const pulse = 0.55 + 0.45 * Math.sin(timeSec * 3.8);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.45 + pulse * 0.35;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(x, y, 14 + pulse * 3, 7 + pulse * 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(x, y - 14 - Math.sin(timeSec * 4) * 2.5, 3, 0, Math.PI * 2);
    ctx.fill();

    if (label) {
      ctx.font = 'bold 10px "Noto Serif", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(12, 22, 18, 0.82)';
      ctx.fillText(label, x + 1, y - 22 + 1);
      ctx.fillStyle = '#fff5d6';
      ctx.fillText(label, x, y - 22);
    }
    ctx.restore();
  }

  // Lớp hình AI xuất hiện khi bước vào hồi ức ĐẮP MỘ; sau khi
  // hoàn thành, ảnh được lưu và hiển thị lại ở mọi lần tải game.
  function drawGround(ctx) {
    if (!ctx || !flags.quest3_started || !(flags.quest3_memorial_complete || memorialBuildAlpha > 0)) return;
    loadMemorialGroundImage();
    const image = memorialGroundImage;
    if (image && image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, MEMORIAL_LAYOUT.cacheX, MEMORIAL_LAYOUT.cacheY, MEMORIAL_LAYOUT.cacheW, MEMORIAL_LAYOUT.cacheH);
      // Phủ nhẹ tông lạnh sẫm để khu tưởng niệm đồng bộ hơn với nền làng hoang tàn.
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(28, 36, 34, 0.10)';
      ctx.fillRect(MEMORIAL_LAYOUT.cacheX, MEMORIAL_LAYOUT.cacheY, MEMORIAL_LAYOUT.cacheW, MEMORIAL_LAYOUT.cacheH);
      ctx.restore();
    }
  }

  function drawWorld(ctx, timeSec) {
    if (!ctx || !flags.quest3_started) return;

    // 1. Giai đoạn 1: Vẽ 4 dấu nhiệm vụ nhỏ tại 4 địa điểm chưa kiểm tra
    if (!flags.quest3_survivor_search_complete) {
      for (const key of Object.keys(SEARCH_LOCATIONS)) {
        const loc = SEARCH_LOCATIONS[key];
        if (flags[loc.flag]) continue;
        drawMarkerRing(ctx, loc.x, loc.y, timeSec, '#fbbf24', loc.name);
      }
    }

    // 2. Giai đoạn 3: Vẽ Dải Ruy Băng Xanh hoa trắng vương bụi và vệt máu nhỏ gần Cổng Làng
    // (Tuyệt đối không dùng hiệu ứng phép thuật theo Mục IX)
    if (flags.quest3_ay_nguyet_search_started && !flags.quest3_blue_ribbon_collected) {
      const rx = RIBBON_SPOT.x;
      const ry = RIBBON_SPOT.y;
      const breeze = Math.sin(timeSec * 2.2) * 1.2;
      ctx.save();
      ctx.translate(rx, ry);
      // Vệt máu nhỏ sẫm màu trên đất bụi
      ctx.fillStyle = 'rgba(110, 22, 26, 0.65)';
      ctx.beginPath();
      ctx.ellipse(-6, 3, 3.2, 1.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // Dải ruy băng xanh hoa trắng vương bụi tro
      ctx.strokeStyle = '#5e87b0';
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-9, 1);
      ctx.quadraticCurveTo(-1, -4, 7 + breeze, 1);
      ctx.quadraticCurveTo(12 + breeze, 4, 15 + breeze * 1.2, 0);
      ctx.stroke();
      // Hoa trắng nhỏ điểm trên ruy băng
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(-3, -2, 1.8, 1.8);
      ctx.fillRect(4, -1, 1.8, 1.8);
      ctx.restore();

      drawMarkerRing(ctx, rx, ry, timeSec, '#93c5fd', 'Ruy băng xanh');
    }

    // 3. Giai đoạn 4: Điểm tương tác chuẩn bị đất/gỗ dưới gốc cây anh đào
    if (flags.quest3_blue_ribbon_collected && !flags.quest3_memorial_complete) {
      drawMarkerRing(ctx, MEMORIAL_SPOT.x, MEMORIAL_SPOT.y, timeSec, '#f9a8d4', 'Đắp Mộ · Cố Nhân');
    }

    // 4. Bia mộ/đất nền đã vẽ TRƯỚC nhân vật bằng drawGround.
    // Để lại riêng cánh hoa bay phía trước, tránh mặt đất lấp Tiểu Phàm.
    if (flags.quest3_memorial_complete || memorialBuildAlpha > 0) {
      // Cánh hoa anh đào rơi chậm trong gió nhẹ
      ctx.save();
      for (let i = 0; i < cherryPetals.length; i++) {
        const pt = cherryPetals[i];
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 210, 222, 0.82)' : 'rgba(244, 162, 184, 0.78)';
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, pt.size, pt.size * 0.6, pt.phase, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Giai đoạn 5: Dấu dẫn đường tại Cổng Làng để rời làng
    if (flags.quest3_memorial_complete && !flags.quest3_village_departed) {
      drawMarkerRing(ctx, GATE_SPOT.x, GATE_SPOT.y, timeSec, '#fde047', 'Cổng Làng · Rời Làng');
    }
  }

  function drawHUD(ctx, player, W, H, timeSec) {
    if (!ctx || !flags.quest3_started) return;

    const target = getNearestInteractTarget(player);
    if (target && !activeComic) {
      const bw = Math.min(310, W - 32);
      const bh = 38;
      const bx = Math.round((W - bw) / 2);
      const by = H - 108;
      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, by, bw, bh, 8);
      else ctx.rect(bx, by, bw, bh);
      ctx.fillStyle = 'rgba(18, 38, 30, 0.94)';
      ctx.fill();
      ctx.strokeStyle = '#e5c87e';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.font = 'bold 12.5px "Noto Serif", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff3c4';
      ctx.fillText(`✦ [E / Chạm] ${target.label}`, bx + bw / 2, by + bh / 2);
      ctx.restore();
    }

    if (departureFadeAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(8, 12, 10, ${departureFadeAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  // Cung cấp thông tin hiển thị trên Bảng Nhiệm Vụ góc trái trên (Quest HUD Card)
  function getHUDInfo() {
    if (!flags.quest3_started) return null;

    if (!flags.quest3_survivor_search_complete) {
      const count = getSearchCount();
      return {
        title: 'Tìm Kiếm Người Sống Sót',
        tag: 'Nhiệm Vụ 3',
        tagColor: '#fbbf24',
        objective: `Kiểm tra 4 địa điểm (${count}/4)`,
        status: `${count}/4`,
        statusColor: '#fde68a',
        urgent: true,
        hint: 'Kiểm tra Nhà Trưởng Làng, Quảng Trường, Khu Nhà Dân và Vườn Hoa Phía Đông.'
      };
    }

    if (!flags.quest3_blue_ribbon_collected) {
      return {
        title: 'Tìm Kiếm A Nguyệt',
        tag: 'Manh Mối',
        tagColor: '#93c5fd',
        objective: 'Tìm dấu vết gần Cổng Làng',
        status: 'Khẩn cấp',
        statusColor: '#bfdbfe',
        urgent: true,
        hint: 'A Nguyệt nhất định vẫn còn sống. Hãy tìm manh mối quanh lối ra Cổng Làng.'
      };
    }

    if (!flags.quest3_memorial_complete) {
      return {
        title: 'An Táng Cố Nhân',
        tag: 'Tưởng Niệm',
        tagColor: '#f9a8d4',
        objective: 'Dựng bia mộ dưới gốc anh đào',
        status: 'Cố nhân',
        statusColor: '#fbcfe8',
        urgent: false,
        hint: 'Đến khu đất dưới cây anh đào phía tây nam làng để đắp mộ và dựng bia tưởng niệm hơn 50 dân làng.'
      };
    }

    if (!flags.quest3_village_departed) {
      return {
        title: 'Rời Khỏi Làng Du Lãm',
        tag: 'Khởi Hành',
        tagColor: '#fde047',
        objective: 'Tiến đến Cổng Làng',
        status: 'Sẵn sàng',
        statusColor: '#fef08a',
        urgent: false,
        hint: 'Mang theo dải ruy băng xanh và vòng chỉ đỏ, tiến ra Cổng Làng bước vào hành trình tìm sự thật.'
      };
    }

    return null;
  }

  function handleClick(screenX, screenY, W, H, player) {
    if (activeComic) {
      return advanceComicPanel();
    }
    const target = getNearestInteractTarget(player);
    if (target && H && W) {
      const bw = Math.min(310, W - 32);
      const bh = 38;
      const bx = Math.round((W - bw) / 2);
      const by = H - 108;
      if (screenX >= bx && screenX <= bx + bw && screenY >= by && screenY <= by + bh) {
        return interact(player);
      }
    }
    return false;
  }

  function init() {
    loadState();
    initGravesData();
    loadMemorialGroundImage();
    if (flags.quest3_memorial_complete) {
      memorialBuildAlpha = 1;
      loadMemorialGroundImage();
    }
    if (flags.quest3_started) {
      ensureMorningRuinsAudio();
    }
  }

  function restoreAfterLoad(player) {
    loadState();
    activeComic = null;
    activeSceneLock = false;
    const overlay = typeof document !== 'undefined' ? document.getElementById('quest3-comic-overlay') : null;
    if (overlay) overlay.hidden = true;
    if (flags.quest3_started) ensureMorningRuinsAudio();
    if (!Number.isInteger(flags.quest3_timeline_day) && typeof Villagers !== 'undefined') {
      flags.quest3_timeline_day = Villagers.day;
      // Tương thích save cũ đã hoàn thành an táng nhưng đồng hồ vẫn là buổi sáng.
      if (flags.quest3_memorial_complete) reachStoryTime(STORY_TIME.MEMORIAL_DONE, player);
      else if (flags.quest3_blue_ribbon_collected) reachStoryTime(STORY_TIME.RIBBON, player);
      else if (flags.quest3_survivor_search_complete) reachStoryTime(STORY_TIME.TRUTH, player);
      else reachStoryTime(STORY_TIME.SEARCH[getSearchCount()], player);
      saveState();
    }
    const checkpoint = flags.comic_checkpoint;
    if (!checkpoint || typeof checkpoint !== 'object') return;
    const scene = checkpoint.scene;
    let queue = null;
    if (scene === 'dawn') {
      queue = [
        ...(checkpoint.includeNightFlashback && !flags.quest3_night_flashback_seen ? NIGHT_FLASHBACK_PANELS : []),
        ...DAWN_OPENING_PANELS
      ];
    } else if (scene === 'stage2') queue = Quest3Comic.STAGE2_PANELS;
    else if (scene === 'ribbon') queue = Quest3Comic.RIBBON_PANELS;
    else if (scene === 'memorial') {
      // Tải lại giữa khung 15/16 vẫn nhìn thấy khu mộ vừa đắp.
      memorialBuildAlpha = 1;
      loadMemorialGroundImage();
      queue = Quest3Comic.getMemorialPanels(
      () => { playSoilDigSfx(); memorialBuildAlpha = 1; },
      () => { reachStoryTime(STORY_TIME.DIG_DONE, player); playSoftWindSfx(); }
    );
    }
    else if (scene === 'depart') queue = Quest3Comic.DEPART_PANELS;
    if (!queue || !queue.length) { flags.comic_checkpoint = null; saveState(); return; }
    const index = Number.isInteger(checkpoint.index) ? Math.max(0, Math.min(checkpoint.index, queue.length - 1)) : 0;
    if (typeof Quest3Comic.preloadComicPanels === 'function') Quest3Comic.preloadComicPanels(queue);
    activeComic = { queue, index, timer: 0, autoAdvance: false, sceneKind: scene,
      onComplete: () => completeComicScene(scene, player) };
    activeSceneLock = true;
    renderCurrentComicSlide();
  }

  function resetState() {
    flags = createDefaultFlags();
    memorialFramingActive = false;
    activeComic = null;
    activeSceneLock = false;
    const overlay = typeof document !== 'undefined' ? document.getElementById('quest3-comic-overlay') : null;
    if (overlay) overlay.hidden = true;
    departureWalkTimer = 0;
    departureFadeAlpha = 0;
    memorialBuildAlpha = 0;
    saveState();
  }

  // Chỉ dùng Space / Enter để chuyển từng khung hồi ức
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', (e) => {
      if (!activeComic) return;
      if (!e.repeat && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        advanceComicPanel();
      }
    });
  }

  return {
    STORAGE_KEY,
    SEARCH_LOCATIONS,
    RIBBON_SPOT,
    MEMORIAL_SPOT,
    GATE_SPOT,
    TOTAL_GRAVES,
    MEMORIAL_LAYOUT,
    getMemorialFraming,
    PANEL_FRAMING,
    init,
    update,
    drawGround,
    drawWorld,
    drawHUD,
    interact,
    handleClick,
    triggerFromDawn,
    inspectLocation,
    triggerStage2TruthInSilence,
    collectBlueRibbon,
    buildMemorialAndKneel,
    departVillage,
    advanceComicPanel,
    skipComicSequence,
    isGraveBlocked,
    getHUDInfo,
    saveState,
    loadState,
    restoreAfterLoad,
    resetState,
    getSearchCount,
    STORY_TIME,
    isStoryClockPaused,
    getFlags: () => ({ ...flags }),
    getGraves: () => graveList.slice(),
    isInputLocked: () => Boolean(activeComic || activeSceneLock || departureWalkTimer > 0),
    isComicActive: () => Boolean(activeComic),
    isNavigationLocked: () => Boolean(activeComic || activeSceneLock || departureWalkTimer > 0),
    isStarted: () => Boolean(flags.quest3_started),
    isCompleted: () => Boolean(flags.quest3_village_departed)
  };
})();

if (typeof window !== 'undefined') {
  window.Quest3 = Quest3;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Quest3;
}

