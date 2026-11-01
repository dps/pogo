// The ingredient cupboard: small painted objects, drawn around (0,0) in a space about 100 units wide.
// Used by card art, trinkets, events and the map.
import { blob, cut, both, mix, union } from "./kit.js";

const M = {};
export default M;
M.flame = (k, c = {}) => {
    const a = c.a ?? "#ff7a2f", b = c.b ?? "#ffd25a", e = c.c ?? "#fff6c9";
    const outer = (s) => blob(9 * s, k.cap(0, 34 * s, 0, 8 * s, 28 * s, 20 * s), k.cap(0, 12 * s, 6 * s, -44 * s, 18 * s, 1), k.cap(-16 * s, 18 * s, -22 * s, -14 * s, 12 * s, 1), k.cap(16 * s, 18 * s, 24 * s, -8 * s, 11 * s, 1));
    k.fill(outer(1), { c: "#e8452a", c2: a, hi: "#ffb347", lo: "#8f1f2a" });
    k.fill(outer(0.68), { c: a, c2: b, inkW: 0, hi: "#ffe28a" });
    k.fill(outer(0.36), { c: b, c2: e, inkW: 0, hi: "#ffffff", grain: 0 });
};
M.pepper = (k, c = {}) => {
    const a = c.a ?? "#e8352a";
    k.fill(k.curve([[-26, -18], [-10, -22], [16, -6], [28, 26], [20, 40]], 19, 1.5), { c: a, gloss: 0.8 });
    k.fill(k.curve([[-30, -22], [-36, -32], [-30, -42]], 4, 3), { c: "#5faa3a" });
    k.fill(k.ell(-28, -22, 11, 6, -0.6), { c: "#6fce46" });
};
M.coal = (k, c = {}) => {
    k.fill(k.polygon([[-38, 10], [-24, -24], [6, -36], [36, -14], [40, 16], [12, 34], [-26, 30]]), { c: "#3b3145", hi: "#7f6f8c", lo: "#150e20" });
    k.fill(k.polygon([[-12, 8], [-2, -8], [12, 2], [4, 14]]), { c: "#ffb347", flat: true, inkW: 0 });
    k.fill(k.polygon([[12, 18], [24, 8], [28, 16], [18, 24]]), { c: "#ff7a2f", flat: true, inkW: 0 });
    k.glow(0, 4, 30, "#ff6a20", 0.5);
};
M.match = (k) => {
    k.fill(k.box(4, 16, 9, 66, 3, 0.26), { c: "#e7c58d" });
    k.fill(k.ell(-5, -22, 10, 13, 0.26), { c: "#d8352a", gloss: 0.6 });
    k.save().at(-8, -42, 0.5); M.flame(k); k.restore();
};
M.bellows = (k) => {
    k.fill(k.polygon([[-40, -24], [24, -6], [24, 6], [-40, 24]]), { c: "#b27842", lo: "#4e2a1c" });
    for (let i = 0; i < 4; i++) k.fill(k.box(-30 + i * 13, 0, 4, 40 - i * 8, 2), { c: "#7a4a2e", flat: true, inkW: 0 });
    k.fill(k.polygon([[22, -6], [44, -2], [44, 2], [22, 6]]), { c: "#d9a648", gloss: 0.8 });
    k.fill(k.cap(-40, 0, -52, 0, 6), { c: "#7a4a2e" });
};
M.drop = (k, c = {}) => {
    const a = c.a ?? "#2fb6e8";
    k.fill(blob(6, k.circle(0, 12, 28), k.cap(0, 4, 0, -38, 20, 1)), { c: a, c2: mix(a, "#10407f", 0.45), hi: "#d9fbff", gloss: 1 });
    k.fill(k.ell(-10, 12, 5, 9, 0.2), { c: "#ffffff", flat: true, inkW: 0, alpha: 0.7 });
};
M.salt = (k, c = {}) => {
    k.fill(k.polygon([[-42, 30], [-18, -6], [0, -26], [18, -4], [44, 30]]), { c: c.a ?? "#eef6fb", hi: "#ffffff", lo: "#7f9ec6" });
    k.dots(16, 4, -44, -20, 90, 52, 1, 2.6, "#ffffff", 1);
};
M.wave = (k, c = {}) => {
    const a = c.a ?? "#2fb6e8";
    k.fill(cut(blob(5, k.circle(-6, 10, 36), k.cap(-30, 34, 44, 34, 10)), k.circle(18, -8, 21)), { c: a, c2: "#12518f", hi: "#c8f6ff" });
    k.fill(k.curve([[-26, -14], [-4, -28], [22, -26], [30, -12]], 6, 2), { c: "#e9fbff", hi: "#ffffff", lo: "#8fd3ef" });
};
M.shell = (k) => {
    k.fill(k.ell(0, 2, 40, 34), { c: "#ffb7a0", c2: "#e87a7a", hi: "#fff0dc" });
    for (let i = -3; i <= 3; i++) k.fill(k.cap(0, 32, i * 13, -22 + Math.abs(i) * 5, 1.3, 2), { c: "#b64a5c", flat: true, inkW: 0, alpha: 0.7 });
    k.fill(k.box(0, 34, 26, 10, 4), { c: "#e88a84" });
};
M.fish = (k) => {
    k.fill(blob(4, k.ell(-4, 0, 34, 18), k.polygon([[26, 0], [50, -18], [46, 0], [50, 18]])), { c: "#7fc8e0", c2: "#3f7fb0", gloss: 0.5 });
    k.fill(k.circle(-22, -4, 5.5), { c: "#fff", flat: true });
    k.fill(k.circle(-23, -4, 2.5), { c: "#1b1030", flat: true, inkW: 0 });
    k.fill(k.cap(-34, 6, -28, 8, 1.3), { c: "#1b1030", flat: true, inkW: 0 });
};
M.kelp = (k, c = {}) => {
    const a = c.a ?? "#3aa070";
    k.fill(k.curve([[-14, 46], [-24, 14], [-4, -8], [-18, -44]], 9, 2), { c: a, hi: "#b6ec9a" });
    k.fill(k.curve([[14, 46], [24, 18], [8, -2], [22, -30]], 8, 2), { c: mix(a, "#124f4f", 0.3) });
    k.fill(k.ell(-30, -6, 9, 5, -0.5), { c: a });
    k.fill(k.ell(30, 2, 9, 5, 0.5), { c: a });
};
M.cloud = (k, c = {}) => {
    k.fill(blob(6, k.circle(-22, 6, 18), k.circle(2, -6, 24), k.circle(26, 8, 16), k.box(0, 16, 72, 14, 7)), { c: c.a ?? "#dfe6f2", c2: "#8c97b8", hi: "#ffffff" });
};
M.bubble = (k, c = {}) => {
    for (const [x, y, r] of [[-14, 14, 22], [20, -8, 15], [-12, -26, 10], [24, 26, 8]]) {
        k.fill(k.circle(x, y, r), { c: c.a ?? "#a9f0d0", alpha: 0.75, hi: "#ffffff", gloss: 1, inkW: 1 });
    }
};
M.teacup = (k, c = {}) => {
    k.fill(k.ell(0, 30, 44, 8), { c: "#efe3cc", lo: "#a28f7c" });
    k.fill(k.cap(30, -4, 40, 8, 7, 6), { c: "#efe3cc" });
    k.fill(k.cap(30, -4, 40, 8, 3, 3), { c: "#4a3a62", flat: true, inkW: 0 });
    k.fill(blob(4, k.box(0, 0, 60, 26, 8), k.ell(0, 16, 26, 10)), { c: "#f5ecd8", lo: "#a08fa8" });
    k.fill(k.ell(0, -12, 30, 7), { c: c.a ?? "#7fae4a", gloss: 0.5 });
};
M.leaf = (k, c = {}) => {
    const a = c.a ?? "#6fce46";
    k.fill(both(k.circle(-16, 10, 40), k.circle(16, -10, 40)), { c: a, c2: mix(a, "#124f3a", 0.45), hi: "#e9ffb0" });
    k.fill(k.cap(-26, 28, 22, -24, 1.5, 0.7), { c: "#1f5a30", flat: true, inkW: 0 });
};
M.nettle = (k) => {
    k.fill(k.curve([[0, 48], [2, 10], [-2, -36]], 3.4, 1.6), { c: "#4a8f3a" });
    for (const [x, y, r, s] of [[-20, 8, 0.7, 0.5], [20, 0, -0.7, 0.5], [-14, -18, 0.5, 0.42], [14, -26, -0.5, 0.4], [0, -40, 0, 0.36]]) { k.save().at(x, y, s, r); M.leaf(k, { a: "#5fb53a" }); k.restore(); }
    for (let i = 0; i < 6; i++) k.fill(k.cap(0, 30 - i * 11, i % 2 ? 7 : -7, 27 - i * 11, 1.2, 0.3), { c: "#d9f79a", flat: true, inkW: 0 });
};
M.mushroom = (k, c = {}) => {
    k.fill(k.cap(0, 42, 0, 0, 13, 9), { c: "#efe4cc", lo: "#9c8a84" });
    k.fill(cut(k.ell(0, -4, 42, 34), k.box(0, 28, 90, 30, 0)), { c: c.a ?? "#d8352a", hi: "#ff9a8a", gloss: 0.7, lo: "#6c1a3a" });
    k.fill(k.ell(0, 12, 34, 5), { c: "#c9b69a", lo: "#7a6470", inkW: 1 });
    for (const [x, y, r] of [[-20, -14, 7], [4, -24, 8], [24, -6, 5.5], [-4, -2, 4]]) k.fill(k.circle(x, y, r), { c: "#fff4e0", flat: true, inkW: 0 });
};
M.vine = (k, c = {}) => {
    k.fill(k.curve([[-46, 36], [-16, 20], [-22, -12], [14, -16], [18, 16], [46, -36]], 5, 2.5), { c: c.a ?? "#4a8f3a", hi: "#b6ec9a" });
    for (const [x, y, r] of [[-30, 22, 0.8], [-20, -8, -1], [10, -16, 2.3], [24, 8, 0.3]]) k.fill(k.polygon([[0, 0], [-4, -3], [-1, -14], [3, -2]].map(([u, v]) => [x + u * Math.cos(r) - v * Math.sin(r), y + u * Math.sin(r) + v * Math.cos(r)])), { c: "#e6f7b0", flat: true, inkW: 1 });
};
M.acorn = (k) => {
    k.fill(k.ell(0, 12, 25, 32), { c: "#c98a3f", c2: "#8c5426", hi: "#ffd68a", gloss: 0.8 });
    k.fill(cut(k.ell(0, -12, 32, 22), k.box(0, 12, 80, 22, 0)), { c: "#7a5230", hi: "#b08050" });
    k.fill(k.cap(0, -30, 4, -42, 3), { c: "#5a3a22" });
};
M.flower = (k, c = {}) => {
    const a = c.a ?? "#d86ae0";
    for (let i = 0; i < 6; i++) { const r = i * Math.PI / 3; k.fill(k.ell(Math.cos(r) * 22, Math.sin(r) * 22, 17, 11, r), { c: a, hi: mix(a, "#ffffff", 0.7) }); }
    k.fill(k.circle(0, 0, 11), { c: "#ffd25a", gloss: 0.6 });
};
M.clover = (k) => {
    for (let i = 0; i < 4; i++) { const r = i * Math.PI / 2 + Math.PI / 4; k.fill(blob(3, k.circle(Math.cos(r) * 18 - Math.sin(r) * 8, Math.sin(r) * 18 + Math.cos(r) * 8, 12), k.circle(Math.cos(r) * 18 + Math.sin(r) * 8, Math.sin(r) * 18 - Math.cos(r) * 8, 12)), { c: "#6fce46", hi: "#d9f79a" }); }
    k.fill(k.curve([[0, 2], [4, 26], [14, 44]], 2.5, 1.5), { c: "#3f7f3a" });
};
M.root = (k) => {
    k.fill(blob(7, k.ell(0, -10, 19, 26), k.cap(-6, 10, -24, 40, 8, 2), k.cap(6, 10, 22, 42, 8, 2), k.cap(-14, -8, -38, 0, 6, 2), k.cap(14, -8, 38, -6, 6, 2)), { c: "#c79a6a", c2: "#7a5230" });
    k.fill(k.circle(-7, -16, 3), { c: "#1b1030", flat: true, inkW: 0 });
    k.fill(k.circle(7, -16, 3), { c: "#1b1030", flat: true, inkW: 0 });
    k.fill(k.ell(0, -6, 5, 6), { c: "#3a1a2a", flat: true, inkW: 0 });
    for (let i = -1; i <= 1; i++) k.fill(k.ell(i * 9, -40, 7, 12, i * 0.5), { c: "#6fce46" });
};
M.crystal = (k, c = {}) => {
    const a = c.a ?? "#a9dcf5";
    k.fill(k.polygon([[-16, 40], [-26, -6], [0, -44], [26, -6], [16, 40]]), { c: a, hi: "#ffffff", bevel: 8, gloss: 0.8, lo: mix(a, "#3a4fb0", 0.7) });
    k.fill(k.polygon([[0, -44], [8, -6], [0, 40], [-8, -6]]), { c: "#ffffff", flat: true, inkW: 0, alpha: 0.28 });
    k.fill(k.polygon([[26, 40], [30, 10], [40, -6], [46, 14], [40, 40]]), { c: mix(a, "#6c7fe0", 0.3), bevel: 6 });
};
M.snow = (k, c = {}) => {
    const a = c.a ?? "#e6f6ff";
    for (let i = 0; i < 6; i++) {
        const r = i * Math.PI / 3, cs = Math.cos(r), sn = Math.sin(r);
        k.fill(k.cap(0, 0, cs * 42, sn * 42, 3.4, 2), { c: a, inkW: 1, flat: true });
        for (const q of [22, 32]) for (const s of [-1, 1]) { const r2 = r + s * 0.8; k.fill(k.cap(cs * q, sn * q, cs * q + Math.cos(r2) * 12, sn * q + Math.sin(r2) * 12, 2, 1.2), { c: a, inkW: 0.7, flat: true }); }
    }
};
M.icicle = (k) => {
    for (const [x, w, l] of [[-22, 13, 46], [0, 17, 86], [22, 12, 58]]) k.fill(k.polygon([[x - w, -40], [x + w, -40], [x + 3, -40 + l], [x - 2, -40 + l]]), { c: "#d4f2ff", c2: "#7fb6ea", hi: "#ffffff", bevel: 7, gloss: 0.9 });
    k.fill(k.box(0, -42, 72, 8, 4), { c: "#f2fcff" });
};
M.orb = (k, c = {}) => {
    const a = c.a ?? "#bfeaff";
    k.fill(k.circle(0, 0, 36), { c: a, c2: mix(a, "#4a5fd0", 0.6), hi: "#ffffff", gloss: 1 });
    k.fill(k.ell(-13, -14, 7, 11, 0.7), { c: "#ffffff", flat: true, inkW: 0, alpha: 0.75 });
};
M.moon = (k, c = {}) => {
    k.fill(cut(k.circle(0, 0, 38), k.circle(18, -8, 32)), { c: c.a ?? "#ffe9a8", hi: "#fffbe0", lo: "#c78a4a" });
};
M.sun = (k) => {
    for (let i = 0; i < 12; i++) { const r = i * Math.PI / 6; k.fill(k.polygon([[Math.cos(r - 0.18) * 27, Math.sin(r - 0.18) * 27], [Math.cos(r) * (i % 2 ? 42 : 50), Math.sin(r) * (i % 2 ? 42 : 50)], [Math.cos(r + 0.18) * 27, Math.sin(r + 0.18) * 27]]), { c: "#ffb347", hi: "#ffe28a" }); }
    k.fill(k.circle(0, 0, 28), { c: "#ffe28a", c2: "#ff9a2f", hi: "#ffffff", gloss: 0.6 });
    k.glow(0, 0, 50, "#ffb347", 0.5);
};
M.eye = (k, c = {}) => {
    const lid = both(k.ell(0, 16, 44, 40), k.ell(0, -16, 44, 40));
    k.fill(lid, { c: "#f5ead8", lo: "#a890b8" });
    k.fill(k.circle(0, 0, 16), { c: c.a ?? "#b45cff", hi: "#eec3ff", lo: "#2a1450", inkW: 1.5 });
    k.fill(k.ell(0, 0, 4, 11), { c: "#120822", flat: true, inkW: 0 });
    k.fill(k.circle(-5, -6, 3), { c: "#fff", flat: true, inkW: 0 });
    for (let i = -2; i <= 2; i++) k.fill(k.cap(i * 15, -24 + Math.abs(i) * 4, i * 21, -36 + Math.abs(i) * 6, 1.5, 1), { c: "#1b1030", flat: true, inkW: 0 });
};
M.skull = (k, c = {}) => {
    const a = c.a ?? "#efe6d4";
    k.fill(blob(4, k.ell(0, -8, 32, 30), k.box(0, 24, 30, 22, 6)), { c: a, lo: "#7f6f8c" });
    k.fill(k.ell(-13, -6, 9, 10), { c: "#1b1030", flat: true, inkW: 0 });
    k.fill(k.ell(13, -6, 9, 10), { c: "#1b1030", flat: true, inkW: 0 });
    k.fill(k.polygon([[0, 6], [-5, 15], [5, 15]]), { c: "#1b1030", flat: true, inkW: 0 });
    for (let i = -1; i <= 2; i++) k.fill(k.box(-5 + i * 7 - 2, 28, 1.6, 12, 0), { c: "#1b1030", flat: true, inkW: 0 });
};
M.bone = (k, c = {}) => {
    const a = c.a ?? "#efe6d4";
    k.fill(blob(3, k.cap(-30, 22, 30, -22, 8), k.circle(-34, 16, 10), k.circle(-26, 30, 10), k.circle(34, -16, 10), k.circle(26, -30, 10)), { c: a, lo: "#7f6f8c" });
};
M.pin = (k) => {
    k.fill(k.polygon([[-3, -30], [3, -30], [0.5, 46], [-0.5, 46]]), { c: "#c7d3df", hi: "#ffffff", lo: "#5a6480", bevel: 3, inkW: 1 });
    k.fill(k.circle(0, -34, 11), { c: "#3b2a5a", hi: "#a07fe0", gloss: 1 });
};
M.spider = (k) => {
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) k.fill(k.curve([[s * 8, -2 + i * 4], [s * (26 + i * 2), -20 + i * 14], [s * (42 - i * 2), 2 + i * 12]], 2.4, 1), { c: "#2b2438", inkW: 0.8, flat: true });
    k.fill(k.ell(0, 12, 17, 20), { c: "#3b2a5a", hi: "#a07fe0", gloss: 1 });
    k.fill(k.circle(0, -10, 10), { c: "#2b2438", hi: "#7f6f8c" });
    k.fill(k.circle(-4, -12, 2.4), { c: "#ff5ca8", flat: true, inkW: 0 });
    k.fill(k.circle(4, -12, 2.4), { c: "#ff5ca8", flat: true, inkW: 0 });
    k.fill(k.cap(0, -44, 0, -20, 0.7), { c: "#e6e0f0", flat: true, inkW: 0 });
};
M.cat = (k) => {
    k.fill(k.curve([[24, 30], [46, 20], [44, -8], [34, -22]], 5, 3), { c: "#2b2438", hi: "#6a5a80" });
    k.fill(blob(5, k.ell(0, 20, 26, 26), k.circle(0, -14, 20), k.polygon([[-20, -22], [-22, -44], [-4, -30]]), k.polygon([[20, -22], [22, -44], [4, -30]])), { c: "#2b2438", hi: "#6a5a80", lo: "#120a1e" });
    k.fill(k.ell(-8, -14, 5, 6), { c: "#ffe066", flat: true, inkW: 0 });
    k.fill(k.ell(8, -14, 5, 6), { c: "#ffe066", flat: true, inkW: 0 });
    k.fill(k.ell(-8, -14, 1.5, 5), { c: "#120822", flat: true, inkW: 0 });
    k.fill(k.ell(8, -14, 1.5, 5), { c: "#120822", flat: true, inkW: 0 });
};
M.raven = (k) => {
    k.fill(blob(6, k.ell(0, 8, 32, 22, -0.3), k.circle(-24, -12, 15), k.polygon([[20, 8], [52, 16], [24, 26]])), { c: "#2b2a46", hi: "#7b7fb0", lo: "#100c20" });
    k.fill(k.polygon([[-36, -14], [-54, -8], [-36, -6]]), { c: "#ffb347", bevel: 3 });
    k.fill(k.circle(-27, -15, 3), { c: "#ffe066", flat: true, inkW: 0 });
    k.fill(k.ell(4, 4, 22, 11, -0.3), { c: "#3b3a60", hi: "#9fa3d8" });
};
M.candle = (k, c = {}) => {
    k.fill(k.box(0, 18, 28, 52, 4), { c: c.a ?? "#f2e6c8", c2: "#c7a878" });
    k.fill(k.curve([[-14, -6], [-16, 6], [-13, 16]], 3, 1.5), { c: c.a ?? "#f2e6c8" });
    k.fill(k.ell(0, 44, 30, 7), { c: "#c79a3a", gloss: 0.8 });
    k.save().at(0, -24, 0.42); M.flame(k); k.restore();
    k.glow(0, -24, 34, "#ffb347", 0.4);
};
M.coin = (k, c = {}) => {
    const a = c.a ?? "#f7c33c";
    k.fill(k.circle(0, 0, 36), { c: a, hi: "#fff6c0", lo: "#9a5a1a", gloss: 1 });
    k.fill(k.circle(0, 0, 26), { c: mix(a, "#c7801f", 0.3), hi: "#ffe88a", bevel: 8, inkW: 1 });
    k.fill(cut(k.circle(0, 0, 15), k.circle(7, -3, 12)), { c: "#ffe88a", flat: true, inkW: 0 });
};
M.key = (k) => {
    k.fill(cut(k.circle(0, -26, 18), k.circle(0, -26, 8)), { c: "#f7c33c", gloss: 1, hi: "#fff6c0" });
    k.fill(k.box(0, 14, 9, 64, 3), { c: "#f7c33c", hi: "#fff6c0" });
    k.fill(k.box(11, 34, 16, 7, 2), { c: "#f7c33c" });
    k.fill(k.box(9, 20, 12, 6, 2), { c: "#f7c33c" });
};
M.ring = (k, c = {}) => {
    k.fill(cut(k.ell(0, 6, 34, 34), k.ell(0, 6, 22, 22)), { c: c.a ?? "#f7c33c", hi: "#fff6c0", gloss: 1, bevel: 6 });
    k.fill(k.polygon([[-12, -30], [0, -44], [12, -30], [0, -20]]), { c: "#ff5ca8", hi: "#ffd0e8", bevel: 5, gloss: 1 });
};
M.scales = (k) => {
    k.fill(k.box(0, 8, 6, 72, 2), { c: "#f7c33c" });
    k.fill(k.box(0, -24, 84, 5, 2), { c: "#f7c33c", hi: "#fff6c0" });
    k.fill(k.box(0, 44, 36, 8, 3), { c: "#c7801f" });
    for (const s of [-1, 1]) { k.fill(k.cap(s * 40, -22, s * 28, 12, 0.8), { c: "#c7d3df", flat: true, inkW: 0 }); k.fill(k.cap(s * 40, -22, s * 52, 12, 0.8), { c: "#c7d3df", flat: true, inkW: 0 }); k.fill(cut(k.ell(s * 40, 12, 18, 10), k.box(s * 40, 2, 40, 18, 0)), { c: "#f7c33c", gloss: 0.8 }); }
};
M.crown = (k) => {
    k.fill(k.polygon([[-38, 26], [-44, -22], [-20, 2], [0, -32], [20, 2], [44, -22], [38, 26]]), { c: "#f7c33c", hi: "#fff6c0", gloss: 1, bevel: 12 });
    for (const [x, y, c] of [[-18, 16, "#ff5ca8"], [0, 14, "#2fb6e8"], [18, 16, "#6fce46"]]) k.fill(k.circle(x, y, 5.5), { c, gloss: 1 });
};
M.spoon = (k, c = {}) => {
    const a = c.a ?? "#c7d3df";
    k.fill(k.cap(0, -6, 0, 48, 5, 3), { c: a, hi: "#ffffff" });
    k.fill(k.ell(0, -28, 17, 23), { c: a, hi: "#ffffff", lo: "#4a5f88", gloss: 1 });
    k.fill(k.ell(2, -26, 10, 15), { c: mix(a, "#3a4f78", 0.5), flat: true, inkW: 0 });
};
M.flask = (k, c = {}) => {
    const a = c.a ?? "#7ef0c8";
    const body = blob(3, k.circle(0, 16, 30), k.box(0, -22, 20, 34, 3));
    k.fill(body, { c: "#dfeaf5", alpha: 0.55, hi: "#ffffff", gloss: 1 });
    k.fill(both(k.circle(0, 16, 26), k.box(0, 28, 70, 42, 0)), { c: a, c2: mix(a, "#124f7f", 0.5), hi: "#ffffff", inkW: 0 });
    k.fill(k.box(0, -40, 26, 12, 3), { c: "#b27842" });
    k.fill(k.circle(-8, 26, 3.5), { c: "#ffffff", flat: true, inkW: 0, alpha: 0.7 });
    k.fill(k.circle(8, 18, 2.5), { c: "#ffffff", flat: true, inkW: 0, alpha: 0.7 });
};
M.book = (k, c = {}) => {
    const a = c.a ?? "#7a3a4a";
    k.fill(k.box(4, 4, 76, 62, 4), { c: "#efe3cc", lo: "#a89c80" });
    k.fill(k.box(-2, 0, 76, 62, 5), { c: a, hi: mix(a, "#ffd27a", 0.5) });
    k.fill(k.box(-34, 0, 7, 62, 2), { c: mix(a, "#1b1030", 0.4), flat: true });
    k.fill(k.circle(0, 0, 13), { c: "#f7c33c", hi: "#fff6c0", gloss: 1, bevel: 5 });
    k.fill(k.ell(0, 0, 3, 9), { c: "#1b1030", flat: true, inkW: 0 });
};
M.hourglass = (k) => {
    k.fill(k.polygon([[-26, -38], [26, -38], [4, 0], [26, 38], [-26, 38], [-4, 0]]), { c: "#dfeaf5", alpha: 0.55, hi: "#ffffff", bevel: 6 });
    k.fill(k.polygon([[-16, -24], [16, -24], [2, 0], [-2, 0]]), { c: "#f7c33c", flat: true, inkW: 0 });
    k.fill(k.polygon([[-20, 34], [0, 12], [20, 34]]), { c: "#f7c33c", inkW: 0 });
    k.fill(k.box(0, -42, 66, 9, 3), { c: "#9a5a2a", hi: "#e7b75e" });
    k.fill(k.box(0, 42, 66, 9, 3), { c: "#9a5a2a", hi: "#e7b75e" });
};
M.feather = (k, c = {}) => {
    const a = c.a ?? "#d7c8ff";
    k.fill(both(k.ell(-12, 0, 34, 50, 0.4), k.ell(12, 0, 34, 50, 0.4)), { c: a, hi: "#ffffff" });
    k.fill(k.cap(-22, 44, 18, -38, 1.8, 0.6), { c: "#4a3a62", flat: true, inkW: 0 });
};
M.star = (k, c = {}) => {
    const pts = [];
    for (let i = 0; i < 8; i++) { const r = i * Math.PI / 4 - Math.PI / 2, q = i % 2 ? 11 : 42; pts.push([Math.cos(r) * q, Math.sin(r) * q]); }
    k.fill(k.polygon(pts), { c: c.a ?? "#ffe28a", hi: "#ffffff", inkW: 1.5, bevel: 8 });
    k.glow(0, 0, 40, c.a ?? "#ffe28a", 0.4);
};
M.bolt = (k, c = {}) => {
    k.fill(k.polygon([[10, -46], [-22, 8], [-2, 8], [-12, 46], [24, -10], [4, -10]]), { c: c.a ?? "#ffe066", hi: "#ffffff", bevel: 7 });
    k.glow(0, 0, 44, c.a ?? "#ffe066", 0.35);
};
M.heart = (k, c = {}) => {
    const a = c.a ?? "#e83a5c";
    k.fill(blob(3, k.circle(-16, -8, 21), k.circle(16, -8, 21), k.polygon([[-34, 2], [34, 2], [0, 42]])), { c: a, hi: "#ffb0c0", gloss: 1, lo: "#6c1a3a" });
};
M.dice = (k) => {
    k.fill(k.box(0, 0, 66, 66, 11, 0.32), { c: "#efe3c4", lo: "#8c7a70" });
    for (const [x, y] of [[-16, -6], [12, -14], [0, 4], [-12, 20], [16, 14]]) k.fill(k.circle(x, y, 5), { c: "#3a1a3a", flat: true, inkW: 0 });
};
M.mirror = (k) => {
    k.fill(k.cap(0, 30, 0, 50, 6, 5), { c: "#c79a3a" });
    k.fill(k.ell(0, -8, 32, 40), { c: "#d7a848", hi: "#fff6c0", gloss: 1 });
    k.fill(k.ell(0, -8, 24, 32), { c: "#bfe0ff", c2: "#6a78c0", hi: "#ffffff", inkW: 1 });
    k.fill(k.cap(-12, 10, 8, -26, 2), { c: "#ffffff", flat: true, inkW: 0, alpha: 0.6 });
};
M.bell = (k) => {
    k.fill(blob(3, k.ell(0, -14, 21, 25), k.polygon([[-20, -8], [20, -8], [37, 28], [-37, 28]])), { c: "#d8a54a", hi: "#fff0b0", gloss: 1, lo: "#6c3a1a" });
    k.fill(k.circle(0, 36, 8), { c: "#8c5426" });
    k.fill(k.box(0, -42, 10, 8, 3), { c: "#8c5426" });
};
M.kettle = (k, c = {}) => {
    const a = c.a ?? "#d9793c";
    k.fill(k.polygon([[30, 4], [50, -18], [56, -14], [36, 22]]), { c: a });
    k.fill(k.curve([[-26, -22], [0, -48], [26, -22]], 3.5), { c: "#2b2438" });
    k.fill(k.ell(0, 8, 38, 30), { c: a, hi: "#ffe0a8", gloss: 1, lo: "#5a1a1a" });
    k.fill(k.ell(0, -20, 18, 6), { c: mix(a, "#1b1030", 0.3) });
    k.fill(k.circle(0, -27, 4.5), { c: "#2b2438" });
};
M.egg = (k) => {
    k.fill(k.ell(0, 6, 28, 36), { c: "#fff0c8", c2: "#ffb347", hi: "#ffffff", gloss: 0.7 });
    k.fill(k.polygon([[-27, -2], [-14, -10], [-4, 0], [8, -9], [18, 0], [28, -6], [24, -22], [0, -32], [-22, -20]]), { c: "#ffd25a", hi: "#ffffff", bevel: 8 });
    k.glow(0, 4, 30, "#ff9a2f", 0.35);
};
M.lizard = (k) => {
    k.fill(k.curve([[34, 34], [14, 38], [-14, 30], [-20, 0], [-6, -18], [-26, -30]], 9, 11), { c: "#d8352a", hi: "#ffb347", lo: "#5a1a2a" });
    k.fill(k.ell(-30, -30, 16, 10, 0.2), { c: "#d8352a", hi: "#ffb347" });
    k.fill(k.circle(-30, -35, 3.2), { c: "#ffe066", flat: true, inkW: 1 });
    for (let i = 0; i < 4; i++) k.fill(k.polygon([[-2 + i * 2, -12 + i * 14], [8 + i * 4, -8 + i * 14], [0 + i * 2, -2 + i * 14]]), { c: "#ffb347", bevel: 3 });
};
M.tentacle = (k) => {
    k.fill(k.curve([[-34, 44], [-26, 6], [8, 6], [14, -24], [-10, -36], [-20, -22]], 14, 2.5), { c: "#b45ce0", hi: "#ffb7e8", lo: "#3a1a6a" });
    for (let i = 0; i < 4; i++) k.fill(k.circle(-20 + i * 12, 10 - i * 9, 3.6 - i * 0.4), { c: "#ffd0f0", flat: true, inkW: 0.8 });
};
M.snake = (k, c = {}) => {
    const a = c.a ?? "#7ef0c8";
    k.fill(cut(k.circle(0, 0, 38), k.circle(0, 0, 25)), { c: a, hi: "#f0fff0", lo: "#124f4f", bevel: 8 });
    k.fill(k.ell(30, -24, 14, 10, 0.8), { c: a, hi: "#f0fff0" });
    k.fill(k.circle(34, -27, 2.6), { c: "#1b1030", flat: true, inkW: 0 });
    for (let i = 0; i < 10; i++) { const r = i * 0.62 + 0.6; k.fill(k.circle(Math.cos(r) * 31, Math.sin(r) * 31, 2.2), { c: "#124f4f", flat: true, inkW: 0, alpha: 0.6 }); }
};
M.poppet = (k) => {
    k.fill(blob(3, k.circle(0, -22, 18), k.box(0, 12, 24, 40, 8), k.cap(-8, 0, -30, -6, 7), k.cap(8, 0, 30, -6, 7), k.cap(-7, 28, -16, 46, 7), k.cap(7, 28, 16, 46, 7)), { c: "#c9a878", lo: "#5a3a3a" });
    k.fill(k.cap(-10, -28, -4, -22, 1), { c: "#1b1030", flat: true, inkW: 0 });
    k.fill(k.cap(-4, -28, -10, -22, 1), { c: "#1b1030", flat: true, inkW: 0 });
    k.fill(k.circle(8, -25, 3), { c: "#d8352a", flat: true, inkW: 0 });
    k.fill(k.curve([[-8, -13], [0, -11], [8, -14]], 0.9), { c: "#1b1030", flat: true, inkW: 0 });
};
M.pouch = (k, c = {}) => {
    k.fill(blob(5, k.ell(0, 14, 32, 28), k.cap(-8, -10, -14, -30, 6), k.cap(8, -10, 14, -30, 6), k.cap(0, -10, 0, -32, 7)), { c: c.a ?? "#8c5a3a", hi: "#e7b98a" });
    k.fill(k.box(0, -10, 34, 6, 3), { c: "#f7c33c", gloss: 0.8 });
};
M.tooth = (k) => {
    k.fill(blob(3, k.ell(0, -12, 28, 24), k.cap(-11, 4, -12, 40, 11, 5), k.cap(11, 4, 12, 40, 11, 5)), { c: "#f7c33c", hi: "#fff6c0", gloss: 1, lo: "#9a5a1a" });
};
M.hand = (k) => {
    k.fill(blob(4, k.box(0, 20, 40, 40, 12), k.cap(-15, 6, -19, -30, 5.5), k.cap(-5, 4, -6, -38, 5.5), k.cap(6, 4, 8, -36, 5.5), k.cap(16, 8, 20, -26, 5), k.cap(-20, 24, -38, 4, 6)), { c: "#e8c8a8", lo: "#8c5a6a" });
};
M.hat = (k, c = {}) => {
    const a = c.a ?? "#4a2a8a";
    k.fill(k.ell(0, 30, 46, 11), { c: mix(a, "#1b1030", 0.25), hi: "#8a6ae0" });
    k.fill(blob(2, k.polygon([[-26, 28], [26, 28], [10, -8], [-8, -14]]), k.cap(-5, -10, 22, -38, 9, 2)), { c: a, hi: "#a88cf0", lo: "#1f1040" });
    k.fill(k.box(0, 20, 54, 9, 2), { c: "#f7c33c", gloss: 0.8 });
};
M.toad = (k) => {
    k.fill(blob(6, k.ell(0, 16, 36, 24), k.circle(-16, -8, 11), k.circle(16, -8, 11)), { c: "#7fbf58", c2: "#3f7f3a", hi: "#d9f79a" });
    for (const s of [-1, 1]) { k.fill(k.circle(s * 16, -12, 7), { c: "#ffe066", flat: true }); k.fill(k.ell(s * 16, -12, 5, 2.5), { c: "#120822", flat: true, inkW: 0 }); }
    k.fill(k.curve([[-20, 12], [0, 18], [20, 12]], 1.5), { c: "#1f5a30", flat: true, inkW: 0 });
};
M.rat = (k) => {
    k.fill(k.curve([[28, 26], [46, 28], [50, 8]], 3, 1), { c: "#d8a0a0" });
    k.fill(blob(5, k.ell(6, 14, 28, 20), k.ell(-20, 4, 16, 11, 0.3)), { c: "#a08a78", hi: "#e0d0c0" });
    k.fill(k.circle(-8, -8, 9), { c: "#a08a78", hi: "#e8b0b0" });
    k.fill(k.circle(-26, 0, 2.6), { c: "#120822", flat: true, inkW: 0 });
    k.fill(k.circle(-35, 6, 2.6), { c: "#e88a9a", flat: true, inkW: 0 });
};
M.shield = (k) => {
    k.fill(k.polygon([[-34, -34], [34, -34], [34, 6], [0, 42], [-34, 6]]), { c: "#7c8294", hi: "#e0e6f0", gloss: 0.8, bevel: 10 });
    k.fill(k.box(0, -4, 8, 54, 2), { c: "#d9a648", flat: true, inkW: 0 });
    k.fill(k.box(0, -12, 50, 8, 2), { c: "#d9a648", flat: true, inkW: 0 });
};
M.cardart = (k) => {
    k.fill(k.box(0, 0, 54, 80, 6, -0.1), { c: "#efe3cc", lo: "#a89c80" });
    k.fill(k.box(0, 0, 40, 64, 3, -0.1), { c: "#3b2a5a", hi: "#7f5fc0", inkW: 1 });
    k.save().at(0, 0, 0.5, -0.1); M.star(k); k.restore();
};
