// The Lamplight Club: who you play, how they think, and how thinking stays off the frame.
import { Search } from "./engine.js";

export const CLUB = [
    {
        id: "pip", name: "Pip", short: "Pip", title: "the apprentice, aged seven", blurb: "Grabs anything shiny. Forgets the rest.",
        think: { spread: true, maxDepth: 1, maxNodes: 4000, style: { noise: 40 } }, temperature: 90, wild: 0.22, loot: 110, music: "calm",
        lines: { hello: ["Can I go first? No? OK.", "I know how the horsey moves!"], take: ["Mine now!", "Yum.", "Got one!"], lose: ["Hey! That was my favourite.", "Oh no. Oh no no."], check: ["Your king's in trouble! I think."], checked: ["Is that bad?"], win: ["I WON? Wait till I tell Aunt Odile!"], loss: ["Good game! Again?"], draw: ["Nobody won. Is that allowed?"] },
    },
    {
        id: "odile", name: "Aunt Odile", short: "Odile", title: "keeper of the biscuit tin", blurb: "Kind, patient, and fond of her knights.",
        think: { spread: true, maxDepth: 2, maxNodes: 16000, style: { noise: 34, knightLove: 12 } }, temperature: 38, wild: 0.06, loot: 20, music: "calm",
        lines: { hello: ["Sit down, dear. Tea's still hot.", "Mind the good pieces."], take: ["Thank you, dear.", "I'll just pop that here."], lose: ["Oh, well played!", "You've been practising."], check: ["Check, dear."], checked: ["Goodness."], win: ["Have a biscuit. You earned it."], loss: ["Well! Pip will want to hear about that."], draw: ["Honours even. Lovely."] },
    },
    {
        id: "vicar", name: "The Vicar", short: "The Vicar", title: "of St Olave-under-Hill", blurb: "Solid pawns, safe king, no sudden moves.",
        think: { maxDepth: 3, maxNodes: 14000, style: { noise: 22, structure: 2, shelter: 16, attack: 2 } }, music: "evening",
        lines: { hello: ["Shall we begin? Quietly, of course.", "Peace be with your pawns."], take: ["Forgive me.", "A small mercy, that."], lose: ["Ah. A trial.", "Patience, patience."], check: ["Check. Forgive me."], checked: ["Ah. Yes, I see."], win: ["Go in peace."], loss: ["A fine sermon, that game."], draw: ["Blessed are the peacemakers."] },
    },
    {
        id: "captain", name: "Captain Harrow", short: "Harrow", title: "retired, and restless", blurb: "All guns at your king. Little behind them.",
        think: { maxDepth: 5, maxNodes: 60000, style: { noise: 14, attack: 16, pawnPush: 5, queenOut: 16, shelter: 3, contempt: 20 } }, music: "evening",
        lines: { hello: ["Run out the guns!", "No quarter at this table."], take: ["Struck her colours!", "Over the side with you!"], lose: ["A scratch!", "Blast your eyes."], check: ["Broadside!"], checked: ["Hah! Bold."], win: ["Strike your flag!"], loss: ["Fairly sunk. Rum?"], draw: ["Becalmed. Bah."] },
    },
    {
        id: "quill", name: "Professor Quill", short: "Quill", title: "emeritus, reads your plans", blurb: "Long diagonals, longer memory.",
        think: { maxNodes: 420000, maxMs: 900, style: { noise: 4, mobility: 5, bishopPair: 46, structure: 1.4 } }, music: "evening",
        lines: { hello: ["An interesting opening awaits us.", "Do take notes."], take: ["As predicted.", "Footnote seven."], lose: ["Curious.", "I shall revise that chapter."], check: ["Check, I believe."], checked: ["Ah. A rejoinder."], win: ["Your thesis was unsound."], loss: ["Remarkable. May I cite this?"], draw: ["An inconclusive study."] },
    },
    {
        id: "clockmaker", name: "The Clockmaker", short: "Clockmaker", title: "no one has seen him lose", blurb: "Every move, wound exactly. The real test.",
        think: { maxMs: 2400, style: {} }, music: "evening",
        lines: { hello: ["Tick.", "Wind your clock."], take: ["A gear removed.", "Tock."], lose: ["...", "Hm."], check: ["Check."], checked: ["Noted."], win: ["The mechanism holds."], loss: ["So. It can stop."], draw: ["Equilibrium."] },
    },
];

export const HINT_THINK = { maxMs: 700, maxNodes: 500000, style: {} };

// A few main lines, so the strong players don't always open alike. Weak players don't use them.
const BOOK = [
    "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6", "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6",
    "e2e4 e7e6 d2d4 d7d5 b1c3 g8f6", "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7",
    "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6", "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4", "c2c4 e7e5 b1c3 g8f6 g1f3 b8c6", "g1f3 d7d5 g2g3 g8f6 f1g2 e7e6",
];

export function bookMove(moves, rng) {
    if (moves.length >= 10) return null;
    const so = moves.join(" "), next = new Set();
    for (const line of BOOK) {
        const m = line.split(" ");
        if (m.length > moves.length && m.slice(0, moves.length).join(" ") === so) next.add(m[moves.length]);
    }
    return next.size ? rng.pick([...next]) : null;
}

/** Choose from a spread of scored root moves the way this character would. */
export function chooseFrom(result, who, rng, capturesFn) {
    const roots = result.roots;
    if (!roots.length) return result.move;
    if (who.wild && rng.chance(who.wild)) return rng.pick(roots).uci;
    const scored = roots.map((r) => ({ uci: r.uci, s: r.score + (who.loot && capturesFn(r.uci) ? who.loot : 0) }));
    // Never turn down mate in one, even small children see that.
    const mate = scored.find((r) => r.s > 20000);
    if (mate) return mate.uci;
    const top = Math.max(...scored.map((r) => r.s)), T = who.temperature ?? 30;
    let total = 0;
    const weights = scored.map((r) => { const w = Math.exp((r.s - top) / T); total += w; return w; });
    let roll = rng.next() * total;
    for (let i = 0; i < scored.length; i++) { roll -= weights[i]; if (roll <= 0) return scored[i].uci; }
    return scored[0].uci;
}

/** Runs searches in a Worker. If there's no Worker, or it dies or stalls, runs them a few ms per step in the frame loop. */
export class Brain {
    constructor() {
        this.mode = "slice";
        this.worker = null;
        this.search = null;
        this.job = null;
        this.nextId = 1;
        this.ready = false;
        this.watchdog = 0;
        if (typeof Worker === "undefined") return;
        if (typeof location !== "undefined" && location.search.includes("noworker")) return;
        try {
            const w = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
            w.onmessage = (e) => this.message(e.data);
            w.onerror = () => this.dropWorker();
            w.onmessageerror = () => this.dropWorker();
            this.worker = w;
            this.mode = "worker";
        } catch {
            this.worker = null;
            this.mode = "slice";
        }
    }

    message(data) {
        if (data.hello) { this.ready = true; return; }
        if (this.job && data.id === this.job.id) this.finish(data.result);
    }

    dropWorker() {
        try { this.worker?.terminate(); } catch { /* already gone */ }
        this.worker = null;
        this.ready = false;
        this.mode = "slice";
        // Whatever was running starts over here.
        if (this.job) this.startSliced(this.job);
    }

    finish(result) {
        const j = this.job;
        this.job = null;
        j?.done(result);
    }

    get busy() { return !!this.job; }

    think(fen, moves, opts, done) {
        this.cancel();
        const job = { id: this.nextId++, fen, moves, opts, done, age: 0 };
        this.job = job;
        if (this.worker) {
            try { this.worker.postMessage({ id: job.id, fen, moves, opts }); } catch { this.dropWorker(); }
        } else this.startSliced(job);
    }

    startSliced(job) {
        this.search ??= new Search(18);
        this.search.start(job.fen, job.moves, job.opts);
    }

    cancel() {
        if (!this.job) return;
        if (this.worker) { try { this.worker.postMessage({ cancel: true }); } catch { /* nothing to cancel */ } }
        this.job = null;
    }

    /** Call every step. budget is how many ms of search one step may spend when working on the main thread. */
    pump(dt, budget = 5) {
        const j = this.job;
        if (!j) return;
        j.age += dt;
        if (this.worker) {
            // A sandbox can create a worker that never answers.
            const limit = (Math.min(j.opts.maxMs ?? 2000, 4000) + 2500) / 1000;
            if ((!this.ready && j.age > 1.5) || j.age > limit) this.dropWorker();
            return;
        }
        if (this.search.run(performance.now() + budget)) this.finish(this.search.result);
    }
}
