// Static map check: walks each level the way a player would (collect keys, open doors, flip switches),
// and reports anything the player can never reach, plus level statistics.
import { LEVELS } from "../levels.js";

const WALL = new Set(["#", "%", "=", "~"]);
LEVELS.forEach((lv, i) => {
    const rows = lv.map, W = Math.max(...rows.map((r) => r.length));
    const cell = (c, r) => rows[r]?.[c] ?? "#";
    let start = null;
    const items = {};
    rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === "@") start = [c, r]; items[ch] = (items[ch] ?? 0) + 1; }));
    const have = new Set();
    const blocked = (ch) => WALL.has(ch) || (ch === "R" && !have.has("r")) || (ch === "B" && !have.has("b")) || (ch === "Y" && !have.has("y")) || (ch === "G" && !have.has("W")) || (ch === "J" && !have.has("V"));
    let seen;
    for (let pass = 0; pass < 8; pass++) {
        seen = new Set([`${start[0]},${start[1]}`]);
        const q = [start];
        while (q.length) {
            const [c, r] = q.pop();
            for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const k = `${c + dc},${r + dr}`;
                if (seen.has(k) || blocked(cell(c + dc, r + dr))) continue;
                seen.add(k); q.push([c + dc, r + dr]);
            }
            const ch = cell(c, r);
            if ("rbyWV".includes(ch)) have.add(ch);
        }
    }
    const bad = [];
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
        if (WALL.has(ch) || ch === "." || ch === ",") return;
        if (!seen.has(`${c},${r}`)) bad.push(`${ch}@${c},${r}`);
    }));
    const edges = [];
    rows.forEach((row, r) => { if (row.length !== W) edges.push(`row ${r} is ${row.length}/${W}`); });
    const leak = [...seen].filter((k) => { const [c, r] = k.split(",").map(Number); return c === 0 || r === 0 || r === rows.length - 1 || c >= rows[r].length - 1; });
    const count = (s) => [...s].reduce((n, ch) => n + (items[ch] ?? 0), 0);
    console.log(`L${i + 1} ${W}x${rows.length} enemies ${count("nsfkoMK")} (n${count("n")} s${count("s")} f${count("f")} k${count("k")} o${count("o")} M${count("M")} K${count("K")}) secrets ${count("?")} keys ${[...have].join("")} exit ${seen.size && rows.some((r, y) => [...r].some((ch, x) => ch === "E" && seen.has(`${x},${y}`)))}`);
    if (bad.length) console.log(`   UNREACHABLE: ${bad.join(" ")}`);
    if (leak.length) console.log(`   LEAK at edge: ${leak.slice(0, 6).join(" ")}`);
    if (edges.length) console.log(`   width: ${edges.join("; ")}`);
});
