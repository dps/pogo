// Generated risograph art, made by pogo art and embedded in art/, plus a few effects still painted in code.
import { Ink, noise2 } from "./ink.js";
import items from "./art/items.js";
import crew from "./art/crew.js";
import people from "./art/people.js";
import table from "./art/table.js";
import slab from "./art/slab.js";
import globe from "./art/globe.js";
import title from "./art/title.js";
import back0 from "./art/back0.js";
import back1 from "./art/back1.js";
import back2 from "./art/back2.js";
import back3 from "./art/back3.js";
import back4 from "./art/back4.js";
import back5 from "./art/back5.js";
import back6 from "./art/back6.js";
import back7 from "./art/back7.js";
import back8 from "./art/back8.js";
import back9 from "./art/back9.js";
import back10 from "./art/back10.js";
import back11 from "./art/back11.js";
import back12 from "./art/back12.js";
export const C = { ink: "#1d1640", paper: "#fff4dc", cream: "#fbeccb", gold: "#ffb627", coral: "#ff5e5b", orange: "#ff7a18", teal: "#18b7a0", mint: "#9be3d3", sky: "#7fd6e8", violet: "#6c4ed9", plum: "#3a1f7a", pink: "#ff8fa3", grass: "#6cc24a", grassD: "#3f9b4a", steel: "#8d93b5", steelD: "#565c88", white: "#ffffff", brown: "#a86a3d", brownD: "#6f3f2a", skin: "#f6bd8d", skinD: "#b8734f", red: "#e8413e", blue: "#3f7fd1" };
const c = C;
export const ITEM_FRAMES = Object.fromEntries("cables lamp bread bike trophy house bus tower hall bridge mountain ocean ice belt cloud moon mars jupiter saturn sun nebula pulsar neutron hole galaxy universe".split(" ").map((n, i) => [n, i]));
export const BACKS = [back0, back1, back2, back3, back4, back5, back6, back7, back8, back9, back10, back11, back12];

export function paintArt(assets) {
    assets.image("items", items, { cols: 6, rows: 5 });
    assets.image("crew", crew, { cols: 6, rows: 5 });
    assets.image("people", people, { cols: 5, rows: 4 });
    assets.image("table", table); assets.image("slab", slab); assets.image("globe", globe); assets.image("title", title);
    BACKS.forEach((b, i) => assets.image(`back${i}`, b));
    assets.paint("glow", 128, 128, (p) => { const D = p.data; for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const d = Math.hypot(x - 63.5, y - 63.5) / 63, a = Math.max(0, 1 - d); const i = (y * 128 + x) * 4; D[i] = D[i + 1] = D[i + 2] = 255; D[i + 3] = a * a * 255; } }, { smooth: true });
    assets.paint("fx", 64 * 8, 64, (p) => {
        const I = new Ink(p.data, p.width, p.height), cell = (i) => I.at(i * 64 + 2, 2, 0.6);
        cell(0); I.star(50, 50, 4, 48, 8, "#ffffff"); cell(1); I.circ(50, 50, 44, "#ffffff"); cell(2); I.star(50, 50, 8, 48, 26, "#ffffff"); cell(3);
        I.circ(50, 50, 44, c.gold); I.circ(50, 50, 34, "#ffd76e"); I.line([58, 34, 40, 34, 40, 50, 60, 50, 60, 66, 42, 66], 7, "#c9831a"); cell(4); I.rr(2, 24, 96, 52, 4, "#7fcf6e"); I.rr(10, 32, 80, 36, 3, "#a4e59a"); I.circ(50, 50, 14, "#7fcf6e"); cell(5); I.rr(10, 30, 80, 40, 2, "#ffffff"); cell(6); I.line([12, 50, 50, 22, 88, 50], 12, "#ffffff"); cell(7); I.ell(50, 50, 46, 14, "#ffffff", -0.4);
    }, { smooth: true });
    assets.grid("fx", 8, 1);
    assets.paint("burst", 256, 256, (p) => { const I = new Ink(p.data, p.width, p.height).at(0, 0, 2.56); I.star(50, 50, 18, 49, 38, "#ffffff"); }, { smooth: true });
    assets.paint("hole", 512, 512, (p) => {
        const D = p.data, R = 256;
        for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
            const dx = (x - R) / R, dy = (y - R) / R, r = Math.hypot(dx, dy), i = (y * 512 + x) * 4;
            if (r >= 1) continue;
            const th = Math.atan2(dy, dx), n = 0.5 + 0.5 * Math.sin(th * 3 + r * 22 + noise2(x * 0.02, y * 0.02, 3) * 6), hot = Math.pow(1 - r, 1.2);
            D[i] = 255; D[i + 1] = 110 + 130 * hot; D[i + 2] = 60 + 60 * hot; D[i + 3] = Math.min(1, n * hot * 2.2) * 255;
        }
    }, { smooth: true });
}
