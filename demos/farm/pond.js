// The lake at night: quiet fishing, the ferry on full moons, and the end of the story.
import { G, COLORS, Fx, Group, ambient, dateLine, foot, glow, panel, saveGame, say, spr } from "./core.js";
import { paintPond } from "./art.js";
import { FINALE, FISH, GHOST_LIST, MOON_SCENES } from "./data.js";
import * as S from "./sim.js";
import { Sky, Weather, Moth, weatherFor } from "./world.js";
import { Stage, book, dialog, toastCard } from "./modal.js";

export function pondScene(s, args = {}) {
    const game = G.game, st = G.sim ?? G.fresh(1), v = () => s.view, fx = new Fx(s), sky = new Sky(), stage = new Stage(s), hud = new Group(s);
    game.touch.enabled = false;
    if (st.phase !== "night") { game.go("market", {}); return; }
    const lay = () => { const h = v().height, w = v().width; return { shore: Math.round(h * (h > w ? 0.34 : 0.3)), bank: Math.round(h * (h > w ? 0.84 : 0.78)) }; };
    const paint = () => { const l = lay(); G.paintBg(`pond:${S.season(st)}:${v().width}x${v().height}`, (p) => paintPond(p, Math.ceil(v().width / 2), Math.ceil(v().height / 2), S.season(st), { shoreTop: Math.round(l.shore / 2), bankY: Math.round(l.bank / 2) })); };
    paint();
    G.sound.song("pond");
    const moon = S.moon(st), isFinale = args.finale;
    const moth = new Moth(v().width * 0.5, v().height * 0.6);
    let weather = new Weather(weatherFor(S.season(st), st.rain), v().width, v().height);
    // fishing state
    const gone = new Set(), fade = {}; let granHere = false, mode = "idle", timer = 0, bob = null, fishId = null, fish = { x: 0, y: 0, a: 0 }, line = 0, holdTime = 0, perfect = 0, ripples = [], ferry = null, boarding = 0, lampLit = false, crowd = 0;
    G.pondState = () => (game.current === s ? { mode, fish, line } : null);
    const dock = () => ({ x: v().width / 2, y: lay().bank + 10 });
    const castAt = (x, y) => {
        if (st.casts <= 0) { G.sound.deny(); return; }
        bob = { x, y, x0: dock().x, y0: dock().y - 30, t: 0 }; mode = "fly"; G.sound.cast();
    };
    const toLake = (y) => y > lay().shore + 8 && y < lay().bank - 6;
    const ring = (x, y, c = "#a8c8ff") => ripples.push({ x, y, t: 0, c });
    const onHook = () => {
        mode = "reel"; timer = 7; line = 0; holdTime = 0; perfect = 0; fish = { x: bob.x, y: bob.y, a: 0 };
    };
    const landed = () => {
        const shining = perfect / Math.max(0.1, holdTime) > 0.85;
        const r = S.land(st, fishId, shining), big = fishId === "duchess";
        G.sound.caught(big || r.first); ring(bob.x, bob.y, "#ffe9a8"); s.freeze(big ? 0.12 : 0.05); s.shake(big ? 3 : 1.2, 0.2, { haptic: false }); fx.spark(bob.x, bob.y, { n: big ? 40 : 16, col: FISH[fishId].glow, a: -1.57, spread: 1.3, v0: 60, v1: 200, g: 240, size: 3 });
        const c = { x: bob.x, y: bob.y }, name = FISH[fishId].name;
        fx.fly(`item:${fishId}`, c.x, c.y, v().width - 60, v().safe.top + 26, { dur: 0.6, lift: 80, s: 3 });
        saveGame(); mode = "idle"; bob = null; rebuild();
        if (big) toastCard(stage, "Good evening, Duchess", "Long as a rowing boat. She looks at you, just looks, and sinks back down. Bartleby takes off his hat.", "item:duchess", () => rebuild());
        else if (r.first) toastCard(stage, shining ? "Shining! New fish" : "New fish!", `${name}. Off to the museum, and one for the basket.`, `item:${fishId}`, () => rebuild());
        else fx.float(c.x, c.y - 14, `${shining ? "Shining " : ""}${name}`, shining ? "#fff0a8" : "#fff");
    };
    const slip = () => { G.sound.slipped(); fx.float(fish.x, fish.y - 10, "It politely declined", "#fff"); ring(fish.x, fish.y); mode = "idle"; bob = null; rebuild(); };
    const back = () => { if (mode !== "idle" && mode !== "bite") { mode = "idle"; bob = null; } saveGame(); game.go("farm", { from: "pond" }, { fade: 0.25 }); };
    const startFinale = () => {
        if (!S.finish(st)) return;
        saveGame(); hud.clear(); G.sound.song("finale");
        ferry = { x: -120, tx: v().width * 0.5 - 40, y: lay().shore + 70 }; crowd = 1;
        const leaves = { 5: "fennimore", 7: "odette", 8: "auberon", 9: "bartleby", 10: "biscuit", 11: "quillon" };
        dialog(stage, FINALE, () => { saveGame(); game.go("ending", {}, { fade: 1.2 }); }, { shade: 0.15, onLine: (i) => {
            if (i === 3) { lampLit = true; s.flash("#ffe9a8", 0.5); s.shake(2, 0.4, { haptic: false }); game.haptic("heavy"); G.sound.hybrid(); }
            if (leaves[i]) { gone.add(leaves[i]); G.sound.chime(); }
            if (i === 12) { granHere = true; G.sound.heart(); }
            if (i === 15) { granHere = false; ferry.tx = v().width + 200; game.haptic("success"); }
        } });
    };
    const rebuild = () => {
        hud.clear();
        if (stage.open) return;
        const vw = v(), w = vw.width, h = vw.height, safe = vw.safe;
        hud.drawn({ draw(d) { panel(d, 6 + safe.left, safe.top + 6, 170, 40, "night"); spr(d, `moon${moon}`, 26 + safe.left, safe.top + 26, { s: 0.55 }); say(d, `Casts left ${st.casts}`, 46 + safe.left, safe.top + 17, { color: COLORS.paperHi }); } });
        const by = h - safe.bottom - 58;
        hud.button({ x: 8 + safe.left, y: by, w: 136, h: 50, label: "Patch", icon: "farmnav", kind: "night", color: "#f4e8d0", name: "back", onTap: back });
        hud.button({ x: 150 + safe.left, y: by, w: 50, h: 50, icon: "book", kind: "night", name: "book", onTap: () => book(stage, 0) });
        if (S.canFinish(st)) hud.button({ x: 206 + safe.left, y: by, w: Math.min(260, w - 214 - safe.left - safe.right), h: 50, label: "Light the lamp", kind: "gold", name: "finale", onTap: startFinale });
        hud.drawn({ layer: 44, draw(d) {
            let msg = "";
            if (mode === "idle") msg = st.casts > 0 ? (S.duchessDue(st) && st.casts === 1 ? "Something very large is listening." : "Tap the water to cast") : "The fish have gone to bed.";
            if (mode === "wait") msg = "Wait for it...";
            if (mode === "bite") msg = "Now! Tap!";
            if (mode === "reel") msg = "Hold your finger on the glow";
            if (msg) say(d, msg, w / 2, safe.top + 54, { align: "center", color: mode === "bite" ? "#ffe9a8" : "#f6e8c4", outline: COLORS.ink, scale: mode === "bite" ? 3 : 2 });
        } });
    };
    stage.refresh = rebuild;
    s.on("resize", () => { paint(); rebuild(); weather = new Weather(weather.kind, v().width, v().height); });
    s.onUpdate((dt) => {
        G.sound.tick(); sky.update(dt); fx.update(dt); weather.update(dt);
        for (const r of ripples) r.t += dt; ripples = ripples.filter((r) => r.t < 1.3);
        if (ferry) ferry.x += (ferry.tx - ferry.x) * Math.min(1, dt * 0.5);
        const p = s.input.pointer, inp = s.input;
        moth.tx = p.down ? p.x : dock().x + 40; moth.ty = p.down ? p.y - 30 : dock().y - 80; moth.update(dt);
        if (stage.open) return;
        if (mode === "idle") { if (p.pressed && toLake(p.y)) castAt(p.x, p.y); else if (inp.pressed("fire")) castAt(v().width * 0.5, (lay().shore + lay().bank) / 2); }
        else if (mode === "fly") { bob.t += dt * 2.4; if (bob.t >= 1) { mode = "wait"; timer = game.fxRng.range(0.9, 2.4); G.sound.plop(); ring(bob.x, bob.y); fishId = S.bite(st); } }
        else if (mode === "wait") { timer -= dt; if (game.fxRng.chance(0.015)) ring(bob.x, bob.y, "#5a6ab0"); if (timer <= 0) { mode = "bite"; timer = 1.8; G.sound.bite(); ring(bob.x, bob.y, "#ffe9a8"); game.haptic("medium"); } }
        else if (mode === "bite") { timer -= dt; if (p.pressed || inp.pressed("fire")) onHook(); else if (timer <= 0) { fx.float(bob.x, bob.y - 10, "Too polite to bother you", "#fff"); mode = "idle"; bob = null; } }
        else if (mode === "reel") {
            timer -= dt; fish.a += dt * (fishId === "duchess" ? 1.6 : 1.1);
            const cx = bob.x * 0.6 + v().width * 0.2, cy = (lay().shore + lay().bank) / 2, rx = Math.min(110, v().width * 0.3), ry = (lay().bank - lay().shore) * 0.32;
            fish.x = cx + Math.sin(fish.a) * rx; fish.y = cy + Math.sin(fish.a * 1.7) * ry;
            const near = (p.down && Math.hypot(p.x - fish.x, p.y - fish.y) < 58) || inp.down("fire");
            holdTime += dt;
            if (near) { line = Math.min(1, line + dt / (fishId === "duchess" ? 2.8 : 1.7)); perfect += dt; G.sound.reel(line); if (game.fxRng.chance(0.3)) ring(fish.x, fish.y, FISH[fishId].glow); }
            else line = Math.max(0, line - dt * 0.2);
            bob.x = fish.x; bob.y = fish.y;
            if (line >= 1) landed(); else if (timer <= 0) slip();
        }
        if (inp.pressed("back")) back();
        if (inp.pressed("book")) book(stage, 0);
    });
    s.onDraw((d) => {
        const w = v().width, h = v().height, t = s.time, l = lay(), tint = ambient(0), bw = Math.ceil(w / 2), bh = Math.ceil(h / 2), mx = w * 0.62, my = l.shore * 0.5;
        sky.draw(d, w, l.shore + 10, 0, moon, { x: mx, y: my }, null);
        // far-shore glow of the other side
        d.additive(() => glow(d, w * 0.5, l.shore, w * 0.5, st.ended ? "#ffcf7a" : "#6a60c0", st.ended ? 0.3 : 0.14));
        d.sprite("bg", { crop: [0, 0, bw, bh], x: bw, y: bh, width: bw * 2, height: bh * 2, color: tint });
        // the lake: painted live, row by row, so it can shimmer
        const rows = Math.ceil((l.bank - l.shore) / 6 + 3), full = moon === 4 ? 1 : moon === 0 ? 0.1 : 0.55;
        for (let r = 0; r < rows; r++) {
            const y = l.shore + r * 6 + 3, k = r / rows, A = [30, 22, 72], B = [58, 44, 112], c = [(A[0] + (B[0] - A[0]) * k) / 255, (A[1] + (B[1] - A[1]) * k) / 255, (A[2] + (B[2] - A[2]) * k) / 255];
            d.rect(w, 6.5, { x: w / 2, y, color: c });
        }
        d.additive(() => {
            for (let r = 0; r < rows; r++) {
                const y = l.shore + r * 6 + 3, k = r / rows, spread = 12 + k * 70, n = 3;
                for (let i = 0; i < n; i++) { const wob = Math.sin(t * 1.3 + r * 1.7 + i * 2) * spread, wid = (8 + ((r * 7 + i * 13) % 26)) * (1 + k); d.rect(Math.round(wid / 2) * 2, 2, { x: Math.round((mx + wob) / 2) * 2, y: Math.round(y / 2) * 2, color: "#d8e4ff", opacity: (0.6 - k * 0.3) * full * (0.5 + Math.sin(t * 2 + r + i) * 0.5) }); }
            }
            glow(d, mx, l.shore + 30, 160, "#a8c8ff", 0.14 * full);
            for (const r of ripples) { const q = r.t / 1.3; d.circle(0, {}); d.rect(0, 0); d.push(); d.translate(r.x, r.y); d.scale(1, 0.34); d.circle(6 + q * 54, { color: r.c, outline: 2, opacity: (1 - q) * 0.8 }); d.pop(); }
        });
        // the ferry, on full moons
        const showFerry = moon === 4 && (args.scene !== undefined || ferry || s.ferryIdle);
        const fx0 = ferry ? ferry.x : w * 0.62, fy = l.shore + 66 + Math.sin(t * 0.8) * 2;
        if (moon === 4) { spr(d, "ferry", fx0, fy, { color: tint }); d.additive(() => { for (const wx of [-14, 10]) { d.rect(12, 16, { x: fx0 + wx, y: fy - 16, color: "#ffcf7a", opacity: 0.5 }); glow(d, fx0 + wx, fy - 16, 26, "#ffcf7a", 0.5); } glow(d, fx0 - 84, fy - 50, 70, "#ffcf7a", 0.7); glow(d, fx0 - 84, fy + 40, 40, "#ffcf7a", 0.28); }); }
        // the near bank, then the dock on top
        const dk = dock(), plank = st.lantern >= 1;
        const dockLen = l.bank - l.shore - 100;
        for (let j = 0; j < 9; j++) {
            const y = dk.y - j * 20, sag = plank ? 0 : (j % 3 === 2 ? 1 : 0);
            if (!sag) { d.rect(64, 16, { x: dk.x + Math.sin(j) * 2, y, color: [0.54 * tint[0], 0.36 * tint[1], 0.3 * tint[2]] }); d.rect(64, 3, { x: dk.x, y: y - 7, color: [0.8 * tint[0], 0.56 * tint[1], 0.4 * tint[2]] }); }
            if (j % 2 === 0) { d.rect(5, 26, { x: dk.x - 30, y: y + 8, color: [0.3 * tint[0], 0.2 * tint[1], 0.25 * tint[2]] }); d.rect(5, 26, { x: dk.x + 30, y: y + 8, color: [0.3 * tint[0], 0.2 * tint[1], 0.25 * tint[2]] }); }
        }
        const topY = dk.y - 8 * 20;
        if (st.lantern >= 2) { foot(d, "post", dk.x + 22, topY + 10, { color: tint }); if (st.lantern >= 3) { spr(d, "lamp", dk.x + 22 - 18, topY - 130, { color: tint }); d.additive(() => glow(d, dk.x + 4, topY - 136, lampLit || st.ended ? 180 : 30, "#ffcf7a", lampLit || st.ended ? 0.8 : 0.2)); } }
        // the village, gathered, on story nights
        if (args.scene !== undefined || crowd) GHOST_LIST.forEach((g, i) => {
            const y = topY + 8 + (i % 3) * 30, x = dk.x + (i % 2 ? 1 : -1) * (12 + (i % 3) * 8), gy = y + Math.sin(t * 1.6 + i) * 3;
            fade[g] = Math.max(0, (fade[g] ?? 1) - (gone.has(g) ? 0.012 : 0));
            const k = fade[g], lift = (1 - k) * 90, gx = x + (1 - k) * (fx0 - x);
            if (k > 0) { spr(d, `ghost:${g}:${Math.floor(t * 2 + i) % 2}1`, gx, gy - lift, { s: 1.4, opacity: 0.86 * k }); d.additive(() => glow(d, gx, gy - lift, 34, "#c8d8ff", 0.26 * k)); }
        });
        if (granHere) { const gy = dk.y - 130 + Math.sin(t * 1.4) * 3; d.additive(() => glow(d, dk.x + 70, gy, 80, "#ffcf7a", 0.6)); spr(d, `ghost:gran:${Math.floor(t * 2) % 2}1`, dk.x + 70, gy, { s: 2, opacity: 0.9 }); }
        if (mode !== "idle" && bob) {
            const k = mode === "fly" ? bob.t : 1, x = mode === "fly" ? bob.x0 + (bob.x - bob.x0) * k : bob.x, y = mode === "fly" ? bob.y0 + (bob.y - bob.y0) * k - Math.sin(k * 3.14) * 80 : bob.y;
            d.line([dk.x, dk.y - 40], [x, y], { width: 1.5, color: "#c8d8ff", opacity: 0.5 });
            const dip = mode === "bite" ? Math.abs(Math.sin(t * 16)) * 4 : Math.sin(t * 3);
            d.rect(6, 10, { x, y: y + dip, color: "#f4f0ff" }); d.rect(6, 5, { x, y: y + dip - 3, color: "#e0606a" });
            if (mode === "bite") d.additive(() => glow(d, x, y, 40, "#ffe9a8", 0.7));
            if (mode === "reel") {
                const fc = FISH[fishId].glow;
                d.additive(() => { glow(d, fish.x, fish.y, 56, fc, 0.6); d.circle(58, { x: fish.x, y: fish.y, color: fc, outline: 2, opacity: 0.4 }); });
                spr(d, `item:${fishId}`, fish.x, fish.y, { s: 2, flip: Math.cos(fish.a) < 0 });
                panel(d, w / 2 - 80, l.bank + 6, 160, 18, "dim"); d.rect(150 * line, 8, { x: w / 2 - 75 + 75 * line, y: l.bank + 15, color: fc });
            }
        }
        weather.draw(d, 0);
        d.additive(() => fx.drawGlow(d));
        fx.drawSolid(d);
        moth.draw(d);
    });
    s.onDrawUI((d) => fx.drawTop(d));
    rebuild();
    if (args.scene !== undefined) {
        hud.clear();
        ferry = { x: v().width + 140, tx: v().width * 0.62 };
        dialog(stage, MOON_SCENES[args.scene], () => rebuild(), { shade: 0.1 });
    }
}
