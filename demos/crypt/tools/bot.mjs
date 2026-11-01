// Plays complete runs through the real scenes: real input, real shop, real recap. The search bot supplies moves.
import "../game.js";
import { solve } from "../solver.js";
const game = globalThis.__pogo, ctx = game.crypt;
const seeds = (process.argv[2] ?? "101,202").split(",").map(Number), keepers = (process.argv[3] ?? "mort,mort").split(",");
const pressFor = ["up", "right", "down", "left"];
function tapButton(name) {
    const e = game.current.entities.find((q) => q.alive && q.btn && q.name === name && !q.hidden);
    if (!e) return false;
    game.input.tap(e.pos.x, e.pos.y); game.step(2); return true;
}
function waitIdle(limit = 400) { const f = ctx.state.floor; for (let i = 0; i < limit && f.stage.busy; i++) game.step(1); game.step(1); }
function stepUntil(fn, limit = 1200) { for (let i = 0; i < limit; i++) { if (fn()) return true; game.step(1); } return false; }

for (let r = 0; r < seeds.length; r++) {
    game.restart("title");
    game.step(5);
    const save = ctx.save(); save.bosses = 4;
    const run0 = (await import("../run.js")).newRun(game, { seed: seeds[r], keeper: keepers[r % keepers.length] });
    game.go("play", {}); game.step(3);
    let floors = 0, t0 = performance.now(), worstLoad = 0;
    for (;;) {
        const scene = game.currentName;
        if (scene === "play") {
            const run = game.data.run, index = run.floor;
            let frames = 0;
            stepUntil(() => { frames++; return ctx.state.floor && ctx.state.floor.mode === "play" && ctx.state.floor.fl.name === run.jobs[index]?.done?.meta.name && game.current === ctx.state.floor.stage.s; });
            worstLoad = Math.max(worstLoad, frames);
            const f = ctx.state.floor, path = solve(f.fl, f.state, { cap: 600000, maxDepth: 60 }).path;
            if (!path?.length) throw new Error("no flawless path on floor " + index + " with relics " + run.relics);
            let i = 0;
            for (const a of path) {
                waitIdle();
                // Mix input methods: keys, swipes and taps all reach the same act().
                const before = f.moves();
                if (a === 4) game.input.press("wait", 1);
                else if (i % 3 === 0) game.input.press(pressFor[a], 1);
                else if (i % 3 === 1) { const v = game.view, cx = v.width / 2, cy = v.height * 0.4, [dx, dy] = [[0, -60], [60, 0], [0, 60], [-60, 0]][a]; game.input.drag(cx, cy, cx + dx, cy + dy); }
                else { const st = f.state, w = f.fl.w, x = st[0] % w, y = (st[0] / w) | 0, [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][a]; const [vx, vy] = f.stage.toView(x + dx, y + dy); game.input.tap(vx, vy); }
                game.step(2);
                if (f.moves() === before && game.currentName === "play") throw new Error(`input ${i} (${a}) on floor ${index} did not register, mode ${f.mode}`);
                i++;
            }
            stepUntil(() => game.currentName !== "play", 300);
            if (game.currentName === "play") throw new Error(`stuck after solving floor ${index}: mode ${f.mode}, won ${f.state[11]}`);
            floors++;
        } else if (scene === "shop") {
            stepUntil(() => game.current.entities.some((e) => e.btn && e.name === "onward"), 60);
            for (const name of ["item0", "item1", "item2"]) if (game.currentName === "shop") tapButton(name);
            game.step(30);
            if (game.currentName === "shop") tapButton("onward");
            stepUntil(() => game.currentName !== "shop", 120);
            if (game.currentName === "shop") throw new Error("stuck in shop");
        } else if (scene === "recap") {
            for (let i = 0; i < 12; i++) { if (!tapButton("nextsnap")) break; game.step(25); }
            game.step(30);
            const st = game.state();
            const run = game.data.run;
            console.log(`seed ${seeds[r]} ${run.keeper}: floors ${floors}, won ${run.won}, hp ${run.hp}/${run.maxHp}, coins ${run.coins}, relics ${run.relics.join("+")}, snaps ${run.snaps.length}, moves ${run.stats.moves}, kills ${run.stats.kills}, bonks ${run.stats.bonks}, slowest floor load ${worstLoad} frames, haptics ${st.haptics?.length ?? 0}, ${(performance.now() - t0) | 0} ms`);
            if (!run.won) throw new Error("did not win");
            break;
        } else throw new Error("unexpected scene " + scene);
    }
}
console.log("ALL RUNS COMPLETE");
process.exit(0);
