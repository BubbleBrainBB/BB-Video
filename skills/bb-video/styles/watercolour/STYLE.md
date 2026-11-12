# Style: watercolour (水彩, `watercolour`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

A frame is a watercolour being painted on cold-press paper. There are no outlines: colour makes the shapes. Every wash is transparent, so layers darken each other like real glazes and bare paper is the only white. Pigment gathers into a slightly darker, uneven rim where a wash dried, settles into the paper's tooth, and runs unevenly inside a shape. The painting stops short of the frame: its ragged edge and the bare paper around it are part of the picture.

Paint arrives the way paint does:
- it **blooms** outward from where the brush touched, fast at first and then slowing;
- it follows a **stroke**, or **grows** along a branch from the root;
- it is darker and soft-edged while wet, then dries lighter with a hard edge.

Colour can also leave. A wet front crosses a wash and **lifts** it, leaving a pale stain of the old hue (never clean white). This is the style's own verb: what the story loses is washed out, and what it gains is glazed on top.

Information is told in paint:
- a counted field of dabs, where a share takes or loses colour;
- swatches whose depth is the number;
- strokes pulled up from a pencil baseline;
- a pencil-ringed close-up;
- a glaze laid over the whole scene (the water warms, night falls).

Runtime: `runtime/watercolour.js` (`PROMO.watercolour(F, opt)`, one WebGL2 canvas, no libraries). New project:
- narrated explainer (the usual case): `node explainer/scripts/new.mjs <dir> --style watercolour`;
- promo on the beat: `node scripts/new.mjs <dir> --style watercolour`.

Starter pages: `styles/watercolour/explain.html` (narrated, timed from the narration) and `styles/watercolour/index.html` (on the beat). Both are hand-written `PROMO.compose` pages; there is no quick version yet. Sample: a narrated news explainer on coral bleaching, 《珊瑚为什么在变白》 (85 s, 16:9, three sheets).

## 0. Safety
- **Learn the medium, never a painting.** Do not copy a specific painter's picture, composition or signature motif. Scenes are invented.
- **No likenesses.** People are small generic figures made of two or three touches. Never paint a recognisable real person.
- **News and science are sourced.** Every number, date and name on screen is traced in `brief.md`. A counted chart says what one dab stands for. When paint stands in for something it does not literally show (brighter colours than the real thing, a magnified detail), `brief.md` lists it under "Illustrative".
- **Heavy subjects stay plain.** The medium is gentle. For disasters and deaths, do not make the picture pretty at the expense of the fact; state the fact in words on the sheet.

## 1. When to use
Use it for:
- news and explainers about the natural world: oceans, weather, climate, seasons, rivers, ice, plants and animals;
- anything whose story is colour or water arriving, spreading, fading or returning (a bloom, a flood, a drought, a bleaching, a recovery);
- human-scale and reflective pieces: a place, a habit, a slow change over years;
- gentle promos for products about nature, wellbeing, travel, food, books and art.

It suits less well:
- product UI tours and anything that must show real screens (`launch`);
- dense tables and dashboards (`swiss`, `dossier`);
- mechanisms that need exact line work (`blueprint`, `cutaway`);
- stories carried by named characters acting (`storybook`, `pencil`, `shadow`).

## 2. What it is (and isn't)
- **What it is**: one painting per chapter that grows, changes by glazing and lifting, and is looked at by a slow camera.
- **What it isn't**:
  - `ink`: Chinese ink wash is one black ink on a handscroll, with brush lines and seals. This is Western transparent colour with no line;
  - `drawnworld`: that style is a dense pen drawing first, with one colour wash at the end. Here there is no pen at all;
  - `grain`: flat spot colours with stipple. Here nothing is flat;
  - `storybook`: inked outlines with pencil hatching.
- **Never**: black, pure white paint over large areas, outlines around shapes, even inner glows, opaque fills, a saturated colour filling the whole frame, texture that shimmers from frame to frame. Paper and washes hold still; only new paint moves.

## 3. Color
A palette is a handful of pigments named by role. The same role names exist in every palette, so a film can change palette without code changes. Write pigments by role, never as hex colours (`--check` warns about more than two raw colours).

| Role | `reef` (default) | Use |
|---|---|---|
| `cool` | cobalt turquoise | water, air, the calm state |
| `deep` | ultramarine (granulates) | depth, distance, shadow |
| `warm` | coral orange | the subject, life |
| `hot` | quinacridone rose | alarm, heat, the accent |
| `sun` | gamboge yellow | light, energy |
| `leaf` | sap green | plants, recovery |
| `dusk` | violet | shade, evening |
| `earth` | burnt sienna (granulates) | ground, age |
| `dark` | indigo grey | the darkest mix, text, pencil |

Other palettes: `meadow` (sky blue, greens and yellow), `dusk` (indigo, rose and amber) and `earth` (ochre, sienna and grey-blue; the sober one for hard news). `opt.pigments` replaces single pigments (a brand colour goes in as `warm` or `cool`).

- **Mix on the palette**: `'warm+sun'`, `'cool+leaf'`, `'dark+earth'`. Mixes are subtractive, as in a real palette.
- **One wash, two pigments**: `pigment` runs into `to` across the wash (`mix: [from, to]`).
- **Density** is how much pigment: 0.15 pale, 0.3–0.6 for large areas, 0.7–1 for the subject, above 1 only for small accents.
- **Watercolour is light.** Measured on museum watercolours, median saturation is about 0.1–0.15 and almost nothing is darker than a mid grey. Keep at least a fifth of the frame as bare paper.
- **Complements make mud.** Layers multiply, so orange over blue goes grey-green. To warm a blue sea, glaze `hot` (rose over turquoise gives violet), not `warm`. Keep it to three layers at any one place.
- **Granulation and staining** come with the pigment: `deep` and `earth` speckle in the tooth, while `hot` and `warm` stain and leave more behind when lifted.

## 4. Type
- Words are small notes beside the painting, set in a serif (Noto Serif SC) in the `dark` pigment's colour. They soak in: a short blur that sharpens (`enter: 'soak'`).
- One painted word or number per sheet at most: `W.letters` paints the type itself as a wash, with rim and granulation. Use it for the title, the one term the film defines, or one big number.
- Sizes at 1080p: headline 54–80, note 34–42, chart labels 28–34, painted letters 100–260.
- Captions sit at the foot of the frame on a band where the painting thins out into bare paper (`veil`, on by default with a voiceover). Keep the painting's important parts above y ≈ 320 in a 16:9 frame.
- Keep headlines at least 10 % of the frame height from the top.

## 5. Motion
- `at` is **the moment the brush touches**. Most of the pigment is down by `at + dur × 0.6`, and the wash is dry about 1.5 s later. Start a touch 0.2–0.4 s before the word it belongs to.
- Entrances: `bloom` (a wet touch that spreads: washes, blobs, dabs), `stroke` (the brush crosses: bands, bars, ground, lettering), `grow` (along the stroke or branch from its start: corals, trees, rivers, pencil lines), `soak` (the whole shape comes up evenly: glazes, light).
- Vary them. `--check` warns about eight of the same entrance in a row, and about paint that is switched on with no entrance.
- Typical times: a large wash 1.6–2.6 s, a subject 0.8–1.6 s, a dab 0.4 s, a lift 1.5–3.5 s.
- Things that live in the scene may move as painted pieces (`node.to`, `node.sway`): fish, birds, drifting specks. Keep them small and few; the painting itself does not move.
- Exits: a wash with `until` is lifted out by default (`exit: 'lift'`). Use `exit: 'fade'` for glazes.

## 6. Camera and transitions
- The camera looks at a painting: it holds with a very slow push, and moves slowly to the part being painted (`W.move`). `view` is `{ x, y, z }` or `{ on: node | [nodes], pad }`.
- Zoom stays between 0.7 and 2.6. Past that the paper tooth and rims are blown up; show details with `W.inset`.
- A new chapter is a **fresh sheet**: `W.page(at, { dur, dir, view })`. Clean wet paper sweeps across, the old painting is gone under it, and the next one starts on bare paper somewhere else in the world (put each sheet about 2000 units apart). Start the page turn as the last word of the chapter ends, not before: it wipes whatever is still being said.
- About one fresh sheet every 12 s at most. Within a sheet, change the picture by painting, glazing and lifting.

## 7. Sound
A quiet room: water, a brush, paper. The runtime emits `bloom` (a drop and a breath of air), `brush` (a soft bristle sweep), `lift` (the sweep backwards), `page` (paper sliding), `pencil`, `dab` and `tick`. It sends one sound per gesture and never a burst of the same sound. `styles/watercolour/sound.js` and `score.js` are starting points: an unhurried felt piano over a string pad, thinning to single notes when colour is washed out. Under a voice most light effects drop out; they are heard in the pauses.

## 8. Signature moves
Pick two or three per film.
- **Lifting**: the thing the story loses is washed out by a wet front that leaves a stain. `node.lift(at, { from })`, or `W.lift(at, { on: [a, b, c], from })` for one front across many things.
- **Colour coming back**: `node.repaint(at, { pigment, enter: 'grow' })` paints the same shape again from its root.
- **A glaze over everything**: one large pale `wet` wash changes the state of the whole scene (heat, night, smoke, time).
- **The first wash**: open on bare paper and let the big wash bloom before anything is in it.
- **Painted lettering**: the title or the one number, painted (`W.letters`).
- **Backruns**: `blooms: 1` on a large wash adds the cauliflower mark of water running back into a damp wash. At most one or two per sheet.
- **Light**: `W.rays` lays pale shafts over the washes.

## 9. Telling information in paint
| To say | Use | Notes |
|---|---|---|
| a share, a count | `W.dabs({ n, cols })`, then `g.take(at, { n \| share, pigment })` or `g.lose(at, { n \| share })` | one dab is one unit; letter what a dab stands for |
| values across a few events | `W.swatches({ items: [{ label, value, note, at }] })` | depth and size of each chip follow the value; the note is the figure |
| values to compare | `W.bars({ items: [{ label, value }] })` | strokes pulled up from a pencil baseline |
| a detail too small to see | `W.inset({ x, y, r, from: [x, y], build })` | children are clipped to the disc; a pencil leader ties it to the spot |
| the name of a thing | `W.label(text, { to: [x, y], x, y })` | pencil leader, words soak in at its end |
| a number that changes | `W.number({ from, to, fmt })` | the fact check reads the final value |
| a state of the whole scene | a large `wet` glaze | see §3 on mud |

Never draw boxes, arrows or connector lines. Pencil is for leaders, rings and axes only.

## 10. Shapes
- `W.blob` (lumpy mass: a rock, a cloud, a mound, a canopy), `W.ellipse`, `W.rect` (a hand-bowed block: sky, sea, a field), `W.poly`, `W.path` (an SVG path, filled, or stroked with `w`), `W.hills` (a ridge filled down to a base: hills, a seabed, roofs, waves).
- `W.stroke` (one brush stroke along points, swelling and thinning), `W.branch` (a branching thing painted from the root: coral, a tree, a river system, veins, a crack; `tips` adds a bud on each end), `W.dots` (many small dabs as one wash: stipple, bubbles, spores, stars, a far crowd).
- `edge`: `hard` (dried on dry paper: a rim), `soft`, `wet` (wet into wet: feathered, no rim; use it for skies, water and glazes), `dry` (dry brush: the tooth breaks the stroke).
- `gouache: true` makes a wash cover what is below. Use it sparingly: with `pigment: 'paper'` it is bare paper laid back in (an inset's disc, a bone, a highlight).
- Build things from two or three touches: a fish is one ellipse and a tail, a figure is a head and one body stroke. Put them in a `W.group` so they move together.

## 11. Pitfalls and self-check
Run `--check`, then look at stills (`--stills`) and at least one `--strip` of a bloom, a lift and a page turn.
- **Looks like vector art**: shapes too flat and crisp. Use `to` for a second pigment, let large areas be `wet`, and overlap things so the glazes show.
- **Mud**: a grey-green or brown where layers pile up. Fewer layers, lower density, and no complements on top of each other (§3).
- **Too dark, too full**: no bare paper left. Shrink the big wash so its ragged edge shows inside the frame.
- **A lifted thing vanished**: raise `leave` (0.1–0.2 reads as a stain).
- **Paint under the captions**: keep the subject above the veil; do not turn the veil off to fit more in.
- **Words on a busy wash**: move them onto pale wash or bare paper.
- **A chart with no unit**: say what one dab is.
- **A page turn cutting off a line**: the sheet changes after the last word.
- Checks the runtime adds: paint switched on, the same entrance repeated, off-palette colours, washes too heavy, too much pencil, pushed in too far, camera too fast, nothing new for 6 s, too many fresh sheets, too much text.

## 12. Variation
- Palette: `reef`, `meadow`, `dusk`, `earth`, or one or two pigments replaced.
- Composition: one wide landscape wash; a small vignette in the middle of a lot of paper; a tall subject with a narrow wash behind it; a field of dabs and nothing else.
- Paper: `tooth: 0.6` (smoother, hot-press) to `1.4` (rough).
- Pace: a calm film is three or four sheets a minute with long blooms; a news piece is tighter, with more dabs, swatches and lifts.
- `seed` changes every edge, bloom and backrun while keeping the layout.

## 13. API quick reference
```js
const W = PROMO.watercolour(F, { palette: 'reef', seed: 'film-name', tooth: 1, veil: true, captions: {}, pigments: {} });
// washes — common options: x, y, rot, s, pigment, to, mix, density, edge, grade: [from, to], dir, blooms, z, at, until, enter, from, dur, exit, in
W.rect({ x: 0, y: -80, w: 1500, h: 700, pigment: 'cool', to: 'deep', density: 0.4, edge: 'wet', at: 0.3, enter: 'bloom', from: [-200, -200] });
const coral = W.branch({ x: -160, y: 280, h: 170, w: 30, depth: 4, tips: 15, pigment: 'warm', to: 'sun', density: 0.75, at: 2 });
coral.lift(9, { from: [300, 100], dur: 2.4 });            // washed out, a stain stays
coral.repaint(20, { pigment: 'hot', enter: 'grow' });      // the same shape painted again
W.lift(12, { on: [a, b, c], from: [0, 150], dur: 3 });     // one front across several things
const g = W.group({ x: 0, y: 0, at: 3, stagger: 0.1 });    // g.blob / g.stroke / g.dots / g.group / g.text … in local coordinates
g.to(6, { x: 300 }, 2); g.sway({ y: 6, rot: 3, period: 3 });
// information
const d = W.dabs({ x: 0, y: 100, n: 100, cols: 25, pigment: 'warm', at: 10 }); d.lose(12, { n: 84 }); d.take(12, { share: 0.25, pigment: 'hot' });
W.swatches({ x: 0, y: -150, items: [{ label: '1998', value: 21, note: '21%', at: 5 }] });
W.bars({ x: 0, y: 200, items: [{ label: 'A', value: 3 }, { label: 'B', value: 7 }] });
W.inset({ x: 330, y: -70, r: 300, at: 8, from: [-120, 80], build: (g) => { g.blob({ w: 200, pigment: 'sun' }); } });
W.label('name', { to: [100, 50], x: 320, y: -80, at: 9 });
W.number({ x: 0, y: -200, from: 0, to: 84, fmt: (v) => Math.round(v) + '%', at: 11 });
W.letters({ text: 'Title', x: 0, y: -300, size: 140, pigment: 'deep', at: 0.5 });
W.text('a note', { x: 0, y: -380, size: 40, at: 4, until: 9 });
W.pencil({ pts: [[0, 0], [100, 20]], at: 5 }); W.rays({ x: -200, y: -480, n: 5, at: 1 }); W.splatter({ x: 0, y: 0, pigment: 'hot', at: 6 });
// camera and sheets
W.cam(0, { x: 0, y: 0, z: 1 }); W.move(4, 7, { on: coral, pad: 3 }); W.page(30, { dur: 0.9, view: { x: 0, y: 2000, z: 1 } });
W.L(landscape, portrait); W.colors.warm; W.css('warm+sun', 1.2); W.box(node, t);
```
World units: 1 unit is 1 px of a 1080-high frame at zoom 1 (portrait: 1080 wide). y grows downward and (0, 0) is the middle of the first sheet.

## 14. Not supported yet
- No quick version (`--quick`) and no kit adapter: films are hand-written.
- No painted map from geodata (use `map` for a real map).
- No photos, screenshots or video inside the painting.
- No ready-made figures with poses; people are a few touches each.
- The sample was made and checked in 16:9. Portrait and square render, but a film's layout has to be written for them with `W.L`.
