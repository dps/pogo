// Screenshot poses for `pogo shot`. usage: node tools/poses.mjs <outdir> [name ...]
import { execFileSync } from "node:child_process";
const out = process.argv[2], want = process.argv.slice(3);
const build = (lv, list, extra = "") => `game.data.quiet=true; game.go('play',{level:${lv}}); game.step(3); const P=game.data.play,s=P.sim; s.pennies=9999; for(const [k,c,r] of ${JSON.stringify(list)}) s.plant(k,c,r); ${extra}`;
const spring = [["gnome", 3, 8], ["gnome", 5, 8], ["bramble", 2, 6], ["bramble", 3, 6], ["bramble", 4, 6], ["bramble", 5, 6], ["hive", 6, 5], ["sprinkler", 4, 4], ["gnome", 3, 3], ["flytrap", 5, 3]];
const summer = [["gnome", 4, 8], ["gnome", 2, 8], ["hive", 6, 7], ["sprinkler", 3, 6], ["compost", 3, 8], ["bramble", 5, 8], ["flytrap", 5, 6], ["scarecrow", 1, 6], ["chime", 7, 6], ["chilli", 5, 5]];
const winter = [["compost", 4, 6], ["chilli", 3, 6], ["hive", 5, 6], ["gnome", 3, 7], ["gnome", 5, 7], ["sprinkler", 4, 8], ["lantern", 2, 4], ["scarecrow", 6, 8], ["flytrap", 4, 5], ["chime", 2, 8]];
const up = "s.upgrade(s.towers[0],'a'); s.upgrade(s.towers[0],'a'); s.upgrade(s.towers[1],'b'); s.upgrade(s.towers[2],'b');";
const send = (n) => "s.sendWave(false);".repeat(n);
const poses = {
    title: { ev: "", steps: 40 },
    path: { ev: "game.go('path')", steps: 30 },
    almanac: { ev: "game.go('almanac')", steps: 30 },
    spring: { ev: build(3, spring, up + send(4) + "s.pennies=320;"), steps: 760 },
    drag: { ev: build(3, spring, up + send(3) + "s.pennies=320;game.step(400);game.input.touchMode=true;const L=P.L;const X=L.tx+L.packW*1.5,Y=L.ty+L.barH+L.packH/2;const tx=P.vx(6.5,7.5),ty=P.vy(6.5,7.5)+L.C*1.25;game.input.pointerEvent('down',7,X,Y);game.step(1);for(let i=1;i<=8;i++){game.input.pointerEvent('move',7,X+(tx-X)*i/8,Y+(ty-Y)*i/8);game.step(1);}"), steps: 2 },
    panel: { ev: build(3, spring, up + "P.select(s.towers[3]);" + send(2)), steps: 300 },
    panel2: { ev: build(3, spring, up + "P.select(s.towers[0]);s.towers[0].tier=2;s.towers[0].branch='a';" + send(2)), steps: 300 },
    boss: { ev: build(7, summer, up + send(9) + "s.pennies=320;"), steps: 1500 },
    bertha: { ev: build(3, spring, up + send(7) + "s.pennies=320;"), steps: 1100 },
    autumn: { ev: build(11, summer, up + send(10) + "s.pennies=320;"), steps: 1200 },
    winter: { ev: build(19, winter, up + send(5) + "s.pennies=620;"), steps: 800 },
    gloop: { ev: build(19, winter, up + send(12) + "s.pennies=620;"), steps: 900 },
    swarm: { ev: build(16, winter, up + send(10) + "s.pennies=620;"), steps: 1100 },
    hero: { ev: build(14, [["gnome", 4, 7], ["gnome", 3, 7], ["hive", 5, 5], ["sprinkler", 2, 5], ["compost", 4, 6], ["chilli", 3, 6], ["flytrap", 5, 6], ["scarecrow", 7, 7], ["lantern", 1, 7], ["chime", 6, 7], ["bramble", 2, 7], ["bramble", 5, 7], ["hive", 3, 5], ["wine", 4, 9]], up + send(7) + "s.pennies=640;"), steps: 880 },
    popup: { ev: build(3, spring, send(3) + "P.setPopup(true);"), steps: 120 },
    pause: { ev: build(3, spring, send(1) + "P.setPause(true);"), steps: 120 },
    win: { ev: build(3, spring, "s.finish('win');"), steps: 150 },
    lose: { ev: build(3, spring, "s.bites=0;s.finish('lose');"), steps: 150 },
};
const devices = { phone: "phone", land: "phone-landscape", desk: "desktop", small: "phone-small", tab: "tablet" };
for (const name of want.length ? want : Object.keys(poses)) {
    const [pose, dev = "phone"] = name.split(":");
    const p = poses[pose];
    execFileSync("node", ["../../bin/pogo.js", "shot", ".", "--device", devices[dev], "--out", `${out}/${pose}-${dev}.png`, "--eval", p.ev, "--steps", String(p.steps)], { stdio: "inherit" });
}
