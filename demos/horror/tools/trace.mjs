import { Sim } from "../sim.js"; import { SKILLS, brain } from "./brain.mjs";
const night = +process.argv[2] || 0, secs = +process.argv[3] || 40, sk = process.argv[4] ?? "bot";
const sim = new Sim({ night, seed: +process.argv[5] || 1 }), think = brain(sim, SKILLS[sk]);
for (let i = 0; i < secs * 60 && sim.status === "play"; i++) {
    const inp = think(1 / 60); sim.tick(1 / 60, inp);
    if (i % 60 === 0) console.log(i / 60, sim.step, sim.current?.label, "p", sim.p.x.toFixed(1), sim.p.z.toFixed(1), "yaw", sim.p.yaw.toFixed(2), "m", inp.mx.toFixed(2), inp.my.toFixed(2), "L", sim.p.light, sim.p.battery.toFixed(0), "pr", sim.prompt?.label, "d", sim.dolls.map((d) => `${d.x.toFixed(0)},${d.z.toFixed(0)}${d.frozen ? "f" : "m"}`).join(" "), sim.danger.toFixed(2));
    sim.ev.length = 0;
}
console.log(sim.status, sim.t.toFixed(1));
