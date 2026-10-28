# Dark cinematic motivational short (暗调励志动画, `lumen`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

One frame: a stylized room drawn in code, and almost all of it black.
- **One motivated light.** A phone screen lighting a face from below, a red alarm clock, a desk lamp's cone, moonlight through blinds, dawn through a window. The light is the picture: it falls off into the dark, throws a giant shadow on the wall, picks out a rim, hangs in the air as haze and dust, and glows (bloom). Grain and a vignette sit on top.
- **One minimal protagonist** who acts everything with eyes and brows: rage, exhaustion, anxiety, emptiness, resolve. The same character every episode.
- **A low second-person voice** speaking to "you", a self-improvement theme. Music presses down, then builds to a release at the end.
- **Slow camera** pushes in and drifts and holds on the face.
- **Few words on screen.** A big bold title card (white with a thick dark stroke, like a thumbnail) at the open and the close.
- **Facts told in light.** A clock racing, a gauge filling, bars, a line of the night, an x-ray of the head lit by the phone.

Runtime: `runtime/lumen.js` (`PROMO.lumen(F, opt)`). New project:
- explainer (narrated; the usual case): `node explainer/scripts/new.mjs <dir> --style lumen`;
- promo (on the beat, no voice): `node scripts/new.mjs <dir> --style lumen`.

Starter pages:
- `styles/lumen/explain.html`: narrated, timed from the narration (cover, one lit shot, the closing card);
- `styles/lumen/index.html`: the same pieces on the beat.

## 0. Safety
- **Our own protagonist, nobody else's.** The format is popular on channels with a signature figure (e.g. a bald round head with thick outlines). Never draw that figure or anything close to it. Never reuse another channel's episode titles, thumbnail words or angles.
  - Ours: a soft square "mochi" head, a messy mop with bangs, **one cowlick that shows the mood**, an oversized hoodie, **no outlines** (the light draws the form).
- **No AI images.** Every set is drawn in code: silhouette furniture, big masses of light and shadow. No painted rooms passed off as anything.
- **Every on-screen word and number is in brief.md**, including gauge labels, chart values and source tags. Story clock times are written there as story, not data.
- **Self-improvement claims stay sourced.** The narration may encourage. It never promises results ("this will fix your sleep") and never gives medical advice. A tip (put the phone outside) is a suggestion, not a study finding, unless brief.md has the study.

## 1. When to use
- **Habits and self-improvement:**
  - sleep and late-night scrolling;
  - procrastination, discipline, focus;
  - starting the gym or studying;
  - burnout, loneliness, "day 1" turning points.
- **One person's inner struggle, told to "you".** The arc is "the trap → what it costs → one small decision → the light".
- **Promos for wellbeing, focus, sleep and habit apps.** The product appears as the decision, not as a feature tour.
- **Less suited:**
  - cheerful products (pop, cutout);
  - dense step-by-step how-tos (launch, whiteboard);
  - stories with several named people (shadow, pixel, manga);
  - anything that needs real UI on screen for long.

## 2. What it is (and isn't)
- **Essence: light in the dark, and a face.** Every shot answers "where is the light coming from?" Every line is carried by what the face does.
- **It is not:**
  - `trailer` (silhouettes, no faces, BRAAMs, fast cuts);
  - `mystery` (deadpan TV mock-science);
  - `manga` (ink pages and panels);
  - `whiteboard` (an explaining hand).
- **Things it never has:**
  - flat evenly lit rooms;
  - outlines on the figure;
  - stickers or bright UI;
  - quick cuts.
- **Don't overdo it.** One light per shot (a second only as a weak fill). One title card at each end. Words on screen sparingly (`--check` counts them).

## 3. Colour
- **The ground is near-black blue.** The ambient is `[16, 18, 27]` by default and raised only for a morning or a fog. Sets are mid-dark albedo colours that the light reveals.
- **Light colours carry the mood:**
  - phone: cool white tinted by what's on the screen; the tint changes as the feed scrolls, and so does the colour on the face;
  - alarm: red;
  - lamp: warm amber;
  - moon through blinds: cold blue;
  - dawn: peach to gold.
  - A film usually moves from cold to warm.
- **The character:** a mustard hoodie (`topColor`), dark pants, warm skin. The hoodie reads in any light. Change `topColor` per series, not per episode.
- **Text:** white. Accent amber `#ffb648` for one word in a title card (`{word}`). Red for a gauge past its warning point.

## 4. Type
- Noto Sans SC 900 for title cards and numbers, 500 / 700 for words and labels (OFL). Oswald 500 for the Latin subtitle under a title (OFL).
- **Title cards** (`L.title`) look like thumbnails: huge heavy white type, a thick dark stroke, a drop shadow, ≤ 8 Chinese characters (`--check` warns). One word may be accent-coloured: `'今晚，{放下它}'`. They come out of a blur while the picture behind dims.
- **Words** (`L.word`): rare, short, white with a soft glow, rising out of a blur. **Labels and numbers** of the information pieces are drawn in light on the canvas and registered for the fact check.
- **Captions**: no box, white with a dark shadow, low in the frame.

## 5. Motion
- **The face acts the line.**
  - `A.face(at, name)` on the word that carries the feeling. Blends take 0.35 s by default; slower (0.8–1.2 s) when a feeling dawns.
  - The cowlick follows the mood: it droops with exhaustion, stands with resolve, frizzes in rage.
  - Blinks are automatic. Breathing never stops.
- **Expressions** (`L.FACES`): neutral, trance (scrolling, glazed), tired, exhausted, empty (hollow stare), anxious, rage, shock, sad, guilty, resolve, calm, hope, smile, asleep, wince. Any of them can be tweaked: `{ ...L.FACES.smile, bags: 0.9 }` is a forced "I'm fine".
- **Poses** (`L.POSES`) blend over 0.7 s:
  - in bed: stand, slouch, phone (held in both hands), lie (on the back from above, phone over the face), ceiling (hands behind the head), curl (rolled onto the side), flat, situp;
  - at a desk: sit, desk (forearms on the desk), slump (head down on the arms);
  - other: reach, stretch, fist, window (from behind), back, shrug, facepalm, run, lift.
- **Acts** (`A.act(a, b, kind)`) are layered on any pose:
  - scroll (the thumb flicks, the feed and its light change, a soft swipe each time);
  - walk (with steps), run, type (keys);
  - nod, shake, tremble (`heart: true` adds a heartbeat), breathe, sigh (with a breath);
  - jolt (a startle, used when the alarm drags you up), yawn, rub (rub the eyes), sob, lift.
- **Moving the body:** `A.move(at, { x, y, rot, s }, dur, ease)` — e.g. lying (`rot: -90`) to sitting (`rot: 0`) is being pulled up. `A.hold(at, 'phone', { glow: false })` turns the screen off: the light dies with it.
- **Light moves too.** `S.expose([[t, 1], [t + 0.8, 0.4]])` dims a shot (the screen going dark is the style's dip). Lamps and doors take `on(t)` / `open(t)`.

## 6. Camera and transitions
- **Slow push-ins and drifts over the whole shot.** `S.cam(from, to)` with `{ x, y, h }`, where h is the visible world height (smaller = closer). Every shot also breathes a little (`sway`).
- **Hold on the face** for the feeling lines; go wide for the room, the window, the walk.
- **Cuts:** hard cuts by default. `fade` crossfades. `dip` comes up from black. `out` goes down to black (the end of a night). The light going out (`S.expose`, `A.hold(..., { glow: false })`) is the most in-world transition.
- **Top-down shots** (the bed from above) are this format's signature. In portrait, turn the camera a quarter (`r: 90`) so the bed runs top to bottom.
- **Portrait** keeps the camera's height and crops the sides: aim the camera at the subject (`L.P(landscape, portrait)` for any value). Overlays size from the short side and lay themselves out (compare stacks vertically, the timeline thins its ticks).

## 7. Sound
- **Music** (`styles/lumen/score.js`) moves in named sections:
  - `night`: a low drone, sparse felt piano, sub;
  - `weight`: the cost: a low string pulse, a heartbeat kick;
  - `still`: almost nothing under the decision;
  - `rise`: strings swell, the piano motif climbs;
  - `dawn`: the release: a major lift, brass pad, high strings.
  - Name `F.section`s with these. Under narration the busy layer drops away by itself.
- **Sound design** (`sound.js`): close, real-room sounds.
  - swipe (scrolling), tick (a clock racing), beep (the alarm), buzz (a phone vibrating on a hard floor);
  - step, key, breath (a sigh), heart;
  - glow (a gauge / chart / x-ray lighting up, glass notes in the key);
  - hit + whoosh (title cards); click, door, rustle, thud.
- **Voice:** low, close, measured, second person ("你"). The default edge-tts voice is `zh-CN-YunjianNeural` at −12 % with `voice_fx: "doc"` (explain.json).
  - A directed voice (e.g. Seed TTS with a performance prompt per line) is better.
  - Keep its pace near 180–220 characters a minute. A slow read can be time-stretched (pitch kept) before tts.py builds the timeline.

## 8. Signature moves
- **The face in the phone's light** from above in bed: the screen reflected as a little rectangle in each pupil, the feed's colour washing over the face.
- **The clock racing:** `L.roll(a, b, '23:30', '01:47')` on `L.prop.alarm` or `L.prop.clock`. Ticks thin out so they never machine-gun; the last digit lands on the spoken time.
- **The giant shadow:** the character's silhouette thrown up the wall by a low light (`shadow: { scale, alpha, dy }`). The cowlick in the shadow is a nice touch.
- **The screen dies:** `A.hold(at, 'phone', { glow: false })` — the light, the face and the room go with it.
- **Dragged up by the alarm:** a red pulsing clock, `jolt`, `move` from lying to sitting.
- **The x-ray:** `L.xray` — the skull outline glows in the phone's light, a point dims as the melatonin is pushed down, labels on leader lines.
- **Out of the door:** walk, reach, the door opens on warm hall light, the phone goes out, the door shuts; then the phone lights up alone outside (`L.prop.phone({ pings })`).
- **Dawn at the window:** seen from behind, rim-lit, the sky warming (`dawn(t)`), the closing title over it.

## 9. Character: the protagonist and the cast
- **One protagonist** ("you") is defined once with `L.cast({ you: { … } })` and called by name in every shot: `S.actor('you', { … })`. The look is fixed:
  - head: a soft squircle;
  - hair: a mop with bangs (`hair: 'mop' | 'short' | 'buzz' | 'bun' | 'long'`, `hairColor`);
  - the cowlick: `tuft: true`;
  - top: `top: 'hoodie'`, `topColor`;
  - also `pants`, `skin`, `build` (width), `height`, `glasses`.
- **A second person** (a coworker, a coach, a friend) gets a cast entry that differs in at least two attributes (hair, top colour, build, glasses). `castCheck` warns otherwise (`styles/CHARACTERS.md`). Two people talking face each other: `turn` ±0.6 in their poses, or `flip`.
- **One actor = one placement in one shot.** Each `S.actor` has its own timeline (`pose / face / look / move / hold / act`, all at global times). A new shot places the character again, in the state the story is in.
- **Actor options:**
  - `x, y` = the pelvis (or `feet` = the floor line), `s` scale, `rot` (−90 = lying with the head to the left), `flip`;
  - `order` (draw order among the set pieces: 50 by default; desks 55; blankets 60);
  - `cut` = a world y below which the body is hidden (behind a desk, a bed's edge);
  - `shadow`, `rim` (0 = no rim).
- **The rig:** a front-view puppet. The pelvis is the root; arms and legs have two segments each; `turn` −1…1 turns the head and body toward profile; `back: 1` shows the back. Form is shaded toward the key light, a rim crescent forms on the side facing the light and fades with distance, catchlights sit in the eyes.

## 10. Sets and lights (`L.prop.*`)
Each prop brings its albedo (lit by the room), its emissive parts (screens, digits, a sky, a bulb) and its lights:
- **Rooms:** `room({ floor, wall, frames })` (front view: wall and floor), `floor()` (planks from above);
- **Furniture:**
  - `bedTop({ x, y, w, h, cover })` (from above; cover 0–1 or a function: the blanket);
  - `bed({ x, floor, w })` (front);
  - `nightstand`, `desk`, `chair`, `shelf`, `plant`, `books`, `dumbbell`;
- **Light sources:**
  - `window({ x, y, w, h, blinds, dawn: 0–1 | fn, dir })`: the sky is its own light and throws a shaft, cut into slats by blinds;
  - `door({ x, floor, open: fn, hall })`: the hall light under the door and through it;
  - `lamp({ on })` (a cone), `ceilingLamp`, `laptop({ on })`;
- **Clocks and phones:**
  - `alarm({ time, ring: [a, b] })` (red 7-segment digits that light the room);
  - `clock({ time })` (analog, luminous hands);
  - `phone({ pings: [t…] })` (a phone lying alone that lights up).

Your own light: `S.light({ kind: 'point' | 'cone' | 'shaft', x, y, r, color, power, haze, dust, flicker, at(t) })`. Your own painter: `S.draw((c, t, S) => …, { order, pass: 'albedo' | 'emit' })`. A held phone lights the face by itself.

## 11. Information in light
A mood film still has to carry facts (`--check` counts information pictures line by line). Tell them in this style's own way, inside the dark, never as generic boxes:
- **Time:** an alarm or a wall clock in the frame tells the story's time (registered as a clock). `L.roll` makes it race between two readings.
- **How much:**
  - `L.meter(a, b, { kind: 'ring' | 'tank' | 'battery', label, from, to, max, unit, dec, warn })`: a gauge drawn in light, e.g. hours awake on a 24-h ring, a tank of nights filling.
  - `L.bars(a, b, { title, items: [{ label, value, unit, hl }] })`: light bars from a hairline.
- **The gap:** `L.timeline(a, b, { from: '22:00', to: '08:00', marks: [{ at, label, hl, t }], gap: { from, to, label } })` — the night as a line of light, the intended and actual times dropping onto it, the gap filling amber.
- **The comparison:** `L.compare(a, b, { left: { icon, value, label }, right: { … }, sign: '≈' })`. Line icons in light: moon, clock, glass, phone, bed, brain, battery, eye, sun. Portrait stacks the two.
- **Inside the body:** `L.xray(a, b, actor, { organ: 'brain' | 'heart', labels: [{ text, at, hl }], dim(t) })`.
- **A number:** `L.stat(a, b, { value, label })` counts up (it counts toward facts, not as a picture).
- **Where it comes from:** `L.cite(a, b, 'Author, year')`, a small tag in the corner, for every study the narration quotes.

## 12. Cover
`L.cover({ a: 0, b: lead_in, title, sub, face, pose, set(S), act(A) })` builds the thumbnail in the lead-in and sets the cover frame (`F.coverAt`): the face in its light on one side and the big title on the other (portrait: the title on top). `out/cover.png` is exported with the render. The cover's face should already tell the episode: empty, exhausted, resolved.

## 13. Pitfalls and self-check
- **Faces lost in the dark.** `--check` measures the face brightness at every expression change and warns under 0.1: bring the light closer, raise the ambient, or use a rim. The face is the film.
- **Shots without a source of light** are flagged. Every shot needs one you can name.
- **Too many words.** More than about one word line per 8 s is flagged: let the face carry it.
- **Information density.** Plan the facts first (brief.md). A film of moods only fails `--check`. Put a clock, a gauge, a timeline or an x-ray on most lines, and leave the pure feeling lines (the turn, the decision) for under 30 %.
- **Portrait.** Check `--stills --aspect 9:16` for every shot kind. The canvas overlays aren't measured by the DOM checks, so look at them: labels must stay inside the frame and not overlap.
- **Props in front of faces** (a laptop, a lamp). Look at the stills of every desk shot.
- **Stiffness.** Never let a pose change without a move or a face change without a reason in the line. Use `--strip` on every action (sitting up, the walk, the reach).
- Self-check per `references/review.md`: `--check` in both aspects, `--stills`, `--strip` for every action, then the render and its frame check.

## 14. Variation
- **Light:** phone-blue nights ↔ lamp-amber study nights ↔ fluorescent office ↔ dawn gold. A different light makes a different episode.
- **Place:** bedroom (above and front), desk, doorway, window. Add the gym or the street with your own painters (`S.draw`) and a light.
- **Character:** `topColor` and hair per series; the second person differs in two attributes.
- **Arc and pace:** a 60 s short (trap → one fact → decision → light) ↔ a 3 min episode (two or three costs, an x-ray, a relapse, the decision). The title-card wording and the closing image change each time.

## 15. API quick reference
```js
const L = PROMO.lumen(F, { grain: 0.2, vignette: 0.7, bloom: 0.55, colors: { accent, warm, cool, red }, fonts, captions });
L.cast({ you: { hair: 'mop', hairColor, top: 'hoodie', topColor, pants, skin, build, height, glasses, tuft } });
const S = L.shot(a, b, { cam: { x, y, h, r }, fade, dip, out, ambient: [r, g, b], bg, fog: 0–1 | fn, ph, sway });
S.cam(from, to, ease); S.keys([[t, { x, y, h, r }], …]); S.add(prop | [props]); S.light({ … }); S.expose(keys | fn); S.draw(fn, { order, pass });
const A = S.actor('you', { x, y | feet, s, rot, flip, pose, face, hold, holdOpts, order, cut, shadow: { scale, alpha, blur, dx, dy }, rim, blink, from, until });
A.pose(at, name | obj, dur, ease); A.face(at, name | obj, dur); A.look(at, x, y, dur); A.move(at, { x, y, feet, rot, s }, dur, ease);
A.hold(at, 'phone' | 'mug' | 'book' | 'dumbbell' | null, { hand: 'L' | 'R' | 'both', screen: 'face' | 'camera', glow, color, power, r }); A.act(a, b, kind, { every, gain, sfx, heart, amount }); A.blink(at);
L.prop.room / floor / bedTop / bed / nightstand / alarm / clock / door / window / desk / lamp / laptop / books / chair / shelf / plant / phone / dumbbell / ceilingLamp
L.roll(a, b, from, to, { ease, sfx });  L.meter / L.bars / L.timeline / L.compare / L.xray / L.stat (a, b, { … })
L.title(a, b, text, { sub, accent, size, y, dim, sfx }); L.word(a, b, text, { x, y, size, font, weight, color }); L.cite(a, b, text);
L.cover({ a, b, title, sub, who, face, pose, hold, x, y, s, cam, set(S), act(A, S), at });
L.P(landscape, portrait); L.toScreen(S, t, x, y); L.overlay(a, b, (c, t) => …, order); L.icons; L.drawFeed;
```

## 16. Not supported yet
- **No quick version** (`--quick` / `kit.js` adapter): hand-written only.
- **The rig is a front-view puppet.** True profile walking, sitting sideways and hands gripping objects are approximations (`turn`, `back`); there are no fingers.
- **Sets are rooms and a few props.** A gym, a street, an office floor are your own painters for now.
- **Light** is 2D: no cast shadows from props (only actors cast shadows), no reflections or bounce light.
- **The phone's screen** shows an anonymous scrolling feed only; no real app's UI.
