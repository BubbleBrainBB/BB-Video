# Ink-wash style (水墨, `ink`)

> Relative paths in this file (`scripts/…`, `references/…`, `templates/…`, `GUIDE.md`) are relative to the `explainer/` folder of bb-video.

The whole video is **one long handscroll (手卷)** painted on rice paper. The cover is the opening of the scroll; every chapter is a further **section** of it, and moving to a new section pans the camera along the scroll (or cuts, or floods with ink).

## 1. When to use

| Topic fit | |
|---|---|
| Best | Historical stories and allusions, classical poetry, idioms (成语), Chinese culture and philosophy, seasons and nature, anything with a calm, contemplative tone |
| Works | Concept explainers, word explainers, how-to (tea, calligraphy, cooking), light data (a few numbers, a brush bar chart) |
| Avoid | Formula-heavy problem walkthroughs (no formulas in this style: use `whiteboard`), dense data, busy modern tech topics |

For an allusion or historical story (mode E in `references/modes.md`) the ink-wash handscroll is the natural fit; switch to `whiteboard` when the story needs diagrams, maps or many acted scenes. For phenomenon and concept explainers, ink suits Chinese culture, philosophy, poetry and nature.

## 2. What it is (and isn't)

**The painting is the animation.** Nothing should simply fade in: landscapes are painted (contours brushed, then the wash bleeds down), figures are drawn line by line and then washed, calligraphy is written stroke by stroke in real stroke order, people walk, run and ride with real gait cycles, and the camera moves through layered depth. **Every narration line shows what happens** (who does what, where) — not a label next to the narration.

- **Leave paper bare (留白)**. A section has one focal point; big empty areas are part of the composition, not wasted space.

Everything is painted on a canvas: each element is painted once into a cached bitmap, and each frame only composites and reveals the bitmaps, so renders are fast (a 40-second video renders in about half a minute).

## 3. Color
- **Brand colour**: none — ink-wash has two colours only (ink and cinnabar). `film({ brand })` is ignored; show the brand through the product's own images and the end card text.

- **Two inks only**: ink (墨, black in many dilutions) and cinnabar (朱, `red`). Cinnabar is for emphasis only: the keyword of a title, a 朱批 (cinnabar annotation) circle, a seal. At most one or two red things on screen at a time.

The ground is warm rice paper (`rgb(237,227,205)` with a paper texture), and the stage background is set to the paper colour. Colour names resolve through `INK.COLORS` in `runtime/ink.js`: `ink`, `red` (cinnabar), `gray`, `light` and `paper`; a raw `'r,g,b'` string is also accepted. Shades of ink come from the `ink` / `tone` amounts of each element, not from extra colours.

## 4. Type

- **Text is written, not typed**: titles and key words are brush calligraphy, written character by character; explanations are short lines of 楷书 (kai). Keep on-screen text far shorter than the narration (a few words per idea).

Four Chinese fonts are used, each with system fallbacks (`INK.FONTS`): LXGW WenKai (霞鹜文楷) for `kai`, Ma Shan Zheng (马善政楷书) for `brush`, Zhi Mang Xing (钟齐志莽行书) for `xing`, and Liu Jian Mao Cao (刘建毛草) for `cao`. `fonts-ink.css` tries each one installed locally first, then jsDelivr, then an unpkg mirror; the web fonts are sliced by character, so only the characters used are downloaded. If none is available, the fallback fonts are used and the render goes on as usual.

### Calligraphy and text
```js
b.write('国士{red:无双}', { x: 1150, y: 150, size: 175, vertical: true, align: 'center', at, charDur: 0.4 });   // written stroke by stroke, in real stroke order

b.calli('国士{red:无双}', { x: 1150, y: 150, size: 180, font: 'xing', vertical: true, align: 'center', at: T.word('l6', '国士无双'), dur: 1.6 });
b.title('萧何月下追韩信', { x: 130, y: 250 });             // calli at size 150
b.text('何闻信亡，不及以闻，自追之。', { x: 120, y: 150, size: 44 });   // body text in kai (楷)
```
- `font`: `brush` (楷书 brush, default for calli: titles, key words) · `xing` (行书: inscriptions, quotes, the emotional peak) · `cao` (草书: rare, for bold dramatic moments) · `kai` (default for text).
- Options: `size`, `color` (`ink` | `red` | `gray`), `align` (`left` | `center` | `right`, relative to x), `valign`, `w` (wrap width; Latin words stay whole, `，。` never start a line), `vertical: true` (columns read right to left; `h` limits the column height), `lh`, `spacing`, `dry` (dry-brush amount), `speed` (characters per second: calli 2.6, text 10), `enter` (`write` default · `fade` · `wash`).
- `b.write()` writes each character **stroke by stroke in real stroke order** (stroke data from Make Me a Hanzi via `hanzi-writer-data`, Arphic Public License, downloaded while building, about 9000 common characters; without network it falls back to the font with a writing wipe). `charDur` seconds per character (0.3–0.5 for words that go with the narration, ~1.2 for one big character), `weight` thickens the strokes. Use it for the key word of a line.
- `b.calli()` uses a brush font (楷书 / 行书 / 草书 look) revealed along the writing direction: titles, inscriptions. Body text appears quickly the same way.
- `item.part('无双')` / `item.part(2, 4)` gives the box of some characters (for circling or marking).
- Sizes: calligraphy 96–200; body text ≥ 40 (lint warns below 28 on screen).

## 5. Motion

Plan every line as **a shot of what happens**: a place (landscape painted in, or props built with `shape`), people doing the action of the line (walk away, ride after, bow, point, speak), and at most one written word that carries the line's weight. Keep something moving in every shot (a figure, the camera drift, the writing).

- Timing works like the other styles: every element takes `at` (seconds, or an element = its end) and `dur`; without `at` it follows the previous element (`b.at(t)`, `b.wait(s)` move the cursor). Always take times from the timeline (`T.start`, `T.word`, ...).

How each kind of element enters is described with it: mountains are painted in and the moon blooms (Landscape), figures are drawn then washed (Figures), calligraphy is written (Type). Items can later be erased, moved, scaled or pulsed (see the item methods in "API quick reference").

## 6. Camera and transitions

```js
const b = INK.board({ T, seed: 'slug' });                  // options: res (cache resolution, default 1.25), sectionGap (bare paper between sections, default 420)
const cover = b.cover({ title: '萧何月下{red:追}韩信', subtitle: '一个逃兵，凭什么让丞相连夜去追？', seal: '国士无双' });
const s1 = b.section({ at: cover.hold });                  // pan along the scroll to the next section (1.6 s)
// ... draw section 1 (start drawing at s1.ready, when the camera has arrived)
const s2 = b.section({ at: T.end('l2') + 0.15 });
const s3 = b.section({ at: T.end('l4') + 0.1, transition: 'ink' });   // ink floods the frame and clears on the new section (1.2 s)
```
- `transition`: `scroll` (default, pans along the scroll) · `ink` (墨染, for a turn in the story: a change of place or time) · `cut` (into a close-up, or into a tracking shot). `gap`: bare scroll before the section — give a tracking shot room (e.g. `gap: 3600` for a long ride).
- A section returns `{ x, start, ready, ... }`: begin drawing at `s.ready`. Backgrounds (`scenery`, `mountains`, `moon`) may start a little before `ready`, so they wash in while the camera arrives.
- Put the section change in a pause between two narration lines, and leave ≥ 0.8 s after the last thing is drawn before moving on (the lint check enforces both).
- Camera inside a section: `b.focus(item | [items] | {x,y,w,h}, { at, dur, zoom })` pushes in (keeping clear of the chapter bar and captions), `b.focus(null, { at })` pulls back; `b.view({ x, y, zoom, at, dur, ease })` drifts to a local point (a slow drift keeps a shot alive); `b.follow(item, { at, dur, dx, blend })` rides along with a moving figure or horse (dx = lead room ahead of it). Keep zoom ≤ 1.6.
- **Depth**: any element takes `depth` — `< 1` far (moves slower than the camera: far mountains 0.3, moon 0.15), `> 1` near (faster: foreground grass 1.4). With a moving camera this layered parallax is what makes a shot feel deep.

## 7. Sound

The ink runtime makes no sound effects; the sound is the synthesized background music (`scripts/bgm.mjs`). An ink project is created with `"bgm": "history"` in `script.json`: pentatonic scale (gong, shang, jue, zhi, yu), guzheng-style plucks and a deep drum, the natural match for allusions, history and Chinese culture. When the mood doesn't match, choose by mood (e.g. a light-hearted anecdote can use `playful`; see "General: background music" in `references/modes.md`). Volume, ducking under the voice and chapter chimes are handled as for every style (see GUIDE.md).

## 8. Signature moves

- **Scroll pan (卷轴移镜)**: chapter changes; also a slow `b.view()` drift across a wide landscape.
- **Tracking shot (跟拍)**: `b.follow()` a rider or walker through layered depth — the strongest way to show a journey or a chase.
- **Brush writing (毛笔书写)**: `b.write()` stroke by stroke, in sync with the narration word (`at: T.word(...)`); a cinnabar character + `b.splash()` for the climax word.
- **Ink bloom (墨晕)**: `b.blot()` for a name or key word appearing out of spreading ink.
- **Cinnabar marks (朱批)**: `circleAround` / `underline` / `mark` in cinnabar after the text is written — the teacher's red brush.
- **Seal stamp (盖印)**: `b.seal()` to close a section or name a conclusion.
- **Ink-flood transition (墨染转场)**: `transition: 'ink'` for a turn in the story.
- **Figures (人物)**: walk / run across the scroll with `.move()`; speak with `.say()`; react with `.expr()`.

## 9. Board, sections and layout

- **Top 110 px** holds the chapter bar (when there are ≥2 chapters), **bottom 140 px** the captions: keep text and seals out of them. Figures and landscape may run under them.
- Coordinates are **local to the current section**: (0, 0) is its top-left, 1920 × 1080 is one screen (1080 × 1920 in portrait, see below).
- Screen-fixed items (`hud: true`) leave with the section they were made in; add `persist: true` to keep one across sections.

The board, sections and their transitions are set up as shown in "Camera and transitions".

**Portrait (9:16)**: `render.mjs --aspect 9:16` renders the same project at 1080×1920 (`EV.composition` reads the aspect). The scroll still unrolls sideways — each section becomes one tall leaf (1080 × 1920) and the camera pans to the next — so nothing structural changes, but the layout inside a section does:
- The cover, its scenery (mountains at the bottom of the leaf), the vignette, chapter bar and captions adapt by themselves. Captions sit at about 78 % of the height (the bottom 22 % is covered by the platform); the content area is `b.safe` = `{ top, bottom }` (at 1080×1920 `bottom` ≈ 1358: keep text above it; the cover's `area` stops there and the check warns about a 9:16 cover reaching below it), and with 4+ chapters the bar shows only the current chapter's name.
- Your own coordinates don't: write them once per aspect with `EV.L(landscape, portrait)`. Stack the section vertically — calligraphy / title at y ≈ 300–500, the figures or picture in the middle, a seal or note below — with x within 80–1000.
- Figures stand around `y = EV.L(1000, 1350)`; two figures face each other within ~700 px; a horse plus rider needs about 900 px of width, so ride across the leaf diagonally or crop.
- `b.overview()` in portrait shows the whole scroll as a thin strip in the middle; for a portrait ending prefer a last section with the closing line and a seal.

## 10. Cover

`b.cover({ title, subtitle, seal, scenery, hold, font })` — complete on the first frame: a landscape with the moon washed out of the sky (`scenery: false` turns it off, or pass `scenery` options), the title in brush calligraphy (`{red:keyword}`, auto-sized to fit 1–2 lines), a dry brush stroke under it, the subtitle in kai and a seal. Returns `{ hold, end, area, items }`. `lead_in` in script.json is 3.3 s so the narration starts after the pan away from the cover.

## 11. Figures (写意人物)

Story rules for every style with characters (fixed cast called by name — `b.figure('萧何', …)`; people in one scene differ in two attributes; two-person moments face to face — `faceTo: other` when created, `.faceTo(at, other)` later; chains of events as a relay): `../CHARACTERS.md`.

Classical figure-painting look: line and light wash, mostly bare paper; outlines with pressed starts and long thin tails (钉头鼠尾); long sleeves that hang and stream in the wind; a long face with phoenix eyes (丹凤眼), fine even lines (游丝描) and tinted lips. All figures come from one parametric drawing — never draw a person by hand.

```js
// characters.js
window.CAST = {
  萧何: { age: 'elder', hat: 'jinxian', beard: 'wisp', tone: 0.42, accent: 'sash' },
  韩信: { age: 'adult', hat: 'kerchief', tone: 0.3, accent: 'hat', prop: 'sword' },
  刘邦: { age: 'adult', hat: 'guan', beard: 'long', tone: 0.72, accent: 'sash' },
  老师: { hat: 'short-hair', outfit: 'modern', tone: 0.35, accent: 'none' },
  孟母: { sex: 'female', tone: 0.3, accent: 'hat' },          // high bun + cinnabar hairpin, long dress
  孟子: { age: 'kid', hat: 'tufts', tone: 0.22, accent: 'sash' },
};
```
| Spec | Values |
|---|---|
| `sex` | `male` (default) · `female` (defaults to `hat: 'bun'` and `outfit: 'dress'`, finer arched brows, softer jaw, never a beard) |
| `age` | `adult` · `elder` (grey hair, beard and brows) · `kid` (child proportions: big head on a short body, about 80% of `size` tall — give a child a smaller `size` than the adults next to it) |
| `hat` | `none` (topknot) · `bun` (高髻, a woman's tall bun with a hairpin; red with accent `hat`) · `tufts` (总角, a child's two knots) · `guan` (small crown on the knot) · `jinxian` (进贤冠, officials and scholars) · `kerchief` (头巾, commoners, young men, soldiers) · `helmet` (generals, cinnabar plume) · `short-hair` · `long-hair` (modern) |
| `beard` | `none` · `wisp` (three thin strands) · `long` · `short` |
| `outfit` | `robe` · `dress` (high waist, wide hem over the feet trailing behind, two ribbons from the sash) · `armor` · `modern` (shirt and trousers) |
| `tone` | how much wash on the clothes, 0.2 (pale) – 0.8 (dark): the main way to tell figures apart |
| `accent` | where the one cinnabar touch goes: `sash` · `hat` · `collar` · `none` |
| `prop` | `none` · `sword` · `scroll` · `fan` |

```js
const he = b.figure(CAST.萧何, { x: 1250, y: 905, size: 330, facing: -1, pose: 'run', expr: 'worried', at });
he.move(t, -330, 0, 3.4, EV.ease.inOutSine);           // walking / running across the scroll bobs gently
he.say('l6', { from: '诸将' }).expr(T.start('l7'), 'smile').pose(t, 'point');
```
- `x, y` = the point between the feet; `size` = full height in px; `facing` 1 (right) / -1 (left). Figures blink by themselves.
- Entrance (`enter`): `draw` (default — the outlines are drawn stroke by stroke from the top down, then the washes soak in; ~1.4 s) · `wash` · `wipe`.
- Poses: `stand` · `gongshou` (拱手, greeting / respectful listening) · `point` · `present` (open hand, offering an idea) · `think` (hand to chin) · `bow` · `walk` · `run`. `.pose(at, name)` cross-fades.
- **Walking and running are real gait cycles**: a figure in pose `walk` / `run` steps (feet, hem, sleeves, a little bob) whenever it moves, and the step follows the distance travelled, so feet never slide: `fig.move(at, -560, 0, 3.4, EV.ease.linear)`.
- `.turn(at)` turns the figure round in place (facing flips, a short cross-fade): looking back, turning to someone who speaks.
- Expressions: `neutral` · `smile` · `happy` · `worried` · `sad` · `angry` · `surprise` · `think` · `serious`. `.expr(at, name)`.
- `.say(ids, { from, to })`: the mouth moves with the words of those narration lines — use it when the figure is the one speaking (a quoted line), not for the narrator's description.
- **Horse**: `b.horse({ x, y, size, facing, tone, gait: 'gallop' | 'walk' | 'stand', rider: CAST.someone, riderExpr, saddle: 'red' | 'ink' | 'none' })` — a 写意 (freehand) horse whose legs, head, mane and tail cycle with the distance travelled; the rider sits in the saddle with the reins. `horse.move(...)` + `b.follow(horse, ...)` + depth layers make a riding shot.
- **Scale tells the story**: small figures (150–350 px) inside a landscape are the most painterly (journeys, chases, crowds); a medium figure (500–800) for an action; a **close-up** for speeches: place a very large figure below the frame (e.g. `size: 2650, y: 2900`) so only the head and shoulders show — lines stay fine at any size.
- `enter`: `wash` (default, soft focus to sharp) · `wipe` (painted from the top down).
- Model sheets: `node scripts/cast.mjs videos/<name>` (all figures) or `... <name> 萧何` (all expressions and poses of one). **Show new figures to the user with their sheets for confirmation.**

## 12. Pitfalls and self-check

- [ ] Cover is complete on frame 0; narration starts after the pan away from the cover (lint checks this)
- [ ] Each section has one focal point and plenty of bare paper; nothing crowds the chapter bar or captions
- [ ] Red is used only for emphasis (≤ 2 red things on screen at once); one seal per section at most
- [ ] Calligraphy is written in time with the narration word it illustrates
- [ ] Section changes sit in pauses, with ≥ 0.8 s after the last element is finished
- [ ] Figures are recognisable by silhouette: hat, beard, tone and accent differ between people
- [ ] Facts in historical stories are from the source; later embellishments are labelled as such
- [ ] Every line shows an event, not only a label; something moves in every shot (strip-check with `--strip`)

## 13. Variation

The palette is fixed (two inks on rice paper; there are no alternative palettes), so two ink videos differ in composition and pacing: where the mountains gather and whether there is a moon or water (`scenery` options), which transition leads into each section (`scroll`, `ink`, `cut`), the scale of the figures (small in a landscape, medium for an action, close-up for a speech), tracking shots versus still sections with a slow drift, the calligraphy hand (`brush`, `xing`, `cao`) and the cast's tones and accents.

## 14. API quick reference

Every element returns an item with `.start .end .box` (world coordinates) and `.erase(at, dur)`, `.move(at, dx, dy, dur, ease)`, `.to(at, { x, y, scale })`, `.pulse(at)`.

Documented above: board, sections, `b.focus` / `b.view` / `b.follow` and `depth` in "Camera and transitions"; `b.cover` in "Cover"; `b.write` / `b.calli` / `b.title` / `b.text` in "Type"; `b.figure` and `b.horse` in "Figures". The other elements:

### Brush marks and 朱批 (cinnabar annotations)
```js
b.stroke([[x1, y1], [x2, y2], ...], { width: 10, ink: 0.9, dry: 0.4, color: 'ink' });   // any brush stroke, drawn along its path
b.line(x1, y1, x2, y2, { width: 7, bend: 0.04 });
b.arrow(x1, y1, x2, y2, { bend: 0.12, width: 8 });
b.circleAround(target, { part: '无双', pad: 22 });      // cinnabar brush circle (圆相), the main way to emphasise
b.underline(target, { part: '重用' });                  // cinnabar stroke under (or beside, for vertical text)
b.mark(textItem, { part: '国士' });                     // 圈点: small circles beside each character, the classical emphasis mark
```
- `dry` 0–1: how much flying-white (飞白) the stroke shows. `width` stays modest (4–12 for lines; 16–30 for bold strokes).
- `target` is an item, a group, or a local box `{x, y, w, h}`.

### Props and buildings
`b.shape(points, { tone, width, color, lineColor, open, smooth, at })` — any object drawn in ink: the outline is brushed, then the wash soaks in (`tone` 0 = outline only; straight edges by default, `smooth: true` for curves; `open: true` for a line such as a beam). Build tents, altars, walls, boats, tables, banners from it (write a small helper in the project, e.g. `tent(x, y, w, at)`).

### Seal, ink blot, splash, number
```js
b.seal('大将', { x: 1440, y: 600, size: 170, at: T.word('l7', '大将') });   // stamped on; white characters cut out of cinnabar (yang: true = red characters)
b.blot(960, 540, 360, { text: '韩信', at, dur: 1.4 });  // 墨晕: a drop of ink spreads on the paper, the name appears reversed out of it
b.splash(520, 380, 150, { color: 'red', at });          // 溅墨: droplets of ink, e.g. when a big character is finished
b.number(1200, 500, { from: 0, to: 30, suffix: '万', size: 140, at });       // rolling number in brush font
```
Seals mark a conclusion or a name (2–4 characters); one per section at most. The ink blot is a strong entrance for a name or a key word: use it once or twice per video.

### Landscape
```js
b.scenery({ side: 'right', moon: true, at });           // ready-made: moon (烘云托月), far + middle mountains, a near peak, water lines
b.mountains({ x0, x1, base, peaks: [{ x, w, h }], tone, blur, ridge, moss, texture, at });
b.moon(x, y, r, { at });  b.water(x, y, w, { at });
b.paperBand(x, y, w, h);                                 // bare paper laid over what is below
```
- Far mountains: low `tone` (0.2–0.3), `blur` 4, no `ridge`. Near peaks: `tone` 0.7–0.85, `ridge` 8–12, `moss` 20–30. Mountains are **painted in** (contours brushed left to right, then the wash bleeds down; `dur` ≈ 1.6–2.2); the moon **blooms** out of the sky; water ripples are brushed one by one. For a shot that cuts straight into a finished landscape use `dur: 0`.
- `scenery` options: `side` (where the mountains gather), `moon` (`false` / `[x, y, r]`), `near`, `water`, `scale`, `base`, `skyTone`.

### Images and video
`b.image(src, { x, y, w, h, align, tone, frame, at, play })` — `tone: 'ink'` (default: grayscale, printed into the paper) · `'sepia'` · `'color'`; `frame: 'mount'` (default: a silk border) or `'none'`. Video clips use the same `{ clip, from, rate, to }` spec as the other styles (prepare media with `scripts/assets.mjs`).

### Bar chart
`b.bars([['2019', 12], ['2024', 30]], { x, y, w, h, hot: [1], unit: '万', at })` — bars are vertical dry brush strokes rising from a brush baseline; `hot` bars in cinnabar.

### In promo videos
The same board makes promos (no voiceover, on the beat, 16:9 + 9:16): `node promo/scripts/new.mjs <dir> --style ink [--quick]` (paths from the skill folder). The board runs inside a promo film through the common interface (`promo/runtime/kit.js`, documented in `promo/references/kit.md`): each scene is a section of the scroll and the transitions move along the scroll or flood it with ink; big words are brush calligraphy; the signature move splashes ink; the end card can be sealed. `S.board()` gives the board itself for anything the common verbs don't cover. In a montage (`montage` cue) each frame is an ink blot with the word reversed out; items drawn for a deliberate quick cut take `flash: true`, which skips the "held too short" warning. The information verbs (flow, compare, chart, annotated screenshot, diagram: `promo/references/kit.md`) are brushed: pale-ink frames, brush arrows, cinnabar circles, the board's dry-brush `b.bars`, colour bands as light washes. Starter sound and score for promos: `styles/ink/sound.js`, `score.js`.

## 15. Not supported yet

- **Formulas**: ink-wash has no formula rendering; use `whiteboard` for problem walkthroughs.
- **Dense data**: only light data (a few numbers, a brush bar chart).
- **Board overview**: ink-wash exports no `out/board.png` overview; only the cover `out/cover.png` is exported after the final render.
