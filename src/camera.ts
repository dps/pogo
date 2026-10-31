// Cameras. Both keep their previous step's state so rendering can interpolate on 90/120 Hz screens.
import { clamp, damp, lerp, mat4, mat4Invert, mat4LookAt, mat4Mul, mat4Perspective, mat4Point, Vec, VecLike, toVec } from "./math";
import type { Entity } from "./entity";
import type { ViewState } from "./view";

export interface FollowOptions { /** Higher catches up faster. 0 locks on. Default 8. */ speed?: number; offset?: VecLike; }

export class Camera2D {
    /** World point at the centre of the view. Leave unset and (0,0) stays the view's top-left corner. */
    private center: Vec | null = null;
    private prev: Vec | null = null;
    private fresh = false;
    zoom = 1;
    angle = 0;
    /** Clamp the visible area to a world rectangle. */
    bounds: { x: number; y: number; width: number; height: number } | null = null;
    private target: Entity | null = null;
    private opts: FollowOptions = {};
    _shake = new Vec();

    constructor(private view: () => ViewState) {}

    get pos(): Vec { return this.center ?? new Vec(this.view().width / 2, this.view().height / 2); }
    /** Assigning every step stays interpolated. Use cut() to jump without a blend. */
    set pos(v: VecLike) { this.center = toVec(v).clone(); }
    /** Jump: no blend from the previous frame. */
    cut(v?: VecLike) { if (v) this.pos = v; this.fresh = true; return this; }

    follow(e: Entity | null, o: FollowOptions = {}) {
        this.target = e;
        this.opts = o;
        if (e) this.cut(e.pos.add(o.offset ?? [0, 0]));
        return this;
    }

    /** @internal Runs before game code, so anything that moves the camera this step gets blended. */
    _snapshot() { this.prev = this.center?.clone() ?? null; }

    /** @internal */
    _step(dt: number) {
        if (this.target?.alive) {
            const goal = this.target.worldPos().add(this.opts.offset ?? [0, 0]);
            const sp = this.opts.speed ?? 8;
            this.center = sp ? this.pos.lerp(goal, damp(sp, dt)) : goal.clone();
        }
        if (this.bounds && this.center) {
            const b = this.bounds, v = this.view(), hw = v.width / 2 / this.zoom, hh = v.height / 2 / this.zoom;
            this.center.x = b.width <= hw * 2 ? b.x + b.width / 2 : clamp(this.center.x, b.x + hw, b.x + b.width - hw);
            this.center.y = b.height <= hh * 2 ? b.y + b.height / 2 : clamp(this.center.y, b.y + hh, b.y + b.height - hh);
        }
        if (this.fresh || !this.prev) { this.prev = this.center?.clone() ?? null; this.fresh = false; }
    }

    /** Affine [a,b,c,d,e,f] from world to view units, interpolated by alpha. */
    matrix(alpha: number): Float32Array {
        const v = this.view();
        const c = this.prev && this.center ? this.prev.lerp(this.center, alpha) : this.pos;
        const cs = Math.cos(-this.angle) * this.zoom, sn = Math.sin(-this.angle) * this.zoom;
        const x = -(c.x + this._shake.x), y = -(c.y + this._shake.y);
        return new Float32Array([cs, sn, -sn, cs, v.width / 2 + cs * x - sn * y, v.height / 2 + sn * x + cs * y]);
    }

    toWorld(p: VecLike): Vec {
        const v = this.view(), q = toVec(p);
        return new Vec(q.x - v.width / 2, q.y - v.height / 2).mul(1 / this.zoom).rotate(this.angle).add(this.pos);
    }
    toView(p: VecLike): Vec {
        const v = this.view();
        return toVec(p).sub(this.pos).rotate(-this.angle).mul(this.zoom).add([v.width / 2, v.height / 2]);
    }
}

export class Camera3D {
    readonly pos = new Vec(0, 5, 10);
    readonly target = new Vec(0, 0, 0);
    readonly up = new Vec(0, 1, 0);
    /** Field of view in degrees. */
    fov = 60;
    /** "min" applies fov to the narrower screen axis so portrait phones don't get tunnel vision; "vertical" is classic. */
    fovAxis: "min" | "vertical" = "min";
    near = 0.1;
    far = 500;
    private follower: Entity | null = null;
    private offset = new Vec(0, 4, 8);
    private speed = 6;
    private lookOffset = new Vec(0, 1, 0);
    private prevPos = this.pos.clone();
    private prevTarget = this.target.clone();
    _shake = new Vec();
    readonly viewMat = mat4();
    readonly projMat = mat4();
    readonly viewProj = mat4();
    readonly eye = new Vec();
    readonly look = new Vec();

    constructor(private viewState: () => ViewState) {}

    /** Set position and look target. Interpolation is reset, so this also works as a cut. */
    set(pos: VecLike, target?: VecLike) {
        this.pos.set(pos);
        if (target) this.target.set(target);
        this.prevPos.set(this.pos);
        this.prevTarget.set(this.target);
        return this;
    }

    /** Chase an entity. `offset` is relative to it in world axes. */
    follow(e: Entity | null, o: FollowOptions & { look?: VecLike } = {}) {
        this.follower = e;
        if (o.offset) this.offset.set(o.offset);
        if (o.look) this.lookOffset.set(o.look);
        this.speed = o.speed ?? 6;
        if (e) this.set(e.pos.add(this.offset), e.pos.add(this.lookOffset));
        return this;
    }

    /** @internal Runs before game code, so a first-person camera set in update hooks gets blended. */
    _snapshot() {
        this.prevPos.set(this.pos);
        this.prevTarget.set(this.target);
    }

    /** @internal */
    _step(dt: number) {
        if (this.follower?.alive) {
            const p = this.follower.worldPos(), k = this.speed ? damp(this.speed, dt) : 1;
            this.pos.set(this.pos.lerp(p.add(this.offset), k));
            this.target.set(this.target.lerp(p.add(this.lookOffset), k));
        }
    }

    /** @internal Vertical fov in radians for an aspect ratio. */
    _fovY(aspect: number) {
        const f = (this.fov * Math.PI) / 180;
        return this.fovAxis === "min" && aspect < 1 ? 2 * Math.atan(Math.tan(f / 2) / aspect) : f;
    }

    /** Recompute matrices for a blend between the last two steps. */
    update(alpha: number) {
        const v = this.viewState(), aspect = v.width / v.height;
        this.eye.set(this.prevPos.lerp(this.pos, alpha).add(this._shake));
        this.look.set(this.prevTarget.lerp(this.target, alpha).add(this._shake));
        mat4LookAt(this.viewMat, this.eye, this.look, this.up);
        mat4Perspective(this.projMat, this._fovY(aspect), aspect, this.near, this.far);
        mat4Mul(this.viewProj, this.projMat, this.viewMat);
    }

    /** World point to view units. `visible` is false behind the camera or outside the screen. */
    project(p: VecLike) {
        this.update(1);
        const v = this.viewState(), w = toVec(p);
        const ndc = mat4Point(this.viewProj, w);
        const behind = this.viewMat[2] * w.x + this.viewMat[6] * w.y + this.viewMat[10] * w.z + this.viewMat[14] > 0;
        return {
            x: lerp(0, v.width, ndc.x * 0.5 + 0.5), y: lerp(0, v.height, 0.5 - ndc.y * 0.5), depth: ndc.z,
            visible: !behind && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1,
        };
    }

    /** Ray through a view point, e.g. the pointer. */
    ray(x: number, y: number) {
        this.update(1);
        const v = this.viewState(), inv = mat4();
        mat4Invert(inv, this.viewProj);
        const nx = (x / v.width) * 2 - 1, ny = 1 - (y / v.height) * 2;
        const a = mat4Point(inv, new Vec(nx, ny, -1)), b = mat4Point(inv, new Vec(nx, ny, 1));
        return { origin: this.pos.clone(), dir: b.sub(a).norm() };
    }
}
