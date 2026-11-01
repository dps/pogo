// Walks the menus by real taps: tour, difficulty sheet, locked songs, practice, pause. Run: node tools/flow.mjs
await import("../game.js");
const game=globalThis.__pogo,c=globalThis.__beat;
game.step(3);
game.go("tour"); game.step(5);
const tap=(x,y)=>{game.input.pointerEvent("down",1,x,y);game.step(1);game.input.pointerEvent("up",1,x,y);game.step(2)};
console.log("scene",game.currentName, "story seen", c.save.story);
tap(180,300); // dismiss bog line
const api=c.tourApi, r=api.songs[0]; const top=game.view.safe.top+62;
tap(180, top + r.y + 20 ); game.step(3);
const btn=game.current.entities.filter(e=>e.buttonLabel).map(e=>e.buttonLabel); console.log(btn);
const n=game.current.entities.find(e=>e.buttonLabel==="NORMAL"),p=n.worldPos(); game.input.tap(p.x,p.y); game.step(40);
console.log("->",game.currentName,c.run?.diff,c.run?.song.id);
// locked song refused
c.clock.stop(); game.go("tour"); game.step(5); const r2=api.songs[5]; console.log("open?",c.tourApi.songs.length); c.tourApi.openSheet(c.tourApi.songs[5]); game.step(2); console.log(game.current.entities.filter(e=>e.buttonLabel).map(e=>e.buttonLabel));
// practice flow
game.go("practice"); game.step(5);const g=game.current.entities.find(e=>e.buttonLabel==="GO"),q=g.worldPos();game.input.tap(q.x,q.y);game.step(40);console.log(game.currentName, c.run.notes.length);
// pause flow
game.input.press("pause",2);game.step(5);console.log(game.current.entities.filter(e=>e.buttonLabel).map(e=>e.buttonLabel));
const t0=c.clock.time;game.step(30);console.log("held",c.clock.time===t0);
const pl=game.current.entities.find(e=>e.buttonLabel==="PLAY ON").worldPos();game.input.tap(pl.x,pl.y);game.step(120);console.log("moved",c.clock.time>t0, game.currentName);
process.exit(0)
