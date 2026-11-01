// Shared bot plumbing: restore a rest state, wait, shoot, run to the end of the shot.
import { HZ } from "../sim.js";
export const seedRng = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
export const isTimed = (c) => !!(c.decks.some((d) => d.move || d.spin || d.swing) || c.sweepers.length || c.geysers.length || c.plants.length);
export function restAt(sim, st) {
    sim.x = st.x; sim.y = st.y; sim.z = st.z; sim.vx = sim.vy = sim.vz = sim.wx = sim.wy = sim.wz = 0; sim.svx = sim.svy = sim.svz = 0;
    sim.t = st.t; sim.mode = "rest"; sim.restT = 0; sim.shotT = 0; sim.inside = null; sim.riding = null; sim.ground = 3; sim.nx = st.nx ?? 0; sim.ny = st.ny ?? 1; sim.nz = st.nz ?? 0; sim.fired = -1; sim.secret = !!st.secret; sim.deckG = 0;
    sim.ate.fill(-99); sim.spat.fill(-99);
    // A ball riding a moving deck keeps the deck's velocity, or it would skid the moment it's restored.
    if (st.v) { [sim.vx, sim.vy, sim.vz, sim.wx, sim.wy, sim.wz, sim.svx, sim.svy, sim.svz] = st.v; sim.riding = st.riding; sim.deckG = 3; }
}
export function shot(sim, st, s) {
    restAt(sim, st);
    const n0 = Math.round((s.wait ?? 0) * 60) * 4;
    for (let i = 0; i < n0 && sim.mode === "rest"; i++) sim.step();
    if (sim.mode === "rest") sim.shoot(s.h, s.p, s.chip);
    let n = 0;
    while ((sim.mode === "roll" || sim.mode === "inside") && n < 40 * HZ) { sim.step(); n++; }
    return { x: sim.x, y: sim.y, z: sim.z, t: sim.t, nx: sim.nx, ny: sim.ny, nz: sim.nz, secret: sim.secret, mode: sim.mode, reason: sim.reason, steps: n, riding: sim.riding, v: sim.riding !== null && sim.riding !== undefined ? [sim.vx, sim.vy, sim.vz, sim.wx, sim.wy, sim.wz, sim.svx, sim.svy, sim.svz] : null };
}
