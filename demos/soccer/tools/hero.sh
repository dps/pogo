#!/bin/zsh
# The launcher image: a staged headbutt, shot low, in the real game.
EV=$(cat <<'J'
game.go("match",{venue:"sunset",level:2,opp:14,seed:9});
game.step(2);
const M=game.match,S=M.sim;
S.phase="play";S.clock=64;S.score[0]=2;S.score[1]=2;
const A=S.goats[4],V=S.goats[8],T=S.goats[3],U=S.goats[9],O=S.goats[7];
game.data.noHud=(d,v)=>{};
game.data.autoplay=()=>{};
game.data.pose=(s,W,sc)=>{
  for(const g of s.goats){g.vx=g.vz=0;g.state=0;g.cmd.mx=g.cmd.mz=0;g.x=g.id<5?-30:30;g.z=-30}
  W.rigs.forEach((r,i)=>{ if(![4,8,3,9,7,5].includes(i)) r.root.hidden=true;});
  A.x=-3.4;A.z=6;A.ang=1.0;A.state=3;A.t=0.2;
  V.x=0.4;V.y=2.4;V.z=7.4;V.ang=-1.1;V.state=4;V.tumble=-0.6;V.t=.1;
  T.x=-9;T.z=1.4;T.ang=1.0;T.state=0;T.vx=8;
  U.x=8;U.z=3.4;U.ang=-0.8;U.state=0;U.vx=-8;
  O.x=3.4;O.z=-2;O.ang=-1.2;O.state=0;O.vx=-5;
  const k=s.goats[5];k.x=19;k.z=0;k.ang=-1.57;
  const b=s.ball;b.owner=null;b.x=-6.4;b.y=6;b.z=5;b.vx=2;b.vy=1;b.vz=0;b.rot[0]=.6;
  W.excite[0]=1.5;W.excite[1]=1.5;W.ref.hidden=true;
  for(const e of [W.marker,W.chev,W.arrow,W.mate,W.landing])e.hidden=true;
  W.rigs[8].starT=2;
};
game.data.cam=(W,s)=>{s.cam3.fov=30;S.humans.length=0;W.setCam(true,-0.6,3.0,22,-0.6,3.5,0)};
const L=window.__logo;game.data.noHud=(d,v)=>{d.push();d.translate(v.width*0.76,v.height*0.21);L(d,0,0.68);d.pop()};
J
)
node ../../bin/pogo.js shot . --device desktop --eval "$EV" --steps 30 --out shots/hero.png
