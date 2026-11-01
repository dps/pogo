// On-demand sprites: Deskmates, item icons, battle effects and the cast list.
import { Ink, INK, mix } from "./ink.js";
import { ART } from "./beasts.js";

const has = (game, n) => game.assets.sprites.has(n);
export function beastSprite(game, sp) {
    const n = "b:" + sp;
    if (!has(game, n)) game.assets.paint(n, 240, 240, (p) => { const k = new Ink(p, 1.1); k.tx = 9; k.ty = 9; (ART[sp] ?? ART.stickle)(k); k.sticker(5); }, { smooth: true });
    return n;
}
export function decalSprite(game, name) {
    const n = "dc:" + name;
    if (!has(game, n)) game.assets.paint(n, 432, 432, (p) => {
        const k = new Ink(p, 2); k.lw = 2;
        k.circ(108, 108, 104, { fill: "#2d3f85", fill2: "#24346e", shade: 0 });
        k.circ(108, 108, 90, { ink: "#c9a24a", w: 3 }); k.circ(108, 108, 66, { fill: "#f4efe0", shade: 0, w: 2.6 });
        k.caps("AE", 108, 100, 12, "#2d3f85");
        k.caps("EVERYTHING", 108, 143, 2.2, "#c9a24a");
        for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; k.circ(108 + Math.cos(a) * 78, 108 + Math.sin(a) * 78, 3.4, { fill: "#c9a24a", ink: false, shade: 0 }); }
    }, { smooth: true });
    return n;
}
/** The same Deskmate for drawing with flipX: true. Any words on it are painted backwards, so they read correctly once mirrored. */
export function beastFlip(game, sp) {
    const n = "bf:" + sp;
    if (!has(game, n)) game.assets.paint(n, 240, 240, (p) => { const k = new Ink(p, 1.1); k.tx = 9; k.ty = 9; k.preflip = true; (ART[sp] ?? ART.stickle)(k); k.sticker(5); }, { smooth: true });
    return n;
}
const ICONS = {
    folder: (k) => { k.poly([[8, 22], [26, 22], [32, 30], [58, 30], [58, 54], [8, 54]], { fill: "#e8c98a", round: 2, w: 3, shade: 4 }); k.box(33, 42, 50, 24, 2, { fill: "#f4dba6", shade: 3, w: 3 }); },
    case: (k) => { k.box(32, 22, 22, 12, 3, { ink: INK, w: 4 }); k.box(32, 40, 52, 34, 4, { fill: "#8a5a3a", fill2: "#6d4329", shade: 4, w: 3 }); k.box(32, 37, 52, 4, 0, { fill: "#40281a", ink: false, shade: 0 }); k.box(32, 38, 10, 8, 1.5, { fill: "#ffd84d", w: 2.4, shade: 0 }); },
    lanyard: (k) => { k.line(Ink.curve([18, 6], [20, 30], [32, 38]), 5, { color: "#e5484d" }); k.line(Ink.curve([46, 6], [44, 30], [32, 38]), 5, { color: "#e5484d" }); k.box(32, 46, 24, 18, 2, { fill: "#fffdf5", w: 2.6, shade: 2 }); k.circ(26, 45, 4, { fill: "#6aa7ee", w: 1.6, shade: 0 }); k.line([[33, 42], [41, 42]], 2); k.line([[33, 48], [41, 48]], 2); },
    fleece: (k) => { k.poly([[20, 12], [44, 12], [58, 22], [52, 32], [46, 28], [46, 56], [18, 56], [18, 28], [12, 32], [6, 22]], { fill: "#3b6fd4", w: 3, shade: 4, round: 1 }); k.line([[32, 14], [32, 56]], 2); k.circ(25, 30, 3, { fill: "#ffd84d", w: 1.4, shade: 0 }); },
    stock: (k) => { k.box(32, 34, 46, 36, 2, { fill: "#d7efd2", w: 3, shade: 3 }); k.line([[15, 44], [26, 34], [34, 40], [48, 24]], 3, { color: "#2c6d28" }); k.poly([[43, 22], [52, 22], [50, 30]], { fill: "#2c6d28", ink: false, shade: 0 }); },
    handshake: (k) => { k.box(32, 36, 42, 20, 8, { fill: "#ffd84d", fill2: "#d9a925", w: 3, shade: 3, lit: true }); k.line([[20, 32], [32, 40], [44, 32]], 3); k.box(10, 36, 10, 16, 2, { fill: "#3b6fd4", w: 2.6, shade: 0 }); k.box(54, 36, 10, 16, 2, { fill: "#3b6fd4", w: 2.6, shade: 0 }); },
    cup: (k) => { k.poly([[16, 20], [48, 20], [44, 56], [20, 56]], { fill: "#fffdf5", w: 3, shade: 3 }); k.ell(32, 21, 16, 5, { fill: "#7a4a2b", w: 3, shade: 0 }); k.line(Ink.curve([28, 12], [24, 8], [30, 3]), 2.5, { color: "#8a90a0" }); k.line(Ink.curve([38, 13], [34, 8], [40, 4]), 2.5, { color: "#8a90a0" }); },
    latte: (k) => { k.box(30, 38, 34, 26, 8, { fill: "#d6a06a", w: 3, shade: 3 }); k.ell(30, 28, 17, 6, { fill: "#f6ead6", w: 3, shade: 0 }); k.line(Ink.curve([46, 30], [60, 36], [46, 46]), 4); k.ell(30, 56, 22, 4, { fill: "#fffdf5", w: 2.6, shade: 0 }); },
    triple: (k) => { k.poly([[12, 26], [24, 26], [23, 54], [13, 54]], { fill: "#7a4a2b", w: 2.6, shade: 2 }); k.poly([[26, 20], [38, 20], [37, 54], [27, 54]], { fill: "#5e3820", w: 2.6, shade: 2 }); k.poly([[40, 26], [52, 26], [51, 54], [41, 54]], { fill: "#7a4a2b", w: 2.6, shade: 2 }); k.line([[8, 14], [14, 6]], 3, { color: "#e5484d" }); k.line([[56, 14], [50, 6]], 3, { color: "#e5484d" }); },
    donuts: (k) => { k.box(32, 40, 54, 30, 3, { fill: "#ff8fb1", w: 3, shade: 3 }); k.box(32, 30, 54, 10, 2, { fill: "#ffc7d9", w: 3, shade: 0 }); k.circ(32, 42, 10, { fill: "#d6a06a", w: 2.4, shade: 0 }); k.circ(32, 42, 3.6, { fill: "#ff8fb1", w: 2, shade: 0 }); },
    aspirin: (k) => { k.box(32, 34, 40, 22, 11, { fill: "#fffdf5", w: 3, shade: 4, rot: -0.5 }); k.line([[20, 42], [44, 26]], 2.6); },
    note: (k) => { k.box(32, 34, 40, 46, 2, { fill: "#fffdf5", w: 3, shade: 3 }); k.box(32, 22, 20, 8, 1, { fill: "#e5484d", ink: false, shade: 0 }); k.box(32, 22, 8, 3, 0, { fill: "#fff", ink: false, shade: 0 }); k.box(32, 22, 3, 8, 0, { fill: "#fff", ink: false, shade: 0 }); k.line([[20, 36], [44, 36]], 2); k.line([[20, 44], [40, 44]], 2); },
    sign: (k) => { k.box(32, 38, 42, 34, 3, { fill: "#e5484d", w: 3, shade: 4 }); k.box(32, 38, 30, 7, 2, { fill: "#fffdf5", ink: false, shade: 0 }); k.line([[32, 21], [18, 8]], 2.6); k.line([[32, 21], [46, 8]], 2.6); },
    app: (k) => { k.box(32, 32, 32, 50, 5, { fill: "#39414f", w: 3, shade: 0 }); k.box(32, 30, 25, 37, 2, { fill: "#a9e5d0", ink: false, shade: 0 }); k.circ(32, 30, 8, { ink: "#2c6d28", w: 2.4 }); },
    can: (k) => { k.box(32, 34, 26, 46, 4, { fill: "#2fa6a0", fill2: "#135c58", w: 3, shade: 4, lit: true }); k.poly([[36, 18], [26, 36], [33, 36], [28, 50], [40, 30], [33, 30]], { fill: "#ffd84d", ink: false, shade: 0 }); },
    key: (k) => { k.circ(22, 22, 13, { fill: "#ffd84d", w: 3, shade: 3 }); k.circ(22, 22, 5, { fill: "#fffdf5", w: 2.4, shade: 0 }); k.line([[32, 32], [54, 54]], 7); k.line([[46, 46], [52, 40]], 6); k.line([[52, 52], [58, 46]], 6); },
};
export const ITEM_ICON = { coffee: "cup", flat_white: "latte", triple: "triple", donuts: "donuts", aspirin: "aspirin", sick_note: "note", lanyard: "lanyard", fleece: "fleece", stock: "stock", handshake: "handshake", dnd: "sign", calm_app: "app", rush: "can" };
export function itemSprite(game, name) {
    const n = "i:" + name;
    if (!has(game, n)) game.assets.paint(n, 96, 96, (p) => { const k = new Ink(p, 1.5); k.lw = 2.6; (ICONS[name] ?? ICONS.folder)(k); k.sticker(2.4); }, { smooth: true });
    return n;
}
/** Effects sheet, 8 frames: sheet, envelope, tape, droplet, staple, bubble, bolt, crumb/leaf. */
export function paintFx(game) {
    game.assets.paint("fx", 48, 48, (p, f) => {
        const k = new Ink(p, 2); k.lw = 1.3;
        const d = [
            () => k.box(12, 12, 13, 17, 0.5, { fill: "#fbf6e8", shade: 2 }),
            () => { k.box(12, 12, 18, 13, 1, { fill: "#fffdf5", shade: 2 }); k.line([[3.5, 6], [12, 13], [20.5, 6]], 1.3); },
            () => k.box(12, 12, 20, 6, 0.5, { fill: "#e5484d", shade: 2 }),
            () => { k.circ(12, 14, 6, { fill: "#7a4a2b", shade: 2 }); k.poly([[12, 3], [7.5, 11], [16.5, 11]], { fill: "#7a4a2b", ink: false, shade: 0 }); },
            () => k.line([[5, 16], [5, 8], [19, 8], [19, 16]], 2.6, { color: "#c6ccd6" }),
            () => { k.circ(12, 12, 8.5, { fill: "#d7c9ff", shade: 2 }); k.circ(9, 9, 2, { fill: "#fff", ink: false, shade: 0 }); },
            () => k.poly([[14, 2], [5, 14], [11, 14], [8, 22], [19, 9], [13, 9]], { fill: "#7fe6d8", shade: 0 }),
            () => { k.circ(9, 13, 4, { fill: "#d6a06a", shade: 1 }); k.circ(16, 9, 3, { fill: "#ffb36a", shade: 1 }); k.circ(15, 17, 2.6, { fill: "#f6ead6", shade: 1 }); },
            () => k.ell(12, 12, 10, 5, { fill: "#6cc265", rot: -0.6, shade: 2 }),
        ];
        d[f]?.();
    }, { frames: 9, smooth: true });
}
export const FX_FRAME = { paper: 0, email: 1, tape: 2, coffee: 3, hardware: 4, meeting: 5, tech: 6, snack: 7, wellness: 8, none: 0 };

/** The backdrop behind a battle, per floor. */
export function battleBg(game, id, th) {
    const n = "bg:" + id;
    if (has(game, n)) return n;
    game.assets.paint(n, 480, 360, (p) => {
        const k = new Ink(p, 1); k.lw = 2.4;
        const wall = th.bgWall ?? th.wall;
        k.box(240, 130, 480, 260, 0, { fill: wall, fill2: mix(wall, "#ffffff", 0.2), ink: false, shade: 0 });
        for (let i = 0; i < 4; i++) { k.box(70 + i * 112, 26, 88, 16, 3, { fill: mix(wall, "#ffffff", 0.6), ink: false, shade: 0 }); }
        for (let i = 0; i < 3; i++) { const x = 100 + i * 150; k.box(x, 112, 78, 96, 2, { fill: "#cfe6ef", fill2: "#f0f7f5", w: 3, shade: 0 }); for (let j = 0; j < 5; j++) k.box(x - 28 + j * 14, 138 - (j * 3 % 4) * 9, 11, 22 + (j * 3 % 4) * 18, 0, { fill: mix("#8faac6", wall, 0.25), ink: false, shade: 0 }); k.line([[x, 66], [x, 158]], 2.4); }
        for (let i = 0; i < 6; i++) { const x = i * 96; k.box(x + 44, 196, 92, 56, 2, { fill: mix(th.trim, "#8791a0", 0.5), fill2: mix(th.trim, INK, 0.25), w: 2.6, shade: 0 }); }
        k.box(240, 300, 480, 130, 0, { fill: th.carpet, fill2: mix(th.carpet, INK, 0.18), ink: false, shade: 0 });
        k.line([[0, 236], [480, 236]], 3);
        // Halftone ground fade
        const dk = mix(th.carpet, INK, 0.4);
        k.sdf((x, y) => { const u = (x + y) / 11, v = (x - y) / 11, c = Math.cos(u * 6.283) * Math.cos(v * 6.283), r = (y - 236) / 124; return (0.75 - c) * 6 - r * 11 + 1; }, 0, 236, 480, 360, { fill: dk, ink: false, shade: 0 });
    }, { smooth: true });
    return n;
}

const L = (skin, hair, style, top, legs, extra, o = {}) => ({ skin, hair, style, top, legs, extra, ...o });
const SK = ["#f6cfae", "#e0a97c", "#b97c4f", "#8a5636"];
export const LOOKS = {
    hero: L(SK[1], "#3b2a20", "short", "#fffdf5", "#39414f", "lanyard"),
    bev: L(SK[0], "#c9754b", "bob", "#8b6cf0", "#39414f", null, { glasses: 1 }),
    reg: L(SK[3], "#222", "short", "#2d3f85", "#1e2233", "tie", { tie: "#ffd84d" }),
    marge: L(SK[0], "#d9d6cf", "bun", "#7f9f8a", "#5b6478", "cardigan", { glasses: 1 }),
    kenzie: L(SK[2], "#1f1622", "long", "#e5484d", "#1e2233", null),
    doug: L(SK[0], "#8a6a3a", "short", "#e0a13c", "#3f5fb0", "vest", { beard: "#8a6a3a" }),
    cheryl: L(SK[0], "#e8c04a", "bob", "#ff8fb1", "#5b6478", "cardigan"),
    neil: L(SK[1], "#1f1622", "short", "#39414f", "#39414f", "lanyard", { glasses: 1, beard: "#1f1622" }),
    tiff: L(SK[2], "#ff8fb1", "long", "#fffdf5", "#2fa6a0", null),
    ledger: L(SK[0], "#aeb7c6", "short", "#39414f", "#39414f", "tie", { tie: "#2fa6a0", glasses: 1 }),
    sunny: L(SK[1], "#ffd84d", "bun", "#6cc265", "#8b6cf0", null),
    whereas: L(SK[3], "#d9d6cf", "short", "#1e2233", "#1e2233", "tie", { tie: "#7c2b3a", glasses: 1 }),
    chair: L(SK[0], "#d9d6cf", "bald", "#2d3f85", "#1e2233", "tie", { tie: "#c9a24a", beard: "#d9d6cf" }),
    gus: L(SK[2], "#5b6478", "short", "#5b6478", "#39414f", "hat", { tie: "#3b6fd4" }),
    priya: L(SK[2], "#1f1622", "long", "#2fa6a0", "#39414f", "lanyard"),
    milo: L(SK[1], "#c9754b", "spike", "#ffd84d", "#3f5fb0", "lanyard"),
    m1: L(SK[0], "#3b2a20", "short", "#3b6fd4", "#39414f", "tie"), m2: L(SK[1], "#1f1622", "short", "#d9d6cf", "#39414f", "tie", { tie: "#3b6fd4", glasses: 1 }),
    m3: L(SK[2], "#222", "bald", "#8a5a3a", "#39414f", "tie", { tie: "#ffd84d", beard: "#222" }), m4: L(SK[3], "#1f1622", "spike", "#2fa6a0", "#1e2233", "lanyard"),
    m5: L(SK[0], "#c9754b", "short", "#7f9f8a", "#5b6478", null, { glasses: 1 }), m6: L(SK[1], "#8a6a3a", "short", "#e5484d", "#39414f", "lanyard", { beard: "#8a6a3a" }),
    f1: L(SK[0], "#8a5a3a", "bob", "#3b6fd4", "#39414f", "lanyard"), f2: L(SK[3], "#1f1622", "bun", "#ffd84d", "#39414f", null, { glasses: 1 }),
    f3: L(SK[1], "#c9754b", "long", "#2fa6a0", "#5b6478", "cardigan"), f4: L(SK[2], "#222", "bob", "#e5484d", "#1e2233", "lanyard"),
    f5: L(SK[0], "#e8c04a", "long", "#8b6cf0", "#39414f", null), f6: L(SK[1], "#d9d6cf", "bun", "#ff8fb1", "#5b6478", "cardigan", { glasses: 1 }),
};
