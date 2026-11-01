#!/bin/zsh
# Rebuilds shots/. Run from anywhere with node on PATH.
cd "$(dirname $0)/.."
P() { node ../../bin/pogo.js "$@" >/dev/null 2>&1; }
# Puts the game mid-story: carriage index, flags, items.
at() { echo "var P=game.last.prof;P.state={at:$1,f:{$2},inv:[$3],w:{}};game.go('play');game.step(240);var s=game.last.stage;s.card=0;s.cam=$4;s.fade=0;s.fadeTo=0;$5"; }
E1=$(at 0 "'c1.ticket':1,'c1.blind':1,'c1.blind2':1,'c1.down':1" "'ticket'" 240)
M2=$(at 3 "'p:c4fog':1" "'ticket','clipper','lit'" 90)
for dev in phone phone-landscape desktop; do
  P shot . --device $dev --out shots/title-$dev.png --steps 30
  P shot . --device $dev --out shots/play-$dev.png --eval "$E1" --steps 60
  P shot . --device $dev --out shots/mid-$dev.png --eval "$(at 4 "" "'ticket','clipper','lit','sheetA'" 300)" --steps 60
  P shot . --device $dev --out shots/dial-$dev.png --eval "$(at 0 "'c1.ticket':1,'c1.down':1" "'ticket'" 440 "s.openPuzzle('c1case');")" --steps 60
  P shot . --device $dev --out shots/end-$dev.png --eval "game.go('ending');game.step(400);game.ends.next();game.ends.next();game.ends.next();" --steps 240
done
P shot . --device desktop --dpr 2 --out shots/hero.png --eval "$(at 7 "" "'ticket','clipper','lit','song'" 120 "s.cap=null;s.timers.length=0;")" --steps 60
