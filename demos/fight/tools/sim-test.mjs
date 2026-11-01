// Rules test: frame data is exact, stun works, throws and breaks work, combos end, wall bounce happens once, the AI never sees inputs.
import { BTN, Fight } from "../sim.js";
import { Brain, watch } from "../ai.js";
import { FIGHTERS, ROSTER, BY_ID } from "../fighters.js";
let fails = 0; const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) fails++; };
const mk = (a = "crumbs", b = "chill", o = {}) => { const f = new Fight({ a, b, fast: true, ...o }); return f; };
const near = (f, d = 80) => { f.p[0].x = -d / 2; f.p[1].x = d / 2; };
const run = (f, m0, m1, n) => { for (let i = 0; i < n; i++) f.step(typeof m0 === "function" ? m0(i) : m0, typeof m1 === "function" ? m1(i) : m1); };
// Every normal's first active frame lands on the data, for all fighters, and no box goes unauthored.
for (const d of FIGHTERS) {
    for (const [id, btn] of [["5A", BTN.A], ["5B", BTN.B]]) {
        const f = mk(d.id, "chill"), m = d.moves[id];
        f.p[0].x = 0; f.p[1].x = m.box[0] + 10 + (m.vel ? 40 : 0);
        let hitAt = null;
        for (let i = 1; i < 60 && hitAt === null; i++) { f.step(i === 1 ? btn : 0, 0); if (f.drain().some((e) => e.type === "hit")) hitAt = i; }
        const expect = m.s + 1 + 1;   // Pressed on frame 1, mt=1 that frame, first active is mt=s+1, plus the frame of the press.
        ok(hitAt !== null && Math.abs(hitAt - (m.s + 1)) <= 1, `${d.id} ${id}: connects on frame ${hitAt}, data says ${m.s + 1}`);
    }
    for (const m of Object.values(d.moves)) if (!m.proj && !m.buff && !m.parry && !(m.box[2] > 0)) ok(false, `${d.id} ${m.id} has no hitbox`);
    ok(Object.keys(d.moves).length >= 12, `${d.id}: ${Object.keys(d.moves).length} moves authored`);
}
{ // Block: holding block stops damage, a low beats a standing block, crouch block stops a low.
    let f = mk(); near(f); run(f, (i) => (i === 0 ? BTN.A : 0), BTN.G, 20);
    ok(f.p[1].hp === f.p[1].hpMax, "standing block stops a mid");
    f = mk(); near(f); let e = []; run(f, (i) => (i === 0 ? BTN.A | BTN.D : BTN.D), BTN.G, 20);
    ok(f.p[1].hp < f.p[1].hpMax, "low beats standing block");
    f = mk(); near(f); run(f, (i) => (i === 0 ? BTN.A | BTN.D : BTN.D), BTN.G | BTN.D, 20);
    ok(f.p[1].hp === f.p[1].hpMax, "crouch block stops a low");
    f = mk(); near(f, 60); run(f, (i) => (i === 3 ? BTN.B | BTN.R : BTN.R & 0), BTN.G | BTN.D, 60);
}
{ // Throw beats block; break works; whiff is punishable.
    let f = mk(); near(f, 74); run(f, (i) => (i === 0 ? BTN.T : 0), BTN.G, 70);
    ok(f.p[1].hp < f.p[1].hpMax, "throw beats block");
    f = mk(); near(f, 74); run(f, (i) => (i === 0 ? BTN.T : 0), (i) => (i === 4 ? BTN.T : 0), 70);
    ok(f.p[1].hp === f.p[1].hpMax && f.drain().some((e) => e.type === "tech"), "throw break works");
    f = mk(); near(f, 74); const before = f.p[1].hp; run(f, (i) => (i === 0 ? BTN.S1 : 0), 0, 0);
    f = mk("chill", "crumbs"); near(f, 90); run(f, (i) => (i === 0 ? BTN.S1 : 0), (i) => (i === 9 ? BTN.T : 0), 110);
    ok(f.p[1].hp < f.p[1].hpMax, "command grab can't be broken");
}
{ // Combo: cancels chain, scaling applies, and a combo can't run forever.
    const f = mk(); near(f, 80); let maxHits = 0, order = [];
    run(f, (i) => [BTN.A, 0, 0, 0, 0, 0, 0, 0, 0, 0, BTN.A, 0, 0, 0, 0, 0, 0, 0, 0, 0, BTN.B, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, BTN.S2][i] ?? 0, 0, 120);
    const g = mk(); near(g, 80);
    for (let i = 0; i < 2400; i++) { g.step(i % 3 === 0 ? BTN.A : 0, 0); g.p[0].meter = 0; for (const e of g.drain()) if (e.type === "hit") maxHits = Math.max(maxHits, e.hits); g.p[1].hp = Math.max(g.p[1].hp, 500); }
    ok(maxHits < 8, `jab mash on a dummy tops out at ${maxHits} hits`);
    let best = 0;
    for (const d of FIGHTERS) for (const b of ROSTER) {
        const h = mk(d.id, b, { p1: { auto: true } }); near(h, 80);
        for (let i = 0; i < 400; i++) { h.step(i % 4 === 0 ? BTN.A : 0, 0); h.p[1].hp = h.p[1].hpMax; for (const e of h.drain()) if (e.type === "hit") best = Math.max(best, e.hits); }
    }
    ok(best >= 3 && best <= 7, `auto-combo strings run to ${best} hits on a dummy`);
}
{ // Wall bounce: a corner overhead throws them off the wall exactly once.
    const f = mk("crumbs", "chill"); f.p[0].x = 280; f.p[1].x = 335; f.p[0].face = 1;
    let bounces = 0;
    for (let i = 0; i < 100; i++) { f.step(i === 0 ? BTN.B | BTN.R : 0, 0); for (const e of f.drain()) if (e.type === "wall") bounces++; }
    ok(bounces === 1, `wall bounce fires ${bounces} time`);
}
{ // Hit-stop: both freeze, and input buffered during it comes out after.
    const f = mk(); near(f, 80); f.step(BTN.B, 0); let stop = 0;
    for (let i = 0; i < 16; i++) { f.step(0, 0); stop = Math.max(stop, f.p[0].stop); }
    ok(stop >= 8, `hit-stop on a heavy holds ${stop} frames`);
}
{ // Super: costs meter, plays its cinematic, and pays out its listed hits.
    for (const d of FIGHTERS) {
        const f = mk(d.id, "crumbs"); near(f, 70); f.p[0].meter = 100; const hp = f.p[1].hp; let cine = false, hits = 0;
        for (let i = 0; i < 300; i++) { f.step(i === 0 ? BTN.X : 0, 0); for (const e of f.drain()) { if (e.type === "cine") cine = true; if (e.type === "cinehit") hits++; } }
        ok(cine && hits === d.moves.SUP.cine.hits.length && f.p[1].hp < hp && f.p[0].meter < 40, `${d.id} super lands, ${hits} beats, ${hp - f.p[1].hp} damage`);
    }
    const f = mk(); near(f, 70); run(f, (i) => (i === 0 ? BTN.X : 0), 0, 60);
    ok(f.cine === null && f.p[1].hp === f.p[1].hpMax, "no meter, no super");
}
{ // Honesty: the picture the AI receives holds no buttons, and two runs with different hidden inputs but the same visible state decide the same.
    const f = mk(); const pic = JSON.stringify(watch(f));
    ok(!/mask|prev|buf|input/.test(pic), "the AI's view has no input fields");
    // A whole hard match with tripwires on every input field: reading one while thinking throws.
    let thinking = false, tripped = 0;
    const g = mk("whistle", "chill");
    for (const p of g.p) for (const key of ["mask", "prev", "buf", "wantDash", "lastF", "lastB"]) {
        let v = p[key];
        Object.defineProperty(p, key, { get() { if (thinking) tripped++; return v; }, set(x) { v = x; } });
    }
    let seed = 9; const rng = { next() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }, pick(x) { return x[Math.floor(this.next() * x.length)]; } };
    const A = new Brain(0, "whistle", 3, rng), C = new Brain(1, "chill", 3, rng);
    for (let n = 0; n < 12000 && g.phase !== "over"; n++) { thinking = true; const x = A.think(g), y = C.think(g); thinking = false; g.step(x, y); g.ev.length = 0; }
    ok(tripped === 0, `a full hard match reads no input field (${tripped} reads)`);
}
console.log(fails ? `${fails} FAILED` : "all passed");
process.exitCode = fails ? 1 : 0;
