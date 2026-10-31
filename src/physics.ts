// A small arcade physics engine shared by 2D and 3D. Colliders are axis-aligned boxes and circles/spheres;
// rotation is ignored by design because it keeps behaviour predictable for platformers, runners and shooters.
import { Vec, VecLike, toVec } from "./math";
import type { Entity } from "./entity";
import type { Scene } from "./scene";

export interface Hit { other: Entity; normal: Vec; depth: number; }
export interface RayHit { entity: Entity; point: Vec; normal: Vec; dist: number; }

interface Bounds { cx: number; cy: number; cz: number; hx: number; hy: number; hz: number; r: number; }

const AXES = ["x", "y", "z"] as const, CENTER = ["cx", "cy", "cz"] as const, HALF = ["hx", "hy", "hz"] as const;
const SKIN = 1e-4;

function bounds(e: Entity): Bounds {
    const c = e.collider, p = e.worldPos(), s = e.scale;
    const size = c.size ?? e.size;
    const hx = Math.abs(size.x * s.x * c.scale) / 2, hy = Math.abs(size.y * s.y * c.scale) / 2;
    const hz = e.dim === 3 ? Math.abs(size.z * s.z * c.scale) / 2 : 0;
    return { cx: p.x + c.offset.x, cy: p.y + c.offset.y, cz: e.dim === 3 ? p.z + c.offset.z : 0, hx, hy, hz, r: c.shape === "circle" ? Math.max(hx, hy, hz) : 0 };
}

/** Overlap test with a contact normal pointing from b towards a. */
function overlap(a: Bounds, b: Bounds, dim: number, eps: number): { normal: Vec; depth: number } | null {
    if (a.r && b.r) {
        const d = new Vec(a.cx - b.cx, a.cy - b.cy, a.cz - b.cz), len = d.len(), depth = a.r + b.r + eps - len;
        return depth > 0 ? { normal: len > 1e-9 ? d.mul(1 / len) : new Vec(0, -1), depth } : null;
    }
    if (a.r || b.r) {
        const flip = !!b.r;
        const c = flip ? b : a, box = flip ? a : b;
        const near = new Vec(clampTo(c.cx, box.cx, box.hx), clampTo(c.cy, box.cy, box.hy), clampTo(c.cz, box.cz, box.hz));
        const d = new Vec(c.cx - near.x, c.cy - near.y, c.cz - near.z), len = d.len();
        if (len >= c.r + eps) return null;
        if (len < 1e-9) { // centre inside the box: leave by the nearest face
            const dx = box.hx - Math.abs(c.cx - box.cx), dy = box.hy - Math.abs(c.cy - box.cy), dz = dim === 3 ? box.hz - Math.abs(c.cz - box.cz) : Infinity;
            let n = new Vec(Math.sign(c.cx - box.cx) || 1), depth = dx + c.r;
            if (dy < dx && dy <= dz) { n = new Vec(0, Math.sign(c.cy - box.cy) || 1); depth = dy + c.r; }
            else if (dz < dx) { n = new Vec(0, 0, Math.sign(c.cz - box.cz) || 1); depth = dz + c.r; }
            return { normal: flip ? n.mul(-1) : n, depth };
        }
        const n = d.mul(1 / len);
        return { normal: flip ? n.mul(-1) : n, depth: c.r + eps - len };
    }
    const ox = a.hx + b.hx + eps - Math.abs(a.cx - b.cx);
    const oy = a.hy + b.hy + eps - Math.abs(a.cy - b.cy);
    const oz = dim === 3 ? a.hz + b.hz + eps - Math.abs(a.cz - b.cz) : Infinity;
    if (ox <= 0 || oy <= 0 || oz <= 0) return null;
    if (ox <= oy && ox <= oz) return { normal: new Vec(a.cx >= b.cx ? 1 : -1), depth: ox };
    if (oy <= oz) return { normal: new Vec(0, a.cy >= b.cy ? 1 : -1), depth: oy };
    return { normal: new Vec(0, 0, a.cz >= b.cz ? 1 : -1), depth: oz };
}

const clampTo = (v: number, c: number, h: number) => Math.min(c + h, Math.max(c - h, v));

/** Uniform spatial hash; very large entities are kept apart so they don't fill thousands of cells. */
class Grid {
    private cells = new Map<number, Entity[]>();
    private big: Entity[] = [];
    private cell: number;
    private stamp = new Map<number, number>();
    private tick = 0;
    constructor(private items: Entity[], private dim: number) {
        let total = 0;
        const list = items.map((e) => { const b = bounds(e); total += Math.max(b.hx, b.hy, dim === 3 ? b.hz : 0, b.r); return [e, b] as const; });
        this.cell = Math.max((total / Math.max(1, items.length)) * 3, 1e-3);
        for (const [e, b] of list) this.insert(e, b);
    }
    private key(x: number, y: number, z: number) { return (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) | 0; }
    private span(b: Bounds, pad: number) {
        const c = this.cell, e = pad + b.r, f = (v: number) => Math.floor(v / c);
        return {
            x0: f(b.cx - b.hx - e), x1: f(b.cx + b.hx + e), y0: f(b.cy - b.hy - e), y1: f(b.cy + b.hy + e),
            z0: this.dim === 3 ? f(b.cz - b.hz - e) : 0, z1: this.dim === 3 ? f(b.cz + b.hz + e) : 0,
        };
    }
    private insert(e: Entity, b: Bounds) {
        const s = this.span(b, 0);
        if ((s.x1 - s.x0 + 1) * (s.y1 - s.y0 + 1) * (s.z1 - s.z0 + 1) > 64) { this.big.push(e); return; }
        for (let x = s.x0; x <= s.x1; x++) for (let y = s.y0; y <= s.y1; y++) for (let z = s.z0; z <= s.z1; z++) {
            const k = this.key(x, y, z);
            let arr = this.cells.get(k);
            if (!arr) this.cells.set(k, (arr = []));
            arr.push(e);
        }
    }
    near(b: Bounds, pad: number, fn: (e: Entity) => void) {
        if (!this.items.length) return;
        const t = ++this.tick, s = this.span(b, pad);
        // A query much larger than the cells would visit mostly empty cells, so a plain scan is the cheaper bound.
        if ((s.x1 - s.x0 + 1) * (s.y1 - s.y0 + 1) * (s.z1 - s.z0 + 1) > this.items.length) { for (const e of this.items) fn(e); return; }
        const visit = (e: Entity) => { if (this.stamp.get(e.id) !== t) { this.stamp.set(e.id, t); fn(e); } };
        for (const e of this.big) visit(e);
        for (let x = s.x0; x <= s.x1; x++) for (let y = s.y0; y <= s.y1; y++) for (let z = s.z0; z <= s.z1; z++) {
            const arr = this.cells.get(this.key(x, y, z));
            if (arr) for (const e of arr) visit(e);
        }
    }
}

function ignores(a: Entity, b: Entity) {
    for (const t of a.collider.ignore) if (b.is(t)) return true;
    for (const t of b.collider.ignore) if (a.is(t)) return true;
    return false;
}

export function stepPhysics(scene: Scene, dt: number) {
    const all = scene.entities.filter((e) => e.alive && e.collider && !e.hidden);
    for (const dim of [2, 3] as const) {
        const list = all.filter((e) => e.dim === dim);
        if (!list.length) continue;
        moveBodies(scene, list, dim, dt);
        separateBodies(list, dim);
        contacts(scene, list, dim);
    }
}

function moveBodies(scene: Scene, list: Entity[], dim: 2 | 3, dt: number) {
    const bodies = list.filter((e) => e.body && !e.collider.sensor && !e.body.frozen);
    const free = list.filter((e) => e.body && e.collider.sensor && !e.body.frozen);
    const solids = list.filter((e) => e.collider.solid && !e.collider.sensor);
    const g = dim === 2 ? scene.gravity2 : scene.gravity3;
    const grid = new Grid(solids, dim);

    for (const e of free) integrate(e, g, dt);
    for (const e of bodies) {
        integrate(e, g, dt);
        const b = e.body, ground: Entity | null = b.groundEntity;
        // Ride whatever we're standing on.
        if (ground?.alive) e.pos.set(e.pos.add(ground.pos.sub(ground._prevPos)));
        e.grounded = false;
        b.groundEntity = null;

        const box = bounds(e);
        const reach = Math.max(Math.min(box.hx || box.r, box.hy || box.r) * 0.9, 1e-3);
        const speed = Math.max(Math.abs(e.vel.x), Math.abs(e.vel.y), Math.abs(e.vel.z)) * dt;
        const steps = Math.min(8, Math.max(1, Math.ceil(speed / reach)));
        const h = dt / steps;
        for (let i = 0; i < steps; i++) {
            if (box.r) moveSphere(e, grid, dim, g, h);
            else for (let a = 0; a < dim; a++) moveAxis(e, a, grid, dim, g, h);
        }
        if (e.grounded && b.friction) {
            const k = Math.max(0, 1 - b.friction * dt);
            for (let a = 0; a < dim; a++) if (g[AXES[a]] === 0) e.vel[AXES[a]] *= k;
        }
    }
}

function integrate(e: Entity, g: Vec, dt: number) {
    const b = e.body;
    e.vel.x += g.x * b.gravity * dt; e.vel.y += g.y * b.gravity * dt; e.vel.z += g.z * b.gravity * dt;
    if (b.drag) { const k = Math.max(0, 1 - b.drag * dt); e.vel.x *= k; e.vel.y *= k; e.vel.z *= k; }
    if (b.maxSpeed) { const l = e.vel.len(); if (l > b.maxSpeed) e.vel.set(e.vel.mul(b.maxSpeed / l)); }
    if (e.collider.sensor) { e.pos.x += e.vel.x * dt; e.pos.y += e.vel.y * dt; e.pos.z += e.vel.z * dt; }
}

function landed(e: Entity, normal: Vec, g: Vec, other: Entity) {
    if (normal.dot(g) < -0.5 * g.len()) { e.grounded = true; e.body.groundEntity = other; }
}

function moveAxis(e: Entity, axis: number, grid: Grid, dim: number, g: Vec, dt: number) {
    const name = AXES[axis], d = e.vel[name] * dt;
    if (d === 0) return;
    const before = bounds(e);
    e.pos[name] += d;
    grid.near(bounds(e), Math.abs(d) + SKIN, (s) => {
        if (s === e || ignores(e, s)) return;
        const o = bounds(s), cur = bounds(e);
        // Already inside before this move, e.g. shoved by another body: leave that to depenetrate(),
        // because resolving by travel direction would teleport it to the far side of a long wall.
        if (Math.abs(before[CENTER[axis]] - o[CENTER[axis]]) < before[HALF[axis]] + o[HALF[axis]] - SKIN && !s.collider.oneWay) return;
        for (let a = 0; a < dim; a++) {
            // The skin stops float drift registering a floor as a wall while running across tile seams.
            if (Math.abs(cur[CENTER[a]] - o[CENTER[a]]) >= cur[HALF[a]] + o[HALF[a]] - (a === axis ? 0 : SKIN)) return;
        }
        const gap = HALF[axis], ctr = CENTER[axis], sh = o[gap];
        if (s.collider.oneWay) {
            const dir = Math.sign(g[name]);
            if (dir === 0 || Math.sign(d) !== dir) return;
            if ((before[ctr] + dir * before[gap] - (o[ctr] - dir * sh)) * dir > 0.01 * Math.max(1, sh)) return;
        }
        const side = -Math.sign(d);
        e.pos[name] = o[ctr] + side * (sh + cur[gap]) - e.collider.offset[name];
        const n = new Vec();
        n[name] = side;
        const v = e.vel[name];
        e.vel[name] = Math.abs(v) * e.body.bounce > 20 * (dim === 2 ? 1 : 0.05) ? -v * e.body.bounce : 0;
        landed(e, n, g, s);
    });
}

function moveSphere(e: Entity, grid: Grid, dim: number, g: Vec, dt: number) {
    e.pos.x += e.vel.x * dt; e.pos.y += e.vel.y * dt; if (dim === 3) e.pos.z += e.vel.z * dt;
    grid.near(bounds(e), 0.001, (s) => {
        if (s === e || ignores(e, s)) return;
        const hit = overlap(bounds(e), bounds(s), dim, 0);
        if (!hit) return;
        e.pos.set(e.pos.add(hit.normal.mul(hit.depth)));
        const vn = e.vel.dot(hit.normal);
        if (vn < 0) e.vel.set(e.vel.sub(hit.normal.mul(vn * (1 + (-vn > 20 * (dim === 2 ? 1 : 0.05) ? e.body.bounce : 0)))));
        landed(e, hit.normal, g, s);
    });
}

/** Push a body out of solids along the shallowest axis. */
function depenetrate(e: Entity, grid: Grid, dim: number) {
    for (let pass = 0; pass < 3; pass++) {
        let moved = false;
        grid.near(bounds(e), 0, (s) => {
            if (s === e || s.collider.oneWay || ignores(e, s)) return;
            const hit = overlap(bounds(e), bounds(s), dim, 0);
            if (!hit || hit.depth <= SKIN) return;
            e.pos.set(e.pos.add(hit.normal.mul(hit.depth)));
            const vn = e.vel.dot(hit.normal);
            if (vn < 0) e.vel.set(e.vel.sub(hit.normal.mul(vn)));
            moved = true;
        });
        if (!moved) return;
    }
}

function separateBodies(list: Entity[], dim: number) {
    const movers = list.filter((e) => e.body && !e.collider.sensor);
    if (!movers.length) return;
    const solids = new Grid(list.filter((e) => e.collider.solid && !e.collider.sensor), dim);
    if (movers.length < 2) { depenetrate(movers[0], solids, dim); return; }
    const grid = new Grid(movers, dim);
    for (const a of movers) {
        grid.near(bounds(a), 0, (b) => {
            if (b.id <= a.id || ignores(a, b)) return;
            const hit = overlap(bounds(a), bounds(b), dim, 0);
            if (!hit) return;
            const ma = a.body.mass, mb = b.body.mass, total = ma + mb;
            a.pos.set(a.pos.add(hit.normal.mul((hit.depth * mb) / total)));
            b.pos.set(b.pos.sub(hit.normal.mul((hit.depth * ma) / total)));
            const rel = a.vel.sub(b.vel).dot(hit.normal);
            if (rel < 0) {
                const j = (-(1 + Math.min(a.body.bounce, b.body.bounce)) * rel) / (1 / ma + 1 / mb);
                a.vel.set(a.vel.add(hit.normal.mul(j / ma)));
                b.vel.set(b.vel.sub(hit.normal.mul(j / mb)));
            }
        });
    }
    for (const e of movers) depenetrate(e, solids, dim);
}

function contacts(scene: Scene, list: Entity[], dim: 2 | 3) {
    const eps = dim === 2 ? 0.5 : 0.02; // resolved bodies sit exactly flush, so test slightly expanded
    const grid = new Grid(list, dim);
    const now = scene._contactsNow;
    for (const a of list) {
        if (a.collider.solid && !a.body && !a.collider.watch) continue; // walls don't need their own scan
        const ba = bounds(a);
        grid.near(ba, eps, (b) => {
            if (a === b || ignores(a, b)) return;
            if (a.body && b.body && b.id < a.id) return; // each mover pair once
            const hit = overlap(ba, bounds(b), dim, eps);
            if (!hit) return;
            const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
            if (now.has(key)) return;
            now.set(key, [a, b, hit]);
        });
    }
}

/** Fire collide/collideEnd once all dimensions are done. */
export function flushContacts(scene: Scene) {
    const now = scene._contactsNow, prev = scene._contactsPrev;
    for (const [key, [a, b, hit]] of now) {
        if (prev.has(key)) continue;
        if (a.alive && b.alive) a.emit("collide", b, { other: b, normal: hit.normal, depth: hit.depth } as Hit);
        if (a.alive && b.alive) b.emit("collide", a, { other: a, normal: hit.normal.mul(-1), depth: hit.depth } as Hit);
    }
    for (const [key, [a, b]] of prev) {
        if (now.has(key)) continue;
        if (a.alive) a.emit("collideEnd", b);
        if (b.alive) b.emit("collideEnd", a);
    }
    scene._contactsPrev = now;
    scene._contactsNow = new Map();
}

/** Which space a query means: whichever one has colliders; if both do, 3D when the query uses z. */
function queryDim(scene: Scene, usesZ: boolean): 2 | 3 {
    let has2 = false, has3 = false;
    for (const e of scene.entities) if (e.collider) { if (e.dim === 3) has3 = true; else has2 = true; }
    return has3 && !has2 ? 3 : has2 && !has3 ? 2 : usesZ ? 3 : 2;
}

/** Nearest collider hit by a ray. */
export function raycast(scene: Scene, origin: VecLike, dir: VecLike, o: { max?: number; tag?: string; ignore?: Entity | Entity[]; dim?: 2 | 3 } = {}): RayHit | null {
    const from = toVec(origin), d = toVec(dir).norm(), max = o.max ?? Infinity;
    const dim = o.dim ?? queryDim(scene, from.z !== 0 || d.z !== 0);
    const skip = new Set(Array.isArray(o.ignore) ? o.ignore : o.ignore ? [o.ignore] : []);
    let best: RayHit | null = null;
    for (const e of scene.entities) {
        if (!e.alive || !e.collider || e.hidden || e.dim !== dim || skip.has(e)) continue;
        if (o.tag && !e.is(o.tag)) continue;
        const hit = rayBounds(from, d, bounds(e), dim);
        if (hit && hit.dist <= max && (!best || hit.dist < best.dist)) best = { entity: e, ...hit };
    }
    return best;
}

function rayBounds(o: Vec, d: Vec, b: Bounds, dim: number) {
    if (b.r) {
        const c = new Vec(b.cx, b.cy, b.cz), oc = o.sub(c), bq = oc.dot(d), disc = bq * bq - (oc.dot(oc) - b.r * b.r);
        if (disc < 0) return null;
        const t = -bq - Math.sqrt(disc);
        if (t < 0) return null;
        const point = o.add(d.mul(t));
        return { dist: t, point, normal: point.sub(c).norm() };
    }
    let t0 = 0, t1 = Infinity, axis = -1;
    const c = [b.cx, b.cy, b.cz], h = [b.hx, b.hy, b.hz], p = [o.x, o.y, o.z], v = [d.x, d.y, d.z];
    for (let i = 0; i < dim; i++) {
        if (Math.abs(v[i]) < 1e-12) {
            if (Math.abs(p[i] - c[i]) > h[i]) return null;
            continue;
        }
        let a = (c[i] - h[i] - p[i]) / v[i], z = (c[i] + h[i] - p[i]) / v[i];
        if (a > z) [a, z] = [z, a];
        if (a > t0) { t0 = a; axis = i; }
        t1 = Math.min(t1, z);
        if (t0 > t1) return null;
    }
    const normal = new Vec();
    if (axis >= 0) normal[AXES[axis]] = -Math.sign(v[axis]);
    return { dist: t0, point: o.add(d.mul(t0)), normal };
}

/** Entities whose colliders overlap a box (size) or circle/sphere (radius) at a point. */
export function overlapQuery(scene: Scene, at: VecLike, shape: { radius?: number; size?: VecLike; tag?: string; dim?: 2 | 3 }): Entity[] {
    const p = toVec(at), dim = shape.dim ?? queryDim(scene, p.z !== 0);
    const s = shape.size ? toVec(shape.size) : new Vec();
    const q: Bounds = { cx: p.x, cy: p.y, cz: dim === 3 ? p.z : 0, hx: s.x / 2, hy: s.y / 2, hz: dim === 3 ? s.z / 2 : 0, r: shape.radius ?? 0 };
    return scene.entities.filter((e) => e.alive && e.collider && !e.hidden && e.dim === dim && (!shape.tag || e.is(shape.tag)) && overlap(q, bounds(e), dim, 0));
}

/** @internal World-space bounds for tap hit tests and debug views. */
export const entityBounds = bounds;
export { rayBounds };
