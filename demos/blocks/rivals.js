// The story: everyone in the valley just wants a nap. Eight neighbours stand between your animals and a full night's
// sleep, and at the top of the hill stands the rooster who wakes everybody up.
// Colours run from sunset through deep night to dawn, so the ladder is one long night.

export const RIVALS = [
    {
        key: "pip", ouch: "Quack!", tease: "Hee hee!", name: "Pip", title: "the Duckling", sky: ["#f5895f", "#5a2f7d"], ground: "#3a2263", song: "dusk",
        intro: "Are you sleeping? Are you? Are you?", win: "Quack! I won? Can I go again?", lose: "That was fun. Night night!",
        brain: { pps: 0.42, noise: 34, look: 0, greed: 0, slip: 0.3, hold: 0, safe: 10, hands: 6 }, send: 0.5, garbageWait: 150, gravity: 1, attack: null,
    },
    {
        key: "mabel", ouch: "My eggs!", tease: "Eat up, dear.", name: "Mabel", title: "the Hen", sky: ["#e96a7a", "#40277a"], ground: "#2e1d62", song: "dusk",
        intro: "Nobody naps on my watch, dear. Have an egg.", win: "Cluck. Eat your eggs.", lose: "Well! I never.",
        brain: { pps: 0.5, noise: 26, look: 0, greed: 0, slip: 0.22, hold: 0, safe: 10, hands: 5 }, send: 0.6, garbageWait: 130, gravity: 1.5,
        attack: { kind: "egg", every: 24, name: "Eggs!", warn: 90 },
    },
    {
        key: "bristle", ouch: "Ow.", tease: "Prickly, isn't it?", name: "Bristle", title: "the Hedgehog", sky: ["#a84a8c", "#2c2274"], ground: "#211a5a", song: "barn",
        intro: "Sit still. You're all prickly.", win: "Don't touch me. I mean it.", lose: "Ow. Ow. Ow.",
        brain: { pps: 0.62, noise: 18, look: 0, greed: 0, slip: 0.14, hold: 0, safe: 10, hands: 4 }, send: 0.7, garbageWait: 110, gravity: 2,
        attack: { kind: "quills", every: 18, name: "Quills!", warn: 75 },
    },
    {
        key: "rascal", ouch: "Hey, mine!", tease: "Thanks for that!", name: "Rascal", title: "the Raccoon", sky: ["#6a3f96", "#1d2068"], ground: "#181850", song: "barn",
        intro: "Nice animal you've got held there. Be a shame...", win: "Finders keepers.", lose: "I'll have that back, then.",
        brain: { pps: 0.63, noise: 17, look: 0, greed: 0.15, slip: 0.12, hold: 0, safe: 11, hands: 4 }, send: 0.75, garbageWait: 100, gravity: 3,
        attack: { kind: "swipe", every: 20, name: "Swiped!", warn: 75 },
    },
    {
        key: "olga", ouch: "How rude.", tease: "Sniff that.", name: "Olga", title: "the Skunk", sky: ["#3f3a9a", "#141a58"], ground: "#101446", song: "midnight",
        intro: "What smell? I smell nothing, darling.", win: "Delicious, no?", lose: "Pfft. You stink.",
        brain: { pps: 0.74, noise: 14, look: 0, greed: 0.2, slip: 0.1, hold: 0, safe: 11, hands: 3 }, send: 0.75, garbageWait: 90, gravity: 4,
        attack: { kind: "stink", every: 22, name: "Stink!", warn: 75, last: 420 },
    },
    {
        key: "bruno", ouch: "BRUNO ANGRY.", tease: "FLAT!", name: "Bruno", title: "the Bull", sky: ["#2a3a8e", "#0e1548"], ground: "#0b103a", song: "midnight",
        intro: "BRUNO DOES NOT NAP. BRUNO CHARGES.", win: "HA. FLAT.", lose: "Bruno... is sleepy.",
        brain: { pps: 0.76, noise: 14, look: 0, greed: 0.3, slip: 0.08, hold: 1, safe: 12, hands: 3 }, send: 0.8, garbageWait: 85, gravity: 5,
        attack: { kind: "charge", every: 26, name: "Charge!", warn: 150, rows: 2 },
    },
    {
        key: "hoot", ouch: "Hm.", tease: "Elementary.", name: "Professor Hoot", title: "the Owl", sky: ["#26347f", "#0a1040"], ground: "#080c30", song: "owl",
        intro: "Sleep is a habit of the unlearned. Who? You.", win: "As predicted.", lose: "A fascinating anomaly.",
        brain: { pps: 0.92, noise: 8, look: 0, greed: 0.5, slip: 0.05, hold: 1, safe: 12, hands: 2 }, send: 0.85, garbageWait: 75, gravity: 6,
        attack: { kind: "dark", every: 22, name: "Lights out!", warn: 75, last: 480 },
    },
    {
        key: "reveille", ouch: "BAWK!", tease: "UP! UP! UP!", name: "Reveille", title: "the Rooster", sky: ["#ff9d6c", "#3f3a9a"], ground: "#2a2466", song: "dawn",
        intro: "RISE AND SHINE! Nobody sleeps past me. NOBODY.", win: "COCK-A-DOODLE-DONE!", lose: "...five more minutes.",
        brain: { pps: 1.18, noise: 3.5, look: 1, greed: 0.7, slip: 0.02, hold: 1, safe: 13, hands: 2 }, send: 1, garbageWait: 75, gravity: 7,
        attack: { kind: "crow", every: 17, name: "COCK-A-DOODLE!", warn: 90, last: 300 },
    },
];

/** Solo modes. Gravity follows levels here. */
export const MODES = {
    story: { label: "Story" },
    marathon: { label: "Marathon", goal: 150, blurb: "150 lines, 15 levels" },
    sprint: { label: "Sprint", goal: 40, blurb: "40 lines, fast as you can" },
    daily: { label: "Daily", seconds: 150, blurb: "Same animals for everyone today" },
    versus: { label: "Versus", blurb: "Two players, one keyboard" },
};

/** Today's seed. The same date gives the same animals. */
export function dailySeed(date = new Date()) {
    const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
    return { seed: (y * 372 + m * 31 + d) * 2654435761 >>> 0, key: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}
