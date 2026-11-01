// The title screen and the end of the story.
import { INK } from "./ink.js";
import { Ink } from "./ink.js";
import { BEASTS } from "./data.js";
import { COL, Screen, T, TYPE, btn, panel, Stack } from "./ui.js";
import { beastFlip, beastSprite } from "./sprites.js";
import { fmtTime } from "./menus.js";
import { freshSave } from "./world.js";
import { MUSIC } from "./audio.js";

export function paintLogo(game) {
    if (game.assets.sprites.has("logo")) return;
    game.assets.paint("logo", 900, 420, (p) => {
        const k = new Ink(p, 1); k.lw = 6;
        // Chunky letters from thick strokes on a 3 x 4 grid, so edges stay one solid form.
        const G = { O: [[[0, 0], [2, 0], [2, 4], [0, 4], [0, 0]]], F: [[[2, 0], [0, 0], [0, 4]], [[0, 2], [1.7, 2]]], I: [[[0, 0], [0, 4]]], C: [[[2, 0], [0, 0], [0, 4], [2, 4]]], E: [[[2, 0], [0, 0], [0, 4], [2, 4]], [[0, 2], [1.6, 2]]], Q: [[[0, 0], [2, 0], [2, 4], [0, 4], [0, 0]], [[1.3, 3.2], [2.4, 4.5]]], U: [[[0, 0], [0, 4], [2, 4], [2, 0]]], S: [[[2, 0], [0, 0], [0, 2], [2, 2], [2, 4], [0, 4]]], T: [[[0, 0], [2, 0]], [[1, 0], [1, 4]]] };
        const WID = { I: 0.6 };
        const word = (str, x, y, s, r) => {
            let cx = x;
            for (const ch of str) {
                const segs = [];
                for (const line of G[ch]) for (let i = 0; i + 1 < line.length; i++) segs.push([cx + line[i][0] * s, y + line[i][1] * s, cx + line[i + 1][0] * s, y + line[i + 1][1] * s]);
                const f = (px, py) => { let best = 1e9; for (const [a, b, c, e] of segs) { const ex = c - a, ey = e - b, wx = px - a, wy = py - b, t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey))); best = Math.min(best, Math.max(Math.abs(wx - ex * t), Math.abs(wy - ey * t)) * 0.5 + Math.hypot(wx - ex * t, wy - ey * t) * 0.5); } return best - r; };
                const w = (WID[ch] ?? 2) * s;
                k.sdf(f, cx - r - 4, y - r - 4, cx + w + r + 16, y + 4.6 * s + r + 8, { fill: "#ffe36a", fill2: "#f4a63a", shade: 13, w: 7, lit: true, shadeBy: 0.28 });
                cx += ((ch === "I" ? 0 : 2) * s) + r * 2 + 18;
            }
        };
        word("OFFICE", 42, 34, 34, 15);
        word("QUEST", 118, 228, 34, 16);
        k.sticker(9);
    }, { smooth: true });
}
export function titleScene(game) {
    game.scene("title", (s) => {
        game.touch.enabled = false;
        paintLogo(game);
        const saved = game.load("oq", null), parade = ["stickle", "chompler", "pingling", "vendetta", "bufferfly", "snaglet", "synergoose", "ndaconda", "mugshot", "replyallosaur"];
        parade.forEach((p) => beastFlip(game, p));
        let t = 0, confirm = false, leaving = false;
        const sc = new class extends Screen {
            input(I) { return super.input(I); }
            update(dt, I) {}
            draw(d, V) {
                const land = V.width > V.height;
                d.rect(V.width, V.height, { x: V.width / 2, y: V.height / 2, color: "#2fa6a0" });
                // Ben-Day sky, a tower, and the whole cast.
                const step = 24; for (let y = 0; y < V.height + step; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < V.width + step; x += step) { const r = 2 + 6.5 * (y / V.height); d.circle(r, { x, y, color: "#268f8b" }); }
                const tw = Math.min(V.width * 0.42, 190), tx = V.width / 2, ty = V.height;
                d.rect(tw + 10, V.height * 1.1, { x: tx, y: ty * 0.56 + 40, color: INK, radius: 6 });
                d.rect(tw, V.height * 1.1, { x: tx, y: ty * 0.56 + 40, color: "#d8d2c0", radius: 4 });
                const cols = 5, rows = Math.ceil(V.height / 34);
                for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const lit = Math.sin(r * 12.9 + c * 78.2) > 0.1; d.rect(tw / cols - 8, 22, { x: tx - tw / 2 + (c + 0.5) * tw / cols, y: 84 + r * 34 - (Math.sin(t * 0.2)), color: lit ? (Math.sin(t * 0.7 + r * c) > 0.92 ? "#fff3b0" : "#ffd84d") : "#5a6578" }); }
                const logoW = Math.min(V.width - 24, land ? 400 : 345), logoH = logoW * 420 / 900, ly = land ? V.height * 0.32 : V.height * 0.2;
                d.sprite("logo", { x: V.width / 2 + (land ? -V.width * 0.2 : 0), y: ly + Math.sin(t * 1.4) * 3, width: logoW, height: logoH, rot: -0.03 });
                const lx = land ? V.width * 0.3 : V.width / 2;
                panel(d, lx - 128, ly + logoH / 2 + 6, 256, 26, { fill: COL.white, radius: 4, shadow: 3 });
                this.game = game;
                T(d, game, "A monster-collecting satire of work", lx, ly + logoH / 2 + 19, { align: "center", size: 12.5, bold: true, font: TYPE });
                const n = parade.length, gy = land ? V.height - 56 : V.height * 0.61;
                parade.forEach((p, i) => { const sp = 34, x = ((i * (V.width + 120) / n + t * sp) % (V.width + 120)) - 60, y = gy + (i % 2) * 26 + Math.abs(Math.sin(t * 5 + i)) * -7, sz = land ? 58 : 70; d.sprite(beastFlip(game, p), { x, y, width: sz, height: sz, flipX: true }); });
                const bw = Math.min(V.width - 48, 280), bx = land ? V.width * 0.7 - bw / 2 : (V.width - bw) / 2; let by = land ? V.height * 0.22 : V.height * 0.73;
                const go = (S) => { if (leaving) return; leaving = true; game.data.S = S; game.audioKit.reset(); game.audioKit.play("open"); game.go("office", {}, { fade: 0.35 }); };
                if (confirm) {
                    T(d, game, "Start over? Your old save goes in the shredder.", V.width / 2, by - 14, { align: "center", size: 13, bold: true, color: "#fff" });
                    btn(this, d, game, bx, by, bw, 54, "Yes, new starter", { id: "yes", fill: COL.red, color: "#fff", size: 17, fn: () => go(freshSave()) });
                    btn(this, d, game, bx, by + 64, bw, 46, "No, go back", { id: "no", fn: () => { confirm = false; } });
                    return;
                }
                if (saved) {
                    btn(this, d, game, bx, by, bw, 58, "Clock In", { id: "cont", fill: COL.sticky, size: 20, fn: () => go(saved), draw: (D, x, y) => { T(D, game, "Clock In", x + bw / 2, y + 22, { align: "center", size: 20, bold: true }); T(D, game, `${saved.name || "New Hire"}  ·  ${saved.sigs}/8 signed  ·  ${fmtTime(saved.time)}`, x + bw / 2, y + 43, { align: "center", size: 11.5, bold: true, font: TYPE }); } });
                    btn(this, d, game, bx, by + 68, bw, 44, "New Starter", { id: "new", size: 15, fn: () => { confirm = true; game.audioKit.play("open"); } });
                } else btn(this, d, game, bx, by, bw, 64, "Clock In", { id: "new", fill: COL.sticky, size: 24, fn: () => go(freshSave()) });
            }
        }();
        const stack = new Stack(game); game.stack = stack; stack.push(sc);
        s.onUpdate((dt) => {
            t += dt; const i = s.input;
            stack.update(dt, { pointer: i.pointer, up: i._quiet("up"), down: i._quiet("down"), left: i._quiet("left"), right: i._quiet("right"), confirm: i._quiet("confirm"), cancel: false, held: {} });
            if (i.pointer.pressed) { game.audioKit.music("title"); }
        });
        s.onDrawUI((d) => stack.draw(d));
    });
}
const CAPTIONS = [
    "The Shredder was decommissioned, and is now a planter.",
    "Doug replaced the carpet. It took him until spring.",
    "Cheryl took off her smile and left it on her desk. It's still there.",
    "Neil closed ticket number 12.",
    "Tiff rebranded herself as Tiffany. It tested well.",
    "Gordon Ledger took a lunch. He cried a little. It was a good sandwich.",
    "Sunny stopped smiling for a week. It was the happiest she'd ever been.",
    "Mr. Whereas lost his first case. He was thrilled.",
    "Kenzie runs the Mailroom. She reads everything. She says hello.",
    "Jamothy was given Tray 2. There's a little blanket in it.",
    "And Margaret Amalgam went to Lake Wobble for two weeks.",
    "This time, she left a note.",
];
export function endingScene(game) {
    game.scene("ending", (s) => {
        game.touch.enabled = false;
        const S = game.data.S ?? freshSave();
        const list = Object.keys(S.caught ?? {}); list.forEach((p) => beastFlip(game, p));
        game.audioKit.reset(); game.audioKit.music("ending"); S.flags.credits = 1; game.save("oq", S);
        let t = 0, line = 0, page = 0, out = false; const each = 3.6;
        s.onUpdate((dt) => {
            t += dt * (game.botSpeed ?? 1); const p = s.input.pointer;
            line = Math.floor(t / each);
            if ((p.tapped || s.input._quiet("confirm"))) { if (line < CAPTIONS.length) t = (line + 1) * each; else if (t > CAPTIONS.length * each + 1 && !out) { out = true; S.floor = "B1"; S.x = 11; S.y = 9; game.save("oq", S); game.go("office", {}, { fade: 0.5 }); } }
        });
        s.onDrawUI((d) => {
            const V = game.view, done = line >= CAPTIONS.length;
            d.rect(V.width, V.height, { x: V.width / 2, y: V.height / 2, color: done ? "#ffd84d" : "#2fa6a0" });
            const n = Math.max(1, list.length), gap = Math.max(64, (V.width + 80) / Math.min(n, 12));
            list.forEach((p, i) => { const x = ((i * gap + t * 46) % Math.max(V.width + 80, n * gap)) - 50, y = V.height * 0.56 + (i % 3) * 34 + Math.abs(Math.sin(t * 4 + i)) * -10; d.sprite(beastFlip(game, p), { x, y, width: 76, height: 76, flipX: true }); });
            if (!done) {
                const k = (t % each) / each, a = Math.min(1, k * 6, (1 - k) * 6);
                panel(d, 20, V.height * 0.16, V.width - 40, 104, { fill: COL.paper, radius: 6, opacity: a });
                T(d, game, CAPTIONS[line], V.width / 2, V.height * 0.16 + 22, { align: "center", size: 17, bold: true, maxWidth: V.width - 76, opacity: a });
            } else {
                panel(d, 18, 24, V.width - 36, 186, { fill: COL.paper, radius: 6 });
                T(d, game, "PROBATION PASSED", V.width / 2, 50, { align: "center", size: 20, bold: true, font: TYPE });
                T(d, game, S.name || "New Hire", V.width / 2, 86, { align: "center", size: 30, bold: true, color: COL.red });
                T(d, game, `Time served: ${fmtTime(S.time)}`, V.width / 2, 122, { align: "center", size: 14, bold: true, font: TYPE });
                T(d, game, `Deskmates hired: ${list.length} of ${Object.keys(BEASTS).length}`, V.width / 2, 142, { align: "center", size: 14, bold: true, font: TYPE });
                T(d, game, "Tap to clock back in. There's more on the roof.", V.width / 2, 172, { align: "center", size: 13, bold: true, color: "#6b6f7e", maxWidth: V.width - 60 });
            }
        });
    });
}
