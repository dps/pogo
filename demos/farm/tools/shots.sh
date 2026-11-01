#!/bin/zsh
# Rebuilds screenshots. Usage: shots.sh <outdir> [names...]; needs node on PATH.
cd "$(dirname $0)/.."; OUT=${1:-shots}; shift; P() { node ../../bin/pogo.js "$@" 2>&1 | grep -v "^Wrote"; }
# A mid-game farm with most things going.
RICH="var M=game.moonpatch; var st=M.fresh(1); globalThis.__rich&&0; st.zones=4; st.pennies=4210; st.day=19; st.tut=5; st.letter=4; st.built={cauldron:true,hive:true,glass:true,rod:true}; st.found=['pearlroot','emberbell']; st.dex.crop.moonradish=1; st.hearts.biscuit=12; st.hearts.odette=20; st.hearts.quillon=8; st.hearts.fennimore=4; st.inv={lampberry:4,fireflax:6,starmelon:2,silverperch:1,'fireflax*':2}; var C=['lampberry','fireflax','starmelon','emberroot','emberbell','pearlroot']; st.tiles.forEach((t,i)=>{ t.t=true; t.w=i%3!=0; var x=i%7,y=(i/7)|0; if((x+y*2)%5!=4){ var id=C[(x*3+y*5)%6]; t.c={id,age:i%4==0?1:9,ripe:i%4!=0}; } });"
for dev in ${=DEVS:-phone phone-landscape desktop}; do
  P shot . --device $dev --out $OUT/title-$dev.png --steps 60 --eval "game.save('moonpatch1',null);game.moonpatch.sim=null;game.go('title')"
  P shot . --device $dev --out $OUT/first-$dev.png --steps 90 --eval "game.moonpatch.fresh(1);game.go('farm')"
  P shot . --device $dev --out $OUT/farm-$dev.png --steps 100 --eval "$RICH game.go('farm')"
  P shot . --device $dev --out $OUT/market-$dev.png --steps 150 --eval "$RICH st.phase='night'; var S=game.moonpatch.simApi; S.dawn(st); st.letterUnread=false; game.go('market')"
  P shot . --device $dev --out $OUT/pond-$dev.png --steps 100 --eval "$RICH st.day=18; game.go('pond',{})"
  P shot . --device $dev --out $OUT/kitchen-$dev.png --steps 100 --eval "$RICH var S=game.moonpatch.simApi; S.dawn(st); st.letterUnread=false; game.go('kitchen')"
done
for dev in ${=MORE:-}; do
  P shot . --device $dev --out $OUT/letter-$dev.png --steps 140 --eval "game.moonpatch.fresh(1);var st=game.moonpatch.sim,S=game.moonpatch.simApi;st.stats.nights=1;S.dawn(st);game.go('market')"
  P shot . --device $dev --out $OUT/scene-$dev.png --steps 150 --eval "$RICH st.day=18; game.go('pond',{scene:1})"
  P shot . --device $dev --out $OUT/book-$dev.png --steps 40 --eval "$RICH game.go('farm'); game.step(8); game.current.entities.find(e=>e.name=='book').emit('tap');"
  P shot . --device $dev --out $OUT/build-$dev.png --steps 40 --eval "$RICH game.go('farm'); game.step(8); game.current.entities.find(e=>e.name=='build').emit('tap');"
  P shot . --device $dev --out $OUT/ghost-$dev.png --steps 40 --eval "$RICH var S=game.moonpatch.simApi; S.dawn(st); st.letterUnread=false; game.go('market'); game.step(8); game.current.entities.find(e=>e.name&&e.name.startsWith('ghost:')).emit('tap');"
  P shot . --device $dev --out $OUT/dawn-$dev.png --steps 70 --eval "$RICH game.go('farm'); game.step(8); game.current.entities.find(e=>e.name=='dawn').emit('tap');"
  P shot . --device $dev --out $OUT/ending-$dev.png --steps 90 --eval "$RICH game.go('ending')"
done
# The launcher image: a wide, moonlit title.
[ -z "$HERO" ] || P shot . --device desktop --out shots/hero.png --steps 90 --eval "game.save('moonpatch1',null);game.moonpatch.sim=null;game.go('title')"
