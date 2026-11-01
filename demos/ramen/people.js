// Everyone who sits at the counter, painted as busts. Four frames each: calm, cross, delighted, slurping.
export const MOOD = { calm: 0, cross: 1, happy: 2, slurp: 3 };
export const PW = 200, PH = 220;

const INK = "#2e1a14";
// skin, hair, top, accent, hair style, extras
const LOOKS = [
    { skin: "#c58a5e", shade: "#99633e", hair: "#d8d4cc", top: "#2c4a63", accent: "#e2c26c", style: "cap", brow: "heavy", beard: "white", age: 1 },   // 0 Goro
    { skin: "#e9bb92", shade: "#c98f66", hair: "#2c2233", top: "#6fb3a8", accent: "#ffffff", style: "bun", lash: 1, nurse: 1 },                        // 1 Mina
    { skin: "#d9a678", shade: "#b47d54", hair: "#6d6a70", top: "#7a4a35", accent: "#e8d9b0", style: "bald", glasses: 1, bow: 1, age: 1 },              // 2 Tam
    { skin: "#f0c6a0", shade: "#d19a70", hair: "#7a3f22", top: "#df5a3c", accent: "#f7c93b", style: "kidcap", kid: 1 },                                // 3 Pip
    { skin: "#d7a184", shade: "#ae7458", hair: "#7a2a4a", top: "#5e2a6e", accent: "#e8b84a", style: "grand", lash: 1, pearls: 1, age: 1 },             // 4 Odalys
    { skin: "#b67a4e", shade: "#8b5733", hair: "#1e1a1e", top: "#e8a02c", accent: "#2a2a30", style: "helmet", grin: 1 },                               // 5 Rocco
    { skin: "#deb08a", shade: "#b5825d", hair: "#a8a4a8", top: "#3f6b4f", accent: "#d04a3a", style: "perm", lash: 1, stern: 1, age: 1 },               // 6 Fen
    { skin: "#e6b990", shade: "#c28d62", hair: "#262028", top: "#3b3f4e", accent: "#b23a34", style: "neat", tie: 1, tired: 1 },                         // 7 Daichi
    { skin: "#efc4a0", shade: "#cc9670", hair: "#e0683a", top: "#f2ead6", accent: "#c0392b", style: "pony", lash: 1 },                                 // 8 Mio
    { skin: "#c8956a", shade: "#a06e48", hair: "#3a3234", top: "#f2ead6", accent: "#2f3f73", style: "headband", brow: "heavy" },                       // 9 Tetsu
    { skin: "#b98055", shade: "#8e5c38", hair: "#191518", top: "#a92d27", accent: "#fbeed3", style: "bob", lash: 1 },                                  // 10 Hana
    { skin: "#e3b48a", shade: "#bb8759", hair: "#4a6a8a", top: "#2f3f73", accent: "#fbeed3", style: "spike" },                                         // 11 Sora
    { skin: "#e0b48e", shade: "#b98862", hair: "#ece8e0", top: "#a92d27", accent: "#fbeed3", style: "bun", lash: 1, glasses: 1, age: 2, apron: 1 },     // 12 Nana
    // Passers-by
    { skin: "#e9bb92", shade: "#c78e64", hair: "#3a2a22", top: "#8e6db0", accent: "#fff", style: "neat" },
    { skin: "#c58a5e", shade: "#99633e", hair: "#16121a", top: "#4f8e6c", accent: "#fff", style: "bob", lash: 1 },
    { skin: "#f0c6a0", shade: "#cf9a72", hair: "#b8873c", top: "#c95f4a", accent: "#fff", style: "pony", lash: 1 },
    { skin: "#a86f47", shade: "#7f4f2e", hair: "#16121a", top: "#3f6f9f", accent: "#fff", style: "spike" },
    { skin: "#deb08a", shade: "#b5825d", hair: "#57402e", top: "#d3a13a", accent: "#fff", style: "headband", brow: "heavy" },
    { skin: "#efc4a0", shade: "#cc9670", hair: "#20201e", top: "#607a8a", accent: "#fff", style: "neat", glasses: 1 },
];
export const LOOK_COUNT = LOOKS.length;

function paintPerson(p, frame, L) {
    const W = PW, H = PH, cx = W / 2, kid = L.kid ? 0.84 : 1, headY = L.kid ? 96 : 84, S = kid;
    const hx = 54 * S, hy = 60 * S;
    const mood = frame;

    // Shoulders
    const sw = L.kid ? 70 : 88, sy = headY + hy + 14;
    p.ellipse(cx, H + 18, sw + 8, H - sy + 16, L.top);
    p.poly([[cx - sw + 8, H], [cx - 34, sy], [cx + 34, sy], [cx + sw - 8, H]], L.top);
    p.ellipse(cx, sy + 6, 26 * S, 16, L.shade);        // neck
    p.rect(cx - 19 * S, sy - 30, 38 * S, 36, L.shade);
    if (L.nurse) { p.poly([[cx - 26, sy + 2], [cx, sy + 34], [cx + 26, sy + 2]], "#e9f4f0"); }
    if (L.tie) { p.poly([[cx - 22, sy + 2], [cx, sy + 22], [cx + 22, sy + 2]], "#efe9df"); p.poly([[cx - 9, sy + 12], [cx + 9, sy + 12], [cx + 13, sy + 62], [cx, sy + 72], [cx - 13, sy + 62]], L.accent); }
    if (L.bow) { p.poly([[cx - 22, sy - 4], [cx, sy + 8], [cx - 22, sy + 20]], L.accent); p.poly([[cx + 22, sy - 4], [cx, sy + 8], [cx + 22, sy + 20]], L.accent); p.circle(cx, sy + 8, 5, "#8c3a2e"); }
    if (L.pearls) for (let i = -4; i <= 4; i++) { const a = 1.57 + i * 0.26; p.circle(cx + Math.cos(a) * 34, sy - 12 + Math.sin(a) * 30, 5.5, "#fff6e0", "#d8c49a"); }
    if (L.apron) { p.rect(cx - 44, sy + 22, 88, 50, L.accent); p.line(cx - 40, sy + 22, cx - 24, sy - 2, L.accent, 7); p.line(cx + 40, sy + 22, cx + 24, sy - 2, L.accent, 7); }
    if (L.style === "headband" || L.style === "pony" || L.style === "spike") { if (L.top === "#f2ead6") { p.poly([[cx - 28, sy + 2], [cx, sy + 40], [cx + 28, sy + 2]], "#d9cfb8"); } }

    // Hair behind the head
    const back = { bun: 1, grand: 1, perm: 1, bob: 1, pony: 1 }[L.style];
    if (L.style === "bob") p.ellipse(cx, headY + 18, hx + 12, hy + 12, L.hair);
    if (L.style === "grand") { p.ellipse(cx, headY - 6, hx + 20, hy + 18, L.hair); p.circle(cx - 56, headY + 14, 26, L.hair); p.circle(cx + 56, headY + 14, 26, L.hair); }
    if (L.style === "perm") for (let i = 0; i < 16; i++) { const a = -3.3 + i * 0.32; p.circle(cx + Math.cos(a) * (hx + 8), headY - 2 + Math.sin(a) * (hy + 4), 19, L.hair); }
    if (L.style === "pony") { p.ellipse(cx + 54, headY + 26, 15, 40, L.hair); }
    if (L.style === "bun") p.circle(cx, headY - hy - 12, 24, L.hair);
    void back;

    // Ears and head
    p.ellipse(cx - hx + 1, headY + 8, 10, 15, L.shade).ellipse(cx + hx - 1, headY + 8, 10, 15, L.shade);
    p.ellipse(cx, headY, hx, hy, L.skin, L.shade);
    p.ellipse(cx - 22 * S, headY - 22, 18, 12, "#ffffff22");
    const blush = mood === MOOD.happy || mood === MOOD.slurp;
    p.ellipse(cx - 32 * S, headY + 20, 12, 7, blush ? "#e8604a77" : "#e8604a33").ellipse(cx + 32 * S, headY + 20, 12, 7, blush ? "#e8604a77" : "#e8604a33");
    if (L.age) { p.line(cx - 40, headY - 26, cx - 20, headY - 28, L.shade, 2); p.line(cx + 20, headY - 28, cx + 40, headY - 26, L.shade, 2); if (L.age > 1) { p.line(cx - 34, headY + 34, cx - 22, headY + 40, L.shade, 2); p.line(cx + 34, headY + 34, cx + 22, headY + 40, L.shade, 2); } }

    // Eyes
    const eyeY = headY + 2, gap = 24 * S, happyEyes = mood === MOOD.happy || mood === MOOD.slurp;
    for (const sg of [-1, 1]) {
        const ex = cx + gap * sg;
        if (happyEyes) {
            p.line(ex - 10, eyeY + 2, ex, eyeY - 7, INK, 3.6).line(ex, eyeY - 7, ex + 10, eyeY + 2, INK, 3.6);
        } else {
            p.ellipse(ex, eyeY, 9.5, 10.5, "#fffaf0");
            p.circle(ex + 0.6, eyeY + 1.2, 6.2, "#2a1a1a");
            p.circle(ex - 1.4, eyeY - 1.4, 2.2, "#ffffff");
            if (L.tired) p.line(ex - 9, eyeY + 12, ex + 9, eyeY + 12, L.shade, 2.6);
            if (L.lash) p.line(ex + sg * 9, eyeY - 6, ex + sg * 14, eyeY - 10, INK, 2.6);
            p.line(ex - 10, eyeY - 9, ex + 10, eyeY - 9, INK, 2.6);
        }
        // Brows
        const heavy = L.brow === "heavy" ? 6 : 3.4, bc = L.style === "bald" || L.beard ? L.hair : INK;
        const by = eyeY - 19 - (happyEyes ? 4 : 0);
        if (mood === MOOD.cross) p.line(ex - sg * 12, by + 7 * -1 * -0 - 3, ex + sg * 12, by - 3 - 0 - 6 * -1 * 0 + (sg > 0 ? -0 : 0), bc, heavy).line(ex - sg * 13, by + 5, ex + sg * 11, by - 4, bc, heavy);
        else p.line(ex - 12, by + (L.stern ? 2 * sg : 0), ex + 12, by - (L.stern ? 2 * sg : 0), bc, heavy);
    }
    if (L.glasses) for (const sg of [-1, 1]) { const ex = cx + gap * sg; for (let a = 0; a < 6.3; a += 0.3) p.circle(ex + Math.cos(a) * 15, eyeY + Math.sin(a) * 15, 1.6, "#3a2a22"); p.line(cx - 8, eyeY - 2, cx + 8, eyeY - 2, "#3a2a22", 2.6); }

    // Nose
    p.ellipse(cx, headY + 16, 6.5, 5, L.shade);
    if (L.beard) { p.ellipse(cx, headY + 46, 46, 28, L.hair); p.ellipse(cx - 24, headY + 28, 24, 10, L.hair); p.ellipse(cx + 24, headY + 28, 24, 10, L.hair); }
    // Mouth
    const my = headY + (L.beard ? 34 : 34);
    if (mood === MOOD.calm) { if (L.stern) p.line(cx - 12, my, cx + 12, my, "#7a3a2a", 3); else { p.line(cx - 12, my - 1, cx, my + 3, "#7a3a2a", 3).line(cx, my + 3, cx + 12, my - 1, "#7a3a2a", 3); } if (L.grin) p.rect(cx - 8, my - 1, 16, 3, "#ffffff"); }
    if (mood === MOOD.cross) p.line(cx - 12, my + 3, cx, my - 2, "#7a3a2a", 3.2).line(cx, my - 2, cx + 12, my + 3, "#7a3a2a", 3.2);
    if (mood === MOOD.happy) { p.ellipse(cx, my + 1, 17, 12, "#7a2a22"); p.rect(cx - 13, my - 9, 26, 7, "#fff8ec"); p.ellipse(cx, my + 8, 9, 5, "#e0705a"); }
    if (mood === MOOD.slurp) {
        p.circle(cx, my + 2, 9, "#6a2420");
        for (const dx of [-5, 0, 5]) p.line(cx + dx, my + 2, cx + dx * 1.8, H - 40, "#f2c868", 4.4);
        for (const dx of [-5, 0, 5]) p.line(cx + dx - 1, my + 2, cx + dx * 1.8 - 1, H - 40, "#fff0b8", 1.4);
    }

    // Hair over the head
    if (L.style === "cap") { p.ellipse(cx, headY - 40, hx + 4, 34, L.top); p.ellipse(cx, headY - 30, hx + 12, 12, "#223a50"); p.rect(cx - 16, headY - 48, 32, 12, L.accent); p.ellipse(cx - hx + 6, headY - 10, 8, 22, L.hair); p.ellipse(cx + hx - 6, headY - 10, 8, 22, L.hair); }
    if (L.style === "kidcap") { p.ellipse(cx, headY - 34, hx + 3, 34, L.accent); p.ellipse(cx + 14, headY - 24, hx - 2, 10, "#d8a820"); p.ellipse(cx - hx + 8, headY - 4, 10, 16, L.hair); p.ellipse(cx + hx - 8, headY - 4, 10, 16, L.hair); }
    if (L.style === "bald") { p.ellipse(cx - hx + 5, headY - 10, 10, 22, L.hair); p.ellipse(cx + hx - 5, headY - 10, 10, 22, L.hair); p.ellipse(cx - 12, headY - 44, 20, 8, "#ffffff33"); }
    if (L.style === "bun") { p.ellipse(cx, headY - 34, hx + 3, 32, L.hair); p.ellipse(cx - 42, headY - 8, 13, 28, L.hair); p.ellipse(cx + 42, headY - 8, 13, 28, L.hair); }
    if (L.style === "neat") { p.ellipse(cx, headY - 36, hx + 3, 30, L.hair); p.poly([[cx - hx - 3, headY - 30], [cx + 10, headY - 36], [cx - hx + 6, headY - 8]], L.hair); }
    if (L.style === "grand") { p.ellipse(cx - 18, headY - 42, 44, 30, L.hair); p.ellipse(cx + 22, headY - 44, 40, 26, L.hair); p.circle(cx + 40, headY - 58, 10, L.accent); }
    if (L.style === "helmet") { p.ellipse(cx, headY - 34, hx + 8, 40, "#ececdf", "#b8b4a0"); p.rect(cx - 8, headY - 72, 16, 34, L.top); p.ellipse(cx, headY - 8, hx + 12, 7, "#2a2a30"); }
    if (L.style === "perm") for (let i = 0; i < 9; i++) { p.circle(cx - 40 + i * 10, headY - 42 - Math.sin(i * 0.8) * 8, 15, L.hair); }
    if (L.style === "bob") { p.ellipse(cx, headY - 34, hx + 5, 30, L.hair); p.rect(cx - 36, headY - 40, 72, 16, L.hair); }
    if (L.style === "pony") { p.ellipse(cx, headY - 36, hx + 3, 30, L.hair); }
    if (L.style === "headband") { p.ellipse(cx, headY - 38, hx + 2, 28, L.hair); p.rect(cx - hx - 2, headY - 32, hx * 2 + 4, 14, L.accent); p.circle(cx + hx - 4, headY - 25, 8, L.accent); }
    if (L.style === "spike") { p.ellipse(cx, headY - 36, hx + 3, 28, L.hair); for (let i = -3; i <= 3; i++) p.poly([[cx + i * 16 - 13, headY - 48], [cx + i * 18, headY - 78 + Math.abs(i) * 6], [cx + i * 16 + 13, headY - 48]], L.hair); }

    if (mood === MOOD.cross) { p.circle(cx + 56, headY - 50, 6, "#7fc7ff"); p.poly([[cx + 50, headY - 52], [cx + 56, headY - 66], [cx + 62, headY - 52]], "#7fc7ff"); }
    p.outline(INK).shade(0.14, 0.14);
}

export const lookName = (i) => `p${i}`;

export function paintPeople(a) {
    LOOKS.forEach((L, i) => a.paint(lookName(i), PW, PH, (p, f) => paintPerson(p, f, L), { frames: 4, smooth: true }));
}
