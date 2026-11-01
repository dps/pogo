// The proof. For every authored level: solve it exhaustively, report the shortest solution (pushes, and steps with walking),
// and remove each named idea from the rules to show that the level then has no solution at all.
// It also measures a random pusher, the share of dead boards, and how tight the good route is. Writes solutions.js.
// usage: node tools/check.mjs [--fresh]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { E, parseLevel, newState, move, solved, DIR_LETTERS } from "../rules.js";
import { analyze, planToMoves, randomWins, shortestSteps, solve } from "../solver.js";
import { LEVELS, REGIONS } from "../levels.js";

const args = process.argv.slice(2), fresh = args.includes("--fresh");
const cacheFile = new URL("./check-cache.json", import.meta.url), solFile = new URL("../solutions.js", import.meta.url);
const cache = !fresh && existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile)) : {};

/** Ideas that can be proved necessary. The checker tries all of them, then demands the level's own `needs` are among the proved. */
export const IDEAS = {
    GROW: "balls grow on fresh snow", GROW_BIG: "a ball can grow to full size", STACK: "smaller goes on bigger",
    TRACK: "roll along an old track so a ball does not grow", UNSTACK: "take a stack apart", TOP_GROW: "drop a stacked ball onto snow to grow it", PLOW: "a big ball ploughs snow out of the way",
    SLIDE: "balls slide on ice", ICE_STOP: "stop a slide with a blocker on the ice", SLIDE_STACK: "slide a ball onto a stack",
    SHRINK: "warm stones shrink a ball", MELT: "melt a spare ball away", WARM_STACK: "stack on warm stones, where nothing melts",
    SHAKE: "shake a laden pine", SNOW_REGROW: "grow on snow a pine dropped",
    FILL: "fill a ditch with a ball", FILL_GROW: "grow on a filled ditch",
    ON_PLATE: "weigh down a plate", OFF_PLATE: "take the weight off a plate",
};
export const OTHER_IDEAS = { PLINTH: "the snowman must stand on the lantern ring, which makes the route longer" };

let seed = 12345;
const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const rows = [], fails = [];
const solutions = {};
for (const def of LEVELS) {
    const key = createHash("md5").update(JSON.stringify([def.rows, def.need])).digest("hex");
    let r = Object.values(cache).find((c) => c.key === key);
    if (!r || r.key !== key) {
        const lvl = parseLevel(def), t0 = Date.now();
        const a = solve(lvl, { max: 4e6 });
        r = { key, id: def.id, name: def.name, opt: !!def.opt, region: def.region, solved: a.solved, boards: a.boards };
        if (a.solved) {
            const moves = planToMoves(lvl, a.plan), best = shortestSteps(lvl, 2e6);
            r.pushes = a.pushes; r.steps = best?.steps ?? moves.length; r.sol = { moves: best?.moves ?? moves, pushes: a.pushes, steps: r.steps };
            // Replay the stored solution through the rules once more, from nothing.
            const st = newState(lvl); for (const ch of r.sol.moves) if (!move(lvl, st, DIR_LETTERS.indexOf(ch))) throw new Error(`replay blocked in ${def.id}`);
            if (!solved(lvl, st.c)) throw new Error(`replay failed in ${def.id}`);
            r.proved = []; r.unknown = [];
            for (const name of Object.keys(IDEAS)) {
                const k = solve(lvl, { forbid: E[name], max: 3e6 });
                if (!k.solved && k.exhausted) r.proved.push(name); else if (!k.solved) r.unknown.push(name);
            }
            // A lantern ring is an idea too: without it the level must be shorter, or the ring is decoration.
            if (lvl.plinths.length) {
                const free = solve(parseLevel({ ...def, rows: def.rows.map((x) => x.replaceAll("*", ".")) }), { max: 3e6 });
                if (free.solved && free.pushes < a.pushes) r.proved.push("PLINTH");
                r.freePushes = free.pushes;
            }
            const all = analyze(lvl, 1.2e6);
            if (all) { r.dead = +all.deadShare.toFixed(3); r.trap = +all.trap.toFixed(3); r.forced = +all.forced.toFixed(3); r.reach = all.boards; }
            r.random = +randomWins(lvl, 3000, Math.max(30, a.pushes * 3), rng).toFixed(4);
        }
        r.ms = Date.now() - t0;
        cache[key] = r;
        writeFileSync(cacheFile, JSON.stringify(cache));
    }
    r.region = def.region; r.name = def.name; r.opt = !!def.opt; r.id = def.id; r.rowsKey = def.rows.join("/");
    if (!r.solved) fails.push(`${def.id} UNSOLVED`);
    else {
        solutions[def.id] = r.sol;
        for (const n of def.needs ?? []) if (!r.proved.includes(n)) fails.push(`${def.id} does not provably need ${n}`);
        if (!(def.needs ?? []).length) fails.push(`${def.id} names no idea`);
    }
    rows.push(r);
}
const pad = (v, n) => String(v ?? "").padStart(n);
console.log("id   name                    push step   boards  dead  trap   rand  ideas proved necessary");
for (const r of rows) console.log(`${r.id.padEnd(4)} ${(r.name ?? "").slice(0, 22).padEnd(23)} ${pad(r.pushes, 4)} ${pad(r.steps, 4)} ${pad(r.reach ?? r.boards, 8)} ${pad(r.dead, 5)} ${pad(r.trap, 5)} ${pad(r.random, 6)}  ${(r.proved ?? []).join(" ")}${r.unknown?.length ? "  ?" + r.unknown.join(",") : ""}`);
const mean = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : "-");
console.log("\nregion            main levels  mean pushes  mean dead  | optional  mean pushes");
REGIONS.forEach((reg, i) => {
    const m = rows.filter((r) => r.region === i && !r.opt && r.solved), o = rows.filter((r) => r.region === i && r.opt && r.solved);
    console.log(`${reg.name.padEnd(18)} ${String(m.length).padStart(4)} ${mean(m.map((r) => r.pushes)).padStart(14)} ${mean(m.map((r) => r.dead ?? 1)).padStart(10)}   | ${String(o.length).padStart(4)} ${mean(o.map((r) => r.pushes)).padStart(14)}`);
});
const hard = rows.filter((r) => (r.pushes ?? 0) >= 8), flailed = hard.filter((r) => r.random > 0.01);
console.log(`\nof ${hard.length} levels of 8 pushes or more, ${flailed.length} fall to random pushing more than 1% of the time: ${flailed.map((r) => `${r.id} ${r.random}`).join(", ")}`);
console.log(`\n${rows.length} levels, ${rows.filter((r) => r.solved).length} solved, ${LEVELS.filter((l) => l.opt).length} optional`);
if (fails.length) console.log("FAILURES\n" + fails.join("\n"));
writeFileSync(solFile, `// Written by tools/check.mjs: a proven shortest solution per level.\nexport const SOLUTIONS = ${JSON.stringify(solutions)};\n`);
process.exitCode = fails.length ? 1 : 0;
