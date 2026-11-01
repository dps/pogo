// CAT BURGLAR. The whole heist as a pure simulation: one cat, some guards, a lot of fragile things.
// No Pogo imports. The stage only reads this, and the solver drives this same code with the same inputs a thumb gives.
import { HIGH, LOUD, PERCH, QUIET, SIGHT, T, WALK, buildWorld, flagAt, flagXY, lightAt } from "./world.js";

export const DT = 1 / 60;
export const SLINK = 78, RUN = 172, BOX_SPEED = 44, PUSH = 0.12, RUN_AT = 0.72;
export const NR = 25, NS = 7;     // vision mesh: rays and rings
export const NOSE = 2.4 * T, SNEEZE = 2.1 * T, BUMP = 15;

const TAU = Math.PI * 2;
const wrap = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const approachAngle = (a, b, step) => { const d = wrap(b - a); return Math.abs(d) <= step ? b : wrap(a + Math.sign(d) * step); };
const COMPASS = { E: 0, SE: Math.PI / 4, S: Math.PI / 2, SW: 3 * Math.PI / 4, W: Math.PI, NW: -3 * Math.PI / 4, N: -Math.PI / 2, NE: -Math.PI / 4 };

/** Everyone on the night shift. Keen scales how fast suspicion builds, hear how far sound carries to them. */
export const PEOPLE = {
    pemberton: { name: "Mr. Pemberton", speed: 42, range: 4.6, half: 30, hear: 0.7, keen: 0.75 },
    bea: { name: "Bea", speed: 58, range: 5.4, half: 34, hear: 1.0, keen: 1.0 },
    gus: { name: "Gus", speed: 48, range: 5.0, half: 36, hear: 0.9, keen: 0.9 },
    hubert: { name: "Hubert", speed: 44, range: 5.6, half: 30, hear: 1.0, keen: 1.1 },
    milo: { name: "Milo", speed: 52, range: 5.0, half: 34, hear: 1.0, keen: 1.0, sneezes: true },
    dolores: { name: "Dolores", speed: 56, range: 6.6, half: 28, hear: 1.15, keen: 1.3 },
    chef: { name: "Chef Bouillon", speed: 50, range: 5.0, half: 38, hear: 0.85, keen: 1.0 },
    sarge: { name: "Sgt. Mutton", speed: 50, range: 5.4, half: 32, hear: 1.0, keen: 1.1 },
};

/** Gadgets. `cost` is in fishbones, spent in the alley between heists. */
export const PERKS = {
    velvet: { name: "Velvet Paws", cost: 4, blurb: "Quieter paws. Running carries half as far." },
    coat: { name: "Midnight Coat", cost: 6, blurb: "Shadows hide you far better." },
    spring: { name: "Spring Haunches", cost: 6, blurb: "Leap almost half again as far." },
    yarn: { name: "Yarn Ball", cost: 8, blurb: "Tap in the open to bowl it. Guards follow the noise." },
    flatbox: { name: "Flat-Pack Box", cost: 10, blurb: "Tap in the open to unfold a box and sit in it." },
    lives: { name: "Ninth Life", cost: 12, blurb: "Wriggle free the first time you get grabbed." },
};

class Rng {
    constructor(s) { this.s = s >>> 0 || 1; }
    next() { let x = this.s; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.s = x >>> 0; return this.s / 4294967296; }
}

export class Sim {
    constructor(def, o = {}) {
        this.world = buildWorld(def);
        this.def = def;
        this.perks = o.perks ?? {};
        this.ghost = !!o.ghost;        // no cat: used to record the patrols for the solver
        const w = this.world;
        this.t = 0; this.step_ = 0; this.status = "play";
        this.rng = new Rng((o.seed ?? 7) + def.id.length * 31);
        this.events = [];
        this.flows = new Map();
        this.snuffed = new Uint8Array(w.lanterns.length);
        this.items = w.items.map((it, i) => ({ ...it, i, state: "still", t: 0, fx: 0, fy: 0, tilt: 0, value: it.kind === "lamp" ? 1 : 1 }));
        this.loot = w.bonus.map((b, i) => ({ ...b, i, got: false }));
        this.boxes = w.boxes.map((b, i) => ({ x: b.x, y: b.y, i }));
        this.shards = [];
        this.yarn = null;
        this.cat = {
            x: w.start.x, y: w.start.y, z: 0, vx: 0, vy: 0, dir: def.startDir ?? -Math.PI / 2, mode: this.ghost ? "absent" : "ground",
            speed: 0, running: false, push: 0, stepD: 0, fish: false, leap: null, vent: null, box: null, rub: null, tip: 0,
            yarn: this.perks.yarn ? 1 : 0, flat: this.perks.flatbox ? 1 : 0, lives: this.perks.lives ? 1 : 0, lastTile: -1, moved: false,
        };
        this.guards = (def.guards ?? []).map((g, i) => this.makeGuard(g, i));
        this.lasers = (def.lasers ?? []).map((l, i) => ({ ...l, i, x0: (l.a[0] + 0.5) * T, y0: (l.a[1] + 0.5) * T, x1: (l.b[0] + 0.5) * T, y1: (l.b[1] + 0.5) * T, live: true, cd: 0 }));
        this.stats = { seenTime: 0, peak: 0, curious: 0, chases: 0, heard: 0, smashed: 0, rubs: 0, dogs: 0, lasers: 0, alarms: 0, escapes: 0, boxes: 0, leaps: 0, vents: 0, noisy: 0 };
        this.rec = { guards: [], cat: [], marks: [] };
        this.alert = 0;
    }

    makeGuard(def, i) {
        const kind = def.kind ?? "guard", p = PEOPLE[def.who] ?? {};
        const route = (def.route ?? []).map((s) => ({ c: s[0], r: s[1], wait: s[2] ?? 0, look: s[3] ? s[3].split(" ").map((k) => COMPASS[k]) : null, pose: s[4] ?? "" }));
        const s0 = route[0] ?? { c: def.at?.[0] ?? 0, r: def.at?.[1] ?? 0 };
        const g = {
            i, kind, who: def.who ?? kind, x: (s0.c + 0.5) * T, y: (s0.r + 0.5) * T, dir: def.dir !== undefined ? COMPASS[def.dir] ?? def.dir : 0, want: 0,
            state: "patrol", st: 0, s: 0, stim: null, path: [], pi: 0, route, ri: 0, rd: 1, back: !!def.back, wait: 0, dur: 0, walking: false,
            lost: 0, repath: 0, pose: "", walk: 0, spots: null, loud: false, sneeze: 0, growl: 0, follow: def.follow ?? -1, cd: 0, cone: null, coneAt: -9,
            speed: def.speed ?? p.speed ?? 58, range: (def.range ?? p.range ?? 5) * T, half: (def.half ?? p.half ?? 32) * Math.PI / 180, hear: p.hear ?? 1, keen: def.keen ?? p.keen ?? 1,
            sway: def.sway ?? 0.16, sneezes: !!p.sneezes, base: 0, sweep: 0, period: 1, phase: 0, rad: 0, seen: 0, hits: 0,
        };
        g.want = g.dir;
        if (kind === "cam") {
            g.base = COMPASS[def.dir] ?? def.dir ?? 0; g.sweep = (def.sweep ?? 40) * Math.PI / 180; g.period = def.period ?? 7; g.phase = def.phase ?? 0;
            g.x = (def.at[0] + 0.5) * T; g.y = (def.at[1] + 0.5) * T; g.range = (def.range ?? 5.5) * T; g.half = (def.half ?? 20) * Math.PI / 180; g.keen = def.keen ?? 0.9;
        }
        if (kind === "spot") { g.rad = (def.rad ?? 2) * T; g.speed = def.speed ?? 40; g.keen = def.keen ?? 1.4; g.back = true; this.nextLeg(g); }
        if (kind === "dog") { g.speed = def.speed ?? 60; g.range = 0; }
        // Everyone clocks on at their first stop and does whatever they do there.
        if (route.length) { g.wait = g.dur = (def.delay ?? 0) + (route[0].wait || 0.01); g.pose = route[0].pose; }
        return g;
    }

    emit(type, o = {}) { if (!this.ghost) this.events.push({ type, t: this.t, ...o }); }
    mark(kind, x, y) { if (!this.ghost) this.rec.marks.push({ t: this.t, kind, x, y }); }

    // --- Paths -----------------------------------------------------------------------------------

    /** Walking distance to tile `to` for every tile, cached. `sound` walks over furniture but not walls. */
    flow(to, sound = false) {
        const key = to * 2 + (sound ? 1 : 0);
        let f = this.flows.get(key);
        if (f) return f;
        const w = this.world, n = w.cols * w.rows;
        f = new Int16Array(n).fill(-1);
        const q = new Int32Array(n);
        let a = 0, b = 0;
        q[b++] = to; f[to] = 0;
        const block = (i) => (sound ? (w.flags[i] & SIGHT) && !(w.flags[i] & PERCH) : w.flags[i] & WALK);
        while (a < b) {
            const i = q[a++], c = i % w.cols, r = (i - c) / w.cols;
            if (c > 0 && f[i - 1] < 0 && !block(i - 1)) { f[i - 1] = f[i] + 1; q[b++] = i - 1; }
            if (c < w.cols - 1 && f[i + 1] < 0 && !block(i + 1)) { f[i + 1] = f[i] + 1; q[b++] = i + 1; }
            if (r > 0 && f[i - w.cols] < 0 && !block(i - w.cols)) { f[i - w.cols] = f[i] + 1; q[b++] = i - w.cols; }
            if (r < w.rows - 1 && f[i + w.cols] < 0 && !block(i + w.cols)) { f[i + w.cols] = f[i] + 1; q[b++] = i + w.cols; }
        }
        this.flows.set(key, f);
        return f;
    }

    /** Tile path from a world point to the walkable tile nearest (tc, tr). */
    pathTo(x, y, tc, tr) {
        const w = this.world;
        if (flagAt(w, tc, tr) & WALK) {
            let best = null, bd = 1e9;
            for (const [dc, dr] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [2, 0], [-2, 0], [0, -2]]) {
                if (flagAt(w, tc + dc, tr + dr) & WALK) continue;
                const d = Math.hypot(dc, dr);
                if (d < bd) { bd = d; best = [tc + dc, tr + dr]; }
            }
            if (!best) return [];
            [tc, tr] = best;
        }
        const f = this.flow(tr * w.cols + tc);
        let c = Math.floor(x / T), r = Math.floor(y / T);
        const out = [];
        if (f[r * w.cols + c] < 0) return out;
        for (let guard = 0; guard < 400 && f[r * w.cols + c] > 0; guard++) {
            const v = f[r * w.cols + c];
            let nc = c, nr = r;
            for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const cc = c + dc, rr = r + dr;
                if (cc < 0 || rr < 0 || cc >= w.cols || rr >= w.rows) continue;
                const u = f[rr * w.cols + cc];
                if (u >= 0 && u < v) { nc = cc; nr = rr; break; }
            }
            c = nc; r = nr;
            out.push([(c + 0.5) * T, (r + 0.5) * T]);
        }
        return out;
    }

    nextLeg(g) {
        if (!g.route.length) return;
        if (g.back) {
            if (g.ri + g.rd >= g.route.length || g.ri + g.rd < 0) g.rd = -g.rd;
            g.ri += g.rd;
        } else g.ri = (g.ri + 1) % g.route.length;
        const s = g.route[g.ri];
        g.path = this.pathTo(g.x, g.y, s.c, s.r); g.pi = 0;
    }

    followPath(g, speed) {
        if (g.pi >= g.path.length) { g.walking = false; return true; }
        const [px, py] = g.path[g.pi], dx = px - g.x, dy = py - g.y, d = Math.hypot(dx, dy), step = speed * DT;
        g.walking = true; g.walk += speed * DT;
        if (d <= step) {
            g.x = px; g.y = py; g.pi++;
            return g.pi >= g.path.length;
        }
        g.x += dx / d * step; g.y += dy / d * step;
        g.want = Math.atan2(dy, dx);
        return false;
    }

    // --- Vision ----------------------------------------------------------------------------------

    /** The vision mesh: rays that run along the rings, and bend around corners they graze instead of stopping dead. */
    cone(g) {
        if (g.coneAt === this.step_ || (g.cone && this.step_ - g.coneAt < 2)) return g.cone;
        g.coneAt = this.step_;
        const w = this.world, pts = (g.cone ??= new Float32Array(NR * (NS + 1) * 2));
        const widen = g.state === "chase" ? 1.15 : g.state === "curious" || g.state === "investigate" || g.state === "search" ? 1.08 : 1;
        const dir = this.lookDir(g), half = g.half * widen, range = g.range * (g.state === "chase" ? 1.2 : widen);
        const free = (x, y) => !(flagXY(w, x, y) & SIGHT);
        const clear = (x0, y0, x1, y1) => free(x0 + (x1 - x0) / 3, y0 + (y1 - y0) / 3) && free(x0 + (x1 - x0) * 2 / 3, y0 + (y1 - y0) * 2 / 3) && free(x1, y1);
        const ox = g.x + Math.cos(dir) * 5, oy = g.y + Math.sin(dir) * 5 - (g.kind === "cam" ? 0 : 4);
        for (let i = 0; i < NR; i++) {
            const base = dir - half + (2 * half * i) / (NR - 1), side = i < NR / 2 ? -1 : 1;
            let a = base, x = ox, y = oy, step = range / NS, bends = 0, stop = false;
            let k = i * (NS + 1) * 2;
            pts[k++] = x; pts[k++] = y;
            for (let j = 1; j <= NS; j++) {
                if (!stop) {
                    let nx = x + Math.cos(a) * step, ny = y + Math.sin(a) * step;
                    if (clear(x, y, nx, ny)) { x = nx; y = ny; }
                    else {
                        // Run up to the wall.
                        let lo = 0, hi = 1;
                        for (let b = 0; b < 4; b++) { const m = (lo + hi) / 2; if (clear(x, y, x + (nx - x) * m, y + (ny - y) * m)) lo = m; else hi = m; }
                        const cx = x + (nx - x) * lo, cy = y + (ny - y) * lo, rest = step * (1 - lo);
                        x = cx; y = cy;
                        let bent = false;
                        if (bends < 2) for (const amt of [0.42, 0.85]) {
                            for (const sgn of [side, -side]) {
                                const a2 = a + sgn * amt, sx = x + Math.cos(a2) * rest * 0.8, sy = y + Math.sin(a2) * rest * 0.8;
                                if (rest > 2 && clear(x, y, sx, sy)) { x = sx; y = sy; a = a2; bent = true; break; }
                            }
                            if (bent) break;
                        }
                        if (bent) { bends++; step *= 0.7; } else stop = true;
                    }
                    const d = wrap(base - a);
                    a += d > 0.32 ? 0.32 : d < -0.32 ? -0.32 : d;   // curl back towards the way they were looking
                }
                pts[k++] = x; pts[k++] = y;
            }
        }
        return pts;
    }

    lookDir(g) {
        if (g.kind === "cam") return g.base + g.sweep * Math.sin((TAU * (this.t + g.phase)) / g.period);
        const sway = g.state === "patrol" ? Math.sin(this.t * 1.1 + g.i * 2.1) * g.sway : 0;
        const sweep = g.state === "search" ? Math.sin(g.st * 2.3) * 0.75 : 0;
        return g.dir + sway + sweep;
    }

    /** Ring index (0 near, NS-1 far) if the point is inside the vision mesh, else -1. */
    inCone(g, x, y) {
        const dx = x - g.x, dy = y - g.y, reach = g.range * 1.4 + 12;
        if (dx * dx + dy * dy > reach * reach) return -1;
        const p = this.cone(g), stride = (NS + 1) * 2;
        for (let i = 0; i < NR - 1; i++) {
            const a = i * stride, b = a + stride;
            for (let j = 0; j < NS; j++) {
                const a0 = a + j * 2, b0 = b + j * 2;
                if (inTri(x, y, p[a0], p[a0 + 1], p[b0], p[b0 + 1], p[b0 + 2], p[b0 + 3]) || inTri(x, y, p[a0], p[a0 + 1], p[b0 + 2], p[b0 + 3], p[a0 + 2], p[a0 + 3])) return j;
            }
        }
        return -1;
    }

    blind(g) { return g.pose === "nap" || g.state === "aww" || g.kind === "dog" || g.state === "calm" || g.kind === "spot"; }

    /** Can this guard's mesh currently reach the cat at all? Returns the ring or -1. */
    watching(g) {
        const c = this.cat;
        if (c.mode === "vent" || c.mode === "absent") return -1;
        if (c.mode === "box" && !c.moved) return -1;
        if (flagXY(this.world, c.x, c.y) & HIGH) return -1;
        if (this.blind(g)) return -1;
        return this.inCone(g, c.x, c.y);
    }

    catLight() { return lightAt(this.world, this.cat.x, this.cat.y, this.snuffed); }

    sightRate(g, ring) {
        const c = this.cat;
        let lf = 0.1 + 0.9 * this.catLight();
        if (this.perks.coat) lf *= 0.55;
        const close = 1 - (ring / NS) * 2.4;            // torches find you up close, whatever the dark says
        if (close > lf) lf = close;
        const df = 1.2 - (0.8 * ring) / NS, post = c.mode === "box" ? 0.6 : c.running ? 1.4 : c.z ? 0.7 : 0.85;
        return g.keen * lf * df * post * 1.15;
    }

    // --- Noise -----------------------------------------------------------------------------------

    noise(x, y, radius, kind, amount = 0.34, loud = false) {
        const w = this.world, tile = Math.floor(y / T) * w.cols + Math.floor(x / T);
        if (!this.ghost) this.emit("noise", { x, y, radius, kind });
        if (tile < 0 || tile >= w.flags.length) return;
        const f = this.flow(tile, true);
        for (const g of this.guards) {
            if (g.kind === "cam" || g.kind === "spot" || g.state === "calm") continue;
            const i = Math.floor(g.y / T) * w.cols + Math.floor(g.x / T), steps = f[i];
            if (steps < 0) continue;
            const reach = radius * (g.pose === "nap" ? 0.6 : g.hear);
            if (steps * T > reach) continue;
            this.hear(g, x, y, amount, loud);
        }
    }

    hear(g, x, y, amount, loud) {
        if (g.state === "chase" || g.state === "aww") return;
        this.stats.heard++;
        if (g.kind === "dog") { g.growl = Math.min(1, g.growl + amount); return; }
        g.pose = "";
        g.s = Math.min(0.96, Math.max(g.s, 0.3) + amount);
        g.stim = { x, y };
        g.loud = loud;
        if (g.state === "patrol" || g.state === "giveup") this.setState(g, "curious");
        else if (g.state === "search" || g.state === "investigate") { if (loud) this.setState(g, "curious"); }
    }

    // --- Guards ----------------------------------------------------------------------------------

    setState(g, st) {
        if (g.state === st) return;
        const was = g.state;
        g.state = st; g.st = 0; g.walking = false;
        if (st === "curious") { this.stats.curious++; this.mark("curious", g.x, g.y); this.emit("guard", { g: g.i, say: g.loud ? "noise" : "huh" }); }
        if (st === "investigate") { this.emit("guard", { g: g.i, say: "check" }); this.repath(g, g.stim); }
        if (st === "search") { g.spots = null; this.emit("guard", { g: g.i, say: "search" }); }
        if (st === "giveup") this.emit("guard", { g: g.i, say: "giveup" });
        if (st === "chase") {
            if (was !== "chase") { this.stats.chases++; this.mark("spotted", g.x, g.y); this.emit("spotted", { g: g.i, say: "chase" }); }
            g.lost = 0; g.repath = 0;
        }
        if (st === "patrol") {
            g.pose = "";
            if (g.route.length) { const s = g.route[g.ri]; g.path = this.pathTo(g.x, g.y, s.c, s.r); g.pi = 0; g.wait = 0; }
        }
    }

    repath(g, at) { if (at) { g.path = this.pathTo(g.x, g.y, Math.floor(at.x / T), Math.floor(at.y / T)); g.pi = 0; } }

    updateGuard(g) {
        g.st += DT;
        if (this.cat.mode === "rub" && this.cat.rub.g === g.i) { g.walking = false; return; }   // stops dead, and looks down
        if (g.kind === "cam") return this.updateCam(g);
        if (g.kind === "spot") return this.updateSpot(g);
        if (g.kind === "dog") return this.updateDog(g);
        const c = this.cat, ring = this.watching(g);
        const seen = ring >= 0;
        if (seen) {
            this.stats.seenTime += DT;
            g.seen += DT;
            g.s = Math.min(1, g.s + this.sightRate(g, ring) * DT);
            g.stim = { x: c.x, y: c.y };
        }
        if (g.s > this.stats.peak) this.stats.peak = g.s;
        // A paw under a boot ends any stealth at once.
        if (c.mode !== "absent" && c.mode !== "vent" && c.z === 0 && c.mode !== "leap" && c.mode !== "box") {
            const d = Math.hypot(c.x - g.x, c.y - g.y);
            if (d < BUMP && g.state !== "chase" && g.state !== "aww" && g.pose !== "nap") { g.s = 1; g.stim = { x: c.x, y: c.y }; }
            if (g.sneezes && d < SNEEZE && g.state === "patrol" && g.st > 2.5) {
                g.st = 0; g.s = Math.max(g.s, 0.2); this.emit("guard", { g: g.i, say: "sneeze" }); this.emit("sneeze", { x: g.x, y: g.y });
            }
        }
        if (g.s >= 1 && g.state !== "chase" && g.state !== "aww") this.setState(g, "chase");
        switch (g.state) {
            case "patrol": this.patrol(g); if (g.s > 0.3) this.setState(g, "curious"); break;
            case "curious":
                if (g.stim) g.want = Math.atan2(g.stim.y - g.y, g.stim.x - g.x);
                if (!seen) g.s = Math.max(0, g.s - 0.16 * DT);
                if ((g.s > 0.62 && g.st > 0.5) || (g.loud && g.st > 0.75)) { g.loud = false; this.setState(g, "investigate"); }
                else if (g.s <= 0.16 && g.st > 1.4) { this.emit("guard", { g: g.i, say: "nothing" }); this.setState(g, "patrol"); }
                else if (g.st > 3.5 && !seen) this.setState(g, "patrol");
                break;
            case "investigate":
                if (!seen) g.s = Math.max(0.3, g.s - 0.03 * DT);
                if (seen && g.st > 0.3 && g.stim) { g.repath -= DT; if (g.repath <= 0) { this.repath(g, g.stim); g.repath = 0.4; } }
                if (this.followPath(g, g.speed * 1.08) || (g.st > 0.3 && !g.path.length)) this.setState(g, "search");
                break;
            case "search": {
                if (!seen) g.s = Math.max(0.15, g.s - 0.05 * DT);
                if (!g.spots) {
                    g.spots = []; const cx = Math.floor(g.x / T), cy = Math.floor(g.y / T);
                    for (let n = 0; n < 12 && g.spots.length < 3; n++) {
                        const a = this.rng.next() * TAU, rr = 2 + this.rng.next() * 2.5, tc = Math.round(cx + Math.cos(a) * rr), tr = Math.round(cy + Math.sin(a) * rr);
                        if (flagAt(this.world, tc, tr) & WALK) continue;
                        const p = this.pathTo(g.x, g.y, tc, tr);
                        if (p.length && p.length < 7) g.spots.push([tc, tr]);
                    }
                    g.path = []; g.pi = 0; g.wait = 0.9;
                }
                if (g.wait > 0) { g.wait -= DT; g.want = wrap(g.dir + 0.04); }
                else if (this.followPath(g, g.speed * 0.9) || !g.path.length) {
                    const n = g.spots.shift();
                    if (!n) { this.setState(g, "giveup"); break; }
                    g.path = this.pathTo(g.x, g.y, n[0], n[1]); g.pi = 0; g.wait = 0.8;
                }
                break;
            }
            case "giveup":
                g.s = Math.max(0, g.s - 0.5 * DT);
                if (g.st > 1.7) { g.s = 0; this.setState(g, "patrol"); }
                break;
            case "chase":
                if (seen) { g.lost = 0; g.repath -= DT; if (g.repath <= 0) { this.repath(g, c); g.repath = 0.25; } }
                else { g.lost += DT; }
                g.alert = 1;
                this.followPath(g, g.speed * 2.15);
                if (!g.path.length || g.pi >= g.path.length) { if (c.mode !== "absent" && g.lost < 0.5) { g.repath = 0; } }
                if (g.lost > 2.4) { g.s = 0.7; g.stim = g.stim ?? { x: g.x, y: g.y }; this.setState(g, "search"); }
                if (this.reach(g)) this.grab(g);
                break;
            case "aww":
                g.s = 0;
                if (g.st > 3.6) { this.setState(g, "patrol"); }
                break;
        }
        g.dir = approachAngle(g.dir, g.want, (g.state === "chase" ? 7 : 3.2) * DT);
    }

    reach(g) {
        const c = this.cat;
        if (c.mode === "vent" || c.mode === "leap") return false;
        const d = Math.hypot(c.x - g.x, c.y - g.y);
        if (flagXY(this.world, c.x, c.y) & HIGH) return false;
        return c.z ? d < 30 : d < 18;
    }

    patrol(g) {
        g.pose = "";
        if (!g.route.length) { if (g.dur) g.want = g.dir; return; }
        if (g.wait > 0) {
            g.wait -= DT; g.walking = false;
            const stop = g.route[g.ri];
            g.pose = stop.pose ?? "";
            if (stop.look) {
                const u = 1 - g.wait / Math.max(0.01, g.dur);
                g.want = stop.look[Math.min(stop.look.length - 1, Math.floor(u * stop.look.length))];
            }
            if (g.wait <= 0) this.nextLeg(g);
            return;
        }
        if (this.followPath(g, g.speed) || !g.path.length) {
            const s = g.route[g.ri];
            if (s.wait > 0) { g.wait = g.dur = s.wait; g.path = []; g.pi = 0; }
            else if (g.route.length > 1) this.nextLeg(g);
        }
    }

    updateCam(g) {
        const seen = this.watching(g) >= 0, c = this.cat;
        g.cd -= DT;
        if (seen && g.cd <= 0) {
            this.stats.seenTime += DT;
            g.s = Math.min(1, g.s + g.keen * (0.25 + 0.75 * this.catLight()) * DT * 1.2);
            if (g.s >= 1) {
                this.stats.alarms++; this.mark("alarm", c.x, c.y); this.emit("alarm", { x: g.x, y: g.y });
                this.noise(c.x, c.y, 16 * T, "alarm", 1, true); g.s = 0; g.cd = 6;
            }
        } else g.s = Math.max(0, g.s - 0.35 * DT);
        if (g.s > this.stats.peak) this.stats.peak = g.s;
    }

    updateSpot(g) {
        if (this.followPath(g, g.speed) || !g.path.length) this.nextLeg(g);
        const c = this.cat;
        if (c.mode === "absent" || c.mode === "vent" || (c.mode === "box" && !c.moved)) return;
        g.cd -= DT;
        if (Math.hypot(c.x - g.x, c.y - g.y) < g.rad - 4 && g.cd <= 0) {
            this.stats.seenTime += DT;
            g.s = Math.min(1, g.s + g.keen * DT);
            if (g.s >= 1) {
                this.stats.alarms++; this.mark("alarm", c.x, c.y); this.emit("alarm", { x: g.x, y: g.y });
                this.noise(c.x, c.y, 16 * T, "alarm", 1, true); g.s = 0; g.cd = 6;
            }
        } else g.s = Math.max(0, g.s - 0.4 * DT);
        if (g.s > this.stats.peak) this.stats.peak = g.s;
    }

    updateDog(g) {
        const c = this.cat;
        if (g.state === "calm") { g.walking = false; return; }
        if (g.state === "aww") { if (g.st > 3) this.setState(g, "patrol"); return; }
        const near = c.mode !== "absent" && c.mode !== "vent" && c.mode !== "leap" && !(c.mode === "box" && !c.moved) && !(flagXY(this.world, c.x, c.y) & HIGH);
        const d = near ? Math.hypot(c.x - g.x, c.y - g.y) : 1e9;
        const smelled = d < NOSE && this.los(g.x, g.y, c.x, c.y);
        if (g.state === "patrol") {
            if (smelled) { g.growl = Math.min(1, g.growl + DT / 1.5); this.stats.seenTime += DT; if (!g.sniffed) { g.sniffed = 1; this.mark("curious", g.x, g.y); this.stats.curious++; this.emit("guard", { g: g.i, say: "sniff" }); } }
            else { g.growl = Math.max(0, g.growl - DT * 0.4); if (g.growl <= 0) g.sniffed = 0; }
            if (g.growl >= 1) {
                g.state = "bark"; g.st = 0; this.stats.chases++; this.mark("spotted", g.x, g.y); this.emit("bark", { g: g.i, x: g.x, y: g.y, say: "bark" });
                this.noise(g.x, g.y, 10 * T, "bark", 1, true);
            } else {
                g.s = g.growl;
                if (g.follow >= 0) this.heel(g); else this.patrol(g);
                if (smelled) g.want = Math.atan2(c.y - g.y, c.x - g.x);
            }
        } else if (g.state === "bark") {
            g.s = 1; g.walking = false;
            g.want = Math.atan2(c.y - g.y, c.x - g.x);
            if (g.st > 0.9) { g.state = "chase"; g.st = 0; g.repath = 0; }
        } else if (g.state === "chase") {
            g.s = 1; g.repath -= DT;
            if (g.repath <= 0) { this.repath(g, c); g.repath = 0.3; }
            this.followPath(g, 148);
            if (near && d < 17 && c.z === 0) this.grab(g);
            if (g.st > 6 || !near && g.st > 2) { g.growl = 0; g.s = 0; g.state = "patrol"; g.st = 0; g.sniffed = 0; if (g.route.length) { const s = g.route[g.ri]; g.path = this.pathTo(g.x, g.y, s.c, s.r); g.pi = 0; g.wait = 0; } }
        }
        g.dir = approachAngle(g.dir, g.want, 5 * DT);
    }

    heel(g) {
        const h = this.guards[g.follow];
        if (!h || h.state === "aww") { g.walking = false; return; }
        const tx = h.x - Math.cos(h.dir) * 26 + Math.sin(h.dir) * 10, ty = h.y - Math.sin(h.dir) * 26 - Math.cos(h.dir) * 10;
        const dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy);
        if (d > 6) {
            const v = Math.min(d, h.speed * 1.5 * DT), nx = g.x + dx / d * v, ny = g.y + dy / d * v;
            if (!(flagXY(this.world, nx, ny) & WALK)) { g.x = nx; g.y = ny; }
            else if (!(flagXY(this.world, nx, g.y) & WALK)) g.x = nx;
            else if (!(flagXY(this.world, g.x, ny) & WALK)) g.y = ny;
            g.walking = true; g.walk += v; g.want = Math.atan2(dy, dx);
        } else { g.walking = false; g.want = h.dir; }
    }

    los(x0, y0, x1, y1) {
        const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 8);
        for (let i = 1; i < n; i++) if (flagXY(this.world, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n) & SIGHT) return false;
        return true;
    }

    grab(g) {
        const c = this.cat;
        if (this.status !== "play") return;
        if (c.lives > 0) {
            c.lives--; this.stats.escapes++;
            this.emit("wriggle", { x: c.x, y: c.y, g: g.i });
            if (g.kind === "guard") { g.s = 0.6; g.stim = { x: g.x, y: g.y }; this.setState(g, "search"); g.wait = 2.2; } else { g.state = "aww"; g.st = 0; }
            return;
        }
        if (c.mode === "box") this.leaveBox();
        this.status = "caught"; this.catcher = g.i; this.mark("caught", c.x, c.y);
        c.mode = "caught";
        this.emit("caught", { g: g.i });
    }

    // --- The cat ---------------------------------------------------------------------------------

    moveTry(x, y) {
        const w = this.world, c = this.cat, r = 7;
        if (c.mode === "perch") return !!(flagXY(w, x, y) & PERCH);
        return !(flagXY(w, x - r, y - r) & WALK) && !(flagXY(w, x + r, y - r) & WALK) && !(flagXY(w, x - r, y + r) & WALK) && !(flagXY(w, x + r, y + r) & WALK);
    }

    /** Where a leap in this direction lands, or null. Used by the cat, the bubble and the solver. */
    findLeap(x, y, dx, dy, z) {
        const w = this.world, reach = this.perks.spring ? 118 : 86;
        const tile = (px, py) => [Math.floor(px / T), Math.floor(py / T)];
        const [c0, r0] = tile(x, y);
        if (!z) {
            for (let s = 8; s <= 40; s += 6) {
                const [c, r] = tile(x + dx * s, y + dy * s), f = flagAt(w, c, r);
                if (f & PERCH) return { x: (c + 0.5) * T, y: (r + 0.5) * T, z: f & HIGH ? 2 : 1, kind: "up" };
                if (f & WALK) return null;
            }
            return null;
        }
        let floor = null;
        for (let s = 6; s <= reach; s += 5) {
            const [c, r] = tile(x + dx * s, y + dy * s);
            if (c === c0 && r === r0) continue;
            const f = flagAt(w, c, r);
            if (f & PERCH) {
                if (!floor) return null;
                return { x: (c + 0.5) * T, y: (r + 0.5) * T, z: f & HIGH ? 2 : 1, kind: "across" };
            }
            if (f & WALK) break;
            if (!floor) floor = { x: (c + 0.5) * T, y: (r + 0.5) * T, z: 0, kind: "down" };
        }
        return floor;
    }

    startLeap(L) {
        const c = this.cat, d = Math.hypot(L.x - c.x, L.y - c.y);
        c.leap = { x0: c.x, y0: c.y, x1: L.x, y1: L.y, z0: c.z, z1: L.z, t: 0, dur: 0.2 + d / 340, kind: L.kind, run: c.running };
        c.mode = "leap"; c.push = 0; c.vx = c.vy = 0;
        c.dir = Math.atan2(L.y - c.y, L.x - c.x);
        this.stats.leaps++;
        this.emit("leap", { kind: L.kind });
    }

    /** What a tap would do right now. */
    context() {
        const c = this.cat;
        if (this.status !== "play") return null;
        if (c.mode === "box") return { type: "unbox" };
        if (c.mode !== "ground" && c.mode !== "perch") return null;
        if (c.mode === "ground") {
            for (let i = 0; i < this.world.vents.length; i++) {
                const v = this.world.vents[i];
                if (Math.hypot(v.x - c.x, v.y - c.y) < 21) return { type: "vent", i, x: v.x, y: v.y };
            }
            for (const b of this.boxes) if (Math.hypot(b.x - c.x, b.y - c.y) < 25) return { type: "box", b: b.i, x: b.x, y: b.y };
            for (const g of this.guards) {
                if (g.kind === "cam" || g.kind === "spot" || g.state === "calm" || g.state === "aww" || g.state === "chase") continue;
                const d = Math.hypot(g.x - c.x, g.y - c.y);
                if (d > 32) continue;
                if (g.kind === "dog") return { type: "rub", g: g.i, x: g.x, y: g.y };
                const toCat = Math.atan2(c.y - g.y, c.x - g.x);
                if (Math.abs(wrap(toCat - this.lookDir(g))) > 1.1 || g.pose === "nap") return { type: "rub", g: g.i, x: g.x, y: g.y };
            }
        }
        let best = null, bd = 1e9;
        for (const it of this.items) {
            if (it.state !== "still") continue;
            const d = Math.hypot(it.x - c.x, it.y - c.y), high = flagXY(this.world, it.x, it.y) & HIGH;
            if (c.mode === "ground" && (high || d > 34)) continue;
            if (c.mode === "perch" && d > 40) continue;
            if (d < bd) { bd = d; best = it; }
        }
        if (best) return { type: "knock", item: best.i, x: best.x, y: best.y };
        const L = this.findLeap(c.x, c.y, Math.cos(c.dir), Math.sin(c.dir), c.z);
        if (L) return { type: "leap", x: L.x, y: L.y, kind: L.kind };
        if (c.yarn) return { type: "yarn" };
        if (c.flat && c.mode === "ground") return { type: "flatbox" };
        return { type: "mew" };
    }

    act() {
        const ctx = this.context(), c = this.cat;
        if (!ctx) return;
        switch (ctx.type) {
            case "unbox": this.leaveBox(); break;
            case "vent": {
                const v = this.world.vents[ctx.i], o = this.world.vents[v.to], d = Math.hypot(o.x - v.x, o.y - v.y);
                c.vent = { x0: v.x, y0: v.y, x1: o.x, y1: o.y, t: 0, dur: 0.4 + d / 240 };
                c.mode = "vent"; c.x = v.x; c.y = v.y; c.vx = c.vy = 0; this.stats.vents++;
                this.emit("vent", { x: v.x, y: v.y });
                break;
            }
            case "box": {
                const b = this.boxes[ctx.b];
                c.box = b; c.mode = "box"; c.x = b.x; c.y = b.y; c.vx = c.vy = 0; this.stats.boxes++;
                this.emit("box", { x: b.x, y: b.y, in: true });
                break;
            }
            case "rub": {
                const g = this.guards[ctx.g];
                c.rub = { g: g.i, t: 0 }; c.mode = "rub"; c.vx = c.vy = 0;
                c.dir = Math.atan2(g.y - c.y, g.x - c.x);
                this.emit("rub", { g: g.i });
                break;
            }
            case "knock": {
                const it = this.items[ctx.item];
                this.tip(it);
                c.tip = 0.5; c.mode = "tip"; c.vx = c.vy = 0; c.dir = Math.atan2(it.y - c.y, it.x - c.x);
                break;
            }
            case "leap": this.startLeap(this.findLeap(c.x, c.y, Math.cos(c.dir), Math.sin(c.dir), c.z)); break;
            case "mew":       // nothing to do, so he says so, out loud, in a museum
                if (this.t - (c.mewT ?? -9) > 0.7) { c.mewT = this.t; this.emit("mew", { x: c.x, y: c.y }); this.noise(c.x, c.y, 3.6 * T, "mew", 0.3); }
                break;
            case "yarn": {
                c.yarn--; this.yarn = { x: c.x, y: c.y, vx: Math.cos(c.dir) * 190, vy: Math.sin(c.dir) * 190, t: 0, done: false, spin: 0 };
                this.emit("yarn", {});
                break;
            }
            case "flatbox": {
                c.flat--;
                const b = { x: c.x, y: c.y, i: this.boxes.length };
                this.boxes.push(b); c.box = b; c.mode = "box"; this.stats.boxes++;
                this.emit("box", { x: b.x, y: b.y, in: true, fresh: true });
                break;
            }
        }
    }

    leaveBox() {
        const c = this.cat;
        c.box = null; c.mode = "ground";
        this.emit("box", { x: c.x, y: c.y, in: false });
    }

    tip(it) {
        const w = this.world, c = this.cat;
        let dx = it.x - c.x, dy = it.y - c.y;
        if (Math.abs(dx) + Math.abs(dy) < 4) { dx = Math.cos(c.dir); dy = Math.sin(c.dir); }
        const tc = Math.floor(it.x / T), tr = Math.floor(it.y / T);
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => !(flagAt(w, tc + a, tr + b) & WALK)).sort((p, q) => (q[0] * dx + q[1] * dy) - (p[0] * dx + p[1] * dy));
        const o = opts[0] ?? [0, 1];
        it.state = "tipping"; it.t = 0;
        it.fx = (tc + o[0] + 0.5) * T; it.fy = (tr + o[1] + 0.5) * T;
        if (opts.length === 0) { it.fx = it.x; it.fy = it.y; }
        it.side = o[0] || (dx >= 0 ? 1 : -1);
        this.emit("tip", { item: it.i });
    }

    updateItems() {
        for (const it of this.items) {
            if (it.state === "tipping") {
                it.t += DT;
                if (it.t >= 1.05) { it.state = "falling"; it.t = 0; this.emit("drop", { item: it.i }); }
            } else if (it.state === "falling") {
                it.t += DT;
                if (it.t >= 0.34) {
                    it.state = "broken"; this.stats.smashed++; this.mark("smash", it.fx, it.fy);
                    this.shards.push({ x: it.fx, y: it.fy, kind: it.kind, seed: it.i * 7 + 3 });
                    if (it.kind === "lamp") { this.snuffed[it.lamp] = 1; this.emit("snuff", { lamp: it.lamp }); }
                    this.emit("smash", { x: it.fx, y: it.fy, kind: it.kind });
                    this.noise(it.fx, it.fy, 9 * T, "smash", 0.5, true);
                }
            }
        }
        const y = this.yarn;
        if (y && !y.done) {
            y.t += DT;
            const f = Math.max(0, 1 - y.t / 1.3), nx = y.x + y.vx * f * DT, ny = y.y + y.vy * f * DT;
            if (flagXY(this.world, nx, y.y) & WALK) y.vx = -y.vx * 0.6; else y.x = nx;
            if (flagXY(this.world, y.x, ny) & WALK) y.vy = -y.vy * 0.6; else y.y = ny;
            y.spin += Math.hypot(y.vx, y.vy) * f * DT * 0.1;
            if (y.t > 1.3) { y.done = true; this.noise(y.x, y.y, 7 * T, "yarn", 0.5, true); }
        }
    }

    updateCat(inp) {
        const c = this.cat, w = this.world;
        if (c.mode === "absent" || c.mode === "caught" || c.mode === "escaped") return;
        c.moved = false;
        let mx = inp.mx ?? 0, my = inp.my ?? 0;
        const mag = Math.min(1, Math.hypot(mx, my));
        if (mag > 0.001) { const l = Math.hypot(mx, my); mx /= l; my /= l; }
        if (inp.act) this.act();
        if (c.mode === "leap") {
            const L = c.leap;
            L.t += DT;
            const u = Math.min(1, L.t / L.dur);
            c.x = L.x0 + (L.x1 - L.x0) * u; c.y = L.y0 + (L.y1 - L.y0) * u;
            c.z = u < 0.5 ? L.z0 : L.z1;
            if (u >= 1) {
                c.mode = L.z1 ? "perch" : "ground"; c.leap = null;
                this.emit("land", { z0: L.z0, z1: L.z1, x: c.x, y: c.y });
                if (!L.z1 && L.run) this.noise(c.x, c.y, (this.perks.velvet ? 0.6 : 1) * 2.2 * T, "land", 0.3);
                this.checkTile();
            }
            return;
        }
        if (c.mode === "vent") {
            const v = c.vent;
            v.t += DT;
            const u = Math.min(1, v.t / v.dur);
            c.x = v.x0 + (v.x1 - v.x0) * u; c.y = v.y0 + (v.y1 - v.y0) * u;
            if (u >= 1) { c.mode = "ground"; c.vent = null; this.emit("ventout", { x: c.x, y: c.y }); }
            return;
        }
        if (c.mode === "tip") { c.tip -= DT; if (c.tip <= 0) c.mode = c.z ? "perch" : "ground"; return; }
        if (c.mode === "rub") {
            const R = c.rub, g = this.guards[R.g];
            R.t += DT;
            c.x += Math.cos(R.t * 9) * 0.5;
            if (R.t > 0.95) {
                c.mode = "ground"; c.rub = null; this.stats.rubs++;
                if (g.kind === "dog") { g.state = "calm"; g.st = 0; g.s = 0; g.growl = 0; g.walking = false; this.stats.dogs++; this.emit("calm", { g: g.i }); this.mark("rub", g.x, g.y); }
                else {
                    g.pose = ""; this.setState(g, "aww"); this.mark("rub", g.x, g.y); this.emit("aww", { g: g.i, say: "aww" });
                    for (const d of this.guards) if (d.kind === "dog" && d.follow === g.i && d.state !== "calm") { d.state = "calm"; d.st = 0; d.s = 0; d.growl = 0; d.walking = false; this.stats.dogs++; this.emit("calm", { g: d.i }); }
                }
            }
            return;
        }
        const box = c.mode === "box";
        const running = !box && mag > RUN_AT;
        c.running = running;
        const top = box ? BOX_SPEED : running ? RUN : SLINK * Math.min(1, 0.45 + mag * 0.8);
        const tx = mx * (mag > 0.08 ? top : 0), ty = my * (mag > 0.08 ? top : 0), k = 1 - Math.exp(-DT * (mag > 0.08 ? 16 : 22));
        c.vx += (tx - c.vx) * k; c.vy += (ty - c.vy) * k;
        const nx = c.x + c.vx * DT, ny = c.y + c.vy * DT;
        let blocked = false;
        if (this.moveTry(nx, c.y)) c.x = nx; else { if (Math.abs(mx) > 0.7) blocked = true; c.vx = 0; }
        if (this.moveTry(c.x, ny)) c.y = ny; else { if (Math.abs(my) > 0.7) blocked = true; c.vy = 0; }
        c.speed = Math.hypot(c.vx, c.vy);
        if (mag > 0.08) c.dir = approachAngle(c.dir, Math.atan2(my, mx), 13 * DT);
        c.moved = c.speed > 6;
        if (box) { c.box.x = c.x; c.box.y = c.y; if (c.moved) c.scuff = (c.scuff ?? 0) + DT; return; }
        c.z = c.mode === "perch" ? (flagXY(w, c.x, c.y) & HIGH ? 2 : 1) : 0;
        // Pushing against something a cat can jump on or off.
        if (blocked && mag > 0.2) {
            c.push += DT;
            if (c.push >= (running ? 0.05 : PUSH)) {
                const L = this.findLeap(c.x, c.y, mx, my, c.z);
                if (L) { this.startLeap(L); return; }
            }
        } else c.push = 0;
        if (running && c.speed > 60) {
            c.stepD += c.speed * DT;
            if (c.stepD > 50) {
                c.stepD = 0;
                const quiet = flagXY(w, c.x, c.y) & QUIET ? 0.55 : 1, r = (this.perks.velvet ? 0.5 : 1) * quiet * 3.4 * T;
                this.stats.noisy++;
                this.noise(c.x, c.y, r, "paw", 0.26);
            }
        }
        this.checkTile();
    }

    /** Things that happen because of where the cat stands. */
    checkTile() {
        const c = this.cat, w = this.world, tc = Math.floor(c.x / T), tr = Math.floor(c.y / T), i = tr * w.cols + tc;
        if (i !== c.lastTile) {
            c.lastTile = i;
            if (w.flags[i] & LOUD && c.z === 0) {
                this.stats.noisy++; this.mark("creak", c.x, c.y); this.emit("creak", { x: c.x, y: c.y });
                this.noise(c.x, c.y, (this.perks.velvet ? 0.6 : 1) * 4.5 * T, "creak", 0.34);
            }
        }
        if (!c.fish && tc === w.target.c && tr === w.target.r) { c.fish = true; this.mark("fish", c.x, c.y); this.emit("grab", { x: c.x, y: c.y }); }
        for (const l of this.loot) if (!l.got && l.c === tc && l.r === tr) { l.got = true; this.mark("loot", l.x, l.y); this.emit("loot", { i: l.i, x: l.x, y: l.y }); }
        if (c.fish && c.mode === "ground" && Math.hypot(c.x - w.start.x, c.y - w.start.y) < 13) {
            this.status = "won"; c.mode = "escaped"; this.emit("won", {}); this.mark("exit", c.x, c.y);
        }
    }

    updateLasers() {
        const c = this.cat;
        for (const l of this.lasers) {
            const cyc = (l.on ?? 1) + (l.off ?? 0), u = (this.t + (l.phase ?? 0)) % cyc;
            l.live = !l.off || u < (l.on ?? 1);
            l.cd -= DT;
            if (!l.live || c.mode === "absent" || c.mode === "vent" || c.mode === "leap" || c.z > 0 || l.cd > 0) continue;
            const minx = Math.min(l.x0, l.x1) - 6, maxx = Math.max(l.x0, l.x1) + 6, miny = Math.min(l.y0, l.y1) - 6, maxy = Math.max(l.y0, l.y1) + 6;
            if (c.x > minx && c.x < maxx && c.y > miny && c.y < maxy) {
                l.cd = 4; this.stats.lasers++; this.mark("alarm", c.x, c.y);
                this.emit("alarm", { x: c.x, y: c.y, laser: true });
                this.noise(c.x, c.y, 16 * T, "alarm", 1, true);
            }
        }
    }

    record() {
        if (this.ghost) return;
        const c = this.cat, r = this.rec;
        r.cat.push(Math.round(c.x), Math.round(c.y), c.mode === "vent" ? 1 : c.mode === "box" ? 2 : 0);
        r.guards.push(this.guards.map((g) => [Math.round(g.x), Math.round(g.y), +this.lookDir(g).toFixed(2), g.state === "chase" ? 2 : g.state === "patrol" ? 0 : 1]));
    }

    /** One fixed step. inp: { mx, my, act }. */
    step(inp = {}) {
        if (this.status !== "play") return;
        this.t += DT; this.step_++;
        this.updateCat(inp);
        for (const g of this.guards) { if (this.status === "play") this.updateGuard(g); }
        this.updateItems();
        this.updateLasers();
        let al = 0;
        for (const g of this.guards) if (g.state === "chase" || g.state === "bark") al = 1;
        this.alert = al;
        if (this.step_ % 12 === 0) this.record();
    }

    /** The highest suspicion on the map, 0 to 1. Drives the heartbeat. */
    tension() {
        let s = 0;
        for (const g of this.guards) if (g.state !== "calm" && g.s > s) s = g.s;
        return s;
    }

    /** Copy of the moving parts, for planners. */
    clone(ghost = false) {
        const o = Object.create(Sim.prototype);
        Object.assign(o, this);
        o.rng = new Rng(this.rng.s);
        o.ghost = ghost; o.events = []; o.rec = { guards: [], cat: [], marks: [] };
        for (const k of ["cat", "guards", "items", "loot", "boxes", "shards", "yarn", "lasers", "stats", "snuffed"]) o[k] = structuredClone(this[k]);
        if (ghost) o.cat.mode = "absent";
        if (o.cat.box) o.cat.box = o.boxes[o.cat.box.i];
        return o;
    }

    /** Heist result, once won. */
    grade() {
        const s = this.stats, got = this.loot.filter((l) => l.got).length, par = this.def.chaos ?? 3;
        const ghost = s.curious === 0 && s.chases === 0 && s.smashed === 0 && s.alarms === 0 && s.lasers === 0 && s.heard === 0;
        const chaos = s.smashed >= par;
        const style = ghost ? "GHOST" : chaos ? "CHAOS" : s.chases === 0 && s.alarms === 0 ? "SHADOW" : s.chases <= 1 ? "ALLEY CAT" : "SCOUNDREL";
        return { ghost, chaos, style, got, total: this.loot.length, time: this.t, ...s, par };
    }
}

function inTri(px, py, ax, ay, bx, by, cx, cy) {
    const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
    const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
    const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
    if (d1 === 0 && d2 === 0 && d3 === 0) return false;     // a ray that stopped at a wall leaves collapsed triangles
    return !(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0)));
}
