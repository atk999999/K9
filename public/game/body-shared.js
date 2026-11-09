'use strict';
// Hệ body chung: mọi NPC quan trọng dùng chung hình học và hoạt ảnh body Tiểu Phàm.
// Chỉ thay palette, các chi tiết lắp ghép và tỷ lệ vẽ; vị trí chân/collision không đổi.
const SharedBody=(()=>{
  const presets=Object.freeze({
    tieu_pham:{variant:'tieu-pham',widthScale:1,heightScale:1,palette:{}},
    truong:{variant:'truong',widthScale:.98,heightScale:1.03,palette:{cloth:'#7d826d',light:'#a5ac93',shade:'#626b5b',dark:'#47564b',collar:'#d9dcc5',sash:'#8e7745',sashHi:'#c4aa6c',hair:'#c8cdcb',hairHi:'#f4f4ed',skin:'#d9a988',skinHi:'#f2c8a8'}},
    a_huy:{variant:'a-huy',widthScale:1.15,heightScale:.98,palette:{cloth:'#bb8d4e',light:'#e1b86e',shade:'#987037',dark:'#795c35',collar:'#f5e2b2',sash:'#855a34',sashHi:'#e3c27a',skin:'#dfb08d',skinHi:'#f6c9aa',tie:'#b17a3d',tieHi:'#e4bd6b'}},
    a_nguyet:{variant:'a-nguyet',widthScale:.90,heightScale:1.02,palette:{cloth:'#89adc9',light:'#bfd9ea',shade:'#6992b2',dark:'#4b7391',collar:'#f7f4ec',sash:'#6290b5',sashHi:'#b6dcf0',hair:'#2b2329',hairHi:'#64515f',tie:'#84b4d8',tieHi:'#cbe6f7',skin:'#f0c4aa',skinHi:'#fde0cd'}},
    luc_nham:{variant:'luc-nham',widthScale:.97,heightScale:1.12,palette:{cloth:'#a2b9a6',light:'#d0e6d5',shade:'#6c947d',dark:'#436b5c',collar:'#f8f5e8',sash:'#4a7766',sashHi:'#9cd0b7',hair:'#1b2d2c',hairHi:'#586c64',tie:'#498474',tieHi:'#b2d1ad',skin:'#ebc7a9',skinHi:'#ffe2c5'}}
  });
  function label(ctx,x,y,name,dy=-82){
    ctx.save();ctx.textAlign='center';ctx.font='bold 10px system-ui';
    const w=ctx.measureText(name).width+12;
    ctx.fillStyle='#172d23dd';ctx.fillRect(x-w/2,y+dy,w,15);
    ctx.fillStyle='#eee0ae';ctx.fillText(name,x,y+dy+11);ctx.restore();
  }
  function draw(ctx,actor,t,preset='tieu_pham',options={}){
    if(typeof TieuPham==='undefined'||typeof TieuPham.draw!=='function')return false;
    const appearance=presets[preset]||presets.tieu_pham;
    const dir=actor.dir==='up'||actor.dir==='down'||actor.dir==='left'||actor.dir==='right'
      ?actor.dir:actor.dir<0?'left':'right';
    const body={x:actor.x,y:actor.y,dir,walk:actor.walk||0,sprinting:!!actor.sprinting,
      reachingStone:!!actor.reachingStone,knockedDown:!!actor.knockedDown,
      attackTimer:0,attackCooldown:0,attackCombo:0};
    ctx.save();TieuPham.draw(ctx,body,t,appearance);ctx.restore();
    if(options.label)label(ctx,actor.x,actor.y,options.label,options.labelOffset??-82*appearance.heightScale);
    return true;
  }
  return {draw,presets,label};
})();
