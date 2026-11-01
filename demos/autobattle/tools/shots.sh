#!/bin/zsh
# Rebuilds shots/. Needs node on PATH.
cd "$(dirname $0)/.."; P() { node ../../bin/pogo.js "$@" | tail -0; }
TEAM="var G=game.pb; game.startRun({seed:77,tutorial:false}); var r=G.run; r.round=6; r.gold=9; r.wins=4; r.lives=3; var ids=['taxham','suitbee','owlaudit','bathduck','gothrab','pigchef']; ids.forEach((id,i)=>{r.board[[1,2,0,5,6,3][i]]={uid:100+i,id,star:i%3==0?2:1,atkB:1,hpB:2,extra:null}}); r.bench[0]={uid:120,id:'staticat',star:1,atkB:0,hpB:0,extra:null}; r.bench[1]={uid:121,id:'staticat',star:1,atkB:0,hpB:0,extra:null}; r.shelf=[{id:'mothint'},{id:'staticat'},{id:'vampuss'},{id:'octodj'},{id:'ceocto'}];game.step(20); game.go('shop');"
END="var G=game.pb; game.startRun({seed:5,tutorial:false}); var r=G.run; ['ceocto','vampuss','bathduck','taxham','gothrab','suitbee'].forEach((id,i)=>{r.board[i]={uid:100+i,id,star:1+i%3,atkB:0,hpB:0,extra:null}}); var e={pets:[{id:'taxham',cell:1,star:1}],gold:0,name:'Bot'}; for(var n=0;n<8;n++){r.history.push({round:n+1,me:{pets:[]},foe:e,seed:n,winner:n%3==2?'b':'a',hash:1});} r.wins=10; r.round=13; r.merges=7; r.over='won'; G.meta.treats=120; game.step(20); game.go('end');"
for dev in phone phone-landscape desktop; do
  P shot . --device $dev --out shots/title-$dev.png --steps 70
  P shot . --device $dev --out shots/shop-$dev.png --eval "$TEAM" --steps 80
  P shot . --device $dev --out shots/merge-$dev.png --eval "$TEAM game.step(50); game.shop.tryBuy(1,null);" --steps 44
  P shot . --device $dev --out shots/battle-$dev.png --eval "$TEAM game.step(5); game.shop.startFight();" --steps 300
  P shot . --device $dev --out shots/end-$dev.png --eval "$END" --steps 120
done
P shot . --device desktop --out shots/track.png --eval "game.pb.meta.treats=160; game.go('track')" --steps 30
P shot . --out shots/book-phone.png --eval "game.pb.meta.seen={taxham:1,gothrab:1,suitbee:1,soupnewt:1,mothint:1,drumcrab:1,staticat:1,bogfrog:1}; game.go('book')" --steps 30
P shot . --device desktop --out shots/megamerge.png --eval "var G=game.pb; game.startRun({seed:77,tutorial:false}); game.step(20); var r=G.run; r.round=7; r.gold=9; r.wins=6; r.lives=3; var a=(id,s,u)=>({uid:u,id,star:s,atkB:2,hpB:3,extra:null}); r.board[0]=a('vampuss',2,201); r.board[1]=a('staticat',2,202); r.board[2]=a('ceocto',1,203); r.board[3]=a('suitbee',2,204); r.board[4]=a('taxham',3,205); r.board[5]=a('staticat',2,206); r.board[6]=a('bathduck',2,207); r.bench[0]=a('staticat',1,208); r.bench[1]=a('staticat',1,209); r.shelf=[{id:'hamhydra'},{id:'staticat'},{id:'lampqueen'},{id:'octodj'},{id:'gothrab'}]; game.go('shop'); game.step(50); game.shop.tryBuy(1,null);" --steps 84
P shot . --device desktop --dpr 2 --out shots/hero.png --eval "game.pb.heroPose=true; game.pb.meta.treats=95; game.go('title')" --steps 60
