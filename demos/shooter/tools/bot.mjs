// Plays the whole game headless, through the same inputs a player has: stick, look deltas and action presses.
// It reads the world to decide what to do, but it never touches game state. Usage: node tools/bot.mjs [seed] [startLevel] [--verbose]
import "../game.js";
const game = globalThis.__pogo;
const seedArg = Number(process.argv[2] ?? 1), startLevel = Number(process.argv[3] ?? 0), verbose = process.argv.includes("--verbose");
const onlyOne = process.argv.includes("--one");
const SENS = 0.0028, TILE = 2.4, MAX_STEPS = 60 * 60 * 14;
const input = game.input;
input.touchMode = process.argv.includes("--touch");
const rnd = new (game.rng.constructor)(seedArg * 7919 + 1);
const norm = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

game.restart("title");
game.step(2);
const results = [];
let steps = 0, stepsInLevel = 0, levelIdx = startLevel, deaths = 0, stuck = 0, lastX = 0, lastZ = 0, side = 1, stuckT = 0, peakMs = 0, jitter = 0, minHp = 100, lastPrint = 0;
const start = () => { if (startLevel === 0) input.press("confirm", 2); else game.startAt(startLevel); };
start();
game.step(40);

// A human can't see behind them, reacts in a fraction of a second, and doesn't aim perfectly.
const HUMAN = !process.argv.includes("--perfect");
const FOV = HUMAN ? 0.95 : 4, REACT = HUMAN ? 16 : 0, AIM_RATE = HUMAN ? 0.075 : 0.16, AIM_NOISE = HUMAN ? 0.055 : 0, FIRE_CONE = HUMAN ? 0.07 : 0.09;
let current = null, reactLeft = 0, noiseX = 0, noiseY = 0;
function nearestEnemy(w) {
    const s = w.s, p = w.player;
    let best = null, bd = 1e9;
    const fx = -Math.sin(w.yaw), fz = -Math.cos(w.yaw), heard = w.hurtDir.length > 0; // the damage wedge says where to look
    for (const e of w.enemies) {
        if (e.hidden) continue;
        const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
        if (d > 34 || d >= bd) continue;
        const dot = ((e.pos.x - p.pos.x) * fx + (e.pos.z - p.pos.z) * fz) / (d || 1);
        if (Math.acos(Math.min(1, dot)) > FOV && d > 3.5 && !heard) continue;
        const dx = e.pos.x - p.pos.x, dy = e.pos.y - p.pos.y - 0.68, dz = e.pos.z - p.pos.z;
        if (s.raycast([p.pos.x, p.pos.y + 0.68, p.pos.z], [dx, dy, dz], { tag: "wall", max: Math.hypot(dx, dy, dz), dim: 3 })) continue;
        bd = e.kind === "K" ? d - 14 : d; best = e; // Adds only matter when they're close.
    }
    return best;
}
function chooseWeapon(w, tgt) {
    const r = game.data.run, a = r.ammo;
    const order = tgt?.kind === "K" || tgt?.kind === "M" || tgt?.kind === "k"
        ? [[3, "pumpkins", 1], [4, "bulbs", 1], [2, "hornets", 1], [1, "thorns", 1]]
        : tgt && tgt.dist < 8 ? [[1, "thorns", 1], [2, "hornets", 1], [4, "bulbs", 1]] : [[2, "hornets", 1], [1, "thorns", 1], [4, "bulbs", 1]];
    for (const [i, name, n] of order) {
        if (i === 3 && tgt && tgt.dist < 7) continue;
        if (r.owned[i] && a[name] >= n) { if (r.cur !== i) input.press(`w${i + 1}`, 1); return; }
    }
    if (r.cur !== 0) input.press("w1", 1);
}
function steer(w, tx, tz, mix = 1, aim = true) {
    const p = w.player, dx = tx - p.pos.x, dz = tz - p.pos.z, l = Math.hypot(dx, dz) || 1;
    return [dx / l * mix, dz / l * mix];
}
function pushStick(w, wx, wz) {
    const fx = -Math.sin(w.yaw), fz = -Math.cos(w.yaw), rx = Math.cos(w.yaw), rz = -Math.sin(w.yaw);
    const mx = wx * rx + wz * rz, my = -(wx * fx + wz * fz);
    input.setStick(Math.max(-1, Math.min(1, mx)), Math.max(-1, Math.min(1, my)));
}
function lookAt(w, x, y, z, rate) {
    const p = w.player, dx = x - p.pos.x, dz = z - p.pos.z, dy = y - (p.pos.y + 0.68);
    const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
    const dYaw = norm(yaw - w.yaw), dPitch = pitch - w.pitch;
    const cl = (v) => Math.max(-rate, Math.min(rate, v));
    input.addLook(-cl(dYaw) / SENS, -cl(dPitch) / SENS);
    return Math.hypot(dYaw, dPitch);
}
const done = (scene) => scene === "win";
while (steps < MAX_STEPS * 6) {
    const scene = game.currentName;
    if (scene === "card") { input.press("confirm", 2); game.step(30); stepsInLevel = 0; continue; }
    if (scene === "win" || scene === "title") break;
    const w = game.sim, p = w.player;
    if (!w || w.s !== game.current) { game.step(1); continue; }
    if (w.mode === "dead") {
        deaths++; if (verbose) console.log(`  died L${game.data.run.level + 1} at ${p.pos.x.toFixed(0)},${p.pos.z.toFixed(0)} t=${w.time.toFixed(0)}s kills=${w.kills}/${w.total}`);
        for (let i = 0; i < 80; i++) game.step(1);
        input.press("fire", 3); game.step(30);
        continue;
    }
    if (w.mode !== "play") { game.step(1); continue; }

    const seen = nearestEnemy(w), hp = game.data.run.hp;
    if (seen !== current) { current = seen; reactLeft = REACT; }
    if (steps % 20 === 0) { noiseX = rnd.range(-AIM_NOISE, AIM_NOISE); noiseY = rnd.range(-AIM_NOISE, AIM_NOISE) * 0.5; }
    if (reactLeft > 0) reactLeft--;
    const tgt = reactLeft > 0 ? null : seen;
    minHp = Math.min(minHp, hp);
    let wx = 0, wz = 0;
    if (Math.random && steps % 6 === 0) chooseWeapon(w, tgt);
    // Navigation
    const path = w.objPath;
    let nx = null, nz = null;
    // Go for health and pickups first when they're close
    let goal = null;
    if (hp < 70 || game.data.run.armor < 20) {
        let bd = 30;
        for (const q of w.pickups) if (!q.banned && ((q.item.what === "hp" && hp < 95) || (q.item.what === "armor" && game.data.run.armor < 90))) { const d = Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z); if (d < bd) { bd = d; goal = q; } }
    }
    if (!goal) {
        let bd = 14;
        for (const q of w.pickups) if (!q.banned && (q.item.what === "weapon" || (q.item.what in game.data.run.ammo && game.data.run.ammo[q.item.what] < 200))) { const d = Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z); if (d < bd) { bd = d; goal = q; } }
    }
    let route = path;
    if (goal?.alive) { const r = w.route(Math.floor(goal.pos.x / TILE), Math.floor(goal.pos.z / TILE)); if (r) route = r; }
    if (route && route.length > 1) {
        const n = route[Math.min(1, route.length - 1)];
        nx = (n[0] + 0.5) * TILE; nz = (n[1] + 0.5) * TILE;
    } else if (route && route.length === 1) { nx = (route[0][0] + 0.5) * TILE; nz = (route[0][1] + 0.5) * TILE; }
    if (tgt) {
        const off = tgt.dist * noiseX, err = lookAt(w, tgt.pos.x - Math.cos(w.yaw) * off, tgt.pos.y + tgt.dist * noiseY, tgt.pos.z + Math.sin(w.yaw) * off, AIM_RATE);
        if (err < FIRE_CONE) input.press("fire", 2);
        const d = tgt.dist, tox = (tgt.pos.x - p.pos.x) / (d || 1), toz = (tgt.pos.z - p.pos.z) / (d || 1);
        if (steps % 90 === 0 && rnd.next() < 0.5) side = -side;
        // Strafe, keep range from rushers, and walk the route the rest of the time.
        const away = d < 5 ? -1 : d > 22 ? 0.6 : 0;
        wx = -toz * side + tox * away; wz = tox * side + toz * away;
        if (nx !== null && !["k", "M"].includes(tgt.kind) && d > 9) { const [a, b] = steer(w, nx, nz); wx = wx * 0.4 + a; wz = wz * 0.4 + b; }
        if (tgt.kind === "o" && d < 7) { wx = -tox; wz = -toz; if (w.dashCD <= 0) input.press("dash", 1); }
        if (tgt.kind === "M" && (tgt.state === "tell" || tgt.state === "act")) { wx = -toz * side; wz = tox * side; if (tgt.state === "act" && d < 12 && w.dashCD <= 0) input.press("dash", 1); }
        if (tgt.kind === "K") {
            const ring = w.rings.find((q) => Math.abs(Math.hypot(p.pos.x - q.x, p.pos.z - q.z) - q.r * 0.86) < 3.5);
            if (ring) input.press("jump", 3);
            if (d < 9) { wx = -tox + -toz * side * 0.5; wz = -toz + tox * side * 0.5; }
        }
    } else if (nx !== null) {
        const [a, b] = steer(w, nx, nz); wx = a; wz = b;
        lookAt(w, nx, 1.5, nz, AIM_RATE);
    } else if (w.boss?.alive) {
        lookAt(w, w.boss.pos.x, 2, w.boss.pos.z, 0.14);
    }
    // Avoid hazards unless the route demands them, and shake loose if stuck.
    const fx0 = p.pos.x + wx * 1.2, fz0 = p.pos.z + wz * 1.2, ch = w.L.ch(Math.floor(fx0 / TILE), Math.floor(fz0 / TILE));
    if (ch === "~") { wx = -wx * 0.3 + (nx !== null ? steer(w, nx, nz)[0] : 0); wz = -wz * 0.3 + (nx !== null ? steer(w, nx, nz)[1] : 0); }
    const moved = Math.hypot(p.pos.x - lastX, p.pos.z - lastZ);
    if (steps % 30 === 0) {
        if (moved < 0.4) stuck++; else stuck = 0;
        lastX = p.pos.x; lastZ = p.pos.z;
        if (stuck >= 2) { input.press("jump", 4); jitter = 24; side = -side; if (goal) goal.banned = true; }
    }
    if (jitter > 0) { jitter--; const a = steps * 0.37; wx += Math.cos(a); wz += Math.sin(a); }
    pushStick(w, wx, wz);
    const t0 = performance.now();
    game.step(1);
    const ms = performance.now() - t0;
    peakMs = Math.max(peakMs, ms);
    steps++; stepsInLevel++;
    if (stepsInLevel > MAX_STEPS) break;
    const nw = game.sim;
    if (nw.mode === "done" && game.data.run.log.length > results.length) {
        const l = game.data.run.log[game.data.run.log.length - 1];
        results.push({ level: results.length + startLevel + 1, name: l.name, time: +l.time.toFixed(1), kills: `${l.kills}/${l.total}`, secrets: `${l.secrets}/${l.secretsTotal}`, acc: l.shots ? Math.round(l.hits / l.shots * 100) : 0, deaths, hpEnd: Math.ceil(game.data.run.hp), minHp: Math.ceil(minHp), ammo: { ...game.data.run.ammo } });
        console.log(JSON.stringify(results[results.length - 1]));
        deaths = 0; minHp = 100;
        if (onlyOne) { process.exit(0); }
        game.step(60);
    }
    if (verbose && steps - lastPrint > 1800) { lastPrint = steps; console.log(`  t=${(steps / 60).toFixed(0)}s L${game.data.run.level + 1} hp ${Math.ceil(hp)} kills ${w.kills}/${w.total} obj ${w.objective?.label} pos ${(p.pos.x / TILE).toFixed(1)},${(p.pos.z / TILE).toFixed(1)} keys ${[...w.keys]} ammo ${JSON.stringify(game.data.run.ammo)}`); }
}
console.log(`END scene=${game.currentName} steps=${steps} (${(steps / 60).toFixed(0)}s) peak step ${peakMs.toFixed(2)}ms`, game.currentName === "win" ? `WON rank=${game.data.rank} acc=${game.data.accuracy}%` : `STUCK L${game.data.run?.level + 1} mode ${game.sim?.mode} obj ${game.sim?.objective?.label}`);
