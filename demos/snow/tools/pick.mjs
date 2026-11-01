// Shows a spread of forge boards for a spec: the best in each length range, skipping near-copies. node tools/pick.mjs <spec> [perBucket]
import { readdirSync, readFileSync } from "node:fs";
const [name, per = 2] = process.argv.slice(2), dir = new URL("./out/", import.meta.url), seen = new Set(), all = [];
for (const f of readdirSync(dir)) if (f.startsWith(name + ".")) for (const b of JSON.parse(readFileSync(new URL(f, dir)))) { const k = b.rows.join("/"); if (!seen.has(k)) { seen.add(k); all.push(b); } }
const same = (a, b) => { const x = a.rows.join("/"), y = b.rows.join("/"); let n = 0; for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] === y[i]) n++; return n / Math.max(x.length, y.length); };
const buckets = [[5, 8], [9, 12], [13, 17], [18, 24], [25, 34], [35, 99]], out = [];
for (const [a, b] of buckets) {
    const pool = all.filter((q) => q.pushes >= a && q.pushes <= b).sort((p, q) => q.score - p.score), got = [];
    for (const q of pool) { if (got.length >= +per) break; if ([...got, ...out].every((o) => same(o, q) < 0.7)) { got.push(q); out.push(q); } }
}
console.log(`== ${name} (${all.length})`);
for (const b of out) console.log(`p${b.pushes} sw${b.switches} boards${b.boards} trap${b.trap} dead${b.dead} q${b.score}  ${JSON.stringify(b.rows)}`);
