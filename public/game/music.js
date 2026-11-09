'use strict';

/**
 * NHẠC NỀN CỔ PHONG TIÊN HIỆP — LÀNG DU LÃM (MỘT NGÀY BÌNH YÊN)
 * 
 * Phong cách: Thanh bình, trong sáng, ấm áp, yên ả của làng quê tuổi thơ Trương Tiểu Phàm.
 * Tuyệt đối KHÔNG có tiếng hú ma quái, KHÔNG rung tần số rợn người, KHÔNG hạ âm u tối.
 * 
 * 1. Nhạc nền chính: File âm thanh gốc "01_Lang_Du_Lam_Mot_Ngay_Binh_Yen.ogg" (và .mp3).
 *    - Giai điệu Ngũ Cung G-Major (Cung - Thương - Giác - Chủy - Vũ) tươi vui, an lành.
 *    - Tiếng Đàn Tranh (Guzheng) gảy từng nốt trong trẻo như giọt sương mai.
 *    - Tiếng Sáo Trúc thanh thoát, ấm áp, nhịp nhàng.
 * 2. Tầng lọc âm Master Bus tiêu chuẩn:
 *    - High-pass 60Hz: Cắt bỏ hoàn toàn tiếng ù rền, hạ âm nặng nề.
 *    - Peaking Notch 3000Hz (Q=1.2, -3.5dB): Khử sạch tần số chói gắt tai.
 *    - Low-pass 5000Hz: Giữ âm thanh mộc mạc, dịu êm, không xì số.
 *    - Dynamics Compressor: Giữ âm lượng ổn định, chống vỡ tiếng.
 * 3. Chống kích hoạt chồng lấn (Zero Echo, Zero Overlap):
 *    - Khi file âm thanh nền phát, bộ tổng hợp nhạc cụ ảo ngưng hoàn toàn 100%.
 */
const VillageMusic = (() => {
  const STORAGE_KEY = 'lang_du_lam_bgm_state';

  // All audio files live next to game/index.html. Do not try stale root-level copies.
  const PEACEFUL_SOURCES = [
    '01_Lang_Du_Lam_Mot_Ngay_Binh_Yen.ogg',
    '01_Lang_Du_Lam_Mot_Ngay_Binh_Yen.mp3'
  ];
  const RAID_NIGHT_SOURCES = [
    'Nhac_Dem_Liep_Ma.ogg',
    '01_Lang_Du_Lam_Mot_Ngay_Binh_Yen.ogg',
    '01_Lang_Du_Lam_Mot_Ngay_Binh_Yen.mp3'
  ];
  const RUINS_MORNING_SOURCES = [
    'Loi_Hen_Cat_10s_Can_Bang.ogg',
    '01_Lang_Du_Lam_Mot_Ngay_Binh_Yen.ogg',
    '01_Lang_Du_Lam_Mot_Ngay_Binh_Yen.mp3'
  ];
  let musicSceneMode = 'peaceful'; // 'peaceful' | 'raid_night' | 'ruins'
  let raidNightMode = false;
  let ruinsMorningMode = false;
  function getActiveSources() {
    if (musicSceneMode === 'raid_night') return RAID_NIGHT_SOURCES;
    if (musicSceneMode === 'ruins') return RUINS_MORNING_SOURCES;
    return PEACEFUL_SOURCES;
  }

  let ctx = null;
  let isPlaying = false;
  let isMuted = false;
  let masterGain = null;
  let masterHighpass = null;
  let masterNotch = null;
  let masterLowpass = null;
  let masterCompressor = null;
  let droneGain = null;
  let schedulerTimer = null;
  let currentStep = 0;
  let nextNoteTime = 0;
  let tempo = 72; // Nhịp điệu thong thả, tươi tắn

  let bgmAudio = null;
  let bgmSourceNode = null;
  let isFileLoaded = false;
  let isFilePlaying = false;
  let audioCandidateIndex = 0;
  let isStartingAudio = false;
  let lastFailedAudioSource = -1;
  let mediaNeedsGesture = false;

  // Thang âm Ngũ Cung G-Major tươi sáng, thanh bình
  const P = {
    G2: 98.00,
    D3: 146.83,
    E3: 164.81,
    G3: 196.00,
    A3: 220.00,
    B3: 246.94,
    C4: 261.63,
    D4: 293.66,
    E4: 329.63,
    G4: 392.00,
    A4: 440.00,
    B4: 493.88,
    D5: 587.33,
    E5: 659.25,
    G5: 783.99,
    A5: 880.00
  };

  // Giai điệu Sáo Trúc thanh bình: câu ngắn, thánh thót, KHÔNG rung pitch hú
  const FLUTE_SCORE = [
    { beat: 2, note: P.D5, dur: 0.9 },
    { beat: 3.5, note: P.B4, dur: 0.7 },
    { beat: 6, note: P.A4, dur: 0.8 },
    { beat: 7.5, note: P.D5, dur: 1.1 },
    { beat: 11, note: P.D5, dur: 0.8 },
    { beat: 12.5, note: P.B4, dur: 0.6 },
    { beat: 14, note: P.G4, dur: 1.3 },

    { beat: 18, note: P.G5, dur: 0.9 },
    { beat: 19.5, note: P.E5, dur: 0.8 },
    { beat: 22, note: P.D5, dur: 1.1 },
    { beat: 26, note: P.B4, dur: 0.7 },
    { beat: 27.5, note: P.D5, dur: 1.1 },
    { beat: 30, note: P.A4, dur: 0.9 },

    { beat: 34, note: P.A4, dur: 0.8 },
    { beat: 35.5, note: P.B4, dur: 0.8 },
    { beat: 38, note: P.D5, dur: 1.1 },
    { beat: 42, note: P.B4, dur: 0.7 },
    { beat: 43.5, note: P.A4, dur: 0.8 },
    { beat: 46, note: P.G4, dur: 1.3 },

    { beat: 50, note: P.A4, dur: 0.8 },
    { beat: 51.5, note: P.G4, dur: 1.0 },
    { beat: 54, note: P.E4, dur: 0.9 },
    { beat: 55.5, note: P.G4, dur: 1.2 },
    { beat: 60, note: P.B4, dur: 0.8 },
    { beat: 61.5, note: P.G4, dur: 1.6 }
  ];

  // Đàn Tranh gảy trong trẻo, tự nhiên, tắt êm mượt mà
  const GUZHENG_SCORE = [
    { beat: 0, notes: [P.G3, P.D4, P.G4], arpeggio: true },
    { beat: 1.5, notes: [P.B4] },
    { beat: 2, notes: [P.D5] },
    { beat: 3, notes: [P.B4] },
    { beat: 4, notes: [P.D4, P.A4], arpeggio: true },
    { beat: 5.5, notes: [P.G4] },
    { beat: 6, notes: [P.A4] },
    { beat: 7, notes: [P.D5] },
    { beat: 8, notes: [P.E3, P.B3, P.E4, P.G4], arpeggio: true },
    { beat: 10, notes: [P.E5] },
    { beat: 11, notes: [P.D5] },
    { beat: 12, notes: [P.D3, P.A3, P.D4], arpeggio: true },
    { beat: 13.5, notes: [P.B4] },
    { beat: 14, notes: [P.A4] },
    { beat: 15, notes: [P.G4] },

    { beat: 16, notes: [P.G3, P.D4, P.B4], arpeggio: true },
    { beat: 17.5, notes: [P.D5] },
    { beat: 18, notes: [P.G5] },
    { beat: 19, notes: [P.E5] },
    { beat: 20, notes: [P.C4, P.G4, P.D5], arpeggio: true },
    { beat: 22, notes: [P.B4] },
    { beat: 23, notes: [P.A4] },
    { beat: 24, notes: [P.G3, P.D4, P.G4], arpeggio: true },
    { beat: 25.5, notes: [P.A4] },
    { beat: 26, notes: [P.B4] },
    { beat: 27, notes: [P.D5] },
    { beat: 28, notes: [P.D4, P.A4, P.D5], arpeggio: true },
    { beat: 30, notes: [P.B4] },
    { beat: 31, notes: [P.A4] },

    { beat: 32, notes: [P.E3, P.B3, P.E4, P.G4], arpeggio: true },
    { beat: 34, notes: [P.G4] },
    { beat: 35, notes: [P.A4] },
    { beat: 36, notes: [P.G3, P.D4, P.B4], arpeggio: true },
    { beat: 38, notes: [P.D5] },
    { beat: 39, notes: [P.E5] },
    { beat: 40, notes: [P.D4, P.A4, P.D5], arpeggio: true },
    { beat: 42, notes: [P.B4] },
    { beat: 43, notes: [P.A4] },
    { beat: 44, notes: [P.G3, P.D4, P.G4], arpeggio: true },
    { beat: 45.5, notes: [P.B4] },
    { beat: 46, notes: [P.D5] },
    { beat: 47, notes: [P.B4] },

    { beat: 48, notes: [P.C4, P.G4, P.B4], arpeggio: true },
    { beat: 50, notes: [P.A4] },
    { beat: 51, notes: [P.G4] },
    { beat: 52, notes: [P.D3, P.A3, P.D4], arpeggio: true },
    { beat: 54, notes: [P.E4] },
    { beat: 55, notes: [P.G4] },
    { beat: 56, notes: [P.G2, P.D3, P.G3, P.B3, P.D4], arpeggio: true },
    { beat: 59, notes: [P.G4] },
    { beat: 60, notes: [P.B4] },
    { beat: 61, notes: [P.D5] },
    { beat: 62, notes: [P.G4] }
  ];

  const BELL_SCORE = [
    { beat: 0, note: P.D5 },
    { beat: 16, note: P.G5 },
    { beat: 32, note: P.D5 },
    { beat: 48, note: P.B4 },
    { beat: 56, note: P.G4 }
  ];

  const TOTAL_BEATS = 64;

  function getAudioContext() {
    if (!ctx) {
      const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
      if (AC) {
        ctx = new AC();
      }
    }
    return ctx;
  }

  function setupMasterChain(audioCtx) {
    if (!audioCtx || masterGain) return;

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);

    let lastNode = masterGain;

    // 1. Highpass 60Hz: Cắt sạch hoàn toàn tiếng ù rền, tiếng gió ma mị dải trầm
    if (typeof audioCtx.createBiquadFilter === 'function') {
      try {
        masterHighpass = audioCtx.createBiquadFilter();
        masterHighpass.type = 'highpass';
        masterHighpass.frequency.setValueAtTime(60, audioCtx.currentTime);
        lastNode.connect(masterHighpass);
        lastNode = masterHighpass;
      } catch (e) {}
    }

    // 2. Peaking Notch 3000Hz (-3.5dB): Khử tần số rít chói gắt
    if (typeof audioCtx.createBiquadFilter === 'function') {
      try {
        masterNotch = audioCtx.createBiquadFilter();
        masterNotch.type = 'peaking';
        masterNotch.frequency.setValueAtTime(3000, audioCtx.currentTime);
        if (masterNotch.Q) masterNotch.Q.setValueAtTime(1.2, audioCtx.currentTime);
        if (masterNotch.gain) masterNotch.gain.setValueAtTime(-3.5, audioCtx.currentTime);
        lastNode.connect(masterNotch);
        lastNode = masterNotch;
      } catch (e) {}
    }

    // 3. Lowpass 5000Hz: Giữ âm thanh mộc mạc thanh thoát
    if (typeof audioCtx.createBiquadFilter === 'function') {
      try {
        masterLowpass = audioCtx.createBiquadFilter();
        masterLowpass.type = 'lowpass';
        masterLowpass.frequency.setValueAtTime(5000, audioCtx.currentTime);
        if (masterLowpass.Q) masterLowpass.Q.setValueAtTime(0.5, audioCtx.currentTime);
        lastNode.connect(masterLowpass);
        lastNode = masterLowpass;
      } catch (e) {}
    }

    // 4. Dynamics Compressor: Giữ âm lượng tròn đều, chống vỡ tiếng
    if (typeof audioCtx.createDynamicsCompressor === 'function') {
      try {
        masterCompressor = audioCtx.createDynamicsCompressor();
        masterCompressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
        masterCompressor.knee.setValueAtTime(24, audioCtx.currentTime);
        masterCompressor.ratio.setValueAtTime(4, audioCtx.currentTime);
        masterCompressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
        masterCompressor.release.setValueAtTime(0.25, audioCtx.currentTime);
        lastNode.connect(masterCompressor);
        lastNode = masterCompressor;
      } catch (e) {}
    }

    lastNode.connect(audioCtx.destination);
  }

  function initAudioElement() {
    if (typeof Audio === 'undefined') return;
    if (bgmAudio) return;

    try {
      bgmAudio = new Audio();
      bgmAudio.loop = true;
      bgmAudio.preload = 'auto';
      bgmAudio.volume = isMuted ? 0 : 0.60;

      // Browsers may never emit canplaythrough on mobile/slow connections.
      // Keep the listener for the fallback source too (not {once:true}).
      const tryNextSource = () => {
        if (lastFailedAudioSource === audioCandidateIndex) return;
        lastFailedAudioSource = audioCandidateIndex;
        audioCandidateIndex++;
        isFileLoaded = false;
        isFilePlaying = false;
        const sources = getActiveSources();
        if (audioCandidateIndex < sources.length) {
          bgmAudio.src = sources[audioCandidateIndex];
          bgmAudio.load();
        } else {
          // All file sources failed. The gentle synthesized soundtrack remains available.
          bgmAudio.removeAttribute('src');
          if (isPlaying && musicSceneMode === 'peaceful' && ctx && ctx.state === 'running' && !schedulerTimer) {
            nextNoteTime = ctx.currentTime + 0.05;
            scheduleLoop();
          }
        }
        updateUI();
      };

      bgmAudio.addEventListener('canplay', () => {
        isFileLoaded = true;
        // Automatically start a newly loaded fallback format, but never
        // repeatedly retry if the browser explicitly requires user activation.
        if (isPlaying && !isMuted && !isFilePlaying && !isStartingAudio && !mediaNeedsGesture) {
          playAudioFile();
        }
      });

      bgmAudio.addEventListener('error', tryNextSource);

      bgmAudio.addEventListener('playing', () => {
        isFilePlaying = true;
        mediaNeedsGesture = false;
        updateUI();
        // Dừng tuyệt đối bộ nốt ảo khi file âm thanh nền đã phát
        if (schedulerTimer) {
          clearTimeout(schedulerTimer);
          schedulerTimer = null;
        }
      });

      bgmAudio.addEventListener('pause', () => {
        isFilePlaying = false;
        updateUI();
      });

      bgmAudio.src = getActiveSources()[0];
      bgmAudio.load();
    } catch (e) {
      bgmAudio = null;
    }
  }

  function attachAudioElementToMaster(audioCtx) {
    if (!bgmAudio || !audioCtx || bgmSourceNode || typeof audioCtx.createMediaElementSource !== 'function') return;
    try {
      bgmSourceNode = audioCtx.createMediaElementSource(bgmAudio);
      if (masterGain) {
        bgmSourceNode.connect(masterGain);
      } else {
        bgmSourceNode.connect(audioCtx.destination);
      }
    } catch (e) {
      bgmSourceNode = null;
    }
  }

  async function playAudioFile() {
    const sources = getActiveSources();
    if (!bgmAudio || isMuted || !isPlaying || isStartingAudio || audioCandidateIndex >= sources.length) return false;
    isStartingAudio = true;

    try {
      bgmAudio.volume = bgmSourceNode ? 1.0 : (raidNightMode ? 0.72 : 0.60);
      const playPromise = bgmAudio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        await playPromise;
      }
      isFilePlaying = true;

      if (schedulerTimer) {
        clearTimeout(schedulerTimer);
        schedulerTimer = null;
      }
      isStartingAudio = false;
      return true;
    } catch (err) {
      isStartingAudio = false;
      isFilePlaying = false;
      if (err && err.name === 'NotAllowedError') mediaNeedsGesture = true;
      // Some browsers report an unsupported format as a rejected play() promise
      // instead of dispatching an error event.
      if (err && (err.name === 'NotSupportedError' || err.name === 'MEDIA_ERR_SRC_NOT_SUPPORTED')) {
        // Some browsers reject play() without sending the media 'error' event.
        // Advance the source only once and retry while the user gesture may still be active.
        lastFailedAudioSource = audioCandidateIndex;
        audioCandidateIndex++;
        if (bgmAudio && audioCandidateIndex < sources.length) {
          bgmAudio.src = sources[audioCandidateIndex];
          bgmAudio.load();
          return playAudioFile();
        }
        if (bgmAudio && bgmAudio.removeAttribute) bgmAudio.removeAttribute('src');
      }
      updateUI();
      return false;
    }
  }

  function setSceneMode(mode) {
    const normalized = mode === 'raid_night' ? 'raid_night' : (mode === 'ruins' ? 'ruins' : 'peaceful');
    if (musicSceneMode === normalized) return;
    musicSceneMode = normalized;
    raidNightMode = normalized === 'raid_night';
    ruinsMorningMode = normalized === 'ruins';
    audioCandidateIndex = 0;
    lastFailedAudioSource = -1;
    isFileLoaded = false;
    isFilePlaying = false;
    isStartingAudio = false;

    if (schedulerTimer) {
      clearTimeout(schedulerTimer);
      schedulerTimer = null;
    }

    if (bgmAudio) {
      try {
        bgmAudio.pause();
        if ('currentTime' in bgmAudio) bgmAudio.currentTime = 0;
      } catch (e) {}
      const sources = getActiveSources();
      bgmAudio.src = sources[0];
      bgmAudio.load();
      if (isPlaying && !isMuted && !mediaNeedsGesture) {
        playAudioFile();
      }
    }
    updateUI();
  }

  function setRaidNightMode(active) {
    if (active) {
      setSceneMode('raid_night');
    } else if (typeof Quest2 !== 'undefined' && typeof Quest2.isRuinsMusicActive === 'function' && Quest2.isRuinsMusicActive()) {
      setSceneMode('ruins');
    } else {
      setSceneMode('peaceful');
    }
  }

  function setRuinsMorningMode(active) {
    if (active) {
      setSceneMode('ruins');
    } else if (raidNightMode) {
      setSceneMode('raid_night');
    } else {
      setSceneMode('peaceful');
    }
  }

  function pauseAudioFile() {
    if (!bgmAudio) return;
    try {
      bgmAudio.pause();
    } catch (e) {}
    isFilePlaying = false;
  }

  // 1. Âm sắc Đàn Tranh (Guzheng - Thanh thoát trong trẻo, không chói rít)
  function playGuzheng(freq, time, vel = 0.38) {
    if (!ctx || isMuted || isFilePlaying) return;
    const now = Math.max(ctx.currentTime, time);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(2000, freq * 3.0), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 1.0), now + 1.2);
    if (filter.Q) filter.Q.setValueAtTime(0.6, now);

    const dur = 1.6;
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.linearRampToValueAtTime(vel * 0.12, now + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(vel * 0.04, now + 0.22);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur + 0.05);
    osc2.stop(now + dur + 0.05);
  }

  // 2. Âm sắc Sáo Trúc (Bamboo Flute - Trong trẻo, ấm áp, TUYỆT ĐỐI KHÔNG HÚ/KHÔNG LFO PITCH)
  function playFlute(freq, time, dur = 1.2, vel = 0.32) {
    if (!ctx || isMuted || isFilePlaying) return;
    const now = Math.max(ctx.currentTime, time);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Sóng sáo mộc mạc, thuần khiết (KHÔNG dao động tần số pitch, không tạo tiếng hú)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(1500, freq * 1.8), now);
    if (filter.Q) filter.Q.setValueAtTime(0.5, now);

    const attack = 0.04;
    const release = 0.15;
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.linearRampToValueAtTime(vel * 0.10, now + attack);
    oscGain.gain.setValueAtTime(vel * 0.08, now + Math.max(attack, dur - release));
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur + 0.05);
    osc2.stop(now + dur + 0.05);
  }

  // 3. Chuông Khánh Đồng / Chuông gió nhẹ nhàng
  function playBell(freq, time) {
    if (!ctx || isMuted || isFilePlaying) return;
    const now = Math.max(ctx.currentTime, time);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(Math.min(700, freq), now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    if (filter.Q) filter.Q.setValueAtTime(0.5, now);

    const dur = 1.8;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.015, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  function setupDrone() {
    if (!ctx || droneGain) return;
    droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    droneGain.connect(masterGain);
  }

  let rainGain = null;
  let rainNoiseSource = null;
  let lastThunderTime = 0;

  function setupRainNoise() {
    if (!ctx || rainGain || !ctx.createBuffer || !ctx.createBufferSource || !masterGain) return;
    try {
      const sampleRate = ctx.sampleRate || 44100;
      const bufferSize = Math.floor(sampleRate * 2);
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const output = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.08;
      }
      rainNoiseSource = ctx.createBufferSource();
      rainNoiseSource.buffer = buffer;
      rainNoiseSource.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.setValueAtTime(700, ctx.currentTime);

      rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(0.0001, ctx.currentTime);

      rainNoiseSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(masterGain);
      rainNoiseSource.start();
    } catch (e) {}
  }

  function playThunder() {
    if (!ctx || isMuted || !masterGain) return;
    const now = ctx.currentTime;
    if (now - lastThunderTime < 10) return;
    lastThunderTime = now;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(45, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 1.8);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 2.1);
    } catch (e) {}
  }

  let currentRainVol = -1;
  function updateWeather(weatherKind, rainIntensity = 0, stormIntensity = 0) {
    heartbeat();
    if (!ctx || !masterGain) return;
    const targetVol = isMuted ? 0.0001 : (rainIntensity > 0.02 || stormIntensity > 0.02)
      ? Math.min(0.12, rainIntensity * 0.08 + stormIntensity * 0.05)
      : 0.0001;

    if (Math.abs(targetVol - currentRainVol) > 0.005) {
      currentRainVol = targetVol;
      if (targetVol > 0.001 && !rainGain) setupRainNoise();
      if (rainGain) {
        try {
          const now = ctx.currentTime;
          rainGain.gain.setValueAtTime(Math.max(0.0001, rainGain.gain.value), now);
          rainGain.gain.linearRampToValueAtTime(targetVol, now + 0.4);
        } catch (e) {}
      }
    }
    if (stormIntensity > 0.70 && Math.random() < 0.0010) {
      playThunder();
    }
  }

  let lastScheduleTick = Date.now();
  let lastHeartbeatCheck = 0;

  function heartbeat(force = false) {
    if (!isPlaying || isMuted || !ctx) return;
    const now = Date.now();
    if (!force && now - lastHeartbeatCheck < 600 && ctx.state === 'running') return;
    lastHeartbeatCheck = now;

    if (ctx.state !== 'running') {
      try {
        const res = ctx.resume();
        if (res && typeof res.catch === 'function') res.catch(() => {});
      } catch (e) {}
    }

    if (isFilePlaying) {
      if (schedulerTimer) {
        clearTimeout(schedulerTimer);
        schedulerTimer = null;
      }
      return;
    }

    if (!schedulerTimer || now - lastScheduleTick > 1800) {
      if (schedulerTimer) {
        clearTimeout(schedulerTimer);
        schedulerTimer = null;
      }
      nextNoteTime = (ctx.currentTime || 0) + 0.05;
      scheduleLoop();
    }
  }

  function scheduleLoop() {
    if (!isPlaying || !ctx || isFilePlaying) {
      schedulerTimer = null;
      return;
    }

    lastScheduleTick = Date.now();
    const secondsPerBeat = 60 / tempo;
    const lookAhead = 0.55;

    try {
      const now = ctx.currentTime;

      if (nextNoteTime < now - 0.2) {
        nextNoteTime = now + 0.05;
        currentStep = Math.floor(currentStep);
      }

      let stepsProcessed = 0;
      while (nextNoteTime < now + lookAhead && stepsProcessed < 16) {
        stepsProcessed++;
        const beatInCycle = currentStep % TOTAL_BEATS;

        const fluteNotes = FLUTE_SCORE.filter(
          (f) => Math.abs(f.beat - beatInCycle) < 0.25
        );
        fluteNotes.forEach((f) => {
          playFlute(f.note, nextNoteTime, f.dur * secondsPerBeat);
        });

        const guzhengNotes = GUZHENG_SCORE.filter(
          (g) => Math.abs(g.beat - beatInCycle) < 0.25
        );
        guzhengNotes.forEach((g) => {
          if (g.arpeggio) {
            g.notes.forEach((note, idx) => {
              playGuzheng(note, nextNoteTime + idx * 0.045, 0.35);
            });
          } else {
            g.notes.forEach((note) => {
              playGuzheng(note, nextNoteTime, 0.32);
            });
          }
        });

        const bells = BELL_SCORE.filter(
          (b) => Math.abs(b.beat - beatInCycle) < 0.25
        );
        bells.forEach((b) => {
          playBell(b.note, nextNoteTime);
        });

        currentStep += 0.5;
        nextNoteTime += secondsPerBeat * 0.5;
      }
    } catch (e) {
    } finally {
      if (isPlaying && ctx && !isFilePlaying) {
        schedulerTimer = setTimeout(scheduleLoop, 160);
      } else {
        schedulerTimer = null;
      }
    }
  }

  async function start() {
    const audioCtx = getAudioContext();
    if (!audioCtx) {
      updateUI();
      return false;
    }

    mediaNeedsGesture = false;
    // IMPORTANT: invoke BOTH resume() and HTMLMediaElement.play() synchronously
    // inside the original click/touch gesture. Awaiting resume() first loses
    // transient activation in some Android browsers and results in silent BGM.
    let resumePromise = null;
    if (audioCtx.state !== 'running') {
      try { resumePromise = audioCtx.resume(); } catch (e) {}
    }

    setupMasterChain(audioCtx);
    setupDrone();
    initAudioElement();
    attachAudioElementToMaster(audioCtx);
    isPlaying = true;

    const filePromise = bgmAudio && !isMuted ? playAudioFile() : Promise.resolve(false);
    if (resumePromise && typeof resumePromise.then === 'function') {
      try { await resumePromise; } catch (e) {}
    }
    const fileStarted = await filePromise;

    if (!fileStarted && !isFilePlaying && audioCtx.state === 'running') {
      if (!schedulerTimer) {
        nextNoteTime = audioCtx.currentTime + 0.1;
        scheduleLoop();
      }
    }

    try {
      const now = audioCtx.currentTime;
      masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
      masterGain.gain.linearRampToValueAtTime(isMuted ? 0.0001 : 0.65, now + 0.8);
    } catch (e) {}

    updateUI();
    return audioCtx.state === 'running';
  }

  function pause() {
    isPlaying = false;
    pauseAudioFile();

    if (schedulerTimer) {
      clearTimeout(schedulerTimer);
      schedulerTimer = null;
    }
    if (masterGain && ctx) {
      try {
        const now = ctx.currentTime;
        masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
        masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      } catch (e) {}
    }
    updateUI();
  }

  function toggle() {
    isMuted = !isMuted;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, isMuted ? 'muted' : 'unmuted');
      }
    } catch (e) {}

    if (bgmAudio) {
      bgmAudio.volume = isMuted ? 0 : (bgmSourceNode ? 1.0 : 0.60);
    }

    if (isMuted) {
      pauseAudioFile();
      if (masterGain && ctx) {
        try {
          const now = ctx.currentTime;
          masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
          masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
        } catch (e) {}
      }
    } else {
      // Keep media playback and AudioContext activation inside the tap handler.
      start();
    }

    updateUI();
  }

  function updateUI() {
    if (typeof document === 'undefined') return;
    const btn = document.getElementById('music-btn');
    if (!btn) return;

    const enabled = isPlaying && !isMuted;
    const audible = enabled && ctx && ctx.state === 'running' && (isFilePlaying || !!schedulerTimer);
    const textEl = btn.querySelector('.music-text');
    if (textEl) {
      textEl.textContent = !enabled ? 'Nhạc: Tắt' : (audible ? 'Nhạc: Bật' : 'Nhạc: Chạm bật');
    }
    btn.setAttribute('aria-pressed', String(!!audible));
    if (enabled) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  function init() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'muted') {
          isMuted = true;
        }
      }
    } catch (e) {}

    initAudioElement();

    if (typeof document !== 'undefined') {
      const btn = document.getElementById('music-btn');
      if (btn) {
        btn.onclick = (e) => {
          e.stopPropagation();
          if (isMuted) {
            toggle(); // persists 'unmuted' correctly even after reload
          } else if (!isPlaying || !ctx || ctx.state !== 'running') {
            start();
          } else {
            toggle();
          }
        };
      }
    }

    let lastUserGesture = 0;
    const keepAliveAudio = (event) => {
      if (isMuted) return;
      const userGesture = event && (event.type === 'pointerdown' || event.type === 'touchstart' || event.type === 'keydown');
      if (userGesture) mediaNeedsGesture = false;
      const now = Date.now();
      // Never throttle the first useful gesture when the context is suspended
      // or media playback has not been unlocked yet.
      if (now - lastUserGesture < 400 && ctx && ctx.state === 'running' && isFilePlaying) return;
      lastUserGesture = now;

      if (!isPlaying) {
        start();
      } else {
        if (ctx && ctx.state !== 'running') {
          try {
            const result = ctx.resume();
            if (result && result.catch) result.catch(() => {});
          } catch (e) {}
        }
        if (!mediaNeedsGesture && bgmAudio && !isFilePlaying && !isStartingAudio) playAudioFile();
        if (ctx && ctx.state === 'running' && !isFilePlaying && !schedulerTimer) {
          nextNoteTime = ctx.currentTime + 0.05;
          scheduleLoop();
        }
        updateUI();
      }
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('pointerdown', keepAliveAudio, { passive: true });
      window.addEventListener('keydown', keepAliveAudio, { passive: true });
      window.addEventListener('touchstart', keepAliveAudio, { passive: true });
      window.addEventListener('focus', () => {
        if (isPlaying && !isMuted) keepAliveAudio();
      });
      window.addEventListener('pageshow', () => {
        if (isPlaying && !isMuted) keepAliveAudio();
      });
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isPlaying && !isMuted) {
          keepAliveAudio();
          if (!isFilePlaying && ctx && nextNoteTime < ctx.currentTime) {
            nextNoteTime = ctx.currentTime + 0.05;
            if (!schedulerTimer) scheduleLoop();
          }
        }
      });
    }

    updateUI();
  }

  return {
    init,
    start,
    pause,
    toggle,
    heartbeat,
    get isPlaying() {
      return isPlaying && !isMuted;
    },
    get isMuted() {
      return isMuted;
    },
    set isMuted(v) {
      isMuted = v;
      updateUI();
    },
    get isFilePlaying() {
      return isFilePlaying;
    },
    get sceneMode() {
      return musicSceneMode;
    },
    get isRaidNightMode() {
      return raidNightMode;
    },
    get isRuinsMorningMode() {
      return ruinsMorningMode;
    },
    get currentTrack() {
      return bgmAudio ? bgmAudio.src : '';
    },
    get audioCtx() {
      return getAudioContext();
    },
    setSceneMode,
    setRaidNightMode,
    setRuinsMorningMode,
    playFlute,
    playGuzheng,
    playBell,
    updateWeather,
    playThunder
  };
})();

if (typeof window !== 'undefined') {
  window.VillageMusic = VillageMusic;
}
