# Style: op art (`op`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`, `templates/…`) are relative to the `promo/` folder of bubble-video-skill.

> Black-and-white stripes, concentric rings, checkerboards and spirals fill the frame, bulging, squeezing and bending around "lenses" — the picture is flat, yet the eye feels it moving. The product is the thing that bulges out of the pattern: a card pushes the stripes apart, a button makes the rings circle around it, a transition is the stripes thickening until they swallow the frame.
> Reference (grammar only): 1960s op art (black-and-white stripe illusions, bulging checkerboards, rhythms of coloured stripes). Never copy the composition or pattern of any particular work.

Runtime: `runtime/op.js` (`PROMO.op(F)`), loaded after `promo.js`. New project: `node scripts/new.mjs <dir> --style op`.

## 0. Safety (read first)

High-contrast moving patterns can disturb photosensitive viewers, and can also cause moiré, stripes appearing to run backwards, and compression smearing in the video. So:
- **Full-screen black/white inversion no more than 3 times a second**; never let the whole frame flash between black and white.
- **Stripe period at least 18px** (at 1080p; `Q.field` clamps it automatically and warns in the console); 30–60px recommended.
- **Patterns move slowly**: no more than 1/4 of a period per frame. `speed` 1–3 is enough.
- Give the eyes a rest at the end: in the last second or two the pattern slows down or settles in one state.

## 1. What products it suits

- Tech, AI, developer tools, data and infrastructure, music and audio; "precise", "parallel", "you can't stop watching".
- Best when the product itself means "many things running at once", "passed on layer by layer", or "picking one out of a whole field": stripes split into a few coloured bands = parallel; concentric ripples = one passing to the next; a bulging checkerboard = picking one out.
- Poor fit: products that should feel warm, handmade, friendly (use origami or cut paper); products that need lots of photos on screen (stripes and photos fight for the eye).

## 2. What it is, and what it isn't

- **The pattern is the picture**: not "a bit of texture on a background" — the whole screen is stripes / rings / checkerboard.
- **The illusion comes from distortion**: lenses make the pattern bulge and squeeze; waves bend parallel lines; two overlaid patterns make moiré. Even a still pattern should look like it's moving.
- **The product is the "thing" in the pattern**: cards, logos, characters sit where the lenses are — as if they were pushing the pattern apart, bending it.
- **Less is more**: mostly black and white; colour in one place only (the brand colour, or four coloured stripe bands).

**It is not**: psychedelic (rainbow gradients, glow), cyberpunk (neon, glitch), low-poly. No gradients, no blur, no glow.

## 3. Colour
- **Brand colour**: `film({ brand })` / `P.kit.brand('op', { brand })` → the brand colour becomes the stripe colour (pushed saturated enough to "dazzle"); the black-and-white ground stays. By hand: `PROMO.op(F, kit)`.

- **Ink + paper**: near-black #111111 and a warm white #F7F5F0 (easier on the eye than pure white).
- **One accent**: the brand colour, or red #E8312A. Used in one place: a button, a character, the fill of the striped text.
- **Coloured stripe bands** (`bands`, at most 4 colours): parallel stripes split into coloured sections — meaning "parallel", "several lines running together"; use when the product has several parallel things.

## 4. Type

- **Titles**: a geometric bold (`Unbounded` 800, OFL), uppercase or title case, tightly set.
- **Striped text** (`Q.word`): the letters are filled with flowing diagonal stripes, with a heavy black outline, on a paper-coloured plate (default). Only big text gets this.
- **Captions / UI text**: a clean sans-serif (Inter 700), on white cards, **never directly over stripes** — unreadable.
- Legible on a phone: see the table in references/structure.md; op backgrounds are "busy", so text needs to be a size larger than in other styles.

## 5. Motion

- **The pattern always moves, but slowly**: waves flow slowly, rings expand slowly, spirals turn slowly, checkerboards and dots slide slowly along a diagonal (all controlled by `speed`; only `speed: 0` is still).
- **The lens is the main move**: something appears = the lens there bulges (`lensTo`, r grows from 0 to the target); something leaves = the lens retracts. A lens can follow a moving thing.
- **Changing pattern**: the new pattern spreads out from the centre in a circle (`morph`), clean and quick; once per section only.
- **Entrances**: cards and text grow out of venetian-blind slits (`Q.blinds`) — op's own way of appearing; no fade-ins.
- **On the beat**: lens bulges, pattern changes and card entrances land on the beat; the pattern's flow speed can follow the section's intensity.

## 6. Camera and transitions

| Move | Says | How |
|---|---|---|
| Lens bulges | "here it comes" | `f.lensTo(i, at, 0.5, { r: 400 })`, with the thing at the lens centre |
| Pattern changes from the centre | a new topic, the next state | `f.morph(at, 0.8, 'rings')` |
| Stripes thicken and swallow the frame | scene change | `Q.wipe({ at, dur })`, switch scenes at `at + dur/2` |
| Venetian-blind reveal | cards, text appear | built into `Q.card` / `Q.word`; for other elements `Q.blinds(el, { at })` |
| Slow push-in | focus | push in with `PROMO.camera` (the pattern canvas itself doesn't scale with the camera, so what gets pushed is what's on top of it) |

## 7. Sound

- Material: **minimal electronic sounds** — sine pulses (pulse), frequency sweeps (sweep), crisp ticks, a low hum. Like a precision instrument.
- Types the components emit: `pulse` (striped text appears), `sweep` (cards, transitions). The sound.js created by `--style op` already has them.
- Score: **minimalism** — repeating arpeggios, two layers of the same figure slowly drifting apart (phase music), a steady pulse; "repetition + slow change", just like the stripes on screen. 110–124 BPM.

## 8. Moves only this medium has (pick to suit the product)

- **Something pushes the pattern apart**: where a logo / card / character appears, the stripes bulge and bend around it. *Suits*: product reveals, "something new has arrived". (`f.lens` + `lensTo`)
- **Parallel stripes = parallel work**: several coloured stripe bands flow together, one thing per band (an agent, a user, a task). *Suits*: parallelism, multitasking, teams. (`Q.field({ bands })`)
- **Ripple relay**: one point sends out rings that reach the next point, which sends out new rings — the two sets overlap into moiré. *Suits*: messaging, networks, collaboration. (several rings patterns + lenses, or moving the rings' center)
- **Bulging checkerboard**: a ball bulges out of the middle of a checkerboard, with the product inside. *Suits*: data, grids, "picking one out of many". (`checker` + a strong lens)
- **Spiral pull-in**: a spiral turns slowly, and at the end everything is pulled into the centre and becomes the logo. *Suits*: endings, "everything converges". (`spiral`)
- **Venetian-blind transition**: stripes thicken to swallow the frame, then thin to reveal the next scene. (`Q.wipe`)

**Carrying information (without boxes and arrows)**: step after step = lenses bulge one by one along the stripes, the stripes bending between steps; contrast = a lens bulges behind the winning side; numbers = striped big text, by size; real UI = a round magnifier with a heavy black frame. Short words in striped big text; a sentence goes on white with a heavy frame (long striped text is unreadable). (`promo/references/kit.md`, the info cues section)

## 9. Common pitfalls and self-check

- **Text over stripes**: unreadable. Put text on a plate / card, or put a strong lens behind it to push the stripes away.
- **Stripes too thin, moving too fast**: flicker and moiré on screen and in the video (see section 0).
- **Changing pattern + lens + card entrance all at once**: too busy. One thing per beat.
- **One pattern all the way through**: viewers go numb. Use 2–3 patterns in a film, changing by section.
- **Colour everywhere**: loses op's power. Black and white for the body, colour in one place only.
- **The automatic check stops reporting dead air**: the pattern is always moving, so frame differences are always large and the check thinks something is always happening. Pace it yourself: every 1–1.5 s there should be new text, a new card, a lens bulging or a pattern change — the flowing pattern alone can't carry the screen.

## 10. Room for variation

- Structure: **one pattern tells it all** (one canvas, driven by lenses and pattern changes); **cards across the pattern** (cards slide past one by one, the pattern bending with them); **parallel stripes** (one feature per band, merging into one at the end).
- Openings: a ball bulges out of the stripes; rings spread from the centre; a checkerboard suddenly bulges.
- Endings: a spiral pulls everything into the logo; all lenses retract at once and the pattern stills; a striped-text logo on a plate.

## 11. API quick reference

```js
const Q = PROMO.op(F, { ink: '#111111', paper: '#F7F5F0', accent: '#E8312A', head: '"Unbounded"' });
const f = Q.field(F.layer('', 0), { pattern: 'stripes', period: 40, amp: 30, wave: 0.006, speed: 1.5, angle: -8, duty: 0.5, bands: [c1, c2, c3, c4], center: [x, y] });
f.lens(0, { x, y, r: 0, s: 0.6 }); f.lensTo(0, at, 0.5, { r: 420 });      // lens: bulge out
f.to(at, dur, { period: 60, amp: 0, speed: 3, twist: 6, angle: 30 });      // parameter keyframes
f.morph(at, 0.8, 'rings' | 'checker' | 'spiral' | 'rays' | 'dots' | 'stripes');
Q.word(父, { at, until, text, size: 200, y, colors: [Q.accent, Q.ink] });  // striped text (on a plate)
Q.card(父, { x, y, w, h, at, until });                                     // white card, venetian-blind reveal
Q.blinds(元素, { at, dur, angle, period, until });                           // venetian-blind entrance / exit for any element
Q.wipe({ at, dur: 0.8, angle: 30 });                                         // venetian-blind transition, returns the moment of full cover
```
(`父` = parent layer, `元素` = element.)
Pattern canvas coordinates and sizes are frame px; `period` and `amp` are px (convert with `F.px()`).
`until` is always the moment of **fully gone**: the exit animation (blinds closing) finishes before until, matching the time registered with `F.text`. So the next line of text can appear exactly at the previous one's until, and text inside a card is registered with the card's same until.

Shared interface (`runtime/kit.js`, used by the quick version and future shared moves): `word` = `Q.word` (on a plate), `line` = white with a heavy frame + blinds, `card` / `shot` = `Q.card`, `accent` = a lens bulges in the background pattern at that point, `wipe` = `Q.wipe`, `end` = striped text + lens.

In explainer videos (following a voiceover, with subtitles): `node explainer/scripts/new.mjs <dir> --style op` (path from the skill folder) creates a project that follows the voiceover; the picture uses `PROMO.film({ format: 'explain' })` to appear with the narration's sentences and words (`promo/references/kit.md`, "Following the voiceover"), or write it by hand: `F.T` is the narration timeline. No formulas, characters or overview maps — for problem solving and stories acted out by characters use whiteboard / ink.

## 12. Not supported yet

- Stories about named people: this style has no characters; follow the last section of `../CHARACTERS.md` (name cards with fixed colours and positions, versus for confrontations), or recommend shadow puppetry / ink / whiteboard.
- Only six patterns: stripes / rings / checker / spiral / rays / dots (parameters can change and they can morph into each other, but you can't draw new patterns).
- At most 8 lenses per pattern.
- Needs WebGL2 (the Chrome used for rendering has it).
- Photos and screenshots don't become stripe patterns: they show as-is inside cards.
- No ready-made characters: use the product's own assets, or draw them in the project (grok-op's Bot was drawn in its project).
