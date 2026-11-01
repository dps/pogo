import { makeSongs } from "../audio.js";
for (const [k, s] of Object.entries(makeSongs())) console.log(k, s.tracks.map((t) => t.notes.trim().split(/\s+/).length).join(" "));
