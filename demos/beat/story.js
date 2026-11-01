// The tour: two goblins, one borrowed drum, seven stops and the Grand Goblin Festival. Progress lives in one save slot.
import { SONGS } from "./music/songs.js";
import { GOBLINS } from "./art/goblins.js";

export const STOPS = [
    { id: "bog", name: "Mudpuddle Bog", songs: ["mudfoot", "toad"], line: ["grub", "Snotlet! A letter! The Grand Goblin Festival wants BANDS!"], outro: ["bogsy", "I heard banging. I've a tuba and no plans. Budge up."], join: "bogsy", unlock: "Bogsy joins on tuba" },
    { id: "beach", name: "Soggy Sands", songs: ["skank", "wobble"], line: ["bogsy", "The sand wobbles here. Hold on tight, and hold down those long notes."], outro: ["wick", "Your drumming woke my candle. It would like to tour."], join: "wick", unlock: "Wick joins on trumpet", kit: "lids" },
    { id: "tavern", name: "The Rusty Kettle Inn", songs: ["kettle", "swamp"], line: ["wick", "Free stew if we play. When it gets busy, mash for a drum roll!"], outro: ["mumble", "Nobody has ever asked me to stop playing. Nobody's ever asked me to start, either."], join: "mumble", unlock: "Mumble joins on accordion" },
    { id: "yard", name: "Grumbling Graveyard", songs: ["warts", "knuckles"], line: ["mumble", "Flick those heads, the dead like a bit of swagger. Swipe, don't tap!"], outro: ["rattle", "I have one cowbell and terrible confidence."], join: "rattle", unlock: "Rattle joins on cowbell", kit: "skull" },
    { id: "cave", name: "The Drip Caverns", songs: ["moss", "disco"], line: ["rattle", "Echoes down here. Every mistake comes back to haunt you."], outro: ["fizz", "CRASH! Sorry. CRASH! I'm in, right? CRASH!"], join: "fizz", unlock: "Fizz joins on cymbals", kit: "bells" },
    { id: "pass", name: "Crooked Pass", songs: ["thumbs", "sevenfeet"], line: ["fizz", "The mountain has a limp. So do the songs. Count to seven and don't blink."], outro: ["gronk", "GRONK BRING GONG."], join: "gronk", unlock: "Gronk joins on gong" },
    { id: "fest", name: "The Grand Goblin Festival", songs: ["stalactite", "galop"], line: ["grub", "This is it, band. Bash like nobody's watching. Everybody's watching."], outro: ["grub", "We did it! The Golden Mallet is ours!"], unlock: "Champions of all Goblinkind!" },
];

export const stopOf = (id) => STOPS.find((s) => s.songs.includes(id));
export const songIndex = (id) => SONGS.findIndex((s) => s.id === id);
export const goblin = (id) => GOBLINS.find((g) => g.id === id);

const FRESH = { v: 1, songs: {}, offset: 0, sound: true, haptics: true, kit: "logs", assist: false, taught: {}, played: 0, last: "mudfoot", diff: "easy", story: {}, won: false };

export function loadSave(game) {
    let s;
    try { s = game.load("beatgoblin", null); } catch { s = null; }
    return { ...FRESH, ...(s ?? {}), songs: s?.songs ?? {}, taught: s?.taught ?? {}, story: s?.story ?? {} };
}
export function writeSave(game, save) { game.save("beatgoblin", save); }
export function applySettings(game, save) {
    game.audio.muted = !save.sound;
    game.haptics.enabled = save.haptics;
    game.audio.offset = save.offset;
}

export const best = (save, id, diff) => save.songs[id]?.[diff];
export const cleared = (save, id) => !!save.songs[id] && Object.values(save.songs[id]).some((r) => r.passed);
/** A song is open if it's the first or the song before it has been cleared. */
export const isOpen = (save, id) => { const i = songIndex(id); return i === 0 || cleared(save, SONGS[i - 1].id); };
export const totalStars = (save) => Object.values(save.songs).reduce((t, d) => t + Object.values(d).reduce((a, r) => a + (r.stars ?? 0), 0), 0);
/** The whole band: two to start, one more for each stop cleared. */
export function bandSize(save) {
    let n = 2;
    for (const s of STOPS) if (s.join && s.songs.every((id) => cleared(save, id))) n++;
    return Math.min(GOBLINS.length, n);
}
export function kitsOpen(save) {
    const out = ["logs"];
    for (const s of STOPS) if (s.kit && s.songs.every((id) => cleared(save, id))) out.push(s.kit);
    return out;
}

/** Record a finished song. Returns what changed, so the results screen can throw a party. */
export function record(save, songId, diff, r) {
    const stopBefore = stopOf(songId), wasDone = stopBefore.songs.every((id) => cleared(save, id));
    const slot = (save.songs[songId] ??= {}), old = slot[diff];
    const isBest = !old || r.score > old.score;
    slot[diff] = {
        score: Math.max(r.score, old?.score ?? 0), acc: Math.max(r.acc, old?.acc ?? 0), stars: Math.max(r.stars, old?.stars ?? 0),
        grade: !old || r.acc >= old.acc ? r.grade : old.grade, full: r.full || !!old?.full, passed: r.passed || !!old?.passed,
    };
    save.played++;
    const nowDone = stopBefore.songs.every((id) => cleared(save, id));
    const out = { isBest, stopCleared: !wasDone && nowDone ? stopBefore : null, won: false };
    if (out.stopCleared && stopBefore.id === "fest") { out.won = !save.won; save.won = true; }
    return out;
}
