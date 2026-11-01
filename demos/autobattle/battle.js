// The battle scene: plays back the event list from sim.js. Nothing here can change an outcome, so a replay is a perfect re-run.
import { COLS, PET, TOKENS, TRAITS } from "./data.js";
import { battle as resolve } from "./sim.js";
import { settle } from "./run.js";
import { GHOSTS } from "./ghosts.js";
import { paintBackdrop, UI, frameOf } from "./art.js";
import { play } from "./audio.js";
import { G, INK, YEL, back, clamp, icon, lerp, makeButtons, makeFx, number, panel, pet, pips, shadow, small, txt } from "./ui.js";

const PROJ = { suit: "#ffffff", goth: "#b48cff", chef: "#ffb347", band: "#ff7eb6", hex: "#5dfca1", beef: "#ff8080", grem: "#c5ef6c", diva: "#ffe14a", tiny: "#ffd28a", wet: "#6fd3ff", fluff: "#ffc2df", zap: "#fff27a" };
const PROC = { atk: "RAGE!", hp: "GROW!", weaken: "AUDIT!", shield: "GUARD!", heal: "SOOTHE!", haste: "HURRY!", dmg: "ZING!", curse: "HEX!", stun: "BONK!", soak: "SPLOSH!", taunt: "OI YOU!", copy: "COPY!", summon: "GRUBS!" };
export function battleScene(game) {
    game.scene("battle", (s, args = {}) => {
        // pogo check enters scenes directly: fall back to a late bot-versus-bot replay.
        if (!args.entry) { const rows = GHOSTS[9]; args = { entry: { round: 9, me: rows.at(-1), foe: rows.at(-2), seed: 9, hash: 0 }, replay: true, back: "title" }; }
        const { entry, replay, back: backTo } = args;
        const res = args.res ?? resolve(entry.me, entry.foe, entry.seed), run = G.run;
        const matches = res.hash === entry.hash || !entry.hash;
        game.data.lastHash = res.hash; game.data.replayMatches = matches;
        const B = makeButtons(s), fx = makeFx(game), units = new Map(), proj = [], banners = [];
        const ev = res.events; let idx = 0, wait = 0.9, speed = args.fast ? 2 : 1, done = false, settled = !!replay, intro = 0, slam = 0, flash = 0, beatNo = 0, closing = false, outcome = 0, kick = 0, kx = 0, ky = 0;
        G.playSong?.(!replay && run && run.round >= 8 ? "late" : "battle");
        const land = () => s.view.width > s.view.height;
        const name = land() ? "bg-ring-l" : "bg-ring-p";
        paintBackdrop(game, "bg-ring-p", 360, 640, "#ffd0e4", "#ffe9b8", "#ff7eb6"); paintBackdrop(game, "bg-ring-l", 640, 360, "#ffd0e4", "#ffe9b8", "#ff7eb6");
        const metrics = () => {
            const W = s.view.width, H = s.view.height;
            if (land()) { const ch = Math.min(84, (H - 62) / 4); return { pitch: ch, size: ch * 0.92, rw: Math.min(118, W * 0.15), gap: Math.min(84, W * 0.1), cy: H * 0.54 }; }
            const cw = Math.min(90, (W - 14) / 4), rh = Math.min(112, (H - 150) / 4.7);
            return { cw, rh, size: Math.min(cw * 0.98, rh * 0.86), gap: rh * 0.6, cy: H * 0.51 };
        };
        const cellPos = (side, cell) => {
            const W = s.view.width, m = metrics(), col = cell % COLS, row = (cell / COLS) | 0;
            if (land()) return [W / 2 + (side ? 1 : -1) * (m.gap + row * m.rw), m.cy + (col - 1.5) * m.pitch];
            return [W / 2 + (col - 1.5) * m.cw, m.cy + (side ? -1 : 1) * (m.gap + row * m.rh)];
        };
        const SIZE = () => metrics().size;
        const add = (u, appear) => { const [x, y] = cellPos(u.side, u.cell); const v = { ...u, x, y, hx: x, hy: y, alive: true, sq: appear ? -0.5 : 0, sv: 0, rot: 0, flash: 0, lunge: null, spawn: appear ? 0 : 1, curse: 0, soak: false, stun: 0, taunt: false, fly: null, shake: 0, seed: u.uid * 1.7 }; units.set(u.uid, v); return v; };
        const hop = (v, h = 0.2) => { v.sv -= h * 14; };
        const banner = (text, side, col) => banners.push({ text, side, col, t: 0 });

        const sting = { hit: (e) => {
            const v = units.get(e.v), u = units.get(e.u); if (!v) return;
            const pctBig = e.n >= v.maxHp * 0.3;
            v.hp = e.hp; v.shield = e.sh; v.flash = 1; v.shake = 1; v.sq = 0.26; v.sv = 0;
            const isText = e.kind === "curse" || e.kind === "closing";
            const pop = { num: e.n, size: e.crit ? 42 : pctBig ? 34 : e.kind === "melee" || e.kind === "shot" ? 26 : 19, color: e.kind === "curse" ? "#7dffb2" : e.kind === "zap" ? "#fff27a" : e.kind === "splash" ? "#8fdcff" : e.crit ? "#ffd23f" : "#ffffff", sign: "minus" };
            fx.pop("", v.x + game.fxRng.range(-12, 12), v.y - 18, pop);
            if (e.crit) { fx.pop("CRIT!", v.x, v.y - 48, { size: 22, color: "#ffd23f" }); s.freeze(0.09); s.flash("#ffffff55", 0.08); kick = 9; fx.stars(v.x, v.y, 10, 240); play(game, "crit"); }
            else if (pctBig) { s.freeze(0.05); kick = 6; fx.stars(v.x, v.y, 6, 170); play(game, "bighit"); }
            else if (e.kind === "melee" || e.kind === "shot") { kick = Math.max(kick, 3); fx.stars(v.x, v.y, 4, 120); play(game, "hit"); }
            else if (e.kind === "zap") { sparks(u ?? v, v); play(game, "zap", 0.06); }
            else if (e.kind === "splash") { fx.confetti(v.x, v.y, 8, 120, ["#6fd3ff", "#bdf0ff", "#ffffff"], 300); play(game, "splash", 0.08); }
            else if (isText) { play(game, "curse", 0.1); }
            else play(game, "hit", 0.06);
            if (u && e.kind === "melee") { const dx = v.x - u.x, dy = v.y - u.y, l = Math.hypot(dx, dy) || 1; v.kx = (dx / l) * 16; v.ky = (dy / l) * 16; }
        }, faint: (e) => {
            const v = units.get(e.u); if (!v) return;
            v.alive = false; const side = v.x < s.view.width / 2 ? -1 : 1; v.fly = { vx: side * game.fxRng.range(120, 260), vy: -360, vr: side * game.fxRng.range(9, 15), t: 0 };
            fx.confetti(v.x, v.y, 14, 200); fx.ring(v.x, v.y, 12, 56, 0.3); fx.pop("BONK!", v.x, v.y - 30, { size: 17, color: "#ffffff", life: 0.6 });
            play(game, "faint", 0.08); kick = Math.max(kick, 5);
        } };
        const sparks = (a, b) => { const n = 5; for (let i = 0; i < n; i++) { const t = i / (n - 1); proj.push({ bolt: true, x: lerp(a.x, b.x, t) + game.fxRng.range(-9, 9), y: lerp(a.y, b.y, t) + game.fxRng.range(-9, 9), a: i ? null : 0, t: 0, life: 0.14, px: i ? lerp(a.x, b.x, (i - 1) / (n - 1)) : a.x, py: i ? lerp(a.y, b.y, (i - 1) / (n - 1)) : a.y }); } };
        const step = () => {
            const e = ev[idx++]; if (!e) return 0;
            const u = units.get(e.u);
            switch (e.k) {
                case "roster": for (const r of e.units) add(r); return 0;
                case "trait": banner(`${TRAITS[e.trait].blurb.toUpperCase()}${e.lvl > 1 ? " ".padEnd(1) + "x".repeat(0) : ""}`, e.side, TRAITS[e.trait].color); play(game, "proc"); return 0.12;
                case "banner": banner(e.text, e.side, TRAITS[e.trait].color); kick = 3; play(game, "shield"); return 0.22;
                case "beat": beatNo++; if (e.closing && !closing) { closing = true; banner("CLOSING TIME!", 2, "#ff5f6f"); play(game, "closing"); return 0.4; } return 0.05;
                case "attack": { const v = units.get(e.v); if (!u || !v) return 0; if (e.ranged) { u.sq = -0.16; const c = PROJ[u.token ? "tiny" : PET[u.id].traits[0]]; proj.push({ x: u.x, y: u.y, sx: u.x, sy: u.y, tx: v.x, ty: v.y, t: 0, life: 0.16, c, icon: u.token ? null : PET[u.id].traits[0] }); play(game, "shot", 0.05); return 0.15; } u.lunge = { t: 0, dur: 0.3, tx: v.x, ty: v.y }; u.sq = -0.24; play(game, "leap", 0.05); return 0.15; }
                case "hit": sting.hit(e); return e.kind === "melee" || e.kind === "shot" ? 0.12 : 0.05;
                case "faint": sting.faint(e); return 0.1;
                case "heal": if (u) { u.hp = e.hp; fx.pop("", u.x, u.y - 12, { num: e.n, size: 19, color: "#8bffb0", sign: "plus" }); fx.stars(u.x, u.y, 3, 70, "heart"); play(game, "heal", 0.1); } return 0.03;
                case "shield": if (u) { u.shield = e.sh; fx.ring(u.x, u.y, 18, 44, 0.3, "#7bd6ff"); play(game, "shield", 0.08); } return 0.03;
                case "buff": if (u) { const up = e.atk > u.atk || e.hp > u.hp || e.maxHp > u.maxHp; u.atk = e.atk; u.hp = e.hp; u.maxHp = e.maxHp; hop(u, 0.15); if (e.tag === "goth") { fx.stars(u.x, u.y, 3, 70, "goth"); } else if (e.tag === "weaken" || e.tag === "suit") { fx.pop("", u.x, u.y + 6, { num: 1, size: 14, color: "#ff9f9f", sign: "minus", life: 0.5 }); } if (up) play(game, "buff", 0.1); } return 0.02;
                case "curse": if (u) { u.curse = e.c; fx.stars(u.x, u.y - 8, 3, 60, "curse"); play(game, "curse", 0.1); } return 0.03;
                case "soak": if (u) u.soak = true; return 0;
                case "stun": if (u) { u.stun = 1.6; play(game, "stun"); } return 0.08;
                case "taunt": if (u) { u.taunt = true; hop(u, 0.2); } return 0.03;
                case "haste": if (u) { fx.dust(u.x, u.y + 12, 3, "#fff27a"); } return 0;
                case "move": if (u) { const [x, y] = cellPos(u.side, e.cell); u.cell = e.cell; u.hx = x; u.hy = y; u.moving = 1; hop(u, 0.4); play(game, "pick", 0.05); } return 0.08;
                case "summon": { const v = add(e.unit, true); const o = units.get(e.from); if (o) { v.x = o.x; v.y = o.y; } play(game, "summon", 0.05); return 0.06; }
                case "proc": if (u) { u.proc = 1; hop(u, 0.18); const col = TRAITS[u.token ? "tiny" : PET[u.id].traits[0]].color; fx.ring(u.x, u.y, 14, 40, 0.24, col); const say2 = PROC[e.fx]; if (say2) fx.pop(say2, u.x, u.y - SIZE() * 0.5, { size: 13, color: "#ffffff", life: 0.6, vy: -24 }); play(game, "proc", 0.06); } return 0.08;
                case "closing": fx.pop("", s.view.width / 2, s.view.height / 2, { num: e.n, size: 26, color: "#ff8a8a", sign: "minus", life: 0.5 }); kick = 4; return 0.14;
                case "end": return finish(e.winner);
            }
            return 0;
        };
        // Pace: long fights run quicker, so every battle lands between 8 and 16 seconds.
        const est = (() => { let t = 0; for (const e of ev) t += e.k === "attack" ? 0.27 : e.k === "hit" ? 0.06 : e.k === "faint" ? 0.1 : e.k === "trait" ? 0.12 : 0.02; return t; })(), pace = clamp(est / 12, 1, 3);
        game.data.battleEst = est;
        const finish = (winner) => {
            done = true; outcome = 0; game.data.battleWinner = winner;
            const me = winner === "a", lost = winner === "b";
            s.wait(0.2, () => {
                play(game, me ? "win" : lost ? "lose" : "draw"); if (!replay) s.wait(0.35, () => play(game, me ? "trophy" : lost ? "heartbreak" : "tap"));
                if (me) { fx.confetti(s.view.width / 2, s.view.height * 0.4, 70, 420); s.flash("#ffffff66", 0.15); for (const v of units.values()) if (v.alive && v.side === 0) hop(v, 0.4); }
                if (lost) { kick = 8; }
                if (!settled) { settled = true; settle(run, winner); try { game.save("psb.run", run); } catch { /* blocked */ } if (run.over) game.save("psb.run", null); }
            });
            return 0.3;
        };
        const next = () => {
            if (backTo) return game.go(backTo, {}, { fade: 0.15 });
            game.go(run.over ? "end" : "shop", {}, { fade: 0.18 });
        };
        const toReplay = () => game.go("battle", { entry, replay: true, back: replay ? backTo : run.over ? "end" : "shop" }, { fade: 0.15 });
        game.battle = { step: () => step(), get done() { return done; }, skip: () => { speed = 40; }, next, units, get outcome() { return outcome; } };

        s.onUpdate((dt) => {
            B.update(); fx.update(dt); intro += dt; flash = Math.max(0, flash - dt * 4); kick = Math.max(0, kick - dt * 34);
            kx = kick ? game.fxRng.range(-kick, kick) : 0; ky = kick ? game.fxRng.range(-kick, kick) : 0;
            if (intro > 0.28 && !slam) { slam = 1; play(game, "vs"); kick = 8; }
            if (done) outcome += dt;
            if (idx === 0) { step(); }
            wait -= dt * speed * pace;
            let guard = 0;
            while (wait <= 0 && idx < ev.length && !done && guard++ < 60) { wait += step(); }
            if (s.input.pressed("confirm")) { if (done && outcome > 0.8) next(); else if (!done) speed = speed > 1 ? 1 : 3; }
            for (const v of units.values()) {
                v.flash = Math.max(0, v.flash - dt * 6); v.shake = Math.max(0, v.shake - dt * 5); v.spawn = Math.min(1, v.spawn + dt * 5); v.stun = Math.max(0, v.stun - dt * speed * pace); v.proc = Math.max(0, (v.proc ?? 0) - dt * 2.4);
                v.sv += (-v.sq * 280 - v.sv * 16) * dt; v.sq += v.sv * dt; v.kx = (v.kx ?? 0) * Math.exp(-dt * 12); v.ky = (v.ky ?? 0) * Math.exp(-dt * 12);
                if (v.fly) { const f = v.fly; f.t += dt; f.vy += 1100 * dt; v.x += f.vx * dt; v.y += f.vy * dt; v.rot += f.vr * dt; continue; }
                let tx = v.hx, ty = v.hy;
                if (v.lunge) { const l = v.lunge; l.t += dt * speed * pace; const k = clamp(l.t / l.dur), p = k < 0.45 ? (k / 0.45) ** 2 : 1 - ((k - 0.45) / 0.55) ** 1.5; tx = lerp(v.hx, l.tx, p * 0.72); ty = lerp(v.hy, l.ty, p * 0.72) - Math.sin(k * Math.PI) * 22; v.x = tx; v.y = ty; if (k >= 1) { v.lunge = null; v.sq = 0.16; } continue; }
                v.x += (tx - v.x) * Math.min(1, dt * 14); v.y += (ty - v.y) * Math.min(1, dt * 14);
            }
            for (let i = proj.length - 1; i >= 0; i--) { const p = proj[i]; p.t += dt * (p.bolt ? 1 : speed * pace); if (p.t >= p.life) proj.splice(i, 1); }
            for (let i = banners.length - 1; i >= 0; i--) { banners[i].t += dt; if (banners[i].t > 1.3) banners.splice(i, 1); }
        });
        s.onDraw((d) => {
            const W = s.view.width, H = s.view.height, L = land();
            const bgw = L ? 640 : 360, bgh = L ? 360 : 640, k = Math.max(W / bgw, H / bgh);
            d.sprite(L ? "bg-ring-l" : "bg-ring-p", { x: W / 2, y: H / 2, width: bgw * k, height: bgh * k });
            d.push(); d.translate(kx, ky);
            // The mat: two team sides and a centre line.
            const size = SIZE(), m = metrics();
            if (L) { const mh = m.pitch * 4 + 14, half = m.gap + m.rw + size * 0.7; panel(d, W / 2 - half / 2 - 2, m.cy, half, mh, { color: "#c6f5e4", radius: 20, gloss: false }); panel(d, W / 2 + half / 2 + 2, m.cy, half, mh, { color: "#ffd0d6", radius: 20, gloss: false }); }
            else { const mw = Math.min(W - 10, m.cw * 4 + 8), mh = m.gap + m.rh + size * 0.74; panel(d, W / 2, m.cy + mh / 2 + 3, mw, mh, { color: "#c6f5e4", radius: 20, gloss: false }); panel(d, W / 2, m.cy - mh / 2 - 3, mw, mh, { color: "#ffd0d6", radius: 20, gloss: false }); }
            d.pop();
            const list = [...units.values()].sort((a, b) => a.y - b.y);
            for (const v of list) drawUnit(d, v, size);
            for (const p of proj) {
                if (p.bolt) { const a = 1 - p.t / p.life; d.additive(() => { d.line([p.px, p.py], [p.x, p.y], { width: 5 * a + 1, color: "#fff27a", opacity: a }); }); continue; }
                const k2 = p.t / p.life, x = lerp(p.sx, p.tx, k2), y = lerp(p.sy, p.ty, k2) - Math.sin(k2 * 3.14) * 30;
                d.circle(11, { x, y, color: p.c, opacity: 0.35 }); if (p.icon) icon(d, p.icon, x, y, 20, { rot: k2 * 8 }); else d.circle(6, { x, y, color: p.c });
            }
            fx.draw(d);
        });
        const drawUnit = (d, v, size) => {
            const live = v.alive || v.fly, off = v.fly ? 0 : Math.sin(s.time * 3 + v.seed) * 1.4;
            if (v.fly && v.y > s.view.height + 80) return;
            const sq = clamp(v.sq, -0.45, 0.45), sc = (v.spawn < 1 ? back(v.spawn) : 1) * (v.star === 3 ? 1.12 : v.star === 2 ? 1.05 : 1) * (v.token ? 0.76 : 1), w = size * sc * (1 + sq), h = size * sc * (1 - sq);
            const x = v.x + (v.kx ?? 0) + (v.shake ? Math.sin(s.time * 70) * v.shake * 3 : 0), y = v.y + (v.ky ?? 0) + off;
            if (!v.fly) shadow(d, v.x, v.hy + size * 0.36, size * 0.6);
            if (v.taunt && !v.fly) d.circle(size * 0.46, { x, y, color: "#ff5f6f", outline: 2.4, opacity: 0.75 });
            if (v.side === 1 && !v.fly) { /* mirror the enemy so they face you */ }
            d.sprite("pets", { frame: frameOf(v.id, v.star), x, y: y - (h - size * sc) / 2, width: w, height: h, rot: v.rot, flipX: v.side === 1 });
            if (v.flash > 0) d.additive(() => d.sprite("pets", { frame: frameOf(v.id, v.star), x, y, width: w, height: h, flipX: v.side === 1, opacity: v.flash * 0.75 }));
            if (v.fly) return;
            // Health bar, stats and status icons sit in one tight strip, big enough to read mid-brawl.
            const bw = size * 0.62, by = v.hy + size * 0.46, hp = clamp(v.hp / v.maxHp), lowCol = hp < 0.34 ? "#ff5f6f" : hp < 0.67 ? "#ffc23f" : "#4fdc8a", r = Math.max(7.5, size * 0.115);
            d.rect(bw + 3, 9, { x: v.hx, y: by, radius: 4.5, color: INK }); d.rect(Math.max(0.1, (bw - 1) * hp), 6, { x: v.hx - (bw - 1) * (1 - hp) / 2, y: by, radius: 3, color: lowCol });
            if (v.shield > 0) { const sw = Math.min(bw, (bw * v.shield) / v.maxHp); d.rect(sw, 3.4, { x: v.hx - (bw - sw) / 2, y: by - 5, radius: 1.7, color: "#7bd6ff" }); }
            for (const [dx, col, n] of [[-bw / 2 - 2, "#ff9f2e", v.atk], [bw / 2 + 2, "#ff4f6f", Math.max(0, v.hp)]]) { d.circle(r + 1.3, { x: v.hx + dx, y: by, color: INK }); d.circle(r, { x: v.hx + dx, y: by, color: col }); number(d, n, v.hx + dx, by, String(n).length > 1 ? r * 1.4 : r * 1.6); }
            if (v.star > 1) pips(d, v.star, v.hx, by + 1, 10);
            let ix = v.hx - bw / 2; const iy = v.hy - size * 0.44;
            if (v.curse) { icon(d, "curse", ix, iy, 15); number(d, v.curse, ix + 11, iy, 11); ix += 20; }
            if (v.soak) { icon(d, "soak", ix, iy, 14); ix += 14; }
            if (v.shield > 0) { icon(d, "shield", v.hx + bw / 2, iy, 15); }
            if (v.stun > 0) { for (let i = 0; i < 3; i++) icon(d, "stun", v.hx + Math.cos(s.time * 7 + i * 2.09) * 20, v.hy - size * 0.42 + Math.sin(s.time * 7 + i * 2.09) * 5, 12); }
        };
        s.onDrawUI((d) => {
            B.begin();
            const W = s.view.width, H = s.view.height, sa = safeTop(game);
            // Header: both shops by name, the rival always marked as a bot.
            const foe = entry.foe.name, top = sa + 18, hw = land() ? Math.min(W - 170, 400) : W - 16;
            panel(d, W / 2, top, hw, 26, { color: "#ffffff", radius: 10 });
            const c = W / 2;
            d.rect(30, 16, { x: c - hw / 2 + 24, y: top, radius: 6, color: "#ff5f6f" });
            small(d, "BOT", c - hw / 2 + 24, top, { size: 11, color: "#fff", bold: true });
            small(d, foe, c + 12, top, { size: 12, bold: true });
            if (replay) { txt(d, matches ? "REPLAY  seed verified" : "REPLAY", W / 2, sa + 44, { size: 13, color: YEL }); }
            else if (run) { const L2 = land(), y = L2 ? top : sa + 44, x0 = L2 ? 16 : W / 2 - 58, x1 = L2 ? W - 56 : W / 2 + 36; for (let i = 0; i < 4; i++) icon(d, i < run.lives ? "heart" : "heartgone", x0 + i * 15, y, 15); number(d, run.wins, x1, y, 16); icon(d, "trophy", x1 + 18, y, 16); }
            for (let i = 0; i < banners.length; i++) {
                const b = banners[i], k = clamp(b.t / 0.18), o = b.t > 1 ? 1 - (b.t - 1) / 0.3 : 1, y = b.side === 2 ? H / 2 : b.side === 0 ? H * (land() ? 0.92 : 0.8) : H * 0.2, x = b.side === 2 ? W / 2 : land() ? W * (b.side === 0 ? 0.25 : 0.75) : W / 2;
                const row = banners.slice(0, i).filter((q) => q.side === b.side).length;
                txt(d, b.text, x + (row % 2 ? 66 : row ? -66 : 0) * (row ? 1 : 0), y + Math.floor((row + 1) / 2) * 20 * (b.side ? 1 : -1) , { size: b.side === 2 ? 30 : 15, color: "#fff", opacity: o * k, inkColor: b.col });
            }
            if (!done) {
                B.button(d, "speed", W - 34, H - safeBot(game) - 30, 52, 42, { icon: "fast", color: speed > 1 ? YEL : "#b48cff", fn: () => { speed = speed > 1 ? 1 : 3; } });
                if (intro < 1.1) { const a = clamp(intro / 0.28), o = intro > 0.8 ? 1 - (intro - 0.8) / 0.3 : 1, z = 1.8 - back(a) * 0.8; d.push(); d.translate(W / 2, H / 2); d.scale(z, z); txt(d, `ROUND ${entry.round}`, 0, -16, { size: 16, color: YEL, opacity: o }); txt(d, "BRAWL!", 0, 12, { size: 44, color: "#ffffff", opacity: o, inkColor: "#e8308a", edge: 3 }); d.pop(); }
            } else if (outcome > 0.35) {
                const w = res.winner, k = back(clamp((outcome - 0.35) / 0.3)), lost = w === "b";
                const title = w === "a" ? "YOU WIN!" : lost ? "BONKED!" : "DRAW!";
                d.push(); d.translate(W / 2, H * 0.44); d.scale(k, k); d.rotate(-0.05);
                txt(d, title, 0, 0, { size: 48, color: w === "a" ? YEL : lost ? "#ff8a9a" : "#ffffff", edge: 3.2, inkColor: w === "a" ? "#e8308a" : INK }); d.pop();
                const sub = replay ? "Same seed, same brawl." : w === "a" ? "+1 trophy" : lost ? "-1 life" : "No trophy, no harm done.";
                txt(d, sub, W / 2, H * 0.44 + 40, { size: 16, opacity: clamp((outcome - 0.5) * 4) });
                if (!replay && w !== "draw") { const q = back(clamp((outcome - 0.5) / 0.3)); icon(d, w === "a" ? "trophy" : "heartgone", W / 2, H * 0.44 - 62, 64 * q, { rot: Math.sin(outcome * 3) * 0.08 }); }
                if (outcome > 0.7) { const by = H - safeBot(game) - 36; B.button(d, "next", W / 2 + 56, by, 140, 50, { label: "NEXT", color: "#3fd6a8", fn: next, size: 20 }); B.button(d, "replay", W / 2 - 80, by, 92, 50, { label: "REPLAY", icon: null, color: "#b48cff", fn: toReplay, size: 13 }); }
            }
        });
    });
}
export const safeTop = (game) => game.view.safe?.top ?? 0;
export const safeBot = (game) => game.view.safe?.bottom ?? 0;
