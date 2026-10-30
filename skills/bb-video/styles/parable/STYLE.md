# 3D stick-figure parable (3D 火柴人寓言, `parable`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

One frame: a pure black void with a glossy floor. Two thick white stick figures stand in it; each has a round head floating just above the shoulders, rounded limbs, a dark outline and a small monospace caps label above it.
- **Contrast.** The figures do two different things with the same material: one prop set that grows over time (beige 3D bricks, steps, a pile, coins).
- **One red object.** A single red thing carries the meaning: a spirit level, the brick that is still growing, a flag.
- **The floor mirrors everything.** Figures and props reflect in the floor, fading with depth, with soft contact shadows; a faint glow hangs around the white.
- **One fixed wide camera.** No cuts and no camera moves; the film fades out at the end.
- **Told by action, not words.** No narration by default; the music is the narrator.

Runtime: `runtime/parable.js` (`await PROMO.parable(F, opt)`, three.js). New project:
- wordless parable (the usual case): `node scripts/new.mjs <dir> --style parable`;
- narrated or subtitled: `node explainer/scripts/new.mjs <dir> --style parable`.

Starter pages:
- `styles/parable/index.html`: wordless, on the music (two figures, one growing stack, the red symbol, reveal, title, fade);
- `styles/parable/explain.html`: the same stage timed from a narration (captions come from the engine).

## 0. Safety
- **Our own figures and our own stories.** The format is popular on channels with their own signature films. Never reuse another channel's labels, story, watermark or end card. The pictogram figure is generic (round head, thick limbs), so do not add a channel's signature details to it.
- **A parable argues one point; keep it honest.** Numbers shown on screen are computed, not eyeballed. Examples: a growth curve, a count, "1.01³⁶⁵ ≈ 37.8". Write the computation in brief.md. Story numbers (how many bricks the other figure lays) are labelled as illustrative under Copy.
- **No claims dressed as facts.** A parable is an illustration, not evidence ("this is what compounding looks like", not "you will earn 37×"). No financial, medical or legal advice.
- **No look-alikes of real people.** The figures are anonymous roles told apart by their label, never a named person.

## 1. When to use
- **One idea, shown as a contrast between two ways of doing something:**
  - perfectionism vs action;
  - a burst vs a steady habit (compounding, practice, saving);
  - copying vs creating, waiting vs starting;
  - talking vs building, many projects vs one finished.
- **15–45 s shorts** for social feeds, vertical first. Habits, productivity, learning, money, creativity, teamwork.
- **Promos with one point.** A product shown as "the way that works" (the one figure who builds with it), never as a feature tour.
- **Less suited:**
  - dense explanations with many steps (whiteboard, isometric);
  - stories with several named people (shadow, pixel, manga);
  - real UI on screen (launch, toy3d);
  - anything longer than about a minute without narration.

## 2. What it is (and isn't)
- **Essence: the same world, two behaviours, one visible consequence.** Every beat answers "what is each figure doing now, and what does it lead to?"
- **It is not:**
  - `lumen` (one lit protagonist with a face, a voice speaking to "you");
  - `toy3d` / `isometric` (product toys, worlds seen from above, moving cameras);
  - `grain` (flat illustrated figures on paper).
- **Things it never has:**
  - faces or expressions (the head is a plain ball: gaze is the head's tilt, mood is the posture);
  - cuts, camera moves, backgrounds or set dressing;
  - more than one red thing;
  - a third prop set.
- **Don't overdo it.**
  - Two figures. A third only as a passer-by.
  - One prop set and one red symbol.
  - Words only for the labels, a counter if time matters, and one closing line.

## 3. Colour
- **Palettes** (`opt.palette`):
  - `void` (default): pure black;
  - `night`: a blue-black void;
  - `gallery`: a light grey floor with a dark outline, for a light film. Use it sparingly: the black void is the look.
- **White figures, near-flat.** The figure is lit almost evenly; the shading is a hint, the outline does the drawing.
- **Props in one quiet material:**
  - bricks in two clay tones (`brick`, `brick2`);
  - steps and blocks in `block`;
  - coins in `coin`.
- **Red (`accent`, `#E3262B`) is the meaning.** Exactly one red object per film:
  - `P.item(kind, { accent: true })`;
  - or a stack's `ghostColor` / `ghostFill`: the thing still growing.
  The check warns when more than one thing is red.
- **The reflection** is the scene again under the floor, darkened by `reflect` (default 0.3), fading over `fall` metres (0.5). Raise it for a wetter floor; never above 0.5, or the void stops reading as black.

## 4. Type
- **Labels:** Space Mono 700, caps, letter-spaced `.2em`, white, small. Chinese labels use Noto Sans SC through the same stack.
  - A label is a role, not a name: 一口气 / 每天 +1%, ALL AT ONCE / ONE A DAY, 量 / 做. Keep it to 2–6 characters or 1–2 words.
  - `follow: true` keeps the label over its figure's support when the figure climbs; otherwise it stays where the figure started (the reference look).
- **Tags** (`P.tag`): a smaller mono line under a label or over a stack, e.g. a live count ("37.78 块"). A tag may be a function of t; register the values it can show as `facts`.
- **Counter** (`P.counter`): one mono line at the top (第 n 天, YEAR 3, ×12). It ticks softly every `tick` units.
- **Title** (`P.title`): one closing line in Noto Sans SC 900, high in the void, with an optional mono sub line (a formula, a short moral). It rises and fades in, never pops. End the counter before the title appears: they share the top.
- **Captions** (`P.caption`): silent subtitles or a moral, low in the frame. For a narrated film the engine draws the captions.

## 5. Motion
- **Everything moves on the rig.** One procedural figure, posed by named poses and actions that cross-fade part by part:
  - the hips lead, the torso follows (+0.05 s), then the arms (+0.09 s), then the head (+0.13 s): this is overlapping action;
  - hips and torso dip the other way first and settle a little past the target: anticipation and follow-through. `antic` and `overlap` scale both; don't set them to 0.
- **Alive while still.** Figures breathe and sway slowly (`idle`). Breathing never counts as action in the checks.
- **Hands do the work:**
  - `a.lay(stack)`: the hands bring each brick to its slot exactly at the stack's own times, from just behind the slot (out of sight once the stack is above the hip). They alternate so the arms never cross the body. With `stance: 'behind'` the figure works from behind the stack facing the camera and rises with it, its feet hidden (as in the reference);
  - `a.inspect(at, until, { on, tool })`: both hands on a tool, sliding, lifting, setting it down again, the head peering in. Over and over, never twice the same;
  - `a.tend(at, until, { on })`: patting something that grows on its own.
- **Growth is the clock.** A stack's slots appear at `times`, or when `count(t)` passes each whole number (a function, so it can be honest maths). With `ghost: true` the slot being earned shows as a see-through brick filling up.
- **Pace contrast is the point.** A frenzy (bricks every 0.15 s) next to calm work (one every 2 s) reads instantly. Keep a fast hand under ~14 m/s; `--check` warns above that.
- **Timing:** 0.35–0.6 s for pose changes, 1.8 s for a climb, about 1 s to sit or lie down. A move with a big turn is slowed automatically.

## 6. Camera and transitions
- **One fixed wide shot.** The camera frames `opt.box` (x0, x1, y0, y1 in metres, including the reflection below the floor and room for labels above) for each aspect. Override per aspect with `boxPortrait` / `boxLandscape`. `elevation` (default 7°) and `fov` (24°) give the reference's near-orthographic look.
- **Vertical first.** Portrait fits the width: figures sit in the middle band with black above. Landscape fits the height: wide black sides.
- **No transitions.** The film fades up from black (`fadeIn`, 0.5 s) and fades out (`P.fade(at, dur)`). Time passing is shown by the counter and by the props growing, never by a cut.

## 7. Sound
- **The music is the narrator** (`styles/parable/score.js`): a small clockwork with plucks in eighths, a woodblock tick, a sub and a pad. Sections follow the beats by name: `setup` → `divergence` (energy rising) → `reveal` (`hit`, a 0.3 s `gap` before it) → `hold`. Mark the turn with `F.musicCue(t, 'hit')`, e.g. the moment one stack passes the other.
- **The effects are the props** (`styles/parable/sound.js`):
  - a dry clay clack for every brick (fast runs get one per two bricks);
  - soft taps while inspecting or tending;
  - steps, a cushioned thud to sit or lie down;
  - a tick for the counter;
  - a glass bell on the title.
- **The reference** mixes dense percussive ticks synced to the brick placements with tonal plucks and a low bass, about −17.5 LUFS, with no voice. The render normalises to the engine's targets.

## 8. Signature moves
- **The divergence:** the same first second for both, then one starts and one doesn't (or one rushes and one paces).
- **Rising on your work:** the builder works from behind the wall and rises with it, then climbs on top and sits, legs dangling over the edge.
- **The counter running:** days spin at a constant rate while the stacks grow. If one speeds up, that is the curve itself, not the clock.
- **The growing ghost:** the red, see-through brick filling up is the part already earned (interest, practice, savings).
- **The look across:** at the reveal one figure turns its head up to the other (`a.look(at, b)`), then goes back to what it was doing, or drops its head.
- **The nap:** the one who stopped lies down on what they built and sleeps through the time-lapse.

## 9. Figures and props
- **The figure** (`P.figure(name, { x, z, face, label, labelOpt, scale, idle })`):
  - a 1.8 m pictogram: head r 0.2, limbs r 0.086, a dark outline;
  - `face`: `'right' | 'left' | 'camera' | 'back'`, or radians;
  - figures are anonymous roles; tell them apart by label and place (`styles/CHARACTERS.md`).
- **Poses:** `stand`, `crouch`, `kneel`, `kneel2` (on both knees), `sitFloor`, `sitEdge`, `lie`, `slump`, `cheer`, `think`, `cross` (arms crossed), `point`, `wipe` (the brow), `shrug`. A pose may also be an object of fields: `hf, hu, lean, tilt, twist, nod, hL, hR, fL, fR` (hands and feet in the figure's frame: forward, up, right, in metres).
- **Body actions** (one at a time, in time order): `pose`, `walk(at, x | { x, z }, { speed, face })`, `turn`, `climb(at, stack)`, `sit(at, stack, { swing })` (swing: legs swinging over the edge), `lie(at, { on, face })`, `fall`, `jump(at, { x, z, base })`, `celebrate(at, until)`, `lay(stack, …)`.
- **Upper-body actions** (layered over the body): `look(at, target | 'up' | 'down' | 'camera', { until })`, `gesture(at, pose, { until })`, `inspect`, `tend`, `free(at)`.
- **Stacks:**
  - `P.wall({ x, z, cols, rows, brick: [w, h, d], bond: 'running' | 'stack', order: 'centre' | 'left' })`;
  - `P.steps({ n, w, h, d, dir })`, `P.pile({ n })`, `P.coins({ n, per })`;
  - the generic `P.stack({ slots })`;
  - all take `times` or `count(t)`, plus `ghost`, `ghostColor`, `ghostFill`;
  - API: `S.top(t)`, `S.countAt(t)`, `S.slot(i)`.
- **Items:** `P.item('level' | 'brick' | 'coin' | 'box' | 'flag' | Object3D, { accent, at })`, then `it.at(t, [x, y, z])` or `it.hold(fig, a, b, { hand: 'R' | 'L' | 'both' })`.

## 10. Writing a parable
- **One contrast.** Two figures, one material, opposite behaviours. If it needs a third idea, it's two films.
- **One red symbol.** Decide what the red thing *means* (the perfectionist's level, the interest) and give it to exactly one figure or one stack.
- **Beats** (15–45 s; the sample is 30 s):
  1. **setup**, 1–2 s: both figures, labels, the material. Same start.
  2. **divergence**, most of the film: they do different things. Show time passing (counter, growth). Keep both busy; the one who stops still acts (wipes the brow, sits, lies down).
  3. **reveal**, 2–4 s: the consequence becomes visible (taller, finished, gone). One figure looks at the other.
  4. **hold**, 2–4 s: the image the viewer keeps, with at most one line on screen (a title, a formula). Then fade.
- **Keep numbers honest:** compute them in the page (`count: (t) => Math.pow(1.01, day(t))`) and copy the arithmetic into brief.md. If the curve speeds up, the clock must not.
- **Words:** labels, one counter, one closing line. `--check` warns when titles and captions go past about 36 characters or 24 words.

## 11. Cover
`P.cover(t)`: pick the hold, after the reveal, when the title is up and both figures show the contrast (one high, one low). That is out/cover.png.

## 12. Pitfalls and self-check
- **`--check` measures the rig** (the canvas is invisible to the DOM motion sheet):
  - joints that snap (one frame moving far more than the frames around it);
  - moves faster than 14 m/s;
  - hard starts (still to full speed in one frame);
  - figures frozen without even breathing;
  - joints in the floor;
  - figures standing in the air (feet hidden behind a stack, and figures mid-climb / sit / lie, are not judged);
  - loops that repeat exactly;
  - lockstep moves (`overlap: 0`);
  - labels cut by the frame or sitting on a head;
  - the parable's shape: more than one red thing, shorter than 14 s or longer than 47 s, too many words.
- **Gap checks in a wordless film:** spans where a figure visibly acts (a joint at ≥ 0.28 m/s) count as action (`F.live`). Breathing alone does not, so a figure that only stands there is still flagged as dead air, as in any film. The fix is a small action (a look, a wipe of the brow, a tap), not narration.
- **Hands crossing the body or reaching past the shoulder** make the elbow swing. Keep slots within reach; `lay` handles its own reach.
- **A look-at between two figures** aims at the other's body pose, so two figures can look at each other.
- **Sound density:** promo rules warn above 1.5 effects per second. A brick frenzy is meant to be dense, but keep the taps sparse elsewhere.
- **Look at portrait stills** for label / counter / title collisions, and at the reflection: it must stay darker than the figures.

## 13. Variation
- **Material:** bricks, steps (climbing a habit), coins (saving), a pile (hoarding vs building). Change the red symbol with it.
- **Palette:** `void` / `night` / `gallery`.
- **Staging:** side by side facing the camera; both in profile facing each other; one walking off at the end; a third figure passing through.
- **Pacing:** a long divergence with a short reveal (compounding), or quick back-and-forth contrasts (perfectionist vs action taker).

## 14. API quick reference
```js
const P = await PROMO.parable(F, { palette: 'void', accent, reflect: 0.3, fall: 0.5, bloom: { strength, radius, threshold } | false, box: { x0, x1, y0, y1 }, boxPortrait, boxLandscape, elevation: 7, fov: 24, fadeIn: 0.5 });
const a = P.figure('a', { x: -1, z: -0.44, face: 'camera', label: '一口气', labelOpt: { follow: true, y: 2.05 } });
const w = P.wall({ x: -1, z: 0, cols: 3, rows: 10, times: [/* seconds */] });          // or count: (t) => n, ghost: true, ghostColor: 'accent'
a.lay(w, { stance: 'behind', carryTime: 0.3, tend: 'last' });                          // hands bring each brick on time
const end = a.climb(7.4, w); a.sit(end + 0.2, w); a.lie(end + 2.6, { on: w });
a.look(9, b, { until: 10 }); a.gesture(26, 'wipe', { until: 27 });
const lvl = P.item('level', { accent: true, at: [-0.7, 0.03, 0.3] }); a.pose(1.4, 'kneel'); a.inspect(2.2, 14, { on: [-0.6, 0, 0.3], tool: lvl });
P.tag(a.label, { text: (t) => `${w.countAt(t)} 块`, facts: ['30 块'] });
P.counter({ at: 0.6, until: 25, value: (t) => day(t), fmt: (n) => `第 ${n} 天`, facts: ['第 365 天'], tick: 60 });
P.title('复利', 25, 29.4, { sub: '1.01<sup>365</sup> ≈ 37.8', subText: '1.01³⁶⁵ ≈ 37.8' });
P.fade(28.4, 1.5); P.cover(26.4); P.run();
```

## 15. Not supported yet
- **No quick mode (`--quick`)** and no kit.js adapter: hand-written only, like lumen and trailer.
- **No faces or fingers.** Gaze is the head's tilt toward a target.
- **Walking is on flat ground** (no stairs walk cycle). Climbing is one move onto a stack's top.
- **One camera.** No push-ins or cuts, by design.
- **Props do not physically interact.** Bricks land in slots and nothing topples. `fall` is a figure's fall, not physics.
- **The reflection is a mirrored redraw, not ray-traced:** it is sharp, not blurred by roughness.
