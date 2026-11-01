// Tools that let an agent see and judge a game without eyes: state dumps, ASCII frames and a layout audit.
import type { Entity } from "./entity";
import type { Game } from "./game";

const round = (n: number) => Math.round(n * 100) / 100;

function describe(e: Entity) {
    const out: Record<string, unknown> = { id: e.id, label: e.label, pos: [round(e.pos.x), round(e.pos.y), round(e.pos.z)], size: [round(e.size.x), round(e.size.y), round(e.size.z)], dim: e.dim };
    if (e.tags.size) out.tags = [...e.tags];
    if (e.ui) out.ui = true;
    if (e.hidden) out.hidden = true;
    if (e.vel) out.vel = [round(e.vel.x), round(e.vel.y), round(e.vel.z)];
    if (e.body) out.grounded = e.grounded;
    if (typeof e.text === "string") out.text = e.text;
    if (e.hp !== undefined) out.hp = e.hp;
    return out;
}

export function snapshot(g: Game) {
    const s = g.current;
    return {
        scene: g.currentName,
        step: g.stepCount,
        time: round(g.stepCount * g.dt),
        view: { width: round(g.view.width), height: round(g.view.height), scale: round(g.view.scale), orientation: g.view.orientation, safe: g.view.safe },
        touchMode: g.input.touchMode,
        paused: s?.paused ?? false,
        data: g.data,
        sounds: g.audio.log.slice(-8),
        haptics: g.haptics.log.slice(-8),
        errors: g.errors.map((e) => e.message),
        entityCount: s?.entities.length ?? 0,
        entities: s?.entities.filter((e) => e.alive).slice(0, 200).map(describe) ?? [],
    };
}

/** Screen rectangle of an entity in view units, or null if it isn't on the screen plane. */
function screenRect(e: Entity) {
    const s = e.scene;
    if (e.dim === 3) {
        const p = s.cam3.project(e.worldPos());
        if (!p.visible) return null;
        const q = s.cam3.project(e.worldPos().add([0, e.size.y * e.scale.y, 0]));
        const r = Math.max(2, Math.abs(q.y - p.y) / 2);
        return { x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r };
    }
    const c = e.ui ? e.worldPos() : s.cam.toView(e.worldPos()), z = e.ui ? 1 : s.cam.zoom;
    const hw = (Math.abs(e.size.x * e.scale.x) * z) / 2, hh = (Math.abs(e.size.y * e.scale.y) * z) / 2;
    return { x0: c.x - hw, y0: c.y - hh, x1: c.x + hw, y1: c.y + hh };
}

/** Render the screen as text. Later and higher-layer entities overwrite earlier ones. */
export function ascii(g: Game, o: { cols?: number } = {}) {
    const s = g.current, v = g.view;
    if (!s) return "(no scene)";
    const cols = o.cols ?? 48, rows = Math.max(4, Math.round(((v.height / v.width) * cols) / 2));
    const grid = Array.from({ length: rows }, () => Array<string>(cols).fill(" "));
    const legend = new Map<string, string>();
    const used = new Set<string>();
    const glyph = (label: string) => {
        let c = legend.get(label);
        if (c) return c;
        const clean = label.replace(/[^a-z0-9]/gi, "");
        c = [...clean, ...clean.toUpperCase(), ..."*+%@&=~^"].find((ch) => !used.has(ch)) ?? "?";
        used.add(c);
        legend.set(label, c);
        return c;
    };
    const list = s.entities.filter((e) => e.alive && !e.hidden && (e.size.x || e.size.y || e.size.z)).sort((a, b) => +a.ui - +b.ui || a.layer - b.layer);
    for (const e of list) {
        const r = screenRect(e);
        if (!r) continue;
        const ch = glyph(e.label);
        const x0 = Math.max(0, Math.floor((r.x0 / v.width) * cols)), x1 = Math.min(cols - 1, Math.floor((r.x1 / v.width) * cols));
        const y0 = Math.max(0, Math.floor((r.y0 / v.height) * rows)), y1 = Math.min(rows - 1, Math.floor((r.y1 / v.height) * rows));
        if (x0 >= cols || y0 >= rows || x1 < 0 || y1 < 0) continue;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = ch;
    }
    const bar = `+${"-".repeat(cols)}+`;
    return [bar, ...grid.map((r) => `|${r.join("")}|`), bar, `legend: ${[...legend].map(([k, c]) => `${c}=${k}`).join(" ")}`].join("\n");
}

export interface AuditIssue {
    severity: "error" | "warn";
    code: string;
    message: string;
    entity?: string;
    fix: string;
}

const MIN_TEXT_CSS = 11, MIN_TAP_CSS = 40;

/** Check the current frame for problems that only show up on real phones. */
export function audit(g: Game): AuditIssue[] {
    const s = g.current, v = g.view, out: AuditIssue[] = [];
    if (!s) return out;
    const add = (severity: AuditIssue["severity"], code: string, message: string, fix: string, entity?: string) => out.push({ severity, code, message, fix, entity });
    const live = s.entities.filter((e) => e.alive && !e.hidden && !isFaded(e));
    // Zero-size entities are draw hooks rather than boxes, and full-screen ones are backdrops.
    const covers = (e: Entity) => e.size.x * Math.abs(e.scale.x) >= v.width - 1 && e.size.y * Math.abs(e.scale.y) >= v.height - 1;
    const uiItems = live.filter((e) => e.ui && e.dim === 2 && e._hooksDraw.length && (e.size.x || e.size.y) && !covers(e));
    const px = (n: number) => Math.round(n * v.scale);
    const controls = g.input.touchMode ? g.touch.layout() : [];

    for (const e of uiItems) {
        const r = screenRect(e)!, label = e.label;
        if (r.x0 < -0.5 || r.y0 < -0.5 || r.x1 > v.width + 0.5 || r.y1 > v.height + 0.5) {
            add("error", "OFFSCREEN_UI", `${label} extends past the screen edge (view is ${round(v.width)}x${round(v.height)}).`, "Use pin() and read view.width/height instead of fixed coordinates, or set maxWidth on text.", label);
        } else if (r.y0 < v.safe.top - 0.5 || r.y1 > v.height - v.safe.bottom + 0.5 || r.x0 < v.safe.left - 0.5 || r.x1 > v.width - v.safe.right + 0.5) {
            add("error", "SAFE_AREA", `${label} sits under the notch or home indicator.`, "Use pin(), which respects safe areas, or inset by view.safe.", label);
        }
        for (const c of controls) {
            const nx = Math.max(r.x0, Math.min(c.x, r.x1)), ny = Math.max(r.y0, Math.min(c.y, r.y1));
            if (Math.hypot(nx - c.x, ny - c.y) < c.r) add("warn", "COVERS_CONTROLS", `${label} overlaps the on-screen "${c.action}" button.`, "Move it away from the bottom-right corner.", label);
        }
    }

    for (const e of live) {
        if (e.textStyle) {
            const size = e.textStyle.size * Math.abs(e.scale.y) * (e.ui ? 1 : s.cam.zoom) * v.scale;
            if (size < MIN_TEXT_CSS) add("warn", "TEXT_TOO_SMALL", `${e.label} renders at ${size.toFixed(1)} CSS px.`, `Keep text at ${MIN_TEXT_CSS}px or more on the smallest screen: at least ${Math.ceil(MIN_TEXT_CSS / v.scale)} view units here.`, e.label);
        }
        if (e.tappable && e.dim === 2) {
            const w = px(e.size.x * e.scale.x), h = px(e.size.y * e.scale.y);
            if (w < MIN_TAP_CSS || h < MIN_TAP_CSS) add("warn", "TAP_TARGET_SMALL", `${e.label} is ${w}x${h} CSS px; fingers need about 44.`, `Make it at least ${Math.ceil(44 / v.scale)} view units on each side.`, e.label);
        }
    }

    const rects = uiItems.map((e) => ({ e, r: screenRect(e)! }));
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        if (!(a.e.textStyle || a.e.tappable) || !(b.e.textStyle || b.e.tappable)) continue;
        if (a.e.parent === b.e || b.e.parent === a.e) continue;
        const ox = Math.min(a.r.x1, b.r.x1) - Math.max(a.r.x0, b.r.x0), oy = Math.min(a.r.y1, b.r.y1) - Math.max(a.r.y0, b.r.y0);
        if (ox > 2 && oy > 2) add("warn", "UI_OVERLAP", `${a.e.label} and ${b.e.label} overlap.`, "Lay them out from view.width/height so they don't collide on small screens.");
    }

    if (g.input.touchMode) {
        const provided = g.touch.provides, pointer = g.input.used.has("pointer"), hasTaps = live.some((e) => e.tappable);
        for (const action of g.input.used) {
            if (action === "pointer" || provided.has(action) || pointer) continue;
            if ((action === "pause" || action === "confirm") && hasTaps) continue;
            add("error", "UNREACHABLE_ACTION", `The game reads action "${action}" but a touch player has no way to trigger it.`, `Add it to createGame({ touch: { stick: true, buttons: ["${action}"] } }), read input.pointer/input.swipe, or add a button().`);
        }
    }
    return out;
}

function isFaded(e: Entity) {
    for (let p: Entity | null = e; p; p = p.parent) if (p.opacity <= 0.01 || p.hidden) return true;
    return false;
}
