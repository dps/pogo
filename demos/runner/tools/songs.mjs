// Every song's tracks must be one length, or they drift apart as they loop. Also checks each note is a real note.
import { SONGS, SFX } from "../sound.js";
let bad = 0;
for (const [name, s] of Object.entries(SONGS)) {
    const lens = s.tracks.map((t) => t.notes.split(/\s+/).length), wrong = s.tracks.flatMap((t) => t.notes.split(/\s+/)).filter((n) => n !== "-" && !/^[A-G]#?\d$/.test(n));
    const even = new Set(lens).size === 1;
    if (!even || wrong.length) bad++;
    console.log(`${even && !wrong.length ? "ok  " : "FAIL"} ${name.padEnd(9)} ${s.bpm} bpm, ${lens[0]} steps, ${(lens[0] / (s.bpm * s.steps / 60)).toFixed(1)} s loop ${even ? "" : lens.join(",")} ${wrong.slice(0, 4).join(" ")}`);
}
console.log(`${Object.keys(SFX).length} custom sounds`);
process.exit(bad ? 1 : 0);
