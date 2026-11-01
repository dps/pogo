// Title, end card, pause and the small panels. Everything sits over the live world, and every menu is one tap from running.
import { button, pin, pos, ui, layer, tap, sprite, rect } from "./pogo.js";
import { BIOMES, DISGUISES, DISGUISE_IDS, MAX_MULT, OSTRICHES } from "./data.js";
import { CREAM, FONT, GOLD, INK, RED, chunky, digits, pill } from "./hud.js";
import { activeMissions, dayNumber, missionValue, saveProfile, skinById } from "./profile.js";

const WARM = "#e8432e", TEAL = "#1f9e8f", PLUM = "#4a2f5e";

export class Menus {
    constructor(play) {
        this.play = play; this.game = play.game; this.s = play.s;
        this.items = []; this.modal = null; this.screen = null; this.t = 0; this.shopI = 0;
    }
    get pf() { return this.play.pf; }
    clear() { for (const e of this.items) e.destroy(); this.items.length = 0; this.screen = null; this.modal = null; }
    reflow() { const f = this.rebuild; if (f) f(); }
    tick(dt) { this.t += dt; }
    add(comps) { const e = this.s.add(comps); this.items.push(e); return e; }
    btn(label, x, y, o) {
        const anchor = o.anchor ?? "center";
        return this.add([button(label, { onTap: o.onTap, width: o.w ?? 130, height: o.h ?? 48, color: o.color ?? WARM, textColor: o.textColor ?? "#fff", textSize: o.size ?? 17, radius: o.radius ?? 15, action: o.action }), pin(anchor, [x, y]), layer(20)]);
    }
    /** A dark sheet that sits under the buttons, so they stay bright. */
    dim(alpha = "cc") {
        const s = this.s;
        this.add([ui(), layer(10), { draw(d) { const v = s.view; d.push(); d.translate(v.width / 2, v.height / 2); d.rect(v.width + 4, v.height + 4, { color: `#2c2030${alpha}` }); d.pop(); } }]);
    }
    show(name, fn) {
        this.clear(); this.screen = name; this.t = 0; this.rebuild = () => { const n = this.screen, m = this.modal; this.clear(); this.screen = n; this.modal = m; fn(); }; fn();
    }

    // --- Title --------------------------------------------------------------------------------
    title() {
        this.show("title", () => {
            const v = this.s.view, wide = v.width > v.height, y = wide ? 10 : 14, W = 72, gap = 8, n = 4;
            const list = [["Daily", () => this.daily(), "#ff8a22"], ["Birds", () => this.shop(), TEAL], ["Goals", () => this.missions(), PLUM], ["Places", () => this.places(), "#2472c8"]];
            list.forEach(([label, fn, color], i) => this.btn(label, wide ? (i - 1.5) * 96 : (i - (n - 1) / 2) * (W + gap), wide ? y : y, { anchor: "bottom", w: wide ? 88 : W, h: 46, color, onTap: fn, size: 15, radius: 14 }));
            const gear = this.add([sprite("gear", { width: 52, height: 52 }), pin("top-right", [8, 8]), layer(20), tap(() => this.settings())]);
            gear.name = "settings";
        });
    }
    drawTitle(d) {
        const v = this.s.view, wide = v.width > v.height, P = this.pf;
        const cx = wide ? v.width * 0.3 : v.width / 2, top = v.safe.top + (wide ? Math.min(v.width * 0.44, 340) * 0.263 + 8 : 118), size = Math.min(wide ? 64 : 62, v.width * (wide ? 0.09 : 0.165));
        const wob = Math.sin(this.t * 2) * 0.012;
        d.push(); d.translate(cx, top); d.rotate(-0.045 + wob);
        const dropIn = Math.min(1, this.t * 3.5), s = dropIn < 1 ? 0.5 + dropIn * dropIn * 0.7 : 1 + Math.sin(this.t * 3) * 0.008;
        d.scale(s);
        const lw = wide ? Math.min(v.width * 0.44, 340) : Math.min(v.width * 0.96, 440);
        d.sprite("logo", { width: lw, height: lw * 400 / 760 });
        d.pop();
        const pulse = 1 + Math.sin(this.t * 5) * 0.05;
        // hint
        const hintY = wide ? v.height * 0.66 : v.height - v.safe.bottom - 84;
        d.push(); d.translate(cx, hintY); d.scale(pulse);
        chunky(d, this.s.input.touchMode ? "TAP TO LEG IT" : "PRESS SPACE TO LEG IT", 0, 0, 21, "#ffffff", INK, 2.2);
        d.pop();
        if (P.best > 0) { pill(d, cx, wide ? v.height * 0.5 : hintY - 34, 170, 26); d.text(`Best ${P.best.toLocaleString("en-GB")}`, { x: cx, y: wide ? v.height * 0.5 : hintY - 34, size: 14, bold: true, color: CREAM, font: FONT }); }
    }

    // --- End of a run -------------------------------------------------------------------------
    over(best, line) {
        this.info = { best, line, run: this.play.run };
        this.show("over", () => {
            const v = this.s.view, wide = v.width > v.height, y = 14;
            const home = () => { this.play.toTitle(); };
            this.btn("Home", wide ? -70 : -86, y, { anchor: "bottom", w: 120, h: 46, color: PLUM, onTap: home, size: 16 });
            this.btn("Birds", wide ? 70 : 86, y, { anchor: "bottom", w: 120, h: 46, color: TEAL, onTap: () => this.shop(), size: 16 });
        });
    }
    drawOver(d) {
        const v = this.s.view, I = this.info, run = I.run, t = this.t, wide = v.width > v.height;
        const cx = wide ? v.width * 0.72 : v.width / 2, cw = Math.min(wide ? v.width * 0.46 : v.width - 26, 320), top = v.safe.top + (wide ? 20 : 34);
        const into = Math.min(1, t * 7), pop = into < 1 ? 0.7 + into * 0.42 : 1.12 - Math.min(1, (t - 0.14) * 7) * 0.12;
        const H = wide ? 196 : 212, cy = top + H / 2;
        d.push(); d.translate(cx, cy); d.scale(pop); d.rotate(-0.012);
        d.rect(cw + 8, H + 8, { color: INK, radius: 22 });
        d.rect(cw, H, { color: CREAM, radius: 18 });
        chunky(d, run.reason === "crash" ? "SPLAT!" : "CAUGHT!", 0, -H / 2 + 32, 36, RED, INK, 3);
        d.text(I.line, { y: -H / 2 + 62, size: 13.5, bold: true, color: PLUM, font: FONT, maxWidth: cw - 26 });
        digits(d, run.score, 0, -H / 2 + 100, 38);
        if (I.best) { chunky(d, "NEW BEST!", 0, -H / 2 + 128, 17, GOLD, INK, 2); }
        const rowY = H / 2 - 44;
        d.text(`${Math.floor(run.stats.dist).toLocaleString("en-GB")} m`, { x: -cw / 4 - 8, y: rowY, size: 18, bold: true, color: INK, font: FONT });
        d.sprite("egg_icon", { x: cw / 4 - 28, y: rowY, width: 19, height: 21 });
        d.text(`${run.eggCount}`, { x: cw / 4 + 6, y: rowY, size: 18, bold: true, color: INK, font: FONT });
        const m = activeMissions(this.pf)[0];
        if (m) {
            const val = Math.min(m.goal, Math.floor(missionValue(this.pf, m, m.run ? run.stats : null)));
            d.text(m.text, { y: H / 2 - 17, size: 12, bold: true, color: PLUM, font: FONT, maxWidth: cw - 16 });
        }
        d.pop();
        const pulse = 1 + Math.sin(t * 7) * 0.06, y = wide ? top + H + 44 : v.height - v.safe.bottom - 86;
        d.push(); d.translate(cx, y); d.scale(pulse);
        chunky(d, this.s.input.touchMode ? "TAP TO GO AGAIN" : "SPACE TO GO AGAIN", 0, 0, 25, "#ffffff", INK, 2.6);
        d.pop();
    }

    // --- Finale -------------------------------------------------------------------------------
    win() {
        this.show("win", () => {
            this.btn("Home", 0, 14, { anchor: "bottom", w: 130, h: 46, color: PLUM, onTap: () => { this.play.bankWin(); this.play.toTitle(); }, size: 16 });
        });
    }
    drawWin(d) {
        const v = this.s.view, t = this.t, cx = v.width / 2, wide = v.width > v.height, top = v.safe.top + (wide ? 44 : 110), run = this.play.run;
        d.push(); d.translate(cx, top); d.rotate(-0.04); d.scale(Math.min(1.05, t * 4));
        chunky(d, "GETAWAY!", 0, 0, wide ? 48 : Math.min(62, v.width * 0.16), GOLD, INK, 5);
        d.pop();
        const w = Math.min(v.width - 26, 330);
        d.push(); d.translate(cx, top + (wide ? 72 : 84)); d.rect(w, 72, { color: "#2c2030ee", radius: 14 });
        d.text("Keith has left the planet.", { y: -18, size: 16, bold: true, color: CREAM, font: FONT });
        d.text("Unlocked: Goldie. Farmer: inconsolable.", { y: 8, size: 13, bold: true, color: GOLD, font: FONT, maxWidth: w - 20 });
        d.pop();
        digits(d, run.score, cx, top + (wide ? 136 : 150), 36);
        const pulse = 1 + Math.sin(t * 6) * 0.05;
        d.push(); d.translate(cx, v.height - v.safe.bottom - 86); d.scale(pulse);
        chunky(d, "TAP TO KEEP RUNNING", 0, 0, 22, "#ffffff", INK, 2.4);
        d.pop();
    }

    // --- Panels -------------------------------------------------------------------------------
    panel(name, build) {
        const back = this.screen, wasOver = back === "over" || back === "win";
        const previous = this.rebuild;
        const go = () => {
            this.clear(); this.screen = name; this.modal = name;
            this.backTo = wasOver ? "over" : "title";
            if (name !== "shop") this.dim();
            build();
            this.btn("Back", 0, 12, { anchor: "bottom", w: 150, h: 46, color: PLUM, onTap: () => this.closePanel(previous), action: "pause", size: 16 });
        };
        this.rebuild = go; this.t = 0; go();
    }
    closePanel(previous) {
        this.game.sound.play("tick");
        this.modal = null; this.clear();
        this.rebuild = previous; previous?.();
        this.screen = this.backTo === "over" ? "over" : "title";
    }
    shop() {
        this.shopI = Math.max(0, OSTRICHES.findIndex((o) => o.id === this.pf.skin));
        const rig = this.play.stage.rig;
        this.panel("shop", () => {
            const v = this.s.view, o = OSTRICHES[this.shopI], own = this.pf.owned.includes(o.id), W = v.width;
            const y = 66;
            const dx = Math.min(140, W / 2 - 40);
            const step = (n) => { this.shopI = (this.shopI + n + OSTRICHES.length) % OSTRICHES.length; rig.setSkin(OSTRICHES[this.shopI]); this.game.sound.play("tick", "tick"); this.t = 0; this.rebuild(); };
            this.btn("<", -dx, y, { anchor: "bottom", w: 54, h: 50, color: TEAL, onTap: () => step(-1), action: "left", size: 24 });
            this.btn(">", dx, y, { anchor: "bottom", w: 54, h: 50, color: TEAL, onTap: () => step(1), action: "right", size: 24 });
            const equipped = this.pf.skin === o.id;
            const label = !own ? (o.cost < 0 ? "Reach the rocket" : `Buy for ${o.cost}`) : equipped ? "Wearing" : "Choose";
            const afford = own || (o.cost >= 0 && this.pf.bank >= o.cost);
            this.btn(label, 0, y, { anchor: "bottom", w: Math.min(164, W - 150), h: 50, color: equipped ? "#8f8a84" : afford ? WARM : "#8f8a84", size: label.length > 12 ? 14 : 17, onTap: () => {
                if (!own) {
                    if (!afford) { this.game.sound.play("wall", "error"); return; }
                    this.pf.bank -= o.cost; this.pf.owned.push(o.id); this.game.sound.play("buy", "success");
                } else this.game.sound.play("tick", "light");
                this.pf.skin = o.id; saveProfile(this.game, this.pf); this.rebuild();
            } });
        });
    }
    drawShop(d) {
        const v = this.s.view, o = OSTRICHES[this.shopI], cx = v.width / 2, by = v.height - v.safe.bottom - 170, w = Math.min(v.width - 26, 330);
        const top = v.safe.top + 34;
        chunky(d, "THE FLOCK", cx, top, 32, GOLD, INK, 3);
        d.sprite("egg_icon", { x: cx - 26, y: top + 34, width: 19, height: 21 });
        d.text(`${this.pf.bank}`, { x: cx + 8, y: top + 34, size: 17, bold: true, color: "#fff", font: FONT });
        d.push(); d.translate(cx, by); d.rect(w, 80, { color: "#2c2030ee", radius: 16 });
        d.text(o.name, { y: -20, size: 24, bold: true, color: GOLD, font: FONT });
        d.text(o.bio, { y: 13, size: 14, bold: true, color: CREAM, font: FONT, maxWidth: w - 26 });
        d.pop();
    }
    missions() { this.panel("missions", () => {}); }
    drawMissions(d) {
        const v = this.s.view, cx = v.width / 2, list = activeMissions(this.pf), w = Math.min(v.width - 24, v.width > v.height ? 520 : 340), top = v.safe.top + 34;
        chunky(d, "THINGS TO DO", cx, top, 30, GOLD, INK, 3);
        d.text(`Score multiplier x${this.pf.mult}, up to x${MAX_MULT}. Each job adds one.`, { x: cx, y: top + 32, size: 13, bold: true, color: CREAM, font: FONT, maxWidth: w });
        const y0 = top + 86, h = Math.min(84, (v.height - y0 - 80 - v.safe.bottom) / 3 - 8);
        list.forEach((m, i) => {
            const y = y0 + i * (h + 8), val = Math.min(m.goal, Math.floor(missionValue(this.pf, m, null))), k = m.run ? 0 : val / m.goal;
            d.push(); d.translate(cx, y); d.rect(w, h, { color: CREAM, radius: 14 });
            const flat = h < 56;           // Short landscape screens get one line per job.
            d.text(m.text, { x: flat ? -w * 0.14 : 0, y: flat ? 0 : -h / 4, size: 14.5, bold: true, color: INK, font: FONT, maxWidth: w - 20 });
            d.sprite("egg_icon", { x: flat ? w / 2 - 54 : -w / 2 + 24, y: flat ? 0 : h / 4 - 1, width: 15, height: 17 });
            d.text(`${m.pay}`, { x: flat ? w / 2 - 30 : -w / 2 + 48, y: flat ? 0 : h / 4 - 1, size: 13, bold: true, color: PLUM, font: FONT });
            if (!flat) {
                pill(d, w / 8, h / 4, w / 2, 10, "#2c203033");
                if (k > 0) pill(d, w / 8 - w / 4 * (1 - k), h / 4, w / 2 * k, 10, RED);
                if (m.run) d.text("in one run", { x: w / 8, y: h / 4 - 1, size: 10.5, bold: true, color: PLUM, font: FONT });
            }
            d.pop();
        });
        if (!list.length) chunky(d, "ALL DONE. BLIMEY.", cx, v.height / 2, 24, "#fff");
    }
    places() {
        this.panel("places", () => {
            const v = this.s.view, cols = v.width > v.height ? 3 : 2, cw = Math.min(148, (v.width - 30) / cols - 6), ch = cw * 0.68, top = v.safe.top + 76;
            const hit = (v.height - top - 72 - v.safe.bottom) / Math.ceil(6 / cols);
            const space = Math.min(hit, ch + 34);
            BIOMES.forEach((b, i) => {
                const col = i % cols, row = Math.floor(i / cols), x = v.width / 2 + (col - (cols - 1) / 2) * (cw + 10), y = top + space * (row + 0.5);
                const seen = this.pf.seen.includes(i);
                const card = this.add([sprite(`pc_${b.id}`, { width: cw, height: Math.min(ch, space - 26), color: seen ? "#ffffff" : "#544a5c" }), pos(x, y - 8), ui(), layer(20), tap(() => {
                    if (!seen) { this.game.sound.play("wall", "error"); return; }
                    this.game.sound.play("tick", "light");
                    this.play.begin({ start: b.start ? b.start + 26 : 0, noTutorial: true, heat: 0.2 });
                })]);
                card.placeI = i;
            });
        });
    }
    drawPlaces(d) {
        const v = this.s.view, cx = v.width / 2, cols = v.width > v.height ? 3 : 2, cw = Math.min(148, (v.width - 30) / cols - 6), ch = cw * 0.68, top = v.safe.top + 76;
        chunky(d, "POSTCARDS", cx, v.safe.top + 30, 30, GOLD, INK, 3);
        d.text("Tap a place to start there", { x: cx, y: v.safe.top + 58, size: 13, bold: true, color: CREAM, font: FONT });
        const hit = (v.height - top - 72 - v.safe.bottom) / Math.ceil(6 / cols), space = Math.min(hit, ch + 34);
        BIOMES.forEach((b, i) => {
            const col = i % cols, row = Math.floor(i / cols), x = cx + (col - (cols - 1) / 2) * (cw + 10), y = top + space * (row + 0.5), seen = this.pf.seen.includes(i), h = Math.min(ch, space - 26);
            d.text(seen ? b.name : "???", { x, y: y + h / 2 + 2, size: 12.5, bold: true, color: seen ? "#fff" : "#c8bfd2", font: FONT });
        });
    }
    /** Locks are drawn over the sprites, on the top UI hook. */
    drawLocks(d) {
        for (const e of this.items) if (e.placeI !== undefined && !this.pf.seen.includes(e.placeI)) d.sprite("lock", { x: e.pos.x, y: e.pos.y, width: 34, height: 34 });
    }
    daily() {
        const P = this.pf, day = dayNumber();
        const twist = DISGUISE_IDS[day % DISGUISE_IDS.length], start = BIOMES[day % 3].start;
        this.dailyInfo = { day, twist, start, place: BIOMES[day % 3].name };
        this.panel("daily", () => {
            const v = this.s.view;
            this.btn("Run today", 0, 66, { anchor: "bottom", w: 200, h: 52, color: WARM, size: 19, action: "confirm", onTap: () => this.play.begin({ seed: day, start: start ? start + 26 : 0, disguise: twist, daily: true, noTutorial: true, heat: 0.2 }) });
        });
    }
    drawDaily(d) {
        const v = this.s.view, cx = v.width / 2, I = this.dailyInfo, k = this.pf.daily, w = Math.min(v.width - 26, 330), top = v.safe.top + 34;
        chunky(d, "DAILY RUN", cx, top, 32, GOLD, INK, 3);
        const cy = Math.min(top + 140, v.height / 2 - 10);
        d.push(); d.translate(cx, cy); d.rect(w, 150, { color: CREAM, radius: 18 });
        d.sprite(`b_${I.twist}`, { x: -w / 2 + 56, y: -28, width: 70, height: 70 });
        d.text("Same road for everyone today", { x: 40, y: -56, size: 14, bold: true, color: PLUM, font: FONT, maxWidth: w - 110 });
        d.text(`Start in ${I.place}`, { x: 40, y: -30, size: 15, bold: true, color: INK, font: FONT, maxWidth: w - 110 });
        d.text(`wearing a ${DISGUISES[I.twist].name}`, { x: 40, y: -8, size: 15, bold: true, color: RED, font: FONT, maxWidth: w - 110 });
        const best = k.day === I.day ? k.best : 0;
        d.text(`Today's best ${best.toLocaleString("en-GB")}`, { y: 32, size: 15, bold: true, color: INK, font: FONT });
        d.text(k.day === I.day ? `Streak ${k.streak}: back tomorrow for 50 eggs` : "First run today pays 50 eggs", { y: 56, size: 13, bold: true, color: PLUM, font: FONT, maxWidth: w - 24 });
        d.pop();
    }
    settings() {
        this.panel("settings", () => {
            const v = this.s.view, P = this.pf, rows = [["Sound", "sound"], ["Music", "music"], ["Haptics", "haptics"]];
            rows.forEach(([label, key], i) => this.btn(`${label}: ${P[key] ? "On" : "Off"}`, 0, -34 + i * 60, { w: 210, h: 50, color: P[key] ? TEAL : "#8f8a84", onTap: () => {
                P[key] = !P[key];
                this.game.sound.apply(P);
                if (key === "music" && P.music) this.game.sound.song(this.play.phase === "run" ? BIOMES[this.play.run.biome].id : "title");
                if (key === "haptics" && P.haptics) this.game.haptic("medium");
                saveProfile(this.game, P); this.rebuild();
            }, size: 18 }));
        });
    }
    drawSettings(d) {
        const v = this.s.view;
        chunky(d, "SETTINGS", v.width / 2, v.height / 2 - 96, 32, GOLD, INK, 3);
    }
    pause() {
        const play = this.play, s = this.s;
        if (s.paused) return;
        s.paused = true;
        play.game.sound.hush();
        const resume = () => { s.paused = false; this.clear(); };
        const quit = () => { s.paused = false; this.clear(); play.bankWin(); play.toTitle(); };
        this.show("pause", () => {
            const P = this.pf;
            this.dim("aa");
            this.btn("Keep running", 0, -66, { w: 210, h: 54, color: WARM, onTap: resume, action: "pause", size: 19 });
            [["Sound", "sound"], ["Music", "music"], ["Haptics", "haptics"]].forEach(([label, key], i) => this.btn(`${label}: ${P[key] ? "On" : "Off"}`, (i - 1) * 104, 0, { w: 98, h: 46, color: P[key] ? TEAL : "#8f8a84", size: 12.5, onTap: () => { P[key] = !P[key]; this.game.sound.apply(P); saveProfile(this.game, P); this.rebuild(); } }));
            this.btn("Give up", 0, 66, { w: 150, h: 46, color: PLUM, onTap: quit, size: 16 });
        });
        this.modal = "pause";
    }
    drawPause(d) {
        const v = this.s.view;
        chunky(d, "PAUSED", v.width / 2, v.height / 2 - 142, 34, GOLD, INK, 3);
        d.text("Keith is pretending to be a shrub.", { x: v.width / 2, y: v.height / 2 - 112, size: 13.5, bold: true, color: CREAM, font: FONT });
    }
    /** In-run pause button. Kept apart from clear(), since it lives for the whole scene. */
    drawHudButton(d) {}
    draw(d) {
        const name = this.screen;
        if (name === "title") this.drawTitle(d);
        else if (name === "over") this.drawOver(d);
        else if (name === "win") this.drawWin(d);
        else if (name === "shop") this.drawShop(d);
        else if (name === "missions") this.drawMissions(d);
        else if (name === "places") { this.drawPlaces(d); this.drawLocks(d); }
        else if (name === "daily") this.drawDaily(d);
        else if (name === "settings") this.drawSettings(d);
        else if (name === "pause") this.drawPause(d);
    }
}
