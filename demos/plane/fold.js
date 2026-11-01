// The reward: a sheet of the Post Office's paper, and you fold it. Drag (or tap) and the crease goes in with a snap
// you can feel, step by step, until the sheet is a new plane. Folds reflect polygons about a crease line, so the paper
// really does what it is told.
import { color, mesh, pos, rot, scale } from "./pogo.js";
import { PLANES } from "./data.js";
import { CORAL, CREAM, INK, SERIF, paperBtn } from "./hud.js";
import { pin } from "./pogo.js";

const W0 = 1, H0 = 1.4;
// Each step is a list of creases. A crease is [ax, ay, bx, by]: everything left of a->b folds over the line.
const F = {
    half: [[0, -2, 0, 2]],
    corners: [[0, 1.4, -1, 0.4], [1, 0.4, 0, 1.4]],
    corners2: [[0, 1.4, -0.5, -0.3], [0.5, -0.3, 0, 1.4]],
    nose: [[-1, 0.45, 1, 0.45]],
    tip: [[-1, 0.9, 1, 0.9]],
    wing: [[-0.36, -2, -0.36, 2]],
    wing2: [[-0.24, -2, -0.24, 2]],
    snip: [[-1, -1.0, 1, -1.0]],
};
const STEPS = {
    postman: [F.half, F.corners, F.wing], dart: [F.half, F.corners, F.corners2, F.wing], longwing: [F.nose, F.tip, F.half, F.wing2], swallow: [F.half, F.corners, F.snip, F.wing], crane: [F.nose, F.corners, F.half, F.snip, F.wing2],
};
// Half-plane clipping: split a convex polygon by a line.
function split(poly, a, b) {
    const L = [], R = [], side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    for (let i = 0; i < poly.length; i++) {
        const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p), sq = side(q);
        if (sp >= 0) L.push(p); if (sp <= 0) R.push(p);
        if (sp * sq < 0) { const t = sp / (sp - sq), m = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; L.push(m); R.push(m); }
    }
    return [L, R];
}
function dropFolded(pieces, crease, k) {
    const [ax, ay, bx, by] = crease, a = [ax, ay], b = [bx, by], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l, c = Math.cos(k * Math.PI);
    const still = [], moved = [];
    for (const pc of pieces) {
        const [L, R] = split(pc.poly, a, b);
        if (R.length > 2) still.push({ ...pc, poly: R });
        if (L.length > 2) moved.push({ poly: L.map((p) => { const dist = (p[0] - ax) * nx + (p[1] - ay) * ny; return [p[0] - nx * dist * (1 - c), p[1] - ny * dist * (1 - c)]; }), back: k > 0.5 ? !pc.back : pc.back, shade: Math.sin(k * Math.PI) });
    }
    return [...still, ...moved];
}

export function registerFold(game) {
    game.scene("fold", (s, a = {}) => {
        const c = PLANES.find((p) => p.id === a.plane) ?? PLANES[1], steps = STEPS[c.id], snd = game.snd;
        game.touch.enabled = false;
        s.background = "#2c6a68"; game.snd.music(a.unfold ? "ending" : "title");
        s.light.shadows = false; s.light.dir.set(-0.4, -0.8, -0.5); s.light.color = color("#9a9486"); s.light.sky = color("#cfd2cc"); s.light.ground = color("#8a8a80"); s.cam3.set([0, 2.5, 4.6], [0, 0, 0]); s.cam3.fov = 40;
        const F2 = (game.sim = { phase: "fold", i: 0, k: 0, drag: false, pieces: [{ poly: [[-W0, -H0], [W0, -H0], [W0, H0], [-W0, H0]], back: false, shade: 0 }], t: 0, done: false, auto: false, plane: c });
        let sx = 0, sy = 0, tick = 0;
        const tapBump = () => { F2.auto = true; };
        const model = s.add([mesh(`plane_${c.id}`, { texture: "paper" }), pos(0, 0.2, 0), rot(0.2, 0.6, 0), scale(0), { name: "model" }]);
        let done = null;
        const finish = () => {
            F2.done = true; snd.fx("chapter"); game.haptic("success");
            if (s.view.width > s.view.height) { model.pos.x = 0.9; model.pos.y = 0.1; } s.tween(model, { scale: s.view.width > s.view.height ? 1.05 : 1.55 }, 0.6, { ease: "outBack" }); s.flash("#ffffff", 0.25);
            if (!a.unfold) game.progress.plane = c.id; game.persist();
            done = s.add([paperBtn(a.next?.mode === "title" ? "The end, for now" : "Fly it", { width: 170, action: "confirm", color: "#d9593f", ink: "#fff6e6", onTap: () => { snd.fx("launch"); game.go("fly", a.next ?? { mode: "story" }, { fade: 0.5 }); } }), pin("bottom", [0, 50])]);
        };
        s.onUpdate((dt) => {
            F2.t += dt; const p = s.input.pointer;
            model.rot.y += dt * 0.7;
            if (F2.done) return;
            if (p.pressed) { F2.drag = true; sx = p.x; sy = p.y; tick = 0; }
            if (F2.drag && p.down) { const d = Math.hypot(p.x - sx, p.y - sy); F2.k = Math.max(F2.k, Math.min(0.92, d / 150)); const q = Math.floor(F2.k * 6); if (q > tick) { tick = q; game.haptic("tick"); snd.fx("page"); } }
            if (F2.drag && !p.down) { F2.drag = false; F2.auto = true; }
            if (s.input.pressed("confirm")) F2.auto = true;
            if (F2.auto) {
                F2.k += dt * 2.6;
                if (F2.k >= 1) {
                    for (const cr of steps[F2.i]) F2.pieces = dropFolded(F2.pieces, cr, 1);
                    F2.i++; F2.k = 0; F2.auto = false; snd.fx("crease"); s.shake(0.06, 0.1, { haptic: false }); game.haptic("medium");
                    if (F2.i >= steps.length) finish();
                }
            }
        });
        s.onDraw((d) => {
            // The cutting mat under the sheet: a real modeller's bench.
            const W = s.view.width, H = s.view.height, g = 30;
            for (let x = W / 2 % g; x < W; x += g) d.line([x, 0], [x, H], { width: 1, color: "#8fc4b4", opacity: 0.22 });
            for (let y = H / 2 % g; y < H; y += g) d.line([0, y], [W, y], { width: 1, color: "#8fc4b4", opacity: 0.22 });
        });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, S = game.view.safe, wide = W > H, t = F2.t;
            const hx = wide ? W * 0.27 : W / 2, mw = wide ? W * 0.46 : W - 40;
            d.text(a.unfold ? "One last fold" : "A new sheet", { x: hx, y: S.top + 30, size: 15, color: "#bfe0d4", font: SERIF });
            d.text(F2.done ? c.name : (c.steps[Math.min(F2.i, c.steps.length - 1)] ?? ""), { x: hx, y: S.top + 58, size: 24, bold: true, color: CREAM, font: SERIF });
            if (F2.done) { d.text(c.blurb, { x: hx, y: S.top + 92, size: 15, color: "#d7ecdf", font: SERIF, maxWidth: mw }); return; }
            const U = wide ? H * 0.3 : Math.min(W * 0.36, H * 0.26), cx = wide ? W * 0.68 : W / 2, cy = wide ? H * 0.5 : H * 0.52;
            let ps = F2.pieces; if (F2.k > 0) for (const cr of steps[F2.i]) ps = dropFolded(ps, cr, F2.k);
            d.push(); d.translate(cx, cy); d.scale(U, -U);
                        ps.forEach((pc, i) => {
                const col = pc.shade > 0.02 ? mixHex(pc.back ? "#e9d8ba" : "#fbf4e4", "#cdbb9c", pc.shade * 0.7) : pc.back ? "#e9d8ba" : "#fbf4e4";
                d.poly(pc.poly.map((q) => [q[0] + 0.022, q[1] - 0.03]), { color: "#000000", opacity: 0.16 });
                d.poly(pc.poly, { color: col });
                pc.poly.forEach((q, j) => { const n = pc.poly[(j + 1) % pc.poly.length]; d.line(q, n, { width: 0.008, color: "#b7a688" }); });
            });
            if (F2.k === 0) for (const cr of steps[F2.i]) { const [ax, ay, bx, by] = cr, N = 16; for (let i = 0; i < N; i += 2) { const q0 = i / N, q1 = (i + 1) / N; d.line([ax + (bx - ax) * q0, ay + (by - ay) * q0], [ax + (bx - ax) * q1, ay + (by - ay) * q1], { width: 0.016, color: CORAL, opacity: Math.abs(ax + (bx - ax) * q0) <= 1.02 && Math.abs(ay + (by - ay) * q0) <= 1.42 ? 0.8 : 0 }); } }
            d.pop();
            d.text("Drag to crease it, or tap", { x: hx, y: H - S.bottom - 30, size: 15, color: "#d7ecdf", font: SERIF, opacity: 0.7 + 0.3 * Math.sin(t * 3) });
            for (let i = 0; i < steps.length; i++) d.circle(4.5, { x: hx + (i - (steps.length - 1) / 2) * 16, y: S.top + 84, color: i < F2.i ? "#efc15f" : "#5c938c" });
        });
    });
}
const mixHex = (a, b, t) => { const A = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), B = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
