// Dev: paste into --eval. Mashes through a fight so shots catch real action. Set N.
var P=game.play,S=P.sim; var i=0, script=['atk','atk','hvy']; 
function run(n){ for(let k=0;k<n;k++){ const h=S.hero; let t=null,bd=1e9; for(const e of S.enemies){ if(e.hp<=0||e.st==='spawn')continue; const d=Math.abs(e.x-h.x)+Math.abs(e.z-h.z); if(d<bd){bd=d;t=e;} }
  if(t){ const dx=t.x-h.x,dz=t.z-h.z; if(Math.abs(dx)>80) game.input.press(dx>0?'right':'left',2); if(Math.abs(dz)>18) game.input.press(dz>0?'down':'up',2); if(Math.abs(dx)<=90&&i%9===0){ game.input.press(script[(i/9|0)%3],2);} } else game.input.press('right',2);
  i++; game.step(1);} }
