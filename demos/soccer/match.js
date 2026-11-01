// The match scene: glues the simulation to the world, turns events into juice, runs goals, replays and full time.
import { mesh, pin, pos, rect, tap, text, ui } from "./pogo.js";
import { Match, GW, HL, R_BALL, ST, clamp } from "./sim.js";
import { VENUES, loadSave, writeSave } from "./data.js";
import { World, kitGoats } from "./world.js";
import { Controls, FONT, CREAM, GOLD, INK, RED, plank, radar, scoreboard, sign, strap } from "./hud.js";
import { HAPTIC } from "./audio.js";
import { pickMate } from "./ai.js";
import { LINES } from "./lines.js";
import { encodeClip, Recorder, Player } from "./replay.js";

/** Everything a live or attract match shares. */
export class View {
    constructor(game, s, a) {
        this.game = game; this.s = s; this.a = a;
        const kits = a.kits, vk = a.venueKey;
        const goats = [...kitGoats(game, kits[0], 0, keyOf(kits[0])), ...kitGoats(game, kits[1], 1, keyOf(kits[1]))];
        const sim = new Match({ seed: a.seed ?? 1, teams: [{ skill: a.skills[0], style: kits[0].style }, { skill: a.skills[1], style: kits[1].style }], mode: a.mode, golden: a.golden, duration: a.duration ?? 120, humans: a.humans ?? [], scripted: !a.attract, fast: false });
        this.sim = sim;
        this.W = new World(game, s, { venue: VENUES[vk], venueKey: vk, kits, goats, mud: !!a.mode?.mud });
        this.critters = sim.critters.map((c) => s.add([meshOf(c.kind), pos(c.x, 0, c.z), { c, ph: 0 }]));
        this.rec = new Recorder(sim);
        this.speedOf = (g) => Math.hypot(g.vx, g.vz);
    }

    syncLive(dt) {
        const { sim, W } = this;
        sim.goats.forEach((g, i) => {
            W.syncGoat(i, { x: g.x, y: g.y, z: g.z, ang: g.ang, state: g.state, t: g.t, speed: this.speedOf(g), charge: g.charge, charging: g.charging, tumble: g.tumble }, dt, { spin: g === sim.hero && g.arrived ? 1 + (sim.celebKind ?? 0) : 0 });
        });
        const b = sim.ball;
        W.syncBall({ x: b.x, y: b.y, z: b.z, rx: b.rot[0], ry: b.rot[1], rz: b.rot[2], vx: b.vx, vz: b.vz }, dt);
        for (const e of this.critters) this.syncCritter(e, e.c.x, e.c.z, e.c.ang, e.c.fall, e.c.moving, dt);
    }

    syncCritter(e, x, z, ang, fall, moving, dt) {
        e.pos.set(x, 0, z); e.rot.y = ang;
        e.ph += dt * (moving ? 9 : 2);
        e.rot.x = fall > 0 ? -1.45 * clamp(fall * 3, 0, 1) : 0;
        e.pos.y = fall > 0 ? 0.3 : moving ? Math.abs(Math.sin(e.ph)) * 0.09 : 0;
        e.rot.z = moving ? Math.sin(e.ph) * 0.05 : 0;
    }
}

const meshOf = (k) => mesh(k, { shadow: true });
export const keyOf = (k) => `k${(k.id ?? "x")}${k.c1}${k.c2}${k.pattern}${k.horns}${(k.furs ?? []).join("")}`.replace(/#/g, "");

export function registerMatch(game) {
    const snd = game.snd;
    game.scene("match", (s, args) => {
        args = { ...(game.data.fixture ?? {}), ...args };
        if (!args.kits) args = game.quickFixture(args);
        game.touch.enabled = false;
        const save = loadSave(game);
        const a = { ...args, humans: args.two === "versus" ? [{ team: 0 }, { team: 1 }] : args.two === "coop" ? [{ team: 0 }, { team: 0 }] : args.watch ? [] : [{ team: 0 }], seed: args.seed ?? (1 + Math.floor(s.rng.range(0, 1e6))) };
        const view = new View(game, s, a), { sim, W } = view, kits = a.kits;
        W.forceWide = !!a.two;
        const ctl = new Controls(game, s);
        const st = { uiT: 0, banners: [], stamps: [], strap: null, strapT: 0, pop: [1, 1], tip: null, goal: null, replay: null, end: 0, charge: 0, seen: save.seenTips, lastLine: {}, bars: 0, zoomKick: 0, stats: { butts: 0 }, firstTouch: false, goalsFor: [] };
        game.match = { sim, view, st };
        s.timeScale = 1;
        snd.music(a.comp === "cup" ? "cup" : "match"); snd.crowdOn();
        const say = (key, g) => {
            const l = LINES[key]; if (!l) return;
            const now = st.uiT;
            if ((st.strapT > 0 && !g) || (st.lastLine[key] ?? -99) + 8 > now) return;
            st.lastLine[key] = now;
            st.strap = l[Math.floor(game.fxRng.range(0, l.length))].replace("{a}", kits[0].name).replace("{b}", kits[1].name); st.strapT = 3.2;
        };
        const banner = (txt, o = {}) => st.banners.push({ txt, t: 0, dur: o.dur ?? 1.4, size: o.size ?? 44, col: o.col ?? CREAM, sub: o.sub, y: o.y ?? 0.34 });
        const stamp = (txt, x, y, z, col = GOLD) => {
            const p = s.cam3.project([x, y, z]);
            const hw = txt.length * 8 + 12;
            st.stamps.push({ txt, x: clamp(p.x, hw, s.view.width - hw), y: clamp(p.y - 30, 90, s.view.height - 120), t: 0, rot: game.fxRng.range(-0.18, 0.18), col });
            if (st.stamps.length > 3) st.stamps.shift();
        };
        const tip = (id, txt) => {
            if (st.seen[id] || args.watch) return;
            st.seen[id] = 1; st.tip = { txt, t: 0 }; writeSave(game);
        };
        banner(a.golden ? "SUDDEN DEATH" : "KICK OFF", { dur: 1.0, size: 34 });
        s.wait(0.2, () => say("open"));

        // --- Events to juice ---------------------------------------------------------------------
        const grass = VENUES[a.venueKey].grass, dustC = a.mode?.mud ? ["#6b4d2e", "#4f3820", "#8a6a40"] : [grass[0], grass[1], "#e8dfae"];
        const puff = (x, y, z, n, sp = [2, 6], size = [0.14, 0.34], c = dustC, g = -14) => s.burst({ at: [x, y, z], count: n, color: c, speed: sp, life: [0.25, 0.6], size, gravity: g, dim: 3 });
        const dust = (x, z, n, r = 0.4) => s.burst({ at: [x, 0.25, z], count: n, color: ["#fff6e0", "#e8dfae"], speed: [1, 3], life: [0.3, 0.6], size: [0.3, 0.6 * r + 0.4], gravity: 2, dim: 3 });
        const drain = () => {
            for (const e of sim.events) on(e);
            sim.events.length = 0;
        };
        const on = (e) => {
            const g = e.g, mine = !!e.human;
            switch (e.t) {
                case "kick": {
                    snd.kick(e.speed, e.power, mine);
                    W.ballSq = e.power ? 1.5 : 1 + Math.min(0.35, e.speed / 70);
                    if (g) W.rigs[g.id].sq = 1.12;
                    puff(e.x, 0.2, e.z, e.power ? 20 : e.speed > 20 ? 7 : 2);
                    if (e.power) { s.freeze(0.07); s.shake(0.35, 0.26, { haptic: false }); s.flash("#fff3c8", 0.1); stamp(LINES.power[Math.floor(game.fxRng.range(0, LINES.power.length))], e.x, 2.4, e.z, "#ffb340"); snd.surge(0.5); }
                    else if (e.speed > 30) s.shake(0.12, 0.12, { haptic: false });
                    if (e.kind === "shot" || e.kind === "power" || e.kind === "volley") { if (Math.abs(sim.ball.x) > 10) snd.surge(0.3); }
                    if (e.first && e.speed > 20) stamp(e.kind === "volley" ? "FIRST TIME!" : "ONE TOUCH!", e.x, 2.2, e.z, "#9fe0ff");
                    if (mine && !st.firstTouch) st.firstTouch = true;
                    if (mine && e.kind === "pass" && (st.passes = (st.passes ?? 0) + 1) === 1) tip("hold", "Hold PASS to float it over their heads");
                    break;
                }
                case "shot": if (mine) tip("curve", "Just after a shot, the stick bends the ball"); break;
                case "charge": break;
                case "chargeFull": snd.ping(); if (g) { W.rigs[g.id].sq = 1.15; puff(g.x, 0.3, g.z, 8, [3, 6], [0.1, 0.2], ["#ffd24a", "#fff3c8"]); } break;
                case "trap": snd.trap(mine); if (e.hit > 12) puff(e.x, 0.2, e.z, 3); break;
                case "dribble": snd.dribble(); break;
                case "buttStart": snd.whoosh(); snd.bleat(1.1); break;
                case "whiff": dust(g.x, g.z, 3); say("whiff"); break;
                case "slide": snd.slide(); dust(g.x, g.z, 4); break;
                case "tackle": snd.tackle(mine); puff(e.x, 0.3, e.z, 10, [3, 7]); say("tackle"); s.freeze(0.03); break;
                case "bowl": {
                    const v = e.g, r = W.rigs[v.id];
                    const hard = e.kind === "butt" || e.kind === "keeper" || e.kind === "ball";
                    snd.headbutt(mine); if (e.mine) game.haptic(HAPTIC.bowled);
                    snd.bleat(v.team ? 0.86 : 1, true);
                    r.sq = 1.3; r.starT = 2.4;
                    if (hard) { s.freeze(0.085); s.shake(0.5, 0.3, { haptic: false }); puff(v.x, 1.1, v.z, 18, [3, 9], [0.12, 0.32]); s.burst({ at: [v.x, 1.4, v.z], count: 8, color: ["#ffe14a", "#fff6c0"], speed: [3, 7], life: [0.2, 0.45], size: [0.16, 0.3], dim: 3 }); snd.surge(0.5); }
                    else { s.shake(0.2, 0.16, { haptic: false }); puff(v.x, 0.6, v.z, 8); }
                    if (e.kind === "butt") { stamp(LINES.bowl[Math.floor(game.fxRng.range(0, LINES.bowl.length))], v.x, 2.4, v.z); say("butt"); st.stats.butts += e.by && sim.isHuman(e.by) ? 1 : 0; }
                    if (e.kind === "keeper") { stamp("KEEPER FLATTENED!", v.x, 2.8, v.z, "#ffb340"); say("keeperOut"); }
                    if (e.kind === "ball") stamp("TAKE THAT!", v.x, 2.4, v.z, "#ffb340");
                    break;
                }
                case "strike": stamp("STRIKE!", e.g.x, 2.8, e.g.z, "#ff7a5a"); say("strike"); snd.oooh(); break;
                case "thud": snd.thud(e.v); dust(e.x, e.z, 4); W.rigs[e.g.id].sq = 1.2; break;
                case "bounce": snd.bounce(e.v); if (e.v > 6) puff(e.x, 0.1, e.z, a.mode?.mud ? 10 : 3, [1, 4]); W.ballSq = 1 + Math.min(0.3, e.v * 0.025); break;
                case "wall": snd.wall(e.v); if (e.v > 8) s.burst({ at: [e.x, 0.7, e.z], count: 5, color: ["#b9ab94", "#8f8574"], speed: [2, 5], life: [0.2, 0.4], size: [0.1, 0.2], gravity: -18, dim: 3 }); if (e.end && e.near && e.v > 16) { snd.oooh(); say("wide"); } W.ballSq = 1.2; break;
                case "post": snd.post(sim.isHuman(sim.ball.last)); s.shake(0.3, 0.2, { haptic: false }); snd.oooh(); stamp(e.bar ? "CROSSBAR!" : "OFF THE POST!", e.x, e.y + 1, e.z, "#ff9d5c"); say("post"); W.excite[e.team === 1 ? 1 : 0] = 0.8; break;
                case "deflect": snd.thud(e.v * 0.3); break;
                case "save": snd.tackle(false); if (e.big) { snd.oooh(); stamp(e.caught ? "GRABBED!" : "WHAT A SAVE!", e.x, e.y + 1.4, e.z, "#9fe0ff"); say("save"); } s.shake(0.14, 0.14, { haptic: false }); puff(e.x, e.y, e.z, 7, [2, 5], [0.08, 0.18], ["#fff"]); break;
                case "dive": snd.whoosh(); break;
                case "collect": snd.trap(false); break;
                case "intercept": if (mine) say("nick"); break;
                case "whistle": snd.whistle(e.kind); break;
                case "critterHit": if (e.kind === "sheep") { snd.baa(); stamp("BAA!", e.x, 2.2, e.z, "#fff"); } else { snd.oi(); stamp("OI!", e.x, 3.2, e.z, "#fff"); say("farmer"); } break;
                case "farmerHit": snd.oi(); snd.headbutt(mine); s.freeze(0.07); s.shake(0.4, 0.25, { haptic: false }); stamp("NOT THE FARMER!", e.x, 3.2, e.z, "#ff7a5a"); say("farmer"); break;
                case "net": snd.netRip(); break;
                case "golden": banner("GOLDEN GOAL", { size: 40, col: GOLD, dur: 1.8, sub: "Next goal wins it" }); snd.fanfare(); break;
                case "goal": onGoal(e); break;
                case "kickoff": st.bars = 0; break;
                case "fulltime": onFull(); break;
            }
        };

        function onGoal(e) {
            const side = e.team === 0 ? 1 : 0;
            W.netHit(side, sim.ball.z, Math.min(3, 1 + e.speed / 12));
            s.freeze(0.1); s.shake(0.8, 0.5, { haptic: false }); s.flash("#fff", 0.16);
            s.timeScale = 0.3;
            snd.goalRoar(); snd.goalHorn(); snd.netRip(); snd.bleat(1, true);
            if (!e.human && !a.two) { snd.sting(true); game.haptic("warn"); }
            W.excite[e.team] = 1.6;
            st.pop[e.team] = 1.8;
            const cols = [kits[e.team].c1, kits[e.team].c2, "#fff6c0", "#ffd24a"], x = e.team === 0 ? HL : -HL;
            let shots = 0;
            const cannon = () => {
                s.burst({ at: [x, 3, -GW - 1], count: 26, color: cols, speed: [6, 16], life: [0.8, 1.7], size: [0.14, 0.3], gravity: -9, dim: 3 });
                s.burst({ at: [x, 3, GW + 1], count: 26, color: cols, speed: [6, 16], life: [0.8, 1.7], size: [0.14, 0.3], gravity: -9, dim: 3 });
                if (++shots < 5) s.wait(0.3, cannon);
            };
            cannon();
            const scorer = sim.hero;
            st.goal = { t: 0, team: e.team, rating: e.rating, own: e.own, dist: e.dist, scorer, human: e.human, clip: null };
            if (e.human || a.two) st.goalsFor.push(e.rating);
            if (e.team === 0 && !e.own && !a.watch) { save.best.goals++; if (e.dist > 20) tip("far", "Long range? Hold SHOOT till it glows gold."); }
            banner(e.own ? "OWN GOAT!" : "GOAL!", { size: 88, col: GOLD, dur: 2.6, y: 0.37, sub: e.own ? "Straight into his own net" : `${e.rating.label} · ${kits[e.team].name}` });
            say(e.own ? "ownGoal" : e.rating.score > 60 ? "wonder" : "goal", true);
            if (e.human || (a.two && e.team === 1)) keepClip(e);
        }

        function keepClip(e) {
            // Top three goals of all time are kept on disk; the replay itself is taken from the ring buffer.
            const score = e.rating.score;
            if (!(a.two || a.watch) && e.team === 0 && !e.own) {
                st.saveClip = { score, label: e.rating.label, dist: Math.round(e.dist), vs: kits[1].name, kits, venue: a.venueKey, mud: !!a.mode?.mud };
            }
        }

        function onFull() {
            st.end = 0.001;
            const sc = sim.score, w = sim.winner;
            s.timeScale = 1;
            banner("FULL TIME", { size: 48, dur: 2.6, sub: `${kits[0].tag} ${sc[0]} - ${sc[1]} ${kits[1].tag}`, y: 0.34 });
            W.excite[0] = W.excite[1] = 1.1;
            snd.goalRoar();
            if (w === 0 && !a.watch) snd.fanfare();
            if (!a.two && w === 1) game.haptic(HAPTIC.lose);
            say("full");
            s.wait(a.two ? 2.6 : 2.6, () => finish());
        }

        function finish() {
            if (st.done) return; st.done = true;
            const sc = sim.score;
            game.data.result = { args: { ...args, kits: undefined }, kits, score: sc.slice(), stats: sim.stats, scorers: sim.scorers, golden: sim.golden, clip: st.saveClip ?? null, comp: a.comp, two: a.two };
            snd.crowdOff();
            game.go("result", {}, { fade: 0.35 });
        }

        // --- Input and stepping ------------------------------------------------------------------
        const two = !!a.two;
        const readHumans = () => {
            ctl.read();
            const h = sim.humans[0];
            if (!h) return;
            if (game.data.autoplay) { game.data.autoplay(sim, h); return; }
            if (two) {
                const i = s.input;
                const set = (p, u, d2, l, r, A, B) => { const dz = (i.down(r) ? 1 : 0) - (i.down(l) ? 1 : 0), dy = (i.down(d2) ? 1 : 0) - (i.down(u) ? 1 : 0), m = Math.hypot(dz, dy) || 1; p.mx = dz / m; p.mz = dy / m; p.a = i.down(A); p.b = i.down(B); };
                set(sim.humans[0], "p1u", "p1d", "p1l", "p1r", "p1a", "p1b"); set(sim.humans[1], "p2u", "p2d", "p2l", "p2r", "p2a", "p2b");
                return;
            }
            let [mx, mz] = W.stickToWorld(ctl.sx, ctl.sy);
            if (ctl.mouse && ctl.pointer) {
                const r = s.cam3.ray(ctl.pointer.x, ctl.pointer.y), t = r.dir.y < -0.01 ? -r.origin.y / r.dir.y : 0, px = r.origin.x + r.dir.x * t, pz = r.origin.z + r.dir.z * t, g = h.goat;
                const dx = px - g.x, dz = pz - g.z, d = Math.hypot(dx, dz);
                mx = d > 1 ? dx / d : 0; mz = d > 1 ? dz / d : 0;
            }
            h.mx = mx; h.mz = mz; h.a = ctl.a; h.b = ctl.b;
        };

        const liveStep = (dt) => {
            sim.dt = Math.min(1 / 45, dt);
            readHumans();
            sim.step();
            view.rec.capture();
            drain();
            if (st.goal) {
                const g = st.goal, real = dt / Math.max(0.05, s.timeScale);
                g.t += real;
                if (g.t > 0.9 && s.timeScale < 1) s.timeScale = 1;
                const skip = g.t > 1.4 && tappedAny();
                const hasReplay = g.human || g.rating.score >= 55;
                if (hasReplay && !st.replay && (g.t > 3.6 || skip)) startReplay();
                else if (!hasReplay && (g.t > 3.8 || skip)) endGoal();
            }
            if (st.end > 0) st.end += dt;
        };

        const tappedAny = () => s.input.pointer.tapped || (!s.input.touchMode && (s.input.pressed("shoot") || s.input.pressed("pass") || s.input.pressed("confirm")));

        function endGoal() {
            st.goal = null; st.replay = null; st.bars = 0;
            W.snapCam = true;
            sim.afterGoal();
            drain();
            s.timeScale = 1;
        }

        function startReplay() {
            const g = st.goal;
            const frames = view.rec.tail(6.2);
            if (st.saveClip && !st.saveClip.data && !st.savedThis) {
                st.savedThis = true;
                st.saveClip.data = encodeClip(frames);
                if (args.comp !== "attract") storeClip(save, st.saveClip, game);
            }
            st.replay = new Player(frames, view, { side: g.team === 0 ? 1 : -1 });
            s.flash("#fff", 0.12);
            snd.surge(0.4);
        }

        s.onUpdate((dt) => {
            const real = dt / Math.max(0.05, s.timeScale);
            st.uiT += real;
            if (s.input.pressed("pause") && !st.replay) { doPause(true); return; }
            if (st.replay) {
                W.tick(real, windOf());
                const done = st.replay.step(real, W);
                if (done || (st.replay.t > 0.5 && tappedAny())) endGoal();
                st.bars = Math.min(1, st.bars + real * 5);
                return;
            }
            liveStep(dt);
            game.data.pose?.(sim, W, s);
            view.syncLive(dt);
            W.tick(dt, windOf());
            // Danger for the crowd.
            const b = sim.ball, danger = clamp((Math.abs(b.x) - HL * 0.3) / (HL * 0.7), 0, 1);
            snd.crowdTick(real, danger);
            // Camera.
            const camO = {};
            if (st.goal) { const h = sim.hero; camO.focus = st.goal.t < 0.8 ? [b.x, b.z] : [h.x, h.z]; camO.zoom = st.goal.t < 0.8 ? 1.15 : 1.45; camO.fast = true; }
            else if (sim.phase === "fulltime") { const h = sim.hero ?? sim.goats[4]; camO.focus = [sim.winner >= 0 ? sim.goats[sim.winner * 5 + 4].x : h.x, sim.winner >= 0 ? sim.goats[sim.winner * 5 + 4].z : h.z]; camO.zoom = 1.3; }
            else if (b.owner?.charging) camO.zoom = 1.08;
            W.camera(b, real, camO);
            game.data.cam?.(W, s);
            markers(dt);
            ballFx();
            hints();
        });

        const windOf = () => ({ ang: sim.mode.wind ? sim.windAng : 0.6, k: sim.mode.wind ? sim.windK : 3 });

        function markers(dt) {
            const hs = sim.humans;
            const ms = [[W.marker, W.chev], [W.marker2, W.chev2]];
            ms.forEach(([m, c], i) => {
                const h = hs[i];
                const show = !!h && sim.phase !== "goal" && sim.phase !== "fulltime";
                m.hidden = !show; c.hidden = !show;
                if (show) {
                    const g = h.goat, t = st.uiT;
                    m.pos.set(g.x, 0.05, g.z); m.scale = 1.1 + Math.sin(t * 6) * 0.05;
                    c.pos.set(g.x, 3.2 + g.y + Math.sin(t * 5) * 0.14, g.z);
                    // Face the camera.
                    const e = s.cam3.pos; c.rot.y = Math.atan2(e.x - g.x, e.z - g.z);
                }
            });
            const h = hs[0], arrow = W.arrow;
            arrow.hidden = true; W.mate.hidden = true;
            if (h && sim.ball.owner === h.goat && sim.phase === "play") {
                const g = h.goat, st2 = Math.hypot(h.mx, h.mz) > 0.2, dx = st2 ? h.mx : Math.sin(g.ang), dz = st2 ? h.mz : Math.cos(g.ang);
                arrow.hidden = false; arrow.pos.set(g.x + dx * 1.2, 0.06, g.z + dz * 1.2); arrow.rot.y = Math.atan2(dx, dz);
                const mate = pickMate(sim, g, dx, dz);
                if (mate) { W.mate.hidden = false; W.mate.pos.set(mate.x, 0.05, mate.z); W.mate.rot.y = st.uiT * 1.4; }
            }
            // Where a lofted ball will land.
            const b = sim.ball, L = W.landing;
            if (!b.owner && b.y > 1.4 && b.vy < 6) {
                const t = (b.vy + Math.sqrt(Math.max(0, b.vy * b.vy + 2 * 24 * (b.y - R_BALL)))) / 24;
                L.hidden = false; L.pos.set(b.x + b.vx * t, 0.05, b.z + b.vz * t); L.scale = 0.6 + clamp(t, 0, 1) * 0.6; L.rot.y += dt * 3;
            } else L.hidden = true;
            // Dizzy stars over bowled goats.
            let n = 0;
            for (let i = 0; i < 10; i++) {
                const r = W.rigs[i], g = sim.goats[i];
                if ((r.starT ?? 0) > 0) {
                    r.starT -= dt;
                    for (let k = 0; k < 3 && n < W.stars.length; k++) {
                        const e = W.stars[n++], a2 = st.uiT * 6 + k * 2.1;
                        e.hidden = false; e.teleport(g.x + Math.cos(a2) * 0.8, g.y + (g.state === ST.BOWLED ? 1.7 : 2.5), g.z + Math.sin(a2) * 0.8);
                    }
                }
            }
            for (; n < W.stars.length; n++) W.stars[n].hidden = true;
        }

        function ballFx() {
            const b = sim.ball, sp = Math.hypot(b.vx, b.vz);
            W.ballGlow.hidden = !(b.power > 0);
            if (b.power > 0) {
                W.ballGlow.pos.set(b.x, b.y, b.z);
                W.addTrail(b.x, b.y, b.z, 1.5, "#ffb340");
                if (game.stepCount % 2 === 0) s.burst({ at: [b.x, b.y, b.z], count: 2, color: ["#ffd24a", "#ff7a2a"], speed: [0.5, 2], life: [0.2, 0.4], size: [0.14, 0.3], dim: 3 });
            } else if (!b.owner && sp > 20 && b.since < 1.2) W.addTrail(b.x, b.y, b.z, 0.62, "#fff6e0");
            const c = b.owner?.charging ? b.owner : null;
            if (c && c.charge >= 1 && game.stepCount % 3 === 0) { s.burst({ at: [c.x, 0.3, c.z], count: 2, color: ["#ffd24a", "#fff3c8"], speed: [2, 4], life: [0.2, 0.4], size: [0.1, 0.2], gravity: 6, dim: 3 }); }
            for (const g of sim.goats) {
                if (g.state === ST.SLIDE && game.stepCount % 2 === 0) puff(g.x, 0.15, g.z, 2, [2, 5], [0.12, 0.26]);
                if (a.mode?.mud && Math.hypot(g.vx, g.vz) > 7 && game.stepCount % 9 === g.id % 9) puff(g.x, 0.1, g.z, 2, [1, 3], [0.08, 0.16]);
            }
            snd.chargeTick(sim.humans.some((h) => h.goat.charging) ? sim.humans.find((h) => h.goat.charging).goat.charge : 0);
            if (sim.mode.wind && game.stepCount % 4 === 0) {
                const fx = game.fxRng, k = sim.windK * 1.6, wx = Math.cos(sim.windAng) * k, wz = Math.sin(sim.windAng) * k, e = { at: [W.cam.x + fx.range(-16, 16), fx.range(0.4, 4), W.cam.z + fx.range(-12, 12)], count: 1, color: ["#ffffff", "#e8f0d8"], speed: [0, 0], life: [0.5, 0.8], size: [0.1, 0.16], dim: 3 };
                s.burst(e); const p = s.particles?.at(-1); if (p) { p.vx = wx; p.vz = wz; }
            }
        }

        function hints() {
            const h = sim.humans[0];
            if (!h || sim.phase !== "play") return;
            const g = h.goat, dir = sim.teams[h.team].dir, b = sim.ball;
            if (b.owner === g && g.x * dir > 8) tip("shoot", s.input.touchMode ? "Hold SHOOT, let go to fire" : "Hold shoot, release to fire");
            if (b.owner && b.owner.team !== h.team && Math.hypot(b.owner.x - g.x, b.owner.z - g.z) < 6) tip("butt", "BUTT him. It's legal.");
            if (b.owner === g && st.uiT > 1) tip("pass", "PASS goes where the stick points");
        }

        // --- Pause ---------------------------------------------------------------------------------
        function doPause(on) {
            if (on === s.paused) return;
            s.paused = on;
            if (on) {
                snd.crowdOff();
                const v = s.view, cx = v.width / 2, cy = v.height / 2;
                const L = (e) => st.pauseUi.push(e);
                st.pauseUi = [];
                L(s.add([rect(v.width * 2, v.height * 2, { color: "#1a1208b0" }), pos(cx, cy), ui(), { layer: 50 }]));
                L(s.add([text("PAUSED", { size: 34, bold: true, font: FONT, color: GOLD }), pos(cx, cy - 104), ui(), { layer: 51 }]));
                const item = (label, y, fn, col = "#3f8a45") => {
                    L(s.add([rect(210, 48, { color: col, radius: 10, outline: { color: INK, width: 3 } }), pos(cx, y), ui(), { layer: 51 }, tap(fn)]));
                    L(s.add([text(label, { size: 20, bold: true, font: FONT, color: CREAM }), pos(cx, y + 1), ui(), { layer: 52 }]));
                };
                item("Resume", cy - 44, () => doPause(false));
                item(snd.cfg.music ? "Music: on" : "Music: off", cy + 12, () => { snd.cfg.music = !snd.cfg.music; writeSave(game); snd.apply(); doPause(false); doPause(true); }, "#7a5230");
                item(snd.cfg.haptics ? "Haptics: on" : "Haptics: off", cy + 68, () => { snd.cfg.haptics = !snd.cfg.haptics; writeSave(game); snd.apply(); doPause(false); doPause(true); }, "#7a5230");
                item("Quit match", cy + 124, () => { snd.crowdOff(); s.paused = false; game.go("title", {}, { fade: 0.3 }); }, RED);
            } else {
                for (const e of st.pauseUi ?? []) e.destroy();
                st.pauseUi = [];
                snd.crowdOn();
            }
        }
        s.add([rect(46, 46, { color: "#00000001" }), pin("top-left", [4, 4]), { layer: 20 }, tap(() => doPause(!s.paused))]);
        game.pauseMatch = () => { if (game.current === s && !st.replay && !st.done) doPause(true); };
        s.on("leave", () => { snd.crowdOff(); snd.chargeOff(); game.pauseMatch = null; });

        // --- Everything printed on top -------------------------------------------------------------
        s.add([ui(), pos(0, 0), { update(dtU) {
            for (const k of st.stamps) k.t += dtU;
            st.stamps = st.stamps.filter((k) => k.t <= 1.15);
            for (const b of st.banners) b.t += dtU;
            st.banners = st.banners.filter((b) => b.t < b.dur);
            if (st.strapT > 0) st.strapT -= dtU;
            if (st.tip) { st.tip.t += dtU; if (st.tip.t > 3.6) st.tip = null; }
            st.pop[0] += (1 - st.pop[0]) * 0.05; st.pop[1] += (1 - st.pop[1]) * 0.05;
        } }]);
        s.onDrawUI((d) => {
            const v = s.view;
            if (game.data.noHud) { game.data.noHud(d, v); return; }
            const sfT = v.safe.top;
            const tall = v.height > v.width;
            if (st.replay || st.bars > 0) {
                const h = 46 * st.bars;
                d.rect(v.width, h, { x: v.width / 2, y: h / 2, color: "#14100a" }); d.rect(v.width, h, { x: v.width / 2, y: v.height - h / 2, color: "#14100a" });
                if (st.replay) {
                    const g = st.goal;
                    if (Math.floor(st.uiT * 2) % 2) d.circle(5, { x: 22, y: h / 2 + sfT * 0, color: RED });
                    sign(d, "REPLAY", 66, h / 2, 16, CREAM);
                    d.text(g.rating.label, { x: v.width / 2, y: v.height - h / 2, size: 18, bold: true, font: FONT, color: GOLD });
                    d.text("tap to skip", { x: v.width - 50, y: h / 2, size: 12, font: FONT, color: "#c8b898" });
                }
            }
            if (!st.replay) {
                scoreboard(d, v, { kits, score: sim.score, clock: sim.clock, golden: sim.golden, pop: st.pop });
                radar(d, v, sim, kits, sim.humans.map((h) => h.goat));
                // Pause tab.
                const tx = v.safe.left + 24, ty = sfT + 24;
                d.circle(16, { x: tx, y: ty, color: "#2a2118aa" }); d.rect(4, 13, { x: tx - 4, y: ty, color: CREAM, radius: 1 }); d.rect(4, 13, { x: tx + 4, y: ty, color: CREAM, radius: 1 });
                if (sim.mode.wind) windArrow(d, v, sim);
                // Charge meter over your goat.
                const h0 = sim.humans.find((h) => h.goat.charging);
                if (h0) {
                    const g = h0.goat, p = s.cam3.project([g.x, 3.6, g.z]), c = clamp(g.charge, 0, 1), W2 = 52;
                    d.rect(W2 + 6, 12, { x: p.x, y: p.y, color: INK, radius: 5 });
                    d.rect(W2 * c, 7, { x: p.x - W2 * (1 - c) / 2, y: p.y, color: c >= 1 ? (Math.floor(st.uiT * 12) % 2 ? "#fff" : "#ffb340") : GOLD, radius: 3 });
                }
                const h = sim.humans[0];
                if (h && !a.two) ctl.draw(d, sim.phase === "goal" ? null : sim.contextFor(h), h.goat.charging ? clamp(h.goat.charge, 0, 1) : 0);
                if (!s.input.touchMode && h && st.uiT < 9 && !a.two) { const yy = v.height - v.safe.bottom - 14; d.text("Arrows or WASD move   Z pass   X shoot / butt   Hold to charge", { x: v.width / 2, y: yy, size: 12, bold: true, font: FONT, color: "#fff", opacity: clamp((9 - st.uiT) / 2, 0, 0.9) }); }
                if (a.two && st.uiT < 9) {
                    const yy = v.height - v.safe.bottom - 14, o = clamp((9 - st.uiT) / 2, 0, 0.9);
                    d.text("P1  WASD  F pass  G shoot", { x: v.width * 0.25, y: yy, size: 12, bold: true, font: FONT, color: "#ffe14a", opacity: o });
                    d.text("P2  Arrows  K pass  L shoot", { x: v.width * 0.75, y: yy, size: 12, bold: true, font: FONT, color: "#4af2ff", opacity: o });
                }
            }
            // Stamps: comic pop-ups in the world.
            for (const k of st.stamps) {
                const inT = clamp(k.t / 0.12, 0, 1), sc = (2 - inT) * (k.t > 0.9 ? clamp(1 - (k.t - 0.9) / 0.25, 0, 1) : 1) * 1;
                d.push(); d.translate(k.x, k.y); d.rotate(k.rot); d.scale(sc, sc);
                sign(d, k.txt, 0, 0, 22, k.col);
                d.pop();
            }
            // Banners.
            for (const b of st.banners) {
                const inT = clamp(b.t / 0.16, 0, 1), ease = 1 + 2.2 * (1 - inT) * (1 - inT), out = clamp((b.dur - b.t) / 0.22, 0, 1), y = v.height * b.y;
                const fit = Math.min(1, (v.width - 24) / (b.txt.length * b.size * 0.68));
                d.push(); d.translate(v.width / 2, y); d.scale(ease * out * fit, ease * out * fit); d.rotate(-0.04);
                sign(d, b.txt, 0, 0, b.size, b.col, INK, 0.12);
                d.pop();
                if (b.sub && b.t > 0.2) { const w = Math.min(v.width - 30, b.sub.length * 9.5 + 34); plank(d, v.width / 2, y + b.size * 0.68 * fit + 10, w, 26, "#fff3d2", { radius: 5, opacity: out }); d.text(b.sub, { x: v.width / 2, y: y + b.size * 0.68 * fit + 11, size: 14, bold: true, font: FONT, color: INK, opacity: out }); }
            }
            // Broadcast strap.
            if (st.strapT > 0 && st.strap) {
                const base = !s.input.touchMode ? v.height - v.safe.bottom - 44 : tall ? v.height - v.safe.bottom - 164 : v.height - v.safe.bottom - 112;
                strap(d, v, st.strap, Math.min(1, st.strapT * 3), st.replay ? base : base);
            }
            // Tip.
            if (st.tip) {
                const t = st.tip.t, op = clamp(t * 5, 0, 1) * clamp((3.6 - t) * 3, 0, 1), y = tall ? v.safe.top + 92 : v.safe.top + 74, w = Math.min(v.width - 30, st.tip.txt.length * 9 + 34);
                plank(d, v.width / 2, y, w, 30, GOLD, { radius: 8, opacity: op });
                d.text(st.tip.txt, { x: v.width / 2, y: y + 1, size: 15, bold: true, font: FONT, color: INK, opacity: op });
            }
        });
    });
}

function windArrow(d, v, sim) {
    const tall = v.height > v.width, x = v.safe.left + 66, y = v.safe.top + 24, a = sim.windAng, k = clamp(sim.windK / 12, 0.3, 1);
    // Ground wind angle in screen terms, depending on camera.
    const ang = tall ? Math.atan2(-Math.cos(a), Math.sin(a)) * 1 : Math.atan2(Math.sin(a) * 0.6, Math.cos(a));
    d.circle(16, { x, y, color: "#2a2118aa" });
    d.push(); d.translate(x, y); d.rotate(ang);
    d.rect(18 * k, 3.5, { color: CREAM }); d.poly([[12 * k, 0], [5 * k, -6], [5 * k, 6]], { color: GOLD });
    d.pop();
}

function storeClip(save, clip, game) {
    const c = { ...clip, kits: clip.kits.map(({ c1, c2, pattern, horns, furs, name, tag, id, style }) => ({ c1, c2, pattern, horns, furs, name, tag, id, style })) };
    save.reel = [...(save.reel ?? []), c].sort((x, y) => y.score - x.score).slice(0, 3);
    writeSave(game);
}

