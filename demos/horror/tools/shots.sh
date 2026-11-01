#!/bin/zsh
# Rebuilds shots/. Needs node on PATH. Retries, because software GL on a shared machine can time out.
cd "$(dirname $0)/.."
P() { for i in 1 2 3 4; do node ../../bin/pogo.js shot . "$@" 2>&1 | grep -q Timeout || break; sleep 2; done; }
PLAY="game.go('play',{night:1});game.step(170);game.input.press('light',1);game.step(4);var S=game.sim;S.p.x=25;S.p.z=7;game.look(1.2,0);"
for dev in phone phone-landscape desktop; do
  P --device $dev --out shots/title-$dev.png --steps 150
  P --device $dev --out shots/play-$dev.png --eval "$PLAY" --steps 30
  P --device $dev --out shots/carpark-$dev.png --eval "game.go('carpark',{night:2,wake:2});" --steps 180
  P --device $dev --out shots/dawn-$dev.png --eval "game.go('dawn');" --steps 300
done
P --device phone-landscape --out shots/shelf-phone-landscape.png --eval "game.go('flip');game.step(60);var f=game.flip;f.world.p.x=30;f.world.p.z=15;f.h.x=19;f.h.z=15;f.t=1;f.h.yaw=-1.57;f.route=[[19,15]];game.look(1.57,0.12);" --steps 4
P --device phone --out shots/doll.png --eval "game.go('play',{night:2});game.step(170);game.input.press('light',1);game.step(4);var S=game.sim;S.p.x=31;S.p.z=15;game.look(1.57,-0.05);var d=S.dolls[0];d.x=28.8;d.z=15;d.y=0;d.awake=true;d.pose=1;d.frozen=true;d.yaw=1.57;d.wakeAt=null;game.stage.dolls[0].hy=1.3;game.stage.dolls[0].tilt=0.05;" --steps 6
P --device phone-landscape --dpr 2 --out shots/hero.png --eval "game.go('title',{hero:true});" --steps 150
