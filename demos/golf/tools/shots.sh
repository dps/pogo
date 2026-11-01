#!/bin/zsh
# Every key screen on phone, phone-landscape and desktop. usage: tools/shots.sh <outdir> [filter]
SP=${TMPDIR:-/tmp}
export PATH=$SP/node/bin:$PATH
cd "$(dirname "$0")/.."
OUT=${1:-shots}; ONLY=$2; mkdir -p $OUT
SEED="const S=game.data.save;for(let i=0;i<20;i++){S.best[i]=i%3+1;S.shellsFound[i]=i%2}S.done=20;S.aces=2;S.birdies=5;S.islandDone[0]=true;S.islandDone[1]=true;S.owned=['pearl','coral','beach','melon','cocoa'];S.seen.chip=1;"
G="const G=()=>globalThis.__golf;"
PLAY="$G game.go('play',{hole:HOLE});game.step(30);G().endIntro();game.step(60);"
PULL="const b=G().ballView;game.input.pointerEvent('down',1,b.x,b.y+10);game.step(3);for(let i=1;i<=14;i++){game.input.pointerEvent('move',1,b.x+24-i*3,b.y+10+i*7);game.step(1);}game.step(6);"
ACE="$G game.go('play',{hole:20});game.step(30);const r=G();r.endIntro();game.step(30);const s=r.sim,c=r.c.cup_;s.x=c.x+0.2;s.z=c.z+2;s.y=c.y+0.21;game.step(2);r.camF=[s.x,s.y,s.z];r.fire(Math.atan2(-0.2,2),0.28,false);for(let i=0;i<400&&r.state!=='holed';i++)game.step(1);"
CARD="$G game.go('play',{hole:6});game.step(30);const r=G();r.endIntro();game.step(30);const s=r.sim,c=r.c.cup_;r.strokes=1;s.x=c.x+0.2;s.z=c.z+2;s.y=c.y+0.21;game.step(2);r.camF=[s.x,s.y,s.z];r.fire(Math.atan2(-0.2,2),0.28,false);for(let i=0;i<900&&!r.card;i++)game.step(1);"
CUP="$SEED game.go('cups');game.step(40);game.current.entities.find(e=>e.buttonLabel==='Coconut Classic').emit('tap');game.step(40);const R=globalThis.__golf,c=R.c.cup_,s=R.sim;R.endIntro();game.step(30);R.run.players[0].scores=[];R.strokes=1;s.x=c.x+0.2;s.z=c.z+2;s.y=c.y+0.21;game.step(2);R.camF=[s.x,s.y,s.z];R.fire(Math.atan2(-0.2,2),0.28,false);for(let i=0;i<900&&!R.card;i++)game.step(1);"
FINAL="$SEED game.data.run={mode:'party',order:[0,1,2],i:2,p:0,players:[{name:'Player 1',col:'#ffc53d',skin:'pearl',scores:[3,3,2]},{name:'Player 2',col:'#3fd7ff',skin:'coral',scores:[2,4,3]},{name:'Player 3',col:'#ff6fb1',skin:'beach',scores:[4,3,4]}]};game.go('final');"
PASS="game.data.run={mode:'party',order:[0,1,2],i:1,p:1,players:[{name:'Player 1',col:'#ffc53d',skin:'pearl',scores:[3]},{name:'Player 2',col:'#3fd7ff',skin:'coral',scores:[2]}]};game.go('pass');"
shot(){ n=$1; d=$2; e=$3; st=${4:-60}; [[ -n $ONLY && $n != *$ONLY* ]] && return; node ../../bin/pogo.js shot . --device $d --out $OUT/$n-$d.png --steps $st --eval "$e" 2>&1 | grep -v "^Wrote"; }
for d in phone phone-landscape desktop; do
 shot title $d "$SEED game.go('title');" 80 &
 shot first $d "" 80 &
 shot hub $d "$SEED game.go('hub',{island:2});" 60 &
 shot play $d "${PLAY/HOLE/3}$PULL" 2 &
 wait
 shot frost $d "${PLAY/HOLE/10}" 40 &
 shot lava $d "${PLAY/HOLE/21}" 60 &
 shot ace $d "$ACE" 240 &
 wait
 shot card $d "$CARD" 30 &
 shot cup $d "$CUP" 30 &
 shot final $d "$FINAL" 80 &
 wait
 shot pass $d "$PASS" 40 &
 shot locker $d "$SEED game.go('locker');" 40 &
 shot party $d "$SEED game.go('party');" 40 &
 wait
 shot intro $d "game.go('play',{hole:7});" 90 &
 shot cups $d "$SEED game.go('cups');" 40 &
 wait
done
