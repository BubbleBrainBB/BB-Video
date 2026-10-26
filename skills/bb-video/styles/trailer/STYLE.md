# Movie trailer (电影预告片, `trailer`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

One frame: a 2.39:1 letterbox on black, and inside it either
- a **shot**: a code-painted cinematic picture in depth layers — space, stars and nebulae, a lit planet, ridges and skylines, a corridor, a console screen, a person as a silhouette with a rim of light — under a film grade (teal shadows, warm highlights), grain and a vignette, with a slow push, parallax and a rack of focus; or
- a **card**: black, one short phrase in wide-tracked metallic type that creeps toward you while a band of light passes over it.

The film is about **rhythm, cards and sound**: calm long shots and a lone piano "ping"; "直到……" on a card and a ticking clock; then BRAAMs and taiko while the cuts get faster and faster; a smash, flash frames; a beat of total silence; the title slams; the date; the dense billing block; one last beat after it (the button). An invented studio ident opens it.

Runtime: `runtime/trailer.js` (`PROMO.trailer(F, opt)`). New project:
- promo (a product launch cut as a trailer, or a trailer for a story): `node scripts/new.mjs <dir> --style trailer`;
- explainer (a narrated "trailer" for a topic, with the deep trailer voice): `node explainer/scripts/new.mjs <dir> --style trailer`.

Starter pages: `styles/trailer/index.html` (title cards only, on the beat) and `styles/trailer/explain.html` (narrated, timed from the narration).

## 0. Safety
- **No real film's trade dress.** Never a real studio's logo, ident, fanfare or name; never a real film's title, characters, footage, poster type or title design; never the rating-board "green band" card. `R.ident` makes an invented studio (the starter's "远灯影业 / Farlamp Pictures" — invent a new one per film if you like).
- **People are silhouettes.** Characters are seen from behind, in profile against light, or running in a corridor — never a drawn face, never a look-alike of a real person.
- **A trailer for something real** (a product, a book, an event) states only facts from brief.md; the dramatic voice never invents features, dates or reviews. A fictional film says it is fictional in brief.md and makes up every name in its billing block.
- **Footage** is optional and licence-clean only (the user's own, CC0 / public domain / CC BY with credit), fetched with `scripts/footage.mjs` after telling the user what, from where, which licence and the size, and waiting for their OK. Never AI images passed off as footage.

## 1. When to use
- A story told as "coming soon": a fictional film, a book or game, a history episode, a launch with stakes ("the world before → until… → what changes").
- Product launches that want drama rather than a feature tour: the problem as act one, the product as the turn, what it makes possible as act three, the name as the title slam, the launch date as the release card.
- Less suited: dense step-by-step how-tos and feature lists (use launch / toy3d), cheerful consumer products (pop / cutout), anything that needs real UI on screen for long.

## 2. What it is (and isn't)
- **Essence**: tension and release. Contrast drives it — lows only feel low next to highs. Every element serves the build: a card is a beat, a cut is a beat, silence is a beat.
- **It is not** `mystery` (a TV docu with slow suspense and stickers), `launch` (a clean product stage, words slammed on the beat), or `newsreel` (old film, a report). No product screenshots on a white stage, no stickers, no film damage.
- Don't overdo it: one braam per bar at most, flash frames only in act three, one silence beat (before the title).

## 3. Color
- Grades (`grade`): `teal-orange` (default: cool shadows, warm highlights), `cold` (space, winter, isolation), `warm` (memory, the past — a single shot can carry its own grade: `R.shot(a, b, { grade: 'warm' })`), `bleach` (war, grit), `night`, `none`, or `{ shadows: [r, g, b], highlights: [r, g, b], contrast, saturate, lift }`.
- Paint shots dark: night skies `#020308`–`#0b1422`, silhouettes `#030405`; light comes from few sources (a sun, a screen, a window) and draws rims (`rim` / `rimSide`).
- Cards are near-black `#060606` and are not graded; type looks: `metal` (silver, default), `glow`, `gold`, `red` (unease), `plain`.

## 4. Type
- Chinese: Noto Serif SC 600 / 700 / 900 for cards and the title (OFL); Noto Sans SC 400 / 500 for subtitles, in-world text and the billing block (OFL).
- Latin: Cinzel 400 / 700 (OFL) — Roman capitals for English titles and the ident.
- Cards are tracked wide (`.3em`), one phrase each: ≤ 12 Chinese characters / ≤ 6 English words (`--check` warns). Sizes in gate units (gate height 1000): story card 92, date 170, title 230.
- Dialogue subtitles sit in the lower letterbox bar, plain white, no box (the runtime does it when the film is narrated).
- The billing block: names squashed to 62 % width, roles tiny and stacked in two lines beside them, invented logos boxed below.

## 5. Motion
- Shots **push** slowly (`S.cam({ s: 1 }, { s: 1.06–1.15 })`), layers move by depth (`z`: 8 = far sky, 1 = subject, 0.5–0.9 = foreground), focus can rack (`S.focus(7, 1, a, a + 2)`).
- Cards creep toward the viewer (4 %) and a light sweep crosses the type once.
- Act three: shot lengths shrink geometrically (`R.ramp(a, b, { first: 1.6, last: 0.35, snap: F.B / 2 })`); flash frames between the last cuts.
- Things inside shots move continuously (a dish turning, lights going out bay by bay, a runner's stride, a waveform) — a held still is never the trailer.

## 6. Camera and transitions
- **Hard cuts** are the grammar; cards **fade in from black** (0.32 s) in acts one and two, **slam** in act three (`enter: 'slam'`, with an impact).
- **Smash cut** (`R.smash(t, { flash: true })`): the act-three opener, with a braam.
- **Flash frames** (`R.flash`), **dips to black** (`R.dip`), **light leaks** (`R.leak`) — sparingly.
- **The silence beat** (`R.title({ silence: 0.8 })` or `R.silence(a, b)`): the picture cuts to black and every sound stops; the title lands on the next downbeat. The checks accept it (F.hush); keep it ≤ 1 s.

## 7. Sound
- Music (`styles/trailer/score.js`) builds in named sections: `open` / `world` (drone, string bed, piano ping) → `turn` (thinned out, low ostinato) → `rise` (spiccato, first taiko) → `climax` (a braam every bar, taiko, high ostinato) → `title` → `tail` (piano alone). Name your `F.section`s with these, or rename both.
- Sound design (`sound.js`): `whoosh` (cards), `impact` (smash, slam), `flash`, `braam` + `boom` + `subdrop` (the title), `swell` + `ident` (the studio ident), `shine` (the light sweep), `ping` (act one's lone note, placed by the picture), `static` (a radio), `tick` (`R.pulse`: the ticking clock that carries act two), `riser` (into a slam). All in the score's key.
- Voice, three ways (script.json): **cards only** (no lines), **sparse dialogue** (lines placed with `"at"` between the downbeats; a transmission or a phone gets its own `"fx"`: `distant`, `radio`, `phone`), or **the trailer voice** (`zh-CN-YunjianNeural` / `en-US-GuyNeural`, slower, `"voice_fx": "trailer"` — the explainer starter sets it).
- Music-first: set the bpm, put cards and big cuts on downbeats, then place the lines between them (`"at"`); dialogue goes before a downbeat, never on it.

## 8. Signature moves
- **The card** (`R.card`): "在一个……的世界里", "直到那一天", "今年冬天" — one phrase, black, metallic.
- **The ping** (`F.sfx(t, 'ping')`): a lone note in act one, every bar or so.
- **The ticking clock** (`R.pulse`): act two's pulse; accent every 4th.
- **The ramp** (`R.ramp`): act three's acceleration, with flash frames on the last cuts.
- **Smash to silence**: the loudest moment cut to black and nothing (`R.title` with `silence`).
- **The title slam** (`R.title`, `enter: 'slam'` with flash + braam + sub drop, or `'emerge'`: letters come out of the dark as light passes).
- **The billing block** (`R.billing`) and **the release card** (`R.release`).
- **The button**: one more shot and one more line after the billing block (the music cut off: `F.musicCue(t, 'off')`).

## 9. Shots (the painters)
Each `S.layer({ z, paint, draw })` draws in gate units (the visible gate is `0..R.GU × 0..1000`; `U.x0..U.x1` include the overscan). `paint` runs once (cached), `draw(c, U, t, q)` every frame. Painters (`R.paint.*`, all `(c, U, o)`):
- skies and space: `sky({ stops })`, `stars({ n, seed, milky: angle })`, `nebula({ x, y, spread, colors })`, `glow`, `sun`, `planet({ x, y, r, light, lightZ, kind: 'earth' | 'rock' | 'gas', city, spin, seed })` (rendered per pixel: terrain, clouds, glint, terminator, city lights, atmosphere);
- land and weather: `ridge({ y, amp, rough, color, rim })`, `skyline`, `sea({ glint })`, `clouds`, `fog`, `rays`, `particles({ t, kind: 'dust' | 'snow' | 'rain' | 'embers' | 'stream' })`;
- people: `figure({ x, y, h, pose: 'stand' | 'walk' | 'run' | 'reach' | 'look' | 'sit', facing: 'back' | 'left' | 'right', suit: 'plain' | 'coat' | 'space', hair, phase, rim, rimSide })`;
- places and things: `station`, `dish({ angle, tilt })`, `window({ shape: 'round' | 'rect' })` (a foreground frame), `corridor({ lit })`, `screen`, `wave({ kind: 'wave' | 'bars', amp, shape })`.
- In-world text: `S.text(text, { x, y, size, type: true })` (typed with keys); flares: `S.flare({ x, y, power })`; pictures: `S.image(key)`.
Build a film's recurring shots as small functions in the page (`station(a, b, o)`, `atWindow(a, b, o)`) and reuse them across the acts and in the montage — the montage is the earlier shots, closer and faster.

## 10. Pitfalls and self-check
- **Gaps**: the user dislikes 1–2 s with only music. Act one carries pings and lines, act two the ticking clock, cards ≤ 2–3 s. `--check` lists "没有新动作" — fix every one.
- **Cards**: one phrase; three cards in a row with no shot between is a slideshow (`--check` warns).
- **The cut rate must rise** toward the title (`--check` compares the first and last third).
- **The silence**: only before the title (and maybe before the last line), ≤ 1 s.
- **Painted shots**: look at `--stills` for every shot kind — silhouettes must read as people, planets as planets; no stray shapes (a path joining two shapes), nothing cartoonish next to the grade.
- **Subtitles** in the bar must not collide with the picture; keep in-world text ≥ 50 units so it reads on a phone.
- Self-check per `references/review.md`; `--check`, `--stills`, then the full render and its frame check (flashes are registered transitions; a flagged jump that is not a flash or a cut is a bug).

## 11. Variation
- Grade and palette: cold space ↔ warm desert ↔ bleach war ↔ night city.
- Voice: cards only ↔ sparse dialogue ↔ the trailer voice.
- Title: slam ↔ emerge; metal ↔ red ↔ gold.
- Length: a 30 s teaser (cold open, two cards, ramp, title) ↔ a 90 s trailer (three acts and a button).
- Tempo: 80–100 bpm for drama, 120+ for action.

## 12. API quick reference
```js
const R = PROMO.trailer(F, { gate: 2.39 | 1.85 | 'full' | number, grade: 'teal-orange', grain: 0.3, vignette: 0.6, fonts, colors, captions });
// gate units: height 1000, width R.GU (2390 at 2.39; portrait 4:5 → 800); R.g(v) → px
const S = R.shot(a, b, { cut, fadeIn, fadeOut, grade, bg });
S.cam({ s, x, y, r }, { s, x, y, r }, ease);  S.focus(f0, f1, ta, tb, aperture);
S.layer({ z, paint(c, U), draw(c, U, t, q), blend, opacity, res, over });  S.group(z);
S.text(text, { x, y, size, anchor, a, b, type, cps, color, glow, font, weight });  S.flare({ x, y, z, a, b, color, size, streak, power(t) });  S.image(key, { z, pos, fit });
R.card(a, b, text, { kind: 'story' | 'tagline' | 'date' | 'cast', role, sub, look, enter: 'fade' | 'rise' | 'cut' | 'slam' | 'flicker', exit, size, sfx, sweep });
R.flash(t, { dur, peak, color, sfx });  R.smash(t, { flash, sfx });  R.black(a, b);  R.dip(a, b);  R.leak(a, b, { color, from, to });
R.ramp(a, b, { first, last, snap }) → [[a, b], …];  R.pulse(a, b, { every, type, gain, accent });  R.silence(a, b, { energy, name });
R.ident({ a, b, name, en });  R.title({ a, b, main, en, sub, look, enter: 'slam' | 'emerge', silence, size });
R.release({ a, b, line, date, note });  R.billing({ a, b, top, cast, title, credits: [{ role, name }], logos, foot, stagger });
R.paint.sky / stars / nebula / glow / sun / planet / ridge / skyline / sea / clouds / fog / rays / figure / station / dish / window / corridor / screen / wave / particles
```
script.json (sparse dialogue): `{ "id": "e2", "at": 36.4, "text": "…", "voice": "zh-CN-YunyangNeural", "fx": "distant" }` — `at` = when the line starts; `fx` = this line's own voice colour.

## 13. Not supported yet
- No quick version (`--quick` / `kit.js` adapter): hand-written only.
- No 3D models (ships, vehicles, faces): shots are 2.5D painted layers; a real 3D shot would need three.js (see `toy3d`).
- Footage plays only as stills (`S.image`); film clips are not wired in yet (newsreel's `R.clip` shows how).
- Portrait (9:16) works (a 4:5 gate) but the painters were tuned in landscape: check the stills.
