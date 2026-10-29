# Style: paper-collage news explainer (纸艺拼贴新闻解说, `collage`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

A frame is a view of one table covered in paper, seen in 2.5D and filmed in **one take**. Torn-edge pieces lie on it:
- halftone black-and-white photos with a white torn fringe and their credit on the source line;
- faded protest-poster layers underneath, soft and washed out;
- red rubber stamps;
- a typewriter quote that types itself on, then gets a highlighter sweep;
- masking tape and push pins.

Information is told with paper props:
- a paper-doll grid that turns red;
- a plan of cells marked by hand;
- a red thread pinned along a timeline with year tickets and photos;
- index cards with redaction bars;
- cut-paper bars on notebook paper;
- a ladder and a podium with country cut-outs;
- a line chart on graph paper with flag pins riding the lines;
- a big serif character printed on a certificate.

The camera never cuts. It floats, pushes into a piece, pulls out, and travels across the table to the next one. Far moves lift and land again, with depth of field softening the far edge. A full red sheet is the title card, and a spotlight can darken everything but one piece. The chrome is fixed: channel / chapter top left, date and place top right, a source line at the bottom.

Runtime: `runtime/collage.js` (`PROMO.collage(F, opt)`). New project:
- explainer (the usual case: a narrated news explainer): `node explainer/scripts/new.mjs <dir> --style collage`;
- promo: `node scripts/new.mjs <dir> --style collage [--quick]`.

Starter pages: `styles/collage/explain.html` (narrated, timed from the narration) and `styles/collage/index.html` (promo, on the beat).

## 0. Safety
- **Every word on paper is real and in brief.md.** That covers labels, poster words, quotes, card lines, axis notes and stamps. Small print is printed once. It is never filler: no grey "text lines", no lorem, no repeated copy (`--check` warns when the same line is printed on two pieces). Background posters carry only real keywords of the story (`C.bed({ words })`) or no words at all.
- **Photos**: licence-clean only (CC0, public domain, CC BY with credit), fetched with `scripts/footage.mjs` after telling the user the file, source, licence and size and waiting for their OK. The credit joins the bottom source line by itself while the photo is on screen.
- **Drawn pictures are illustrations.** A painter (`R.art`: bars, coins, vault, screens) is stamped 示意 / ILLUSTRATION on the print. Never a drawn "photo" of an event, never AI images as footage, and no drawn look-alikes of real people. For a person, use a licence-clean photo or a name card (`C.card`).
- **Our own channel name** (`opt.channel`, the starter says 拼贴社): never a real outlet's name, logo or layout. A quote's dateline may name its real source (`KITCO NEWS · 14.10.2026`) as a citation.
- Markets: news, not advice. Never a buy / sell call or a price target of your own.

## 1. When to use
- News explainers with history behind them: protests, elections, debt, prices, policies, "why this happened".
- Stories told with evidence on paper: archive photos, quotes, numbers, a timeline, a ranking, a map cut-out.
- Less suited:
  - stories with characters acting things out (use shadow / ink / manga);
  - product UI tours (launch / toy3d);
  - mechanisms (blueprint).

## 2. What it is (and isn't)
- **What it is**: one table, one take. The viewer is led from piece to piece, and each sentence gets its own paper prop. The props carry the information: dolls for a share, a thread for a timeline, bars for amounts, a ladder for a rank.
- **What it isn't**:
  - `dossier` (cuts between documents, translation bars, outlined captions over B-roll);
  - `cutout` (Matisse gouache shapes);
  - `newsreel` (an old film gate).
- No flat slides. Every piece lies on the table at an angle, with a shadow and a torn or cut edge.

## 3. Color
- Table: `palette: 'news'` (cream `#e7dfc9`, default), `'ledger'` (pinkish `#e8d5cb`), `'archive'` (grey `#d9d3c4`).
- Ink black `#1d1b18`. Protest red `#b3282d` is the accent: stamps, big printed characters, the thread, hot dolls, notes. Muted blue `#3f5e93` and green `#3f7a55` are for series, bars and country cut-outs. Highlighter yellow `rgba(246,214,58,.78)`.
- Poster layers use faded paper colours (rose, slate blue, putty, ochre, sage, grey). They are washed with the table colour and slightly blurred.
- Photos are black-and-white halftone on cream paper. The brand tint (`KITS.collage.tint`) turns a vivid brand colour into the red ink. Grey and black brands keep the red.

## 4. Type
- Noto Serif SC 900 / 700 / 500: big printed characters, labels, card titles, notes.
- Courier Prime 400 / 700: typewriter quotes, datelines, English sub-lines in capitals.
- Special Elite: year tickets and ranks.
- IBM Plex Mono: chrome and axis ticks.
- Playfair Display 900 / Oswald 700: poster words.
- Noto Sans SC: card lines and captions.
- All are OFL or Apache, loaded from jsDelivr in the starter's `<head>`.
- Sizes are in table units (frame height 1000 at h = 1000):

  | Text | Size |
  |---|---|
  | big character | 220–520 |
  | numbers | 120–200 |
  | labels | 40–64 |
  | quote | 40–48 |
  | card lines | 26–30 |
  | notes | 34–62 |

- Phone rule: each scene needs one line about 45 px tall on the frame. `--check` reports scenes without one ("手机上读不清").

## 5. Motion
- Pieces arrive by `enter`:
  - `drop` (lands from slightly above, its shadow tightening);
  - `slap` (a quick slap, for strips and pins);
  - `slide` (from off-frame, `from: 'left' | 'right' | 'top' | 'bottom'`);
  - `wipe` (torn in left to right);
  - `fade`;
  - `none` (laid out before the camera arrives).
- Pieces leave by `exit: { at, to: 'left' | 'right' | 'up' | 'down' | 'lift' }`.
- Text is never switched on:
  - quotes type on (`cps`);
  - notes write left to right;
  - numbers roll in fixed-width tabular digits;
  - big characters press in with a little ink spread;
  - stamps slam (scale 1.5 → 1 in 0.14 s);
  - bars are laid in;
  - chart lines draw on and reach each note as it lands.
- Marks land on exact words: `C.mark` (highlighter), `C.redact` (black bar), `C.ring`, `C.strike`, `C.underline`.

## 6. Camera and transitions
- **One take.** `C.cam(t, view)` sets a key. `C.move(a, b, view)` holds the last view at `a` and arrives at `b`. `view = { on: piece | target | C.group(…), pad }` frames the subject inside the safe band, between the chrome and the captions. `{ x, y, h, tilt, roll }` sets it directly.
- Moves of about 1–1.4 s between neighbours. A far move (> 0.8 frame) lifts the camera (zooms out mid-way), blurs in between and whooshes: still one take, never a cut.
- The camera floats like a hand-held camera (`float`). The table is tilted (`tilt`, default 9°), and depth of field softens its far and near edges (`dof`). `C.defocus(a, b, px)` adds a focus pulse.
- **Title sheet** `C.title(a, b, { text, sub, photo, x, y })`: a full red sheet elsewhere on the table. The camera flies to it and the characters slam on. Use it at a chapter turn, ≤ 6 characters a line.
- **Spotlight** `C.spot(a, b, { on, r, dark })`: everything outside a soft circle darkens.
- **Portrait**: default `portrait: 'fill'`. The same table is seen through a tall frame, and framings with `on` fit themselves. Give pieces a portrait layout with `C.L(landscape, portrait)`. `portrait: 'band'` plays the landscape film in a band.

## 7. Sound
- Music (`styles/collage/score.js`): a documentary news bed in D minor that leans forward:
  - a low sub that breathes;
  - a plucked music-box motif asking the question;
  - pizzicato walking under the facts;
  - a soft ticking clock.

  The turn thins to the swell and a low thump before the title sheet; the close opens to a suspended chord. It ducks under the voice. The reference programmes run on music alone, so a promo may too (no voice).
- Sound design (`sound.js`):
  - paper: `paper` (lands), `slide`, `slap`, `tear`;
  - `stamp`, `press` (a character or number printed);
  - typewriter: `key` / `ding`;
  - `marker`, `pencil`, `snip` (doll rows), `ink` (dolls turn), `string` (the thread), `pin`, `wood` (ladder), `roll`;
  - `travel` (a long camera move), `lamp` (spotlight), `impact` (title sheet).

  A faint room tone sits under it all.
- Voice: a steady male news voice, `zh-CN-YunjianNeural`, rate +4 % (the explain.json default). Write numbers as numerals in script.json: Edge TTS reads 1971年 / 89% / 5318美元 correctly, and the captions show the numerals.

## 8. Signature moves (pick per film)
- **The travel**: the camera lifts off one piece and lands on the next, the table blurring by.
- **The pinned thread**: a red thread pulled pin to pin through the years, a ticket and a photo at each pin (`C.timeline`).
- **Dolls turning red**: a share told in people (`C.dolls`, `hot`).
- **The typed quote**: types on, the highlighter sweeps the key words, the translation writes under it (`C.type`).
- **The stamp**: one word slammed at an angle (`C.stamp`), about one every 8 s at most.
- **The red title sheet** (`C.title`).
- **The certificate character**: a huge serif character printing onto a bond (`C.glyph`).

## 9. Telling information (paper props)
| Content | Prop | Call |
|---|---|---|
| A share | paper dolls, `hot` of them turn red | `C.dolls({ n, cols, size, hot, hotAt })` + `C.number` |
| Amounts | cut-paper strips on notebook paper, value typed at the end, a red bracket between two | `C.bars({ rows: [{ label, value, text, color, at }], brace })` |
| A trend | line chart on graph paper; flag cut-outs ride the tips; notes with dashed leaders; a highlighter band; a shaded gap between two series | `C.chart({ series, xAxis, yAxis, notes, band, gap })`, `ch.region(x0, x1, y0, y1)` / `ch.point(si, x)` as camera targets |
| History | red thread, pins, year tickets, labels or photos | `C.timeline({ events: [{ year, text, en, photo, caption, at }] })`, `tl.view(i)` |
| A rank | wooden ladder with stickers sliding to their rung (`item.to(at, rung)` moves one); a cardboard podium | `C.ladder({ rungs, items })`, `C.podium({ places })` |
| A plan / a form | a grid of cells inked in, single cells filled or crossed, then a stamp | `C.plan({ cols, rows, marks })` |
| Who | an index card with a photo (licensed) or just the name, real lines, redaction bars | `C.card({ title, sub, lines, redact })` |
| A place | a country cut-out from Natural Earth (main landmass; `near`, `bbox` to choose) | `C.country(name, { color, label })` (page needs topojson-client) |
| A quote | typewriter sheet, highlighter, translation, attribution | `C.type({ head, text, by, tr, mark })` |
| A number | rolled, printed red or ink, with a line under it | `C.number({ from, to, unit, sub })` |
| A key word | the big printed character; a certificate | `C.big`, `C.glyph` |
| The source | the bottom line (credits of photos on screen join it) | `C.source(at, text, until)`, `C.dateline(at, text)` |

The quick version and the generic explainer reach these through the kit:
- steps: tickets pinned on a red thread;
- contrast: two torn sheets, the winner ringed in red;
- numbers: strips on notebook paper;
- a spot on a real UI: a lens with a red rim.

## 10. Pitfalls and self-check
- **Gaps**: every sentence moves to its own piece or lands a mark. Moves are about 1 s; the camera never parks more than ~6–9 s (`--check`: 镜头停太久).
- **Too fast**: a move under ~0.8 s reads as a jump cut (`--check`: 甩镜太快). The lift needs time.
- **Overlaps**: give a strip with a sub line its full height (the runtime sizes it). Keep notes off chart lines (`ly`) and stamps off the words they stamp. `--check` lists text overlaps.
- **Under the chrome / captions**: frame with `on` (the safe band does it). `--check` reports text under the header or source line when the camera lands (压住页眉页脚).
- **Posters behind numbers**: background words are washed and soft, but keep big words of the bed away from where key numbers sit, especially in portrait.
- **Width estimates**: strips size themselves from the text. When a label is cut on the right, pass `w`.
- **Motion sheet**: the table is marked `data-motion="texture"`, so pieces are measured as if the camera stood still. The camera has its own checks (too fast, parked, hard cuts).
- Look at `--sheet` / `--stills` in both aspects, then the full render's frame check.

## 11. Variation
- Table: news cream ↔ ledger pink ↔ archive grey; dense poster beds ↔ a clean table for charts.
- Accent: red ↔ a brand colour (`colors.red`). Series colours: blue / green.
- Camera: long floats with slow pushes ↔ brisk travels from piece to piece; tilt 4–14°.
- Chapters: a red title sheet ↔ a spotlight ↔ simply the next piece.

## 12. API quick reference
```js
const C = PROMO.collage(F, { channel, palette: 'news' | 'ledger' | 'archive', tilt: 9, dof: 1, float: 1, grade: { grain, vignette }, safe: [top, bottom], captions: { size, max, top } | false, chrome: true, portrait: 'fill' | 'band', colors, fonts });
// table units: frame height 1000 at h = 1000, width C.FW; C.L(landscape, portrait)
C.cam(t, view, ease);  C.move(a, b, view, ease);  C.defocus(a, b, px);  C.spot(a, b, { on, r, dark });
view = { on: piece | target | C.group(p1, p2…), pad, dx, dy, tilt, roll, level } | { x, y, h, tilt, roll }
// every piece: { x, y, w, h, rot, at, until, enter: 'drop' | 'slide' | 'slap' | 'wipe' | 'fade' | 'none', from, exit: { at, to }, depth: 'back' | 'table' | 'top', paper, torn: 'tlbr' | '', tape: ['tl','tr','t'…], pin, z }
C.piece(o) → { face, find(text), view(pad), wbox() };  C.photo(src, { w, h, caption: { zh, en }, halftone, cell, credit, illus });  C.poster({ text, sub, color, font: 'caps' | 'grot', dots });  C.bed({ x, y, w, h, words, seed, n });
C.label(text, { sub, size, font: 'serif' | 'type' | 'old', paper });  C.big(text, { size, color });  C.stamp(text, { sub, size, rot, color });  C.note(text, { size, color });
C.type({ head, text, cps, by, tr: { text, size }, mark: [{ text, at }] });  C.mark / C.redact / C.ring / C.strike / C.underline(target, { at, until });
C.dolls({ n, cols, size, gap, hot, hotAt, hotDur });  C.plan({ cols, rows, title, sub, marks: [{ cells, mark: 'fill' | 'cross', at }] });  C.number({ from, to, value, decimals, prefix, unit, sub, color });
C.timeline({ x, y, w, events: [{ year, label, text, en, photo, caption, at, side }], scale: 'even' | 'time' }) → { ev(i), view(i, pad) };
C.card({ title, sub, lines, photo, redact: [{ text, at }] });  C.bars({ title, sub, rows: [{ label, value, text, color, at }], unit, barW, rowH, labelSize, valueSize, brace: { rows: [i, j], text } });
C.ladder({ title, sub, rungs, items: [{ country | text, rung, color, label, at }] }) → items[i].to(at, rung);  C.podium({ places: [{ rank, country, label, color }] });
C.chart({ title, titleSize, sub, xAxis: { from, to, ticks }, yAxis: { min, max, ticks, unit }, series: [{ values: [[x, y]…] | [y…], color, tag, flag, at, dur }], notes: [{ x, series, text, at, align, ly }], band: { from, to, text, at }, gap: { series: [a, b], from, to, text } }) → region(x0, x1, y0, y1) / point(si, x);
C.glyph({ char, head, serial, lines: [{ text, at }], size, charAt });  C.country(name, { w, h, color, label, near, bbox });
C.title(a, b, { text: ['两字'], sub, photo, x, y });  C.end(a, b, { title, sub, sources, notes });  C.dateline(at, text);  C.source(at, text, until);
```

## 13. Not supported yet
- Paper is flat: no curl or folds. Pieces lift only as a shadow change.
- Depth of field is a band blur over the tilted table (backdrop-filter), not true per-piece focus. `depth: 'back'` pieces are always soft.
- Maps: country cut-outs only. For a street or city map use the `map` style, or a licence-clean map image as a photo.
- Video clips on paper are not wired in; photos are stills.
- No characters (`../CHARACTERS.md`): people appear as licence-clean photos or name cards.
