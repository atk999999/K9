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
    appendChild(child) {
      this.children.push(child);
    },
    addEventListener() {},
    setAttribute() {}
  };
}

const storageMap = new Map();
const localStorageMock = {
  getItem: (k) => storageMap.get(k) || null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

const c = {
  window: {},
  localStorage: localStorageMock,
  setInterval,
  clearInterval,
  setTimeout,
  clearTimeout,
  addEventListener() {},
  document: {
    createElement: (tag) => {
      const el = createMockEl();
      el.tagName = tag.toUpperCase();
      return el;
    },
    getElementById: (id) => {
      if (!domElements.has(id)) {
        domElements.set(id, createMockEl());
      }
      return domElements.get(id);
    }
  }
};

vm.createContext(c);
vm.runInContext(fs.readFileSync('public/game/collision.js', 'utf8') + '; this.Collision = Collision;', c);
vm.runInContext(fs.readFileSync('public/game/character.js', 'utf8') + '; this.Character = Character;', c);
vm.runInContext(fs.readFileSync('public/game/tieu-pham.js', 'utf8') + '\n' + fs.readFileSync('public/game/tieu-pham-home.js', 'utf8') + '; this.TieuPham = TieuPham; this.TieuPhamHome = TieuPhamHome; this.PlayerRoster = PlayerRoster;', c);
vm.runInContext(fs.readFileSync('public/game/npcs.js', 'utf8') + '; this.Villagers = Villagers;', c);
vm.runInContext(fs.readFileSync('public/game/a-huy.js', 'utf8') + '; this.AHuy = AHuy;', c);
vm.runInContext(fs.readFileSync('public/game/quest1-data.js', 'utf8') + '\n' + fs.readFileSync('public/game/quest1-render.js', 'utf8') + '\n' + fs.readFileSync('public/game/quest1.js', 'utf8') + '; this.Quest1 = Quest1;', c);

c.Villagers.init();
const Quest1 = c.Quest1;
const Villagers = c.Villagers;
const TieuPhamHome = c.TieuPhamHome;

// -------------------------------------------------------------
// TEST 1: Khởi tạo và trạng thái ban đầu
// -------------------------------------------------------------
Quest1.resetState();
assert.equal(Quest1.getState(), 'chief_approaching');
assert.equal(Quest1.isQuestBoardVisible(), false, 'Thanh nhiệm vụ ban đầu phải ẩn');
Quest1.init(Villagers);
const truong = Quest1.cachedChief;
assert(truong, 'Trưởng làng phải tồn tại trong danh sách NPC');
assert(c.Collision.canWalk(truong.x, truong.y), 'Vị trí của trưởng làng phải hợp lệ không kẹt');

// -------------------------------------------------------------
// TEST 2: Trưởng làng tìm người chơi sau 30 giây, không đi xuyên vật cản
// -------------------------------------------------------------
const player = { x: 220, y: 316, dir: 'down' };
assert(c.Collision.canWalk(player.x, player.y), 'Vị trí Tiểu Phàm hợp lệ');
assert.equal(Quest1.approachDelay, 30.0, 'Thời gian chờ ban đầu phải là 30 giây');

const initialX = truong.x;
const initialY = truong.y;

// Trong 10 giây đầu (dt = 0.5s x 20 bước), Trưởng làng chưa tìm người chơi
for (let i = 0; i < 20; i++) {
  Quest1.update(0.5, i * 0.5, player, Villagers);
}
assert(Quest1.approachDelay > 0 && Quest1.approachDelay <= 20.0, 'Đếm ngược 30 giây đang hoạt động');
assert.equal(truong.x, initialX, 'Trong 30 giây đầu Trưởng làng chưa đuổi theo Tiểu Phàm');

// Tiến nhanh qua mốc 30 giây (cập nhật thêm 45 bước x 0.5s = 22.5s)
for (let i = 0; i < 45; i++) {
  Quest1.update(0.5, 10 + i * 0.5, player, Villagers);
}
assert.equal(Quest1.approachDelay, 0, 'Sau 30 giây, thời gian chờ đã hết');

// Sau 30 giây, Trưởng làng chủ động tìm đường và tiến lại gần Tiểu Phàm
let prevDist = Math.hypot(truong.x - player.x, truong.y - player.y);
for (let i = 0; i < 20; i++) {
  Quest1.update(0.2, 33 + i * 0.2, player, Villagers);
  assert(c.Collision.canWalk(truong.x, truong.y), `Trưởng làng bị kẹt tại (${truong.x}, ${truong.y})`);
}
const newDist = Math.hypot(truong.x - player.x, truong.y - player.y);
assert(newDist < prevDist, 'Sau 30 giây Trưởng làng phải tiến lại gần Tiểu Phàm');

// Khi đến gần Tiểu Phàm (<= 56px)
truong.x = player.x + 35;
truong.y = player.y + 10;
assert(c.Collision.canWalk(truong.x, truong.y));
Quest1.update(0.1, 40.0, player, Villagers);

assert(truong.dir === -1 || truong.dir === 1, 'Trưởng làng phải quay mặt về phía Tiểu Phàm');
assert.equal(truong.spokenLine, 'Nhóc con! Nhóc con! Mau lại đây!', 'Trưởng làng phải gọi câu chuẩn xác');
assert(Quest1.isDialogueActive(), 'Hội thoại phải tự động kích hoạt khi trưởng làng tới gần');

// -------------------------------------------------------------
// TEST 3: Kiểm tra hiển thị avatar và nội dung hội thoại mở đầu
// -------------------------------------------------------------
const avatarEl = c.document.getElementById('quest-avatar');
const speakerEl = c.document.getElementById('quest-speaker-name');
assert.equal(speakerEl.textContent, 'Trưởng làng');
assert(avatarEl.src.includes('Truong_Lang_Avatar_9KB.webp'), 'Avatar trưởng làng phải là Truong_Lang_Avatar_9KB.webp');

// Progress through opening 4 dialogue steps
for (let s = 0; s < 3; s++) {
  c.document.getElementById('quest-dialog').onclick(); // fast-forward typewriter
  c.document.getElementById('quest-dialog').onclick(); // next line
}
// Finish typing the 4th line to show choices
c.document.getElementById('quest-dialog').onclick();
const choicesEl = c.document.getElementById('quest-choices');
assert.equal(choicesEl.hidden, false, 'Các lựa chọn phải hiển thị');
assert.equal(choicesEl.children.length, 3, 'Phải có 3 lựa chọn mở đầu');

// Check that NO "linh căn" question choice exists
for (const child of choicesEl.children) {
  assert(!child.textContent.includes('Linh căn là gì'), 'Không được có lựa chọn hỏi về linh căn');
}

// -------------------------------------------------------------
// TEST 4: Nhánh 3 - Từ chối (Lựa chọn: Ta chẳng muốn làm tiên nhân)
// -------------------------------------------------------------
// Select choice 3 (decline)
choicesEl.children[2].onclick({ stopPropagation() {} });
assert(Quest1.isDialogueActive());

// Read through decline dialogue
while (Quest1.isDialogueActive()) {
  c.document.getElementById('quest-dialog').onclick();
}
assert.equal(Quest1.getState(), 'declined', 'Trạng thái phải là declined');
assert(Quest1.getState() !== 'registered', 'Từ chối không được tính là registered');
assert.equal(Quest1.isQuestBoardVisible(), false, 'Thanh nhiệm vụ phải ẩn khi từ chối kiểm tra linh căn');

// Test revisit when declined: Trưởng làng hỏi lại, người chơi đổi ý đăng ký!
Quest1.talk(player);
assert(Quest1.isDialogueActive());
c.document.getElementById('quest-dialog').onclick(); // finish text
const revisitDeclineChoices = c.document.getElementById('quest-choices');
assert.equal(revisitDeclineChoices.children.length, 2);
// Choose to change mind and register!
revisitDeclineChoices.children[0].onclick({ stopPropagation() {} });
while (Quest1.isDialogueActive()) {
  c.document.getElementById('quest-dialog').onclick();
}
assert.equal(Quest1.getState(), 'registered', 'Đổi ý phải chuyển sang registered');
assert.equal(Quest1.registeredDay, Villagers.day);
assert.equal(Quest1.isQuestBoardVisible(), true, 'Thanh nhiệm vụ phải hiển thị khi đổi ý đồng ý kiểm tra linh căn');

// -------------------------------------------------------------
// TEST 5: Nhánh 2 - Do dự và 2 lựa chọn phụ (Bước lên tiên lộ vs Chưa sẵn sàng)
// -------------------------------------------------------------
Quest1.resetState();
Quest1.talk(player);
// Skip to choices in opening
for (let s = 0; s < 4; s++) {
  c.document.getElementById('quest-dialog').onclick();
  c.document.getElementById('quest-dialog').onclick();
}
// Click Choice 2 (hesitant)
c.document.getElementById('quest-choices').children[1].onclick({ stopPropagation() {} });
// Advance until sub-choices appear
while (c.document.getElementById('quest-choices').hidden) {
  c.document.getElementById('quest-dialog').onclick();
}
const subChoices = c.document.getElementById('quest-choices');
assert.equal(subChoices.children.length, 2, 'Phải có 2 lựa chọn phụ trong nhánh do dự');
assert(subChoices.children[0].textContent.includes('Ta đã quyết định, ta muốn bước lên tiên lộ'));
assert(subChoices.children[1].textContent.includes('Ta vẫn chưa sẵn sàng rời khỏi nơi này'));

// Test Sub-choice 2B: Chưa sẵn sàng -> considering
subChoices.children[1].onclick({ stopPropagation() {} });
while (Quest1.isDialogueActive()) {
  c.document.getElementById('quest-dialog').onclick();
}
assert.equal(Quest1.getState(), 'considering', 'Trạng thái phải là considering');
assert(Quest1.getState() !== 'registered', 'Chưa sẵn sàng không được tính là registered');
assert.equal(Quest1.isQuestBoardVisible(), false, 'Thanh nhiệm vụ phải ẩn khi chưa sẵn sàng / đang suy nghĩ');

// Test revisit when considering: Trưởng làng hỏi lại, người chơi đổi ý đăng ký!
Quest1.talk(player);
assert(Quest1.isDialogueActive());
c.document.getElementById('quest-dialog').onclick();
const revisitConsiderChoices = c.document.getElementById('quest-choices');
assert.equal(revisitConsiderChoices.children.length, 2);
// Choose to register
revisitConsiderChoices.children[0].onclick({ stopPropagation() {} });
while (Quest1.isDialogueActive()) {
  c.document.getElementById('quest-dialog').onclick();
}
assert.equal(Quest1.getState(), 'registered', 'Đăng ký sau khi suy nghĩ thành công');
assert.equal(Quest1.isQuestBoardVisible(), true, 'Thanh nhiệm vụ phải hiển thị khi đăng ký sau khi suy nghĩ');

// -------------------------------------------------------------
// TEST 6: Nhánh 1 - Háo hức -> Đăng ký trực tiếp
// -------------------------------------------------------------
Quest1.resetState();
Quest1.talk(player);
for (let s = 0; s < 4; s++) {
  c.document.getElementById('quest-dialog').onclick();
  c.document.getElementById('quest-dialog').onclick();
}
// Choose 1: Háo hức
c.document.getElementById('quest-choices').children[0].onclick({ stopPropagation() {} });
let foundPhamAvatar = false;
while (Quest1.isDialogueActive()) {
  if (speakerEl.textContent === 'Tiểu Phàm') {
    assert(
      avatarEl.src.includes('Tieu_Pham_Avatar_Duoi_10KB.webp') || avatarEl.src.includes('tieu-pham-avatar.webp'),
      'Avatar của Tiểu Phàm phải luôn là chân dung Tiểu Phàm, không được gán avatar trưởng làng'
    );
    assert(
      !avatarEl.src.includes('Truong_Lang'),
      'Thoại của Tiểu Phàm không được gán avatar trưởng làng!'
    );
    foundPhamAvatar = true;
  }
  c.document.getElementById('quest-dialog').onclick();
}
assert(foundPhamAvatar, 'Avatar Tiểu Phàm phải xuất hiện khi người chơi nói');
assert.equal(Quest1.getState(), 'registered');
assert.equal(Quest1.isQuestBoardVisible(), true, 'Thanh nhiệm vụ phải hiển thị ngay khi người chơi háo hức đăng ký');

// -------------------------------------------------------------
// TEST 7: Tiến trình 2 ngày theo lịch game -> selection_ready (Hồi 2)
// -------------------------------------------------------------
const startDay = Villagers.day;
Quest1.registeredDay = startDay;

// Day + 1 -> still registered
Villagers.day = startDay + 1;
Quest1.update(0.1, 10.0, player, Villagers);
assert.equal(Quest1.getState(), 'registered');
assert.equal(Quest1.isQuestBoardVisible(), true, 'Thanh nhiệm vụ hiển thị trong thời gian chờ');

// Talk before 2 days
Quest1.talk(player);
assert(Quest1.isDialogueActive());
c.document.getElementById('quest-dialog').onclick();
assert(c.document.getElementById('quest-dialog-text').textContent.includes('Chớ sốt ruột, cứ chuẩn bị tinh thần'));
Quest1.closeDialogue();

// Day + 2 -> selection_ready (Mốc 2 ngày chuẩn Hồi 2)
Villagers.day = startDay + 2;
Quest1.update(0.1, 11.0, player, Villagers);
assert.equal(Quest1.getState(), 'selection_ready', 'Sau 2 ngày trạng thái phải là selection_ready');
assert.equal(Quest1.isQuestBoardVisible(), true, 'Thanh nhiệm vụ tiếp tục hiển thị khi tới ngày tuyển chọn');

// Talk when selection_ready
Quest1.talk(player);
assert(Quest1.isDialogueActive());
c.document.getElementById('quest-dialog').onclick();
assert(c.document.getElementById('quest-dialog-text').textContent.includes('Mau đến quảng trường! Tiên nhân sắp giáng lâm'));
Quest1.closeDialogue();

// -------------------------------------------------------------
// TEST 8: Kiểm tra lưu và khôi phục trạng thái (Persistence / LocalStorage)
// -------------------------------------------------------------
const savedRaw = localStorageMock.getItem('lang_du_lam_quest1_v1');
assert(savedRaw, 'Phải có dữ liệu lưu trong localStorage');
const savedObj = JSON.parse(savedRaw);
assert.equal(savedObj.state, 'selection_ready');

// -------------------------------------------------------------
// TEST 9: Kiểm tra vẽ biểu tượng dấu chấm than (!) và hiển thị
// -------------------------------------------------------------
Quest1.drawWorld(g, 1.0);

// -------------------------------------------------------------
// TEST 10: Kiểm tra Hồi 2 — Nghi Thức Khảo Nghiệm Linh Căn (4 Khu Vực, Tuần Tự, Không Chồng Đè)
// -------------------------------------------------------------
// Di chuyển Tiểu Phàm vào quảng trường
player.x = 680;
player.y = 568;
Quest1.update(0.1, 15.0, player, Villagers);
assert.equal(Quest1.getState(), 'cinematic_active', 'Tiểu Phàm vào sân làng phải kích hoạt cinematic');
assert(Quest1.isDialogueActive(), 'Điều khiển người chơi phải bị khóa khi cinematic diễn ra');

// 10a. Kiểm tra đội hình 4 khu vực: Không có bất kỳ 2 nhân vật nào trùng tọa độ hoặc đè lên nhau
function collectSquareActors() {
  const pts = [
    { id: 'tieuPham', x: player.x, y: player.y },
    { id: 'aHuy', x: c.AHuy.x, y: c.AHuy.y }
  ];
  const watchedIds = ['truong', 'an', 'minh', 'tung', 'cuc', 'sen', 'tran', 'binh', 'dao', 'lien', 'ho', 'son', 'ngu', 'hong'];
  for (const id of watchedIds) {
    const npc = Villagers.list.find((n) => n.id === id);
    assert(npc, 'Phải tồn tại NPC ' + id);
    assert.equal(npc.state, 'ceremony', 'NPC tại quảng trường phải ở trạng thái ceremony (không vung tay/cầm nông cụ): ' + id);
    pts.push({ id, x: npc.x, y: npc.y });
  }
  return pts;
}

const initialActors = collectSquareActors();
for (let i = 0; i < initialActors.length; i++) {
  for (let j = i + 1; j < initialActors.length; j++) {
    const a = initialActors[i];
    const b = initialActors[j];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    assert(d >= 24, `Hai nhân vật ${a.id} và ${b.id} không được đứng đè lên nhau (dist=${d.toFixed(1)})`);
  }
  // Không ai được đứng chiếm chỗ trung tâm khảo nghiệm (STONE_POS = 680, 498) khi chưa đến lượt
  const distToStone = Math.hypot(initialActors[i].x - Quest1.STONE_POS.x, initialActors[i].y - Quest1.STONE_POS.y);
  assert(distToStone >= 28, `Nhân vật ${initialActors[i].id} không được chiếm vị trí trung tâm Quan Trắc Thạch`);
}
assert.equal(truong.spokenLine, '', 'Thoại trên đầu Trưởng làng phải được xóa sạch khi bước vào khảo nghiệm');

// Duyệt qua Phân cảnh 1 (Trưởng làng, A Huy thì thầm, kiếm minh)
function clickThroughCurrentDialogue() {
  let guard = 0;
  while (Quest1.isDialogueActive() && guard++ < 50) {
    c.document.getElementById('quest-dialog').onclick();
  }
}
clickThroughCurrentDialogue();

// Phân cảnh 2 (Lục Nham ngự kiếm giáng lâm tại Khu A bên trái Trưởng làng & tiếp đất)
Quest1.update(2.6, 18.0, player, Villagers);
Quest1.update(0.6, 18.6, player, Villagers);
Quest1.drawWorld(g, 18.6);
assert(Quest1.getCameraOffset(), 'Camera offset phải có giá trị');
const lucNham = Quest1.getLucNhamEntity();
assert.equal(lucNham.x, Quest1.LUC_NHAM_STAND.x, 'Lục Nham phải đứng bên trái Khu A');
assert.equal(lucNham.y, Quest1.LUC_NHAM_STAND.y, 'Lục Nham đứng phía trên vòng tròn hoa văn');
assert(Math.hypot(lucNham.x - Quest1.STONE_POS.x, lucNham.y - Quest1.STONE_POS.y) >= 40, 'Lục Nham không được đứng đè lên Quan Trắc Thạch');

// Duyệt hội thoại chào hỏi giữa Trưởng làng và Lục Nham
clickThroughCurrentDialogue();
assert.equal(Quest1.getCinematicStep(), 3, 'Phải chuyển sang Phân cảnh 3 (Triệu hồi Quan Trắc Thạch)');

// Phân cảnh 3: Quan Trắc Thạch từ từ hạ xuống trung tâm hoa văn
Quest1.update(0.5, 19.1, player, Villagers);
assert(Quest1.getObservationStone().z > 0, 'Quan Trắc Thạch phải hạ từ trên không xuống');
Quest1.update(1.2, 20.3, player, Villagers);
assert.equal(Quest1.getObservationStone().z, 0, 'Quan Trắc Thạch chạm đất chính giữa hoa văn');
Quest1.update(0.5, 20.8, player, Villagers);
clickThroughCurrentDialogue();
assert.equal(Quest1.getCinematicStep(), 4, 'Phải chuyển sang Phân cảnh 4 (Xướng danh tuần tự từng thiếu niên)');

// Phân cảnh 4: Kiểm tra tuần tự từng thiếu niên (Tiểu An -> Tiểu Minh -> Bé Cúc)
for (const candId of ['an', 'minh', 'cuc']) {
  Quest1.update(0.1, 21.0, player, Villagers);
  assert.equal(Quest1.getCandidateRegistry()[candId].status, 'CALLED', `${candId} phải chuyển sang CALLED`);
  clickThroughCurrentDialogue();
  assert.equal(Quest1.getCandidateRegistry()[candId].status, 'WALKING', `${candId} phải chuyển sang WALKING`);
  // Bước lên vị trí khảo nghiệm
  for (let s = 0; s < 13; s++) Quest1.update(0.25, 22.0 + s * 0.25, player, Villagers);
  assert.equal(Quest1.getCandidateRegistry()[candId].status, 'RESULT', `${candId} sau khi chạm đá phải nhận kết quả RESULT`);
  clickThroughCurrentDialogue();
  // Di chuyển ra khu vực bên trái (EXITED)
  for (let s = 0; s < 12; s++) Quest1.update(0.25, 25.0 + s * 0.25, player, Villagers);
  assert.equal(Quest1.getCandidateRegistry()[candId].status, 'EXITED', `${candId} phải rời trung tâm sang khu vực EXITED`);
  assert.equal(Quest1.getCandidateRegistry()[candId].testedCount, 1, `${candId} chỉ được gọi khảo nghiệm đúng 1 lần`);
}

assert.equal(Quest1.getCinematicStep(), 5, 'Sau khi 3 thiếu niên NPC hoàn tất, phải đến lượt A Huy (Phân cảnh 5)');
Quest1.update(0.1, 30.0, player, Villagers);
assert.equal(Quest1.getCandidateRegistry().aHuy.status, 'CALLED', 'A Huy phải được gọi tên');
clickThroughCurrentDialogue();
assert.equal(Quest1.getCandidateRegistry().aHuy.status, 'WALKING', 'A Huy bước ra khỏi hàng');
for (let s = 0; s < 10; s++) Quest1.update(0.2, 31.0 + s * 0.2, player, Villagers);
assert.equal(Quest1.getObservationStone().activeRoot, 'tam_linh_can', 'A Huy chạm đá kích hoạt Tam Linh Căn');
Quest1.update(1.0, 34.0, player, Villagers);
clickThroughCurrentDialogue();
for (let s = 0; s < 10; s++) Quest1.update(0.2, 35.0 + s * 0.2, player, Villagers);
assert.equal(Quest1.getCandidateRegistry().aHuy.status, 'EXITED', 'A Huy di chuyển sang khu vực được chọn bên phải');
assert.equal(c.AHuy.x, Quest1.AHUY_PASSED_POS.x, 'A Huy đứng đúng vị trí bên phải');

// Phân cảnh 6: Khảo nghiệm Tiểu Phàm (Tương tác)
assert.equal(Quest1.getCinematicStep(), 6, 'Đến lượt Tiểu Phàm (Phân cảnh 6)');
Quest1.update(0.1, 38.0, player, Villagers);
clickThroughCurrentDialogue();
// Chọn tự động bước lên vị trí khảo nghiệm
const step6Choices = domElements.get('quest-choices').children;
assert(step6Choices.length >= 2, 'Phải có lựa chọn tự bước lên hoặc tự động di chuyển cho Tiểu Phàm');
step6Choices[0].onclick({ stopPropagation() {} });
for (let s = 0; s < 10; s++) Quest1.update(0.2, 39.0 + s * 0.2, player, Villagers);
clickThroughCurrentDialogue();
assert.equal(Quest1.getStepSubPhase(), 'await_touch', 'Phải chờ người chơi tương tác với Quan Trắc Thạch, không tự kích hoạt kết quả');
assert.equal(Quest1.getObservationStone().activeRoot, null, 'Chưa chạm đá thì chưa kích hoạt kết quả');

// Người chơi tương tác chạm tay vào Quan Trắc Thạch
assert(Quest1.interact(player), 'Người chơi tương tác với Quan Trắc Thạch thành công');
Quest1.update(0.6, 42.0, player, Villagers);
assert.equal(Quest1.getObservationStone().activeRoot, 'ngu_tap_can', 'Kích hoạt hiệu ứng Ngũ Hành Tạp Linh Căn sau khi chạm đá');
Quest1.update(0.8, 43.0, player, Villagers);
clickThroughCurrentDialogue();
assert.equal(Quest1.getCinematicStep(), 7, 'Chuyển sang Phân cảnh 7 (Trưởng làng an ủi)');

// Phân cảnh 7 -> 8 (A Huy khiêu khích) -> 10 (Lục Nham mang A Huy bay đi) -> Hoàn tất
Quest1.update(0.5, 43.5, player, Villagers);
clickThroughCurrentDialogue();
assert.equal(Quest1.getCinematicStep(), 8, 'Chuyển sang Phân cảnh 8 (A Huy khiêu khích)');
Quest1.update(0.5, 44.0, player, Villagers);
// Chọn phản ứng đầu tiên
c.document.getElementById('quest-dialog').onclick();
domElements.get('quest-choices').children[0].onclick({ stopPropagation() {} });
clickThroughCurrentDialogue();
assert.equal(Quest1.getCinematicStep(), 10, 'Chuyển sang Phân cảnh 10 (Lục Nham mang A Huy rời làng)');
Quest1.update(3.5, 47.5, player, Villagers);
assert.equal(Quest1.getState(), 'completed', 'Nhiệm vụ chuyển sang trạng thái completed');
assert.equal(c.AHuy.hidden, true, 'A Huy phải biến mất khỏi làng sau khi được tiên nhân mang đi');
clickThroughCurrentDialogue();
const completedHud = Quest1.getQuestHUDInfo();
assert(
  completedHud.objective.toLowerCase().includes('về nhà nghỉ ngơi'),
  'Không được giữ bảng nhiệm vụ trống đang phát triển sau khi tiên nhân rời làng'
);

// Giả lập tải lại trang khi nhiệm vụ đã completed: A Huy vẫn không được xuất hiện lại tại làng
c.AHuy.hidden = false;
Quest1.init(Villagers);
c.AHuy.update(0.1, 50.0, player);
assert.equal(c.AHuy.hidden, true, 'Sau khi tải lại game ở trạng thái completed, A Huy vẫn phải ẩn khỏi làng');

// Kiểm tra avatar Lục Nham và A Huy trong đối thoại
assert(Quest1.AVATARS.lucNham, 'Phải có avatar Lục Nham');
assert(Quest1.AVATARS.lucNham.includes('Luc_Nham_Truc_Co_So_Ky_Avatar_Duoi10KB.webp'), 'Avatar Lục Nham phải trỏ tới file mới');
assert(Quest1.AVATARS.aHuy, 'Phải có avatar A Huy');
assert(Quest1.AVATARS.aHuy.includes('A_Huy_Avatar_Duoi_10KB.webp'), 'Avatar A Huy phải trỏ tới file mới');

// -------------------------------------------------------------
// TEST 11: Ngủ vào ngày khảo nghiệm linh căn (Day 2 -> Day 3) không bị kẹt
// -------------------------------------------------------------
Quest1.resetState();
Villagers.day = 1;
Villagers.minutes = 480;
Quest1.state = 'registered';
Quest1.registeredDay = 1;

const testPlayer = { ...c.PlayerRoster.tieuPham, x: 220, y: 316, hp: 100, maxHp: 100, dir: 'down', walk: 0 };
c.p = testPlayer;

// Tiến vào nhà
TieuPhamHome.enter(testPlayer);
assert.equal(TieuPhamHome.inside, true, 'Tiểu Phàm phải ở trong nhà');

// Ngày 1 -> Ngày 2: Ngủ bình thường
TieuPhamHome.sleepInBed(testPlayer);
assert.equal(TieuPhamHome.pose, 'sleeping');
// Cập nhật 2.5 giây: Phải tự động thức dậy, không bị kẹt trên giường
for (let step = 0; step < 25; step++) {
  TieuPhamHome.updateInterior(testPlayer, 0.1, false);
}
assert.equal(Villagers.day, 2, 'Sau giấc ngủ ngày 1 phải sang ngày 2');
assert.equal(TieuPhamHome.pose, 'none', 'Tiểu Phàm phải tự động thức dậy sau hiệu ứng ngủ');
assert.equal(testPlayer.x, 532);
assert.equal(testPlayer.y, 232);
assert(TieuPhamHome.canWalk(testPlayer.x, testPlayer.y), 'Vị trí sau khi thức dậy phải bước đi được bình thường');
assert.equal(c.document.getElementById('toast').textContent, '', 'Xóa thông báo khi ngủ dậy ngày 2');

// Ngày 2 -> Ngày 3: NGỦ VÀO NGÀY KHẢO NGHIỆM LINH CĂN
TieuPhamHome.sleepInBed(testPlayer);
assert.equal(TieuPhamHome.pose, 'sleeping');

// Cập nhật trong thời gian ngủ, kiểm tra game loop thế giới & nhiệm vụ
for (let step = 0; step < 25; step++) {
  const worldP = { ...testPlayer, x: 221, y: 314, sprinting: false };
  Quest1.update(0.1, step * 0.1, worldP, Villagers);
  TieuPhamHome.updateInterior(testPlayer, 0.1, false);
}

// Kiểm tra: Đã sang ngày 3 (ngày khảo nghiệm), nhiệm vụ chuyển sang selection_ready
assert.equal(Villagers.day, 3, 'Phải sang Ngày 3 (Ngày khảo nghiệm)');
assert.equal(Quest1.getState(), 'selection_ready', 'Nhiệm vụ 1 phải sẵn sàng khảo nghiệm (selection_ready)');
assert.equal(TieuPhamHome.pose, 'none', 'Tiểu Phàm phải tự động thức dậy đón ngày khảo nghiệm');
assert.equal(testPlayer.x, 532);
assert.equal(testPlayer.y, 232);
assert(TieuPhamHome.canWalk(testPlayer.x, testPlayer.y), 'Tiểu Phàm không bị kẹt trong va chạm giường');

// Kiểm tra khi đang ở Ngày Khảo Nghiệm Linh Căn: Tương tác giường nhắc nhở không ngủ tiếp
TieuPhamHome.sleepInBed(testPlayer);
assert.equal(TieuPhamHome.pose, 'none', 'Ngày khảo nghiệm linh căn không cho ngủ quên kỳ khảo nghiệm');

// Kiểm tra gọi hàm talk() với PointerEvent không làm lệch tọa độ hay kẹt va chạm

c.Villagers.talk({ clientX: 100, clientY: 100 }); // PointerEvent
assert.equal(testPlayer.x, 532, 'Tọa độ người chơi thực không bị ghi đè thành đối tượng sự kiện');
assert.equal(TieuPhamHome.pose, 'none', 'Tiểu Phàm thức dậy an toàn');
assert(TieuPhamHome.canWalk(testPlayer.x, testPlayer.y), 'Tiểu Phàm có thể di chuyển ra khỏi phòng');

// Reopen saved quest state during the exam morning; A Huy must still assemble.
vm.runInContext(fs.readFileSync('public/game/quest1.js', 'utf8')
  .replace('const Quest1 =', 'const ReloadedQuest =') + ';this.reloaded = ReloadedQuest;', c);
c.reloaded.init(Villagers);
assert.equal(c.reloaded.getState(), 'selection_ready');
c.reloaded.update(0.016, 10, testPlayer, Villagers);
assert.equal(TieuPhamHome.pose, 'none');

// Kiểm tra đủ 14 tệp WebP Quan Trắc Thạch tồn tại và được cấu hình trong Quest1
const spriteDefs = Quest1.STONE_SPRITE_DEFS;
assert(spriteDefs, 'Phải có cấu hình STONE_SPRITE_DEFS');
const spriteKeys = Object.keys(spriteDefs);
assert.equal(spriteKeys.length, 14, 'Phải đăng ký đủ 14 sprite WebP của Quan Trắc Thạch');
for (const key of spriteKeys) {
  const fullPath = 'public/game/' + spriteDefs[key].src;
  assert(fs.existsSync(fullPath), 'Tệp sprite WebP Quan Trắc Thạch phải tồn tại: ' + fullPath);
}

// Use the wake-up guidance modal: closes modal, player stays in house and walks out front door to yard (221, 314).
assert.equal(typeof domElements.get('go-square-modal-btn').onclick, 'function');
domElements.get('go-square-modal-btn').onclick();
assert.equal(TieuPhamHome.inside, true, 'Đóng bảng thông báo vẫn đứng trong nhà, tự di chuyển ra cửa');
testPlayer.x = 352;
testPlayer.y = 416;
assert.equal(TieuPhamHome.checkTransition(testPlayer, 0, 1, 0.5), true, 'Người chơi đi bộ qua cửa chính ra map làng');
assert.equal(TieuPhamHome.inside, false);
assert.equal(testPlayer.x, 221, 'Sau khi đi bộ qua cửa, đứng ở sân nhà (221)');
assert.equal(testPlayer.y, 314, 'Sau khi đi bộ qua cửa, đứng ở sân nhà (314)');
assert.equal(Quest1.getState(), 'selection_ready', 'Trạng thái vẫn là selection_ready khi đứng ở sân nhà');

// Người chơi tự đi bộ ra quảng trường làng (680, 568) để tham gia khảo nghiệm
testPlayer.x = 680;
testPlayer.y = 568;
Quest1.update(0.1, 10.1, testPlayer, Villagers);
assert.equal(Quest1.getState(),'cinematic_active');

// -------------------------------------------------------------
// TEST: Sau khi tiên nhân mang A Huy rời đi, dân làng giải tán và trở lại sinh hoạt
// -------------------------------------------------------------
// Giả lập hoàn thành khảo nghiệm & tiễn biệt
Quest1.completeQuest(testPlayer, Villagers);
assert.equal(Quest1.getState(), 'completed', 'Nhiệm vụ 1 phải ở trạng thái completed');
assert.equal(c.AHuy.hidden, true, 'A Huy phải ẩn đi sau khi được tiên nhân mang đi');

// Hoàn tất hội thoại tiễn biệt của Trưởng làng nếu có
let clicks = 0;
while (Quest1.isDialogueActive() && clicks < 10) {
  const dlgBox = domElements.get('quest-dialog');
  if (dlgBox && typeof dlgBox.onclick === 'function') {
    dlgBox.onclick();
  }
  clicks++;
}

// Kiểm tra toàn bộ NPC trong làng: Không ai còn ở trạng thái ceremony hay pause 9999
const ceremonyNPCIds = ['truong', 'an', 'minh', 'tung', 'cuc', 'sen', 'tran', 'binh', 'dao', 'lien', 'ho', 'son', 'ngu', 'hong'];
for (const id of ceremonyNPCIds) {
  const npc = Villagers.list.find((n) => n.id === id);
  assert(npc, 'Phải tìm thấy NPC ' + id);
  assert.notEqual(npc.state, 'ceremony', 'NPC ' + id + ' không được kẹt ở state ceremony');
  assert(npc.pause < 10, 'NPC ' + id + ' không được kẹt pause lớn (pause=' + npc.pause + ')');
  assert.equal(npc.reachingStone, false, 'NPC ' + id + ' không được còn cờ reachingStone');
  assert.equal(npc.showCeremonyName, false, 'NPC ' + id + ' không được còn cờ showCeremonyName');
}

// Chạy một số chu kỳ update của thế giới game
const initialPositions = new Map();
for (const id of ceremonyNPCIds) {
  const npc = Villagers.list.find((n) => n.id === id);
  initialPositions.set(id, { x: npc.x, y: npc.y, routeLen: npc.route.length });
}

for (let tick = 0; tick < 20; tick++) {
  Villagers.update(0.1, tick * 0.1, testPlayer);
  Quest1.update(0.1, tick * 0.1, testPlayer, Villagers);
}

// Kiểm tra các NPC quan trọng đã nhận route và di chuyển khỏi tọa độ quảng trường
let movedCount = 0;
for (const id of ceremonyNPCIds) {
  const npc = Villagers.list.find((n) => n.id === id);
  const initPos = initialPositions.get(id);
  const dist = Math.hypot(npc.x - initPos.x, npc.y - initPos.y);
  if (dist > 0.1 || npc.walk > 0 || initPos.routeLen > 0) {
    movedCount++;
  }
}
assert(movedCount >= 10, 'Phần lớn NPC phải di chuyển hoặc có route rời quảng trường (movedCount=' + movedCount + ')');

// -------------------------------------------------------------
// TEST: Sau khi nhiệm vụ kết thúc, người chơi ra khỏi nhà KHÔNG bị dịch chuyển ra quảng trường
// -------------------------------------------------------------
assert.equal(Quest1.getState(), 'completed');
testPlayer.x = 221;
testPlayer.y = 300;
TieuPhamHome.enter(testPlayer);
assert.equal(TieuPhamHome.inside, true, 'Tiểu Phàm vào nhà sau khi hoàn thành nhiệm vụ');

// Đi ra cửa nhà (x=352, y=418, dy > 0)
testPlayer.x = 352;
testPlayer.y = 418;
const exited = TieuPhamHome.checkTransition(testPlayer, 0, 1, 0.5);
assert.equal(exited, true, 'Phải bước ra khỏi cửa nhà thành công');
assert.equal(TieuPhamHome.inside, false, 'Tiểu Phàm đã ra ngoài sân');
assert.equal(testPlayer.x, 221, 'Tọa độ x sau khi ra nhà phải ở sân trước xóm nhà Tiểu Phàm (221), không được bị dịch chuyển ra quảng trường (680)');
assert.equal(testPlayer.y, 314, 'Tọa độ y sau khi ra nhà phải ở sân trước xóm nhà Tiểu Phàm (314), không được bị dịch chuyển ra quảng trường (568)');

// Thử qua click ngưỡng cửa
TieuPhamHome.enter(testPlayer);
TieuPhamHome.handleCanvasClick(350, 420, testPlayer);
assert.equal(TieuPhamHome.inside, false);
assert.equal(testPlayer.x, 221, 'Nhấp vào ngưỡng cửa ra ngoài phải đứng ở sân nhà (221)');
assert.equal(testPlayer.y, 314, 'Nhấp vào ngưỡng cửa ra ngoài phải đứng ở sân nhà (314)');

// Kiểm tra Quest1.saveState đã được export cho GameSave.save()
assert.equal(typeof Quest1.saveState, 'function', 'Quest1 phải export hàm saveState');

// Kiểm tra bảo vệ lời hẹn A Nguyệt khi đang dẫn nàng đi Vườn Hoa Phía Đông
c.Quest2 = { getState: () => 'ready_to_rest', triggerRestAtHome: () => { throw new Error('Không được kích hoạt ngủ qua đêm khi đang hẹn với A Nguyệt'); } };
c.ANguyetStory = { getStage: () => 'escort' };
TieuPhamHome.enter(testPlayer);
TieuPhamHome.sleepInBed(testPlayer);
assert.equal(TieuPhamHome.pose, 'none', 'Không cho phép ngủ bỏ lỡ cuộc hẹn khi đang dẫn A Nguyệt đi Vườn Hoa');

console.log('PASS: exam morning, saved quest reload, departure from bed to square, complete NPC disbanding, and no square teleport after quest completion');
process.exit(0);

