'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const gameDir = path.join(__dirname, '../public/game');
const storage = new Map();
const context = {
  console, Math,
  window: { addEventListener() {} },
  localStorage: {
    getItem(key) { return storage.get(key) || null; },
    setItem(key, value) { storage.set(key, String(value)); }
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(gameDir, 'quest3-comic.js'), 'utf8') + '\n' + fs.readFileSync(path.join(gameDir, 'quest3.js'), 'utf8') + '\nthis.quest = Quest3;', context);
const Q = context.quest;
const spot = Q.MEMORIAL_SPOT;
const save = Q.getFlags();
save.quest3_started = true;
save.quest3_blue_ribbon_collected = true;
context.localStorage.setItem(Q.STORAGE_KEY, JSON.stringify(save));
Q.loadState();
const point = d => ({ x: spot.x + d, y: spot.y });
assert.equal(Q.getMemorialFraming(point(215)), null, 'Chưa vào 210 không mở ngắm mộ');
assert.ok(Q.getMemorialFraming(point(205)), 'Bắt đầu ngắm mộ ở 205');
assert.ok(Q.getMemorialFraming(point(230)), 'Đi 230 không nhảy khung ngắm');
assert.ok(Q.getMemorialFraming(point(268)), 'Đi 268 vẫn giữ khung ngắm');
assert.equal(Q.getMemorialFraming(point(270)), null, 'Thoát hẳn ở 270');
assert.equal(Q.getMemorialFraming(point(240)), null, 'Không tự bật lại tại vùng đệm 240');
assert.ok(Q.getMemorialFraming(point(205)), 'Vào lại 205 hoạt động');

const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
const start = game.indexOf('  const graveView = !overview');
const stop = game.indexOf("  if (typeof Quest1 !== 'undefined' && Quest1.getCameraOffset)", start);
assert.ok(start >= 0 && stop > start, 'Phải giữ được đoạn camera đã sửa');
const segment = game.slice(start, stop);
const stepCtx = vm.createContext({
  Math, Quest3: Q, p: point(280), dt: 1 / 60,
  W: 360, H: 800, scale: Math.max(360 / 1200, 800 / 790),
  overview: false, devicePixelRatio: 2,
  smoothCamScale: null, smoothCamFocusX: null, smoothCamFocusY: null,
  camX: 0, camY: 0
});
const step = vm.runInContext(`(function () { ${segment}; return {zoom: worldScale, x: camX, y: camY}; })`, stepCtx);
Q.getMemorialFraming(point(280)); // chắc chắn thoát hẳn trước bài test chuyển cảnh
let a = step();
assert.equal(a.zoom, stepCtx.scale, 'Camera bình thường giữ nguyên zoom gốc');
stepCtx.p = point(205);
let b = step();
assert.ok(b.zoom < a.zoom && b.zoom > stepCtx.W / 590, 'Bắt đầu zoom từ từ, không nhảy tức thời');
assert.ok(Math.abs(b.zoom - a.zoom) < 0.08, 'Zoom một frame không được giật mạnh');
for (let i = 0; i < 135; i++) b = step();
assert.ok(Math.abs(b.zoom - (stepCtx.W / 590)) < 0.002, 'Đạt khung ngắm nghĩa trang sau khoảng 2 giây');
stepCtx.p = point(270);
const c = step();
assert.ok(c.zoom > b.zoom && c.zoom < stepCtx.scale, 'Ra khỏi mộ trở lại khung thường từ từ');
assert.ok(Math.abs(c.zoom - b.zoom) < 0.08, 'Không giật khung lúc rời nghĩa trang');
for (const frame of [a, b, c]) assert.ok([frame.zoom, frame.x, frame.y].every(Number.isFinite));
Q.resetState();
assert.equal(Q.getMemorialFraming(point(205)), null, 'Đặt lại hành trình xóa trạng thái khung ngắm');
console.log('PASS CAMERA: hysteresis 210/270, zoom mượt 60 FPS, rời mộ không giật, reset an toàn.');
