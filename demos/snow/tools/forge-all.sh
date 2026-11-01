#!/bin/zsh
# Runs the workbench over every spec, five at a time.
cd "$(dirname $0)/.."; secs=${1:-120}; round=${2:-1}
specs=(${(f)"$(node -e "import('./tools/specs.mjs').then(m=>console.log(Object.keys(m.SPECS).join('\n')))")"})
i=0
for s in $specs; do
  node tools/forge.mjs $s $secs $((round*100+i)) &
  i=$((i+1))
  (( i % 5 == 0 )) && wait
done
wait
