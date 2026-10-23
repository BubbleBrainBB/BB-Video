# Risograph (`riso`)

> Relative paths in this file (`scripts/…`, `references/…`, `templates/…`, `GUIDE.md`) are relative to the `explainer/` folder of bubble-video-skill.

Like a carefully printed indie magazine: a few spot-color inks overprinted, ink layers slightly misregistered, halftone for light and shade, ink grain on the paper.
The video is organized in **pages**: one chapter is usually one page. But it isn't a slideshow: pages change with a variety of transitions, the camera pushes in within a page, and elements can carry over from one page to the next.

## 1. When to use
| Good fit | Poor fit |
|---|---|
| Everyday science, fun facts ("Why does coffee keep you awake?") | Ancient history, classical stories, traditional culture → use `whiteboard` |
| Psychology, behavioral economics, social phenomena ("Why do we procrastinate more when busy?") | Grave, heavy topics (disasters, illness, conflict) |
| News explainers, finance, practical takeaways (use the `news` palette) | Long derivations full of formulas → use `whiteboard` |
| Numbers and comparisons ("How much of your life do you spend on your phone?") | Stories that need a lot of character acting (this style doesn't support characters yet) |
| Food and lifestyle tutorials, English words, modern-era stories | |

By content mode (`references/modes.md`, "General: visual style"): phenomenon and concept explainers on everyday, psychology and social topics (palettes such as `lively` / `mind` / `nature`); English words (`riso` is the livelier choice); how-to tutorials with the `food` palette; news explainers and data-driven explainers with the `news` palette.

## 2. What it is (and isn't)
A risograph frame is a stack of spot-color ink layers on paper: one layer per ink, mixed by multiply (overprint), each slightly misregistered, with halftone dots for shading and ink grain on top. Every color on screen is either one of the palette's three inks, an overprint of them, or bare paper.
It is not a full-color flat infographic (no free colors, no gradients, no white ink, photos never keep their original colors), and it is not a slideshow (see the opening paragraph and "6. Camera and transitions").

## 3. Color
- **Brand colour**: `film({ brand })` / `P.kit.brand('riso', { brand })` → the brand colour is replaced by the nearest **real Riso ink** and swapped into the ready-made palette that already has the closest ink (risograph only prints real inks; no free colours).

### Palette: three inks, used by role
`RISO.board({ T, palette: 'news' })`. Each palette has three inks; in code **write them by role**, never as concrete colors, so switching palettes needs no code changes:
- `base`: large color blocks, caption backing, name-tag backing, halftone base color (lightest, printed first)
- `main`: text, outlines, axes (darkest)
- `accent`: emphasis, only for keywords, key numbers, arrows, the current chapter

| palette | Name | base / main / accent | Good for |
|---|---|---|---|
| `lively` | Lively | yellow / blue / fluorescent pink | Everyday science, fun facts, English words (default) |
| `news` | Newspaper | ochre / black / red | News explainers, finance, social topics, practical takeaways (very light grain, no flicker) |
| `food` | Food | yellow / teal / red | Food, cooking tutorials |
| `tech` | Tech | yellow / blue / orange | Internet, tech products |
| `mind` | Mind | yellow / purple / pink | Psychology, emotions, relationships |
| `nature` | Nature | yellow / blue / green | Plants and animals, environment, geography |

- **Inks overprint** (multiply): `main` printed over `base` gets darker; yellow + blue = green, pink + blue = purple, pink + yellow = orange. Make good use of overprinting and don't try to "cover" the color underneath: **there is no white ink**, a light color can never cover a dark one. To "leave white", don't print anything there.
- Use `accent` in at most 1–2 places per page; used everywhere it stops being emphasis.
- The same concept uses the same ink throughout the video.
- Overridable: `grain` (grain 0–1), `misreg` (misregistration multiplier), `boil` (grain flickers per second, 0 = static).

## 4. Type
Three font families (loaded by `lib/fonts.css`, tried locally installed first, then from a CDN; if none is available the runtime falls back to system fonts and still renders): a heavy serif (Noto Serif SC / Source Han Serif) for `title` and `quote`, a sans (Noto Sans SC / Source Han Sans) for `head`, `body` and `label`, and a condensed numeral face (Oswald) for `b.number` and the chapter-bar numbers.
- Font sizes: `title` 100–130, `head` 50–70, `body` 32–40 (minimum 32), `label` 26–32.

Text enters with `print` (headlines, labels, numbers: all of a text's colors register together) or `type` (`body`, quotes: line by line); see "5. Motion". Line-breaking and grain rules for text are under "Text" in "15. API quick reference".

## 5. Motion

### Entrance animations
Every element has an `enter` (with sensible defaults; usually you don't need to set it):

| enter | Motion | Default for |
|---|---|---|
| `print` | **Registration**: each ink slides back from an offset position into alignment. Graphics print ink by ink; text prints all its colors together | Headlines, graphics, numbers |
| `type` | Fades in line by line | Body text `body`, quotes |
| `stamp` | **Stamp**: slightly enlarged, rotating a little as it "thunks" down | Name tags `tag` |
| `wipe` | **Brushed** out from one end | Lines, rules, arrows, highlight backing |
| `rise` | Grows up from the baseline | Bars of bar charts |
| `fade` | Fades in | — |
| `none` | Appears directly | — |

Halftone parts (`fill: 'halftone'`) "develop" along with the entrance progress: dots near the light source grow first.

### Moving and leaving
After printing, an element can `.move`, `.to` (move / scale) or `.pulse`; `.erase(at, dur)` fades it out (default 0.35 s). Most elements never need erasing: they leave with their page, in the way the next page's transition dictates (see "6. Camera and transitions"). Timing rules for pages are in "10. Pages and timing".

## 6. Camera and transitions

### Transitions: don't let it look like a slideshow
`b.page(at, { transition })`, chosen to fit the narrative; **don't use only one kind for the whole video**:

| transition | Effect | When to use | Earliest time new-page content can appear |
|---|---|---|---|
| `roll` | A print roller sweeps from top to bottom, replacing the page | After the cover (default), start of a major section | `page.end` (roller finishes its sweep) |
| `push` | The new page pushes the old one out, the three inks separating as it moves | Continuing the same topic (default for every later page) | `page.start`: can be printed in advance and slide in with the page |
| `flood` | A blob of ink floods out from an element (`from`) to cover the frame, holds full cover for about a quarter second (a full page of ink, not a one-frame flash), then a hole opens at `from` to reveal the new page (1.1 s) | **Chapter change / turning point**: flood from a key element of the previous page (number, graphic) to link the two pages | When the reveal starts (`page.ready`, = `page.start + 0.68`) |
| `zoom` | The old page scales up, its ink layers separating as it fades out; the new page prints in from slightly smaller | "Look one level deeper": going from the whole into a detail | `page.start`, entering together with the new page |
| `cut` | Hard cut | Fast-paced back-to-back comparisons | `page.start` |

Adjustable: `dur` (transition duration), `ink` (the ink for `flood`, default `accent`). **Start the new page's first element at `page.ready`** (the last column, for every transition type) instead of writing `page.start + …` yourself.

### Camera: pages are not static
- **Slow push-in**: every page slowly pushes in by 3% from when it finishes printing until the next page transition, so the frame always stays "alive". Disable with `b.page(at, { drift: 0 })`; change the video-wide default with `RISO.board({ drift })`.
- **In-page push-in**: `b.focus(target, { at, dur, zoom })` pushes the camera onto an element / area of this page (automatically avoiding the chapter bar and captions), to emphasize a detail, e.g. the last few bars of a chart; `b.focus(null, { at })` pulls back to the full page. At most one or two push-ins per page, max 1.5× zoom by default.
- **Cross-page elements**: elements drawn with `hud: true` belong to no page and don't leave with the old page during a transition. Combine with `.to(at, { x, y, scale }, dur)` to move it into a corner of the new page, linking the two pages; when no longer needed, `.erase(at)`:
```js
const pct = b.number(1010, 150, { to: 30, prefix: '+', suffix: '%', size: 190, hud: true });
const p2 = b.page(T.end('hook2') + 0.05, { transition: 'flood', from: pct });
pct.to(p2.start + 0.45, { x: 1690, y: 180, scale: 0.42 }, 0.8);   // flies to the top-right of page 2, keeps reminding the viewer
pct.erase(p3.start, 0.3);
```

## 7. Sound
The risograph runtime has no sound effects of its own. Sound is the skill's shared background music, synthesized in code by `scripts/bgm.mjs` from `bgm` in `script.json` (see GUIDE.md): new risograph projects default to `bright`; choose by mode as in `references/modes.md` ("General: background music"), e.g. `calm` for news explainers (with the `news` palette), `playful` for English words and how-to tutorials. The music changes phrase and plays a chime at every new chapter, and since a chapter usually maps to one page, these tend to land on page changes.

## 8. Signature moves
What only print can do; pick a few per video, don't use all:
- **Overprint** instead of covering: let `main` and `accent` fall over `base` blocks to make the third color (see "3. Color").
- **Registration entrance** (`print`): inks sliding into alignment, graphics ink by ink.
- **Halftone that develops** from the light source as it enters (`fill: 'halftone'`, see "5. Motion").
- **Ink flood** from a key number or graphic into the next chapter (`transition: 'flood', from`).
- **A number that survives the page turn**: a `hud: true` element flying into a corner of the new page.
- **Photos and screenshots separated onto the inks** (see "12. Images and video").
- **Stamped name tags** (`b.tag`) and **brushed highlights** (`b.highlight`).

## 9. Layout
- Frame 1920×1080, with margins of about 110 on all sides. **The top 114 pixels are the chapter bar and the bottom 140 pixels are captions**; keep content out of these two areas (the lint check reports it).
- **One page covers one point only**. Common layouts: headline + one or two key sentences in the left column, one big graphic / big number / chart in the right column; or headline on top and three columns side by side below.
- Align elements to shared vertical lines (e.g. all left edges at 110); this style looks professional through "neatness".

**Portrait (9:16)**: `render.mjs --aspect 9:16` renders the same project at 1080×1920 (`EV.composition` reads the aspect; the board, cover, chapter bar and captions adapt). Your own coordinates don't — write each position once per aspect with `EV.L(landscape, portrait)`, e.g. `b.title('…', { x: 110, y: EV.L(200, 300) })`.
- Captions move up to about 78 % of the height: **the bottom 22 % is covered by the platform's buttons and text**, and everything from the caption bar down is a no-content zone (the check reports it). Chapter bar on top as usual. **Content area: `b.safe` = `{ top, bottom }`** (below the chapter bar, above the caption bar). At 1080×1920 the caption bar starts at y ≈ 1360, so `b.safe.bottom` ≈ 1358: keep everything (windows, phones, charts) above it; at 1920×1080 it is ≈ 940. The cover's returned `area` already stops there, and the check warns about anything on a 9:16 cover that reaches below it (that part is also hidden on the cover thumbnail).
- One column: **text on top, the picture below** (no left / right columns at 1080 wide). Headline at y ≈ 280–360, the graphic or big number in the middle third, one or two key sentences between them.
- Widths: content width is `b.W - 220` (860); a headline line holds ~8 Chinese characters at 100 px — use shorter headlines or let the title wrap to two lines.
- Charts and bars: fewer bars (≤ 4) and vertical bars; tables become two short columns.

(Font sizes are in "4. Type".)

## 10. Pages and timing
```js
const cover = b.cover({ ... });                                         // cover: frame 0 is the complete cover
const p1 = b.page(cover.hold);                                           // after the cover: roller page turn
b.title('……', { x: 110, y: 200, at: T.start('hook') });
const p2 = b.turn('hook2', 'why', { transition: 'flood', from: pct });     // chapter change: ink floods out from the key number, in the pause before 'why'
b.head('……', { x: 110, y: 150, at: Math.max(p2.end, T.start('why')) });
const p3 = b.turn('r3', 'r4', { transition: 'push' });                      // continuing the same topic: push page
b.title('……', { x: 110, y: 190, at: p3.start + 0.1 });                     // with a push, the headline can slide in together with the new page
```
- **Turn the page in the pause between two sentences**: `b.turn('prevLineId', 'nextLineId', { transition })` puts the turn as late as the pause allows while the new page is still ready before the next sentence starts (a roller needs 0.6 s and an ink flood 0.45 s before the new page can print; push / zoom / cut are ready at once). It never turns before the previous sentence has finished (`T.end(prev) + 0.05`). Use `b.page(at)` only when you need an exact time.
- A chapter (`chapter` in script.json) usually maps to one page; a chapter with a lot of content can be split into two pages.
- Everything on a page must finish printing at least 0.8 seconds before the page change, or the viewer won't have time to see it. `b.turn` already gives the page as much of the pause as possible; if something appears with the very last words of a sentence and the check still says it is too close to the turn, bring that item half a beat earlier.
- **The video ends when the explanation ends**: the last page holds until about 2 seconds after the narration ends; don't make an ending where "all pages shrink into a table of contents". (The table-of-contents image of all pages is exported automatically as `out/board.png` when the final video is rendered; it doesn't appear in the video.)

## 11. Cover
Frame 0 is a complete magazine cover (`b.cover`, see "15. API quick reference"): a section name at top-left (`kicker`), an issue number at top-right (`issue`), a rule, a big headline that shrinks automatically to fit, an optional subtitle, and a decorative halftone circle at bottom-right (`motif`). Draw the key visual into the returned `area` with `at: 0, dur: 0` so it is already on the first frame. The cover holds for `hold` seconds, then the roller turns to the first page.
- Cover: `lead_in` is set to 2.3 seconds (already set when a new project is created), so the narration starts after the cover turns away.

## 12. Images and video (photos, screenshots, screen recordings)
Prepare assets first: put images and videos in the project's `assets/src/` and run `node scripts/assets.mjs videos/<name>` (see GUIDE.md). Asset name = file name without extension.
Write a video as `{ clip: 'name', from: 0, rate: 2, to: 10 }`: start at second `from` of the clip, play at `rate`× speed, stop at second `to` (plays to the end by default); before the element appears it sits on the first frame, and after playback it holds on the last frame; `play: seconds` sets when playback starts. The lint check warns when a video is erased / paged away before it finishes playing.
```js
b.image('launch-event', { x: 110, y: 160, w: 820, at: ..., source: 'Photo: at the launch event' });   // photo: two-color print
b.image('settings', { x: 1000, y: 160, w: 800, inks: 'screen', at: ... });                     // light UI screenshot
b.image({ clip: 'terminal', rate: 1.5 }, { x: 110, y: 200, w: 900, inks: 'dark', at: ... });   // screen recording of a dark UI
```
Images never appear in their original colors; instead they are **separated by brightness onto the inks and overprinted**, so they match the colors of everything else on the layout. Choose a printing method with `inks`:

| inks | Effect | Good for |
|---|---|---|
| `photo` (default) | Solid `base` underlay + `main` printing the darks, like a two-color print | Photos, on-site pictures |
| `screen` | Only `main` printing the darks; clearest | Light UI screenshots (text-heavy) |
| `screen-tint` | `screen` + a faint `base` tint | Light UI screenshots that should blend in more with the layout |
| `dark` | Ink goes on the bright areas (knockout) | Dark UIs: terminals, dark charts |

You can also write your own array of ink layers: `[{ ink, tone: 'dark'|'light'|'flat', gamma, amount, alpha }]`. `gamma` > 1 inks only the deepest areas, < 1 inks the midtones too; `alpha` can separate one specific color of the image onto its own ink, e.g. `{ ink: 'accent', tone: 'light', alpha: '1.2 1.2 -2.2 0 0' }` prints the yellow lines separately in `accent`.
Other options: `x, y, w, h` (with only `w`, keeps the original aspect ratio), `fit: 'slice'` (crop to fill, default) / `'meet'` (fit entirely), `frame: false` (remove the thin frame line), `source` (source / caption below the image; **news and data content must cite sources**).

## 13. Pitfalls and self-check
Self-check points (in addition to `references/review.md`):
- Each page has only one visual focus; `accent` isn't overused
- Halftones and overprints look good, and text is legible: body text isn't buried under halftone
- Data shots: numbers match the narration, source and date are stated (or "illustrative data"), the vertical axis starts at 0
- Transitions vary and fit the narrative: chapter changes / turning points use `flood` or `roll`, continuing the same topic uses `push`, going into detail uses `zoom` or `focus`; not the same transition throughout the video
- Before each page change, everything on the page has finished printing and held long enough (check before and after transitions with `--strip`)
- Exported table-of-contents image `out/board.png`: each page shows at a glance what it covers

## 14. Variation
Two risograph videos should not look the same: pick a different palette (six, see "3. Color") and, if needed, tune `grain` / `misreg` / `boil`; vary the page layouts (left-column text + right-column graphic, headline over three columns, see "9. Layout") and the transition mix (see "6. Camera and transitions"). `RISO.board({ seed })` (new projects set it to the project name) seeds the per-element misregistration directions, so the same code with a different seed prints slightly differently.

## 15. API quick reference

### Board
`RISO.board({ T, palette, seed, grain, misreg, boil, drift, captions, chapters })`: `palette` see "3. Color"; `drift` see "6. Camera and transitions"; `captions: false` / `chapters: false` turn off the caption strip / chapter bar. Minimal page (from `templates/riso/index.html`):
```js
const b = RISO.board({ T, palette: 'lively', seed: 'my-video' });
const cover = b.cover({ title: 'Write the {accent:title} here', kicker: 'Section name' });
b.page(cover.hold);
b.title('Write the opening question here', { x: 110, y: 200 });
return b;
```

### Pages
| Method | Description |
|---|---|
| `b.cover({ title, subtitle, kicker, issue, hold, motif })` | Cover. `title` supports `{accent:keyword}` and `\n`; `kicker` is the section name at top-left (e.g. "Living · Prices"); `issue` is the issue number at top-right; `motif: false` removes the decorative halftone circle at bottom-right. Returns `{ hold, end, area }`; `area` is the area below the title reserved for the key visual; draw the key visual on the cover page with `at: 0, dur: 0` |
| `b.page(at, { transition, from, ink, dur, drift, title })` | Switch to a new page; returns `{ start, end }` (`end` = transition finished). See "6. Camera and transitions" for transitions; `title` is used in the exported table-of-contents image and defaults to the chapter name at that time |
| `b.turn(prevLineId, nextLineId, { transition, … })` | Turn the page in the pause between two sentences (as late as possible while the new page is ready before the next sentence); returns the page. See "10. Pages and timing" |
| `b.window({ x, y, w, h, radius })` → `win` | A window on the page: things drawn in `win.draw(() => …)` show only inside it (a browser page, a car window, a phone screen). `win.layer(speed, () => …, { loop })` draws a layer. A layer's offset is the sum of: `win.scroll(at, dur, { dx, dy, flat }, ease)` (one move of distance × speed = parallax; `flat: true` moves every layer the same = "parallax off"), `win.drift(at, until, { vx, vy })` (steady motion, px per second × speed; a layer with `loop: { x }` / `{ y }` is a seamless strip: draw its tile at least twice so it covers the window plus one period, and the offset wraps every period, so mountains and trees outside a train window never run out), and `win.animate((t, speed) => ({ dx, dy }))` (your own function, called per layer with its speed: a stuttering scroll). `win.layers[i]` = `{ speed, items, loop }`. The check counts only the visible part inside the window. Draw the frame itself with an ordinary `b.rect` |
| `b.focus(target, { at, dur, zoom, pad })` | In-page push-in; `target` is an element, an array of elements, an `{x, y, w, h}` area, or `null` (pull back to full page) |

### Text
`b.title / b.head / b.body / b.label (str, o)`, or `b.text(str, { style })`. Extra options: `font: 'num'` (Oswald, for numbers in text), `weight`.
- `o`: `x, y` (**top-left corner**), `w` (wrap width), `size`, `align: 'left'|'center'|'right'`, `valign: 'top'|'middle'|'bottom'`, `ink` (default `main`), `at`, `dur`, `enter`, `spacing` (letter spacing), `bg` (ink of the backing block), `pad`
- Recoloring part of a string: `'Why did eggs suddenly get {accent:pricier}?'`; `{base:…}` and `{main:…}` work too
- Punctuation such as commas and full stops (，。) never starts a line; English words and numbers are never split
- `body` and `label` get no ink grain, keeping small text crisp

| Method | Description |
|---|---|
| `b.tag(str, x, y, { bg, ink, size })` | Name tag / label: backing block (default `base`) + text, stamp entrance |
| `b.number(x, y, { to, from, decimals, prefix, suffix, size, ink, align })` | Big rolling number, e.g. `{ to: 30, prefix: '+', suffix: '%' }`; default `accent`, size 150 |
| `b.quote(str, { x, y, w, size })` | Quote: large quotation marks + bold Song (serif) |
| `b.highlight(target, { ink, pad, fromY, toY })` | Prints a backing band under text (default `base`), brushed in left to right; `fromY` / `toY` are the fractions of the text height the band runs from and to (default the full line; `fromY: 0.55` paints only the lower part) |
| `b.underline(target, { ink, weight })` | Thick underline (default `accent`) |

### Graphics and illustrations
`b.sketch(parts, o)` is the main method for illustrations: `parts` is a list of parts, each part one block of ink:
```js
b.sketch([
  { ellipse: [cx, cy, 150, 190], ink: 'base' },                                                            // solid base color
  { ellipse: [cx, cy, 150, 190], ink: 'main', fill: 'halftone', light: [cx - 60, cy - 90], density: [0.05, 0.75] }, // halftone shading
  { ellipse: [cx, cy, 150, 190], ink: 'main', stroke: 7, fill: 'none' },                                  // outline
], { at: T.word('hook', 'eggs') });
```
- Shapes: `d` (SVG path) / `circle: [x, y, r]` / `ellipse: [x, y, rx, ry]` / `rect: [x, y, w, h, radius]` / `poly: [[x, y], ...]`, optionally with `transform`
- `fill`: `'solid'` (default) / `'halftone'` / `'none'`; `stroke: width`, `strokeInk`, `dash: '4 10'`
- Halftone: `light: [x, y]` light-source position (dots get bigger farther from the light), `density: 0.6 | [lightest, darkest] | (x, y) => 0..1`, `cell` dot spacing (default 11), `angle` (different per ink by default)
- **Illustration recipe**: solid `base` underlay → `main` or `accent` halftone for shading → `main` outline. Combinations of simple geometric shapes are enough; don't draw realistic detail

| Method | Description |
|---|---|
| `b.circle / b.ellipse / b.rect / b.poly / b.path` | Single shapes, same options as above (`ink`, `fill`, `stroke`, halftone parameters); `b.rect` also takes `radius` |
| `b.line(x1, y1, x2, y2, { width, ink, dash })` | Line, brushed out from the start point |
| `b.rule(x, y, w, { weight, ink })` | Horizontal rule |
| `b.arrow(x1, y1, x2, y2, { width, ink })` | Solid thick arrow (default `accent`), brushed from tail to head |
| `b.bars(data, { x, y, w, h, max, grid, decimals, unit, hot, stagger })` (`stagger`: seconds between bars, or an array of start times so each bar grows when its number is said) | Bar chart: `data = [['Apr', 4.3], ...]`, `x, y` is the left end of the baseline, `h` is the height corresponding to `max`; `hot: [3, 4, 5]` are bars to emphasize in `accent`, the rest use `base` halftone; bars grow one by one with values rolling along. **The vertical axis starts at 0; don't truncate it to exaggerate** |

### Images and video
`b.image(name | { clip, from, rate, to }, { x, y, w, h, fit, inks, frame, source, at, play })`: see "12. Images and video".

### General
- Time: `at` (seconds, or another element / group = start when it ends), `delay`, `dur`; `b.at(t)`, `b.wait(s)`
- Element methods: `.erase(at, dur)`, `.move(at, dx, dy, dur, ease)` (`ease`: `EV.ease.linear`, `EV.ease.inOut` (default) or your own function of 0–1), `.animate((t) => ({ dx, dy, scale, opacity }))` (continuous motion as a pure function of time — trees passing a train window, a stuttering scroll; adds to `move`), `.to(at, { x, y, scale }, dur)` (move / scale to a new position; `x, y` is the center point), `.pulse(at)`
- Options: `bleed: true` allows intentional bleed past the frame; `annot: true` marks annotation elements (exempt from the chapter-bar / caption-area check); `overlap: true` skips the text overlap check; `hud: true` pins to the screen, not following the page; `noFact: true` (on text and numbers) leaves it out of the brief fact check (layout labels, made-up example values)
- `RISO.groupOf(items)` groups several elements (with `start / end / box / erase / move`)

### In promo videos
The same board makes promos (no voiceover, on the beat, 16:9 + 9:16): `node promo/scripts/new.mjs <dir> --style riso [--quick]` (paths from the skill folder). The board runs inside a promo film through the common interface (`promo/runtime/kit.js`, documented in `promo/references/kit.md`): each scene is a page and the transitions rotate roll / push / flood / zoom; the signature move prints a halftone dot behind a word; screenshots are separated onto the inks. `S.board()` gives the board itself for anything the common verbs don't cover. In a montage (`montage` cue) each frame is a whole page printed in one ink; items drawn for a deliberate quick cut take `flash: true`, which skips the "held too short" warning. The information verbs (flow, compare, chart, annotated screenshot, diagram: `promo/references/kit.md`) are printed: base-ink blocks under the text, solid ink arrows, accent-ink frames, the board's own `b.bars`; any colour is separated onto the three inks. Starter sound and score for promos: `styles/riso/sound.js`, `score.js`.

## 16. Not supported yet
- Characters: none — for a story with named people, use the approach at the end of `../CHARACTERS.md` (one name card per person, same colour and place each time) or recommend whiteboard / ink / shadow.
- Real people can be shown with photos (`b.image`).
- **Formulas**: riso has no formula component (and doesn't load KaTeX); for formula-heavy problems use `whiteboard`; simple expressions can be written as plain text (`x² + y²`, `a / b`).
