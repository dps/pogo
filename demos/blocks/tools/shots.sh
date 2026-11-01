#!/bin/zsh
# Rebuilds shots/. Run from anywhere; needs node on PATH.
cd "$(dirname $0)/.."; P() { node ../../bin/pogo.js "$@" | grep -v Wrote; }
MID="game.go('play',{mode:'story',rung:4,seed:7}); game.step(80); game.stack.bot({pps:2.6,noise:7,hands:1,greed:0.4}); game.step(1300);"
BIG="game.go('play',{mode:'story',rung:5,seed:21}); game.step(80); var S=game.stack; S.bot({pps:3,noise:1,hands:1,greed:1,look:1,safe:13}); for(var i=0;i<9000&&!S.match.you.quads&&!S.match.over;i++)game.step(1);"
LOSE="game.go('play',{mode:'story',rung:3,seed:7}); game.step(80); for(var i=0;i<40;i++){game.stack.match.you.hardDrop();game.step(12);}"
WIN="game.go('play',{mode:'story',rung:2,seed:9}); game.step(80); game.stack.bot({pps:4,noise:2,hands:1,greed:0.7,look:1}); for(var i=0;i<16000&&game.stack.state.phase!=='panel';i++)game.step(1);"
for dev in phone phone-landscape desktop; do
  P shot . --device $dev --out shots/title-$dev.png --steps 60
  P shot . --device $dev --out shots/play-$dev.png --eval "$MID" --steps 10
  P shot . --device $dev --out shots/stampede-$dev.png --eval "$BIG" --steps 9
  P shot . --device $dev --out shots/lose-$dev.png --eval "$LOSE" --steps 130
  P shot . --device $dev --out shots/win-$dev.png --eval "$WIN" --steps 30
done
P shot . --device desktop --out shots/hero.png --eval "$BIG" --steps 13
P shot . --out shots/ladder-phone.png --eval "game.go('ladder')" --steps 60
P shot . --device desktop --out shots/versus-desktop.png --eval "game.go('play',{mode:'versus',seed:3}); game.step(90); var S=game.stack; S.bot({pps:3,noise:7,hands:1}); S.match.sides[1].brain=new S.match.sides[0].brain.constructor({pps:3,noise:7,hands:1},3); game.step(900);" --steps 6
P shot . --out shots/finale-phone.png --eval "game.go('finale')" --steps 60
