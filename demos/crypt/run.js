// A run, the save file, and the background job that keeps the next floors ready.
import { FLOORS, FloorJob, hashSeed } from "./floors.js";
import { KEEPERS, RELICS } from "./data.js";

const KEY = "crypt-save-1";
const FRESH = { runs: 0, wins: 0, best: 0, stamps: 0, bosses: 0, sound: true, haptics: true, seen: {}, keeper: "mort", daily: {}, album: {}, tutorial: false };

export function loadSave(game) {
    let v; try { v = game.load(KEY, null); } catch { v = null; }
    return { ...FRESH, ...(v ?? {}), seen: { ...(v?.seen ?? {}) }, daily: { ...(v?.daily ?? {}) }, album: { ...(v?.album ?? {}) } };
}
export const storeSave = (game, save) => { try { game.save(KEY, save); } catch { /* storage may be blocked; memory still works */ } };

export const today = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };

export function newRun(game, { seed, daily = false, keeper = "mort" }) {
    const k = KEEPERS.find((q) => q.key === keeper) ?? KEEPERS[0];
    const run = { seed, daily, keeper: k.key, floor: 0, hp: k.hearts, maxHp: k.hearts, coins: 0, relics: [], cards: [], slots: 2, snaps: [], jobs: {},
        stats: { kills: 0, bonks: 0, moves: 0, flawless: 0, pars: 0, hits: 0, undos: 0, coins: 0, floors: 0, cards: 0 }, last: null, dead: false, won: false, cause: null, lastBonus: null };
    game.data.run = run;
    return run;
}

/** Keeps generating ahead of the player, a sliver per frame, so the next floor is ready before they get there. */
export function pump(run, ms = 3) {
    const t0 = performance.now();
    for (let i = run.floor; i < Math.min(FLOORS, run.floor + 2); i++) {
        const job = run.jobs[i] ??= new FloorJob(run.seed, i);
        while (!job.done) {
            job.run();
            if (performance.now() - t0 > ms) return;
        }
    }
}

export function relicPool(save) { return Object.keys(RELICS).filter((k) => RELICS[k].base || save.stamps >= (RELICS[k].stamps ?? 0)); }
export const seedFor = (n) => hashSeed("crypt", n) % 1000000;
