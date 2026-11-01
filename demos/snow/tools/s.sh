#!/bin/zsh
# tools/s.sh name device steps "js"
cd "$(dirname $0)/.."; node ../../bin/pogo.js shot . --device ${2:-phone} --out tools/$1.png --steps ${3:-40} --eval "$4" 2>&1 | grep -v Wrote
