// Everything around the holes: title, island map, cups, pass-the-phone, the locker.
import { mesh, pos, rot, ui } from "./pogo.js";
import { HOLES, ISLANDS } from "./holes.js";
import { SKINS } from "./models.js";
import { Sim } from "./sim.js";
import { Stage } from "./stage.js";
import { LOOK } from "./look.js";
import { CUPS, PLAYER_COLS, RIVALS, holeOpen, islandHoles, islandOpen, loadSave, nextHole, ownedSkins, shellCount, stats, store, toPar } from "./data.js";
import { CREAM, FONT, INK, clamp, fatButton, panel, screen, sticker } from "./ui.js";
import { Round, courseFor } from "./play.js";

const easeBack = (t) => { const c = 1.9; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; };

/** A live hole turning behind a menu. */
function diorama(game, s, n, o = {}) {
    const c = courseFor(n), sim = new Sim(c), st = new Stage(game, s, c, sim, { volc: o.volc });
    let a = o.a ?? 0.6;
    const cx = (c.span.x0 + c.span.x1) / 2, cz = (c.span.z0 + c.span.z1) / 2, r = o.r ?? Math.max(c.span.x1 - c.span.x0, c.span.z1 - c.span.z0) * 0.72 + 6, h = c.cup_.y + (o.h ?? r * 0.55);
    s.cam3.fov = 46;
    const place = () => { s.cam3.pos.set(cx + Math.sin(a) * r, h, cz + Math.cos(a) * r); s.cam3.target.set(cx, c.cup_.y + (o.lift ?? -1), cz); };
    place(); s.cam3.cut?.();
    const a0 = a;
    s.onUpdate((dt) => { for (let i = 0; i < 4; i++) sim.step(); st.update(dt); a = a0 + Math.sin(s.time * 0.12) * 0.16; place(); });
    return st;
}
const baseRun = (mode, order, i = 0) => ({ mode, order, i, p: 0, players: [] });
const you = (game) => ({ name: "You", col: PLAYER_COLS[0], skin: game.data.save.skin, scores: [] });

function tourHole(game, n) {
    const run = baseRun("tour", islandHoles(HOLES[n].island), islandHoles(HOLES[n].island).indexOf(n));
    run.players = [you(game)];
    game.data.run = run;
    game.go("play", {}, { fade: 0.25 });
}

function Title(game, s) {
    const save = loadSave(game), snd = game.snd;
    game.touch.enabled = false;
    diorama(game, s, 8, { a: 0.62, r: 31, h: 8.5, volc: [-24, -72] });
    snd.play("menu");
    const firstTime = save.done === 0;
    const start = () => { snd.click(); tourHole(game, nextHole(save)); };
    const cols = (add, list, x, y, w, gap = 58) => list.forEach((b, i) => add(fatButton(b[0], { w, h: 50, size: 15, color: b[1], dark: b[2], onTap: () => { snd.click(); game.go(b[3], b[4] ?? {}, { fade: 0.2 }); } }), pos(x, y + i * gap), ui()));
    screen(s, (add, v) => {
        const portrait = v.height > v.width, cx = v.width / 2, y = v.height - v.safe.bottom - 40;
        const more = [["Map", "#3fd7cf", "#1f9c98", "hub", { island: HOLES[nextHole(save)].island }], ["Cups", "#ff8f7f", "#c44b3e", "cups"], ["Balls", "#c7a6ff", "#7f5fc4", "locker"]];
        if (portrait) {
            add(fatButton("PLAY", { w: 230, h: 68, size: 30, onTap: start, action: "confirm", pulse: true, radius: 22 }), pos(cx, firstTime ? y - 72 : y - 128), ui());
            if (firstTime) add(fatButton("Pass & Play", { w: 170, h: 50, size: 14, color: CREAM, dark: "#cdbb9d", onTap: () => { snd.click(); game.go("party", {}, { fade: 0.2 }); } }), pos(cx, y), ui());
            else {
                const w = Math.min(106, (v.width - 40) / 3);
                more.forEach((b, i) => add(fatButton(b[0], { w, h: 50, size: 15, color: b[1], dark: b[2], onTap: () => { snd.click(); game.go(b[3], b[4] ?? {}, { fade: 0.2 }); } }), pos(cx + (i - 1) * (w + 8), y - 58), ui()));
                add(fatButton("Pass & Play", { w: w * 3 + 16, h: 50, size: 14, color: CREAM, dark: "#cdbb9d", onTap: () => { snd.click(); game.go("party", {}, { fade: 0.2 }); } }), pos(cx, y), ui());
            }
        } else {
            const x = v.width * 0.77, w = Math.min(210, v.width * 0.3);
            add(fatButton("PLAY", { w, h: 66, size: 28, onTap: start, action: "confirm", pulse: true, radius: 22 }), pos(x, firstTime ? v.height * 0.5 : v.safe.top + 56), ui());
            if (firstTime) add(fatButton("Pass & Play", { w: w * 0.8, h: 50, size: 14, color: CREAM, dark: "#cdbb9d", onTap: () => { snd.click(); game.go("party", {}, { fade: 0.2 }); } }), pos(x, v.height * 0.5 + 66), ui());
            else cols(add, [...more, ["Pass & Play", CREAM, "#cdbb9d", "party"]], x, v.safe.top + 124, w * 0.85, 56);
        }
    });
    s.onDrawUI((d) => {
        const v = s.view, wide = v.width > v.height, sz = wide ? Math.min(v.height / 5.4, v.width / 11) : Math.min(v.width / 6.7, v.height / 7.4, 66), cx = wide ? v.width * 0.3 : v.width / 2, top = wide ? v.height * 0.17 + v.safe.top * 0.4 : v.safe.top + sz * 1.05, t = s.time;
        const line = (str, y, size, col, delay) => {
            const e = easeBack(clamp((t - delay) / 0.45, 0, 1));
            sticker(d, str, cx, y - (1 - e) * 200, size, col, "#3a0f2e", { rot: Math.sin(t * 1.4 + delay * 9) * 0.015, w: 0.1 });
        };
        line("CRAZY", top, sz * 0.86, "#ffe36b", 0);
        line("PUTT", top + sz * 0.98, sz * 1.5, "#ffffff", 0.08);
        line("VOLCANO", top + sz * 2.12, sz * 1.02, "#ff7a3c", 0.16);
        if (t > 0.7) sticker(d, "Pull. Let go. Try not to get eaten.", cx, top + sz * 2.92, Math.min(15, v.width / 26), CREAM, INK);
    });
}

function Hub(game, s, args) {
    const save = loadSave(game), snd = game.snd;
    game.touch.enabled = false;
    let isl = args?.island ?? 0;
    if (!islandOpen(save, isl)) isl = 0;
    const list = islandHoles(isl), L = LOOK[isl];
    diorama(game, s, list[4], { a: 1, r: 30, h: 16 });
    snd.play("menu");
    screen(s, (add, v) => {
        const top = v.safe.top + 12, cx = v.width / 2;
        add(fatButton("Back", { w: 76, h: 50, size: 15, color: CREAM, dark: "#cdbb9d", action: "pause", onTap: () => { snd.click(); game.go("title", {}, { fade: 0.2 }); } }), pos(v.safe.left + 50, top + 24), ui());
        const tabW = Math.min(94, (v.width - 110) / 3);
        ISLANDS.forEach((I, i) => {
            const open = islandOpen(save, i);
            add(fatButton(I.name, { w: tabW, h: 50, size: 11.5, label: () => I.name.split(" ").slice(-1)[0], color: i === isl ? "#ffc53d" : open ? CREAM : "#7d8aa0", dark: open ? "#cdbb9d" : "#566", on: true, onTap: () => { if (open && i !== isl) { snd.click(); game.go("hub", { island: i }, { fade: 0.15 }); } else if (!open) game.haptic("error"); } }), pos(v.width - v.safe.right - 10 - tabW / 2 - (2 - i) * (tabW + 6), top + 24), ui());
        });
        const portrait = v.height > v.width, cols = portrait ? 3 : 9, rowsY = portrait ? v.height * 0.42 : v.height * 0.62, cw = Math.min((v.width - 30) / cols, portrait ? 110 : 66), ch = portrait ? 92 : 80;
        list.forEach((n, i) => {
            const c = i % cols, r = Math.floor(i / cols), x = cx + (c - (cols - 1) / 2) * cw, y = rowsY + r * ch, open = holeOpen(save, n), best = save.best[n], par = HOLES[n].par, shell = save.shellsFound[n];
            const col = best === undefined ? (open ? "#ffc53d" : "#7d8aa0") : best === 1 ? "#ff5fa2" : best < par ? "#7dffa0" : best === par ? "#bfeeff" : CREAM;
            add(fatButton(`${i + 1}`, { w: cw - 12, h: ch - 16, size: 26, color: col, dark: open ? "#b98a3d" : "#566", on: true, radius: 16, sub: best === undefined ? (open ? `par ${par}` : "locked") : `${best} of ${par}${shell ? " +" : ""}`, onTap: () => { if (open) { snd.click(); tourHole(game, n); } else game.haptic("error"); } }), pos(x, y), ui());
        });
    });
    s.onDrawUI((d) => {
        const v = s.view, y = v.height > v.width ? v.height * 0.26 : v.height * 0.32;
        sticker(d, ISLANDS[isl].name, v.width / 2, y, Math.min(32, v.width / 11), L.gold, INK);
        sticker(d, ISLANDS[isl].tag, v.width / 2, y + 30, 14, CREAM, INK);
        let total = 0, pars = 0; for (const n of list) if (save.best[n] !== undefined) { total += save.best[n]; pars += HOLES[n].par; }
        sticker(d, `Card ${toPar(total - pars)}   Shells ${shellCount(save)}/27   Aces ${save.aces}`, v.width / 2, y + 56, 13, "#ffffff", INK);
    });
}

function Cups(game, s) {
    const save = loadSave(game), snd = game.snd;
    game.touch.enabled = false;
    diorama(game, s, 17, { a: 4, r: 30, h: 14 });
    screen(s, (add, v) => {
        const cx = v.width / 2;
        add(fatButton("Back", { w: 76, h: 50, size: 15, color: CREAM, dark: "#cdbb9d", action: "pause", onTap: () => { snd.click(); game.go("title", {}, { fade: 0.2 }); } }), pos(v.safe.left + 50, v.safe.top + 36), ui());
        const wide = v.width > v.height, bw = Math.min(wide ? (v.width - 60) / 2 : v.width - 40, 330);
        CUPS.forEach((c, i) => {
            const open = i === 3 ? save.islandDone.every(Boolean) : islandOpen(save, c.island), best = save.cupBest[c.id];
            const x = wide ? cx + ((i % 2) - 0.5) * (bw + 14) : cx, y = wide ? v.safe.top + 138 + (i >> 1) * 86 : Math.max(v.height * 0.27, v.safe.top + 138) + i * 80;
            add(fatButton(c.name, { w: bw, h: 68, size: 17, color: best === 1 ? "#ffd86b" : open ? CREAM : "#7d8aa0", dark: open ? "#cdbb9d" : "#566", on: true, sub: open ? `${c.blurb}${best ? `   Best: ${["1st", "2nd", "3rd"][best - 1] ?? `${best}th`}` : ""}` : "Locked: open the island first", onTap: () => {
                if (!open) { game.haptic("error"); return; }
                snd.click();
                const r = game.rng, field = [...RIVALS].sort(() => r.range(-1, 1)).slice(0, 3).map((q) => ({ name: q.name, col: q.col, form: q.form, rival: true, scores: [] }));
                const run = baseRun("cup", c.holes); run.cup = c; run.rivals = field; run.players = [you(game)]; game.data.run = run;
                game.go("play", {}, { fade: 0.25 });
            } }), pos(x, y), ui());
        });
    });
    s.onDrawUI((d) => { const v = s.view; sticker(d, "VOLCANO CUPS", v.width / 2, v.safe.top + (v.width > v.height ? 36 : 92), Math.min(32, v.width / 11), "#ffc53d", INK); });
}

function Party(game, s) {
    const save = loadSave(game), snd = game.snd;
    game.touch.enabled = false;
    diorama(game, s, 4, { a: 2, r: 26, h: 12 });
    const names = ["Player 1", "Player 2", "Player 3", "Player 4"], owned = ownedSkins(save);
    const st = game.data.partySetup ?? (game.data.partySetup = { count: 2, course: 0, skins: [0, 1 % owned.length, 2 % owned.length, 3 % owned.length] });
    const COURSES = [{ name: "Quick three", holes: [0, 3, 4] }, ...ISLANDS.map((I, i) => ({ name: I.name, holes: islandHoles(i), need: i }))];
    const redo = screen(s, (add, v) => {
        const cx = v.width / 2;
        add(fatButton("Back", { w: 76, h: 50, size: 15, color: CREAM, dark: "#cdbb9d", action: "pause", onTap: () => { snd.click(); game.go("title", {}, { fade: 0.2 }); } }), pos(v.safe.left + 50, v.safe.top + 36), ui());
        const wide = v.width > v.height, y0 = wide ? v.safe.top + 92 : v.height * 0.26, w = Math.min(70, (v.width - 60) / 3), colA = wide ? v.width * 0.27 : cx, colB = wide ? v.width * 0.7 : cx, pw = Math.min(wide ? 270 : 280, v.width - 50);
        [2, 3, 4].forEach((n, i) => add(fatButton(`${n}`, { w, h: 52, size: 24, color: st.count === n ? "#ffc53d" : CREAM, dark: "#cdbb9d", onTap: () => { st.count = n; snd.click(); redo(); } }), pos(colA + (i - 1) * (w + 12), y0), ui()));
        add(fatButton("Course", { w: pw, h: 50, size: 16, color: "#3fd7cf", dark: "#1f9c98", label: () => COURSES[st.course].name, onTap: () => { let k = st.course; do { k = (k + 1) % COURSES.length; } while (COURSES[k].need !== undefined && !islandOpen(save, COURSES[k].need)); st.course = k; snd.click(); } }), pos(colA, y0 + 68), ui());
        for (let i = 0; i < st.count; i++) {
            const y = wide ? y0 - 14 + i * 56 : y0 + 134 + i * 56;
            add(fatButton(names[i], { w: pw, h: 50, size: 15, color: PLAYER_COLS[i], dark: "#8a7a5a", label: () => `${names[i]}: ${owned[st.skins[i] % owned.length].name}`, onTap: () => { st.skins[i] = (st.skins[i] + 1) % owned.length; snd.click(); } }), pos(colB, y), ui());
        }
        add(fatButton("Tee off", { w: 220, h: 58, size: 22, action: "confirm", pulse: true, onTap: () => {
            snd.click();
            const run = baseRun("party", COURSES[st.course].holes);
            run.players = Array.from({ length: st.count }, (_, i) => ({ name: names[i], col: PLAYER_COLS[i], skin: owned[st.skins[i] % owned.length].id, scores: [] }));
            game.data.run = run; game.go("pass", {}, { fade: 0.2 });
        } }), pos(wide ? colA : cx, v.height - v.safe.bottom - (wide ? 40 : 48)), ui());
    });
    s.onDrawUI((d) => { const v = s.view; const wide = v.width > v.height; sticker(d, "PASS & PLAY", v.width / 2, v.safe.top + (wide ? 34 : 88), Math.min(30, v.width / 11), "#ffc53d", INK); if (!wide) sticker(d, "How many players?", v.width / 2, v.height * 0.26 - 42, 14, CREAM, INK); });
}

/** The hand-off screen: nothing happens until the next player takes the phone and taps. */
function Pass(game, s) {
    const run = game.data.run, snd = game.snd, p = run.players[run.p];
    game.touch.enabled = false;
    s.background = [p.col, "#14304f"];
    snd.pass();
    screen(s, (add, v) => { add(fatButton(`I'm ${p.name}`, { w: 240, h: 66, size: 22, pulse: true, action: "confirm", onTap: () => { snd.click(); game.go("play", {}, { fade: 0.2 }); } }), pos(v.width / 2, v.height * 0.66), ui()); });
    s.onDrawUI((d) => {
        const v = s.view, e = easeBack(clamp(s.time / 0.4, 0, 1));
        sticker(d, "PASS THE PHONE", v.width / 2, v.height * 0.26, Math.min(36, v.width / 10) * e, "#fff", INK);
        sticker(d, p.name, v.width / 2, v.height * 0.38, Math.min(48, v.width / 7) * e, p.col, INK);
        const n = run.order[run.i];
        sticker(d, `Hole ${run.i + 1}: ${HOLES[n].name}`, v.width / 2, v.height * 0.48, 17, CREAM, INK);
        sticker(d, `Par ${HOLES[n].par}`, v.width / 2, v.height * 0.53, 15, CREAM, INK);
    });
}

function Final(game, s) {
    const run = game.data.run, save = loadSave(game), snd = game.snd;
    game.touch.enabled = false;
    diorama(game, s, run.order[run.order.length - 1], { a: 0.5, r: 24, h: 12 });
    const list = [...run.players, ...(run.rivals ?? [])].map((p) => { let st = 0, par = 0; run.order.forEach((n, i) => { st += p.scores[i] ?? HOLES[n].par + 2; par += HOLES[n].par; }); return { p, st, d: st - par }; }).sort((a, b) => a.st - b.st);
    const place = list.findIndex((r) => !r.p.rival) + 1, won = list[0].p.rival ? false : true, title = run.cup ? (won ? "CHAMPION!" : place === 2 ? "So close!" : "Next time!") : `${list[0].p.name} wins!`;
    if (run.cup) {
        const prev = save.cupBest[run.cup.id];
        if (!prev || place < prev) save.cupBest[run.cup.id] = place;
        if (won) save.cups++;
        store(game);
    }
    const fresh = [];
    for (const k of ownedSkins(save)) if (!save.owned.includes(k.id)) { save.owned.push(k.id); fresh.push(k); }
    store(game);
    snd.fanfare();
    game.haptic("success");
    const conf = [];
    for (let i = 0; i < 70; i++) conf.push({ x: game.fxRng.range(0, 1), y: -game.fxRng.range(0, 1.4), c: game.fxRng.pick(["#ffc53d", "#ff5fa2", "#3fd7ff", "#7ddc5a", "#fff6e6"]), v: game.fxRng.range(0.12, 0.3), p: game.fxRng.range(0, 6), w: game.fxRng.range(5, 10) });
    screen(s, (add, v) => { add(fatButton("Carry on", { w: 220, h: 58, size: 20, pulse: true, action: "confirm", onTap: () => { snd.click(); game.go("title", {}, { fade: 0.25 }); } }), pos(v.width / 2, v.height - v.safe.bottom - 48), ui()); });
    s.onDrawUI((d) => {
        const v = s.view, t = s.time, e = easeBack(clamp(t / 0.4, 0, 1));
        for (const c of conf) { c.y += c.v / 60; if (c.y > 1.05 && (won || !run.cup)) c.y = -0.05; d.rect(c.w, c.w * 0.6 * Math.abs(Math.sin(t * 4 + c.p)) + 2, { x: c.x * v.width + Math.sin(t * 2 + c.p) * 20, y: c.y * v.height, color: c.c }); }
        sticker(d, title, v.width / 2, v.height * (v.width > v.height ? 0.14 : 0.17), Math.min(46, v.width / 8) * e, "#ffd23f", INK);
        const w = Math.min(v.width - 30, 340), wide = v.width > v.height, h = list.length * (wide ? 34 : 40) + 24, cx = v.width / 2, cy = (wide ? v.height * 0.27 : v.height * 0.25) + h / 2 + 14, rh = wide ? 34 : 40;
        panel(d, cx, cy, w, h);
        list.forEach((r, i) => {
            const y = cy - h / 2 + 12 + rh / 2 + i * rh, me = !r.p.rival;
            d.rect(w - 24, rh - 6, { x: cx, y, color: i === 0 ? "#ffe9b0" : "#f4e6cc", radius: 10 });
            d.circle(9, { x: cx - w / 2 + 32, y, color: r.p.col });
            d.text(`${i + 1}. ${r.p.name}`, { x: cx - 18, y, size: 15, bold: true, font: FONT, color: INK });
            d.text(`${r.st}  (${toPar(r.d)})`, { x: cx + w / 2 - 56, y, size: 14, bold: true, font: FONT, color: INK });
        });
        if (fresh.length) sticker(d, `New ball: ${fresh[0].name}`, cx, cy + h / 2 + 20, 16, "#ffc7e2", INK);
    });
}

function Locker(game, s) {
    const save = loadSave(game), snd = game.snd;
    game.touch.enabled = false;
    diorama(game, s, 0, { a: 1.2, r: 18, h: 8 });
    const st = stats(save), cam = s.cam3;
    const show = { k: SKINS.find((k) => k.id === save.skin) ?? SKINS[0] };
    const redo = screen(s, (add, v) => {
        add(fatButton("Back", { w: 76, h: 50, size: 15, color: CREAM, dark: "#cdbb9d", action: "pause", onTap: () => { snd.click(); game.go("title", {}, { fade: 0.2 }); } }), pos(v.safe.left + 50, v.safe.top + 36), ui());
        const wide = v.width > v.height, cols = wide ? 7 : 4, cw = Math.min((v.width - 24) / cols, 86), x0 = v.width / 2 - (cols - 1) * cw / 2, y0 = wide ? v.height * 0.46 : v.height * 0.36, ch = 72;
        SKINS.forEach((k, i) => {
            const ownedNow = k.test(st), x = x0 + (i % cols) * cw, y = y0 + Math.floor(i / cols) * ch;
            add(fatButton(k.name, { w: cw - 8, h: 62, size: 10.5, label: () => (ownedNow ? "" : "?"), color: save.skin === k.id ? "#ffc53d" : ownedNow ? CREAM : "#7d8aa0", dark: "#8a7a5a", on: true, icon: ownedNow ? (d, off) => { d.circle(19, { y: off, color: INK }); d.circle(17, { y: off, color: k.a }); d.circle(8, { x: 5, y: off + 3, color: k.b }); d.circle(5, { x: -6, y: off - 7, color: "#ffffff", opacity: 0.7 }); } : null, onTap: () => { show.k = k; snd.click(); if (ownedNow) { save.skin = k.id; store(game); redo(); } } }), pos(x, y), ui());
        });
    });
    s.onDrawUI((d) => {
        const v = s.view, k = show.k;
        const wide = v.width > v.height;
        sticker(d, "BALL LOCKER", v.width / 2, v.safe.top + (wide ? 32 : 82), Math.min(32, v.width / 11), "#ffc53d", INK);
        sticker(d, k.name, v.width / 2, wide ? v.safe.top + 70 : v.height * 0.2, 22, CREAM, INK);
        sticker(d, k.how, v.width / 2, wide ? v.safe.top + 96 : v.height * 0.25, 14, "#ffffff", INK);
    });
}

export function registerScenes(game) {
    game.scene("title", (s) => Title(game, s));
    game.scene("hub", (s, a) => Hub(game, s, a));
    game.scene("cups", (s) => Cups(game, s));
    game.scene("party", (s) => Party(game, s));
    game.scene("pass", (s) => Pass(game, s));
    game.scene("final", (s) => Final(game, s));
    game.scene("locker", (s) => Locker(game, s));
    game.scene("play", (s, a) => {
        game.touch.enabled = false;
        loadSave(game);
        // A direct start, as `pogo check --scene play` does, gets a one-hole run.
        if (!game.data.run || a?.hole !== undefined) { const n = a?.hole ?? 0, run = { mode: "tour", order: islandHoles(HOLES[n].island), i: islandHoles(HOLES[n].island).indexOf(n), p: 0, players: [{ name: "You", col: PLAYER_COLS[0], skin: game.data.save.skin, scores: [] }] }; game.data.run = run; }
        new Round(game, s, game.data.run);
    });
}
