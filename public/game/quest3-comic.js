'use strict';

/**
 * TRÌNH PHÁT MOTION COMIC & DỮ LIỆU PANEL HỒI ỨC CHO NHIỆM VỤ 3 (01.webp -> 17.webp)
 * Tách từ quest3.js để dễ quản lý dữ liệu hình ảnh, kịch bản hồi ức và giao diện trình chiếu.
 */
const Quest3Comic = (() => {
  const PANEL_FRAMING = {
    1:  { objPos: '50% 55%', origPos: '15% 50%', scale: 1.07 },
    2:  { objPos: '50% 35%', origPos: '88% 50%', scale: 1.09 },
    3:  { objPos: '50% 45%', origPos: '12% 50%', scale: 1.07 },
    4:  { objPos: '50% 18%', origPos: '92% 20%', scale: 1.11 },
    5:  { objPos: '35% 50%', origPos: '8% 50%',  scale: 1.09 },
    6:  { objPos: '50% 48%', origPos: '60% 50%', scale: 1.07 },
    7:  { objPos: '50% 30%', origPos: '0% 30%',  scale: 1.16 },
    8:  { objPos: '50% 26%', origPos: '100% 25%', scale: 1.15 },
    9:  { objPos: '50% 28%', origPos: '0% 30%',  scale: 1.15 },
    10: { objPos: '55% 50%', origPos: '92% 50%', scale: 1.09 },
    11: { objPos: '50% 36%', origPos: '0% 35%',  scale: 1.11 },
    12: { objPos: '50% 42%', origPos: '50% 50%', scale: 1.13 },
    13: { objPos: '50% 56%', origPos: '0% 55%',  scale: 1.15 },
    14: { objPos: '50% 46%', origPos: '58% 48%', scale: 1.44 },
    15: { objPos: '58% 50%', origPos: '96% 50%', scale: 1.15 },
    16: { objPos: '50% 52%', origPos: '0% 50%',  scale: 1.14 },
    17: { objPos: '50% 36%', origPos: '100% 35%', scale: 1.13 }
  };

  const NIGHT_FLASHBACK_PANELS = [
    {
      index: 1,
      file: 'webp/01.webp',
      title: 'Ngủ trong nhà',
      badge: 'HỒI ỨC ĐÊM TẬP KÍCH · 01/08',
      memoryTitle: '✦ HỒI ỨC ĐẦU ĐÊM',
      memory: '❝ Trong giấc mơ đầu đêm, Tiểu Phàm vẫn còn thấy ánh đom đóm lấp lánh ở vườn hoa phía đông và sợi chỉ đỏ ấm áp trên cổ tay… ❞',
      narration: 'Hắn ngủ rất say sau một ngày dài, chẳng hề biết đó là giấc ngủ bình yên cuối cùng dưới mái nhà xưa.'
    },
    {
      index: 2,
      file: 'webp/02.webp',
      title: 'Bị tiếng động đánh thức',
      badge: 'HỒI ỨC ĐÊM TẬP KÍCH · 02/08',
      memoryTitle: '✦ HỒI ỨC 00:00 NỬA ĐÊM',
      memory: '❝ Mọi đêm, giờ này cả Làng Du Lãm chỉ có tiếng nước suối chảy róc rách và tiếng côn trùng rả rích ngoài đồng lúa… ❞',
      speaker: 'Tiểu Phàm',
      lines: ['“Tiếng thét đó… phát ra từ phía xóm đông! Chuyện gì đang xảy ra ngoài kia vậy?!”']
    },
    {
      index: 3,
      file: 'webp/03.webp',
      title: 'Bóng Liệp Ma ngoài cửa sổ kín',
      badge: 'HỒI ỨC ĐÊM TẬP KÍCH · 03/08',
      memoryTitle: '✦ HỒI ỨC BÓNG ĐEN NGOÀI SONG CỬA',
      memory: '❝ Cửa sổ gỗ nơi mỗi sáng ánh nắng thường chiếu qua bàn trà, bị che khuất hoàn toàn bởi một bóng đen khổng lồ sặc mùi máu tanh. ❞',
      speaker: 'Tiểu Phàm',
      lines: ['“Thứ… thứ yêu ma gì thế kia?! Nó đang nhìn vào trong nhà… Mình phải trốn ngay!”']
    },
    {
      index: 4,
      file: 'webp/04.webp',
      title: 'Chui vào chum nước',
      badge: 'HỒI ỨC ĐÊM TẬP KÍCH · 04/08',
      memoryTitle: '✦ HỒI ỨC TRONG KHOẢNH KHẮC SINH TỬ',
      memory: '❝ Chiếc chum sành góc nhà vốn dùng để hứng nước mưa sinh hoạt thường ngày, trong đêm huyết nạn lại trở thành hy vọng sống sót duy nhất. ❞',
      speaker: 'Tiểu Phàm',
      lines: ['“Chỉ có nước lạnh và bùn ẩm trong chum mới che được mùi hơi người… Phải kéo kín nắp lại!”']
    },
    {
      index: 5,
      file: 'webp/05.webp',
      title: 'Liệp Ma phá tường',
      badge: 'HỒI ỨC ĐÊM TẬP KÍCH · 05/08',
      memoryTitle: '✦ HỒI ỨC MÁI NHÀ VỠ NÁT',
      memory: '❝ Vách gỗ do chính tay Trưởng làng và bà con dựng giúp từ thuở hắn còn thơ bé, phút chốc vỡ vụn như cành củi khô trước móng vuốt yêu ma. ❞',
      narration: 'RẦM!! Mảng tường nổ tung, con Liệp Ma sừng sững bước vào giữa căn phòng nhỏ.'
    },
    {
      index: 6,
      file: 'webp/06.webp',
      title: 'Nín thở trong chum',
      badge: 'HỒI ỨC ĐÊM TẬP KÍCH · 06/08',
      memoryTitle: '✦ HỒI ỨC NÍN THỞ TRONG CHUM',
      memory: '❝ Qua khe hở hẹp, tiếng giường gãy, tủ vỡ và hơi thở khè khè của ác thú vang ngay sát đỉnh đầu. Mỗi nhịp tim đập đều như muốn nhảy khỏi lồng ngực. ❞',
      speaker: 'Tiểu Phàm',
      lines: ['“Không được thở mạnh… Không được phát ra dù chỉ một tiếng động…”']
    },
    {
      index: 7,
      file: 'webp/07.webp',
      title: 'Liệp Ma bỏ đi',
      badge: 'HỒI ỨC ĐÊM TẬP KÍCH · 07/08',
      memoryTitle: '✦ HỒI ỨC BIỂN LỬA ĐÊM HUYẾT DẠ',
      memory: '❝ Ngoài khung tường vỡ là bầu trời đêm nhuộm sắc trăng máu và biển lửa đang thiêu rụi từng mái nhà thân thuộc của Làng Du Lãm. ❞',
      speaker: 'Tiểu Phàm',
      lines: ['“Nó… bỏ đi rồi. Nhưng ngoài kia… lửa đang cháy khắp làng… Trưởng làng! A Nguyệt!”']
    },
    {
      index: 8,
      file: 'webp/08.webp',
      title: 'Đêm lặng xuống',
      badge: 'HỒI ỨC ĐÊM TẬP KÍCH · 08/08',
      memoryTitle: '✦ HỒI ỨC ĐÊM TÀN',
      memory: '❝ Tiếng gào thét ngoài thôn xóm thưa dần rồi chìm hẳn vào sự tĩnh mịch lạnh lẽo. Một đêm dài tựa vạn năm trôi qua trong bóng tối… ❞',
      narration: 'Cho đến khi ánh trăng tàn phai và tia sáng xám xịt đầu tiên của bình minh 06:00 rọi qua vách tường đổ nát…'
    }
  ];

  function getDawnOpeningPanels(onDawnPanelEnter) {
    return [
      {
        index: 9,
        file: 'webp/09.webp',
        title: 'Bước ra khỏi nhà',
        badge: 'SAU BÌNH MINH · 06:00 SÁNG',
        memoryTitle: '✦ KÝ ỨC MỖI SÁNG',
        memory: '❝ Mỗi sáng thức dậy, tiếng gà gáy và tiếng chổi tre quét sân của hàng xóm luôn vang lên đầu tiên… ❞',
        narration: 'Bình minh đến. Nhưng ngôi làng mà Tiểu Phàm từng biết đã không còn.',
        onEnter: onDawnPanelEnter
      },
      {
        index: 10,
        file: 'webp/10.webp',
        title: 'Làng hoang tàn',
        badge: 'NHIỆM VỤ 3 · TÌM KIẾM NGƯỜI SỐNG SÓT',
        memoryTitle: '✦ KÝ ỨC NGÀY HÔM QUA',
        memory: '❝ “Tiểu Phàm đấy à! Hôm nay tiên nhân về làng, nhớ ra sân sớm nhé cháu!” ❞',
        speaker: 'Tiểu Phàm',
        lines: [
          '“Trưởng làng…?”',
          '“Có ai nghe thấy ta không?”',
          '“Mọi người… các người ở đâu rồi?”'
        ]
      }
    ];
  }

  const STAGE2_PANELS = [
    {
      index: 11,
      file: 'webp/11.webp',
      title: 'Thất thần tuyệt vọng',
      badge: 'GIAI ĐOẠN 2 · SỰ THẬT TRONG IM LẶNG',
      memoryTitle: '✦ KÝ ỨC TAN VỠ',
      memory: '❝ Ánh mắt hiền từ của Trưởng làng, nụ cười của bác nông phu, tiếng trẻ con chạy dọc bờ suối… tất cả vụt tắt sau đêm huyết hải. ❞',
      speaker: 'Tiểu Phàm',
      lines: [
        '“Không… không thể nào…”',
        '“Không còn một ai…”',
        '“Những vết cào, những mảnh áo rách…”',
        '“Họ… đều bị lũ yêu ma nuốt chửng rồi sao…?”'
      ]
    },
    {
      index: 12,
      file: 'webp/12.webp',
      title: 'Gọi tìm A Nguyệt',
      badge: 'MỤC TIÊU MỚI · TÌM KIẾM A NGUYỆT',
      memoryTitle: '✦ HỒI ỨC SỢI CHỈ ĐỎ TRÊN CỔ TAY',
      memory: '❝ “Nếu một viên đá bảo ngươi vô dụng, thì chẳng lẽ những năm tháng chúng ta bên nhau đều chẳng có ý nghĩa gì?” ❞',
      narration: 'Dừng lại giữa sự im lặng nghẹt thở… Tiểu Phàm bỗng sực nhớ tới hình bóng người con gái ấy.',
      speaker: 'Tiểu Phàm',
      lines: [
        '“A Nguyệt…”',
        '“Không… nàng nhất định vẫn còn sống!”',
        '“A Nguyệt! Ngươi ở đâu?!”'
      ]
    }
  ];

  const RIBBON_PANELS = [
    {
      index: 13,
      file: 'webp/13.webp',
      title: 'Ruy băng trên đất',
      badge: 'MANH MỐI TẠI CỔNG LÀNG',
      memoryTitle: '✦ HỒI ỨC DẢI RUY BĂNG XANH',
      memory: '❝ Dải ruy băng xanh điểm hoa trắng từng bay khẽ trên mái tóc A Nguyệt mỗi khi nàng đứng chờ hắn bên đầu cầu… ❞',
      narration: 'Trên mặt đất gần cổng làng là dải ruy băng xanh hoa trắng của A Nguyệt, vương bụi và một vệt máu nhỏ.',
      speaker: 'Tiểu Phàm',
      lines: [
        '“Đây là…”',
        '“Ruy băng của A Nguyệt…”',
        '“Hôm qua nàng còn cười với ta…”',
        '“Không… A Nguyệt, ngươi vẫn còn sống, đúng không?”'
      ]
    },
    {
      index: 14,
      file: 'webp/14.webp',
      title: 'Nhặt ruy băng',
      badge: 'VẬT PHẨM NHẬN · KỶ VẬT / MANH MỐI',
      memoryTitle: '✦ HỒI ỨC LỜI DẶN DƯỚI GIÀN HOA',
      memory: '❝ “Đừng hỏi nhiều! Ta tự tết một chiếc vòng chỉ đỏ. Ta sợ… ngươi quên mất người đã tặng nó.” ❞',
      narration: 'VẬT PHẨM NHẬN: RUY BĂNG XANH CỦA A NGUYỆT\nLoại: Kỷ vật / Manh mối.\nMô tả: “Dải ruy băng nhuốm bụi tro, từng buộc trên mái tóc của A Nguyệt. Số phận chủ nhân vẫn chưa rõ.”',
      speaker: 'Tiểu Phàm',
      lines: [
        'Tiểu Phàm cúi nhặt ruy băng, bàn tay khẽ run. Trạng thái A Nguyệt: Mất tích, sinh tử chưa rõ.'
      ]
    }
  ];

  function getMemorialPanels(onPanel15Enter, onPanel16Enter) {
    return [
      {
        index: 15,
        file: 'webp/15.webp',
        title: 'Đào đất làm mộ',
        badge: 'GIAI ĐOẠN 4 · AN TÁNG CỐ NHÂN',
        memoryTitle: '✦ HỒI ỨC ÂN TÌNH LÀNG DU LÃM',
        memory: '❝ Từ thuở nhỏ mồ côi, từng bát cơm manh áo của Tiểu Phàm đều do Trưởng làng và bà con trong thôn đùm bọc mà lớn lên… ❞',
        narration: '“Tiểu Phàm gom những mảnh gỗ còn sót lại, đào từng nấm đất… Dẫu không tìm thấy đủ di hài, hắn vẫn muốn mọi người có một nơi để được tưởng nhớ.”',
        onEnter: onPanel15Enter
      },
      {
        index: 16,
        file: 'webp/16.webp',
        title: 'Quỳ trước hơn 50 ngôi mộ',
        badge: 'DƯỚI TÁN CÂY ANH ĐÀO · HƠN 50 NGÔI MỘ',
        memoryTitle: '✦ LỜI THỀ DƯỚI HOA ĐÀO RƠI',
        memory: '❝ Dưới tán đào năm ấy, hắn từng hứa khi trưởng thành sẽ bảo vệ ngôi làng nhỏ bé này… ❞',
        narration: 'Tiểu Phàm quỳ dưới cây anh đào, trước hơn 50 ngôi mộ, trong tay ôm chặt dải ruy băng xanh.',
        speaker: 'Tiểu Phàm',
        lines: [
          '“Ta đã trở về… nhưng chẳng còn ai đợi nữa.”',
          '“Trưởng làng… mọi người… xin hãy yên nghỉ.”',
          '“A Nguyệt… ta chưa biết ngươi đang ở đâu.”',
          '“Nếu ngươi vẫn còn sống, dù phải đi đến chân trời góc bể… ta nhất định sẽ tìm thấy ngươi.”'
        ],
        onEnter: onPanel16Enter
      }
    ];
  }

  const DEPART_PANELS = [
    {
      index: 17,
      file: 'webp/17.webp',
      title: 'Rời làng',
      badge: 'GIAI ĐOẠN 5 · RỜI KHỎI LÀNG DU LÃM',
      memoryTitle: '✦ HỒI ỨC LỜI HẸN NĂM NÀO',
      memory: '❝ “Sau này, nếu ngươi thực sự rời làng… ngươi sẽ nói gì với ta?” ❞',
      narration: '“Làng Du Lãm chỉ còn lại phía sau. Trong tay hắn là dải ruy băng xanh, trên cổ tay là sợi chỉ đỏ của lời hẹn năm nào.”',
      speaker: 'Tiểu Phàm',
      lines: [
        '“Ta sẽ sống.”',
        '“Ta phải tìm ra sự thật… và tìm được A Nguyệt.”'
      ]
    }
  ];


  // Ảnh có trong public/game/webp; resolve từ trang GAME trong iframe,
  // không dùng đường dẫn root của React/Vite, tránh lỗi khung đen khi deploy.
  function comicAssetCandidates(relPath) {
    const clean = String(relPath || '').replace(/^\/+/, '').replace(/^\.\//, '');
    const candidates = [];
    const push = (value) => { if (value && !candidates.includes(value)) candidates.push(value); };
    if (typeof document !== 'undefined' && document.baseURI) {
      try { push(new URL(clean, document.baseURI).href); } catch (e) {}
    }
    if (typeof window !== 'undefined' && window.location) {
      try { push(new URL(clean, window.location.href).href); } catch (e) {}
      // Chỉ fallback về thư mục game khi trang được mount ở một router khác.
      try { push(new URL(`./game/${clean}`, window.location.origin + '/').href); } catch (e) {}
    }
    push(clean);
    return candidates;
  }

  const preloadedComicImages = new Map();
  let comicImageTokenCounter = 0;
  function preloadComicPanels(queue) {
    if (typeof Image === 'undefined' || !Array.isArray(queue)) return;
    for (const item of queue) {
      if (!item || !item.file || preloadedComicImages.has(item.file)) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = comicAssetCandidates(item.file)[0];
      preloadedComicImages.set(item.file, img);
    }
  }

  function bindComicImageSource(imgEl, filePath, title) {
    if (!imgEl) return;
    const candidates = comicAssetCandidates(filePath);
    const loadingEl = typeof document !== 'undefined' ? document.getElementById('quest3-comic-image-status') : null;
    let idx = 0;
    const fileToken = ++comicImageTokenCounter;
    imgEl._comicLoadToken = fileToken;
    imgEl.alt = title || 'Hồi ức';
    imgEl.loading = 'eager';
    imgEl.decoding = 'async';
    // Không ẩn ảnh bằng opacity: onload có thể đến muộn khi Android phục hồi tab.
    imgEl.style.opacity = '1';
    if (loadingEl) { loadingEl.hidden = false; loadingEl.textContent = 'Đang tải ảnh hồi ức…'; }
    imgEl.onload = () => {
      if (imgEl._comicLoadToken !== fileToken) return;
      if (loadingEl) loadingEl.hidden = true;
    };
    imgEl.onerror = () => {
      if (imgEl._comicLoadToken !== fileToken) return;
      idx += 1;
      if (idx < candidates.length) {
        imgEl.src = candidates[idx];
      } else if (loadingEl) {
        loadingEl.hidden = false;
        loadingEl.textContent = 'Không thể tải ảnh hồi ức. Chạm để tiếp tục câu chuyện.';
      }
    };
    imgEl.src = candidates[0] || '';
    // Cache-hit: ảnh có thể đã tải hoàn tất trước khi callback đăng ký.
    if (imgEl.complete && imgEl.naturalWidth > 0 && loadingEl) loadingEl.hidden = true;
  }

  function ensureComicOverlayDOM(ctrl) {
    if (typeof document === 'undefined') return null;

    if (document.head && !document.getElementById('quest3-comic-runtime-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'quest3-comic-runtime-style';
      styleEl.textContent = `
        .quest3-comic-stage { width: min(760px, 95vw) !important; }
        .quest3-comic-art-wrap {
          position: relative !important;
          width: 100% !important;
          height: min(54vh, 450px) !important;
          aspect-ratio: 16 / 10 !important;
          display: block !important;
          background: #0b110e !important;
          border: 1px solid rgba(212, 186, 117, 0.42) !important;
          border-radius: 8px !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .quest3-comic-img {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          max-height: none !important;
          object-fit: cover !important;
          object-position: var(--comic-obj-pos, 50% 50%) !important;
          transform-origin: var(--comic-orig-pos, 50% 50%) !important;
          transform: scale(var(--comic-scale, 1.08)) !important;
        }
        @media (max-width: 600px) {
          .quest3-comic-art-wrap { height: min(42vh, 280px) !important; }
        }
      `;
      document.head.appendChild(styleEl);
    }

    let el = document.getElementById('quest3-comic-overlay');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'quest3-comic-overlay';
    el.className = 'quest3-comic-overlay';
    el.hidden = true;
    el.innerHTML = `
      <div class="quest3-comic-stage">
        <div class="quest3-comic-art-wrap" id="quest3-comic-art-wrap">
          <img id="quest3-comic-img" class="quest3-comic-img" src="" alt="Motion Comic Panel" />
          <div class="quest3-comic-image-status" id="quest3-comic-image-status" hidden>Đang tải ảnh hồi ức…</div>
        </div>
        <div class="quest3-comic-caption-box" id="quest3-comic-caption-box">
          <div class="quest3-memory-block" id="quest3-memory-block" hidden>
            <div class="quest3-memory-label" id="quest3-memory-label">✦ HỒI ỨC</div>
            <div class="quest3-memory-text" id="quest3-memory-text"></div>
          </div>
          <div class="quest3-narration-text" id="quest3-narration-text" hidden></div>
          <div class="quest3-dialogue-block" id="quest3-dialogue-block" hidden>
            <span class="quest3-dialogue-speaker" id="quest3-dialogue-speaker">Tiểu Phàm</span>
            <div class="quest3-dialogue-lines" id="quest3-dialogue-lines"></div>
          </div>
          <div class="quest3-comic-footer">
            <span class="quest3-comic-step" id="quest3-comic-step">1 / 1</span>
            <span class="quest3-comic-tap-hint">Chạm hoặc nhấn [Space / Enter] để tiếp tục ▾</span>
          </div>
        </div>
      </div>
    `;
    if (document.body) document.body.appendChild(el);

    el.onclick = () => {
      ctrl.advanceComicPanel();
    };

    return el;
  }

  function renderCurrentComicSlide(ctrl) {
    const overlay = ensureComicOverlayDOM(ctrl);
    const activeComic = ctrl.getActiveComic();
    if (!overlay || !activeComic) return;
    const item = activeComic.queue[activeComic.index];
    if (!item) return;

    overlay.hidden = false;
    const imgEl = document.getElementById('quest3-comic-img');
    const memBlock = document.getElementById('quest3-memory-block');
    const memLabel = document.getElementById('quest3-memory-label');
    const memText = document.getElementById('quest3-memory-text');
    const narEl = document.getElementById('quest3-narration-text');
    const dlgBlock = document.getElementById('quest3-dialogue-block');
    const dlgSpeaker = document.getElementById('quest3-dialogue-speaker');
    const dlgLines = document.getElementById('quest3-dialogue-lines');
    const stepEl = document.getElementById('quest3-comic-step');

    if (imgEl && item.file) {
      bindComicImageSource(imgEl, item.file, item.title || 'Scene');
      const frameCfg = PANEL_FRAMING[item.index] || { objPos: '50% 50%', origPos: '50% 50%', scale: 1.08 };
      if (imgEl.style) {
        imgEl.style.width = '100%';
        imgEl.style.height = '100%';
        imgEl.style.maxWidth = 'none';
        imgEl.style.maxHeight = 'none';
        imgEl.style.objectFit = 'cover';
        imgEl.style.objectPosition = frameCfg.objPos;
        imgEl.style.transformOrigin = frameCfg.origPos;
        imgEl.style.transform = `scale(${frameCfg.scale})`;
        if (typeof imgEl.style.setProperty === 'function') {
          imgEl.style.setProperty('--comic-obj-pos', frameCfg.objPos);
          imgEl.style.setProperty('--comic-orig-pos', frameCfg.origPos);
          imgEl.style.setProperty('--comic-scale', String(frameCfg.scale));
        }
      }
    }
    if (memBlock && memText) {
      if (item.memory) {
        memBlock.hidden = false;
        if (memLabel) memLabel.textContent = item.memoryTitle || '✦ HỒI ỨC';
        memText.textContent = item.memory;
      } else {
        memBlock.hidden = true;
      }
    }
    if (narEl) {
      if (item.narration) {
        narEl.hidden = false;
        narEl.textContent = item.narration;
      } else {
        narEl.hidden = true;
      }
    }
    if (dlgBlock && dlgLines) {
      if (item.lines && item.lines.length > 0) {
        dlgBlock.hidden = false;
        if (dlgSpeaker) dlgSpeaker.textContent = item.speaker || 'Tiểu Phàm';
        dlgLines.textContent = item.lines.join('\n');
      } else {
        dlgBlock.hidden = true;
      }
    }
    if (stepEl) {
      stepEl.textContent = `${activeComic.index + 1} / ${activeComic.queue.length}`;
    }

    if (typeof item.onEnter === 'function') {
      try { item.onEnter(); } catch (e) {}
    }
  }

  return {
    PANEL_FRAMING,
    NIGHT_FLASHBACK_PANELS,
    getDawnOpeningPanels,
    STAGE2_PANELS,
    RIBBON_PANELS,
    getMemorialPanels,
    DEPART_PANELS,
    preloadComicPanels,
    ensureComicOverlayDOM,
    renderCurrentComicSlide
  };
})();
