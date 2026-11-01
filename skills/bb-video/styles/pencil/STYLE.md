# Hand-drawn pencil-test animation (铅笔手绘动画, `pencil`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

One frame: a sheet of warm off-white animation paper with tooth, a soft vignette, three peg holes at the top and the drawing number in the corner — a pencil test shot under the camera.
- **Everything is drawn in graphite.** Light blue construction lines go down first (circles, ovals, the line of action), the darker clean-up line is laid over them. Lines have pressure: they swell and thin, and each stroke is two passes slightly apart. Shading is graphite smudge and hatching.
- **Drawn on twos, and the line boils.** 15 drawings a second at 30 fps, each held two frames; every line wobbles a little from drawing to drawing (seeded, so the same frame always renders the same).
- **Mostly monochrome.** One warm accent (amber by default) may bloom at an emotional peak, like coloured pencil rubbed in.
- **No cuts.** One drawing redraws itself into the next (a morph); the camera follows the motion across the sheet.
- **Gesture figures.** People are gesture drawings on a pose rig: construction ovals, the line of action, tube limbs, no face.

The technique is the classic pencil test of hand-drawn animation (the look of films like Glen Keane's *Dear Basketball*, 2017). We learn the technique only: never its shots, compositions, poem or text.

Runtime: `runtime/pencil.js` (`PROMO.pencil(F, opt)`, canvas 2D, no libraries). New project:
- narrated explainer (the usual case): `node explainer/scripts/new.mjs <dir> --style pencil`;
- promo on the beat: `node scripts/new.mjs <dir> --style pencil` (add `--quick` for the quick version through the kit).

Starter pages: `styles/pencil/explain.html` (narrated, hand-written: the usual way) and `styles/pencil/index.html` (on the beat). Narrated films set `compose({ chapters: false })`: the runtime writes the chapter as a scene slate in the sheet's corner (`SC. 2 · …`) instead of the engine's bar.

## 0. Safety
- **No likeness of a real person.** A biography in this style tells a real person through places, dates, numbers, objects and the court / room / street, never a portrait. Any figure standing for them is a generic gesture figure: seen from behind, in silhouette (`look: 'silhouette'`), or faceless (the rig has no face). Never draw their features, hairstyle, tattoos or signature pose from a photo.
- **No other film's shots.** Learn the technique (construction → clean-up, boil, morphs, light pools), never a shot, pose sequence, poem or line of a real film.
- **No logos or trade dress.** Jerseys are plain numerals (`wear: { number }`), teams are plain colours; no league, team, sponsor or award marks (an award is a generic cup, a medal, a lit stage — not a trademarked statuette).
- **Death and tragedy are told plainly.** Date, place, the number of people, what the official report found; a quiet drawing (hills under cloud, the light going down). Never a wreck, never dramatised.

## 1. When to use
- **Biographies and careers** told through a body in motion: athletes, dancers, musicians, craftspeople (as generic figures, see §0).
- **Anything about movement and timing**: sport technique, how animals move, a dance, a process done by hand, how animation itself works.
- **How a machine came to be, or how it works**: each generation redraws itself into the next, the mechanics computed so they are really right (wheels, cranks, chains). This is where the style is strongest: morphs, lines going down, rough to clean-up.
- **Emotional explainers**: memory, growing up, a turning point; a single life or a single day.
- **Promos** for creative tools, education, sports and wellbeing — told as one figure's motion and a drawing that becomes the product's answer.
- **Less suited:**
  - real UI walkthroughs (launch, toy3d);
  - dense comparisons with many numbers (swiss, collage);
  - many named characters talking (shadow, chat, manga).

## 2. What it is (and isn't)
- **It is a pencil test:** loose construction under a firm line, smudged tone, a light pool, drawings on twos, an animator's sheet.
- **Not `whiteboard`:** no marker, no hand drawing on camera, no white board; the pencil is never shown, the drawing just happens.
- **Not `storybook`:** no inked mascots, no flat colour fills; people are gesture drawings, colour is one warm wash.
- **Not `ink`:** no wash on a handscroll, no brush; graphite on paper, a sheet not a scroll.
- **Not a sketch filter:** every element is a real stroke with construction under it; never trace or filter a photo.

## 3. Colour
Palettes (`palette`):
- `graphite` (default): paper `#eee8db`, lead `#2c2a27`, soft `#5d5952`, construction blue `#6f9cc6`, shade `#4a4741`, haze `#3f3a48`, accent amber `#d8902e`;
- `cool`: grey-white paper, cooler graphite, accent a brick red;
- `sepia`: aged cream paper, brown graphite, accent burnt orange.

By role:
- `lead` = the clean-up line and the main lettering; `soft` = secondary lines and lettering, court lines, crowds;
- `blue` = construction only (never for meaning); `shade` = smudge tone;
- `accent` = the **one** warm colour: one or two blooms at emotional peaks (`D.bloom`), the hot key on a timing chart, the ring round the thing that matters. `--check` warns beyond four blooms or when the wash stays on for over a third of the film.
- `opt.accent` swaps the warm colour (a team or brand colour is fine as a plain colour); keep it warm and singular.

## 4. Type
- Lettering is LXGW WenKai, graphite with paper tooth (a grain mask) and a slightly rough edge.
- `D.write` rules two blue guidelines first, then the words are written on left to right (a clip), like an animator lettering a title card. Small labels skip the guides (`guide: false`).
- Numbers that matter are **drawn**, not typed: `D.numeral` draws digits as single strokes over guidelines; a new value redraws itself out of the old one.
- Sizes: titles 90–130, key words 60–80, labels 40–54 (world units at zoom 1 ≈ px at 1080p); captions are added by the runtime when narrated.
- At most a few words on the sheet at once (`--check` counts; default 9 pieces).

## 5. Motion
- **On twos:** drawings (figures, entrances, numerals) step at 15 a second, and the camera and lettering on the sheet step with them. One clock on purpose: a camera on ones over a subject on twos saws back and forth by a whole step of travel on every drawing, and it reads as hard flicker. `twos: false` turns it off (rarely).
- **Boil:** every line wobbles slightly per drawing; held drawings cycle three versions. `boil: 0.5` calms it; `0` is flagged by `--check`.
- **Entrances are drawing:** `enter: 'draw'` (default for anything appearing after 0) puts down the blue construction, then the clean-up line over it, then the shading. `fade` for tone, haze and soft things.
- **Exits are erasing:** `exit: 'erase'` (default) sweeps the drawing away with a faint smudge left behind; `fade` for quiet endings.
- **Figures:** a pose rig adapted from the parable style (overlapping action: hips lead, arms and head follow; anticipation and settle). Actions: walk / run, jump (gravity arc), sit, lie, fall, bow, cheer, look, gesture, reach, bounce (dribble), shoot (a throw on an arc), custom `keys`. `fig.onion(a, b)` leaves the past poses as blue onion skin — motion made visible.
- **Rough first, clean later:** a group with `clean: t` stays a blue rough until t, then the clean-up line is drawn over it; `ghostAt: t` turns a drawing into a blue onion-skin ghost.

## 6. Camera and transitions
- One continuous sheet; the camera holds and breathes (`D.cam`), travels (`D.move`), and **follows** a moving figure with a little lag and lead (`D.follow`).
- Transitions are **morphs**: `D.morph(at, from, to)` pairs the lines of two drawings and redraws one into the other (blue inbetween lines run ahead of the graphite). A ball becomes a globe, an 8 becomes a 24, a hoop becomes a trophy. `--check` warns on hard cuts.
- Light changes the mood without a cut: `D.light({ on, r })` pools light around the subject in a graphite haze (the shot "spotlit on the sheet"); `cone: true` for a beam from above.
- In the quick version (kit), scenes change by the next sheet flipping down off the pegs.

## 7. Sound
- Music (`styles/pencil/score.js`): felt piano over soft strings, a low bass; at the peak the strings swell; under a voice pad, bass and piano keep.
- Effects (`styles/pencil/sound.js`): graphite scratching as lines go down (`sketch`), shading (`scribble`), the eraser (`erase`), pages flipped under the thumb for a morph (`flip`), pencil taps for marks and keys (`tap`), a small `tick` per numeral change, soft `step`s, a low `thud` for landings and bounces, a soft glass `bloom` for the accent, `rim`.
- With narration keep effects light; music bed under the voice, never a 1–2 s music-only gap.

## 8. Signature moves (pick per film)
- **The morph:** one drawing redraws itself into the next instead of a cut.
- **Construction → clean-up:** a rough in blue becomes the real drawing (`clean: t`) — the moment something becomes real or wins.
- **The light pool:** the haze closes in, one figure stands in the light.
- **Onion skin:** a figure's past poses trail behind it in blue (a jump, a run, a turn).
- **The numeral that redraws itself:** 8 → 24, 1996 → 2016.
- **The bloom:** the warm accent spreads into one drawing at the peak.
- **The tally:** a count marked out in gates of five (seasons, titles, years).

## 9. Telling information
Never generic boxes or arrows. Each kind of information has a pencil-native form:
- **Steps / a timeline** → `D.timing`: an animator's timing chart — a ruled line drawn on, a key tick with a circle per step, small breakdown ticks between keys, the step lettered over (sub line under); the hot key circled in the accent. Years of a career sit naturally on it.
- **A sequence of states** → `D.onion`: one drawing per step; when the next arrives, the earlier ones fade to blue onion skin.
- **Contrast** → `D.versus`: both sides start as blue roughs; the side that wins is cleaned up in graphite and blooms; the other stays rough. (Or a morph back and forth between the two drawings.)
- **Counts** → `D.tally`: tally marks in gates of five, marked out one by one.
- **A few numbers** → `D.marks`: growth marks on a door-frame post, a pencil tick per value at its height, the value lettered beside it, bottom up.
- **The one number** → `D.numeral` (with `count` for a counter that runs up, or `keys` for values that redraw into each other).
- **A spot on a drawing** → `D.note` (a handwritten note with a looping leader) and `D.ring` (a loose double loop).
- Kit (quick version and quick explainers): flow = a timing chart (portrait: running down the sheet), compare = rough vs clean-up, chart = growth marks on a post, annotate = a lens ringed in pencil, montage = a paper-tinted cell with hatching.

## 10. Figures
- `D.figure({ x, y (its ground line), height (units, default 400), face, look, wear, at })` → node with `.fig`: the rig. Looks: `gesture` (construction + contours + smudge on the shadow side), `silhouette` (filled graphite: anonymous, against the light), `rough` (construction only), `line` (contours only). `construct: false` hides the blue under a figure.
- Faceless by design. For a real person use `face: 'back'` or `look: 'silhouette'`; `wear: { top: 'tank' | 'shirt', bottom: 'shorts', number: '24' }` gives plain sports kit with a plain numeral on the back (`front: true` to show it on the front).
- Props ride the rig: `node.hold(fig, a, b, { hand })`, `fig.bounce(a, b, ball)`, `fig.shoot(at, ball, target)`, `node.arc(a, b, to, { h })`.
- Coordinates: the rig works in metres; `x` / walk targets / jump targets are world units on the sheet.

## 11. Machines
- `D.drive([[t, turns per second], …])` is a shaft's angle over time: rates ramp between keys, so it never starts or stops dead. Angle increasing = clockwise on the sheet = rolling to the right.
- `D.wheel({ x, y, r, kind: 'wood' | 'wire', spokes, tyre, turn, mark })`: spokes really turn; `r` (and `x`, `y`) may be functions of t, so a wheel can grow while it runs; `mark: true` paints one spot so its turns can be counted. Past the speed where a spoke lands more than about a third of the way to the next one's place from one drawing to the next, the wheel draws its own spin: the spokes thin out, a faint disc and a few held arcs come in, while rim, hub and painted spot stay sharp (`blur: false` keeps sharp spokes, which then strobe or seem to run backwards). So give a fast wheel `mark: true`: the spot is what shows its turns.
- `D.crank({ x, y, len, turn, phase, pedal })` with `.pedalAt(t, side)`; `D.sprocket({ x, y, teeth, pitch, turn })`; `D.chain({ a, b })` gears b to a by their teeth and carries the links at a's rim speed (`.ratio`, `.turnB`): the ratio is right by construction, never typed in.
- Roll it for real: a group's `x: (t) => x0 + R * turn(t)`, so nothing slips.
- `D.live({ draw: (t, pen) => … })` draws anything from t (a frame that follows a growing wheel); `D.link2({ from, to, a, b, bend })` solves a two-bar linkage from its ends (a small rider's leg on a pedal); `D.span({ x0, x1, y, label })` is a pencil dimension span (how far one turn goes).
- `node.onion(a, b, { every, n })`: any drawing leaves its past states as blue onion skin (how a machine tips over, how a wheel travels).
- Accent on a machine: put closed areas computed from the same points as the tubes (`pen.poly(tri, { line: false })` inset a little) and `D.bloom(at, { on, lines: 0.25 })`: the wash fills those areas, under the lines, and the lines stay dark enough to bound them.
- Machines are the stars; riders are small and secondary. Tell the reason for each change with the mechanics (one pedal turn, one wheel turn), not with a character's acting.

## 12. Cover
`F.coverAt(t)` on the peak: the figure in its light pool, or the key numeral with the bloom.

## 13. Pitfalls and self-check
- **Empty sheet.** A lone figure on a blank page reads as a test, not a film: put the place in (a court, a street, hills, a crowd, a light pool), and smudge tone where the light falls off.
- **Everything drawn in place.** Twenty draw-ons in a row feel like a slideshow: morph, follow a figure, travel. `--check`: "same entrance".
- **Stiff figures.** `--check` measures the rig: limb snaps, hard starts, too fast, frozen, standing in view >7 s with nothing to do. Give holds a look, a turn, a gesture.
- **Accent everywhere.** One or two blooms; the rest is graphite.
- **Hard cuts.** Morph or travel instead (`--check`: "hard cut").
- **Blank sheets between drawings.** Erasing the last drawing before the next is down leaves a blank page under the voice, even for a quarter of a second. Start the next one first (`until` later than the next `at`), morph, or keep the old drawing until the camera has left it. `--check`: "near-blank sheet".
- **Captions on the drawing.** Keep the ground line above the caption band (about 88 % of the frame height): check `view.y` on any hand-placed camera. `--check`: "caption over a drawing".
- **Lettering on the drawing.** A label on a rider's neck or a counter across a tube: place words and numerals on clear paper, also while things move. `--check`: "lettering on a drawing" (measures pencil lines crossing the box of every label and numeral; `over: true` where it belongs, like a number on a banner).
- **Writing out what the voice just said.** Captions already carry the words. Letter what the voice does not say: a number, a date, a part's name. `--check`: "text repeats the caption".
- **Likeness.** No faces, no recognisable hairstyles or tattoos; back views and silhouettes (§0).
- Look at stills: construction visible under the clean-up? Boil present in a held frame (render two consecutive stills)? Text readable on a phone (≥ 40 units)?

## 14. Variation
- Palettes `graphite` / `cool` / `sepia`; the accent colour.
- Light: open sheet vs light pools vs a cone from above; dark haze (`dark`) for night and grief.
- Figure looks: gesture vs silhouette vs onion-skinned rough.
- Pace: drawings on twos (default) or `drawings: 10` (held three frames, an even step at 30 fps) for a choppier, sketchier test.
- `sheet: false` drops the peg holes and drawing number for a cleaner page.

## 15. API quick reference
```js
const D = PROMO.pencil(F, { palette: 'graphite', accent, boil: 1, twos: true, sheet: true, captions, chapters });
// shapes (world units; at = when it starts being drawn)
D.line({ pts, smooth, lw, tone, at, inDur, until, exit })        D.poly / D.circle / D.ellipse / D.rect / D.arc / D.path({ d })
D.group({ x, y, s, rot, at, clean, ghostAt }) → g.line / g.circle / …     node.to(at, { x, y, rot, s, alpha }, dur)
// options on shapes: construct (blue first), shade (hatching), smudge (tone), wash (accent), angle, lw, tone
D.prop('ball' | 'hoop' | 'court' | 'cup' | 'medal' | 'banner' | 'board' | 'door' | 'window' | 'chair' | 'table' | 'lamp' | 'tree' | 'house' | 'hills' | 'cloud' | 'globe' | 'crowd' | 'frame' | 'film', { x, y, at, … })
D.morph(at, from, to, { dur })
const f = D.figure({ x, y, height, face, look, wear, at });  f.fig.walk(at, x, { run }) / jump / sit / lie / fall / bow / cheer / look / gesture / reach / bounce / shoot / keys / onion
D.timing({ x, y, w, keys: [{ label, sub, hot }], T, until })   D.onion({ n, T, dx, draw: (g, i) => … })   D.versus({ sides: [{ title, points, draw, hot }], T })
D.tally({ x, y, n, at, every })   D.marks({ x, y, h, items: [{ label, value, hot }], T, unit })   D.numeral({ x, y, size, keys: [[t, '8'], [t2, '24']] | count: { a, b, to } })
D.note(text, { on, at })   D.ring({ on, at, tone })   D.light({ on | x, y, r, at, until, dark, cone })   D.bloom(at, { on, until })
D.write(text, { x, y, size, at, until, align, wrap, guide, tone, kind, screen })
const turn = D.drive([[t0, 0], [t1, 0.5]]);  D.wheel({ in: g, x, y, r, kind, spokes, tyre, turn, mark })  D.crank({ in: g, x, y, len, turn })  D.sprocket({ in: g, x, y, teeth, turn })  const ch = D.chain({ a, b }) → ch.turnB
D.live({ draw: (t, pen) => pen.line(pts, o) })  D.link2({ from, to, a, b })  D.span({ x0, x1, y, label })  node.onion(a, b, { every, n })
D.cam(t, view)   D.move(a, b, view)   D.follow(a, b, figure, { lag, lead, z, dx, dy })   view = { x, y, z } | { on, pad }
```
Minimal:
```js
const D = PROMO.pencil(F, {});
const f = D.figure({ x: -400, at: 0.5 });
f.fig.walk(2, 400, { run: true }); D.follow(2, 5, f);
const ball = D.prop('ball', { x: 600, at: 3 }), globe = D.prop('globe', { x: 600, r: 140 });
D.morph(6, ball, globe);
```

## 16. Not supported yet
- No real photos or footage traced into pencil (by design: draw it).
- Figures have no hands with fingers or faces (by design) and no cloth simulation; long hair and dresses are not drawn.
- Morphs pair lines automatically; very different drawings (40 lines into 4) morph acceptably but not artfully — keep the two drawings of similar complexity.
- Light pools are screen-wide haze: only one or two at once.
