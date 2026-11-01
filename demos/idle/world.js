// The zoom. One continuous picture from a lawn to the edge of everything, drawn in layers that fade by scale.
// L is log10 of how many metres fill the world pane top to bottom. Every object has a real position from the card table.
import { ITEM_FRAMES, TOWN } from "./art.js";
import { mix } from "./ink.js";
import { T } from "./font.js";

export const R = 30000, AU = 3e6, MOON_D = 4e5;
const SUN = [0, -R + AU], GALAXY = [1.5e15, 0.5e15 + SUN[1]];
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const win = (L, a, b, c, e) => ss(a, b, L) * (1 - ss(c, e, L));

// A fixed seed: the town is the same town every time.
let SEED = 20261031; const rnd = () => (SEED = (SEED * 48271) % 2147483647) / 2147483647, rr = (a, b) => a + (b - a) * rnd(), pick = (a) => a[Math.floor(rnd() * a.length)];

/** Everything standing on the planet. s: metres along the ground; h: metres; order: drawn far to near. */
const RIM = [];
(function build() {
    const add = (s, f, h, d = 0) => RIM.push({ s, f, h, d });
    for (let i = 0; i < 90; i++) add(rr(-34000, 34000), pick([TOWN.mount1, TOWN.mount2]), rr(2400, 6200), 1);
    for (let i = 0; i < 70; i++) add(rr(-30000, 30000), TOWN.hill, rr(700, 1800), 1);
    for (let i = 0; i < 110; i++) { const a = rnd() < 0.5 ? -1 : 1; add(a * rr(260, 2600) * (rnd() < 0.3 ? 2 : 1), pick([TOWN.tall1, TOWN.tall2, TOWN.tall3, TOWN.tall4, TOWN.tall5]), rr(90, 300) * (1 - rnd() * 0.3), 0.6); }
    for (let i = 0; i < 70; i++) add(rr(-5000, 5000), pick([TOWN.tree, TOWN.pine]), rr(40, 110), 0.5);
    for (let i = 0; i < 14; i++) add(rr(-900, 900), TOWN.tower, 45, 0.5);
    let x = 11;
    for (let k = 0; k < 78; k++) { for (const a of [-1, 1]) add(a * x + rr(-1, 1), pick([TOWN.houseA, TOWN.houseB, TOWN.houseC, TOWN.houseD]), rr(11.5, 14), 0.3); if (k % 2 === 0) for (const a of [-1, 1]) add(a * (x + 7), pick([TOWN.tree, TOWN.tree, TOWN.pine]), rr(10, 15), 0.2); x += rr(12, 15); }
    for (let i = 0; i < 24; i++) add(rr(-260, 260), TOWN.lamp, 6, 0.1);
    add(-7.4, TOWN.tree, 9.5, 0.05); add(6.6, TOWN.pine, 9, 0.05); add(4.2, TOWN.mail, 1.9, 0); add(-4.3, TOWN.gnome, 1.1, 0); add(-5.8, TOWN.fence, 2.4, 0.04); add(8.4, TOWN.fence, 2.4, 0.04); add(11, TOWN.sign, 3, 0);
    RIM.sort((a, b) => b.d - a.d);
})();
const CARS = [{ s: -8, v: 3.2, f: TOWN.carR }, { s: 22, v: -2.4, f: TOWN.carT }, { s: 60, v: 4, f: TOWN.carR }, { s: -80, v: 3, f: TOWN.carT }];
const CLOUDS = []; for (let i = 0; i < 70; i++) { const big = rnd(); CLOUDS.push({ x: rr(-1, 1), alt: 8 * 10 ** (big * 2.9), size: 9 * 10 ** (big * 2.6), f: 21 + Math.floor(rnd() * 3), v: rr(0.04, 0.12) }); }
const SHELLS = [0, 1, 2].map(() => Array.from({ length: 70 }, () => { const a = rnd() * Math.PI * 2, r = 0.15 + rnd() ** 0.6 * 1.3; return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: rr(2, 7), t: rnd() < 0.2 ? 0 : 1, c: pick([[1, 1, 1], [1, 0.84, 0.5], [0.6, 0.85, 1], [1, 0.65, 0.7]]) }; }));
const NEAR = Array.from({ length: 70 }, () => { const a = rnd() * Math.PI * 2, r = 10 ** rr(9.4, 13.4); return { x: SUN[0] + Math.cos(a) * r, y: SUN[1] + Math.sin(a) * r * 0.8, s: rr(6, 15), c: pick([[1, 1, 1], [1, 0.8, 0.45], [0.6, 0.8, 1], [1, 0.55, 0.5]]) }; });
const GALAXIES = Array.from({ length: 22 }, () => { const a = rnd() * Math.PI * 2, r = 10 ** rr(15.7, 17.3); return { x: GALAXY[0] + Math.cos(a) * r, y: GALAXY[1] + Math.sin(a) * r, r: 10 ** rr(14.3, 15.1), rot: rnd() * 3, c: pick(["#ffffff", "#ffd7a8", "#a8d8ff", "#ffb8d0"]) }; });
const PLANETS = [
    { n: "MERCURY", f: 1, a: 1.2e6, r: 2.2e4, t: 0.9, p: 0.4 }, { n: "VENUS", f: 2, a: 2.1e6, r: 3e4, t: 0.5, p: 2.7 }, { n: "MARS", f: 3, a: 4.5e6, r: 2.4e4, t: 0.25, p: 4.2 },
    { n: "JUPITER", f: 4, a: 1.56e7, r: 8.5e4, t: 0.08, p: 5.4 }, { n: "SATURN", f: 5, a: 2.9e7, r: 7e4, t: 0.05, p: 0.8, ring: true }, { n: "URANUS", f: 6, a: 5.7e7, r: 4.5e4, t: 0.03, p: 3.1 }, { n: "NEPTUNE", f: 7, a: 9e7, r: 4.3e4, t: 0.02, p: 2.1 },
];
const ROCKS = Array.from({ length: 60 }, () => ({ a: rnd() * Math.PI * 2, r: rr(7.5e6, 1.05e7), v: rr(0.05, 0.1) }));

const SKY = [ // L, top, bottom
    [0, "#6fd0ea", "#ffe9b0"], [2.2, "#58c0ea", "#ffdca0"], [3.4, "#3a8fe0", "#a8e4ee"], [4.1, "#1b3f9e", "#5ec3e0"], [4.7, "#0e1450", "#1f3f92"], [5.4, "#0b0a2e", "#1a1147"],
    [9, "#0a0728", "#22114f"], [13, "#160631", "#3a0f5e"], [16.5, "#090520", "#1d0d4a"], [18.5, "#04091f", "#0f2f5e"], [19.5, "#0a0626", "#2a1266"], [20.4, "#5a1a7a", "#ff5e5b"], [22.2, "#ff7a4a", "#ffc24a"], [24, "#ffc24a", "#fff4dc"],
];
export function skyAt(L) {
    let i = 0; while (i < SKY.length - 2 && L > SKY[i + 1][0]) i++;
    const a = SKY[i], b = SKY[i + 1], t = ss(a[0], b[0], L);
    const toHex = (c) => `#${c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
    return [toHex(mix(a[1], b[1], t)), toHex(mix(a[2], b[2], t))];
}

/** Where the camera is looking and how big a metre is. */
export function pose(L, pane) {
    const k = pane.h / 10 ** L, ground = pane.groundY, sky = pane.h * 0.38;
    let fx = 0, fy = 0, ay = ground;
    const a = ss(3.7, 5.0, L), b = ss(6.35, 7.0, L), c = ss(9.4, 15.0, L);
    ay = ground + (sky - ground) * a;
    fy = -R * a; fx = 0;
    fx += (SUN[0] - fx) * b; fy += (SUN[1] - fy) * b;
    fx += (GALAXY[0] - fx) * c; fy += (GALAXY[1] - fy) * c;
    return { k, ax: pane.x + pane.w / 2, ay, fx, fy };
}

const WORDS = ["MAYBE", "LATER", "?", "WHY", "SOMEDAY", "NOW-ISH", "%", "&", "ALMOST", "HMM", "TUES", "...", "ETC", "IDEA", "$", "+"];
const SHAPES = Array.from({ length: 34 }, () => ({ a: rnd() * Math.PI * 2, r: rr(0.2, 1.3), w: pick(WORDS), rot: rr(-0.5, 0.5), c: pick(["#fff4dc", "#ffb627", "#1d1640", "#ff8fa3"]), s: rr(16, 40) }));

/** Draws everything behind the table. t is seconds, for drift. */
export function drawWorld(d, L, t, pane, view, o = {}) {
    const P = pose(L, pane), k = P.k, SX = (x) => P.ax + (x - P.fx) * k, SY = (y) => P.ay - (y - P.fy) * k, W = view.width, H = view.height;
    const inView = (x, y, r) => x + r > -40 && x - r < W + 40 && y + r > -40 && y - r < H + 40;

    // Stars: three shells that rush inward forever, so zooming out always feels like moving.
    const starA = ss(3.8, 5, L) * (1 - ss(19.6, 20.4, L));
    if (starA > 0.01) {
        const put = d.quads("fx"), cx = P.ax, cy = pane.h * 0.38;
        for (let i = 0; i < 3; i++) {
            const ph = ((L * 0.45 + i / 3) % 1 + 1) % 1, z = 2.6 ** (1 - ph * 2) * 1.0, a = Math.sin(ph * Math.PI) * starA, rad = Math.max(W, pane.h);
            for (const st of SHELLS[i]) { const x = cx + st.x * rad * z, y = cy + st.y * rad * z; if (inView(x, y, 4)) put(x, y, st.s * (st.t ? 0.6 : 1.6), st.s * (st.t ? 0.6 : 1.6), 0, st.t ? 1 : 0, st.c[0], st.c[1], st.c[2], a * (0.5 + 0.5 * Math.sin(t * 2 + st.x * 40))); }
        }
    }

    // The planet, as a bent strip of ground.
    const groundA = 1 - ss(4.15, 4.5, L);
    if (groundA > 0.01) {
        const cxE = SX(0), cyE = SY(-R), rPx = R * k;
        const cap = (radius, color, a = 1) => {
            const half = Math.min(Math.PI, (Math.max(W, H) * 1.3) / radius), n = 48, pts = [];
            for (let i = 0; i <= n; i++) { const th = -half + (2 * half * i) / n; pts.push([cxE + Math.sin(th) * radius, cyE - Math.cos(th) * radius]); }
            if (half < Math.PI) { pts.push([cxE + Math.sin(half) * radius + 4000, cyE + 40000]); pts.push([cxE - Math.sin(half) * radius - 4000, cyE + 40000]); }
            d.poly(pts, { color, opacity: a * groundA });
        };
        // Hazy hills sit behind everything on the rim.
        if (L < 2.8) { const a = 1 - ss(2.2, 2.8, L); for (let i = -6; i < 7; i++) { const s = i * 34; d.sprite("town", { frame: TOWN.hill, x: SX(s), y: SY(0) - 26 * k - 8, width: 60 * k, height: 60 * k, color: "#a8dcb0", opacity: a * groundA }); } }
        const put = d.quads("town");
        for (const o2 of RIM) {
            const px = o2.h * k;
            if (px < 2.2) continue;
            const th = o2.s / R, ux = Math.sin(th), uy = Math.cos(th), cx = SX(ux * (R + o2.h * 0.48)), cy = SY(uy * (R + o2.h * 0.48) - R);
            if (!inView(cx, cy, px)) continue;
            put(cx, cy, px, px, th, o2.f, 1, 1, 1, groundA);
        }
        cap(rPx, "#6cc24a");
        if (L < 1.8) d.sprite("home", { x: SX(-0.2), y: SY(4.05), width: 10 * k, height: 8.125 * k, opacity: groundA });
        if (rPx > 300) {
            cap(rPx - 4.5 * k, "#8e92ad"); cap(rPx - 4.9 * k, "#57597e"); cap(rPx - 8.6 * k, "#f4ecd8");  cap(rPx - 9 * k, "#57c04a");
            if (L < 3) { const c = d.quads("town"); for (const car of CARS) { const s = ((car.s + car.v * t + 300) % 600) - 300, sz = 7 * k; c(SX(s), SY(-6.6) - sz * 0.05, sz, sz, 0, car.f); } }
        }
    }
    // Earth, once it fits on screen.
    const earthPx = R * k;
    const earthA = ss(4.0, 4.3, L) * (1 - ss(9, 9.6, L));
    if (earthA > 0.01) {
        const ex = SX(0), ey = SY(-R), glow = earthPx * 1.2;
        if (L > 4.2) d.additive(() => d.sprite("glow", { x: ex, y: ey, width: Math.max(14, earthPx * 2.8), height: Math.max(14, earthPx * 2.8), color: "#6ac8ff", opacity: earthA * 0.5 * (1 - ss(6.4, 7, L) * 0.5) }));
        const s = Math.max(earthPx, 2.4) * 2.12;
        if (inView(ex, ey, s)) d.sprite("earth", { x: ex, y: ey, width: s, height: s, opacity: earthA });
    }
    // The solar system.
    const solA = ss(5.3, 5.7, L) * (1 - ss(9.1, 9.8, L));
    if (solA > 0.01) {
        const sx = SX(SUN[0]), sy = SY(SUN[1]), rings = ss(6.5, 7, L) * solA;
        const mx = SX(0) + Math.cos(0.9 + t * 0.03) * MOON_D * k, my = SY(-R) - Math.sin(0.9 + t * 0.03) * MOON_D * k;
        const mr = Math.max(1e4 * k, 2) * 2.1;
        if (L < 8) d.sprite("planets", { frame: 0, x: mx, y: my, width: mr, height: mr, opacity: solA });
        // Orbits are dashed lines. A planet's year is a couple of minutes here.
        if (rings > 0.01) for (const pl of [...PLANETS, { a: AU }]) {
            const pxr = pl.a * k; if (pxr < 8 || pxr > Math.max(W, H) * 8) continue;
            const n = 72; for (let i = 0; i < n; i += 2) { const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2; const p0 = [sx + Math.cos(a0) * pxr, sy + Math.sin(a0) * pxr], p1 = [sx + Math.cos(a1) * pxr, sy + Math.sin(a1) * pxr]; if (inView(p0[0], p0[1], 4)) d.line(p0, p1, { width: 1, color: "#9be3d3", opacity: rings * 0.28 }); }
        }
        if (L > 6.7) { const q = d.quads("fx"); for (const r of ROCKS) { const a = r.a + t * r.v * 0.2, x = sx + Math.cos(a) * r.r * k, y = sy + Math.sin(a) * r.r * k; q(x, y, 3, 3, 0, 1, 0.8, 0.75, 0.7, solA * ss(6.7, 7.2, L)); } }
        d.additive(() => { const g = Math.max(2.5e5 * k * 9, 40); d.sprite("glow", { x: sx, y: sy, width: g, height: g, color: "#ffb45a", opacity: solA }); });
        const sr = Math.max(2.5e5 * k, 4) * 2.1;
        d.sprite("items", { frame: ITEM_FRAMES.sun, x: sx, y: sy, width: sr * 1.5, height: sr * 1.5, opacity: solA });
        for (const pl of PLANETS) {
            const a = pl.p + t * pl.t * 0.05, x = sx + Math.cos(a) * pl.a * k, y = sy + Math.sin(a) * pl.a * k, r = Math.max(pl.r * k, 2.6) * 2.1;
            if (!inView(x, y, r)) continue;
            if (pl.ring) d.sprite("ring", { x, y, width: r * 2.6, height: r * 0.8, rot: -0.2, opacity: solA });
            d.sprite("planets", { frame: pl.f, x, y, width: r, height: r, opacity: solA });
            if (r < 34 && r > 3 && L < 8.8) T(d, pl.n, x, y + r / 2 + 10, 8, { color: "#fff4dc", opacity: solA * 0.85 });
        }
    }
    // Neighbouring stars.
    const nearA = ss(9, 9.8, L) * (1 - ss(13.8, 15, L));
    if (nearA > 0.01) {
        d.additive(() => { const q = d.quads("fx"); for (const st of NEAR) { const x = SX(st.x), y = SY(st.y); if (inView(x, y, 10)) q(x, y, st.s * 1.8, st.s * 1.8, 0, 0, st.c[0], st.c[1], st.c[2], nearA); } });
        d.additive(() => d.sprite("glow", { x: SX(SUN[0]), y: SY(SUN[1]), width: 26, height: 26, color: "#ffd76e", opacity: nearA }));
    }
    // Galaxies.
    const galA = ss(13.2, 14.6, L) * (1 - ss(17.4, 18.6, L));
    if (galA > 0.01) d.additive(() => {
        const s = 2.6e15 * k;
        for (const g of GALAXIES) { const x = SX(g.x), y = SY(g.y), r = g.r * k * 2; if (r > 2 && inView(x, y, r)) d.sprite("galaxy", { x, y, width: r, height: r, rot: g.rot, color: g.c, opacity: galA * ss(15, 16, L) }); }
        d.sprite("galaxy", { x: SX(GALAXY[0]), y: SY(GALAXY[1]), width: Math.max(s, 8), height: Math.max(s, 8), rot: -0.35, opacity: galA });
        d.sprite("glow", { x: SX(GALAXY[0]), y: SY(GALAXY[1]), width: s * 0.5, height: s * 0.5, color: "#ffc8a0", opacity: galA * 0.5 });
    });
    // The web, then the ball it all lives in.
    const webA = ss(16.6, 17.8, L) * (1 - ss(18.9, 19.5, L));
    if (webA > 0.01) d.additive(() => { const s = 6e18 * k; d.sprite("web", { x: SX(GALAXY[0]), y: SY(GALAXY[1]), width: s, height: s, rot: t * 0.002, opacity: webA }); });
    const ballA = ss(18.7, 19.3, L);
    if (ballA > 0.01 && !o.noBall) {
        const size = 3.4e19 * k, x = SX(GALAXY[0]), y = SY(GALAXY[1]);
        if (L > 19.4) d.additive(() => d.sprite("glow", { x, y, width: size * 1.7, height: size * 1.7, color: "#ff8fa3", opacity: 0.4 * ballA }));
        d.sprite("ball", { x, y, width: size, height: size, opacity: ballA });
    }
    // Past the edge: words and punctuation in free float.
    const absA = ss(19.7, 20.5, L);
    if (absA > 0.01) {
        const cx = P.ax, cy = pane.h * 0.38, rad = Math.max(W, pane.h);
        for (let i = 0; i < SHAPES.length; i++) {
            const sh = SHAPES[i], ph = ((L * 0.6 + i / 7) % 1 + 1) % 1, z = 3 ** (1 - ph * 2), a = Math.sin(ph * Math.PI) * absA;
            const x = cx + Math.cos(sh.a + t * 0.01) * sh.r * rad * z * 0.7, y = cy + Math.sin(sh.a + t * 0.01) * sh.r * rad * z * 0.6;
            if (inView(x, y, 60)) T(d, sh.w, x, y, sh.s * z * 0.6, { color: sh.c, rot: sh.rot, opacity: a * 0.75 });
        }
    }
    // Clouds in front of the town, with their own slow drift.
    const cloudA = 1 - ss(3.6, 4.2, L);
    if (cloudA > 0.01) {
        const put = d.quads("town");
        for (const c of CLOUDS) {
            const px = c.size * k; if (px < 14 || px > pane.h * 1.6) continue;
            const span = (W + px * 2) / k, x = (((c.x * 500 * c.size / 9 + t * c.v * c.size * 0.4) % span) + span) % span - span / 2, sx = P.ax + x * k, sy = SY(c.alt);
            if (sy > -px && sy < pane.groundY) put(sx, sy, px, px, 0, c.f, 1, 1, 1, cloudA * Math.min(1, (px - 14) / 20) * Math.min(1, (pane.h * 1.6 - px) / (pane.h * 0.5)));
        }
        if (L > 2.2 && L < 3.8) { const px = 90 * k * 3 + 30, x = ((t * 16) % (W + 200)) - 100; put(x, pane.h * 0.26, px, px, 0, TOWN.plane, 1, 1, 1, cloudA * win(L, 2.2, 2.5, 3.5, 3.8)); put(W - ((t * 7) % (W + 200)) + 100 - 100, pane.h * 0.42, px * 1.2, px * 1.2, 0, TOWN.blimp, 1, 1, 1, cloudA * win(L, 2.2, 2.5, 3.5, 3.8)); }
    }
    // The running joke.
    const hereA = win(L, 5.6, 6, 18.8, 19.2);
    if (hereA > 0.01 && !o.noLabel) {
        const big = L > 13.2, solar = L < 9.3, x = big ? SX(SUN[0]) : solar ? SX(0) : SX(SUN[0]), y = big ? SY(SUN[1]) : solar ? SY(-R) : SY(SUN[1]);
        const fx = Math.max(92, Math.min(W - 92, x + 54)), fy = Math.max(pane.h * 0.2, Math.min(pane.h * 0.6, y - 34));
        d.line([fx - 40, fy + 8], [x + 2, y - 2], { width: 2, color: "#ffb627", opacity: hereA });
        d.rect(92, 20, { x: fx, y: fy, color: "#ff7a18", radius: 4, opacity: hereA });
        T(d, "YOU ARE HERE", fx, fy, 8.5, { color: "#fff4dc", maxW: 84, opacity: hereA });
    }
}
