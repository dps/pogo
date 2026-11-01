import "../game.js";
import { TRACKS } from "../tracks.js";
const game = globalThis.__pogo;
for (const t of TRACKS) {
    const t0 = performance.now();
    game.restart("race", { track: t.id });
    const ms = performance.now() - t0, W = game.sim, B = W.built;
    let far = game.assets.geometry(B.far).vertices.length / 11, max = 0;
    for (const c of B.chunks) max = Math.max(max, game.assets.geometry(c.name).vertices.length / 11);
    console.log(t.id.padEnd(8), "total", B.verts, "far", far, "maxChunk", max, "chunks", B.chunks.length, "build ms", ms.toFixed(0), "len", W.T.length.toFixed(0));
}
process.exit(0);
