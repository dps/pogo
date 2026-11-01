// Battlefields. A map is plain data: ground shapes, scenery, food, nests, critters and hazards.
// Coordinates are world units with the player at the bottom. Ground is painted from `shapes` in ground.js.
const rng = (seed) => { let s = seed * 2654435761 >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

const f = (k, x, y, amount, rot) => ({ k, x, y, amount, rot });
const p = (k, x, y, rot = 0, s = 1) => ({ k, x, y, rot, s });
const blanket = (x, y, w, h, rot = 0) => ({ t: "blanket", x, y, w, h, rot });
const soil = (x, y, rx, ry, rot = 0) => ({ t: "soil", x, y, rx, ry, rot });
const soda = (x, y, rx, ry, rot = 0) => ({ t: "soda", x, y, rx, ry, rot });
const water = (x, y, rx, ry, rot = 0) => ({ t: "water", x, y, rx, ry, rot });
const patio = (x, y, w, h, rot = 0) => ({ t: "patio", x, y, w, h, rot });
const web = (x, y, r) => ({ t: "web", x, y, r });
const me = (x, y, o = {}) => ({ team: 0, x, y, ants: 24, stock: [12, 0, 0, 0], ...o });
const foe = (team, x, y, strategy, level, o = {}) => ({ team, x, y, side: 1, strategy, level, ants: 16, stock: [20, 0, 0, 0], ...o });

const scatter = (w, h, n, seed, kinds) => { const r = rng(seed), out = []; for (let i = 0; i < n; i++) out.push(p(kinds[i % kinds.length], 30 + r() * (w - 60), 30 + r() * (h - 60), r() * 6.28, 0.8 + r() * 0.5)); return out; };

/** Twelve hand-placed missions. goal.chambers limits what's buildable, which is how tech is taught one piece at a time. */
const tidy = (m) => { m.props = m.props.filter((q) => (q.k !== "daisy" && q.k !== "clover" && q.k !== "leaf" && q.k !== "twig") || (!m.nests.some((n) => Math.hypot(n.x - q.x, n.y - q.y) < 150) && !m.foods.some((g) => Math.hypot(g.x - q.x, g.y - q.y) < 110))); return m; };
export const MISSION_MAPS = [
    () => ({ w: 760, h: 1040, base: "blanket", shapes: [blanket(380, 480, 900, 1200)],
        props: [p("napkin", 610, 240, 0.3), p("fork", 120, 300, 0.25), p("clover", 150, 880)],
        foods: [f("crumbs", 300, 560, 60), f("bread", 500, 300, 160), f("crumbs", 170, 200, 50)], nests: [me(380, 880, { ants: 26, stock: [6, 0, 0, 0] })], goal: { gather: [[0, 50]], chambers: [], par: 60 } }),
    () => ({ w: 880, h: 1200, base: "lawn", shapes: [blanket(420, 470, 640, 720, 0.05), soil(440, 1040, 260, 110)],
        props: [p("plate", 660, 240, 0, 0.8), p("stone", 120, 760, 0.5), p("leaf", 740, 880, 1), p("daisy", 120, 1100), p("daisy", 780, 1120)],
        foods: [f("sandwich", 400, 300, 400), f("ham", 180, 660, 90), f("crumbs", 600, 760, 80), f("bread", 280, 860, 140)],
        critters: [{ k: "ladybird", x: 520, y: 210, hp: 40 }, { k: "ladybird", x: 300, y: 180, hp: 40 }], nests: [me(440, 1040, { ants: 30, stock: [18, 0, 0, 0] })], goal: { build: ["gym"], critters: "ladybird", chambers: ["nursery", "gym"], par: 130 } }),
    () => ({ w: 900, h: 1400, base: "lawn", shapes: [soil(450, 1240, 260, 120), soil(450, 170, 240, 120), blanket(450, 700, 520, 420, -0.06)],
        props: [p("stone", 200, 900, 0.3), p("stone2", 700, 560), p("apple", 240, 520, 0.4), p("log", 660, 900, 0.3), ...scatter(900, 1400, 7, 3, ["daisy", "clover", "leaf"])],
        foods: [f("bread", 280, 1060, 200), f("ham", 640, 1100, 140), f("sandwich", 450, 700, 420), f("bread", 620, 300, 150), f("beetle", 180, 700, 40)],
        nests: [me(450, 1250, { ants: 34, stock: [25, 0, 8, 0] }), foe(1, 450, 150, "rusher", 0, { maxPop: 90, ants: 14, hp: 600 })], goal: { destroy: true, chambers: ["nursery", "pantry", "gym"], par: 200 } }),
    () => ({ w: 1000, h: 1300, base: "lawn", shapes: [web(500, 480, 200), soil(500, 1130, 280, 120)],
        props: [p("pot", 170, 220), p("pot", 840, 300, 0, 0.8), p("trowel", 240, 720, 0.6), p("stone", 760, 760, 1), p("mushroom", 320, 330), p("mushroom", 690, 200, 0, 1.2), ...scatter(1000, 1300, 8, 4, ["clover", "leaf", "twig"])],
        foods: [f("sausage", 500, 460, 280), f("ham", 260, 960, 130), f("ham", 760, 980, 130), f("bread", 500, 830, 240), f("crumbs", 120, 620, 90), f("crumbs", 880, 620, 90)],
        critters: [{ k: "spider", x: 500, y: 480, hp: 1100, leash: 210, drop: 150 }], nests: [me(500, 1140, { ants: 40, stock: [30, 0, 10, 0] })], goal: { critters: "spider", chambers: ["nursery", "pantry", "gym"], par: 110 } }),
    () => ({ w: 1000, h: 1200, base: "blanket", shapes: [blanket(500, 560, 1200, 1400)],
        props: [p("plate", 200, 240, 0, 0.8), p("can", 800, 640, 1.3), p("shades", 260, 760, 0.3), p("fork", 730, 220, 1.1)],
        foods: [f("sandwich", 500, 380, 340), f("bread", 780, 340, 200), f("bread", 220, 500, 200), f("crumbs", 520, 760, 120), f("sandwich", 640, 170, 300), f("crumbs", 140, 860, 100), f("crumbs", 860, 880, 100)],
        hazards: { hand: { first: 24, every: 22, warn: 4, grab: 110 } }, nests: [me(500, 1040, { ants: 40, stock: [20, 0, 0, 0] })], goal: { gather: [[0, 1200]], chambers: ["nursery", "pantry"], par: 190 } }),
    () => ({ w: 1000, h: 1500, base: "patio", shapes: [patio(500, 300, 800, 560), soil(500, 1320, 320, 150), blanket(500, 880, 640, 340, 0.04)],
        props: [p("pot", 130, 200), p("pot", 870, 220), p("jar", 500, 560), p("can", 260, 700, 2), p("stone", 800, 1140), p("stone2", 180, 1120), ...scatter(1000, 1500, 7, 6, ["daisy", "clover", "leaf"])],
        foods: [f("gherkin", 240, 1040, 170), f("lemon", 760, 1000, 110), f("bread", 500, 880, 300), f("ham", 170, 800, 120), f("crumbs", 840, 760, 110), f("bread", 300, 290, 160), f("gherkin", 720, 300, 140)],
        nests: [me(500, 1340, { ants: 44, stock: [35, 0, 12, 12] }), foe(3, 500, 140, "turtle", 0, { maxPop: 130, hp: 700, army: { 2: 6, 1: 4 }, chambers: { vat: 1 } })], goal: { destroy: true, chambers: ["nursery", "pantry", "gym", "vat"], par: 460 } }),
    () => ({ w: 1100, h: 1500, base: "lawn", shapes: [soda(300, 720, 420, 150, 0.1), soda(860, 760, 330, 130, -0.1), soil(550, 1340, 300, 130), soil(550, 150, 300, 130)],
        props: [p("can", 560, 740, 1.5), p("stone", 180, 1020), p("mushroom", 900, 1060), p("stone2", 860, 400), p("apple", 220, 390), ...scatter(1100, 1500, 8, 7, ["clover", "daisy", "leaf"])],
        foods: [f("melon", 300, 1040, 260), f("jam", 820, 1110, 120), f("bread", 550, 1020, 280), f("lolly", 140, 880, 100), f("ham", 880, 950, 110), f("melon", 520, 400, 220), f("bread", 860, 280, 180), f("lolly", 240, 240, 90)],
        nests: [me(550, 1350, { ants: 46, stock: [40, 10, 15, 0] }), foe(2, 550, 130, "boomer", 1, { maxPop: 260, hp: 900 })], goal: { destroy: true, chambers: ["nursery", "pantry", "gym", "loft"], par: 280 } }),
    () => ({ w: 1100, h: 1500, base: "lawn", shapes: [blanket(550, 640, 620, 520, 0.03), soil(550, 1320, 300, 140), soil(180, 170, 220, 130)],
        props: [p("plate", 900, 260, 0, 0.8), p("jar", 200, 760), p("can", 890, 860, 0.5), p("stone", 330, 1130), ...scatter(1100, 1500, 8, 8, ["clover", "daisy", "twig"])],
        foods: [f("cake", 550, 620, 240), f("melon", 300, 1040, 240), f("bread", 800, 1080, 300), f("jam", 620, 1120, 120), f("ham", 880, 620, 130), f("bread", 330, 310, 170)],
        nests: [me(550, 1330, { ants: 50, stock: [40, 15, 10, 0] }), foe(1, 170, 150, "rusher", 1, { maxPop: 160, hp: 800 })], goal: { heavy: 260, chambers: ["nursery", "pantry", "gym", "hall"], par: 330 } }),
    () => ({ w: 1200, h: 1500, base: "lawn", shapes: [patio(600, 760, 340, 1540), soil(600, 1330, 320, 140)],
        props: [p("pot", 150, 500), p("pot", 1040, 880), p("flipflop", 220, 1020, 0.3), p("trowel", 960, 330, 2), ...scatter(1200, 1500, 9, 9, ["clover", "daisy", "leaf"])],
        foods: [f("bread", 300, 1200, 260), f("bread", 900, 1180, 260), f("ham", 800, 1000, 160), f("sandwich", 600, 880, 360), f("melon", 240, 800, 200), f("gherkin", 980, 700, 150), f("sausage", 350, 520, 200), f("bread", 860, 430, 200)],
        hazards: { shoe: { first: 40, every: 42, warn: 3, stepWarn: 1.5 } }, nests: [me(600, 1340, { ants: 60, stock: [50, 15, 20, 10] }), foe(2, 600, 120, "rusher", 2, { maxPop: 260, hp: 900 })], goal: { survive: 300, chambers: ["nursery", "pantry", "gym", "vat", "loft"], par: 310 } }),
    () => ({ w: 1300, h: 1600, base: "lawn", shapes: [blanket(650, 860, 760, 520, -0.05), soil(650, 1420, 340, 150), soil(180, 170, 260, 150), soil(1120, 170, 260, 150), soda(650, 470, 230, 100)],
        props: [p("plate", 300, 620, 0, 0.7), p("can", 1020, 620, 0.9), p("log", 650, 300, 0), p("stone", 280, 1180), p("stone", 1040, 1200, 2), p("jar", 1110, 960), ...scatter(1300, 1600, 10, 10, ["clover", "daisy", "leaf", "twig"])],
        foods: [f("sandwich", 650, 860, 460), f("ham", 400, 1230, 170), f("melon", 900, 1240, 240), f("gherkin", 250, 960, 170), f("bread", 650, 1110, 300), f("bread", 170, 450, 180), f("bread", 1130, 450, 180), f("ham", 650, 620, 130), f("jam", 80, 1400, 110)],
        nests: [me(650, 1430, { ants: 70, stock: [80, 20, 30, 20], chambers: { gym: 1 }, army: { 1: 14 } }), foe(1, 170, 150, "rusher", 2, { delay: 110, maxPop: 260, hp: 1000, army: { 1: 16 }, chambers: { gym: 1 } }), foe(3, 1130, 150, "turtle", 1, { maxPop: 240, hp: 1000, army: { 2: 14, 1: 8 }, chambers: { gym: 1, vat: 1 } })], goal: { destroy: true, par: 340 } }),
    () => ({ w: 1200, h: 1600, base: "blanket", shapes: [blanket(600, 780, 1400, 1800)],
        props: [p("plate", 280, 300, 0, 0.8), p("plate", 920, 1200, 0, 0.7), p("can", 960, 400, 0.8), p("shades", 240, 1160, -0.4), p("jar", 600, 1080), p("fork", 840, 760, 1.2)],
        foods: [f("sandwich", 600, 780, 520), f("bread", 280, 880, 320), f("bread", 900, 760, 320), f("sandwich", 620, 1260, 460), f("bread", 900, 1120, 320), f("bread", 330, 1120, 320), f("melon", 240, 1340, 200), f("ham", 960, 1420, 170), f("gherkin", 300, 620, 160), f("bread", 620, 360, 300), f("melon", 880, 200, 200)],
        hazards: { hand: { first: 45, every: 38, warn: 4, grab: 100 } }, nests: [me(600, 1450, { ants: 60, stock: [60, 20, 20, 10] }), foe(2, 600, 130, "boomer", 1, { maxPop: 300, hp: 900 })], goal: { gather: [[0, 1800]], rival: 3000, chambers: ["nursery", "pantry", "gym", "vat", "hall", "loft"], par: 280 } }),
    () => ({ w: 1400, h: 1800, base: "lawn", shapes: [blanket(700, 900, 860, 620, 0.04), patio(700, 210, 1000, 420), soil(700, 1620, 380, 170), soda(240, 960, 180, 240, 0.3), soda(1180, 820, 170, 240, -0.2), web(1180, 1320, 150)],
        props: [p("plate", 460, 780, 0, 0.8), p("can", 960, 1040, 1), p("jar", 700, 540), p("pot", 200, 200), p("pot", 1200, 200), p("flipflop", 240, 1360, 0.4), p("log", 700, 1320, 0.05), p("trowel", 1110, 560, 0.8), ...scatter(1400, 1800, 12, 12, ["clover", "daisy", "leaf", "twig"])],
        foods: [f("sandwich", 700, 880, 500), f("ham", 420, 1460, 190), f("melon", 980, 1470, 260), f("gherkin", 180, 1540, 170), f("bread", 700, 1180, 320), f("sausage", 1180, 1320, 240), f("lemon", 460, 1080, 110), f("jam", 250, 700, 130), f("gherkin", 1160, 610, 150), f("bread", 400, 350, 220), f("melon", 1000, 350, 240), f("ham", 180, 420, 160), f("gherkin", 880, 150, 130)],
        critters: [{ k: "spider", x: 1180, y: 1320, hp: 420, leash: 170, drop: 120 }, { k: "ladybird", x: 300, y: 1160 }],
        hazards: { hand: { first: 90, every: 55, warn: 4, grab: 110 }, shoe: { first: 150, every: 90, warn: 3, stepWarn: 1.5 } },
        nests: [me(700, 1640, { ants: 90, stock: [120, 30, 50, 30], chambers: { gym: 1, nursery: 1 }, army: { 1: 24 } }), foe(4, 700, 130, "empress", 1, { delay: 200, maxPop: 520, hp: 1800, ants: 70, army: { 1: 40, 2: 24, 4: 12 }, chambers: { nursery: 1, gym: 2, vat: 1, loft: 1, pantry: 1 }, stock: [260, 90, 90, 90] })], goal: { destroy: true, par: 620 } }),
].map((make) => () => tidy(make()));

export const SKIRMISH_MAPS = [
    { id: "blanket", name: "The Blanket", base: "blanket", blurb: "Open cloth, rich food." },
    { id: "lawn", name: "Back Lawn", base: "lawn", blurb: "Stones and shady corners." },
    { id: "patio", name: "The Patio", base: "patio", blurb: "Chokepoints between pots." },
    { id: "sea", name: "Soda Sea", base: "lawn", blurb: "Sticky lakes. Flyers rule." },
    { id: "web", name: "Spider Corner", base: "lawn", blurb: "Fat prizes, eight legs." },
];

/** Skirmish: mirrored starts so nobody gets the good side. */
export function skirmishMap(o) {
    const { map = "lawn", size = 1, enemies = 1, level = 1, hazards = true, seed = 1, strategies = [] } = o;
    const r = rng(seed + 11), w = [1000, 1250, 1500][size], h = [1300, 1600, 1900][size], def = SKIRMISH_MAPS.find((m) => m.id === map);
    const corners = enemies === 1 ? [[0.5, 0.09]] : enemies === 2 ? [[0.14, 0.1], [0.86, 0.1]] : [[0.12, 0.5], [0.88, 0.5], [0.5, 0.08]];
    const STRAT = [["rusher", 1], ["boomer", 2], ["turtle", 3], ["empress", 4], ["harrier", 2]];
    const nests = [{ team: 0, x: w / 2, y: h * 0.91, ants: 40, stock: [30, 0, 0, 0] }];
    const used = new Set();
    corners.forEach(([cx, cy], i) => {
        const pick = strategies[i] ?? STRAT[Math.floor(r() * STRAT.length)]; let team = pick[1]; while (used.has(team)) team = team % 4 + 1; used.add(team);
        nests.push({ team, x: w * cx, y: h * cy, side: i + 1, strategy: pick[0], level, ants: 40, stock: [30, 0, 0, 0] });
    });
    const shapes = [], props = [], foods = [], critters = [];
    if (def.base === "blanket") shapes.push(blanket(w / 2, h / 2, w * 1.3, h * 1.3));
    if (def.base === "patio") shapes.push(patio(w / 2, h / 2, w * 1.3, h * 1.3));
    if (map === "lawn") { shapes.push(blanket(w / 2, h / 2, w * 0.5, h * 0.3, 0.06)); }
    if (map === "sea") { shapes.push(soda(w * 0.5, h * 0.5, w * 0.34, h * 0.13, 0.05)); shapes.push(soda(w * 0.15, h * 0.34, w * 0.13, h * 0.1)); shapes.push(soda(w * 0.85, h * 0.34, w * 0.13, h * 0.1)); shapes.push(soda(w * 0.15, h * 0.68, w * 0.13, h * 0.09)); shapes.push(soda(w * 0.85, h * 0.68, w * 0.13, h * 0.09)); }
    if (map === "web") { shapes.push(web(w / 2, h / 2, 210)); critters.push({ k: "spider", x: w / 2, y: h / 2, leash: 220, drop: 200 }); foods.push(f("sausage", w / 2, h / 2, 400)); }
    for (const n of nests) { shapes.push(soil(n.x, n.y, 230, 120)); }
    // A ring of food around each nest, then a rich middle.
    for (const n of nests) {
        const cx = w / 2 - n.x, cy = h / 2 - n.y, a0 = Math.atan2(cy, cx), ring = [["bread", 0, 280], ["ham", 1, 260], ["gherkin", -1, 290], ["melon", 1.9, 300], ["crumbs", -1.9, 220]];
        for (const [k, da, rad] of ring) foods.push(f(k, Math.max(70, Math.min(w - 70, n.x + Math.cos(a0 + da) * rad)), Math.max(70, Math.min(h - 70, n.y + Math.sin(a0 + da) * rad))));
    }
    if (map !== "web") foods.push(f("sandwich", w / 2, h / 2));
    foods.push(f("melon", w * 0.22, h * 0.5), f("sausage", w * 0.78, h * 0.5), f("bread", w * 0.5, h * 0.3), f("bread", w * 0.5, h * 0.72));
    const kinds = map === "patio" ? ["pot", "pot", "jar", "stone"] : map === "blanket" ? ["plate", "can", "shades", "fork"] : ["stone", "stone2", "mushroom", "log", "pot", "apple"];
    for (let i = 0; i < 10 + size * 4; i++) {
        const x = 80 + r() * (w - 160), y = 80 + r() * (h - 160);
        if (nests.some((n) => Math.hypot(n.x - x, n.y - y) < 210) || foods.some((q) => Math.hypot(q.x - x, q.y - y) < 130)) continue;
        props.push(p(kinds[i % kinds.length], x, y, r() * 6.28, 0.75 + r() * 0.3));
    }
    props.push(...scatter(w, h, 12, seed + 5, ["clover", "daisy", "leaf", "twig"]));
    const m = { w, h, base: def.base, shapes, props, foods, nests, critters, goal: { destroy: true, par: 240 + size * 120 + enemies * 120 } };
    if (hazards) m.hazards = { hand: { first: 120, every: 80, warn: 4, grab: 110 }, shoe: { first: 200, every: 120, warn: 3, stepWarn: 1.5 } };
    return tidy(m);
}

/** The little war behind the title. */
export function titleMap() {
    return { w: 1000, h: 1000, base: "blanket", shapes: [blanket(500, 500, 1300, 1300)], props: [p("plate", 800, 180, 0, 0.8), p("can", 180, 200, 0.8), p("fork", 150, 800, 0.4)],
        foods: [f("sandwich", 520, 420, 900), f("bread", 280, 620, 500), f("melon", 760, 660, 400), f("ham", 620, 780, 300)],
        nests: [{ team: 0, x: 320, y: 840, ants: 170, army: { 1: 40 }, stock: [400, 200, 200, 200], chambers: { gym: 2, nursery: 2, pantry: 2, loft: 1, vat: 1 } }, { team: 1, x: 700, y: 170, side: 1, strategy: "boomer", level: 2, ants: 170, army: { 1: 50 }, stock: [400, 200, 200, 200], chambers: { gym: 2, nursery: 2, pantry: 2 } }], goal: { endless: true } };
}
