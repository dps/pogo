// Runs the story. Pure logic with no screen, so bots can search every state of the game.
import { CARRIAGES, DOCS, ITEMS, PUZZLES } from "./story.js";
export const fresh = () => ({ at: 0, f: {}, inv: [], w: {} });
export class Rules {
    constructor(state) { this.s = state ?? fresh(); }
    get c() { return CARRIAGES[this.s.at]; }
    cond(str) {
        if (!str) return true;
        for (const t of str.split(" ")) {
            if (t.startsWith("has:")) { if (!this.s.inv.includes(t.slice(4))) return false; }
            else if (t[0] === "!") { if (this.s.f[t.slice(1)]) return false; }
            else if (!this.s.f[t]) return false;
        }
        return true;
    }
    visible(h) { return this.cond(h.when); }
    hots() { return this.c.hots.filter((h) => this.visible(h)); }
    /** The first branch whose condition holds. */
    pick(list) { for (const b of list ?? []) if (this.cond(b.if)) return b.do; return null; }
    /** Runs effects and returns what the screen should show. */
    run(list, ev = []) {
        for (const e of list) {
            const i = e.indexOf(":"), k = i < 0 ? e : e.slice(0, i), v = i < 0 ? "" : e.slice(i + 1);
            if (k === "f") this.s.f[v] = 1;
            else if (k === "x") delete this.s.f[v];
            else if (k === "give") { if (!this.s.inv.includes(v)) this.s.inv.push(v); ev.push({ t: "give", v }); }
            else if (k === "take") { this.s.inv = this.s.inv.filter((x) => x !== v); ev.push({ t: "take", v }); }
            else if (k === "move") { this.s.f.moving = 1; ev.push({ t: "move" }); }
            else if (k === "go") { ev.push({ t: "go", v: v === "next" ? this.s.at + 1 : this.s.at - 1 }); }
            else if (k === "puz") { if (!this.s.f[`p:${v}`]) ev.push({ t: "open", v }); }
            else ev.push({ t: k, v });
        }
        return ev;
    }
    tap(id) { const h = this.c.hots.find((x) => x.id === id); return h && this.visible(h) ? this.run(this.pick(h.tap) ?? []) : []; }
    /** Using an item on a hotspot. Null means nothing happens, so the game can say so. */
    use(item, id) {
        const h = this.c.hots.find((x) => x.id === id);
        if (!h || !this.visible(h) || !this.s.inv.includes(item)) return null;
        const b = h.use?.[item], l = b ? this.pick(b) : null;
        return l ? this.run(l) : null;
    }
    combine(a, b) {
        for (const car of CARRIAGES) for (const r of car.combos ?? []) if ((r.a === a && r.b === b) || (r.a === b && r.b === a)) { if (this.s.inv.includes(a) && this.s.inv.includes(b)) return this.run(r.do); }
        return null;
    }
    solve(id) {
        const p = PUZZLES[id];
        if (this.s.f[`p:${id}`]) return [];
        this.s.f[`p:${id}`] = 1;
        delete this.s.w[id];
        return this.run(p.done ?? []);
    }
    /** The current hint step for this carriage: the first one not yet done. */
    hint() {
        for (const h of this.c.hints) if (h[0] && !this.cond(h[0])) return h;
        return this.c.hints[this.c.hints.length - 1];
    }
    holes() { let n = 0; for (const k in PUZZLES) if (PUZZLES[k].kind === "gate" && this.s.f[`p:${k}`]) n++; return n; }
    // --- For bots ---
    key() { return `${this.s.at}|${Object.keys(this.s.f).sort().join(",")}|${[...this.s.inv].sort().join(",")}`; }
    clone() { return new Rules({ at: this.s.at, f: { ...this.s.f }, inv: [...this.s.inv], w: {} }); }
    /** Every abstract action from here, as [label, apply]. An opened puzzle counts as solved in one action. */
    actions() {
        const out = [], settle = (r, ev, path) => {
            for (const e of ev) { if (e.t === "go") r.s.at = e.v; if (e.t === "open") { const ev2 = r.solve(e.v); path.push(`solve:${e.v}`); settle(r, ev2, path); } }
        };
        const add = (label, fn) => { const r = this.clone(), path = [label], ev = fn(r); if (ev === null) return; settle(r, ev, path); out.push({ path, next: r }); };
        for (const h of this.hots()) {
            add(`tap:${h.id}`, (r) => r.tap(h.id));
            for (const it of this.s.inv) if (h.use?.[it]) add(`use:${it}:${h.id}`, (r) => r.use(it, h.id));
        }
        for (let i = 0; i < this.s.inv.length; i++) for (let j = i + 1; j < this.s.inv.length; j++) { const a = this.s.inv[i], b = this.s.inv[j]; add(`combine:${a}:${b}`, (r) => r.combine(a, b)); }
        return out;
    }
    get won() { return !!this.s.f.end; }
}
export { CARRIAGES, DOCS, ITEMS, PUZZLES };
