// Palette and materials per island: all the colour decisions in one place.
import { hex, mix, mul } from "./meshkit.js";
import { GRASS, GREEN, ROUGH, SAND, ICE, ROCK, WOOD, LAVA, WATER, SNOW } from "./course.js";

const c = (h) => hex(h);
export const LOOK = [
    { // Coconut Cove: high noon, candy-bright
        sky: ["#2f8fe8", "#c8f0ee"], fog: "#c8f0ee", fogNear: 70, fogFar: 180, sun: [-0.55, -1, -0.42], sunCol: "#b8ad9c", skyL: "#a9bdd0", groundL: "#6a6f8a",
        sea: c("#27c4c8"), seaDeep: c("#1283c0"), foam: c("#f6fff4"), sunset: false,
        grass: c("#5bc25e"), grass2: c("#3fa854"), green: c("#94e36c"), green2: c("#80d460"), rough: c("#2c8c50"), sand: c("#ffdf9e"), ice: c("#b8efff"), snow: c("#f5fbff"), rock: c("#8d7468"), rock2: c("#6c5a5e"), wood: c("#c98a4e"),
        cliff: c("#a8826a"), cliff2: c("#7c5f5c"), beach: c("#ffe4a8"), hill: c("#3fb06a"),
        rail: c("#fff4dc"), rail2: c("#ff6a57"), railTop: c("#fff9ee"), post: c("#ff6a57"), wall: c("#2fb3a8"),
        ink: "#10396e", accent: "#ff6a57", gold: "#ffc53d",
    },
    { // Frostbite Fumarole: pink dusk over ice
        sky: ["#3a3f9e", "#ffb2c8"], fog: "#ffb2c8", fogNear: 60, fogFar: 160, sun: [0.5, -0.8, -0.5], sunCol: "#b89a9c", skyL: "#a4a8d0", groundL: "#6a5f9c",
        sea: c("#4a6fd1"), seaDeep: c("#2c3f9a"), foam: c("#e8f2ff"), sunset: true,
        grass: c("#7fc8b0"), grass2: c("#6fb9a8"), green: c("#73e0a8"), green2: c("#62d29a"), rough: c("#5da093"), sand: c("#f0d8c8"), ice: c("#a6ecff"), snow: c("#fbfcff"), rock: c("#6d6a9c"), rock2: c("#4f4d80"), wood: c("#a07f9a"),
        cliff: c("#7f7fc0"), cliff2: c("#55559c"), beach: c("#e9ecff"), hill: c("#dfe8ff"),
        rail: c("#e9f6ff"), rail2: c("#ff7fb0"), railTop: c("#ffffff"), post: c("#4a6fd1"), wall: c("#7a5ce0"),
        ink: "#2a2a7a", accent: "#ff5fa2", gold: "#ffd166",
    },
    { // The Molten Crown: blood-orange smoke
        sky: ["#23102e", "#ff7a3c"], fog: "#d0562e", fogNear: 45, fogFar: 140, sun: [-0.4, -0.9, 0.5], sunCol: "#b89878", skyL: "#a288b4", groundL: "#a04a2e",
        sea: [1.05, 0.62, 0.5], seaDeep: [0.62, 0.3, 0.26], foam: c("#ffe066"), sunset: true,
        grass: c("#5f6a4a"), grass2: c("#525c42"), green: c("#2fcf9b"), green2: c("#25bd8c"), rough: c("#4c5240"), sand: c("#9c8c7c"), ice: c("#a6e8ff"), snow: c("#d8d8e0"), rock: c("#6a5059"), rock2: c("#4c3843"), wood: c("#8d5c3e"),
        cliff: c("#4d3640"), cliff2: c("#2e2028"), beach: c("#3a2a30"), hill: c("#3a2a30"),
        rail: c("#3a2c38"), rail2: c("#ff8a2a"), railTop: c("#ffb347"), post: c("#ffb347"), wall: c("#2a1f2a"),
        ink: "#2a0f22", accent: "#ff7a1a", gold: "#ffcf4a",
    },
];

/** Colour of the ground at a point, before the tiling detail texture multiplies over it. */
export function groundColor(L, mat, x, z, ny, edge, heat, hash) {
    let col;
    const n = hash;
    switch (mat) {
        case GREEN: { const b = ((Math.floor((x + 1000) / 1) + Math.floor((z + 1000) / 1)) & 1) ? L.green : L.green2; col = mix(b, L.green, 0.3); break; }
        case ROUGH: col = mix(L.rough, mul(L.rough, 0.86), n); break;
        case SAND: col = mul(L.sand, 0.93 + 0.1 * Math.sin(x * 3.1 + Math.sin(z * 2.3) * 2)); break;
        case SNOW: col = mix(L.snow, [0.8, 0.86, 1], (1 - ny) * 2.4 + n * 0.05); break;
        case ICE: {
            const v = Math.abs(Math.sin(x * 1.3 + Math.sin(z * 0.9) * 2) + Math.sin(z * 1.7 + Math.sin(x * 0.7) * 2));
            col = mix(L.ice, [1, 1, 1], v < 0.1 ? 0.75 : 0.05 + n * 0.08);
            break;
        }
        case ROCK: {
            const v = Math.abs(Math.sin(x * 1.1 + Math.sin(z * 1.4) * 1.8) * Math.sin(z * 1.2 + Math.sin(x * 1.3) * 1.8));
            col = mix(L.rock2, L.rock, Math.min(1, v * 2.1 + n * 0.2));
            break;
        }
        case WOOD: col = L.wood; break;
        default: { const stripe = Math.floor((x * 0.82 + z * 0.57 + 2000) / 1.6) & 1; col = mix(stripe ? L.grass : L.grass2, L.grass, n * 0.25); }
    }
    if (ny < 0.72 && mat !== ICE && mat !== SNOW) col = mix(col, L.cliff, (0.72 - ny) * 3);
    if (edge < 0.55) col = mul(col, 0.78 + 0.22 * edge / 0.55);        // soft contact against the rail
    if (heat > 0) col = mix(col, [2.3, 0.9, 0.12], Math.min(0.92, heat * heat));
    return col;
}
