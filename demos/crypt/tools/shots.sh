#!/bin/zsh
# Rebuilds shots/. Needs node on PATH.
cd "$(dirname $0)/.."; P() { node ../../bin/pogo.js shot . "$@" 2>&1 | grep -v Wrote; }
SHOP="game.go('play'); game.step(10); var r=game.data.run; r.coins=14; r.hp=2; r.relics=['sunhat','snowglobe']; r.floor=4; r.lastBonus={base:2,flawless:1,par:2,moves:11,parN:12,name:'Femur Gallery'}; game.go('shop',{free:false}); game.step(30);"
DIE="game.go('play',{floor:1}); game.step(40); var f=game.crypt.state.floor; for(var i=0;i<4;i++){f.act(0);game.step(30);} f.state[1]=1; for(var i=0;i<9&&f.mode==='play';i++){f.act(4);game.step(40);} game.step(60);"
SN="$DIE game.current.entities.find(q=>q.name==='snaps').emit('tap'); game.step(60);"
BOOM="game.go('play',{floor:11}); game.step(50); var f=game.crypt.state.floor; for(var a of f.path){f.act(a); if(f.state[7]<3) break; game.step(34);}"
BONK="game.go('play',{floor:9}); game.step(120);"
for dev in phone phone-landscape desktop; do
  P --device $dev --out shots/title-$dev.png --steps 40
  P --device $dev --out shots/play-$dev.png --eval "$BONK" --steps 40
  P --device $dev --out shots/shop-$dev.png --eval "$SHOP" --steps 30
  P --device $dev --out shots/snaps-$dev.png --eval "$SN" --steps 40
  P --device $dev --out shots/death-$dev.png --eval "$DIE" --steps 10
done
P --device desktop --out shots/hero.png --eval "$BOOM" --steps ${1:-9}
P --out shots/boss-phone.png --eval "$BOOM" --steps ${1:-9}
P --out shots/monday-phone.png --eval "game.go('play',{floor:16}); game.step(40); var f=game.crypt.state.floor; for(var i=0;i<5;i++){f.act(f.path[i]);game.step(30);}" --steps 30
P --out shots/hotel-phone.png --eval "game.go('play',{floor:14})" --steps 500
