# Pogo: guide for coding agents

Pogo is a dependency-free 2D + 3D web game framework. A game is one folder: `index.html`, `game.js`, `pogo.js`. No build step. Types are in `pogo.d.ts`; `pogo.js` is unminified and readable.

## Your loop

You can't see or feel the game, so use these after every meaningful change:

```sh
pogo check game.js            # plays it headless on 5 screens with a monkey bot: crashes, layout, unreachable controls
pogo shot . --out s.png --eval "game.go('play')" --steps 240   # a real Chrome screenshot; then LOOK at it
pogo shot . --device desktop --out d.png                       # devices: phone-small phone phone-landscape tablet desktop
pogo serve .                  # http://localhost:5173 for a human
```

`--eval` runs in the page with `game` defined, before stepping. `--print "game.renderer.stats"` logs a value after stepping, and `--dpr 3` matches a real 3x phone. Pages opened with `?paused` don't auto-run, so tools drive them with `game.step()`.

`pogo check` only sees what its random player reaches, which may just be your menus. Always also run it on real gameplay, `pogo check game.js --scene play --args '{"level":3}'`, and write your own bot for anything that matters. Its layout audit can't see what you draw in `onDraw`/`onDrawUI`. `pogo shot` uses software GL: it shows you what renders, not how fast. In headless Node, or Node tests, importing `game.js` gives you the game at `globalThis.__pogo`:

```js
import "./game.js";
const game = globalThis.__pogo;
game.restart("play");
game.input.press("right", 30);   // hold an action for 30 steps
game.input.tap(180, 300);        // tap in view units; also drag(x0, y0, x1, y1)
game.step(60);                   // advance exactly 60 fixed steps; errors throw here
game.state();                    // JSON: scene, game.data, entities, sounds played
game.ascii();                    // the screen as text, with a legend
game.audit();                    // mobile problems in this frame, each with a fix
game.resize("phone-landscape");  // test other screens; also phone, desktop, ...
```

Same seed plus same inputs gives the same game, in Node and in Chrome. Write bots to prove a game is winnable and fairly balanced. Keep score and progress in `game.data` so `state()` shows it.

## Rules that prevent most bugs

- Everything is **centred** on `pos`. Radians everywhere. 2D y is **down**. 3D y is **up**. 3D forward is -z.
- Use `s.rng`, never `Math.random()`, or replays stop matching. Use `game.fxRng` for cosmetics.
- Use `s.wait`/`s.every`/`s.tween`, never `setTimeout`. Those pause, replay and die with the scene.
- Never hardcode the screen size. Read `s.view.width/height`; use `pin()` for all HUD and menus. In the default `expand` fit, the view is at least your design size and grows on one axis.
- Every action you read must be reachable by touch: a `touch` control, a `button()`, or `input.pointer`/`input.swipe`. `pogo check` fails otherwise.
- Colliders are axis-aligned boxes and circles/spheres. They ignore rotation. No slopes.
- `body()` gets gravity by default. Top-down games: `body({ gravity: 0 })`.
- Everything set up in a scene function dies with the scene. Long-lived values go in `game.data` or `game.save()`. `game.data` survives `go()` but `restart()` clears it, and `pogo check` calls `restart()`, so set defaults inside scenes. `game.restart(name, args, { seed })` reseeds.
- `game.go()` is ignored during a fade-out.
- `actions` entries with a default's name replace that default's whole binding list.
- Entities are for tens to low hundreds of objects. For swarms, keep your own arrays and draw them from one draw hook, batched on one sprite sheet: each texture change is a draw call. `body()` can't form stable piles, so stacking games need their own solver.

## Skeleton

```js
import { body, button, collider, createGame, pin, pos, rect, solid, sprite, text } from "./pogo.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },  // fit: "expand" | "contain" | "integer"; maxAspect
    background: ["#1e293b", "#0f172a"],     // color, or [top, bottom] gradient
    touch: { stick: true, buttons: ["jump"], look: false },
    actions: { dash: ["ShiftLeft", "pad:b"] },  // adds to the defaults
    seed: 1, pixelArt: false, maxDpr: 2,
});

game.scene("title", (s) => {
    s.add([text("My Game", { size: 44, bold: true }), pin("center", [0, -60])]);
    s.add([button("Play", { action: "confirm", onTap: () => game.go("play", { level: 1 }, { fade: 0.3 }) }), pin("center", [0, 30])]);
});
game.scene("play", (s, args) => { /* args.level */ });
game.start("title");
```

Default actions: `left right up down jump fire confirm pause`. Bindings are `KeyboardEvent.code` values or `pad:a b x y start select up down left right`.

## Entities

`s.add([...])` takes components, string tags and plain objects (fields merge onto the entity; `update`, `draw`, `add`, `destroy` are hooks). Every entity has: `pos rot scale size color opacity layer hidden paused ui dim name tags vel(with body) angle`. Assign freely: `e.pos.x += 1`, `e.scale = 2`, `e.color = "#f00"`, `e.pos = [1, 2]`.

```js
const hero = s.add([sprite("hero"), pos(10, 20), collider(), body(), health(3), "player", { name: "hero", speed: 200,
    update(dt, self) { self.pos.x += self.speed * dt; } }]);   // `this` works too in non-arrow functions
hero.is("player"); hero.destroy(); hero.child([...]); hero.get("sprite"); hero.has("body"); hero.tag("x"); hero.untag("x");
hero.on("event", fn); hero.emit("event", ...args); hero.onUpdate((dt) => {}); hero.onTap(fn);
hero.onCollide("enemy", (other, hit) => { hit.normal; }); hero.onCollideEnd("enemy", fn);
hero.wait(1, fn); hero.every(0.5, fn);             // cancelled when hero dies
hero.teleport(x, y, z);  hero.lookAt(target);  hero.forward();  hero.worldPos();
```

Custom components are functions returning such an object: `const spin = (r) => ({ id: "spin", update(dt, e) { e.rot.y += r * dt; } });`

### Components

| Component | Purpose |
|---|---|
| `pos(x,y,z)` `rot(angle)` `rot(x,y,z)` `scale(n)` `layer(n)` `opacity(a)` `named(s)` `dim(2\|3)` | Setup shortcuts. `dim(3)` makes an invisible 3D entity. |
| `rect(w,h,{color,radius,outline})` `circle(r,{color,outline})` `poly(points,{color})` | Crisp vector shapes |
| `sprite(name,{width,height,color,frame,flipX})` | Then `e.frame`, `e.flipX`, `e.play([0,1,2],{fps,loop,onDone})` |
| `text(str,{size,bold,color,font,align,maxWidth,lineHeight})` | `e.text = "new"`; `e.size` stays correct |
| `mesh(name,{size,color,texture,unlit,shadow,shine})` | 3D: `box sphere plane cylinder cone capsule torus quad`, voxel models, or `assets.lathe`. `shine` 0 to 1 adds gloss. |
| `billboard(name,{size,frame,color,unlit})` | Sprite in 3D that faces the camera |
| `collider({shape,size,offset,scale,sensor,ignore})` | `sensor: true` for pickups and hazards. `scale: 0.8` for forgiving hitboxes. |
| `body({gravity,bounce,friction,drag,mass,maxSpeed})` | Needs collider. `e.vel`, `e.grounded`. Blocks on solids; bodies push each other. |
| `solid({oneWay})` | Needs collider. Move it freely and riders are carried. |
| `pin("top-right",[8,8])` | Anchored to the safe area: `top-left top top-right left center right bottom-left bottom bottom-right`. Offset is inward. |
| `ui()` | Screen space without pinning |
| `button(label,{onTap,width,height,color,textColor,textSize,radius,action})` | `action` also triggers it by key or pad |
| `tap(fn,{pad})` | Tappable anything, 2D or 3D. Hit area grows to 44 CSS px. Consumes the touch. |
| `lifespan(sec,{fade})` `offscreen({margin})` `health(hp,{max})` | `e.hp e.maxHp e.hurt(n) e.heal(n)`; events `hurt heal death` |

## Scene API

```js
s.add s.find(tagOrName) s.first(tagOrName) s.entities s.view s.input s.rng s.assets s.time s.paused
s.wait(sec, fn)  s.every(sec, fn)    // both return { cancel() }
s.tween(target, { pos: [10, 20], opacity: 0, scale: 2 }, sec, { ease, delay, onDone, yoyo, loop })
// ease: linear inQuad outQuad inOutQuad outCubic outBack outBounce
s.onUpdate((dt) => {})  s.onDraw((d) => {})  s.onDrawUI((d) => {})  s.on("resize", fn)  s.on("leave", fn)  s.emit(name)
s.tilemap(rowsOrString, { size, legend: { "#": [comps], "@": (col, row) => [comps] }, x, y, z, plane: "xy" | "xz" })  // → { entities, width, height }; "." is empty
s.raycast(from, dir, { max, tag, ignore, dim })  // → { entity, point, normal, dist } | null
s.overlap(at, { size: [w,h] | radius, tag, dim })  // → Entity[]
s.pick(x, y, { tag })                 // 3D collider under a view point
s.burst({ at, count, color: [c1, c2], speed: [a, b], life: [a, b], size: [a, b], gravity, angle, spread, dim })
s.shake(amount, sec, { haptic: false })  s.flash(color, sec)
s.freeze(sec)                         // hit-stop: the world holds still, UI and shake keep running. 0.05 to 0.1 makes impacts land. s.isFrozen reads it.
s.timeScale = 0.3;                    // slow motion; UI runs at full speed
s.background = ["#fff", "#000"];      // per-scene override
s.gravity2.set(0, 1400); s.gravity3.set(0, -24, 0);
s.paused = true;                      // world stops; ui entities and buttons keep working
```

In a draw hook, `d` draws in local coordinates: `d.rect(w,h,{x,y,color,radius,outline,opacity}) d.circle(r,{...}) d.line(a,b,{width,color}) d.poly(pts,{color}) d.sprite(name,{x,y,frame,width,height,flipX,color}) d.text(str,{x,y,size,bold,color})`. `sprite` and `text` take `rot`, and `sprite` takes `crop: [x, y, w, h]` in pixels for atlases with mixed cell sizes. Transforms: `d.push() d.translate(x,y) d.rotate(a) d.scale(x,y) d.pop()`. `d.additive(() => { ... })` draws glows, sparks and lasers that add light. `d.clip(x, y, w, h, () => { ... })` clips to a rectangle in view units, for scrolling panels. For swarms, `const put = d.quads("sheet")`, then `put(x, y, w, h, rot, frame, r, g, b, a)` in a loop, with colors 0 to 1.

**Cameras.** 2D: `s.cam.follow(e,{speed,offset})`, `s.cam.pos`, `.zoom`, `.angle`, `.bounds={x,y,width,height}`, `.toWorld(p)`, `.toView(p)`. Without a camera, world coordinates equal view coordinates. 3D: `s.cam3.set(pos,target)`, `.follow(e,{offset,look,speed})`, `.fov`, `.project(p)`, `.ray(x,y)`. 3D draws first; 2D world and UI draw over it, so HUDs just work.

**Lighting** (3D): `s.light.dir.set(-.5,-1,-.3)`, `s.light.sky = color("#...")`, `.ground`, `.color`, `.shadows`, `.softShadows` (smoother edges for close-up scenes, costs more per pixel), `.shadowRange`, `.fog = { color: color("#..."), near, far }`.

**Input** (`s.input`): `down(a) pressed(a) released(a)`, `move` (Vec up to length 1, y -1 is up), `pointer` (`x y dx dy down pressed released tapped world`), `touches` (each with `pressed` on its first step; a second finger also presses buttons), `swipe` (`"left"` etc, for one step), `look` (per-step delta for cameras), `wheel`, `touchMode`.

**Touch per scene**: `game.touch.set({ stick: true, buttons: ["jump"] })` in a scene function, `game.touch.enabled = false` in menus, where a stick would swallow taps. Scripted stick for bots: `game.input.setStick(x, y)`.

**Draw order**: 3D, then 2D world entities by layer, particles, `s.onDraw`, then UI entities by layer, `s.onDrawUI`, touch controls, flash, fade. `d.text` always centres its box on `x`; `align` only aligns lines inside it. Colors above 1 work on `assets.mesh` vertex colors and are multiplied through lighting.

**Custom meshes**: `assets.mesh(name, { positions, indices, normals, uvs, colors })`, with counter-clockwise front faces. `assets.lathe(name, [[radius, y], ...], { segments, color })` turns a profile, bottom to top, into chess pieces, cups or wheels; repeat a point for a hard edge. Merge static scenery into one mesh for one draw call. `e.mesh = "other"` swaps models, the cheapest animation. `game.renderer.stats` has draw calls and instances. `s.cam3.fovAxis` is `"min"` by default, which widens portrait views; `"vertical"` is classic. Textures clamp at the edges, so to tile art, build a mesh with repeated UV quads.

**First person**: set `game.mouseLook = true` in the play scene and `false` in menus. On desktop a click then captures the mouse (Esc releases it). Set `touch: { stick: true, look: true, buttons: ["fire"] }` for phones. Both feed `s.input.look`, in CSS pixels per step: `yaw -= look.x * 0.0035; pitch -= look.y * 0.0035`. Drive the camera with `s.cam3.pos.set(...)` and `s.cam3.target.set(...)` each step; that stays interpolated, whereas `s.cam3.set()` is a cut. `s.input.down("fire")` covers keys and the touch button. For the mouse button use `game.pointerLocked && s.input.pointer.down`, because on phones `pointer.down` is also true during look drags. With `s.raycast(from, dir, { dim: 3 })` you have hitscan.

**Game**: `go restart step render state ascii audit screenshot resize sfx music stopMusic haptic haptics vibrate save load on data rng fxRng view input assets audio debug mouseLook pointerLocked alpha`. `game.alpha` is how far this frame sits between steps, for smoothing custom draws. `?debug` in the URL or F2 outlines colliders. `game.on("hide"|"show"|"scene"|"resize", fn)`.

## Art (read this if the game should look good)

Define art in `game.js`, before `game.start()`. There are no files to manage. Text sprites are good for tiny icons. For anything the player looks at, **paint** it.

```js
game.assets.paint("slime", 96, 96, (p, frame) => {
    const squash = frame === 0 ? 0 : 4;
    p.ellipse(48, 90, 30, 5, "#00000033");                          // contact shadow
    p.ellipse(48, 56 + squash, 36 + squash, 32 - squash, "#86efac", "#15803d");   // gradient body
    p.ellipse(36, 42, 9, 6, "#ffffff55");                           // highlight
    p.circle(38, 54, 8, "#fff").circle(58, 54, 8, "#fff").circle(40, 56, 4, "#1f2430").circle(60, 56, 4, "#1f2430");
    p.line(42, 72, 54, 72, "#14532d", 3);
    p.outline("#14532d").shade(0.25, 0.2);
}, { frames: 2, smooth: true });
```

Pixmap: `set get rect gradient ellipse circle line poly mirror outline shade speckle`, all chainable. Paint at 2–4x display size with `smooth: true`; single-frame smooth sprites get mipmaps, so they stay clean when drawn small. For pixel art paint low-res without it, plus `pixelArt: true`. Painting runs synchronously at startup: heavy art takes most of a second on a fast machine, so show a loading line in `index.html`. Every painter call parses its color, so for detailed art at 128px and up write to `p.data` (RGBA bytes) directly.

Text sprites: `assets.pixels("name", frames, palette?)`, where a frame is an array of rows or one multi-line string, and an array of multi-line strings is several frames. Default palette: `k` black, `w` white, `s d` greys, `r m` reds, `o` orange, `y` yellow, `g e` greens, `c` cyan, `b n` blues, `p` purple, `i` pink, `t` skin, `h u` browns. `.` is empty.

3D models: `assets.voxels("tree", [layer0, layer1, ...], palette?, { unit: 0.1 })`, with layers bottom to top, rows back to front, then `mesh("tree")`. Files: `assets.image(name, url, { cols, rows })`, `assets.sound(name, url)`. `assets.grid(name, cols, rows)` reads a painted sprite as a multi-row sheet. `assets.refresh(name)` re-uploads changed pixels. `assets.free(name)` releases a mesh or sprite's GPU memory, such as a finished level's track. `assets.wait(promise)` holds `game.start()` for art painted over several frames.

What makes art read as good: a limited palette per game; every character outlined; light from one direction; contact shadows; a background that's lower contrast than the foreground; squash and stretch through `e.scale` tweens.

## Sound

`game.sfx("click|jump|land|coin|shoot|hit|explode|powerup|lose|win")`, or a tone: `game.sfx({ wave, freq, to, attack, decay, volume })`, or an array of tones with `at`. Waves: `square sine triangle sawtooth noise`. Music: `game.music({ bpm: 120, steps: 2, tracks: [{ wave: "triangle", notes: "C4 E4 G4 - C5 - G4 -", volume: 0.2 }] })`. Tracks also take `decay` (seconds), `attack`, `slide` (0.5 falls an octave per note, for kicks) and `wave: "noise"` for drums. For sounds that hold and change, such as engines and wind, `const v = game.audio.voice({ wave: "sawtooth", freq: 90, volume: 0.1 })`, then `v.set({ freq, volume })` each step and `v.stop()`; it glides without clicks, and does nothing when audio is blocked. Audio unlocks on the first gesture, so start music from a button tap. `game.audio.muted` mutes. All tracks in a song should be the same length, because each loops by its own. 

**Rhythm.** Never time gameplay from steps. `game.audio.song` gives `{ playing, stalled, time, beat, step, bpm, length }` from the audio hardware, corrected for output latency, as the player hears it. It falls back to the step clock in headless runs and silent embeds, so bots still work. `game.audio.playAt(sound, songTime)` schedules a sound exactly on the beat; call it a little ahead. `game.audio.offset` is the player's calibration in seconds.

## Haptics

On by default, with no code. `button()` and touch controls, `tap()`, preset sounds (`coin` is light, `explode` is heavy, `win` is success) and `s.shake` all pulse. Automatic pulses are spaced out, so rapid fire purrs instead of buzzing. Custom tones are silent to the hand unless you pair them: `game.sfx(tone, { haptic: "medium" })`. Play one directly with `game.haptic("tick|light|medium|heavy|success|warn|error")`, a length in ms, or a pattern `[10, 40, 20]`. Close calls merge, and the stronger wins.

Design for it: **tick** for things picked up or passing a notch, **light** for placing and collecting, **medium** for hits, **heavy** for big impacts, and **success/warn/error** for outcomes. Keep pulses tied to something the player sees and hears at that moment. `game.state().haptics` lists recent pulses, so bots can check them. `game.haptics.enabled = false` is the player's off switch; put one in your settings. `game.haptics.auto = false` or `createGame({ haptics: { auto: false } })` leaves only your own calls. Android phones and gamepads vibrate properly. iPhones have no vibration API, so Pogo uses a Safari 18 trick that gives one strength, and pulses away from a recent touch may not fire.

## Making it fun on a phone

- First touch to play in under five seconds. One clear goal on the first screen.
- Controls: one thumb if possible. `touch.stick` for movement, at most two buttons; or tap, swipe and drag on the world itself.
- On tall screens keep the action above the thumbs; the bottom quarter is for controls.
- Juice on every event: sound, `s.burst`, a scale tween, `s.shake`, `game.vibrate(10)`. Coyote time and input buffering for jumps. Forgiving hitboxes.
- Keep the game over screen fast: one tap to retry. Persist the best score with `game.save`.
- Desktop gets keyboard automatically through actions. Give every `button()` an `action`.

## Errors

Errors are `PogoError` with a code and a hint, such as `[UNKNOWN_SPRITE] ... Did you mean "hero"?`. In a browser they fill the screen. `pogo check` reports them with a stack.

Embeds can block gamepads, storage, audio, vibration and pointer lock. Pogo turns each one off quietly and the game keeps running. If `mouseLook` can't capture the mouse, `input.touchMode` turns on and the mouse drives the touch controls, so a first-person game needs `touch.look` to stay playable there.

Audit codes: `OFFSCREEN_UI`, `SAFE_AREA`, `UNREACHABLE_ACTION` fail the check; `TEXT_TOO_SMALL`, `TAP_TARGET_SMALL`, `UI_OVERLAP`, `COVERS_CONTROLS` warn. Headless text widths are estimates, so confirm tight text in `pogo shot`.

## Not included

Rotated colliders, slopes, skeletal animation, glTF, multiple lights, networking.
