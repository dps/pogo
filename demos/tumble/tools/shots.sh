#!/bin/zsh
# Rebuilds shots/. Run from anywhere; needs node on PATH.
cd "$(dirname $0)/.."; P() { node ../../bin/pogo.js "$@"; }
FIRE() { echo "game.go('play',{level:$1}); game.step(190); var T=game.tumble; T.stage.ammo='$2'; T.sim.rack['$2']=3; T.stage.tension=1; T.sim.fire('$2',$3,$4);"; }
WIN="game.go('play',{level:3}); game.step(100); var T=game.tumble; T.sim.fire('rock',25,-5); game.step(150); T.sim.defenders.slice().forEach(d=>T.sim.hurtDefender(d,9));"
for dev in phone phone-landscape desktop; do
  P shot . --device $dev --out shots/title-$dev.png --steps 110 | tail -0
  P shot . --device $dev --out shots/play-$dev.png --eval "game.go('play',{level:7}); game.step(120); var I=game.input; I.pointerEvent('down',7,240,200); game.step(3); I.pointerEvent('move',7,160,230); game.step(6);" --steps 30 | tail -0
  P shot . --device $dev --out shots/collapse-$dev.png --eval "$(FIRE 16 rock 25 -11)" --steps 95 | tail -0
  P shot . --device $dev --out shots/end-$dev.png --eval "$WIN" --steps 420 | tail -0
done
P shot . --device desktop --out shots/hero.png --eval "$(FIRE 24 iron 26 -9)" --steps 112 | tail -0
P shot . --out shots/map-phone.png --eval "game.grant({stars:[3,2,3,1,2,3,3]}); game.go('map',{world:1})" --steps 40 | tail -0
P shot . --out shots/sandbox-phone.png --eval "game.grant({sandbox:true}); game.go('play',{sandbox:true});" --steps 60 | tail -0
P shot . --out shots/boss-phone.png --eval "game.go('play',{level:14});" --steps 90 | tail -0
