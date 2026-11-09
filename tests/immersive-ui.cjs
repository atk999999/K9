'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '../public/game');
const read = name => fs.readFileSync(path.join(dir, name), 'utf8');
function instrumentedCanvas() {
  let currentLines = 0;
  const stats = { strokes: 0, crackSegments: 0, renderedText: [], saveDepth: 0 };
  const ctx = new Proxy({
    save() { stats.saveDepth++; },
    restore() { stats.saveDepth--; assert(stats.saveDepth >= 0); },
    beginPath() { currentLines = 0; },
    moveTo() {},
    lineTo() { currentLines++; },
    stroke() { stats.strokes++; stats.crackSegments += currentLines; },
    fillText(t) { stats.renderedText.push(String(t)); },
    measureText(t) { return { width: String(t).length * 8 }; },
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; }
  }, { get(obj, key) { return key in obj ? obj[key] : (() => {}); } });
  return { ctx, stats };
}
function makeQuest() {
  const nodes = new Map(), canvas = instrumentedCanvas();
  const node = () => ({ style: {}, hidden: true, textContent: '', appendChild() {}, addEventListener() {} });
  const env = {
    console, document: { getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); }, createElement() { return node(); } },
    localStorage: { getItem() { return null; }, setItem() {} },
    Image: class { set src(v) { this._src = v; } },
    window: {}, setTimeout() {}, clearTimeout() {},
    Villagers: { day: 3, minutes: 480 },
    Quest1: { getState() { return 'completed'; } },
    TieuPhamHome: { inside: true, wakeForQuest() {} }
  };
  vm.createContext(env);
  vm.runInContext(read('quest2-render.js') + '\n' + read('quest2.js'), env);
  const Q = vm.runInContext('Quest2', env);
  const player = { x: 352, y: 392, hp: 100, maxHp: 100, dir: 'up' };
  Q.init();
  assert.equal(Q.triggerRestAtHome(player), true);
  Q.update(2, 2, player, env.Villagers);
  Q.update(2.5, 4.5, player, env.Villagers);
  Q.update(4, 8.5, player, env.Villagers);
  assert.equal(Q.getState(), 'countdown_hide');
  return { Q, player, env, canvas };
}
const t = makeQuest();
const snap = () => {
  t.canvas.stats.crackSegments = 0; t.canvas.stats.strokes = 0; t.canvas.stats.renderedText = [];
  t.Q.drawInHome(t.canvas.ctx, 10);
  assert.equal(t.canvas.stats.saveDepth, 0, 'canvas drawing must balance save/restore');
  return t.canvas.stats.crackSegments;
};
const first = snap();
t.Q.update(0.035, 3, t.player, t.env.Villagers, 3);
assert.equal(t.Q.getState(), 'countdown_hide');
const middle = snap();
t.Q.update(0.035, 7, t.player, t.env.Villagers, 4);
assert.equal(t.Q.getState(), 'countdown_hide');
const late = snap();
assert(first < middle && middle < late, `wall cracks must grow with time: ${first}/${middle}/${late}`);
t.Q.drawHUD(t.canvas.ctx, t.player, 812, 360, 7, 0.035);
assert(!t.canvas.stats.renderedText.some(x => /CHẠY TRỐN:|10(?:\.0)?s|\d+\.\ds/i.test(x)), 'no numeric countdown or timeout overlay');
assert.equal(t.canvas.stats.saveDepth, 0, 'HUD transform stack balanced');
t.Q.update(0.035, 10.2, t.player, t.env.Villagers, 3.05);
assert.equal(t.Q.getState(), 'attack_timeout', '10 seconds still trigger Liệp Ma');
assert.equal(t.Q.isWallBroken(), true);
console.log(`PASS IMM-01: cracks grow at 0/3/7 sec (${first}/${middle}/${late} segments), timeout still triggers breach`);
console.log('PASS IMM-02: no countdown text, balanced canvas scopes');
// Exercise Quest1 result card logic directly, without bypassing the UI code.
const resultNodes = new Map();
const resultEnv = {
  console, window: {}, Image: class {},
  document: { getElementById(id) { if (!resultNodes.has(id)) resultNodes.set(id, { hidden: true, textContent: '', style: {} }); return resultNodes.get(id); } },
  localStorage: { getItem() { return null; }, setItem() {} }
};
vm.createContext(resultEnv);
const source = read('quest1.js').replace('  function hideResultCard() {', '  __TEST_RESULT_CARD__ = showResultCard;\n  function hideResultCard() {');
resultEnv.__TEST_RESULT_CARD__ = null;
vm.runInContext(read('quest1-data.js') + '\n' + read('quest1-render.js') + '\n' + source, resultEnv);
resultEnv.__TEST_RESULT_CARD__({ name: 'Tiểu Phàm', root: 'Kim — Mộc — Thủy — Hỏa — Thổ', type: 'Ngũ Hành Tạp Linh Căn', grade: 'Hạ đẳng' });
assert.equal(resultNodes.get('quest-result-card').hidden, true, 'spiritual-root result must stay hidden');
assert.equal(resultNodes.get('result-root').textContent, 'Kim — Mộc — Thủy — Hỏa — Thổ', 'result data must remain accessible');
assert(/#quest-result-card\s*\{\s*display\s*:\s*none\s*!important/.test(read('style.css')));
console.log('PASS IMM-03: spiritual-root card hidden, result preserved for quest narrative');
const html = read('index.html');
assert(html.includes('quest2.js?v=s9-gait-02') && html.includes('quest1.js?v=story187') && html.includes('a-nguyet-story.js?v=story187') && html.includes('style.css?v=memorialAI20261109'));
console.log('PASS IMM-04: updated game assets cache-busted for AI Studio');
