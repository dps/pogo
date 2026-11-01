#!/bin/bash
# Regenerates shots/. Run from demos/cards.
S="bash tools/s.sh"
SETUP="const {G,S}=__hex; G.meta.tutorial=true;"
COMBO="$SETUP G.meta.reactions=new Proxy({},{get:()=>1}); G.startRun('posy',0,5); game.step(40); const r=G.run; r.act=3; S.genAct(r); r.trinkets.push('mobiusladle','extension','oldbellows','thricespoon','sugarcube','alchnotes','hourglass','fattoad'); S.chooseNode(r,{r:0,c:r.map.nodes[0].c,type:'fight'}); const c=r.combat; c.enemies=[S.makeEnemy(r,'stormcrow',{int:()=>900}),S.makeEnemy(r,'ysolde',{int:()=>9000})]; c.enemies[0].hp=c.enemies[0].maxHp=4000; c.enemies[1].hp=c.enemies[1].maxHp=19000; c.enemies[0].move='bolt'; c.enemies[1].move='curse'; const mk=(id)=>S.makeCard(r,id,1); c.hand=[mk('moonpull'),mk('ouroboros'),mk('philosopher'),mk('giltflake'),mk('blackpin'),mk('giltflake'),mk('blackcat'),mk('pyre'),mk('phoenixyolk'),mk('snowball'),mk('tsunami'),mk('emberheart')]; c.heat=20; c.target=1; game.go('combat');game.step(30);const C=game.data.combat; for(const id of ['blackpin','giltflake','ouroboros','moonpull','blackcat','giltflake','philosopher']){const i=C.V.hand.findIndex(k=>k.id===id);C.place(i);game.step(26)}"
if [ "$1" = "hero" ]; then
  $S phone shots/hero.png 586 "$COMBO C.brew();"
  for d in phone-landscape desktop; do $S $d shots/fight-$d.png 40 "$SETUP G.startRun('posy',0,9); game.step(40); const r=G.run; S.chooseNode(r,S.reachable(r)[0]); game.go('combat');"; done
  exit 0
fi
for d in phone phone-landscape desktop; do
  $S $d shots/title-$d.png 80 ""
  $S $d shots/fight-$d.png 40 "$SETUP G.startRun('posy',0,9); game.step(40); const r=G.run; S.chooseNode(r,S.reachable(r)[0]); game.go('combat');"
  $S $d shots/combo-$d.png 470 "$COMBO C.brew();"
  $S $d shots/map-$d.png 60 "$SETUP G.startRun('vesper',0,5); game.step(170);"
  $S $d shots/end-$d.png 150 "$SETUP G.startRun('thistle',0,5); game.step(40); const r=G.run; r.won=true; r.stats.floors=36; r.stats.bosses=4;r.stats.elites=3; r.stats.best={dmg:12840,fires:44,pot:12,recipe:['spark','droplet','spark']}; r.screen='end'; game.go('end'); game.step(30); G.overlay=null; game.step(120); G.overlay=null;"
done
$S phone shots/zoom-phone.png 40 "$SETUP G.startRun('vesper',0,5); game.step(40); const r=G.run; S.chooseNode(r,S.reachable(r)[0]); game.go('combat'); game.step(30); G.overlay={kind:'zoom',card:{id:'ouroboros',up:0},t:1,tip:'Reflux'};"
$S phone shots/shop-phone.png 60 "$SETUP G.startRun('thistle',0,5); game.step(40); const r=G.run; r.gold=420; S.openShop(r); game.go('shop');"
$S phone shots/event-phone.png 60 "$SETUP G.startRun('posy',0,5); game.step(40); const r=G.run; r.event={id:'cat',result:null}; r.screen='event'; game.go('event');"
$S phone shots/hero.png 586 "$COMBO C.brew();"
