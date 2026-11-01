// Exercises every verb on the real Sim, one small staged scene at a time.
import { Sim } from "../sim.js";
import { HEISTS } from "../levels.js";
import { T } from "../world.js";
const byId = (id) => HEISTS.find((h) => h.id === id);
let fails = 0;
const ok = (c, msg) => { console.log(`${c ? "ok  " : "FAIL"} ${msg}`); if (!c) fails++; };
const run = (s, n, inp = {}) => { for (let i = 0; i < n && s.status === "play"; i++) s.step(typeof inp === "function" ? inp(i) : inp); };
const put = (s, c, r, mode = "ground", z = 0) => { Object.assign(s.cat, { x: (c + 0.5) * T, y: (r + 0.5) * T, mode, z }); };

{   // Slow tip, then a smash, then a guard walks over, looks around and gives up.
    const s = new Sim(byId("m1")); const it = s.items[0];
    put(s, 9, 11); s.guards[0].route[0].wait = 0; s.guards[0].x = 8.5 * T; s.guards[0].y = 13.5 * T; s.guards[0].wait = 0;
    s.cat.x = it.x - 28; s.cat.y = it.y - 8;
    ok(s.context()?.type === "knock", "knock offered beside a table vase");
    run(s, 1, { act: true }); ok(it.state === "tipping", "tap starts the tip");
    run(s, 55); ok(it.state === "tipping", "still teetering 0.9s later");
    run(s, 40); ok(it.state === "broken" && s.stats.smashed === 1, "it falls and smashes");
    ok(s.stats.heard > 0 && s.guards[0].state !== "patrol", `guard heard it (${s.guards[0].state})`);
    const seen = new Set(); run(s, 2400, (i) => { seen.add(s.guards[0].state); Object.assign(s.cat, { x: 6.5 * T, y: 17.5 * T }); return {}; });
    ok(["curious", "investigate", "search", "giveup", "patrol"].every((k) => seen.has(k) || k === "curious"), `suspicion arc: ${[...seen].join(" > ")}`);
    ok(s.guards[0].state === "patrol" && s.guards[0].s === 0, "gave up and went back on patrol");
}
{   // Suspicion rises gradually, faster in the light.
    const lit = new Sim(byId("m2")), dark = new Sim(byId("m2"));
    const g0 = lit.guards[0], g1 = dark.guards[0];
    for (const [s, g] of [[lit, g0], [dark, g1]]) { s.guards.splice(1); g.route = []; g.path = []; g.x = 2.5 * T; g.y = 16.5 * T; g.dir = g.want = 0; g.sway = 0; }
    Object.assign(lit.cat, { x: 7 * T, y: 16.5 * T }); Object.assign(dark.cat, { x: 7 * T, y: 16.5 * T });
    lit.catLight = () => 1; dark.catLight = () => 0.05;
    run(lit, 20); run(dark, 20);
    ok(g0.s > g1.s * 3 && g0.s < 0.6, `20 steps in view: lit ${g0.s.toFixed(3)} vs dark ${g1.s.toFixed(3)}`);
    run(lit, 240); ok(g0.state === "chase" || g0.state === "investigate", `lit cat gets chased (${g0.state})`);
}
{   // Vents, leaps, boxes.
    const s = new Sim(byId("m3")); s.guards.length = 0;
    put(s, 2, 14); ok(s.context()?.type === "vent", "vent offered");
    run(s, 1, { act: true }); ok(s.cat.mode === "vent", "squeezed in"); run(s, 150); ok(s.cat.mode === "ground" && Math.abs(s.cat.x - 13.5 * T) < 2 && Math.abs(s.cat.y - 7.5 * T) < 2, "came out the far end");
    put(s, 8, 15, "ground"); s.cat.x = s.boxes[1].x + 10; s.cat.y = s.boxes[1].y; ok(s.context()?.type === "box", "box offered");
    run(s, 1, { act: true }); ok(s.cat.mode === "box", "in the box"); run(s, 30, { mx: 1, my: 0 }); ok(s.boxes[1].x > (8.5 * T), "box shuffles along with him");
    run(s, 1, { act: true }); ok(s.cat.mode === "ground", "out again");
    const m = new Sim(byId("m2")); m.guards.length = 0; put(m, 8, 16);
    run(m, 40, { mx: 0, my: -0.7 }); run(m, 40); ok(m.cat.mode === "perch" && m.cat.z === 2, `pushed into a shelf, leapt up (${m.cat.mode})`);
    run(m, 60, { mx: 0, my: 0.7 }); run(m, 30); ok(m.cat.mode === "ground", "pushed off the edge, hopped down");
}
{   // Dogs and legs.
    const s = new Sim(byId("t2")); const sarge = s.guards[0], dog = s.guards[1];
    s.guards[2].route = []; run(s, 120);
    s.cat.x = sarge.x - Math.cos(sarge.dir) * 24; s.cat.y = sarge.y - Math.sin(sarge.dir) * 24;
    const ctx = s.context(); ok(ctx?.type === "rub", `rub offered behind ${ctx?.g === 0 ? "the sergeant" : "the dog"}`);
        const c2 = { type: "rub", g: 0 }; s.context = () => c2; run(s, 1, { act: true }); delete s.context; run(s, 70);
    ok(sarge.state === "aww" && dog.state === "calm", `rubbing the guard's legs calmed his dog (${sarge.state}, ${dog.state})`);
    const t = new Sim(byId("t1")), d = t.guards[0]; run(t, 60);
    t.cat.x = d.x + 40; t.cat.y = d.y; run(t, 30); ok(d.growl > 0, "dog smells you"); t.cat.x = d.x + 20; t.cat.y = d.y;
    ok(t.context()?.type === "rub", "rub offered on the dog"); run(t, 1, { act: true }); run(t, 70); ok(d.state === "calm" && t.stats.dogs === 1, "rubbed dog flops over");
    const b = new Sim(byId("t1")), e = b.guards[0]; run(b, 60); b.cat.x = e.x + 40; b.cat.y = e.y; run(b, 130, () => { b.cat.x = e.x + 40; b.cat.y = e.y; return {}; }); ok(e.state === "bark" || e.state === "chase", `ignored dog barks (${e.state})`);
}
{   // Lamp, yarn, flat box, ninth life.
    const s = new Sim(byId("h3")); s.guards.length = 0; const it = s.items.find((i) => i.kind === "lamp"); const before = s.catLight();
    Object.assign(s.cat, { x: it.x + 30, y: it.y }); const near = s.catLight(); void before;
    s.tip(it); run(s, 90); ok(it.state === "broken" && s.snuffed[it.lamp] === 1 && s.catLight() < near, `lamp smashed, room dims (${near.toFixed(2)} > ${s.catLight().toFixed(2)})`);
    const y = new Sim(byId("m1"), { perks: { yarn: true, flatbox: true, lives: true } }); put(y, 3, 7); y.guards[0].route = [];
    ok(y.context()?.type === "yarn", "yarn offered in the open"); run(y, 1, { act: true }); run(y, 100); ok(y.yarn?.done && y.stats.heard >= 0, "yarn rolled and stopped");
    ok(y.context()?.type === "flatbox", "flat box next"); run(y, 1, { act: true }); ok(y.cat.mode === "box", "unfolded and sat in it");
    run(y, 1, { act: true }); const g = y.guards[0]; y.grab(g); ok(y.status === "play" && y.stats.escapes === 1, "ninth life wriggles free"); y.grab(g); ok(y.status === "caught", "second grab sticks");
}
{   // Lasers and creaky boards.
    const s = new Sim(byId("b1")); s.guards.length = 0; const l = s.lasers[1]; l.off = 0; put(s, 8, 12); run(s, 3); ok(s.stats.lasers >= 1, "walking through a laser trips it");
    const h = new Sim(byId("h1")); h.guards.length = 0; put(h, 3, 8); run(h, 60, { mx: 0, my: 0.7 }); ok(h.stats.noisy > 0, "creaky board creaks at a slink");
}
{   // Replay trace is there, and clone is independent.
    const s = new Sim(byId("m1")); run(s, 300); const c = s.clone(); run(c, 100); ok(s.step_ === 300 && c.step_ === 400 && s.rec.cat.length === 75, "clones run independently; replay records 5 fps");
}
console.log(fails ? `${fails} FAILED` : "ALL VERBS OK");
process.exit(fails ? 1 : 0);
