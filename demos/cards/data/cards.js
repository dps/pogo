// Every ingredient in the tower. vals are [base, upgraded]; {key} in text is replaced by the value.
// fx(x, v): x is the brew context from sim.js. art: [backdrop, motif, optional second motif].
export const CARDS = {};
const C = (id, name, el, cost, rar, text, vals, fx, o = {}) => {
    CARDS[id] = { id, name, el, cost, rar, text, vals: vals ?? {}, fx, ...o };
};
const S = "starter", A = "common", B = "uncommon", R = "rare";

// ---- Starters ----
C("spark", "Ember Spark", "ember", 1, S, "Deal {d}.", { d: [6, 9] }, (x, v) => x.dmg(v.d), { art: ["hearth", "flame"], flavor: "Handle with tongs. Or a cousin." });
C("droplet", "Brine Drop", "brine", 1, S, "Ward {w}.", { w: [5, 8] }, (x, v) => x.ward(v.w), { art: ["sea", "drop"], flavor: "One tear of the sea. It was crying about you." });
C("firecorn", "Firecorn", "ember", 1, S, "Deal {d}. Burn {b}.", { d: [4, 6], b: [2, 3] }, (x, v) => { x.dmg(v.d); x.burn(v.b); }, { art: ["hearth", "pepper"], flavor: "Do not grind near eyes, or near anybody's eyes." });
C("dewsalt", "Dew Salt", "brine", 0, S, "Ward {w}.", { w: [3, 5] }, (x, v) => x.ward(v.w), { art: ["sea", "salt"], flavor: "Harvested at dawn from very sad cucumbers." });
C("bellows", "Bellows Puff", "ember", 0, S, "Next ingredient ×{m}.", { m: [1.5, 2] }, (x, v) => x.nextMul(v.m), { art: ["hearth", "bellows"], flavor: "Whoosh, in a professional capacity." });
C("nettle", "Stinging Nettle", "moss", 1, S, "Deal {d}.", { d: [6, 9] }, (x, v) => x.dmg(v.d), { art: ["forest", "nettle"], flavor: "Nature's way of saying no." });
C("hoar", "Hoar Pellet", "rime", 1, S, "Ward {w}.", { w: [5, 8] }, (x, v) => x.ward(v.w), { art: ["frost", "crystal"], flavor: "Keeps for years. Like a grudge." });
C("barkskin", "Barkskin Tea", "moss", 1, S, "Ward {w}. Heal {h}.", { w: [4, 6], h: [1, 2] }, (x, v) => { x.ward(v.w); x.heal(v.h); }, { art: ["forest", "teacup"], flavor: "Tastes of tree. Do not ask which." });
C("toadcap", "Toadcap", "moss", 1, S, "Doom {o}. Deal {d}.", { o: [5, 8], d: [2, 3] }, (x, v) => { x.doom(v.o); x.dmg(v.d); }, { art: ["swamp", "mushroom"], flavor: "The toad has asked for it back." });
C("mandrakelet", "Mandrakelet", "hex", 2, S, "Doom {o}. Hex {h}.", { o: [8, 12], h: [1, 1] }, (x, v) => { x.doom(v.o); x.hex(v.h); }, { art: ["night", "root"], flavor: "Screams in a small, adorable way." });
C("blackpin", "Black Pin", "hex", 1, S, "Deal {d}.", { d: [6, 9] }, (x, v) => x.dmg(v.d), { art: ["night", "pin"], flavor: "One prick and somebody, somewhere, says ow." });
C("giltflake", "Gilt Flake", "gilt", 1, S, "Ward {w}.", { w: [5, 8] }, (x, v) => x.ward(v.w), { art: ["vault", "coin"], flavor: "Not gold. Gold-adjacent. Gold-curious." });
C("omen", "Small Omen", "hex", 1, S, "Hex {h}. Deal {d}.", { h: [1, 2], d: [3, 5] }, (x, v) => { x.hex(v.h); x.dmg(v.d); }, { art: ["night", "eye"], flavor: "A very minor portent. Possibly rain." });
C("pawnedcoin", "Pawned Coin", "gilt", 0, S, "+{p} Potency.", { p: [0.5, 0.75] }, (x, v) => x.pot(v.p), { art: ["vault", "coin", "hand"], flavor: "Worth more in the soup than in your purse." });

// ---- Ember ----
C("snap", "Pepper Snap", "ember", 0, A, "Deal {d}.", { d: [3, 5] }, (x, v) => x.dmg(v.d), { art: ["hearth", "pepper", "star"], flavor: "Small, angry, and on sale." });
C("sprig", "Cinder Sprig", "ember", 1, A, "Deal {d}. Burn {b}.", { d: [5, 7], b: [2, 3] }, (x, v) => { x.dmg(v.d); x.burn(v.b); }, { art: ["hearth", "leaf", "flame"], flavor: "Rosemary had a very bad day." });
C("matchkiss", "Matchwife's Kiss", "ember", 1, A, "Deal {d}. First: deal {e} more.", { d: [6, 8], e: [5, 7] }, (x, v) => x.dmg(x.first ? v.d + v.e : v.d), { art: ["hearth", "match"], flavor: "Lovely girl. Terrible fire safety." });
C("coal", "Twice-Hot Coal", "ember", 1, A, "Deal {d} twice.", { d: [5, 6] }, (x, v) => { x.dmg(v.d); x.dmg(v.d); }, { art: ["hearth", "coal"], flavor: "Once for the fire. Once for spite." });
C("chilicurse", "Chili Curse", "ember", 2, A, "Burn {b}.", { b: [9, 13] }, (x, v) => x.burn(v.b), { art: ["hearth", "pepper", "eye"], flavor: "The pepper hates you personally." });
C("scorch", "Scorch", "ember", 2, A, "Deal {d}.", { d: [15, 21] }, (x, v) => x.dmg(v.d), { art: ["hearth", "flame", "flame"], flavor: "Just a lot of fire, in a useful direction." });
C("flashfry", "Flash Fry", "ember", 1, A, "Deal {d} to ALL.", { d: [5, 7] }, (x, v) => x.aoe(v.d), { art: ["hearth", "spoon", "flame"], flavor: "Egalitarian cooking." });
C("cauterise", "Cauterise", "ember", 1, A, "Ward {w}. Heal {h}.", { w: [4, 6], h: [2, 3] }, (x, v) => { x.ward(v.w); x.heal(v.h); }, { art: ["hearth", "heart", "flame"], flavor: "Nurse's note: it stopped bleeding, that's all I'll say." });
C("wildsalt", "Wildfire Salt", "ember", 2, B, "Deal {d} to ALL. Burn ALL {b}.", { d: [5, 7], b: [3, 4] }, (x, v) => { x.aoe(v.d); x.burnAll(v.b); }, { art: ["hearth", "salt", "flame"], flavor: "Season to taste. Evacuate to taste." });
C("dragoncough", "Dragon Cough", "ember", 2, B, "Deal {d} per Ember in the brew.", { d: [6, 8] }, (x, v) => x.dmg(v.d * x.count("ember")), { art: ["hearth", "lizard", "flame"], flavor: "Bottled in the sick bay of a very old lizard." });
C("stoke", "Stoke", "ember", 1, B, "+{p} Potency per Ember before this.", { p: [0.5, 0.75] }, (x, v) => x.pot(v.p * x.countBefore("ember")), { art: ["hearth", "spoon", "coal"], flavor: "Poke it. Poke it again. It likes it." });
C("ashbath", "Ash Bath", "ember", 1, B, "Deal the target's Burn ×{m}.", { m: [2, 3] }, (x, v) => x.dmg(x.tst("burn") * v.m), { art: ["hearth", "kettle", "coal"], flavor: "Exfoliating. Terminally." });
C("sootfall", "Sootfall", "ember", 1, B, "Burn ALL {b}. Boil Away.", { b: [5, 7] }, (x, v) => x.burnAll(v.b), { art: ["night", "cloud", "flame"], boil: true, flavor: "Scattered soot, with a chance of consequences." });
C("kettledrum", "Kettle Drum", "ember", 1, B, "Deal {d} per ingredient fired this brew.", { d: [3, 4] }, (x, v) => x.dmg(v.d * Math.max(1, x.fires)), { art: ["hearth", "kettle"], flavor: "Marching band of one, slightly on fire." });
C("flambe", "Flambé", "ember", 0, B, "Instant. Double the target's Burn. Boil Away.", {}, (x) => x.burn(x.tst("burn")), { art: ["hearth", "egg", "spoon"], instant: true, boil: true, vals: { cost: [1, 0] }, flavor: "Oui, chef. Non, eyebrows." });
C("pyre", "Pyre", "ember", 3, R, "Deal {d}. Burn {b}. Boil Away.", { d: [28, 38], b: [6, 9] }, (x, v) => { x.dmg(v.d); x.burn(v.b); }, { art: ["night", "bone", "flame"], boil: true, flavor: "Everyone is invited." });
C("phoenixyolk", "Phoenix Yolk", "ember", 2, R, "Deal {d}. Heal {h}. If this kills, return it to your hand.", { d: [12, 16], h: [3, 4] }, (x, v) => { const k = x.dmg(v.d); x.heal(v.h); if (k) x.returnSelf(); }, { art: ["hearth", "egg", "flame"], flavor: "Over easy, then over again." });
C("pressure", "Pressure Cooker", "ember", 2, R, "Deal {d} per Potency, ignoring Potency.", { d: [10, 14] }, (x, v) => x.rawDmg(v.d * x.potency * x.potency), { art: ["hearth", "kettle", "star"], flavor: "Do not lift the lid. We are begging you." });
C("sunyolk", "Sunburst", "ember", 2, R, "Reflux every Ember before this.", { cost: [2, 1] }, (x) => x.refluxEl("ember"), { art: ["stars", "sun"], flavor: "It's only a star if you stand far enough away." });
C("emberheart", "Emberheart", "ember", 1, R, "Deal {d}. Grows by {g} each time it fires this fight.", { d: [5, 7], g: [3, 4] }, (x, v) => { x.dmg(v.d + x.mem("n") * v.g); x.memAdd("n", 1); }, { art: ["hearth", "heart", "coal"], tier: 2, flavor: "Still warm. Still furious." });

// ---- Brine ----
C("tide", "Pocket Tide", "brine", 1, A, "Ward {w}. Next ingredient ×{m}.", { w: [3, 5], m: [1.25, 1.5] }, (x, v) => { x.ward(v.w); x.nextMul(v.m); }, { art: ["sea", "wave"], flavor: "Do not sit on it." });
C("shellguard", "Clamshell", "brine", 2, A, "Ward {w}.", { w: [13, 18] }, (x, v) => x.ward(v.w), { art: ["sea", "shell"], flavor: "Moves in, won't leave, pays no rent." });
C("seaslap", "Sea Slap", "brine", 1, A, "Deal {d}. Ward {w}.", { d: [4, 6], w: [3, 4] }, (x, v) => { x.dmg(v.d); x.ward(v.w); }, { art: ["sea", "fish"], flavor: "A cold fish, applied briskly." });
C("rainbarrel", "Rain Barrel", "brine", 1, A, "Instant. Draw {n}.", { n: [2, 3] }, (x, v) => x.draw(v.n), { art: ["sea", "cloud", "drop"], instant: true, flavor: "Free water. The barrel is the catch." });
C("kelp", "Long Kelp", "brine", 1, A, "Ward {w}. Keep.", { w: [7, 10] }, (x, v) => x.ward(v.w), { art: ["sea", "kelp"], keep: true, flavor: "Clings on, emotionally." });
C("riptide", "Riptide", "brine", 1, A, "Deal {d} to ALL.", { d: [4, 6] }, (x, v) => x.aoe(v.d), { art: ["sea", "wave", "wave"], flavor: "Everybody out of the pool." });
C("bilgewater", "Bilgewater", "brine", 0, A, "Ward {w}. Add a Gunk to your discard.", { w: [8, 11] }, (x, v) => { x.ward(v.w); x.addGunk(1); }, { art: ["swamp", "drop", "bone"], flavor: "Free refills, regrettably." });
C("mirrorpool", "Mirror Pool", "brine", 2, B, "Fires as a copy of the ingredient before it.", { cost: [1, 0] }, (x) => x.copyLeft(), { art: ["sea", "mirror"], flavor: "Looks like you, but with better posture." });
C("deepbreath", "Deep Breath", "brine", 0, B, "Instant. +{h} Heat. Boil Away.", { h: [2, 3] }, (x, v) => x.heat(v.h), { art: ["sea", "bubble"], instant: true, boil: true, flavor: "And hold. And hold. And hold." });
C("undertow", "Undertow", "brine", 1, B, "Ward equal to Potency ×{m}.", { m: [10, 14] }, (x, v) => x.rawWard(Math.round(v.m * x.potency)), { art: ["sea", "wave", "eye"], flavor: "It would like a word with you, downstairs." });
C("floodgate", "Floodgate", "brine", 2, B, "+{p} Potency per Brine in the brew.", { p: [0.5, 0.75] }, (x, v) => x.pot(v.p * x.count("brine")), { art: ["sea", "key", "wave"], flavor: "Somebody was told not to touch that." });
C("seafog", "Sea Fog", "brine", 1, B, "Chill ALL {c}. Ward {w}.", { c: [1, 2], w: [4, 6] }, (x, v) => { x.chillAll(v.c); x.ward(v.w); }, { art: ["sea", "cloud"], flavor: "Nobody can see you, which is the kindest thing to happen all week." });
C("kraken", "Kraken Ink", "brine", 2, B, "Deal {d}. Hex {h}.", { d: [10, 14], h: [2, 2] }, (x, v) => { x.dmg(v.d); x.hex(v.h); }, { art: ["sea", "tentacle"], flavor: "Signed, sealed, drowned." });
C("tsunami", "Teacup Tsunami", "brine", 2, R, "Deal your Ward to ALL.", { cost: [2, 1] }, (x) => x.rawAoe(x.pward()), { art: ["sea", "teacup", "wave"], flavor: "Storms have to start somewhere." });
C("moonpull", "Moon Pull", "brine", 1, R, "Reflux {n}. Light.", { n: [1, 2] }, (x, v) => x.reflux(v.n), { art: ["sea", "moon", "wave"], light: true, flavor: "Everything comes back, eventually. Even Gary." });
C("perpetual", "Perpetual Drip", "brine", 0, R, "+{p} Potency. Gains +0.25 each fire this fight.", { p: [0.25, 0.5] }, (x, v) => { x.pot(v.p + x.mem("n") * 0.25); x.memAdd("n", 1); }, { art: ["sea", "drop", "hourglass"], tier: 3, flavor: "It's been dripping since before the tower. Nobody knows where from." });

// ---- Moss ----
C("clover", "Four-Leaf Maybe", "moss", 0, A, "Heal {h}.", { h: [2, 3] }, (x, v) => x.heal(v.h), { art: ["forest", "clover"], flavor: "One leaf was glued on, but the effort counts." });
C("thornwall", "Thorn Wall", "moss", 1, A, "Ward {w}. Burn {b}.", { w: [6, 8], b: [1, 2] }, (x, v) => { x.ward(v.w); x.burn(v.b); }, { art: ["forest", "vine", "pin"], flavor: "Hedge your bets, literally." });
C("sporepuff", "Spore Puff", "moss", 1, A, "Doom {o} to ALL.", { o: [5, 7] }, (x, v) => x.doomAll(v.o), { art: ["swamp", "mushroom", "bubble"], flavor: "Achoo, and then the funeral." });
C("bramble", "Bramble Lash", "moss", 1, A, "Deal {d}. Deal {e} more if Doomed.", { d: [6, 8], e: [5, 7] }, (x, v) => x.dmg(x.tst("doom") > 0 ? v.d + v.e : v.d), { art: ["forest", "vine"], flavor: "Gardening, but it fights back first." });
C("acorn", "Patient Acorn", "moss", 1, A, "Keep. Deal {d}, plus {e} per turn you held it.", { d: [4, 6], e: [4, 5] }, (x, v) => x.dmg(v.d + x.held() * v.e), { art: ["forest", "acorn"], keep: true, flavor: "Thinks in centuries. Can wait." });
C("poultice", "Poultice", "moss", 1, A, "Heal {h}. Boil Away.", { h: [7, 10] }, (x, v) => x.heal(v.h), { art: ["forest", "leaf", "heart"], boil: true, flavor: "Smells like a cow's opinion." });
C("rootsnare", "Root Snare", "moss", 1, A, "Chill {c}. Doom {o}.", { c: [1, 2], o: [4, 6] }, (x, v) => { x.chill(v.c); x.doom(v.o); }, { art: ["forest", "root"], flavor: "Trip hazard. Sign forthcoming." });
C("fairyring", "Fairy Ring", "moss", 2, B, "Ward {w}. Next turn draw {n}.", { w: [9, 12], n: [2, 3] }, (x, v) => { x.ward(v.w); x.drawNext(v.n); }, { art: ["forest", "mushroom", "ring"], flavor: "Dancing is optional. Leaving is not possible." });
C("compost", "Compost", "moss", 1, B, "+{p} Potency for each Gunk you own this fight.", { p: [0.5, 0.75] }, (x, v) => x.pot(v.p * x.gunkOwned()), { art: ["swamp", "bone", "leaf"], flavor: "Everything is soup eventually." });
C("deathcap", "Death Cap", "moss", 2, B, "Doom {o}. If Doom has claimed a foe, Doom ALL {e}.", { o: [14, 19], e: [6, 8] }, (x, v) => { x.doom(v.o); if (x.c.doomKills > 0) x.doomAll(v.e); }, { art: ["swamp", "mushroom", "skull"], flavor: "One bite. The rest is admin." });
C("mistletoe", "Mistletoe", "moss", 1, B, "Heal {h}. +{p} Potency.", { h: [2, 3], p: [0.5, 0.75] }, (x, v) => { x.heal(v.h); x.pot(v.p); }, { art: ["forest", "flower", "leaf"], flavor: "Kisses are binding under tower law." });
C("sapling", "Sapling", "moss", 1, B, "Deal {d}. Permanently +{g} when it kills, up to 5 times.", { d: [8, 11], g: [3, 4] }, (x, v) => { const b = Math.min(5, x.cardMem("grown")) * v.g; if (x.dmg(v.d + b)) x.cardMemAdd("grown", 1); }, { art: ["forest", "acorn", "leaf"], tier: 1, flavor: "It's eating well. Don't ask." });
C("sourdough", "Old Sourdough", "moss", 1, B, "Keep. +{p} Potency per turn you held it.", { p: [0.5, 0.75] }, (x, v) => x.pot(v.p * (1 + x.held())), { art: ["hearth", "bubble", "leaf"], keep: true, flavor: "Older than the tower. Answers to Gerald." });
C("hundredyear", "Hundred-Year Mushroom", "moss", 2, R, "Doom equal to the target's HP ÷ {m}.", { m: [3, 2] }, (x, v) => x.rawDoom(Math.ceil(x.thp() / v.m)), { art: ["night", "mushroom", "hourglass"], flavor: "Slow food movement." });
C("yggdrasprout", "World-Tree Sprout", "moss", 2, R, "+{m} Heat each turn this fight. Boil Away.", { m: [1, 2] }, (x, v) => x.heatEvery(v.m), { art: ["stars", "root", "leaf"], boil: true, flavor: "Small for now. Everything is small for now." });
C("foxglove", "Foxglove Waltz", "moss", 2, R, "Heal {h}. Deal all healing done this fight.", { h: [3, 4] }, (x, v) => { x.heal(v.h); x.rawDmg(x.c.healed); }, { art: ["forest", "flower", "heart"], tier: 4, flavor: "A heart medicine, in that it stops the heart's problems." });

// ---- Rime ----
C("icicle", "Icicle", "rime", 1, A, "Deal {d}. Chill {c}.", { d: [5, 8], c: [1, 1] }, (x, v) => { x.dmg(v.d); x.chill(v.c); }, { art: ["frost", "icicle"], flavor: "Dropped from a great height by someone who cared." });
C("snowglobe", "Snow Globe", "rime", 1, A, "Ward {w}. Chill {c}.", { w: [6, 9], c: [1, 1] }, (x, v) => { x.ward(v.w); x.chill(v.c); }, { art: ["frost", "orb", "snow"], flavor: "There is a tiny witch inside. She is furious." });
C("coldsnap", "Cold Snap", "rime", 0, A, "Chill ALL {c}.", { c: [1, 2] }, (x, v) => x.chillAll(v.c), { art: ["frost", "snow"], flavor: "Nobody dressed for this." });
C("glacier", "Slow Glacier", "rime", 2, A, "Ward {w}. Keep.", { w: [14, 20] }, (x, v) => x.ward(v.w), { art: ["frost", "crystal", "crystal"], keep: true, flavor: "Arrives eventually, and then you have a glacier." });
C("frostnip", "Frostnip", "rime", 1, A, "Deal {d}. Double if the target is Chilled.", { d: [6, 8] }, (x, v) => x.dmg(x.tst("chill") > 0 ? v.d * 2 : v.d), { art: ["frost", "hand", "snow"], flavor: "Bites harder when you're already shivering." });
C("sleetsong", "Sleet Song", "rime", 1, A, "Deal {d} to ALL. Chill ALL 1.", { d: [3, 5] }, (x, v) => { x.aoe(v.d); x.chillAll(1); }, { art: ["frost", "bell", "snow"], flavor: "Off-key, wet, and aimed at you." });
C("hailstone", "Hailstones", "rime", 2, B, "Deal {d} {n} times.", { d: [3, 4], n: [5, 6] }, (x, v) => { for (let i = 0; i < v.n; i++) x.dmg(v.d); }, { art: ["frost", "orb", "orb"], flavor: "Sold by the bucket. Delivered by the sky." });
C("shatter", "Shatter", "rime", 1, B, "Deal the target's Chill ×{m}.", { m: [6, 9] }, (x, v) => x.dmg(x.tst("chill") * v.m), { art: ["frost", "crystal", "bolt"], flavor: "It was fine a minute ago." });
C("coldstorage", "Cold Storage", "rime", 1, B, "Instant. Your Ward stays next turn. Boil Away.", { cost: [1, 0] }, (x) => x.holdWard(), { art: ["frost", "key", "crystal"], instant: true, boil: true, flavor: "Best before: the heat death of everything." });
C("wintercoat", "Winter Coat", "rime", 2, B, "Ward {w} per Chilled foe, and {e} more.", { w: [6, 8], e: [5, 7] }, (x, v) => x.ward(v.e + v.w * x.chilledFoes()), { art: ["frost", "hat", "snow"], flavor: "Your nan knitted it. It is load-bearing." });
C("brainfreeze", "Brain Freeze", "rime", 1, B, "Next ingredient ×{m}. Chill {c}.", { m: [2, 2.5], c: [1, 1] }, (x, v) => { x.nextMul(v.m); x.chill(v.c); }, { art: ["frost", "skull", "snow"], flavor: "Sharp. Sudden. Worth it." });
C("absolutezero", "Absolute Zero", "rime", 2, R, "Chill ALL {c}. Hex ALL {h}. Strip all Ward.", { c: [3, 4], h: [2, 3] }, (x, v) => { x.chillAll(v.c); x.hexAll(v.h); x.stripAll(); }, { art: ["stars", "snow", "orb"], flavor: "Colder than your mother-in-law's casserole." });
C("frozenmoment", "Frozen Moment", "rime", 2, R, "Enemies skip their next action, once per fight. Boil Away.", { cost: [2, 1] }, (x) => x.freezeAll(), { art: ["frost", "hourglass"], boil: true, tier: 2, flavor: "They'll be furious in a minute." });
C("snowball", "Snowball", "rime", 1, R, "Deal {d}. Doubles each time it fires this fight.", { d: [3, 4] }, (x, v) => { x.dmg(v.d * Math.pow(2, Math.min(9, x.mem("n")))); x.memAdd("n", 1); }, { art: ["frost", "orb"], tier: 3, flavor: "It started with a very small remark." });

// ---- Hex ----
C("evileye", "Evil Eye", "hex", 1, A, "Hex {h}.", { h: [2, 3] }, (x, v) => x.hex(v.h), { art: ["night", "eye", "moon"], flavor: "Your aunt, but concentrated." });
C("curseword", "Curse Word", "hex", 0, A, "Deal {d}. Hex 1.", { d: [2, 4] }, (x, v) => { x.dmg(v.d); x.hex(1); }, { art: ["night", "book", "bolt"], flavor: "Translated from the Old Rude." });
C("voodoo", "Poppet", "hex", 1, A, "Deal {d}. Doom {o}.", { d: [4, 6], o: [4, 6] }, (x, v) => { x.dmg(v.d); x.doom(v.o); }, { art: ["night", "poppet", "pin"], flavor: "Hand-stitched with love and a very specific grudge." });
C("nightshade", "Nightshade", "hex", 1, A, "Doom {o}.", { o: [8, 12] }, (x, v) => x.doom(v.o), { art: ["night", "flower", "skull"], flavor: "Very pretty. Very final." });
C("blackcat", "Black Cat", "hex", 1, A, "Deal {d}. Hex {h}.", { d: [6, 8], h: [1, 1] }, (x, v) => { x.dmg(v.d); x.hex(v.h); }, { art: ["night", "cat"], flavor: "Crossed your path. On purpose. Twice." });
C("graveyard", "Graveyard Dirt", "hex", 1, A, "Ward {w}. Doom {o}.", { w: [4, 6], o: [3, 5] }, (x, v) => { x.ward(v.w); x.doom(v.o); }, { art: ["night", "bone", "root"], flavor: "Local, organic, and still warm." });
C("pact", "Small Print", "hex", 0, B, "Lose {l} HP. +{p} Potency.", { l: [3, 3], p: [1, 1.5] }, (x, v) => { x.lose(v.l); x.pot(v.p); }, { art: ["night", "book", "pin"], flavor: "Clause 9: and also your second-favourite kidney." });
C("tarot", "Tower Card", "hex", 1, B, "Deal {d} per different element in the brew.", { d: [5, 7] }, (x, v) => x.dmg(v.d * x.distinct()), { art: ["night", "cardart", "bolt"], flavor: "The Tower: upright, for now." });
C("ravenmail", "Raven Mail", "hex", 1, B, "Instant. Draw {n}. Boil Away.", { n: [3, 4] }, (x, v) => x.draw(v.n), { art: ["night", "raven", "book"], instant: true, boil: true, flavor: "Nevermore junk mail." });
C("bloodmoon", "Blood Moon", "hex", 2, B, "All foes: double Doom.", { cost: [2, 1] }, (x) => x.doubleDoomAll(), { art: ["stars", "moon", "drop"], flavor: "Lycanthropy advisory in effect." });
C("spiderweb", "Spider's Thread", "hex", 1, B, "Chill {c}. Next ingredient ×{m}.", { c: [1, 2], m: [1.5, 2] }, (x, v) => { x.chill(v.c); x.nextMul(v.m); }, { art: ["night", "spider"], flavor: "Eight legs, seven of them plotting." });
C("hexbag", "Hex Bag", "hex", 1, B, "+{p} Potency per Hexed foe.", { p: [1, 1.5] }, (x, v) => x.pot(v.p * x.hexedFoes()), { art: ["night", "pouch", "eye"], flavor: "Do not open. It has opened itself." });
C("ouroboros", "Ouroboros Broth", "hex", 2, R, "Reflux {n}. Each ingredient refluxed adds +0.25 Potency.", { n: [2, 3] }, (x, v) => { x.pot(0.25 * Math.min(v.n, x.index)); x.reflux(v.n); }, { art: ["stars", "snake"], flavor: "Tastes like it tasted, later." });
C("deathknell", "Death Knell", "hex", 2, R, "Each foe with Doom over half its HP dies.", { cost: [2, 1] }, (x) => x.knell(), { art: ["night", "bell", "skull"], flavor: "Ask not for whom. It's Derek." });
C("mirrorcurse", "Bad Mirror", "hex", 1, R, "Copy the target's highest status onto ALL foes.", { cost: [1, 0] }, (x) => x.spreadStatus(), { art: ["night", "mirror", "eye"], flavor: "Seven years' bad luck for everyone in the room." });
C("widdershins", "Widdershins", "hex", 2, R, "Reverse the rest of this brew's luck: fire every ingredient before this again, right to left.", { cost: [2, 1] }, (x) => x.refluxBack(), { art: ["stars", "snake", "moon"], tier: 4, flavor: "Stir the wrong way on purpose. Doors open. Some of them are yours." });

// ---- Gilt ----
C("tinspoon", "Tin Spoon", "gilt", 0, A, "+{p} Potency.", { p: [0.25, 0.5] }, (x, v) => x.pot(v.p), { art: ["vault", "spoon"], flavor: "Silver-plated, by a liar." });
C("purse", "Heavy Purse", "gilt", 1, A, "Deal {d}. {g} gold.", { d: [6, 8], g: [2, 3] }, (x, v) => { x.dmg(v.d); x.gold(v.g); }, { art: ["vault", "pouch", "coin"], flavor: "Wealth, applied to the head." });
C("goldtooth", "Gold Tooth", "gilt", 1, A, "Deal {d}. Ward {w}.", { d: [5, 7], w: [3, 5] }, (x, v) => { x.dmg(v.d); x.ward(v.w); }, { art: ["vault", "tooth"], flavor: "Formerly Grandfather's. Still biting." });
C("bribe", "Bribe", "gilt", 1, A, "Pay 5 gold: Chill ALL {c}, Ward {w}.", { c: [2, 2], w: [6, 9] }, (x, v) => { x.gold(-5); x.chillAll(v.c); x.ward(v.w); }, { art: ["vault", "hand", "coin"], flavor: "Everyone has a price. Yours is low." });
C("coppernail", "Copper Nail", "gilt", 0, A, "Deal {d}. +0.25 Potency.", { d: [2, 3] }, (x, v) => { x.dmg(v.d); x.pot(0.25); }, { art: ["vault", "pin"], flavor: "Bent. Blessed. Bargain bin." });
C("ledger", "Witch's Ledger", "gilt", 1, A, "Instant. Draw {n}, gain {g} gold.", { n: [1, 2], g: [3, 5] }, (x, v) => { x.draw(v.n); x.gold(v.g); }, { art: ["vault", "book"], instant: true, flavor: "Assets: one cauldron. Liabilities: all of it." });
C("alchemist", "Alchemist's Dram", "gilt", 2, A, "+{p} Potency. Ward {w}.", { p: [1, 1.25], w: [5, 7] }, (x, v) => { x.pot(v.p); x.ward(v.w); }, { art: ["vault", "flask"], flavor: "Contains 40% science." });
C("midastouch", "Midas Itch", "gilt", 1, B, "Deal your gold ÷ {m}.", { m: [12, 8] }, (x, v) => x.dmg(Math.floor(x.run.gold / v.m)), { art: ["vault", "hand", "crown"], flavor: "Do not scratch it. Do not scratch anything." });
C("scales", "Fair Scales", "gilt", 1, B, "Deal your Ward.", { cost: [1, 0] }, (x) => x.dmg(x.pward()), { art: ["vault", "scales"], flavor: "Justice is blind, but she can throw." });
C("catalyst", "Silver Catalyst", "gilt", 1, B, "Double Potency. Light. Boil Away.", { cost: [1, 0] }, (x) => x.pot(x.potency), { art: ["vault", "flask", "star"], light: true, boil: true, flavor: "Nobody quite remembers why this works. Don't stop." });
C("goldleaf", "Gold Leaf", "gilt", 0, B, "Next ingredient ×{m}. Light.", { m: [1.5, 2] }, (x, v) => x.nextMul(v.m), { art: ["vault", "leaf"], light: true, flavor: "Everything's better gilded. Including salad." });
C("jackpot", "Jackpot", "gilt", 1, B, "Deal {d} per ingredient fired. {g} gold per 5 fired.", { d: [2, 3], g: [3, 4] }, (x, v) => { x.dmg(v.d * Math.max(1, x.fires)); x.gold(Math.floor(x.fires / 5) * v.g); }, { art: ["vault", "dice", "coin"], flavor: "The house always wins. You are the house now." });
C("cleanser", "Silver Scour", "gilt", 1, B, "Instant. Boil away all Gunk in your hand and pot. Draw that many, plus 1.", { cost: [1, 0] }, (x) => { x.scour(); x.draw(1); }, { art: ["vault", "spoon", "star"], instant: true, flavor: "Scrub, scrub, scrub, and something screams." });
C("secondboil", "Second Boil", "gilt", 2, R, "Instant. After this brew, brew again before foes act. Boil Away.", { cost: [2, 1] }, (x) => x.secondBoil(), { art: ["vault", "kettle", "bubble"], instant: true, boil: true, flavor: "Never trust a recipe that says 'and again'." });
C("philosopher", "Philosopher's Stone", "gilt", 3, R, "+{p} Potency. Reflux 3.", { p: [2, 3] }, (x, v) => { x.pot(v.p); x.reflux(3); }, { art: ["stars", "crystal", "star"], flavor: "Turns lead to gold, and you to a person with a very odd CV." });
C("goldenladle", "Golden Ladle", "gilt", 1, R, "All Potency gained this brew carries into the next.", { cost: [1, 0] }, (x) => x.seedPot(x.potency - 1), { art: ["vault", "spoon", "crown"], flavor: "Saves the best bit for later, like a person with a plan." });
C("infinityloop", "Klein Bottle", "gilt", 2, R, "This brew's Reflux may nest two levels deeper.", { cost: [2, 1] }, (x) => x.deeper(2), { art: ["stars", "flask", "snake"], tier: 5, flavor: "Pours into itself. Label is on both sides. There is one side." });

// ---- Gunk and curses: not offered as rewards ----
C("gunk", "Gunk", "gunk", 1, "curse", "Does nothing. Boil Away.", {}, () => { }, { art: ["swamp", "bubble"], boil: true, flavor: "Technically food." });
C("regret", "Regret", "gunk", 1, "curse", "Lose 1 HP when it fires.", {}, (x) => x.lose(1), { art: ["swamp", "skull"], flavor: "Sits at the bottom of every pot." });
C("mildew", "Mildew", "gunk", 0, "curse", "Does nothing. Light.", {}, () => { }, { art: ["swamp", "leaf"], light: true, flavor: "It spreads. It's fine. It's fine." });

export const REWARDABLE = Object.values(CARDS).filter((c) => ["common", "uncommon", "rare"].includes(c.rar));

/** Resolved numbers for a card at an upgrade level. */
export function cardVals(card, up) {
    const out = {};
    for (const k in card.vals) out[k] = card.vals[k][up ? 1 : 0];
    return out;
}
export function cardCost(card, up) {
    return card.vals.cost ? card.vals.cost[up ? 1 : 0] : card.cost;
}
/** The rules text with its numbers filled in. */
export function cardText(card, up) {
    const v = cardVals(card, up);
    return card.text.replace(/\{(\w+)\}/g, (_, k) => v[k]);
}
