'use strict';
// The traveller renderer and sprite stay available in data, but are not selectable in chapter one.
const PlayerRoster={tieuPham:{id:'tieuPham',name:'Tiểu Phàm',age:14,origin:'Làng Du Lãm',outfit:'Áo vải thô',hp:100,maxHp:100,mp:0,maxMp:0,realm:'Phàm Nhân',level:1,playable:true},traveller:{id:'traveller',name:'Lữ khách',renderer:Character,sprite:'hero.png',playable:false}};
const TieuPham=(()=>{
const sprite=document.createElement('canvas');sprite.width=192;sprite.height=224;const g=sprite.getContext('2d');g.setTransform(2,0,0,2,0,0);
const C={
  ink:'#23201b',
  dark:'#5c4d3c',
  shade:'#786650',
  cloth:'#988368',
  light:'#b5a082',
  collar:'#e8dec3',
  sash:'#47585c',
  sashHi:'#6c8387',
  pouch:'#8c6d46',
  pouchHi:'#b89668',
  pants:'#3a3d3b',
  pantsHi:'#525754',
  wrap:'#c9bc9c',
  shoe:'#544332',
  shoeSole:'#cbb88e',
  skin:'#dfb188',
  skinHi:'#f4cfa8',
  skinShade:'#bf8c67',
  hair:'#25211d',
  hairHi:'#4a423a',
  tie:'#9e493b',
  tieHi:'#c96b59'
};
// Giữ palette nhân vật gốc bất biến; biến thể chỉ ghi đè trong một lần vẽ đồng bộ.
const DEFAULT_BODY_COLORS=Object.freeze({...C});
// Unique NPC facial animation overlay. Coordinates are anchored at the feet,
// so visual changes never affect NPC movement, hitboxes or dialogue triggers.
function npcFaceAnimation(g,p,t,kind){
  const back=p.dir==='up',side=p.dir==='left'||p.dir==='right';
  const moving=!!p.walk,beat=Math.sin(t*2.6+(p.walk||0)*.35);
  const blink=(t+(kind==='a-nguyet'?.7:kind==='a-huy'?1.9:2.6))%5.2>5.04;
  if(kind==='a-nguyet'){
    const sway=beat*(moving?1.35:.48),wind=Math.sin(t*1.75)*.8;
    if(back){
      // Three flowing locks, independent from the back ribbon and long sleeves.
      g.strokeStyle='#877080';g.lineWidth=.75;g.beginPath();
      g.moveTo(-5,-64);g.bezierCurveTo(-7,-53,-7+sway,-38,-5+sway,-28);
      g.moveTo(5,-64);g.bezierCurveTo(7,-51,7+sway,-39,5+sway,-27);g.stroke();
      return;
    }
    g.save();
    if(side){
      // Delicate profile, visible nose and one expressive eye.
      g.fillStyle='#f3cbb4';g.beginPath();g.moveTo(-5,-65);
      g.quadraticCurveTo(3,-69,7,-61);g.quadraticCurveTo(9,-58,8,-56);
      g.lineTo(10,-54);g.lineTo(7,-53);g.quadraticCurveTo(6,-48,1,-47);
      g.quadraticCurveTo(-7,-48,-7,-57);g.closePath();g.fill();
      g.fillStyle='#ffe2d0';g.beginPath();g.ellipse(1,-57,4.8,7,0,0,Math.PI*2);g.fill();
      g.fillStyle='#ed9e9f';g.beginPath();g.ellipse(3.4,-53,2.3,1,0,0,Math.PI*2);g.fill();
      g.strokeStyle='#503b42';g.lineWidth=1;g.beginPath();g.moveTo(3.4,-61);g.quadraticCurveTo(5.5,-62,7.1,-60.9);g.stroke();
      if(!blink){g.fillStyle='#292334';g.beginPath();g.ellipse(5.4,-59,1,1.6,0,0,Math.PI*2);g.fill();g.fillStyle='#fff';g.fillRect(5,-59.9,.65,.65);}
      g.strokeStyle='#c77478';g.lineWidth=.85;g.beginPath();g.moveTo(5,-50.7);g.quadraticCurveTo(6.2,-50,7,-51);g.stroke();
      // A layered side fringe, moving separately from the long back hair.
      g.fillStyle='#251e2c';g.beginPath();g.moveTo(-8,-64);g.quadraticCurveTo(-7,-72,2,-70);
      g.quadraticCurveTo(9,-68,7,-62);g.quadraticCurveTo(3,-64,1,-62);
      g.quadraticCurveTo(-4,-60,-5,-54);g.lineTo(-8,-52);g.closePath();g.fill();
      g.strokeStyle='#6b556e';g.lineWidth=.9;g.beginPath();g.moveTo(-5,-67);g.quadraticCurveTo(-1,-70,4,-67);g.stroke();
      g.strokeStyle='#302433';g.lineWidth=2.1;g.beginPath();g.moveTo(-6,-62);g.quadraticCurveTo(-9-wind,-51,-7+sway,-42);g.stroke();
    }else{
      // Distinct heart-shaped, youthful face (not Tiểu Phàm's male head).
      g.fillStyle='#f2c9b1';g.beginPath();g.moveTo(-8.4,-65);
      g.quadraticCurveTo(0,-70,8.5,-65);g.quadraticCurveTo(10,-54,5.3,-48.5);
      g.quadraticCurveTo(0,-44,-5.3,-48.5);g.quadraticCurveTo(-10,-54,-8.4,-65);g.closePath();g.fill();
      g.fillStyle='#ffe2d0';g.beginPath();g.ellipse(-1,-57.4,6.3,8.3,-.04,0,Math.PI*2);g.fill();
      g.fillStyle='#e9a3a3';for(const x of [-5.6,5.4]){g.beginPath();g.ellipse(x,-53.9,2.2,1.2,0,0,Math.PI*2);g.fill();}
      g.strokeStyle='#4f353e';g.lineWidth=.85;g.beginPath();
      g.moveTo(-6.7,-61.7);g.quadraticCurveTo(-4.5,-62.7,-2.1,-61.6);
      g.moveTo(2.1,-61.6);g.quadraticCurveTo(4.6,-62.7,6.7,-61.7);g.stroke();
      for(const sign of [-1,1]){
        g.strokeStyle='#332936';g.lineWidth=1.2;g.beginPath();
        g.moveTo(sign*2.7,-58.4);g.quadraticCurveTo(sign*4.7,-60,sign*6.6,-58.2);g.stroke();
        if(!blink){g.fillStyle='#fff7ef';g.beginPath();g.ellipse(sign*4.6,-57.4,1.9,2.35,0,0,Math.PI*2);g.fill();
          g.fillStyle='#49384a';g.beginPath();g.ellipse(sign*4.5,-57.4,1.15,1.85,0,0,Math.PI*2);g.fill();
          g.fillStyle='#fff';g.beginPath();g.arc(sign*4.5-.35,-58.1,.6,0,Math.PI*2);g.fill();}
      }
      g.strokeStyle='#bf7a78';g.lineWidth=.6;g.beginPath();g.moveTo(-.6,-54);g.quadraticCurveTo(0,-53.5,.7,-54);g.stroke();
      g.strokeStyle='#ba6672';g.lineWidth=1;g.beginPath();g.moveTo(-2,-51);g.quadraticCurveTo(0,-49.9,2,-51);g.stroke();
      // Soft asymmetric forelocks and scalp shine: different from player bangs.
      g.fillStyle='#251f2b';g.beginPath();g.moveTo(-9,-61);g.quadraticCurveTo(-12,-71,-4,-71);
      g.quadraticCurveTo(2,-76,8,-69);g.quadraticCurveTo(11,-65,9,-61);
      g.quadraticCurveTo(5,-67,2,-65);g.quadraticCurveTo(-1,-61,-3,-59);
      g.quadraticCurveTo(-5,-65,-9,-61);g.closePath();g.fill();
      g.strokeStyle='#746070';g.lineWidth=1;g.beginPath();g.moveTo(-7,-67);g.quadraticCurveTo(-2,-72,5,-68);g.stroke();
      // Side locks animate without static canvas assets or extra network requests.
      for(const sign of [-1,1]){
        g.fillStyle='#2c2430';g.beginPath();g.moveTo(sign*8,-65);
        g.bezierCurveTo(sign*12,-57,sign*(10+sway*.5),-48,sign*(9+sway),-36);
        g.quadraticCurveTo(sign*(6+sway),-39,sign*7,-53);g.closePath();g.fill();
        g.strokeStyle='#625063';g.lineWidth=.7;g.beginPath();g.moveTo(sign*9,-60);
        g.quadraticCurveTo(sign*10,-48,sign*(8+sway),-39);g.stroke();
      }
    }
    g.restore();
  }else if(!back){
    // Distinct supporting cast expressions, with slight individual blink cadence.
    g.save();
    if(kind==='a-huy'){
      g.fillStyle='#e5a280';g.beginPath();g.ellipse(side?4:0,-52,side?2:5,1.6,0,0,Math.PI*2);g.fill();
      g.strokeStyle='#5a3c2e';g.lineWidth=1.1;g.beginPath();
      g.moveTo(side?3:-4,-57);g.quadraticCurveTo(side?5:0,-58.8,side?7:4,-57);g.stroke();
      g.beginPath();g.moveTo(-3,-49);g.quadraticCurveTo(0,-47.1,3,-49);g.stroke();
    }else if(kind==='truong'){
      g.strokeStyle='#ddd8ca';g.lineWidth=1.1;g.beginPath();g.moveTo(-7,-62);g.quadraticCurveTo(-4,-64,-2,-62);
      g.moveTo(2,-62);g.quadraticCurveTo(4,-64,7,-62);g.stroke();
      g.strokeStyle='#988b7b';g.lineWidth=.8;g.beginPath();g.moveTo(-7,-53);g.lineTo(-4,-52);
      g.moveTo(4,-52);g.lineTo(7,-53);g.stroke();
    }else if(kind==='luc-nham'){
      g.strokeStyle='#315d51';g.lineWidth=1;g.beginPath();g.moveTo(-6,-61);
      g.quadraticCurveTo(-4,-62.3,-2,-61);g.moveTo(2,-61);g.quadraticCurveTo(4,-62.3,6,-61);g.stroke();
      g.fillStyle='#b6e8d6';g.fillRect(side?3:-.6,-77,1.5,2.2);
    }
    g.restore();
  }
}
function npcBodyAccents(g,p,style,t=0){
  if(!style||!style.variant)return;
  const kind=style.variant,back=p.dir==='up',left=p.dir==='left';
  g.save();g.translate(48,103);if(left)g.scale(-1,1);
  // Tất cả chi tiết dùng hệ tọa độ bàn chân của Tiểu Phàm (0,0).
  if(kind==='a-huy'){
    // Bụng và thân tròn, áo nâu vàng; không đổi hitbox.
    g.fillStyle=C.cloth;g.strokeStyle=C.dark;g.lineWidth=1.6;
    g.beginPath();g.ellipse(1,-36,12,11,0,0,Math.PI*2);g.fill();g.stroke();
    g.fillStyle=C.light;g.beginPath();g.ellipse(-2,-39,4.2,7,-.2,0,Math.PI*2);g.fill();
    g.strokeStyle=C.sash;g.lineWidth=3;g.beginPath();g.moveTo(-10,-31);g.quadraticCurveTo(0,-27,12,-31);g.stroke();
    if(!back){g.fillStyle=C.skinHi;g.beginPath();g.ellipse(-5,-53,4,2,0,0,Math.PI*2);g.ellipse(5,-53,4,2,0,0,Math.PI*2);g.fill();}
  }else if(kind==='a-nguyet'){
    // Ngoại hình thiếu nữ cổ trang thanh tú bám sát avatar A Nguyệt (váy xếp ly, áo giao lĩnh thêu hoa trắng, nơ ngực, trâm cài, ruy băng xanh & suối tóc dài)
    const moving=(p.walk||0)>0,sw=Math.sin(p.walk||0)*(moving?2.2:0.5),breeze=Math.sin((p.walk||0)*0.6+1.2)*(moving?2.4:1.1);
    const side=p.dir==='left'||p.dir==='right';
    if(side){
      // Dải ruy băng xanh lam & suối tóc dài phía sau lưng khi nhìn nghiêng
      g.fillStyle='#84b4d8';g.strokeStyle='#4b7391';g.lineWidth=0.9;
      g.beginPath();g.moveTo(-5,-68);g.quadraticCurveTo(-13-breeze*0.7,-56,-15-breeze*1.1,-40);g.lineTo(-10-breeze*0.9,-38);g.quadraticCurveTo(-9-breeze*0.5,-54,-3,-66);g.closePath();g.fill();g.stroke();
      g.fillStyle='#b8dff5';g.beginPath();g.moveTo(-6,-67);g.quadraticCurveTo(-11-breeze*0.5,-57,-12-breeze*0.8,-44);g.lineTo(-9-breeze*0.6,-43);g.closePath();g.fill();
      // Suối tóc dài mềm mại sau lưng
      g.fillStyle=C.hair;g.strokeStyle=C.hairHi;g.lineWidth=1;
      g.beginPath();g.moveTo(-6,-63);g.quadraticCurveTo(-12-breeze*0.4,-48,-10-breeze*0.6,-29);g.quadraticCurveTo(-6,-28,-4,-34);g.quadraticCurveTo(-6,-48,-2,-60);g.closePath();g.fill();g.stroke();
      // Chân váy lụa dài xếp ly nghiêng (Bách điệp quần)
      g.fillStyle='#dcebf5';g.strokeStyle='#6992b2';g.lineWidth=1.1;
      g.beginPath();g.moveTo(-7,-31);g.lineTo(7,-31);g.quadraticCurveTo(10+sw*0.7,-18,11+sw,-6);g.lineTo(-11-breeze*0.4,-6);g.quadraticCurveTo(-10,-18,-7,-31);g.closePath();g.fill();g.stroke();
      // Tà áo lam phủ ngoài váy
      g.fillStyle=C.cloth;g.beginPath();g.moveTo(-6,-32);g.lineTo(6,-32);g.lineTo(8+sw*0.5,-15);g.lineTo(-8-breeze*0.3,-14);g.closePath();g.fill();
      g.strokeStyle='#f7f4ec';g.lineWidth=1.1;g.beginPath();g.moveTo(-7.5-breeze*0.3,-14.5);g.lineTo(7.5+sw*0.5,-15.5);g.stroke();
      // Nếp gấp xếp ly chân váy
      g.strokeStyle='#89adc9';g.lineWidth=0.9;
      for(const lx of [-5,-1,3,6]){g.beginPath();g.moveTo(lx*0.7,-15);g.lineTo(lx+sw*0.4,-6.5);g.stroke();}
      // Ống tay áo rộng thiếu nữ (quảng tụ)
      g.fillStyle='#f5f2eb';g.strokeStyle='#89adc9';g.lineWidth=1;
      g.beginPath();g.moveTo(-4,-44);g.lineTo(3,-44);g.quadraticCurveTo(6,-35,4+sw*0.3,-28);g.lineTo(-4+sw*0.2,-27);g.quadraticCurveTo(-6,-35,-4,-44);g.closePath();g.fill();g.stroke();
      // Cổ áo giao lĩnh thêu hoa trắng & nơ ngực nhìn nghiêng
      g.strokeStyle='#f7f4ec';g.lineWidth=1.8;g.beginPath();g.moveTo(1,-49);g.lineTo(6,-39);g.stroke();
      g.fillStyle='#ffffff';g.beginPath();g.arc(3,-45,1.2,0,Math.PI*2);g.arc(4.5,-42,1.1,0,Math.PI*2);g.fill();
      // Lọn tóc mai rủ bên má & khuyên tai nhỏ
      g.fillStyle=C.hair;g.beginPath();g.moveTo(1,-61);g.quadraticCurveTo(3,-51,2+breeze*0.2,-39);g.lineTo(0,-41);g.quadraticCurveTo(1,-51,-1,-60);g.closePath();g.fill();
      // Búi tóc cao, trâm gỗ ngà & nơ ruy băng xanh
      g.strokeStyle='#e8cfa6';g.lineWidth=2;g.beginPath();g.moveTo(-8,-73);g.lineTo(5,-76);g.stroke();
      g.fillStyle='#f2a69e';g.beginPath();g.arc(-8.5,-72.8,1.5,0,Math.PI*2);g.fill();
      g.fillStyle='#84b4d8';g.beginPath();g.ellipse(-5,-69,4,2.2,-0.3,0,Math.PI*2);g.fill();
      // Tinh chỉnh má hồng phấn & mắt long lanh nhìn nghiêng
      g.fillStyle='rgba(244,152,146,0.55)';g.beginPath();g.ellipse(4,-52.8,2.2,1.3,0,0,Math.PI*2);g.fill();
      g.fillStyle='#ffffff';g.fillRect(4.8,-58.5,1.2,1.2);
    }else{
      // Suối tóc đen nhánh buông dài phía sau vai (cả hướng nhìn xuống và nhìn lên)
      g.fillStyle=C.hair;g.strokeStyle='#1c161b';g.lineWidth=1;
      g.beginPath();
      g.moveTo(-9,-62);g.quadraticCurveTo(-14,-48,-12-breeze*0.3,-28);
      g.quadraticCurveTo(0,-25,12+breeze*0.3,-28);
      g.quadraticCurveTo(14,-48,9,-62);g.closePath();g.fill();g.stroke();

      // Chân váy lụa xếp ly dài (Bách điệp quần) mềm mại che quần nam giới
      g.fillStyle='#dcebf5';g.strokeStyle='#5c87a8';g.lineWidth=1.1;
      g.beginPath();
      g.moveTo(-9.5,-31);g.lineTo(9.5,-31);
      g.quadraticCurveTo(13+sw*0.4,-18,14.5+sw*0.6,-6);
      g.quadraticCurveTo(0,-4.5,-14.5+sw*0.6,-6);
      g.quadraticCurveTo(-13+sw*0.4,-18,-9.5,-31);
      g.closePath();g.fill();g.stroke();

      // Tầng áo khoác lụa xanh lam phủ trên váy (褙子 / Vạt áo thiếu nữ)
      g.fillStyle=C.cloth;g.strokeStyle=C.dark;g.lineWidth=1;
      g.beginPath();
      g.moveTo(-9,-32);g.lineTo(9,-32);
      g.lineTo(12+sw*0.4,-15);
      g.quadraticCurveTo(0,-13.5,-12+sw*0.4,-15);
      g.closePath();g.fill();g.stroke();
      // Viền lụa trắng ngà nơi gấu áo trên
      g.strokeStyle='#f7f4ec';g.lineWidth=1.2;
      g.beginPath();g.moveTo(-11.5+sw*0.4,-15.5);g.quadraticCurveTo(0,-14,11.5+sw*0.4,-15.5);g.stroke();

      // Các đường xếp ly dọc thanh thoát trên chân váy dưới
      g.strokeStyle='#89adc9';g.lineWidth=0.95;
      for(const lx of [-8,-4,0,4,8]){
        g.beginPath();g.moveTo(lx*0.85,-14.5);g.lineTo(lx*1.25+sw*0.5,-6);g.stroke();
      }

      // Tay áo lụa trắng ngà rộng mềm mại hai bên
      g.fillStyle='#f5f2eb';g.strokeStyle='#7da6c4';g.lineWidth=1;
      for(const s of [-1,1]){
        g.beginPath();
        g.moveTo(s*8.5,-47);g.lineTo(s*11.5,-44);
        g.quadraticCurveTo(s*14.5,-35,s*12.5+sw*0.25,-28);
        g.lineTo(s*8,-29);g.closePath();g.fill();g.stroke();
      }

      if(back){
        // Khi quay lưng (dir === 'up'): Suối tóc đen nhánh buông dài qua lưng + dải ruy băng xanh bay đôi
        g.fillStyle=C.hair;g.strokeStyle=C.hairHi;g.lineWidth=1;
        g.beginPath();
        g.moveTo(-9,-64);g.quadraticCurveTo(-12,-46,-9+breeze*0.35,-24);
        g.quadraticCurveTo(0,-20,9+breeze*0.35,-24);
        g.quadraticCurveTo(12,-46,9,-64);g.closePath();g.fill();g.stroke();
        // Ánh tóc mượt
        g.strokeStyle=C.hairHi;g.lineWidth=1;
        g.beginPath();g.moveTo(-4,-58);g.quadraticCurveTo(-5,-42,-3+breeze*0.2,-27);
        g.moveTo(4,-58);g.quadraticCurveTo(5,-42,3+breeze*0.2,-27);g.stroke();
        // Hai dải ruy băng lụa xanh thắt từ búi tóc bay nhẹ phía sau
        g.fillStyle='#8ec0e4';g.strokeStyle='#4b7391';g.lineWidth=0.85;
        for(const s of [-1,1]){
          g.beginPath();
          g.moveTo(s*2,-70);
          g.quadraticCurveTo(s*9+breeze*0.6,-56,s*11+breeze*0.9,-38);
          g.lineTo(s*7.5+breeze*0.7,-37);
          g.quadraticCurveTo(s*6+breeze*0.4,-55,s*0.8,-68);
          g.closePath();g.fill();g.stroke();
        }
      }else{
        // Khi nhìn chính diện (dir === 'down'):
        // 1. Áo giao lĩnh chữ V trắng ngà + viền xanh lam thêu hoa trắng (giống hệt Avatar)
        g.fillStyle='#f7f4ec';
        g.beginPath();g.moveTo(-5.5,-50);g.lineTo(0,-41);g.lineTo(5.5,-50);g.closePath();g.fill();
        g.strokeStyle='#6992b2';g.lineWidth=2.6;
        g.beginPath();g.moveTo(-5.8,-49.5);g.lineTo(0.8,-39.5);g.moveTo(5.8,-49.5);g.lineTo(-0.5,-41.5);g.stroke();
        // Điểm các bông hoa nhỏ màu trắng trên nẹp cổ áo
        g.fillStyle='#ffffff';
        for(const [fx,fy] of [[-3.8,-46.5],[-1.8,-43.5],[3.5,-46.5]]){
          g.beginPath();g.arc(fx,fy,1.15,0,Math.PI*2);g.fill();
        }
        // 2. Đai ngực cao (Tề ngực / Yếm lụa lam nhạt) & Nơ dây xanh thắt trước ngực
        g.fillStyle='#a8cae0';g.strokeStyle='#5882a3';g.lineWidth=1;
        g.fillRect(-8,-38,16,6);g.strokeRect(-8,-38,16,6);
        // Nơ xanh xinh xắn trước ngực + 2 dây rủ xuống váy
        g.strokeStyle='#446d8c';g.lineWidth=1.2;
        g.beginPath();
        g.ellipse(-2.5,-36,2.4,1.3,-0.25,0,Math.PI*2);
        g.ellipse(2.5,-36,2.4,1.3,0.25,0,Math.PI*2);
        g.stroke();
        g.fillStyle='#72a2c7';g.beginPath();g.arc(0,-36,1.4,0,Math.PI*2);g.fill();
        g.strokeStyle='#5882a3';g.lineWidth=1.1;
        g.beginPath();
        g.moveTo(-0.8,-35);g.quadraticCurveTo(-2.5,-24,-3+breeze*0.35,-14);
        g.moveTo(0.8,-35);g.quadraticCurveTo(2.5,-24,3+breeze*0.35,-14);
        g.stroke();

        // 3. Tinh chỉnh gương mặt thiếu nữ thanh tú (má hồng phấn, môi chúm chím, mắt nâu hổ phách long lanh)
        g.fillStyle='rgba(245,148,142,0.52)';
        g.beginPath();g.ellipse(-5.5,-53.2,2.3,1.3,0,0,Math.PI*2);g.ellipse(5.5,-53.2,2.3,1.3,0,0,Math.PI*2);g.fill();
        // Đôi mắt long lanh có ánh sáng trắng & hàng mi cong nhẹ
        g.strokeStyle='#1f191d';g.lineWidth=1.3;
        g.beginPath();g.moveTo(-6.8,-59.3);g.quadraticCurveTo(-4.5,-60.4,-2.2,-59.2);
        g.moveTo(2.2,-59.2);g.quadraticCurveTo(4.5,-60.4,6.8,-59.3);g.stroke();
        g.fillStyle='#ffffff';
        g.fillRect(-5.3,-58.8,1.3,1.3);g.fillRect(3.7,-58.8,1.3,1.3);
        // Đôi môi hồng dịu dàng
        g.fillStyle='#d96b68';
        g.beginPath();g.ellipse(0,-50.2,1.9,0.95,0,0,Math.PI*2);g.fill();

        // 4. Hai lọn tóc mai dài mềm mại ôm lấy hai bên má xuống tận ngực (đúng chuẩn Avatar)
        g.fillStyle=C.hair;g.strokeStyle=C.hairHi;g.lineWidth=0.9;
        for(const s of [-1,1]){
          g.beginPath();
          g.moveTo(s*7.5,-64);
          g.quadraticCurveTo(s*11.5,-52,s*(9.5+breeze*0.18),-35);
          g.lineTo(s*6.8,-37);
          g.quadraticCurveTo(s*8.8,-52,s*6,-62);
          g.closePath();g.fill();g.stroke();
        }
        // Dải ruy băng lụa xanh lấp ló bên vai trái (như trong Avatar A Nguyệt)
        g.fillStyle='#8ec0e4';g.strokeStyle='#4b7391';g.lineWidth=0.85;
        g.beginPath();
        g.moveTo(-7,-70);g.quadraticCurveTo(-14-breeze*0.5,-59,-13-breeze*0.7,-44);
        g.lineTo(-9.5-breeze*0.5,-45);g.quadraticCurveTo(-10.5-breeze*0.3,-58,-5.5,-68);
        g.closePath();g.fill();g.stroke();
      }

      // 5. Búi tóc thiếu nữ trên đỉnh đầu + Trâm gỗ cài ngang + Nơ lụa xanh lam (Cả hướng lên & xuống)
      g.fillStyle=C.hair;
      g.beginPath();g.ellipse(0,-74.5,6.2,4.6,0,0,Math.PI*2);g.fill();
      g.strokeStyle=C.hairHi;g.lineWidth=1;
      g.beginPath();g.arc(0,-75,4.2,Math.PI*1.15,Math.PI*1.85);g.stroke();
      // Trâm cài tóc màu gỗ ngà xuyên ngang búi tóc (nhô ra hai bên như trong ảnh)
      g.strokeStyle='#ebd3ad';g.lineWidth=2.1;
      g.beginPath();g.moveTo(-10.5,-72.5);g.lineTo(9.5,-76.2);g.stroke();
      g.fillStyle='#f09c96';g.beginPath();g.arc(-10.5,-72.5,1.5,0,Math.PI*2);g.fill();
      // Dải lụa xanh quấn chân búi tóc & cánh nơ bên trái
      g.fillStyle='#8ec0e4';g.strokeStyle='#4b7391';g.lineWidth=0.9;
      g.beginPath();g.roundRect(-5.5,-71.5,11,3,1.5);g.fill();g.stroke();
      g.beginPath();g.ellipse(-6.8,-70,3.2,1.8,-0.4,0,Math.PI*2);g.fill();g.stroke();
    }
  }else if(kind==='truong'){
    // Chòm râu trắng, thắt lưng của trưởng bối.
    if(!back){
      g.fillStyle='#ebe9df';g.strokeStyle='#9faba8';g.lineWidth=1;
      g.beginPath();g.moveTo(-5,-50);g.lineTo(-5,-44);g.quadraticCurveTo(-2,-36,0,-34);g.quadraticCurveTo(5,-39,6,-47);g.lineTo(5,-51);g.closePath();g.fill();g.stroke();
      g.strokeStyle='#b8c0bd';g.beginPath();g.moveTo(-1,-47);g.lineTo(0,-36);g.stroke();
    }
    g.strokeStyle=C.sash;g.lineWidth=2;g.beginPath();g.moveTo(-8,-31);g.lineTo(8,-31);g.stroke();
  }else if(kind==='luc-nham'){
    // Đạo bào dài và trâm ngọc. Phi kiếm/linh khí do Quest1 tự điều khiển.
    const sw=Math.sin(p.walk||0)*1.4;
    g.fillStyle=C.light;g.strokeStyle=C.dark;g.lineWidth=1;
    g.beginPath();g.moveTo(-9,-33);g.lineTo(8,-33);g.lineTo(12+sw,-7);g.lineTo(-12+sw,-7);g.closePath();g.fill();g.stroke();
    g.fillStyle=C.shade;g.beginPath();g.moveTo(1,-31);g.lineTo(7,-31);g.lineTo(10+sw,-8);g.lineTo(2,-9);g.closePath();g.fill();
    g.strokeStyle='#d5e9db';g.beginPath();g.moveTo(0,-29);g.lineTo(-1,-9);g.stroke();
    g.fillStyle='#75c5a8';g.fillRect(-4,-81,9,3);
  }
  npcFaceAnimation(g,p,t,kind);
  g.restore();
}
function poly(points,fill,stroke=C.ink,w=1){g.beginPath();points.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=w;g.stroke()}}
function line(points,color,width=1){g.beginPath();points.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.strokeStyle=color;g.lineWidth=width;g.stroke()}
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h)}
function oval(x,y,rx,ry,c){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=c;g.fill()}

function shoe(x,step,side){
  g.save();
  g.translate(x,-7+step);
  // Trousers & calf wrap (xà cạp)
  poly([[-4,-12],[4,-12],[4,-5],[-4,-5]],C.pants);
  poly([[-3,-12],[1,-12],[1,-5],[-3,-5]],C.pantsHi,null);
  poly([[-3.5,-5],[3.5,-5],[3.5,0],[-3.5,0]],C.wrap);
  line([[-3,-3],[3,-3]],'#9e9072',1);
  line([[-3,-1],[3,-1]],'#9e9072',1);
  // Village cloth/straw shoe
  poly([[-4,0],[4,0],[side?6:5,2],[side?6:5,4.5],[-4.5,4.5],[-4.5,1]],C.shoe);
  line([[-4,3.8],[side?5.5:4.5,3.8]],C.shoeSole,1.6);
  g.restore();
}

function arm(x,phase,near,reaching=false){
  g.save();
  g.translate(x,-45);
  g.rotate(reaching?-2.45:phase*.14);
  // Sleeve
  poly([[-3,-2],[3.5,-2],[5.5,10],[3.5,16],[-3,15],[-4.5,6]],near?C.cloth:C.shade);
  poly([[-2.5,-1],[0.5,0],[1.5,10],[-1,13],[-2.5,8]],near?C.light:C.cloth,null);
  // Rolled cuff / wrist wrap
  poly([[-3,13],[4,13.5],[3.5,17.5],[-3,17]],C.sash);
  line([[-2.5,14.5],[3.5,15]],C.sashHi);
  // Hand
  poly([[-2,17.5],[2.5,17.5],[3,21.5],[0.5,23.5],[-2,22]],C.skin);
  line([[-1,18.5],[1,19],[1,21.5]],C.skinHi);
  g.restore();
}

// Layered, subtly articulated hair. Small curves soften the old angular silhouette
// without introducing heavy texture files or changing the character's hitbox.
function hairCurve(points,color,width=1.1){
  g.beginPath();g.moveTo(points[0],points[1]);
  for(let i=2;i+3<points.length;i+=4)g.bezierCurveTo(points[i],points[i+1],points[i+2],points[i+3],points[i+4],points[i+5]);
  g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.stroke();
}
function hairLock(x,y,length,sway,color,highlight){
  g.beginPath();g.moveTo(x,y);
  g.bezierCurveTo(x-2,y+length*.24,x+sway-2,y+length*.7,x+sway,y+length);
  g.quadraticCurveTo(x+sway+2,y+length*.74,x+2,y+2);
  g.closePath();g.fillStyle=color;g.fill();
  g.beginPath();g.moveTo(x+.7,y+2);g.quadraticCurveTo(x+sway-1,y+length*.52,x+sway+.3,y+length*.82);
  g.strokeStyle=highlight;g.lineWidth=.7;g.stroke();
}
function head(back,t,flutter){
  g.save();g.translate(0,-50);
  const breeze=Math.sin(t*2.5)*.7+flutter*.5;
  if(back){
    // Silhouette is slightly asymmetrical. Hair follows motion independently from the torso.
    poly([[-9,-18],[8,-18],[10,-12],[9+breeze*.3,3],[5+breeze,12],[-5+breeze*.5,11],[-10+breeze*.3,4],[-11,-11]],C.hair);
    hairLock(-7,-13,23,breeze-1,C.hair,C.hairHi);
    hairLock(6,-14,24,breeze+1,C.hair,C.hairHi);
    hairCurve([-5,-15,-5,-7,-6+breeze,2,-3+breeze,9],C.hairHi,.9);
    hairCurve([2,-15,3,-7,2+breeze,2,1+breeze,10],'#382e2a',1.1);
    line([[0,-15],[-1+breeze*.5,9]],'#171411',.7);
  }else{
    poly([[-3,1],[3,1],[3.5,6],[-3.5,6]],C.skinShade);
    poly([[-2,1],[2,1],[2,5],[-2,5]],C.skin,null);
    oval(-9,-6,2.1,3,C.skin);oval(9,-6,2.1,3,C.skin);
    // Rounded cheeks, narrower chin, gentle asymmetric highlights.
    g.beginPath();g.moveTo(-8.5,-16);g.quadraticCurveTo(0,-20,8.4,-16);
    g.quadraticCurveTo(10,-9,7.8,-2);g.quadraticCurveTo(4.2,4.4,.1,4.6);
    g.quadraticCurveTo(-4.6,4.2,-8,-2);g.quadraticCurveTo(-10,-10,-8.5,-16);
    g.closePath();g.fillStyle=C.skin;g.fill();
    g.beginPath();g.ellipse(-1,-5,6.8,8.3,-.08,0,Math.PI*2);g.fillStyle=C.skinHi;g.globalAlpha=.38;g.fill();g.globalAlpha=1;
    oval(-5.6,-3,2.3,1.25,'#df9c83');oval(5.3,-3,2,1.1,'#df9c83');
    // Less rigid facial expression; blink is short and staggered between idle cycles.
    const blink=(t%5.7>5.54)||(t%13.1>13.01);
    hairCurve([-6.6,-10.5,-5.4,-11.1,-4,-11,-2.5,-10.7],'#4d3429',1.15);
    hairCurve([2.5,-10.7,3.8,-11,5.3,-10.9,6.5,-10.3],'#4d3429',1.15);
    if(blink){
      line([[-6,-7.5],[-2.5,-7.5]],'#33261f',1.3);
      line([[2.5,-7.5],[6,-7.5]],'#33261f',1.3);
    }else{
      oval(-4.5,-7.5,2.05,1.8,'#fff3e3');oval(4.3,-7.5,2.05,1.8,'#fff3e3');
      oval(-4.35,-7.5,1.25,1.65,'#302821');oval(4.2,-7.5,1.25,1.65,'#302821');
      oval(-4.7,-8.2,.6,.65,'#ffffff');oval(3.9,-8.2,.6,.65,'#ffffff');
      line([[-6.6,-9.1],[-3,-9.5]],'#3a2922',.85);
      line([[2.8,-9.5],[6.3,-9]],'#3a2922',.85);
    }
    hairCurve([-.1,-6.2,-.9,-4.9,-.6,-4.2,.6,-4.3],C.skinShade,.85);
    hairCurve([-2,-.7,-.8,.15,.7,.1,2,-.9],'#9e624d',1.05);
    // Curved crown and parted fringes; the locks respond to movement.
    g.beginPath();g.moveTo(-10,-11);g.bezierCurveTo(-12,-21,-4,-24,1,-22);
    g.bezierCurveTo(7,-23,11,-18,10,-11);g.quadraticCurveTo(7,-9,6,-12);
    g.quadraticCurveTo(4,-16,1,-12);g.quadraticCurveTo(-1,-16,-3,-13);
    g.quadraticCurveTo(-6,-16,-8,-10);g.closePath();g.fillStyle=C.hair;g.fill();
    hairCurve([-8,-16,-5,-21,1,-22,6,-18],C.hairHi,1.05);
    hairCurve([-5,-17,-3,-18,-2,-16,-1,-14],'#615248',.65);
    hairCurve([2,-19,4,-19,6,-17,7,-15],'#615248',.65);
    hairLock(-9,-11,13,breeze*.45-.6,C.hair,C.hairHi);
    hairLock(8,-11,12,breeze*.5+.5,C.hair,C.hairHi);
  }
  // Soft topknot, cloth wrap and animated trailing ribbon.
  g.beginPath();g.moveTo(-4.6,-21);g.bezierCurveTo(-7,-29,-1,-31,2,-28);
  g.quadraticCurveTo(6,-26,4.5,-21);g.closePath();g.fillStyle=C.hair;g.fill();
  hairCurve([-3,-26,-1,-29,2,-28,3,-25],C.hairHi,.85);
  poly([[-5,-21],[5,-21],[4.5,-18.5],[-4.5,-18.5]],C.tie);
  line([[-4,-19.8],[4,-19.8]],C.tieHi,1.1);
  if(back){
    hairLock(-1,-20,11,-3+breeze,C.tie,C.tieHi);
    hairLock(1,-20,10,3+breeze,C.tie,C.tieHi);
  }
  g.restore();
}

function profile(step,flutter,t,fast,atkPhase=0,combo=0){
  // Compute 3-phase punch kinematics when attacking (atkPhase in 0..1)
  // Phase 1 (0..0.22): wind-up coil back; Phase 2 (0.22..0.58): explosive snap thrust; Phase 3 (0.58..1): retract
  let coil=0,thrust=0;
  if(atkPhase>0){
    if(atkPhase<0.22){
      coil=Math.sin((atkPhase/0.22)*(Math.PI/2));
    }else if(atkPhase<0.58){
      const u=(atkPhase-0.22)/0.36;
      coil=1-u;
      thrust=Math.sin(u*(Math.PI/2));
    }else{
      const u=(atkPhase-0.58)/0.42;
      thrust=Math.cos(u*(Math.PI/2));
    }
  }
  const isHeavy=combo===2;
  const stride=atkPhase>0?(thrust*6.2-coil*2.2):step*(fast?6.5:4.5);
  // Trailing hair tie ribbon behind head (whips backward during punch thrust)
  const ribbonWhip=thrust*5.5-coil*1.5;
  poly([[-5,-69],[-9-flutter*.4-ribbonWhip,-61-thrust*2],[-8-flutter*.5-ribbonWhip*1.1,-54-thrust*1.5],[-4,-67]],C.tie);
  // Far leg planted firmly behind body in martial arts bow stance (tấn pháp)
  g.save();
  g.translate(-stride*.68-thrust*2.5,-Math.max(0,step)*1.8);
  shoe(1,0,true);
  g.restore();
  // Far arm (chambered guard fist or alternate combo punch)
  g.save();
  if(atkPhase>0){
    if(combo===1){
      // Combo 2: far arm is the striking lead hand!
      g.translate(4+thrust*8-coil*3,-45-thrust*1.5);
      g.rotate(-1.48*thrust+0.35*coil);
    }else{
      // Guard / chambered fist pulled back to hip
      g.translate(-3-thrust*3.5+coil*2,-44+thrust*2);
      g.rotate(0.55*thrust-0.3*coil);
    }
  }else{
    g.translate(3,-46);
    g.rotate(step*(fast?.42:.3));
  }
  poly([[-2,0],[2.5,0],[4,11],[2.5,16],[-2,15],[-3,7]],C.shade);
  poly([[-2,12],[3,12],[2.5,15.5],[-2,15]],C.sash);
  poly([[-1.5,15.5],[2.8,15.5],[3.4,19.8],[0.5,21.2],[-2,19.8]],C.skin);
  g.restore();
  // Near leg lunging forward in bow stance
  g.save();
  g.translate(stride*.85+thrust*2.2,-Math.max(0,-step)*1.8);
  shoe(-1,0,true);
  g.restore();
  // Lower tunic skirt in profile (flares dynamically with stance lunge)
  poly([[-7-thrust*1.5,-34],[6+thrust*1.5,-34],[7+stride*.18+thrust*2.5,-13],[2+stride*.2,-11],[-1,-19],[-4-stride*.2,-11],[-9-flutter*.35-thrust*2,-13],[-8,-24]],C.dark);
  poly([[-6,-33],[0,-32],[-1,-18],[-4-stride*.15,-12],[-8-flutter*.3-thrust*1.5,-14]],C.cloth,null);
  poly([[0,-33],[5.5,-33],[6.5+stride*.15+thrust*2,-14],[2+stride*.15,-12],[-0.5,-19]],C.shade,null);
  line([[-7.5-flutter*.3-thrust*1.5,-14],[0,-19],[6+stride*.15+thrust*2,-14]],C.light);
  // Upper torso in profile (twists into the punch)
  g.save();
  g.translate(thrust*1.8-coil*1.2,thrust*0.8);
  poly([[-6.5,-48],[1,-50],[6,-47],[8,-39],[6,-30],[-6,-30],[-8,-39]],C.cloth);
  poly([[-5.5,-46],[0,-47],[2,-38],[0,-31],[-5.5,-32]],C.light,null);
  poly([[4,-45],[7,-39],[5,-31],[2,-32]],C.shade,null);
  // Cross collar wrapping shoulder in profile
  poly([[0,-50],[4.5,-50],[6.5,-46],[3,-40],[-1,-44]],C.collar);
  poly([[5,-46],[7,-43],[2.5,-34],[0,-36]],C.dark);
  line([[4.5,-46],[1.5,-35]],C.light);
  // Cloth waist sash
  poly([[-6.5,-33],[6.5,-33],[6.5,-28.5],[-6.5,-28.5]],C.sash);
  line([[-6,-31.5],[6,-31.5]],C.sashHi);
  // Small village pouch at hip
  poly([[-5,-28.5],[0,-28.5],[1,-21],[-2.5,-19.5],[-6,-22]],C.pouch);
  line([[-4,-27],[-1,-26.5],[-1,-21.5]],C.pouchHi);
  g.restore();
  // Near arm: either chambers at waist (when combo===1) or snaps out in a horizontal martial-arts punch
  g.save();
  if(atkPhase>0){
    if(combo===1){
      // Chambered near fist at waist while far arm strikes
      g.translate(-5.5-thrust*2,-42+thrust*3);
      g.rotate(0.68*thrust-0.25*coil);
      poly([[-3.5,-2],[3,-2.5],[5,3],[4.5,11],[2.5,16.5],[-3,15.5],[-4.5,6]],C.cloth);
      poly([[-3,12.5],[3.5,13],[3,17],[-3,16.5]],C.sash);
      poly([[-2.5,17],[3,17],[3.5,21],[0.5,22],[-2.5,21]],C.skin);
    }else{
      // Explosive horizontal punch thrust with clenched fist
      const reachX=3+thrust*(isHeavy?10.5:8.5)-coil*4.5;
      const reachY=-45-thrust*2.2+coil*1.5;
      g.translate(reachX,reachY);
      g.rotate(-1.52*thrust+0.48*coil);
      // Billowing sleeve & forearm bracer
      poly([[-3.5,-2],[3.2,-2.5],[5.2,3],[4.8,11.5],[2.8,16.5],[-3,15.5],[-4.5,6]],C.cloth);
      poly([[-2.5,0],[0.8,-1],[1.8,5],[1.2,11.5],[-2,12]],C.light,null);
      poly([[-3.2,12.2],[3.8,12.8],[3.3,17],[-3.2,16.5]],C.sash);
      line([[-2.5,14],[3.2,14.5]],C.sashHi);
      // Clenched martial arts fist (nắm đấm siết chặt) with knuckle highlights
      const fScale=1+thrust*(isHeavy?0.28:0.16);
      g.scale(fScale,fScale);
      poly([[-3.2,16.8],[3.6,16.8],[4.2,21.8],[1.5,23.4],[-2.8,22.8],[-3.6,19.5]],C.skin);
      line([[-2,18.2],[2.5,18.2]],C.skinHi,1.2);
      line([[-1.8,20.5],[2.2,20.5]],C.skinShade,1);
    }
  }else{
    g.translate(-2,-45);
    g.rotate(-step*(fast?.46:.32)-.05);
    poly([[-3.5,-2],[3,-2.5],[5,3],[4.5,11],[2.5,16.5],[-3,15.5],[-4.5,6]],C.cloth);
    poly([[-2.5,0],[0.5,-1],[1.5,5],[1,11.5],[-2,12]],C.light,null);
    poly([[-3,12.5],[3.5,13],[3,17],[-3,16.5]],C.sash);
    line([[-2.5,14],[3,14.5]],C.sashHi);
    poly([[-2.5,17],[3,17],[3.8,21.5],[1,23],[-2.5,21.5],[-3,19.5]],C.skin);
    line([[-1,18],[1.5,18.5],[1.5,21]],C.skinHi);
  }
  g.restore();
  // Youthful three-quarter profile head (leans forward with fierce brow during punch)
  g.save();
  g.translate(0.5+thrust*2.4-coil*1.0,-50+thrust*0.8);
  // Neck
  poly([[-2.5,0],[2.5,-1],[3,5],[-3,4]],C.skin);
  // Head & jawline with small nose
  poly([[-6,-17],[1,-19],[6.5,-17],[8.5,-12],[7.5,-7.5],[9.5,-5],[7.5,-3.5],[7.5,0],[3.5,3.5],[-0.5,4],[-5,1],[-7.5,-6]],C.skin);
  poly([[-2,-15],[5,-15.5],[6.5,-11],[6,-6.5],[7.5,-5],[6,0],[2,2],[-2,-1]],C.skinHi,null);
  poly([[-6,-11],[-3,-9],[-3,-1],[0,3],[-4,1],[-6,-4]],C.skinShade,null);
  oval(3.5,-3,1.8,1.1,'#d99278');
  // Eyebrow (angled sharply when punching) & eye
  line([[2,-10-thrust*0.6],[6,-10+thrust*0.7]],'#382e26',1.4);
  const blink=atkPhase<=0&&t%5.4>5.22;
  if(blink){
    line([[3,-7.5],[6,-7.5]],'#241f1b',1.5);
  }else{
    rect(3.5,-8.5,2.2,2.6,'#241f1b');
    rect(4.5,-8.5,1,1,'#f7f0dc');
  }
  // Determined mouth during punch vs gentle smile at rest
  if(atkPhase>0.15){
    line([[4.2,-1.2],[6.8,-0.8]],'#7a4432',1.4);
  }else{
    line([[4.5,-1],[6.8,-1.2]],'#9e624d',1.2);
  }
  // Hair cap, bangs & sideburn around ear
  poly([[-8.5,-12],[-7.5,-19],[-3,-22],[3,-22],[7.5,-19],[9,-14],[5.5,-12.5],[3,-16],[0,-13.5],[-2.5,-14.5],[-3.5,-7],[-7.5,-3]],C.hair);
  line([[-6.5,-17.5],[-2.5,-20],[2,-20],[5.5,-17.5]],C.hairHi);
  poly([[-7.5,-11],[-4.5,-10],[-3.5,-2],[-5.5,1.5],[-8.5,-3]],C.hair);
  // Side fringe swings subtly while walking and during an attack.
  hairLock(-6.8,-14,15,Math.sin(t*2.5)*.6+flutter*.55-thrust*1.4,C.hair,C.hairHi);
  hairCurve([-6.5,-18,-4,-22,2,-22,5.5,-18],C.hairHi,.85);
  // Ear
  oval(-2.5,-6,2,2.8,C.skin);
  line([[-2.5,-7],[-1.8,-6],[-2.5,-4.5]],C.skinShade);
  // Topknot & tie
  poly([[-5,-21],[-6,-26],[-3,-29],[1.5,-29],[4,-25.5],[2,-21]],C.hair);
  line([[-3.5,-26],[-1,-27.5],[1.5,-25.5]],C.hairHi);
  poly([[-4.5,-21],[3,-21],[2.5,-18.5],[-4,-18.5]],C.tie);
  line([[-4,-19.8],[2.5,-19.8]],C.tieHi,1.2);
  g.restore();
}

const OUTFIT_PALETTES=[
  {name:'Áo vải thô mộc',dark:'#5c4d3c',shade:'#786650',cloth:'#988368',light:'#b5a082',sash:'#47585c',sashHi:'#6c8387'},
  {name:'Áo vải chàm',dark:'#33444f',shade:'#465d6b',cloth:'#5c7887',light:'#7b98a8',sash:'#6b533b',sashHi:'#8f7255'},
  {name:'Áo nâu sồng',dark:'#4f3829',shade:'#6b4d39',cloth:'#87634b',light:'#a67f65',sash:'#425949',sashHi:'#61806a'}
];
let outfitIdx=0;
function applyOutfit(idx){
  outfitIdx=((idx%OUTFIT_PALETTES.length)+OUTFIT_PALETTES.length)%OUTFIT_PALETTES.length;
  const pal=OUTFIT_PALETTES[outfitIdx];
  C.dark=pal.dark;C.shade=pal.shade;C.cloth=pal.cloth;C.light=pal.light;C.sash=pal.sash;C.sashHi=pal.sashHi;
  if(PlayerRoster&&PlayerRoster.tieuPham)PlayerRoster.tieuPham.outfit=pal.name;
  return pal;
}

const ATTACK_DURATION=0.38;
const ATTACK_COOLDOWN=0.85;

function triggerAttack(p){
  if(!p||(p.attackCooldown||0)>0)return false;
  p.attackTimer=ATTACK_DURATION;
  p.attackCooldown=ATTACK_COOLDOWN;
  p.attackCooldownMax=ATTACK_COOLDOWN;
  p.attackCombo=((p.attackCombo||0)+1)%3;
  return true;
}

function draw(ctx,p,t,appearance=null){
  const style=appearance&&typeof appearance==='object'?appearance:null;
  // Không đổi cơ chế vận động: chỉ thay palette và chi tiết hình khi vẽ NPC.
  const previousColors=style&&style.palette?{...C}:null;
  if(previousColors)Object.assign(C,DEFAULT_BODY_COLORS,style.palette);
  const moving=p.walk>0,fast=!!p.sprinting,step=moving?Math.sin(p.walk):0,side=p.dir==='right'||p.dir==='left',back=p.dir==='up';
  const atkPhase=p.attackTimer>0?Math.max(0,Math.min(1,1-p.attackTimer/ATTACK_DURATION)):0;
  // Envelope of strike extension (peaks sharply at atkPhase ~ 0.48)
  const atk=atkPhase>0?(atkPhase<0.22?-0.25*Math.sin((atkPhase/0.22)*(Math.PI/2)):atkPhase<0.58?Math.sin(((atkPhase-0.22)/0.36)*(Math.PI/2)):Math.cos(((atkPhase-0.58)/0.42)*(Math.PI/2))):0;
  const strike=Math.max(0,atk);
  const combo=p.attackCombo||0;
  const isHeavy=combo===2;
  const bob=atkPhase>0?-strike*1.8:(moving?Math.abs(Math.sin(p.walk))*(fast?2.1:1.3):Math.sin(t*2.2)*.4);
  g.clearRect(0,0,96,112);
  g.save();
  g.translate(48,103);
  if(p.dir==='left')g.scale(-1,1);
  g.translate((fast&&moving?1.5:0)+(side?atk*(isHeavy?5.2:3.8):0),-bob);
  if(side)g.rotate((fast&&moving?.05:0)+atk*(isHeavy?.11:.08));
  const flutter=Math.sin(t*3+p.walk*.6)*(moving?3.2:1.1)+strike*2.5;
  if(side){
    profile(step,flutter,t,fast,atkPhase,combo);
  }else{
    const stride=atkPhase>0?strike*3.2:step*(fast?3.8:2.8);
    // Legs & village shoes (widen into horse/bow stance when punching)
    shoe(-4.5-strike*1.5,stride,false);
    shoe(4.5+strike*1.5,-stride,false);
    // Left arm
    g.save();
    if(atkPhase>0&&combo===1){
      g.translate(-1,back?-strike*11:strike*8);
      g.scale(1+strike*0.22,1+strike*0.22);
    }else if(atkPhase>0){
      g.translate(-1.5,-strike*3);
    }
    arm(-10.5,step*(fast?1.3:1),false);
    g.restore();
    // Lower tunic skirt
    poly([[-9-strike,-34],[9+strike,-34],[11+flutter*.25+strike,-13],[4,-11],[0,-17],[-4,-11],[-11+flutter*.25-strike,-13]],C.dark);
    poly([[-8,-33],[-1,-31],[-2,-15],[-8.5,-12.5],[-10,-14]],C.cloth,null);
    poly([[1,-33],[8,-33],[10,-14],[8.5,-12.5],[2,-15]],C.shade,null);
    line([[-9.5,-13.5],[-3.5,-12],[0,-16.5],[3.5,-12],[9.5,-13.5]],C.light);
    // Upper torso tunic
    poly([[-8.5,-49],[8.5,-49],[10.5,-43],[9,-31],[-9,-31],[-10.5,-43]],C.cloth);
    poly([[-7.5,-47],[-2,-46],[-1.5,-32],[-7.5,-32],[-9,-42]],C.light,null);
    poly([[3,-47],[8,-46],[9,-42],[7.5,-32],[2,-32]],C.shade,null);
    if(back){
      poly([[-5,-50],[5,-50],[6,-47],[-6,-47]],C.dark);
      line([[0,-47],[0,-33]],C.dark);
      poly([[-9,-33],[9,-33],[9,-28.5],[-9,-28.5]],C.sash);
      line([[-8.5,-31],[8.5,-31]],C.sashHi);
    }else{
      poly([[-5.5,-50],[0,-43],[5.5,-50],[3,-50],[0,-45.5],[-3,-50]],C.collar);
      line([[-4.5,-49],[1.5,-38]],C.dark,2);
      line([[4.5,-49],[-1,-42]],C.dark,2);
      poly([[-9,-33],[9,-33],[9,-28.5],[-9,-28.5]],C.sash);
      line([[-8.5,-31],[8.5,-31]],C.sashHi);
      poly([[-2,-33],[2,-33],[2.5,-27.5],[-2.5,-27.5]],C.sashHi);
      poly([[-2,-28],[1.5,-28],[2.5+flutter*.3,-19],[-0.5+flutter*.3,-18],[-2,-23]],C.sash);
      poly([[4.5,-28.5],[9,-28.5],[10,-21],[6.5,-19.5],[4,-22]],C.pouch);
      line([[5.5,-27],[8.5,-26.5],[8.5,-21.5]],C.pouchHi);
    }
    // Right arm
    g.save();
    if(!p.reachingStone&&atkPhase>0&&combo!==1){
      g.translate(1,back?-strike*11:strike*8);
      g.scale(1+strike*0.24,1+strike*0.24);
    }else if(!p.reachingStone&&atkPhase>0){
      g.translate(1.5,-strike*3);
    }
    arm(10.5,-step*(fast?1.3:1),true,!!p.reachingStone);
    g.restore();
    // Head
    head(back,t,flutter);
  }
  g.restore();
  if(style)npcBodyAccents(g,p,style,t);
  ctx.save();
  ctx.translate(Math.round(p.x),Math.round(p.y));
  ctx.fillStyle='#152d244b';
  ctx.beginPath();
  ctx.ellipse(0,-1,13+strike*3,4.5,0,0,Math.PI*2);
  ctx.fill();

  // Ground dust puff behind planted foot during punch lunge
  if(atkPhase>0.18&&atkPhase<0.85){
    const dustP=(atkPhase-0.18)/0.67;
    const dustAlpha=(1-dustP)*0.55;
    const dustDir=p.dir==='left'?1:p.dir==='right'?-1:0;
    ctx.fillStyle=`rgba(218, 198, 152, ${dustAlpha.toFixed(2)})`;
    for(let i=0;i<3;i++){
      const dx=dustDir*(8+dustP*16+i*5)+(i-1)*3;
      const dy=-1-dustP*(4+i*2.5);
      const r=(3.8-i*0.7)*(1-dustP*0.4);
      ctx.beginPath();
      ctx.arc(dx,dy,Math.max(0.8,r),0,Math.PI*2);
      ctx.fill();
    }
  }

  ctx.imageSmoothingEnabled=false;
  if (p.knockedDown) {
    ctx.rotate(p.dir === 'left' ? -1.35 : 1.35);
    ctx.translate(0, 16);
  }
  const imgW=86*(style&&style.widthScale||1);
  const imgH=100*(style&&style.heightScale||1);
  // Native body art is code-drawn; its double-resolution buffer avoids jagged
  // eyes/hairlines and frame flicker when the camera uses fractional zoom.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sprite,-imgW/2,7-imgH,imgW,imgH);
  ctx.imageSmoothingEnabled = false;

  // Martial arts fist shockwave & wind streaks when attacking (kình phong nắm đấm)
  if(strike>0.06&&!style){
    ctx.save();
    const ang=p.dir==='left'?Math.PI:p.dir==='up'?-Math.PI/2:p.dir==='down'?Math.PI/2:0;
    const yOff=p.dir==='up'?-44:p.dir==='down'?-24:-35;
    ctx.translate(0,yOff);
    ctx.rotate(ang);
    const reach=14+strike*(isHeavy?25:20);
    // 1. High-velocity wind streaks trailing from shoulder to fist
    ctx.strokeStyle=`rgba(255, 245, 210, ${(0.72*strike).toFixed(2)})`;
    ctx.lineWidth=1.5;
    for(const [oy,len]of [[-8,12],[-3,16],[3,16],[8,12]]){
      ctx.beginPath();
      ctx.moveTo(reach-len,oy);
      ctx.lineTo(reach+2,oy*0.65);
      ctx.stroke();
    }
    // 2. Inner & outer crescent shockwave arcs (kình phong vòng cung kép)
    ctx.strokeStyle=isHeavy?`rgba(255, 215, 110, ${(0.95*strike).toFixed(2)})`:`rgba(255, 240, 185, ${(0.9*strike).toFixed(2)})`;
    ctx.lineWidth=isHeavy?3.8:3.0;
    ctx.beginPath();
    ctx.arc(reach-5,0,isHeavy?16:13,-0.92,0.92);
    ctx.stroke();

    ctx.strokeStyle=`rgba(245, 165, 75, ${(0.68*strike).toFixed(2)})`;
    ctx.lineWidth=1.8;
    ctx.beginPath();
    ctx.arc(reach-1,0,isHeavy?20:16.5,-0.72,0.72);
    ctx.stroke();

    // 3. Glowing impact fist core & radial sparks on peak extension
    const coreGrad=ctx.createRadialGradient(reach,0,0.5,reach,0,isHeavy?11:8.5);
    coreGrad.addColorStop(0,`rgba(255, 252, 225, ${(0.95*strike).toFixed(2)})`);
    coreGrad.addColorStop(0.5,`rgba(255, 205, 105, ${(0.65*strike).toFixed(2)})`);
    coreGrad.addColorStop(1,'rgba(255, 170, 60, 0)');
    ctx.fillStyle=coreGrad;
    ctx.beginPath();
    ctx.arc(reach,0,isHeavy?11:8.5,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  // Subtle cooldown recharge bar right under Tiểu Phàm's feet while recovering between punches
  if(!style&&(p.attackCooldown||0)>0&&(p.attackTimer||0)<=0.04){
    const ratio=1-Math.min(1,p.attackCooldown/(p.attackCooldownMax||ATTACK_COOLDOWN));
    ctx.fillStyle='#10221acc';
    ctx.fillRect(-13,5,26,3.5);
    ctx.fillStyle='#e5c165';
    ctx.fillRect(-12,6,Math.round(24*ratio),1.5);
  }
  ctx.restore();
  // Trả lại màu nhân vật gốc ngay sau mỗi lần render; tránh "lây" màu giữa NPC và người chơi.
  if(previousColors)Object.assign(C,previousColors);
  const ceremonyActive=typeof Quest1!=='undefined'&&Quest1.isCeremonyActive&&Quest1.isCeremonyActive();
  const showName=!style&&(!ceremonyActive||(typeof Quest1!=='undefined'&&Quest1.shouldShowPhamName&&Quest1.shouldShowPhamName()));
  if(showName){
    ctx.textAlign='center';
    ctx.font='bold 10px system-ui';
    ctx.fillStyle='#183025df';
    ctx.fillRect(p.x-49,p.y-88,98,16);
    ctx.fillStyle='#f0e0b6';
    ctx.fillText('Tiểu Phàm · 14 tuổi',p.x,p.y-76);
  }
}

// Draw Tiểu Phàm seated on the wooden stool behind the table
function drawSitting(ctx,p,t){
  g.clearRect(0,0,96,112);
  g.save();
  g.translate(48,100);
  const flutter=Math.sin(t*2.2)*.6;
  // Bent seated legs on stool
  shoe(-5.5,-3,false);
  shoe(5.5,-3,false);
  // Seated lower tunic draped over knees
  poly([[-10,-32],[10,-32],[11,-15],[-11,-15]],C.dark);
  poly([[-9,-31],[9,-31],[9.5,-17],[-9.5,-17]],C.cloth,null);
  // Upper torso
  poly([[-8.5,-48],[8.5,-48],[10.5,-42],[9,-30],[-9,-30],[-10.5,-42]],C.cloth);
  poly([[-5.5,-49],[0,-42],[5.5,-49],[3,-49],[0,-44.5],[-3,-49]],C.collar);
  poly([[-9,-32],[9,-32],[9,-28],[-9,-28]],C.sash);
  // Relaxed arms resting forward toward the tea table
  arm(-10,-0.4,false);
  arm(10,0.4,true);
  head(false,t,flutter);
  g.restore();

  ctx.save();
  ctx.translate(Math.round(p.x),Math.round(p.y));
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(sprite,-43,-86,86,96);
  ctx.restore();
  ctx.textAlign='center';
  ctx.font='bold 10px system-ui';
  ctx.fillStyle='#183025df';
  ctx.fillRect(p.x-58,p.y-84,116,16);
  ctx.fillStyle='#f0e0b6';
  ctx.fillText('Tiểu Phàm · Đang ngồi',p.x,p.y-72);
}

// Draw Tiểu Phàm lying horizontally on the wooden bed under the layered quilted blanket
function drawSleeping(ctx,x,y,t){
  ctx.save();
  ctx.translate(x,y);
  const breathe=Math.sin(t*2.2)*0.9;
  const isNightmare=(typeof Quest2!=='undefined'&&Quest2.getState&&Quest2.getState()==='sleeping_start');

  // 1. Soft head & torso shadow cast onto bolster pillow and straw mat
  ctx.fillStyle='rgba(36, 24, 14, 0.28)';
  ctx.beginPath();
  ctx.ellipse(35,-11,16,11,-0.08,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle='rgba(28, 19, 11, 0.24)';
  ctx.beginPath();
  ctx.roundRect(-58,-34,82,70,7);
  ctx.fill();

  // 2. Back hair splayed naturally on the embroidered bolster pillow
  ctx.fillStyle='#16141c';
  ctx.beginPath();
  ctx.ellipse(36,-13,12.5,10.5,-0.1,0,Math.PI*2);
  ctx.fill();
  // Classical topknot (búi tóc) resting on the right side of the pillow
  ctx.fillStyle='#1f1c28';
  ctx.beginPath();
  ctx.ellipse(49,-15,6.8,5.8,0.18,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle='#322e40';
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.arc(49,-15,4.2,-0.8,1.5);
  ctx.stroke();
  // Hair tie ribbon (dây buộc tóc cổ trang) + trailing ribbon tails
  ctx.fillStyle=C.tie;
  ctx.beginPath();
  ctx.roundRect(41,-19,3.5,8,1.2);
  ctx.fill();
  ctx.fillStyle=C.tieHi||'#7fe3b3';
  ctx.fillRect(41.8,-18,1.5,6);
  ctx.strokeStyle=C.tie;
  ctx.lineWidth=1.6;
  ctx.beginPath();
  ctx.moveTo(42,-11);
  ctx.quadraticCurveTo(45,-6,50,-5+Math.sin(t*1.8)*0.6);
  ctx.stroke();

  // 3. Neck & Upper Torso in Cross-Collar Tunic (Áo giao lĩnh) peeking out from blanket
  ctx.fillStyle='#c9976b';
  ctx.beginPath();
  ctx.ellipse(22,-12+breathe*0.25,5.5,4.8,0,0,Math.PI*2);
  ctx.fill();
  // Left & right shoulders in current outfit cloth
  ctx.fillStyle=C.clothShade||'#23524a';
  ctx.beginPath();
  ctx.roundRect(4,-24+breathe*0.35,22,25,6);
  ctx.fill();
  ctx.fillStyle=C.cloth;
  ctx.beginPath();
  ctx.roundRect(5,-22+breathe*0.35,20,22,5);
  ctx.fill();
  // White inner undershirt & overlapping giao-lĩnh collar
  ctx.strokeStyle='#f2ece1';
  ctx.lineWidth=1.8;
  ctx.beginPath();
  ctx.moveTo(23,-16+breathe*0.3);
  ctx.lineTo(13,-10+breathe*0.3);
  ctx.stroke();
  ctx.strokeStyle=C.collar;
  ctx.lineWidth=2.2;
  ctx.beginPath();
  ctx.moveTo(22,-18+breathe*0.3);
  ctx.lineTo(10,-9+breathe*0.3);
  ctx.moveTo(21,-6+breathe*0.3);
  ctx.lineTo(14,-11+breathe*0.3);
  ctx.stroke();

  // 4. Reclining 3/4 Face on Pillow (facing slightly toward viewer & up-left)
  ctx.fillStyle='#d9a87e';
  ctx.beginPath();
  ctx.ellipse(30,-11.5,9.5,8.2,-0.12,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle=C.skin;
  ctx.beginPath();
  ctx.ellipse(30.5,-12.2,9.0,7.8,-0.12,0,Math.PI*2);
  ctx.fill();
  // Subtle warm cheek blush
  ctx.fillStyle='rgba(224, 132, 110, 0.24)';
  ctx.beginPath();
  ctx.ellipse(27.5,-9.2,2.8,2.0,0,0,Math.PI*2);
  ctx.ellipse(31.5,-15.5,2.4,1.6,0,0,Math.PI*2);
  ctx.fill();
  // Detailed ear on lower side of head
  ctx.fillStyle=C.skin;
  ctx.beginPath();
  ctx.ellipse(31.5,-4.2,2.8,2.1,0.2,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle='#b8845c';
  ctx.lineWidth=0.9;
  ctx.beginPath();
  ctx.arc(31.5,-4.3,1.3,0,Math.PI);
  ctx.stroke();

  // 5. Sleeping Facial Features (eyebrows, closed eyelashes, nose bridge, gentle mouth)
  // Nose bridge & tip
  ctx.strokeStyle='#c7926a';
  ctx.lineWidth=1.1;
  ctx.beginPath();
  ctx.moveTo(30.5,-13.2);
  ctx.quadraticCurveTo(27.8,-13.4,27.5,-12.0);
  ctx.stroke();
  // Eyebrows (furrowed slightly if entering midnight nightmare, calm otherwise)
  ctx.strokeStyle='#2a201b';
  ctx.lineWidth=1.2;
  ctx.lineCap='round';
  ctx.beginPath();
  if(isNightmare){
    ctx.moveTo(33.2,-15.8);ctx.lineTo(30.8,-14.6);
    ctx.moveTo(31.8,-10.2);ctx.lineTo(29.8,-11.2);
  }else{
    ctx.moveTo(33.4,-16.2);ctx.quadraticCurveTo(31.8,-16.6,30.4,-15.6);
    ctx.moveTo(32.0,-9.6);ctx.quadraticCurveTo(30.4,-9.8,29.2,-9.0);
  }
  ctx.stroke();
  // Closed sleeping eyelids with soft lash curve
  ctx.strokeStyle='#221a16';
  ctx.lineWidth=1.35;
  ctx.beginPath();
  ctx.moveTo(31.6,-15.0);
  ctx.quadraticCurveTo(29.8,-14.3,29.0,-15.2);
  ctx.moveTo(30.2,-9.8);
  ctx.quadraticCurveTo(28.4,-9.1,27.6,-10.0);
  ctx.stroke();
  // Peaceful sleeping mouth
  ctx.strokeStyle='#b57660';
  ctx.lineWidth=1.1;
  ctx.beginPath();
  ctx.moveTo(25.2,-12.8);
  ctx.quadraticCurveTo(24.4,-11.6,25.0,-10.5);
  ctx.stroke();

  // 6. Forehead bangs & sideburns framing the sleeping face
  ctx.fillStyle=C.hair;
  ctx.beginPath();
  ctx.moveTo(39,-19);
  ctx.quadraticCurveTo(33,-21,27,-17.5);
  ctx.quadraticCurveTo(31,-16.5,35,-16);
  ctx.quadraticCurveTo(31,-13,34,-8);
  ctx.quadraticCurveTo(35,-4.5,31,-3.5);
  ctx.quadraticCurveTo(38,-4,41,-10);
  ctx.closePath();
  ctx.fill();
  // Soft hair sheen highlight
  ctx.strokeStyle=C.hairHi||'#353145';
  ctx.lineWidth=1.1;
  ctx.beginPath();
  ctx.arc(37,-14,6.5,-1.2,0.5);
  ctx.stroke();

  // 7. Layered Quilted Blanket (Chăn bông cổ phong xếp nếp phập phồng theo nhịp thở)
  const qTop=-34-breathe*0.55;
  const qH=68+breathe*0.8;
  // White-cream inner sheet cuff folded back at top edge of quilt
  ctx.fillStyle='#e6decb';
  ctx.beginPath();
  ctx.roundRect(0,qTop+2,11,qH-4,3);
  ctx.fill();
  ctx.strokeStyle='#b8ab92';
  ctx.lineWidth=1;
  ctx.stroke();
  // Main outer quilt border
  ctx.fillStyle='#566962';
  ctx.beginPath();
  ctx.roundRect(-56,qTop,62,qH,6);
  ctx.fill();
  ctx.strokeStyle='#2f3b37';
  ctx.lineWidth=1.3;
  ctx.stroke();
  // Quilted inner center panel with 3D body contour highlight
  ctx.fillStyle='#72877f';
  ctx.beginPath();
  ctx.roundRect(-51,qTop+4,51,qH-8,4);
  ctx.fill();
  // Raised torso & knee contour highlights under the blanket
  ctx.fillStyle='rgba(148, 171, 162, 0.45)';
  ctx.beginPath();
  ctx.ellipse(-16,-10-breathe*0.6,15,18,0.1,0,Math.PI*2);
  ctx.ellipse(-38,-6-breathe*0.3,11,15,-0.1,0,Math.PI*2);
  ctx.fill();
  // Soft fabric drape folds & diamond quilting stitch lines
  ctx.strokeStyle='#465750';
  ctx.lineWidth=1.1;
  ctx.beginPath();
  ctx.moveTo(-26,qTop+6);
  ctx.quadraticCurveTo(-22,0,-27,qTop+qH-6);
  ctx.moveTo(-41,qTop+8);
  ctx.quadraticCurveTo(-37,2,-42,qTop+qH-8);
  ctx.stroke();
  // Rustic cloth patch sewn onto the quilt
  const py=-15-breathe*0.5;
  ctx.fillStyle='#9e8667';
  ctx.beginPath();
  ctx.roundRect(-37,py,17,15,2);
  ctx.fill();
  ctx.strokeStyle='#544432';
  ctx.lineWidth=1;
  ctx.stroke();
  // Cross-stitch thread marks on patch
  ctx.strokeStyle='#d9c8ac';
  ctx.lineWidth=0.9;
  for(const [sx,sy] of [[-35,py+3],[-23,py+3],[-35,py+12],[-23,py+12]]){
    ctx.beginPath();
    ctx.moveTo(sx-1.5,sy-1.5);ctx.lineTo(sx+1.5,sy+1.5);
    ctx.stroke();
  }

  // 8. Resting Arm & Hand placed naturally over the upper edge of the quilt
  ctx.fillStyle=C.sleeve||C.cloth;
  ctx.beginPath();
  ctx.roundRect(6,-7+breathe*0.4,13,8,3.5);
  ctx.fill();
  ctx.strokeStyle='#1f4740';
  ctx.lineWidth=0.9;
  ctx.stroke();
  // Cuff trim
  ctx.fillStyle=C.collar;
  ctx.fillRect(5.5,-6.5+breathe*0.4,2.5,7);
  // Hand & relaxed fingers resting on quilt cuff
  ctx.fillStyle=C.skin;
  ctx.beginPath();
  ctx.ellipse(3.5,-3+breathe*0.4,3.8,2.9,0.15,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle='#c49068';
  ctx.lineWidth=0.75;
  ctx.beginPath();
  ctx.moveTo(1.5,-4+breathe*0.4);ctx.lineTo(3.5,-4+breathe*0.4);
  ctx.moveTo(1.2,-2.6+breathe*0.4);ctx.lineTo(3.4,-2.6+breathe*0.4);
  ctx.stroke();

  // 9. Floating 'z Z Z' sleep bubbles
  ctx.fillStyle='#f7efc2';
  ctx.font='bold 11px Georgia, serif';
  ctx.textAlign='center';
  for(let i=0;i<3;i++){
    const zPhase=((t*0.75+i*0.33)%1);
    const zx=34+i*8+Math.sin(t*2+i)*3;
    const zy=-28-zPhase*26;
    ctx.globalAlpha=Math.sin(zPhase*Math.PI)*0.9;
    ctx.fillText(i===2?'Z':'z',zx,zy);
  }
  ctx.globalAlpha=1;
  ctx.restore();
}

  let hudMsg='',hudTimer=0;
  const avatarImg=(typeof Image!=='undefined')?new Image():null;
  if(avatarImg)avatarImg.src='tieu-pham-avatar.webp';
  function showHUDInfo(msg){hudMsg=msg;hudTimer=3.6;}
  function handleClickHUD(cx,cy,W,p){
    const hx=12,hy=12;
    const isNarrow=W<430;
    const barW=isNarrow?116:132;
    const panelW=barW+58;
    const panelH=50;
    if(cx>=hx&&cx<=hx+panelW&&cy>=hy&&cy<=hy+panelH){
      let qInfo='';
      if(typeof Quest1!=='undefined'){
        const qs=Quest1.getState();
        if(qs==='registered'||qs==='awaiting_selection'){
          const dPassed=typeof Villagers!=='undefined'?(Villagers.day-(Quest1.registeredDay||Villagers.day)):0;
          qInfo='\nNhiệm vụ: Tiên Duyên Khởi Đầu (Ngày '+Math.min(3,dPassed)+'/3)';
        }else if(qs==='selection_ready'){
          qInfo='\nNhiệm vụ: Tiên Duyên Khởi Đầu · Đã tới ngày tuyển chọn!';
        }else if(qs==='completed'){
          qInfo='\nNhiệm vụ: Tiên Duyên Đã Định';
        }
      }
      showHUDInfo('Trương Tiểu Phàm (14 tuổi) · Phàm Nhân\nKhí Huyết: '+Math.round(p.hp??100)+'/'+(p.maxHp||100)+' HP\nLinh Lực: 0/0 MP (Chưa ngưng khí)'+qInfo);
      return true;
    }
    return false;
  }

  function drawHUD(ctx,p,W,H,t,dt=0.016){
    if(!ctx||!p)return;
    if(hudTimer>0)hudTimer=Math.max(0,hudTimer-dt);
    ctx.save();
    const hx=12,hy=12;
    const isNarrow=W<430;
    const barW=isNarrow?116:132;
    const panelW=barW+58;
    const panelH=50;

    // 1. Lacquer & jade background plaque
    ctx.beginPath();
    ctx.roundRect(hx,hy,panelW,panelH,8);
    ctx.fillStyle='#0f221ae8';
    ctx.fill();
    ctx.strokeStyle='#bfa35b';
    ctx.lineWidth=1.4;
    ctx.stroke();

    // Subtle inner jade border
    ctx.beginPath();
    ctx.roundRect(hx+2,hy+2,panelW-4,panelH-4,6);
    ctx.strokeStyle='#32584488';
    ctx.lineWidth=1;
    ctx.stroke();

    // Corner brass rivets
    ctx.fillStyle='#d6c07a';
    for(const [rx,ry] of [
      [hx+4.5,hy+4.5],
      [hx+panelW-4.5,hy+4.5],
      [hx+4.5,hy+panelH-4.5],
      [hx+panelW-4.5,hy+panelH-4.5]
    ]){
      ctx.beginPath();
      ctx.arc(rx,ry,1.4,0,Math.PI*2);
      ctx.fill();
    }

    // 2. Avatar aperture
    const ax=hx+24,ay=hy+25,ar=20;

    // Outer carved antique bronze rim
    const rimGrad=ctx.createLinearGradient(ax-ar,ay-ar,ax+ar,ay+ar);
    rimGrad.addColorStop(0,'#e5ca78');
    rimGrad.addColorStop(0.5,'#9e7939');
    rimGrad.addColorStop(1,'#573d18');
    ctx.beginPath();
    ctx.arc(ax,ay,ar+2.5,0,Math.PI*2);
    ctx.fillStyle=rimGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ax,ay,ar+0.5,0,Math.PI*2);
    ctx.fillStyle='#22150a';
    ctx.fill();

    // Clipped portrait of Tiểu Phàm
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax,ay,ar-0.5,0,Math.PI*2);
    ctx.clip();

    // Celadon / Jade backdrop inside avatar
    const bgGrad=ctx.createRadialGradient(ax,ay-6,2,ax,ay,ar);
    bgGrad.addColorStop(0,'#2f5b47');
    bgGrad.addColorStop(1,'#13281e');
    ctx.fillStyle=bgGrad;
    ctx.fillRect(ax-ar,ay-ar,ar*2,ar*2);

    // Soft sunbeam beam through aperture
    ctx.fillStyle='rgba(255,248,220,0.12)';
    ctx.beginPath();
    ctx.moveTo(ax-ar,ay-ar);
    ctx.lineTo(ax+5,ay-ar);
    ctx.lineTo(ax+ar,ay+ar);
    ctx.lineTo(ax-5,ay+ar);
    ctx.closePath();
    ctx.fill();

    if(avatarImg&&avatarImg.complete&&avatarImg.naturalWidth>0){
      ctx.imageSmoothingEnabled=true;
      const sz=(ar+2.5)*2;
      ctx.drawImage(avatarImg,ax-sz/2,ay-sz/2+1,sz,sz);
    }else{
    // Draw Tiểu Phàm bust (shoulders, collar, face, eyes, hair, topknot)
    ctx.fillStyle=C.cloth;
    ctx.beginPath();
    ctx.roundRect(ax-13,ay+7,26,16,[4,4,0,0]);
    ctx.fill();

    // Crossed rustic collar
    ctx.fillStyle=C.collar;
    ctx.beginPath();
    ctx.moveTo(ax-4.5,ay+6);
    ctx.lineTo(ax,ay+12);
    ctx.lineTo(ax+4.5,ay+6);
    ctx.lineTo(ax+2.5,ay+6);
    ctx.lineTo(ax,ay+9.5);
    ctx.lineTo(ax-2.5,ay+6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle=C.dark;
    ctx.lineWidth=1.2;
    ctx.beginPath();
    ctx.moveTo(ax-3.8,ay+6.5);
    ctx.lineTo(ax+1,ay+11);
    ctx.moveTo(ax+3.8,ay+6.5);
    ctx.lineTo(ax-0.8,ay+9.5);
    ctx.stroke();

    // Neck
    ctx.fillStyle=C.skinShade;
    ctx.fillRect(ax-3,ay+2,6,6);
    ctx.fillStyle=C.skin;
    ctx.fillRect(ax-2.2,ay+2,4.4,5);

    // Ears
    ctx.fillStyle=C.skin;
    ctx.beginPath();
    ctx.ellipse(ax-8.5,ay-3,1.8,2.5,0,0,Math.PI*2);
    ctx.ellipse(ax+8.5,ay-3,1.8,2.5,0,0,Math.PI*2);
    ctx.fill();

    // Face contour
    ctx.fillStyle=C.skin;
    ctx.beginPath();
    ctx.ellipse(ax,ay-3,7.8,8.2,0,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle=C.skinHi;
    ctx.beginPath();
    ctx.ellipse(ax,ay-4,6.2,6.8,0,0,Math.PI*2);
    ctx.fill();

    // Rosy cheeks
    ctx.fillStyle='rgba(217,146,120,0.45)';
    ctx.beginPath();
    ctx.ellipse(ax-4.5,ay-1.5,1.8,1.1,0,0,Math.PI*2);
    ctx.ellipse(ax+4.5,ay-1.5,1.8,1.1,0,0,Math.PI*2);
    ctx.fill();

    // Brows
    ctx.strokeStyle='#382e26';
    ctx.lineWidth=1.1;
    ctx.beginPath();
    ctx.moveTo(ax-5.5,ay-7);
    ctx.lineTo(ax-2,ay-7.5);
    ctx.moveTo(ax+2,ay-7.5);
    ctx.lineTo(ax+5.5,ay-7);
    ctx.stroke();

    // Eyes with natural gentle blink
    const isBlink=(t%5.4>5.2);
    if(isBlink){
      ctx.strokeStyle='#241f1b';
      ctx.lineWidth=1.3;
      ctx.beginPath();
      ctx.moveTo(ax-5.2,ay-5);
      ctx.lineTo(ax-2.2,ay-5);
      ctx.moveTo(ax+2.2,ay-5);
      ctx.lineTo(ax+5.2,ay-5);
      ctx.stroke();
    }else{
      ctx.fillStyle='#241f1b';
      ctx.fillRect(ax-5.2,ay-6.2,2.6,2.6);
      ctx.fillRect(ax+2.6,ay-6.2,2.6,2.6);
      ctx.fillStyle='#f7f0dc';
      ctx.fillRect(ax-4.4,ay-6.2,1,1);
      ctx.fillRect(ax+3.4,ay-6.2,1,1);
    }

    // Nose and gentle smile
    ctx.strokeStyle=C.skinShade;
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(ax,ay-4.2);
    ctx.lineTo(ax-0.5,ay-2);
    ctx.lineTo(ax+0.5,ay-2);
    ctx.stroke();

    ctx.strokeStyle='#9e624d';
    ctx.lineWidth=1.1;
    ctx.beginPath();
    ctx.moveTo(ax-1.8,ay+0.5);
    ctx.lineTo(ax,ay+1.2);
    ctx.lineTo(ax+1.8,ay+0.5);
    ctx.stroke();

    // Hair bangs & side locks
    ctx.fillStyle=C.hair;
    ctx.beginPath();
    ctx.moveTo(ax-8,ay-8);
    ctx.quadraticCurveTo(ax,ay-14,ax+8,ay-8);
    ctx.lineTo(ax+8.5,ay-1);
    ctx.lineTo(ax+6.5,ay-1);
    ctx.lineTo(ax+6.5,ay-6);
    ctx.lineTo(ax+1,ay-8.5);
    ctx.lineTo(ax,ay-11);
    ctx.lineTo(ax-1,ay-8.5);
    ctx.lineTo(ax-6.5,ay-6);
    ctx.lineTo(ax-6.5,ay-1);
    ctx.lineTo(ax-8.5,ay-1);
    ctx.closePath();
    ctx.fill();

    // Hair highlight
    ctx.strokeStyle=C.hairHi;
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(ax-5,ay-10.5);
    ctx.lineTo(ax-1.5,ay-12);
    ctx.moveTo(ax+1.5,ay-12);
    ctx.lineTo(ax+5,ay-10.5);
    ctx.stroke();

    // High topknot & red ribbon tie
    ctx.fillStyle=C.hair;
    ctx.beginPath();
    ctx.arc(ax,ay-14.5,4.2,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle=C.tie;
    ctx.beginPath();
    ctx.roundRect(ax-3.8,ay-13.5,7.6,2.6,1);
    ctx.fill();
    ctx.strokeStyle=C.tieHi;
    ctx.lineWidth=1;
    ctx.strokeRect(ax-3.8,ay-13.5,7.6,2.6);
    }

    ctx.restore(); // end clip

    // Level badge pinned at bottom of avatar circle
    const badgeW=28,badgeH=11;
    const bx=ax-badgeW/2,by=ay+ar-5;
    ctx.fillStyle='#2e1c10';
    ctx.beginPath();
    ctx.roundRect(bx,by,badgeW,badgeH,2.5);
    ctx.fill();
    ctx.strokeStyle='#d6b567';
    ctx.lineWidth=1.1;
    ctx.stroke();
    ctx.fillStyle='#ffefc6';
    ctx.font='bold 7.5px system-ui';
    ctx.textAlign='center';
    ctx.fillText('LV. 1',ax,by+8.2);

    // 3. Right Info Area (Name, Realm, HP, MP)
    const tx=hx+49;
    const row1Y=hy+11;

    // Name: Tiểu Phàm
    ctx.save();
    ctx.font='bold 11px "Noto Serif", Georgia, serif';
    ctx.textBaseline='middle';
    ctx.textAlign='left';
    ctx.fillStyle='#000000aa';
    ctx.fillText('Tiểu Phàm',tx+0.5,row1Y+0.5);
    ctx.fillStyle='#fef4d8';
    ctx.fillText('Tiểu Phàm',tx,row1Y);
    const nameW=ctx.measureText('Tiểu Phàm').width;

    // Realm badge: [Phàm Nhân] (perfectly aligned with name)
    const rw=isNarrow?50:54,rh=13;
    const rx=tx+nameW+6;
    const ry=row1Y-rh/2;
    ctx.fillStyle='#142c22';
    ctx.beginPath();
    ctx.roundRect(rx,ry,rw,rh,3);
    ctx.fill();
    ctx.strokeStyle='#5a8f6e';
    ctx.lineWidth=0.9;
    ctx.stroke();

    // Inner subtle glow
    ctx.fillStyle='rgba(90,160,120,0.18)';
    ctx.beginPath();
    ctx.roundRect(rx+0.5,ry+0.5,rw-1,rh-1,2.5);
    ctx.fill();

    ctx.fillStyle='#b5ecc3';
    ctx.font='bold 8px system-ui';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('Phàm Nhân',rx+rw/2,row1Y);
    ctx.restore();

    // 4. HP Bar (Khí huyết phàm nhân: 100 HP)
    const hpY=hy+18;
    const hpMax=p.maxHp||100;
    const hpCur=Math.max(0,Math.min(hpMax,p.hp??100));
    const hpRatio=hpMax>0?hpCur/hpMax:1;

    // Background slot
    ctx.fillStyle='#1b0606';
    ctx.beginPath();
    ctx.roundRect(tx,hpY,barW,11,2);
    ctx.fill();
    ctx.strokeStyle='#592525';
    ctx.lineWidth=0.9;
    ctx.stroke();

    // Filled HP bar
    if(hpRatio>0){
      const curW=Math.max(2,Math.round((barW-1.6)*hpRatio));
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(tx+0.8,hpY+0.8,curW,9.4,1.5);
      ctx.clip();
      const hpGrad=ctx.createLinearGradient(tx,hpY,tx,hpY+11);
      hpGrad.addColorStop(0,'#ff5252');
      hpGrad.addColorStop(0.45,'#c91616');
      hpGrad.addColorStop(1,'#690b0b');
      ctx.fillStyle=hpGrad;
      ctx.fillRect(tx,hpY,barW,11);

      // Specular top gloss
      ctx.fillStyle='rgba(255,255,255,0.32)';
      ctx.fillRect(tx,hpY+1,curW,3.2);
      ctx.restore();
    }

    // 10% tick marks across HP bar
    ctx.strokeStyle='#2d0a0a88';
    ctx.lineWidth=1;
    for(let i=1;i<10;i++){
      const tickX=Math.round(tx+(barW*i)/10);
      ctx.beginPath();
      ctx.moveTo(tickX,hpY+1.2);
      ctx.lineTo(tickX,hpY+9.8);
      ctx.stroke();
    }

    // HP Label: "HP  100 / 100" (vertically centered)
    ctx.font='bold 8px system-ui';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    const hpText=`HP  ${Math.round(hpCur)} / ${hpMax}`;
    ctx.fillStyle='#000000cc';
    ctx.fillText(hpText,tx+barW/2+0.5,hpY+6);
    ctx.fillStyle='#ffffff';
    ctx.fillText(hpText,tx+barW/2,hpY+5.5);

    // 5. MP Bar (Năng lượng / Linh lực: 0 / 0)
    const mpY=hy+32;
    const mpMax=p.maxMp||0;
    const mpCur=Math.max(0,Math.min(mpMax,p.mp||0));
    const mpRatio=mpMax>0?mpCur/mpMax:0;

    // Background slot
    ctx.fillStyle='#0a131a';
    ctx.beginPath();
    ctx.roundRect(tx,mpY,barW,9.5,2);
    ctx.fill();
    ctx.strokeStyle='#253b4c';
    ctx.lineWidth=0.9;
    ctx.stroke();

    if(mpRatio>0){
      const curW=Math.max(2,Math.round((barW-1.6)*mpRatio));
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(tx+0.8,mpY+0.8,curW,7.9,1.5);
      ctx.clip();
      const mpGrad=ctx.createLinearGradient(tx,mpY,tx,mpY+9.5);
      mpGrad.addColorStop(0,'#4da8ff');
      mpGrad.addColorStop(0.5,'#1e6bc2');
      mpGrad.addColorStop(1,'#0e3968');
      ctx.fillStyle=mpGrad;
      ctx.fillRect(tx,mpY,barW,9.5);
      ctx.fillStyle='rgba(255,255,255,0.3)';
      ctx.fillRect(tx,mpY+1,curW,2.8);
      ctx.restore();
    }

    // MP Label: Phàm nhân mana = 0 (vertically centered)
    ctx.font='bold 7px system-ui';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    const mpText=mpMax>0?`MP  ${Math.round(mpCur)} / ${mpMax}`:'MP  0 / 0 · Chưa ngưng khí';
    ctx.fillStyle='#000000cc';
    ctx.fillText(mpText,tx+barW/2+0.5,mpY+5.5);
    ctx.fillStyle='#a5bfd2';
    ctx.fillText(mpText,tx+barW/2,mpY+5);

    // 6. Floating popover if avatar was tapped
    if(hudTimer>0&&hudMsg){
      const infoW=Math.min(270,W-24);
      const lines=hudMsg.split('\n');
      const boxH=lines.length*14+12;
      const questBoardShowing=typeof Quest1!=='undefined'&&Quest1.isQuestBoardVisible&&Quest1.isQuestBoardVisible();
      const popY=questBoardShowing?hy+panelH+42+10:hy+panelH+6;
      ctx.fillStyle='#13271fee';
      ctx.beginPath();
      ctx.roundRect(hx,popY,infoW,boxH,5);
      ctx.fill();
      ctx.strokeStyle='#d9bc73';
      ctx.lineWidth=1;
      ctx.stroke();
      ctx.font='10px system-ui';
      ctx.textAlign='left';
      ctx.fillStyle='#fceecb';
      lines.forEach((line,idx)=>{
        ctx.fillText(line,hx+8,popY+14+idx*14);
      });
    }

    ctx.restore();
  }

  return{draw,drawSitting,drawSleeping,drawHUD,handleClickHUD,showHUDInfo,triggerAttack,applyOutfit,get outfitIdx(){return outfitIdx}};})();
// TieuPhamHome moved to tieu-pham-home.js (wakeForQuest)
