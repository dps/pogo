// Parses the hand-drawn map into one global tile grid, room list and entity lists. Pure: no Pogo imports.
import { ACID, BEAMDOOR, BOUNCE, CELL_H, CELL_W, CHAR, CRACK, CRUMBLE, EMPTY, FLAP, FOAM, GATE, HARD, ONEWAY, RAIL, ROCK, SEAL, SLICK, SPIKE, SPIKEC, TILE, UPDRAFT } from "./physics.js";
import { MAP_SRC } from "./map.js";

export const AREAS = {
    g: { key: "gum", name: "Gumline Grotto", tool: "Drill" }, e: { key: "enamel", name: "Enamel Caverns", tool: "Floss" },
    s: { key: "sugar", name: "Sugar Crystal Caves", tool: "Mouthwash Dash" }, t: { key: "tongue", name: "Tongue Flats", tool: "Air Syringe" },
    w: { key: "swamp", name: "Plaque Swamp", tool: "Fluoride Coat" }, n: { key: "nerve", name: "Root Canal", tool: "Dental Mirror" },
    o: { key: "tonsil", name: "Tonsil Gardens", tool: "Magnet Braces" }, h: { key: "throat", name: "Throat Abyss", tool: "Cotton Chute" },
    u: { key: "stomach", name: "Acid Sea", tool: "Diamond Burr" }, p: { key: "pulp", name: "The Hollow Tooth", tool: "" },
};

const FULL = { "#": ROCK, "%": SLICK, B: CRACK, D: HARD, F: FOAM, G: GATE, L: BEAMDOOR, "~": ACID, "|": UPDRAFT, "{": FLAP };

export function buildWorld() {
    const rooms = [], errors = [];
    let maxX = 0, maxY = 0;
    for (const block of MAP_SRC.split(/\n\s*\n/)) {
        const lines = block.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//"));
        if (!lines.length) continue;
        const [head, name] = lines[0].split("|").map((x) => x.trim());
        const [id, gx, gy, ...kv] = head.split(/\s+/);
        const opts = {};
        for (const k of kv) { const [a, b] = k.split("="); opts[a] = b ?? "1"; }
        const rows = lines.slice(1), cw = rows[0].length / CELL_W, ch = rows.length / CELL_H;
        if (!Number.isInteger(cw) || !Number.isInteger(ch)) errors.push(`${id}: bad size ${rows[0].length}x${rows.length}`);
        rows.forEach((r, i) => { if (r.length !== rows[0].length) errors.push(`${id}: row ${i} width ${r.length}, want ${rows[0].length}`); });
        const room = { id, i: rooms.length, area: id[0], gx: +gx, gy: +gy, cw, ch, name: name || id, opts, rows,
            cols: cw * CELL_W * CHAR, nrows: ch * CELL_H * CHAR, ents: [], hooks: [] };
        room.c0 = room.gx * CELL_W * CHAR; room.r0 = room.gy * CELL_H * CHAR;
        room.x = room.c0 * TILE; room.y = room.r0 * TILE; room.w = room.cols * TILE; room.h = room.nrows * TILE;
        rooms.push(room);
        maxX = Math.max(maxX, room.gx + cw); maxY = Math.max(maxY, room.gy + ch);
    }
    const cols = maxX * CELL_W * CHAR, nrows = maxY * CELL_H * CHAR;
    const W = { cols, rows: nrows, T: new Uint8Array(cols * nrows).fill(ROCK), rooms, errors, hooks: [], cellRoom: new Map(), byId: {} };
    for (const r of rooms) {
        W.byId[r.id] = r;
        for (let y = 0; y < r.ch; y++) for (let x = 0; x < r.cw; x++) {
            const k = `${r.gx + x},${r.gy + y}`;
            if (W.cellRoom.has(k)) errors.push(`${r.id} overlaps ${W.cellRoom.get(k).id} at ${k}`);
            W.cellRoom.set(k, r);
        }
    }
    const set = (c, r, t) => { W.T[r * cols + c] = t; };
    for (const room of rooms) carve(W, room, set);
    for (const room of rooms) checkDoors(W, room);
    for (const room of rooms) refine(W, room, set);
    W.base = W.T.slice();
    // Hook buckets by cell for quick lookup.
    W.hookGrid = new Map();
    W.hooks.forEach((h, i) => {
        const k = (Math.floor(h.x / 256) << 12) | Math.floor(h.y / 256);
        for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) { const q = ((Math.floor(h.x / 256) + dx) << 12) | (Math.floor(h.y / 256) + dy); if (!W.hookGrid.has(q)) W.hookGrid.set(q, []); W.hookGrid.get(q).push(i); }
    });
    const none = [];
    W.hooksNear = (x, y) => W.hookGrid.get((Math.floor(x / 256) << 12) | Math.floor(y / 256)) ?? none;
    W.roomAt = (x, y) => W.cellRoom.get(`${Math.floor(x / (CELL_W * CHAR * TILE))},${Math.floor(y / (CELL_H * CHAR * TILE))}`) ?? null;
    return W;
}

function carve(W, room, set) {
    const cols = room.rows[0].length;
    for (let y = 0; y < room.rows.length; y++) for (let x = 0; x < cols; x++) {
        const ch = room.rows[y][x], c0 = room.c0 + x * CHAR, r0 = room.r0 + y * CHAR;
        const px = (c0 + 1.5) * TILE, py = (r0 + 1.5) * TILE, foot = (r0 + 3) * TILE;
        const full = FULL[ch] ?? EMPTY;
        for (let j = 0; j < CHAR; j++) for (let i = 0; i < CHAR; i++) set(c0 + i, r0 + j, full);
        const rowTiles = (r, t) => { for (let i = 0; i < CHAR; i++) set(c0 + i, r, t); };
        const ent = (kind, extra) => room.ents.push({ kind, x: px, y: foot, cx: x, cy: y, room: room.id, ...extra });
        switch (ch) {
            case "=": rowTiles(r0, ONEWAY); break;
            case "_": rowTiles(r0, SEAL); break;
            case "C": rowTiles(r0, CRUMBLE); break;
            case "^": rowTiles(r0 + 2, SPIKE); break;
            case "v": rowTiles(r0, SPIKEC); break;
            case "-": rowTiles(r0, RAIL); break;
            case "T": rowTiles(r0 + 2, BOUNCE); ent("pad"); break;
            case "H": { const h = { x: px, y: py, room: room.id }; W.hooks.push(h); room.hooks.push(h); break; }
            case "@": ent("start"); break;
            case "S": ent("sink"); break;
            case "N": ent("npc"); break;
            case "P": ent("pedestal"); break;
            case "*": ent("crown"); break;
            case "o": ent("baby"); break;
            case "x": ent("bit"); break;
            case ">": ent("emitter", { dx: 1, dy: 0, y: py }); break;
            case "<": ent("emitter", { dx: -1, dy: 0, y: py }); break;
            case "W": ent("emitter", { dx: 0, dy: 1, y: py }); break;
            case "R": ent("receptor", { y: py }); break;
            case "K": ent("boss"); break;
            default:
                if (/[afjsdkm]/.test(ch)) ent("foe", { foe: ch });
                else if (!("#%.BDFGL~|{".includes(ch))) W.errors.push(`${room.id}: unknown char ${ch}`);
        }
    }
    let n = 0;
    const names = (room.opts.npc ?? "").split(",").filter(Boolean);
    for (const e of room.ents) if (e.kind === "npc") { e.npc = names[n++]; if (!e.npc) W.errors.push(`${room.id}: NPC without a name`); }
    if (room.opts.pick) for (const e of room.ents) if (e.kind === "pedestal") e.pick = room.opts.pick;
    room.ents.forEach((e, i) => { e.key = `${room.id}:${i}`; });
}

const solidChar = (ch) => "#%".includes(ch);

function checkDoors(W, room) {
    const R = room.rows, cols = R[0].length, nr = R.length;
    const look = (cx, cy) => {   // Map char at global char coords, or null.
        const r = W.cellRoom.get(`${Math.floor(cx / CELL_W)},${Math.floor(cy / CELL_H)}`);
        if (!r) return null;
        return r.rows[cy - r.gy * CELL_H][cx - r.gx * CELL_W];
    };
    const gx = room.gx * CELL_W, gy = room.gy * CELL_H;
    room.doors = [];
    const test = (x, y, ox, oy, side) => {
        const ch = R[y][x];
        if (solidChar(ch)) return;
        const other = look(gx + x + ox, gy + y + oy);
        if (other === null || solidChar(other)) { W.errors.push(`${room.id}: opening ${side} at col ${x} row ${y} leads into ${other === null ? "nothing" : "rock in " + W.cellRoom.get(`${Math.floor((gx + x + ox) / CELL_W)},${Math.floor((gy + y + oy) / CELL_H)}`).id}`); return; }
        room.doors.push({ x, y, side, to: W.cellRoom.get(`${Math.floor((gx + x + ox) / CELL_W)},${Math.floor((gy + y + oy) / CELL_H)}`).id });
    };
    for (let y = 0; y < nr; y++) { test(0, y, -1, 0, "W"); test(cols - 1, y, 1, 0, "E"); }
    for (let x = 0; x < cols; x++) { test(x, 0, 0, -1, "N"); test(x, nr - 1, 0, 1, "S"); }
}

// Organic touches on the rock, deterministic. Floors stay flat; ceilings grow nubs and concave corners fill in.
function refine(W, room, set) {
    const T = W.T, cols = W.cols, at = (c, r) => T[r * cols + c];
    const hash = (a, b) => { let h = Math.imul(a * 73856093 ^ b * 19349663, 2654435761) >>> 0; h ^= h >>> 13; return (Math.imul(h, 1540483477) >>> 0) / 4294967296; };
    const adds = [];
    if (room.opts.flat) return;
    for (let r = room.r0 + 1; r < room.r0 + room.nrows - 3; r++) for (let c = room.c0 + 4; c < room.c0 + room.cols - 4; c++) {
        if (at(c, r) !== EMPTY) continue;
        const up = at(c, r - 1), dn = at(c, r + 1), lf = at(c - 1, r), rt = at(c + 1, r);
        if (up === ROCK && at(c, r + 1) === EMPTY && at(c, r + 2) === EMPTY && at(c, r + 3) === EMPTY && at(c, r + 4) === EMPTY && hash(c, r) < 0.34) adds.push([c, r]);
        else if (dn === ROCK && (lf === ROCK || rt === ROCK) && up === EMPTY && at(lf === ROCK ? c + 1 : c - 1, r + 1) === ROCK && hash(r, c) < 0.75) adds.push([c, r]);
    }
    for (const [c, r] of adds) set(c, r, ROCK);
}
