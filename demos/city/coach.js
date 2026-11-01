// Teaching. The first game is a guided walk, one idea at a time, with the clock held while the player acts.
// Afterwards `nextAction` keeps suggesting the most useful card, in every scenario.
import { BUILDINGS } from "./data.js";

const near = (sim, a, b) => a.n.includes(b.i) || sim.cells[a.i] === b;

export class Coach {
    constructor(hud, sim, world, game, snd, onDone) {
        Object.assign(this, { hud, sim, w: world, game, snd, onDone });
        this.i = 0; this.t = 0; this.seen = {}; this.done = false;
        sim.t = 9;                     // Bright morning for the first look.
        sim.updateWater();
        this.hall = sim.cells[sim.buildings.find((b) => b.type === "hall").cell];
        this.dock = sim.cells[sim.buildings.find((b) => b.type === "dock").cell];
        // The tile that joins dock to Hall stays free for the Market.
        this.bridge = sim.cells.find((c) => !c.b && c.h >= 1 && near(sim, c, this.hall) && near(sim, c, this.dock));
        hud.allow = new Set();
        hud.hide = { goals: true, gauge: true, date: true, speed: true, food: true };
        hud.startTile = (type) => this.start(type);
        hud.denyTile = () => this.deny();
        this.steps = this.build();
        this.enter();
    }

    get step() { return this.steps[this.i]; }
    get hold() { return !this.done && !this.step.run; }

    /** Best and worst free tiles for a type, ignoring the Market's tile. */
    rank(type) {
        const list = this.hud.candidates.map((q) => this.sim.cells[q.cell]).filter((c) => c !== this.bridge && !c.forest);
        const score = (c) => { const p = this.sim.preview(type, c); return p.delta * 10 + p.stars - (p.atRisk ? 5 : 0); };
        list.sort((a, b) => score(b) - score(a));
        return { best: list[0], worst: list[list.length - 1] };
    }

    build() {
        const { sim, hud } = this;
        const placing = (o) => ({
            enter: () => hud.allow.add(o.type),
            text: () => {
                if (hud.sel !== o.type) return o.tap;
                if (o.first && this.must && hud.tile !== this.must.i) return o.first;
                return o.plonk;
            },
            target: () => {
                if (hud.sel !== o.type) return { card: o.type };
                if (this.must && hud.tile !== this.must.i) return { tile: this.must.i };
                return { btn: "plonk" };
            },
            done: () => sim.count(o.type) >= (o.count ?? 1),
            ...o,
        });
        return [
            placing({
                type: "cottage", tap: "Tap the Cottage", plonk: "Press Plonk!",
                pick: () => { const { best } = this.rank("cottage"); this.must = best; return best; },
            }),
            { text: () => "Plonked! It touches the Hall, so it earned a star", wait: 2.6, enter: () => { this.must = null; hud.deselect(); } },
            placing({
                type: "cottage", count: 2, tap: "Neighbours help. Tap Cottage again",
                first: () => `This spot scores ${this.scoreHere()}. Tap the gold tile`, plonk: () => `${this.scoreHere()}! More stars, more rent. Plonk!`,
                pick: () => { const { best, worst } = this.rank("cottage"); this.must = best; return worst; },
            }),
            { text: () => "See the number on each tile before you build", wait: 2.8, enter: () => { this.must = null; hud.deselect(); } },
            placing({
                type: "market", tap: "The dock is cut off! Tap Market", plonk: "Market here links Dock to Hall. Plonk!",
                pick: () => { this.must = this.bridge; this.showLink = true; return this.bridge; },
            }),
            { text: () => "Linked! Fish can reach the market now", wait: 2.2, enter: () => { this.must = null; this.showLink = false; hud.deselect(); hud.hide.food = false; this.snd.goal(); hud.pop(this.dock.i, "Linked!", { big: 1.3, color: "#b9f2c0", h: 0.8 }); } },
            { run: true, text: () => "Watch the boat bring fish home", until: () => this.seen.catch, target: () => ({ boat: true }) },
            { run: true, text: () => "Fish feed the cottage. Then it pays rent", until: () => this.seen.coin, target: () => ({ pill: "coin" }) },
            placing({
                type: "wood", tap: "Wood runs out. Tap Woodcutter", plonk: "Each tree beside it adds wood. Plonk!",
                pick: () => { hud.refreshCandidates(); const best = hud.candidates.map((q) => sim.cells[q.cell]).filter((c) => !c.forest && c !== this.bridge).sort((a, b) => sim.preview("wood", b).stars - sim.preview("wood", a).stars)[0]; this.must = best; return best; },
            }),
            { run: true, enter: () => { this.must = null; hud.deselect(); hud.hide.gauge = false; this.wet = this.sandCell()?.wet; }, text: () => "The tide moves. Watch the sand", until: () => this.sandCell()?.wet !== this.wet, target: () => ({ tile: this.sandCell()?.i }) },
            { run: true, text: () => (this.sandCell()?.wet ? "Sand floods. Green stays dry" : "Sand dries out, then floods. Green stays dry"), wait: 3.2, target: () => ({ gauge: true }) },
            { text: () => "Your town! Follow the goal at the top", wait: 2.8, enter: () => { hud.hide = {}; hud.allow = null; hud.goalPulse = [1, 1, 1]; } },
        ];
    }

    sandCell() {
        const list = this.sim.cells.filter((c) => c.h === 0 && !c.b);
        return list.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0];
    }

    scoreHere() {
        const v = this.hud.prev?.delta ?? 0;
        return `${v > 0 ? "+" : ""}${v}`;
    }

    start(type) {
        const s = this.step;
        return s.type === type && s.pick ? s.pick()?.i ?? null : null;
    }

    deny() {
        if (!this.must || this.hud.tile === this.must.i) return false;
        this.snd.deny();
        return true;
    }

    enter() {
        this.t = 0;
        this.seen = {};
        this.step.enter?.();
    }

    event(e) {
        if (e.e === "catch") this.seen.catch = true;
        if (e.e === "coin") this.seen.coin = true;
    }

    skip() {
        this.finish();
        this.hud.hide = {}; this.hud.allow = null; this.must = null; this.showLink = false;
        this.hud.startTile = null; this.hud.denyTile = null;
        this.hud.deselect();
    }

    finish() {
        this.done = true;
        this.hud.coach = null;
        this.hud.startTile = null; this.hud.denyTile = null;
        this.onDone();
    }

    update(dt) {
        if (this.done) return;
        this.t += dt;
        const s = this.step, hud = this.hud;
        const label = typeof s.text === "function" ? s.text() : s.text;
        const text = typeof label === "function" ? label() : label;
        hud.coach = { text, n: this.lessons(), of: 6, target: s.target?.() ?? null, link: this.showLink ? [this.dock, this.bridge, this.hall] : null, must: this.must?.i ?? null };
        if (hud.sel && this.painted !== hud.coach.must) { this.painted = hud.coach.must; hud.paintRings(); }
        const over = s.done ? s.done() : s.until ? s.until() : this.t >= s.wait;
        if (over && this.t > 0.15) {
            if (this.i + 1 >= this.steps.length) { this.finish(); return; }
            this.i++;
            this.enter();
        }
    }

    /** Lesson number shown to the player: place, neighbours, link, watch, wood, tide. */
    lessons() {
        return [1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 6, 6][this.i];
    }
}

/** The most useful card right now, and a few words on why. */
export function nextAction(sim) {
    const has = (t) => sim.scn.unlocks.includes(t), n = (t) => sim.count(t);
    if (!n("market") && has("market")) return { card: "market", text: "Fish and grain need a Market" };
    const cut = sim.buildings.find((b) => !b.connected && !b.wrecked && b.type !== "wall");
    if (cut && has("lane")) return { card: "lane", text: `${BUILDINGS[cut.type].name} is cut off: lay a Lane` };
    if (sim.buildings.some((b) => !b.staffed)) return { card: "cottage", text: "Jobs need folk: add a Cottage" };
    if (!n("wood") && has("wood")) return { card: "wood", text: "Get wood: Woodcutter by the trees" };
    if (sim.wood < 4 && has("wood") && n("wood") < 3) return { card: "wood", text: "Wood is low: add a Woodcutter" };
    const fc = sim.forecast;
    if (fc && has("wall") && sim.buildings.some((b) => b.type === "cottage" && sim.safeLevel("cottage", sim.cells[b.cell]) < fc.level)) return { card: "wall", text: "Cottages will flood: plug the gaps" };
    const mouths = n("cottage"), food = n("dock") * 2 + n("farm") * 2;
    if (mouths > food) return { card: has("farm") && sim.seasonIndex !== 3 ? "farm" : "dock", text: "Cottages are hungry: more food" };
    const i = sim.goalDone.indexOf(false), g = sim.scn.goals[i];
    if (!g) return null;
    const pick = { cottages: "cottage", folk: "cottage", cheer: has("garden") ? "garden" : "cottage", sold: "dock", fed: "cottage", earned: "cottage", trawlers: n("yard") ? "dock" : "yard", reclaimed: "wall", ride: "wall", feedStreak: "farm", count: g.kind }[g.type];
    return has(pick) ? { card: pick, text: `For the goal: ${BUILDINGS[pick].name}` } : null;
}
