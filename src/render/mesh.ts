// Procedural geometry. Vertices are [px py pz nx ny nz u v r g b]; all primitives are unit-sized and centred.
import { Color, Vec } from "../math";

export const FLOATS_PER_VERTEX = 11;
let nextGeomId = 1;

export interface Geometry {
    id: number;
    vertices: Float32Array;
    indices: Uint32Array;
    /** Bounding size at scale 1. */
    natural: Vec;
}

class Builder {
    v: number[] = [];
    i: number[] = [];
    get count() { return this.v.length / FLOATS_PER_VERTEX; }
    vertex(p: number[], n: number[], u: number, w: number, c: number[] = [1, 1, 1]) { this.v.push(...p, ...n, u, w, ...c); }
    /** A quad facing n. u × v must equal n for counter-clockwise winding. */
    quad(c: number[], n: number[], u: number[], v: number[], col?: number[]) {
        const base = this.count;
        const at = (a: number, b: number) => [c[0] + u[0] * a + v[0] * b, c[1] + u[1] * a + v[1] * b, c[2] + u[2] * a + v[2] * b];
        this.vertex(at(-1, -1), n, 0, 1, col);
        this.vertex(at(1, -1), n, 1, 1, col);
        this.vertex(at(1, 1), n, 1, 0, col);
        this.vertex(at(-1, 1), n, 0, 0, col);
        this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    /** Revolve a top-to-bottom [radius, y] profile around y. */
    lathe(profile: [number, number][], seg: number) {
        const base = this.count, rings = profile.length;
        for (let i = 0; i < rings; i++) {
            const a = profile[Math.max(0, i - 1)], b = profile[Math.min(rings - 1, i + 1)];
            let nr = -(b[1] - a[1]), ny = b[0] - a[0];
            const l = Math.hypot(nr, ny) || 1;
            nr /= l; ny /= l;
            for (let j = 0; j <= seg; j++) {
                const t = (j / seg) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
                this.vertex([profile[i][0] * c, profile[i][1], profile[i][0] * s], [nr * c, ny, nr * s], j / seg, i / (rings - 1));
            }
        }
        const stride = seg + 1;
        for (let i = 0; i < rings - 1; i++) for (let j = 0; j < seg; j++) {
            const a = base + i * stride + j, b = a + 1, d = a + stride, c = d + 1;
            this.i.push(a, b, c, a, c, d);
        }
    }
    cap(r: number, y: number, seg: number, up: boolean) {
        const base = this.count, n = [0, up ? 1 : -1, 0];
        this.vertex([0, y, 0], n, 0.5, 0.5);
        for (let j = 0; j <= seg; j++) {
            const t = (j / seg) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
            this.vertex([r * c, y, r * s], n, 0.5 + c / 2, 0.5 + s / 2);
        }
        for (let j = 1; j <= seg; j++) {
            if (up) this.i.push(base, base + j + 1, base + j);
            else this.i.push(base, base + j, base + j + 1);
        }
    }
    build(natural?: Vec): Geometry {
        const vertices = new Float32Array(this.v);
        let size = natural;
        if (!size) {
            const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
            for (let i = 0; i < vertices.length; i += FLOATS_PER_VERTEX) for (let a = 0; a < 3; a++) {
                min[a] = Math.min(min[a], vertices[i + a]);
                max[a] = Math.max(max[a], vertices[i + a]);
            }
            size = new Vec(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
        }
        return { id: nextGeomId++, vertices, indices: new Uint32Array(this.i), natural: size };
    }
}

const arc = (r: number, y: number, from: number, to: number, steps: number): [number, number][] =>
    Array.from({ length: steps + 1 }, (_, i) => {
        const t = from + ((to - from) * i) / steps;
        return [Math.max(0, r * Math.sin(t)), y + r * Math.cos(t)] as [number, number];
    });

export function primitives(): Record<string, Geometry> {
    const box = new Builder();
    const h = 0.5;
    box.quad([h, 0, 0], [1, 0, 0], [0, 0, -h], [0, h, 0]);
    box.quad([-h, 0, 0], [-1, 0, 0], [0, 0, h], [0, h, 0]);
    box.quad([0, h, 0], [0, 1, 0], [h, 0, 0], [0, 0, -h]);
    box.quad([0, -h, 0], [0, -1, 0], [h, 0, 0], [0, 0, h]);
    box.quad([0, 0, h], [0, 0, 1], [h, 0, 0], [0, h, 0]);
    box.quad([0, 0, -h], [0, 0, -1], [-h, 0, 0], [0, h, 0]);

    const plane = new Builder();
    plane.quad([0, 0, 0], [0, 1, 0], [h, 0, 0], [0, 0, -h]);

    const quad = new Builder();
    quad.quad([0, 0, 0], [0, 0, 1], [h, 0, 0], [0, h, 0]);

    const sphere = new Builder();
    sphere.lathe(arc(0.5, 0, 0, Math.PI, 14), 22);

    const cylinder = new Builder();
    cylinder.lathe([[0.5, 0.5], [0.5, -0.5]], 22);
    cylinder.cap(0.5, 0.5, 22, true);
    cylinder.cap(0.5, -0.5, 22, false);

    const cone = new Builder();
    cone.lathe([[0.0001, 0.5], [0.5, -0.5]], 22);
    cone.cap(0.5, -0.5, 22, false);

    const capsule = new Builder();
    capsule.lathe([...arc(0.5, 0.5, 0, Math.PI / 2, 7), ...arc(0.5, -0.5, Math.PI / 2, Math.PI, 7)], 22);

    const torus = new Builder();
    const ring: [number, number][] = [];
    for (let i = 0; i <= 18; i++) {
        const t = (i / 18) * Math.PI * 2; // top → outside → bottom → inside
        ring.push([0.36 + 0.14 * Math.sin(t), 0.14 * Math.cos(t)]);
    }
    torus.lathe(ring, 28);

    return {
        box: box.build(), plane: plane.build(new Vec(1, 0, 1)), quad: quad.build(new Vec(1, 1, 0)),
        sphere: sphere.build(new Vec(1, 1, 1)), cylinder: cylinder.build(new Vec(1, 1, 1)), cone: cone.build(new Vec(1, 1, 1)),
        capsule: capsule.build(new Vec(1, 2, 1)), torus: torus.build(new Vec(1, 0.28, 1)),
    };
}

/** Build a merged model from voxel colors, emitting only exposed faces. grid[y][z][x]; null is empty. */
export function voxelGeometry(grid: (Color | null)[][][], unit: number): Geometry {
    const b = new Builder();
    const ny = grid.length, nz = grid[0]?.length ?? 0, nx = grid[0]?.[0]?.length ?? 0;
    const at = (x: number, y: number, z: number) => grid[y]?.[z]?.[x] ?? null;
    const h = unit / 2;
    const faces: [number[], number[], number[], number[]][] = [
        [[1, 0, 0], [1, 0, 0], [0, 0, -h], [0, h, 0]],
        [[-1, 0, 0], [-1, 0, 0], [0, 0, h], [0, h, 0]],
        [[0, 1, 0], [0, 1, 0], [h, 0, 0], [0, 0, -h]],
        [[0, -1, 0], [0, -1, 0], [h, 0, 0], [0, 0, h]],
        [[0, 0, 1], [0, 0, 1], [h, 0, 0], [0, h, 0]],
        [[0, 0, -1], [0, 0, -1], [-h, 0, 0], [0, h, 0]],
    ];
    for (let y = 0; y < ny; y++) for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
        const c = at(x, y, z);
        if (!c) continue;
        const px = (x - (nx - 1) / 2) * unit, py = (y - (ny - 1) / 2) * unit, pz = (z - (nz - 1) / 2) * unit;
        for (const [dir, n, u, v] of faces) {
            if (at(x + dir[0], y + dir[1], z + dir[2])) continue;
            b.quad([px + dir[0] * h, py + dir[1] * h, pz + dir[2] * h], n, u, v, [c.r, c.g, c.b]);
        }
    }
    return b.build(new Vec(nx * unit, ny * unit, nz * unit));
}

/** Wrap raw arrays as a custom mesh: positions + indices, with optional normals (flat per-vertex default up) and uvs. */
export function customGeometry(o: { positions: ArrayLike<number>; indices: ArrayLike<number>; normals?: ArrayLike<number>; uvs?: ArrayLike<number>; colors?: ArrayLike<number> }): Geometry {
    const b = new Builder();
    const n = o.positions.length / 3;
    for (let i = 0; i < n; i++) {
        b.vertex([o.positions[i * 3], o.positions[i * 3 + 1], o.positions[i * 3 + 2]],
            o.normals ? [o.normals[i * 3], o.normals[i * 3 + 1], o.normals[i * 3 + 2]] : [0, 1, 0],
            o.uvs?.[i * 2] ?? 0, o.uvs?.[i * 2 + 1] ?? 0,
            o.colors ? [o.colors[i * 3], o.colors[i * 3 + 1], o.colors[i * 3 + 2]] : [1, 1, 1]);
    }
    b.i = Array.from(o.indices);
    return b.build();
}
