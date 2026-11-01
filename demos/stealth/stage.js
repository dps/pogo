// CAT BURGLAR. The night itself: draws the sim, and turns its events into sound, haptics and little theatre.
import { NR, NS, PEOPLE } from "./sim.js";
import { HIGH, T, flagXY, lightAt } from "./world.js";
import { SCALE, THEMES, bakeAlbedo, relight } from "./bake.js";
import { AMBER, CATF, DF, FONT, GF, ICON, INK, MOON, RUST, THEME_INDEX } from "./art.js";
import { SFX } from "./audio.js";

let stash = null;     // the current heist's painted floor, kept between retries
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

const CREAMY = "#f4ead2";
const QUIPS = {
    huh: ["Hm?", "Eh?", "What was...", "Hello?", "Did that move?"],
    noise: ["What was that?!", "Who's there?", "Oi!", "That better not be the Ming."],
    check: ["Better look.", "Going to check.", "Probably nothing...", "Stay calm, Gerald.", "Right. Hm."],
    search: ["Here, kitty?", "Anyone?", "Must be around here.", "I can smell tuna.", "Show yourself!"],
    giveup: ["Must've been the wind.", "Old building.", "I need a holiday.", "Rats, probably.", "Nothing. Good."],
    nothing: ["Nah.", "Just shadows.", "Imagining things."],
    chase: ["THE CAT!", "COME HERE!", "NOT AGAIN!", "STOP! THIEF!", "HEY!"],
    aww: ["Aww, who's this?", "Oh! Hello, you!", "Puss puss puss!", "You're very soft."],
    sneeze: ["Ah... AH... CHOO!"],
    sniff: ["*sniff sniff*"],
    bark: ["WOOF! WOOF!"],
};
const OWN = {
    pemberton: { giveup: ["Back to my stool.", "In my day, ghosts knocked."], huh: ["Eh? Who said that?"] },
    gus: { giveup: ["Snack time, then."], search: ["Is that... tuna?"], huh: ["My sandwich?"] },
    hubert: { noise: ["The ARTEFACTS!", "Unacceptable!"], giveup: ["I shall write a memo."], chase: ["A VIOLATION!"] },
    bea: { giveup: ["La la la, nothing here."], huh: ["Lost the tune..."] },
    dolores: { search: ["I know you're here.", "Twenty years on this beat."], giveup: ["This isn't over, cat."], chase: ["GOT YOU NOW!"] },
    chef: { noise: ["MON DIEU!"], chase: ["MY FISH!"], giveup: ["Ze soup, she calls."], search: ["Who touches my sole?"] },
    sarge: { check: ["Fall in, Biscuit."], giveup: ["As you were."], chase: ["TALLY HO!"] },
    milo: { giveup: ["Allergies, I bet."] },
};

/** What they mutter on rounds, when nothing is wrong. */
const CHATTER = {
    pemberton: ["In my day, carp stayed dead.", "Forty years. Forty.", "Where did I put my tea?", "Mustn't grumble."],
    bea: ["Dum dee dum...", "Da-da-daaa, da da...", "Ooh, this is my favourite bit."],
    gus: ["Mmm. Second breakfast.", "Is it lunch yet?", "This one's got gherkin.", "*chomp*"],
    hubert: ["That frame is crooked.", "One degree. Unforgivable.", "Dust. Dust everywhere.", "Who touched this?"],
    milo: ["*sniff*", "Is there a cat in here?", "My eyes are itching."],
    dolores: ["Something's off.", "It's always the quiet ones.", "Twenty years on this beat."],
    chef: ["More butter.", "Non, non, non.", "Who moved my ladle?", "Ze sauce, she is a liar."],
    sarge: ["Heel, Biscuit.", "Left, right, left.", "Good boy. At ease."],
};

/** Reused array for vision meshes: one tris() call per shade instead of hundreds of polys. */
const mesh = [];
const quadInto = (a, x0, y0, x1, y1, x2, y2, x3, y3) => a.push(x0, y0, x1, y1, x2, y2, x0, y0, x2, y2, x3, y3);

const COLS = {
    patrol: [1.0, 0.68, 0.16], curious: [1.0, 0.76, 0.06], investigate: [1.0, 0.52, 0.04], search: [1.0, 0.52, 0.04], giveup: [0.8, 0.7, 0.3], chase: [1.0, 0.16, 0.12], aww: [1, 0.6, 0.7],
    cam: [1.0, 0.2, 0.2], camHot: [1.0, 0.3, 0.1],
};
const CONE_BANDS = (i) => { const b = Math.min(i, NR - 2 - i); return b < 2 ? 0 : b < 5 ? 1 : 2; };
const BAND_A = [0.34, 0.68, 1];

export class Stage {
    constructor(game, s, sim, audio) {
        this.game = game; this.s = s; this.sim = sim; this.audio = audio;
        this.world = sim.world; this.theme = THEMES[sim.def.theme];
        this.rings = []; this.prints = []; this.says = []; this.floats = []; this.motes = [];
        this.tail = []; for (let i = 0; i < 9; i++) this.tail.push({ x: sim.cat.x, y: sim.cat.y });
        this.walk = 0; this.landT = 0; this.boxWob = 0; this.grabT = -9;
        this.prev = new Map();
        this.lastBox = 0; this.hb = 0; this.hbT = 0; this.tension = 0;
        this.camX = sim.cat.x; this.camY = sim.cat.y;
        this.fishFrame = sim.def.fish ?? 0;
        this.tex = "map_" + sim.def.id;
        if (!game.headless) this.bake();
        for (let i = 0; i < 26; i++) this.motes.push({ x: game.fxRng.range(0, this.world.width), y: game.fxRng.range(0, this.world.height), p: game.fxRng.range(0, 6.28), v: game.fxRng.range(3, 9) });
        this.dangle = 0;
    }

    /** One texture per heist. Retries and "Again" reuse it; only a smashed lamp repaints it. */
    bake() {
        const w = this.world, A = this.game.assets;
        if (stash && stash.tex !== this.tex) { try { A.free(stash.tex); } catch { /* already gone */ } stash = null; }
        if (stash) {
            this.alb = stash.alb; this.pix = stash.pix;
            if (stash.dark) { relight(this.pix, w, this.alb, this.sim.snuffed); A.refresh(this.tex); stash.dark = false; }
            return;
        }
        const alb = bakeAlbedo(w);
        A.paint(this.tex, alb.w, alb.h, (p) => { relight(p.data, w, alb, this.sim.snuffed); this.pix = p.data; }, { smooth: true, mipmaps: false });
        this.alb = alb;
        stash = { tex: this.tex, alb, pix: this.pix, dark: false };
    }

    relit() {
        if (this.game.headless) return;
        relight(this.pix, this.world, this.alb, this.sim.snuffed);
        this.game.assets.refresh(this.tex);
        if (stash) stash.dark = this.sim.snuffed.some((v) => v);
    }

    /** Back to the start of the heist, with no scene change and no repaint unless a lamp died. */
    reset(sim) {
        const wasDark = this.sim.snuffed.some((v) => v);
        this.sim = sim;
        this.rings = []; this.prints = []; this.says = []; this.floats = [];
        for (const t of this.tail) { t.x = sim.cat.x; t.y = sim.cat.y; }
        this.prev.clear(); this.camX = sim.cat.x; this.camY = sim.cat.y; this.grabT = -9; this.hb = 0; this.tension = 0;
        if (wasDark) this.relit();
        this.s.cam.cut([this.camX, this.camY]);
    }

    ipos(k, o) {
        const p = this.prev.get(k), a = this.game.alpha;
        if (!p) return [o.x, o.y];
        return [lerp(p[0], o.x, a), lerp(p[1], o.y, a)];
    }

    /** Keep yesterday's positions for smooth drawing, then run the cosmetics. */
    before() {
        const sim = this.sim;
        this.prev.set("cat", [sim.cat.x, sim.cat.y]);
        for (const g of sim.guards) this.prev.set(g, [g.x, g.y]);
    }

    after(dt, thumb) {
        const sim = this.sim, c = sim.cat, s = this.s;
        for (const ev of sim.events) this.handle(ev);
        sim.events.length = 0;
        // Camera: leads the cat, and sits low on tall screens so the thumb never covers him.
        const v = s.view, portrait = v.height > v.width;
        const leadX = c.vx * 0.32, leadY = c.vy * 0.32;
        const tx = c.x + leadX, ty = c.y + leadY + (portrait ? 56 : 0), k = 1 - Math.exp(-dt * 5);
        this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k;
        const zoom = v.scale > 1.7 ? 0.76 : 1;
        s.cam.zoom = zoom;
        const hw = v.width / 2 / zoom, hh = v.height / 2 / zoom, W = this.world.width, H = this.world.height;
        const cx = W <= hw * 2 ? W / 2 : clamp(this.camX, hw - 16, W - hw + 16), cy = H <= hh * 2 ? H / 2 : clamp(this.camY, hh - 16, H - hh + 60);
        s.cam.pos = [cx, cy];
        // Tail: a chain dragged behind a point on his rump.
        const dirx = Math.cos(c.dir), diry = Math.sin(c.dir), rx = c.x - dirx * 13, ry = c.y - diry * 7 - 12 - this.lift();
        const tt = sim.t, h = this.tail;
        h[0].x = rx; h[0].y = ry;
        for (let i = 1; i < h.length; i++) {
            const up = c.speed > 20 ? 0 : 0.9 * i, wag = Math.sin(tt * (c.running ? 11 : 3.2) - i * 0.7) * (c.running ? 0.5 : 0.75) * i * 0.8;
            const dx = h[i].x - h[i - 1].x + wag - dirx * 0.2, dy = h[i].y - h[i - 1].y - up * 0.45 + 0.15, d = Math.hypot(dx, dy) || 1, L = 4.4;
            h[i].x = h[i - 1].x + (dx / d) * L; h[i].y = h[i - 1].y + (dy / d) * L;
        }
        this.walk += c.speed * dt;
        // Paw prints fade behind him on the way past.
        if (c.mode === "ground" && c.speed > 30) {
            this.printD = (this.printD ?? 0) + c.speed * dt;
            if (this.printD > 15) { this.printD = 0; this.pawSide = !this.pawSide; this.prints.push({ x: c.x - diry * (this.pawSide ? 4 : -4), y: c.y + dirx * (this.pawSide ? 4 : -4), a: c.dir, t: 0 }); if (this.prints.length > 40) this.prints.shift(); }
        }
        for (const p of this.prints) p.t += dt;
        for (const r of this.rings) r.t += dt;
        this.rings = this.rings.filter((r) => r.t < r.life);
        for (const b of this.says) b.t += dt;
        this.says = this.says.filter((b) => b.t < b.life);
        for (const f of this.floats) f.t += dt;
        this.floats = this.floats.filter((f) => f.t < f.life);
        this.landT = Math.max(0, this.landT - dt * 5);
        // Heartbeat: soft in the palm, closer together as suspicion climbs.
        const ten = sim.tension(), rate = ten < 0.06 ? 0 : lerp(1.25, 0.42, ten);
        this.tension += (ten - this.tension) * (1 - Math.exp(-dt * 8));
        if (sim.status === "play" && rate > 0) {
            this.hb -= dt;
            if (this.hb <= 0) { this.hb = rate; this.hbT = 1; this.audio.heart(ten); }
        } else this.hb = Math.min(this.hb, 0.1);
        this.hbT = Math.max(0, this.hbT - dt * 3.5);
        if (c.mode === "box" && c.moved) { this.boxWob += dt * 16; this.lastBox -= dt; if (this.lastBox <= 0) { this.lastBox = 0.26; this.game.sfx(SFX.boxShuffle); } }
        if (c.running && c.speed > 90) { this.runT = (this.runT ?? 0) - dt; if (this.runT <= 0) { this.runT = 0.15; this.game.sfx(SFX.run); this.game.haptic(5); } }
        this.thumb = thumb;
        // Everyone has something on their mind.
        this.chat = (this.chat ?? 3) - dt;
        if (this.chat <= 0) {
            this.chat = 3.5 + this.game.fxRng.range(0, 4);
            const near = sim.guards.filter((g) => g.kind === "guard" && g.state === "patrol" && g.pose !== "nap" && CHATTER[g.who] && Math.hypot(g.x - c.x, g.y - c.y) < 190);
            if (near.length) { const g = this.game.fxRng.pick(near); this.says = this.says.filter((b) => b.g !== g); this.says.push({ g, text: this.game.fxRng.pick(CHATTER[g.who]), t: 0, life: 2.2, hot: false, soft: true }); }
        }
        for (const g of sim.guards) if (g.pose === "snack" && (this.snackT = (this.snackT ?? 0) - dt) <= 0) {
            this.snackT = 0.7;
            if (Math.hypot(g.x - c.x, g.y - c.y) < 220) { this.game.sfx(SFX.chomp); s.burst({ at: [g.x + 10, g.y - 46], count: 4, color: ["#e8c98a", "#c9975a"], speed: [8, 34], life: [0.2, 0.5], size: [1, 2], gravity: 0.3, dim: 2 }); }
        }
    }

    lift() {
        const c = this.sim.cat;
        if (c.mode === "leap") { const L = c.leap, u = clamp(L.t / L.dur), base = lerp(L.z0 ? 10 : 0, L.z1 ? 10 : 0, u), d = Math.hypot(L.x1 - L.x0, L.y1 - L.y0); return base + Math.sin(u * Math.PI) * (16 + d * 0.28); }
        return c.z ? 10 : 0;
    }

    say(g, key) {
        const own = OWN[g.who]?.[key], list = own && this.game.fxRng.chance(0.65) ? own : QUIPS[key];
        if (!list) return;
        this.says = this.says.filter((b) => b.g !== g);
        this.says.push({ g, text: this.game.fxRng.pick(list), t: 0, life: 1.9, hot: key === "chase" || key === "bark" });
    }

    ring(x, y, r, col, life = 0.7, width = 2.5) { this.rings.push({ x, y, r, col, life, t: 0, width }); }

    handle(ev) {
        const { game, s, sim } = this, g = ev.g !== undefined ? sim.guards[ev.g] : null;
        if (ev.say && g) this.say(g, ev.say);
        switch (ev.type) {
            case "noise": {
                const col = { paw: "#7fd0ff", land: "#7fd0ff", creak: "#ffd27a", smash: "#ff9a5a", bark: "#ff7a5a", alarm: "#ff5a5a", yarn: "#ff9a8a" }[ev.kind] ?? "#fff";
                const heavy = ev.kind === "smash" || ev.kind === "alarm" || ev.kind === "bark";
                this.ring(ev.x, ev.y, ev.radius, col, heavy ? 1.0 : 0.55, heavy ? 3.5 : 2);
                if (heavy) this.ring(ev.x, ev.y, ev.radius * 0.66, col, 0.8, 2.5);
                break;
            }
            case "leap": game.sfx(SFX.leap, { haptic: "tick" }); break;
            case "land": this.landT = 1; game.sfx(SFX.land, { haptic: ev.z0 && !ev.z1 ? "light" : "tick" }); s.burst({ at: [ev.x, ev.y], count: 5, color: ["#8d94b4", "#5a6080"], speed: [12, 36], life: [0.15, 0.32], size: [1.2, 2.4], dim: 2 }); break;
            case "creak": game.sfx(SFX.creak, { haptic: "light" }); this.floats.push({ x: ev.x, y: ev.y - 24, text: "CREEEAK", t: 0, life: 0.9, col: "#ffd27a" }); break;
            case "vent": game.sfx(SFX.vent, { haptic: "light" }); s.burst({ at: [ev.x, ev.y], count: 8, color: ["#6a7088", "#3a4058"], speed: [10, 44], life: [0.2, 0.5], size: [1.4, 3], dim: 2 }); break;
            case "ventout": game.sfx(SFX.ventOut, { haptic: "light" }); s.burst({ at: [ev.x, ev.y], count: 10, color: ["#8a90a8", "#4a5068"], speed: [14, 54], life: [0.2, 0.5], size: [1.4, 3], dim: 2 }); break;
            case "box": game.sfx(ev.in ? SFX.boxIn : SFX.boxOut, { haptic: "light" }); break;
            case "tip": game.sfx(SFX.pat, { haptic: "tick" }); this.tipSeq = { item: sim.items[ev.item], n: 0 }; break;
            case "drop": game.sfx(SFX.fall); break;
            case "smash": {
                game.sfx(SFX.smash, { haptic: "heavy" });
                s.shake(5, 0.28, { haptic: false }); s.freeze(0.06);
                s.burst({ at: [ev.x, ev.y], count: 26, color: ["#f4ead2", "#bcd6ff", "#d3a94f"], speed: [50, 200], life: [0.3, 0.7], size: [1.6, 4], gravity: 0, dim: 2 });
                s.burst({ at: [ev.x, ev.y], count: 12, color: ["#c9c3b0"], speed: [10, 44], life: [0.5, 1.1], size: [3, 7], dim: 2 });
                this.floats.push({ x: ev.x, y: ev.y - 26, text: "SMASH!", t: 0, life: 1.0, col: "#ffb36a", big: true });
                break;
            }
            case "snuff": this.relit(); s.flash("#000000", 0.2); break;
            case "grab":
                game.sfx(SFX.grab, { haptic: "success" }); this.grabT = sim.t; s.freeze(0.09);
                s.burst({ at: [ev.x, ev.y - 14], count: 30, color: ["#ffd76a", "#fff2b8"], speed: [40, 150], life: [0.35, 0.9], size: [1.5, 3.4], dim: 2 });
                this.floats.push({ x: ev.x, y: ev.y - 40, text: "GOT IT! NOW OUT!", t: 0, life: 1.8, col: AMBER, big: true });
                break;
            case "loot":
                game.sfx(SFX.loot, { haptic: "light" });
                s.burst({ at: [ev.x, ev.y - 8], count: 14, color: ["#bfe8ff", "#fff"], speed: [24, 90], life: [0.25, 0.6], size: [1.2, 2.8], dim: 2 });
                break;
            case "guard": {
                const k = ev.say;
                if (k === "huh" || k === "noise") { game.sfx(SFX.huh, { haptic: "tick" }); }
                else if (k === "check") game.sfx(SFX.check);
                else if (k === "giveup") game.sfx(SFX.giveup, { haptic: "tick" });
                else if (k === "sniff") game.sfx(SFX.growl, { haptic: "tick" });
                break;
            }
            case "spotted": game.sfx(SFX.spotted, { haptic: "warn" }); s.flash("#ff2a1a30", 0.22); s.shake(3, 0.2, { haptic: false }); this.audio.alert(true); break;
            case "bark": game.sfx(SFX.bark, { haptic: "warn" }); s.shake(3, 0.2, { haptic: false }); this.audio.alert(true); break;
            case "sneeze": game.sfx(SFX.sneeze, { haptic: "light" }); s.burst({ at: [ev.x, ev.y - 36], count: 10, color: ["#dfe8f4"], speed: [20, 70], life: [0.2, 0.5], size: [1, 2.2], dim: 2 }); break;
            case "alarm": game.sfx(SFX.alarm, { haptic: "error" }); s.flash("#ff2a1a38", 0.3); this.audio.alert(true); break;
            case "rub": game.sfx(SFX.rub, { haptic: [20, 30, 20, 30, 20, 30, 20] }); break;
            case "calm":
                game.sfx(SFX.aww, { haptic: "light" });
                for (let i = 0; i < 5; i++) this.floats.push({ x: g.x + (i - 2) * 9, y: g.y - 26, heart: true, t: -i * 0.09, life: 1.1 });
                break;
            case "aww":
                game.sfx(SFX.aww, { haptic: "light" });
                for (let i = 0; i < 4; i++) this.floats.push({ x: g.x + (i - 1.5) * 11, y: g.y - 44, heart: true, t: -i * 0.1, life: 1.1 });
                break;
            case "wriggle": game.sfx(SFX.wriggle, { haptic: "medium" }); this.floats.push({ x: ev.x, y: ev.y - 30, text: "NINTH LIFE!", t: 0, life: 1.2, col: "#ffd76a", big: true }); s.flash("#ffffff33", 0.15); break;
            case "yarn": game.sfx(SFX.yarn, { haptic: "tick" }); break;
            case "mew": game.sfx(SFX.mew, { haptic: "tick" }); this.floats.push({ x: ev.x + 8, y: ev.y - 34, text: "mew", t: 0, life: 0.8, col: CREAMY }); break;
            case "caught": game.sfx(SFX.caught, { haptic: "error" }); s.shake(4, 0.2, { haptic: false }); break;
            case "won":
                game.sfx(SFX.chime, { haptic: "success" });
                s.burst({ at: [sim.cat.x, sim.cat.y], count: 22, color: ["#7fe0a8", "#fff"], speed: [30, 120], life: [0.3, 0.7], size: [1.4, 3], dim: 2 });
                this.floats.push({ x: sim.cat.x, y: sim.cat.y - 30, text: "Clean getaway", t: 0, life: 1.2, col: "#9ff0c0", big: true });
                break;
        }
    }

    // --- Drawing ----------------------------------------------------------------------------------

    drawWorld(d) {
        const { sim, world: w, game, s } = this, c = sim.cat, t = sim.t;
        const v = s.view, cam = s.cam.pos, z = s.cam.zoom || 1, x0 = cam.x - v.width / 2 / z - 70, x1 = cam.x + v.width / 2 / z + 70, y0 = cam.y - v.height / 2 / z - 70, y1 = cam.y + v.height / 2 / z + 110;
        const seen = (x, y) => x > x0 && x < x1 && y > y0 && y < y1;
        if (game.headless) return;
        d.sprite(this.tex, { x: w.width / 2, y: w.height / 2, width: w.width, height: w.height });
        // Paw prints: a little dust on the floor that gives you away only to the player.
        for (const p of this.prints) {
            const a = clamp(1 - p.t / 2.4) * 0.16;
            if (a > 0) d.circle(2.2, { x: p.x, y: p.y, color: "#d6dcf0", opacity: a });
        }
        for (const sh of sim.shards) d.sprite("shards", { x: sh.x, y: sh.y, frame: sh.kind === "lamp" ? 5 : this.vaseFrame(sh.seed), width: 40, height: 30 });
        this.drawShadows(d, seen);
        d.additive(() => {
            for (const g of sim.guards) {
                if (g.kind === "dog") this.drawNose(d, g);
                else if (g.kind === "spot") { if (seen(g.x, g.y)) this.drawSpot(d, g); }
                else if (Math.abs(g.x - cam.x) < v.width / z + g.range && Math.abs(g.y - cam.y) < v.height / z + g.range) this.drawCone(d, g);
            }
            for (const r of this.rings) {
                const u = r.t / r.life, rad = r.r * (1 - (1 - u) * (1 - u)), a = (1 - u) * 0.75;
                d.circle(rad, { x: r.x, y: r.y, color: r.col, opacity: a, outline: r.width });
            }
            for (const l of w.lanterns) {
                if (sim.snuffed[w.lanterns.indexOf(l)] || !seen(l.x, l.y)) continue;
                const fl = 1 + Math.sin(t * 9 + l.x) * 0.04 + Math.sin(t * 23 + l.y) * 0.03, r = 150 * fl;
                d.sprite("glow", { x: l.x, y: l.y - 22, width: r, height: r, color: this.theme.lamp ? "#ff9a3c" : AMBER, opacity: 0.2 });
                d.sprite("glow", { x: l.x, y: l.y - 22, width: 54, height: 54, color: "#ffd98a", opacity: 0.55 * fl });
            }
        });
        // Everything with feet, back to front.
        const list = [];
        for (const it of sim.items) if (it.state !== "broken" && seen(it.x, it.y)) list.push([it.state === "falling" ? lerp(it.y, it.fy, clamp(it.t / 0.34)) + 8 : it.y + 10, 0, it]);
        for (const l of sim.loot) if (!l.got && seen(l.x, l.y)) list.push([l.y + 8, 1, l]);
        if (!c.fish) list.push([w.target.y + 10, 2, w.target]);
        for (const b of sim.boxes) if (b !== c.box && seen(b.x, b.y)) list.push([b.y + 6, 3, b]);
        for (let i = 0; i < w.lanterns.length; i++) { const l = w.lanterns[i]; if (!l.onTable && seen(l.x, l.y)) list.push([l.y + 12, 4, l]); }
        for (const st of this.statues()) if (seen(st.x, st.y)) list.push([st.y + 12, 5, st]);
        for (const g of sim.guards) if (g.kind !== "spot" && seen(g.x, g.y)) list.push([g.kind === "cam" ? g.y - 40 : g.y, 6, g]);
        if (c.mode !== "vent" && c.mode !== "escaped") list.push([c.y + (c.z ? 8 : 0), 7, c]);
        if (sim.yarn) list.push([sim.yarn.y, 8, sim.yarn]);
        list.sort((a, b) => a[0] - b[0]);
        for (const [, kind, o] of list) {
            if (kind === 0) this.drawItem(d, o);
            else if (kind === 1) this.drawLoot(d, o);
            else if (kind === 2) this.drawTarget(d, o);
            else if (kind === 3) this.tinted(d, "box", o.x, o.y - 12, { width: 50, height: 50, frame: 0 });
            else if (kind === 4) { this.tinted(d, "lantern", o.x, o.y - 26, { width: 40, height: 80 }, 1); }
            else if (kind === 5) this.tinted(d, "statue", o.x, o.y - 30, { width: 58, height: 102, frame: o.f });
            else if (kind === 6) { if (o.kind === "dog") this.drawDog(d, o); else if (o.kind === "cam") this.drawCam(d, o); else this.drawGuard(d, o); }
            else if (kind === 7) this.drawCat(d);
            else if (kind === 8) { d.sprite("icon", { x: o.x, y: o.y - 4, frame: ICON.yarn, width: 16, height: 16, rot: o.spin }); }
        }
        this.drawLasers(d);
        if (c.mode === "vent") this.drawVentLump(d);
        this.drawExitBeacon(d);
        d.additive(() => {
            for (const m of this.motes) {
                const yy = (m.y + t * m.v) % w.height, xx = m.x + Math.sin(t * 0.5 + m.p) * 14;
                if (!seen(xx, yy)) continue;
                const l = lightAt(w, xx, yy, sim.snuffed);
                if (l > 0.3) d.circle(1.1, { x: xx, y: yy, color: MOON, opacity: 0.42 * l * (0.6 + 0.4 * Math.sin(t * 2 + m.p)) });
            }
        });
        this.drawContext(d);
        for (const f of this.floats) {
            if (f.t < 0) continue;
            const u = f.t / f.life, y = f.y - u * 26;
            if (f.heart) d.sprite("icon", { x: f.x + Math.sin(f.t * 6 + f.x) * 4, y, frame: ICON.heart, width: 14, height: 14, opacity: 1 - u * u });
            else {
                const pop = u < 0.12 ? 0.6 + u / 0.12 * 0.5 : u < 0.22 ? 1.1 - (u - 0.12) : 1;
                d.push(); d.translate(f.x, y); d.scale(pop, pop);
                d.text(f.text, { x: 1, y: 1.5, size: f.big ? 17 : 13, bold: true, color: INK, opacity: 1 - u * u, font: FONT });
                d.text(f.text, { size: f.big ? 17 : 13, bold: true, color: f.col, opacity: 1 - u * u, font: FONT });
                d.pop();
            }
        }
        for (const b of this.says) this.drawSay(d, b);
    }

    statues() {
        if (this._st) return this._st;
        const w = this.world, out = [], f = THEME_INDEX[w.def.theme];
        for (let r = 0; r < w.rows; r++) for (let c = 0; c < w.cols; c++) if (w.chars[r][c] === "Y") out.push({ x: (c + 0.5) * T, y: (r + 0.5) * T, f });
        return (this._st = out);
    }

    /** How lit something is, as a sprite tint. Dark corners keep him just readable. */
    tint(x, y, floor = 0.34) {
        const l = lightAt(this.world, x, Math.min(y + 4, this.world.height - 1), this.sim.snuffed), v = floor + (1 - floor) * Math.min(1, l * 1.3);
        const warm = this.nearLamp(x, y);
        const r = Math.round(255 * clamp(v * (0.76 + warm * 0.3))), g = Math.round(255 * clamp(v * (0.82 + warm * 0.1))), b = Math.round(255 * clamp(v * (1 - warm * 0.3)));
        return [r / 255, g / 255, b / 255, 1];
    }

    nearLamp(x, y) {
        let best = 0;
        const w = this.world;
        for (let i = 0; i < w.lanterns.length; i++) {
            if (this.sim.snuffed[i]) continue;
            const l = w.lanterns[i], d = Math.hypot(l.x - x, l.y - y) / l.radius;
            if (d < 1 && 1 - d > best) best = 1 - d;
        }
        return best;
    }

    tinted(d, name, x, y, o = {}, emissive = 0) {
        d.sprite(name, { x, y, ...o, color: emissive ? "#fff" : this.tint(x, y + (o.height ?? 40) / 2) });
    }

    /** Long noir shadows, thrown away from the moon or the nearest lantern. */
    drawShadows(d, seen) {
        const { sim, world: w } = this, c = sim.cat;
        const [mx0, my0] = w.def.moon ?? [0.45, 1], ml = Math.hypot(mx0, my0), ma = Math.atan2(my0 / ml, mx0 / ml);
        const cast = (x, y, name, frame, wd, ht, flip, power = 1) => {
            let best = 0, ang = ma, l0 = lightAt(w, x, y, sim.snuffed), len = 2.1;
            const moonly = w.moon[Math.floor(y / 4) * w.lw + Math.floor(x / 4)] ?? 0;
            best = moonly * 0.5;
            for (let i = 0; i < w.lanterns.length; i++) {
                if (sim.snuffed[i]) continue;
                const k = w.lanterns[i], dx = x - k.x, dy = y - k.y, dd = Math.hypot(dx, dy);
                if (dd < k.radius && (1 - dd / k.radius) * 0.7 > best) { best = (1 - dd / k.radius) * 0.7; ang = Math.atan2(dy, dx); len = 1.0 + (dd / k.radius) * 1.8; }
            }
            const a = clamp(Math.max(best, l0 * 0.3) * power * 1.2, 0, 0.62);
            if (a < 0.04) return;
            d.push(); d.translate(x, y); d.rotate(ang - Math.PI / 2 + Math.PI); d.scale(1, -len);
            d.sprite(name, { y: ht / 2 - 3, frame, width: wd, height: ht, flipX: flip, color: "#04050e", opacity: a });
            d.pop();
        };
        for (const g of sim.guards) {
            if (g.kind === "cam" || g.kind === "spot" || !seen(g.x, g.y)) continue;
            const [x, y] = this.ipos(g, g);
            if (g.kind === "dog") cast(x, y, "dog", 0, 62, 46, false, 0.9);
            else cast(x, y, "guard_" + g.who, this.guardFrame(g).f, 60, 84, false);
        }
        for (const st of this.statues()) if (seen(st.x, st.y)) cast(st.x, st.y + 8, "statue", st.f, 58, 102, false, 1.1);
        if (c.mode === "ground" || c.mode === "perch" || c.mode === "tip" || c.mode === "rub") { const [x, y] = this.ipos("cat", c); const F = this.catFrame(); cast(x, y, "cat", F.f, 50, 50, F.flip, 1); }
    }

    drawCone(d, g) {
        const sim = this.sim;
        if (sim.blind(g)) return;
        const p = sim.cone(g), stride = (NS + 1) * 2;
        const col = g.kind === "cam" ? (g.s > 0.05 ? COLS.camHot : COLS.cam) : COLS[g.state] ?? COLS.patrol;
        const base = g.kind === "cam" ? 0.16 : g.state === "chase" ? 0.3 : 0.2, r = this.game.renderer;
        const boost = 1 + g.s * 0.8;
        for (let band = 0; band < 3; band++) {
            for (let j = 0; j < NS; j++) {
                mesh.length = 0;
                for (let i = 0; i < NR - 1; i++) {
                    if (CONE_BANDS(i) !== band) continue;
                    const a = i * stride + j * 2, b = a + stride;
                    quadInto(mesh, p[a], p[a + 1], p[b], p[b + 1], p[b + 2], p[b + 3], p[a + 2], p[a + 3]);
                }
                if (!mesh.length) continue;
                const u = j / NS, al = base * boost * BAND_A[band] * (1 - u * u * 0.92);
                r.tris(d.m, mesh, col[0], col[1], col[2], al);
            }
        }
        // A crisp edge, so the shape reads at a glance on a phone.
        mesh.length = 0;
        const lw = 0.7;
        const seg = (x0, y0, x1, y1) => {
            const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy);
            if (l < 0.3) return;
            const nx = -dy / l * lw, ny = dx / l * lw;
            quadInto(mesh, x0 + nx, y0 + ny, x1 + nx, y1 + ny, x1 - nx, y1 - ny, x0 - nx, y0 - ny);
        };
        for (let j = 0; j < NS; j++) {
            const a = j * 2, b = (NR - 1) * stride + j * 2;
            seg(p[a], p[a + 1], p[a + 2], p[a + 3]); seg(p[b], p[b + 1], p[b + 2], p[b + 3]);
        }
        for (let i = 0; i < NR - 1; i++) { const a = i * stride + NS * 2, b = a + stride; seg(p[a], p[a + 1], p[b], p[b + 1]); }
        r.tris(d.m, mesh, col[0], col[1], col[2], 0.3 + g.s * 0.5);
    }

    drawNose(d, g) {
        if (g.state === "calm") return;
        const [x, y] = this.ipos(g, g), t = this.sim.t, R = 2.4 * T;
        const hot = g.state === "bark" || g.state === "chase", col = hot ? "#ff5040" : "#b6e06a";
        d.sprite("glow", { x, y, width: R * 2.5, height: R * 2.5, color: col, opacity: 0.1 + g.growl * 0.2 });
        for (let i = 0; i < 2; i++) {
            const u = ((t * 0.5 + i * 0.5) % 1);
            d.circle(R * (0.5 + u * 0.5), { x, y, color: col, opacity: (1 - u) * (0.22 + g.growl * 0.4), outline: 1.4 });
        }
        d.circle(R, { x, y, color: col, opacity: 0.2 + g.growl * 0.5, outline: 1.2 });
    }

    drawSpot(d, g) {
        const [x, y] = this.ipos(g, g), hot = g.s > 0.05, R = g.rad;
        d.sprite("glow", { x, y, width: R * 3, height: R * 3, color: hot ? "#ff8a60" : "#ffe9b8", opacity: 0.44 });
        d.circle(R, { x, y, color: hot ? "#ff8a60" : "#ffe9b8", opacity: 0.12 });
        d.circle(R, { x, y, color: hot ? "#ff8a60" : "#ffe9b8", opacity: 0.5, outline: 1.6 });
    }

    vaseFrame(seed) { return THEME_INDEX[this.sim.def.theme] + 0 * seed; }

    drawItem(d, it) {
        const f = it.kind === "lamp" ? 5 : this.vaseFrame(it.i), h = flagXY(this.world, it.x, it.y) & HIGH ? 16 : 10;
        if (it.state === "falling") {
            const u = clamp(it.t / 0.34), x = lerp(it.x, it.fx, u), y = lerp(it.y - h, it.fy, u) - Math.sin(u * Math.PI) * 10 + u * u * 4;
            d.circle(9 * (0.4 + u * 0.6), { x: it.fx, y: it.fy + 4, color: "#000", opacity: 0.3 * u });
            this.tinted(d, "vase", x, y - 14, { frame: f, width: 34, height: 46, rot: (it.side ?? 1) * (0.6 + u * 2.6) });
            return;
        }
        let rot = 0, nudge = 0;
        if (it.state === "tipping") {
            // Three slow pats, each worse than the last. The wobble is the joke.
            const u = it.t / 1.05, stage = Math.min(3, Math.floor(u * 3.2)), rest = stage * 0.14;
            const local = (u * 3.2) % 1, wob = Math.sin(local * Math.PI * 3) * (1 - local) * 0.16;
            rot = (rest + wob + (u > 0.9 ? (u - 0.9) * 7 : 0)) * (it.side ?? 1);
            nudge = stage * 2.5 * (it.side ?? 1);
            if (this.tipSeq?.item === it && stage > this.tipSeq.n) {
                this.tipSeq.n = stage;
                this.game.sfx(SFX.tipGlass, { haptic: stage === 3 ? "light" : "tick" });
            }
        }
        const glow = Math.sin(this.sim.t * 3 + it.i) * 0.5 + 0.5, near = Math.hypot(this.sim.cat.x - it.x, this.sim.cat.y - it.y) < 80 && it.state === "still";
        if (near) d.additive(() => d.sprite("glow", { x: it.x, y: it.y - h - 8, width: 54, height: 54, color: "#ffe7b0", opacity: 0.1 + glow * 0.08 }));
        d.push(); d.translate(it.x + nudge, it.y - h + 8); d.rotate(rot);
        d.sprite("vase", { y: -21, frame: f, width: 32, height: 44, color: it.kind === "lamp" ? "#fff" : this.tint(it.x, it.y) });
        d.pop();
    }

    drawLoot(d, l) {
        const bob = Math.sin(this.sim.t * 3 + l.i) * 2, onPerch = flagXY(this.world, l.x, l.y) & 4;
        const y = l.y - (onPerch ? 12 : 3) + bob;
        d.additive(() => d.sprite("glow", { x: l.x, y, width: 44, height: 44, color: "#9fd8ff", opacity: 0.22 }));
        d.sprite("loot", { x: l.x, y, frame: l.i % 4, width: 26, height: 26 });
        const tw = (this.sim.t * 1.3 + l.i * 0.3) % 1;
        d.additive(() => { d.sprite("glow", { x: l.x + 8, y: y - 8, width: 16 * Math.sin(tw * Math.PI), height: 16 * Math.sin(tw * Math.PI), color: "#fff", opacity: 0.8 }); });
    }

    drawTarget(d, p) {
        const t = this.sim.t, bob = Math.sin(t * 2.2) * 2.5, y = p.y - 20 + bob, pulse = 0.5 + 0.5 * Math.sin(t * 3);
        d.additive(() => {
            d.sprite("glow", { x: p.x, y, width: 110 + pulse * 18, height: 110 + pulse * 18, color: "#ffc35a", opacity: 0.26 });
            for (let i = 0; i < 3; i++) {
                const a = t * 0.8 + i * 2.1, r = 22, sz = 8 + Math.sin(t * 4 + i * 2) * 5;
                d.sprite("glow", { x: p.x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.5, width: sz, height: sz, color: "#fff4c8", opacity: 0.8 });
            }
        });
        d.sprite("fish", { x: p.x, y, frame: this.fishFrame, width: 46, height: 31, rot: Math.sin(t * 1.4) * 0.05 });
    }

    guardFrame(g) {
        const c = Math.cos(g.dir), s = Math.sin(g.dir), wf = Math.floor(g.walk / 12) & 3;
        if (g.pose === "nap") return { f: GF.nap, flip: false };
        if (g.state === "giveup") return { f: GF.shrug, flip: false };
        if (g.state === "aww") return { f: GF.hold, flip: false };
        if (g.state === "curious" && g.st < 0.5) return { f: GF.shock, flip: false };
        if (Math.abs(c) >= 0.62) return { f: g.walking ? GF.side + wf : GF.side, flip: c < 0 };
        if (s > 0) return { f: GF.front + (g.walking ? wf & 1 : 0), flip: false };
        return { f: GF.back + (g.walking ? wf & 1 : 0), flip: false };
    }

    drawGuard(d, g) {
        const [x, y] = this.ipos(g, g), F = this.guardFrame(g), name = "guard_" + g.who, t = this.sim.t;
        const bob = g.walking ? Math.abs(Math.sin(g.walk / 12 * Math.PI)) * 2 : Math.sin(t * 1.6 + g.i) * 0.5;
        const sq = g.state === "curious" && g.st < 0.25 ? 1 + (0.25 - g.st) * 0.9 : 1;
        d.rect(34, 11, { x, y: y - 2, color: "#000", radius: 5.5, opacity: 0.36 });
        d.push(); d.translate(x, y + 2); d.scale(1 / Math.sqrt(sq), sq);
        d.sprite(name, { y: -40 - bob, frame: F.f, flipX: F.flip, width: 60, height: 84.5, color: this.tint(x, y, 0.5) });
        d.pop();
        const head = y - 90;
        if (g.pose === "nap") {
            for (let i = 0; i < 3; i++) { const u = (t * 0.55 + i / 3) % 1; d.push(); d.translate(x + 8 + u * 16 + Math.sin(u * 7) * 3, head + 28 - u * 26); d.scale(0.7 + u * 0.6, 0.7 + u * 0.6); d.text("z", { size: 13, bold: true, color: MOON, opacity: 1 - u, font: FONT }); d.pop(); }
            return;
        }
        if (g.state === "aww") return;
        if (g.s > 0.02 || g.state === "chase") this.drawAlarm(d, x, head, g);
        else if (g.who === "bea" && g.walking) {
            for (let i = 0; i < 2; i++) { const u = (t * 0.45 + i * 0.5) % 1; d.text(i ? "♪" : "♫", { x: x + 12 + u * 12 + Math.sin(u * 8) * 3, y: head + 30 - u * 22, size: 11, color: AMBER, opacity: (1 - u) * 0.9 }); }
        }
    }

    drawAlarm(d, x, y, g) {
        const st = g.state, hot = st === "chase", sus = g.s;
        const pop = 1 + Math.max(0, 0.25 - g.st) * 1.6;
        const col = hot ? "#ff4a30" : st === "giveup" ? "#b0b4c8" : sus > 0.6 ? "#ff9a2e" : "#ffd24a";
        d.push(); d.translate(x, y); d.scale(pop, pop);
        d.circle(11, { color: INK, opacity: 0.9 });
        d.text(hot ? "!" : st === "giveup" ? "..." : "?", { y: st === "giveup" ? -2 : 0, size: 18, bold: true, color: col, font: FONT });
        d.pop();
        // Suspicion climbs a little bar under the mark.
        if (!hot) {
            d.rect(26, 4, { x, y: y + 15, color: INK, radius: 2 });
            d.rect(24 * clamp(sus), 2.4, { x: x - 12 + 12 * clamp(sus), y: y + 15, color: col, radius: 1 });
        }
    }

    drawDog(d, g) {
        const [x, y] = this.ipos(g, g), t = this.sim.t, flip = Math.cos(g.dir) < 0;
        let f = g.walking ? DF.walk + (Math.floor(g.walk / 9) & 3) : DF.walk;
        if (g.state === "calm") f = DF.calm + (Math.floor(t * 4) & 1);
        else if (g.state === "bark") f = DF.bark;
        else if (g.growl > 0.05) f = DF.growl;
        d.circle(13, { x, y: y + 1, color: "#000", opacity: 0.3 });
        d.sprite("dog", { x, y: y - 14, frame: f, flipX: flip, width: 62, height: 46.5, color: this.tint(x, y, 0.5) });
        if (g.state === "calm") { const u = (t * 0.5) % 1; d.push(); d.translate(x + 14 + u * 10, y - 22 - u * 16); d.scale(0.8 + u * 0.5, 0.8 + u * 0.5); d.text("z", { size: 13, bold: true, color: MOON, opacity: 1 - u, font: FONT }); d.pop(); }
        else if (g.growl > 0.02 && g.state === "patrol") {
            d.rect(26, 4, { x, y: y - 40, color: INK, radius: 2 });
            d.rect(24 * g.growl, 2.4, { x: x - 12 + 12 * g.growl, y: y - 40, color: "#ff9a2e", radius: 1 });
        }
    }

    drawCam(d, g) {
        const a = this.sim.lookDir(g);
        d.sprite("cctv", { x: g.x, y: g.y - 10, width: 34, height: 25, rot: Math.max(-0.5, Math.min(0.5, Math.cos(a) * 0.5)) });
        if ((this.sim.t * 1.5) % 1 < 0.5 || g.s > 0.05) d.additive(() => d.sprite("glow", { x: g.x, y: g.y - 6, width: 16, height: 16, color: "#ff3030", opacity: 0.9 }));
        if (g.s > 0.02) this.drawAlarm(d, g.x, g.y - 34, g);
    }

    drawLasers(d) {
        const { sim } = this, t = sim.t;
        d.additive(() => {
            for (const l of sim.lasers) {
                const on = l.live, pre = l.off ? ((t + (l.phase ?? 0)) % (l.on + l.off)) : 0, warn = !on && pre > l.on + l.off - 0.6;
                if (on) {
                    const fl = 0.85 + 0.15 * Math.sin(t * 40 + l.i);
                    d.line([l.x0, l.y0], [l.x1, l.y1], { width: 7, color: "#ff2030", opacity: 0.22 * fl });
                    d.line([l.x0, l.y0], [l.x1, l.y1], { width: 1.8, color: "#ff8088", opacity: 0.95 * fl });
                } else if (warn) d.line([l.x0, l.y0], [l.x1, l.y1], { width: 1, color: "#ff5060", opacity: 0.3 + 0.3 * Math.sin(t * 30) });
                d.sprite("glow", { x: l.x0, y: l.y0, width: 20, height: 20, color: "#ff3040", opacity: on ? 0.8 : 0.22 });
                d.sprite("glow", { x: l.x1, y: l.y1, width: 20, height: 20, color: "#ff3040", opacity: on ? 0.8 : 0.22 });
            }
        });
        for (const l of sim.lasers) { d.rect(7, 7, { x: l.x0, y: l.y0, color: "#23252f", radius: 2 }); d.rect(7, 7, { x: l.x1, y: l.y1, color: "#23252f", radius: 2 }); }
    }

    drawVentLump(d) {
        const c = this.sim.cat, [x, y] = this.ipos("cat", c), v = c.vent;
        for (let u = 0.08; u < 1; u += 0.06) {
            const a = 0.28 * (1 - Math.abs(u - v.t / v.dur) * 1.5);
            if (a > 0) d.circle(1.6, { x: lerp(v.x0, v.x1, u), y: lerp(v.y0, v.y1, u), color: "#d6dcf0", opacity: a });
        }
        d.circle(6, { x, y, color: "#d6dcf0", opacity: 0.16 + Math.sin(this.sim.t * 24) * 0.05 });
    }

    drawExitBeacon(d) {
        const { sim, world: w } = this, t = sim.t;
        if (!sim.cat.fish) return;
        const u = (t * 0.8) % 1;
        d.additive(() => {
            d.sprite("glow", { x: w.start.x, y: w.start.y, width: 100, height: 100, color: "#7fe0a8", opacity: 0.3 });
            d.circle(10 + u * 26, { x: w.start.x, y: w.start.y, color: "#7fe0a8", opacity: (1 - u) * 0.8, outline: 2 });
        });
    }

    drawCat(d) {
        const { sim } = this, c = sim.cat, [x, y] = this.ipos("cat", c), lift = this.lift(), t = sim.t;
        if (c.mode === "box") {
            const b = c.box, wob = c.moved ? Math.sin(this.boxWob) * 0.05 : 0, hop = c.moved ? Math.abs(Math.sin(this.boxWob)) * 2 : 0;
            d.sprite("box", { x, y: y - 12 - hop, frame: c.moved ? 0 : 1, width: 50, height: 50, rot: wob, color: this.tint(x, y) });
            void b;
            return;
        }
        const F = this.catFrame(), l = lightAt(this.world, x, y, sim.snuffed), tint = this.tint(x, y, 0.72);
        const running = c.running && c.speed > 90;
        d.additive(() => d.sprite("glow", { x, y: y - 10 - lift, width: 66, height: 66, color: "#6f8fe0", opacity: 0.2 }));
        d.circle(c.mode === "leap" ? 6 + 5 * (1 - lift / 40) : 10, { x, y: y + 2 + (c.z && c.mode !== "leap" ? -6 : 0), color: "#000", opacity: 0.36 });
        // Tail first when he faces us, after when he walks away.
        const tailOver = F.tailOver;
        if (!tailOver) this.drawTail(d, tint);
        d.push(); d.translate(x, y - lift + 5);
        d.scale(1 + this.landT * 0.18, 1 - this.landT * 0.16);
        if (c.mode === "leap") { const u = c.leap.t / c.leap.dur; d.scale(1.08, 0.94); d.rotate((F.flip ? 1 : -1) * lerp(-0.5, 0.5, u) * -1); }
        if (running) d.rotate((F.flip ? 1 : -1) * 0.05 * Math.sin(this.walk * 0.22));
        d.sprite("cat", { y: -19, frame: F.f, flipX: F.flip, width: 50, height: 50, color: tint });
        d.additive(() => d.sprite("cat", { y: -19, frame: F.f, flipX: F.flip, width: 50, height: 50, color: "#7f9cff", opacity: 0.2 }));
        d.pop();
        if (tailOver) this.drawTail(d, tint);
        if (c.fish) this.drawMouthFish(d, x, y - lift, F);
        // In the dark he is two amber eyes and an attitude.
        const dark = clamp(1 - l * 2.2);
        if (dark > 0.02) d.additive(() => {
            d.push(); d.translate(x, y - lift + 5);
            d.sprite("cateyes", { y: -19, frame: F.f, flipX: F.flip, width: 50, height: 50, opacity: 0.55 + dark * 0.45 });
            d.pop();
        });
        if (c.mode === "rub") { const u = (t * 2) % 1; d.sprite("icon", { x: x + 10, y: y - 32 - u * 12, frame: ICON.heart, width: 11, height: 11, opacity: 1 - u }); }
    }

    drawMouthFish(d, x, y, F) {
        const flip = F.flip, dx = F.view === "side" ? (flip ? -21 : 21) : 0, dy = F.view === "side" ? -18 : F.view === "front" ? -14 : -18;
        d.sprite("fish", { x: x + dx, y: y + dy, frame: this.fishFrame, width: 26, height: 17.5, flipX: flip, rot: (flip ? -1 : 1) * 0.5 + Math.sin(this.walk * 0.2) * 0.1, color: this.tint(x, y, 0.5) });
    }

    drawTail(d, tint) {
        const h = this.tail, n = h.length;
        for (let i = 0; i < n - 1; i++) d.line([h[i].x, h[i].y], [h[i + 1].x, h[i + 1].y], { width: 5.6 - i * 0.34, color: "#0e0d18" });
        const c = [0.23 * tint[0] * 1.2, 0.22 * tint[1] * 1.2, 0.32 * tint[2] * 1.2, 1];
        for (let i = 0; i < n - 1; i++) d.line([h[i].x, h[i].y], [h[i + 1].x, h[i + 1].y], { width: 3.6 - i * 0.28, color: c });
    }

    catFrame() {
        const c = this.sim.cat, cos = Math.cos(c.dir), sin = Math.sin(c.dir), step = Math.floor(this.walk / (c.running ? 15 : 9)) & 3, moving = c.speed > 8;
        if (c.mode === "caught") return { f: CATF.dangle, flip: false, view: "front" };
        if (c.mode === "leap") return { f: CATF.leap, flip: cos < 0, view: "side" };
        if (c.mode === "rub") return { f: CATF.rub, flip: cos < 0, view: "side", tailOver: false };
        if (c.mode === "tip") return { f: c.tip > 0.28 ? CATF.paw + (Math.floor(c.tip * 14) & 1) : CATF.stare, flip: cos < 0, view: "side" };
        if (Math.abs(cos) >= 0.58) return { f: moving ? (c.running ? CATF.side : CATF.slink) + step : (this.sim.t % 7 < 1.2 ? CATF.sitSide : CATF.side), flip: cos < 0, view: "side" };
        if (sin > 0) return { f: moving ? CATF.front + step : CATF.sit, flip: false, view: "front", tailOver: false };
        return { f: CATF.back + (moving ? step : 0), flip: false, view: "back", tailOver: true };
    }

    drawContext(d) {
        const { sim } = this, ctx = sim.context();
        this.ctx = ctx;
        if (!ctx || ctx.x === undefined) return;
        const t = sim.t, pulse = 1 + Math.sin(t * 6) * 0.08, frame = { knock: ICON.paw, vent: ICON.vent, box: ICON.box, rub: ICON.heart, leap: ICON.leap }[ctx.type] ?? ICON.paw;
        const lift = ctx.type === "knock" ? 44 : ctx.type === "leap" ? 26 : ctx.type === "rub" ? 62 : 26;
        d.circle(13 * pulse, { x: ctx.x, y: ctx.y - lift, color: INK, opacity: 0.85 });
        d.circle(13 * pulse, { x: ctx.x, y: ctx.y - lift, color: AMBER, opacity: 0.9, outline: 1.6 });
        d.sprite("icon", { x: ctx.x, y: ctx.y - lift, frame, width: 16, height: 16 });
    }

    drawSay(d, b) {
        const g = b.g, [x, y] = this.ipos(g, g), u = b.t / b.life, top = (g.kind === "dog" ? y - 54 : y - 118), pop = u < 0.06 ? 0.7 + u * 5 : 1, a = u > 0.85 ? (1 - u) / 0.15 : 1;
        const w = Math.min(190, b.text.length * 6.9 + 18);
        d.push(); d.translate(x, top); d.scale(pop, pop);
        const fill = b.hot ? RUST : b.soft ? "#c8c9dc" : "#f4ead2";
        d.rect(w, 21, { color: fill, radius: 8, opacity: a });
        d.poly([[-5, 9], [5, 9], [0, 17]], { color: fill, opacity: a });
        d.text(b.text, { y: 0.5, size: 12, bold: true, color: b.hot ? "#fff" : INK, opacity: a, font: FONT });
        d.pop();
    }
}

export { PEOPLE };
