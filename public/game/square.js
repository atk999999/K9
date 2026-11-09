'use strict';

// A flat assembly court. All paving is cached and walkable.
const VillageSquare = (() => {
  let paving;
  // Expanded by 20%: 12 concentric stone rings (outer radius 228px vs original 190px).
  // Canvas spans x: 430..1038, y: 350..670 to encompass both the expanded stone court
  // and the natural sandy-dirt restoration over the removed fruit stall.
  const left = 430, top = 350, cx = 680, cy = 510;
  function ringPoint(radius, angle) {
    return [cx + radius * Math.cos(angle), cy + radius * .62 * Math.sin(angle)];
  }
  function polygon(g, points, color) {
    g.fillStyle = color;
    g.beginPath();
    points.forEach(([x,y], i) => i ? g.lineTo(x,y) : g.moveTo(x,y));
    g.closePath();
    g.fill();
  }
  function init() {
    paving = document.createElement('canvas');
    paving.width = 608; paving.height = 320;
    const g = paving.getContext('2d');
    g.translate(-left, -top);

    // 1. Cleanly erase the old fruit stall, its side grass tuft, and stray stall-front cobbles
    // with the exact warm sandy-ochre dirt texture of map.webp.
    const stallCover = [
      [810, 420], [835, 414], [932, 414], [976, 425],
      [1028, 466], [1032, 500], [1026, 532], [960, 560], [885, 578], [810, 550]
    ];
    const dirtFill = (typeof TerrainTexture !== 'undefined' && TerrainTexture.pattern)
      ? TerrainTexture.pattern(g, 'dirt')
      : '#e9be7f';
    polygon(g, stallCover, dirtFill);

    // 2. Expanded village square: 12 concentric stone rings (+20% radius from original 10 rings)
    const stone = ['#b9b39b','#c0baa1','#adae96','#c9c0a5','#b4ad94','#c1b99f'];
    let seed = 419;
    function random() { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }
    for (let row = 0; row < 12; row++) {
      const inner = row * 19, outer = inner + 19, blocks = 8 + row * 5;
      const offset = (row % 2) * Math.PI / blocks;
      for (let i = 0; i < blocks; i++) {
        const a = offset + i * 2 * Math.PI / blocks, b = a + 2 * Math.PI / blocks;
        const block = [ringPoint(inner,a),ringPoint(outer,a),ringPoint(outer,(a+b)/2),ringPoint(outer,b),ringPoint(inner,b)];
        polygon(g, block, '#827f67');
        const inset = [ringPoint(inner+1,a+.005),ringPoint(outer-1,a+.004),ringPoint(outer-1,(a+b)/2),ringPoint(outer-1,b-.004),ringPoint(inner+1,b-.005)];
        polygon(g, inset, stone[Math.floor(random()*stone.length)]);
        const [x,y] = ringPoint(inner+9,(a+b)/2);
        g.fillStyle = '#e2d9b966'; g.fillRect(x,y,2+random()*4,1);
      }
    }

    // 3. A jade lotus set into the central stone (scaled +20% to match the expanded square).
    for (const [r,color] of [[78,'#776f50'],[74,'#d6c399'],[70,'#72827b'],[66,'#93a296']]) {
      g.fillStyle = color; g.beginPath(); g.ellipse(cx,cy,r,r*.62,0,0,Math.PI*2); g.fill();
    }
    for (let i = 0; i < 8; i++) {
      g.save(); g.translate(cx,cy); g.scale(1.2, 1.2 * .62); g.rotate(i*Math.PI/4);
      g.beginPath(); g.moveTo(4,0); g.quadraticCurveTo(22,-14,48,0); g.quadraticCurveTo(22,14,4,0);
      g.fillStyle = '#d9ceaa'; g.fill(); g.beginPath(); g.moveTo(9,0); g.quadraticCurveTo(29,-4,44,0);
      g.strokeStyle = '#8c967d'; g.stroke(); g.restore();
    }
    g.fillStyle = '#586e62'; g.beginPath(); g.ellipse(cx,cy,11,6,0,0,7); g.fill();
  }
  function draw(g) { if (paving) g.drawImage(paving, left, top); }
  return {init, draw};
})();
