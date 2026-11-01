// The room as paint and plaster: one merged shell mesh per room, and a floor texture that remembers everything.
// The floor is split into chunks, so a decal only re-uploads the corner it landed in.
import { D, W } from "./data.js";
import { MB, hex, mix, mul } from "./meshkit.js";
import { furnitureMesh } from "./furniture.js";
import { DOORS, ROOMS } from "./rooms.js";

const CX = 4, CZ = 4, CHUNK = 320, PW = CX * CHUNK, PH = CZ * CHUNK;
const PXU = PW / (W * 2), PZU = PH / (D * 2);       // pixels per world unit

// --- Noise --------------------------------------------------------------------------------------
const PERM = new Float32Array(4096);
{ let s = 12345; for (let i = 0; i < 4096; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; PERM[i] = s / 0x7fffffff; } }
const white = (x, y) => PERM[((x * 73 + y * 179) ^ (x >> 3)) & 4095];
function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = white(xi, yi), b = white(xi + 1, yi), c = white(xi, yi + 1), d = white(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => noise(x, y) * 0.6 + noise(x * 2.1, y * 2.1) * 0.28 + noise(x * 4.3, y * 4.3) * 0.12;

// --- Stamps -------------------------------------------------------------------------------------
const STAMP = 64;
function makeStamps() {
    const out = {};
    const mk = (name, fn) => {
        const list = [];
        for (let v = 0; v < 3; v++) {
            const a = new Float32Array(STAMP * STAMP);
            for (let y = 0; y < STAMP; y++) for (let x = 0; x < STAMP; x++) a[y * STAMP + x] = Math.max(0, Math.min(1, fn((x + 0.5) / STAMP * 2 - 1, (y + 0.5) / STAMP * 2 - 1, v)));
            list.push(a);
        }
        out[name] = list;
    };
    mk("splat", (x, y, v) => { const r = Math.hypot(x, y), n = fbm(x * 3 + v * 5, y * 3 + 9); return (1 - r * 1.05 - (n - 0.5) * 1.1) * 3; });
    mk("soft", (x, y) => (1 - Math.hypot(x, y)) * 1.1);
    mk("scorch", (x, y, v) => { const r = Math.hypot(x, y), n = fbm(x * 4 + v * 3, y * 4); return (1 - r - (n - 0.5) * 0.8) * 2 * (0.75 + n * 0.5); });
    mk("hair", (x, y, v) => {
        let k = 0;
        for (let i = 0; i < 7; i++) {
            const a = i * 1.3 + v * 2, c = Math.cos(a), s = Math.sin(a), q = (x - c * 0.2) * s - (y - s * 0.2) * c + Math.sin((x * c + y * s) * 5 + i) * 0.1;
            k = Math.max(k, 1 - Math.abs(q) * 34);
        }
        return k * (1 - Math.hypot(x, y) * 0.95) * 1.5;
    });
    mk("crack", (x, y, v) => {
        const r = Math.hypot(x, y), a = Math.atan2(y, x) * 5 + v * 2;
        const f = Math.abs(Math.sin(a + Math.sin(r * 9) * 0.4));
        return (1 - f * 30 * (0.1 + r * 0.4)) * (1 - r);
    });
    mk("skid", (x, y) => (1 - Math.abs(y) * 2.4) * (1 - Math.abs(x)) * 1.4 * (0.6 + 0.4 * Math.sin(x * 26)));
    return out;
}

export class Floor {
    constructor(game) {
        this.game = game;
        this.fb = new Uint8ClampedArray(PW * PH * 3);
        this.stamps = makeStamps();
        this.dirty = new Set();
        this.names = [];
        for (let z = 0; z < CZ; z++) for (let x = 0; x < CX; x++) {
            const n = `fl${x}_${z}`;
            this.names.push(n);
            if (!game.assets.sprites.has(n)) game.assets.paint(n, CHUNK, CHUNK, (p) => { p.data.fill(255); }, { smooth: true });
            game.assets.sprite(n).mipmaps = false;       // re-uploaded often, and never seen small
        }
        const s = 1 / CX, t = 1 / CZ;
        game.assets.mesh("fquad", { positions: [0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0], normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], uvs: [0, 1, 1, 1, 1, 0, 0, 0], colors: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], indices: [0, 1, 2, 0, 2, 3] });
        this.w = W * 2 * s; this.d = D * 2 * t;
    }

    /** Copy the changed chunks to their textures. Capped per frame so a storm can't stall a phone. */
    flush(limit = 3) {
        if (!this.dirty.size) return;
        const { game, fb } = this;
        let n = 0;
        for (const c of this.dirty) {
            if (n++ >= limit) break;
            this.dirty.delete(c);
            const cx = c % CX, cz = (c / CX) | 0, data = game.assets.sprite(this.names[c]).data;
            for (let y = 0; y < CHUNK; y++) {
                let o = ((cz * CHUNK + y) * PW + cx * CHUNK) * 3, t = y * CHUNK * 4;
                for (let x = 0; x < CHUNK; x++) { data[t] = fb[o]; data[t + 1] = fb[o + 1]; data[t + 2] = fb[o + 2]; data[t + 3] = 255; t += 4; o += 3; }
            }
            game.assets.refresh(this.names[c]);
        }
    }
    flushAll() { for (let i = 0; i < CX * CZ; i++) this.dirty.add(i); this.flush(99); }

    /** Press a mark into the floor. It stays until the room is left. */
    stamp(kind, x, z, size, col, alpha = 1, rot = 0, sy = 1) {
        const list = this.stamps[kind], mask = list[Math.abs(Math.floor(x * 7.3 + z * 3.1)) % list.length];
        const px = (x + W) * PXU, py = (z + D) * PZU, r = size * PXU, R = Math.ceil(r * Math.max(1, sy) * 1.05);
        const x0 = Math.max(0, Math.floor(px - R)), x1 = Math.min(PW - 1, Math.ceil(px + R));
        const y0 = Math.max(0, Math.floor(py - R)), y1 = Math.min(PH - 1, Math.ceil(py + R));
        if (x0 > x1 || y0 > y1) return;
        const c = Math.cos(rot), s = Math.sin(rot), fb = this.fb, cr = col[0] * 255, cg = col[1] * 255, cb = col[2] * 255;
        for (let y = y0; y <= y1; y++) {
            const dy = y - py;
            let o = (y * PW + x0) * 3;
            for (let xx = x0; xx <= x1; xx++, o += 3) {
                const dx = xx - px;
                const u = (dx * c + dy * s) / r, v = (-dx * s + dy * c) / (r * sy);
                if (u <= -1 || u >= 1 || v <= -1 || v >= 1) continue;
                let a;
                if (r > 30) {
                    // Big marks stretch the 64px mask, so blend between its texels.
                    const mx = (u * 0.5 + 0.5) * (STAMP - 1), my = (v * 0.5 + 0.5) * (STAMP - 1), ix = mx | 0, iy = my | 0, fx = mx - ix, fy = my - iy, o0 = iy * STAMP + ix;
                    const t0 = mask[o0], t1 = mask[o0 + 1], t2 = mask[o0 + STAMP] ?? t0, t3 = mask[o0 + STAMP + 1] ?? t1;
                    a = (t0 + (t1 - t0) * fx + (t2 - t0 + (t0 - t1 - t2 + t3) * fx) * fy) * alpha;
                } else a = mask[((v * 0.5 + 0.5) * STAMP | 0) * STAMP + ((u * 0.5 + 0.5) * STAMP | 0)] * alpha;
                if (a <= 0.004) continue;
                fb[o] += (cr - fb[o]) * a; fb[o + 1] += (cg - fb[o + 1]) * a; fb[o + 2] += (cb - fb[o + 2]) * a;
            }
        }
        for (let cz = (y0 / CHUNK) | 0; cz <= ((y1 / CHUNK) | 0); cz++) for (let cx = (x0 / CHUNK) | 0; cx <= ((x1 / CHUNK) | 0); cx++) this.dirty.add(cz * CX + cx);
    }

    // --- Painting a room --------------------------------------------------------------------
    paint(name, sim) {
        const room = ROOMS[name], fb = this.fb;
        const ink = FLOORS[room.floor];
        const toWorld = (px, py) => [px / PXU - W, py / PZU - D];
        const rug = room.rug ? hex(room.rug) : null;
        for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
            const [wx, wz] = [x / PXU - W, y / PZU - D];
            const c = ink(wx, wz, x, y);
            let r = c[0], g = c[1], b = c[2];
            if (rug) {
                const q = Math.max(Math.abs(wx) / 7.2, Math.abs(wz) / 6.4), edge = 1 - q;
                if (q < 1) {
                    const weave = 0.92 + 0.08 * Math.sin(wz * 22) * Math.sin(wx * 22) + (white(x, y) - 0.5) * 0.08;
                    const band = q > 0.9 || (q > 0.74 && q < 0.78) ? 0.75 : 1, lift = q > 0.9 ? 1.25 : 1;
                    r = rug[0] * 255 * weave * band * lift; g = rug[1] * 255 * weave * band * lift; b = rug[2] * 255 * weave * band * lift;
                    if (edge < 0.012) { r *= 0.7; g *= 0.7; b *= 0.7; }
                }
            }
            const o = (y * PW + x) * 3;
            fb[o] = r; fb[o + 1] = g; fb[o + 2] = b;
        }
        // Printed-on details for this room's hazards.
        for (const h of room.hazards) {
            if (h.kind === "slick") {
                const col = name === "kitchen" ? hex("#c9a032") : hex("#b8ecf5");
                this.stamp("splat", h.x, h.z, h.r * 1.2, col, 0.55);
                this.stamp("splat", h.x + 0.4, h.z - 0.3, h.r * 0.7, mix(col, [1, 1, 1], 0.55), 0.35);
            }
            if (h.kind === "vortex") {
                this.stamp("soft", h.x, h.z, h.r * 0.9, hex("#5fb9c9"), 0.3);
                this.stamp("soft", h.x, h.z, 1.5, hex("#2a4a5a"), 1);
            }
            if (h.kind === "wind") {
                for (let z = h.z0 + 1; z < h.z1; z += 2.6) this.stamp("skid", (h.x0 + h.x1) / 2, z, 2.6, hex("#b7a6e0"), 0.25, 0, 0.3);
            }
            if (h.kind === "jet") {
                const cz = (h.z0 + h.z1) / 2;
                for (let x = h.x0 + 0.6; x < h.x1; x += 1.1) this.stamp("scorch", x, cz, 1.1, h.tint === "fire" ? [0.18, 0.13, 0.12] : [0.5, 0.5, 0.56], 0.3);
            }
            if (h.kind === "train") this.paintTrack(sim.hazards.find((t) => t.kind === "train"));
        }
        // Soft shadow where things meet the floor, and warm sun through the window.
        const GW = 96, GH = 96, ao = new Float32Array(GW * GH);
        for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
            const wx = (gx + 0.5) / GW * W * 2 - W, wz = (gy + 0.5) / GH * D * 2 - D;
            let k = 1;
            const edge = Math.min(W - Math.abs(wx), wz + D, (D - wz) * 2);
            k *= 0.68 + 0.32 * Math.min(1, edge / 2.4);
            for (const f of sim.furn) {
                const dx = Math.max(Math.abs(wx - f.x) - f.w / 2, 0), dz = Math.max(Math.abs(wz - f.z) - f.d / 2, 0), dd = Math.hypot(dx, dz);
                if (dd < 1.5) k *= 0.62 + 0.38 * (dd / 1.5);
            }
            // Sun pool from the back window.
            const su = (wx - 1.8 - (wz + D) * 0.22) / 4.2, sv = (wz + D - 7.5) / 5.2;
            let sun = 0;
            if (Math.abs(su) < 1 && Math.abs(sv) < 1) sun = Math.min(1, (1 - Math.abs(su)) * 7) * Math.min(1, (1 - Math.abs(sv)) * 7);
            ao[gy * GW + gx] = k * (1 + sun * 0.2);
        }
        for (let y = 0; y < PH; y++) {
            const gy = y / PH * GW - 0.5, y0 = Math.max(0, Math.floor(gy)), y1 = Math.min(GH - 1, y0 + 1), ty = gy - Math.floor(gy);
            let o = y * PW * 3;
            for (let x = 0; x < PW; x++, o += 3) {
                const gx = x / PW * GW - 0.5, x0 = Math.max(0, Math.floor(gx)), x1 = Math.min(GW - 1, x0 + 1), tx = gx - Math.floor(gx);
                const a = ao[y0 * GW + x0], b = ao[y0 * GW + x1], c = ao[y1 * GW + x0], d = ao[y1 * GW + x1];
                const k = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
                fb[o] *= k; fb[o + 1] *= k * (k > 1 ? 0.99 : 1); fb[o + 2] *= k * (k > 1 ? 0.94 : 1);
            }
        }
        this.flushAll();
    }

    paintTrack(h) {
        if (!h) return;
        const sleeper = hex("#b98a55"), rail = hex("#8d97a6");
        for (let i = 0; i < 90; i++) {
            const a = i / 90 * Math.PI * 2, x = h.cx + Math.cos(a) * h.rx, z = h.cz + Math.sin(a) * h.rz, tan = Math.atan2(Math.cos(a) * h.rz, -Math.sin(a) * h.rx);
            this.stamp("skid", x, z, 0.92, sleeper, 1, tan + Math.PI / 2, 0.42);
        }
        for (let i = 0; i < 420; i++) {
            const a = i / 420 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
            for (const off of [-0.5, 0.5]) this.stamp("soft", h.cx + c * (h.rx + off), h.cz + s * (h.rz + off), 0.13, rail, 1);
        }
    }
}

// --- Floor materials, in 0-255 --------------------------------------------------------------------
const out = [0, 0, 0];
const FLOORS = {
    wood(x, z, px, py) {
        const plank = Math.floor(x / 1.5), off = white(plank, 7) * 9, seg = Math.floor((z + off) / 6.2);
        const tone = white(plank, seg + 40), g = fbm((x + plank * 3) * 7, (z + off) * 0.7), grain = 0.86 + 0.26 * g + 0.04 * Math.sin((x + g * 2) * 34);
        const seam = Math.min(Math.abs((x / 1.5) % 1 + (x < 0 ? 1 : 0)) % 1, 1 - Math.abs((x / 1.5) % 1 + (x < 0 ? 1 : 0)) % 1) < 0.018 || ((z + off) / 6.2) % 1 < 0.006 && ((z + off) / 6.2) % 1 > -0.006 ? 0.56 : 1;
        const k = (0.84 + tone * 0.24) * grain * seam;
        out[0] = 200 * k; out[1] = 141 * k; out[2] = 86 * k;
        return out;
    },
    check(x, z, px, py) {
        const s = 2.1, a = (Math.floor(x / s) + Math.floor(z / s)) & 1, n = 0.97 + (white(px, py) - 0.5) * 0.04 + (fbm(x * 0.6, z * 0.6) - 0.5) * 0.12;
        const lx = Math.abs(((x / s) % 1 + 1) % 1 - 0.5), lz = Math.abs(((z / s) % 1 + 1) % 1 - 0.5), grout = lx > 0.485 || lz > 0.485 ? 0.8 : 1;
        if (a) { out[0] = 244 * n * grout; out[1] = 236 * n * grout; out[2] = 214 * n * grout; } else { out[0] = 76 * n * grout; out[1] = 138 * n * grout; out[2] = 124 * n * grout; }
        return out;
    },
    tile(x, z, px, py) {
        const s = 1.5, ix = Math.floor(x / s), iz = Math.floor(z / s), t = white(ix + 30, iz + 60), n = 0.96 + t * 0.08 + (white(px, py) - 0.5) * 0.025;
        const lx = Math.abs(((x / s) % 1 + 1) % 1 - 0.5), lz = Math.abs(((z / s) % 1 + 1) % 1 - 0.5);
        if (lx > 0.47 || lz > 0.47) { out[0] = 208; out[1] = 214; out[2] = 216; return out; }
        const sheen = 1 + Math.max(0, 0.42 - Math.hypot(lx - 0.1, lz - 0.1)) * 0.2;
        const pick = (ix + iz * 3) % 7 === 0;
        out[0] = (pick ? 236 : 148) * n * sheen; out[1] = (pick ? 158 : 214) * n * sheen; out[2] = (pick ? 176 : 216) * n * sheen;
        return out;
    },
    lino(x, z, px, py) {
        const n = 0.92 + fbm(x * 0.5, z * 0.5) * 0.14, sp = white(px >> 1, py >> 1), fleck = sp > 0.965 ? 1.2 : sp < 0.035 ? 0.8 : 1;
        const s = 5.25, lx = ((x / s) % 1 + 1) % 1, lz = ((z / s) % 1 + 1) % 1, seam = lx < 0.006 || lz < 0.006 ? 0.86 : 1;
        out[0] = 190 * n * fleck * seam; out[1] = 180 * n * fleck * seam; out[2] = 214 * n * fleck * seam;
        return out;
    },
    carpet(x, z, px, py) {
        const n = 0.88 + fbm(x * 1.4, z * 1.4) * 0.2 + (white(px, py) - 0.5) * 0.14;
        const big = Math.hypot(((x / 5) % 1 + 1) % 1 - 0.5, ((z / 5) % 1 + 1) % 1 - 0.5) < 0.17 ? 1.07 : 1;
        out[0] = 160 * n * big; out[1] = 204 * n * big; out[2] = 196 * n * big;
        return out;
    },
};

// --- The shell ------------------------------------------------------------------------------------
export function buildShell(game, name, sim) {
    const room = ROOMS[name], key = `shell_${name}`, A = game.assets;
    for (const f of room.furn) furnitureMesh(game, f.kind);
    if (A.geoms.has(key)) return key;
    const m = new MB(), wall = hex(room.wall), trim = hex(room.trim), acc = hex(room.accent), H = 5, T = 0.7;
    const dark = hex("#2d2036"), top = mix(trim, wall, 0.3);
    const lower = mix(wall, acc, 0.45);

    const seg = (cx, cz, w, d) => {
        m.box(cx, 0, cz, w, H, d, wall, { shade: 0.74, top });
        // Wainscot: a darker lower third, with a rail.
        const ox = d > w ? (cx < 0 ? 0.04 : -0.04) : 0, oz = w > d ? 0.04 : 0;
        m.box(cx + ox, 0, cz + oz, w + (d > w ? 0 : 0), 1.55, d, lower, { shade: 0.8, top: lower });
        m.box(cx + ox * 2, 1.5, cz + oz * 2, w, 0.12, d, trim, { shade: 0.9 });
        m.box(cx + ox * 3, 0, cz + oz * 3, w, 0.34, d, trim, { shade: 0.86 });
    };
    const gap = 1.7;
    const zb = -D - T / 2, xl = -W - T / 2, xr = W + T / 2;
    // Back wall: three sections and lintels over the doors.
    const doorX = [DOORS[0].x, DOORS[1].x];
    const a = doorX[0] - gap, b = doorX[0] + gap, c = doorX[1] - gap, e = doorX[1] + gap;
    seg((-W - T + a) / 2, zb, a + W + T, T); seg((b + c) / 2, zb, c - b, T); seg((e + W + T) / 2, zb, W + T - e, T);
    const zDoor = DOORS[2].z;
    seg(xl, (-D - T + zDoor - gap) / 2, T, zDoor - gap + D + T); seg(xl, (zDoor + gap + D + T) / 2, T, D + T - zDoor - gap);
    seg(xr, (-D - T + zDoor - gap) / 2, T, zDoor - gap + D + T); seg(xr, (zDoor + gap + D + T) / 2, T, D + T - zDoor - gap);
    // Door frames, lintels and dark thresholds.
    for (const x of doorX) {
        m.box(x, 3.5, zb, gap * 2, H - 3.5, T, wall, { shade: 0.86, top });
        m.box(x, 3.4, zb + 0.04, gap * 2, 0.2, T, trim);
        for (const s of [-1, 1]) m.box(x + s * gap, 0, zb + 0.05, 0.22, 3.6, T + 0.06, trim);
        m.box(x, 0, zb - 0.1, gap * 2, 3.5, 0.3, dark, { shade: 1 });
    }
    for (const x of [xl, xr]) {
        m.box(x, 3.5, zDoor, T, H - 3.5, gap * 2, wall, { shade: 0.86, top });
        for (const s of [-1, 1]) m.box(x, 0, zDoor + s * gap, T + 0.06, 3.6, 0.22, trim);
        m.box(x + (x < 0 ? -0.1 : 0.1), 0, zDoor, 0.3, 3.5, gap * 2, dark, { shade: 1 });
    }
    // Front stub, so the camera sees in, as in a doll's house.
    m.box(0, 0, D + T / 2, W * 2 + T * 2, 0.5, T, lower, { top });
    // Window: bright panes, curtains in the accent colour.
    const sky1 = mul(hex("#cdeeff"), 1.5), sky2 = mul(hex("#fff3c4"), 1.6);
    const wy = 2, wh = 2.3, ww = 3.6, wz = -D + 0.03;
    m.box(0, wy - 0.16, wz, ww + 0.5, wh + 0.32, 0.1, trim);
    m.quad([-ww / 2, wy, wz + 0.1], [ww / 2, wy, wz + 0.1], [ww / 2, wy + wh, wz + 0.1], [-ww / 2, wy + wh, wz + 0.1], sky2, sky2, sky1, sky1);
    m.box(0, wy, wz + 0.1, 0.1, wh, 0.05, trim); m.box(0, wy + wh / 2, wz + 0.1, ww, 0.1, 0.05, trim);
    for (const s of [-1, 1]) m.box(s * (ww / 2 + 0.3), wy - 0.5, wz + 0.12, 0.7, wh + 0.8, 0.1, acc, { taper: 1.05, shade: 0.8 });
    m.box(0, wy + wh + 0.28, wz + 0.16, ww + 1.4, 0.1, 0.12, hex("#6d4630"));
    // Pictures, in frames of the room's accent.
    const pic = (x, y, w, h, c1, c2) => {
        m.box(x, y, -D + 0.03, w + 0.2, h + 0.2, 0.06, hex("#6d4630"));
        m.quad([x - w / 2, y + 0.1, -D + 0.1], [x + w / 2, y + 0.1, -D + 0.1], [x + w / 2, y + 0.1 + h, -D + 0.1], [x - w / 2, y + 0.1 + h, -D + 0.1], hex(c1), hex(c1), hex(c2), hex(c2));
    };
    pic(-W + 1.5, 2.6, 1.4, 1, "#f7cf8a", "#7ac0d8");
    pic(W - 1.5, 2.5, 1, 1.3, "#e88a6a", "#ffe6b0");
    // Side-wall windows of light and a shelf, to break up long walls.
    for (const [x, nx] of [[-W + 0.04, 1], [W - 0.04, -1]]) {
        for (const z of [-D * 0.45, D * 0.62]) {
            m.box(x, 2.3, z, 0.1, 1.8, 2.4, trim);
            const P = (y, zz) => [x + nx * 0.07, y, zz];
            if (nx > 0) m.quad(P(2.4, z + 1.05), P(2.4, z - 1.05), P(3.95, z - 1.05), P(3.95, z + 1.05), sky2, sky2, sky1, sky1);
            else m.quad(P(2.4, z - 1.05), P(2.4, z + 1.05), P(3.95, z + 1.05), P(3.95, z - 1.05), sky2, sky2, sky1, sky1);
        }
    }
    // Cords for the living room: lie on the floor.
    for (const h of room.hazards) {
        if (h.kind === "cord") {
            const [ax, az] = h.a, [bx, bz] = h.b, n = 14;
            let px = ax, pz = az;
            for (let i = 1; i <= n; i++) {
                const t = i / n, w = Math.sin(t * Math.PI * 3) * 0.3;
                const l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l, nz = (bx - ax) / l;
                const x = ax + (bx - ax) * t + nx * w, z = az + (bz - az) * t + nz * w;
                const yaw = Math.atan2(z - pz, x - px), len = Math.hypot(x - px, z - pz);
                m.at((x + px) / 2, 0.02, (z + pz) / 2, -yaw).box(0, 0, 0, len + 0.08, 0.12, 0.16, hex("#2b2733"), { top: hex("#4a4458") }).reset();
                px = x; pz = z;
            }
        }
        if (h.kind === "vortex") {
            m.cyl(h.x, 0, h.z, 1, 0.05, 14, hex("#c8d2da"));
            for (let i = -2; i <= 2; i++) m.box(h.x + i * 0.32, 0.05, h.z, 0.1, 0.03, 1.5, hex("#3a4552"), { shade: 1 });
        }
        if (h.kind === "jet") {
            const big = h.tint === "fire", z = (h.z0 + h.z1) / 2;
            if (!big) for (const x of [h.x0 + 0.1, h.x1 - 0.1]) if (Math.abs(x) > W - 1) { m.at(x, 0.7, z).cylX(0, 0, 0, 0.2, 1.4, 8, hex("#c87a4a"), { cap: hex("#6b3a22") }).reset(); m.box(x, 0, z, 0.3, 4, 0.3, hex("#c87a4a"), { shade: 0.8 }); }
        }
        if (h.kind === "wind") {
            m.box(0, 0.02, h.z0 + 0.1, h.x1 - h.x0, 0.12, 0.4, hex("#a79ad0"));
        }
    }
    m.register(A, key);
    return key;
}
