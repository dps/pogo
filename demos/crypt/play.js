// One floor of the holiday: input, the undo, the death card and everything drawn around the board.
import { layer, ui } from "./pogo.js";
import { C, GLYPH_COLOR, nine, ptext, spr, textWidth, wrap } from "./art.js";
import { CARDS, CAUSE, KEEPERS, MON_INFO, MON_KEY, ABILITY_DIR, RELICS, makeCtx } from "./data.js";
import { DIRS, H, T as TT, WAIT, gateOpen, isBoss, legal, makeState, monAt, monsters, special, step } from "./sim.js";
import { DUNGEONS, FLOORS, ITINERARY, instantiate, startOf } from "./floors.js";
import { solve } from "./solver.js";
import { Stage } from "./stage.js";
import { addButton, dimmer, panel } from "./ui.js";
import { newRun, pump, seedFor, storeSave } from "./run.js";

const DIR_NAME = ["UP", "RIGHT", "DOWN", "LEFT", "STAY PUT"];
const SNAP_TEXT = {
    arrive: ["Arrived. Weather: damp.", "First stop. Queue was murder.", "Packed sandwiches. Regret nothing."],
    bonk: ["Two locals, getting acquainted.", "Made some new friends. Briefly.", "Cultural exchange."],
    pit: ["Fed the wildlife.", "Pushed in front of a nice view.", "Local gone, sadly."],
    hurt: ["Bit of a sting.", "Nobody warned me about the staff.", "Not in the brochure."],
    boss: ["Met the management.", "Asked to speak to the manager.", "Complaint lodged in person."],
    bossDead: ["Left a one star review.", "Management has been replaced.", "Stayed for the whole tour."],
    dead: ["Wish you were here. I'm not.", "The last photo on the roll.", "Trip cut short. No refunds."],
};

export function addPlay(game, fx, ctx) {
    game.scene("play", (s, args) => {
        game.touch.enabled = false;
        const save = ctx.save();
        const run = game.data.run ?? newRun(game, { seed: seedFor(args?.seed ?? 1), keeper: save.keeper });
        if (args?.floor !== undefined && run.floor !== args.floor) { run.floor = args.floor; }
        const K = KEEPERS.find((q) => q.key === run.keeper);
        const index = run.floor, spec = ITINERARY[index], dun = DUNGEONS[spec.d];

        let fl = null, state = null, stage = null, history = [], undos = 0, armed = null, moves = 0, charges = 0, guide = 0;
        let mode = "load", toast = null, deathInfo = null, banner = 1, pressX = 0, pressY = 0, pressing = false, fired = false, tip = null, tipHold = 0, hud = { hp: 1, coins: run.coins }, lastCause = null, confirmQuit = false;

        const L = { portrait: true, top: 0, bottom: 0, left: 0, right: 0 };
        function layout() {
            const v = s.view, sf = v.safe ?? { top: 0, bottom: 0, left: 0, right: 0 };
            L.portrait = v.height >= v.width * 0.95;
            L.sf = sf;
            if (L.portrait) { L.top = sf.top + 56; L.bottom = sf.bottom + 116; L.left = 0; L.right = 0; }
            else { const side = Math.max(146, Math.min(190, v.width * 0.25)); L.top = sf.top + 2; L.bottom = sf.bottom + 2; L.left = sf.left + side; L.right = sf.right + side; }
            stage?.layout(L.left, L.top, v.width - L.left - L.right, v.height - L.top - L.bottom);
        }

        layout();
        function begin() {
            const done = run.jobs[index].done;
            fl = instantiate(done, makeCtx(run));
            const start = startOf(done.map, run.hp);
            undos = 1 + (run.relics.includes("insurance") ? 1 : 0);
            charges = K.charges + (run.relics.includes("phrasebook") ? 1 : 0);
            guide = run.relics.includes("guidebook") ? 1 : 0;
            state = makeState(fl, { ...start, charges, shield: run.relics.includes("sunscreen") ? 1 : 0 });
            stage = new Stage(s, fl, state, { theme: dun.key, keeper: run.keeper, fx,
                onHurt: (e) => { lastCause = e.cause; }, onBossDead: () => snap("bossDead"),
            });
            stage.onIdle = onIdle;
            layout();
            mode = "play";
            ctx.song(done.meta.song ?? dun.song);
            if (spec.boss) snap("boss"); else if (index % 4 === 0) snap("arrive");
            showNewMonsters();
            onIdle();
            ctx.state.floor = { fl, get state() { return state; }, moves: () => moves, act, undo, par: done.par, path: done.path, get stage() { return stage; }, get mode() { return mode; }, dead: () => mode === "dead", ability: useAbility, card: useCard };
        }
        function say(text, hold = 2.6, color = C.bone) { toast = { text, t: 0, hold, color }; }
        function showNewMonsters() {
            const seen = save.seen, fresh = monsters(state).filter((m) => !seen[m.t]);
            for (const m of monsters(state)) seen[m.t] = true;
            if (spec.boss) { const b = monsters(state).find((m) => isBoss(m.t)); tip = { key: MON_KEY[b.t], boss: true }; tipHold = 6; return; }
            if (fresh.length) { tip = { key: MON_KEY[fresh[0].t], fresh: true }; tipHold = 5; }
            storeSave(game, save);
        }
        function snap(kind) {
            const list = SNAP_TEXT[kind];
            if (run.snaps.length < 24) { const caption = list[(run.snaps.length * 7 + index) % list.length]; run.snaps.push({ kind, floor: index, fl, st: state.slice(), caption, theme: dun.key, room: fl.name, time: dun.time }); }
        }
        function onIdle() {
            if (!stage) return;
            const prev = [];
            if (state[H.HP] > 0 && !state[H.WON]) for (let d = 0; d < 4; d++) {
                if (!legal(fl, state, d)) continue;
                const n = step(fl, state, d), i = stepTile(d);
                if (i < 0) continue;
                prev.push({ i, d, bad: n[H.HP] < state[H.HP], shove: !!monAt(state, i) });
            }
            stage.previews = prev;
            if (mode === "dying") startDeath();
            if (mode === "leaving") finishFloor();
        }
        function stepTile(d) { const x = state[H.P] % fl.w + DIRS[d][0], y = ((state[H.P] / fl.w) | 0) + DIRS[d][1]; return x < 0 || y < 0 || x >= fl.w || y >= fl.h ? -1 : y * fl.w + x; }

        // ---------- acting ----------
        function act(a) {
            if (mode !== "play") return false;
            if (armed) { if (a < 4) { fireArmed(a); return true; } armed = null; }
            if (!legal(fl, state, a)) {
                fx.nope();
                if (a < 4) {
                    const i = stepTile(a);
                    if (i >= 0 && fl.ter[i] === TT.EXIT) say(fl.goal === "ticket" ? "Locked. Find your ticket first." : fl.goal === "boss" ? "Locked until the boss is beaten." : "Locked. Deal with every monster first.", 2, C.gold);
                    nudge(a);
                }
                return false;
            }
            commit((ev) => step(fl, state, a, ev), a);
            return true;
        }
        function nudge(d) { const p = stage.player, dx = DIRS[d][0]; p.sx = dx ? 0.85 : 1.1; p.sy = dx ? 1.1 : 0.85; game.haptic("tick"); }
        function commit(fn, a) {
            const before = state, ev = [];
            history.push({ state: before, cards: run.cards.slice(), a, coins: run.coins });
            if (history.length > 40) history.shift();
            const next = fn(ev);
            if (!next) { history.pop(); fx.nope(); return false; }
            state = next; moves++; run.stats.moves++;
            stage.previews = []; stage.hint = null; tipHold = Math.min(tipHold, 0.6);
            const open0 = gateOpen(fl, before), open1 = gateOpen(fl, state);
            stage.play(ev, next);
            for (const e of ev) {
                if (e.k === "bonk") { run.stats.bonks++; if (run.stats.bonks === 1) snap("bonk"); }
                if (e.k === "kill") { run.stats.kills++; if (e.how === "pit" && run.stats.kills === 1) snap("pit"); }
                if (e.k === "hurt") { run.stats.hits++; snap("hurt"); }
                if (e.k === "coin") { run.coins += run.relics.includes("detector") ? 2 : 1; run.stats.coins++; }
            }
            if (!open0 && open1 && !state[H.WON]) stage.beat(0.2, null, { start: () => { fx.gate(); say(fl.goal === "ticket" ? "Ticket stamped. The gift shop is open!" : "All clear! The gift shop is open!", 2.2, C.gold); stage.flare(fl.ter.indexOf(TT.EXIT) % fl.w + 0.5, 0.2, 6, [255, 216, 120], 0.6, 1.4); } });
            if (state[H.HP] <= 0) mode = "dying";
            else if (state[H.WON]) mode = "leaving";
            return true;
        }
        function undo() {
            if (mode !== "play" && mode !== "dead") return;
            if (undos <= 0 || !history.length) { fx.nope(); return; }
            const h = history.pop(); undos--;
            state = h.state; run.cards = h.cards; run.coins = h.coins; run.stats.undos++;
            stage.sync(state); stage.refreshDanger(); stage.previews = [];
            mode = "play"; deathInfo = null; moves = Math.max(0, moves - 1); armed = null;
            s.flash("#49bcae44", 0.16); fx.undo(); s.shake(2, 0.1, { haptic: false });
            stage.player.sx = 0.7; stage.player.sy = 1.3;
            onIdle();
        }
        function useAbility() {
            if (mode !== "play") return;
            if (state[H.CHARGES] <= 0) { fx.nope(); say("No charges left on this floor."); return; }
            if (ABILITY_DIR[K.ability]) { armed = armed?.ability ? null : { ability: true, what: K.ability, label: K.label }; fx.arm(); return; }
            commit((ev) => { const n = special(fl, state, K.ability, -1, ev); if (n) n[H.CHARGES]--; return n; }, -1);
        }
        function useCard(i) {
            if (mode !== "play") return;
            const key = run.cards[i]; if (!key) return;
            const c = CARDS[key];
            if (c.dir) { armed = armed?.card === i ? null : { card: i, what: c.what, label: c.name }; fx.arm(); return; }
            const ok = commit((ev) => special(fl, state, c.what, -1, ev), -1);
            if (ok) { run.cards.splice(i, 1); run.stats.cards++; }
        }
        function fireArmed(d) {
            const a = armed; armed = null;
            const ok = commit((ev) => { const n = special(fl, state, a.what, d, ev); if (n && a.ability) n[H.CHARGES]--; return n; }, -1);
            if (!ok) { say("Can't do that that way."); return; }
            if (a.card !== undefined) { run.cards.splice(a.card, 1); run.stats.cards++; }
        }
        function useGuide() {
            if (guide <= 0 || mode !== "play") return;
            const r = solve(fl, state, { cap: 30000, maxDepth: 40 });
            if (!r.path) { say("The guidebook shrugs. No flawless way from here."); fx.nope(); return; }
            guide--; stage.hint = { d: r.path[0] }; fx.arm(); say(`The guidebook says: ${DIR_NAME[r.path[0]]}.`, 2.5, C.mint);
        }

        // ---------- ends of floors ----------
        function finishFloor() {
            if (s.__left) return; s.__left = true;
            const flawless = state[H.HITS] === 0, par = moves <= run.jobs[index].done.par;
            const earn = { base: 2, flawless: flawless ? 1 : 0, par: par ? 2 : 0 };
            run.hp = state[H.HP];
            run.coins += earn.base + earn.flawless + earn.par;
            run.stats.floors++; if (flawless) run.stats.flawless++; if (par) run.stats.pars++;
            run.lastBonus = { ...earn, floor: index, name: fl.name, moves, parN: run.jobs[index].done.par };
            save.stamps += 1 + (flawless ? 1 : 0);
            save.best = Math.max(save.best, index + 1);
            if (spec.boss && spec.d < 4) { save.bosses = Math.max(save.bosses, spec.d + 1); if (run.relics.includes("thermos")) run.hp = Math.min(run.maxHp, run.hp + 1); }
            run.floor++;
            fx.exit();
            s.flash("#ffce4a55", 0.2);
            storeSave(game, save);
            if (run.floor >= FLOORS) { run.won = true; save.wins++; storeSave(game, save); game.go("recap", {}, { fade: 0.5 }); }
            else game.go("shop", { free: !!spec.boss }, { fade: 0.25 });
        }
        function startDeath() {
            mode = "dead"; fx.death(); run.cause = lastCause;
            game.haptic("error");
            s.timeScale = 1;
            const info = lastCause && typeof lastCause === "number" ? MON_INFO[MON_KEY[lastCause]] : CAUSE[lastCause] ?? { name: "Misadventure", rule: "It happens to the best of us." };
            deathInfo = { name: info.name, rule: info.rule, lesson: null };
            // Find the most recent moment a flawless route still existed, and say so.
            for (let i = history.length - 1, back = 0; i >= 0 && back < 5; i--, back++) {
                const h = history[i], r = solve(fl, h.state, { cap: 9000, maxDepth: 30 });
                if (r.path) { deathInfo.lesson = { ago: back + 1, dir: r.path[0], len: r.path.length }; break; }
            }
            snap("dead");
        }
        function endRun() {
            run.dead = true; storeSave(game, save);
            game.go("recap", {}, { fade: 0.5 });
        }

        // ---------- buttons ----------
        const trayN = () => 3 + run.slots;
        const trayW = () => Math.min(62, (s.view.width - L.sf.left - L.sf.right - 16) / trayN() - 4);
        const trayPos = (i) => {
            if (L.portrait) { const w = trayW(), n = trayN(); return [s.view.width / 2 + (i - (n - 1) / 2) * (w + 4), s.view.height - L.sf.bottom - 40]; }
            const col = i % 2, row = (i / 2) | 0;
            return [s.view.width - L.sf.right - 72 + (col - 0.5) * 66 + 6, L.sf.top + 88 + row * 66];
        };
        const live = () => mode === "play" || mode === "dead";
        const slot = (i, o) => addButton(s, { w: () => (L.portrait ? trayW() : 60), h: 60, x: () => trayPos(i)[0], y: () => trayPos(i)[1], visible: () => mode !== "load", ...o });
        slot(0, { name: "undo", paint(d, w, h, on, press) { tray(d, w, h, on && undos > 0 && history.length > 0, press, "icon_undo", undos > 0 ? `${undos}` : "0", "UNDO", 1); }, onTap: undo });
        slot(1, { name: "wait", paint(d, w, h, on, press) { tray(d, w, h, mode === "play", press, "icon_wait", "", "WAIT", 2); }, onTap: () => act(WAIT) });
        slot(2, { name: "ability", paint(d, w, h, on, press) { const n = state ? state[H.CHARGES] : 0; tray(d, w, h, n > 0, press, `i_${K.ability}`, `${n}`, K.label.toUpperCase(), armed?.ability ? 0 : 1); }, onTap: useAbility });
        for (let i = 0; i < 4; i++) slot(3 + i, { name: `card${i}`, visible: () => mode !== "load" && i < run.slots,
            paint(d, w, h, on, press) { const key = run.cards[i]; if (key) tray(d, w, h, true, press, `i_${key}`, "", "POST", armed?.card === i ? 0 : 3); else { nine(d, "btn", 2, 0, 0, w, h, 2, { opacity: 0.4 }); ptext(d, "-", 0, -2, { color: C.ash, shadow: false }); } },
            onTap: () => { if (run.cards[i]) { if (!armed) say(`${CARDS[run.cards[i]].name}: ${CARDS[run.cards[i]].desc}`, 3, C.cream); useCard(i); } } });
        function tray(d, w, h, on, press, icon, count, label, style) {
            const dip = press > 0.4 ? 2 : 0;
            nine(d, "btn", on ? style : 2, 0, dip, w, h, 2);
            spr(d, icon, 0, dip - 10, { scale: 2, opacity: on ? 1 : 0.45 });
            const col = on && (style === 0 || style === 3) ? C.ink : on ? C.bone : C.ash;
            ptext(d, label.length > 6 ? label.slice(0, 6) : label, 0, dip + 15, { scale: 1, color: col, shadow: false });
            if (count !== "") { d.circle(8, { x: w / 2 - 8, y: -h / 2 + 8 + dip, color: C.ink }); ptext(d, count, w / 2 - 8, -h / 2 + 8 + dip, { scale: 1, color: C.gold, shadow: false }); }
        }
        addButton(s, { name: "settings", w: 50, h: 50, x: () => s.view.width - L.sf.right - 29, y: () => L.sf.top + 29, layer: 60, style: 2, icon: "icon_gear", scale: 1.5, onTap: () => { if (mode === "play") { mode = "pause"; fx.arm(); } else if (mode === "pause") mode = "play"; } });
        addButton(s, { name: "guide", w: 50, h: 50, x: () => s.view.width - L.sf.right - 80, y: () => L.sf.top + 29, style: 3, icon: "i_guidebook", scale: 1, visible: () => guide > 0 && mode === "play", onTap: useGuide });

        // Pause and death menus
        const modalY = (k) => s.view.height / 2 + k;
        const pauseOn = () => mode === "pause";
        addButton(s, { name: "resume", w: 200, h: 48, x: () => s.view.width / 2, y: () => modalY(-74), layer: 80, label: "Back to it", visible: pauseOn, onTap: () => { mode = "play"; } });
        addButton(s, { name: "sound", w: 200, h: 48, x: () => s.view.width / 2, y: () => modalY(-20), layer: 80, style: 1, label: () => (save.sound ? "Sound: on" : "Sound: off"), visible: pauseOn, onTap: () => { save.sound = !save.sound; game.audio.muted = !save.sound; storeSave(game, save); } });
        addButton(s, { name: "haptic", w: 200, h: 48, x: () => s.view.width / 2, y: () => modalY(34), layer: 80, style: 1, label: () => (save.haptics ? "Haptics: on" : "Haptics: off"), visible: pauseOn, onTap: () => { save.haptics = !save.haptics; game.haptics.enabled = save.haptics; storeSave(game, save); game.haptic("medium"); } });
        addButton(s, { name: "quit", w: 200, h: 48, x: () => s.view.width / 2, y: () => modalY(88), layer: 80, style: 2, label: () => (confirmQuit ? "Really? Tap again" : "Abandon holiday"), visible: pauseOn, onTap: () => { if (confirmQuit) { run.dead = true; run.cause = "quit"; endRun(); } else confirmQuit = true; } });
        const deadOn = () => mode === "dead";
        const deadUndo = () => undos > 0 && history.length > 0;
        addButton(s, { name: "takeback", w: 280, h: 52, x: () => s.view.width / 2, y: () => modalY(76), layer: 80, style: 1, icon: "icon_undo", label: "Take it back", visible: () => deadOn() && deadUndo(), onTap: undo });
        addButton(s, { name: "snaps", w: 280, h: 52, x: () => s.view.width / 2, y: () => modalY(deadUndo() ? 134 : 76), layer: 80, style: () => (deadUndo() ? 2 : 0), label: "See the holiday snaps", scale: 2, visible: deadOn, onTap: endRun });

        // ---------- input ----------
        s.onUpdate((dt) => {
            pump(run, mode === "load" ? 12 : stage?.busy ? 1 : 4);
            if (mode === "load") { if (run.jobs[index]?.done) begin(); return; }
            stage.update(dt);
            banner = Math.max(0, banner - dt / 2.2);
            if (toast) { toast.t += dt; if (toast.t > toast.hold) toast = null; }
            if (tip) { tipHold -= dt; if (tipHold <= 0) tip = null; }
            hud.hp += (state[H.HP] - hud.hp) * Math.min(1, dt * 16);
            hud.coins += (run.coins - hud.coins) * Math.min(1, dt * 12);
            const i = s.input;
            if (mode !== "play") { if (mode === "dead" && i.pressed("undo")) undo(); return; }
            if (i.pressed("up")) act(0); else if (i.pressed("right")) act(1); else if (i.pressed("down")) act(2); else if (i.pressed("left")) act(3);
            else if (i.pressed("wait")) act(WAIT); else if (i.pressed("undo")) undo(); else if (i.pressed("ability")) useAbility(); else if (i.pressed("guide")) useGuide();
            else if (i.pressed("card1")) useCard(0); else if (i.pressed("card2")) useCard(1); else if (i.pressed("pause")) mode = "pause";
            const p = i.pointer;
            if (p.pressed) { pressing = true; fired = false; pressX = p.x; pressY = p.y; }
            if (pressing && p.down && !fired) {
                const dx = p.x - pressX, dy = p.y - pressY;
                if (Math.hypot(dx, dy) > 18) { fired = true; act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); }
            }
            if (i.swipe && !fired) { act(["up", "right", "down", "left"].indexOf(i.swipe)); fired = true; }
            if (p.released && pressing) { pressing = false; if (!fired) tapBoard(p.x, p.y); fired = false; }
        });
        function tapBoard(x, y) {
            const [tx, ty] = stage.tileAt(x, y), px = state[H.P] % fl.w, py = (state[H.P] / fl.w) | 0;
            if (tx === px && ty === py) { act(WAIT); return; }
            if (tx >= 0 && ty >= 0 && tx < fl.w && ty < fl.h) {
                const m = monAt(state, ty * fl.w + tx);
                if (m && Math.abs(tx - px) + Math.abs(ty - py) !== 1) { tip = { key: MON_KEY[state[m]], boss: isBoss(state[m]) }; tipHold = 4; fx.arm(); return; }
            }
            const [vx, vy] = stage.toView(px, py), dx = x - vx, dy = y - vy;
            act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
        }

        s.on("resize", layout);
        layout();

        // ---------- drawing ----------
        s.onDraw((d) => {
            const v = s.view;
            d.rect(v.width + 40, v.height + 40, { x: v.width / 2, y: v.height / 2, color: stage?.th.sky ?? C.ink });
            if (stage) stage.draw(d);
            else { ptext(d, "Walking to the next attraction...", v.width / 2, v.height / 2, { scale: 2, color: C.straw }); }
        });
        s.onDrawUI((d) => {
            if (!stage) return;
            const v = s.view, sf = L.sf;
            if (L.portrait) d.rect(v.width + 8, L.top - 4, { x: v.width / 2, y: (L.top - 4) / 2, color: stage.th.sky, opacity: 0.86 });
            // Hearts
            const hx = sf.left + 14, hy = sf.top + 18;
            const heartsLeft = state[H.HP];
            for (let i = 0; i < Math.max(run.maxHp, heartsLeft); i++) {
                const low = heartsLeft === 1 && i === 0 ? 1 + Math.sin(stage.time * 8) * 0.12 : 1;
                spr(d, "heart", hx + i * 18 + 6, hy, { frame: i < heartsLeft ? 0 : 1, scale: low * 1.2 });
            }
            if (state[H.SHIELD] > 0) spr(d, "heart", hx + Math.max(run.maxHp, heartsLeft) * 18 + 6, hy, { frame: 2, scale: 1.2 });
            spr(d, "icon_coin", hx + 6, hy + 21, { scale: 1 });
            ptext(d, Math.round(hud.coins), hx + 16, hy + 21, { align: 0, color: C.gold, scale: 1.5 });
            // Title
            const cxT = L.portrait ? v.width / 2 + 8 : sf.left + (L.left - sf.left) / 2, tY = L.portrait ? sf.top + 14 : sf.top + 64;
            ptext(d, `${index + 1}/${FLOORS} ${dun.time}`, cxT, tY, { scale: 1, color: C.straw, shadow: C.ink });
            ptext(d, fl.name, cxT, tY + 13, { scale: L.portrait && textWidth(fl.name, 1.5) < 170 ? 1.5 : 1, color: C.bone });
            ptext(d, objective(), cxT, tY + 29, { scale: 1, color: gateOpen(fl, state) ? C.gold : C.pale });
            // Boss health
            if (spec.boss) {
                const n = state[H.BOSS], y = L.portrait ? sf.top + 62 : sf.top + 120, x0 = cxT;
                for (let i = 0; i < 3; i++) spr(d, "skull", x0 + (i - 1) * 16, y, { opacity: i < n ? 1 : 0.2 });
            }
            // Relics
            const rx0 = L.portrait ? v.width - sf.right - 12 : sf.left + 14, ry = L.portrait ? sf.top + 54 : sf.top + 170;
            if (L.portrait) run.relics.slice(0, 12).forEach((k, i) => spr(d, `i_${k}`, rx0 - i * 18, ry));
            else run.relics.slice(0, 12).forEach((k, i) => spr(d, `i_${k}`, rx0 + (i % 5) * 20, ry + ((i / 5) | 0) * 20));

            // Info bar
            const barY = L.portrait ? v.height - sf.bottom - 92 : v.height - sf.bottom - 52, barX = L.portrait ? v.width / 2 : sf.left + L.left / 2 - sf.left / 2, barW = L.portrait ? v.width - 16 : L.left - sf.left - 10;
            if (armed) infoBar(d, barX, barY, barW, `${armed.label}: swipe a direction`, C.gold);
            else if (tip) drawTip(d, barX, barY, barW);
            else if (toast) infoBar(d, barX, barY, barW, toast.text, toast.color);
            else if (index === 0 && moves < 2 && !toast) infoBar(d, barX, barY, barW, "Swipe or tap a direction. Everything moves when you do.", C.cream);
            else if (index === 0 && !gateOpen(fl, state)) infoBar(d, barX, barY, barW, "Walk into a monster to shove it. Pits are lovely.", C.cream);
            else if (index === 1 && moves < 8 && !gateOpen(fl, state)) infoBar(d, barX, barY, barW, "Shove one monster into another: BONK. Red tiles bite.", C.cream);
            else if (armed === null && moves === 0) infoBar(d, barX, barY, barW, `Par: ${run.jobs[index].done.par} moves. Hit it for a bonus.`, C.pale);

            // Floor intro card
            if (banner > 0 && mode === "play") {
                const k = Math.min(1, banner * 3), y = v.height * 0.36;
                d.rect(v.width + 8, 54, { x: v.width / 2, y, color: C.ink, opacity: 0.72 * k });
                ptext(d, spec.boss ? "BOSS" : dun.name, v.width / 2, y - 12, { scale: 1.5, color: spec.boss ? C.ember : C.straw, opacity: k });
                ptext(d, fl.name, v.width / 2, y + 10, { scale: 2, color: C.bone, opacity: k });
            }

        });
        s.add([ui(), layer(70), { draw(d) {
            if (!stage) return;
            const v = s.view;
            if (mode === "pause") {
                dimmer(d, s, 0.68);
                ptext(d, "Holiday paused", v.width / 2, modalY(-120), { scale: 2, color: C.gold });
                ptext(d, `Seed ${run.seed}${run.daily ? " (daily)" : ""}`, v.width / 2, modalY(122), { scale: 1, color: C.pale });
                // Souvenirs carried, so a build can be read mid-run.
                const list = [...run.relics.map((k) => [k, RELICS[k]]), ...run.cards.map((k) => [k, CARDS[k]])], y0 = L.portrait ? modalY(142) : 0;
                if (L.portrait) list.slice(0, Math.floor((v.height - y0 - 10) / 18)).forEach(([k, r], i) => { spr(d, `i_${k}`, 24, y0 + i * 18); ptext(d, `${r.name}: ${r.desc}`, 38, y0 + i * 18, { scale: 1, align: 0, color: C.cream }); });
                else list.slice(0, 16).forEach(([k, r], i) => { spr(d, `i_${k}`, L.sf.left + 16, 18 + i * 20); ptext(d, r.name, L.sf.left + 30, 18 + i * 20, { scale: 1, align: 0, color: C.cream }); });
            }
            if (mode === "dead" && deathInfo) drawDeath(d);
        } }]);
        function infoBar(d, x, y, w, text, color) {
            const lines = wrap(text, w - 18, 1.5), h = 12 + lines.length * 13;
            panel(d, x, y, w, Math.max(26, h), true, 0.92);
            lines.forEach((l, i) => ptext(d, l, x, y + (i - (lines.length - 1) / 2) * 13, { scale: 1.5, color, shadow: false }));
        }
        function drawTip(d, x, y, w) {
            const info = MON_INFO[tip.key], lines = wrap(info.rule, w - 44, 1.5), h = 22 + lines.length * 13;
            panel(d, x, y - (lines.length > 1 ? 6 : 0), w, h, true, 0.95);
            const top = y - (lines.length > 1 ? 6 : 0) - h / 2;
            spr(d, tip.boss ? "g_boss" : `g_${tip.key}`, x - w / 2 + 18, top + h / 2, { scale: 2 });
            ptext(d, (tip.fresh ? "NEW: " : "") + info.name, x - w / 2 + 34, top + 11, { scale: 1.5, align: 0, color: GLYPH_COLOR[tip.key] ?? C.gold, shadow: false });
            lines.forEach((l, i) => ptext(d, l, x - w / 2 + 34, top + 24 + i * 13, { scale: 1.5, align: 0, color: C.cream, shadow: false }));
        }
        function drawDeath(d) {
            const v = s.view, w = Math.min(v.width - 24, 330), info = deathInfo, cy = modalY(-46), h = 172;
            dimmer(d, s, 0.5);
            panel(d, v.width / 2, cy, w, h, false);
            ptext(d, "Trip cut short", v.width / 2, cy - 68, { scale: 2, color: C.blood, shadow: false });
            ptext(d, `by ${info.name}`, v.width / 2, cy - 48, { scale: 1.5, color: C.ink, shadow: false });
            wrap(info.rule, w - 28, 1.5).forEach((l, i) => ptext(d, l, v.width / 2, cy - 26 + i * 13, { scale: 1.5, color: C.wine, shadow: false }));
            const les = info.lesson;
            if (les) {
                spr(d, "arrow", v.width / 2 - w / 2 + 26, cy + 44, { rot: les.dir < 4 ? les.dir * Math.PI / 2 : 0, color: C.teal, scale: 2 });
                const txt = les.ago === 1 ? `Last move, ${DIR_NAME[les.dir]} was safe.` : `${les.ago} moves ago, ${DIR_NAME[les.dir]} was still safe.`;
                wrap(`${txt} A clean route was ${les.len} moves.`, w - 66, 1.5).forEach((l, i) => ptext(d, l, v.width / 2 - w / 2 + 46, cy + 30 + i * 13, { scale: 1.5, align: 0, color: C.deep, shadow: false }));
            } else ptext(d, "That one was sealed a while back.", v.width / 2, cy + 44, { scale: 1.5, color: C.deep, shadow: false });
        }
        function objective() {
            if (gateOpen(fl, state)) return "Gift shop: OPEN";
            if (fl.goal === "ticket") return "Find your ticket";
            if (fl.goal === "boss") return "Beat the boss";
            return `Monsters left: ${monsters(state).length}`;
        }
    });
}
