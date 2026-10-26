# The styles' common interface and the quick version

The user picks only the **style**. So that any telling (the start of `references/structure.md`) can play in any style — including **explainers in promo styles and promos on the explainer boards** — eight styles implement the same set of **common moves** (`runtime/kit.js`): launch motion, origami, pop, op and cut-out use their own components; whiteboard, riso and ink bring the explainer board (`explainer/runtime/`) into the promo. On top of it sits a **quick version** (`PROMO.film` in `runtime/formats.js`): write one script, change `style`, and you have the film in another style.

Both are internal tools, not something the user chooses:
- **When to use the quick version**: the user wants to "see a few styles first / pick one", wants a version fast, or a series needs a shared structure. It is a "big type first" telling (big words, explanatory lines, lists, screenshots, numbers, end card).
- **When not to**: for a polished film about one product, write it by hand as usual — with the style's own components (`O.sheet`, `K.panel`, `Q.field`, `C.piece` …), mixed with the common moves if you like.
- **Adding new capabilities later** (e.g. "product entrance", "UI walkthrough"): add them as new moves in the common interface and implement them in every style; don't open a separate "type" for the user to choose.

## Quick version

```bash
node scripts/new.mjs videos/<name> --style op --quick     # index.html is a script skeleton; fonts are the style's own
```

```js
PROMO.film({
  style: 'op', bpm: 120,
  kit: { /* the style's own options, e.g. op's colors, cut-out's palette, origami's papers */ },
  scenes: [
    { cues: [{ say: ['MEET', 'GROK BOT'], line: 'AI teammates you can give real work to.', accent: true }] },
    { cues: [{ list: ['Sales Outbound', 'Talent Scout', 'Chief of Staff'], title: 'Give each Bot a job' }] },
    { cues: [{ shot: 'shots/app.png', caption: 'Message Bots like teammates' }] },
    { cues: [{ stat: '36', label: 'drafts queued', accent: true }, { say: ['Send it.', 'Done.'] }] },
  ],
  end: { title: 'Grok Bot', tagline: 'AI teammates that finish the work', url: 'x.ai/bot' },
});
```

Colours come from the product: write `brand: '#brandcolour'` (research lists candidates in `research/colors.json`; brief.md has a line "颜色：…（来自：…）" — Colours: … (from: …)), optionally `accent` (a second colour). **Each style lands it in its own material** (`PROMO.kit.brand(style, { brand, accent, ground })` → `{ theme, kit, color }`): op makes it the stripe colour, pop replaces the closest primary, cut-out / origami replace the closest paper, whiteboard gets a brand-colour marker, riso switches to the closest real Riso ink, launch / ASCII use it as the accent (the ground is chosen separately: `ground: 'light' | 'dark' | 'brand'`), Bauhaus replaces red with the brand colour (too light a colour becomes an accent); ink has only ink and cinnabar and shadow puppetry only a few leather dyes, so they don't change. When the brand colour is black / white / grey (many tech companies) the style keeps its own colours and uses `accent` if there is one. Hand-written films: `const { theme, kit } = PROMO.kit.brand('op', { brand })` → `compose({ theme })`, `PROMO.op(F, kit)`. `--check` warns when brief.md doesn't say where the colours came from, or when research found a brand colour that the film doesn't use.

Total length, cover frame, music sections and transition times are all computed by the script (all on the beat); landscape and portrait layouts are handled automatically (portrait avoids the top 8% and bottom 20%). The same script works in every style: change `style` and nothing else.

One background per scene (`variant` changes the pattern / colour; if omitted, it rotates by scene order), with the style's transition between scenes. The cues inside a scene play one after another:

| cue | Picture | Default beats |
|---|---|---|
| `{ say: 'word' \| ['a few', 'words'], every: 2, line }` | Big words slam in one at a time, each held `every` beats; `line` = an explanatory line under the last word | words × every (+3 with line) |
| `{ line: 'One sentence' }` | Just an explanatory line | By length: 0.9 s + 0.3 s per word |
| `{ list: [...], title, every: 1, hold: 3 }` | Title first, then one item per beat down the list | (items + 1) × every + hold |
| `{ shot: 'shots/x.png', caption, fit, ratio }` | A real screenshot (unaltered) + a caption. Logos / icons use `fit: 'contain'`; give SVGs without intrinsic size a `ratio` (width / height) | 5 |
| `{ stat: '36', label }` | One big number + what it is | 4 |

Every cue can add `beats` (total beats), `size` (design size of the big type), `accent: true` (the style's signature move as it lands). A scene's `energy` (0–3) sets music intensity, 3 = an impact at the start of the section (usually not needed: set by the `role` below).

Rhythm (guaranteed automatically):
- A cue's elements are cleared before the next cue starts to appear: no overlapping text, no gaps.
- The last cue of a scene holds until the transition covers it; after the transition covers, one empty beat, then the new scene's text.
- Each scene's camera follows the rhythm sheet (next section); not every scene is the same slow push (that feels like "flipping slides").

When writing the script:
- `say`: at most three or four words per cue, two or three look best; explanatory lines are one sentence (default design size 50–58, readable on a phone).
- **Every piece of text must be in brief.md** (case and punctuation differences don't matter; the check ignores them).
- Screenshots use real material only; if you can't capture one (the site has a bot check), use the page's public logo / icon instead, or skip `shot`.

### Rhythm sheet: one sheet drives the whole film (our approach)

Hand-written films (`PROMO.compose`) have no automatic rhythm sheet: mark sections with `F.section(at, intensity, { name: 'hook' | 'build' | 'burst' | 'drop' | 'resolve' })`; `--check` builds a rhythm sheet from those sections (name as the role), and after rendering it is compared with the measurement as usual.

A film's rhythm isn't just every element landing on the beat; it also needs an **overall shape**: a hook in the first 3 s → climbing step by step → a montage burst in the middle (30–60%) → the drop (the strongest hit, with a beat of stillness before it) → the close. In the quick version each scene gets a `role`, and that one word decides four things:

| role | What it is | Music | Camera (DOM styles) |
|---|---|---|---|
| `hook` | Opening hook | Intensity 1 | `reveal`: pull out from a close-up of the first element |
| `build` | Climb | Intensity 2; when the next scene is burst / drop, this scene **builds** (low-pass from muffled to bright) | `glide`: slow sideways slide |
| `burst` | Montage (holds the `montage`) | Intensity 3, one sound effect per cut | `hold`: the cutting itself is the motion |
| `drop` | The drop (the film's most important line) | Intensity 3 + impact; before it the music **stops dead** for a beat like tape | `punch`: a hard push-in on landing, then release |
| `resolve` | Close | Intensity 1 | `pull`: slow pull-out |

- **Without roles it is laid out automatically**: the first scene is hook, scenes with `montage` are burst, the scene after the montage is drop (with no montage, the scene with `hero: true` or the last one), the rest build. `rhythm: false` turns it off. A scene can also set `camera`, `energy`, `hit`, `stop: false` directly to override.
- **The camera follows the information**: as each step of an information cue lands, the camera leans toward that part and pushes in a little (the flow reaches the next box, a key point is circled, a bar grows), leading the viewer's eye. The same camera move is never used three times in a row. Board styles (whiteboard / riso / ink) use their own camera (panning regions, turning pages, moving along the scroll).
- **`--check` prints the rhythm sheet** (each scene's time, role, intensity, picture type, camera, music move) and checks: is there a hook within 3 s, is there a montage and is it at 20–70%, do scene changes change at least two of intensity / camera / picture type / ground, is any camera move used three times in a row.
- **Measured against the plan after rendering**: after the final-video check, two rows of small bars are printed — planned intensity and measured energy (picture change per second + hard cuts, text, sound effects) — plus the variation (< 0.35 = flat), the match with the plan, and where the densest 5 s are; the chart is `review/rhythm-<aspect>.png` (grey boxes = plan, colour = measured). Where the plan is high but the measurement isn't, that section's picture isn't dense enough.

### A hand-written piece: the `raw` cue (your own components inside the quick version)

```js
{ role: 'build', cues: [{ beats: 6, raw: (layer, S, { at, until, area, F, foci, P }) => {
  P.reorder(F, layer, { x: …, y: …, w: …, rows: […], from: 2, to: 0, at: at + 0.5, drop: at + 1.7 });   // if the text says "drag to reorder", really drag
  foci.push({ t: at + 0.5, x: …, y: … });   // the camera follows
} }] }
```
- Time: `at` is the beat where this cue starts, `until` where it ends (before the next cue starts to appear); length is set with `beats` (default 4).
- Rhythm sheet, measured curve and fact check work as usual (register text with `F.text`).
- The information-density check works as usual: `S.steps / S.versus / S.figures / S.spotlight / S.shot` called in raw (board styles also `S.box / S.arrow / S.mark / S.bars / S.shape`) register themselves; for information components you draw yourself (flowcharts, UI close-ups, a drag-to-reorder demo) add a line `F.info('flow' | 'ui' | …, appear, disappear)`, or the scene is treated as "words only"
- **Fully hand-written films** (without `PROMO.film`) that want a rhythm sheet and a measured curve too: set `window.__rhythm = () => [{ scene, role, from, to, energy, camera, kind, music, variant }, …]` in build; `render.mjs --check` prints the rhythm sheet and rendering measures as usual.
- **The drop can be short**: to just "hit once, then explain", split the drop scene into two rows — `drop` takes only the 1–2 impact beats (`F.section(t, 3, { hit: true, stop: F.B })`), followed by a `build` row that explains.

### Montage: a fact anchor + material cuts

```js
{ role: 'burst', cues: [{ anchor: 'In parallel, 24/7', grid: true, montage: [
  { text: 'booked the venue', color: '#54B9A6' }, { text: '9 receipts', color: '#ED712E' }, '3 intros drafted', 'inbox at zero', … ] }] }
```
- The **anchor** (`anchor`) is pinned mid-screen and stays while the cells cut past behind it: it must be something real — an element of the UI, a line quoted from the page, a number (findable in brief.md). It is drawn like the UI, as a white pill (`anchorColor` = the dot colour).
- **Every cell is a fact too**: features, results, numbers, no empty adjectives. Short text (2–4 words).
- **Acceleration**: by default 2 beats per cell in the first quarter, 1 in the middle, half a beat at the end (board styles at least 1 beat); set your own with `beats: [2, 2, 1, 1, .5, .5]`. Every cut is on the beat (or half-beat), and each new cell is already moving as it comes in (scaling from 1.12 to 1). With `grid: true` all cells assemble into one grid on a full beat at the end.
- **Launch** doesn't use colour blocks: one spotlight on the stage, one thing drops into the light per beat (a real screenshot if there's a `src`, otherwise the word itself), the camera trucks along the row while earlier ones recede into the dark; `grid` = finally pull out into a group shot (`S.montage`; for the old colour-block look write `look: 'flash'`).
- **Other styles cut differently** (`S.flash`): op = diagonal stripes in that colour + bold-framed text on white; pop = halftone + black-outlined comic lettering; cut-out = a big sheet of cut coloured paper; origami = a whole sheet with creases; launch (with `look: 'flash'`) = full-screen colour, big type pinned bottom-left; whiteboard = sticky notes slapped on one over another; riso = a whole page of colour printed on; ink = a drop of ink spreads and the text appears reversed out of it. Each cut's sound effect is that material's sound (`pulse` / `pow` / `snip` / `land` / `tape` / `stamp` / `splash`).
- Works in the narrated version (`format: 'explain'`) too: it cuts to whichever item the narration is saying.

### Information cues: each style tells it in its own language (no boxes and arrows)

Big type can only shout slogans; making things clear takes the cues below (every item of the GUIDE's "information checklist" must land on one of them). **A cue only says the "meaning" — one step after another, two sides compared, a few numbers, a few spots on a real UI; the picture is drawn by the style's own components**, not the same "boxes + arrows" in a different colour. They build up step by step: one step = `every` beats (narrated version: each step appears when its words are spoken, and may span several lines of narration), then hold `hold` beats when complete (default 2).

| cue (meaning) | Op | Pop | Cut-out | Origami | Launch |
|---|---|---|---|---|---|
| `{ flow: ['one', { text: 'two', note, hot }, 'three'], title }` one step after another | Lenses bulge one by one along the stripes; short words as striped big type, a sentence on a bold-framed white panel | One comic panel per step, said in speech bubbles (the key step in a shout bubble) | One cut-out pasted on per step (the key one a star), text on paper strips | One sheet per step drops and unfolds, a paper plane flies from stop to stop | The camera trucks along the stage, one big word per step |
| `{ compare: [{ title, points }, { title, points, hot }], title }` two sides compared | Striped big type on both sides, a lens bulges behind the winner | Two comic panels facing off, points in speech bubbles | Two big sheets of coloured paper, cut-out lettering + paper strips | A gatefold sheet opens, left and right | The dark side vs the bright side (a light leak sweeps across) |
| `{ chart: [['Beginner', 0.5], ['Brutal', 3]], unit, hot, title, caption }` a few numbers | Bigger number, bigger striped type; a lens behind the biggest | Numbers in burst boxes, bigger number, bigger box | Stacks of paper scraps, taller for bigger | Sheets stand up, taller for bigger | Numbers roll into place |
| `{ annotate: 'shots/x.png', marks: [{ x, y, w, h, note }], title, caption }` a few spots on a real UI | Round magnifier with a heavy black frame | A close-up panel (enlarged) | A magnifier set into a piece of coloured paper | A round paper-disc magnifier | Spotlight: everything else dims |
| `{ montage: [...], anchor, grid }` many things | See "Montage" above |||||

- ASCII (`ascii`): flow = commands typed out line by line (`01 > …`, the key step in the accent colour, the cursor resting on the last); compare = boxes drawn in box-drawing characters, items prefixed `+` / `-`; chart = `name ······ █████▌ number`, bars grow cell by cell and numbers count up; annotate = a box-drawing magnifier; montage = a block of colour overlaid with character texture; screenshots start as character art and resolve top to bottom into the original as they land.
- Shadow puppetry (`shadow`): flow = a row of hanging paper strips (tops aligned, the key step on red paper, notes hung below); compare = two puppets face to face on the stage, each with a title and their claim hung above; chart = carved wooden bars, taller for bigger, numbers on paper strips; annotate = the lamp lights only that spot (everything else dims); montage = one big character on the warm-lit screen.
- Bauhaus (`bauhaus`): flow = solid steps rising level by level (numbers printed on the blocks, the key step red, text above the steps); compare = two diagonally cut colour blocks (the hot side red), claims with colour bars; chart = thick bars growing from a baseline; annotate = a red ring + everything else darkened; montage = a block of colour + one thick diagonal bar.
- Pixel (`pixel`): flow = a level map (numbered blocks, the path paved cell by cell, a ▼ marker hopping from level to level, the key level in the accent colour); compare = a VS screen (two pixel panels, VS bursting in the middle, the hot side in the accent colour, items prefixed ▸); chart = columns stacked from falling blocks, numbers on top; annotate = four selection corners + a cursor gliding over + everything else darkened (the screenshot starts pixelated, then sharpens); montage = a block of colour + a checkerboard strip below. The quick version's camera doesn't zoom in this style; punch is a four-frame whole-screen shake in whole-cell steps.
- Chat log (`chat`): each scene is a chat and everything is a message (the chat lays out positions itself, no x / y). flow = a relay list (lines added one by one, the key line in the accent colour); compare = two people taking turns (official on the left, "me" on the right, each sending a list card); chart = a poll card (bars grow one by one); annotate = highlight boxes on an image message, everything else darkened; montage = a block of accent colour + a bubble shape.
- Annotated screenshots with `zoom: true` (launch): no magnifier pops up; the camera pushes into the browser window spot by spot (the window stays put), a spotlight lights that spot, the spot with `click: true` gets a cursor click, notes alternate in a right-hand column in landscape and under the window in portrait, and finally it pulls back to the whole; 4 beats per spot by default. Full-page long screenshots work too (pushing down = scrolling down). Other styles ignore zoom and use the magnifier as usual.
- Annotated screenshots: the magnifier shows a real enlargement of that part of the screenshot (not redrawn); notes sit in a right-hand column aligned with their spot in landscape, and are listed below with ①② numbering in portrait. x, y, w, h are fractions of the screenshot (0–1).
- **Diagrams (`diagram`: a small drawing language of boxes, arrows, circles and colour bands) are only for board styles (whiteboard / riso / ink)** — hand-drawn boxes and arrows are their native language; in other styles `diagram` raises an error suggesting which of the cues above to use. In board styles, flows, comparisons, charts and annotations are drawn by the board too (marker boxes and arrows, printed colour blocks and bars, light-ink boxes and cinnabar circles).
- `hot: true` = the key item (accent colour / lens / shout bubble / star …).

**Building up step by step** (without clearing the screen): add `keep: true` to any cue to keep it until the scene ends; then split the screen with `area`: `'full'` (default) `'left'` `'right'` `'top'` `'bottom'` (in portrait, left / right become top / bottom automatically).

When writing:
- At least one information cue per scene (every key point in an explainer needs one); the fewer slogan-only scenes the better. `--check`'s "information" count: apart from the opening hook, the drop and the end card, scenes with only say / line / stat / list count as "words only" (individual warnings from 30%); promos need at least 4 concrete points in 30 s (one information cue counts as one, text with a number counts as one).
- Annotated screenshots use the real UI, and `note` says what the control **does** ("difficulty = thinking time"), not what it is called.
- Chart numbers and annotation notes must be in brief.md (illustrative data must be labelled "illustrative").
- For more creativity, write directly with the style's own components (`S.raw` / the style runtime: op's `Q.field` lenses, pop's `K.page` panels, cut-out's `C.collage`, origami's `O.model` …); cues are only a starting point.

## Following the voiceover (explain): explainers in promo styles

`node explainer/scripts/new.mjs <dir> --style <style>` (any style except whiteboard, riso and ink; the full style table is in `../../SKILL.md`) hands off to `promo/scripts/new.mjs --explain`: it creates `script.json`, a placeholder `timeline.js` and the skeleton below. Write the narration → `python3 explainer/scripts/tts.py <dir>` → write the picture → `node promo/scripts/render.mjs <dir>`.

```js
PROMO.film({
  style: 'cutout', format: 'explain',
  scenes: [
    { cues: [{ at: 'l1', say: '为什么天空是蓝色的？', accent: true }] },
    { cues: [{ at: 'l2', list: ['红', '橙', '黄', '绿', '蓝', '紫'], title: '阳光 = 所有颜色' }] },
    { cues: [{ at: 'l3', line: '光被空气分子散射' }, { at: ['l4', '蓝光'], stat: '5 倍', label: '蓝光比红光散射得更强', accent: true }] },
  ],
  end: { title: '瑞利散射', tagline: '波长越短，散射越强' },
});
```
(The sample is a Chinese explainer, "Why is the sky blue?" — Rayleigh scattering.)
- Cues are the same as in big-type motion (say / line / list / shot / stat, plus the information cues flow / compare / chart / annotate / diagram); their timing comes from the narration: `at: 'l3'` (when this line starts), `['l4', '蓝光']` (when this word — here "blue light" — is spoken), or seconds. The words of a say, the items of a list: each appears the moment the narration says it; if it isn't said, they are spread evenly across the line (very short items go in one row, at most 3 per row in portrait).
- Transitions sit in the pause between scenes; the end card follows the last line (`end.at` can change it); film length = narration + 4 s end card. Captions are added automatically (board styles use the board's own captions); no beat sync required; for sound, see below.
- **Quick version or hand-written**: the skeleton is `PROMO.film({ format: 'explain' })` — big type, lists and the flow / compare / chart / annotate cues follow the narration; use it when the explanation is mostly words and charts and you need it fast. To **act out a mechanism** (layers moving at different speeds, something being assembled, characters playing out a story), hand-write `PROMO.compose` + the style's own runtime (`PROMO.bauhaus(F)`, `PROMO.shadow(F)` …); start from the style's starter page (e.g. `styles/shadow/explain.html`). Polished films are usually hand-written.
- **Chapters**: lines in `script.json` with `chapter` get a chapter bar at the top of the screen automatically (at least 2 chapters; `compose({ chapters: false })` turns it off).
- Transitions start moving only after the last line has been spoken; the end card follows right after.

### Sound with narration: the voice always comes first

- **Music automatically becomes a bed** (`core/scripts/music.mjs`, like the board styles' background music): 11 dB under the voice in pauses; while speaking, the bed (pad / strings / chords / bass) drops another 8 dB and the busy layer (drums, gong, melody, arpeggio, fills) drops out entirely, returning only in real pauses (≥ 1.5 s), scene changes and the end card. Rendering prints "music sits X dB under the voice while speaking" and warns below 15 dB.
- To keep a layer while speaking: set `underVoice: 'keep'` on that layer; to make a layer part of the busy one: `underVoice: 'busy'`. To play the whole piece as usual (films where the music itself is the star, rarely): `underVoice: 'full'` in the score.
- **Sound effects only at key moments**: while speaking, light effects with gain < 0.45 (falling paper slips, footsteps, small taps) are dropped automatically and the rest drop 6 dB. Write gain ≥ 0.5 (or `keep: true`) for key moments like scene changes, big titles, a character falling. More than 0.6 effects per second while speaking triggers a warning.
- **When to drop the music altogether**: set `"bgm": false` in `script.json` (or render with `--no-bgm`), leaving only the narration and a few effects. No music by default for:
  - problem walkthroughs, derivations, explanations where every sentence needs attention;
  - heavy topics (disasters, illness, death, mourning);
  - very dense narration with almost no pauses (the music would stay ducked with no chance to come up).
  - Also turn it off when the user says "no music / too noisy".
  - Other explainers keep the music bed (it carries the mood in pauses and scene changes); say in the storyboard which one you chose and why.

## Promos on the explainer boards (whiteboard / riso / ink)

`node promo/scripts/new.mjs <dir> --style whiteboard --quick` (or riso / ink): the board's runtime, styles and fonts are copied from `explainer/runtime/` into `lib/`; the starter page, sound and score come from `styles/<style>/`. The whole film is one board, in its own container layer:
- Whiteboard: each scene is a new region of the whiteboard; the transition = the camera pans there (arrive first, then write); text is handwritten; the signature move = circled in red marker; the end card's URL is boxed in red. Grid paper by default (so a slow push over a nearly empty board still reads as moving).
- Riso: each scene is a page; transitions rotate between drum roll / push / ink bleed / push-in (drum roll is saved for the first); the signature move = a patch of halftone printed behind the text; screenshots are colour-separated onto the inks (the nature of the style).
- Ink: each scene is a stretch of the handscroll; the transition = moving along the scroll / ink bleed; big type is brush-written, captions are kaishu (楷书, regular script); the signature move = an ink splash; the end card can be stamped with a seal (`end.seal`). Best for Chinese content.
- The boards' own checks are merged into `--check` (stricter than the promo checks: leave enough reading time after writing, don't write while the camera moves …); text written on the board is fact-checked too.
- For finer control: `S.board()` gives you the board itself, with its full API (`styles/<style>/STYLE.md`).

## The common interface (kit.js)

`const S = PROMO.kit(F, styleName, options)`. Time: `at` = the moment the thing has landed and is readable (put it on the beat; the sound effect is at this moment too); `until` = the moment it has fully disappeared. Coordinates: `x, y` are the centre (screen px); `size` is a design size.

**Units**: kit's `x, y` (centre), `w, h` (cards, screenshots) and `maxW` are all **screen px**; only `size` (type size) is a design size (1080p, converted internally with `F.px`). The style's own components (`B.shape`, `C.piece` …) take `w / h / r` in design size — don't mix them up when combining both in a hand-written film (identical at 1080p, misaligned at other resolutions).

| Move | Purpose | Op | Pop | Cut-out | Origami |
|---|---|---|---|---|---|
| `S.bg(layer, { variant })` | The scene's background | Stripes / concentric rings / ribbons / checkerboard | Yellow / cyan / pink / blue ground + halftone + rays | Ground paper + a big cut-out in the corner | A desk in a new colour |
| `S.word(layer, { at, until, text, … })` | Impact big type | Striped type (on a base panel, grown by blinds) | Comic big type slams down | Cut-out letters pasted on one by one | A folded sheet drops and opens |
| `S.line(layer, { at, until, text, … })` | A readable sentence | Bold-framed white panel, blinds | Caption box (comic caps, auto-enlarged 1.3×) | A hand-cut paper strip | An accordion-folded strip unfolds from the middle |
| `S.card(layer, { at, until, x, y, w, h })` | A base for content → `{ el, w, h }` | Card | Comic panel | White paper scrap | A gatefold sheet opens |
| `S.shot(layer, { src, fit, … })` | Real screenshot (unaltered) | In a card | In a comic panel | Paper mat + washi tape | On paper |
| `S.accent(layer, { at, until, x, y })` | Signature move | Lens bulges | Speed lines + flash | A star / spiral pasted on | A paper plane flies past |
| `S.wipe({ cover, out, index })` → `{ show, hide }` | Transition | Blinds | Diagonal halftone sweep | Coloured paper covers, then tears / slides / lifts away | Page turn |
| `S.end(layer, { at, title, tagline, url })` | End card | Striped type + lens | Comic cover | Cut-out big type + a ring of cut-outs | A folded sheet drops and unfolds |
| `S.lead` / `S.push` | How early it starts to appear / recommended slow-push speed | 0.2 / 0.008 | 0.1 / 0.008 | 0.3 / 0.008 | 0.42 / 0.014 |

ASCII (`ascii`): word = big letters built from characters (scanned in); line = typed out by a typewriter; card = a frame traced in box-drawing characters ┌─┐; shot = starts as character art and resolves into the original as it lands; accent = a sonar ring of characters; wipe = a block of inverted characters sweeps across; end = big type decodes + the URL is typed out; lead / push = 0.35 / 0.008.

Shadow puppetry (`shadow`): word = big ink kaishu (楷书) characters (with a gong); line = a horizontal red paper strip; card / shot = a carved wooden frame (screenshot inside); accent = an auspicious cloud floats up + a gong; wipe = scene change (the lamp dims and brightens); end = big type + a vermilion seal (carved with the first two characters / initials of the product name). Character drama (walking, talking, riding, falling) exists only in hand-written `PROMO.shadow`; see `../styles/shadow/STYLE.md`.

Bauhaus (`bauhaus`): word = a heavy sans slogan set on a diagonal (slammed in letter by letter, alternating diagonals); line = a caption with a colour bar, printed left to right; card / shot = a heavy black-bordered paper card + an offset hard red shadow behind (screenshot unaltered); accent = a burst of red rays; wipe = a red wedge / big circle / red-and-black bands sweep across in turn; end = red circle + black bar + diagonal big type. A dark enough brand colour replaces red; too light a one becomes the accent colour.

Pixel (`pixel`): word = big pixel letters dropping in one at a time (outline + hard shadow; variant 1 = accent colour); line = a sentence typed out typewriter-style; card = a panel with a pixel border; shot = a pixel window (title bar + three dots), the screenshot starts pixelated and sharpens step by step to the original; accent = blocks burst + a star pops out; wipe = block dissolve / iris / steps / bars in turn; end = big type + one line + ▶ URL. Characters (walking, jumping, talking, fighting) exist only in hand-written `PROMO.pixel`; see `../styles/pixel/STYLE.md`.

Chat log (`chat`): word = one big-text message (short ones enlarged); line = one message (with "typing…" first); card / shot = an image message (screenshot unaltered; annotations drawn in the image, scrolling with the chat); accent = a 🔥 pops up under the last message; wipe = the whole screen pushes over; end = the group is renamed to the product name, then a slogan and URL are sent (no card floating on blank space). Back-and-forth between characters, quote cards, poems, maps and push-ins exist only in hand-written `PROMO.chat`; see `../styles/chat/STYLE.md`.

For whiteboard / riso / ink see the previous section; for launch motion see `../styles/launch/STYLE.md`.

Information moves (cues just call them; each style implements its own, there is no generic box-and-line version):

| Move | Purpose |
|---|---|
| `S.steps(layer, { items, T, until, C })` | One step after another (`C` = content area {x, y, w, h}, `T` = when each step lands) → the position of each step (the camera follows) |
| `S.versus(layer, { cols, T, at2, until, C })` | Two or three sides compared (`at2(column, item)` = each item's time) |
| `S.figures(layer, { data, ats, unit, decimals, hot, until, C })` | A few numbers |
| `S.spotlight(layer, { src, box, regions, T, until })` | A few spots on a real UI (`box` = where the screenshot is on screen, returned by `S.shot`) |
| `S.flash(layer, { at, until, text, color, index, rect, low })` | One montage cell (the style's material filling the screen or the rect) |

Board styles also have `S.box / S.arrow / S.mark / S.bars / S.shape / S.label` (boxes, arrows, circles, bars drawn in marker, ink or brush); diagrams and the board's information cues use them.

**Information-density registration** (the "information" part of `render.mjs --check`): the moves in the table above, `S.shot` (logos / icons with `fit: 'contain'` don't count), `S.screen`, and the board styles' `S.box / S.arrow / S.mark / S.bars / S.shape` register themselves as "information visuals" (`F.info`) when called; moves called inside a move aren't counted twice, and lines and circles drawn on the board by `S.word / S.line / S.accent / S.bg` don't count either. The quick version registers each information cue as one point (`group`), each scene as `F.scene(start, end, { role })`, and lists as one point that counts toward facts only. Hand-written films:
- Using the style's own components directly also registers the information ones (time from their at / until parameters): Bauhaus `B.shape / B.arrow / B.assemble / B.photo`, pixel `X.item / X.char / X.bar / X.window / X.shot`, shadow `Y.puppet / Y.prop / Y.map / Y.route`, cut-out `C.piece / C.photo / C.figure`, origami `O.model`, ASCII `A.plate`, pop `K.warhol`, plus `PROMO.screen / browser / phone / reorder` (real UI). They don't count when called inside components like backgrounds, big type or end cards.
- Hand-built layouts (your own DOM UI, tables, annotated figures): 4 or more separately `F.text`-registered pieces of text actually visible on screen at the same moment also count as an information visual (the quick version's say / line / list / stat text doesn't). For a hand-built picture with only one or two lines of text to count, register it with `F.info` below.
- `F.info(kind, a, b, { group, visual })`: there is an information element on screen from a to b seconds (name kind as you like: `'flow'`, `'ui'`, `'chart'` …); the same `group` counts as one point, `visual: false` counts toward facts only, not as "has a visual".
- `F.scene(a, b, { role, end })`: register a scene (without it, the `F.section` sections are used; `role: 'hook' | 'drop'` and `end: true` are not checked).
- Boards (whiteboard / riso / ink) count per element themselves: drawings, arrows, shapes, bars, formulas, images and figures in the camera at that moment count as information; text, numbers, labels, underlines, highlighter, colour-block grounds and landscape backgrounds don't. The same applies when explainers use the board directly (`EV.info` / `EV.scene` are the same system).

Pacing: `PROMO.kit.pace(style)` = `{ lead (how early it starts to appear), hold (minimum hold to be readable), wipe (how long before the transition point the transition starts) }`. The quick version schedules by it: board styles need time to write, print or move the scroll, so each big word automatically holds a few extra beats and each scene leaves a few extra beats at the end.

`S.wipe` returns two times: `show` = the next scene must be visible from here, `hide` = this scene is hidden by here. For covering transitions both are the moment of full cover; a page turn is "the next scene is underneath first, this page turns away", so show is early and hide is late (the next scene's layer must be underneath: later scenes get lower layers).

## Styles without the common interface yet

Toy 3D (`toy3d`) is three-dimensional (three.js) and doesn't implement the common interface's moves yet: hand-written only (`await PROMO.toy3d(F)`, `styles/toy3d/STYLE.md`); `--quick` fails with an error, and explainers use the style's own `styles/toy3d/explain.html`.

Old newsreel (`newsreel`) has no adapter yet either: hand-written only (`PROMO.newsreel(F, opt)`, `styles/newsreel/STYLE.md`), with its own `styles/newsreel/index.html` (promo) and `explain.html` (narrated report).

Film room (`filmroom`) likewise: hand-written only (`PROMO.filmroom(F, opt)`, `styles/filmroom/STYLE.md`), starters `styles/filmroom/index.html` and `explain.html`.

Suspense mystery (`mystery`) likewise: hand-written only (`PROMO.mystery(F, opt)`, `styles/mystery/STYLE.md`), starters `styles/mystery/index.html` and `explain.html`.

Isometric miniature world (`isometric`) likewise: hand-written only (`PROMO.isometric(F, opt)`, `styles/isometric/STYLE.md`), starters `styles/isometric/index.html` and `explain.html`.

Movie trailer (`trailer`) likewise: hand-written only (`PROMO.trailer(F, opt)`, `styles/trailer/STYLE.md`), starters `styles/trailer/index.html` (title cards on the beat) and `explain.html` (the deep trailer voice); sparse dialogue uses script.json lines with `"at"` and a per-line `"fx"`.

Clipping-file commentary (`dossier`) likewise: hand-written only (`PROMO.dossier(F, opt)`, `styles/dossier/STYLE.md`), starters `styles/dossier/index.html` (one of each piece, on the beat) and `explain.html` (narrated: the usual way to use it); the chapter bar and outlined captions come from the runtime (`compose({ chapters: false })`).

Manga / motion comic (`manga`) likewise: hand-written only (`PROMO.manga(F, opt)`, `styles/manga/STYLE.md`), starters `styles/manga/index.html` (on the beat) and `explain.html` (narrated); the chapter tags and anime-style outlined captions come from the runtime (`compose({ chapters: false })`).

Animated map (`map`) likewise: hand-written only (`await PROMO.map(F, opt)`, `styles/map/STYLE.md`), starters `styles/map/index.html` (places on the beat) and `explain.html` (narrated; the coarse world only — a film about a place builds its own geodata with `scripts/geodata.mjs`).

## Adding a style

1. Write `../styles/<name>/STYLE.md` from `../styles/TEMPLATE.md` (Chinese version: `../styles/TEMPLATE.zh.md`), and make `runtime/<name>.js`, the starter page, sound and score.
2. End the runtime with `return P.infoKit(object, { componentName: kind })`: list the information components (screenshots, characters, maps, shapes, bars) so the information-density check recognises them; what is drawn inside unlisted components doesn't count.
3. In `runtime/kit.js`, `PROMO.kit.register('<name>', { runtime, theme, make(F, opt) { … return S } })`, implementing every move in the table above with the style's components. **Adapters live in kit.js; don't change the style's original components** (hand-written films stay unaffected); when a component's timing conventions differ (e.g. it clears after until), shift the times in the adapter to line up.
4. Build a sample with `new.mjs --style <name> --quick`, pass `--check` and the final-video check in both landscape and portrait, then view it next to the same script in other styles.

## Adding a common move

Implement it in kit.js for **every** style (in that style's material), then add it to the table above. A move only some styles can do stays among that style's own components and doesn't go into the common interface.
