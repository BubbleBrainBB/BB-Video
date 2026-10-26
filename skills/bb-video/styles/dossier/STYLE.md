# Clipping-file commentary (剪报解说, `dossier`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

One frame: modern finance / current-affairs commentary built from paper. Either
- a **newspaper clipping**: grey newsprint with grain and a dot screen, dense columns of small type, a heavy Song headline with a yellow-green highlighter stroke under it, an English subhead in grey capitals running off the edge, a black-and-white halftone photo; the camera drifts in; or
- a **source document** (a press release, a filing, a central-bank statement) re-typeset in our own layout under an **invented masthead** (white serif capitals on a black bar): the camera pushes from the whole page into the one line being quoted, and a **red or blue translation bar**, a **small black tag** or a **highlighter** lands on those exact words; or
- a **sheet flying in** over a picture, a printed chart or table, a **data callout** (an icon, 11.6% → 45.3%), a **thumbnail-style title card** (two lines of huge bevelled white type over a dramatic picture).

Shots change by dissolve, by a brief defocus, or by an **ink-brush smear**. A **chapter bar** runs across the top with every chapter named and the current one in a white pill. **Bold white captions with a dark outline** sit at the bottom, the channel mark in the corner. Grain and a vignette sit over everything.

Runtime: `runtime/dossier.js` (`PROMO.dossier(F, opt)`). New project:
- explainer (the usual case: narrated commentary): `node explainer/scripts/new.mjs <dir> --style dossier`;
- promo (a launch or a story told as clippings, on the beat): `node scripts/new.mjs <dir> --style dossier`.

Starter pages: `styles/dossier/index.html` (one of each piece, on the beat) and `styles/dossier/explain.html` (narrated, timed from the narration).

## 0. Safety
- **Our own masthead and channel.** `masthead` (the starter's "THE LEADTYPE POST") and `brand` ("铅字局 / LEADTYPE") are invented; invent new ones per channel if you like. Never a real outlet's name, masthead, logo or layout.
- **Real documents, our layout.** A document on screen is a short verbatim excerpt of a real primary source (company press release / investor-relations page, SEC filing, central-bank statement, exchange notice), re-typeset by `S.doc` with its **source line visible**. Never a company's logo, letterhead or trade dress; never a whole paywalled article.
- **Every word on paper is in brief.md**: headlines, translations, tags, numbers, the excerpts themselves, and the articles printed on a clipping page (the fact check compares them). A clipping page carries real reporting we wrote from those facts — never filler, never repeated copy — and says 本台整理 in its top strip.
- **Photos**: code-drawn pictures (`R.art`) or licence-clean photos only (the user's own, CC0 / public domain / CC BY with credit), fetched with `scripts/footage.mjs` after telling the user what, from where, which licence and the size, and waiting for their OK. **Never AI images passed off as news photos. No drawn look-alikes of real people**; avoid photos of real executives unless licence-clean and necessary.
- **Markets**: commentary, not advice. Use compose's `disclaimer` ("仅为新闻解读，不构成投资建议") and never a buy / sell call or a price target of your own.

## 1. When to use
- News and finance commentary: earnings, markets, central banks, policy, industry shake-ups, "what this filing really says".
- Anything whose evidence is documents: rulings, regulations, announcements, reports, letters — showing the source and pointing at the line is the point.
- Less suited: stories with characters (use shadow / ink / chat), processes and systems (isometric), product UI tours (launch / toy3d), cheerful consumer topics.

## 2. What it is (and isn't)
- **Essence**: evidence on paper. The viewer sees the page, then the camera goes to the line and the line is translated, tagged or marked as it is said. Paper first, B-roll second.
- **It is not** `newsreel` (an old film: 1.37 gate, scratches, intertitles, a march) and not `riso` (spot-colour magazine pages). It is a modern desk: clean white documents, grey newsprint, vivid red / blue bars and a yellow-green marker on top, a sober grade.
- Don't overdo it: one annotation per sentence; at most two bars on one view; title cards at chapter turns only.

## 3. Color
- Paper: newsprint `#d9d7cf` (grain, fibres, a dot screen), document white `#f3f2ee`, desk `#1c1c1c`.
- Ink `#151515`; grey English subheads `#8e8d88`.
- Accents are the only colours and stay vivid: highlighter `rgba(206,232,38,.82)` (multiply), translation red `#c81e28`, translation blue `#22309a`, tags black `#121212`.
- Photos are black-and-white (halftone on paper, graded grey full-frame). The grade (`grade: { saturate: .88, contrast: 1.06 }`) keeps the accents alive; grain 0.5, vignette 0.55.

## 4. Type
- Chinese headlines and translations: Noto Serif SC 900 / 700 (heavy Song, like a newspaper). Body copy on newsprint: Noto Serif SC 400.
- Captions, tags, callouts, title cards: Noto Sans SC 900 / 700 (bold, outlined white over pictures).
- English documents: Inter (releases), Source Serif 4 (filings, statements); masthead and English subheads: Playfair Display 700. All OFL.
- Title cards: ≤ 8 characters a line, two lines (`--check` warns). Callout numbers 100–140 units; captions 46 units.

## 5. Motion
- The camera always moves: a slow drift (4 % over a shot) plus pushes between keys (`S.cam`) that take 0.8–1.6 s with ease-in-out.
- Paper arrives by `enter`: `fly` (rotated in from the right, lands with a whoosh and a paper slap), `drop` (settles from slightly above), `rise`, `fade`; leaves by `exit: { at, to }`.
- Annotations arrive on the words: bars wipe left to right (0.4 s), the marker sweeps line after line, tags pop, rings draw on.
- Numbers roll (`S.callout` from → to) or step in (from, →, to).

## 6. Camera and transitions
- **Whole page → one line**: `S.cam(a, { x, y, h })` then `S.cam(t, { on: target, pad: 1.15–1.4 })` — `on` frames a target (`sheet.find('words')`, `sheet.block(i)`, `table.row(i)`, a sheet); `level: true` rolls the camera to a tilted sheet.
- **Dissolve** (`in: 'dissolve'`) between clippings; **defocus** (`in: 'blur'`, or `S.defocus(a, b)` for a focus pulse inside a shot) into a document; **brush smear** (`in: 'brush'`) into a picture or a new chapter; hard **cuts** on title cards.
- **The inset** (`R.inset(a, b)`): a stretch of B-roll held inside a dark crumpled frame, like the reference programmes' second half.

## 7. Sound
- Music (`styles/dossier/score.js`): a tense desk bed in A minor — dark string pad, a felt pulse, a sparse piano question, off-beat ticks; sections `open` / `report` / `turn` / `close`. It ducks under the voice.
- Sound design (`sound.js`): `whoosh` (fly-ins, dissolves), `brush`, `paper` (a sheet lands), `marker`, `swipe` (a translation bar), `pin` (tags, callouts, bullets), `tick` (table rows), `roll` (a rolling number), `impact` (title card lines). Faint room tone under it all.
- Voice: a calm, fast commentator (`zh-CN-YunyangNeural`, rate +6 %) — the explain.json default.

## 8. Signature moves
- **The highlighted headline** (`S.page({ headline, mark: true })`).
- **Push to the line** + **translation bar** over / above it (`S.translate`, blue over the line, red above it).
- **The pinned tag** beside the exact words (`S.tag`: "删除", a company's Chinese name, "自由现金流").
- **The fly-in**: a document lands rotated over a picture, then the camera pushes into it.
- **The brush smear** between chapters.
- **The thumbnail title card** at a chapter turn (`R.title`).
- **The callout**: an icon and a number rolling from → to (`S.callout`).

## 9. Paper (the sheets)
All sheets live in the shot's world (x / y = top-left, w / h in world units; the frame is `R.FW × 1000` at the default view), take `{ at, enter, exit, rot, z }`, and return a handle with `find(text, nth)` (wrap those exact words as a target) and `box()`.
- `S.page({ headline, mark, markAt, en, enSize, sub, date, section, masthead, note, photo, photo2, lead, stories: [{ head, text }], left: [{ head, text }], columns: 2, bodySize: 23, w: 1900, h: 1180, size })` — the newspaper page. **The small print is real reporting**: write short articles from the facts in brief.md (`text` is a paragraph or a list of them); they flow down the columns once, each ends with ■, and a column that runs out of copy just ends — never repeat copy to fill a page (with no `stories`, the narration is printed once). Every paragraph is checked against brief.md. `note` (default 本台整理) marks the page as our own compilation, not a real newspaper. `page.head` / `page.lead` are targets; `page.headMark` the marked part.
- `S.doc({ stack, kind: 'release' | 'filing' | 'statement' | 'notice', masthead (false = none), issuer, form, title, sub, date, blocks: [{ h } | { p } | { li } | { table: { head, rows } } | { gap }], source, w: 1200 })` — `doc.block(i)` is block i, `doc.titleT` the title, as targets. Keep excerpts short and verbatim ("…" for cuts). `stack: true` on sheets laid over each other on purpose (the text checks allow the overlap).
- `S.photo(src, { w, h, caption, halftone: true, tone, border })`, `S.backdrop(src, { tone: 'muted' | 'bw' | 'color', halftone })`.
- `S.chart({ title, unit, kind: 'line' | 'bars', labels, series: [{ values, color, colors }], min, max, points: [{ i, text, at }], note: { text, at }, source, dur })`.
- `S.table({ title, cols, rows: [{ cells, at, mark: 'up' | 'down' }], source })` — `table.row(i)` is a target.

## 10. Pictures
- `src` is a painter in `R.art` — `skyline` (a city at dusk), `servers` (a data-centre aisle), `wafer` (a silicon wafer), `chip` (a package on a board), `facade` (a generic columned building — not a real one), `screens` (a wall of candle charts, no numbers) — a function `(c, w, h, o)` of your own, or a photo key from `assets/manifest.js` (its credit becomes a source tag and a line on the end sheet).
- On paper, pictures are halftoned (`R.halftone(canvas, { cell, contrast, bright, paper, ink })`); full-frame they are graded (`tone`).
- Code-drawn pictures are illustrations, never "photos" of a real event; when a real place matters, use a licence-clean photo.

## 11. Pitfalls and self-check
- **Gaps**: the user dislikes 1–2 s with only music. Every sentence gets a move: a push, a bar, a tag, a new sheet. `--check` lists "没有新动作" — fix every one.
- **Reading**: at the pushed-in view the quoted line must be big (pad ≤ 1.4); English body copy elsewhere is texture, the translation carries the meaning.
- **Bars and tags** must not cover the words they explain unless `mode: 'over'` (then the bar *is* the line); check the stills at the moment each lands. When the camera moves on to the next line, lift the last bar (`until`) instead of stacking bars.
- **Pushing past the headline**: when the camera pushes from a page's headline into its lead, `--check` may say the headline is too close to the top — that is the push, not a layout fault.
- **Chapter bar and captions** must not collide with headlines: keep headlines ≥ 100 units from the top, nothing important below 860.
- **Pictures**: look at every painter in `--stills`; a halftone that turned solid black needs `ht: { bright }`.
- Self-check per `references/review.md`: `--check`, `--stills`, then the full render and its frame check (brush and blur transitions are registered; a flagged jump that is not one is a bug).

## 12. Portrait (9:16)
- Default `portrait: 'band'`: the 16:9 film plays in a band across the tall frame (from 30 % down), exactly as these programmes are watched on phones. Above it: the chapter bar and the programme title (`opt.title`, else the page `<title>` before " · "; `title: false` hides it); below it: the captions. Every landscape shot, camera key and layout is reused unchanged — render with `--aspect 9:16`, nothing else to write.
- `portrait: 'fill'`: paper on the full tall frame (write portrait camera framings yourself).

## 13. Variation
- Paper: newsprint pages ↔ white documents ↔ charts on the desk.
- Accent: blue bars ↔ red bars; marker yellow-green ↔ orange (`colors.mark`).
- Pace: a long push into one line ↔ a run of fly-ins.
- Grade: sober grey (default) ↔ fully black-and-white (`grade: { saturate: 0 }`) ↔ warmer paper.
- Ending: a closing title card question ↔ the end sheet straight away.

## 14. API quick reference
```js
const R = PROMO.dossier(F, { brand: { name, en }, masthead, title, portrait: 'band' | 'fill', grade: { saturate, contrast, brightness, grain, vignette }, chapters: [{ title, start, end }] | false, logo, captions: { size, top, max } | false, colors, fonts });
// world units: frame height 1000, width R.FW; R.g(v) → px
const S = R.shot(a, b, { bg: 'desk' | 'news' | 'paper' | 'dark' | css, in: 'cut' | 'dissolve' | 'blur' | 'brush', dur, drift });
S.cam(t, { x, y, h } | { on: target, pad, dx, dy, h, r, level }, ease);  S.push(from, to, a, b, ease);  S.defocus(a, b, px);
S.page({…}) / S.doc({…}) / S.photo(src, {…}) / S.backdrop(src, {…}) / S.chart({…}) / S.table({…})   // sheets: { x, y, w, h, rot, at, enter, exit, z }
sheet.find(text, nth) / doc.block(i) / table.row(i) / page.head → targets
S.mark(target, { at, dur, color, height, until });  S.translate(target, zh, { at, until, color: 'blue' | 'red', mode: 'over' | 'above' | 'below' | 'right', size, w });
S.tag(target, text, { at, until, side: 'left' | 'right' | 'above' | 'below', color, size });   // until: lifts off again so the next one has room  S.circle / S.underline / S.strike(target, { at, dur, color });
S.callout({ at, b, x, y, anchor: 'c' | 'l' | 'r', icon, from, to | value, label, size, dur });  S.bullets(items, { at | [ats], x, y, size, gap });  S.box(text, { at, until, x, y, size });  S.source(text, { at });
R.title(a, b, { lines, art, tone, in, size, x, y, stagger });  R.inset(a, b, { scale });  R.end(a, b, { title, sub, sources, notes });
R.art.skyline / servers / wafer / chip / facade / screens;  R.halftone(canvas, o);  R.icons (chip, up, down, bank, dollar, oil, server, calendar, cloud, chart)
```

## 15. Not supported yet
- No quick version (`--quick` / `kit.js` adapter): hand-written only.
- Footage plays only as stills (`S.backdrop` with a photo); film clips are not wired in (newsreel's `R.clip` shows how).
- Paper is flat (no curl, no folds); page turns are dissolves.
- Portrait 'fill' (`portrait: 'fill'`) lays the paper on the tall frame itself; the starters' framings are written for landscape, so it needs portrait framings of your own.
