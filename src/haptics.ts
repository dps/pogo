// Haptic feedback, on by default. Buttons, touch controls, preset sounds and screen shake all pulse without any game code.
// Every pulse is logged, so headless runs can assert on feel the same way they assert on sound.
import { PogoError, suggest } from "./errors";
import type { Game } from "./game";

/** Vibration patterns in milliseconds: on, off, on, ... */
export const HAPTICS: Record<string, number[]> = {
    tick: [6],
    light: [12],
    medium: [24],
    heavy: [45],
    success: [14, 50, 24],
    warn: [24, 60, 24],
    error: [40, 40, 40, 40, 60],
};
export type Haptic = string | number | number[];

/** Automatic pulses are spaced further apart, so a rapid-fire game purrs instead of buzzing constantly. */
const GAP_STEPS = 3, AUTO_GAP_STEPS = 6;
const strength = (p: number[]) => p.reduce((sum, ms, i) => (i % 2 ? sum : sum + ms), 0);

export class Haptics {
    /** Recent pulses, newest last; visible in game.state(). */
    readonly log: string[] = [];
    /** Automatic pulses from buttons, controls, presets and shake. Explicit play() calls ignore this. */
    auto = true;
    private on = true;
    private lastStep = -1000;
    private lastStrength = 0;
    private iosLabel: HTMLLabelElement | null = null;

    constructor(private game: Game, option: boolean | { auto?: boolean } = true) {
        if (option === false) this.on = false;
        else if (typeof option === "object") this.auto = option.auto ?? true;
    }

    /** Master switch, for a settings toggle. game.load/save keeps the player's choice if you want it remembered. */
    get enabled() { return this.on; }
    set enabled(v: boolean) { this.on = v; }

    /** Pulse now: a preset name, a length in ms, or a pattern. Close calls merge, and the stronger one wins. */
    play(kind: Haptic = "light") { this.pulse(kind, GAP_STEPS); }
    /** @internal A pulse the framework chose, which the game can turn off with haptics.auto. */
    _auto(kind: Haptic | undefined) { if (this.auto && kind !== undefined) this.pulse(kind, AUTO_GAP_STEPS); }

    private pulse(kind: Haptic, gap: number) {
        if (!this.on) return;
        if (typeof kind === "string" && !(kind in HAPTICS)) throw new PogoError("UNKNOWN_HAPTIC", `No haptic named "${kind}".`, suggest(kind, Object.keys(HAPTICS)));
        const pattern = typeof kind === "string" ? HAPTICS[kind] : typeof kind === "number" ? [kind] : kind, power = strength(pattern), step = this.game.stepCount;
        if (step - this.lastStep < gap && power <= this.lastStrength) return;
        this.lastStep = step;
        this.lastStrength = power;
        this.log.push(typeof kind === "string" ? kind : `${power}ms`);
        if (this.log.length > 32) this.log.shift();
        if (!this.game.headless) this.device(pattern, power);
    }

    private device(pattern: number[], power: number) {
        this.rumble(power);
        if (typeof navigator === "undefined") return;
        // Chrome logs an intervention for every vibrate before the first gesture.
        if ((navigator as any).userActivation?.hasBeenActive === false) return;
        try {
            if (navigator.vibrate) navigator.vibrate(pattern);
            else this.iosPulse(pattern);
        } catch { /* blocked by the embedder */ }
    }

    private rumble(power: number) {
        const actuator = this.game.input.activePad?.vibrationActuator as any;
        if (!actuator?.playEffect) return;
        const magnitude = Math.min(1, 0.2 + power / 60);
        try {
            actuator.playEffect("dual-rumble", { duration: Math.max(20, power), strongMagnitude: magnitude, weakMagnitude: magnitude })?.catch?.(() => {});
        } catch { /* blocked by the embedder */ }
    }

    /** iOS has no vibrate API, but Safari 18 and later tick when a switch toggles. It is one strength, and needs a recent gesture. */
    private iosPulse(pattern: number[]) {
        if (!/iP(hone|ad|od)|Macintosh/.test(navigator.userAgent) || navigator.maxTouchPoints < 2) return;
        if (!this.iosLabel) {
            const label = (this.iosLabel = document.createElement("label")), box = document.createElement("input");
            box.type = "checkbox";
            box.setAttribute("switch", "");
            box.tabIndex = -1;
            label.setAttribute("aria-hidden", "true");
            label.style.cssText = "position:fixed;left:-99px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
            label.appendChild(box);
            document.body.appendChild(label);
        }
        const click = () => {
            const focus = document.activeElement as HTMLElement | null;
            this.iosLabel!.click();
            focus?.focus?.({ preventScroll: true });
        };
        let at = 0;
        pattern.forEach((ms, i) => { if (i % 2 === 0) { if (at) setTimeout(click, at); else click(); } at += ms; });
    }
}
