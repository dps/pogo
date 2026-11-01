// The flying scene. Title, story, free flight and time trials all happen here over the same living town, so the
// first tap on the title is already the first moment of flight.
import { dim, pin, ui, button, text } from "./pogo.js";
import { CHAPTERS, FINALE, LETTERS, PEOPLE, PLANES, STAMPS, TIMES, TRIALS } from "./data.js";
import { Flight } from "./flight.js";
import { Stage } from "./stage.js";
import { Hud } from "./hud.js";
import { homes, landmarks, ground } from "./world.js";
import { hex } from "./paper.js";

/** Where the wreath for each resident hangs: in the open air in front of their home. */
export function ringOf(id) {
    const h = homes[PEOPLE[id].home];
    if (id === "tomas") return [landmarks.light.x - 15, landmarks.light.y + 30, landmarks.light.z - 6];
    if (id === "hester") return [h.x - 16, h.y + 22, h.z + 16];
    if (id === "cobb") return [h.x + 18, h.y + 20, h.z + 16];
    return [h.x, h.y + 8.5, h.front + 8];
}
export function stampPos(q) {
    const { chapel: C, mill: M, light: L } = landmarks;
    if (q.yFrom === "belfry") return [C.x, C.y + 23, C.z + 18];
    if (q.yFrom === "millcap") return [M.x, M.y + 31, M.z];
    if (q.yFrom === "lightcap") return [L.x, L.y + 50, L.z];
    if (q.yFrom === "ground8") return [q.at[0], ground(q.at[0], q.at[2]) + 8, q.at[2]];
    return q.at;
}
const LAUNCH = [46, 36, 16, 1.33];  // off the rooftops, nose towards the bakery and the first letter

export const available = (p) => LETTERS.filter((l) => l.ch === p.ch && !p.done.includes(l.id) && (!l.after || p.done.includes(l.after)));

export function registerFly(game, built) {
    game.scene("fly", (s, args = {}) => {
        const P = game.progress, mode = args.mode ?? "title", cfg = PLANES.find((c) => c.id === P.plane) ?? PLANES[0];
        const time = mode === "free" ? args.time ?? 1 : mode === "trial" ? TRIALS.findIndex((t) => t.id === args.trial) % 3 : mode === "title" ? CHAPTERS[Math.min(3, P.ch)].time : CHAPTERS[Math.min(3, P.ch)].time;
        const st = new Stage(s, game, built); st.setTime(P.finished && mode === "title" ? 0 : time); st.planeMesh = `plane_${cfg.id}`;
        const env = { sun: st.sun, warm: st.tm.warm, comfort: !!game.opts.comfort, noCrash: mode === "free" };
        const f = new Flight(cfg, env);
        const G = (game.sim = { s, st, f, mode, cfg, phase: mode === "title" ? "title" : "fly", sx: 0, sy: 0, t: 0, onStep: null, target: null, trial: null, read: null, skimT: 0, delivered: 0, bot: null, trailOn: 0 });
        const hud = new Hud(s, game, G); G.hud = hud;
        s.add([dim(3), { draw(d) { st.draw(d); } }]);
        game.touch.enabled = false;
        const snd = game.snd;

        // ---- Town state from progress ---------------------------------------------------------------------------
        const refreshTown = () => {
            st.lit = {}; let n = 0;
            for (const l of LETTERS) if (l.light && P.done.includes(l.id)) { st.lit[l.light] = true; st.lit[PEOPLE[l.to].home] = true; n++; }
            const total = LETTERS.filter((l) => l.light).length;
            if (P.finished) { st.lit = {}; st.litFrac = 1; st.lanterns = 999; st.beam = st.time === 3; return; }
            st.litFrac = st.time === 3 ? n / total : st.time === 2 ? 0.35 : 0;
            st.lanterns = st.time === 3 ? Math.floor(n / total * st.lanternPts.length) : 0;
        };
        if (mode !== "free" && mode !== "trial") refreshTown();
        else { st.litFrac = 1; st.lanterns = st.time === 3 ? 999 : 0; st.beam = st.time === 3; }
        const refreshRings = () => {
            if (G.mode === "story") { const a = available(P); st.rings = a.map((l) => { const p = ringOf(l.to); return { kind: "letter", x: p[0], y: p[1], z: p[2], l }; }); st.carry = a.length > 0; }
            st.stamps = G.mode === "trial" ? [] : STAMPS.filter((q) => !P.stamps.includes(q.id)).map((q) => { const p = stampPos(q); return { q, x: p[0], y: p[1], z: p[2], reach: 13, pull: 11 }; });
        };
        refreshRings();

        // ---- Starting a flight -------------------------------------------------------------------------------------
        const launchAt = (x, y, z, yaw) => { f.place(x, y, z, yaw); st.f = f; };
        st.f = f;
        const resume = game.data.resume; game.data.resume = null;
        if (mode === "title") { f.place(26, 42, 96, 0.4); st.showPlane = true; st.mode = "title"; G.titleT = 0; }
        else if (mode === "trial") {
            const T = TRIALS.find((t) => t.id === args.trial), h = T.hoops[0], yaw = Math.atan2(-(h[0] - T.hoops[T.hoops.length - 1][0]), -(h[2] - T.hoops[T.hoops.length - 1][2]));
            launchAt(h[0] + Math.sin(yaw) * 46, h[1] + 4, h[2] + Math.cos(yaw) * 46, yaw);
            G.trial = { T, i: 0, t: 0, started: false, count: 3, done: false }; G.phase = "count";
            st.rings = T.hoops.map((q, i) => ({ kind: "hoop", x: q[0], y: q[1], z: q[2], i, yaw: i < T.hoops.length - 1 ? Math.atan2(T.hoops[i + 1][0] - q[0], T.hoops[i + 1][2] - q[2]) : 0, done: false }));
            st.mode = "chase";
        } else if (resume) { launchAt(resume.x, resume.y, resume.z, resume.yaw); st.mode = "chase"; }
        else { launchAt(...LAUNCH); st.mode = "chase"; }
        // Point the camera straight behind the plane so the first frame is right.
        if (st.mode === "chase") { st.cd = [f.dir[0], 0, f.dir[2]]; st.update(0.016); st.snap(); s.cam3.set([st.goal[0], st.goal[1], st.goal[2]], [st.goal[3], st.goal[4], st.goal[5]]); }
        else { st.update(0.016); st.snap(); s.cam3.set([st.goal[0], st.goal[1], st.goal[2]], [st.goal[3], st.goal[4], st.goal[5]]); }

        // ---- Events -----------------------------------------------------------------------------------------------------
        const startFlight = () => {
            if (G.phase !== "title") return;
            G.mode = P.finished ? "free" : "story"; G.phase = "fly"; hud.closeTitle(); env.noCrash = P.finished;
            f.place(LAUNCH[0], LAUNCH[1], LAUNCH[2], LAUNCH[3]); st.cut("chase"); st.cd = [f.dir[0], 0, f.dir[2]];
            refreshRings(); st.carry = true; snd.fx("launch"); snd.music(TIMES[st.time].mood); snd.windOn();
            if (P.finished) hud.toast("The post is done. The sky is yours.", 3.5, "ribbon"); else { hud.chapterBanner(P.ch); hud.teach(); pendingChapter(); }
        };
        // If the app closed on the last card of a chapter, pick the story up from the reward.
        const pendingChapter = () => { if (!P.finished && !LETTERS.some((l) => l.ch === P.ch && !P.done.includes(l.id))) s.wait(0.2, endChapter); };
        G.startFlight = startFlight;
        G.deliverNow = (ring) => deliver(ring);

        const deliver = (g) => {
            const L = g.l, who = PEOPLE[L.to]; G.phase = "read"; G.read = L;
            P.done.push(L.id); game.persist(); G.delivered++;
            snd.fx("deliver"); s.freeze(0.07); st.confetti(g.x, g.y, g.z, 34, [hex("#d9593f"), hex("#efc15f"), hex("#fbf1dc"), hex("#3f8c8e")], 12);
            s.shake(0.15, 0.2, { haptic: false });
            st.rings = st.rings.filter((r) => r !== g);
            const away = Math.atan2(f.x - g.x, f.z - g.z);
            st.doll = { id: L.to, x: g.x, y: ground(g.x, g.z) + (L.to === "tomas" ? 30 : L.to === "hester" ? 8 : L.to === "cobb" ? 3 : 1.5), z: g.z, yaw: 0, k: 0 };
            if (L.to === "tomas") st.doll.y = g.y - 4;
            s.tween(st.doll, { k: 1 }, 0.55, { ease: "outBack", delay: 0.25 });
            st.cut("orbit", { x: g.x, y: g.y - 3, z: g.z, a: away, r: 20, h: 6, w: 0.09, fov: 50, ly: 1 });
            st.showPlane = false; snd.quiet(); hud.menu.hidden = true;
            if (L.light) { s.wait(0.5, () => { st.lit[L.light] = true; st.lit[PEOPLE[L.to].home] = true; refreshTown(); snd.fx("light"); if (L.light) s.flash("#ffd98a22", 0.4); }); }
            s.wait(0.85, () => hud.showLetter(L, () => afterRead(g)));
            G.relaunch = g;
        };
        const afterRead = (g) => {
            st.doll = null; G.read = null; refreshRings(); hud.menu.hidden = false;
            const left = LETTERS.filter((l) => l.ch === P.ch && !P.done.includes(l.id));
            if (!left.length) return endChapter();
            relaunchFrom(g);
        };
        /** The neighbour throws you back into the sky, towards the nearest open letter. */
        const relaunchFrom = (g) => {
            const a = available(P)[0], p = a ? ringOf(a.to) : [0, 40, 0], yaw = Math.atan2(-(p[0] - g.x), -(p[2] - g.z));
            let x = g.x, z = g.z, y = Math.max(g.y + 9, ground(g.x, g.z) + 16);
            f.place(x, y, z, yaw, cfg.vt * 1.15); f.crumbs = [{ x, y, z, yaw, t: f.t }]; f.gust = 1.4; st.showPlane = true; G.phase = "fly";
            st.cut("chase"); st.cd = [f.dir[0], 0, f.dir[2]]; snd.fx("launch"); snd.windOn();
        };
        const endChapter = () => {
            const ch = P.ch;
            if (ch === 3) return ending();
            P.ch = ch + 1; const reward = PLANES[ch + 1];
            if (!P.planes.includes(reward.id)) P.planes.push(reward.id);
            game.persist(); snd.fx("chapter");
            game.go("fold", { plane: reward.id, next: { mode: "story" } }, { fade: 0.5 });
        };
        const ending = () => {
            P.finished = true; if (!P.planes.includes("crane")) P.planes.push("crane"); game.persist();
            G.phase = "ending"; snd.music("ending"); st.lit = {}; st.litFrac = 1; st.lanterns = 999;
            st.boat = { x: 60, z: 400, yaw: Math.PI / 2 }; s.tween(st.boat, { z: 86, x: 58 }, 15, { ease: "outQuad" });
            st.showPlane = false;
            st.cut("orbit", { x: 40, y: 14, z: 96, a: 0.5, r: 112, h: 42, w: 0.03, fov: 54, ly: 6 });
            let n = 0; const bell = s.every(2.6, () => { snd.fx("bell"); if (++n > 4) bell.cancel(); });
            hud.ending(0);
            s.wait(10, () => { st.lit = {}; st.beam = true; snd.fx("chapter"); });
            for (let i = 0; i < 9; i++) s.wait(13 + i * 0.7, () => { const R = game.fxRng; st.confetti(-40 + R.next() * 140, 12 + R.next() * 26, 20 + R.next() * 50, 60, [hex("#d9593f"), hex("#efc15f"), hex("#fbf1dc"), hex("#3f8c8e"), hex("#f2a5a0")], 15); snd.fx("paper"); });
            s.wait(17, () => { hud.ending(1); hud.showLetter({ from: "wren", to: null, finale: true, text: FINALE.text }, () => game.go("fold", { plane: "crane", next: { mode: "title" }, unfold: true }, { fade: 0.8 })); });
        };

        // ---- Each step ----------------------------------------------------------------------------------------------------
        s.onUpdate((dt) => {
            G.t += dt;
            if (G.phase === "title") {
                // On the title a plane drifts across the view, close enough to read as folded paper.
                G.titleT += dt; const a = G.titleT * 0.42, c = s.cam3, e = c.pos, T = c.target;
                let fx = T.x - e.x, fy = T.y - e.y, fz = T.z - e.z; const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
                const rx = -fz, rz = fx, rl = Math.hypot(rx, rz), wide = s.view.width > s.view.height, sideways = Math.sin(a) * (wide ? 4.5 : 1.8), tall = (wide ? -0.3 : 0.4) + Math.sin(a * 1.6) * 0.5, ahead = wide ? 13 : 12;
                f.px = f.x; f.py = f.y; f.pz = f.z;
                f.x = e.x + fx * ahead + (rx / rl) * sideways; f.y = e.y + fy * ahead + tall; f.z = e.z + fz * ahead + (rz / rl) * sideways;
                const yaw = Math.PI + 0.9 + Math.cos(a) * 0.5 + Math.atan2(rx, rz) * 0, roll = -Math.cos(a) * 0.5 + 0.1;
                const d = [Math.sin(yaw) * 0.97, 0.12, Math.cos(yaw) * 0.97], rr = [d[2] * -1, 0, d[0]], rq = Math.hypot(...rr); rr[0] /= rq; rr[2] /= rq;
                const u0 = [rr[1] * d[2] - rr[2] * d[1], rr[2] * d[0] - rr[0] * d[2], rr[0] * d[1] - rr[1] * d[0]], up = u0[1] < 0 ? u0.map((v) => -v) : u0;
                const cr = Math.cos(roll), sr = Math.sin(roll); f.dir = d; f.right = rr.map((v, i) => v * cr - up[i] * sr); f.up = up.map((v, i) => v * cr + rr[i] * sr);
                f.vx = f.vy = f.vz = 0; f.alpha = 0.1; st.update(dt); hud.update(dt); return;
            }
            const steerable = G.phase === "fly" || G.phase === "count";
            hud.readStick(dt);
            if (G.phase === "fly" || (G.phase === "count" && false)) {
                let sx = G.sx, sy = G.sy;
                if (game.opts.invert) sy = -sy;
                if (env.comfort) sy *= 0.75;
                env.magnet = G.mode === "story" ? st.rings.reduce((b, r) => (!b || (r.x - f.x) ** 2 + (r.z - f.z) ** 2 < (b.x - f.x) ** 2 + (b.z - f.z) ** 2 ? r : b), null) : null;
                if (G.mode !== "trial") for (const q of st.stamps) if (Math.abs(q.x - f.x) < 13 && Math.abs(q.z - f.z) < 13 && Math.abs(q.y - f.y) < 13) env.magnet = q;
                f.step(dt, sx, sy);
                events();
                if (G.mode === "story" || G.mode === "free") checkPickups();
                if (G.trial) trialStep(dt);
                snd.air(f.speed, cfg.vt, !!f.info.ribbon, f.stalled, G.t);
                const skim = f.state === "fly" && f.clearance < 2.6 && f.speed > cfg.vt * 0.9;
                if (skim) { G.skimT -= dt; if (G.skimT <= 0) { G.skimT = 0.16; snd.fx("skim"); P.skims = (P.skims ?? 0); st.confetti(f.x, f.y - 0.8, f.z, 2, f.y < 2 ? [hex("#d9f3ec"), hex("#ffffff")] : [hex("#a9c77c"), hex("#f4e8d0")], 3); } }
                // Close to a wall at speed: a little tick in the hand, the same as the near miss on the road.
                if (f.state === "fly" && f.info.ribbon) { G.trailOn += dt; if (G.trailOn > 0.32) { G.trailOn = 0; game.haptic("tick"); } }
            } else if (G.phase === "count") {
                const T = G.trial; T.count -= dt;
                const c = Math.ceil(T.count); if (c !== T.c) { T.c = c; if (c > 0) snd.fx("count"); }
                if (T.count <= 0) { G.phase = "fly"; T.started = true; snd.fx("go"); snd.windOn(); snd.fx("launch"); }
            }
            st.update(dt); hud.update(dt);
        });
        const events = () => {
            for (const e of f.events) switch (e[0]) {
                case "stall": snd.fx("stall"); hud.toast("Stall! Let the nose drop", 1.6, "stall"); P.flags.stalled = true; break;
                case "recover": snd.fx("recover"); break;
                case "lift": snd.fx("lift"); st.confetti(f.x, f.y - 1, f.z, 6, [hex("#fff0c8"), hex("#ffffff")], 5); hud.liftPulse(); break;
                case "ribbonIn": snd.fx("ribbonIn"); hud.toast(e[1], 1.5, "ribbon"); s.shake(0.05, 0.25, { haptic: false }); P.flags.rode = true; break;
                case "ribbonOut": snd.fx("ribbonOut"); break;
                case "flap": snd.fx("flap"); break;
                case "scrape": snd.fx("scrape", e[1]); st.confetti(f.x, f.y, f.z, 7, [hex("#fbf4e4"), hex("#d9c9a8")], 6); s.shake(Math.min(0.3, 0.05 + e[1] * 0.03), 0.16, { haptic: false }); break;
                case "crumple": {
                    const wet = e[1] === "water";
                    snd.fx(wet ? "splash" : "crumple"); if (wet) snd.fx("crumple"); s.freeze(0.09); s.shake(0.4, 0.3, { haptic: false }); s.flash("#ffffff30", 0.14);
                    st.confetti(f.x, f.y, f.z, 26, wet ? [hex("#d9f3ec"), hex("#ffffff"), hex("#4fb3b4")] : [hex("#fbf4e4"), hex("#e6dcc6"), hex("#d9493a"), hex("#2f6a9e")], wet ? 10 : 8);
                    break;
                }
                case "bounce": game.haptic("tick"); snd.fx("paper"); break;
                case "unfold": snd.fx("unfold"); break;
                case "relaunch": snd.fx("launch"); break;
            }
            f.events.length = 0;
        };
        const checkPickups = () => {
            if (f.state !== "fly") return;
            for (const g of st.rings) if (g.kind === "letter" && (f.x - g.x) ** 2 + (f.y - g.y) ** 2 + (f.z - g.z) ** 2 < 8.5 * 8.5) return deliver(g);
            for (const q of st.stamps) if ((f.x - q.x) ** 2 + (f.y - q.y) ** 2 + (f.z - q.z) ** 2 < 4.2 * 4.2) {
                P.stamps.push(q.q.id); game.persist(); st.stamps = st.stamps.filter((o) => o !== q);
                snd.fx("stamp"); s.freeze(0.05); s.shake(0.1, 0.14, { haptic: false }); st.confetti(q.x, q.y, q.z, 24, [hex("#d9593f"), hex("#fbf1dc"), hex("#efc15f")], 9); hud.stampGot(q.q);
            }
        };
        const trialStep = (dt) => {
            const T = G.trial; if (T.done) return; T.t += dt;
            const h = st.rings[T.i];
            if (h && (f.x - h.x) ** 2 + (f.y - h.y) ** 2 + (f.z - h.z) ** 2 < 8 * 8) {
                h.done = true; snd.fx("hoop", T.i); st.confetti(h.x, h.y, h.z, 18, [hex("#efc15f"), hex("#fbf1dc")], 9); T.i++;
                if (T.i >= st.rings.length) {
                    T.done = true; snd.fx("finish");
                    const id = T.T.id, old = P.best[id], time = T.t; if (old === undefined || time < old) P.best[id] = time;
                    if (time <= T.T.times[0] && !P.stamps.includes(T.T.stamp)) { P.stamps.push(T.T.stamp); T.newStamp = true; }
                    game.persist(); G.phase = "finish"; hud.trialEnd(T, time, old);
                    st.cut("orbit", { x: f.x, y: f.y, z: f.z, a: f.yaw + 1, r: 24, h: 9, w: 0.1, fov: 54 }); st.showPlane = true; snd.quiet();
                }
            }
        };
        s.on("resize", () => hud.layout?.());
        s.on("leave", () => snd.windOff());     // the wind must not outlive the sky it blows in
        G.quit = () => { game.data.resume = G.mode === "story" && f.state === "fly" && G.phase === "fly" ? { x: f.x, y: Math.max(f.y, ground(f.x, f.z) + 10), z: f.z, yaw: f.yaw } : null; };
        if (mode !== "title") {
            snd.music(TIMES[st.time].mood); snd.windOn();
            if (mode === "story" && !resume) { snd.fx("launch"); hud.chapterBanner(P.ch); }
            if (mode === "story") pendingChapter();
            if (mode === "free") hud.toast(`Free flight. ${TIMES[st.time].name}, nowhere to be.`, 3, "ribbon");
        } else { snd.music("title"); hud.title(); }
    });
}
