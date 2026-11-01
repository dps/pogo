// Debug: draw where the search can get in a room. node tools/seen.mjs g01 abilMask [fromX fromY]
import { newHero, TILE, tileAt } from "../physics.js";
import { buildWorld } from "../world.js";
import { explore } from "./search.mjs";
const W = buildWorld(), [rid, ab = 0, gx, gy] = process.argv.slice(2), room = W.byId[rid];
const h = newHero(gx ? +gx * 16 + room.x : room.x + 40, gy ? +gy * 16 + room.y : room.y + 3.9 * 48); h.grounded = false;
const seen = new Set();
const r = explore(W, room, [{ h, jump: false }], +ab, { cap: 100000, hit(p) { seen.add(`${Math.floor(p.x / 16)},${Math.floor(p.y / 16)}`); }, exit(p) { seen.add("x" + Math.floor((p.x - room.x) / 16) + "," + Math.floor((p.y - room.y) / 16)); } });
console.log(r, [...seen].filter((s) => s[0] === "x").join(" "));
const out = [];
for (let y = 0; y < room.nrows; y++) { let l = ""; for (let x = 0; x < room.cols; x++) { const c = room.c0 + x, q = room.r0 + y, t = tileAt(W, c, q); l += seen.has(`${c},${q}`) ? "o" : t === 0 ? "." : t.toString(16).slice(-1) === "1" ? "#" : t.toString(32); } out.push(l); }
console.log(out.join("\n"));
