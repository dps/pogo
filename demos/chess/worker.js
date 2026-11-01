// Runs the search off the main thread. It's the same Search object the frame loop uses when workers are blocked.
import { Search } from "./engine.js";

const search = new Search(20);
let current = 0;

self.onmessage = (e) => {
    const { id, fen, moves, opts, cancel } = e.data;
    if (cancel) { current = 0; return; }
    current = id;
    search.start(fen, moves, opts);
    const step = () => {
        // Short bursts, so that a cancel gets through.
        if (current !== id) return;
        if (search.run(performance.now() + 40)) self.postMessage({ id, result: search.result });
        else setTimeout(step, 0);
    };
    step();
};
self.postMessage({ hello: true });
