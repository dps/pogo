// What survives between runs: treats, the unlock track, the sticker book, settings. Storage can be blocked, so this never assumes it worked.
import { PETS, SHOPS } from "./data.js";

/** Pets held back at the start; the track hands them out in packs. */
export const PACKS = {
    a: { name: "Night Shift Pack", ids: ["slothundt", "crowflor", "skunkpunk", "toadlich"] },
    b: { name: "Fine Dining Pack", ids: ["mantisushi", "yakbuffet", "whalesous", "hivemgr"] },
    c: { name: "Hazard Pay Pack", ids: ["mantaframe", "alpacavolt", "kiwistunt", "chamtemp"] },
    d: { name: "Head Office Pack", ids: ["ceocto", "bodybadger", "oilsnake", "hornetrepo"] },
    e: { name: "Legends Pack", ids: ["vampuss", "hamhydra", "rhinobeet", "lampqueen"] },
};
export const TRACK = [
    { at: 20, kind: "shop", id: "bargain" }, { at: 55, kind: "pack", id: "a" }, { at: 95, kind: "shop", id: "shelter" }, { at: 140, kind: "pack", id: "b" },
    { at: 190, kind: "shop", id: "night" }, { at: 245, kind: "pack", id: "c" }, { at: 305, kind: "shop", id: "twins" }, { at: 370, kind: "pack", id: "d" },
    { at: 440, kind: "shop", id: "lab" }, { at: 520, kind: "pack", id: "e" }, { at: 610, kind: "league" }, { at: 720, kind: "frame" },
];
const blank = () => ({ treats: 0, runs: 0, champs: 0, best: 0, tutorial: false, seen: {}, used: {}, cleared: {}, shop: "corner", hard: false, sound: true, music: true, haptics: true, gold: false });
export function loadMeta(game) {
    let m = blank();
    try { m = { ...m, ...game.load("psb.meta", {}) }; } catch { /* corrupt or blocked: start fresh */ }
    return m;
}
export const saveMeta = (game, m) => { try { game.save("psb.meta", m); } catch { /* memory only */ } };
export const hasNode = (m, n) => m.treats >= n.at;
export function unlockedPets(m) {
    const locked = new Set();
    for (const n of TRACK) if (n.kind === "pack" && !hasNode(m, n)) for (const id of PACKS[n.id].ids) locked.add(id);
    return new Set(PETS.map((p) => p.id).filter((id) => !locked.has(id)));
}
export const shopOpen = (m, id) => id === "corner" || TRACK.some((n) => n.kind === "shop" && n.id === id && hasNode(m, n));
export const openShops = (m) => SHOPS.filter((s) => shopOpen(m, s.id));
export const leagueOpen = (m) => TRACK.some((n) => n.kind === "league" && hasNode(m, n));
export const goldOpen = (m) => TRACK.some((n) => n.kind === "frame" && hasNode(m, n));
/** Treats for a finished run. Losing still pays: every run moves the track. */
export function treatsFor(run) { return run.wins * 6 + run.merges + (run.over === "won" ? 30 : 0) + (run.hard ? run.wins * 2 : 0); }
export function nodeName(n) {
    if (n.kind === "shop") return SHOPS.find((s) => s.id === n.id).name;
    if (n.kind === "pack") return PACKS[n.id].name;
    return n.kind === "league" ? "Sharp League" : "Gold Pen";
}
export function finishRun(game, m, run) {
    const before = m.treats, earned = treatsFor(run);
    m.treats += earned; m.runs++; m.best = Math.max(m.best, run.wins);
    if (run.over === "won") { m.champs++; m.cleared[run.shop] = (m.cleared[run.shop] ?? 0) + 1; }
    const fresh = TRACK.filter((n) => before < n.at && m.treats >= n.at);
    saveMeta(game, m);
    return { earned, before, after: m.treats, fresh };
}
