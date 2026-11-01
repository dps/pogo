#!/bin/zsh
# Rebuilds shots/. Run from anywhere; needs node on PATH.
cd "$(dirname $0)/.."; P() { node ../../bin/pogo.js shot . "$@" | tail -0; }
AT() { echo "game.go('play',{i:$1});game.step(4);game.input.press('act',1);game.step(4);var S=game.sim,C=S.cat;C.x=$2*32;C.y=$3*32;game.stage.camX=C.x;game.stage.camY=C.y;"; }
WIN="game.grant({bones:9});game.go('play',{i:1});game.step(4);game.input.press('act',1);game.step(3);var s=game.sim;s.cat.fish=true;s.stats.smashed=3;game.step(400);s.cat.mode='ground';s.cat.z=0;s.cat.x=s.world.start.x;s.cat.y=s.world.start.y-20;game.input.press('down',40);"
GHOST="game.go('play',{i:0});game.step(4);game.input.press('act',1);game.step(3);var s=game.sim;s.cat.x=6.5*32;s.cat.y=8.5*32;s.guards[0].x=13.5*32;game.step(200);s.cat.fish=true;s.cat.mode='ground';s.cat.z=0;s.cat.x=s.world.start.x;s.cat.y=s.world.start.y-20;game.input.press('down',40);"
CAUGHT="game.go('play',{i:1});game.step(4);game.input.press('act',1);game.step(3);var s=game.sim;var g=s.guards[0];s.cat.x=g.x;s.cat.y=g.y;g.s=1;"
for dev in phone phone-landscape desktop; do
  P --device $dev --out shots/title-$dev.png --steps 120
  P --device $dev --out shots/play-$dev.png --eval "$(AT 1 8.5 13.5)" --steps 260
  P --device $dev --out shots/rank-$dev.png --eval "$GHOST" --steps 620
  P --device $dev --out shots/caught-$dev.png --eval "$CAUGHT" --steps 90
done
P --out shots/map-phone.png --eval "game.grant({done:{m1:{ghost:true,chaos:false,bonus:1,best:30},m2:{ghost:false,chaos:true,bonus:0,best:40}}});game.go('map')" --steps 40
P --out shots/shop-phone.png --eval "game.grant({bones:14,perks:{velvet:true}});game.go('shop')" --steps 30
P --out shots/kitchen-phone.png --eval "$(AT 5 7.5 6.5)" --steps 320
P --out shots/opera-phone.png --eval "$(AT 7 9.5 9.5)" --steps 300
P --out shots/manor-phone.png --eval "$(AT 10 8.5 15.5)" --steps 300
P --out shots/bank-phone.png --eval "$(AT 13 8.5 8.5)" --steps 300
P --device phone-landscape --dpr 3 --out shots/hero.png --eval "game.go('play',{i:6});game.step(4);game.input.press('act',1);game.step(240);var S=game.sim,C=S.cat;C.x=9.5*32;C.y=8.6*32;C.dir=0;game.stage.camX=C.x;game.stage.camY=C.y;game.stage.camX=C.x;var G=S.guards[0];G.x=4.5*32;G.y=8.5*32;G.dir=G.want=0.02;G.route=[];G.path=[];G.state='patrol';G.wait=0;S.guards[1].x=15*32;S.guards[1].y=5*32;S.guards[1].dir=S.guards[1].want=2.6;game.step(90);" --steps 2
