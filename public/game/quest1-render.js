'use strict';

/**
 * HỆ THỐNG RENDER QUAN TRẮC THẠCH, LỤC NHAM, PHÁP TRẬN & HUD NHIỆM VỤ 1
 * Tách từ quest1.js để tách biệt logic hiển thị (Canvas 2D & 14 Sprite WebP) với logic nhiệm vụ.
 */
const Quest1Render = (() => {
  const STONE_SPRITE_DEFS = {
    summon: { src: 'quan-trac-thach/01_quan_trac_thach_trieu_hoi.webp', mode: 'summon' },
    float0: { src: 'quan-trac-thach/02_lo_lung_frame_01.webp', mode: 'float' },
    float1: { src: 'quan-trac-thach/03_lo_lung_frame_02.webp', mode: 'float' },
    float2: { src: 'quan-trac-thach/04_lo_lung_frame_03.webp', mode: 'float' },
    float3: { src: 'quan-trac-thach/05_lo_lung_frame_04.webp', mode: 'float' },
    qi0: { src: 'quan-trac-thach/06_linh_khi_frame_01.webp', mode: 'qi' },
    qi1: { src: 'quan-trac-thach/07_linh_khi_frame_02.webp', mode: 'qi' },
    qi2: { src: 'quan-trac-thach/08_linh_khi_frame_03.webp', mode: 'qi' },
    qi3: { src: 'quan-trac-thach/09_linh_khi_frame_04.webp', mode: 'qi' },
    stateIdle: { src: 'quan-trac-thach/10_trang_thai_cho.webp', mode: 'card' },
    stateTesting: { src: 'quan-trac-thach/11_dang_khao_nghiem.webp', mode: 'card' },
    stateNoRoot: { src: 'quan-trac-thach/12_khong_co_linh_can.webp', mode: 'card_dim' },
    stateHasRoot: { src: 'quan-trac-thach/13_co_linh_can.webp', mode: 'card' },
    stateExcellent: { src: 'quan-trac-thach/14_linh_can_xuat_sac.webp', mode: 'card' }
  };

  const stoneSprites = {
    loaded: false,
    images: {},
    cleaned: {}
  };

  let groundDrawnThisFrame = false;

  function cleanStoneSpriteToCanvas(img, _def) {
    if (!img || !img.width || !img.height || typeof document === 'undefined' || !document.createElement) {
      return img;
    }
    try {
      const w = img.width;
      const h = img.height;
      const cvs = document.createElement('canvas');
      if (!cvs || typeof cvs.getContext !== 'function') return img;
      cvs.width = w;
      cvs.height = h;
      const cctx = cvs.getContext('2d');
      if (!cctx || typeof cctx.getImageData !== 'function') return img;
      cctx.drawImage(img, 0, 0);
      return cvs;
    } catch (_e) {
      return img;
    }
  }

  function ensureStoneSpritesLoaded() {
    if (stoneSprites.loaded || typeof Image === 'undefined') return;
    stoneSprites.loaded = true;
    Object.keys(STONE_SPRITE_DEFS).forEach((key) => {
      const def = STONE_SPRITE_DEFS[key];
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        stoneSprites.cleaned[key] = cleanStoneSpriteToCanvas(img, def);
      };
      img.src = def.src;
      stoneSprites.images[key] = img;
    });
  }

  function getStoneDrawable(key) {
    ensureStoneSpritesLoaded();
    if (stoneSprites.cleaned[key]) return stoneSprites.cleaned[key];
    const raw = stoneSprites.images[key];
    if (raw && raw.complete && raw.naturalWidth > 0) {
      stoneSprites.cleaned[key] = cleanStoneSpriteToCanvas(raw, STONE_SPRITE_DEFS[key] || {});
      return stoneSprites.cleaned[key];
    }
    return null;
  }

  function drawCenteredSprite(ctx, drawable, cx, cy, targetW, targetH, alpha = 1) {
    if (!drawable || alpha <= 0) return false;
    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
    if ('imageSmoothingEnabled' in ctx) {
      ctx.imageSmoothingEnabled = false;
    }
    ctx.drawImage(
      drawable,
      Math.round(cx - targetW / 2),
      Math.round(cy - targetH / 2),
      Math.round(targetW),
      Math.round(targetH)
    );
    ctx.restore();
    return true;
  }

  function drawOrbitalQiHalf(ctx, cx, cy, scale, t, stState, activeRoot, alpha, isFront, STONE_STATES) {
    if (stState === STONE_STATES.NO_ROOT || alpha <= 0) return;
    ctx.save();
    const isActive = stState === STONE_STATES.TESTING || stState === STONE_STATES.HAS_ROOT;
    const speed = stState === STONE_STATES.HAS_ROOT ? 3.8 : stState === STONE_STATES.TESTING ? 3.0 : 1.45;
    const ribbonCount = isActive ? 3 : 2;
    const baseAlpha = alpha * (isActive ? 0.92 : 0.48);

    const palette =
      stState === STONE_STATES.HAS_ROOT && activeRoot === 'tam_linh_can'
        ? ['#ff6b6b', '#ffd166', '#4da6ff']
        : stState === STONE_STATES.HAS_ROOT && activeRoot === 'ngu_tap_can'
          ? ['#f5d76e', '#5cd65c', '#4da6ff', '#ff6b6b', '#d9a76a']
          : stState === STONE_STATES.TESTING
            ? ['#7df9ff', '#ffe066', '#9ef8d2']
            : ['#7df9ff', '#b8f2e6'];

    for (let r = 0; r < ribbonCount; r++) {
      const tilt = (r % 2 === 0 ? 1 : -1) * (0.22 + r * 0.08);
      const rx = (22 + r * 5) * scale;
      const ry = (8.5 + r * 2) * scale;
      const yOffset = (r - (ribbonCount - 1) * 0.5) * 8 * scale;
      const phase = t * speed * (r % 2 === 0 ? 1 : -0.85) + (r * Math.PI * 2) / ribbonCount;
      const col = palette[r % palette.length];

      ctx.save();
      ctx.translate(cx, cy + yOffset);
      ctx.rotate(tilt);

      const steps = 16;
      for (let s = 0; s < steps; s++) {
        const tailFrac = s / steps;
        const ang = phase - tailFrac * 2.15;
        const sinA = Math.sin(ang);
        if (isFront ? sinA < -0.05 : sinA >= 0.05) continue;

        const px = Math.cos(ang) * rx;
        const py = sinA * ry;
        const segAlpha = baseAlpha * (1 - tailFrac * 0.82) * (isFront ? 0.95 : 0.62);
        if (segAlpha <= 0.02) continue;

        ctx.globalAlpha = segAlpha;
        ctx.fillStyle = s < 2 ? '#ffffff' : col;
        const dotSize = Math.max(1.4, (1 - tailFrac * 0.55) * (isActive ? 3.4 : 2.3) * scale);
        ctx.fillRect(Math.round(px - dotSize / 2), Math.round(py - dotSize / 2), Math.round(dotSize), Math.round(dotSize));
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawObservationStoneAndFX(ctx, t, rt) {
    const { STONE_POS, TEST_STAND_POS, STONE_STATES, observationStone } = rt;
    ctx.save();
    const sx = STONE_POS.x;
    const sy = STONE_POS.y;
    const sz = observationStone.z || 0;
    const scale = observationStone.scale || 1;
    const stState = observationStone.state || STONE_STATES.IDLE;

    const floatAmp =
      stState === STONE_STATES.NO_ROOT
        ? 1.4
        : stState === STONE_STATES.TESTING || stState === STONE_STATES.HAS_ROOT
          ? 4.0
          : 2.8;
    const floatSpeed = stState === STONE_STATES.TESTING || stState === STONE_STATES.HAS_ROOT ? 3.6 : 2.4;
    const floatBob = Math.sin(t * floatSpeed) * floatAmp + (stState === STONE_STATES.NO_ROOT ? 3 : 0);

    const centerX = sx + (observationStone.rumble ? Math.sin(t * 48) * observationStone.rumble : 0);
    const centerY = sy - 34 - sz + floatBob;

    if (observationStone.beamAlpha > 0 || sz > 0 || stState === STONE_STATES.HAS_ROOT) {
      const bAlpha =
        stState === STONE_STATES.HAS_ROOT
          ? 0.38 + 0.16 * Math.sin(t * 7)
          : Math.max(observationStone.beamAlpha, sz / 160) * 0.82;
      const beamGrad = ctx.createLinearGradient(sx, centerY - 210, sx, sy + 10);
      if (stState === STONE_STATES.HAS_ROOT && observationStone.activeRoot === 'tam_linh_can') {
        beamGrad.addColorStop(0, 'rgba(255, 230, 120, 0)');
        beamGrad.addColorStop(0.5, `rgba(255, 215, 100, ${(bAlpha * 0.5).toFixed(2)})`);
        beamGrad.addColorStop(1, `rgba(255, 248, 195, ${(bAlpha * 0.85).toFixed(2)})`);
      } else {
        beamGrad.addColorStop(0, 'rgba(180, 255, 245, 0)');
        beamGrad.addColorStop(0.45, `rgba(110, 235, 225, ${(bAlpha * 0.55).toFixed(2)})`);
        beamGrad.addColorStop(1, `rgba(215, 255, 250, ${(bAlpha * 0.85).toFixed(2)})`);
      }
      ctx.fillStyle = beamGrad;
      ctx.fillRect(sx - 20, centerY - 200, 40, Math.max(120, sy + 10 - (centerY - 200)));

      for (let i = 0; i < 6; i++) {
        const dropY = centerY - 170 + ((t * 110 + i * 32) % 185);
        const dropX = sx + Math.sin(i * 2.1 + t * 3) * 12;
        ctx.fillStyle = i % 2 === 0 ? `rgba(255, 248, 185, ${bAlpha})` : `rgba(155, 255, 250, ${bAlpha})`;
        ctx.fillRect(Math.round(dropX) - 1, Math.round(dropY) - 4, 2, 8);
      }
    }

    drawOrbitalQiHalf(ctx, centerX, centerY, scale, t, stState, observationStone.activeRoot, observationStone.alpha, false, STONE_STATES);

    const floatFrameIdx = Math.floor((t * 1000) / 200) % 4;
    const floatSprite = getStoneDrawable('float' + floatFrameIdx) || getStoneDrawable('float0');
    const qiSpriteA = getStoneDrawable('qi0');
    const qiSpriteB = getStoneDrawable('qi1') || qiSpriteA;

    let drewWebPSprite = false;

    if (sz > 4 || observationStone.activeRoot === 'five_intro') {
      const summonSprite = getStoneDrawable('summon');
      if (summonSprite) {
        drewWebPSprite = drawCenteredSprite(ctx, summonSprite, centerX, centerY, 88 * scale, 98 * scale, observationStone.alpha);
      }
    } else if (stState === STONE_STATES.IDLE || stState === STONE_STATES.RESET) {
      const idleSprite = getStoneDrawable('stateIdle');
      const breatheAlpha = stState === STONE_STATES.RESET ? 0.82 : 0.92 + 0.08 * Math.sin(t * 2.8);
      if (idleSprite) {
        drewWebPSprite = drawCenteredSprite(ctx, idleSprite, centerX, centerY, 56 * scale, 78 * scale, observationStone.alpha * breatheAlpha);
      } else if (floatSprite) {
        drewWebPSprite = drawCenteredSprite(ctx, floatSprite, centerX, centerY, 36 * scale, 64 * scale, observationStone.alpha * breatheAlpha);
      }
    } else if (stState === STONE_STATES.TESTING) {
      const testingSprite = getStoneDrawable('stateTesting') || floatSprite;
      if (testingSprite) {
        drewWebPSprite = drawCenteredSprite(ctx, testingSprite, centerX, centerY, 60 * scale, 84 * scale, observationStone.alpha);
      }
    } else if (stState === STONE_STATES.NO_ROOT) {
      const noRootSprite = getStoneDrawable('stateNoRoot');
      const dimProgress = Math.min(1, observationStone.stateTimer / 0.85);
      if (noRootSprite) {
        drewWebPSprite = drawCenteredSprite(ctx, noRootSprite, centerX, centerY + 1, 54 * scale, 76 * scale, observationStone.alpha * (1 - dimProgress * 0.15));
      }
    } else if (stState === STONE_STATES.HAS_ROOT) {
      const summonSprite = getStoneDrawable('summon');
      const hasRootSprite = getStoneDrawable('stateHasRoot');
      const excellentSprite = getStoneDrawable('stateExcellent');

      if (observationStone.activeRoot === 'tam_linh_can') {
        if (summonSprite) {
          drawCenteredSprite(ctx, summonSprite, centerX, centerY, 92 * scale, 102 * scale, observationStone.alpha * (0.45 + 0.2 * Math.sin(t * 8)));
        }
        const mainRootSprite = excellentSprite || hasRootSprite;
        if (mainRootSprite) {
          drewWebPSprite = drawCenteredSprite(ctx, mainRootSprite, centerX, centerY, 64 * scale, 88 * scale, observationStone.alpha);
        }
      } else {
        const cycle = Math.floor(t * 6) % 3;
        const primarySprite =
          cycle === 0
            ? hasRootSprite
            : cycle === 1
              ? getStoneDrawable('stateTesting') || hasRootSprite
              : excellentSprite || hasRootSprite;
        if (primarySprite) {
          drewWebPSprite = drawCenteredSprite(ctx, primarySprite, centerX, centerY, 60 * scale, 84 * scale, observationStone.alpha);
        }
      }
    }

    if (!drewWebPSprite) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);

      ctx.fillStyle = stState === STONE_STATES.NO_ROOT ? '#3b4a5e' : '#1b5e7a';
      ctx.strokeStyle =
        stState === STONE_STATES.NO_ROOT
          ? '#7c8ba1'
          : stState === STONE_STATES.HAS_ROOT
            ? '#ffe066'
            : '#7df9ff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(16, 0);
      ctx.lineTo(0, 28);
      ctx.lineTo(-16, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = stState === STONE_STATES.NO_ROOT ? 'rgba(140, 160, 185, 0.35)' : 'rgba(185, 245, 255, 0.45)';
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(-16, 0);
      ctx.lineTo(0, 28);
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle =
        stState === STONE_STATES.NO_ROOT
          ? 'rgba(155, 170, 185, 0.38)'
          : stState === STONE_STATES.HAS_ROOT
            ? '#fff3a1'
            : '#fef08a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(2, -11);
      ctx.bezierCurveTo(-7, -5, 7, 4, -2, 11);
      ctx.stroke();
      ctx.restore();
    }

    if (stState === STONE_STATES.TESTING || stState === STONE_STATES.HAS_ROOT || sz > 4) {
      const activeQi = Math.floor(t * 8) % 2 === 0 ? qiSpriteA : qiSpriteB;
      if (activeQi) {
        ctx.save();
        ctx.translate(centerX, centerY + 2);
        ctx.rotate(Math.sin(t * 5) * 0.18);
        drawCenteredSprite(ctx, activeQi, 0, 0, 58 * scale, 50 * scale, observationStone.alpha * (stState === STONE_STATES.HAS_ROOT ? 0.92 : 0.82));
        ctx.restore();
      }
    }

    drawOrbitalQiHalf(ctx, centerX, centerY, scale, t, stState, observationStone.activeRoot, observationStone.alpha, true, STONE_STATES);

    if (stState === STONE_STATES.TESTING || stState === STONE_STATES.HAS_ROOT) {
      ctx.save();
      const handX = TEST_STAND_POS.x + 8;
      const handY = TEST_STAND_POS.y - 34;
      const stoneTipY = centerY + 22 * scale;

      const linkGrad = ctx.createLinearGradient(handX, handY, centerX, stoneTipY);
      const linkCol =
        stState === STONE_STATES.HAS_ROOT && observationStone.activeRoot === 'tam_linh_can'
          ? 'rgba(255, 224, 102, 0.88)'
          : 'rgba(135, 255, 240, 0.88)';
      linkGrad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
      linkGrad.addColorStop(0.5, linkCol);
      linkGrad.addColorStop(1, 'rgba(255, 245, 160, 0.95)');

      ctx.strokeStyle = linkGrad;
      ctx.lineWidth = 2.0 + Math.sin(t * 14) * 0.5;
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.quadraticCurveTo(
        (handX + centerX) * 0.5 + Math.sin(t * 12) * 4,
        (handY + stoneTipY) * 0.5,
        centerX,
        stoneTipY
      );
      ctx.stroke();

      for (let pIdx = 0; pIdx < 3; pIdx++) {
        const prog = (t * 2.5 + pIdx * 0.33) % 1;
        const px = handX + (centerX - handX) * prog + Math.sin(prog * Math.PI * 2 + t * 10) * 2.5;
        const py = handY + (stoneTipY - handY) * prog;
        ctx.fillStyle = pIdx % 2 === 0 ? '#ffffff' : '#ffe885';
        ctx.fillRect(Math.round(px) - 1.5, Math.round(py) - 1.5, 3, 3);
      }
      ctx.restore();
    }

    if (stState !== STONE_STATES.NO_ROOT) {
      ctx.save();
      const starCount = stState === STONE_STATES.HAS_ROOT ? 8 : stState === STONE_STATES.TESTING ? 6 : 4;
      for (let i = 0; i < starCount; i++) {
        const ang = t * (stState === STONE_STATES.IDLE ? 1.2 : 2.5) + (i * Math.PI * 2) / starCount;
        const radX = (20 + (i % 2) * 7) * scale;
        const radY = (24 + (i % 3) * 5) * scale;
        const spX = Math.round(centerX + Math.cos(ang) * radX);
        const spY = Math.round(centerY + Math.sin(ang * 1.3) * radY);
        const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(t * 5 + i * 1.7));

        ctx.globalAlpha = observationStone.alpha * twinkle;
        ctx.fillStyle =
          stState === STONE_STATES.HAS_ROOT && observationStone.activeRoot === 'tam_linh_can'
            ? i % 2 === 0 ? '#fff7b2' : '#ffd147'
            : i % 2 === 0 ? '#dffcff' : '#fff3a6';
        ctx.fillRect(spX - 1, spY - 3, 2, 6);
        ctx.fillRect(spX - 3, spY - 1, 6, 2);
      }
      ctx.restore();
    } else if (observationStone.stateTimer < 1.2) {
      ctx.save();
      const fade = Math.max(0, 1 - observationStone.stateTimer / 1.1);
      ctx.globalAlpha = observationStone.alpha * fade * 0.65;
      ctx.fillStyle = '#94a3b8';
      for (let i = 0; i < 4; i++) {
        const fx = Math.round(centerX + Math.sin(i * 2.3) * 14);
        const fy = Math.round(centerY - 6 + i * 8 + observationStone.stateTimer * 20);
        ctx.fillRect(fx - 1, fy - 2, 2, 4);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  function drawLucNham(ctx, t, lucNhamEntity) {
    ctx.save();
    const lx = lucNhamEntity.x;
    const ly = lucNhamEntity.y - (lucNhamEntity.z || 0);

    ctx.translate(lx, ly);

    if (!lucNhamEntity.swordSheathed) {
      ctx.save();
      const sScale = lucNhamEntity.swordScale || 1;
      ctx.scale(sScale, sScale);

      ctx.shadowColor = '#50e3c2';
      ctx.shadowBlur = 14;

      ctx.fillStyle = '#e8f7f5';
      ctx.strokeStyle = '#4ee1a0';
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      ctx.moveTo(-28, 22);
      ctx.lineTo(28, 22);
      ctx.lineTo(36, 24);
      ctx.lineTo(0, 28);
      ctx.lineTo(-36, 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#2c5a4d';
      ctx.fillRect(-5, 22, 10, 4);
      ctx.fillStyle = '#a8ffeb';
      ctx.beginPath();
      ctx.arc(0, 24, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    if (lucNhamEntity.mode === 'fly_in' || lucNhamEntity.mode === 'fly_away' || lucNhamEntity.casting) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, 32, 44, 0, 0, Math.PI * 2);
      ctx.strokeStyle = lucNhamEntity.casting ? 'rgba(170, 255, 230, 0.72)' : 'rgba(120, 245, 220, 0.45)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    }

    if (typeof SharedBody !== 'undefined' && SharedBody.draw) {
      SharedBody.draw(ctx, { x: 0, y: 0, dir: lucNhamEntity.dir || 'down', walk: lucNhamEntity.walk || 0 }, t, 'luc_nham');
    } else {
      const wind = Math.sin(t * 3.4) * (lucNhamEntity.z > 0 ? 3.2 : 1.3);
      const castRaise = lucNhamEntity.casting ? -10 + Math.sin(t * 10) * 3 : 0;
      const panel = (points, fill, edge) => {
        ctx.beginPath();
        points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (edge) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = edge;
          ctx.stroke();
        }
      };
      ctx.save();
      ctx.translate(-1, -20);
      ctx.rotate(0.57);
      ctx.fillStyle = '#233b38';
      ctx.fillRect(-3, -27, 6, 62);
      ctx.fillStyle = '#a9ac86';
      ctx.fillRect(-3, 31, 6, 4);
      ctx.fillStyle = '#677e70';
      ctx.fillRect(-1, -25, 1.5, 56);
      ctx.fillStyle = '#d2b77c';
      ctx.fillRect(-7, -28, 14, 3);
      ctx.fillStyle = '#354d49';
      ctx.fillRect(-2, -42, 4, 14);
      ctx.fillStyle = '#dbcb9c';
      for (let i = 0; i < 3; i++) ctx.fillRect(-2, -39 + i * 4, 4, 1);
      ctx.fillRect(-3, -44, 6, 3);
      ctx.restore();

      panel([[-9, -16], [9, -16], [16 + wind, 18], [7 + wind, 21], [-1, 19], [-14 + wind, 21]], '#84927c', '#3e5149');
      panel([[-5, -16], [4, -15], [8 + wind, 17], [-3, 19], [-8, 16]], '#ede8d8');
      panel([[5, -17], [11, -16], [15 + wind, 18], [10 + wind, 20]], '#60756a');
      panel([[-9, -17], [-13, -16], [-19 + wind, 4], [-12 + wind, 8], [-4, -8]], '#98a48b', '#52655a');
      panel([[11, -17], [15, -14], [18 + wind, castRaise], [12, 4 + castRaise], [7, -6]], '#9eac93', '#52655a');
      ctx.fillStyle = '#eff0dd';
      ctx.fillRect(-16 + wind, 4, 7, 2);
      ctx.fillRect(12 + wind, castRaise, 6, 2);

      if (typeof avatarLuc !== 'undefined' && avatarLuc.complete && avatarLuc.naturalWidth) {
        ctx.drawImage(avatarLuc, -17, -51, 34, 34);
      }
      panel([[-8, -18], [1, -12], [8, -18], [9, -16], [0, -8], [-9, -15]], '#f1edde');
      panel([[-9, -9], [10, -9], [10, -5], [-10, -5]], '#455f56');
      ctx.fillStyle = '#b9a97e';
      ctx.fillRect(-1, -9, 4, 3);
      ctx.strokeStyle = '#d4d6bb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, 3);
      ctx.bezierCurveTo(19, 6, 8, 13, 7, 9);
      ctx.bezierCurveTo(6, 5, 14, 8, 10, 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-7, -16);
      ctx.lineTo(7, -6);
      ctx.strokeStyle = '#857857';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (lucNhamEntity.z <= 5) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 10px system-ui';
      const label = 'Tiên sư Lục Nham';
      const w = ctx.measureText(label).width + 12;
      ctx.fillStyle = '#132a24dd';
      ctx.fillRect(-w / 2, -68, w, 15);
      ctx.fillStyle = '#a8ffeb';
      ctx.fillText(label, 0, -57);
    }

    ctx.restore();
  }

  function drawGround(ctx, t, rt) {
    if (!ctx) return;
    groundDrawnThisFrame = true;
    const { SQUARE_CENTER, TEST_STAND_POS, STONE_STATES, observationStone, shockwave, dustParticles, cinematicStep, stepSubPhase, lucNhamEntity } = rt;

    if (observationStone.visible && observationStone.alpha > 0) {
      const lx = SQUARE_CENTER.x;
      const ly = SQUARE_CENTER.y;
      const sz = observationStone.z || 0;
      const scale = observationStone.scale || 1;
      const stState = observationStone.state || STONE_STATES.IDLE;
      const floatAmp =
        stState === STONE_STATES.NO_ROOT
          ? 1.4
          : stState === STONE_STATES.TESTING || stState === STONE_STATES.HAS_ROOT
            ? 4.0
            : 2.8;
      const floatSpeed = stState === STONE_STATES.TESTING || stState === STONE_STATES.HAS_ROOT ? 3.6 : 2.4;
      const floatBob = Math.sin(t * floatSpeed) * floatAmp + (stState === STONE_STATES.NO_ROOT ? 3 : 0);

      if (sz <= 65) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.scale(1, 0.62);

        const groundFactor = Math.max(0, Math.min(1, (1 - sz / 75) * observationStone.alpha));
        const rotSpeed =
          stState === STONE_STATES.TESTING
            ? 1.85
            : stState === STONE_STATES.HAS_ROOT
              ? 2.65
              : stState === STONE_STATES.NO_ROOT
                ? 0.22
                : 0.62;

        let outerCol = 'rgba(110, 240, 225, 0.58)';
        let innerCol = 'rgba(250, 230, 145, 0.52)';
        let coreCol = 'rgba(165, 255, 240, 0.36)';
        if (stState === STONE_STATES.TESTING) {
          outerCol = 'rgba(255, 230, 125, 0.88)';
          innerCol = 'rgba(125, 250, 245, 0.85)';
          coreCol = 'rgba(255, 245, 190, 0.55)';
        } else if (stState === STONE_STATES.NO_ROOT) {
          const fade = Math.max(0.12, 0.52 - observationStone.stateTimer * 0.38);
          outerCol = `rgba(148, 163, 178, ${fade.toFixed(2)})`;
          innerCol = `rgba(120, 132, 145, ${(fade * 0.8).toFixed(2)})`;
          coreCol = `rgba(100, 115, 128, ${(fade * 0.45).toFixed(2)})`;
        } else if (stState === STONE_STATES.HAS_ROOT) {
          outerCol = observationStone.activeRoot === 'tam_linh_can' ? 'rgba(255, 218, 90, 0.94)' : 'rgba(125, 255, 190, 0.9)';
          innerCol = 'rgba(255, 248, 195, 0.92)';
          coreCol = observationStone.activeRoot === 'tam_linh_can' ? 'rgba(255, 195, 75, 0.62)' : 'rgba(140, 255, 215, 0.56)';
        } else if (stState === STONE_STATES.RESET) {
          outerCol = 'rgba(110, 215, 200, 0.42)';
          innerCol = 'rgba(220, 208, 140, 0.36)';
          coreCol = 'rgba(110, 215, 200, 0.22)';
        }

        ctx.globalAlpha = groundFactor;

        const groundGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, 56 * scale);
        groundGlow.addColorStop(0, coreCol);
        groundGlow.addColorStop(0.55, outerCol);
        groundGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = groundGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 56 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.rotate(t * rotSpeed);
        const outerR = 46 * scale;
        ctx.strokeStyle = outerCol;
        ctx.lineWidth = stState === STONE_STATES.HAS_ROOT || stState === STONE_STATES.TESTING ? 2.2 : 1.6;
        for (let seg = 0; seg < 8; seg++) {
          const a0 = (seg * Math.PI) / 4 + 0.07;
          const a1 = ((seg + 1) * Math.PI) / 4 - 0.07;
          ctx.beginPath();
          ctx.arc(0, 0, outerR, a0, a1);
          ctx.stroke();
        }
        for (let k = 0; k < 8; k++) {
          const ang = (k * Math.PI) / 4;
          const nx = Math.cos(ang) * outerR;
          const ny = Math.sin(ang) * outerR;
          ctx.save();
          ctx.translate(nx, ny);
          ctx.rotate(ang + Math.PI / 4);
          ctx.fillStyle = k % 2 === 0 ? innerCol : outerCol;
          ctx.fillRect(-2.5, -2.5, 5, 5);
          ctx.restore();
        }
        ctx.restore();

        ctx.save();
        ctx.rotate(-t * rotSpeed * 1.35);
        const midR = 32 * scale;
        ctx.strokeStyle = innerCol;
        ctx.lineWidth = 1.5;
        for (let seg = 0; seg < 12; seg++) {
          const a0 = (seg * Math.PI) / 6 + 0.08;
          const a1 = ((seg + 1) * Math.PI) / 6 - 0.08;
          ctx.beginPath();
          ctx.arc(0, 0, midR, a0, a1);
          ctx.stroke();
        }
        for (let k = 0; k < 4; k++) {
          const ang = (k * Math.PI) / 2;
          const nx = Math.cos(ang) * midR;
          const ny = Math.sin(ang) * midR;
          ctx.fillStyle = '#fff9d2';
          ctx.beginPath();
          ctx.arc(nx, ny, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        ctx.save();
        ctx.rotate(t * rotSpeed * 1.9);
        const innerR = 19 * scale;
        ctx.strokeStyle = outerCol;
        ctx.lineWidth = 1.2;
        for (let seg = 0; seg < 4; seg++) {
          const a0 = (seg * Math.PI) / 2 + 0.16;
          const a1 = ((seg + 1) * Math.PI) / 2 - 0.16;
          ctx.beginPath();
          ctx.arc(0, 0, innerR, a0, a1);
          ctx.stroke();
        }
        ctx.restore();

        ctx.restore();
      }

      ctx.save();
      ctx.translate(lx, ly);
      ctx.scale(1, 0.52);
      const shadowScale = Math.max(0.38, 1 - sz / 240 - floatBob * 0.014);
      ctx.fillStyle = stState === STONE_STATES.HAS_ROOT ? 'rgba(16, 38, 30, 0.34)' : 'rgba(10, 22, 26, 0.44)';
      ctx.beginPath();
      ctx.arc(0, 0, 14 * scale * shadowScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (shockwave.active && shockwave.alpha > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(shockwave.x, shockwave.y, shockwave.radius, shockwave.radius * 0.58, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(125, 249, 255, ${shockwave.alpha * 0.85})`;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(shockwave.x, shockwave.y, shockwave.radius * 0.65, shockwave.radius * 0.38, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(229, 255, 240, ${shockwave.alpha * 0.65})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    }

    if (dustParticles.length) {
      ctx.save();
      dustParticles.forEach((dp) => {
        ctx.fillStyle = `rgba(212, 190, 145, ${dp.alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(dp.x, dp.y, dp.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    if (cinematicStep === 6 && (stepSubPhase === 'player_walk' || stepSubPhase === 'await_touch')) {
      ctx.save();
      const pulse = 0.65 + 0.35 * Math.sin(t * 5);
      ctx.translate(TEST_STAND_POS.x, TEST_STAND_POS.y);
      ctx.scale(1, 0.55);
      const r = 17 + Math.sin(t * 4) * 1.8;
      ctx.strokeStyle = `rgba(255, 224, 102, ${pulse})`;
      ctx.lineWidth = 2.0;
      for (let seg = 0; seg < 8; seg++) {
        ctx.beginPath();
        ctx.arc(0, 0, r, (seg * Math.PI) / 4 + 0.08, ((seg + 1) * Math.PI) / 4 - 0.08);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (lucNhamEntity.visible && lucNhamEntity.z > 0) {
      ctx.save();
      ctx.translate(lucNhamEntity.x, lucNhamEntity.y + 12);
      ctx.scale(1, 0.4);
      ctx.beginPath();
      const shadowAlpha = Math.max(0.12, 0.5 - lucNhamEntity.z / 600);
      ctx.fillStyle = `rgba(15, 30, 22, ${shadowAlpha})`;
      ctx.arc(0, 0, 24 * (1 - lucNhamEntity.z / 800), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawWorld(ctx, t, rt) {
    if (!groundDrawnThisFrame) {
      drawGround(ctx, t, rt);
    }
    groundDrawnThisFrame = false;

    const { STATES, STONE_POS, questData, dialogueActive, cachedChief, observationStone, spiritualPillars, chaoticMotes, swordTrail, lucNhamEntity } = rt;

    if (cachedChief && !cachedChief.hidden) {
      const showExclamation =
        questData.state === STATES.CHIEF_APPROACHING ||
        questData.state === STATES.CONSIDERING ||
        questData.state === STATES.DECLINED ||
        questData.state === STATES.SELECTION_READY;

      if (showExclamation) {
        ctx.save();
        const x = Math.round(cachedChief.x);
        const bounce = Math.sin(t * 4.5) * 3.5;
        const y = Math.round(cachedChief.y - 88 + bounce);

        const glow = ctx.createRadialGradient(x, y, 2, x, y, 16);
        glow.addColorStop(0, 'rgba(255, 225, 90, 0.7)');
        glow.addColorStop(0.6, 'rgba(218, 165, 32, 0.35)');
        glow.addColorStop(1, 'rgba(218, 165, 32, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 10.5, 0, Math.PI * 2);
        ctx.fillStyle = '#b8860b';
        ctx.fill();
        ctx.strokeStyle = '#fff2a8';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = '#142a1f';
        ctx.fill();

        ctx.font = 'bold 12px "Noto Serif", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffe266';
        ctx.fillText('!', x, y);
        ctx.restore();
      }

      if (
        questData.state === STATES.CHIEF_APPROACHING &&
        questData.approachDelay <= 0 &&
        !dialogueActive &&
        cachedChief.spokenLine
      ) {
        ctx.save();
        ctx.font = 'italic 10.5px "Noto Serif", Georgia, serif';
        const text = cachedChief.spokenLine;
        const bw = ctx.measureText(text).width + 16;
        const cx = Math.round(cachedChief.x);
        const cy = Math.round(cachedChief.y - 105);
        ctx.fillStyle = '#13281fe8';
        ctx.fillRect(cx - bw / 2, cy - 8, bw, 18);
        ctx.strokeStyle = '#d6c384cc';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - bw / 2, cy - 8, bw, 18);
        ctx.fillStyle = '#f7e9bc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, cx, cy + 1);
        ctx.restore();
      }
    }

    if (observationStone.visible && observationStone.alpha > 0) {
      drawObservationStoneAndFX(ctx, t, rt);
    }

    if (spiritualPillars.length) {
      ctx.save();
      spiritualPillars.forEach((col, idx) => {
        const py = STONE_POS.y - 22;
        const pulseW = 15 + Math.sin(t * 9 + idx * 1.7) * 2.5;
        const grad = ctx.createLinearGradient(col.x, py, col.x, py - col.height);
        grad.addColorStop(0, col.glow);
        grad.addColorStop(0.45, col.color);
        grad.addColorStop(0.85, '#fffbe6');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(Math.round(col.x - pulseW / 2), Math.round(py - col.height), Math.round(pulseW), Math.round(col.height));

        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.fillRect(Math.round(col.x - 2), Math.round(py - col.height * 0.92), 4, Math.round(col.height * 0.88));

        ctx.beginPath();
        ctx.ellipse(col.x, py, 10 + Math.sin(t * 7 + idx) * 2, 4.2, 0, 0, Math.PI * 2);
        ctx.strokeStyle = col.color;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        for (let k = 0; k < 4; k++) {
          const sparkY = py - ((t * 52 + k * 24 + idx * 11) % Math.max(1, col.height));
          const sparkX = col.x + Math.sin(t * 8 + k * 1.9 + idx) * 6;
          ctx.fillStyle = k % 2 === 0 ? '#ffffff' : col.color;
          ctx.fillRect(Math.round(sparkX) - 1, Math.round(sparkY) - 3, 2, 6);
          ctx.fillRect(Math.round(sparkX) - 3, Math.round(sparkY) - 1, 6, 2);
        }
      });
      ctx.restore();
    }

    if (chaoticMotes.length) {
      ctx.save();
      chaoticMotes.forEach((m, idx) => {
        ctx.fillStyle = m.color;
        ctx.globalAlpha = Math.max(0, m.alpha);
        const mx = Math.round(m.x);
        const my = Math.round(m.y - 18);
        const sz = Math.max(1.5, Math.round(m.size));
        ctx.fillRect(mx - sz, my - 1, sz * 2, 2);
        ctx.fillRect(mx - 1, my - sz, 2, sz * 2);
        if (idx % 2 === 0) {
          ctx.beginPath();
          ctx.arc(m.x, m.y - 18, m.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
    }

    if (swordTrail.length > 1) {
      ctx.save();
      for (let i = 0; i < swordTrail.length - 1; i++) {
        const p1 = swordTrail[i];
        const p2 = swordTrail[i + 1];
        const w = (1 - i / swordTrail.length) * 8;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(125, 249, 255, ${p1.alpha * (1 - i / swordTrail.length)})`;
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();
    }

    if (lucNhamEntity.visible) {
      drawLucNham(ctx, t, lucNhamEntity);
    }
  }

  function drawHUD(ctx, p, W, H, t, dt, rt) {
    if (!ctx) return;
    if (rt.questDetailTimer > 0) rt.setQuestDetailTimer(Math.max(0, rt.questDetailTimer - dt));

    rt.setPhamWalkButtonRect(null);
    rt.setStoneTouchButtonRect(null);

    const { STATES, questData, cinematicStep, dialogueActive, stepSubPhase, phamAutoWalk, isQuestBoardVisible, getQuestHUDInfo } = rt;

    if (questData.state === STATES.CINEMATIC_ACTIVE && cinematicStep === 6 && !dialogueActive) {
      if (stepSubPhase === 'player_walk' && !phamAutoWalk) {
        const bw = Math.min(260, W - 32);
        const bh = 38;
        const bx = Math.round((W - bw) / 2);
        const by = H - 108;
        rt.setPhamWalkButtonRect({ x: bx, y: by, w: bw, h: bh });

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 8);
        ctx.fillStyle = '#142d22f2';
        ctx.fill();
        ctx.strokeStyle = '#ffd666';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        ctx.font = 'bold 12px "Noto Serif", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff3ba';
        ctx.fillText('👣 Tự động bước lên Quan Trắc Thạch ➔', bx + bw / 2, by + bh / 2);
        ctx.restore();
      } else if (stepSubPhase === 'await_touch') {
        const bw = Math.min(280, W - 32);
        const bh = 42;
        const bx = Math.round((W - bw) / 2);
        const by = H - 112;
        rt.setStoneTouchButtonRect({ x: bx, y: by, w: bw, h: bh });

        ctx.save();
        const pulse = 0.7 + 0.3 * Math.sin(t * 6);
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 8);
        ctx.fillStyle = '#173629f5';
        ctx.fill();
        ctx.strokeStyle = `rgba(120, 245, 215, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 13px "Noto Serif", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e6fff7';
        ctx.fillText('✋ Đặt tay lên Quan Trắc Thạch', bx + bw / 2, by + bh / 2);
        ctx.restore();
      }
    }

    if (!isQuestBoardVisible()) return;

    const info = getQuestHUDInfo();
    if (!info) return;

    ctx.save();
    const hx = 12, hy = 12;
    const isNarrow = W < 430;
    const barW = isNarrow ? 116 : 132;
    const panelW = barW + 58;
    const qx = hx;
    const qy = hy + 50 + 6;
    const qw = panelW;
    const qh = 42;

    ctx.beginPath();
    ctx.roundRect(qx, qy, qw, qh, 6);
    ctx.fillStyle = info.urgent ? '#162b20f2' : '#0e231be8';
    ctx.fill();

    let strokeCol = '#bfa35bcc';
    if (info.urgent) {
      const pulse = 0.6 + 0.4 * Math.sin(t * 6);
      strokeCol = `rgba(255, 224, 102, ${pulse})`;
    }
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = info.urgent ? 1.5 : 1.1;
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(qx + 2, qy + 2, qw - 4, qh - 4, 4);
    ctx.strokeStyle = 'rgba(50, 88, 68, 0.45)';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.fillStyle = '#d6c07a';
    for (const [rx, ry] of [
      [qx + 4, qy + 4],
      [qx + qw - 4, qy + 4],
      [qx + 4, qy + qh - 4],
      [qx + qw - 4, qy + qh - 4]
    ]) {
      ctx.beginPath();
      ctx.arc(rx, ry, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    const iconX = qx + 8;
    const iconY = qy + 8;
    const iconS = 15;
    ctx.fillStyle = '#22150a';
    ctx.beginPath();
    ctx.roundRect(iconX, iconY, iconS, iconS, 2.5);
    ctx.fill();
    ctx.strokeStyle = '#d6b567';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 8.5px "Noto Serif", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe899';
    ctx.fillText('務', iconX + iconS / 2, iconY + iconS / 2 + 0.5);

    ctx.beginPath();
    ctx.arc(iconX + iconS - 1.5, iconY + iconS - 1.5, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = info.statusColor || '#86efac';
    ctx.fill();
    ctx.strokeStyle = '#11251c';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    const textX = iconX + iconS + 6;
    const row1Y = qy + 13;

    ctx.font = 'bold 9.5px "Noto Serif", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000bb';
    ctx.fillText(info.title, textX + 0.5, row1Y + 0.5);
    ctx.fillStyle = info.urgent ? '#fff3ba' : '#fef2d0';
    ctx.fillText(info.title, textX, row1Y);

    ctx.font = 'bold 7px system-ui, sans-serif';
    const tagText = info.tag;
    const tagW = ctx.measureText(tagText).width + 6;
    const tagX = qx + qw - tagW - 6;
    ctx.fillStyle = 'rgba(20, 48, 36, 0.75)';
    ctx.beginPath();
    ctx.roundRect(tagX, row1Y - 6, tagW, 11, 2);
    ctx.fill();
    ctx.strokeStyle = info.tagColor || '#d4ba75';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = info.tagColor || '#d4ba75';
    ctx.fillText(tagText, tagX + tagW / 2, row1Y);

    const row2Y = qy + 28;
    ctx.font = '8.5px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let objText = info.objective;
    const maxObjW = qw - (textX - qx) - 8;
    while (ctx.measureText(objText).width > maxObjW && objText.length > 5) {
      objText = objText.slice(0, -2) + '…';
    }

    ctx.fillStyle = '#000000aa';
    ctx.fillText(objText, textX + 0.5, row2Y + 0.5);
    ctx.fillStyle = info.urgent ? '#ffd666' : '#9dd5b8';
    ctx.fillText(objText, textX, row2Y);

    if (rt.questDetailTimer > 0) {
      const popW = Math.min(270, W - 24);
      const popX = qx;
      const popY = qy + qh + 6;
      const lines = [`[Nhiệm vụ] ${info.title}`, `• Mục tiêu: ${info.objective}`, `• ${info.hint}`];
      const popH = lines.length * 15 + 14;

      ctx.beginPath();
      ctx.roundRect(popX, popY, popW, popH, 5);
      ctx.fillStyle = '#0b1d16f6';
      ctx.fill();
      ctx.strokeStyle = '#d6b567';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = 'bold 9.5px "Noto Serif", Georgia, serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffeaa7';
      ctx.fillText(lines[0], popX + 8, popY + 12);

      ctx.font = '9px system-ui, sans-serif';
      ctx.fillStyle = '#d1e7dd';
      ctx.fillText(lines[1], popX + 8, popY + 28);
      ctx.fillStyle = '#a3c2b2';
      ctx.fillText(lines[2], popX + 8, popY + 43);
    }

    ctx.restore();
  }

  return {
    STONE_SPRITE_DEFS,
    stoneSprites,
    ensureStoneSpritesLoaded,
    drawGround,
    drawWorld,
    drawHUD
  };
})();
