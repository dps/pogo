// Lane Blast: a 3D runner. Shows voxel models, shadows, fog, instancing at scale and swipe controls under a 2D HUD.
import { body, button, clamp, collider, color, createGame, damp, deg, lerp, mesh, pin, pos, rot, solid, text } from "../dist/pogo.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#312e81", "#f97316"],
    letterbox: "#0f172a",
});

game.assets.voxels("ship", [`
    ...s...
    ...s...
    ..sss..
    ..sbs..
    .sssss.
    sssssss
    r.rrr.r
`, `
    .......
    ...w...
    ...c...
    ..wcw..
    ..www..
    .wwwww.
    .......
`, `
    .......
    .......
    .......
    ...c...
    ...w...
    .......
    .......
`], undefined, { unit: 0.2 });

game.assets.voxels("tree", [`
    .....
    .....
    ..u..
    .....
    .....
`, `
    .....
    .....
    ..u..
    .....
    .....
`, `
    .eee.
    egggg
    eggge
    gggge
    .gge.
`, `
    .....
    .ggg.
    .geg.
    .ggg.
    .....
`, `
    .....
    .....
    ..g..
    .....
    .....
`], undefined, { unit: 0.5 });

const LANES = [-2.2, 0, 2.2];
const HAZE = "#c98a6a";

game.scene("title", (s) => {
    s.cam3.set([0, 2.4, 6], [0, 0.6, 0]);
    const ship = s.add([mesh("ship"), pos(0, 0.8, 0), rot(0, 0.6, 0)]);
    s.add([mesh("plane", { size: [200, 1, 200], color: "#14532d", shadow: false }), pos(0, -0.4, 0)]);
    s.onUpdate((dt) => { ship.rot.y += dt * 0.8; });
    s.add([text("LANE BLAST", { size: 42, bold: true, color: "#fef3c7" }), pin("top", [0, 28])]);
    s.add([text("Swipe, tap or use the arrow keys", { size: 16, color: "#fde68a", maxWidth: 300 }), pin("top", [0, 88])]);
    s.add([button("Start", { action: "confirm", color: "#ea580c", onTap: () => { game.sfx("click"); game.go("run", {}, { fade: 0.3 }); } }), pin("bottom", [0, 36])]);
});

game.scene("run", (s) => {
    s.gravity3.set(0, -40, 0);
    s.light.fog = { color: color(HAZE), near: 24, far: 62 };
    s.light.shadowRange = 26;
    s.light.dir.set(-0.45, -1, -0.5);

    s.add([mesh("box", { size: [9, 1, 400], color: "#475569" }), pos(0, -0.5, -170), collider(), solid(), { name: "road" }]);
    for (const x of [-1.1, 1.1]) s.add([mesh("box", { size: [0.08, 0.02, 400], color: "#cbd5e1", unlit: true, shadow: false }), pos(x, 0.02, -170)]);
    s.add([mesh("plane", { size: [300, 1, 500], color: "#14532d", shadow: false }), pos(0, -0.8, -170)]);

    const ship = s.add([mesh("ship"), pos(0, 0.5, 0), collider({ size: [1.0, 0.8, 1.2], scale: 0.9 }), body(), "ship", { lane: 1 }]);
    s.cam3.follow(ship, { offset: [0, 5.4, 7], look: [0, 0.4, -5], speed: 9 });

    let speed = 16, score = 0, dead = false;
    game.data.score = 0;
    const scoreLabel = s.add([text("0", { size: 34, bold: true, color: "#ffffff" }), pin("top", [0, 10]), { name: "score" }]);

    // World objects scroll past a stationary ship, so floating point stays precise however long the run lasts.
    const scroller = (e) => e.onUpdate((dt) => {
        if (!dead) e.pos.z += speed * dt;
        if (e.pos.z > 12) e.destroy();
    });
    const spawnTree = (z) => {
        const side = s.rng.chance(0.5) ? -1 : 1, x = side * s.rng.range(6.5, 22);
        scroller(s.add([mesh("tree", { size: s.rng.range(2.5, 4.5) }), pos(x, 1.5, z), rot(0, s.rng.range(6.28), 0), "tree"]));
    };
    for (let z = -60; z < 0; z += 1.4) spawnTree(z);
    s.every(0.08, () => { spawnTree(-62); });

    const spawnRow = () => {
        const free = s.rng.int(0, 2);
        LANES.forEach((x, i) => {
            if (i === free) {
                if (s.rng.chance(0.7)) scroller(s.add([mesh("torus", { size: [1, 0.28, 1], color: "#facc15", unlit: true }), pos(x, 1.0, -60), rot(deg(90), 0, 0), collider({ size: [1, 1, 1], sensor: true }), "coin"]));
                return;
            }
            const tall = s.rng.chance(0.3);
            scroller(s.add([mesh("box", { size: [1.7, tall ? 2.6 : 1.1, 1.7], color: tall ? "#dc2626" : "#f97316" }), pos(x, tall ? 1.3 : 0.55, -60), collider({ sensor: true, scale: 0.85 }), "block"]));
        });
    };
    spawnRow();
    let nextRow = 1.2;

    const crash = () => {
        if (dead) return;
        dead = true;
        s.burst({ at: ship, color: ["#f97316", "#facc15", "#f8fafc"], count: 60, speed: [2, 9], size: [0.15, 0.4], gravity: 0.2, life: [0.4, 1.1] });
        s.shake(0.5, 0.5);
        s.flash("#ffffff", 0.2);
        game.sfx("explode");
        game.vibrate([40, 30, 60]);
        ship.hidden = true;
        s.wait(1.1, () => game.go("over", { score }, { fade: 0.4 }));
    };
    ship.onCollide("block", crash);
    ship.onCollide("coin", (c) => {
        c.destroy();
        score += 25;
        s.burst({ at: c, color: "#facc15", count: 10, speed: [2, 6], size: [0.1, 0.2], life: 0.35 });
        game.sfx("coin");
        game.vibrate(6);
    });

    s.onUpdate((dt) => {
        for (const c of s.find("coin")) c.rot.z += dt * 4;
        if (dead) return;
        const { input } = s, swipe = input.swipe, pointer = input.pointer;
        let dir = 0;
        if (input.pressed("left") || swipe === "left") dir = -1;
        if (input.pressed("right") || swipe === "right") dir = 1;
        if (pointer.tapped) dir = pointer.x < s.view.width / 2 ? -1 : 1;
        ship.lane = clamp(ship.lane + dir, 0, 2);
        if (dir) game.sfx("click");
        if ((input.pressed("up") || input.pressed("jump") || swipe === "up") && ship.grounded) { ship.vel.y = 15; game.sfx("jump"); }

        const goal = LANES[ship.lane];
        ship.pos.x = lerp(ship.pos.x, goal, damp(16, dt));
        ship.rot.z = (ship.pos.x - goal) * 0.35;
        ship.rot.x = clamp(ship.vel.y * 0.03, -0.4, 0.4);

        speed = Math.min(42, speed + dt * 0.45);
        score += speed * dt;
        scoreLabel.text = Math.floor(score);
        game.data.score = Math.floor(score);
        nextRow -= dt;
        if (nextRow <= 0) { spawnRow(); nextRow = clamp(22 / speed, 0.55, 1.2); }
    });
});

game.scene("over", (s, { score }) => {
    const final = Math.floor(score), best = Math.max(final, game.load("best", 0));
    game.save("best", best);
    s.add([text("CRASHED", { size: 42, bold: true, color: "#fef3c7" }), pin("center", [0, -90])]);
    s.add([text(`Score ${final}`, { size: 26, color: "#fde68a" }), pin("center", [0, -36])]);
    s.add([text(`Best ${best}`, { size: 18, color: "#fde68a" }), pin("center", [0, 0])]);
    s.add([button("Run again", { action: "confirm", color: "#ea580c", onTap: () => game.go("run", {}, { fade: 0.3 }) }), pin("center", [0, 70])]);
});

game.start("title");
