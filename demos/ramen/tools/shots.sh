#!/bin/zsh
# Rebuilds shots/. Run from anywhere; needs node on PATH.
cd "$(dirname $0)/.."; P() { node ../../bin/pogo.js "$@" | tail -0; }
RUSH() { echo "var R=game.ramen,RC=R.RECIPES;R.save.equip.glaze='$2';game.go('play',{shift:$1});game.step(90);var s=R.stage,k=s.k;for(var i=0;i<1000;i++)s.update(1/60);k.events.length=0;var L=s.L,bs=k.bowls.filter(b=>b.c);var full=(b,n)=>{var r=RC[b.c.recipe];b.level=1;b.brothKind=r.broth;b.noodle={kind:r.noodle,q:2};r.tops.slice(0,n).forEach(t=>{b.tops[t]=true;});};full(bs[0],2);bs[2].c.recipe=bs[0].c.recipe;full(bs[2],9);k.serve(bs[2].i);k.dropNoodle(0);k.dropNoodle(1);k.pots[0].t=2.9;k.pots[1].t=1.5;var B=bs[1],j=k.brothList.indexOf(RC[B.c.recipe].broth),P=L.broths[j],Q=L.bowls[B.i],I=game.input;I.pointerEvent('down',7,P.x,P.y);game.step(3);I.pointerEvent('move',7,Q.x,Q.y+46);"; }
END="game.go('results',{i:7,stars:3,cash:7450,tips:1200,served:12,walked:0,perfects:11,total:12,happy:.97,best:'nana',gifts:[{who:'goro',recipe:'sunrise'}],stamped:['nana'],advanced:true,combo:7,hat:3200})"
FILL="var S=game.ramen.save;S.day=26;S.cash=52000;S.locs.station=S.locs.seaside=S.locs.hall=true;S.stars=Array(26).fill(3);S.recipes.plain=S.recipes.nana=S.recipes.sunrise=true;"
for dev in phone phone-landscape desktop; do
  P shot . --device $dev --out shots/title-$dev.png --steps 70
  P shot . --device $dev --out shots/play-$dev.png --eval "$(RUSH 29 wave)" --steps 26
  P shot . --device $dev --out shots/end-$dev.png --eval "$END" --steps 110
done
P shot . --out shots/ledger-phone.png --eval "$FILL game.go('ledger')" --steps 20
P shot . --out shots/cookbook-phone.png --eval "$FILL game.go('ledger',{tab:'book'})" --steps 20
P shot . --out shots/gull-phone.png --eval "var R=game.ramen;game.go('play',{shift:16});game.step(90);var s=R.stage,k=s.k;for(var i=0;i<300;i++)s.update(1/60);k.gulls[0].t=0;" --steps 12
P shot . --out shots/ending-phone.png --eval "game.go('ending')" --steps 300
P shot . --device desktop --out shots/hero.png --dpr 2 --eval "$(RUSH 29 wave)" --steps 26
