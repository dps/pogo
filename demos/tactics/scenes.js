// Everything outside a battle: title, the map of the park, the roost, and Bird Brain.
import { color, layer, mesh, pos, ui } from "./pogo.js";
import { Mesher, mix } from "./meshkit.js";
import { ZONES } from "./stage.js";
import { View } from "./view.js";
import { FONT, INK, PAL, card, label, left as leftText, outlined, toy, wrap } from "./ui.js";
import { MISSIONS, MISSION, LINKS, parseBoard } from "./missions.js";
import { CLASSES, ENEMIES, PIGEONS } from "./data.js";
import { BONUS_TEXT, newBattle } from "./sim.js";
import { available, buildSquad, buyUpgrade, defaultSquad, ensureSquad, loadMeta, openNodes, saveMeta, totalStars } from "./meta.js";
import { RUN_LENGTH, afterBattle, applyReward, genMission, newRun, rewardsFor } from "./rogue.js";
import { BIRD } from "./models.js";
import { playSong } from "./audio.js";
import * as S from "./audio.js";

const GOAL = { rout: "Defeat them all", survive: "Hold out", collect: "Grab the crumbs", perch: "Sit on the plinths", escort: "Walk Old Reg to the gate", boss: "Beat the boss" };

function settingsRow(game, s, meta, addFn) {
    const set = meta.settings, save = () => saveMeta(game, meta);
    addFn(set.sound ? "Sound: On" : "Sound: Off", (e) => { set.sound = !set.sound; game.audio.muted = !set.sound; e.cap = set.sound ? "Sound: On" : "Sound: Off"; save(); });
    addFn(set.music ? "Music: On" : "Music: Off", (e) => { set.music = !set.music; e.cap = set.music ? "Music: On" : "Music: Off"; if (set.music) { game.data._song = null; playSong(game, "title"); } else { game.stopMusic(); game.data._song = null; } save(); });
    addFn(set.haptics ? "Haptics: On" : "Haptics: Off", (e) => { set.haptics = !set.haptics; game.haptics.enabled = set.haptics; e.cap = set.haptics ? "Haptics: On" : "Haptics: Off"; save(); if (set.haptics) game.haptic("medium"); });
    addFn(set.fast ? "Enemy Turns: Fast" : "Enemy Turns: Normal", (e) => { set.fast = !set.fast; e.cap = set.fast ? "Enemy Turns: Fast" : "Enemy Turns: Normal"; save(); });
    addFn(meta.perma ? "Permadeath: On" : "Permadeath: Off", (e) => { meta.perma = !meta.perma; e.cap = meta.perma ? "Permadeath: On" : "Permadeath: Off"; save(); });
}

const TITLE_BOARD = parseBoard([
    "hh.~~.hh",
    "...~~..c",
    "..C..Q..",
    "........",
    "...__...",
    "...__...",
    "........",
    "........",
]);

function startCampaign(game, meta) {
    if (!Object.keys(meta.cleared).length) {
        const m = MISSION.l1;
        game.go("battle", { mission: m, squad: buildSquad(meta, ["sarge", "doris"]) }, { fade: 0.25 });
    } else game.go("map", {}, { fade: 0.3 });
}

function startRun(game, meta, resume) {
    if (!meta.run || !resume) { meta.run = newRun(((Date.now() % 1e9) ^ 0x5bd1e995) >>> 0); meta.runs++; }
    saveMeta(game, meta);
    game.go("rogue", {}, { fade: 0.3 });
}

export function titleScene(game) {
    game.scene("title", (s) => {
        const meta = loadMeta(game), set = meta.settings;
        game.audio.muted = !set.sound; game.haptics.enabled = set.haptics; game.touch.enabled = false;
        const m = { ...TITLE_BOARD, id: "title", zone: "lawn", win: "rout", rounds: 9, deploy: [[0, 6], [2, 6], [4, 6], [6, 6], [1, 7], [3, 7], [5, 7], [7, 7]] };
        const st = newBattle(m, CLASSES.map((k) => ({ k, up: {} })));
        for (const u of st.units) if (u.side === 1) { u.intent = null; }
        const v = new View(game, s, "lawn", m, st.tiles);
        v.sync(st);
        const fitTitle = () => {
            const W = s.view.width, H = s.view.height, wide = W > H, dist = wide ? 19 : 30, tx = wide ? -2.5 : 0.1, tz = wide ? 3.1 : 1.3, a = 0.7, yaw = Math.PI / 4 - (wide ? 0.05 : 0);
            s.cam3.fovAxis = "vertical"; s.cam3.fov = 20;
            s.cam3.set([tx + Math.sin(yaw) * Math.cos(a) * dist, Math.sin(a) * dist, tz + Math.cos(yaw) * Math.cos(a) * dist], [tx, 0.35, tz]);
        };
        fitTitle();
        let t = 0, tapped = false;
        s.onUpdate((dt) => {
            t += dt; v.update(dt);
            if (Math.floor(t * 60) % 80 === 0) { const list = [...v.actors.values()].filter((a) => a.side === 0); const a = list[Math.floor(game.fxRng.next() * list.length)]; if (a) { a.flap = 0.5; a.move(a.x, a.z, 0.3, { arc: 0.4 }); } }
            if (s.input.pointer.tapped && !tapped) { tapped = true; if (set.music) playSong(game, "title"); }
        });
        const has = Object.keys(meta.cleared).length > 0;
        const ents = [];
        const W0 = () => s.view.width, H0 = () => s.view.height;
        const play = s.add([ui(), layer(40), pos(0, 0), toy(has ? "Continue" : "Play", { width: 200, height: 58, color: PAL.green, textSize: 24, action: "confirm", onTap: () => { if (set.music) playSong(game, "battle"); S.coo(game); startCampaign(game, loadMeta(game)); } }), { name: "play" }]);
        const brain = s.add([ui(), layer(40), pos(0, 0), toy(meta.run ? "Bird Brain: Resume" : "Bird Brain", { width: 200, height: 44, color: PAL.plum, textSize: 15, action: "swapMode", onTap: () => { if (set.music) playSong(game, "tense"); startRun(game, loadMeta(game), true); } }), { name: "brain" }]);
        const gear = s.add([ui(), layer(40), pos(0, 0), toy("", { width: 44, height: 44, icon: "i_gear", color: PAL.grey, action: "pause", onTap: () => openSet() }), { name: "gear" }]);
        ents.push(play, brain);
        const place = () => {
            const W = W0(), H = H0(), wide = W > H;
            fitTitle();
            const sf = s.view.safe;
            gear.size.set(50, 50, 0); gear.pos.set(W - sf.right - 32, sf.top + 32); brain.size.set(wide ? 190 : 200, 50, 0);
            if (wide) { play.pos.set(sf.left + W * 0.17 + 10, H * 0.6); brain.pos.set(sf.left + W * 0.17 + 10, H * 0.6 + 60); play.size.set(190, 54, 0); }
            else { play.pos.set(W / 2, H - sf.bottom - 116); brain.pos.set(W / 2, H - sf.bottom - 50); }
        };
        place(); s.on("resize", place);
        const panel = [];
        let open = false;
        function openSet() {
            play.hidden = brain.hidden = !open ? true : false;
            if (open) { panel.forEach((e) => e.destroy()); panel.length = 0; open = false; return; }
            open = true;
            const wideSet = W0() > H0();
            let y = H0() / 2 - (wideSet ? 100 : 150), n = 0;
            const add = (t2, fn, col) => { if (wideSet && n === 3) y = H0() / 2 - 100; const ex = wideSet ? (n < 3 ? -116 : 116) : 0; n++; const e = s.add([ui(), layer(70), pos(W0() / 2 + ex, y), toy(t2, { width: 222, height: 52, textSize: 14, color: col ?? PAL.blue, onTap: () => fn(e) }), { name: t2 }]); panel.push(e); y += 58; return e; };
            settingsRow(game, s, meta, add);
            add("Close", openSet, PAL.green);
        }
        s.onDrawUI((d) => {
            const W = W0(), H = H0(), wide = W > H, sf = s.view.safe, cx = wide ? sf.left + W * 0.17 + 10 : W / 2, y = wide ? H * 0.2 + sf.top * 0.5 : H * 0.1 + sf.top;
            const size = wide ? 42 : 56, wob = Math.sin(t * 2) * 0.02;
            d.push(); d.translate(cx, y); d.rotate(-0.04 + wob);
            outlined(d, "SQUAD", 0, -size * 0.52, size, "#ffd84a", INK, 3);
            outlined(d, "GOALS", 0, size * 0.48, size, "#fff7e8", INK, 3);
            d.pop();
            label(d, "Pigeons. Tactics. Bread.", cx, y + size * 1.25, wide ? 12 : 14, "#2d5136");
            if (meta.best) label(d, `Bird Brain best: ${meta.best} of ${RUN_LENGTH}`, cx, wide ? H * 0.6 + 96 : H - sf.bottom - 16, 11, "#2d5136");
            if (open) d.rect(W, H, { x: W / 2, y: H / 2, color: "#201830", opacity: 0.55 });
        });
    });
}

// ---- The strategic map ----

const ROW = {}; const NODE = {};
(function layoutNodes() {
    const rows = [["l1"], ["l2"], ["l3"], ["l4", "l5"], ["l6"], ["l7"], ["b1"], ["b2", "b3"], ["b4"], ["b5"], ["b6"], ["f1"], ["f2", "f3"], ["f4"], ["f5"], ["f6"], ["r1"], ["r2", "r3"], ["r4"], ["r5"], ["r6"], ["x1"], ["x2"]];
    rows.forEach((row, i) => {
        const cx = Math.sin(i * 0.8) * 1.9, z = 33 - i * 3;
        row.forEach((id, j) => { NODE[id] = { x: row.length > 1 ? cx + (j ? 1.7 : -1.7) : cx, z }; ROW[id] = i; });
    });
})();
const zoneZ = { lawn: [36, 16.5], bandstand: [16.5, 1.5], fountain: [1.5, -13.5], rooftop: [-13.5, -28.5], island: [-28.5, -40] };

function parkMesh(game) {
    if (game.assets.geoms?.has("parkmap")) return;
    const b = new Mesher();
    for (const [zid, [z1, z0]] of Object.entries(zoneZ)) {
        const zn = ZONES[zid], d = z1 - z0, zc = (z0 + z1) / 2;
        if (zid === "island") {
            b.box(0, -0.8, zc, 12, 0.72, d, "#2f5fb4", { top: "#3b76c9", base: "#1d3a78" });
            b.ball(0, -0.2, zc + 0.6, 4.8, 0.45, 4.2, (nx, ny) => mix("#3f7766", "#58a08a", Math.max(0, ny)), 18, 8);
            continue;
        }
        const h = zid === "rooftop" ? 0.9 : 0;
        b.box(0, -1.2, zc, 12, 1.2 + h - 0.05, d - 0.1, zn.dirt, { top: zid === "rooftop" ? zn.a : zn.a, base: zn.dirt2, bevel: 0.08 });
        for (let i = 0; i < 26; i++) {
            const R = (k) => { const v = Math.sin(i * 12.9 + k * 78.2 + z0) * 43758.5; return v - Math.floor(v); }, s2 = R(1) < 0.5 ? -1 : 1, x = s2 * (3.3 + R(2) * 2.3), z = z0 + 0.8 + R(3) * (d - 1.6);
            if (zid === "rooftop") { const w = 0.5 + R(4) * 0.6; b.box(x, h, z, w, 0.25 + R(5) * 0.5, w, "#b5654f", { top: "#7c4a44" }); }
            else if (zid === "fountain") { b.ball(x, 0.25, z, 0.3, 0.3, 0.3, (nx, ny) => mix(zn.hedge, zn.hedge2, Math.max(0, ny)), 8, 5); }
            else { const k = 0.55 + R(4) * 0.4; b.tube([x, 0, z], [x, 0.5 * k, z], 0.09, 0.05, "#8a5f3a", 6); b.ball(x, 0.75 * k, z, 0.42 * k, 0.5 * k, 0.42 * k, (nx, ny) => mix(zn.hedge, zn.hedge2, Math.max(0, ny * 0.7 + 0.3)), 8, 6); }
        }
    }
    // Landmarks
    const bz = 9, oct = (m) => { m.tube([0, 0, 0], [0, 0.22, 0], 1.3, 1.2, "#f3e7cf", 8); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; m.cyl(Math.cos(a) * 1.05, 0.2, Math.sin(a) * 1.05, 0.05, 0.95, "#fff6e6", 6); } m.tube([0, 1.15, 0], [0, 1.85, 0], 1.45, 0, "#d84a3a", 8); m.ball(0, 1.9, 0, 0.1, 0.1, 0.1, "#f0c04a"); };
    b.at(-4.6, 0, bz, oct);
    const fz = -6, fnt = (m) => { m.tube([0, 0, 0], [0, 0.3, 0], 1.5, 1.6, "#d6dade", 18); m.tube([0, 0.3, 0], [0, 0.31, 0], 1.4, 1.4, "#3fbfe6", 18); m.tube([0, 0.3, 0], [0, 0.9, 0], 0.22, 0.14, "#e6e9ee", 10); m.tube([0, 0.9, 0], [0, 1.0, 0], 0.7, 0.6, "#d6dade", 14); m.tube([0, 1.0, 0], [0, 1.45, 0], 0.1, 0.04, "#e6e9ee", 8); m.ball(0, 1.55, 0, 0.14, 0.2, 0.14, "#9fe6f7", 8, 6); };
    b.at(4.5, 0, fz, fnt);
    const swanRock = (m) => { m.ball(0, 0, 0, 1.1, 0.5, 1, "#6b6f88", 10, 6); };
    b.at(0, 0, -36.5, swanRock);
    b.bake(game, "parkmap");
}

export function mapScene(game) {
    game.scene("map", (s, args = {}) => {
        const meta = loadMeta(game), set = meta.settings;
        game.audio.muted = !set.sound; game.haptics.enabled = set.haptics; game.touch.enabled = false;
        if (set.music) playSong(game, "map");
        parkMesh(game);
        s.background = ["#8fd0ea", "#cfe9f2"];
        const l = s.light, dim = (hex, k) => { const c = color(hex); return color([c.r * k, c.g * k, c.b * k, 1]); };
        l.dir.set(-0.6, -1, -0.4); l.color = dim("#fff0d8", 0.68); l.sky = dim("#d8efff", 0.6); l.ground = dim("#9fa890", 0.6); l.shadows = true; l.softShadows = false; l.shadowRange = 26;
        s.add([mesh("parkmap", { shine: 0.03 }), { name: "park" }]);
        s.cam3.fovAxis = "vertical"; s.cam3.fov = 22;
        const open = openNodes(meta), flags = new Map();
        for (const m of MISSIONS) {
            const n = NODE[m.id], done = meta.cleared[m.id] != null, isOpen = open.has(m.id);
            const name = done ? "flag_ally" : isOpen ? "flag_gold" : "flag_foe", base = m.zone === "rooftop" ? 0.9 : m.zone === "island" ? 0.1 : 0;
            const e = s.add([mesh(name), { name: "flag" }]);
            e.size.set(game.assets.geometry(name).natural);
            e.pos.set(n.x, base, n.z); e.base = base; e.scale.set(1.9, 1.9, 1.9);
            flags.set(m.id, e);
        }
        // Frontier: the first open uncleared node.
        const front = MISSIONS.find((m) => open.has(m.id) && meta.cleared[m.id] == null) ?? MISSIONS[MISSIONS.length - 1];
        let camZ = NODE[(args.focus && NODE[args.focus]) ? args.focus : front.id].z, goalZ = camZ, sel = null, downY = null, dragged = 0, t = 0, picks = [], modal = !meta.chosen, overlay = null;
        const token = [s.add([mesh("sarge_body"), { name: "token" }]), s.add([mesh("sarge_head"), { name: "token" }])];
        const fNode = NODE[front.id], fy = flags.get(front.id).base;
        token.forEach((e, i) => { e.size.set(game.assets.geometry(e.mesh).natural); e.scale.set(1.6, 1.6, 1.6); e.rot.set(0, 0.5, 0); e.pos.set(fNode.x + 0.9 + (i ? 0.13 : 0), fy + (i ? 1.05 : 0), fNode.z + 0.3 + (i ? 0.22 : 0)); });
        const placeCam = () => { const W = s.view.width, H = s.view.height, wide = W > H, dist = wide ? 40 : 66; s.cam3.pos.set(wide ? 3 : 0, dist * 0.8, camZ + dist * 0.62); s.cam3.target.set(wide ? 3 : 0, 0, camZ); };
        placeCam(); s.cam3.set([s.cam3.pos.x, s.cam3.pos.y, s.cam3.pos.z], [0, 0, s.cam3.target.z]);
        const P = (x, y, z) => s.cam3.project([x, y, z]);
        const btns = {};
        const uiB = (key, cap, o) => { btns[key] = s.add([ui(), layer(50), pos(0, 0), toy(cap, o), { name: key }]); return btns[key]; };
        uiB("roost", "Roost", { width: 88, height: 50, color: PAL.gold, textColor: INK, action: "waitKey", onTap: () => game.go("roost", {}, { fade: 0.25 }) });
        uiB("back", "", { width: 50, height: 50, icon: "i_menu", color: PAL.grey, action: "pause", onTap: () => game.go("title", {}, { fade: 0.25 }) });
        uiB("go", "Start Battle", { width: 180, height: 50, color: PAL.green, textSize: 18, action: "confirm", onTap: () => begin() });
        btns.go.hidden = true;
        const faceBtns = [];
        const place = () => {
            const W = s.view.width, H = s.view.height;
            const sf = s.view.safe, wide = W > H;
            btns.back.pos.set(W - sf.right - 31, sf.top + 31); btns.roost.pos.set(W - sf.right - 105, sf.top + 31);
            btns.go.pos.set(wide ? W - sf.right - 106 : W / 2, H - sf.bottom - 34);
            if (wide) btns.go.size.set(190, 50, 0);
        };
        place(); s.on("resize", () => { place(); placeCam(); });
        function clearFaces() { faceBtns.forEach((e) => e.destroy()); faceBtns.length = 0; }
        function choose(id) {
            const m = MISSION[id];
            if (!open.has(id)) { S.bad(game); overlay = { text: "Locked. Win the flags before it.", t: 0 }; return; }
            if (sel === id) return;
            sel = id; goalZ = NODE[id].z; S.select(game);
            ensureSquad(meta, m.squad);
            picks = defaultSquad(meta, m);
            clearFaces();
            const W = s.view.width, H = s.view.height, wide = W > H, avail = available(meta);
            avail.forEach((k, i) => {
                const sf = s.view.safe, col = wide ? 4 : 8, sz = wide ? 46 : Math.max(38, Math.min(50, (W - 12) / Math.max(4, avail.length) - 2));
                const x = wide ? W - sf.right - 186 + (i % col) * 48 : W / 2 + (i - (avail.length - 1) / 2) * (sz + 2), y = wide ? H - sf.bottom - 118 + Math.floor(i / col) * 48 - (avail.length > 4 ? 22 : 0) : H - sf.bottom - 90;
                const e = s.add([ui(), layer(55), pos(x, y), toy("", { width: sz, height: sz + 2, color: PAL.cream, radius: 10, onTap: () => togglePick(k) }), { name: `pick_${k}`, k }]);
                faceBtns.push(e);
            });
            btns.go.hidden = false;
        }
        function togglePick(k) {
            const m = MISSION[sel], i = picks.indexOf(k);
            if (i >= 0) picks.splice(i, 1);
            else { if (picks.length >= m.squad) picks.shift(); picks.push(k); }
            S.click(game);
        }
        function begin() {
            if (!sel || !picks.length) return;
            const m = MISSION[sel];
            const fresh = loadMeta(game); fresh.last = picks.slice(); saveMeta(game, fresh);
            game.go("battle", { mission: m, squad: buildSquad(meta, picks) }, { fade: 0.25 });
        }
        s.onUpdate((dt) => {
            t += dt;
            const p = s.input.pointer;
            for (const [id, e] of flags) if (open.has(id) && meta.cleared[id] == null) e.pos.y = e.base + Math.abs(Math.sin(t * 3)) * 0.2;
            if (overlay) { overlay.t += dt; if (overlay.t > 1.5) overlay = null; }
            if (modal) return;
            if (p.pressed) { downY = p.y; dragged = 0; }
            if (p.down && downY !== null) {
                dragged += Math.abs(p.dy ?? 0);
                goalZ -= (p.dy ?? 0) * (s.view.width > s.view.height ? 0.11 : 0.09);
            }
            goalZ -= (s.input.wheel ?? 0) * 0.02;
            if (s.input.down("up")) goalZ -= dt * 14;
            if (s.input.down("down")) goalZ += dt * 14;
            goalZ = Math.max(-34, Math.min(28, goalZ));
            camZ += (goalZ - camZ) * Math.min(1, dt * 7);
            placeCam();
            if (p.released && downY !== null) {
                downY = null;
                if (dragged < 12) {
                    let best = null, bd = 34;
                    for (const m of MISSIONS) { const n = NODE[m.id], q = P(n.x, flags.get(m.id).base + 0.6, n.z), dist = Math.hypot(q.x - p.x, q.y - p.y); if (dist < bd) { bd = dist; best = m.id; } }
                    if (best) choose(best);
                }
            }
        });
        s.onDraw((d) => {
            // Roads between flags, then labels.
            for (const m of MISSIONS) for (const nx of LINKS[m.id] ?? []) {
                const a = NODE[m.id], b = NODE[nx], ya = flags.get(m.id).base + 0.05, yb = flags.get(nx).base + 0.05;
                const done = meta.cleared[m.id] != null;
                for (let i = 0; i < 6; i++) {
                    const u = (i + 0.25) / 6, w = (i + 0.75) / 6, p = P(a.x + (b.x - a.x) * u, ya + (yb - ya) * u, a.z + (b.z - a.z) * u), q = P(a.x + (b.x - a.x) * w, ya + (yb - ya) * w, a.z + (b.z - a.z) * w);
                    d.line([p.x, p.y], [q.x, q.y], { width: 6, color: INK, opacity: 0.5 });
                    d.line([p.x, p.y], [q.x, q.y], { width: 3, color: done ? "#ffe9a0" : "#fff" });
                }
            }
            for (const m of MISSIONS) {
                const n = NODE[m.id], e = flags.get(m.id), q = P(n.x, e.base, n.z);
                if (q.y < -30 || q.y > s.view.height + 30) continue;
                const st = meta.cleared[m.id];
                if (st != null) for (let i = 0; i < 3; i++) d.sprite(i < st ? "star" : "starhole", { x: q.x + (i - 1) * 12, y: q.y + 14, width: 13, height: 13 });
                if (sel === m.id) { d.circle(19 + Math.sin(t * 6) * 2, { x: q.x, y: q.y + 2, color: "#fff27a", opacity: 0.35 }); }
                if (m.boss && st == null) outlined(d, "BOSS", q.x, q.y + 14, 10, "#ffb2a4", INK, 1);
            }
        });
        s.add([ui(), layer(45), pos(0, 0), { name: "card", draw(d) {
            const W = s.view.width, H = s.view.height, wide = W > H;
            if (sel) {
                const sf = s.view.safe, m = MISSION[sel], cw = wide ? 212 : W - 10, ch = wide ? H - 62 - sf.top : 228 + sf.bottom, cx = wide ? W - sf.right - cw / 2 - 2 : W / 2, cy = wide ? H / 2 + 26 + sf.top / 2 : H - ch / 2 - 2;
                card(d, cx, cy, cw, ch, { r: 14 });
                const x0 = cx - cw / 2 + 10, y0 = cy - ch / 2 + 15;
                leftText(game, d, m.name, x0, y0, 16);
                leftText(game, d, `${ZONES[m.zone].name} · ${GOAL[m.win]} · ${m.rounds} rounds`, x0, y0 + 17, 11, "#b0603a");
                wrap(m.brief, Math.floor((cw - 18) / 6.4)).slice(0, 2).forEach((tl, i) => leftText(game, d, tl, x0, y0 + 34 + i * 15, 12, "#5a4a44", false));
                const stars = m.stars ?? [];
                stars.forEach((b, i) => { const on = (meta.cleared[m.id] ?? 0) > i + 1; d.sprite(on ? "star" : "starhole", { x: x0 + 6, y: y0 + 66 + i * 15, width: 12, height: 12 }); leftText(game, d, BONUS_TEXT[b.k](b), x0 + 16, y0 + 66 + i * 15, 11, "#6a5a4a", false); });
                btns.go.cap = picks.length >= Math.min(m.squad, available(meta).length) ? "Start Battle" : `Pick ${m.squad - picks.length} more`;
                btns.go.disabled = !picks.length;
                if (m.recruit && !meta.roster[m.recruit]) leftText(game, d, `Win: ${PIGEONS[m.recruit].name} joins`, x0 + (wide ? 0 : cw - 150), y0 + (wide ? 100 : 66), 11, "#8b3f9c");
            }
        } }]);
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, wide = W > H;
            const here = Object.entries(zoneZ).find(([, [a, b]]) => camZ <= a && camZ > b)?.[0] ?? "lawn";
            const L = s.view.safe.left, T = s.view.safe.top;
            card(d, L + 62, T + 28, 112, 40, { r: 11 });
            d.sprite("seed", { x: L + 18, y: T + 20, width: 15, height: 15 }); leftText(game, d, String(meta.seeds), L + 28, T + 20, 13, "#8a5a1c");
            d.sprite("star", { x: L + 66, y: T + 20, width: 15, height: 15 }); leftText(game, d, `${totalStars(meta)}`, L + 76, T + 20, 13, "#8a5a1c");
            leftText(game, d, ZONES[here].name, L + 12, T + 37, 11, "#6a5a4a");
            if (sel) for (const f of faceBtns) {
                const on = picks.includes(f.k);
                f.tint = on ? PAL.gold : PAL.cream;
                d.sprite(`face_${f.k}`, { x: f.pos.x, y: f.pos.y, width: f.size.x - 6, height: f.size.x - 6, opacity: on ? 1 : 0.55 });
            }
            if (overlay) { const w = 240; card(d, W / 2, 70, w, 30, { fill: "#fff1b0", r: 10 }); label(d, overlay.text, W / 2, 70, 12); }
        });
        // First visit: how hard should loss feel?
        if (modal) {
            const W = s.view.width, H = s.view.height;
            const dim2 = s.add([ui(), layer(79), { draw(d) { d.rect(W * 2, H * 2, { color: "#201830", opacity: 0.6 }); }, name: "dim" }, pos(W / 2, H / 2)]);
            const pick = (perma) => { const f = loadMeta(game); f.perma = perma; f.chosen = true; saveMeta(game, f); meta.perma = perma; meta.chosen = true; modal = false; for (const e of [a, b, c]) e.destroy(); dim2.destroy(); S.select(game); };
            const c = s.add([ui(), layer(80), pos(W / 2, H / 2 - 58), { name: "ask", draw(d) { card(d, 0, 0, 290, 60, { r: 14 }); label(d, "If a pigeon goes down...", 0, -12, 16); label(d, "You can change this any time on the title screen.", 0, 12, 10.5, "#7d6a58", false); } }]);
            const a = s.add([ui(), layer(80), pos(W / 2, H / 2 + 8), toy("They walk it off", { width: 250, height: 48, color: PAL.green, textSize: 16, onTap: () => pick(false) }), { name: "soft" }]);
            const b = s.add([ui(), layer(80), pos(W / 2, H / 2 + 66), toy("Permadeath: gone for good", { width: 250, height: 48, color: PAL.red, textSize: 15, onTap: () => pick(true) }), { name: "hard" }]);
        }
        void [FONT, ENEMIES];
    });
}

// ---- The roost: spend seeds ----

export function roostScene(game) {
    game.scene("roost", (s) => {
        const meta = loadMeta(game);
        game.audio.muted = !meta.settings.sound; game.touch.enabled = false;
        s.background = ["#3b2f6b", "#ff9f7a"];
        const owned = CLASSES.filter((k) => meta.roster[k] && !meta.roster[k].dead);
        let cur = owned[0] ?? "sarge", t = 0;
        const rows = [], btn = [];
        const wide = () => s.view.width > s.view.height;
        const slot = (i) => {
            const W = s.view.width, sf = s.view.safe;
            if (wide()) return { x: sf.left + 46 + (i % 4) * 80, y: sf.top + 106 + Math.floor(i / 4) * 102 };
            return { x: W / 2 + ((i % 4) - 1.5) * 84, y: sf.top + 106 + Math.floor(i / 4) * 106 };
        };
        const birds = CLASSES.map((k, i) => s.add([ui(), layer(30), pos(0, 0), toy("", { width: 76, height: 92, color: PAL.cream, radius: 12, onTap: () => { if (meta.roster[k] && !meta.roster[k].dead) { cur = k; S.coo(game); refreshUps(); } else S.bad(game); } }), { name: `bird_${k}`, k, i }]));
        const back = s.add([ui(), layer(40), pos(0, 0), toy("Back", { width: 84, height: 50, color: PAL.grey, action: "pause", onTap: () => game.go("map", {}, { fade: 0.25 }) }), { name: "back" }]);
        const ups = [0, 1, 2].map((i) => s.add([ui(), layer(40), pos(0, 0), toy("", { width: 300, height: 48, color: PAL.gold, textColor: INK, textSize: 13, onTap: () => buy(i) }), { name: `up${i}` }]));
        function buy(i) {
            const u = PIGEONS[cur].ups[i];
            if (buyUpgrade(meta, cur, u.id)) { saveMeta(game, meta); S.buy(game); s.shake(3, 0.12, { haptic: false }); const e = ups[i]; s.burst({ at: [e.pos.x, e.pos.y], count: 18, color: ["#ffe27a", "#fff"], speed: [40, 180], life: [0.3, 0.6], size: [2, 5] }); refreshUps(); } else S.bad(game);
        }
        function refreshUps() {
            const p = PIGEONS[cur], r = meta.roster[cur];
            ups.forEach((e, i) => {
                const u = p.ups[i], got = r?.up[u.id];
                e.cap = "";
                e.disabled = got || meta.seeds < u.cost;
                e.tint = got ? PAL.green : PAL.gold;
                e.data = { u, got };
            });
        }
        const place = () => {
            const W = s.view.width, H = s.view.height, w = wide();
            const sf = s.view.safe;
            back.pos.set(W - sf.right - 50, sf.top + 32);
            birds.forEach((b) => { const q = slot(b.i); b.pos.set(q.x, q.y); });
            const ux = w ? W - sf.right - 150 : W / 2, uy = w ? sf.top + 184 : H - sf.bottom - 176, bw = w ? 280 : W - 24;
            ups.forEach((e, i) => { e.size.set(bw, 48, 0); e.pos.set(ux, uy + i * 56); });
        };
        place(); s.on("resize", place); refreshUps();
        s.onUpdate((dt) => { t += dt; });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, w = wide(), sf = s.view.safe;
            outlined(d, "The Roost", sf.left + 76, sf.top + 30, 22, "#ffd84a", INK, 2);
            d.sprite("seed", { x: W - sf.right - 134, y: sf.top + 32, width: 20, height: 20 });
            outlined(d, String(meta.seeds), W - sf.right - 112, sf.top + 32, 17, "#fff", INK, 1);
            for (const b of birds) {
                const own = meta.roster[b.k], dead = own?.dead, sel = b.k === cur;
                b.tint = sel ? PAL.gold : own ? PAL.cream : "#7c7690";
                const bobY = sel ? Math.sin(t * 5) * 2 : 0;
                d.sprite(`full_${b.k}`, { x: b.pos.x, y: b.pos.y - 8 + bobY, width: 66, height: 66, color: own && !dead ? "#ffffff" : "#26203a" });
                if (dead) d.sprite("skull", { x: b.pos.x, y: b.pos.y - 6, width: 34, height: 34 });
                else if (own) label(d, PIGEONS[b.k].name.replace("Slick ", "").replace("Lady ", "").replace("Sgt. ", ""), b.pos.x, b.pos.y + 34, 11);
                else label(d, "?", b.pos.x, b.pos.y + 34, 13, "#fff");
                if (own) { const n = Object.keys(own.up).length; for (let i = 0; i < n; i++) d.sprite("star", { x: b.pos.x + 26, y: b.pos.y - 34 + i * 11, width: 12, height: 12 }); }
            }
            const p = PIGEONS[cur], x = w ? W - sf.right - 150 : W / 2, y = w ? sf.top + 102 : H - sf.bottom - 252, cw = w ? 284 : W - 16;
            card(d, x, y, cw, 96 - (w ? 16 : 0), { r: 14 });
            leftText(game, d, `${p.name}, ${p.role}`, x - cw / 2 + 10, y - 32 + (w ? 6 : 0), 15);
            leftText(game, d, `Health ${p.hp}  Move ${p.mv}  ${p.actName}`, x - cw / 2 + 10, y - 15 + (w ? 6 : 0), 11, "#b0603a");
            wrap(p.actDesc, Math.floor((cw - 20) / 6.2)).slice(0, 2).forEach((l, i) => leftText(game, d, l, x - cw / 2 + 10, y + 2 + (w ? 4 : 0) + i * 14, 12, "#5a4a44", false));
            leftText(game, d, `"${p.tag}"`, x - cw / 2 + 10, y + 32 + (w ? -4 : 0), 10.5, "#9a8a78", false);
            ups.forEach((e) => {
                const { u, got } = e.data;
                const lx = e.pos.x - e.size.x / 2 + 12;
                leftText(game, d, u.name, lx, e.pos.y - 8, 13.5, got || e.disabled ? "#fff" : INK);
                leftText(game, d, u.desc, lx, e.pos.y + 9, 11, got || e.disabled ? "#f4f0f8" : "#5a3c10", false);
                if (got) label(d, "Owned", e.pos.x + e.size.x / 2 - 34, e.pos.y, 12, "#fff");
                else { d.sprite("seed", { x: e.pos.x + e.size.x / 2 - 42, y: e.pos.y, width: 16, height: 16 }); label(d, String(u.cost), e.pos.x + e.size.x / 2 - 22, e.pos.y, 15, e.disabled ? "#fff" : INK); }
            });
        });
        void rows; void btn; void BIRD;
    });
}

// ---- Bird Brain ----

export function rogueScene(game) {
    game.scene("rogue", (s, args = {}) => {
        const meta = loadMeta(game), set = meta.settings;
        game.audio.muted = !set.sound; game.touch.enabled = false;
        s.background = ["#3a2a6e", "#a24f8c"];
        if (set.music) playSong(game, "tense");
        const run = meta.run ?? newRun(1);
        meta.run = run;
        let t = 0, mode = args.rewards ? "reward" : "next", chosen = false;
        const offers = args.rewards ? rewardsFor(run) : [], ent = [];
        const W0 = () => s.view.width, H0 = () => s.view.height;
        const add = (cap, o, x, y) => { const e = s.add([ui(), layer(40), pos(x, y), toy(cap, o), { name: cap || "offer" }]); ent.push(e); return e; };
        const back = add("", { width: 50, height: 50, icon: "i_menu", color: PAL.grey, onTap: () => game.go("title", {}, { fade: 0.25 }) }, W0() - 28, 28);
        const quitRun = () => { const f = loadMeta(game); f.best = Math.max(f.best, run.depth); f.run = null; saveMeta(game, f); game.go("title", {}, { fade: 0.3 }); };
        if (run.depth >= RUN_LENGTH) mode = "won";
        let goBtn = null;
        const offerBtns = [];
        const launch = () => {
            const { mission } = genMission(run);
            saveMeta(game, meta);
            const squad = run.squad.map((p) => ({ k: p.k, up: { ...p.up }, hp: p.hp ?? undefined }));
            game.go("battle", {
                mission, squad, rogue: true,
                onWin: (st) => { afterBattle(run, st); meta.best = Math.max(meta.best, run.depth); saveMeta(game, meta); return `Sortie ${run.depth} of ${RUN_LENGTH} done`; },
                onLose: () => { const f = loadMeta(game); f.best = Math.max(f.best, run.depth); f.run = null; saveMeta(game, f); },
                next: () => game.go("rogue", { rewards: run.depth < RUN_LENGTH }, { fade: 0.3 }),
                quit: () => { const f = loadMeta(game); if (!f.run) game.go("title", {}, { fade: 0.3 }); else quitRun(); },
            }, { fade: 0.3 });
        };
        const layoutBtns = () => {
            const sf = s.view.safe;
            back.pos.set(W0() - sf.right - 32, sf.top + 32);
            if (goBtn) goBtn.pos.set(W0() / 2, H0() - sf.bottom - 42);
            offerBtns.forEach((e, i) => { const w = Math.min(W0() - 20, 340); e.size.set(w, 66, 0); e.pos.set(W0() / 2, Math.min(H0() - sf.bottom - 44 - (offerBtns.length - 1 - i) * 74, H0() * 0.42 + i * 74)); });
        };
        if (mode === "next") goBtn = add(`Start Sortie ${run.depth + 1}`, { width: 220, height: 56, color: PAL.green, textSize: 19, action: "confirm", onTap: launch }, W0() / 2, H0() - 46);
        if (mode === "won") goBtn = add("Hang up your wings", { width: 240, height: 56, color: PAL.gold, textColor: INK, textSize: 17, action: "confirm", onTap: quitRun }, W0() / 2, H0() - 46);
        if (mode === "reward") offers.forEach((o, i) => {
            const e = add("", { width: 320, height: 66, color: PAL.cream, textColor: INK, onTap: () => {
                if (chosen) return; chosen = true; applyReward(run, o); saveMeta(game, meta); S.buy(game);
                game.go("rogue", {}, { fade: 0.25 });
            } }, 0, 0);
            e.offer = o; offerBtns.push(e); void i;
        });
        layoutBtns(); s.on("resize", layoutBtns);
        s.onUpdate((dt) => { t += dt; });
        s.onDrawUI((d) => {
            const W = W0(), H = H0();
            outlined(d, mode === "won" ? "You Absolute Unit" : "Bird Brain", W / 2, 34, mode === "won" ? 24 : 28, "#ffd84a", INK, 2);
            label(d, mode === "won" ? "A random squad took the whole park." : `Sortie ${Math.min(RUN_LENGTH, run.depth + 1)} of ${RUN_LENGTH}. Random squad. One life.`, W / 2, 62, 12, "#ffe9d6");
            for (let i = 0; i < RUN_LENGTH; i++) { const x = W / 2 + (i - 3.5) * 26, y = 84; d.circle(9, { x, y, color: INK }); d.circle(7, { x, y, color: i < run.depth ? PAL.gold : i === run.depth ? "#fff" : "#6a5a8a" }); }
            const n = run.squad.length, wide = W > H, sz = wide ? 92 : Math.min(110, (W - 10) / Math.max(3, n));
            run.squad.forEach((p, i) => {
                const x = W / 2 + (i - (n - 1) / 2) * (sz + 2) + (mode === "reward" && wide ? -W * 0.33 + (i - (n - 1) / 2) * (-sz * 0.3) : 0), y = mode === "reward" ? 124 + sz * 0.15 : H * 0.42;
                const bob = Math.sin(t * 3 + i) * 2, q = mode === "reward" ? sz * 0.7 : sz;
                d.sprite(`full_${p.k}`, { x, y: y + bob, width: q, height: q });
                if (mode !== "reward") {
                    label(d, PIGEONS[p.k].name, x, y + q * 0.56, 11.5, "#fff");
                    label(d, PIGEONS[p.k].role, x, y - q * 0.56, 10.5, "#ffc9e0");
                    const mh = PIGEONS[p.k].hp + (p.up.hp ? 1 : 0), hp = p.hp ?? mh;
                    for (let k = 0; k < mh; k++) d.rect(9, 5, { x: x + (k - (mh - 1) / 2) * 11, y: y + q * 0.56 + 13, color: k < hp ? "#5be37d" : "#463a4e", radius: 2 });
                    const ul = Object.keys(p.up).map((id) => PIGEONS[p.k].ups.find((u) => u.id === id)?.name).filter(Boolean);
                    ul.slice(0, 3).forEach((nm, k) => label(d, nm, x, y + q * 0.56 + 25 + k * 12, 9.5, "#ffe59e", false));
                }
            });
            if (mode === "reward" && W < H) label(d, "Take one", W / 2, offerBtns[0] ? offerBtns[0].pos.y - 50 : H / 2, 16, "#fff");
            for (const e of offerBtns) {
                const o = e.offer, lx = e.pos.x - e.size.x / 2 + 14;
                if (o.k) d.sprite(`face_${o.k}`, { x: lx + 16, y: e.pos.y, width: 42, height: 42 });
                const tx = lx + (o.k ? 42 : 4);
                leftText(game, d, o.title, tx, e.pos.y - 14, 14, INK);
                wrap(o.text, Math.floor((e.size.x - 64) / 6)).slice(0, 2).forEach((l, i) => leftText(game, d, l, tx, e.pos.y + 4 + i * 13, 11.5, "#5a4a44", false));
            }
        });
    });
}

// ---- The end of the campaign ----

export function endingScene(game) {
    game.scene("ending", (s) => {
        const meta = loadMeta(game);
        game.touch.enabled = false;
        if (meta.settings.music) { game.data._song = null; playSong(game, "title"); }
        const m = { ...TITLE_BOARD, id: "ending", zone: "lawn", win: "rout", rounds: 9, foes: [], props: [["bag", 3, 3], ["bag", 4, 3], ["bag", 3, 4], ["bag", 4, 4]], deploy: [[2, 2], [5, 2], [1, 4], [6, 4], [2, 6], [5, 6], [3, 6], [4, 6]] };
        const st = newBattle(m, CLASSES.map((k) => ({ k, up: {} })));
        const v = new View(game, s, "lawn", m, st.tiles);
        v.sync(st);
        const fit = () => { const W = s.view.width, H = s.view.height; v.fit(W > H ? { x: W * 0.36, y: 0, w: W * 0.64, h: H } : { x: 0, y: H * 0.3, w: W, h: H * 0.56 }); };
        fit(); s.on("resize", fit);
        const lines = ["The Swan left. Nobody saw it go.", "Old Reg finally remembered the big bread.", "It was a bag. It was always this bag.", "The park is yours, Squad."];
        let t = 0;
        S.win(game);
        s.onUpdate((dt) => {
            t += dt; v.update(dt);
            if (Math.floor(t * 60) % 30 === 0) { const list = [...v.actors.values()].filter((a) => a.side === 0); const a = list[Math.floor(game.fxRng.next() * list.length)]; if (a) { a.flap = 0.5; a.move(a.x, a.z, 0.3, { arc: 0.6 }); v.say(a.id, PIGEONS[a.k].barks[Math.floor(game.fxRng.next() * 6)], 1.4); } }
            if (Math.floor(t * 60) % 40 === 0) v.bits("spark", (game.fxRng.next() - 0.5) * 7, 2.5, (game.fxRng.next() - 0.5) * 7, 14, { speed: 2, up: 2, life: 0.8, size: 11 });
        });
        const b = s.add([ui(), layer(40), pos(0, 0), toy("Back to the Park", { width: 210, height: 52, color: PAL.green, textSize: 17, action: "confirm", onTap: () => game.go("map", {}, { fade: 0.3 }) }), { name: "done" }]);
        const place = () => b.pos.set(s.view.width > s.view.height ? s.view.width * 0.18 : s.view.width / 2, s.view.height - 44);
        place(); s.on("resize", place);
        s.onDraw((d) => { v.drawFx(d); v.drawBubbles(d); });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, wide = W > H, cx = wide ? W * 0.18 : W / 2, wr = wide ? 26 : 36;
            outlined(d, "SQUAD GOALS", cx, 40, wide ? 26 : 32, "#ffd84a", INK, 2);
            let y = 76;
            lines.forEach((l, i) => { const o = Math.max(0, Math.min(1, t - i * 1.1)); for (const q of wrap(l, wr)) { label(d, q, cx, y, 14, "#23401f", true, { opacity: o }); y += 18; } y += 4; });
            label(d, `${totalStars(meta)} of ${MISSIONS.length * 3} stars`, cx, y + 8, 12, "#23401f", true, { opacity: Math.max(0, Math.min(1, t - 4.5)) });
            void H;
        });
    });
}
