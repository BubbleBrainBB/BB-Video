# Old newsreel (老新闻片, `newsreel`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

One frame: a 1.37:1 film gate on black, and inside it a 1930s–50s cinema newsreel in black and white (or sepia):
- archive photographs with a slow push, supers printed on the film, rubber stamps slammed onto them;
- intertitles between double rules, a question card where the music stops;
- period information pieces: a tear-off calendar, a stopwatch, a printed price list, a seen / not-seen verdict;
- for what no licensed footage shows, the period "animated diagram": white lines on a faint drafting grid, tagged as a reconstruction;
- grain, scratches, dust, a hair now and then, gate weave, a soft flicker and a vignette over all of it;
- an announcer through a dull optical sound track over a brass march and a projector's clatter.

Landscape: the gate in the middle of the 16:9 frame, black bars left and right. Portrait: the gate across the width, the newsreel's masthead in the black above it, captions below.

Runtime: `runtime/newsreel.js` (`PROMO.newsreel(F, opt)`). New project:
- explainer (narrated report, the usual use): `node explainer/scripts/new.mjs <dir> --style newsreel`;
- promo: `node scripts/new.mjs <dir> --style newsreel`.

Starter pages: `styles/newsreel/explain.html` (narrated, hand-written, timed from the narration) and `styles/newsreel/index.html` (promo, one of each piece on the beat).

## 0. Safety
- **Material.** The look needs real pictures, and pictures carry rights:
  - the user's own photos and footage first;
  - otherwise only licence-clean archive material: CC0, public domain, CC BY (credited). Search with `node scripts/footage.mjs <project> search "<query>"` (Wikimedia Commons; its licence filter drops NC / ND / BY-SA / GFDL by default). **Tell the user what you want to fetch (file, source, licence, size) and wait for their OK** before `fetch`;
  - every file keeps its credit (`assets/src/<name>.json`, written by footage.mjs: `{ title, author, licence, date, url }`). `explainer/scripts/assets.mjs` puts it in the manifest; `R.photo` turns it into a source tag on the shot, a line in the end roll and a line in `out/CREDITS.txt`. A photo without a credit gets a warning — write the sidecar by hand if the user supplied it;
  - never AI-generated images presented as archive footage; never stills grabbed from news broadcasts, press photos or video platforms.
- **Honest dating.** A photo from 2012 shown in a story about 2026 says 2012 on its tag. Don't pass an old picture off as the event.
- **Reconstructions are labelled.** Whatever is drawn in code (`R.diagram`) carries `R.rebuilt(a, b)`, a sharp "示意 · 重建" tag that sits above the film damage.
- **The brand is fictional.** The newsreel's own name, ident and issue number are made up for the film (the starter uses "电光新闻 / Lightplay Newsreel"). Never a real broadcaster's or newsreel company's name, ident, music or title design.
- **Real people** appear only in licence-clean photographs, never as drawn look-alikes. Quotes are exact, with the outlet named on screen ("据 NBC News 报道").
- News content: facts with sources in brief.md and FACTS.md (`references/modes.md`, news mode). The end roll names the sources.

## 1. When to use
- **News and events retold**: a launch, a record, an announcement, "what really happened at …". The newsreel's voice (cheerful, a little pompous) fits announcements that promise a lot — and its intertitle question fits checking them.
- **History and "back then" stories**: the first flight, an old invention, a company's founding, with archive photos.
- **Product promos with a retro wink**: a launch told as "today's big news", when the product has real photos (its own, or the user's).
- Less suited: topics with no pictures at all (the film becomes all diagrams — use whiteboard or blueprint-type styles instead); colour-critical products (it's black and white); dense UI walkthroughs.

## 2. What it is (and isn't)
- **Essence**: a report. Every shot is a piece of evidence — a photo with its source, a stamped date, a measured number, a printed table — and the announcer strings them together. The film damage is the period's texture, never the content.
- **It is not**: a modern documentary with a sepia filter (no lower-thirds, no glossy motion graphics, no colour), nor a "glitch" or VHS look (that is the 1980s, not the 1930s), nor a parody that mocks its subject.
- Don't overdo the damage: the viewer must read every super and stamp. `damage: 0.6` for long or dense films.

## 3. Color
- Tones (`tone`):
  - `silver` (default): black and white with a faint warm cast;
  - `sepia`: browner, for "long ago" stories.
- Everything inside the gate goes through the film filter, so pick colours by **value**, not hue:
  - cream `#efe6d2` for type and lines on dark;
  - ink `#15120e` for type on paper;
  - paper `#e9e1cf` for calendars, price lists, the stopwatch dial;
  - dark grounds `#0b0a08` (cards), `#14120f`–`#1c1915` (pieces), `#1a1712` (diagrams).
- Supers on a photograph sit on a dark plate (`bg: 'rgba(10,8,6,.62)'`).
- Outside the gate is pure black; in portrait the masthead is cream on black.

## 4. Type
- Chinese: Noto Serif SC 700 / 900 (OFL), the heavy serif of period intertitles.
- Latin caps and numbers: Oswald 700 (OFL), condensed like period display type.
- Source tags: Special Elite (Apache 2.0), a typewriter face.
- Sizes are in gate units (gate height = 1000): intertitle main 190–260, supers 50–70, stamps 56–120, tags 24.
- Text enters with a 0.12 s fade (supers) or a slam (stamps: scale 1.6 → 1 in 0.14 s, with a stamp sound). Nothing types on character by character.

## 5. Motion
- Photographs **push** slowly (`from` → `to`, scale 1.0 → 1.1–1.18, the focus drifting toward the subject). A held photo is the medium: the style raises the still limit to 1.0 s (`F.stillMax`).
- Diagrams **draw on** (`D.draw`), then things move along them with eased curves; quick moves get `F.blur(a, b, 12)`.
- Calendar pages are torn off and thrown out of frame (fast on purpose); the stopwatch hand sweeps linearly.
- The film texture moves by itself: gate weave (smooth noise, a few gate units), a soft flicker, damage stepping at 24 fps. It is marked as texture, so the motion check measures the picture as if the gate stood still.

## 6. Camera and transitions
- **Hard cuts** are the grammar: `R.shot(a, b)` starts with a cut and a splice tick. One shot per line or per phrase; a long line can have two shots.
- **Iris** (`R.iris`): opens the film (the ident), closes it (the end), and marks a change of kind — from archive photos into a reconstruction (close then open, 0.3 + 0.45 s).
- **The question card**: the turn of the story is an intertitle question with the music dropped (`F.section(a, 0)`) and `F.scene(a, b, { role: 'drop' })`, so the information check knows it is meant to be words only.
- No pans across the gate, no zooms on cards, no wipes or slides — they are not of the period.

## 7. Sound
- Music (`styles/newsreel/score.js`): a brass march in B-flat — tuba oom-pah, snare and bass drum, a trumpet call, a glockenspiel on the big moment — through a dull, hissy optical track (lowpass, crackle bed). It plays on under the announcer, like a real newsreel, and drops to almost nothing on the question card.
- Voice: a bright, brisk announcer (`zh-CN-YunjianNeural` / `en-US-GuyNeural` by default, rate +10–15 %). `"voice_fx": "optical"` in script.json (the scaffolder sets it) band-limits and compresses the voice like an optical sound track. Other presets: `radio`, `phone`.
- Sound effects (`sound.js`): the projector under everything (ambience: shutter clatter, motor, hiss); `splice` on every hard cut; `iris`; `stamp` on stamps and cards; `page` for calendar pages; `tick` for the stopwatch; `whoosh`, `impact`. Add what the story's actions need (an engine, a crowd, a gas jet) with the palette words in `references/sound.md`.

## 8. Signature moves
- **The ident** (`R.ident`): a turning sunburst, the fictional brand, the issue number, a fanfare hit. Opens every film.
- **The intertitle** (`R.card`): the headline at the start, the question at the turn, 完 / THE END at the close.
- **The stamp** (`R.stamp`): a verdict slammed onto a photo — "首次亮相 2017.11.16", "延期", "售价未公布", "2028 年投产？".
- **The tear-off calendar** (`R.calendar`): dates and delays; each page stamped, torn off at the next.
- **The stopwatch** (`R.stopwatch`): a measured time, with who measured it.
- **The printed price list** (`R.ledger`): versions, prices, specs — a paper card with double rules.
- **The verdict** (`R.verdict`): what was seen ✓ / what was not ✗, after the question card.
- **The animated diagram** (`R.diagram`): how a thing works or what happened where no footage exists — always tagged as a reconstruction.
- **The quote on a portrait**: the photo in the left half (`box`), a rule and the quote in both languages on the right, the outlet underneath.

## 9. Images and video
- Photos go in `assets/src/` (with their `.json` credit), then `node explainer/scripts/assets.mjs <project>` builds `assets/manifest.js`. `R.photo(L, 'key', …)` reads it.
- The source tag defaults to "资料照片 · title · date · author · licence" from the credit. For a Chinese film, pass a short Chinese `tag` (the credit's title is usually English and long): `tag: '资料照片 · 2012 · 「蚱蜢」跳跃试验火箭 · SpaceX · CC0'`. `tag: false` hides it (the credit still counts).
- The end roll groups pictures by author + licence; `out/CREDITS.txt` lists every file with its title and URL (CC BY needs that).
- `out/captions-<aspect>.srt` is written with every render, for platforms that take subtitle files.
- Video archive clips are not supported yet (see §13): use stills.

## 10. Pitfalls and self-check
- **No credit**: a photo without a sidecar JSON prints a warning; the film must not ship with one.
- **Undated archive**: the tag must carry the year the photo was taken, especially when it is older than the story.
- **Reconstruction without a tag**: every `R.diagram` shot needs `R.rebuilt`.
- **Damage over type**: a scratch through a stamp is period; a hair across a number is not. Lower `damage` if stills show it.
- **Supers on busy photos**: use the dark plate; keep supers in the lower third or a clear corner, not over faces.
- **Long intertitles**: one line, ≤ 8 Chinese characters / 4 English words for the main line.
- **Music-only gaps**: the ident and the end roll are the only places without narration; keep the ident ≤ 3 s.
- Self-check per `references/review.md`; run `--check` (frame, motion, information) and `--stills` before the full render.

## 11. Variation
- Tone: `silver` ↔ `sepia`; gate `1.37` ↔ `'full'` (16:9 inside the frame, no side bars).
- Damage: 0.4 (clean print) ↔ 1.3 (a worn reel) — pick per story, not per shot.
- Brand: invent a new name and issue number per series (e.g. "环球影闻", "Weekly Wonders"); the same brand across a series makes it feel like a channel.
- Pace: a brisk report (a shot per phrase) ↔ a slower history piece (one photo per line, longer pushes).

## 12. API quick reference
```js
const R = PROMO.newsreel(F, { brand: { name, en, issue }, gate: 1.37 | 'full', tone: 'silver' | 'sepia', damage: 1, fonts, colors, captions });
// gate units: height 1000, width R.GU (1370 or 1778); R.g(v) → px
R.ident({ at: 0, until });                                   // brand ident (iris opens)
const L = R.shot(a, b, { bg, cut });                         // a shot; hard cut + splice unless cut: false
R.iris(a, b, dir);                                           // 1 opens, -1 closes (registered as a transition)
R.card(L, { a, b, main, sub, top, size });                   // intertitle
R.super(L, text, { x, y, size, anchor: 'l' | 'c' | 'r', a, b, bg, color, weight, font, kind, noFact, overlap, ls });
R.stamp(L, text, { x, y, size, rot, a, b, color, border });
R.photo(L, key, { a, b, from: { s, x, y }, to: { s, x, y }, pos, box: { x, y, w, h }, tag });
R.tag(text, a, b, { right });  R.rebuilt(a, b);
const D = R.diagram(L, { a, b, grid });                      // D.svg, D.path(d, attrs), D.line, D.circle, D.g, D.el(tag, attrs, parent), D.draw(el, at, dur)
R.calendar(L, { a, b, title, pages: [{ label, at }], stamp, note: { text, at } });
R.stopwatch(L, { a, b, from, to, value, label, unit, note: { text, at }, x, y, r });
R.ledger(L, { a, b, title, cols: [{ label, x }], rows: [{ at, cells: [], atCells: [] }], stamp: { text, at } });
R.verdict(L, { a, b, left: { title, items: [{ text, at }] }, right: { … } });
R.end({ a, b, main, sub, sources: [], notes: [], roll });   // 完, then (from roll) sources + grouped picture credits + notes; iris closes
F.scene(a, b, { role: 'drop' });                              // the question card: words only on purpose
```
Times: `a` = in, `b` = out; in a narrated film take them from the narration (`T.start`, `T.end`, `T.word`). Each piece registers its own information kind (photo, chart, compare, diagram).

## 13. Not supported yet
- No quick version (`--quick` / `kit.js` adapter): pages are hand-written.
- Archive video clips (conforming frame rate, grading them into the gate): stills only.
- Maps (an animated route on a period map) — draw it with `R.diagram` for now.
- Colour newsreel (1950s Technicolor look).
