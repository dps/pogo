// Pointy-top hex maths on axial coordinates. Tile corners sit at radius 1.
export const RADIUS = 5;
export const SQ3 = Math.sqrt(3);
export const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];

export const hexDist = (aq, ar, bq, br) => (Math.abs(aq - bq) + Math.abs(aq + ar - bq - br) + Math.abs(ar - br)) / 2;
export const hexX = (q, r) => SQ3 * (q + r / 2);
export const hexZ = (q, r) => 1.5 * r;

/** Corner i of a tile, 0 at 30 degrees and clockwise seen from above (+x towards +z). */
export const cornerX = (i) => Math.cos(Math.PI / 6 + i * Math.PI / 3);
export const cornerZ = (i) => Math.sin(Math.PI / 6 + i * Math.PI / 3);

/** The hex cell nearest a world point. */
export function nearestHex(x, z) {
    const fr = z / 1.5, fq = x / SQ3 - fr / 2, fs = -fq - fr;
    let q = Math.round(fq), r = Math.round(fr), s = Math.round(fs);
    const dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s - fs);
    if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
    return [q, r];
}
