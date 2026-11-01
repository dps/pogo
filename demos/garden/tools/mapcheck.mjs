import { LEVELS, COLS, ROWS, metaFx } from "../data.js";
import { Sim } from "../sim.js";
LEVELS.forEach((l, i) => {
    if (l.map.length !== ROWS || l.map.some((r) => r.length !== COLS)) console.log("BAD SIZE", i + 1, l.map);
    const s = new Sim({ level: i, meta: metaFx({}) });
    console.log(i + 1, l.name, "gates", s.gates.length, "route", s.routes.map((p) => p.length).join(","), s.routes.some((p) => p.length < 3 || s.dist[s.gates[0].i] > 30000) ? "BROKEN" : "");
});
