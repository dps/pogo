// The diorama: board mesh, zone palettes, the camera, and the little model cast.
import { billboard, color, mesh } from "./pogo.js";
import { Mesher, mix, tint } from "./meshkit.js";
import { N, T, isSolid } from "./sim.js";

export const ZONES = {
    lawn: {
        name: "The Lawn", sky: ["#a9e4f2", "#eaf8d9"], a: "#8acb55", b: "#7cbf49", path: "#e6cd95", path2: "#dcc083", edge: "#6aa53c", dirt: "#9a6a42", dirt2: "#6e4629", water: "#49bde4", hedge: "#3f9440", hedge2: "#66b84e",
        light: { dir: [-0.55, -1, -0.32], color: "#fff4dc", sky: "#cfeeff", ground: "#8fa86a" }, cloud: "#ffffff", ink: "#284423",
    },
    bandstand: {
        name: "The Bandstand", sky: ["#ffd9a0", "#ff9f7a"], a: "#b2bd58", b: "#a5b24e", path: "#dfae72", path2: "#d09d60", edge: "#8d9a44", dirt: "#8d5d3c", dirt2: "#5e3b2a", water: "#58b4c9", hedge: "#6b8f3a", hedge2: "#a3b84a",
        light: { dir: [-0.8, -0.9, -0.2], color: "#ffdcae", sky: "#ffe2c0", ground: "#b58e62" }, cloud: "#fff0d8", ink: "#4a2a16",
    },
    fountain: {
        name: "The Fountain", sky: ["#8fd6f4", "#d9f4fb"], a: "#9fd6a0", b: "#93cc96", path: "#d6dade", path2: "#c8cdd3", edge: "#a7b0b8", dirt: "#7a8796", dirt2: "#566273", water: "#2fb3dc", hedge: "#3fa07a", hedge2: "#6fce9c",
        light: { dir: [-0.4, -1, -0.5], color: "#ffffff", sky: "#d5f2ff", ground: "#9fb7c4" }, cloud: "#ffffff", ink: "#173c50",
    },
    rooftop: {
        name: "The Rooftops", sky: ["#4d3a8a", "#ff9a6b"], a: "#7a7690", b: "#6f6b85", path: "#7f7a94", path2: "#726e88", edge: "#a2605a", dirt: "#a65a4e", dirt2: "#6e3b44", water: "#5c7fd0", hedge: "#7a5fb0", hedge2: "#a184d6",
        light: { dir: [-0.9, -0.75, 0.15], color: "#ffc69a", sky: "#b9a0e6", ground: "#7d5a70" }, cloud: "#ffc7b0", ink: "#2a1a44",
    },
    island: {
        name: "The Island", sky: ["#131a44", "#51408f"], a: "#4f8f78", b: "#458570", path: "#8c8aa8", path2: "#7f7d9c", edge: "#3f7766", dirt: "#4b4570", dirt2: "#2f2c52", water: "#2f5fb4", hedge: "#2f6d68", hedge2: "#46958a",
        light: { dir: [-0.5, -1, 0.3], color: "#cfdcff", sky: "#7f8ee0", ground: "#3e3a78" }, cloud: "#7c7fc6", ink: "#10122e",
    },
};

export const wx = (x) => x - 3.5;
export const wz = (y) => y - 3.5;
const rnd = (x, y, k = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };

function grassBits(b, x, z, sx, sy, zone) {
    if (rnd(sx, sy, 1) < 0.65) for (let i = 0; i < 3; i++) {
        const a = rnd(sx, sy, i + 2) * 0.8 - 0.4, c = rnd(sy, sx, i + 7) * 0.8 - 0.4;
        b.tube([x + a, 0, z + c], [x + a + 0.03, 0.09, z + c], 0.03, 0, tint(zone.hedge2, 1.05), 4, false);
    }
    if (rnd(sx, sy, 9) < 0.22) {
        const a = rnd(sx, sy, 11) * 0.7 - 0.35, c = rnd(sy, sx, 12) * 0.7 - 0.35, f = ["#fff6d8", "#ffd34d", "#ff9fc2"][Math.floor(rnd(sx, sy, 13) * 3)];
        b.cyl(x + a, 0, z + c, 0.012, 0.07, "#4f8f3a", 4);
        b.ball(x + a, 0.085, z + c, 0.04, 0.025, 0.04, f, 6, 4);
    }
}

function stoneBit(b, zoneId, zone, x, z, sx, sy) {
    if (zoneId === "bandstand") {
        b.tube([x, 0, z], [x, 0.07, z], 0.4, 0.36, "#f3e7cf", 12);
        b.tube([x, 0.07, z], [x, 0.68, z], 0.25, 0.22, "#fff6e6", 12);
        b.tube([x, 0.68, z], [x, 0.76, z], 0.26, 0.36, "#f0c04a", 12);
    } else if (zoneId === "fountain" || zoneId === "island") {
        b.box(x, 0, z, 0.92, 0.3, 0.92, "#e4e7ec", { top: "#c6e9f5", bevel: 0.05 });
        b.box(x, 0.3, z, 0.74, 0.03, 0.74, "#a8cfe0", { top: "#6fd0ee" });
        b.tube([x, 0.3, z], [x, 0.56, z], 0.14, 0.09, "#eef0f3", 10);
        b.ball(x, 0.6, z, 0.17, 0.09, 0.17, "#f7f8fa", 10, 6);
    } else if (zoneId === "rooftop") {
        if ((sx + sy) % 2) {
            b.box(x, 0, z, 0.8, 0.62, 0.8, "#b5654f", { top: "#7c4a44", base: "#7f4438", bevel: 0.03 });
            for (let i = 0; i < 3; i++) b.box(x, 0.12 + i * 0.17, z, 0.82, 0.02, 0.82, "#d8bfa8");
            b.tube([x - 0.16, 0.62, z], [x - 0.16, 0.82, z], 0.11, 0.13, "#d98a4c", 8);
            b.tube([x + 0.16, 0.62, z], [x + 0.16, 0.82, z], 0.11, 0.13, "#d98a4c", 8);
        } else {
            b.box(x, 0, z, 0.82, 0.5, 0.82, "#c5cbd8", { top: "#dde2ec", base: "#8d93a5", bevel: 0.04 });
            b.tube([x, 0.5, z], [x, 0.53, z], 0.3, 0.3, "#596074", 14);
            b.box(x, 0.54, z, 0.6, 0.02, 0.07, "#a7afc0");
            b.box(x, 0.54, z, 0.07, 0.02, 0.6, "#a7afc0");
        }
    } else {
        // A garden boulder with a moss hat.
        const k = 0.9 + rnd(sx, sy, 3) * 0.2;
        b.ball(x, 0.2, z, 0.42 * k, 0.32 * k, 0.4 * k, (nx, ny) => (ny > 0.55 ? "#74b34f" : mix("#a2a6ae", "#7a7f8b", Math.max(0, -ny + 0.4))), 9, 6);
        b.ball(x + 0.22, 0.1, z + 0.2, 0.18, 0.14, 0.16, "#8e929c", 7, 5);
    }
}

function spikes(b, x, z) {
    b.box(x, 0, z, 0.86, 0.04, 0.86, "#8f96a8", { top: "#b5bbc9" });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const a = x - 0.3 + i * 0.2, c = z - 0.3 + j * 0.2;
        b.tube([a, 0.04, c], [a + (i - 1.5) * 0.04, 0.26, c + (j - 1.5) * 0.04], 0.03, 0, "#e3e7ef", 4, false);
    }
}

function slick(b, x, z, sx, sy) {
    const flavours = ["#ffc7dc", "#fff3d6", "#bff0da"], c = flavours[(sx * 3 + sy) % 3];
    b.ball(x, 0.0, z, 0.46, 0.035, 0.46, c, 12, 4);
    b.ball(x + 0.14, 0.015, z - 0.14, 0.2, 0.05, 0.18, flavours[(sx + sy * 2 + 1) % 3], 8, 4);
    if ((sx + sy) % 3 === 0) { b.at(x - 0.12, 0.08, z + 0.12, (m) => { m.tube([0, 0, 0], [0.2, 0, 0.14], 0.0, 0.1, "#d9a35c", 8, false); m.ball(0.23, 0, 0.16, 0.11, 0.1, 0.11, c, 8, 6); }); }
}

function tree(b, x, z, k, cols) {
    b.tube([x, 0, z], [x, 0.9 * k, z], 0.14 * k, 0.09 * k, "#8a5f3a", 8);
    const c = (nx, ny) => mix(cols[0], cols[1], Math.max(0, ny * 0.7 + 0.3));
    b.ball(x, 1.15 * k, z, 0.58 * k, 0.52 * k, 0.58 * k, c, 12, 8);
    b.ball(x + 0.34 * k, 0.95 * k, z + 0.16 * k, 0.36 * k, 0.32 * k, 0.36 * k, c, 10, 6);
    b.ball(x - 0.3 * k, 1.0 * k, z - 0.2 * k, 0.38 * k, 0.34 * k, 0.38 * k, c, 10, 6);
}
function lamp(b, x, z) {
    b.tube([x, 0, z], [x, 0.1, z], 0.1, 0.05, "#2f3a3a", 8);
    b.cyl(x, 0.1, z, 0.03, 1.15, "#2f3a3a", 6);
    b.ball(x, 1.32, z, 0.1, 0.13, 0.1, [2.4, 2.1, 1.4], 8, 6);
    b.tube([x, 1.41, z], [x, 1.5, z], 0.13, 0, "#2f3a3a", 8);
}
function bench(b, x, z, ry) {
    b.at(x, 0, z, (m) => {
        m.box(0, 0.2, 0, 0.9, 0.04, 0.26, "#b97f47", { top: "#d39a5e" });
        m.box(0, 0.36, -0.13, 0.9, 0.16, 0.03, "#b97f47", { top: "#d39a5e" });
        for (const s of [-0.38, 0.38]) m.box(s, 0, 0, 0.05, 0.2, 0.24, "#3a3f4a");
    }, { ry });
}
function bin(b, x, z) {
    b.tube([x, 0, z], [x, 0.46, z], 0.15, 0.19, "#3f7a5a", 10);
    b.tube([x, 0.46, z], [x, 0.5, z], 0.21, 0.2, "#2f5f46", 10);
    b.ball(x + 0.05, 0.54, z, 0.1, 0.07, 0.08, "#e8dcc0", 6, 4);
}
function picket(b, x0, z0, x1, z1, col, n) {
    for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n;
        b.box(x, 0, z, 0.07, 0.2, 0.07, col, { top: "#fff" });
    }
    b.tube([x0, 0.13, z0], [x1, 0.13, z1], 0.015, 0.015, col, 4, false);
}
function bandstandRoof(b) {
    const o = -4.1;
    for (const [x, z] of [[o - 0.3, o + 0.9], [o + 0.9, o - 0.3]]) {
        b.cyl(x, 0, z, 0.06, 1.3, "#fff4e0", 8);
        b.ball(x, 1.36, z, 0.1, 0.1, 0.1, "#f0c04a", 8, 6);
    }
    b.tube([o - 0.3, 1.3, o + 0.9], [o + 0.9, 1.3, o - 0.3], 0.012, 0.012, "#f4e6c3", 4, false);
    for (let i = 0; i < 7; i++) {
        const t = (i + 0.5) / 7, x = o - 0.3 + 1.2 * t, z = o + 0.9 - 1.2 * t;
        b.tube([x, 1.29, z], [x, 1.1, z], 0.075, 0, ["#d84a3a", "#f0c04a", "#3fa8e0"][i % 3], 3, false);
    }
}

/** Bake one board: tiles, base, scenery around the edge. Hedges and props are entities, because they break. */
export function bakeBoard(game, name, zoneId, m, tiles) {
    const zone = ZONES[zoneId], b = new Mesher(), M = 4.36, top = -0.03;
    const paved = zoneId === "bandstand" || zoneId === "fountain" || zoneId === "rooftop";
    // Plate and strata.
    if (zoneId === "rooftop") {
        b.box(0, -3.4, 0, M * 2, 3.06, M * 2, zone.dirt, { top: "#241b33", base: zone.dirt2 });
        for (const [fx, fz] of [[0, 1], [1, 0]]) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
            const lit = rnd(i, j, fx) > 0.55, c = lit ? [1.9, 1.5, 0.8] : "#3b2d58";
            const u = -3.6 + i * 1.45, y = -1.1 - j * 0.95;
            if (fx) b.quad([M + 0.01, y, u + 0.32], [M + 0.01, y, u - 0.32], [M + 0.01, y + 0.6, u - 0.32], [M + 0.01, y + 0.6, u + 0.32], [1, 0, 0], c);
            else b.quad([u - 0.32, y, M + 0.01], [u + 0.32, y, M + 0.01], [u + 0.32, y + 0.6, M + 0.01], [u - 0.32, y + 0.6, M + 0.01], [0, 0, 1], c);
        }
        for (const [x, z, w, d] of [[0, M + 0.03, M * 2 + 0.2, 0.14], [0, -M - 0.03, M * 2 + 0.2, 0.14], [M + 0.03, 0, 0.14, M * 2], [-M - 0.03, 0, 0.14, M * 2]]) b.box(x, -0.34, z, w, 0.46, d, "#c9745f", { top: "#e6d6c4" });
    } else {
        b.box(0, -0.38, 0, M * 2, 0.35 + top + 0.0, M * 2, zone.edge, { top: zone.edge, bevel: 0.06, base: zone.dirt });
        b.box(0, -0.9, 0, M * 2 - 0.1, 0.55, M * 2 - 0.1, zone.dirt, { top: zone.dirt, base: zone.dirt2 });
        b.box(0, -1.25, 0, M * 2 - 0.5, 0.36, M * 2 - 0.5, zone.dirt2, { top: zone.dirt2, base: tint(zone.dirt2, 0.6) });
        for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2, x = Math.cos(a) * 3.6 * (1 + rnd(i, 2) * 0.1), z = Math.sin(a) * 3.6 * (1 + rnd(i, 3) * 0.1);
            b.tube([x, -1.2, z], [x * 0.9, -1.6 - rnd(i, 4) * 0.5, z * 0.9], 0.34, 0, zone.dirt2, 5, false);
        }
    }
    // Tiles.
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const t = tiles[y * N + x], X = wx(x), Z = wz(y), odd = (x + y) % 2 === 1;
        const isPath = t === T.PATH || (paved && (t === T.GRASS || isSolid(t) || t === T.SLICK || t === T.SPIKE));
        const c = isPath ? (odd ? zone.path : zone.path2) : (odd ? zone.a : zone.b);
        if (t === T.WATER) {
            b.box(X, -0.32, Z, 1, 0.12, 1, tint(zone.water, 0.6), { top: tint(zone.water, 0.55) });
            b.box(X, -0.2, Z, 1, 0.17, 1, tint(zone.dirt, 1.2), { top: tint(zone.water, 0.7) });
            continue;
        }
        if (t === T.VOID) { b.box(X, -0.62, Z, 1, 0.1, 1, "#2a2038", { top: "#231a33" }); continue; }
        b.box(X, -0.34, Z, 0.975, 0.34, 0.975, tint(c, 0.84), { top: c, bevel: 0.035, base: zone.dirt });
        if (zoneId === "bandstand" && isPath) for (let i = 1; i < 3; i++) b.box(X, 0.001, Z - 0.45 + i * 0.3, 0.92, 0.002, 0.015, tint(c, 0.8));
        if (zoneId === "fountain" && isPath) { b.box(X, 0.001, Z, 0.92, 0.002, 0.015, tint(c, 0.84)); b.box(X + (odd ? 0.2 : -0.2), 0.001, Z - 0.23, 0.015, 0.002, 0.46, tint(c, 0.84)); b.box(X + (odd ? -0.2 : 0.2), 0.001, Z + 0.23, 0.015, 0.002, 0.46, tint(c, 0.84)); }
        if (t === T.STONE) stoneBit(b, zoneId, zone, X, Z, x, y);
        else if (t === T.SPIKE) spikes(b, X, Z);
        else if (t === T.SLICK) slick(b, X, Z, x, y);
        else if (!isPath && t === T.GRASS) grassBits(b, X, Z, x, y, zone);
    }
    // Walls round any water or gap, so the holes read as holes.
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const t = tiles[y * N + x];
        if (t !== T.WATER && t !== T.VOID) continue;
        const X = wx(x), Z = wz(y), rim = t === T.WATER ? "#cfc6ae" : "#3a2f4a";
        const solidAt = (a, c) => a < 0 || c < 0 || a >= N || c >= N || (tiles[c * N + a] !== T.WATER && tiles[c * N + a] !== T.VOID);
        if (solidAt(x, y + 1)) b.box(X, -0.32, Z + 0.47, 1, 0.33, 0.06, rim, { top: "#ece4cf" });
        if (solidAt(x, y - 1)) b.box(X, -0.32, Z - 0.47, 1, 0.33, 0.06, rim, { top: "#ece4cf" });
        if (solidAt(x + 1, y)) b.box(X + 0.47, -0.32, Z, 0.06, 0.33, 1, rim, { top: "#ece4cf" });
        if (solidAt(x - 1, y)) b.box(X - 0.47, -0.32, Z, 0.06, 0.33, 1, rim, { top: "#ece4cf" });
    }
    if (m.carousel) {
        const [cx, cy] = m.carousel, X = wx(cx) + 0.5, Z = wz(cy) + 0.5;
        b.tube([X, 0, Z], [X, 0.05, Z], 0.98, 0.96, "#e8574a", 24);
        b.tube([X, 0.05, Z], [X, 0.06, Z], 0.8, 0.8, "#f6e6b0", 24);
        for (let i = 0; i < 4; i++) b.at(X, 0.062, Z, (q) => q.box(0.42, 0, 0, 0.8, 0.005, 0.05, "#e8574a"), { ry: (i * Math.PI) / 2 });
        b.tube([X, 0.05, Z], [X, 0.11, Z], 0.1, 0.08, "#f0c04a", 10);
    }
    // Scenery on the rim. Tall things stay behind the board.
    const e = 4.16;
    b.at(0, top, 0, (q) => {
        if (zoneId === "lawn") {
            tree(q, -e - 0.05, -e + 0.1, 1.15, ["#3f9440", "#8fd65b"]); tree(q, -e + 3.2, -e - 0.05, 0.86, ["#4a9e3f", "#a3df63"]); tree(q, -e + 0.05, 1.4, 0.8, ["#3f9440", "#8fd65b"]);
            lamp(q, -e, -1.4); bench(q, 0.7, -e - 0.02, 0); bin(q, -e + 5.9, -e);
            picket(q, -e + 0.2, e, e - 0.2, e, "#f7f2e6", 26); picket(q, e, -e + 0.2, e, e - 0.2, "#f7f2e6", 26);
        } else if (zoneId === "bandstand") {
            bandstandRoof(q); lamp(q, -e, 2.1); lamp(q, 2.1, -e);
            tree(q, -e, -e + 3.4, 0.74, ["#7d8f36", "#d6c24a"]); bench(q, 0.2, -e, 0);
            picket(q, -e + 0.2, e, e - 0.2, e, "#f0c04a", 20); picket(q, e, -e + 0.2, e, e - 0.2, "#f0c04a", 20);
        } else if (zoneId === "fountain") {
            tree(q, -e, -e, 1.05, ["#2f9e78", "#7fe0a8"]); lamp(q, 0.9, -e); lamp(q, -e, 0.9); bin(q, 2.8, -e); bench(q, -1.6, -e, 0);
            for (let i = 0; i < 16; i++) { const a = -e + 0.3 + i * 0.55; q.box(a, 0, e, 0.28, 0.13, 0.22, "#c6ccd4", { top: "#e7eaee" }); q.box(e, 0, a, 0.22, 0.13, 0.28, "#c6ccd4", { top: "#e7eaee" }); }
        } else if (zoneId === "rooftop") {
            q.tube([-e, 0, -e], [-e, 1.6, -e], 0.02, 0.012, "#2a2038", 5);
            for (const k of [0, 1, 2]) q.tube([-e - 0.3 + k * 0.06, 1.1 + k * 0.17, -e], [-e + 0.3 - k * 0.06, 1.1 + k * 0.17, -e], 0.012, 0.012, "#2a2038", 4, false);
            q.tube([-e + 1.2, 1.2, -e], [-e, 1.2, -e + 3.6], 0.008, 0.008, "#2a2038", 4, false);
            q.at(-e + 2.6, 0, -e, (w) => { w.cyl(0, 0, 0, 0.36, 0.72, "#8d6a54"); w.tube([0, 0.72, 0], [0, 1.0, 0], 0.4, 0, "#6e5044", 10); });
            for (let i = 0; i < 3; i++) q.box(-e + 0.6 - 0.2, 0.0, -e + 1.4 + i * 0.3, 0.04, 0.5, 0.04, "#4a3f60");
        } else {
            for (let i = 0; i < 7; i++) { const a = -e + 0.6 + i * 1.3; for (let k = 0; k < 3; k++) { q.cyl(-e + k * 0.08, 0, a + k * 0.1, 0.018, 0.6 + k * 0.08, "#3f8f70", 4); q.ball(-e + k * 0.08, 0.62 + k * 0.08, a + k * 0.1, 0.035, 0.1, 0.035, "#6e4a36", 6, 4); } }
            tree(q, -e, -e, 1.0, ["#254f5a", "#3f8f80"]); lamp(q, 1.4, -e);
        }
    });
    void color;
    return b.bake(game, name);
}

/** Water and clouds that aren't part of the board mesh. */
export function dressWater(game, s, zoneId, tiles) {
    const zone = ZONES[zoneId], list = [];
    const wet = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (tiles[y * N + x] === T.WATER) wet.push([x, y]);
    if (wet.length) {
        const b = new Mesher();
        for (const [x, y] of wet) b.box(wx(x), -0.13, wz(y), 1, 0.02, 1, zone.water, { top: mix(zone.water, "#ffffff", 0.3) });
        const nm = `water_${zoneId}`;
        b.bake(game, nm);
        list.push(s.add([mesh(nm, { shine: 0.9, shadow: false }), { name: "water", wet: true }]));
    }
    return list;
}

export function hedgeMesh(game) {
    for (const [zid, zone] of Object.entries(ZONES)) {
        for (const hurt of [0, 1]) {
            const b = new Mesher(), c = (nx, ny) => mix(zone.hedge, zone.hedge2, Math.max(0, ny * 0.75 + 0.25));
            const blobs = hurt
                ? [[-0.2, 0.2, 0.15, 0.25], [0.18, 0.16, -0.14, 0.22]]
                : [[-0.24, 0.24, -0.2, 0.3], [0.22, 0.26, -0.18, 0.3], [-0.2, 0.25, 0.2, 0.3], [0.22, 0.24, 0.22, 0.3], [0, 0.44, 0, 0.3]];
            for (const [x, y, z, r] of blobs) b.ball(x, y, z, r, r * 0.92, r, c, 9, 6);
            if (!hurt) for (let i = 0; i < 6; i++) { const a = i * 1.05; b.ball(Math.cos(a) * 0.3, 0.42 + (i % 2) * 0.16, Math.sin(a) * 0.3, 0.04, 0.04, 0.04, ["#ffd7e8", "#fff6d8"][i % 2], 5, 4); }
            else for (let i = 0; i < 3; i++) b.tube([i * 0.2 - 0.2, 0.1, 0], [i * 0.22 - 0.24, 0.5, (i - 1) * 0.1], 0.02, 0.008, "#6e4a30", 4, false);
            b.bake(game, `hedge_${zid}${hurt ? "_hurt" : ""}`);
        }
    }
}

export { billboard };
