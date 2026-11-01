// The Game: fixed-step loop, scene flow, DOM integration and the agent-facing control surface.
import { Assets } from "./assets";
import { Audio, Sfx, Song } from "./audio";
import { audit, AuditIssue, ascii, snapshot } from "./agent";
import { PogoError, suggest } from "./errors";
import { Input } from "./input";
import { color, Color, ColorLike, Rng } from "./math";
import { NullRenderer, Renderer } from "./render/backend";
import { Draw } from "./render/draw";
import { GLRenderer } from "./render/gl";
import { Scene } from "./scene";
import { TouchControls, TouchOptions } from "./touch";
import { computeView, DEVICES, ScreenInfo, ViewOptions, ViewState } from "./view";

export interface GameOptions {
    view?: ViewOptions;
    /** One color, or [top, bottom] for a gradient. */
    background?: ColorLike | [ColorLike, ColorLike];
    /** Color of the bars in contain/integer fit and beyond maxAspect. */
    letterbox?: ColorLike;
    /** Seeds game.rng. The same seed and inputs give the same game. */
    seed?: number;
    /** Extra or replacement key bindings, by action name. */
    actions?: Record<string, string[]>;
    /** On-screen controls for touch players. */
    touch?: TouchOptions;
    /** Nearest-neighbour filtering for all textures. */
    pixelArt?: boolean;
    /** Render at most this many device pixels per CSS pixel. Default 2; phones at 3x save a lot of fill here. */
    maxDpr?: number;
    /** Lower internal resolution when frames run long. Default true. */
    adaptiveQuality?: boolean;
    /** Simulation rate. Default 60. */
    hz?: number;
    /** Existing canvas; by default one fills the parent, or the whole page. */
    canvas?: HTMLCanvasElement;
    parent?: HTMLElement;
    /** Run with no DOM. Automatic when `document` doesn't exist. */
    headless?: boolean;
    /** Screen used in headless runs. A key of DEVICES, or a ScreenInfo. Default "phone". */
    screen?: keyof typeof DEVICES | ScreenInfo;
    /** Draw collider outlines. Also enabled by ?debug in the URL. */
    debug?: boolean;
}

export type SceneFn = (s: Scene, args: any) => void;

export class Game {
    readonly headless: boolean;
    readonly renderer: Renderer;
    readonly input: Input;
    readonly touch: TouchControls;
    readonly assets: Assets;
    readonly audio: Audio;
    /** Gameplay randomness. Same seed, same sequence. */
    rng: Rng;
    /** Cosmetic randomness, separate so that effects never change gameplay. */
    fxRng: Rng;
    /** Free-form game state that survives scene changes and shows up in game.state(). Put score here. */
    data: Record<string, any> = {};
    view: ViewState;
    current: Scene | null = null;
    currentName = "";
    /** Fixed steps simulated since start. */
    stepCount = 0;
    debug: boolean;
    readonly dt: number;
    /** Errors caught during play. */
    readonly errors: Error[] = [];
    background: ColorLike | [ColorLike, ColorLike];
    letterbox: Color;
    /** @internal */
    _alpha = 1;
    private _mouseLook = false;

    private scenes = new Map<string, SceneFn>();
    private draw: Draw;
    private screen: ScreenInfo;
    private canvas: HTMLCanvasElement | null = null;
    private currentArgs: any;
    private nextScene: { name: string; args: any } | null = null;
    private fade = { t: 0, dur: 0, phase: 0 as 0 | 1 | 2 };
    private accumulator = 0;
    private lastTime = 0;
    private running = false;
    private inStep = false;
    private slowFrames = 0;
    private fastFrames = 0;
    private frameTime = 0;
    private overlay: HTMLElement | null = null;
    private listeners = new Map<string, Set<(...a: any[]) => void>>();
    private seed: number;
    private memory = new Map<string, string>();

    constructor(readonly options: GameOptions = {}) {
        this.headless = options.headless ?? typeof document === "undefined";
        this.seed = options.seed ?? 1;
        this.rng = new Rng(this.seed);
        this.fxRng = new Rng(this.seed ^ 0x5bd1e995);
        this.dt = 1 / (options.hz ?? 60);
        this.background = options.background ?? "#10141c";
        this.letterbox = color(options.letterbox ?? "#000000");
        this.debug = options.debug ?? false;
        this.touch = new TouchControls(this, options.touch ?? {});
        this.assets = new Assets(this);
        this.audio = new Audio(this);
        this.input = new Input(this, options.actions);
        this.draw = new Draw(this);

        if (this.headless) {
            const s = options.screen ?? "phone";
            this.screen = typeof s === "string" ? DEVICES[s] : s;
            if (!this.screen) throw new PogoError("UNKNOWN_DEVICE", `Unknown screen "${String(s)}".`, suggest(String(s), Object.keys(DEVICES)));
            this.input.touchMode = this.screen.width < 900;
            this.renderer = new NullRenderer();
        } else {
            this.canvas = this.setupCanvas();
            this.screen = this.readScreen();
            try {
                this.renderer = new GLRenderer(this.canvas, { pixelArt: options.pixelArt ?? false, maxDpr: options.maxDpr ?? 2 });
            } catch (err) {
                this.showError(err as Error);
                throw err;
            }
            this.bindDOM();
        }
        this.view = computeView(options.view ?? {}, this.screen);
        (globalThis as any).__pogo = this; // the handle `pogo check` and browser automation use
    }

    // --- Scene flow -----------------------------------------------------------------
    /** Define a scene. */
    scene(name: string, fn: SceneFn) { this.scenes.set(name, fn); return this; }

    /** Switch scene; args reach the scene function. With { fade }, crossfades through black over that many seconds. */
    go(name: string, args?: any, o: { fade?: number } = {}) {
        if (!this.scenes.has(name)) throw new PogoError("UNKNOWN_SCENE", `No scene named "${name}".`, suggest(name, this.scenes.keys()));
        if (this.fade.phase === 1) return; // ignore double taps during a fade-out
        if (o.fade) {
            this.nextScene = { name, args };
            this.fade = { t: 0, dur: o.fade / 2, phase: 1 };
            return;
        }
        this.nextScene = { name, args };
        if (!this.inStep) this.applyScene();
    }

    private applyScene() {
        const n = this.nextScene!;
        this.nextScene = null;
        this.input.reset();
        this.input.used.clear();
        this.current = new Scene(this, n.name);
        this.currentName = n.name;
        this.currentArgs = n.args;
        this.scenes.get(n.name)!(this.current, n.args ?? {});
        this.emit("scene", n.name);
    }

    /** Wait for assets, enter the first scene, and start the loop (browser). Headless games step manually. */
    start(name: string, args?: any) {
        if (!this.scenes.has(name)) throw new PogoError("UNKNOWN_SCENE", `No scene named "${name}".`, suggest(name, this.scenes.keys()));
        if (this.headless) { this.go(name, args); return Promise.resolve(); }
        return this.assets.ready().then(() => {
            this.go(name, args);
            if (new URLSearchParams(location.search).has("paused")) { this.render(); return; } // agents drive with step()
            this.running = true;
            this.lastTime = performance.now();
            requestAnimationFrame(this.frame);
        }).catch((err) => this.fail(err));
    }

    /** Re-seed and re-enter the current or given scene, for identical replays. Clears game.data. */
    restart(name = this.currentName, args = this.currentArgs, o: { seed?: number } = {}) {
        if (o.seed !== undefined) this.seed = o.seed;
        this.rng = new Rng(this.seed);
        this.fxRng = new Rng(this.seed ^ 0x5bd1e995);
        this.data = {};
        this.stepCount = 0;
        this.fade.phase = 0;
        this.nextScene = null;
        this.go(name, args);
    }

    // --- Loop ----------------------------------------------------------------------------
    private frame = (now: number) => {
        if (!this.running) return;
        requestAnimationFrame(this.frame);
        // rAF timestamps can predate performance.now() after a slow start, so never let this go negative.
        const real = Math.max(0, Math.min((now - this.lastTime) / 1000, 0.1));
        this.lastTime = now;
        this.accumulator += real;
        try {
            let steps = 0;
            while (this.accumulator >= this.dt && steps < 5) {
                this.stepOnce();
                this.accumulator -= this.dt;
                steps++;
            }
            if (steps === 5) this.accumulator = 0; // can't catch up: slow down rather than spiral
            this._alpha = this.accumulator / this.dt;
            this.render(this._alpha);
            this.adapt(real);
        } catch (err) {
            this.fail(err as Error);
        }
    };

    private adapt(real: number) {
        if (this.options.adaptiveQuality === false) return;
        const r = this.renderer as GLRenderer;
        this.frameTime += (real - this.frameTime) * 0.1;
        if (this.frameTime > 1 / 40) { this.fastFrames = 0; if (++this.slowFrames > 45) { r.quality = Math.max(0.5, r.quality * 0.85); this.slowFrames = 0; } }
        else if (this.frameTime < 1 / 55) { this.slowFrames = 0; if (++this.fastFrames > 600 && r.quality < 1) { r.quality = Math.min(1, r.quality * 1.1); this.fastFrames = 0; } }
    }

    private stepOnce() {
        const s = this.current;
        if (!s) return;
        this.inStep = true;
        try {
            this.input.beginStep();
            this.stepCount++;
            s._step(this.dt);
            this.stepFade();
        } finally {
            this.inStep = false;
        }
        if (this.nextScene && this.fade.phase === 0) this.applyScene();
    }

    private stepFade() {
        const f = this.fade;
        if (!f.phase) return;
        f.t += this.dt;
        if (f.t < f.dur) return;
        if (f.phase === 1) {
            this.applyScene();
            this.fade = { t: 0, dur: f.dur, phase: 2 };
        } else f.phase = 0;
    }

    /** Advance the simulation by n fixed steps right now. Errors are thrown. */
    step(n = 1) {
        for (let i = 0; i < n; i++) this.stepOnce();
        return this;
    }

    /** Draw the current state. */
    render(alpha = 1) {
        const s = this.current;
        if (!s) return;
        this._alpha = alpha;
        s._render(alpha, this.draw);
        const f = this.fade;
        if (f.phase) {
            const v = this.view, k = Math.min(1, f.t / f.dur);
            this.draw.reset();
            this.draw.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#000000", opacity: f.phase === 1 ? k : 1 - k });
        }
        this.renderer.endFrame();
    }

    // --- Agent surface ---------------------------------------------------------------------
    /** Serialisable summary of the game right now. */
    state() { return snapshot(this); }
    /** Text picture of the screen. */
    ascii(o?: { cols?: number }) { return ascii(this, o); }
    /** Mobile layout and usability problems in the current scene. */
    audit(): AuditIssue[] { return audit(this); }
    /** PNG data URL of the current frame (browser only). */
    screenshot() {
        this.render(this._alpha);
        return this.renderer.screenshot();
    }
    /** Simulate a screen: a DEVICES key or a ScreenInfo. Works headless, and in a browser for layout tests. */
    resize(screen: keyof typeof DEVICES | ScreenInfo) {
        this.screen = typeof screen === "string" ? DEVICES[screen] : screen;
        if (!this.screen) throw new PogoError("UNKNOWN_DEVICE", `Unknown screen "${String(screen)}".`, suggest(String(screen), Object.keys(DEVICES)));
        this.view = computeView(this.options.view ?? {}, this.screen);
        this.current?.emit("resize", this.view);
        this.emit("resize", this.view);
    }

    /**
     * First-person mouse control on desktop. While true, clicking the game captures the mouse and movement
     * feeds input.look. Turn it on in the play scene and off in menus, which need a visible cursor.
     * Esc releases the mouse; the next click captures it again.
     */
    get mouseLook() { return this._mouseLook; }
    set mouseLook(on: boolean) {
        this._mouseLook = on;
        if (!on && !this.headless && document.pointerLockElement) document.exitPointerLock();
    }
    /** True while the mouse is captured. */
    get pointerLocked() { return !this.headless && !!this.canvas && document.pointerLockElement === this.canvas; }

    // --- Services -----------------------------------------------------------------------------
    /** Play a sound effect: a preset name, a loaded sound, or a custom tone. */
    sfx(sound: string | Sfx) { this.audio.play(sound); }
    music(song: Song) { this.audio.playMusic(song); }
    stopMusic() { this.audio.stopMusic(); }
    /** Haptic pulse on phones that support it. */
    vibrate(ms: number | number[] = 12) { try { if (typeof navigator !== "undefined") navigator.vibrate?.(ms); } catch { /* blocked by the embedder */ } }

    /** Persist a JSON value. Web views can block storage, so this falls back to memory. */
    save(key: string, value: unknown) {
        const s = JSON.stringify(value);
        this.memory.set(key, s);
        try { if (!this.headless) localStorage.setItem(`pogo:${key}`, s); } catch { /* memory copy stands */ }
    }
    load<T = any>(key: string, fallback?: T): T {
        let s = this.memory.get(key) ?? null;
        try { if (!this.headless) s = localStorage.getItem(`pogo:${key}`) ?? s; } catch { /* use memory */ }
        return s === null ? (fallback as T) : JSON.parse(s);
    }

    on(event: string, fn: (...a: any[]) => void) {
        let set = this.listeners.get(event);
        if (!set) this.listeners.set(event, (set = new Set()));
        set.add(fn);
        return () => set!.delete(fn);
    }
    private emit(event: string, ...args: any[]) {
        const set = this.listeners.get(event);
        if (set) for (const fn of [...set]) fn(...args);
    }

    // --- DOM ---------------------------------------------------------------------------------------
    private setupCanvas(): HTMLCanvasElement {
        const o = this.options;
        if (!document.querySelector('meta[name="viewport"]')) {
            const m = document.createElement("meta");
            m.name = "viewport";
            m.content = "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover";
            document.head.appendChild(m);
        }
        const style = document.createElement("style");
        style.textContent = `html,body{margin:0;height:100%;overflow:hidden;overscroll-behavior:none;background:${this.letterbox.toHex()};-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}`;
        if (!o.parent && !o.canvas) document.head.appendChild(style);
        const c = o.canvas ?? document.createElement("canvas");
        c.style.cssText += ";display:block;width:100%;height:100%;touch-action:none;outline:none";
        if (!o.parent && !o.canvas) c.style.cssText += ";position:fixed;inset:0";
        c.tabIndex = 0;
        if (!o.canvas) (o.parent ?? document.body).appendChild(c);
        return c;
    }

    private readScreen(): ScreenInfo {
        const r = this.canvas!.getBoundingClientRect();
        const width = Math.max(1, r.width || innerWidth), height = Math.max(1, r.height || innerHeight);
        return { width, height, dpr: devicePixelRatio || 1, safe: this.readSafeArea() };
    }

    private safeProbe: HTMLElement | null = null;
    private readSafeArea() {
        if (!this.safeProbe) {
            const p = (this.safeProbe = document.createElement("div"));
            p.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
            document.body.appendChild(p);
        }
        const s = getComputedStyle(this.safeProbe), n = (v: string) => parseFloat(v) || 0;
        const q = new URLSearchParams(location.search).get("safe"); // ?safe=47,0,34,0 emulates a notch in desktop browsers
        if (q) { const [top, right, bottom, left] = q.split(",").map(Number); return { top, right, bottom, left }; }
        return { top: n(s.paddingTop), right: n(s.paddingRight), bottom: n(s.paddingBottom), left: n(s.paddingLeft) };
    }

    private bindDOM() {
        const c = this.canvas!, input = this.input;
        const q = new URLSearchParams(location.search);
        if (q.has("debug")) this.debug = true;
        input.touchMode = q.has("touch") || matchMedia("(pointer: coarse)").matches;

        const toView = (e: PointerEvent) => {
            const r = c.getBoundingClientRect(), v = this.view;
            return { x: (e.clientX - r.left - v.x) / v.scale, y: (e.clientY - r.top - v.y) / v.scale };
        };
        const unlock = () => this.audio.unlock();
        // Sandboxed frames never grant the lock, so the mouse drives the touch controls, which can look by dragging.
        // A lock that has worked before can still fail briefly after Esc, and that isn't a refusal.
        let lockWorked = false, lockRefused = false;
        const refuseLock = () => { if (!lockWorked) { lockRefused = true; input.touchMode = true; } };
        document.addEventListener("pointerlockchange", () => { lockWorked ||= this.pointerLocked; });
        document.addEventListener("pointerlockerror", refuseLock);
        c.addEventListener("pointerdown", (e) => {
            unlock();
            c.focus({ preventScroll: true });
            if (e.pointerType === "touch") input.touchMode = true;
            else if (e.pointerType === "mouse" && !q.has("touch") && !lockRefused) input.touchMode = false;
            if (e.pointerType === "mouse" && this._mouseLook && !this.pointerLocked && !lockRefused) (c.requestPointerLock?.() as unknown as Promise<void> | undefined)?.catch?.(refuseLock);
            try { c.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
            const p = toView(e);
            input.pointerEvent("down", e.pointerId, p.x, p.y);
            e.preventDefault();
        });
        c.addEventListener("pointermove", (e) => {
            if (document.pointerLockElement === c) input.addLook(e.movementX, e.movementY);
            const p = toView(e);
            input.pointerEvent("move", e.pointerId, p.x, p.y);
        });
        const up = (e: PointerEvent) => { const p = toView(e); input.pointerEvent("up", e.pointerId, p.x, p.y); };
        c.addEventListener("pointerup", up);
        c.addEventListener("pointercancel", up);
        c.addEventListener("contextmenu", (e) => e.preventDefault());
        c.addEventListener("wheel", (e) => { input.addWheel(e.deltaY); e.preventDefault(); }, { passive: false });
        addEventListener("keydown", (e) => {
            unlock();
            if (e.code === "F2") this.debug = !this.debug;
            if (!e.repeat) input.codeDown(e.code);
            if (Object.values(input.actions).some((b) => b.includes(e.code))) e.preventDefault(); // stop arrows and space scrolling
        });
        addEventListener("keyup", (e) => input.codeUp(e.code));
        addEventListener("blur", () => input.reset()); // otherwise keys stick when focus leaves mid-press

        const fit = () => {
            if (!this.running && !this.current) { this.screen = this.readScreen(); this.view = computeView(this.options.view ?? {}, this.screen); return; }
            this.resize(this.readScreen());
            if (!this.running) this.render();
        };
        new ResizeObserver(fit).observe(c);
        visualViewport?.addEventListener("resize", fit);
        addEventListener("orientationchange", fit);

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) { this.audio.suspend(); this.emit("hide"); }
            else {
                this.audio.resume();
                this.lastTime = performance.now(); // no catch-up burst after backgrounding
                this.emit("show");
            }
        });
        addEventListener("error", (e) => { if (e.error) this.fail(e.error); });
        addEventListener("unhandledrejection", (e) => this.fail(e.reason instanceof Error ? e.reason : new Error(String(e.reason))));
    }

    private fail(err: Error) {
        this.running = false;
        this.errors.push(err);
        console.error(err);
        this.showError(err);
    }

    /** Show errors on the canvas too: in a web view there may be no console, and agents read screenshots. */
    private showError(err: Error) {
        if (this.headless || typeof document === "undefined") return;
        const el = this.overlay ?? (this.overlay = document.createElement("pre"));
        el.textContent = `Game error\n\n${err.message}\n\n${err.stack ?? ""}`;
        el.style.cssText = "position:fixed;inset:0;margin:0;padding:max(16px,env(safe-area-inset-top)) 16px 16px;background:#7f1d1dee;color:#fff;font:13px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;overflow:auto;z-index:99999";
        document.body.appendChild(el);
    }
}

export function createGame(options?: GameOptions) { return new Game(options); }
