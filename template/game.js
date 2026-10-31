import { button, collider, createGame, pin, pos, rect, sprite, text, body, solid } from "./pogo.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#1e293b", "#0f172a"],
    touch: { stick: true, buttons: ["jump"] },
});

game.assets.paint("hero", 48, 48, (p) => {
    p.ellipse(24, 26, 16, 17, "#fb7185", "#be123c");
    p.circle(18, 22, 4, "#ffffff").circle(30, 22, 4, "#ffffff");
    p.circle(19, 23, 2, "#1f2430").circle(31, 23, 2, "#1f2430");
    p.outline().shade();
}, { smooth: true });

game.scene("title", (s) => {
    s.add([text("My Game", { size: 44, bold: true, color: "#f8fafc" }), pin("center", [0, -60])]);
    s.add([button("Play", { action: "confirm", onTap: () => game.go("play", {}, { fade: 0.3 }) }), pin("center", [0, 30])]);
});

game.scene("play", (s) => {
    const { width, height } = s.view;
    s.add([rect(width * 3, 40, { color: "#334155" }), pos(width / 2, height * 0.75), collider(), solid()]);
    const hero = s.add([sprite("hero", { width: 40 }), pos(width / 2, height / 2), collider({ scale: 0.8 }), body(), { name: "hero" }]);
    s.onUpdate(() => {
        hero.vel.x = s.input.move.x * 200;
        if (s.input.pressed("jump") && hero.grounded) { hero.vel.y = -560; game.sfx("jump"); }
    });
});

game.start("title");
