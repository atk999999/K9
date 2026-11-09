'use strict';
const GameSave = (() => {
  const SAVE_KEY = 'lang_du_lam_game_save_v1';
  const SAVE_INTERVAL = 3.5; // Auto-save silently every 3.5 seconds
  let saveTimer = 0;
  let lastSavedHash = '';
  let storageAvailable = null; // Probe storage only once instead of writing a test key every autosave.

  function isLocalStorageAvailable() {
    if (storageAvailable !== null) return storageAvailable;
    try {
      if (typeof localStorage === 'undefined') return false;
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return (storageAvailable = true);
    } catch (e) {
      return (storageAvailable = false);
    }
  }

  function getSaveState(player) {
    const pl = player || (typeof p !== 'undefined' ? p : null);
    if (!pl) return null;

    const insideHome = (typeof TieuPhamHome !== 'undefined' && !!TieuPhamHome.inside);
    const day = (typeof Villagers !== 'undefined' && typeof Villagers.day === 'number') ? Villagers.day : 1;
    const minutes = (typeof Villagers !== 'undefined' && typeof Villagers.minutes === 'number') ? Math.round(Villagers.minutes) : 480;
    const outfitIdx = (typeof TieuPham !== 'undefined' && typeof TieuPham.outfitIdx === 'number') ? TieuPham.outfitIdx : 0;
    const grain = (typeof VillageWork !== 'undefined' && typeof VillageWork.grain === 'number') ? VillageWork.grain : 36;
    const homeGrain = (typeof VillageWork !== 'undefined' && typeof VillageWork.homeGrain === 'number') ? VillageWork.homeGrain : 12;
    const weatherKind = (typeof Weather !== 'undefined' && Weather.userOverride) ? Weather.userOverride : null;

    return {
      version: 1,
      savedAt: Date.now(),
      player: {
        x: Math.round(pl.x * 10) / 10,
        y: Math.round(pl.y * 10) / 10,
        dir: pl.dir || 'down',
        face: pl.face || 1,
        hp: pl.hp !== undefined ? pl.hp : 100,
        maxHp: pl.maxHp || 100,
        mp: pl.mp !== undefined ? pl.mp : 0,
        maxMp: pl.maxMp || 0,
        realm: pl.realm || 'Phàm Nhân',
        level: pl.level || 1,
        outfitIdx: outfitIdx
      },
      insideHome: insideHome,
      // Saved for migration/diagnostics; the loader resumes in a safe standing
      // location so a sleeping/sitting pose cannot trap the player in furniture.
      homePose: insideHome && typeof TieuPhamHome !== 'undefined' ? TieuPhamHome.pose : 'none',
      world: {
        day: day,
        minutes: minutes,
        grain: grain,
        homeGrain: homeGrain,
        weatherOverride: weatherKind
      }
    };
  }

  function save(force = false, player = null) {
    if (!isLocalStorageAvailable()) return false;
    // Don't save during unskippable cutscenes or before game is initialized
    if (typeof Quest1 !== 'undefined' && Quest1.isCinematicActive && Quest1.isCinematicActive()) {
      return false;
    }

    const state = getSaveState(player);
    if (!state) return false;

    // Check hash to avoid redundant storage writes if nothing changed and not forced
    const { savedAt, ...snapshot } = state;
    const snapshotStr = JSON.stringify(snapshot);
    if (!force && snapshotStr === lastSavedHash) {
      return false;
    }

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      lastSavedHash = snapshotStr;

      // Also ensure Quest1 and Quest2 persist their latest states
      if (typeof Quest1 !== 'undefined' && typeof Quest1.saveState === 'function') {
        try { Quest1.saveState(); } catch (e) {}
      }
      if (typeof Quest2 !== 'undefined' && typeof Quest2.saveState === 'function') {
        try { Quest2.saveState(); } catch (e) {}
      }
      if (typeof Quest3 !== 'undefined' && typeof Quest3.saveState === 'function') {
        try { Quest3.saveState(); } catch (e) {}
      }
      if (typeof ANguyetStory !== 'undefined' && typeof ANguyetStory.saveState === 'function') {
        try { ANguyetStory.saveState(); } catch (e) {}
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function load(player) {
    if (!isLocalStorageAvailable()) return null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1 || !data.player || !data.world) return null;
      const { savedAt, ...snapshot } = data;
      lastSavedHash = JSON.stringify(snapshot);

      const pl = player || (typeof p !== 'undefined' ? p : null);
      if (pl) {
        if (typeof data.player.hp === 'number') pl.hp = data.player.hp;
        if (typeof data.player.maxHp === 'number') pl.maxHp = data.player.maxHp;
        if (typeof data.player.mp === 'number') pl.mp = data.player.mp;
        if (typeof data.player.maxMp === 'number') pl.maxMp = data.player.maxMp;
        if (data.player.realm) pl.realm = data.player.realm;
        if (typeof data.player.level === 'number') pl.level = data.player.level;
        if (data.player.dir) pl.dir = data.player.dir;
        if (data.player.face) pl.face = data.player.face;

        // Restore outfit
        if (typeof TieuPham !== 'undefined' && typeof TieuPham.applyOutfit === 'function' && typeof data.player.outfitIdx === 'number') {
          TieuPham.applyOutfit(data.player.outfitIdx);
        }

        // Restore inside home or world coordinates
        const isInside = !!data.insideHome;
        if (typeof TieuPhamHome !== 'undefined') {
          TieuPhamHome.inside = isInside;
        }

        if (isInside) {
          pl.x = typeof data.player.x === 'number' && Number.isFinite(data.player.x) ? data.player.x : 352;
          pl.y = typeof data.player.y === 'number' && Number.isFinite(data.player.y) ? data.player.y : 388;
          if (typeof TieuPhamHome !== 'undefined' && typeof TieuPhamHome.restoreAfterLoad === 'function') {
            TieuPhamHome.restoreAfterLoad(pl, data.homePose || 'none');
          } else if (typeof TieuPhamHome !== 'undefined' && typeof TieuPhamHome.canWalk === 'function' && !TieuPhamHome.canWalk(pl.x, pl.y)) {
            // Fallback for integration with an older interior module.
            pl.x = 352; pl.y = 392;
          }
        } else {
          let rx = typeof data.player.x === 'number' ? data.player.x : 220;
          let ry = typeof data.player.y === 'number' ? data.player.y : 316;
          // Validate collision so player never spawns stuck inside a building
          if (typeof Collision !== 'undefined' && typeof Collision.canWalk === 'function') {
            if (!Collision.canWalk(rx, ry)) {
              rx = 220; ry = 316;
            }
          }
          pl.x = rx;
          pl.y = ry;
        }
      }

      // Restore world state
      if (typeof Villagers !== 'undefined') {
        if (typeof data.world.day === 'number') Villagers.day = Math.max(1, data.world.day);
        if (typeof data.world.minutes === 'number') Villagers.minutes = Math.max(0, Math.min(1439, data.world.minutes));
      }

      if (typeof VillageWork !== 'undefined') {
        if (typeof data.world.grain === 'number') VillageWork.grain = data.world.grain;
        if (typeof data.world.homeGrain === 'number') VillageWork.homeGrain = data.world.homeGrain;
      }

      if (typeof Weather !== 'undefined' && data.world.weatherOverride && typeof Weather.override === 'function') {
        Weather.override(data.world.weatherOverride);
      }

      return data;
    } catch (err) {
      return null;
    }
  }

  function update(dt, player) {
    saveTimer += dt;
    if (saveTimer >= SAVE_INTERVAL) {
      saveTimer = 0;
      save(false, player);
    }
  }

  function clear() {
    if (!isLocalStorageAvailable()) return;
    try {
      localStorage.removeItem(SAVE_KEY);
      lastSavedHash = '';
    } catch (e) {}
  }

  // Bind browser lifecycle events
  if (typeof window !== 'undefined') {
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('beforeunload', () => save(true));
      window.addEventListener('pagehide', () => save(true));
    }
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') save(true);
      });
    }
  }

  return {
    SAVE_KEY,
    save,
    load,
    update,
    clear,
    getSaveState
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameSave;
}
