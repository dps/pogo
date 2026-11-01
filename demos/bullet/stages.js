// The score. Five nights and a flame. Each stage is a run of movements on the song's bars, then a boss whose phases tell a small story without words.
import { AMBER, AQUA, BEAD, COBALT, DASH, GOLD, JADE, MOTHB, ORB, PEARL, PEARLB, PETAL, ROSE, RUBY, SEED, SHARD, STAR, VIOLET } from "./art.js";
import { F_DRIP, F_ENTER, F_GRAV, F_REAIM, F_BOUNCE } from "./bullets.js";

const TAU = Math.PI * 2, DOWN = Math.PI / 2, UP = -Math.PI / 2;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

/** Repeat forever, every `step` beats. */
const loop = (step, fn, start = 0) => function* (c, b) { if (start) yield start; for (let i = 0; ; i++) { fn(c, b, i); yield step; } };
/** Repeat `times`, then finish. */
function* rep(times, step, fn) { for (let i = 0; i < times; i++) { fn(i); yield step; } }

// Paths are functions of beats since spawn. null means gone.
const drift = (x, vy, sway = 0, f = 0.5, y0 = -24) => (t) => [x + sway * Math.sin(t * f), y0 + vy * t];
const arc = (x0, y0, x1, y1, bx, by, beats) => (t) => { const u = t / beats; if (u >= 1) return null; const v = 1 - u; return [v * v * x0 + 2 * v * u * bx + u * u * x1, v * v * y0 + 2 * v * u * by + u * u * y1]; };
const hover = (x0, y0, x1, y1, inB, stay, outB = 6) => (t) => {
    if (t < inB) { const u = ease(t / inB); return [lerp(x0, x1, u), lerp(y0, y1, u)]; }
    if (t < inB + stay) return [x1, y1];
    const u = (t - inB - stay) / outB; if (u >= 1) return null; const e = u * u; return [lerp(x1, x0, e), lerp(y1, y0, e)];
};

// --- Stage 1: The Meadow ----------------------------------------------------------------------------------

function* firstLights(c) {
    // Slow enough to learn the hand: wisps in a file, one calm shot a bar.
    for (const [side, count] of [[-1, 3], [1, 3]]) {
        yield* rep(count, 2, (i) => c.enemy("wisp", { hp: 5, path: drift(180 + side * (60 + i * 18), 42, 16, 0.7), script: function* (c, e) { yield 2; for (;;) { c.ring({ at: e, n: 3, exact: true, a0: "aim", arc: 0.5, sp: 66, hue: GOLD, depth: 2 }); yield 4; } } }));
        yield 2;
    }
    yield 6;
}
function* fireflies(c) {
    yield* rep(4, 4, (i) => {
        const s = i % 2 ? 1 : -1;
        c.enemy("wisp", { hp: 7, path: arc(180 - s * 210, 90, 180 + s * 210, 170, 180, 330, 18), script: function* (c, e) { yield 3; for (let k = 0; ; k++) { c.ring({ at: e, n: 10, sp: 58, hue: AMBER, a0: k * 0.3, march: true }); yield 4; } } });
    });
    yield 12;
}
function* lanterns(c) {
    c.enemy("lantern", { hp: 90, path: hover(180, -40, 180, 130, 4, c.bars(5)), points: 400, script: function* (c, e) {
        yield 4;
        for (let i = 0; ; i++) { c.ring({ at: e, n: 3, exact: true, sp: 74, a0: i * 0.37, hue: ROSE, kind: PETAL, tele: false, mesh: "lan", pane: ROSE, shade: 0.8, bell: i % 4 === 0 ? null : false }); yield 0.5; }
    } });
    yield c.bars(6);
}
function* duskRain(c) {
    yield* rep(6, 2, (i) => c.enemy("wisp", { hp: 6, path: hover(30 + i * 60, -30, 30 + i * 60, 70, 2, c.bars(3) - i * 2), script: function* (c, e) { yield 3; for (;;) { c.shot({ at: e, a0: DOWN, sp: 84, kind: SEED, hue: JADE, line: c.lvl + 2, lineStep: 0.12, bell: false }); yield 2; } } }));
    yield c.bars(2);
    yield* rep(6, 2, (i) => c.lane({ n: 20, sp: 72, c: 180 + 120 * Math.sin(i * 0.9), gap: 74, hue: GOLD, kind: PEARLB, mesh: "dr", shade: 0.7 }));
    yield 4;
}
function* twinLanterns(c) {
    for (const s of [-1, 1]) c.enemy("lantern", { hp: 70, points: 400, path: hover(180 + s * 240, 80, 180 + s * 100, 120, 4, c.bars(4)), script: function* (c, e) {
        yield 4; for (let i = 0; ; i++) { c.ring({ at: e, n: 10, sp: 64, w: s * 0.55, a0: i * 0.2, hue: s > 0 ? ROSE : VIOLET, kind: PETAL, mesh: `t${s}`, shade: 0.7, tele: i % 2 === 0 }); yield 2; }
    } });
    yield c.bars(6);
}

const NIGHTBLOOM = {
    id: "bloom", name: "Nightbloom", home: [180, 142], hp: 1,
    phases: [
        { id: "bud", name: "Bud", hp: 240, bars: 14, enter: (b) => { b.open = 0.18; },
          tracks: [
              loop(2, (c, b, i) => c.ring({ n: 18, sp: 60, a0: i * 0.17, hue: ROSE, march: true, mesh: "bud", shade: 0.8 })),
              loop(4, (c) => { if (c.lvl >= 1) c.ring({ n: 3, exact: true, a0: "aim", arc: 0.42, sp: 96, hue: GOLD, tele: false, bell: false }); }, 1),
          ] },
        { id: "open", name: "Bloom", hp: 560, bars: 18, enter: (b) => { b.open = 1; },
          tracks: [
              loop(2, (c, b, i) => { const s = i % 2 ? 1 : -1; c.ring({ n: 12, sp: 72, w: s * 0.62, a0: i * 0.13, hue: s > 0 ? ROSE : VIOLET, kind: PETAL, mesh: `o${s}`, pane: s > 0 ? ROSE : VIOLET, shade: 0.9 }); }),
              loop(8, (c) => c.ring({ n: 5, sp: 38, a0: "aim", kind: ORB, size: 0.8, hue: GOLD, bell: 0 }), 3),
          ] },
        { id: "seed", name: "Going to Seed", hp: 520, bars: 16, enter: (b) => { b.open = 0.62; b.wilt = 1; },
          tracks: [
              loop(1, (c, b, i) => c.ring({ n: 4, a0: UP + Math.sin(i * 0.8) * 0.5, arc: 2.5, sp: 96, fall: 34, maxS: 66, kind: SEED, hue: i % 4 === 3 ? GOLD : JADE, wob: 34, wobF: 2 + i % 3 * 0.4, tele: false, r0: 28, bell: i % 2 ? false : null })),
              loop(8, (c, b, i) => c.lane({ n: 22, sp: 62, c: 180 + 130 * Math.sin(i * 1.7), gap: 70, kind: SEED, hue: AMBER, mesh: "wind" }), 6),
          ] },
    ],
};

// --- Stage 2: Moon River -----------------------------------------------------------------------------------

function* ripples(c) {
    yield* rep(5, 6, (i) => {
        const x = [90, 270, 180, 60, 300][i];
        c.enemy("jelly", { hp: 14, path: drift(x, 18, 18, 0.4), script: function* (c, e) { yield 4; for (let k = 0; ; k++) { c.ring({ at: e, n: 14, sp: 52, a0: k * 0.11, hue: AQUA, march: true, mesh: `rp${i}`, shade: 0.8 }); yield 3; } } });
    });
    yield c.bars(3);
}
function* moonrise(c) {
    yield* rep(20, 1, (i) => c.lane({ n: 24, sp: 66, c: 180 + 118 * Math.sin(i * 0.33), gap: 74, hue: i % 8 < 4 ? AQUA : COBALT, mesh: "mr", shade: 0.75, bell: i % 2 ? false : null }));
    yield 12;
}
function* reflections(c) {
    yield* rep(6, 4, (i) => {
        const x = 70 + (i * 83) % 220;
        c.enemy("jelly", { hp: 12, path: hover(x, -30, x, 110, 3, 16), script: function* (c, e) { yield 3; for (let k = 0; ; k++) { c.ring({ at: e, n: 3, exact: true, a0: "aim", arc: 0.7, sp: 88, hue: VIOLET, kind: PETAL }); yield 4; } } });
        // The river answers from below, a beat late.
        c.ring({ at: [x, c.H + 18], n: 7, exact: false, a0: UP, arc: 1.3, sp: 62, hue: AQUA, tele: false, bell: false, flags: F_ENTER });
    });
    yield 12;
}
function* bellChorus(c) {
    const xs = [70, 180, 290];
    xs.forEach((x, j) => c.enemy("jelly", { hp: 34, points: 240, path: hover(x, -30, x, 120 + (j === 1 ? 40 : 0), 4, c.bars(6)), script: function* (c, e) { yield 4 + j * 2; for (let k = 0; ; k++) { c.ring({ at: e, n: 16, sp: 60, a0: k * 0.2 + j, hue: [AQUA, VIOLET, COBALT][j], mesh: `bc${j}`, shade: 0.7, bell: j }); yield 6; } } }));
    yield c.bars(8);
}
function* theSwell(c) {
    yield* rep(10, 2, (i) => {
        const s = i % 2 ? 1 : -1;
        c.ring({ at: [180 - s * 200, 40 + (i % 4) * 30], n: 13, a0: s > 0 ? DOWN - 1.3 + 0.4 : DOWN + 1.3 - 0.4, arc: 1.6, sp: 74, w: -s * 0.16, hue: i % 4 < 2 ? AQUA : JADE, kind: PETAL, tele: false, mesh: `sw${s}`, shade: 0.6, flags: F_ENTER });
    });
    yield 12;
}

const TIDE = {
    id: "tide", name: "Tide Mother", home: [180, 132],
    phases: [
        { id: "swell", name: "High Water", hp: 230, bars: 16, enter: (b) => { b.swim = 0.5; },
          tracks: [
              loop(1, (c, b, i) => c.lane({ n: 26, sp: 70, c: 180 + 122 * Math.sin(i * 0.31), gap: 70, hue: AQUA, mesh: "tw", shade: 0.8, bell: i % 2 ? false : null })),
              loop(4, (c) => { if (c.lvl >= 1) c.ring({ n: 3, exact: true, a0: "aim", arc: 0.5, sp: 92, hue: VIOLET, kind: PETAL, bell: false, tele: false }); }, 2),
          ] },
        { id: "pulse", name: "Moon Pulse", hp: 220, bars: 16, enter: (b) => { b.swim = 1; },
          tracks: [
              loop(4, (c, b, i) => { c.pose(() => { b.kick = 1; }); c.ring({ n: 26, sp: 170, acc: -160, minS: 4, a0: i * 0.1, hue: i % 2 ? COBALT : AQUA, flags: F_DRIP, turn: 42, spd2: 74, mesh: "pl", shade: 0.7 }); }),
              loop(2, (c, b, i) => c.shot({ a0: "aim", sp: 124, kind: DASH, hue: VIOLET, line: 2 + c.lvl, bell: false }), 1),
          ] },
        { id: "brood", name: "Her Children", hp: 420, bars: 16, enter: (b) => { b.swim = 0.3; b.brood = 1; },
          tracks: [
              (c, b) => (function* () {
                  for (let i = 0; ; i++) {
                      const k = i % 4, sat = b.sat[k];
                      c.ring({ at: sat, n: 11, sp: 64, a0: i * 0.4, hue: [AQUA, JADE, VIOLET, COBALT][k], gatherR: 34, bell: k, mesh: `br${k}`, shade: 0.7 });
                      yield 2;
                  }
              })(),
              // All of them come home: the tide runs back to her, and a door stays open.
              loop(16, (c, b) => { c.ring({ n: 44, r0: 470, sp: -74, gapC: "aim", gapW: 0.8, tele: false, hue: PEARL, life: 6.1, flags: F_ENTER, kind: BEAD }); }, 7),
          ] },
    ],
};

// --- Stage 3: The Thicket ----------------------------------------------------------------------------------

const web = (c, b, spoke, o) => {
    const a = spoke, len = 560, n = o.n ?? 40, x0 = b.x, y0 = b.y;
    c.warn([x0, y0], [x0 + Math.cos(a) * len, y0 + Math.sin(a) * len], o.hue ?? JADE);
    c.row({ exact: true, n, from: [x0 + Math.cos(a) * 26, y0 + Math.sin(a) * 26], to: [x0 + Math.cos(a) * len, y0 + Math.sin(a) * len], sp: 0, a, kind: BEAD, hue: o.hue ?? JADE, wait: o.wait, spd2: o.out ?? 66, flags: o.flags ?? 0, bell: o.bell ?? null, turn: o.turn ?? 0, mesh: o.mesh, shade: 0.45 });
};
function* threads(c) {
    yield* rep(9, 3, (i) => {
        const x = 50 + (i * 113) % 260, y = 80 + (i % 3) * 50;
        c.enemy("spider", { hp: 8, path: hover(x, -30, x, y, 3, c.bars(4)), script: function* (c, e) { yield 3; for (;;) { c.shot({ at: e, a0: DOWN, sp: 40, fall: 60, maxS: 130, kind: SEED, hue: JADE, tele: false, bell: false }); yield 3; } } });
    });
    yield c.bars(5);
}
function* waltz(c) {
    c.enemy("spider", { hp: 110, points: 400, path: hover(180, -40, 180, 170, 6, c.bars(12)), script: function* (c, e) {
        yield 6;
        for (let i = 0; ; i++) {
            // One, two, three: the first of each bar is the strong one.
            c.ring({ at: e, n: i % 3 === 0 ? 15 : 7, sp: i % 3 === 0 ? 66 : 80, a0: i * 0.26, kind: i % 3 === 0 ? PEARLB : BEAD, hue: i % 3 === 0 ? JADE : GOLD, tele: i % 3 === 0, march: i % 3 === 0, mesh: i % 3 === 0 ? "wz" : undefined, shade: 0.7, bell: i % 3 });
            yield 1;
        }
    } });
    yield c.bars(14);
}
function* dew(c) {
    yield* rep(30, 1, (i) => c.shot({ at: [20 + ((i * 137) % 320), -12], a0: DOWN, sp: 30, fall: 90, maxS: 180, kind: SEED, hue: i % 3 ? JADE : AQUA, bell: i % 3 ? false : null, flags: F_ENTER }));
    yield* rep(12, 1, (i) => c.enemy("bat", { hp: 6, path: arc(i % 2 ? -20 : 380, 60, i % 2 ? 380 : -20, 60, 180, 340, 8), script: function* (c, e) { yield 3; c.ring({ at: e, n: 3, exact: true, a0: "aim", arc: 0.45, sp: 104, hue: VIOLET, kind: DASH, bell: false, tele: false }); } }));
    yield 6;
}
function* edgeOfWeb(c) {
    yield* rep(8, 6, (i) => {
        const left = i % 2 === 0, x = left ? -10 : 370, n = 12;
        for (let k = 0; k < 2; k++) {
            const y = 40 + i * 30 + k * 80, a = left ? 0.18 : Math.PI - 0.18;
            c.row({ exact: true, n, from: [x, y], to: [x + Math.cos(a) * 250, y + Math.sin(a) * 250], sp: 0, a: DOWN, kind: BEAD, hue: k ? GOLD : JADE, wait: 5, spd2: 78, bell: k ? false : null });
        }
    });
    yield 10;
}
function* batWheel(c) {
    for (const s of [-1, 1]) c.enemy("bat", { hp: 56, points: 300, path: hover(180 + s * 230, 90, 180 + s * 92, 110, 6, c.bars(10)), script: function* (c, e) {
        yield 6; for (let i = 0; ; i++) { c.ring({ at: e, n: 2, exact: true, sp: 96, a0: i * 0.5 * s, kind: PETAL, hue: VIOLET, tele: false, bell: i % 3 ? false : null, mesh: `bw${s}`, shade: 0.7 }); yield 0.5; }
    } });
    yield c.bars(12);
}

const WEAVER = {
    id: "weaver", name: "The Weaver", home: [180, 160],
    phases: [
        { id: "spin", name: "Spinning", hp: 480, bars: 32, enter: (b) => { b.legs = 1; },
          tracks: [
              (c, b) => (function* () {
                  for (let round = 0; ; round++) {
                      for (let k = 0; k < 8; k++) { web(c, b, round * 0.2 + k / 8 * TAU, { wait: (8 - k) * 3}); yield 3; }
                      yield 6;
                  }
              })(),
              loop(3, (c) => c.shot({ a0: "aim", sp: 84, hue: ROSE, kind: PETAL, tele: true, bell: false }), 1),
          ] },
        { id: "silk", name: "Silk", hp: 620, bars: 32, enter: (b) => { b.legs = 1.5; },
          tracks: [
              (c, b) => (function* () {
                  for (let round = 0; ; round++) {
                      // A spiral laid bead by bead, then let go all at once on the bar.
                      const count = 96, a0 = round * 0.7, dir = round % 2 ? 1 : -1, x0 = 180, y0 = 240;
                      for (let i = 0; i < count; i++) {
                          const a = a0 + dir * i * 0.42, r = 30 + i * 2.7, x = x0 + Math.cos(a) * r, y = y0 + Math.sin(a) * r;
                          c.shot({ at: [x, y], a0: DOWN, sp: 0, wait: (count - i) * 0.125 + 3, spd2: 74, kind: BEAD, hue: i % 8 < 4 ? JADE : GOLD, bell: i % 8 ? false : null, vol: 0.035 });
                          yield 0.125;
                      }
                      yield 9;
                  }
              })(),
              loop(6, (c) => c.ring({ n: 6, a0: UP, arc: 2.4, sp: 56, fall: 40, maxS: 90, kind: SEED, hue: AQUA, tele: false, bell: false }), 2),
          ] },
        { id: "snag", name: "The Snag", hp: 560, bars: 28, enter: (b) => { b.legs = 2; },
          tracks: [
              (c, b) => (function* () {
                  for (let round = 0; ; round++) {
                      for (let k = 0; k < 6; k++) { web(c, b, round + k / 6 * TAU, { wait: (6 - k) * 3 + 1, hue: ROSE, flags: F_REAIM, out: 74, n: 34 }); yield 3; }
                      yield 12;
                  }
              })(),
              loop(6, (c, b, i) => c.ring({ n: 14, sp: 74, a0: i * 0.3, hue: JADE, march: true }), 4),
          ] },
        { id: "cut", name: "Cut Loose", hp: 340, bars: 28, enter: (b) => { b.legs = 0.6; b.home = [180, 250]; },
          tracks: [
              loop(3, (c, b, i) => {
                  // Threads fall in columns; one column in five is empty, and it walks.
                  const open = (i * 2) % 7;
                  for (let k = 0; k < 7; k++) if (k !== open) c.row({ exact: true, n: 14, from: [28 + k * 51, -190], to: [28 + k * 51, -12], sp: 96, a: DOWN, kind: BEAD, hue: k % 2 ? JADE : GOLD, flags: F_ENTER, bell: k === 0 ? null : false });
              }),
              loop(6, (c, b, i) => c.ring({ n: 16, sp: 64, a0: i * 0.5, hue: ROSE, kind: PETAL, mesh: "cut", shade: 0.7 }), 2),
          ] },
    ],
};

// --- Stage 4: The Cathedral --------------------------------------------------------------------------------

function* votive(c) {
    yield* rep(7, 4, (i) => {
        const x = 60 + i * 40;
        c.enemy("bell", { hp: 16, path: drift(i % 2 ? 360 - x : x, 16, 14, 0.5), script: function* (c, e) { yield 3; for (let k = 0; ; k++) { c.ring({ at: e, n: 12, sp: 62, a0: k * 0.26, hue: i % 2 ? RUBY : AMBER, kind: SHARD, march: true, mesh: `v${i}`, shade: 0.75 }); yield 4; } } });
    });
    yield c.bars(3);
}
function* choir(c) {
    const xs = [40, 110, 180, 250, 320];
    xs.forEach((x, j) => c.enemy("bell", { hp: 26, points: 180, path: hover(x, -30, x, 70 + Math.abs(j - 2) * 22, 4, c.bars(7)), script: function* (c, e) {
        yield 4 + j;
        for (let k = 0; ; k++) { c.shot({ at: e, a0: DOWN, sp: 112, kind: DASH, hue: j % 2 ? GOLD : AMBER, line: 5, lineStep: 0.07, bell: j, tele: true }); c.ring({ at: e, n: 3, exact: true, a0: "aim", arc: 0.8, sp: 70, hue: RUBY, kind: SHARD, tele: false, bell: false }); yield 8; }
    } }));
    yield c.bars(9);
}
function* nave(c) {
    // An aisle closes in from both walls and opens again.
    yield* rep(32, 1, (i) => {
        const w = 52 + 42 * Math.abs(Math.sin(i * 0.19)), mid = 180 + 66 * Math.sin(i * 0.14);
        c.row({ exact: true, n: 2, from: [mid - w, -10], to: [mid + w, -10], a: DOWN, sp: 104, kind: SHARD, hue: COBALT, bell: i % 2 ? false : null, mesh: "aisle", shade: 0.8 });
        for (const s of [-1, 1]) for (let k = 1; k < 4 + c.lvl; k++) { const x = mid + s * (w + k * 22); if (x > -10 && x < 370) c.shot({ at: [x, -10], a0: DOWN, sp: 104, kind: PEARLB, hue: RUBY, bell: false }); }
    });
    yield 10;
}
function* tolling(c) {
    yield* rep(5, 8, (i) => {
        const x = [180, 80, 280, 130, 230][i];
        c.enemy("bell", { hp: 40, points: 240, path: hover(x, -30, x, 110, 4, 22), script: function* (c, e) { yield 4; for (let k = 0; ; k++) { c.ring({ at: e, n: 10, a0: k * 0.3, sp: 42, kind: ORB, size: 0.72, hue: AMBER, bell: 0, gatherR: 70 }); yield 8; } } });
    });
    yield c.bars(6);
}

const ROSEW = {
    id: "rose", name: "The Rose Window", home: [180, 196],
    phases: [
        { id: "tracery", name: "Tracery", hp: 640, bars: 18, enter: (b) => { b.spin = 0.12; },
          tracks: [
              loop(1, (c, b, i) => c.ring({ n: 12, exact: c.lvl < 1, sp: 66, w: 0.34, a0: i * Math.PI / 24, kind: SHARD, hue: COBALT, tele: i % 4 === 0, mesh: "tr", shade: 0.9, pane: COBALT, paneAlt: RUBY, bell: i % 2 ? false : null })),
              loop(1, (c, b, i) => c.ring({ n: 12, exact: c.lvl < 1, sp: 66, w: -0.34, a0: -i * Math.PI / 24, kind: SHARD, hue: RUBY, tele: false, mesh: "tq", shade: 0.9, pane: AMBER, paneAlt: VIOLET, bell: false }), 2),
          ] },
        { id: "hours", name: "The Hours", hp: 660, bars: 18, enter: (b) => { b.spin = 0; b.clock = 1; },
          tracks: [
              (c, b) => (function* () {
                  for (let i = 0; ; i++) {
                      const a = UP + i * TAU / 12, a2 = UP - i * TAU / 48 + Math.PI, len = 620;
                      for (const [t, h] of c.lvl >= 1 ? [[a, GOLD], [a2, RUBY]] : [[a, GOLD]]) {
                          c.warn([b.x, b.y], [b.x + Math.cos(t) * len, b.y + Math.sin(t) * len], h);
                          c.row({ exact: true, n: 44, from: [b.x + Math.cos(t) * 40, b.y + Math.sin(t) * 40], to: [b.x + Math.cos(t) * len, b.y + Math.sin(t) * len], sp: 0, a: t, kind: DASH, hue: h, wait: 2, spd2: 0, life: c.sec(1.5), n2: 0, bell: i % 12, vol: 0.05 });
                      }
                      b.clockA = a;
                      yield 2;
                  }
              })(),
              // On the hour: twelve notes, twelve lights.
              loop(24, (c, b) => c.ring({ n: 12, exact: true, sp: 50, a0: 0, kind: ORB, size: 0.8, hue: AMBER, gatherR: 110, bell: 0 }), 1),
              loop(4, (c, b, i) => c.ring({ n: 9, sp: 72, a0: i * 0.4, kind: SHARD, hue: COBALT, tele: false, bell: false }), 3),
          ] },
        { id: "shatter", name: "Shatter", hp: 660, bars: 18, enter: (b) => { b.spin = 0.5; b.cracked = 1; },
          tracks: [
              loop(2, (c, b, i) => c.ring({ n: 22, sp: 130, acc: -96, minS: 36, a0: i * 0.17, kind: SHARD, hue: [COBALT, RUBY, AMBER, VIOLET][i % 4], mesh: `sh`, pane: [COBALT, RUBY, AMBER, VIOLET][i % 4], shade: 0.75 })),
              loop(1, (c, b, i) => c.shot({ at: [30 + ((i * 89) % 300), -12], a0: DOWN, sp: 24, fall: 70, maxS: 150, kind: SHARD, hue: AQUA, bell: false, flags: F_ENTER, tele: false }), 0.5),
          ] },
        { id: "vespers", name: "Vespers", hp: 760, bars: 20, enter: (b) => { b.spin = -0.2; b.home = [180, 132]; },
          tracks: [
              loop(2, (c, b, i) => { for (const s of [-1, 1]) c.ring({ at: [180 + s * 130, 90], n: 14, sp: 66, w: s * 0.42, a0: i * 0.22 * s, kind: PETAL, hue: s > 0 ? RUBY : COBALT, mesh: `vs${s}`, shade: 0.8, gatherR: 40, bell: s > 0 ? null : false }); }),
              loop(4, (c, b, i) => c.ring({ n: 6, a0: "aim", arc: 1, sp: 88, kind: STAR, hue: GOLD, tele: false, bell: false }), 1),
          ] },
    ],
};

// --- Stage 5: Above the Storm ------------------------------------------------------------------------------

function* staticWave(c) {
    yield* rep(10, 3, (i) => {
        const s = i % 2 ? 1 : -1, y = 50 + (i % 4) * 34;
        c.enemy("shard", { hp: 12, path: arc(180 - s * 210, y, 180 + s * 210, y + 40, 180, y + 120, 14), script: function* (c, e) { yield 3; for (;;) { c.shot({ at: e, a0: "aim", sp: 150, kind: DASH, hue: AQUA, line: 3 + c.lvl, lineStep: 0.08, tele: true }); yield 4; } } });
    });
    yield c.bars(4);
}
function* aurora(c) {
    yield* rep(64, 0.5, (i) => {
        const open = 4 + 3 * Math.sin(i * 0.11), col = i % 10;
        if (Math.abs(col - open) < 1.4) return;
        c.shot({ at: [18 + col * 36, -12], a0: DOWN, sp: 118, kind: DASH, hue: col % 3 ? JADE : VIOLET, line: c.depth, lineStep: 0.1, wob: 0.8, wobF: 1.3, bell: i % 8 === 0 ? null : false, flags: F_ENTER });
    });
    yield 8;
}
function* squall(c) {
    yield* rep(6, 6, (i) => {
        const x = 70 + i * 44;
        c.enemy("ember", { hp: 22, path: hover(x, -30, x, 90, 3, 14), script: function* (c, e) { yield 3; for (let k = 0; ; k++) { c.ring({ at: e, n: 12, sp: 112, a0: k * 0.37, kind: PEARLB, hue: i % 2 ? AQUA : COBALT, flags: F_BOUNCE, gatherR: 40 }); yield 4; } } });
    });
    yield c.bars(3);
}
function* eyeOfIt(c) {
    yield* rep(10, 4, (i) => {
        // Rings close from outside; the door walks around the circle.
        c.ring({ at: [180, 300], n: 40, r0: 460, sp: -96, gapC: i * 0.9, gapW: 0.9, tele: false, kind: BEAD, hue: i % 2 ? AQUA : PEARL, life: 4.7, flags: F_ENTER });
        c.ring({ at: [180, 300], n: 10, sp: 70, a0: i * 0.5, kind: SHARD, hue: COBALT, bell: false, gatherR: 80 });
    });
    yield 8;
}

const COMET = {
    id: "comet", name: "The Comet", home: [180, 120],
    phases: [
        { id: "transit", name: "Transit", hp: 220, bars: 18, enter: (b) => { b.tail = 1; },
          tracks: [
              (c, b) => (function* () {
                  for (let i = 0; ; i++) {
                      const s = i % 2 ? 1 : -1, y = 70 + (i % 3) * 30;
                      c.glide(b, 180 + s * 170, y, 8);
                      for (let k = 0; k < 16; k++) {
                          // A hanging trail that lets go a bar later; every fourth bead is missing, so the trail has doors.
                          if (k % 4 !== (i & 3)) c.shot({ a0: DOWN, sp: 0, wait: 4, spd2: 124, kind: PETAL, hue: k % 8 < 4 ? AQUA : PEARL, bell: k % 4 === 0 ? null : false });
                          yield 0.5;
                      }
                  }
              })(),
              loop(4, (c) => c.ring({ n: 5, a0: "aim", arc: 0.8, sp: 110, kind: DASH, hue: VIOLET, bell: false, tele: false }), 1),
          ] },
        { id: "curtains", name: "Northern Curtains", hp: 380, bars: 18, enter: (b) => { b.home = [180, 110]; },
          tracks: [
              loop(0.5, (c, b, i) => {
                  const q = (i % 32) / 32 * TAU, open = 180 + 130 * Math.sin(q + Math.floor(i / 32));
                  const x = 15 + (i * 5 % 12) * 30.5;
                  if (Math.abs(x - open) > 42) c.shot({ at: [x, -12], a0: DOWN, sp: 124, kind: DASH, hue: i % 3 ? JADE : VIOLET, line: c.depth, lineStep: 0.1, wob: 0.5, wobF: 1.6, bell: false, flags: F_ENTER });
              }),
              loop(4, (c, b, i) => c.ring({ n: 16, sp: 66, a0: i * 0.3, kind: PEARLB, hue: COBALT, march: true, mesh: "cn", shade: 0.7 })),
          ] },
        { id: "peri", name: "Perihelion", hp: 300, bars: 20, enter: (b) => { b.orbit = 1; },
          tracks: [
              loop(0.25, (c, b, i) => c.ring({ n: 3, exact: true, sp: 92, a0: i * 0.31, kind: PETAL, hue: i % 16 < 8 ? AQUA : COBALT, tele: false, mesh: "pe", shade: 0.85, bell: i % 4 ? false : null })),
              loop(8, (c, b, i) => c.ring({ at: [180, 300], n: 18, sp: 58, kind: ORB, size: 0.55, a0: i, hue: AMBER, bell: 0 }), 3),
          ] },
        { id: "breakup", name: "Breakup", hp: 340, bars: 20, enter: (b) => { b.orbit = 0; b.split = 1; b.home = [180, 110]; },
          tracks: [
              (c, b) => (function* () {
                  for (let i = 0; ; i++) {
                      const f = b.frag[i % 3];
                      c.ring({ at: f, n: 13, sp: 78, a0: i * 0.2, kind: SHARD, hue: [AQUA, VIOLET, PEARL][i % 3], gatherR: 38, bell: i % 3, mesh: `bk${i % 3}`, shade: 0.75 });
                      yield 1.5;
                  }
              })(),
              loop(4, (c, b, i) => c.ring({ n: 3, exact: true, a0: "aim", arc: 0.3, sp: 148, kind: DASH, hue: RUBY, tele: false, bell: false }), 1),
          ] },
    ],
};

// --- The Flame ----------------------------------------------------------------------------------------------

function* ashes(c) {
    yield* rep(10, 3, (i) => {
        c.shot({ at: [40 + (i * 131) % 280, -12], a0: DOWN, sp: 22, fall: 8, maxS: 60, wob: 40, wobF: 1.2, kind: MOTHB, hue: AMBER, tele: false, flags: F_ENTER });
    });
    yield 4;
}
function* others(c) {
    // The ones who came before.
    yield* rep(8, 2, (i) => c.ring({ at: [180, 230], n: 6, a0: i * 0.7, sp: 40, w: 0.5, kind: MOTHB, hue: AMBER, gatherR: 80 }));
    yield 4;
}

const FLAME = {
    id: "flame", name: "The Flame", home: [180, 210],
    phases: [
        { id: "warmth", name: "Warmth", hp: 520, bars: 16, enter: (b) => { b.heat = 0.3; },
          tracks: [
              loop(2, (c, b, i) => c.ring({ n: 26, sp: 46, depth: 3, a0: i * 0.12, kind: PEARLB, hue: i % 2 ? GOLD : AMBER, march: true, mesh: "wa", shade: 0.8 })),
          ] },
        { id: "pull", name: "Drawn In", hp: 760, bars: 20, enter: (b, p) => { b.heat = 0.6; p.well = { x: 180, y: 210, k: 0.75, pull: 26 }; },
          leave: (b, p) => { p.well = null; },
          tracks: [
              loop(1, (c, b, i) => c.ring({ n: 7, sp: 104, a0: i * 0.52, kind: SEED, hue: i % 4 < 2 ? AMBER : RUBY, flags: F_GRAV, r0: 30, life: 7, tele: false, bell: i % 2 ? false : null, w: 0.5, mesh: "pu", shade: 0.7 })),
              loop(8, (c, b, i) => c.ring({ n: 8, a0: i, sp: 34, kind: ORB, size: 0.6, hue: GOLD, flags: F_GRAV, life: 7, bell: 0 }), 3),
          ] },
        { id: "echoes", name: "All the Night Before", hp: 1150, bars: 32, enter: (b) => { b.heat = 0.45; },
          tracks: [
              // Everything you met, remembered in fire: the bloom, the tide, the web, the window, the comet.
              (c, b) => (function* () {
                  for (let round = 0; ; round++) {
                      for (let i = 0; i < 8; i++) { const s = i % 2 ? 1 : -1; c.ring({ n: 12, sp: 72, depth: 5, w: s * 0.62, a0: i * 0.13, hue: s > 0 ? ROSE : VIOLET, kind: PETAL, mesh: `e${s}`, shade: 0.85 }); yield 2; }
                      for (let i = 0; i < 16; i++) { c.lane({ n: 26, sp: 72, thick: 3, c: 180 + 118 * Math.sin(i * 0.33 + round), gap: 74, hue: AQUA, mesh: "et", shade: 0.75, bell: i % 2 ? false : null }); yield 1; }
                      for (let k = 0; k < 6; k++) { web(c, b, round + k / 6 * TAU, { wait: (6 - k) * 2, out: 74 }); yield 2; }
                      yield 4;
                      for (let i = 0; i < 16; i++) { c.ring({ n: 12, exact: true, sp: 66, depth: 4, w: i % 2 ? 0.34 : -0.34, a0: i * Math.PI / 24, kind: SHARD, hue: i % 2 ? COBALT : RUBY, tele: false, mesh: `ew${i % 2}`, shade: 0.9, bell: i % 4 ? false : null }); yield 1; }
                      for (let i = 0; i < 16; i++) { const x = 20 + ((i * 7) % 16) * 21.3; if (i % 4) c.shot({ at: [x, 40], a0: DOWN, sp: 0, wait: 4, spd2: 120, kind: PETAL, hue: AQUA, bell: i % 4 === 1 ? null : false }); yield 0.5; }
                  }
              })(),
          ] },
        { id: "blaze", name: "Blaze", hp: 460, bars: 24, enter: (b) => { b.heat = 1; },
          tracks: [
              loop(0.25, (c, b, i) => c.ring({ n: 4, exact: true, sp: 96, a0: i * 0.29, kind: PETAL, hue: i % 16 < 8 ? AMBER : RUBY, tele: false, mesh: "bz", shade: 0.9, bell: i % 4 ? false : null })),
              loop(0.5, (c, b, i) => c.shot({ at: [30 + ((i * 113) % 300), c.H + 12], a0: UP, sp: 92, kind: SEED, hue: GOLD, wob: 0.6, wobF: 1.4, bell: false, flags: F_ENTER })),
              loop(8, (c, b, i) => c.ring({ n: 9, a0: "aim", sp: 52, kind: ORB, size: 0.7, hue: PEARL, gatherR: 100, bell: 0 }), 7),
          ] },
        { id: "last", name: "Last Light", hp: 0, bars: 16, timed: true, enter: (b) => { b.heat = 0.2; b.gutter = 1; },
          tracks: [
              // She stops fighting. The most beautiful one is the gentlest. Live through it and it is over.
              loop(2, (c, b, i) => { const s = i % 2 ? 1 : -1; c.ring({ n: 20, exact: true, sp: 54, w: s * 0.4, a0: i * 0.16, kind: PETAL, hue: s > 0 ? GOLD : ROSE, mesh: `ll${s}`, shade: 1, pane: s > 0 ? GOLD : ROSE }); }),
          ] },
    ],
};

export const STAGES = [
    { id: 1, depth: 3, name: "The Meadow at Dusk", sky: "meadow", song: "s1", bossSong: "b1", accent: "#ff7ab8", boss: NIGHTBLOOM, enemy: "wisp",
      waves: [{ id: "lights", name: "First Lights", fn: firstLights }, { id: "flies", name: "Fireflies", fn: fireflies }, { id: "lan", name: "A Lantern", fn: lanterns }, { id: "rain", name: "Dusk Rain", fn: duskRain }, { id: "twin", name: "Twin Lanterns", fn: twinLanterns }] },
    { id: 2, depth: 4, name: "Moon River", sky: "river", song: "s2", bossSong: "b2", accent: "#6fe8ff", boss: TIDE,
      waves: [{ id: "ripples", name: "Ripples", fn: ripples }, { id: "moonrise", name: "Moonrise", fn: moonrise }, { id: "reflect", name: "Reflections", fn: reflections }, { id: "chorus", name: "Bell Chorus", fn: bellChorus }, { id: "swell", name: "The Swell", fn: theSwell }] },
    { id: 3, depth: 4, name: "The Thicket", sky: "thicket", song: "s3", bossSong: "b3", accent: "#7dffb0", boss: WEAVER,
      waves: [{ id: "threads", name: "Threads", fn: threads }, { id: "waltz", name: "Waltz", fn: waltz }, { id: "dew", name: "Dew and Bats", fn: dew }, { id: "edge", name: "Edge of the Web", fn: edgeOfWeb }, { id: "wheel", name: "Bat Wheel", fn: batWheel }] },
    { id: 4, depth: 5, name: "The Cathedral", sky: "cathedral", song: "s4", bossSong: "b4", accent: "#ff6a5c", boss: ROSEW,
      waves: [{ id: "votive", name: "Votive Lights", fn: votive }, { id: "choir", name: "Choir", fn: choir }, { id: "nave", name: "The Nave", fn: nave }, { id: "toll", name: "Tolling", fn: tolling }] },
    { id: 5, depth: 6, name: "Above the Storm", sky: "storm", song: "s5", bossSong: "b5", accent: "#8ad8ff", boss: COMET,
      waves: [{ id: "static", name: "Static", fn: staticWave }, { id: "aurora", name: "Aurora", fn: aurora }, { id: "squall", name: "Squall", fn: squall }, { id: "eye", name: "The Eye", fn: eyeOfIt }] },
    { id: 6, depth: 7, name: "The Flame", sky: "void", song: "s6", bossSong: "b6", accent: "#ffc56a", boss: FLAME, final: true,
      waves: [{ id: "ashes", name: "Ashes", fn: ashes }, { id: "others", name: "The Others", fn: others }] },
];
export const DIFFS = [
    { id: "dusk", name: "Dusk", about: "A gentle night", lvl: 0, n: 0.8, sp: 0.86, depth: 0.5, lives: 5, grace: true, score: 0.7 },
    { id: "night", name: "Night", about: "As it was meant", lvl: 1, n: 1, sp: 1, depth: 1, lives: 3, grace: false, score: 1 },
    { id: "midnight", name: "Midnight", about: "No mercy, only beauty", lvl: 2, n: 1.16, sp: 1.08, depth: 1.36, lives: 3, grace: false, score: 1.5 },
];
