#!/bin/zsh
# Screenshots of every screen on one device: tools/shots.sh <out dir> <device> [name filter]
cd ${0:A:h}/..
OUT=${1:-tools/tmp}; DEV=${2:-phone}; ONLY=$3; mkdir -p $OUT
S='(k,e)=>{};'
shot(){ n=$1; e=$2; st=${3:-60}; [[ -n $ONLY && $n != *$ONLY* ]] && return; node ../../bin/pogo.js shot . --device $DEV --out $OUT/$n-$DEV.png --steps $st --eval "game.persist=()=>{}; $e" 2>&1 | grep -v Wrote; }
SEED="game.progress.ch=2;game.progress.done=['m1','m2','m3','m4','m5','m6','n1','n2','n3','n4','n5','n6'];game.progress.stamps=['gull','bell','cut','cat','clock','kite','needle'];game.progress.planes=['postman','dart','longwing'];game.progress.best={bay:41.2};"
shot title "" 30
shot flight "$SEED game.go('fly',{mode:'story'});game.step(3);game.sim.f.place(40,34,60,0.5);" 200
shot ribbon "game.go('fly',{mode:'free',time:1});game.step(3);game.sim.f.place(30,30,104,-1.1);" 170
shot letter "$SEED game.go('fly',{mode:'story'});game.step(3);const G=game.sim;G.deliverNow(G.st.rings[0]);game.step(120);" 30
shot stall "game.go('fly',{mode:'free',time:0});game.step(3);game.sim.f.place(-40,60,100,0.3);game.input.setStick(0,-1);" 150
shot crumple "game.go('fly',{mode:'story'});game.step(3);const f=game.sim.f;f.place(-40,16,50,3);f.events.length=0;f.crumple('wall',12);" 20
shot trial "$SEED game.go('fly',{mode:'trial',trial:'bay'});" 260
shot night "game.progress.ch=3;game.progress.done=['w1','w2','w3'];game.go('fly',{mode:'story'});game.step(3);game.sim.f.place(60,50,90,0.2);" 90
shot book "$SEED game.go('book',{tab:'letters'});" 20
shot bookstamps "$SEED game.go('book',{tab:'stamps'});" 20
shot bookfolds "$SEED game.go('book',{tab:'folds'});" 20
shot bookfly "$SEED game.go('book',{tab:'fly'});" 20
shot bookset "$SEED game.go('book',{tab:'set'});" 20
shot fold "game.go('fold',{plane:'dart',next:{mode:'story'}});game.step(30);game.sim.k=0.55;game.sim.pieces=game.sim.pieces" 20
shot fold2 "game.go('fold',{plane:'swallow',next:{mode:'story'}});game.step(10);for(let i=0;i<4;i++){game.sim.auto=true;game.step(30)}" 90
END="game.progress.ch=3;game.progress.done=['w1','w2','w3','w4','w5','w6'];game.progress.planes=['postman','dart','longwing','swallow'];game.go('fly',{mode:'story'});game.step(3);const G=game.sim;G.deliverNow(G.st.rings[0]);game.step(130);G.hud.closeCard();game.step(800);"
shot ending "$END" 30
shot finale "$END game.step(260);" 20
