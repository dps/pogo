// The foreground that never changes scale: the slab of driveway, the card table, you, your customers, and whatever you are selling today.
import * as E from "./econ.js";
import { ITEM_FRAMES, C } from "./art.js";
import { T, textWidth } from "./font.js";

const FONT = '"Arial Rounded MT Bold", ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
export { FONT };
export const crewFrame = (a, i) => a * 5 + i;

export function metrics(G) {
    const P = G.pane, tw = Math.min(214, P.w * 0.56, P.h * 0.5), th = (tw * 200) / 420, sw = tw * 1.75, sh = (sw * 230) / 560;
    const cx = P.x + P.w / 2, yTop = P.h * 0.62, yFeet = yTop + th * 0.8;
    return { tw, th, sw, sh, cx, yTop, yFeet, slabY: yFeet + sh * 0.27, itemY: yTop - tw * 0.28 + 2, itemS: tw * 0.66 };
}

function drawItem(d, key, x, y, size, rot, sx, sy, a = 1) {
    d.push(); d.translate(x, y); d.rotate(rot); d.scale(sx, sy);
    if (key.startsWith("word:")) drawWord(d, key.slice(5), size, a);
    else d.sprite("items", { frame: ITEM_FRAMES[key], width: size * 1.14, height: size * 1.14, opacity: a });
    d.pop();
}
function drawWord(d, word, size, a) {
    const w = Math.max(size * 0.9, textWidth(word, size * 0.26) + 26), h = size * 0.62;
    d.rect(w + 8, h + 8, { x: 2, y: 3, color: "#1d1640", radius: 8, opacity: a * 0.9 });
    d.rect(w + 8, h + 8, { color: C.paper, radius: 8, opacity: a }); d.rect(w, h, { color: "#ffffff", radius: 5, opacity: a });
    for (let i = 0; i < 4; i++) d.rect(w - 14, 1, { y: -h * 0.3 + i * h * 0.2, color: "#b6d4ee", opacity: a * 0.6 });
    T(d, word, 0, 0, size * 0.26, { color: C.ink, maxW: w - 16, opacity: a });
}

export function drawStage(d, G) {
    const { S, A } = G, M = metrics(G), t = G.time;
    const floats = S.concepts && E.sold(S, "gravity") ? Math.sin(t * 1.4) * 5 : 0;
    const drift = A.space * Math.sin(t * 0.9) * 3 + floats;
    // Hole sits behind it all.
    const hole = E.holeOn(S) && !S.ended ? Math.min(1, 0.1 + Math.log10(E.holeMult(S)) * 0.16) : 0;
    if (hole > 0) {
        const hw = M.tw * (0.5 + hole * 0.8) * (1 + A.holeKick * 0.3), hy = M.yFeet + M.tw * 0.04, op = 0.25 + hole * 0.5;
        d.push(); d.translate(M.cx, hy); d.rotate(-0.22); d.scale(1, 0.42);
        d.additive(() => { d.sprite("hole", { width: hw * 1.8, height: hw * 1.8, rot: t * 0.5, opacity: op }); d.sprite("hole", { width: hw * 1.5, height: hw * 1.5, rot: -t * 0.35 + 1, opacity: op * 0.6 }); });
        d.pop();
        d.circle(hw * 0.2, { x: M.cx, y: hy, color: "#07041a" });
    }

    d.push(); d.translate(0, drift);
    // The driveway, broken loose if you've gone far enough.
    const under = Math.max(0, Math.min(1, (A.L - 3.3) / 0.5)), cut = 112 / 230;
    if (under > 0) d.sprite("slab", { x: M.cx, y: M.slabY + M.sh * (cut / 2), width: M.sw, height: M.sh * (1 - cut), crop: [0, 112, 560, 118], opacity: under });
    d.sprite("slab", { x: M.cx, y: M.slabY - M.sh * ((1 - cut) / 2), width: M.sw, height: M.sh * cut, crop: [0, 0, 560, 112] });

    // Rival.
    if (S.act === 2 && !A.cust) drawPerson(d, 18, A.garyArm > 0 ? 1 : 0, M.cx + M.tw * 0.66, M.yFeet + 8, M.tw * 0.8, true, 1);
    // You, beside the table, close enough to reach.
    drawPerson(d, 0, A.vendor > 0 ? 1 : 0, M.cx - M.tw * 0.66, M.yFeet + 8 - A.vendorHop, M.tw * 0.72, false, 1);

    const lean = A.tableRot;
    d.push(); d.translate(M.cx, M.yTop + M.th * 0.42); d.rotate(lean); d.scale(1 + A.tableSq * 0.06, 1 - A.tableSq * 0.07);
    d.sprite("table", { width: M.tw, height: M.th });
    d.pop();

    // The snow globe has been on this table since the first morning.
    if (!G.globeGone) { const gs = M.tw * 0.14, gx = M.cx - M.tw * 0.39, gy = M.yTop - gs * 0.5 + A.tableSq * 2; d.sprite("globe", { x: gx, y: gy, width: gs, height: gs * 1.16 }); const q = d.quads("fx"); for (let i = 0; i < 4; i++) { const a = t * (0.6 + i * 0.2) + i * 1.7; q(gx + Math.cos(a) * gs * 0.26, gy - gs * 0.08 + Math.sin(a * 1.3) * gs * 0.2, 3, 3, 0, 0, 1, 1, 1, 0.8); } }

    // The goods.
    if (!S.ended) {
        const stop = E.act(S).stops[S.stop];
        const y = M.yTop - M.itemS * 0.46 - A.hop + A.dropY * -1;
        // Contact shadow.
        d.circle(1, { x: -9999, y: -9999, opacity: 0 });
        if (A.flyT > 0) { const k = 1 - A.flyT / 0.35; drawItem(d, A.flyKey, M.cx + k * G.pane.w * 0.6, y - k * 90, M.itemS, k * 1.2, 1, 1, 1 - k * 0.6); }
        if (A.itemIn >= 1 || A.flyT <= 0) drawItem(d, stop.item, M.cx, y, M.itemS, A.rot, A.sx, A.sy, 1);
    }

    // Its name, pinned to the table skirt.
    if (!S.ended) { const st = E.act(S).stops[S.stop], tw = Math.min(M.tw - 18, textWidth(st.title, 10.5) + 18), ty = M.yTop + M.th * 0.3; d.rect(tw + 3, 22, { x: M.cx + 1, y: ty + 2, color: C.ink, radius: 3, opacity: 0.5 }); d.rect(tw, 20, { x: M.cx, y: ty, color: E.sold(S, "beige") ? "#ffffff" : C.paper, radius: 3 }); T(d, st.title, M.cx, ty, 10.5, { color: C.ink, maxW: tw - 8 }); }

    // Customer, on your side of things.
    const c = A.cust;
    if (c) drawPerson(d, c.look, c.talk > 0 ? 1 : 0, c.x, M.yFeet + 8 + Math.abs(Math.sin(c.step)) * -4, M.tw * (c.look === 17 ? 0.62 : 0.72), true, c.a ?? 1);

    // Crew, on the front lip of the slab.
    const n = S.crew.reduce((a, b, i) => a + (b > 0 ? 1 : 0), 0);
    if (n) {
        const size = Math.min(34, M.tw * 0.17), put = d.quads("crew"); let k = 0;
        for (let i = 0; i < 5; i++) if (S.crew[i] > 0) { const x = M.cx + (k - (n - 1) / 2) * (size + 6), hop = Math.max(0, A.crewHop[i]) * 9; put(x, M.yFeet + size * 0.62 - hop + Math.sin(t * 2 + i) * 1, size, size, Math.sin(t * 1.3 + i) * 0.05, crewFrame(S.act, i)); k++; }
    }
    d.pop();

    // Orbit ring and comet.
    if (E.orbitOn(S) && !S.ended) {
        const r = M.tw * 0.46, cy = M.yTop - M.itemS * 0.46 + drift, q = d.quads("fx");
        for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; q(M.cx + Math.sin(a) * r, cy - Math.cos(a) * r, 2.4, 2.4, 0, 1, 1, 0.95, 0.85, 0.38); }
        const w = E.TUNE.orbitWindow;
        for (let i = -6; i <= 6; i++) { const a = (i / 6) * w; q(M.cx + Math.sin(a) * r, cy - Math.cos(a) * r, 6, 6, 0, 1, 1, 0.71, 0.15, 0.95); }
        const a = S.orbit, cx = M.cx + Math.sin(a) * r, cy2 = cy - Math.cos(a) * r, inWin = Math.abs(((a + Math.PI) % (Math.PI * 2)) - Math.PI) < w;
        d.additive(() => { d.sprite("glow", { x: cx, y: cy2, width: 42, height: 42, color: inWin ? "#ffd76e" : "#7fd6e8" }); });
        for (let i = 1; i < 7; i++) { const b = a - i * 0.09; q(M.cx + Math.sin(b) * r, cy - Math.cos(b) * r, 9 - i, 9 - i, 0, 1, 0.75, 0.93, 1, 0.5 - i * 0.06); }
        q(cx, cy2, 12, 12, 0, 0, 1, 1, 1, 1);
    }
}
function drawPerson(d, look, frame, x, feetY, h, flip, a) {
    d.sprite("people", { frame: look * 2 + frame, x, y: feetY - h / 2, width: (h * 160) / 200, height: h, flipX: flip, opacity: a });
}
export const stageItemTop = (G) => metrics(G).itemY;
