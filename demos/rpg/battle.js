// The battle screen: reads events from sim.js and turns each into motion, sound, words and a buzz in the hand.
import { INK } from "./ink.js";
import { BEASTS, ITEMS, MOVES, STATUS, TYPES, effectiveness } from "./data.js";
import { COL, FONT, Screen, T, TYPE, bar, btn, hpColor, measure, panel } from "./ui.js";
import { battleBg, beastFlip, beastSprite, FX_FRAME, ITEM_ICON, itemSprite } from "./sprites.js";
import { bossSpecials, catchOdds, createBattle, maxHp, replaceFainted, resolveTurn, stat, xpForLevel } from "./sim.js";
import { FLOORS } from "./story.js";
import { save } from "./world.js";

const WORDS = { paper: ["RIP!", "SHFF!", "FWIP!"], email: ["PING!", "DING!", "FWD!"], tape: ["SNAG!", "DENIED!", "VOID!"], coffee: ["SPLASH!", "GLUG!", "HOT!"], hardware: ["KA-CHUNK!", "CLACK!", "WHAM!"], meeting: ["BLAH!", "SYNC!", "NOTED!"], tech: ["ZAP!", "404!", "BZZT!"], snack: ["CRUNCH!", "NOM!", "SPLAT!"], wellness: ["OM!", "BREATHE!", "THWAP!"], none: ["BOP!", "NUDGE!", "OOF!"] };
const ease = { out: (t) => 1 - (1 - t) * (1 - t), back: (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };

export class BattleScreen extends Screen {
    constructor(world, cfg, onEnd) {
        super();
        this.world = world; this.cfg = cfg.resume ? { resume: cfg.resume, kind: cfg.resume.kind, name: cfg.resume.name, boss: cfg.resume.boss?.id, title: "" } : cfg; this.onEnd = onEnd; this.opaque = false; this.t = 0; this.parts = []; this.pops = []; this.queue = []; this.waitT = 0; this.line = ""; this.lineT = 0; this.mode = "wipein"; this.wipe = 0; this.view2 = "moves"; this.choices = []; this.slot = 0; this.shake = 0; this.freeze = 0; this.flash = 0; this.pending = null; this.show = [{}, {}]; this.anim = null; this.lastDesc = null;
    }
    enter() {
        const g = this.game, S = g.data.S, c = this.cfg;
        this.S = S;
        if (c.resume) { this.st = c.resume; this.st.intro = []; }
        else this.st = createBattle({ ...c, you: S.party, seed: (S.steps * 7919 + S.time * 31 + 11) | 0 });
        const st = this.st;
        this.th = FLOORS[S.floor].theme;
        battleBg(g, FLOORS[S.floor].themeId ?? S.floor, this.th); this.bgName = "bg:" + (FLOORS[S.floor].themeId ?? S.floor);
        this.slots = [[], []];
        for (const s of [0, 1]) st.sides[s].active.forEach((i) => this.slots[s].push(this.mkView(s, i)));
        g.audioKit?.play("encounter"); g.haptic("heavy");
        g.audioKit?.music(st.boss?.id === "autoreply" ? "final" : c.kind === "boss" ? "boss" : "battle");
        if (c.resume) this.queue.push({ k: "say", text: "Where were we?" });
        else if (st.boss || c.kind === "trainer") this.queue.push({ k: "say", text: c.kind === "boss" ? `${c.name}, ${c.title ?? "Department Head"}, wants a word.` : `${c.name} wants to Touch Base!` });
        else if (c.kind === "wild") this.queue.push({ k: "say", text: `A wild ${BEASTS[st.sides[1].mons[0].sp].name} wandered out of the clutter!` });
        this.queue.push(...(st.intro ?? []));
    }
    mkView(s, i) {
        const m = this.st.sides[s].mons[i];
        beastSprite(this.game, m.sp);
        return { s, i, sp: m.sp, hp: m.hp, shown: m.hp, ghost: m.hp, max: maxHp(m), status: m.status, lvl: m.lvl, y: 0, x: 0, sx: 1, sy: 1, rot: 0, alpha: 0, pop: 0, flash: 0, types: BEASTS[m.sp].types };
    }
    view(s, i) { return this.slots[s].find((v) => v.i === i); }
    pos(s, idx, V) {  // where a slot stands on screen
        const L = this.layout(V), n = this.slots[s].length, stageW = L.stageW, stageH = L.stageH;
        if (s === 1) { const size = Math.min(stageW * (n > 1 ? 0.38 : 0.5), stageH * (n > 1 ? 0.36 : 0.46), 210), cx = stageW * (n > 1 ? (idx ? 0.6 : 0.84) : 0.72), cy = stageH * (n > 1 ? (idx ? 0.39 : 0.27) : 0.33); return { x: L.ox + cx, y: L.oy + cy, size }; }
        const size = Math.min(stageW * (n > 1 ? 0.42 : 0.56), stageH * (n > 1 ? 0.36 : 0.5), 210), cx = stageW * (n > 1 ? (idx ? 0.69 : 0.25) : 0.28), cy = stageH * (n > 1 ? (idx ? 0.74 : 0.68) : 0.72);
        return { x: L.ox + cx, y: L.oy + cy, size };
    }
    layout(V) {
        const land = V.width > V.height;
        if (land) { const pw = Math.min(V.width * 0.44, 340); return { land, ox: 0, oy: 0, stageW: V.width - pw, stageH: V.height, px: V.width - pw, py: 0, pw, ph: V.height }; }
        const ph = Math.min(V.height * 0.42, 290);
        return { land, ox: 0, oy: 0, stageW: V.width, stageH: V.height - ph, px: 0, py: V.height - ph, pw: V.width, ph };
    }

    // --- Timeline ---------------------------------------------------------------------------------------------------------
    speed() { return this.S.settings.fastBattle ? 2.2 : 1; }
    wait(t) { this.waitT = Math.max(this.waitT, t / this.speed() / (this.game.botSpeed ?? 1)); }
    tick(dt) {
        this.t += dt;
        this.opaque = this.mode !== "wipein" && this.mode !== "wipeout";
        if (this.flash > 0) this.flash -= dt * 3;
        if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
        for (const p of this.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g ?? 300) * dt; p.rot += p.vr * dt; }
        this.parts = this.parts.filter((p) => p.life > 0);
        for (const p of this.pops) p.t += dt;
        this.pops = this.pops.filter((p) => p.t < p.life);
        for (const side of this.slots) for (const v of side) {
            v.shown += (v.hp - v.shown) * Math.min(1, dt * 7);
            if (Math.abs(v.hp - v.shown) < 0.5) v.shown = v.hp;
            if (v.ghost > v.shown) v.ghost -= v.max * dt * 0.5; if (v.ghost < v.shown) v.ghost = v.shown;
            v.x *= Math.pow(0.0005, dt); v.y *= Math.pow(0.0005, dt); v.flash = Math.max(0, v.flash - dt * 4.5);
            v.sx += (1 - v.sx) * Math.min(1, dt * 12); v.sy += (1 - v.sy) * Math.min(1, dt * 12);
            if (!v.dead) v.alpha = Math.min(1, v.alpha + dt * 5); else { v.alpha = Math.max(0, v.alpha - dt * 2.4); v.rot += dt * 2.6; v.y += dt * 180; }
        }
    }
    update(dt, I) {
        if (this.freeze > 0) { this.freeze -= dt; return; }
        if (this.mode === "wipein") { this.wipe += dt * 2.4; if (this.wipe >= 1) { this.wipe = 1; this.mode = "play"; } return; }
        if (this.mode === "wipeout") { this.wipe -= dt * 2.4; if (this.wipe <= 0) { this.stack.pop(this); this.onEnd(this.endResult, this.st); } return; }
        if (this.mode !== "play") return;
        const tap = I.pointer.tapped || I.confirm;
        if (tap && this.waitT > 0.12) this.waitT = 0.08;
        this.waitT -= dt;
        if (this.waitT > 0) return;
        const e = this.queue.shift();
        if (e) { this.play(e); return; }
        this.nextPhase();
    }
    nextPhase() {
        const st = this.st;
        if (st.over) return this.finish();
        if (st.need.length) { this.mode = "need"; this.view2 = "team"; this.needSlot = st.need[0]; this.line = "Who's covering? Choose a teammate."; return; }
        this.slot = 0; this.choices = [];
        for (const side of this.slots) side.sort((a, b) => st.sides[side === this.slots[0] ? 0 : 1].active.indexOf(a.i) - st.sides[side === this.slots[0] ? 0 : 1].active.indexOf(b.i));
        this.mode = "choose"; this.view2 = "moves"; this.line = ""; this.skipDead();
        this.S.battle = st; save(this.game);
    }
    skipDead() {
        const st = this.st;
        while (this.slot < st.sides[0].active.length && !(st.sides[0].mons[st.sides[0].active[this.slot]]?.hp > 0)) { this.choices[this.slot] = null; this.slot++; }
        if (this.slot >= st.sides[0].active.length) this.commit();
    }
    pick(choice) {
        this.choices[this.slot] = choice; this.slot++; this.view2 = "moves"; this.skipDead();
    }
    commit() {
        const F2 = this.S.flags; F2.tip_move = 1; if (this.st.fmt === 2) F2.tip_duo = 1; if (this.st.boss) F2.tip_boss = 1;
        if (this.choices.some((c) => c?.t === "item" && ITEMS[c.item].cat === "catch")) F2.tip_catch = 1;
        const ev = resolveTurn(this.st, this.choices);
        this.queue.push(...ev); this.mode = "play"; this.waitT = 0.05;
    }
    finish() {
        const r = this.st.over, g = this.game;
        if (r === "win" && (this.cfg.kind !== "wild")) { g.audioKit?.play("levelup"); }
        this.endResult = r; this.mode = "wipeout"; this.wipe = 1;
        this.S.battle = null;
    }
    say(text, t = 0.9) { if (!text) return; this.line = text; this.lineT = 0; this.wait(t + Math.min(0.8, text.length * 0.008)); }
    play(e) {
        const g = this.game, kit = g.audioKit, V = g.view, st = this.st;
        const vOf = (s, i) => this.view(s, i);
        switch (e.k) {
            case "say": this.say(e.text); break;
            case "boss": this.say(e.text, 1.2); this.banner = { text: e.text, t: 0, warn: e.warn }; if (e.warn) { kit?.play("exclaim"); this.shake = 6; } else kit?.play("status"); if (e.rebrand) { const v = vOf(1, e.i); if (v) { v.types = [e.rebrand]; v.sx = 0.2; v.sy = 1.5; this.burstAt(v, e.rebrand, 14); } } break;
            case "eff": this.say(e.text, 0.55); if (e.good) { this.pops.push({ word: "SUPER!", x: V.width / 2, y: this.layout(V).stageH * 0.5, t: 0, life: 0.8, big: 1 }); } break;
            case "crit": this.say(e.text, 0.5); break;
            case "move": {
                const v = vOf(e.s, e.i), mv = MOVES[e.move];
                this.say(e.text, mv.pow ? 0.3 : 0.7); if (!v) break;
                this.curMove = mv;
                const dir = e.s === 0 ? 1 : -1, idx = this.slots[e.s].indexOf(v), P = this.pos(e.s, idx, V);
                if (mv.cat === "h") { v.x = dir * 46; v.y = -dir * 26; v.sx = 1.15; v.sy = 0.88; } else { v.sy = 1.25; v.sx = 0.84; }
                kit?.play(mv.type === "hardware" && /staple/i.test(mv.id) ? "staple" : mv.type);
                g.haptic("tick");
                if (mv.pow) { const foes = this.slots[1 - e.s]; const tgt = foes[0]; if (tgt) { const Q = this.pos(1 - e.s, 0, V); this.throwFx(P, Q, mv.type, mv.cat === "h" ? 5 : 10); } }
                else this.burstAt(v, mv.type, 10);
                break;
            }
            case "hit": {
                const v = vOf(e.s, e.i); if (!v) { if (e.text) this.say(e.text); break; }
                v.hp = e.hp; v.flash = 1;
                const sev = e.eff > 1 ? 2 : e.eff < 1 ? 0 : 1, frac = e.d / v.max;
                v.x = (e.s === 0 ? -1 : 1) * (10 + frac * 26); v.sx = 1.18; v.sy = 0.82;
                this.shake = Math.min(11, 2.5 + frac * 16 + sev * 1.5);
                this.freeze = e.dot ? 0 : Math.min(0.11, 0.035 + frac * 0.12);
                if (this.game.botSpeed > 1) this.freeze = 0;
                kit?.play(e.dot ? "weakhit" : sev === 2 ? "superhit" : sev === 0 ? "weakhit" : "hit");
                g.haptic(sev === 2 || frac > 0.35 ? "heavy" : sev === 0 ? "light" : "medium");
                const idx = this.slots[e.s].indexOf(v), P = this.pos(e.s, idx, V);
                if (e.type) { const w = WORDS[e.type]; this.pops.push({ word: w[(this.st.turn + e.i) % w.length], x: P.x + (e.s ? -30 : 30), y: P.y - P.size * 0.36, t: 0, life: 0.7, color: sev === 2 ? COL.sticky : "#fffdf5", big: sev === 2 }); }
                this.pops.push({ num: e.d, x: P.x, y: P.y - 8, t: 0, life: 0.8, col: sev === 2 ? COL.red : INK });
                this.burstAt(v, e.type ?? "none", 6 + sev * 5);
                if (e.text) this.say(e.text, 0.5); else this.wait(0.42);
                break;
            }
            case "heal": { const v = vOf(e.s, e.i); if (v) { v.hp = e.hp; v.sy = 1.12; if (!e.quiet) { kit?.play("heal"); this.burstAt(v, "wellness", 8); } const idx = this.slots[e.s].indexOf(v), P = this.pos(e.s, idx, V); if (e.n > 0) this.pops.push({ num: "+" + e.n, x: P.x, y: P.y - 8, t: 0, life: 0.8, col: "#2c8a3f" }); } if (e.text) this.say(e.text, 0.5); else this.wait(0.15); break; }
            case "status": { const v = vOf(e.s, e.i); if (v) { v.status = e.status; v.sx = 0.8; v.sy = 1.2; this.burstAt(v, e.status === "meeting" ? "meeting" : e.status === "burnout" ? "coffee" : e.status === "replyall" ? "email" : "tech", 12); } kit?.play("status"); this.say(e.text, 0.7); break; }
            case "cure": { const v = vOf(e.s, e.i); if (v) { v.status = null; } kit?.play("heal"); this.say(e.text, 0.5); break; }
            case "vol": { const v = vOf(e.s, e.i); if (v && e.vol === "caffeine") v.caffeine = 1; this.say(e.text, 0.5); kit?.play("buff"); break; }
            case "stat": { const v = vOf(e.s, e.i); kit?.play(e.n > 0 ? "buff" : "debuff"); if (v) { const idx = this.slots[e.s].indexOf(v), P = this.pos(e.s, idx, V); for (let k = 0; k < 8; k++) this.parts.push({ x: P.x + (k - 4) * 12, y: P.y + (e.n > 0 ? 24 : -40), vx: 0, vy: e.n > 0 ? -160 : 160, g: 0, rot: e.n > 0 ? 0 : 3.14, vr: 0, life: 0.5, arrow: e.n > 0 ? "#2c8a3f" : COL.red, size: 12 }); } this.say(e.text, 0.45); break; }
            case "blocked": { const v = vOf(e.s, e.i); if (v) { v.sx = 1.08; v.sy = 0.95; } kit?.play("status"); this.say(e.text, 0.8); break; }
            case "miss": kit?.play("weakhit"); this.say(e.text, 0.6); break;
            case "protect": { const v = vOf(e.s, e.i); if (v) { v.shield = 0.6; this.burstAt(v, "wellness", 6); } kit?.play("hardware"); this.say(e.text, 0.6); break; }
            case "faint": {
                const v = vOf(e.s, e.i); if (v) { v.dead = true; v.hp = 0; }
                kit?.play("faint"); g.haptic(e.s === 0 ? "warn" : "medium"); this.say(e.text, 0.8); this.shake = 4;
                break;
            }
            case "xp": { if (e.part && !e.quietXp) this.xpLine = { sp: e.sp, gain: e.gain, t: 0 }; this.wait(0.02); if (e.part) { const m = st.sides[0].mons[e.idx]; const v = vOf(0, e.idx); if (v && m) v.lvlBar = 1; } break; }
            case "level": { const v = vOf(0, e.idx); const m = st.sides[0].mons[e.idx]; if (v && m) { v.lvl = e.lvl; v.max = maxHp(m); v.hp = m.hp; v.sy = 1.3; v.sx = 0.8; this.burstAt(v, "paper", 10); } kit?.play("levelup"); this.say(`Pay rise! ${BEASTS[e.sp].name} reached Grade ${e.lvl}.`, 0.7); break; }
            case "learn": this.say(`${BEASTS[e.sp].name} learned ${MOVES[e.move].name}${e.equipped ? "!" : " (swap it in from Team)."}`, 0.8); kit?.play("item"); break;
            case "recall": { const v = vOf(e.s, st.sides[e.s].active.includes(e.i) ? e.i : this.slots[e.s][e.slot]?.i); this.say(e.text, 0.4); void v; break; }
            case "send": {
                const old = this.slots[e.s][e.slot], nv = this.mkView(e.s, e.i);
                const live = st.sides[e.s].mons[e.i]; nv.hp = nv.shown = nv.ghost = this.hpAtSend?.[e.i] ?? live.hp; nv.status = live.status;
                nv.sx = 0.2; nv.sy = 1.5; this.slots[e.s][e.slot] = nv; void old;
                kit?.play("open"); g.haptic("light"); this.say(e.text, 0.5); break;
            }
            case "catch": {
                const it = e.item, v = this.slots[1][0], P = this.pos(1, 0, V);
                const icon = ITEM_ICON[it]; this.lanyard = { icon, x: 40, y: V.height * 0.6, tx: P.x, ty: P.y, t: 0, shakes: e.shakes, ok: e.ok };
                this.say(e.text, 0.5); kit?.play("paper");
                this.wait(0.6 + e.shakes * 0.34 + 0.3);
                for (let i = 0; i < e.shakes; i++) this.queue.unshift({ k: "shake", n: i });
                this.queue.unshift({ k: "pause", t: 0.5 });
                this.queue.splice(1 + e.shakes, 0, { k: "catchEnd", ok: e.ok });
                if (v) this.hideFoe = true;
                break;
            }
            case "pause": this.wait(e.t); break;
            case "shake": kit?.play("shake"); if (this.lanyard) this.lanyard.jig = 1; this.wait(0.34); break;
            case "catchEnd": { this.hideFoe = false; if (e.ok) { kit?.play("catch"); this.burstAt(this.slots[1][0], "paper", 22); this.flash = 0.6; this.slots[1][0].dead = true; } else { kit?.play("close"); } this.lanyard = e.ok ? { ...this.lanyard, done: 1 } : null; this.wait(0.4); break; }
            case "win": { this.say(this.cfg.kind === "wild" ? "Back to work." : `${this.cfg.name ?? "They"} accepted your feedback.`, 0.7); this.game.audioKit?.play("levelup"); break; }
            case "lose": this.say("Your whole team is Out of Office.", 1.2); break;
            case "run": kit?.play("close"); break;
            default: break;
        }
    }
    burstAt(v, type, n) {
        if (!v) return;
        const side = this.slots[v.s], idx = side.indexOf(v), P = this.pos(v.s, Math.max(0, idx), this.game.view), F2 = FX_FRAME[type] ?? 0;
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = 90 + Math.random() * 180; this.parts.push({ x: P.x, y: P.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70, g: 420, rot: a, vr: (Math.random() - 0.5) * 12, life: 0.5 + Math.random() * 0.35, frame: F2, size: 14 + Math.random() * 12 }); }
    }
    throwFx(P, Q, type, n) {
        const F2 = FX_FRAME[type] ?? 0, fly = 0.22;
        for (let i = 0; i < n; i++) { const j = () => (Math.random() - 0.5) * 34; this.parts.push({ x: P.x + j(), y: P.y + j(), vx: (Q.x - P.x) / fly + j(), vy: (Q.y - P.y) / fly + j(), g: 0, rot: 0, vr: 14, life: fly * (0.75 + Math.random() * 0.3), frame: F2, size: 18 }); }
    }

    // --- Input ------------------------------------------------------------------------------------------------------------
    input(I) {
        if (this.mode === "choose" || this.mode === "target" || this.mode === "need") return super.input(I);
        return false;
    }
    mon() { const a = this.st.sides[0].active[this.slot]; return this.st.sides[0].mons[a]; }
    chooseMove(id) {
        const st = this.st, mv = MOVES[id], foes = st.sides[1].active.filter((i) => st.sides[1].mons[i]?.hp > 0), allies = st.sides[0].active.filter((i) => st.sides[0].mons[i]?.hp > 0);
        this.game.audioKit?.play("open");
        const needsFoe = mv.target === undefined && foes.length > 1, needsAlly = mv.target === "ally" && allies.length > 1;
        if (needsFoe) { this.mode = "target"; this.tgt = { mv: id, list: foes, side: 1 }; return; }
        if (needsAlly) { this.mode = "target"; this.tgt = { mv: id, list: allies, side: 0 }; return; }
        this.pick({ t: "move", move: id, target: mv.target === "ally" ? allies[0] : foes[0] });
    }
    useItem(id, on) {
        const S = this.S, it = ITEMS[id]; S.bag[id]--;
        this.game.audioKit?.play("item");
        this.pick({ t: "item", item: id, on });
    }
    needPick(i) {
        const ev = replaceFainted(this.st, this.needSlot, i);
        this.queue.push(...ev); this.mode = "play";
    }

    // --- Draw -------------------------------------------------------------------------------------------------------------
    draw(d, V) {
        const g = this.game, L = this.layout(V), st = this.st;
        d.push();
        if (this.shake > 0) d.translate(Math.sin(this.t * 83) * this.shake, Math.cos(this.t * 71) * this.shake * 0.7);
        const asp = 480 / 360, sw = Math.max(L.stageW + 30, (L.stageH + 40) * asp), sh = sw / asp;
        d.sprite(this.bgName, { x: L.stageW / 2, y: L.stageH / 2 + (L.stageH - sh) * 0.2, width: sw, height: sh });
        if (st.invert > 0) d.rect(L.stageW, L.stageH, { x: L.stageW / 2, y: L.stageH / 2, color: "#7c2b3a", opacity: 0.25 });
        for (const s of [1, 0]) this.slots[s].forEach((v, idx) => this.drawMon(d, V, v, idx));
        if (this.lanyard) this.drawLanyard(d, V);
        const put = d.quads("fx");
        for (const p of this.parts) { if (p.arrow) { d.push(); d.translate(p.x, p.y); d.rotate(p.rot); d.poly([[0, -p.size / 1.4], [p.size / 1.6, 3], [-p.size / 1.6, 3]], { color: p.arrow, opacity: Math.min(1, p.life * 5) }); d.pop(); } else put(p.x, p.y, p.size, p.size, p.rot, p.frame, 1, 1, 1, Math.min(1, p.life * 5)); }
        for (const p of this.pops) this.drawPop(d, g, p);
        this.drawCards(d, V, L);
        d.pop();
        if (this.banner) this.drawBanner(d, V, L);
        this.drawTip(d, V, L);
        this.drawPanel(d, V, L);
        if (this.flash > 0) d.rect(V.width, V.height, { x: V.width / 2, y: V.height / 2, color: "#fff", opacity: Math.min(1, this.flash) });
        if (this.mode === "wipein" || this.mode === "wipeout") this.drawWipe(d, V);
    }
    drawBanner(d, V, L) {
        const b = this.banner, g = this.game; b.t += 0.016 * (g.botSpeed ?? 1);
        if (b.t > 2.1) { this.banner = null; return; }
        const k = Math.min(1, b.t * 6), s = 1 + (1 - k) * 0.5, w = Math.min(L.stageW - 28, 400), h = 74, x = L.stageW / 2 - w / 2, y = L.stageH * 0.42 - h / 2, a = Math.min(1, (2.1 - b.t) * 4);
        d.push(); d.translate(L.stageW / 2, y + h / 2); d.scale(s, s); d.rotate(-0.02); d.translate(-L.stageW / 2, -(y + h / 2));
        panel(d, x, y, w, h, { fill: b.warn ? COL.red : COL.sticky, radius: 4, opacity: a });
        T(d, g, b.text, x + w / 2, y + 12, { align: "center", size: 14, bold: true, maxWidth: w - 24, lineHeight: 1.2, color: b.warn ? "#fff" : INK, opacity: a });
        d.pop();
    }
    drawTip(d, V, L) {
        if (this.mode !== "choose") return;
        const S = this.S, g = this.game; let tip = null;
        if (!S.flags.tip_move) tip = "Tap a move. SUPER means it hits a weak spot.";
        else if (this.st.kind === "wild" && !S.flags.tip_catch && S.flags.form) tip = "Tire it out, then Bag > Lanyard to hire it.";
        else if (this.st.fmt === 2 && !S.flags.tip_duo) tip = "Duo battle: give each Deskmate an order.";
        else if (this.st.boss && !S.flags.tip_boss) tip = "Department heads have a trick. Tap Tips.";
        if (!tip) return;
        const w = Math.min(L.stageW - 20, 300), x = L.stageW / 2 - w / 2, y = L.stageH * 0.47 + Math.sin(this.t * 4) * 3;
        panel(d, x, y, w, 30, { fill: COL.sticky, radius: 3, shadow: 3 }); T(d, g, tip, x + w / 2, y + 15, { align: "center", size: 12, bold: true });
    }
    drawWipe(d, V) {
        const n = 7, step = Math.max(V.width, V.height) / n, k = 1 - this.wipe, R = step * 0.78 * Math.min(1, k * 1.4);
        if (k <= 0) return;
        for (let y = -1; y <= n; y++) for (let x = -1; x <= n; x++) { const delay = (x + y) / (n * 2.2), r = R * Math.min(1, Math.max(0, (k * 1.5 - delay * 0.5))); if (r > 0.5) d.circle(r, { x: x * step + (y % 2 ? step / 2 : 0), y: y * step, color: INK }); }
    }
    drawMon(d, V, v, idx) {
        if (v.alpha <= 0.01 || (this.hideFoe && v.s === 1)) return;
        const P = this.pos(v.s, idx, V), bob = Math.sin(this.t * 2.4 + idx + v.s * 2) * 2.5, S2 = P.size, x = P.x + v.x, y = P.y + v.y + bob;
        d.push(); d.translate(x, P.y + S2 * 0.46 + v.y);
        d.rect(S2 * 0.7, 12, { y: 0, color: "#1e2233", radius: 6, opacity: 0.22 * v.alpha });
        d.pop();
        const name = v.s === 0 ? beastFlip(this.game, v.sp) : beastSprite(this.game, v.sp);
        d.push(); d.translate(x, y + S2 / 2); d.scale(v.sx, v.sy); d.rotate(v.rot);
        d.sprite(name, { x: 0, y: -S2 / 2, width: S2, height: S2, flipX: v.s === 0, opacity: v.alpha });
        if (v.flash > 0) d.additive(() => d.sprite(name, { x: 0, y: -S2 / 2, width: S2, height: S2, flipX: v.s === 0, opacity: v.flash }));
        d.pop();
        if (this.mode === "choose" && v.s === 0 && this.st.sides[0].active[this.slot] === v.i && this.st.fmt === 2) { const b = Math.sin(this.t * 7) * 3; d.poly([[x - 11, P.y - S2 * 0.5 + b], [x + 11, P.y - S2 * 0.5 + b], [x, P.y - S2 * 0.39 + b]], { color: COL.sticky }); d.line([x - 11, P.y - S2 * 0.5 + b], [x, P.y - S2 * 0.39 + b], { width: 2, color: INK }); d.line([x + 11, P.y - S2 * 0.5 + b], [x, P.y - S2 * 0.39 + b], { width: 2, color: INK }); d.line([x - 11, P.y - S2 * 0.5 + b], [x + 11, P.y - S2 * 0.5 + b], { width: 2, color: INK }); }
        if (v.status) { const c = STATUS[v.status]; const tx = x + (v.s ? -S2 * 0.35 : S2 * 0.35), ty = P.y - S2 * 0.4; panel(d, tx - 25, ty - 11, 50, 22, { fill: c.color, radius: 5, shadow: 2 }); T(d, this.game, c.short, tx, ty, { align: "center", size: 11, bold: true, color: "#fff" }); }
        if (this.mode === "target" && this.tgt.side === v.s) {
            const sc = 1 + Math.sin(this.t * 6) * 0.05;
            d.circle((S2 / 2 + 6) * sc, { x, y, outline: { width: 3.5, color: COL.red } });
            this.addHit({ x: P.x - S2 / 2, y: P.y - S2 / 2, w: S2, h: S2, id: "tgt" + v.i, fn: () => { const mv = this.tgt.mv; this.mode = "choose"; this.game.audioKit?.play("open"); this.pick({ t: "move", move: mv, target: v.i }); } });
        }
    }
    drawLanyard(d, V) {
        const l = this.lanyard; l.t += 0.016;
        const k = Math.min(1, l.t / 0.45), x = l.x + (l.tx - l.x) * ease.out(k), y = l.y + (l.ty - l.y) * k - Math.sin(k * 3.14) * 110;
        l.jig = (l.jig ?? 0) * 0.9;
        d.sprite(itemSprite(this.game, l.icon), { x, y, width: 64, height: 64, rot: Math.sin(this.t * 20) * 0.4 * l.jig + (1 - k) * 8 });
    }
    drawPop(d, g, p) {
        const k = p.t / p.life;
        if (p.num !== undefined) { const y = p.y - ease.out(k) * 42; const a = 1 - Math.max(0, k - 0.6) / 0.4; for (const [ox, oy] of [[-1.6, 0], [1.6, 0], [0, -1.6], [0, 1.6]]) T(d, g, p.num, p.x + ox, y + oy, { align: "center", size: 22, bold: true, color: "#fffdf5", opacity: a }); T(d, g, p.num, p.x, y, { align: "center", size: 22, bold: true, color: p.col, opacity: a }); return; }
        const s = ease.back(Math.min(1, k * 4)) * (p.big ? 1.25 : 1), a = 1 - Math.max(0, k - 0.7) / 0.3, r = 42 * s, pts = [];
        for (let i = 0; i < 16; i++) { const an = i / 16 * 6.283, R = i % 2 ? r * 0.72 : r * 1.12; pts.push([p.x + Math.cos(an) * R * 1.25, p.y + Math.sin(an) * R * 0.75]); }
        d.poly(pts.map(([x, y]) => [x + 3, y + 4]), { color: INK, opacity: a });
        d.poly(pts, { color: p.color ?? COL.sticky, opacity: a });
        T(d, g, p.word, p.x, p.y, { align: "center", size: 17 * s, bold: true, color: COL.red, opacity: a, rot: -0.08 });
    }
    drawCards(d, V, L) {
        const g = this.game, fm = this.slots[1], ym = this.slots[0], W = Math.min(168, L.stageW * 0.47);
        fm.forEach((v, i) => this.card(d, g, v, 8 + 8, 10 + i * 52, W, false));
        if (ym.length > 1) { const w2 = (L.stageW - 30) / 2; ym.forEach((v, i) => this.card(d, g, v, 10 + i * (w2 + 8), L.stageH - 60, w2, true)); }
        else ym.forEach((v) => this.card(d, g, v, L.stageW - W - 12, L.stageH - 62, W, true));
    }
    card(d, g, v, x, y, W, mine) {
        if (v.dead && v.alpha <= 0) return;
        const h = mine ? 54 : 46;
        panel(d, x, y, W, h, { fill: COL.white, radius: 6, shadow: 3 });
        const nm = BEASTS[v.sp].name;
        T(d, g, nm, x + 9, y + 13, { size: nm.length > 12 ? 11.5 : 13, bold: true });
        T(d, g, `Gr ${v.lvl}`, x + W - 8, y + 13, { size: 11, bold: true, align: "right", font: TYPE });
        const t = v.shown / v.max;
        bar(d, x + 8, y + 23, W - 16, 10, t, hpColor(t), { ghost: v.ghost / v.max });
        let cx = x + 9;
        for (const ty of v.types) { d.rect(10, 8, { x: cx + 5, y: y + (mine ? 45 : 39), color: TYPES[ty].color, radius: 3 }); cx += 13; }
        if (mine) { T(d, g, `${Math.ceil(v.shown)}/${v.max}`, x + W - 8, y + 43, { size: 12, bold: true, align: "right", font: TYPE }); }
    }
    drawPanel(d, V, L) {
        const g = this.game;
        const fill = "#2b3044";
        d.rect(L.pw, L.ph, { x: L.px + L.pw / 2, y: L.py + L.ph / 2, color: fill });
        if (L.land) d.rect(4, L.ph, { x: L.px + 2, y: L.ph / 2, color: INK }); else d.rect(L.pw, 4, { x: L.pw / 2, y: L.py + 2, color: INK });
        const pad = 10, x = L.px + pad, y = L.py + pad, w = L.pw - pad * 2, h = L.ph - pad * 2;
        if (this.view2 === "team" && (this.mode === "choose" || this.mode === "need")) return this.drawTeam(d, x, y, w, h);
        if (this.view2 === "bag" && this.mode === "choose") return this.drawBag(d, x, y, w, h);
        if (this.mode === "choose") return this.drawMoves(d, x, y, w, h);
        if (this.mode === "target") { panel(d, x, y, w, 64, { fill: COL.sticky, radius: 6 }); T(d, g, "Tap the target", x + w / 2, y + 32, { align: "center", size: 17, bold: true }); btn(this, d, g, x, y + h - 54, w, 50, "Back", { id: "back", fn: () => { this.mode = "choose"; } }); return; }
        // Narration
        panel(d, x, y, w, h, { fill: COL.paper, radius: 6 });
        T(d, g, this.line, x + 16, y + 16, { size: L.land ? 15 : 17, maxWidth: w - 32, lineHeight: 1.36 });
    }
    drawMoves(d, x, y, w, h) {
        const g = this.game, st = this.st, m = this.mon(); if (!m) return;
        const foeList = st.sides[1].active.map((i) => st.sides[1].mons[i]).filter((f) => f?.hp > 0), specials = bossSpecials(st), sh = specials.length ? 42 : 0;
        const bottomH = 44, gap = 7, gridH = h - bottomH - gap - sh, bw = (w - gap) / 2, bh = (gridH - gap) / 2;
        if (specials.length) { const sp = specials[0], b = Math.sin(this.t * 7) * 0.5 + 0.5; btn(this, d, g, x, y, w, 36, sp.name, { id: "special0", fill: b > 0.5 ? COL.sticky : "#ffe99a", size: 14, fn: () => { g.audioKit?.play("open"); this.pick({ t: "special", id: sp.id }); } }); }
        const y0 = y + sh;
        for (let i = 0; i < 4; i++) {
            const id = m.moves[i], bx = x + (i % 2) * (bw + gap), by = y0 + (i >> 1) * (bh + gap);
            if (!id) { panel(d, bx, by, bw, bh, { fill: "#3a4058", radius: 9, shadow: 0, border: "#1e2233" }); continue; }
            const mv = MOVES[id], ty = TYPES[mv.type], cd = m.v.cd[id] ?? 0;
            const eff = mv.pow && foeList.length ? Math.max(...foeList.map((f) => { const e = effectiveness(mv.type, f.v?.types ?? BEASTS[f.sp].types); return st.invert > 0 && e !== 1 ? 1 / e : e; })) : 1;
            btn(this, d, g, bx, by, bw, bh, mv.name, { id: "move" + i, fill: cd ? "#8f8c86" : ty.color, disabled: cd > 0, fn: () => this.chooseMove(id), draw: (D, ox, oy) => {
                const size = Math.max(10, Math.min(14, 14 * (bw - 14) / measure(g, mv.name, { size: 14, bold: true })));
                T(D, g, mv.name, ox + bw / 2, oy + bh / 2 - (bh > 44 ? 9 : 5), { align: "center", size, bold: true, color: INK, maxWidth: 0 });
                const sub = cd ? `Back in ${cd - 0}` : mv.pow ? `${mv.pow}${mv.hits ? " x" + mv.hits : ""}${mv.cd ? `  /  rest ${mv.cd}` : ""}` : (mv.target === "ally" ? "Support" : mv.target === "team" ? "Team" : mv.target === "self" ? "Self" : "Status");
                T(D, g, sub, ox + bw / 2, oy + bh / 2 + (bh > 44 ? 10 : 8), { align: "center", size: 11, bold: true, color: "#1e2233bb", font: TYPE });
                if (eff > 1 && !cd) { panel(D, ox + bw - 46, oy - 7, 50, 19, { fill: COL.sticky, radius: 4, shadow: 2 }); T(D, g, "SUPER", ox + bw - 21, oy + 2, { align: "center", size: 10, bold: true }); }
                if (eff < 1 && !cd) { panel(D, ox + bw - 40, oy - 7, 44, 19, { fill: "#b9b6ac", radius: 4, shadow: 2 }); T(D, g, "WEAK", ox + bw - 18, oy + 2, { align: "center", size: 10, bold: true }); }
            } });
        }
        const by = y + h - bottomH, n = 3, cw = (w - gap * 2) / n, labels = [["Team", "team"], ["Bag", "bag"], [st.kind === "wild" ? "Run" : "Tips", "run"]];
        labels.forEach(([lb, id], i) => btn(this, d, g, x + i * (cw + gap), by, cw, bottomH, lb, { id, size: 14, fn: () => {
            g.audioKit?.play("open");
            if (id === "team" || id === "bag") this.view2 = id;
            else if (st.kind === "wild") this.pick({ t: "run" });
            else this.showTip();
        } }));
        if (st.fmt === 2 && this.slot > 0) { T(d, g, "", x, y, {}); }
    }
    showTip() { const t = this.st.boss ? (BOSS_TIPS[this.st.boss.id] ?? BOSS_TIPS.none) : BOSS_TIPS.none; this.mode = "play"; this.say(t, 2.2); }
    drawTeam(d, x, y, w, h) {
        const g = this.game, st = this.st, side = st.sides[0], need = this.mode === "need";
        panel(d, x, y, w, h, { fill: COL.manila, radius: 6 });
        T(d, g, need ? "Who's covering?" : "Send in a teammate", x + 12, y + 16, { size: 14, bold: true });
        const cols = 2, gap = 6, cw = (w - 16 - gap) / cols, rows = 3, ch = Math.min(52, (h - (need ? 32 : 84)) / rows - gap + 2);
        side.mons.forEach((m, i) => {
            const c = i % cols, r = i >> 1, bx = x + 8 + c * (cw + gap), by = y + 30 + r * (ch + gap), onField = side.active.includes(i), dead = m.hp <= 0, dis = dead || onField || this.choices.some((q) => q?.t === "switch" && q.to === i);
            btn(this, d, g, bx, by, cw, ch, BEASTS[m.sp].name, { id: "p" + i, disabled: dis, fn: () => { g.audioKit?.play("open"); if (need) this.needPick(i); else this.pick({ t: "switch", to: i }); }, draw: (D, ox, oy) => {
                D.sprite(beastSprite(g, m.sp), { x: ox + 22, y: oy + ch / 2, width: 38, height: 38 });
                T(D, g, BEASTS[m.sp].name, ox + 42, oy + 14, { size: BEASTS[m.sp].name.length > 10 ? 10.5 : 12, bold: true });
                const t = m.hp / maxHp(m); bar(D, ox + 42, oy + ch - 18, cw - 52, 9, t, hpColor(t));
            } });
        });
        if (!need) btn(this, d, g, x + 8, y + h - 46, w - 16, 40, "Back", { id: "back", fn: () => { this.view2 = "moves"; } });
    }
    drawBag(d, x, y, w, h) {
        const g = this.game, S = this.S, st = this.st, wild = st.kind === "wild";
        panel(d, x, y, w, h, { fill: COL.manila, radius: 6 });
        if (this.bagFor) {
            const it = this.bagFor; T(d, g, `Use ${ITEMS[it].name} on?`, x + 12, y + 16, { size: 14, bold: true });
            const gap = 6, cw = (w - 16 - gap) / 2, ch = Math.min(52, (h - 84) / 3 - gap + 2);
            st.sides[0].mons.forEach((m, i) => { const c = i % 2, r = i >> 1, bx = x + 8 + c * (cw + gap), by = y + 30 + r * (ch + gap), cat = ITEMS[it].cat, dis = cat === "revive" ? m.hp > 0 : m.hp <= 0 || (cat === "heal" && m.hp >= maxHp(m));
                btn(this, d, g, bx, by, cw, ch, BEASTS[m.sp].name, { id: "on" + i, disabled: dis, size: 12, fn: () => { const id = this.bagFor; this.bagFor = null; this.view2 = "moves"; this.useItem(id, i); }, draw: (D, ox, oy) => { D.sprite(beastSprite(g, m.sp), { x: ox + 22, y: oy + ch / 2, width: 38, height: 38 }); T(D, g, BEASTS[m.sp].name, ox + 42, oy + 14, { size: 11.5, bold: true }); const t = m.hp / maxHp(m); bar(D, ox + 42, oy + ch - 18, cw - 52, 9, t, hpColor(t)); } }); });
            btn(this, d, g, x + 8, y + h - 46, w - 16, 40, "Back", { id: "back", fn: () => { this.bagFor = null; } });
            return;
        }
        const list = Object.keys(S.bag).filter((k) => S.bag[k] > 0 && ITEMS[k] && ITEMS[k].cat !== "field" && ITEMS[k].cat !== "evo" && (ITEMS[k].cat !== "catch" || wild));
        list.sort((a, b) => (ITEMS[b].cat === "catch") - (ITEMS[a].cat === "catch"));
        T(d, g, "Your bag", x + 12, y + 16, { size: 14, bold: true });
        const gap = 6, cw = (w - 16 - gap) / 2, ch = Math.min(44, (h - 84) / 3 - gap + 2);
        if (!list.length) T(d, g, "Nothing useful. A receipt. Some lint.", x + 12, y + 50, { size: 13 });
        list.slice(0, 6).forEach((id, i) => {
            const c = i % 2, r = i >> 1, bx = x + 8 + c * (cw + gap), by = y + 30 + r * (ch + gap), it = ITEMS[id];
            btn(this, d, g, bx, by, cw, ch, it.name, { id: "it_" + id, fn: () => {
                g.audioKit?.play("open");
                if (it.cat === "catch") { this.S.bag[id]--; this.view2 = "moves"; this.pick({ t: "item", item: id }); }
                else if (it.cat === "team") this.useItem(id, 0);
                else this.bagFor = id;
            }, draw: (D, ox, oy) => {
                D.sprite(itemSprite(g, ITEM_ICON[id] ?? "folder"), { x: ox + 19, y: oy + ch / 2, width: 30, height: 30 });
                T(D, g, it.name, ox + 36, oy + 13, { size: it.name.length > 13 ? 10.5 : 12, bold: true });
                let sub = `x${S.bag[id]}`;
                if (it.cat === "catch") { const o = catchOdds(st, st.sides[1].mons[st.sides[1].active[0]], it.ball); sub += o > 0.7 ? "  great odds" : o > 0.4 ? "  fair odds" : "  long shot"; }
                T(D, g, sub, ox + 36, oy + ch - 12, { size: 11, bold: true, color: "#1e2233aa", font: TYPE });
            } });
        });
        btn(this, d, g, x + 8, y + h - 46, w - 16, 40, "Back", { id: "back", fn: () => { this.view2 = "moves"; } });
    }
}
const BOSS_TIPS = {
    none: "Tip: hit what's weak. Paper beats Email, Email beats Red Tape, Red Tape beats Paper. Coffee is never resisted.",
    facilities: "Doug's Wet Floor signs slow your team every third turn. Hit hard early.",
    hr: "Every third turn Cheryl puts your strongest on a Plan. Spread the damage around.",
    it: "Neil wipes all stat changes every third turn. Time your boosts for just after a reset.",
    printer: "When it says TRAY 2 EMPTY, tap Open Tray 2 or take a hit worth half your team's Morale.",
    marketing: "It rebrands every two turns. Check the SUPER tags: they change with its type.",
    finance: "Budget Cuts freeze your strongest move. Keep cheap attacks on your team.",
    wellness: "Mandatory Fun heals them every other turn. Go for burst, not attrition.",
    legal: "When the Terms are amended, type advantages flip for two turns. Watch the tags.",
    board: "Each vote buffs them. Finish one Director fast, or Unsubscribe them.",
    autoreply: "You can't knock it out for good. Get it below half, then step through the settings. Three steps. Keep someone alive.",
};
