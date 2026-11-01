// The real play scene in endless mode, through season changes and bosses, on every screen shape.
import "../game.js";
import { act } from "./simbot.mjs";
const game = globalThis.__pogo;
globalThis.__garden.G.save.meta = {};
for (const device of ["phone", "phone-landscape", "desktop"]) {
    game.resize(device);
    game.go("play", { endless: 7, seed: 5 });
    game.step(5);
    const s = game.data.sim; game.data.play.speed(3);
    let n = 0;
    while (!s.over && n < 60 * 60 * 40) { if (n % 12 === 0) act(s); game.step(1); if (n % 300 === 0) game.render(); n++; }
    game.step(120); game.render();
    console.log(`${device}: endless ended at wave ${s.wave}, ${s.season}, ${Math.round(n / 60)}s at 3x, result ${JSON.stringify(game.data.play.result())}`);
}
