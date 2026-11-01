// Checks every floor: rectangular rows, known glyphs, and that everything that matters can be reached on foot.
globalThis.window = undefined;
import { FLOORS } from "../story.js";
import { PROP } from "../tiles.js";
let bad = 0;
for (const f of Object.values(FLOORS)) {
    const lens = f.map.map((r) => r.length), w = lens.sort((a,b)=>lens.filter(v=>v===b).length-lens.filter(v=>v===a).length)[0]; 
    f.map.forEach((r, i) => { if (r.length !== w) { console.log(f.id, i, r.length, w, r); bad++; } });
    const known = new Set([..."#W+.,\"^vE ~"]);
    for (const r of f.map) for (const c of r) if (!known.has(c) && !PROP[c] && !f.ents?.[c]) { console.log(f.id, "unknown glyph", JSON.stringify(c)); bad++; known.add(c); }
    for (const c of Object.keys(f.ents ?? {})) if (!f.map.some((r) => r.includes(c))) { console.log(f.id, "unplaced ent", c); }
    const solid = (x, y) => { const c = f.map[y]?.[x] ?? " "; if (c === " " || "#WvE^+".includes(c)) return true; const p = PROP[c]; return p ? p.solid : false; };
    // flood from entry
    let sx, sy; f.map.forEach((r, y) => { for (const ch of "v^E") { const i = r.indexOf(ch); if (i >= 0 && sx === undefined && !solid(i, y + 1)) { sx = i; sy = y + 1; } } });
    const seen = new Set([`${sx},${sy}`]), q = [[sx, sy]];
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${x + dx},${y + dy}`; if (seen.has(k) || solid(x + dx, y + dy)) continue; seen.add(k); q.push([x + dx, y + dy]); } }
    const reach = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]].some(([a, b]) => seen.has(`${x + a},${y + b}`));
    f.map.forEach((r, y) => [...r].forEach((c, x) => { if (f.ents?.[c] && !reach(x, y)) { console.log(f.id, "unreachable ent", c, x, y); bad++; } if ("v^E".includes(c) && !seen.has(`${x},${y + 1}`)) { console.log(f.id, "unreachable door", c, x, y); bad++; } if (c === "\"" && !seen.has(`${x},${y}`)) { console.log(f.id, "unreachable clutter", x, y); bad++; } }));
}
console.log(bad ? `${bad} problems` : "maps ok");
