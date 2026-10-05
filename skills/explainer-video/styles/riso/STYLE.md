# Risograph style (riso)

Like a carefully printed indie magazine: a few spot-color inks overprinted, ink layers slightly misregistered, halftone for light and shade, ink grain on the paper.
The video is organized in **pages**: one chapter is usually one page. But it isn't a slideshow: pages change with a variety of transitions, the camera pushes in within a page, and elements can carry over from one page to the next.

## When to use
| Good fit | Poor fit |
|---|---|
| Everyday science, fun facts ("Why does coffee keep you awake?") | Ancient history, classical stories, traditional culture → use `whiteboard` |
| Psychology, behavioral economics, social phenomena ("Why do we procrastinate more when busy?") | Grave, heavy topics (disasters, illness, conflict) |
| News explainers, finance, practical takeaways (use the `news` palette) | Long derivations full of formulas → use `whiteboard` |
| Numbers and comparisons ("How much of your life do you spend on your phone?") | Stories that need a lot of character acting (this style doesn't support characters yet) |
| Food and lifestyle tutorials, English words, modern-era stories | |

---

## 1. Palette: three inks, used by role
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

## 2. Layout
- Frame 1920×1080, with margins of about 110 on all sides. **The top 114 pixels are the chapter bar and the bottom 140 pixels are captions**; keep content out of these two areas (the lint check reports it).
- **One page covers one point only**. Common layouts: headline + one or two key sentences in the left column, one big graphic / big number / chart in the right column; or headline on top and three columns side by side below.
- Font sizes: `title` 100–130, `head` 50–70, `body` 32–40 (minimum 32), `label` 26–32.
- Align elements to shared vertical lines (e.g. all left edges at 110); this style looks professional through "neatness".

## 3. Timing and pages
```js
const cover = b.cover({ ... });                                         // cover: frame 0 is the complete cover
const p1 = b.page(cover.hold);                                           // after the cover: roller page turn
b.title('……', { x: 110, y: 200, at: T.start('hook') });
const p2 = b.page(T.end('hook2') + 0.05, { transition: 'flood', from: pct }); // chapter change: ink floods out from the key number
b.head('……', { x: 110, y: 150, at: Math.max(p2.end, T.start('why')) });
const p3 = b.page(T.end('r3') + 0.05, { transition: 'push' });             // continuing the same topic: push page
b.title('……', { x: 110, y: 190, at: p3.start + 0.1 });                     // with a push, the headline can slide in together with the new page
```
- **The page change starts as soon as the previous sentence ends** (`T.end(prevSentence) + 0.05`).
- A chapter (`chapter` in script.json) usually maps to one page; a chapter with a lot of content can be split into two pages.
- Everything on a page must finish printing at least 0.8 seconds before the page change, or the viewer won't have time to see it.
- Cover: `lead_in` is set to 2.3 seconds (already set when a new project is created), so the narration starts after the cover turns away.
- **The video ends when the explanation ends**: the last page holds until about 2 seconds after the narration ends; don't make an ending where "all pages shrink into a table of contents". (The table-of-contents image of all pages is exported automatically as `out/board.png` when the final video is rendered; it doesn't appear in the video.)

### Transitions: don't let it look like a slideshow
`b.page(at, { transition })`, chosen to fit the narrative; **don't use only one kind for the whole video**:

| transition | Effect | When to use | Earliest time new-page content can appear |
|---|---|---|---|
| `roll` | A print roller sweeps from top to bottom, replacing the page | After the cover (default), start of a major section | `page.end` (roller finishes its sweep) |
| `push` | The new page pushes the old one out, the three inks separating as it moves | Continuing the same topic (default for every later page) | `page.start`: can be printed in advance and slide in with the page |
| `flood` | A blob of ink floods out from an element (`from`) to cover the frame, then recedes to reveal the new page | **Chapter change / turning point**: flood from a key element of the previous page (number, graphic) to link the two pages | Halfway through the transition (`page.start + 0.45`) |
| `zoom` | The old page scales up, its ink layers separating as it fades out; the new page prints in from slightly smaller | "Look one level deeper": going from the whole into a detail | `page.start`, entering together with the new page |
| `cut` | Hard cut | Fast-paced back-to-back comparisons | `page.start` |

Adjustable: `dur` (transition duration), `ink` (the ink for `flood`, default `accent`).

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

## 4. Entrance animations
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

## 5. API

### Pages
| Method | Description |
|---|---|
| `b.cover({ title, subtitle, kicker, issue, hold, motif })` | Cover. `title` supports `{accent:keyword}` and `\n`; `kicker` is the section name at top-left (e.g. "Living · Prices"); `issue` is the issue number at top-right; `motif: false` removes the decorative halftone circle at bottom-right. Returns `{ hold, end, area }`; `area` is the area below the title reserved for the key visual; draw the key visual on the cover page with `at: 0, dur: 0` |
| `b.page(at, { transition, from, ink, dur, drift, title })` | Switch to a new page; returns `{ start, end }` (`end` = transition finished). See section 3 above for transitions; `title` is used in the exported table-of-contents image and defaults to the chapter name at that time |
| `b.focus(target, { at, dur, zoom, pad })` | In-page push-in; `target` is an element, an array of elements, an `{x, y, w, h}` area, or `null` (pull back to full page) |

### Text
`b.title / b.head / b.body / b.label (str, o)`, or `b.text(str, { style })`.
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
| `b.circle / b.ellipse / b.rect / b.poly / b.path` | Single shapes, same options as above (`ink`, `fill`, `stroke`, halftone parameters) |
| `b.line(x1, y1, x2, y2, { width, ink, dash })` | Line, brushed out from the start point |
| `b.rule(x, y, w, { weight, ink })` | Horizontal rule |
| `b.arrow(x1, y1, x2, y2, { width, ink })` | Solid thick arrow (default `accent`), brushed from tail to head |
| `b.bars(data, { x, y, w, h, max, grid, decimals, unit, hot })` | Bar chart: `data = [['Apr', 4.3], ...]`, `x, y` is the left end of the baseline, `h` is the height corresponding to `max`; `hot: [3, 4, 5]` are bars to emphasize in `accent`, the rest use `base` halftone; bars grow one by one with values rolling along. **The vertical axis starts at 0; don't truncate it to exaggerate** |

### Images and video (photos, screenshots, screen recordings)
Prepare assets first: put images and videos in the project's `assets/src/` and run `node scripts/assets.mjs videos/<name>` (see SKILL.md). Asset name = file name without extension.
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

### General
- Time: `at` (seconds, or another element / group = start when it ends), `delay`, `dur`; `b.at(t)`, `b.wait(s)`
- Element methods: `.erase(at, dur)`, `.move(at, dx, dy, dur)`, `.to(at, { x, y, scale }, dur)` (move / scale to a new position; `x, y` is the center point), `.pulse(at)`
- Options: `bleed: true` allows intentional bleed past the frame; `annot: true` marks annotation elements (exempt from the chapter-bar / caption-area check); `overlap: true` skips the text overlap check; `hud: true` pins to the screen, not following the page
- `RISO.groupOf(items)` groups several elements (with `start / end / box / erase / move`)

## 6. Self-check points (in addition to `references/review.md`)
- Each page has only one visual focus; `accent` isn't overused
- Halftones and overprints look good, and text is legible: body text isn't buried under halftone
- Data shots: numbers match the narration, source and date are stated (or "illustrative data"), the vertical axis starts at 0
- Transitions vary and fit the narrative: chapter changes / turning points use `flood` or `roll`, continuing the same topic uses `push`, going into detail uses `zoom` or `focus`; not the same transition throughout the video
- Before each page change, everything on the page has finished printing and held long enough (check before and after transitions with `--strip`)
- Exported table-of-contents image `out/board.png`: each page shows at a glance what it covers

## 7. Not supported yet
- **Characters** (the characters in `references/characters.md` currently only have a whiteboard-style rendering). For topics that need character acting use `whiteboard`; real people can be shown with photos (`b.image`).
- **Formulas** (KaTeX). For formula-heavy problems use `whiteboard`; simple expressions can be written as plain text.
