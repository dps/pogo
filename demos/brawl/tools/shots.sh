#!/bin/zsh
# Rebuilds the screenshots. tools/shots.sh <outdir>; needs node on PATH.
cd "$(dirname $0)/.."; O=${1:-shots}; mkdir -p $O
P() { node ../../bin/pogo.js shot . "$@" | grep -v Wrote; }
FS="$(cat tools/fightshot.js)"
RES="game.go('result',{stage:2,mode:'story',win:true,over:{letter:'A',ratio:1},score:172340,stats:{best:42,freed:18,throws:5,aerial:30,perfects:3,dmgTaken:88,secs:174,tags:3}})"
FAIL="game.go('result',{stage:2,mode:'story',win:false,over:{letter:'F'},score:12340,stats:{best:12,freed:8,throws:5,aerial:30,perfects:3,dmgTaken:88,secs:174,tags:3},arena:2})"
for dev in phone phone-landscape desktop; do
  P --device $dev --out $O/title-$dev.png --steps 60 &
  P --device $dev --out $O/play-$dev.png --eval "game.go('play',{stage:1,seed:3}); game.step(3); $FS run(640);" --steps 0 &
  P --device $dev --out $O/boss-$dev.png --eval "game.go('play',{stage:0,seed:7,start:3}); game.step(3); $FS run(420);" --steps 0 &
  P --device $dev --out $O/end-$dev.png --eval "$RES" --steps 70 &
  P --device $dev --out $O/ending-$dev.png --eval "game.go('ending',{})" --steps 80 &
  wait
done
P --device phone --out $O/select-phone.png --eval "game.go('select',{mode:'story'})" --steps 20
P --device phone --out $O/fail-phone.png --eval "$FAIL" --steps 70
P --device phone --out $O/shush-phone.png --eval "game.go('play',{stage:4,seed:4,start:4}); game.step(3); $FS run(380);" --steps 0
P --device desktop --out $O/hero.png --steps 180 --eval "game.step(2); for (const e of game.current.entities) e.destroy();"
