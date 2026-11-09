'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');

// Mock Canvas context & DOM
const mockCtx = new Proxy(
  {
    measureText: () => ({ width: 80 })
  },
  {
    get(o, k) {
      if (k in o) return o[k];
      return (...args) => {
        for (const arg of args) {
          if (typeof arg === 'number') assert(Number.isFinite(arg), `${k} received non-finite number: ${arg}`);
        }
        if (k.includes('Gradient')) return { addColorStop() {} };
        return {};
      };
    },
    set(o, k, v) {
      o[k] = v;
      return true;
    }
  }
);

const domElements = new Map();
function createMockEl() {
  let html = '';
  return {
    hidden: true,
    textContent: '',
    src: '',
    alt: '',
    style: {},
    children: [],
    width: 0,
    height: 0,
    get innerHTML() { return html; },
    set innerHTML(v) { html = v; },
    getContext: () => mockCtx,
    addEventListener() {},
    appendChild(c) { this.children.push(c); return c; },
    querySelector: () => null,
    querySelectorAll: () => []
  };
}
function getMockElement(id) {
  if (!domElements.has(id)) domElements.set(id, createMockEl());
  return domElements.get(id);
}

const mockStorage = {
  store: new Map(),
  getItem(k) { return this.store.get(k) || null; },
  setItem(k, v) { this.store.set(k, String(v)); },
  removeItem(k) { this.store.delete(k); },
  clear() { this.store.clear(); }
};

let activeDialogueScript = null;
let liepMaSfxStopped = 0;
let currentMusicMode = 'peaceful';

const sandbox = {
  console,
  Math,
  setTimeout(fn) { if (typeof fn === 'function') fn(); return 1; },
  clearTimeout() {},
  window: { addEventListener() {} },
  document: {
    getElementById: (id) => getMockElement(id),
    createElement: () => createMockEl(),
    body: createMockEl()
  },
  localStorage: mockStorage,
  Villagers: { day: 4, minutes: 360 }, // 06:00 AM
  TieuPhamHome: {
    inside: true,
    exit(pl) {
      this.inside = false;
      if (pl) { pl.x = 221; pl.y = 314; }
    }
  },
  LiepMaSFX: {
    stop() { liepMaSfxStopped++; }
  },
  VillageMusic: {
    isMuted: false,
    setSceneMode(m) { currentMusicMode = m; },
    pause() { currentMusicMode = 'paused'; }
  },
  Quest1: {
    getState: () => 'completed',
    startDialogue(script) { activeDialogueScript = script; },
    closeDialogue() { activeDialogueScript = null; }
  },
  Quest2: {
    getState: () => 'completed',
    isVillageRuined: () => true,
    getData: () => ({ survivedInJar: true, ruinsActive: true })
  },
  ANguyetStory: {
    hasBracelet: () => true,
    saveState() {}
  },
  GameSave: {
    save() {}
  }
};

vm.createContext(sandbox);
const collisionCode = fs.readFileSync(__dirname + '/../public/game/collision.js', 'utf8');
const quest3ComicCode = fs.readFileSync(__dirname + '/../public/game/quest3-comic.js', 'utf8');
const quest3Code = fs.readFileSync(__dirname + '/../public/game/quest3.js', 'utf8');
vm.runInContext(collisionCode + '; this.Collision = Collision;', sandbox);
vm.runInContext(quest3ComicCode + '\n' + quest3Code + '; this.Quest3 = Quest3;', sandbox);

const { Quest3, Collision } = sandbox;

console.log('--- BẮT ĐẦU KIỂM THỬ NHIỆM VỤ 3: TÌM KIẾM NGƯỜI SỐNG SÓT (17 WEBP & TXT) ---');

// 0. Kiểm tra sự tồn tại của đủ 17 file WebP trong public/game/webp
for (let i = 1; i <= 17; i++) {
  const num = String(i).padStart(2, '0');
  const p = `${__dirname}/../public/game/webp/${num}.webp`;
  assert.equal(fs.existsSync(p), true, `File ảnh ${num}.webp phải tồn tại trong public/game/webp`);
}
console.log('✓ TEST 0: Đủ 17 file ảnh 01.webp -> 17.webp trong public/game/webp.');

// 1. Tiêu chí 1: Sống sót trong chum và bước ra khỏi nhà lúc 06:00 mới kích hoạt Nhiệm vụ 3
Quest3.init();
const player = { x: 352, y: 390, dir: 'down', walk: 0, hp: 100 };

// Nếu chưa tới 06:00 sáng -> không kích hoạt
sandbox.Villagers.minutes = 180; // 03:00 AM
assert.equal(Quest3.triggerFromDawn(player, true), false, 'Không kích hoạt Quest 3 trước 06:00 sáng');

// Đúng 06:00 sáng và sống sót từ chum -> kích hoạt chuỗi Hồi ức Đêm Tập Kích (01->08) + Mở đầu Bình Minh (09->10)
sandbox.Villagers.minutes = 360; // 06:00 AM
const triggered = Quest3.triggerFromDawn(player, true);
assert.equal(triggered, true, 'Phải kích hoạt Quest 3 khi sống sót tới 06:00 sáng');
assert.equal(sandbox.TieuPhamHome.inside, true, 'Tiểu Phàm vẫn ở trong nhà lúc 06:00, tự di chuyển ra map làng');
assert.equal(currentMusicMode, 'ruins', 'Nhạc nền phải chuyển sang Lời Hẹn Giữa Tro Tàn (ruins)');
assert(liepMaSfxStopped > 0, 'Tiếng GRR của Liệp Ma phải bị dừng hoàn toàn lúc bình minh');
assert.equal(Quest3.isComicActive(), true, 'Chuỗi Motion Comic Hồi ức (01->08) + Bình minh (09->10) phải đang mở');
assert.equal(Quest3.isStoryClockPaused(), true, 'Hồi ức bình minh đang mở phải đóng băng thời gian đọc');

// Kiểm tra toàn bộ 17 hình ảnh hồi ức đều có cấu hình canh khung full 100% màn hình hồi ức (width 100%, height 100%, object-fit cover)
for (let i = 1; i <= 17; i++) {
  const fCfg = Quest3.PANEL_FRAMING && Quest3.PANEL_FRAMING[i];
  assert(fCfg && fCfg.scale >= 1.05 && fCfg.objPos && fCfg.origPos, `Panel ${i} phải có cấu hình PANEL_FRAMING full màn hình`);
}
const comicImgEl = sandbox.document.getElementById('quest3-comic-img');
assert.equal(comicImgEl.style.width, '100%', 'Ảnh hồi ức phải có width = 100%');
assert.equal(comicImgEl.style.height, '100%', 'Ảnh hồi ức phải có height = 100%');
assert.equal(comicImgEl.style.objectFit, 'cover', 'Ảnh hồi ức phải có objectFit = cover để phủ kín khung hình');

// Kiểm tra có thể bấm qua hoặc bỏ qua (Skip) chuỗi cinematic nhưng vẫn cập nhật đầy đủ cờ nhiệm vụ
Quest3.advanceComicPanel(); // 01 -> 02
const checkpoint = JSON.parse(mockStorage.getItem(Quest3.STORAGE_KEY)).comic_checkpoint;
assert.equal(checkpoint.scene, 'dawn', 'Lưu tên cảnh hồi ức');
assert.equal(checkpoint.index, 1, 'Lưu chính xác khung 02');
assert.equal(Quest3.isNavigationLocked(), true, 'Khóa nút dịch chuyển khi hồi ức đang chạy');
Quest3.restoreAfterLoad(player);
assert.equal(Quest3.isComicActive(), true, 'Tải lại giữa hồi ức phải mở lại cảnh');
assert.equal(sandbox.document.getElementById('quest3-comic-step').textContent.startsWith('2 /'), true, 'Khôi phục đúng khung hồi ức 02');
Quest3.skipComicSequence(); // Bỏ qua phần còn lại
assert.equal(Quest3.isComicActive(), false, 'Sau khi skip, phải đóng comic và trả lại điều khiển');
assert.equal(Quest3.isInputLocked(), false, 'Không khóa điều khiển sau khi đóng/bỏ qua cinematic');
assert.equal(Quest3.isStarted(), true, 'Cờ quest3_started phải bằng true');
assert.equal(JSON.parse(mockStorage.getItem(Quest3.STORAGE_KEY)).comic_checkpoint, null, 'Kết thúc phải xóa checkpoint');
assert.equal(Quest3.isNavigationLocked(), false, 'Kết thúc phải mở khóa dịch chuyển');
assert.equal(Quest3.isStoryClockPaused(), false, 'Kết thúc hồi ức mới cho đồng hồ tiếp tục chạy');
// Người chơi tự di chuyển qua cửa chính ra map làng
sandbox.TieuPhamHome.exit(player);
assert.equal(sandbox.TieuPhamHome.inside, false, 'Người chơi tự bước ra map làng');
console.log('✓ TEST 1: Kích hoạt Nhiệm vụ 3 lúc 06:00, phát Hồi ức 01->08 + 09->10 full màn hình & người chơi tự bước ra map làng chuẩn xác.');

// 2. Tiêu chí 2 & 3: Tìm đủ 4 điểm theo thứ tự bất kỳ, không kẹt đường/cầu, chỉ khi đủ 4 điểm mới mở mục tiêu tìm A Nguyệt
for (const key of ['elder', 'square', 'houses', 'garden']) {
  const loc = Quest3.SEARCH_LOCATIONS[key];
  assert.equal(Collision.canWalk(loc.x, loc.y, true), true, `Điểm tìm kiếm ${loc.name} (${loc.x},${loc.y}) phải đi bộ tới được không kẹt`);
}
// Kiểm tra cầu nối sang Vườn Hoa Phía Đông vẫn đi qua bình thường
assert.equal(Collision.canWalk(1340, 512, true), true, 'Cầu qua suối sang Xóm Đông phải thông suốt');

// Đi kiểm tra theo thứ tự bất kỳ: Garden (1/4) -> Houses (2/4) -> Elder (3/4)
player.x = Quest3.SEARCH_LOCATIONS.garden.x;
player.y = Quest3.SEARCH_LOCATIONS.garden.y;
assert.equal(Quest3.interact(player), true, 'Tương tác kiểm tra Vườn Hoa Phía Đông');
assert(activeDialogueScript && activeDialogueScript[0].text.includes('❝'), 'Phải có đoạn Hồi ức ở điểm kiểm tra');
activeDialogueScript[activeDialogueScript.length - 1].onFinish();
assert.equal(Quest3.getSearchCount(), 1);
assert.equal(sandbox.Villagers.minutes, 435, 'Tìm kiếm điểm 1 mất thời gian tới 07:15');
assert.equal(Quest3.getFlags().quest3_ay_nguyet_search_started, false, 'Mới 1/4 điểm chưa mở mục tiêu tìm A Nguyệt');

// Kiểm tra lại cùng điểm Vườn Hoa -> không tính trùng
assert.equal(Quest3.interact(player), false, 'Mỗi điểm chỉ nhận 1 lần');

// Điểm 2/4: Khu Nhà Dân
player.x = Quest3.SEARCH_LOCATIONS.houses.x;
player.y = Quest3.SEARCH_LOCATIONS.houses.y;
assert.equal(Quest3.interact(player), true);
activeDialogueScript[activeDialogueScript.length - 1].onFinish();
assert.equal(Quest3.getSearchCount(), 2);
assert.equal(sandbox.Villagers.minutes, 510, 'Tìm kiếm điểm 2 mất thời gian tới 08:30');

// Điểm 3/4: Nhà Trưởng Làng
player.x = Quest3.SEARCH_LOCATIONS.elder.x;
player.y = Quest3.SEARCH_LOCATIONS.elder.y;
assert.equal(Quest3.interact(player), true);
activeDialogueScript[activeDialogueScript.length - 1].onFinish();
assert.equal(Quest3.getSearchCount(), 3);
assert.equal(sandbox.Villagers.minutes, 585, 'Tìm kiếm điểm 3 mất thời gian tới 09:45');
assert.equal(Quest3.getFlags().quest3_survivor_search_complete, false);

// Điểm 4/4: Quảng Trường Khảo Nghiệm -> Kích hoạt Giai đoạn 2 (11.webp & 12.webp)
player.x = Quest3.SEARCH_LOCATIONS.square.x;
player.y = Quest3.SEARCH_LOCATIONS.square.y;
assert.equal(Quest3.interact(player), true);
activeDialogueScript[activeDialogueScript.length - 1].onFinish();
assert.equal(Quest3.getSearchCount(), 4);
assert.equal(sandbox.Villagers.minutes, 675, 'Tìm kiếm điểm 4 mất thời gian tới 11:15');
assert.equal(Quest3.isComicActive(), true, 'Đủ 4/4 điểm phải mở cảnh Sự Thật Trong Im Lặng (11.webp -> 12.webp)');
Quest3.advanceComicPanel(); // 11.webp -> 12.webp
Quest3.advanceComicPanel(); // Kết thúc 12.webp
assert.equal(Quest3.getFlags().quest3_survivor_search_complete, true);
assert.equal(sandbox.Villagers.minutes, 690, 'Sự thật trong im lặng đến 11:30');
assert.equal(Quest3.getFlags().quest3_ay_nguyet_search_started, true, 'Sau khi đủ 4/4 mới mở mục tiêu Tìm kiếm A Nguyệt');
console.log('✓ TEST 2 & 3: Kiểm tra 4 địa điểm tự do, có Hồi ức từng nơi, đủ 4/4 mở Sự Thật Trong Im Lặng & Tìm Kiếm A Nguyệt.');

// 3. Tiêu chí 4 & 5: Nhặt Ruy Băng Xanh đúng gần Cổng Làng, chỉ 1 lần, giữ Vòng Chỉ Đỏ, A Nguyệt = missing_unknown
player.x = Quest3.RIBBON_SPOT.x;
player.y = Quest3.RIBBON_SPOT.y;
assert.equal(Collision.canWalk(player.x, player.y, true), true, 'Vị trí Ruy Băng Xanh gần cổng làng phải đi tới được');
assert.equal(Quest3.interact(player), true, 'Tương tác nhặt Ruy Băng Xanh');
assert.equal(Quest3.isComicActive(), true, 'Phải phát panel 13.webp (Ruy băng trên đất) và 14.webp (Nhặt ruy băng)');
Quest3.advanceComicPanel(); // 13 -> 14
Quest3.advanceComicPanel(); // Hoàn tất nhặt
assert.equal(Quest3.getFlags().quest3_blue_ribbon_collected, true, 'Cờ quest3_blue_ribbon_collected phải = true');
assert.equal(sandbox.Villagers.minutes, 735, 'Đi tìm A Nguyệt / nhận ruy băng đến 12:15');
assert.equal(Quest3.getFlags().ay_nguyet_status, 'missing_unknown', 'Trạng thái A Nguyệt phải là missing_unknown');
assert.equal(sandbox.ANguyetStory.hasBracelet(), true, 'Vòng chỉ đỏ từ Nhiệm vụ 1 vẫn giữ nguyên');
assert.equal(Quest3.interact(player), false, 'Không thể nhặt ruy băng lần 2 (không nhân đôi vật phẩm)');
console.log('✓ TEST 4 & 5: Nhặt Ruy Băng Xanh gần Cổng Làng 1 lần duy nhất, giữ Vòng Chỉ Đỏ, ay_nguyet_status = missing_unknown.');

// 4. Tiêu chí 6: An Táng Cố Nhân — 1 lần tương tác dựng >50 mộ dưới cây anh đào, không có mộ A Nguyệt, không chặn đường chính
player.x = Quest3.MEMORIAL_SPOT.x;
player.y = Quest3.MEMORIAL_SPOT.y;
assert.equal(Collision.canWalk(player.x, player.y, true), true, 'Vị trí đứng lập mộ dưới cây anh đào phải thông thoáng');
assert.equal(Quest3.interact(player), true, 'Một lần tương tác duy nhất để dựng mộ tưởng niệm');
assert.equal(sandbox.Villagers.minutes, 780, 'Bấm đắp mộ: bắt đầu công việc lúc 13:00');
assert.equal(Quest3.isComicActive(), true, 'Phát panel 15.webp (Đào đất làm mộ) và 16.webp (Quỳ trước hơn 50 ngôi mộ)');
Quest3.advanceComicPanel(); // 15 -> 16
assert.equal(sandbox.Villagers.minutes, 885, 'Sau công việc đào mộ đã đến 14:45');
Quest3.advanceComicPanel(); // Hoàn tất
assert.equal(sandbox.Villagers.minutes, 900, 'Hoàn tất đắp mộ lúc 15:00');
assert.equal(Quest3.getFlags().quest3_memorial_complete, true, 'Cờ quest3_memorial_complete phải = true');

const graves = Quest3.getGraves();
assert.equal(graves.length, 60, "Đủ 60 bia mộ khớp trên ảnh AI");
assert(graves.length > 50, `Số lượng ngôi mộ phải lớn hơn 50 (hiện tại: ${graves.length})`);
assert.equal(graves.some(g => g.name.includes('A Nguyệt')), false, 'TUYỆT ĐỐI KHÔNG có bia mộ của A Nguyệt');
assert.equal(graves.some(g => g.name.includes('Trưởng làng')), true, 'Phải có bia mộ của Trưởng làng từ dữ liệu NPC');
assert.equal(graves.some(g => g.name === 'Mộ tưởng niệm'), true, 'Các mộ không rõ di hài được ghi là Mộ tưởng niệm');
// Bản sửa địa hình mộ: mỗi bia phải có khoảng thở; trục đi giữa và chỗ quỳ không bị chặn.
for (let i = 0; i < graves.length; i++) {
  assert.equal(Collision.canWalk(graves[i].x, graves[i].y, true), false,
    `Hitbox bia mộ ${i+1} phải tồn tại sau an táng`);
  for (let j = i+1; j < graves.length; j++) {
    assert(Math.hypot(graves[i].x-graves[j].x, graves[i].y-graves[j].y) >= 23,
      `Mộ ${i+1}/${j+1} không được chen sát nhau trên asset AI`);
  }
}
for (const y of [705, 745, 785, 832]) {
  assert.equal(Collision.canWalk(296, y, true), true,
    `Lối đi trung tâm nghĩa trang phải thông thoáng tại y=${y}`);
}
assert.equal(Collision.canWalk(505, 745, true), true, 'Chỗ quỳ phía đông khu mộ không bị chặn');
assert(Quest3.getMemorialFraming(player), 'Màn hình dọc phải được đóng khung rộng khi gần khu mộ');
assert.equal(Quest3.getMemorialFraming({ x: 900, y: 800 }), null, 'Camera bình thường bên ngoài khu mộ');
assert(fs.statSync('public/game/mo_co_nhan_sheet.webp').size < 15000, 'Sheet bia mộ WebP dưới 15 KB');
Quest3.drawGround(mockCtx); // Đất mộ thuộc background, KHÔNG được che nhân vật

// Kiểm tra đường chính từ Quảng Trường ra Cổng Làng (x = 690, y = 550..960) hoàn toàn không bị chặn
for (let y = 550; y <= 960; y += 25) {
  assert.equal(Collision.canWalk(690, y, true), true, `Đường chính ra cổng làng tại (690, ${y}) không được bị mộ chặn`);
}
Quest3.drawWorld(mockCtx, 10.5);
console.log('✓ TEST 6 + TIME: 06:00 tìm kiếm, 13:00 đào mộ, 14:45 hoàn tất đào, 15:00 tưởng niệm.');
console.log('✓ TEST 6: Dựng 60 ngôi mộ & bia tưởng niệm dưới cây anh đào (không có mộ A Nguyệt, không chặn đường chính).');

// 5. Lưu và tải lại giữa chừng (Persistence Test)
Quest3.saveState();
vm.runInContext(quest3Code.replace('const Quest3 =', 'var ReloadedQuest3 =').replace(/window\.Quest3 = Quest3/g, 'window.ReloadedQuest3 = ReloadedQuest3').replace(/module\.exports = Quest3/g, 'module.exports = ReloadedQuest3'), sandbox);
const ReloadedQuest3 = sandbox.ReloadedQuest3;
ReloadedQuest3.init();
ReloadedQuest3.restoreAfterLoad(player);
assert.equal(ReloadedQuest3.getFlags().quest3_blue_ribbon_collected, true, 'Tải lại phải giữ nguyên Ruy Băng Xanh');
assert.equal(ReloadedQuest3.getFlags().quest3_memorial_complete, true, 'Tải lại phải giữ nguyên trạng thái đã lập mộ');
assert.equal(sandbox.Villagers.minutes, 900, 'Tải lại giữ đúng giờ 15:00');
assert.equal(ReloadedQuest3.isInputLocked(), false, 'Tải lại không khóa điều khiển');
console.log('✓ TEST 7: Lưu và tải lại giữ nguyên tiến độ từng bước, không nhân đôi vật phẩm, không khóa điều khiển.');

// 6. Tiêu chí 8: Giai đoạn 5 — Rời Làng tại Cổng Làng (17.webp), không xung đột nhiệm vụ cũ
player.x = Quest3.GATE_SPOT.x;
player.y = Quest3.GATE_SPOT.y;
assert.equal(Quest3.interact(player), true, 'Tương tác tại Cổng Làng để rời làng');
assert.equal(Quest3.isComicActive(), true, 'Phát panel 17.webp (Rời làng)');
Quest3.advanceComicPanel(); // Kết thúc panel 17.webp
assert.equal(Quest3.getFlags().quest3_village_departed, true, 'Cờ quest3_village_departed phải = true');
assert.equal(Quest3.isCompleted(), true, 'Nhiệm vụ 3 hoàn tất 100%');
assert.equal(Quest3.isInputLocked(), true, 'Phải khóa điều khiển trong 2.8s hoạt cảnh tự động bước qua cổng làng');
Quest3.update(1.0, 12.0, player);
assert.equal(Quest3.isInputLocked(), true, 'Vẫn khóa điều khiển khi đang bước qua cổng làng (còn 1.8s)');
Quest3.drawHUD(mockCtx, player, 1280, 720, 12.0);
Quest3.update(2.0, 14.0, player);
assert.equal(Quest3.isInputLocked(), false, 'Mở khóa điều khiển sau khi hoàn tất 2.8s bước qua cổng làng');
console.log('✓ TEST 8: Cảnh Rời Làng (17.webp) tại Cổng Làng hoạt động mượt mà, không xung đột sự kiện cũ.');

// 7. Kiểm tra đồng bộ bản đồ Khu Đông & Khu Nam hoang tàn (AI redraw + seamless overlap tại x=1456, y=1000)
const eastRuinsPath = `${__dirname}/../public/game/Lang_Du_Lam_Hoang_Tan_Dong.webp`;
const southRuinsPath = `${__dirname}/../public/game/Lang_Du_Lam_Hoang_Tan_Nam.webp`;
const ruinsExtCode = fs.readFileSync(`${__dirname}/../public/game/ruins-extension.js`, 'utf8');
assert.equal(fs.existsSync(eastRuinsPath), true, 'File bản đồ Khu Đông hoang tàn Lang_Du_Lam_Hoang_Tan_Dong.webp phải tồn tại');
assert.equal(fs.existsSync(southRuinsPath), true, 'File bản đồ Khu Nam hoang tàn Lang_Du_Lam_Hoang_Tan_Nam.webp phải tồn tại');
assert(fs.statSync(eastRuinsPath).size > 50000, 'Ảnh AI Khu Đông hoang tàn phải có dung lượng hợp lệ (>50KB)');
assert(fs.existsSync(`${__dirname}/../public/game/Lang_Du_Lam_Hoang_Tan_Toan_Canh.webp`), 'Ảnh nền hoang tàn liền mạch phải tồn tại');
assert(fs.readFileSync(`${__dirname}/../public/game/game.js`, 'utf8').includes('if (ruinScene) ctx.drawImage(bgRuined, 0, 0, 3072, 1331)'), 'Làng hoang tàn phải dùng duy nhất ảnh toàn cảnh, không ghép nhiều mảnh runtime');
console.log('✓ TEST 9: Bản đồ Khu Đông & Khu Nam hoang tàn vẽ lại bằng AI đồng bộ, xóa hoàn toàn đường nối dọc tại x=1536.');

console.log('========================================================');
console.log('TẤT CẢ BÀI KIỂM THỬ NHIỆM VỤ 3 (TXT + 17 WEBP): PASS 100%!');
console.log('========================================================');
