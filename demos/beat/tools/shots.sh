#!/bin/zsh
# Screens on phone, landscape and desktop. Usage: tools/shots.sh [outdir] [names...]
cd "$(dirname "$0")/.."
OUT=${1:-tmp}; shift; mkdir -p $OUT

typeset -A EV
EV[title]="1;game.step(1)"
EV[play]="__beat.auto=true;game.go('play',{id:'skank',diff:'normal'});__x=1|1200"
EV[fever]="__beat.auto=true;game.go('play',{id:'disco',diff:'hard'});__x=1|2700"
EV[hard]="__beat.auto=true;game.go('play',{id:'sevenfeet',diff:'hard'});__x=1|1500"
EV[tour]="game.go('tour')|40"
EV[results]="game.go('results',{id:'skank',diff:'normal',r:{score:48210,acc:0.93,grade:'A',passed:true,stars:2,maxCombo:88,full:false,counts:{perfect:90,great:30,ok:6,miss:4},fevers:2,early:3,late:5,bias:0.01},rec:{isBest:true}})|240"
EV[practice]="game.go('practice')|30"
EV[settings]="game.go('settings')|30"
EV[calibrate]="game.go('calibrate')|60"
EV[ending]="game.go('ending')|90"
names=(${@:-title play fever tour results practice settings calibrate ending})
for n in $names; do
  spec=${EV[$n]}; ev=${spec%%|*}; st=${spec##*|}; [[ $st == $ev ]] && st=30
  for dev in phone phone-landscape desktop; do
    node ../../bin/pogo.js shot . --dpr 2 --device $dev --eval "$ev" --steps $st --out $OUT/$n-$dev.png 2>&1 | grep -v "^Wrote"
  done
done
