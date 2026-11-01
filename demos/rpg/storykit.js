// Small helpers for writing floors, plus each floor's colours.
export const pt = (s) => s.split(" ").map((x) => { const [a, b] = x.split(":"); return [a, Number(b)]; });
export const npc = (name, look, lines, o = {}) => ({ t: "npc", name, look, ...(typeof lines === "function" ? { run: lines } : { lines: Array.isArray(lines) ? lines : [lines] }), ...o });
export const fighter = (name, look, dir, party, pre, win, post, o = {}) => ({ t: "trainer", name, look, dir, party: pt(party), pre, win, post, ...o });
export const THEMES = {
    L: { carpet: "#ddd6c4", carpet2: "#d2cab6", lino: "#b9ae97", wall: "#8fa3b8", cap: "#39414f", trim: "#5b6478", pattern: "grid", accent: "#e5484d", clutter: "paper" },
    B1: { carpet: "#a79e8e", carpet2: "#9c9383", lino: "#c0b6a1", wall: "#7f8c80", cap: "#2c3038", trim: "#6b4d1e", pattern: "grid", accent: "#ffd84d", clutter: "paper" },
    F2: { carpet: "#a2b292", carpet2: "#97a887", lino: "#cbbf9f", wall: "#cdbd93", cap: "#3a3f36", trim: "#7a5f38", pattern: "none", accent: "#ffd84d", clutter: "cups" },
    F3: { carpet: "#dcbcc4", carpet2: "#d3b1ba", lino: "#efe3d0", wall: "#f0e4d2", cap: "#4a3d52", trim: "#a36f86", pattern: "dots", accent: "#ff8fb1", clutter: "paper" },
    F4: { carpet: "#5f6e8a", carpet2: "#56647f", lino: "#8592a8", wall: "#7f8ca2", cap: "#1c2130", trim: "#2fa6a0", pattern: "grid", accent: "#2fa6a0", clutter: "cable" },
    F5: { carpet: "#dccc92", carpet2: "#d2c185", lino: "#f2ead5", wall: "#c9aa5e", cap: "#3f3526", trim: "#7a5f38", pattern: "none", accent: "#e5484d", clutter: "paper" },
    F6: { carpet: "#ead9b4", carpet2: "#e2cfa6", lino: "#f7efdc", wall: "#e2905d", cap: "#4a2c20", trim: "#8a4a2b", pattern: "grid", accent: "#ffd84d", clutter: "cups" },
    F7: { carpet: "#84d3cb", carpet2: "#79c9c1", lino: "#fff0c9", wall: "#ffb9cb", cap: "#3b2a55", trim: "#ffd84d", pattern: "stripe", accent: "#ff8fb1", clutter: "paper" },
    F8: { carpet: "#548068", carpet2: "#4c775f", lino: "#c4cdb9", wall: "#b9c9b2", cap: "#1f3328", trim: "#c9a24a", pattern: "stripe", accent: "#c9a24a", clutter: "gold" },
    F9: { carpet: "#dcbd8e", carpet2: "#d3b382", lino: "#efe8d2", wall: "#d9eed9", cap: "#3f6b52", trim: "#8fbf8f", pattern: "boards", accent: "#6cc265", clutter: "plant" },
    F10: { carpet: "#80414d", carpet2: "#763844", lino: "#c9b38f", wall: "#ab8c6c", cap: "#2c1a1c", trim: "#40281a", pattern: "dots", accent: "#c9a24a", clutter: "paper" },
    B2: { carpet: "#8f7d62", carpet2: "#857358", lino: "#a89577", wall: "#5e5444", cap: "#241f18", trim: "#3a3226", pattern: "none", accent: "#c9a24a", clutter: "paper" },
    F11: { carpet: "#30448c", carpet2: "#2a3c80", lino: "#d5ceba", wall: "#cbc5b5", cap: "#141a33", trim: "#c9a24a", pattern: "dots", accent: "#c9a24a", clutter: "gold" },
    F12: { carpet: "#ebe5d2", carpet2: "#e2dcc8", lino: "#d5ceba", wall: "#bfb196", cap: "#2a2230", trim: "#c9a24a", pattern: "boards", accent: "#c9a24a", clutter: "paper" },
    R: { carpet: "#9aa7b5", carpet2: "#8f9cab", lino: "#b8c3cf", wall: "#a9d4e8", cap: "#39414f", trim: "#6b7588", pattern: "none", accent: "#e5484d", clutter: "plant" },
};
