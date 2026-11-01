#!/bin/zsh
cd "$(dirname $0)/.."
n=0
for id in "$@"; do
  node ../../bin/pogo.js shot . --out tools/tmp/x-$id.png --eval "game.go('play');game.step(120);var s=game.last.stage;s.card=0;s.cap=null;$ACT('$id')" --steps 40 >/dev/null 2>&1 &
  n=$((n+1)); if [ $((n%3)) = 0 ]; then wait; fi
done
wait
