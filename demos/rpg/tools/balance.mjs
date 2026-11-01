// Fairness proof. 1) Every boss and trainer, against many random legal teams at the expected level: is any fight a hard wall?
// 2) Every Deskmate: does it pull its weight, against its peers and in real boss teams?
import { BEASTS, MOVES } from "../data.js";
import { bossify, makeMon, maxHp } from "../sim.js";
import { FLOORS } from "../story.js";
import { fight } from "./policy.mjs";

const ORDER = ["B1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "B2", "F11", "F12"];
const STARTERS = [["stickle", "foldling", "archivore"], ["pingling", "inboxer", "replyallosaur"], ["snaglet", "redtapir", "bureaucroc"]];
const levels = { B1: 5, F2: 8, F3: 11, F4: 14, F5: 18, F6: 21, F7: 23, F8: 26, F9: 29, F10: 32, B2: 34, F11: 37, F12: 42 };
const rngOf = (s) => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const evolveTo = (sp, lvl) => { let b = BEASTS[sp]; while (b.evo?.lvl && lvl >= b.evo.lvl) b = BEASTS[b.evo.to]; return b.id; };
function pool(upto) {
    const set = new Set();
    for (const id of ORDER) { if (ORDER.indexOf(id) > ORDER.indexOf(upto)) break; for (const w of FLOORS[id].wild ?? []) set.add(w[0]); }
    return [...set];
}
function randomTeam(floor, r, lvl, must) {
    const list = pool(floor), size = Math.min(6, 2 + ORDER.indexOf(floor)), team = [];
    const st = STARTERS[Math.floor(r() * 3)][0]; team.push(must ?? st);
    while (team.length < size) { const c = list[Math.floor(r() * list.length)]; if (!team.includes(c)) team.push(c); }
    return team.map((sp, i) => makeMon(evolveTo(sp, lvl), lvl - (i === 0 ? 0 : Math.floor(r() * 3))));
}
const fights = [];
for (const id of ORDER) for (const [ch, d0] of Object.entries(FLOORS[id].ents ?? {})) { const d = d0; if (d.t === "trainer") fights.push({ floor: id, ch, d }); }
const N = Number(process.argv[2] ?? 40), bad = [];
console.log("fight, level, win% at expected level, win% 3 grades up, avg turns");
for (const { floor, ch, d } of fights) {
    const lvl = levels[floor], res = [0, 0]; let turns = 0;
    for (const [k, up] of [[0, 0], [1, 3]]) for (let n = 0; n < N; n++) {
        const r = rngOf(n * 977 + ch.charCodeAt(0)), team = randomTeam(floor, r, lvl + up);
        const foes = bossify(d.party.map(([sp, l]) => makeMon(sp, l)), d);
        const st = fight(team, foes, { fmt: d.fmt ?? 1, boss: d.boss, ai: d.ai ?? 1, seed: n * 31 + 7, kind: d.boss ? "boss" : "trainer", heals: d.boss ? 3 : 0, healAmt: lvl * 4 });
        if (st.over === "win") res[k]++;
        if (k === 0) turns += st.turn;
    }
    const a = res[0] / N, b = res[1] / N;
    if (d.boss || a < 0.75) console.log(`${d.boss ? "BOSS " : ""}${floor}.${ch} ${d.name}`.padEnd(40), `L${d.party.at(-1)[1]}`, `${Math.round(a * 100)}%`.padStart(5), `${Math.round(b * 100)}%`.padStart(5), (turns / N).toFixed(1));
    if ((d.boss && (a < 0.4 || b < 0.7)) || (!d.boss && a < 0.65)) bad.push(`${floor}.${ch} ${d.name} ${Math.round(a * 100)}/${Math.round(b * 100)}`);
}
// Final boss
{ let wins = 0, up = 0, tt = 0; for (let n = 0; n < N; n++) for (const [k, add] of [[0, 0], [1, 3]]) { const r = rngOf(n * 41 + 1), team = randomTeam("F12", r, 42 + add); const b = makeMon("outofoffice", 45); b.hpx = 3; b.hp = maxHp(b); const st = fight(team, [b], { fmt: 2, boss: "autoreply", ai: 2, seed: n * 3 + 2, kind: "boss", heals: 5, healAmt: 160 }); if (st.over === "win") { if (k) up++; else wins++; } if (!k) tt += st.turn; } console.log("FINAL BOSS", Math.round(wins / N * 100) + "%", Math.round(up / N * 100) + "%", (tt / N).toFixed(1)); }
console.log(bad.length ? "WALLS: " + bad.join("; ") : "No hard walls.");

// Peer round-robin: each species against everything at the same level, by evolution tier.
const ids = Object.keys(BEASTS), tier = (sp) => { const b = BEASTS[sp]; return b.evo ? (Object.values(BEASTS).some((x) => x.evo?.to === sp) ? 1 : 0) : (Object.values(BEASTS).some((x) => x.evo?.to === sp || x.evo?.itemTo === sp) ? 2 : 3); };
const score = {};
for (const a of ids) { const L = BEASTS[a].evo ? 16 : 34; let w = 0, n = 0; for (const b of ids) { if (a === b) continue; if (!!BEASTS[b].evo !== !!BEASTS[a].evo) continue; for (let s = 0; s < 4; s++) { const st = fight([makeMon(a, L)], [makeMon(b, L)], { ai: 2, seed: s * 13 + 5 }); if (st.over === "win") w++; n++; } } score[a] = w / n; }
const sorted = Object.entries(score).sort((x, y) => x[1] - y[1]);
console.log("Weakest in 1v1:", sorted.slice(0, 10).map(([k, v]) => `${k} ${Math.round(v * 100)}`).join(", "));
console.log("Strongest in 1v1:", sorted.slice(-8).map(([k, v]) => `${k} ${Math.round(v * 100)}`).join(", "));

// Team value: does a species raise the win rate against bosses when it replaces a random member?
const bosses = fights.filter((f) => f.d.boss);
const val = {};
for (const sp of ids) {
    let w = 0, base = 0, n = 0, dealt = 0;
    for (const f of bosses) {
        const avail = (() => { const fam = new Set([sp]); for (const [k, b] of Object.entries(BEASTS)) if (b.evo?.to === sp) fam.add(k); return [...fam].some((x) => pool(f.floor).includes(x)); })();
        if (!avail && !["stickle", "pingling", "snaglet", "foldling", "inboxer", "redtapir", "archivore", "replyallosaur", "bureaucroc"].includes(sp)) continue;
        const lvl = levels[f.floor];
        for (let s = 0; s < 8; s++) {
            const r = rngOf(s * 101 + 3);
            const t1 = randomTeam(f.floor, r, lvl), r2 = rngOf(s * 101 + 3), t2 = randomTeam(f.floor, r2, lvl, evolveTo(sp, lvl));
            const mk = () => bossify(f.d.party.map(([x, l]) => makeMon(x, l)), f.d);
            const opts = { fmt: f.d.fmt ?? 1, boss: f.d.boss, ai: f.d.ai ?? 1, seed: s * 17 + 1, kind: "boss", heals: 3, healAmt: lvl * 4 };
            const a = fight(t1, mk(), opts), b = fight(t2, mk(), opts);
            base += a.over === "win" ? 1 : 0; w += b.over === "win" ? 1 : 0; n++;
            dealt += (b.counts.dmgDealt[t2[0].uid] ?? 0) / Math.max(1, Object.values(b.counts.dmgDealt).reduce((p, q) => p + q, 0));
        }
    }
    if (n) val[sp] = { lift: (w - base) / n, share: dealt / n, n };
}
const vs = Object.entries(val).sort((a, b) => a[1].lift - b[1].lift);
console.log("Lowest team lift:", vs.slice(0, 10).map(([k, v]) => `${k} ${(v.lift * 100).toFixed(0)}% (share ${(v.share * 100).toFixed(0)})`).join(", "));
console.log("Highest team lift:", vs.slice(-6).map(([k, v]) => `${k} ${(v.lift * 100).toFixed(0)}%`).join(", "));

// Verdict: every Deskmate must be obtainable, hold its own among peers, and not drag a team down.
const gifts = ["jamothy", "oldfaithful", "thetemp", "outofoffice", "cakeholder", "stickle", "pingling", "snaglet", "namastapler"];
const canGet = new Set(gifts); for (const f of Object.values(FLOORS)) for (const w of f.wild ?? []) canGet.add(w[0]);
for (let i = 0; i < 4; i++) for (const b of Object.values(BEASTS)) if (canGet.has(b.id) && b.evo) { if (b.evo.to) canGet.add(b.evo.to); if (b.evo.itemTo) canGet.add(b.evo.itemTo); }
const missing = ids.filter((x) => !canGet.has(x));
const useless = ids.filter((x) => score[x] < 0.25 || (val[x] && val[x].lift < -0.2));
console.log(`Species ${ids.length}, obtainable ${canGet.size}${missing.length ? ", MISSING " + missing : ""}. ${useless.length ? "USELESS: " + useless.join(", ") : "No useless Deskmate (all >= 25% vs peers, team lift > -20%)."}`);
if (missing.length || useless.length || bad.length) process.exitCode = 1;
