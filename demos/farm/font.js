// Moonpatch's own proportional pixel font, 7 rows tall with 2-row descenders. Drawn from the atlas so all text batches with the art.
// A leading digit is the row the glyph starts on. Without one, a 5-row glyph starts at row 2 and a 7-row glyph at row 0.
const G = {
    A: ".##. #..# #..# #### #..# #..# #..#", B: "###. #..# #..# ###. #..# #..# ###.", C: ".### #... #... #... #... #... .###", D: "###. #..# #..# #..# #..# #..# ###.",
    E: "#### #... #... ###. #... #... ####", F: "#### #... #... ###. #... #... #...", G: ".### #... #... #.## #..# #..# .###", H: "#..# #..# #..# #### #..# #..# #..#",
    I: "### .#. .#. .#. .#. .#. ###", J: "..## ...# ...# ...# ...# #..# .##.", K: "#..# #..# #.#. ##.. #.#. #..# #..#", L: "#... #... #... #... #... #... ####",
    M: "#...# ##.## #.#.# #.#.# #...# #...# #...#", N: "#..# ##.# ##.# #.## #.## #..# #..#", O: ".##. #..# #..# #..# #..# #..# .##.", P: "###. #..# #..# ###. #... #... #...",
    Q: ".##. #..# #..# #..# #.## #..# .###", R: "###. #..# #..# ###. #.#. #..# #..#", S: ".### #... #... .##. ...# ...# ###.", T: "##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..",
    U: "#..# #..# #..# #..# #..# #..# .##.", V: "#..# #..# #..# #..# #.#. #.#. .#..", W: "#...# #...# #...# #.#.# #.#.# ##.## #...#", X: "#..# #..# .##. .##. .##. #..# #..#",
    Y: "#..# #..# #..# .### ...# ...# ###.", Z: "#### ...# ..#. .#.. #... #... ####",
    a: ".##. ...# .### #..# .###", b: "#... #... ###. #..# #..# #..# ###.", c: ".### #... #... #... .###", d: "...# ...# .### #..# #..# #..# .###",
    e: ".##. #..# #### #... .###", f: "..#. .#.# .#.. ###. .#.. .#.. .#..", g: "2 .### #..# #..# #..# .### ...# ###.", h: "#... #... ###. #..# #..# #..# #..#",
    i: "# . # # # # #", j: "..# ... ..# ..# ..# ..# ..# #.# .#.", k: "#... #... #..# #.#. ##.. #.#. #..#", l: "#. #. #. #. #. #. .#",
    m: "####. #.#.# #.#.# #.#.# #.#.#", n: "###. #..# #..# #..# #..#", o: ".##. #..# #..# #..# .##.", p: "2 ###. #..# #..# #..# ###. #... #...",
    q: "2 .### #..# #..# #..# .### ...# ...#", r: "#.## ##.. #... #... #...", s: ".### #... .##. ...# ###.", t: ".#. .#. ### .#. .#. .#. ..#",
    u: "#..# #..# #..# #..# .###", v: "#..# #..# #.#. #.#. .#..", w: "#.#.# #.#.# #.#.# #.#.# .#.#.", x: "#..# .##. .##. .##. #..#",
    y: "2 #..# #..# #..# #..# .### ...# ###.", z: "#### ..#. .#.. #... ####",
    0: ".##. #..# #.## ##.# #..# #..# .##.", 1: ".#. ##. .#. .#. .#. .#. ###", 2: ".##. #..# ...# ..#. .#.. #... ####", 3: "###. ...# ...# .##. ...# ...# ###.",
    4: "#..# #..# #..# #### ...# ...# ...#", 5: "#### #... ###. ...# ...# #..# .##.", 6: ".##. #... #... ###. #..# #..# .##.", 7: "#### ...# ..#. ..#. .#.. .#.. .#..",
    8: ".##. #..# #..# .##. #..# #..# .##.", 9: ".##. #..# #..# .### ...# ...# .##.",
    ".": "5 # #", ",": "5 .# .# #.", "!": "# # # # # . #", "?": ".##. #..# ...# ..#. .#.. .... .#..", ":": "2 # # . # #", ";": "2 .# .# .. .# .# #.", "'": "# # #", '"': "#.# #.# #.#",
    "-": "3 ### ...", "+": "1 ... .#. .#. ### .#. .#.", "/": "..# ..# .#. .#. .#. #.. #..", "(": ".# #. #. #. #. #. .#", ")": "#. .# .# .# .# .# #.", "*": "1 #.# .#. #.#", "=": "2 ### ... ###", "%": "#..# ...# ..#. .#.. #... #..# ....", "&": ".#.. #.#. #.#. .#.. #.## #.#. .#.#", "#": "1 .#.#. ##### .#.#. ##### .#.#.", "_": "6 ####",
    ">": "#.. .#. ..# .#. #..", "<": "..# .#. #.. .#. ..#",
};
export const GLYPH_H = 9;

/** Puts the glyphs in the atlas and returns a font with measure and draw. */
export function makeFont(atlas) {
    const white = [255, 255, 255, 255], adv = {}, rect = {};
    atlas.add("font:sheet", 256, 100, (p) => {
        let cx = 1, cy = 1;
        for (const [ch, src] of Object.entries(G)) {
            const toks = src.split(" ");
            const top = /^\d$/.test(toks[0]) ? +toks.shift() : toks.length <= 5 ? 2 : 0;
            const w = toks[0].length;
            if (cx + w + 1 > 256) { cx = 1; cy += 10; }
            toks.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === "#") p.set(cx + i, cy + top + j, white); });
            const [ox, oy] = atlas.map.get("font:sheet") ?? [p.ox, p.oy];
            rect[ch] = [p.ox + cx, p.oy + cy, w, GLYPH_H];
            adv[ch] = w + 1; cx += w + 1;
        }
    });
    const space = 3;
    const width = (s, scale = 2) => { let w = 0; for (const c of s) w += c === " " ? space : (adv[c] ?? 4); return Math.max(0, w - 1) * scale; };
    /** Greedy word wrap on real glyph widths. */
    const wrap = (s, maxW, scale = 2) => {
        const out = [];
        for (const para of String(s).split("\n")) {
            let line = "";
            for (const word of para.split(" ")) {
                const next = line ? `${line} ${word}` : word;
                if (line && width(next, scale) > maxW) { out.push(line); line = word; } else line = next;
            }
            out.push(line);
        }
        return out;
    };
    const glyphs = (d, s, x, y, scale, col, opacity) => {
        let px = x;
        for (const c of s) {
            if (c === " ") { px += space * scale; continue; }
            const r = rect[c] ?? rect["?"], w = r[2] * scale, h = r[3] * scale;
            d.sprite("atlas", { crop: r, x: px + w / 2, y: y + h / 2, width: w, height: h, color: col, opacity });
            px += adv[c] * scale;
        }
    };
    /** o: scale, color, shadow (colour offset down), outline (colour all round), align left|center|right, opacity. x,y is the top of the line. */
    const draw = (d, s, x, y, o = {}) => {
        s = String(s);
        const scale = o.scale ?? 2, w = width(s, scale), left = Math.round(o.align === "center" ? x - w / 2 : o.align === "right" ? x - w : x), top = Math.round(y), op = o.opacity ?? 1;
        if (o.outline) { for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, 1], [1, 1], [1, -1], [-1, -1]]) glyphs(d, s, left + a * scale / 2, top + b * scale / 2, scale, o.outline, op); }
        if (o.shadow) glyphs(d, s, left, top + scale / 2, scale, o.shadow, op);
        glyphs(d, s, left, top, scale, o.color ?? "#fff", op);
        return w;
    };
    return { width, wrap, draw, rect, lineH: (scale = 2) => 10 * scale };
}
