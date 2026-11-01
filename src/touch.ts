// On-screen controls. Sizes are CSS pixels, not virtual units, so they stay thumb-sized on every screen.
import type { Game } from "./game";
import type { Draw } from "./render/draw";

export interface TouchButton { action: string; label?: string; }
export interface TouchOptions {
    /** A floating thumbstick on the left half that drives input.move and the left/right/up/down actions. */
    stick?: boolean;
    /** Buttons stacked in the bottom-right, e.g. ["jump", { action: "fire", label: "F" }]. */
    buttons?: (string | TouchButton)[];
    /** Dragging on the right half produces input.look, for 3D cameras. */
    look?: boolean;
}

const STICK_RADIUS = 52, KNOB_RADIUS = 24, BUTTON_RADIUS = 36, MARGIN = 20, GAP = 14;

export class TouchControls {
    private stickId: number | null = null;
    private lookId: number | null = null;
    private origin = { x: 0, y: 0 };
    private knob = { x: 0, y: 0 };
    private held = new Map<number, string>();
    private buttons: TouchButton[];

    constructor(private game: Game, private o: TouchOptions) {
        this.buttons = (o.buttons ?? []).map((b) => (typeof b === "string" ? { action: b } : b));
    }

    /** Hide and disable all on-screen controls, e.g. in menus. */
    enabled = true;
    /** Replace the controls, usually from a scene function. Pass {} for none. */
    set(o: TouchOptions) {
        this.o = o;
        this.buttons = (o.buttons ?? []).map((b) => (typeof b === "string" ? { action: b } : b));
        return this;
    }

    get lookActive() { return !!this.o.look; }
    /** Actions a touch player can trigger. */
    get provides() {
        const out = new Set(this.buttons.map((b) => b.action));
        if (this.o.stick) for (const a of ["left", "right", "up", "down"]) out.add(a);
        return out;
    }

    /** Button centres and radius, in view units. Also used by the layout audit. */
    layout() {
        const v = this.game.view, s = 1 / v.scale;
        const r = BUTTON_RADIUS * s;
        const cx = v.width - v.safe.right - (MARGIN + BUTTON_RADIUS) * s, base = v.height - v.safe.bottom - (MARGIN + BUTTON_RADIUS) * s;
        return this.buttons.map((b, i) => {
            const col = i % 2, row = Math.floor(i / 2);
            return { ...b, x: cx - col * (2 * r + GAP * s), y: base - row * (2 * r + GAP * s) - (col ? r * 0.8 : 0), r };
        });
    }

    private stickHome() {
        const v = this.game.view, s = 1 / v.scale;
        return { x: v.safe.left + (MARGIN + STICK_RADIUS + 12) * s, y: v.height - v.safe.bottom - (MARGIN + STICK_RADIUS + 12) * s };
    }

    /** Returns true if a control took this pointer, so gameplay never sees it. */
    pointerDown(id: number, x: number, y: number): boolean {
        if (!this.game.input.touchMode || !this.enabled) return false;
        const input = this.game.input;
        for (const b of this.layout()) {
            const reach = b.r * 1.15;
            if (Math.hypot(x - b.x, y - b.y) <= reach) {
                this.held.set(id, b.action);
                input.codeDown(`touch:${b.action}`);
                this.game.haptics._auto("tick");
                return true;
            }
        }
        const v = this.game.view;
        // Upper screen stays free for UI; the stick only claims the lower-left zone.
        if (this.o.stick && this.stickId === null && x < v.width / 2 && y > v.height * 0.35) {
            if (this.game.current?._hitTappable(x, y)) return false;
            this.stickId = id;
            this.origin = { x, y };
            this.knob = { x, y };
            return true;
        }
        if (this.o.look && this.lookId === null && x >= v.width / 2) {
            this.lookId = id;
            return false; // not captured: Input turns its movement into look deltas
        }
        return false;
    }

    pointerMove(id: number, x: number, y: number) {
        if (id !== this.stickId) return;
        const v = this.game.view, max = STICK_RADIUS / v.scale;
        const dx = x - this.origin.x, dy = y - this.origin.y, len = Math.hypot(dx, dy);
        const k = len > max ? max / len : 1;
        this.knob = { x: this.origin.x + dx * k, y: this.origin.y + dy * k };
        const nx = (dx * k) / max, ny = (dy * k) / max; // radial, so diagonals keep their direction and length 1
        const dead = len / max < 0.15;
        this.game.input.setStick(dead ? 0 : nx, dead ? 0 : ny);
        this.digital("left", !dead && nx < -0.35);
        this.digital("right", !dead && nx > 0.35);
        this.digital("up", !dead && ny < -0.5);
        this.digital("down", !dead && ny > 0.5);
    }

    private digital(action: string, on: boolean) {
        if (on) this.game.input.codeDown(`touch:${action}`);
        else this.game.input.codeUp(`touch:${action}`);
    }

    pointerUp(id: number) {
        const action = this.held.get(id);
        if (action) {
            this.held.delete(id);
            if (![...this.held.values()].includes(action)) this.game.input.codeUp(`touch:${action}`);
        }
        if (id === this.stickId) {
            this.stickId = null;
            this.game.input.setStick(0, 0);
            for (const a of ["left", "right", "up", "down"]) this.digital(a, false);
        }
        if (id === this.lookId) this.lookId = null;
    }

    reset() {
        this.held.clear();
        this.stickId = this.lookId = null;
    }

    draw(d: Draw) {
        if (!this.game.input.touchMode || !this.enabled) return;
        const s = 1 / this.game.view.scale;
        d.reset();
        if (this.o.stick) {
            const c = this.stickId !== null ? this.origin : this.stickHome();
            const k = this.stickId !== null ? this.knob : c;
            const a = this.stickId !== null ? 0.5 : 0.28;
            d.circle(STICK_RADIUS * s, { x: c.x, y: c.y, color: [1, 1, 1, a * 0.5] });
            d.circle(STICK_RADIUS * s, { x: c.x, y: c.y, color: [1, 1, 1, a], outline: 2 * s });
            d.circle(KNOB_RADIUS * s, { x: k.x, y: k.y, color: [1, 1, 1, a + 0.2] });
        }
        for (const b of this.layout()) {
            const on = [...this.held.values()].includes(b.action);
            d.circle(b.r, { x: b.x, y: b.y, color: [1, 1, 1, on ? 0.5 : 0.22] });
            d.circle(b.r, { x: b.x, y: b.y, color: [1, 1, 1, 0.6], outline: 2 * s });
            d.text(b.label ?? b.action.slice(0, 4).toUpperCase(), { x: b.x, y: b.y, size: 15 * s, color: "white", bold: true });
        }
    }
}
