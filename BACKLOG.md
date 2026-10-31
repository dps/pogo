# Backlog

Requests from the five demo builds that are not done yet, most valuable first. Each one came from an agent working around the framework in its own game.

## Rendering
- Point lights, or at least lit and fogged options for particles and unlit meshes.
- Tiling textures and sheet frames on `mesh()`, so textured box walls work without a custom mesh.
- `d.sprite` rotation, or `d.push/translate/rotate/pop`, so custom draws stop touching the private `d.m`.
- Public interpolation alpha for draw hooks, and an interpolated `s.cam.viewRect` (games read `game._alpha`).
- A batched sprite API with an auto-atlas for swarms, plus additive blending.
- Vertex and triangle counts in `renderer.stats`. Reuse scratch matrices in the render walk to cut GC on phones.
- `assets.free(name)`: replacing a mesh currently leaks its GPU buffers.

## Art
- `Pixmap`: `outline(width)`, radial gradients, layers and `blit`, anti-aliased `poly`, `aa: false`. Cache parsed colors, and scope `outline()` to the frame (it copies the whole sheet today).
- Voxels: pivots for hinged limbs, greedy merging, baked ambient occlusion, and hidden-face culling.
- `assets.font()` for bitmap fonts, `font`/`icon`/`draw` options on `button()` and touch buttons, and a sprite `anchor`.
- Time-sliced painting or a loading hook. Heavy art blocks startup for most of a second on an M4.

## Physics and cameras
- A tile-grid collider with per-hit callbacks and tile flags, plus corner correction. Puddle Pip wrote its own `physics.js`.
- 2D camera dead zone and look-ahead, and a `cam3.firstPerson()` helper.
- `s.timeScale` and `s.freeze()` for hit-stop.

## Input and UI
- Stick options: start anywhere, follow the finger, and custom layouts. A thumb holding one button can't currently slide to another or also look.
- `input.tapAction()` for bots, since `press(a, 1)` on consecutive steps gives only one edge.
- Layer options on `onDraw`/`onDrawUI`, a UI tween clock that runs while paused, and `button` styling.

## Audio
- Per-note length and decay, crossfades and bar-synced song changes, and tempo control. Warn on tracks of unequal length.
- `game.sfx(tone, { name })`, so `state()` can tell custom sounds apart.
- Offline render to WAV with a level report, because agents can't hear anything they write.

## Tools
- A game-supplied bot hook for `pogo check`. Its random player tends to reach menus and little else, even with `--scene`.
- A layout audit that sees `d.text` and `d.sprite` drawn in hooks, and per-action reachability checks.
- `pogo shot`: filmstrips and multiple captures, scripted input, and a GPU mode for real frame times.
