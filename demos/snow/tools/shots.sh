#!/bin/zsh
# Rebuilds shots/. Run from anywhere; needs node on PATH.
cd "$(dirname $0)/.."; P() { node ../../bin/pogo.js "$@" | grep -v Wrote; }
ALL='game.app.save.solved=Object.fromEntries(game.app.levels.slice(0,HOW).map(l=>[l.id,{p:99}]));game.app.save.at=game.app.levels[HOW-1].id;game.go("world",{});'
for dev in phone phone-landscape desktop; do
  P shot . --device $dev --out shots/title-$dev.png --steps 60
  P shot . --device $dev --out shots/play-$dev.png --steps 30 --eval "game.app.demo('b6',9)"
  P shot . --device $dev --out shots/map-$dev.png --steps 60 --eval "${ALL//HOW/22}"
  P shot . --device $dev --out shots/end-$dev.png --steps 120 --eval "${ALL//HOW/74};game.go('end',{})"
done
P shot . --out shots/night-phone.png --steps 40 --eval "game.app.demo('h4',10)"
P shot . --out shots/hint-phone.png --steps 60 --eval "const p=game.app.demo('c4',0);game.step(20);p.requestHint();"
P shot . --device desktop --out shots/hero.png --steps 90 --eval "game.go('hero',{})"
