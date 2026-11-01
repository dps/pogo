// World art: floor tiles per storey, furniture props and walking people, all painted with the same ink as the Deskmates.
import { Ink, INK, hex, mix } from "./ink.js";

export const TILE = 36;
const CELL = 72;        // pixels per tile on the sheet
const hash = (x, y, s = 7) => { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + s | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

const fillNoise = (p, ox, oy, a, b, amt, seed) => {
    const A = hex(a), B = hex(b), d = p.data;
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
        const n = hash(x >> 1, y >> 1, seed), t = n < amt ? 1 : 0, o = ((oy + y) * p.stride + ox + x) * 4, c = t ? B : A;
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
};
/** An Ink whose canvas is a window into a larger sheet. */
const inkAt = (p, ox, oy, w = CELL, h = CELL, s = 2) => {
    const k = new Ink({ width: w, height: h, stride: p.stride, data: p.data, x0: oy * p.stride + ox }, s);
    return k;
};
export const F = { floor: 0, floor2: 2, lino: 4, clutter: 6, face: 9, window: 10, up: 11, down: 12, lift: 13, void: 14, poster: 15, cap: 16 };

/** One sheet per floor theme. th: carpet, carpet2, lino, wall, cap, trim, clutter. */
export function paintFloorSheet(game, id, th) {
    const name = "tiles:" + id;
    if (game.assets.sprites?.has?.(name)) return name;
    game.assets.paint(name, CELL * 16, CELL * 2, (p) => {
        const at = (f) => [(f % 16) * CELL, (f >> 4) * CELL];
        // Carpet
        for (let f = 0; f < 4; f++) {
            const [ox, oy] = at(f); fillNoise(p, ox, oy, th.carpet, th.carpet2, 0.26, 11 + f);
            const k = inkAt(p, ox, oy);
            if (th.pattern === "grid") { k.line([[0, 0.5], [36, 0.5]], 0.6, { color: mix(th.carpet, INK, 0.16) }); k.line([[0.5, 0], [0.5, 36]], 0.6, { color: mix(th.carpet, INK, 0.16) }); }
            if (th.pattern === "dots") k.circ(18, 18, 2, { fill: mix(th.carpet, th.accent ?? "#ffffff", 0.3), ink: false, shade: 0 });
            if (th.pattern === "stripe" && f % 2) k.box(18, 18, 36, 9, 0, { fill: mix(th.carpet, th.accent ?? "#ffffff", 0.14), ink: false, shade: 0 });
            if (th.pattern === "boards") { k.line([[0, 12], [36, 12]], 0.8, { color: mix(th.carpet, INK, 0.22) }); k.line([[0, 24], [36, 24]], 0.8, { color: mix(th.carpet, INK, 0.22) }); k.line([[(f * 9 + 8) % 36, 0], [(f * 9 + 8) % 36, 12]], 0.8, { color: mix(th.carpet, INK, 0.22) }); k.line([[(f * 13 + 20) % 36, 12], [(f * 13 + 20) % 36, 24]], 0.8, { color: mix(th.carpet, INK, 0.22) }); }
        }
        // Lino walkways
        for (let f = 0; f < 2; f++) {
            const [ox, oy] = at(F.lino + f); fillNoise(p, ox, oy, th.lino, mix(th.lino, "#ffffff", 0.14), 0.14, 21 + f);
            const k = inkAt(p, ox, oy); k.line([[0, 0.4], [36, 0.4]], 0.8, { color: mix(th.lino, INK, 0.18) }); k.line([[0.4, 0], [0.4, 36]], 0.8, { color: mix(th.lino, INK, 0.18) });
        }
        // Clutter: the tall grass of the office. Deskmates live in it.
        for (let f = 0; f < 3; f++) {
            const [ox, oy] = at(F.clutter + f); fillNoise(p, ox, oy, th.carpet, th.carpet2, 0.26, 31 + f);
            const k = inkAt(p, ox, oy); k.lw = 1.5; clutter(k, th.clutter ?? "paper", f);
        }
        // Wall faces
        const face = (f, fn) => {
            const [ox, oy] = at(f); fillNoise(p, ox, oy, th.wall, mix(th.wall, "#ffffff", 0.08), 0.1, 41 + f);
            const k = inkAt(p, ox, oy); k.lw = 1.5;
            k.box(18, 4, 36, 8, 0, { fill: mix(th.wall, INK, 0.2), ink: false, shade: 0 });
            k.box(18, 32.5, 36, 7, 0, { fill: th.trim, ink: false, shade: 0 });
            k.line([[0, 29], [36, 29]], 1.2); k.line([[0, 35.5], [36, 35.5]], 1.6, { color: mix(th.carpet, INK, 0.6) });
            fn?.(k);
        };
        face(F.face);
        face(F.window, (k) => {
            k.box(18, 16, 28, 20, 1, { fill: "#a8d8ec", fill2: "#e6f4f4", shade: 0 });
            for (let i = 0; i < 5; i++) k.box(7 + i * 6, 24 - (i * 7 % 5) * 1.6, 5, 7 + (i * 7 % 5) * 3.2, 0, { fill: "#7f9fc0", ink: false, shade: 0 });
            k.line([[18, 6], [18, 26]], 1.4); k.line([[4, 16], [32, 16]], 1.2, { color: "#ffffffaa" });
        });
        const door = (k, col, sign) => {
            k.box(18, 18, 26, 34, 1, { fill: col, fill2: mix(col, INK, 0.25), shade: 4, w: 1.6 });
            k.box(18, 10, 14, 7, 1, { fill: "#fff7d6", shade: 0, w: 1.2 });
            k.poly(sign, { fill: INK, ink: false, shade: 0 });
            k.circ(27, 21, 1.4, { fill: "#ffd84d", shade: 0, w: 0.8 });
        };
        face(F.up, (k) => door(k, "#4ea36a", [[18, 7.5], [22, 12.5], [14, 12.5]]));
        face(F.down, (k) => door(k, "#b0683c", [[18, 12.5], [22, 7.5], [14, 7.5]]));
        face(F.lift, (k) => {
            k.box(18, 18, 30, 34, 1, { fill: "#c7ced8", shade: 0, w: 1.8 }); k.box(18, 21, 26, 28, 0, { fill: "#8f9aae", fill2: "#6b7588", shade: 3, w: 1.2 });
            k.line([[18, 7], [18, 35]], 1.4); k.circ(18, 4, 2, { fill: "#ffd84d", shade: 0, w: 0.9 });
        });
        { const [ox, oy] = at(F.void); p.rect?.(ox, oy, CELL, CELL, INK); }
        face(F.poster, (k) => {
            k.box(18, 15, 20, 20, 0, { fill: th.accent ?? "#ffd84d", shade: 3, w: 1.4 });
            k.circ(18, 13, 4, { fill: "#fff7d6", shade: 0, w: 1 }); k.line([[11, 21], [25, 21]], 1.4); 
        });
        // Wall caps, one per neighbour mask (1 up, 2 right, 4 down, 8 left means open floor on that side)
        for (let m = 0; m < 16; m++) {
            const [ox, oy] = at(F.cap + m); fillNoise(p, ox, oy, th.cap, mix(th.cap, "#000000", 0.1), 0.15, 61 + m);
            const k = inkAt(p, ox, oy);
            if (m & 1) k.box(18, 1, 36, 2.4, 0, { fill: INK, ink: false, shade: 0 });
            if (m & 2) k.box(35, 18, 2.4, 36, 0, { fill: INK, ink: false, shade: 0 });
            if (m & 4) k.box(18, 35, 36, 2.4, 0, { fill: INK, ink: false, shade: 0 });
            if (m & 8) k.box(1, 18, 2.4, 36, 0, { fill: INK, ink: false, shade: 0 });
        }
    });
    game.assets.grid(name, 16, 2);
    return name;
}
function clutter(k, kind, f) {
    const r = (i) => hash(i, f, 5);
    if (kind === "paper") for (let i = 0; i < 5; i++) k.box(6 + r(i) * 24, 6 + r(i + 9) * 24, 13, 16, 0.5, { fill: i % 3 ? "#fbf6e8" : "#ffe17a", rot: r(i + 3) * 2 - 1, shade: 2 });
    if (kind === "cable") for (let i = 0; i < 4; i++) k.line(Ink.curve([r(i) * 36, r(i + 1) * 12], [r(i + 2) * 36, 40 * r(i + 4)], [r(i + 3) * 36, 36 - r(i + 7) * 8]), 2, { color: mix(["#39414f", "#2fa6a0", "#d9d4c5", "#e5484d"][i], "#5f6e8a", 0.3) });
    if (kind === "plant") for (let i = 0; i < 7; i++) k.ell(6 + r(i) * 24, 8 + r(i + 5) * 22, 7, 3.4, { fill: i % 2 ? "#5fb35a" : "#3f9550", rot: r(i + 2) * 3, shade: 1.5 });
    if (kind === "cups") for (let i = 0; i < 5; i++) { const x = 7 + r(i) * 22, y = 8 + r(i + 7) * 20; k.box(x, y, 8.5, 10, 2, { fill: i % 2 ? "#fffdf5" : "#d6a06a", shade: 2 }); k.ell(x, y - 4.6, 4.2, 1.6, { fill: "#7a4a2b", ink: false, shade: 0 }); }
    if (kind === "gold") for (let i = 0; i < 5; i++) k.box(6 + r(i) * 24, 6 + r(i + 9) * 24, 12, 15, 0.5, { fill: i % 2 ? "#fbf6e8" : "#ffd84d", rot: r(i + 3) * 2 - 1, shade: 2 });
}

// --- Props: furniture, 1 tile wide and up to 1.5 tall, feet on the bottom edge ---------------------------------------------
const PW = 72, PH = 108;
export const PROP = {};
const propList = [];
const prop = (ch, name, draw, o = {}) => { PROP[ch] = { name, frame: propList.length, solid: o.solid !== false, ...o }; propList.push(draw); };
const shadow = (k, w = 15, y = 51) => k.ell(18, y, w, 3, { fill: "#1e223340", ink: false, shade: 0 });
prop("D", "desk", (k) => {
    shadow(k, 17);
    k.box(18, 42, 36, 18, 1.5, { fill: "#c79a63", fill2: "#a97c49", w: 1.8, shade: 4 }); k.box(18, 36, 36, 6, 1, { fill: "#deb785", shade: 0, w: 1.6 });
    k.box(18, 23, 22, 15, 1.5, { fill: "#2f3648", shade: 0, w: 1.8 }); k.box(18, 23, 18, 11, 0.5, { fill: "#7fd6c8", fill2: "#2fa6a0", ink: false, shade: 0 }); k.box(18, 32.5, 6, 3, 0, { fill: "#39414f", w: 1.2, shade: 0 });
    k.box(30, 33, 6, 3, 0.5, { fill: "#fffdf5", shade: 0, w: 1 });
});
prop("B", "cabinet", (k) => {
    shadow(k, 15);
    k.box(18, 31, 28, 40, 1.5, { fill: "#a9b4c2", fill2: "#8592a4", w: 1.8, shade: 4 });
    for (let i = 0; i < 3; i++) { k.box(18, 18 + i * 13, 22, 10, 1, { fill: "#bcc6d2", w: 1.2, shade: 0 }); k.box(18, 18 + i * 13, 8, 2, 0.5, { fill: "#5b6478", ink: false, shade: 0 }); k.box(18, 15 + i * 13, 8, 2.4, 0, { fill: "#fffdf5", ink: false, shade: 0 }); }
});
prop("P", "plant", (k) => {
    shadow(k, 10);
    for (let i = 0; i < 9; i++) { const a = -2.9 + i * 0.32; k.ell(18 + Math.cos(a) * 10, 26 + Math.sin(a) * 12, 8, 3.6, { fill: i % 2 ? "#5fb35a" : "#3f9550", rot: a, shade: 1.5, w: 1.3 }); }
    k.poly([[10, 36], [26, 36], [24, 50], [12, 50]], { fill: "#d98a57", fill2: "#b1623a", w: 1.8, shade: 3 });
});
prop("T", "table", (k) => { shadow(k, 18, 52); k.box(18, 38, 37, 24, 1, { fill: "#8a5a3a", fill2: "#6d4329", w: 1.6, shade: 0 }); k.box(18, 33, 37, 13, 1, { fill: "#a97049", ink: false, shade: 0 }); k.box(10, 33, 8, 10, 0.3, { fill: "#fbf6e8", rot: 0.2, shade: 0, w: 1 }); });
prop("K", "counter", (k) => { k.box(18, 40, 37, 22, 0, { fill: "#d7cdb8", fill2: "#bcae93", w: 1.6, shade: 0 }); k.box(18, 31, 37, 8, 0, { fill: "#f3ecdb", w: 1.4, shade: 0 }); k.box(18, 44, 12, 2, 1, { fill: "#6b7588", ink: false, shade: 0 }); });
prop("F", "fridge", (k) => { shadow(k, 14); k.box(18, 28, 27, 46, 3, { fill: "#e9eff4", fill2: "#c3ced8", w: 1.8, shade: 4 }); k.line([[5, 20], [31, 20]], 1.4); k.box(9, 13, 2, 8, 1, { fill: "#6b7588", ink: false, shade: 0 }); k.box(9, 29, 2, 10, 1, { fill: "#6b7588", ink: false, shade: 0 }); k.box(23, 30, 9, 9, 0.3, { fill: "#ffd84d", shade: 0, w: 1 }); k.box(20, 12, 7, 6, 0.3, { fill: "#ff8fb1", shade: 0, w: 1, rot: 0.1 }); });
prop("V", "vending", (k) => { shadow(k, 15); k.box(18, 28, 30, 46, 2, { fill: "#3f5fb0", fill2: "#2d3f85", w: 1.8, shade: 3 }); k.box(14, 22, 18, 26, 1, { fill: "#cfe8f2", w: 1.2, shade: 0 }); const c = ["#e5484d", "#ffd84d", "#5fb35a", "#ff8fb1", "#f59a3c", "#2fa6a0"]; for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) k.box(10 + i * 8, 14 + r * 8, 6, 6, 0.5, { fill: c[(r * 2 + i) % 6], ink: false, shade: 0 }); k.box(14, 42, 18, 5, 1, { fill: INK, ink: false, shade: 0 }); k.box(29, 22, 3.5, 10, 0.5, { fill: "#aeb7c6", ink: false, shade: 0 }); });
prop("M", "copier", (k) => { shadow(k, 16); k.box(18, 37, 32, 26, 2, { fill: "#d8d9dc", fill2: "#b4b7be", w: 1.8, shade: 4 }); k.box(16, 22, 28, 7, 1, { fill: "#eeeff0", w: 1.5, shade: 0 }); k.box(14, 18, 16, 3, 0.3, { fill: "#fbf6e8", w: 1, shade: 0 }); k.box(27, 30, 7, 5, 0.5, { fill: "#2fa6a0", w: 1, shade: 0 }); k.box(16, 42, 20, 7, 0.5, { fill: "#8f9aae", w: 1.1, shade: 0 }); });
prop("S", "server", (k) => { shadow(k, 15); k.box(18, 27, 30, 48, 1.5, { fill: "#2a3040", fill2: "#1c2130", w: 1.8, shade: 0 }); for (let i = 0; i < 6; i++) { k.box(18, 9 + i * 7, 24, 4.6, 0.4, { fill: "#3d4558", ink: false, shade: 0 }); k.circ(10, 9 + i * 7, 1.2, { fill: i % 2 ? "#5fe08a" : "#ffb648", ink: false, shade: 0 }); k.circ(14, 9 + i * 7, 1.2, { fill: i % 3 ? "#5fe08a" : "#e5484d", ink: false, shade: 0 }); } });
prop("R", "boxes", (k) => { shadow(k, 15); k.box(13, 40, 21, 18, 1, { fill: "#d6aa72", w: 1.7, shade: 3 }); k.box(25, 42, 16, 15, 1, { fill: "#c79a63", w: 1.7, shade: 3 }); k.box(17, 26, 18, 13, 1, { fill: "#e0ba85", w: 1.7, shade: 3 }); k.line([[13, 31], [13, 49]], 2, { color: "#b9884f" }); k.line([[17, 19.5], [17, 32]], 2, { color: "#c79a63" }); });
prop("L", "couch", (k) => { shadow(k, 18); k.box(18, 34, 37, 20, 4, { fill: "#d0614c", fill2: "#b24a38", w: 1.8, shade: 3 }); k.box(18, 42, 37, 15, 4, { fill: "#e27a62", w: 1.8, shade: 3 }); k.line([[18, 36], [18, 49]], 1.4); });
prop("H", "cooler", (k) => { shadow(k, 10); k.box(18, 38, 18, 26, 1.5, { fill: "#e9eff4", fill2: "#c3ced8", w: 1.7, shade: 3 }); k.box(18, 17, 16, 19, 6, { fill: "#a9dcf2", fill2: "#6bbbe4", w: 1.7, shade: 3, lit: true }); k.box(14, 31, 3, 3, 0.5, { fill: "#3b6fd4", ink: false, shade: 0 }); k.box(22, 31, 3, 3, 0.5, { fill: "#e5484d", ink: false, shade: 0 }); });
prop("O", "whiteboard", (k) => { shadow(k, 15); k.line([[8, 40], [6, 51]], 2); k.line([[28, 40], [30, 51]], 2); k.box(18, 27, 34, 26, 1, { fill: "#fbfbf7", w: 1.8, shade: 0 }); k.line(Ink.curve([6, 22], [14, 34], [20, 20]), 1.4, { color: "#e5484d" }); k.line(Ink.curve([20, 20], [28, 18], [30, 32]), 1.4, { color: "#3b6fd4" }); k.circ(11, 33, 3, { ink: "#2fa6a0", w: 1 }); });
prop("Y", "yoga", (k) => { shadow(k, 13); k.circ(18, 37, 14, { fill: "#8b6cf0", fill2: "#6a4ad0", lit: true, w: 1.8, shade: 4 }); k.line(Ink.curve([8, 30], [18, 26], [28, 30]), 1.2, { color: "#b9a6ff" }); });
prop("Q", "printer", (k) => { shadow(k, 16); k.box(18, 42, 32, 16, 2, { fill: "#d8d9dc", fill2: "#b4b7be", w: 1.8, shade: 3 }); k.box(18, 32, 24, 10, 2, { fill: "#eeeff0", w: 1.6, shade: 0 }); k.box(18, 27, 16, 8, 0.2, { fill: "#fbf6e8", w: 1.1, shade: 0 }); k.box(18, 40, 18, 3, 0.2, { fill: INK, ink: false, shade: 0 }); });
prop("U", "bin", (k) => { shadow(k, 9); k.poly([[9, 34], [27, 34], [25, 50], [11, 50]], { fill: "#5b6478", w: 1.7, shade: 3 }); k.box(14, 32, 10, 8, 0.2, { fill: "#fbf6e8", rot: -0.3, w: 1, shade: 0 }); k.box(22, 32, 9, 7, 0.2, { fill: "#ffe17a", rot: 0.4, w: 1, shade: 0 }); });
prop("=", "partition", (k) => { k.box(18, 38, 37, 24, 0.4, { fill: "#a3adba", fill2: "#8791a0", w: 1.6, shade: 0 }); k.box(18, 27.5, 37, 3.4, 0.4, { fill: "#d7dbe2", w: 1.3, shade: 0 }); });
prop("!", "partition-side", (k) => { k.box(18, 34, 8, 36, 0.4, { fill: "#d7dbe2", w: 1.6, shade: 0 }); });
prop("G", "coffee machine", (k) => { k.box(18, 40, 37, 22, 0, { fill: "#d7cdb8", fill2: "#bcae93", w: 1.6, shade: 0 }); k.box(18, 31, 37, 8, 0, { fill: "#f3ecdb", w: 1.4, shade: 0 }); k.box(18, 17, 22, 24, 2, { fill: "#39414f", fill2: "#1f2430", w: 1.8, shade: 0 }); k.box(18, 20, 12, 10, 1, { fill: "#6b4a30", w: 1.2, shade: 0 }); k.circ(26, 10, 1.6, { fill: "#e5484d", ink: false, shade: 0 }); k.box(18, 11, 8, 3, 0.5, { fill: "#7fd6c8", ink: false, shade: 0 }); k.box(18, 26, 8, 6, 1.4, { fill: "#fffdf5", w: 1.1, shade: 0 }); });
prop("X", "wet floor", (k) => { shadow(k, 10); k.poly([[18, 22], [28, 50], [8, 50]], { fill: "#ffd84d", w: 1.8, shade: 2 }); k.circ(18, 38, 2.4, { fill: INK, ink: false, shade: 0 }); k.box(18, 31, 2, 6, 1, { fill: INK, ink: false, shade: 0 }); });
prop("N", "bookcase", (k) => { shadow(k, 16); k.box(18, 28, 34, 46, 1, { fill: "#6d4329", w: 1.8, shade: 0 }); for (let r = 0; r < 3; r++) { k.box(18, 13 + r * 15, 30, 12, 0, { fill: "#40281a", ink: false, shade: 0 }); for (let i = 0; i < 6; i++) k.box(7.5 + i * 4.3, 13.5 + r * 15, 3.6, 10, 0.3, { fill: ["#7c2b3a", "#2d3f85", "#3f7a4a", "#c9a24a"][(i * 3 + r) % 4], ink: false, shade: 0 }); } });
prop("I", "pillar", (k) => { k.box(18, 28, 26, 48, 0.5, { fill: "#d9d3c2", fill2: "#bab39f", w: 1.8, shade: 4 }); });
prop("A", "armchair", (k) => { shadow(k, 12); k.box(18, 36, 24, 18, 4, { fill: "#3b6fd4", w: 1.7, shade: 3 }); k.box(18, 43, 26, 12, 3, { fill: "#5a8be0", w: 1.7, shade: 3 }); });
prop("J", "paper belt", (k) => { k.box(18, 45, 36, 12, 0, { fill: "#fbf6e8", w: 0, ink: false, shade: 0 }); }, { solid: false });
prop("~", "paper chute", (k) => { k.box(18, 36, 36, 36, 0, { fill: "#f2ead5", ink: false, shade: 0 }); }, { solid: false, chute: true });
prop("&", "rug", () => {}, { solid: false });
prop("%", "server dark", (k) => { shadow(k, 15); k.box(18, 27, 30, 48, 1.5, { fill: "#20242f", w: 1.8, shade: 0 }); for (let i = 0; i < 6; i++) k.box(18, 9 + i * 7, 24, 4.6, 0.4, { fill: "#2d3442", ink: false, shade: 0 }); });
prop("$", "safe", (k) => { shadow(k, 15); k.box(18, 34, 30, 34, 2, { fill: "#6b7588", fill2: "#4b5468", w: 1.8, shade: 4 }); k.circ(18, 34, 8, { fill: "#aeb7c6", w: 1.5, shade: 2 }); k.line([[18, 28], [18, 40]], 1.4); k.line([[12, 34], [24, 34]], 1.4); });
prop("@", "throne desk", (k) => { shadow(k, 18); k.box(18, 42, 37, 18, 1.5, { fill: "#40281a", fill2: "#2c1a10", w: 1.8, shade: 0 }); k.box(18, 36, 37, 6, 1, { fill: "#6d4329", w: 1.6, shade: 0 }); k.box(18, 42, 16, 6, 0.5, { fill: "#c9a24a", w: 1.1, shade: 0 }); });
export function paintProps(game) {
    const cols = 8, rows = Math.ceil(propList.length / cols);
    game.assets.paint("props", PW * cols, PH * rows, (p) => {
        propList.forEach((draw, i) => { const k = new Ink({ width: PW, height: PH, stride: p.stride, data: p.data, x0: (i >> 3) * PH * p.stride + (i % cols) * PW }, 2); k.lw = 1.7; k.shadeBy = 0.22; draw(k); });
    }, { smooth: true });
    game.assets.grid("props", cols, rows);
}

// --- People -------------------------------------------------------------------------------------------------------------
const SKIN = ["#f6cfae", "#e0a97c", "#b97c4f", "#8a5636", "#f1c7a0"];
/** look: skin, hair, style (short bun bob long bald spike), top, legs, extra (tie lanyard glasses vest cardigan hat) */
export function paintPerson(game, id, look) {
    const name = "p:" + id;
    if (game.assets.sprites?.has?.(name)) return name;
    const W = 80, H = 96;
    game.assets.paint(name, W, H, (p, f) => {
        const k = new Ink(p, 2); k.lw = 1.7;
        const dir = f >> 1, step = f & 1; // 0 down, 1 up, 2 side (facing left)
        drawPerson(k, look, dir, step);
    }, { frames: 6, smooth: true });
    return name;
}
function drawPerson(k, L, dir, step) {
    const skin = L.skin ?? SKIN[0], hair = L.hair ?? "#4a3322", top = L.top ?? "#3b6fd4", legs = L.legs ?? "#39414f", cx = 20, s = step ? 2.2 : 0;
    k.ell(cx, 44.5, 11, 3, { fill: "#1e223344", ink: false, shade: 0 });
    // Legs
    if (dir === 2) { k.box(cx - 3 + s, 37, 6, 12, 2, { fill: legs, w: 1.5, shade: 0 }); k.box(cx + 3 - s, 37, 6, 12, 2, { fill: legs, w: 1.5, shade: 0 }); k.ell(cx - 5 + s, 43, 5, 2.6, { fill: "#2c2430", w: 1.2, shade: 0 }); k.ell(cx + 1 - s, 43, 5, 2.6, { fill: "#2c2430", w: 1.2, shade: 0 }); }
    else { k.box(cx - 4, 37 - (step ? 0.8 : 0), 6, 12 - (step ? 1.5 : 0), 2, { fill: legs, w: 1.5, shade: 0 }); k.box(cx + 4, 37 - (step ? 0 : 0.8), 6, 12 - (step ? 0 : 1.5), 2, { fill: legs, w: 1.5, shade: 0 }); k.ell(cx - 4, 43 - (step ? 1 : 0), 4, 2.6, { fill: "#2c2430", w: 1.2, shade: 0 }); k.ell(cx + 4, 43 - (step ? 0 : 1), 4, 2.6, { fill: "#2c2430", w: 1.2, shade: 0 }); }
    // Body
    if (L.style === "long" && dir === 1) k.box(cx, 26, 20, 14, 4, { fill: hair, ink: false, shade: 0 });
    k.box(cx, 28, 21, 18, 6, { fill: top, fill2: mix(top, INK, 0.18), w: 1.7, shade: 3 });
    if (dir !== 1) {
        if (L.extra === "tie") k.poly([[cx - 2 - (dir === 2 ? 3 : 0), 20], [cx + 2 - (dir === 2 ? 3 : 0), 20], [cx + 2 - (dir === 2 ? 3 : 0), 31], [cx - (dir === 2 ? 3 : 0), 34], [cx - 2 - (dir === 2 ? 3 : 0), 31]], { fill: L.tie ?? "#e5484d", w: 1, shade: 0 });
        if (L.extra === "lanyard") { k.line(Ink.curve([cx - 6, 20], [cx - 1, 28], [cx, 31]), 1.2, { color: "#e5484d" }); k.line(Ink.curve([cx + 6, 20], [cx + 1, 28], [cx, 31]), 1.2, { color: "#e5484d" }); k.box(cx, 33, 7, 6, 0.6, { fill: "#fffdf5", w: 1, shade: 0 }); }
        if (L.extra === "cardigan") { k.box(cx, 28, 5, 17, 0.5, { fill: "#fffdf5", w: 1, shade: 0 }); }
        if (L.extra === "vest") k.box(cx, 28, 13, 17, 3, { fill: "#ffd84d", w: 1.2, shade: 0 });
    }
    // Arms
    const sw = step ? 2.2 : -2.2;
    if (dir === 2) { k.box(cx + 1, 29 + sw * 0.4, 6, 14, 3, { fill: top, w: 1.5, shade: 0 }); k.circ(cx + 1, 36 + sw * 0.4, 2.8, { fill: skin, w: 1.3, shade: 0 }); }
    else { k.box(cx - 12, 29 + sw * 0.4, 5.5, 14, 3, { fill: top, w: 1.5, shade: 0 }); k.box(cx + 12, 29 - sw * 0.4, 5.5, 14, 3, { fill: top, w: 1.5, shade: 0 }); k.circ(cx - 12, 36 + sw * 0.4, 2.8, { fill: skin, w: 1.3, shade: 0 }); k.circ(cx + 12, 36 - sw * 0.4, 2.8, { fill: skin, w: 1.3, shade: 0 }); }
    // Head
    const hy = 12.5 + (step ? 0.6 : 0);
    k.ell(cx, hy, 12.5, 11.5, { fill: skin, w: 1.8, shade: 3 });
    const st = L.style ?? "short";
    if (st !== "bald") {
        if (dir === 1) { k.ell(cx, hy - 0.5, 12.5, 11.5, { fill: hair, w: 1.8, shade: 2 }); }
        else {
            const shift = dir === 2 ? 3 : 0;
            k.sdf((x, y) => Math.max(Math.hypot((x - cx) / 12.8, (y - hy + 1) / 11.8) - 1, (y - (hy - 3 + (dir === 2 ? 2 : 0) - (x - cx + shift) * 0.12)) / 8) * 8, cx - 13, hy - 13, cx + 13, hy + 2, { fill: hair, w: 1.7, shade: 2 });
            if (st === "long" || st === "bob") { k.box(cx + 10.5, hy + (st === "long" ? 5 : 2), 5, st === "long" ? 18 : 12, 2.4, { fill: hair, w: 1.4, shade: 0 }); if (dir === 0) k.box(cx - 10.5, hy + (st === "long" ? 5 : 2), 5, st === "long" ? 18 : 12, 2.4, { fill: hair, w: 1.4, shade: 0 }); }
        }
        if (st === "bun") k.circ(cx, hy - 12, 5, { fill: hair, w: 1.6, shade: 2 });
        if (st === "spike") for (let i = -2; i <= 2; i++) k.poly([[cx + i * 5 - 3, hy - 8], [cx + i * 5 + 3, hy - 8], [cx + i * 6, hy - 16]], { fill: hair, w: 1.4, shade: 0 });
    }
    if (dir !== 1) {
        const ex = dir === 2 ? -5 : 0, gap = dir === 2 ? 3.2 : 4.6;
        for (const sx of dir === 2 ? [-1.2, 1] : [-1, 1]) k.ell(cx + ex + sx * gap, hy + 2, 1.5, 2, { fill: INK, ink: false, shade: 0 });
        if (L.glasses) { for (const sx of [-1, 1]) k.circ(cx + ex + sx * gap, hy + 2, 3.4, { ink: INK, w: 1 }); }
        if (L.beard) k.sdf((x, y) => Math.max(Math.hypot((x - cx) / 12, (y - hy) / 11) - 1, (hy + 5 - y) / 6) * 6, cx - 12, hy + 4, cx + 12, hy + 12, { fill: L.beard, ink: false, shade: 0 });
        k.line([[cx + ex - 2, hy + 7], [cx + ex + 2, hy + 7]], 1, { color: "#7c3b34" });
    }
    if (L.extra === "hat") { k.ell(cx, hy - 7, 14, 3.4, { fill: L.tie ?? "#e5484d", w: 1.4, shade: 0 }); k.box(cx, hy - 11, 15, 8, 2.6, { fill: L.tie ?? "#e5484d", w: 1.4, shade: 0 }); }
}
