#!/bin/zsh
# Every screen on every device. Usage: tools/shots.sh <outdir> [name-filter] [devices...]
SP=${TMPDIR:-/tmp}
export PATH=$SP/node/bin:$PATH
OUT=${1:-shots}; ONLY=$2; shift 2 2>/dev/null; DEVS=(${@:-phone phone-landscape desktop}); mkdir -p $OUT
PRE="const SQ=['sarge','doris','gale','vinnie'].map(k=>({k,up:{}}));const M=(i,n)=>{game.go('battle',{mission:__sg.MISSIONS[i],squad:SQ.slice(0,n??4)});game.step(12);__squad.G.brief=false;game.step(12);};const Q=()=>__squad;"
WINS="$PRE M(4,3);const q=Q();const st=q.st;for(const u of st.units)if(u.side===1)u.hp=0;st.over='win';q.finish();game.step(100);"
AIM="$PRE M(4,3);const q=Q(),u=q.st.units[1];q.select(u.id);game.step(6);q.toggleMode();q.setHover([u.x,u.y-3]);"
DRAG="$PRE M(13,3);const q=Q(),u=q.st.units[0];q.select(u.id);game.step(6);q.setHover([u.x+1,u.y-2]);"
SEEDED="localStorage.setItem('pogo:squadgoals.v1',JSON.stringify({}));"
shot(){ n=$1; d=$2; e=$3; st=${4:-40}; [[ -n $ONLY && $n != *$ONLY* ]] && return; node ../../bin/pogo.js shot . --device $d --out $OUT/$n-$d.png --steps $st --eval "$e" 2>&1 | grep -v Wrote; }
for d in $DEVS; do
 shot title $d "" 60
 shot aim $d "$AIM" 30
 shot drag $d "$DRAG" 30
 shot boss $d "$PRE M(26);" 40
 shot roof $d "$PRE M(20);" 40
 shot band $d "$PRE M(10);" 40
 shot win $d "$WINS" 60
 shot lose $d "$PRE M(0,2);const q=Q();q.st.over='lose';q.st.why='squad';q.finish();game.step(40);" 30
 shot map $d "game.go('map');game.step(6);" 50
 shot brief $d "game.go('roost');game.step(5);" 30
 shot rogue $d "game.go('rogue');" 40
 shot ending $d "game.go('ending');game.step(320);" 30
done
