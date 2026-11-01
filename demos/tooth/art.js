// All art for Hollow Tooth, painted in code. One palette per area, one light source (the dentist's head mirror).
import { AREAS } from "./world.js";

export const PAL = {
    gum:     { deep: "#1a060e", rock2: "#2a0a18", rock: "#3d1024", rim: "#ff6f91", rim2: "#b02a55", sky: ["#3a0f24", "#14040c"], glow: "#ff5c8a", far: "#5c1a38", near: "#2e0b1d", amb: 0.46, acid: "#ffb3c6", foe: "#ffc2d1", deco: "#ff8fab" },
    enamel:  { deep: "#0a1220", rock2: "#142238", rock: "#22385a", rim: "#e6f4ff", rim2: "#8fb8e6", sky: ["#1f3a5f", "#0a1424"], glow: "#a8d8ff", far: "#2c4c74", near: "#172a46", amb: 0.32, acid: "#9fd8ff", foe: "#d8eaff", deco: "#cfe6ff" },
    sugar:   { deep: "#140a26", rock2: "#22103c", rock: "#35185a", rim: "#ff9df5", rim2: "#8a5cff", sky: ["#3a1a6e", "#120828"], glow: "#ff7df0", far: "#4f2a92", near: "#28125a", amb: 0.38, acid: "#ff9df5", foe: "#ffd0fa", deco: "#7df9ff" },
    tongue:  { deep: "#220812", rock2: "#3c0e20", rock: "#5e1a34", rim: "#ffa3b5", rim2: "#d6456f", sky: ["#6e2342", "#220812"], glow: "#ff9db0", far: "#8a3355", near: "#4a1329", amb: 0.24, acid: "#ffd0dc", foe: "#ffe0e6", deco: "#ffb3c1" },
    swamp:   { deep: "#0c1006", rock2: "#182009", rock: "#28340f", rim: "#d4e157", rim2: "#7c9a1e", sky: ["#2c3a12", "#0a0e04"], glow: "#c6ff4d", far: "#3c4e18", near: "#1c260a", amb: 0.5, acid: "#b6f03c", foe: "#e4f2a0", deco: "#b6f03c" },
    nerve:   { deep: "#10081c", rock2: "#1c0e30", rock: "#2c1648", rim: "#ffe066", rim2: "#b98cff", sky: ["#2b1650", "#0c0618"], glow: "#ffe066", far: "#3f2470", near: "#1e0f38", amb: 0.56, acid: "#ffe066", foe: "#fff0b0", deco: "#ffe066" },
    tonsil:  { deep: "#06141a", rock2: "#0c2228", rock: "#1a3c44", rim: "#7ff5d8", rim2: "#2ba58f", sky: ["#123e48", "#051216"], glow: "#62ffd8", far: "#1f5560", near: "#0e2a32", amb: 0.46, acid: "#7ff5d8", foe: "#c8fff0", deco: "#ff9db8" },
    throat:  { deep: "#050205", rock2: "#10050c", rock: "#1e0a16", rim: "#8e2b4e", rim2: "#4c1228", sky: ["#180610", "#030103"], glow: "#c23a6a", far: "#25091a", near: "#0d0309", amb: 0.8, acid: "#c23a6a", foe: "#e9a0b8", deco: "#c23a6a" },
    stomach: { deep: "#140c02", rock2: "#261804", rock: "#3e2a08", rim: "#ffc24d", rim2: "#b0741a", sky: ["#4a3208", "#120a02"], glow: "#ffd24d", far: "#5c4210", near: "#2a1c06", amb: 0.42, acid: "#e8f03c", foe: "#ffe6a0", deco: "#e8f03c" },
    pulp:    { deep: "#160204", rock2: "#2a0408", rock: "#4a0a10", rim: "#ffd27a", rim2: "#e0402e", sky: ["#5a0c14", "#120204"], glow: "#ff6a3c", far: "#701820", near: "#380609", amb: 0.5, acid: "#ff6a3c", foe: "#ffd9b0", deco: "#ffd27a" },
};
export const palOf = (id) => PAL[AREAS[id[0]].key];

const hex = (s) => { const n = parseInt(s.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hash2 = (x, y, s = 0) => { let h = Math.imul(x * 374761393 + y * 668265263 + s * 1274126177, 1274126177) >>> 0; h = Math.imul(h ^ h >>> 13, 1103515245) >>> 0; return (h ^ h >>> 16) / 4294967296; };
function vnoise(x, y, p, s) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const w = (a) => ((a % p) + p) % p;
    const n = (a, b) => hash2(w(a), w(b), s);
    return (n(xi, yi) * (1 - sx) + n(xi + 1, yi) * sx) * (1 - sy) + (n(xi, yi + 1) * (1 - sx) + n(xi + 1, yi + 1) * sx) * sy;
}

export const TS = 36, TILE_PX = 16 * 36 / 32;   // A tile frame is 36px: a 32px tile plus a 2px bleed, drawn 18 units wide.

/** Edge tile sheet: frames are mask (1 N, 2 E, 4 S, 8 W exposed) + 16 * variant. */
function paintTiles(assets, key, P) {
    const rock = hex(P.rock), rim = hex(P.rim), rim2 = hex(P.rim2), rock2 = hex(P.rock2), deep = hex(P.rock2).map((v, i) => (v + hex(P.deep)[i]) / 2);
    const salt = key.length * 7 + key.charCodeAt(0);
    assets.paint(`tiles_${key}`, TS, TS, (p, frame) => {
        const mask = frame & 15, v = frame >> 4, N = mask & 1, E = mask & 2, S = mask & 4, Wst = mask & 8;
        const d = p.data;
        for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
            const px = x - 2, py = y - 2;
            const dn = N ? py : 99, ds = S ? 31 - py : 99, dw = Wst ? px : 99, de = E ? 31 - px : 99;
            let edge = Math.min(dn, ds, dw, de);
            // Rounded convex corners.
            const R = 11;
            const corner = (a, b) => { if (a < R && b < R) { const q = Math.hypot(R - a, R - b); return R - q; } return 99; };
            if (N && Wst) edge = Math.min(edge, corner(dn, dw)); if (N && E) edge = Math.min(edge, corner(dn, de));
            if (S && Wst) edge = Math.min(edge, corner(ds, dw)); if (S && E) edge = Math.min(edge, corner(ds, de));
            const wob = (vnoise((px + v * 13) / 8, (py + v * 7) / 8, 4, salt) - 0.5) * 7 + (vnoise(px / 3, py / 3, 11, salt + 1) - 0.5) * 2.2;
            const e = edge + wob;
            if (e < 0) continue;
            const pores = vnoise(px / 5 + v, py / 5, 7, salt + 2), fine = vnoise(px / 2, py / 2, 16, salt + 3);
            // Fades into the flat dark fill that interior tiles get, so rock has no visible tile steps.
            let c = mix(rock, rock2, Math.max(0, pores - 0.45) * 1.3);
            if (mask) c = mix(c, deep, Math.min(1, Math.max(0, (e - 5) / 22)));
            else c = deep;
            if (mask && fine > 0.72 && e < 20) c = mix(c, rim2, 0.16 * (1 - e / 20));
            if (mask && e < 11) {
                // Lit skin: top edges catch the light, undersides stay in shadow.
                const top = N ? 1 - Math.min(1, dn / 12) : 0, side = (Wst || E) ? 0.45 : 0, under = S ? 0.2 : 0;
                const k = Math.max(top, side, under) * (1 - e / 11);
                c = mix(c, rim2, Math.min(1, k * 1.5));
                if (e < 4.4 && (N || side)) c = mix(c, rim, (N ? 1 : 0.65) * (1 - e / 4.4));
            }
            const i = p.index(x, y), a = Math.min(1, e * 1.2);
            d[i] = c[0] * a + d[i] * (1 - a) | 0; d[i + 1] = c[1] * a + d[i + 1] * (1 - a) | 0; d[i + 2] = c[2] * a + d[i + 2] * (1 - a) | 0; d[i + 3] = 255 * a | 0;
        }
    }, { frames: 32, smooth: true });
}

function glowSprite(assets) {
    assets.paint("glow", 128, 128, (p) => {
        for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
            const r = Math.hypot(x - 63.5, y - 63.5) / 63.5, k = Math.max(0, 1 - r), a = k * k * (3 - 2 * k), v = a * a * 0.5 + a * 0.5, i = p.index(x, y);
            p.data[i] = p.data[i + 1] = p.data[i + 2] = v * 255 | 0; p.data[i + 3] = v * 255 | 0;
        }
    }, { smooth: true });
    // Darkness mask: black everywhere, with a soft hole in the middle.
    assets.paint("dark", 256, 256, (p) => {
        for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
            const r = Math.hypot(x - 127.5, y - 127.5) / 127.5, a = Math.min(1, Math.max(0, (r - 0.16) / 0.8)), i = p.index(x, y);
            p.data[i] = p.data[i + 1] = p.data[i + 2] = 0; p.data[i + 3] = (a * a * (3 - 2 * a)) * 255 | 0;
        }
    }, { smooth: true });
    assets.paint("bubble", 32, 32, (p) => p.circle(16, 16, 13, "#ffffff40").circle(16, 16, 13, "#ffffff00").ellipse(11, 11, 4, 3, "#ffffffcc"), { smooth: true });
}

// Hero: a tiny dentist with a head mirror, a mask and a very large drill.
function hero(assets) {
    const FR = { idle0: 0, idle1: 1, run0: 2, run1: 3, run2: 4, run3: 5, jump: 6, fall: 7, wall: 8, drill: 9, drillUp: 10, drillDown: 11, swing: 12, dash: 13, hurt: 14, hang: 15, chute: 16, mirror: 17 };
    const poses = [
        { b: 0, legA: 0, legB: 0, arm: 0.2 }, { b: 1, legA: 0, legB: 0, arm: 0.3 },
        { b: 0, legA: 7, legB: -6, arm: 0.1, lean: 2 }, { b: -1, legA: 2, legB: -1, arm: 0.2, lean: 2 }, { b: 0, legA: -6, legB: 7, arm: 0.1, lean: 2 }, { b: -1, legA: -1, legB: 2, arm: 0.2, lean: 2 },
        { b: -1, legA: 4, legB: -5, arm: -0.9 }, { b: 0, legA: -3, legB: 4, arm: -1.5 }, { b: 0, legA: 2, legB: 2, arm: 1.2, lean: -3 },
        { b: 0, legA: 5, legB: -4, arm: 0, drill: 1, lean: 3 }, { b: 0, legA: 2, legB: -2, arm: -1.5, drill: 1 }, { b: 0, legA: -2, legB: 2, arm: 1.55, drill: 1 },
        { b: 0, legA: -4, legB: 4, arm: -1.4, lean: 2 }, { b: 2, legA: 9, legB: -8, arm: 0.2, lean: 6 }, { b: 1, legA: 5, legB: -6, arm: -2.2, lean: -4 },
        { b: 0, legA: 3, legB: -3, arm: -1.57 }, { b: 0, legA: 2, legB: -3, arm: -1.5 }, { b: 0, legA: 0, legB: 0, arm: -0.7, mirror: 1 },
    ];
    assets.paint("hero", 64, 64, (p, f) => {
        const q = poses[f], cx = 28 + (q.lean ?? 0), by = 40 + q.b, ink = "#1c2233";
        p.ellipse(32, 60, 13, 2.5, "#00000033");
        // Legs and shoes.
        p.line(26, by + 8, 26 + q.legA, 56, "#39506e", 5).line(34, by + 8, 34 + q.legB, 56, "#2c3f5a", 5);
        p.ellipse(27 + q.legA, 57, 5, 3, "#f2f6fb").ellipse(35 + q.legB, 57, 5, 3, "#d3dde8");
        // Coat.
        p.poly([[cx - 10, by - 8], [cx + 10, by - 8], [cx + 12, by + 12], [cx - 12, by + 12]], "#f4f8fc");
        p.line(cx, by - 8, cx, by + 12, "#b9cadb", 1.5);
        p.rect(cx - 11, by + 8, 22, 4, "#d7e3ee");
        // Head.
        const hy = by - 19;
        p.ellipse(cx + 1, hy, 15, 14, "#ffe1c8", "#f4b995");
        p.ellipse(cx + 1, hy - 9, 15, 8, "#2f3f63");            // Hair cap.
        p.rect(cx - 12, hy - 9, 27, 3, "#eaf2f8");              // Head strap.
        p.ellipse(cx + 2, hy + 7, 12, 7, "#55d6c2", "#2aa596");  // Mask.
        p.circle(cx + 4, hy - 1, 3.2, ink).circle(cx + 11, hy - 1, 2.8, ink).circle(cx + 5, hy - 2, 1.1, "#fff").circle(cx + 12, hy - 2, 1, "#fff");
        p.circle(cx + 6, hy - 11, 6, "#fff4b0", "#c9a93c").circle(cx + 6, hy - 11, 2.2, "#ffffff");  // Head mirror.
        // Arm and tool.
        const ax = cx + 2, ay = by - 3, L = 15, ex = ax + Math.cos(q.arm) * L, ey = ay + Math.sin(q.arm) * L;
        p.line(ax, ay, ex, ey, "#f4f8fc", 6).circle(ex, ey, 3.4, "#ffe1c8");
        if (q.mirror) {
            p.line(ex, ey, ex + 9, ey - 8, "#c9d7e4", 2.5).ellipse(ex + 12, ey - 11, 6, 8, "#ffffff", "#7fd6ff").outline(ink);
        } else {
            const dl = q.drill ? 20 : 13, tx = ex + Math.cos(q.arm) * dl, ty = ey + Math.sin(q.arm) * dl;
            p.line(ex - 1, ey, ex + Math.cos(q.arm) * 7, ey + Math.sin(q.arm) * 7, "#5f7690", 7);
            p.line(ex + Math.cos(q.arm) * 7, ey + Math.sin(q.arm) * 7, tx, ty, "#d6dee8", q.drill ? 3.5 : 3);
            p.circle(tx, ty, 2.4, q.drill ? "#ffe066" : "#ffffff");
        }
        p.outline(ink);
    }, { frames: 18, smooth: true });
    return FR;
}

const npcLooks = {
    gus:   { body: "#ffb3c6", kind: "tooth", hat: "band" }, wally: { body: "#ffd6a5", kind: "blob", hat: "cap" }, mabel: { body: "#bde0fe", kind: "tooth", hat: "bun" }, mort: { body: "#c9c9c9", kind: "tooth", hat: "gold" },
    fairy: { body: "#ffc8f0", kind: "fairy" }, enid: { body: "#e6f4ff", kind: "tooth", hat: "bun" }, dot: { body: "#caffbf", kind: "blob", hat: "band" }, cuspid: { body: "#fff1c9", kind: "tooth", hat: "gold" },
    lolly: { body: "#ff9df5", kind: "blob", hat: "bun" }, fizz: { body: "#9bf6ff", kind: "blob", hat: "cap" }, chip: { body: "#fdffb6", kind: "tooth", hat: "cap" }, salty: { body: "#ffffff", kind: "tooth", hat: "band" },
    bud: { body: "#ffadad", kind: "blob", hat: "cap" }, mint: { body: "#b9fbc0", kind: "tooth", hat: "bun" }, bog: { body: "#c5e063", kind: "blob", hat: "band" }, crusty: { body: "#d9c27f", kind: "tooth", hat: "gold" },
    brine: { body: "#a0e7e5", kind: "blob", hat: "cap" }, sparky: { body: "#ffe066", kind: "tooth", hat: "band" }, tilly: { body: "#7ff5d8", kind: "blob", hat: "bun" }, adna: { body: "#ffc6d9", kind: "tooth", hat: "cap" },
    sal: { body: "#ffd6e0", kind: "blob", hat: "gold" }, hal: { body: "#cdb4db", kind: "tooth", hat: "band" }, echo: { body: "#a2a2d0", kind: "blob", hat: "bun" }, rennie: { body: "#ffe6a0", kind: "tooth", hat: "cap" },
    gaster: { body: "#e8f03c", kind: "blob", hat: "band" }, molar: { body: "#fff4e0", kind: "tooth", hat: "gold" },
};
export const NPC_INDEX = Object.fromEntries(Object.keys(npcLooks).map((k, i) => [k, i]));

function npcs(assets) {
    const names = Object.keys(npcLooks);
    assets.paint("npc", 64, 64, (p, fr) => {
        const f = fr % 2, q = npcLooks[names[fr >> 1]], ink = "#20182a", by = 44 + f, body = q.body;
        p.ellipse(32, 61, 15, 2.6, "#00000040");
        if (q.kind === "tooth") {
            p.ellipse(32, by - 10, 17, 16, "#ffffff", body).ellipse(21, by + 7, 6, 11, "#ffffff", body).ellipse(43, by + 7, 6, 11, "#ffffff", body).rect(21, by - 8, 22, 12, body);
            p.ellipse(25, by - 18, 5, 3.5, "#ffffffcc");
        } else if (q.kind === "fairy") {
            p.ellipse(16, 26 + f * 3, 12, 8, "#ffffff99").ellipse(48, 26 + f * 3, 12, 8, "#ffffff99");
            p.ellipse(32, 44, 10, 14, "#ffc8f0", "#ff7dc8").circle(32, 24, 11, "#ffe1d6").rect(14, 8, 36, 6, "#fff4b0").circle(32, 5, 4, "#ffe066");
        } else {
            p.ellipse(32, by - 4 - f, 18, 18 + f, body, "#00000022").ellipse(32, by + 12, 19, 6, body);
            p.ellipse(25, by - 14, 5, 3.5, "#ffffffbb");
        }
        const ey = q.kind === "fairy" ? 24 : by - 9;
        p.circle(26, ey, 3.5, "#fff").circle(38, ey, 3.5, "#fff").circle(27, ey + f * 0.6, 2, ink).circle(39, ey + f * 0.6, 2, ink);
        p.line(28, ey + 8, 36, ey + 8 + (f ? 1 : 0), ink, 2);
        if (q.hat === "cap") p.ellipse(32, by - 26, 13, 6, "#7a5cff").rect(30, by - 33, 4, 6, "#ffe066");
        if (q.hat === "bun") p.circle(32, by - 29, 6, "#b56576").rect(22, by - 26, 20, 3, "#b56576");
        if (q.hat === "band") p.line(14, by - 8, 50, by - 15, "#f4f4f4", 4).circle(46, by - 15, 3, "#ff6f91");
        if (q.hat === "gold") p.ellipse(32, by - 26, 12, 5, "#ffd24d", "#c9892b").circle(25, by - 28, 2, "#fff4b0");
        p.outline(ink);
    }, { frames: names.length * 2, smooth: true });
}

// Enemies paint in pale tones and take their colour from the area, so each cave has its own wildlife.
function foes(assets) {
    const ink = "#201420";
    const eyes = (p, x, y, r = 4, gap = 11) => p.circle(x, y, r, "#fff").circle(x + gap, y, r, "#fff").circle(x + 1, y + 0.5, r * 0.5, ink).circle(x + gap + 1, y + 0.5, r * 0.5, ink);
    const sheet = (name, n, fn) => assets.paint(name, 64, 64, (p, f) => { fn(p, f); p.outline(ink).shade(0.2, 0.15); }, { frames: n, smooth: true });
    sheet("foe_a", 3, (p, f) => {   // Germ crawler: spiky bean.
        const b = [0, 2, -1][f], y = 42 + b;
        for (let i = 0; i < 9; i++) { const a = -Math.PI + i * Math.PI / 8, x0 = 32 + Math.cos(a) * 22, y0 = y + Math.sin(a) * 15; p.line(x0, y0, x0 + Math.cos(a) * 6, y0 + Math.sin(a) * 6, "#c8c8d0", 3); }
        p.ellipse(32, y, 23, 15, "#ffffff", "#b8b8c4");
        for (let i = 0; i < 4; i++) p.ellipse(14 + i * 12, 57, 3, 4 + ((i + f) % 3), "#9a9aa8");
        eyes(p, 22, y - 3); p.line(25, y + 6, 39, y + 6, ink, 2);
    });
    sheet("foe_f", 2, (p, f) => {   // Flyer: buzzing plaque gnat.
        p.ellipse(18, 22 + f * 6, 14, 7 - f * 2, "#ffffffaa").ellipse(46, 22 + f * 6, 14, 7 - f * 2, "#ffffffaa");
        p.ellipse(32, 36, 15, 14, "#fff", "#b0b0bc"); eyes(p, 24, 33, 4.5, 12); p.poly([[29, 47], [35, 47], [32, 58]], "#8a8a98");
    });
    sheet("foe_j", 2, (p, f) => {   // Hopper: enamel chip on a spring leg.
        const h = f ? 8 : 0;
        p.poly([[14, 40 - h], [30, 16 - h], [52, 26 - h], [48, 46 - h], [24, 50 - h]], "#ffffff");
        p.line(26, 48 - h, 22, 58, "#a8a8b4", 4).line(40, 47 - h, 44, 58, "#a8a8b4", 4); eyes(p, 26, 32 - h, 4, 12); p.line(28, 41 - h, 38, 41 - h, ink, 2);
    });
    sheet("foe_s", 2, (p, f) => {   // Spitter: bulb with a mouth.
        p.ellipse(32, 56, 16, 6, "#a0a0ac"); p.ellipse(32, 36 - f * 2, 19, 21 + f * 3, "#ffffff", "#b4b4c0");
        p.circle(32, 22 - f * 2, f ? 8 : 5, ink); eyes(p, 23, 40, 3.5, 13);
    });
    sheet("foe_d", 2, (p, f) => {   // Dropper: drool blob hanging from the ceiling.
        p.ellipse(32, 20 + f * 6, 16, 16 + f * 7, "#ffffff", "#b8c4cc"); p.poly([[20, 6], [44, 6], [36, 20], [28, 20]], "#ffffff");
        eyes(p, 24, 22 + f * 6, 3.5, 12);
    });
    sheet("foe_k", 2, (p, f) => {   // Shielded beetle: armour in front, soft behind.
        p.ellipse(28, 40, 22, 17, "#c8c8d4", "#8c8c9c"); p.ellipse(50, 38, 8, 19, "#ffffff", "#a0a8b8");
        p.line(42, 26, 56, 50, "#7c8494", 2); p.circle(40, 36, 3, ink).circle(40.6, 36, 1.2, "#fff");
        for (let i = 0; i < 3; i++) p.line(16 + i * 12, 54, 16 + i * 12 - 3 + f * 6, 60, ink, 3);
    });
    sheet("foe_m", 2, (p, f) => {   // Burster: swollen sac.
        const r = 20 + f * 4; p.ellipse(32, 36, r, r - 1, "#ffffff", "#c0c0cc");
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3; p.circle(32 + Math.cos(a) * r * 0.62, 36 + Math.sin(a) * r * 0.62, 3, "#8e8e9c"); }
        eyes(p, 23, 32, 3.5, 13); p.ellipse(32, 44, 4, 3, ink);
    });
    assets.paint("shot", 32, 32, (p) => p.circle(16, 16, 10, "#ffffff", "#c8c8d0").circle(12, 12, 3, "#ffffffee").outline(ink), { smooth: true });
}

const B = 192;
function bosses(assets) {
    const ink = "#1a0f18";
    const eyes = (p, x, y, r, gap, col = "#fff", pup = ink) => p.circle(x, y, r, col).circle(x + gap, y, r, col).circle(x + r * 0.2, y + r * 0.2, r * 0.45, pup).circle(x + gap + r * 0.2, y + r * 0.2, r * 0.45, pup);
    const sheet = (name, fn) => assets.paint(name, B, B, (p, f) => { fn(p, f); p.outline(ink).shade(0.22, 0.2); }, { frames: 3, smooth: true });
    sheet("boss_tartar", (p, f) => {   // Sir Tartar: a knight of crusted plaque with a toothpick lance.
        const dy = f === 1 ? 8 : 0;
        p.ellipse(96, 130 + dy, 62, 50 - dy, "#e9d48a", "#9a7f3c");
        for (let i = 0; i < 12; i++) p.circle(40 + (i * 37) % 112, 110 + (i * 53) % 60 + dy, 6 + i % 5, i % 2 ? "#c8ae5e" : "#f7e9b4");
        p.ellipse(96, 74 + dy, 42, 40, "#c8cdd8", "#7c8496"); p.rect(58, 70 + dy, 76, 12, "#2b2f3a"); eyes(p, 78, 76 + dy, 7, 34, "#ffe066");
        p.poly([[96, 30 + dy], [120, 6], [110, 44 + dy]], "#ff6f91");
        p.line(150, 130 + dy, f === 1 ? 190 : 184, f === 1 ? 110 : 60, "#f2e3bd", 8); p.poly([[176, 66], [192, 34], [186, 74]], "#fff");
    });
    sheet("boss_bear", (p, f) => {   // Molar Bear: a huge white molar with ears and a terrible overbite.
        const dy = f === 1 ? 6 : 0;
        p.circle(52, 44 + dy, 22, "#f4f8ff", "#a8c0dc").circle(140, 44 + dy, 22, "#f4f8ff", "#a8c0dc").circle(52, 44 + dy, 11, "#ffb3c6").circle(140, 44 + dy, 11, "#ffb3c6");
        p.ellipse(96, 96 + dy, 76, 64, "#ffffff", "#b6cce6");
        p.ellipse(56, 164, 22, 26, "#e6f0fa", "#90a9c6").ellipse(136, 164, 22, 26, "#e6f0fa", "#90a9c6");
        eyes(p, 68, 80 + dy, 11, 56); p.ellipse(96, 108 + dy, 17, 12, ink);
        p.ellipse(96, 134 + dy, 42, f === 1 ? 24 : 14, "#7a1f3d"); for (let i = 0; i < 5; i++) p.rect(62 + i * 14, 122 + dy, 11, 14, "#fff");
    });
    sheet("boss_queen", (p, f) => {   // Queen Caramelita: a melting sugar sovereign.
        const s = f === 1 ? 10 : 0;
        p.ellipse(96, 140, 72, 46, "#ff9df5", "#8a2be2");
        for (let i = 0; i < 7; i++) p.ellipse(34 + i * 21, 176 - i % 2 * 6, 9, 14 + i % 3 * 5, "#b45cf0");
        p.ellipse(96, 84 - s / 2, 48 + s / 2, 52 + s / 2, "#ffc6fa", "#d05cf0");
        for (let i = 0; i < 5; i++) { const x = 52 + i * 22; p.poly([[x - 10, 34], [x + 10, 34], [x, 4 + (i % 2) * 12]], i % 2 ? "#7df9ff" : "#ffe066"); }
        p.rect(50, 30, 92, 8, "#ffe066"); eyes(p, 74, 78, 10, 44); p.ellipse(96, 112, 16, f === 1 ? 14 : 6, "#5a1080");
    });
    sheet("boss_bud", (p, f) => {   // Papilla Prime: a towering taste bud with a smug face and bouncy foot.
        const dy = f === 1 ? 10 : 0;
        p.ellipse(96, 172, 58, 16, "#c9305c", "#7a1636");
        p.ellipse(96, 104 + dy, 58, 74 - dy, "#ffb3c1", "#e0416f");
        for (let i = 0; i < 16; i++) { const a = i * 2.4, r = 14 + i * 3; p.circle(96 + Math.cos(a) * r, 104 + Math.sin(a) * r * 1.2 + dy, 5, "#ff8fa8"); }
        p.ellipse(96, 44 + dy, 40, 30, "#ffd1da", "#ff8fa8"); eyes(p, 74, 92 + dy, 12, 44); p.line(74, 126 + dy, 120, 120 + dy, ink, 5);
    });
    sheet("boss_bog", (p, f) => {   // Mother of Film: a vast slime with many small eyes.
        const w = f === 1 ? 10 : 0;
        p.ellipse(96, 128 + w / 2, 84 + w, 60 - w / 2, "#b6f03c", "#3e6a12");
        for (let i = 0; i < 9; i++) p.ellipse(18 + i * 20, 170, 8, 18 + (i * 7) % 16, "#6b9a20");
        for (let i = 0; i < 7; i++) { const x = 34 + (i * 41) % 124, y = 96 + (i * 29) % 56; eyes(p, x, y, 6 + i % 3, 0); }
        p.ellipse(96, 146, 30, f === 1 ? 18 : 8, "#22380a"); for (let i = 0; i < 4; i++) p.circle(60 + i * 26, 74 + i % 2 * 8, 8, "#e4f2a0");
    });
    sheet("boss_nerve", (p, f) => {   // The Exposed Nerve: a raw, furious electric tangle.
        const t = f === 1 ? 6 : 0;
        for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.2, x = 96 + Math.cos(a) * (72 + t), y = 96 + Math.sin(a) * (72 + t); p.line(96, 96, x, y, i % 2 ? "#ffe066" : "#ff7ab6", 8); p.circle(x, y, 8, "#fff7c2"); }
        p.circle(96, 96, 56 + t, "#ff7ab6", "#8e1b6a"); p.circle(96, 96, 40, "#ffb3d9", "#e0408f"); eyes(p, 74, 86, 11, 44, "#fff7c2"); p.ellipse(96, 122, 22, f === 1 ? 14 : 5, ink);
        p.line(72, 66, 88, 74, ink, 5); p.line(120, 66, 104, 74, ink, 5);
    });
    sheet("boss_twins", (p, f) => {   // The Tonsil Twins: two gossiping lumps.
        const b = f === 1 ? 8 : 0;
        p.ellipse(60, 112 + b, 48, 62, "#ffb3c6", "#d6456f"); p.ellipse(134, 112 - b, 48, 62, "#ffc6d9", "#c43a7f");
        for (const [x, y] of [[42, 80], [70, 130], [50, 150], [120, 78], [150, 128], [128, 150]]) p.circle(x, y + b * (x < 96 ? 1 : -1), 9, "#f08fb0");
        eyes(p, 40, 100 + b, 9, 32); eyes(p, 116, 100 - b, 9, 32); p.ellipse(58, 132 + b, 12, 6, ink); p.ellipse(134, 132 - b, 8, f === 1 ? 14 : 5, ink);
    });
    sheet("boss_uvula", (p, f) => {   // Uvula the Bellringer: a giant dangling punchbag with a bell's temper.
        const sw = f === 1 ? 14 : 0;
        p.line(96, 0, 96 + sw, 80, "#8e2b4e", 28);
        p.ellipse(96 + sw, 120, 54, 64, "#e0527e", "#7a1636"); p.ellipse(96 + sw, 168, 26, 18, "#ff8fab", "#b02a55");
        eyes(p, 74 + sw, 102, 11, 44); p.ellipse(96 + sw, 142, 18, f === 1 ? 14 : 6, ink);
    });
    sheet("boss_reflux", (p, f) => {   // The Reflux: a bile serpent, all jaw.
        const j = f === 1 ? 26 : 8;
        p.ellipse(96, 150, 64, 44, "#c6c628", "#5e6410");
        for (let i = 0; i < 5; i++) p.ellipse(48 + i * 24, 124, 10, 6, "#e8f03c");
        p.ellipse(96, 80, 68, 50, "#e8f03c", "#8c9414"); p.ellipse(96, 104 + j / 2, 58, j, "#3a1a10");
        for (let i = 0; i < 7; i++) p.poly([[46 + i * 16, 100 - j / 2], [60 + i * 16, 100 - j / 2], [53 + i * 16, 118 - j / 3]], "#fff4c2");
        eyes(p, 62, 58, 13, 68, "#fff", "#c23a1a");
    });
    sheet("boss_ache", (p, f) => {   // The Ache: a black, burning tooth with a crack for a mouth.
        const g = f === 1 ? 6 : 0;
        p.ellipse(96, 84, 74 + g, 66 + g, "#2a0a12", "#70141c"); p.ellipse(56, 150, 22, 34, "#2a0a12", "#500c14"); p.ellipse(136, 150, 22, 34, "#2a0a12", "#500c14");
        p.line(64, 34, 84, 68, "#ffd27a", 6).line(84, 68, 72, 96, "#ff6a3c", 7).line(72, 96, 100, 132, "#ffd27a", 6).line(100, 132, 90, 170, "#ff6a3c", 5).line(130, 30, 112, 66, "#ff6a3c", 5);
        eyes(p, 52, 72, 14, 74, "#ffd27a", "#3a0408"); p.ellipse(96, 112, 34, f === 1 ? 16 : 7, "#ffb347");
    });
}

function props(assets) {
    const ink = "#1a1420";
    // Fixed sheet of 96px props. PROP indexes them.
    const list = ["hook", "sink", "sinkOn", "pedestal", "crown", "baby", "bit", "ledge", "spike", "spikeC", "crumble", "crack", "hard", "foam", "gate", "beamdoor", "emitter", "receptor", "pad", "pad2", "rail", "mint", "toolDrill", "toolFloss", "toolDash", "toolAir", "toolCoat", "toolMirror", "toolBraces", "toolChute", "toolBurr", "heart", "heartOff", "fairyDust"];
    const paintOne = {
        hook: (p) => { p.circle(48, 40, 18, "#f4f8ff", "#8fa8c4").circle(48, 40, 7, "#26324a"); p.line(48, 58, 48, 76, "#d8e4f0", 6); p.line(48, 76, 62, 86, "#d8e4f0", 6); },
        sink: (p) => { p.ellipse(48, 42, 40, 16, "#f4f8ff", "#a8bcd0"); p.ellipse(48, 40, 30, 9, "#6c8096"); p.poly([[24, 50], [72, 50], [60, 94], [36, 94]], "#e6eef6"); p.rect(44, 12, 8, 24, "#c8d4e0"); p.rect(36, 10, 26, 7, "#e0e8f0"); },
        sinkOn: (p) => { p.ellipse(48, 42, 40, 16, "#f4f8ff", "#a8bcd0"); p.ellipse(48, 40, 30, 9, "#7fe8ff", "#3fb8e0"); p.poly([[24, 50], [72, 50], [60, 94], [36, 94]], "#e6eef6"); p.rect(44, 12, 8, 24, "#c8d4e0"); p.rect(36, 10, 26, 7, "#e0e8f0"); p.line(60, 17, 60, 38, "#a8f0ff", 4); },
        pedestal: (p) => { p.poly([[30, 40], [66, 40], [74, 92], [22, 92]], "#f4f8ff"); p.rect(18, 84, 60, 10, "#c8d4e0"); p.ellipse(48, 40, 22, 6, "#fff"); },
        crown: (p) => { p.poly([[14, 74], [10, 28], [32, 52], [48, 20], [64, 52], [86, 28], [82, 74]], "#ffd24d"); p.rect(14, 68, 68, 12, "#c9892b"); p.circle(48, 20, 6, "#ff6f91").circle(10, 28, 5, "#7df9ff").circle(86, 28, 5, "#7df9ff"); },
        baby: (p) => { p.ellipse(48, 42, 28, 26, "#ffffff", "#d0dcea"); p.ellipse(34, 76, 11, 18, "#fff", "#c8d4e0").ellipse(62, 76, 11, 18, "#fff", "#c8d4e0"); p.circle(38, 40, 4, ink).circle(58, 40, 4, ink); p.line(42, 52, 54, 52, ink, 2.5); },
        bit: (p) => { p.poly([[42, 10], [54, 10], [60, 60], [36, 60]], "#a8e8ff"); p.line(38, 26, 58, 34, "#4ca8d0", 3); p.line(37, 42, 59, 50, "#4ca8d0", 3); p.rect(44, 60, 8, 28, "#7c8ca0"); },
        ledge: (p) => { p.ellipse(48, 20, 46, 16, "#ffffff", "#9aa"); p.ellipse(22, 30, 16, 12, "#e8e8e8", "#889"); p.ellipse(72, 32, 18, 13, "#e8e8e8", "#889"); },
        spike: (p) => { for (let i = 0; i < 3; i++) p.poly([[4 + i * 30, 96], [20 + i * 30, 16 + (i % 2) * 18], [34 + i * 30, 96]], "#fff8e8"); for (let i = 0; i < 3; i++) p.line(20 + i * 30, 40, 18 + i * 30, 90, "#d8c8a8", 2); },
        spikeC: (p) => { for (let i = 0; i < 3; i++) p.poly([[4 + i * 30, 0], [20 + i * 30, 80 - (i % 2) * 18], [34 + i * 30, 0]], "#fff8e8"); },
        crumble: (p) => { for (let i = 0; i < 5; i++) p.ellipse(14 + i * 17, 26 + (i * 13) % 12, 15, 13, i % 2 ? "#ffffff" : "#dfe4ea", "#a8b0bc"); p.line(30, 14, 40, 44, ink, 2); p.line(64, 12, 56, 40, ink, 2); },
        crack: (p) => { p.line(48, 4, 40, 34, "#ffffffd0", 5).line(40, 34, 58, 56, "#ffffffd0", 4).line(58, 56, 44, 92, "#ffffffd0", 4).line(40, 34, 12, 48, "#ffffffa0", 3).line(58, 56, 88, 66, "#ffffffa0", 3); },
        hard: (p) => { p.ellipse(48, 48, 46, 44, "#c0a060", "#5a4420"); for (let i = 0; i < 9; i++) p.circle(14 + (i * 31) % 70, 14 + (i * 47) % 70, 6 + i % 4, "#e8d090"); },
        foam: (p) => { for (let i = 0; i < 9; i++) p.circle(14 + (i * 29) % 70, 14 + (i * 43) % 70, 11 + (i % 4) * 2, "#d8fff6", "#7fe8d0"); },
        gate: (p) => { for (let i = 0; i < 3; i++) p.ellipse(18 + i * 30, 48, 12, 46, "#fff8e8", "#c8a878"); p.rect(0, 40, 96, 12, "#8a6a4a"); p.outline(ink); },
        beamdoor: (p) => { p.ellipse(48, 48, 46, 46, "#3c2a70", "#160c30"); p.circle(48, 48, 26, "#ffe066", "#b98cff"); p.circle(48, 48, 12, "#fff"); },
        emitter: (p) => { p.rect(8, 22, 60, 52, "#e0e8f0"); p.rect(8, 22, 60, 8, "#fff"); p.circle(64, 48, 18, "#ffe066", "#d08a1c"); p.circle(64, 48, 8, "#fff"); },
        receptor: (p) => { p.circle(48, 48, 34, "#3a2a50", "#160c24"); p.circle(48, 48, 22, "#b98cff", "#5a2cc0"); p.circle(48, 48, 9, "#ffffff"); for (let i = 0; i < 6; i++) { const a = i * 1.047; p.line(48 + Math.cos(a) * 34, 48 + Math.sin(a) * 34, 48 + Math.cos(a) * 44, 48 + Math.sin(a) * 44, "#e0d0ff", 4); } },
        pad: (p) => { p.ellipse(48, 74, 44, 20, "#ff8fab", "#b02a55"); for (let i = 0; i < 5; i++) p.circle(16 + i * 16, 66 + (i % 2) * 4, 6, "#ffc2d1"); },
        pad2: (p) => { p.ellipse(48, 82, 48, 12, "#ff8fab", "#b02a55"); for (let i = 0; i < 5; i++) p.circle(12 + i * 18, 78, 5, "#ffc2d1"); },
        rail: (p) => { p.rect(0, 10, 96, 12, "#d8e4f0"); p.rect(0, 12, 96, 3, "#ffffff"); for (let i = 0; i < 2; i++) p.rect(16 + i * 48, 4, 16, 24, "#9ab0c8"); },
        mint: (p) => { p.circle(48, 48, 30, "#ffffff", "#a8f0dc"); for (let i = 0; i < 3; i++) { const a = i * 2.09; p.ellipse(48 + Math.cos(a) * 15, 48 + Math.sin(a) * 15, 11, 11, "#ff5c8a"); } p.circle(48, 48, 6, "#fff"); },
        toolDrill: (p) => { p.rect(14, 38, 40, 22, "#5f7690"); p.poly([[54, 40], [92, 49], [54, 58]], "#e6eef6"); p.rect(24, 58, 14, 26, "#3c4e66"); p.circle(90, 49, 4, "#ffe066"); },
        toolFloss: (p) => { p.circle(44, 40, 26, "#7ff5d8", "#2ba58f"); p.circle(44, 40, 9, "#0e3a34"); p.line(66, 56, 90, 86, "#ffffff", 3); p.line(30, 66, 66, 56, "#fff", 2); },
        toolDash: (p) => { p.rect(36, 12, 26, 12, "#d8fff6"); p.poly([[26, 30], [72, 30], [78, 90], [20, 90]], "#7fe8d0", "#2ba58f"); p.line(6, 46, 20, 46, "#fff", 4); p.line(2, 62, 18, 62, "#fff", 4); p.line(8, 78, 18, 78, "#fff", 4); },
        toolAir: (p) => { p.rect(34, 26, 44, 20, "#e6eef6"); p.rect(78, 32, 14, 8, "#9ab0c8"); p.rect(14, 22, 20, 28, "#7c8ca0"); p.ellipse(50, 74, 20, 11, "#ffffffcc"); p.ellipse(28, 84, 12, 7, "#ffffff99"); },
        toolCoat: (p) => { p.poly([[48, 8], [84, 22], [78, 64], [48, 90], [18, 64], [12, 22]], "#7fd6ff", "#2a78c0"); p.line(48, 18, 48, 78, "#ffffff90", 4); p.line(24, 44, 72, 44, "#ffffff90", 4); },
        toolMirror: (p) => { p.ellipse(52, 34, 26, 30, "#f4f8ff", "#7fd6ff"); p.line(36, 60, 12, 92, "#c9d7e4", 8); p.line(40, 22, 60, 16, "#fff", 4); },
        toolBraces: (p) => { p.rect(6, 42, 84, 8, "#d8e4f0"); for (let i = 0; i < 4; i++) { p.rect(10 + i * 21, 30, 16, 32, "#ffffff"); p.rect(14 + i * 21, 36, 8, 20, "#9ab0c8"); } },
        toolChute: (p) => { p.ellipse(48, 34, 42, 28, "#ffffff", "#d0dcea"); p.rect(4, 34, 90, 30, "#00000000"); p.line(10, 42, 44, 88, "#c8d4e0", 3); p.line(86, 42, 52, 88, "#c8d4e0", 3); p.line(48, 44, 48, 88, "#c8d4e0", 3); },
        toolBurr: (p) => { p.poly([[48, 6], [76, 44], [48, 70], [20, 44]], "#7df9ff", "#2a9ac0"); p.line(48, 6, 48, 70, "#ffffffa0", 3); p.line(20, 44, 76, 44, "#ffffffa0", 3); p.rect(42, 70, 12, 20, "#7c8ca0"); },
        heart: (p) => { p.poly([[20, 40], [76, 40], [72, 66], [24, 66]], "#fff4f0"); p.ellipse(32, 72, 12, 21, "#fff4f0", "#ffc2d1").ellipse(64, 72, 12, 21, "#fff4f0", "#ffc2d1"); p.ellipse(34, 34, 21, 22, "#ffffff", "#fff4f0").ellipse(62, 34, 21, 22, "#ffffff", "#fff4f0"); p.rect(32, 30, 32, 22, "#fffaf6"); p.ellipse(30, 26, 8, 5, "#ffffff"); },
        heartOff: (p) => { p.poly([[20, 40], [76, 40], [72, 66], [24, 66]], "#3a2c3a"); p.ellipse(32, 72, 12, 21, "#3a2c3a").ellipse(64, 72, 12, 21, "#3a2c3a"); p.ellipse(34, 34, 21, 22, "#4a3a4a").ellipse(62, 34, 21, 22, "#4a3a4a"); p.rect(32, 30, 32, 22, "#4a3a4a"); },
        fairyDust: (p) => { p.poly([[48, 8], [56, 40], [88, 48], [56, 56], [48, 88], [40, 56], [8, 48], [40, 40]], "#fff"); },
    };
    assets.paint("props", 96, 96, (p, f) => { paintOne[list[f]](p); if (!["crack", "fairyDust"].includes(list[f])) p.outline(ink).shade(0.2, 0.15); }, { frames: list.length, smooth: true });
    return Object.fromEntries(list.map((n, i) => [n, i]));
}

// Pale silhouettes the areas tint: far arches, near fangs and folds, and decorations that grow from surfaces.
function parallax(assets) {
    const W = 512, H = 256;
    assets.paint("far", W, H, (p) => {
        const d = p.data;
        for (let x = 0; x < W; x++) {
            const a = x / W * Math.PI * 2;
            const top = 46 + Math.sin(a * 3) * 26 + Math.sin(a * 7 + 1) * 12 + Math.sin(a * 13) * 5;
            const bot = 206 + Math.sin(a * 2 + 2) * 24 + Math.sin(a * 5) * 14 + Math.sin(a * 11 + 1) * 6;
            const arch = Math.abs(Math.sin(a * 2.0 + 0.5));
            for (let y = 0; y < H; y++) {
                const inPillar = arch < 0.14 + Math.sin(y / 30 + x / 80) * 0.04;
                if (y < top || y > bot || inPillar) { const i = p.index(x, y); d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 255; }
            }
        }
    }, { smooth: true });
    assets.paint("near", W, H, (p) => {
        for (let i = 0; i < 9; i++) {   // Fangs from above and below.
            const x = 30 + i * 56, w = 34 + (i * 37) % 30, h = 70 + (i * 53) % 60;
            p.poly([[x - w / 2, 0], [x + w / 2, 0], [x + 6, h], [x - 4, h - 4]], "#ffffff");
            const x2 = 58 + i * 56, h2 = 50 + (i * 71) % 70;
            p.poly([[x2 - w / 2, 256], [x2 + w / 2, 256], [x2 + 4, 256 - h2], [x2 - 6, 256 - h2 + 6]], "#ffffff");
        }
        p.rect(0, 0, W, 8, "#fff").rect(0, 248, W, 8, "#fff");
    }, { smooth: true });
    assets.paint("deco", 64, 64, (p, f) => {
        const w = "#ffffff", g = "#c4c4cc";
        if (f === 0) { p.poly([[22, 64], [30, 12], [38, 64]], w); p.poly([[8, 64], [16, 34], [24, 64]], g); p.poly([[38, 64], [48, 26], [58, 64]], g); }           // Crystals.
        if (f === 1) { p.ellipse(32, 30, 18, 12, w, g); p.rect(28, 36, 8, 28, g); p.ellipse(14, 46, 9, 6, g); p.rect(12, 48, 4, 16, g); }                         // Fungus.
        if (f === 2) { for (let i = 0; i < 4; i++) p.ellipse(12 + i * 13, 64, 7, 26 + (i * 13) % 18, i % 2 ? w : g); }                                             // Papillae.
        if (f === 3) { p.poly([[26, 0], [32, 54], [38, 0]], w); p.poly([[10, 0], [15, 30], [22, 0]], g); p.poly([[42, 0], [48, 38], [54, 0]], g); }                 // Drips.
        if (f === 4) { p.line(32, 64, 30, 34, w, 4); p.line(30, 34, 18, 14, w, 3); p.line(30, 34, 44, 10, w, 3); p.line(36, 22, 48, 26, g, 2); }                    // Nerve branch.
        if (f === 5) { p.ellipse(20, 52, 16, 12, w, g); p.ellipse(42, 56, 14, 8, g); p.circle(20, 46, 4, "#8a8a92"); }                                              // Lumps.
        if (f === 6) { p.ellipse(32, 48, 10, 16, w, g); p.ellipse(14, 56, 7, 8, g); p.ellipse(50, 54, 8, 10, g); p.circle(30, 40, 3, "#fff"); }                     // Bulbs.
        if (f === 7) { p.line(16, 0, 18, 44, g, 2.5); p.line(34, 0, 32, 60, w, 3); p.line(48, 0, 47, 34, g, 2); p.circle(32, 60, 3.5, w); p.circle(18, 44, 2.6, g); } // Strings of drool.
    }, { frames: 8, smooth: true });
}

export const DECO_BY_AREA = { gum: [2, 5, 7, 3], enamel: [0, 3, 5], sugar: [0, 0, 6], tongue: [2, 2, 7, 6], swamp: [1, 1, 5, 7], nerve: [4, 4, 0], tonsil: [6, 1, 2, 7], throat: [7, 3, 5], stomach: [5, 6, 1], pulp: [4, 0, 5] };

export function paintArt(game) {
    const a = game.assets, out = {};
    glowSprite(a);
    for (const k in PAL) paintTiles(a, k, PAL[k]);
    out.FR = hero(a);
    npcs(a); foes(a); bosses(a); parallax(a);
    out.PROP = props(a);
    return out;
}
