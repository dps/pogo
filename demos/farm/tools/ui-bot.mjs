// Plays a whole year through the real game: taps on real buttons, drags across real tiles, every dialogue, every scene, to the ending.
// Decisions come from policy.mjs; every action goes through game.input. Usage: node tools/ui-bot.mjs [seed] [device]
import "../game.js";
import * as P from "./policy.mjs";
import * as S from "../sim.js";
import { CROPS, COLS } from "../data.js";
const game = globalThis.__pogo, G = game.moonpatch, seed = +(process.argv[2] ?? 1), device = process.argv[3] ?? "phone";
game.resize(device); game.input.touchMode = device !== "desktop";
const T = 48;
const step = (n = 1) => game.step(n);
const scene = () => game.currentName, ents = () => game.current.entities;
const find = (name) => ents().find((e) => e.alive && e.tappable && e.name === name);
const anyName = (pre) => ents().find((e) => e.alive && e.tappable && e.name?.startsWith(pre));
const log = []; let taps = 0, drags = 0, seenScenes = new Set();
function tapE(e) { const p = e.worldPos(); game.input.tap(p.x, p.y); taps++; step(3); }
function tap(name) { const e = find(name); if (!e) throw new Error(`no button ${name} in ${scene()} day ${st().day}: ${ents().filter((x) => x.tappable).map((x) => x.name)}`); tapE(e); }
const st = () => G.sim;
/** Clears whatever modal is open: dialogue, letters, cards. */
function settle(max = 3000) {
    for (let i = 0; i < max; i++) {
        seenScenes.add(scene());
        const adv = find("advance"), ok = find("ok");
        if (adv) tapE(adv);
        else if (ok) tapE(ok);
        else if (find("backdrop") && find("close")) tap("close");
        else if (game.fading || game.current._fade) step(2);
        else { step(1); if (i > 40) return; }
        if (!adv && !ok && i > 30 && (find("dawn") || find("dusk") || find("cast"))) return;
    }
}
const wait = (n) => { for (let i = 0; i < n; i++) step(1); };
function waitScene(name, max = 900) { for (let i = 0; i < max; i++) { if (scene() === name && !isFading()) { wait(4); return; } const a = find("advance") ?? find("ok"); if (a) tapE(a); else step(1); } throw new Error(`never reached ${name}, in ${scene()}`); }
const isFading = () => false;
function lay() { const dawn = find("dawn"); return { L: game.moonpatchFarm() }; }
function tile(i) { const L = G.farmLayout; return { x: L.farmX + (i % COLS) * T + T / 2, y: L.farmY + Math.floor(i / COLS) * T + T / 2 }; }
/** One drag across a run of tiles, with real pointer moves. */
function sweep(list) {
    if (!list.length) return;
    const I = game.input, a = tile(list[0]);
    I.pointerEvent("down", 5, a.x, a.y); step(1);
    for (const i of list.slice(1)) { const c = tile(i); I.pointerEvent("move", 5, c.x, c.y); step(1); }
    I.pointerEvent("up", 5, tile(list.at(-1)).x, tile(list.at(-1)).y); step(2); drags++;
}
const rows = (filter) => { const out = []; for (let y = 0; y < 7; y++) { let run = []; for (let x = 0; x < 7; x++) { const i = S.idx(x, y); if (filter(i)) run.push(i); else { if (run.length) out.push(run); run = []; } } if (run.length) out.push(run); } return out; };
function selectSeed(id) {
    for (let k = 0; k < 8; k++) { const e = find(`seed:${id}`); if (e) { tapE(e); return true; } const more = find("seed:more"); if (!more) return false; tapE(more); }
    return false;
}
function night() {
    const s = st();
    for (let k = 0, calm = 0; k < 2500 && calm < 50; k++) {
        seenScenes.add(scene());
        const a = find("advance") ?? find("ok");
        if (a) { tapE(a); calm = 0; }
        else if (scene() === "pond" && find("back")) { tap("back"); calm = 0; }
        else { step(1); calm = scene() === "farm" && find("dawn") ? calm + 1 : 0; }
    }
    const dig = P.digTile(s);
    if (dig >= 0) { const c = tile(dig); if (S.verbAt(s, dig) === "water") { game.input.tap(c.x, c.y); step(3); } game.input.tap(c.x, c.y); step(4); if (find("dig")) tap("dig"); else if (find("ok")) tap("ok"); step(3); }
    for (const r of rows((i) => S.verbAt(s, i) === "harvest" && !P.holdHarvest(s, i))) { for (const q of split(r, (i) => true)) sweep(q); settleCards(); }
    for (const r of rows((i) => S.verbAt(s, i) === "till")) { sweep(r); settleCards(); }
    const plan = {}; for (const i of P.ALL) if (S.verbAt(s, i) === "plant") { const id = P.planTile(s, i); if (id) (plan[id] ??= []).push(i); }
    for (const [id, list] of Object.entries(plan)) {
        if (!selectSeed(id)) continue;
        for (const r of rows((i) => list.includes(i))) sweep(r);
    }
    for (const r of rows((i) => S.verbAt(s, i) === "water")) sweep(r);
    settleCards();
    if (process.env.DBG && s.day > 14 && s.day < 30) console.log(s.day, P.targetHybrid(s), P.digTile(s), [2, 3, 4].map((x) => { const t = s.tiles[S.idx(x, 4)]; return t.c ? t.c.id + (t.c.ripe ? "!" : t.c.age) + (t.w ? "w" : "") : t.t ? "gap" : "wild"; }).join(" "), s.selected);
    if (s.day > 1) fish();
    if (S.canFinish(s)) { goPond(); tap("finale"); ending(); return true; }
    if (scene() !== "farm") { tap("back"); waitScene("farm"); }
    for (let k = 0; k < 100 && !find("dawn"); k++) step(1);
    tap("dawn");
    return false;
}
function split(r) { return [r]; }
function settleCards() { for (let k = 0; k < 8; k++) { const a = find("ok"); if (a) tapE(a); step(2); } }
function goPond() { if (scene() === "pond") return; for (let k = 0; k < 200 && !find("pond"); k++) step(1); tap("pond"); waitScene("pond"); for (let k = 0; k < 900; k++) { const a = find("advance") ?? find("ok"); if (a) tapE(a); else { step(1); if (find("back") && k > 8) break; } } }
function fish() {
    const s = st(), want = S.duchessDue(s);
    if (!want && s.stats.fish >= 40 && s.day % 3 && S.stock(s, "silverperch")) return;
    goPond();
    const lake = { x: game.view.width * 0.3, y: game.view.height * 0.55 };
    for (let guard = 0; guard < 8 && s.casts > 0; guard++) {
        game.input.tap(lake.x, lake.y); step(2);
        let done = false;
        for (let k = 0; k < 900 && !done; k++) {
            const P0 = G.pondState?.();
            if (!P0) { step(1); continue; }
            if (P0.mode === "bite") { game.input.tap(lake.x, lake.y); step(2); }
            else if (P0.mode === "reel") {
                game.input.pointerEvent("down", 6, P0.fish.x, P0.fish.y); step(1);
                for (let j = 0; j < 500 && G.pondState().mode === "reel"; j++) { const f = G.pondState().fish; game.input.pointerEvent("move", 6, f.x, f.y); step(1); }
                game.input.pointerEvent("up", 6, 10, 10); step(2); done = true;
            } else if (P0.mode === "idle") { done = true; } else step(1);
        }
        settleCards();
    }
    tap("back"); waitScene("farm");
}
function ending() {
    for (let k = 0; k < 9000 && scene() !== "ending"; k++) { const a = find("advance"); if (a) tapE(a); else step(1); }
    wait(60); log.push(`ending reached on day ${st().day}`);
    tap("continue"); waitScene("farm");
}
function day() {
    const s = st();
    waitScene("market"); wait(40); settleCards();
    for (let k = 0; k < 60; k++) { const a = find("ok"); if (a) tapE(a); step(1); }
    const c = P.cookChoice(s);
    if (c) { tap("kitchen"); waitScene("kitchen"); for (const k of c) { for (let q = 0; q < 4 && !find(`drop:${k}`); q++) { if (find("more")) tap("more"); } tap(`drop:${k}`); wait(25); }
        tap("stir"); wait(10); for (let k = 0; k < 30; k++) { const a = find("ok"); if (a) { tapE(a); break; } step(1); } tap("back"); waitScene("market"); }
    s.orders.forEach((o, i) => { const b = find(`serve:${i}`); if (b && S.stock(s, o.item)) tapE(b); });
    wait(50);
    for (const o of [...s.orders]) {
        tap(`ghost:${o.g}`);
        for (let n = 0; n < 8 && find("listen"); n++) { tap("listen"); for (let k = 0; k < 400 && !find("close"); k++) { const a = find("advance"); if (a) tapE(a); else step(1); } }
        if (find("favour")) { tap("favour"); for (let k = 0; k < 60; k++) { const a = find("ok"); if (a) { tapE(a); break; } step(1); } for (let k = 0; k < 40; k++) { const a = find("ok"); if (a) tapE(a); step(1); } }
        if (find("gift")) { const g = P.giftFor(s, o.g); if (g) { tap("gift"); if (find(`gift:${g}`)) tap(`gift:${g}`); } }
        if (find("close")) tap("close"); else settleCards();
        settleCards();
    }
    if (find("sell") && Object.keys(s.inv).length) tap("sell");
    wait(30);
    const list = P.shopping(s);
    if (list.length) { tap("build"); for (const b of list) { for (let q = 0; q < 5 && !find(`buy:${b}`); q++) { if (find("next")) tap("next"); else break; } if (find(`buy:${b}`)) tap(`buy:${b}`); for (let q = 0; q < 5 && find("prev") && !find("prev")._off; q++) { break; } } if (find("close")) tap("close"); }
    wait(5);
    tap("dusk");
}
G.fresh(seed);
game.go("farm");
step(5);
let days = 0;
for (; days < 96; days++) {
    const d0 = st().day;
    const ended = night();
    if (ended) { log.push(`day ${st().day}: lantern lit`); break; }
    day();
    if (st().day === d0) throw new Error("day did not advance");
    if (d0 % 8 === 0) console.log(`day ${d0} ${scene()} pennies ${st().pennies} keep ${st().keepsakes.length} found ${st().found.length} L${st().lantern} letter ${st().letter} taps ${taps} drags ${drags}`);
}
const s = st();
console.log(log.join("\n"));
console.log(`keep ${s.keepsakes} duchess ${!!s.dex.fish.duchess} bone ${s.boneFound} rec ${s.recipes} inv ${Object.keys(s.inv)}`);
console.log(`scenes ${[...seenScenes]}, taps ${taps}, drags ${drags}, steps ${game.stepCount}, ended ${s.ended}, errors ${game.errors.length}`);
const h = game.state().haptics; console.log("recent haptics", JSON.stringify(h).slice(0, 120));
process.exit(s.ended && !game.errors.length ? 0 : 1);
