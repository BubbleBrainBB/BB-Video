# Supercut (踩点混剪, `supercut`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

One frame: real-world footage filling the frame, and at its exact centre one small white caption pill.
- The footage hard-cuts on the beat, two or three shots a second; nothing dissolves, nothing slides. It carries mood and speed, never the message.
- The pill does not move when the picture cuts. A sentence is typed into it word by word across five to eight shots, so the eye stays in one place and reads while the world changes behind it.
- The pill behaves like a selected object in a design tool: hairline guides run from its edges to the frame edges (one solid, one dashed each way), its ink takes the colour of the picture under it, a new word arrives scrambled or hidden under a solid colour bar.
- Around that: the key word of the next line flashing for a few frames as giant heavy type with noise-eaten edges; a grid that fills cell by cell, or splits 1 → 4 → 16; one held shot every few seconds with two message bubbles that say something concrete; a plain ground with glyphs raining; a globe with a ring of text orbiting it; single-word cards on alternating grounds, then the name.
- One grade, grain, a slight softness and a streak on every cut-in sit over all the footage, so pictures from twenty sources read as one film.

Landscape and portrait are the same film: footage is cropped to cover, the pill stays at the centre, grids keep their rows and columns.

Runtime: `runtime/supercut.js` (`PROMO.supercut(F, opt)`). New project: `node scripts/new.mjs <dir> --style supercut` (promo, hand-written; no quick version, no narrated version yet).
Starter page: `styles/supercut/index.html` — every piece once, on grey stand-in plates so the timing can be checked before the footage is in.

## 0. Safety
Read this before looking for a single picture.
- **Footage carries rights.** In order:
  1. the user's own photos and footage;
  2. licence-clean material only: CC0, public domain, CC BY. `node scripts/footage.mjs <project> search "<query>"` searches Wikimedia Commons with that filter (add `--video` for clips); NASA, NOAA and other US federal sources are usually public domain; the Prelinger Archives hold public-domain film;
  3. nothing else. Never broadcast or streaming footage, press photos, stock previews with watermarks, stills grabbed from video platforms, another brand's promo film, or AI-generated pictures passed off as real.
- **Ask before fetching.** Show the user the list — title, source, licence, size — and wait for their OK before `fetch`. Searching downloads nothing.
- **Credits travel with the file.** `footage.mjs` writes `assets/src/<name>.json` (`{ title, author, licence, url, date }`); `explainer/scripts/assets.mjs` copies it into the manifest; every plate the film shows lands in `out/CREDITS.txt`. A plate without a credit gets a warning: write the sidecar by hand for the user's own material (`{ "author": "…", "licence": "own work" }`). CC BY material must be credited wherever the film is posted — paste CREDITS.txt into the description; when there is no description field, `S.cards({ credits: true })` prints a compact credit block on the logo card.
- **People.** No identifiable private individuals. Hands, backs, crowds from far away and silhouettes are fine; a face that fills a grid cell is not, unless the person is the user or has agreed. Never real people shown as endorsing the product. The multiplying grid is where this goes wrong: fill it with objects, hands and machines.
- **Other brands.** A logo that happens to be on a train is footage; a competitor's product shot or advertisement is not material.
- **Photosensitivity.** Fast cutting is the style, strobing is not: large-area light / dark alternation stays at or under **three flashes a second** (a flash = brightness going one way and back by a tenth or more of full range, over a quarter of the frame or more).
  - `S.burst` orders its plates by brightness, so a burst is one ramp from dark to light (or light to dark), never an alternation. Don't override it with `order: 'given'` unless the plates are close in brightness.
  - Never alternate black and white grounds faster than a beat. End cards change ground once per card, one or two beats apiece.
  - `--check` estimates the brightness of every shot and reports the worst second; over the limit it is an **error**, not a warning. Fix it; don't argue with it.
  - A burst lasts about a beat. Two bursts in a row need a normal run between them.
- **No disclaimer lines** ("unofficial", "demo") on the film.

## 1. When to use
- Brand mood and abstract selling points: speed, reach, scale, "for people like you" — things with no screen to show, or where the screen is the least interesting part.
- Launch films, manifestos, campaign openers, 15–40 s social cuts; a product whose claim is one sentence long.
- Topics with a deep pool of real imagery to associate with (movement, cities, machines, nature, sport, space, work, money, hands).

Choosing between `supercut` and `launch`: **good real UI worth showing → `launch`; abstract selling points or brand mood → `supercut`.** In a supercut a UI screenshot is at most two or three shots, cut past like any other footage; nobody pushes in on it, no cursor moves.

Not for:
- products that must be explained step by step (a flow, a comparison, a chart) — those need a style that holds still;
- topics with no licence-clean imagery to draw on (a niche B2B concept with nothing to look at);
- anything where the user has no footage and doesn't want archive material. **The style does not work without real footage.** Code-drawn shots (plain grounds, glyph rain, the globe, end cards) are at most about a quarter of a film; `--check` warns above that.
- stories with named characters, anything narrated at length.

## 2. What it is (and isn't)
- **Essence**: one fixed point of text over a stream of cuts. The text is small, calm and exact; the footage is large, fast and associative. All the film's rhythm is in the edit, all its meaning is in the pill.
- **Association is literal.** The line says "move" → a tachometer needle, a sports car, a cash counter. The word decides the pictures; a picture that needs explaining is the wrong picture. Each shot answers the word on screen at that moment, not the product.
- **It stops on purpose.** Every 6–8 s one shot is held for 1.5–3 s and something concrete is said in bubbles. Without holds the viewer remembers only "fast".
- **Not** the `launch` style: no stage drawn in code, no browser windows, no big words slammed one per beat as the main text, no camera travelling over a UI.
- **Not** a slideshow: a still held longer than about half a second with a slow push is a photo, not footage.
- **Not** a glitch reel: no RGB splits, no datamosh, no shake-and-zoom on every cut. The cut itself is the effect.
- **Not** a clone of any brand film in this genre: the pill, the guides and the eroded word are a grammar; fonts, colours, the pictures and the line are the product's own.

## 3. Color
- **The footage brings the colour.** Don't theme it: pick pictures whose own colour serves the line (warm for people, cold for machines, black for night and space).
- **One look over everything** (`look`): `film` (default: a little contrast, slightly desaturated, a trace of warmth), `mono` (black and white — archive material, or the whole film), `warm`, `cool`, `raw` (untouched). A plate can override it (`{ img, look: 'mono' }`): a passage of black-and-white archive inside a colour film is a classic move. `tone: '#hex'` adds a soft wash of one colour over all footage (use the brand colour, lightly).
- **The pill is white; its ink comes from the picture.** The runtime samples the footage under the pill and sets the text in a very dark version of that hue (dark red over a red shot, navy over sky). Never set the pill's ink by hand.
- **States change the pill, not the palette**: white pill (default), `ghost` (no box, text only — over calm, even footage), `invert` (black pill, white text — over white grounds), `tag` (shrunk to a small black tag — while a grid or a punch word owns the frame).
- **Accent**: one colour from the product (`accent`), used for bubbles and the drawn globe's graticule. Nothing else is tinted with it.
- **Grounds for drawn shots**: black, and one warm off-white. End cards alternate the two.

## 4. Type
- **One grotesk** for everything (`"Inter Tight"`, Chinese `"Noto Sans SC"`; change with `fonts`): the pill in weight 600, tight tracking; cards in 500, very tight; the punch word in 900.
- **The pill is small on purpose** (about a tenth of the frame's short side tall, half the frame wide for a five-word line): large enough to read on a phone (`--check` verifies), small enough that the footage stays the picture. A line too long for the frame is set smaller automatically and `--check` says so — break it in two (`\n`), which portrait often needs: `text: F.portrait ? 'two\nlines' : 'one line'`. If a line needs to be bigger, it is a punch word or a card, not a bigger pill.
- **A line is short**: one clause, 3–7 words, or 4–12 Chinese characters. Two lines at most (`\n`). A full stop ends it.
- **How a word arrives** (`reveal`, per word):
  - `type` — character by character, the default; the newest character sits a little low for one frame;
  - `scramble` — the whole word in wrong characters (its own letters and digits) that resolve left to right; for the word the sentence turns on;
  - `bar` — the word's place is covered by a solid bar in the picture's colour, which lifts about half a beat later; for a word worth a breath of suspense;
  - `cut` — whole, at once; for very fast passages.
  Mix them: mostly `type`, one `scramble` or `bar` per line.
- **The punch word**: one word, the hinge of the next line, 2–6 letters if possible. Giant, white (black over a bright shot), eroded. It is seen, not read — the line that follows repeats it.
- **Cards**: one word each. A phrase is split across cards, one word per one or two beats.
- **Chinese**: split a line into word-sized pieces with `|` (`'你的|代码|应该|更快'`); scramble uses the word's own characters; keep punch words to 1–2 characters.

## 5. Motion
- **Stills move like footage.** Every plate gets one constant-speed move for the length of its shot — push, pull, a pan left / right / up / down — plus a trace of handheld drift. No easing: a shot cuts in already moving and cuts out still moving. Short shots move fast, holds creep; the runtime scales the speed to the shot's length.
- **`move: 'auto'`** (default) picks a seeded move per shot and never the same twice in a row. Set a move by hand when the picture has a direction (a train heading left pans left; a tower pushes up).
- **The cut-in smear**: the first two frames of a shot land with a streak along its move (pans) or a small zoom kick (pushes). It is what makes a cut between two stills feel like a shutter, and why mixed sources feel like one camera.
- **`rush`** is a hard push for the plate behind a punch word.
- **The pill never eases with the cut.** It grows to make room for the next word (a tenth of a second), and that is all its motion. State changes land on cuts.
- **Grid cells** cut in one at a time, each already moving. A takeover (one cell growing to full frame) takes three frames.
- **Bubbles** pop from their corner with a small overshoot, then drift larger with the held shot's push.
- **Everything is on the grid**: shots on eighth notes, bursts on thirty-second notes, parts (run, hold, grid, cards) on whole beats so the music can change with them.

## 6. Camera and transitions
- **There is one transition: the hard cut.** No dissolves, wipes, whips or flashes of white between shots.
- **Shot lengths** (at 86–92 BPM): an eighth note (≈ 0.34 s) is the default; `pattern: [1, 1, 2]` gives short-short-long; a burst is thirty-second notes (≈ 0.085 s, 2–3 frames each) for about a beat; a hold is 4–8 eighths.
- **A run is not uniform.** Vary the pattern between runs; put the longest shot of a pattern where a word lands.
- **A burst opens or punctuates** — under the name at the very start, or just before a punch word. One or two per film.
- **The grid is the only split screen.** 2×2 filling one cell per eighth; or `S.multiply`, where the whole frame cuts to four and then sixteen. Use the split when the line is about many (people, places, things at once).
- **Cards are cuts too**: ground and word change together, no animation between them.
- **Portrait**: nothing moves to make room; plates are cropped to cover (set `focus` on a plate whose subject is off-centre).

## 7. Sound
The film is cut to the music, so the music is written first: fix the tempo, then take every cut from it.
- **Tempo**: 86–92 BPM with a half-time feel (kick on one, snare on three, hats in sixteenths). Slower and the eighth-note cut drags; faster and thirty-second bursts drop under two frames.
- **Drums and bass lead; almost no melody.** By part (the runtime names the sections from the picture):
  - `run` — full drums, bass, one short two-note stab late in the bar;
  - `hold` — the drums drop out: pad and sub only, so the bubbles are heard as the event;
  - `grid` — kick and hats, no snare;
  - `graphic` (rain, globe) — pad, sub, a sparse hat;
  - `cards` — almost nothing: each card has its own dry hit; the logo resolves to the tonic.
- **The punch word**: the music stops the beat before and hits on the word (`S.punch` registers the stop).
- **No sound effect on an ordinary cut.** The drums carry the cuts; a whoosh on each would be a different, cheaper film (`whoosh` is muted in the starter `sound.js`).
- **Effects belong to text and graphics only**: a soft in-key tick per typed character, a short flutter for a scramble, a click when the bar lifts, an impact and a sub drop on the punch word, rising ticks as grid cells fill, a split when the frame multiplies, two message pops for bubbles, a low swell for the globe, one dry hit per card.
- **Footage audio is dropped.** No narration by default.
- Dry and close (`space` small): a cutting room, not a hall. Starter files: `styles/supercut/score.js`, `sound.js`; both in one key.

## 8. Signature moves
Pick per film; a 30 s film uses the pill throughout, and three or four of the rest.
- **The pinned pill** over a run — the style itself.
- **Burst + name**: the product's name as a punch word over a one-beat burst, as the very first thing.
- **Punch word → line**: the key word flashes giant, then the pill types the sentence that contains it.
- **State walk**: the same finished line goes pill → ghost → tag as the footage changes character, instead of disappearing.
- **Bar and scramble**: one word per line held back half a beat.
- **Redact**: a finished word goes back under its bar for a beat (`redact`) while the next word types.
- **Fill the grid**: four archive pictures arrive one per eighth, then one takes over the frame and the run continues from inside it.
- **Multiply**: 1 → 4 → 16, for "everywhere", "everyone", "in parallel".
- **The hold with bubbles**: the film's one or two concrete claims, as messages over a slow push.
- **Glyph rain**: one symbol of the product's world falling on a plain ground, with the pill inverted over it.
- **The globe and the ring**: the URL (or one phrase) orbiting a turning Earth — for reach, and as the breath before the cards.
- **Word cards → logo**: the tagline one word at a time on alternating grounds.

## 9. Images and video
- **Stills are the footage.** In a 0.2–0.4 s shot a photograph with a move, a streak and grain reads as a moving shot, and licence-clean photographs outnumber licence-clean video a thousand to one. Use real video only for holds longer than about a second, where a still would be caught.
- **How many**: count the shots (`--check` prints them). A 30 s film needs 40–55 plates plus the grid cells. Search for half again as many as you need; pictures that looked right in a thumbnail fail at full frame.
- **Choosing a plate**:
  - one clear subject, readable in a fifth of a second; no fine text, no busy collages;
  - strong direction or depth (a road, a track, a row of things) gives the move something to do;
  - bright and dark plates both — but look at the order in a run: a bright plate between two dark ones is half a flash;
  - at least 1280 px on the long side; a small picture pushed in turns to mush even at 0.3 s;
  - for portrait, the subject within the middle third, or set `focus`.
- **A plate** is `'key'` (the file's name in `assets/src/`, after `assets.mjs`), a path (`'shots/home.jpg'`), a colour, or an object: `{ img: 'key', move: 'left', focus: [0.3, 0.5], look: 'mono', flip: true }`. A clip: `{ clip: 'key', from: 2.5, rate: 1 }` (frames at the source's own rate; `clips.json` cuts a stretch out of a long file).
- **Fetching**: `node scripts/footage.mjs <project> search "<query>"` → show the user the list → `fetch <n>` (photos arrive at ≤ 1600 px; clips: `--from <s> --dur <s>` takes only that stretch) → `node explainer/scripts/assets.mjs <project>`.
- **Product screenshots** (`capture.mjs`, in `shots/`): two or three, as plates in a run (`'shots/editor.jpg'`, or `{ src, ui: true }`). Crop to a part that reads at a glance (`focus`). `--check` warns at four, and at any screenshot held over a second.
- **The globe's map**: any equirectangular world image in the manifest (`map: 'key'`); without one the globe is drawn as a graticule in the accent colour.
- **The grade is the glue**, not a fix: a watermark, a caption burned into a photo or heavy JPEG damage survives every look. Drop the plate.

## 10. The cut sheet
Write this before any code, under the information list in the storyboard.
1. **The lines** — 3–5 short sentences that are the whole message, in order; under each, the facts it rests on (brief.md). One line per 5–8 shots. The end-card words. The one or two holds and what their bubbles say (these are the film's real claims: exact wording from the fact sheet).
2. **The word → picture table** — for every word a list of things that *are* that word, literally. This is the footage shopping list.
3. **The parts on the beat grid** — eighth notes numbered from 0; each part (burst, run, hold, grid, graphic, cards) starts on a whole beat (an even eighth). A hold every 6–8 s. Punch words on a beat, before their line.
4. **Density** — a 30 s film still has to say four concrete things: the lines, the bubbles and the cards carry them. Count them.

## 11. Pitfalls and self-check
Common mistakes:
- **No footage, all graphics.** Plain grounds and rain for half the film is a different (worse) style. Find pictures or choose another style.
- **Pictures that illustrate the product** instead of the word on screen: a laptop for every line of a software film. Associate with the word.
- **Uniform eighths for 20 s.** No burst, no hold, no pattern change: it becomes a metronome. Vary.
- **The line changes with every cut.** A sentence must sit across several shots; if each shot has its own text, it is a slideshow with captions.
- **A finished line cut away at once.** After the last word lands the whole sentence stays at least 0.6 s (`--check`), better a full beat.
- **The pill made bigger "so it reads".** It reads because it never moves. Use the punch word for size.
- **Sound effects on cuts.** See §7.
- **A bright plate dropped into a dark run**, or black / white cards on every eighth: flashing. Reorder; `--check` gives the second, and the final render counts it again on the real pixels.
- **Faces in the grid.** See §0.
- **Stills held too long**: any plate over ~0.5 s that isn't a hold shows itself as a photo. Shorten, or make it the hold and give it bubbles.
- **A screenshot explained.** If you want to point at the UI, you want `launch`.

What `--check` prints for this style (fix or explain each):
- `Shots` — picture changes (shots, grid cells, splits) and their rate, the median shot length, a histogram of lengths, the number of holds; warns under one change a second, when fewer than 55% of shots are ≤ 0.5 s, or when a shot is under two frames;
- `no hold` — more than 8 s of cutting without a shot of a second or more;
- `caption too brief` — a line that stays under 0.6 s once complete; `two captions` — two pills at once; `typed too fast`; `caption too long` — a line shrunk below 80% to fit the frame;
- `Flashing` — the worst second's count of large brightness changes; an **error** over six (three flashes);
- `too little footage` — code-drawn shots over 30% of the film before the end cards; `too many screenshots` / `screenshot held`;
- `repeated plate` — the same picture twice within four shots;
- `nothing said` — more than 2 s with no caption, bubble, punch word or card;
- `off the beat` — a part that doesn't start on a whole beat (the music can't change with it). Registered cuts and bursts are not reported as jumps, one-frame flashes or off-beat cuts.

Then look: `--strip` across a run (is the pill legible over every plate?), around each hold, and the whole film at 24 frames; in both aspects.

## 12. Variation
- **Look**: all `mono` with one colour passage; `warm` for people-and-places films; `cool` for machines; `raw` when the user's own footage is already graded.
- **Material**: all archive black-and-white; all macro; all aerial; one city; only hands. A film with one kind of picture has more character than a mix of everything.
- **Pattern**: straight eighths and one long hold (calm); `[1, 1, 2]` and two bursts (driving); quarter notes with `ghost` captions (slow, for a serious brand).
- **Pill**: at the centre (default), or pinned low (`y: 0.62`) for portrait films with faces above; ghost throughout over dark footage; inverted throughout for a black-pill film.
- **Shape of the film**: burst → run → hold → run → grid → hold → graphic → cards is the default arc; a 15 s cut is burst → run → hold → cards; a manifesto drops the grid and holds twice.
- **Tempo and key**: stay in 86–92 BPM; change the key, the kick pattern and the stab's two notes per film.

## 13. API quick reference
`const S = PROMO.supercut(F, { look, tone, grain, soft, smear, shake, accent, seed, fonts: { text, punch, card }, sections })`
- `look` `'film'` | `'mono'` | `'warm'` | `'cool'` | `'raw'`; `tone` a colour washed over all footage; `grain` 0–1 (0.5); `soft` blur in px at 1080 (0.6); `smear` seconds of cut-in streak (0.075); `shake` handheld drift 0–1 (0.5); `sections: false` to name the music's sections yourself.
- Use `grain: false` in `PROMO.compose` (the runtime has its own grain). Times in seconds; `S.e(n)` = the n-th eighth note.

A **plate**: `'key'` | `'path.jpg'` | `'#hex'` | `{ img | clip | src | color | paint(ctx, w, h, t), move, amt, speed, focus: [x, y], look, flip, from, rate, loop, ui, lum }`; `move`: `'auto'` | `'push'` | `'pull'` | `'left'` | `'right'` | `'up'` | `'down'` | `'rush'` | `'still'`.

| Call | What it does |
|---|---|
| `S.shot(a, b, plate, { cut, move, smear })` | one plate in [a, b), cut in at a |
| `S.run(a, b, plates, { unit, pattern })` | the sequencer: shots on the grid, `unit` (an eighth) × `pattern` (lengths in units, cycled); returns the shots (`.a`, `.b`) |
| `S.burst(a, b, plates, { div, order })` | a flash burst, `div` cuts per beat (8); plates ordered by brightness (`'up'` / `'down'` / default by the given ends; `'given'` keeps yours) |
| `S.hold(a, b, plate, { move })` | a held shot with a slow push; counts as the film's rest |
| `S.standIn(i)` | a grey stand-in plate for timing before the footage is in |
| `S.caption({ at, until, text, on, every, reveal, state, states, x, y, size, guides, redact })` → `C` | the pill. Words split on spaces, or on `\|`; `\n` = second line. `on: [t…]` per word, or `every` (a beat). `reveal` one or a list: `'type'` `'scramble'` `'bar'` `'cut'`. `state`: `'pill'` `'ghost'` `'invert'` `'tag'`; `C.state(t, name)` or `states: [[t, name]]` change it. `redact: [[t0, t1, wordIndex]]` |
| `S.punch(at, text, { until, plate, size, color, stop })` | the punch word; `plate` gives it its own shot; `stop: false` keeps the music running |
| `S.bubbles({ at, until, items: [{ text, at }], from, color, ink, side, x, y, size, grow })` | message bubbles (over a hold); `from` a small sender label |
| `S.grid({ at, until, n \| cols, rows, cells, every, ats, order, ground, gap, takeover: { cell, at, dur } })` | cells fill one at a time (`order`: seeded, `'seq'`, or a list of cell indices); `takeover.cell` = the k-th filled cell grows to full frame |
| `S.multiply({ at, until, steps: [1, 2, 4], ats, cells, ground, gap })` | the frame splits at every step (n × n cells each) |
| `S.rain({ at, until, glyphs, ground, color, n, size, speed, font })` | glyphs or emoji raining on a plain ground |
| `S.globe({ at, until, map, ring, sep, ground, r, grow: [from, to], spin, tilt, color, ringColor, ringSize, ringR, ringSpin })` | a turning globe (an equirectangular image, or a drawn graticule) with text orbiting it |
| `S.cards({ at, words, every, grounds, size, logo: { text \| src, font, weight, size, h, ground, invert, blend }, url, until, credits })` | one word per card on alternating grounds, then the logo card. An image logo (`src`) is dark art on a white background: it is multiplied onto a light ground, or inverted and screened onto a dark one, so no box shows; follow the brand's own colour rules |
| `S.lumaAt(t)`, `S.shots` | the estimated frame brightness; the shot list (for your own checks) |

Minimal example:
```js
const S = PROMO.supercut(F, { look: 'film', accent: '#3d7bf2' }), e = S.e;
S.burst(e(0), e(2), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
S.punch(e(0), 'Name', { until: e(2), stop: false });
S.run(e(2), e(16), ['p1', 'p2', { img: 'p3', move: 'left' }, 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'], { pattern: [1, 1, 2] });
S.caption({ at: e(2), until: e(16), text: 'A short line here.', every: F.B * 1.5, reveal: ['type', 'type', 'bar', 'scramble'] });
S.hold(e(16), e(24), { clip: 'c1', from: 1 });
S.bubbles({ at: e(17), until: e(24), from: 'Name', items: [{ text: 'One real fact' }, { text: 'And a second', at: e(19) }] });
S.cards({ at: e(24), every: F.B * 2, words: ['Two', 'words'], logo: { text: 'Name' }, url: 'example.com' });
```

Sound events the runtime emits (define them in `sound.js`): `type` (a typed character), `scramble`, `bar`, `punch`, `cell`, `split`, `pop`, `globe`, `card`, `logo`. Sections it registers: `run` (3), `grid` (3), `hold` (1), `graphic` (2), `cards` (2).

## 14. Not supported yet
Say so plainly when asked:
- **No narrated version** (explainer): the pill is the voice. A voiceover variant, with the pill following the narration's words, is not built.
- **No quick version** (`--quick`) and no entry in the styles' common interface (`kit.js`): hand-written only.
- **No footage audio**: clips are silent; no J-cuts, no sync sound.
- **No speed ramps or reverse inside a clip**; a clip plays at one rate.
- **Directional smear only along the frame axes** (pans); diagonal moves get the zoom kick.
- **The punch word is one line** of one font; no per-letter animation.
- **The pill's ink is sampled once per picture** (its centre), not tracked through a clip that changes colour.
- **The flashing check in `--check` estimates** brightness from each picture's average (and the punch word's coverage). The final render measures the real frames (whole-picture average only, so a flashing quarter of the frame can slip past it). Treat a count of 5–6 as close to the limit.
- **The globe** has no day / night side, clouds layer or markers; the ring is one phrase repeated.
- **No automatic footage selection**: the word → picture table and the search are yours.
