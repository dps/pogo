// Six bosses, painted when their stage loads. Each is one big body sprite plus a borrowed face from the cast sheet, so wobble, squash
// and pure indignation are all live.
import { Sheet, add, blend, blends, box, cut, disc, meet, oval, polygon, round, seg } from "./paint.js";
import { C, SKIN } from "./art.js";

const SIZE = 1280, U = 2.2;
const P = {
    meatloaf(sh) {
        sh.part("body", 300, 250, 150, 240, (b) => {
            const loaf = blends(26, box(0, -100, 250, 170, 50), box(0, -40, 268, 72, 34));
            b.toon(loaf, "#a55a34", { ink: 3.4, shade: 18, band: 14, dark: "#6a3020", light: "#d88a58" });
            for (const [x, y, r] of [[-90, -60, 10], [-40, -36, 8], [30, -48, 11], [90, -66, 8], [110, -30, 7], [-110, -32, 6], [-10, -74, 6], [58, -22, 6]]) b.toon(oval(x, y, r * 1.3, r), "#c87a48", { ink: 1.4, shade: 3, band: 2, dark: "#8a4a28" });
            // A ketchup glaze, dripping.
            const glaze = blends(8, box(0, -158, 236, 54, 26), box(-88, -118, 26, 62, 13), box(-30, -120, 22, 44, 11), box(36, -114, 26, 72, 13), box(94, -122, 22, 44, 11));
            b.toon(glaze, C.tomato, { ink: 2.8, shade: 9, band: 7, dark: "#a01420", light: "#ffb0a0" });
            b.toon(blends(4, disc(0, -196, 12), disc(-14, -190, 9), disc(14, -190, 9)), "#3cae4a", { ink: 2.2, shade: 4, band: 2, dark: "#177a3c" });
            b.flat(blends(4, oval(-70, -178, 26, 6), oval(-30, -181, 12, 3)), "#ffd8c8", 0.8);
        });
    },
    frank(sh) {
        sh.part("body", 150, 300, 75, 290, (b) => {
            const dog = blend(10, box(0, -150, 76, 276, 36), disc(0, -270, 32));
            // Bun behind, suit in front: he wears the bun like a very formal cape.
            b.toon(blends(10, box(-34, -120, 44, 220, 22), box(34, -120, 44, 220, 22)), "#e8b868", { ink: 3, shade: 10, band: 7, dark: "#b07a30", light: "#ffe6a8" });
            b.toon(dog, "#e8604a", { ink: 3.2, shade: 11, band: 8, dark: "#a02830", light: "#ffa08a" });
            const suit = meet(box(0, -60, 90, 120, 6), round(dog, -3));
            b.toon(suit, "#3a3f62", { ink: 2.2, shade: 8, band: 6, dark: "#22264a", light: "#6a70a0" });
            b.toon(polygon([[-14, -124], [14, -124], [0, -92]]), C.cream, { ink: 1.7, shade: 0 });
            b.toon(polygon([[-6, -112], [6, -112], [9, -56], [0, -44], [-9, -56]]), C.mustard, { ink: 1.7, shade: 3, band: 2 });
            const sq = []; for (let i = 0; i < 22; i++) { const t0 = i / 22, t1 = (i + 1) / 22; sq.push(seg(Math.sin(t0 * 16) * 24, -232 + t0 * 96, Math.sin(t1 * 16) * 24, -232 + t1 * 96, 4)); }
            b.toon(add(...sq), C.mustard, { ink: 1.6, shade: 2, band: 1, dark: "#e08a14" });
            b.toon(box(24, -92, 26, 18, 3), C.mustard, { ink: 1.8, shade: 3, band: 2, light: "#fff" });
        });
        sh.part("slip", 60, 40, 30, 20, (b) => b.toon(box(0, 0, 50, 30, 2), "#ff9ac8", { ink: 2, shade: 3, band: 2, light: "#fff" }));
    },
    coach(sh) {
        sh.part("body", 280, 250, 140, 240, (b) => {
            const d = blends(16, oval(0, -100, 124, 100), box(0, -30, 220, 54, 26));
            b.toon(d, "#fff0d8", { ink: 3.4, shade: 20, band: 16, dark: "#d8b888", light: "#ffffff" });
            for (let i = -5; i <= 5; i++) { const x = i * 18; b.stroke(seg(x, -196 + Math.abs(i) * 7, x * 0.3, -214, 0), 3, "#b89868"); b.flat(seg(x * 1.05, -190 + Math.abs(i) * 8, x * 0.4, -226, 3, 2), "#c8a878"); }
            b.toon(blends(4, disc(0, -226, 14), disc(0, -240, 7)), "#fff0d8", { ink: 3, shade: 5, band: 3, dark: "#d8b888" });
            // Headband, whistle, and very small shorts.
            b.toon(meet(box(0, -158, 300, 22, 2), round(d, -3)), C.tomato, { ink: 2.2, shade: 4, band: 2, dark: "#a01420" });
            b.toon(meet(box(0, -24, 300, 50, 6), round(d, -3)), C.blue, { ink: 2.4, shade: 7, band: 5, dark: "#2346b0", light: "#a0c0ff" });
            b.flat(meet(box(-108, -24, 10, 50), round(d, -3)), C.cream); b.flat(meet(box(108, -24, 10, 50), round(d, -3)), C.cream);
            b.stroke(blend(2, seg(-58, -120, 0, -60, 0), seg(58, -120, 0, -60, 0)), 3, C.ink);
            b.toon(box(0, -54, 30, 18, 6), "#ffd868", { ink: 2.2, shade: 3, band: 2, light: "#fff" });
        });
    },
    aspic(sh) {
        sh.part("body", 270, 240, 135, 230, (b) => {
            const f = blends(18, oval(0, -96, 112, 96), box(0, -20, 232, 40, 18));
            // See-through jelly: a pale wash with dark rims and things suspended inside.
            b.fill(f, (x, y, d, c) => { const k = Math.min(1, -d / 44), G = [100, 230, 150], E = [40, 170, 120]; c[0] = E[0] + (G[0] - E[0]) * k; c[1] = E[1] + (G[1] - E[1]) * k; c[2] = E[2] + (G[2] - E[2]) * k; c[3] = 0.9; });
            for (const [x, y, r, col] of [[-60, -60, 12, C.orange], [50, -50, 10, C.lime], [-20, -36, 8, C.tomato], [80, -86, 9, C.orange], [-84, -112, 8, C.lime], [20, -30, 7, C.mustard]]) b.toon(disc(x, y, r), col, { ink: 1.8, shade: 3, band: 2 });
            b.stroke(f, 6, C.ink);
            b.flat(blends(10, oval(-58, -154, 30, 12), oval(-74, -128, 10, 18)), "#ffffff", 0.75);
            // A collar and a clip-on bow tie. He is a professional.
            b.toon(box(0, -6, 200, 18, 6), "#fffdf4", { ink: 2.4, shade: 3, band: 2 });
            b.toon(add(polygon([[-30, -22], [0, -8], [-30, 6]]), polygon([[30, -22], [0, -8], [30, 6]])), C.pink, { ink: 2.2, shade: 3, band: 2 });
        });
        sh.part("goggles", 170, 70, 85, 35, (b) => {
            b.toon(box(0, 0, 160, 16, 4), "#3a3f62", { ink: 2, shade: 3, band: 2 });
            for (const x of [-38, 38]) { b.toon(disc(x, 0, 30), "#3a3f62", { ink: 2.6, shade: 4, band: 2 }); b.fill(disc(x, 0, 24), (X, Y, d, c) => { c[0] = 200; c[1] = 250; c[2] = 255; c[3] = 0.5; }); }
        });
    },
    shush(sh) {
        sh.part("body", 170, 350, 85, 340, (b) => {
            // A very long cardigan and a floor-length skirt that hovers.
            b.toon(polygon([[-50, -190], [50, -190], [76, -30], [52, -6], [24, -16], [0, -4], [-26, -16], [-52, -6], [-76, -30]]), "#7a4fa0", { ink: 3, shade: 13, band: 10, dark: "#4a2a72", light: "#b08ae0" });
            b.toon(blends(10, box(0, -196, 104, 96, 30)), "#c86a68", { ink: 3, shade: 9, band: 7, dark: "#8a3a48", light: "#ffa8a0" });
            for (let i = 0; i < 4; i++) b.toon(disc(0, -226 + i * 24, 5), C.mustard, { ink: 1.5, shade: 2, band: 1 });
            b.flat(box(0, -196, 3, 92), "#8a3a48");
            b.toon(blends(4, oval(0, -260, 42, 40), oval(0, -236, 32, 16)), SKIN[3], { ink: 3, shade: 9, band: 7, dark: "#c47d5a" });
            // The bun is a soup bowl with alphabet noodles.
            const bowl = cut(oval(0, -298, 52, 30), box(0, -336, 120, 40));
            b.toon(bowl, C.cream, { ink: 3, shade: 7, band: 5, dark: "#d8b888" });
            b.toon(oval(0, -298, 44, 11), "#ff9a3c", { ink: 2.2, shade: 3, band: 2, dark: "#d8701a", light: "#ffd080" });
            for (const [x, y] of [[-22, -300], [-4, -296], [18, -300], [28, -294], [-34, -296]]) b.flat(box(x, y, 7, 3, 1), C.cream);
        });
    },
    casserole(sh) {
        sh.part("body", 420, 300, 210, 290, (b) => {
            // A vast dish that has given up pretending to be food.
            b.toon(blends(16, box(0, -60, 380, 110, 30), box(0, -6, 330, 20, 8)), "#d8dce8", { ink: 3.6, shade: 13, band: 9, dark: "#8a90b0", light: "#ffffff" });
            b.toon(box(-200, -66, 40, 34, 12), "#d8dce8", { ink: 3.4, shade: 5, band: 3, dark: "#8a90b0" }); b.toon(box(200, -66, 40, 34, 12), "#d8dce8", { ink: 3.4, shade: 5, band: 3, dark: "#8a90b0" });
            const crust = blends(20, box(0, -140, 350, 110, 40), oval(-90, -190, 90, 50), oval(70, -200, 110, 60), oval(0, -230, 70, 36));
            b.toon(crust, "#f0a838", { ink: 3.4, shade: 18, band: 14, dark: "#a85a18", light: "#ffe08a" });
            for (const [x, y, r] of [[-120, -120, 22], [-40, -96, 16], [60, -110, 26], [130, -140, 16], [-70, -176, 13], [40, -190, 17], [150, -98, 12]]) b.toon(oval(x, y, r * 1.2, r), "#c86a20", { ink: 1.8, shade: 4, band: 3, dark: "#7a3410" });
            const cheese = blends(6, box(-120, -90, 26, 50, 13), box(-54, -82, 22, 66, 11), box(30, -86, 26, 58, 13), box(110, -84, 22, 62, 11), box(160, -94, 16, 40, 8));
            b.toon(meet(add(cheese, box(0, -116, 340, 20, 6)), box(0, -80, 360, 120)), C.mustard, { ink: 2.4, shade: 6, band: 4, dark: "#e08a14", light: "#fff4a8" });
        });
        sh.part("tent", 90, 240, 45, 230, (b) => { b.toon(blends(10, seg(0, 0, -6, -110, 24, 15), seg(-6, -110, 14, -210, 15, 7)), C.mustard, { ink: 3, shade: 8, band: 6, dark: "#e08a14", light: "#fff4a8" }); });
    },
};

export function paintBoss(assets, id) {
    let parts;
    assets.paint("boss_" + id, SIZE, SIZE, (p) => { const sh = new Sheet(p, SIZE, U); P[id](sh); parts = sh.parts; }, { smooth: true });
    return parts;
}
