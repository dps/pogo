import { MISSION, unlockedAt } from "../missions.js";
import { newBattle, clone, applyMove, applyAct, endTurn, byId, N } from "../sim.js";
import { solve } from "../solver.js";
const id = process.argv[2], w = +(process.argv[3] ?? 1), kp = process.argv[5]?+process.argv[5]:1;
const m = MISSION[id];
const prefer = ["sarge","doris","gale","lunch","vinnie","plume","kevin","quack"];
const un = unlockedAt(m.index), squad = prefer.filter((k) => un.includes(k)).slice(0, m.squad).map((k) => ({ k, up: {} }));
const s = newBattle(m, squad);
const r = solve(s, { width: w, keep: kp, roots: w });
console.log(r.win, r.state.round, r.state.stats);
const c = clone(s);
const show=(st)=>{ for(let y=0;y<8;y++){let l="";for(let x=0;x<8;x++){const u=st.units.find(u=>u.hp>0&&u.x===x&&u.y===y);l+=u?(u.k[0]+(u.side===1?"!":u.side===0?"+":" ")):(" .~hh#i^v.".slice(0,0)+".,~h#?i^v"[0]+" ").replace(". ",".,~h#i^vh"[st.tiles[y*8+x]]+" ");}console.log(l);} };
r.plan.forEach((turn,i)=>{ console.log("--- round",c.round, c.units.filter(u=>u.side===1&&u.hp>0).map(u=>`${u.k}@${u.x},${u.y} hp${u.hp} ${u.intent?.type??""}${u.intent?.dir??""}`).join(" | ")); show(c);
 for(const a of turn){ c.ev=[]; const u=byId(c,a.id); if(a.mv)applyMove(c,u,a.mv[0],a.mv[1]); if(a.act&&!c.over)applyAct(c,u,a.act[0],a.act[1]); u.acted=true; console.log(u.k,JSON.stringify(a), c.ev.filter(e=>e.t!=="move").map(e=>e.t+(e.n?e.n:"")+(e.how?":"+e.how:"")+(e.id?"#"+byId(c,e.id)?.k:"")).join(" ")); }
 if(!c.over){c.ev=[];endTurn(c);console.log("enemy:",c.ev.filter(e=>["dmg","die","block","bump"].includes(e.t)).map(e=>e.t+(e.n??"")+"#"+byId(c,e.id)?.k).join(" "));}});
console.log(c.over);
