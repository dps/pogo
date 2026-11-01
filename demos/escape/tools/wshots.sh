#!/bin/zsh
# Shots of each puzzle kind. Needs node on PATH.
cd "$(dirname $0)/.."
for id in "$@"; do
  node ../../bin/pogo.js shot . --out tools/tmp/w-$id.png --eval "game.go('play');game.step(70);var s=game.last.stage;s.card=0;s.cap=null;s.openPuzzle('$id')" --steps 50 >/dev/null 2>&1 &
done
wait
