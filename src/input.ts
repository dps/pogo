// Action-based input. Keyboard, gamepad, touch controls and scripted agents all feed the same state,
// and edges (pressed/released) are latched to fixed steps so results don't depend on frame rate.
import { PogoError, suggest } from "./errors";
import { Vec } from "./math";
import type { Game } from "./game";

export const DEFAULT_ACTIONS: Record<string, string[]> = {
    left: ["ArrowLeft", "KeyA", "pad:left"],
    right: ["ArrowRight", "KeyD", "pad:right"],
    up: ["ArrowUp", "KeyW", "pad:up"],
    down: ["ArrowDown", "KeyS", "pad:down"],
    jump: ["Space", "pad:a"],
    fire: ["KeyJ", "KeyX", "pad:x"],
    confirm: ["Enter", "pad:start"],
    pause: ["Escape", "KeyP", "pad:select"],
};

const PAD_BUTTONS: [number, string][] = [
    [0, "pad:a"], [1, "pad:b"], [2, "pad:x"], [3, "pad:y"], [8, "pad:select"], [9, "pad:start"],
    [12, "pad:up"], [13, "pad:down"], [14, "pad:left"], [15, "pad:right"],
];

interface PointerState { id: number; x: number; y: number; startX: number; startY: number; steps: number; captured: boolean; }
type PointerEventRecord = { kind: "down" | "move" | "up"; id: number; x: number; y: number };
interface ActionState { down: boolean; pressed: boolean; released: boolean; }

export class Input {
    readonly actions: Record<string, string[]>;
    /** True while the player is on touch: on-screen controls show, and the layout audit takes them into account. */
    touchMode = false;
    /** Which actions and pointer features the game actually read; the audit uses this to find unreachable controls. */
    readonly used = new Set<string>();
    /** Per-step look delta, in CSS pixels: mouse drag or locked mouse, the right touch zone, or the right stick x 8. */
    readonly look = new Vec();
    /** Mouse wheel delta accumulated this step. */
    wheel = 0;
    private _swipe: "left" | "right" | "up" | "down" | null = null;
    /** The swipe finished this step, if any. */
    get swipe() { this.used.add("pointer"); return this._swipe; }

    private codes = new Set<string>();
    private latched = new Set<string>();
    private scripted = new Map<string, number>();
    private states = new Map<string, ActionState>();
    private queue: PointerEventRecord[] = [];
    private pointers = new Map<number, PointerState>();
    private primary: PointerState | null = null;
    private pendingLook = new Vec();
    private pendingWheel = 0;
    private padStick = new Vec();
    private padLook = new Vec();
    private stick = new Vec();
    private px = 0;
    private py = 0;
    private pPressed = false;
    private pReleased = false;
    private pTapped = false;
    private pDx = 0;
    private pDy = 0;
    private pConsumed = false;

    constructor(private game: Game, actions: Record<string, string[]> = {}) {
        this.actions = { ...DEFAULT_ACTIONS, ...actions };
        for (const a of Object.keys(this.actions)) this.states.set(a, { down: false, pressed: false, released: false });
    }

    private state(action: string): ActionState {
        const s = this.states.get(action);
        if (!s) throw new PogoError("UNKNOWN_ACTION", `Unknown input action "${action}".`, `${suggest(action, this.states.keys())} Add custom actions with createGame({ actions: { ${action}: ["KeyE"] } }).`);
        this.used.add(action);
        return s;
    }

    /** Held right now. */
    down(action: string) { return this.state(action).down; }
    /** Went down this step. */
    pressed(action: string) { return this.state(action).pressed; }
    /** Went up this step. */
    released(action: string) { return this.state(action).released; }

    /** Movement vector with length up to 1, from the stick, gamepad or left/right/up/down. y is -1 when up is held. */
    get move(): Vec {
        this.used.add("left"); this.used.add("right"); this.used.add("up"); this.used.add("down");
        if (this.stick.lenSq() > 0) return this.stick.clone();
        if (this.padStick.lenSq() > 0) return this.padStick.clone();
        const x = (this.states.get("right")!.down ? 1 : 0) - (this.states.get("left")!.down ? 1 : 0);
        const y = (this.states.get("down")!.down ? 1 : 0) - (this.states.get("up")!.down ? 1 : 0);
        return new Vec(x, y).norm();
    }

    /** Primary pointer, in view units. pressed/tapped are false if a button or touch control consumed the touch. */
    get pointer() {
        this.used.add("pointer");
        const consumed = this.pConsumed, x = this.px, y = this.py;
        const game = this.game;
        return {
            x, y, dx: this.pDx, dy: this.pDy,
            down: !!this.primary && !this.primary.captured && !consumed,
            pressed: this.pPressed && !consumed,
            released: this.pReleased && !consumed,
            tapped: this.pTapped && !consumed,
            /** The pointer in 2D world coordinates. */
            get world() { return game.current?.cam.toWorld(new Vec(x, y)) ?? new Vec(x, y); },
        };
    }

    /** All active touches, in view units. */
    get touches() { this.used.add("pointer"); return [...this.pointers.values()].filter((p) => !p.captured).map((p) => ({ id: p.id, x: p.x, y: p.y })); }

    /** @internal Tap dispatch reads raw edges, because it decides what gets consumed. */
    _raw() { return { x: this.px, y: this.py, pressed: this.pPressed, released: this.pReleased, tapped: this.pTapped }; }
    /** @internal Read an action without counting it as a gameplay dependency in the audit. */
    _quiet(action: string) { return this.states.get(action)?.pressed ?? false; }
    /** Stop gameplay seeing the current touch. Buttons do this automatically. */
    consumePointer() { this.pConsumed = true; }

    // --- Raw sources -------------------------------------------------------------
    codeDown(code: string) { if (!this.codes.has(code)) { this.codes.add(code); this.latched.add(code); } }
    codeUp(code: string) { this.codes.delete(code); }
    pointerEvent(kind: PointerEventRecord["kind"], id: number, x: number, y: number) { this.queue.push({ kind, id, x, y }); }
    addLook(dx: number, dy: number) { this.pendingLook.x += dx; this.pendingLook.y += dy; }
    addWheel(d: number) { this.pendingWheel += d; }
    setStick(x: number, y: number) { this.stick.set(x, y, 0); }

    // --- Scripted input, for agents and tests ----------------------------------------
    /** Hold an action until release(), or for the given number of steps. */
    press(action: string, steps = Infinity) { this.state(action); this.scripted.set(action, steps); }
    release(action: string) { this.state(action); this.scripted.delete(action); }
    /** Tap once at view coordinates; takes effect on the next step. */
    tap(x: number, y: number, id = 900) {
        this.pointerEvent("down", id, x, y);
        this.pointerEvent("up", id, x, y);
    }
    /** Swipe between two view points; takes effect on the next step. */
    drag(x0: number, y0: number, x1: number, y1: number, id = 901) {
        this.pointerEvent("down", id, x0, y0);
        this.pointerEvent("move", id, x1, y1);
        this.pointerEvent("up", id, x1, y1);
    }
    /** Clear everything; used on scene changes so a held key can't leak into a menu. */
    reset() {
        this.scripted.clear();
        this.codes.clear();
        this.latched.clear();
        this.pointers.clear();
        this.primary = null;
        this.queue.length = 0;
        this.stick.set(0, 0, 0);
        this.game.touch.reset();
    }

    // --- Step lifecycle ---------------------------------------------------------------
    /** @internal */
    beginStep() {
        this.pollGamepads();
        this.pPressed = this.pReleased = this.pTapped = false;
        this.pConsumed = false;
        this._swipe = null;
        const ox = this.px, oy = this.py;
        const queue = this.queue;
        this.queue = [];
        for (const ev of queue) this.handlePointer(ev);
        this.pDx = this.px - ox;
        this.pDy = this.py - oy;
        this.look.set(this.pendingLook.x + this.padLook.x * 8, this.pendingLook.y + this.padLook.y * 8, 0);
        this.pendingLook.set(0, 0, 0);
        this.wheel = this.pendingWheel;
        this.pendingWheel = 0;

        for (const [action, st] of this.states) {
            const bindings = this.actions[action] ?? [];
            let down = false;
            for (const code of bindings) if (this.codes.has(code) || this.latched.has(code)) { down = true; break; }
            if (this.codes.has(`touch:${action}`) || this.latched.has(`touch:${action}`)) down = true;
            const left = this.scripted.get(action);
            if (left !== undefined) {
                down = true;
                if (left <= 1) this.scripted.delete(action);
                else this.scripted.set(action, left - 1);
            }
            st.pressed = down && !st.down;
            st.released = !down && st.down;
            st.down = down;
        }
        this.latched.clear();
        for (const p of this.pointers.values()) p.steps++;
    }

    private handlePointer(ev: PointerEventRecord) {
        const css = this.game.view.scale;
        if (ev.kind === "down") {
            const p: PointerState = { id: ev.id, x: ev.x, y: ev.y, startX: ev.x, startY: ev.y, steps: 0, captured: false };
            p.captured = this.game.touch.pointerDown(p.id, ev.x, ev.y);
            this.pointers.set(ev.id, p);
            if (!p.captured && !this.primary) {
                this.primary = p;
                this.pPressed = true;
                this.px = ev.x;
                this.py = ev.y;
            }
            return;
        }
        const p = this.pointers.get(ev.id);
        if (!p) {
            if (ev.kind === "move") { this.px = ev.x; this.py = ev.y; } // hover
            return;
        }
        if (ev.kind === "move") {
            if (p.captured) this.game.touch.pointerMove(p.id, ev.x, ev.y);
            else if (p === this.primary || this.game.touch.lookActive) this.addLook((ev.x - p.x) * css, (ev.y - p.y) * css);
            p.x = ev.x;
            p.y = ev.y;
            if (p === this.primary) { this.px = ev.x; this.py = ev.y; }
            return;
        }
        this.pointers.delete(ev.id);
        if (p.captured) { this.game.touch.pointerUp(p.id); return; }
        if (p === this.primary) {
            this.primary = null;
            this.pReleased = true;
            this.px = ev.x;
            this.py = ev.y;
            const dx = (ev.x - p.startX) * css, dy = (ev.y - p.startY) * css, dist = Math.hypot(dx, dy);
            if (dist < 14 && p.steps < 40) this.pTapped = true;
            else if (dist >= 32 && p.steps < 45) this._swipe = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
        }
    }

    private padsBlocked = false;

    private pollGamepads() {
        this.padStick.set(0, 0, 0);
        this.padLook.set(0, 0, 0);
        if (this.padsBlocked || typeof navigator === "undefined" || !navigator.getGamepads) return;
        let pads: (Gamepad | null)[];
        // Embeds can forbid gamepads through a permissions policy, and then this throws on every call.
        try { pads = navigator.getGamepads(); } catch { this.padsBlocked = true; return; }
        const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
        for (const pad of pads) {
            if (!pad) continue;
            for (const [i, code] of PAD_BUTTONS) {
                if (pad.buttons[i]?.pressed) this.codeDown(code);
                else this.codeUp(code);
            }
            this.padStick.set(dz(pad.axes[0] ?? 0), dz(pad.axes[1] ?? 0), 0);
            this.padLook.set(dz(pad.axes[2] ?? 0), dz(pad.axes[3] ?? 0), 0);
            // Let the stick drive digital left/right so menus and platformers work too.
            for (const [code, on] of [["pad:left", this.padStick.x < -0.4], ["pad:right", this.padStick.x > 0.4], ["pad:up", this.padStick.y < -0.4], ["pad:down", this.padStick.y > 0.4]] as const) {
                if (on) this.codeDown(code);
            }
            break;
        }
    }
}
