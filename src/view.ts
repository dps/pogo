// Pure viewport maths: maps any physical screen to the game's virtual units.

export interface Insets { top: number; right: number; bottom: number; left: number; }

export interface ViewOptions {
    /** Virtual size you design against. Default 360x640 (a portrait phone). */
    width?: number;
    height?: number;
    /**
     * expand (default): keep the design size visible and reveal more world on the long axis — never any bars.
     * contain: exactly width x height, letterboxed.
     * integer: contain with whole-number device pixel scaling, for pixel art.
     */
    fit?: "expand" | "contain" | "integer";
    /** Design size used when the screen is landscape, for layouts that re-flow on rotation. */
    landscape?: { width: number; height: number };
    /** expand only: clamp the width/height ratio; excess becomes letterbox. Useful to stop a phone game going ultra-wide on desktop. */
    maxAspect?: number;
    minAspect?: number;
}

export interface ScreenInfo { width: number; height: number; dpr: number; safe: Insets; }

export interface ViewState {
    /** Visible size in virtual units. Read these instead of hardcoding layout. */
    width: number;
    height: number;
    /** CSS pixels per virtual unit. */
    scale: number;
    /** CSS pixel offset of the game area (non-zero when letterboxed). */
    x: number;
    y: number;
    screen: ScreenInfo;
    /** Safe-area insets in virtual units, measured from the view edges. */
    safe: Insets;
    orientation: "portrait" | "landscape";
}

export function computeView(o: ViewOptions, screen: ScreenInfo): ViewState {
    const W = screen.width, H = screen.height;
    const landscape = W > H;
    const base = landscape && o.landscape ? o.landscape : { width: o.width ?? 360, height: o.height ?? 640 };
    const fit = o.fit ?? "expand";
    let scale = Math.min(W / base.width, H / base.height);
    let width = base.width, height = base.height;

    if (fit === "integer") {
        scale = Math.max(1, Math.floor(scale * screen.dpr)) / screen.dpr;
    } else if (fit === "expand") {
        width = W / scale;
        height = H / scale;
        const a = width / height;
        if (o.maxAspect && a > o.maxAspect) width = height * o.maxAspect;
        if (o.minAspect && a < o.minAspect) height = width / o.minAspect;
    }

    const x = (W - width * scale) / 2, y = (H - height * scale) / 2;
    const inset = (v: number, gap: number) => Math.max(0, v - gap) / scale;
    return {
        width, height, scale, x, y, screen,
        safe: {
            top: inset(screen.safe.top, y), bottom: inset(screen.safe.bottom, y),
            left: inset(screen.safe.left, x), right: inset(screen.safe.right, x),
        },
        orientation: landscape ? "landscape" : "portrait",
    };
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Device profiles used by `pogo check` and available for tests. */
export const DEVICES: Record<string, ScreenInfo> = {
    "phone-small": { width: 320, height: 568, dpr: 2, safe: NO_INSETS },
    "phone": { width: 390, height: 844, dpr: 3, safe: { top: 47, right: 0, bottom: 34, left: 0 } },
    "phone-landscape": { width: 844, height: 390, dpr: 3, safe: { top: 0, right: 47, bottom: 21, left: 47 } },
    "tablet": { width: 820, height: 1180, dpr: 2, safe: { top: 24, right: 0, bottom: 20, left: 0 } },
    "desktop": { width: 1440, height: 900, dpr: 1, safe: NO_INSETS },
};
