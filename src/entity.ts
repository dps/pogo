// Entities are composed from a list of components, tags and plain objects, as in Kaboom/KAPLAY.
// Unlike those, every entity always has a transform, so there is no required pos() and no ordering trap.
import { PogoError, suggest } from "./errors";
import { Color, color, ColorLike, mat4, mat4Compose, Mat4, mat4Mul, mat4Point, Vec, VecLike } from "./math";
import type { Scene, TimerHandle } from "./scene";
import type { Draw } from "./render/draw";

export interface Component {
    /** Unique per entity; used for get()/has() and for `requires`. */
    id?: string;
    /** Component ids that must also be on the entity. */
    requires?: string[];
    /** Runs while the component list is applied, in order, before any add(). */
    setup?(e: Entity): void;
    /** Runs once the entity is fully built and in the scene. */
    add?(e: Entity): void;
    /** Runs once per fixed step. `this` is the entity; use the second argument in arrow functions. */
    update?(dt: number, e: Entity): void;
    /** Runs every rendered frame, in local coordinates: (0,0) is the entity's centre. */
    draw?(d: Draw, e: Entity): void;
    /** Runs when the entity is destroyed. */
    destroy?(e: Entity): void;
    /** Any other key becomes a field or method on the entity. */
    [key: string]: any;
}
export type CompList = (Component | string | null | undefined | false)[];

const HOOKS = new Set(["id", "requires", "setup", "add", "update", "draw", "destroy"]);
let nextId = 1;

export class Entity {
    readonly id = nextId++;
    name = "";
    readonly tags = new Set<string>();
    parent: Entity | null = null;
    children: Entity[] = [];
    alive = true;
    /** Skips drawing, and collisions too. */
    hidden = false;
    /** Skips update hooks. */
    paused = false;
    /** Screen space: ignores the camera and draws above the world. */
    ui = false;
    /** Draw order within 2D; higher is on top. */
    layer = 0;
    opacity = 1;
    /** 2 or 3. Set automatically by whatever draws or collides. */
    dim: 2 | 3 = 2;
    /** Local unscaled size used for bounds, colliders and hit tests. */
    readonly size = new Vec();
    collider: any = null;
    body: any = null;
    tappable: { pad: number } | null = null;
    /** Render-interpolated world matrix. */
    readonly world: Mat4 = mat4();
    _prevPos = new Vec();
    _prevRot = new Vec();
    _order = 0;
    _opacity = 1;
    _pressed = false;
    _bornStep = 0;
    _hooksUpdate: [Component, NonNullable<Component["update"]>][] = [];
    _hooksDraw: [Component, NonNullable<Component["draw"]>][] = [];
    private _comps = new Map<string, Component>();
    private _listeners = new Map<string, Set<(...a: any[]) => void>>();
    private _pos = new Vec();
    private _rot = new Vec();
    private _scale = new Vec(1, 1, 1);
    private _color = new Color(1, 1, 1, 1);
    [key: string]: any;

    constructor(readonly scene: Scene) {}

    get pos(): Vec { return this._pos; }
    set pos(v: VecLike) { this._pos.set(v); }
    /** Euler rotation in radians. In 2D use rot.z or the `angle` shortcut. */
    get rot(): Vec { return this._rot; }
    set rot(v: VecLike) { this._rot.set(v); }
    get angle() { return this._rot.z; }
    set angle(a: number) { this._rot.z = a; }
    get scale(): Vec { return this._scale; }
    set scale(v: number | VecLike) {
        if (typeof v === "number") this._scale.set(v, v, v);
        else this._scale.set(v);
    }
    get color(): Color { return this._color; }
    set color(c: ColorLike) { this._color = color(c).clone(); }
    /** Readable identity for logs, errors and state dumps. */
    get label() { return this.name || [...this.tags][0] || [...this._comps.keys()][0] || `#${this.id}`; }

    /** @internal Apply a component list. */
    _use(list: CompList) {
        const pendingAdd: Component[] = [];
        for (const item of list) {
            if (!item) continue;
            if (typeof item === "string") { this.tags.add(item); continue; }
            if (typeof item !== "object" || Array.isArray(item)) {
                throw new PogoError("BAD_COMPONENT", `add() got ${JSON.stringify(item)}, which is not a component, tag or object.`, `Positions go through pos(x, y): add([pos(10, 20), rect(8, 8)]). A plain array like [10, 20] is not a component.`);
            }
            this._attach(item);
            pendingAdd.push(item);
        }
        for (const c of pendingAdd) {
            for (const r of c.requires ?? []) {
                if (!this._comps.has(r)) throw new PogoError("MISSING_COMPONENT", `Component "${c.id}" on ${this.label} requires "${r}".`, `Add ${r}() to the same add([...]) list. ${suggest(r, this._comps.keys())}`);
            }
        }
        return pendingAdd;
    }

    private _attach(c: Component) {
        if (c.id) {
            if (this._comps.has(c.id)) throw new PogoError("DUPLICATE_COMPONENT", `Entity ${this.label} already has component "${c.id}".`, "Each component id can appear once per entity. Use a child entity for a second one.");
            this._comps.set(c.id, c);
        }
        for (const key of Object.keys(c)) {
            if (HOOKS.has(key)) continue;
            const desc = Object.getOwnPropertyDescriptor(c, key)!;
            if (key in this && typeof (this as any)[key] === "function") {
                throw new PogoError("RESERVED_FIELD", `Component field "${key}" on ${this.label} would overwrite the Entity method ${key}().`, `Rename the field. Reserved methods include: on, emit, destroy, get, has, is, child, wait, every.`);
            }
            if (key === "size") this.size.set(desc.value);
            else if ("value" in desc && key in this) (this as any)[key] = desc.value; // pos, name, layer, opacity, …
            else Object.defineProperty(this, key, { ...desc, configurable: true, enumerable: true });
        }
        c.setup?.(this);
        if (c.update) this._hooksUpdate.push([c, c.update]);
        if (c.draw) this._hooksDraw.push([c, c.draw]);
    }

    /** Add a component after creation. */
    use(c: Component) {
        this._attach(c);
        c.add?.call(this, this);
        return this;
    }
    has(id: string) { return this._comps.has(id); }
    /** The component object with this id, or undefined. */
    get(id: string) { return this._comps.get(id); }
    is(tag: string) { return this.tags.has(tag); }
    tag(t: string) { this.tags.add(t); return this; }
    untag(t: string) { this.tags.delete(t); return this; }

    on(event: string, fn: (...a: any[]) => void) {
        let set = this._listeners.get(event);
        if (!set) this._listeners.set(event, (set = new Set()));
        set.add(fn);
        return () => set!.delete(fn);
    }
    emit(event: string, ...args: any[]) {
        const set = this._listeners.get(event);
        if (set) for (const fn of [...set]) fn.apply(this, args);
    }
    /** Run fn when this collides with something; pass a tag to filter. Args: (other, hit). */
    onCollide(tag: string | ((o: Entity, h: any) => void), fn?: (o: Entity, h: any) => void) {
        if (typeof tag === "function") return this.on("collide", tag);
        return this.on("collide", (o: Entity, h: any) => { if (o.is(tag)) fn!(o, h); });
    }
    onCollideEnd(tag: string, fn: (o: Entity) => void) { return this.on("collideEnd", (o: Entity) => { if (o.is(tag)) fn(o); }); }
    onTap(fn: () => void) { return this.on("tap", fn); }
    onUpdate(fn: (dt: number, e: Entity) => void) {
        const c: Component = {};
        const pair: [Component, NonNullable<Component["update"]>] = [c, fn];
        this._hooksUpdate.push(pair);
        return () => { this._hooksUpdate = this._hooksUpdate.filter((p) => p !== pair); };
    }

    /** Add a child whose transform is relative to this entity. */
    child(list: CompList) { return this.scene._spawn(list, this); }
    /** A timer cancelled automatically when this entity is destroyed. */
    wait(seconds: number, fn: () => void): TimerHandle { return this.scene.wait(seconds, fn, this); }
    every(seconds: number, fn: () => void): TimerHandle { return this.scene.every(seconds, fn, this); }

    /** Turn to face a point: yaw and pitch in 3D, angle in 2D. */
    lookAt(target: VecLike) {
        const d = new Vec().set(target).sub(this.worldPos());
        if (this.dim === 2) this._rot.z = Math.atan2(d.y, d.x);
        else {
            this._rot.y = Math.atan2(-d.x, -d.z);
            this._rot.x = Math.atan2(d.y, Math.hypot(d.x, d.z));
        }
        return this;
    }
    /** Local forward: +x rotated by angle in 2D, -z rotated by yaw and pitch in 3D. */
    forward() {
        if (this.dim === 2) return Vec.fromAngle(this._rot.z);
        const c = Math.cos(this._rot.x);
        return new Vec(-Math.sin(this._rot.y) * c, Math.sin(this._rot.x), -Math.cos(this._rot.y) * c);
    }
    /** Move without render interpolation, so a respawn doesn't streak across the screen. */
    teleport(x: number | VecLike, y?: number, z?: number) {
        this._pos.set(x, y, z);
        this._prevPos.set(this._pos);
        return this;
    }

    private _localMatrix(m: Mat4 = mat4()) { return mat4Compose(m, this._pos, this._rot, this._scale); }
    /** @internal Current (non-interpolated) world matrix. */
    _worldMatrix(): Mat4 {
        const m = this._localMatrix();
        return this.parent ? mat4Mul(m, this.parent._worldMatrix(), m) : m;
    }
    worldPos(): Vec { return this.parent ? mat4Point(this.parent._worldMatrix(), this._pos) : this._pos; }

    /** Destroy this entity and its children at the end of the step. */
    destroy() {
        if (!this.alive) return;
        this.alive = false;
        for (const c of this.children) c.destroy();
        for (const c of this._comps.values()) c.destroy?.call(this, this);
        this.emit("destroy");
    }
}
