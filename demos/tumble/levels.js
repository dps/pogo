// Twenty-five castles in five worlds. Each is built with a tiny stacking language: `put` drops a
// block on whatever is already there, so every structure rests exactly and starts out stable.
import { DEFENDERS, SHAPES } from "./sim.js";

class Build {
    constructor() { this.blocks = []; this.defenders = []; this.statics = []; this.h = new Map(); this.decor = []; }
    cells(x, w) { const out = []; for (let c = Math.round((x - w / 2) * 2); c < Math.round((x + w / 2) * 2); c++) out.push(c); return out; }
    top(x, w) { let t = 0; for (const c of this.cells(x, w)) t = Math.max(t, this.h.get(c) ?? 0); return t; }
    raise(x, w, t) { for (const c of this.cells(x, w)) this.h.set(c, t); }
    /** Drop a block on the skyline at x. */
    put(mat, shape, x) {
        const [w, h] = SHAPES[shape], base = this.top(x, w);
        if (w > 1 && (this.top(x - w / 2 + 0.25, 0.5) < base - 0.01 || this.top(x + w / 2 - 0.25, 0.5) < base - 0.01)) this.raise(x, w, base);
        this.blocks.push({ mat, shape, x, y: -(base + h / 2) });
        this.raise(x, w, base + h);
        return this;
    }
    /** Static rock plateau, top at height t. */
    hill(x0, x1, t) {
        const x = (x0 + x1) / 2, w = x1 - x0, depth = t + 4;
        this.statics.push({ x, y: -t + depth / 2, w, h: depth });
        this.raise(x, w, t);
        return this;
    }
    def(x, type = "squire", o = {}) {
        const r = DEFENDERS[type].r;
        const t = this.top(x, 0.5);
        this.defenders.push({ type, x, y: -(t + r + 0.01), ...o });
        return this;
    }
    /** Defender on the skyline, and the skyline rises by his height so beams can't be laid through him. */
    sit(x, type = "squire", o = {}) { return this.def(x, type, o); }
    col(x, mat, n, shape = "c") { for (let i = 0; i < n; i++) this.put(mat, shape, x); return this; }
    /** Brick wall: alternating courses of long and short stones. */
    wall(x0, width, courses, mat = "stone") {
        for (let r = 0; r < courses; r++) {
            let x = x0, left = width;
            if (r % 2) { this.put(mat, "c", x + 0.5); x += 1; left -= 1; }
            while (left >= 2) { this.put(mat, "h", x + 1); x += 2; left -= 2; }
            if (left >= 1) { this.put(mat, "c", x + 0.5); }
        }
        return this;
    }
    /** Small bricks, half courses offset: lots of little bodies to spill. */
    bricks(x0, width, courses, mat = "stone") {
        for (let r = 0; r < courses; r++) {
            const n = width - 2 - (r % 2), start = x0 + 1 + (r % 2 ? 0.5 : 0);
            for (let i = 0; i < n; i++) this.put(mat, "b", start + i + 0.5);
        }
        for (let i = 0; i < courses / 2; i++) this.put(mat, "c", x0 + 0.5).put(mat, "c", x0 + width - 0.5);
        return this;
    }
    /** Open room four wide: pillars, a defender, a beam. */
    room(x, mat = "wood", beam = "wood", who = "squire", pillar = "t", o = {}) {
        // Footing evens out first, so a room can stand on anything flat enough.
        const floor = this.top(x, 4);
        this.raise(x, 4, floor);
        for (const sx of [x - 1.5, x + 1.5]) {
            if (pillar === "c2") { this.put(mat, "c", sx).put(mat, "c", sx); }
            else if (pillar === "c3") { this.put(mat, "c", sx).put(mat, "c", sx).put(mat, "c", sx); }
            else this.put(mat, pillar, sx);
        }
        if (who) this.sit(x, who, o);
        const top = this.top(x - 1.5, 1);
        this.raise(x, 4, top);
        this.put(beam, "l", x);
        return this;
    }
    /** A grid of rooms, bay after bay, floor upon floor. `who` lists occupants left to right, bottom to top. */
    keep(x0, bays, floors, mat, deck, who = [], pillar = "c2") {
        let i = 0;
        for (let f = 0; f < floors; f++) for (let k = 0; k < bays; k++) this.room(x0 + 2 + k * 4, mat, deck, who[i++] ?? null, pillar);
        return this;
    }
    /** A beam laid across a gap between two equal heights. */
    span(x, h, mat = "wood") { this.raise(x, 4, h); this.put(mat, "l", x - 2 + 2); return this; }
    /** Slender shaft two wide, built to wobble. */
    shaft(x, floors, mat = "wood", deck = "wood", who = null, roof = null) {
        for (let f = 0; f < floors; f++) {
            const base = this.top(x, 2);
            this.raise(x, 2, base);
            this.put(mat, "v", x - 0.75).put(mat, "v", x + 0.75);
            if (who && f === (who.floor ?? 0)) this.sit(x, who.type ?? "squire");
            this.raise(x, 2, base + 2);
            this.put(deck, "p", x);
        }
        if (roof) this.put(roof === true ? "roof" : roof, "r", x);
        return this;
    }
    crenels(x0, n, mat = "stone") { for (let i = 0; i < n; i++) this.put(mat, "c", x0 + i * 2 + 0.5); return this; }
    done(o) { return { ...o, blocks: this.blocks, defenders: this.defenders, statics: this.statics }; }
}

const S = 10;     // first castle block: everything is laid out from here to the right

export const WORLDS = [
    { name: "Meadow Marches", blurb: "Wooden forts and fat gourds", theme: "meadow", reward: "Sandbox" },
    { name: "Frostmere", blurb: "Palaces of ice-glass", theme: "frost", reward: "Heavy Iron" },
    { name: "Cinderpeak", blurb: "They keep the powder upstairs", theme: "ember", reward: "Bouncer" },
    { name: "Stormspire", blurb: "Towers on the edge of the sky", theme: "storm", reward: "A golden catapult" },
    { name: "The Gilded Bastion", blurb: "The Gourd King's last stand", theme: "gilded", reward: "Glory" },
];

const levels = [];
const add = (world, name, ammo, fn, extra = {}) => { const b = new Build(); fn(b); levels.push(b.done({ world, name, ammo, ...extra })); };

// --- World 1: Meadow Marches ------------------------------------------------------------------------
add(0, "Knock Knock", { rock: 4 }, (b) => {
    b.col(S + 2, "wood", 3).col(S + 5, "wood", 3);
    b.put("wood", "l", S + 3.5);
    b.sit(S + 3.5);
    b.col(S + 8, "wood", 2);
}, {});
add(0, "Two Huts", { rock: 4 }, (b) => {
    b.room(S + 2, "wood", "wood"); b.put("roof", "R", S + 2);
    b.room(S + 7, "wood", "wood"); b.room(S + 7, "wood", "wood"); b.put("roof", "R", S + 7);
});
add(0, "The Lookout", { rock: 4 }, (b) => {
    b.wall(S + 1, 4, 2, "wood");
    b.shaft(S + 3, 4, "wood", "wood", { floor: 3 }, true);
    b.room(S + 8, "wood", "wood"); b.room(S + 8, "wood", "wood", null); b.put("roof", "r", S + 8);
});
add(0, "Split Decision", { rock: 3, split: 2 }, (b) => {
    b.col(S + 1, "wood", 4); b.sit(S + 1);
    b.col(S + 4, "wood", 3).col(S + 5, "wood", 3); b.sit(S + 4.5);
    b.room(S + 9, "wood", "wood"); b.room(S + 9, "wood", "wood", null); b.col(S + 8, "wood", 1); b.col(S + 10, "wood", 1); b.sit(S + 9);
}, { unlock: "split" });
add(0, "Baron Gourdon's Keep", { rock: 4, split: 3 }, (b) => {
    b.wall(S + 1, 12, 1);
    b.room(S + 3, "stone", "wood", "squire", "c2"); b.room(S + 11, "stone", "wood", "squire", "c2");
    b.room(S + 3, "wood", "wood", null); b.room(S + 11, "wood", "wood", null);
    b.put("roof", "R", S + 3).put("roof", "R", S + 11);
    b.room(S + 7, "stone", "wood", "boss", "T", { hp: 7 });
    b.crenels(S + 5, 2, "wood");
}, {
    boss: "Baron Gourdon", taunt: "My gourds! My beautiful gourds!",
    drops: [[{ mat: "wood", shape: "h", x: S + 6 }, { mat: "wood", shape: "h", x: S + 8 }], [{ mat: "stone", shape: "c", x: S + 5 }, { mat: "wood", shape: "c", x: S + 9 }]],
});

// --- World 2: Frostmere -----------------------------------------------------------------------------
add(1, "Thin Ice", { rock: 3, split: 1 }, (b) => {
    b.room(S + 2, "glass", "wood"); b.room(S + 2, "glass", "glass"); b.put("roof", "R", S + 2);
    b.room(S + 7, "stone", "glass", "squire", "c2"); b.room(S + 7, "glass", "glass", null); b.room(S + 7, "glass", "wood", "squire"); b.put("roof", "R", S + 7);
});
add(1, "Hall of Mirrors", { rock: 3, split: 2, bomb: 2 }, (b) => {
    b.keep(S + 2, 3, 2, "glass", "wood", ["squire", null, "knight", "squire", null, "squire"], "c2");
    b.keep(S + 4, 2, 1, "glass", "glass", [null, "squire"], "t");
    b.put("roof", "R", S + 6);
}, { unlock: "bomb" });
add(1, "Glasshouse", { rock: 2, bomb: 2 }, (b) => {
    b.wall(S, 4, 1); b.wall(S + 10, 4, 1);
    b.shaft(S + 2, 5, "glass", "wood", { floor: 2 }, true);
    b.shaft(S + 12, 5, "glass", "wood", { floor: 4, type: "knight" }, true);
    b.room(S + 7, "stone", "glass", "squire", "c2"); b.room(S + 7, "glass", "glass", null); b.room(S + 7, "glass", "wood", "squire"); b.put("roof", "R", S + 7);
});
add(1, "Icicle Row", { rock: 3, split: 2, bomb: 2 }, (b) => {
    for (let i = 0; i < 6; i++) {
        const x = S + 1 + i * 2.5, n = 2 + (i % 3);
        for (let k = 0; k < n; k++) { b.put("glass", "v", x); b.put("glass", "b", x); }
        b.put("stone", "c", x);
        if (i % 2) b.sit(x);
    }
});
add(1, "The Frost Duchess", { rock: 4, split: 2, bomb: 2 }, (b) => {
    b.wall(S, 14, 2, "stone");
    b.keep(S, 1, 3, "glass", "stone", [null, "knight", "squire"], "c2");
    b.keep(S + 10, 1, 3, "glass", "stone", ["squire", null, "knight"], "c2");
    b.put("roof", "R", S + 2).put("roof", "R", S + 12);
    b.room(S + 7, "stone", "glass", "boss", "T", { hp: 9 });
    b.room(S + 7, "glass", "glass", null);
    b.put("roof", "R", S + 7);
}, {
    boss: "The Frost Duchess", taunt: "How dare you. Do you know what glass costs?",
    drops: [[{ mat: "glass", shape: "h", x: S + 6 }, { mat: "glass", shape: "h", x: S + 8 }], [{ mat: "stone", shape: "h", x: S + 7 }]],
});

// --- World 3: Cinderpeak ----------------------------------------------------------------------------
add(2, "Powder Room", { rock: 3, iron: 1 }, (b) => {
    b.keep(S + 1, 1, 2, "stone", "wood", ["squire", null], "c2");
    b.put("tnt", "c", S + 6.5).put("tnt", "c", S + 7.5).put("tnt", "c", S + 7);
    b.keep(S + 9, 1, 3, "stone", "wood", [null, "squire", null], "c2");
    b.put("roof", "R", S + 3).put("roof", "R", S + 11);
}, { unlock: "iron" });
add(2, "Fireworks", { rock: 2, iron: 1, bomb: 1 }, (b) => {
    b.keep(S + 1, 3, 3, "stone", "wood", ["knight", null, "squire", null, "squire", null, null, null, null], "c2");
    b.put("tnt", "c", S + 2).put("tnt", "c", S + 4).put("tnt", "c", S + 7).put("tnt", "c", S + 9).put("tnt", "c", S + 12);
    b.put("roof", "R", S + 7);
});
add(2, "Chain Letter", { rock: 3, iron: 1 }, (b) => {
    for (let i = 0; i < 7; i++) { b.col(S + 1 + i * 2, "stone", 2); b.put("tnt", "c", S + 1 + i * 2); }
    b.put("stone", "l", S + 3).put("stone", "l", S + 11);
    b.room(S + 3, "stone", "stone", "knight", "c2"); b.room(S + 11, "stone", "stone", "knight", "c2");
    b.put("roof", "R", S + 3).put("roof", "R", S + 11);
});
add(2, "The Bunker", { rock: 3, iron: 3, bomb: 1 }, (b) => {
    b.wall(S, 14, 3);
    b.room(S + 3, "stone", "stone", "squire", "c2"); b.room(S + 11, "stone", "stone", "squire", "c2");
    b.room(S + 7, "stone", "stone", "knight", "c2");
    b.crenels(S + 1, 3); b.crenels(S + 9, 2); b.put("tnt", "c", S + 7);
});
add(2, "Marquis Cinderwick", { rock: 3, iron: 3, bomb: 2 }, (b) => {
    b.wall(S, 16, 1);
    b.put("tnt", "c", S + 1.5).put("tnt", "c", S + 14.5);
    b.keep(S + 2, 1, 4, "stone", "stone", ["knight", null, "squire", null], "c2");
    b.keep(S + 10, 1, 4, "stone", "stone", [null, "knight", null, "squire"], "c2");
    b.put("tnt", "c", S + 2.5).put("tnt", "c", S + 13.5);
    b.put("roof", "R", S + 4.5).put("roof", "R", S + 11.5);
    b.room(S + 8, "stone", "stone", "boss", "T", { hp: 10 });
    b.room(S + 8, "wood", "wood", null);
    b.put("tnt", "c", S + 7).put("tnt", "c", S + 9); b.put("roof", "R", S + 8);
}, {
    boss: "Marquis Cinderwick", taunt: "Careful! That one's not a bench!",
    drops: [[{ mat: "tnt", shape: "c", x: S + 6 }, { mat: "stone", shape: "h", x: S + 8 }], [{ mat: "stone", shape: "h", x: S + 10 }, { mat: "tnt", shape: "c", x: S + 8 }]],
});

// --- World 4: Stormspire ----------------------------------------------------------------------------
add(3, "Cliffhanger", { rock: 3, ball: 2 }, (b) => {
    b.hill(S + 2, S + 11, 5);
    b.keep(S + 2.5, 2, 3, "stone", "wood", ["knight", null, null, "squire", "squire", null], "c2");
    b.put("roof", "R", S + 4.5).put("roof", "R", S + 8.5);
    b.sit(S, "squire");
}, { unlock: "ball" });
add(3, "The Needle", { rock: 3, ball: 1, iron: 2, split: 1 }, (b) => {
    b.wall(S + 2, 8, 3);
    b.shaft(S + 6, 9, "stone", "wood", { floor: 8, type: "knight" }, true);
    b.room(S + 12, "stone", "wood", "squire", "c2");
    b.room(S + 12, "stone", "wood", "squire", "c2"); b.put("roof", "R", S + 12);
});
add(3, "Skybridge", { rock: 3, ball: 2, bomb: 2 }, (b) => {
    b.hill(S + 1, S + 6.5, 5); b.hill(S + 9.5, S + 15, 5);
    b.keep(S + 1, 1, 3, "stone", "wood", ["squire", null, "squire"], "c2"); b.put("roof", "R", S + 3);
    b.keep(S + 11, 1, 3, "stone", "wood", [null, "knight", null], "c2"); b.put("roof", "R", S + 13);
    b.span(S + 8, 5, "wood");
    b.sit(S + 7, "squire").sit(S + 9, "squire");
});
add(3, "Twin Spires", { rock: 2, iron: 2, ball: 1, split: 1 }, (b) => {
    b.shaft(S + 2, 8, "stone", "wood", { floor: 7 }, true);
    b.shaft(S + 12, 9, "stone", "wood", { floor: 4, type: "knight" }, true);
    b.keep(S + 5, 1, 4, "wood", "wood", ["squire", null, "knight", null], "c2");
    b.put("roof", "R", S + 7);
});
add(3, "The Storm Regent", { rock: 4, iron: 2, ball: 2, bomb: 1 }, (b) => {
    b.hill(S + 3, S + 13, 3);
    b.wall(S + 3, 10, 2);
    b.keep(S + 4, 2, 2, "stone", "stone", ["squire", "knight", null, null], "c2");
    b.room(S + 8, "stone", "stone", "boss", "T", { hp: 10 });
    b.shaft(S + 5, 3, "glass", "wood", { floor: 1 }, true); b.shaft(S + 11, 4, "glass", "wood", { floor: 2 }, true);
    b.room(S + 8, "glass", "wood", null); b.put("roof", "R", S + 8);
    b.sit(S + 1);
}, {
    boss: "The Storm Regent", taunt: "I shall have you know this tower is load-bearing!",
    drops: [[{ mat: "stone", shape: "h", x: S + 7 }, { mat: "glass", shape: "h", x: S + 9 }], [{ mat: "stone", shape: "c", x: S + 6 }, { mat: "tnt", shape: "c", x: S + 8 }, { mat: "stone", shape: "c", x: S + 10 }]],
});

// --- World 5: The Gilded Bastion --------------------------------------------------------------------
add(4, "Gate of Coin", { rock: 3, iron: 3, bomb: 2, split: 1 }, (b) => {
    b.keep(S, 1, 4, "stone", "stone", [null, "knight", null, "squire"], "c2"); b.put("roof", "R", S + 2);
    b.keep(S + 12, 1, 4, "stone", "stone", ["squire", null, "knight", null], "c2"); b.put("roof", "R", S + 14);
    b.keep(S + 5, 1, 3, "stone", "stone", ["knight", null, null], "c2");
    b.put("gold", "c", S + 6).put("gold", "c", S + 8);
});
add(4, "Vault Row", { rock: 3, iron: 3, bomb: 2, ball: 1 }, (b) => {
    b.keep(S, 4, 3, "stone", "wood", [null, "knight", null, "squire", "squire", null, "knight", null, null, null, null, null], "c2");
    for (const [x, m] of [[S + 2, "gold"], [S + 6, "tnt"], [S + 10, "gold"], [S + 14, "tnt"]]) b.put(m, "c", x);
    b.put("roof", "R", S + 2).put("roof", "R", S + 8).put("roof", "R", S + 14);
});
add(4, "Grand Staircase", { rock: 3, iron: 3, split: 1, bomb: 2 }, (b) => {
    for (let i = 0; i < 7; i++) { b.col(S + 1 + i * 2, "stone", 1 + i); b.col(S + 2 + i * 2, "stone", 1 + i); if (i % 2 === 1) b.sit(S + 1.5 + i * 2, i > 4 ? "knight" : "squire"); }
    b.put("roof", "R", S + 13.5);
});
add(4, "Hall of Ancestors", { rock: 3, iron: 3, ball: 2, bomb: 3 }, (b) => {
    b.bricks(S, 16, 6);
    b.keep(S, 4, 4, "stone", "stone", ["knight", null, null, "knight", null, "squire", "squire", null, null, "knight", null, null, null, null, null, null], "c2");
    b.put("tnt", "c", S + 8);
    b.put("roof", "R", S + 2).put("roof", "R", S + 6).put("roof", "R", S + 10).put("roof", "R", S + 14);
});
add(4, "The Gourd King", { rock: 3, iron: 3, bomb: 3, split: 2, ball: 1 }, (b) => {
    b.bricks(S, 18, 6);
    b.put("tnt", "c", S + 0.5).put("gold", "c", S + 17.5);
    b.keep(S + 1, 1, 5, "stone", "stone", ["knight", null, "knight", null, "squire"], "c2");
    b.keep(S + 13, 1, 5, "stone", "stone", [null, "knight", null, "knight", null], "c2");
    b.put("roof", "R", S + 3).put("roof", "R", S + 15);
    b.keep(S + 5, 2, 2, "stone", "wood", [null, "knight", "squire", null], "c2");
    b.room(S + 9, "stone", "stone", "boss", "T", { hp: 13 });
    b.put("gold", "c", S + 8).put("gold", "c", S + 10);
    b.room(S + 9, "glass", "stone", "knight"); b.room(S + 9, "wood", "wood", null);
    b.put("roof", "R", S + 9);
}, {
    boss: "The Gourd King", taunt: "Off with their... wait, what is that boulder doing?",
    drops: [[{ mat: "stone", shape: "h", x: S + 8 }, { mat: "stone", shape: "h", x: S + 10 }], [{ mat: "gold", shape: "c", x: S + 9 }, { mat: "tnt", shape: "c", x: S + 7 }, { mat: "tnt", shape: "c", x: S + 11 }]],
});

levels.forEach((l, i) => { l.index = i; l.bossLevel = !!l.boss; });
export const LEVELS = levels;

/** A castle for the title screen and the sandbox start. */
export function showcase() {
    const b = new Build();
    b.wall(S, 12, 1);
    b.room(S + 3, "stone", "wood", "squire", "c2"); b.room(S + 9, "stone", "wood", "knight", "c2");
    b.shaft(S + 3, 3, "wood", "wood", { floor: 1 }, true);
    b.room(S + 9, "wood", "wood", "squire"); b.room(S + 9, "wood", "wood", null);
    b.put("roof", "R", S + 9);
    return b.done({ world: 0, name: "Tumble Keep", ammo: { rock: 99 } });
}
