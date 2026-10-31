// A Scene owns entities, timers, tweens, particles and cameras. Everything in it dies with it.
import { Camera2D, Camera3D } from "./camera";
import { CompList, Entity } from "./entity";
import { PogoError } from "./errors";
import { Color, color, ColorLike, Easing, easings, mat4Compose, mat4Mul, Vec, VecLike, toVec } from "./math";
import { Hit, flushContacts, overlapQuery, raycast, RayHit, rayBounds, stepPhysics, entityBounds } from "./physics";
import type { Game } from "./game";
import type { Light3D } from "./render/backend";
import type { Draw } from "./render/draw";

export interface TimerHandle { cancel(): void; }
interface Timer { left: number; repeat: number; fn: () => void; owner: Entity | null; dead: boolean; }
interface TweenTrack { obj: any; key: string; from: number; to: number; }
interface Tween { tracks: TweenTrack[] | null; spec: [any, Record<string, any>]; t: number; dur: number; delay: number; ease: (t: number) => number; onDone?: () => void; owner: Entity | null; dead: boolean; yoyo: boolean; loop: boolean; }
interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; s0: number; s1: number; c: Color; g: number; dim: 2 | 3; }

export interface BurstOptions {
    at: VecLike | Entity;
    count?: number;
    color?: ColorLike | ColorLike[];
    speed?: number | [number, number];
    life?: number | [number, number];
    size?: number | [number, number];
    /** Multiplier on gravity. Default 0 in 2D games' UI-ish bursts; set 1 for debris. */
    gravity?: number;
    /** 2D: emission angle in radians, with `spread` around it. Default is a full circle. */
    angle?: number;
    spread?: number;
    dim?: 2 | 3;
}

export interface TilemapOptions {
    /** Tile size in world units. */
    size: number;
    /** Map a character to a component list; pos is applied for you. A function receives (col, row). */
    legend: Record<string, CompList | ((col: number, row: number) => CompList)>;
    x?: number;
    y?: number;
    z?: number;
    /** "xy" for 2D (default); "xz" lays the map on a 3D floor. */
    plane?: "xy" | "xz";
}

const MAX_PARTICLES = 1500;

export class Scene {
    /** Every live entity, including children. */
    entities: Entity[] = [];
    readonly cam: Camera2D;
    readonly cam3: Camera3D;
    readonly light: Light3D = {
        dir: new Vec(-0.5, -1, -0.35), color: new Color(0.85, 0.82, 0.74), sky: new Color(0.62, 0.68, 0.78), ground: new Color(0.36, 0.33, 0.3),
        shadows: true, shadowRange: 24, fog: null,
    };
    /** Gravity for 2D bodies, in units/s². y is down. */
    gravity2 = new Vec(0, 1400);
    /** Gravity for 3D bodies, in units/s². y is up. */
    gravity3 = new Vec(0, -24, 0);
    /** Seconds this scene has simulated. */
    time = 0;
    /** Stops timers, tweens, physics and non-UI updates. UI keeps working so pause menus function. */
    paused = false;
    /** Override the game's background for this scene: one color, or [top, bottom] for a gradient. */
    background: ColorLike | [ColorLike, ColorLike] | null = null;

    _contactsNow = new Map<string, [Entity, Entity, { normal: Vec; depth: number }]>();
    _contactsPrev = new Map<string, [Entity, Entity, { normal: Vec; depth: number }]>();
    private timers: Timer[] = [];
    private tweens: Tween[] = [];
    private updaters: ((dt: number) => void)[] = [];
    private drawers: ((d: Draw) => void)[] = [];
    private uiDrawers: ((d: Draw) => void)[] = [];
    private listeners = new Map<string, Set<(...a: any[]) => void>>();
    private particles: Particle[] = [];
    private shakeAmt = 0;
    private shakeLeft = 0;
    private shakeDur = 0;
    private flashColor: Color | null = null;
    private flashLeft = 0;
    private flashDur = 0;
    private pressedEntity: Entity | null = null;
    private order = 0;

    constructor(readonly game: Game, readonly name: string) {
        this.cam = new Camera2D(() => game.view);
        this.cam3 = new Camera3D(() => game.view);
    }

    get input() { return this.game.input; }
    get rng() { return this.game.rng; }
    get view() { return this.game.view; }
    get assets() { return this.game.assets; }
    /** Play a sound. */
    sfx(s: Parameters<Game["sfx"]>[0]) { this.game.sfx(s); }

    // --- Entities ---------------------------------------------------------------------
    add(list: CompList) { return this._spawn(list, null); }

    /** @internal */
    _spawn(list: CompList, parent: Entity | null) {
        if (!Array.isArray(list)) throw new PogoError("BAD_COMPONENT", "add() takes an array of components.", "Write add([rect(10, 10), pos(5, 5)]), not add(rect(10, 10)).");
        const e = new Entity(this);
        e._bornStep = this.game.stepCount;
        e.parent = parent;
        if (parent) { e.dim = parent.dim; e.ui = parent.ui; parent.children.push(e); }
        const comps = e._use(list);
        e._prevPos.set(e.pos);
        e._prevRot.set(e.rot);
        this.entities.push(e);
        for (const c of comps) c.add?.call(e, e);
        return e;
    }

    /** All live entities with this tag or name. */
    find(tag: string) { return this.entities.filter((e) => e.alive && (e.is(tag) || e.name === tag)); }
    /** First live entity with this tag or name. */
    first(tag: string): Entity | undefined { return this.entities.find((e) => e.alive && (e.is(tag) || e.name === tag)); }

    /** Build a grid of entities from text. "." and " " are empty. */
    tilemap(map: string | string[], o: TilemapOptions) {
        const rows = (typeof map === "string" ? map.split("\n") : map).map((r) => r.trim()).filter((r) => r.length);
        const out: Entity[] = [], plane = o.plane ?? "xy", x0 = o.x ?? 0, y0 = o.y ?? 0, z0 = o.z ?? 0, s = o.size;
        rows.forEach((row, r) => {
            [...row].forEach((ch, c) => {
                if (ch === "." || ch === " ") return;
                const def = o.legend[ch];
                if (def === undefined) throw new PogoError("BAD_TILE", `Tilemap row ${r} uses "${ch}", which is not in the legend.`, `Legend has: ${Object.keys(o.legend).join(" ")}. "." and space are empty.`);
                const list = typeof def === "function" ? def(c, r) : def;
                const p = plane === "xy" ? new Vec(x0 + (c + 0.5) * s, y0 + (r + 0.5) * s, 0) : new Vec(x0 + (c + 0.5) * s, y0, z0 + (r + 0.5) * s);
                const e = this.add(list);
                e.teleport(e.pos.add(p));
                out.push(e);
            });
        });
        const cols = Math.max(0, ...rows.map((r) => r.length));
        return { entities: out, width: cols * s, height: rows.length * s, cols, rows: rows.length };
    }

    // --- Time ----------------------------------------------------------------------------
    /** Run fn after a delay, in simulated seconds. Cancelled by leaving the scene. */
    wait(seconds: number, fn: () => void, owner: Entity | null = null): TimerHandle {
        const t: Timer = { left: seconds, repeat: 0, fn, owner, dead: false };
        this.timers.push(t);
        return { cancel: () => { t.dead = true; } };
    }
    every(seconds: number, fn: () => void, owner: Entity | null = null): TimerHandle {
        if (seconds <= 0) throw new PogoError("BAD_TIMER", "every() needs a positive interval.");
        const t: Timer = { left: seconds, repeat: seconds, fn, owner, dead: false };
        this.timers.push(t);
        return { cancel: () => { t.dead = true; } };
    }
    /**
     * Animate numeric fields: tween(e, { opacity: 0, scale: 2, pos: [10, 20] }, 0.3, { ease: "outQuad" }).
     * Vec fields tween per-axis. Tweens on an entity stop when it is destroyed.
     */
    tween(target: any, to: Record<string, any>, seconds: number, o: { ease?: Easing; delay?: number; onDone?: () => void; yoyo?: boolean; loop?: boolean } = {}): TimerHandle {
        const tw: Tween = { tracks: null, spec: [target, to], t: 0, dur: Math.max(seconds, 1e-6), delay: o.delay ?? 0, ease: easings[o.ease ?? "outQuad"], onDone: o.onDone, owner: target instanceof Entity ? target : null, dead: false, yoyo: o.yoyo ?? false, loop: o.loop ?? false };
        if (!tw.ease) throw new PogoError("BAD_EASE", `Unknown easing "${o.ease}".`, `Known: ${Object.keys(easings).join(", ")}.`);
        this.tweens.push(tw);
        return { cancel: () => { tw.dead = true; } };
    }

    private tracks(target: any, to: Record<string, any>): TweenTrack[] {
        const out: TweenTrack[] = [];
        for (const key of Object.keys(to)) {
            const cur = target[key], goal = to[key];
            if (cur instanceof Vec) {
                const g = typeof goal === "number" ? new Vec(goal, goal, goal) : toVec(goal);
                for (const a of ["x", "y", "z"] as const) if (g[a] !== cur[a]) out.push({ obj: cur, key: a, from: cur[a], to: g[a] });
            } else if (typeof cur === "number" && typeof goal === "number") out.push({ obj: target, key, from: cur, to: goal });
            else throw new PogoError("BAD_TWEEN", `Cannot tween "${key}" (${typeof cur} to ${typeof goal}).`, "Only numbers and Vec fields can be tweened.");
        }
        return out;
    }

    onUpdate(fn: (dt: number) => void) { this.updaters.push(fn); return () => { this.updaters = this.updaters.filter((f) => f !== fn); }; }
    /** Immediate-mode drawing in 2D world coordinates, after entities. */
    onDraw(fn: (d: Draw) => void) { this.drawers.push(fn); return () => { this.drawers = this.drawers.filter((f) => f !== fn); }; }
    /** Immediate-mode drawing in view coordinates, above everything. */
    onDrawUI(fn: (d: Draw) => void) { this.uiDrawers.push(fn); return () => { this.uiDrawers = this.uiDrawers.filter((f) => f !== fn); }; }

    on(event: string, fn: (...a: any[]) => void) {
        let set = this.listeners.get(event);
        if (!set) this.listeners.set(event, (set = new Set()));
        set.add(fn);
        return () => set!.delete(fn);
    }
    emit(event: string, ...args: any[]) {
        const set = this.listeners.get(event);
        if (set) for (const fn of [...set]) fn(...args);
    }

    // --- Queries --------------------------------------------------------------------------
    raycast(origin: VecLike, dir: VecLike, o?: Parameters<typeof raycast>[3]): RayHit | null { return raycast(this, origin, dir, o); }
    overlap(at: VecLike, shape: Parameters<typeof overlapQuery>[2]) { return overlapQuery(this, at, shape); }
    /** First 3D collider under a view point, e.g. the pointer. */
    pick(x: number, y: number, o: { tag?: string; max?: number } = {}): RayHit | null {
        const r = this.cam3.ray(x, y);
        return raycast(this, r.origin, r.dir, { ...o, dim: 3 });
    }

    // --- Effects ---------------------------------------------------------------------------
    burst(o: BurstOptions) {
        const fx = this.game.fxRng;
        const at = o.at instanceof Entity ? o.at.worldPos() : toVec(o.at), dim = o.dim ?? (o.at instanceof Entity ? o.at.dim : this.dominantDim());
        const pick = (v: number | [number, number] | undefined, d: [number, number]) => { const r = v === undefined ? d : typeof v === "number" ? [v, v] : v; return fx.range(r[0], r[1]); };
        const colors = (Array.isArray(o.color) && typeof o.color[0] !== "number" ? o.color as ColorLike[] : [(o.color ?? "#ffffff") as ColorLike]).map(color);
        const big = dim === 3 ? 0.05 : 1;
        for (let i = 0; i < (o.count ?? 14); i++) {
            const sp = pick(o.speed, [60 * big, 200 * big]), life = pick(o.life, [0.3, 0.7]);
            let v: Vec;
            if (dim === 3) v = new Vec(fx.range(-1, 1), fx.range(-1, 1), fx.range(-1, 1)).norm().mul(sp);
            else v = Vec.fromAngle(o.angle === undefined ? fx.range(Math.PI * 2) : o.angle + fx.range(-(o.spread ?? 0.5), o.spread ?? 0.5), sp);
            const size = pick(o.size, [2 * big * 3, 5 * big * 3]);
            this.particles.push({ x: at.x, y: at.y, z: at.z, vx: v.x, vy: v.y, vz: v.z, life, max: life, s0: size, s1: 0, c: fx.pick(colors), g: o.gravity ?? 0, dim });
        }
        if (this.particles.length > MAX_PARTICLES) this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
    private dominantDim(): 2 | 3 { return this.entities.some((e) => e.dim === 3) ? 3 : 2; }
    /** Shake both cameras. `amount` is world units at the start. */
    shake(amount?: number, seconds = 0.3) {
        this.shakeAmt = amount ?? (this.dominantDim() === 3 ? 0.25 : 6);
        this.shakeLeft = this.shakeDur = seconds;
    }
    /** Flash the whole screen and fade out. */
    flash(c: ColorLike = "#ffffff", seconds = 0.2) {
        this.flashColor = color(c);
        this.flashLeft = this.flashDur = seconds;
    }

    // --- Simulation ---------------------------------------------------------------------------
    /** @internal */
    _step(dt: number) {
        for (const e of this.entities) { e._prevPos.set(e.pos); e._prevRot.set(e.rot); }
        this.cam._snapshot();
        this.cam3._snapshot();
        this.dispatchTaps();
        const run = !this.paused;
        if (run) {
            this.time += dt;
            this.stepTimers(dt);
            this.stepTweens(dt);
            for (const fn of [...this.updaters]) fn(dt);
        }
        const count = this.entities.length; // entities added mid-step start next step
        for (let i = 0; i < count; i++) {
            const e = this.entities[i];
            if (!e.alive || e.paused || (!run && !e.ui)) continue;
            for (const [, fn] of e._hooksUpdate) {
                fn.call(e, dt, e);
                if (!e.alive) break;
            }
        }
        if (run) {
            stepPhysics(this, dt);
            flushContacts(this);
            this.stepParticles(dt);
        }
        this.cam._step(dt);
        this.cam3._step(dt);
        this.stepEffects(dt);
        for (const e of this.entities) {
            if (e.alive && !e.pos.isFinite()) throw new PogoError("NAN_POSITION", `Entity ${e.label} has a non-finite position ${e.pos}.`, "Look for a division by zero or an undefined value in the code that moves it.");
        }
        if (this.entities.some((e) => !e.alive)) {
            this.entities = this.entities.filter((e) => e.alive);
            for (const e of this.entities) if (e.children.some((c) => !c.alive)) e.children = e.children.filter((c) => c.alive);
        }
    }

    private stepTimers(dt: number) {
        for (const t of [...this.timers]) {
            if (t.dead || (t.owner && !t.owner.alive)) { t.dead = true; continue; }
            t.left -= dt;
            while (t.left <= 1e-9 && !t.dead) {
                t.fn();
                if (t.repeat) t.left += t.repeat;
                else t.dead = true;
            }
        }
        this.timers = this.timers.filter((t) => !t.dead);
    }

    private stepTweens(dt: number) {
        for (const tw of [...this.tweens]) {
            if (tw.dead || (tw.owner && !tw.owner.alive)) { tw.dead = true; continue; }
            if (tw.delay > 0) { tw.delay -= dt; continue; }
            tw.tracks ??= this.tracks(tw.spec[0], tw.spec[1]);
            tw.t += dt;
            const p = Math.min(1, tw.t / tw.dur), k = tw.ease(p);
            for (const t of tw.tracks) t.obj[t.key] = t.from + (t.to - t.from) * k;
            if (p >= 1) {
                if (tw.yoyo) { for (const t of tw.tracks) [t.from, t.to] = [t.to, t.from]; }
                if (tw.loop) tw.t = 0;
                else if (tw.yoyo) { tw.yoyo = false; tw.t = 0; }
                else { tw.dead = true; tw.onDone?.(); }
            }
        }
        this.tweens = this.tweens.filter((t) => !t.dead);
    }

    private stepParticles(dt: number) {
        const g2 = this.gravity2, g3 = this.gravity3;
        for (const p of this.particles) {
            const g = p.dim === 3 ? g3 : g2;
            p.vx += g.x * p.g * dt; p.vy += g.y * p.g * dt; p.vz += g.z * p.g * dt;
            p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
            p.life -= dt;
        }
        if (this.particles.some((p) => p.life <= 0)) this.particles = this.particles.filter((p) => p.life > 0);
    }

    private stepEffects(dt: number) {
        const fx = this.game.fxRng;
        if (this.shakeLeft > 0) {
            this.shakeLeft -= dt;
            const a = this.shakeAmt * Math.max(0, this.shakeLeft / this.shakeDur);
            this.cam._shake.set(fx.range(-a, a), fx.range(-a, a), 0);
            this.cam3._shake.set(fx.range(-a, a), fx.range(-a, a), 0);
        } else {
            this.cam._shake.set(0, 0, 0);
            this.cam3._shake.set(0, 0, 0);
        }
        if (this.flashLeft > 0) this.flashLeft -= dt;
    }

    /** @internal Topmost tappable at a view point. */
    _hitTappable(x: number, y: number): Entity | null {
        const scale = this.game.view.scale, min = 44 / scale;
        let best: Entity | null = null;
        const rank = (e: Entity) => (e.ui ? 1e6 : 0) + e.layer;
        for (const e of this.entities) {
            if (!e.alive || !e.tappable || e.hidden || (this.paused && !e.ui)) continue;
            if (best && rank(e) < rank(best)) continue;
            const hit = this.hitTest(e, x, y, min);
            if (hit) best = e;
        }
        return best;
    }

    private hitTest(e: Entity, x: number, y: number, min: number) {
        if (e.dim === 3) {
            const r = this.cam3.ray(x, y), p = e.worldPos(), s = e.size, sc = e.scale;
            return !!rayBounds(r.origin, r.dir, { cx: p.x, cy: p.y, cz: p.z, hx: (s.x * sc.x) / 2, hy: (s.y * sc.y) / 2, hz: (s.z * sc.z) / 2, r: 0 }, 3);
        }
        const q = e.ui ? new Vec(x, y) : this.cam.toWorld(new Vec(x, y)), p = e.worldPos(), pad = e.tappable!.pad;
        const zoom = e.ui ? 1 : this.cam.zoom;
        const hw = Math.max(Math.abs(e.size.x * e.scale.x), min / zoom) / 2 + pad, hh = Math.max(Math.abs(e.size.y * e.scale.y), min / zoom) / 2 + pad;
        return Math.abs(q.x - p.x) <= hw && Math.abs(q.y - p.y) <= hh;
    }

    private dispatchTaps() {
        const input = this.game.input, raw = input._raw();
        if (raw.pressed) {
            const top = this._hitTappable(raw.x, raw.y);
            if (top) { this.pressedEntity = top; top._pressed = true; }
        }
        const e = this.pressedEntity;
        if (!e) return;
        input.consumePointer(); // whatever a button takes, gameplay must not also see
        if (raw.released) {
            this.pressedEntity = null;
            e._pressed = false;
            if (e.alive && this._hitTappable(raw.x, raw.y) === e) e.emit("tap");
        }
    }

    // --- Rendering -------------------------------------------------------------------------------
    private walk(e: Entity, parent: Float32Array | null, opacity: number, alpha: number, out: Entity[]) {
        if (!e.alive || e.hidden) return;
        const blendRot = Math.abs(e.rot.y - e._prevRot.y) < 3 && Math.abs(e.rot.x - e._prevRot.x) < 3 && Math.abs(e.rot.z - e._prevRot.z) < 3;
        const p = e._prevPos.lerp(e.pos, alpha), r = blendRot ? e._prevRot.lerp(e.rot, alpha) : e.rot;
        mat4Compose(e.world, p, r, e.scale);
        if (parent) mat4Mul(e.world, parent, e.world);
        e._opacity = opacity * e.opacity;
        e._order = this.order++;
        out.push(e);
        for (const c of e.children) this.walk(c, e.world, e._opacity, alpha, out);
    }

    /** @internal */
    _render(alpha: number, d: Draw) {
        const g = this.game, r = g.renderer, view = g.view;
        const list: Entity[] = [];
        this.order = 0;
        for (const e of this.entities) if (!e.parent) this.walk(e, null, 1, alpha, list);

        const bg = this.background ?? g.background;
        const pair = Array.isArray(bg) && (typeof bg[0] !== "number");
        r.beginFrame(view, color(pair ? (bg as [ColorLike, ColorLike])[0] : bg as ColorLike), pair ? color((bg as [ColorLike, ColorLike])[1]) : null, g.letterbox);

        const three = list.filter((e) => e.dim === 3 && e._hooksDraw.length);
        const hasParticles3 = this.particles.some((p) => p.dim === 3);
        if (three.length || hasParticles3) {
            this.cam3.update(alpha);
            for (const e of three) {
                d.begin(e); // carries opacity into mesh and billboard items
                for (const [, fn] of e._hooksDraw) fn.call(e, d, e);
            }
            d.reset();
            for (const p of this.particles) {
                if (p.dim !== 3) continue;
                const k = p.life / p.max, s = p.s1 + (p.s0 - p.s1) * k;
                const m = mat4Compose(new Float32Array(16), new Vec(p.x, p.y, p.z), new Vec(), new Vec(s, s, s));
                d.mesh("box", m, { size: UNIT, color: p.c, unlit: true, castShadow: false });
            }
            r.render3D({ viewProj: this.cam3.viewProj, eye: this.cam3.eye, look: this.cam3.look }, this.light);
        }

        const byLayer = (a: Entity, b: Entity) => a.layer - b.layer || a._order - b._order;
        const draw2 = (items: Entity[]) => {
            for (const e of items) {
                d.begin(e);
                for (const [, fn] of e._hooksDraw) fn.call(e, d, e);
            }
        };
        r.begin2D(this.cam.matrix(alpha));
        draw2(list.filter((e) => e.dim === 2 && !e.ui && e._hooksDraw.length).sort(byLayer));
        d.reset();
        for (const p of this.particles) {
            if (p.dim !== 2) continue;
            const k = p.life / p.max;
            d.circle((p.s1 + (p.s0 - p.s1) * k) / 2, { x: p.x, y: p.y, color: p.c, opacity: Math.min(1, k * 2) });
        }
        for (const fn of this.drawers) fn(d);
        if (g.debug) this.drawDebug(d, list);

        r.begin2D(null);
        draw2(list.filter((e) => e.dim === 2 && e.ui && e._hooksDraw.length).sort(byLayer));
        d.reset();
        for (const fn of this.uiDrawers) fn(d);
        g.touch.draw(d);
        d.reset();
        if (this.flashLeft > 0 && this.flashColor) d.rect(view.width, view.height, { x: view.width / 2, y: view.height / 2, color: this.flashColor, opacity: this.flashLeft / this.flashDur });
    }

    private drawDebug(d: Draw, list: Entity[]) {
        for (const e of list) {
            if (!e.collider || e.dim !== 2) continue;
            const b = entityBounds(e);
            d.rect(b.hx * 2, b.hy * 2, { x: b.cx, y: b.cy, color: e.collider.sensor ? "#22d3ee" : e.collider.solid ? "#f97316" : "#22c55e", outline: 1, opacity: 0.9, radius: b.r });
        }
    }
}

const UNIT = new Vec(1, 1, 1);
export type { Hit, RayHit };
