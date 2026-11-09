const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// 1. Mock Canvas context & DOM environment
const g = new Proxy(
  {
    measureText: () => ({ width: 80 })
  },
  {
    get(o, k) {
      if (k in o) return o[k];
      return (...args) => {
        for (const arg of args) {
          if (typeof arg === 'number') assert(Number.isFinite(arg), k + ' ' + arg);
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
    children: [],
    get innerHTML() { return html; },
    set innerHTML(v) { html = v; if (!v) this.children = []; },
    src: '',
    alt: '',
    style: {},
    getContext: () => g,
    addEventListener() {},
    appendChild(child) { this.children.push(child); return child; },
    querySelector: () => null,
    querySelectorAll: () => [],
    focus() {}
  };
}

function getMockElement(id) {
  if (!domElements.has(id)) {
    domElements.set(id, createMockEl());
  }
  return domElements.get(id);
}

const mockLocalStorage = {
  store: new Map(),
  getItem(k) { return this.store.get(k) || null; },
  setItem(k, v) { this.store.set(k, String(v)); },
  removeItem(k) { this.store.delete(k); },
  clear() { this.store.clear(); }
};

const sandbox = {
  console,
  setTimeout(fn) { if (typeof fn === 'function') fn(); return 1; },
  clearTimeout() {},
  setInterval() {},
  clearInterval() {},
  requestAnimationFrame(cb) { cb(16); return 1; },
  Image: class {
    constructor() { this.src = ''; }
    decode() { return Promise.resolve(); }
  },
  document: {
    getElementById: (id) => getMockElement(id),
    createElement: (tag) => createMockEl(),
    body: createMockEl()
  },
  localStorage: mockLocalStorage,
  AudioContext: class {
    constructor() { this.currentTime = 0; this.state = 'running'; }
    createOscillator() { return { type: 'sine', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} }; }
    createBiquadFilter() { return { type: 'lowpass', frequency: { setValueAtTime() {} }, Q: { setValueAtTime() {} }, connect() {} }; }
    createBuffer(c, l, r) { return { getChannelData: () => new Float32Array(l) }; }
    createBufferSource() { return { connect() {}, start() {} }; }
    get destination() { return {}; }
  },
  Villagers: {
    day: 3,
    minutes: 480
  },
  TieuPhamHome: {
    inside: true,
    pose: 'none',
    exit() { this.inside = false; }
  },
  Quest1: {
    getState() { return 'completed'; }
  }
};

const renderCode = fs.readFileSync(__dirname + '/../public/game/quest2-render.js', 'utf8');
const code = fs.readFileSync(__dirname + '/../public/game/quest2.js', 'utf8');
vm.createContext(sandbox);
vm.runInContext(renderCode + '\n' + code + '; this.Quest2 = Quest2;', sandbox);

const Quest2 = sandbox.Quest2;

console.log('--- BẮT ĐẦU KIỂM THỬ NHIỆM VỤ 2: HUYẾT DẠ YÊU ẢNH ---');

// TEST 1: Khởi tạo và kiểm tra trạng thái mở khóa sau Quest 1
Quest2.init();
assert.strictEqual(Quest2.getState(), 'ready_to_rest', 'Quest 2 phải chuyển sang ready_to_rest khi Quest 1 completed');
console.log('✓ TEST 1: Mở khóa Quest 2 sau khi Quest 1 hoàn thành thành công.');

// TEST 2: Kích hoạt khi Tiểu Phàm nằm ngủ trên giường
const player = { x: 548, y: 198, dir: 'left', walk: 0 };
const startedRest = Quest2.triggerRestAtHome(player);
assert.strictEqual(startedRest, true, 'triggerRestAtHome phải trả về true');
assert.strictEqual(Quest2.getState(), 'sleeping_start', 'State phải chuyển sang sleeping_start');
console.log('✓ TEST 2: Kích hoạt ngủ tại nhà thành công.');

// TEST 3: Chuyển cảnh sang nửa đêm 00:00 (MIDNIGHT_WAKE)
Quest2.update(2.0, 2.0, player, sandbox.Villagers);
assert.strictEqual(Quest2.getState(), 'midnight_wake', 'Sau 1.6s ngủ, phải thức giấc lúc 00:00');
assert.strictEqual(sandbox.Villagers.minutes, 0, 'Giờ trong làng phải đổi thành 00:00');
assert.strictEqual(player.x, 532, 'Tiểu Phàm phải đứng cạnh giường để chống kẹt');
console.log('✓ TEST 3: Bừng tỉnh lúc 00:00 & chống kẹt giường thành công.');

// TEST 4: Bóng đen ngoài cửa sổ (WINDOW_SHADOW) & vẽ chi tiết Liệp Ma nhòm qua chấn song
Quest2.update(2.5, 4.5, player, sandbox.Villagers);
assert.strictEqual(Quest2.getState(), 'window_shadow', 'Phải chuyển sang cảnh bóng đen ngoài cửa sổ');
Quest2.drawInHome(g, 4.5);
console.log('✓ TEST 4: Cảnh Liệp Ma nhòm ngoài cửa sổ (sừng, mắt đỏ đồng tử dọc, vuốt bấu song cửa) hiển thị thành công.');

// TEST 5: Đếm ngược 10 giây sinh tử (COUNTDOWN_HIDE)
Quest2.update(4.0, 8.5, player, sandbox.Villagers);
assert.strictEqual(Quest2.getState(), 'countdown_hide', 'Phải chuyển sang đếm ngược 10 giây sinh tử');
Quest2.drawInHome(g, 8.5);
console.log('✓ TEST 5: Đồng hồ đếm ngược 10 giây sinh tử hoạt động chuẩn xác.');

// TEST 6: Nhánh chết khi chọn Gầm Giường (ATTACK_BED) -> Liệp Ma đánh hơi phát hiện -> đập nát giường -> cào xé người chơi về 0 HP
Quest2.chooseHideSpot('bed', player);
assert.strictEqual(Quest2.getState(), 'attack_bed', 'State phải chuyển sang attack_bed');
assert.strictEqual(Quest2.isWallBroken(), true, 'Liệp Ma phải phá vỡ 1 mảng tường lớn và đi vào');
// Giai đoạn 1 (1.2s): Liệp Ma mới bước vào đánh hơi tìm kiếm, CHƯA phá giường ngay lập tức
Quest2.update(1.2, 9.7, player, sandbox.Villagers);
assert.strictEqual(Quest2.isBedBroken(), false, 'Ở 1.2s Liệp Ma đang bước vào đánh hơi, chưa đập giường ngay');
assert.strictEqual(player.hp ?? 100, 100, 'Ở 1.2s người chơi chưa bị trừ máu');
// Giai đoạn 2 & 3 (tới 2.4s): Liệp Ma khựng lại phát hiện mùi rồi đập sập giường + vỡ chum
Quest2.update(1.2, 10.9, player, sandbox.Villagers);
assert.strictEqual(Quest2.isBedBroken(), true, 'Sau khi phát hiện mục tiêu (2.3s), giường phải bị đập nát vụn');
assert.strictEqual(Quest2.isJarBroken(), true, 'Chấn động làm chum sành bị vỡ toác');
Quest2.drawInHome(g, 10.9);

// Đòn tấn công 1 (tới 3.4s): -50 HP -> người chơi còn 50 HP (chưa chết)
Quest2.update(1.0, 11.9, player, sandbox.Villagers);
assert.strictEqual(player.hp, 50, 'Sau đòn cào đầu tiên của Liệp Ma, HP người chơi phải còn 50');

// Đòn tấn công 2 kết liễu (tới 4.5s): -50 HP -> HP về 0, gục ngã
Quest2.update(1.1, 13.0, player, sandbox.Villagers);
assert.strictEqual(player.hp, 0, 'Yêu ma tấn công: CHỈ KHI HP VỀ 0 MỚI TÍNH LÀ TỬ VONG');
assert.strictEqual(player.knockedDown, true, 'Tiểu Phàm ngã gục khi HP về 0');
console.log('✓ TEST 6: Liệp Ma đánh hơi phát hiện theo nhịp, đập nát giường, tấn công trừ HP tuần tự và chỉ tính tử vong khi HP về 0.');

// Helper để bước tới countdown_hide
function advanceToCountdown() {
  for (let i = 0; i < 30; i++) {
    Quest2.update(0.5, i * 0.5, player, sandbox.Villagers);
    if (Quest2.getState() === 'countdown_hide') break;
  }
}

// TEST 7: Nhánh chết khi chọn Trong Tủ (ATTACK_WARDROBE) -> Liệp Ma đánh hơi phát hiện -> xé toạc cửa tủ -> cắn xé về 0 HP
Quest2.resetState();
sandbox.Quest1.getState = () => 'completed';
Quest2.init();
player.hp = 100;
player.knockedDown = false;
Quest2.triggerRestAtHome(player);
advanceToCountdown();
assert.strictEqual(Quest2.getState(), 'countdown_hide', 'Phải tới countdown_hide');
Quest2.chooseHideSpot('wardrobe', player);
assert.strictEqual(Quest2.getState(), 'attack_wardrobe', 'State phải chuyển sang attack_wardrobe');
assert.strictEqual(Quest2.isWallBroken(), true, 'Liệp Ma phải phá vỡ 1 mảng tường lớn');
// Ở 1.2s Liệp Ma đang bước vào đánh hơi, chưa xé tủ ngay
Quest2.update(1.2, 11.2, player, sandbox.Villagers);
assert.strictEqual(Quest2.isWardrobeBroken(), false, 'Ở 1.2s Liệp Ma đang rình mò đánh hơi, chưa phá tủ ngay');
// Tới 2.4s: Liệp Ma phát hiện hơi thở trong khe tủ và giật tung toác cánh tủ
Quest2.update(1.2, 12.4, player, sandbox.Villagers);
assert.strictEqual(Quest2.isWardrobeBroken(), true, 'Cửa tủ phải bị giật tung toác sau khi phát hiện');
Quest2.drawInHome(g, 12.4);
// Đòn 1 (tới 3.4s) -> 50 HP
Quest2.update(1.0, 13.4, player, sandbox.Villagers);
assert.strictEqual(player.hp, 50, 'Đòn cào 1 trừ 50 HP còn 50');
// Đòn 2 (tới 4.5s) -> 0 HP
Quest2.update(1.1, 14.5, player, sandbox.Villagers);
assert.strictEqual(player.hp, 0, 'Liệp Ma kết liễu khiến HP về 0');
console.log('✓ TEST 7: Liệp Ma đánh hơi phát hiện, xé toạc cửa tủ, tấn công trừ HP về 0 thành công.');

// TEST 8: Nhánh sinh tồn trong Chum Nước (HIDING_JAR) -> Sống sót
Quest2.resetState();
Quest2.init();
player.hp = 100;
player.knockedDown = false;
Quest2.triggerRestAtHome(player);
advanceToCountdown();
Quest2.chooseHideSpot('jar', player);
assert.strictEqual(Quest2.getState(), 'hiding_jar', 'State phải chuyển sang hiding_jar');
assert.strictEqual(Quest2.isWallBroken(), true, 'Liệp Ma phải phá vỡ 1 mảng tường lớn và đi vào');
// Phải có hai đòn đánh riêng, va chạm đúng mốc; không tự vỡ khi Liệp Ma vừa tiến vào.
Quest2.update(4.2, 14.2, player, sandbox.Villagers);
assert.strictEqual(Quest2.isBedBroken(), false, '4.2s quái mới áp sát giường, giường chưa tự vỡ');
assert.strictEqual(Quest2.isWardrobeBroken(), false, '4.2s quái chưa hề đánh tủ');
Quest2.update(1.0, 15.2, player, sandbox.Villagers);
assert.strictEqual(Quest2.isBedBroken(), false, '5.2s giường còn nguyên khi chưa chạm đòn');
Quest2.update(0.03, 15.23, player, sandbox.Villagers);
assert.strictEqual(Quest2.isBedBroken(), true, '5.23s Liệp Ma chém trúng giường, giường mới vỡ');
assert.strictEqual(Quest2.isWardrobeBroken(), false, 'Sau khi phá giường, tủ vẫn còn nguyên');
Quest2.drawInHome(g, 15.23);
Quest2.update(4.85, 20.08, player, sandbox.Villagers);
assert.strictEqual(Quest2.isWardrobeBroken(), false, '10.08s Liệp Ma mới vung vuốt vào tủ');
Quest2.update(0.05, 20.13, player, sandbox.Villagers);
assert.strictEqual(Quest2.isWardrobeBroken(), true, '10.13s Liệp Ma đánh trúng tủ, tủ mới vỡ');
assert.strictEqual(Quest2.isJarBroken(), false, 'Chum nước nơi Tiểu Phàm trốn không bị phá');
Quest2.drawInHome(g, 20.13);
Quest2.update(8.77, 28.90, player, sandbox.Villagers);
assert.strictEqual(Quest2.getState(), 'after_decision', 'Liệp Ma rời nhà mới tới quyết định sau khi trốn trong chum');
console.log('✓ TEST 8: Nấp trong chum nước an toàn, Liệp Ma bỏ đi thành công.');

// TEST 9: Nhánh A: Chạy trốn ngoài làng (CHASE_VILLAGE) -> Liệp Ma đuổi kịp, tấn công trừ máu về 0
// Khi đang trong chum, chạm màn hình hoặc bấm nút/di chuyển sẽ trèo ra ngoài
const okClickLeave = Quest2.handleClick(400, 380, player);
assert.strictEqual(okClickLeave, true, 'Click vào màn hình để trèo ra khỏi chum');
assert.strictEqual(Quest2.getState(), 'chase_village', 'Phải chuyển sang chase_village');
assert.strictEqual(player.hp, 100, 'Khởi đầu chạy trốn với 100 HP');

// Liệp Ma phát hiện (0.3s đầu) rồi rượt đuổi và bắt kịp Tiểu Phàm
player.x = 200;
player.y = 200;
Quest2.update(0.1, 19.0, player, sandbox.Villagers);
// Cho Liệp Ma vồ cào đòn 1: -50 HP -> còn 50 HP
for (let i = 0; i < 25; i++) {
  Quest2.update(0.1, 19.0 + i * 0.1, player, sandbox.Villagers);
  if (player.hp === 50) break;
}
assert.strictEqual(player.hp, 50, 'Liệp Ma đuổi kịp cào trúng lưng trừ 50 HP (còn 50)');

// Đòn 2 kết liễu: -50 HP -> 0 HP
for (let i = 0; i < 25; i++) {
  Quest2.update(0.1, 21.0 + i * 0.1, player, sandbox.Villagers);
  if (player.hp === 0) break;
}
assert.strictEqual(player.hp, 0, 'Liệp Ma cắn xé kết liễu, HP về đúng 0');
assert.strictEqual(player.knockedDown, true, 'Tiểu Phàm ngã gục trên đường làng');
console.log('✓ TEST 9: Nhánh A rượt đuổi ngoài làng: Liệp Ma tấn công trừ máu tuần tự về 0 HP thành công.');

// TEST 10: Chết là chơi lại từ đầu (Permadeath -> 00:00 Nửa Đêm)
Quest2.retryFromCheckpoint(player);
assert.strictEqual(Quest2.getState(), 'midnight_wake', 'Chết phải chơi lại từ đầu lúc 00:00 nửa đêm');
assert.strictEqual(player.hp, 100, 'Hồi phục lại 100 HP khi chơi lại');
assert.strictEqual(player.knockedDown, false, 'Không còn bị knock down');
assert.strictEqual(Quest2.isBedBroken(), false, 'Giường ngủ được khôi phục nguyên trạng');
assert.strictEqual(Quest2.isWardrobeBroken(), false, 'Tủ quần áo được khôi phục nguyên trạng');
assert.strictEqual(Quest2.isJarBroken(), false, 'Chum sành được khôi phục nguyên trạng');
assert.strictEqual(Quest2.isWallBroken(), false, 'Mảng tường vỡ được khôi phục nguyên trạng');
assert.strictEqual(Quest2.isVillageRuined(), false, 'Làng chưa bị hoang tàn');
console.log('✓ TEST 10: Cơ chế Permadeath: Chết là chơi lại từ đầu lúc 00:00 Nửa đêm với 100 HP.');

// TEST 11: Nhánh B: Tự tương tác môi trường - kiên nhẫn ẩn mình 5s trong chum tới bình minh (06:00 sáng) -> Hoàn thành
let currentMusicScene = 'peaceful';
sandbox.VillageMusic = {
  setSceneMode(mode) { currentMusicScene = mode; },
  setRaidNightMode(active) { currentMusicScene = active ? 'raid_night' : 'peaceful'; }
};
Quest2.resetState();
assert.strictEqual(Quest2.isNightRaidMusicActive(), false, 'Nhạc đêm Liệp Ma phải tắt khi chưa vào sự kiện');
assert.strictEqual(Quest2.isRuinsMusicActive(), false, 'Nhạc phế tích phải tắt khi chưa tới bình minh');
assert.strictEqual(currentMusicScene, 'peaceful');
Quest2.init();
assert.strictEqual(Quest2.isNightRaidMusicActive(), false, 'Nhạc đêm Liệp Ma không bật ở ready_to_rest');
player.hp = 100;
player.knockedDown = false;
Quest2.triggerRestAtHome(player);
assert.strictEqual(Quest2.isNightRaidMusicActive(), false, 'Nhạc đêm Liệp Ma chưa bật khi mới nằm xuống giường');
advanceToCountdown();
assert.strictEqual(Quest2.isNightRaidMusicActive(), true, 'Nhạc đêm Liệp Ma phải bật khi vào đêm sự kiện Liệp Ma (00:00)');
assert.strictEqual(currentMusicScene, 'raid_night');
Quest2.chooseHideSpot('jar', player);
assert.strictEqual(Quest2.isNightRaidMusicActive(), true, 'Nhạc đêm Liệp Ma duy trì khi trốn trong chum');
Quest2.update(18.9, 35.7, player, sandbox.Villagers);
assert.strictEqual(Quest2.getState(), 'after_decision', 'Sau khi Liệp Ma bỏ đi');

// Người chơi chạm vào góc HUD (30, 30) không bị tính là trèo ra khỏi chum
assert.strictEqual(Quest2.handleClick(30, 30, player), false, 'Chạm vào góc HUD không được làm lộ chỗ trốn');
assert.strictEqual(Quest2.getState(), 'after_decision', 'Vẫn ở trạng thái after_decision');

// Người chơi không chạm/di chuyển, ở yên trong chum 5.0 giây
Quest2.update(5.2, 35.2, player, sandbox.Villagers);
assert.strictEqual(Quest2.getState(), 'time_skip_dawn', 'Ẩn nấp đủ 5 giây tự động chuyển sang bình minh');
assert.strictEqual(Quest2.isHidingInJar(), true, 'Trong lúc chuyển cảnh chờ sáng (time_skip_dawn), Tiểu Phàm vẫn phải ẩn trong chum');
assert.strictEqual(Quest2.isInputLocked(), true, 'Khóa di chuyển trong lúc đang chuyển cảnh chờ sáng');

// Cập nhật qua bình minh
Quest2.update(4.0, 39.2, player, sandbox.Villagers);
assert.strictEqual(Quest2.getState(), 'ruins_explore', 'Phải tới ruins_explore');
assert.strictEqual(Quest2.isHidingInJar(), false, 'Khi trời sáng đã trèo ra khỏi chum');
assert.strictEqual(Quest2.isInputLocked(), false, 'Mở khóa di chuyển để tự đi bộ ra khỏi nhà');
assert.strictEqual(Quest2.isVillageRuined(), true, 'Map phải chuyển sang trạng thái phế tích');
assert.strictEqual(Quest2.isNightRaidMusicActive(), false, 'Nhạc đêm Liệp Ma phải tắt ngay khi trời sáng (06:00)');
assert.strictEqual(Quest2.isRuinsMusicActive(), true, 'Nhạc buổi sáng làng hoang tàn phải bật ngay khi trời sáng (06:00)');
assert.strictEqual(currentMusicScene, 'ruins', 'VillageMusic.setSceneMode("ruins") phải được gọi khi trời sáng');
console.log('✓ TEST 11: Sống sót tới sáng bằng cách kiên nhẫn nấp trong chum, kích hoạt phế tích & chuyển sang nhạc buổi sáng làng hoang tàn thành công.');

// TEST 12: Kiểm tra trạng thái ẩn mình (trốn tủ, nấp chum, chui gầm giường) & chống tự động kẹt đầu giường
function prepareCountdown() {
  Quest2.resetState();
  sandbox.Quest1.getState = () => 'completed';
  Quest2.init();
  player.hp = 100;
  player.knockedDown = false;
  Quest2.triggerRestAtHome(player);
  advanceToCountdown();
  assert.strictEqual(Quest2.getState(), 'countdown_hide');
}

prepareCountdown();
// Nhích nhẹ lên sát mép giường không bị tự động tính chui gầm giường khi chưa bấm nút
player.x = 532;
player.y = 215;
Quest2.update(0.05, 9.0, player, sandbox.Villagers, 0.05);
assert.strictEqual(Quest2.getState(), 'countdown_hide', 'Đi sát mép giường không tự động chui gầm giường khi chưa tương tác');

Quest2.chooseHideSpot('jar', player);
assert.strictEqual(Quest2.isHidingInJar(), true, 'isHidingInJar phải là true khi trốn trong chum');
assert.strictEqual(Quest2.isInputLocked(), true, 'Khóa di chuyển khi đang nấp trong chum');
assert.strictEqual(Quest2.isHidingInWardrobe(), false, 'isHidingInWardrobe phải là false');
assert.strictEqual(Quest2.isHidingUnderBed(), false, 'isHidingUnderBed phải là false');

prepareCountdown();
Quest2.chooseHideSpot('wardrobe', player);
assert.strictEqual(Quest2.isHidingInWardrobe(), true, 'isHidingInWardrobe phải là true khi đang nấp trong tủ');
assert.strictEqual(Quest2.isInputLocked(), true, 'Khóa di chuyển khi đang hoạt cảnh bị tấn công ở tủ');
assert.strictEqual(Quest2.isHidingInJar(), false);
assert.strictEqual(Quest2.isHidingUnderBed(), false);

prepareCountdown();
Quest2.chooseHideSpot('bed', player);
assert.strictEqual(Quest2.isHidingUnderBed(), true, 'isHidingUnderBed phải là true khi đang nấp dưới gầm giường');
assert.strictEqual(Quest2.isInputLocked(), true, 'Khóa di chuyển khi đang hoạt cảnh bị tấn công ở giường');
assert.strictEqual(Quest2.isHidingInJar(), false);
assert.strictEqual(Quest2.isHidingInWardrobe(), false);
console.log('✓ TEST 12: Cơ chế ẩn nấp hoạt ảnh (trốn tủ không thấy người, núp chum, chui gầm giường) hoạt động chuẩn xác.');

console.log('========================================================');
console.log('TẤT CẢ 12/12 BÀI KIỂM THỬ NHIỆM VỤ 2: PASS 100%!');
console.log('========================================================');

