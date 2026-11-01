#!/bin/zsh
# tools/s.sh <name> <device> <steps> "<eval>" : one screenshot into tools/out.
cd ${0:A:h}/..
node ../../bin/pogo.js shot . --device ${2:-phone} --out tools/out/$1.png --steps ${3:-60} --eval "game.noSave=1;game.profile.tutorial=true;$4" --print "JSON.stringify(game.renderer.stats)" 2>&1 | grep -v Wrote
