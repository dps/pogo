// Three players for the rules engine. `random` is the floor. `casual` plays like a person glancing at the board:
// it sees the match in front of it, likes goals and specials, and blunders a third of the time. `sharp` looks one
// move ahead through the real resolver, including cascades it could not have predicted; a good adult reaches about this.
import { Match, N, W, H, CANDY, isSpecial } from "../engine.js";

function goalValue(b, before) {
    let v = 0;
    for (const g of b.goals) {
        const a = before.get(g), r = b.remaining(g);
        if (a > 0) v += (a - r) * (g.t === "folk" ? 60 : g.t === "cookie" || g.t === "cage" || g.t === "fudge" ? 12 : g.t === "frost" ? 10 : 6);
    }
    return v;
}
function goalState(b) { const m = new Map(); for (const g of b.goals) m.set(g, b.remaining(g)); return m; }

/** How far down the board the townsfolk have got. Someone who has left counts as past the bottom. */
function folkDepth(b) { let n = b.folkDone * H; for (let i = 0; i < N; i++) if (b.pk[i] === 8) n += (i - i % W) / W; return n; }

export function sharpMove(b, list) {
    const before = goalState(b), depth = folkDepth(b);
    let best = null, top = -1e9;
    for (const [x, y] of list) {
        const t = b.clone();
        t.play(x, y);
        let v = goalValue(t, before) + (t.score - b.score) * 0.002 + t.counts.specials - b.counts.specials + (t.won ? 1000 : 0);
        v += (folkDepth(t) - depth) * 4;
        if (v > top) { top = v; best = [x, y]; }
    }
    return best;
}

function glanceValue(b, [x, y]) {
    let v = b.rnd(4);
    if (isSpecial(b.pk[x]) || isSpecial(b.pk[y])) v += 10;
    b.swapRaw(x, y);
    const needs = b.goals.filter((g) => b.remaining(g) > 0);
    for (const i of [x, y]) if (b.matchAt(i)) {
        const c = b.colourAt(i);
        if (needs.some((g) => g.t === "c" && g.c === c)) v += 5;
        if (needs.some((g) => g.t === "frost") && b.frost[i]) v += 7;
        const pick = (j) => { if (j >= 0 && j < N && b.colourAt(j) === c) { if (b.frost[j] && needs.some((g) => g.t === "frost")) v += 4; if (b.cage[j]) v += 5; } };
        pick(i - 1); pick(i + 1); pick(i - W); pick(i + W);
        v += (H - (i - i % W) / W) * -0.3 + 1.5;   // low matches stir up more
    }
    if (needs.some((g) => g.t === "folk")) {
        // Anyone can see the little person needs the candy under them gone.
        for (const i of [x, y]) if (b.matchAt(i)) { const col = i % W; for (let j = col; j < i; j += W) if (b.pk[j] === 8) v += 9; }
        if (b.pk[y] === 8 && y === x + W) v += 8;   // still swapped here: the townsperson has stepped down
    }
    b.swapRaw(x, y);
    return v;
}

function chompSpot(b) {
    let best = 0, top = -1;
    const needs = b.goals.filter((g) => b.remaining(g) > 0);
    const fr = needs.some((g) => g.t === "frost"), ck = needs.some((g) => g.t === "cookie"), fu = needs.some((g) => g.t === "fudge"), cg = needs.some((g) => g.t === "cage");
    for (let i = 0; i < N; i++) {
        const x0 = i % W, y0 = (i - x0) / W;
        let v = 0;
        for (let y = y0 - 1; y <= y0 + 1; y++) for (let x = x0 - 1; x <= x0 + 1; x++) {
            if (x < 0 || x >= W || y < 0 || y >= H) continue;
            const j = x + y * W;
            if (!b.mask[j]) continue;
            v += 0.2 + (fr && b.frost[j] ? 2 : 0) + (ck && b.cookie[j] ? 2.4 : 0) + (fu && b.fudge[j] ? 2 : 0) + (cg && b.cage[j] ? 2.4 : 0);
        }
        if (v > top) { top = v; best = i; }
    }
    return best;
}

/** Plays one level to its end. Returns the finished board, with `.finaleScore` set after any win. */
export function playLevel(def, seed, style = "casual", o = {}) {
    const b = new Match(def, seed);
    b.quiet = true;
    let turns = 0;
    const onTurn = o.onTurn;
    while (!b.won && !b.lost && turns++ < 400) {
        if (b.chompReady) {
            if (style !== "random") { b.chomp(chompSpot(b)); continue; }
            if (b.moves <= 0) { b.chomp(b.rnd(N)); continue; }
        }
        const list = b.legal();
        if (!list.length) { b.deadlocked = true; break; }
        let mv;
        if (style === "random") mv = list[b.rnd(list.length)];
        else if (style === "casual") {
            if (b.rnd(3) === 0) mv = list[b.rnd(list.length)];
            else { let top = -1e9; for (const m of list) { const v = glanceValue(b, m); if (v > top) { top = v; mv = m; } } }
        } else mv = sharpMove(b, list);
        b.play(mv[0], mv[1]);
        if (onTurn) onTurn(b);
    }
    if (b.won) { b.turnScore = b.score; b.finale(); }
    return b;
}
