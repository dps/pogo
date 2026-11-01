// Joins the hand-drawn levels and the polished forge boards into puzzles.js, teaching levels first in each region.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { HAND, NAMES, REGION_NAMES } from "./hand.mjs";
const picked = existsSync(new URL("./picked.json", import.meta.url)) ? JSON.parse(readFileSync(new URL("./picked.json", import.meta.url))) : [];
const drop = existsSync(new URL("./drop.json", import.meta.url)) ? JSON.parse(readFileSync(new URL("./drop.json", import.meta.url))) : [];
const sections = REGION_NAMES.map((name) => ({ name, levels: [] })), used = NAMES.map(() => 0);
for (const h of HAND) sections[h.region].levels.push({ ...h });
for (const p of picked.filter((q) => !drop.includes(q.rows.join("/")))) {
    const name = NAMES[p.region][used[p.region]++] ?? `Plot ${used[p.region]}`;
    sections[p.region].levels.push({ name, rows: p.rows, need: p.need, needs: p.needs.length ? p.needs : ["STACK"], opt: !!p.opt, region: p.region, pushes: p.pushes });
}
const letters = "abcdefgh";
sections.forEach((s, r) => {
    const mains = s.levels.filter((l) => !l.opt).sort((a, b) => (a.pushes ?? 0) - (b.pushes ?? 0));
    // Anything far harder than its neighbours waits on a side path.
    if (r === 0) for (const l of mains) if ((l.pushes ?? 0) > 14) l.opt = true;
    const opts = s.levels.filter((l) => l.opt);
    s.levels = [...mains.filter((l) => !l.opt), ...opts];
    s.levels.forEach((l, i) => { l.id = `${letters[r]}${i + 1}`; });
    if (mains.length > 8) console.log(`region ${r} has ${mains.length} mains`);
});
// Name, as each level's claim, the ideas the checker has already proved it needs. The trivial ones stand in only if nothing else was proved.
const cacheFile = new URL("./check-cache.json", import.meta.url), cache = existsSync(cacheFile) ? Object.values(JSON.parse(readFileSync(cacheFile))) : [];
const TRIVIAL = ["STACK", "GROW", "GROW_BIG"];
for (const s of sections) for (const l of s.levels) {
    const hit = cache.find((c) => c.rowsKey === l.rows.join("/"));
    if (!hit?.proved || l.teach) continue;
    const real = hit.proved.filter((n) => !TRIVIAL.includes(n));
    l.needs = [...new Set([...(real.length ? real : hit.proved.slice(-1)), ...l.needs])].filter((n) => hit.proved.includes(n));
}
const line = (l) => { const o = { id: l.id, name: l.name, rows: l.rows }; if ((l.need ?? 1) !== 1) o.need = l.need; if (l.opt) o.opt = true; if (l.teach) o.teach = l.teach; o.needs = l.needs; return `    ${JSON.stringify(o)},`; };
const text = `// Written by tools/assemble.mjs from tools/hand.mjs and the polished forge boards in tools/picked.json.\nexport const SECTIONS = [\n${sections.map((s) => `  { name: ${JSON.stringify(s.name)}, levels: [\n${s.levels.map(line).join("\n")}\n  ] },`).join("\n")}\n];\n`;
writeFileSync(new URL("../puzzles.js", import.meta.url), text);
console.log(sections.map((s) => `${s.name}: ${s.levels.filter((l) => !l.opt).length}+${s.levels.filter((l) => l.opt).length}`).join(", "), "total", sections.reduce((a, s) => a + s.levels.length, 0));
