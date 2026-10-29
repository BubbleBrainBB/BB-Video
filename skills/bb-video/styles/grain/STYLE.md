# Style: flat grain illustration (扁平颗粒插画, `grain`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

A frame is a flat vector illustration on warm off-white paper, in two spot colours (coral and navy by default) and their tints. Shapes have no outlines: buildings, hills, trees, vehicles and simple figures are plain geometry. Volume and light come from **stipple grain**, never from smooth gradients. Where a colour fades into its tint, into its shade or into the paper, it breaks up into dots. A thin coral ground line runs under everything. There is very little text: years, a sign, a readout, and a timeline ruler at the bottom whose year ticks over in coral.

Information is drawn into the picture:
- a circular inset close-up pops out of the thing it shows;
- a small navy diagram card holds a pale line drawing and a coral tag;
- readouts tick: a dial needle swings, a sign's number counts, a clock wedge grows or shrinks;
- rows of repeated things show quantity;
- columns rise from the ground line;
- a scene grows and turns into the next era in place;
- one full-colour spotlight beat floods the ground with the spot colour, with two cones of light on the subject.

The camera is a steady stage of its own design, not a side scroll:
- it holds, breathes (a slow push) and pushes in on a detail;
- chapters change through an **iris**: a circle opens from a detail of this scene into the next one.

Runtime: `runtime/grain.js` (`PROMO.grain(F, opt)`). New project:
- explainer (history, science, how things changed): `node explainer/scripts/new.mjs <dir> --style grain`;
- promo: `node scripts/new.mjs <dir> --style grain [--quick]`.

Starter pages: `styles/grain/explain.html` (narrated, timed from the narration) and `styles/grain/index.html` (promo, on the beat).

## 0. Safety
- **Figures are generic roles**: a worker, a reader, a driver. Never draw a likeness of a real person, and never a portrait standing in for a named inventor, laureate or founder. Name them in the narration only.
- **No other brands' trade dress.** Cars, buildings and devices stay generic: no logos, liveries or signature shapes of real products.
- Every year, sign and readout on screen is traced in brief.md. A rolling readout is fact-checked by its final value.

## 1. When to use
Use it for:
- history of a technology or habit, told era by era ("how the car / the light bulb / money / the phone changed");
- how a city or system grows;
- before / after;
- explainers where the picture can carry the numbers (rows of things, dials, columns);
- warm consumer and civic products: mobility, energy, home, travel, banking for people.

It suits less well:
- stories carried by named characters (figures are anonymous: use shadow / ink / manga / lumen);
- product UI tours (launch / toy3d);
- dense data dashboards (swiss / collage).

## 2. What it is (and isn't)
- **What it is**: an editorial flat illustration that grows. Each chapter is one stage on one ground line. Things rise, pop and stipple in; the scene transforms instead of cutting; a detail opens as a circle.
- **What it isn't**:
  - `riso`: no misregistration, no printed page or halftone dots, no page turns;
  - `cutout`: no scissor-cut paper edges or gouache;
  - `isometric`: no 3D, it is a flat side view;
  - `blueprint`: no line work.
- **Never** use smooth CSS or canvas gradients, outlines round shapes, drop shadows, or more than two spot colours with their tints.

## 3. Color
- Paper `#f7f3e9`.
- Palettes (`palette`), each with two spot colours, their tints, a shade, `white` and `skin`:

  | Palette | a / a2 / a3 / a0 | b / b2 / b3 / b0 |
  |---|---|---|
  | `coral` (default) | coral `#ef6a5e` / pink `#f6aca5` / blush `#f8d4ce` / deep `#d8504a` | navy `#2e4683` / blue `#5470b4` / sky `#c3cde6` / ink `#1b2b55` |
  | `mint` | teal / mint tints | plum / lilac tints |
  | `amber` | mustard / cream tints | deep teal / pale teal |

- Tone names work in every palette: `a a2 a3 a0 b b2 b3 b0 paper white skin`. The aliases are coral / pink / blush / deep and navy / blue / sky / ink.
- `--check` warns when more than two raw hex colours outside the palette are used (颜色越界).
- Roles:
  - **a** is warm things and the accent: lit windows, flames, the hot column, the current year;
  - **b** is structure and night: posts, frames, signs, the night sky;
  - tints are light and air; `b0` is darkness.
- **Night** is a navy arched panel standing on the ground line (or `G.flood(at, 'b0')` for the whole frame). Lights glow in `a2` / `a3` / `paper` grain inside it.
- Brand colour (`KITS.grain.tint`): a vivid brand colour replaces **a**, and its tints and shade are derived. Grey and black brands keep coral and navy. Hand-written films: `PROMO.grain(F, { colors: { a: '#…' } })`.

## 4. Type
- Inter 500 / 700 / 800 for Latin and numerals (tabular digits); Noto Sans SC 500 / 700 / 900 for Chinese. Both are OFL, loaded from jsDelivr in the starter.
- Sizes are in world units (1 unit = 1 px at zoom 1):

  | Text | Size |
  |---|---|
  | title | 70–90 |
  | a key number | 60–110 |
  | sign / readout | 30–44 |
  | labels | 24–36 |

- Very little text: years, a sign, a readout, a label under a column. `--check` warns at more than 7 pieces of text in view (字太多).
- Text enters by stipple (`enter: 'grain'`: the letters assemble from dots through a noise mask), by `rise` (up from its baseline) or by `type`. Numbers tick (`G.number`, the sign, the clock, the bars).
- The year lives on the ruler (`G.ruler` + `G.year`), not as a headline.
- The chapter name (script.json `chapter`) sits small at the ruler's left end and shows only while the ruler does. A film without a ruler shows it top left; `chapters: false` turns it off.
- Captions: navy semibold with a paper halo, no box; they turn paper-coloured on a night ground.

## 5. Motion
- Things enter by `enter`:

  | Entrance | What happens | Use for |
  |---|---|---|
  | `grain` (default) | stipples in | |
  | `rise` | grows up from its base with a soft spring | buildings, posts, signs |
  | `pop` | scales from its centre | small props, insets |
  | `drop` | falls in with a small bounce | |
  | `slide` | comes in from `from` | vehicles; wheels turn with the distance |
  | `wipe` | a grain front sweeps across in `dir` | columns fill up |
  | `draw` | lines draw on | wires, roads, pipes |
  | `none` | already there | |

- Exits: `exit: { at, to: 'grain' | 'sink' | 'pop' | 'slide' | 'lift' | 'wipe' }`.
- **The scene transforms in place**:
  - `G.swap(at, old, new)` stipples one era out and the next in on the same spot (a gas lantern becomes a bulb);
  - `node.to(at, { h, x, rot, fill… }, dur)` keys any parameter (a building grows, a colour turns);
  - new things rise around what is already there.
- **Grain never boils.** The noise field is seeded and anchored to each shape, so it moves with the shape and is identical every frame. Breathing is drawn as motion (a flame's scale, smoke rising, wheels turning), never as re-rolled grain.
- Vary entrances: `--check` warns at 7+ things in a row with one entrance (入场单一) and at shapes that appear with `enter: 'none'` mid-film (形状硬出现).

## 6. Camera and transitions
- **A stage, not a scroll.** One chapter = one stage on the ground line, built far from the others (x ≈ 0, 5000, 10000…).
- On a stage the camera:
  - holds and breathes (`drift`, a slow push of ≈0.4 % a second);
  - pushes in on a detail;
  - pulls out as the scene grows.
- `G.cam(t, view)` / `G.move(a, b, view, ease)`.
- `view = { on: node | [nodes] | box, pad, dx, dy, crop }` frames the subject inside the safe band (above the ruler and captions). `{ x, y, z }` sets it directly.
- Moves take ≥ 1.2 s. `--check` flags a camera faster than ≈1.6 frames (long side) a second (镜头太快).
- Zoom stays ≤ 2.2 so the grain keeps its size; for anything closer use an inset (`--check`: 颗粒放大).
- **Iris** `G.iris(a, b, view, { from })` changes chapters:
  - a circle with a blue ring opens from `from` (a node of the current scene, so the detail leads into the next scene);
  - inside the circle is the next stage at its own view; world text follows the circle;
  - use about one per chapter, ≤ 1 per 12 s (`--check`: 圆形转场太多).
- **Spotlight** `G.spot(a, b, { on, tone })`: the ground floods the spot colour, and two cones of paper light fall on the subject from the top corners. It flows back to paper at b. Use it once, for the film's peak.
- **Flood** `G.flood(at, tone, { how: 'grain' | 'radial' | 'up' })` changes the ground colour, e.g. night falling for the finale.
- **Portrait**: framings with `on` fit by height. A wide scene may run past the sides (`crop`, default 1.7 for wide subjects). Give info pieces `crop: 1` and portrait positions with `G.L(landscape, portrait)`.

## 7. Sound
- Music (`styles/grain/score.js`): a warm, curious bed in F major that walks forward like a picture book being turned:
  - a felt pad;
  - a plucked mallet figure stepping under the facts;
  - a round bass, a brushed shaker;
  - a bell motif at the open, the peak and the close.

  The turn thins before the spotlight beat. It ducks under the voice.
- Sound design (`sound.js`):

  | Sound | When |
  |---|---|
  | `grain` | a fine sand hiss for stippling |
  | `rise` | a wooden swish |
  | `pop` | a bubble |
  | `drop` | a knock |
  | `slide` | a cloth swish |
  | `fill` | columns |
  | `draw` | pencil lines |
  | `tick` | clock |
  | `roll` | counting numbers |
  | `needle` | a dial swinging |
  | `chime` | each new year on the ruler |
  | `iris` | the iris transition |
  | `flood` | the ground changing colour |
  | `spot` | the spotlight beat |
  | `drive` | vehicles |

  A faint room tone sits under it all. The reference programmes run narration over a light bed with small event sounds.
- Voice: a calm narrator, `zh-CN-YunxiNeural` (the explain.json default). Write numbers as numerals in script.json.

## 8. Signature moves (pick per film)
- **The scene grows into the next era**: houses rise along a street, lamps light one by one, a power station rises at its end, the lanterns turn into bulbs (`G.swap`).
- **The circular inset**: a close-up that pops out of the thing it magnifies (`G.inset`).
- **The iris** from a detail into the next chapter (`G.iris`).
- **Rows of things** for a big number: 72 candles for a year of candlelight, 100 bulbs for one LED's life (`G.row`).
- **A ticking readout**: a needle, a sign counting, a clock wedge (`G.gauge`, `G.sign`, `G.clock`).
- **The spotlight beat** in full colour (`G.spot`).
- **Night falls** and every window lights (`G.flood` + lit windows with `enter: 'grain'`).

## 9. Telling information
| Content | Device | Call |
|---|---|---|
| a detail / "what's inside" | circular inset with its own drawing, magnified | `G.inset({ x, y, r, zoom, from, build: (g) => … })` |
| a mechanism / a rule | small navy card, pale line drawing, coral tag | `G.card({ x, y, w, h, title, tag, build: (g, { w, h }) => … })` |
| a level / a share | dial with a needle, optional zone and readout | `G.gauge({ from, to, min, max, label, value })` |
| a price / a count | sign board whose number ticks | `G.sign({ title, from, to, unit, format, sub })` |
| a duration | clock face, coral wedge (12 or 24 h a turn) | `G.clock({ from, to, per, label })` |
| quantity | rows of the same thing | `G.row({ n, cols, gap, make: (g, i) => … } \| { item: 'figure' \| 'tree' \| 'car' … })` |
| comparison of amounts | columns rising from the ground line (lin / log), values ticking, labels under the line | `G.bars({ items: [{ label, value, hot }], scale })` |
| when | timeline ruler, year ticking over in coral, the next year faint ahead | `G.ruler({ from, to })`, `G.year(at, year)` |
| one number | big ticking number | `G.number({ from, to, unit })` |
| a label on a thing | tilted coral tag | `G.tag(text, { x, y })` |

The quick version and the generic explainer reach these through the kit:
- steps: little buildings rising along a dashed road, numbered;
- contrast: a day panel and a night panel, the winner with a glow;
- numbers: columns on the ground line;
- a spot on a real UI: a lens with a blue-and-blush ring;
- montage: spot-colour cells with a stipple glow.

## 10. Figures
`G.figure({ h, pose, tone, face: 'left' | 'right', hat: 'top' | 'cap' | 'hair', walk })`:
- a round head, a block body, stick limbs;
- poses: stand, walk, sit, point, wave, work, read, hold, cheer.

Figures are roles, not characters (`../CHARACTERS.md`). For a named cast, use a style with characters.

## 11. Pitfalls and self-check
- **Glows spilling** below the ground or out of a room: give the glow `above: 0` or `within: shapeNode` (clip to the cave / wall shape).
- **Navy on navy**: text and roofs on a night panel need `paper` / `b2` (roofTone), not `b`.
- **Insets cut off by the frame**: put the inset node in the camera's `on` list when it opens. `--check` warns when an inset reaches the ruler / captions band.
- **Empty insets and cards** are flagged (空的特写圈 / 空卡片).
- **Long static holds**: grow something, open an inset, tick a readout every few seconds. `--check`: 画面停太久 (> 7 s with nothing new).
- The motion sheet only measures DOM text. The canvas has its own checks: shapes switched on, the same entrance, camera speed, grain zoom, iris budget, text in view, palette.
- Look at `--stills` in both aspects next to the reference frames, then the full render's frame check.

## 12. Variation
- Palette: coral / navy ↔ mint / plum ↔ amber / teal; or a brand colour as **a**.
- Ground: paper day ↔ navy night panels ↔ a full night flood at the end.
- Chapters: iris ↔ the scene transforming in place ↔ a flood.
- Density: one hero object per stage ↔ a whole street or skyline growing.

## 13. API quick reference
```js
const G = PROMO.grain(F, { palette: 'coral' | 'mint' | 'amber', colors: { a, b, … }, grain: 1.1, drift: 0.004, captions, chapters, maxText: 7, portraitCrop: 1.7 });
// world units: 1 = 1 px at zoom 1; y down; ground line y = 0. G.L(landscape, portrait)
// every node: { x, y, rot, sx, sy, fill, shade, stroke, w, dash, at, until, enter, inDur, exit: { at, to, dur }, z, in: group, within: shapeNode, above: worldY, pivot }
G.rect({ x, y, w, h, r });  G.circle({ x, y, r });  G.ellipse({ rx, ry });  G.poly({ pts });  G.path({ d });  G.line({ pts, curve, stroke, w });  G.arc({ r, r0, a0, a1 })
G.group(o) → g.rect / g.circle / … (children in local coordinates), g.add((g) => …);  node.to(at, { … }, dur, ease);  G.swap(at, oldNode, newNode, { dur })
shade: 'top' | 'bottom' | 'left' | 'right' | 'fade' | 'fadeUp' | 'fadeL' | 'fadeR' | 'glow' | 'round' | 'speckle' | [{ c, d: [d0, d1], dir, s: [s0, s1], at }] | [{ base: { d, dir, s } }]
G.ground({ from, to });  G.hill({ x, w, h, tone });  G.tree({ x, h, kind: 'round' | 'cone' | 'poplar' });  G.cloud({ x, y, w });  G.sun({ x, y, r });  G.building({ x, w, h, tone, roof: 'flat' | 'gable' | 'saw' | 'dome' | 'spire', roofTone, chimney, windows: { cols, rows, tone, shade }, door }) → .windows / .body
G.figure({ x, h, pose, tone, face, hat, walk });  G.car({ x, w, tone, face });  G.pole({ x, h });  G.wire({ from, to, sag });  G.glow({ x, y, r, tone, d, core });  G.beam({ x, y, angle, spread, len, tone });  G.smoke({ x, y })
G.inset({ x, y, r, zoom, from, bg, ring, at, until, build });  G.card({ x, y, w, h, title, tag, build });  G.gauge({ x, y, r, from, to, min, max, at, dur, zone, label, value, pole });  G.sign({ x, y, w, h, title, from, to, format, unit, sub, at, dur, show, pole });  G.clock({ x, y, r, from, to, per, at, dur, label });
G.row({ x, y, n, cols, gap, rowGap, at, every, enter, make | item, props });  G.bars({ x, y, w, h, items: [{ label, value, text, hot, tone, at }], scale: 'lin' | 'log', max, unit, valueSize, labelSize });  G.number({ x, y, from, to, unit, prefix, at, dur, size });  G.tag(text, { x, y, tone, rot })
G.text(text, { x, y, size, tone, weight, at, until, enter: 'grain' | 'rise' | 'type' | 'none', align, wrap, kind, fact, on });  G.ruler({ from, to, span, step, major, at });  G.year(at, year)
G.cam(t, view);  G.move(a, b, view, ease);  G.iris(a, b, view, { from });  G.flood(at, tone, { dur, how, from });  G.spot(a, b, { on, tone, light, pad })
```

## 14. Not supported yet
- No 3D and no perspective: everything is a flat side view.
- Text is DOM text over the canvas: a shape can never cover a word.
- Text does not live inside insets (draw the detail; put its label beside the circle).
- No characters with a fixed cast (figures are anonymous).
- No photos or footage on the stage; for a real screenshot use the kit's `shot` (a navy frame) or another style.
- No quick-version `diagram` cue (board styles only).
