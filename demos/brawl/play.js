// One run of one stage: wires input to the sim, sim events to juice, and owns the overlays.
import { BTN, DIFFS, HEROES, METER_BAR, STAGES } from "./data.js";
import { Sim } from "./sim.js";
import { C } from "./art.js";
import { View, FONT, comic } from "./view.js";
import { Pad, drawHud } from "./hud.js";
import { Coach } from "./coach.js";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ACT = [["atk", BTN.A], ["hvy", BTN.H], ["jmp", BTN.J], ["spc", BTN.S], ["ddg", BTN.G], ["tag", BTN.T]];

export class Play {
    constructor(game, s, a, kit) {
        this.g = game; this.s = s; this.a = a; this.kit = kit; this.sound = kit.sound;
        const stage = a.stage ?? 0, diff = DIFFS[a.diff ?? 0];
        this.sim = new Sim({ stage, mode: a.mode ?? "story", seed: a.seed ?? 1 + stage * 17 + (kit.runs = (kit.runs ?? 0) + 1), diff, start: a.start ?? 0, hp: a.carry?.hp, meter: a.carry?.meter ?? 0, active: a.carry?.active ?? "dot" });
        this.view = new View(s, this.sim, kit.cast, kit.sound);
        if (a.start) this.view.camX = this.sim.hero.x + 120;
        this.st = this.view.st;
        this.pad = new Pad(game, kit.cast, this.st); this.pad.mouseFirst = () => kit.onScreen();
        kit.setPad(this.pad);
        this.hud = { g: game, hp: 1, lag: 1, score: 0, comboPop: 0, gradePop: 0, comboShow: 0, comboN: 0, deck: this.view.deck, mode: a.mode, bossLag: 1, bossFade: 0 };
        this.coach = stage === 0 && a.mode !== "score" ? new Coach(this, kit) : null;
        this.acc = 0; this.latch = 0; this.slowT = 0; this.card = { t: 0, life: 110 }; this.bossCard = null; this.cut = null; this.done = 0; this.t = 0; this.paused = false; this.tint = 0; this.flood = 0; this.hurtFlash = 0; this.quiet = 1; this.lane = 0;
        this.overlays = []; this.goT = 400;
        const g = game;
        // Hit-stop freezes the world, so edges are latched by a UI entity that never stops.
        s.add([{ ui: true, update: () => this.preStep() }]);
        s.onUpdate((dt) => this.tick(dt));
        s.onDraw((d) => this.view.draw(d));
        s.onDrawUI((d) => this.drawUI(d));
        s.on("resize", () => { this.view.layout(); this.pad.layout(); this.hud.deck = this.view.deck; });
        // Fingers still down when the scene goes must not leak into the next one, and a hush must not outlive Ms. Shush.
        s.on("leave", () => { this.pad.reset(); kit.setPad(null); const mg = game.audio.music?.gain?.gain; if (mg && this.mg0 != null) mg.value = this.mg0; });
        this.sound.music(STAGES[stage].song);
        this.sound.play("bell");
        game.data.scene = "play"; game.data.stage = stage;
    }
    preStep() {
        const I = this.s.input, g = this.g;
        void I.pointer;
        for (const [a, b] of ACT) if (I.pressed(a)) this.latch |= b;
        this.pad.show = this.kit.onScreen();
        if (I.pressed("pause")) this.togglePause();
        this.pad.meter = this.sim.meter; this.pad.tagReady = this.sim.tagCd <= 0 && this.sim.other(this.sim.hero).hp > 0; this.pad.other = this.sim.other(this.sim.hero).key;
        this.t++;
        this.tickCards();
    }
    mask() {
        const I = this.s.input, mv = I.move; let m = this.pad.read() | this.latch; this.latch = 0;
        if (mv.x > 0.3) m |= BTN.R; else if (mv.x < -0.3) m |= BTN.L;
        if (mv.y > 0.3) m |= BTN.D; else if (mv.y < -0.3) m |= BTN.U;
        for (const [a, b] of ACT) if (I.down(a)) m |= b;
        return m;
    }
    tick(dt) {
        if (this.paused) return;
        const s = this.s, sim = this.sim;
        const want = this.slowT > 0 || sim.slow > 0 ? 0.3 : 1;
        if (this.slowT > 0) this.slowT--;
        s.timeScale = want;
        this.acc += dt * 60;
        while (this.acc >= 1) {
            this.acc -= 1;
            sim.step(this.coach?.script ? this.coach.script(this.mask()) : this.mask());
            this.view.update();
            this.drain();
            this.coach?.update();
        }
        this.g.data.score = sim.score; this.g.data.hp = sim.hero.hp; this.g.data.phase = sim.phase; this.g.data.combo = sim.combo; this.g.data.grade = sim.grade;
        if (sim.over) { if (++this.done === (sim.over.win ? 70 : 90)) this.finish(); }
    }
    finish() {
        const sim = this.sim, o = sim.over, a = this.a;
        const carry = { hp: { dot: Math.min(sim.team.dot.maxHp, Math.max(60, sim.team.dot.hp + 60)), pip: Math.min(sim.team.pip.maxHp, Math.max(50, sim.team.pip.hp + 50)) }, meter: sim.meter, active: sim.hero.key };
        this.g.go("result", { ...a, win: o.win, over: o, score: sim.score, stats: { ...sim.stats, best: sim.bestCombo, secs: sim.tick / 60, tags: sim.stats.tags }, carry: o.win ? carry : a.carry, arena: Math.max(0, sim.arena) }, { fade: 0.3 });
    }
    togglePause() { if (this.sim.over) return; this.kit.pause(this); }

    // --- Juice --------------------------------------------------------------------------------------------------------
    drain() {
        const ev = this.sim.events;
        if (!ev.length) return;
        for (const e of ev) this.on(e);
        ev.length = 0;
    }
    on(e) {
        const s = this.s, v = this.view, S = this.sound, sim = this.sim;
        this.coach?.event(e);
        const shake = (a, t) => s.shake(a, t, { haptic: false });
        switch (e.t) {
            case "hit": {
                const big = e.big, boss = e.boss;
                s.freeze((e.freeze ?? 2) / 60);
                if (boss) S.play("bossHit"); else if (e.word === "CLANG") S.play("clang"); else if (e.word === "BONK" || e.word === "KLONK") S.play("bonk"); else if (big) S.play("big"); else S.hit();
                v.burst(e.x, e.y, e.z, big ? 1.15 : 0.62, big ? C.orange : C.mustard);
                if (big) { v.ring(e.x, e.y, e.z, 1.2, C.cream); shake(5, 0.16); v.punch = Math.max(v.punch, 0.05); v.speed(e.x, e.y, e.z, e.dir ?? 1, 4); v.chips(e.x, e.y, e.z, 9, [C.mustard, C.tomato, C.lime], 8); }
                else { shake(1.6, 0.06); v.chips(e.x, e.y, e.z, 4, [C.mustard, C.cream], 5); }
                if (big) v.word(`${e.word}!`, e.x, e.y + 34, e.z, true, e.combo);
                else if (e.combo % 3 === 0) v.word(e.word ?? "BOP", e.x, e.y + 26, e.z, false, e.combo);
                this.hud.comboPop = 1;
                if (e.combo > 0 && e.combo % 10 === 0) { S.play("combo"); v.word(`${e.combo} HITS!`, sim.hero.x, sim.hero.y + 170, sim.hero.z, true, 1); }
                if (e.shock) { v.ring(e.x, 0, e.z, 2, C.cream, 16); v.splat(e.x, e.z, "#ffad33", 0.7); }
                break;
            }
            case "swing": S.play(e.heavy ? "swingH" : "swing", { silent: true }); this.trail(e); break;
            case "block": S.play("block"); v.burst(e.x, e.y, e.z, 0.5, C.cream); v.word("TINK", e.x, e.y + 20, e.z); s.freeze(2 / 60); this.coach?.block(); break;
            case "shieldBreak": S.play("crack"); v.burst(e.x, e.y, e.z, 1.4, C.cream); v.word("CRACK!", e.x, e.y + 40, e.z, true, 2); shake(7, 0.2); s.freeze(8 / 60); v.chips(e.x, e.y, e.z, 12, ["#8fa8c8", C.cream], 9); break;
            case "armor": S.play("block"); break;
            case "stagger": S.play("crack"); v.word(e.boss ? "STAGGERED!" : "DIZZY!", e.x, e.y + 40, e.z, true, 1); s.freeze(9 / 60); shake(6, 0.2); break;
            case "launch": S.play("toss", { silent: true }); v.speed(e.x, e.y + 40, e.z, 0, 0); break;
            case "groundBounce": S.play("bonk"); v.ring(e.x, 0, e.z, 1.6, C.cream); shake(4, 0.12); v.word("BOING!", e.x, 50, e.z, false, 3); break;
            case "thud": if (!e.soft) S.play("land", { silent: true }); v.chips(e.x, 6, e.z, 5, ["#d8c8b0", "#ffffff"], 4); break;
            case "wall": S.play("big"); v.burst(e.x, e.y, e.z, 1.2, C.orange); v.word("WALL SPLAT!", e.x, e.y + 30, e.z, true, 3); shake(8, 0.22); s.freeze(9 / 60); v.punch = 0.07; break;
            case "lastKo": this.slowT = 26; v.punch = 0.1; s.flash("#ffffff", 0.08); break;
            case "freed": {
                S.play("freed");
                v.food(e.x, e.y, e.z, { kid: "f_broc", tot: "f_tot", tray: "f_broc", lobber: "f_pud", stink: "f_cheese", big: "f_joe", mini: "p_gravy" }[e.type] ?? "f_broc");
                v.word(["FREE!", "THANKS!", "PHEW!", "WHEE!", "NO MORE PEAS!"][sim.stats.freed % 5], e.x, e.y + 26, e.z, false, 2);
                break;
            }
            case "grab": S.play("grab"); v.word("GOTCHA!", e.x, 150, e.z, false, 0); break;
            case "bonk": S.play("bonk"); v.burst(e.x, 70, e.z, 0.7, C.mustard); s.freeze(4 / 60); shake(2.4, 0.08); this.hud.comboPop = 1; break;
            case "throw": S.play("toss"); v.word("YEET!", e.x, 110, e.z, true, 1); v.speed(e.x, e.y + 40, e.z, e.dir, 5); break;
            case "toss": S.play("toss"); break;
            case "strike": S.play("strike"); v.word("STRIKE!!", e.x, 130, e.z, true, 1); s.flash("#ffc52e", 0.14); shake(8, 0.2); break;
            case "explode": S.play("explode"); v.burst(e.x, 60, e.z, 2.4, "#a4e05a"); v.ring(e.x, 40, e.z, 3, "#a4e05a", 22); v.word("PEE-YEW!", e.x, 100, e.z, true, 3); v.splat(e.x, e.z, "#a4e05a", 1.4); shake(11, 0.3); s.freeze(5 / 60); break;
            case "slip": S.play("splat"); v.word(e.word, e.x, 100, e.z, false, 1); break;
            case "jump": S.play("jump"); if (e.chase) v.speed(e.x, 60, e.z, 0, 0); break;
            case "land": S.play("land", { silent: true }); v.chips(e.x, 4, e.z, 4, ["#ffffff", "#d8c8b0"], 3); break;
            case "dodge": S.play("dodge"); break;
            case "perfect": S.play("perfect"); v.word("NICE TRY!", e.x, 170, e.z, true, 2); v.ring(e.x, 60, e.z, 2, "#7ff0ff", 22); s.flash("#7ff0ff", 0.1); break;
            case "tel": S.play(e.heavy ? "telBig" : "tel", { silent: !e.heavy }); break;
            case "enemySwing": S.play("swing", { silent: true }); break;
            case "hurt": S.play("hurt"); v.burst(e.x, e.y, e.z, 1, C.tomato); shake(e.knock ? 9 : 5, 0.22); s.freeze(5 / 60); this.hurtFlash = 1; v.word(e.dmg > 13 ? "OOF!" : "OW!", e.x, e.y + 34, e.z, false, 1); break;
            case "chip": S.play("splat", { silent: true }); this.hurtFlash = 0.5; break;
            case "splat": S.play("splat"); v.splat(e.x, e.z, { gravy: "#8a4a24", peas: "#8fd13f", ball: "#e84a3a", beaker: "#7fe05a", book: "#3a7f8c", custard: "#ffd84a", slip: "#ff9ac8", crouton: "#e8b05c" }[e.kind] ?? "#8a4a24", e.big ? 1.2 : 0.7); v.chips(e.x, 10, e.z, 6, [C.lime, C.mustard], 5); break;
            case "pickup": S.play(e.weapon ? "weapon" : "food"); v.word(e.weapon ? `${e.kind.toUpperCase()}!` : e.kind === "pudding" ? "SNACK!" : "YUM!", e.x, 170, e.z, true, 2); this.coach?.pickup(e); break;
            case "weaponBreak": S.play("brk"); v.word("BROKE!", e.x, 150, e.z, false, 1); v.chips(e.x, 90, e.z, 12, ["#8fa8c8", "#d8a15c", C.cream], 8); break;
            case "propHit": S.play("block"); v.burst(e.x, 50, e.z, 0.6, C.cream); break;
            case "propBreak": S.play("brk"); v.burst(e.x, 40, e.z, 1.2, C.mustard); v.chips(e.x, 40, e.z, 14, ["#c98a4e", "#8a5428", "#ffb0c4", C.cream], 9); shake(4, 0.14); break;
            case "tag": S.play("tag"); v.leave(sim.team[e.from], sim.team[e.from].face * -1); v.word("TAG!", e.x, 190, e.z, true, 1); v.ring(e.x, 70, e.z, 2.4, e.to === "pip" ? C.orange : C.teal, 20); this.cut = { kind: "tag", who: e.to, t: 0, life: 34 }; break;
            case "tagLand": S.play("tagLand"); v.ring(e.x, 0, e.z, 2.4, C.cream, 18); shake(6, 0.16); break;
            case "special": {
                S.play(["soup1", "soup1", "soup2", "soup3"][e.level]);
                this.cut = { kind: "super", who: e.hero, level: e.level, t: 0, life: [0, 34, 46, 74][e.level] };
                s.freeze([0, 0.16, 0.24, 0.62][e.level]); s.flash("#ffffff", 0.08);
                break;
            }
            case "specialHit": {
                const dot = e.hero === "dot", L = e.level;
                S.play(dot ? "big" : "whistle"); shake(6 + L * 5, 0.3 + L * 0.12); v.punch = 0.06 + L * 0.03;
                if (L === 3) { if (dot) { this.flood = 1; s.flash("#ffad33", 0.26); } else v.stampede(sim); }
                if (L === 2) for (let i = -2; i <= 2; i++) v.fx.push({ kind: "geyser", t: -Math.abs(i) * 3, life: 34, x: e.x + i * 84, z: e.z, w: 52 - Math.abs(i) * 8 });
                v.fx.push({ kind: "soup", t: 0, life: 34, x: e.x, y: 0, z: e.z, r: e.r, level: L, hero: e.hero });
                v.splat(e.x, e.z, dot ? "#ffad33" : "#fff4dc", 1 + L * 0.4);
                v.chips(e.x, 40, e.z, 16 + L * 12, dot ? ["#ffad33", "#ffe08a", "#e0701a"] : [C.cream, C.orange], 11);
                v.word(dot ? ["", "SOUP RING!", "GRAVY GEYSER!", "SOUP'S ON!!"][L] : ["", "TWEEEET!", "HALL PASS!", "STAMPEDE!!"][L], e.x, 190, e.z, true, 1);
                break;
            }
            case "heroKo": S.play("ko"); v.word("OH NO!", e.x, 150, e.z, true, 1); this.slowT = 30; shake(10, 0.3); break;
            case "go": S.play("go"); this.goT = 150; if (sim.arena >= 0) this.kit.save.coach = true; break;
            case "lock": S.play("bell", { silent: true }); this.coach?.lock(e); this.lockT = 70; break;
            case "gradeUp": S.play("gradeUp"); this.hud.gradePop = 0.9; break;
            case "comboEnd": this.kit.noteCombo(e.n); break;
            case "boss": S.music("boss"); S.play("whistle"); this.bossCard = { t: 0, life: 130, name: e.name, line: e.line }; v.punch = 0.05; break;
            case "bossTel": S.play("bossTel"); if (e.kind === "shh") { S.play("shush"); v.word("SHHHHH...", e.x, e.y, e.z, true, 2); } else if (e.kind === "summon") v.word("GET HER!", e.x, e.y, e.z, true, 0); else if (e.kind === "whistle") S.play("whistle"); break;
            case "bossJump": S.play("toss", { silent: true }); break;
            case "bossSlam": S.play("bossSlam"); shake(10, 0.26); v.ring(e.x, 0, e.z, 2.6, C.cream, 16); v.chips(e.x, 6, e.z, 14, ["#d8c8b0", C.cream], 8); v.word(e.kind === "shh" ? "SHH!" : e.kind === "wobble" ? "WOBBLE!" : e.kind === "belch" ? "BUUURP!" : e.kind === "whistle" ? "FWEEEE!" : "BOOM!", e.x, 200, e.z, true, 3); break;
            case "bossCharge": S.play("charge"); v.word("WATCH OUT!", e.x, 220, e.z, false, 1); break;
            case "bossWall": S.play("bossSlam"); shake(13, 0.3); v.word("CRUNCH!", e.x, 200, e.z, true, 3); s.freeze(8 / 60); break;
            case "bossSpit": S.play("splat", { silent: true }); break;
            case "bossShout": v.word("HELP ME!", e.x, e.y, e.z, true, 0); break;
            case "bossSplit": S.play("splat"); v.word("MITOSIS!", e.x, e.y + 60, e.z, true, 2); shake(6, 0.2); break;
            case "bossSwing": S.play("swingH", { silent: true }); break;
            case "laneFire": S.play("big", { silent: true }); shake(5, 0.14); break;
            case "dropLand": S.play("splat", { silent: true }); shake(2.4, 0.08); v.chips(e.x, 6, e.z, 6, [C.mustard, "#ffffff"], 5); break;
            case "bossPhase": S.play("whistle"); v.word("ANGRIER!", e.x, e.y + 10, e.z, true, 1); s.flash("#ff5a3a", 0.12); shake(7, 0.2); break;
            case "bossDie": S.play("bossDie"); this.slowT = 80; v.punch = 0.14; s.flash("#ffffff", 0.2); shake(14, 1.0); this.sound.stop(); v.word("YOU'RE EXCUSED!", e.x, e.y + 60, e.z, true, 1); break;
            case "bossPop": S.play("bossPop"); v.burst(e.x, e.y, e.z, 4.5, C.mustard); v.ring(e.x, e.y, e.z, 5, C.cream, 28); s.flash("#ffffff", 0.3); shake(16, 0.5); v.chips(e.x, e.y, e.z, 40, [C.mustard, C.tomato, C.lime, C.pink], 14); break;
            case "clear": this.sound.music("win"); this.bannerT = 1; break;
            case "fail": this.sound.stop(); this.sound.play("ko"); break;
        }
    }
    trail(e) { this.view.fx.push({ kind: "smear", t: 0, life: 9, hero: this.sim.hero, id: e.id, heavy: e.heavy, anim: e.anim }); }
    tickCards() {
        for (const k of ["card", "bossCard", "cut"]) { const c = this[k]; if (c && ++c.t >= c.life) this[k] = null; }
        if (this.goT > 0) this.goT--; if (this.lockT > 0) this.lockT--;
        this.hurtFlash *= 0.9; this.flood *= 0.95;
        const q = this.sim.hushed > 0 ? 0.2 : 1; this.quiet += (q - this.quiet) * 0.1;
        // Ms. Shush turns the whole game down. It's a joke you can hear.
        const mg = this.g.audio.music?.gain?.gain;
        if (mg) { this.mg0 ??= mg.value; mg.value = this.mg0 * this.quiet; }
    }

    // --- UI overlays --------------------------------------------------------------------------------------------------
    drawUI(d) {
        if (this.paused) return;      // The pause menu is entities, and this hook draws over them.
        const v = this.s.view, sim = this.sim, H = this.hud, st = this.st, t = this.t;
        if (this.hurtFlash > 0.03) { const a = this.hurtFlash * 0.42, h = v.height - this.view.deck; d.rect(v.width, 26, { x: v.width / 2, y: 13, color: C.tomato, opacity: a }); d.rect(v.width, 26, { x: v.width / 2, y: h - 13, color: C.tomato, opacity: a }); d.rect(22, h, { x: 11, y: h / 2, color: C.tomato, opacity: a }); d.rect(22, h, { x: v.width - 11, y: h / 2, color: C.tomato, opacity: a }); }
        if (this.flood > 0.05) { const h = v.height - this.view.deck, f = this.flood, y = h * (1 - f * 0.9) + h / 2; d.rect(v.width + 8, h, { x: v.width / 2, y, color: "#ffad33", opacity: 0.9 }); for (let i = 0; i < 8; i++) st.part(d, "disc", ((i * 73 + t * 3) % (v.width + 40)) - 20, y - h / 2 - 6 + Math.sin(i * 1.7 + t * 0.2) * 6, { sx: 0.7, color: "#ffad33" }); }
        drawHud(d, H, sim, st, t);
        this.drawPause(d);
        if (this.goT > 0 && sim.phase === "walk") {
            const k = Math.sin(t * 0.25), x = v.width - v.safe.right - 76 + k * 10, y = (this.view.Y0 + 50);
            comic(d, "GO!", x, y, 38, 1 + Math.max(0, k) * 0.1, 0, [C.mustard, C.tomato]);
            st.part(d, "alert", x + 52, y + 2, { sx: 0.7, rot: 1.57 });
        }
        if (sim.hushed > 0) comic(d, "shhh...", v.width / 2, this.view.Y0 - 70, 22, 1, 0, ["#d8c0ff", C.ink], 0.9);
        if (this.card) this.drawCard(d, this.card);
        if (this.bossCard) this.drawBossCard(d, this.bossCard);
        if (this.cut) this.drawCut(d, this.cut);
        this.coach?.draw(d);
        this.pad.draw(d, this.view.deck);
        if (sim.over?.win && this.done > 0) comic(d, "CLASS DISMISSED!", v.width / 2, this.view.Y0 - 20, Math.min(36, v.width * 0.085), 1 + Math.max(0, 1 - this.done / 14) * 0.8, -0.04, [C.mustard, C.tomato]);
    }
    drawPause(d) {
        const v = this.s.view, x = v.width - v.safe.right - 24, y = v.safe.top + 24;
        d.circle(19, { x, y, color: C.ink, opacity: 0.85 }); d.rect(5, 16, { x: x - 5, y, color: C.cream, radius: 2 }); d.rect(5, 16, { x: x + 5, y, color: C.cream, radius: 2 });
    }
    drawCard(d, c) {
        const v = this.s.view, q = c.t / c.life, a = q < 0.12 ? q / 0.12 : q > 0.82 ? (1 - q) / 0.18 : 1, x = v.width / 2 + (1 - Math.min(1, q / 0.12)) * -v.width + (q > 0.82 ? ((q - 0.82) / 0.18) * v.width : 0), y = this.view.Y0 * 0.62 + 30;
        const W = Math.min(v.width - 30, 420), cfg = this.sim.cfg;
        d.push(); d.translate(x, y); d.rotate(-0.03);
        d.rect(W + 8, 88, { color: C.ink, radius: 10 }); d.rect(W, 80, { color: C.mustard, radius: 7 });
        comic(d, cfg.name, 0, -11, Math.min(32, W * 0.085), 1, 0, ["#fff4dc", C.tomato]);
        d.text(cfg.sub.toUpperCase(), { x: 0, y: 25, size: 13, bold: true, font: FONT, color: C.ink });
        d.pop();
    }
    drawBossCard(d, c) {
        const v = this.s.view, q = c.t / c.life, s = q < 0.1 ? q / 0.1 : 1, a = q > 0.85 ? (1 - q) / 0.15 : 1, y = this.view.Y0 * 0.46 + 26, W = v.width + 40;
        d.rect(W, 106 * s, { x: v.width / 2, y, color: C.ink, opacity: 0.92 * a }); d.rect(W, 94 * s, { x: v.width / 2, y, color: C.tomato, opacity: a });
        if (s < 1) return;
        const size = Math.min(30, (v.width - 30) / (c.name.length * 0.74));
        comic(d, c.name, v.width / 2, y - 16, size, 1 + (q < 0.16 ? (0.16 - q) * 6 : 0), -0.02, ["#fff4dc", C.ink], a);
        d.text(c.line, { x: v.width / 2, y: y + 24, size: Math.min(13.5, (v.width - 24) / (c.line.length * 0.54)), bold: true, font: FONT, color: C.cream, opacity: a });
    }
    drawCut(d, c) {
        const v = this.s.view, st = this.st, q = c.t / c.life, y = this.view.Y0 * 0.6, s = q < 0.14 ? q / 0.14 : q > 0.8 ? (1 - q) / 0.2 : 1, H = (c.kind === "tag" ? 70 : 96 + c.level * 18) * s, dot = c.who === "dot";
        if (H < 2) return;
        d.rect(v.width + 40, H + 10, { x: v.width / 2, y, color: C.ink, rot: 0 }); d.rect(v.width + 40, H, { x: v.width / 2, y, color: dot ? C.teal : C.orange });
        for (let i = 0; i < 10; i++) st.part(d, "speed", ((i * 97 + this.t * 16) % (v.width + 120)) - 60, y + ((i * 37) % 80 - 40) * s, { sx: 1.6, color: C.cream, opacity: 0.5 });
        if (s < 0.9) return;
        const hx = v.width * 0.26 + (q - 0.5) * 24, k = (c.kind === "tag" ? 0.8 : 1.3);
        if (dot) { st.part(d, "dot_head", hx, y + 24 * k, { sx: k }); st.part(d, "de_mad", hx + 2, y + 18 * k, { sx: k }); st.part(d, "m_yell", hx + 4, y + 42 * k, { sx: k }); }
        else { st.part(d, "pip_head", hx, y + 14 * k, { sx: k * 1.2 }); st.part(d, "e_mad", hx + 2, y + 10 * k, { sx: k }); st.part(d, "m_yell", hx + 3, y + 34 * k, { sx: k }); }
        const txt = c.kind === "tag" ? (dot ? "DOT'S UP!" : "PIP'S UP!") : dot ? ["", "SOUP RING!", "GRAVY GEYSER!", "SOUP'S ON!!"][c.level] : ["", "TWEEEET!", "HALL PASS!", "STAMPEDE!!"][c.level];
        comic(d, txt, v.width * 0.64, y, Math.min(34, v.width * 0.07), 1 + (1 - s) * 0.5, -0.05, [C.mustard, C.tomato]);
    }
}
