# One continuous picture drawn by a pen, then washed with colour (线稿成世界, `drawnworld`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

One film is one picture. A single black stylus with a soft shadow draws a dense ink illustration stroke by stroke on warm white paper; the ink lands on its own clock and the hand moves through it calmly. The camera pushes in on what is being drawn and eases back to show the picture so far, and the picture grows outward from one small starting structure. When the whole thing is on the page, a seeded colour wash spreads across it with soft banded edges and reveals what the lines never showed: a sky, far hills, trees. Then the camera holds still and the world lives: machines turn, smoke drifts, people shuffle, lights breathe.

Runtime: `runtime/drawnworld.js` (`PROMO.drawnworld(F, opt)`, canvas 2D, no libraries). New project:
- narrated explainer (the usual case): `node explainer/scripts/new.mjs <dir> --style drawnworld`;
- promo on the beat: `node scripts/new.mjs <dir> --style drawnworld` (add `--quick` for the quick version through the kit).

Starter pages: `styles/drawnworld/explain.html` (narrated, hand-written: the usual way) and `styles/drawnworld/index.html` (on the beat). Narrated films set `compose({ chapters: false })`. Sample: `videos/inflation-drawnworld` 《为什么会有通货膨胀》.

## 0. Safety
- **Invent the world.** Learn the technique only: never copy another drawing's scene, characters or layout. Towns, machines and people are invented; no real banks' logos, currency designs, brands or real people. Banknotes are `W.bill`: a plain frame, no real design.
- **Illustrative numbers stay illustrative.** A price on a tag in an invented town goes in brief.md under "Illustrative", and real figures go on a sign with their year and place.

## 1. When to use
- **A system with several causes or parts**, where the point is how they fit together on one page: why prices rise, how a city gets its water, what happens to a parcel, how a law passes. One area per idea.
- **"It all connects" explainers**: the wide shot at the end is itself the summary, each machine starting as the voice names it.
- **Promos for products that are a system or a place**: logistics, marketplaces, games, cities, platforms ("look what's running here").
- **Less suited:**
  - stories with characters who talk (shadow, manga, chat);
  - one idea with no parts (parable, lumen);
  - real UI walkthroughs (launch, toy3d);
  - many numbers compared (swiss, collage).

## 2. What it is (and isn't)
- **It is one picture.** No scenes, no cuts, nothing erased. Whatever is drawn stays, and the last frame contains the whole film.
- **Not `whiteboard`:** no marker scenes, no hand, no pans between boards; the camera only follows the pen on one drawing.
- **Not `pencil`:** clean ink, not graphite; nothing boils or redraws itself; no morphs.
- **Not `isometric`:** a flat elevation drawn by hand; it doesn't move until the very end, and the colour is held back.
- **Not `blueprint`:** an illustrated place, not an engineering sheet.

## 3. Colour
Line stage: `paper` `#f8f6f0` and `line` `#17161a`. Nothing else, for the whole line stage. **No colour before the wash, not even an accent.**

Palettes for the colour stage (`palette`), each with `sky`, `cloud`, `hill`, `leaf`, `bloom`, `wood`, `wall*`, `roof*`, `metal`, `brass`, `glass`, `lit`, `awn*`, `note`, `skin`, `cloth`:
- `market` (default): teal sky to warm cream, terracotta, mustard, teal awnings;
- `dusk`: indigo to pink to amber;
- `morning`: pale blue, soft greens;
- `night`: deep blue, lit windows.

By role: every part takes its fill from the palette by role and can override it (`fill`, `colors`). `opt.colors` overrides a palette entry. Outlines in the colour stage are the fill darkened toward `ink`, not black. A brand colour goes into roofs and awnings (kit tint); the lines stay black.

## 4. Type
- **Everything on the page is lettered by the pen** (`W.write`): CJK in real stroke order (Make Me a Hanzi medians via hanzi-writer-data, loaded from the CDN at page load), digits and Latin as single strokes. A character with no data is reported by `--check`.
- Sizes (world units): labels 30–46, key numbers 46–60. Check them at the final zoom: a label of 38 at zoom 0.67 is 25 px.
- Words live on things: `W.sign`, `W.label` (a hanging shingle), `W.tag`, a wall. `plate: true` puts a plain plate under the words so lines behind them are hidden.
- Captions: dark text on bare paper. The foot of the frame stays unpainted: lines and colour thin out into the paper along a seeded wobbling edge, in the wash's bands, so a caption never sits on a brick wall and the picture gets no frame. Keep what matters above about 82 % of the height, including in the final shot (`W.final`). `captions: { backing: false }` turns it off, and `--check` then reports any caption on the drawing. Lettering should say what the caption doesn't (a number, a place, a short name).

## 5. Motion
- **Stroke order.** `W.draw` tours: the pen goes to the nearest unfinished part, and inside a part the first stroke item (usually the outline) stays first and then the nearest stroke follows. Lettering and strikes hold their place in the list, so a sign is on the page before its words and the words read in order. An open stroke starts from its nearer end. `order: 'given'` keeps the declared part order when the order is the story; `strokes: 'given'` keeps the declared strokes inside a part.
- **Pen speed follows length:** long lines take longer but move faster, short ticks are quick, with a lift and a short travel between strokes. Up to several strokes per frame is normal, and `--check` calls above 240 a second racing.
- **The visible pen is a calm hand, not the live end.** With several strokes per frame a pen pinned to the live end teleports every frame and pulls the eye from the captions. The ink keeps its clock, and the pen is a smoothed path through it, tabulated once and a pure function of t (`penSoft`, default 0.09 s; 0 pins it back). A stroke long enough to watch (about 0.12–0.36 s and longer, `penFollow`) is tracked closely, so long lines still look drawn by the tip; short strokes in a dense area let the hand drift through them. `--check` measures this on the visible pen: on the sample a pinned pen reverses 13.7 times a second (21.3 in the worst 3 s), the calm pen 0.4 (1.7). The limit is 6 (9.6 in the worst 3 s). Don't aim for a reference clip's rate: a film with a voice and captions needs the quiet hand.
- **Occlusion is by time.** A nearer part already on the page: the pen lifts over the hidden span. A nearer part drawn later: the farther lines vanish as its outline passes them. Hidden lines are never visible in the finished state.
- **Nothing moves before the wash.** The picture only grows.
- **After the wash, life is declared on parts:** `p.spin / bob / sway / blink / drift`, with `W.mesh` tying gears by tooth count. In a narrated film start each machine on its word (`from: w('l11', '…')`). Vary periods and phases.

## 6. Camera and transitions
- Automatic, built from the `W.draw` calls: a push-in that follows the pen (`zoom`, `pad`, `follow`), an ease back after each job (`pull`), then the held final shot (`W.final`). It leads the next job by about 0.65 s and is heavily smoothed.
- It corrects itself to keep both the live end and the visible pen inside the safe area, above the captions.
- **The wash and the final shot hold dead still.**
- There are no transitions. The quick version's scene change is a band of colour crossing the frame.

## 7. Sound
A pen on paper (`scratch`, only heard in the pauses because light effects drop under a voice), a small `tap` for a strike-through, the `wash` (air and glass), a `whirr` when a machine with `announce: true` starts. Music: a small curious band that opens up on the wash (`styles/drawnworld/score.js`, sections `open / story / turn / wash / live`). The last line of narration runs into the held shot, so it never sits under music alone.

## 8. Signature moves
- **The colour holds back what the lines never drew:** sky, hills, trees exist only in the colour stage (`colorOnly`).
- **The strike-through as the through-line:** a tag crossed out and rewritten each time the story moves on, the same place the pen keeps returning to (`W.strike` + `W.write`).
- **Machines start on the word:** the closing line names each cause and its machine starts turning as it is said.
- **Depth by drawing behind:** a wall drawn after the stall in front of it, the pen lifting across the stall.

## 9. The world as information
Tell things in the drawing's own language, never boxes and arrows:
- **Steps:** a staircase or a loop the eye can follow; a cable loop with cars going round (`W.cableway`), shingles on it naming the stops.
- **Contrast:** one thing grows and the other stays (a press beside a bakery with "每天只烤这么多"); a pipe that narrows (`r` as a function).
- **Numbers:** on a sign with year and place; an old value struck out and the new one written beside it.
- **Quantity:** repeat the thing (a queue, a heap, a stack).

## 10. Building a picture
1. Sketch the layout on levels: which area for which line, where the wide shot ends up (about 2880 × 1620 world units at final zoom 0.667 for 16:9).
2. Start small: the first group is one structure, the rest grow out from it.
3. `W.group(name, fn)` per idea, `W.draw(name, { line })`. If a line has too much, spread the group over neighbouring lines; repeated detail (bricks, windows) can go down while the voice talks about something near it.
4. Colour-only world last: `W.sky`, `W.hill`, `W.cloud`, `W.foliage`, `W.vine`, `W.smoke`, `W.birds`, `W.glow`.
5. `W.L(landscape, portrait, square)` for layouts that differ by format. A wide town doesn't fit 9:16: in portrait stack the areas on more levels, and in 1:1 use fewer columns.

## 11. Formats
16:9, 9:16 and 1:1: `node scripts/render.mjs <dir> --aspect 9:16` or `--aspect 1:1` (→ `out/video-1x1.mp4`). The quick version adapts by itself; a hand-written picture needs its layout thought through for each format with `W.L`.

## N-3. Pitfalls and self-check
`--check` reports:
- `笔出了画面`: the live end left the frame; split the job or lower `zoom`.
- `线会透过去`: a closed shape with no fill (give it one, or `seeThrough: true`); `线透过了零件`: lines end up inside a nearer part.
- `有零件没画`: a part not in any `W.draw` would appear from nowhere in the wash.
- `笔太快` / `笔太慢` / `笔停了`: pace and idle pen under a running voice.
- `笔在抖`: the visible pen reverses direction too often, measured frame by frame on screen; `笔离线太远`: the visible pen is too far from the line being drawn (90th percentile over 15 % of the width). Together they keep `penSoft` between shaking and floating.
- `字幕压线`: a caption with drawn lines or colour showing through under it, weighed by what the paper at the foot of the frame lets through.
- `镜头太快` / `变焦太快` / `镜头来回推拉`: the camera; merge neighbouring jobs.
- `上色太早` / `上色时还在画` / `定格太短` / `定格是死的` / `定格没有声音` / `没有天空`: the payoff.
- `动效呆板`: bob / sway in unison, or every machine starting on the same frame.
- `字太小` / `字压在线上` / `字重复字幕` / `字没有笔画数据` / `线太少`.

On the frames: a sign covering another sign; a car passing over a label; the pen landing under a caption; a final wide shot that still has white paper at its edges (extend the street, or put bushes in front).

## N-2. Variation
Palette; what the world is (a town, a ship, a body, a factory, a farm, a coral reef); side elevation or a tower growing upward; where the wash starts (`from`: corners, a side, or the point the story ends on); how many labels.

## N-1. API quick reference
```js
const W = PROMO.drawnworld(F, { palette: 'market', seed: 'my-film', captions: { max: 24 } });
const C = W.colors, s = F.T.start, e = F.T.end, w = F.T.word;
W.sky({ y0: -860, y1: 180 }); W.hill({ pts: [[-1700, 0], [0, -120], [1700, 20]], fill: C.hill[0] });
W.foliage({ x: 0, y: 860, w: 3300, h: 330, z: 4, layers: 4, seed: 'front' });   // colour only unless line: true
W.group('stall', () => {
  W.platform({ x0: -400, x1: 400, y: 430 });
  const st = W.stall({ x: 0, y: 430, w: 330, h: 250 });
  W.loaf({ x: 0, y: st.counterY, w: 90 });
  W.write('5元', { x: 240, y: 300, size: 44 });
});
W.draw('stall', { line: 'l1', zoom: 1.5, pad: 90 });
W.wash({ at: s('l9'), dur: 4.5, from: 'corners' });
W.final({ x: 0, y: -50, z: 0.667 });
```
- `W.part({ name, in, z, lw, ink, colorOnly })` → `p.shape(pts, { fill, smooth, stroke, seeThrough, occlude, alpha, colorOnly })`, `p.line(pts, { lw, ink, smooth })`, `p.rect`, `p.circle`, `p.ellipse`, `p.arc`. `fill`: `'#hex'` or `{ v: [top, bottom] }` / `{ h: [left, right] }`. Later is nearer; `z` moves a whole part.
- Structure: `W.post`, `W.beam`, `W.platform`, `W.arcade`, `W.stairs`, `W.ladder`, `W.railing`, `W.truss`, `W.house`, `W.window`, `W.door`, `W.awning`, `W.stall`, `W.chimney`, `W.bricks(p, …)`, `W.shingles(p, poly)`.
- Machines: `W.pipe({ pts, r: number | q => r, every, smooth })`, `W.valve`, `W.tank`, `W.gear({ teeth, r })`, `W.mesh(a, b)`, `W.wheel({ r, spokes | blades })`, `W.windmill`, `W.belt`, `W.cableway({ pts, cars, pylons })`, `W.flow({ pts, n, speed, make })`, `W.cable`, `W.bunting`, `W.lamp`.
- People and goods: `W.person({ x, y, h, face, pose: 'down' | 'up' | 'reach' | 'carry', hat, bag })`, `W.queue({ x, y, n, gap, dir, every, from })`, `W.loaf`, `W.crate`, `W.barrel`, `W.sack`, `W.basket`, `W.coin`, `W.bill`, `W.tag`, `W.sign`, `W.label`.
- World: `W.sky`, `W.hill`, `W.cloud`, `W.foliage`, `W.tree`, `W.vine`, `W.smoke`, `W.birds`, `W.glow`, `W.shade(p, pts, a)`.
- Text: `W.write(text, { x, y, size, align, wrap, plate, plateFill, lw, ink, z, in, part, over, small })`, `W.strike(part | [a, b])`.
- Time: `W.group(name, fn)`, `W.draw(target, { at, until, line, order, zoom, pad, follow, pull, kind })`, `W.wash({ at, dur, from, seed, bands, soft, warp })`.
- Life: `p.spin(rps, { x, y, from, ramp, announce })`, `p.bob(amp, period, { axis, phase, from })`, `p.sway(deg, period, { x, y, phase, from })`, `p.blink(period, { duty, min, from })`, `p.drift(pts, { speed, loop, phase, fade, grow, step: { every, dur }, from, ox, oy })`, `p.pivot(x, y)`.
- Camera: `W.final(view)`, `W.cam(t, view)`, `W.L(l, p, s)`, `W.toScreen(x, y, t)`, `W.mix(a, b, q)`.

## N. Not supported yet
- Moving parts in the line stage: the picture only grows until the wash.
- More than one wash, and erasing.
- Automatic re-layout of a hand-written picture between formats (`W.L` is by hand).
- Stroke data needs the network at render time (hanzi-writer-data on the CDN).
- Perspective and 3D: parts are flat elevations.
