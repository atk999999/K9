const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// Setup mock browser environment
const storageMap = new Map();
const localStorageMock = {
  getItem: (k) => storageMap.get(k) || null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

const sandbox = {
  console,
  Date,
  Math,
  JSON,
  localStorage: localStorageMock,
  window: {
    addEventListener: () => {}
  },
  document: {
    addEventListener: () => {}
  },
  module: { exports: {} }
};

// Read game-save.js into sandbox
const saveCode = fs.readFileSync('public/game/game-save.js', 'utf8');
vm.createContext(sandbox);
vm.runInContext(saveCode, sandbox);
const GameSave = sandbox.GameSave || sandbox.module.exports;

assert(GameSave, 'GameSave module should be exported');

// Test 1: Save state structure
localStorageMock.clear();
const mockPlayer = {
  x: 500,
  y: 600,
  dir: 'right',
  face: 1,
  hp: 95,
  maxHp: 100,
  mp: 20,
  maxMp: 50,
  realm: 'Luyện Khí Tầng 1',
  level: 2
};

sandbox.Villagers = { day: 2, minutes: 630 };
sandbox.VillageWork = { grain: 40, homeGrain: 14 };
sandbox.TieuPhamHome = { inside: false };
sandbox.TieuPham = { outfitIdx: 1, applyOutfit: (i) => { sandbox.TieuPham.outfitIdx = i; } };
sandbox.Collision = { canWalk: () => true };

const saved = GameSave.save(true, mockPlayer);
assert.strictEqual(saved, true, 'GameSave.save should return true on success');

const raw = localStorageMock.getItem(GameSave.SAVE_KEY);
assert(raw, 'Data should be saved in localStorage under key ' + GameSave.SAVE_KEY);
const parsed = JSON.parse(raw);
assert.strictEqual(parsed.player.x, 500);
assert.strictEqual(parsed.player.y, 600);
assert.strictEqual(parsed.player.hp, 95);
assert.strictEqual(parsed.player.realm, 'Luyện Khí Tầng 1');
assert.strictEqual(parsed.world.day, 2);
assert.strictEqual(parsed.world.minutes, 630);
assert.strictEqual(parsed.world.grain, 40);

// Test 2: Load state restoration
const playerToRestore = { x: 0, y: 0, hp: 100 };
sandbox.Villagers.day = 1;
sandbox.Villagers.minutes = 480;
sandbox.VillageWork.grain = 0;

const restored = GameSave.load(playerToRestore);
assert(restored, 'GameSave.load should return restored object');
assert.strictEqual(playerToRestore.x, 500);
assert.strictEqual(playerToRestore.y, 600);
assert.strictEqual(playerToRestore.hp, 95);
assert.strictEqual(playerToRestore.realm, 'Luyện Khí Tầng 1');
assert.strictEqual(sandbox.Villagers.day, 2);
assert.strictEqual(sandbox.Villagers.minutes, 630);
assert.strictEqual(sandbox.VillageWork.grain, 40);
assert.strictEqual(sandbox.TieuPham.outfitIdx, 1);

// Test 3: Safe fallback on unwalkable coordinate
sandbox.Collision.canWalk = (x, y) => false;
const stuckPlayer = { x: 0, y: 0 };
GameSave.load(stuckPlayer);
assert.strictEqual(stuckPlayer.x, 220, 'Should relocate to safe courtyard spawn if saved coordinate is blocked');
assert.strictEqual(stuckPlayer.y, 316, 'Should relocate to safe courtyard spawn if saved coordinate is blocked');
sandbox.Collision.canWalk = () => true;

// Test 4: Does not save during active cinematic
sandbox.Quest1 = { isCinematicActive: () => true };
const blockedSave = GameSave.save(true, mockPlayer);
assert.strictEqual(blockedSave, false, 'Should not save during active cinematic');
sandbox.Quest1.isCinematicActive = () => false;

// Test 5: Timer update triggers auto-save
let saveCount = 0;
const origSetItem = localStorageMock.setItem;
localStorageMock.setItem = (k, v) => {
  if (k === GameSave.SAVE_KEY) saveCount++;
  origSetItem(k, v);
};
mockPlayer.x = 550; // change position to make state dirty
GameSave.update(1.0, mockPlayer);
assert.strictEqual(saveCount, 0, 'Should not save before interval');
GameSave.update(3.0, mockPlayer);
assert.strictEqual(saveCount, 1, 'Should auto-save after reaching interval');
localStorageMock.setItem = origSetItem;

// Test 6: Corrupted JSON gracefully handled
localStorageMock.setItem(GameSave.SAVE_KEY, '{invalid_json}');
const corruptResult = GameSave.load(mockPlayer);
assert.strictEqual(corruptResult, null, 'Corrupt save data should safely return null without throwing');

// Test 7: Clear save
GameSave.clear();
assert.strictEqual(localStorageMock.getItem(GameSave.SAVE_KEY), null, 'Save should be cleared');

console.log('PASS: GameSave auto-save, interval timer, restoration, and fallback checks.');
