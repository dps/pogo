# Pogo

A 2D + 3D web game framework built for coding agents and phone-first screens. Inspired by Kaboom and KAPLAY, written from scratch, with no runtime dependencies.

```js
import { button, createGame, pin, text } from "./pogo.js";

const game = createGame({ background: ["#1e293b", "#0f172a"] });

game.scene("title", (s) => {
    s.add([text("Hello", { size: 48, bold: true }), pin("center", [0, -40])]);
    s.add([button("Tap me", { action: "confirm", onTap: () => { game.sfx("coin"); s.flash("#fff"); } }), pin("center", [0, 40])]);
});

game.start("title");
```

## Why it exists

**Agents can't see a screen.** So the game is observable and repeatable without one:

- Fixed-step, seeded simulation. The same inputs give identical results in Node and Chrome.
- `game.state()`, `game.ascii()`, `game.audit()`, scripted input and `game.step(n)`.
- `pogo check` plays a game headless on five screen profiles with a bot and reports crashes, broken layouts and controls a touch player can't reach.
- `pogo shot` takes a real Chrome screenshot of any scene.
- Errors carry a code, a suggestion and a hint.
- Art and sound come from code: painted sprites, text sprites, voxel models and synthesised audio. No binary assets needed.

**Phones are the primary target.** Virtual resolution that adapts to any aspect ratio without bars, rotation-aware layouts, safe-area anchoring, on-screen controls sized in physical pixels, 44px tap targets, multi-touch, swipes, audio unlock, haptics, a DPR cap, adaptive resolution, interpolation for 90/120 Hz screens, and recovery from lost GPU contexts. Desktop gets keyboard, mouse and gamepad through the same actions.

**One API for 2D and 3D.** The same entities, components, physics, input and timers, on a WebGL2 renderer with an instanced 3D pass (one shadow-casting sun, hemisphere ambient, fog) and a batched 2D pass with SDF shapes and sharp text.

## Use

```sh
npm install && npm run build
node bin/pogo.js new mygame        # pogo.js, game.js, index.html, AGENTS.md
node bin/pogo.js check mygame/game.js
node bin/pogo.js serve mygame
```

A game needs only `pogo.js`; there's no build step. [AGENTS.md](AGENTS.md) is the full reference, and it's copied into every new game.

## Repo

| Path | Contents |
|---|---|
| `src/` | The framework, in TypeScript |
| `bin/pogo.js` | CLI: `new`, `check`, `shot`, `serve` |
| `examples/` | Small reference games: Hopper (2D) and Lane Blast (3D) |
| `demos/` | Five full games, with a launcher at `demos/index.html` |
| `tests/` | Headless tests (`npm test`), Chrome tests (`npm run test:browser`) |
| `template/` | What `pogo new` copies |

`npm run test:browser` needs Google Chrome installed, or `CHROME_PATH`.
