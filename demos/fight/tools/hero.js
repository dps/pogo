// Launcher art. Runs in the page through `pogo shot --eval`, using the game's own puppets and paint.
game.scene("poster", (s) => {
    const { puppetOf, shared, paintStage } = game.kit, FONT = '"Arial Black","Arial Rounded MT Bold",Impact,system-ui,sans-serif';
    paintStage(game.assets, 0);
    const P = {}; for (const id of ["crumbs", "chill", "whistle", "frappe", "ding", "ristretto"]) P[id] = puppetOf(id);
    const pose = (id, o) => Object.assign(P[id].q, o);
    pose("crumbs", { lean: 0.14, bx: 8, sx: 1.08, sy: 0.96, hFx: 92, hFy: -74, hBx: -30, hBy: -96, fFx: 44, fBx: -38, eye: "fierce", mouth: "yell", top: 1, gF: "fist" });
    pose("chill", { lean: -0.14, bx: -8, sx: 0.94, sy: 1.08, hFx: 42, hFy: -120, hBx: -42, hBy: -116, eye: "wince", mouth: "ouch", gF: "open", gB: "open", top: 0, fFx: 30, fBx: -30 });
    pose("whistle", { lean: -0.06, hFx: 44, hFy: -86, hBx: 36, hBy: -60, eye: "fierce", mouth: "grin", top: 0.6, gF: "open" });
    pose("frappe", { lean: 0.1, hFx: 50, hFy: -80, hBx: -46, hBy: -74, eye: "wide", mouth: "yell", top: 0.7, gF: "open", gB: "open" });
    pose("ding", { eye: "narrow", mouth: "smirk" });
    pose("ristretto", { lean: 0.12, eye: "wide", mouth: "grin", top: 1 });
    s.add([{ layer: 0, draw(d) {
        const v = s.view, W = v.width, H = v.height, cx = W / 2, floor = H * 0.9, Z = W / 640;
        d.reset();
        d.sprite("stage_diner", { x: cx, y: H * 0.5, width: W * 1.2, height: W * 1.2 * 660 / 1060 });
        d.rect(W, H, { x: cx, y: H / 2, color: "#241a2c", opacity: 0.5 });
        for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283; d.poly([[cx, H * 0.62], [cx + Math.cos(a) * W, H * 0.62 + Math.sin(a) * W], [cx + Math.cos(a + 0.12) * W, H * 0.62 + Math.sin(a + 0.12) * W]], { color: "#ffc23c", opacity: 0.2 }); }
        d.reset(); P.whistle.draw(d, cx - 262 * Z, floor - 26 * Z, { scale: 0.8 * Z, face: 1, noShake: true });
        d.reset(); P.ristretto.draw(d, cx - 262 * Z + 110 * Z * 0 + 20 * Z, floor - 170 * Z * 0 - 50 * Z, { scale: 0.001 * Z, face: 1, noShake: true });
        d.reset(); P.frappe.draw(d, cx + 268 * Z, floor - 26 * Z, { scale: 0.8 * Z, face: -1, noShake: true });
        d.reset(); P.ding.draw(d, cx + 274 * Z, floor - 170 * Z, { scale: 0.001 * Z, face: -1, noShake: true });
        d.reset(); P.crumbs.draw(d, cx - 138 * Z, floor, { scale: 1.24 * Z, face: 1, noShake: true });
        d.reset(); P.chill.draw(d, cx + 104 * Z, floor, { scale: 1.2 * Z, face: -1, noShake: true });
        d.reset();
        const st = shared.star, sx = cx + 8 * Z, sy = floor - 92 * Z;
        d.additive(() => { d.sprite("shared", { x: sx, y: sy, width: 170 * Z, height: 170 * Z, crop: st.crop, color: "#ff8a3c", opacity: 0.8 }); });
        d.sprite("shared", { x: sx, y: sy, width: 84 * Z, height: 84 * Z, crop: st.crop, color: "#ffffff" });
        d.circle(58 * Z, { x: sx, y: sy, color: "#fff1d6", outline: 5 * Z });
        d.push(); d.translate(cx, H * 0.18); d.rotate(-0.05);
        const size = 64 * Z;
        for (const [str, y, k, c] of [["KITCHEN", -size * 0.52, 0.8, "#fff1d6"], ["KNOCKOUT", size * 0.36, 1.08, "#ffc23c"]]) {
            d.text(str, { x: 6 * Z, y: y + 8 * Z, size: size * k, bold: true, font: FONT, color: "#241a2c" });
            d.text(str, { x: 3 * Z, y: y + 4 * Z, size: size * k, bold: true, font: FONT, color: "#e8472e" });
            d.text(str, { y, size: size * k, bold: true, font: FONT, color: c });
        }
        d.pop();
    } }]);
});
game.go("title"); game.step(1); game.go("poster");
