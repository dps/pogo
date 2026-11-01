#!/bin/zsh
# usage: tools/shot.sh name device steps "eval"
cd "${0:A:h}/.."
node ../../bin/pogo.js shot . --out tools/$1.png --device ${2:-phone} --steps ${3:-30} --eval "${4:-0}" 2>&1 | tail -4
