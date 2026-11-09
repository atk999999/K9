'use strict';
/**
 * LÀNG DU LÃM — KHÓI & LỬA TÀN SAU HUYẾT DẠ
 * Canvas only. Không đụng đến collider, Quest2/Quest3 hay đồng hồ.
 * Hiệu ứng xuất hiện từ bình minh, xuyên suốt lúc tìm người và đắp mộ 15:00.
 * Những ngôi mộ không có hiệu ứng lửa để giữ không khí tưởng niệm.
 */
const RuinsAmbientFX = (() => {
  // [world X, world Y, radius, phase, heat] : mái nhà / đống gỗ hư hỏng trên bản đồ.
  const HOTSPOTS = Object.freeze([
    [205, 216, 15, .4, 0.75],      // mái nhà Tiểu Phàm: âm ỉ khói
    [381, 234, 18, 1.6, .90],     // mái nhà bên cạnh
    [754, 121, 22, 2.1, 1.0],     // phía bắc quảng trường
    [240, 455, 15, 3.0, .80],     // nhà phía nam
    [1127, 306, 16, 4.5, .90],
    [950, 637, 19, 2.7, 1.0],
    [1146, 636, 15, 5.3, .85],
    [1675, 715, 18, .8, .92],
    [1990, 711, 18, 1.9, 1.0],
    [2150, 1076, 18, 3.9, .84],
    [2568, 1082, 15, 4.7, .88],
    [2880, 281, 18, 3.3, 1.0]
  ]);

  const PATH_REPAIR = Object.freeze({ x: 144, y: 287, w: 490, h: 124 });
  let homePathCover = null;

  function isActive() {
    return typeof Quest2 !== 'undefined' && Quest2 &&
      typeof Quest2.isVillageRuined === 'function' && !!Quest2.isVillageRuined();
  }

  function isVisible(x, y, margin, viewport) {
    return !viewport || (x + margin >= viewport.x && y + margin >= viewport.y &&
      x - margin <= viewport.x + viewport.w && y - margin <= viewport.y + viewport.h);
  }

  /**
   * Xóa vết máu vẽ sẵn trước nhà Tiểu Phàm KHÔNG sửa file nền:
   * ghép lớp đất/đường sạch lấy ngay trên map gốc cùng tọa độ, giảm sáng
   * cho hợp cảnh hoang tàn rồi làm mềm viền bằng alpha radial.
   * Chỉ tạo 1 lần, dùng ảnh cache nhỏ 490×124; không tính lại mỗi frame.
   */
  function init(pristineMap) {
    if (!pristineMap || !pristineMap.naturalWidth ||
        typeof document === 'undefined' || typeof document.createElement !== 'function') return false;
    const c = document.createElement('canvas');
    c.width = PATH_REPAIR.w;
    c.height = PATH_REPAIR.h;
    const g = c.getContext('2d');
    if (!g || !g.drawImage || !g.createRadialGradient || !g.createLinearGradient) return false;
    const { x, y, w, h } = PATH_REPAIR;
    g.save();
    // Chỉ tạo lại texture con đường, giữ nguyên 100% nhà và địa hình xung quanh.
    g.filter = 'grayscale(76%) sepia(30%) brightness(54%) saturate(65%)';
    g.drawImage(pristineMap, x, y, w, h, 0, 0, w, h);
    g.restore();

    // Hình dạng vết máu trên lối đi trước nhà; chuyển tiếp mờ để không lộ viền.
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w; maskCanvas.height = h;
    const mask = maskCanvas.getContext('2d');
    const marks = [
      [86, 38, 78, 33],
      [158, 59, 94, 29],
      [243, 64, 95, 24],
      [318, 72, 90, 27],
      [378, 88, 85, 25],
      [255, 29, 48, 31]
    ];
    for (const [cx, cy, rx, ry] of marks) {
      mask.save();
      mask.translate(cx, cy);
      mask.scale(1, ry / rx);
      const fill = mask.createRadialGradient(0, 0, 0, 0, 0, rx);
      fill.addColorStop(0, 'rgba(255,255,255,1)');
      fill.addColorStop(.62, 'rgba(255,255,255,1)');
      fill.addColorStop(.82, 'rgba(255,255,255,.90)');
      fill.addColorStop(1, 'rgba(255,255,255,0)');
      mask.fillStyle = fill;
      mask.beginPath();
      mask.arc(0, 0, rx, 0, Math.PI * 2);
      mask.fill();
      mask.restore();
    }
    // Lấy hợp của mọi vùng cần che, không lấy phần giao nhau.
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(maskCanvas, 0, 0);
    g.globalCompositeOperation = 'source-over';
    homePathCover = c;
    return true;
  }

  function drawBloodCleanup(ctx) {
    if (isActive() && homePathCover) ctx.drawImage(homePathCover, PATH_REPAIR.x, PATH_REPAIR.y);
  }

  function intensity() {
    // Sau 06:00 than hồng cháy dần, tới 15:00 vẫn thấy lửa và khói.
    const m = typeof Villagers !== 'undefined' && Number.isFinite(Villagers.minutes)
      ? Villagers.minutes : 900;
    const daylight = Math.max(.52, 1 - Math.max(0, m - 360) / 1750);
    const weather = typeof Weather !== 'undefined' && Weather
      ? (Weather.kind === 'storm' ? .22 : Weather.kind === 'rain' ? .48 : 1)
      : 1;
    return daylight * weather;
  }

  function drawGround(ctx, viewport) {
    if (!isActive()) return;
    const a = intensity();
    ctx.save();
    for (const [x, y, radius, , heat] of HOTSPOTS) {
      if (!isVisible(x, y, radius * 3, viewport)) continue;
      ctx.fillStyle = 'rgba(24,18,15,0.25)';
      ctx.beginPath(); ctx.ellipse(x, y + 4, radius * 1.6, radius * .46, 0, 0, Math.PI * 2); ctx.fill();
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.6);
      glow.addColorStop(0, `rgba(253,110,33,${(a * heat * .25).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(235,53,13,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - radius * 2.6, y - radius * 2.6, radius * 5.2, radius * 5.2);
    }
    ctx.restore();
  }

  function drawFlame(ctx,x,y,r,phase,t,power) {
    if(typeof FireFX!=='undefined') FireFX.draw(ctx,x,y,r,phase,t,power);
  }

  function drawSmoke(ctx,x,y,r,phase,t,heat) {
    const wind=(typeof Weather!=='undefined'&&Weather.kind==='storm')?2.6:1;
    if(typeof FireFX!=='undefined') FireFX.smoke(ctx,x,y,r,phase,t,heat,wind);
  }

  function drawWorld(ctx, seconds, viewport) {
    if (!isActive()) return;
    const power = intensity();
    const t = Number.isFinite(seconds) ? seconds : 0;
    ctx.save();
    for (const [x, y, radius, phase, heat] of HOTSPOTS) {
      if (!isVisible(x, y, radius * 8, viewport)) continue;
      drawFlame(ctx, x, y, radius * heat, phase, t, power);
      drawSmoke(ctx, x, y, radius, phase, t, heat);
      for (let i = 0; i < 3; i++) {
        const age = (t * (17 + i * 3) + phase * 23 + i * 31) % 90;
        const flick = .42 * power * (1 - age / 90);
        ctx.fillStyle = `rgba(255,${143 + i * 27},78,${flick.toFixed(3)})`;
        ctx.fillRect(x + Math.sin(t * 1.8 + phase + i) * (6 + i * 4) + age * .15, y - age - 6, 1.5, 1.5);
      }
    }
    ctx.restore();
  }

  return { HOTSPOTS, PATH_REPAIR, init, isActive, drawBloodCleanup, drawGround, drawWorld };
})();
