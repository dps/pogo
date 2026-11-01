#!/bin/zsh
# usage: tools/shot.sh <out.png> <device> <steps> "<eval>"
SP=${TMPDIR:-/tmp}
export PATH=$SP/node/bin:$PATH
cd "$(dirname "$0")/.."
node ../../bin/pogo.js shot . --device ${2:-phone} --out $1 --steps ${3:-60} --eval "$4" 2>&1 | grep -v "^Wrote\|^$" | tail -5
