'use strict';
/**
 * Overlay cho phần bản đồ hoang tàn của Làng Du Lãm mở rộng.
 * Dùng lại chính các layer xóm đông / phía nam, chuyển chúng sang tông xám cháy
 * và phủ đống đổ nát. Không kéo giãn ảnh 1536×1024 (tránh lệch tọa độ/va chạm).
 */
const RuinsExtension = (() => {
  const WORLD_W = 3072, WORLD_H = 1331;
  let layer = null;
  let eastImg = null, southImg = null;
  let eastReady = false, southReady = false;

  function loadAiRuinsImages() {
    if (typeof Image === 'undefined') return;
    if (!eastImg) {
      eastImg = new Image();
      eastImg.onload = () => { eastReady = true; };
      eastImg.src = 'Lang_Du_Lam_Hoang_Tan_Dong.webp?v=ruins6';
    }
    if (!southImg) {
      southImg = new Image();
      southImg.onload = () => { southReady = true; };
      southImg.src = 'Lang_Du_Lam_Hoang_Tan_Nam.webp?v=ruins6';
    }
  }

  function init() {
    loadAiRuinsImages();
    layer = document.createElement('canvas');
    layer.width = WORLD_W;
    layer.height = WORLD_H;
    const g = layer.getContext('2d');
    let seed = 0x27ac3511;
    function rand() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    function extension(x,y) { return x > 1536 || y > 1024; }
    function log(x,y,length,angle,thickness) {
      g.save();g.translate(x,y);g.rotate(angle);
      g.fillStyle = '#251c19';g.fillRect(-length/2,-thickness/2,length,thickness);
      g.fillStyle = '#70533a';g.fillRect(-length/2,-thickness/2,length,Math.max(2,thickness*.38));
      g.fillStyle = '#aa8051';g.fillRect(-length/2,-thickness/2,Math.max(3,length*.15),2);
      g.restore();
    }
    for (let i = 0; i < 3900; i++) {
      const x = 18+rand()*(WORLD_W-36), y = 18+rand()*(WORLD_H-36);
      if (!extension(x,y) || Math.abs(x-1536)<6 || Math.abs(y-1024)<6) continue;
      const w = 2+rand()*9, h = 1+rand()*6;
      g.fillStyle = ['#30292385','#736c5488','#201c1b7a','#b1a08577','#492c2388'][i%5];
      g.fillRect(x,y,w,h);
      if (i % 13 === 0) log(x,y,8+rand()*24,rand()*3.14,3+rand()*3);
    }
    const homes = [
      [1640,680,166,141],[1900,680,190,155],[2040,1040,178,151],
      [2410,1040,202,158],[2780,1040,164,143],[2810,250,184,149],
      [258,1064,174,145],[1080,1064,174,145]
    ];
    for (const [x,y,w,h] of homes) {
      const cx=x+w*.52, cy=y+h*.66;
      g.fillStyle = '#1a1b1680';g.beginPath();g.ellipse(cx,cy+25,w*.49,34,0,0,Math.PI*2);g.fill();
      g.fillStyle = '#34241dd9';g.beginPath();
      g.moveTo(x+w*.08,y+h*.40);g.lineTo(x+w*.42,y+h*.18);
      g.lineTo(x+w*.66,y+h*.31);g.lineTo(x+w*.87,y+h*.38);
      g.lineTo(x+w*.8,y+h*.64);g.lineTo(x+w*.20,y+h*.71);g.closePath();g.fill();
      g.fillStyle = '#79634fb8';g.beginPath();
      g.moveTo(x+w*.17,y+h*.41);g.lineTo(x+w*.43,y+h*.23);
      g.lineTo(x+w*.63,y+h*.35);g.lineTo(x+w*.33,y+h*.52);g.closePath();g.fill();
      for (let j=0;j<17;j++) {
        const rx=x+rand()*w, ry=y+h*.53+rand()*h*.33;
        g.fillStyle=['#3b3830','#9d8970','#554238','#b6a083'][j%4];
        g.fillRect(rx,ry,4+rand()*16,2+rand()*9);
      }
      for (let b=0;b<5;b++) {
        const bx=cx+(rand()-.5)*w*.75, by=y+h*(.68+rand()*.32);
        g.save();g.translate(bx,by);g.rotate((rand()-.5)*1.4);
        g.fillStyle = b%2===0 ? 'rgba(112, 16, 22, 0.68)' : 'rgba(84, 11, 16, 0.72)';
        g.beginPath();g.ellipse(0,0,8+rand()*16,3+rand()*6,0,0,Math.PI*2);g.fill();
        for (let k=-1;k<=1;k++) {
          g.fillStyle = 'rgba(136, 20, 26, 0.58)';
          g.fillRect(-10+rand()*4, k*3, 16+rand()*14, 1.4);
        }
        g.restore();
      }
      for (let j=0;j<7;j++) log(x+rand()*w,y+h*.51+rand()*h*.40,25+rand()*55,(rand()-.5)*1.8,4+rand()*4);
    }
    for (const [x,y,w,h] of [[1600,80,640,310],[2720,60,275,130],[2220,620,155,82],[2425,620,155,82],[2220,752,155,82],[2425,752,155,82]]) {
      g.fillStyle='#241a1a61';g.fillRect(x+6,y+6,w-12,h-12);
      for(let i=0;i<Math.min(125,Math.floor(w*h/350));i++){
        const sx=x+rand()*w,sy=y+rand()*h;
        g.fillStyle=i%3===0?'#967d58aa':'#151c1888';g.fillRect(sx,sy,2+rand()*5,2+rand()*7);
      }
      for(let j=0;j<5;j++) log(x+rand()*w,y+rand()*h,16+rand()*33,rand()*3.14,3);
    }
    for(let i=0;i<320;i++){
      const side=i%2===0;
      const x=side?1530+rand()*38:rand()*1536;
      const y=side?rand()*1331:1019+rand()*34;
      g.fillStyle=['#554a3655','#89765d50','#241e1a77'][i%3];
      g.fillRect(x,y,3+rand()*8,2+rand()*5);
    }
  }

  function draw(ctx) {
    loadAiRuinsImages();
    const hasEast = eastImg && (eastReady || (eastImg.complete && eastImg.naturalWidth > 0));
    const hasSouth = southImg && (southReady || (southImg.complete && southImg.naturalWidth > 0));
    if (hasEast || hasSouth) {
      if (hasEast) {
        const hasOverlap = eastImg.naturalWidth >= 1616;
        if (hasOverlap) {
          const overlap = 80;
          // Phần chính của xóm đông bắt đầu đúng mép phải bản đồ gốc.
          ctx.drawImage(eastImg, overlap, 0, 1536, 1024, 1536, 0, 1536, 1024);
          // Hoà mép nối bằng dải chuyển 80 px, tránh vạch dọc khi zoom trên điện thoại.
          for (let i = 0; i < overlap; i += 4) {
            const w = Math.min(4, overlap - i);
            ctx.save();
            ctx.globalAlpha = Math.min(1, (i + w) / overlap);
            ctx.drawImage(eastImg, i, 0, w, 1024, 1536 - overlap + i, 0, w, 1024);
            ctx.restore();
          }
        } else {
          ctx.drawImage(eastImg, 1536, 0, 1536, 1024);
        }
      }
      if (hasSouth) {
        const hasOverlap = southImg.naturalHeight >= 331;
        if (hasOverlap) {
          const overlap = 24;
          // Phần chính của làng phía nam nằm hoàn toàn dưới mép map gốc.
          ctx.drawImage(southImg, 0, overlap, 3072, 307, 0, 1024, 3072, 307);
          // Hoà mép nối bằng dải chuyển 24 px để xoá đường kẻ ngang.
          for (let i = 0; i < overlap; i += 2) {
            const h = Math.min(2, overlap - i);
            ctx.save();
            ctx.globalAlpha = Math.min(1, (i + h) / overlap);
            ctx.drawImage(southImg, 0, i, 3072, h, 0, 1024 - overlap + i, 3072, h);
            ctx.restore();
          }
        } else {
          ctx.drawImage(southImg, 0, 1024, 3072, 307);
        }
      }
      return;
    }
    if (layer) ctx.drawImage(layer, 0, 0);
  }
  return { init, draw };
})();
