# Pogo: start here

Pogo is a dependency-free 2D + 3D web game framework. Games run on phones first and scale to desktop. This repo holds the framework and a complete, tested game for almost every genre.

**Don't start from a blank file.** Whatever you're asked to build, one of these games is probably closer than you think. Forking one gets you controls, menus, saving, sound, haptics, phone layouts and test bots that took hours to get right. Your job is usually to change the theme, content and a few rules.

| Read | When |
|---|---|
| This file | First. It picks your starting point and tells you how to change it. |
| [docs/API.md](docs/API.md) | Before writing game code. The full framework reference, also copied into every game as `AGENTS.md`. |
| `dist/pogo.d.ts` | For exact types. `dist/pogo.js` is unminified and readable. |

## Workflow

1. **Name the archetype.** Turn the request into a well-known game. "Something where you stack cats" is Suika or Tetris. "A cosy shop game" is Diner Dash or Stardew Valley. If it's a mix, name both.
2. **Pick the best fit.** Use [the catalogue](#the-catalogue), or search it: `pogo list stealth`. Choose by **core loop and controls** first, then camera, and theme last. Theme is the cheapest thing to change. A pirate racing game is a reskin of the kart racer, not a new game.
3. **Fork it.** `pogo new games/mygame --from kart`. This copies the game with the latest framework. Keep new games two folders below the repo root, like `games/mygame`, so the test tools still find their dependencies.
4. **Run it before changing anything.** `pogo check games/mygame/game.js`, then `pogo serve games/mygame`. Run its bot from `tools/`. You now know what passing looks like.
5. **Read its notes below**, then its data files. Most games keep content in tables, separate from rules.
6. **Make it yours first.** Do [the checklist](#after-forking) before anything else, so nothing ships with the old name or shares the old save.
7. **Change in this order, testing between each:** content tables, then art and sound, then rules, then new mechanics. Rewrite the core loop only if the request truly needs it.
8. **Prove it.** Use the [definition of done](#definition-of-done).

Only reach for `pogo new mygame` with no `--from` for a small toy or when nothing fits. For a very small game, `examples/hopper.js` (2D) and `examples/laneblast.js` (3D) are short, readable starting points.

## The catalogue

Every folder is in `demos/`. "Maps to" names the well-known game or genre, so you can match a request quickly. Only use those names to choose a template: never copy a commercial game's name, characters, art or music.

| Folder | Game | Maps to | View | Controls |
|---|---|---|---|---|
| `platformer` | Puddle Pip | Super Mario: 2D platformer | 2D side | Stick, jump |
| `tooth` | Hollow Tooth | Hollow Knight, Metroid: metroidvania | 2D side | Stick, buttons |
| `brawl` | Lunch Lady Riot | Streets of Rage: beat 'em up | 2D side | Stick, buttons |
| `fight` | Kitchen Knockout | Street Fighter: versus fighter | 2D side | Pad, one-tap specials |
| `shooter` | Gnome Man's Land | Doom: first-person shooter | 3D first person | Stick, look, fire |
| `horror` | Night Shift at the Doll Factory | Five Nights at Freddy's, Slender: horror | 3D first person | Stick, look |
| `twin` | Robovac Rampage | Geometry Wars: twin-stick arena | 3D top-down | Two sticks |
| `swarm` | Deep Trouble | Vampire Survivors: survivor | 2D top-down | One stick |
| `bullet` | Moth to a Flame | Touhou: bullet hell | 2D vertical | Relative drag |
| `stealth` | Cat Burglar | Metal Gear, Mark of the Ninja: stealth | 2D top-down | Drag, tap |
| `kart` | Shopping Cart GP | Mario Kart: kart racer | 3D chase | Drag or buttons |
| `runner` | Ostrich Getaway | Subway Surfers: endless runner | 3D chase | Swipes |
| `plane` | Paper Plane Postman | Pilotwings: flight and exploration | 3D chase | Drag |
| `golf` | Crazy Putt Volcano | Mini golf, Golf It: physics sport | 3D | Pull back |
| `soccer` | Goat Soccer | Sensible Soccer: team sports | 3D broadcast | Stick, two buttons |
| `flock` | BAARK! | Pikmin, sheepdog herding: crowd control | 3D top-down | One stick |
| `tumble` | Tumble Keep | Angry Birds: physics destruction | 2D side | Pull back |
| `merge` | Hibernook | Suika Game: drop and merge | 2D side | Drag, drop |
| `match` | Sugar Crash | Candy Crush: match-3 | 2D board | Swipe |
| `blocks` | Stack Attack | Tetris: falling blocks | 2D board | Drag, tap, flick |
| `snow` | Snowplow | Sokoban: logic puzzle | 3D diorama | Swipe |
| `escape` | Last Train Home | Rusty Lake, The Room: point and click | 2D scenes | Tap, drag |
| `chess` | Lamplight | Chess: tactile board game | 3D table | Drag, tap |
| `tactics` | Squad Goals | Into the Breach: grid tactics | 3D diorama | Tap |
| `crypt` | Crypt Keeper's Day Off | Hoplite, Pixel Dungeon: roguelike | 2D grid | Tap, swipe |
| `cards` | Hex & Cards | Slay the Spire: deck-builder | 2D cards | Drag |
| `autobattle` | Pet Shop Brawl | Super Auto Pets: auto-battler | 2D | Drag |
| `rpg` | Office Quest | Pokemon: creature RPG | 2D top-down | Drag, tap |
| `garden` | Gran's Garden Wall | Plants vs Zombies, Bloons: tower defense | 2D top-down | Drag from tray |
| `ants` | Ant Wars | Pikmin, StarCraft: real-time strategy | 2D top-down | Paint trails |
| `city` | Tiny Tide Town | Islanders, Townscaper: city builder | 3D diorama | Tap, pinch |
| `farm` | Moonpatch | Stardew Valley: farming | 2D top-down | Drag sweeps |
| `ramen` | Ramen Rush | Diner Dash, Overcooked: cooking and tycoon | 2D counter | Drag, tap |
| `idle` | Cosmic Yard Sale | Cookie Clicker: idle clicker | 2D | Tap |
| `beat` | Beat Goblin | Taiko no Tatsujin: rhythm | 2D | Tap zones |
| `panic` | Five Second Panic | WarioWare: party microgames | 2D | Everything |

### Requests that don't match a row

| Request | Start from | Change |
|---|---|---|
| Flappy Bird | `runner` for 3D, `platformer` for 2D | One button, gravity and gates as chunks or a level |
| Breakout, Pong | `tumble` | Keep the physics, replace the sling with a paddle |
| Pinball | `tumble` or `golf` | Add flippers to the physics |
| Snake, Pac-Man | `stealth` | Grid movement and its chase logic |
| Asteroids, Space Invaders | `bullet` or `twin` | Patterns and waves |
| Checkers, Othello, Connect Four | `chess` | Replace `engine.js`, keep the table and piece feel |
| Solitaire, Poker | `cards` | Keep the card handling, replace `sim.js` |
| Wordle, trivia, quiz | `panic` or `match` | One screen of state, a big reveal |
| Minesweeper, 2048, Sudoku | `match` | Keep the board view, replace the engine |
| Visual novel | `escape` | Scenes, with text and choices in place of puzzles |
| Dating sim, life sim | `farm` | Its ghost relationships, gifts and days |
| Fishing, gathering | `farm` | Start from `pond.js` |
| Battle royale, online multiplayer | Stop and say so | Pogo has no networking. Offer same-device play or bots |

Same-device two player already exists in `fight`, `blocks`, `soccer`, `golf` and `chess`.

## After forking

Do these first:

- [ ] Rename the game: `<title>` in `index.html`, title screen art and text, and credits.
- [ ] **Change every save key.** Search for `game.save(` and `game.load(`. Games on the same site share browser storage, so a fork with the same keys overwrites the original's saves.
- [ ] Replace `shots/hero.png` once your game looks different. Delete old `shots/`.
- [ ] Replace story text, character names and in-jokes, even ones you don't think will show.
- [ ] Update test bots whose assertions name old content.
- [ ] If you won't maintain a tool in `tools/`, delete it rather than leave it failing.

Each game has its own copy of `pogo.js`. To upgrade one, copy `dist/pogo.js` and `dist/pogo.d.ts` into it, then rerun its tests.

## Making your own art

All the art here is made in code, so you don't need image files. You can't see your work directly, so the loop is what matters: **draw, run `pogo shot`, open the image and look at it, then fix it.** Do this at phone and desktop size. If a screenshot wouldn't make someone want to play, the art isn't done.

### Choose a style first

Pick one style and a palette of 5 to 8 colors before you draw anything. Consistency beats detail, and an obvious style hides limits.

| Style | Technique | Copy from |
|---|---|---|
| Polished cartoon with outlines | `assets.paint`, gradient body, `outline()`, `shade()` | `merge/art.js`, `fight/paint.js` |
| Thick ink and pop art | Painted spans with halftones | `panic/ink.js`, `beat/art/ink.js` |
| Soft and glossy, like candy or jelly | Signed distance shapes written to `p.data` | `match/sdf.js` |
| Retro pixel art | `assets.pixels`, or low-res paint with `pixelArt: true` | `farm/pix.js`, `platformer/art.js` |
| Painted storybook | Layered paint with detail in `p.data` | `garden/paint.js`, `stealth/bake.js` |
| Luminous and neon | Simple shapes in `d.additive` on dark backgrounds | `bullet/art.js` |
| Voxel 3D | `assets.voxels` | `flock/models.js`, `flock/vox.js` |
| Low-poly 3D | Merged custom meshes with vertex colors | `kart/meshkit.js`, `twin/meshkit.js` |
| Realistic objects | `assets.lathe` with `shine`, plus `softShadows` | `chess/meshes.js`, `chess/world.js` |
| Papercraft | Flat-shaded folded meshes | `plane/paper.js` |
| Puppet characters | Painted parts on a rig | `fight/puppet.js`, `brawl/puppet.js` |

### Rules that make code art look good

- **Silhouette first.** Fill the character in black. If it isn't recognisable, no detail will save it.
- **Exaggerate.** Big heads, big eyes, big hands and strong poses read on a phone. Characters are small on screen, so a face is often their whole personality.
- **Light from one direction**, for every object. Add a contact shadow under anything that stands on something.
- **Separate the layers.** The foreground should be brighter and more saturated than a calmer background. If you can't spot the player in a screenshot in one second, fix the contrast.
- **Outline characters** in a darker shade of their own color, not pure black.
- **Paint at 2 to 4 times display size** with `smooth: true`. For pixel art, paint small and set `pixelArt: true`.
- **Animate cheaply.** Squash and stretch through `e.scale` tweens, two-frame blinks and bobbing on the beat all add life for almost no art.
- **Give big scenes texture.** Use speckle, gradients, soft shadows and small props. Flat color looks unfinished.
- **Letters are art too.** Draw title text as painted shapes with a thick outline, as `beat/art/font.js` and `kart/meshkit.js` do. System fonts look like a prototype.

### Keeping it fast

- Painting blocks startup. Bake to one sheet, and use `assets.wait` to paint over several frames with a loading bar, as `garden/game.js` does.
- Every painter call parses its color, so write to `p.data` for detailed art at 128px and up.
- Draw swarms with `d.quads` from one sheet. Each texture change is a draw call.
- Merge static 3D scenery into one mesh. Check `game.renderer.stats`, and stay near 100 draw calls for phones.

### Sound and feel

You can't hear what you write, so keep music simple. Use real chord progressions, keep the volume low enough to loop, and verify what you can with numbers, as `beat/tools/verify-songs.mjs` does. Pair every custom sound with a haptic: `game.sfx(tone, { haptic: "medium" })`. Make every action give sound, motion, particles and a pulse together.

## Parts worth stealing

If you need one system rather than a whole game, copy it:

| Need | Take |
|---|---|
| Tile collider, coyote time and jump feel | `tooth/physics.js`, `platformer/physics.js` |
| Rigid bodies: rotation, stacking, breaking | `tumble/physics.js` |
| 3D ball on sloped surfaces | `golf/sim.js`, `golf/course.js` |
| Spline tracks with height | `kart/track.js` |
| Mesh building, 3D text | `kart/meshkit.js` |
| Rhythm clock, smoothing and calibration | `beat/clock.js`, `beat/scenes/calibrate.js` |
| Music theory, chords and arrangement | `beat/music/` |
| AI search in a Worker, with a time-sliced fallback | `chess/ai.js`, `chess/worker.js` |
| Lift, drag and drop with weight | `chess/world.js`, `cards/ui/cardview.js` |
| Reliable phone gestures | `blocks/gestures.js` |
| Custom on-screen game pad | `fight/pad.js` |
| Flow fields and thousands of agents | `ants/sim.js` |
| Vision cones and guard suspicion | `stealth/sim.js` |
| Level solvers | `snow/solver.js`, `tactics/solver.js` |
| Scene transitions | `panic/wipes.js` |
| Ghost replays | `kart/`, `soccer/replay.js` |

## How to tweak each game

Most newer games keep rules in a headless `sim.js` or `engine.js` with no drawing, and bots test it directly. Keep that separation. Names in capitals are tables to edit.

### Action

**`platformer`, Puddle Pip.** Best for any level-based run-and-jump game. Levels are text maps in `levels.js` (`LEVELS`, `WORLDS`, `MAP_NODES`). Reskin in `art.js` (`PIP`, `THEMES`). Tune jump feel in `physics.js`. New enemies go in `game.js`. Gaps in the levels are designed from the numbers `tools/measure.mjs` prints, so rerun it if you change movement, then prove the levels with `tools/bot.mjs`.

**`tooth`, Hollow Tooth.** Best for exploration gated by abilities. Rooms are in `map.js`, areas in `world.js` (`AREAS`), and NPCs, bosses and tools in `story.js`. Boss patterns are in `actors.js` (`BOSS_DEF`, `SCRIPTS`). If you change abilities or doors, run `tools/solve.mjs`, which proves every room is reachable in order. For a shorter game, cut whole areas rather than thinning them all.

**`brawl`, Lunch Lady Riot.** Best for crowds of melee enemies. Heroes, enemies, weapons and stages are in `data.js`, and bosses in `bosses.js`. Moves and combos are in `sim.js`. Characters are puppets: change the look in `art.js` and `puppet.js`. Run `tools/playthrough.mjs`.

**`fight`, Kitchen Knockout.** Best for one-on-one duels. Fighters and frame data are in `fighters.js` (`FIGHTERS`, `TUNE`), with looks in `art.js` and `puppet.js`, and stages in `stages.js`. AI is in `ai.js`. It must never read inputs, and `tools/sim-test.mjs` checks that. After any move change, run `tools/balance.mjs`. Some matchups are still lopsided.

**`shooter`, Gnome Man's Land.** Best for corridor shooters. Levels are in `levels.js`, and weapons, enemies and pickups are tables at the top of the long `game.js`. Art and themes are in `art.js`. Run `tools/mapcheck.mjs` after editing a level, and `tools/e2e.mjs` for real mouse and touch.

**`horror`, Doll Factory.** Best for tension and hide-and-seek. The map and nights are in `data.js` (`MAP`, `NIGHTS`). The rules are in `sim.js`, the look in `world.js` and the ending in `ending.js`. Keep the gentle mode and warning. `tools/rules.mjs` and `tools/fair.mjs` prove the rules stay fair.

**`twin`, Robovac Rampage.** Best for arena shooters in 3D. Weapons, enemies, upgrades and waves are in `data.js`, with rooms in `rooms.js`, furniture in `furniture.js` and models in `models.js`. Run `tools/bot.mjs`. The nursery room is hard for weak players.

**`swarm`, Deep Trouble.** Best for auto-attack survival. `game.js` has `ZONES`, `TYPES`, `WEAPONS` and `PASSIVES`. Art is in `art.js`. It draws its own batch, so keep it that way. Run `bot.mjs` for balance and `perf.mjs` for speed.

**`bullet`, Moth to a Flame.** Best for patterns and dodging. Stages and patterns are in `stages.js`, with bullet logic in `bullets.js`, and bosses in `bosses.js`. Bursts land on the song grid, so if you change a song in `music.js`, recheck the stage. `tools/bot.mjs` proves there is always a gap.

**`stealth`, Cat Burglar.** Best for sneaking and heists. Levels are in `levels.js` (`HEISTS`, `BUILDINGS`), and guards and perks are in `sim.js`. The cat is in `art.js`. `tools/solve.mjs` proves each level can be done unseen, so run it after any map edit.

### Racing, flying and sports

**`kart`, Shopping Cart GP.** Best for anything that races: boats, bikes, horses. Tracks are short spline lists in `tracks.js`, racers and classes in `data.js`, scenery in `scenery.js` (`THEMES`) and items in `world.js` (`ITEM_TABLE`). Handling is in `kart.js`, so change that last. Run `tools/trackcheck.mjs` after editing a track.

**`runner`, Ostrich Getaway.** Best for endless reaction games. Change the character, chunks and biomes, and let the bot prove new chunks are passable at top speed.

**`plane`, Paper Plane Postman.** Best for calm exploration with free movement. Letters, people, planes, stamps and trials are in `data.js`. The town is in `town.js`, and the handling in `flight.js`. It's the heaviest renderer here, so remove detail before adding it. Run `tools/reach.mjs`.

**`golf`, Crazy Putt Volcano.** Best for aim-and-shoot physics. Holes are in `holes.js`, surfaces in `course.js` (`MAT`), and ball skins in `models.js`. Run `tools/solve.mjs` for par and `tools/stuck.mjs` so no ball gets trapped.

**`soccer`, Goat Soccer.** Best for team sports. Clubs, venues and modes are in `data.js`, team tactics in `ai.js` (`STYLES`), and rules in `sim.js`. To make hockey or basketball, change pitch, goals and rules in `sim.js` and `world.js`. Run `tools/balance.mjs`.

**`flock`, BAARK!** Best for moving a crowd by pressure. Levels are in `levels.js`, voxel models in `models.js`, ground in `terrain.js` and animal behaviour in `world.js`. Run `botrun.mjs`.

### Puzzle

**`tumble`, Tumble Keep.** Best for anything that collapses. Levels are in `levels.js`. Materials, ammo and defenders are in `sim.js` (`MATS`, `AMMO`, `DEFENDERS`). The solver in `physics.js` is deterministic, so don't add `Math.random`. Star targets are in `par.js` and go stale when levels change. Rerun `tools/bot.mjs` after level edits.

**`merge`, Hibernook.** Best for drop-and-combine games. Species are in `art.js` (`SPECIES`), with sizes and spawn odds in `game.js` (`RADII`, `SPAWN`). To reskin, replace the chain from smallest to largest. Run `test.mjs`, and `stress.mjs` for big piles.

**`match`, Sugar Crash.** Best for swap and board puzzles. Levels are in `levels.js`, rules in `engine.js`, and candy art in `art.js` and `sdf.js`. The monster and newspaper meta game are in `monster.js`, `world.js` and `news.js`, and are easy to replace with another reward. Run `tools/deadlock.mjs` and `tools/ramp.mjs`.

**`blocks`, Stack Attack.** Best for grid-stacking and versus puzzles. Pieces and timing are in `engine.js` (`SHAPES`, `TIMING`), rivals in `rivals.js`, and art in `art.js`. Leave `gestures.js` alone unless you have a reason: it took real tuning. Run `tools/rules.mjs` and `tools/gesture-fuzz.mjs`.

**`snow`, Snowplow.** Best for push-block and logic puzzles. Mechanics are in `rules.js`, and level sections in `puzzles.js` and `levels.js`. `tools/check.mjs` solves every level and proves its idea is needed. Update `solutions.js` when levels change.

**`escape`, Last Train Home.** Best for story-led puzzles and point-and-click. See the folder's own notes once finished.

### Strategy

**`chess`, Lamplight.** Best for any board game with physical pieces. For a new game, replace `engine.js`, keep `world.js` for the lift and drop, and reshape pieces in `meshes.js` (`PROFILES`, `SETS`). AI personalities are in `ai.js` (`CLUB`). Replace the AI's search too. Chess rules are verified by `tools/perft.mjs`.

**`tactics`, Squad Goals.** Best for small turn-based battles. Battles are in `missions.js`, and classes and enemies in `data.js`. Rules are deterministic in `sim.js`. Run `tools/solveall.mjs` after any change, since each mission is meant to be solvable without luck.

**`crypt`, Crypt Keeper's Day Off.** Best for quick turn-based dungeon runs. See the folder's own notes once finished.

**`cards`, Hex & Cards.** Best for deck, hand and combo games. Content is in `data/`: `cards.js`, `enemies.js`, `events.js`, `trinkets.js`, with reactions in `rules.js`. Rules are in `sim.js`, and card art in `art/`. Keep runs seeded. Run `tools/test.mjs`, then `tools/balance.mjs` to find broken or dead cards.

**`autobattle`, Pet Shop Brawl.** Best for build-a-team games. See the folder's own notes once finished.

**`rpg`, Office Quest.** Best for story RPGs and creature collecting. See the folder's own notes once finished.

**`garden`, Gran's Garden Wall.** Best for placing defenses. Defenders, pests, bosses, seasons, levels and the upgrade tree are in `data.js`. Rules are in `sim.js`. Run `tools/mapcheck.mjs`, `tools/campaign.mjs` and `tools/endless.mjs`.

**`ants`, Ant Wars.** Best for large armies with simple commands. Castes, food and chambers are in `data.js`, missions in `story.js`, maps in `maps.js`, and AI in `ai.js` (`STRATEGIES`). Run `tools/campaign.mjs` and `tools/ladder.mjs`.

**`city`, Tiny Tide Town.** Best for placement puzzles with neighbour bonuses. See the folder's own notes once finished.

### Life, management and music

**`farm`, Moonpatch.** Best for gentle routines and relationships. Crops, fish, dishes, buildings, ghosts and letters are all in `data.js`, and the day cycle is in `sim.js`. Keep it free of fail states. Run `tools/year-bot.mjs` so the economy and story can't stall.

**`ramen`, Ramen Rush.** Best for order-rush games. Recipes, toppings, locations, staff, regulars and shifts are in `data.js`, and timing is in `sim.js` (`TUNE`). The cooking actions are in `stage.js`. To make a coffee shop or bakery, replace the steps and art. Run `tools/bot.mjs`.

**`idle`, Cosmic Yard Sale.** Best for number-go-up games. See the folder's own notes once finished.

**`beat`, Beat Goblin.** Best for anything timed to music. Songs are in `music/songs.js`, charts in `charts.js` (`CHARTS`), the tour in `story.js`, and hit windows in `engine.js` (`WINDOWS`). Never time gameplay from steps. Run `tools/verify-songs.mjs` and `tools/verify-charts.mjs`.

**`panic`, Five Second Panic.** Best for many tiny ideas, or as a home for one-screen game jams. Each microgame is one `G({ ... })` entry in a file in `games/`, sorted by verb, with its art and logic together, so adding one touches nothing else. Run `tools/run.mjs`, which plays each at base and top speed.

## Definition of done

Don't report a game as finished until all of these hold, and say which you couldn't check.

- `pogo check game.js` passes, and again with `--scene` on real gameplay. It only reaches menus otherwise.
- The game's own bots and test tools pass. A test that fails under heavy machine load must be rerun alone before you dismiss it.
- You opened `pogo shot` images at `phone`, `phone-landscape` and `desktop`, on the title, gameplay and end screens.
- It has no console errors in real Chrome, and still runs in a sandboxed iframe with storage, audio and gamepads blocked.
- No names, art or text from the template remain unless you meant to keep them.

Nobody can verify these from a terminal, so say so plainly: how the audio sounds, how it feels to play, real phone frame rate and real vibration. `pogo shot` uses software rendering, so its speed says nothing about a phone. Bots prove a game can be finished, not that it's fun.

## Commands

Install Node 24 or later, then run `npm install && npm run build` once. Games themselves only need a static web server. Browser tests and `pogo shot` need Google Chrome, or `CHROME_PATH` set to a Chrome binary. The optional `.sh` screenshot helpers in some `tools/` folders need zsh.

```sh
pogo list [search]                 # the catalogue, e.g. pogo list racing
pogo new games/mygame --from kart  # fork a game; omit --from for a blank one
pogo check games/mygame/game.js    # headless play on five screens
pogo shot games/mygame --device desktop --out s.png
pogo serve games/mygame
```

`pogo` means `node bin/pogo.js` unless you've linked the package. Add new games to `demos/catalog.json` and to this file, or the tests fail.
