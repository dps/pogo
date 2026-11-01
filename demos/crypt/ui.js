// Buttons and panels drawn entirely with the pixel font and atlas.
import { pos, rect, tap, ui, layer } from "./pogo.js";
import { C, SPR, nine, ptext, spr, textWidth } from "./art.js";

const val = (v) => (typeof v === "function" ? v() : v);

/**
 * A tappable pixel button. x, y, w, h and the rest may be functions, read each step, so layouts survive resizes.
 * style: 0 amber, 1 teal, 2 dark, 3 cream.
 */
export function addButton(s, o) {
    const e = s.add([ui(), pos(val(o.x), val(o.y)), rect(val(o.w), val(o.h), { color: "#00000000" }), layer(o.layer ?? 50), tap((ev) => {
        if (o.enabled && !o.enabled()) { o.onDenied?.(); return; }
        e.press = 1; o.onTap?.(ev);
    }), {
        press: 0, btn: true, name: o.name ?? o.label ?? "button",
        update(dt) {
            e.pos.x = val(o.x); e.pos.y = val(o.y);
            const w = val(o.w), h = val(o.h);
            e.size.x = w; e.size.y = h;
            e.hidden = o.visible ? !o.visible() : false;
            e.press = Math.max(0, e.press - dt * 6);
        },
        draw(d) {
            if (e.hidden) return;
            const w = val(o.w), h = val(o.h), on = !o.enabled || o.enabled(), style = on ? val(o.style) ?? 0 : 2, dip = e.press > 0.4 ? 2 : 0;
            if (o.paint) { o.paint(d, w, h, on, e.press); return; }
            nine(d, "btn", style, 0, dip, w, h, 2);
            const col = on ? (style === 3 || style === 0 ? C.ink : C.bone) : C.ash;
            const label = val(o.label) ?? "", sc = o.scale ?? 2, icon = val(o.icon);
            if (icon && label) { const tw = textWidth(label, sc), sw = SPR[icon].w * sc / 1, x0 = -(tw + sw + 6) / 2; spr(d, icon, x0 + sw / 2, dip - 2, { scale: sc }); ptext(d, label, x0 + sw + 6, dip - 2, { scale: sc, color: col, align: 0, shadow: false }); }
            else if (icon) spr(d, icon, 0, dip - 2, { scale: sc, opacity: on ? 1 : 0.5 });
            else ptext(d, label, 0, dip - 2, { scale: sc, color: col, shadow: false });
        },
    }]);
    e.hidden = o.visible ? !o.visible() : false;
    return e;
}

export function panel(d, x, y, w, h, dark = true, opacity) { nine(d, "panel", dark ? 1 : 0, x, y, w, h, 2, { opacity }); }

export function dimmer(d, s, a = 0.6) { d.rect(s.view.width, s.view.height, { x: s.view.width / 2, y: s.view.height / 2, color: C.ink, opacity: a }); }
