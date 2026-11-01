// Phone controls under simulated human hands. Sloppy strokes drawn from how thumbs really move: wobble, drift, a
// downward tail at the end of a drag, tremor while resting. Measures what the recogniser turns them into.
import { Gestures } from "../gestures.js";
import { mulberry } from "../engine.js";
const rand = mulberry(77), gauss = () => (rand() + rand() + rand() + rand() - 2) * 1.2;
function run(stroke, opts = {}) {
    const out = [], g = new Gestures((n, a) => out.push([n, a]));
    g.scale(opts.cell ?? 23);
    const pts = stroke(), fps = opts.fps ?? 60;
    pts.forEach((p, i) => { g.push(i ? "move" : "down", 1, p[0], p[1], i); if (i % Math.round(60 / fps) === 0) g.update(); });
    const l = pts[pts.length - 1];
    g.push("up", 1, l[0], l[1], pts.length);
    g.update();
    return out;
}
const count = (o, n) => o.filter((e) => e[0] === n).length;
// A horizontal drag of `cells` cells at human speed, with vertical drift and an optional tail as the thumb lifts.
function drag(cells, tail) {
    return () => {
        const dir = rand() < 0.5 ? 1 : -1, dist = cells * 21 + rand() * 8, steps = 8 + Math.floor(cells * (3 + rand() * 8)), pts = [];
        let x = 180, y = 300; const drift = gauss() * 0.5;
        for (let i = 0; i <= steps; i++) { const k = i / steps; pts.push([x + dir * dist * (k * k * (3 - 2 * k)) + gauss() * 0.7, y + drift * i + gauss() * 0.7]); }
        const [lx, ly] = pts[pts.length - 1];
        if (tail) { const v = 2 + rand() * tail; for (let i = 1; i <= 5; i++) pts.push([lx + dir * i * 1.5, ly + i * v]); }
        return pts;
    };
}
const tap = () => { const n = 2 + Math.floor(rand() * 9), pts = []; for (let i = 0; i < n; i++) pts.push([100 + 160 + gauss() * 2, 300 + gauss() * 2]); return pts; };
const rest = () => { const n = 40 + Math.floor(rand() * 80), pts = []; let x = 200, y = 300; for (let i = 0; i < n; i++) { x += gauss() * 0.5; y += gauss() * 0.5; pts.push([x, y]); } return pts; };
const slowPull = () => { const n = 20 + Math.floor(rand() * 40), speed = 1 + rand() * 4, pts = []; for (let i = 0; i < n; i++) pts.push([200 + gauss(), 200 + i * speed + gauss()]); return pts; };
const flick = () => { const speed = 9 + rand() * 12, n = 5 + Math.floor(rand() * 6), slope = gauss() * 0.2, pts = [[200, 200], [200, 201]]; for (let i = 1; i <= n; i++) pts.push([200 + slope * i * speed, 201 + i * speed]); return pts; };
const dragThenFlick = () => { const a = drag(3, 0)(), [lx, ly] = a[a.length - 1], pts = a.slice(); for (let i = 0; i < 10; i++) pts.push([lx + gauss() * 0.5, ly + gauss() * 0.5]); const v = 9 + rand() * 8; for (let i = 1; i <= 7; i++) pts.push([lx, ly + i * v]); return pts; };
const flickUp = () => { const speed = 9 + rand() * 12, pts = [[200, 400], [200, 399]]; for (let i = 1; i <= 7; i++) pts.push([200 + gauss(), 399 - i * speed]); return pts; };
let bad = 0;
const check = (ok, m) => { console.log(`${ok ? "ok  " : "FAIL"} ${m}`); if (!ok) bad++; };
const N = 20000;
{
    let drops = 0, rots = 0, off = 0;
    for (let i = 0; i < N; i++) { const c = 1 + Math.floor(rand() * 8), o = run(drag(c, 4)); drops += count(o, "drop"); rots += count(o, "rotate"); if (Math.abs(count(o, "move") - c) > 1) off++; }
    check(!drops, `sideways drags with a sloppy downward lift: ${N} strokes, ${drops} accidental drops`);
    check(!rots, `the same strokes: ${rots} accidental turns`);
    check(off / N < 0.02, `cells moved within one of intended: ${((1 - off / N) * 100).toFixed(1)}%`);
}
{
    let moved = 0, drops = 0, ok = 0;
    for (let i = 0; i < N; i++) { const o = run(tap); moved += count(o, "move"); drops += count(o, "drop"); ok += count(o, "rotate"); }
    check(ok >= N * 0.995, `taps: ${(ok / N * 100).toFixed(2)}% turn the piece`);
    check(!moved && !drops, `taps: ${moved} moves and ${drops} drops`);
}
{
    let any = 0;
    for (let i = 0; i < N; i++) { const o = run(rest); any += o.length; }
    check(!any, `a thumb resting on the screen for up to two seconds does nothing (${any} events)`);
}
{
    let drops = 0, soft = 0;
    for (let i = 0; i < N; i++) { const o = run(slowPull); drops += count(o, "drop"); soft += count(o, "soft"); }
    check(!drops, `slow pulls down: ${drops} hard drops`);
    check(soft > N * 2, `slow pulls down soft drop, about ${(soft / N).toFixed(1)} rows a stroke`);
}
{
    let ok = 0, many = 0;
    for (let i = 0; i < N; i++) { const n = count(run(flick), "drop"); if (n === 1) ok++; if (n > 1) many++; }
    check(ok >= N * 0.98, `quick flicks: ${(ok / N * 100).toFixed(2)}% drop`);
    check(!many, `double drops from one flick: ${many}`);
}
{
    let ok = 0;
    for (let i = 0; i < N; i++) if (count(run(dragThenFlick), "drop") === 1) ok++;
    check(ok >= N * 0.95, `drag, settle, then flick in one stroke: ${(ok / N * 100).toFixed(1)}% drop`);
}
{
    let ok = 0;
    for (let i = 0; i < N; i++) if (count(run(flickUp), "hold") === 1) ok++;
    check(ok >= N * 0.98, `flick up holds: ${(ok / N * 100).toFixed(1)}%`);
}
// Same strokes on a phone only managing 20 fps: samples arrive in clumps, the answers must not change.
{
    let drops = 0, moved = 0, flicks = 0, taps = 0;
    for (let i = 0; i < 4000; i++) {
        drops += count(run(drag(3, 4), { fps: 20 }), "drop"); moved += count(run(drag(3, 0), { fps: 20 }), "move");
        flicks += count(run(flick, { fps: 20 }), "drop"); taps += count(run(tap, { fps: 20 }), "rotate");
    }
    check(!drops && moved >= 11900 && flicks === 4000 && taps === 4000, `20 fps: ${drops} accidental drops, ${(moved / 4000).toFixed(2)} cells per 3-cell drag, ${flicks}/4000 flicks, ${taps}/4000 taps`);
}
const live = (fn) => { const out = [], g = new Gestures((n, a) => out.push([n, a])); fn(g); return out; };
// A stroke can't carry over to the next piece.
{
    const o = live((g) => {
        g.push("down", 1, 200, 100, 0); g.push("move", 1, 200, 110, 1); g.update();
        g.newPiece();
        for (let i = 2; i < 8; i++) g.push("move", 1, 200, 100 + i * 20, i);
        g.update();
    });
    check(!count(o, "drop"), "a piece that arrives mid-stroke can't be dropped by that stroke");
    check(count(run(flick), "drop") === 1, "the next fresh flick works straight away");
}
// A touch in the gap between pieces is for the piece that's coming.
{
    const o = live((g) => {
        g.idle = true; g.push("down", 1, 200, 100, 0); g.update();
        g.idle = false; g.newPiece();
        for (let i = 1; i < 6; i++) g.push("move", 1, 200, 100 + i * 15, i);
        g.update();
    });
    check(count(o, "drop") === 1, "a flick that starts in the gap before a piece appears still drops it");
}
// Two thumbs: one steering, the other tapping.
{
    const o = live((g) => {
        g.push("down", 1, 100, 300, 0);
        for (let i = 1; i < 6; i++) g.push("move", 1, 100 + i * 8, 300, i);
        g.push("down", 2, 300, 300, 6); g.push("up", 2, 300, 300, 8);
        for (let i = 6; i < 9; i++) g.push("move", 1, 100 + i * 8, 300, i);
        g.update();
    });
    check(count(o, "rotate") === 1 && count(o, "move") >= 2, "second thumb turns while the first keeps steering");
}
console.log(bad ? `${bad} FAILED` : "controls hold");
process.exit(bad ? 1 : 0);
