#!/bin/bash
# Shoots every screen on every device with real fonts and prints each layout finding. Run from demos/cards.
# tools/audit.sh [device ...]; pictures land in tools/tmp/<screen>-<device>.png
D=("$@"); [ ${#D[@]} -eq 0 ] && D=(phone-small phone phone-landscape desktop)
T="__hex.G.startTutorial(); game.step(40); const C=game.data.combat, G=__hex.G, S=__hex.S; game.step(60);"
R="const {G,S}=__hex; G.meta.tutorial=true; G.meta.seen={aim:1}; G.startRun('vesper',0,5); game.step(40); const r=G.run;"
F="$R S.chooseNode(r,S.reachable(r)[0]); game.go('combat'); game.step(40); const C=game.data.combat; game.step(40);"
BUSY="$R r.act=2; S.genAct(r); r.trinkets.push('oldbellows','alchnotes','sugarcube'); S.chooseNode(r,{r:0,c:r.map.nodes[0].c,type:'fight'}); const c=r.combat; c.enemies=[S.makeEnemy(r,'crow',{int:()=>900}),S.makeEnemy(r,'batchoir',{int:()=>900}),S.makeEnemy(r,'ropehag',{int:()=>900})]; c.enemies.forEach((e,i)=>{e.hp=e.maxHp=9000;e.move=Object.keys(__hex.E[e.id].moves)[0];e.st={burn:12,hex:2,doom:44,chill:3}}); c.p.st={weak:2,lid:1}; const mk=(id)=>S.makeCard(r,id,1); c.hand=[mk('moonpull'),mk('ouroboros'),mk('philosopher'),mk('giltflake'),mk('blackpin'),mk('giltflake'),mk('blackcat'),mk('pyre'),mk('phoenixyolk')]; c.heat=20; game.go('combat');game.step(30);const C=game.data.combat; for(const id of ['blackpin','giltflake','ouroboros','moonpull','blackcat','giltflake']){const i=C.V.hand.findIndex(k=>k.id===id);C.place(i);game.step(26)}"
one() { # name steps eval
  for d in "${D[@]}"; do
    out=$(node ../../bin/pogo.js shot . --device "$d" --out "tools/tmp/$1-$d.png" --steps "$2" --audit --eval "$3" 2>&1 | grep -v "^Wrote" | grep -E "TEXT_|OFFSCREEN|SAFE_AREA|error|Error" )
    [ -n "$out" ] && echo "== $1 $d" && echo "$out" | cut -c1-120
  done
}
one title 60 ""
one witch 60 "game.go('witch');"
one grimoire 60 "__hex.G.meta.reactions={'ember>brine':4}; game.go('grimoire');"
one lesson1a 30 "$T"
one lesson1b 30 "$T C.place(0); game.step(40); C.place(0); game.step(50);"
one lesson1c 30 "$T C.place(0); game.step(40); C.place(0); game.step(40); C.place(0); game.step(50);"
one lesson1d 95 "$T C.place(0); game.step(40); C.place(0); game.step(40); C.place(0); game.step(40); C.brew();"
one lesson2a 30 "$T G.run.prologue=2; S.startLesson(G.run); game.go('combat'); game.step(100);"
one lesson2b 30 "$T G.run.prologue=2; S.startLesson(G.run); game.go('combat'); game.step(100); const K=game.data.combat; K.place(0); game.step(40); K.place(0); game.step(50);"
one lesson3 30 "$T G.run.prologue=3; S.startLesson(G.run); game.go('combat'); game.step(100);"
one fight 20 "$F"
one busy 300 "$BUSY C.brew();"
one busy2 30 "$BUSY C.brew(); game.step(700);"
one idle3 30 "$BUSY"
one lifted 30 "$F C.V.hover=1;"
one zoom 30 "$F G.overlay={kind:'zoom',card:{id:'ouroboros',up:0},t:1,tip:'Reflux'};"
one foe 30 "$F G.overlay={kind:'tip',title:'Living Inkblot',text:'Next: Smear. Hits for 7. Adds 1 Gunk to your discard.',sub:'What do you see in it? It sees you.',sprite:'foe_inkblot',t:1};"
one deck 30 "$F G.overlay={kind:'deck',title:'Your deck',sub:'4 to draw, 2 used',cards:G.run.deck,t:1,scroll:0};"
one menu 30 "$F G.overlay={kind:'settings',t:1,sure:false};"
one reward 70 "$R r.reward={gold:0,cards:[{id:'pyre',up:0},{id:'tide',up:1},{id:'ouroboros',up:0}],trinket:null,kind:'fight'}; r.screen='reward'; game.go('reward');"
one map 70 "$R"
one shop 60 "$R r.gold=420; S.openShop(r); game.go('shop');"
one event 60 "$R r.event={id:'gambler',result:null}; r.screen='event'; game.go('event');"
one event2 60 "$R r.event={id:'librarian',result:'You win on a technicality and lose on a stapler. She refunds the interest with force.'}; r.screen='event'; game.go('event');"
one rest 60 "$R r.screen='rest'; game.go('rest');"
one treasure 60 "$R r.reward={kind:'treasure',gold:30,trinket:'thimble',cards:null}; r.screen='treasure'; game.go('treasure');"
one hoard 60 "$R r.bossPick=['blackcandle','bigpot','giantspoon']; r.screen='bossTrinket'; game.go('bossTrinket');"
one end 100 "$R r.won=true; r.stats.floors=36; r.stats.bosses=4;r.stats.elites=3; r.stats.best={dmg:12840,fires:44,pot:12,recipe:['spark','droplet','spark']}; r.screen='end'; game.go('end'); game.step(30); G.overlay=null;"
echo done
