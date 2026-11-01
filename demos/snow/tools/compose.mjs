// Chooses and polishes the forge boards listed in tools/plan.mjs, and writes tools/picked.json.
// usage: node tools/compose.mjs [slotFilter]    results are cached by board, so re-runs are cheap.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { polish } from "./polish.mjs";
import { SPECS } from "./specs.mjs";
import { PLAN } from "./plan.mjs";
import { plinthize } from "./plinth.mjs";

const dir = new URL("./out/", import.meta.url), memoFile = new URL("./polish-cache.json", import.meta.url);
const memo = existsSync(memoFile) ? JSON.parse(readFileSync(memoFile)) : {};
const pools = {};
function pool(name) {
    if (pools[name]) return pools[name];
    const seen = new Set(), all = [];
    for (const f of readdirSync(dir)) if (f.startsWith(name + ".")) for (const b of JSON.parse(readFileSync(new URL(f, dir)))) { const k = b.rows.join("/"); if (!seen.has(k)) { seen.add(k); all.push(b); } }
    return (pools[name] = all);
}
const key = (r) => r.join("/");
const close = (a, b) => { const x = key(a), y = key(b); let n = 0; for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] === y[i]) n++; return n / Math.max(x.length, y.length); };
const used = [], picked = [];
for (const slot of PLAN) {
    const spec = SPECS[slot.spec], need = spec.need ?? 1, needs = slot.needs ?? spec.needs ?? [];
    const cands = pool(slot.spec).filter((b) => b.pushes >= slot.lo && b.pushes <= slot.hi && b.boards < 130000).sort((a, b) => b.score - a.score);
    let done = false;
    for (const c of cands.slice(0, 14)) {
        if (used.some((u) => close(u, c.rows) > 0.72)) continue;
        const mk = `v3|${need}|${needs}|${key(c.rows)}`;
        const pk = slot.plinth ? `${mk}|${slot.plinth}` : mk;
        const p = (memo[pk] ??= (() => { const q = polish(c.rows, need, needs); return q && slot.plinth ? plinthize(q.rows, need, slot.plinth) ?? q : q; })());
        writeFileSync(memoFile, JSON.stringify(memo));
        if (!p || used.some((u) => close(u, p.rows) > 0.72)) continue;
        used.push(p.rows); picked.push({ ...slot, need, needs, rows: p.rows, pushes: p.pushes }); done = true;
        console.log(`${slot.region}${slot.opt ? "*" : ""} ${slot.spec} p${p.pushes} ${JSON.stringify(p.rows)}`);
        break;
    }
    if (!done) console.log(`-- nothing for ${slot.spec} ${slot.lo}-${slot.hi}`);
}
writeFileSync(new URL("./picked.json", import.meta.url), JSON.stringify(picked, null, 0));
console.log(picked.length, "picked");
