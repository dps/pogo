#!/bin/zsh
# Runs named specs, six at a time: tools/forge-some.sh <secs> <round> spec spec ...
cd "$(dirname $0)/.."; secs=$1; round=$2; shift 2; i=0
for s in $@; do
  node tools/forge.mjs $s $secs $((round*100+i)) &
  i=$((i+1))
  (( i % 6 == 0 )) && wait
done
wait
