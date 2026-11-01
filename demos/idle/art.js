// All sticker, town and space art, painted once at startup with the Ink rasterizer. Everything shares one poster palette.
import { Ink, mix, noise2, rgba } from "./ink.js";
export const C = { ink: "#1d1640", paper: "#fff4dc", cream: "#fbeccb", gold: "#ffb627", coral: "#ff5e5b", orange: "#ff7a18", teal: "#18b7a0", mint: "#9be3d3", sky: "#7fd6e8", violet: "#6c4ed9", plum: "#3a1f7a", pink: "#ff8fa3", grass: "#6cc24a", grassD: "#3f9b4a", steel: "#8d93b5", steelD: "#565c88", white: "#ffffff", brown: "#a86a3d", brownD: "#6f3f2a", skin: "#f6bd8d", skinD: "#b8734f", red: "#e8413e", blue: "#3f7fd1" };
const c = C;

// ---- Sale items, 100-unit cells ----------------------------------------------------------------
const ITEMS = {
    cables(I) {
        I.rr(14, 46, 72, 40, 4, I.grad(0, 46, 0, 86, "#d9a56b", "#b77a48")); I.poly([14, 46, 2, 34, 22, 28, 34, 46], "#e7bc86"); I.poly([86, 46, 98, 34, 78, 28, 66, 46], "#c98f58");
        I.line([30, 46, 26, 20, 44, 12, 52, 34], 6, c.coral, true); I.line([42, 46, 54, 14, 72, 22, 62, 42], 6, c.teal, true); I.line([58, 46, 40, 26, 66, 8, 80, 30], 5, c.gold, true); I.line([20, 46, 12, 18, 30, 8], 5, c.violet, true);
        I.rr(24, 4, 14, 9, 2, c.steelD); I.rr(70, 26, 12, 10, 2, c.ink); I.rr(26, 60, 48, 15, 2, c.paper); I.line([32, 67, 68, 67], 3, c.ink);
    },
    lamp(I) {
        I.poly([34, 92, 66, 92, 58, 66, 42, 66], I.grad(30, 0, 70, 0, "#8d93b5", "#3a3d66")); I.poly([40, 66, 60, 66, 68, 18, 58, 6, 42, 6, 32, 18], I.grad(0, 6, 0, 66, "#ffb627", "#ff5e5b"));
        I.blob([50, 54, 62, 58, 58, 44, 46, 44], c.pink); I.blob([44, 26, 52, 16, 58, 26, 50, 36], "#ffd76e"); I.blob([40, 44, 46, 36, 50, 44, 44, 50], "#ffd76e"); I.poly([42, 6, 58, 6, 54, 0, 46, 0], c.steelD); I.line([38, 18, 36, 56], 3, "#ffffff77");
    },
    bread(I) {
        I.rr(14, 28, 72, 62, 10, I.grad(0, 28, 0, 90, "#f4f2ee", "#b9bbd0")); I.rr(22, 18, 56, 18, 8, "#dfe0ea"); I.rr(26, 44, 34, 22, 4, c.ink); I.rr(30, 48, 26, 14, 2, c.teal); I.circ(72, 50, 5, c.coral); I.circ(72, 66, 5, c.gold); I.rr(26, 74, 48, 7, 2, c.steelD);
        I.blob([34, 18, 40, 6, 62, 6, 68, 18], "#e7a65a"); I.blob([40, 14, 44, 9, 56, 9, 60, 14], "#f5c98a");
    },
    bike(I) {
        I.circ(28, 72, 18, c.ink); I.circ(28, 72, 10, c.steel); I.circ(28, 72, 4, c.ink); I.line([28, 72, 52, 72, 66, 34], 7, c.coral); I.line([52, 72, 42, 40], 7, c.coral); I.line([42, 40, 66, 44], 6, c.coral); I.rr(32, 34, 20, 7, 3, c.ink); I.line([66, 34, 74, 18, 86, 16], 6, c.steelD); I.line([52, 72, 70, 92], 6, c.steelD); I.line([60, 92, 84, 92], 6, c.ink); I.line([20, 92, 40, 92], 6, c.ink);
        I.blob([66, 22, 80, 18, 92, 30, 88, 66, 72, 68, 62, 44], c.teal); I.line([80, 28, 78, 62], 2.5, "#0d8f7d"); I.rr(70, 10, 18, 7, 3, c.gold);
    },
    trophy(I) {
        I.rr(28, 80, 44, 14, 3, c.brown); I.rr(40, 62, 20, 20, 2, I.grad(40, 0, 60, 0, "#ffd76e", "#c9831a")); I.line([28, 18, 12, 18, 16, 40, 34, 46], 6, c.gold, true); I.line([72, 18, 88, 18, 84, 40, 66, 46], 6, c.gold, true);
        I.poly([26, 10, 74, 10, 66, 48, 54, 60, 46, 60, 34, 48], I.grad(26, 0, 74, 0, "#ffe9a8", "#e0921c")); I.star(50, 32, 5, 13, 6, c.paper); I.rr(34, 84, 32, 6, 1, c.paper);
        I.circ(70, 4 + 4, 0.1, c.gold);
    },
    house(I) { houseBody(I, 50, 92, 1, c.coral, c.teal); I.star(80, 18, 8, 8, 3, "#ffffff"); I.ell(16, 18, 8, 4, "#ffffff"); },
    bus(I) {
        I.rr(6, 28, 88, 46, 8, I.grad(0, 28, 0, 74, "#ffd052", "#f39a1e")); I.rr(6, 28, 88, 8, 4, "#ffe08a"); for (let i = 0; i < 5; i++) I.rr(12 + i * 15, 38, 12, 14, 2, i === 4 ? c.sky : c.mint); I.rr(6, 60, 88, 3.5, 0, c.ink); I.circ(26, 76, 11, c.ink); I.circ(26, 76, 5, c.steel); I.circ(74, 76, 11, c.ink); I.circ(74, 76, 5, c.steel); I.circ(92, 68, 3, c.paper);
    },
    tower(I) {
        I.line([34, 92, 40, 44], 5, c.steelD); I.line([66, 92, 60, 44], 5, c.steelD); I.line([50, 92, 50, 44], 5, c.steelD); I.line([36, 76, 64, 62], 3, c.steelD); I.line([64, 76, 36, 62], 3, c.steelD);
        I.ell(50, 34, 34, 20, I.grad(16, 0, 84, 0, "#c7ecf6", "#4a93c9")); I.poly([20, 22, 50, 4, 80, 22], c.coral); I.rr(16, 32, 68, 3, 0, "#ffffff55");
    },
    hall(I) {
        I.rr(12, 42, 76, 50, 0, I.grad(0, 42, 0, 92, "#fff4dc", "#cdbba0")); I.poly([6, 44, 50, 18, 94, 44], c.teal); for (let i = 0; i < 5; i++) I.rr(19 + i * 14, 46, 6, 44, 1, "#e0cfb0"); I.rr(4, 88, 92, 7, 0, c.steel); I.rr(45, 6, 10, 16, 0, c.gold); I.poly([50, -4, 55, 7, 45, 7], c.coral); I.rr(43, 66, 14, 24, 7, c.brownD); I.circ(50, 34, 6, c.paper); I.line([50, 34, 50, 30], 1.6, c.ink); I.line([50, 34, 53, 34], 1.6, c.ink);
    },
    bridge(I) {
        I.rr(2, 66, 96, 10, 1, c.coral); I.rr(22, 14, 8, 80, 1, "#e8413e"); I.rr(70, 14, 8, 80, 1, "#e8413e"); I.line([0, 58, 26, 14, 50, 50, 74, 14, 100, 58], 3, c.ink, false); for (let i = 0; i < 9; i++) { const x = 6 + i * 11; I.line([x, 66, x, Math.max(20, 62 - Math.abs(((x % 48) - 24)) * 1.6)], 1.4, c.ink); }
        I.ell(50, 92, 50, 8, c.blue);
    },
    mountain(I) { I.poly([2, 92, 40, 16, 56, 40, 66, 26, 98, 92], I.grad(0, 16, 0, 92, "#8a7bd1", "#3a1f7a")); I.poly([40, 16, 52, 34, 44, 32, 38, 42, 32, 32], c.paper); I.poly([66, 26, 76, 46, 68, 42, 62, 50, 58, 40], c.paper); I.ell(50, 92, 48, 7, c.grass); },
    ocean(I) {
        I.ell(50, 66, 46, 26, I.grad(0, 40, 0, 92, "#49c7dd", "#2356b0")); I.line([14, 62, 28, 56, 42, 62, 56, 56, 70, 62, 86, 56], 4, "#ffffffaa", true); I.line([24, 76, 38, 70, 52, 76, 66, 70, 78, 76], 3.4, "#ffffff77", true);
        I.rr(32, 34, 36, 26, 4, "#ffffff55"); I.line([50, 30, 50, 12], 4, c.brownD); I.poly([50, 12, 72, 24, 50, 30], c.paper); I.poly([40, 44, 60, 44, 56, 54, 44, 54], c.brown);
    },
    ice(I) { I.blob([8, 70, 22, 40, 38, 48, 54, 26, 76, 44, 92, 66, 70, 86, 34, 90], I.grad(0, 26, 0, 90, "#ffffff", "#9fd8ee")); I.poly([34, 62, 44, 42, 56, 66], "#d9f3fb"); I.ell(76, 66, 7, 11, c.ink); I.ell(76, 69, 4.4, 7, c.paper); I.circ(76, 53, 5, c.ink); I.poly([74, 54, 82, 56, 74, 58], c.gold); },
    belt(I) {
        I.ell(50, 54, 44, 34, "#00000000"); I.line([10, 58, 16, 30, 50, 22, 84, 30, 90, 58, 84, 76, 50, 84, 16, 76, 10, 58], 12, c.brown, true); I.line([10, 58, 16, 30, 50, 22, 84, 30, 90, 58], 3, "#c98f58", true);
        I.rr(36, 70, 28, 24, 4, c.gold); I.rr(43, 77, 14, 10, 2, c.brown); I.line([50, 82, 62, 82], 3.4, c.steel);
    },
    cloud(I) { I.ell(50, 62, 42, 24, I.grad(0, 36, 0, 84, "#ffffff", "#b9d8f0")); I.circ(34, 50, 18, "#ffffff"); I.circ(58, 42, 24, "#ffffff"); I.circ(76, 56, 14, "#f3fbff"); I.rr(26, 16, 26, 16, 2, "#ffffff00"); I.rr(68, 18, 26, 20, 2, c.gold); I.poly([68, 26, 81, 32, 94, 26, 94, 18, 68, 18], "#ffcd5f"); },
    nebula(I) { I.blob([12, 56, 24, 22, 52, 12, 84, 28, 92, 60, 66, 88, 30, 86], I.grad(10, 10, 90, 90, "#ff8fa3", "#6c4ed9")); I.blob([30, 56, 40, 34, 62, 30, 74, 52, 56, 72], I.grad(30, 30, 74, 74, "#ffd76e", "#ff5e5b")); I.star(52, 50, 4, 12, 2.4, "#ffffff"); I.star(26, 40, 4, 6, 1.4, "#ffffff"); I.star(76, 68, 4, 6, 1.4, "#ffffff"); },
    pulsar(I) { I.poly([50, 50, 12, -2, 28, -6], "#9be3d3"); I.poly([50, 50, 88, 102, 72, 106], "#9be3d3"); I.poly([50, 50, 20, -4, 26, -5], "#ffffff"); I.poly([50, 50, 80, 104, 74, 105], "#ffffff"); I.circ(50, 50, 20, I.grad(32, 32, 68, 68, "#ffffff", "#7fd6e8")); I.ell(50, 50, 34, 8, "#18b7a0cc", -0.5); I.circ(50, 50, 13, "#fff4dc"); },
    neutron(I) { I.circ(50, 50, 34, I.grad(20, 20, 80, 80, "#ffffff", "#5a8ae0")); I.circ(50, 50, 24, I.grad(26, 26, 72, 72, "#ffffff", "#9dc0f5")); I.rr(16, 74, 68, 12, 3, c.ink); I.rr(20, 77, 60, 6, 1, c.gold); I.line([28, 76, 72, 76], 0.1, c.ink); I.line([14, 90, 86, 90], 4, c.steelD); },
    hole(I) { I.ell(50, 50, 46, 18, I.grad(0, 0, 100, 0, "#ffd76e", "#ff5e5b"), -0.3); I.circ(50, 50, 28, "#07041a"); I.ell(50, 50, 46, 6, "#ffb627", -0.3); I.poly([20, 80, 80, 80, 74, 96, 26, 96], c.brown); I.poly([20, 80, 34, 70, 66, 70, 80, 80], "#c98f58"); },
    universe(I) { globeBall(I, 50, 50, 44, 1); },
};
function houseBody(I, x, y, s, wall, roof) {
    const W = 62 * s, H = 44 * s, l = x - W / 2;
    I.rr(l, y - H, W, H, 1, I.grad(0, y - H, 0, y, mix(wall, "#ffffff", 0.2), wall)); I.poly([l - 8 * s, y - H, x, y - H - 34 * s, l + W + 8 * s, y - H], roof); I.poly([x, y - H - 34 * s, l + W + 8 * s, y - H, x + 24 * s, y - H], mix(roof, "#000000", 0.15));
    I.rr(l + 8 * s, y - 30 * s, 14 * s, 14 * s, 1, c.mint); I.rr(l + 40 * s, y - 30 * s, 14 * s, 14 * s, 1, c.mint); I.rr(x - 6 * s, y - 24 * s, 12 * s, 24 * s, 1, c.brownD); I.rr(l + 40 * s, y - 62 * s, 7 * s, 18 * s, 0, c.brownD);
}
function globeBall(I, x, y, r, level) {
    I.circ(x, y, r, I.grad(x - r, y - r, x + r, y + r, "#2a1a78", "#0a0730"));
    const seedStars = [[-0.4, -0.3], [0.3, -0.5], [0.5, 0.2], [-0.2, 0.5], [0.05, 0.1], [-0.55, 0.15], [0.2, 0.55]];
    I.ell(x, y, r * 0.7, r * 0.25, "#ff8fa388", -0.5); I.ell(x, y, r * 0.5, r * 0.13, "#ffd76eaa", -0.5); I.circ(x, y, r * 0.08, "#ffffff");
    for (const [a, b] of seedStars) I.star(x + a * r, y + b * r, 4, r * 0.09, r * 0.02, "#ffffff");
    I.ell(x - r * 0.42, y - r * 0.5, r * 0.3, r * 0.18, "#ffffff44", -0.7); I.ell(x + r * 0.55, y + r * 0.6, r * 0.14, r * 0.06, "#ffffff22", -0.8);
}

// ---- Crew icons, 100-unit cells ----------------------------------------------------------------
const CREW = [
    // Driveway
    (I) => { I.rr(20, 56, 52, 22, 4, c.coral); I.circ(32, 82, 9, c.ink); I.circ(62, 82, 9, c.ink); I.line([72, 58, 90, 40], 5, c.steelD); I.circ(40, 34, 15, c.skin); I.rr(25, 16, 30, 11, 5, c.gold); I.rr(26, 42, 26, 16, 4, c.teal); I.rr(70, 10, 6, 28, 2, c.brown); I.ell(73, 12, 9, 12, c.pink); },
    (I) => { I.rr(18, 34, 64, 54, 4, I.grad(0, 34, 0, 88, "#e7bc86", "#b77a48")); I.rr(30, 40, 40, 6, 2, c.ink); I.rr(26, 56, 48, 20, 2, c.paper); I.line([34, 66, 66, 66], 3, c.coral); I.ell(50, 26, 16, 5, c.gold); I.ell(50, 22, 16, 5, "#ffd76e"); },
    (I) => { I.rr(8, 58, 84, 30, 4, c.paper); I.rr(8, 58, 84, 8, 2, c.coral); I.rr(16, 42, 28, 16, 3, c.gold); I.rr(16, 42, 28, 6, 3, "#fff09a"); I.rr(52, 42, 28, 16, 3, "#ffd052"); I.rr(52, 42, 28, 6, 3, "#fff09a"); I.star(30, 18, 6, 12, 7, "#ffd76e"); },
    (I) => { I.poly([6, 44, 66, 34, 66, 24, 94, 50, 66, 76, 66, 66, 6, 58], c.orange); I.poly([6, 44, 66, 34, 66, 24, 80, 37, 6, 50], "#ffa24a"); I.circ(30, 80, 12, c.skin); I.rr(16, 88, 28, 12, 3, c.teal); },
    (I) => { I.rr(10, 36, 80, 12, 2, c.mint); I.line([20, 48, 34, 92], 5, c.steelD); I.line([80, 48, 66, 92], 5, c.steelD); I.line([34, 48, 22, 92], 5, c.steelD); I.line([66, 48, 78, 92], 5, c.steelD); I.rr(26, 22, 18, 14, 2, c.coral); I.rr(52, 16, 22, 20, 2, c.gold); },
    // Main Street
    (I) => { for (let i = 0; i < 3; i++) { const x = 8 + i * 29; I.rr(x, 44, 26, 44, 1, c.paper); I.poly([x - 3, 44, x + 29, 44, x + 26, 26, x, 26], i === 1 ? c.teal : c.coral); I.rr(x + 4, 60, 18, 10, 1, c.gold); } },
    (I) => { I.rr(16, 30, 68, 36, 3, c.gold); I.circ(36, 48, 11, c.skin); I.blob([24, 44, 28, 32, 46, 32, 48, 44], "#b43c7a"); I.line([54, 42, 76, 42], 4, c.ink); I.line([54, 54, 70, 54], 4, c.ink); I.line([26, 66, 26, 92], 6, c.steelD); I.line([74, 66, 74, 92], 6, c.steelD); I.rr(12, 66, 76, 8, 2, c.brown); },
    (I) => { I.rr(10, 22, 80, 56, 8, c.steelD); I.rr(16, 28, 56, 44, 6, I.grad(0, 28, 0, 72, "#ff8fa3", "#6c4ed9")); I.star(44, 50, 8, 16, 7, c.gold); I.circ(80, 38, 4, c.gold); I.circ(80, 52, 4, c.coral); I.line([36, 22, 22, 6], 3, c.ink); I.line([56, 22, 70, 6], 3, c.ink); },
    (I) => { I.circ(50, 34, 19, c.skin); I.rr(30, 12, 40, 12, 5, c.ink); I.rr(38, 2, 24, 14, 2, c.ink); I.rr(24, 52, 52, 40, 8, c.plum); I.poly([44, 52, 56, 52, 50, 76], c.coral); I.line([72, 58, 94, 46], 7, c.plum); I.line([94, 34, 88, 56], 3, c.steel); I.line([84, 36, 96, 52], 3, c.steel); },
    (I) => { I.rr(20, 8, 60, 84, 3, c.paper); for (let i = 0; i < 5; i++) I.line([30, 22 + i * 12, 70, 22 + i * 12], 3, c.steel); I.star(66, 74, 10, 15, 11, c.coral); I.rr(16, 2, 14, 12, 2, c.gold); },
    // Planet
    (I) => { I.poly([6, 58, 94, 58, 82, 84, 14, 84], c.coral); I.rr(24, 40, 14, 18, 1, c.gold); I.rr(38, 40, 14, 18, 1, c.teal); I.rr(52, 40, 14, 18, 1, c.mint); I.rr(70, 26, 14, 32, 2, c.paper); I.line([0, 92, 25, 88, 50, 92, 75, 88, 100, 92], 4, c.blue, true); },
    (I) => { I.rr(8, 22, 84, 56, 6, c.ink); I.rr(14, 28, 72, 44, 3, c.coral); I.star(32, 50, 12, 18, 12, c.gold); I.rr(54, 42, 26, 8, 2, c.paper); I.rr(54, 54, 18, 6, 2, c.paper); I.rr(34, 80, 32, 8, 2, c.steelD); },
    (I) => { I.blob([14, 40, 30, 26, 48, 34, 44, 62, 26, 70], c.grass); I.blob([56, 46, 76, 36, 90, 54, 80, 80, 62, 76], c.grassD); I.line([44, 48, 56, 56], 4, c.gold); I.poly([54, 48, 62, 58, 50, 60], c.gold); I.rr(60, 22, 18, 14, 2, c.brown); I.line([60, 28, 78, 28], 2, c.paper); },
    (I) => { I.circ(50, 50, 40, c.paper); I.circ(50, 50, 34, c.teal); I.poly([50, 16, 50, 50, 84, 50], c.mint); I.line([50, 50, 50, 24], 6, c.ink); I.line([50, 50, 68, 62], 6, c.ink); I.circ(50, 50, 5, c.gold); },
    (I) => { I.blob([50, 4, 86, 22, 80, 42, 58, 34, 60, 48, 76, 58, 58, 72, 52, 64, 46, 74, 54, 94, 30, 70, 30, 54, 42, 44, 16, 34], I.grad(0, 0, 0, 90, "#b8d4ec", "#3f7fd1")); I.circ(50, 40, 6, c.paper); },
    // Solar
    (I) => { I.ell(50, 80, 44, 14, c.steel); I.ell(30, 78, 8, 3, c.steelD); I.ell(70, 84, 10, 3, c.steelD); I.poly([28, 72, 50, 28, 72, 72], "#b6ecf2bb"); I.rr(40, 54, 20, 18, 1, c.coral); I.star(50, 14, 4, 10, 2, c.paper); },
    (I) => { I.line([4, 80, 96, 40], 12, c.steelD); I.line([4, 80, 96, 40], 5, c.ink); I.blob([20, 58, 30, 50, 40, 58, 32, 66], c.steel); I.blob([48, 42, 60, 34, 68, 44, 56, 52], c.brown); I.blob([72, 34, 84, 24, 92, 34, 80, 42], c.steel); I.rr(38, 22, 16, 10, 2, c.gold); },
    (I) => { I.poly([70, 32, 2, 96, 82, 56], "#7fd6e8aa"); I.poly([70, 34, 26, 92, 80, 54], "#ffffff88"); I.circ(74, 40, 18, I.grad(60, 26, 88, 54, "#ffffff", "#9be3d3")); I.rr(66, 32, 16, 12, 1, c.brown); I.line([66, 38, 82, 38], 1.8, c.paper); },
    (I) => { I.ell(50, 50, 46, 14, c.gold, -0.2); I.ell(50, 50, 32, 8, "#00000000", -0.2); I.circ(50, 50, 24, I.grad(26, 26, 74, 74, "#ffe9a8", "#d98a2a")); I.ell(50, 54, 46, 7, "#ffcd5f", -0.2); I.rr(62, 66, 30, 22, 2, c.paper); I.line([68, 74, 86, 74], 2.6, c.ink); I.line([68, 81, 80, 81], 2.6, c.ink); },
    (I) => { I.star(50, 50, 16, 46, 34, c.gold); I.circ(50, 50, 30, c.coral); I.rr(32, 34, 36, 34, 3, c.ink); I.rr(36, 38, 28, 12, 1, c.mint); I.circ(42, 58, 3, c.gold); I.circ(50, 58, 3, c.gold); I.circ(58, 58, 3, c.gold); },
    // Galaxy
    (I) => { for (let r = 42; r > 6; r -= 7) I.ell(50, 50, r, r * 0.86, r % 2 ? "#6c4ed9" : "#3a1f7a"); I.circ(50, 50, 6, "#ffffff"); I.rr(66, 72, 30, 18, 3, c.coral); I.rr(70, 66, 18, 8, 2, c.mint); I.circ(72, 92, 3, c.ink); I.circ(90, 92, 3, c.ink); },
    (I) => { I.rr(22, 24, 56, 36, 3, c.ink); I.rr(26, 28, 48, 28, 2, c.gold); I.poly([38, 34, 62, 34, 50, 52], c.coral); I.line([50, 60, 50, 92], 6, c.steelD); I.line([20, 12, 8, 2], 4, c.mint); I.line([80, 12, 92, 2], 4, c.mint); I.line([8, 44, 0, 44], 4, c.mint); I.line([92, 44, 100, 44], 4, c.mint); },
    (I) => { I.ell(50, 74, 44, 14, c.teal); I.rr(26, 40, 48, 32, 1, c.paper); I.poly([20, 42, 50, 18, 80, 42], c.coral); I.rr(44, 54, 12, 18, 1, c.ink); I.ell(70, 16, 15, 5, c.steel); I.ell(70, 13, 7, 5, c.mint); },
    (I) => { I.rr(8, 32, 84, 60, 2, c.steelD); I.poly([4, 34, 50, 10, 96, 34], c.plum); I.rr(20, 52, 22, 40, 1, c.ink); I.rr(58, 52, 22, 40, 1, c.ink); for (let i = 0; i < 3; i++) I.star(50, 40, 4, 4, 1, c.paper); I.star(30, 70, 4, 7, 1.5, c.paper); I.star(68, 66, 4, 7, 1.5, c.paper); },
    (I) => { I.poly([14, 40, 50, 22, 86, 40, 86, 80, 50, 96, 14, 80], "#120a30"); I.poly([14, 40, 50, 58, 86, 40, 50, 22], "#2a1a60"); I.poly([50, 58, 50, 96, 86, 80, 86, 40], "#080418"); I.line([40, 8, 44, 2], 5, c.gold); T2(I); },
    // Abstract
    (I) => { I.rr(14, 42, 60, 30, 8, c.steelD); I.rr(30, 28, 30, 18, 6, c.steel); I.line([60, 36, 94, 30], 6, c.steelD); I.circ(26, 78, 8, c.ink); I.circ(48, 78, 8, c.ink); I.circ(66, 78, 8, c.ink); I.ell(70, 14, 22, 11, c.paper); I.circ(52, 26, 4, c.paper); I.line([60, 14, 80, 14], 3, c.ink); },
    (I) => { I.ell(50, 86, 40, 6, c.steel); I.rr(40, 34, 20, 52, 3, c.paper); I.rr(32, 80, 36, 6, 2, c.steelD); I.circ(50, 22, 15, c.skin); I.ell(50, 34, 8, 9, c.paper); I.ell(50, 36, 5, 3, c.steel); I.line([40, 50, 52, 42], 5, c.paper); },
    (I) => { I.rr(14, 16, 72, 72, 4, c.coral); I.rr(14, 16, 12, 72, 4, "#c63a38"); I.rr(32, 28, 44, 14, 1, c.gold); I.line([38, 35, 70, 35], 3, c.ink); I.rr(30, 78, 54, 7, 0, c.paper); },
    (I) => { I.rr(22, 6, 56, 86, 2, c.paper); I.line([32, 20, 68, 20], 3, c.ink); I.line([32, 30, 68, 30], 3, c.ink); for (let i = 0; i < 6; i++) I.line([32, 46 + i * 7, 68 - (i % 2) * 8, 46 + i * 7], 1.4, c.steelD); I.line([34, 84, 42, 80, 50, 86, 60, 80], 2.4, c.coral, true); },
    (I) => { I.rr(32, 54, 36, 34, 6, c.ink); I.circ(50, 38, 18, c.steelD); I.rr(44, 20, 12, 40, 6, c.gold); for (let i = 0; i < 3; i++) I.line([76 + i * 4, 30 - i * 4, 76 + i * 4, 58 + i * 4], 3.4, c.mint, false); I.rr(38, 88, 24, 5, 1, c.steel); },
];
function T2(I) { const X = (x, y) => [x, y]; I.line([44, 42, 44, 34, 56, 34, 56, 46, 50, 48, 50, 54], 5, c.gold, true); I.circ(50, 64, 3.4, c.gold); }

// ---- People, cells 80 by 100 ------------------------------------------------------------------
function legs(I, x, y, col, frame) { I.rr(x - 13, y, 11, 24 - frame, 3, col); I.rr(x + 2, y, 11, 24, 3, col); I.rr(x - 15, y + 22 - frame, 15, 6, 3, c.ink); I.rr(x + 1, y + 22, 15, 6, 3, c.ink); }
const arm = (I, a, b, col, w = 8) => I.line([...a, ...b], w, col);
function face(I, x, y, r, skin, smile = true) { I.circ(x, y, r, skin); I.circ(x - r * 0.36, y - r * 0.1, r * 0.14, c.ink); I.circ(x + r * 0.36, y - r * 0.1, r * 0.14, c.ink); if (smile) I.line([x - r * 0.3, y + r * 0.34, x, y + r * 0.5, x + r * 0.3, y + r * 0.34], r * 0.12, c.ink, true); I.ell(x - r * 0.6, y + r * 0.26, r * 0.16, r * 0.1, "#ff5e5b55"); I.ell(x + r * 0.6, y + r * 0.26, r * 0.16, r * 0.1, "#ff5e5b55"); }
const PEOPLE = [
    (I, f) => { legs(I, 40, 70, c.plum, f); I.rr(25, 40, 30, 34, 8, c.teal); I.rr(26, 62, 28, 9, 3, c.coral); I.rr(40, 62, 11, 11, 2, "#c63a38"); arm(I, [28, 46], f ? [8, 30] : [14, 66], c.skin); arm(I, [52, 46], f ? [72, 30] : [66, 66], c.skin); face(I, 40, 26, 16, c.skin); I.rr(24, 13, 32, 7, 3, c.gold); I.poly([54, 16, 72, 22, 54, 21], "#ffd052"); I.blob([26, 14, 32, 8, 48, 8, 54, 14], c.brownD); },
    (I, f) => { legs(I, 40, 74, c.steelD, f); I.rr(24, 42, 32, 38, 9, c.violet); arm(I, [30, 48], [22, 70], c.violet); arm(I, [50, 48], f ? [70, 40] : [60, 70], c.violet); I.circ(40, 12, 8, "#d8d8e8"); I.circ(40, 26, 14, "#d8d8e8"); face(I, 40, 30, 13, c.skin); I.circ(35, 28, 3.4, "#ffffff55"); I.circ(45, 28, 3.4, "#ffffff55"); I.ell(62, 76, 7, 9, c.coral); },
    (I, f) => { legs(I, 40, 72, c.ink, f); I.rr(24, 38, 32, 38, 6, c.brown); I.poly([34, 38, 46, 38, 40, 56], c.paper); arm(I, [28, 44], [18, 68], c.brown); arm(I, [52, 44], f ? [68, 28] : [62, 68], c.brown); face(I, 40, 24, 15, "#e7b08a"); I.rr(26, 18, 12, 8, 3, "#ffffff00"); I.line([28, 22, 52, 22], 2.4, c.ink); I.circ(34, 22, 5, "#ffffff55"); I.circ(46, 22, 5, "#ffffff55"); I.blob([25, 18, 30, 8, 50, 8, 55, 18], c.steel); },
    (I, f) => { legs(I, 40, 72, c.blue, f); I.rr(25, 40, 30, 36, 9, c.coral); arm(I, [28, 46], [14, 60], c.skinD); arm(I, [52, 46], f ? [72, 34] : [66, 62], c.skinD); face(I, 40, 26, 15, c.skinD); I.blob([24, 26, 28, 6, 52, 6, 56, 26, 48, 14, 32, 14], c.gold); I.line([54, 12, 66, 26], 7, c.gold, false); },
    (I, f) => { legs(I, 40, 72, c.blue, f); I.rr(22, 40, 36, 36, 8, c.red); I.line([30, 40, 30, 76], 2, "#00000033"); I.line([50, 40, 50, 76], 2, "#00000033"); arm(I, [26, 46], [14, 68], c.red, 9); arm(I, [54, 46], f ? [72, 38] : [66, 68], c.red, 9); face(I, 40, 26, 15, c.skin); I.blob([26, 30, 32, 44, 48, 44, 54, 30, 46, 34, 34, 34], c.brownD); I.rr(23, 11, 34, 10, 4, c.teal); I.rr(48, 16, 22, 5, 2, "#0d8f7d"); },
    (I, f) => { legs(I, 40, 72, c.steelD, f); I.rr(25, 40, 30, 36, 5, c.mint); I.poly([34, 42, 40, 46, 46, 42, 46, 50, 40, 46, 34, 50], c.coral); arm(I, [28, 46], [20, 70], c.mint); arm(I, [52, 46], f ? [66, 28] : [60, 68], c.mint); face(I, 40, 26, 15, "#d99a6a"); I.circ(46, 24, 7, "#ffffff77"); I.line([51, 29, 58, 36], 3, c.ink); I.blob([26, 18, 34, 10, 46, 10, 54, 18, 40, 16], c.ink); },
    (I, f) => { legs(I, 40, 72, c.ink, f); I.rr(25, 40, 30, 36, 8, c.pink); arm(I, [28, 46], [18, 66], c.skin); arm(I, [52, 46], [68, 24], c.skin); I.rr(62, 12, 12, 20, 2, c.ink); I.rr(64, 14, 8, 15, 1, c.sky); face(I, 40, 26, 15, c.skin); I.blob([24, 28, 26, 8, 52, 6, 58, 24, 50, 14, 34, 14], "#ff4fa3"); },
    (I, f) => { I.rr(24, 28, 32, 62, 6, "#7a5b3a"); I.line([40, 30, 40, 90], 3, c.ink); I.circ(36, 48, 2, c.ink); I.circ(36, 62, 2, c.ink); I.rr(24, 62, 32, 5, 0, c.brownD); arm(I, [28, 34], [14, 58], "#7a5b3a", 9); arm(I, [52, 34], f ? [70, 22] : [66, 58], "#7a5b3a", 9); I.blob([24, 22, 30, 8, 50, 8, 56, 22, 48, 32, 32, 32], c.steel); I.blob([26, 20, 36, 14, 38, 24, 28, 26], c.ink); I.blob([54, 20, 44, 14, 42, 24, 52, 26], c.ink); I.circ(33, 20, 2.4, c.paper); I.circ(47, 20, 2.4, c.paper); I.circ(40, 27, 3, c.ink); I.poly([24, 12, 30, 2, 34, 12], c.steelD); I.poly([56, 12, 50, 2, 46, 12], c.steelD); },
    (I, f) => { I.blob([8, 50, 22, 26, 58, 24, 74, 44, 70, 62, 34, 74, 14, 68], I.grad(0, 20, 0, 74, "#5a8ae0", "#2356b0")); I.blob([14, 60, 40, 54, 68, 58, 40, 74], "#cfe3f5"); I.circ(52, 42, 3.4, c.ink); I.line([40, 62, 62, 56], 2, c.ink); I.rr(26, 70, 8, 22, 3, c.ink); I.rr(46, 68, 8, 24, 3, c.ink); I.line([44, 12, 44, 22], 3, "#cfe3f5"); I.line([40, f ? 6 : 10, 44, 12, 50, f ? 6 : 10], 3, "#cfe3f5", true); },
    (I, f) => { I.ell(40, 56, 22, 32, c.ink); I.ell(40, 62, 14, 24, c.paper); I.circ(40, 22, 14, c.ink); I.circ(35, 20, 3, c.paper); I.circ(45, 20, 3, c.paper); I.poly([35, 25, 45, 25, 40, 33], c.gold); I.line([20, 46, 10, f ? 50 : 70], 7, c.ink); I.line([60, 46, 70, f ? 34 : 70], 7, c.ink); I.ell(30, 90, 10, 4, c.gold); I.ell(50, 90, 10, 4, c.gold); I.rr(30, 37, 20, 6, 3, c.coral); },
    (I, f) => { I.circ(26, 52, 20, "#f4f8ff"); I.circ(52, 48, 24, "#ffffff"); I.circ(40, 34, 20, "#ffffff"); I.ell(40, 66, 32, 16, "#dce9f7"); I.circ(32, 44, 3.4, c.ink); I.circ(48, 44, 3.4, c.ink); I.line([34, 54, 40, 58, 46, 54], 2.4, c.ink, true); I.ell(26, 50, 4, 2, "#ff8fa366"); I.ell(54, 50, 4, 2, "#ff8fa366"); I.line([28, 84, 26, 92], 3, c.sky); I.line([44, 84, 44, 94], 3, c.sky); I.line([58, 84, 60, 92], 3, c.sky); },
    (I, f) => { legs(I, 40, 72, c.steelD, f); I.rr(24, 42, 32, 34, 7, c.orange); I.rr(30, 50, 20, 12, 2, c.steel); arm(I, [28, 48], [16, 68], c.orange, 9); arm(I, [52, 48], f ? [70, 34] : [64, 68], c.orange, 9); I.circ(40, 25, 19, "#c9eaf5cc"); face(I, 40, 26, 11, c.skin); I.ell(34, 16, 6, 3, "#ffffffcc", -0.6); I.rr(30, 40, 20, 5, 2, c.steelD); },
    (I, f) => { I.rr(26, 44, 28, 34, 10, "#7dd86a"); I.rr(29, 74, 8, 18, 3, "#4ca84a"); I.rr(43, 74, 8, 18, 3, "#4ca84a"); arm(I, [28, 50], [14, 68], "#7dd86a", 6); arm(I, [52, 50], f ? [68, 34] : [66, 68], "#7dd86a", 6); I.ell(40, 26, 22, 18, "#7dd86a"); I.ell(30, 26, 8, 10, c.ink, 0.3); I.ell(50, 26, 8, 10, c.ink, -0.3); I.circ(28, 22, 2, c.paper); I.circ(48, 22, 2, c.paper); I.line([40, 8, 40, 0], 2, "#4ca84a"); I.circ(40, 0 + 2, 3, c.coral); I.line([35, 38, 45, 38], 2, "#2a6b2a"); },
    (I, f) => { I.circ(40, 62, 20, "#b6b8cc"); I.ell(40, 44, 22, 18, "#c9cbdc"); I.circ(30, 42, 7, c.gold); I.circ(50, 42, 7, c.gold); I.circ(30, 42, 3, c.ink); I.circ(50, 42, 3, c.ink); I.poly([32, 54, 36, 60, 40, 54, 44, 60, 48, 54], c.paper); I.poly([18, 34, 8, 18, 28, 28], "#b6b8cc"); I.poly([62, 34, 72, 18, 52, 28], "#b6b8cc"); I.rr(30, 80, 8, 12, 3, "#8d8fa8"); I.rr(44, 80, 8, 12, 3, "#8d8fa8"); I.blob([56, 54, 66, f ? 40 : 60, 74, f ? 40 : 58, 70, 62], c.steelD); },
    (I, f) => { I.poly([70, 8, 18, 90, 32, 94, 76, 22], "#9be3d3aa"); I.poly([76, 14, 40, 96, 54, 96, 80, 26], "#ffffff88"); I.circ(56, 30, 22, I.grad(36, 12, 76, 50, "#ffffff", "#7fd6e8")); I.circ(49, 28, 3.4, c.ink); I.circ(63, 28, 3.4, c.ink); I.line([50, 38, 56, 42, 62, 38], 2.4, c.ink, true); I.rr(44, 18, 24, 3, 1, c.ink); },
    (I, f) => { I.poly([24, 40, 56, 40, 66, 92, 14, 92], c.plum); I.poly([34, 40, 46, 40, 44, 92, 36, 92], c.gold); arm(I, [26, 48], [12, 72], c.plum, 9); arm(I, [54, 48], f ? [70, 30] : [68, 72], c.plum, 9); I.ell(40, 26, 15, 16, "#8ad8ff"); I.circ(34, 24, 3.4, c.ink); I.circ(46, 24, 3.4, c.ink); I.circ(40, 18, 3.4, c.ink); I.poly([24, 14, 28, 0, 34, 10, 40, 0, 46, 10, 52, 0, 56, 14], c.gold); },
    (I, f) => { I.poly([40, 34, 66, 92, 14, 92], I.grad(14, 0, 66, 0, "#ffffff", "#bfc4e0")); I.circ(40, 22, 16, I.grad(26, 8, 54, 36, "#ffffff", "#bfc4e0")); I.circ(34, 20, 2.4, c.ink); I.circ(46, 20, 2.4, c.ink); I.line([34, 28, 46, 28], 2, c.ink); I.ell(40, 3, 12, 3, "#ffb627cc"); },
    (I, f) => { legs(I, 40, 80, c.blue, 0); I.rr(28, 56, 24, 26, 6, c.gold); I.rr(32, 56, 16, 12, 2, c.blue); arm(I, [31, 60], [24, 72], c.skin, 6); arm(I, [49, 60], f ? [62, 46] : [56, 72], c.skin, 6); face(I, 40, 42, 14, c.skinD); I.blob([26, 40, 30, 26, 50, 26, 54, 40, 46, 32, 34, 32], c.ink); I.circ(24, 32, 6, c.ink); I.circ(56, 32, 6, c.ink); I.circ(63, 44, 2.6, c.steel); },
    (I, f) => { legs(I, 40, 72, c.plum, f); I.rr(18, 36, 44, 40, 10, c.orange); for (let i = 0; i < 4; i++) { I.circ(26 + i * 9, 46 + (i % 2) * 12, 4, c.teal); I.circ(30 + i * 9, 64 - (i % 2) * 12, 3, c.gold); } arm(I, [22, 44], [8, f ? 26 : 62], c.orange, 10); arm(I, [58, 44], f ? [74, 26] : [72, 62], c.orange, 10); face(I, 40, 22, 16, "#f2a97a"); I.rr(26, 26, 28, 5, 2, c.brownD); I.blob([26, 12, 34, 4, 46, 4, 54, 12, 40, 10], c.brownD); I.poly([28, 30, 40, 36, 52, 30, 52, 34, 40, 40, 28, 34], c.brownD); },
];

// Town sheet indices, for world.js.
export const TOWN = { houseA: 0, houseB: 1, houseC: 2, houseD: 3, tree: 4, pine: 5, bush: 6, lamp: 7, carR: 8, carT: 9, mail: 10, fence: 11, tall1: 12, tall2: 13, tall3: 14, tall4: 15, tall5: 16, tower: 17, mount1: 18, mount2: 19, hill: 20, cloud1: 21, cloud2: 22, cloud3: 23, plane: 24, blimp: 25, sign: 26, gnome: 27 };
const towers = (I, w, h, col, win) => { const x = 50 - w / 2, y = 98 - h; I.rr(x, y, w, h, 1, I.grad(x, 0, x + w, 0, mix(col, "#ffffff", 0.18), mix(col, "#000000", 0.25))); for (let r = 0; r < Math.floor(h / 8); r++) for (let k = 0; k < Math.floor(w / 7); k++) if ((r * 7 + k * 3) % 5) I.rr(x + 3 + k * 7, y + 4 + r * 8, 4, 5, 0, win); };
const CLOUD = (I, a, b, e) => { I.ell(50, 62, 44, 20, I.grad(0, 42, 0, 82, "#ffffff", "#d7ecfb")); I.circ(a, 52, 18, "#ffffff"); I.circ(b, 46, 22, "#ffffff"); I.circ(e, 56, 13, "#ffffff"); };
const TOWNART = [
    (I) => houseBody(I, 50, 98, 1, "#f7d77e", "#c63a38"), (I) => houseBody(I, 50, 98, 1, "#a6dfd2", "#3a1f7a"), (I) => houseBody(I, 50, 98, 1, "#ff9d80", "#1d7f7a"), (I) => houseBody(I, 50, 98, 1, "#c8b6f2", "#e0701a"),
    (I) => { I.rr(46, 60, 8, 38, 2, c.brownD); I.blob([14, 54, 22, 22, 50, 8, 80, 22, 88, 56, 62, 72, 34, 72], I.grad(0, 8, 0, 72, "#7fd456", "#2f8a4a")); I.ell(36, 32, 14, 8, "#a9e77a88", -0.5); },
    (I) => { I.rr(46, 76, 8, 22, 2, c.brownD); I.poly([50, 4, 76, 44, 64, 44, 84, 80, 16, 80, 36, 44, 24, 44], I.grad(0, 0, 0, 80, "#44b98a", "#17705f")); },
    (I) => I.blob([10, 96, 18, 62, 44, 54, 64, 60, 90, 70, 92, 96], I.grad(0, 54, 0, 96, "#6cc24a", "#2f8a4a")),
    (I) => { I.rr(47, 12, 6, 86, 2, c.ink); I.line([50, 14, 70, 10], 5, c.ink); I.ell(72, 14, 10, 6, "#ffe48a"); },
    (I) => { I.blob([4, 76, 10, 62, 28, 58, 38, 40, 66, 40, 78, 58, 96, 64, 96, 80, 4, 84], I.grad(0, 40, 0, 84, "#ff7a6a", "#c63a38")); I.poly([40, 44, 62, 44, 70, 58, 34, 58], c.mint); I.circ(26, 84, 11, c.ink); I.circ(26, 84, 5, c.steel); I.circ(76, 84, 11, c.ink); I.circ(76, 84, 5, c.steel); },
    (I) => { I.blob([4, 76, 10, 62, 28, 58, 38, 40, 66, 40, 78, 58, 96, 64, 96, 80, 4, 84], I.grad(0, 40, 0, 84, "#49c7b5", "#17705f")); I.poly([40, 44, 62, 44, 70, 58, 34, 58], c.paper); I.circ(26, 84, 11, c.ink); I.circ(26, 84, 5, c.steel); I.circ(76, 84, 11, c.ink); I.circ(76, 84, 5, c.steel); },
    (I) => { I.rr(46, 50, 8, 48, 1, c.brownD); I.rr(26, 26, 48, 28, 12, c.blue); I.rr(68, 26, 6, 18, 1, c.coral); I.rr(68, 18, 12, 8, 1, c.coral); },
    (I) => { for (let i = 0; i < 5; i++) { I.poly([4 + i * 19, 96, 4 + i * 19, 56, 11 + i * 19, 48, 18 + i * 19, 56, 18 + i * 19, 96], "#fff4dc"); } I.rr(0, 64, 100, 5, 0, "#e7d7b4"); I.rr(0, 80, 100, 5, 0, "#e7d7b4"); },
    (I) => towers(I, 34, 92, "#6d7fb8", "#ffe48a"), (I) => towers(I, 44, 70, "#c97a8e", "#ffe9b8"), (I) => towers(I, 30, 96, "#3f9a9a", "#d7fff5"), (I) => { towers(I, 36, 80, "#8b6fd0", "#ffe48a"); I.poly([32, 18, 50, 2, 68, 18], "#5c44a8"); }, (I) => towers(I, 50, 56, "#e0a35a", "#fff4dc"),
    (I) => { I.line([38, 98, 42, 50], 3, c.steelD); I.line([62, 98, 58, 50], 3, c.steelD); I.ell(50, 40, 22, 14, c.sky); I.poly([30, 34, 50, 22, 70, 34], c.coral); },
    (I) => { I.poly([0, 98, 44, 14, 60, 42, 72, 28, 100, 98], I.grad(0, 14, 0, 98, "#8e86d8", "#43307e")); I.poly([44, 14, 56, 36, 48, 32, 42, 44, 34, 30], "#ffffff"); I.poly([72, 28, 82, 50, 74, 46, 66, 54, 62, 44], "#ffffff"); },
    (I) => { I.poly([0, 98, 30, 44, 50, 64, 66, 30, 100, 98], I.grad(0, 30, 0, 98, "#6f7fd0", "#2f2f7e")); I.poly([66, 30, 76, 50, 68, 46, 62, 52, 58, 46], "#ffffff"); },
    (I) => I.blob([0, 99, 20, 62, 50, 46, 80, 62, 100, 99], I.grad(0, 46, 0, 99, "#79cf63", "#2f8a4a")),
    (I) => CLOUD(I, 30, 54, 76), (I) => CLOUD(I, 40, 66, 26), (I) => { I.ell(50, 60, 46, 12, "#ffffff"); I.ell(36, 54, 22, 9, "#ffffff"); I.ell(66, 52, 18, 8, "#f3fbff"); },
    (I) => { I.blob([6, 52, 24, 44, 84, 44, 96, 50, 84, 58, 24, 58], "#ffffff"); I.poly([14, 46, 6, 28, 18, 28, 30, 46], c.coral); I.poly([46, 52, 28, 76, 42, 76, 66, 52], "#d9dcf0"); I.rr(44, 47, 26, 3, 1, c.sky); },
    (I) => { I.ell(50, 44, 44, 20, I.grad(0, 24, 0, 64, "#ff9d80", "#c63a38")); I.rr(40, 64, 20, 8, 2, c.ink); I.poly([86, 44, 100, 30, 100, 58], c.coral); I.line([20, 44, 80, 44], 2.4, c.paper); },
    (I) => { I.rr(46, 60, 8, 38, 1, c.brownD); I.rr(10, 16, 80, 48, 3, c.paper); I.rr(10, 16, 80, 12, 2, c.coral); I.line([20, 40, 76, 40], 4, c.ink); I.line([20, 50, 60, 50], 4, c.ink); },
    (I) => { I.ell(50, 92, 22, 5, "#00000033"); I.poly([50, 12, 68, 54, 32, 54], c.coral); I.ell(50, 62, 17, 13, c.skin); I.blob([34, 60, 40, 84, 60, 84, 66, 60, 50, 66], "#ffffff"); I.rr(36, 72, 28, 24, 6, c.blue); },
];

function sphere(I, cx, cy, r, tex, o = {}) {
    const D = I.d, W = I.w, out = [0, 0, 0], lx = -0.55, ly = -0.55, lz = 0.63;
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d2 = dx * dx + dy * dy, i = (y * W + x) * 4;
        if (d2 > 1.03) continue;
        const a = Math.max(0, Math.min(1, (1 - Math.sqrt(d2)) * r + 0.5)), nz = Math.sqrt(Math.max(0, 1 - d2));
        tex(dx, dy, nz, out);
        const diff = Math.max(0, dx * lx + dy * ly + nz * lz), light = (o.flat ?? 0.28) + (1 - (o.flat ?? 0.28)) * Math.min(1, diff * 1.25), tint = 1 - light;
        D[i] = out[0] * light + 22 * tint * 0.3; D[i + 1] = out[1] * light + 14 * tint * 0.3; D[i + 2] = out[2] * light + 64 * tint * 0.5; D[i + 3] = a * 255;
    }
}
const tint = (out, a, t, b) => { for (let i = 0; i < 3; i++) out[i] = a[i] + (b[i] - a[i]) * t; };
const bands = (A, B, E, s) => (dx, dy, nz, out) => { const n = noise2(dx * 3 + 9, dy * 26 * s + 3, 3), t = Math.sin(dy * 18 * s + n * 5) * 0.5 + 0.5; tint(out, rgba(A), t, rgba(B)); if (E) { const e = Math.hypot((dx - 0.3) * 1, (dy - 0.25) * 2.2); if (e < 0.2) tint(out, rgba(E), 1 - e / 0.25, out.slice()); } };
const rocky = (A, B, f = 5) => (dx, dy, nz, out) => { const n = noise2(dx * f + 40, dy * f + 11, 4); tint(out, rgba(A), Math.min(1, Math.max(0, (n - 0.3) * 2.4)), rgba(B)); };
const MOON = (dx, dy, nz, out) => { let n = noise2(dx * 3 + 4, dy * 3 + 1, 4), v = 150 + n * 110; const cr = [[-0.3, -0.2, 0.22], [0.35, 0.1, 0.16], [-0.1, 0.45, 0.18], [0.25, -0.5, 0.12], [-0.6, 0.25, 0.1]]; for (const [x, y, r] of cr) { const d = Math.hypot(dx - x, dy - y) / r; if (d < 1) v -= 62 * (1 - d * d); else if (d < 1.2) v += 16; } out[0] = v; out[1] = v; out[2] = v + 16; };
function earthTex(dx, dy, nz, out, polar = true) {
    // A sphere map, so the land wraps. The top of the planet stays green: the town is up there.
    const lon = Math.atan2(dx, nz), lat = Math.asin(Math.max(-1, Math.min(1, dy)));
    const n = noise2(lon * 1.6 + 7.3, lat * 2.2 + 3.1, 5) + (lat < -0.9 ? 0.35 : 0), ice = Math.abs(lat) > 1.25 + noise2(lon * 3, 9, 3) * 0.3;
    if (ice && lat > 0) { out[0] = 245; out[1] = 250; out[2] = 255; return; }
    if (n > 0.5) { const t = Math.min(1, (n - 0.5) * 7), s = noise2(lon * 6 + 2, lat * 6, 3); if (s > 0.58) tint(out, [214, 178, 106], 0.5, [176, 140, 88]); else tint(out, [108, 194, 74], t, [47, 138, 74]); }
    else { const t = Math.min(1, (0.5 - n) * 6); tint(out, [73, 199, 221], t, [35, 86, 176]); }
}
export function paintArt(assets) {
    // Stickers.
    const ITEM = 220, names = Object.keys(ITEMS);
    const extra = ["moon", "mars", "jupiter", "saturn", "sun", "galaxy"];
    assets.paint("items", ITEM * 6, ITEM * 6, (p) => {
        const I = new Ink(p.data, p.width, p.height);
        names.forEach((n, i) => {
            const x = (i % 6) * ITEM, y = Math.floor(i / 6) * ITEM;
            I.at(x + 22, y + 22, 1.76); ITEMS[n](I); I.at(0, 0, 1);
            I.grain(x, y, ITEM, ITEM, 5); I.dieCut(x, y, ITEM, ITEM, 4, 7);
        });
        extra.forEach((n, j) => {
            const i = names.length + j, x = (i % 6) * ITEM, y = Math.floor(i / 6) * ITEM, cx = x + ITEM / 2, cy = y + ITEM / 2, r = 84;
            if (n === "moon") sphere(I, cx, cy, r, MOON);
            if (n === "mars") sphere(I, cx, cy, r, rocky("#ff7a4a", "#a8341e", 6));
            if (n === "jupiter") sphere(I, cx, cy, r, bands("#f2d7a8", "#c9783f", "#d8452e", 1));
            if (n === "saturn") { I.at(0, 0, 1); I.ell(cx, cy, 98, 24, "#d9b878", -0.25); sphere(I, cx, cy, 58, bands("#f7e3b0", "#d8a860", null, 0.6)); I.fillPx([ringFront(cx, cy, 98, 24, -0.25, 76, 15)], "#e6c98a"); }
            if (n === "sun") { I.at(0, 0, 1).star(cx, cy, 14, 100, 84, c.orange); sphere(I, cx, cy, 76, (dx, dy, nz, out) => { const t = noise2(dx * 4 + 3, dy * 4, 4); tint(out, [255, 214, 90], t, [255, 110, 40]); }, { flat: 1 }); }
            if (n === "galaxy") { I.at(cx - 88, cy - 88, 1.76); I.ell(50, 50, 46, 24, I.grad(0, 0, 100, 100, "#6c4ed9", "#3a1f7a"), -0.4); I.ell(50, 50, 30, 15, "#ff8fa3", -0.4); I.ell(50, 50, 16, 9, "#ffd76e", -0.4); I.circ(50, 50, 5, "#ffffff"); for (let k = 0; k < 9; k++) I.star(14 + k * 9, 66 - k * 4 + (k % 3) * 6, 4, 3.4, 0.8, "#ffffff"); }
            I.at(0, 0, 1); I.dieCut(x, y, ITEM, ITEM, 4, 7);
        });
    }, { smooth: true });
    assets.grid("items", 6, 6);
    assets.paint("crew", 96 * 6, 96 * 5, (p) => {
        const I = new Ink(p.data, p.width, p.height);
        CREW.forEach((fn, i) => { const x = (i % 6) * 96, y = Math.floor(i / 6) * 96; I.at(x + 14, y + 14, 0.68); fn(I); I.at(0, 0, 1); I.dieCut(x, y, 96, 96, 2.4, 3.5); });
    }, { smooth: true });
    assets.grid("crew", 6, 5);
    assets.paint("people", 160 * 8, 200 * 5, (p) => {
        const I = new Ink(p.data, p.width, p.height);
        PEOPLE.forEach((fn, i) => {
            for (let f = 0; f < 2; f++) {
                const n = i * 2 + f, x = (n % 8) * 160, y = Math.floor(n / 8) * 200;
                I.at(x + 8, y + 8, 1.8); fn(I, f); I.at(0, 0, 1); I.dieCut(x, y, 160, 200, 3, 4);
            }
        });
    }, { smooth: true });
    assets.grid("people", 8, 5);
    assets.paint("town", 192 * 6, 192 * 5, (p) => {
        const I = new Ink(p.data, p.width, p.height);
        TOWNART.forEach((fn, i) => { const x = (i % 6) * 192, y = Math.floor(i / 6) * 192; I.at(x + 1, y + 1, 1.9); fn(I); I.at(0, 0, 1); I.grain(x, y, 192, 192, 4); });
    }, { smooth: true });
    assets.grid("town", 6, 5);
    // Your house, up close.
    assets.paint("home", 640, 520, (p) => {
        const I = new Ink(p.data, p.width, p.height).at(0, 0, 6.4);
        I.rr(6, 30, 88, 51, 1, I.grad(0, 30, 0, 81, "#f9dc8c", "#e0a956")); I.poly([0, 32, 30, 4, 74, 4, 100, 32], "#c63a38"); I.poly([0, 32, 30, 4, 74, 4, 78, 8, 14, 32], "#dc5a50");
        for (let i = 0; i < 5; i++) I.line([2 + i, 26 + i * -4.4 + 2, 100 - i * 4, 26 - i * 4.4 + 2], 0.3, "#a02c2a");
        I.rr(52, 42, 38, 39, 1, c.paper); for (let i = 0; i < 5; i++) { I.rr(53, 43 + i * 7.6, 36, 6.6, 0.4, i % 2 ? "#f0e2c6" : "#f7ecd6"); } I.rr(58, 46, 7, 4, 0.5, c.sky); I.rr(68, 46, 7, 4, 0.5, c.sky); I.rr(78, 46, 7, 4, 0.5, c.sky);
        I.rr(12, 40, 14, 17, 1, c.paper); I.rr(13.5, 41.5, 11, 14, 0.5, I.grad(0, 41, 0, 56, "#bff0f0", "#5fb4e0")); I.line([19, 41, 19, 56], 0.8, c.paper); I.rr(10, 57, 18, 3, 0.6, c.teal);
        I.rr(32, 44, 12, 37, 1, c.teal); I.circ(41, 62, 1, c.gold); I.rr(34.5, 47, 7, 9, 0.5, c.mint); I.rr(66, 8, 8, 20, 0, c.brownD); I.grain(0, 0, 640, 520, 5);
    }, { smooth: true });
    assets.paint("table", 420, 200, (p) => {
        const I = new Ink(p.data, p.width, p.height).at(0, 0, 4.2);
        I.line([18, 18, 12, 46], 3, c.steelD); I.line([82, 18, 88, 46], 3, c.steelD); I.line([22, 18, 30, 46], 2.4, c.steel); I.line([78, 18, 70, 46], 2.4, c.steel);
        I.rr(3, 8, 94, 8, 2.2, I.grad(0, 8, 0, 16, "#ff6f6c", "#d43f42"));
        I.poly([3, 11, 97, 11, 95, 26, 86, 30, 76, 26, 66, 31, 56, 26, 46, 31, 36, 26, 26, 31, 15, 26, 5, 30], I.grad(0, 11, 0, 31, "#ff7470", "#ca3540"));
        for (let i = 0; i < 9; i++) I.line([9 + i * 10, 13, 9 + i * 10, 24], 1.4, "#ffc5b0");
        I.at(0, 0, 1); I.dieCut(0, 0, 420, 200, 3, 0); I.grain(0, 0, 420, 200, 4);
    }, { smooth: true });
    assets.paint("slab", 560, 230, (p) => {
        const I = new Ink(p.data, p.width, p.height).at(0, 0, 5.6);
        I.poly([4, 16, 14, 8, 90, 7, 97, 16, 88, 22, 78, 34, 64, 30, 56, 41, 44, 34, 34, 37, 22, 28, 12, 26], I.grad(0, 8, 0, 41, "#7a5b4a", "#2c1d4e"));
        I.poly([12, 28, 22, 28, 28, 33, 24, 36], "#5a4070"); I.poly([60, 33, 72, 33, 68, 38], "#5a4070");
        I.poly([3, 15, 14, 7, 90, 6, 98, 15, 96, 18, 86, 19, 8, 20], I.grad(0, 6, 0, 20, "#c3c6d8", "#8f93b0"));
        I.line([30, 9, 38, 14, 34, 19], 0.7, "#5c5f84"); I.line([72, 8, 66, 13, 70, 18], 0.7, "#5c5f84"); I.ell(50, 12, 30, 2.4, "#ffffff22");
        for (const [x, y] of [[12, 13], [88, 13], [46, 18], [62, 7]]) { I.poly([x - 3, y, x - 1, y - 4, x, y, x + 1, y - 5, x + 3, y], c.grass); }
        I.at(0, 0, 1); I.dieCut(0, 0, 560, 230, 3, 0); I.grain(0, 0, 560, 230, 6);
    }, { smooth: true });
    assets.paint("globe", 240, 280, (p) => {
        const I = new Ink(p.data, p.width, p.height).at(0, 0, 2.4);
        I.poly([26, 96, 74, 96, 80, 112, 20, 112], I.grad(20, 0, 80, 0, "#ffb627", "#c9631a")); I.rr(18, 108, 64, 6, 2, "#8c4a18"); I.at(0, 0, 1);
        const cx = 120, cy = 120, r = 104; I.circ(cx, cy, r, "#cfeef7"); I.at(0, 0, 1); globeBall(I, cx, cy, r, 0); I.ell(cx - 44, cy - 54, 30, 18, "#ffffff55", -0.7); I.line([cx + 66, cy - 58, cx + 86, cy - 14], 7, "#ffffff55", false);
        I.dieCut(0, 0, 240, 280, 4, 0);
    }, { smooth: true });
    // Space.
    assets.paint("earth", 720, 720, (p) => {
        const I = new Ink(p.data, p.width, p.height);
        sphere(I, 360, 360, 340, (dx, dy, nz, out) => { earthTex(dx, dy, nz, out); const cl = noise2(dx * 3 + nz * 2 + 20, dy * 5 + 2, 4); if (cl > 0.57) tint(out, out.slice(), Math.min(0.92, (cl - 0.57) * 7), [255, 255, 255]); if (nz < 0.45) tint(out, out.slice(), (0.45 - nz) / 0.9, [120, 200, 255]); }, { flat: 0.36 });
    }, { smooth: true });
    assets.paint("planets", 256 * 4, 256 * 2, (p) => {
        const I = new Ink(p.data, p.width, p.height), put = (i, t, o) => sphere(I, (i % 4) * 256 + 128, Math.floor(i / 4) * 256 + 128, 120, t, o);
        put(0, MOON); put(1, rocky("#c9c2bd", "#7e6f75", 9)); put(2, rocky("#ffe0a8", "#e09a48", 3)); put(3, rocky("#ff7a4a", "#a8341e", 6)); put(4, bands("#f2d7a8", "#c9783f", "#d8452e", 1)); put(5, bands("#f7e3b0", "#d8a860", null, 0.6)); put(6, bands("#bff0f0", "#8fdcdc", null, 0.3)); put(7, bands("#6e9bff", "#3556d8", null, 0.45));
    }, { smooth: true });
    assets.grid("planets", 4, 2);
    assets.paint("ring", 512, 160, (p) => { const I = new Ink(p.data, p.width, p.height); I.fillPx([ringFull(256, 80, 250, 70, 0, 150, 42)], "#e0c48a"); }, { smooth: true });
    assets.paint("glow", 128, 128, (p) => { const D = p.data; for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const d = Math.hypot(x - 63.5, y - 63.5) / 63, a = Math.max(0, 1 - d); const i = (y * 128 + x) * 4; D[i] = D[i + 1] = D[i + 2] = 255; D[i + 3] = a * a * 255; } }, { smooth: true });
    assets.paint("galaxy", 640, 640, (p) => {
        const D = p.data, R = 320;
        for (let y = 0; y < 640; y++) for (let x = 0; x < 640; x++) {
            const dx = (x - R) / R, dy = (y - R) / (R * 0.62), r = Math.hypot(dx, dy), i = (y * 640 + x) * 4;
            if (r >= 1) continue;
            const th = Math.atan2(dy, dx), arm = Math.pow(0.5 + 0.5 * Math.cos(2 * th - 7.4 * Math.log(r + 0.05)), 3), n = noise2(x * 0.02, y * 0.02, 4), edge = Math.pow(1 - r, 1.3);
            const core = Math.exp(-r * r * 26), v = Math.min(1, (arm * (0.3 + n * 1.4) * 0.8 + 0.1) * edge * 1.6 + core * 1.3), hot = Math.min(1, core * 1.8 + arm * 0.25 * n);
            D[i] = 130 + 125 * hot; D[i + 1] = 90 + 150 * hot * hot + (1 - r) * 20; D[i + 2] = 230 - 110 * hot; D[i + 3] = v * 255;
        }
    }, { smooth: true });
    assets.paint("web", 720, 720, (p) => {
        const D = p.data;
        for (let y = 0; y < 720; y++) for (let x = 0; x < 720; x++) {
            const u = x / 720, v = y / 720, r = Math.hypot(u - 0.5, v - 0.5) * 2, i = (y * 720 + x) * 4;
            if (r >= 1) continue;
            const a = Math.abs(noise2(u * 5 + 1, v * 5 + 2, 4) - 0.5), b = Math.abs(noise2(u * 5 + 8, v * 5 + 5, 4) - 0.5), w = Math.max(0, 1 - Math.hypot(a, b) * 12), s = Math.pow(w, 2.2) * (1 - r * r);
            D[i] = 120 + 135 * s; D[i + 1] = 130 + 90 * s; D[i + 2] = 255; D[i + 3] = Math.min(1, s * 1.5) * 255;
        }
    }, { smooth: true });
    assets.paint("ball", 640, 640, (p) => {
        const D = p.data, R = 318;
        for (let y = 0; y < 640; y++) for (let x = 0; x < 640; x++) {
            const dx = (x - 320) / R, dy = (y - 320) / R, r2 = dx * dx + dy * dy, i = (y * 640 + x) * 4;
            if (r2 >= 1.01) continue;
            const r = Math.sqrt(r2), u = dx * 0.5 + 0.5, v = dy * 0.5 + 0.5, a = Math.abs(noise2(u * 5 + 1, v * 5 + 2, 4) - 0.5), b = Math.abs(noise2(u * 5 + 8, v * 5 + 5, 4) - 0.5), web = Math.pow(Math.max(0, 1 - Math.hypot(a, b) * 12), 2.2);
            const rim = Math.pow(r, 7), hi = Math.max(0, 1 - Math.hypot((dx + 0.42) / 0.3, (dy + 0.5) / 0.18)), lo = Math.max(0, 1 - Math.hypot((dx - 0.55) / 0.14, (dy - 0.6) / 0.07));
            D[i] = Math.min(255, 26 + web * 190 + rim * 150 + hi * 170 + lo * 90); D[i + 1] = Math.min(255, 16 + web * 130 + rim * 170 + hi * 180 + lo * 90); D[i + 2] = Math.min(255, 70 + web * 200 + rim * 200 + hi * 190 + lo * 90); D[i + 3] = Math.min(1, (1 - r) * R + 0.5) * 255;
        }
    }, { smooth: true });
    assets.paint("fx", 64 * 8, 64, (p) => {
        const I = new Ink(p.data, p.width, p.height), cell = (i) => I.at(i * 64 + 2, 2, 0.6);
        cell(0); I.star(50, 50, 4, 48, 8, "#ffffff"); cell(1); I.circ(50, 50, 44, "#ffffff"); cell(2); I.star(50, 50, 8, 48, 26, "#ffffff"); cell(3);
        I.circ(50, 50, 44, c.gold); I.circ(50, 50, 34, "#ffd76e"); I.line([58, 34, 40, 34, 40, 50, 60, 50, 60, 66, 42, 66], 7, "#c9831a"); cell(4); I.rr(2, 24, 96, 52, 4, "#7fcf6e"); I.rr(10, 32, 80, 36, 3, "#a4e59a"); I.circ(50, 50, 14, "#7fcf6e"); cell(5); I.rr(10, 30, 80, 40, 2, "#ffffff"); cell(6); I.line([12, 50, 50, 22, 88, 50], 12, "#ffffff"); cell(7); I.ell(50, 50, 46, 14, "#ffffff", -0.4);
    }, { smooth: true });
    assets.grid("fx", 8, 1);
    assets.paint("burst", 256, 256, (p) => { const I = new Ink(p.data, p.width, p.height).at(0, 0, 2.56); I.star(50, 50, 18, 49, 38, "#ffffff"); }, { smooth: true });
    assets.paint("hole", 512, 512, (p) => {
        const D = p.data, R = 256;
        for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
            const dx = (x - R) / R, dy = (y - R) / R, r = Math.hypot(dx, dy), i = (y * 512 + x) * 4;
            if (r >= 1) continue;
            const th = Math.atan2(dy, dx), n = 0.5 + 0.5 * Math.sin(th * 3 + r * 22 + noise2(x * 0.02, y * 0.02, 3) * 6), hot = Math.pow(1 - r, 1.2);
            D[i] = 255; D[i + 1] = 110 + 130 * hot; D[i + 2] = 60 + 60 * hot; D[i + 3] = Math.min(1, n * hot * 2.2) * 255;
        }
    }, { smooth: true });
}
const ringFront = (cx, cy, rx, ry, rot, ix, iy) => { const a = [], co = Math.cos(rot), si = Math.sin(rot), pt = (t, A, B) => { const x = Math.cos(t) * A, y = Math.sin(t) * B; return [cx + x * co - y * si, cy + x * si + y * co]; }; for (let i = 0; i <= 40; i++) a.push(...pt((i / 40) * Math.PI, rx, ry)); for (let i = 40; i >= 0; i--) a.push(...pt((i / 40) * Math.PI, ix, iy)); return a; };
const ringFull = (cx, cy, rx, ry, rot, ix, iy) => { const a = [], n = 64; for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2; a.push(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry); } for (let i = n; i >= 0; i--) { const t = (i / n) * Math.PI * 2; a.push(cx + Math.cos(t) * ix, cy + Math.sin(t) * iy); } return a; };

export const ITEM_FRAMES = Object.fromEntries([...Object.keys(ITEMS), "moon", "mars", "jupiter", "saturn", "sun", "galaxy"].map((n, i) => [n, i]));
/** Flat index of a crew icon. */
export const crewFrame = (a, i) => a * 5 + i + (a * 1);
