// Touch test in portrait and landscape: real pointer events through the on-screen stick and buttons.
import "../game.js";
const game = globalThis.__pogo, I = game.input;
let fail = 0;
const check = (name, ok, extra = "") => { console.log(ok ? "ok  " : "FAIL", name, extra); if (!ok) fail++; };
for (const screen of ["phone", "phone-landscape", "phone-small", "tablet"]) {
    game.resize(screen);
    I.touchMode = true;
    game.data.sv = undefined;
    game.go("play", { room: "g05", abil: 7 + 2 }); game.step(10);
    const g = game.dbg, H = g.H, v = game.view;
    const btn = (a) => game.touch.layout().find((b) => b.action === a);
    console.log("--", screen, `view ${v.width | 0}x${v.height | 0}`, game.touch.layout().map((b) => b.label).join(","));
    // Stick right, from wherever the thumb lands in the left half.
    const sx = v.width * 0.2, sy = v.height * 0.8, x0 = H.x;
    I.pointerEvent("down", 1, sx, sy); I.pointerEvent("move", 1, sx + 40, sy); game.step(30);
    check("stick moves right", H.x > x0 + 40, `${(H.x - x0) | 0}px`);
    // Second thumb on JUMP while the stick stays held.
    const j = btn("jump"), y0 = H.y;
    I.pointerEvent("down", 2, j.x, j.y); game.step(14);
    check("jump while running", H.y < y0 - 20, `${(y0 - H.y) | 0}px up`);
    I.pointerEvent("up", 2, j.x, j.y); game.step(50);
    // Variable jump: a quick tap is lower than a held press.
    const low = () => { const y = H.y; let top = y; I.pointerEvent("down", 2, j.x, j.y); game.step(3); I.pointerEvent("up", 2, j.x, j.y); for (let i = 0; i < 40; i++) { game.step(1); top = Math.min(top, H.y); } return y - top; };
    const hi = () => { const y = H.y; let top = y; I.pointerEvent("down", 2, j.x, j.y); for (let i = 0; i < 40; i++) { game.step(1); top = Math.min(top, H.y); } I.pointerEvent("up", 2, j.x, j.y); return y - top; };
    const a = low(); game.step(30); const b = hi(); game.step(30);
    check("variable jump", b > a + 15, `tap ${a | 0} hold ${b | 0}`);
    // Slide a thumb from JUMP to DRILL: the new button must fire.
    const d = btn("fire"), haps = game.state().haptics?.length ?? 0;
    I.pointerEvent("down", 3, j.x, j.y); game.step(2); I.pointerEvent("move", 3, d.x, d.y); game.step(3);
    check("slide to drill", I.down("fire") && !I.down("jump"));
    I.pointerEvent("up", 3, d.x, d.y); I.pointerEvent("up", 1, sx + 40, sy); game.step(5);
    check("released", !I.down("fire") && !I.down("right"));
    // Pause and map through taps.
    const pb = game.current.entities.find((e) => e.name === "pauseBtn"), mb = game.current.entities.find((e) => e.name === "mapBtn");
    I.tap(mb.pos.x, mb.pos.y); game.step(2); check("map opens", game.data.mode === "map", game.data.mode);
    g.setMode("play"); for (const e of [...game.current.entities]) if (e.layer === 100) e.destroy(); game.touch.enabled = true; game.step(2);
    I.tap(pb.pos.x, pb.pos.y); game.step(2); check("pause opens", game.data.mode === "pause", game.data.mode);
    check("audit clean", !game.audit().some((q) => q.level === "error"), JSON.stringify(game.audit().filter((q) => q.level === "error")).slice(0, 200));
}
console.log(fail ? `FAIL ${fail}` : "PASS");
process.exit(fail ? 1 : 0);
