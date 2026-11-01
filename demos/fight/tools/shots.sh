#!/bin/zsh
# Rebuilds screenshots. shots.sh <outdir>; needs node on PATH.
cd "$(dirname $0)/.."; O=${1:-shots}; mkdir -p $O
P() { node ../../bin/pogo.js shot . "$@" | grep -v Wrote; }
ES="game.go('result',{mode:'arcade',a:'whistle',b:'chill',winner:0,players:1,rung:2,ladder:['chill','crumbs','knead','whistle','clamp','ding','frappe'],stats:[{best:7,dmg:1200,supers:1},{best:3,dmg:300,supers:0}]})"
FIGHT="game.go('play',{mode:'versus',a:'crumbs',b:'whistle',stage:0,players:1,level:0}); game.step(130); var m=game.match,f=m.fight; m.brains[1].think=()=>0; f.p[0].x=30;f.p[1].x=105; game.input.press('aB',4); game.step(14);"
for dev in phone phone-landscape desktop; do
  P --device $dev --out $O/title-$dev.png --steps 200 &
  P --device $dev --out $O/select-$dev.png --eval "game.go('select',{mode:'arcade'})" --steps 50 &
  P --device $dev --out $O/vs-$dev.png --eval "game.go('vs',{mode:'versus',a:'knead',b:'clamp',stage:2,players:1,level:1})" --steps 40 &
  P --device $dev --out $O/play-$dev.png --eval "$FIGHT" --steps 1 &
  P --device $dev --out $O/end-$dev.png --eval "$ES" --steps 40 &
  P --device $dev --out $O/ending-$dev.png --eval "game.go('ending',{id:'ding'});" --steps 200 &
  wait
done
P --out $O/training-phone.png --eval "game.go('play',{mode:'training',a:'knead',b:'crumbs',stage:3,players:1}); game.step(5); game.input.press('aA',3); game.step(4);game.input.press('aB',5)" --steps 18 &
P --device tablet --out $O/2p-tablet.png --eval "game.go('play',{mode:'versus',a:'ding',b:'frappe',stage:1,players:2}); game.step(130); " --steps 20 &
P --device phone-landscape --out $O/2p-landscape.png --eval "game.go('play',{mode:'versus',a:'ding',b:'frappe',stage:2,players:2}); game.step(130); " --steps 20 &
P --out $O/gallery-phone.png --eval "game.go('gallery')" --steps 20 &
wait
P --device desktop --out $O/hero.png --eval "$(cat tools/hero.js)" --steps 2
