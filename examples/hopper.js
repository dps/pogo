// Hopper: a 2D platformer. Shows text-defined sprites, tilemaps, the stick + button touch layout and a pinned HUD.
import { body, button, circle, collider, createGame, pin, pos, rect, solid, sprite, text } from "../dist/pogo.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#7dd3fc", "#e0f2fe"],
    letterbox: "#0c4a6e",
    pixelArt: true,
    touch: { stick: true, buttons: [{ action: "jump", label: "JUMP" }] },
});

game.assets.pixels("hero", [`
    ..rrrr..
    .rrrrrr.
    .ttkttk.
    .tttttt.
    ..bbbb..
    .bbbbbb.
    ..h..h..
    .hh..hh.
`, `
    ..rrrr..
    .rrrrrr.
    .ttkttk.
    .tttttt.
    ..bbbb..
    .bbbbbb.
    ...hh...
    ...hh...
`]);
game.assets.pixels("slime", [`
    ........
    ..gggg..
    .gggggg.
    .gkggkg.
    gggggggg
    gggggggg
`, `
    ...gg...
    ..gggg..
    .gkggkg.
    .gggggg.
    .gggggg.
    gggggggg
`]);
game.assets.pixels("grass", `
    gggggggg
    gegggegg
    uhuuhuuh
    uuhuuuhu
    hhuuhuuu
    uuuhuuhu
    uhuuuhuu
    uuhuhuuu
`);
game.assets.pixels("dirt", `
    uhuuhuuh
    uuhuuuhu
    hhuuhuuu
    uuuhuuhu
    uhuuuhuu
    uuhuhuuu
    uhuuuhuu
    huuhuuhu
`);
game.assets.pixels("spike", `
    ...ss...
    ...ss...
    ..swws..
    ..swws..
    .ssssss.
    .ssssss.
    ssssssss
    ssssssss
`);
game.assets.pixels("flag", `
    kyyyyyy.
    kyyyyyy.
    kyyyyyy.
    k.......
    k.......
    k.......
    k.......
    k.......
`);

const LEVEL = `
    .......................................................
    .......................................................
    .......................................................
    ...............................o.o.o...................
    .............o.o..............=======..................
    ............=====.........o...........o.o..............
    ........o.................=.........=======............
    .......===..........=....===....................F......
    ..@..........o.....==........s................=====....
    =====...==========..==========...======.====.........=.
    #####...##########..##########^^^######^####^^^^^^^^^#.
    #####...##########..######################...........#.
`;

game.scene("title", (s) => {
    const best = game.load("best", 0);
    s.add([text("HOPPER", { size: 52, bold: true, color: "#0c4a6e" }), pin("center", [0, -90])]);
    s.add([text(best ? `Best: ${best} coins` : "Grab coins. Reach the flag.", { size: 18, color: "#075985" }), pin("center", [0, -36])]);
    s.add([button("Play", { action: "confirm", onTap: () => { game.sfx("click"); game.go("play", {}, { fade: 0.3 }); } }), pin("center", [0, 36])]);
});

game.scene("play", (s) => {
    const TILE = 32;
    const tile = (name) => [sprite(name, { width: TILE, height: TILE }), collider(), solid(), "ground"];

    const map = s.tilemap(LEVEL, {
        size: TILE,
        legend: {
            "=": tile("grass"),
            "#": tile("dirt"),
            "^": [sprite("spike", { width: TILE, height: TILE }), collider({ sensor: true, scale: 0.6 }), "hazard"],
            "F": [sprite("flag", { width: TILE, height: TILE }), collider({ sensor: true }), "goal"],
            "o": [circle(8, { color: "#facc15" }), collider({ sensor: true }), "coin"],
            "s": [sprite("slime", { width: 26, height: 20 }), collider(), body(), "enemy", { dir: -1 }],
            "@": [sprite("hero", { width: 26, height: 26 }), collider({ scale: 0.85 }), body(), "hero", { coyote: 0, buffer: 0, coins: 0 }],
        },
    });
    const hero = s.first("hero"), coinsTotal = s.find("coin").length;
    // On tall screens, leave room under the level so the ground isn't beneath the player's thumbs.
    const floor = Math.max(0, s.view.height - map.height) * 0.4;
    s.add([rect(map.width + 400, 800, { color: "#3f2a1d" }), pos(map.width / 2, map.height + 400 - TILE), { layer: -1, name: "bedrock" }]);
    s.cam.bounds = { x: 0, y: -2000, width: map.width, height: map.height + 2000 + floor };
    s.cam.follow(hero, { speed: 7, offset: [0, -30] });

    const coinsLabel = s.add([text(`0 / ${coinsTotal}`, { size: 20, bold: true, color: "#0c4a6e" }), pin("top-left", [14, 12]), { name: "coins" }]);
    s.add([button("II", { width: 56, height: 52, textSize: 16, color: "#0369a1", action: "pause", onTap: () => togglePause() }), pin("top-right", [12, 8]), { name: "pause" }]);
    let menu = null;
    const togglePause = () => {
        s.paused = !s.paused;
        if (menu) { menu.destroy(); menu = null; return; }
        menu = s.add([text("Paused", { size: 40, bold: true, color: "#0c4a6e" }), pin("center"), { name: "pausedLabel" }]);
    };

    const SPEED = 170, JUMP = 520;
    s.onUpdate((dt) => {
        const input = s.input;
        hero.vel.x += (input.move.x * SPEED - hero.vel.x) * Math.min(1, dt * 14);
        if (Math.abs(input.move.x) > 0.1) hero.flipX = input.move.x < 0;

        // Coyote time and jump buffering make touch jumps feel fair.
        hero.coyote = hero.grounded ? 0.1 : hero.coyote - dt;
        hero.buffer = input.pressed("jump") ? 0.12 : hero.buffer - dt;
        if (hero.buffer > 0 && hero.coyote > 0) {
            hero.vel.y = -JUMP;
            hero.buffer = hero.coyote = 0;
            game.sfx("jump");
            game.vibrate(8);
        }
        if (input.released("jump") && hero.vel.y < -200) hero.vel.y *= 0.55;

        if (Math.abs(hero.vel.x) > 20 && hero.grounded) hero.play([0, 1], { fps: 10 });
        if (hero.pos.y > map.height + 40) lose();

        for (const m of s.find("enemy")) {
            m.vel.x = 50 * m.dir;
            m.flipX = m.dir > 0;
            const ahead = m.pos.add([m.dir * 16, 14]);
            const wall = s.raycast(m.pos, [m.dir, 0], { max: 16, tag: "ground" });
            if (wall || !s.overlap(ahead, { size: [4, 4], tag: "ground" }).length) m.dir *= -1;
        }
    });

    function lose() {
        if (!hero.alive) return;
        s.burst({ at: hero, color: ["#ef4444", "#3b82f6"], count: 24, gravity: 0.5 });
        s.shake(8);
        game.sfx("lose");
        game.vibrate([30, 40, 30]);
        hero.destroy();
        s.wait(0.8, () => game.go("end", { won: false, coins: hero.coins }, { fade: 0.3 }));
    }

    hero.onCollide("hazard", lose);
    hero.onCollide("coin", (c) => {
        c.destroy();
        hero.coins++;
        coinsLabel.text = `${hero.coins} / ${coinsTotal}`;
        game.data.coins = hero.coins;
        s.burst({ at: c, color: "#facc15", count: 8, speed: [40, 120], life: 0.3 });
        game.sfx("coin");
    });
    hero.onCollide("enemy", (m, hit) => {
        if (hit.normal.y < -0.5) { // landed on it
            m.destroy();
            hero.vel.y = -320;
            s.burst({ at: m, color: "#22c55e", count: 12 });
            game.sfx("hit");
        } else lose();
    });
    hero.onCollide("goal", () => {
        game.sfx("win");
        game.go("end", { won: true, coins: hero.coins }, { fade: 0.4 });
    });
});

game.scene("end", (s, { won, coins }) => {
    if (coins > game.load("best", 0)) game.save("best", coins);
    s.add([text(won ? "You made it!" : "Ouch!", { size: 40, bold: true, color: "#0c4a6e" }), pin("center", [0, -70])]);
    s.add([text(`${coins} coins`, { size: 22, color: "#075985" }), pin("center", [0, -20])]);
    s.add([button("Again", { action: "confirm", onTap: () => game.go("play", {}, { fade: 0.3 }) }), pin("center", [0, 50])]);
});

game.start("title");
