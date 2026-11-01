// The zoom. One backdrop for each great leap in scale: each shrinks towards its middle while the next, bigger view fades in around it.
import { BACKS } from "./art.js";
import { T } from "./font.js";

const KEYS = [1.0, 1.75, 2.5, 3.4, 4.3, 5.1, 6.2, 7.6, 10.2, 15.4, 18.4, 19.7, 21.0];
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let SEED = 20261031; const rnd = () => (SEED = (SEED * 48271) % 2147483647) / 2147483647, rr = (a, b) => a + (b - a) * rnd();
const pick = (a) => a[Math.floor(rnd() * a.length)];
const SHELLS = [0, 1, 2].map(() => Array.from({ length: 40 }, () => { const a = rnd() * Math.PI * 2, r = 0.15 + rnd() ** 0.6 * 1.3; return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: rr(2, 6) }; }));
const WORDS = ["MAYBE", "LATER", "?", "WHY", "SOMEDAY", "NOW-ISH", "%", "&", "ALMOST", "HMM", "TUES", "ETC", "IDEA", "$", "+"];
const SHAPES = Array.from({ length: 22 }, () => ({ a: rnd() * Math.PI * 2, r: rr(0.3, 1.2), w: pick(WORDS), rot: rr(-0.5, 0.5), c: pick(["#fff4dc", "#1d1640"]), s: rr(16, 34) }));

function indexAt(L) {
    if (L <= KEYS[0]) return 0;
    for (let i = 0; i < KEYS.length - 1; i++) if (L < KEYS[i + 1]) return i + (L - KEYS[i]) / (KEYS[i + 1] - KEYS[i]);
    return KEYS.length - 1;
}
/** Draws everything behind the table. */
export function drawWorld(d, L, t, pane, view) {
    const u = indexAt(L), i = Math.floor(u), f = u - i, cx = pane.x + pane.w / 2, cy = pane.h * 0.42, base = Math.max(pane.w, pane.h * 1.16);
    const back = (k, s, opacity) => { const size = base * s; d.sprite(`back${k}`, { x: cx, y: cy, width: size, height: size, opacity }); };
    back(i, 1.02 * 1.35 ** (1 - f), 1);
    const fade = ss(0.5, 1, f);
    if (fade > 0.01 && i + 1 < BACKS.length) back(i + 1, 1.02 * 1.35 ** (2 - f), fade);
    // The backdrop sits back so the stickers read first.
    d.rect(pane.w, pane.h, { x: cx, y: pane.h / 2, color: "#1d1640", opacity: 0.2 });
    // Stars that keep rushing inward, so a zoom out always feels like moving.
    const starA = ss(3.9, 4.6, L) * (1 - ss(18.8, 19.6, L)) * 0.7;
    if (starA > 0.01) {
        const put = d.quads("fx"), rad = Math.max(pane.w, pane.h);
        for (let k = 0; k < 3; k++) {
            const ph = ((L * 0.45 + k / 3) % 1 + 1) % 1, z = 2.6 ** (1 - ph * 2), a = Math.sin(ph * Math.PI) * starA;
            for (const st of SHELLS[k]) { const x = cx + st.x * rad * z, y = cy + st.y * rad * z; if (x > pane.x && x < pane.x + pane.w && y > 0 && y < pane.h) put(x, y, st.s, st.s, 0, 0, 1, 0.97, 0.86, a); }
        }
    }
    // Past the edge: words in free float. They stay behind everything.
    const absA = ss(20.3, 21, L);
    if (absA > 0.01) {
        const rad = Math.max(pane.w, pane.h);
        for (let k = 0; k < SHAPES.length; k++) {
            const sh = SHAPES[k], ph = ((L * 0.6 + k / 7) % 1 + 1) % 1, z = 3 ** (1 - ph * 2), a = Math.sin(ph * Math.PI) * absA * 0.55, x = cx + Math.cos(sh.a + t * 0.01) * sh.r * rad * z * 0.7, y = cy + Math.sin(sh.a + t * 0.01) * sh.r * rad * z * 0.6;
            if (x > pane.x - 40 && x < pane.x + pane.w + 40 && y > -40 && y < pane.h) T(d, sh.w, x, y, sh.s * z * 0.6, { color: sh.c, rot: sh.rot, opacity: a });
        }
    }
}
