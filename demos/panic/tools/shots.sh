#!/bin/zsh
# Rebuilds shots/. Run from the game folder with node on PATH.
cd "$(dirname $0)/.."; source tools/env.sh
RUN="game.panic.startRun(game.panic.showRun(7));"
adv() { echo "for(let i=0;i<4000;i++){const d=game.panic.dir;if(d&&d.state==='$1'&&d.st>$2)break;game.step(1);}"; }
for dev in phone phone-landscape desktop; do
  P shot . --device $dev --out shots/title-$dev.png --steps 100 | tail -0 &
  P shot . --device $dev --out shots/prompt-$dev.png --eval "$RUN game.step(40); $(adv prompt 0.5)" --steps 0 | tail -0 &
  P shot . --device $dev --out shots/play-$dev.png --eval "game.go('lab',{id:'fight',seed:4}); game.step(200);" --steps 0 | tail -0 &
  P shot . --device $dev --out shots/end-$dev.png --eval "game.panic.save.best=0; game.go('over',{mode:'show',score:4210,wins:23,n:27,fresh:true,cleared:false})" --steps 80 | tail -0 &
  wait
done
