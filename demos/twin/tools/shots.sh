#!/bin/zsh
# Rebuilds shots/. Run from anywhere; needs node on PATH.
cd "$(dirname $0)/.."; P() { node ../../bin/pogo.js "$@" | tail -0; }
LATE="ups:['bar','wheels','bigbag','whirl','hardware']"
STORM="var T=game.twin.sim; for(var i=0;i<120;i++) T.spawnFoe('bunny',-9+(i%19),-10+(i%6)*2+(i%3)); T.spawnFoe('snake',-6,6,7); T.spawnFoe('golem',7,7);"
END="game.go('play',{mode:'free',seed:9,bot:0.9,start:{room:'kitchen',depth:1,$LATE,weapon:'dryer'}}); game.step(1300); var T=game.twin.sim; T.p.inv=0; T.hurt(999,0,0,'A Bar of Soap');"
WIN="game.go('play',{mode:'free',seed:9,bot:0.95,start:{room:'nursery',depth:3,$LATE,weapon:'sock',wave:2}}); game.step(300); var T=game.twin.sim; T.p.hp=T.p.maxHp; var b=T.foes.find(function(e){return e.k=='trike'}); b.hp=1; T.hitFoe(b,9,'saw',0,0);"
for dev in phone phone-landscape desktop; do
  P shot . --device $dev --out shots/title-$dev.png --steps 200
  P shot . --device $dev --out shots/play-$dev.png --eval "game.go('play',{mode:'free',seed:12,bot:0.8,start:{room:'kitchen',depth:1,$LATE,weapon:'nail'}}); game.step(200); $STORM" --steps 220
  P shot . --device $dev --out shots/end-$dev.png --eval "$END" --steps 240
done
P shot . --device phone --out shots/win-phone.png --eval "$WIN" --steps 520
P shot . --device phone --out shots/cards-phone.png --eval "game.go('play',{mode:'free',seed:9,start:{room:'bathroom',depth:1}}); game.step(10); var T=game.twin.sim; T.phase='clear'; T.phaseT=0.1; T.run.wave=1;" --steps 80
P shot . --device desktop --out shots/cards-desktop.png --eval "game.go('play',{mode:'free',seed:9,start:{room:'laundry',depth:1}}); game.step(10); var T=game.twin.sim; T.phase='clear'; T.phaseT=0.1; T.run.wave=1;" --steps 80
P shot . --device desktop --out shots/boss-desktop.png --eval "game.go('play',{mode:'free',seed:9,bot:0.95,start:{room:'nursery',depth:3,$LATE,weapon:'nail',wave:2}});" --steps 500
P shot . --device desktop --out shots/cat-desktop.png --eval "game.go('play',{mode:'free',seed:5,bot:0.9,start:{room:'laundry',depth:1,$LATE,weapon:'sock'}}); game.step(120); var T=game.twin.sim; T.cat.due=0.05;" --steps 300
HERO="var T=game.twin.sim; T.p.x=T.p.px=-2; T.p.z=T.p.pz=5; T.p.vx=3; T.p.vz=-2; T.p.spin=6; for(var i=0;i<100;i++){var a=i*0.7,r=3.4+(i%7)*1.1; T.spawnFoe('bunny',-2+Math.cos(a)*r*1.5,5+Math.sin(a)*r*0.9).born=0;} T.spawnFoe('snake',6,8,7).born=0; T.spawnFoe('golem',-7,0).born=0; var c=T.cat; c.state='leave'; c.x=c.px=3; c.z=c.pz=-6; c.yaw=0.2; c.t=9;"
P shot . --device desktop --dpr 1 --out shots/hero.png --eval "game.go('play',{mode:'free',seed:12,hero:true,start:{room:'living',depth:1,ups:['bar','wheels','bigbag','hardware'],weapon:'dryer'}}); game.step(100); $HERO game.twin.sim.furn[2].hp=40; game.twin.sim.furn[1].hp=1; game.twin.sim.furn[3].hp=1;" --steps 34
