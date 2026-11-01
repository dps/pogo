// The village. Rows use: space void, . bare ground, , fresh snow, # scenery, ~ ice, ^ warm stones, = ditch, o plate, | gate,
// T laden pine, * plinth, s m l balls on snow, S M L balls on bare, A B C stacks, D a finished snowman, @ & the mole.
// `needs` names ideas the checker must prove necessary (tools/check.mjs removes each one and shows the level then fails).
import { parseLevel } from "./rules.js";
import { SECTIONS } from "./puzzles.js";

export const REGIONS = SECTIONS;
export const LEVELS = [];
export const BY_ID = new Map();
REGIONS.forEach((r, ri) => {
    for (const l of r.levels) {
        l.region = ri; l.need ??= 1;
        LEVELS.push(l); BY_ID.set(l.id, l);
    }
});
export const parsed = (id) => parseLevel(BY_ID.get(id));
