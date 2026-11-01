import { buildWorld } from "../world.js";
const W = buildWorld();
console.log(W.rooms.length, "rooms;", W.cols, "x", W.rows, "tiles;", W.hooks.length, "hooks");
const by = {}; for (const r of W.rooms) by[r.area] = (by[r.area] ?? 0) + 1; console.log(by);
console.log(W.errors.length, "errors"); for (const e of W.errors) console.log(" ", e);
