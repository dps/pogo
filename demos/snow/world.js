// The village map: one long snowy ridge climbed from dawn to night. Solved plots get their snowman; paths appear as they open.
import { color, mesh, pin, pos, sprite } from "./pogo.js";
import { Geo, mix } from "./geo.js";
import { Terrain } from "./terrain.js";
import { GROUND, VOID } from "./rules.js";
import { addBush, addHut, addLamp, addPine, addRock, addStump, PAL } from "./models.js";
import { Mole, addCliffs, defineShared } from "./view.js";
import { REGIONS, BY_ID, LEVELS } from "./levels.js";
import { THEMES, lightOf } from "./themes.js";
import { iconButton, pillText, settingsPanel } from "./ui.js";
import { makeSnowfall } from "./play.js";
import { SOLUTIONS } from "./solutions.js";

const W = 15, RH = 10, MAIN = [[7, 1], [4, 2], [2, 4], [5, 5], [8, 4], [11, 5], [12, 7], [9, 8], [6, 9]], OPT = [[1, 7, 2], [13, 2, 4], [5, 8, 3], [13, 9, 6], [1, 1, 1]];
const SONG = ["morning", "morning", "noon", "noon", "dusk", "dusk", "night", "night"];
const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

/** Places every level on the ridge and draws the paths between them. */
export function layout() {
    const R = REGIONS.length, H = R * RH + 3, nodes = [], byId = new Map();
    const toY = (r, ry) => H - 2 - (r * RH + ry);
    REGIONS.forEach((reg, r) => {
        const mains = reg.levels.filter((l) => !l.opt), opts = reg.levels.filter((l) => l.opt), first = nodes.length;
        mains.forEach((l, i) => { const m = MAIN[i], n = { id: l.id, x: m[0], y: toY(r, m[1]), links: [], level: l }; nodes.push(n); byId.set(l.id, n); });
        for (let i = 0; i + 1 < mains.length; i++) { nodes[first + i].links.push(mains[i + 1].id); }
        opts.forEach((l, i) => {
            const o = OPT[i], n = { id: l.id, x: o[0], y: toY(r, o[1]), links: [], level: l };
            nodes.push(n); byId.set(l.id, n);
            nodes[first + Math.min(o[2], mains.length - 1)].links.push(l.id);
        });
        if (r + 1 < REGIONS.length) nodes[first + mains.length - 1].links.push(REGIONS[r + 1].levels.find((l) => !l.opt).id);
    });
    const route = (a, b, vfirst) => {
        const cells = [];
        let x = a.x, y = a.y;
        const walkX = () => { while (x !== b.x) { x += Math.sign(b.x - x); cells.push(x + y * W); } };
        const walkY = () => { while (y !== b.y) { y += Math.sign(b.y - y); cells.push(x + y * W); } };
        if (vfirst) { walkY(); walkX(); } else { walkX(); walkY(); }
        return cells;
    };
    for (const n of nodes) { n.paths = n.links.map((id) => ({ to: id, cells: route(n, byId.get(id), byId.get(id).level.opt && Math.abs(byId.get(id).y - n.y) >= 3) })); }
    return { W, H, nodes, byId, start: nodes[0], cell: (n) => n.x + n.y * W };
}

function buildScenery(game, map) {
    const g = new Geo(), { W, H } = map, tiles = map.tiles, ox = -W / 2, oz = -H / 2, avoid = new Set();
    for (const n of map.nodes) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) avoid.add(n.x + dx + (n.y + dy) * W);
        for (const p of n.paths) for (const c of p.cells) { avoid.add(c); avoid.add(c + 1); avoid.add(c - 1); avoid.add(c + W); avoid.add(c - W); }
    }
    addCliffs(g, tiles, W, H, ox, oz, { n: 2 });
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = x + y * W;
        if (tiles[i] === VOID || avoid.has(i)) continue;
        const X = x + ox + 0.5, Z = y + oz + 0.5, r = hash(x, y), rg = Math.min(REGIONS.length - 1, Math.floor((H - 2 - y) / RH)), j = (hash(y, x) - 0.5) * 0.3;
        const dense = rg === 4 ? 0.5 : 0.3;
        if (r < dense) addPine(g, X + j, 0, Z - j, 1.1 + hash(x + 1, y) * 0.6);
        else if (r < dense + 0.05) addBush(g, X, 0, Z, 1.2);
        else if (r < dense + 0.08) addRock(g, X, 0, Z, 1.1);
        else if (r < dense + 0.1) addStump(g, X, 0, Z);
        else if (r < dense + (rg >= 3 ? 0.16 : 0.13)) addHut(g, X, 0, Z, { roof: hash(x, 3) < 0.5 ? "#7a4a4e" : "#4e6a88" });
        else if (r < dense + 0.17) addLamp(g, X, 0, Z);
    }
    g.build(game.assets, "worldDeco");
    // A marker for an open plot, and a little finished snowman.
    const lamp = new Geo();
    lamp.lathe(0, 0, 0, [[0.44, 0], [0.44, 0.03], [0.38, 0.05], [0, 0.05]], (t) => mix(PAL.stoneDark, PAL.stone, t), { seg: 16 });
    lamp.box(0, 0.02, -0.28, 0.07, 0.6, 0.07, PAL.wood);
    lamp.box(0, 0.48, -0.25, 0.42, 0.2, 0.04, PAL.woodDark);
    lamp.box(0, 0.5, -0.226, 0.34, 0.14, 0.01, PAL.plaster);
    lamp.blob(0, 0.68, -0.25, 0.24, 0.045, 0.06, PAL.snow, { seg: 8, rings: 3 });
    lamp.build(game.assets, "plotSign");
    const man = new Geo();
    const c = (cv) => mix(PAL.snowShade, PAL.snow, Math.min(1, (cv + 1) * 0.9));
    man.blob(0, 0.2, 0, 0.21, 0.21, 0.21, c);
    man.blob(0, 0.5, 0, 0.15, 0.15, 0.15, c);
    man.blob(0, 0.72, 0, 0.11, 0.11, 0.11, c);
    man.blob(-0.04, 0.75, 0.1, 0.012, 0.012, 0.008, PAL.coal, { seg: 5, rings: 3 });
    man.blob(0.04, 0.75, 0.1, 0.012, 0.012, 0.008, PAL.coal, { seg: 5, rings: 3 });
    man.rod([0, 0.73, 0.1], [0.01, 0.72, 0.18], 0.012, PAL.carrot, 5);
    man.lathe(0, 0.61, 0, [[0.11, 0], [0.13, 0.02], [0.1, 0.05]], PAL.scarfA, { seg: 12 });
    man.lathe(0, 0.8, 0, [[0.13, 0], [0.13, 0.01], [0.075, 0.015], [0.08, 0.13], [0, 0.135]], PAL.coal, { seg: 10 });
    man.build(game.assets, "miniMan");
}

function ensureWorld(game, app) {
    if (app.world) return app.world;
    defineShared(game);
    const map = layout(), { W, H } = map, tiles = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const edge = 0.6 + Math.sin(y * 0.33) * 0.6 + hash(y, 7) * 0.5, edge2 = 0.6 + Math.sin(y * 0.27 + 2) * 0.6 + hash(y, 11) * 0.5;
        tiles[x + y * W] = x < edge - 0.8 || x >= W - edge2 + 0.8 || y === 0 && (x < 3 || x > 11) || y === H - 1 && (x < 4 || x > 10) ? VOID : GROUND;
    }
    for (const n of map.nodes) { tiles[n.x + n.y * W] = GROUND; for (const p of n.paths) for (const c of p.cells) tiles[c] = GROUND; }
    map.tiles = tiles;
    map.path = new Uint8Array(W * H);
    const terrain = new Terrain(game, "wd", { w: W, h: H, tiles, snow: (i) => 1 }, { sub: 3, px: 16, pal: { g1: [120, 110, 118], g2: [146, 132, 134] } });
    buildScenery(game, map);
    app.world = { map, terrain };
    return app.world;
}

export function worldScene(game, app) {
    game.scene("world", (s, args) => {
        game.touch.enabled = false;
        const { map, terrain } = ensureWorld(game, app), { W, H, nodes, byId } = map, snd = app.sound;
        s.add([mesh("wd_mesh", { texture: "wd_tex", color: "#ffffff", shadow: false }), pos(0, 0, 0), { name: "ground" }]);
        s.add([mesh("worldDeco"), pos(0, 0, 0), { name: "deco" }]);
        const blob = (k) => { const e = s.add([mesh("plane", { size: [k, 1, k], texture: "contact", unlit: true, shadow: false }), pos(0, 0, 0), { name: "contact" }]); e.color = color([0.1, 0.13, 0.3, 0.4]); return e; };
        const w = {
            game, time: 0, wx: (x) => x - W / 2 + 0.5, wz: (y) => y - H / 2 + 0.5,
            groundAt: (x, y) => terrain.heightAt(x + 0.5, y + 0.5),
        };
        const mole = new Mole(s, blob);
        const solved = (id) => !!app.save.solved[id];
        const justSolved = args?.solved && !app.seen?.has(args.solved) ? args.solved : null;

        // What's open: a path shows once the plot it leaves from is solved.
        const openNow = () => {
            const open = new Set([map.start.id]);
            for (const n of nodes) if (solved(n.id)) { open.add(n.id); for (const l of n.links) open.add(l); }
            return open;
        };
        const open = openNow();
        const pathCells = (n) => n.paths.flatMap((p) => p.cells);
        const walk = map.path;
        walk.fill(0);
        const setOpen = (animateFrom) => {
            for (const n of nodes) {
                if (open.has(n.id)) { const i = n.x + n.y * W; walk[i] = 1; terrain.setSnow(i, 0); }
                if (solved(n.id)) for (const c of pathCells(n)) {
                    walk[c] = 1;
                    if (n.id === animateFrom) continue;
                    terrain.setSnow(c, 0);
                }
            }
        };
        setOpen(justSolved);
        terrain.flush();

        // Markers.
        const marks = new Map();
        for (const n of nodes) {
            const X = w.wx(n.x), Z = w.wz(n.y);
            const sign = s.add([mesh("plotSign"), pos(X, 0, Z), { name: "sign" }]);
            const man = s.add([mesh("miniMan"), pos(X + 0.26, 0, Z - 0.1), { name: "miniMan" }]);
            const nat = game.assets.geometry("miniMan").natural;
            const ball = s.add([mesh("ball", { size: 0.3 }), pos(X, 0.3, Z), { name: "plotBall" }]);
            const m = { n, sign, man, ball, nat, pop: 1 };
            marks.set(n.id, m);
            sign.color = color(n.level.opt ? "#ffe7a8" : "#ffffff");
        }
        const updateMarks = () => {
            for (const m of marks.values()) {
                const id = m.n.id, on = open.has(id), done = solved(id);
                m.sign.hidden = !on; m.man.hidden = !done; m.ball.hidden = !on || done;
                const par = SOLUTIONS[id]?.pushes, best = app.save.solved[id]?.p;
                if (done && best <= par) m.sign.color = color("#ffd468");
            }
        };
        updateMarks();

        // Where the mole starts: on the plot just finished, or wherever he was left.
        const here = byId.get(args?.at ?? app.save.at) ?? map.start;
        let cx = here.x, cy = here.y, gap = 0, route = [], entering = false, runDir = -1;
        mole.place(cx, cy); mole.face(2);
        const cellOf = (x, y) => x + y * W;

        // Camera: a steady three-quarter look that follows up the ridge.
        const cam = s.cam3;
        cam.fovAxis = "vertical"; cam.fov = 24;
        s.light.shadows = true; s.light.softShadows = true; s.light.shadowRange = 13;
        const placeCam = (snap) => {
            const v = s.view, port = v.width < v.height, dist = port ? 46 * Math.max(1, (v.height / v.width) / 2) * 0.86 : 27, x = (mole.x - W / 2 + 0.5) * (port ? 0.55 : 0.25), z = mole.y - H / 2 + 0.5 + (port ? 0.6 : 0.2);
            const pitch = 0.98, eye = [x - 0.05 * dist, Math.sin(pitch) * dist, z + Math.cos(pitch) * dist];
            if (snap) cam.set(eye, [x, 0, z]);
            else { cam.pos.set(cam.pos.x + (eye[0] - cam.pos.x) * 0.09, cam.pos.y + (eye[1] - cam.pos.y) * 0.09, cam.pos.z + (eye[2] - cam.pos.z) * 0.09); cam.target.set(cam.target.x + (x - cam.target.x) * 0.09, 0, cam.target.z + (z - cam.target.z) * 0.09); }
        };
        placeCam(true);

        // Light follows the climb, dawn at the foot to night at the top.
        const lerpTheme = () => {
            const k = Math.max(0, Math.min(REGIONS.length - 1.001, (H - 2 - mole.y) / RH - 0.2)), a = Math.floor(k), f = k - a, A = THEMES[a % THEMES.length], B = THEMES[Math.min(a + 1, REGIONS.length - 1) % THEMES.length];
            const m = (p, q) => { const c1 = color(p), c2 = color(q); return [c1.r + (c2.r - c1.r) * f, c1.g + (c2.g - c1.g) * f, c1.b + (c2.b - c1.b) * f]; };
            const LA = lightOf(A), LB = lightOf(B), L = (p, q) => color([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f]);
            s.light.color = L(LA.sun, LB.sun); s.light.sky = L(LA.amb, LB.amb); s.light.ground = L(LA.gnd, LB.gnd);
            s.light.dir.set(A.dir[0] + (B.dir[0] - A.dir[0]) * f, A.dir[1] + (B.dir[1] - A.dir[1]) * f, A.dir[2] + (B.dir[2] - A.dir[2]) * f);
            s.background = [color(m(A.sky[0], B.sky[0])), color(m(A.sky[1], B.sky[1]))];
            return a;
        };
        let regionNow = lerpTheme();
        snd.play(SONG[regionNow]);

        // Region name, shown on arrival.
        const label = pillText(s, REGIONS[regionNow].name, pin("top", [0, 74]), { size: 20, name: "regionLabel" });
        label.opacity = 0;
        const showLabel = (name) => { label.text = name; label.opacity = 1; s.tween(label, { opacity: 0 }, 1.1, { delay: 1.6 }); };
        showLabel(REGIONS[regionNow].name);

        const total = LEVELS.length;
        const count = pillText(s, `${Object.keys(app.save.solved).length} / ${total}`, pin("top-left", [50, 24]), { size: 17, name: "count" });
        const ci = s.add([sprite("goal", { width: 24, height: 36 }), pin("top-left", [16, 15]), { name: "countIcon" }]);
        ci.frame = 1; ci.layer = 32;
        const sets = settingsPanel(s, app.settings);
        iconButton(s, "ic_gear", (v) => [v.width - v.safe.right - 34, v.safe.top + 34], { size: 46, onTap: () => sets.toggle(), name: "gear" });
        const nodeAt = (x, y) => nodes.find((n) => n.x === x && n.y === y);
        const atNode = () => (mole.t >= 1 ? nodeAt(cx, cy) : null);
        const enter = (n) => {
            if (entering) return;
            entering = true;
            app.save.at = n.id; app.persist();
            snd.unlock();
            game.go("play", { id: n.id }, { fade: 0.3 });
        };
        const replay = iconButton(s, "ic_play", (v) => [(v.width + v.safe.left - v.safe.right) / 2, v.height - v.safe.bottom - 52], { size: 66, action: "confirm", color: "#ffe9b0", onTap: () => { const n = atNode(); if (n && open.has(n.id)) enter(n); }, hide: () => !atNode() || !open.has(atNode().id), pulse: () => 1 + Math.sin(s.time * 4) * 0.06, name: "enter" });

        // Reveal new paths after a win.
        let intro = justSolved ? 0.6 : 0;
        if (justSolved) {
            (app.seen ??= new Set()).add(justSolved);
            const n = byId.get(justSolved), m = marks.get(justSolved);
            m.man.hidden = false; m.pop = 0;
            const cells = pathCells(n);
            cells.forEach((c, i) => s.wait(0.55 + i * 0.05, () => { let k = 1; const fade = s.every(1 / 30, () => { k -= 0.2; terrain.setSnow(c, Math.max(0, k)); if (k <= 0) fade.cancel(); }); }));
            if (n.links.length) s.wait(0.5, () => snd.unlock());
            if (app.isComplete?.() && !app.save.ended) { app.save.ended = true; app.persist(); s.wait(2.2, () => game.go("end", {}, { fade: 0.9 })); }
        }

        function stepTo(d) {
            const dx = [0, 1, 0, -1][d], dy = [-1, 0, 1, 0][d], nx = cx + dx, ny = cy + dy;
            mole.face(d);
            if (nx < 0 || ny < 0 || nx >= W || ny >= H || !walk[cellOf(nx, ny)]) { route = []; runDir = -1; return false; }
            mole.walk(cx, cy, nx, ny, 0.13);
            terrain.stamp(cx + 0.5 + dx * 0.5 + (mole.side ? 0.1 : -0.1) * (dy ? 1 : 0), cy + 0.5 + dy * 0.5 + (mole.side ? 0.1 : -0.1) * (dx ? 1 : 0), dy ? 0 : Math.PI / 2);
            cx = nx; cy = ny; gap = 0.12;
            snd.step(1, false);
            const n = nodeAt(cx, cy);
            if (n && !solved(n.id) && open.has(n.id) && !route.length) { runDir = -1; s.wait(0.2, () => enter(n)); }
            else if (n && runDir >= 0) { runDir = -1; route = []; }
            return true;
        }
        const options = (x, y) => [0, 1, 2, 3].filter((d) => { const a = x + [0, 1, 0, -1][d], b = y + [-1, 0, 1, 0][d]; return a >= 0 && b >= 0 && a < W && b < H && walk[cellOf(a, b)]; });
        function bfs(tx, ty) {
            const prev = new Map([[cellOf(cx, cy), -1]]), q = [cellOf(cx, cy)];
            for (let h = 0; h < q.length; h++) {
                const c = q[h];
                if (c === cellOf(tx, ty)) { const path = []; for (let x = c; prev.get(x)?.[0] !== undefined; x = prev.get(x)[0]) path.unshift(prev.get(x)[1]); return path; }
                for (const d of options(c % W, Math.floor(c / W))) { const n = c + [-W, 1, W, -1][d]; if (!prev.has(n)) { prev.set(n, [c, d]); q.push(n); } }
            }
            return null;
        }
        const fall = makeSnowfall(s, 0.5);
        const sw = () => { const o = cam.project([0, 0, 0]), q = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]].map((p) => { const a = cam.project(p), x = a.x - o.x, y = a.y - o.y, l = Math.hypot(x, y) || 1; return [x / l, y / l]; }); return q; };
        let down = false, ax = 0, ay = 0, moved = false;
        s.onUpdate((dt) => {
            w.time += dt; snd.tick(dt);
            mole.update(dt, w);
            for (const m of marks.values()) {
                const X = w.wx(m.n.x), Z = w.wz(m.n.y);
                m.pop = Math.min(1, m.pop + dt * 2);
                const k = m.pop < 1 ? 1 + 2.7 * (m.pop - 1) ** 3 + 1.7 * (m.pop - 1) ** 2 : 1;
                m.man.size.set(m.nat.x * k, m.nat.y * k, m.nat.z * k);
                if (!m.ball.hidden) { m.ball.pos.y = 0.34 + Math.sin(w.time * 2.4 + m.n.x) * 0.05; m.ball.rot.y = w.time; }
            }
            placeCam(false);
            const rNow = lerpTheme();
            if (rNow !== regionNow) { regionNow = rNow; showLabel(REGIONS[rNow].name); snd.play(SONG[rNow]); }
            terrain.flush();
            gap -= dt; intro -= dt;
            if (entering || intro > 0 || sets.open) return;
            const p = s.input.pointer;
            if (p.pressed) { down = true; ax = p.x; ay = p.y; moved = false; }
            if (down && p.down && !moved) {
                const dx = p.x - ax, dy = p.y - ay, dist = Math.hypot(dx, dy);
                if (dist > 24) {
                    moved = true;
                    const A = sw(); let b = 0, bv = -2;
                    A.forEach((q, i) => { const v = (dx * q[0] + dy * q[1]) / dist; if (v > bv) { bv = v; b = i; } });
                    route = []; runDir = b;
                }
            }
            if (p.released && down) {
                down = false;
                if (!moved) {
                    const r = cam.ray(p.x, p.y), t = -r.origin.y / r.dir.y, wx = r.origin.x + r.dir.x * t, wz = r.origin.z + r.dir.z * t;
                    let best = null, bd = 1.6;
                    for (const n of nodes) { if (!open.has(n.id)) continue; const q = Math.hypot(w.wx(n.x) - wx, w.wz(n.y) - wz); if (q < bd) { bd = q; best = n; } }
                    if (best) { if (best.x === cx && best.y === cy) enter(best); else route = bfs(best.x, best.y) ?? []; runDir = -1; }
                }
            }
            for (const [a, d] of [["up", 0], ["right", 1], ["down", 2], ["left", 3]]) if (s.input.pressed(a)) { route = []; runDir = -1; stepTo(d); }
            if (gap <= 0 && mole.t >= 1) {
                if (route.length) stepTo(route.shift());
                else if (runDir >= 0) {
                    // Runs along the path until a plot or a junction, and turns corners by itself.
                    const opts = options(cx, cy), back = (runDir + 2) % 4;
                    if (!opts.includes(runDir)) { const rest = opts.filter((d) => d !== back); if (rest.length === 1) runDir = rest[0]; else { runDir = -1; return; } }
                    if (!stepTo(runDir)) runDir = -1;
                    else if (options(cx, cy).length > 2) runDir = -1;
                } else for (const [a, d] of [["up", 0], ["right", 1], ["down", 2], ["left", 3]]) if (s.input.down(a)) { stepTo(d); break; }
            }
        });
        let idle = 0;
        s.onDraw((d) => {
            fall(d, 1 / 60);
            // Plots still to do glow, and early on a mitten shows the way along the path.
            const put = d.quads("dot"), pulse = 0.5 + 0.5 * Math.sin(w.time * 3);
            for (const m of marks.values()) {
                if (m.ball.hidden) continue;
                const q = cam.project([w.wx(m.n.x), 0.9, w.wz(m.n.y)]);
                if (q.visible) put(q.x, q.y, 12 + pulse * 8, 12 + pulse * 8, 0, 0, 1, 1, 1, 0.55 + pulse * 0.35);
            }
            idle = mole.t < 1 || down ? 0 : idle + 1 / 60;
            if (idle > 2.5 && Object.keys(app.save.solved).length < 3) {
                const next = nodes.find((n) => open.has(n.id) && !solved(n.id));
                if (next) {
                    const path = bfs(next.x, next.y);
                    if (path?.length) {
                        const a = cam.project([w.wx(cx), 0.3, w.wz(cy)]), b = cam.project([w.wx(cx + [0, 1, 0, -1][path[0]]), 0.3, w.wz(cy + [-1, 0, 1, 0][path[0]])]), t = (w.time * 0.7) % 1, k = Math.min(1, t / 0.7);
                        d.sprite("mitten", { x: a.x + (b.x - a.x) * k * 2.4, y: a.y + (b.y - a.y) * k * 2.4 + 26, width: 50, height: 50, color: color([1, 1, 1, t < 0.8 ? 1 : (1 - t) * 5]) });
                    }
                }
            }
        });
        game.map = { get at() { return [cx, cy]; }, open, nodes, get busy() { return mole.t < 1 || route.length > 0 || runDir >= 0 || entering || intro > 0; }, go: (id) => { const n = byId.get(id); route = bfs(n.x, n.y) ?? []; return route.length; }, enter: () => { const n = atNode(); if (n) enter(n); } };
    });
}
