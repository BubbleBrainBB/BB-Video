# Toy 3D (玩具三维, `toy3d`)
On a dark, warm desk, the product's UI becomes physical platforms (real screenshots, or drawn layouts), and a matte soft-vinyl toy (the brand logo, a mascot, the characters of the problem) hops, rolls and presses keys on them — wherever it lands gets "clicked" and lights up. Low camera, very shallow depth of field, separate shots hard-cut on the beat, almost no movement inside a shot; only the thing being talked about glows. Like a photo shoot of a set of toys on a table.

Reference: the DeepSeek promo (an editing app's UI laid flat as a physical slab, a blue soft-vinyl whale hopping on the toolbar keys and landing on the timeline's keyframes). Check against the reference while you work; for anything the reference doesn't show (what a toy looks like), first find real photos to compare with, see section 9.

Runtime: `runtime/toy3d.js` (`await PROMO.toy3d(F, opt)`, three.js; the starter page has the import map). New project: promo `node scripts/new.mjs <dir> --style toy3d`, explainer `node explainer/scripts/new.mjs <dir> --style toy3d`. Toy modelling: `node scripts/toy3d-model.mjs <dir>` (section 9). Samples: `videos/linear-toy3d-v2` (promo, Linear, written with this runtime: key clicks, typing, carrying cards, rolling, stamping, keycaps, nine fit shots); earlier hand-written experiments: `videos/linear-toy3d`, `videos/chicken-rabbit-toy3d` (explainer, the chickens-and-rabbits problem (鸡兔同笼)).

## 1. What products it suits
- Software with a real UI (editors, kanban boards, IDEs, design tools, apps), especially "one action after another" flows: click, type, drag, review, publish.
- Brands with a mascot or a graphic logo (the logo can be extruded straight into a toy).
- Explainer topics where "the things themselves move": counting, grouping, swapping (chickens and rabbits, permutations, sorting); the characters are the things in the problem.
- Mood: friendly, refined, a little playful tech.
- Not suited: nothing with a UI and nothing that can become a toy (pure concepts, pure data); heavy subjects; content that needs long passages of text (text in 3D must be big and sparse).

## 2. What it is (and isn't)
- What it is: **the UI is a physical object, and the toy operates it with its body**. Every action is done by the toy: landing = click, hopping along a row = typing, pushing something along = drag, pressing down = stamp / submit.
- The camera shoots it like a tabletop set: separate shots, long lens, low angle, shallow depth of field; cut on the action (jumps up in one shot, lands in the next).
- It isn't: 3D text and cards floating on black (no desk, nothing physical); a camera that keeps spinning and flying; everything glowing; the same "hop over, light up" routine shot after shot (see section 5: vary the verbs).

## 3. Colour
- Desk: dark warm colour (default `#2E231D`, background `#221B17`), the reference's table. When the product has a light UI, the platform is light and the desk stays dark.
- Platform: the product UI's base colour (`#0D0E10` or similar for dark products; a light product's own white).
- Toy: matte soft vinyl in the brand colour (logo toys); character toys are coloured like the real thing (cream-white hens, caramel rabbits…).
- Glow: two colours at most — one for "the landing spot / the part being talked about" (brightened brand colour), one for "status / result" (yellow, green). Nothing else glows.

## 4. Type
- Text printed on a platform (`T.label`): the product's font (look it up on the website); Noto Sans SC for Chinese. One thing per line, big, sparse.
- **Text in 3D must be readable, not just visible**: flat text on screen is only "letter height × sin(tilt angle)" tall, and it is also squashed along its baseline. Rule: one projected character ≥ 24px (at 1080p), height / width ≥ 0.6. At the moment it must be read, raise the camera and face the line squarely. (`--check` measures it automatically while the line "is to be read" — by default the first 2 seconds of every shot that fits the whole line in frame, plus 2 seconds after it appears mid-shot; `read: [[a, b]…]` sets this yourself, `read: false` = decorative text, not checked — and reports "3D 字读不清" (3D text unreadable); text big enough to see but cut off by the frame edge is reported at any time.)
- Text and toy take turns: on the beat when text must be read, the toy doesn't sit on the text (it lands in the empty space beside it).
- Small text inside a screenshot is the UI itself and doesn't count as "unreadable"; but every shot needs at least one line that reads clearly (title band, keycaps, labels).
- All on-screen text is registered for the fact check automatically (`T.label`, `T.keycaps`); text inside screenshots is not.

## 5. Motion
**The toy is the mouse** — every UI action is done with the toy's body (`M` is the actor returned by `T.mascot`):

| Action | Code | On screen |
|---|---|---|
| Click | `M.click(target, time)` | hops onto the target; at the moment it lands, the target is pressed (a key made with `s.key` sinks and lights up) |
| Type | `M.type([spots…], time, { step, onKey })` | hops along the input field cell by cell; each landing produces one character (make the character appear in `onKey`) |
| Drag | `M.carry(thing, spot, time)` | carries a card / file over on its head and puts it down on arrival |
| Stamp / submit | `M.stamp(time)` | a hard press in place: squashes, the pieces of the logo scatter and come back together |
| Roll | `M.roll(spot, time)` | the upright logo rolls along a line (a timeline, a progress bar, a line of a diff) |
| Hop | `M.hop(spot, time, { h, kf, spin })` | moves between spots; `kf` = an important landing (flatter squash, a heavier sound) |

- **Use at least three verbs per film**; three shots in a row of "hop over, light up" is a routine (review will always flag it).
- Changing platform (cutting to the next one): `M.set(high point, cut time).hop(spot, cut time, …)` — `set` and the next hop at the same moment, so when the cut lands it is already falling; if it stays in mid-air after a `set`, `--check` reports "玩具停在半空" (toy stuck in mid-air).
- Landing spots are all **anchors** (`s.anchor(u, v)`, `K.anchor`): if the platform moves or a key rises, the toy follows whatever it stands on, nothing special needed.
- Timing: a small hop 0.4–0.55 s, a big hop 0.7–1 s; landing squash + rebound 0.3 s; continuous operations one per beat.
- Things appearing: keys rise out of the platform (`s.key`), keycaps rise from the desk (`T.keycaps`), the toy grows out of the logo (`from: 'pop'`) or drops in from above the frame (`from: 'drop'`).

## 6. Camera and transitions
- **Separate shots, hard-cut on the beat; almost no movement inside a shot** (a very slow push). No tracking shots chasing the toy.
- **Every cut needs something that carries across** (`carry`): most often the toy — it jumps in one shot and lands in the next, in mid-air at the cut. It can also be the same thing cut from wide to close, or a platform cut from its full view to one cell on it. `--check` flags hard cuts without `carry`.
- **Shot lengths must vary**: coefficient of variation ≥ 0.25 (both cuts on a single beat and shots held a while longer); every shot at 3 seconds is a metronome.
- **Keep the camera on one side within a section**: switching sides back and forth flips the on-screen direction at every cut, and the viewer has to re-orient each time.
- Camera: low (tilt 15–35°), long lens (fov 22–32), shallow depth of field (aperture 0.003–0.006) for most shots; top-down wide shots only for the opening and the end; shots where text must be read go higher and face the text.
- **Place the camera by "points that must fit"**: `fit: [anchors…]` + tilt `el` + azimuth `az`; the runtime computes the distance for the frame — once for landscape and once for portrait, with 20% at the bottom of portrait automatically kept clear for the platform's overlay. `avoid: [points…]` = things this shot must not show (the tall portrait frame often catches half of the title band at the far end of the platform: put the band's two corners in `avoid` and the framing slides down until it is fully out); write portrait separately as `p: { fit, avoid, el }`.
- Focus: snap to focus on the cut (no slow focus pull inside a new shot); by default it follows the toy; `focus: [[time, target]…]` is a focus pull.
- **Ending**: the last shot is always a close-up of the logo + URL (or the answer), taking over 40% of the frame width; the toy lands beside it and it lights up. The shot before is a wide view of the whole main platform (title fully in frame).

## 7. Sound
- Music: quiet, precise, a little playful: plucked / electric-piano broken chords, bass, very light drums; hats and a glockenspiel motif in the fast-cut sections.
- Sound effects (`styles/toy3d/sound.js`): the dull "pop" of soft vinyl landing on hard plastic (`land`, three rotating variants), heavy landings (`stamp`), the rustle of rolling (`roll`), the plastic "tick" of keys (`key`, `type`), a light glockenspiel for lighting up (`glow`), a "pop" for growing out (`pop`). All in the same key.
- Films with many landing sounds have high peaks and low average loudness (the renderer settles around -17 LUFS): make the landings softer and the bed thicker.

## 8. Moves unique to this medium
- **Keys rise up and get stomped** (`s.key`): a button on the screenshot is cut out and becomes a physical key — the reference's signature move.
- **The logo scatters and reassembles**: the pieces of a logo toy (`T.toy.svg`) burst outward a little on important landings.
- **Keycaps spell numbers and equations** (`T.keycaps`): they rise from the desk, the result cell glows; counter keys (functions) tick over time.
- **Light spots underfoot, lamps overhead** (make them yourself with `T.glowMat`): light up one by one when counting.
- **Act it out**: in an explainer the things really do the action (the hen crouches, the rabbit stands up) — clearer than any chart.

## 9. Toys: modelling
- **Find real references first** (product photos, catalogue pictures of similar toys: Schleich, Holztiger, Ostheimer and the like), and compare the rendered toy side by side with the reference before rendering the film; don't work from memory. Use the brand logo's SVG from the website as-is: no eyes added, no shape changes.
- **Parts list** (the project's `toys.js`, `window.TOY3D_SPECS`): Blender and three.js use the same one.
  ```js
  window.TOY3D_SPECS = {
    hen: { front: 'x',                                   // built facing +x (default: front faces +z)
      joints: { body: { pivot: [0, 0, 0] }, legL: { pivot: [0.02, 0.21, -0.07] } },   // joint = a part that can move on its own; pivot is its axis
      parts: [ { shape: 'sphere', color: '#F4ECDF', p: [0, 0.37, 0], r: [0, 0, 0.2], s: [0.27, 0.21, 0.2], joint: 'body' },
               { shape: 'sphere', color: '#0B0C12', eye: true, p: [0.255, 0.655, 0.072], s: [0.019, 0.019, 0.019], joint: 'body' }, … ] },
  };
  ```
  `shape`: sphere (radius 1) / cylinder (radius 1, height 1) / cone / box / capsule; `s` scale, `r` rotation (radians, XYZ), `eye: true` = a shiny black eye. Units match the scene, y is up.
- **Use Blender when available**: `node scripts/toy3d-model.mjs <dir>` first checks this machine (Blender found, version ≥ 3.6, runs in the background; `--check` only checks). If usable, it fuses the parts with the same joint and the same colour into one piece in Blender (voxel remesh + smooth + decimate), so there are no seams between parts, and exports `assets/toys-glb.js`; if not, it does nothing and the runtime assembles the toy in three.js from the parts list (seams between parts are visible, otherwise the same). The page loads `assets/toys-glb.js` after `toys.js` (the starter page does), and `await T.toy.load('hen')` picks automatically. Re-run after changing the parts list (otherwise it falls back to the three.js version and warns in the console). Blender only does the modelling; motion and lighting are all in three.js.
- Logo toys: `T.toy.svg(path, { size, depth, color })` extrudes the SVG as-is with rounded edges, each piece a separate part; `upright: true` (default) stands it up, so it can roll.
- Many copies of one toy (35 hens and rabbits): `T.toy.load` shares geometry and materials, so it's cheap.
- Poses: `T.mascot(toy, { pose: (t, toy, state) => { toy.joints.legL.rotation.z = … } })`, called every frame.

## 10. Platforms and UI
- `await T.slab({ x, z, w, image: 'shots/app.jpg', band: { depth, draw } })`: a platform with the screenshot printed on its top (or a layout drawn by `draw(c, w, h, pxPerUnit)`), optionally with a printed title band on it (the home page's H1, a section name).
- Use real screenshots (element screenshots from `capture.mjs`, at 2× resolution). Animated demos can get captured mid-state ("Thinking…"): look before you capture.
- Coordinates: `s.at(u, v)` / `s.anchor(u, v)`, u from left to right, v from the top of the screenshot to the bottom (0–1; the title band is v < 0). **Measuring spots**: temporarily write `PROMO.toy3d(F, { grid: true })` (or add `?grid` to the URL in the browser) to overlay a 10% grid with tick labels on the screenshot, take a `--stills` frame and read u / v off it, then remove it.
- A region that lights up: `s.region(u0, v0, u1, v1).glow({ at, until, color, kind: 'ring' | 'fill' })`; a raised key: `s.key(u0, v0, u1, v1, { at, until, hole })` → `K.anchor`, `K.press(time)`; `hole: true` = once the key is carried off, its old spot shows the platform's base colour (for dragging a card: `M.carry(K, spot, time)`).
- Platforms can move: `slab({ motion: (t) => ({ x, y, z, ry }) })`; a toy standing on one moves with it.

## 11. Glow and depth of field
- Glowing things have a fixed brightness above the threshold (`T.glowMat(colour)`) and fade only by opacity; the threshold has a soft knee (`bloom.knee`) so brightness never "pops a halo in one frame" — the final check's "one-frame jump" is usually this.
- UI and toys sit below the threshold: `bloom.threshold` defaults to 1.15; a cream-white toy under the key light is close to 1, so don't lower the threshold further.
- Depth of field: small aperture for wide shots (0.0008–0.0016), large for low close-ups (0.004–0.006); focus follows the toy by default.

## 12. Pitfalls and self-check
- A screenshot platform in a low shot makes the UI text slanted and squashed — raise the camera on the beat where it must be read (`--check` reports "3D 字读不清 / 被切" (3D text unreadable / cut off)).
- A logo toy looks like a blob from most angles: at important moments let it face the camera squarely for a moment (default `face: 'camera'`).
- Four feature sections all with the same action: change the verb (section 5), the camera angle, the shot length.
- End-card text appears before the camera pulls back and gets cut off as it enters: for the ending see section 6.
- Action timing must chain: if the next action starts before the previous one has landed, the console and the "page" part of `--check` warn (`toy3d：动作 hop 在 …s 开始，上一个动作 …s 才结束` — "action hop starts at …s, the previous action only ends at …s").
- Portrait: a wide platform fills only a strip in the middle of a portrait frame — use `p: { fit }` so each shot holds only "the title + this shot's spots"; don't force the whole platform in. The portrait frame is tall and always has spare room above and below: frame only the column the toy travels (screenshot text at the sides may go out of frame; printed text may not), then use `avoid` to stop the top of the frame in a blank strip (the part of the title band with no text), without cutting text.
- Glow / depth of field: section 11.
- Slow renders: three.js renders depth of field and glow every frame, plus motion-blur sub-frames; an explainer with an almost static camera can use `--blur 1`.
- Self-check: `--check` (once for landscape, once for portrait) → `--stills` (one per shot) → final check → review (`references/review.md`).

## 13. Variation
- Platform: real screenshot ↔ drawn layout (a problem, an equation, printed source text) ↔ physical props (fences, keyboards, things on a desk).
- Toy: brand logo ↔ mascot ↔ a group of characters (hens and rabbits, chess pieces).
- Desk: dark warm wood (default) ↔ cool grey ↔ light (for a light product, make `desk` and `bg` light and use even less glow).
- Pace: the reference's brisk feel (a hop every 0.5 s) ↔ an explainer's calm (one shot per line).

## 14. API quick reference
```js
const T = await PROMO.toy3d(F, { desk, bg, fog: [near, far], bloom: { strength, radius, threshold, knee }, exposure, accent });
const s = await T.slab({ x, z, w, d, image | draw, band: { depth, draw, color }, color, emissive, motion, at, until });
s.at(u, v, y) → world coordinates; s.anchor(u, v) → anchor; s.region(u0, v0, u1, v1).glow({ at, until, color, kind, max, sfx });
const K = s.key(u0, v0, u1, v1, { at, until, height });   K.anchor; K.press(time)
T.label(s | null, { text, u, v | x, z, size, at, until, color, weight, align, glow, key, fact, font, read });   // size = letter height (world units); read = the time ranges it is to be read (default: first 2 s of every shot that fits the whole line) | false
const toy = await T.toy.load('hen');  T.toy.build(spec);  T.toy.svg(d, { size, depth, color, upright });
const M = T.mascot(toy, { start, born, from: 'pop' | 'drop', face: 'camera' | 'path', yaw, pose });
M.hop(spot, at, { dur, h, kf, spin }); M.roll(spot, at, { dur }); M.click(target, at); M.type(spots, at, { step, onKey }); M.carry(mesh, spot, at, { dur }); M.stamp(at); M.set(spot, at)
T.keycaps({ x, z, tokens: ['35', '×', '2', '=', '70'], at, until, hot, size, glow });   // a function token = a counter key; equations are verified automatically
T.shots([{ at, fit: [anchors…], avoid: [anchors…], el, az, fov, aperture, focus, push, margin, carry, p }, { at, pos: [a, b], look: [a, b], crane: [a, b], … }]);
T.anchor(point | fn), T.point(x, y, z), T.glowMat(colour, texture), T.onFrame((t) => …), T.run();
```
Time: `at` = the moment it settles (on the beat); `until` = fully gone. Write the toy's actions in time order (an action can't start before the previous one ends; the console warns).

Common interface (`runtime/kit.js`, the quick version `PROMO.film`): **not yet**, see section 15.

## 15. Not supported yet
- The quick version (`PROMO.film` / `--quick`) and the common interface (kit's word / line / card / shot / steps / versus…): this style can only be hand-written for now. Explainers use the hand-written skeleton in `styles/toy3d/explain.html`.
- Video on a platform (screenshots yes, screen recordings no).
- Skeletal animation for toys (only joint rotation and squash-and-stretch); for character stories see `../CHARACTERS.md`.
- One-take long shots (this style is separate shots + hard cuts).
