#!/bin/zsh
# Every screen on phone, landscape and desktop. Usage: tools/shots.sh outdir [names...]
cd "$(dirname "$0")/.."
OUT=${1:-tools/tmp}; shift; mkdir -p $OUT
P() { echo "game.go('play',{stage:$1,practice:{type:'phase',i:$2,name:'x',diff:${3:-1}}});game.step(1);__moth.play.moth.inv=1e9;__moth.play.run.bombs=2;__moth.play.boss.hpMax=1e6;__moth.play.startPhase;"; }
HP="for(let i=0;i<900;i++){const p=__moth.play;if(p.boss&&p.mode==='phase')p.boss.hp=p.boss.hpMax=1e5;game.step(1)}"
typeset -A EV
EV[title]="1|400"
EV[start]="game.data.run=undefined;game.go('play',{stage:0})|170"
EV[stage1]="game.go('play',{stage:0});game.step(1);__moth.play.moth.inv=1e9|1500"
EV[tide]="$(P 1 2);$HP|1"
EV[rose]="$(P 3 0);$HP|1"
EV[hours]="$(P 3 1);$HP|1"
EV[comet]="$(P 4 2);$HP|1"
EV[weaver]="$(P 2 1);$HP|1"
EV[blaze]="$(P 5 3 2);$HP|1"
EV[last]="$(P 5 4);$HP|1"
EV[flame]="$(P 5 0);$HP|1"
EV[tally]="game.go('play',{stage:2});game.step(2);__moth.play.boss={parts:()=>[]};__moth.play.boss=null;__moth.play.run.lives=3;__moth.play.stageClear();game.step(120)|1"
EV[gameover]="game.go('play',{stage:2});game.step(300);const p=__moth.play;p.run.score=48210;p.run.lives=0;p.moth.inv=0;p.die();game.step(90)|1"
EV[pause]="game.go('play',{stage:3});game.step(600);__moth.play.togglePause()|5"
EV[practice]="for(const s of __moth.STAGES){for(const w of s.waves)__moth.save.unlocked[s.id+':w:'+w.id]=1;for(const q of s.boss.phases)__moth.save.unlocked[s.id+':p:'+q.id]=1};game.go('practice')|30"
EV[scores]="__moth.save.scores=[[{score:1056750,stage:6,flame:true},{score:412000,stage:3}],[{score:1743461,stage:6,flame:true}],[]];game.go('scores')|30"
EV[settings]="game.go('settings')|30"
EV[flameend]="game.go('ending',{kind:'flame',score:3058993,graze:1361,deaths:2})|400"
EV[dawn]="game.go('ending',{kind:'dawn',score:1241372,graze:930,deaths:4})|400"
names=(${@:-title start stage1 tide rose hours comet weaver blaze last flame tally gameover pause practice scores settings flameend dawn})
for n in $names; do
  spec=${EV[$n]}; ev=${spec%%|*}; st=${spec##*|}
  for dev in ${=DEVS:-phone phone-landscape desktop}; do
    node ../../bin/pogo.js shot . --dpr 2 --device $dev --eval "$ev" --steps $st --out $OUT/$n-$dev.png 2>&1 | grep -v "^Wrote" | grep -v "^undefined$" &
  done
  wait
done
