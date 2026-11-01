// Plays the whole game, headless. The bot sees what a person sees: it ignores bullets younger than its reaction time and moves no faster than a thumb.
// Also measures, for every pattern, peak bullets and whether the densest moments leave a real gap.
// Usage: node tools/bot.mjs [diff 0-2] [--from stage] [--only stage] [--thumb 3.6] [--react 0.15]
import "../game.js";
import { HIT, F_MARCH, F_REAIM, FIELD_W } from "../bullets.js";
import { marchAt } from "../director.js";
import { newRun } from "../play.js";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : Number(process.argv[i + 1]); };
const has = (n) => process.argv.includes(`--${n}`);
const diff = Number(process.argv[2] ?? 1), THUMB = arg("thumb", 3.6), REACT = arg("react", 0.15), from = arg("from", 0), only = arg("only", -1), seed = arg("seed", 1);
const game = globalThis.__pogo, ctx = globalThis.__moth;
game.restart("title", {}, { seed }); game.step(2);
game.haptics.enabled = true;
game.data.run = newRun(diff); game.data.run.stage = from;
game.go("play", { stage: from }); game.step(1);

const SL = [3, 6, 9, 12, 16, 20, 26, 32, 40], CS = 16, GW = Math.ceil(460 / CS), GH = Math.ceil(900 / CS), OFF = 50;
const heads = SL.map(() => new Int32Array(GW * GH)), nx = SL.map(() => new Int32Array(5000)), PX = SL.map(() => new Float32Array(5000)), PY = SL.map(() => new Float32Array(5000)), PR = new Float32Array(5000);

function predict(p) {
    const b = p.bullets, beat = p.cond.beat, spb = p.cond.spb ?? 0.5, song = !!p.cond.song;
    const cum = SL.map((n) => { let s = 0; for (let k = 0; k < n; k++) s += (song ? marchAt(beat + k / 60 / spb) : 1) / 60; return s; });
    const m = p.moth;
    for (let k = 0; k < SL.length; k++) heads[k].fill(-1);
    for (let i = 0; i < b.hi; i++) {
        if (!b.live[i] || b.age[i] < REACT) continue;
        PR[i] = HIT[b.kind[i]] * b.size[i] + m.hitR;
        for (let k = 0; k < SL.length; k++) {
            const t = SL[k] / 60; let x = b.x[i], y = b.y[i];
            if (b.wait[i] > 0) {
                if (b.wait[i] < t) { const r = t - b.wait[i], a = b.flags[i] & F_REAIM ? Math.atan2(m.y - y, m.x - x) : b.ang[i] + b.turn[i], v = b.spd2[i]; x += Math.cos(a) * v * r; y += Math.sin(a) * v * r; }
            } else if (b.fall[i] !== 0) { x += b.vx[i] * t; y += Math.min(b.vy[i] * t + 0.5 * b.fall[i] * t * t, b.maxS[i] * t); }
            else {
                const tt = b.flags[i] & F_MARCH ? cum[k] : t, s = Math.min(b.maxS[i], Math.max(b.minS[i], b.spd[i] + b.acc[i] * tt * 0.5)), a = b.ang[i] + b.w[i] * tt * 0.5;
                x += Math.cos(a) * s * tt; y += Math.sin(a) * s * tt;
            }
            PX[k][i] = x; PY[k][i] = y;
            const cx = Math.floor((x + OFF) / CS), cy = Math.floor((y + OFF) / CS);
            if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) continue;
            const c = cy * GW + cx; nx[k][i] = heads[k][c]; heads[k][c] = i;
        }
    }
}
function clear(k, x, y) {
    const cx = Math.floor((x + OFF) / CS), cy = Math.floor((y + OFF) / CS); let best = 99; const h = heads[k], n = nx[k], X = PX[k], Y = PY[k];
    for (let j = cy - 1; j <= cy + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) {
        if (i < 0 || j < 0 || i >= GW || j >= GH) continue;
        for (let b = h[j * GW + i]; b >= 0; b = n[b]) { const c = Math.hypot(X[b] - x, Y[b] - y) - PR[b]; if (c < best) best = c; }
    }
    return best;
}
const DIRS = [[0, 0]]; for (let i = 0; i < 8; i++) DIRS.push([Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]);
function target(p) {
    let tx = 180, ty = p.H * 0.74;
    const b = p.boss;
    if (b) { const t = b.parts()[0]; tx = t.x; }
    else if (p.enemies.length) { let best = null, bd = 1e9; for (const e of p.enemies) { if (e.y < 0) continue; const q = Math.abs(e.x - p.moth.x); if (q < bd) { bd = q; best = e; } } if (best) tx = best.x; }
    return [tx, ty];
}
let plan = [0, 0], danger = 99;
function decide(p) {
    const m = p.moth; predict(p);
    const [tx, ty] = target(p), H = p.H; let bestC = Infinity, best = null, hitSoon = 99;
    const legs = [];
    for (const [dx, dy] of DIRS) for (const sp of dx || dy ? [THUMB * 0.5, THUMB] : [0]) legs.push([dx * sp, dy * sp]);
    for (const a of legs) {
        for (const [ex, ey] of DIRS) {
            let cost = 0, firstHit = 99, x = m.x, y = m.y, step = 0;
            const bx = ex * THUMB, by = ey * THUMB;
            for (let k = 0; k < SL.length; k++) {
                while (step < SL[k]) { const u = step < 10 ? a : [bx, by]; x += u[0]; y += u[1]; step++; if (x < 7) x = 7; else if (x > FIELD_W - 7) x = FIELD_W - 7; if (y < 12) y = 12; else if (y > H - 12) y = H - 12; }
                const c = clear(k, x, y), w = 1 - k * 0.06;
                if (c < 1.2) { cost += 4000 * w; if (firstHit === 99) firstHit = k; } else if (c < 9) cost += (9 - c) * (9 - c) * 2 * w;
            }
            cost += Math.abs(x - tx) * 0.09 + Math.abs(y - ty) * 0.05 + (x < 24 || x > FIELD_W - 24 ? 6 : 0) + (y > H - 30 ? 6 : 0) + (a[0] === 0 && a[1] === 0 ? -0.5 : 0);
            if (cost < bestC) { bestC = cost; best = a; hitSoon = firstHit; }
        }
    }
    plan = best; danger = hitSoon;
}

// --- Gap measurement ---------------------------------------------------------------------------------------
const pat = new Map(); const key = (p) => `${p.stage.id} ${p.mode === "waves" ? (p.waveName ?? "-") : (p.phaseDef?.name ?? p.mode)}`;
const G = 8, gw = Math.ceil(FIELD_W / G), gh = Math.ceil(800 / G), blocked = new Uint8Array(gw * gh), seen = new Int16Array(gw * gh);
/** Largest clear circle anywhere, the free area connected to the moth, and whether it can still reach any safe cell one second on. */
function gap(p) {
    const b = p.bullets, gH = Math.ceil(p.H / G), r0 = p.moth.hitR;
    blocked.fill(0);
    let n = 0;
    for (let i = 0; i < b.hi; i++) {
        if (!b.live[i]) continue; n++;
        const x = b.x[i], y = b.y[i], r = HIT[b.kind[i]] * b.size[i] + r0 + 1, R = Math.ceil(r / G), cx = Math.floor(x / G), cy = Math.floor(y / G);
        for (let j = cy - R; j <= cy + R; j++) for (let k = cx - R; k <= cx + R; k++) { if (k < 0 || j < 0 || k >= gw || j >= gH) continue; if (Math.hypot((k + 0.5) * G - x, (j + 0.5) * G - y) < r) blocked[j * gw + k] = 1; }
    }
    // Largest clearing: a chessboard distance transform.
    const dist = new Int16Array(gw * gH); let big = 0;
    for (let j = 0; j < gH; j++) for (let i = 0; i < gw; i++) { const c = j * gw + i; dist[c] = blocked[c] ? 0 : Math.min(i ? dist[c - 1] + 1 : 1, j ? dist[c - gw] + 1 : 1, i && j ? dist[c - gw - 1] + 1 : 1, j && i < gw - 1 ? dist[c - gw + 1] + 1 : 1); }
    for (let j = gH - 1; j >= 0; j--) for (let i = gw - 1; i >= 0; i--) { const c = j * gw + i; if (blocked[c]) continue; if (i < gw - 1) dist[c] = Math.min(dist[c], dist[c + 1] + 1); if (j < gH - 1) dist[c] = Math.min(dist[c], dist[c + gw] + 1); if (j < gH - 1 && i < gw - 1) dist[c] = Math.min(dist[c], dist[c + gw + 1] + 1); if (j < gH - 1 && i) dist[c] = Math.min(dist[c], dist[c + gw - 1] + 1); if (dist[c] > big) big = dist[c]; }
    return { n, clearing: big * G };
}

// --- Run --------------------------------------------------------------------------------------------------
const STAMP = Date.now(); let steps = 0, last = null, log = [], done = false, stageStart = 0, forced = 0, bombsBot = 0;
const hapticSeen = {};
const stagesDone = [];
{ const ep = Object.getPrototypeOf(ctx.play).endPhase; Object.getPrototypeOf(ctx.play).endPhase = function (won) { const s = this.cond.song, m = this.cond.meter, q = this.phaseEnd; console.log(`   phase ${this.phaseDef.name}: ${this.boss.hp <= 0 ? "killed" : "timed out"}, ${((q - this.cond.beat) / m).toFixed(1)} bars spare of ${this.phaseDef.bars}`); return ep.call(this, won); }; }
while (!done && steps < 60 * 60 * 40) {
    const p = ctx.play;
    if (game.currentName === "ending") { console.log("ENDING:", game.currentArgs.kind, "score", game.currentArgs.score, "deaths", game.currentArgs.deaths); done = true; break; }
    if (p !== last) {
        if (last) { stagesDone.push({ stage: last.stage.id, time: ((steps - stageStart) / 60).toFixed(0), deaths: last.run.deaths, bombs: last.run.bombsUsed, score: last.run.score, graze: last.run.graze, peak: last.run.peak }); console.log("stage", last.stage.id, "done", JSON.stringify(stagesDone.at(-1))); if (only >= 0) break; }
        last = p; stageStart = steps; p.bot = { dx: 0, dy: 0 };
    }
    if (p.over) {
        console.log(`GAME OVER at stage ${p.stage.id}, ${key(p)}, t=${((steps - stageStart) / 60).toFixed(0)}`);
        if (has("nocontinue")) break;
        p.continueRun(); game.step(30); continue;
    }
    if (steps % 2 === 0) decide(p);
    p.bot.dx = plan[0]; p.bot.dy = plan[1]; p.bot.focus = false;
    const m = p.moth;
    if (m.alive && danger <= 2 && p.run.bombs > 0 && m.inv <= 0) { p.bot.bomb = true; bombsBot++; }
    if (steps % 12 === 0) {
        const k = key(p), r = pat.get(k) ?? { peak: 0, clearing: 999, atPeak: 0, deaths: 0 };
        const g = gap(p); if (g.n > r.peak) { r.peak = g.n; r.atPeak = g.clearing; } if (g.n > 80) r.clearing = Math.min(r.clearing, g.clearing);
        pat.set(k, r);
    }
    const d0 = p.run.deaths;
    game.step(1); steps++;
    if (ctx.play === p && p.run.deaths > d0) { const k = key(p), r = pat.get(k); if (r) r.deaths++; console.log(`  death: stage ${p.stage.id} ${key(p)} bullets ${p.bullets.count} t=${((steps - stageStart) / 60).toFixed(0)}`); }
}
console.log(`\ndiff ${diff}: ${(steps / 60 / 60).toFixed(1)} min of play in ${((Date.now() - STAMP) / 1000).toFixed(0)} s`);
console.log("pattern".padEnd(34), "peak", "clear@peak", "minClear", "deaths");
for (const [k, r] of pat) console.log(k.padEnd(34), String(r.peak).padStart(4), String(r.atPeak).padStart(6), String(r.clearing).padStart(8), String(r.deaths).padStart(6));
const p = ctx.play; console.log(JSON.stringify({ deaths: p.run.deaths, continues: p.run.continues, bombs: p.run.bombsUsed, score: p.run.score, graze: p.run.graze, peak: p.run.peak }));
process.exit(0);
