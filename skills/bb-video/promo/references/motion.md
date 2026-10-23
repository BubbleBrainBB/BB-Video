# Runtime promo.js: component reference

```js
PROMO.compose({
  bpm: 120, offset: 0.5, duration: 40,
  cover: 37.5,                    // which frame (seconds) to use as the cover
  grain: 0.06,                    // film grain strength; false turns it off
  theme: { bg, fg, ink, paper, muted, accent, fonts: { display, serif, sans, mono, script } },
  build: async (F) => { ... },
});
```
Common members of `F`: `F.W` `F.H` `F.portrait` `F.u` `F.px(n)` `F.B` (seconds per beat) `F.beat(n)` `F.layer(css, z)` `F.add(t => ...)` (your own per-frame animation)
`F.section(at, intensity, { hit, gap })` (gap: leave the music empty for a few seconds before the hit, e.g. 0.25; the higher the intensity, the louder the music) `F.sfx(t, type, volume)` `F.text(el, kind, text, appear, disappear)`
`F.late(t => ...)` (runs every frame after all F.add: for components that read other elements' state in this frame) `F.prep(async () => ...)` (runs once after building, before waiting for images)
`F.appear(t)` (registers a deliberate "whole block appears", e.g. the first frame of paper falling into the frame from above: the final check doesn't report a jump; it need not be on a beat) `PROMO.esc(s)` (escapes text containing < >; use it for code in a UI, or it gets swallowed as HTML)
`F.cut(t)` (registers a hard cut: motion blur won't overlap two pictures across it) `F.blur(a, b, count)` (this stretch moves fast: take more sub-frames so the trails are continuous; whips and vertical-strip fly-throughs are registered automatically)

Utilities: `PROMO.seg(t, a, b, ease)` (progress of t within [a, b]; among the eases, `E.spring` / `E.springSoft` are damped-spring settles with about 4% overshoot, more natural than backOut; tune your own with `PROMO.spring(f, z)`), `PROMO.set(el, styles)` (writes only on change), `PROMO.el(tag, css, parent, html)`,
`PROMO.words(container, html)` (splits into animatable words), `PROMO.E` (eases: expoOut / expoIn / expoInOut / backOut / cubicInOut / sine),
`PROMO.rgbSplit(k)` (red/blue offset shadow), `PROMO.scramble(text, t, start)`, `PROMO.develop(q)` (photo-developing filter).

Sound effect types: `impact` `boom` (low rumble) `whoosh` `riser` `click` `type` (keystroke) `tick` `pop` (notification) `shutter`.

Components for a visual style (such as origami's `PROMO.origami`) are in that style's `../styles/<style>/STYLE.md`.

## Text
| Component | Description | Automatic sfx |
|---|---|---|
| `PROMO.slam(F, parent, { at, every, items: [{ text, sub }], size, color, subColor, y })` | Slam words: one word crashes down per beat (1.3× → 1× + red/blue offset), shrinks automatically if too wide | impact |
| `PROMO.decode(F, parent, { at, until, text, size, pulses: [t] })` | Scrambled characters decode into a word (the product name) | riser |
| `PROMO.headline(F, parent, { at, until, html, size, x, right, y, align, font })` | Headline rises word by word from below, removed at until; html may contain `<i>` | — |
| `PROMO.slot(F, parent, { at, every, until, items, size, y, align, color })` | Slot machine: a run of words rolls past and stops on the last | tick |
| `PROMO.odometer(F, parent, { at, dur, value: '358,304,891', size, font, y })` | Odometer: digits roll into place one by one (with rebound) | tick |
| `PROMO.counter(F, el, { at, dur, from, to, format })` | Number rolls from `from` to `to` (ranking bar values, prices) | tick when it stops |
| `PROMO.typing(F, el, text, { at, dur, counter, counterFormat })` | Types out character by character, optionally with a cursor and a character counter | type |

## UI
| Component | Description |
|---|---|
| `PROMO.browser(F, parent, { x, y, w, h, url, bg })` → `{ win, view, P }` | Browser window (title bar + address bar); put content in `view`; `P(x, y)` converts content coordinates to frame coordinates |
| `PROMO.phone(F, parent, { h, x, y, bg })` → `{ win, view, P }` | Phone frame (for the portrait version), holding a mobile screenshot or a redrawn UI |
| `PROMO.field(F, parent, { x, y, w, h, size, placeholder, text, at, dur, until, left, right, maxLines })` → `{ box, text, placeholder }` | Input field (chat input bar, search box, form field): placeholder and typed text sit on the field's centre line; long text wraps and the field grows upward (bottom edge fixed), scrolling up beyond `maxLines` lines; `left` / `right` hold icons or a send button (pinned to the last line). Sizes are px: `F.px` in the frame, the phone's logical size inside a phone. **Use it for all typing into input fields**; don't stuff `PROMO.typing` into a box yourself (text sticks to the bottom / top) |
| `PROMO.camera(F, parent)` → `cam` | Camera: `cam.rig` is the container; put windows and the cursor in it; `cam.focus(at, dur, x, y, factor, { fit: {x,y,w,h} })` pushes in, `cam.reset(at, dur)` pulls back (zoom interpolates logarithmically, so push-ins and pull-outs feel even). `PROMO.camera(F, parent, z, { breathe: 0.035 })`: the camera keeps a very slow push/pull + sideways drift, so the frame is never fully still when held (the final check reports "画面静止" (frame static)); push/pull adds motion-blur sub-frames automatically. `fit` is the area that must stay entirely in frame after pushing in (e.g. a whole card): the factor shrinks and the position shifts automatically — add it especially for narrow portrait frames |
| `PROMO.cursor(F, parent, [[t, x, y], …, [t, x, y, hideTime]], [clickTimes…])` | Cursor moves along keyframes; on click it shrinks + ripple + click sfx. Put it inside `cam.rig` to scale with the camera |

Cards, buttons, options and ranking bars in a UI are written directly with `PROMO.el` in the project (a ranked list of cards is a few `el` calls plus `set` per frame).

## Transitions
| Component | Description | Automatic sfx |
|---|---|---|
| `PROMO.whip(F, out, in, { at, dur, dir })` | Whip pan: one whips out to the left, the other whips in from the right, with motion blur | whoosh |
| `PROMO.iris(F, el, { at, dur, from: '50% 50%' })` | Circular mask opens | whoosh |
| `PROMO.morph(F, el, { at, dur, from: {x,y,w,h}, to: {x,y,w,h} })` | Shared element: an element moves smoothly from one box to another (thumbnail → large detail) | — |
| `PROMO.flash(F, at)` | White flash | boom |
| `PROMO.screen(F, layer, { src \| shots, url, at, until, x, y, w, h, device, zoom, spot, cursor })` | **UI demo**: a real screenshot in a browser window (portrait + mobile screenshot → phone); the window stays still and the camera pushes into the page inside it — `zoom: [{ at, to: { x, y, w, h } \| 'all' }]` pushes to this region / pulls back to the full view (fractions 0–1 of the screenshot), `spot: [{ at, until, box }]` spotlight (the rest dimmed), `cursor: [{ at, x, y, click }]` cursor; no blank shows past the page edges, and the title is never covered. Long (full-page) screenshots work too: pushing in on a lower part is scrolling down | — |
| `PROMO.leak(F, at, { dur, color, light })` | A light leak sweeps across the frame (warm by default, screen blend on dark grounds); on light grounds write `light: true` (a faint multiply glow), and set `color` to the accent | — |

## Montage and ending
| Component | Description |
|---|---|
| `PROMO.carousel(F, parent, { at, until, images, speed })` | Images arranged in a rotating 3D carousel, flying in one by one |
| `PROMO.strips(F, parent, { at, until, images, n, zoom, zoomAt })` | Vertical-strip collage, sliding in alternately from top and bottom; strip number `zoom` expands to fill the frame at zoomAt (fly-through) |
| `PROMO.endcard(F, parent, { at, logo: { text, font } or { src, h }, tagline, url, cta, pulses })` | End card: logo written on / faded in, tagline, URL and call to action rising word by word |

## Animation libraries (allowed in promos; time is always driven by F)
Load them from jsDelivr in index.html:
`gsap@3.13.0/dist/gsap.min.js` + plugins `SplitText` `DrawSVGPlugin` `MorphSVGPlugin` `ScrambleTextPlugin` `CustomEase` `MotionPathPlugin` (all free, including commercial use), `matter-js@0.20.0/build/matter.min.js`, `opentype.js@1.3.4/dist/opentype.min.js`; Three.js is loaded dynamically by `PROMO.three`.

| API | Description |
|---|---|
| `const tl = PROMO.gsapTimeline(F)` | A paused GSAP master timeline, scrubbed to second t every frame. **Put every tween into tl** (position parameter in seconds: `tl.to(el, {...}, 12.5)`); never let a standalone `gsap.to` play on its own; don't change state in callbacks like onComplete. Prefer `fromTo` (correct when any single frame is rendered alone) |
| `await PROMO.three(F, parent, { fov, active(t) })` → `{ THREE, scene, camera, canvas, texture(src), update }` | A WebGL canvas; change the scene in `api.update = (t) => {...}`, rendered automatically after. A camera path can be tweened with `tl.to(plainObject, {...})` and read in update |
| `PROMO.physics(F, { at, until, hz, setup(Matter, engine) → bodies, step(Matter, engine, t) })` → `{ at(t) }` | Matter.js physics: simulated once in full before starting; at render time each body's `{x, y, angle}` is looked up by t |
| `await PROMO.textPath(font woff URL, text, size)` → `{ glyphs, viewBox, w, h }` | Text outlines (one path per glyph); combine with DrawSVG for a logo "written stroke by stroke" |

Common effects and their libraries:
- Masked rise by character / word / line: `SplitText.create(el, { type: 'chars,words,lines', mask: 'lines' })` + `tl.fromTo(sp.chars, { yPercent: 118 }, { yPercent: 0, stagger })`
- Handwritten logo: `textPath` + `drawSVG: '0%' → '100%'`, then fade in the fill
- Shape morphs (folded corner → full page, icon to icon): `morphSVG`
- Scramble-decode (language switch, tagline): `scrambleText`, with chars in the matching script (Chinese / kana / digits)
- Cursor moving on an arc: `motionPath`
- Grid popping out from the centre in sequence: `stagger: { each, grid: [rows, cols], from: 'center' }`
- A near-spring settle: `CustomEase.create('settle', 'M0,0 C0.12,0.62 0.2,1.04 0.42,1.025 C0.62,1.01 0.8,1 1,1')`
- 3D scenes (film negatives bending in space, a negative developing into a positive): `PROMO.three` + ShaderMaterial
- Real physics (a film-drying line lowered and photos swinging; things falling and piling up): `PROMO.physics`

Notes:
- Fonts are fully loaded before building (SplitText splits by real glyph widths); `Math.random` is seeded per frame by time (scramble effects are the same on every render).
- Writing `display:''` in an F.add like `show()` clears an inline `display:flex`: wrap flex containers you toggle in an extra element.
- The automatic check temporarily skips elements clearly rotating around the X / Y axis (cube transitions, flipping text) and judges them after the turn.
- Don't hand multi-function CSS `filter` strings (brightness + contrast + blur…) to GSAP to tween: they don't change gradually and jump to the final value at the end. Tween a proxy number (`tl.to(obj, { q: 1 })`) and convert it to the filter every frame in `F.add`. The final check's "画面突然跳变" (sudden frame jump) catches this kind of problem.
- Physics: dropping things fast from far outside the frame sends them spinning; keep drop distance proportional to time, and set `collisionFilter: { group: -1 }` when objects don't need to collide.

## Writing tips
- Key moments on screen (reveal, twist, product name) can take `F.musicCue(t, 'hit' | 'name' | 'stop')`, and the music hits with them (`references/music.md`, "Following the picture").
- Texture layers that keep moving but aren't "actions" (grain, noise, a constantly rotating backdrop) get `el.dataset.motion = 'skip'`, so the motion sheet doesn't measure them; hand-written animation should change styles via `set()` so the motion sheet can measure it.
- **Put line-height after font**: `font:600 32px Inter;line-height:72px`, or together as `font:600 32px/72px Inter`. The other way round (`line-height:72px;font:…`) the font shorthand resets line-height to normal, and text in buttons, input fields and pills sticks to the top of the box (`--check` reports "字没居中" (text not centred)).
- Text that changes in steps (typing, counting, scramble-decode) stacks into double cursors and ghosted digits under the final motion blur: `PROMO.typing` / `counter` / `decode` / `field` already sample time per frame; for your own per-character / per-digit changes, also write `const tq = PROMO.frameT(t)` and compute the text from tq.
- Type into input fields with `PROMO.field`: in a hand-made box, placing typed text with flex-end / a fixed top puts single-line text low in the box (`--check`'s "字没居中" reports it; boxes drawn with an inset `box-shadow: inset` count too).
- Elements built with `el()` are all `position:absolute`: side-by-side spans in a line and flex children need `position:relative` written explicitly, or they pile up in the top-left corner.
- Act out the operations the text mentions (`review.md`): drag-to-reorder with `PROMO.reorder(F, parent, { x, y, w, rows: [{ h, render }], from, to, at, drop })` (handle, pick-up, insertion line, others making room, drop, cursor all included); clicks, toggles and form-filling with `PROMO.cursor` + UI state changes.
- One layer per section: `const L = F.layer('', z)`; toggle `display` by time in `F.add`, so elements not on stage aren't checked.
- Always register your own text with `F.text(...)` with its appear and disappear times, otherwise the fact check and overlap check can't see it. The fact check splits registered text at line breaks and ` / ` (a slash with spaces around it) and looks for each piece in brief.md (compared with spaces and punctuation removed; short values with punctuation like `9:41` or `$2.1M` also count if they appear verbatim in the brief); register decorative text (VS, numbering) with `{ noFact: true }`.
- The automatic check looks at **the part of the text actually visible** (taking masks into account) and reports: two pieces of text overlapping, two headlines on screen at once, elements showing outside their registered time, text cut off by the frame edge (for 0.35 s or more), headlines held too briefly.
- Hide your own components before they appear (`display: none` or transparent); they must not show early in their initial state.
- When the camera pushes in, the card being pushed in on must not be cut by the frame edge: frame the whole block with `fit`; when portrait can't push in close enough, emphasise with highlights instead (solid bars, reversed-out text). Small text that would be half cut during the push (e.g. a date under an image) is hidden first and reappears after pulling back.
- Ranking bars with a value column: subtract the value column on the right from the bars' maximum width, so even the longest bar doesn't run over the numbers.
- The title layer doesn't move with the camera when it pushes in: either hide the title during the push, or put it outside `cam.rig` and keep it clear of the picture.
- For screenshots used as backgrounds / charts, use `clip-path: inset(...)` for a "brushed in" effect and `mix-blend-mode: darken` to drop a light background.
