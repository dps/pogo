#!/bin/zsh
# Rebuilds shots/. Needs node on PATH.
cd "$(dirname $0)/.."
P() { node ../../bin/pogo.js shot . "$@" | tail -0; }
COMBO() { echo "game.grant($1); game.go('play',{level:$1}); game.step(50); var S=game.sugar,m=S.m,v=S.view; var P=(i,k)=>{m.pk[i]=k; if(k===5)m.pc[i]=-1; var p=v.pieces.get(m.pid[i]); if(p){p.k=k; p.c=m.pc[i];}}; P($2,2); P($3,2); P($3+8,5); m.feed=30; v.snap.feed=30; v.attempt($2,$3);"; }
WIN="game.grant(14); game.go('play',{level:14,attempt:1}); game.step(40); game.sugar.finish();"
LOSE="game.grant(40); game.go('play',{level:40}); game.step(40); var S=game.sugar; S.m.moves=1; S.view.snap.moves=1; S.m.feed=0; S.m.goals[0].n=99; var L=S.m.legal(); S.view.attempt(L[0][0],L[0][1]);"
for dev in phone phone-landscape desktop; do
  P --device $dev --out shots/title-$dev.png --steps 60
  P --device $dev --out shots/play-$dev.png --eval "$(COMBO 56 27 28)" --steps 27
  P --device $dev --out shots/win-$dev.png --eval "$WIN" --steps 640
  P --device $dev --out shots/lose-$dev.png --eval "$LOSE" --steps 150
done
P --device desktop --dpr 2 --out shots/hero.png --eval "$(COMBO 56 27 28)" --steps 27
P --out shots/ruin-phone.png --eval "$WIN" --steps 345
P --out shots/nap-phone.png --eval "game.go('play',{nap:true});" --steps 100
P --out shots/map-phone.png --eval "game.grant(44); game.go('map',{world:3})" --steps 30
P --device desktop --out shots/finale-desktop.png --eval "game.go('finale')" --steps 420
P --device phone-small --out shots/small-phone.png --eval "game.go('play',{level:28});" --steps 60
