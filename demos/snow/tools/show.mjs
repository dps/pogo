// Prints the forge's best boards for a spec, merged across runs: node tools/show.mjs <spec> [count]
import { readdirSync, readFileSync } from "node:fs";
const [name, n = 6] = process.argv.slice(2), dir = new URL("./out/", import.meta.url), seen = new Set(), all = [];
for (const f of readdirSync(dir)) if (f.startsWith(name + ".")) for (const b of JSON.parse(readFileSync(new URL(f, dir)))) { const k = b.rows.join("/"); if (!seen.has(k)) { seen.add(k); all.push(b); } }
all.sort((a, b) => a.pushes - b.pushes || b.score - a.score);
console.log(name, all.length);
for (const b of all.slice(0, +n)) console.log(`${b.score} p${b.pushes} sw${b.switches} b${b.boards} trap${b.trap} forced${b.forced} dead${b.dead}\n${b.rows.map((r) => "  " + JSON.stringify(r)).join("\n")}`);
