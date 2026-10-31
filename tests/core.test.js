// Headless tests against the built bundle, the same artefact games use.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
    body, button, circle, collider, computeView, createGame, DEVICES, health, lifespan, mesh, pin, pos, PogoError, rect, Rng, solid, sprite, text, tap, vec,
} from "../dist/pogo.js";

const make = (fn, opts = {}) => {
    const g = createGame({ headless: true, ...opts });
    g.scene("t", (s) => fn(s, g));
    g.start("t");
    return g;
};

test("view: expand reveals more world and has no bars", () => {
    const v = computeView({ width: 360, height: 640 }, DEVICES.desktop);
    assert.equal(v.height, 640);
    assert.ok(v.width > 1000);
    assert.equal(v.x, 0);
    assert.equal(v.y, 0);
});

test("view: contain letterboxes and safe area is absorbed by the bars", () => {
    const v = computeView({ width: 360, height: 640, fit: "contain" }, DEVICES.phone);
    assert.equal(v.width, 360);
    assert.ok(v.y > 0);
    assert.ok(v.safe.top < 47 / v.scale);
});

test("view: landscape design size applies on rotation", () => {
    const v = computeView({ width: 360, height: 640, landscape: { width: 640, height: 360 } }, DEVICES["phone-landscape"]);
    assert.equal(v.height, 360);
    assert.equal(v.orientation, "landscape");
});

test("view: maxAspect stops ultra-wide", () => {
    const v = computeView({ width: 360, height: 640, maxAspect: 1 }, DEVICES.desktop);
    assert.equal(Math.round(v.width), 640);
    assert.ok(v.x > 0);
});

test("view: integer fit gives whole device pixels", () => {
    const v = computeView({ width: 160, height: 144, fit: "integer" }, DEVICES.phone);
    assert.equal(v.scale * 3 % 1, 0);
});

test("simulation is deterministic for the same seed and inputs", () => {
    const run = () => {
        const g = make((s) => {
            s.add([rect(10, 10), pos(0, 0), { name: "a" }]);
            s.every(0.1, () => { s.first("a").pos.x += s.rng.range(0, 10); });
        }, { seed: 42 });
        g.step(120);
        return g.current.first("a").pos.x;
    };
    assert.equal(run(), run());
});

test("fixed step: dt never varies and timers fire exactly", () => {
    let fired = 0;
    const g = make((s) => { s.wait(0.5, () => fired++); });
    g.step(29);
    assert.equal(fired, 0);
    g.step(2);
    assert.equal(fired, 1);
});

test("2D: a body lands on a solid and reports grounded", () => {
    const g = make((s) => {
        s.add([rect(100, 20), pos(50, 100), collider(), solid()]);
        s.add([rect(10, 10), pos(50, 0), collider(), body(), "p"]);
    });
    g.step(120);
    const p = g.current.first("p");
    assert.equal(p.grounded, true);
    assert.equal(p.pos.y, 85);
});

test("2D: running over a tile seam does not snag", () => {
    const g = make((s) => {
        for (let i = 0; i < 40; i++) s.add([rect(16, 16), pos(i * 16 + 8, 100), collider(), solid()]);
        s.add([rect(10, 14), pos(20, 80), collider(), body(), "p"]);
        s.onUpdate(() => { s.first("p").vel.x = 200; });
    });
    g.step(150);
    assert.ok(Math.abs(g.current.first("p").pos.x - 500) < 40, `reached ${g.current.first("p").pos.x}`);
});

test("2D: fast bodies do not tunnel through thin walls", () => {
    const g = make((s) => {
        s.add([rect(4, 200), pos(200, 50), collider(), solid()]);
        const p = s.add([rect(10, 10), pos(0, 50), collider(), body({ gravity: 0 }), "p"]);
        p.vel.x = 3000;
    });
    g.step(60);
    assert.ok(g.current.first("p").pos.x < 200);
});

test("2D: one-way platforms pass from below and hold from above", () => {
    const g = make((s) => {
        s.add([rect(100, 8), pos(50, 100), collider(), solid({ oneWay: true })]);
        const p = s.add([rect(10, 10), pos(50, 140), collider(), body(), "p"]);
        p.vel.y = -700;
    });
    g.step(8);
    assert.ok(g.current.first("p").pos.y < 96, "passed through upward");
    g.step(150);
    assert.equal(g.current.first("p").grounded, true);
    assert.ok(g.current.first("p").pos.y < 96);
});

test("collide fires once on enter and collideEnd on exit", () => {
    let enter = 0, leave = 0;
    const g = make((s) => {
        s.add([rect(20, 20), pos(100, 0), collider({ sensor: true }), "zone"]);
        const p = s.add([rect(10, 10), pos(0, 0), collider(), body({ gravity: 0 })]);
        p.vel.x = 200;
        p.onCollide("zone", () => enter++);
        p.onCollideEnd("zone", () => leave++);
    });
    g.step(120);
    assert.equal(enter, 1);
    assert.equal(leave, 1);
});

test("moving platform carries its rider", () => {
    const g = make((s) => {
        const plat = s.add([rect(80, 10), pos(50, 100), collider(), solid(), "plat"]);
        s.add([rect(10, 10), pos(50, 90), collider(), body(), "p"]);
        s.onUpdate((dt) => { plat.pos.x += 60 * dt; });
    });
    g.step(60);
    assert.ok(Math.abs(g.current.first("p").pos.x - 110) < 3);
});

test("3D: a sphere rests on a box and rays hit it", () => {
    const g = make((s) => {
        s.add([mesh("box", { size: [10, 1, 10] }), pos(0, 0, 0), collider(), solid()]);
        s.add([mesh("sphere"), pos(0, 5, 0), collider(), body(), "ball"]);
    });
    g.step(180);
    const b = g.current.first("ball");
    assert.equal(b.dim, 3);
    assert.equal(b.grounded, true);
    assert.ok(Math.abs(b.pos.y - 1) < 0.05, `y=${b.pos.y}`);
    const hit = g.current.raycast([0, 10, 0], [0, -1, 0], { tag: "ball" });
    assert.ok(Math.abs(hit.dist - 8.5) < 0.1);
});

test("3D: camera projection and picking agree", () => {
    const g = make((s) => {
        s.cam3.set([0, 0, 10], [0, 0, 0]);
        s.add([mesh("box", { size: 2 }), pos(0, 0, 0), collider(), "target"]);
    });
    const v = g.view, p = g.current.cam3.project([0, 0, 0]);
    assert.ok(Math.abs(p.x - v.width / 2) < 0.01 && Math.abs(p.y - v.height / 2) < 0.01);
    assert.equal(g.current.pick(v.width / 2, v.height / 2).entity.is("target"), true);
    assert.equal(g.current.pick(4, 4), null);
    assert.equal(g.current.cam3.project([0, 0, 20]).visible, false);
});

test("input: a press between steps is never lost, and edges last one step", () => {
    const seen = [];
    const g = make((s) => { s.onUpdate(() => seen.push(s.input.pressed("jump"))); });
    g.input.codeDown("Space");
    g.input.codeUp("Space");
    g.step(3);
    assert.deepEqual(seen, [true, false, false]);
});

test("input: unknown actions explain themselves", () => {
    const g = make(() => {});
    assert.throws(() => g.input.down("jmup"), (e) => e instanceof PogoError && e.code === "UNKNOWN_ACTION" && e.message.includes('"jump"'));
});

test("input: swipes and taps are classified", () => {
    let swipe = null, tapped = 0;
    const g = make((s) => { s.onUpdate(() => { swipe = s.input.swipe ?? swipe; if (s.input.pointer.tapped) tapped++; }); });
    g.input.drag(100, 300, 240, 300);
    g.step(2);
    assert.equal(swipe, "right");
    g.input.tap(10, 10);
    g.step(2);
    assert.equal(tapped, 1);
});

test("touch: the stick drives input.move and buttons map to actions, without leaking to the pointer", () => {
    let jump = 0, pointerPresses = 0;
    const g = make((s) => { s.onUpdate(() => { if (s.input.pressed("jump")) jump++; if (s.input.pointer.pressed) pointerPresses++; }); }, { touch: { stick: true, buttons: ["jump"] } });
    const b = g.touch.layout()[0];
    g.input.tap(b.x, b.y, 1);
    g.step(2);
    assert.equal(jump, 1);
    assert.equal(pointerPresses, 0);
    const v = g.view;
    g.input.pointerEvent("down", 2, 60, v.height - 80);
    g.input.pointerEvent("move", 2, 120, v.height - 80);
    g.step(1);
    assert.ok(g.input.move.x > 0.5);
    assert.equal(g.input.down("right"), true);
    g.input.pointerEvent("up", 2, 120, v.height - 80);
    g.step(1);
    assert.equal(g.input.move.x, 0);
});

test("touch: a long diagonal drag keeps its direction and length 1", () => {
    const g = make(() => {}, { touch: { stick: true } });
    const v = g.view;
    g.input.pointerEvent("down", 2, 60, v.height - 200);
    g.input.pointerEvent("move", 2, 160, v.height - 150);
    g.step(1);
    const m = g.input.move;
    assert.ok(Math.abs(m.len() - 1) < 1e-6, `length ${m.len()}`);
    assert.ok(Math.abs(m.y / m.x - 0.5) < 1e-6, `direction ${m.x}, ${m.y}`);
});

test("buttons: tap target grows to 44 CSS px and consumes the touch", () => {
    let taps = 0, pointer = 0;
    const g = make((s) => {
        s.add([rect(10, 10), pos(100, 100), tap(() => taps++), { layer: 1 }]);
        s.onUpdate(() => { if (s.input.pointer.tapped) pointer++; });
    });
    g.input.tap(100 + 15, 100); // outside the 10px box, inside the grown area
    g.step(2);
    assert.equal(taps, 1);
    assert.equal(pointer, 0);
});

test("buttons: dragging off cancels the tap", () => {
    let taps = 0;
    const g = make((s) => { s.add([button("Go", { onTap: () => taps++ }), pos(180, 300)]); });
    g.input.pointerEvent("down", 1, 180, 300);
    g.step(1);
    g.input.pointerEvent("up", 1, 10, 10);
    g.step(1);
    assert.equal(taps, 0);
});

test("pin: stays inside the safe area and follows a resize", () => {
    const g = make((s) => { s.add([rect(40, 20), pin("top-right", [8, 8]), { name: "hud" }]); });
    g.step(1);
    const hud = g.current.first("hud");
    assert.equal(hud.pos.y, g.view.safe.top + 8 + 10);
    g.resize("desktop");
    g.step(1);
    assert.equal(hud.pos.x, g.view.width - 8 - 20);
});

test("timers, tweens and entities die with their owner and scene", () => {
    let hits = 0;
    const g = make((s) => {
        const e = s.add([rect(1, 1), lifespan(0.1)]);
        e.every(0.05, () => hits++);
        s.tween(e, { opacity: 0, pos: [10, 10] }, 5);
    });
    g.step(60);
    assert.ok(hits <= 2);
    assert.equal(g.current.entities.length, 0);
});

test("tween: vec, scale and yoyo", () => {
    const g = make((s) => {
        const e = s.add([rect(1, 1), "a"]);
        s.tween(e, { pos: [100, 0], scale: 2 }, 1, { ease: "linear" });
    });
    g.step(30);
    const a = g.current.first("a");
    assert.ok(Math.abs(a.pos.x - 50) < 2);
    assert.ok(Math.abs(a.scale.x - 1.5) < 0.03);
});

test("pause: stops the world but UI still works", () => {
    let world = 0, taps = 0;
    const g = make((s) => {
        s.add([rect(1, 1), { update() { world++; } }]);
        s.add([button("Resume", { onTap: () => { taps++; s.paused = false; } }), pin("center")]);
        s.paused = true;
    });
    g.step(5);
    assert.equal(world, 0);
    const b = g.current.entities[1];
    g.input.tap(b.pos.x, b.pos.y);
    g.step(2);
    assert.equal(taps, 1);
    assert.ok(world > 0);
});

test("scene changes are deferred and reset state", () => {
    const g = createGame({ headless: true });
    const log = [];
    g.scene("a", (s) => { s.onUpdate(() => { log.push("a"); g.go("b"); }); s.add([rect(1, 1)]); });
    g.scene("b", (s, args) => { log.push(`b:${args.n ?? 0}`); });
    g.start("a");
    g.step(1);
    assert.deepEqual(log, ["a", "b:0"]);
    assert.equal(g.current.entities.length, 0);
});

test("fade transition swaps the scene midway", () => {
    const g = createGame({ headless: true });
    g.scene("a", () => {});
    g.scene("b", () => {});
    g.start("a");
    g.go("b", {}, { fade: 0.2 });
    g.step(3);
    assert.equal(g.currentName, "a");
    g.step(10);
    assert.equal(g.currentName, "b");
});

test("errors name the problem and the fix", () => {
    const codes = (fn) => { try { fn(); } catch (e) { return e.code + " " + e.message; } return ""; };
    const g = createGame({ headless: true });
    g.scene("a", () => {});
    g.start("a");
    const s = g.current;
    assert.match(codes(() => g.go("menu")), /UNKNOWN_SCENE/);
    assert.match(codes(() => s.add([sprite("nope")])), /UNKNOWN_SPRITE/);
    assert.match(codes(() => s.add([mesh("bxo")])), /Did you mean "box"/);
    assert.match(codes(() => s.add([[10, 20]])), /BAD_COMPONENT/);
    assert.match(codes(() => s.add(rect(1, 1))), /add\(\) takes an array/);
    assert.match(codes(() => s.add([body()])), /requires "collider"/);
    assert.match(codes(() => s.add([rect(1, 1), rect(1, 1)])), /DUPLICATE_COMPONENT/);
    assert.match(codes(() => s.add([rect(1, 1), { on: 1 }])), /RESERVED_FIELD/);
    assert.match(codes(() => s.add([collider()])), /ZERO_COLLIDER/);
    assert.match(codes(() => g.sfx("kaboom")), /UNKNOWN_SOUND/);
    assert.match(codes(() => g.assets.pixels("x", ["ab", "a"])), /BAD_PALETTE|BAD_PIXELS/);
    assert.match(codes(() => s.add([rect(1, 1, { color: "#12" })])), /BAD_COLOR/);
});

test("NaN positions are caught at the source", () => {
    const g = make((s) => { s.add([rect(1, 1), { name: "broken", update() { this.pos.x = NaN; } }]); });
    assert.throws(() => g.step(1), /NAN_POSITION[\s\S]*broken/);
});

test("pixels: frames, palette and sizes", () => {
    const g = createGame({ headless: true });
    g.assets.pixels("a", [`
        rr
        rr
    `, `
        gg
        gg
    `]);
    const a = g.assets.sprite("a");
    assert.deepEqual([a.cols, a.frameW, a.frameH, a.width], [2, 2, 2, 4]);
    assert.equal(a.data[0], 239);
    g.assets.pixels("one", ["rk", "kr"]);
    assert.equal(g.assets.sprite("one").cols, 1);
});

test("voxels: hidden faces are culled and sizes follow the unit", () => {
    const g = createGame({ headless: true });
    g.assets.voxels("cube", [["rr", "rr"], ["rr", "rr"]], undefined, { unit: 0.5 });
    const m = g.assets.geometry("cube");
    assert.deepEqual([m.natural.x, m.natural.y, m.natural.z], [1, 1, 1]);
    assert.equal(m.indices.length / 6, 24);
});

test("primitives wind counter-clockwise when seen from outside", () => {
    const g = createGame({ headless: true });
    for (const name of ["box", "sphere", "cylinder", "cone", "capsule", "torus", "plane", "quad"]) {
        const m = g.assets.geometry(name);
        let bad = 0;
        for (let i = 0; i < m.indices.length; i += 3) {
            const p = [0, 1, 2].map((k) => { const o = m.indices[i + k] * 11; return vec(m.vertices[o], m.vertices[o + 1], m.vertices[o + 2]); });
            const o = m.indices[i] * 11, n = vec(m.vertices[o + 3], m.vertices[o + 4], m.vertices[o + 5]);
            const face = p[1].sub(p[0]).cross(p[2].sub(p[0]));
            if (face.lenSq() > 1e-12 && face.dot(n) < 0) bad++;
        }
        assert.equal(bad, 0, `${name} has ${bad} inverted triangles`);
    }
});

test("text wraps with maxWidth and keeps its size in sync", () => {
    const g = make((s) => { s.add([text("one two three four five six", { size: 20, maxWidth: 100 }), { name: "t" }]); });
    const t = g.current.first("t");
    assert.ok(t.size.x <= 100);
    assert.ok(t.size.y > 40);
    t.text = "x";
    assert.ok(t.size.x < 20);
});

test("audit: flags the mobile problems it claims to", () => {
    const g = make((s) => {
        s.add([text("tiny", { size: 5 }), pin("center", [0, -200]), { name: "tiny" }]);
        s.add([text("way too wide for a phone screen and it keeps on going forever and ever", { size: 24 }), pos(180, 300), { ui: true, name: "wide" }]);
        s.add([text("under notch", { size: 16 }), pos(180, 10), { ui: true, name: "notch" }]);
        s.add([button("x", { width: 20, height: 20 }), pos(100, 500), { ui: true, name: "small" }]);
        s.onUpdate(() => s.input.down("fire"));
    });
    g.step(1);
    const codes = new Set(g.audit().map((i) => i.code));
    for (const c of ["TEXT_TOO_SMALL", "OFFSCREEN_UI", "SAFE_AREA", "TAP_TARGET_SMALL", "UNREACHABLE_ACTION"]) assert.ok(codes.has(c), `missing ${c}: ${[...codes]}`);
});

test("audit: a well-built screen is clean", () => {
    const g = make((s) => {
        s.add([text("Score", { size: 18 }), pin("top-left", [12, 12])]);
        s.add([button("Pause", {}), pin("top-right", [12, 8])]);
    }, { touch: { buttons: ["jump"] } });
    g.step(1);
    assert.deepEqual(g.audit(), []);
});

test("state and ascii describe the screen", () => {
    const g = make((s) => {
        s.add([rect(100, 100), pos(180, 300), "box"]);
        s.add([circle(10), pos(20, 20), collider(), body({ gravity: 0 }), health(3), { name: "hero" }]);
    });
    g.data.score = 9;
    g.step(1);
    const st = g.state();
    assert.equal(st.data.score, 9);
    assert.equal(st.entities.find((e) => e.label === "hero").hp, 3);
    assert.doesNotThrow(() => JSON.stringify(st));
    const art = g.ascii();
    assert.match(art, /legend: .*=box/);
    assert.match(art, /b{4,}/);
});

test("physics cost stays bounded when sizes differ wildly", () => {
    const g = make((s) => {
        s.add([rect(10, 10), collider(), body({ gravity: 0 })]); // no solids at all
        for (let i = 0; i < 300; i++) s.add([rect(1, 1), pos(i * 2, 400), collider(), solid()]);
        s.add([rect(2000, 2000), pos(0, -2000), collider({ sensor: true })]);
    });
    const t = performance.now();
    g.step(60);
    assert.ok(performance.now() - t < 1500, `took ${performance.now() - t} ms`);
});

test("first() and find() match names as well as tags", () => {
    const g = make((s) => { s.add([rect(1, 1), { name: "hero" }]); });
    assert.equal(g.current.first("hero").name, "hero");
    assert.equal(g.current.find("hero").length, 1);
});

test("paint: draws without a DOM, with frames, outline and symmetry", () => {
    const g = createGame({ headless: true });
    g.assets.paint("orb", 16, 16, (p, f) => { p.circle(5, 8, 3 + f, "#ff0000").mirror().outline("#000000").shade(); }, { frames: 2, smooth: true });
    const a = g.assets.sprite("orb");
    assert.deepEqual([a.cols, a.frameW, a.width, a.pixelated], [2, 16, 32, false]);
    const px = (x, y) => [...a.data.slice((y * a.width + x) * 4, (y * a.width + x) * 4 + 4)];
    assert.ok(px(5, 8)[0] > 200, "centre is red");
    assert.ok(px(10, 8)[0] > 200, "mirrored to the right");
    assert.ok(px(1, 8)[3] > 200, "outline ring is nearly opaque, with anti-aliased coverage");
    assert.ok(px(21, 8)[3] > 0, "second frame is painted at its own offset");
    assert.equal(px(0, 0)[3], 0);
});

test("mouseLook is safe headless and look deltas reach the game", () => {
    const g = make((s, game) => { game.mouseLook = true; });
    assert.equal(g.mouseLook, true);
    assert.equal(g.pointerLocked, false);
    g.input.addLook(12, -4);
    g.step(1);
    assert.deepEqual([g.input.look.x, g.input.look.y], [12, -4]);
    g.mouseLook = false;
    g.step(1);
    assert.equal(g.input.look.x, 0);
});

test("a body shoved into a long wall comes out the near side", () => {
    const g = make((s) => {
        s.add([rect(2000, 40), pos(1000, 100), collider(), solid()]);
        const p = s.add([rect(10, 10), pos(1000, 76), collider(), body({ gravity: 0 }), "p"]);
        p.vel.x = 100;
        s.wait(0.1, () => { p.pos.y = 90; }); // something shoves it into the wall
    });
    g.step(30);
    const p = g.current.first("p");
    assert.ok(Math.abs(p.pos.y - 75) < 0.5, `y=${p.pos.y}`);
    assert.ok(p.pos.x > 1000 && p.pos.x < 1100, `x=${p.pos.x}`);
});

test("cameras moved by game code stay interpolated", () => {
    const g = make((s) => { s.cam3.set([0, 0, 0], [0, 0, -1]); s.onUpdate(() => { s.cam3.pos.x += 1; s.cam.pos = [s.time * 60, 0]; }); });
    g.step(3);
    const cam = g.current.cam3;
    cam.update(0.5);
    assert.ok(Math.abs(cam.eye.x - 2.5) < 1e-6, `eye ${cam.eye.x}`);
    const m = g.current.cam.matrix(0.5), full = g.current.cam.matrix(1);
    assert.notEqual(m[4], full[4]);
});

test("opacity reaches 3D draws", () => {
    const g = make((s) => { s.add([mesh("box"), { opacity: 0.25 }]); });
    const seen = [];
    g.renderer.mesh = (it) => seen.push(it.a);
    g.render();
    assert.deepEqual(seen, [0.25]);
});

test("the key that opens a menu does not also press its button", () => {
    let hits = 0;
    const g = make((s) => {
        s.onUpdate(() => { if (s.input.pressed("pause") && !s.first("menu")) s.add([button("Resume", { action: "pause", onTap: () => hits++ }), pin("center"), { name: "menu" }]); });
    });
    g.input.press("pause", 1);
    g.step(3);
    assert.equal(hits, 0);
    g.input.press("pause", 1);
    g.step(1);
    assert.equal(hits, 1);
});

test("touch controls can be replaced and disabled per scene", () => {
    const g = make(() => {}, { touch: { buttons: ["jump"] } });
    assert.equal(g.touch.layout().length, 1);
    g.touch.set({ buttons: ["jump", "fire"] });
    assert.equal(g.touch.layout().length, 2);
    g.touch.enabled = false;
    const b = g.touch.layout()[0];
    g.input.tap(b.x, b.y, 1);
    g.step(1);
    assert.equal(g.input.pointer.tapped, true);
});

test("audit leaves full-screen backdrops and draw-only entities alone", () => {
    const g = make((s, game) => {
        s.add([rect(game.view.width, game.view.height, { color: "#0008" }), pos(game.view.width / 2, game.view.height / 2), { ui: true }]);
        s.add([{ ui: true, draw() {} }]);
    });
    g.step(1);
    assert.deepEqual(g.audit(), []);
});

test("restart can change the seed and clears data", () => {
    const g = make(() => {});
    g.data.x = 1;
    const a = g.rng.next();
    g.restart("t", {}, { seed: 99 });
    assert.equal(g.data.x, undefined);
    assert.notEqual(g.rng.next(), a);
});

test("rng helpers stay in range", () => {
    const r = new Rng(3);
    for (let i = 0; i < 500; i++) {
        const n = r.int(2, 4);
        assert.ok(n >= 2 && n <= 4 && Number.isInteger(n));
        const f = r.range(1, 2);
        assert.ok(f >= 1 && f < 2);
    }
});

test("save and load round-trip", () => {
    const g = createGame({ headless: true });
    g.save("k", { a: 1 });
    assert.deepEqual(g.load("k"), { a: 1 });
    assert.equal(g.load("missing", 5), 5);
});
