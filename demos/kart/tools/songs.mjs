// Every track of every song must be the same length, and every note must parse.
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../sound.js", import.meta.url), "utf8");
const body = src.slice(src.indexOf("const SONGS"), src.indexOf("export class Sound"));
const seq = (s) => s.trim().split(/\s+/).join(" ");
const SONGS = new Function("seq", body + "; return SONGS;")(seq);
for (const [n, s] of Object.entries(SONGS)) console.log(n.padEnd(8), s.bpm, s.tracks.map((t) => t.notes.split(" ").length).join(" "));
