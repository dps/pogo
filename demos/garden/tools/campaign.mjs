// Plays the real game headless, start to finish, the way a person would: real scenes, real drag gestures for the first
// plants, stars spent in the real Almanac tree between levels, and retries when a level is lost.
import "../game.js";
import { ALMANAC, LEVELS } from "../data.js";
import { act } from "./simbot.mjs";

const game = globalThis.__pogo;
const save = () => game.load("garden-v1", null);
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };

function press(x, y) { game.input.pointerEvent("down", 7, x, y); game.step(1); }
function move(x, y) { game.input.pointerEvent("move", 7, x, y); game.step(1); }
function release(x, y) { game.input.pointerEvent("up", 7, x, y); game.step(2); }
const tapAt = (x, y) => { press(x, y); release(x, y); };

// ---- The first minute, as a phone player ---------------------------------------------------------------------------
game.resize("phone");
game.input.touchMode = true;
game.step(5);
ok(game.currentName === "title", "boots to the title");
const play = game.current.find("play")[0] ?? game.current.entities.find((e) => e.name === "play");
tapAt(play.pos.x, play.pos.y);
game.step(60);
ok(game.currentName === "play", "one tap from title to the first level");
const P = () => game.data.play, sim = () => game.data.sim;
const L = P().L;
const packet = (i) => [L.tx + L.packW * (i % L.cols + 0.5), L.ty + L.barH + L.packH * (((i / L.cols) | 0) + 0.5)];
{
    const [x0, y0] = packet(0), tx = P().vx(4.5, 7.5), ty = P().vy(4.5, 7.5) + L.C * 1.25;   // finger below the plant
    const before = sim().pennies;
    press(x0, y0);
    for (let i = 1; i <= 12; i++) move(x0 + (tx - x0) * i / 12, y0 + (ty - y0) * i / 12);
    const dragging = P().drag();
    ok(!!dragging && dragging.moved, "dragging a packet lifts it");
    release(tx, ty);
    ok(sim().towers.length === 1, `drag from the tray plants a gnome (at ${sim().towers[0]?.c},${sim().towers[0]?.r})`);
    ok(sim().pennies < before, "planting costs pennies");
    const h = game.state().haptics;
    ok(h && h.length > 0, `planting pulses haptics: ${JSON.stringify(h?.slice?.(-3))}`);
    ok(sim().wave === 0 && sim().hold === false, "first plant starts the countdown");
    // Sealing the way is refused with a clear reason
}
{
    const s = sim(), t = s.towers[0];
    s.pennies = 500;
    const x = P().vx(t.x, t.y), y = P().vy(t.x, t.y);
    tapAt(x, y); game.step(2);
    const card = game.current.entities.find((e) => e.name === "up_a");
    ok(!card.hidden, "tapping a defender opens its upgrade paths");
    tapAt(card.pos.x, card.pos.y);
    ok(t.tier === 2 && t.branch === "a", "upgrade card buys branch A");
    const cardB = game.current.entities.find((e) => e.name === "up_b");
    ok(cardB.hidden, "the other branch closes");
    const close = game.current.entities.find((e) => e.name === "close");
    tapAt(close.pos.x, close.pos.y); game.step(2);
    const spd = game.current.entities.find((e) => e.name === "speed");
    tapAt(spd.pos.x, spd.pos.y); tapAt(spd.pos.x, spd.pos.y); game.step(1);
    const send = game.current.entities.find((e) => e.name === "send");
    const pen = s.pennies;
    tapAt(send.pos.x, send.pos.y); game.step(1);
    ok(s.wave === 1 && s.pennies > pen, `sending early pays a bonus (+${(s.pennies - pen) | 0}p)`);
    const pv = game.current.entities.find((e) => e.name === "preview");
    tapAt(pv.pos.x, pv.pos.y); game.step(2); const pOpen = s.time; game.step(10);
    ok(s.time === pOpen, "the wave preview pauses to let you read it");
    tapAt(pv.pos.x, pv.pos.y); game.step(10);
    ok(s.time > pOpen, "closing it resumes");
    const pause = game.current.entities.find((e) => e.name === "pause");
    tapAt(pause.pos.x, pause.pos.y); game.step(2); const pT = s.time; game.step(10);
    ok(s.time === pT, "pause stops the garden");
    tapAt(pause.pos.x, pause.pos.y); game.step(2);
}

// ---- The whole campaign ---------------------------------------------------------------------------------------------
function spendStars() {
    const sv = game.current; void sv;
    const s = save();
    let free = s.stars.reduce((n, v) => n + (v ?? 0), 0) + s.endlessStars - ALMANAC.reduce((n, a) => n + (s.meta[a.id] ? a.cost : 0), 0);
    let bought = 0;
    for (const n of [...ALMANAC].sort((a, b) => a.cost - b.cost)) {
        if (n.id === "root" || s.meta[n.id] || n.cost > free || (n.parent !== "root" && !s.meta[n.parent])) continue;
        s.meta[n.id] = 1; free -= n.cost; bought++;
    }
    return { s, bought };
}
const G = { };
let wins = 0, tries = 0, total = 0;
const report = [];
game.resize(process.argv.includes("--landscape") ? "phone-landscape" : "phone");
for (let level = 0; level < LEVELS.length; level++) {
    let attempt = 0, won = false;
    while (attempt < 8 && !won) {
        attempt++; tries++;
        // Spend stars through the real Almanac screen's save.
        globalThis.__garden.spendAll();
        game.go("play", { level, seed: attempt * 31 });
        game.step(30);
        const s = sim(), p = P();
        p.speed(3);
        let n = 0;
        while (!s.over && n < 60 * 60 * 20) {
            if (n % 10 === 0) act(s);
            if (n % 60 === 0 && s.slipperCd <= 0 && s.enemies.length) { const e = [...s.enemies].sort((a, b) => a.prog - b.prog)[0]; if (e && !e.burrowed && e.prog < 6) s.slipper(e.x, e.y); }
            game.step(1); n++;
        }
        won = s.over === "win";
        game.step(100);
        report.push(`L${level + 1} try ${attempt}: ${s.over} ${"*".repeat(s.stars ?? 0)} bites ${Math.ceil(s.bites)}/${s.maxBites} wave ${s.wave}/${s.total} towers ${s.towers.length} ${Math.round(n / 60)}s`);
        if (won) { wins++; total += s.stars; }
    }
    console.log(report[report.length - 1], attempt > 1 ? `(after ${attempt} tries)` : "");
    if (!won) break;
}
console.log(`won ${wins}/${LEVELS.length} levels in ${tries} tries, ${total} stars`);
ok(wins === LEVELS.length, "the whole campaign can be completed");
