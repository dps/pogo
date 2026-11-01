# Backlog

Requests from the five demo builds that are not done yet, most valuable first. Each one came from an agent working around the framework in its own game.

## Rendering
- A public instanced mesh API with raw matrices, in-place mesh updates, and partial texture refresh. Several games call internals for these.
- Tiling and scrolling UVs on 3D meshes, and soft-alpha billboards.
- A clip that follows transforms and shake.
- An interpolated `s.cam.viewRect`, and an atlas packer for painted art of mixed sizes.
- Multiply blending or render-to-texture for ambient light, per-mesh additive blending, a transparency sort override, and mirrored meshes.
- Mesh culling, plus per-vertex alpha in `d.tris`.
- Text batching and bitmap fonts: HUD text is a draw call per string.
- Point lights, or at least lit and fogged options for particles and unlit meshes.
- Tiling textures and sheet frames on `mesh()`, so textured box walls work without a custom mesh.
- Vertex and triangle counts in `renderer.stats`. Reuse scratch matrices in the render walk to cut GC on phones.

## Art
- `Pixmap`: `outline(width)`, radial gradients, layers and `blit`, anti-aliased `poly`, `aa: false`. Cache parsed colors, and scope `outline()` to the frame (it copies the whole sheet today).
- Voxels: pivots for hinged limbs, greedy merging, baked ambient occlusion, and hidden-face culling.
- `assets.font()` for bitmap fonts, `font`/`icon`/`draw` options on `button()` and touch buttons, and a sprite `anchor`.
- Time-sliced painting or a loading hook. Heavy art blocks startup for most of a second on an M4.

## Physics and cameras
- A tile-grid collider with per-hit callbacks and tile flags, plus corner correction. Puddle Pip wrote its own `physics.js`.
- 2D camera dead zone and look-ahead, and a `cam3.firstPerson()` helper.

## Input and UI
- A second virtual stick, and sliding a thumb between touch buttons.
- A public press-start position on `pointer`, a tap-or-drag helper, a pinch helper, and swipes that fire mid-gesture.
- `button()` fonts, icons and mutable labels. Six builders asked for this.
- Immediate-mode UI that the audit can see.
- `Vec.set(v)` sets x only, which surprises people using `scale.set(v)`.
- A custom touch pad API for two-player and fighting layouts, and shoulder bindings for pads.
- A UI layer above `onDrawUI`, and particles that can draw above `s.onDraw`.
- Rich text with inline icons.
- Stick options: start anywhere, follow the finger, and custom layouts. A thumb holding one button can't currently slide to another or also look.
- `input.tapAction()` for bots, since `press(a, 1)` on consecutive steps gives only one edge.
- Layer options on `onDraw`/`onDrawUI`, a UI tween clock that runs while paused, and `button` styling.

## Audio
- Stereo pan on `voice` and `sfx`, for spatial sound.
- Song seek and pause, per-track gain, and letting note tails ring out after `stopMusic`.
- Per-note length and decay, crossfades and bar-synced song changes, and tempo control. Warn on tracks of unequal length.
- `game.sfx(tone, { name })`, so `state()` can tell custom sounds apart.
- Offline render to WAV with a level report, because agents can't hear anything they write.

## Tools
- Run draw hooks in headless steps, or warn about layout done in draw. Bots miss it otherwise.
- A resumable background job helper for AI searches when Workers are blocked.
- A game-supplied bot hook for `pogo check`. Its random player tends to reach menus and little else, even with `--scene`.
- A layout audit that sees `d.text` and `d.sprite` drawn in hooks, and per-action reachability checks.
- `pogo shot`: filmstrips and multiple captures, scripted input, and a GPU mode for real frame times.
