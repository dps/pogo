// HIBERNOOK: winter is coming, and everyone needs a warm spot in the burrow.
// Drop sleepy creatures into the old stump. Two the same snuggle up into the next, bigger neighbour.
// Let the pile reach the draught line and the cold gets in. The twist: the higher you dare to let the
// pile climb, the more every snuggle scores, so you are always choosing between safe and greedy.
//
// Physics is the Pile class below, not Pogo's body(): it was written for platformers and can't stack.
// All of the art is computed in art.js.
import { createGame, pin, text, tap, ui, pos } from "./pogo.js";
import { SPECIES, SNOWBALL, ACORN, FX, paintEverything } from "./art.js";

const FONT = '"Arial Rounded MT Bold","SF Pro Rounded",ui-rounded,"Nunito","Varela Round",system-ui,-apple-system,Roboto,sans-serif';
const TIERS = SPECIES.length, SAVE = "hibernook1";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 680, height: 390 } },
    background: ["#131a44", "#8d78c2"],
    touch: {},
    actions: { snore: ["KeyZ", "KeyC", "pad:x"], drop: ["Enter"] },
    seed: 7,
    maxDpr: 2.5,
});

// --- Tuning ----------------------------------------------------------------------------------------
export const WORLD = { W: 300, H: 395, wall: 15, rim: 12, top: -92, dropY: -50 };
export const RADII = [14, 18, 22.5, 27.5, 33, 39.5, 46, 53, 60.5, 69, 78, 87];
const MAX_SEP = 14, ITERS = 3, massOf = (r) => r ** 1.6 * 0.01;
const G = 1500, SUB = 4, MAX_SPEED = 900, MU = 0.34, MU_FLOOR = 0.45, MU_WALL = 0.1, BOUNCE = 0.14;
const SLEEP_SPEED = 7, SLEEP_FRAMES = 18, WAKE_SPEED = 26;
const DROP_COOLDOWN = 0.5, CHAIN_WINDOW = 1.2, CHAIN_FRAMES = 110, OVER_LIMIT = 2.4, SNORE_MAX = 3;
const SPAWN = [30, 26, 22, 16, 6];
const DARE = [{ top: 215, mult: 1, name: "Snug" }, { top: 135, mult: 1.5, name: "Chilly" }, { top: 70, mult: 2, name: "Nippy" }, { top: -1e9, mult: 3, name: "Brrr!" }];
export const dareAt = (top) => DARE.findIndex((d) => top >= d.top);
const mergePoints = (t) => (t + 1) * (t + 2);   // points for making tier t + 1

function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
        a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// --- The solver ------------------------------------------------------------------------------------
// Small-step position-based dynamics. Each substep integrates, pushes overlapping circles apart with
// mass weighting (so velocities come out of the corrected positions and can't explode), then applies
// restitution and Coulomb friction with real disc inertia, which is what makes things roll. Resting
// bodies go to sleep, so a settled pile costs nothing and cannot jitter.
export class Pile {
    constructor(world, seed, opts = {}) {
        this.w = world;
        this.rand = mulberry(seed);
        this.bodies = [];
        this.pairs = [];
        this.time = 0;
        this.nextId = 1;
        this.noMerge = !!opts.noMerge;
        this.events = [];
        this.score = 0;
        this.chain = 0; this.chainT = 0;
        this.top = world.H;
        this.dare = 0; this.dareHold = 0;
        this.over = false; this.danger = 0;
        this.grace = 0; this.magnet = 0;
        this.snores = 1; this.drops = 0; this.merges = 0; this.springs = 0; this.bestChain = 0; this.highest = -1;
        this.made = new Array(TIERS).fill(0);
        this.steps = 0;
        this.acornDue = 22 + Math.floor(this.rand() * 12);
        this.snowDue = 90;
        this.queue = [this.roll(), this.roll()];
        this.aim = world.W / 2;
        this.cool = 0;
        this.wantDrop = false;
    }
    roll() {
        const n = this.drops ?? 0;
        if (n >= this.acornDue) {
            this.acornDue = n + 26 + Math.floor(this.rand() * 18);
            return "acorn";
        }
        if (n >= this.snowDue) {
            this.snowDue = n + Math.max(11, 26 - Math.floor(n / 25)) + Math.floor(this.rand() * 9);
            return "snow";
        }
        // Small pieces early, then the odd bigger one as the burrow fills.
        const w = SPAWN.slice();
        let sum = 0;
        for (const v of w) sum += v;
        let r = this.rand() * sum, i = 0;
        while (r > w[i]) r -= w[i++];
        return i;
    }
    get held() { return this.queue[0]; }
    get next() { return this.queue[1]; }
    pieceRadius(q) { return q === "acorn" ? 20 : q === "snow" ? this.snowRadius() : RADII[q]; }
    snowRadius() { return Math.min(40, 24 + this.drops * 0.05); }
    get canDrop() { return this.cool <= 0 && !this.over; }

    add(kind, t, x, y, r, vx = 0, vy = 0) {
        const m = massOf(r);
        const b = {
            id: this.nextId++, kind, t, x, y, px: x, py: y, lx: x, ly: y, vx, vy, ux: 0, uy: 0, ang: (this.rand() - 0.5) * 0.3, spin: 0, r, rr: r, m, im: 1 / m,
            sleep: false, still: 0, age: 0, over: 0, madeAt: -1e9, link: 0, dead: false, hp: 2, touching: false, landed: false,
            // cosmetics, never read by the physics
            q: 0, qv: 0, blink: 1 + this.rand() * 3, shut: 0, happy: 0, doze: 0, tilt: (this.rand() - 0.5) * 0.36, peek: this.rand() * 8, seed: this.rand() * 100, awake: this.rand() < 0.3,
        };
        this.bodies.push(b);
        return b;
    }
    wakeAll() { for (const b of this.bodies) { b.sleep = false; b.still = 0; } }

    /** Release the held piece at the aim. */
    drop() {
        if (!this.canDrop) return null;
        const q = this.queue.shift(), r = this.pieceRadius(q), x = Math.max(r, Math.min(this.w.W - r, this.aim));
        const b = q === "acorn" ? this.add("acorn", -1, x, this.w.dropY, r, 0, 90)
            : q === "snow" ? this.add("snow", -2, x, this.w.dropY, r, 0, 90)
                : this.add("c", q, x, this.w.dropY, r, 0, 90);
        this.drops++;
        this.queue.push(this.roll());
        this.cool = DROP_COOLDOWN;
        this.events.push({ type: "drop", b });
        return b;
    }

    /** The Big Snore: everyone is jolted awake, and like drifts towards like. */
    snore() {
        if (this.snores <= 0 || this.over) return false;
        this.snores--;
        this.grace = 3.4;
        this.magnet = 1.5;
        this.wakeAll();
        for (const b of this.bodies) {
            const small = 1 - b.r / 110;
            b.vy -= 150 + 230 * small * this.rand();
            b.vx += (this.rand() - 0.5) * 130 * small;
            b.spin += (this.rand() - 0.5) * 8;
            b.over = 0;
        }
        this.events.push({ type: "snore" });
        return true;
    }

    broadphase() {
        const list = this.bodies, n = list.length;
        for (let i = 1; i < n; i++) {   // nearly sorted from last time, so insertion sort is O(n)
            const b = list[i], key = b.x - b.r;
            let j = i - 1;
            while (j >= 0 && list[j].x - list[j].r > key) { list[j + 1] = list[j]; j--; }
            list[j + 1] = b;
        }
        const pairs = this.pairs, margin = 16;
        pairs.length = 0;
        for (let i = 0; i < n; i++) {
            const a = list[i], reach = a.x + a.r + margin;
            for (let j = i + 1; j < n; j++) {
                const b = list[j];
                if (b.x - b.r > reach) break;
                if (a.sleep && b.sleep) continue;
                const R = a.r + b.r + margin, dy = a.y - b.y;
                if (dy < R && dy > -R) pairs.push(a, b);
            }
        }
    }

    substep(h) {
        const list = this.bodies, pairs = this.pairs, { W, H } = this.w, np = pairs.length, ih = 1 / h;
        for (let i = 0; i < list.length; i++) {
            const b = list[i];
            b.touching = false;
            if (b.sleep) { b.px = b.x; b.py = b.y; b.ux = b.uy = 0; b.vx = b.vy = 0; continue; }
            b.vy += G * h;
            const s2 = b.vx * b.vx + b.vy * b.vy;
            if (s2 > MAX_SPEED * MAX_SPEED) { const k = MAX_SPEED / Math.sqrt(s2); b.vx *= k; b.vy *= k; }
            b.ux = b.vx; b.uy = b.vy;
            b.px = b.x; b.py = b.y;
            b.x += b.vx * h; b.y += b.vy * h;
            b.ang += b.spin * h;
        }
        for (let it = 0; it < ITERS; it++) {
            for (let i = 0; i < np; i += 2) {
                const a = pairs[i], b = pairs[i + 1], dx = b.x - a.x, dy = b.y - a.y, R = a.r + b.r, d2 = dx * dx + dy * dy;
                if (d2 >= R * R) continue;
                const wa = a.sleep ? 0 : a.im, wb = b.sleep ? 0 : b.im, sum = wa + wb;
                if (sum === 0) continue;
                const d = Math.sqrt(d2) || 1e-4, pen = R - d, nx = dx / d, ny = dy / d;
                const c = (pen > 1.6 ? 1.6 : pen) * 0.9 / sum, ax = nx * c * wa, ay = ny * c * wa, bx = nx * c * wb, by = ny * c * wb;
                a.x -= ax; a.y -= ay;
                b.x += bx; b.y += by;
            }
            for (let i = 0; i < list.length; i++) {
                const b = list[i];
                if (b.sleep) continue;
                if (b.x < b.r) b.x = b.r; else if (b.x > W - b.r) b.x = W - b.r;
                if (b.y > H - b.r) b.y = H - b.r;
            }
        }
        for (let i = 0; i < list.length; i++) {
            const b = list[i];
            if (b.sleep) continue;
            b.vx = (b.x - b.px) * ih; b.vy = (b.y - b.py) * ih;
        }
        for (let i = 0; i < np; i += 2) {
            const a = pairs[i], b = pairs[i + 1], dx = b.x - a.x, dy = b.y - a.y, R = a.r + b.r + 0.05, d2 = dx * dx + dy * dy;
            if (d2 >= R * R) continue;
            const wa = a.sleep ? 0 : a.im, wb = b.sleep ? 0 : b.im, sum = wa + wb;
            a.touching = b.touching = true;
            if (sum === 0) continue;
            const d = Math.sqrt(d2) || 1e-4, nx = dx / d, ny = dy / d, tx = -ny, ty = nx;
            // bounce, based on how fast they met before position correction ate the velocity
            const un = (b.ux - a.ux) * nx + (b.uy - a.uy) * ny;
            let jn = 0;
            // Pushing overlaps apart must not launch anything: a contact may only separate as fast as the
            // bodies were already separating. This is what stops a squeezed pile exploding when it wakes.
            const sep = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny, limit = un > MAX_SEP ? un : MAX_SEP;
            if (sep > limit) {
                const j = (sep - limit) / sum;
                a.vx += nx * j * wa; a.vy += ny * j * wa;
                b.vx -= nx * j * wb; b.vy -= ny * j * wb;
            }
            if (un < -55) {
                const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny, want = -BOUNCE * un;
                jn = Math.max(0, (want - vn) / sum);
                a.vx -= nx * jn * wa; a.vy -= ny * jn * wa;
                b.vx += nx * jn * wb; b.vy += ny * jn * wb;
                if (un < -150 && (!a.landed || !b.landed)) {
                    const faller = a.landed ? b : a, other = faller === a ? b : a;
                    faller.landed = true;
                    this.events.push({ type: "land", b: faller, other, speed: -un });
                }
            }
            // friction with spin; the limit comes from the pressure of the contact (weight of a disc)
            const pressure = Math.max(jn, (1 / sum) * G * h * 1.1);
            const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty - (a.spin * a.r + b.spin * b.r);
            const K = 3 * sum;
            let jt = -vt / K;
            const lim = MU * pressure;
            if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
            a.vx -= tx * jt * wa; a.vy -= ty * jt * wa;
            b.vx += tx * jt * wb; b.vy += ty * jt * wb;
            a.spin -= 2 * jt * wa / a.r * 1; b.spin -= 2 * jt * wb / b.r * 1;
        }
        for (let i = 0; i < list.length; i++) {
            const b = list[i];
            if (b.sleep) continue;
            if (b.y >= H - b.r - 0.02) {  // floor
                if (b.uy > 160 && !b.landed) { b.landed = true; this.events.push({ type: "land", b, speed: b.uy }); }
                if (b.uy > 90) b.vy = -b.uy * BOUNCE;
                const vt = b.vx - b.spin * b.r, jt = Math.max(-MU_FLOOR * G * h, Math.min(MU_FLOOR * G * h, -vt / 3));
                b.vx += jt; b.spin -= 2 * jt / b.r;
                b.touching = true;
            }
            if (b.x <= b.r + 0.02 || b.x >= W - b.r - 0.02) {  // walls barely grip
                const sign = b.x < W / 2 ? 1 : -1, vt = b.vy + sign * b.spin * b.r, lim = MU_WALL * 240 * h;
                b.vy += Math.max(-lim, Math.min(lim, -vt / 3));
                b.touching = true;
            }
            b.spin *= b.touching ? 0.985 : 0.9995;
            const damp = b.touching ? 0.992 : 0.9997;  // settled contacts lose energy quickly; long columns stop breathing
            b.vx *= damp; b.vy *= damp;
        }
    }

    step(dt) {
        if (this.over) { this.cosmetics(dt); return; }
        this.steps++;
        this.time += dt;
        const list = this.bodies;
        for (const b of list) { b.lx = b.x; b.ly = b.y; }
        if (this.cool > 0) this.cool -= dt;
        if (this.grace > 0) this.grace -= dt;
        if (this.chainT > 0) { this.chainT -= dt; if (this.chainT <= 0) { this.chain = 0; } }

        // Growth after a snuggle: inflate over a few frames so neighbours get shouldered aside, not fired out.
        for (const b of list) if (b.r < b.rr) { b.r = Math.min(b.rr, b.r + b.rr * 0.022); b.m = massOf(b.r); b.im = 1 / b.m; b.sleep = false; b.still = 0; }
        if (this.magnet > 0) this.pull(dt);

        this.broadphase();
        const h = dt / SUB;
        for (let i = 0; i < SUB; i++) this.substep(h);

        // Wake sleepers that something real has hit, then count down to sleep.
        const pairs = this.pairs;
        for (let i = 0; i < pairs.length; i += 2) {
            const a = pairs[i], b = pairs[i + 1];
            if (a.sleep === b.sleep) continue;
            const s = a.sleep ? a : b, o = a.sleep ? b : a, dx = o.x - s.x, dy = o.y - s.y, R = o.r + s.r + 0.3;
            if (dx * dx + dy * dy < R * R && o.vx * o.vx + o.vy * o.vy > WAKE_SPEED * WAKE_SPEED) { s.sleep = false; s.still = 0; }
        }
        for (const b of list) {
            b.age++;
            if (b.touching) b.landed = true;
            if (b.sleep) continue;
            const slow = b.vx * b.vx + b.vy * b.vy < SLEEP_SPEED * SLEEP_SPEED && Math.abs(b.spin) < 0.6 && b.r >= b.rr;
            b.still = slow ? b.still + 1 : 0;
            if (b.still > SLEEP_FRAMES && b.touching) { b.sleep = true; b.vx = b.vy = 0; b.spin = 0; }
        }
        if (!this.noMerge) this.merge();

        // The pile's height, ignoring anything still in the air.
        let top = this.w.H, danger = 0, dareTop = this.w.H;
        for (const b of list) {
            if (!b.landed || b.age < 40) continue;
            const t = b.y - b.r;
            if (t < top) top = t;
            if (t < dareTop && Math.abs(b.vy) < 120) dareTop = t;
            if (t < 0 && Math.abs(b.vy) < 200) {
                if (this.grace <= 0 && b.age > 60) b.over += dt;
            } else b.over = Math.max(0, b.over - dt * 2);
            if (b.over > danger) danger = b.over;
        }
        this.top = top;
        // Dare rises only once the pile has held that height for half a second; a bounce isn't a dare.
        const want = dareAt(dareTop);
        if (want <= this.dare) { this.dare = want; this.dareHold = 0; } else if (++this.dareHold > 30) { this.dare = want; this.dareHold = 0; }
        this.danger = danger / OVER_LIMIT;
        if (!this.noMerge && danger >= OVER_LIMIT) {
            this.over = true;
            this.events.push({ type: "over" });
        }
        this.cosmetics(dt);
    }

    /** During the Big Snore, identical neighbours lean towards each other. */
    pull(dt) {
        this.magnet -= dt;
        const list = this.bodies, n = list.length;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            const a = list[i], b = list[j];
            if (a.t !== b.t || a.kind !== "c" || b.kind !== "c") continue;
            const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, reach = 90 + a.r * 2.4;
            if (d > reach) continue;
            const f = 1500 * dt / d;
            a.vx += dx * f; a.vy += dy * f;
            b.vx -= dx * f; b.vy -= dy * f;
        }
    }

    merge() {
        const pairs = this.pairs;
        for (let i = 0; i < pairs.length; i += 2) {
            const a = pairs[i], b = pairs[i + 1];
            if (a.dead || b.dead) continue;
            const dx = b.x - a.x, dy = b.y - a.y, R = a.r + b.r + 0.8;
            if (dx * dx + dy * dy > R * R) continue;
            if (a.kind === "c" && b.kind === "c" && a.t === b.t) this.snuggle(a, b);
            else if (a.kind === "acorn" && b.kind === "c") this.snuggle(b, a);
            else if (b.kind === "acorn" && a.kind === "c") this.snuggle(a, b);
            else if ((a.kind === "acorn" && b.kind === "snow") || (b.kind === "acorn" && a.kind === "snow")) {
                const snow = a.kind === "snow" ? a : b, nut = snow === a ? b : a;
                nut.dead = true;
                this.melt(snow, nut.x, nut.y);
            }
        }
        if (this.bodies.some((b) => b.dead)) {
            this.bodies = this.bodies.filter((b) => !b.dead);
            this.wakeAll();
        }
    }

    snuggle(a, b) {
        a.dead = b.dead = true;
        this.merges++;
        // A chain is a true cascade: the creature made by one snuggle goes on to snuggle again.
        // Random pile-ups don't count, so the way to score is to line neighbours up, tier by tier.
        const link = (q) => (this.steps - q.madeAt < CHAIN_FRAMES ? q.link : 0);
        this.chain = Math.max(link(a), link(b)) + 1;
        this.chainT = this.chain > 1 ? 1.2 : 0;
        if (this.chain > this.bestChain) this.bestChain = this.chain;
        const t = a.t, mult = Math.min(this.chain, 6), dare = DARE[this.dare].mult;
        const x = (a.x * a.r + b.x * b.r) / (a.r + b.r), y = Math.max(a.y, b.y) * 0.5 + (a.y + b.y) * 0.25;
        if (t === TIERS - 1) {   // two Moon Bears yawn, and it is spring
            const pts = Math.round(3000 * mult * dare);
            this.score += pts;
            this.springs++;
            this.snores = Math.min(SNORE_MAX, this.snores + 2);
            this.events.push({ type: "spring", x, y, pts, a, b });
            return;
        }
        const pts = Math.round(mergePoints(t) * 2 * mult * dare);
        this.score += pts;
        const nt = t + 1, c = this.add("c", nt, x, y, Math.max(a.r, b.r) * 1.04, (a.vx + b.vx) / 2, (a.vy + b.vy) / 2 - 30);
        c.rr = RADII[nt];
        c.spin = (a.spin + b.spin) / 2;
        c.landed = true; c.age = 41; c.happy = 1.2; c.awake = true;
        c.q = -0.28; c.qv = 6;
        c.madeAt = this.steps; c.link = this.chain;
        const first = this.made[nt] === 0;
        this.made[nt]++;
        if (nt > this.highest) this.highest = nt;
        if (nt >= 7 && this.snores < SNORE_MAX && this.made[nt] % (nt >= 9 ? 1 : 2) === 0) {
            this.snores++;
            this.events.push({ type: "charge", x, y });
        }
        this.events.push({ type: "merge", x, y, t: nt, pts, chain: this.chain, mult, dare, first, a, b, c });
        for (const s of this.bodies) {
            if (s.kind !== "snow" || s.dead) continue;
            const d = Math.hypot(s.x - x, s.y - y);
            if (d < s.r + c.rr + 14) this.melt(s, x, y);
        }
    }

    melt(s, x, y) {
        s.hp--;
        if (s.hp > 0) {
            s.rr = s.r = s.r * 0.82;
            s.m = massOf(s.r); s.im = 1 / s.m;
            s.q = 0.2;
            this.events.push({ type: "chip", x: s.x, y: s.y, r: s.r });
            return;
        }
        s.dead = true;
        const pts = Math.round(40 * DARE[this.dare].mult);
        this.score += pts;
        this.events.push({ type: "melt", x: s.x, y: s.y, r: s.r, pts });
    }

    /** Per-frame expression state. Squash is a damped spring so everything jiggles like jelly. */
    cosmetics(dt) {
        for (const b of this.bodies) {
            b.qv += (-b.q * 340 - b.qv * 16) * dt;
            b.q += b.qv * dt;
            if (b.happy > 0) b.happy -= dt;
            b.blink -= dt;
            if (b.blink < 0) { b.blink = 1.6 + (b.seed * 13 % 4) + b.age % 3; b.shut = 0.11; }
            if (b.shut > 0) b.shut -= dt;
            b.peek -= dt;
            if (b.peek < 0) { b.peek = 4 + (b.seed * 7 + b.age) % 9; b.awake = !b.awake; }
            b.doze = b.sleep ? b.doze + dt : 0;
            // Roly-poly: rolling is real, but anything at rest rocks back upright so faces stay readable.
            if (b.sleep || Math.abs(b.spin) < 1.2) {
                let d = (b.ang - b.tilt) % (Math.PI * 2);
                if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
                b.ang -= d * Math.min(1, dt * (b.sleep ? 4 : 2));
            }
        }
    }
}

/** A sensible player, used by the tuning harness (bot.mjs) and to set up screenshots. */
export function botPick(sim, rng = Math.random, skill = 1) {
    const { W, H } = sim.w, piece = sim.held, r = sim.pieceRadius(piece), step = 10;
    if (skill <= 0) return r + rng() * (W - 2 * r);   // a player who isn't looking
    let best = W / 2, bestScore = -1e9;
    for (let x = r; x <= W - r + 0.01; x += step) {
        let land = H - r, hit = null;
        for (const b of sim.bodies) {
            const dx = Math.abs(b.x - x), R = r + b.r;
            if (dx < R) { const y = b.y - Math.sqrt(R * R - dx * dx); if (y < land) { land = y; hit = b; } }
        }
        let v = land * 0.12 - Math.abs(x - W / 2) * -0.01;
        if (piece === "snow") v += Math.abs(x - W / 2) * 0.12;
        else if (piece === "acorn") v += hit && hit.kind === "c" ? 40 + hit.t * 30 : -30;
        else if (hit) {
            if (hit.kind === "c" && hit.t === piece) v += 70 + piece * 8 + (sim.bodies.some((b) => b.t === piece + 1 && Math.hypot(b.x - hit.x, b.y - hit.y) < b.r + hit.r + 24) ? 40 : 0);
            else if (hit.kind === "c" && hit.t < piece) v -= (piece - hit.t) * 7;
            else if (hit.kind === "c" && hit.t === piece + 1) v += 8;
            else if (hit.kind === "snow") v -= 12;
        }
        if (land - r < 40) v -= 120;
        v += (rng() - 0.5) * (skill >= 1 ? 3 : 60 * (1 - skill));
        if (v > bestScore) { bestScore = v; best = x; }
    }
    return best;
}

// --- Save data -----------------------------------------------------------------------------------
const today = () => { const d = new Date(); return { key: d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(), label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) }; };
function loadSave() {
    const s = game.load(SAVE, null) ?? {};
    return { best: s.best ?? 0, seen: s.seen ?? [], plays: s.plays ?? 0, daily: s.daily ?? {}, muted: !!s.muted, tutored: !!s.tutored, springs: s.springs ?? 0 };
}
let save = loadSave();
const persist = () => game.save(SAVE, save);
game.audio.muted = save.muted;
game.data = { best: save.best, discovered: save.seen.length, score: 0, drops: 0, highest: null, pieces: 0, snores: 0, chain: 0, dare: "Snug", gameOver: false, mode: "title" };

// --- Art -----------------------------------------------------------------------------------------
const paintStart = performance.now();
paintEverything(game, RADII, WORLD);
game.data.paintMs = Math.round(performance.now() - paintStart);
const E = 1.42;  // sprite half-width in body radii, from art.js
const spriteOf = (b) => (b.kind === "c" ? `c${b.t}` : b.kind === "snow" ? "snowball" : "acorn");
const INFO = (b) => (b.kind === "c" ? SPECIES[b.t] : b.kind === "snow" ? SNOWBALL : ACORN);

// --- Sound ---------------------------------------------------------------------------------------
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];
const note = (semi, base = 392) => base * 2 ** (semi / 12);
function popSound(t, chain) {
    const f = note(SCALE[Math.min(chain - 1, SCALE.length - 1)], 440 - t * 22);
    game.sfx([
        { wave: "sine", freq: f * 0.62, to: f * 1.5, attack: 0.002, decay: 0.1, volume: 0.42 },
        { wave: "triangle", freq: f * 1.5, to: f * 2, attack: 0.002, decay: 0.08, volume: 0.13, at: 0.035 },
        { wave: "noise", freq: 2400, to: 500, decay: 0.05, volume: 0.05 },
    ]);
    if (t >= 6) game.sfx([{ wave: "sine", freq: 110 + t * 8, to: 70, decay: 0.3, volume: 0.32 }, { wave: "triangle", freq: f * 2, decay: 0.3, volume: 0.1, at: 0.1 }]);
}
const fanfare = (notes, wave = "triangle", vol = 0.2, gap = 0.09) => game.sfx(notes.map((n, i) => ({ wave, freq: note(n, 523), decay: 0.3, volume: vol, at: i * gap })));
const landSound = (r, speed) => game.sfx([{ wave: "sine", freq: 260 - r * 2, to: 80, attack: 0.002, decay: 0.09, volume: Math.min(0.3, speed / 1800) }, { wave: "noise", freq: 500, decay: 0.04, volume: 0.04 }]);
const snoreSound = () => game.sfx([
    { wave: "sawtooth", freq: 58, to: 92, attack: 0.25, decay: 0.55, volume: 0.28 }, { wave: "noise", freq: 240, to: 700, attack: 0.25, decay: 0.55, volume: 0.22 },
    { wave: "triangle", freq: 320, to: 980, decay: 0.34, volume: 0.16, at: 0.8 },
]);
const LULLABY = {
    bpm: 72, steps: 2,
    tracks: [
        { wave: "triangle", volume: 0.15, notes: "E5 - G5 - A5 G5 E5 - D5 - E5 - G5 - - - C5 - E5 - G5 E5 D5 - C5 - D5 - E5 - - - A4 - C5 - E5 D5 C5 - D5 - E5 - D5 - - - G4 - A4 - C5 D5 E5 - D5 - C5 - - - - -" },
        { wave: "sine", volume: 0.17, notes: "C3 - G3 - C4 - G3 - A2 - E3 - A3 - E3 - F2 - C3 - F3 - C3 - G2 - D3 - G3 - D3 - A2 - E3 - A3 - E3 - F2 - C3 - F3 - C3 - C3 - G3 - F3 - C3 - G2 - D3 - G3 - - -" },
        { wave: "sine", volume: 0.045, notes: "- - - C6 - - - - - - - E6 - - - - - - - A5 - - - - - - - G5 - - - - - - - C6 - - - - - - - E6 - - - - - - - G6 - - - - - - - - - - -" },
    ],
};
const startMusic = () => { if (!save.muted && !game.audio.music) game.music(LULLABY); };
function setMuted(m) {
    save.muted = m; persist();
    game.audio.muted = m;
    if (m) game.stopMusic(); else startMusic();
}

// --- Layout --------------------------------------------------------------------------------------
function layoutPlay(v) {
    const s = v.safe, wide = v.width > v.height * 1.05, { W, H, wall, top } = WORLD, need = H - top + 2 * wall + 22;
    const hud = wide ? 0 : 66, bar = wide ? 0 : 72;
    const availH = v.height - s.top - s.bottom - hud - bar - (wide ? 8 : 0);
    const k = Math.min((v.width - 10) / (W + 2 * wall + 2), availH / need, wide ? 1.15 : 1.25);
    const ox = v.width / 2 - W * k / 2, oy = v.height - s.bottom - bar - (wide ? 6 : 2) - (H + wall + 8) * k;
    return { wide, k, ox, oy, floor: oy + (H + wall) * k, left: ox - wall * k, right: ox + (W + wall) * k };
}

// --- Cheap drawing helpers -------------------------------------------------------------------------
const M = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };  // d has no public transform stack, so these write d.m directly
function setM(d, a, b, c, dd, e, f) { const m = d.m; m[0] = a; m[1] = b; m[2] = c; m[3] = dd; m[4] = e; m[5] = f; M.a = a; M.b = b; M.c = c; M.d = dd; M.e = e; M.f = f; }
/** One frame of the fx sheet, placed in the current body's local space, with rotation. */
function part(d, frame, x, y, w, h, rot, col, opacity) {
    const { a, b, c, d: dd, e, f } = M, cs = rot ? Math.cos(rot) : 1, sn = rot ? Math.sin(rot) : 0, m = d.m;
    m[0] = a * cs + c * sn; m[1] = b * cs + dd * sn; m[2] = -a * sn + c * cs; m[3] = -b * sn + dd * cs;
    m[4] = e + a * x + c * y; m[5] = f + b * x + dd * y;
    d.sprite("fx", { frame, width: w, height: h, color: col, opacity });
    m[0] = a; m[1] = b; m[2] = c; m[3] = dd; m[4] = e; m[5] = f;
}

function worry(sim, b) {
    if (sim.noMerge || b.held) return 0;
    const t = b.y - b.r;
    if (sim.danger > 0.02 && t < 60) return 1;
    return t < 26 && b.landed ? 1 : 0;
}

function drawFace(d, sim, b, R, S, lookX, lookY, time, lowDetail) {
    const info = INFO(b), f = info.face, ink = info.ink, lid = f.style === "ring" ? "#fff7ea" : ink, er = f.er * R, y0 = f.ey * R, x0 = f.ex * R;
    const scared = sim.over || worry(sim, b) > 0, falling = !b.landed && b.age < 90, happy = b.happy > 0;
    const asleep = !scared && !happy && !falling && b.doze > 1.6 && !b.awake && !b.held;
    const shut = b.shut > 0 && !scared;
    const grump = f.grump;
    const look = asleep ? 0 : 1, lx = lookX * look, ly = lookY * look;
    const eye = scared ? er * 1.18 : er;
    for (let i = -1; i <= 1; i += 2) {
        const x = x0 * i, y = y0;
        if (asleep) { part(d, FX.sleep, x, y + er * 0.2, er * 2.5, er * 2.5, 0, lid); continue; }
        if (happy) { part(d, FX.happy, x, y, er * 2.5, er * 2.5, 0, lid); continue; }
        if (shut) { part(d, FX.sleep, x, y, er * 2.3, er * 2.0, 0, lid); continue; }
        if (f.style === "ring") d.circle(eye * 1.42, { x, y, color: "#fff7ea" });
        if (f.style === "iris") {
            d.circle(eye * 1.02, { x, y, color: "#3b2415" });
            d.circle(eye * 0.9, { x, y, color: f.iris });
            d.circle(eye * 0.56, { x: x + lx * eye * 0.26, y: y + ly * eye * 0.26, color: "#1d120c" });
        } else d.circle(eye, { x: x + lx * eye * 0.12, y: y + ly * eye * 0.12, color: f.style === "ring" ? ink : "#1d1824" });
        if (!lowDetail) {
            const k = f.style === "iris" ? 0.5 : 1;
            d.circle(eye * 0.36 * k, { x: x - eye * 0.3 + lx * eye * 0.34, y: y - eye * 0.36 + ly * eye * 0.34, color: "#ffffff" });
            d.circle(eye * 0.16 * k, { x: x + eye * 0.34 + lx * eye * 0.2, y: y + eye * 0.34 + ly * eye * 0.2, color: "#ffffffcc" });
        }
    }
    const my = f.my * R, mw = (f.mw || 0.2) * R;
    if (grump && !happy) {
        part(d, FX.brow, -x0, y0 - er * 1.5, er * 2.6, er * 2, 0.42, ink);
        part(d, FX.brow, x0, y0 - er * 1.5, er * 2.6, er * 2, -0.42, ink);
    } else if (scared) {
        part(d, FX.brow, -x0, y0 - er * 1.9, er * 2.4, er * 1.9, -0.45, ink);
        part(d, FX.brow, x0, y0 - er * 1.9, er * 2.4, er * 1.9, 0.45, ink);
    }
    if (info === SPECIES[9]) return;   // an owl's beak is painted
    if (happy) part(d, FX.laugh, 0, my + mw * 0.2, mw * 2.2, mw * 2.2, 0, undefined);
    else if (scared) part(d, FX.wobble, 0, my, mw * 2.2, mw * 2.2, 0, ink);
    else if (falling) part(d, FX.oh, 0, my + mw * 0.1, mw * 1.6, mw * 1.6, 0, undefined);
    else if (grump) part(d, FX.wobble, 0, my, mw * 2, mw * 2, Math.PI, ink);
    else if (asleep && Math.sin(time * 1.2 + b.seed) > 0.3) part(d, FX.oh, 0, my, mw * 1.1, mw * 1.1, 0, undefined);
    else if (f.mouth === "wide") part(d, FX.wide, 0, my, mw * 2, mw * 2, 0, ink);
    else part(d, f.mouth === "w" ? FX.w : FX.smile, 0, my, mw * 2, mw * 2, 0, ink);
    if (f.fangs && !happy) {
        part(d, FX.fang, -mw * 0.5, my + R * 0.14, R * 0.12, R * 0.14, 0);
        part(d, FX.fang, mw * 0.5, my + R * 0.14, R * 0.12, R * 0.14, 0);
    }
}

/** Draw every creature in two passes: bodies by species (few texture swaps), then all faces on one sheet. */
function drawPile(d, sim, L, time, alpha, hold) {
    const k = L.k, order = sim.bodies.slice(), px = game.view.scale * Math.min(game.screen?.dpr ?? 1, 2.5);
    if (hold) order.push(hold);
    order.sort((a, b) => b.r - a.r);
    const low = order.length > 70;
    for (const b of order) {
        const x = L.ox + (b.lx + (b.x - b.lx) * alpha) * k, y = L.oy + (b.ly + (b.y - b.ly) * alpha) * k;
        const breathe = b.sleep ? Math.sin(time * 1.9 + b.seed) * 0.016 : 0, q = Math.max(-0.4, Math.min(0.4, b.q + breathe));
        const cold = !sim.noMerge && !b.held && ((b.y - b.r < 0 && b.landed) || sim.over);
        const shiver = cold ? Math.sin(time * 57 + b.seed) * (sim.over ? 0.8 : 1) * k : 0;
        const sx = (1 + q) * k, sy = (1 - q) * k, cs = Math.cos(b.ang), sn = Math.sin(b.ang);
        b._a = sx * cs; b._b = sy * sn; b._c = -sx * sn; b._d = sy * cs; b._e = x + shiver; b._f = y + b.r * q * k;
        setM(d, b._a, b._b, b._c, b._d, b._e, b._f);
        const size = 2 * E * b.r, name = spriteOf(b);
        d.sprite(size * k * px < 66 ? `${name}_s` : name, { width: size, height: size, color: cold ? "#c9e0ff" : undefined });
    }
    const lookAt = sim.lookTarget;
    for (const b of order) {
        setM(d, b._a, b._b, b._c, b._d, b._e, b._f);
        let lx = 0, ly = 0;
        if (lookAt) {
            const dx = lookAt.x - b.x, dy = lookAt.y - b.y, l = Math.hypot(dx, dy) || 1, cs = Math.cos(-b.ang), sn = Math.sin(-b.ang);
            lx = (dx * cs - dy * sn) / l; ly = (dx * sn + dy * cs) / l;
        }
        drawFace(d, sim, b, b.r, 1, lx, ly, time, low);
        if (b.y - b.r < 26 && b.landed && !sim.over && b.r > 18 && !b.held && !sim.noMerge) {
            const t = (time * 1.1 + b.seed) % 1;
            part(d, FX.sweat, b.r * 0.72, -b.r * 0.34 + t * b.r * 0.5, b.r * 0.32, b.r * 0.32, 0, undefined, 1 - t);
        }
    }
    d.reset();
}

function wrapSprite(d, name, y, w, h, off, vw) {
    const start = -((off % w) + w) % w;
    for (let x = start - w; x < vw + w; x += w) d.sprite(name, { x: x + w / 2, y, width: w + 0.5, height: h });
}

/** The painted world behind everything. Shared by every scene. */
function backdrop(s, flakes = 46, moon = null) {
    const fx = game.fxRng, stars = [], snow = [];
    for (let i = 0; i < 40; i++) stars.push({ x: fx.range(0, 1), y: fx.range(0, 0.55), r: fx.range(0.5, 1.3), p: fx.range(0, 6) });
    for (let i = 0; i < flakes; i++) snow.push({ x: fx.range(0, 1), y: fx.range(0, 1), r: fx.range(0.7, 2.2), v: fx.range(14, 40), p: fx.range(0, 6) });
    s.add([{
        name: "backdrop", layer: -100,
        update(dt) { for (const f of snow) { f.y += f.v * dt / game.view.height; if (f.y > 1) f.y -= 1; } },
        draw(d) {
            const v = game.view, t = s.time, w = v.width, h = v.height;
            for (const c of stars) d.circle(c.r, { x: c.x * w, y: c.y * h, color: "#ffffff", opacity: 0.35 + 0.35 * Math.sin(t * 1.3 + c.p) });
            const m = moon ? moon(v) : { x: w > h ? w * 0.87 : w * 0.8, y: w > h ? h * 0.44 : v.safe.top + 70, size: w > h ? 76 : 80 };
            d.sprite("moon", { x: m.x, y: m.y, width: m.size * 1.27, height: m.size * 1.27 });
            const base = h * 0.84;
            wrapSprite(d, "pinesFar", base - 74, 640, 180, 30, w);
            d.sprite("snowfield", { x: w / 2, y: base + (h - base) / 2 + 1, width: w + 8, height: h - base + 20 });
            wrapSprite(d, "pinesNear", base - 104, 640, 240, 180, w);
            wrapSprite(d, "snowbank", base - 8, 640, 60, 90, w);
            d.sprite("snowfield", { x: w / 2, y: base + 22 + (h - base - 22) / 2, width: w + 8, height: h - base - 18 });
        },
    }]);
    s.onDraw((d) => {
        const v = game.view;
        for (const f of snow) d.circle(f.r, { x: (f.x + Math.sin(s.time * 0.6 + f.p) * 0.015) * v.width, y: f.y * v.height, color: "#ffffff", opacity: 0.75 });
    });
}

/**
 * A full-screen UI drawing pass at a chosen layer. s.onDrawUI always runs above every entity, so it can't sit
 * under a modal, and a size-less UI entity at (0,0) trips SAFE_AREA on notched phones. So: park the
 * entity mid-screen, then reset to view coordinates when drawing.
 */
const layerDraw = (s, name, lyr, draw, extra = {}) => s.add([pos(0, 0), ui(), { name, layer: lyr, update(_dt, e) { e.pos.set(game.view.width / 2, game.view.height / 2, 0); }, draw(d, e) { e.pos.set(game.view.width / 2, game.view.height / 2, 0); d.reset(); draw(d); }, ...extra }]);

/** A creature with a simple live face, for menus. mood: "open" or "sleep" or "happy". */
function portrait(d, t, x, y, size, mood = "open", opacity = 1) {
    const sp = SPECIES[t], f = sp.face, R = size / (2 * E), er = f.er * R;
    const big = size > 90;
    d.sprite(big ? `c${t}` : `c${t}_s`, { x, y, width: size, height: size, opacity });
    for (const i of [-1, 1]) {
        const ex = x + f.ex * R * i, ey = y + f.ey * R;
        if (mood !== "open") { d.sprite("fx", { frame: mood === "sleep" ? FX.sleep : FX.happy, x: ex, y: ey, width: er * 2.5, height: er * 2.5, color: f.style === "ring" ? "#fff7ea" : sp.ink, opacity }); continue; }
        if (f.style === "ring") d.circle(er * 1.42, { x: ex, y: ey, color: "#fff7ea", opacity });
        if (f.style === "iris") { d.circle(er, { x: ex, y: ey, color: f.iris, opacity }); d.circle(er * 0.56, { x: ex, y: ey, color: "#1d120c", opacity }); }
        else d.circle(er, { x: ex, y: ey, color: f.style === "ring" ? sp.ink : "#1d1824", opacity });
        d.circle(er * 0.36, { x: ex - er * 0.3, y: ey - er * 0.36, color: "#ffffff", opacity });
    }
    if (t !== 9) d.sprite("fx", { frame: f.mouth === "wide" ? FX.wide : f.mouth === "w" ? FX.w : FX.smile, x, y: y + f.my * R, width: f.mw * R * 2, height: f.mw * R * 2, color: sp.ink, opacity });
}

// --- Buttons ---------------------------------------------------------------------------------------
function button(s, label, o) {
    const fill = o.color ?? "#f5a641", edge = o.edge ?? "#7c3f16", ink = o.ink ?? "#4a2110";
    const comps = [pos(0, 0), ui(), tap(o.onTap), {
        name: o.name ?? label, layer: o.layer ?? 50, label2: label,
        setW: o.w, setH: o.h,
        update(dt, e) {
            const g = e._pressed ? 0.94 : 1;
            e.scale.x += (g - e.scale.x) * Math.min(1, dt * 26);
            e.scale.y = e.scale.x;
            if (o.action && s.input.pressed(o.action) && !e.hidden) e.emit("tap");
        },
        draw(d, e) {
            const w = e.size.x, h = e.size.y, off = o.dim?.() ? 0.5 : 1;
            d.rect(w, h, { y: 3.5, color: edge, radius: 15, opacity: off });
            d.rect(w, h, { color: e._pressed ? (o.pressColor ?? fill) : fill, radius: 15, opacity: off });
            d.rect(w - 8, h * 0.42, { y: -h * 0.22, color: "#ffffff", opacity: 0.2 * off, radius: 11 });
            if (o.draw) o.draw(d, e);
            const txt = typeof label === "function" ? label() : label;
            if (txt) d.text(txt, { x: o.textX ?? 0, y: (o.textY ?? -0.5), size: o.size ?? 19, bold: true, font: FONT, color: ink, opacity: off });
        },
    }];
    const e = s.add(comps);
    e.size.set(o.w ?? 200, o.h ?? 54, 0);
    return e;
}
const label = (s, str, o = {}) => {
    const e = s.add([text(str, { size: o.size ?? 16, bold: o.bold ?? true, font: FONT, color: o.color ?? "#ffffff", align: o.align ?? "center", maxWidth: o.maxWidth ?? 0, lineHeight: o.lineHeight ?? 1.25 }), pos(o.x ?? 0, o.y ?? 0), ui(), { layer: o.layer ?? 40, name: o.name ?? `label ${str}` }]);
    return e;
};

// --- Title -----------------------------------------------------------------------------------------
game.scene("title", (s) => {
    save = loadSave();
    const logoBox = (v) => {
        const wide = v.width > v.height, h = wide ? Math.min(150, v.height * 0.38) : Math.min(216, (v.width - 44) * 400 / 620), w = h * 620 / 400;
        return { w, h, x: v.width / 2, y: v.safe.top + h / 2 + (wide ? 2 : 16) };
    };
    backdrop(s, 46, (v) => { const b = logoBox(v); return { x: b.x + b.w * 0.34, y: b.y - b.h * 0.2, size: b.h * 0.86 }; });
    const day = today();
    game.data.mode = "title";
    const makeWorld = () => {
        const v = game.view, k = Math.max(0.74, Math.min(v.width / 300, v.height / 620)) * (v.width > v.height ? 0.8 : 0.68);
        return { k, W: v.width / k, H: 300 };
    };
    let tw = makeWorld();
    const world = { W: tw.W, H: 300, dropY: -300 };
    const sim = new Pile(world, 11, { noMerge: true });
    const L = () => ({ k: tw.k, ox: 0, oy: game.view.height - game.view.safe.bottom - 300 * tw.k - 2 });
    const cast = [11, 10, 9, 7, 8, 5, 6, 3, 4, 2, 1, 0, 2];
    let spawned = 0;
    s.every(0.22, () => {
        if (spawned >= cast.length) return;
        const t = cast[spawned], at = 0.5 + ((spawned * 0.618) % 1 - 0.5) * 0.82;
        sim.add("c", t, world.W * at, -RADII[t] - 60, RADII[t] * 0.92, 0, 80);
        spawned++;
    });
    for (let i = 0; i < 4 && spawned < cast.length; i++) {
        const t = cast[spawned];
        sim.add("c", t, world.W * (0.2 + i * 0.2), 160 - i * 8, RADII[t] * 0.92);
        spawned++;
    }
    s.add([{
        name: "cast", layer: 5,
        update(dt) {
            sim.lookTarget = { x: s.input.pointer.x / tw.k, y: -140 };
            sim.step(dt);
            sim.events.length = 0;
        },
        draw(d) { drawPile(d, sim, L(), s.time, game._alpha ?? 1); },
    }]);
    layerDraw(s, "logo", 30, (d) => {
        const b = logoBox(game.view);
        d.sprite("logo", { x: b.x, y: b.y + Math.sin(s.time * 1.4) * 2, width: b.w, height: b.h });
    });
    const tag = label(s, "Winter's coming. Everyone in.", { size: 16, color: "#ffe9c4", name: "tagline" });
    const best = label(s, "", { size: 14, color: "#d7e3ff", name: "best" });
    const go = (mode) => { game.sfx("click"); startMusic(); game.go("play", { mode }, { fade: 0.22 }); };
    const play = button(s, "Tuck In", { w: 210, h: 58, size: 24, action: "confirm", onTap: () => go("free"), name: "Play" });
    const daily = button(s, `Daily ${day.label}`, { w: 210, h: 46, size: 15, color: "#7fb4f2", edge: "#27508f", ink: "#10274f", onTap: () => go("daily"), name: "Daily" });
    const dex = button(s, () => `Who's here ${save.seen.length}/${TIERS}`, { w: 210, h: 46, size: 15, color: "#a7dd95", edge: "#37713f", ink: "#143b1e", onTap: () => { startMusic(); game.sfx("click"); game.go("dex", {}, { fade: 0.18 }); }, name: "Collection" });
    const sound = button(s, "", { draw(d) { d.sprite("fx", { frame: FX.note, width: 26, height: 26, color: "#ffffff", opacity: save.muted ? 0.45 : 1 }); if (save.muted) d.line([-12, 12], [12, -12], { width: 3, color: "#ffb4b4" }); }, w: 50, h: 46, size: 13, color: "#ffffff30", edge: "#00000030", ink: "#ffffff", onTap: () => { setMuted(!save.muted); game.sfx("click"); }, name: "Sound" });
    const place = () => {
        const v = game.view, wide = v.width > v.height, b = logoBox(v), cx = v.width / 2;
        tw = makeWorld();
        if (wide) {
            const y0 = b.y + b.h / 2;
            tag.pos.set(cx, y0 + 12);
            play.pos.set(cx, y0 + 56);
            daily.pos.set(cx - 182, y0 + 56);
            dex.pos.set(cx + 182, y0 + 56);
            daily.size.x = dex.size.x = 142;
            play.size.x = 180;
            best.pos.set(cx, y0 + 98);
        } else {
            const y0 = b.y + b.h / 2;
            tag.pos.set(cx, y0 + 12);
            play.pos.set(cx, y0 + 62);
            daily.pos.set(cx - 88, y0 + 124);
            dex.pos.set(cx + 88, y0 + 124);
            daily.size.x = dex.size.x = 166;
            best.pos.set(cx, y0 + 164);
        }
        sound.pos.set(v.width - v.safe.right - 34, v.safe.top + 28);
    };
    best.text = save.best ? `Best night's sleep: ${save.best.toLocaleString("en-US")}` : "Drag, let go. Match two to snuggle.";
    place();
    s.on("resize", place);
});

// --- Collection ------------------------------------------------------------------------------------
game.scene("dex", (s) => {
    save = loadSave();
    backdrop(s, 24);
    game.data.mode = "collection";
    let pick = save.seen.length ? Math.max(...save.seen) : -1;
    const cards = [];
    const cardLayout = () => {
        const v = game.view, wide = v.width > v.height, saf = v.safe;
        const cols = wide ? 6 : 3, rows = wide ? 2 : 4;
        const top = saf.top + 64, panel = wide ? 104 : 152;
        const area = v.height - top - saf.bottom - panel - 18, aw = Math.min(v.width - saf.left - saf.right - 20, wide ? 760 : 400);
        const cw = aw / cols, ch = Math.min(area / rows, cw * 1.06);
        return { cols, cw, ch, x0: v.width / 2 - aw / 2, y0: top, panelY: v.height - saf.bottom - panel / 2 - 8, panel, aw };
    };
    SPECIES.forEach((sp, t) => {
        const seen = save.seen.includes(t);
        const e = s.add([pos(0, 0), ui(), tap(() => { if (seen) { pick = t; game.sfx({ wave: "sine", freq: note(SCALE[t], 440), to: note(SCALE[t], 660), decay: 0.09, volume: 0.25 }); } }), {
            name: `card ${t}`, layer: 20,
            draw(d, en) {
                const w = en.size.x - 8, h = en.size.y - 8, on = pick === t;
                d.rect(w, h, { y: 3, color: "#0c1030", opacity: 0.35, radius: 16 });
                d.rect(w, h, { color: seen ? (on ? "#ffe9bd" : "#fff6e6") : "#39457f", radius: 16 });
                if (on) d.rect(w, h, { color: "#f5a641", radius: 16, outline: 3 });
                const sz = Math.min(w, h) * 0.98;
                if (seen) portrait(d, t, 0, -8 + Math.sin(s.time * 2 + t) * 1.4, sz);
                else d.sprite(`c${t}_x`, { y: -8, width: sz, height: sz });
                d.text(seen ? sp.name : "?", { y: h / 2 - 11, size: 13, bold: true, font: FONT, color: seen ? "#54331a" : "#8e9bd6" });
            },
        }]);
        cards.push(e);
    });
    const head = label(s, `Burrow friends ${save.seen.length}/${TIERS}`, { size: 18, color: "#fff4dd", name: "dex title" });
    let pw = 0, py = 0, ph = 0;
    layerDraw(s, "dex panel", 22, (d) => {
        {
            const cx = game.view.width / 2;
            d.rect(pw, ph, { x: cx, y: py + 3, color: "#0c1030", opacity: 0.35, radius: 20 });
            d.rect(pw, ph, { x: cx, y: py, color: "#fff6e6", radius: 20 });
            const sz = Math.min(ph * 1.04, 150), left = cx - pw / 2 + sz * 0.92, tw = pw - sz * 0.92 - 14, sp = SPECIES[pick];
            if (pick >= 0) portrait(d, pick, cx - pw / 2 + sz * 0.48, py + Math.sin(s.time * 2) * 1.2, sz, "open");
            d.text(sp ? sp.name : "Nobody yet", { x: left + tw / 2, y: py - ph / 2 + 26, size: 20, bold: true, font: FONT, color: "#54331a", align: "center" });
            d.text(sp ? `${sp.kind}, tier ${pick + 1} of ${TIERS}` : "Tuck someone in to meet them", { x: left + tw / 2, y: py - ph / 2 + 48, size: 13, bold: true, font: FONT, color: "#9a6b3e" });
            if (sp) d.text(sp.bio, { x: left + tw / 2, y: py + 18, size: 14, font: FONT, color: "#5e4228", maxWidth: tw, lineHeight: 1.3 });
        }
    });
    const back = button(s, "Back", { w: 84, h: 46, size: 16, color: "#ffffff", edge: "#7f8fc7", ink: "#27335f", action: "confirm", onTap: () => { game.sfx("click"); game.go("title", {}, { fade: 0.18 }); }, name: "Back" });
    const place = () => {
        const v = game.view, L = cardLayout();
        head.pos.set(v.width / 2 + 36, v.safe.top + 30);
        back.pos.set(v.safe.left + 52, v.safe.top + 30);
        cards.forEach((c, t) => {
            const col = t % L.cols, row = Math.floor(t / L.cols);
            c.size.set(L.cw, L.ch, 0);
            c.pos.set(L.x0 + L.cw * (col + 0.5), L.y0 + L.ch * (row + 0.5));
        });
        pw = L.aw - 8; ph = L.panel; py = L.panelY;
    };
    place();
    s.on("resize", place);
});

// --- Play ------------------------------------------------------------------------------------------
game.scene("play", (s, args = {}) => {
    const mode = args.mode === "daily" ? "daily" : "free", day = today();
    const seed = args.seed ?? (mode === "daily" ? day.key : Math.floor(game.fxRng.range(1, 2 ** 31)));
    const sim = new Pile(WORLD, seed);
    game.sim = sim;
    save = loadSave();
    backdrop(s, 34);
    let L = layoutPlay(game.view), holding = false, paused = false, overT = 0, shown = false, hintT = save.tutored ? 0 : 1, toast = null, toastT = 0, dareBump = 0, lastDare = 0;
    const started = s.time;
    const held = {   // the piece on the claw: a body that isn't in the simulation
        id: 0, kind: "c", t: 0, x: 150, y: WORLD.dropY, lx: 150, ly: WORLD.dropY, r: 12, rr: 12, ang: 0, q: 0, qv: 0, b: 0, age: 0, landed: true, held: true, shut: 0, happy: 0, doze: 0, seed: 3, blink: 2, peek: 3, sleep: false, awake: true,
    };
    const parts = [], floats = [], ghosts = [], rings = [];
    const fx = game.fxRng, view = () => game.view;
    const wx = (x) => L.ox + x * L.k, wy = (y) => L.oy + y * L.k;
    const spray = (x, y, n, o) => {
        for (let i = 0; i < n && parts.length < 220; i++) {
            const a = o.dir !== undefined ? o.dir + fx.range(-(o.spread ?? 0.6), o.spread ?? 0.6) : fx.range(0, 6.283), v = fx.range(o.speed[0], o.speed[1]);
            parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g ?? 260, life: fx.range(o.life[0], o.life[1]), max: 0, f: fx.pick(o.frames), size: fx.range(o.size[0], o.size[1]), rot: fx.range(0, 6), spin: fx.range(-5, 5), col: o.colors ? fx.pick(o.colors) : undefined });
            parts[parts.length - 1].max = parts[parts.length - 1].life;
        }
    };
    const say = (msg, sec = 1.8) => { toast = msg; toastT = sec; };

    function record(t) {
        if (!save.seen.includes(t)) { save.seen.push(t); persist(); return true; }
        return false;
    }
    function react(e) {
        if (e.type === "drop") { held.q = -0.2; game.sfx({ wave: "sine", freq: 520, to: 300, decay: 0.08, volume: 0.1 }); }
        else if (e.type === "land") {
            e.b.qv += Math.min(5.5, e.speed / 120);
            if (e.other) e.other.qv += Math.min(2.5, e.speed / 260);
            landSound(e.b.r, e.speed);
            game.vibrate(5);
            spray(wx(e.b.x), wy(e.b.y + e.b.r), 4, { frames: [FX.puff], speed: [20, 60], dir: -1.57, spread: 1.4, g: 40, life: [0.25, 0.4], size: [6, 12], colors: ["#fff1d6"] });
        } else if (e.type === "merge") {
            scorePop = 1;
            const col = TINT[e.t], big = e.t >= 7, x = wx(e.x), y = wy(e.y), R = RADII[e.t] * L.k, heavy = e.t >= 5;
            ghosts.push({ t: e.t - 1, x0: e.a.x, y0: e.a.y, x: e.x, y: e.y, r: e.a.r, life: 0.09 }, { t: e.t - 1, x0: e.b.x, y0: e.b.y, x: e.x, y: e.y, r: e.b.r, life: 0.09 });
            rings.push({ x, y, r: R * 0.6, to: R * 1.9, life: 0.34, max: 0.34, col });
            spray(x, y, Math.min(46, 12 + e.t * 3), { frames: [FX.puff, FX.star, FX.heart], speed: [60, 170 + e.t * 18], life: [0.35, 0.8], size: [6, 13 + e.t * 0.8], colors: [col, "#ffffff", "#ffe08a"] });
            floats.push({ x, y: y - R * 0.3, txt: `+${e.pts.toLocaleString("en-US")}`, life: 1, max: 1, size: Math.min(30, 15 + e.t * 1.1 + (e.mult > 1 ? 3 : 0)), col: e.dare > 1 ? "#bfe6ff" : "#fff1c9" });
            if (e.chain > 1) floats.push({ x, y: y - R * 0.3 - 22, txt: `Chain x${e.chain}!`, life: 0.9, max: 0.9, size: 15 + Math.min(10, e.chain * 1.5), col: "#ffd25e" });
            popSound(e.t, e.chain);
            game.vibrate(heavy ? 18 + e.t * 3 : 8);
            if (heavy) s.shake(1.6 + (e.t - 5) * 0.9, 0.22);
            if (big) { s.flash("#fff3d6", 0.12 + (e.t - 7) * 0.03); fanfare([0, 4, 7, 12 + e.t % 3], "triangle", 0.15, 0.07); }
            if (record(e.t)) {
                game.data.discovered = save.seen.length;
                if (e.t >= 1) {
                    celebrate = { t: e.t, life: 1.5, max: 1.5 };
                    fanfare([0, 7, 12], "sine", 0.16, 0.1);
                }
            }
        } else if (e.type === "spring") {
            const x = wx(e.x), y = wy(e.y);
            for (let i = 0; i < 3; i++) spray(x, y, 70, { frames: [FX.petal, FX.leaf, FX.heart, FX.star], speed: [80, 420], life: [1.0, 2.2], size: [10, 20], g: 120, colors: [undefined] });
            s.flash("#ffffff", 0.5);
            s.shake(9, 0.6);
            fanfare([0, 4, 7, 12, 16, 19, 24], "triangle", 0.22, 0.1);
            game.vibrate([40, 40, 80]);
            floats.push({ x, y, txt: `SPRING! +${e.pts.toLocaleString("en-US")}`, life: 2.4, max: 2.4, size: 32, col: "#ffe07a" });
            save.springs++;
            persist();
            say("Luna yawned. Spring is here!", 3);
        } else if (e.type === "snore") {
            snoreSound();
            s.shake(6, 0.6);
            game.vibrate(60);
            rings.push({ x: wx(150), y: wy(WORLD.H), r: 20, to: 520, life: 0.8, max: 0.8, col: "#cfe4ff" });
            for (let i = 0; i < 12; i++) spray(wx(fx.range(20, 280)), wy(fx.range(100, 360)), 1, { frames: [FX.z], speed: [40, 90], dir: -1.57, spread: 0.6, g: -40, life: [0.9, 1.6], size: [12, 22], colors: ["#ffffff", "#cfe4ff"] });
            say("Big snore! Friends shuffle closer", 1.5);
        } else if (e.type === "charge") {
            say("Snore recharged", 1.4);
            game.sfx([{ wave: "sine", freq: 660, to: 990, decay: 0.12, volume: 0.15 }]);
        } else if (e.type === "chip" || e.type === "melt") {
            const x = wx(e.x), y = wy(e.y);
            spray(x, y, e.type === "melt" ? 26 : 12, { frames: [FX.flake, FX.puff], speed: [40, 180], life: [0.4, 0.8], size: [7, 13], colors: ["#ffffff", "#cfe4ff"] });
            game.sfx([{ wave: "noise", freq: 2200, to: 400, decay: 0.14, volume: 0.18 }]);
            if (e.type === "melt") {
                floats.push({ x, y, txt: `Melted! +${e.pts}`, life: 1, max: 1, size: 17, col: "#cfe4ff" });
            }
        } else if (e.type === "over") {
            game.sfx("lose");
            game.vibrate([30, 40, 60]);
            s.shake(5, 0.5);
            overT = 0;
        }
    }
    let celebrate = null, scorePop = 0;
    // Bank progress if the player leaves part way through, or the phone puts the tab to sleep.
    const bank = () => { if (mode === "free" && sim.score > save.best) { save.best = sim.score; persist(); } };
    game.on("hide", () => { if (game.sim === sim) bank(); });

    // --- HUD -------------------------------------------------------------------------------------
    const scoreT = label(s, "0", { size: 30, color: "#ffffff", name: "score" });
    const bestT = label(s, "", { size: 13, color: "#d7e3ff", name: "best" });
    const nextT = label(s, "Next", { size: 13, color: "#d7e3ff", name: "next label" });
    const modeT = label(s, mode === "daily" ? `Daily Den ${day.label}` : "", { size: 13, color: "#ffe08a", name: "mode" });
    const fire = () => {
        if (paused || sim.over) return;
        if (!sim.snore()) { game.sfx({ wave: "square", freq: 150, decay: 0.08, volume: 0.1 }); say("No snores left. Make a big one to earn more", 1.6); }
    };
    const snoreBtn = button(s, "", {
        w: 80, h: 56, name: "Snore", color: "#7fb4f2", edge: "#27508f", ink: "#10274f", action: "snore", onTap: fire, layer: 45, dim: () => sim.snores <= 0,
        draw(d) {
            d.sprite("fx", { frame: FX.z, x: -24, y: -1 + Math.sin(s.time * 3) * 1.5, width: 21, height: 21, color: "#10274f", opacity: sim.snores ? 1 : 0.5 });
            for (let i = 0; i < SNORE_MAX; i++) d.circle(5.2, { x: -2 + i * 13, y: 9, color: i < sim.snores ? "#fff3a8" : "#3f5e9a" });
            d.text("Snore", { y: -10, x: 11, size: 14, bold: true, font: FONT, color: "#10274f" });
        },
    });
    const menuBtn = button(s, "", {
        w: 46, h: 46, name: "Menu", color: "#ffffff30", edge: "#00000030", onTap: () => setPaused(!paused), action: "pause", layer: 46,
        draw(d) { for (const i of [-1, 0, 1]) d.rect(20, 3.4, { y: i * 7, color: "#ffffff", radius: 1.7 }); },
    });
    const pauseBits = [];
    function setPaused(p) {
        if (sim.over) return;
        paused = p;
        s.paused = p;
        for (const e of pauseBits) e.hidden = !p;
        game.sfx("click");
    }
    pauseBits.push(layerDraw(s, "shade", 80, (d) => { const v = view(); d.rect(v.width + 4, v.height + 4, { x: v.width / 2, y: v.height / 2, color: "#0b0f2c", opacity: 0.72 }); }));
    const pTitle = label(s, "Shh, they're sleeping", { size: 24, color: "#fff4dd", layer: 85, name: "paused" });
    const resume = button(s, "Back to bed", { w: 210, h: 54, size: 20, layer: 90, onTap: () => setPaused(false), name: "Resume" });
    const restartB = button(s, "Start over", { w: 210, h: 46, size: 16, layer: 90, color: "#7fb4f2", edge: "#27508f", ink: "#10274f", onTap: () => { game.sfx("click"); setPaused(false); game.go("play", { mode }, { fade: 0.2 }); }, name: "Restart" });
    const soundB = button(s, () => (save.muted ? "Sound: off" : "Sound: on"), { w: 210, h: 46, size: 16, layer: 90, color: "#a7dd95", edge: "#37713f", ink: "#143b1e", onTap: () => { setMuted(!save.muted); }, name: "Sound" });
    const quitB = button(s, "Leave the burrow", { w: 210, h: 46, size: 16, layer: 90, color: "#ffffff", edge: "#7f8fc7", ink: "#27335f", onTap: () => { bank(); s.paused = false; game.go("title", {}, { fade: 0.2 }); }, name: "Quit" });
    pauseBits.push(pTitle, resume, restartB, soundB, quitB);
    for (const e of pauseBits) e.hidden = true;

    const place = () => {
        const v = view();
        L = layoutPlay(v);
        const sf = v.safe;
        if (L.wide) {
            const lx = (sf.left + L.left) / 2, rx = (v.width - sf.right + L.right) / 2;
            modeT.pos.set(lx, sf.top + 16);
            scoreT.pos.set(lx, sf.top + 42);
            bestT.pos.set(lx, sf.top + 70);
            nextT.pos.set(rx, sf.top + 22);
            snoreBtn.pos.set(rx, v.height - sf.bottom - 40);
            snoreBtn.size.set(Math.min(92, (v.width - sf.right - L.right) - 20), 56, 0);
            menuBtn.pos.set(v.width - sf.right - 32, sf.top + 30);
            menuBtn.size.set(48, 48, 0);
        } else {
            scoreT.pos.set(v.width / 2 + 2, sf.top + 22);
            bestT.pos.set(v.width / 2 + 2, sf.top + 47);
            modeT.pos.set(v.width - sf.right - 84 - 40, sf.top + 62);
            nextT.pos.set(38, sf.top + 10);
            menuBtn.pos.set(v.width - sf.right - 32, sf.top + 28);
            snoreBtn.pos.set(sf.left + 46, v.height - sf.bottom - 38);
        }
        const cx = v.width / 2, cy = v.height / 2;
        pTitle.pos.set(cx, cy - 138);
        resume.pos.set(cx, cy - 82);
        restartB.pos.set(cx, cy - 22);
        soundB.pos.set(cx, cy + 34);
        quitB.pos.set(cx, cy + 90);
        if (mode === "daily" && !L.wide) modeT.pos.set(v.width / 2 + 2, sf.top + 64);
    };
    place();
    s.on("resize", place);

    // --- Update ----------------------------------------------------------------------------------
    let shownScore = 0;
    s.onUpdate((dt) => {
        const input = s.input, p = input.pointer, { W } = WORLD;
        if (!sim.over) {
            const r = sim.pieceRadius(sim.held);
            if (!overlayOpen()) {
                const wxp = (p.x - L.ox) / L.k;
                if (p.pressed) holding = true;
                if ((holding || (!input.touchMode && (p.dx || p.dy))) && !Number.isNaN(wxp)) sim.aim = wxp;
                const m = (input.down("right") ? 1 : 0) - (input.down("left") ? 1 : 0);
                if (m) sim.aim += m * 300 * dt;
                sim.aim = Math.max(r, Math.min(W - r, sim.aim));
                if ((p.released && holding) || input.pressed("jump") || input.pressed("down") || input.pressed("drop") || sim.wantDrop) {
                    if (sim.drop()) {
                        if (hintT > 0) { hintT = 0; save.tutored = true; persist(); }
                    } else if (p.released || sim.wantDrop) sim.wantBuffer = 0.3;
                    holding = false;
                    sim.wantDrop = false;
                }
                if (sim.wantBuffer > 0) { sim.wantBuffer -= dt; if (sim.canDrop) { sim.drop(); sim.wantBuffer = 0; } }
                if (p.released) holding = false;
            }
        }
        sim.step(dt);
        // look at the falling piece, or the claw
        const lk = sim.bodies.length ? sim.bodies.reduce((m, b) => (!b.landed && (!m || b.age < m.age) ? b : m), null) : null;
        sim.lookTarget = lk ?? { x: sim.aim, y: WORLD.dropY };
        // keep the held piece in sync
        const q = sim.held;
        held.kind = q === "acorn" ? "acorn" : q === "snow" ? "snow" : "c";
        held.t = typeof q === "number" ? q : -1;
        held.rr = sim.pieceRadius(q);
        held.r += (held.rr - held.r) * Math.min(1, dt * 14);
        held.lx = held.x; held.ly = held.y;
        held.x += (sim.aim - held.x) * Math.min(1, dt * 30);
        held.y = WORLD.dropY - (sim.cool > 0 ? sim.cool / DROP_COOLDOWN * 16 : 0);
        held.age++;
        held.qv += (-held.q * 340 - held.qv * 14) * dt; held.q += held.qv * dt;
        held.ang = Math.sin(s.time * 2.2) * 0.07;
        held.shut = held.shut > 0 ? held.shut - dt : 0;
        held.blink -= dt;
        if (held.blink < 0) { held.blink = 2.2; held.shut = 0.12; }

        for (const e of sim.events) react(e);
        sim.events.length = 0;

        // cosmetics
        shownScore += (sim.score - shownScore) * Math.min(1, dt * 12);
        if (Math.abs(sim.score - shownScore) < 1) shownScore = sim.score;
        const shown2 = Math.round(shownScore);
        if (scoreT.text !== shown2.toLocaleString("en-US")) scoreT.text = shown2.toLocaleString("en-US");
        scorePop = Math.max(0, scorePop - dt * 5);
        scoreT.scale = 1 + scorePop * 0.16;
        if (sim.dare > lastDare) { dareBump = 1; game.sfx({ wave: "triangle", freq: 330 * (1 + sim.dare * 0.25), to: 660, decay: 0.16, volume: 0.13 }); if (sim.dare >= 1) say(`${DARE[sim.dare].name.replace("!", "")}! Snuggles score x${DARE[sim.dare].mult}`, 1.5); }
        lastDare = sim.dare;
        dareBump = Math.max(0, dareBump - dt * 2);
        if (toastT > 0) toastT -= dt;
        for (const q2 of parts) { q2.vy += q2.g * dt; q2.x += q2.vx * dt; q2.y += q2.vy * dt; q2.rot += q2.spin * dt; q2.life -= dt; }
        for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); }
        for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.life -= dt; f.y -= dt * 42; if (f.life <= 0) floats.splice(i, 1); }
        for (let i = rings.length - 1; i >= 0; i--) { rings[i].life -= dt; if (rings[i].life <= 0) rings.splice(i, 1); }
        for (let i = ghosts.length - 1; i >= 0; i--) { ghosts[i].life -= dt; if (ghosts[i].life <= 0) ghosts.splice(i, 1); }
        if (celebrate) { celebrate.life -= dt; if (celebrate.life <= 0) celebrate = null; }
        // a soft z from the sleepers now and then
        if (s.time % 0.5 < dt) {
            const sl = sim.bodies.filter((b) => b.doze > 1.6 && !b.awake);
            if (sl.length) { const b = fx.pick(sl); spray(wx(b.x + b.r * 0.4), wy(b.y - b.r * 0.7), 1, { frames: [FX.z], speed: [14, 26], dir: -1.2, spread: 0.3, g: -14, life: [1.0, 1.6], size: [7, 12], colors: ["#ffffffcc"] }); }
        }
        // progress for state()
        if (game.stepCount % 20 === 0 || sim.over) {
            Object.assign(game.data, { mode, score: sim.score, drops: sim.drops, highest: sim.highest >= 0 ? SPECIES[sim.highest].name : null, pieces: sim.bodies.length, snores: sim.snores, chain: sim.chain, dare: DARE[sim.dare].name, gameOver: sim.over, seconds: Math.round(s.time - started), discovered: save.seen.length, best: save.best });
        }
        bestT.text = mode === "daily" ? `Today ${Math.max(save.daily[day.key] ?? 0, sim.score).toLocaleString("en-US")}` : `Best ${Math.max(save.best, sim.score).toLocaleString("en-US")}`;
        if (sim.over) {
            overT += dt;
            if (overT > 1.1 && !shown) { shown = true; showOver(); }
        }
    });
    const overlayOpen = () => paused || shown;
    const TINT = ["#ff6b5e", "#ffd84d", "#d7cce0", "#8fe388", "#f5a95a", "#a8805c", "#a78ae0", "#4bb39a", "#ffffff", "#c58a4e", "#e0a35f", "#8c9dff"];

    function showOver() {
        const fresh = mode === "daily" ? sim.score > (save.daily[day.key] ?? 0) : sim.score > save.best;
        if (mode === "daily") {
            if (fresh) save.daily[day.key] = sim.score;
            const keys = Object.keys(save.daily);
            if (keys.length > 14) delete save.daily[keys.sort()[0]];
        }
        if (sim.score > save.best) save.best = sim.score;
        save.plays++;
        persist();
        game.data.best = save.best;
        const v = view(), cx = v.width / 2, cy = v.height / 2, wide = v.width > v.height;
        const pw = Math.min(v.width - 28, 330), ph = 360;
        const py = wide ? cy : cy + 6;
        const top = sim.highest, nextUp = save.seen.length < TIERS ? SPECIES.findIndex((_, i) => !save.seen.includes(i)) : -1;
        const mins = Math.floor((s.time - started) / 60), secs = Math.floor((s.time - started) % 60);
        layerDraw(s, "over panel", 80, (d) => {
            {
                const vv = view();
                d.rect(vv.width + 4, vv.height + 4, { x: vv.width / 2, y: vv.height / 2, color: "#0b0f2c", opacity: Math.min(0.66, s.time) });
                const shh = Math.min(ph, vv.height - vv.safe.top - vv.safe.bottom - 8);
                d.rect(pw, shh, { x: cx, y: py + 4, color: "#0c1030", opacity: 0.4, radius: 24 });
                d.rect(pw, shh, { x: cx, y: py, color: "#fff6e6", radius: 24 });
                if (top >= 0) portrait(d, top, cx - 76, py - 26, 124, "sleep");
                if (nextUp >= 0) d.sprite(`c${nextUp}_x`, { x: cx + 86, y: py - 26, width: 84, height: 84 });
            }
        });
        const t = (str, y, size, col, x = cx, bold = true) => label(s, str, { x, y, size, color: col, layer: 85, bold, name: `over ${str}` });
        t(fresh ? "Best sleep ever!" : "The draught got in!", py - 152, 23, fresh ? "#d9742a" : "#3a4f8f");
        t(sim.score.toLocaleString("en-US"), py - 116, 38, "#54331a");
        t(`${fresh ? "New best" : mode === "daily" ? `Today ${(save.daily[day.key] ?? 0).toLocaleString("en-US")}` : `Best ${save.best.toLocaleString("en-US")}`}`, py - 86, 13, "#9a6b3e");
        if (top >= 0) t(`Biggest: ${SPECIES[top].name}`, py + 38, 14, "#54331a", cx - 76);
        if (nextUp >= 0) t(nextUp === top + 1 ? "So close to meeting..." : "Still outside:", py + 38, 13, "#3a4f8f", cx + 80, false);
        t(`${sim.drops} tucked in  ·  ${mins}m ${secs}s  ·  chain ${sim.bestChain}`, py + 64, 13, "#7c5a3a", cx, false);
        const again = button(s, "Again", { w: 176, h: 56, size: 23, layer: 90, action: "confirm", onTap: () => { game.sfx("click"); game.go("play", { mode }, { fade: 0.18 }); }, name: "Again" });
        again.pos.set(cx + 52, py + 118);
        const home = button(s, "Burrow", { w: 92, h: 56, size: 15, layer: 90, color: "#dfe7ff", edge: "#7f8fc7", ink: "#27335f", onTap: () => { game.sfx("click"); game.go("title", {}, { fade: 0.18 }); }, name: "Home" });
        home.pos.set(cx - 96, py + 118);
    }

    // --- Drawing ---------------------------------------------------------------------------------
    s.add([{
        name: "stump back", layer: 0,
        draw(d) {
            const { W, artW, artH, artY } = WORLD, k = L.k;
            d.sprite("tubBack", { x: wx(W / 2), y: wy(artY + artH / 2), width: artW * k, height: artH * k });
            // the dare marks on the back wall, so height is always legible
            for (let i = 1; i < 3; i++) {
                const y = wy(DARE[i].top);
                for (let x = 8; x < W; x += 16) d.rect(8 * k, 1.6 * k, { x: wx(x), y, color: "#ffe9c4", opacity: sim.dare >= i ? 0.3 : 0.14, radius: 1 });
            }
        },
    }]);
    s.add([{
        name: "pile", layer: 2,
        draw(d) {
            const alpha = game._alpha ?? 1, k = L.k;
            // guide
            if (!sim.over && !shown && !paused) {
                const r = sim.pieceRadius(sim.held);
                let land = WORLD.H - r, hit = null;
                for (const b of sim.bodies) {
                    const dx = Math.abs(b.x - held.x), R = r + b.r;
                    if (dx < R) { const y = b.y - Math.sqrt(R * R - dx * dx); if (y < land) { land = y; hit = b; } }
                }
                const match = hit && ((hit.kind === "c" && hit.t === sim.held) || (sim.held === "acorn" && hit.kind === "c"));
                const col = match ? "#ffe07a" : "#ffffff", yy0 = WORLD.dropY + r + 6;
                for (let y = yy0; y < land; y += 14) d.circle((match ? 2 : 1.5) * k, { x: wx(held.x), y: wy(y), color: col, opacity: (match ? 0.9 : 0.42) * Math.min(1, (y - yy0) / 20 + 0.3) });
                d.circle(r * k, { x: wx(held.x), y: wy(land), color: col, outline: 1.6, opacity: match ? 0.75 : 0.28 });
                if (match) d.circle((hit.r + 3 + Math.sin(s.time * 8)) * k, { x: wx(hit.x), y: wy(hit.y), color: col, outline: 2.2, opacity: 0.8 });
            }
            for (const g of ghosts) {
                const p = 1 - g.life / 0.09, x = g.x0 + (g.x - g.x0) * p, y = g.y0 + (g.y - g.y0) * p, size = 2 * E * g.r * k;
                d.sprite(`c${g.t}`, { x: wx(x), y: wy(y), width: size, height: size });
            }
            const showHeld = !sim.over && !shown;
            drawPile(d, sim, L, s.time, alpha, showHeld ? held : null);
        },
    }]);
    s.add([{
        name: "stump front", layer: 3,
        draw(d) {
            const { W, H, artW, artH, artY } = WORLD, k = L.k;
            d.sprite("tubFront", { x: wx(W / 2), y: wy(artY + artH / 2), width: artW * k, height: artH * k });
            // the draught line
            const dan = sim.danger, a = 0.5 + 0.5 * Math.sin(s.time * (dan > 0 ? 14 : 2.2));
            for (let x = 6; x < W; x += 15) d.rect(9 * k, 2.6 * k, { x: wx(x), y: wy(0), color: dan > 0 ? "#ff7d7d" : "#cfe9ff", opacity: dan > 0 ? 0.55 + a * 0.45 : 0.6 + a * 0.2, radius: 1.3 });
            if (dan > 0) d.rect(W * k, 40 * k * dan, { x: wx(W / 2), y: wy(20 * dan), color: "#ff6b6b", opacity: 0.16 });
            // dare gauge on the left wall
            const gx = wx(-WORLD.wall / 2 - 0.5);
            for (let i = 0; i < 3; i++) {
                const y0 = wy(i === 0 ? H - 6 : DARE[i].top), y1 = wy(i === 2 ? 2 : DARE[i + 1].top), on = sim.dare > i - 1 && sim.dare >= i, col = ["#7ed0a8", "#ffd25e", "#ff9d5c"][i];
                d.rect(4 * k, Math.abs(y1 - y0) - 3, { x: gx, y: (y0 + y1) / 2, color: on ? col : "#2b1a15", opacity: on ? 0.95 : 0.5, radius: 2 });
            }
        },
    }]);
    s.onDraw((d) => {
        for (const r of rings) {
            const p = 1 - r.life / r.max, e = 1 - (1 - p) * (1 - p);
            d.circle(r.r + (r.to - r.r) * e, { x: r.x, y: r.y, color: r.col, outline: 5 * (1 - p) + 1, opacity: (1 - p) * 0.7 });
        }
        for (const q of parts) {
            const k = q.life / q.max, sz = q.size * (0.5 + 0.5 * k), c = Math.cos(q.rot) * sz / 72, n = Math.sin(q.rot) * sz / 72;
            setM(d, c, n, -n, c, q.x, q.y);
            d.sprite("fx", { frame: q.f, color: q.col, opacity: Math.min(1, k * 2) });
        }
        d.reset();
        for (const f of floats) {
            const k = f.life / f.max, pop = Math.min(1, (1 - k) * 8);
            d.text(f.txt, { x: f.x + 1, y: f.y + 1.5, size: f.size, bold: true, font: FONT, color: "#2a1a44", opacity: Math.min(1, k * 2) * pop * 0.8 });
            d.text(f.txt, { x: f.x, y: f.y, size: f.size, bold: true, font: FONT, color: f.col, opacity: Math.min(1, k * 2) * pop });
        }
    });
    layerDraw(s, "hud", 30, (d) => {
        const v = view(), sf = v.safe;
        // next piece: a little hanging sign
        const nq = sim.next, nname = nq === "acorn" ? "acorn" : nq === "snow" ? "snowball" : `c${nq}`;
        const nx = L.wide ? (v.width - sf.right + L.right) / 2 : 38, ny = L.wide ? sf.top + 72 : sf.top + 42, nr = L.wide ? 36 : 25;
        d.circle(nr + 3, { x: nx, y: ny, color: "#0c1030", opacity: 0.32 });
        d.circle(nr, { x: nx, y: ny, color: "#ffffff", opacity: 0.16 });
        d.sprite(`${nname}_s`, { x: nx, y: ny, width: nr * 1.9, height: nr * 1.9 });

        // the ladder: who comes next, up the tiers
        const seen = (t) => save.seen.includes(t) || sim.made[t] > 0;
        const cols = 6, cell = L.wide ? Math.min(30, (sf.left + L.left - 8 - 12) / cols * 1.6, (v.height - sf.top - sf.bottom - 210) / 6 / 0.82) : Math.min(29, (v.width - 196) / cols);
        const lcx = L.wide ? (sf.left + L.left) / 2 : 100 + (v.width - 196) * 0.5;
        const perRow = L.wide ? 3 : cols, ly0 = L.wide ? sf.top + 104 : v.height - sf.bottom - 38 - cell * 0.5 + 2;
        for (let t = 0; t < TIERS; t++) {
            const row = Math.floor(t / perRow), col = t % perRow, x = lcx + (col - (perRow - 1) / 2) * cell * 1.02, y = ly0 + row * cell * (L.wide ? 1 : 0.98);
            const sz = cell * 1.26;
            if (sim.highest === t) d.circle(cell * 0.53, { x, y, color: "#ffe07a", opacity: 0.6 });
            d.sprite(seen(t) ? `c${t}_s` : `c${t}_x`, { x, y, width: sz, height: sz });
        }

        // Dare badge
        const dd = DARE[sim.dare], chainOn = sim.chain > 1;
        const bx = L.wide ? (sf.left + L.left) / 2 : v.width - sf.right - 46, by = L.wide ? v.height - sf.bottom - 46 : v.height - sf.bottom - 48, pop = 1 + dareBump * 0.3;
        const col = ["#7ed0a8", "#ffd25e", "#ff9d5c", "#ff6b6b"][sim.dare];
        d.rect(76 * pop, 36 * pop, { x: bx, y: by, color: "#10163c", opacity: 0.86, radius: 15 });
        d.text(`x${dd.mult}`, { x: bx, y: by - 0.5, size: 20 * pop, bold: true, font: FONT, color: col });
        d.text(dd.name, { x: bx, y: by + 28, size: 13, bold: true, font: FONT, color: "#27335f" });
        if (chainOn) {
            const cx = L.wide ? bx : v.width / 2 + 2, cy = L.wide ? by - 58 : sf.top + 68, w = 86 * Math.max(0, sim.chainT / CHAIN_WINDOW);
            d.rect(92, 26, { x: cx, y: cy, color: "#ffd25e", radius: 13 });
            d.text(`Chain x${Math.min(sim.chain, 6)}`, { x: cx, y: cy - 1, size: 14, bold: true, font: FONT, color: "#5a2e0c" });
            d.rect(w, 3, { x: cx, y: cy + 10, color: "#a35a12", radius: 1.5 });
        }
        if (toastT > 0 && toast) {
            const a = Math.min(1, toastT * 3), tx = v.width / 2, ty = wy(70);
            d.rect(Math.min(v.width - 20, 300), 34, { x: tx, y: ty, color: "#0c1030", opacity: 0.68 * a, radius: 17 });
            d.text(toast, { x: tx, y: ty - 0.5, size: 14, bold: true, font: FONT, color: "#fff4dd", opacity: a });
        }
        if (hintT > 0) {
            const hx = wx(150 + Math.sin(s.time * 2) * 90), hy = wy(WORLD.dropY + 66);
            d.rect(226, 58, { x: v.width / 2, y: wy(150), color: "#0c1030", opacity: 0.6, radius: 18 });
            d.text("Drag to aim, let go to drop", { x: v.width / 2, y: wy(150) - 11, size: 15, bold: true, font: FONT, color: "#fff4dd" });
            d.text("Two the same snuggle up!", { x: v.width / 2, y: wy(150) + 11, size: 14, font: FONT, color: "#ffe08a" });
            d.circle(13, { x: hx, y: hy, color: "#ffffff", opacity: 0.32 });
            d.circle(8, { x: hx, y: hy, color: "#ffffff", opacity: 0.75 });
        }
        if (celebrate) {
            const c = celebrate, p = 1 - c.life / c.max, q = Math.min(1, p * 7), sz = 104 * q * (1 + Math.sin(q * 3.14) * 0.2), a = Math.min(1, c.life * 3), y = wy(66), cx = v.width / 2;
            d.circle(66 * q, { x: cx, y: y + 6, color: "#fff4d6", opacity: 0.94 * a });
            if (sz > 8) portrait(d, c.t, cx, y - 4, sz, "happy", a);
            d.text("New friend!", { x: cx, y: y + 44, size: 13, bold: true, font: FONT, color: "#d9742a", opacity: a });
            d.text(SPECIES[c.t].name, { x: cx, y: y + 58, size: 13, bold: true, font: FONT, color: "#54331a", opacity: a });
        }
        if (sim.danger > 0 && !sim.over) {
            const left = Math.max(0, (1 - sim.danger) * OVER_LIMIT);
            d.text(left.toFixed(1), { x: v.width / 2, y: wy(-34), size: 22, bold: true, font: FONT, color: "#ff8a8a" });
        }
    });
});

/** Headless and screenshot helper: play n drops at human pace in the current play scene. */
game.autoplay = (n, seedRng = 12345, skill = 1) => {
    const sim = game.sim, rng = mulberry(seedRng);
    for (let i = 0; i < n && !sim.over; i++) {
        sim.aim = botPick(sim, rng, skill);
        sim.wantDrop = true;
        game.step(1);
        game.step(sim.danger > 0.3 ? 40 : 76);
        if (sim.danger > 0.4 && sim.snores > 0) sim.snore();
    }
};

game.start("title");
if (typeof document !== "undefined") {
    document.getElementById("boot")?.remove();
    // Pogo workaround: after a long synchronous startup the first rAF timestamp is older than the loop's
    // lastTime, so its accumulator goes negative by the length of the paint and the game freezes for that
    // long. Clamp it back to zero until the first real step has run.
    const unstick = () => { if (game.accumulator < 0) game.accumulator = 0; if (game.stepCount < 3) requestAnimationFrame(unstick); };
    requestAnimationFrame(unstick);
}
