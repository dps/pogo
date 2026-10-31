// Bots finish the example games, proving they can be won and showing how an agent tests gameplay headless.
import assert from "node:assert/strict";
import { test } from "node:test";

const load = async (file) => {
    await import(`../examples/${file}.js`);
    return globalThis.__pogo;
};

test("hopper can be finished by a simple bot", async () => {
    const g = await load("hopper");
    g.restart("play");
    for (let i = 0; i < 60 * 40 && g.currentName === "play"; i++) {
        const s = g.current, h = s.first("hero");
        if (h) {
            g.input.press("right", 2);
            // Jump at the last moment before an edge, a wall or an enemy, the way a player would.
            const gap = !s.overlap(h.pos.add([20, 26]), { size: [6, 6], tag: "ground" }).length;
            const enemy = s.overlap(h.pos.add([40, 0]), { size: [30, 30], tag: "enemy" }).length;
            const wall = s.raycast(h.pos, [1, 0], { max: 24, tag: "ground" });
            if (h.grounded && (gap || enemy || wall)) g.input.press("jump", 16);
        }
        g.step(1);
    }
    assert.equal(g.currentName, "end", `bot stuck at ${g.state().entities.find((e) => e.label === "hero")?.pos}`);
    assert.ok(g.data.coins >= 1);
    assert.ok(g.audio.log.includes("win"), `sounds: ${g.audio.log}`);
});

test("lane blast can be survived for 30 seconds by a bot that reads the world", async () => {
    const g = await load("laneblast");
    g.restart("run");
    const LANES = [-2.2, 0, 2.2];
    for (let i = 0; i < 60 * 30; i++) {
        const s = g.current;
        if (g.currentName !== "run") break;
        const ship = s.first("ship");
        const blocked = (x) => s.find("block").some((b) => Math.abs(b.pos.x - x) < 1 && b.pos.z < 0 && b.pos.z > -14);
        if (i % 4 === 0 && blocked(LANES[ship.lane])) {
            const best = [0, 1, 2].filter((l) => !blocked(LANES[l])).sort((a, b) => Math.abs(a - ship.lane) - Math.abs(b - ship.lane))[0];
            if (best !== undefined && best !== ship.lane) g.input.press(best < ship.lane ? "left" : "right", 1);
        }
        g.step(1);
    }
    assert.equal(g.currentName, "run", "the bot crashed");
    assert.ok(g.data.score > 400, `score ${g.data.score}`);
});
