// Plays Hollow Tooth start to finish through game.input, the same path a thumb takes. Room routes come from the solver's report;
// inside a room it plans over the real physics and replans whenever enemies knock it off course. Bosses use a short-horizon dodge.
//   node tools/bot.mjs [--screen phone] [--all] [--from N] [-v]
import { A, CRACK, HARD, F, BEAMDOOR, stepHero, TILE, tileAt } from "../physics.js";
import { MACRO, plan } from "./search.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { BOSS_INFO } from "../story.js";
import "../game.js";

const game = globalThis.__pogo, args = process.argv;
const screen = args.includes("--screen") ? args[args.indexOf("--screen") + 1] : "phone-landscape", verbose = args.includes("-v"), thorough = args.includes("--all");
const report = JSON.parse(readFileSync(new URL("./solve-report.json", import.meta.url)));
game.resize(screen);
game.input.touchMode = false;
game.go("title"); game.step(30);
game.data.sv = undefined;
game.go("play"); game.step(40);
const G = () => game.dbg, W = () => game.dbg.W;
const log = (...a) => console.log(`[${(G().sv.time / 60).toFixed(1)}m d${G().sv.deaths} hp${G().sv.hp}/${G().sv.maxHp}]`, ...a);

// --- Input: held as touch codes, so everything passes through the real input layer.
const held = new Set();
function setKeys(keys) {
    for (const k of held) if (!keys.has(k)) { game.input.codeUp(`touch:${k}`); held.delete(k); }
    for (const k of keys) if (!held.has(k)) { game.input.codeDown(`touch:${k}`); held.add(k); }
}
const keysOf = (a) => { const k = new Set(); if (a.dir > 0) k.add("right"); if (a.dir < 0) k.add("left"); if (a.up) k.add("up"); if (a.down) k.add("down"); if (a.jump) k.add("jump"); if (a.tool) k.add("tool"); if (a.dash) k.add("dash"); return k; };
let frames = 0;
let lastHp = 99;
function step(n = 1) { for (let i = 0; i < n; i++) { game.step(1); frames++; handleModes(); if (verbose && G().sv.hp < lastHp) log("HIT", G().room.id, (G().H.x - G().room.x) | 0, (G().H.y - G().room.y) | 0, "foes", G().foes.map((f) => f.kind + ((f.x - G().H.x) | 0)).join(",")); lastHp = G().sv.hp; } }
function handleModes() {
    const m = game.data.mode;
    if (game.currentName === "ending") return;
    if (m === "sink") { game.dbg.setMode("play"); game.touch.enabled = true; for (const q of [...game.current.entities]) if (q.layer === 100) q.destroy(); }
    if (m === "card" || m === "talk") { setKeys(new Set(frames % 8 < 4 ? ["jump"] : [])); }
}
const inPlay = () => game.data.mode === "play" && game.currentName === "play";
function waitPlay(max = 900) { for (let i = 0; i < max && !inPlay() && game.currentName === "play"; i++) step(); }

// --- Fire when something's in reach, whatever else we're doing.
function drillNearby(keys) {
    const g = G(), H = g.H;
    if (!(g.sv.abil & A.DRILL) || H.rope >= 0) return;
    for (const f of g.foes) if (!f.hidden && Math.abs(f.x - H.x) < 34 && Math.abs(f.y - H.y) < 22 && Math.sign(f.x - H.x) === H.face) { if (frames % 16 < 2) keys.add("fire"); return; }
}

function foeNear() {
    const g = G(), H = g.H;
    if (!(g.sv.abil & A.DRILL) || H.rope >= 0 || H.rail || !H.grounded) return null;
    let best = null, bd = 64;
    for (const f of g.foes) { if (f.hidden || (f.kind === "d" && f.st === 0)) continue; const q = Math.hypot(f.x - H.x, (f.y - H.y) * 1.4); if (q < bd) { bd = q; best = f; } }
    return best;
}
function fightFoes() {
    const g = G(), H = g.H;
    for (let i = 0; i < 200 && inPlay(); i++) {
        const f = foeNear();
        if (!f) break;
        const k = new Set(), dx = f.x - H.x, dy = f.y - H.y, shield = false;
        if (dy < -18 && Math.abs(dx) < 22) { k.add("up"); if (i % 14 < 2) k.add("fire"); }
        else if (shield) { if (H.grounded && i % 30 < 2) k.add("jump"); if (!H.grounded) { k.add("jump"); k.add(dx > 0 ? "right" : "left"); if (dy > 8 && Math.abs(dx) < 16) { k.add("down"); if (i % 14 < 2) k.add("fire"); } } }
        else { if (Math.sign(dx) !== H.face) k.add(dx > 0 ? "right" : "left"); else if (Math.abs(dx) > 36) k.add(dx > 0 ? "right" : "left"); else if (Math.abs(dx) < 20 && i % 14 > 6) k.add(dx > 0 ? "left" : "right"); if (i % 14 < 2 && Math.abs(dx) < 40) k.add("fire"); }
        setKeys(k); step();
    }
    setKeys(new Set());
}

/** Move until goal(hero) holds or time runs out. Returns true on success. */
function go(goal, room, opts = {}) {
    const g = G(), maxF = opts.maxF ?? 2400;
    let t = 0, fails = 0;
    while (t < maxF) {
        waitPlay();
        if (!inPlay()) return false;
        if (goal(g.H)) return true;
        const startRoom = g.room;
        g.H._tool = held.has("tool");
        const p = plan(W(), startRoom, g.H, held.has("jump"), g.sv.abil, goal, { cap: opts.cap ?? 40000, heur: opts.heur });
        const p2 = p ?? plan(W(), startRoom, g.H, held.has("jump"), g.sv.abil, goal, { cap: 150000 });
        if (args.includes('--trace')) console.log('plan', p?.length, g.H.x-g.room.x, g.H.y-g.room.y, g.H.vx, g.H.vy, g.H.grounded, g.H.hazard, g.H.rope);
        if (!p2) { fails++; if (fails > 4) return false; setKeys(new Set()); step(30); t += 30; continue; }
        let off = false;
        for (const q of p2) {
            if (foeNear()) { fightFoes(); off = true; break; }
            const keys = keysOf(q.a);
            for (let i = 0; i < MACRO; i++) {
                const k = new Set(keys);
                if (q.a.dash && i > 0) k.delete("dash");
                drillNearby(k);
                setKeys(k); step(); t++;
                if (!inPlay() || goal(g.H)) { off = !inPlay(); break; }
            }
            if (goal(g.H)) return true;
            if (!inPlay()) { off = true; break; }
            if (Math.abs(g.H.x - q.h.x) > 2.5 || Math.abs(g.H.y - q.h.y) > 2.5) { off = true; break; }
        }
    }
    return false;
}

const leftRoom = (room) => (h) => W().roomAt(h.x, h.y) !== room;
const inRoom = (id) => (h) => W().roomAt(h.x, h.y)?.id === id;

// --- World route: door graph from the solver.
const groupOf = (room, h) => {
    const dl = h.x - room.x, dr = room.x + room.w - h.x, dt = h.y - room.y, db = room.y + room.h - h.y, m = Math.min(dl, dr, dt, db);
    const side = m === dl ? "W" : m === dr ? "E" : m === dt ? "N" : "S";
    return side + ((side === "W" || side === "E") ? Math.floor((h.y - room.y) / 288) : Math.floor((h.x - room.x) / 480));
};
let entry = null;   // Door group we came in by, "room|group".
function nextRoom(stage, from, to) {
    const E = report[Math.min(stage, report.length - 1)].edges;
    const starts = entry?.startsWith(from + "|") && E[entry] ? [entry] : Object.keys(E).filter((k) => k.startsWith(from + "|"));
    const q = [...starts], par = new Map(starts.map((k) => [k, null]));
    while (q.length) {
        const n = q.shift();
        if (n.startsWith(to + "|")) { let c = n; while (par.get(c) && par.get(par.get(c)) !== null) c = par.get(c); return c === n && par.get(c) === null ? to : c.split("|")[0]; }
        for (const e of E[n] ?? []) { const [rid, grp] = e.split(">")[1].split(":"), t = rid + "|" + grp; if (!par.has(t) && E[t]) { par.set(t, n); q.push(t); } }
    }
    entry = null;
    return null;
}
function travel(stage, to) {
    for (let guard = 0; guard < 600; guard++) {
        const g = G();
        waitPlay();
        if (g.room.id === to) return true;
        openCracks();
        grabItems();
        rinse();
        const n = nextRoom(stage, g.room.id, to);
        if (!n) { if (entry === null) { log("no route", g.room.id, to); return false; } entry = null; continue; }
        const doors = g.room.doors.filter((d) => d.to === n);
        const tx = g.room.x + (doors.reduce((a, d) => a + d.x, 0) / (doors.length || 1) + 0.5) * 48, ty = g.room.y + (doors.reduce((a, d) => a + d.y, 0) / (doors.length || 1) + 0.5) * 48;
        const ok = go(inRoom(n), g.room, { heur: (h) => Math.hypot(h.x - tx, h.y - ty) });
        if (verbose) log(g.room.id, "->", n, ok);
        if (ok) { entry = g.room.id + "|" + groupOf(g.room, g.H); }
        if (!ok) { const r = g.room; if (!go(leftRoom(r), r)) { log("stuck in", r.id, "going to", n, "at", g.H.x - r.x, g.H.y - r.y); warpHome(); } }
    }
    return false;
}
function rinse() {
    const g = G(), e = g.room.ents.find((q) => q.kind === "sink");
    if (!e || (g.sv.sinks.includes(e.key) && g.sv.hp >= g.sv.maxHp * 0.6)) return;
    if (!go((h) => Math.abs(h.x - e.x) < 16 && Math.abs(h.y + 8 - e.y) < 10 && h.grounded, g.room, { maxF: 700 })) return;
    setKeys(new Set()); step(3); setKeys(new Set(["fire"])); step(3); setKeys(new Set()); step(10);
    if (game.data.mode === "sink") { game.dbg.setMode("play"); game.touch.enabled = true; for (const q of [...game.current.entities]) if (q.layer === 100) q.destroy(); }
}
const tried = new Set();
function grabItems() {
    const g = G(), room = g.room;
    if (g.boss) return;
    for (const e of room.ents) {
        const secret = (e.kind === "crown" || e.kind === "bit" || e.kind === "baby") && !g.sv.taken[e.key];
        const patient = thorough && e.kind === "npc" && !g.sv.talked[e.npc];
        if (!secret && !patient) continue;
        const tag = e.key + ":" + g.sv.abil;
        if (tried.has(tag)) continue;
        tried.add(tag);
        const ok = go((h) => Math.abs(h.x - e.x) < 12 && Math.abs(h.y - e.y + 10) < (patient ? 12 : 16) && (!patient || h.grounded), room, { maxF: 900, cap: 30000, heur: (h) => Math.hypot(h.x - e.x, h.y - e.y) });
        if (ok && patient) { setKeys(new Set()); step(3); setKeys(new Set(["fire"])); step(3); setKeys(new Set()); for (let i = 0; i < 900 && game.data.mode === "talk"; i++) step(); setKeys(new Set()); step(2); }
        waitPlay();
        if (g.room !== room) return;
    }
}
function warpHome() { setKeys(new Set()); game.dbg.H.hazard = 0; const sv = G().sv; const e = sv.sink ?? null; if (e) G().warpTo(e.x, e.y - 8); }

// Break cracks and tartar in the room we're in.
function openCracks() {
    const g = G(), room = g.room, T = W().T;
    for (let guard = 0; guard < 6; guard++) {
        let target = null;
        for (let r = room.r0; r < room.r0 + room.nrows && !target; r++) for (let c = room.c0; c < room.c0 + room.cols; c++) {
            const t = T[r * W().cols + c];
            if ((t === CRACK && (g.sv.abil & A.DRILL)) || (t === HARD && (g.sv.abil & A.BURR))) { target = [c, r, t]; break; }
        }
        if (!target) return;
        const [c, r] = target, spots = [];
        for (let r2 = room.r0; r2 < room.r0 + room.nrows; r2++) for (let c2 = room.c0; c2 < room.c0 + room.cols; c2++) if (T[r2 * W().cols + c2] === target[2]) spots.push([(c2 + 0.5) * TILE, (r2 + 0.5) * TILE]);
        const ok = go((h) => h.grounded && spots.some(([x, y]) => Math.abs(h.x - x) < 42 && Math.abs(h.y - y) < 30), room, { maxF: 500, cap: 20000 });
        if (!ok) return;
        const H = g.H, kind = target[2];
        for (let i = 0; i < 110 && inPlay(); i++) {
            let best = null, bd = 1e9;
            for (let r2 = room.r0; r2 < room.r0 + room.nrows; r2++) for (let c2 = room.c0; c2 < room.c0 + room.cols; c2++) if (T[r2 * W().cols + c2] === kind) { const q = Math.hypot((c2 + 0.5) * TILE - H.x, (r2 + 0.5) * TILE - H.y); if (q < bd) { bd = q; best = [c2, r2]; } }
            if (!best || bd > 90) break;
            const k = new Set(), dx = (best[0] + 0.5) * TILE - H.x, dy = (best[1] + 0.5) * TILE - H.y;
            if (Math.abs(dy) > Math.abs(dx) + 4) { if (dy < 0) k.add("up"); else k.add("down"); } else k.add(dx > 0 ? "right" : "left");
            if (i % 16 < 3) k.add("fire");
            setKeys(k); step();
        }
    }
}

// --- Boss: every 6 frames try a handful of moves against predicted threats, then take the safest that keeps us in range.
const bv = { x: 0, y: 0, px: 0, py: 0 };
let noise = 0.3;
function threat(h, g, f) {
    let d = 0;
    const b = g.boss;
    for (const s of g.shots) { const x = s.x + s.vx * f / 60, y = s.y + s.vy * f / 60 + s.g * f * f / 7200, hh = s.kind === "wave" ? s.h : s.r; if (Math.abs(x - h.x) < s.r + 9 && Math.abs(y - h.y) < hh + 12) d += 10; }
    for (const c of g.cols) { const t = c.t - f; if (t < 8 && t > -18 && Math.abs(c.x - h.x) < c.w / 2 + 8 && h.y > c.y0) d += 10; }
    if (b && !b.ghost && !b.dazed) { const dx = Math.abs(b.x + bv.x * f - h.x), dy = Math.abs(b.y + bv.y * f - h.y); if (dx < b.w / 2 + 8 && dy < b.h / 2 + 10) d += 8; if (b.frame === 1 && dx < b.w / 2 + 20) d += 2; }
    return d;
}
function fightBoss() {
    const g = G(), H = g.H, room = g.room;
    const opts = [{ dir: 0 }, { dir: 1 }, { dir: -1 }, { dir: 1, jump: 1 }, { dir: -1, jump: 1 }, { dir: 0, jump: 1 }, { dir: 0, down: 1 }];
    if (g.sv.abil & A.DASH) opts.push({ dir: 1, dash: 1 }, { dir: -1, dash: 1 });
    let keep = opts[0], keepF = 0, n = 0, jheld = false;
    const hard = args.includes("--hard");
    while (g.boss && inPlay() && n < 60 * 240) {
        n++;
        bv.x = g.boss.x - bv.px; bv.y = g.boss.y - bv.py; bv.px = g.boss.x; bv.py = g.boss.y;
        if (keepF <= 0) {
            let best = opts[0], bs = Infinity;
            const b = g.boss;
            for (const o of opts) {
                if (o.dash && (H.dashCd > 0 || !H.dashOk)) continue;
                const h = { ...H }, inp = { dir: o.dir, up: false, down: !!o.down, jump: !!o.jump, jumpP: false, dashP: false, toolP: false, tool: false };
                let score = 0, pj = held.has("jump");
                for (let f = 1; f <= 24; f += 1) {
                    inp.jumpP = inp.jump && !pj; pj = inp.jump; inp.dashP = !!o.dash && f === 1;
                    stepHero(h, inp, W(), g.sv.abil);
                    if (h.hazard) { score += 40; break; }
                    score += threat(h, g, f) * (1.4 - f / 40);
                }
                const dist = Math.abs(h.x - b.x) - b.w / 2 - 14, vert = Math.abs(h.y - b.y) - b.h / 2;
                if (b.dazed) score += Math.abs(dist) * 0.2 + Math.max(0, vert) * 0.08;
                else score += Math.max(0, 95 - Math.abs(h.x - b.x)) * 0.05 - (b.floorY - h.y) * 0.035;
                score += (o.jump ? 0.3 : 0) + Math.random() * noise;
                if (score < bs) { bs = score; best = o; }
            }
            keep = best; keepF = 8;
        }
        keepF--;
        const k = new Set();
        if (keep.dir > 0) k.add("right"); if (keep.dir < 0) k.add("left");
        if (keep.jump) k.add("jump"); if (keep.down) k.add("down");
        if (keep.dash && keepF === 7) k.add("dash");
        const b = g.boss;
        if (b && Math.abs(b.y - H.y) < b.h / 2 + 14 && Math.abs(b.x - H.x) < b.w / 2 + 28) {
            if (Math.sign(b.x - H.x) !== H.face && keep.dir === 0) k.add(b.x > H.x ? "right" : "left");
            if (n % 14 < 2) k.add("fire");
        } else if (b && H.y < b.y - b.h / 2 && Math.abs(b.x - H.x) < b.w / 2 + 8 && !H.grounded) { k.add("down"); if (n % 14 < 2) k.add("fire"); }
        else if (b && H.y > b.y + b.h / 2 && Math.abs(b.x - H.x) < b.w / 2 + 8) { k.add("up"); if (n % 14 < 2) k.add("fire"); }
        const hp0 = g.sv.hp;
        setKeys(k); step();
        if (verbose && g.sv.hp < hp0 && g.boss) console.log(" hit t", n, "boss", (g.boss.x - H.x) | 0, (g.boss.y - H.y) | 0, "bv", bv.x.toFixed(1), bv.y.toFixed(1), "dazed", g.boss.dazed, "f", g.boss.frame, "shots", g.shots.map((q) => q.kind[0] + ((q.x - H.x) | 0) + "," + ((q.y - H.y) | 0)).slice(0, 4).join(" "), "cols", g.cols.filter((c) => Math.abs(c.x - H.x) < 30).map((c) => c.t).join(), "keep", JSON.stringify(keep), "gr", H.grounded);
    }
    setKeys(new Set());
    return !g.boss;
}

function beatBoss(room, stage) {
    const g = G(), info = room;
    const before = g.sv.deaths;
    const t0 = g.sv.time;
    for (let tries = 0; tries < 40; tries++) {
        noise = 0.3 + (tries % 6) * 0.5;
        waitPlay();
        if (!travel(stage, room)) return false;
        const r = g.room;
        go((h) => g.boss || (h.x > r.x + 100 && h.x < r.x + r.w - 100 && h.grounded), r, { maxF: 600 });
        const beaten = () => !!g.sv.flags[BOSS_INFO[W().byId[room].opts.boss].flag];
        for (let i = 0; i < 240 && !g.boss && !beaten(); i++) { setKeys(new Set(i % 80 < 40 ? ["right"] : ["left"])); step(); }
        if (beaten()) return true;
        if (!g.boss) { log("boss did not start", room, g.room.id, g.H.x - g.room.x, g.H.y - g.room.y, game.data.mode); continue; }
        const hp0 = g.boss.hp;
        fightBoss();
        if (!g.boss || g.boss.hp <= 0) {
            for (let i = 0; i < 400 && game.currentName === "play" && game.data.mode !== "play"; i++) step();
            log(`BOSS down in ${room}: ${tries} deaths, ${((g.sv.time - t0) / 60).toFixed(1)} min`);
            return true;
        }
        log(`boss ${room} try ${tries}: boss hp ${g.boss?.hp ?? "?"} / ${hp0}`);
        for (let i = 0; i < 200 && game.data.mode !== "play"; i++) step();
    }
    return false;
}
function collectDrop() {
    const g = G();
    for (let i = 0; i < 60 && g.drop; i++) step();
    if (g.drop) return false;
    return true;
}
function getDrop() {
    const g = G();
    setKeys(new Set()); for (let i = 0; i < 200 && g.drop; i++) step(); for (let i = 0; i < 60; i++) step(); waitPlay();
}

function solveBeam() {
    const g = G(), room = g.room, e = room.ents.find((q) => q.kind === "emitter"), R = room.ents.find((q) => q.kind === "receptor");
    if (!e || !R || g.sv.opened.includes(room.id)) return;
    const y = e.y + 14;
    if (!go((h) => Math.abs(h.x - R.x) < 7 && Math.abs(h.y - y) < 11 && h.grounded, room, { maxF: 900 })) { log("beam spot fail"); return; }
    setKeys(new Set()); step(10); setKeys(new Set(["tool"])); step(80); setKeys(new Set()); step(4);
    log("beam door", g.sv.opened.includes(room.id) ? "open" : "NOT open");
}

// --- The run.
const STAGES = report;
const ents = (id, kind) => W().byId[id].ents.filter((e) => e.kind === kind);
let ok = true;
const t0 = Date.now();
function main() {
    log("start in", G().room.id);
    if (!travel(0, "g03")) return false;
    const p = ents("g03", "pedestal")[0]; go((h) => Math.abs(h.x - p.x) < 16 && Math.abs(h.y - p.y) < 26, G().room);
    step(10); waitPlay();
    log("drill", !!(G().sv.abil & A.DRILL));
    for (let i = 1; i < STAGES.length; i++) {
        const m = STAGES[i];
        if (m.room === "o08") for (let q = 0; q < 12 && !G().sv.opened.includes("t07"); q++) { travel(i, "t07"); solveBeam(); }
        // A sink on the way saves our progress and refills us.
        visitSink(i);
        let won = false;
        for (let k = 0; k < 12 && !won; k++) { won = beatBoss(m.room, i); if (!won) { log("retry route to", m.room); entry = null; waitPlay(); } }
        if (!won) { log("FAILED at", m.name); return false; }
        getDrop();
        log("done:", m.name, "rooms", Object.keys(G().sv.visited).length);
        if (game.currentName !== "play") break;
    }
    for (let i = 0; i < 1200 && game.currentName === "play"; i++) step();
    return game.currentName === "ending";
}
function visitSink(stage) {
    const g = G();
    const here = g.room.ents.find((e) => e.kind === "sink");
    let target = here;
    if (!target) { const near = W().rooms.filter((r) => r.ents.some((e) => e.kind === "sink") && report[Math.min(stage, report.length - 1)].reached.includes(r.id)).sort((a, b) => Math.hypot(a.gx - g.room.gx, a.gy - g.room.gy) - Math.hypot(b.gx - g.room.gx, b.gy - g.room.gy))[0]; if (!near) return; if (!travel(stage, near.id)) return; target = near.ents.find((e) => e.kind === "sink"); }
    if (!go((h) => Math.abs(h.x - target.x) < 16 && Math.abs(h.y + 8 - target.y) < 10 && h.grounded, g.room, { maxF: 700 })) return;
    setKeys(new Set()); step(3); setKeys(new Set(["fire"])); step(3); setKeys(new Set()); step(10);
    if (game.data.mode === "sink") { const b = game.current.entities.find((e) => e.text === "Stay here" || e.label === "Stay here"); game.dbg.setMode("play"); game.touch.enabled = true; for (const e of [...game.current.entities]) if (e.layer === 100) e.destroy(); }
}
if (args.includes("--bosses")) {
    // Fight each boss alone, several times, at the health and tools a player would have by then.
    const list = [["g10", 1, 5], ["e08", 1, 6], ["s09", 3, 7], ["t09", 7, 8], ["w09", 15, 9], ["n07", 31, 10], ["o08", 63, 11], ["h06", 127, 12], ["u09", 255, 13], ["p07", 511, 14]];
    const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
    for (const [rid, abil, hp] of list) {
        if (only && only !== rid) continue;
        let wins = 0, tot = 0, hpLeft = 0, secs = 0, bossLeft = 0;
        for (let run = 0; run < 4; run++) {
            game.data.sv = undefined; for (let q = 0; q < run * 5; q++) game.step(1);
            game.go("play", { room: rid, abil, hp, at: [3, 4.6], flags: {} }); game.step(3);
            const g = G(), r = g.room;
            for (let i = 0; i < 400 && !g.boss; i++) { setKeys(new Set([i % 40 < 20 ? "right" : "left"])); step(); }
            setKeys(new Set());
            if (!g.boss) { console.log(rid, "boss did not start", g.H.x - r.x, g.H.y - r.y); break; }
            const f0 = frames; fightBoss(); tot++;
            const won = g.boss && g.boss.hp <= 0 || !g.boss;
            if (won && g.sv.hp > 0) { wins++; hpLeft += g.sv.hp; } else bossLeft += (g.boss?.hp ?? 0) / (g.boss?.max ?? 1);
            secs += (frames - f0) / 60;
            for (let i = 0; i < 60; i++) step();
        }
        console.log(rid, `wins ${wins}/${tot}, avg hp left ${(hpLeft / (wins || 1)).toFixed(1)}/${hp}, avg ${(secs / tot).toFixed(0)}s, boss left on loss ${(bossLeft / ((tot - wins) || 1)).toFixed(2)}`);
    }
    process.exit(0);
}
if (args.includes("--final")) {
    game.data.sv = undefined;
    const flags = {}; for (let i = 1; i <= 9; i++) flags["b" + i] = 1;
    game.go("play", { room: "u09", abil: 511, flags, hp: 14 }); game.step(3);
    G().sv.opened.push("t07");
    game.data.G = G(); 
    main2();
    process.exit(0);
}
function main2() {
    const i = STAGES.length - 1;
    log("final leg from", G().room.id);
    const won = beatBoss("p07", i);
    log("ache", won, game.currentName);
    for (let k = 0; k < 1500 && game.currentName === "play"; k++) step();
    console.log(JSON.stringify({ scene: game.currentName, won: G().sv.won }));
}
try { ok = main(); } catch (e) { console.log(e); ok = false; }
const sv = G().sv;
console.log(JSON.stringify({ ok, scene: game.currentName, gameMin: +(sv.time / 60).toFixed(1), deaths: sv.deaths, rooms: Object.keys(sv.visited).length, abil: sv.abil, flags: Object.keys(sv.flags), wallSec: (Date.now() - t0) / 1000, haptics: game.state().haptics?.length }));
process.exit(ok ? 0 : 1);
