# Hand-drawn whiteboard style (whiteboard)

Like a good teacher at a whiteboard, drawing while talking. **The frame only ever shows "the sentence being spoken right now"**:
the whiteboard is an infinitely large sheet of paper, you draw wherever the explanation has reached, and the camera follows the pen.

## 1. Style rules (mandatory)

### Color: color = concept
| Name | Use |
|---|---|
| `ink` black | Default: body text, structural lines, axes |
| `blue` blue | The main concept / known quantities / correct derivation |
| `red` red | Emphasis, key conclusions, common mistakes, circling |
| `green` green | Results, correct, answers |
| `orange` / `purple` | Second and third concepts (only when needed) |
| Highlighter `yellow` `pink` `green` `blue` | Only for marking keywords, at most 1–2 per screen |

- One video uses at most **3 ink colors + 1 highlighter color**. With more than 3 characters, color them by camp / side, not one color per person (see the stories section of `references/modes.md`).
- **Whatever color a concept gets the first time, it keeps for the whole video** (e.g. if "gravity" is red, every gravity arrow and every occurrence of the word "gravity" afterwards is red). This is the viewer's cue for tracking concepts.
- Use `{red:text}` to color part of a sentence.

### Font sizes (1920×1080 canvas, at zoom=1)
| Level | Size | Use |
|---|---|---|
| Headline | 80–96 | Opening question, the word itself |
| Main text | 56–64 | Key sentences, formulas |
| Label | 40–48 | Labels on drawings, sticky notes, side notes on derivations |
| Minimum | 36 | Anything smaller is unreadable; forbidden |

The bottom 150px of the screen is reserved for captions; when there are chapters, the top 105px is reserved for the chapter progress bar. Keep content out of these two bands (except when the camera is zoomed out).

### Amount of text
- The whiteboard shows **keywords**, not the narration verbatim. For 20 characters of narration, the board usually shows only 2–8 characters.
- No more than about 12 characters of new text appear in one shot at the same time; formulas and worked derivations are exempt.

### Lines and shapes
- Default pen width 5; emphasis lines 6–7; details 3–4.
- Draw characters with `b.character()` (see section 4). Draw other illustrations (apple, Earth, container, tool...) yourself as SVG paths with `b.sketch()`: **simple outline, recognizable, few details**, something a teacher could draw in 3 seconds. Use a light fill (`fill`) and the matching dark color for the outline.
- No emoji, no image assets.

### Motion language
- Everything is "drawn" or "written" into place; nothing fades in out of nowhere. The only exceptions are sticky notes (stuck on) and dots (dotted on).
- Drawing timing follows the narration: **the apple starts being drawn when "apple" is spoken**, using `T.word('id', 'apple')`.
- After drawing something, pause to give the viewer time to look; don't draw nonstop.
- Camera moves: `ease.inOut`, 1–1.5 seconds; **move the camera there before drawing new content**, don't make big moves while drawing.
- Ending: use `b.overview({ at })` to zoom out to the board overview so the viewer sees the whole whiteboard's "knowledge map". It labels the regions ①②③... in chapter order, links them with dashed arrows, and adds the same numbers in front of the chapter names in the top progress bar; the exported board overview also gets a legend row at the top. Number badges automatically find empty spots that don't cover content (a margin in screen pixels is kept around the frame, so they are never cropped however far it zooms out). When the camera held at several different positions within one chapter, they are numbered 2-1, 2-2, 2-3... in hold order, showing the route of the explanation within the chapter. After the badges are drawn, the frame holds for at least `hold` seconds (default 3); the video is lengthened automatically and the audio track padded with silence, so you don't need to adjust `tail` by hand. **Call `overview` last in build**.
- Write the closing summary **in an empty spot on the whiteboard**; don't pin it to the center of the screen with `hud: true`: in the overview shot it would cover content (the lint check warns about this), and a summary written on the board also appears in the exported board overview.

### Timing (the lint check verifies each item)
- **Move the camera first, then draw**: the first stroke in a new region must wait until the camera move has finished.
- **Chain a sequence of strokes with `at: previousElement`** instead of hand-writing each time, so that when one gets slower the next is pushed back with it.
- **Erasing must come after drawing finishes**, with at least 0.6 seconds of hold after drawing; content meant to be "read" (text, diagrams) holds 1 second or more.
- Mark intentional cases and the lint check will let them pass:
  - `crop: true`: intentionally show only part (e.g. draw only the top half of the Earth). It is clipped to the frame of "the camera at the time it was drawn", so it won't suddenly become complete when the camera later zooms out
  - `overlap: true`: intentional stacking (e.g. an apple hanging on a tree)

### Composition
- The whiteboard is an infinite canvas, planned in "regions"; one region holds one segment of content (usually one chapter).
- **Lay regions out in camera-route order and only ever move to an adjacent region**: e.g. one row left to right, or an S-shape (right → down → left → down). A camera move must never sweep across a third region, or the viewer sees earlier content "bleed" into the frame.
- Leave at least **150 pixels of blank space** between adjacent regions; for regions where the camera is zoomed out (zoom < 1), scale the gap by 1/zoom.
- When you really have to cross another region, cut straight there with `b.camera(at, target, 0)` instead of panning.
- The lint check catches: half of old content showing at the frame edge after the camera stops, and camera moves that sweep across another region.
- Each region keeps ≥ 30% blank space, with at least 60px between elements.
- Write derivations top to bottom, left to right, following reading order.

### Cover
Many platforms use the **first frame of the video** as the cover by default, so every video makes one with `b.cover()`: the first frame is the complete cover, which holds for about 1.3 seconds, then fades out into the whiteboard.
- **Title**: the question or topic the video answers, **12 characters or fewer**, with the keyword in red (`{red:…}`). An overlong title is automatically shrunk, but then it no longer stands out.
- **Subtitle** (optional): one sentence on "what you get from watching", 16 characters or fewer.
- **Tag** (optional): a small sticky note in the top-left with the category, e.g. "Physics · Science", "How-to · Home cooking".
- **Key visual**: 1–2 recognizable things, such as the core illustration or a character, placed in `cover.area` below the title, drawn with `hud: true, at: 0, dur: 0` and then handed to `cover.add()`.
- **How to check**: shrink `out/cover.png` to the size it would have in a phone feed (about 1/4); the title should still be readable at a glance and the key visual still recognizable.
- With a cover, set `lead_in` in `script.json` to about 1.9 seconds so the narration starts after the cover is put away (the lint check reminds you); the first stroke of the main content starts at `cover.end`.

### Chapter progress bar
- Writing `"chapter": "Chapter name"` on sentences in `script.json` makes it appear automatically; no drawing code needed.
- Look: a dashed guide line at the top, along which a pencil "draws" the progress line; each chapter start has a tick, with the chapter name written below the line. Finished chapters are black, the current chapter is bold, upcoming ones are gray; when a new chapter begins its title does a small bounce.
- The chapter switches when the previous sentence finishes, so **put the camera transition for a chapter change in the pause between the two sentences** (after `T.end(prevSentence)`).
- To turn it off: `WB.board({ chapters: false })`; adjust its position with `chapters: { top, margin }`.

### Fonts
- Defaults: Chinese handwriting uses 霞鹜文楷 (LXGW WenKai), English handwriting uses Excalifont (Excalidraw's handwriting font), captions use the system sans-serif (Hei).
- Load order: **installed locally → downloaded on demand online (only the glyphs used) → fallback font**. If the user doesn't have it installed and is offline, rendering proceeds normally with the fallback font, **without errors**, and the render log prints a notice.
- Fonts are personal taste: if the user wants a different one, change it in `WB.board({ fonts: { hand: '"Some Font", "LXGW WenKai", cursive', en: '...', caption: '...' } })`, keeping the original font as fallback.
- All glyphs used in the video are loaded once before layout; no manual preloading needed.

## 2. Paper
`WB.board({ paper })`:
- `plain` blank whiteboard: science explainers, word explanations
- `grid` grid paper: math problems, physics problems, drawing problems
- `dots` dot grid: design, structure topics
- `lined` lined notebook: language topics, notes

## 3. API quick reference

```js
EV.composition({
  audio: 'audio/narration.m4a',
  fonts: ['56px "LXGW WenKai"', '56px "Noteworthy"'],
  build: async ({ T }) => {
    const b = WB.board({ T, paper: 'grid', seed: 'slug' });
    // ... drawing code ...
    return b;
  },
});
```

### Time
| Syntax | Meaning |
|---|---|
| `T.start('id')` / `T.end('id')` | Start / end time of a narration sentence |
| `T.word('id', 'apple')` | Time when "apple" starts being spoken in this sentence (a 3rd argument n means the (n+1)-th occurrence) |
| `T.wordEnd('id', 'apple')` | Time when "apple" finishes being spoken |
| `T.at('id', 0.5)` | Time halfway through this sentence |
| `b.at(t)` | Move the "pen" to time t: subsequent elements without `at` start here and are drawn one after another |
| `b.wait(s)` | Pen pauses for s seconds |

Every element accepts: `at` (start time; can also be another element, meaning "after it finishes drawing"), `delay`, `dur` (how long to draw; computed automatically from length by default), `color`, `width`, `hud: true` (pinned to the screen, doesn't move with the camera).
Returned elements have `.start` `.end` `.box` (world coordinates {x,y,w,h}), plus:
- `.erase(at, dur)` erase
- `.pulse(at)` scale up briefly and back, for emphasis
- `.move(at, dx, dy, dur, ease)` translate. E.g. an apple falling: `apple.move(t, 0, 260, 0.7, EV.ease.in)` (`ease.in` accelerates, like something really falling)
- `.transform(at, { dx, dy, rotate, scale, origin }, dur, ease)` general transform animation: around `origin` (world coordinates, defaults to the element's center at that moment) rotate by `rotate` degrees (positive is clockwise), scale by `scale` (a number, or `[sx, sy]`; `[-1, 1]` is a horizontal flip), then translate by `dx, dy`. Multiple calls stack over time. Stroke width stays constant when scaling (with `scaleStroke: true` it scales too).
  Examples: to show "two shapes coincide", make a dashed copy at B and land it on A with `ghost.transform(t, { rotate: -θ, origin: centerOfB, dx, dy }, 1.4)`; to show "enlarging", `ghost.transform(t, { scale: 2, origin }, 1.4)`.

Note: `.box` is always the element's **original position**; to circle or annotate it after it has moved, use `el.boxAt(t)` to get its bounding box at time t.

### Text and formulas
```js
b.text('Why does the {red:apple} fall down?', { x: 960, y: 200, size: 88, align: 'center' });
// align: left|center|right (x is the left edge / center / right edge); valign: top|middle|bottom
// font: 'hand' (default, 霞鹜文楷 / LXGW WenKai) | 'en' (English handwriting, Excalifont) | 'ui' | 'mono'
// maxWidth: auto-wrap; speed: characters written per second (Chinese default 8, English 18)
b.math('F = G\\frac{\\htmlClass{m}{m_1 m_2}}{r^2}', { x: 300, y: 400, size: 64 });
// displaystyle by default; inline: true uses inline style. Parts marked with \htmlClass{name}{…} can be located with eq.part('name')
b.note('Common mistake: keep {red:units} consistent', { x: 1300, y: 600, w: 460, color: 'yellow', rotate: -2 });
b.bubble("I'm not running away, I'm {blue:chasing someone}", { x: 1400, y: 340, anchor: 'right', color: 'green', tail: 'right' });
// Speech bubble: the frame is drawn first, then the text. Frame line uses the speaker's color; tail: 'left' | 'right' | 'none' | [x, y] (the point the tail tip points to)
// Returns { shape, text, box, end, erase, move, pulse }; multi-line dialogue can work like a chat log, moving old bubbles up as a group with move when a new line comes in
```

### Lines and shapes
```js
b.line(x1, y1, x2, y2, { dash: [16, 12] });
b.arrow(x1, y1, x2, y2, { bend: 0.2, double: false, head: 24 });   // sign of bend controls which way it curves
b.rect(x, y, w, h);  b.circle(cx, cy, r);  b.ellipse(cx, cy, rx, ry, { fill: '#FFB8D2' });
// Circles have a hand-drawn "overshoot at the end" by default; for precise circles such as orbits: { turns: 1, drift: 0, rough: 0.3, startAngle: 0 }
// Negative turns draw counterclockwise (angle 0 points right, y axis points down)
b.polyline([[x, y], ...], { closed: true });  b.curve([[x, y], ...]);   // polyline / smooth curve
b.sketch([ 'M0,0 C…Z', { d: 'M…', color: 'green', fill: '#B8F0A6', width: 4 } ], { x, y, scale });
b.dot(x, y, { r: 10, color: 'red' });
b.brace(x1, x2, y, { dir: 'down' });  b.vbrace(y1, y2, x, { dir: 'right' });  // return value has .tip, the tip coordinates
b.check(x, y);  b.cross(x, y);
```
Every subpath in `sketch` must start with an **uppercase M** (absolute coordinates). Path coordinates are in the illustration's own coordinate system; place it on the board with `x, y, scale`.

### Geometry annotations (points are `[x, y]`)
```js
b.angleMark(V, P1, P2, { n: 2, r: 40, gap: 10 });   // angle at vertex V with sides toward P1/P2: n arcs (1–3, to tell angles apart)
b.angleMark(V, P1, P2, { right: true });            // right-angle mark
b.tickMark(P, Q, { n: 1 });                         // equal-length tick marks on segment PQ (1–3, to tell sides apart)
b.vertexLabels([A, B, C], ['A', 'B', 'C']);         // vertex letters, placed automatically along the exterior angle bisector, not over lines
b.sideLabels([A, B, C], ['5', '6', '4']);           // labels outside the midpoints of sides AB, BC, CA; null skips
```
Geometry figures must be **computed precisely** from coordinates (first write a "figure → screen coordinates" function and compute every vertex from it).
Within one video: equal sides get the same number of tick marks and equal angles the same number of arcs, consistently throughout.

### Cover
```js
const cover = b.cover({ title: 'Why does the {red:apple} fall?', subtitle: 'From an apple to the Moon', tag: 'Physics · Science', hold: 1.3 });
const A = cover.area;   // area below the title reserved for the key visual {x, y, w, h}
cover.add(b.sketch(APPLE, { hud: true, at: 0, dur: 0, x: A.x + 300, y: A.y + 60, scale: 2 }));
cover.add(b.character(CAST.someone, { hud: true, at: 0, dur: 0, x: A.x + A.w * 0.72, y: 1008, size: 460, expr: 'think', blink: false }));
b.at(cover.end);        // main content starts after the cover is put away
```

### Piles, sprinkles, durations, levels
```js
// area: { x, y, w, h } rectangle | { cx, cy, r } or { cx, cy, rx, ry } circle / ellipse | { shape: 'mound', cx, cy, w, h } mound ((cx, cy) is the midpoint of the base)
b.pile({ shape: 'mound', cx: 400, cy: 600, w: 360, h: 160 }, { count: 14, size: 36, shape: 'chunk', color: 'red', fill: '#F59A9A' });  // a pile, no overlaps
b.sprinkle({ x: 300, y: 500, w: 260, h: 80 }, { count: 16, size: 14, shape: 'ring', color: 'green', fill: '#B8F0A6' });               // a sprinkle, appearing one by one
// shape: chunk · blob · grain · ring (small ring) · dot (solid dot) · dash (short line); or draw your own with make: (x, y, size, r, i) => ({ d, color, fill })
b.timer(x, y, { label: '2 min', r: 40 });                           // small clock + duration, minute hand turns one full circle
b.level(x, y, { icon: 'flame', level: 2, max: 3, label: 'medium heat' });   // level: flame | bar | star
WB.scatterPoints(area, { count, gap, seed })                        // when you only need point coordinates: reproducible, spacing ≥ gap
```
`timer` and `level` return a group of elements that can be `erase`d, `pulse`d and `move`d as a whole.

### Annotating existing elements (pass an element or {x,y,w,h})
```js
b.highlight(el, { color: 'yellow' });     // highlighter swipe
b.underline(el, { double: true, wavy: false });
b.circleAround(el);  b.boxAround(el);     // red by default
b.strike(el);  b.strike(el, { cross: true });
```

### Images and video (photos, screenshots, screen recordings)
Prepare assets first: put images and videos in the project's `assets/src/` and run `node scripts/assets.mjs videos/<name>` (see SKILL.md). Asset name = file name without extension.
Write a video as `{ clip: 'name', from: 0, rate: 2, to: 10 }`: start at second `from` of the clip, play at `rate`× speed, stop at second `to` (plays to the end by default); before the element appears it sits on the first frame, and after playback it holds on the last frame; `play: seconds` sets when playback starts. The lint check warns when a video is erased / paged away before it finishes playing.
```js
const ph = b.photo('login', { x: 120, y: 200, w: 800, rotate: -1.5, caption: 'Login page', at: T.word('l3', 'log in') });
b.circleAround({ x: ph.imgBox.x + 200, y: ph.imgBox.y + 180, w: 380, h: 80 }, { at: ... });   // circle the key point on the photo
b.photo({ clip: 'demo', rate: 2 }, { x: 1000, y: 260, w: 900, caption: 'Demo', at: ... });
```
- Like a photo taped onto the whiteboard: white border, shadow, two strips of washi tape, drops in from above and sticks. Options: `x, y, w`, `anchor: 'left'|'center'|'right'`, `valign`, `rotate` (default -1.2 degrees), `caption` (handwritten note below the photo), `tape: false`, `border` (white border width), `aspect` (force an aspect ratio; the image is cropped per `focus: '50% 30%'`), `hud`, `at`, `play`
- `ph.imgBox` is the area of the image itself (excluding the white border and caption); use it to compute coordinates when annotating on the photo
- **Lines, circle annotations and arrows drawn within the photo's area are automatically placed above the photo**; no manual layer adjustment needed
- Photos take part in the overlap check; text next to a photo must avoid it

### Axes and function graphs
```js
const ax = b.axes({ x: 200, y: 200, w: 800, h: 500, xRange: [0, 5], yRange: [0, 25], xLabel: 't', yLabel: 'h' });
ax.plot((x) => x * x, { from: 0, to: 5, color: 'blue' });
ax.point(3, 9, { color: 'red' });
const [sx, sy] = ax.toScreen(3, 9);   // data coordinates → board coordinates, for placing labels
```

### Camera
```js
b.camera(at, { x, y, zoom }, dur);             // center the frame on world coordinates (x,y)
b.focus(el or [el, el] or box, { at, dur, pad, zoom });   // automatic framing
b.overview({ at: T.start('last') - 0.2, dur: 2 });        // closing board overview + order numbers; numbers: false only zooms out without numbers; hold: seconds to hold after numbering; margin: blank margin around the edges (screen pixels); put it last in build
```

### Erasing and transitions
```js
el.erase(at, 0.4);                     // single element
b.erase([a, b2, c], at);               // a group
b.erase('all', at);                    // erase everything drawn so far (full page change)
```
There are two ways to change topic: **pan the camera to a blank area of the whiteboard** (recommended: keeps earlier content, which is still visible in the closing zoom-out) or **erase and start over** (when the content is completely unrelated).

## 4. Characters
When you need people, use `b.character(spec, {...})`; for the design method, parameters and acting principles see `references/characters.md`.
Extra requirements in the whiteboard style:
- The character's ink lines and accent color must match the whiteboard's color scheme (prefer picking the accent color from the whiteboard's ink colors).
- Place the character at the edge of the current region, its bottom edge on the region's bottom or just above the captions; it must not cover what is being drawn.
- When the camera moves to a new region, the character can stay where it was (becoming part of the whiteboard), or you can draw a smaller copy of the same character in the new region.

## 5. Common layouts

**Science explainer**: write the opening question at the top of the first region → for each mechanism explained, move the camera to a new region and draw a diagram → at the end zoom out, all regions joined into one "knowledge map".

**Problem walkthrough** (`paper: 'grid'`):
- Left 40% holds the problem (key conditions marked with highlighter) and the redrawn problem figure; right 60% holds the derivation written top to bottom.
- When the derivation gets long, pan the camera down and pin the problem area to the left of the screen with `hud: true`, or re-`focus` on the problem every few steps.
- Key step in a red box `boxAround`; final answer in green + `underline({double:true})`; common mistakes on sticky notes.

**Word explanation** (`paper: 'plain'` or `lined`):
- The word large and centered (`font: 'en'`, size 88–110) → split syllables with vertical bars → below, use `brace` to break out roots and affixes, writing the Chinese meaning of each part → draw a small mnemonic illustration beside it → highlight the word in the example sentence → at the end, show the word together with its Chinese meaning once more.

**Story / historical tale** (`paper: 'plain'`):
- For background use a horizontal timeline (`line` + `dot` + years); for the big picture use a minimal map (mountains as polylines, spheres of influence as dashed loops, place names at label size).
- When a character enters, draw the character and write the name beside it (in the character's accent color) plus one identity keyword.
- Dialogue scenes: two characters stand on the left and right of the region facing each other (the right one with `flip: true`), with chat bubbles stacked top to bottom between them; left-aligned bubbles are the left character's lines, right-aligned bubbles the right character's.
- Action scenes (chasing, setting out, attacking): draw simple props and scenery with `sketch` (horse, boat, city wall), put the character bust on top, and `move` them together; add a few speed lines.
