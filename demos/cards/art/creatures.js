// The tower's residents, three witches and the cauldron, painted around (100,100) on a 200-unit canvas.
import { blob, cut, both, mix, union } from "./kit.js";
import M from "./motifs.js";

function eyes(k, x, y, sp, r, o = {}) {
    for (const s of [-1, 1]) {
        k.fill(k.ell(x + s * sp, y, r, r * (o.tall ?? 1.1)), { c: o.white ?? "#fff7e6", flat: true, inkW: 1.4 });
        k.fill(k.circle(x + s * sp + (o.look ?? -1), y + 1, r * 0.5), { c: o.c ?? "#1b1030", flat: true, inkW: 0, grain: 0 });
        k.fill(k.circle(x + s * sp - r * 0.25, y - r * 0.3, r * 0.17), { c: "#fff", flat: true, inkW: 0, grain: 0 });
        if (o.angry) k.fill(k.cap(x + s * (sp + r), y - r * 1.3, x + s * (sp - r), y - r * 0.55, 2.1), { c: o.brow ?? k.ink, flat: true, inkW: 0 });
    }
}
const fangs = (k, x, y, w, n, c = "#fff7e6") => { for (let i = 0; i < n; i++) { const u = x - w / 2 + (i + 0.5) * w / n; k.fill(k.polygon([[u - 4, y], [u + 4, y], [u, y + 9]]), { c, flat: true, inkW: 1 }); } };
const mouth = (k, x, y, w, h) => k.fill(both(k.ell(x, y - h * 0.2, w, h), k.box(x, y + h, w * 3, h * 2.4, 0)), { c: "#3a1030", flat: true, inkW: 1.4 });

export const CREATURES = {
    rat(k) {
        k.fill(k.curve([[150, 150], [186, 156], [186, 118], [170, 110]], 6, 1.5), { c: "#d8a0a0", lo: "#7a4a5a" });
        k.fill(blob(14, k.ell(112, 130, 52, 42), k.ell(66, 114, 36, 28, 0.2), k.circle(136, 106, 14)), { c: "#8f7a6a", c2: "#5a4a50", hi: "#d8c8b0" });
        for (const [x, y] of [[62, 74], [100, 80]]) { k.fill(k.circle(x, y, 19), { c: "#8f7a6a", hi: "#c8b0a0" }); k.fill(k.circle(x, y + 1, 11), { c: "#e8a0a8", flat: true, inkW: 0 }); }
        eyes(k, 66, 104, 16, 9, { angry: true, c: "#d8352a" });
        k.fill(k.ell(38, 124, 7, 6), { c: "#e88a9a", gloss: 1 });
        fangs(k, 54, 136, 16, 2);
        for (const x of [78, 130]) k.fill(k.ell(x, 170, 16, 8), { c: "#7a6a5a" });
    },
    mold(k) {
        k.fill(blob(16, k.circle(100, 126, 56), k.circle(62, 106, 30), k.circle(140, 100, 34), k.circle(100, 76, 32)), { c: "#a6b86a", c2: "#5a7a4a", hi: "#e6f0a8" });
        for (const [x, y, r] of [[70, 80, 8], [132, 74, 11], [152, 124, 7], [56, 142, 9], [116, 156, 6]]) k.fill(k.circle(x, y, r), { c: "#e8f0c0", hi: "#fff", bevel: 4, inkW: 1 });
        eyes(k, 100, 114, 21, 12, { tall: 0.7, look: 0 });
        k.fill(k.ell(100, 120 - 18, 26, 6), { c: "#a6b86a", flat: true, inkW: 0 });
        k.fill(k.curve([[84, 144], [100, 138], [116, 146]], 2.2), { c: "#2f4a2a", flat: true, inkW: 0 });
    },
    imp(k) {
        k.fill(k.polygon([[62, 190], [52, 110], [74, 60], [74, 36], [126, 36], [126, 60], [148, 110], [138, 190]]), { c: "#8fe0c8", alpha: 0.42, hi: "#ffffff", gloss: 1, lo: "#2a6a7a" });
        k.fill(k.box(100, 28, 58, 18, 4), { c: "#b27842" });
        k.fill(blob(6, k.circle(100, 124, 32), k.ell(100, 160, 25, 24), k.polygon([[76, 106], [62, 76], [92, 96]]), k.polygon([[124, 106], [138, 76], [108, 96]])), { c: "#d8352a", hi: "#ffb347", lo: "#5a1a3a" });
        eyes(k, 100, 124, 13, 9, { angry: true, c: "#120822", white: "#ffe066" });
        mouth(k, 100, 142, 11, 6);
        fangs(k, 100, 138, 16, 2);
        k.fill(k.polygon([[62, 190], [52, 110], [74, 60], [74, 36], [126, 36], [126, 60], [148, 110], [138, 190]]), { c: "#cfeff0", alpha: 0.14, hi: "#ffffff", gloss: 1, inkW: 2 });
    },
    ghoul(k) {
        k.fill(k.curve([[150, 90], [170, 50], [178, 22]], 6, 4), { c: "#c7d3df", hi: "#fff" });
        k.fill(k.ell(182, 18, 15, 11, -0.3), { c: "#c7d3df", hi: "#fff", gloss: 1 });
        k.fill(blob(12, k.ell(100, 96, 40, 44), k.polygon([[60, 100], [140, 100], [162, 190], [120, 170], [100, 190], [78, 170], [40, 190]])), { c: "#b8d8c8", c2: "#6a8f9f", hi: "#ecfff0", lo: "#2f4a6a" });
        k.fill(k.curve([[138, 106], [156, 104], [152, 88]], 8, 7), { c: "#b8d8c8" });
        eyes(k, 100, 92, 16, 12, { c: "#1b1030", white: "#1b1030", look: 0 });
        for (const s of [-1, 1]) k.fill(k.circle(100 + s * 16, 92, 4), { c: "#ffe066", flat: true, inkW: 0 });
        mouth(k, 100, 122, 15, 12);
        k.fill(k.polygon([[66, 56], [134, 56], [140, 30], [118, 38], [100, 24], [82, 38], [60, 30]]), { c: "#f2f2f8", lo: "#8f97b8" });
    },
    wight(k) {
        k.fill(blob(5, k.box(100, 132, 76, 110, 12), k.cap(64, 90, 56, 130, 7, 3), k.cap(132, 88, 142, 150, 8, 3), k.cap(100, 88, 114, 120, 6, 3)), { c: "#efe3c4", c2: "#c7a878", lo: "#7a5a6a" });
        k.fill(k.ell(100, 186, 62, 12), { c: "#d9c090", lo: "#7a5a6a" });
        eyes(k, 100, 112, 18, 13, { white: "#1b1030", look: 0, tall: 1.3 });
        for (const s of [-1, 1]) k.fill(k.circle(100 + s * 18, 112, 5), { c: "#ff7a2f", flat: true, inkW: 0 });
        mouth(k, 100, 146, 13, 9);
        k.fill(k.cap(100, 76, 100, 62, 2), { c: "#2b2438" });
        k.save().at(100, 40, 0.72); M.flame(k); k.restore();
        k.glow(100, 40, 60, "#ff9a2f", 0.35);
    },
    pickle(k) {
        k.fill(k.box(100, 112, 150, 158, 26), { c: "#bfe0b0", alpha: 0.32, hi: "#fff", gloss: 1, lo: "#3a6a5a" });
        k.fill(blob(10, k.ell(100, 124, 44, 58), k.cap(66, 110, 34, 86, 12, 8), k.cap(134, 110, 164, 142, 12, 8)), { c: "#7fae4a", c2: "#3f7f3a", hi: "#d9f79a" });
        for (const [x, y] of [[74, 90], [120, 84], [84, 160], [124, 150], [68, 128], [136, 118]]) k.fill(k.circle(x, y, 4), { c: "#4f8f3a", hi: "#b6ec9a", inkW: 1, bevel: 3 });
        eyes(k, 100, 104, 18, 13, { angry: true, c: "#d8352a" });
        mouth(k, 100, 134, 20, 13);
        fangs(k, 100, 130, 30, 4);
        k.fill(k.box(100, 28, 112, 26, 8), { c: "#9aa0ad", hi: "#fff", gloss: 1 });
        k.fill(k.box(100, 112, 150, 158, 26), { c: "#cfeff0", alpha: 0.12, inkW: 2.5, gloss: 1 });
    },
    turnip(k) {
        for (const [x, r] of [[64, -0.5], [100, 0], [136, 0.5]]) k.fill(k.ell(x, 40, 16, 34, r), { c: "#6fce46", c2: "#3f7f3a" });
        k.fill(blob(16, k.circle(100, 110, 66), k.cap(50, 120, 20, 158, 16, 10), k.cap(150, 120, 182, 158, 16, 10), k.cap(82, 160, 72, 192, 16, 13), k.cap(118, 160, 128, 192, 16, 13)), { c: "#f0e0d0", c2: "#b06aa0", hi: "#ffffff", lo: "#5a2a6a" });
        k.fill(cut(k.circle(100, 78, 54), k.box(100, 112, 160, 40, 0)), { c: "#b45ce0", hi: "#f0b0ff", inkW: 0, alpha: 0.7 });
        eyes(k, 100, 106, 24, 14, { angry: true });
        mouth(k, 100, 138, 28, 15);
        fangs(k, 100, 134, 44, 5);
    },
    worm(k) {
        k.fill(k.box(100, 168, 170, 30, 5, -0.03), { c: "#7a3a4a", hi: "#e0a080" });
        k.fill(k.box(100, 154, 156, 16, 3, -0.03), { c: "#efe3cc", flat: true });
        k.fill(k.curve([[170, 150], [136, 130], [120, 150], [80, 150], [64, 110], [80, 74]], 22, 26), { c: "#e8a0a8", hi: "#fff0e0", lo: "#8a3a6a" });
        for (let i = 0; i < 6; i++) k.fill(k.ell(70 + i * 7 + (i > 2 ? 18 : 0), 118 + i * 7, 22, 2, 0.4), { c: "#a85a7a", flat: true, inkW: 0, alpha: 0.6 });
        k.fill(k.ell(86, 62, 34, 32), { c: "#e8a0a8", hi: "#fff0e0" });
        for (const s of [-1, 1]) { k.fill(cut(k.circle(86 + s * 15, 56, 15), k.circle(86 + s * 15, 56, 12)), { c: "#3b2a5a", flat: true, inkW: 0 }); k.fill(k.circle(86 + s * 15, 56, 12), { c: "#dff0ff", flat: true, inkW: 0, alpha: 0.7 }); k.fill(k.circle(86 + s * 15 - 1, 57, 4.5), { c: "#1b1030", flat: true, inkW: 0 }); }
        k.fill(k.cap(99, 54, 73, 54, 1.6), { c: "#3b2a5a", flat: true, inkW: 0 });
        mouth(k, 86, 82, 12, 7);
    },
    inkblot(k) {
        k.fill(blob(14, k.circle(100, 108, 54), k.circle(52, 86, 24), k.circle(150, 92, 28), k.circle(62, 150, 26), k.circle(144, 152, 24), k.cap(100, 60, 100, 26, 16, 5), k.cap(62, 150, 48, 190, 10, 3), k.cap(144, 152, 158, 186, 9, 3)), { c: "#2a2448", c2: "#120e28", hi: "#7f7fd0", lo: "#07040f", gloss: 1 });
        k.dots(10, 21, 20, 20, 160, 170, 3, 7, "#2a2448");
        eyes(k, 100, 100, 26, 16, { c: "#e8f6ff", white: "#120e28", look: 0 });
        for (const s of [-1, 1]) k.fill(k.circle(100 + s * 26, 100, 5), { c: "#120e28", flat: true, inkW: 0 });
        k.fill(k.curve([[72, 136], [86, 146], [100, 138], [114, 146], [128, 136]], 3), { c: "#e8f6ff", flat: true, inkW: 0 });
    },
    sprite(k) {
        for (const s of [-1, 1]) k.fill(k.polygon([[100, 96], [100 + s * 86, 46], [100 + s * 70, 94], [100 + s * 78, 128], [100 + s * 30, 124]]), { c: "#f5ecd8", lo: "#a89c80", bevel: 16 });
        for (const s of [-1, 1]) for (let i = 0; i < 4; i++) k.fill(k.box(100 + s * (32 + i * 10), 80 + i * 2, 22 - i * 3, 2, 0, s * -0.4), { c: "#6a5a70", flat: true, inkW: 0 });
        k.fill(blob(6, k.circle(100, 92, 24), k.polygon([[82, 106], [118, 106], [108, 166], [92, 166]])), { c: "#ffb7e8", hi: "#fff", lo: "#b45ce0" });
        eyes(k, 100, 90, 11, 8, { angry: true, c: "#b0123a" });
        k.fill(k.polygon([[108, 50], [90, 72], [101, 72], [93, 90], [117, 64], [104, 64]]), { c: "#ffe066", hi: "#fff", bevel: 3 });
        fangs(k, 100, 106, 14, 2);
    },
    quill(k) {
        k.fill(both(k.ell(84, 76, 54, 92, 0.42), k.ell(128, 66, 54, 92, 0.42)), { c: "#eef0ff", c2: "#a8a0e0", hi: "#fff" });
        k.fill(k.cap(66, 186, 136, 16, 2.6, 1), { c: "#4a3a62", flat: true, inkW: 0 });
        k.fill(k.polygon([[60, 158], [74, 176], [52, 196]]), { c: "#2b2438", hi: "#8a7fc0", bevel: 4 });
        k.fill(blob(8, k.circle(100, 112, 26), k.ell(92, 142, 18, 20), k.cap(72, 120, 48, 104, 5, 3), k.polygon([[82, 92], [70, 68], [96, 86]]), k.polygon([[116, 92], [128, 68], [106, 86]])), { c: "#4a7fd8", hi: "#b5f0ff", lo: "#1f2a6a" });
        eyes(k, 100, 110, 11, 8, { angry: true, white: "#ffe066" });
        mouth(k, 98, 124, 9, 6);
        fangs(k, 98, 120, 12, 2);
    },
    mothswarm(k) {
        const moth = (x, y, s, r) => {
            k.save().at(x, y, s, r);
            for (const q of [-1, 1]) { k.fill(blob(3, k.ell(q * 22, -8, 24, 16, q * 0.4), k.ell(q * 16, 12, 14, 12, q * -0.5)), { c: "#c8a878", c2: "#8a5f9f", hi: "#ffe8c0" }); k.fill(k.circle(q * 22, -8, 7), { c: "#3b2a5a", flat: true, inkW: 0 }); k.fill(k.circle(q * 22, -8, 3), { c: "#ffe066", flat: true, inkW: 0 }); }
            k.fill(k.ell(0, 0, 7, 17), { c: "#5a4a50", hi: "#b0a0a0" });
            k.fill(k.curve([[-3, -14], [-9, -24], [-18, -26]], 1.1), { c: "#3b2a5a", flat: true, inkW: 0 });
            k.fill(k.curve([[3, -14], [9, -24], [18, -26]], 1.1), { c: "#3b2a5a", flat: true, inkW: 0 });
            k.restore();
        };
        moth(56, 62, 0.7, -0.4); moth(148, 74, 0.8, 0.4); moth(70, 152, 0.65, 0.5); moth(146, 150, 0.6, -0.3); moth(100, 104, 1.15, 0.05);
    },
    overdue(k) {
        k.fill(blob(12, k.ell(100, 84, 42, 46), k.polygon([[58, 90], [142, 90], [176, 196], [136, 176], [100, 198], [64, 176], [24, 196]])), { c: "#a8a0e8", c2: "#3b3a7a", hi: "#ecebff", lo: "#1f1a4a" });
        k.fill(k.box(62, 134, 58, 42, 4, -0.2), { c: "#7a3a4a", hi: "#e0a080" });
        k.fill(k.box(64, 134, 48, 30, 2, -0.2), { c: "#efe3cc", flat: true, inkW: 0, alpha: 0.2 });
        k.fill(k.ell(100, 44, 30, 10), { c: "#3b3a7a" });
        k.fill(k.circle(100, 26, 18), { c: "#6a68b8", hi: "#ecebff" });
        for (const s of [-1, 1]) { k.fill(cut(k.circle(100 + s * 18, 78, 16), k.circle(100 + s * 18, 78, 12.5)), { c: "#f7c33c", flat: true, inkW: 1 }); k.fill(k.circle(100 + s * 18, 78, 12), { c: "#120e28", flat: true, inkW: 0 }); k.fill(k.circle(100 + s * 18, 79, 4.5), { c: "#ff5ca8", flat: true, inkW: 0 }); }
        k.fill(k.cap(100, 78, 100, 78, 2), { c: "#f7c33c", flat: true, inkW: 0 });
        k.fill(k.curve([[82, 112], [100, 106], [118, 112]], 2.4), { c: "#1f1a4a", flat: true, inkW: 0 });
        k.fill(k.cap(150, 120, 170, 100, 7), { c: "#a8a0e8" });
        k.fill(k.box(174, 84, 30, 22, 3, 0.3), { c: "#c7801f", hi: "#ffd27a" });
    },
    gargoyle(k) {
        for (const s of [-1, 1]) k.fill(k.polygon([[100 + s * 30, 90], [100 + s * 96, 24], [100 + s * 90, 90], [100 + s * 72, 92], [100 + s * 64, 124]]), { c: "#6a7084", hi: "#b0b8d0", lo: "#2a2a4a" });
        k.fill(blob(10, k.ell(100, 134, 50, 52), k.circle(100, 78, 38), k.polygon([[70, 56], [60, 14], [92, 44]]), k.polygon([[130, 56], [140, 14], [108, 44]]), k.cap(62, 120, 50, 176, 14), k.cap(138, 120, 150, 176, 14)), { c: "#8a92a8", c2: "#555a78", hi: "#d8e0f0", lo: "#2a2a4a" });
        for (const s of [-1, 1]) { k.fill(k.circle(100 + s * 17, 76, 14), { c: "#f7c33c", flat: true, inkW: 1.5 }); k.fill(k.circle(100 + s * 17, 76, 11), { c: "#fff7e6", flat: true, inkW: 0 }); k.fill(k.circle(100 + s * 17, 77, 4.5), { c: "#b0123a", flat: true, inkW: 0 }); }
        k.fill(k.cap(83, 58, 96, 66, 2.6), { c: k.ink, flat: true, inkW: 0 }); k.fill(k.cap(117, 58, 104, 66, 2.6), { c: k.ink, flat: true, inkW: 0 });
        mouth(k, 100, 104, 18, 8);
        fangs(k, 100, 100, 26, 3);
        k.fill(k.box(100, 158, 76, 44, 4), { c: "#7a3a4a", hi: "#e0a080" });
    },
    batchoir(k) {
        const bat = (x, y, s) => {
            k.save().at(x, y, s);
            for (const q of [-1, 1]) k.fill(k.polygon([[q * 12, -8], [q * 40, -28], [q * 62, -10], [q * 44, -2], [q * 40, 16], [q * 24, 8], [q * 16, 22]]), { c: "#4a3a6a", hi: "#a88cd8", lo: "#1f1040" });
            k.fill(blob(5, k.ell(0, 4, 19, 23), k.polygon([[-16, -12], [-20, -36], [-3, -18]]), k.polygon([[16, -12], [20, -36], [3, -18]])), { c: "#5a4a7a", hi: "#c0b0e8" });
            eyes(k, 0, -2, 8, 5.6, { c: "#b0123a", white: "#ffe066" });
            k.fill(k.ell(0, 12, 7, 8), { c: "#3a1030", flat: true, inkW: 1 });
            k.restore();
        };
        bat(52, 68, 0.72); bat(150, 66, 0.72); bat(100, 128, 1.05);
    },
    bellwraith(k) {
        k.fill(k.polygon([[60, 128], [140, 128], [170, 196], [136, 182], [100, 198], [62, 182], [30, 196]]), { c: "#7fb0d8", c2: "#2a3a7a", hi: "#dff6ff", alpha: 0.9 });
        k.save().at(100, 92, 1.5); M.bell(k); k.restore();
        eyes(k, 100, 98, 19, 11, { white: "#120e28", look: 0, tall: 1.4 });
        for (const s of [-1, 1]) k.fill(k.circle(100 + s * 19, 100, 4.5), { c: "#7ef0ff", flat: true, inkW: 0 });
        k.fill(k.ell(100, 128, 9, 12), { c: "#120e28", flat: true, inkW: 0 });
    },
    ropehag(k) {
        k.fill(k.curve([[140, -8], [146, 44], [132, 88]], 5, 4), { c: "#c7a878", lo: "#6a4a3a" });
        k.fill(blob(10, k.ell(92, 128, 50, 62), k.polygon([[46, 130], [140, 130], [156, 196], [30, 196]]), k.cap(124, 106, 134, 84, 13, 10)), { c: "#5a5a3a", c2: "#2a2a2a", hi: "#a8a878", lo: "#1a1a2a" });
        k.fill(blob(8, k.ell(84, 70, 34, 37), k.ell(60, 84, 11, 7, -0.4)), { c: "#a8c090", hi: "#e6f0c0", lo: "#4a6a4a" });
        k.fill(k.curve([[56, 40], [92, 22], [122, 48], [128, 90], [120, 112]], 13, 5), { c: "#d8d0e0", hi: "#fff", lo: "#6a6a8a" });
        eyes(k, 82, 66, 13, 9, { angry: true, c: "#b0123a", look: -2 });
        k.fill(k.ell(50, 86, 4, 4), { c: "#6a7a4a", hi: "#c8d8a0" });
        mouth(k, 80, 88, 13, 6);
        fangs(k, 80, 84, 10, 1);
    },
    crow(k) {
        k.fill(k.polygon([[138, 112], [192, 76], [186, 118], [196, 150], [146, 148]]), { c: "#b08a3a", hi: "#ffe08a", lo: "#4a2a1a" });
        k.fill(blob(10, k.ell(102, 118, 54, 46, -0.2), k.circle(62, 74, 34)), { c: "#c79a3a", hi: "#ffeab0", lo: "#5a2a1a", gloss: 1 });
        k.fill(k.polygon([[36, 66], [-4, 84], [38, 90]]), { c: "#9aa0ad", hi: "#fff", bevel: 6 });
        k.fill(cut(k.circle(104, 116, 32), k.circle(104, 116, 25)), { c: "#7a5a2a", flat: true, inkW: 1 });
        k.fill(k.circle(104, 116, 25), { c: "#efe3cc", flat: true, inkW: 0 });
        for (let i = 0; i < 12; i++) { const r = i * Math.PI / 6; k.fill(k.circle(104 + Math.cos(r) * 20, 116 + Math.sin(r) * 20, 1.5), { c: "#3b2a5a", flat: true, inkW: 0 }); }
        k.fill(k.cap(104, 116, 104, 100, 2), { c: "#b0123a", flat: true, inkW: 0 });
        k.fill(k.cap(104, 116, 116, 122, 2), { c: "#1b1030", flat: true, inkW: 0 });
        k.fill(k.circle(62, 72, 13), { c: "#fff7e6", flat: true, inkW: 2 });
        k.fill(k.circle(59, 73, 7), { c: "#b0123a", flat: true, inkW: 0 });
        for (const x of [90, 122]) k.fill(k.cap(x, 160, x - 6, 190, 3), { c: "#9aa0ad" });
    },
    verger(k) {
        k.fill(k.cap(166, 10, 150, 192, 4.5), { c: "#8c5426", hi: "#e0a060" });
        k.fill(k.polygon([[132, 174], [168, 178], [176, 200], [122, 200]]), { c: "#c7a878", lo: "#5a3a2a" });
        k.fill(blob(10, k.ell(92, 96, 46, 46), k.polygon([[46, 100], [136, 100], [150, 200], [28, 200]])), { c: "#2a2a3a", c2: "#121220", hi: "#6a6a90", lo: "#07070f" });
        k.fill(k.polygon([[76, 60], [108, 60], [100, 120], [86, 120]]), { c: "#f2f2f8", flat: true });
        k.fill(blob(6, k.ell(92, 46, 32, 35), k.ell(92, 76, 18, 12)), { c: "#d8c0b8", hi: "#fff", lo: "#7a5a6a" });
        k.fill(cut(k.ell(92, 22, 36, 18), k.box(92, 40, 90, 18, 0)), { c: "#2a2a3a", hi: "#6a6a90" });
        eyes(k, 92, 44, 13, 8, { angry: true, c: "#b0123a", tall: 0.7 });
        k.fill(k.ell(92, 60, 5, 8), { c: "#c8a098", hi: "#fff" });
        k.fill(k.curve([[78, 76], [92, 72], [106, 76]], 2), { c: "#3a1030", flat: true, inkW: 0 });
        k.fill(k.cap(132, 112, 158, 106, 12, 9), { c: "#2a2a3a", hi: "#6a6a90" });
        k.fill(k.circle(160, 106, 9), { c: "#d8c0b8" });
    },
    stormcrow(k) {
        k.fill(k.polygon([[120, 70], [196, 24], [176, 78], [192, 108], [146, 110]]), { c: "#2a2a4a", hi: "#7f8fd8", lo: "#0a0a20" });
        k.fill(blob(9, k.ell(100, 110, 50, 38, -0.3), k.circle(60, 76, 28), k.polygon([[130, 120], [186, 172], [120, 150]])), { c: "#35355a", hi: "#8f9fe8", lo: "#0a0a20", gloss: 0.7 });
        k.fill(k.polygon([[36, 70], [2, 90], [40, 92]]), { c: "#ffe066", hi: "#fff", bevel: 6 });
        eyes(k, 56, 70, 0, 11, { c: "#2fb6e8", white: "#fff7e6", angry: true });
        k.save().at(120, 170, 0.5, 0.3); M.bolt(k); k.restore();
        k.save().at(52, 150, 0.42, -0.3); M.bolt(k); k.restore();
    },
    weatherhex(k) {
        k.fill(blob(10, k.circle(62, 66, 34), k.circle(106, 48, 42), k.circle(146, 72, 30), k.box(100, 88, 130, 26, 13)), { c: "#7f7fb0", c2: "#3b3a6a", hi: "#e0e6ff", lo: "#1f1a4a" });
        eyes(k, 100, 66, 22, 12, { angry: true, c: "#ffe066", white: "#2a2448" });
        mouth(k, 100, 88, 18, 8);
        fangs(k, 100, 84, 24, 3);
        for (let i = 0; i < 9; i++) k.fill(k.cap(44 + i * 14, 116 + (i % 3) * 12, 38 + i * 14, 136 + (i % 3) * 12, 2.2, 1), { c: "#7fd8ff", flat: true, inkW: 0.8 });
        k.save().at(100, 158, 0.72); M.bolt(k); k.restore();
    },
    thorn(k) {
        k.fill(k.polygon([[150, 42], [162, 42], [160, 176], [152, 176]]), { c: "#c7d3df", hi: "#fff", lo: "#4a5f88", bevel: 5 });
        k.fill(k.box(156, 176, 34, 8, 3), { c: "#d9a648" });
        k.fill(blob(7, k.box(92, 116, 72, 86, 16), k.circle(92, 58, 34), k.cap(70, 150, 62, 194, 14), k.cap(114, 150, 122, 194, 14), k.cap(54, 96, 30, 136, 12, 10), k.cap(130, 96, 156, 112, 12, 9)), { c: "#4a6a5a", c2: "#2a3a3a", hi: "#a8d8c0", lo: "#0f1a2a", gloss: 0.8 });
        k.fill(k.box(92, 58, 44, 12, 2), { c: "#120e28", flat: true, inkW: 1 });
        for (const s of [-1, 1]) k.fill(k.ell(92 + s * 11, 58, 6, 3), { c: "#ff5ca8", flat: true, inkW: 0 });
        for (const [x, y, r] of [[60, 34, -0.5], [92, 18, 0], [124, 34, 0.5], [46, 92, -1], [138, 92, 1], [70, 120, -1.2], [112, 120, 1.2], [92, 84, 0]]) k.fill(k.polygon([[-6, 6], [0, -18], [6, 6]].map(([u, v]) => [x + u * Math.cos(r) - v * Math.sin(r), y + u * Math.sin(r) + v * Math.cos(r)])), { c: "#7a4a6a", hi: "#e0a0c0", bevel: 4, inkW: 1.1 });
        k.fill(k.curve([[58, 76], [92, 92], [126, 76], [130, 130], [60, 140]], 2.6), { c: "#3f7f3a", inkW: 1 });
    },
    sister(k) {
        k.fill(k.ell(100, 100, 74, 92), { c: "#d7a848", hi: "#fff6c0", gloss: 1 });
        k.fill(k.ell(100, 100, 62, 80), { c: "#30264e", c2: "#1a1438", hi: "#7f7fd0", inkW: 1.5 });
        k.fill(blob(6, k.circle(100, 74, 26), k.polygon([[66, 180], [80, 100], [120, 100], [134, 180]])), { c: "#6a4a9a", hi: "#c8a8f0" });
        k.fill(k.circle(100, 76, 21), { c: "#d8c8f0", hi: "#fff", lo: "#7a6ab0" });
        k.save().at(100, 58, 0.55); M.hat(k, { a: "#30264e" }); k.restore();
        eyes(k, 100, 76, 9, 6, { white: "#120e28", c: "#ff5ca8", look: 0 });
        k.fill(k.curve([[88, 86], [100, 94], [112, 86]], 1.5), { c: "#b0123a", flat: true, inkW: 0 });
        k.fill(k.cap(52, 40, 92, 150, 1.2), { c: "#ffffff", flat: true, inkW: 0, alpha: 0.5 });
        k.fill(k.cap(124, 22, 152, 112, 1), { c: "#ffffff", flat: true, inkW: 0, alpha: 0.4 });
    },
    stag(k) {
        for (const s of [-1, 1]) {
            k.fill(k.curve([[100 + s * 20, 52], [100 + s * 44, 36], [100 + s * 58, 2]], 7, 2), { c: "#e8e0d0", hi: "#fff", lo: "#6a5a7a" });
            k.fill(k.curve([[100 + s * 36, 42], [100 + s * 62, 34], [100 + s * 84, 14]], 5, 1.5), { c: "#e8e0d0" });
            k.fill(k.curve([[100 + s * 26, 48], [100 + s * 28, 22], [100 + s * 26, 2]], 4, 1.5), { c: "#e8e0d0" });
        }
        k.fill(blob(14, k.ell(100, 142, 56, 44), k.cap(100, 112, 100, 72, 26, 20), k.cap(70, 156, 62, 198, 12, 8), k.cap(130, 156, 138, 198, 12, 8)), { c: "#2a2a4a", c2: "#14142a", hi: "#7f7fc0", lo: "#07070f" });
        k.fill(blob(6, k.ell(100, 68, 26, 22), k.cap(100, 76, 100, 102, 17, 11), k.polygon([[76, 56], [46, 46], [74, 72]]), k.polygon([[124, 56], [154, 46], [126, 72]])), { c: "#3b3a68", hi: "#a0a0e8", lo: "#14142a" });
        eyes(k, 100, 66, 15, 8, { white: "#7ef0ff", c: "#e8f6ff", look: 0, angry: true, brow: "#14142a" });
        k.fill(k.ell(100, 104, 7, 5), { c: "#14142a", hi: "#7f7fc0" });
        k.glow(100, 66, 44, "#4fd0ff", 0.3);
        k.dots(14, 11, 30, 110, 140, 80, 1, 2.6, "#7ef0ff", 0.9);
    },
    gristle(k) {
        k.fill(k.curve([[172, 118], [190, 66], [184, 36]], 7, 5), { c: "#c7d3df", hi: "#fff" });
        k.fill(k.ell(182, 22, 20, 15), { c: "#c7d3df", hi: "#fff", gloss: 1 });
        k.fill(blob(14, k.ell(100, 138, 72, 60), k.ell(100, 72, 42, 38), k.cap(38, 110, 16, 146, 18, 13), k.cap(162, 110, 176, 118, 18, 13)), { c: "#d88a7a", c2: "#a0504a", hi: "#ffd0b0", lo: "#5a1a3a" });
        k.fill(k.polygon([[42, 118], [158, 118], [176, 200], [24, 200]]), { c: "#f2ead8", c2: "#c7b090", lo: "#7a6470" });
        for (const [x, y, r] of [[70, 150, 6], [120, 168, 9], [146, 136, 5], [60, 184, 7]]) k.fill(k.circle(x, y, r), { c: "#a03a3a", flat: true, inkW: 0, alpha: 0.6 });
        k.fill(k.polygon([[58, 40], [64, 4], [84, 18], [100, -2], [116, 18], [136, 4], [142, 40]]), { c: "#fff7e6", lo: "#a89cb0" });
        eyes(k, 100, 66, 18, 12, { angry: true, c: "#b0123a" });
        k.fill(k.ell(100, 82, 8, 7), { c: "#e8a090", hi: "#fff" });
        mouth(k, 100, 98, 26, 13);
        fangs(k, 100, 94, 36, 4);
        k.fill(k.ell(100, 120, 34, 7), { c: "#c8705a", flat: true, inkW: 0, alpha: 0.5 });
    },
    codex(k) {
        for (const s of [-1, 1]) {
            k.fill(k.polygon([[100, 56], [100 + s * 96, 16], [100 + s * 90, 96], [100, 118]]), { c: "#efe3cc", c2: "#c7b090", lo: "#7a6470", bevel: 26 });
            k.fill(k.polygon([[100 + s * 4, 118], [100 + s * 86, 104], [100 + s * 62, 170], [100 + s * 4, 158]]), { c: "#e0d0b0", c2: "#9a7a90", lo: "#6a4a70", bevel: 20 });
            for (let i = 0; i < 6; i++) k.fill(k.box(100 + s * 46, 40 + i * 11, 64 - i * 3, 2.4, 0, s * -0.22), { c: "#3b2a5a", flat: true, inkW: 0, alpha: 0.7 });
            k.fill(k.circle(100 + s * 62, 62, 14), { c: "#b0123a", hi: "#ff9a8a", inkW: 2 });
            k.fill(k.circle(100 + s * 62, 62, 7), { c: "#120822", flat: true, inkW: 0 });
        }
        k.fill(k.ell(100, 100, 19, 62), { c: "#3b2a5a", hi: "#a88cd8", lo: "#14082a" });
        for (let i = 0; i < 6; i++) k.fill(k.ell(100, 76 + i * 15, 16, 2.2), { c: "#14082a", flat: true, inkW: 0 });
        k.fill(k.circle(100, 44, 22), { c: "#5a3a8a", hi: "#c8a8f0" });
        eyes(k, 100, 42, 11, 10, { white: "#ffe066", c: "#120822", look: 0, angry: true });
        for (const s of [-1, 1]) k.fill(k.curve([[100 + s * 8, 24], [100 + s * 22, 2], [100 + s * 42, 4]], 2.2, 1), { c: "#3b2a5a", flat: true, inkW: 0 });
    },
    hollow(k) {
        k.fill(k.box(100, 8, 150, 16, 4), { c: "#5a3a2a", hi: "#c79a6a" });
        k.fill(blob(6, k.ell(100, 64, 44, 50), k.polygon([[60, 70], [140, 70], [186, 164], [14, 164]])), { c: "#7a6a4a", hi: "#ffe08a", lo: "#2a2438", gloss: 1 });
        k.fill(k.box(100, 158, 180, 16, 8), { c: "#a88a4a", hi: "#fff0b0" });
        k.fill(k.ell(100, 168, 74, 12), { c: "#07050f", flat: true, inkW: 2 });
        eyes(k, 100, 90, 28, 17, { white: "#07050f", c: "#ff5a2a", look: 0, tall: 1.4 });
        k.fill(k.polygon([[100, 108], [88, 132], [112, 132]]), { c: "#07050f", flat: true });
        fangs(k, 100, 150, 120, 8, "#c8bda0");
        k.fill(k.cap(100, 168, 100, 186, 3), { c: "#3b2a2a" });
        k.fill(k.circle(100, 186, 12), { c: "#c79a3a", hi: "#fff0b0", gloss: 1 });
        k.dots(12, 8, 40, 60, 120, 90, 1, 3, "#3b4a2a", 0.8);
        k.glow(100, 90, 60, "#ff5a2a", 0.22);
    },
    ysolde(k) {
        k.fill(k.ell(100, 94, 92, 96), { c: "#3a1a7a", alpha: 0.3, inkW: 0, flat: true });
        for (let i = 0; i < 8; i++) { const r = i * Math.PI / 4; k.fill(k.circle(100 + Math.cos(r) * 82, 80 + Math.sin(r) * 72, 3), { c: "#e0c0ff", flat: true, inkW: 0 }); }
        k.fill(blob(8, k.polygon([[58, 112], [142, 112], [190, 200], [10, 200]]), k.cap(58, 120, 22, 92, 11, 7), k.cap(142, 120, 178, 92, 11, 7)), { c: "#4a1f8f", c2: "#14082a", hi: "#c080ff", lo: "#0a0418" });
        for (const s of [-1, 1]) k.fill(k.polygon([[100 + s * 40, 110], [100 + s * 84, 60], [100 + s * 60, 124]]), { c: "#14082a", hi: "#7a4ad0" });
        k.fill(blob(8, k.ell(100, 76, 30, 36), k.cap(62, 70, 54, 142, 12, 7), k.cap(138, 70, 146, 142, 12, 7)), { c: "#14082a", hi: "#6a4ab0" });
        k.fill(k.ell(100, 80, 23, 28), { c: "#e0d0f0", c2: "#b8a0d8", hi: "#fff", lo: "#6a4a9a" });
        eyes(k, 100, 76, 11, 8, { white: "#120822", c: "#ff5ca8", look: 0, angry: true, tall: 0.9 });
        k.fill(k.curve([[90, 94], [100, 100], [110, 94]], 2), { c: "#b0123a", flat: true, inkW: 0 });
        k.save().at(100, 40, 1.05); M.hat(k, { a: "#2a1058" }); k.restore();
        k.save().at(100, 21, 0.3); M.moon(k, { a: "#ffe9a8" }); k.restore();
        for (const s of [-1, 1]) { k.fill(k.circle(100 + s * 80, 90, 10), { c: "#7ef0c8", hi: "#fff", gloss: 1 }); k.glow(100 + s * 80, 90, 26, "#7ef0c8", 0.5); }
    },
};

// ---- Witches, on a 220 x 280 canvas ----
export const WITCH_ART = {
    posy(k) {
        k.fill(k.curve([[58, 110], [24, 130], [26, 170], [46, 180]], 16, 6), { c: "#ff7a2f", c2: "#e8352a", hi: "#ffd25a", lo: "#8f1f2a" });
        k.fill(k.curve([[162, 110], [196, 130], [194, 170], [174, 180]], 16, 6), { c: "#ff7a2f", c2: "#e8352a", hi: "#ffd25a", lo: "#8f1f2a" });
        k.fill(blob(6, k.polygon([[78, 170], [142, 170], [172, 280], [48, 280]]), k.cap(82, 180, 54, 226, 10, 8), k.cap(138, 180, 166, 216, 10, 8)), { c: "#7a3a4a", c2: "#4a1f3a", hi: "#e8905a", lo: "#2a1030" });
        k.fill(k.polygon([[88, 176], [132, 176], [146, 280], [74, 280]]), { c: "#efe3cc", c2: "#c7a878", lo: "#7a5a5a" });
        for (const [x, y] of [[90, 214], [122, 248], [102, 262]]) k.fill(k.ell(x, y, 7, 4, 0.6), { c: "#2b2438", flat: true, inkW: 0, alpha: 0.55 });
        k.fill(k.circle(50, 232, 10), { c: "#f6cfa8" });
        k.fill(k.circle(170, 218, 10), { c: "#f6cfa8" });
        k.fill(k.curve([[172, 218], [190, 170], [196, 136]], 3.5), { c: "#8c5426", hi: "#e0a060" });
        k.fill(k.ell(198, 122, 11, 15, 0.2), { c: "#8c5426", hi: "#e0a060", gloss: 0.6 });
        k.fill(k.ell(110, 118, 58, 56), { c: "#f6cfa8", hi: "#fff0dc", lo: "#c07a6a" });
        k.fill(blob(5, k.circle(70, 98, 26), k.circle(100, 80, 30), k.circle(136, 84, 28), k.circle(156, 106, 20), k.polygon([[56, 106], [70, 128], [84, 98]]), k.polygon([[150, 104], [160, 130], [132, 100]])), { c: "#ff7a2f", c2: "#e8452a", hi: "#ffd25a", lo: "#8f1f2a" });
        eyes(k, 110, 130, 25, 15, { c: "#2a5a3a", tall: 1.2 });
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.fill(k.circle(110 + s * (32 + i * 6), 150 + (i % 2) * 5, 1.7), { c: "#c8603a", flat: true, inkW: 0 });
        k.fill(k.curve([[98, 156], [112, 168], [128, 152]], 2.5), { c: "#6a1a2a", flat: true, inkW: 0 });
        k.fill(k.ell(79, 152, 10, 6), { c: "#ff9a8a", flat: true, inkW: 0, alpha: 0.5 });
        k.fill(k.ell(141, 152, 10, 6), { c: "#ff9a8a", flat: true, inkW: 0, alpha: 0.5 });
        k.save().at(112, 42, 1.14, 0.1);
        k.fill(k.ell(0, 30, 66, 13), { c: "#3b2a5a", hi: "#a07fc0" });
        k.fill(k.polygon([[-32, 28], [32, 28], [12, -8], [30, -32], [-6, -18]]), { c: "#4a2a6a", hi: "#c090e0", lo: "#1f1040" });
        k.fill(k.box(0, 20, 64, 10, 2), { c: "#ff7a2f", gloss: 0.6 });
        k.fill(k.circle(-20, 2, 6), { c: "#2b2438", flat: true, inkW: 0, alpha: 0.7 });
        k.restore();
        k.save().at(148, 10, 0.34); M.flame(k); k.restore();
    },
    thistle(k) {
        k.fill(blob(10, k.ell(112, 200, 74, 76), k.polygon([[40, 210], [186, 210], [196, 280], [28, 280]])), { c: "#4f7f4a", c2: "#2f4a3a", hi: "#b6ec9a", lo: "#1a2a3a" });
        k.fill(k.polygon([[46, 186], [178, 186], [112, 256]]), { c: "#8a5a9a", hi: "#e0b0f0", lo: "#3a1a5a" });
        for (let i = 0; i < 7; i++) k.fill(k.polygon([[60 + i * 16, 202 + (i % 2) * 2], [68 + i * 16, 216 + Math.abs(3 - i) * -3 + 14], [76 + i * 16, 202]]), { c: "#ffd27a", flat: true, inkW: 0, alpha: 0.35 });
        k.fill(k.ell(112, 118, 62, 62), { c: "#e8c8a8", hi: "#fff0dc", lo: "#a06a6a" });
        for (const [a, b, c, d] of [[70, 100, 96, 92], [62, 134, 78, 142], [150, 142, 164, 132], [100, 158, 124, 158]]) k.fill(k.curve([[a, b], [(a + c) / 2, (b + d) / 2 + 2], [c, d]], 1), { c: "#a06a6a", flat: true, inkW: 0 });
        k.fill(blob(8, k.circle(112, 64, 36), k.ell(112, 88, 60, 24), k.cap(58, 92, 50, 128, 13, 7), k.cap(166, 92, 174, 128, 13, 7)), { c: "#e8e6ec", hi: "#ffffff", lo: "#8a88a8" });
        for (const s of [-1, 1]) { k.fill(k.circle(112 + s * 25, 122, 25), { c: "#d8efff", alpha: 0.55, hi: "#fff", inkW: 3.4, ink: "#8c5426", gloss: 0.6 }); k.fill(k.circle(112 + s * 25 - 1, 124, 9), { c: "#1b1030", flat: true, inkW: 0 }); k.fill(k.circle(112 + s * 25 - 4, 120, 3), { c: "#fff", flat: true, inkW: 0 }); }
        k.fill(k.cap(102, 122, 122, 122, 2.4), { c: "#8c5426", flat: true, inkW: 0 });
        k.fill(k.ell(112, 142, 9, 11), { c: "#e0b090", hi: "#fff" });
        k.fill(k.curve([[92, 162], [112, 172], [134, 160]], 2.2), { c: "#6a1a2a", flat: true, inkW: 0 });
        k.save().at(112, 34, 0.42); M.leaf(k); k.restore();
        k.save().at(140, 46, 0.4, 1.2); M.flower(k, { a: "#b45cff" }); k.restore();
        k.fill(k.curve([[188, 278], [196, 200], [190, 120]], 5, 4), { c: "#8c5426", hi: "#e0a060" });
        k.fill(blob(4, k.ell(190, 112, 18, 12), k.circle(182, 104, 9)), { c: "#6a4a2a", hi: "#c79a6a" });
    },
    vesper(k) {
        k.save().at(110, 96, 2.1); k.fill(cut(k.circle(0, 0, 44), k.circle(0, 0, 40)), { c: "#ffe08a", flat: true, inkW: 0, alpha: 0.75 }); k.restore();
        k.fill(k.polygon([[60, 112], [160, 112], [176, 240], [44, 240]]), { c: "#0e0a22", hi: "#3f3f7f", lo: "#07050f" });
        k.fill(blob(6, k.polygon([[84, 170], [136, 170], [168, 280], [52, 280]]), k.cap(86, 180, 56, 214, 9, 7), k.cap(134, 180, 164, 214, 9, 7)), { c: "#6a3ab0", c2: "#2a1058", hi: "#d0a0ff", lo: "#14082a" });
        k.fill(k.polygon([[108, 174], [112, 174], [124, 280], [96, 280]]), { c: "#ffe08a", flat: true, inkW: 0, alpha: 0.6 });
        k.fill(k.circle(52, 222, 9), { c: "#e0d0d8" }); k.fill(k.circle(168, 222, 9), { c: "#e0d0d8" });
        k.fill(k.box(110, 240, 62, 7, 3), { c: "#f7c33c", gloss: 0.8 });
        k.fill(k.ell(110, 124, 42, 50), { c: "#ecdde0", hi: "#fff", lo: "#a08ab8" });
        k.fill(k.polygon([[68, 118], [76, 84], [106, 92], [92, 120]]), { c: "#0e0a22", hi: "#3f3f7f" });
        k.fill(k.polygon([[152, 118], [144, 84], [114, 92], [128, 120]]), { c: "#0e0a22", hi: "#3f3f7f" });
        eyes(k, 110, 126, 18, 10, { white: "#f5f0ff", c: "#7a3ad0", tall: 0.8, look: 2 });
        for (const s of [-1, 1]) k.fill(k.cap(110 + s * 28, 118, 110 + s * 8, 116, 1.8), { c: "#0e0a22", flat: true, inkW: 0 });
        k.fill(k.curve([[100, 152], [112, 154], [124, 148]], 1.6), { c: "#7a1a4a", flat: true, inkW: 0 });
        k.save().at(112, 62, 1.5, -0.08); M.hat(k, { a: "#2a1058" }); k.restore();
        k.save().at(196, 96, 0.3); M.ring(k, { a: "#b45cff" }); k.restore();
        k.fill(k.cap(170, 214, 192, 130, 2.2), { c: "#f7c33c", hi: "#fff6c0" });
    },
};
