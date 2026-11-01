// Eight stretches of village, and the day passing over them.
import { color } from "./pogo.js";
import { addBarrel, addBush, addHay, addHut, addLamp, addPine, addRock, addStump, addWallStone, addWell } from "./models.js";

const c = (h) => color(h);
const tree = (g, x, z, k) => addPine(g, x + (k % 3 - 1) * 0.05, 0, z + (k % 2) * 0.06, 1.15 + (k % 4) * 0.13);
const bush = (g, x, z, k) => addBush(g, x, 0, z, 1 + (k % 3) * 0.15);
const rock = (g, x, z, k) => addRock(g, x, 0, z, 1 + (k % 3) * 0.1);
const stump = (g, x, z, k) => addStump(g, x, 0, z, 1.05 + (k % 2) * 0.2);
const wall = (g, x, z, k) => addWallStone(g, x, 0, z, k);
const hut = (g, x, z, k) => addHut(g, x, 0, z, { roof: k % 2 ? "#7a4a4e" : "#4e6a88", wall: k % 3 ? "#ead9bf" : "#d9c6c0" });
hut.glows = true;
const hay = (g, x, z) => addHay(g, x, 0, z);
const barrel = (g, x, z) => addBarrel(g, x, 0, z);
const lamp = (g, x, z) => addLamp(g, x, 0, z, 1.1);
lamp.glows = true;
const well = (g, x, z) => addWell(g, x, 0, z);

export const THEMES = [
    { name: "Dawn Lane",      sky: ["#fcdcc6", "#c4b8ea"], sea: "#ffffff", sun: "#ffdcc0", sunPow: 0.86, amb: "#8291c8", gnd: "#7485bc", dir: [0.72, -0.62, -0.42], cob: [[120, 110, 118], [146, 132, 134]], walls: [bush, tree, stump, rock], flakes: 0.5 },
    { name: "Allotments",     sky: ["#fbe6c8", "#bcdcf0"], sea: "#dfe7f2", sun: "#fff0d2", sunPow: 0.72, amb: "#b1c4ea", gnd: "#9bb0d4", dir: [0.6, -0.72, -0.5], cob: [[126, 104, 92], [156, 128, 104]], walls: [wall, hay, stump, bush], flakes: 0.3 },
    { name: "Mirror Pond",    sky: ["#d9f0fb", "#9fd0ef"], sea: "#cfe7f6", sun: "#fff7e4", sunPow: 0.74, amb: "#b4cff0", gnd: "#a4bfe0", dir: [0.46, -0.84, -0.46], cob: [[120, 128, 146], [150, 160, 176]], walls: [rock, bush, tree, rock], flakes: 0.2 },
    { name: "Baker's Row",    sky: ["#fde4b8", "#c3cfe6"], sea: "#ecdcd2", sun: "#ffe4b4", sunPow: 0.76, amb: "#b0b8de", gnd: "#a39cc0", dir: [-0.6, -0.72, -0.44], cob: [[138, 106, 102], [168, 134, 122]], walls: [barrel, hut, wall, lamp], flakes: 0.3 },
    { name: "Firwood",        sky: ["#fbcfa8", "#a7b6dc"], sea: "#d4cce2", sun: "#ffc998", sunPow: 0.8, amb: "#9fb0e0", gnd: "#8796c4", dir: [-0.74, -0.56, -0.42], cob: [[106, 100, 102], [134, 122, 118]], walls: [tree, tree, stump, tree], flakes: 0.6 },
    { name: "Millstream",     sky: ["#f5ae9c", "#8294cc"], sea: "#b9b0d8", sun: "#ffae80", sunPow: 0.84, amb: "#8ea0da", gnd: "#7486c0", dir: [-0.8, -0.46, -0.4], cob: [[112, 104, 116], [140, 126, 134]], walls: [rock, stump, barrel, tree], flakes: 0.4 },
    { name: "Bell Gate",      sky: ["#6f76b8", "#343a78"], sea: "#6068a8", sun: "#ffc9a8", sunPow: 0.5, amb: "#7a84c4", gnd: "#5a64a0", glow: 0.3, dir: [-0.5, -0.74, -0.46], cob: [[92, 92, 122], [118, 116, 142]], walls: [wall, lamp, wall, hut], flakes: 0.7 },
    { name: "Lantern Green",  sky: ["#272a66", "#101438"], sea: "#2b3070", sun: "#cfdcff", sunPow: 0.5, amb: "#6c76bc", gnd: "#4a5494", glow: 0.34, dir: [0.42, -0.82, -0.4], cob: [[86, 88, 124], [112, 112, 146]], walls: [lamp, hut, tree, well], flakes: 1 },
];

/** Keeps sunlit snow just under white in any weather, so its soft shading survives. */
export function lightOf(t) {
    const sun = c(t.sun), amb = c(t.amb), gnd = c(t.gnd), d = Math.hypot(...t.dir), top = -t.dir[1] / d * t.sunPow;
    const peak = Math.max(amb.r + sun.r * top, amb.g + sun.g * top, amb.b + sun.b * top), k = peak > 1.01 ? 1.01 / peak : 1;
    return { sun: [sun.r * t.sunPow * k, sun.g * t.sunPow * k, sun.b * t.sunPow * k], amb: [amb.r * k, amb.g * k, amb.b * k], gnd: [gnd.r * k, gnd.g * k, gnd.b * k] };
}

for (const t of THEMES) t.verge = t.walls;
THEMES[0].verge = [tree, tree, hut, bush, tree];
THEMES[1].verge = [hut, tree, hay, wall, bush];
THEMES[2].verge = [tree, rock, tree, bush];
THEMES[3].verge = [hut, hut, lamp, barrel, tree];
THEMES[5].verge = [tree, hut, rock, tree];
THEMES[6].verge = [hut, lamp, tree, wall];
THEMES[7].verge = [hut, lamp, tree, lamp];

export function applyTheme(s, t) {
    s.background = t.sky;
    const l = lightOf(t);
    s.light.color = color(l.sun);
    s.light.sky = color(l.amb);
    s.light.ground = color(l.gnd);
    s.light.dir.set(t.dir[0], t.dir[1], t.dir[2]);
    s.light.shadows = true;
    s.light.softShadows = true;
}
