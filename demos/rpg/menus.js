// Everything behind the briefcase: team, bag, the Deskmate Directory, the type chart, the Onboarding Form, settings, and the machines in the world.
import { INK } from "./ink.js";
import { BEASTS, ITEMS, MOVES, PERKS, SHOP, STATUS, STRONG, TYPES } from "./data.js";
import { COL, FONT, Screen, T, TYPE, bar, btn, hpColor, panel, wrapHeight } from "./ui.js";
import { beastSprite, ITEM_ICON, itemSprite } from "./sprites.js";
import { bestMoves, maxHp, promote, stat, xpForLevel } from "./sim.js";
import { FLOORS, LIFT_ORDER, QUESTS, SIGNERS, liftOpen, objective } from "./story.js";
import { save } from "./world.js";

/** A full-screen manila sheet with a tab, a back button and a scrolling body. */
class Sheet extends Screen {
    constructor(title, o = {}) { super(); this.title = title; this.o = o; this.scroll = 0; this.bodyH = 0; this.opaque = true; }
    update(dt, I) {
        const p = I.pointer;
        if (p.down && Math.abs(p.dy) > 0) { this.scroll -= p.dy; this.dragged = (this.dragged ?? 0) + Math.abs(p.dy); }
        if (!p.down) this.dragged = 0;
        if (I.scroll) this.scroll += I.scroll;
        this.scroll = Math.max(0, Math.min(this.maxScroll ?? 0, this.scroll));
        if (I.cancel) this.close();
    }
    close() { this.game.audioKit?.play("close"); this.stack.pop(this); this.o.done?.(); }
    frame(d, V) {
        const g = this.game, W = Math.min(V.width, 640), x = (V.width - W) / 2;
        d.rect(V.width, V.height, { x: V.width / 2, y: V.height / 2, color: "#2b3044" });
        panel(d, x + 6, 52, W - 12, V.height - 58, { fill: COL.manila, radius: 8, shadow: 0 });
        const tw = Math.min(W - 90, g.renderer.measureText(this.title, { size: 16, font: FONT, bold: true, align: "center", maxWidth: 0, lineHeight: 1.25 }).width + 34);
        panel(d, x + 18, 24, tw, 36, { fill: COL.manila, radius: 6, shadow: 0 });
        d.rect(tw - 5, 12, { x: x + 18 + tw / 2, y: 58, color: COL.manila });
        T(d, g, this.title, x + 34, 42, { size: 16, bold: true });
        btn(this, d, g, x + W - 62, 8, 52, 40, "Back", { id: "back", size: 13, fn: () => this.close() });
        return { x: x + 16, y: 66, w: W - 32, h: V.height - 82 };
    }
    body(d, R, fn) {
        this.maxScroll = Math.max(0, this.bodyH - R.h);
        d.clip(R.x - 6, R.y, R.w + 12, R.h, () => { d.push(); d.translate(0, -this.scroll); fn(); d.pop(); });
    }
    /** A hit inside the scrolled body, clipped to the visible window. */
    bodyHit(R, h) {
        const y = h.y - this.scroll, top = Math.max(y, R.y), bot = Math.min(y + h.h, R.y + R.h);
        if (bot > top) this.addHit({ ...h, y: top, h: bot - top });
    }
    input(I) { if (this.dragged > 12 && I.pointer.tapped) return false; return super.input(I); }
}

export class PauseMenu extends Screen {
    constructor(world) { super(); this.world = world; this.opaque = false; this.t = 0; }
    tick(dt) { this.t += dt; }
    update(dt, I) { if (I.cancel) this.close(); }
    close() { this.game.audioKit?.play("close"); this.stack.pop(this); }
    draw(d, V) {
        const g = this.game, S = g.data.S, W = Math.min(V.width - 40, 300), rows = [["Team", () => this.stack.push(new TeamMenu())], ["Bag", () => this.stack.push(new BagMenu())], ["Deskmate Directory", () => this.stack.push(new DexMenu())], ["Type Chart", () => this.stack.push(new TypeChart())], ["Onboarding Form", () => this.stack.push(new FormMenu())], ["Settings", () => this.stack.push(new Settings(this.world))], ["Save", () => { save(g); g.audioKit?.play("item"); g.toasts?.add("Saved. HR will never know."); this.close(); }]];
        const bh = V.height < 420 ? 34 : 46, gap = V.height < 420 ? 5 : 8, H = rows.length * (bh + gap) + 58, x = V.width - W - 12, y = Math.max(8, Math.min(58, V.height - H - 10));
        d.rect(V.width, V.height, { x: V.width / 2, y: V.height / 2, color: INK, opacity: 0.5 });
        this.addHit({ x: 0, y: 0, w: V.width, h: V.height, id: "shade", fn: () => this.close(), noKey: true });
        panel(d, x, y, W, H, { fill: COL.manila, radius: 8 });
        this.addHit({ x, y, w: W, h: H, id: "bg", noKey: true });
        T(d, g, `$${S.cash}`, x + 14, y + 20, { size: 15, bold: true, font: TYPE });
        T(d, g, `${Object.keys(S.caught).length}/${Object.keys(BEASTS).length} hired  ·  ${fmtTime(S.time)}`, x + W - 12, y + 20, { size: 12, bold: true, align: "right", font: TYPE, color: "#6b4d1e" });
        rows.forEach(([lb, fn], i) => btn(this, d, g, x + 12, y + 38 + i * (bh + gap), W - 24, bh, lb, { id: "m" + i, size: 15, fn: () => { g.audioKit?.play("open"); fn(); } }));
    }
}
export const fmtTime = (s) => `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, "0")}m`;

export class TeamMenu extends Sheet {
    constructor() { super("Team"); this.sel = null; }
    draw(d, V) {
        const g = this.game, S = g.data.S, R = this.frame(d, V), cols = R.w > 480 ? 2 : 1, gap = 8, cw = (R.w - gap * (cols - 1)) / cols, ch = 74;
        this.bodyH = Math.ceil(S.party.length / cols) * (ch + gap) + 30;
        this.body(d, R, () => {
            T(d, g, "Tap a Deskmate for details. Grade is their level.", R.x, R.y + 8, { size: 12, bold: true, color: "#6b4d1e" });
            S.party.forEach((m, i) => {
                const x = R.x + (i % cols) * (cw + gap), y = R.y + 22 + Math.floor(i / cols) * (ch + gap), b = BEASTS[m.sp];
                panel(d, x, y, cw, ch, { fill: this.swap === i ? COL.sticky : COL.white, radius: 7, shadow: 3 });
                d.sprite(beastSprite(g, m.sp), { x: x + 37, y: y + ch / 2, width: 62, height: 62 });
                T(d, g, b.name, x + 74, y + 17, { size: 15, bold: true });
                T(d, g, `Gr ${m.lvl}`, x + cw - 12, y + 17, { size: 12, bold: true, align: "right", font: TYPE });
                const t = m.hp / maxHp(m); bar(d, x + 74, y + 30, cw - 88, 11, t, hpColor(t));
                T(d, g, m.hp > 0 ? `${m.hp}/${maxHp(m)}` : "Out of Office", x + 74, y + 53, { size: 12, bold: true, font: TYPE, color: m.hp > 0 ? INK : COL.red });
                if (m.status) T(d, g, STATUS[m.status].short, x + cw - 12, y + 53, { size: 11, bold: true, align: "right", color: STATUS[m.status].color });
                this.bodyHit(R, { x, y, w: cw, h: ch, id: "t" + i, fn: () => { g.audioKit?.play("open"); this.stack.push(new MonDetail(m, i)); } });
            });
        });
    }
}
class MonDetail extends Sheet {
    constructor(m, idx) { super(BEASTS[m.sp].name); this.m = m; this.idx = idx; }
    draw(d, V) {
        const g = this.game, S = g.data.S, m = this.m, b = BEASTS[m.sp], R = this.frame(d, V);
        this.body(d, R, () => {
            let y = R.y + 4; const x = R.x, w = R.w;
            d.sprite(beastSprite(g, m.sp), { x: x + 66, y: y + 62, width: 128, height: 128 });
            const sx = x + 138;
            T(d, g, `Grade ${m.lvl}`, sx, y + 12, { size: 14, bold: true, font: TYPE });
            let cx = sx; for (const t of b.types) { const tw = g.renderer.measureText(TYPES[t].name, { size: 11, font: FONT, bold: true, align: "center", maxWidth: 0, lineHeight: 1.25 }).width + 14; panel(d, cx, y + 24, tw, 20, { fill: TYPES[t].color, radius: 4, shadow: 0 }); T(d, g, TYPES[t].name, cx + tw / 2, y + 34, { size: 11, bold: true, align: "center" }); cx += tw + 5; }
            const stats = [["Morale", maxHp(m)], ["Hustle", stat(m, "atk")], ["Grit", stat(m, "def")], ["Savvy", stat(m, "sav")], ["Pace", stat(m, "pace")]];
            stats.forEach(([n, v], i) => { const yy = y + 54 + i * 15; T(d, g, n, sx, yy, { size: 12, bold: true, color: "#6b4d1e" }); T(d, g, v, sx + 92, yy, { size: 12, bold: true, align: "right", font: TYPE }); });
            y += 132;
            const toNext = m.lvl >= 60 ? 1 : (m.xp - xpForLevel(m.lvl)) / (xpForLevel(m.lvl + 1) - xpForLevel(m.lvl));
            bar(d, x, y, w, 9, toNext, COL.blue); y += 22;
            const p = PERKS[b.perk];
            T(d, g, `${p.name}: ${p.text}`, x, y, { size: 13, bold: true, maxWidth: w }); y += wrapHeight(g, `${p.name}: ${p.text}`, { size: 13, bold: true, maxWidth: w }) + 6;
            T(d, g, b.dex, x, y, { size: 13, maxWidth: w, font: TYPE }); y += wrapHeight(g, b.dex, { size: 13, maxWidth: w, font: TYPE }) + 10;
            T(d, g, "Moves (tap to bench or equip)", x, y, { size: 12, bold: true, color: "#6b4d1e" }); y += 12;
            for (const id of m.known) {
                const mv = MOVES[id], on = m.moves.includes(id), h = 44;
                panel(d, x, y - this.scroll * 0, w, h, { fill: on ? TYPES[mv.type].color : "#d8ccb0", radius: 6, shadow: on ? 3 : 0 });
                T(d, g, mv.name, x + 10, y + 13, { size: 13, bold: true });
                T(d, g, mv.pow ? `${TYPES[mv.type].name}  ${mv.pow}${mv.hits ? "x" + mv.hits : ""}${mv.cd ? `  rest ${mv.cd}` : ""}` : TYPES[mv.type].name, x + w - 10, y + 13, { size: 11, bold: true, align: "right", font: TYPE });
                T(d, g, mv.text, x + 10, y + 31, { size: 11, color: "#1e2233cc" });
                this.bodyHit(R, { x, y, w, h, id: "mv_" + id, fn: () => {
                    m.custom = true; g.audioKit?.play("open");
                    if (on) { if (m.moves.length > 1) m.moves = m.moves.filter((a) => a !== id); }
                    else { if (m.moves.length >= 4) m.moves.shift(); m.moves.push(id); }
                } });
                y += h + 7;
            }
            if (this.idx > 0) { const yy = y + 4; panel(d, x, yy, w, 44, { fill: COL.sticky, radius: 7 }); T(d, g, "Make team lead", x + w / 2, yy + 22, { align: "center", size: 14, bold: true }); this.bodyHit(R, { x, y: yy, w, h: 44, id: "lead", fn: () => { const [a] = S.party.splice(this.idx, 1); S.party.unshift(a); this.idx = 0; g.audioKit?.play("item"); g.toasts?.add(`${BEASTS[a.sp].name} leads the team.`); } }); y += 56; }
            const e = BEASTS[m.sp].evo;
            const useApp = e?.item && (S.bag[e.item] ?? 0) > 0;
            if (useApp) { const yy = y + 4; panel(d, x, yy, w, 44, { fill: "#a9e5d0", radius: 7 }); T(d, g, `Use ${ITEMS[e.item].name}`, x + w / 2, yy + 22, { align: "center", size: 14, bold: true }); this.bodyHit(R, { x, y: yy, w, h: 44, id: "evoitem", fn: () => { S.bag[e.item]--; this.close(); this.stack.push(new Promotion(m, e.itemTo, () => {})); } }); y += 56; }
            this.bodyH = y - R.y + 10;
        });
    }
}
export class BagMenu extends Sheet {
    constructor() { super("Bag"); }
    draw(d, V) {
        const g = this.game, S = g.data.S, R = this.frame(d, V), list = Object.keys(S.bag).filter((k) => S.bag[k] > 0 && ITEMS[k]), ch = 62;
        this.bodyH = list.length * (ch + 8) + 8;
        this.body(d, R, () => {
            if (!list.length) T(d, g, "Empty. Even the lint has left.", R.x, R.y + 24, { size: 14 });
            list.forEach((id, i) => {
                const it = ITEMS[id], y = R.y + 4 + i * (ch + 8);
                panel(d, R.x, y, R.w, ch, { fill: COL.white, radius: 7, shadow: 3 });
                d.sprite(itemSprite(g, ITEM_ICON[id] ?? "folder"), { x: R.x + 31, y: y + ch / 2, width: 46, height: 46 });
                T(d, g, `${it.name} x${S.bag[id]}`, R.x + 60, y + 17, { size: 14, bold: true });
                T(d, g, it.text, R.x + 60, y + 29, { size: 12, maxWidth: R.w - 70, lineHeight: 1.2 });
                const usable = it.cat === "heal" || it.cat === "cure" || it.cat === "revive" || it.cat === "team" || it.cat === "field";
                if (usable) this.bodyHit(R, { x: R.x, y, w: R.w, h: ch, id: "b_" + id, fn: () => this.use(id) });
            });
        });
    }
    use(id) {
        const g = this.game, S = g.data.S, it = ITEMS[id];
        if (it.cat === "field") { S.repel = 80; S.bag[id]--; g.audioKit?.play("item"); g.toasts?.add("Do Not Disturb. 80 steps of peace."); return; }
        if (it.cat === "team") { for (const m of S.party) if (m.hp > 0) m.hp = Math.min(maxHp(m), m.hp + it.heal); S.bag[id]--; g.audioKit?.play("heal"); g.toasts?.add("Donuts all round."); return; }
        this.stack.push(new PickMon(`Use ${it.name} on?`, (m) => it.cat === "revive" ? m.hp <= 0 : it.cat === "cure" ? !!m.status : m.hp > 0 && m.hp < maxHp(m), (m) => {
            S.bag[id]--; g.audioKit?.play("heal");
            if (it.cat === "heal") m.hp = Math.min(maxHp(m), m.hp + it.heal);
            if (it.cat === "cure") m.status = null;
            if (it.cat === "revive") { m.hp = Math.floor(maxHp(m) / 2); m.status = null; }
        }));
    }
}
class PickMon extends Sheet {
    constructor(title, ok, fn) { super(title); this.ok = ok; this.fn = fn; }
    draw(d, V) {
        const g = this.game, S = g.data.S, R = this.frame(d, V), ch = 62;
        this.bodyH = S.party.length * (ch + 8);
        this.body(d, R, () => S.party.forEach((m, i) => {
            const y = R.y + 4 + i * (ch + 8), ok = this.ok(m);
            panel(d, R.x, y, R.w, ch, { fill: ok ? COL.white : "#c9c5b9", radius: 7, shadow: 3 });
            d.sprite(beastSprite(g, m.sp), { x: R.x + 33, y: y + ch / 2, width: 52, height: 52 });
            T(d, g, BEASTS[m.sp].name, R.x + 64, y + 17, { size: 14, bold: true });
            const t = m.hp / maxHp(m); bar(d, R.x + 64, y + 32, R.w - 80, 11, t, hpColor(t));
            if (ok) this.bodyHit(R, { x: R.x, y, w: R.w, h: ch, id: "pm" + i, fn: () => { this.fn(m); this.close(); } });
        }));
    }
}
export class DexMenu extends Sheet {
    constructor() { super("Deskmate Directory"); this.painted = 0; }
    draw(d, V) {
        const g = this.game, S = g.data.S, R = this.frame(d, V), list = Object.values(BEASTS), cols = Math.max(3, Math.floor(R.w / 104)), gap = 6, cw = (R.w - gap * (cols - 1)) / cols, ch = cw + 16;
        this.bodyH = Math.ceil(list.length / cols) * (ch + gap) + 24;
        let budget = 2;
        this.body(d, R, () => {
            T(d, g, `${Object.keys(S.caught).length} hired, ${Object.keys(S.seen).length} met, ${list.length} on the org chart`, R.x, R.y + 8, { size: 12, bold: true, color: "#6b4d1e" });
            list.forEach((b, i) => {
                const x = R.x + (i % cols) * (cw + gap), y = R.y + 22 + Math.floor(i / cols) * (ch + gap), sy = y - this.scroll, vis = sy + ch > R.y - 100 && sy < R.y + R.h + 100, seen = S.seen[b.id], got = S.caught[b.id];
                if (!vis) return;
                panel(d, x, y, cw, ch, { fill: got ? COL.white : seen ? "#ebe3cf" : "#cdbf9f", radius: 6, shadow: 2 });
                const painted = g.assets.sprites.has("b:" + b.id);
                if (seen && (painted || budget-- > 0)) d.sprite(beastSprite(g, b.id), { x: x + cw / 2, y: y + cw / 2 + 2, width: cw - 12, height: cw - 12, color: got ? undefined : "#ffffff" });
                else T(d, g, "?", x + cw / 2, y + cw / 2, { align: "center", size: 28, bold: true, color: "#9c8d6e" });
                T(d, g, seen ? b.name : `No. ${b.no}`, x + cw / 2, y + ch - 12, { align: "center", size: b.name.length > 11 ? 10 : 11.5, bold: true });
                if (seen) this.bodyHit(R, { x, y, w: cw, h: ch, id: "d" + b.id, fn: () => { g.audioKit?.play("open"); this.stack.push(new DexEntry(b)); } });
            });
        });
    }
}
class DexEntry extends Sheet {
    constructor(b) { super(b.name); this.b = b; }
    draw(d, V) {
        const g = this.game, R = this.frame(d, V), b = this.b, S = g.data.S;
        const big = Math.min(R.w * 0.7, R.h * 0.42);
        panel(d, R.x + R.w / 2 - big / 2 - 6, R.y + 4, big + 12, big + 12, { fill: "#fbf6e8", radius: 8 });
        d.sprite(beastSprite(g, b.id), { x: R.x + R.w / 2, y: R.y + 10 + big / 2, width: big, height: big });
        let y = R.y + big + 26;
        T(d, g, `No. ${b.no}  ·  ${b.types.map((t) => TYPES[t].name).join(" / ")}${S.caught[b.id] ? "  ·  Hired" : ""}`, R.x, y, { size: 12, bold: true, font: TYPE, color: "#6b4d1e" }); y += 14;
        T(d, g, b.dex, R.x, y, { size: 15, maxWidth: R.w, font: TYPE }); y += wrapHeight(g, b.dex, { size: 15, maxWidth: R.w, font: TYPE }) + 10;
        const p = PERKS[b.perk]; T(d, g, `Perk: ${p.name}. ${p.text}`, R.x, y, { size: 13, bold: true, maxWidth: R.w });
    }
}
export class TypeChart extends Sheet {
    constructor() { super("Type Chart"); }
    draw(d, V) {
        const g = this.game, R = this.frame(d, V), rows = [];
        for (const [a, list] of Object.entries(STRONG)) for (const [b, why] of Object.entries(list)) rows.push([a, b, why]);
        const ch = 38; this.bodyH = rows.length * (ch + 4) + 46;
        this.body(d, R, () => {
            T(d, g, "Coffee is never resisted. Coffee fuels all. Every matchup below does double damage.", R.x, R.y + 4, { size: 12, bold: true, maxWidth: R.w, color: "#6b4d1e" });
            rows.forEach(([a, b, why], i) => {
                const y = R.y + 40 + i * (ch + 4), w1 = R.w > 400 ? 96 : 72;
                panel(d, R.x, y, w1, ch - 6, { fill: TYPES[a].color, radius: 4, shadow: 0 }); T(d, g, TYPES[a].name, R.x + w1 / 2, y + (ch - 6) / 2, { align: "center", size: 11, bold: true });
                panel(d, R.x + w1 + 14, y, w1, ch - 6, { fill: TYPES[b].color, radius: 4, shadow: 0 }); T(d, g, TYPES[b].name, R.x + w1 + 14 + w1 / 2, y + (ch - 6) / 2, { align: "center", size: 11, bold: true });
                d.poly([[R.x + w1 + 3, y + 10], [R.x + w1 + 11, y + 16], [R.x + w1 + 3, y + 22]], { color: INK });
                T(d, g, why, R.x + w1 * 2 + 22, y + (ch - 6) / 2 - 8, { size: 11.5, maxWidth: R.w - w1 * 2 - 24, lineHeight: 1.15 });
            });
        });
    }
}
export class FormMenu extends Sheet {
    constructor() { super("Onboarding Form"); }
    draw(d, V) {
        const g = this.game, S = g.data.S, R = this.frame(d, V), o = objective(S), sigs = SIGNERS;
        this.body(d, R, () => {
            let y = R.y + 4; const w = R.w, H = 72 + sigs.length * 40;
            panel(d, R.x, y, w, H, { fill: "#fbf6e8", radius: 3 });
            T(d, g, "FORM 1: NEW STARTER", R.x + 12, y + 16, { size: 14, bold: true, font: TYPE });
            T(d, g, `Name: ${S.name || "?"}   Grade: Temporary`, R.x + 12, y + 36, { size: 12, font: TYPE });
            T(d, g, "All eight signatures required.", R.x + 12, y + 54, { size: 12, font: TYPE });
            sigs.forEach((sg, i) => {
                const yy = y + 72 + i * 40, done = S.sigs > i;
                T(d, g, sg.dept, R.x + 12, yy + 10, { size: 12, bold: true });
                d.line([R.x + 118, yy + 26], [R.x + w - 14, yy + 26], { width: 1.5, color: INK });
                if (done) { const pts = []; for (let k = 0; k <= 14; k++) pts.push([R.x + 126 + k * Math.min(10, (w - 150) / 14), yy + 18 + Math.sin(k * 1.9 + i) * 7 * Math.cos(k * 0.5)]); for (let k = 0; k < 14; k++) d.line(pts[k], pts[k + 1], { width: 1.8, color: COL.blue }); T(d, g, sg.name, R.x + w - 14, yy + 8, { size: 11, align: "right", color: "#1e2233aa", font: TYPE }); }
            });
            y += H + 14;
            if (o) { panel(d, R.x, y, w, 52, { fill: COL.sticky, radius: 3 }); T(d, g, "Next:", R.x + 12, y + 15, { size: 12, bold: true }); T(d, g, o.text, R.x + 12, y + 28, { size: 13, bold: true, maxWidth: w - 24, lineHeight: 1.1 }); y += 64; }
            const q = QUESTS.filter((qq) => S.flags[qq.flag + "_on"] || S.flags[qq.flag]);
            if (q.length) T(d, g, "Favours", R.x, y + 6, { size: 13, bold: true }), (y += 20);
            for (const qq of q) { const done = S.flags[qq.flag]; T(d, g, `${done ? "[x]" : "[ ]"} ${qq.name}: ${done ? "done" : qq.hint}`, R.x, y, { size: 12, maxWidth: w, font: TYPE }); y += wrapHeight(g, `[ ] ${qq.name}: ${qq.hint}`, { size: 12, maxWidth: w, font: TYPE }) + 7; }
            this.bodyH = y - R.y + 12;
        });
    }
}
export class Settings extends Sheet {
    constructor(world) { super("Settings"); this.world = world; }
    draw(d, V) {
        const g = this.game, S = g.data.S, R = this.frame(d, V), s = S.settings;
        const rows = [["Sound", () => s.sound, () => { s.sound = !s.sound; g.audio.muted = !s.sound; }], ["Haptics", () => s.haptics, () => { s.haptics = !s.haptics; g.haptics.enabled = s.haptics; g.haptic("medium"); }], ["Fast text", () => s.fastText, () => { s.fastText = !s.fastText; }], ["Fast battles", () => s.fastBattle, () => { s.fastBattle = !s.fastBattle; }]];
        rows.forEach(([lb, get, set], i) => { const on = get(); btn(this, d, g, R.x, R.y + 6 + i * 62, R.w, 52, lb, { id: "s" + i, fn: () => { set(); g.audioKit?.play("open"); }, draw: (D, x, y) => { T(D, g, lb, x + 16, y + 26, { size: 16, bold: true }); panel(D, x + R.w - 74, y + 12, 60, 28, { fill: on ? COL.green : "#b9b6ac", radius: 14, shadow: 0 }); T(D, g, on ? "ON" : "OFF", x + R.w - 44, y + 26, { align: "center", size: 13, bold: true, color: "#fff" }); } }); });
        const y = R.y + 6 + rows.length * 62 + 10;
        btn(this, d, g, R.x, y, R.w, 48, "Save and go to title", { id: "quit", size: 14, fill: COL.sticky, fn: () => { save(g); g.go("title", {}, { fade: 0.3 }); } });
    }
}
export class ShopMenu extends Sheet {
    constructor(tier, done) { super("Vending Machine", { done }); this.tier = tier; }
    draw(d, V) {
        const g = this.game, S = g.data.S, R = this.frame(d, V), list = SHOP.filter(([, t]) => t <= this.tier).map(([id]) => id), ch = 62;
        this.bodyH = list.length * (ch + 8) + 28;
        this.body(d, R, () => {
            T(d, g, `You have $${S.cash}.  Exact change only. It keeps the rest emotionally.`, R.x, R.y + 8, { size: 12, bold: true, color: "#6b4d1e" });
            list.forEach((id, i) => {
                const it = ITEMS[id], y = R.y + 24 + i * (ch + 8), can = S.cash >= it.price;
                panel(d, R.x, y, R.w, ch, { fill: can ? COL.white : "#c9c5b9", radius: 7, shadow: 3 });
                d.sprite(itemSprite(g, ITEM_ICON[id] ?? "folder"), { x: R.x + 31, y: y + ch / 2, width: 46, height: 46 });
                T(d, g, it.name, R.x + 60, y + 15, { size: 14, bold: true });
                T(d, g, `$${it.price}`, R.x + R.w - 12, y + 15, { size: 14, bold: true, align: "right", font: TYPE });
                T(d, g, it.text, R.x + 60, y + 27, { size: 12, maxWidth: R.w - 70, lineHeight: 1.2 });
                if (can) this.bodyHit(R, { x: R.x, y, w: R.w, h: ch, id: "buy_" + id, fn: () => { S.cash -= it.price; S.bag[id] = (S.bag[id] ?? 0) + 1; g.audioKit?.play("item"); g.toasts?.add(`Bought ${it.name}. It rattled loose.`); } });
            });
        });
    }
}
export class LiftMenu extends Sheet {
    constructor(done) { super("Lift", { done }); }
    draw(d, V) {
        const g = this.game, S = g.data.S, R = this.frame(d, V), list = LIFT_ORDER.filter((f) => liftOpen(S, f)), ch = 50;
        this.bodyH = list.length * (ch + 7) + 8;
        this.body(d, R, () => list.forEach((id, i) => {
            const f = FLOORS[id], y = R.y + 4 + i * (ch + 7), here = id === S.floor;
            panel(d, R.x, y, R.w, ch, { fill: here ? COL.sticky : COL.white, radius: 7, shadow: 3 });
            T(d, g, f.tag, R.x + 12, y + 25, { size: 13, bold: true, font: TYPE }); T(d, g, f.name, R.x + 92, y + 25, { size: 14, bold: true });
            if (!here) this.bodyHit(R, { x: R.x, y, w: R.w, h: ch, id: "f_" + id, fn: () => {
                g.audioKit?.play("lift");
                const w = g.world, T2 = FLOORS[id]; let lx = 2, ly = 2; T2.map.forEach((r, yy) => { const ix = r.indexOf("E"); if (ix >= 0) { lx = ix; ly = yy + 1; } });
                this.stack.pop(this); w.fadeThen(() => { w.load(id, lx, ly, "down"); save(g); }, () => this.o.done?.());
            } });
        }));
    }
}
export class ClosetMenu extends Sheet {
    constructor(done) { super("Supply Closet", { done }); this.pick = null; }
    draw(d, V) {
        const g = this.game, S = g.data.S, R = this.frame(d, V), cw = (R.w - 8) / 2, ch = 56;
        this.bodyH = Math.max(S.party.length, S.box.length) * (ch + 6) + 44;
        this.body(d, R, () => {
            T(d, g, "Tap one to move it. Team must keep one.", R.x, R.y + 8, { size: 12, bold: true, color: "#6b4d1e" });
            T(d, g, "Team", R.x, R.y + 26, { size: 13, bold: true }); T(d, g, `Closet (${S.box.length})`, R.x + cw + 8, R.y + 26, { size: 13, bold: true });
            const card = (m, x, y, fn, i) => { panel(d, x, y, cw, ch, { fill: COL.white, radius: 6, shadow: 2 }); d.sprite(beastSprite(g, m.sp), { x: x + 24, y: y + ch / 2, width: 44, height: 44 }); T(d, g, BEASTS[m.sp].name, x + 48, y + 18, { size: BEASTS[m.sp].name.length > 10 ? 10.5 : 12, bold: true }); T(d, g, `Gr ${m.lvl}`, x + 48, y + 37, { size: 11, bold: true, font: TYPE }); this.bodyHit(R, { x, y, w: cw, h: ch, id: "c" + i, fn }); };
            S.party.forEach((m, i) => card(m, R.x, R.y + 40 + i * (ch + 6), () => { if (S.party.length > 1) { S.party.splice(i, 1); m.hp = maxHp(m); m.status = null; S.box.push(m); g.audioKit?.play("close"); } }, "p" + i));
            S.box.forEach((m, i) => card(m, R.x + cw + 8, R.y + 40 + i * (ch + 6), () => { if (S.party.length < 6) { S.box.splice(i, 1); S.party.push(m); g.audioKit?.play("open"); } }, "b" + i));
        });
    }
    close() { super.close(); this.game.world?.prepFollower(); }
}
const rays = (d, V, t, color, n = 14) => {
    const R = Math.hypot(V.width, V.height), cx = V.width / 2, cy = V.height * 0.42;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + t * 0.25, b = a + 3.14 / n; d.poly([[cx, cy], [cx + Math.cos(a) * R, cy + Math.sin(a) * R], [cx + Math.cos(b) * R, cy + Math.sin(b) * R]], { color }); }
};
export class Promotion extends Screen {
    constructor(m, to, done) { super(); this.m = m; this.to = to; this.done = done; this.t = 0; this.opaque = true; this.from = m.sp; this.state = 0; }
    enter() { this.game.audioKit?.play("exclaim"); beastSprite(this.game, this.from); beastSprite(this.game, this.to); this.prevMusic = this.game.audioKit?.current; }
    tick(dt) { this.t += dt * (this.game.botSpeed ?? 1); }
    update(dt, I) {
        const g = this.game;
        if (this.state === 0 && this.t > 2.4) { this.state = 1; promote(this.m, this.to); g.data.S.seen[this.to] = 1; g.data.S.caught[this.to] = 1; g.audioKit?.play("promote"); this.flash = 1; }
        if (this.flash > 0) this.flash -= dt * 2;
        if (this.state === 0 && (I.pointer.tapped || I.confirm)) this.t = Math.max(this.t, 2.4);
        else if (this.state === 1 && this.t > 3.1 && (I.pointer.tapped || I.confirm)) { this.stack.pop(this); this.done?.(); }
    }
    draw(d, V) {
        const g = this.game, t = this.t;
        d.rect(V.width, V.height, { x: V.width / 2, y: V.height / 2, color: this.state ? COL.sticky : "#2b3044" });
        rays(d, V, t, this.state ? "#ffe99a" : "#343a52");
        const size = Math.min(V.width * 0.62, V.height * 0.5), cx = V.width / 2, cy = V.height * 0.42;
        const flick = this.state === 0 ? (Math.sin(t * t * 3.2) > 0 ? this.from : this.to) : this.to, sc = this.state ? 1 + Math.max(0, 0.3 - (t - 2.4)) : 1 + Math.sin(t * 9) * 0.02 * t;
        d.sprite(beastSprite(g, flick), { x: cx, y: cy, width: size * sc, height: size * sc, color: this.state ? undefined : (flick === this.to ? "#2b3044" : undefined) });
        const a = BEASTS[this.from].name, b = BEASTS[this.to].name;
        panel(d, 16, V.height - 110, V.width - 32, 92, { fill: COL.paper, radius: 6 });
        T(d, g, this.state ? "CONGRATULATIONS ON YOUR PROMOTION" : "ANNOUNCEMENT FROM HR", V.width / 2, V.height - 90, { align: "center", size: 12, bold: true, font: TYPE, color: COL.red });
        T(d, g, this.state ? `${a} is now ${b}!` : `${a} is being considered for a new role...`, V.width / 2, V.height - 58, { align: "center", size: V.width < 400 ? 15 : 17, bold: true });
        if (this.state === 1) T(d, g, "Same pay. More responsibility.", V.width / 2, V.height - 36, { align: "center", size: 12, color: "#6b6f7e" });
        if (this.flash > 0) d.rect(V.width, V.height, { x: V.width / 2, y: V.height / 2, color: "#fff", opacity: this.flash });
    }
}
export class GotMon extends Screen {
    constructor(m, where, text, done) { super(); this.m = m; this.where = where; this.text = text; this.done = done; this.t = 0; }
    enter() { this.game.audioKit?.play("catch"); beastSprite(this.game, this.m.sp); }
    tick(dt) { this.t += dt; }
    update(dt, I) { if (this.t > 0.6 && (I.pointer.tapped || I.confirm)) { this.stack.pop(this); this.done?.(); } }
    draw(d, V) {
        const g = this.game, k = Math.min(1, this.t * 3), s = Math.min(V.width * 0.6, V.height * 0.5) * (1 + (1 - k) * -0.6 + Math.sin(Math.min(1, this.t * 2) * 3.14) * 0.14), b = BEASTS[this.m.sp];
        d.rect(V.width, V.height, { x: V.width / 2, y: V.height / 2, color: INK, opacity: 0.72 * k });
        d.sprite(beastSprite(g, this.m.sp), { x: V.width / 2, y: V.height * 0.4, width: s, height: s });
        panel(d, 16, V.height - 112, V.width - 32, 92, { fill: COL.paper, radius: 6 });
        T(d, g, this.text ?? `${b.name} joined the team!`, V.width / 2, V.height - 88, { align: "center", size: 16, bold: true });
        T(d, g, b.dex, 30, V.height - 72, { size: 12, maxWidth: V.width - 60, lineHeight: 1.2, font: TYPE });
    }
}
