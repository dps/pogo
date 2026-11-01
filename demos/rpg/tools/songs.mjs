import { MUSIC } from "../audio.js";
import { noteFreq } from "../pogo.js";
for (const [n, s] of Object.entries(MUSIC)) { const lens = s.tracks.map((t) => t.notes.trim().split(/\s+/).length); const bad = s.tracks.flatMap((t) => t.notes.trim().split(/\s+/).filter((x) => x !== "-" && !(noteFreq(x) > 0))); console.log(n, lens.join(","), bad.length ? "BAD " + bad.slice(0, 4) : ""); }
