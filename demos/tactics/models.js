// Every character and prop, sculpted in code. Models face +z, stand on y = 0, and read at 45 pixels tall.
import { Mesher, mix, tint } from "./meshkit.js";

const INK = "#1d1b2b";
const eye = (b, x, y, z, r, iris = "#f28a1e", angry = false, side = 1) => {
    b.ball(x, y, z, r, r, r * 0.8, "#fff7e6", 10, 7);
    b.ball(x + side * r * 0.25, y, z + r * 0.45, r * 0.62, r * 0.62, r * 0.5, iris, 8, 6);
    b.ball(x + side * r * 0.32, y, z + r * 0.72, r * 0.34, r * 0.34, r * 0.3, "#16131f", 8, 6);
    if (angry) b.at(x, y + r * 0.82, z + r * 0.3, (m) => m.box(0, 0, 0, r * 2.3, r * 0.5, r * 0.9, INK), { rz: side * -0.42 });
};

const PLUMAGE = {
    grey: { top: "#6f7fa0", low: "#9ea9c0", wing: "#8491ad", bar: "#2c3040", neckA: "#3fd08f", neckB: "#b04fd6", head: "#7c8aa3" },
    white: { top: "#e8e6df", low: "#fbf9f2", wing: "#d9d6cd", bar: "#a7a39a", neckA: "#c7ddd6", neckB: "#d6c9e0", head: "#eeece4" },
    brown: { top: "#94694a", low: "#d7b48d", wing: "#a17553", bar: "#4a2f20", neckA: "#57a06e", neckB: "#a35ca8", head: "#8a6146" },
    dark: { top: "#535c74", low: "#8b93a8", wing: "#616b83", bar: "#1e2130", neckA: "#2fd3b2", neckB: "#7e4fe0", head: "#4a5269" },
    pale: { top: "#a39ab8", low: "#d9d0de", wing: "#b3a9c6", bar: "#6a6f85", neckA: "#6be0b7", neckB: "#e07ac8", head: "#aab1c4" },
};

function pigeonBody(b, pl, fat = 1) {
    const body = (nx, ny, nz) => mix(pl.top, pl.low, Math.min(1, Math.max(0, (nz * 0.6 - ny * 0.9 + 0.4))));
    b.ball(0, 0.36, 0, 0.3 * fat, 0.29 * fat, 0.36 * fat, body, 16, 10);
    const wing = (nx, ny, nz) => (Math.abs(nz + 0.28) < 0.13 || Math.abs(nz + 0.68) < 0.11 ? pl.bar : pl.wing);
    for (const s of [-1, 1]) b.ball(s * 0.27 * fat, 0.39, -0.05, 0.075, 0.185, 0.31, wing, 12, 8);
    b.ball(0, 0.37, -0.45 * fat, 0.14, 0.055, 0.25, (nx, ny, nz) => (nz < -0.5 ? pl.bar : pl.wing), 10, 6);
    for (const s of [-1, 1]) {
        b.tube([s * 0.1, 0.14, 0.03], [s * 0.1, 0.02, 0.06], 0.035, 0.03, "#e4697d", 6);
        b.ball(s * 0.1, 0.03, 0.12, 0.075, 0.03, 0.11, "#e4697d", 8, 5);
    }
}

function pigeonHead(b, pl) {
    b.ball(0, -0.07, -0.02, 0.2, 0.19, 0.2, (nx, ny) => mix(pl.neckA, pl.neckB, Math.max(0, Math.min(1, 0.5 + nx * 0.8 + ny * 0.3))), 12, 8);
    b.ball(0, 0.1, 0.03, 0.205, 0.195, 0.21, pl.head, 14, 10);
    b.ball(0, 0.135, 0.215, 0.05, 0.035, 0.05, "#f5f1e6", 8, 5);
    b.tube([0, 0.1, 0.18], [0, 0.065, 0.37], 0.06, 0.012, "#3a3540", 8);
    for (const s of [-1, 1]) eye(b, s * 0.115, 0.15, 0.17, 0.075, "#f28a1e", false, s);
}

const HATS = {
    sarge(b) {   // tin helmet and a chinstrap
        b.ball(0, 0.22, 0.02, 0.25, 0.14, 0.26, "#5d7042", 14, 8);
        b.tube([0, 0.2, 0.02], [0, 0.17, 0.02], 0.3, 0.32, "#4c5c37", 16);
        b.ball(0, 0.36, 0.02, 0.05, 0.03, 0.05, "#7c8f57", 8, 5);
        for (let i = 0; i < 2; i++) b.box(0.06 * (i ? 1 : -1), 0.09, 0.2, 0.03, 0.02, 0.06, "#f0c04a");
    },
    doris(b) {   // leather flying cap, goggles pushed up, scarf
        b.ball(0, 0.15, 0, 0.225, 0.2, 0.225, "#8c5a33", 14, 9);
        for (const s of [-1, 1]) { b.cyl(s * 0.09, 0.27, 0.17, 0.065, 0.02, "#d9e6ea"); b.ball(s * 0.09, 0.28, 0.18, 0.07, 0.07, 0.035, "#7fd0e6"); }
        b.box(0, 0.26, 0.17, 0.3, 0.035, 0.03, "#3f2a1c");
        for (const s of [-1, 1]) b.ball(s * 0.2, 0.05, 0.02, 0.05, 0.1, 0.06, "#7b4d2b", 8, 6);
    },
    gale(b) {   // sweatband and a topknot of feathers
        b.tube([0, 0.17, 0.03], [0, 0.22, 0.03], 0.215, 0.215, "#3cc0c9", 14);
        for (const a of [-0.5, 0, 0.5]) b.at(0, 0.28, 0.0, (m) => m.ball(0, 0.1, 0, 0.04, 0.13, 0.05, "#f3e36a", 8, 6), { rz: a });
    },
    lunch(b) {   // napkin and a chip
        b.tube([0, -0.1, 0.2], [0, -0.28, 0.3], 0.03, 0.2, "#f7f4ec", 3, false);
        b.at(0, 0.03, 0.37, (m) => m.box(0, 0, 0, 0.26, 0.05, 0.06, "#f4c542", { top: "#ffd964" }), { ry: 0.4, rz: 0.2 });
        b.ball(0, 0.32, -0.02, 0.1, 0.05, 0.1, "#c0392b");
        b.tube([0, 0.2, 0.03], [0, 0.27, 0.0], 0.2, 0.12, "#d9503f", 12);
    },
    vinnie(b) {   // fedora, gold chain
        b.tube([0, 0.2, 0.02], [0, 0.22, 0.02], 0.34, 0.34, "#3b2a57", 18);
        b.tube([0, 0.22, 0.02], [0, 0.4, 0.02], 0.2, 0.17, "#4b3670", 14);
        b.tube([0, 0.235, 0.02], [0, 0.275, 0.02], 0.2, 0.2, "#f0c04a", 14, false);
        for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI; b.ball(Math.cos(a) * 0.2, -0.14 - Math.sin(a) * 0.1, 0.08 + Math.sin(a) * 0.15, 0.03, 0.03, 0.03, "#f6d14b", 6, 4); }
    },
    plume(b) {   // tiny hat with enormous feather, monocle
        b.at(0.05, 0.27, 0, (m) => { m.tube([0, 0, 0], [0, 0.07, 0], 0.15, 0.12, "#a93a78", 12); m.tube([0, -0.012, 0], [0, 0.012, 0], 0.22, 0.22, "#c9558f", 14); }, { rz: -0.2 });
        b.at(-0.04, 0.33, -0.05, (m) => m.ball(0, 0.2, -0.08, 0.05, 0.24, 0.1, (nx, ny) => mix("#f4a5cc", "#fff1a8", ny * 0.5 + 0.5), 10, 8), { rz: 0.5, rx: -0.4 });
        b.tube([0.115, 0.15, 0.245], [0.115, 0.15, 0.255], 0.09, 0.09, "#f0c04a", 12);
        b.tube([0.2, 0.15, 0.25], [0.26, -0.15, 0.25], 0.008, 0.008, "#f0c04a", 4);
    },
    quack(b) {   // head mirror
        b.tube([0, 0.2, 0.03], [0, 0.24, 0.03], 0.215, 0.215, "#e8e2d6", 14);
        b.at(0, 0.3, 0.2, (m) => { m.tube([0, 0, 0], [0, 0, 0.02], 0.1, 0.1, "#e6edf2", 14); m.ball(0, 0, 0.022, 0.09, 0.09, 0.012, "#fff"); }, { rx: -0.3 });
        b.box(0, -0.2, 0.2, 0.09, 0.09, 0.02, "#e04a4a");
        b.tube([-0.2, -0.1, 0.05], [0, -0.27, 0.2], 0.012, 0.012, "#2f3644", 5);
        b.tube([0.2, -0.1, 0.05], [0, -0.27, 0.2], 0.012, 0.012, "#2f3644", 5);
    },
    kevin(b) {   // propeller beanie, slightly too small
        b.ball(0, 0.25, 0.02, 0.15, 0.08, 0.15, (nx, ny, nz) => (Math.sin(Math.atan2(nz, nx) * 3) > 0 ? "#f08a3c" : "#3f8fd9"), 16, 6);
        b.cyl(0, 0.32, 0.02, 0.012, 0.06, INK, 6);
        b.at(0, 0.385, 0.02, (m) => { m.ball(0.1, 0, 0, 0.1, 0.012, 0.03, "#e04a4a", 8, 4); m.ball(-0.1, 0, 0, 0.1, 0.012, 0.03, "#f5d13b", 8, 4); }, { ry: 0.6 });
    },
    reg(b) {   // flat cap and specs
        b.ball(0, 0.22, 0.02, 0.23, 0.08, 0.24, "#6b5d4d", 14, 6);
        b.ball(0, 0.2, 0.2, 0.15, 0.025, 0.1, "#5a4d3f", 12, 5);
        for (const s of [-1, 1]) b.tube([s * 0.115, 0.15, 0.24], [s * 0.115, 0.15, 0.25], 0.075, 0.075, "#e6edf2", 12);
    },
};

/** Each pigeon: a body mesh and a head mesh, so the head can bob the way a pigeon's does. */
const SQUAD = {
    sarge: { pl: "grey", fat: 1.02 }, doris: { pl: "pale" }, gale: { pl: "white", fat: 0.94 }, lunch: { pl: "brown", fat: 1.32 },
    vinnie: { pl: "dark", fat: 0.94 }, plume: { pl: "pale", fat: 0.96 }, quack: { pl: "white" }, kevin: { pl: "grey", fat: 0.84 }, reg: { pl: "brown", fat: 0.92 },
};

function crowBody(b, kind) {
    const dark = "#2b2c3f", sheen = "#4c5478";
    const col = (nx, ny, nz) => mix(dark, sheen, Math.max(0, ny * 0.8 + nx * 0.2));
    b.ball(0, 0.38, 0, 0.27, 0.31, 0.33, col, 14, 10);
    for (const s of [-1, 1]) b.ball(s * 0.25, 0.42, -0.06, 0.07, 0.2, 0.32, col, 10, 7);
    b.at(0, 0.36, -0.42, (m) => m.box(0, -0.03, 0, 0.26, 0.06, 0.42, dark, { top: sheen }));
    for (const s of [-1, 1]) { b.tube([s * 0.1, 0.14, 0], [s * 0.1, 0.02, 0.05], 0.03, 0.025, "#3c3a4a", 6); b.ball(s * 0.1, 0.03, 0.1, 0.07, 0.025, 0.11, "#3c3a4a", 8, 5); }
    if (kind === "bruiser") { for (const a of [-0.9, -0.3, 0.3, 0.9]) b.tube([Math.sin(a) * 0.2, 0.6, Math.cos(a) * 0.14], [Math.sin(a) * 0.32, 0.66, Math.cos(a) * 0.24], 0.04, 0, "#d7dbe6", 6); b.tube([0, 0.56, 0], [0, 0.62, 0], 0.22, 0.22, "#8a2b2b", 12); }
    else if (kind === "contessa") { b.tube([0, 0.05, 0], [0, 0.6, -0.05], 0.36, 0.17, "#5b1e6e", 14); b.ball(0, 0.58, 0.02, 0.22, 0.08, 0.2, "#f3ecdf", 10, 6); }
    else b.ball(0, 0.56, 0.1, 0.2, 0.06, 0.18, "#c0392b", 10, 5);   // red neckerchief
}
function crowHead(b, kind) {
    b.ball(0, 0.1, 0.03, 0.2, 0.19, 0.21, (nx, ny) => mix("#2b2c3f", "#555f85", Math.max(0, ny)), 12, 8);
    b.tube([0, 0.1, 0.17], [0, 0.03, 0.44], 0.085, 0.01, "#2a2733", 8);
    b.tube([0, 0.13, 0.17], [0, 0.06, 0.42], 0.05, 0.01, "#4a4757", 6);
    for (const s of [-1, 1]) eye(b, s * 0.11, 0.15, 0.17, 0.07, "#e8d24a", true, s);
    if (kind === "slinger") { b.tube([0, 0.2, 0.03], [0, 0.25, 0.03], 0.21, 0.21, "#c0392b", 12); b.ball(-0.22, 0.2, -0.05, 0.07, 0.03, 0.04, "#c0392b"); }
    if (kind === "contessa") { for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.32; b.tube([Math.sin(a) * 0.14, 0.27, Math.cos(a) * 0.14 + 0.02], [Math.sin(a) * 0.15, 0.4 + (i === 2 ? 0.05 : 0), Math.cos(a) * 0.15 + 0.02], 0.035, 0.008, "#f6d14b", 5); } b.tube([0, 0.25, 0.02], [0, 0.28, 0.02], 0.17, 0.17, "#f6d14b", 14); b.ball(0, 0.32, 0.17, 0.03, 0.03, 0.03, "#e04a7a", 6, 4); b.tube([0.03, 0.04, 0.3], [0.32, 0.02, 0.42], 0.009, 0.009, "#f6d14b", 4); }
}

function gullBody(b, kind) {
    const scale = kind === "steve" ? 1.12 : 1;
    const col = (nx, ny, nz) => (ny > 0.25 && nz < 0.4 ? "#a9b6c4" : "#f6f4ee");
    b.ball(0, 0.4, 0, 0.3 * scale, 0.3, 0.38 * scale, col, 14, 10);
    for (const s of [-1, 1]) b.ball(s * 0.29 * scale, 0.45, -0.08, 0.075, 0.2, 0.36, (nx, ny, nz) => (nz < -0.62 ? "#20222e" : "#a9b6c4"), 10, 7);
    b.at(0, 0.42, -0.46, (m) => m.ball(0, 0, 0, 0.13, 0.05, 0.25, (nx, ny, nz) => (nz < -0.3 ? "#20222e" : "#f6f4ee"), 10, 6));
    for (const s of [-1, 1]) { b.tube([s * 0.11, 0.15, 0], [s * 0.11, 0.02, 0.05], 0.035, 0.03, "#eab04e", 6); b.ball(s * 0.11, 0.03, 0.12, 0.09, 0.025, 0.14, "#eab04e", 8, 5); }
    if (kind === "steve") { b.at(0.33, 0.45, 0.2, (m) => { m.box(0, 0, 0, 0.26, 0.2, 0.16, "#d33f3f", { top: "#fff" }); for (let i = 0; i < 5; i++) m.box(-0.09 + i * 0.045, 0.16, 0, 0.03, 0.16 + (i % 2) * 0.05, 0.03, "#f4c542", { top: "#ffdf74" }); }); }
}
function gullHead(b, kind) {
    b.ball(0, 0.1, 0.03, 0.205, 0.2, 0.22, "#fbf9f2", 12, 8);
    b.tube([0, 0.09, 0.18], [0, 0.07, 0.42], 0.08, 0.04, "#f2c23a", 8);
    b.ball(0, 0.04, 0.4, 0.05, 0.05, 0.06, "#e24b3a", 7, 5);
    for (const s of [-1, 1]) eye(b, s * 0.115, 0.16, 0.17, 0.068, "#f1e15b", true, s);
    if (kind === "screecher") { b.tube([0, 0.24, 0.02], [0, 0.3, 0.02], 0.32, 0.32, "#7d8796", 14); b.ball(0, 0.32, 0.02, 0.26, 0.09, 0.26, "#8e98a8", 12, 6); b.tube([0, 0.4, 0.02], [0, 0.46, 0.02], 0.04, 0.04, "#667080", 8); }
    if (kind === "steve") { b.tube([0, 0.22, 0.02], [0, 0.24, 0.02], 0.34, 0.34, "#1f3a66", 16); b.tube([0, 0.24, 0], [0, 0.36, -0.02], 0.25, 0.27, "#fbf9f2", 14); b.box(0, 0.25, 0.16, 0.14, 0.09, 0.05, "#f0c04a"); }
}

function squirrelBody(b, kind) {
    const fur = "#b4602f", belly = "#f0d3a6", col = (nx, ny, nz) => mix(fur, belly, Math.max(0, Math.min(1, nz * 1.4 - ny * 0.3 - 0.2)));
    b.ball(0, 0.32, 0, 0.23, 0.29, 0.25, col, 14, 10);
    // the tail is the character: a big S of fluff
    const tail = [[0, 0.2, -0.3, 0.15], [0, 0.35, -0.44, 0.2], [0, 0.58, -0.46, 0.23], [0, 0.76, -0.34, 0.2], [0, 0.82, -0.18, 0.13]];
    for (const [x, y, z, r] of tail) b.ball(x, y, z, r * 0.9, r, r, (nx, ny) => mix("#9c4a22", "#e6914f", Math.max(0, ny * 0.7 + 0.3)), 10, 7);
    for (const s of [-1, 1]) { b.ball(s * 0.15, 0.1, 0.1, 0.1, 0.07, 0.16, fur, 8, 5); b.ball(s * 0.21, 0.37, 0.14, 0.055, 0.12, 0.06, fur, 8, 5); }
    if (kind === "lobber") { b.at(0.27, 0.54, 0.05, (m) => { m.ball(0, 0, 0, 0.1, 0.12, 0.1, "#a9713a", 8, 6); m.ball(0, 0.09, 0, 0.11, 0.06, 0.11, "#6a4524", 8, 5); }); }
    if (kind === "nutcase") { for (let i = 0; i < 3; i++) b.tube([-0.13 + i * 0.13, 0.2, 0.2], [-0.13 + i * 0.13, 0.5, 0.2], 0.05, 0.05, "#d73a3a", 8); b.box(0, 0.32, 0.22, 0.42, 0.05, 0.05, "#2a2733"); }
    if (kind === "hazel") { b.tube([0, 0.02, 0], [0, 0.56, 0], 0.32, 0.23, "#7d2020", 14); for (const y of [0.5, 0.35, 0.2]) b.ball(0, y, 0.26, 0.022, 0.022, 0.02, "#f0c04a", 6, 4); b.ball(0, 0.57, 0, 0.2, 0.05, 0.2, "#5a1616", 10, 5); }
}
function squirrelHead(b, kind) {
    const fur = "#b4602f";
    b.ball(0, 0.1, 0.03, 0.22, 0.2, 0.21, (nx, ny, nz) => mix(fur, "#f0d3a6", Math.max(0, Math.min(1, nz * 1.3 - ny * 0.5 - 0.35))), 12, 8);
    for (const s of [-1, 1]) { b.at(s * 0.14, 0.29, -0.02, (m) => m.ball(0, 0.04, 0, 0.055, 0.09, 0.035, "#9c4a22", 7, 5), { rz: -s * 0.3 }); b.ball(s * 0.15, 0.03, 0.15, 0.09, 0.08, 0.08, "#c97a44", 8, 6); }
    b.ball(0, 0.07, 0.24, 0.035, 0.028, 0.025, "#2a1b18", 6, 4);
    b.box(0, -0.02, 0.22, 0.09, 0.05, 0.02, "#fbf6e3");
    for (const s of [-1, 1]) eye(b, s * 0.1, 0.15, 0.16, kind === "nutcase" ? 0.085 : 0.07, "#6d3d1c", kind !== "nutcase", s);
    if (kind === "lobber") { b.ball(0, 0.25, 0.02, 0.2, 0.09, 0.2, "#6a4524", 12, 6); b.cyl(0, 0.33, 0.02, 0.018, 0.05, "#4a2f18", 6); }
    if (kind === "nutcase") { b.cyl(0.1, 0.27, 0, 0.012, 0.13, "#ddd", 5); b.ball(0.1, 0.42, 0, 0.035, 0.035, 0.035, "#ffb23a", 6, 4); }
    if (kind === "hazel") { b.tube([0, 0.24, 0.02], [0, 0.26, 0.02], 0.27, 0.27, "#5a1616", 14); b.tube([0, 0.26, 0], [0, 0.38, 0], 0.2, 0.24, "#7d2020", 14); b.ball(0, 0.32, 0.23, 0.05, 0.05, 0.02, "#f0c04a", 6, 4); }
}

function swanBody(b) {
    b.ball(0, 0.5, -0.1, 0.42, 0.42, 0.62, "#fbfbf6", 18, 12);
    for (const s of [-1, 1]) b.at(s * 0.4, 0.68, -0.25, (m) => m.ball(0, 0, 0, 0.1, 0.3, 0.52, (nx, ny) => mix("#e9e8ee", "#fff", ny * 0.5 + 0.5), 12, 8), { rz: -s * 0.35 });
    b.ball(0, 0.62, -0.72, 0.2, 0.1, 0.3, "#fff", 10, 6);
    for (const s of [-1, 1]) b.ball(s * 0.18, 0.06, 0.1, 0.2, 0.05, 0.2, "#1b1b24", 8, 5);
    const neck = [[0, 0.6, 0.38, 0.17], [0, 0.78, 0.5, 0.15], [0, 0.98, 0.52, 0.135], [0, 1.15, 0.44, 0.12], [0, 1.3, 0.34, 0.115]];
    for (let i = 0; i < neck.length - 1; i++) b.tube(neck[i], neck[i + 1], neck[i][3], neck[i + 1][3], "#fbfbf6", 10);
    for (const p of neck) b.ball(p[0], p[1], p[2], p[3], p[3], p[3], "#fbfbf6", 10, 7);
}
function swanHead(b) {
    b.ball(0, 0.04, 0.04, 0.2, 0.18, 0.24, "#fbfbf6", 12, 8);
    b.tube([0, 0.05, 0.2], [0, -0.02, 0.56], 0.1, 0.04, "#ee7f2a", 8);
    b.ball(0, 0.1, 0.2, 0.12, 0.09, 0.12, "#1b1b24", 10, 6);
    for (const s of [-1, 1]) b.ball(s * 0.15, 0.1, 0.13, 0.08, 0.075, 0.08, "#1b1b24", 8, 6), b.ball(s * 0.19, 0.11, 0.17, 0.028, 0.028, 0.028, "#ff3a3a", 6, 4);
}

function wing(b, col, tipc) {
    b.at(0, 0, 0, (m) => { m.ball(0.2, 0, 0, 0.24, 0.035, 0.13, (nx) => mix(col, tipc, Math.max(0, nx)), 10, 6); });
}

function can(b) {
    b.cyl(0, 0, 0, 0.2, 0.5, "#d8392b", 16);
    b.tube([0, 0.15, 0], [0, 0.3, 0], 0.205, 0.205, "#f6efe0", 16, false);
    b.tube([0, 0.5, 0], [0, 0.53, 0], 0.2, 0.17, "#d7dbe6", 16);
    b.tube([0, 0, 0], [0, 0.03, 0], 0.19, 0.2, "#d7dbe6", 16, false);
    b.at(0.05, 0.535, 0, (m) => m.box(0, 0, 0, 0.1, 0.012, 0.05, "#aab2c0"), { ry: 0.5 });
    b.at(0, 0.22, 0.205, (m) => m.ball(0, 0, 0, 0.12, 0.05, 0.01, "#2a7fd0", 8, 4));
}
function box(b) {
    b.box(0, 0, 0, 0.72, 0.56, 0.72, "#c99a5f", { top: "#dcb077", bevel: 0.03 });
    b.box(0, 0.002, 0, 0.14, 0.565, 0.735, "#e8d9b8", { top: "#f2e8d0" });
    b.at(0.12, 0.2, 0.362, (m) => { m.ball(0, 0.03, 0, 0.1, 0.1, 0.01, "#f08a3c", 10, 5); });
    b.box(0, 0.002, 0, 0.74, 0.56, 0.02, "#a97b45");
}
function bag(b) {
    const col = (nx, ny) => mix("#e9c084", "#f6dfae", ny * 0.5 + 0.5);
    b.ball(-0.12, 0.3, 0, 0.26, 0.3, 0.36, col, 12, 9);
    b.ball(0.12, 0.3, 0, 0.26, 0.3, 0.36, col, 12, 9);
    b.ball(0, 0.32, 0, 0.3, 0.33, 0.37, "#f7ecd2", 14, 9);
    for (const a of [-0.2, 0.2]) b.at(a, 0.6, 0, (m) => m.ball(0, 0.03, 0, 0.09, 0.08, 0.18, "#b87a3c", 8, 5));
    b.ball(0, 0.32, 0.36, 0.17, 0.14, 0.02, "#e45a3c", 10, 5);
    b.tube([0, 0.62, -0.3], [0, 0.66, -0.38], 0.09, 0.05, "#e45a3c", 8);
    b.at(0, 0.66, -0.44, (m) => { m.ball(0.07, 0.04, 0, 0.09, 0.05, 0.04, "#f7ecd2", 7, 5); m.ball(-0.07, 0.04, 0, 0.09, 0.05, 0.04, "#f7ecd2", 7, 5); });
}
function nest(b) {
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; b.at(Math.cos(a) * 0.3, 0.14, Math.sin(a) * 0.3, (m) => m.ball(0, 0, 0, 0.2, 0.05, 0.05, i % 2 ? "#9a7443" : "#7d5c34", 6, 4), { ry: a + 1.2 + (i % 3) * 0.3, rz: (i % 2) * 0.3 }); }
    b.ball(0, 0.1, 0, 0.3, 0.06, 0.3, "#5e4427", 10, 5);
    for (const [x, z, c] of [[-0.1, 0.05, "#bfe6f0"], [0.12, 0.08, "#d8f0e0"], [0, -0.1, "#f7efe0"]]) b.ball(x, 0.21, z, 0.1, 0.13, 0.1, c, 10, 7);
}
function drum(b) {
    b.at(0, 0.44, 0, (m) => {
        m.tube([0, 0, -0.2], [0, 0, 0.2], 0.42, 0.42, "#c0392b", 20);
        m.tube([0, 0, 0.19], [0, 0, 0.26], 0.45, 0.45, "#f0c04a", 20);
        m.tube([0, 0, -0.26], [0, 0, -0.19], 0.45, 0.45, "#f0c04a", 20);
        m.ball(0, 0, 0.265, 0.4, 0.4, 0.012, "#f9f4e5", 18, 6);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; m.tube([Math.cos(a) * 0.44, Math.sin(a) * 0.44, -0.2], [Math.cos(a + 0.4) * 0.44, Math.sin(a + 0.4) * 0.44, 0.2], 0.012, 0.012, "#f6e6b0", 4, false); }
    });
    b.tube([-0.3, 0, 0.1], [-0.32, 0.2, 0.05], 0.03, 0.03, "#8d6238", 6);
    b.tube([0.3, 0, 0.1], [0.32, 0.2, 0.05], 0.03, 0.03, "#8d6238", 6);
}
function sprinkler(b) {
    b.tube([0, 0, 0], [0, 0.1, 0], 0.26, 0.2, "#55606f", 14);
    b.cyl(0, 0.1, 0, 0.08, 0.3, "#c9ced8", 10);
    b.at(0, 0.42, 0, (m) => { m.box(0, -0.04, 0.05, 0.14, 0.09, 0.3, "#2f8fb0", { top: "#49b6d6", bevel: 0.015 }); m.tube([0, 0, 0.2], [0, 0, 0.3], 0.05, 0.035, "#e8c84a", 8); });
}
function crumb(b) {
    for (const [x, z, r, c] of [[-0.12, 0.05, 0.11, "#e7bb74"], [0.12, -0.03, 0.09, "#f2d395"], [0.02, 0.15, 0.07, "#d59f58"], [0.05, -0.15, 0.06, "#e7bb74"]]) b.ball(x, r * 0.7, z, r, r * 0.8, r, c, 7, 5);
}
function perch(b) {
    b.tube([0, 0, 0], [0, 0.06, 0], 0.36, 0.33, "#f4e6c3", 16);
    b.cyl(0, 0.06, 0, 0.3, 0.02, "#e8b84a", 16);
}
function gate(b) {
    for (const s of [-1, 1]) { b.box(s * 0.42, 0, 0, 0.12, 1.0, 0.12, "#3c4a44", { top: "#54665e" }); b.ball(s * 0.42, 1.06, 0, 0.09, 0.09, 0.09, "#e8c84a"); }
    b.box(0, 0.86, 0, 0.84, 0.08, 0.06, "#3c4a44");
    b.at(0, 0.98, 0.0, (m) => m.ball(0, 0, 0, 0.14, 0.1, 0.03, "#e8c84a", 10, 5));
}
function flag(b, col) {
    b.cyl(0, 0, 0, 0.03, 0.8, "#e9e2d0", 6);
    b.ball(0, 0.82, 0, 0.05, 0.05, 0.05, "#f0c04a", 6, 5);
    b.at(0.02, 0.66, 0, (m) => { m.box(0.17, 0, 0, 0.32, 0.2, 0.02, col, { top: col }); });
    b.cyl(0, 0, 0, 0.14, 0.05, "#7d8796", 10);
}

/** Build every shared model. Boards are built per battle, in stage.js. */
export function buildModels(game) {
    const data = {};
    const make = (name, fn, outline = 0.02, col) => { const b = new Mesher(); fn(b); if (outline) b.hull(outline, col); data[name] = b; b.bake(game, name); };
    for (const [k, o] of Object.entries(SQUAD)) {
        const pl = PLUMAGE[o.pl];
        make(`${k}_body`, (b) => pigeonBody(b, pl, o.fat ?? 1));
        make(`${k}_head`, (b) => { pigeonHead(b, pl); HATS[k](b); });
        make(`${k}_body_g`, (b) => pigeonBody(b, pl, o.fat ?? 1), 0);
        make(`${k}_head_g`, (b) => { pigeonHead(b, pl); HATS[k](b); }, 0);
    }
    for (const k of ["crow", "slinger", "bruiser", "contessa"]) { make(`${k}_body`, (b) => crowBody(b, k)); make(`${k}_head`, (b) => crowHead(b, k)); }
    for (const k of ["gull", "screecher", "steve"]) { make(`${k}_body`, (b) => gullBody(b, k)); make(`${k}_head`, (b) => gullHead(b, k)); }
    for (const k of ["squirrel", "lobber", "nutcase", "hazel"]) { make(`${k}_body`, (b) => squirrelBody(b, k)); make(`${k}_head`, (b) => squirrelHead(b, k)); }
    make("swan_body", swanBody); make("swan_head", swanHead);
    make("wing_grey", (b) => wing(b, "#a7b1c3", "#3a3f52"), 0.015);
    make("wing_dark", (b) => wing(b, "#2b2c3f", "#4c5478"), 0.015);
    make("wing_white", (b) => wing(b, "#f6f4ee", "#20222e"), 0.015);
    make("wing_fur", (b) => b.ball(0.08, 0, 0, 0.1, 0.05, 0.06, "#b4602f", 6, 4), 0.012);
    make("can", can, 0.016); make("box", box, 0.016); make("bag", bag, 0.018); make("nest", nest, 0.012); make("drum", drum, 0.018); make("sprinkler", sprinkler, 0.016);
    make("crumb", crumb, 0.012); make("perch", perch, 0); make("gate", gate, 0.012);
    make("flag_ally", (b) => flag(b, "#3fa8e0"), 0.012); make("flag_foe", (b) => flag(b, "#d84a3a"), 0.012); make("flag_gold", (b) => flag(b, "#f0c04a"), 0.012);
    make("bone", (b) => b.box(0, 0, 0, 1, 1, 1, "#fff"), 0);
    return data;
}

/** Where the head sits on each body, and how large the whole bird stands. */
export const BIRD = {
    default: { neck: [0, 0.66, 0.17], s: 1 },
    lunch: { neck: [0, 0.74, 0.22], s: 1.06 },
    kevin: { neck: [0, 0.6, 0.15], s: 0.86 },
    crow: { neck: [0, 0.68, 0.14], s: 1 }, slinger: { neck: [0, 0.68, 0.14], s: 0.96 }, bruiser: { neck: [0, 0.68, 0.14], s: 1.2 }, contessa: { neck: [0, 0.72, 0.1], s: 1.34 },
    gull: { neck: [0, 0.72, 0.2], s: 1.04 }, screecher: { neck: [0, 0.72, 0.2], s: 1.24 }, steve: { neck: [0, 0.72, 0.2], s: 1.46 },
    squirrel: { neck: [0, 0.58, 0.08], s: 0.95 }, lobber: { neck: [0, 0.58, 0.08], s: 0.95 }, nutcase: { neck: [0, 0.58, 0.08], s: 0.88 }, hazel: { neck: [0, 0.6, 0.08], s: 1.34 },
    swan: { neck: [0, 1.32, 0.3], s: 1.5 },
};
export const WING_OF = { crow: "wing_dark", slinger: "wing_dark", bruiser: "wing_dark", contessa: "wing_dark", gull: "wing_white", screecher: "wing_white", steve: "wing_white", swan: "wing_white", squirrel: "wing_fur", lobber: "wing_fur", nutcase: "wing_fur", hazel: "wing_fur" };
void tint;
