#!/bin/zsh
# Rebuilds shots/. Run from anywhere; needs node on PATH.
cd "$(dirname $0)/.."
P() { node ../../bin/pogo.js shot . --eval "var G=game.yard,S=G.S,A=G.A; $2" --steps ${3:-30} --device ${4:-phone} --dpr ${5:-2} --out shots/$1.png | tail -0; }
HOT="G.jump(3,3,{crew:[120,90,60,30,12],hype:1,f:1.3});G.buyMode=2;game.step(40);S.streak=40;for(var i=0;i<4;i++){S.hits=0;S.orbit=0;G.sellAt(130+i*46,190+(i%2)*40);game.step(7)}"
BIG="G.jump(4,2,{crew:[140,90,60,25,8],hype:0.7,custT:0.05,f:9});S.fed=[80,60,40,0,0];game.step(120);for(var i=0;i<16;i++){G.sellAt(190+(i%5)*20,190+(i%4)*24);game.step(3)}"
FIN="G.jump(5,4);S.concepts={beige:1,monday:1,seven:1,gravity:1,irony:1,orange:1,tuesday:1};S.earnedAct=2e100;G.list();game.step(4);G.close();game.step(140);"
for dev in phone phone-landscape desktop; do
  P title-$dev "" 20 $dev &
  P play-$dev "$HOT" 6 $dev &
  P end-$dev "$FIN game.step(100);G.finalDeal();game.step(235);game.step(280)" 200 $dev &
  wait
done
P driveway "G.jump(0,2,{crew:[14,6,2,0,0],cash:900,custT:0.05,f:2.5});game.step(120)" 20 &
P war "G.jump(2,1,{crew:[60,40,30,8,0]});G.goWar();game.step(30);for(var i=0;i<4;i++){G.sellAt(120+i*40,250);game.step(3)}" 8 &
P hole "$BIG" 8 &
wait
P abstract "G.jump(5,2,{f:3});S.concepts={beige:1,monday:1};G.tab='ideas';G.scroll=120" 30 &
P move "G.jump(1,4);S.ready=true;G.open('move')" 30 &
P reveal "$FIN game.step(100);G.finalDeal();game.step(170)" 1 &
wait
P hero "$HOT" 3 desktop 2
