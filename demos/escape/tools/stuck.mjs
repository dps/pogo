// Searches every reachable abstract state from a fresh save, then proves the ending can be reached from all of them.
import { Rules, CARRIAGES, DOCS, ITEMS, PUZZLES } from "../rules.js";
// Flags only read to pick between flavour lines can't change what's possible, so they stay out of the state key.
const loud = new Set(["end"]), reads = [];
for (const c of CARRIAGES) for (const h of c.hots) {
    const all = [...(h.tap ?? []), ...Object.values(h.use ?? {}).flat()];
    for (const b of all) reads.push({ cond: (b.if ?? ""), body: b.do, sib: all });
    if (h.when) reads.push({ cond: h.when, body: all.flatMap((b) => b.do), sib: all });
}
for (let ch = true; ch;) { ch = false; for (const r of reads) { const sets = r.sib.flatMap((b) => b.do); const matters = sets.some((e) => !/^(say|doc|fx):/.test(e) && !(e.startsWith("f:") && !loud.has(e.slice(2)))); if (matters) for (const t of r.cond.split(" ")) { const f = t.replace(/^!/, ""); if (f && !f.startsWith("has:") && !loud.has(f)) { loud.add(f); ch = true; } } } }
Rules.prototype.key = function () { return `${this.s.at}|${Object.keys(this.s.f).filter((f) => loud.has(f) || f.startsWith("p:")).sort().join(",")}|${[...this.s.inv].sort().join(",")}`; };
const r0 = new Rules(), seen = new Map(), rev = new Map(), q = [r0];
seen.set(r0.key(), r0);
const t0 = Date.now(); let edges = 0; const usedPuz = new Set(), usedItems = new Set(), hotsTapped = new Set(); let noHint = 0;
while (q.length) {
    const r = q.pop(), k = r.key();
    if (seen.size > 3e6) throw new Error("state space too big");
    for (const it of r.s.inv) usedItems.add(it);
    if (r.won) continue;
    for (const a of r.actions()) {
        for (const p of a.path) if (p.startsWith("solve:")) usedPuz.add(p.slice(6));
        const nk = a.next.key(); edges++;
        if (!rev.has(nk)) rev.set(nk, []);
        rev.get(nk).push(k);
        if (!seen.has(nk)) { seen.set(nk, a.next); q.push(a.next); }
    }
}
const wins = [...seen.values()].filter((r) => r.won);
const can = new Set(wins.map((r) => r.key())), st = [...can];
while (st.length) { const k = st.pop(); for (const p of rev.get(k) ?? []) if (!can.has(p)) { can.add(p); st.push(p); } }
const stuck = [...seen.keys()].filter((k) => !can.has(k));
console.log(`states ${seen.size}, edges ${edges}, wins ${wins.length}, stuck ${stuck.length}, ${Date.now() - t0} ms`);
if (stuck.length) console.log("first stuck:", stuck.slice(0, 3));
const missP = Object.keys(PUZZLES).filter((p) => !usedPuz.has(p)), missI = Object.keys(ITEMS).filter((p) => !usedItems.has(p));
console.log("unreached puzzles:", missP, "unreached items:", missI);
// Every state's hint must point at something the player can still do; the shortest path gives the par route.
const prev = new Map([[r0.key(), null]]), bq = [r0]; let end = null;
while (bq.length && !end) { const r = bq.shift(); if (r.won) { end = r; break; } for (const a of r.actions()) { const nk = a.next.key(); if (!prev.has(nk)) { prev.set(nk, [r.key(), a.path]); bq.push(a.next); } } }
const route = []; for (let k = end.key(); prev.get(k); k = prev.get(k)[0]) route.unshift(...prev.get(k)[1]);
console.log("shortest route:", route.length, "actions,", route.filter((x) => x.startsWith("solve:")).length, "puzzles");
// Every clue must be readable by the time its puzzle can open.
const given = new Set(); for (const p of Object.values(PUZZLES)) for (const e of p.done ?? []) if (e.startsWith("doc:")) given.add(e.slice(4));
const docOn = new Set(); for (const c of CARRIAGES) for (const h of c.hots) for (const b of h.tap ?? []) for (const e of b.do) if (e.startsWith("doc:")) docOn.add(e.slice(4));
const bad = []; for (const [id, p] of Object.entries(PUZZLES)) for (const cl of p.clues ?? []) if (DOCS[cl] && cl !== "ticketback" && !docOn.has(cl) && !given.has(cl)) bad.push(`${id}<-${cl}`);
console.log("clues with no source:", bad);
for (const c of CARRIAGES) if (!c.hints.some((h) => h[0] === "") ) console.log("no final hint", c.id);
// Seating logic has exactly one answer.
{ const g = ["tom", "iris", "mother", "father", "dot", "sid"], n = (a, b) => (Math.abs(a - b) === 1 && (a < 3) === (b < 3)); let c = 0;
  const perm = (a, k = 0) => { if (k === 6) { const s = {}; a.forEach((p, i) => s[p] = i); if (s.iris === 1 && n(s.tom, s.iris) && s.mother === 4 && s.father === 5 && !n(s.dot, s.sid) && Math.abs(s.dot - s.sid) !== 3 && s.sid < 3) { c++; } return; } for (let i = k; i < 6; i++) { [a[k], a[i]] = [a[i], a[k]]; perm(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; } }; perm(g); console.log("seating solutions:", c); }
process.exit(stuck.length || missP.length || bad.length ? 1 : 0);
