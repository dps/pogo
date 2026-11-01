#!/bin/zsh
# Every screen on one device, into tools/out: tools/shots.sh <device> [filter]
cd ${0:A:h}/..
DEV=${1:-phone}; ONLY=$2; mkdir -p tools/out
shot(){ n=$1; [[ -n $ONLY && $n != *$ONLY* ]] && return; node ../../bin/pogo.js shot . --device $DEV --out tools/out/$n-$DEV.png --steps $3 --eval "game.noSave=1;game.profile.tutorial=true;$2" 2>&1 | grep -v Wrote; }
RUN="game.noSlow=1;game.play.begin({auto:true,seed:9,noTutorial:true});game.play.run.inv=99;game.play.run.heat=0;"
wear(){ echo "game.noSlow=1;game.play.begin({auto:true,seed:9,noTutorial:true,start:${2:-0}});game.play.run.inv=99;game.play.run.heat=0;game.play.run.t=9;game.play.run.wear('$1');"; }
shot title "" 60
shot run "$RUN" 300
shot moustache "$(wear moustache 780)" 100
shot skates "$(wear skates 1780)" 100
shot jetpack "$(wear jetpack 2930)" 100
shot dress "$(wear dress 4180)" 120
shot hivis "$(wear hivis 5530)" 100
shot heat "game.noSlow=1;game.play.begin({auto:true,seed:12,noTutorial:true,start:1780});game.play.run.inv=99;game.play.run.heat=0.8;game.play.run.t=9;" 70
shot over "game.noSlow=1;game.profile.best=20;game.play.begin({auto:true,seed:9,noTutorial:true});game.step(200);game.play.run.catchMe('crash',null);" 60
shot gate "game.noSlow=1;game.play.begin({auto:true,seed:9,noTutorial:true,start:1660});game.play.run.t=9;game.play.run.inv=99;game.play.run.heat=0;" 20
shot rocket "game.noSlow=1;game.play.begin({auto:true,seed:9,noTutorial:true,start:6890});game.play.run.t=9;game.play.run.inv=99;game.play.run.heat=0;" 90
shot launchoff "game.noSlow=1;game.play.begin({auto:true,seed:9,noTutorial:true,start:6985});game.play.run.t=9;game.play.run.inv=99;game.play.run.heat=0;game.step(60);" 170
shot win "game.noSlow=1;game.play.begin({auto:true,seed:9,noTutorial:true,start:6985});game.play.run.t=9;game.play.run.inv=99;game.play.run.heat=0;game.step(60);game.step(240);" 40
shot shop "game.play.menus.shop();" 40
shot goals "game.play.menus.missions();" 40
shot places "game.profile.seen=[0,1,2,3];game.play.menus.places();" 40
shot daily "game.play.menus.daily();" 40
shot settings "game.play.menus.settings();" 40
shot pause "$RUN game.step(120);game.play.menus.pause();" 40
shot tutorial "game.profile.tutorial=false;game.play.begin({seed:3});game.step(220)" 120
