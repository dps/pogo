// src/errors.ts
var PogoError = class extends Error {
  constructor(code, message, hint) {
    super(hint ? `[${code}] ${message}
Hint: ${hint}` : `[${code}] ${message}`);
    this.code = code;
    this.hint = hint;
    this.name = "PogoError";
  }
};
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
function suggest(name, known) {
  const list = [...known];
  if (!list.length) return "Nothing with that kind of name is defined yet.";
  const best = list.map((k) => [k, distance(name.toLowerCase(), k.toLowerCase())]).sort((a, b) => a[1] - b[1])[0];
  const prefix = best[1] <= Math.max(2, name.length / 3) ? `Did you mean "${best[0]}"? ` : "";
  return `${prefix}Known: ${list.slice(0, 24).join(", ")}.`;
}

// src/math.ts
var Vec = class _Vec {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  /** Mutate in place. Accepts numbers or any VecLike. */
  set(x, y, z) {
    if (typeof x === "number") {
      this.x = x;
      this.y = y ?? this.y;
      this.z = z ?? this.z;
    } else {
      const v = toVec(x);
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
    }
    return this;
  }
  clone() {
    return new _Vec(this.x, this.y, this.z);
  }
  add(v) {
    const o = toVec(v);
    return new _Vec(this.x + o.x, this.y + o.y, this.z + o.z);
  }
  sub(v) {
    const o = toVec(v);
    return new _Vec(this.x - o.x, this.y - o.y, this.z - o.z);
  }
  mul(s) {
    return new _Vec(this.x * s, this.y * s, this.z * s);
  }
  dot(v) {
    const o = toVec(v);
    return this.x * o.x + this.y * o.y + this.z * o.z;
  }
  cross(v) {
    const o = toVec(v);
    return new _Vec(this.y * o.z - this.z * o.y, this.z * o.x - this.x * o.z, this.x * o.y - this.y * o.x);
  }
  lenSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }
  len() {
    return Math.sqrt(this.lenSq());
  }
  norm() {
    const l = this.len();
    return l > 1e-9 ? this.mul(1 / l) : new _Vec();
  }
  dist(v) {
    return this.sub(v).len();
  }
  lerp(v, t) {
    const o = toVec(v);
    return new _Vec(this.x + (o.x - this.x) * t, this.y + (o.y - this.y) * t, this.z + (o.z - this.z) * t);
  }
  /** 2D rotation around z, radians. */
  rotate(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return new _Vec(this.x * c - this.y * s, this.x * s + this.y * c, this.z);
  }
  /** 2D angle in radians. */
  angle() {
    return Math.atan2(this.y, this.x);
  }
  eq(v, eps = 1e-6) {
    return this.sub(v).len() <= eps;
  }
  isFinite() {
    return Number.isFinite(this.x) && Number.isFinite(this.y) && Number.isFinite(this.z);
  }
  toArray() {
    return [this.x, this.y, this.z];
  }
  toString() {
    return `(${this.x}, ${this.y}, ${this.z})`;
  }
  static fromAngle(a, len = 1) {
    return new _Vec(Math.cos(a) * len, Math.sin(a) * len);
  }
};
function toVec(v) {
  if (v instanceof Vec) return v;
  if (Array.isArray(v)) return new Vec(v[0], v[1], v[2] ?? 0);
  const o = v;
  return new Vec(o.x, o.y, o.z ?? 0);
}
function vec(x = 0, y, z) {
  if (typeof x === "number") return new Vec(x, y ?? x, z ?? 0);
  return toVec(x).clone();
}
var clamp = (v, min, max) => Math.min(max, Math.max(min, v));
var lerp = (a, b, t) => a + (b - a) * t;
var deg = (d) => d * Math.PI / 180;
var damp = (rate, dt) => 1 - Math.exp(-rate * dt);
var mat4 = () => {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
};
function mat4Mul(out, a, b) {
  const r = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let w = 0; w < 4; w++) {
      r[c * 4 + w] = a[w] * b[c * 4] + a[w + 4] * b[c * 4 + 1] + a[w + 8] * b[c * 4 + 2] + a[w + 12] * b[c * 4 + 3];
    }
  }
  out.set(r);
  return out;
}
function mat4Compose(out, p, r, s) {
  const a = Math.cos(r.x), b = Math.sin(r.x), c = Math.cos(r.y), d = Math.sin(r.y), e = Math.cos(r.z), f = Math.sin(r.z);
  const ce = c * e, cf = c * f, de = d * e, df = d * f;
  out[0] = (ce + df * b) * s.x;
  out[1] = a * f * s.x;
  out[2] = (cf * b - de) * s.x;
  out[3] = 0;
  out[4] = (de * b - cf) * s.y;
  out[5] = a * e * s.y;
  out[6] = (df + ce * b) * s.y;
  out[7] = 0;
  out[8] = a * d * s.z;
  out[9] = -b * s.z;
  out[10] = a * c * s.z;
  out[11] = 0;
  out[12] = p.x;
  out[13] = p.y;
  out[14] = p.z;
  out[15] = 1;
  return out;
}
function mat4Perspective(out, fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}
function mat4Ortho(out, l, r, b, t, n, f) {
  out.fill(0);
  out[0] = 2 / (r - l);
  out[5] = 2 / (t - b);
  out[10] = -2 / (f - n);
  out[12] = -(r + l) / (r - l);
  out[13] = -(t + b) / (t - b);
  out[14] = -(f + n) / (f - n);
  out[15] = 1;
  return out;
}
function mat4LookAt(out, eye, target, up) {
  let z = eye.sub(target).norm();
  if (z.lenSq() === 0) z = new Vec(0, 0, 1);
  let x = up.cross(z).norm();
  if (x.lenSq() === 0) x = new Vec(0, 0, 1).cross(z).norm();
  const y = z.cross(x);
  out[0] = x.x;
  out[1] = y.x;
  out[2] = z.x;
  out[3] = 0;
  out[4] = x.y;
  out[5] = y.y;
  out[6] = z.y;
  out[7] = 0;
  out[8] = x.z;
  out[9] = y.z;
  out[10] = z.z;
  out[11] = 0;
  out[12] = -x.dot(eye);
  out[13] = -y.dot(eye);
  out[14] = -z.dot(eye);
  out[15] = 1;
  return out;
}
function mat4Invert(out, m) {
  const a = m, b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6], b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null;
  det = 1 / det;
  const r = new Float32Array(16);
  r[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det;
  r[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det;
  r[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det;
  r[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det;
  r[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det;
  r[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det;
  r[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det;
  r[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
  r[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det;
  r[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det;
  r[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det;
  r[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det;
  r[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det;
  r[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det;
  r[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det;
  r[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
  out.set(r);
  return out;
}
function mat4Point(m, v) {
  const w = m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15] || 1;
  return new Vec(
    (m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12]) / w,
    (m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13]) / w,
    (m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14]) / w
  );
}
var NAMED = {
  white: "#ffffff",
  black: "#000000",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#facc15",
  green: "#22c55e",
  cyan: "#22d3ee",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899",
  brown: "#92400e",
  gray: "#6b7280",
  grey: "#6b7280",
  sky: "#7dd3fc",
  transparent: "#00000000"
};
var Color = class _Color {
  constructor(r = 1, g = 1, b = 1, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
  clone() {
    return new _Color(this.r, this.g, this.b, this.a);
  }
  alpha(a) {
    return new _Color(this.r, this.g, this.b, a);
  }
  lerp(o, t) {
    const c = color(o);
    return new _Color(lerp(this.r, c.r, t), lerp(this.g, c.g, t), lerp(this.b, c.b, t), lerp(this.a, c.a, t));
  }
  toHex() {
    const h = (n) => Math.round(clamp(n, 0, 1) * 255).toString(16).padStart(2, "0");
    return `#${h(this.r)}${h(this.g)}${h(this.b)}${this.a < 1 ? h(this.a) : ""}`;
  }
};
function color(c) {
  if (c instanceof Color) return c;
  if (Array.isArray(c)) return new Color(c[0], c[1], c[2], c[3] ?? 1);
  let s = String(c).trim().toLowerCase();
  s = NAMED[s] ?? s;
  const m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m && [3, 4, 6, 8].includes(m[1].length)) {
    let h = m[1];
    if (h.length < 6) h = [...h].map((x) => x + x).join("");
    const p = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    return new Color(p(0), p(2), p(4), h.length === 8 ? p(6) : 1);
  }
  throw new PogoError(
    "BAD_COLOR",
    `Cannot parse color ${JSON.stringify(c)}.`,
    `Use "#rgb", "#rrggbb", [r,g,b] in 0–1, or one of: ${Object.keys(NAMED).join(", ")}.`
  );
}
var Rng = class {
  s;
  constructor(seed = 1) {
    this.s = seed >>> 0;
  }
  /** Float in [0, 1). */
  next() {
    this.s = this.s + 1831565813 >>> 0;
    let t = this.s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  /** Float in [a, b). range(b) means [0, b). */
  range(a, b) {
    return b === void 0 ? this.next() * a : a + this.next() * (b - a);
  }
  /** Integer in [a, b], inclusive. */
  int(a, b) {
    return Math.floor(a + this.next() * (b - a + 1));
  }
  chance(p) {
    return this.next() < p;
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
};
var easings = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  outCubic: (t) => 1 - (1 - t) ** 3,
  outBack: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  outBounce: (t) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  }
};

// src/render/mesh.ts
var FLOATS_PER_VERTEX = 11;
var nextGeomId = 1;
var Builder = class {
  v = [];
  i = [];
  get count() {
    return this.v.length / FLOATS_PER_VERTEX;
  }
  vertex(p, n, u, w, c = [1, 1, 1]) {
    this.v.push(...p, ...n, u, w, ...c);
  }
  /** A quad facing n. u × v must equal n for counter-clockwise winding. */
  quad(c, n, u, v, col) {
    const base = this.count;
    const at = (a, b) => [c[0] + u[0] * a + v[0] * b, c[1] + u[1] * a + v[1] * b, c[2] + u[2] * a + v[2] * b];
    this.vertex(at(-1, -1), n, 0, 1, col);
    this.vertex(at(1, -1), n, 1, 1, col);
    this.vertex(at(1, 1), n, 1, 0, col);
    this.vertex(at(-1, 1), n, 0, 0, col);
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  /** Revolve a top-to-bottom [radius, y] profile around y. */
  lathe(profile, seg) {
    const base = this.count, rings = profile.length;
    for (let i = 0; i < rings; i++) {
      const a = profile[Math.max(0, i - 1)], b = profile[Math.min(rings - 1, i + 1)];
      let nr = -(b[1] - a[1]), ny = b[0] - a[0];
      const l = Math.hypot(nr, ny) || 1;
      nr /= l;
      ny /= l;
      for (let j = 0; j <= seg; j++) {
        const t = j / seg * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
        this.vertex([profile[i][0] * c, profile[i][1], profile[i][0] * s], [nr * c, ny, nr * s], j / seg, i / (rings - 1));
      }
    }
    const stride = seg + 1;
    for (let i = 0; i < rings - 1; i++) for (let j = 0; j < seg; j++) {
      const a = base + i * stride + j, b = a + 1, d = a + stride, c = d + 1;
      this.i.push(a, b, c, a, c, d);
    }
  }
  cap(r, y, seg, up) {
    const base = this.count, n = [0, up ? 1 : -1, 0];
    this.vertex([0, y, 0], n, 0.5, 0.5);
    for (let j = 0; j <= seg; j++) {
      const t = j / seg * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      this.vertex([r * c, y, r * s], n, 0.5 + c / 2, 0.5 + s / 2);
    }
    for (let j = 1; j <= seg; j++) {
      if (up) this.i.push(base, base + j + 1, base + j);
      else this.i.push(base, base + j, base + j + 1);
    }
  }
  build(natural) {
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
};
var arc = (r, y, from, to, steps) => Array.from({ length: steps + 1 }, (_, i) => {
  const t = from + (to - from) * i / steps;
  return [Math.max(0, r * Math.sin(t)), y + r * Math.cos(t)];
});
function primitives() {
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
  cone.lathe([[1e-4, 0.5], [0.5, -0.5]], 22);
  cone.cap(0.5, -0.5, 22, false);
  const capsule = new Builder();
  capsule.lathe([...arc(0.5, 0.5, 0, Math.PI / 2, 7), ...arc(0.5, -0.5, Math.PI / 2, Math.PI, 7)], 22);
  const torus = new Builder();
  const ring = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18 * Math.PI * 2;
    ring.push([0.36 + 0.14 * Math.sin(t), 0.14 * Math.cos(t)]);
  }
  torus.lathe(ring, 28);
  return {
    box: box.build(),
    plane: plane.build(new Vec(1, 0, 1)),
    quad: quad.build(new Vec(1, 1, 0)),
    sphere: sphere.build(new Vec(1, 1, 1)),
    cylinder: cylinder.build(new Vec(1, 1, 1)),
    cone: cone.build(new Vec(1, 1, 1)),
    capsule: capsule.build(new Vec(1, 2, 1)),
    torus: torus.build(new Vec(1, 0.28, 1))
  };
}
function voxelGeometry(grid, unit) {
  const b = new Builder();
  const ny = grid.length, nz = grid[0]?.length ?? 0, nx = grid[0]?.[0]?.length ?? 0;
  const at = (x, y, z) => grid[y]?.[z]?.[x] ?? null;
  const h = unit / 2;
  const faces = [
    [[1, 0, 0], [1, 0, 0], [0, 0, -h], [0, h, 0]],
    [[-1, 0, 0], [-1, 0, 0], [0, 0, h], [0, h, 0]],
    [[0, 1, 0], [0, 1, 0], [h, 0, 0], [0, 0, -h]],
    [[0, -1, 0], [0, -1, 0], [h, 0, 0], [0, 0, h]],
    [[0, 0, 1], [0, 0, 1], [h, 0, 0], [0, h, 0]],
    [[0, 0, -1], [0, 0, -1], [-h, 0, 0], [0, h, 0]]
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
function customGeometry(o) {
  const b = new Builder();
  const n = o.positions.length / 3;
  for (let i = 0; i < n; i++) {
    b.vertex(
      [o.positions[i * 3], o.positions[i * 3 + 1], o.positions[i * 3 + 2]],
      o.normals ? [o.normals[i * 3], o.normals[i * 3 + 1], o.normals[i * 3 + 2]] : [0, 1, 0],
      o.uvs?.[i * 2] ?? 0,
      o.uvs?.[i * 2 + 1] ?? 0,
      o.colors ? [o.colors[i * 3], o.colors[i * 3 + 1], o.colors[i * 3 + 2]] : [1, 1, 1]
    );
  }
  b.i = Array.from(o.indices);
  return b.build();
}

// src/assets.ts
var PALETTE = {
  k: "#1f2430",
  w: "#f8fafc",
  s: "#94a3b8",
  d: "#475569",
  r: "#ef4444",
  m: "#991b1b",
  o: "#f97316",
  y: "#facc15",
  g: "#22c55e",
  e: "#166534",
  c: "#22d3ee",
  b: "#3b82f6",
  n: "#1e3a8a",
  p: "#a855f7",
  i: "#ec4899",
  t: "#fcd9b6",
  h: "#92400e",
  u: "#7c4a21"
};
var Pixmap = class {
  constructor(width, height, atlas, stride, frameOffset) {
    this.width = width;
    this.height = height;
    this.atlas = atlas;
    this.stride = stride;
    this.data = atlas;
    this.x0 = frameOffset;
  }
  data;
  x0 = 0;
  index(x, y) {
    return (y * this.stride + this.x0 + x) * 4;
  }
  /** Blend one pixel over what's there. coverage is 0–1. */
  set(x, y, c, coverage = 1) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return this;
    const col = color(c), a = col.a * coverage, o = this.index(x, y), d = this.data, da = d[o + 3] / 255, out = a + da * (1 - a);
    if (out <= 0) return this;
    d[o] = (col.r * 255 * a + d[o] * da * (1 - a)) / out;
    d[o + 1] = (col.g * 255 * a + d[o + 1] * da * (1 - a)) / out;
    d[o + 2] = (col.b * 255 * a + d[o + 2] * da * (1 - a)) / out;
    d[o + 3] = out * 255;
    return this;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return [0, 0, 0, 0];
    const o = this.index(x, y);
    return [this.data[o], this.data[o + 1], this.data[o + 2], this.data[o + 3]];
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }
  /** Vertical gradient, top to bottom. */
  gradient(x, y, w, h, top, bottom) {
    const a = color(top);
    for (let j = 0; j < h; j++) {
      const c = a.lerp(bottom, h > 1 ? j / (h - 1) : 0);
      for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    }
    return this;
  }
  /** Filled, anti-aliased ellipse. An optional bottom color gives it a gradient. */
  ellipse(cx, cy, rx, ry, c, bottom) {
    const col = color(c);
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = Math.hypot(dx, dy);
      const cover = Math.max(0, Math.min(1, (1 - d) * Math.min(rx, ry) + 0.5));
      if (cover > 0) this.set(x, y, bottom ? col.lerp(bottom, Math.max(0, Math.min(1, dy * 0.5 + 0.5))) : col, cover);
    }
    return this;
  }
  circle(cx, cy, r, c, bottom) {
    return this.ellipse(cx, cy, r, r, c, bottom);
  }
  /** Anti-aliased line with round ends. */
  line(x0, y0, x1, y1, c, width = 1) {
    const r = width / 2, dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1;
    for (let y = Math.floor(Math.min(y0, y1) - r - 1); y <= Math.max(y0, y1) + r + 1; y++) for (let x = Math.floor(Math.min(x0, x1) - r - 1); x <= Math.max(x0, x1) + r + 1; x++) {
      const t = Math.max(0, Math.min(1, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / len2));
      const d = Math.hypot(x + 0.5 - (x0 + t * dx), y + 0.5 - (y0 + t * dy)), cover = Math.max(0, Math.min(1, r - d + 0.5));
      if (cover > 0) this.set(x, y, c, cover);
    }
    return this;
  }
  /** Filled polygon from [x, y] points. */
  poly(points, c) {
    const ys = points.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) {
      const hits = [];
      points.forEach((p, i) => {
        const q = points[(i + 1) % points.length], yy = y + 0.5;
        if (p[1] <= yy && q[1] > yy || q[1] <= yy && p[1] > yy) hits.push(p[0] + (yy - p[1]) / (q[1] - p[1]) * (q[0] - p[0]));
      });
      hits.sort((a, b) => a - b);
      for (let i = 0; i + 1 < hits.length; i += 2) for (let x = Math.round(hits[i]); x < Math.round(hits[i + 1]); x++) this.set(x, y, c);
    }
    return this;
  }
  /** Copy the left half onto the right: paint half a character, get a symmetric one. */
  mirror() {
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width >> 1; x++) {
      const a = this.index(x, y), b = this.index(this.width - 1 - x, y);
      for (let i = 0; i < 4; i++) this.data[b + i] = this.data[a + i];
    }
    return this;
  }
  edit(fn) {
    const snapshot2 = this.data.slice(), solid2 = (x, y) => x >= 0 && y >= 0 && x < this.width && y < this.height && snapshot2[this.index(x, y) + 3] > 40;
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) fn(x, y, solid2);
  }
  /** A 1px outline around everything painted so far. The biggest single upgrade to sprite readability. */
  outline(c = "#1f2430") {
    const col = color(c), before = this.data.slice(), alpha = (x, y) => x < 0 || y < 0 || x >= this.width || y >= this.height ? 0 : before[this.index(x, y) + 3] / 255;
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
      const a0 = alpha(x, y), cover = Math.max(alpha(x - 1, y), alpha(x + 1, y), alpha(x, y - 1), alpha(x, y + 1)) * col.a;
      if (a0 >= 1 || cover <= 0) continue;
      const o = this.index(x, y), out = a0 + cover * (1 - a0), d = this.data, under = cover * (1 - a0);
      d[o] = (d[o] * a0 + col.r * 255 * under) / out;
      d[o + 1] = (d[o + 1] * a0 + col.g * 255 * under) / out;
      d[o + 2] = (d[o + 2] * a0 + col.b * 255 * under) / out;
      d[o + 3] = out * 255;
    }
    return this;
  }
  /** Rim light from the top-left and shadow on the bottom-right, for instant volume. */
  shade(light = 0.3, dark = 0.3) {
    this.edit((x, y, solid2) => {
      if (!solid2(x, y)) return;
      if (!solid2(x - 1, y) || !solid2(x, y - 1)) this.set(x, y, [1, 1, 1, light]);
      else if (!solid2(x + 1, y) || !solid2(x, y + 1)) this.set(x, y, [0, 0, 0, dark]);
    });
    return this;
  }
  /** Speckle painted pixels for texture, deterministically. */
  speckle(amount = 0.08, seed = 1) {
    let s = seed >>> 0;
    const next = () => {
      s = Math.imul(s, 1664525) + 1013904223 >>> 0;
      return s / 4294967296;
    };
    this.edit((x, y, solid2) => {
      if (solid2(x, y)) {
        const n = next();
        this.set(x, y, n > 0.5 ? [1, 1, 1, amount] : [0, 0, 0, amount]);
      }
    });
    return this;
  }
};
function rows(input) {
  return (typeof input === "string" ? input.split("\n") : input).map((r) => r.trim()).filter((r) => r.length);
}
var Assets = class {
  constructor(game) {
    this.game = game;
  }
  sprites = /* @__PURE__ */ new Map();
  geoms = new Map(Object.entries(primitives()));
  pending = [];
  /** Promise for everything queued so far. game.start() waits for it. */
  ready() {
    return Promise.all(this.pending);
  }
  lookup(palette, ch, where) {
    if (ch === "." || ch === " ") return null;
    const value = palette?.[ch] ?? PALETTE[ch];
    if (value === void 0) throw new PogoError("BAD_PALETTE", `${where} uses "${ch}", which is not in the palette.`, `Add it to the palette argument, or use a default: ${Object.keys(PALETTE).join("")}.`);
    return color(value);
  }
  /**
   * Define a sprite from text. Pass one block of rows, or an array of blocks for animation frames.
   * assets.pixels("hero", `
   *   .rr.
   *   rkkr
   * `);
   */
  pixels(name, frames, palette) {
    const list = typeof frames === "string" || typeof frames[0] === "string" && !isFrameList(frames) ? [rows(frames)] : frames.map(rows);
    const h = list[0].length, w = list[0][0]?.length ?? 0;
    if (!h || !w) throw new PogoError("BAD_PIXELS", `Sprite "${name}" is empty.`);
    const data = new Uint8Array(w * list.length * h * 4);
    list.forEach((frame, f) => {
      if (frame.length !== h) throw new PogoError("BAD_PIXELS", `Sprite "${name}" frame ${f} has ${frame.length} rows, expected ${h}.`, "All frames must be the same size.");
      frame.forEach((row, y) => {
        if (row.length !== w) throw new PogoError("BAD_PIXELS", `Sprite "${name}" frame ${f} row ${y} is ${row.length} wide, expected ${w}: "${row}"`, "All rows must be the same width.");
        for (let x = 0; x < w; x++) {
          const c = this.lookup(palette, row[x], `Sprite "${name}"`);
          if (!c) continue;
          const o = (y * w * list.length + f * w + x) * 4;
          data[o] = c.r * 255;
          data[o + 1] = c.g * 255;
          data[o + 2] = c.b * 255;
          data[o + 3] = c.a * 255;
        }
      });
    });
    this.sprites.set(name, { name, width: w * list.length, height: h, cols: list.length, rows: 1, frameW: w, frameH: h, data, loaded: true, pixelated: true });
    return this;
  }
  /**
   * Paint a sprite with code. The callback gets a Pixmap, and the frame index for animation.
   * Set smooth to get filtered, anti-aliased art; paint at 2–4x display size for crisp edges on phones.
   * assets.paint("orb", 64, 64, (p) => p.circle(32, 32, 28, "#7dd3fc", "#1d4ed8").outline().shade(), { smooth: true });
   */
  paint(name, width, height, fn, o = {}) {
    const frames = o.frames ?? 1, data = new Uint8Array(width * frames * height * 4);
    for (let f = 0; f < frames; f++) fn(new Pixmap(width, height, data, width * frames, f * width), f);
    this.sprites.set(name, { name, width: width * frames, height, cols: frames, rows: 1, frameW: width, frameH: height, data, loaded: true, pixelated: !o.smooth, mipmaps: o.mipmaps ?? (!!o.smooth && frames === 1) });
    return this;
  }
  /** Load an image file. Pass { cols, rows } for a sprite sheet. */
  image(name, url, o = {}) {
    const cols = o.cols ?? 1, rowCount = o.rows ?? 1;
    const a = { name, width: o.width ?? 32 * cols, height: o.height ?? 32 * rowCount, cols, rows: rowCount, frameW: 0, frameH: 0, loaded: false, pixelated: false };
    a.frameW = a.width / cols;
    a.frameH = a.height / rowCount;
    this.sprites.set(name, a);
    if (this.game.headless) {
      a.data = new Uint8Array(a.width * a.height * 4);
      a.loaded = true;
      return this;
    }
    this.pending.push(new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        a.image = img;
        a.width = img.naturalWidth;
        a.height = img.naturalHeight;
        a.frameW = a.width / cols;
        a.frameH = a.height / rowCount;
        a.loaded = true;
        resolve();
      };
      img.onerror = () => reject(new PogoError("ASSET_LOAD", `Image "${name}" failed to load from ${url}.`, "Check the path relative to the HTML page. For art without files, use assets.pixels()."));
      img.src = url;
    }));
    return this;
  }
  /** Load a sound file for game.sfx(name). */
  sound(name, url) {
    if (!this.game.headless) this.pending.push(this.game.audio.load(name, url));
    else this.game.audio.register(name);
    return this;
  }
  /**
   * Define a 3D model from text. Layers go bottom to top; rows go back to front; characters go left to right.
   * `unit` is the size of one voxel in world units (default 0.1).
   */
  voxels(name, layers, palette, o = {}) {
    const parsed = layers.map(rows);
    const nz = parsed[0]?.length ?? 0, nx = parsed[0]?.[0]?.length ?? 0;
    if (!nz || !nx) throw new PogoError("BAD_VOXELS", `Voxel model "${name}" is empty.`);
    const grid = parsed.map((layer2, y) => {
      if (layer2.length !== nz) throw new PogoError("BAD_VOXELS", `Voxel model "${name}" layer ${y} has ${layer2.length} rows, expected ${nz}.`);
      return layer2.map((row, z) => {
        if (row.length !== nx) throw new PogoError("BAD_VOXELS", `Voxel model "${name}" layer ${y} row ${z} is ${row.length} wide, expected ${nx}.`);
        return [...row].map((ch) => this.lookup(palette, ch, `Voxel model "${name}"`));
      });
    });
    this.geoms.set(name, voxelGeometry(grid, o.unit ?? 0.1));
    return this;
  }
  /** Register a custom mesh from raw arrays. */
  mesh(name, data) {
    this.geoms.set(name, customGeometry(data));
    return this;
  }
  sprite(name) {
    const a = this.sprites.get(name);
    if (!a) throw new PogoError("UNKNOWN_SPRITE", `No sprite named "${name}".`, `${suggest(name, this.sprites.keys())} Define sprites with game.assets.pixels() or .image() before game.start().`);
    return a;
  }
  geometry(name) {
    const g = this.geoms.get(name);
    if (!g) throw new PogoError("UNKNOWN_MESH", `No mesh named "${name}".`, `${suggest(name, this.geoms.keys())} Define models with game.assets.voxels().`);
    return g;
  }
};
function isFrameList(frames) {
  return Array.isArray(frames) && typeof frames[0] === "string" && frames[0].includes("\n");
}

// src/audio.ts
var SFX = {
  click: { wave: "square", freq: 660, to: 520, decay: 0.05, volume: 0.25 },
  jump: { wave: "square", freq: 280, to: 620, decay: 0.16, volume: 0.28 },
  land: { wave: "triangle", freq: 170, to: 80, decay: 0.08, volume: 0.35 },
  coin: [{ wave: "square", freq: 880, decay: 0.08, volume: 0.25 }, { wave: "square", freq: 1320, decay: 0.2, volume: 0.25, at: 0.07 }],
  shoot: { wave: "sawtooth", freq: 820, to: 160, decay: 0.14, volume: 0.2 },
  hit: { wave: "noise", freq: 900, to: 200, decay: 0.16, volume: 0.45 },
  explode: { wave: "noise", freq: 500, to: 50, decay: 0.5, volume: 0.6 },
  powerup: [{ wave: "triangle", freq: 440, decay: 0.1 }, { wave: "triangle", freq: 660, decay: 0.1, at: 0.09 }, { wave: "triangle", freq: 880, decay: 0.24, at: 0.18 }],
  lose: [{ wave: "sawtooth", freq: 330, to: 300, decay: 0.2, volume: 0.25 }, { wave: "sawtooth", freq: 262, to: 110, decay: 0.5, volume: 0.25, at: 0.2 }],
  win: [{ wave: "square", freq: 523, decay: 0.12, volume: 0.2 }, { wave: "square", freq: 659, decay: 0.12, volume: 0.2, at: 0.12 }, { wave: "square", freq: 784, decay: 0.12, volume: 0.2, at: 0.24 }, { wave: "square", freq: 1047, decay: 0.4, volume: 0.2, at: 0.36 }]
};
var NOTE = /^([A-G])([#b]?)(\d)$/;
var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteFreq(n) {
  const m = NOTE.exec(n);
  if (!m) throw new PogoError("BAD_NOTE", `Cannot parse note "${n}".`, `Notes look like C4, F#3 or Bb2; "-" is a rest.`);
  const semi = SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (Number(m[3]) + 1) * 12;
  return 440 * 2 ** ((semi - 69) / 12);
}
var Audio = class {
  constructor(game) {
    this.game = game;
  }
  /** Recent sounds, newest last; visible in game.state(). */
  log = [];
  muted = false;
  volume = 1;
  ctx = null;
  master = null;
  noise = null;
  buffers = /* @__PURE__ */ new Map();
  music = null;
  unlocked = false;
  ensure() {
    if (this.ctx || this.game.headless) return this.ctx;
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    const n = Math.floor(this.ctx.sampleRate * 0.5);
    this.noise = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return this.ctx;
  }
  /** Browsers only allow audio after a user gesture; the DOM layer calls this on the first one. */
  unlock() {
    if (this.unlocked && this.ctx?.state === "running") return;
    this.unlocked = true;
    this.ensure()?.resume();
  }
  suspend() {
    this.ctx?.suspend();
  }
  resume() {
    if (this.unlocked) this.ctx?.resume();
  }
  register(name) {
    this.buffers.set(name, null);
  }
  async load(name, url) {
    const res = await fetch(url);
    if (!res.ok) throw new PogoError("ASSET_LOAD", `Sound "${name}" failed to load from ${url} (${res.status}).`);
    const data = await res.arrayBuffer();
    const ctx = this.ensure();
    this.buffers.set(name, ctx ? await ctx.decodeAudioData(data) : null);
  }
  /** Play a preset, a loaded sound, or a custom tone. */
  play(sound) {
    const name = typeof sound === "string" ? sound : "custom";
    if (typeof sound === "string" && !(sound in SFX) && !this.buffers.has(sound)) {
      throw new PogoError("UNKNOWN_SOUND", `No sound named "${sound}".`, suggest(sound, [...Object.keys(SFX), ...this.buffers.keys()]));
    }
    this.log.push(name);
    if (this.log.length > 32) this.log.shift();
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted || ctx.state !== "running") return;
    this.master.gain.value = this.volume;
    if (typeof sound === "string" && this.buffers.get(sound)) {
      const src = ctx.createBufferSource();
      src.buffer = this.buffers.get(sound);
      src.connect(this.master);
      src.start();
      return;
    }
    const def = typeof sound === "string" ? SFX[sound] : sound;
    for (const t of Array.isArray(def) ? def : [def]) this.tone(t, ctx.currentTime + (t.at ?? 0), this.master);
  }
  tone(t, start, out) {
    const ctx = this.ctx, gain = ctx.createGain(), attack = t.attack ?? 5e-3, decay = t.decay ?? 0.15, peak = t.volume ?? 0.3, end = start + attack + decay;
    gain.gain.setValueAtTime(1e-4, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(1e-4, end);
    gain.connect(out);
    const freq = t.freq ?? 440;
    if (t.wave === "noise") {
      const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
      src.buffer = this.noise;
      src.loop = true;
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(freq, start);
      if (t.to) filter.frequency.exponentialRampToValueAtTime(Math.max(20, t.to), end);
      src.connect(filter).connect(gain);
      src.start(start);
      src.stop(end + 0.02);
    } else {
      const osc = ctx.createOscillator();
      osc.type = t.wave ?? "square";
      osc.frequency.setValueAtTime(freq, start);
      if (t.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, t.to), end);
      osc.connect(gain);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  }
  /** Loop a song written as note strings: { bpm: 120, tracks: [{ notes: "C4 E4 G4 - C5 - G4 -" }] }. */
  playMusic(song) {
    this.stopMusic();
    const parsed = song.tracks.map((t) => ({ ...t, seq: t.notes.trim().split(/\s+/).map((n) => n === "-" ? 0 : noteFreq(n)) }));
    this.log.push("music");
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    gain.connect(this.master);
    const stepDur = 60 / (song.bpm ?? 120) / (song.steps ?? 2), length = Math.max(...parsed.map((t) => t.seq.length));
    let step = 0, next = ctx.currentTime + 0.05;
    const timer = setInterval(() => {
      if (ctx.state !== "running" || this.muted) {
        next = ctx.currentTime + 0.05;
        return;
      }
      while (next < ctx.currentTime + 0.2) {
        if (step >= length && song.loop === false) {
          this.stopMusic();
          return;
        }
        for (const t of parsed) {
          const f = t.seq[step % t.seq.length];
          if (f) this.tone({ wave: t.wave ?? "triangle", freq: f, decay: stepDur * 1.4, volume: t.volume ?? 0.2 }, next, gain);
        }
        step++;
        next += stepDur;
      }
    }, 60);
    this.music = { timer, gain };
  }
  stopMusic() {
    if (!this.music) return;
    clearInterval(this.music.timer);
    this.music.gain.disconnect();
    this.music = null;
  }
};

// src/agent.ts
var round = (n) => Math.round(n * 100) / 100;
function describe(e) {
  const out = { id: e.id, label: e.label, pos: [round(e.pos.x), round(e.pos.y), round(e.pos.z)], size: [round(e.size.x), round(e.size.y), round(e.size.z)], dim: e.dim };
  if (e.tags.size) out.tags = [...e.tags];
  if (e.ui) out.ui = true;
  if (e.hidden) out.hidden = true;
  if (e.vel) out.vel = [round(e.vel.x), round(e.vel.y), round(e.vel.z)];
  if (e.body) out.grounded = e.grounded;
  if (typeof e.text === "string") out.text = e.text;
  if (e.hp !== void 0) out.hp = e.hp;
  return out;
}
function snapshot(g) {
  const s = g.current;
  return {
    scene: g.currentName,
    step: g.stepCount,
    time: round(g.stepCount * g.dt),
    view: { width: round(g.view.width), height: round(g.view.height), scale: round(g.view.scale), orientation: g.view.orientation, safe: g.view.safe },
    touchMode: g.input.touchMode,
    paused: s?.paused ?? false,
    data: g.data,
    sounds: g.audio.log.slice(-8),
    errors: g.errors.map((e) => e.message),
    entityCount: s?.entities.length ?? 0,
    entities: s?.entities.filter((e) => e.alive).slice(0, 200).map(describe) ?? []
  };
}
function screenRect(e) {
  const s = e.scene;
  if (e.dim === 3) {
    const p = s.cam3.project(e.worldPos());
    if (!p.visible) return null;
    const q = s.cam3.project(e.worldPos().add([0, e.size.y * e.scale.y, 0]));
    const r = Math.max(2, Math.abs(q.y - p.y) / 2);
    return { x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r };
  }
  const c = e.ui ? e.worldPos() : s.cam.toView(e.worldPos()), z = e.ui ? 1 : s.cam.zoom;
  const hw = Math.abs(e.size.x * e.scale.x) * z / 2, hh = Math.abs(e.size.y * e.scale.y) * z / 2;
  return { x0: c.x - hw, y0: c.y - hh, x1: c.x + hw, y1: c.y + hh };
}
function ascii(g, o = {}) {
  const s = g.current, v = g.view;
  if (!s) return "(no scene)";
  const cols = o.cols ?? 48, rows2 = Math.max(4, Math.round(v.height / v.width * cols / 2));
  const grid = Array.from({ length: rows2 }, () => Array(cols).fill(" "));
  const legend = /* @__PURE__ */ new Map();
  const used = /* @__PURE__ */ new Set();
  const glyph = (label) => {
    let c = legend.get(label);
    if (c) return c;
    const clean = label.replace(/[^a-z0-9]/gi, "");
    c = [...clean, ...clean.toUpperCase(), ..."*+%@&=~^"].find((ch) => !used.has(ch)) ?? "?";
    used.add(c);
    legend.set(label, c);
    return c;
  };
  const list = s.entities.filter((e) => e.alive && !e.hidden && (e.size.x || e.size.y || e.size.z)).sort((a, b) => +a.ui - +b.ui || a.layer - b.layer);
  for (const e of list) {
    const r = screenRect(e);
    if (!r) continue;
    const ch = glyph(e.label);
    const x0 = Math.max(0, Math.floor(r.x0 / v.width * cols)), x1 = Math.min(cols - 1, Math.floor(r.x1 / v.width * cols));
    const y0 = Math.max(0, Math.floor(r.y0 / v.height * rows2)), y1 = Math.min(rows2 - 1, Math.floor(r.y1 / v.height * rows2));
    if (x0 >= cols || y0 >= rows2 || x1 < 0 || y1 < 0) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = ch;
  }
  const bar = `+${"-".repeat(cols)}+`;
  return [bar, ...grid.map((r) => `|${r.join("")}|`), bar, `legend: ${[...legend].map(([k, c]) => `${c}=${k}`).join(" ")}`].join("\n");
}
var MIN_TEXT_CSS = 11;
var MIN_TAP_CSS = 40;
function audit(g) {
  const s = g.current, v = g.view, out = [];
  if (!s) return out;
  const add = (severity, code, message, fix, entity) => out.push({ severity, code, message, fix, entity });
  const live = s.entities.filter((e) => e.alive && !e.hidden && !isFaded(e));
  const covers = (e) => e.size.x * Math.abs(e.scale.x) >= v.width - 1 && e.size.y * Math.abs(e.scale.y) >= v.height - 1;
  const uiItems = live.filter((e) => e.ui && e.dim === 2 && e._hooksDraw.length && (e.size.x || e.size.y) && !covers(e));
  const px = (n) => Math.round(n * v.scale);
  const controls = g.input.touchMode ? g.touch.layout() : [];
  for (const e of uiItems) {
    const r = screenRect(e), label = e.label;
    if (r.x0 < -0.5 || r.y0 < -0.5 || r.x1 > v.width + 0.5 || r.y1 > v.height + 0.5) {
      add("error", "OFFSCREEN_UI", `${label} extends past the screen edge (view is ${round(v.width)}x${round(v.height)}).`, "Use pin() and read view.width/height instead of fixed coordinates, or set maxWidth on text.", label);
    } else if (r.y0 < v.safe.top - 0.5 || r.y1 > v.height - v.safe.bottom + 0.5 || r.x0 < v.safe.left - 0.5 || r.x1 > v.width - v.safe.right + 0.5) {
      add("error", "SAFE_AREA", `${label} sits under the notch or home indicator.`, "Use pin(), which respects safe areas, or inset by view.safe.", label);
    }
    for (const c of controls) {
      const nx = Math.max(r.x0, Math.min(c.x, r.x1)), ny = Math.max(r.y0, Math.min(c.y, r.y1));
      if (Math.hypot(nx - c.x, ny - c.y) < c.r) add("warn", "COVERS_CONTROLS", `${label} overlaps the on-screen "${c.action}" button.`, "Move it away from the bottom-right corner.", label);
    }
  }
  for (const e of live) {
    if (e.textStyle) {
      const size = e.textStyle.size * Math.abs(e.scale.y) * (e.ui ? 1 : s.cam.zoom) * v.scale;
      if (size < MIN_TEXT_CSS) add("warn", "TEXT_TOO_SMALL", `${e.label} renders at ${size.toFixed(1)} CSS px.`, `Keep text at ${MIN_TEXT_CSS}px or more on the smallest screen: at least ${Math.ceil(MIN_TEXT_CSS / v.scale)} view units here.`, e.label);
    }
    if (e.tappable && e.dim === 2) {
      const w = px(e.size.x * e.scale.x), h = px(e.size.y * e.scale.y);
      if (w < MIN_TAP_CSS || h < MIN_TAP_CSS) add("warn", "TAP_TARGET_SMALL", `${e.label} is ${w}x${h} CSS px; fingers need about 44.`, `Make it at least ${Math.ceil(44 / v.scale)} view units on each side.`, e.label);
    }
  }
  const rects = uiItems.map((e) => ({ e, r: screenRect(e) }));
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    if (!(a.e.textStyle || a.e.tappable) || !(b.e.textStyle || b.e.tappable)) continue;
    if (a.e.parent === b.e || b.e.parent === a.e) continue;
    const ox = Math.min(a.r.x1, b.r.x1) - Math.max(a.r.x0, b.r.x0), oy = Math.min(a.r.y1, b.r.y1) - Math.max(a.r.y0, b.r.y0);
    if (ox > 2 && oy > 2) add("warn", "UI_OVERLAP", `${a.e.label} and ${b.e.label} overlap.`, "Lay them out from view.width/height so they don't collide on small screens.");
  }
  if (g.input.touchMode) {
    const provided = g.touch.provides, pointer = g.input.used.has("pointer"), hasTaps = live.some((e) => e.tappable);
    for (const action of g.input.used) {
      if (action === "pointer" || provided.has(action) || pointer) continue;
      if ((action === "pause" || action === "confirm") && hasTaps) continue;
      add("error", "UNREACHABLE_ACTION", `The game reads action "${action}" but a touch player has no way to trigger it.`, `Add it to createGame({ touch: { stick: true, buttons: ["${action}"] } }), read input.pointer/input.swipe, or add a button().`);
    }
  }
  return out;
}
function isFaded(e) {
  for (let p = e; p; p = p.parent) if (p.opacity <= 0.01 || p.hidden) return true;
  return false;
}

// src/input.ts
var DEFAULT_ACTIONS = {
  left: ["ArrowLeft", "KeyA", "pad:left"],
  right: ["ArrowRight", "KeyD", "pad:right"],
  up: ["ArrowUp", "KeyW", "pad:up"],
  down: ["ArrowDown", "KeyS", "pad:down"],
  jump: ["Space", "pad:a"],
  fire: ["KeyJ", "KeyX", "pad:x"],
  confirm: ["Enter", "pad:start"],
  pause: ["Escape", "KeyP", "pad:select"]
};
var PAD_BUTTONS = [
  [0, "pad:a"],
  [1, "pad:b"],
  [2, "pad:x"],
  [3, "pad:y"],
  [8, "pad:select"],
  [9, "pad:start"],
  [12, "pad:up"],
  [13, "pad:down"],
  [14, "pad:left"],
  [15, "pad:right"]
];
var Input = class {
  constructor(game, actions = {}) {
    this.game = game;
    this.actions = { ...DEFAULT_ACTIONS, ...actions };
    for (const a of Object.keys(this.actions)) this.states.set(a, { down: false, pressed: false, released: false });
  }
  actions;
  /** True while the player is on touch: on-screen controls show, and the layout audit takes them into account. */
  touchMode = false;
  /** Which actions and pointer features the game actually read; the audit uses this to find unreachable controls. */
  used = /* @__PURE__ */ new Set();
  /** Per-step look delta, in CSS pixels: mouse drag or locked mouse, the right touch zone, or the right stick x 8. */
  look = new Vec();
  /** Mouse wheel delta accumulated this step. */
  wheel = 0;
  _swipe = null;
  /** The swipe finished this step, if any. */
  get swipe() {
    this.used.add("pointer");
    return this._swipe;
  }
  codes = /* @__PURE__ */ new Set();
  latched = /* @__PURE__ */ new Set();
  scripted = /* @__PURE__ */ new Map();
  states = /* @__PURE__ */ new Map();
  queue = [];
  pointers = /* @__PURE__ */ new Map();
  primary = null;
  pendingLook = new Vec();
  pendingWheel = 0;
  padStick = new Vec();
  padLook = new Vec();
  stick = new Vec();
  px = 0;
  py = 0;
  pPressed = false;
  pReleased = false;
  pTapped = false;
  pDx = 0;
  pDy = 0;
  pConsumed = false;
  state(action) {
    const s = this.states.get(action);
    if (!s) throw new PogoError("UNKNOWN_ACTION", `Unknown input action "${action}".`, `${suggest(action, this.states.keys())} Add custom actions with createGame({ actions: { ${action}: ["KeyE"] } }).`);
    this.used.add(action);
    return s;
  }
  /** Held right now. */
  down(action) {
    return this.state(action).down;
  }
  /** Went down this step. */
  pressed(action) {
    return this.state(action).pressed;
  }
  /** Went up this step. */
  released(action) {
    return this.state(action).released;
  }
  /** Movement vector with length up to 1, from the stick, gamepad or left/right/up/down. y is -1 when up is held. */
  get move() {
    this.used.add("left");
    this.used.add("right");
    this.used.add("up");
    this.used.add("down");
    if (this.stick.lenSq() > 0) return this.stick.clone();
    if (this.padStick.lenSq() > 0) return this.padStick.clone();
    const x = (this.states.get("right").down ? 1 : 0) - (this.states.get("left").down ? 1 : 0);
    const y = (this.states.get("down").down ? 1 : 0) - (this.states.get("up").down ? 1 : 0);
    return new Vec(x, y).norm();
  }
  /** Primary pointer, in view units. pressed/tapped are false if a button or touch control consumed the touch. */
  get pointer() {
    this.used.add("pointer");
    const consumed = this.pConsumed, x = this.px, y = this.py;
    const game = this.game;
    return {
      x,
      y,
      dx: this.pDx,
      dy: this.pDy,
      down: !!this.primary && !this.primary.captured && !consumed,
      pressed: this.pPressed && !consumed,
      released: this.pReleased && !consumed,
      tapped: this.pTapped && !consumed,
      /** The pointer in 2D world coordinates. */
      get world() {
        return game.current?.cam.toWorld(new Vec(x, y)) ?? new Vec(x, y);
      }
    };
  }
  /** All active touches, in view units. */
  get touches() {
    this.used.add("pointer");
    return [...this.pointers.values()].filter((p) => !p.captured).map((p) => ({ id: p.id, x: p.x, y: p.y }));
  }
  /** @internal Tap dispatch reads raw edges, because it decides what gets consumed. */
  _raw() {
    return { x: this.px, y: this.py, pressed: this.pPressed, released: this.pReleased, tapped: this.pTapped };
  }
  /** @internal Read an action without counting it as a gameplay dependency in the audit. */
  _quiet(action) {
    return this.states.get(action)?.pressed ?? false;
  }
  /** Stop gameplay seeing the current touch. Buttons do this automatically. */
  consumePointer() {
    this.pConsumed = true;
  }
  // --- Raw sources -------------------------------------------------------------
  codeDown(code) {
    if (!this.codes.has(code)) {
      this.codes.add(code);
      this.latched.add(code);
    }
  }
  codeUp(code) {
    this.codes.delete(code);
  }
  pointerEvent(kind, id, x, y) {
    this.queue.push({ kind, id, x, y });
  }
  addLook(dx, dy) {
    this.pendingLook.x += dx;
    this.pendingLook.y += dy;
  }
  addWheel(d) {
    this.pendingWheel += d;
  }
  setStick(x, y) {
    this.stick.set(x, y, 0);
  }
  // --- Scripted input, for agents and tests ----------------------------------------
  /** Hold an action until release(), or for the given number of steps. */
  press(action, steps = Infinity) {
    this.state(action);
    this.scripted.set(action, steps);
  }
  release(action) {
    this.state(action);
    this.scripted.delete(action);
  }
  /** Tap once at view coordinates; takes effect on the next step. */
  tap(x, y, id = 900) {
    this.pointerEvent("down", id, x, y);
    this.pointerEvent("up", id, x, y);
  }
  /** Swipe between two view points; takes effect on the next step. */
  drag(x0, y0, x1, y1, id = 901) {
    this.pointerEvent("down", id, x0, y0);
    this.pointerEvent("move", id, x1, y1);
    this.pointerEvent("up", id, x1, y1);
  }
  /** Clear everything; used on scene changes so a held key can't leak into a menu. */
  reset() {
    this.scripted.clear();
    this.codes.clear();
    this.latched.clear();
    this.pointers.clear();
    this.primary = null;
    this.queue.length = 0;
    this.stick.set(0, 0, 0);
    this.game.touch.reset();
  }
  // --- Step lifecycle ---------------------------------------------------------------
  /** @internal */
  beginStep() {
    this.pollGamepads();
    this.pPressed = this.pReleased = this.pTapped = false;
    this.pConsumed = false;
    this._swipe = null;
    const ox = this.px, oy = this.py;
    const queue = this.queue;
    this.queue = [];
    for (const ev of queue) this.handlePointer(ev);
    this.pDx = this.px - ox;
    this.pDy = this.py - oy;
    this.look.set(this.pendingLook.x + this.padLook.x * 8, this.pendingLook.y + this.padLook.y * 8, 0);
    this.pendingLook.set(0, 0, 0);
    this.wheel = this.pendingWheel;
    this.pendingWheel = 0;
    for (const [action, st] of this.states) {
      const bindings = this.actions[action] ?? [];
      let down = false;
      for (const code of bindings) if (this.codes.has(code) || this.latched.has(code)) {
        down = true;
        break;
      }
      if (this.codes.has(`touch:${action}`) || this.latched.has(`touch:${action}`)) down = true;
      const left = this.scripted.get(action);
      if (left !== void 0) {
        down = true;
        if (left <= 1) this.scripted.delete(action);
        else this.scripted.set(action, left - 1);
      }
      st.pressed = down && !st.down;
      st.released = !down && st.down;
      st.down = down;
    }
    this.latched.clear();
    for (const p of this.pointers.values()) p.steps++;
  }
  handlePointer(ev) {
    const css = this.game.view.scale;
    if (ev.kind === "down") {
      const p2 = { id: ev.id, x: ev.x, y: ev.y, startX: ev.x, startY: ev.y, steps: 0, captured: false };
      p2.captured = this.game.touch.pointerDown(p2.id, ev.x, ev.y);
      this.pointers.set(ev.id, p2);
      if (!p2.captured && !this.primary) {
        this.primary = p2;
        this.pPressed = true;
        this.px = ev.x;
        this.py = ev.y;
      }
      return;
    }
    const p = this.pointers.get(ev.id);
    if (!p) {
      if (ev.kind === "move") {
        this.px = ev.x;
        this.py = ev.y;
      }
      return;
    }
    if (ev.kind === "move") {
      if (p.captured) this.game.touch.pointerMove(p.id, ev.x, ev.y);
      else if (p === this.primary || this.game.touch.lookActive) this.addLook((ev.x - p.x) * css, (ev.y - p.y) * css);
      p.x = ev.x;
      p.y = ev.y;
      if (p === this.primary) {
        this.px = ev.x;
        this.py = ev.y;
      }
      return;
    }
    this.pointers.delete(ev.id);
    if (p.captured) {
      this.game.touch.pointerUp(p.id);
      return;
    }
    if (p === this.primary) {
      this.primary = null;
      this.pReleased = true;
      this.px = ev.x;
      this.py = ev.y;
      const dx = (ev.x - p.startX) * css, dy = (ev.y - p.startY) * css, dist = Math.hypot(dx, dy);
      if (dist < 14 && p.steps < 40) this.pTapped = true;
      else if (dist >= 32 && p.steps < 45) this._swipe = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
    }
  }
  pollGamepads() {
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : null;
    this.padStick.set(0, 0, 0);
    this.padLook.set(0, 0, 0);
    if (!pads) return;
    const dz = (v) => Math.abs(v) < 0.18 ? 0 : v;
    for (const pad of pads) {
      if (!pad) continue;
      for (const [i, code] of PAD_BUTTONS) {
        if (pad.buttons[i]?.pressed) this.codeDown(code);
        else this.codeUp(code);
      }
      this.padStick.set(dz(pad.axes[0] ?? 0), dz(pad.axes[1] ?? 0), 0);
      this.padLook.set(dz(pad.axes[2] ?? 0), dz(pad.axes[3] ?? 0), 0);
      for (const [code, on] of [["pad:left", this.padStick.x < -0.4], ["pad:right", this.padStick.x > 0.4], ["pad:up", this.padStick.y < -0.4], ["pad:down", this.padStick.y > 0.4]]) {
        if (on) this.codeDown(code);
      }
      break;
    }
  }
};

// src/render/backend.ts
var MODE_TEXTURE = 0;
var MODE_SDF = 1;
var MODE_SOLID = 2;
function layoutText(str, style, measure) {
  const lines = [];
  for (const para of str.split("\n")) {
    if (!style.maxWidth) {
      lines.push(para);
      continue;
    }
    let line = "";
    for (const word of para.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next) > style.maxWidth) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return { width: Math.max(0, ...lines.map(measure)), height: lines.length * style.size * style.lineHeight, lines };
}
var estimateLine = (style) => (line) => line.length * style.size * (style.bold ? 0.6 : 0.55);
var NullRenderer = class {
  kind = "null";
  stats = { drawCalls: 0, instances: 0, quads: 0 };
  beginFrame() {
    this.stats = { drawCalls: 0, instances: 0, quads: 0 };
  }
  mesh() {
    this.stats.instances++;
  }
  render3D() {
  }
  begin2D() {
  }
  quad() {
    this.stats.quads++;
  }
  tris() {
  }
  endFrame() {
  }
  texture() {
    return null;
  }
  measureText(str, style) {
    return layoutText(str, style, estimateLine(style));
  }
  text(str, style) {
    const m = this.measureText(str, style);
    return { tex: null, width: m.width, height: m.height };
  }
  screenshot() {
    return null;
  }
};

// src/render/draw.ts
var DEFAULT_FONT = "system-ui, -apple-system, Roboto, sans-serif";
var WHITE = new Color();
var scratch = mat4();
var Draw = class {
  constructor(game) {
    this.game = game;
  }
  m = new Float32Array([1, 0, 0, 1, 0, 0]);
  alpha = 1;
  colors = /* @__PURE__ */ new Map();
  get r() {
    return this.game.renderer;
  }
  paint(c, o) {
    let col;
    if (c === void 0) col = WHITE;
    else if (typeof c === "string") {
      col = this.colors.get(c) ?? color(c);
      this.colors.set(c, col);
    } else col = color(c);
    return [col.r, col.g, col.b, col.a * this.alpha * (o.opacity ?? 1)];
  }
  /** @internal */
  begin(e) {
    const w = e.world, m = this.m;
    m[0] = w[0];
    m[1] = w[1];
    m[2] = w[4];
    m[3] = w[5];
    m[4] = w[12];
    m[5] = w[13];
    this.alpha = e._opacity;
  }
  /** @internal Back to an untransformed, fully opaque state. */
  reset() {
    this.m.set([1, 0, 0, 1, 0, 0]);
    this.alpha = 1;
  }
  rect(w, h, o = {}) {
    const [r, g, b, a] = this.paint(o.color, o), x = o.x ?? 0, y = o.y ?? 0, hw = w / 2, hh = h / 2, pad = 1.5;
    this.r.quad(this.m, x - hw - pad, y - hh - pad, x + hw + pad, y + hh + pad, -hw - pad, -hh - pad, hw + pad, hh + pad, r, g, b, a, null, MODE_SDF, hw, hh, Math.min(o.radius ?? 0, hw, hh), o.outline ?? 0);
  }
  circle(radius, o = {}) {
    this.rect(radius * 2, radius * 2, { ...o, radius });
  }
  /** A line between two local points. */
  line(a, b, o = {}) {
    const p = toVec(a), q = toVec(b), d = q.sub(p), len = d.len();
    if (len === 0) return;
    const n = new Vec(-d.y / len, d.x / len).mul((o.width ?? 2) / 2), [r, g, bl, al] = this.paint(o.color, o);
    this.r.tris(this.m, [p.x + n.x, p.y + n.y, q.x + n.x, q.y + n.y, q.x - n.x, q.y - n.y, p.x + n.x, p.y + n.y, q.x - n.x, q.y - n.y, p.x - n.x, p.y - n.y], r, g, bl, al);
  }
  /** A filled convex polygon. */
  poly(points, o = {}) {
    const pts = points.map(toVec), out = [], [r, g, b, a] = this.paint(o.color, o);
    for (let i = 1; i < pts.length - 1; i++) out.push(pts[0].x, pts[0].y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    this.r.tris(this.m, out, r, g, b, a);
  }
  sprite(name, o = {}) {
    const asset = this.game.assets.sprite(name);
    const frame = (o.frame ?? 0) % (asset.cols * asset.rows), col = frame % asset.cols, row = Math.floor(frame / asset.cols);
    const w = o.width ?? asset.frameW, h = o.height ?? asset.frameH, x = o.x ?? 0, y = o.y ?? 0;
    const u0 = col / asset.cols, v0 = row / asset.rows, u1 = (col + 1) / asset.cols, v1 = (row + 1) / asset.rows;
    const [r, g, b, a] = this.paint(o.color, o);
    const flip = !!o.flipX;
    this.r.quad(this.m, x - w / 2, y - h / 2, x + w / 2, y + h / 2, flip ? u1 : u0, v0, flip ? u0 : u1, v1, r, g, b, a, this.r.texture(asset), MODE_TEXTURE, 0, 0, 0, 0);
  }
  text(str, o = {}) {
    const style = { size: o.size ?? 20, font: o.font ?? DEFAULT_FONT, bold: o.bold ?? false, align: o.align ?? "center", maxWidth: o.maxWidth ?? 0, lineHeight: o.lineHeight ?? 1.25 };
    const t = this.r.text(String(str), style), x = o.x ?? 0, y = o.y ?? 0;
    const [r, g, b, a] = this.paint(o.color, o);
    this.r.quad(this.m, x - t.width / 2, y - t.height / 2, x + t.width / 2, y + t.height / 2, 0, 0, 1, 1, r, g, b, a, t.tex, MODE_TEXTURE, 0, 0, 0, 0);
  }
  /** @internal Queue a mesh for the 3D pass. */
  mesh(name, world, o) {
    const geom = this.game.assets.geometry(name), n = geom.natural;
    const fit = (s, w) => w > 1e-6 ? s / w : 1;
    const matrix = new Float32Array(16);
    mat4Mul(matrix, world, mat4Compose(scratch, ZERO, ZERO, new Vec(fit(o.size.x, n.x), fit(o.size.y, n.y), fit(o.size.z, n.z))));
    this.r.mesh(item(geom, matrix, o.color, this.alpha, o.texture ? this.game.assets.sprite(o.texture) : null, o.unlit, o.castShadow ?? true));
  }
  /** @internal */
  billboard(name, e, o) {
    const asset = this.game.assets.sprite(name), geom = this.game.assets.geometry("quad"), cam = e.scene.cam3;
    cam.update(this.game._alpha);
    const p = new Vec(e.world[12], e.world[13], e.world[14]);
    const yaw = Math.atan2(cam.eye.x - p.x, cam.eye.z - p.z);
    const matrix = mat4Compose(new Float32Array(16), p, new Vec(0, yaw, 0), new Vec(e.size.x * e.scale.x, e.size.y * e.scale.y, 1));
    const it = item(geom, matrix, o.color, this.alpha, asset, o.unlit, false);
    const frame = o.frame % (asset.cols * asset.rows), col = frame % asset.cols, row = Math.floor(frame / asset.cols);
    it.u0 = col / asset.cols;
    it.v0 = row / asset.rows;
    it.u1 = (col + 1) / asset.cols;
    it.v1 = (row + 1) / asset.rows;
    it.cutout = true;
    this.r.mesh(it);
  }
};
var ZERO = new Vec();
function item(geom, matrix, c, alpha, texture, unlit = false, castShadow = true) {
  return { geom, matrix, r: c.r, g: c.g, b: c.b, a: c.a * alpha, texture, u0: 0, v0: 0, u1: 1, v1: 1, unlit, castShadow, cutout: false };
}

// src/render/gl.ts
var VS_2D = `#version 300 es
layout(location=0) in vec2 a_pos; layout(location=1) in vec2 a_uv; layout(location=2) in vec4 a_col;
layout(location=3) in vec4 a_par; layout(location=4) in float a_mode;
uniform vec4 u_cam; uniform vec2 u_off; uniform vec2 u_res;
out vec2 v_uv; out vec4 v_col; out vec4 v_par; flat out float v_mode;
void main(){
  vec2 p = vec2(u_cam.x*a_pos.x + u_cam.z*a_pos.y, u_cam.y*a_pos.x + u_cam.w*a_pos.y) + u_off;
  gl_Position = vec4(p.x/u_res.x*2.-1., 1.-p.y/u_res.y*2., 0., 1.);
  v_uv=a_uv; v_col=a_col; v_par=a_par; v_mode=a_mode;
}`;
var FS_2D = `#version 300 es
precision highp float;
in vec2 v_uv; in vec4 v_col; in vec4 v_par; flat in float v_mode;
uniform sampler2D u_tex; out vec4 o;
void main(){
  vec4 c = vec4(v_col.rgb*v_col.a, v_col.a);
  if (v_mode < .5) { o = texture(u_tex, v_uv)*c; return; }
  if (v_mode > 1.5) { o = c; return; }
  float r = v_par.z;
  vec2 q = abs(v_uv) - v_par.xy + r;
  float d = length(max(q,0.)) + min(max(q.x,q.y),0.) - r;
  float aa = max(fwidth(d), 1e-4);
  float a = 1. - smoothstep(-aa*.5, aa*.5, d);
  if (v_par.w > 0.) a *= smoothstep(-v_par.w-aa*.5, -v_par.w+aa*.5, d);
  o = c*a;
}`;
var VS_3D = `#version 300 es
layout(location=0) in vec3 a_pos; layout(location=1) in vec3 a_nor; layout(location=2) in vec2 a_uv; layout(location=3) in vec3 a_col;
layout(location=4) in vec4 i_m0; layout(location=5) in vec4 i_m1; layout(location=6) in vec4 i_m2; layout(location=7) in vec4 i_m3;
layout(location=8) in vec4 i_col; layout(location=9) in vec4 i_uv;
uniform mat4 u_vp; uniform mat4 u_light;
out vec3 v_nor; out vec3 v_w; out vec2 v_uv; out vec4 v_col; out vec3 v_s;
void main(){
  mat4 m = mat4(i_m0,i_m1,i_m2,i_m3);
  vec4 w = m*vec4(a_pos,1.);
  mat3 n = mat3(m);
  n[0]/=dot(n[0],n[0]); n[1]/=dot(n[1],n[1]); n[2]/=dot(n[2],n[2]);
  v_nor = n*a_nor; v_w=w.xyz; v_uv=mix(i_uv.xy,i_uv.zw,a_uv); v_col=vec4(a_col*i_col.rgb,i_col.a);
  vec4 s = u_light*vec4(w.xyz + normalize(v_nor)*.04,1.);
  v_s = s.xyz*.5+.5;
  gl_Position = u_vp*w;
}`;
var FS_3D = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 v_nor; in vec3 v_w; in vec2 v_uv; in vec4 v_col; in vec3 v_s;
uniform sampler2D u_tex; uniform sampler2DShadow u_shadow;
uniform float u_useTex, u_unlit, u_shadows, u_texel, u_cutout;
uniform vec3 u_sun, u_sunCol, u_sky, u_ground, u_fogCol, u_eye; uniform vec2 u_fog;
out vec4 o;
float shadow(){
  if (u_shadows < .5 || v_s.x<0.||v_s.x>1.||v_s.y<0.||v_s.y>1.||v_s.z>1.) return 1.;
  float t=u_texel, z=v_s.z-.0015;
  return (texture(u_shadow,vec3(v_s.xy+vec2(-t,-t),z))+texture(u_shadow,vec3(v_s.xy+vec2(t,-t),z))
         +texture(u_shadow,vec3(v_s.xy+vec2(-t,t),z))+texture(u_shadow,vec3(v_s.xy+vec2(t,t),z)))*.25;
}
void main(){
  vec4 base = v_col;
  if (u_useTex > .5) { vec4 t = texture(u_tex,v_uv); if (u_cutout > .5 && t.a < .5) discard; base *= t; }
  vec3 c = base.rgb;
  if (u_unlit < .5) {
    vec3 n = normalize(v_nor);
    float diff = max(dot(n,-u_sun),0.);
    c *= mix(u_ground,u_sky,n.y*.5+.5) + u_sunCol*diff*shadow();
    if (u_fog.y > 0.) c = mix(c,u_fogCol,smoothstep(u_fog.x,u_fog.y,distance(v_w,u_eye)));
  }
  o = vec4(c*base.a, base.a);
}`;
var VS_DEPTH = `#version 300 es
layout(location=0) in vec3 a_pos;
layout(location=4) in vec4 i_m0; layout(location=5) in vec4 i_m1; layout(location=6) in vec4 i_m2; layout(location=7) in vec4 i_m3;
uniform mat4 u_light;
void main(){ gl_Position = u_light*mat4(i_m0,i_m1,i_m2,i_m3)*vec4(a_pos,1.); }`;
var FS_DEPTH = `#version 300 es
precision lowp float; void main(){}`;
var MAX_QUADS = 4096;
var FLOATS_2D = 10;
var VERTS_2D = MAX_QUADS * 6;
var FLOATS_INSTANCE = 24;
var SHADOW_SIZE = 1024;
var TEXT_CACHE = 256;
var GLRenderer = class {
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.opts = opts;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: true, depth: true, stencil: false, powerPreference: "default" });
    if (!gl) throw new PogoError("NO_WEBGL2", "WebGL2 is not available in this browser or web view.", "WebGL2 is required. Check that hardware acceleration is enabled for the web view.");
    this.gl = gl;
    this.measurer = document.createElement("canvas").getContext("2d");
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.lost = true;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.init();
      this.lost = false;
    });
    this.init();
  }
  kind = "gl";
  stats = { drawCalls: 0, instances: 0, quads: 0 };
  /** Fraction of device pixels rendered; lowered automatically on slow devices. */
  quality = 1;
  lost = false;
  gl;
  p2;
  p3;
  pd;
  vao2;
  vbo2;
  instBuf;
  shadowFbo;
  shadowTex;
  verts = new ArrayBuffer(VERTS_2D * FLOATS_2D * 4);
  f32 = new Float32Array(this.verts);
  u32 = new Uint32Array(this.verts);
  n2 = 0;
  tex2 = null;
  cam2 = new Float32Array([1, 0, 0, 1, 0, 0]);
  view;
  items = [];
  instances = new Float32Array(FLOATS_INSTANCE * 2048);
  geoms = /* @__PURE__ */ new Map();
  textures = /* @__PURE__ */ new Map();
  textCache = /* @__PURE__ */ new Map();
  measurer;
  dpr = 1;
  oldScale = 0;
  lightVP = mat4();
  /** Build every GL resource. Also runs after a lost context, which phones do on backgrounding. */
  init() {
    const gl = this.gl;
    this.geoms.clear();
    this.textures.clear();
    this.textCache.clear();
    this.p2 = this.program(VS_2D, FS_2D, ["u_cam", "u_off", "u_res", "u_tex"]);
    this.p3 = this.program(VS_3D, FS_3D, ["u_vp", "u_light", "u_tex", "u_shadow", "u_useTex", "u_unlit", "u_shadows", "u_texel", "u_cutout", "u_sun", "u_sunCol", "u_sky", "u_ground", "u_fogCol", "u_eye", "u_fog"]);
    this.pd = this.program(VS_DEPTH, FS_DEPTH, ["u_light"]);
    this.vao2 = gl.createVertexArray();
    this.vbo2 = gl.createBuffer();
    gl.bindVertexArray(this.vao2);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo2);
    gl.bufferData(gl.ARRAY_BUFFER, this.verts.byteLength, gl.STREAM_DRAW);
    const s = FLOATS_2D * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, s, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, s, 8);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, s, 16);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, s, 20);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, s, 36);
    gl.bindVertexArray(null);
    this.instBuf = gl.createBuffer();
    this.shadowTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHADOW_SIZE, SHADOW_SIZE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.shadowFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  program(vs, fs, names) {
    const gl = this.gl;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new PogoError("SHADER", gl.getShaderInfoLog(s) ?? "Shader failed to compile.");
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new PogoError("SHADER", gl.getProgramInfoLog(p) ?? "Program failed to link.");
    return { p, u: Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)])) };
  }
  // --- Frame --------------------------------------------------------------------
  beginFrame(view, bg, bg2, letterbox) {
    this.view = view;
    this.stats = { drawCalls: 0, instances: 0, quads: 0 };
    if (this.lost) return;
    const gl = this.gl, S = view.screen, dpr = Math.min(S.dpr, this.opts.maxDpr) * this.quality;
    this.dpr = dpr;
    const w = Math.max(1, Math.round(S.width * dpr)), h = Math.max(1, Math.round(S.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const scale2 = view.scale * dpr;
    if (scale2 !== this.oldScale) {
      this.oldScale = scale2;
      this.dropText();
    }
    while (this.textCache.size > TEXT_CACHE) {
      const key = this.textCache.keys().next().value;
      gl.deleteTexture(this.textCache.get(key).tex);
      this.textCache.delete(key);
    }
    const vx = Math.round(view.x * dpr), vh = Math.round(view.height * scale2), vy = h - Math.round(view.y * dpr) - vh, vw = Math.round(view.width * scale2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, w, h);
    gl.clearColor(letterbox.r, letterbox.g, letterbox.b, 1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(vx, vy, vw, vh);
    gl.viewport(vx, vy, vw, vh);
    gl.clearColor(bg.r, bg.g, bg.b, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.vp = [vx, vy, vw, vh];
    if (bg2) {
      this.begin2D(null);
      const W = view.width, H = view.height, t = [bg, bg, bg2, bg, bg2, bg2], p = [0, 0, W, 0, W, H, 0, 0, W, H, 0, H];
      for (let i = 0; i < 6; i++) this.vertex(p[i * 2], p[i * 2 + 1], 0, 0, packColor(t[i].r, t[i].g, t[i].b, 1), 0, 0, 0, 0, MODE_SOLID);
      this.flush();
    }
  }
  vp = [0, 0, 1, 1];
  dropText() {
    for (const t of this.textCache.values()) this.gl.deleteTexture(t.tex);
    this.textCache.clear();
  }
  endFrame() {
    this.flush();
  }
  // --- 3D -------------------------------------------------------------------------
  mesh(item2) {
    this.items.push(item2);
  }
  geom(g) {
    let info = this.geoms.get(g);
    if (info) return info;
    const gl = this.gl, vao = gl.createVertexArray(), vb = gl.createBuffer(), ib = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, g.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.indices, gl.STATIC_DRAW);
    const s = FLOATS_PER_VERTEX * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, s, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, s, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, s, 24);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, s, 32);
    for (let i = 4; i <= 9; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.bindVertexArray(null);
    info = { vao, count: g.indices.length };
    this.geoms.set(g, info);
    return info;
  }
  bindInstances(start) {
    const gl = this.gl, s = FLOATS_INSTANCE * 4, o = start * s;
    for (let i = 0; i < 6; i++) gl.vertexAttribPointer(4 + i, 4, gl.FLOAT, false, s, o + i * 16);
  }
  render3D(cam, light) {
    const items = this.items;
    this.items = [];
    if (this.lost || !items.length) return;
    const gl = this.gl;
    const groups = /* @__PURE__ */ new Map(), clear = [];
    for (const it of items) {
      if (it.a < 0.999) {
        const dx = it.matrix[12] - cam.eye.x, dy = it.matrix[13] - cam.eye.y, dz = it.matrix[14] - cam.eye.z;
        clear.push({ it, depth: dx * dx + dy * dy + dz * dz });
        continue;
      }
      const key = `${it.geom.id}|${it.texture?.name ?? ""}|${it.unlit}|${it.cutout}`;
      let g = groups.get(key);
      if (!g) groups.set(key, g = []);
      g.push(it);
    }
    clear.sort((a, b) => b.depth - a.depth);
    if (this.instances.length < items.length * FLOATS_INSTANCE) this.instances = new Float32Array(items.length * 2 * FLOATS_INSTANCE);
    const data = this.instances, buckets = [];
    let n = 0;
    const write = (it) => {
      const o = n++ * FLOATS_INSTANCE;
      data.set(it.matrix, o);
      data[o + 16] = it.r;
      data[o + 17] = it.g;
      data[o + 18] = it.b;
      data[o + 19] = it.a;
      data[o + 20] = it.u0;
      data[o + 21] = it.v0;
      data[o + 22] = it.u1;
      data[o + 23] = it.v1;
    };
    for (const g of groups.values()) {
      g.sort((a, b) => +b.castShadow - +a.castShadow);
      const it = g[0], start = n;
      for (const x of g) write(x);
      buckets.push({ geom: it.geom, tex: it.texture, unlit: it.unlit, cutout: it.cutout, start, count: g.length, casters: g.filter((x) => x.castShadow).length });
    }
    const opaque = buckets.length;
    for (const { it } of clear) {
      const start = n;
      write(it);
      buckets.push({ geom: it.geom, tex: it.texture, unlit: it.unlit, cutout: it.cutout, start, count: 1, casters: 0 });
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, n * FLOATS_INSTANCE), gl.STREAM_DRAW);
    this.stats.instances += n;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    const useShadows = light.shadows && buckets.some((b) => b.casters > 0);
    if (useShadows) this.shadowPass(buckets.slice(0, opaque), cam, light);
    else mat4Ortho(this.lightVP, -1, 1, -1, 1, -1, 1);
    const u = this.p3.u;
    gl.useProgram(this.p3.p);
    gl.uniformMatrix4fv(u.u_vp, false, cam.viewProj);
    gl.uniformMatrix4fv(u.u_light, false, this.lightVP);
    const sun = light.dir.norm();
    gl.uniform3f(u.u_sun, sun.x, sun.y, sun.z);
    gl.uniform3f(u.u_sunCol, light.color.r, light.color.g, light.color.b);
    gl.uniform3f(u.u_sky, light.sky.r, light.sky.g, light.sky.b);
    gl.uniform3f(u.u_ground, light.ground.r, light.ground.g, light.ground.b);
    gl.uniform3f(u.u_eye, cam.eye.x, cam.eye.y, cam.eye.z);
    const f = light.fog;
    gl.uniform3f(u.u_fogCol, f?.color.r ?? 0, f?.color.g ?? 0, f?.color.b ?? 0);
    gl.uniform2f(u.u_fog, f?.near ?? 0, f?.far ?? 0);
    gl.uniform1f(u.u_shadows, useShadows ? 1 : 0);
    gl.uniform1f(u.u_texel, 0.75 / SHADOW_SIZE);
    gl.uniform1i(u.u_tex, 0);
    gl.uniform1i(u.u_shadow, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.activeTexture(gl.TEXTURE0);
    buckets.forEach((b, i) => {
      if (i === opaque) {
        gl.enable(gl.BLEND);
        gl.depthMask(false);
      }
      const info = this.geom(b.geom);
      gl.bindVertexArray(info.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
      this.bindInstances(b.start);
      gl.uniform1f(u.u_useTex, b.tex ? 1 : 0);
      gl.uniform1f(u.u_unlit, b.unlit ? 1 : 0);
      gl.uniform1f(u.u_cutout, b.cutout ? 1 : 0);
      if (b.cutout) gl.disable(gl.CULL_FACE);
      if (b.tex) gl.bindTexture(gl.TEXTURE_2D, this.texture(b.tex));
      gl.drawElementsInstanced(gl.TRIANGLES, info.count, gl.UNSIGNED_INT, 0, b.count);
      if (b.cutout) gl.enable(gl.CULL_FACE);
      this.stats.drawCalls++;
    });
    gl.bindVertexArray(null);
    gl.depthMask(true);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0);
  }
  shadowPass(buckets, cam, light) {
    const gl = this.gl, R = light.shadowRange, L = light.dir.norm(), lv = mat4(), lp = mat4();
    const center = cam.look.lerp(cam.eye, 0.2);
    mat4LookAt(lv, center.sub(L.mul(R * 2)), center, new Vec(0, 1, 0));
    mat4Ortho(lp, -R, R, -R, R, 0.1, R * 4);
    mat4Mul(this.lightVP, lp, lv);
    const ndc = mat4Point(this.lightVP, center), t = SHADOW_SIZE / 2;
    this.lightVP[12] += Math.round(ndc.x * t) / t - ndc.x;
    this.lightVP[13] += Math.round(ndc.y * t) / t - ndc.y;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.pd.p);
    gl.uniformMatrix4fv(this.pd.u.u_light, false, this.lightVP);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.5, 2);
    for (const b of buckets) {
      if (!b.casters) continue;
      const info = this.geom(b.geom);
      gl.bindVertexArray(info.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
      this.bindInstances(b.start);
      gl.drawElementsInstanced(gl.TRIANGLES, info.count, gl.UNSIGNED_INT, 0, b.casters);
      this.stats.drawCalls++;
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.enable(gl.CULL_FACE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.enable(gl.SCISSOR_TEST);
    const [x, y, w, h] = this.vp;
    gl.viewport(x, y, w, h);
  }
  // --- 2D ---------------------------------------------------------------------------
  begin2D(camera) {
    this.flush();
    this.cam2 = camera ?? IDENTITY;
  }
  vertex(x, y, u, v, col, p0, p1, p2, p3, mode) {
    const f = this.f32, o = this.n2++ * FLOATS_2D;
    f[o] = x;
    f[o + 1] = y;
    f[o + 2] = u;
    f[o + 3] = v;
    this.u32[o + 4] = col;
    f[o + 5] = p0;
    f[o + 6] = p1;
    f[o + 7] = p2;
    f[o + 8] = p3;
    f[o + 9] = mode;
  }
  quad(m, x0, y0, x1, y1, u0, v0, u1, v1, r, g, b, a, tex, mode, p0, p1, p2, p3) {
    if (this.lost) return;
    if (this.n2 + 6 > VERTS_2D || mode === 0 && tex !== this.tex2 && this.n2 > 0) this.flush();
    if (mode === 0) this.tex2 = tex;
    const col = packColor(r, g, b, a);
    const ax = m[0] * x0 + m[2] * y0 + m[4], ay = m[1] * x0 + m[3] * y0 + m[5];
    const bx = m[0] * x1 + m[2] * y0 + m[4], by = m[1] * x1 + m[3] * y0 + m[5];
    const cx = m[0] * x1 + m[2] * y1 + m[4], cy = m[1] * x1 + m[3] * y1 + m[5];
    const dx = m[0] * x0 + m[2] * y1 + m[4], dy = m[1] * x0 + m[3] * y1 + m[5];
    this.vertex(ax, ay, u0, v0, col, p0, p1, p2, p3, mode);
    this.vertex(bx, by, u1, v0, col, p0, p1, p2, p3, mode);
    this.vertex(cx, cy, u1, v1, col, p0, p1, p2, p3, mode);
    this.vertex(ax, ay, u0, v0, col, p0, p1, p2, p3, mode);
    this.vertex(cx, cy, u1, v1, col, p0, p1, p2, p3, mode);
    this.vertex(dx, dy, u0, v1, col, p0, p1, p2, p3, mode);
    this.stats.quads++;
  }
  tris(m, pts, r, g, b, a) {
    if (this.lost) return;
    const n = pts.length / 2;
    if (this.n2 + n > VERTS_2D) this.flush();
    const col = packColor(r, g, b, a);
    for (let i = 0; i < n; i++) {
      const x = pts[i * 2], y = pts[i * 2 + 1];
      this.vertex(m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5], 0, 0, col, 0, 0, 0, 0, MODE_SOLID);
    }
  }
  flush() {
    if (!this.n2 || this.lost) {
      this.n2 = 0;
      return;
    }
    const gl = this.gl, u = this.p2.u, c = this.cam2;
    gl.useProgram(this.p2.p);
    gl.uniform4f(u.u_cam, c[0], c[1], c[2], c[3]);
    gl.uniform2f(u.u_off, c[4], c[5]);
    gl.uniform2f(u.u_res, this.view.width, this.view.height);
    gl.uniform1i(u.u_tex, 0);
    gl.enable(gl.BLEND);
    gl.bindVertexArray(this.vao2);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo2);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.f32.subarray(0, this.n2 * FLOATS_2D));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex2 ?? null);
    gl.drawArrays(gl.TRIANGLES, 0, this.n2);
    gl.bindVertexArray(null);
    this.stats.drawCalls++;
    this.n2 = 0;
  }
  texture(asset) {
    const gl = this.gl;
    let t = this.textures.get(asset);
    if (t && (t.loaded || !asset.loaded)) return t.tex;
    const tex = t?.tex ?? gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (asset.image) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, asset.image);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, asset.width, asset.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, asset.data ?? null);
    const filter = asset.pixelated || this.opts.pixelArt ? gl.NEAREST : gl.LINEAR;
    const mips = !!asset.mipmaps && filter === gl.LINEAR;
    if (mips) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.textures.set(asset, { tex, loaded: asset.loaded });
    return tex;
  }
  measureText(str, style) {
    const c = this.measurer;
    c.font = `${style.bold ? "bold " : ""}${style.size}px ${style.font}`;
    return layoutText(str, style, (line) => c.measureText(line).width);
  }
  /** Rasterise at device resolution, so text stays sharp at any scale, and tint in the shader. */
  text(str, style) {
    const key = `${str}|${style.size}|${style.font}|${style.bold}|${style.align}|${style.maxWidth}|${style.lineHeight}`;
    const hit = this.textCache.get(key);
    if (hit) {
      this.textCache.delete(key);
      this.textCache.set(key, hit);
      return hit;
    }
    const m = this.measureText(str, style), k = this.view.scale * this.dpr;
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.ceil(m.width * k) + 2);
    cv.height = Math.max(1, Math.ceil(m.height * k) + 2);
    const c = cv.getContext("2d");
    c.scale(k, k);
    c.font = `${style.bold ? "bold " : ""}${style.size}px ${style.font}`;
    c.fillStyle = "#fff";
    c.textBaseline = "middle";
    c.textAlign = style.align;
    const lh = style.size * style.lineHeight, x = style.align === "left" ? 0 : style.align === "right" ? m.width : m.width / 2;
    m.lines.forEach((line, i) => c.fillText(line, x + 1 / k, 1 / k + lh * (i + 0.5)));
    const gl = this.gl, tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const h = { tex, width: cv.width / k, height: cv.height / k };
    this.textCache.set(key, h);
    return h;
  }
  screenshot() {
    return this.canvas.toDataURL("image/png");
  }
};
var IDENTITY = new Float32Array([1, 0, 0, 1, 0, 0]);
var packColor = (r, g, b, a) => (Math.min(255, a * 255 + 0.5) << 24 | Math.min(255, b * 255 + 0.5) << 16 | Math.min(255, g * 255 + 0.5) << 8 | Math.min(255, r * 255 + 0.5)) >>> 0;

// src/camera.ts
var Camera2D = class {
  constructor(view) {
    this.view = view;
  }
  /** World point at the centre of the view. Leave unset and (0,0) stays the view's top-left corner. */
  center = null;
  prev = null;
  fresh = false;
  zoom = 1;
  angle = 0;
  /** Clamp the visible area to a world rectangle. */
  bounds = null;
  target = null;
  opts = {};
  _shake = new Vec();
  get pos() {
    return this.center ?? new Vec(this.view().width / 2, this.view().height / 2);
  }
  /** Assigning every step stays interpolated. Use cut() to jump without a blend. */
  set pos(v) {
    this.center = toVec(v).clone();
  }
  /** Jump: no blend from the previous frame. */
  cut(v) {
    if (v) this.pos = v;
    this.fresh = true;
    return this;
  }
  follow(e, o = {}) {
    this.target = e;
    this.opts = o;
    if (e) this.cut(e.pos.add(o.offset ?? [0, 0]));
    return this;
  }
  /** @internal Runs before game code, so anything that moves the camera this step gets blended. */
  _snapshot() {
    this.prev = this.center?.clone() ?? null;
  }
  /** @internal */
  _step(dt) {
    if (this.target?.alive) {
      const goal = this.target.worldPos().add(this.opts.offset ?? [0, 0]);
      const sp = this.opts.speed ?? 8;
      this.center = sp ? this.pos.lerp(goal, damp(sp, dt)) : goal.clone();
    }
    if (this.bounds && this.center) {
      const b = this.bounds, v = this.view(), hw = v.width / 2 / this.zoom, hh = v.height / 2 / this.zoom;
      this.center.x = b.width <= hw * 2 ? b.x + b.width / 2 : clamp(this.center.x, b.x + hw, b.x + b.width - hw);
      this.center.y = b.height <= hh * 2 ? b.y + b.height / 2 : clamp(this.center.y, b.y + hh, b.y + b.height - hh);
    }
    if (this.fresh || !this.prev) {
      this.prev = this.center?.clone() ?? null;
      this.fresh = false;
    }
  }
  /** Affine [a,b,c,d,e,f] from world to view units, interpolated by alpha. */
  matrix(alpha) {
    const v = this.view();
    const c = this.prev && this.center ? this.prev.lerp(this.center, alpha) : this.pos;
    const cs = Math.cos(-this.angle) * this.zoom, sn = Math.sin(-this.angle) * this.zoom;
    const x = -(c.x + this._shake.x), y = -(c.y + this._shake.y);
    return new Float32Array([cs, sn, -sn, cs, v.width / 2 + cs * x - sn * y, v.height / 2 + sn * x + cs * y]);
  }
  toWorld(p) {
    const v = this.view(), q = toVec(p);
    return new Vec(q.x - v.width / 2, q.y - v.height / 2).mul(1 / this.zoom).rotate(this.angle).add(this.pos);
  }
  toView(p) {
    const v = this.view();
    return toVec(p).sub(this.pos).rotate(-this.angle).mul(this.zoom).add([v.width / 2, v.height / 2]);
  }
};
var Camera3D = class {
  constructor(viewState) {
    this.viewState = viewState;
  }
  pos = new Vec(0, 5, 10);
  target = new Vec(0, 0, 0);
  up = new Vec(0, 1, 0);
  /** Field of view in degrees. */
  fov = 60;
  /** "min" applies fov to the narrower screen axis so portrait phones don't get tunnel vision; "vertical" is classic. */
  fovAxis = "min";
  near = 0.1;
  far = 500;
  follower = null;
  offset = new Vec(0, 4, 8);
  speed = 6;
  lookOffset = new Vec(0, 1, 0);
  prevPos = this.pos.clone();
  prevTarget = this.target.clone();
  _shake = new Vec();
  viewMat = mat4();
  projMat = mat4();
  viewProj = mat4();
  eye = new Vec();
  look = new Vec();
  /** Set position and look target. Interpolation is reset, so this also works as a cut. */
  set(pos2, target) {
    this.pos.set(pos2);
    if (target) this.target.set(target);
    this.prevPos.set(this.pos);
    this.prevTarget.set(this.target);
    return this;
  }
  /** Chase an entity. `offset` is relative to it in world axes. */
  follow(e, o = {}) {
    this.follower = e;
    if (o.offset) this.offset.set(o.offset);
    if (o.look) this.lookOffset.set(o.look);
    this.speed = o.speed ?? 6;
    if (e) this.set(e.pos.add(this.offset), e.pos.add(this.lookOffset));
    return this;
  }
  /** @internal Runs before game code, so a first-person camera set in update hooks gets blended. */
  _snapshot() {
    this.prevPos.set(this.pos);
    this.prevTarget.set(this.target);
  }
  /** @internal */
  _step(dt) {
    if (this.follower?.alive) {
      const p = this.follower.worldPos(), k = this.speed ? damp(this.speed, dt) : 1;
      this.pos.set(this.pos.lerp(p.add(this.offset), k));
      this.target.set(this.target.lerp(p.add(this.lookOffset), k));
    }
  }
  /** @internal Vertical fov in radians for an aspect ratio. */
  _fovY(aspect) {
    const f = this.fov * Math.PI / 180;
    return this.fovAxis === "min" && aspect < 1 ? 2 * Math.atan(Math.tan(f / 2) / aspect) : f;
  }
  /** Recompute matrices for a blend between the last two steps. */
  update(alpha) {
    const v = this.viewState(), aspect = v.width / v.height;
    this.eye.set(this.prevPos.lerp(this.pos, alpha).add(this._shake));
    this.look.set(this.prevTarget.lerp(this.target, alpha).add(this._shake));
    mat4LookAt(this.viewMat, this.eye, this.look, this.up);
    mat4Perspective(this.projMat, this._fovY(aspect), aspect, this.near, this.far);
    mat4Mul(this.viewProj, this.projMat, this.viewMat);
  }
  /** World point to view units. `visible` is false behind the camera or outside the screen. */
  project(p) {
    this.update(1);
    const v = this.viewState(), w = toVec(p);
    const ndc = mat4Point(this.viewProj, w);
    const behind = this.viewMat[2] * w.x + this.viewMat[6] * w.y + this.viewMat[10] * w.z + this.viewMat[14] > 0;
    return {
      x: lerp(0, v.width, ndc.x * 0.5 + 0.5),
      y: lerp(0, v.height, 0.5 - ndc.y * 0.5),
      depth: ndc.z,
      visible: !behind && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1
    };
  }
  /** Ray through a view point, e.g. the pointer. */
  ray(x, y) {
    this.update(1);
    const v = this.viewState(), inv = mat4();
    mat4Invert(inv, this.viewProj);
    const nx = x / v.width * 2 - 1, ny = 1 - y / v.height * 2;
    const a = mat4Point(inv, new Vec(nx, ny, -1)), b = mat4Point(inv, new Vec(nx, ny, 1));
    return { origin: this.pos.clone(), dir: b.sub(a).norm() };
  }
};

// src/entity.ts
var HOOKS = /* @__PURE__ */ new Set(["id", "requires", "setup", "add", "update", "draw", "destroy"]);
var nextId = 1;
var Entity = class {
  constructor(scene) {
    this.scene = scene;
  }
  id = nextId++;
  name = "";
  tags = /* @__PURE__ */ new Set();
  parent = null;
  children = [];
  alive = true;
  /** Skips drawing, and collisions too. */
  hidden = false;
  /** Skips update hooks. */
  paused = false;
  /** Screen space: ignores the camera and draws above the world. */
  ui = false;
  /** Draw order within 2D; higher is on top. */
  layer = 0;
  opacity = 1;
  /** 2 or 3. Set automatically by whatever draws or collides. */
  dim = 2;
  /** Local unscaled size used for bounds, colliders and hit tests. */
  size = new Vec();
  collider = null;
  body = null;
  tappable = null;
  /** Render-interpolated world matrix. */
  world = mat4();
  _prevPos = new Vec();
  _prevRot = new Vec();
  _order = 0;
  _opacity = 1;
  _pressed = false;
  _bornStep = 0;
  _hooksUpdate = [];
  _hooksDraw = [];
  _comps = /* @__PURE__ */ new Map();
  _listeners = /* @__PURE__ */ new Map();
  _pos = new Vec();
  _rot = new Vec();
  _scale = new Vec(1, 1, 1);
  _color = new Color(1, 1, 1, 1);
  get pos() {
    return this._pos;
  }
  set pos(v) {
    this._pos.set(v);
  }
  /** Euler rotation in radians. In 2D use rot.z or the `angle` shortcut. */
  get rot() {
    return this._rot;
  }
  set rot(v) {
    this._rot.set(v);
  }
  get angle() {
    return this._rot.z;
  }
  set angle(a) {
    this._rot.z = a;
  }
  get scale() {
    return this._scale;
  }
  set scale(v) {
    if (typeof v === "number") this._scale.set(v, v, v);
    else this._scale.set(v);
  }
  get color() {
    return this._color;
  }
  set color(c) {
    this._color = color(c).clone();
  }
  /** Readable identity for logs, errors and state dumps. */
  get label() {
    return this.name || [...this.tags][0] || [...this._comps.keys()][0] || `#${this.id}`;
  }
  /** @internal Apply a component list. */
  _use(list) {
    const pendingAdd = [];
    for (const item2 of list) {
      if (!item2) continue;
      if (typeof item2 === "string") {
        this.tags.add(item2);
        continue;
      }
      if (typeof item2 !== "object" || Array.isArray(item2)) {
        throw new PogoError("BAD_COMPONENT", `add() got ${JSON.stringify(item2)}, which is not a component, tag or object.`, `Positions go through pos(x, y): add([pos(10, 20), rect(8, 8)]). A plain array like [10, 20] is not a component.`);
      }
      this._attach(item2);
      pendingAdd.push(item2);
    }
    for (const c of pendingAdd) {
      for (const r of c.requires ?? []) {
        if (!this._comps.has(r)) throw new PogoError("MISSING_COMPONENT", `Component "${c.id}" on ${this.label} requires "${r}".`, `Add ${r}() to the same add([...]) list. ${suggest(r, this._comps.keys())}`);
      }
    }
    return pendingAdd;
  }
  _attach(c) {
    if (c.id) {
      if (this._comps.has(c.id)) throw new PogoError("DUPLICATE_COMPONENT", `Entity ${this.label} already has component "${c.id}".`, "Each component id can appear once per entity. Use a child entity for a second one.");
      this._comps.set(c.id, c);
    }
    for (const key of Object.keys(c)) {
      if (HOOKS.has(key)) continue;
      const desc = Object.getOwnPropertyDescriptor(c, key);
      if (key in this && typeof this[key] === "function") {
        throw new PogoError("RESERVED_FIELD", `Component field "${key}" on ${this.label} would overwrite the Entity method ${key}().`, `Rename the field. Reserved methods include: on, emit, destroy, get, has, is, child, wait, every.`);
      }
      if (key === "size") this.size.set(desc.value);
      else if ("value" in desc && key in this) this[key] = desc.value;
      else Object.defineProperty(this, key, { ...desc, configurable: true, enumerable: true });
    }
    c.setup?.(this);
    if (c.update) this._hooksUpdate.push([c, c.update]);
    if (c.draw) this._hooksDraw.push([c, c.draw]);
  }
  /** Add a component after creation. */
  use(c) {
    this._attach(c);
    c.add?.call(this, this);
    return this;
  }
  has(id) {
    return this._comps.has(id);
  }
  /** The component object with this id, or undefined. */
  get(id) {
    return this._comps.get(id);
  }
  is(tag) {
    return this.tags.has(tag);
  }
  tag(t) {
    this.tags.add(t);
    return this;
  }
  untag(t) {
    this.tags.delete(t);
    return this;
  }
  on(event, fn) {
    let set = this._listeners.get(event);
    if (!set) this._listeners.set(event, set = /* @__PURE__ */ new Set());
    set.add(fn);
    return () => set.delete(fn);
  }
  emit(event, ...args) {
    const set = this._listeners.get(event);
    if (set) for (const fn of [...set]) fn.apply(this, args);
  }
  /** Run fn when this collides with something; pass a tag to filter. Args: (other, hit). */
  onCollide(tag, fn) {
    if (typeof tag === "function") return this.on("collide", tag);
    return this.on("collide", (o, h) => {
      if (o.is(tag)) fn(o, h);
    });
  }
  onCollideEnd(tag, fn) {
    return this.on("collideEnd", (o) => {
      if (o.is(tag)) fn(o);
    });
  }
  onTap(fn) {
    return this.on("tap", fn);
  }
  onUpdate(fn) {
    const c = {};
    const pair = [c, fn];
    this._hooksUpdate.push(pair);
    return () => {
      this._hooksUpdate = this._hooksUpdate.filter((p) => p !== pair);
    };
  }
  /** Add a child whose transform is relative to this entity. */
  child(list) {
    return this.scene._spawn(list, this);
  }
  /** A timer cancelled automatically when this entity is destroyed. */
  wait(seconds, fn) {
    return this.scene.wait(seconds, fn, this);
  }
  every(seconds, fn) {
    return this.scene.every(seconds, fn, this);
  }
  /** Turn to face a point: yaw and pitch in 3D, angle in 2D. */
  lookAt(target) {
    const d = new Vec().set(target).sub(this.worldPos());
    if (this.dim === 2) this._rot.z = Math.atan2(d.y, d.x);
    else {
      this._rot.y = Math.atan2(-d.x, -d.z);
      this._rot.x = Math.atan2(d.y, Math.hypot(d.x, d.z));
    }
    return this;
  }
  /** Local forward: +x rotated by angle in 2D, -z rotated by yaw and pitch in 3D. */
  forward() {
    if (this.dim === 2) return Vec.fromAngle(this._rot.z);
    const c = Math.cos(this._rot.x);
    return new Vec(-Math.sin(this._rot.y) * c, Math.sin(this._rot.x), -Math.cos(this._rot.y) * c);
  }
  /** Move without render interpolation, so a respawn doesn't streak across the screen. */
  teleport(x, y, z) {
    this._pos.set(x, y, z);
    this._prevPos.set(this._pos);
    return this;
  }
  _localMatrix(m = mat4()) {
    return mat4Compose(m, this._pos, this._rot, this._scale);
  }
  /** @internal Current (non-interpolated) world matrix. */
  _worldMatrix() {
    const m = this._localMatrix();
    return this.parent ? mat4Mul(m, this.parent._worldMatrix(), m) : m;
  }
  worldPos() {
    return this.parent ? mat4Point(this.parent._worldMatrix(), this._pos) : this._pos;
  }
  /** Destroy this entity and its children at the end of the step. */
  destroy() {
    if (!this.alive) return;
    this.alive = false;
    for (const c of this.children) c.destroy();
    for (const c of this._comps.values()) c.destroy?.call(this, this);
    this.emit("destroy");
  }
};

// src/physics.ts
var AXES = ["x", "y", "z"];
var CENTER = ["cx", "cy", "cz"];
var HALF = ["hx", "hy", "hz"];
var SKIN = 1e-4;
function bounds(e) {
  const c = e.collider, p = e.worldPos(), s = e.scale;
  const size = c.size ?? e.size;
  const hx = Math.abs(size.x * s.x * c.scale) / 2, hy = Math.abs(size.y * s.y * c.scale) / 2;
  const hz = e.dim === 3 ? Math.abs(size.z * s.z * c.scale) / 2 : 0;
  return { cx: p.x + c.offset.x, cy: p.y + c.offset.y, cz: e.dim === 3 ? p.z + c.offset.z : 0, hx, hy, hz, r: c.shape === "circle" ? Math.max(hx, hy, hz) : 0 };
}
function overlap(a, b, dim2, eps) {
  if (a.r && b.r) {
    const d = new Vec(a.cx - b.cx, a.cy - b.cy, a.cz - b.cz), len = d.len(), depth = a.r + b.r + eps - len;
    return depth > 0 ? { normal: len > 1e-9 ? d.mul(1 / len) : new Vec(0, -1), depth } : null;
  }
  if (a.r || b.r) {
    const flip = !!b.r;
    const c = flip ? b : a, box = flip ? a : b;
    const near = new Vec(clampTo(c.cx, box.cx, box.hx), clampTo(c.cy, box.cy, box.hy), clampTo(c.cz, box.cz, box.hz));
    const d = new Vec(c.cx - near.x, c.cy - near.y, c.cz - near.z), len = d.len();
    if (len >= c.r + eps) return null;
    if (len < 1e-9) {
      const dx = box.hx - Math.abs(c.cx - box.cx), dy = box.hy - Math.abs(c.cy - box.cy), dz = dim2 === 3 ? box.hz - Math.abs(c.cz - box.cz) : Infinity;
      let n2 = new Vec(Math.sign(c.cx - box.cx) || 1), depth = dx + c.r;
      if (dy < dx && dy <= dz) {
        n2 = new Vec(0, Math.sign(c.cy - box.cy) || 1);
        depth = dy + c.r;
      } else if (dz < dx) {
        n2 = new Vec(0, 0, Math.sign(c.cz - box.cz) || 1);
        depth = dz + c.r;
      }
      return { normal: flip ? n2.mul(-1) : n2, depth };
    }
    const n = d.mul(1 / len);
    return { normal: flip ? n.mul(-1) : n, depth: c.r + eps - len };
  }
  const ox = a.hx + b.hx + eps - Math.abs(a.cx - b.cx);
  const oy = a.hy + b.hy + eps - Math.abs(a.cy - b.cy);
  const oz = dim2 === 3 ? a.hz + b.hz + eps - Math.abs(a.cz - b.cz) : Infinity;
  if (ox <= 0 || oy <= 0 || oz <= 0) return null;
  if (ox <= oy && ox <= oz) return { normal: new Vec(a.cx >= b.cx ? 1 : -1), depth: ox };
  if (oy <= oz) return { normal: new Vec(0, a.cy >= b.cy ? 1 : -1), depth: oy };
  return { normal: new Vec(0, 0, a.cz >= b.cz ? 1 : -1), depth: oz };
}
var clampTo = (v, c, h) => Math.min(c + h, Math.max(c - h, v));
var Grid = class {
  constructor(items, dim2) {
    this.items = items;
    this.dim = dim2;
    let total = 0;
    const list = items.map((e) => {
      const b = bounds(e);
      total += Math.max(b.hx, b.hy, dim2 === 3 ? b.hz : 0, b.r);
      return [e, b];
    });
    this.cell = Math.max(total / Math.max(1, items.length) * 3, 1e-3);
    for (const [e, b] of list) this.insert(e, b);
  }
  cells = /* @__PURE__ */ new Map();
  big = [];
  cell;
  stamp = /* @__PURE__ */ new Map();
  tick = 0;
  key(x, y, z) {
    return Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791) | 0;
  }
  span(b, pad) {
    const c = this.cell, e = pad + b.r, f = (v) => Math.floor(v / c);
    return {
      x0: f(b.cx - b.hx - e),
      x1: f(b.cx + b.hx + e),
      y0: f(b.cy - b.hy - e),
      y1: f(b.cy + b.hy + e),
      z0: this.dim === 3 ? f(b.cz - b.hz - e) : 0,
      z1: this.dim === 3 ? f(b.cz + b.hz + e) : 0
    };
  }
  insert(e, b) {
    const s = this.span(b, 0);
    if ((s.x1 - s.x0 + 1) * (s.y1 - s.y0 + 1) * (s.z1 - s.z0 + 1) > 64) {
      this.big.push(e);
      return;
    }
    for (let x = s.x0; x <= s.x1; x++) for (let y = s.y0; y <= s.y1; y++) for (let z = s.z0; z <= s.z1; z++) {
      const k = this.key(x, y, z);
      let arr = this.cells.get(k);
      if (!arr) this.cells.set(k, arr = []);
      arr.push(e);
    }
  }
  near(b, pad, fn) {
    if (!this.items.length) return;
    const t = ++this.tick, s = this.span(b, pad);
    if ((s.x1 - s.x0 + 1) * (s.y1 - s.y0 + 1) * (s.z1 - s.z0 + 1) > this.items.length) {
      for (const e of this.items) fn(e);
      return;
    }
    const visit = (e) => {
      if (this.stamp.get(e.id) !== t) {
        this.stamp.set(e.id, t);
        fn(e);
      }
    };
    for (const e of this.big) visit(e);
    for (let x = s.x0; x <= s.x1; x++) for (let y = s.y0; y <= s.y1; y++) for (let z = s.z0; z <= s.z1; z++) {
      const arr = this.cells.get(this.key(x, y, z));
      if (arr) for (const e of arr) visit(e);
    }
  }
};
function ignores(a, b) {
  for (const t of a.collider.ignore) if (b.is(t)) return true;
  for (const t of b.collider.ignore) if (a.is(t)) return true;
  return false;
}
function stepPhysics(scene, dt) {
  const all = scene.entities.filter((e) => e.alive && e.collider && !e.hidden);
  for (const dim2 of [2, 3]) {
    const list = all.filter((e) => e.dim === dim2);
    if (!list.length) continue;
    moveBodies(scene, list, dim2, dt);
    separateBodies(list, dim2);
    contacts(scene, list, dim2);
  }
}
function moveBodies(scene, list, dim2, dt) {
  const bodies = list.filter((e) => e.body && !e.collider.sensor && !e.body.frozen);
  const free = list.filter((e) => e.body && e.collider.sensor && !e.body.frozen);
  const solids = list.filter((e) => e.collider.solid && !e.collider.sensor);
  const g = dim2 === 2 ? scene.gravity2 : scene.gravity3;
  const grid = new Grid(solids, dim2);
  for (const e of free) integrate(e, g, dt);
  for (const e of bodies) {
    integrate(e, g, dt);
    const b = e.body, ground = b.groundEntity;
    if (ground?.alive) e.pos.set(e.pos.add(ground.pos.sub(ground._prevPos)));
    e.grounded = false;
    b.groundEntity = null;
    const box = bounds(e);
    const reach = Math.max(Math.min(box.hx || box.r, box.hy || box.r) * 0.9, 1e-3);
    const speed = Math.max(Math.abs(e.vel.x), Math.abs(e.vel.y), Math.abs(e.vel.z)) * dt;
    const steps = Math.min(8, Math.max(1, Math.ceil(speed / reach)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      if (box.r) moveSphere(e, grid, dim2, g, h);
      else for (let a = 0; a < dim2; a++) moveAxis(e, a, grid, dim2, g, h);
    }
    if (e.grounded && b.friction) {
      const k = Math.max(0, 1 - b.friction * dt);
      for (let a = 0; a < dim2; a++) if (g[AXES[a]] === 0) e.vel[AXES[a]] *= k;
    }
  }
}
function integrate(e, g, dt) {
  const b = e.body;
  e.vel.x += g.x * b.gravity * dt;
  e.vel.y += g.y * b.gravity * dt;
  e.vel.z += g.z * b.gravity * dt;
  if (b.drag) {
    const k = Math.max(0, 1 - b.drag * dt);
    e.vel.x *= k;
    e.vel.y *= k;
    e.vel.z *= k;
  }
  if (b.maxSpeed) {
    const l = e.vel.len();
    if (l > b.maxSpeed) e.vel.set(e.vel.mul(b.maxSpeed / l));
  }
  if (e.collider.sensor) {
    e.pos.x += e.vel.x * dt;
    e.pos.y += e.vel.y * dt;
    e.pos.z += e.vel.z * dt;
  }
}
function landed(e, normal, g, other) {
  if (normal.dot(g) < -0.5 * g.len()) {
    e.grounded = true;
    e.body.groundEntity = other;
  }
}
function moveAxis(e, axis, grid, dim2, g, dt) {
  const name = AXES[axis], d = e.vel[name] * dt;
  if (d === 0) return;
  const before = bounds(e);
  e.pos[name] += d;
  grid.near(bounds(e), Math.abs(d) + SKIN, (s) => {
    if (s === e || ignores(e, s)) return;
    const o = bounds(s), cur = bounds(e);
    if (Math.abs(before[CENTER[axis]] - o[CENTER[axis]]) < before[HALF[axis]] + o[HALF[axis]] - SKIN && !s.collider.oneWay) return;
    for (let a = 0; a < dim2; a++) {
      if (Math.abs(cur[CENTER[a]] - o[CENTER[a]]) >= cur[HALF[a]] + o[HALF[a]] - (a === axis ? 0 : SKIN)) return;
    }
    const gap = HALF[axis], ctr = CENTER[axis], sh = o[gap];
    if (s.collider.oneWay) {
      const dir = Math.sign(g[name]);
      if (dir === 0 || Math.sign(d) !== dir) return;
      if ((before[ctr] + dir * before[gap] - (o[ctr] - dir * sh)) * dir > 0.01 * Math.max(1, sh)) return;
    }
    const side = -Math.sign(d);
    e.pos[name] = o[ctr] + side * (sh + cur[gap]) - e.collider.offset[name];
    const n = new Vec();
    n[name] = side;
    const v = e.vel[name];
    e.vel[name] = Math.abs(v) * e.body.bounce > 20 * (dim2 === 2 ? 1 : 0.05) ? -v * e.body.bounce : 0;
    landed(e, n, g, s);
  });
}
function moveSphere(e, grid, dim2, g, dt) {
  e.pos.x += e.vel.x * dt;
  e.pos.y += e.vel.y * dt;
  if (dim2 === 3) e.pos.z += e.vel.z * dt;
  grid.near(bounds(e), 1e-3, (s) => {
    if (s === e || ignores(e, s)) return;
    const hit = overlap(bounds(e), bounds(s), dim2, 0);
    if (!hit) return;
    e.pos.set(e.pos.add(hit.normal.mul(hit.depth)));
    const vn = e.vel.dot(hit.normal);
    if (vn < 0) e.vel.set(e.vel.sub(hit.normal.mul(vn * (1 + (-vn > 20 * (dim2 === 2 ? 1 : 0.05) ? e.body.bounce : 0)))));
    landed(e, hit.normal, g, s);
  });
}
function depenetrate(e, grid, dim2) {
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    grid.near(bounds(e), 0, (s) => {
      if (s === e || s.collider.oneWay || ignores(e, s)) return;
      const hit = overlap(bounds(e), bounds(s), dim2, 0);
      if (!hit || hit.depth <= SKIN) return;
      e.pos.set(e.pos.add(hit.normal.mul(hit.depth)));
      const vn = e.vel.dot(hit.normal);
      if (vn < 0) e.vel.set(e.vel.sub(hit.normal.mul(vn)));
      moved = true;
    });
    if (!moved) return;
  }
}
function separateBodies(list, dim2) {
  const movers = list.filter((e) => e.body && !e.collider.sensor);
  if (!movers.length) return;
  const solids = new Grid(list.filter((e) => e.collider.solid && !e.collider.sensor), dim2);
  if (movers.length < 2) {
    depenetrate(movers[0], solids, dim2);
    return;
  }
  const grid = new Grid(movers, dim2);
  for (const a of movers) {
    grid.near(bounds(a), 0, (b) => {
      if (b.id <= a.id || ignores(a, b)) return;
      const hit = overlap(bounds(a), bounds(b), dim2, 0);
      if (!hit) return;
      const ma = a.body.mass, mb = b.body.mass, total = ma + mb;
      a.pos.set(a.pos.add(hit.normal.mul(hit.depth * mb / total)));
      b.pos.set(b.pos.sub(hit.normal.mul(hit.depth * ma / total)));
      const rel = a.vel.sub(b.vel).dot(hit.normal);
      if (rel < 0) {
        const j = -(1 + Math.min(a.body.bounce, b.body.bounce)) * rel / (1 / ma + 1 / mb);
        a.vel.set(a.vel.add(hit.normal.mul(j / ma)));
        b.vel.set(b.vel.sub(hit.normal.mul(j / mb)));
      }
    });
  }
  for (const e of movers) depenetrate(e, solids, dim2);
}
function contacts(scene, list, dim2) {
  const eps = dim2 === 2 ? 0.5 : 0.02;
  const grid = new Grid(list, dim2);
  const now = scene._contactsNow;
  for (const a of list) {
    if (a.collider.solid && !a.body && !a.collider.watch) continue;
    const ba = bounds(a);
    grid.near(ba, eps, (b) => {
      if (a === b || ignores(a, b)) return;
      if (a.body && b.body && b.id < a.id) return;
      const hit = overlap(ba, bounds(b), dim2, eps);
      if (!hit) return;
      const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
      if (now.has(key)) return;
      now.set(key, [a, b, hit]);
    });
  }
}
function flushContacts(scene) {
  const now = scene._contactsNow, prev = scene._contactsPrev;
  for (const [key, [a, b, hit]] of now) {
    if (prev.has(key)) continue;
    if (a.alive && b.alive) a.emit("collide", b, { other: b, normal: hit.normal, depth: hit.depth });
    if (a.alive && b.alive) b.emit("collide", a, { other: a, normal: hit.normal.mul(-1), depth: hit.depth });
  }
  for (const [key, [a, b]] of prev) {
    if (now.has(key)) continue;
    if (a.alive) a.emit("collideEnd", b);
    if (b.alive) b.emit("collideEnd", a);
  }
  scene._contactsPrev = now;
  scene._contactsNow = /* @__PURE__ */ new Map();
}
function queryDim(scene, usesZ) {
  let has2 = false, has3 = false;
  for (const e of scene.entities) if (e.collider) {
    if (e.dim === 3) has3 = true;
    else has2 = true;
  }
  return has3 && !has2 ? 3 : has2 && !has3 ? 2 : usesZ ? 3 : 2;
}
function raycast(scene, origin, dir, o = {}) {
  const from = toVec(origin), d = toVec(dir).norm(), max = o.max ?? Infinity;
  const dim2 = o.dim ?? queryDim(scene, from.z !== 0 || d.z !== 0);
  const skip = new Set(Array.isArray(o.ignore) ? o.ignore : o.ignore ? [o.ignore] : []);
  let best = null;
  for (const e of scene.entities) {
    if (!e.alive || !e.collider || e.hidden || e.dim !== dim2 || skip.has(e)) continue;
    if (o.tag && !e.is(o.tag)) continue;
    const hit = rayBounds(from, d, bounds(e), dim2);
    if (hit && hit.dist <= max && (!best || hit.dist < best.dist)) best = { entity: e, ...hit };
  }
  return best;
}
function rayBounds(o, d, b, dim2) {
  if (b.r) {
    const c2 = new Vec(b.cx, b.cy, b.cz), oc = o.sub(c2), bq = oc.dot(d), disc = bq * bq - (oc.dot(oc) - b.r * b.r);
    if (disc < 0) return null;
    const t = -bq - Math.sqrt(disc);
    if (t < 0) return null;
    const point = o.add(d.mul(t));
    return { dist: t, point, normal: point.sub(c2).norm() };
  }
  let t0 = 0, t1 = Infinity, axis = -1;
  const c = [b.cx, b.cy, b.cz], h = [b.hx, b.hy, b.hz], p = [o.x, o.y, o.z], v = [d.x, d.y, d.z];
  for (let i = 0; i < dim2; i++) {
    if (Math.abs(v[i]) < 1e-12) {
      if (Math.abs(p[i] - c[i]) > h[i]) return null;
      continue;
    }
    let a = (c[i] - h[i] - p[i]) / v[i], z = (c[i] + h[i] - p[i]) / v[i];
    if (a > z) [a, z] = [z, a];
    if (a > t0) {
      t0 = a;
      axis = i;
    }
    t1 = Math.min(t1, z);
    if (t0 > t1) return null;
  }
  const normal = new Vec();
  if (axis >= 0) normal[AXES[axis]] = -Math.sign(v[axis]);
  return { dist: t0, point: o.add(d.mul(t0)), normal };
}
function overlapQuery(scene, at, shape) {
  const p = toVec(at), dim2 = shape.dim ?? queryDim(scene, p.z !== 0);
  const s = shape.size ? toVec(shape.size) : new Vec();
  const q = { cx: p.x, cy: p.y, cz: dim2 === 3 ? p.z : 0, hx: s.x / 2, hy: s.y / 2, hz: dim2 === 3 ? s.z / 2 : 0, r: shape.radius ?? 0 };
  return scene.entities.filter((e) => e.alive && e.collider && !e.hidden && e.dim === dim2 && (!shape.tag || e.is(shape.tag)) && overlap(q, bounds(e), dim2, 0));
}
var entityBounds = bounds;

// src/scene.ts
var MAX_PARTICLES = 1500;
var Scene = class {
  constructor(game, name) {
    this.game = game;
    this.name = name;
    this.cam = new Camera2D(() => game.view);
    this.cam3 = new Camera3D(() => game.view);
  }
  /** Every live entity, including children. */
  entities = [];
  cam;
  cam3;
  light = {
    dir: new Vec(-0.5, -1, -0.35),
    color: new Color(0.85, 0.82, 0.74),
    sky: new Color(0.62, 0.68, 0.78),
    ground: new Color(0.36, 0.33, 0.3),
    shadows: true,
    shadowRange: 24,
    fog: null
  };
  /** Gravity for 2D bodies, in units/s². y is down. */
  gravity2 = new Vec(0, 1400);
  /** Gravity for 3D bodies, in units/s². y is up. */
  gravity3 = new Vec(0, -24, 0);
  /** Seconds this scene has simulated. */
  time = 0;
  /** Stops timers, tweens, physics and non-UI updates. UI keeps working so pause menus function. */
  paused = false;
  /** Override the game's background for this scene: one color, or [top, bottom] for a gradient. */
  background = null;
  _contactsNow = /* @__PURE__ */ new Map();
  _contactsPrev = /* @__PURE__ */ new Map();
  timers = [];
  tweens = [];
  updaters = [];
  drawers = [];
  uiDrawers = [];
  listeners = /* @__PURE__ */ new Map();
  particles = [];
  shakeAmt = 0;
  shakeLeft = 0;
  shakeDur = 0;
  flashColor = null;
  flashLeft = 0;
  flashDur = 0;
  pressedEntity = null;
  order = 0;
  get input() {
    return this.game.input;
  }
  get rng() {
    return this.game.rng;
  }
  get view() {
    return this.game.view;
  }
  get assets() {
    return this.game.assets;
  }
  /** Play a sound. */
  sfx(s) {
    this.game.sfx(s);
  }
  // --- Entities ---------------------------------------------------------------------
  add(list) {
    return this._spawn(list, null);
  }
  /** @internal */
  _spawn(list, parent) {
    if (!Array.isArray(list)) throw new PogoError("BAD_COMPONENT", "add() takes an array of components.", "Write add([rect(10, 10), pos(5, 5)]), not add(rect(10, 10)).");
    const e = new Entity(this);
    e._bornStep = this.game.stepCount;
    e.parent = parent;
    if (parent) {
      e.dim = parent.dim;
      e.ui = parent.ui;
      parent.children.push(e);
    }
    const comps = e._use(list);
    e._prevPos.set(e.pos);
    e._prevRot.set(e.rot);
    this.entities.push(e);
    for (const c of comps) c.add?.call(e, e);
    return e;
  }
  /** All live entities with this tag or name. */
  find(tag) {
    return this.entities.filter((e) => e.alive && (e.is(tag) || e.name === tag));
  }
  /** First live entity with this tag or name. */
  first(tag) {
    return this.entities.find((e) => e.alive && (e.is(tag) || e.name === tag));
  }
  /** Build a grid of entities from text. "." and " " are empty. */
  tilemap(map, o) {
    const rows2 = (typeof map === "string" ? map.split("\n") : map).map((r) => r.trim()).filter((r) => r.length);
    const out = [], plane = o.plane ?? "xy", x0 = o.x ?? 0, y0 = o.y ?? 0, z0 = o.z ?? 0, s = o.size;
    rows2.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (ch === "." || ch === " ") return;
        const def = o.legend[ch];
        if (def === void 0) throw new PogoError("BAD_TILE", `Tilemap row ${r} uses "${ch}", which is not in the legend.`, `Legend has: ${Object.keys(o.legend).join(" ")}. "." and space are empty.`);
        const list = typeof def === "function" ? def(c, r) : def;
        const p = plane === "xy" ? new Vec(x0 + (c + 0.5) * s, y0 + (r + 0.5) * s, 0) : new Vec(x0 + (c + 0.5) * s, y0, z0 + (r + 0.5) * s);
        const e = this.add(list);
        e.teleport(e.pos.add(p));
        out.push(e);
      });
    });
    const cols = Math.max(0, ...rows2.map((r) => r.length));
    return { entities: out, width: cols * s, height: rows2.length * s, cols, rows: rows2.length };
  }
  // --- Time ----------------------------------------------------------------------------
  /** Run fn after a delay, in simulated seconds. Cancelled by leaving the scene. */
  wait(seconds, fn, owner = null) {
    const t = { left: seconds, repeat: 0, fn, owner, dead: false };
    this.timers.push(t);
    return { cancel: () => {
      t.dead = true;
    } };
  }
  every(seconds, fn, owner = null) {
    if (seconds <= 0) throw new PogoError("BAD_TIMER", "every() needs a positive interval.");
    const t = { left: seconds, repeat: seconds, fn, owner, dead: false };
    this.timers.push(t);
    return { cancel: () => {
      t.dead = true;
    } };
  }
  /**
   * Animate numeric fields: tween(e, { opacity: 0, scale: 2, pos: [10, 20] }, 0.3, { ease: "outQuad" }).
   * Vec fields tween per-axis. Tweens on an entity stop when it is destroyed.
   */
  tween(target, to, seconds, o = {}) {
    const tw = { tracks: null, spec: [target, to], t: 0, dur: Math.max(seconds, 1e-6), delay: o.delay ?? 0, ease: easings[o.ease ?? "outQuad"], onDone: o.onDone, owner: target instanceof Entity ? target : null, dead: false, yoyo: o.yoyo ?? false, loop: o.loop ?? false };
    if (!tw.ease) throw new PogoError("BAD_EASE", `Unknown easing "${o.ease}".`, `Known: ${Object.keys(easings).join(", ")}.`);
    this.tweens.push(tw);
    return { cancel: () => {
      tw.dead = true;
    } };
  }
  tracks(target, to) {
    const out = [];
    for (const key of Object.keys(to)) {
      const cur = target[key], goal = to[key];
      if (cur instanceof Vec) {
        const g = typeof goal === "number" ? new Vec(goal, goal, goal) : toVec(goal);
        for (const a of ["x", "y", "z"]) if (g[a] !== cur[a]) out.push({ obj: cur, key: a, from: cur[a], to: g[a] });
      } else if (typeof cur === "number" && typeof goal === "number") out.push({ obj: target, key, from: cur, to: goal });
      else throw new PogoError("BAD_TWEEN", `Cannot tween "${key}" (${typeof cur} to ${typeof goal}).`, "Only numbers and Vec fields can be tweened.");
    }
    return out;
  }
  onUpdate(fn) {
    this.updaters.push(fn);
    return () => {
      this.updaters = this.updaters.filter((f) => f !== fn);
    };
  }
  /** Immediate-mode drawing in 2D world coordinates, after entities. */
  onDraw(fn) {
    this.drawers.push(fn);
    return () => {
      this.drawers = this.drawers.filter((f) => f !== fn);
    };
  }
  /** Immediate-mode drawing in view coordinates, above everything. */
  onDrawUI(fn) {
    this.uiDrawers.push(fn);
    return () => {
      this.uiDrawers = this.uiDrawers.filter((f) => f !== fn);
    };
  }
  on(event, fn) {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, set = /* @__PURE__ */ new Set());
    set.add(fn);
    return () => set.delete(fn);
  }
  emit(event, ...args) {
    const set = this.listeners.get(event);
    if (set) for (const fn of [...set]) fn(...args);
  }
  // --- Queries --------------------------------------------------------------------------
  raycast(origin, dir, o) {
    return raycast(this, origin, dir, o);
  }
  overlap(at, shape) {
    return overlapQuery(this, at, shape);
  }
  /** First 3D collider under a view point, e.g. the pointer. */
  pick(x, y, o = {}) {
    const r = this.cam3.ray(x, y);
    return raycast(this, r.origin, r.dir, { ...o, dim: 3 });
  }
  // --- Effects ---------------------------------------------------------------------------
  burst(o) {
    const fx = this.game.fxRng;
    const at = o.at instanceof Entity ? o.at.worldPos() : toVec(o.at), dim2 = o.dim ?? (o.at instanceof Entity ? o.at.dim : this.dominantDim());
    const pick = (v, d) => {
      const r = v === void 0 ? d : typeof v === "number" ? [v, v] : v;
      return fx.range(r[0], r[1]);
    };
    const colors = (Array.isArray(o.color) && typeof o.color[0] !== "number" ? o.color : [o.color ?? "#ffffff"]).map(color);
    const big = dim2 === 3 ? 0.05 : 1;
    for (let i = 0; i < (o.count ?? 14); i++) {
      const sp = pick(o.speed, [60 * big, 200 * big]), life = pick(o.life, [0.3, 0.7]);
      let v;
      if (dim2 === 3) v = new Vec(fx.range(-1, 1), fx.range(-1, 1), fx.range(-1, 1)).norm().mul(sp);
      else v = Vec.fromAngle(o.angle === void 0 ? fx.range(Math.PI * 2) : o.angle + fx.range(-(o.spread ?? 0.5), o.spread ?? 0.5), sp);
      const size = pick(o.size, [2 * big * 3, 5 * big * 3]);
      this.particles.push({ x: at.x, y: at.y, z: at.z, vx: v.x, vy: v.y, vz: v.z, life, max: life, s0: size, s1: 0, c: fx.pick(colors), g: o.gravity ?? 0, dim: dim2 });
    }
    if (this.particles.length > MAX_PARTICLES) this.particles.splice(0, this.particles.length - MAX_PARTICLES);
  }
  dominantDim() {
    return this.entities.some((e) => e.dim === 3) ? 3 : 2;
  }
  /** Shake both cameras. `amount` is world units at the start. */
  shake(amount, seconds = 0.3) {
    this.shakeAmt = amount ?? (this.dominantDim() === 3 ? 0.25 : 6);
    this.shakeLeft = this.shakeDur = seconds;
  }
  /** Flash the whole screen and fade out. */
  flash(c = "#ffffff", seconds = 0.2) {
    this.flashColor = color(c);
    this.flashLeft = this.flashDur = seconds;
  }
  // --- Simulation ---------------------------------------------------------------------------
  /** @internal */
  _step(dt) {
    for (const e of this.entities) {
      e._prevPos.set(e.pos);
      e._prevRot.set(e.rot);
    }
    this.cam._snapshot();
    this.cam3._snapshot();
    this.dispatchTaps();
    const run = !this.paused;
    if (run) {
      this.time += dt;
      this.stepTimers(dt);
      this.stepTweens(dt);
      for (const fn of [...this.updaters]) fn(dt);
    }
    const count = this.entities.length;
    for (let i = 0; i < count; i++) {
      const e = this.entities[i];
      if (!e.alive || e.paused || !run && !e.ui) continue;
      for (const [, fn] of e._hooksUpdate) {
        fn.call(e, dt, e);
        if (!e.alive) break;
      }
    }
    if (run) {
      stepPhysics(this, dt);
      flushContacts(this);
      this.stepParticles(dt);
    }
    this.cam._step(dt);
    this.cam3._step(dt);
    this.stepEffects(dt);
    for (const e of this.entities) {
      if (e.alive && !e.pos.isFinite()) throw new PogoError("NAN_POSITION", `Entity ${e.label} has a non-finite position ${e.pos}.`, "Look for a division by zero or an undefined value in the code that moves it.");
    }
    if (this.entities.some((e) => !e.alive)) {
      this.entities = this.entities.filter((e) => e.alive);
      for (const e of this.entities) if (e.children.some((c) => !c.alive)) e.children = e.children.filter((c) => c.alive);
    }
  }
  stepTimers(dt) {
    for (const t of [...this.timers]) {
      if (t.dead || t.owner && !t.owner.alive) {
        t.dead = true;
        continue;
      }
      t.left -= dt;
      while (t.left <= 1e-9 && !t.dead) {
        t.fn();
        if (t.repeat) t.left += t.repeat;
        else t.dead = true;
      }
    }
    this.timers = this.timers.filter((t) => !t.dead);
  }
  stepTweens(dt) {
    for (const tw of [...this.tweens]) {
      if (tw.dead || tw.owner && !tw.owner.alive) {
        tw.dead = true;
        continue;
      }
      if (tw.delay > 0) {
        tw.delay -= dt;
        continue;
      }
      tw.tracks ??= this.tracks(tw.spec[0], tw.spec[1]);
      tw.t += dt;
      const p = Math.min(1, tw.t / tw.dur), k = tw.ease(p);
      for (const t of tw.tracks) t.obj[t.key] = t.from + (t.to - t.from) * k;
      if (p >= 1) {
        if (tw.yoyo) {
          for (const t of tw.tracks) [t.from, t.to] = [t.to, t.from];
        }
        if (tw.loop) tw.t = 0;
        else if (tw.yoyo) {
          tw.yoyo = false;
          tw.t = 0;
        } else {
          tw.dead = true;
          tw.onDone?.();
        }
      }
    }
    this.tweens = this.tweens.filter((t) => !t.dead);
  }
  stepParticles(dt) {
    const g2 = this.gravity2, g3 = this.gravity3;
    for (const p of this.particles) {
      const g = p.dim === 3 ? g3 : g2;
      p.vx += g.x * p.g * dt;
      p.vy += g.y * p.g * dt;
      p.vz += g.z * p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.life -= dt;
    }
    if (this.particles.some((p) => p.life <= 0)) this.particles = this.particles.filter((p) => p.life > 0);
  }
  stepEffects(dt) {
    const fx = this.game.fxRng;
    if (this.shakeLeft > 0) {
      this.shakeLeft -= dt;
      const a = this.shakeAmt * Math.max(0, this.shakeLeft / this.shakeDur);
      this.cam._shake.set(fx.range(-a, a), fx.range(-a, a), 0);
      this.cam3._shake.set(fx.range(-a, a), fx.range(-a, a), 0);
    } else {
      this.cam._shake.set(0, 0, 0);
      this.cam3._shake.set(0, 0, 0);
    }
    if (this.flashLeft > 0) this.flashLeft -= dt;
  }
  /** @internal Topmost tappable at a view point. */
  _hitTappable(x, y) {
    const scale2 = this.game.view.scale, min = 44 / scale2;
    let best = null;
    const rank = (e) => (e.ui ? 1e6 : 0) + e.layer;
    for (const e of this.entities) {
      if (!e.alive || !e.tappable || e.hidden || this.paused && !e.ui) continue;
      if (best && rank(e) < rank(best)) continue;
      const hit = this.hitTest(e, x, y, min);
      if (hit) best = e;
    }
    return best;
  }
  hitTest(e, x, y, min) {
    if (e.dim === 3) {
      const r = this.cam3.ray(x, y), p2 = e.worldPos(), s = e.size, sc = e.scale;
      return !!rayBounds(r.origin, r.dir, { cx: p2.x, cy: p2.y, cz: p2.z, hx: s.x * sc.x / 2, hy: s.y * sc.y / 2, hz: s.z * sc.z / 2, r: 0 }, 3);
    }
    const q = e.ui ? new Vec(x, y) : this.cam.toWorld(new Vec(x, y)), p = e.worldPos(), pad = e.tappable.pad;
    const zoom = e.ui ? 1 : this.cam.zoom;
    const hw = Math.max(Math.abs(e.size.x * e.scale.x), min / zoom) / 2 + pad, hh = Math.max(Math.abs(e.size.y * e.scale.y), min / zoom) / 2 + pad;
    return Math.abs(q.x - p.x) <= hw && Math.abs(q.y - p.y) <= hh;
  }
  dispatchTaps() {
    const input = this.game.input, raw = input._raw();
    if (raw.pressed) {
      const top = this._hitTappable(raw.x, raw.y);
      if (top) {
        this.pressedEntity = top;
        top._pressed = true;
      }
    }
    const e = this.pressedEntity;
    if (!e) return;
    input.consumePointer();
    if (raw.released) {
      this.pressedEntity = null;
      e._pressed = false;
      if (e.alive && this._hitTappable(raw.x, raw.y) === e) e.emit("tap");
    }
  }
  // --- Rendering -------------------------------------------------------------------------------
  walk(e, parent, opacity2, alpha, out) {
    if (!e.alive || e.hidden) return;
    const blendRot = Math.abs(e.rot.y - e._prevRot.y) < 3 && Math.abs(e.rot.x - e._prevRot.x) < 3 && Math.abs(e.rot.z - e._prevRot.z) < 3;
    const p = e._prevPos.lerp(e.pos, alpha), r = blendRot ? e._prevRot.lerp(e.rot, alpha) : e.rot;
    mat4Compose(e.world, p, r, e.scale);
    if (parent) mat4Mul(e.world, parent, e.world);
    e._opacity = opacity2 * e.opacity;
    e._order = this.order++;
    out.push(e);
    for (const c of e.children) this.walk(c, e.world, e._opacity, alpha, out);
  }
  /** @internal */
  _render(alpha, d) {
    const g = this.game, r = g.renderer, view = g.view;
    const list = [];
    this.order = 0;
    for (const e of this.entities) if (!e.parent) this.walk(e, null, 1, alpha, list);
    const bg = this.background ?? g.background;
    const pair = Array.isArray(bg) && typeof bg[0] !== "number";
    r.beginFrame(view, color(pair ? bg[0] : bg), pair ? color(bg[1]) : null, g.letterbox);
    const three = list.filter((e) => e.dim === 3 && e._hooksDraw.length);
    const hasParticles3 = this.particles.some((p) => p.dim === 3);
    if (three.length || hasParticles3) {
      this.cam3.update(alpha);
      for (const e of three) {
        d.begin(e);
        for (const [, fn] of e._hooksDraw) fn.call(e, d, e);
      }
      d.reset();
      for (const p of this.particles) {
        if (p.dim !== 3) continue;
        const k = p.life / p.max, s = p.s1 + (p.s0 - p.s1) * k;
        const m = mat4Compose(new Float32Array(16), new Vec(p.x, p.y, p.z), new Vec(), new Vec(s, s, s));
        d.mesh("box", m, { size: UNIT, color: p.c, unlit: true, castShadow: false });
      }
      r.render3D({ viewProj: this.cam3.viewProj, eye: this.cam3.eye, look: this.cam3.look }, this.light);
    }
    const byLayer = (a, b) => a.layer - b.layer || a._order - b._order;
    const draw2 = (items) => {
      for (const e of items) {
        d.begin(e);
        for (const [, fn] of e._hooksDraw) fn.call(e, d, e);
      }
    };
    r.begin2D(this.cam.matrix(alpha));
    draw2(list.filter((e) => e.dim === 2 && !e.ui && e._hooksDraw.length).sort(byLayer));
    d.reset();
    for (const p of this.particles) {
      if (p.dim !== 2) continue;
      const k = p.life / p.max;
      d.circle((p.s1 + (p.s0 - p.s1) * k) / 2, { x: p.x, y: p.y, color: p.c, opacity: Math.min(1, k * 2) });
    }
    for (const fn of this.drawers) fn(d);
    if (g.debug) this.drawDebug(d, list);
    r.begin2D(null);
    draw2(list.filter((e) => e.dim === 2 && e.ui && e._hooksDraw.length).sort(byLayer));
    d.reset();
    for (const fn of this.uiDrawers) fn(d);
    g.touch.draw(d);
    d.reset();
    if (this.flashLeft > 0 && this.flashColor) d.rect(view.width, view.height, { x: view.width / 2, y: view.height / 2, color: this.flashColor, opacity: this.flashLeft / this.flashDur });
  }
  drawDebug(d, list) {
    for (const e of list) {
      if (!e.collider || e.dim !== 2) continue;
      const b = entityBounds(e);
      d.rect(b.hx * 2, b.hy * 2, { x: b.cx, y: b.cy, color: e.collider.sensor ? "#22d3ee" : e.collider.solid ? "#f97316" : "#22c55e", outline: 1, opacity: 0.9, radius: b.r });
    }
  }
};
var UNIT = new Vec(1, 1, 1);

// src/touch.ts
var STICK_RADIUS = 52;
var KNOB_RADIUS = 24;
var BUTTON_RADIUS = 36;
var MARGIN = 20;
var GAP = 14;
var TouchControls = class {
  constructor(game, o) {
    this.game = game;
    this.o = o;
    this.buttons = (o.buttons ?? []).map((b) => typeof b === "string" ? { action: b } : b);
  }
  stickId = null;
  lookId = null;
  origin = { x: 0, y: 0 };
  knob = { x: 0, y: 0 };
  held = /* @__PURE__ */ new Map();
  buttons;
  /** Hide and disable all on-screen controls, e.g. in menus. */
  enabled = true;
  /** Replace the controls, usually from a scene function. Pass {} for none. */
  set(o) {
    this.o = o;
    this.buttons = (o.buttons ?? []).map((b) => typeof b === "string" ? { action: b } : b);
    return this;
  }
  get lookActive() {
    return !!this.o.look;
  }
  /** Actions a touch player can trigger. */
  get provides() {
    const out = new Set(this.buttons.map((b) => b.action));
    if (this.o.stick) for (const a of ["left", "right", "up", "down"]) out.add(a);
    return out;
  }
  /** Button centres and radius, in view units. Also used by the layout audit. */
  layout() {
    const v = this.game.view, s = 1 / v.scale;
    const r = BUTTON_RADIUS * s;
    const cx = v.width - v.safe.right - (MARGIN + BUTTON_RADIUS) * s, base = v.height - v.safe.bottom - (MARGIN + BUTTON_RADIUS) * s;
    return this.buttons.map((b, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      return { ...b, x: cx - col * (2 * r + GAP * s), y: base - row * (2 * r + GAP * s) - (col ? r * 0.8 : 0), r };
    });
  }
  stickHome() {
    const v = this.game.view, s = 1 / v.scale;
    return { x: v.safe.left + (MARGIN + STICK_RADIUS + 12) * s, y: v.height - v.safe.bottom - (MARGIN + STICK_RADIUS + 12) * s };
  }
  /** Returns true if a control took this pointer, so gameplay never sees it. */
  pointerDown(id, x, y) {
    if (!this.game.input.touchMode || !this.enabled) return false;
    const input = this.game.input;
    for (const b of this.layout()) {
      const reach = b.r * 1.15;
      if (Math.hypot(x - b.x, y - b.y) <= reach) {
        this.held.set(id, b.action);
        input.codeDown(`touch:${b.action}`);
        return true;
      }
    }
    const v = this.game.view;
    if (this.o.stick && this.stickId === null && x < v.width / 2 && y > v.height * 0.35) {
      if (this.game.current?._hitTappable(x, y)) return false;
      this.stickId = id;
      this.origin = { x, y };
      this.knob = { x, y };
      return true;
    }
    if (this.o.look && this.lookId === null && x >= v.width / 2) {
      this.lookId = id;
      return false;
    }
    return false;
  }
  pointerMove(id, x, y) {
    if (id !== this.stickId) return;
    const v = this.game.view, max = STICK_RADIUS / v.scale;
    const dx = x - this.origin.x, dy = y - this.origin.y, len = Math.hypot(dx, dy);
    const k = len > max ? max / len : 1;
    this.knob = { x: this.origin.x + dx * k, y: this.origin.y + dy * k };
    const nx = dx * k / max, ny = dy * k / max;
    const dead = len / max < 0.15;
    this.game.input.setStick(dead ? 0 : nx, dead ? 0 : ny);
    this.digital("left", !dead && nx < -0.35);
    this.digital("right", !dead && nx > 0.35);
    this.digital("up", !dead && ny < -0.5);
    this.digital("down", !dead && ny > 0.5);
  }
  digital(action, on) {
    if (on) this.game.input.codeDown(`touch:${action}`);
    else this.game.input.codeUp(`touch:${action}`);
  }
  pointerUp(id) {
    const action = this.held.get(id);
    if (action) {
      this.held.delete(id);
      if (![...this.held.values()].includes(action)) this.game.input.codeUp(`touch:${action}`);
    }
    if (id === this.stickId) {
      this.stickId = null;
      this.game.input.setStick(0, 0);
      for (const a of ["left", "right", "up", "down"]) this.digital(a, false);
    }
    if (id === this.lookId) this.lookId = null;
  }
  reset() {
    this.held.clear();
    this.stickId = this.lookId = null;
  }
  draw(d) {
    if (!this.game.input.touchMode || !this.enabled) return;
    const s = 1 / this.game.view.scale;
    d.reset();
    if (this.o.stick) {
      const c = this.stickId !== null ? this.origin : this.stickHome();
      const k = this.stickId !== null ? this.knob : c;
      const a = this.stickId !== null ? 0.5 : 0.28;
      d.circle(STICK_RADIUS * s, { x: c.x, y: c.y, color: [1, 1, 1, a * 0.5] });
      d.circle(STICK_RADIUS * s, { x: c.x, y: c.y, color: [1, 1, 1, a], outline: 2 * s });
      d.circle(KNOB_RADIUS * s, { x: k.x, y: k.y, color: [1, 1, 1, a + 0.2] });
    }
    for (const b of this.layout()) {
      const on = [...this.held.values()].includes(b.action);
      d.circle(b.r, { x: b.x, y: b.y, color: [1, 1, 1, on ? 0.5 : 0.22] });
      d.circle(b.r, { x: b.x, y: b.y, color: [1, 1, 1, 0.6], outline: 2 * s });
      d.text(b.label ?? b.action.slice(0, 4).toUpperCase(), { x: b.x, y: b.y, size: 15 * s, color: "white", bold: true });
    }
  }
};

// src/view.ts
function computeView(o, screen) {
  const W = screen.width, H = screen.height;
  const landscape = W > H;
  const base = landscape && o.landscape ? o.landscape : { width: o.width ?? 360, height: o.height ?? 640 };
  const fit = o.fit ?? "expand";
  let scale2 = Math.min(W / base.width, H / base.height);
  let width = base.width, height = base.height;
  if (fit === "integer") {
    scale2 = Math.max(1, Math.floor(scale2 * screen.dpr)) / screen.dpr;
  } else if (fit === "expand") {
    width = W / scale2;
    height = H / scale2;
    const a = width / height;
    if (o.maxAspect && a > o.maxAspect) width = height * o.maxAspect;
    if (o.minAspect && a < o.minAspect) height = width / o.minAspect;
  }
  const x = (W - width * scale2) / 2, y = (H - height * scale2) / 2;
  const inset = (v, gap) => Math.max(0, v - gap) / scale2;
  return {
    width,
    height,
    scale: scale2,
    x,
    y,
    screen,
    safe: {
      top: inset(screen.safe.top, y),
      bottom: inset(screen.safe.bottom, y),
      left: inset(screen.safe.left, x),
      right: inset(screen.safe.right, x)
    },
    orientation: landscape ? "landscape" : "portrait"
  };
}
var NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
var DEVICES = {
  "phone-small": { width: 320, height: 568, dpr: 2, safe: NO_INSETS },
  "phone": { width: 390, height: 844, dpr: 3, safe: { top: 47, right: 0, bottom: 34, left: 0 } },
  "phone-landscape": { width: 844, height: 390, dpr: 3, safe: { top: 0, right: 47, bottom: 21, left: 47 } },
  "tablet": { width: 820, height: 1180, dpr: 2, safe: { top: 24, right: 0, bottom: 20, left: 0 } },
  "desktop": { width: 1440, height: 900, dpr: 1, safe: NO_INSETS }
};

// src/game.ts
var Game = class {
  constructor(options = {}) {
    this.options = options;
    this.headless = options.headless ?? typeof document === "undefined";
    this.seed = options.seed ?? 1;
    this.rng = new Rng(this.seed);
    this.fxRng = new Rng(this.seed ^ 1540483477);
    this.dt = 1 / (options.hz ?? 60);
    this.background = options.background ?? "#10141c";
    this.letterbox = color(options.letterbox ?? "#000000");
    this.debug = options.debug ?? false;
    this.touch = new TouchControls(this, options.touch ?? {});
    this.assets = new Assets(this);
    this.audio = new Audio(this);
    this.input = new Input(this, options.actions);
    this.draw = new Draw(this);
    if (this.headless) {
      const s = options.screen ?? "phone";
      this.screen = typeof s === "string" ? DEVICES[s] : s;
      if (!this.screen) throw new PogoError("UNKNOWN_DEVICE", `Unknown screen "${String(s)}".`, suggest(String(s), Object.keys(DEVICES)));
      this.input.touchMode = this.screen.width < 900;
      this.renderer = new NullRenderer();
    } else {
      this.canvas = this.setupCanvas();
      this.screen = this.readScreen();
      try {
        this.renderer = new GLRenderer(this.canvas, { pixelArt: options.pixelArt ?? false, maxDpr: options.maxDpr ?? 2 });
      } catch (err) {
        this.showError(err);
        throw err;
      }
      this.bindDOM();
    }
    this.view = computeView(options.view ?? {}, this.screen);
    globalThis.__pogo = this;
  }
  headless;
  renderer;
  input;
  touch;
  assets;
  audio;
  /** Gameplay randomness. Same seed, same sequence. */
  rng;
  /** Cosmetic randomness, separate so that effects never change gameplay. */
  fxRng;
  /** Free-form game state that survives scene changes and shows up in game.state(). Put score here. */
  data = {};
  view;
  current = null;
  currentName = "";
  /** Fixed steps simulated since start. */
  stepCount = 0;
  debug;
  dt;
  /** Errors caught during play. */
  errors = [];
  background;
  letterbox;
  /** @internal */
  _alpha = 1;
  _mouseLook = false;
  scenes = /* @__PURE__ */ new Map();
  draw;
  screen;
  canvas = null;
  currentArgs;
  nextScene = null;
  fade = { t: 0, dur: 0, phase: 0 };
  accumulator = 0;
  lastTime = 0;
  running = false;
  inStep = false;
  slowFrames = 0;
  fastFrames = 0;
  frameTime = 0;
  overlay = null;
  listeners = /* @__PURE__ */ new Map();
  seed;
  memory = /* @__PURE__ */ new Map();
  // --- Scene flow -----------------------------------------------------------------
  /** Define a scene. */
  scene(name, fn) {
    this.scenes.set(name, fn);
    return this;
  }
  /** Switch scene; args reach the scene function. With { fade }, crossfades through black over that many seconds. */
  go(name, args, o = {}) {
    if (!this.scenes.has(name)) throw new PogoError("UNKNOWN_SCENE", `No scene named "${name}".`, suggest(name, this.scenes.keys()));
    if (this.fade.phase === 1) return;
    if (o.fade) {
      this.nextScene = { name, args };
      this.fade = { t: 0, dur: o.fade / 2, phase: 1 };
      return;
    }
    this.nextScene = { name, args };
    if (!this.inStep) this.applyScene();
  }
  applyScene() {
    const n = this.nextScene;
    this.nextScene = null;
    this.input.reset();
    this.input.used.clear();
    this.current = new Scene(this, n.name);
    this.currentName = n.name;
    this.currentArgs = n.args;
    this.scenes.get(n.name)(this.current, n.args ?? {});
    this.emit("scene", n.name);
  }
  /** Wait for assets, enter the first scene, and start the loop (browser). Headless games step manually. */
  start(name, args) {
    if (!this.scenes.has(name)) throw new PogoError("UNKNOWN_SCENE", `No scene named "${name}".`, suggest(name, this.scenes.keys()));
    if (this.headless) {
      this.go(name, args);
      return Promise.resolve();
    }
    return this.assets.ready().then(() => {
      this.go(name, args);
      if (new URLSearchParams(location.search).has("paused")) {
        this.render();
        return;
      }
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this.frame);
    }).catch((err) => this.fail(err));
  }
  /** Re-seed and re-enter the current or given scene, for identical replays. Clears game.data. */
  restart(name = this.currentName, args = this.currentArgs, o = {}) {
    if (o.seed !== void 0) this.seed = o.seed;
    this.rng = new Rng(this.seed);
    this.fxRng = new Rng(this.seed ^ 1540483477);
    this.data = {};
    this.stepCount = 0;
    this.fade.phase = 0;
    this.nextScene = null;
    this.go(name, args);
  }
  // --- Loop ----------------------------------------------------------------------------
  frame = (now) => {
    if (!this.running) return;
    requestAnimationFrame(this.frame);
    const real = Math.max(0, Math.min((now - this.lastTime) / 1e3, 0.1));
    this.lastTime = now;
    this.accumulator += real;
    try {
      let steps = 0;
      while (this.accumulator >= this.dt && steps < 5) {
        this.stepOnce();
        this.accumulator -= this.dt;
        steps++;
      }
      if (steps === 5) this.accumulator = 0;
      this._alpha = this.accumulator / this.dt;
      this.render(this._alpha);
      this.adapt(real);
    } catch (err) {
      this.fail(err);
    }
  };
  adapt(real) {
    if (this.options.adaptiveQuality === false) return;
    const r = this.renderer;
    this.frameTime += (real - this.frameTime) * 0.1;
    if (this.frameTime > 1 / 40) {
      this.fastFrames = 0;
      if (++this.slowFrames > 45) {
        r.quality = Math.max(0.5, r.quality * 0.85);
        this.slowFrames = 0;
      }
    } else if (this.frameTime < 1 / 55) {
      this.slowFrames = 0;
      if (++this.fastFrames > 600 && r.quality < 1) {
        r.quality = Math.min(1, r.quality * 1.1);
        this.fastFrames = 0;
      }
    }
  }
  stepOnce() {
    const s = this.current;
    if (!s) return;
    this.inStep = true;
    try {
      this.input.beginStep();
      this.stepCount++;
      s._step(this.dt);
      this.stepFade();
    } finally {
      this.inStep = false;
    }
    if (this.nextScene && this.fade.phase === 0) this.applyScene();
  }
  stepFade() {
    const f = this.fade;
    if (!f.phase) return;
    f.t += this.dt;
    if (f.t < f.dur) return;
    if (f.phase === 1) {
      this.applyScene();
      this.fade = { t: 0, dur: f.dur, phase: 2 };
    } else f.phase = 0;
  }
  /** Advance the simulation by n fixed steps right now. Errors are thrown. */
  step(n = 1) {
    for (let i = 0; i < n; i++) this.stepOnce();
    return this;
  }
  /** Draw the current state. */
  render(alpha = 1) {
    const s = this.current;
    if (!s) return;
    this._alpha = alpha;
    s._render(alpha, this.draw);
    const f = this.fade;
    if (f.phase) {
      const v = this.view, k = Math.min(1, f.t / f.dur);
      this.draw.reset();
      this.draw.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#000000", opacity: f.phase === 1 ? k : 1 - k });
    }
    this.renderer.endFrame();
  }
  // --- Agent surface ---------------------------------------------------------------------
  /** Serialisable summary of the game right now. */
  state() {
    return snapshot(this);
  }
  /** Text picture of the screen. */
  ascii(o) {
    return ascii(this, o);
  }
  /** Mobile layout and usability problems in the current scene. */
  audit() {
    return audit(this);
  }
  /** PNG data URL of the current frame (browser only). */
  screenshot() {
    this.render(this._alpha);
    return this.renderer.screenshot();
  }
  /** Simulate a screen: a DEVICES key or a ScreenInfo. Works headless, and in a browser for layout tests. */
  resize(screen) {
    this.screen = typeof screen === "string" ? DEVICES[screen] : screen;
    if (!this.screen) throw new PogoError("UNKNOWN_DEVICE", `Unknown screen "${String(screen)}".`, suggest(String(screen), Object.keys(DEVICES)));
    this.view = computeView(this.options.view ?? {}, this.screen);
    this.current?.emit("resize", this.view);
    this.emit("resize", this.view);
  }
  /**
   * First-person mouse control on desktop. While true, clicking the game captures the mouse and movement
   * feeds input.look. Turn it on in the play scene and off in menus, which need a visible cursor.
   * Esc releases the mouse; the next click captures it again.
   */
  get mouseLook() {
    return this._mouseLook;
  }
  set mouseLook(on) {
    this._mouseLook = on;
    if (!on && !this.headless && document.pointerLockElement) document.exitPointerLock();
  }
  /** True while the mouse is captured. */
  get pointerLocked() {
    return !this.headless && !!this.canvas && document.pointerLockElement === this.canvas;
  }
  // --- Services -----------------------------------------------------------------------------
  /** Play a sound effect: a preset name, a loaded sound, or a custom tone. */
  sfx(sound) {
    this.audio.play(sound);
  }
  music(song) {
    this.audio.playMusic(song);
  }
  stopMusic() {
    this.audio.stopMusic();
  }
  /** Haptic pulse on phones that support it. */
  vibrate(ms = 12) {
    if (typeof navigator !== "undefined") navigator.vibrate?.(ms);
  }
  /** Persist a JSON value. Web views can block storage, so this falls back to memory. */
  save(key, value) {
    const s = JSON.stringify(value);
    this.memory.set(key, s);
    try {
      if (!this.headless) localStorage.setItem(`pogo:${key}`, s);
    } catch {
    }
  }
  load(key, fallback) {
    let s = this.memory.get(key) ?? null;
    try {
      if (!this.headless) s = localStorage.getItem(`pogo:${key}`) ?? s;
    } catch {
    }
    return s === null ? fallback : JSON.parse(s);
  }
  on(event, fn) {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, set = /* @__PURE__ */ new Set());
    set.add(fn);
    return () => set.delete(fn);
  }
  emit(event, ...args) {
    const set = this.listeners.get(event);
    if (set) for (const fn of [...set]) fn(...args);
  }
  // --- DOM ---------------------------------------------------------------------------------------
  setupCanvas() {
    const o = this.options;
    if (!document.querySelector('meta[name="viewport"]')) {
      const m = document.createElement("meta");
      m.name = "viewport";
      m.content = "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover";
      document.head.appendChild(m);
    }
    const style = document.createElement("style");
    style.textContent = `html,body{margin:0;height:100%;overflow:hidden;overscroll-behavior:none;background:${this.letterbox.toHex()};-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}`;
    if (!o.parent && !o.canvas) document.head.appendChild(style);
    const c = o.canvas ?? document.createElement("canvas");
    c.style.cssText += ";display:block;width:100%;height:100%;touch-action:none;outline:none";
    if (!o.parent && !o.canvas) c.style.cssText += ";position:fixed;inset:0";
    c.tabIndex = 0;
    if (!o.canvas) (o.parent ?? document.body).appendChild(c);
    return c;
  }
  readScreen() {
    const r = this.canvas.getBoundingClientRect();
    const width = Math.max(1, r.width || innerWidth), height = Math.max(1, r.height || innerHeight);
    return { width, height, dpr: devicePixelRatio || 1, safe: this.readSafeArea() };
  }
  safeProbe = null;
  readSafeArea() {
    if (!this.safeProbe) {
      const p = this.safeProbe = document.createElement("div");
      p.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
      document.body.appendChild(p);
    }
    const s = getComputedStyle(this.safeProbe), n = (v) => parseFloat(v) || 0;
    const q = new URLSearchParams(location.search).get("safe");
    if (q) {
      const [top, right, bottom, left] = q.split(",").map(Number);
      return { top, right, bottom, left };
    }
    return { top: n(s.paddingTop), right: n(s.paddingRight), bottom: n(s.paddingBottom), left: n(s.paddingLeft) };
  }
  bindDOM() {
    const c = this.canvas, input = this.input;
    const q = new URLSearchParams(location.search);
    if (q.has("debug")) this.debug = true;
    input.touchMode = q.has("touch") || matchMedia("(pointer: coarse)").matches;
    const toView = (e) => {
      const r = c.getBoundingClientRect(), v = this.view;
      return { x: (e.clientX - r.left - v.x) / v.scale, y: (e.clientY - r.top - v.y) / v.scale };
    };
    const unlock = () => this.audio.unlock();
    c.addEventListener("pointerdown", (e) => {
      unlock();
      c.focus({ preventScroll: true });
      if (e.pointerType === "touch") input.touchMode = true;
      else if (e.pointerType === "mouse" && !q.has("touch")) input.touchMode = false;
      if (e.pointerType === "mouse" && this._mouseLook && !this.pointerLocked) c.requestPointerLock?.();
      try {
        c.setPointerCapture(e.pointerId);
      } catch {
      }
      const p = toView(e);
      input.pointerEvent("down", e.pointerId, p.x, p.y);
      e.preventDefault();
    });
    c.addEventListener("pointermove", (e) => {
      if (document.pointerLockElement === c) input.addLook(e.movementX, e.movementY);
      const p = toView(e);
      input.pointerEvent("move", e.pointerId, p.x, p.y);
    });
    const up = (e) => {
      const p = toView(e);
      input.pointerEvent("up", e.pointerId, p.x, p.y);
    };
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    c.addEventListener("wheel", (e) => {
      input.addWheel(e.deltaY);
      e.preventDefault();
    }, { passive: false });
    addEventListener("keydown", (e) => {
      unlock();
      if (e.code === "F2") this.debug = !this.debug;
      if (!e.repeat) input.codeDown(e.code);
      if (Object.values(input.actions).some((b) => b.includes(e.code))) e.preventDefault();
    });
    addEventListener("keyup", (e) => input.codeUp(e.code));
    addEventListener("blur", () => input.reset());
    const fit = () => {
      if (!this.running && !this.current) {
        this.screen = this.readScreen();
        this.view = computeView(this.options.view ?? {}, this.screen);
        return;
      }
      this.resize(this.readScreen());
      if (!this.running) this.render();
    };
    new ResizeObserver(fit).observe(c);
    visualViewport?.addEventListener("resize", fit);
    addEventListener("orientationchange", fit);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.audio.suspend();
        this.emit("hide");
      } else {
        this.audio.resume();
        this.lastTime = performance.now();
        this.emit("show");
      }
    });
    addEventListener("error", (e) => {
      if (e.error) this.fail(e.error);
    });
    addEventListener("unhandledrejection", (e) => this.fail(e.reason instanceof Error ? e.reason : new Error(String(e.reason))));
  }
  fail(err) {
    this.running = false;
    this.errors.push(err);
    console.error(err);
    this.showError(err);
  }
  /** Show errors on the canvas too: in a web view there may be no console, and agents read screenshots. */
  showError(err) {
    if (this.headless || typeof document === "undefined") return;
    const el = this.overlay ?? (this.overlay = document.createElement("pre"));
    el.textContent = `Game error

${err.message}

${err.stack ?? ""}`;
    el.style.cssText = "position:fixed;inset:0;margin:0;padding:max(16px,env(safe-area-inset-top)) 16px 16px;background:#7f1d1dee;color:#fff;font:13px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;overflow:auto;z-index:99999";
    document.body.appendChild(el);
  }
};
function createGame(options) {
  return new Game(options);
}

// src/components.ts
var pos = (x = 0, y, z) => ({ id: "pos", setup: (e) => {
  e.pos.set(typeof x === "number" ? new Vec(x, y ?? 0, z ?? 0) : x);
  e._prevPos.set(e.pos);
} });
var rot = (x, y, z) => ({ id: "rot", setup: (e) => {
  if (y === void 0) e.rot.z = x;
  else e.rot.set(x, y, z ?? 0);
  e._prevRot.set(e.rot);
} });
var scale = (x, y, z) => ({ id: "scale", setup: (e) => {
  e.scale.set(x, y ?? x, z ?? x);
} });
var layer = (n) => ({ id: "layer", setup: (e) => {
  e.layer = n;
} });
var opacity = (a) => ({ id: "opacity", setup: (e) => {
  e.opacity = a;
} });
var named = (n) => ({ setup: (e) => {
  e.name = n;
} });
var dim = (d) => ({ id: "dim", setup: (e) => {
  e.dim = d;
} });
var rect = (width, height, o = {}) => ({
  id: "rect",
  radius: o.radius ?? 0,
  outline: o.outline ?? 0,
  setup(e) {
    e.size.set(width, height, 0);
    if (o.color) e.color = o.color;
  },
  draw(d, e) {
    d.rect(e.size.x, e.size.y, { color: e.color, radius: e.radius, outline: e.outline });
  }
});
var circle = (radius, o = {}) => ({
  id: "circle",
  outline: o.outline ?? 0,
  setup(e) {
    e.size.set(radius * 2, radius * 2, 0);
    e._round = true;
    if (o.color) e.color = o.color;
  },
  draw(d, e) {
    d.circle(e.size.x / 2, { color: e.color, outline: e.outline });
  }
});
var poly = (points, o = {}) => {
  const pts = points.map((p) => toVec(p).clone());
  return {
    id: "poly",
    setup(e) {
      const xs = pts.map((p) => Math.abs(p.x)), ys = pts.map((p) => Math.abs(p.y));
      e.size.set(Math.max(...xs) * 2, Math.max(...ys) * 2, 0);
      if (o.color) e.color = o.color;
    },
    draw(d, e) {
      d.poly(pts, { color: e.color });
    }
  };
};
var sprite = (name, o = {}) => {
  let anim = null;
  return {
    id: "sprite",
    sprite: name,
    frame: o.frame ?? 0,
    flipX: o.flipX ?? false,
    setup(e) {
      const a = e.scene.game.assets.sprite(name);
      e.size.set(o.width ?? (o.height ? a.frameW / a.frameH * o.height : a.frameW), o.height ?? (o.width ? a.frameH / a.frameW * o.width : a.frameH), 0);
      if (o.color) e.color = o.color;
    },
    /** Play frames: e.play([0,1,2], { fps: 8 }). Replaying the same list does not restart it. */
    play(frames, p = {}) {
      if (anim && anim.frames === frames) return;
      anim = { frames, fps: p.fps ?? 8, loop: p.loop ?? true, t: 0, onDone: p.onDone };
      this.frame = frames[0];
    },
    update(dt, e) {
      if (!anim) return;
      anim.t += dt * anim.fps;
      const i = Math.floor(anim.t);
      if (i >= anim.frames.length && !anim.loop) {
        e.frame = anim.frames[anim.frames.length - 1];
        const done = anim.onDone;
        anim = null;
        done?.();
      } else e.frame = anim.frames[i % anim.frames.length];
    },
    draw(d, e) {
      d.sprite(e.sprite, { frame: e.frame, width: e.size.x, height: e.size.y, flipX: e.flipX, color: e.color });
    }
  };
};
var text = (str, o = {}) => {
  let value = String(str);
  const style = { size: o.size ?? 20, font: o.font ?? "system-ui, -apple-system, Roboto, sans-serif", bold: o.bold ?? false, align: o.align ?? "center", maxWidth: o.maxWidth ?? 0, lineHeight: o.lineHeight ?? 1.25 };
  let owner = null;
  const measure = () => {
    if (!owner) return;
    const m = owner.scene.game.renderer.measureText(value, style);
    owner.size.set(m.width, m.height, 0);
  };
  return {
    id: "text",
    textStyle: style,
    get text() {
      return value;
    },
    set text(s) {
      const next = String(s);
      if (next !== value) {
        value = next;
        measure();
      }
    },
    setup(e) {
      owner = e;
      measure();
      if (o.color) e.color = o.color;
    },
    draw(d, e) {
      d.text(value, { ...style, color: e.color });
    }
  };
};
var mesh = (name, o = {}) => ({
  id: "mesh",
  mesh: name,
  unlit: o.unlit ?? false,
  castShadow: o.shadow ?? true,
  texture: o.texture ?? null,
  setup(e) {
    e.dim = 3;
    const g = e.scene.game.assets.geometry(name);
    const s = o.size === void 0 ? g.natural : typeof o.size === "number" ? new Vec(o.size, o.size, o.size) : toVec(o.size);
    e.size.set(s);
    if (name === "sphere") e._round = true;
    if (o.color) e.color = o.color;
    if (o.texture) e.scene.game.assets.sprite(o.texture);
  },
  draw(d, e) {
    d.mesh(e.mesh, e.world, { size: e.size, color: e.color, texture: e.texture, unlit: e.unlit, castShadow: e.castShadow });
  }
});
var billboard = (name, o = {}) => ({
  id: "billboard",
  sprite: name,
  frame: o.frame ?? 0,
  setup(e) {
    e.dim = 3;
    const a = e.scene.game.assets.sprite(name), h = o.size ?? 1;
    e.size.set(a.frameW / a.frameH * h, h, 0.01);
    if (o.color) e.color = o.color;
  },
  draw(d, e) {
    d.billboard(e.sprite, e, { frame: e.frame, color: e.color, unlit: o.unlit ?? true });
  }
});
var collider = (o = {}) => ({
  id: "collider",
  setup(e) {
    const size = o.size === void 0 ? null : typeof o.size === "number" ? new Vec(o.size, o.size, o.size) : toVec(o.size);
    if (Array.isArray(o.size) && o.size.length === 3) e.dim = 3;
    e.collider = {
      shape: o.shape ?? null,
      size,
      offset: toVec(o.offset ?? [0, 0, 0]),
      scale: o.scale ?? 1,
      sensor: o.sensor ?? false,
      ignore: o.ignore ?? [],
      solid: false,
      oneWay: false,
      watch: false
    };
  },
  add(e) {
    const c = e.collider;
    c.shape ??= e._round ? "circle" : "box";
    const s = c.size ?? e.size;
    if (!s.x && !s.y) throw new PogoError("ZERO_COLLIDER", `collider() on ${e.label} has no size.`, "Give the entity a drawable (rect, sprite, mesh…) or pass collider({ size: [w, h] }).");
  }
});
var body = (o = {}) => ({
  id: "body",
  requires: ["collider"],
  vel: new Vec(),
  grounded: false,
  setup(e) {
    e.body = { gravity: o.gravity ?? 1, bounce: o.bounce ?? 0, friction: o.friction ?? 0, drag: o.drag ?? 0, mass: o.mass ?? 1, maxSpeed: o.maxSpeed ?? 0, frozen: false, groundEntity: null };
  }
});
var solid = (o = {}) => ({
  id: "solid",
  requires: ["collider"],
  add(e) {
    e.collider.solid = true;
    e.collider.oneWay = o.oneWay ?? false;
  }
});
var pin = (anchor, offset = [0, 0]) => {
  const off = toVec(offset);
  const apply = (e) => {
    const v = e.scene.game.view, s = v.safe, hw = e.size.x * e.scale.x / 2, hh = e.size.y * e.scale.y / 2;
    const x = anchor.includes("left") ? s.left + hw + off.x : anchor.includes("right") ? v.width - s.right - hw - off.x : (v.width + s.left - s.right) / 2 + off.x;
    const y = anchor.includes("top") ? s.top + hh + off.y : anchor.includes("bottom") ? v.height - s.bottom - hh - off.y : (v.height + s.top - s.bottom) / 2 + off.y;
    e.pos.set(x, y, 0);
  };
  return {
    id: "pin",
    setup(e) {
      e.ui = true;
    },
    add(e) {
      apply(e);
      e._prevPos.set(e.pos);
    },
    update(_dt, e) {
      apply(e);
    }
  };
};
var ui = () => ({ id: "ui", setup(e) {
  e.ui = true;
} });
var tap = (fn, o = {}) => ({
  id: "tap",
  setup(e) {
    e.tappable = { pad: o.pad ?? 0 };
    if (fn) e.on("tap", fn);
  }
});
var button = (label, o = {}) => {
  const textSize = o.textSize ?? 18;
  const style = { size: textSize, font: "system-ui, -apple-system, Roboto, sans-serif", bold: true, align: "center", maxWidth: 0, lineHeight: 1.2 };
  const fill = color(o.color ?? "#3b82f6"), ink = o.textColor ?? "#ffffff";
  return {
    id: "button",
    buttonLabel: label,
    setup(e) {
      const m = e.scene.game.renderer.measureText(label, style);
      e.size.set(o.width ?? Math.max(m.width + 36, 120), o.height ?? 52, 0);
      e.tappable = { pad: 0 };
      e._isButton = true;
      if (o.onTap) e.on("tap", o.onTap);
    },
    add(e) {
      if (e.parent?.ui) e.ui = true;
    },
    update(dt, e) {
      const goal = e._pressed ? 0.95 : 1;
      e.scale.x += (goal - e.scale.x) * Math.min(1, dt * 24);
      e.scale.y = e.scale.x;
      if (o.action && !e.hidden && e._bornStep !== e.scene.game.stepCount && e.scene.game.input._quiet(o.action)) e.emit("tap");
    },
    draw(d, e) {
      d.rect(e.size.x, e.size.y, { y: 3, color: fill.lerp("#000000", 0.35), radius: o.radius ?? 14 });
      d.rect(e.size.x, e.size.y, { color: e._pressed ? fill.lerp("#000000", 0.15) : fill, radius: o.radius ?? 14 });
      d.text(label, { ...style, color: ink });
    }
  };
};
var lifespan = (seconds, o = {}) => {
  let t = 0;
  const fade = o.fade ?? 0;
  return {
    id: "lifespan",
    update(dt, e) {
      t += dt;
      if (fade && t > seconds - fade) e.opacity = Math.max(0, (seconds - t) / fade);
      if (t >= seconds) e.destroy();
    }
  };
};
var offscreen = (o = {}) => ({
  id: "offscreen",
  update(_dt, e) {
    const v = e.scene.game.view, p = e.ui ? e.pos : e.scene.cam.toView(e.worldPos()), m = o.margin ?? 100;
    if (p.x < -m || p.y < -m || p.x > v.width + m || p.y > v.height + m) e.destroy();
  }
});
var health = (hp, o = {}) => ({
  id: "health",
  hp,
  maxHp: o.max ?? hp,
  hurt(n = 1) {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - n);
    this.emit("hurt", n);
    if (this.hp === 0) this.emit("death");
  },
  heal(n = 1) {
    this.hp = Math.min(this.maxHp, this.hp + n);
    this.emit("heal", n);
  }
});
export {
  Camera2D,
  Camera3D,
  Color,
  DEFAULT_ACTIONS,
  DEVICES,
  Draw,
  Entity,
  Game,
  Input,
  PALETTE,
  Pixmap,
  PogoError,
  Rng,
  SFX,
  Scene,
  Vec,
  billboard,
  body,
  button,
  circle,
  clamp,
  collider,
  color,
  computeView,
  createGame,
  damp,
  deg,
  dim,
  easings,
  health,
  layer,
  lerp,
  lifespan,
  mesh,
  named,
  noteFreq,
  offscreen,
  opacity,
  pin,
  poly,
  pos,
  rect,
  rot,
  scale,
  solid,
  sprite,
  tap,
  text,
  ui,
  vec
};
