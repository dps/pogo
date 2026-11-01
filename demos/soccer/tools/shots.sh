#!/bin/zsh
mkdir -p tools/tmp
# Shoots gameplay and menus on one device: tools/shots.sh phone [names...]
d=$1; shift
want=("$@")
P() { n=$1; shift; if (( ${#want} == 0 )) || (( ${want[(Ie)$n]} )); then node ../../bin/pogo.js shot . --dpr 1 --device $d --out tools/tmp/${d}_$n.png "$@" & fi; }

G="for(let i=0;i<30000&&!(game.match&&game.match.st.goal);i++)game.step(1);"
P title --steps 240
P play --eval "game.go('match')" --steps 420
P goal --eval "game.go('match');game.step(1);$G game.step(50)" --steps 10
P celeb --eval "game.go('match');game.step(1);$G game.step(150)" --steps 10
R="game.go('match');game.step(1);const S=game.match.sim;S.phase='play';const g=S.goats[4];g.x=4;g.z=7;S.ball.x=5.5;S.ball.z=7;S.ball.owner=g;S.goats[5].z=-3;S.goats[5].x=23;S.goats[5].state=7;S.goats[5].holdT=99;S.ball.owner=g;S.kickShot(g,1.1,{x:24,z:2,y:1.5});for(let i=0;i<9000&&!game.match.st.replay;i++)game.step(1);"
P replay --eval "$R game.step(60)" --steps 4
P replay2 --eval "$R game.step(200)" --steps 4
P hub --eval "game.go('hub')" --steps 30
P cup --eval "game.go('cup')" --steps 30
P friendly --eval "game.go('friendly')" --steps 30
P team --eval "game.go('team')" --steps 30
P trophies --eval "game.go('trophies')" --steps 30
P settings --eval "game.go('settings')" --steps 30
P result --eval "game.go('match');game.step(1);for(let i=0;i<9000;i++){const m=game.match;if(m&&i===1500){m.sim.clock=0}game.step(1);if(game.currentName==='result')break}" --steps 60
for m in mud wind farmer sheep; do V=meadow; [[ $m == mud ]] && V=mud; [[ $m == wind ]] && V=moor; [[ $m == farmer ]] && V=harvest
P $m --eval "game.data.fixture=null;game.go('match',{mode:{${m}:true},venue:'$V',level:2,opp:9});" --steps 700; done
H="game.data.autoplay=null;"
P human --eval "game.go('match');game.step(1);const M=game.match,S=M.sim,G=()=>S.humans[0].goat;S.phase='play';S.ball.owner=null;for(let i=0;i<9;i++)game.step(1);S.humans[0].goat=S.goats[4];const g=S.goats[4];g.x=14;g.z=3;S.ball.x=15.2;S.ball.z=3;S.ball.owner=g;S.goats[0+5].z=-2;S.humans[0].b=true;game.data.autoplay=(s,h)=>{h.b=s.ball.owner===g;h.mx=1;h.mz=0};game.step(70);game.data.autoplay=(s,h)=>{h.b=false};game.step(3)" --steps 22
P human2 --eval "game.go('match');game.step(1);const M=game.match,S=M.sim;S.phase='play';S.clock=100;const g=S.goats[4],o=S.goats[8];g.x=2;g.z=2;o.x=4.6;o.z=2.4;S.ball.owner=o;S.humans[0].goat=g;game.data.autoplay=(s,h)=>{if(h.goat===g){h.mx=1;h.mz=0;h.b=true}};game.step(26);game.data.autoplay=(s,h)=>{h.b=false};game.step(5)" --steps 3
wait
