// Built-in components. Every one is a function returning a plain object; see Component in entity.ts.
import { PogoError } from "./errors";
import { color, ColorLike, toVec, Vec, VecLike } from "./math";
import type { Component, Entity } from "./entity";
import type { TextStyle } from "./render/backend";

// --- Transform and flags ---------------------------------------------------------
/** Position. A third argument of any value does not switch to 3D; mesh()/dim(3) do that. */
export const pos = (x: number | VecLike = 0, y?: number, z?: number): Component => ({ id: "pos", setup: (e) => { e.pos.set(typeof x === "number" ? new Vec(x, y ?? 0, z ?? 0) : x); e._prevPos.set(e.pos); } });
/** Rotation in radians: rot(angle) in 2D, rot(x, y, z) in 3D. */
export const rot = (x: number, y?: number, z?: number): Component => ({ id: "rot", setup: (e) => { if (y === undefined) e.rot.z = x; else e.rot.set(x, y, z ?? 0); e._prevRot.set(e.rot); } });
export const scale = (x: number, y?: number, z?: number): Component => ({ id: "scale", setup: (e) => { e.scale.set(x, y ?? x, z ?? x); } });
export const layer = (n: number): Component => ({ id: "layer", setup: (e) => { e.layer = n; } });
export const opacity = (a: number): Component => ({ id: "opacity", setup: (e) => { e.opacity = a; } });
export const named = (n: string): Component => ({ setup: (e) => { e.name = n; } });
/** Force an entity into 3D space even if nothing on it draws, e.g. a group or a trigger volume. */
export const dim = (d: 2 | 3): Component => ({ id: "dim", setup: (e) => { e.dim = d; } });

// --- 2D drawables -----------------------------------------------------------------
export interface ShapeOptions { color?: ColorLike; outline?: number; radius?: number; }

export const rect = (width: number, height: number, o: ShapeOptions = {}): Component => ({
    id: "rect",
    radius: o.radius ?? 0,
    outline: o.outline ?? 0,
    setup(e) { e.size.set(width, height, 0); if (o.color) e.color = o.color; },
    draw(d, e) { d.rect(e.size.x, e.size.y, { color: e.color, radius: e.radius, outline: e.outline }); },
});

export const circle = (radius: number, o: ShapeOptions = {}): Component => ({
    id: "circle",
    outline: o.outline ?? 0,
    setup(e) { e.size.set(radius * 2, radius * 2, 0); e._round = true; if (o.color) e.color = o.color; },
    draw(d, e) { d.circle(e.size.x / 2, { color: e.color, outline: e.outline }); },
});

export const poly = (points: VecLike[], o: ShapeOptions = {}): Component => {
    const pts = points.map((p) => toVec(p).clone());
    return {
        id: "poly",
        setup(e) {
            const xs = pts.map((p) => Math.abs(p.x)), ys = pts.map((p) => Math.abs(p.y));
            e.size.set(Math.max(...xs) * 2, Math.max(...ys) * 2, 0);
            if (o.color) e.color = o.color;
        },
        draw(d, e) { d.poly(pts, { color: e.color }); },
    };
};

export interface SpriteOptions { width?: number; height?: number; color?: ColorLike; frame?: number; flipX?: boolean; }

/** Draw an image or pixel-art asset. Size defaults to the frame size. */
export const sprite = (name: string, o: SpriteOptions = {}): Component => {
    let anim: { frames: number[]; fps: number; loop: boolean; t: number; onDone?: () => void } | null = null;
    return {
        id: "sprite",
        sprite: name,
        frame: o.frame ?? 0,
        flipX: o.flipX ?? false,
        setup(e) {
            const a = e.scene.game.assets.sprite(name);
            e.size.set(o.width ?? (o.height ? (a.frameW / a.frameH) * o.height : a.frameW), o.height ?? (o.width ? (a.frameH / a.frameW) * o.width : a.frameH), 0);
            if (o.color) e.color = o.color;
        },
        /** Play frames: e.play([0,1,2], { fps: 8 }). Replaying the same list does not restart it. */
        play(this: Entity, frames: number[], p: { fps?: number; loop?: boolean; onDone?: () => void } = {}) {
            if (anim && anim.frames === frames) return;
            anim = { frames, fps: p.fps ?? 8, loop: p.loop ?? true, t: 0, onDone: p.onDone };
            this.frame = frames[0];
        },
        update(dt, e) {
            if (!anim) return;
            anim.t += dt * anim.fps;
            const i = Math.floor(anim.t);
            if (i >= anim.frames.length && !anim.loop) {
                e.frame = anim.frames[anim.frames.length - 1];
                const done = anim.onDone;
                anim = null;
                done?.();
            } else e.frame = anim.frames[i % anim.frames.length];
        },
        draw(d, e) { d.sprite(e.sprite, { frame: e.frame, width: e.size.x, height: e.size.y, flipX: e.flipX, color: e.color }); },
    };
};

export type TextOptions = Partial<TextStyle> & { color?: ColorLike };

/** Text. Change it with e.text = "…"; e.size stays correct for layout. Size is in view units. */
export const text = (str: string | number, o: TextOptions = {}): Component => {
    let value = String(str);
    const style: TextStyle = { size: o.size ?? 20, font: o.font ?? "system-ui, -apple-system, Roboto, sans-serif", bold: o.bold ?? false, align: o.align ?? "center", maxWidth: o.maxWidth ?? 0, lineHeight: o.lineHeight ?? 1.25 };
    let owner: Entity | null = null;
    const measure = () => {
        if (!owner) return;
        const m = owner.scene.game.renderer.measureText(value, style);
        owner.size.set(m.width, m.height, 0);
    };
    return {
        id: "text",
        textStyle: style,
        get text() { return value; },
        set text(s: string | number) {
            const next = String(s);
            if (next !== value) { value = next; measure(); }
        },
        setup(e) { owner = e; measure(); if (o.color) e.color = o.color; },
        draw(d, e) { d.text(value, { ...style, color: e.color }); },
    };
};

// --- 3D drawables ------------------------------------------------------------------
export interface MeshOptions {
    /** Number or [x,y,z]; primitives default to 1. Models default to their natural size. */
    size?: number | VecLike;
    color?: ColorLike;
    /** Sprite asset used as a texture. */
    texture?: string;
    /** Ignores lighting and fog-free glow; good for lasers, pickups and sky objects. */
    unlit?: boolean;
    /** Default true. */
    shadow?: boolean;
}

/** A 3D mesh: box, sphere, plane, cylinder, cone, capsule, torus, or anything from assets.voxels()/assets.mesh(). */
export const mesh = (name: string, o: MeshOptions = {}): Component => ({
    id: "mesh",
    mesh: name,
    unlit: o.unlit ?? false,
    castShadow: o.shadow ?? true,
    texture: o.texture ?? null,
    setup(e) {
        e.dim = 3;
        const g = e.scene.game.assets.geometry(name);
        const s = o.size === undefined ? g.natural : typeof o.size === "number" ? new Vec(o.size, o.size, o.size) : toVec(o.size);
        e.size.set(s);
        if (name === "sphere") e._round = true;
        if (o.color) e.color = o.color;
        if (o.texture) e.scene.game.assets.sprite(o.texture);
    },
    draw(d, e) { d.mesh(e.mesh, e.world, { size: e.size, color: e.color, texture: e.texture, unlit: e.unlit, castShadow: e.castShadow }); },
});

/** A sprite standing in 3D space that always faces the camera. `size` is the world height. */
export const billboard = (name: string, o: { size?: number; color?: ColorLike; frame?: number; unlit?: boolean } = {}): Component => ({
    id: "billboard",
    sprite: name,
    frame: o.frame ?? 0,
    setup(e) {
        e.dim = 3;
        const a = e.scene.game.assets.sprite(name), h = o.size ?? 1;
        e.size.set((a.frameW / a.frameH) * h, h, 0.01);
        if (o.color) e.color = o.color;
    },
    draw(d, e) { d.billboard(e.sprite, e, { frame: e.frame, color: e.color, unlit: o.unlit ?? true }); },
});

// --- Physics ---------------------------------------------------------------------------
export interface ColliderOptions {
    /** Default: circle for circle()/sphere meshes, else box. */
    shape?: "box" | "circle";
    /** Override the size taken from the drawable. [w,h] in 2D, [w,h,d] (which implies 3D) otherwise. */
    size?: VecLike | number;
    offset?: VecLike;
    /** Shrink or grow relative to the size. A forgiving hitbox: scale 0.8. */
    scale?: number;
    /** Report collisions but never block. Use for pickups, triggers and hazards. */
    sensor?: boolean;
    /** Tags to pass through. */
    ignore?: string[];
}

export const collider = (o: ColliderOptions = {}): Component => ({
    id: "collider",
    setup(e) {
        const size = o.size === undefined ? null : typeof o.size === "number" ? new Vec(o.size, o.size, o.size) : toVec(o.size);
        if (Array.isArray(o.size) && o.size.length === 3) e.dim = 3;
        e.collider = {
            shape: o.shape ?? null, size, offset: toVec(o.offset ?? [0, 0, 0]), scale: o.scale ?? 1,
            sensor: o.sensor ?? false, ignore: o.ignore ?? [], solid: false, oneWay: false, watch: false,
        };
    },
    add(e) {
        const c = e.collider;
        c.shape ??= e._round ? "circle" : "box";
        const s = c.size ?? e.size;
        if (!s.x && !s.y) throw new PogoError("ZERO_COLLIDER", `collider() on ${e.label} has no size.`, "Give the entity a drawable (rect, sprite, mesh…) or pass collider({ size: [w, h] }).");
    },
});

export interface BodyOptions {
    /** Multiplier on scene gravity. 0 for top-down games. Default 1. */
    gravity?: number;
    /** 0 stops dead, 1 keeps all speed on impact. */
    bounce?: number;
    /** Horizontal slow-down per second while grounded. */
    friction?: number;
    /** Slow-down per second at all times. */
    drag?: number;
    mass?: number;
    maxSpeed?: number;
}

/** A moving body: adds e.vel and e.grounded, and blocks on solids. Needs collider(). */
export const body = (o: BodyOptions = {}): Component => ({
    id: "body",
    requires: ["collider"],
    vel: new Vec(),
    grounded: false,
    setup(e) { e.body = { gravity: o.gravity ?? 1, bounce: o.bounce ?? 0, friction: o.friction ?? 0, drag: o.drag ?? 0, mass: o.mass ?? 1, maxSpeed: o.maxSpeed ?? 0, frozen: false, groundEntity: null }; },
});

/** An immovable blocker. Needs collider(). oneWay platforms can be jumped through from below. */
export const solid = (o: { oneWay?: boolean } = {}): Component => ({
    id: "solid",
    requires: ["collider"],
    add(e) { e.collider.solid = true; e.collider.oneWay = o.oneWay ?? false; },
});

// --- UI ------------------------------------------------------------------------------------
export type PinAnchor = "top-left" | "top" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom" | "bottom-right";

/** Keep a UI element attached to a screen edge inside the safe area, through rotation and resize. */
export const pin = (anchor: PinAnchor, offset: VecLike = [0, 0]): Component => {
    const off = toVec(offset);
    const apply = (e: Entity) => {
        const v = e.scene.game.view, s = v.safe, hw = (e.size.x * e.scale.x) / 2, hh = (e.size.y * e.scale.y) / 2;
        const x = anchor.includes("left") ? s.left + hw + off.x : anchor.includes("right") ? v.width - s.right - hw - off.x : (v.width + s.left - s.right) / 2 + off.x;
        const y = anchor.includes("top") ? s.top + hh + off.y : anchor.includes("bottom") ? v.height - s.bottom - hh - off.y : (v.height + s.top - s.bottom) / 2 + off.y;
        e.pos.set(x, y, 0);
    };
    return {
        id: "pin",
        setup(e) { e.ui = true; },
        add(e) { apply(e); e._prevPos.set(e.pos); },
        update(_dt, e) { apply(e); },
    };
};

/** Mark as a screen-space overlay without pinning it. */
export const ui = (): Component => ({ id: "ui", setup(e) { e.ui = true; } });

/** Make something tappable; hit area grows to at least 44 CSS px on touch. Listen with onTap or e.onTap(). */
export const tap = (fn?: () => void, o: { pad?: number } = {}): Component => ({
    id: "tap",
    setup(e) { e.tappable = { pad: o.pad ?? 0 }; if (fn) e.on("tap", fn); },
});

export interface ButtonOptions {
    onTap?: () => void;
    width?: number;
    height?: number;
    color?: ColorLike;
    textColor?: ColorLike;
    textSize?: number;
    radius?: number;
    /** An input action that also triggers it, so keyboard and gamepad players never need a mouse. */
    action?: string;
}

/** A labelled UI button. Combine with pin() or pos(). */
export const button = (label: string, o: ButtonOptions = {}): Component => {
    const textSize = o.textSize ?? 18;
    const style: TextStyle = { size: textSize, font: "system-ui, -apple-system, Roboto, sans-serif", bold: true, align: "center", maxWidth: 0, lineHeight: 1.2 };
    const fill = color(o.color ?? "#3b82f6"), ink = o.textColor ?? "#ffffff";
    return {
        id: "button",
        buttonLabel: label,
        setup(e) {
            const m = e.scene.game.renderer.measureText(label, style);
            e.size.set(o.width ?? Math.max(m.width + 36, 120), o.height ?? 52, 0);
            e.tappable = { pad: 0 };
            e._isButton = true;
            if (o.onTap) e.on("tap", o.onTap);
        },
        add(e) { if (e.parent?.ui) e.ui = true; },
        update(dt, e) {
            const goal = e._pressed ? 0.95 : 1;
            e.scale.x += (goal - e.scale.x) * Math.min(1, dt * 24);
            e.scale.y = e.scale.x;
            // Skips the step it was born on, so the key that opened a menu can't also press its button.
            if (o.action && !e.hidden && e._bornStep !== e.scene.game.stepCount && e.scene.game.input._quiet(o.action)) e.emit("tap");
        },
        draw(d, e) {
            d.rect(e.size.x, e.size.y, { y: 3, color: fill.lerp("#000000", 0.35), radius: o.radius ?? 14 });
            d.rect(e.size.x, e.size.y, { color: e._pressed ? fill.lerp("#000000", 0.15) : fill, radius: o.radius ?? 14 });
            d.text(label, { ...style, color: ink });
        },
    };
};

// --- Behaviour -------------------------------------------------------------------------------
/** Destroy after a time, fading out over the last `fade` seconds. */
export const lifespan = (seconds: number, o: { fade?: number } = {}): Component => {
    let t = 0;
    const fade = o.fade ?? 0;
    return {
        id: "lifespan",
        update(dt, e) {
            t += dt;
            if (fade && t > seconds - fade) e.opacity = Math.max(0, (seconds - t) / fade);
            if (t >= seconds) e.destroy();
        },
    };
};

/** Destroy when outside the 2D camera view by more than `margin`. */
export const offscreen = (o: { margin?: number } = {}): Component => ({
    id: "offscreen",
    update(_dt, e) {
        const v = e.scene.game.view, p = e.ui ? e.pos : e.scene.cam.toView(e.worldPos()), m = o.margin ?? 100;
        if (p.x < -m || p.y < -m || p.x > v.width + m || p.y > v.height + m) e.destroy();
    },
});

/** Hit points: e.hp, e.maxHp, e.hurt(n), e.heal(n). Emits "hurt", "heal" and "death". */
export const health = (hp: number, o: { max?: number } = {}): Component => ({
    id: "health",
    hp,
    maxHp: o.max ?? hp,
    hurt(this: Entity, n = 1) {
        if (this.hp <= 0) return;
        this.hp = Math.max(0, this.hp - n);
        this.emit("hurt", n);
        if (this.hp === 0) this.emit("death");
    },
    heal(this: Entity, n = 1) {
        this.hp = Math.min(this.maxHp, this.hp + n);
        this.emit("heal", n);
    },
});

