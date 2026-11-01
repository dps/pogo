// A sensible keeper's plan for one night and one day, in terms of the sim only. year-bot runs it straight on the rules; ui-bot runs the same plan through real taps and drags.
import * as S from "../sim.js";
import { BUILDINGS, BUILD_ORDER, COLS, CROPS, DISHES, GHOSTS, GHOST_LIST, ROWS } from "../data.js";

export const ALL = [...Array(COLS * ROWS).keys()];
const at = (x, y) => S.idx(x, y);
const WANT = [["pearlroot", "chimepea"], ["emberbell", "sunmelon"], ["gloamgourd", "nightgrain"], ["rimeblossom"]];

/** Which hybrid to matchmake now, given what's still undiscovered. */
export function targetHybrid(s) {
    if (s.found.includes("pearlroot") && s.found.includes("emberbell") && !s.found.includes("hearthlight")) return "hearthlight";
    const list = WANT[S.season(s)].filter((h) => !s.found.includes(h));
    return list[0] ?? null;
}
/** The crop this tile should get tonight, or null to leave it (a matchmaking gap, or nothing affordable). */
export function planTile(s, i) {
    const x = i % COLS, y = Math.floor(i / COLS), h = targetHybrid(s);
    if (h && y === 4 && x === 3) return null;
    if (h && y === 4 && x === 2) return CROPS[h].parents[0];
    if (h && y === 4 && x === 4) return CROPS[h].parents[1];
    if (s.found.includes("hearthlight") && !S.stock(s, "hearthlight") && s.lantern >= 2 && x === 3 && y === 5) return "hearthlight";
    if (!s.keepsakes.includes("woodspoon") && S.heartLevel(s, "auberon") >= 3 && !S.stock(s, "remembering")) {
        if (x === 5 && y === 4 && s.found.includes("pearlroot") && !S.stock(s, "pearlroot")) return "pearlroot";
        const side = S.season(s) === 2 ? "wispwheat" : S.season(s) === 3 ? "frostcap" : null;
        if (x === 1 && y === 4 && side && !S.stock(s, side)) return side;
    }
    // The rest: blooms when Odette still needs Shining ones and the full moon is close, otherwise best earner per night.
    const wantBloom = !s.keepsakes.includes("feather") && S.heartLevel(s, "odette") >= 3 && (x + y) % 2 === 0;
    const opts = S.seedList(s).filter((c) => CROPS[c].seed <= s.pennies && !CROPS[c].regrow && (CROPS[c].season === S.season(s) || CROPS[c].hybrid));
    if (wantBloom) { const b = opts.filter((c) => CROPS[c].tag === "bloom"); if (b.length) return b[0]; }
    const best = opts.sort((p, q) => (CROPS[q].sell - CROPS[q].seed) / CROPS[q].days - (CROPS[p].sell - CROPS[p].seed) / CROPS[p].days);
    if (best[0]) return best[(x * 3 + y) % Math.min(best.length, 3)];
    return S.seedCost(s, S.seedList(s).find((c) => !CROPS[c].hybrid)) === 0 ? S.seedList(s).sort((a, b) => CROPS[a].seed - CROPS[b].seed)[0] : null;
}
/** Parents stay in the ground until the moon has done its matchmaking. */
export function holdHarvest(s, i) {
    const h = targetHybrid(s), c = s.tiles[i].c, x = i % COLS, y = Math.floor(i / COLS);
    if (!h || !c || y !== 4 || (x !== 2 && x !== 4)) return false;
    return CROPS[h].parents[x === 2 ? 0 : 1] === c.id;
}
/** A regrowing crop in the gap would block matchmaking for ever, so it gets dug up. */
export function digTile(s) {
    const i = S.idx(3, 4), c = s.tiles[i].c;
    return targetHybrid(s) && c && !c.ripe && CROPS[c.id].regrow ? i : -1;
}
export function shopping(s) {
    const out = [];
    let p = s.pennies - 60;
    const z = S.nextZone(s);
    const want = [...BUILD_ORDER];
    if (z && p >= z.cost && s.day > 2) { out.push("zone"); p -= z.cost; }
    if (s.letter >= 5) { const L = S.nextLantern(s); if (L && p >= L.cost && !(s.lantern >= 2 && !s.found.includes("hearthlight"))) { out.push("lantern"); p -= L.cost; } }
    for (const b of want) { if (s.built[b] || BUILDINGS[b].cost > p) continue; out.push(b); p -= BUILDINGS[b].cost; }
    return out;
}
export function giftFor(s, g) {
    const keep = S.reserved(s), keys = Object.keys(s.inv).filter((k) => s.inv[k] > (keep[k] ?? 0)), G = GHOSTS[g];
    return keys.find((k) => G.loves.includes(S.isBase(k))) ?? keys[0] ?? null;
}
export function cookChoice(s) {
    const inv = s.inv, stock = (k) => inv[k] ?? 0;
    if (!s.built.cauldron) return null;
    const key = (id) => (inv[id] ? id : `${id}*`), have = (id) => S.stock(s, id) > 0;
    if (!s.keepsakes.includes("woodspoon") && !S.stock(s, "remembering") && have("pearlroot") && have("silverperch") && (have("wispwheat") || have("frostcap"))) return [key("pearlroot"), key("silverperch"), key(have("wispwheat") ? "wispwheat" : "frostcap")];
    const soupDone = s.keepsakes.includes("woodspoon");
    for (const [id, d] of Object.entries(DISHES)) if (d.needs && d.needs.length === 2 && !d.secret && d.needs.every((k) => stock(k) > (soupDone ? 0 : 1)) && !s.recipes.includes(id)) return d.needs;
    if (!s.recipes.length) { const k = Object.keys(inv).filter((x) => !x.endsWith("*")); if (k.length >= 2) return k.slice(0, 2); }
    return null;
}
