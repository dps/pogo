// Title, unlock track, sticker book, end of run and settings.
import { PETS, SHOP, SHOPS, TRAITS, TRAIT_IDS, describe } from "./data.js";
import { newRun } from "./run.js";
import { TRACK, PACKS, finishRun, hasNode, leagueOpen, nodeName, openShops, saveMeta, shopOpen, unlockedPets } from "./meta.js";
import { frameOf, paintBackdrop } from "./art.js";
import { play } from "./audio.js";
import { G, INK, MINT, PINK, YEL, back, clamp, icon, lerp, makeButtons, makeFx, number, panel, pet, shadow, setHaptics, setMusic, setSound, small, txt } from "./ui.js";

const BG = ["#ff9cc8", "#ffcf7a"];
export function startRun(game, opts = {}) {
    const m = G.meta, seed = opts.seed ?? game.rng.int(1, 2147483646), tutorial = opts.tutorial ?? !m.tutorial;
    G.run = newRun({ seed, shop: m.shop, unlocked: unlockedPets(m), hard: !!m.hard, tutorial });
    game.go("shop", {}, { fade: 0.15 });
}
export function settingsOverlay(d, s, B, W, H, close, run) {
    const m = G.meta, game = G.game, pw = Math.min(W - 30, 300), ph = run ? 262 : 196, cy = H / 2;
    d.rect(W + 8, H + 8, { x: W / 2, y: H / 2, color: "#3a1d5c", opacity: 0.55 });
    panel(d, W / 2, cy, pw, ph, { color: "#fff6e6" });
    txt(d, "SETTINGS", W / 2, cy - ph / 2 + 22, { size: 18, color: YEL });
    const row = (id, label, iconName, on, fn, i) => { const y = cy - ph / 2 + 58 + i * 44; icon(d, iconName, W / 2 - pw / 2 + 34, y, 28); small(d, label, W / 2 - 34, y, { size: 15, bold: true }); B.button(d, id, W / 2 + pw / 2 - 58, y, 76, 36, { label: on ? "ON" : "OFF", color: on ? MINT : "#c9bedb", fn, size: 15 }); };
    row("snd", "Sound", m.sound ? "sound" : "mute", m.sound, () => setSound(!m.sound), 0);
    row("mus", "Music", "music", m.music, () => setMusic(!m.music), 1);
    row("hap", "Haptics", "buzz", m.haptics, () => { setHaptics(!m.haptics); if (m.haptics) game.haptic("medium"); }, 2);
    if (!game.input.touchMode && !run) small(d, "Keys: 1-5 buy, R roll, Space fight", W / 2, cy + ph / 2 - 30, { size: 10.5, bold: true });
    if (run) {
        const y = cy + ph / 2 - 62; small(d, "Today's stock", W / 2, y - 10, { size: 11, bold: true });
        run.stock.traits.forEach((t, i) => icon(d, t, W / 2 + (i - 3.5) * 26, y + 10, 24));
    }
    B.button(d, "close", W / 2, cy + ph / 2 - 2, 104, 36, { label: "DONE", color: PINK, fn: close, size: 15 });
    if (run) B.button(d, "quit", W / 2 + pw / 2 - 26, cy - ph / 2 + 22, 44, 28, { label: "QUIT", color: "#ff8f6f", size: 10, fn: () => { game.save("psb.run", null); close(); game.go("title", {}, { fade: 0.15 }); } });
}
export function menus(game) {
    game.scene("title", (s) => {
        const m = G.meta, B = makeButtons(s), fx = makeFx(game); let settings = false, t = 0, kick = 0;
        G.playSong?.("title"); game.touch.enabled = false;
        const saved = (() => { try { return game.load("psb.run", null); } catch { return null; } })();
        const parade = ["taxham", "gothrab", "suitbee", "ceocto", "bathduck", "vampuss", "hamhydra", "drumcrab", "flamsolo", "foxpick"];
        const shops = openShops(m); if (!shopOpen(m, m.shop)) m.shop = "corner";
        const hop = parade.map((id, i) => ({ id, i, y: 0, sq: 0, phase: i * 0.7 }));
        s.onUpdate((dt) => {
            t += dt; B.update(); fx.update(dt); if (!settings && s.input.pressed("confirm")) go();
            if (G.heroPose && t > 0.1 && Math.floor(t * 20) !== Math.floor((t - dt) * 20)) { fx.confetti(game.fxRng.range(0, s.view.width), game.fxRng.range(0, s.view.height * 0.5), 26, 300); fx.stars(game.fxRng.range(0, s.view.width), s.view.height * 0.8, 3, 160); }
        });
        const go = () => { play(game, "fight"); startRun(game); };
        const cont = () => { play(game, "fight"); G.run = saved; game.go("shop", {}, { fade: 0.15 }); };
        const cycle = (n) => { const i = shops.findIndex((x) => x.id === m.shop); m.shop = shops[(i + n + shops.length) % shops.length].id; saveMeta(game, m); };
        s.onDraw((d) => {
            const W = s.view.width, H = s.view.height;
            for (let i = 0; i < 16; i++) { const a = t * 0.08 + (i * 6.283) / 16; d.line([W / 2, H * 0.34], [W / 2 + Math.cos(a) * 1200, H * 0.34 + Math.sin(a) * 1200], { width: 110, color: "#ffffff", opacity: 0.09 }); }
            const L = W > H, logoW = Math.min(L ? Math.min(W * 0.46, H * 0.98) : W - 14, 520), logoH = logoW * 0.57, ly = (L ? H * 0.32 : H * 0.23) + Math.sin(t * 1.8) * 3;
            d.push(); d.translate(L ? W * 0.3 : W / 2, ly); d.rotate(-0.03 + Math.sin(t * 1.1) * 0.012); d.sprite("logo", { width: logoW, height: logoH }); d.pop();
            const count = Math.min(parade.length, Math.floor(W / 56) + 1), step = W / count, gy = L ? H - 42 : H * 0.53;
            for (let i = 0; i < count; i++) { const h = hop[i], p = (t * 1.7 + h.phase) % 2, j = p < 1 ? Math.sin(p * Math.PI) : 0, sz = L ? 76 : 86; shadow(d, step * (i + 0.5), gy + sz * 0.42, sz * 0.62 * (1 - j * 0.3)); const sqz = p < 0.1 || p > 1.9 ? 0.08 : 0; pet(d, h.id, G.heroPose ? 1 + (i % 3) : 1, step * (i + 0.5), gy - j * 20, sz, { w: sz * (1 + sqz), h: sz * (1 - sqz) }); }
        });
        s.onDrawUI((d) => {
            B.begin();
            const W = s.view.width, H = s.view.height, L = W > H, cx = L ? W * 0.76 : W / 2, sa = s.view.safe;
            const sh = SHOP[m.shop], py = L ? H * 0.2 : H * 0.665, cw = Math.min(L ? W * 0.4 : W - 36, 320);
            panel(d, cx, py, cw, 62, { color: sh.color });
            txt(d, sh.name, cx, py - 15, { size: 18 }); small(d, `${sh.tag} ${sh.rule}`, cx, py + 11, { size: 10.5, maxWidth: cw - 64, bold: true, color: INK });
            if (shops.length > 1) { B.button(d, "prev", cx - cw / 2 + 6, py, 30, 42, { icon: "back", color: "#ffffff", fn: () => cycle(-1) }); d.push(); B.button(d, "next", cx + cw / 2 - 6, py, 30, 42, { icon: "play", color: "#ffffff", fn: () => cycle(1) }); d.pop(); }
            const by = L ? H * 0.47 : H * 0.79;
            if (saved) { B.button(d, "cont", cx, by, Math.min(cw, 300), 58, { label: `CONTINUE R${saved.round}`, color: MINT, fn: cont, size: 22, pulse: Math.sin(t * 4) * 1.5 }); B.button(d, "play", cx, by + 56, 150, 36, { label: "NEW RUN", color: PINK, fn: go, size: 15 }); }
            else B.button(d, "play", cx, by, Math.min(cw, 280), 66, { label: "PLAY", icon: "play", color: "#ff4f8b", fn: go, size: 30, pulse: Math.sin(t * 4) * 2, tw: 38 });
            const ry = L ? H * 0.47 + (saved ? 110 : 80) : H - sa.bottom - 34;
            B.button(d, "track", cx - 88, ry, 78, 48, { icon: "treat", color: "#ffb347", fn: () => game.go("track", {}, { fade: 0.14 }) });
            B.button(d, "book", cx, ry, 78, 48, { icon: "book", color: "#b48cff", fn: () => game.go("book", {}, { fade: 0.14 }) });
            B.button(d, "gear", cx + 88, ry, 78, 48, { icon: "gear", color: "#46b8ff", fn: () => { settings = true; } });
            number(d, m.treats, cx - 88, ry + 16, 13);
            if (leagueOpen(m)) { const y = ry - 40; B.button(d, "league", cx, y, 170, 28, { label: m.hard ? "SHARP LEAGUE ON" : "SHARP LEAGUE OFF", color: m.hard ? "#ff5f6f" : "#c9bedb", size: 11, fn: () => { m.hard = !m.hard; saveMeta(game, m); } }); }
            fx.draw(d);
            if (settings) settingsOverlay(d, s, B, W, H, () => { settings = false; }, null);
        });
    });
    game.scene("track", (s) => {
        const m = G.meta, B = makeButtons(s); let sel = null, t = 0;
        s.onUpdate((dt) => { t += dt; B.update(); });
        s.onDrawUI((d) => {
            B.begin();
            const W = s.view.width, H = s.view.height, L = W > H, top = s.view.safe.top + 8, cols = L ? 6 : 3, rows = Math.ceil(TRACK.length / cols);
            B.button(d, "back", 34, top + 22, 48, 40, { icon: "back", color: "#46b8ff", fn: () => game.go("title", {}, { fade: 0.14 }) });
            txt(d, "UNLOCK TRACK", W / 2 + 8, top + 14, { size: 22, color: YEL });
            icon(d, "treat", W / 2 - 22, top + 36, 18); number(d, m.treats, W / 2 + 8, top + 36, 17);
            const y0 = top + 62, cw = (W - 18) / cols, ch = Math.min((H - y0 - 54) / rows, L ? 110 : 120);
            TRACK.forEach((n, i) => {
                const x = 9 + cw * ((i % cols) + 0.5), y = y0 + ch * (Math.floor(i / cols) + 0.5), own = hasNode(m, n);
                panel(d, x, y, cw - 12, ch - 12, { color: own ? "#c6f5e4" : "#efe7f7", radius: 12 });
                const yy = y - ch * 0.12, iz = Math.min(ch * 0.5, 48);
                if (n.kind === "shop") { d.circle(iz * 0.44, { x, y: yy, color: SHOP[n.id].color }); icon(d, "pen", x, yy, iz * 0.8); }
                else if (n.kind === "pack") pet(d, PACKS[n.id].ids[0], own ? 1 : 1, x, yy, iz * 1.2, { color: own ? undefined : "#3a1d5c" });
                else icon(d, n.kind === "league" ? "atk" : "star", x, yy, iz);
                small(d, nodeName(n), x, y + ch * 0.16, { size: L ? 9.5 : 10.5, bold: true, maxWidth: cw - 16 });
                if (own) icon(d, "check", x + cw * 0.33, y - ch * 0.3, 20, { color: MINT });
                else { number(d, n.at, x + 4, y + ch * 0.33, 13); icon(d, "treat", x - 16, y + ch * 0.33, 14); }
            });
            const nextN = TRACK.find((n) => !hasNode(m, n));
            txt(d, nextN ? `${nextN.at - m.treats} treats to ${nodeName(nextN)}` : "Everything unlocked!", W / 2, H - s.view.safe.bottom - 22, { size: 13 });
        });
    });
    game.scene("book", (s) => {
        const m = G.meta, B = makeButtons(s), unlocked = unlockedPets(m); let page = 0, sel = null, drag = 0;
        s.onUpdate(() => { const took = B.update(); });
        s.onDrawUI((d) => {
            B.begin();
            const W = s.view.width, H = s.view.height, L = W > H, top = s.view.safe.top + 8, cols = L ? 9 : 5, rows = L ? 3 : 6, per = cols * rows, pages = Math.ceil(PETS.length / per), y0 = top + 50, area = H - y0 - s.view.safe.bottom - (L ? 62 : 110), cz = Math.min((W - 16) / cols, area / rows);
            B.button(d, "back", 34, top + 22, 48, 40, { icon: "back", color: "#46b8ff", fn: () => game.go("title", {}, { fade: 0.14 }) });
            const seen = PETS.filter((p) => m.seen[p.id]).length;
            txt(d, "STICKER BOOK", W / 2 + 10, top + 12, { size: 20, color: YEL }); small(d, `${seen} of ${PETS.length} collected`, W / 2 + 10, top + 34, { size: 12, bold: true, color: "#fff" });
            PETS.slice(page * per, (page + 1) * per).forEach((p, i) => {
                const x = W / 2 + ((i % cols) - (cols - 1) / 2) * cz, y = y0 + cz * (Math.floor(i / cols) + 0.5), got = m.seen[p.id], open = unlocked.has(p.id);
                d.rect(cz - 4, cz - 4, { x, y, radius: 12, color: "#ffffff", opacity: sel === p ? 0.9 : 0.4 });
                pet(d, p.id, 1, x, y, cz * 0.98, { color: got ? undefined : "#3a1d5c", opacity: got ? 1 : 0.5 });
                if (!open) icon(d, "lock", x + cz * 0.3, y + cz * 0.3, 16);
                B.next.push({ id: `p${p.id}`, x, y, w: cz - 2, h: cz - 2, fn: () => { sel = p; }, sound: "tap" });
            });
            const by = H - s.view.safe.bottom - 30;
            if (sel && !L) { const got = m.seen[sel.id]; panel(d, W / 2, by - 58, W - 26, 56, { color: "#fff6e6", radius: 12 }); txt(d, got ? sel.name : "Not collected yet", W / 2, by - 72, { size: 14 }); if (got) { small(d, describe(sel.ab, 1), W / 2, by - 50, { size: 11, bold: true, maxWidth: W - 44 }); } }
            B.button(d, "prev", W / 2 - 70, by, 56, 40, { icon: "back", color: "#fff", off: page === 0, fn: () => { page--; } });
            B.button(d, "next", W / 2 + 70, by, 56, 40, { icon: "play", color: "#fff", off: page >= pages - 1, fn: () => { page++; } });
            txt(d, `${page + 1}/${pages}`, W / 2, by, { size: 16 });
            if (sel && L) { const got = m.seen[sel.id]; txt(d, got ? `${sel.name}: ${describe(sel.ab, 1)}` : "Not collected yet", W / 2, by - 30, { size: 11, maxWidth: W - 30 }); }
        });
    });
    game.scene("end", (s) => {
        const run = G.run, m = G.meta, B = makeButtons(s), fx = makeFx(game), won = run.over === "won";
        const award = run.awarded ?? (run.awarded = finishRun(game, m, run));
        try { game.save("psb.run", null); } catch { /* blocked */ }
        G.playSong?.("end");
        let t = 0, shown = award.before, nextConfetti = 0, fired = 0;
        play(game, won ? "champion" : "lose");
        game.data.ended = run.over;
        const again = () => { game.go("title", {}, { fade: 0.14 }); };
        s.onUpdate((dt) => {
            t += dt; B.update(); fx.update(dt);
            if (t > 0.6) shown = Math.min(award.after, shown + dt * Math.max(18, award.earned * 0.9));
            if (won && t > nextConfetti) { nextConfetti = t + 0.5; fx.confetti(game.fxRng.range(40, s.view.width - 40), s.view.height * 0.3, 40, 340); }
            if (fired < award.fresh.length && shown >= award.fresh[fired].at) { fired++; play(game, "unlock"); fx.confetti(s.view.width / 2, s.view.height * 0.5, 40, 300); }
            if (s.input.pressed("confirm") && t > 1) again();
        });
        s.onDrawUI((d) => {
            B.begin();
            const W = s.view.width, H = s.view.height, L = W > H, top = s.view.safe.top;
            const k = back(clamp(t / 0.35));
            d.push(); d.translate(W / 2, top + (L ? 34 : 56)); d.scale(k, k); d.rotate(-0.04);
            txt(d, won ? "CHAMPION!" : "SHOP CLOSED", 0, 0, { size: L ? 34 : 38, color: won ? YEL : "#ffc2df", edge: 3, inkColor: won ? "#e8308a" : INK }); d.pop();
            const team = run.board.filter(Boolean).slice(0, 8), n = team.length, sz = Math.min(66, (W - 20) / Math.max(4, n)), gy = top + (L ? 96 : 136);
            team.forEach((p, i) => { const j = won ? Math.abs(Math.sin(t * 4 + i * 0.7)) * 10 : 0; pet(d, p.id, p.star, W / 2 + (i - (n - 1) / 2) * sz, gy - j, sz * 1.1); });
            const y = gy + 58; txt(d, `${run.wins} ${run.wins === 1 ? "win" : "wins"}, ${run.round} rounds, ${run.merges} merges`, W / 2, y, { size: 15 });
            // The treat bar fills towards the next unlock.
            const prev = [0, ...TRACK.map((n2) => n2.at)].filter((a) => a <= shown).at(-1), nextN = TRACK.find((n2) => n2.at > shown), a = prev, b = nextN?.at ?? shown + 1, f = clamp((shown - a) / (b - a)), bw = Math.min(W - 60, 300), by = y + 34;
            panel(d, W / 2, by, bw, 18, { color: "#efe7f7", radius: 8, gloss: false }); d.rect(Math.max(8, bw * f), 18, { x: W / 2 - bw / 2 + Math.max(8, bw * f) / 2, y: by, radius: 8, color: "#ffb347" });
            icon(d, "treat", W / 2 - bw / 2 - 12, by, 26); number(d, Math.round(shown), W / 2, by, 16);
            txt(d, nextN ? `Next: ${nodeName(nextN)}` : "Track complete!", W / 2, by + 22, { size: 12 });
            if (award.fresh.length && fired) txt(d, `NEW: ${nodeName(award.fresh[fired - 1])}!`, L ? W * 0.84 : W / 2, L ? top + 34 : by + 42, { size: 16, color: YEL });
            // Replays of every fight in the run: same seed, same brawl.
            const list = run.history, chip = Math.min(38, (W - 20) / Math.max(list.length, 8)), ry = L ? H - s.view.safe.bottom - 88 : by + 86;
            small(d, "Rewatch a battle", W / 2, ry - 24, { size: 11, bold: true, color: "#fff" });
            list.forEach((h, i) => { const x = W / 2 + (i - (list.length - 1) / 2) * chip; B.button(d, `r${i}`, x, ry, chip - 3, 34, { label: String(h.round), color: h.winner === "a" ? MINT : h.winner === "b" ? "#ff8f8f" : "#c9bedb", size: 13, fn: () => game.go("battle", { entry: h, replay: true, back: "end" }, { fade: 0.14 }) }); });
            B.button(d, "again", W / 2, H - s.view.safe.bottom - 40, 200, 56, { label: "NEXT RUN", color: "#ff4f8b", fn: again, size: 22, pulse: Math.sin(t * 4) * 1.5 });
            fx.draw(d);
        });
    });
}
export const BACKGROUND = BG;
