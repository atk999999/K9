'use strict';

/**
 * DỮ LIỆU CẤU HÌNH, ÂM THANH & KỊCH BẢN HỘI THOẠI HỒI 1 CỦA NHIỆM VỤ 1
 * Tách từ quest1.js để dễ quản lý hằng số tọa độ, âm thanh Web Audio và kịch bản hội thoại.
 */
const Quest1Data = (() => {
  const STATES = {
    NOT_STARTED: 'not_started',
    CHIEF_APPROACHING: 'chief_approaching',
    DIALOGUE_ACTIVE: 'dialogue_active',
    CONSIDERING: 'considering',
    DECLINED: 'declined',
    REGISTERED: 'registered',
    AWAITING_SELECTION: 'awaiting_selection',
    SELECTION_READY: 'selection_ready',
    CINEMATIC_ACTIVE: 'cinematic_active',
    COMPLETED: 'completed'
  };

  const AVATARS = {
    truong: 'Truong_Lang_Avatar_9KB.webp',
    tieuPham: 'tieu-pham-avatar.webp',
    aHuy: 'A_Huy_Avatar_Duoi_10KB.webp',
    lucNham: 'Luc_Nham_Truc_Co_So_Ky_Avatar_Duoi10KB.webp'
  };

  // Tọa độ tâm quảng trường làng (sân làng hoa sen ngọc bích)
  const SQUARE_CENTER = { x: 680, y: 510 };
  const LEGACY_SQUARE_CENTER = { x: 800, y: 550 };
  // Khu A — Vị trí chủ trì (phía trên vòng tròn hoa văn, hướng xuống hàng thiếu niên)
  const LUC_NHAM_STAND = { x: 646, y: 442 };
  const CHIEF_SQUARE_POS = { x: 714, y: 442 };
  // Khu B — Trung tâm khảo nghiệm (chính giữa hoa văn hình tròn)
  const STONE_POS = { x: 680, y: 498 };
  const TEST_STAND_POS = { x: 680, y: 518 };
  // Khu C — Hàng thiếu niên (xếp hàng ngay ngắn phía dưới vòng tròn)
  const PHAM_SQUARE_POS = { x: 680, y: 568 };
  const AHUY_SQUARE_POS = { x: 725, y: 568 };
  const AHUY_PASSED_POS = { x: 785, y: 472 };

  const CANDIDATE_STATES = {
    WAITING: 'WAITING',
    CALLED: 'CALLED',
    WALKING: 'WALKING',
    TESTING: 'TESTING',
    RESULT: 'RESULT',
    EXITED: 'EXITED'
  };

  const STONE_STATES = {
    IDLE: 'IDLE',
    TESTING: 'TESTING',
    NO_ROOT: 'NO_ROOT',
    HAS_ROOT: 'HAS_ROOT',
    RESET: 'RESET'
  };

  // Khu C: Hàng thiếu niên đủ tuổi khảo nghiệm
  const TEENAGER_QUEUE_SLOTS = [
    { id: 'an', name: 'Tiểu An', x: 590, y: 568, exitX: 535, exitY: 518, testable: true },
    { id: 'minh', name: 'Tiểu Minh', x: 635, y: 568, exitX: 535, exitY: 548, testable: true },
    { id: 'tieuPham', name: 'Tiểu Phàm', x: 680, y: 568, exitX: 680, exitY: 568, testable: true },
    { id: 'aHuy', name: 'A Huy', x: 725, y: 568, exitX: 785, exitY: 472, testable: true },
    { id: 'tung', name: 'Tiểu Tùng', x: 770, y: 568, exitX: 770, exitY: 568, testable: false },
    { id: 'cuc', name: 'Bé Cúc', x: 635, y: 602, exitX: 535, exitY: 578, testable: true },
    { id: 'sen', name: 'Bé Sen', x: 725, y: 602, exitX: 725, exitY: 602, testable: false }
  ];

  // Khu D: Nông dân đứng riêng bên trái ngoài quảng trường, người lớn tuổi & dân làng đứng bên phải
  const FARMER_WATCH_SLOTS = [
    { id: 'tran', x: 465, y: 515, dir: 1 },
    { id: 'binh', x: 448, y: 548, dir: 1 },
    { id: 'dao', x: 478, y: 580, dir: 1 },
    { id: 'lien', x: 458, y: 612, dir: 1 }
  ];

  const VILLAGER_WATCH_SLOTS = [
    { id: 'ho', x: 865, y: 515, dir: -1 },
    { id: 'son', x: 888, y: 548, dir: -1 },
    { id: 'ngu', x: 862, y: 580, dir: -1 },
    { id: 'hong', x: 882, y: 612, dir: -1 }
  ];

  // -------------------------------------------------------------
  // AUDIO SYNTHESIZER (WEB AUDIO API TÍCH HỢP CHO TIÊN KIẾM & PHÁP KHÍ)
  // -------------------------------------------------------------
  function getAudioCtx() {
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

  function playSwordCrySound() {
    const actx = getAudioCtx();
    if (!actx || actx.state === 'suspended') return;
    try {
      const now = actx.currentTime;
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      const filter = actx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.9);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.value = 1.0;

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);

      osc.start(now);
      osc.stop(now + 0.95);
    } catch (e) {}
  }

  function playLandingShockSound() {
    const actx = getAudioCtx();
    if (!actx || actx.state === 'suspended') return;
    try {
      const now = actx.currentTime;
      const osc = actx.createOscillator();
      const gain = actx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.45);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(actx.destination);

      osc.start(now);
      osc.stop(now + 0.55);
    } catch (e) {}
  }

  function playStoneSummonSound() {
    const actx = getAudioCtx();
    if (!actx || actx.state === 'suspended') return;
    try {
      const now = actx.currentTime;
      [220, 330, 440].forEach((freq, i) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        const filter = actx.createBiquadFilter();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(550, now + i * 0.1);
        filter.Q.value = 0.7;
        gain.gain.setValueAtTime(0.001, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.04, now + i * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.7);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(actx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.75);
      });
    } catch (e) {}
  }

  function playTamLinhCanSound() {
    const actx = getAudioCtx();
    if (!actx || actx.state === 'suspended') return;
    try {
      const now = actx.currentTime;
      [440, 587.33, 698.46].forEach((f, i) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.12);
        gain.gain.setValueAtTime(0.12, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 1.8);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 1.85);
      });
    } catch (e) {}
  }

  function playNguTapCanSound() {
    const actx = getAudioCtx();
    if (!actx || actx.state === 'suspended') return;
    try {
      const now = actx.currentTime;
      [293.66, 329.63, 349.23, 392.00, 440.00].forEach((f, i) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.09);
        gain.gain.setValueAtTime(0.04, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.35);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.4);
      });
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // HỘI THOẠI HỒI 1 (LỜI BÁO CỦA TRƯỞNG LÀNG)
  // -------------------------------------------------------------
  function createAct1Scripts({ startDialogue, closeDialogue, completeRegistration, setQuestChoiceState, getQuestData }) {
    const SCRIPT_AFTER_REGISTER = [
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Được! Tên ngươi đã được lão phu ghi lại.'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Nhớ kỹ, hai ngày nữa, khi tiếng chuông vang lên tại quảng trường làng, chính là lúc tiên nhân giáng lâm.'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Đến lúc đó, dù có gặp chuyện gì cũng phải giữ tâm bình khí tĩnh, chớ làm điều thất lễ trước mặt tiên nhân.'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Đi đi, nhóc con. Hãy tận hưởng những ngày bình yên còn lại. Biết đâu chẳng bao lâu nữa, cuộc đời ngươi sẽ hoàn toàn thay đổi...',
        onFinish: () => {
          completeRegistration();
        }
      }
    ];

    const SCRIPT_BRANCH_EAGER = [
      {
        speaker: 'Tiểu Phàm',
        role: 'Thiếu Niên · 14 tuổi',
        avatar: AVATARS.tieuPham,
        text: 'Tu tiên ư? Ta muốn! Ta muốn trở thành tiên nhân, ngự kiếm bay khắp thiên hạ!'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Ha ha ha! Khá lắm! Tuổi còn nhỏ mà đã có chí khí lớn như vậy, quả nhiên lão phu không nhìn lầm ngươi!'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Nhưng nhóc con, tiên đạo nào có dễ dàng như lời ngươi nói. Thiên hạ phàm nhân nhiều vô kể, kẻ có linh căn lại chẳng được bao nhiêu.'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Có điều, chưa thử thì sao biết được? Biết đâu trong cái làng nhỏ bé này, lại xuất hiện một vị tiên nhân danh chấn thiên hạ!'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Được rồi! Lão phu sẽ ghi tên ngươi vào danh sách tuyển chọn. Mấy ngày tới nhớ chuẩn bị cho tốt!'
      },
      ...SCRIPT_AFTER_REGISTER
    ];

    const SCRIPT_BRANCH_HESITANT = [
      {
        speaker: 'Tiểu Phàm',
        role: 'Thiếu Niên · 14 tuổi',
        avatar: AVATARS.tieuPham,
        text: 'Nếu ta thật sự được tiên nhân thu nhận, liệu sau này còn có thể trở về làng không?'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Haizz, nhóc con, ngươi còn nhỏ mà đã biết lưu luyến cố hương rồi sao?'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Tiên lộ xa xôi, một khi bước chân vào tiên môn, có lẽ mười năm, trăm năm, thậm chí lâu hơn nữa mới có dịp trở về.'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Đến lúc ấy, cảnh vật có thể vẫn còn, nhưng những người quen biết ngươi hôm nay... chưa chắc đã còn trên nhân thế.'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Lão phu không muốn giấu ngươi. Tu tiên là cơ duyên, nhưng cũng là một con đường đầy cô độc.'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Có điều, chim non rồi cũng phải rời tổ. Nếu ngươi thật sự có tiên duyên, lão phu mong ngươi đừng vì lưu luyến ngôi làng nhỏ bé này mà bỏ lỡ cả một đời.'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Dù ngươi lựa chọn thế nào, nơi đây vẫn là quê hương của ngươi.',
        choices: [
          {
            id: 'step_forward',
            label: '“Ta đã quyết định, ta muốn bước lên tiên lộ.”',
            onSelect: () => {
              startDialogue([
                {
                  speaker: 'Tiểu Phàm',
                  role: 'Thiếu Niên · 14 tuổi',
                  avatar: AVATARS.tieuPham,
                  text: 'Ta đã quyết định, ta muốn bước lên tiên lộ.'
                },
                {
                  speaker: 'Trưởng làng',
                  role: 'Bậc Trưởng Bối · 60 tuổi',
                  avatar: AVATARS.truong,
                  text: 'Khá lắm! Tuổi trẻ phải có dũng khí bước ra thế giới bao la, lão phu sẽ ghi tên ngươi!'
                },
                ...SCRIPT_AFTER_REGISTER
              ]);
            }
          },
          {
            id: 'not_ready',
            label: '“Ta vẫn chưa sẵn sàng rời khỏi nơi này.”',
            onSelect: () => {
              startDialogue([
                {
                  speaker: 'Tiểu Phàm',
                  role: 'Thiếu Niên · 14 tuổi',
                  avatar: AVATARS.tieuPham,
                  text: 'Ta vẫn chưa sẵn sàng rời khỏi nơi này.'
                },
                {
                  speaker: 'Trưởng làng',
                  role: 'Bậc Trưởng Bối · 60 tuổi',
                  avatar: AVATARS.truong,
                  text: 'Được rồi, chuyện trọng đại cả đời, ngươi cứ suy nghĩ kỹ đi. Trước khi tiên nhân đến, bất cứ lúc nào đổi ý đều có thể tìm lão phu.',
                  onFinish: () => {
                    setQuestChoiceState(STATES.CONSIDERING, 'considering');
                    closeDialogue();
                  }
                }
              ]);
            }
          }
        ]
      }
    ];

    const SCRIPT_BRANCH_DECLINE = [
      {
        speaker: 'Tiểu Phàm',
        role: 'Thiếu Niên · 14 tuổi',
        avatar: AVATARS.tieuPham,
        text: 'Ta chẳng muốn làm tiên nhân. Sống một đời bình yên trong làng chẳng phải tốt hơn sao?'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Ồ? Ha ha ha! Không ngờ nhóc con ngươi lại có suy nghĩ như vậy.'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Người đời tranh nhau cầu tiên vấn đạo, mong được trường sinh bất tử. Còn ngươi, cơ duyên đặt ngay trước mắt lại chẳng chút động lòng.'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Nhưng ngẫm kỹ, sống một đời bình an, ngày ngày ngắm mặt trời mọc, tối về quây quần bên bếp lửa, cũng chưa chắc đã kém cuộc sống của tiên nhân.'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Tiên nhân có nỗi khổ của tiên nhân, phàm nhân cũng có niềm vui của phàm nhân.'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Thôi được, lão phu không ép ngươi.'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Chỉ là... nếu một ngày nào đó ngươi thay đổi ý định, hãy đến tìm lão phu. Trước khi tiên nhân rời làng, cơ duyên này vẫn còn.',
        onFinish: () => {
          setQuestChoiceState(STATES.DECLINED, 'declined');
          closeDialogue();
        }
      }
    ];

    const SCRIPT_OPENING = [
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Nhóc con! Nhóc con! Mau lại đây, lão phu có chuyện quan trọng muốn nói với ngươi!'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Ngươi đã từng nghe nói đến tiên nhân chưa? Những người có thể ngự kiếm phi thiên, dời non lấp biển, thậm chí sống đến hàng nghìn năm ấy!'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Lão phu vừa nhận được tin, hai ngày nữa sẽ có tiên nhân từ tiên môn giáng lâm xuống làng ta, tuyển chọn đệ tử có linh căn.'
      },
      {
        speaker: 'Trưởng làng',
        role: 'Bậc Trưởng Bối · 60 tuổi',
        avatar: AVATARS.truong,
        text: 'Đây chính là cơ duyên trăm năm khó gặp! Thế nào, nhóc con, ngươi có muốn thử bước lên tiên lộ không?',
        choices: [
          {
            id: 'eager',
            label: '“Tu tiên ư? Ta muốn! Ta muốn trở thành tiên nhân, ngự kiếm bay khắp thiên hạ!”',
            onSelect: () => startDialogue(SCRIPT_BRANCH_EAGER)
          },
          {
            id: 'hesitant',
            label: '“Nếu ta thật sự được tiên nhân thu nhận, liệu sau này còn có thể trở về làng không?”',
            onSelect: () => startDialogue(SCRIPT_BRANCH_HESITANT)
          },
          {
            id: 'decline',
            label: '“Ta chẳng muốn làm tiên nhân. Sống một đời bình yên trong làng chẳng phải tốt hơn sao?”',
            onSelect: () => startDialogue(SCRIPT_BRANCH_DECLINE)
          }
        ]
      }
    ];

    function getRevisitScript() {
      const questData = getQuestData();
      if (questData.state === STATES.COMPLETED || questData.completed) {
        return [
          {
            speaker: 'Trưởng làng',
            role: 'Bậc Trưởng Bối · 60 tuổi',
            avatar: AVATARS.truong,
            text: 'Nhóc con, A Huy đã theo tiên sư rời làng rồi. Ngươi đừng buồn, con đường của mỗi người mỗi khác, cứ vững tâm sống tốt phần mình.',
            onFinish: () => closeDialogue()
          }
        ];
      }

      if (questData.state === STATES.SELECTION_READY) {
        return [
          {
            speaker: 'Trưởng làng',
            role: 'Bậc Trưởng Bối · 60 tuổi',
            avatar: AVATARS.truong,
            text: 'Nhóc con! Mau đến quảng trường! Tiên nhân sắp giáng lâm rồi, đừng để lỡ đại sự!',
            onFinish: () => closeDialogue()
          }
        ];
      }

      if (questData.state === STATES.REGISTERED || questData.state === STATES.AWAITING_SELECTION) {
        return [
          {
            speaker: 'Trưởng làng',
            role: 'Bậc Trưởng Bối · 60 tuổi',
            avatar: AVATARS.truong,
            text: 'Nhóc con, tên ngươi đã có trong danh sách. Chớ sốt ruột, cứ chuẩn bị tinh thần cho tốt.',
            onFinish: () => closeDialogue()
          }
        ];
      }

      if (questData.state === STATES.CONSIDERING) {
        return [
          {
            speaker: 'Trưởng làng',
            role: 'Bậc Trưởng Bối · 60 tuổi',
            avatar: AVATARS.truong,
            text: 'Nhóc con, chuyện tiên duyên ngươi đã suy nghĩ kỹ chưa? Lão phu không ép, nhưng cơ duyên chẳng chờ ai mãi đâu.',
            choices: [
              {
                id: 'change_mind_register',
                label: '“Ta đã suy nghĩ kỹ, ta muốn ghi tên tham gia tuyển chọn!”',
                onSelect: () => {
                  startDialogue([
                    {
                      speaker: 'Tiểu Phàm',
                      role: 'Thiếu Niên · 14 tuổi',
                      avatar: AVATARS.tieuPham,
                      text: 'Ta đã suy nghĩ kỹ, ta muốn ghi tên tham gia tuyển chọn!'
                    },
                    {
                      speaker: 'Trưởng làng',
                      role: 'Bậc Trưởng Bối · 60 tuổi',
                      avatar: AVATARS.truong,
                      text: 'Tốt lắm! Lão phu sẽ ghi tên ngươi vào danh sách ngay!'
                    },
                    ...SCRIPT_AFTER_REGISTER
                  ]);
                }
              },
              {
                id: 'keep_considering',
                label: '“Xin cho ta thêm thời gian suy nghĩ.”',
                onSelect: () => {
                  startDialogue([
                    {
                      speaker: 'Tiểu Phàm',
                      role: 'Thiếu Niên · 14 tuổi',
                      avatar: AVATARS.tieuPham,
                      text: 'Xin cho ta thêm thời gian suy nghĩ.'
                    },
                    {
                      speaker: 'Trưởng làng',
                      role: 'Bậc Trưởng Bối · 60 tuổi',
                      avatar: AVATARS.truong,
                      text: 'Được, chuyện hệ trọng, cứ thong thả suy nghĩ.',
                      onFinish: () => closeDialogue()
                    }
                  ]);
                }
              }
            ]
          }
        ];
      }

      if (questData.state === STATES.DECLINED) {
        return [
          {
            speaker: 'Trưởng làng',
            role: 'Bậc Trưởng Bối · 60 tuổi',
            avatar: AVATARS.truong,
            text: 'Ồ, nhóc con lại đến tìm lão phu sao? Thế nào, đã đổi ý muốn thử tiên duyên rồi ư?',
            choices: [
              {
                id: 'change_mind_register_declined',
                label: '“Ta muốn thử, xin trưởng làng ghi tên ta vào danh sách!”',
                onSelect: () => {
                  startDialogue([
                    {
                      speaker: 'Tiểu Phàm',
                      role: 'Thiếu Niên · 14 tuổi',
                      avatar: AVATARS.tieuPham,
                      text: 'Ta muốn thử, xin trưởng làng ghi tên ta vào danh sách!'
                    },
                    {
                      speaker: 'Trưởng làng',
                      role: 'Bậc Trưởng Bối · 60 tuổi',
                      avatar: AVATARS.truong,
                      text: 'Ha ha ha! Biết quay đầu là tốt! Cơ duyên trăm năm có một này suýt nữa thì ngươi bỏ lỡ!'
                    },
                    ...SCRIPT_AFTER_REGISTER
                  ]);
                }
              },
              {
                id: 'just_greeting',
                label: '“Ta chỉ ghé qua chào hỏi lão bá thôi.”',
                onSelect: () => {
                  startDialogue([
                    {
                      speaker: 'Tiểu Phàm',
                      role: 'Thiếu Niên · 14 tuổi',
                      avatar: AVATARS.tieuPham,
                      text: 'Ta chỉ ghé qua chào hỏi lão bá thôi.'
                    },
                    {
                      speaker: 'Trưởng làng',
                      role: 'Bậc Trưởng Bối · 60 tuổi',
                      avatar: AVATARS.truong,
                      text: 'Ừ, nhóc con cứ thong thả dạo chơi trong làng.',
                      onFinish: () => closeDialogue()
                    }
                  ]);
                }
              }
            ]
          }
        ];
      }

      return SCRIPT_OPENING;
    }

    return {
      SCRIPT_OPENING,
      getRevisitScript
    };
  }

  return {
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
    VILLAGER_WATCH_SLOTS,
    getAudioCtx,
    playSwordCrySound,
    playLandingShockSound,
    playStoneSummonSound,
    playTamLinhCanSound,
    playNguTapCanSound,
    createAct1Scripts
  };
})();
