// Measures what the movement constants add up to, on an endless flat floor, through the real stepHero.
// Run: node tools/measure.mjs. Every gap in levels.js is designed from these numbers.
import { DT, F, GROUND, TILE, newHero, stepHero } from "../physics.js";

const W = 400, H = 40, ROW = 30;
const R = { w: W, h: H, T: new Uint8Array(W * H), plats: [] };
for (let r = ROW; r < H; r++) for (let c = 0; c < W; c++) R.T[r * W + c] = GROUND;

const floorY = ROW * TILE;
function spawn(big = false) { const h = newHero(40, floorY - (big ? 13 : 7), big); stepHero(h, { dir: 0 }, R, 0); return h; }
const input = (o) => ({ dir: 0, run: false, jump: false, jumpPressed: false, down: false, ...o });

function run(run, frames) {
    const h = spawn(); const v = [];
    for (let i = 0; i < frames; i++) { stepHero(h, input({ dir: 1, run }), R, i * DT); v.push(h.vx); }
    return v;
}
for (const r of [false, true]) {
    const v = run(r, 120), top = r ? F.RUN : F.WALK, at = v.findIndex((x) => x >= top * 0.99);
    console.log(`${r ? "run " : "walk"}: top ${top} px/s = ${(top / TILE).toFixed(1)} tiles/s, reached in ${(at * DT).toFixed(2)}s`);
}

/** Jump from a standing start or at speed, holding for `hold` frames. Returns height and flat distance. */
function jump(speed, hold, big = false) {
    const h = spawn(big);
    const running = speed === "run", moving = speed !== "stand";
    for (let i = 0; i < 90 && moving; i++) stepHero(h, input({ dir: 1, run: running }), R, i * DT);
    const x0 = h.x, y0 = h.y;
    let top = y0, frames = 0;
    for (let i = 0; i < 200; i++) {
        stepHero(h, input({ dir: moving ? 1 : 0, run: running, jump: i < hold, jumpPressed: i === 0 }), R, i * DT);
        top = Math.min(top, h.y); frames++;
        if (h.grounded && i > 2) break;
    }
    return { height: y0 - top, dist: h.x - x0, frames };
}
console.log("\n             height(px) height(tiles)   dist(px) dist(tiles)  airtime");
for (const [label, sp, hold] of [["tap stand", "stand", 1], ["full stand", "stand", 99], ["tap walk", "walk", 1], ["full walk", "walk", 99], ["tap run", "run", 1], ["half run", "run", 12], ["full run", "run", 99]]) {
    const j = jump(sp, hold);
    console.log(`${label.padEnd(12)} ${j.height.toFixed(1).padStart(8)} ${(j.height / TILE).toFixed(2).padStart(10)} ${j.dist.toFixed(1).padStart(12)} ${(j.dist / TILE).toFixed(2).padStart(9)} ${(j.frames * DT).toFixed(2).padStart(10)}s`);
}

// Largest clean gap: start on a ledge at speed, jump at the last frame, land same height.
function gap(speed, tall = 0) {
    let best = 0;
    for (let g = 1; g < 16; g++) {
        const r2 = { w: W, h: H, T: new Uint8Array(W * H), plats: [] };
        const edge = 60;
        for (let c = 0; c < W; c++) {
            const far = c >= edge + g;
            if (c >= edge && !far) continue;
            for (let r = far ? ROW - tall : ROW; r < H; r++) r2.T[r * W + c] = GROUND;
        }
        const h = newHero(edge * TILE - 200, floorY - 7, false);
        let i = 0, ok = false, jumped = 0;
        const run = speed === "run";
        for (; i < 400; i++) {
            const lip = h.x + h.w / 2 + h.vx * DT >= edge * TILE + h.w;
            const press = !jumped && (lip || h.x + 2 > edge * TILE);
            if (press) jumped = i;
            stepHero(h, input({ dir: 1, run, jump: !!jumped, jumpPressed: press }), r2, i * DT);
            if (h.y > floorY + 32) break;
            if (h.grounded && h.x > (edge + g) * TILE) { ok = true; break; }
        }
        if (ok) best = g;
    }
    return best;
}
console.log(`\nmax same-height gap: walk ${gap("walk")} tiles, run ${gap("run")} tiles`);
console.log(`max gap landing 2 tiles higher: walk ${gap("walk", 2)}, run ${gap("run", 2)}; 4 higher: walk ${gap("walk", 4)}, run ${gap("run", 4)}`);
const b = jump("run", 99, true);
console.log(`big run jump: ${b.height.toFixed(1)}px, ${b.dist.toFixed(1)}px`);
