#!/bin/sh
# Regenerates the reference screenshots. Usage: sh shots.sh /path/to/pogo
P=$1; cd "$(dirname "$0")"
SEEN="localStorage.setItem('pogo:hibernook1', JSON.stringify({best:48210,seen:[0,1,2,3,4,5,6,7,8,9],tutored:true,plays:5}));"
PLAY="game.go('play',{seed:5}); game.step(3);"
for dev in phone desktop; do
  $P shot . --device $dev --out shots/$dev-title.png --steps 300
  $P shot . --device $dev --out shots/$dev-early.png --eval "$SEEN $PLAY game.autoplay(16)" --steps 24
  $P shot . --device $dev --out shots/$dev-pile.png --eval "$SEEN $PLAY game.autoplay(250)" --steps 24
  $P shot . --device $dev --out shots/$dev-collection.png --eval "$SEEN game.go('dex');" --steps 30
  $P shot . --device $dev --out shots/$dev-gameover.png --eval "$SEEN $PLAY game.autoplay(900,12345,0.55)" --steps 150
done
$P shot . --device phone-landscape --out shots/landscape-pile.png --eval "$SEEN $PLAY game.autoplay(150)" --steps 24
$P shot . --device phone-landscape --out shots/landscape-title.png --steps 300
$P shot . --device phone-small --out shots/small-pile.png --eval "$SEEN $PLAY game.autoplay(150)" --steps 24
$P shot . --device tablet --out shots/tablet-pile.png --eval "$SEEN $PLAY game.autoplay(150)" --steps 24
