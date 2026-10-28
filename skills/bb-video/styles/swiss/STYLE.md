# Style: Swiss poster kinetic typography (瑞士风动态排版 / Kinetic Typography, `swiss`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

A frame is a Swiss International Typographic Style poster in motion. Huge grotesk type is the picture: words fill the frame, are set tight, and are cropped by its edge. The ground is off-white grid paper, with black and **one** accent colour taken from the product's brand. Micro meta labels sit in the corners (index numerals `.1 .2`, a date, a section name), with big arrows → and hairline rules on a grid. Type is never switched on: letters rise one by one out of their line, sentences rise word by word, digits roll in strips. Information is told typographically: numbered lists, check-chip card grids, giant numerals, flat bar charts, old / new side by side, and real screenshots placed as poster elements with accent marks. Between scenes the ground flips (paper → black → accent), whips, drops bands or opens a dot.

Runtime: `runtime/swiss.js` (`PROMO.swiss(F, opt)`). New project: explainer `node explainer/scripts/new.mjs <dir> --style swiss`, promo `node scripts/new.mjs <dir> --style swiss` (add `--quick` for the quick version). Starter page: `styles/swiss/index.html`.

The id is `swiss`, not `kinetic`: `kinetic` is already the name of the quick version's big-type format (`templates/formats/kinetic.html`).

## 0. Safety
- Full-frame ground flips (paper ↔ black ↔ accent) and hard cuts: at most one every ~1.5 s, never on every beat for long. The burst (fact montage) is the one place for fast cuts.
- Orbit rings and the extruded glyph turn slowly (`spin` ≤ 30°/s); the pattern wall drifts, it never strobes.

## 1. When to use
- **Launches, announcements and numbers**: benchmark and report releases, product launches with a few strong facts, annual results, "what's new in 3.0".
- **Lists and structure**: what something is made of (numbered lists), feature sets (chip grids), rankings and prices (bars), before / after (old / new).
- Design, editorial, developer and data products; brands with one strong colour.
- Less suited: warm, hand-made products (cut-out, origami); stories with named people (this style has no characters, `../CHARACTERS.md`); content that needs lots of photos for mood.

## 2. What it is (and isn't)
- **What it is**: type as image, on a grid. Few materials: one grotesk at one or two weights, hairlines, one accent, grid paper. Hierarchy comes from scale contrast (a 600 px numeral next to a 26 px label), alignment to a left edge, and asymmetric space.
- **What it isn't**: a slide deck with big words (every piece of type enters by motion, scenes change ground), a copy of a particular poster or template (no other brand's copy, layout or logo), or decoration (no gradients, shadows, bevels, glows — the extruded glyph is the one 3D object).
- Information first: a scene of big words only counts as "words only" in the density check. Use the list / chips / stat / bars / versus / shot components.

## 3. Color
- Ground: off-white paper `#F1F0EB` with a faint grid (`ground: 'paper'`); black `#111111` (`'ink'`); the accent (`'accent'`). Alternate grounds from scene to scene.
- **One accent, from the brand.** `PROMO.kit.brand('swiss', { brand, accent })` → `{ theme, kit }`, then `compose({ theme })` and `PROMO.swiss(F, kit)` (quick version: `film({ brand, accent })`). Of the brand's colours, the most vivid mid-tone becomes the accent (tamed to a poster-ink brightness); a very dark brand colour (a deep plum, a navy) replaces black for text and the dark ground. Black / white / grey brands keep the default red `#E5381F`. Write where the colours come from in brief.md.
- The accent is checked per ground: on the dark ground it is stepped lighter, on paper darker, until it reads (≥ 3.2:1). On an accent ground the text is whichever of ink / paper reads better, and the "accent" role goes to the other one.
- Colour roles (`'ink' | 'acc' | 'mute' | 'bg' | 'card' | 'line'`) are CSS variables on the scene layer; a component never hard-codes a colour, which is what lets the wall recolour a cloned poster.

## 4. Type
- Inter Tight 500 / 600 (a Helvetica-class grotesk, OFL) for Latin; Noto Sans SC 500 / 700 (思源黑体) for Chinese; both from jsdelivr in the starter page's `<head>`. List the Latin font first.
- Sizes (design, 1080p): meta 22–30, sentences 40–58, list rows 60–80, headlines 90–160, poster words 260–340, numerals 300–620. Tracking is tight on big Latin type (−0.045 em), normal on Chinese.
- **Every piece of type is brought in**:
  - `X.type`: letters rise one by one out of their line (`enter: 'rise'`, default; `'drop'`, `'slide'` a whole line inside its band, `'none'` only on a hard cut); they leave rising out the top (`exit: 'rise'`), fading, or with the cut (`'none'`).
  - `X.line`: words (Chinese: groups of up to three characters) rise in.
  - `X.meta`: wiped in from the left.
  - `X.stat`: digits roll in strips.
- Long Latin words may be hyphenated across lines (`'Intelli-\ngence'`), Swiss-poster fashion. `bleed: true` lets poster type run off the frame edge on purpose (the edge / top checks skip it) — only when the cropped part isn't the information: never crop a number, a version or a name.
- `mark: '2.0'` sets substrings in the accent; `colors: [...]` colours whole lines.

## 5. Motion
- Letters rise with a cubic ease-out, staggered 20–45 ms; the rise time grows with the type size so no letter travels more than ~5.5% of the frame per frame.
- Rules grow from one end; arrows draw their shaft, then the head; chips land from slightly below with a small scale-up while their check circle draws; bars grow from the axis while the value counts up; screenshots are revealed by a clip from one side while the image settles from 1.08×.
- Each scene layer pushes in very slowly (`push`, default 0.025 over the scene).
- Never more than ~16 things moving at once: letters count one by one. Stagger lines, and use `by: 'word'` for long titles.
- The motion sheet may list single letters under "linear start" (a letter starts rising at full speed by design, like impact type); the stiff-motion checks (pop-in, repeated entrance, empty box) must stay at 0.

## 6. Camera and transitions
- The camera barely moves; scale contrast and ground changes carry the energy. Exceptions: `X.wall` (pull-out) and the montage's hard cuts.
- Transitions: `X.wipe({ at, kind, onto })`, the scene changes at full cover (`at`, on the beat); `onto` is the next scene's ground, so a slab that would match it changes colour. Rotate them:
  - `whip`: a black slab whips across on a slight skew;
  - `bands`: vertical bands (black / accent) drop in and fall away;
  - `dot`: an accent dot grows from a point to cover the frame, then shrinks away.
- Hard cuts on the beat between montage cards (`F.cut`), each card on a different ground.

## 7. Sound
- Music (`styles/swiss/score.js`, A minor, 120 BPM): precise editorial electronica. A pluck figure ticking like type being set, a sub bass, a four-on-the-floor kick from the build, rim and hats, a bell motif for the hook, a supersaw only at the peak; sidechain on.
- Sound effects (`sound.js`), one material: type being set.
  - `rise`: a line rising (an air sweep);
  - `snap`: it locks;
  - `tick`: a sentence;
  - `chip`: a card lands (a felt knock);
  - `roll`: digits rolling (a ratchet);
  - `stamp`: a numeral lands;
  - `bar`: a bar grows;
  - `slide`: a screenshot is revealed;
  - `mark`: an accent outline draws;
  - `pull`: the wall pulls out, frames push in;
  - `whoosh`: transitions.

  The logo is a click, a stamp and two bells.

## 8. Signature moves (pick per film)
- **The poster assembles, then pulls out into a wall of itself** (`X.wall`): at `at` a still copy of the scene is tiled around it in the other grounds (black / accent / paper) and the camera pulls out. Best right after the hook poster lands.
- **Giant numeral cards on hard cuts**: one fact per card — `X.stat` + the feature / item name + one line — each card on a new ground, cut on the beat. This is the burst.
- **Text-pattern wall** (`X.pattern`): a phrase repeated in rows drifting in opposite directions, grey, flipping to the accent row by row on a beat.
- **Extruded glyph** (`X.extrude`): a numeral or letter extruded and turning in 3D, inside dotted orbit rings (`X.orbits`), for the drop (the leader's score, the version number).
- **Nested frames** (`X.frames`): rounded frames push in around one punchy line in a black pill.
- **Giant cropped glyph** (`X.glyph`): a chapter number or initial far bigger than the frame, sliding behind a scene (decorative, not registered as text).
- **Meta furniture**: index numerals `.1 .2`, a date, a section name in the corners, a big arrow →, a full-width hairline.

## 9. Telling information
| Component | What it tells | Look |
|---|---|---|
| `X.list` | steps, points, categories (with values) | `.1 .2 .3` index, a big row of type, the value right-aligned, a hairline under each row |
| `X.chips` | a feature set, the parts of something | check-chip cards tiling into a grid on a diagonal wave, black / card alternating, `hot` in the accent, a tag top-right |
| `X.stat` | one number that matters | a giant numeral rolling in, a readable label under it |
| `X.bars` | a few numbers compared (scores, prices) | flat horizontal bars from a hairline axis, values counting at the bar ends, `hot` in the accent |
| `X.versus` | old / new, before / after | two columns (portrait: rows) split by a rule with an accent arrow; the old side greyed |
| `X.shot` | the real thing: a page, a chart, a UI | the screenshot as a flat poster element with a caption; `marks` draw accent outlines with numbered tags, dim the rest, and set notes in a column (landscape) or below (portrait); `crop` shows one region bigger (marks stay in image fractions) |

These register themselves with the density check. Real screenshots are captured with `scripts/capture.mjs` (element screenshots of charts are fine; never download site files).

## 10. Pitfalls and self-check
- Too empty: a Swiss frame is spare but never vacant. Every scene needs one dominant element (a numeral, a poster word, a chart) plus meta furniture.
- Too many sizes: keep to three or four steps per scene.
- Cropping the information: `bleed` only for decorative crops; the hook title in portrait must still show its version / name.
- Text over text: a pattern wall is a texture (other text may sit on it); everything else keeps its own space — the overlap check is on.
- Long lines in montage cards: a card lasts 1.5–2 s; keep its line under ~12 Chinese characters / 5 words.
- Self-check per `references/review.md`; look at portrait stills one by one (portrait is a new layout: stack, don't shrink).

## 11. Variation
- Ground rhythm: paper-led (calm, editorial) ↔ black-led (dramatic) ↔ accent-led (loud, brand-heavy).
- Grid: fine grid (variant 0), grid with column guides (1), baseline rows (2), plain (3).
- Type voice: medium-weight, tight and cropped (default) ↔ lighter and airy with more space; Latin-led ↔ Chinese-led headlines.
- Pace: one fact per beat in the burst ↔ a slower poster-by-poster read.

## 12. API quick reference
```js
const { theme, kit } = PROMO.kit.brand('swiss', { brand: '#…', accent: '#…' });   // → compose({ theme })
const X = PROMO.swiss(F, kit);                                                       // { accent, colors: { ink, paper, grey }, ground, font }
const L = X.scene(a, z, { ground: 'paper' | 'ink' | 'accent', variant: 0–3, grid, push: 0.025 });
X.type(L, { text: 'Line one\nLine two', x, y, top, size, weight, align, color, colors, mark, markColor, maxW, at, until, by: 'char' | 'word' | 'line', enter: 'rise' | 'drop' | 'slide' | 'none', exit: 'rise' | 'fade' | 'none', stagger, dur, zoom, drift: [vx, vy], bleed, kind }) → { el, move(t, x, y, dur) };
X.line(L, { text, x, y, top, size, maxW, align, color, at, until, exit: 'rise' | 'none', kind, per, dur });   // exit: 'none' (also X.stat / X.bars / X.rule) = leaves with the transition that covers it
X.meta(L, { text, x, y, size, align, color, at, until, fact: false, chrome });
X.arrow(L, { x, y, size, dir, color, weight, at, until });
X.rule(L, { x, y, w, h, vertical, color, from, at, until });
X.list(L, { items: [{ text, value, note, hot, at }], x, y, w, size, gap, at, every, until, num: (j) => '.1' });
X.chips(L, { items: [{ text, tag, hot, at }], x, y, w, h, cols, gap, size, icon, at, every, until, scheme: 'alt' | 'ink' | 'paper', order: 'diag' | 'list' });
X.stat(L, { value: '1,000', label, labelSize, labelW, labelPos: 'below' | 'above', x, y, size, align, color, maxW, roll, bleed, at, until });
X.bars(L, { data: [[name, value, { hot, text, at }]], x, y, w, h, nameW, size, unit, prefix, decimals, max, at, every, until });
X.versus(L, { cols: [{ label, value, title, points, ats, hot, at }], x, y, w, h, at, every, until, stack, arrow, dimOld });
X.shot(L, { src, x, y, w, h, fit, pos, crop: { x, y, w, h }, from: 'left' | 'right' | 'top' | 'bottom', caption, at, until, marks: [{ x, y, w, h, note, at, noteY }], notes: 'right' | 'below', dim, keep }) → { el, box, img };
X.wall({ source: L, at, until, snap, cols, rows, to, dur, pan, grounds, gap });
X.pattern(L, { text, sep, size, rows, speed, color, flip, flipColor, at, until });
X.glyph(L, { char, x, y, size, color, rot, drift, from, at, until });
X.extrude(L, { text, x, y, size, depth, layers, color, side, spin, tilt, from, turn, at, until });
X.orbits(L, { x, y, r, rings, color, at, until });
X.frames(L, { text, x, y, w, h, n, size, at, until });
X.wipe({ at, kind: 'whip' | 'bands' | 'dot', onto: 'paper' | 'ink' | 'accent', color, dur, x, y });   // onto = the next ground: a slab that would match it switches colour
X.end(L, { at, title, mark, sub, url, meta: [left, right, …], size });
```
Time: `at` = landed and readable (on the beat), `until` = fully gone. Units: `x, y, w, h, maxW` are frame px; `size` is a design size.

Common interface (`runtime/kit.js`, used by the quick version and explainers in this style):

| Move | In this style |
|---|---|
| `bg` | grid paper; variant 0 paper, 1 black, 2 paper with column guides, 3 accent |
| `word` | grotesk letters rising out of the line (variant 1 = accent) |
| `line` | a sentence, words rising |
| `card` / `shot` | a flat card with a hairline edge, revealed upward / a screenshot as a poster element |
| `accent` | a thick accent bar slides under the word and an arrow lands at its end |
| `wipe` | whip / bands / dot in turn |
| `end` | the name set big, a rule, the line, → url |

| Information move | In this style |
|---|---|
| `steps` | numbered list `.1 .2 .3` |
| `versus` | two columns split by a rule with an arrow |
| `figures` | flat bars from a hairline axis |
| `spotlight` | an accent outline drawn round the spot, the rest dimmed |
| `flash` | a full-frame ground with the word pinned bottom-left and a giant cropped index numeral |

## 13. Not supported yet
- Characters (no cast; for stories about named people recommend whiteboard / ink / shadow / pixel / chat / manga).
- Variable-font animation (weight / width morphing) — weights are fixed per element.
- Glyph-outline morphs (a letter turning into a shape) beyond the extruded glyph and the rings.
- Video footage inside a poster frame (use `PROMO.clip` by hand).
