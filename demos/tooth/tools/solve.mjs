// World solver: proves with the real physics that every room, tool and boss is reachable in the intended order, and that
// no reachable door leaves the player stranded. Node: a door group of a room. Run: node tools/solve.mjs [-v]
import { A, CRACK, EMPTY, GATE, HARD, BEAMDOOR, newHero, ROCK, TILE, tileAt } from "../physics.js";
import { buildWorld } from "../world.js";
import { explore, key } from "./search.mjs";
import { writeFileSync } from "node:fs";

const W = buildWorld();
if (W.errors.length) { console.log(W.errors.join("\n")); process.exit(1); }
const verbose = process.argv.includes("-v"), CAP = Number(process.argv.find((a) => a.startsWith("--cap="))?.slice(6) ?? 30000);

// Milestones in intended order: what must be reachable, and what it grants.
export const ORDER = [
    { room: "g03", grant: A.DRILL, name: "Drill" }, { room: "g10", flag: "b1", name: "Sir Tartar" }, { room: "e08", flag: "b2", grant: A.FLOSS, name: "Molar Bear / Floss" },
    { room: "s09", flag: "b3", grant: A.DASH, name: "Queen / Dash" }, { room: "t09", flag: "b4", grant: A.AIR, name: "Papilla / Air" }, { room: "w09", flag: "b5", grant: A.COAT, name: "Mother of Film / Coat" },
    { room: "n07", flag: "b6", grant: A.MIRROR, name: "Nerve / Mirror" }, { room: "o08", flag: "b7", grant: A.BRACES, name: "Twins / Braces" }, { room: "h06", flag: "b8", grant: A.CHUTE, name: "Uvula / Chute" },
    { room: "u09", flag: "b9", grant: A.BURR, name: "Reflux / Burr" }, { room: "p07", flag: "b10", name: "The Ache" },
];
const boundsOf = (r) => r;
const clusters = [];   // Breakable clusters: tiles with a shared kind.
{
    const seen = new Set();
    for (let r = 0; r < W.rows; r++) for (let c = 0; c < W.cols; c++) {
        const t = W.T[r * W.cols + c], i = r * W.cols + c;
        if (t !== CRACK && t !== HARD && t !== BEAMDOOR || seen.has(i)) continue;
        const list = [], st = [[c, r]];
        seen.add(i);
        while (st.length) { const [a, b] = st.pop(); list.push([a, b]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (b + dy) * W.cols + a + dx; if (W.T[j] === t && !seen.has(j)) { seen.add(j); st.push([a + dx, b + dy]); } } }
        clusters.push({ t, list, room: W.roomAt(c * TILE, r * TILE).id, rooms: new Set(list.map(([a, b]) => W.roomAt(a * TILE, b * TILE).id)), x: list[0][0] * TILE, y: list[0][1] * TILE, open: false });
    }
}
const openCluster = (c) => { c.open = true; for (const [a, b] of c.list) W.T[b * W.cols + a] = EMPTY; };

const groupOf = (room, h) => {
    // Door group: side plus coarse position along that edge.
    const dl = h.x - room.x, dr = room.x + room.w - h.x, dt = h.y - room.y, db = room.y + room.h - h.y, m = Math.min(dl, dr, dt, db);
    const side = m === dl ? "W" : m === dr ? "E" : m === dt ? "N" : "S";
    return side + ((side === "W" || side === "E") ? Math.floor((h.y - room.y) / 288) : Math.floor((h.x - room.x) / 480));
};

let abil = 0;
const flags = new Set(), got = new Set(), log = [];
// entries[roomId][group] = [{h, jump}]
function entrySeeds() { return Object.create(null); }
const start = W.rooms.flatMap((r) => r.ents).find((e) => e.kind === "start");
const startRoom = W.roomAt(start.x, start.y);

function openGates() {
    for (const room of W.rooms) if (room.opts.gate && flags.has(room.opts.gate)) for (const cx of [...Array(room.cols).keys()]) for (let r = 0; r < room.nrows; r++) {
        const i = (room.r0 + r) * W.cols + room.c0 + cx; if (W.T[i] === GATE) W.T[i] = EMPTY;
    }
}

/** Forward flood across rooms. Returns the set of rooms reached and all crossing states. */
function flood() {
    const E = new Map(); // room -> Map(group -> Map(key -> seed))
    const addSeed = (rid, group, s) => {
        if (!E.has(rid)) E.set(rid, new Map());
        const g = E.get(rid); if (!g.has(group)) g.set(group, new Map());
        const m = g.get(group), k = key(s.h, s.jump);
        if (m.size < 14 && !m.has(k)) { m.set(k, s); return true; }
        return false;
    };
    const sh = newHero(start.x, start.y - 8); sh.grounded = true;
    addSeed(startRoom.id, "start", { h: sh, jump: false });
    const done = new Map(), reached = new Set([startRoom.id]), edges = new Map(), ents = new Set();
    const work = [startRoom.id];
    const stats = { states: 0, capped: [] };
    while (work.length) {
        const rid = work.pop();
        const room = W.byId[rid];
        for (const [group, m] of E.get(rid) ?? []) {
            const sig = group + ":" + m.size;
            if (done.get(rid + group) === sig) continue;
            done.set(rid + group, sig);
            const items = room.ents.filter((e) => e.kind !== "foe" && e.kind !== "pad");
            const crack = clusters.filter((c) => c.rooms.has(rid) && !c.open);
            const exits = new Set(), allDoors = new Set(room.doors.map((d) => (d.side === "W" || d.side === "E") ? d.side + Math.floor((d.y + 0.5) * 48 / 288) : d.side + Math.floor((d.x + 0.5) * 48 / 480)));
            let doneAt = -1, seenCount = 0;
            const res = explore(W, room, [...m.values()], abil, { cap: CAP, stop() {
                if (doneAt < 0) { const ex = new Set([...exits].map((e) => e.split(">")[0])); if ([...allDoors].every((g) => ex.has(g)) && items.every((e) => ents.has(e.key))) doneAt = seenCount; }
                return doneAt >= 0 && ++seenCount > doneAt + 2500;
            }, hit(h) {
                for (const e of items) if (Math.abs(e.x - h.x) < 14 && Math.abs(e.y - 8 - h.y) < 18) ents.add(e.key);
                for (const c of crack) if (!c.open && !c.touch) for (const [a, b] of c.list) if (Math.abs((a + 0.5) * TILE - h.x) < 28 && Math.abs((b + 0.5) * TILE - h.y) < 26) { c.touch = true; break; }
            }, exit(h, jump) {
                const to = W.roomAt(h.x, h.y);
                if (!to) return;
                const gIn = groupOf(to, h), gOut = groupOf(room, h);
                exits.add(gOut + ">" + to.id + ":" + gIn);
                const fresh = addSeed(to.id, gIn, { h: { ...h }, jump });
                reached.add(to.id);
                if (fresh && !work.includes(to.id)) work.push(to.id);
            } });
            stats.states += res.states; if (res.capped) stats.capped.push(rid + group);
            edges.set(rid + "|" + group, exits);
        }
    }
    return { E, reached, edges, ents, stats };
}

function softlockCheck(flood0, goalRoom) {
    // Which door nodes can reach the goal room? Walk the node graph backwards.
    const nodes = [...flood0.edges.keys()], good = new Set();
    for (const n of nodes) if (n.startsWith(goalRoom + "|")) good.add(n);
    let changed = true;
    while (changed) { changed = false; for (const n of nodes) { if (good.has(n)) continue; for (const e of flood0.edges.get(n)) { const [, tg] = e.split(">"); const [rid, grp] = tg.split(":"); if (good.has(rid + "|" + grp)) { good.add(n); changed = true; break; } } } }
    return nodes.filter((n) => !good.has(n));
}

const t0 = Date.now();
const report = [];
let fail = 0, stage = 0;
for (const m of ORDER) {
    // Fixed point: flood, open anything breakable we touched, repeat.
    let f;
    for (;;) {
        for (const c of clusters) c.touch = false;
        f = flood();
        let more = false;
        for (const c of clusters) if (!c.open && c.touch) {
            if (c.t === CRACK && (abil & A.DRILL)) { openCluster(c); more = true; }
            else if (c.t === HARD && (abil & A.BURR)) { openCluster(c); more = true; }
        }
        for (const c of clusters) if (!c.open && c.t === BEAMDOOR && (abil & A.MIRROR) && [...c.rooms].some((q) => f.reached.has(q))) { openCluster(c); more = true; }
        if (!more) break;
    }
    const ok = f.reached.has(m.room);
    const stuck = ok ? softlockCheck(f, m.room) : [];
    console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] stage ${stage}: abil=${abil} rooms=${f.reached.size}/${W.rooms.length} states=${f.stats.states}${f.stats.capped.length ? " capped:" + f.stats.capped.join(",") : ""} -> ${m.name} ${ok ? "REACHED" : "NOT REACHED"}${stuck.length ? " stuck:" + stuck.join(" ") : ""}`);
    report.push({ stage, name: m.name, room: m.room, ok, rooms: f.reached.size, stuck, reached: [...f.reached], ents: [...f.ents], abil, edges: Object.fromEntries([...f.edges].map(([k, v]) => [k, [...v]])) });
    if (!ok) { fail++; if (verbose) console.log(" missing rooms:", W.rooms.filter((r) => !f.reached.has(r.id)).map((r) => r.id).join(" ")); console.log(" frontier:", [...f.reached].join(" ")); break; }
    if (stuck.length) fail++;
    if (m.grant) abil |= m.grant;
    if (m.flag) flags.add(m.flag);
    openGates();
    stage++;
    if (m === ORDER[ORDER.length - 1]) {
        const allE = W.rooms.flatMap((r) => r.ents).filter((e) => !["foe", "pad", "emitter", "receptor", "start"].includes(e.kind));
        const miss = allE.filter((e) => !f.ents.has(e.key));
        console.log("rooms unreached:", W.rooms.filter((r) => !f.reached.has(r.id)).map((r) => r.id).join(" ") || "none");
        console.log("entities unreached:", miss.map((e) => e.kind + "@" + e.key).join(" ") || "none");
        if (miss.length) fail++;
    }
}
writeFileSync(new URL("./solve-report.json", import.meta.url), JSON.stringify(report, null, 1));
console.log(fail ? `FAIL (${fail})` : "PASS: all milestones in order, no stranded door nodes", ((Date.now() - t0) / 1000).toFixed(0) + "s");
process.exit(fail ? 1 : 0);
