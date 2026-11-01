#!/bin/zsh
# Rebuilds shots/. Run from anywhere; needs node on PATH.
cd "$(dirname $0)/.."; P() { node ../../bin/pogo.js "$@"; }
# A staged clash: the whole of two armies meeting on the blanket.
CLASH="game.go('play',{mission:9}); game.step(2); var A=game.ants,Z=A.sim; for(const k of Z.colList){k.stock=[2000,900,900,900];k.chambers={nursery:2,pantry:3,gym:2,vat:2,hall:1,loft:2};k.maxPop=900;} var put=(t,n,c,x,y,r)=>{for(let i=0;i<n;i++){var id=Z.spawn(t,c);if(id>=0){var a=Math.random()*6.28,q=Math.sqrt(Math.random())*r;Z.x[id]=Z.px[id]=x+Math.cos(a)*q*1.5;Z.y[id]=Z.py[id]=y+Math.sin(a)*q*.8;}}}; put(0,300,1,640,1110,150);put(0,150,2,640,1190,130);put(0,80,4,540,1060,100);put(1,330,1,640,900,150);put(3,130,2,720,850,110);put(1,100,0,520,880,110); Z.paint(0,[640,1110,640,960]);Z.paint(1,[640,900,640,1060]);Z.paint(3,[720,850,640,1040]); A.hud.say=()=>{}; for(let i=0;i<50;i++)Z.tick(); var C=A.stage.cam; C.tx=C.x=650;C.ty=C.y=1000;C.tz=C.z=0.8;"
BUILD="game.step(2); var A=game.ants,Z=A.sim; A.sim.brains.push(new A.Commander(A.sim,{wave:60}));"
WAR() { echo "game.go('play',{mission:$1}); $BUILD for(const k of Z.colList){k.stock=[1200,600,600,600];k.chambers={nursery:2,pantry:3,gym:2,vat:2,hall:1,loft:2};k.maxPop=520;k.mix=[1,4,2,0,1];} for(let i=0;i<$2&&!Z.outcome;i++)Z.tick(); var C=A.stage.cam;";}
for dev in phone phone-landscape desktop; do
  P shot . --device $dev --out shots/title-$dev.png --steps 90 | tail -0
  P shot . --device $dev --out shots/play-$dev.png --eval "$(WAR 9 1900) C.tx=650;C.ty=1020;C.tz=0.62; game.step(3);" --steps 90 | tail -0
  P shot . --device $dev --out shots/end-$dev.png --eval "game.go('play',{mission:2}); game.step(2); game.ants.sim.outcome='win'; " --steps 300 | tail -0
done
P shot . --out shots/first-phone.png --eval "game.go('play',{mission:0})" --steps 260 | tail -0
P shot . --out shots/nest-phone.png --eval "game.go('play',{mission:9}); game.step(5); game.ants.sim.me.stock=[60,40,60,5]; game.ants.hud.openNest();" --steps 30 | tail -0
P shot . --device phone-landscape --out shots/nest-landscape.png --eval "game.go('play',{mission:9}); game.step(5); game.ants.sim.me.stock=[60,40,60,5]; game.ants.hud.openNest();" --steps 30 | tail -0
P shot . --out shots/missions-phone.png --eval "game.go('missions')" --steps 40 | tail -0
P shot . --device phone-landscape --out shots/missions-landscape.png --eval "game.go('missions')" --steps 40 | tail -0
P shot . --out shots/skirmish-phone.png --eval "game.go('skirmish')" --steps 40 | tail -0
P shot . --device phone-landscape --out shots/skirmish-landscape.png --eval "game.go('skirmish')" --steps 40 | tail -0
P shot . --out shots/hand-phone.png --eval "game.go('play',{mission:4}); game.step(3); var A=game.ants; A.sim.brains.push(new A.Commander(A.sim)); for(let i=0;i<470;i++)A.sim.tick(); A.sim.hand.timer=1; game.step(3); A.stage.cam.tx=A.stage.cam.x=A.sim.hand.x;A.stage.cam.ty=A.stage.cam.y=A.sim.hand.y;" --steps 228 | tail -0
P shot . --device desktop --dpr 2 --out shots/hero.png --eval "$CLASH" --steps 70 | tail -0
P shot . --out shots/clash-phone.png --eval "$CLASH" --steps 70 | tail -0
