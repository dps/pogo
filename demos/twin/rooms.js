// Floor plans. Sizes live in FURN; a plan just says what stands where. rot 1 swaps width and depth.
import { W, D } from "./data.js";

// w,d: footprint. h: height. hp: durability. value: what it costs the family. flam: burns.
export const FURN = {
    sofa: { name: "Sofa", w: 6.2, d: 2.4, h: 1.9, hp: 190, value: 1899, flam: 1, junk: "stuffing" },
    armchair: { name: "Armchair", w: 2.7, d: 2.4, h: 1.8, hp: 100, value: 649, flam: 1, junk: "stuffing" },
    coffee: { name: "Coffee table", w: 3.4, d: 1.8, h: 0.9, hp: 70, value: 329, flam: 1, junk: "wood" },
    tvunit: { name: "Big TV", w: 5.4, d: 1.2, h: 2.4, hp: 90, value: 1499, junk: "glass", pop: 1 },
    bookcase: { name: "Bookcase", w: 4.2, d: 1.1, h: 3.2, hp: 130, value: 420, flam: 1, junk: "paper" },
    lamp: { name: "Floor lamp", w: 1, d: 1, h: 3.3, hp: 18, value: 89, junk: "glass", pop: 1 },
    plant: { name: "Pot plant", w: 1.3, d: 1.3, h: 2.5, hp: 22, value: 45, junk: "soil" },
    side: { name: "Side table", w: 1.6, d: 1.6, h: 1.1, hp: 40, value: 110, flam: 1, junk: "wood" },
    counter: { name: "Counter", w: 6, d: 1.5, h: 1.6, hp: 240, value: 2400, junk: "wood" },
    island: { name: "Kitchen island", w: 6, d: 2.2, h: 1.6, hp: 260, value: 3100, junk: "wood" },
    stove: { name: "Cooker", w: 2.2, d: 1.8, h: 1.7, hp: 200, value: 899, junk: "metal", pop: 1 },
    fridge: { name: "Fridge", w: 2.3, d: 2, h: 3.6, hp: 220, value: 1799, junk: "metal" },
    table: { name: "Dining table", w: 4.4, d: 2.8, h: 1.4, hp: 110, value: 780, flam: 1, junk: "wood" },
    chair: { name: "Chair", w: 1.1, d: 1.1, h: 1.7, hp: 30, value: 120, flam: 1, junk: "wood" },
    tub: { name: "Bathtub", w: 5.2, d: 2.5, h: 1.4, hp: 300, value: 2200, junk: "porcelain" },
    toilet: { name: "Toilet", w: 1.5, d: 2, h: 1.7, hp: 110, value: 340, junk: "porcelain" },
    vanity: { name: "Vanity", w: 3.4, d: 1.4, h: 1.6, hp: 120, value: 760, junk: "porcelain" },
    cabinet: { name: "Towel cupboard", w: 3, d: 1.2, h: 2.8, hp: 110, value: 300, flam: 1, junk: "stuffing" },
    hamper: { name: "Laundry basket", w: 1.7, d: 1.7, h: 1.4, hp: 26, value: 35, flam: 1, junk: "stuffing" },
    washer: { name: "Washing machine", w: 2.2, d: 2, h: 2.3, hp: 210, value: 999, junk: "metal", pop: 1 },
    board: { name: "Ironing board", w: 4.4, d: 1.1, h: 1.5, hp: 45, value: 60, junk: "metal" },
    shelf: { name: "Shelves", w: 4, d: 1, h: 2.8, hp: 100, value: 180, flam: 1, junk: "paper" },
    crib: { name: "Cot", w: 4.2, d: 2.4, h: 2.1, hp: 120, value: 650, flam: 1, junk: "wood" },
    toybox: { name: "Toy box", w: 2.6, d: 1.7, h: 1.5, hp: 70, value: 140, flam: 1, junk: "toys" },
    dollhouse: { name: "Doll's house", w: 2.8, d: 2, h: 3, hp: 90, value: 280, flam: 1, junk: "toys" },
    horse: { name: "Rocking horse", w: 2.8, d: 1.2, h: 2.2, hp: 60, value: 240, flam: 1, junk: "wood" },
    blocks: { name: "Block tower", w: 1.5, d: 1.5, h: 2.6, hp: 20, value: 30, flam: 1, junk: "toys" },
};

const f = (kind, x, z, rot = 0) => ({ kind, x, z, rot });

// Doors: back-left, back-right, left, right. Monsters use all four; the two at the back are also the exits.
export const DOORS = [
    { x: -5.6, z: -D, nx: 0, nz: 1 },
    { x: 5.6, z: -D, nx: 0, nz: 1 },
    { x: -W, z: 2, nx: 1, nz: 0 },
    { x: W, z: 2, nx: -1, nz: 0 },
];

// Plans were drawn on a 24 x 18 sheet. This fits them to the real room: things by a wall stay by the wall.
const fitX = (x) => (Math.abs(x) > 5 ? Math.sign(x) * (W - (12 - Math.abs(x))) : x * (W / 12));
const fitZ = (z) => (Math.abs(z) > 5 ? Math.sign(z) * (D - (9 - Math.abs(z))) : z * (D / 9));

export const ROOMS = {
    living: {
        name: "LIVING ROOM", hint: "Mind the cords",
        floor: "wood", wall: "#f1dcb8", trim: "#fff4e2", accent: "#2f8f8b", rug: "#c8553d",
        start: [0, 6.4],
        furn: [
            f("tvunit", 0, -8.1), f("coffee", 0, -3.6), f("sofa", 0, 0.6),
            f("armchair", -7.6, -3.2), f("armchair", 7.6, -3.2),
            f("bookcase", -11.3, -5.6, 1), f("lamp", -11, -8), f("lamp", 11, -8),
            f("side", 8.4, 5.8), f("plant", -10.9, 7.9), f("plant", 10.9, 7.9), f("side", -8.4, 5.8),
        ],
        hazards: [
            { kind: "cord", a: [-10.5, -7.2], b: [-3.6, -6.2], period: 5, offset: 1 },
            { kind: "cord", a: [10.5, -7.2], b: [3.6, -6.2], period: 5, offset: 3.5 },
        ],
    },
    kitchen: {
        name: "KITCHEN", hint: "Grease is slippery. The cooker flares up",
        floor: "check", wall: "#cfe6d4", trim: "#f7f4ea", accent: "#e8583f", rug: null,
        start: [0, 6.4],
        furn: [
            f("counter", 0, -8.15), f("fridge", 10.7, -7.8), f("island", 0, -1.6),
            f("stove", -10.8, -3.2, 1), f("stove", 10.8, -3.2, 1),
            f("table", -6.8, 5.2), f("chair", -6.8, 2.9), f("chair", -9.9, 5.2), f("chair", -3.7, 5.2),
            f("counter", 11.1, 6.3, 1), f("plant", -10.9, -7.9),
        ],
        hazards: [
            { kind: "jet", x0: -9.6, x1: -4.2, z0: -4.1, z1: -2.3, period: 6, on: 1.6, offset: 2, tint: "fire", dmg: 12 },
            { kind: "jet", x0: 4.2, x1: 9.6, z0: -4.1, z1: -2.3, period: 6, on: 1.6, offset: 5, tint: "fire", dmg: 12 },
            { kind: "slick", x: 5.2, z: 3.4, r: 2.6 }, { kind: "slick", x: -2.6, z: -5.4, r: 1.7 },
            { kind: "slick", x: 0, z: 7, r: 1.9 },
        ],
    },
    bathroom: {
        name: "BATHROOM", hint: "Stay out of the drain when it gurgles",
        floor: "tile", wall: "#bfe3e8", trim: "#ffffff", accent: "#e87a90", rug: "#f2a9b8",
        start: [-6, 3.2],
        furn: [
            f("vanity", 0, -8.2), f("toilet", 11, -7.9), f("tub", -8.9, 7.3), f("cabinet", 11.2, 5.4, 1),
            f("hamper", 7.6, 7.6), f("plant", -10.9, -7.9), f("hamper", 3.4, -3.8),
        ],
        hazards: [
            { kind: "vortex", x: 2.4, z: 1.2, r: 5.2, period: 8, on: 2.6, offset: 4 },
            { kind: "slick", x: -5.5, z: -3.5, r: 2.8 }, { kind: "slick", x: 7.5, z: -2, r: 2.2 },
            { kind: "soap", x: 6, z: 4, vx: 6, vz: 4.5 }, { kind: "soap", x: -3, z: -5, vx: -5, vz: 5.5 },
        ],
    },
    laundry: {
        name: "LAUNDRY ROOM", hint: "The dryer blows. The pipes hiss",
        floor: "lino", wall: "#d9cdea", trim: "#fff8ec", accent: "#f0b23e", rug: null,
        start: [0, 6],
        furn: [
            f("washer", -1.3, -7.9), f("washer", 1.3, -7.9), f("shelf", 11.3, -4.8, 1), f("board", -5.4, 3),
            f("hamper", -10.6, -7.8), f("hamper", 10.6, 7.8), f("hamper", 4.8, 1.6), f("shelf", -11.3, 6, 1), f("board", 6, 5.8),
        ],
        hazards: [
            { kind: "wind", x0: -3, x1: 3, z0: -6.8, z1: 8.6, dx: 0, dz: 1, period: 7, on: 2.8, offset: 3 },
            { kind: "jet", x0: -11.8, x1: -7.4, z0: -3.3, z1: -2.1, period: 5, on: 1.3, offset: 0.5, tint: "steam", dmg: 9 },
            { kind: "jet", x0: 7.4, x1: 11.8, z0: 1.2, z1: 2.4, period: 5, on: 1.3, offset: 3, tint: "steam", dmg: 9 },
            { kind: "slick", x: 6.5, z: -3, r: 2 },
        ],
    },
    nursery: {
        name: "NURSERY", hint: "Do not stand on the tracks",
        floor: "carpet", wall: "#fbd8c4", trim: "#fffaf0", accent: "#7a8cf0", rug: "#ffe08a",
        start: [0, 4],
        furn: [
            f("crib", 0, -7.8), f("toybox", 10.2, -7.9), f("dollhouse", -10.4, -7.6), f("horse", -10.2, 7.8),
            f("blocks", -3, 0), f("blocks", 3, 0), f("blocks", 9.5, 7.6), f("toybox", 10.8, -1.8, 1),
        ],
        hazards: [
            { kind: "train", cx: 0, cz: 0, rx: 8.6, rz: 5.2, speed: 0.34, cars: 4 },
            { kind: "bricks", n: 12 },
        ],
    },
};

for (const room of Object.values(ROOMS)) {
    room.start = [fitX(room.start[0]), fitZ(room.start[1])];
    for (const p of room.furn) { p.x = fitX(p.x); p.z = fitZ(p.z); }
    for (const h of room.hazards) {
        if (h.a) { h.a = [fitX(h.a[0]), fitZ(h.a[1])]; h.b = [fitX(h.b[0]), fitZ(h.b[1])]; }
        if (h.x0 !== undefined) { h.x0 = fitX(h.x0); h.x1 = fitX(h.x1); h.z0 = fitZ(h.z0); h.z1 = fitZ(h.z1); }
        if (h.x !== undefined && h.kind !== "soap") { h.x = fitX(h.x); h.z = fitZ(h.z); }
        if (h.rz) { h.rx = 8; h.rz = 7.2; }
    }
}

/** Footprint with rotation applied. */
export function footprint(p) {
    const k = FURN[p.kind], rot = p.rot % 2;
    return { w: rot ? k.d : k.w, d: rot ? k.w : k.d };
}
