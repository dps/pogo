#!/bin/zsh
# Shoots every menu on one device: tools/menus.sh phone
d=$1
P() { node ../../bin/pogo.js shot . --dpr 1 --device $d "$@"; }
R='game.data.lastRace={results:[{id:"nan",name:"Nan Nitro",rank:1},{id:"pip",name:"Pip",rank:2,player:true},{id:"mop",name:"Mopsy",rank:3},{id:"kiki",name:"Kiki Frost",rank:4},{id:"crumb",name:"Chef Crumb",rank:5},{id:"stan",name:"Big Stan",rank:6}],c:{cup:0,race:1,points:{nan:20,pip:15,mop:12,kiki:6,crumb:4,stan:2}},track:"Freezer Run",stats:{}};'
P --out tools/tmp/${d}_title.png --steps 200 &
P --out tools/tmp/${d}_racers.png --eval "game.go('racers')" --steps 40 &
P --out tools/tmp/${d}_cups.png --eval "game.go('cups')" --steps 20 &
P --out tools/tmp/${d}_trial.png --eval "game.go('trial')" --steps 20 &
P --out tools/tmp/${d}_settings.png --eval "game.go('settings')" --steps 20 &
P --out tools/tmp/${d}_results.png --eval "$R game.go('results')" --steps 120 &
P --out tools/tmp/${d}_podium.png --eval "game.data.cupEnd={cup:0,points:{pip:30,nan:22,kiki:14}};game.go('podium')" --steps 120 &
P --out tools/tmp/${d}_tt.png --eval "game.go('ttdone')" --steps 60 &
wait
cd tools/tmp && node ../montage.mjs ${d}_m.png 4 ${2:-520} ${d}_title.png ${d}_racers.png ${d}_cups.png ${d}_trial.png ${d}_settings.png ${d}_results.png ${d}_podium.png ${d}_tt.png
