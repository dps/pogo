// A headless player for the sim. Skill sets reaction time, how often it dodges telegraphs and how well it combos.
// Usage: node tools/bot.mjs [seeds]  plays all six stages at three skill levels and prints a table.
import { Sim } from "../sim.js";
import { BTN, DEPTH, DIFFS, ENEMIES, STAGES, WEAPONS } from "../data.js";

export const SKILLS = {
    novice: { react: 26, dodge: 0.4, combo: 0.35, tag: 0.3, special: 0.5, mash: 16, hazards: 0.45 },
    casual: { react: 16, dodge: 0.65, combo: 0.6, tag: 0.5, special: 0.8, mash: 12, hazards: 0.7 },
    good: { react: 10, dodge: 0.88, combo: 0.9, tag: 0.8, special: 1, mash: 8, hazards: 0.9 },
};

export class Bot {
    constructor(sim, skill, seed = 1) { this.s = sim; this.k = skill; let a = seed * 31 + 7; this.r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; this.t = 0; this.pulse = 0; this.threat = null; this.decide = new Map(); this.script = []; this.moveLock = 0; this.mx = 0; this.mz = 0; }
    /** Things that will hurt soon, seen `react` frames late, as a person would. */
    danger() {
        const s = this.s, h = s.hero, k = this.k;
        for (const e of s.enemies) {
            if (e.boss) {
                if (!e.mv || !e.mv.tel) continue;
                if (e.part === 0 && e.mvT === k.react + 0) { const id = e.mvId; if (id === "swat" && Math.abs(e.x - h.x) < e.w + 110 && this.r() < k.dodge) return "dodge"; }
                if (e.part === 1 && e.mvId === "hop" && e.mvT === Math.max(4, e.mv.dur - 14)) { if (Math.hypot(e.bx - h.x, e.bz - h.z) < 110 && this.r() < k.dodge) return "dodge"; }
                continue;
            }
            if (e.st === "tel" && e.t === Math.min(k.react, e.atk.tel - 12) && !e.def.ranged) {
                const near = Math.abs(e.x - h.x) < e.atk.reach + 70 && Math.abs(e.z - h.z) < 44;
                const bomb = e.def.bomb && Math.abs(e.x - h.x) < 120;
                if ((near || bomb) && this.r() < k.dodge) return "dodge";
            }
        }
        for (const z of s.hazards) {
            if (z.type === "lane" && !z.warn && z.t === Math.min(z.tel - 16, k.react + 6) && Math.abs(h.z - z.z) < z.w + 8 && this.r() < k.hazards) { this.laneDodge = true; }
            if (z.type === "ring" && z.r > 0) { const d = Math.hypot(h.x - z.x, (h.z - z.z) * 1.5) - z.r; if (d > 8 && d < 34 && !this.ringSeen?.has(z.id) && this.r() < k.hazards) { (this.ringSeen ??= new Set()).add(z.id); return "jumpring"; } }
            if (z.type === "lane" && z.warn && z.t === Math.min(z.tel - 22, k.react + 8) && Math.abs(h.z - z.z) < 44 && this.r() < k.hazards) { this.dodgeZ = true; }
            if (z.type === "drop" && z.t === Math.min(z.tel - 18, k.react) && Math.hypot(h.x - z.x, (h.z - z.z) * 1.5) < z.r + 14 && this.r() < k.hazards) return "dodge";
        }
        return null;
    }
    target() {
        const s = this.s, h = s.hero; let best = null, bd = 1e9;
        for (const e of s.enemies) {
            if (e.hp <= 0 || e.st === "spawn" || e.st === "held" || e.st === "ko") continue;
            const d = Math.abs(e.x - h.x) + Math.abs(e.z - h.z) * 1.5 + (e.st === "down" ? 150 : 0) + (e.boss ? 0 : -20);
            if (d < bd) { bd = d; best = e; }
        }
        return best;
    }
    step() {
        const s = this.s, h = s.hero, k = this.k; this.t++;
        let m = 0;
        const tap = (bit) => { if (!(s.mask & bit)) m |= bit; };
        const d = this.danger();
        if (this.laneDodge) { this.mz = h.z > 48 ? -1 : 1; if (s.hazards.every((z) => z.type !== "lane" || z.warn)) this.laneDodge = false; }
        if (d === "dodge") { tap(BTN.G); this.hold = 0; }
        if (d === "jumpring") tap(BTN.J);
        // Spend the meter when it's useful or we're in trouble.
        const crowded = s.enemies.filter((e) => e.hp > 0 && Math.abs(e.x - h.x) < 180).length;
        if (s.meter >= 100 && (crowded >= 3 || s.boss || h.hp < h.maxHp * 0.3 || s.meter >= 300) && this.r() < 0.03 * k.special) tap(BTN.S);
        // Tag out when low, or in the middle of a combo if clever.
        const bench = s.other(h);
        if (s.tagCd <= 0 && bench.hp > 0 && (h.hp < h.maxHp * 0.35 && bench.hp > h.hp || s.combo >= 6 && this.r() < 0.01 * k.tag)) tap(BTN.T);
        const t = this.target();
        let mx = 0, mz = 0;
        if (t) {
            const dx = t.x - h.x, dz = t.z - h.z, reach = (t.boss ? t.w + 50 : 72);
            const danger = t.boss && t.mv && t.part === 0 && t.mvId === "swat";
            if (h.st === "grab") { if (this.r() < 0.2) tap(BTN.A); if (h.bonks >= 1) tap(this.r() < 0.5 ? BTN.H : BTN.J); }
            else if (Math.abs(dx) > reach || Math.abs(dz) > 26) {
                mx = Math.abs(dx) > reach * 0.8 ? Math.sign(dx) : 0; mz = Math.abs(dz) > 16 ? Math.sign(dz) : 0;
            } else if (!danger) {
                if (this.t % k.mash === 0) {
                    const combo = this.r() < k.combo;
                    if (t.y > 40 && h.st !== "atk") tap(BTN.A);
                    else if (h.st === "atk" && h.mv && !h.mv.big && combo && +h.mvId.slice(1) >= 2 && this.r() < 0.4) tap(BTN.H);
                    else if ((t.shield > 0 || t.def.armor) && this.r() < 0.4) tap(BTN.H);
                    else tap(BTN.A);
                }
                if (h.st === "atk" && h.conn && h.mv?.launch && combo2(this.r, k)) tap(BTN.J);
            }
        } else if (s.phase === "walk") { mx = 1; mz = 0; if (h.z < 40) mz = 1; else if (h.z > 56) mz = -1; if (this.t % 10 === 0) { for (const p of s.props) if (!p.broken && Math.abs(p.x - h.x) < 90 && Math.abs(p.z - h.z) < 50) { tap(BTN.A); break; } } }
        if (this.laneDodge) mz = this.mz;
        if (this.dodgeZ) { mz = h.z > 48 ? -1 : 1; tap(BTN.G); this.dodgeZ = false; }
        // Food nearby when hurt.
        if (h.hp < h.maxHp * 0.6 || !h.wp) for (const f of s.drops) if (Math.abs(f.x - h.x) < 180 && (WEAPONS[f.kind] ? !h.wp : h.hp < h.maxHp * 0.6)) { mx = Math.sign(f.x - h.x); mz = Math.abs(f.z - h.z) > 10 ? Math.sign(f.z - h.z) : 0; break; }
        if (mx > 0) m |= BTN.R; if (mx < 0) m |= BTN.L; if (mz > 0) m |= BTN.D; if (mz < 0) m |= BTN.U;
        return m;
    }
}
const combo2 = (r, k) => r() < k.combo;

export function playStage(stage, skillName, seed, o = {}) {
    const sim = new Sim({ stage, seed, diff: o.diff ?? DIFFS[0], mode: o.mode ?? "story" }), bot = new Bot(sim, SKILLS[skillName], seed);
    let n = 0;
    const LIMIT = 60 * 60 * 12;
    while (!sim.over && n++ < LIMIT) { sim.step(bot.step()); sim.events.length = 0; }
    const tl = sim.stats.timeline;
    return { win: !!sim.over?.win, timeout: !sim.over, secs: Math.round(sim.tick / 60), hpLeft: sim.team.dot.hp + sim.team.pip.hp, dmg: sim.stats.dmgTaken, score: sim.score, letter: sim.over?.letter, combo: sim.bestCombo, avg: tl.reduce((a, b) => a + b, 0) / Math.max(1, tl.length), peak: sim.stats.peak, stats: sim.stats, ratio: sim.over?.ratio, bossHp: sim.boss ? sim.boss.hp / sim.boss.maxHp : 1, arena: sim.arena };
}

if (process.argv[1]?.endsWith("bot.mjs")) {
    const seeds = +(process.argv[2] ?? 6), diff = process.argv[3] === "spicy" ? DIFFS[1] : DIFFS[0], table = {};
    for (const skill of Object.keys(SKILLS)) {
        console.log(`\n${skill}${diff === DIFFS[1] ? " on extra spicy" : ""}`);
        console.log("stage        win   secs  dmg  avgN peak combo   score  ratio  grades        perf/thr/spc/tag");
        table[skill] = [];
        for (let st = 0; st < STAGES.length; st++) {
            const r = [];
            for (let i = 1; i <= seeds; i++) r.push(playStage(st, skill, i * 13 + st, { diff }));
            const av = (f) => r.reduce((a, x) => a + f(x), 0) / r.length, wins = r.filter((x) => x.win).length;
            table[skill].push({ wins, dmg: av((x) => x.dmg), avg: av((x) => x.avg), peak: Math.max(...r.map((x) => x.peak)), hits: 0 });
            console.log(`${STAGES[st].id.padEnd(11)} ${wins}/${seeds}  ${av((x) => x.secs).toFixed(0).padStart(4)} ${av((x) => x.dmg).toFixed(0).padStart(4)}  ${av((x) => x.avg).toFixed(1)}  ${Math.max(...r.map((x) => x.peak))}  ${av((x) => x.combo).toFixed(0).padStart(4)}  ${av((x) => x.score).toFixed(0).padStart(6)}  ${av((x) => x.ratio ?? 0).toFixed(2)}  ${r.map((x) => x.letter ?? (x.timeout ? "T" : "?")).join("")}  ${av((x) => x.stats.perfects).toFixed(0)}/${av((x) => x.stats.throws).toFixed(0)}/${av((x) => x.stats.specials).toFixed(0)}/${av((x) => x.stats.tags).toFixed(0)}${r.some((x) => !x.win) ? "  lost at boss " + av((x) => x.bossHp).toFixed(2) : ""}`);
        }
    }
    const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
    if (diff === DIFFS[0]) {
        console.log("");
        const c = table.casual, n = table.novice, g = table.good;
        ok(g.every((s) => s.wins >= seeds * 0.9), `the good bot clears every stage at least 9 times in 10: ${g.map((s) => s.wins)} of ${seeds}`);
        ok(c.every((s) => s.wins >= seeds * 0.75), `the casual bot clears every stage at least 3 times in 4: ${c.map((s) => s.wins)} of ${seeds}`);
        ok(n.slice(0, 2).every((s) => s.wins === seeds), `the novice bot never loses the first two stages: ${n.map((s) => s.wins)} of ${seeds}`);
        ok(c.every((s, i) => !i || s.peak >= c[i - 1].peak), `peak crowd only rises: ${c.map((s) => s.peak)}`);
        ok(c.every((s, i) => !i || s.avg >= c[i - 1].avg - 0.25), `average crowd never falls far: ${c.map((s) => s.avg.toFixed(1))}`);
        ok(c.every((s, i) => !i || s.dmg >= c[i - 1].dmg * 0.8), `damage taken ramps: ${c.map((s) => Math.round(s.dmg))}`);
        ok(n[0].dmg < 90, `the first stage is gentle: novice takes ${Math.round(n[0].dmg)} of 340`);
    }
}
