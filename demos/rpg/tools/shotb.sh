#!/bin/zsh
# Battle shot: name device steps party foes fmt floor extra
cd "${0:A:h}/.."
node ../../bin/pogo.js shot . --out tools/$1.png --device ${2:-phone} --steps ${3:-200} --eval "game.dev.setup(game,'${7:-F2}',$4);game.step(3);game.dev.battle(game,$5,{fmt:${6:-1},name:'Doug Lumen'});$8" 2>&1 | tail -3
