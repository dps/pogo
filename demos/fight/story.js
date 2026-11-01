// Who says what, and how each run ends. An ending is a short comic: panels with a stage, who's in shot, and one line.
export const BANTER = {
    crumbs: ["You look a little underdone.", "I've been hot since breakfast.", "Two slots. Two fists. Do the maths.", "Stand still. This won't take two minutes."],
    frappe: ["WHAT? I CAN'T HEAR YOU OVER ME!", "Pulse! Pulse! Pulse!", "Everything's a smoothie if you try hard enough.", "I only have one speed and it's RUDE."],
    ristretto: ["I have been awake since Tuesday.", "Quick question. No. Too slow.", "Your pulse is adorable.", "Finish this before I crash."],
    whistle: ["Do mind the steam, dear.", "I shall not raise my voice. Yet.", "How terribly lukewarm of you.", "Curtain up, darling."],
    ding: ["You have thirty seconds. I have planned for twenty-nine.", "Stand on the plate, please.", "Everything goes round, eventually.", "Do not open the door."],
    chill: ["I keep things. Forever.", "Mmm. Leftovers.", "You're letting the cold out.", "Everybody ends up in here."],
    knead: ["Sit. You're skin and bones.", "Who raised you? Come here.", "I'm not angry. I'm folding.", "Eat first. Then I'll hit you."],
    clamp: ["Go on. I'll wait.", "You have a very pressable face.", "Everything lands in a square, eventually.", "Patience is a grid."],
};
export const WIN_QUOTE = {
    crumbs: "Well done. Extra well done.", frappe: "AGAIN! AGAIN! AGAIN!", ristretto: "Next. Next. Is there a next?", whistle: "Do have a lie down, dear.",
    ding: "Ding.", chill: "Into the crisper with you.", knead: "Finish your plate.", clamp: "Told you. Square one.",
};

/** Panels use: stage index, actors [{id, x, pose, scale, flip}], props, caption. */
export const ENDINGS = {
    crumbs: { title: "A SLICE OF PEACE", panels: [
        { stage: 0, actors: [{ id: "crumbs", x: 0, pose: "win" }], props: ["trophy"], text: "Crumbs held up the Golden Spatula. It was the first thing all week that had not caught fire." },
        { stage: 0, actors: [{ id: "crumbs", x: -70, pose: "idle" }, { id: "clamp", x: 90, pose: "idle", flip: true }], props: ["toast"], text: "Next morning the diner reopened. Crumbs took the breakfast shift, and Clampton learned to share a plate." },
        { stage: 0, actors: [{ id: "crumbs", x: 0, pose: "sleep" }], props: ["sun"], text: "For the first time in years, he set himself to two. Then the toast came out golden, and nobody got hurt." },
    ] },
    frappe: { title: "THE QUIET SETTING", panels: [
        { stage: 3, actors: [{ id: "frappe", x: 0, pose: "win" }], props: ["trophy"], text: "Frappé won. Frappé screamed for eleven minutes straight. The trophy developed a hairline crack." },
        { stage: 1, actors: [{ id: "frappe", x: 0, pose: "idle" }], props: ["dial"], text: "That night, alone, he found a dial on his own base that nobody had ever told him about. It said LOW." },
        { stage: 1, actors: [{ id: "frappe", x: 0, pose: "sleep" }], props: ["moon"], text: "He tried it once. It was terrifying. He has told no one." },
    ] },
    ristretto: { title: "THE CRASH", panels: [
        { stage: 3, actors: [{ id: "ristretto", x: 0, pose: "win" }], props: ["trophy"], text: "Joe won in record time. He accepted the trophy, gave a speech, and left, all before the applause began." },
        { stage: 2, actors: [{ id: "ristretto", x: -60, pose: "idle" }, { id: "knead", x: 90, pose: "idle", flip: true }], props: ["cup"], text: "Mama Knead looked at his gauge and took away his beans. Nobody has ever been so brave." },
        { stage: 2, actors: [{ id: "ristretto", x: 0, pose: "sleep" }], props: ["moon"], text: "He slept for nine days. The kitchen, by all accounts, was lovely." },
    ] },
    whistle: { title: "THE FINAL BOW", panels: [
        { stage: 2, actors: [{ id: "whistle", x: 0, pose: "win" }], props: ["trophy"], text: "Dame Whistle took her bow to a standing ovation from four mugs and a fork. It was enough." },
        { stage: 0, actors: [{ id: "whistle", x: -50, pose: "idle" }], props: ["roses"], text: "The notices were glowing. \"Piercing\", said the Spoon. \"I can no longer hear\", said the Fork." },
        { stage: 0, actors: [{ id: "whistle", x: 0, pose: "win" }], props: ["sun"], text: "Each morning at seven she sings for the whole street. Nobody has dared ask her to stop." },
    ] },
    ding: { title: "EVERYTHING GOES ROUND", panels: [
        { stage: 1, actors: [{ id: "ding", x: 0, pose: "win" }], props: ["trophy"], text: "The Baron placed the Golden Spatula on his turntable and set a timer. Thirty seconds. He had always known." },
        { stage: 1, actors: [{ id: "ding", x: -60, pose: "idle" }], props: ["plan"], text: "His plan, it turned out, went on for nineteen more pages. Page twenty said only: popcorn." },
        { stage: 1, actors: [{ id: "ding", x: 0, pose: "win" }, { id: "chill", x: 110, pose: "idle", flip: true }], props: ["corn"], text: "So they all watched old films in the dark, and the Baron passed the bowl. Ding." },
    ] },
    chill: { title: "ROOM FOR ONE MORE", panels: [
        { stage: 1, actors: [{ id: "chill", x: 0, pose: "win" }], props: ["trophy"], text: "Big Chill took the trophy, opened his door, and put it on the middle shelf, next to the mustard." },
        { stage: 1, actors: [{ id: "chill", x: 0, pose: "idle" }], props: ["moon"], text: "Inside, it was very full. Every one he had beaten was in there, and they were all still arguing." },
        { stage: 1, actors: [{ id: "chill", x: 0, pose: "open" }, { id: "crumbs", x: -96, pose: "idle" }, { id: "frappe", x: 96, pose: "idle", flip: true }], props: [], text: "He had never had company before. He left the light on." },
    ] },
    knead: { title: "THE SUNDAY TABLE", panels: [
        { stage: 2, actors: [{ id: "knead", x: 0, pose: "win" }], props: ["trophy"], text: "Mama Knead looked the Golden Spatula up and down. Then she used it to fold the dough." },
        { stage: 2, actors: [{ id: "knead", x: -60, pose: "idle" }, { id: "ristretto", x: 90, pose: "idle", flip: true }], props: ["bread"], text: "She sent word to every kitchen: Sunday, noon, no excuses, and bring your own plug." },
        { stage: 2, actors: [{ id: "knead", x: 0, pose: "win" }, { id: "chill", x: -110, pose: "idle" }, { id: "clamp", x: 110, pose: "idle", flip: true }], props: ["bread"], text: "They all came. They were all too full to fight. That was always the plan." },
    ] },
    clamp: { title: "SQUARE ONE", panels: [
        { stage: 3, actors: [{ id: "clamp", x: 0, pose: "win" }], props: ["trophy"], text: "Clampton had waited through seven fights without once moving first. He won the eighth by not moving at all." },
        { stage: 0, actors: [{ id: "clamp", x: -60, pose: "idle" }, { id: "crumbs", x: 90, pose: "idle", flip: true }], props: ["waffle"], text: "Crumbs came by to ask how he had done it. Clampton said nothing for an hour. It was very instructive." },
        { stage: 0, actors: [{ id: "clamp", x: 0, pose: "sleep" }], props: ["waffle"], text: "Then he closed, gently. Somewhere inside, a perfect square of batter turned gold." },
    ] },
};
