// The postmistress's journal: letters kept, stamps found, planes folded, flights to take, and the settings.
import { button, pin, ui } from "./pogo.js";
import { CHAPTERS, LETTERS, PEOPLE, PLANES, TIMES, TRIALS } from "./data.js";
import { ALL_STAMPS, faceFrame } from "./art.js";
import { CORAL, CREAM, HAND, INK, SERIF, paperBtn } from "./hud.js";

const short = (id) => PEOPLE[id].name.replace("Old ", "").split(" ")[0];
const TABS = [["letters", "Letters"], ["stamps", "Stamps"], ["folds", "Folds"], ["fly", "Fly"], ["set", "Settings"]];

export function registerBook(game) {
    game.scene("book", (s, a = {}) => {
        game.touch.enabled = false;
        const P = game.progress, O = game.opts, lastCh = P.done.length ? LETTERS.find((l) => l.id === P.done[P.done.length - 1])?.ch ?? 0 : 0, B = { tab: a.tab ?? "letters", page: lastCh, open: null, btns: [], from: a.from ?? "title", pick: 1 };
        s.background = "#efe0c4";
        game.snd.music("title");
        const clear = () => { for (const b of B.btns) b.destroy(); B.btns = []; };
        const add = (label, x, y, w, onTap, o = {}) => { const e = s.add([paperBtn(label, { width: w, height: o.height ?? 44, size: o.size ?? 15, color: o.color, ink: o.ink, onTap: () => { game.snd.fx("page"); onTap(); } }), ui(), { layer: 10 }]); e.pos.x = x; e.pos.y = y; B.btns.push(e); return e; };
        const back = () => { if (B.from === "title") return game.go("fly", { mode: "title" }, { fade: 0.25 }); game.go("fly", { mode: B.from === "story" ? "story" : "title" }, { fade: 0.25 }); };
        const rebuild = () => {
            clear();
            const W = s.view.width, H = s.view.height, S = game.view.safe, top = S.top + 8, wide = W > H, tw = Math.min(70, (W - 16 - (wide ? 90 : 0)) / 5);
            TABS.forEach(([id, lab], i) => add(lab, (wide ? 12 : 8) + tw * (i + 0.5) + S.left, top + 24, tw - 3, () => { B.tab = id; B.open = null; rebuild(); }, { height: 50, size: 12, color: B.tab === id ? "#d9593f" : "#fbf1dc", ink: B.tab === id ? "#fff6e6" : INK }));
            if (wide) add("Back", W - S.right - 50, top + 24, 84, back, { height: 50 });
            else add("Back to the sky", W / 2, H - S.bottom - 30, 190, back, { height: 44 });
            const y0 = top + 62, yMax = wide ? H - S.bottom - 10 : H - S.bottom - 60;
            B.area = { x: S.left + 10, y: y0, w: W - S.left - S.right - 20, h: yMax - y0 };
            const A = B.area;
            if (B.tab === "letters") {
                if (B.open) { add("Back to the letters", W / 2, A.y + A.h - 22, 180, () => { B.open = null; rebuild(); }); return; }
                const ch = B.page, list = LETTERS.filter((l) => l.ch === ch), ids = P.done;
                add("<", A.x + 24, A.y + 22, 44, () => { B.page = (B.page + 3) % 4; rebuild(); }); add(">", A.x + A.w - 24, A.y + 22, 44, () => { B.page = (B.page + 1) % 4; rebuild(); });
                const cols = wide ? 2 : 1, rh = Math.min(46, (A.h - 50) / Math.ceil(list.length / cols)), cw = A.w / cols;
                list.forEach((l, i) => { if (!ids.includes(l.id)) return; const c = i % cols, r = Math.floor(i / cols); add(`${short(l.from)} to ${short(l.to)}`, A.x + cw * (c + 0.5), A.y + 72 + r * rh, cw - 8, () => { B.open = l; rebuild(); }, { height: rh - 6, size: 14 }); });
            } else if (B.tab === "folds") {
                const list = PLANES, n = list.length, rh = Math.min(72, A.h / n), cols = wide ? 2 : 1, cw = A.w / cols;
                list.forEach((c, i) => {
                    const have = P.planes.includes(c.id), r = Math.floor(i / cols), col = i % cols;
                    const e = add(have ? (P.plane === c.id ? "Flying" : "Fly this") : "Unfolded", A.x + cw * (col + 1) - 48, A.y + (wide ? Math.min(92, A.h / 3) : rh) * (r + 0.5), 86, () => { if (!have) return; P.plane = c.id; game.persist(); rebuild(); }, { height: 50, size: 13, color: P.plane === c.id ? "#d9593f" : have ? "#fbf1dc" : "#e0d3ba", ink: P.plane === c.id ? "#fff6e6" : have ? INK : "#9a8c7c" });
                });
            } else if (B.tab === "fly") {
                const tn = ["Morning", "Noon", "Golden Hour", "Night"], bw = (A.w - 6) / (wide ? 4 : 2), rows = wide ? 1 : 2;
                tn.forEach((n, i) => { const c = wide ? i : i % 2, r = wide ? 0 : i >> 1; add(n, A.x + bw * (c + 0.5) + 3, A.y + 46 + r * 48, bw - 6, () => game.go("fly", { mode: "free", time: i }, { fade: 0.35 }), { size: 15 }); });
                const yt = A.y + 46 + rows * 48 + 42;
                TRIALS.forEach((t, i) => {
                    const open = P.ch >= t.unlock || P.finished, y = yt + i * Math.min(52, (A.y + A.h - yt) / 3);
                    add(open ? t.name : "Locked", A.x + 100, y, 196, () => { if (open) game.go("fly", { mode: "trial", trial: t.id }, { fade: 0.35 }); }, { color: open ? "#fbf1dc" : "#e0d3ba", ink: open ? INK : "#9a8c7c", size: 14 });
                });
            } else if (B.tab === "set") {
                const row = (lab, key, y) => add(`${lab}: ${O[key] ? "On" : "Off"}`, W / 2, y, Math.min(A.w, 280), () => { O[key] = !O[key]; game.persist(); game.snd.apply(); if (key === "sound" && O.sound) game.snd.music("title"); rebuild(); }, { color: O[key] ? "#fbf1dc" : "#e0d3ba" });
                const g = Math.min(52, A.h / 6), y1 = A.y + 26;
                row("Sound", "sound", y1); row("Haptics", "haptics", y1 + g); row("Comfort flight", "comfort", y1 + g * 2); row("Invert pitch", "invert", y1 + g * 3);
                add(B.sure ? "Sure? This forgets everything" : "Start the post again", W / 2, y1 + g * 4.1, Math.min(A.w, 280), () => { if (!B.sure) { B.sure = true; return rebuild(); } game.wipe(); game.go("fly", { mode: "title" }, { fade: 0.3 }); }, { color: "#f6dcc8", ink: CORAL });
            }
        };
        rebuild();
        s.on("resize", rebuild);
        s.onDraw((d) => {
            // A page of the journal: ruled, with a red margin and the stitched spine.
            const W = s.view.width, H = s.view.height;
            for (let y = 96; y < H; y += 28) d.line([0, y], [W, y], { width: 1, color: "#b9a888", opacity: 0.35 });
            d.line([26, 0], [26, H], { width: 1.5, color: "#d9593f", opacity: 0.35 });
            for (let y = 10; y < H; y += 26) d.line([7, y], [7, y + 14], { width: 2, color: "#a98a68", opacity: 0.5 });
        });
        s.onDrawUI((d) => {
            const A = B.area, W = s.view.width, H = s.view.height; if (!A) return;
            if (B.tab === "letters") {
                if (B.open) {
                    const l = B.open, cw = Math.min(A.w, 344), ch = Math.min(A.h - 54, 400), cy = A.y + ch / 2;
                    d.sprite("card", { x: W / 2, y: cy, width: cw, height: ch });
                    d.text(`To ${PEOPLE[l.to].name}`, { x: W / 2, y: cy - ch / 2 + 26, size: 14, color: "#8a7a70", font: SERIF });
                    d.text(l.text, { x: W / 2, y: cy - 24, size: 16, color: INK, font: SERIF, maxWidth: cw - 40, align: "left", lineHeight: 1.4 });
                    d.text(PEOPLE[l.from].name, { x: W / 2, y: cy + ch / 2 - 30, size: 22, color: CORAL, font: HAND });
                    return;
                }
                const c = CHAPTERS[B.page], has = LETTERS.some((l) => l.ch === B.page && P.done.includes(l.id));
                d.text(c.title, { x: W / 2, y: A.y + 22, size: 20, bold: true, color: INK, font: SERIF });
                if (!has) d.text("Nothing kept here yet.", { x: W / 2, y: A.y + 90, size: 16, color: "#8a7a70", font: SERIF });
            } else if (B.tab === "stamps") {
                const n = ALL_STAMPS.length, cols = W > H ? 10 : 5, rows = Math.ceil(n / cols), cw = A.w / cols, rh = Math.min((A.h - 24) / rows, cw * 1.26), sw = Math.min(cw - 6, (rh - 4) / 1.22), sh = sw * 1.22;
                const got = ALL_STAMPS.filter((q) => P.stamps.includes(q.id)).length;
                d.text(`${got} of ${n} stamps`, { x: W / 2, y: A.y + 10, size: 16, bold: true, color: INK, font: SERIF });
                ALL_STAMPS.forEach((q, i) => {
                    const x = A.x + cw * (i % cols + 0.5), y = A.y + 26 + rh * (Math.floor(i / cols) + 0.5), h = P.stamps.includes(q.id);
                    if (h) { d.rect(sw, sh, { x: x + 1.5, y: y + 2, color: "#000000", opacity: 0.16, radius: 2 }); d.sprite("stamps", { frame: i, x, y, width: sw, height: sh }); }
                    else { d.rect(sw, sh, { x, y, color: "#e0d0b2", radius: 3 }); d.rect(sw, sh, { x, y, color: "#c8b898", outline: 1, radius: 3 }); d.text("?", { x, y, size: 20, color: "#b5a488", font: SERIF, bold: true }); }
                });
                const sel = ALL_STAMPS.find((q) => !P.stamps.includes(q.id));
                if (sel) d.text(`Next: ${sel.hint}`, { x: W / 2, y: A.y + A.h - 2, size: 12.5, color: "#7a6a60", font: SERIF, maxWidth: A.w });
            } else if (B.tab === "folds") {
                const n = PLANES.length, wide = W > H, cols = wide ? 2 : 1, cw = A.w / cols, rh = wide ? Math.min(92, A.h / 3) : Math.min(70, A.h / n);
                PLANES.forEach((c, i) => {
                    const r = Math.floor(i / cols), col = i % cols, x = A.x + 8 + cw * col, y = A.y + rh * (r + 0.5), have = P.planes.includes(c.id);
                    d.text(have ? c.name : "An unmade fold", { x: x + (cw - 104) / 2, y: y - 11, size: 15.5, bold: true, color: have ? INK : "#9a8c7c", font: SERIF, maxWidth: cw - 104 });
                    if (have) d.text(c.blurb, { x: x + (cw - 104) / 2, y: y + 11, size: 12, color: "#7a6a60", font: SERIF, maxWidth: cw - 108 });
                });
            } else if (B.tab === "fly") {
                d.text("Free flight: no letters, no crumples", { x: W / 2, y: A.y + 10, size: 14, bold: true, color: INK, font: SERIF });
                const rows = W > H ? 1 : 2, yt = A.y + 46 + rows * 48 + 42;
                d.text("Time trials", { x: A.x + 40, y: yt - 34, size: 14, bold: true, color: INK, font: SERIF });
                TRIALS.forEach((t, i) => {
                    const y = yt + i * Math.min(52, (A.y + A.h - yt) / 3), b = P.best[t.id], open = P.ch >= t.unlock || P.finished;
                    d.text(open ? (b ? `${b.toFixed(1)}s` : `Gold ${t.times[0]}s`) : `After chapter ${t.unlock}`, { x: A.x + 200 + (A.w - 200) / 2, y, size: 14, color: b && b <= t.times[0] ? CORAL : "#7a6a60", font: SERIF, bold: !!(b && b <= t.times[0]) });
                });
            } else if (B.tab === "set") {
                const g = Math.min(52, A.h / 6);
                d.text("Comfort keeps the horizon level, holds a safe glide and never stalls.", { x: W / 2, y: A.y + 26 + g * 5, size: 13, color: "#7a6a60", font: SERIF, maxWidth: Math.min(A.w, 300) });
            }
        });
    });
}
