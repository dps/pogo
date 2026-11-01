// Title, season hub, cup, friendly picker, team builder, trophy room, settings and the results screen.
import { color, dim, mesh, pos, rect, rot, tap, text, ui } from "./pogo.js";
import { CLUBS, CREST_WORDS, CUP_ROUNDS, FUR_NAMES, HORNS, KIT_COLORS, LEVELS, MODES, PATTERNS, TIERS, VENUES, VILLAGES, club, loadSave, myClub, newCup, newSeason, sortedTable, writeSave } from "./data.js";
import { CREAM, FONT, GOLD, GRASS, INK, RED, WOOD, WOOD2, plank, sign } from "./hud.js";
import { View, keyOf } from "./match.js";
import { World, kitGoats } from "./world.js";
import { decodeClip, Player } from "./replay.js";
import { ST, clamp } from "./sim.js";

const seasonOffset = () => 0;

/** A chunky tappable plank. Registers with the scene and overshoots on arrival. */
function btn(s, game, label, x, y, w, h, fn, o = {}) {
    const col = o.color ?? GRASS, size = o.size ?? Math.min(22, h * 0.46);
    const e = s.add([pos(x, y), ui(), { layer: o.layer ?? 10, hit: 0, pop: 0, btnLabel: label, size: [w, h],
        draw(d) {
            const k = 1 - this.hit * 0.05, b = this.pop;
            d.push(); d.scale(k * (1 + b * 0.06), k * (1 + b * 0.06));
            plank(d, 0, 0, w, h, col, { radius: o.radius ?? 12 });
            if (o.sign === false) d.text(label, { x: 0, y: 1, size, bold: true, font: FONT, color: o.textColor ?? CREAM });
            else sign(d, label, 0, 0, size, o.textColor ?? CREAM, INK, 0.08);
            if (o.sub) d.text(o.sub, { x: 0, y: h / 2 - 11, size: 11, font: FONT, color: "#ffffffcc" });
            d.pop();
        },
        update(dt) { this.hit = Math.max(0, this.hit - dt * 7); this.pop = o.pulse ? Math.abs(Math.sin(s.time * 3)) : 0; if (o.pulse && !s.input.touchMode && s.input.pressed("confirm")) { game.snd.ui(); fn(); } } },
        rect(w, h, { color: "#00000000" }), tap(() => { e.hit = 1; game.snd.ui(); fn(); })]);
    if (o.tag) e.tag(o.tag);
    return e;
}

const label = (s, str, x, y, size, col = CREAM, o = {}) => s.add([text(str, { size, bold: o.bold ?? true, font: FONT, color: col, align: o.align ?? "center", maxWidth: o.maxWidth ?? 0, lineHeight: o.lineHeight }), pos(x, y), ui(), { layer: o.layer ?? 10 }]);

/** Every menu sits at pitchside: real ground, real goats milling about behind the planks. mood: idle, win, lose. */
function backdrop(s, game, o = {}) {
    const save = loadSave(game), mine = o.kit ?? myClub(save), other = o.other ?? CLUBS[14], key = o.venue ?? "meadow", kits = [mine, other];
    const goats = [...kitGoats(game, mine, 0, keyOf(mine)), ...kitGoats(game, other, 1, keyOf(other))];
    const W = new World(game, s, { venue: VENUES[key], venueKey: key, kits, goats, mud: key === "mud" });
    for (const e of [W.marker, W.marker2, W.chev, W.chev2, W.arrow, W.mate, W.landing, W.ballGlow, W.ball, W.ref]) e.hidden = true;
    const cast = o.cast ?? [1, 2, 3, 4], spots = [[-4.4, 1.5], [-1.5, 3.4], [1.6, 2], [4.5, 3.6]], mood = o.mood ?? "idle", ph = cast.map((_, i) => i * 1.7);
    W.rigs.forEach((r, i) => { if (!cast.includes(i)) r.root.hidden = true; });
    W.excite[0] = mood === "win" ? 1.2 : 0.2;
    s.onUpdate((dt) => {
        const v = s.view, tall = v.height > v.width;
        cast.forEach((id, i) => {
            const [x, z] = spots[i], t = s.time + ph[i], state = mood === "win" ? ST.CELEB : mood === "lose" ? ST.SAD : ST.RUN;
            W.syncGoat(id, { x, y: 0, z, ang: mood === "idle" ? Math.sin(t * 0.4) * 0.9 + 0.5 : 0.2 * (i - 1.5) + 0.1, state, t, speed: mood === "idle" ? Math.max(0, Math.sin(t * 0.7) * 1.2) : 0, charge: 0, charging: false, tumble: 0 }, dt);
        });
        if (mood === "win") W.excite[0] = 1.2;
        W.tick(dt, { ang: 0.6, k: 3 });
        const sway = Math.sin(s.time * 0.2) * 0.5;
        s.cam3.fov = tall ? 44 : 30;
        if (tall) W.setCam(false, sway, 3.4, 17, sway * 0.5, 6.2, 0); else W.setCam(false, sway + 3, 3.2, 18, 3.6 + sway * 0.5, 3.6, 0);
    });
    return W;
}

/** Cream notice pinned behind text. */
const panel = (s, x, y, w, h, o = {}) => s.add([pos(x, y), ui(), { layer: o.layer ?? 5, draw(d) { plank(d, 0, 0, w, h, o.color ?? "#fff3d2", { radius: 12 }); } }]);

function rebuild(s, fn) {
    fn();
    s.on("resize", () => { for (const e of [...s.entities]) if (e.ui) e.destroy(); fn(); });
}

/** Sets up a fixture: league, cup or friendly. */
export function fixture(game, o) {
    const save = loadSave(game), kits = [o.me ?? myClub(save), o.opp];
    const host = o.home === false ? o.opp : kits[0];
    const venueKey = o.venue ?? (host.venue ?? "meadow");
    const mode = o.mode ?? (o.home === false ? o.opp.quirk ?? {} : {});
    const oppSkill = clamp(o.skill, 0, 1);
    // Kit clash: the visitors change into their second strip.
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const far = (p, q) => Math.hypot(...rgb(p).map((v, i) => v - rgb(q)[i]));
    if (far(kits[0].c1, kits[1].c1) < 110) kits[1] = { ...kits[1], id: `${kits[1].id}alt`, c1: kits[1].c2, c2: kits[1].c1 };
    if (far(kits[0].c1, kits[1].c1) < 110) kits[1] = { ...kits[1], id: `${kits[1].id}alt2`, c1: far(kits[0].c1, "#f4efe6") > 200 ? "#f4efe6" : "#20242c", pattern: "plain" };
    game.data.fixture = { kits, skills: [Math.max(oppSkill + 0.14, 0.3), oppSkill], venueKey: mode.mud ? "mud" : venueKey, mode, comp: o.comp, golden: !!o.golden, two: o.two ?? null, duration: 120, seed: undefined, watch: false };
    return game.data.fixture;
}

function nextLeague(game) {
    const save = loadSave(game), S = save.season, i = S.round, g = S.rounds[i].find((x) => x.includes("me")), home = g[0] === "me", oppId = home ? g[1] : g[0], opp = club(oppId, save);
    return { opp, home, skill: TIERS[S.tier].base + (opp.tweak ?? 0) + (S.round / 7) * 0.05 + seasonOffset(save) };
}

const go = (game, n, a, f = 0.25) => game.go(n, a ?? {}, { fade: f });

function playNext(game) {
    const save = loadSave(game);
    if (!save.season) newSeason(save, game);
    const n = nextLeague(game);
    fixture(game, { opp: n.opp, home: n.home, skill: n.skill, comp: "league" });
    go(game, "match");
}

export function registerMenus(game) {
    const snd = game.snd;

    // --- Title -----------------------------------------------------------------------------------
    game.scene("title", (s) => {
        game.touch.enabled = false;
        const save = loadSave(game);
        const kits = [myClubAttract(save), CLUBS[14]];
        const view = new View(game, s, { kits, skills: [0.75, 0.75], venueKey: "sunset", mode: {}, attract: true, seed: 3 + Math.floor(s.rng.range(0, 999)), duration: 9999 });
        const { sim, W } = view;
        sim.o.fast = true;
        const t0 = { v: 0 };
        s.onUpdate((dt) => {
            sim.dt = dt; sim.step(); sim.events.length = 0;
            view.syncLive(dt); W.tick(dt, { ang: 0.6, k: 3 });
            if (sim.phase === "goal") { W.excite[sim.lastGoalTeam] = 1.2; }
            const tall = s.view.height > s.view.width;
            t0.v += dt;
            if (tall) W.camera({ x: sim.ball.x * 0.5, z: sim.ball.z * 0.5, vx: 0, vz: 0 }, dt, { zoom: 1 });
            else W.camera(sim.ball, dt, { zoom: 0.95 });
            W.marker.hidden = W.chev.hidden = W.arrow.hidden = W.mate.hidden = true;
        });
        const first = !save.season && save.best.played === 0;
        if (!first) snd.music("menu");
        const start = () => { snd.music("menu"); if (first) playNext(game); else go(game, "hub"); };
        rebuild(s, () => {
            const v = s.view, tall = v.height > v.width, cx = v.width / 2;
            const logoY = tall ? v.safe.top + v.height * 0.2 : v.height * 0.27;
            s.add([pos(cx, logoY), ui(), { layer: 8, draw(d) { logo(d, s.time, tall ? 1 : 0.9); } }]);
            const by = tall ? v.height * 0.62 : v.height * 0.6, w = tall ? 240 : 230;
            btn(s, game, first ? "KICK OFF" : "PLAY", cx, by, w, 66, start, { color: "#d9483b", size: 32, pulse: true });
            if (!first) {
                const y2 = by + (tall ? 72 : 60), bw = tall ? 112 : 104, gap = bw + 8;
                const items = [["Cup", () => go(game, "cup")], ["Friendly", () => go(game, "friendly")], ["Team", () => go(game, "team")], ["Trophies", () => go(game, "trophies")]];
                if (tall) items.forEach(([n, f], i) => btn(s, game, n, cx + (i % 2 ? gap / 2 : -gap / 2), y2 + Math.floor(i / 2) * 54, bw, 46, f, { color: WOOD, size: 17 }));
                else items.forEach(([n, f], i) => btn(s, game, n, cx + (i - 1.5) * gap, y2, bw, 42, f, { color: WOOD, size: 16 }));
            }
            btn(s, game, "Settings", v.width - v.safe.right - 60, v.safe.top + 30, 104, 48, () => go(game, "settings"), { color: WOOD2, size: 13 });
        });
    });

    // --- Season hub --------------------------------------------------------------------------------
    game.scene("hub", (s) => {
        game.touch.enabled = false;
        const save = loadSave(game);
        if (!save.season) newSeason(save, game);
        const S = save.season;
        backdrop(s, game);
        snd.music("menu");
        rebuild(s, () => {
            const v = s.view, tall = v.height > v.width, cx = v.width / 2;
            const over = S.round >= S.rounds.length;
            const table = sortedTable(S);
            const pW = Math.min(v.width - 20, tall ? 346 : 330), pX = tall ? cx : v.safe.left + pW / 2 + 12, top = v.safe.top + 44;
            topbar(s, game, TIERS[S.tier].name, `Season ${S.year}`);
            const rowH = tall ? 27 : Math.min(25, (v.height - top - 34) / 9);
            s.add([pos(0, 0), ui(), { layer: 6, draw(d) {
                const h = rowH * 9 + 10, y0 = top + h / 2 + 2;
                plank(d, pX, y0, pW, h, "#fff3d2", { radius: 10 });
                const col = [pX - pW / 2 + 20, pX - pW / 2 + 42, pX + pW / 2 - 118, pX + pW / 2 - 90, pX + pW / 2 - 62, pX + pW / 2 - 28];
                ["P", "GD", "", "Pts"].forEach((t, i) => t && d.text(t, { x: [col[2], col[3], col[4], col[5]][i], y: top + 16, size: 12, bold: true, font: FONT, color: "#7a6a50" }));
                table.forEach((r, i) => {
                    const y = top + 16 + (i + 1) * rowH, c = club(r.id, save), me = r.id === "me";
                    if (me) d.rect(pW - 12, rowH - 2, { x: pX, y, color: GOLD, radius: 5 });
                    if (i < TIERS[S.tier].up) d.rect(4, rowH - 6, { x: pX - pW / 2 + 8, y, color: GRASS, radius: 2 });
                    d.text(String(i + 1), { x: col[0], y, size: 13, bold: true, font: FONT, color: INK });
                    d.rect(13, 13, { x: col[1], y, color: c.c1, radius: 3 }); d.rect(13, 4, { x: col[1], y: y + 4.5, color: c.c2 });
                    const nm = c.name.length > 19 ? c.tag : c.name;
                    d.text(nm, { x: col[1] + 12 + nm.length * 3.3, y, size: 13, bold: me, font: FONT, color: INK });
                    d.text(String(r.p), { x: col[2], y, size: 13, font: FONT, color: INK });
                    d.text(String(r.gf - r.ga), { x: col[3], y, size: 13, font: FONT, color: INK });
                    d.text(String(r.pts), { x: col[5], y, size: 14, bold: true, font: FONT, color: INK });
                });
            } }]);
            const nextX = tall ? cx : Math.min(v.width - v.safe.right - 148, pX + pW / 2 + 148), nw = Math.min(280, tall ? v.width - 30 : v.width - pW - 54);
            const nextY = tall ? top + rowH * 9 + 90 : v.height * 0.42;
            if (!over) {
                const n = nextLeague(game), hm = n.home;
                panel(s, nextX, nextY - 26, nw, 76);
                label(s, `Round ${S.round + 1} of ${S.rounds.length}`, nextX, nextY - 52, 14, "#3a2c1c");
                label(s, `${hm ? "Home to" : "Away at"} ${n.opp.name}`, nextX, nextY - 28, 20, INK, { maxWidth: nw });
                const quirk = !hm && n.opp.quirk ? (n.opp.quirk.mud ? "Their pitch is a bog" : n.opp.quirk.wind ? "It blows a gale up there" : n.opp.quirk.farmer ? "Farmer's field, farmer's rules" : "Sheep have grazing rights") : "";
                if (quirk) label(s, quirk, nextX, nextY - 6, 13, "#7a3a20");
                btn(s, game, "PLAY", nextX, nextY + 40, nw, 62, () => playNext(game), { color: RED, size: 28, pulse: true });
            } else {
                seasonEnd(s, game, S, table, nextX, nextY, nw);
            }
        });
    });

    function seasonEnd(s, game, S, table, x, y, w) {
        const save = loadSave(game), rank = table.findIndex((r) => r.id === "me") + 1, up = TIERS[S.tier].up, title = rank === 1;
        const promoted = up > 0 && rank <= up;
        const line = title ? (S.tier === 2 ? "CHAMPIONS OF THE FELLS!" : "LEAGUE CHAMPIONS!") : promoted ? "PROMOTED!" : `Finished ${rank}${rank === 2 ? "nd" : rank === 3 ? "rd" : "th"}`;
        panel(s, x, y - 34, w, 62);
        label(s, line, x, y - 46, 22, title ? "#b5671c" : INK, { maxWidth: w });
        label(s, S.tier === 2 ? (title ? "The whole county bows to your goats." : "Top spot next time.") : promoted ? `Up to ${TIERS[S.tier + 1].short}` : `Top ${up} go up. Same again.`, x, y - 20, 14, "#3a2c1c", { maxWidth: w });
        btn(s, game, "NEXT SEASON", x, y + 30, w, 58, () => {
            if (!S.settled) {
                S.settled = true;
                save.best.seasons++;
                if (title) { save.best.titles++; save.trophies.push({ name: TIERS[S.tier].short, kind: "league", year: S.year }); }
                if (promoted) save.tier = S.tier + 1;
            }
            newSeason(save, game);
            go(game, "hub");
        }, { color: RED, size: 22, pulse: true });
    }

    function topbar(s, game, title, sub, back = "title") {
        const v = s.view;
        s.add([pos(0, 0), ui(), { layer: 7, draw(d) {
            const y = v.safe.top + 20;
            d.rect(v.width + 4, 40 + v.safe.top * 2, { x: v.width / 2, y: 20, color: WOOD2 });
            d.rect(v.width + 4, 2.5, { x: v.width / 2, y: y + 20, color: INK });
            sign(d, title, v.width / 2, y, 18, CREAM, INK);
            if (sub) d.text(sub, { x: v.width - v.safe.right - 42, y, size: 12, font: FONT, color: "#e8d8b0" });
        } }]);
        btn(s, game, "Back", v.safe.left + 44, v.safe.top + 29, 74, 48, () => go(game, back), { color: WOOD, size: 15, layer: 9 });
    }

    // --- Results ------------------------------------------------------------------------------------
    game.scene("result", (s) => {
        game.touch.enabled = false;
        const save = loadSave(game), r = game.data.result ?? { kits: [myClub(save), CLUBS[0]], score: [0, 0], stats: [{ poss: 1, shots: 0, onTarget: 0, passes: 0, tackles: 0, butts: 0 }, { poss: 1, shots: 0, onTarget: 0, passes: 0, tackles: 0, butts: 0 }], scorers: [], comp: "friendly", args: {} };
        const [a, b] = r.score, won = a > b, drew = a === b, kits = r.kits;
        if (!r.applied) {
            r.applied = true;
            if (!r.two) {
                save.best.played++;
                if (won) { save.best.wins++; save.best.biggestWin = Math.max(save.best.biggestWin, a - b); }
                if (r.comp === "league" && save.season) applyLeague(game, save, a, b);
                if (r.comp === "cup" && save.cup) {
                    if (won) { save.cup.round++; if (save.cup.round >= 3) { save.best.cups++; save.trophies.push({ name: "Golden Bucket", kind: "cup", year: save.best.cups }); r.cupWon = true; save.cup = null; } }
                    else { save.cup = null; r.cupOut = true; }
                }
                writeSave(game);
            }
        }
        snd.music(r.two ? "win" : won ? "win" : "lose");
        backdrop(s, game, { kit: kits[0], other: kits[1], venue: r.args?.venueKey ?? "meadow", mood: won ? "win" : drew ? "idle" : "lose" });
        rebuild(s, () => {
            const v = s.view, tall = v.height > v.width, cx = v.width / 2, top = v.safe.top + (tall ? 36 : 16);
            const headline = r.two ? (a === b ? "HONOURS EVEN" : a > b ? "PLAYER 1 WINS" : "PLAYER 2 WINS") : r.cupWon ? "THE GOLDEN BUCKET!" : won ? "VICTORY!" : drew ? "A DRAW" : r.cupOut ? "KNOCKED OUT" : "DEFEAT";
            s.add([pos(cx, top + 26), ui(), { layer: 8, t: 0, update(dt) { this.t = Math.min(1, this.t + dt * 4); }, draw(d) { const k = 1 + (1 - this.t) * 1.5; d.push(); d.scale(k, k); d.rotate(-0.03); sign(d, headline, 0, 0, Math.min(40, (v.width - 30) / headline.length * 1.55), won ? "#fff" : CREAM, INK, 0.1); d.pop(); } }]);
            const pw = Math.min(v.width - 24, 340), y1 = top + 96;
            s.add([pos(cx, y1), ui(), { layer: 6, draw(d) {
                plank(d, 0, 0, pw, 74, "#fff3d2", { radius: 12 });
                for (const [i, sx] of [[0, -1], [1, 1]]) {
                    const K = kits[i];
                    d.rect(pw / 2 - 58, 30, { x: sx * (pw / 4 + 18), y: -14, color: K.c1, radius: 6 });
                    d.rect(pw / 2 - 58, 6, { x: sx * (pw / 4 + 18), y: 0, color: K.c2 });
                    d.text(K.tag, { x: sx * (pw / 4 + 18), y: -15, size: 17, bold: true, font: FONT, color: "#fff" });
                    d.text(K.name.length > 16 ? K.tag : K.name, { x: sx * (pw / 4 + 18), y: 22, size: 12, bold: true, font: FONT, color: INK });
                }
                d.text(`${a} - ${b}`, { x: 0, y: -2, size: 34, bold: true, font: FONT, color: INK });
                if (r.golden) d.text("golden goal", { x: 0, y: 24, size: 10, font: FONT, color: "#7a6a50" });
            } }]);
            const st = r.stats, poss = st[0].poss / Math.max(0.01, st[0].poss + st[1].poss);
            const rows = [["Possession", `${Math.round(poss * 100)}%`, `${100 - Math.round(poss * 100)}%`], ["Shots", st[0].shots, st[1].shots], ["On target", st[0].onTarget, st[1].onTarget], ["Passes", st[0].passes, st[1].passes], ["Goats bowled", st[0].butts, st[1].butts]];
            const y2 = y1 + 50, rh = tall ? 24 : 18;
            panel(s, cx, y2 + rows.length * rh / 2 + 8, pw, rows.length * rh + 14);
            s.add([pos(cx, 0), ui(), { layer: 6, draw(d) {
                rows.forEach(([n, x, y], i) => {
                    const yy = y2 + i * rh + 10;
                    d.text(String(x), { x: -pw / 2 + 34, y: yy, size: 14, bold: true, font: FONT, color: INK });
                    d.text(n, { x: 0, y: yy, size: 13, font: FONT, color: "#3a2c1c" });
                    d.text(String(y), { x: pw / 2 - 34, y: yy, size: 14, bold: true, font: FONT, color: INK });
                });
            } }]);
            const best = r.scorers.filter((g) => g.team === 0 || r.two).sort((p, q) => q.rating.score - p.rating.score)[0];
            const y3 = y2 + rows.length * rh + 24;
            if (best && tall) { panel(s, cx, y3, pw, 28); label(s, `Goal of the game: ${best.rating.label}`, cx, y3 + 1, 14, "#7a3a20", { layer: 7 }); }
            const nextL = r.two ? "Rematch" : r.comp === "league" ? "On we go" : r.comp === "cup" ? (r.cupWon || r.cupOut ? "Back" : "Next round") : "Again";
            const by = tall ? Math.min(v.height - v.safe.bottom - 50, y3 + 58) : v.height - v.safe.bottom - 38;
            btn(s, game, nextL, cx, by, Math.min(240, v.width - 40), 60, () => {
                if (r.comp === "league") go(game, "hub");
                else if (r.comp === "cup") go(game, "cup");
                else if (r.comp === "friendly") go(game, "match", {});
                else go(game, "title");
            }, { color: RED, size: 26, pulse: true });
            btn(s, game, "Menu", v.safe.left + 44, v.height - v.safe.bottom - 30, 76, 44, () => go(game, "title"), { color: WOOD, size: 14 });
        });
    });

    function applyLeague(game, save, a, b) {
        const S = save.season, games = S.rounds[S.round], rng = game.fxRng, T = S.table;
        for (const g of games) {
            let ga, gb;
            if (g.includes("me")) { const home = g[0] === "me"; ga = home ? a : b; gb = home ? b : a; }
            else {
                const ca = club(g[0], save), cb = club(g[1], save), lam = (k) => { let n = 0, p = Math.exp(-k), s = p; const u = rng.range(0, 1); while (u > s && n < 8) { n++; p *= k / n; s += p; } return n; };
                ga = lam(1.7 + (ca.tweak - cb.tweak) * 6); gb = lam(1.4 + (cb.tweak - ca.tweak) * 6);
            }
            const A = T[g[0]], B = T[g[1]];
            A.p++; B.p++; A.gf += ga; A.ga += gb; B.gf += gb; B.ga += ga;
            if (ga > gb) { A.w++; B.l++; A.pts += 3; } else if (gb > ga) { B.w++; A.l++; B.pts += 3; } else { A.d++; B.d++; A.pts++; B.pts++; }
        }
        S.round++;
    }

    // --- Cup ----------------------------------------------------------------------------------------
    game.scene("cup", (s) => {
        game.touch.enabled = false;
        const save = loadSave(game);
        backdrop(s, game, { venue: "sunset" });
        snd.music("cup");
        rebuild(s, () => {
            const v = s.view, cx = v.width / 2, top = v.safe.top + 56, tall = v.height > v.width;
            topbar(s, game, "The Golden Bucket", "");
            s.add([pos(cx, top + (tall ? 62 : 44)), ui(), { layer: 8, draw(d) { bucket(d, 0, 0, tall ? 1.1 : 0.72, s.time); } }]);
            const y0 = top + (tall ? 140 : 96);
            panel(s, cx, y0 + 16, Math.min(340, v.width - 24), 78);
            if (!save.cup) {
                label(s, "Three rounds. Knockout. Draws go to sudden death.", cx, y0, 15, INK, { maxWidth: Math.min(320, v.width - 40) });
                label(s, `Won ${save.best.cups} so far`, cx, y0 + 34, 14, "#3a2c1c");
                btn(s, game, "ENTER THE CUP", cx, y0 + 84, 260, 60, () => { newCup(save, game); go(game, "cup"); }, { color: RED, size: 22, pulse: true });
            } else {
                const C = save.cup, i = C.round, opp = club(C.opponents[i], save);
                label(s, CUP_ROUNDS[i], cx, y0, 24, "#7a3a20");
                label(s, `v ${opp.name}`, cx, y0 + 30, 20, INK);
                const skill = TIERS[Math.min(2, save.tier)].base + 0.02 + i * 0.04 + (opp.tweak ?? 0);
                btn(s, game, "PLAY", cx, y0 + 84, 240, 60, () => { fixture(game, { opp, home: i < 2, venue: i === 2 ? "sunset" : undefined, skill, comp: "cup", golden: true, mode: {} }); go(game, "match"); }, { color: RED, size: 28, pulse: true });
            }
        });
    });

    // --- Friendly --------------------------------------------------------------------------------------
    game.scene("friendly", (s) => {
        game.touch.enabled = false;
        const save = loadSave(game);
        backdrop(s, game, { venue: "harvest" });
        const st = game.data.friendly ?? (game.data.friendly = { level: save.settings.level ?? 1, mode: 0, opp: 0, two: 0 });
        const pool = CLUBS.filter((_, i) => i % 3 === 0).concat(CLUBS.filter((_, i) => i % 3 !== 0));
        const draw = () => {
            for (const e of [...s.entities]) if (e.ui) e.destroy();
            const v = s.view, cx = v.width / 2, tall = v.height > v.width;
            topbar(s, game, "Friendly", "");
            const top = v.safe.top + 60, gap = tall ? 84 : 76, w = tall ? Math.min(330, v.width - 24) : Math.min(300, v.width / 2 - 16), wide = !tall;
            const col2 = wide ? w + 12 : 0, Lx = wide ? cx - col2 / 2 : cx, Rx = wide ? cx + col2 / 2 : cx;
            const opp = pool[st.opp % pool.length];
            const pick = (name, val, sub, y, x, fn) => {
                panel(s, x, y + 24, w, gap - 8);
                label(s, name, x, y, 12, "#7a6a50");
                btn(s, game, "<", x - w / 2 + 28, y + 28, 46, 42, () => { fn(-1); draw(); }, { color: WOOD, size: 20 });
                btn(s, game, ">", x + w / 2 - 28, y + 28, 46, 42, () => { fn(1); draw(); }, { color: WOOD, size: 20 });
                label(s, val, x, y + (sub ? 22 : 28), 17, INK);
                if (sub) label(s, sub, x, y + 41, 12.5, "#3a2c1c", { bold: false, maxWidth: w - 104 });
            };
            let y = top;
            pick("Difficulty", LEVELS[st.level].name, LEVELS[st.level].blurb, y, Lx, (d) => { st.level = (st.level + d + 4) % 4; save.settings.level = st.level; writeSave(game); });
            y += gap; pick("Madness", MODES[st.mode].name, MODES[st.mode].blurb, y, Lx, (d) => { st.mode = (st.mode + d + MODES.length) % MODES.length; });
            if (wide) y = top - gap + gap; else y += gap;
            pick("Opponent", opp.name, null, wide ? top : y, Rx, (d) => { st.opp = (st.opp + d + pool.length) % pool.length; });
            const twoOK = !s.input.touchMode;
            const modes2 = ["One player", "Two players: versus", "Two players: co-op"];
            if (twoOK) { const ny = wide ? top + gap : y + gap; pick("Players", modes2[st.two], st.two ? "Same keyboard" : null, ny, Rx, (d) => { st.two = (st.two + d + 3) % 3; }); y = ny; }
            const by = Math.min(v.height - v.safe.bottom - 40, (wide ? top + gap * 2 : y + gap) + 28);
            btn(s, game, "KICK OFF", cx, by, 220, 54, () => {
                const m = MODES[st.mode];
                fixture(game, { opp, skill: LEVELS[st.level].skill, comp: "friendly", mode: m.mode, venue: m.venue ?? opp.venue, two: st.two === 1 ? "versus" : st.two === 2 ? "coop" : null });
                go(game, "match");
            }, { color: RED, size: 24, pulse: true });
        };
        draw();
        s.on("resize", draw);
    });

    // --- Team builder -----------------------------------------------------------------------------------
    game.scene("team", (s) => {
        game.touch.enabled = false;
        const save = loadSave(game), t = save.team;
        s.background = ["#8ec6e6", "#f6e6b4"];
        s.light.dir.set(-0.5, -1, -0.4); s.light.sky = color("#8aa0b8"); s.light.ground = color("#5a6a44"); s.light.color = color("#c0b090"); s.light.shadows = true; s.light.shadowRange = 8;
        s.cam3.fov = 26;
        s.add([mesh("box", { color: "#558f3e", size: [60, 1, 60], shadow: false }), pos(0, -0.5, 0)]);
        let rig = null, spin = 0.6;
        const build = () => {
            rig?.root.destroy();
            const k = myClub(save), g = kitGoats(game, k, 0, keyOf(k))[2];
            const root = s.add([dim(3), pos(0, 0, 0), rot(0, spin, 0)]);
            const part = (m, x, y, z) => root.child([mesh(m), pos(x, y, z), rot(0, 0, 0)]);
            part(g.torso, 0, 1.06, 0); part(g.leg, 0.34, 0.92, 0.56); part(g.leg, -0.34, 0.92, 0.56); part(g.leg, 0.34, 0.92, -0.58); part(g.leg, -0.34, 0.92, -0.58);
            rig = { root, head: part(g.heads[3], 0, 1.56, 0.92) };
        };
        const place = () => { const v = s.view, tall = v.height > v.width; if (tall) s.cam3.set([3.4, 3.2, 11], [0, -1.9, 0]); else s.cam3.set([-3, 3, 10.4], [-2.4, 1.1, 0]); };
        s.onUpdate((dt) => { spin += dt * 0.7; if (rig) { rig.root.rot.y = spin; rig.head.rot.x = Math.sin(s.time * 2) * 0.1; } });
        const draw = () => {
            for (const e of [...s.entities]) if (e.ui) e.destroy();
            build(); place();
            const v = s.view, tall = v.height > v.width;
            topbar(s, game, "Your Club", "");
            const k = myClub(save), W2 = tall ? Math.min(340, v.width - 20) : Math.min(340, v.width * 0.54), X = tall ? v.width / 2 : v.safe.left + W2 / 2 + 8;
            let y = tall ? v.height * 0.5 : v.safe.top + 60;
            const rowH = tall ? 44 : Math.min(44, (v.height - y - 12) / 7);
            s.add([pos(X, 0), ui(), { layer: 7, draw(d) { sign(d, k.name, 0, tall ? v.safe.top + 64 : y - 14, 20, CREAM); } }]);
            const nudge = (name, val, fn) => {
                btn(s, game, "<", X - W2 / 2 + 22, y, 40, rowH - 6, () => { fn(-1); writeSave(game); draw(); }, { color: WOOD, size: 17 });
                btn(s, game, ">", X + W2 / 2 - 22, y, 40, rowH - 6, () => { fn(1); writeSave(game); draw(); }, { color: WOOD, size: 17 });
                s.add([pos(X, y), ui(), { layer: 7, draw(d) { plank(d, 0, 0, W2 - 94, rowH - 6, "#fff3d2", { radius: 8 }); d.text(`${name}: ${val}`, { x: 0, y: 1, size: 14, bold: true, font: FONT, color: INK }); } }]);
                y += rowH;
            };
            const wrapI = (i, n) => (i + n) % n;
            nudge("Village", VILLAGES[t.village], (d) => { t.village = wrapI(t.village + d, VILLAGES.length); });
            nudge("Name", CREST_WORDS[t.word], (d) => { t.word = wrapI(t.word + d, CREST_WORDS.length); });
            const swatch = (name, key) => {
                s.add([pos(X, y), ui(), { layer: 7, draw(d) { const n = KIT_COLORS.length, w = (W2 - 8) / n; KIT_COLORS.forEach((c, i) => { const x = -W2 / 2 + 4 + (i + 0.5) * w; if (t[key] === i) d.rect(w, rowH - 8, { x, y: 0, color: INK, radius: 6 }); d.rect(w - 5, rowH - 13, { x, y: 0, color: c, radius: 4 }); }); } },
                    rect(W2, rowH - 6, { color: "#00000000" }), tap((p) => { const px = s.input.pointer.x - (X - W2 / 2 + 4), i = clamp(Math.floor(px / ((W2 - 8) / KIT_COLORS.length)), 0, KIT_COLORS.length - 1); t[key] = i; snd.ui(); writeSave(game); draw(); })]);
                void name; y += rowH;
            };
            swatch("Shirt", "c1"); swatch("Trim", "c2");
            nudge("Pattern", t.pattern, (d) => { t.pattern = PATTERNS[wrapI(PATTERNS.indexOf(t.pattern) + d, PATTERNS.length)]; });
            nudge("Horns", HORNS[t.horns], (d) => { t.horns = wrapI(t.horns + d, HORNS.length); });
            nudge("Fur", FUR_NAMES[t.fur], (d) => { t.fur = wrapI(t.fur + d, FUR_NAMES.length); });
        };
        draw();
        s.on("resize", draw);
    });

    // --- Trophies ---------------------------------------------------------------------------------------
    game.scene("trophies", (s) => {
        game.touch.enabled = false;
        const save = loadSave(game), B = save.best;
        backdrop(s, game);
        s.background = ["#5a3c22", "#7a5230"];
        rebuild(s, () => {
            const v = s.view, cx = v.width / 2, tall = v.height > v.width;
            topbar(s, game, "Trophy Room", "");
            const top = v.safe.top + 60;
            const list = save.trophies ?? [];
            s.add([pos(0, 0), ui(), { layer: 6, draw(d) {
                const w = Math.min(v.width - 24, 420), h = 104;
                plank(d, cx, top + h / 2, w, h, "#4a3220", { radius: 10 });
                if (!list.length) { d.text("Empty shelf. For now.", { x: cx, y: top + h / 2, size: 16, font: FONT, color: "#c8b48a" }); }
                list.slice(-6).forEach((t, i) => {
                    const x = cx - w / 2 + 42 + i * ((w - 40) / 6), y = top + 42;
                    bucket(d, x, y, 0.5, s.time + i, t.kind === "league" ? "#c9d4e0" : GOLD);
                    d.text(t.name.split(" ")[0], { x, y: y + 44, size: 10, bold: true, font: FONT, color: CREAM });
                });
                plank(d, cx, top + h + 40, Math.min(v.width - 24, 420), 64, "#4a3220", { radius: 10 });
                const stats = [["Played", B.played], ["Wins", B.wins], ["Goals", B.goals], ["Titles", B.titles], ["Cups", B.cups]];
                stats.forEach(([n, val], i) => {
                    const x = cx + (i - 2) * Math.min(68, (v.width - 20) / 5), y = top + h + 34;
                    d.text(String(val), { x, y, size: 24, bold: true, font: FONT, color: GOLD });
                    d.text(n, { x, y: y + 20, size: 11, font: FONT, color: CREAM });
                });
            } }]);
            let y = top + 104 + 92;
            const reel = save.reel ?? [];
            panel(s, cx, y, 300, 30, { color: "#4a3220" });
            label(s, reel.length ? "Goals of a lifetime" : "Your best goals will play here", cx, y + 1, 15, CREAM);
            y += 34;
            reel.forEach((c, i) => { btn(s, game, `${c.label}`, cx, y + i * (tall ? 60 : 50), Math.min(320, v.width - 30), tall ? 52 : 44, () => go(game, "reel", { i }), { color: GRASS, size: 16, sub: `${c.dist}m v ${c.vs}` }); });
        });
    });

    game.scene("reel", (s, args) => {
        game.touch.enabled = false;
        const save = loadSave(game), c = save.reel?.[args.i ?? 0];
        if (!c) { go(game, "trophies"); return; }
        const kits = c.kits, view = new View(game, s, { kits, skills: [0.5, 0.5], venueKey: c.venue, mode: { mud: c.mud }, seed: 1, duration: 120 });
        const fr = decodeClip(c.data);
        const start = () => { player = new Player(fr, view, { side: 1 }); };
        let player = null; start();
        snd.crowdOn(); snd.music("menu");
        s.onUpdate((dt) => {
            view.W.tick(dt, { ang: 0.5, k: 3 });
            view.W.excite[0] = 1;
            if (player.step(dt, view.W)) start();
            snd.crowdTick(dt, 0.7);
            if (s.input.pointer.tapped) { snd.crowdOff(); go(game, "trophies"); }
        });
        s.on("leave", () => snd.crowdOff());
        s.onDrawUI((d) => {
            const v = s.view;
            d.rect(v.width, 46, { x: v.width / 2, y: 23, color: "#14100a" }); d.rect(v.width, 46, { x: v.width / 2, y: v.height - 23, color: "#14100a" });
            sign(d, c.label, v.width / 2, 24, 20, GOLD);
            d.text(`${c.dist}m v ${c.vs}   tap to go back`, { x: v.width / 2, y: v.height - 23, size: 13, font: FONT, color: CREAM });
        });
    });

    // --- Settings ---------------------------------------------------------------------------------------
    game.scene("settings", (s) => {
        game.touch.enabled = false;
        const save = loadSave(game), c = save.settings;
        backdrop(s, game);
        const draw = () => {
            for (const e of [...s.entities]) if (e.ui) e.destroy();
            const v = s.view, cx = v.width / 2;
            topbar(s, game, "Settings", "");
            let y = v.safe.top + 88;
            const flip = (lab, key) => { btn(s, game, `${lab}: ${c[key] ? "on" : "off"}`, cx, y, 240, 54, () => { c[key] = !c[key]; writeSave(game); snd.apply(); if (key === "music" && c.music) snd.music("menu"); if (key === "haptics" && c.haptics) game.haptic("medium"); draw(); }, { color: c[key] ? GRASS : WOOD, size: 19 }); y += 64; };
            flip("Music", "music"); flip("Sound", "sfx"); flip("Haptics", "haptics");
        };
        draw();
        s.on("resize", draw);
    });
}

function myClubAttract(save) { return save.best.played ? myClub(save) : CLUBS[7]; }

/** Painted logo. */
export function logo(d, t, k) {
    d.push(); d.scale(k, k); d.rotate(-0.035);
    const y0 = Math.sin(t * 1.6) * 2;
    sign(d, "GOAT", 0, -30 + y0, 76, "#ffcf3f", INK, 0.11);
    sign(d, "SOCCER", 0, 30 + y0, 54, "#fff6e0", INK, 0.12);
    d.pop();
    d.push(); d.scale(k, k);
    plank(d, 0, 76 + y0 * 0.5, 212, 28, RED, { radius: 6 });
    d.text("HEADBUTTING IS LEGAL", { x: 0, y: 77 + y0 * 0.5, size: 13.5, bold: true, font: FONT, color: CREAM });
    d.pop();
}

/** The Golden Bucket. */
function bucket(d, x, y, k, t, col = GOLD) {
    d.push(); d.translate(x, y); d.scale(k, k);
    d.poly([[-30, -30], [30, -30], [22, 34], [-22, 34]], { color: INK });
    d.poly([[-26, -27], [26, -27], [19, 31], [-19, 31]], { color: col });
    d.poly([[-20, -27], [-6, -27], [-8, 31], [-16, 31]], { color: "#ffffff55" });
    d.rect(62, 8, { y: -30, color: INK, radius: 3 }); d.rect(56, 4, { y: -30, color: "#fff6c0", radius: 2 });
    d.rect(52, 5, { y: 2, color: "#00000030" });
    d.pop();
}

