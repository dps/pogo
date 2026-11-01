// All 27 holes, by hand. v runs forward from the tee, x runs right, y is height above the sea.
// Every hole has one gimmick you can see and one shortcut you have to find; the shell marks it.
import { GRASS, GREEN, ROUGH, SAND, ICE, ROCK, WOOD, LAVA, WATER, SNOW } from "./course.js";

export const ISLANDS = [
    { id: "cove", name: "Coconut Cove", tag: "Sun, sand and something hungry" },
    { id: "frost", name: "Frostbite Fumarole", tag: "Ice on top, fire underneath" },
    { id: "crown", name: "The Molten Crown", tag: "Mind the floor" },
];

const H = (island, name, par, tip, build) => ({ island, name, par, tip, build });

export const HOLES = [
    // ---------- COCONUT COVE ----------
    H(0, "Welcome Mat", 3, "Pull back on the ball and let go", (c) => {
        c.tee(0, 0, 4).cup(0, 18, 4);
        c.rect(0, 7, 9, 18, 4, { mat: GRASS });
        c.pad(0, 18, 5, 4, { dish: 0.5 });
        c.wall([[-4.5, 10], [-2.9, 10]], { h: 0.7 }).wall([[-1.7, 10], [-0.7, 10]], { h: 0.7, mat: 1 }).wall([[0.7, 10], [1.7, 10]], { h: 0.7, mat: 1 }).wall([[2.9, 10], [4.5, 10]], { h: 0.7 });
        c.secret(0, 10, 4.2, { r: 0.7 });
        c.prop("palm", -6.5, 9).prop("palm", 6.5, 13).prop("tiki", 0, -3.6);
    }),
    H(0, "Banana Bend", 3, "Short pulls for short shots", (c) => {
        c.tee(0, 0, 4).cup(19, 21, 4.8);
        c.path([[0, -2, 4], [0, 9, 4], [2.5, 17, 4.3], [10, 21, 4.8], [19, 21, 4.8]], { w: 5.5, bank: 0.08 });
        c.pad(19, 21, 4.4, 4.8);
        c.gap(2.75, 10.5, 1.2).gap(13.8, 18.3, 1.2);
        c.plank(2.1, 10.8, 4.1, 14, 19.4, 4.72, 1.1, { style: "plank", secret: true });
        c.secret(8, 15.1, 4.65);
        c.paint(9, 23, 1.4, ROUGH, { rz: 0.8 });
        c.prop("palm", 6, 11).prop("palm", -3.5, 18).prop("palm", 23, 26);
    }),
    H(0, "Sand Castle", 3, "Stuck behind sand? Tap CHIP to lob over it", (c) => {
        c.tee(0, 0, 4).cup(0, 25, 4);
        c.path([[0, -2, 4], [0, 22, 4]], { w: 8 });
        c.pad(0, 25, 5.5, 4);
        c.paint(0, 13, 4.4, SAND, { rz: 2.3, dip: 0.35 });
        c.paint(-3.2, 22.5, 1.5, SAND, { dip: 0.28 }).paint(3.2, 22.5, 1.5, SAND, { dip: 0.28 });
        c.path([[3.8, 4, 4], [6.7, 8, 4.1], [6.7, 18, 4.1], [3.2, 26, 4]], { secret: true, w: 1.15, rail: true, mat: GREEN });
        c.secret(6.7, 13, 4.3);
        c.wall([[4.1, 9], [4.1, 17]], { h: 0.6, mat: 1 });
        c.prop("castle", 0, 13).prop("palm", -7, 8).prop("palm", 9, 25);
    }),
    H(0, "Hungry Hibiscus", 3, "It's hungry. Feed it while it's open", (c) => {
        c.tee(0, 0, 4).cup(12, 2, 4.5);
        c.path([[0, -2, 4], [0, 17, 4], [2, 22, 4.1], [6, 24, 4.2], [10, 22, 4.3], [12, 17, 4.5], [12, 6, 4.5]], { w: 5 });
        c.pad(12, 3, 4.2, 4.5);
        c.plant(0, 17.5, [11.5, 5, 4.5], { period: 3.2, open: 0.62, flight: 1.5 });
        c.tube(-1.7, 8, 9.6, 8.2, 2.6, { secret: true, speed: 3.5, T: 0.9 });
        c.secret(-1.7, 8, 4.2);
        c.prop("cave", -2.4, 8, { dir: 1.57 }).prop("cave", 9, 8.2, { dir: -1 }).prop("palm", 6, 12).prop("palm", 6, 4);
    }),
    H(0, "Bumper Crop", 3, "Bumpers kick back harder than you hit", (c) => {
        c.tee(0, 0, 4).cup(0, 22, 4);
        c.rect(0, 9, 10, 22, 4, { mat: GRASS });
        c.pad(0, 22, 4.6, 4);
        for (const [x, v] of [[0, 9], [-2.6, 11.4], [2.6, 11.4], [-1.3, 14], [1.3, 14], [-3.8, 8], [3.8, 8], [0, 17.2]]) c.bumper(x, v, { kick: 6 });
        c.path([[5, 2, 4], [7, 4, 4], [7, 18, 4], [3.8, 23, 4]], { secret: true, w: 1.2, mat: GREEN });
        c.gap(5, 2.7, 0.9).gap(4.3, 21, 0.9);
        c.secret(7, 12, 4.3);
        c.prop("palm", -7, 16).prop("palm", -7, 5).prop("tiki", 9.5, 12);
    }),
    H(0, "Kicker Creek", 3, "Hit the ramp hard: the creek eats slow balls", (c) => {
        c.tee(0, 0, 4).cup(-1, 24, 4.2);
        c.rect(0, 8, 13, 20, 4, { mat: GRASS });
        c.path([[0, 17, 4], [-1, 22, 4.2]], { w: 9 });
        c.pad(-1, 24, 4.8, 4.2);
        c.river([[-8, 12.2], [-3, 12.5], [3, 12], [8, 12.2]], 3.4, 3.6, { mat: WATER });
        c.deck(0, 8.6, 4.12, { w: 5, d: 2.4, tilt: 0.28, th: 0.9, style: "ramp" }).jump(0, 10, 0, 15.5);
        c.plank(5.4, 9.8, 4.04, 5.2, 15, 4.04, 0.9, { secret: true });
        c.secret(5.3, 12.4, 4.4);
        c.prop("palm", -8, 6).prop("palm", 8, 20);
    }),
    H(0, "Tide Turner", 3, "The turntable carries the ball. Aim ahead of it", (c) => {
        c.tee(0, 0, 4).cup(0, 24, 4);
        c.path([[0, -2, 4], [0, 7, 4]], { w: 5, flat: true });
        c.path([[0, 17, 4], [0, 22, 4]], { w: 5, flat: true });
        c.pad(0, 24, 4.5, 4);
        c.disc(0, 12, 4, 5.2, 0.8, { mat: GRASS });
        c.path([[-2.4, 1, 4], [-7, 5, 4], [-7.3, 18, 4], [-3.4, 24, 4]], { secret: true, w: 1.1, mat: GREEN });
        c.gap(-2.3, 2.1, 0.9).gap(-3.9, 23.3, 1);
        c.secret(-7.3, 12, 4.3);
        c.prop("palm", 7, 4).prop("palm", 8, 20);
    }),
    H(0, "Coconut Luge", 4, "The banks do the steering", (c) => {
        c.tee(-8, 0, 10).cup(0, 44, 3);
        c.path([[-8, -2, 10], [-8, 8, 9.6], [-2, 15, 8.4], [6, 17, 7.6], [10, 24, 6.2], [4, 30, 5], [-3, 33, 4], [-5, 39, 3.2], [0, 44, 3]], { w: 5, pipe: 0.75 });
        c.pad(0, 44, 4.6, 3);
        c.gap(-6.5, 10.5, 1.3);
        c.plank(-7.2, 10, 8.6, -4.5, 31, 4.3, 1.5, { secret: true });
        c.secret(-6, 20, 7.1);
        c.prop("palm", 2, 8).prop("palm", -6, 26).prop("palm", 13, 20).prop("tiki", -11, 2);
    }),
    H(0, "Snapdragon Showdown", 3, "Two mouths, one bridge. Choose your lunch", (c) => {
        c.tee(0, 0, 4).cup(-2, 37, 5);
        c.path([[0, -2, 4], [0, 12, 4]], { w: 7, flat: true });
        c.path([[0, 22, 4.4], [0, 32, 5]], { w: 7, flat: true });
        c.pad(0, 36, 5, 5);
        c.deck(0, 17, 4.15, { w: 3.6, d: 10.2, move: [3.4, 0, 0], period: 6, phase: 0.5, th: 0.35, style: "plank", dwell: 0.4, tilt: 0.04 });
        c.plant(-2.4, 11, [-2, 26, 4.6], { period: 3, open: 0.6, flight: 1.6 });
        c.plant(2.4, 11, [0, 2, 4], { period: 3, open: 0.6, phase: 0.5, flight: 1.5 });
        c.path([[3, 25, 4.7], [7, 28, 4.9], [6, 34, 5], [3.2, 37, 5]], { secret: true, w: 1.1, mat: GREEN });
        c.gap(3.4, 25.2, 1).gap(4.3, 36, 1);
        c.bumper(0, 28, {}).rock(-2, 33.6, 0.7);
        c.secret(7, 30, 5.2);
        c.prop("palm", -6, 5).prop("palm", 6, 2).prop("palm", -6, 32);
    }),

    // ---------- FROSTBITE FUMAROLE ----------
    H(1, "Slip Road", 3, "Ice keeps sliding. Use less than you think", (c) => {
        c.tee(0, 0, 5).cup(9, 15, 5);
        c.path([[0, -2, 5], [0, 7, 5], [2, 12, 5], [6, 15, 5]], { w: 5.5, mat: ICE, bank: 0.1 });
        c.pad(9, 15, 4.5, 5, { mat: SNOW });
        c.paintPath([[6.5, 15], [11, 15]], 3, GREEN);
        c.paint(9, 15, 2.4, GREEN);
        c.gap(2.8, 6, 0.9).gap(6, 12.6, 0.9);
        c.plank(2.3, 6.2, 4.98, 7.4, 11.8, 5, 1, { mat: ICE, style: "ice", secret: true });
        c.secret(4.8, 9, 5.2);
        c.prop("crystal", -4, 8).prop("crystal", 14, 18).prop("pine", 13, 9);
    }),
    H(1, "Old Faithless", 3, "The geyser fires on a beat. Park the ball on it", (c) => {
        c.tee(0, 0, 5).cup(0, 22, 8);
        c.path([[0, -2, 5], [0, 13, 5]], { w: 7, mat: ICE });
        c.pad(0, 14, 3.6, 5, { mat: SNOW, dish: 0.35 });
        c.pad(0, 22, 5, 8, { mat: GREEN });
        c.geyser(0, 14, { r: 0.9, to: [0, 20, 8], period: 3.5, on: 1, flight: 1.3 });
        c.path([[3, 6, 5], [8, 8, 5.2], [9, 16, 6.8], [6.5, 21, 8], [4, 22, 8]], { secret: true, w: 1.4, mat: ROCK });
        c.gap(3.3, 6.3, 1);
        c.secret(9, 14, 6.6);
        c.prop("crystal", -6, 7).prop("pine", -6, 15).prop("crystal", -7, 22);
    }),
    H(1, "Frying Pan", 3, "Round and round. Let the slope slow it down", (c) => {
        c.tee(0, -9, 6.4).cup(0, 0, 5.4);
        c.path([[0, -11, 6.4], [0, -8, 6.4]], { w: 4, mat: SNOW });
        c.pad(0, 0, 8, 5, { mat: ICE, dish: 1.5 });
        c.hill(0, 0, 2.6, 0.45);
        c.paint(0, 0, 1.9, GREEN);
        for (const a of [0.5, 2.6, 4.7]) c.wall([[Math.cos(a) * 2.4, Math.sin(a) * 2.4], [Math.cos(a + 1) * 2.4, Math.sin(a + 1) * 2.4]], { h: 0.5, mat: 1 });
        c.tube(5.4, 5.4, 0.6, -1.8, 3.1, { secret: true, speed: 2, T: 0.8, r: 0.5 });
        c.secret(5.4, 5.4, 6.2, { r: 0.8 });
        c.prop("crystal", 10, 4).prop("pine", -10, 2).prop("crystal", -8, -8);
    }),
    H(1, "Puck Alley", 3, "Watch the sweepers, then go through the gap", (c) => {
        c.tee(0, 0, 5).cup(0, 28, 5);
        c.path([[0, -2, 5], [0, 25, 5]], { w: 5, mat: ICE });
        c.pad(0, 28, 4.2, 5, { mat: GREEN });
        c.sweeper(0, 9, 5.25, 2.3, 1.7);
        c.sweeper(0, 17, 5.25, 2.3, -1.7, { phase: 0.8 });
        c.path([[-2.4, 4, 5], [-5.6, 7, 5.05], [-5.6, 19, 5.05], [-3, 25, 5]], { secret: true, w: 1.1, mat: SNOW });
        c.gap(-2.5, 4.6, 0.9).gap(-3, 24.2, 1);
        c.paintPath([[-5.6, 8], [-5.6, 18]], 1.1, ICE);
        c.secret(-5.6, 14, 5.3);
        c.prop("crystal", 5, 6).prop("crystal", 5, 20).prop("pine", 7, 12);
    }),
    H(1, "Steam Stairs", 3, "Each vent lifts you one step higher", (c) => {
        c.tee(0, 0, 5).cup(0, 27, 11);
        c.rect(0, 4, 8, 11, 5, { mat: ROCK });
        c.rect(0, 13.5, 8, 7, 7, { mat: ICE });
        c.rect(0, 20, 8, 6, 9, { mat: ROCK });
        c.pad(0, 27, 4.8, 11, { mat: GREEN });
        c.geyser(0, 7.5, { to: [0, 12.5, 7], period: 3, on: 1, flight: 1.05 });
        c.geyser(0, 15.5, { to: [0, 20, 9], period: 3, on: 1, phase: 0.33, flight: 1.05 });
        c.geyser(0, 21.5, { to: [0, 26, 11], period: 3, on: 1, phase: 0.66, flight: 1.05 });
        c.geyser(-3.2, 5, { secret: true, r: 0.55, to: [-1.8, 25.5, 11], period: 7, on: 1.5, flight: 1.8 });
        c.secret(-3.2, 5, 5.2, { r: 0.7 });
        c.prop("crystal", 6, 8).prop("pine", -7, 16).prop("crystal", 7, 22);
    }),
    H(1, "Powder Keg", 3, "Snow stops you dead. Stick to the ice", (c) => {
        c.tee(0, 0, 5).cup(5, 25, 5);
        c.rect(1, 12, 15, 30, 5, { mat: SNOW });
        c.paintPath([[0, -2], [-3.6, 6], [1, 12], [-2.6, 18], [3, 24], [5, 25]], 3.2, ICE, { dip: 0.14 });
        c.paint(5, 25, 2.6, GREEN);
        c.rock(2.6, 6, 1).rock(5, 13, 1.2).rock(-3, 13, 0.9).rock(0.6, 21, 1);
        c.paintPath([[6, 2], [6.4, 10], [6.4, 22]], 0.9, ICE, { dip: 0.1 });
        c.boost(6, 1.5, 0.04, { speed: 12 });
        c.secret(6.4, 12, 5.2);
        c.prop("pine", -9, 6).prop("pine", -9, 22).prop("crystal", 11, 16);
    }),
    H(1, "Crevasse Hop", 3, "Sliding bridges. Cross when they line up", (c) => {
        c.tee(0, 0, 5).cup(0, 28, 5.8);
        c.path([[0, -2, 5], [0, 7, 5]], { w: 7, mat: SNOW, flat: true });
        c.rect(0, 15.5, 9, 4, 5.4, { mat: ICE });
        c.pad(0, 25, 5.6, 5.8, { mat: GREEN });
        c.path([[0, 20, 5.8], [0, 21, 5.8]], { w: 7, mat: GREEN, flat: true });
        c.deck(0, 10.6, 5.2, { w: 3.8, d: 7.4, move: [3.6, 0, 0], period: 5.5, phase: 0.75, dwell: 0.6, style: "ice", mat: ICE, tilt: 0.05 });
        c.deck(0, 16.9, 5.6, { w: 3.8, d: 6.6, move: [-3.6, 0, 0], period: 5.5, phase: 0.25, dwell: 0.6, style: "ice", mat: ICE, tilt: 0.06 });
        c.plank(-6, 5, 5, -4.4, 23, 5.8, 0.8, { mat: ICE, style: "ice", secret: true });
        c.path([[-3, 5, 5], [-6, 5, 5]], { secret: true, w: 1, mat: SNOW, rail: false });
        c.gap(-3.5, 5, 1);
        c.secret(-5.2, 14, 5.7);
        c.prop("crystal", 7, 4).prop("crystal", -9, 12).prop("pine", 9, 24);
    }),
    H(1, "Frozen Flytrap", 3, "A plant with cold feet spits you downhill", (c) => {
        c.tee(0, 0, 8).cup(-11, 11, 4.5);
        c.path([[0, -2, 8], [0, 10, 8], [0, 18, 7.6], [-6, 22, 6.6], [-12, 18, 5.4], [-11, 13, 4.6]], { w: 5.5, mat: ICE });
        c.pad(-11, 11, 4.4, 4.5, { mat: GREEN });
        c.plant(1.2, 12, [-10, 13, 4.6], { ice: true, period: 3, open: 0.65, flight: 1.5 });
        c.rock(-1.4, 12, 0.7);
        c.gap(-2.75, 3, 0.9);
        c.plank(-2.2, 3, 7.9, -7.6, 7.4, 4.65, 1.1, { mat: ICE, style: "ice", secret: true });
        c.secret(-5, 5.2, 6.5);
        c.prop("crystal", 5, 8).prop("pine", -5, 14).prop("crystal", 4, 21);
    }),
    H(1, "The Big Thaw", 4, "Spin, slide, blast off", (c) => {
        c.tee(0, 0, 5).cup(5, 44, 9);
        c.path([[0, -2, 5], [0, 7.6, 5]], { w: 6, mat: ICE, flat: true });
        c.disc(0, 13, 5, 5.6, -0.7, { mat: ICE, style: "turntable" });
        c.path([[0, 18.4, 5], [0, 26, 5]], { w: 6, mat: ICE, flat: true });
        c.pad(0, 28, 3.6, 5, { mat: SNOW, dish: 0.4 });
        c.geyser(0, 28, { r: 0.9, to: [-4, 38, 9], period: 3.6, on: 1, flight: 1.4 });
        c.pad(0, 40, 7, 9, { mat: GREEN });
        c.wall([[-1.8, 38], [2, 42.6], [6.4, 41]], { h: 0.8, mat: 1 });
        c.path([[6, 5, 5], [9.6, 12, 5.8], [9.6, 26, 7.5], [8, 34, 9]], { secret: true, w: 1.2, mat: ROCK });
        c.path([[0, 3, 5], [6, 5, 5]], { secret: true, w: 1.2, mat: ROCK });
        c.gap(3, 4.2, 1);
        c.secret(9.6, 18, 6.7);
        c.prop("crystal", -8, 6).prop("pine", -9, 24).prop("crystal", -9, 38);
    }),

    // ---------- THE MOLTEN CROWN ----------
    H(2, "Hot Foot", 3, "Lava rock bites. Lava keeps the ball and costs a stroke", (c) => {
        c.tee(0, 0, 6).cup(0, 26, 6);
        c.rect(0, 12, 12, 30, 6, { mat: ROCK });
        c.pad(0, 26, 4.4, 6, { mat: GREEN });
        c.river([[-7, 6], [-3.9, 9], [-4.4, 13], [-7, 16]], 3.4, 5.7);
        c.river([[7, 8], [3.9, 11], [3.6, 16], [7, 20]], 3.4, 5.7);
        c.river([[-7, 21], [-3.4, 21.5], [-1.9, 20]], 2.4, 5.7);
        c.secret(5.4, 14, 6.3, { r: 0.75 });
        c.prop("obsidian", -8, 9).prop("obsidian", 8, 24).prop("basalt", -8, 20);
    }),
    H(2, "Raft Ride", 4, "Land on the raft, ride it, roll off", (c) => {
        c.tee(0, 0, 6).cup(0, 30, 6);
        c.rect(0, 13, 13, 30, 6, { mat: ROCK });
        c.pad(0, 29, 4.4, 6, { mat: GREEN });
        c.river([[-7, 14], [7, 14]], 9.4, 5.7);
        c.deck(0, 11.6, 5.99, { w: 5.4, d: 4, move: [0, 0, 4.8], period: 6, phase: 0.75, dwell: 0.5, style: "raft", mat: WOOD });
        c.plank(-5.2, 8.8, 6.02, -5.2, 19.2, 6.02, 0.75, { style: "ledge", mat: ROCK, secret: true });
        c.secret(-5, 14, 6.3);
        c.prop("obsidian", 8, 5).prop("basalt", 8, 26);
    }),
    H(2, "Magma Mixer", 3, "Everything moves. Find the quiet moment", (c) => {
        c.tee(0, 0, 6).cup(0, 25, 6);
        c.path([[0, -2, 6], [0, 6, 6]], { w: 5, mat: ROCK, flat: true });
        c.path([[0, 18, 6], [0, 23, 6]], { w: 5, mat: ROCK, flat: true });
        c.pad(0, 25, 4.2, 6, { mat: GREEN });
        c.disc(0, 12, 6, 6.2, 0.55, { mat: ROCK, style: "turntable" });
        c.sweeper(0, 12, 6.3, 3.4, -1.1, { arms: 3, th: 0.18 });
        c.deck(6.8, 12, 6, { w: 0.9, d: 12, style: "ledge", mat: ROCK });
        c.path([[2.5, 3, 6], [6.8, 5.8, 6]], { secret: true, w: 0.9, mat: ROCK, rail: false });
        c.path([[6.8, 18.2, 6], [2.8, 21, 6]], { secret: true, w: 0.9, mat: ROCK, rail: false });
        c.gap(2.5, 3, 0.8).gap(2.6, 21, 0.8);
        c.secret(6.8, 12, 6.3);
        c.prop("basalt", -8, 5).prop("obsidian", -8, 20);
    }),
    H(2, "See-Saw Scorcher", 3, "It tips under its own schedule. Roll with it", (c) => {
        c.tee(0, 0, 6).cup(0, 27, 6.6);
        c.path([[0, -2, 6], [0, 6.3, 6]], { w: 6, mat: ROCK, flat: true });
        c.rect(0, 15.5, 5, 2.5, 6.3, { mat: ROCK });
        c.deck(0, 10.3, 6.1, { w: 2.8, d: 8, swing: 0.11, period: 4.5, style: "plank" });
        c.deck(0, 20.7, 6.4, { w: 2.8, d: 8, swing: 0.11, period: 4.5, phase: 0.5, style: "plank" });
        c.pad(0, 27, 4.2, 6.6, { mat: GREEN });
        c.geyser(3, 3, { secret: true, r: 0.6, to: [3, 22, 6.6], period: 5, on: 1.2, flight: 1.8, lava: true });
        c.rect(3.2, 23, 2, 2.4, 6.6, { mat: ROCK });
        c.secret(3, 3, 6.3, { r: 0.65 });
        c.prop("basalt", -7, 4).prop("obsidian", 7, 14).prop("basalt", -7, 25);
    }),
    H(2, "Gulper Gauntlet", 4, "Three gulpers. Only one likes you", (c) => {
        c.tee(0, 0, 6).cup(2.5, 34, 6);
        c.path([[0, -2, 6], [0, 14, 6]], { w: 11, mat: ROCK });
        c.river([[-6, 16], [6, 16]], 5, 5.6);
        c.rect(0, 16, 12, 6, 5.9, { mat: ROCK });
        c.path([[0, 19, 6], [0, 30, 6]], { w: 11, mat: ROCK });
        c.pad(0, 33, 5, 6, { mat: GREEN });
        c.plant(-3.6, 12, [-3.8, 3, 6], { period: 2.8, open: 0.7, flight: 1.2 });
        c.plant(0, 12, [-3.5, 21, 6], { period: 2.8, open: 0.7, phase: 0.33, flight: 1.6 });
        c.plant(3.6, 12, [3.4, 3, 6], { period: 2.8, open: 0.7, phase: 0.66, flight: 1.2 });
        c.wall([[-5.5, 12], [-4.4, 12]], { h: 0.6 }).wall([[-2.8, 12], [-0.8, 12]], { h: 0.6 }).wall([[0.8, 12], [2.8, 12]], { h: 0.6 }).wall([[4.4, 12], [5.5, 12]], { h: 0.6 });
        c.river([[-6, 25], [-1.6, 25]], 2.6, 5.7).river([[1.6, 25], [6, 25]], 2.6, 5.7);
        c.tube(-5, 9.5, 3, 30, 3.0, { secret: true, speed: 2.5, T: 1 });
        c.bumper(0, 28, { kick: 4 }).bumper(-2.5, 29.5, { kick: 4 });
        c.secret(-5, 9.5, 6.2);
        c.prop("cave", -5.5, 9.5, { dir: 1.57 }).prop("basalt", 8, 6).prop("obsidian", -8, 22);
    }),
    H(2, "Eruption Row", 3, "Count the beat, then run the vents", (c) => {
        c.tee(0, 0, 6).cup(0, 28, 6);
        c.rect(0, 12, 7, 28, 6, { mat: ROCK });
        c.pad(0, 28, 4.2, 6, { mat: GREEN });
        for (const [v, ph] of [[7, 0], [12, 0.25], [17, 0.5], [22, 0.75]]) for (const x of [-2.4, 0, 2.4]) c.geyser(x, v, { r: 1.05, period: 4, on: 1.4, phase: ph + (x === 0 ? 0 : 0), up: 13, lava: true });
        c.gap(3.5, 3, 0.9);
        c.path([[3.5, 3, 6], [6, 6, 6.2], [6, 22, 6.2], [3.8, 26, 6]], { secret: true, w: 1, mat: ROCK });
        c.gap(4, 25.5, 1);
        c.secret(6, 14, 6.4);
        c.prop("basalt", -6.5, 5).prop("obsidian", -6.5, 22);
    }),
    H(2, "Lava Tubes", 3, "Three caves. Remember which is which", (c) => {
        c.tee(0, 0, 6).cup(0, 24, 6);
        c.rect(0, 4, 14, 12, 6, { mat: ROCK });
        c.rect(0, 22, 14, 11, 6, { mat: ROCK });
        c.pad(0, 26, 4.2, 6, { mat: GREEN });
        c.wall([[-7, 10], [7, 10]], { h: 1 });
        c.tube(-4.5, 9.2, -5, 18, 0, { speed: 6 });
        c.tube(0, 9.2, 0, 1, 3.14, { speed: 5, T: 0.5 });
        c.tube(4.5, 9.2, 5, 18, 0, { speed: 6 });
        c.wall([[-3, 21], [3, 21]], { h: 0.6 });
        c.tube(-6.4, 2, 0, 22.3, 0, { secret: true, speed: 4, r: 0.45 });
        c.secret(-6.4, 2, 6.2);
        c.prop("cave", -4.5, 10, { dir: 3.14 }).prop("cave", 0, 10, { dir: 3.14 }).prop("cave", 4.5, 10, { dir: 3.14 }).prop("cave", -7, 2, { dir: 1.57 });
    }),
    H(2, "Rim Shot", 5, "All the way round, or straight across?", (c) => {
        c.tee(0, -14, 6).cup(0, 15, 6);
        const ring = []; for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 - i / 12 * Math.PI; ring.push([Math.cos(a) * 13.5, Math.sin(a) * 13.5, 6]); }
        c.path([[0, -16, 6], ...ring], { w: 4.4, mat: ROCK, bank: -0.04 });
        c.pad(0, 15, 4.2, 6, { mat: GREEN });
        c.gap(0, -11.5, 1).gap(0, 10.8, 1);
        c.river([[-16.2, -5], [-13.6, -5]], 1.6, 5.7).river([[-13, 5], [-10.8, 5]], 1.6, 5.7);
        c.rect(0, -10, 1.4, 3.6, 6, { mat: ROCK, rail: false });
        c.deck(0, -5.6, 6, { w: 1, d: 5.2, style: "ledge", mat: ROCK, secret: true });
        c.disc(0, 0, 6, 3.6, 0.9, { mat: ROCK, style: "turntable", secret: true });
        c.deck(0, 6.8, 6, { w: 1, d: 6.8, style: "ledge", mat: ROCK, secret: true });
        c.rect(0, 9.8, 1.4, 1.6, 6, { mat: ROCK, rail: false });
        c.secret(0, -5.6, 6.3);
        c.prop("basalt", 18, 0).prop("obsidian", -18, 2);
    }),
    H(2, "Old Grumble's Throat", 5, "Up the mountain, and down his throat", (c) => {
        c.tee(0, 0, 4).cup(0, 64, 14);
        c.path([[0, -2, 4], [0, 9.7, 4]], { w: 6, mat: ROCK, flat: true });
        c.deck(0, 12.2, 4.1, { w: 3.6, d: 5, swing: 0.08, period: 4, style: "plank" });
        c.pad(0, 19, 4.6, 4.3, { mat: SNOW, dish: 0.35 });
        c.geyser(0, 19, { r: 0.9, to: [-9.5, 24, 8], period: 3.4, on: 1, flight: 1.4 });
        c.path([[-11, 22, 8], [-9, 30, 8.6], [0, 33, 9.4], [8, 30, 10]], { w: 4.6, mat: ROCK });
        c.plant(8.6, 30.4, [3, 38, 12.2], { period: 3, open: 0.65, flight: 1.5, size: 1.3 });
        c.rect(0, 40, 13, 7, 12.2, { mat: ICE });
        c.disc(0, 46.9, 12.2, 3.8, 1, { mat: ROCK, style: "turntable" });
        c.sweeper(0, 46.9, 12.5, 3, -1.3, { arms: 2 });
        c.path([[0, 50.5, 12.2], [0, 59, 14]], { w: 4.4, mat: ROCK, flat: true });
        c.pad(0, 62, 4.4, 14, { mat: GREEN, dish: 0.3 });
        c.gap(3, 3, 0.8);
        c.path([[3, 3, 4], [8, 8, 4.6], [12, 20, 6.5], [13, 34, 10], [7, 43, 12.2]], { secret: true, w: 1.1, mat: ROCK });
        c.gap(6.5, 41.6, 1);
        c.secret(12.3, 22, 7.1);
        c.prop("basalt", -7, 8).prop("obsidian", 7, 24).prop("basalt", -8, 44);
    }),
];
