// The room at the end of the line. Every carriage was made from something in here.
import { BRASS, OX, PAPER, WORLD, bench, clock, coat, dk, label, lt, rack, shell, suitcase, wren } from "./kit.js";
import { Canvas, bake, hash } from "./paint.js";
import { HAND, SERIF } from "./widgets.js";
import { SONGS } from "./audio.js";
const { W, H } = WORLD;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export const PAGES = (no) => [
    [600, [`Ticket ${no.toLocaleString("en-GB")}.`, "He got his coat at dusk again. He said he'd miss the last train home."]],
    [170, ["The doctor said not to argue. So I learned the railway.", "I print the tickets at work. I write the labels."]],
    [330, ["I come at 7:40. Every night. I stopped that clock myself.", "It's the train he met her on. It's the hour she died, with him snowed in at Thornby, one stop from this bed."]],
    [600, ["He has been trying to get home ever since."]],
    [930, ["It's all in this room. The music box. The bird book. His father's whistle.", "He builds the train out of what he can still reach."]],
    [760, ["When he's stuck he rings for the Conductor, and I say what I said last night.", "Some nights I forget, and call him Dad."]],
    [600, ["Twelve carriages tonight. I clipped the last one in the doorway. He held it to the lamp and made a bird of it. He does that.", "And then he looked at me."]],
    [600, ["He said my name."]],
    [600, ["He won't, in the morning. That's all right.", `Ticket ${(no + 1).toLocaleString("en-GB")} is in my bag.`]],
];

function paintRoom(S) {
    const p = new Canvas(W, H, S);
    shell(p, { wall: "#8f6a52", trim: "#6b4a34", runner: false, floor: "#5a4232", ceil: "#d9c29a", dado: 276, paper(q) { for (let x = 12; x < W; x += 52) for (let y = 74; y < 276; y += 52) { q.ell(x + (y % 104 > 40 ? 26 : 0), y, 3, 7, { c: "#7a5642", a: 0.6 }); } } });
    // The window, with the railway bank beyond it.
    p.rr(470, 72, 260, 180, 6, { c: "#6b4a34", c2: "#3a2616" }); p.rr(482, 84, 236, 156, 3, { blend: "erase", wob: 0 });
    p.rect(474, 244, 252, 8, { c: "#a07a5a", c2: "#5a3a26" }); p.rect(598, 84, 4, 156, { c: "#6b4a34" }); p.rect(482, 160, 236, 4, { c: "#6b4a34" });
    // Coat by the door, shoes side by side.
    coat(p, 90, 86, "#34405a"); p.rr(58, 334, 30, 16, 7, { c: "#2a1c14" }); p.rr(94, 334, 30, 16, 7, { c: "#2a1c14" });
    // Labels.
    [[20, 240, "c"], [136, 248, "d"], [210, 200, "e"], [980, 150, "f"], [860, 236, "g"], [1060, 270, "h"], [410, 310, "i"]].forEach(([x, y], i) => label(p, x, y, 58, 18, (i % 3 - 1) * 0.07));
    // The stopped clock and the card under it.
    clock(p, 330, 150, 40); p.rect(286, 200, 88, 30, { c: PAPER, c2: "#c9b98e" }); p.rect(294, 210, 70, 2, { c: "#2a2230", a: 0.7 }); p.rect(300, 218, 54, 2, { c: "#2a2230", a: 0.7 });
    // The bed.
    p.ell(240, 354, 130, 8, { c: "#000", a: 0.3 }); p.rr(140, 280, 210, 66, 5, { c: "#efe4d0", c2: "#b8ac94" }); p.rr(136, 300, 218, 46, 4, { c: "#6e3a46", c2: "#3a2028", m: 0.2 }); p.rr(122, 256, 18, 92, 4, { c: "#5a3a26", c2: "#3a2214" });
    // Chair, seen from behind, and the two of them against the window.
    p.ell(600, 354, 120, 9, { c: "#000", a: 0.4 }); p.rr(530, 218, 130, 136, 16, { c: "#3a4256", c2: "#1e2230", m: 0.14 }); p.rr(518, 262, 26, 92, 10, { c: "#343c50", c2: "#1a1e2a" }); p.rr(646, 262, 26, 92, 10, { c: "#343c50", c2: "#1a1e2a" });
    // Him: thin white hair over a bowed head, shoulders in a cardigan. Her: greying bun, one hand on his shoulder.
    p.poly([[552, 244], [566, 226], [582, 218], [612, 218], [628, 226], [644, 244], [650, 268], [546, 268]], { c: "#4a4438", c2: "#2a2620" });
    p.ell(597, 196, 22, 26, { c: "#3a342c", c2: "#241f1a" }); p.ell(574, 200, 4, 7, { c: "#3a342c" }); p.ell(620, 200, 4, 7, { c: "#3a342c" });
    p.ell(597, 184, 22, 15, { c: "#d8d3c8", c2: "#6a655c" }); p.ell(576, 194, 5, 9, { c: "#b8b3a8" }); p.ell(618, 194, 5, 9, { c: "#b8b3a8" });
    p.poly([[668, 354], [674, 256], [680, 226], [694, 214], [716, 214], [730, 228], [736, 258], [742, 354]], { c: "#2e2632", c2: "#17131c", s: 0.2, sd: "v" });
    p.ell(704, 186, 17, 21, { c: "#2a2228", c2: "#1a151c" }); p.ell(712, 164, 11, 10, { c: "#6a6068", c2: "#3a343a" }); p.ell(699, 176, 15, 10, { c: "#5a5058", a: 0.9 });
    p.line([[680, 232], [652, 226], [628, 232]], [11, 8], { c: "#2e2632" }); p.ell(626, 232, 6, 5, { c: "#3a2e2e" });
    // The shelf.
    p.rect(800, 196, 240, 8, { c: "#7a5642", c2: "#3a2616" });
    p.rr(816, 160, 64, 36, 3, { c: "#7c3a1c", c2: "#3a1c0c", s: 0.4 }); p.rr(812, 152, 72, 11, 3, { c: "#a05a2a", c2: "#5a2c10" });
    p.rect(900, 148, 62, 48, { c: "#3f6a7a", c2: "#26444e" }); wren(p, 930, 174, 0.4);
    p.ell(988, 188, 14, 6, { c: "#c0c6cc" }); p.line([[974, 176], [1000, 176], [1006, 170]], 8, { c: "#c0c6cc", c2: "#6d7680" }); p.line([[1000, 168], [1008, 150], [1022, 196]], 1, { c: BRASS });
    // Little table with a watch on it.
    p.ell(930, 354, 56, 7, { c: "#000", a: 0.3 }); p.rect(926, 270, 9, 84, { c: "#5a3a26" }); p.ell(930, 266, 56, 12, { c: "#a07a5a", c2: "#5a3a26" }); p.ell(930, 262, 12, 5, { c: BRASS }); p.ell(930, 261, 8, 3, { c: "#f4e9cf" });
    p.rr(976, 258, 40, 8, 1, { c: "#e9d9b0" }); suitcase(p, 780, 300, 96, 48, "#8a5a34");
    // A little lamp, and the door.
    p.line([[1110, 266], [1110, 196]], 4, { c: BRASS }); p.poly([[1094, 170], [1126, 170], [1140, 200], [1080, 200]], { c: "#ffd690", c2: "#f49a42" }); p.ell(1110, 268, 20, 7, { c: BRASS, c2: dk(BRASS, 0.5) });
    p.rect(1110 - 44, 268, 88, 86, { c: "#5a3a26", c2: "#2a1c12", s: 0.4 });
    p.light("#8a7890", [{ x: 1110, y: 180, r: 320, i: 0.85 }, { x: 600, y: 180, r: 300, i: 0.4, c: "#ff9c70" }, { x: 120, y: 140, r: 240, i: 0.3 }]);
    p.poly([[1094, 170], [1126, 170], [1140, 200], [1080, 200]], { c: "#fff0c2", c2: "#ffc068" });
    p.brush(3); p.finish({ vig: 0.32 });
    return p;
}
function paintDusk() {
    const c = new Canvas(280, 200, 2);
    c.rect(0, 0, 280, 120, { c: "#3a3a70", c2: "#f09a6a", wob: 0, s: 0.2, sd: "h" }); c.rect(0, 118, 280, 90, { c: "#4a3a50", c2: "#2a2238", wob: 0 });
    c.poly([[0, 150], [120, 112], [280, 128], [280, 200], [0, 200]], { c: "#2a2640", c2: "#1a1830", wob: 0.4 });
    c.brush(2.4, { jitter: 0.08 });
    return c;
}
export function ending(game, s, prof, snd, done) {
    const S = typeof document === "undefined" ? 1 : 2;
    bake(game, "room", paintRoom(S)); bake(game, "dusk", paintDusk());
    game.music(SONGS.home);
    const pages = PAGES(1203 + prof.night);
    let t = 0, page = -1, shown = 0, cam = 480, phase = 0, wait = 2.8, pt = 0, closing = 0, heart = 0, train = -1, trainT = 0, final = 0;
    const L = () => { const v = s.view, port = v.height >= v.width, k = port ? Math.min(v.height / H, v.width / 360) : Math.max(v.height / H, v.width / W), y0 = port ? Math.max(0, (v.height - H * k) * 0.3) : 0; return { port, k, y0, w: v.width, h: v.height, vw: v.width / k }; };
    const next = () => { if (phase === 1) { if (page + 1 < pages.length) { page++; pt = 0; shown = 0; game.sfx({ wave: "noise", freq: 3200, to: 1400, attack: 0.02, decay: 0.09, volume: 0.05 }, { haptic: "tick" }); if (page === 7) { game.haptic([18, 130, 12]); snd.heart(0.4); } } else { phase = 2; final = 0; } } else if (phase === 2 && final > 3) { phase = 3; done(); } };
    game.ends = { next, get phase() { return phase; }, get page() { return page; } };
    s.onUpdate((dt) => {
        t += dt; pt += dt; wait -= dt; shown = Math.min(1, shown + dt * 1.1);
        if (phase === 0 && wait <= 0) { phase = 1; next(); }
        if (phase === 1 && pt > 11) next();
        if (phase === 2) final += dt;
        if (phase >= 0 && page >= 0) { const tg = pages[page][0] - L().vw / 2; cam += (tg - cam) * Math.min(1, dt * 1.1); }
        trainT = (trainT + dt * 0.04) % 1;
        if (s.input.pointer.tapped || s.input.pressed("confirm")) next();
        const c = L(); cam = clamp(cam, 0, W - c.vw);
    });
    s.onDrawUI((d) => {
        const c = L();
        d.rect(c.w + 2, c.h + 2, { x: c.w / 2, y: c.h / 2, color: "#0a0814" });
        d.push(); d.translate(0, c.y0); d.scale(c.k, c.k); d.translate(-cam, 0);
        d.sprite("dusk", { x: 600, y: 165, width: 300, height: 214 });
        // The real train, a string of small lights along the bank, every evening.
        const tx = 482 + (((t * 16) % 420) - 90); for (let i = 0; i < 6; i++) { const x = tx - i * 14; if (x > 484 && x < 716) { d.rect(10, 4, { x, y: 186 - (x - 480) * 0.03, color: "#ffc871" }); } }
        d.sprite("room", { x: W / 2, y: H / 2, width: W, height: H });
        d.additive(() => { const q = 0.9 + Math.sin(t * 2.3) * 0.05; d.sprite("kit:puff", { x: 1110, y: 188, width: 260, height: 230, color: "#ffb060", opacity: 0.4 * q }); });
        if (phase >= 2) { const a = clamp(final * 0.5, 0, 0.9); d.rect(1300, 500, { x: 600, y: 220, color: "#0a0814", opacity: a * 0.7 }); }
        d.pop();
        // A wren, on the sill, if you've met them all.
        if (phase === 0) d.rect(c.w + 2, c.h + 2, { x: c.w / 2, y: c.h / 2, color: "#fff4dc", opacity: clamp(1 - t * 0.5, 0, 1) });
        if (phase === 0) { const a = clamp(Math.min(t - 0.3, 2.6 - t), 0, 1); d.text("Tickets, please.", { x: c.w / 2, y: c.h * 0.46, size: 28, color: "#2a2230", opacity: a, font: HAND }); }
        const band = c.port ? c.h - (c.y0 + H * c.k) : 0, mw = Math.min(c.w - 36, 520);
        if (phase === 1 && page >= 0) {
            const lines = pages[page][1], y0 = c.port ? c.y0 + H * c.k + 20 : c.h - 96;
            if (!c.port) d.rect(c.w + 2, 120, { x: c.w / 2, y: c.h - 62, color: "#0a0814", opacity: 0.74 * shown });
            let y = y0, big = lines.length === 1 && lines[0].length < 28;
            for (const l of lines) { const st = { size: big ? 30 : c.port ? 18 : 17, font: HAND, bold: false, align: "center", maxWidth: mw, lineHeight: 1.26 }, m = game.renderer.measureText(l, st); d.text(l, { x: c.w / 2, y: y + m.height / 2, color: "#f6ead0", opacity: shown, ...st }); y += m.height + 8; }
        }
        if (phase >= 2) {
            const a = clamp(final * 0.5 - 0.3, 0, 1);
            d.text("Last Train Home", { x: c.w / 2, y: c.h * 0.42, size: c.port ? 34 : 40, bold: true, color: "#fff4dc", opacity: a, font: SERIF });
            d.text(prof.wrens.length >= 12 ? "You found every wren. She kept count." : `${prof.wrens.length} of 12 wrens found`, { x: c.w / 2, y: c.h * 0.42 + 46, size: 15, color: "#e8c98a", opacity: a, font: HAND });
            if (final > 3) d.text("Tap for tomorrow evening", { x: c.w / 2, y: c.h * 0.42 + 92, size: 15, color: "#f6ead0", opacity: 0.5 + Math.sin(t * 2) * 0.3, font: SERIF });
        }
    });
}
