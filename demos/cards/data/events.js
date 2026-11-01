// Random events. Each choice runs against the api in sim.js and returns the punchline.
export const EVENTS = [
    { id: "cat", title: "A Cat, Sitting", art: "cat", text: "A black cat sits on the stairs and regards you with the mild contempt of a landlord.",
      choices: [
        { label: "Pet the cat", note: "Lose 6 HP. Gain a trinket.", run: (a) => { a.hurt(6); a.trinket("common"); return "It allows this for four seconds, bites you, and coughs up something valuable. You have never felt so chosen."; } },
        { label: "Bow respectfully", note: "Heal 8.", run: (a) => { a.heal(8); return "The cat blinks, slowly. Somehow this is the kindest thing anybody has done for you all year."; } },
        { label: "Step over it", note: "Nothing happens. Probably.", run: (a) => { a.curse("regret"); return "You step over the cat. Nothing happens. Nothing has ever felt so much like something happening. (Regret added.)"; } },
      ] },
    { id: "kettle", title: "The Talking Kettle", art: "kettle", text: "\"Psst,\" says a kettle. \"I can make any recipe twice as good. I just need something of yours. Nothing important. Only a card. Or a memory. Mostly a card.\"",
      choices: [
        { label: "Give it a card", note: "Remove a card, then Refine a card.", run: (a) => { a.pickRemove(); a.pickUpgrade(); return "It swallows the card with a long, satisfied whistle, then polishes one of your others with its spout."; } },
        { label: "Tell it to pipe down", note: "Gain 30 gold.", run: (a) => { a.gold(30); return "It sulks and spits out your change, then a little more, to make you feel bad."; } },
      ] },
    { id: "librarian", title: "Late Fees", art: "book", text: "A ghost in half-moon spectacles presents an invoice for a book you did not borrow, in 1422, plus interest.",
      choices: [
        { label: "Pay up", note: "Lose 50 gold. Gain a rare card.", can: (r) => r.gold >= 50, run: (a) => { a.gold(-50); a.rareCard(); return "She stamps your hand. The stamp will not wash off. She slips you the book anyway, and winks a hollow socket."; } },
        { label: "Argue the statute of limitations", note: "Lose 9 HP. Gain 50 gold.", run: (a) => { a.hurt(9); a.gold(50); return "You win on a technicality and lose on a stapler. She refunds the interest with force."; } },
        { label: "Hide behind a pillar", note: "Leave.", run: () => "You have been behind this pillar for an hour. She knows. She will always know." },
      ] },
    { id: "mushroom", title: "A Polite Mushroom", art: "mushroom", text: "A mushroom in a tiny waistcoat offers you itself. \"Please,\" it says. \"I've read the reviews.\"",
      choices: [
        { label: "Eat it raw", note: "Max HP +6.", run: (a) => { a.maxHp(6); return "Earthy, with notes of regret and a long finish. You feel taller. The waistcoat is, regrettably, also food."; } },
        { label: "Boil it down", note: "Gain Death Cap.", run: (a) => { a.addCard("deathcap"); return "It sings a brief aria as it goes under. Nobody claps. You feel you should have clapped."; } },
      ] },
    { id: "mirror", title: "The Honest Mirror", art: "mirror", text: "The mirror says: \"Your deck is bloated, your hat is crooked, and your eyebrows have been different lengths since Tuesday.\"",
      choices: [
        { label: "Cut something from the deck", note: "Remove a card.", run: (a) => { a.pickRemove(); return "You throw it out. The mirror nods. You straighten your hat. The eyebrows remain a matter of public record."; } },
        { label: "Punch the mirror", note: "Lose 5 HP. Gain Bad Mirror.", run: (a) => { a.hurt(5); a.addCard("mirrorcurse"); return "Seven years' bad luck, but for other people, if you're careful with the shards."; } },
      ] },
    { id: "rats", title: "Rat Union Meeting", art: "rat", text: "Forty rats at tiny desks look up. The chair clears her throat: \"Motion to let the witch pass, in exchange for a card of solidarity.\"",
      choices: [
        { label: "Join the union", note: "Gain Pocket Rat. Lose 20 gold in dues.", can: (r) => r.gold >= 20, run: (a) => { a.gold(-20); a.trinketId("familiarrat"); return "You are issued a very small card and a very large grievance. Solidarity forever."; } },
        { label: "Cross the picket line", note: "Gain 40 gold. Add a Mildew.", run: (a) => { a.gold(40); a.curse("mildew"); return "They don't stop you. They just remember. Somebody has written your name on a very small list."; } },
      ] },
    { id: "wishing", title: "The Wishing Well", art: "drop", text: "A well with a sign: WISHES 10 GOLD, NO REFUNDS, NO LOVE, NO RAISING THE DEAD, NO, NOT EVEN GARY.",
      choices: [
        { label: "Toss a coin", note: "Lose 10 gold. Heal 15.", can: (r) => r.gold >= 10, run: (a) => { a.gold(-10); a.heal(15); return "You wish you felt better. The well says \"sure\" in the tone of someone who has heard worse."; } },
        { label: "Fish the coins out", note: "Gain 45 gold. Lose 7 HP.", run: (a) => { a.gold(45); a.hurt(7); return "The well bites. You did not know wells could. It's in the small print, which you now notice is on your hand."; } },
        { label: "Wish for Gary", note: "???", run: (a) => { a.addCard("moonpull"); return "A long silence. Then, from far below, the faintest \"...hello?\" Everything comes back eventually. You receive Moon Pull."; } },
      ] },
    { id: "bees", title: "Spectral Bees", art: "star", text: "Ghost bees surround a ghost hive. They do not sting. They merely make you aware of everything you have ever done wrong.",
      choices: [
        { label: "Steal the ghost honey", note: "Gain a random rare card. Take 8.", run: (a) => { a.hurt(8); a.rareCard(); return "It tastes like the memory of summer. Your conscience hums at a low, accusing frequency."; } },
        { label: "Apologise to the bees", note: "Refine 1 random card.", run: (a) => { a.upgradeRandom(1); return "You list your crimes for an hour. The bees listen. You feel lighter. One of your recipes seems sharper for it."; } },
      ] },
    { id: "merchant", title: "A Suspicious Hat", art: "hat", text: "A hat on a stool says it is a travelling merchant. It has only the one item, and it's wearing it.",
      choices: [
        { label: "Trade Max HP for the deal", note: "Max HP -5. Gain a trinket.", run: (a) => { a.maxHp(-5); a.trinket("uncommon"); return "\"Pleasure,\" says the hat, and you feel a slight draught where some of your constitution used to be."; } },
        { label: "Try it on", note: "Add Regret. Gain 80 gold.", run: (a) => { a.curse("regret"); a.gold(80); return "It fits. It knows things. It keeps telling you them. It has also, inexplicably, been paying rent."; } },
        { label: "Compliment the hat", note: "Heal 5.", run: (a) => { a.heal(5); return "\"Finally,\" it sighs. \"Someone with taste.\" You feel oddly better for having been polite to millinery."; } },
      ] },
    { id: "brewer", title: "Rival Witch's Pot", art: "flask", text: "Somebody has left a cauldron on a low simmer with a note: DO NOT TOUCH. - Beryl. You have known Beryl for years. You touch.",
      choices: [
        { label: "Taste it", note: "Upgrade 2 random cards. Lose 10 HP.", run: (a) => { a.hurt(10); a.upgradeRandom(2); return "Oh. Oh, that's annoyingly good. You hate Beryl. You also write down the recipe."; } },
        { label: "Season it wrong, on purpose", note: "Gain Small Print.", run: (a) => { a.addCard("pact"); return "A pinch of salt too many. Somewhere, far away, Beryl sits up in bed and doesn't know why."; } },
      ] },
    { id: "ghostcook", title: "The Ghost Sous-Chef", art: "spoon", text: "A translucent man in a tall hat weeps into a bowl. \"Nobody,\" he says, \"appreciates the reduction.\"",
      choices: [
        { label: "Appreciate the reduction", note: "Gain Golden Ladle.", run: (a) => { a.addCard("goldenladle"); return "You nod for twenty minutes about mouthfeel. He presses a ladle into your hand and fades, finally understood."; } },
        { label: "Ask if it's gluten free", note: "Lose 8 HP. Gain 35 gold.", run: (a) => { a.hurt(8); a.gold(35); return "He throws the bowl. Then, in shame, his wallet."; } },
      ] },
    { id: "stairs", title: "An Extra Staircase", art: "key", text: "This staircase wasn't here yesterday, and it's sorry about that. A note on the first step reads: SHORTCUT (MOSTLY).",
      choices: [
        { label: "Take the shortcut", note: "Gain 60 gold. Lose 12 HP.", run: (a) => { a.gold(60); a.hurt(12); return "There are more stairs going down than going up. Physics apologises and pays you in loose change."; } },
        { label: "Rest on the first step", note: "Heal 12.", run: (a) => { a.heal(12); return "You sit. The staircase, touched, adjusts itself to suit your back."; } },
      ] },
    { id: "skull", title: "The Skull Who Knows", art: "skull", text: "A skull on a shelf says, \"Ask me anything,\" then, before you can, \"It's the third cup. It was always the third cup.\"",
      choices: [
        { label: "Drink from the third cup", note: "Transform a random card.", run: (a) => { a.transform(1); return "You don't know what you were expecting. It tastes of the third cup. One of your cards has changed its mind."; } },
        { label: "Take the skull with you", note: "Gain a trinket. Add Regret.", run: (a) => { a.trinket("uncommon"); a.curse("regret"); return "It talks all the way up. It knows every ending. It is not good at keeping them to itself."; } },
        { label: "Leave it on the shelf", note: "Leave.", run: () => "\"Suit yourself,\" says the skull. \"You'll be back. Well. Someone will.\"" },
      ] },
    { id: "sock", title: "One Sock", art: "pouch", text: "One sock, exactly your size, on a pedestal, in a beam of light. A choir starts to sing, then trails off, unsure.",
      choices: [
        { label: "Wear the sock", note: "Max HP +4. Add Mildew.", run: (a) => { a.maxHp(4); a.curse("mildew"); return "It's warm. It's damp. It is somehow both of those on purpose. You feel more resilient and less hygienic."; } },
        { label: "Search for the other sock", note: "Gain a card reward.", run: (a) => { a.cardReward(); return "You never find it. Instead you find something else, and a deep understanding of loss."; } },
      ] },
    { id: "owl", title: "An Owl With Questions", art: "feather", text: "\"Who?\" says the owl. You give your name. \"Who?\" it says again. Fifteen minutes later you are questioning your whole career.",
      choices: [
        { label: "Have a long think", note: "Remove a card. Lose 6 HP.", run: (a) => { a.hurt(6); a.pickRemove(); return "You realise you've never liked that ingredient. You only kept it because your mother did. The owl says nothing, supportively."; } },
        { label: "Say \"you\"", note: "Gain 25 gold.", run: (a) => { a.gold(25); return "The owl stops. Its eyes widen. It has never been asked. It drops a purse and flees, deep in thought."; } },
      ] },
    { id: "moonlight", title: "Moonlit Landing", art: "moon", text: "The moon comes in through a window that doesn't exist on the outside. It seems a shame to walk past it.",
      choices: [
        { label: "Bathe in the moonlight", note: "Heal 30% of Max HP.", run: (a) => { a.heal(Math.round(a.run.maxHp * 0.3)); return "You stand there like a fool for ten minutes, and it works, which is the strangest part."; } },
        { label: "Bottle some", note: "Gain Blood Moon.", run: (a) => { a.addCard("bloodmoon"); return "It takes a very long time to fill a bottle with moonlight, and even longer to explain it at customs."; } },
      ] },
    { id: "gambler", title: "A Skeleton Dealing Cards", art: "dice", text: "\"Double or nothing,\" rattles the skeleton. \"I've nothing left to lose, as you can see.\"",
      choices: [
        { label: "Bet 40 gold", note: "Coin flip for 100.", can: (r) => r.gold >= 40, run: (a) => { if (a.flip()) { a.gold(60); return "You win. He pays up, and takes it very well, on account of having no face to fall."; } a.gold(-40); return "You lose. He tips a hat he doesn't have. You wonder when he got the ace, then where he's keeping it."; } },
        { label: "Bet a finger", note: "Lose 5 Max HP. Gain a rare card.", run: (a) => { a.maxHp(-5); a.rareCard(); return "\"Good one,\" he says, adding it to his collection. \"I was short of a pinky.\""; } },
        { label: "Decline", note: "Leave.", run: () => "\"Wise,\" he says, and shuffles. It sounds exactly like his own knees." },
      ] },
    { id: "painting", title: "Portrait of a Witch", art: "eye", text: "A painted witch watches you pass. She mouths one word, and you can tell it isn't \"hello\". She points to a loose brick.",
      choices: [
        { label: "Pull the brick", note: "Gain a trinket, then fight it.", run: (a) => { a.trinket("common"); a.fight(["imp", "imp"]); return "Treasure! And its two small, indignant owners. The painting smiles for the first time in 300 years."; } },
        { label: "Mouth something back", note: "Add Regret. Refine 1 card.", run: (a) => { a.curse("regret"); a.pickUpgrade(); return "She gasps. You didn't know oil paint could. Nobody has spoken to her like that since the Duke."; } },
      ] },
    { id: "tinker", title: "Tinker Gnome, Retired", art: "scales", text: "\"I'll swap you,\" says the gnome, \"one thing for another thing, like the old days, before all this magic and gold.\"",
      choices: [
        { label: "Swap two cards", note: "Transform 2 random cards.", run: (a) => { a.transform(2); return "He rummages, sniffs them, and pays you back in something roughly the same size. \"No returns,\" he says, from inside a bucket."; } },
        { label: "Buy him a tea", note: "Lose 15 gold. Gain a common trinket.", can: (r) => r.gold >= 15, run: (a) => { a.gold(-15); a.trinket("common"); return "He tells a long story with no ending, then gives you the thing he's been meaning to get rid of since the war."; } },
      ] },
    { id: "beryl", title: "Beryl Herself", art: "hat", text: "A witch blocks the stairs. \"Have you been at my pot?\" Beryl has a ladle and thirty years of unresolved bakesale tension.",
      choices: [
        { label: "Deny everything", note: "Fight, and gain a rare card.", run: (a) => { a.fight(["ghoul"]); a.rareCardLater(); return "\"LIAR,\" she shrieks. A ghoul in an apron climbs out of her handbag. Beryl has friends, and they all owe her."; } },
        { label: "Admit it, and compliment the broth", note: "Heal 10. Gain 20 gold.", run: (a) => { a.heal(10); a.gold(20); return "She softens. She adjusts your hat. \"Bit more salt next time,\" she says, and presses money into your hand, as nans do."; } },
      ] },
];
