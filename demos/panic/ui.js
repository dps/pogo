// The one button: an inked, printed slab with bubble letters.
import { button, ui } from "./pogo.js";
import { C, INK, bubble, fit } from "./ink.js";

export function popButton(label, o = {}) {
    const base = button(label, { width: o.width ?? 180, height: o.height ?? 56, onTap: o.onTap, action: o.action }), w0 = o.width ?? 180;
    const size = fit(label, w0 - 22, o.size ?? 26), fill = o.color ?? C.pink;
    return [{
        ...base,
        draw(d, e) {
            const w = e.size.x, h = e.size.y, press = e._pressed ? 3 : 0, r = o.radius ?? 12;
            d.rect(w + 6, h + 6, { x: 4, y: 6, color: INK, radius: r + 2 });
            d.rect(w + 6, h + 6, { y: press, color: INK, radius: r + 2 });
            d.rect(w, h, { y: press, color: fill, radius: r });
            d.rect(w - 12, h * 0.34, { y: press - h * 0.24, color: C.wht, opacity: 0.25, radius: r - 4 });
            if (o.draw) o.draw(d, e, press);
            else bubble(d, label, 0, press, size, { color: o.text ?? C.wht, shadow: o.text === INK ? C.wht : INK });
        },
    }, ui()];
}
