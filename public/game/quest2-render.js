'use strict';

/**
 * HỆ THỐNG RENDER LIỆP MA, VẾT NỨT VÁCH NHÀ, MẢNH VỠ & HUD NHIỆM VỤ 2
 * Tách từ quest2.js để tách biệt logic hiển thị (Canvas 2D) và máy trạng thái sinh tồn.
 */
const Quest2Render = (() => {
  // Eye centers measured on the canonical sprite itself (192px frame coords).
  // They are anchored to the face, not a fixed point in the room.
  const LIEP_MA_EYE_ANCHORS = [[[159,103],[159,103],[159,103],[159,103],[159,103],[159,103]],[[159,103],[157,130],[151,153],[151,157],[162,131],[154,102]],[[157,130],[151,153],[151,157],[151,157],[151,153],[157,130]],[[159,103],[157,130],[151,153],[151,157],[162,131],[154,102]],[[144,55],[116,40],[116,46],[129,79],[137,97],[146,75]],[[117,40],[117,44],[127,86],[136,96],[146,74],[124,94]],[[142,55],[113,91],[119,85],[118,83],[142,50],[141,55]],[[147,76],[145,81],[139,96],[135,115],[127,135],[120,151]]];
  // Quãng đường thật quyết định nhịp chân (không chạy animation tại chỗ).
  // Trong hoạt cảnh đồ vật bị phá, vị trí đến từ jarRaidPose nhưng vẫn dùng chung bộ bước.
  const gait = {x:null,y:null,t:null,action:null,distance:0,phase:0,moving:false};
  function advanceGait(x,y,action,t) {
    const locomotion=action==='walk'||action==='run';
    const elapsed=gait.t===null?1:t-gait.t;
    const dist=gait.x===null?0:Math.hypot(x-gait.x,y-gait.y);
    if(gait.action!==action || !locomotion || elapsed<0 || elapsed>.25 || dist>42) {
      gait.distance=0;
      gait.phase=0;
      gait.moving=false;
    } else if(dist>.16) {
      gait.distance+=dist;
      const stride = action==='run'?76:58; // khoảng cách bàn chân chạm sàn theo đơn vị thế giới
      gait.phase=(gait.distance/stride)*Math.PI*2;
      gait.moving=true;
    } else {
      gait.moving=false;
    }
    gait.x=x;gait.y=y;gait.t=t;gait.action=action;
    return gait;
  }
  function drawSteppingSprite(ctx,img,sx,sy,scale,gaitInfo,action,baseX,baseY) {
    const p=gaitInfo.phase;
    const amp=action==='run'?1.25:1.0;
    const bodyBob=(.75+Math.abs(Math.sin(p))*1.4)*scale;
    // Phần thân gù giữ nguyên khung hình canonical, phần chân đổi trọng tâm
    // qua từng dải chiều cao, tránh đường cắt ngang ở gối/bàn chân.
    ctx.drawImage(img,sx,sy,192,126,baseX,baseY-bodyBob,192*scale,126*scale);
    const limbSections=[[0,69,0],[69,128,Math.PI],[128,192,Math.PI*.35]];
    for(let ry=126;ry<192;ry+=6) {
      const sliceH=Math.min(6,192-ry);
      const bend=Math.pow(Math.max(0,(ry-126)/66),1.32);
      for(const [left,right,offset] of limbSections) {
        const shift=Math.sin(p+offset)*9*amp*bend*scale;
        ctx.drawImage(img,sx+left,sy+ry,right-left,sliceH,
          baseX+left*scale+shift,baseY+ry*scale-bodyBob*(1-bend),
          (right-left)*scale,sliceH*scale+.05);
      }
    }
  }
  // Vẽ Sprite Liệp Ma
  function drawMonster(ctx, x, y, facing = 1, timeSec = 0, rt) {
    if (!rt.liepMaLoaded || !rt.LIEP_MA_IMG) return;
    const monster = rt.monster;
    const cfg = rt.LIEP_MA_ANIMS[monster.action] || rt.LIEP_MA_ANIMS.idle;
    const row = cfg.row;
    const gaitInfo=advanceGait(x,y,monster.action,timeSec);
    // Dựa vào quãng đường đã di chuyển: không còn 6 frame trôi chân tại chỗ.
    const col = gaitInfo.moving
      ? (Math.floor(((gaitInfo.phase%(Math.PI*2))+(Math.PI*2))%(Math.PI*2)/(Math.PI*2)*cfg.frames)%cfg.frames)
      : monster.frame;
    const sx = col * 192;
    const sy = row * 192;
    const dw = 192 * monster.scale;
    const dh = 192 * monster.scale;

    ctx.save();
    ctx.translate(x, y);
    if (facing < 0) {
      ctx.scale(-1, 1);
    }
    // Dynamic contact shadow with grounded foot anchor, independent of collision.
    ctx.save();
    const moving = monster.action === 'run' || monster.action === 'walk';
    const shadowW = dw * (moving ? 0.32 : 0.36);
    ctx.fillStyle = 'rgba(7,6,12,.36)';
    ctx.beginPath(); ctx.ellipse(0, -1, shadowW, dh * 0.067, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(11,9,17,.13)';
    ctx.beginPath(); ctx.ellipse(0, -2, shadowW * 1.38, dh * 0.105, 0, 0, Math.PI * 2); ctx.fill();
    // Nén đất nhẹ ở nhịp chân đặt xuống, không phủ mất mặt sân.
    if (moving && gaitInfo.moving) {
      const stamp=Math.pow(Math.max(0,Math.cos(gaitInfo.phase*2)),6);
      ctx.fillStyle=`rgba(112,103,91,${(stamp*.13).toFixed(3)})`;
      for(const side of [-1,1]) {
        ctx.beginPath();ctx.ellipse(side*dw*.29,1,dw*.08,dh*.032,0,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();
    // Chân sau / chân trước thay phiên chống đất; thân nhấp theo nhịp đặt chân.
    // Luôn tái sử dụng texture gốc để Liệp Ma không khác ngoại hình trong hồi ức.
    const breathe = monster.action === 'idle' ? Math.sin(timeSec * 2.1) * 0.7 : 0;
    ctx.imageSmoothingEnabled = false;
    if (moving && gaitInfo.moving) {
      drawSteppingSprite(ctx,rt.LIEP_MA_IMG,sx,sy,monster.scale,gaitInfo,
        monster.action,-dw*.5,-dh*.95);
    } else {
      ctx.drawImage(rt.LIEP_MA_IMG, sx, sy, 192, 192, -dw * 0.5, -dh * 0.95 - breathe, dw, dh + breathe);
    }

    // Mắt đỏ bám theo đúng vị trí mắt trên từng sprite, kể cả khi cúi đầu đánh hơi.
    // Chỉ thêm hào quang nhẹ để không tạo một nhãn cầu lơ lửng ngoài mặt.
    const eye = (LIEP_MA_EYE_ANCHORS[row] || [])[col] || [137, 53];
    const eyeX = (eye[0] - 96) * monster.scale;
    const eyeY = (eye[1] - 192 * 0.95) * monster.scale;
    ctx.save();
    ctx.shadowColor = 'rgba(202, 42, 35, .48)';
    ctx.shadowBlur = 3.0;
    ctx.fillStyle = 'rgba(220, 66, 48, .82)';
    ctx.beginPath(); ctx.arc(eyeX, eyeY, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Hơi thở bám sát mõm, chỉ thấy rõ khi nó ghé đầu rà mùi.
    if (monster.action === 'sniff') {
      const snoutX = eyeX + 5.0;
      const snoutY = eyeY + 5.0;
      for (let i = 0; i < 2; i++) {
        const phase = (timeSec * 0.85 + i * 0.48) % 1;
        ctx.fillStyle = `rgba(176, 165, 170, ${(1 - phase) * .12})`;
        ctx.beginPath();
        ctx.arc(snoutX + 4 + phase * 6.5, snoutY + phase * 5.0, 1.3 + phase, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Dấu cảnh báo đỏ [!] khi Liệp Ma vừa phát hiện hơi thở người chơi
    if (rt.monsterAlertPulse > 0) {
      ctx.save();
      const pulseAlpha = Math.min(0.92, rt.monsterAlertPulse * 1.15);
      const popScale = 1 + Math.sin(rt.monsterAlertPulse * Math.PI) * 0.22;
      ctx.translate(x, y - dh * 1.02);
      ctx.scale(popScale, popScale);
      ctx.fillStyle = `rgba(25, 4, 8, ${pulseAlpha * 0.85})`;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 36, 56, ${pulseAlpha})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 50, 65, ${pulseAlpha})`;
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, 5);
      ctx.restore();
    }
  }

  function drawHUD(ctx, player, screenW, screenH, timeSec, dt, rt) {
    const { STATES, questData, bloodFlash, nightAmbientAlpha, screenShake, screenFadeAlpha } = rt;
    if (questData.state === STATES.LOCKED || questData.state === STATES.READY_TO_REST) return;

    // 0. Màn hình chớp đỏ khi trúng móng vuốt Liệp Ma
    if (bloodFlash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(190, 0, 15, ${Math.min(0.55, bloodFlash)})`;
      ctx.fillRect(0, 0, screenW, screenH);
      ctx.restore();
    }

    // 1. Lớp bóng đêm u ám nửa đêm dạng Cinematic Vignette
    if (nightAmbientAlpha > 0 && questData.state !== STATES.RUINS_EXPLORE && questData.state !== STATES.COMPLETED) {
      ctx.save();
      const minR = Math.min(screenW, screenH) * 0.35;
      const maxR = Math.max(screenW, screenH) * 0.85;
      const vig = ctx.createRadialGradient(screenW / 2, screenH / 2, minR, screenW / 2, screenH / 2, maxR);
      vig.addColorStop(0, 'rgba(8, 12, 18, 0)');
      vig.addColorStop(0.7, `rgba(8, 12, 18, ${nightAmbientAlpha * 0.45})`);
      vig.addColorStop(1, `rgba(8, 12, 18, ${nightAmbientAlpha})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, screenW, screenH);
      ctx.restore();
    }

    // 2. Hiệu ứng Screen Shake: scope the translation to this HUD only.
    ctx.save();
    if (screenShake > 0) {
      const sx = (Math.random() - 0.5) * screenShake;
      const sy = (Math.random() - 0.5) * screenShake;
      ctx.translate(sx, sy);
    }

    // 4. HIỆU ỨNG GÓC NHÌN KHE CHUM KHI ĐANG NẤP (Đã xóa dòng chữ hướng dẫn theo yêu cầu)
    if (questData.state === STATES.HIDING_JAR || questData.state === STATES.AFTER_LEAVING_DECISION) {
      ctx.save();
      const grad = ctx.createRadialGradient(screenW / 2, screenH / 2, screenH * 0.18, screenW / 2, screenH / 2, screenH * 0.65);
      grad.addColorStop(0, 'rgba(0,0,0,0.15)');
      grad.addColorStop(0.65, 'rgba(0,0,0,0.78)');
      grad.addColorStop(1, 'rgba(0,0,0,0.96)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, screenW, screenH);
      ctx.restore();
    }

    // 5. MÀN HÌNH FADE MỜ ĐEN
    if (screenFadeAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${screenFadeAlpha})`;
      ctx.fillRect(0, 0, screenW, screenH);
      ctx.restore();
    }
    ctx.restore(); // Scope the HUD's screen shake to this draw only.
  }

  // Vẽ hiệu ứng mảnh gỗ/sành văng, vết móng vuốt cào rách và số sát thương bay lên
  function drawCombatEffects(ctx, rt) {
    const { debrisParticles, clawMarks, damageTexts } = rt;
    if (debrisParticles.length > 0) {
      ctx.save();
      for (const pt of debrisParticles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, pt.alpha));
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.fillStyle = pt.color;
        if (pt.shape === 'drop') {
          ctx.beginPath();
          ctx.ellipse(0, 0, pt.w, pt.h * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (pt.shape === 'shard') {
          ctx.beginPath();
          ctx.moveTo(-pt.w * 0.5, 0);
          ctx.lineTo(0, -pt.h * 0.6);
          ctx.lineTo(pt.w * 0.5, pt.h * 0.3);
          ctx.lineTo(-pt.w * 0.2, pt.h * 0.6);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-pt.w * 0.5, -pt.h * 0.5, pt.w, pt.h);
        }
        ctx.restore();
      }
      ctx.restore();
    }

    if (clawMarks.length > 0) {
      ctx.save();
      for (const m of clawMarks) {
        ctx.strokeStyle = m.wood ? `rgba(245, 198, 140, ${Math.max(0, m.alpha)})` : `rgba(255, 30, 40, ${Math.max(0, m.alpha)})`;
        ctx.shadowColor = m.wood ? '#c7884b' : '#ff0033';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 3;
        for (let offset = -10; offset <= 10; offset += 10) {
          ctx.beginPath();
          ctx.moveTo(m.x + offset - 12, m.y - 14);
          ctx.lineTo(m.x + offset + 12, m.y + 14);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    if (damageTexts.length > 0) {
      ctx.save();
      for (const t of damageTexts) {
        ctx.font = t.font || 'bold 14px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, t.alpha * 0.85)})`;
        ctx.fillText(t.text, t.x + 1, t.y + 1);
        ctx.fillStyle = t.color || '#ff3333';
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.restore();
    }
  }

  function drawWorld(ctx, timeSec, rt) {
    const { STATES, questData, monster } = rt;
    if ((questData.state === STATES.CHASE_VILLAGE || questData.state === STATES.CHASE_CAUGHT) && monster) {
      drawMonster(ctx, monster.x, monster.y, monster.facing, timeSec, rt);
    }
    drawCombatEffects(ctx, rt);
  }

  // Vẽ chi tiết Liệp Ma nhòm qua cửa sổ (wx: 344, wy: 68, ww: 84, wh: 53)
  function drawWindowPeekingMonster(ctx, timeSec = 0, intensity = 1.0, clawing = false, rt) {
    const wx = 344, wy = 68, ww = 84, wh = 53;
    const t = timeSec || 0;
    const sway = Math.sin(t * (clawing ? 4.2 : 2.1)) * (clawing ? 3.8 : 2.8);
    const bob = Math.cos(t * 3.0) * 1.4;
    const cx = 386 + sway;
    const cy = 96 + bob;

    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, ww, wh);
    ctx.clip();

    // 1. Nền sương đêm huyết nguyệt phía sau Liệp Ma ngoài cửa sổ
    const bgGrad = ctx.createRadialGradient(cx, cy - 6, 4, cx, cy, 52);
    bgGrad.addColorStop(0, `rgba(68, 12, 24, ${0.55 * intensity})`);
    bgGrad.addColorStop(0.6, `rgba(18, 8, 18, ${0.75 * intensity})`);
    bgGrad.addColorStop(1, `rgba(6, 4, 10, ${0.92 * intensity})`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(wx, wy, ww, wh);

    if (rt.liepMaLoaded && rt.LIEP_MA_IMG) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.65, 0.45 * intensity);
      const col = rt.monster.frame % 6;
      const sx = col * 192;
      const sy = rt.LIEP_MA_ANIMS.sniff.row * 192;
      // Đầu Liệp Ma nay cúi thấp giống ảnh hồi ức: crop quanh vai và mõm, không cắt mất mắt.
      ctx.drawImage(rt.LIEP_MA_IMG, sx + 83, sy + 66, 109, 119, cx - 50, wy - 8, 100, 84);
      ctx.restore();
    }

    // 2. Bóng dáng bờm lông vai & cổ Liệp Ma đồ sộ chắn kín ô cửa
    ctx.fillStyle = `rgba(10, 6, 14, ${0.95 * intensity})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 20, 40, 28, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // 3. Đôi sừng/tai sói yêu ma nhọn hoắt vểnh lên hai bên đỉnh đầu
    ctx.fillStyle = `rgba(14, 8, 19, ${0.96 * intensity})`;
    ctx.strokeStyle = `rgba(120, 28, 42, ${0.48 * intensity})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy - 8);
    ctx.lineTo(cx - 31, cy - 26);
    ctx.lineTo(cx - 11, cy - 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 22, cy - 8);
    ctx.lineTo(cx + 31, cy - 26);
    ctx.lineTo(cx + 11, cy - 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Hộp sọ, bờm lông nhọn dựng đứng & phần mõm nanh yêu ma
    ctx.fillStyle = `rgba(11, 7, 16, ${0.97 * intensity})`;
    ctx.beginPath();
    ctx.moveTo(cx - 27, cy + 8);
    ctx.lineTo(cx - 29, cy - 3);
    ctx.lineTo(cx - 23, cy - 14);
    ctx.lineTo(cx - 12, cy - 20);
    ctx.lineTo(cx, cy - 22);
    ctx.lineTo(cx + 12, cy - 20);
    ctx.lineTo(cx + 23, cy - 14);
    ctx.lineTo(cx + 29, cy - 3);
    ctx.lineTo(cx + 27, cy + 8);
    ctx.lineTo(cx + 14, cy + 21);
    ctx.lineTo(cx - 14, cy + 21);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(165, 35, 52, ${0.45 * intensity})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - 9);
    ctx.quadraticCurveTo(cx - 9, cy - 4, cx - 4, cy - 6);
    ctx.moveTo(cx + 18, cy - 9);
    ctx.quadraticCurveTo(cx + 9, cy - 4, cx + 4, cy - 6);
    ctx.stroke();

    // 5. Hàm răng nanh trắng sắc nhọn thấp thoáng dưới mõm
    const jawOpen = 1.2 + Math.sin(t * 5.5) * 0.8;
    ctx.fillStyle = `rgba(45, 8, 14, ${0.85 * intensity})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 11, 3.2 + jawOpen * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(232, 220, 210, ${0.82 * intensity})`;
    for (const fx of [-8, -4, 4, 8]) {
      ctx.beginPath();
      ctx.moveTo(cx + fx - 1.6, cy + 9.5);
      ctx.lineTo(cx + fx, cy + 14.2);
      ctx.lineTo(cx + fx + 1.6, cy + 9.5);
      ctx.closePath();
      ctx.fill();
    }

    // 6. Đôi mắt đỏ rực ma khí + đồng tử dọc sắc lẹm lia ngang căn phòng
    const gazeShift = Math.sin(t * 2.8) * 2.2;
    for (const side of [-1, 1]) {
      const ex = cx + side * 11.5 + gazeShift;
      const ey = cy - 4;
      ctx.save();
      ctx.fillStyle = `rgba(255, 18, 38, ${0.88 * intensity})`;
      ctx.shadowColor = '#ff002b';
      ctx.shadowBlur = 11;
      ctx.beginPath();
      ctx.moveTo(ex - 5.5, ey - side * 0.8);
      ctx.quadraticCurveTo(ex, ey - 3.6, ex + 5.5, ey + side * 0.8);
      ctx.quadraticCurveTo(ex, ey + 3.4, ex - 5.5, ey - side * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = `rgba(255, 220, 140, ${0.95 * intensity})`;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 2.2, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a0004';
      ctx.fillRect(ex - 0.55, ey - 2.1, 1.1, 4.2);
    }

    // 7. Làn khói hơi thở ma khí phả vào cửa sổ
    for (let i = 0; i < 2; i++) {
      const bPhase = (t * 0.9 + i * 0.5) % 1;
      const bx = cx + (i === 0 ? -7 : 7) + Math.sin(t * 3 + i) * 3;
      const by = cy + 12 - bPhase * 10;
      ctx.fillStyle = `rgba(195, 45, 60, ${(1 - bPhase) * 0.26 * intensity})`;
      ctx.beginPath();
      ctx.ellipse(bx, by, 6 + bPhase * 7, 3 + bPhase * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. VẼ LẠI CHẤN SONG GỖ CỬA SỔ ĐÈ LÊN TRƯỚC MẶT LIỆP MA
    ctx.fillStyle = '#4a3320';
    for (let lx = wx + 16.5; lx < wx + ww - 4; lx += 16.5) {
      ctx.fillRect(lx, wy, 3, wh);
      ctx.fillStyle = '#2b1c10';
      ctx.fillRect(lx + 2, wy, 1, wh);
      ctx.fillStyle = '#4a3320';
    }
    ctx.fillStyle = '#4a3320';
    ctx.fillRect(wx, wy + wh / 2 - 1.5, ww, 3);
    ctx.restore();

    // 9. Đôi bàn tay móng vuốt sắc nhọn của Liệp Ma bấu trùm qua chấn song & bậu cửa sổ
    ctx.save();
    const clawFlex = Math.sin(t * 4.5) * 1.2;
    for (const [hx, dir] of [[358 + sway * 0.5, -1], [414 + sway * 0.5, 1]]) {
      const hy = wy + wh - 2;
      ctx.fillStyle = `rgba(15, 9, 20, ${0.95 * intensity})`;
      ctx.beginPath();
      ctx.ellipse(hx, hy - 2, 8.5, 5.2, dir * 0.2, 0, Math.PI * 2);
      ctx.fill();
      for (let f = -1.5; f <= 1.5; f += 1) {
        const fx = hx + f * 3.6;
        ctx.strokeStyle = `rgba(26, 16, 32, ${0.96 * intensity})`;
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.moveTo(fx, hy - 4);
        ctx.quadraticCurveTo(fx + dir * 1.5, hy + 1, fx + dir * 0.8, hy + 5.5 + clawFlex * 0.4);
        ctx.stroke();
        ctx.fillStyle = `rgba(220, 205, 195, ${0.9 * intensity})`;
        ctx.beginPath();
        ctx.moveTo(fx - 1.1, hy + 3.5);
        ctx.lineTo(fx + dir * 0.8, hy + 7.2 + clawFlex * 0.4);
        ctx.lineTo(fx + 1.1, hy + 3.5);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Vết nứt tăng dần trên vách nhà, thể hiện 10 giây sinh tử mà không lộ HUD.
  function drawGrowingWallCracks(ctx, timeSec, rt) {
    const { STATES, questData, countdownTimer } = rt;
    if (questData.state !== STATES.COUNTDOWN_HIDE) return;
    const progress = Math.max(0, Math.min(1, 1 - countdownTimer / 10));
    const paths = [
      { at: 0.00, points: [[343,60],[332,72],[340,82],[328,94],[335,108],[323,123],[307,140]] },
      { at: 0.10, points: [[430,58],[440,73],[432,86],[447,97],[434,112],[445,133],[434,146]] },
      { at: 0.21, points: [[335,84],[322,82],[313,95],[303,102]] },
      { at: 0.30, points: [[433,86],[446,81],[450,68]] },
      { at: 0.40, points: [[382,58],[371,65],[356,58],[342,64]] },
      { at: 0.49, points: [[344,119],[340,133],[324,145]] },
      { at: 0.57, points: [[430,123],[417,131],[410,147]] },
      { at: 0.68, points: [[375,126],[386,136],[374,146],[363,152]] },
      { at: 0.76, points: [[319,103],[305,112],[300,130]] },
      { at: 0.84, points: [[439,109],[446,117],[453,132]] }
    ];
    ctx.save();
    ctx.beginPath();
    ctx.rect(298, 56, 158, 98);
    ctx.clip();

    if (progress > 0.05) {
      drawWindowPeekingMonster(ctx, timeSec, Math.min(1, 0.55 + progress * 0.45), true, rt);
    }
    if (progress > 0.34) {
      for (let i = 0; i < 18; i++) {
        const drift = (timeSec * (10 + (i % 4) * 3) + i * 11) % 72;
        const x = 305 + ((i * 41) % 144);
        const y = 65 + ((i * 7 + drift) % 83);
        ctx.fillStyle = `rgba(204,171,124,${Math.min(0.50, progress * 0.34)})`;
        ctx.fillRect(x, y, 1.4 + (i % 2), 1.4 + (i % 2));
      }
    }
    const drawSegment = (points, ratio) => {
      const distances = [];
      let length = 0;
      for (let i = 1; i < points.length; i++) {
        const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
        distances.push(d);
        length += d;
      }
      let remaining = Math.max(0, Math.min(1, ratio)) * length;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length && remaining > 0; i++) {
        const u = Math.min(1, remaining / distances[i - 1]);
        ctx.lineTo(
          points[i - 1][0] + (points[i][0] - points[i - 1][0]) * u,
          points[i - 1][1] + (points[i][1] - points[i - 1][1]) * u
        );
        remaining -= distances[i - 1];
      }
    };
    for (const path of paths) {
      if (progress <= path.at) continue;
      const spread = Math.min(1, (progress - path.at) / Math.max(0.08, 0.42 - path.at * 0.2));
      drawSegment(path.points, spread);
      ctx.strokeStyle = `rgba(31,17,18,${Math.min(0.96, 0.60 + progress * 0.36)})`;
      ctx.lineWidth = 1.1 + progress * 3.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'bevel';
      ctx.stroke();
      drawSegment(path.points, spread);
      ctx.strokeStyle = `rgba(230,166,133,${Math.min(0.8, 0.17 + progress * 0.46)})`;
      ctx.lineWidth = 0.7 + progress * 0.7;
      ctx.stroke();
    }
    if (progress > 0.72) {
      ctx.strokeStyle = `rgba(194,38,48,${(progress - 0.72) * 1.6 * (0.7 + 0.3 * Math.sin(timeSec * 12))})`;
      ctx.lineWidth = 1.5;
      for (const path of [paths[0], paths[1]]) {
        drawSegment(path.points, 1);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Vệt vuốt và mạt gỗ tại mục tiêu khi sprite Liệp Ma đang chém.
  function drawFurnitureSwipe(ctx, x, y, elapsed, facing) {
    const progress = Math.max(0, Math.min(1, (elapsed - 0.12) / 0.5));
    if (progress <= 0 || progress >= 1) return;
    const alpha = Math.sin(progress * Math.PI) * 0.85;
    ctx.save();
    ctx.strokeStyle = `rgba(246, 207, 154, ${alpha})`;
    ctx.shadowColor = '#efa363';
    ctx.shadowBlur = 7;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const offset = i * 10;
      ctx.beginPath();
      ctx.moveTo(x - facing * (16 - progress * 14) + offset, y - 18);
      ctx.quadraticCurveTo(x + offset + facing * 8, y - 3, x + facing * 13 + offset, y + 16);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Vẽ Liệp Ma & Đồ vỡ trong nhà Tiểu Phàm
  function drawInHome(ctx, timeSec, rt) {
    const { STATES, questData, stateTimer, monster } = rt;
    if(typeof VillageRaidFX!=='undefined')VillageRaidFX.drawInterior(ctx,timeSec);
    drawGrowingWallCracks(ctx, timeSec, rt);
    // 1. Vẽ chi tiết Liệp Ma nhòm vào từ ngoài ô cửa sổ
    if (questData.state === STATES.WINDOW_SHADOW) {
      drawWindowPeekingMonster(ctx, timeSec, 1.0, false, rt);
    }

    // 2. Vẽ Liệp Ma khi đang ở trong nhà
    if (questData.state === STATES.ATTACK_TIMEOUT) {
      let mx = 374, my = 150, mf = -1;
      if (stateTimer < 0.9) {
        mx = 374; my = 150; mf = -1;
      } else if (stateTimer < 1.8) {
        const u = (stateTimer - 0.9) / 0.9;
        mx = 374 + (352 - 374) * u;
        my = 150 + (290 - 150) * u;
        mf = -1;
      } else {
        mx = 352; my = 310; mf = -1;
      }
      drawMonster(ctx, mx, my, mf, timeSec, rt);
    } else if (questData.state === STATES.ATTACK_BED) {
      let mx = 374, my = 150, mf = 1;
      if (stateTimer < 1.1) {
        mx = 374; my = 150; mf = 1;
      } else if (stateTimer < 2.05) {
        const u = (stateTimer - 1.1) / 0.95;
        const eased = u * u * (3 - 2 * u);
        mx = 374 + (516 - 374) * eased;
        my = 150 + (212 - 150) * eased;
        mf = 1;
      } else if (stateTimer < 2.8) {
        mx = 516;
        my = 212 + Math.sin(stateTimer * 5.2) * 1.8;
        mf = 1;
      } else {
        mx = 532; my = 220; mf = -1;
      }
      drawMonster(ctx, mx, my, mf, timeSec, rt);
    } else if (questData.state === STATES.ATTACK_WARDROBE) {
      let mx = 374, my = 150, mf = -1;
      if (stateTimer < 1.1) {
        mx = 374; my = 150; mf = -1;
      } else if (stateTimer < 2.05) {
        const u = (stateTimer - 1.1) / 0.95;
        const eased = u * u * (3 - 2 * u);
        mx = 374 + (170 - 374) * eased;
        my = 150 + (180 - 150) * eased;
        mf = -1;
      } else if (stateTimer < 2.8) {
        mx = 170;
        my = 180 + Math.sin(stateTimer * 5.2) * 1.8;
        mf = -1;
      } else {
        mx = 150; my = 186; mf = 1;
      }
      drawMonster(ctx, mx, my, mf, timeSec, rt);
    } else if (questData.state === STATES.ATTACK_DOOR_EARLY) {
      drawMonster(ctx, 352, 404, -1, timeSec, rt);
    } else if (questData.state === STATES.HIDING_JAR) {
      // Tư thế lấy cùng nguồn với mốc va chạm ở Quest2. Không còn cảnh
      // quái đứng một nơi trong khi giường và tủ đồng loạt tự vỡ.
      const pose = rt.jarRaidPose;
      if (pose) {
        drawMonster(ctx, pose.x, pose.y, pose.facing, timeSec, rt);
        // Đường vuốt xuất hiện trên bề mặt đồ vật đang bị đánh, không xuất
        // hiện từ lúc Liệp Ma vừa bước qua tường.
        const stamp = rt.jarRaidTimeline;
        if (stamp) {
          if (stateTimer >= stamp.bedSwing && stateTimer < stamp.bedSwingEnd) {
            drawFurnitureSwipe(ctx, 522, 157, stateTimer - stamp.bedSwing, 1);
          } else if (stateTimer >= stamp.wardrobeSwing && stateTimer < stamp.wardrobeSwingEnd) {
            drawFurnitureSwipe(ctx, 150, 143, stateTimer - stamp.wardrobeSwing, -1);
          }
        }
      }
    } else if ((questData.state === STATES.CHASE_VILLAGE || questData.state === STATES.CHASE_CAUGHT) && typeof TieuPhamHome !== 'undefined' && TieuPhamHome.inside) {
      drawMonster(ctx, monster.x, monster.y, monster.facing, timeSec, rt);
    }

    // 3. Mảnh gỗ vụn trên sàn quanh giường khi giường bị sập
    if (questData.bedBroken) {
      ctx.save();
      for (const [sx, sy, sw, sh, rot, col] of [
        [468, 222, 22, 4, -0.25, '#5c3f26'],
        [516, 230, 26, 5, 0.18, '#785334'],
        [568, 226, 20, 4, -0.35, '#47311e'],
        [604, 220, 18, 4, 0.42, '#8c6440']
      ]) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rot);
        ctx.fillStyle = col;
        ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
        ctx.restore();
      }
      ctx.restore();
    }

    // 4. Mảnh dăm gỗ văng quanh sàn tủ khi tủ bị xé toạc
    if (questData.wardrobeBroken) {
      ctx.save();
      for (const [sx, sy, sw, sh, rot, col] of [
        [82, 208, 18, 4, -0.3, '#6e4c2f'],
        [112, 218, 22, 4, 0.22, '#47311e'],
        [168, 212, 20, 5, -0.4, '#7d5837']
      ]) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rot);
        ctx.fillStyle = col;
        ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
        ctx.restore();
      }
      ctx.restore();
    }

    // 5. Hiệu ứng vết cào, mảnh vỡ động và số sát thương trong nhà
    drawCombatEffects(ctx, rt);
  }

  return {
    drawMonster,
    drawHUD,
    drawCombatEffects,
    drawWorld,
    drawWindowPeekingMonster,
    drawGrowingWallCracks,
    drawInHome
  };
})();
