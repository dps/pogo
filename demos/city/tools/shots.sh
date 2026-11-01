#!/bin/zsh
# Rebuilds shots/. Run from anywhere; needs node on PATH.
cd "$(dirname $0)/.."; P() { node ../../bin/pogo.js shot . "$@" 2>&1 | grep -v Wrote; }
PLACE="game.go('play',{index:1,days:7}); game.step(3); game.city.hud.bubble=null; game.city.hud.select('cottage');"
STORM="game.go('play',{index:4,days:27}); game.step(3); var C=game.city; C.hud.bubble=null; while(C.sim.stormB<0.95){C.sim.tick();} C.sim.events.length=0; C.w.dirtyWater=true; C.w.dirtyTown=true; C.w.stormVis=1; C.w.water=C.sim.water;"
WIN="game.go('play',{index:0}); game.step(3); var C=game.city; C.sim.goalDone=[true,true,false]; C.sim.scn.goals[2].n=0;"
DUSK="game.go('play',{index:5,days:23}); game.step(3); var C=game.city; C.hud.bubble=null; while(C.sim.hour!==19){C.sim.tick();} C.sim.events.length=0; C.w.dirtyWater=true;"
for dev in phone phone-landscape desktop; do
  P --device $dev --out shots/title-$dev.png --steps 40 &
  P --device $dev --out shots/first-$dev.png --steps 40 --eval "game.go('play',{index:0}); game.step(3);" &
  P --device $dev --out shots/place-$dev.png --steps 60 --eval "$PLACE" &
  wait
  P --device $dev --out shots/storm-$dev.png --steps 30 --eval "$STORM" &
  P --device $dev --out shots/end-$dev.png --steps 210 --eval "$WIN" &
  P --device $dev --out shots/harbours-$dev.png --steps 30 --eval "game.save('tide1',{stars:{cove:3,bread:2},best:{},relaxed:false,sound:true,music:true,haptics:true}); game.go('harbours')" &
  wait
done
P --device phone --out shots/dusk-phone.png --steps 30 --eval "$DUSK"
P --device desktop --dpr 2 --out shots/hero.png --steps 30 --eval "game.go('title',{hero:true}); game.step(3); var c=game.city.w.cam; c.tDist=c.dist=c.dist*0.86; c.panX=-3.2; c.panZ=1; c.tYaw=c.yaw=0.6; c.tPitch=c.pitch=0.8;"
