// A seeded shepherd. It plays through the same controls a thumb has: a stick and a bark.
// Each flock member has a walking distance to the pen (the level's flow field); the bot gets behind the
// rearmost animal relative to that path and pushes. Used for winnability proofs, tuning and the title screen.
import { ROAM, CARRIED } from "./world.js";

export class Bot {
    constructor(world, o = {}) {
        this.w = world; this.seed = o.seed ?? 1; this.tick = 0; this.path = []; this.target = null; this.mode = "";
        this.rng = (() => { let s = (this.seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; })();
        this.gentle = o.gentle ?? false;
        this.stuck = 0; this.lastSaved = 0; this.pushIdx = -1;
    }
    /** Downhill direction of the flow field at a point, smoothed by looking two tiles ahead. */
    flowDir(x, z) {
        const L = this.w.L, w = L.w, h = L.h, f = L.flow;
        const best = (c, r) => {
            let bc = c, br = r, b = f[c + r * w] ?? 1e6;
            for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
                const nc = c + dx, nr = r + dz;
                if (nc < 0 || nr < 0 || nc >= w || nr >= h) continue;
                if (!L.open(nc, nr) || (dx && dz && (!L.open(c + dx, r) || !L.open(c, r + dz)))) continue;
                if (f[nc + nr * w] < b) { b = f[nc + nr * w]; bc = nc; br = nr; }
            }
            return [bc, br];
        };
        let c = x | 0, r = z | 0;
        for (let i = 0; i < 3; i++) [c, r] = best(c, r);
        const dx = c + 0.5 - x, dz = r + 0.5 - z, l = Math.hypot(dx, dz) || 1;
        return [dx / l, dz / l];
    }
    /** Cheapest route for the dog, swinging wide of sheep so it doesn't push them the wrong way. */
    route(tx, tz, avoid) {
        const W = this.w, L = W.L, w = L.w, h = L.h, d = W.dog, cost = new Float32Array(w * h).fill(1e9), from = new Int32Array(w * h).fill(-1);
        // Standing on a thin fence's tile: start from the tile on our side of it.
        let sc = d.x | 0, sr = d.z | 0;
        if (L.boxes[sc + sr * w]) {
            const fx = d.x - sc, fz = d.z - sr;
            if (fz < 0.4 && sr > 0) sr--; else if (fz > 0.6 && sr < h - 1) sr++; else if (fx < 0.4 && sc > 0) sc--; else if (fx > 0.6 && sc < w - 1) sc++;
        }
        const start = sc + sr * w, goal = Math.min(w - 1, Math.max(0, tx | 0)) + Math.min(h - 1, Math.max(0, tz | 0)) * w;
        const pen = new Float32Array(w * h);
        if (!L.nearWall) {
            L.nearWall = new Uint8Array(w * h);
            for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if (L.boxes[c + a + (r + b) * w] && c + a >= 0 && c + a < w) L.nearWall[c + r * w] = 1;
        }
        if (avoid) for (let i = 0; i < W.n; i++) if (W.st[i] === ROAM) {
            const c = W.px[i] | 0, r = W.pz[i] | 0;
            for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const q = c + a + (r + b) * w; if (c + a >= 0 && c + a < w && r + b >= 0 && r + b < h) pen[q] = Math.max(pen[q], (3 - Math.max(Math.abs(a), Math.abs(b))) * 3); }
        }
        if (W.bull) { const c = W.bull.x | 0, r = W.bull.z | 0; for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) { const q = c + a + (r + b) * w; if (c + a >= 0 && c + a < w && r + b >= 0 && r + b < h && avoid) pen[q] += 6; } }
        cost[start] = 0;
        const open = [start];
        // a binary heap is overkill at these sizes: a simple sorted-ish frontier is fine for 900 tiles
        for (let guard = 0; guard < 6000 && open.length; guard++) {
            let bi = 0;
            for (let i = 1; i < open.length; i++) if (cost[open[i]] < cost[open[bi]]) bi = i;
            const t = open[bi];
            open[bi] = open[open.length - 1]; open.pop();
            if (t === goal) break;
            const c = t % w, r = (t - c) / w;
            for (const [dx, dz, k] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]]) {
                const nc = c + dx, nr = r + dz;
                if (nc < 0 || nr < 0 || nc >= w || nr >= h) continue;
                const q = nc + nr * w;
                if (L.boxes[q]) continue;
                if (dx && dz && (L.boxes[c + dx + r * w] || L.boxes[c + (r + dz) * w])) continue;
                const nd = cost[t] + k + pen[q] + (L.nearWall?.[q] ? 1.5 : 0);
                if (nd < cost[q]) { if (cost[q] > 1e8) open.push(q); cost[q] = nd; from[q] = t; }
            }
        }
        const path = [];
        for (let t = goal; t >= 0 && t !== start; t = from[t]) path.push(t);
        path.reverse();
        return path.map((t) => [t % w + 0.5, (t - t % w) / w + 0.5]);
    }
    think() {
        const W = this.w, d = W.dog, L = W.L, def = W.def;
        this.tick++;
        let bark = false;
        const n = W.n, list = [];
        for (let i = 0; i < n; i++) if (W.st[i] === ROAM) list.push(i);
        if (!list.length && !W.wolves.some((w) => w.st === "carry")) { this.target = null; return { x: 0, z: 0, bark: false }; }
        const flowAt = (i) => L.flow[(W.px[i] | 0) + (W.pz[i] | 0) * L.w] ?? 999;
        let tx = d.x, tz = d.z, avoid = true, stand = 2.3, push = -1;
        const carry = W.wolves.find((w) => w.st === "carry"), hunter = W.wolves.find((w) => w.st === "hunt" && Math.hypot(w.x - d.x, w.z - d.z) < 6.5);
        const nearWolf = W.wolves.find((w) => (w.st === "hunt" || w.st === "carry") && Math.hypot(w.x - d.x, w.z - d.z) < 6.8);
        const bull = W.bull, weakLeft = W.weak.some((w) => w.e.alive);
        if (nearWolf) bark = true;
        if (carry) { tx = carry.x; tz = carry.z; avoid = false; this.mode = "wolf"; }
        else if (bull && weakLeft && def.lure) {
            // Stand with the rickety fence behind us, bait the bull, sidestep at the last moment.
            this.mode = "lure";
            avoid = false;
            [tx, tz] = def.lure;
            const onSpot = Math.hypot(d.x - tx, d.z - tz) < 0.8;
            if (bull.st === "graze" && onSpot && this.tick % 40 === 0) bark = true;
            if (bull.st === "charge" && Math.hypot(bull.x - d.x, bull.z - d.z) < 4.2) { tx = d.x + 5; tz = d.z + 0.1; return this.steer(tx, tz, bark, true); }
        } else {
            const rams = list.filter((i) => W.isRam[i]).sort((a, b) => flowAt(a) - flowAt(b));
            let goal = -1;
            if (rams.length) goal = rams[0];
            else {
                const sheep = list.filter((i) => !W.isRam[i]).sort((a, b) => flowAt(b) - flowAt(a));
                // Commit to one animal for a moment: flip-flopping between two wings of the flock wastes all the time.
                if (this.commit > 0 && W.st[this.pushIdx] === ROAM && !W.isRam[this.pushIdx]) { goal = this.pushIdx; this.commit--; }
                else { goal = sheep[Math.min(sheep.length - 1, Math.floor(sheep.length * 0.1))]; this.pushIdx = goal; this.commit = 70; }
            }
            this.mode = rams.length ? "ram" : "sheep";
            push = goal;
            const [fx, fz] = this.flowDir(W.px[goal], W.pz[goal]);
            stand = rams.length ? 1.9 : 2.9;
            tx = W.px[goal] - fx * stand; tz = W.pz[goal] - fz * stand;
            // A wall behind the sheep: take the nearest open spot.
            if (L.boxes[(Math.max(0, Math.min(L.w - 1, tx | 0))) + (Math.max(0, Math.min(L.h - 1, tz | 0))) * L.w]) { tx = W.px[goal] - fx * 1.2; tz = W.pz[goal] - fz * 1.2; }
            const dist = Math.hypot(d.x - tx, d.z - tz);
            const aligned = ((W.px[goal] - d.x) * fx + (W.pz[goal] - d.z) * fz) > 0.6;
            if (rams.length) { if (dist < 2 && aligned) bark = true; }
            else if (!this.gentle && dist < 2.5 && aligned && list.length > 3 && this.rng() < 0.02) bark = true;
            if (Math.hypot(d.x - W.px[goal], d.z - W.pz[goal]) < 3.2) avoid = false;
        }
        return this.steer(tx, tz, bark, avoid);
    }
    steer(tx, tz, bark, avoid) {
        const W = this.w, d = W.dog;
        // One tap at a time, like a thumb.
        if (bark && this.tick - (this.lastBark ?? -99) >= 32) this.lastBark = this.tick; else bark = false;
        if (this.tick % 12 === 1 || !this.path.length) { this.path = this.route(tx, tz, avoid); this.pi = 0; }
        let wx = tx, wz = tz;
        const path = this.path;
        while (this.pi < path.length - 1 && Math.hypot(path[this.pi][0] - d.x, path[this.pi][1] - d.z) < 0.7) this.pi++;
        if (path.length) { [wx, wz] = path[this.pi]; if (this.pi >= path.length - 1) { wx = tx; wz = tz; } }
        const dx = wx - d.x, dz = wz - d.z, l = Math.hypot(dx, dz);
        if (l < 0.15) return { x: 0, z: 0, bark };
        const k = Math.min(1, l / 0.9);
        return { x: dx / l * k, z: dz / l * k, bark };
    }
}
