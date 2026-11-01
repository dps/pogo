// Turning held inputs into moves. Same logic for keyboard, gamepad and on-screen buttons: DAS with the last pressed
// direction winning, charge that carries over between pieces, and hold or turn buffered during a clear.

export const SPEEDS = {
    normal: { das: 10, arr: 3, label: "Normal" },   // 167 ms, then 20 cells a second: one haptic tick per cell
    fast: { das: 7, arr: 2, label: "Fast" },        // 117 ms, 30 cells a second
};

export class Pilot {
    constructor(field, speed = SPEEDS.normal) {
        this.f = field; this.speed = speed;
        this.dir = 0; this.t = 0; this.arr = 0;
        this.was = { left: false, right: false, cw: false, ccw: false, drop: false, hold: false };
        this.soft = false;
    }

    /** s has the booleans left, right, soft, cw, ccw, drop, hold. */
    update(s) {
        const w = this.was, f = this.f;
        const pressLeft = s.left && !w.left, pressRight = s.right && !w.right;
        if (pressRight) this.dir = 1;
        else if (pressLeft) this.dir = -1;
        else if (this.dir === 1 && !s.right) this.dir = s.left ? -1 : 0;
        else if (this.dir === -1 && !s.left) this.dir = s.right ? 1 : 0;
        if (pressLeft || pressRight) { this.t = 0; this.arr = 0; f.move(this.dir); }
        else if (this.dir) {
            this.t++;
            if (this.t >= this.speed.das) {
                if (this.arr <= 0) { if (f.move(this.dir)) this.arr = this.speed.arr; }
                this.arr--;
            }
        } else this.t = 0;
        if (s.hold && !w.hold) f.hold();
        if (s.cw && !w.cw) f.rotate(1);
        if (s.ccw && !w.ccw) f.rotate(-1);
        if (s.drop && !w.drop) f.hardDrop();
        this.soft = !!s.soft;
        w.left = s.left; w.right = s.right; w.cw = s.cw; w.ccw = s.ccw; w.drop = s.drop; w.hold = s.hold;
    }
}

const ACTIONS = {
    solo: { left: "left", right: "right", soft: "down", cw: ["up", "fire"], ccw: "ccw", drop: "jump", hold: "hold" },
    one: { left: "p1left", right: "p1right", soft: "p1soft", cw: "p1cw", ccw: "p1ccw", drop: "p1drop", hold: "p1hold" },
    two: { left: "p2left", right: "p2right", soft: "p2soft", cw: "p2cw", ccw: "p2ccw", drop: "p2drop", hold: "p2hold" },
};
export const KEYS = {
    ccw: ["KeyZ", "ControlLeft", "pad:b"], hold: ["KeyC", "ShiftLeft", "pad:y"],
    p1left: ["KeyA"], p1right: ["KeyD"], p1soft: ["KeyS"], p1drop: ["KeyW"], p1ccw: ["KeyQ"], p1cw: ["KeyE"], p1hold: ["KeyR"],
    p2left: ["ArrowLeft"], p2right: ["ArrowRight"], p2soft: ["ArrowDown"], p2drop: ["ArrowUp"], p2ccw: ["Comma"], p2cw: ["Period"], p2hold: ["Slash"],
};

const out = { left: false, right: false, soft: false, cw: false, ccw: false, drop: false, hold: false };
/** Read a key set into the shared state object. */
export function readKeys(input, set) {
    const a = ACTIONS[set], any = (k) => (Array.isArray(k) ? k.some((n) => input.down(n)) : input.down(k));
    for (const k in a) out[k] = any(a[k]);
    return out;
}
