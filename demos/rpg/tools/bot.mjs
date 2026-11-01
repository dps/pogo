// A bot that plays Office Quest from a fresh save to the credits, through the real screens: it taps the same rects a thumb would.
// usage: node tools/bot.mjs [seed] [--quests] [--verbose] [--max steps] [--team sp,sp]
import "../game.js";
import { BEASTS, ITEMS, MOVES, effectiveness, SHOP } from "../data.js";
import { chooseFor, maxHp, usableMoves, bossSpecials, catchOdds, damageOf } from "../sim.js";
import { FLOORS, liftOpen, objective } from "../story.js";
import { Dialog } from "../ui.js";
import { BattleScreen } from "../battle.js";

const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i < 0 ? d : (process.argv[i + 1] ?? true); };
const seed = Number(process.argv[2]) || 1, verbose = process.argv.includes("--verbose"), quests = process.argv.includes("--quests"), MAX = Number(arg("max", 6e6));
export const game = globalThis.__oq;
game.botSpeed = 12;
game.restart("title", {}, { seed });
const log = (...a) => { if (verbose) console.log(...a); };
const stat = { battles: 0, wild: 0, trainers: 0, turns: 0, losses: 0, dialogs: 0, chars: 0, steps0: 0, bossLog: [], maxTurns: 0, floorTurns: {}, lowest: {} };
let steps = 0;
const tapHit = (h) => { game.input.tap(h.x + h.w / 2, h.y + h.h / 2); };
const hit = (sc, id) => sc.hits.find((h) => h.id === id);
const LADDER = ["B2", "B1", "L", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"];
const seenD = new WeakSet(); let cooldown = 0, lastKey = "", stuck = 0, choiceTry = {};

function battleTurn(sc) {
    const st = sc.st, S = game.data.S, m = sc.mon();
    if (sc.mode === "need") { const i = st.sides[0].mons.map((x, n) => [x, n]).filter(([x, n]) => x.hp > 0 && !st.sides[0].active.includes(n)).sort((a, b) => strength(b[0], st) - strength(a[0], st))[0]; const h = hit(sc, "p" + i?.[1]); if (h) tapHit(h); return; }
    if (sc.mode === "target") { const list = sc.tgt.list, h = hit(sc, "tgt" + (sc.wantT ?? list[0])) ?? hit(sc, "tgt" + list[0]); if (h) tapHit(h); return; }
    if (sc.mode !== "choose" || !m) return;
    if (sc.view2 !== "moves") { if (sc.want) { const h = hit(sc, sc.want); if (h) { tapHit(h); sc.want = sc.want2 ?? null; sc.want2 = null; return; } } const b = hit(sc, "back"); if (b) tapHit(b); return; }
    if (sc.want) { const h = hit(sc, sc.want); if (h) { tapHit(h); return; } }
    const specials = bossSpecials(st);
    const foe = st.sides[1].mons[st.sides[1].active[0]], hpf = m.hp / maxHp(m);
    // Bosses: use the gimmick answer
    if (specials.length) {
        const sl = sc.slot, aliveSlots = st.sides[0].active.filter((i) => st.sides[0].mons[i]?.hp > 0);
        if (sl === 0 || aliveSlots.length === 1 || st.boss.id === "printer" === false) { const h = hit(sc, "special0"); if (h && !sc.choices.some((c) => c?.t === "special")) { tapHit(h); return; } }
    }
    // Heal in an emergency
    if (hpf < 0.3 && st.kind !== "wild" || (hpf < 0.25)) {
        const it = ["triple", "flat_white", "coffee"].find((k) => (S.bag[k] ?? 0) > 0);
        if (it && (st.kind !== "wild")) { const i = st.sides[0].active[sc.slot]; sc.bagFor = null; sc.want = "bag"; sc.want2 = null; const b = hit(sc, "bag"); if (b) { tapHit(b); sc.want = "it_" + it; sc.want2 = "on" + i; sc.botItem = 1; } return; }
    }
    // Hire new species
    if (st.kind === "wild" && st.fmt === 1 && !S.caught[foe.sp] && Object.keys(S.bag).some((k) => ITEMS[k]?.cat === "catch" && S.bag[k] > 0)) {
        const it = ["stock", "fleece", "lanyard"].find((k) => (S.bag[k] ?? 0) > 0), o = it && catchOdds(st, foe, ITEMS[it].ball);
        if (it && (foe.hp / maxHp(foe) < 0.5 || o > 0.55 || BEASTS[foe.sp].rate < 60 && foe.hp / maxHp(foe) < 0.7)) { const b = hit(sc, "bag"); if (b) { tapHit(b); sc.want = "it_" + it; } return; }
        // Weaken gently: use the weakest attack that won't knock it out
        const dmg = m.moves.map((id, i) => [i, MOVES[id].pow ? damageOf(st, 0, m, 1, foe, MOVES[id], {}) : 0, m.v.cd[id] ?? 0]).filter((x) => x[1] > 0 && !x[2] && x[1] < foe.hp * 0.85).sort((a, b) => b[1] - a[1]);
        if (dmg.length) { const h = hit(sc, "move" + dmg[0][0]); if (h) { tapHit(h); return; } }
    }
    const pick = chooseFor(st, 0, sc.slot, 2);
    // Bad matchup: swap out occasionally
    const foesLive = st.sides[1].active.map((i) => st.sides[1].mons[i]).filter((f) => f?.hp > 0);
    const i = m.moves.indexOf(pick.move); sc.wantT = pick.target;
    let h = i >= 0 ? hit(sc, "move" + i) : null;
    if (!h) h = sc.hits.find((x) => String(x.id).startsWith("move") && !x.disabled);
    if (h) tapHit(h); else { const r = hit(sc, "team"); if (r) tapHit(r); }
    void foesLive;
}
const strength = (m, st) => { const f = st.sides[1].mons[st.sides[1].active[0]]; if (!f) return m.hp; let best = 0; for (const id of m.moves) { const mv = MOVES[id]; if (mv.pow) best = Math.max(best, mv.pow * effectiveness(mv.type, BEASTS[f.sp].types) * (BEASTS[m.sp].types.includes(mv.type) ? 1.35 : 1)); } return best * m.hp / maxHp(m); };

function worldTick(w) {
    const S = game.data.S, h = w.hero;
    if (w.script || h.moving || w.fade !== w.fadeTo) return;
    if (w.path?.length) return;
    if (cooldown > 0) { cooldown--; return; }
    const key = `${S.floor}|${h.x}|${h.y}|${JSON.stringify(goalKey)}`;
    if (key === lastKey) { stuck++; if (stuck > 400) { console.log("STUCK", key, objective(S), S.sigs); dump(); process.exit(2); } } else { lastKey = key; stuck = 0; }
    teamCare(w);
    const g = chooseGoal(w);
    goalKey = g?.why;
    if (g) perform(w, g);
}
let goalKey = null, sigMark = -1, lossMark = 0;
function teamCare(w) {
    const S = game.data.S;
    // Keep the strongest balanced six. Bring Closet stars in, and use revive/heal items out of battle.
    if (S.party.length >= 6 && S.box.length) {
        const score = (m) => m.lvl * 2 + Object.values(BEASTS[m.sp].base).reduce((a, b) => a + b, 0) / 15;
        const worst = [...S.party].sort((a, b) => score(a) - score(b))[0], best = [...S.box].sort((a, b) => score(b) - score(a))[0];
        if (score(best) > score(worst) + 5) { S.box.splice(S.box.indexOf(best), 1); S.party.splice(S.party.indexOf(worst), 1, best); S.box.push(worst); }
    }
    const lead = S.party.findIndex((m) => m.hp > 0);
    if (lead > 0) { const [a] = S.party.splice(lead, 1); S.party.unshift(a); }
    for (const m of S.party) if (m.hp <= 0 && (S.bag.sick_note ?? 0) > 0) { S.bag.sick_note--; m.hp = Math.floor(maxHp(m) / 2); }
}
const targetLevel = (S) => [6, 9, 12, 16, 20, 24, 27, 30, 34, 38, 41, 44, 44][S.sigs + (S.flags.truth ? 1 : 0) + (S.flags.board ? 1 : 0)];
function chooseGoal(w) {
    const S = game.data.S, f = w.f, hpFrac = S.party.reduce((a, m) => a + m.hp, 0) / Math.max(1, S.party.reduce((a, m) => a + maxHp(m), 0));
    const o = objective(S);
    const objSteps = Object.keys(S.flags).length;
    if (!S.party.length) return { why: "obj", o };
    const coffee = locate(w, "G");
    if (S.party.some((m) => m.status) || hpFrac < 0.55 || S.party.filter((m) => m.hp > 0).length < Math.min(3, S.party.length)) {
        if (coffee) return { why: "heal", prop: coffee };
        if (S.lastBreak) return { why: "goheal", floor: S.lastBreak.floor };
    }
    const vend = locate(w, "V");
    if (vend && S.cash > 500 && !w._shopped?.[S.sigs + S.floor]) return { why: "shop", prop: vend };
    // Fight everyone on the floor: that's where the XP and money are.
    const lead = S.party[0]?.lvl ?? 1;
    if (S.flags.form) {
        const tr = w.ents.filter((e) => e.def.t === "trainer" && w.active(e) && !S.beaten[e.key] && !e.def.boss).map((e) => ({ e, p: w.findPath(e.x, e.y, true, e) })).filter((x) => x.p).sort((a, b) => a.p.length - b.p.length)[0];
        if (tr) return { why: "trainer " + tr.e.key, ent: tr.e };
    }
    // Quest walkthrough, when asked
    if (quests) { const q = questGoal(w); if (q) return q; }
    // Grind a bit before the boss if behind the curve
    // A person who keeps losing goes and levels up, so the bot does too.
    if (sigMark !== S.sigs) { sigMark = S.sigs; lossMark = S.losses; }
    const extra = Math.min(8, (S.losses - lossMark) * 1.5);
    if (S.flags.form && avgLevel(S) < targetLevel(S) + extra && f.wild?.length) { const c = clutter(w); if (c) return { why: "grind", clutter: c }; }
    if (!o) return null;
    return { why: "obj", o };
}
const avgLevel = (S) => { const list = [...S.party].sort((a, b) => b.lvl - a.lvl).slice(0, 4); return list.reduce((a, m) => a + m.lvl, 0) / list.length; };
function locate(w, ch) { for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) if (w.tile(x, y) === ch && w.findPath(x, y, true, null)) return [x, y]; return null; }
function clutter(w) { const h = w.hero; if (w.tile(h.x, h.y) === "\"") { const dirs = [[1, 0, "right"], [-1, 0, "left"], [0, 1, "down"], [0, -1, "up"]].filter(([a, b]) => w.tile(h.x + a, h.y + b) === "\"" && !w.blocked(h.x + a, h.y + b)); return dirs[(game.data.S.steps) % Math.max(1, dirs.length)] ?? [0, 0, "up"]; } let best = null, bd = 1e9; for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) if (w.tile(x, y) === "\"") { const d = Math.abs(x - h.x) + Math.abs(y - h.y); if (d < bd && w.findPath(x, y, false, null)) { bd = d; best = [x, y]; } } return best ? { go: best } : null; }
function perform(w, g) {
    const S = game.data.S, h = w.hero;
    if (g.prop) { w.path = w.findPath(g.prop[0], g.prop[1], true, null); if (g.why === "shop") w._shopped = { ...w._shopped, [S.sigs + S.floor]: 1 }; log("goal", g.why); return; }
    if (g.ent) { const p = w.findPath(g.ent.x, g.ent.y, true, g.ent); if (p) w.path = p; return; }
    if (g.clutter) { if (g.clutter.go) w.path = w.findPath(g.clutter.go[0], g.clutter.go[1], false, null); else w.tryMove(g.clutter[2]); return; }
    if (g.floor) return travel(w, g.floor);
    const o = g.o; if (!o) return;
    if (o.floor !== S.floor) return travel(w, o.floor);
    if (o.ent) {
        const entId = o.ent === "abc" ? "abc"[seed % 3] : o.ent;
        const e = w.ents.find((x) => x.key.endsWith("." + entId));
        if (e && e.def.t === "step") { const p = w.findPath(e.x, e.y, false, null); if (p) w.path = p; return; }
        if (e && w.active(e)) { const p = w.findPath(e.x, e.y, true, e); if (p) { w.path = p; return; } console.log("NO PATH", o, S.floor, h.x, h.y); dump(); process.exit(3); }
    }
    const c = clutter(w); if (c) { if (c.go) w.path = w.findPath(c.go[0], c.go[1], false, null); else w.tryMove(c[2]); }
}
function travel(w, to) {
    const S = game.data.S, h = w.hero;
    if (S.flags.lift && liftOpen(S, to) && S.floor !== to) {
        const lift = locate(w, "E");
        if (lift) { w.path = w.findPath(lift[0], lift[1], true, null); w._liftTo = to; return; }
    }
    const a = LADDER.indexOf(S.floor), b = to === "R" ? 99 : LADDER.indexOf(to), ch = b > a ? "^" : "v";
    const t = locate2(w, ch); if (!t) { console.log("no stairs", ch, S.floor, to); dump(); process.exit(4); }
    const p = w.findPath(t[0], t[1] + 1, false, null) ?? [];
    p.push(ch === "^" || ch === "v" ? "up" : "up");
    w.path = p;
}
function locate2(w, ch) { for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) if (w.tile(x, y) === ch) return [x, y]; return null; }
function shopTick(sc) {
    const S = game.data.S, want = [["lanyard", 8], ["coffee", 6], ["flat_white", 6], ["aspirin", 2], ["sick_note", 3], ["fleece", 4], ["triple", 3]];
    for (const [id, n] of want) { const h = sc.hits.find((x) => x.id === "buy_" + id); if (h && (S.bag[id] ?? 0) < n && S.cash > ITEMS[id].price + 100) { tapHit(h); return; } }
    sc.close();
}
function liftTick(sc) { const w = game.world, h = sc.hits.find((x) => x.id === "f_" + w._liftTo); sc.scroll = 0; const hs = sc.hits.filter((x) => String(x.id).startsWith("f_")); void hs; if (h) tapHit(h); else if (sc.maxScroll > sc.scroll) { sc.scroll = sc.maxScroll; } else { console.log("lift missing", w._liftTo); sc.close(); } }
function questGoal(w) {
    const S = game.data.S, f = S.flags;
    const Q = [
        ["F2", "f", () => !f.q_stapler_on], ["F2", "h", () => f.q_stapler_on && !f.f2_kevin_item], ["F2", "f", () => f.f2_kevin_item && !f.q_stapler],
        ["F3", "f", () => !f.q_dave_on && S.sigs >= 2], ["F4", "r", () => !f.q_thermo], ["F4", "h", () => !f.q_pass_on && S.sigs >= 3], ["F4", "5", () => f.q_pass_on && !f.f4_note], ["F4", "h", () => f.f4_note && !f.q_pass],
        ["F6", "e", () => !f.q_lunch_on], ["F6", "f", () => f.q_lunch_on && !f.cl1], ["F6", "g", () => f.q_lunch_on && !f.cl2], ["F6", "h", () => f.q_lunch_on && !f.cl3], ["F6", "e", () => f.lunch_clues >= 3 && !f.q_lunch],
        ["F7", "f", () => !f.q_cake_on && S.sigs >= 4], ["F6", "p", () => f.q_cake_on && !f.got_cake], ["F7", "f", () => f.got_cake && !f.q_cake], ["F7", "q", () => !f.rc1 && S.sigs >= 4], ["F7", "g", () => f.q_dave_on && (f.dave_cards ?? 0) < 4 && !f.card_Gabe],
        ["F8", "f", () => !f.q_receipts_on && S.sigs >= 5], ["F8", "r", () => !f.rc2 && S.sigs >= 5], ["F9", "r", () => !f.rc3 && S.sigs >= 6], ["F9", "f", () => !f.q_ergo && S.sigs >= 6], ["F9", "y", () => f.q_dave_on && (f.dave_cards ?? 0) < 4 && !f.card_Sam && S.sigs >= 6], ["F8", "m", () => f.q_dave_on && (f.dave_cards ?? 0) < 4 && !f.card_Analyst && S.sigs >= 5], ["F8", "f", () => f.receipts >= 3 && !f.q_receipts],
        ["F6", "p", () => f.q_dave_on && (f.dave_cards ?? 0) < 4 && !f.card_Lena && S.sigs >= 4], ["F3", "f", () => (f.dave_cards ?? 0) >= 4 && !f.q_dave], ["F10", "f", () => !f.q_tnc && S.sigs >= 7],
        ["R", "d", () => f.credits && f.q_dave && !f.temp_found], ["F12", "z", () => f.credits && !f.ooo_got],
    ];
    for (const [fl, ent, test] of Q) {
        if (!test() || !S.seenFloors[fl] && fl !== "R" && fl !== "F12") continue;
        if (fl !== S.floor) return { why: "q " + fl + ent, floor: fl };
        const e = w.ents.find((x) => x.key === fl + "." + ent);
        if (e && w.active(e) && w.findPath(e.x, e.y, true, e)) return { why: "q" + ent, ent: e };
    }
    return null;
}
function dump() { const S = game.data.S; console.log(JSON.stringify({ floor: S.floor, x: S.x, y: S.y, sigs: S.sigs, flags: S.flags, top: game.stack?.top?.constructor?.name, party: S.party?.map((m) => [m.sp, m.lvl, m.hp]) }, null, 0)); }

let lastBattle = null, lastSceneTop = null;
function tick() {
    const top = game.stack?.top; if (!top) return;
    const name = top.constructor.name;
    const S = game.data.S;
    if (game.state().scene === "ending") { game.input.tap(180, 300); return; }
    if (name === "World") { worldTick(top); return; }
    if (name === "Dialog") {
        if (!seenD.has(top)) { seenD.add(top); stat.dialogs++; stat.chars += top.text.length; log(`[${top.who ?? "note"}] ${top.text}`); }
        if (top.opts && top.finished) {
            const key = top.text; choiceTry[key] = (choiceTry[key] ?? -1) + 1; const i = choiceTry[key] % top.opts.length;
            const hh = hit(top, "c" + (quests && /Who ate/.test(key) ? 2 : /Read them/.test(key) ? 0 : i)) ?? hit(top, "c0"); if (hh) { tapHit(hh); }
            return;
        }
        game.input.tap(180, 200); return;
    }
    if (name === "BattleScreen") {
        if (top !== lastBattle) { lastBattle = top; stat.battles++; if (top.cfg.kind === "wild") stat.wild++; else stat.trainers++; top._t0 = S.time; const st = top.st; top._foeLvl = Math.max(...st.sides[1].mons.map((m) => m.lvl)); log("BATTLE", top.cfg.kind, top.cfg.name ?? "", st.sides[1].mons.map((m) => m.sp + ":" + m.lvl).join(" "), "vs", S.party.map((m) => m.sp + ":" + m.lvl + "/" + m.hp).join(" ")); top._done = (r) => {}; }
        if (top.st.over && !top._logged) { top._logged = 1; stat.turns += top.st.turn; stat.maxTurns = Math.max(stat.maxTurns, top.st.turn); if (top.st.over === "lose") { stat.losses++; log("LOST to", top.cfg.name ?? "wild"); } if (top.cfg.kind === "boss") stat.bossLog.push(`${top.cfg.name}:${top.st.over}:t${top.st.turn}:L${top._foeLvl}:party ${S.party.map((m) => m.lvl).join("/")}`); }
        if (top.mode === "play" || top.mode === "wipein" || top.mode === "wipeout") { game.input.tap(180, 200); return; }
        battleTurn(top); return;
    }
    if (name === "ShopMenu") return shopTick(top);
    if (name === "LiftMenu") return liftTick(top);
    if (name === "GotMon" || name === "Promotion") { game.input.tap(180, 200); return; }
    if (name === "ClosetMenu" || name === "PauseMenu") { top.close(); return; }
    const titleNew = hit(top, "new"); if (titleNew) { tapHit(titleNew); return; }
    const yes = hit(top, "yes"); if (yes) tapHit(yes);
}
const t0 = Date.now();
while (steps < MAX) {
    game.step(1); steps++;
    game.render?.();
    if (steps % 2 === 0) tick();
    const S = game.data.S;
    if (S?.flags?.credits && !quests) break;
    if (S?.flags?.credits && quests && S.flags.temp_found && S.flags.ooo_got) break;
}
const S = game.data.S, human = (S.steps * 0.2) + stat.chars / 22 + stat.dialogs * 1.2 + stat.turns * 7 + stat.battles * 8;
console.log(JSON.stringify({ seed, done: !!S?.flags?.credits, steps, sec: (Date.now() - t0) / 1000, sigs: S.sigs, walkSteps: S.steps, ...stat, humanHours: +(human / 3600).toFixed(2), hired: Object.keys(S.caught).length, party: S.party.map((m) => m.sp + ":" + m.lvl), cash: S.cash }));
if (!S?.flags?.credits) { dump(); process.exit(1); }
process.exit(0);
