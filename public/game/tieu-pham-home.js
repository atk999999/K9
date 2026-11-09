'use strict';
const TieuPhamHome=(()=>{
  // Room dimensions enlarged by 10% (704x462 vs previous 640x420)
  const W=704,H=462;
  // Exterior door of the first house (Nhà dân tây bắc: x=138..298, y=158..294, door at x=207..236, y=256..290)
  const EXT_DOOR={x:221,y:295};
  const EXT_SPAWN={x:221,y:314};
  const INT_SPAWN={x:352,y:392};
  let inside=false,cooldown=0,nearProp=null,pose='none',poseCooldown=0,sleepTimer=0,sleptDayAdvanced=false,bannerText='',bannerTimer=0;
  let homeCamSmoothX=352,homeCamSmoothY=231;
  let wardrobeAnimTimer=0,wardrobeAnimMode='open',jarAnimTimer=0,bedAnimTimer=0,wardrobeBrokenTime=0,bedBrokenTime=0;
  let requireReleaseBeforeMoveExit=false;
  const furImgs={
    wardrobeSheet: null,
    jarSheet: null,
    bedSheet: null,
    wardrobeDestroy: null,
    bedDestroy: null,
    clothesRack: null,
    stove: null,
    table: null,
    candleFrames: []
  };
  function ensureFurnitureImages(){
    if(typeof Image==='undefined')return;
    if(furImgs.wardrobeSheet)return;
    const createImg=(src)=>{
      const img=new Image();
      img.src=src;
      return img;
    };
    furImgs.wardrobeSheet=createImg('tu_quan_ao_sheet.webp?v=fur1');
    furImgs.jarSheet=createImg('chum_nuoc_sheet.webp?v=fur1');
    furImgs.bedSheet=createImg('giuong_sheet.webp?v=fur1');
    furImgs.wardrobeDestroy=createImg('tu_quan_ao_pha_huy.webp?v=fur3');
    furImgs.bedDestroy=createImg('giuong_pha_huy.webp?v=fur3');
    furImgs.clothesRack=createImg('sap_quan_ao/sap_quan_ao_nhe.webp?v=fur2');
    furImgs.stove=createImg('bep_lo/bep_lo.webp?v=fur2');
    furImgs.table=createImg('ban_va_nen/ban_go.webp?v=fur2');
    furImgs.candleFrames=[];
    for(let i=1;i<=8;i++){
      const num=String(i).padStart(2,'0');
      furImgs.candleFrames.push(createImg(`ban_va_nen/nen_${num}.webp?v=fur2`));
    }
  }
  ensureFurnitureImages();

  // Camera toàn màn hình thích ứng linh hoạt (Fullscreen Responsive Viewport)
  function computeCamera(viewW_px,viewH_px,pl){
    let scale;
    if(viewW_px<640){
      // Mobile dọc: phóng lớn vừa vặn, camera bám theo Tiểu Phàm giữa các gian
      scale=Math.max(viewW_px/440,viewH_px/580);
    }else{
      // Desktop / Màn hình ngang:
      scale=Math.max(viewW_px/704,viewH_px/462);
    }
    scale=Math.min(Math.max(scale,0.78),2.5);

    const worldW=viewW_px/scale;
    const worldH=viewH_px/scale;
    const targetX=pl?pl.x:352;
    const targetY=pl?pl.y:231;

    homeCamSmoothX+=(targetX-homeCamSmoothX)*0.16;
    homeCamSmoothY+=(targetY-homeCamSmoothY)*0.16;

    let camX=0;
    if(worldW>=704){
      camX=-(worldW-704)/2;
    }else{
      camX=Math.max(25,Math.min(704-25-worldW,homeCamSmoothX-worldW/2));
    }

    let camY=0;
    if(worldH>=462){
      camY=-(worldH-462)/2;
    }else{
      camY=Math.max(15,Math.min(462-15-worldH,homeCamSmoothY-worldH/2));
    }

    return{scale,x:camX,y:camY,worldW,worldH,viewW:viewW_px,viewH:viewH_px};
  }

  // Solid furniture collision boxes inside the cottage
  const BOXES=[
    // Tủ đồ gỗ (Wardrobe)
    [80,94,98,102],
    // Giá treo quần áo & rương quần áo xếp gọn (Clothes rack & folded clothes chest)
    [190,106,134,84],
    // Bếp lò đất nung & siêu đồng ở góc gian trái
    [84,286,52,56],
    // Giường gỗ đơn sơ (Wooden bed)
    [470,114,156,106],
    // Bàn gỗ & ghế đẩu (Wooden table & stools)
    [268,258,146,74],
    // Chum nước góc nhà (Corner water jar)
    [570,358,52,50]
  ];

  const PROPS=[
    {id:'wardrobe',name:'Tủ quần áo',actionLabel:'Trốn vào tủ gỗ (Nhấn ✊ / E)',x:129,y:186,box:[80,94,98,102],labelY:86,r:58},
    {id:'clothes',name:'Sạp quần áo',actionLabel:'Thay đồ (Nhấn ✊ / E)',x:257,y:186,box:[190,106,134,84],labelY:86,r:58},
    {id:'bed',name:'Giường gỗ đơn sơ',actionLabel:'Nằm ngủ (✊ / E) hoặc núp gầm (H)',x:548,y:198,box:[470,114,156,106],labelY:90,r:58},
    {id:'table',name:'Bàn gỗ mộc',actionLabel:'Ngồi vào bàn gỗ (Nhấn ✊ / E)',x:341,y:296,box:[268,258,146,74],labelY:234,r:52},
    {id:'stove',name:'Bếp lò sưởi ấm',actionLabel:'Sưởi ấm bên bếp lửa (Nhấn ✊ / E)',x:112,y:306,box:[84,286,52,56],labelY:254,r:52},
    {id:'jar',name:'Chum nước mưa',actionLabel:'Nấp vào chum nước (Nhấn ✊ / E)',x:596,y:381,box:[570,358,52,50],labelY:332,r:58}
  ];

  function distToProp(item,pl){
    if(!pl)return Infinity;
    if(item.box){
      const [bx,by,bw,bh]=item.box;
      const cx=Math.max(bx,Math.min(bx+bw,pl.x));
      const cy=Math.max(by,Math.min(by+bh,pl.y));
      return Math.hypot(pl.x-cx,pl.y-cy);
    }
    return Math.hypot(pl.x-item.x,pl.y-item.y);
  }

  function computeNearProp(pl){
    if(!pl)return null;
    let best=Infinity,found=null;
    for(const item of PROPS){
      const d=distToProp(item,pl);
      if(d<item.r&&d<best){
        best=d;
        found=item;
      }
    }
    return found;
  }

  function syncBedHideButton(pl){
    if(typeof document==='undefined')return;
    const btn=document.getElementById('bed-hide');
    if(!btn)return;
    const q2=typeof Quest2!=='undefined'?Quest2:null;
    const q2State=q2&&q2.getState?q2.getState():'';
    const q2Locked=q2&&q2.isInputLocked&&q2.isInputLocked();
    const broken=q2&&q2.isBedBroken&&q2.isBedBroken();
    btn.hidden=!(inside&&pose==='none'&&pl&&computeNearProp(pl)?.id==='bed'
      &&!broken&&!q2Locked&&!isIndoorDoorLocked()&&!isQuest2HidePhase()
      &&q2State!=='after_decision');
  }

  // The main interaction always sleeps. Only this separate button (or H key)
  // enters the hiding pose, and never during Quest 2's survival choice.
  function interactBedHide(pArg){
    const pl=resolvePlayer(pArg);
    if(!pl||!inside||pose!=='none'||computeNearProp(pl)?.id!=='bed')return false;
    if(typeof Quest2!=='undefined'){
      if(Quest2.isInputLocked&&Quest2.isInputLocked())return false;
      if(Quest2.getState&&Quest2.getState()==='after_decision')return false;
      if(Quest2.isBedBroken&&Quest2.isBedBroken())return false;
    }
    if(isQuest2HidePhase()||isIndoorDoorLocked())return false;
    return hideUnderBed(pl);
  }

  function updatePunchVisual(icon,label,active){
    const punchBtn=typeof document!=='undefined'?document.getElementById('punch'):null;
    const punchLbl=typeof document!=='undefined'?document.getElementById('punch-label'):null;
    if(punchLbl&&label!=null)punchLbl.textContent=label;
    if(punchBtn){
      if(punchBtn.firstChild&&punchBtn.firstChild.nodeType===3){
        punchBtn.firstChild.nodeValue=icon||'✊';
      }
      if(punchBtn.classList&&typeof punchBtn.classList.toggle==='function'){
        punchBtn.classList.toggle('interact-ready',Boolean(active));
      }
    }
  }

  function pointBlocked(x,y){
    // Allow walking into the bottom doorway alcove (x: 300..400, y: 384..432)
    const inDoorAlcove=x>=300&&x<=400&&y>=384&&y<=432;
    if(!inDoorAlcove&&(x<74||x>630||y<158||y>408))return true;
    for(const [bx,by,bw,bh]of BOXES){
      if(x>=bx&&x<=bx+bw&&y>=by&&y<=by+bh)return true;
    }
    return false;
  }

  function canWalk(x,y){
    if(pose!=='none')return false;
    return !(pointBlocked(x,y)||pointBlocked(x+4,y)||pointBlocked(x-4,y)||pointBlocked(x,y+4)||pointBlocked(x,y-4));
  }

  function restoreAfterLoad(pArg,savedPose='none'){
    const pl=resolvePlayer(pArg);
    if(!pl)return false;
    inside=true;
    cooldown=0.45;
    pose='none';
    poseCooldown=0;
    sleepTimer=0;
    sleptDayAdvanced=false;
    requireReleaseBeforeMoveExit=false;
    nearProp=null;
    const nearBed=pl.x>=470&&pl.x<=626&&pl.y>=114&&pl.y<=220;
    const nearTable=pl.x>=268&&pl.x<=414&&pl.y>=258&&pl.y<=332;
    const nearWardrobe=pl.x>=80&&pl.x<=178&&pl.y>=94&&pl.y<=196;
    const nearJar=pl.x>=570&&pl.x<=622&&pl.y>=358&&pl.y<=408;
    if(savedPose==='sleeping'||savedPose==='hiding_bed'||nearBed){
      pl.x=532;pl.y=232;
    }else if(savedPose==='sitting'||nearTable){
      pl.x=341;pl.y=342;
    }else if(savedPose==='hiding_wardrobe'||nearWardrobe){
      pl.x=129;pl.y=206;
    }else if(savedPose==='hiding_jar'||nearJar){
      pl.x=556;pl.y=356;
    }
    if(!canWalk(pl.x,pl.y)){
      const ox=Number.isFinite(pl.x)?pl.x:INT_SPAWN.x;
      const oy=Number.isFinite(pl.y)?pl.y:INT_SPAWN.y;
      let found=false;
      for(let radius=8;radius<=320&&!found;radius+=8){
        for(let dx=-radius;dx<=radius&&!found;dx+=8){
          for(const dy of [-radius,radius]){
            if(canWalk(ox+dx,oy+dy)){
              pl.x=ox+dx;pl.y=oy+dy;found=true;break;
            }
          }
        }
        for(let dy=-radius+8;dy<radius&&!found;dy+=8){
          for(const dx of [-radius,radius]){
            if(canWalk(ox+dx,oy+dy)){
              pl.x=ox+dx;pl.y=oy+dy;found=true;break;
            }
          }
        }
      }
      if(!found){pl.x=INT_SPAWN.x;pl.y=INT_SPAWN.y;}
    }
    pl.walk=0;
    return canWalk(pl.x,pl.y);
  }

  function showToast(msg){
    bannerText=msg;
    bannerTimer=3.8;
    const el=document.getElementById('toast');
    if(!el)return;
    el.textContent=msg;
    el.style.opacity=1;
    clearTimeout(el._hideTimer);
    el._hideTimer=setTimeout(()=>{el.style.opacity=0},3600);
  }

  function resolvePlayer(pArg){
    if(pArg&&typeof pArg.hp!=='undefined'&&typeof pArg.x==='number')return pArg;
    if(typeof p!=='undefined'&&p&&typeof p.hp!=='undefined')return p;
    return pArg;
  }

  function enter(pArg){
    const pl=resolvePlayer(pArg);
    inside=true;
    cooldown=0.45;
    pose='none';
    poseCooldown=0;
    sleepTimer=0;
    if(pl){
      pl.x=INT_SPAWN.x;
      pl.y=INT_SPAWN.y;
      pl.dir='up';
      pl.walk=0;
    }
    const d=document.getElementById('dialog');
    if(d)d.hidden=true;
    showToast('Nhà Tiểu Phàm — Nhấn vào bàn gỗ để ngồi, giường gỗ để nằm ngủ qua ngày mới.');
  }

  function exit(pArg){
    const pl=resolvePlayer(pArg);
    inside=false;
    cooldown=0.45;
    pose='none';
    poseCooldown=0;
    sleepTimer=0;
    if(pl){
      pl.x=EXT_SPAWN.x;
      pl.y=EXT_SPAWN.y;
      pl.dir='down';
      pl.walk=0;
    }
    nearProp=null;
    syncBedHideButton(null);
    updatePunchVisual('✊','ĐẤM',false);
    const d=document.getElementById('dialog');
    if(d)d.hidden=true;
    if(typeof Quest2!=='undefined'&&Quest2.onPlayerExitHome){
      Quest2.onPlayerExitHome(pl);
    }
    if(typeof Quest2!=='undefined'&&Quest2.isVillageRuined&&Quest2.isVillageRuined()){
      if(typeof Quest3!=='undefined'&&Quest3.triggerFromDawn&&(!Quest3.isStarted||!Quest3.isStarted())){
        Quest3.triggerFromDawn(pl,true);
      }
      return;
    }
    showToast('Ra sân làng — Xóm nhà Tiểu Phàm.');
  }

  function sitAtTable(pArg){
    const pl=resolvePlayer(pArg);
    if(!pl)return;
    pose='sitting';
    poseCooldown=0.35;
    requireReleaseBeforeMoveExit=true;
    pl.x=341;
    pl.y=268;
    pl.dir='down';
    pl.walk=0;
    showToast('Tiểu Phàm ngồi xuống bàn gỗ mộc, thưởng thức chén trà ấm.');
  }

  function standFromTable(pArg){
    const pl=resolvePlayer(pArg);
    if(!pl)return;
    pose='none';
    poseCooldown=0.25;
    requireReleaseBeforeMoveExit=false;
    pl.x=341;
    pl.y=342;
    pl.dir='down';
    pl.walk=0;
    showToast('Tiểu Phàm đứng dậy khỏi bàn gỗ.');
  }

  function hideInJar(pArg){
    const pl=resolvePlayer(pArg);
    if(!pl)return false;
    if(typeof Quest2!=='undefined'&&Quest2.isJarBroken&&Quest2.isJarBroken()){
      showToast('Chiếc chum sành đã bị đập vỡ toác, nước mưa tràn lênh láng.');
      return false;
    }
    pose='hiding_jar';
    poseCooldown=0.4;
    jarAnimTimer=0.4;
    requireReleaseBeforeMoveExit=true;
    pl.x=596;
    pl.y=381;
    pl.dir='down';
    pl.walk=0;
    showToast('Tiểu Phàm thu mình nấp kín vào trong chiếc chum nước mát lạnh, đậy nắp gỗ lại.');
    return true;
  }

  function exitJar(pArg){
    const pl=resolvePlayer(pArg);
    if(!pl)return false;
    pose='none';
    poseCooldown=0.25;
    jarAnimTimer=0;
    requireReleaseBeforeMoveExit=false;
    pl.x=556;
    pl.y=356;
    pl.dir='left';
    pl.walk=0;
    showToast('Tiểu Phàm đẩy nắp gỗ, trèo ra khỏi chum nước.');
    return true;
  }

  function hideInWardrobe(pArg){
    const pl=resolvePlayer(pArg);
    if(!pl)return false;
    if(typeof Quest2!=='undefined'&&Quest2.isWardrobeBroken&&Quest2.isWardrobeBroken()){
      showToast('Tủ quần áo đã bị móng vuốt Liệp Ma cào xé tan hoang.');
      return false;
    }
    pose='hiding_wardrobe';
    poseCooldown=0.4;
    wardrobeAnimTimer=0.6;
    wardrobeAnimMode='open_close';
    requireReleaseBeforeMoveExit=true;
    pl.x=129;
    pl.y=186;
    pl.dir='down';
    pl.walk=0;
    showToast('Tiểu Phàm mở cánh tủ gỗ, lách mình trốn kín vào trong tủ quần áo.');
    return true;
  }

  function exitWardrobe(pArg){
    const pl=resolvePlayer(pArg);
    if(!pl)return false;
    pose='none';
    poseCooldown=0.25;
    wardrobeAnimTimer=0.5;
    wardrobeAnimMode='open_close';
    requireReleaseBeforeMoveExit=false;
    pl.x=129;
    pl.y=206;
    pl.dir='down';
    pl.walk=0;
    showToast('Tiểu Phàm đẩy cánh tủ gỗ bước ra ngoài.');
    return true;
  }

  function hideUnderBed(pArg){
    const pl=resolvePlayer(pArg);
    if(!pl)return false;
    if(typeof Quest2!=='undefined'&&Quest2.isBedBroken&&Quest2.isBedBroken()){
      showToast('Giường gỗ đã bị Liệp Ma đập sập hoàn toàn, không thể chui xuống gầm.');
      return false;
    }
    pose='hiding_bed';
    poseCooldown=0.4;
    bedAnimTimer=0.4;
    requireReleaseBeforeMoveExit=true;
    pl.x=548;
    pl.y=198;
    pl.dir='down';
    pl.walk=0;
    showToast('Tiểu Phàm cúi người chui tọt xuống nấp dưới gầm chiếc giường gỗ.');
    return true;
  }

  function exitBed(pArg){
    const pl=resolvePlayer(pArg);
    if(!pl)return false;
    pose='none';
    poseCooldown=0.25;
    bedAnimTimer=0;
    requireReleaseBeforeMoveExit=false;
    pl.x=532;
    pl.y=232;
    pl.dir='down';
    pl.walk=0;
    showToast('Tiểu Phàm chui ra khỏi gầm giường gỗ.');
    return true;
  }

  function onQuestHideSpot(spotId,pArg){
    const pl=resolvePlayer(pArg);
    pose='none';
    poseCooldown=0;
    requireReleaseBeforeMoveExit=false;
    if(spotId==='wardrobe'){
      wardrobeAnimTimer=0.6;
      wardrobeAnimMode='open_close';
    }else if(spotId==='jar'){
      jarAnimTimer=0.4;
    }else if(spotId==='bed'){
      bedAnimTimer=0.4;
    }
    if(pl)pl.walk=0;
  }

  function isExamReadyNow(){
    if(typeof Quest1==='undefined')return false;
    const s=Quest1.getState?Quest1.getState():'';
    if(s==='completed'||s==='declined'||s==='considering'||s==='chief_approaching')return false;
    const curDay=typeof Villagers!=='undefined'&&Villagers.day?Villagers.day:1;
    const registeredDay=Quest1.registeredDay;
    return s==='selection_ready'||((s==='registered'||s==='awaiting_selection')&&registeredDay!=null&&curDay>=Math.max(3,registeredDay+2));
  }

  function sleepInBed(pArg){
    const pl=resolvePlayer(pArg);
    if(!pl)return;
    if(typeof Quest2!=='undefined'&&Quest2.getState&&Quest2.getState()==='ready_to_rest'){
      if(typeof ANguyetStory!=='undefined'&&ANguyetStory.getStage){
        const anStage=ANguyetStory.getStage();
        if(['invitation','escort','ahead','waiting','garden'].includes(anStage)){
          showToast('A Nguyệt đang đợi ở Vườn Hoa Phía Đông! Hãy đến gặp nàng trước khi về ngủ.');
          return;
        }
      }
      pose='sleeping';
      poseCooldown=0.45;
      sleepTimer=0;
      requireReleaseBeforeMoveExit=true;
      pl.x=548;
      pl.y=160;
      pl.dir='left';
      pl.walk=0;
      Quest2.triggerRestAtHome(pl);
      return;
    }
    if(isExamReadyNow()){
      showToast('Hôm nay là Ngày Khảo Nghiệm Linh Căn! Tiên nhân đang ở quảng trường làng, mau tới dự tuyển chọn!');
      return;
    }
    if(poseCooldown>0)return;
    pose='sleeping';
    poseCooldown=0.45;
    sleepTimer=0;
    sleptDayAdvanced=false;
    requireReleaseBeforeMoveExit=true;
    pl.x=548;
    pl.y=160;
    pl.dir='left';
    pl.walk=0;
    pl.hp=pl.maxHp||100;
    showToast('Tiểu Phàm nằm xuống chiếc giường gỗ đơn sơ, ngủ một giấc qua ngày hôm sau...');
  }

  // Quest 2 controls the midnight cutscene, without triggering ordinary next-day sleep.
  function wakeForQuest(pArg){
    const pl=resolvePlayer(pArg);
    inside=true;
    pose='none';
    poseCooldown=0;
    sleepTimer=0;
    sleptDayAdvanced=false;
    requireReleaseBeforeMoveExit=false;
    if(pl){
      pl.x=532;pl.y=232;pl.dir='down';pl.walk=0;
    }
  }

  function wakeFromBed(pArg){
    const pl=resolvePlayer(pArg);
    if(!pl)return;
    if(!sleptDayAdvanced&&typeof Villagers!=='undefined'&&Villagers.sleepToNextDay){
      Villagers.sleepToNextDay();
      sleptDayAdvanced=true;
    }
    pose='none';
    poseCooldown=1.0;
    sleepTimer=0;
    requireReleaseBeforeMoveExit=false;
    pl.x=532;
    pl.y=232;
    pl.dir='down';
    pl.walk=0;
    pl.hp=pl.maxHp||100;
    const d=typeof Villagers!=='undefined'?Villagers.day:2;
    if(d===2){
      bannerText='';
      bannerTimer=0;
      const tEl=document.getElementById('toast');
      if(tEl){tEl.textContent='';tEl.style.opacity='0';}
      const dEl=document.getElementById('dialog');
      if(dEl)dEl.hidden=true;
    }else if(isExamReadyNow()){
      showToast('☀️ Trời đã sáng! Hôm nay chính là Ngày Khảo Nghiệm Linh Căn! Mau ra quảng trường tham gia tuyển chọn!');
      const dEl=document.getElementById('dialog'),title=document.getElementById('dialog-title'),body=document.getElementById('dialog-body');
      if(dEl&&title&&body){
        dEl.hidden=false;
        title.textContent='🔔 Ngày Khảo Nghiệm Linh Căn Đã Đến!';
        body.innerHTML='Tiếng chuông ngân vang dội khắp Làng Du Lãm! Tiên nhân phái Thanh Vân đã ngự kiếm giáng lâm.<br><br>Trưởng làng và các thiếu niên đã tề tựu đông đủ tại Quảng Trường Làng.<br><br><button id="go-square-modal-btn" style="display:block;width:100%;margin-top:14px;padding:12px 16px;background:linear-gradient(135deg,#c48c3a,#96621e);color:#fff;font-weight:bold;font-size:14px;border:1px solid #fed285;border-radius:6px;cursor:pointer;">Đã rõ, mau đi bộ ra Quảng Trường Làng ➔</button>';
        const goBtn=document.getElementById('go-square-modal-btn');
        if(goBtn){
          goBtn.onclick=()=>{
            dEl.hidden=true;
          };
        }
      }
    }else{
      showToast('Tiểu Phàm thức dậy khỏe khoắn — Chào buổi sáng Ngày '+d+'!');
    }
  }

  function isQuest2HidePhase(){
    if(typeof Quest2==='undefined'||!Quest2.getState)return false;
    return ['midnight_wake','window_shadow','countdown_hide'].includes(Quest2.getState());
  }

  function isIndoorDoorLocked(){
    if(typeof Quest2==='undefined'||!Quest2.getState)return false;
    const st=Quest2.getState();
    return ['sleeping_start','midnight_wake','window_shadow','hiding_jar','wait_until_dawn','time_skip_dawn','attack_bed','attack_wardrobe','attack_door_early','attack_timeout','death_screen'].includes(st);
  }

  function checkTransition(p,dx,dy,dt){
    cooldown=Math.max(0,cooldown-(dt||0.016));
    if(cooldown>0)return false;
    if(!inside){
      if (typeof Quest2 !== 'undefined' &&
          ((Quest2.isVillageRuined && Quest2.isVillageRuined()) ||
           (Quest2.isNavigationLocked && Quest2.isNavigationLocked()))) return false;
      if(p.x>=202&&p.x<=241&&p.y>=284&&p.y<=302&&(dy<-0.05||p.y<=298)){
        enter(p);
        return true;
      }
    }else{
      if(pose!=='none')return false;
      if(p.x>=300&&p.x<=400&&p.y>=410&&(dy>0.05||p.y>=416)){
        if (isQuest2HidePhase()) {
          Quest2.chooseHideSpot('door',p);
          return true;
        }
        if (isIndoorDoorLocked()) return false;
        exit(p);
        if(isExamReadyNow()){
          showToast('Mau tự đi bộ đến Quảng Trường Làng tham gia khảo nghiệm!');
        }
        return true;
      }
    }
    return false;
  }

  function updateInterior(pArg,dt=0.016,movingInput=false){
    if(!inside){nearProp=null;return}
    const pl=resolvePlayer(pArg);
    poseCooldown=Math.max(0,poseCooldown-dt);
    bannerTimer=Math.max(0,bannerTimer-dt);
    if(!movingInput){
      requireReleaseBeforeMoveExit=false;
    }
    if(wardrobeAnimTimer>0){
      wardrobeAnimTimer=Math.max(0,wardrobeAnimTimer-dt);
    }
    if(jarAnimTimer>0){
      jarAnimTimer=Math.max(0,jarAnimTimer-dt);
    }
    if(bedAnimTimer>0){
      bedAnimTimer=Math.max(0,bedAnimTimer-dt);
    }
    const isWBroken=(typeof Quest2!=='undefined'&&Quest2.isWardrobeBroken&&Quest2.isWardrobeBroken());
    if(isWBroken){
      wardrobeBrokenTime+=dt;
    }else{
      wardrobeBrokenTime=0;
    }
    const isBBroken=(typeof Quest2!=='undefined'&&Quest2.isBedBroken&&Quest2.isBedBroken());
    if(isBBroken){
      bedBrokenTime+=dt;
    }else{
      bedBrokenTime=0;
    }

    const canExitPoseByMove=movingInput&&!requireReleaseBeforeMoveExit&&poseCooldown<=0;
    if(pose==='sleeping' && !(typeof Quest2!=='undefined' && Quest2.getState && Quest2.getState()==='sleeping_start')){
      sleepTimer+=dt;
      if(sleepTimer>=0.6&&!sleptDayAdvanced){
        sleptDayAdvanced=true;
        const newDay=(typeof Villagers!=='undefined'&&Villagers.sleepToNextDay)?Villagers.sleepToNextDay():2;
        if(newDay===2){
          bannerText='';
          bannerTimer=0;
          const tEl=document.getElementById('toast');
          if(tEl){tEl.textContent='';tEl.style.opacity='0';}
        }else if(isExamReadyNow()){
          showToast('🔔 Chuông làng vang lên! Hôm nay chính là Ngày Khảo Nghiệm Linh Căn! Mau dậy đến quảng trường!');
        }else{
          const st=(typeof Villagers!=='undefined'&&Villagers.cropStage)?Villagers.cropStage(newDay):{stage:1,short:'Mùa mới'};
          showToast('Trời đã sáng! Bước sang Ngày '+newDay+' (Vụ '+st.stage+'/7: '+st.short+') — Chào buổi sáng!');
        }
      }
      if((sleepTimer>=1.2||(canExitPoseByMove&&sleepTimer>=0.2))&&poseCooldown<=0){
        wakeFromBed(pl);
      }
    }else if(pose==='sitting'){
      if(canExitPoseByMove){
        standFromTable(pl);
      }
    }else if(pose==='hiding_jar'){
      if(canExitPoseByMove){
        exitJar(pl);
      }
    }else if(pose==='hiding_wardrobe'){
      if(canExitPoseByMove){
        exitWardrobe(pl);
      }
    }else if(pose==='hiding_bed'){
      if(canExitPoseByMove){
        exitBed(pl);
      }
    }

    nearProp=(pose==='none'&&pl)?computeNearProp(pl):null;
    syncBedHideButton(pl);

    const isQ2Hide = isQuest2HidePhase();
    const isQ2AfterJar = typeof Quest2 !== 'undefined' && Quest2.getState && Quest2.getState() === 'after_decision';
    const isJBroken = typeof Quest2 !== 'undefined' && Quest2.isJarBroken && Quest2.isJarBroken();
    const nearDoor = !nearProp && pose==='none' && pl && pl.x>=290 && pl.x<=410 && pl.y>=370 && (!isIndoorDoorLocked() || isQ2Hide);

    const talkBtn=document.getElementById('talk');
    if(talkBtn){
      if(isQ2AfterJar){
        talkBtn.hidden=false;
        talkBtn.textContent='Trèo ra khỏi chum';
      }else if(isQ2Hide){
        if(nearProp&&(nearProp.id==='wardrobe'||nearProp.id==='clothes'||nearProp.id==='bed'||nearProp.id==='jar')){
          talkBtn.hidden=false;
          talkBtn.textContent=(nearProp.id==='wardrobe'||nearProp.id==='clothes')?'Trốn vào Tủ Quần Áo':nearProp.id==='bed'?'Chui xuống Gầm Giường':'Nấp vào Chum Nước';
        }else if(nearDoor){
          talkBtn.hidden=false;
          talkBtn.textContent='Chạy ra Cửa Chính';
        }else{
          talkBtn.hidden=true;
        }
      }else{
        talkBtn.hidden=pose==='none'&&!nearProp&&!nearDoor;
        if(pose==='sitting')talkBtn.textContent='Đứng dậy khỏi bàn';
        else if(pose==='sleeping')talkBtn.textContent='Thức dậy';
        else if(pose==='hiding_jar')talkBtn.textContent='Trèo ra khỏi chum';
        else if(pose==='hiding_wardrobe')talkBtn.textContent='Chui ra khỏi tủ';
        else if(pose==='hiding_bed')talkBtn.textContent='Chui ra khỏi gầm giường';
        else if(nearProp){
          talkBtn.textContent=
            nearProp.id==='wardrobe'?(isWBroken?'Xem tủ quần áo vỡ':'Trốn vào Tủ Quần Áo')
            :nearProp.id==='clothes'?'Thay trang phục'
            :nearProp.id==='bed'?(isBBroken?'Xem giường gỗ vỡ':'Nằm ngủ trên giường')
            :nearProp.id==='stove'?'Sưởi ấm bếp than'
            :nearProp.id==='jar'?(isJBroken?'Xem chum nước vỡ':'Nấp vào Chum Nước')
            :'Ngồi vào bàn gỗ';
        }else if(nearDoor){
          talkBtn.textContent='Bước ra sân làng';
        }
      }
    }

    if(isQ2AfterJar){
      updatePunchVisual('⬆️','TRÈO RA',true);
    }else if(isQ2Hide){
      if(nearProp&&(nearProp.id==='wardrobe'||nearProp.id==='clothes')) updatePunchVisual('🚪','TRỐN TỦ',true);
      else if(nearProp&&nearProp.id==='bed') updatePunchVisual('🛏️','CHUI GẦM',true);
      else if(nearProp&&nearProp.id==='jar') updatePunchVisual('🏺','NẤP CHUM',true);
      else if(nearDoor) updatePunchVisual('🚪','RA CỬA',true);
      else updatePunchVisual('✊','ĐẤM',false);
    }else if(pose==='sitting'){
      updatePunchVisual('⬆️','ĐỨNG DẬY',true);
    }else if(pose==='sleeping'){
      updatePunchVisual('☀️','THỨC DẬY',true);
    }else if(pose==='hiding_jar'){
      updatePunchVisual('⬆️','TRÈO RA',true);
    }else if(pose==='hiding_wardrobe'){
      updatePunchVisual('⬆️','RA KHỎI TỦ',true);
    }else if(pose==='hiding_bed'){
      updatePunchVisual('⬆️','CHUI RA',true);
    }else if(nearProp){
      if(nearProp.id==='wardrobe') updatePunchVisual(isWBroken?'🔍':'🚪',isWBroken?'TỦ VỠ':'TRỐN TỦ',true);
      else if(nearProp.id==='clothes') updatePunchVisual('👕','THAY ĐỒ',true);
      else if(nearProp.id==='bed') updatePunchVisual(isBBroken?'🔍':'🛏️',isBBroken?'GIƯỜNG VỠ':'NẰM NGỦ',true);
      else if(nearProp.id==='stove') updatePunchVisual('🔥','SƯỞI ẤM',true);
      else if(nearProp.id==='jar') updatePunchVisual(isJBroken?'🔍':'🏺',isJBroken?'CHUM VỠ':'NẤP CHUM',true);
      else updatePunchVisual('🍵','NGỒI BÀN',true);
    }else if(nearDoor){
      updatePunchVisual('🚪','RA SÂN',true);
    }else{
      const cdLbl=(pl&&pl.attackCooldown>0)?pl.attackCooldown.toFixed(1)+'s':'ĐẤM';
      updatePunchVisual('✊',cdLbl,false);
    }
  }

  function interact(pArg){
    if(!inside)return false;
    const pl=resolvePlayer(pArg);
    if(pose==='none'&&pl){
      nearProp=computeNearProp(pl);
    }
    if(typeof Quest2!=='undefined'&&Quest2.getState){
      const q2St=Quest2.getState();
      if(isQuest2HidePhase()){
        if(nearProp&&(nearProp.id==='wardrobe'||nearProp.id==='clothes')){Quest2.chooseHideSpot('wardrobe',pl);return true;}
        if(nearProp&&nearProp.id==='bed'){Quest2.chooseHideSpot('bed',pl);return true;}
        if(nearProp&&nearProp.id==='jar'){Quest2.chooseHideSpot('jar',pl);return true;}
        if(pl&&pl.y>=370&&pl.x>=290&&pl.x<=410){Quest2.chooseHideSpot('door',pl);return true;}
      }else if(q2St==='after_decision'){
        if(Quest2.startVillageChase){Quest2.startVillageChase(pl);return true;}
      }
    }
    if(pose==='sitting'){
      standFromTable(pl);
      return true;
    }
    if(pose==='sleeping'){
      if(sleepTimer>=0.2)wakeFromBed(pl);
      return true;
    }
    if(pose==='hiding_jar'){
      exitJar(pl);
      return true;
    }
    if(pose==='hiding_wardrobe'){
      exitWardrobe(pl);
      return true;
    }
    if(pose==='hiding_bed'){
      exitBed(pl);
      return true;
    }
    if(!nearProp){
      if(pl&&pl.x>=290&&pl.x<=410&&pl.y>=370&&!isIndoorDoorLocked()){
        exit(pl);
        return true;
      }
      return false;
    }
    if(nearProp.id==='jar'){
      const jBroken=typeof Quest2!=='undefined'&&Quest2.isJarBroken&&Quest2.isJarBroken();
      if(jBroken){
        showToast('Chiếc chum sành đã bị đập vỡ toác, nước mưa tràn lênh láng.');
        return true;
      }
      return hideInJar(pl);
    }
    if(nearProp.id==='wardrobe'){
      if(typeof Quest2!=='undefined'&&Quest2.isWardrobeBroken&&Quest2.isWardrobeBroken()){
        showToast('Tủ quần áo đã bị móng vuốt Liệp Ma cào xé tan hoang.');
        return true;
      }
      return hideInWardrobe(pl);
    }
    if(nearProp.id==='clothes'){
      const pal=TieuPham.applyOutfit(TieuPham.outfitIdx+1);
      const d=document.getElementById('dialog'),title=document.getElementById('dialog-title'),body=document.getElementById('dialog-body');
      if(d&&title&&body){
        d.hidden=false;
        title.textContent='Sạp quần áo & Trang phục';
        body.textContent='Trên giá trúc treo mấy bộ quần áo vải thô giản dị được giặt giũ sạch sẽ, xếp gọn gàng.\n\nTiểu Phàm vừa khoác thử: '+pal.name+'.';
      }
      showToast('Đã thay trang phục: '+pal.name);
      return true;
    }
    if(nearProp.id==='bed'){
      if(typeof Quest2!=='undefined'&&Quest2.isBedBroken&&Quest2.isBedBroken()){
        showToast('Giường gỗ đã bị Liệp Ma đập sập hoàn toàn, không thể nằm nghỉ hay chui xuống gầm.');
        return true;
      }
      sleepInBed(pl);
      return true;
    }
    if(nearProp.id==='table'){
      sitAtTable(pl);
      return true;
    }
    if(nearProp.id==='stove'){
      showToast('Bếp than hồng ấm áp xua tan cái giá lạnh vùng thôn dã.');
      return true;
    }
    return false;
  }

  function handleCanvasClick(rx,ry,pArg){
    if(!inside)return false;
    const pl=resolvePlayer(pArg);
    if(typeof Quest2!=='undefined'&&Quest2.getState){
      const q2St=Quest2.getState();
      if(isQuest2HidePhase()){
        if(rx>=550&&rx<=640&&ry>=320&&ry<=415){Quest2.chooseHideSpot('jar',pl);return true;}
        if(rx>=460&&rx<=636&&ry>=85&&ry<=230){Quest2.chooseHideSpot('bed',pl);return true;}
        if(rx>=68&&rx<=330&&ry>=65&&ry<=202){Quest2.chooseHideSpot('wardrobe',pl);return true;}
        if(rx>=280&&rx<=420&&ry>=370&&ry<=460){Quest2.chooseHideSpot('door',pl);return true;}
      }else if(q2St==='after_decision'){
        if((rx>=540&&rx<=640&&ry>=320&&ry<=420)||(rx>=280&&rx<=420&&ry>=370&&ry<=460)){
          if(Quest2.startVillageChase){Quest2.startVillageChase(pl);return true;}
        }
        return false;
      }
    }
    if(pose==='sleeping'){
      if(sleepTimer>=0.2)wakeFromBed(pl);
      return true;
    }
    if(pose==='hiding_jar'){
      exitJar(pl);
      return true;
    }
    if(pose==='hiding_wardrobe'){
      exitWardrobe(pl);
      return true;
    }
    if(pose==='hiding_bed'){
      exitBed(pl);
      return true;
    }
    if(rx>=244&&rx<=438&&ry>=235&&ry<=346){
      if(pose==='sitting')standFromTable(pl);
      else sitAtTable(pl);
      return true;
    }
    if(rx>=460&&rx<=636&&ry>=85&&ry<=230){
      if(typeof Quest2!=='undefined'&&Quest2.isBedBroken&&Quest2.isBedBroken()){
        showToast('Giường gỗ đã bị Liệp Ma đập sập hoàn toàn, không thể nằm nghỉ hay chui xuống gầm.');
        return true;
      }
      sleepInBed(pl);
      return true;
    }
    if(rx>=550&&rx<=640&&ry>=320&&ry<=415){
      const jBroken=typeof Quest2!=='undefined'&&Quest2.isJarBroken&&Quest2.isJarBroken();
      if(jBroken){
        showToast('Chiếc chum sành đã bị đập vỡ toác, nước mưa tràn lênh láng.');
        return true;
      }
      return hideInJar(pl);
    }
    if(rx>=68&&rx<185&&ry>=65&&ry<=202){
      if(typeof Quest2!=='undefined'&&Quest2.isWardrobeBroken&&Quest2.isWardrobeBroken()){
        showToast('Tủ quần áo đã bị móng vuốt Liệp Ma cào xé tan hoang.');
        return true;
      }
      return hideInWardrobe(pl);
    }
    if(rx>=185&&rx<=330&&ry>=65&&ry<=202){
      if(pose!=='none')pose='none';
      if(pl){pl.x=257;pl.y=204;pl.dir='up';pl.walk=0;}
      const pal=TieuPham.applyOutfit(TieuPham.outfitIdx+1);
      showToast('Đã thay trang phục: '+pal.name);
      return true;
    }
    if(rx>=66&&rx<=188&&ry>=252&&ry<=348){
      showToast('Tiểu Phàm sưởi ấm tay bên bếp than hồng và ấm nước ấm cúng.');
      return true;
    }
    if(rx>=280&&rx<=420&&ry>=370&&ry<=460){
      if(isIndoorDoorLocked())return false;
      exit(pl);
      if(isExamReadyNow()&&pl){
        showToast('Mau tự đi bộ đến Quảng Trường Làng tham gia khảo nghiệm!');
      }
      return true;
    }
    return false;
  }

  function drawExteriorDoor(g,p,t){
    g.save();
    g.fillStyle='#5c452d88';
    g.beginPath();
    g.roundRect(206,291,31,10,3);
    g.fill();
    g.fillStyle='#c4a468';
    g.beginPath();
    g.roundRect(208,292,27,8,2);
    g.fill();
    g.strokeStyle='#8f7242';
    g.lineWidth=1;
    for(let x=211;x<233;x+=4){
      g.beginPath();
      g.moveTo(x,293);
      g.lineTo(x,299);
      g.stroke();
    }
    if(p&&Math.hypot(p.x-EXT_DOOR.x,p.y-EXT_DOOR.y)<62){
      const pulse=Math.sin(t*4)*1.8;
      g.fillStyle='#162d23e6';
      g.beginPath();
      g.roundRect(169,204+pulse,104,16,4);
      g.fill();
      g.strokeStyle='#d8c383aa';
      g.lineWidth=1;
      g.stroke();
      g.fillStyle='#f5e6b8';
      g.font='bold 9.5px system-ui';
      g.textAlign='center';
      g.fillText('▲ Nhà của Tiểu Phàm',221,215+pulse);
    }
    g.restore();
  }

  function drawInterior(ctx,p,t,minutes,cam){
    const nightAmt=typeof VillageLighting!=='undefined'?VillageLighting.night(minutes):0;
    const weatherKind=typeof Weather!=='undefined'?Weather.kind:'sun';

    const cX=cam?cam.x:0;
    const cY=cam?cam.y:0;
    const cW=cam?cam.worldW:704;
    const cH=cam?cam.worldH:462;
    const leftX=Math.min(-180,cX-140);
    const rightX=Math.max(884,cX+cW+140);
    const topY=Math.min(-120,cY-120);
    const botY=Math.max(580,cY+cH+120);

    ctx.fillStyle='#16100b';
    ctx.fillRect(leftX,topY,rightX-leftX,botY-topY);

    ctx.fillStyle='#3d5c2a';
    ctx.fillRect(leftX,412,rightX-leftX,botY-412);
    ctx.fillStyle='#9e8a6a';
    ctx.fillRect(296,412,112,botY-412);
    ctx.fillStyle='#826e50';
    for(let sy=418;sy<botY;sy+=16){
      ctx.fillRect(302+((sy*7)%22),sy,18,6);
      ctx.fillRect(352+((sy*11)%26),sy+4,20,7);
    }
    ctx.fillStyle='#f0db7d';
    for(const [fx,fy]of [[140,432],[210,450],[260,426],[440,428],[520,446],[660,430]]){
      ctx.fillRect(fx,fy,3,3);
      ctx.fillRect(fx-2,fy+1,2,2);
      ctx.fillRect(fx+3,fy+1,2,2);
    }

    ctx.fillStyle='#422c19';
    ctx.fillRect(leftX,topY,rightX-leftX,48-topY);
    ctx.fillStyle='#5c3d23';
    for(let ry=topY;ry<46;ry+=14){
      ctx.fillRect(leftX,ry,rightX-leftX,4);
    }
    ctx.fillStyle='#2f1e10';
    ctx.fillRect(leftX,38,rightX-leftX,10);
    ctx.fillStyle='#50341e';
    ctx.fillRect(leftX,41,rightX-leftX,3);

    const isWallBreached = typeof Quest2 !== 'undefined' && Quest2.isWallBroken && Quest2.isWallBroken();

    ctx.fillStyle='#59402b';
    ctx.fillRect(leftX,48,rightX-leftX,104);

    const wallPanels=[
      [leftX+20,Math.max(40,58-leftX-20)],
      [72,162],
      isWallBreached ? [248,54] : [248,208],
      [470,162],
      [646,Math.max(60,rightX-646-20)]
    ];
    for(const [wx,ww]of wallPanels){
      if(ww<=0)continue;
      ctx.fillStyle='#9e8664';
      ctx.fillRect(wx,58,ww,84);
      ctx.fillStyle='#8d7554';
      ctx.fillRect(wx,124,ww,18);
      ctx.fillStyle='#ad9572';
      ctx.fillRect(wx+12,74,Math.min(38,ww-16),3);
      if(ww>50)ctx.fillRect(wx+ww-48,98,32,3);
    }
    ctx.fillStyle='#4c3623';
    ctx.fillRect(leftX,48,isWallBreached ? 302-leftX : rightX-leftX,10);
    ctx.fillRect(leftX,140,isWallBreached ? 302-leftX : rightX-leftX,12);
    if(isWallBreached){
      ctx.fillRect(446,48,rightX-446,10);
      ctx.fillRect(446,140,rightX-446,12);
    }

    const wx=344,wy=68,ww=84,wh=53;
    if(isWallBreached){
      ctx.save();
      const holeX=300,holeY=46,holeW=148,holeH=108;
      ctx.fillStyle='#090d16';
      ctx.fillRect(holeX,holeY,holeW,holeH);

      const skyGrad=ctx.createLinearGradient(holeX,holeY,holeX,holeY+holeH);
      skyGrad.addColorStop(0,'#0d1424');
      skyGrad.addColorStop(0.6,'#1a0f1d');
      skyGrad.addColorStop(1,'#2c0c16');
      ctx.fillStyle=skyGrad;
      ctx.fillRect(holeX,holeY,holeW,holeH);

      const demonMist=ctx.createRadialGradient(holeX+holeW/2,holeY+holeH*0.7,10,holeX+holeW/2,holeY+holeH*0.7,90);
      const mistPulse=0.45+0.2*Math.sin(t*4);
      demonMist.addColorStop(0,`rgba(180, 20, 40, ${mistPulse})`);
      demonMist.addColorStop(0.6,`rgba(110, 10, 25, ${mistPulse*0.6})`);
      demonMist.addColorStop(1,'rgba(20, 0, 10, 0)');
      ctx.fillStyle=demonMist;
      ctx.fillRect(holeX-15,holeY,holeW+30,holeH+20);

      ctx.strokeStyle='rgba(255, 120, 140, 0.4)';
      ctx.lineWidth=1.2;
      for(let i=0;i<4;i++){
        const sx=holeX+15+((i*35+t*80)%110);
        const sy=holeY+18+((i*22)%70);
        ctx.beginPath();
        ctx.moveTo(sx,sy);
        ctx.lineTo(sx+16,sy+12);
        ctx.stroke();
      }

      ctx.fillStyle='#3d2716';
      ctx.beginPath();
      ctx.moveTo(holeX,holeY);
      ctx.lineTo(holeX+12,holeY+18);
      ctx.lineTo(holeX+4,holeY+42);
      ctx.lineTo(holeX+18,holeY+64);
      ctx.lineTo(holeX+8,holeY+88);
      ctx.lineTo(holeX+22,holeY+holeH);
      ctx.lineTo(holeX-6,holeY+holeH);
      ctx.lineTo(holeX-6,holeY);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(holeX+holeW,holeY);
      ctx.lineTo(holeX+holeW-14,holeY+22);
      ctx.lineTo(holeX+holeW-6,holeY+48);
      ctx.lineTo(holeX+holeW-20,holeY+72);
      ctx.lineTo(holeX+holeW-10,holeY+holeH);
      ctx.lineTo(holeX+holeW+6,holeY+holeH);
      ctx.lineTo(holeX+holeW+6,holeY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle='#2c1a0e';
      ctx.beginPath();
      ctx.moveTo(holeX,holeY);
      ctx.lineTo(holeX+40,holeY+14);
      ctx.lineTo(holeX+70,holeY+6);
      ctx.lineTo(holeX+110,holeY+16);
      ctx.lineTo(holeX+holeW,holeY);
      ctx.lineTo(holeX+holeW,holeY-4);
      ctx.lineTo(holeX,holeY-4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle='#7a5534';
      ctx.lineWidth=2.5;
      for(const [gx1,gy1,gx2,gy2] of [
        [holeX+8,holeY+20,holeX+28,holeY+36],
        [holeX+15,holeY+70,holeX+36,holeY+78],
        [holeX+holeW-12,holeY+32,holeX+holeW-34,holeY+46],
        [holeX+holeW-18,holeY+75,holeX+holeW-40,holeY+82],
        [holeX+52,holeY+8,holeX+56,holeY+28],
        [holeX+92,holeY+10,holeX+86,holeY+32]
      ]){
        ctx.beginPath();ctx.moveTo(gx1,gy1);ctx.lineTo(gx2,gy2);ctx.stroke();
      }

      ctx.strokeStyle='#ff1a30';
      ctx.lineWidth=1.8;
      for(let c=0;c<3;c++){
        ctx.beginPath();
        ctx.moveTo(holeX+12+c*5,holeY+34);
        ctx.lineTo(holeX+22+c*5,holeY+62);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(holeX+holeW-30+c*5,holeY+44);
        ctx.lineTo(holeX+holeW-20+c*5,holeY+70);
        ctx.stroke();
      }

      ctx.fillStyle='#22150b55';
      ctx.beginPath();
      ctx.ellipse(374,168,78,20,0,0,Math.PI*2);
      ctx.fill();

      ctx.strokeStyle='#301e12';
      ctx.lineWidth=2;
      for(const [cx1,cy1,cx2,cy2] of [[340,154,320,172],[365,155,360,182],[400,154,425,178],[382,156,392,185]]){
        ctx.beginPath();ctx.moveTo(cx1,cy1);ctx.lineTo(cx2,cy2);ctx.stroke();
      }

      const debris=[
        [296,158,16,11,'#6b4e33'],
        [322,166,22,14,'#573d27'],
        [352,154,28,15,'#755537'],
        [388,160,24,13,'#63472d'],
        [418,156,20,12,'#5c4028'],
        [442,165,15,10,'#705035'],
        [312,176,14,9,'#856242'],
        [340,174,18,11,'#61452c'],
        [374,172,25,12,'#4e3522'],
        [408,175,17,10,'#7d5c3d'],
        [434,178,12,8,'#593f29']
      ];
      for(const [dx,dy,dw,dh,col] of debris){
        ctx.fillStyle='#1c1209';
        ctx.fillRect(dx-1,dy-1,dw+2,dh+2);
        ctx.fillStyle=col;
        ctx.fillRect(dx,dy,dw,dh);
        ctx.fillStyle='#8f6d4b';
        ctx.fillRect(dx+2,dy+2,Math.max(4,dw-6),Math.max(2,dh-6));
      }

      ctx.fillStyle='#3d2716';
      for(const [sx,sy,sw,sh,rot] of [
        [308,162,26,5,0.3],
        [356,170,32,6,-0.2],
        [402,164,28,5,0.4],
        [430,172,22,4,-0.35]
      ]){
        ctx.save();
        ctx.translate(sx,sy);
        ctx.rotate(rot);
        ctx.fillRect(-sw/2,-sh/2,sw,sh);
        ctx.restore();
      }
      ctx.restore();
    }else{
      ctx.fillStyle='#362417';
      ctx.fillRect(wx-4,wy-4,ww+8,wh+8);
      ctx.save();
      ctx.beginPath();
      ctx.rect(wx,wy,ww,wh);
      ctx.clip();
      const skyCol=nightAmt>.5?'#192844':weatherKind==='rain'||weatherKind==='storm'?'#5c7885':'#8ecae6';
      ctx.fillStyle=skyCol;
      ctx.fillRect(wx,wy,ww,wh);
      ctx.fillStyle=nightAmt>.5?'#1c332e':'#4d7c38';
      ctx.beginPath();
      ctx.arc(wx+20,wy+46,20,0,Math.PI*2);
      ctx.arc(wx+64,wy+48,17,0,Math.PI*2);
      ctx.fill();
      if(weatherKind==='rain'||weatherKind==='storm'){
        ctx.strokeStyle='#cbe3f088';
        ctx.lineWidth=1;
        for(let i=0;i<6;i++){
          const rx=wx+8+((i*15+t*40)%68),ry=wy+4+((i*17+t*90)%42);
          ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx-3,ry+7);ctx.stroke();
        }
      }else if(nightAmt>.5){
        ctx.fillStyle='#f7efc2';
        ctx.fillRect(wx+30,wy+13,2,2);
        ctx.fillRect(wx+58,wy+20,2,2);
      }
      ctx.restore();
      ctx.fillStyle='#593f29';
      for(let lx=wx+16.5;lx<wx+ww-4;lx+=16.5)ctx.fillRect(lx,wy,3,wh);
      ctx.fillRect(wx,wy+wh/2-1.5,ww,3);
      ctx.fillStyle='#78583c';
      ctx.fillRect(wx-5,wy+wh,ww+10,5);
    }

    const pillars=[58,235,457,633];
    for(const px of pillars){
      ctx.fillStyle='#3d2716';
      ctx.fillRect(px,46,14,106);
      ctx.fillStyle='#5e3f26';
      ctx.fillRect(px+2,48,4,102);
      ctx.fillStyle='#6b7a70';
      ctx.fillRect(px-2,142,18,12);
      ctx.fillStyle='#88988e';
      ctx.fillRect(px,144,14,4);
    }

    for(const [lx,ly] of [[242,92],[450,92]]){
      ctx.fillStyle='#543d26';
      ctx.fillRect(lx-3,ly-2,6,4);
      ctx.fillStyle='#b8924b';
      ctx.fillRect(lx-4,ly+2,8,9);
      const fPulse=0.7+0.3*Math.sin(t*8+lx);
      ctx.fillStyle=`rgba(255, 185, 75, ${fPulse})`;
      ctx.beginPath();
      ctx.arc(lx,ly+6,3.2,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle='#fff6cc';
      ctx.beginPath();
      ctx.arc(lx,ly+6,1.4,0,Math.PI*2);
      ctx.fill();
    }

    ctx.fillStyle='#8c6b48';
    ctx.fillRect(leftX,152,rightX-leftX,262);
    for(let row=0,fy=152;fy<414;fy+=19,row++){
      const ph=Math.min(18,414-fy);
      ctx.fillStyle=row%2===0?'#8c6b48':'#826240';
      ctx.fillRect(leftX,fy,rightX-leftX,ph);
      ctx.fillStyle='#61482e';
      ctx.fillRect(leftX,fy+ph,rightX-leftX,1);
      const startFx=leftX+((row*47)%110);
      for(let fx=startFx;fx<rightX;fx+=125){
        ctx.fillStyle='#594129';
        ctx.fillRect(fx,fy,2,ph);
        ctx.fillStyle='#9e7b56';
        ctx.fillRect(fx+15,fy+4,28,2);
      }
    }
    ctx.fillStyle='#7d5e3d';
    ctx.fillRect(304,410,96,20);

    ctx.save();
    ctx.fillStyle=nightAmt>.5?'rgba(150,185,235,0.08)':'rgba(255,238,185,0.16)';
    ctx.beginPath();
    ctx.moveTo(wx,wy+wh);
    ctx.lineTo(wx+ww,wy+wh);
    ctx.lineTo(wx+ww+28,252);
    ctx.lineTo(wx-20,252);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle='#5c452d55';
    ctx.beginPath();
    ctx.roundRect(244,242,194,114,6);
    ctx.fill();
    ctx.fillStyle='#c9b079';
    ctx.beginPath();
    ctx.roundRect(246,244,190,110,5);
    ctx.fill();
    ctx.strokeStyle='#8c5a3c';
    ctx.lineWidth=2;
    ctx.strokeRect(248,246,186,106);
    ctx.strokeStyle='#b39860';
    ctx.lineWidth=1;
    for(let mx=258;mx<428;mx+=8){
      ctx.beginPath();ctx.moveTo(mx,248);ctx.lineTo(mx,350);ctx.stroke();
    }

    ctx.save();
    ensureFurnitureImages();
    const isWardrobeShattered=(typeof Quest2!=='undefined'&&Quest2.isWardrobeBroken&&Quest2.isWardrobeBroken());
    ctx.fillStyle='#24180e66';
    ctx.beginPath();
    ctx.ellipse(129,193,52,12,0,0,Math.PI*2);
    ctx.fill();

    if(isWardrobeShattered){
      let wTime=wardrobeBrokenTime;
      if(typeof Quest2!=='undefined'&&Quest2.getState){
        const qst=Quest2.getState();
        const stTimer=Quest2.getStateTimer?Quest2.getStateTimer():0;
        if(qst==='attack_wardrobe'&&stTimer>=2.3){
          wTime=Math.max(wTime,stTimer-2.3);
        }
      }
      const frameIdx=Math.min(5,Math.floor(wTime*9));
      if(furImgs.wardrobeDestroy){
        ctx.drawImage(furImgs.wardrobeDestroy,frameIdx*160,0,160,160,70,72,118,122);
      }
    }else{
      let frameIdx=0;
      if(wardrobeAnimTimer>0){
        if(wardrobeAnimMode==='open_close'){
          const prog=1-(wardrobeAnimTimer/0.6);
          const seq=[0,1,2,3,2,1,0];
          const idx=Math.min(seq.length-1,Math.max(0,Math.floor(prog*seq.length)));
          frameIdx=seq[idx];
        }else{
          const prog=1-(wardrobeAnimTimer/0.8);
          frameIdx=Math.min(3,Math.floor(prog*4));
        }
      }
      if(furImgs.wardrobeSheet){
        ctx.drawImage(furImgs.wardrobeSheet,frameIdx*192,0,192,192,70,72,118,122);
      }
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle='#24180e55';
    ctx.beginPath();
    ctx.ellipse(257,188,68,11,0,0,Math.PI*2);
    ctx.fill();
    if(furImgs.clothesRack){
      ctx.drawImage(furImgs.clothesRack,186,88,142,104);
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle='#22160d66';
    ctx.beginPath();
    ctx.ellipse(122,344,54,13,0,0,Math.PI*2);
    ctx.fill();
    if(furImgs.stove){
      ctx.drawImage(furImgs.stove,66,252,122,94);
    }
    ctx.strokeStyle='rgba(255, 245, 220, 0.42)';
    ctx.lineWidth=1.1;
    for(let i=0;i<2;i++){
      const sy=280-((t*10+i*8)%12);
      const sx=96+Math.sin(t*3+i*2)*1.8;
      ctx.beginPath();
      ctx.moveTo(sx,sy);
      ctx.quadraticCurveTo(sx+2.5,sy-3.5,sx-1,sy-7);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    const isBedShattered=(typeof Quest2!=='undefined'&&Quest2.isBedBroken&&Quest2.isBedBroken());
    const isHidingUnderBed=pose==='hiding_bed'||((typeof Quest2!=='undefined'&&Quest2.isHidingUnderBed)?Quest2.isHidingUnderBed():false);
    ctx.fillStyle='#22170e66';
    ctx.beginPath();
    ctx.ellipse(549,216,82,16,0,0,Math.PI*2);
    ctx.fill();

    if(isBedShattered){
      let bTime=bedBrokenTime;
      if(typeof Quest2!=='undefined'&&Quest2.getState){
        const qst=Quest2.getState();
        const stTimer=Quest2.getStateTimer?Quest2.getStateTimer():0;
        if(qst==='attack_bed'&&stTimer>=2.3){
          bTime=Math.max(bTime,stTimer-2.3);
        }
      }
      const frameIdx=Math.min(5,Math.floor(bTime*9));
      if(furImgs.bedDestroy){
        ctx.drawImage(furImgs.bedDestroy,frameIdx*160,0,160,160,466,96,162,124);
      }
    }else{
      let frameIdx=0;
      if(pose==='sleeping'){
        frameIdx=3;
      }else if(isHidingUnderBed&&bedAnimTimer>0){
        frameIdx=bedAnimTimer>0.2?2:1;
      }
      if(furImgs.bedSheet){
        ctx.drawImage(furImgs.bedSheet,frameIdx*192,0,192,192,466,96,162,124);
      }
      if(pose==='sleeping'){
        TieuPham.drawSleeping(ctx,548,160,t);
      }
    }
    ctx.restore();

    ctx.save();
    const qState=(typeof Quest2!=='undefined'&&Quest2.getState)?Quest2.getState():'';
    const isHidingInJar=pose==='hiding_jar'||((typeof Quest2!=='undefined'&&Quest2.isHidingInJar)?Quest2.isHidingInJar():(qState==='hiding_jar'||qState==='after_decision'||qState==='time_skip_dawn'));
    ctx.fillStyle='#1f140b66';
    ctx.beginPath();
    ctx.ellipse(596,397,26,10,0,0,Math.PI*2);
    ctx.fill();

    let jarFrameIdx=0;
    if(isHidingInJar){
      if(jarAnimTimer>0){
        const prog=1-(jarAnimTimer/0.4);
        jarFrameIdx=Math.min(3,Math.max(0,Math.floor(prog*4)));
      }else{
        jarFrameIdx=3;
      }
    }
    if(furImgs.jarSheet){
      ctx.drawImage(furImgs.jarSheet,jarFrameIdx*192,0,192,192,564,338,64,64);
    }
    ctx.restore();

    const drawTableAndProps=()=>{
      ctx.save();
      ctx.fillStyle='#22170e55';
      ctx.beginPath();
      ctx.ellipse(341,326,68,14,0,0,Math.PI*2);
      ctx.fill();
      if(furImgs.table){
        ctx.drawImage(furImgs.table,271,254,140,78);
      }
      if(furImgs.candleFrames&&furImgs.candleFrames.length===8){
        const candleIdx=Math.floor(t*7)%8;
        const candleImg=furImgs.candleFrames[candleIdx];
        if(candleImg){
          ctx.drawImage(candleImg,358,243,26,35);
        }
      }
      ctx.restore();
    };

    const isHidingInWardrobe=pose==='hiding_wardrobe'||((typeof Quest2!=='undefined'&&Quest2.isHidingInWardrobe)?Quest2.isHidingInWardrobe():false);
    const isHiddenInside=Boolean(isHidingInJar||isHidingInWardrobe||isHidingUnderBed);

    if(isHiddenInside){
      drawTableAndProps();
    }else if(pose==='sitting'){
      TieuPham.drawSitting(ctx,p,t);
      drawTableAndProps();
    }else if(pose==='sleeping'){
      drawTableAndProps();
    }else if(p.y<302){
      TieuPham.draw(ctx,p,t);
      drawTableAndProps();
    }else{
      drawTableAndProps();
      TieuPham.draw(ctx,p,t);
    }

    ctx.fillStyle='#3b2a1d';
    ctx.fillRect(leftX,412,300-leftX,16);
    ctx.fillRect(400,412,rightX-400,16);
    ctx.fillStyle='#5c4028';
    ctx.fillRect(296,380,13,36);
    ctx.fillRect(397,380,13,36);
    ctx.fillStyle='#7d5838';
    ctx.fillRect(298,382,9,32);
    ctx.fillRect(399,382,9,32);
    ctx.fillStyle='#bfa065';
    ctx.beginPath();
    ctx.roundRect(318,408,68,15,3);
    ctx.fill();
    ctx.strokeStyle='#7a6136';
    ctx.lineWidth=1;
    ctx.stroke();
    const isNightRaidActive=typeof Quest2!=='undefined'&&Quest2.isNightRaidMusicActive&&Quest2.isNightRaidMusicActive();
    if(!isNightRaidActive){
      ctx.fillStyle='#f5e6b8';
      ctx.font='bold 10.5px system-ui';
      ctx.textAlign='center';
      ctx.fillText('▼ Cửa ra sân làng',352,442);

      if(pose==='sitting'){
        ctx.font='bold 10.5px system-ui';
        const lbl='Đang ngồi bên bàn gỗ mộc (Nhấn ✊ / di chuyển để đứng dậy)';
        const lw=ctx.measureText(lbl).width+18;
        ctx.fillStyle='#142920e6';
        ctx.beginPath();
        ctx.roundRect(341-lw/2,332,lw,19,5);
        ctx.fill();
        ctx.strokeStyle='#e2c97eaa';
        ctx.stroke();
        ctx.fillStyle='#f9ebbf';
        ctx.fillText(lbl,341,345);
      }else if(pose==='hiding_wardrobe'){
        ctx.font='bold 10.5px system-ui';
        const lbl='Đang trốn trong tủ quần áo (Nhấn ✊ / di chuyển để chui ra)';
        const lw=ctx.measureText(lbl).width+18;
        const bx=Math.max(lw/2+12,129);
        ctx.fillStyle='#142920e6';
        ctx.beginPath();
        ctx.roundRect(bx-lw/2,64,lw,19,5);
        ctx.fill();
        ctx.strokeStyle='#e2c97eaa';
        ctx.stroke();
        ctx.fillStyle='#f9ebbf';
        ctx.fillText(lbl,bx,77);
      }else if(pose==='hiding_bed'){
        ctx.font='bold 10.5px system-ui';
        const lbl='Đang núp dưới gầm giường (Nhấn ✊ / di chuyển để chui ra)';
        const lw=ctx.measureText(lbl).width+18;
        const bx=Math.min(642-lw/2,548);
        ctx.fillStyle='#142920e6';
        ctx.beginPath();
        ctx.roundRect(bx-lw/2,76,lw,19,5);
        ctx.fill();
        ctx.strokeStyle='#e2c97eaa';
        ctx.stroke();
        ctx.fillStyle='#f9ebbf';
        ctx.fillText(lbl,bx,89);
      }else if(pose==='hiding_jar'){
        ctx.font='bold 10.5px system-ui';
        const lbl='Đang nấp trong chum nước (Nhấn ✊ / di chuyển để trèo ra)';
        const lw=ctx.measureText(lbl).width+18;
        const bx=Math.min(642-lw/2,596);
        ctx.fillStyle='#142920e6';
        ctx.beginPath();
        ctx.roundRect(bx-lw/2,316,lw,19,5);
        ctx.fill();
        ctx.strokeStyle='#e2c97eaa';
        ctx.stroke();
        ctx.fillStyle='#f9ebbf';
        ctx.fillText(lbl,bx,329);
      }else if(pose==='sleeping'&&sleepTimer>=2.2){
        ctx.font='bold 10.5px system-ui';
        const lbl='Đang nằm nghỉ trên giường gỗ (Nhấn ✊ / di chuyển để thức dậy)';
        const lw=ctx.measureText(lbl).width+18;
        const bx=Math.min(642-lw/2,548);
        ctx.fillStyle='#142920e6';
        ctx.beginPath();
        ctx.roundRect(bx-lw/2,76,lw,19,5);
        ctx.fill();
        ctx.strokeStyle='#e2c97eaa';
        ctx.stroke();
        ctx.fillStyle='#f9ebbf';
        ctx.fillText(lbl,bx,89);
      }else if(pose==='none'&&nearProp){
        ctx.font='bold 10.5px system-ui';
        const act=
          nearProp.id==='table'?'Nhấn nút hoặc chạm để ngồi'
          :nearProp.id==='bed'?'Nhấn ✊ để ngủ · nút NÚP GẦM để ẩn nấp'
          :nearProp.id==='wardrobe'?'Nhấn nút hoặc chạm để trốn vào tủ'
          :nearProp.id==='stove'?'Nhấn nút hoặc chạm để sưởi ấm'
          :nearProp.id==='jar'?'Nhấn nút hoặc chạm để nấp vào chum'
          :'Nhấn nút hoặc chạm để thay đồ';
        const lbl=nearProp.name+' · '+act;
        const lw=ctx.measureText(lbl).width+16;
        const ly=nearProp.labelY||(nearProp.y-58);
        const lx=Math.max(lw/2+12,Math.min(640-lw/2,nearProp.x));
        ctx.fillStyle='#142920dd';
        ctx.beginPath();
        ctx.roundRect(lx-lw/2,ly,lw,18,4);
        ctx.fill();
        ctx.strokeStyle='#d6c384aa';
        ctx.stroke();
        ctx.fillStyle='#f7e8ba';
        ctx.fillText(lbl,lx,ly+12);
      }
    }

    if(nightAmt>.05){
      ctx.save();
      ctx.fillStyle=`rgba(10, 16, 28, ${nightAmt*0.14})`;
      ctx.fillRect(leftX,topY,rightX-leftX,botY-topY);
      ctx.globalCompositeOperation='screen';

      const glowLamp=ctx.createRadialGradient(374,279,6,374,279,240);
      glowLamp.addColorStop(0,`rgba(255, 215, 125, ${0.62*nightAmt})`);
      glowLamp.addColorStop(0.35,`rgba(255, 185, 95, ${0.35*nightAmt})`);
      glowLamp.addColorStop(0.7,`rgba(255, 160, 70, ${0.12*nightAmt})`);
      glowLamp.addColorStop(1,'rgba(255, 150, 60, 0)');
      ctx.fillStyle=glowLamp;
      ctx.fillRect(130,50,500,380);

      const glowHearth=ctx.createRadialGradient(110,326,6,110,326,170);
      glowHearth.addColorStop(0,`rgba(255, 130, 45, ${0.65*nightAmt})`);
      glowHearth.addColorStop(0.5,`rgba(255, 95, 30, ${0.28*nightAmt})`);
      glowHearth.addColorStop(1,'rgba(255, 80, 20, 0)');
      ctx.fillStyle=glowHearth;
      ctx.fillRect(leftX,160,300,300);

      for(const [lx,ly] of [[242,92],[450,92]]){
        const glowPillar=ctx.createRadialGradient(lx,ly+6,4,lx,ly+6,130);
        glowPillar.addColorStop(0,`rgba(255, 205, 105, ${0.48*nightAmt})`);
        glowPillar.addColorStop(0.5,`rgba(255, 175, 75, ${0.18*nightAmt})`);
        glowPillar.addColorStop(1,'rgba(255, 160, 60, 0)');
        ctx.fillStyle=glowPillar;
        ctx.fillRect(lx-130,ly-130,260,260);
      }

      const glowBed=ctx.createRadialGradient(580,140,6,580,140,140);
      glowBed.addColorStop(0,`rgba(255, 210, 130, ${0.38*nightAmt})`);
      glowBed.addColorStop(0.6,`rgba(255, 180, 90, ${0.12*nightAmt})`);
      glowBed.addColorStop(1,'rgba(255, 160, 70, 0)');
      ctx.fillStyle=glowBed;
      ctx.fillRect(450,50,240,220);

      if(isWallBreached){
        const glowBreach=ctx.createRadialGradient(374,100,10,374,140,160);
        const bPulse=0.5+0.2*Math.sin(t*5);
        glowBreach.addColorStop(0,`rgba(255, 40, 70, ${0.45*bPulse})`);
        glowBreach.addColorStop(0.4,`rgba(180, 20, 45, ${0.25*bPulse})`);
        glowBreach.addColorStop(0.8,`rgba(120, 160, 230, ${0.18*nightAmt})`);
        glowBreach.addColorStop(1,'rgba(0, 0, 0, 0)');
        ctx.fillStyle=glowBreach;
        ctx.fillRect(250,40,250,220);
      }

      ctx.restore();
    }

    const curDay=typeof Villagers!=='undefined'?Villagers.day:1;
    const totMin=Math.floor(minutes||390);
    const hh=String(Math.floor(totMin/60)%24).padStart(2,'0');
    const mm=String(totMin%60).padStart(2,'0');
    const clockX=cam?(cam.x+cam.worldW-75):597;
    const clockY=cam?(cam.y+22):21;
    ctx.save();
    ctx.fillStyle='#1c2f24e6';
    ctx.beginPath();
    ctx.roundRect(clockX-61,clockY-10,122,20,5);
    ctx.fill();
    ctx.strokeStyle='#c9b072aa';
    ctx.lineWidth=1;
    ctx.stroke();
    ctx.fillStyle='#f5e6b8';
    ctx.font='bold 10.5px system-ui';
    ctx.textAlign='center';
    ctx.fillText(`Ngày ${curDay} · ${hh}:${mm}`,clockX,clockY+3.5);
    ctx.restore();

    if(pose==='sleeping'&&sleepTimer<1.3){
      const pFade=Math.min(1,sleepTimer/1.2);
      const alpha=Math.sin(pFade*Math.PI)*0.88;
      ctx.save();
      ctx.fillStyle=`rgba(8, 14, 26, ${alpha.toFixed(3)})`;
      ctx.fillRect(leftX,topY,rightX-leftX,botY-topY);
      if(alpha>0.25){
        ctx.fillStyle=`rgba(249, 235, 192, ${Math.min(1,alpha*1.2).toFixed(3)})`;
        ctx.font='bold 15px system-ui';
        ctx.textAlign='center';
        const isExamDay=isExamReadyNow();
        const msg=sleepTimer<0.6
          ?'🌙 Tiểu Phàm nằm trên giường gỗ, ngủ say qua đêm...'
          :(isExamDay
            ?`☀️ Bình minh Ngày ${curDay} (06:00 sáng) — Ngày Khảo Nghiệm Linh Căn!`
            :`☀️ Bình minh Ngày ${curDay} (06:00 sáng) — Trời đã sáng!`);
        const midX=cam?(cam.x+cam.worldW/2):352;
        const midY=cam?(cam.y+cam.worldH/2):226;
        ctx.fillText(msg,midX,midY);
      }
      ctx.restore();
    }

    if(bannerTimer>0&&bannerText&&!isNightRaidActive){
      ctx.save();
      ctx.font='bold 10.5px system-ui';
      const bw=Math.min(460,ctx.measureText(bannerText).width+24);
      const banX=cam?(cam.x+cam.worldW/2):290;
      const banY=cam?(cam.y+22):21;
      ctx.fillStyle='#162d23ee';
      ctx.beginPath();
      ctx.roundRect(banX-bw/2,banY-10,bw,20,5);
      ctx.fill();
      ctx.strokeStyle='#dec57eaa';
      ctx.lineWidth=1;
      ctx.stroke();
      ctx.fillStyle='#ffe9b3';
      ctx.textAlign='center';
      ctx.fillText(bannerText,banX,banY+3.5);
      ctx.restore();
    }
  }

  return{
    W,H,
    get inside(){return inside},
    set inside(v){inside=!!v},
    get pose(){return pose},
    get nearProp(){return nearProp},
    computeCamera,
    canWalk,
    restoreAfterLoad,
    enter,
    exit,
    sitAtTable,
    standFromTable,
    hideInJar,
    exitJar,
    hideInWardrobe,
    exitWardrobe,
    hideUnderBed,
    interactBedHide,
    exitBed,
    onQuestHideSpot,
    sleepInBed,
    wakeFromBed,
    wakeForQuest,
    checkTransition,
    updateInterior,
    interact,
    handleCanvasClick,
    drawExteriorDoor,
    drawInterior
  };
})();
