import { SONGS } from "../audio.js";
for (const [n, s] of Object.entries(SONGS)) { const ls = s.tracks.map((t) => t.notes.trim().split(/\s+/).length); const lcm = ls.reduce((a, b) => { const g = (x, y) => (y ? g(y, x % y) : x); return (a * b) / g(a, b); }); console.log(n, ls.join(","), "loop", lcm, lcm % Math.max(...ls) === 0 ? "ok" : "uneven"); }
