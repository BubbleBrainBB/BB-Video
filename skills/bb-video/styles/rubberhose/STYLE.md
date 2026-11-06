# 1930s black-and-white rubber-hose cartoon (黑白橡皮管卡通, `rubberhose`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

One frame: grey watercolour washes and pen work (brick walls, floorboards raked in perspective, gears, arched windows) behind inked characters in black, white and five greys. It looks like a worn print of an early-sound American short: heavy grain, a lamp that flickers, dust and hairs, a scratch running down the reel, a splice bump on every cut, a rounded Academy gate.
- **Black and white only.** Ink `#0f0e0c`, paper `#f3f0e6` and the greys `G1`–`G5`. No colour anywhere in the drawing; the projector pass is greyscale. The one exception is the product's own screenshot (§10).
- **Everything is alive.** Objects get white gloves, pie-cut eyes, rubber-hose limbs with no elbows and big shoes, and they act: clocks, tools, the thing the video is about.
- **Everything bounces on the beat.** The whole cast moves to the band: hips sway, pendulums swing, hats hop on the downbeat. Pick the tempo first and key motion to it.
- **On twos, and the line boils.** 15 drawings a second at 30 fps; every ink line shifts a little from drawing to drawing (seeded, so the same frame always renders the same).
- **Gags, one after another.** A short of this kind runs gag to gag: a thing comes alive, does something impossible, time goes wrong, and the band stops dead.

The technique is the craft of early-sound American shorts. We learn the craft only: never a studio's characters, gags, cues, titles or end cards. `styles/rubberhose/clock-film.html` is a whole 2:15 short made with this runtime (a clock factory comes alive at midnight): read it to see how a film like this is built, don't reuse its story.

Runtime: `runtime/rubberhose.js` (`PROMO.rubberhose(F, opt)`, canvas 2D, no libraries). New project:
- narrated explainer: `node explainer/scripts/new.mjs <dir> --style rubberhose`;
- promo on the beat: `node scripts/new.mjs <dir> --style rubberhose` (add `--quick` for the quick version through the kit).

Starter pages: `styles/rubberhose/explain.html` (narrated) and `styles/rubberhose/index.html` (on the beat). Narrated films set `compose({ chapters: false })`.

## 0. Safety
- **No studio's characters or marks.** No mouse with round ears and shorts, no black cat, no rabbit, no flapper girl with a spit curl, no steamboat whistling, no recognisable design from any real cartoon; no studio logo, title card or sign-off, no real cue or quoted melody. Invent the cast. The clocks and the janitor here are our own; a new film should usually invent its own objects too.
- **None of the period's prejudice.** Cartoons of this era are full of racist caricature (blackface and minstrel faces, "pie-cut eyes and big white lips" on people), ethnic stereotypes and cruel gags. Never imitate any of it, however "authentic". Pie-cut eyes and white gloves go on objects and invented creatures, never as a caricature of real people.
- **No likeness of a real person.** A biography in this style uses an invented stand-in. Cartoon violence on a real person, a real group or a real tragedy is out.
- **No slapstick on real harm.** Accidents, illness, death and disaster are told plainly or in another style (`pencil`, `newsreel`, `mystery`).

## 1. When to use
- **Anything mechanical, rhythmic or about time**: clocks, schedules, routines, factories, processes, music, habits, "what happens every day at midnight".
- **Objects that come alive** to explain themselves: a tool, an appliance, a body part, a product.
- **Light history, trivia and nostalgia**: the 1920s–30s, early sound film, jazz, "the way it used to be".
- **Promos** for playful products, games, music, productivity and timing tools, retro-styled brands: "your things, alive and dancing in time".
- **Less suited:**
  - real UI walkthroughs (`launch`, `toy3d`; only `S.shot` frames a screenshot here);
  - dense numbers and comparisons (`swiss`, `collage`);
  - anything that needs colour to be understood (maps, charts by colour, brand colour as the hero: try `goldenage`, its full-colour descendant);
  - serious, sad or sensitive subjects (§0).

## 2. What it is (and isn't)
- **It is an early-sound cartoon short:** grey washes, an inked cast that bounces to a hot band, gags that break physics, a print that has been run through a projector a thousand times.
- **Not `goldenage`:** no colour, no painted night city, no Art Deco; this is ten years older, all rubber and rhythm, everything on the beat.
- **Not `pencil`:** inked and painted, no construction lines.
- **Not `newsreel`:** a cartoon, not documentary footage; nothing photographic.
- **Not a filter:** every line is a real filled brush stroke; never trace or filter a photo or a frame of a real cartoon. Black-and-white is how it is drawn, not a grayscale pass over a colour film.

## 3. Colour
Black, white and grey, nothing else:
- `INK #0f0e0c`, `PAPER #f3f0e6`, greys `G1 #d6d3c9`, `G2 #a8a59c`, `G3 #7a776f`, `G4 #4c4a44`, `G5 #2a2824`. On canvas, `tv(v, a)` gives a warm grey of value `v` (0 black … 1 white) for washes.
- Characters: black bodies, white faces and gloves, one or two greys for the inner panels. Read them by value: a black shape against a mid-grey wall, a white face inside it.
- Backgrounds sit in the middle greys (`.3`–`.65`), so black and white both read on them. Light is a pale shaft or a soft glow; shadow is a darker wash.
- A brand colour is not used: `brand` in the kit changes nothing. The brand shows in its real screenshot, its name and its logo-free lettering.

## 4. Type
- Lettering is **Luckiest Guy** (Latin) and **ZCOOL KuaiLe** (Chinese), white with an ink edge and a hard ink offset (`G.write`); `color: G.colors.ink` gives ink letters edged in white. DOM text, so the checks see it, and it stays crisp over the grain.
- `pop: true` brings it in letter by letter, each hopping in with a squash and stretch; `bounce: 2` keeps the letters hopping to the beat (`G.title` does both).
- Sizes (logical units, 720 = frame short side): titles 96–170, key words 60–90, labels 26–44. Nothing under 26.
- For Latin title lettering drawn into the picture, `text(s, x, y, size, { layers, fn })` draws hand-cut stroked letters on the canvas (A–Z, 0–9 only); `fn(i) → [dx, dy, scale, rot]` lets each letter hop. The title of `clock-film.html` is drawn this way.
- Few words: the picture carries the gag; nothing on screen repeats what the voice just said.

## 5. Motion
- **On the beat.** Derive a beat counter from the film's tempo (`b = (t - F.beat(0)) / (F.beat(1) - F.beat(0))`) and drive everything from `sin(b * PI)`: hops `-abs(sin(b * PI)) * h`, sways `sin(b * PI / 2)`, a squash on each downbeat `1 - 0.06 * pulse(b)`. Different characters take different phases (`b + c.ph`) so a crowd ripples.
- **Rubber limbs.** Arms and legs are bowed hoses aimed at a target (`al: [x, y, bend, glove]`, `legs`), never rigid sticks rotating from a joint. A big reach bows more.
- **Squash and stretch.** `sq` and `sx` on every character: squash on landing, stretch on take-off, keep the volume (`sx ≈ 1 / sq`).
- **Anticipation → action → recovery**, an overshoot and a settle (`eBack`, `eEl`, `hit(t, t0, lo)`, the spring `E(dt, f, d)`).
- **The take.** Eyes `eo` past 1, brows up, hair standing (`hair`), the cap flying (`cap`), a dizzy ring of stars (`dizzy`).
- **Time going wrong** is this style's own gag: hands spinning (`bladeBlur`), a pendulum swinging backwards, a splash freezing in mid-air and running back.
- **Holds.** `G.pause(a, b, { energy, name, hit, stop })`: the line boil stops and the band stops dead (`stop: true` winds it down like tape first), then a new section starts at `b`. Sound effects still play: one tick in the silence is a laugh. At least one in a film over 20 s.
- **Keys** with `K(u, [[t, value | {…}, ease], …])` and hard switches; `lerpv` blends whole poses. On twos: a pose held for four drawings then a snap reads better than a slow ease.
- Text and cards step on twos too: one clock for everything.

## 6. Camera and transitions
- `camPush(x, y, zoom, rot, shakeX, shakeY)` … `pop()` wraps the cast in a shot. A plate is drawn first with `bgAt(name, x, y, zoom, …)`, which returns the framing it really used: `const v = bgAt('wall', 480, 360, 1); camPush(...v); … pop();` keeps the cast on the plate.
- A plate always covers the frame (it zooms or slides in just enough). `cover: false` draws plates exactly where asked, edges and all, as the reference film does in its 4:3 gate.
- Stage it like these shorts: mostly a locked-off stage, characters entering and leaving; then a sudden close-up for the take, an overhead kaleidoscope for the big number, a tall tilt up a tower.
- **Cuts** are the default transition: `G.shot` cuts at its start, and the projector adds a splice bump (one brighter frame) on each cut.
- **Iris** (`G.iris(at, { out: true, x, y })`, then `{ out: false }`): closing in on the subject to end a section; opening on the next one. The way into and out of the whole film.

## 7. Sound
- Music (`styles/rubberhose/score.js`): a hot two-beat band through an optical track (`lowpass: 4200`): tuba on one and three, banjo chop on two and four, a woodblock going tick-tock, clarinet on the tune (a muted trumpet when it's hot), xylophone up high. Write your own tune; never quote a real cue.
- Effects (`styles/rubberhose/sound.js`), all synthesised in that file: `tick` and `tock`, `chime` (a big clock striking), `ring` (an alarm bell, `dur`), `cuckoo`, `ratchet` (`dur` = a run of clicks: winding), `rattle` (`dur`), `boing`, `whack`, `slide` (`dir: 1 | -1`, `dur`: a slide whistle that follows the action), `pop`, `crash`, `boom`, `block`. `G.bonk(at, gain)` is a whack with its boing.
- Every action gets its noise on the same frame. Mark key hits `keep: true` under a voice.
- The biggest sound is the band stopping. `--check` will warn "no sound on a phone" in a deliberate silence; that warning is fine there.

## 8. Signature moves (pick per film)
- **It comes alive.** A dead object; a shiver; the eyes pop open (`a` from 0 to 1 grows the face and limbs in with an overshoot); the grin.
- **Everything dances.** A wide shot of the whole cast bouncing on the beat in ripples; then a row, a line, a kaleidoscope from above.
- **Time breaks.** Hands spin into a blur, the numbers jump off the dial and walk away, the cuckoo comes out backwards, a splash freezes and runs back.
- **The band stops dead.** Mid-number, someone pulls the plug: the music winds down, everyone freezes in mid-pose, silence. Then one tick.
- **The look to camera.** The last beat: the cast all turn and stare at us. Iris out.
- **The squash and boom.** An alarm clock swells and explodes; the pieces fall like rain; it reassembles itself, sheepish.

## 9. Characters and the cast
- **Clocks**, each `(x, y, scale, state, id)`, standing on the ground at `y` except the wall clock and cuckoo (centred where they hang):
  - shared state: `a` alive 0–1 (the face and limbs grow in), `h`, `m` hand angles, `hb`, `mb` hand bends, `lean`, `sq`, `sx`, `hop`, `jx`, `jy`, `pend` (pendulum angle); face `eo`, `eo2`, `lx`, `ly` (pupils), `ey`, `brow`, `mo` (mouth open), `mw`, `sm` (smile), `teeth`; arms `al`, `ar` = `[x, y, bend, glove kind, wrist]` (glove 0 open, 1 fist, 2 point, 3 grip);
  - `wallClock`: `legs: [lx, ly, rx, ry]`, `num: 't' | 'r' | 'n'` (ticks, Roman, numbers), `mirror`, `skip`, `blur` (spinning hands); `grandfather`: `lift`, `kL`, `kR` (high kicks), `hip`, `bend`, `hood`; `cuckoo`: `bird` 0–1 out of the door, `bda`, `bl`, `bs`, `bo` (beak), `sw` (weights); `alarm`: `inf` (swelling), `ring` (bells shaking), `legL`, `legR`; `pocket`: `fL`, `fR`; `wristwatch`: `sec`; `machine`: `piston`, `g`, `puff`; `master` (the big showman clock): `bend`, `wave`, `bell`, `baton`, `key`, `bcock`, `pop: [numeral, amount]`; `numeral(x, y, ch, s, { leg, lean, eo, mo })` a walking number.
- **Janitor** `janitor(x, y, s, jp({ …pose }), face, id)`: an invented night janitor with a cap, a moustache and dungarees; `s = 1` is about 110 logical units tall, ground at `y`, `face` 1 / -1. Pose fields: `lean`, `sq`, `sx`, `bx`, `by` (hips); head `hx`, `hy`, `tilt`, `turn`, `eo`, `lx`, `ly`, `brow`, `mo`, `smile`, `ton` (tongue), `hair` (standing on end), `cap`, `capr` (cap flying off); arms `lax lay lab lhk` / `rax ray rab rhk`; legs `llx lly llb lla` / `rlx rly rlb rla`; `acc` (squashed into an accordion). Props `mopTool`, `bucket`, `waterBlob`.
- **Keep proportions in every shot**: a close-up is the same drawing bigger.
- A new character: build it from `S`, `F`, `L`, `hose`/`hoseS` limbs, `glove`, `shoe`, `eye` (pie-cut pupils), `mouth`, `faceFeat(r, state)` for any round face. Black body, white face, white gloves.
- Story rules for named characters: `styles/CHARACTERS.md`.

## 10. Sets and props
- **Plates** `bgAt(name, …)`, painted once when first used: `stage` (a vaudeville stage: swagged curtains, footlights, a pale backdrop with a soft spot; for titles, words and end cards), `factory` (a wide clock-factory floor with shelves of clocks and gears), `hall` (the foot of the master clock), `wall` (a brick wall with a skirting and floorboards: the default set for a row of characters), `floor` (floorboards close up), `run` (a 1600-wide panorama that repeats, for a side scroll), `tower` (floor to rafters, 2000 tall, for a tilt), `platform` (a catwalk up high).
- **Live backgrounds:** `rays(cx, cy, u, { n, spin, ring })` the sunburst behind a title card (the wedges tick round a notch at a time); `spotlights(cx, cy, b)` sweeping beams for the big number.
- **Props and effects:** `gear`, `musicNote`, `star`, `burst`, `impactStar`, `hitLines`, `puff`, `sweat`, `speed`, `coil` (a spring), `dizzy`, `ringWaves` (sound waves), `shadow` (an ellipse under anything on the ground).
- **Paint your own plate** for a place that isn't here: the paint functions are in `G.lib` (`washRect`, `mottle`, `brush`, `fillPoly`, `clipPoly`, `bricks`, `floorboards`, `moonWindow`, `shaft`, `miniClockShelf`); paint on a canvas once and draw it each drawing, as `runtime/rubberhose.js` does for its plates.
- **Screenshots** (`S.shot` in the kit) stay unaltered, in an inked frame: the product's real colour is the only colour on screen, which makes it the hero. Don't grey them out.

## 11. Telling information
Never generic boxes and arrows:
- **Steps** → `G.steps({ items: [{ text, note, hot }], T, until })`: white show cards bouncing in along a line, the hot one inverted (ink with white letters).
- **Contrast** → `G.versus({ cols: [{ title, points, hot }], T, until })`: two cards, the winner inverted. Better still, act it out.
- **Numbers** → `G.columns({ items: [[label, value]], ats, until, hot, unit })`: rubber pillars springing up to their values with an alarm clock riding each one up, ringing.
- **One card** → `G.card({ x, y, w, title, lines, at, until, hot })`.
- **The best form is a gag:** a schedule as clocks marching in line, a deadline as the alarm swelling until it bursts, "faster" as the hands spinning into a blur.
- Kit (quick version and quick explainers): flow = bouncing show cards, compare = two cards with the winner inverted, chart = rubber pillars with alarm clocks on top, annotate = a lens with an ink-and-white ring, montage = grey cells cut on whacks.

## 12. Cover
`F.coverAt(t)` on the widest, busiest beat (the whole cast dancing), or on the take (eyes out on stalks, hair on end). Not on an iris or a black frame.

## 13. Pitfalls and self-check
- **Colour creeping in.** No colour except a real screenshot. A grey that reads as "blue" or "brown" in a still is wrong: use the greys.
- **Off the beat.** A cast that bounces at its own rate looks broken. Every bounce, hop and sway from the same beat counter.
- **Everything drifting.** Constant slow motion is web animation. Hold, then snap; `--check` reports the canvas as motion, so look with your own eyes: `--strip a,b`.
- **Stiff limbs.** Arms rotating from a shoulder like a robot: use bowed hoses aimed at a target.
- **Muddy values.** A black character on a dark grey wall disappears. Keep backgrounds in the middle greys; put a shadow under every foot (`shadow`).
- **Cast not on the plate.** Draw the cast inside the `camPush` built from what `bgAt` returned.
- **Lettering in the way.** Words on the action, or under the caption band (88 % of frame height).
- Look at stills: is the ink line alive in a held frame (two consecutive stills)? Is the grain, flicker and dust there? Does anything look coloured?

## 14. Variation
- Tempo and feel: a lazy 100 bpm two-step, a 132 bpm stomp, a 180 bpm finale.
- Gate: fill the frame, or `academy: true` for a 4:3 picture pillarboxed in black. `film: false` removes the projector, `gate: false` the rounded corners.
- Pace: `drawings: 15` (default on 30 fps), `10` for a choppier, older feel.
- Cast: other objects come alive (a teapot, a typewriter, a phone): build them from the same ink kit, with gloves, pie-cut eyes and hose limbs.
- Sets: the stage for showbiz, the factory for anything made, the brick wall for a row of characters; paint a kitchen, a street or a barn with the same washes.

## 15. API quick reference
```js
const G = PROMO.rubberhose(F, { seed, boil: 1, drawings: 15, film: true, gate: true, academy: false, cover: true, colors, fonts, captions });
const W = G.W, H = G.H, L = G.L;   // logical page: short side 720
const { camPush, pop, bgAt, rays, spotlights, wallClock, alarm, cuckoo, grandfather, pocket, wristwatch, machine, master, numeral, janitor, jp, mopTool, bucket, shadow,
        K, E, hit, dec, pulse, shake, seg, sm, eIn, eOut, eBack, eEl, bump, lerp, lerpv, hitLines, impactStar, musicNote, star, dizzy, gear,
        S, F: fill, L: line, hose, hoseS, glove, shoe, eye, mouth, faceFeat, spl, pEll, pRR, pQuad, pLine, seed, push, tr, rot, scl, warp, text } = G.lib;   // the film's F stays yours: rename the pen's on the way out
G.shot(a, b, (u, t) => { const v = bgAt('wall', 480, 360, 1); camPush(...v); /* … back to front … */ pop(); }, { cut: true });
G.pause(a, b, { energy, name, hit, stop });   G.still(a, b);   G.iris(at, { out, dur, x, y });   G.top(fn, a, b);   G.bonk(at, gain);
G.write(text, { x, y, size, at, until, color, edge, pop, bounce, every, wrap, align, tilt, sag, kind, noFact });   G.title([{ text, x, y, size, color }], { at, gap });
G.card({ x, y, w, h, title, lines, at, until, hot, tilt });   G.steps({ items, T, until, x, y, w });   G.versus({ cols, T, until });   G.columns({ items, ats, until, hot, unit, x, y, w, h });
```
Minimal: a clock dancing on the beat, then an alarm clock jumping on a hit.
```js
const beat = (t) => (t - F.beat(0)) / (F.beat(1) - F.beat(0)), hitAt = 3;
G.bonk(hitAt); F.sfx(hitAt - 0.05, 'ring', 0.6, { dur: 0.5 });
G.shot(0, 6, (u, t) => {
  const v = bgAt('wall', 480, 360, 1); camPush(...v);
  const f = Math.sin(beat(t) * Math.PI);
  wallClock(300, 500 - Math.abs(f) * 10, 1.2, { a: 1, lean: f * 0.1, pend: f * 0.8, mo: 0.5, sm: 1, lx: f, al: [-74, 6 - f * 36, -14 * f, 0], ar: [74, 6 + f * 36, 14 * f, 0], legs: [-30, 96, 30, 96] }, 1);
  const up = t > hitAt ? 4 * seg(t, hitAt, hitAt + 0.9) * (1 - seg(t, hitAt, hitAt + 0.9)) * 200 : 0;
  shadow(640, 624, 34); alarm(640, 622 - up, 1.5, { a: 1, ring: t > hitAt ? 1 : 0, mo: t > hitAt ? 0.9 : 0.3, brow: t > hitAt ? 1.2 : 0.4 }, 2);
  pop();
});
```

## 16. Not supported yet
- Colour: there is none, by design. A colour version is `goldenage`.
- No lip-sync: mouths are drawn by hand from `mo`, `mw`, `sm`; characters don't speak on screen. Let a voice narrate.
- One cast: clocks, numerals and a janitor. Other living objects are drawn from the ink kit by hand.
- Canvas actions are not measured by `--check`'s motion sheet (only DOM text is); look at strips.
- The music is the style's band at one tempo per film: tempo changes inside a film (the reference film's original 120 → 150 → 180) need sections written by hand.
- Plates are painted when first used: the first frame of a new plate costs a moment (rendering is unaffected).
