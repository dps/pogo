#!/bin/zsh
# Shots of each state. Usage: tools/shots.sh <outdir> [name-filter] [devices...]
SP=${TMPDIR:-/tmp}
export PATH=$SP/node/bin:$PATH
OUT=${1:-shots}; ONLY=$2; shift 2 2>/dev/null; DEVS=(${@:-phone phone-landscape desktop}); mkdir -p $OUT
PRE='const C=globalThis.__chess,W=C.world,sq=(n)=>n.charCodeAt(0)-97+(n.charCodeAt(1)-49)*16,at=(n)=>{W.s.cam3.update(1);const p=W.pieceAt(sq(n));return W.project(p?p.x:(sq(n)&7)-3.5,.15,3.5-(sq(n)>>4))};const go=(f,m)=>{C.begin({mode:"ai",level:3,side:"w",animate:false,fen:f,moves:m?m.split(" "):[]});W.yaw=W.yawGoal;game.step(40);C.G.busy=false;};'
GAME='e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 f1e2 e7e5 d4b3 f8e7 e1g1 e8g8'
START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
DRAG="$PRE go('$START','$GAME'); const a=at('c1'),b=at('g5'); game.input.pointerEvent('down',1,a.x,a.y); game.step(8); for(let i=1;i<=20;i++){game.input.pointerEvent('move',1,a.x+(b.x-a.x)*i/20,a.y+(b.y-a.y)*i/20); game.step(1);}"
CAP="$PRE go('$START','$GAME e4e5 d6e5 c1e3 c8e6 d1d8 f8d8'.split(' ').slice(0,0).join(' ')+'$GAME'); C.commit(C.chess.pos.fromUci('c3d5')||C.chess.legal()[0],null,'arc'); game.step(30); C.commit(C.chess.pos.fromUci('f6d5'),null,'arc'); game.step(26);"
CHECK="$PRE go('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 3',''); C.commit(C.chess.pos.fromUci('c4f7'),null,'arc'); game.step(70);"
MATE="$PRE go('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',''); C.commit(C.chess.pos.fromUci('a1a8'),null,'arc'); game.step(CC);"
PROMO="$PRE go('2k5/1P6/8/8/8/8/5PPP/6K1 w - - 0 1',''); const a=at('b7'),b=at('b8'); game.input.pointerEvent('down',1,a.x,a.y); game.step(8); for(let i=1;i<=20;i++){game.input.pointerEvent('move',1,a.x,a.y+(b.y-a.y)*i/20+(game.input.touchMode?44*i/20:0)); game.step(1);} game.input.pointerEvent('up',1,a.x,b.y+(game.input.touchMode?44:0));"
shot(){ n=$1; d=$2; e=$3; st=${4:-60}; [[ -n $ONLY && $n != *$ONLY* ]] && return; node ../../bin/pogo.js shot . --device $d --out $OUT/$n-$d.png --steps $st --eval "$e" 2>&1 | grep -v Wrote; }
for d in $DEVS; do
 shot title $d "" 30
 shot drag $d "$DRAG" 10
 shot capture $d "$CAP" 4
 shot check $d "$CHECK" 20
 shot mate1 $d "${MATE/CC/90}" 30
 shot mate2 $d "${MATE/CC/400}" 30
 shot over $d "${MATE/CC/900}" 60
 shot promo $d "$PROMO" 30
 shot club $d "globalThis.__chess.hud.open('club')" 10
 shot settings $d "globalThis.__chess.hud.open('settings')" 10
 shot black $d "$PRE C.begin({mode:'ai',level:2,side:'b',animate:false,moves:'e2e4 c7c5 g1f3'.split(' ')});W.yaw=W.yawGoal;game.step(40);" 60
done
