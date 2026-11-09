'use strict';
/**
 * Shared 12-frame fire for Huyết Dạ and post-raid embers.
 * One small WebP sprite sheet; no extra animation timers or per-frame allocations.
 * Coordinates and all quest flags are unchanged.
 */
const FireFX = (() => {
  const IMG = new Image();
  IMG.src = 'fire-sprite.webp?v=s9-fire12-02';
  const FRAME_W = 88, FRAME_H = 112;
  const TWO_PI = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function draw(ctx,x,y,size,phase,t,power=1) {
    const heat = clamp(power,0,1);
    if (heat < .035) return;
    const beat = .92 + .06*Math.sin(t*6.2+phase) + .035*Math.sin(t*12.4+phase*2.4);
    const w = size * 2.75 * beat;
    const h = size * 2.85 * (0.94 + .08*Math.sin(t*8.3+phase));
    ctx.save();
    ctx.globalAlpha = clamp(heat*.92+.04,0,1);
    // Illumination follows the embers, but does not obscure roof details.
    const grad = ctx.createRadialGradient(x,y-size*.27,2,x,y-size*.27,size*2.65);
    grad.addColorStop(0,`rgba(255,173,70,${(.17*heat).toFixed(3)})`);
    grad.addColorStop(.40,`rgba(242,91,30,${(.085*heat).toFixed(3)})`);
    grad.addColorStop(1,'rgba(120,26,13,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x-size*2.7,y-size*2.9,size*5.4,size*5.4);
    if (IMG.complete && IMG.naturalWidth >= FRAME_W*6) {
      const frame = ((Math.floor(t * 11.5 + phase * 3.1) % 12) + 12) % 12;
      // Soft-edged luminous texture with discrete tongues & a stable anchored base.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(IMG,(frame%6)*FRAME_W,Math.floor(frame/6)*FRAME_H,
        FRAME_W,FRAME_H,x-w/2,y-h,w,h);
    } else {
      // Brief loading fallback, not an emoji or an oversized orange oval.
      ctx.fillStyle = 'rgba(235,108,39,0.70)';
      ctx.beginPath();ctx.ellipse(x,y-size*.48,size*.25,size*.65,0,0,TWO_PI);ctx.fill();
    }
    ctx.restore();
  }
  function smoke(ctx,x,y,size,phase,t,power=1,weatherDrift=1) {
    const heat=clamp(power,0,1);
    if(heat <.025)return;
    ctx.save();
    for(let i=0;i<5;i++) {
      const cycle=size*5.6;
      const age=((t*(6.4+size*.05)+i*cycle/5+phase*12)%cycle+cycle)%cycle;
      const u=age/cycle;
      const wind=Math.sin(t*.35+phase)*3 + weatherDrift * u * size*.8;
      const px=x+wind + Math.sin(t*.68+i*2.2+phase)*size*(.19+.3*u);
      const py=y-size*.85-age;
      const r=size*(.30+.78*u);
      const a=.25*heat*(1-u)**1.15;
      const grad=ctx.createRadialGradient(px,py,r*.12,px,py,r);
      grad.addColorStop(0,`rgba(39,39,42,${a.toFixed(3)})`);
      grad.addColorStop(.5,`rgba(62,60,58,${(a*.64).toFixed(3)})`);
      grad.addColorStop(1,'rgba(74,71,66,0)');
      ctx.fillStyle=grad;
      ctx.beginPath();ctx.ellipse(px,py,r,r*.73,0,0,TWO_PI);ctx.fill();
    }
    ctx.restore();
  }
  return {draw,smoke};
})();
