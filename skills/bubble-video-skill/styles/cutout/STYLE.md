# Style: Matisse cutout (马蒂斯剪纸, `cutout`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`, `templates/…`) are relative to bubble-video-skill's `promo/` folder.

> Paper brushed with opaque gouache, cut with scissors into seaweed, coral, stars, spirals, waves and figures, and pasted piece by piece onto off-white base paper. Everything in the frame is "cut out and pasted on": the logo is a few pieces of paper put together, UI cards are sheets of coloured paper, titles are cut-out letters, a transition is a big sheet covering the frame and then tearing open.
> Reference (learn the grammar only): Matisse's late cut-outs (*Jazz*, *Blue Nudes*, *Oceania*, *Polynesia*). Never copy the composition of any work.

Runtime: `runtime/cutout.js` (`PROMO.cutout(F)`), loaded after `promo.js`. New project: `node scripts/new.mjs <dir> --style cutout`. Sample film: `videos/youvibe-cutout` (30 s, all material is real screenshots).

## 1. What products it suits

- Creation, learning, community, kids / education, lifestyle, design tools, content platforms; "make it by hand", "put it together", "step by step", "easy and warm".
- Most fitting when the product itself is "assembled" (templates, components, cards, a gallery wall, collage): a few pieces of paper forming the UI is the product being built.
- Less suited: tools that need to look precise and hardcore (databases, security, financial trading) — use op or the default style.

## 2. Its essence, and what it is not

- **Everything is a piece of paper**: flat, opaque, with hand-cut edges (irregular, made of short straight cuts), a very light shadow underneath. No gradients, no outlines, no glow.
- **Shapes are organic**: seaweed leaves, coral, stars, spirals, waves, colour blobs, figures. Geometric rectangles are only for "UI" (cards, paper strips, buttons), and they are hand-cut too.
- **Collage**: a few pieces stacked make one thing (a logo, a card, a tree). Where they overlap you can see two pieces of paper — that is the cut-paper flavour, don't hide it.
- **Real material pasted as-is**: screenshots, artwork covers and logos are not stylised (not cut into irregular shapes, not recoloured, no texture); `C.photo` pastes them on a hand-cut paper mat — the cut-paper feel comes from the mat, the paper tape, the act of pasting and the shadow. The product's real look is its credibility; the cut paper is the wrapping.
- **It is not**: flat illustration (perfect vector curves, uniform rounded corners), origami (paper isn't folded, only cut and pasted; no light and shadow sides), magazine collage (no photos, no torn-out printed matter).

## 3. Colour
- **Brand colour**: `film({ brand })` / `P.kit.brand('cutout', { brand })` → the brand colour replaces the closest gouache paper (saturation pulled into gouache's range) and goes first in the palette. Hand-written: `PROMO.cutout(F, kit)`.

- Base paper: off-white `C.paper` (#F3ECDD, with a very faint paper texture).
- Matisse palette (`C.colors`): ultramarine blue #1F3C9A, coral red red #E4533B, lemon yellow yellow #F2BF2C, leaf green green #2E8B4F, black black #1C1B1A, rose rose #D9497D, white white #FBF8F1.
- **Pick 3–4 colours for the product** as the main ones (put the brand colour in first, e.g. YouVibe's coral red); the rest appear in only one or two places. At most 4–5 colours in one frame.
- Text colour: dark text in a dark close to the brand (or black); dark text on light paper, white text on dark paper (`C.strip` picks automatically from the paper colour).

## 4. Type

- **Cut-out big type** (`C.title`): a bold, rounded font (default ZCOOL QingKe HuangYou (站酷庆科黄油体), OFL, covers Chinese and Latin); each letter slightly tilted, colours alternating, pasted one by one like paper pieces. Only for titles and the end card.
- **Text on paper strips** (`C.strip`): explanations, labels, buttons, artwork titles. A strip is a hand-cut rectangle sized to its text; large size + head font = "a title pasted on a strip".
- Explanation text uses a clean sans (default PingFang SC), **always on a strip / piece of paper**, never directly on a coloured pattern.
- Readable on a phone: body ≥ 46px in landscape, ≥ 40px in portrait, titles larger (see the table in references/structure.md). Small labels inside UI cards can go down to 36–40px, but there must be one line of large text on screen at the same time.

## 5. Motion

Every motion is a **hand's** motion: put down, press flat, pick up, move away, cut, tear. Use springs and eases, not linear; paper has weight — when it drops it is fast then slow, and it bounces slightly when pressed flat.
- **Paste on** (default entry): drops from the upper left, the raised edge touches down first, the other edge bounces gently as it is pressed flat; the shadow shrinks from large and soft to small and crisp. `at` is the moment it **settles** (on the beat); the motion starts 0.3 s earlier.
- **Cut out**: a sheet of the same colour is pasted first, the scissors enter from the paper's edge and cut around the outline with open-close snips (a "snip" sound on each close); when done the outer paper falls away and the cut shape is lifted a little. About 1–1.5 s; good for the opening or a "it's made" moment, once or twice per film.
- **Pick up and move** (`p.move`): lifted midway (shadow grows), set down in the new spot.
- **Peel / lift off** (`C.peel`, `exit: 'peel'`): a layer of paper lifts from one edge, flips up and flies off, revealing what's underneath. Good for "reveals": a cover sheet peels off to show the prompt, the whole previous scene peels away to show the next.
- **Drift / sway** (`sway`, `C.drift`): pasted paper sways gently (1–3°), small background pieces drift and turn slowly — a still frame is never dead.
- **Assemble piece by piece** (`C.collage`, `C.figure`): a logo, a card, a tree, pasted on one piece at a time, 0.1–0.25 s apart.
- **Exit**: until is the moment it has **fully gone** (the exit finishes before it, consistent with F.text registration); `exit`: peel / lift / drop / fade / none.

## 6. Camera and transitions

| Move | Expresses | How |
|---|---|---|
| Peel the whole sheet away | turning to the next page, a reveal | `C.peel(previous scene's layer, { at, edge })`, with the next scene's layer underneath |
| Coloured paper covers, then tears open | a big scene change | `C.wipe({ at, dur: 1, color, from, out: 'tear' })`, change scene at the returned time |
| Cover, then slide / peel away | variations of scene change | `out: 'slide'` / `out: 'peel'` |
| Pick one up and put it in the centre | choosing one from many (shared element) | `p.move(at, 0.6, { x, y, s: 1.3, rot: 0 }, { lift: 1 })`, other cards `exit: 'drop'` |
| Camera | cut paper hardly ever pushes the camera: things move over and grow by themselves | to focus, `move` that sheet over and enlarge it |

## 7. Sound

- Materials: **scissors (metal) + thick gouache paper + a quiet worktable**. Types the components emit: `snip` (scissors closing), `paste` (a light pat as it's pasted), `rustle` (picking up / moving), `lift` (peeling up), `cover` (a big sheet covering), `tear` (tearing open). The sound.js created by `--style cutout` already has them; `snip` `rustle` `tear` in the sound library were added for this style.
- Music: echoing *Jazz* — light jazz: seventh-chord electric piano (Charleston rhythm), plucked walking bass, brushes + ride, swung eighths (swing around 0.6); 110–126 BPM. Motif on vibraphone (bell) or piano.
- When pasting several pieces at once, only the first (or every second) makes a sound: `C.collage` sounds every second piece by default; in your own loops use `sfx: i === 0 ? 'paste' : false`.

## 8. Moves unique to this medium (pick by product)

- **Cut out the product's mark**: scissors cut a star / logo outline, which is picked up and put in a corner as this scene's decoration. *Suits*: the opening, "it's made". (`enter: 'cut'` + `p.move`)
- **Gallery wall**: real covers / screenshots pasted onto a wall one by one (`C.photo`, coloured or white mats, some with paper tape); one is picked, lifted and enlarged, the others fall. *Suits*: communities, template libraries, portfolios. (`C.photo` + `p.move` + `exit: 'drop'`)
- **State changes pasted one on another**: several screenshots of the same UI / work at different moments; each state is a new screenshot pasted over the last (slightly offset and tilted), with a strip naming the state. The cut paper itself can also change (flowers → leaves → falling leaves → snow). *Suits*: time, growth, progress, "changing step by step".
- **Peel off a cover sheet**: a coloured sheet with a label covers the content and peels off to show the real thing (prompt, price, result). *Suits*: reveals, "see what's inside". (`exit: 'peel'` + register the content underneath a little later)
- **A logo from a few pieces**: a rounded square + small white pieces form the icon, the last piece landing on the accent. *Suits*: the end card. (`C.collage` / `C.endcard({ mark })`)
- **Figures**: a few pieces of one colour form a dancing / reaching person (like *Blue Nudes*). *Suits*: users, community, "people". (`C.figure`)
- **Tear transition**: a big coloured sheet covers the frame and tears open from the middle, showing the white paper core. (`C.wipe({ out: 'tear' })`)

**Telling information (no boxes or arrows)**: one step after another = cut-outs pasted on in turn (the key one is a star), text on strips; contrast = two big sheets of coloured paper with cut-out type; numbers = stacks of paper pieces, bigger means taller; real UI = a magnifier set into a piece of coloured paper. (`promo/references/kit.md`, "info cues")

## 9. Common pitfalls and self-check

- **Base paper texture too heavy**: the base paper needs only very faint fibres and grain; brush marks are for the coloured paper. The texture is tiled; if too visible, the repeat shows.
- **Too many pieces at once, each with a sound**: too dense (`--check` reports it); the picture gets messy too. Paste one batch per beat, one sound per batch.
- **Text directly on coloured paper**: white text on dark paper; put a strip under it on busy collage.
- **Pasted paper covering text being read**: the overlap check ignores occlusion, but viewers get blocked — when one card is picked and enlarged, the other cards must fall away first (in portrait, the bottom row first).
- **Text under a cover sheet registered too early**: text hidden before the peel should show only after the cover sheet has settled and register only when it peels (`win(content, just before the peel)`); the label on the cover sheet fades out as it lifts.
- **Static frame**: once all the paper is pasted nothing moves and the film check reports it — give decorative pieces `sway`, or add `C.drift`.
- **Nothing moves after pasting**: the film check reports a "static frame" — give pasted photos and cards a little `sway` too (0.6–1°).
- **Live numbers in screenshots**: home-page screenshots often carry like counts and view counts → capture only the cover, or use `crop` to take just the part without numbers.
- **Shapes too regular**: all circles / rects turn it into flat illustration. At least one or two organic shapes per scene (leaf, coral, star, spiral).

## 10. Room for variation

- **Palette**: 3–4 colours drawn from the brand (ultramarine / coral red / lemon yellow / leaf green / rose / black), no more than 4 in one film; a different palette is a different mood.
- **Base paper**: off-white (default), a warmer cream, or a whole dark sheet as the ground (text and pieces switch to light colours).
- **Collage density**: sparse (one or two big pieces, lots of empty space, quiet) ↔ dense (many small pieces, full bleed, lively).
- **Which unique moves**: cut out, paste on, peel, a whole sheet covering — pick two or three as the leads of each film, don't use them all.
- **Pace**: slow (paper drops slowly, sways gently) ↔ jazz (a piece per beat, fast tearing transitions).

## 11. API quick reference

```js
// placeholders: 图层 / 父 = layer / parent, 元素 = element, '字体' = font name, 把手颜色 = handle colour, 每个字的颜色… = a colour per letter
const C = PROMO.cutout(F, { colors: { … }, paper: '#F3ECDD', head: '字体', body: '字体', shadow: 1 });
C.desk(图层);                                                                  // off-white base paper
const p = C.piece(父, { shape: 'leaf', color: C.colors.blue, x, y, w, h, rot, at, until, enter: 'paste' | 'cut' | 'fade' | 'none', exit: 'peel' | 'lift' | 'drop' | 'fade' | 'none',
                       sway: { amp: 2, period: 3 }, drift: { vx, vy, spin }, cutDur: 0.9, scissors: 把手颜色, edge: 'right', seed, rough: 1, sfx });   // x, y is the centre
p.move(at, dur, { x, y, rot, s }, { lift: 0.7 });  p.inner.appendChild(…);  p.cutEnd;  p.w;
//   shapes: blob circle rect leaf petal coral star spiral wave capsule; parameters: leaf { lobes, bend }, coral { thick, depth }, star { points, inner }, spiral { turns }, wave { waves, amp }, blob { wobble }
//   your own shape: shape: (r) => C.union((g) => { C.tube(g, [[x, y], …], radius0, radius1); g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fill(); }) (unit coordinates, outlined after the union); or give a point list directly
C.photo(父, { src: 'shots/x.jpg', x, y, w, h, crop: { x, y, w, h }, mat: C.colors.white | false, pad: 14, tape: true, rot, at, until, exit, sway });   // real material pasted as-is on a paper mat; p.img
C.collage(父, { at, every: F.B / 2, items: [{ shape, color, x, y, w, h, rot }, …], until, sfxEvery: 2 });
C.figure(父, { x, y, h, color, pose: 'dance' | 'stand' | 'reach', at, every: 0.08, until });
C.drift(父, { at, until, n: 8, area: { x, y, w, h }, shapes, colors, size: [min, max], speed });
C.title(父, { at, until, text: '可以\n换行', size: 150, x, y, align, colors: [每个字的颜色…], every: 0.05, kind: 'headline', exit: 'lift' | 'none', maxW });
C.strip(父, { at, until, text, size: 46, x, y, align, paper, ink, font, maxW, textAlign, rot, exit });   // → p (p.text is the text element; it can be handed to PROMO.typing)
C.peel(元素, { at, dur: 0.6, edge: 'right' | 'left' | 'top' | 'bottom' });
const mid = C.wipe({ at, dur: 1.0, color, from: 'left' | 'right' | 'top' | 'bottom', out: 'tear' | 'slide' | 'peel' });   // returns the moment of full cover: change scene at this moment
C.endcard(父, { at, title: { text, colors, size }, mark: { h, at, build: (父, x, y, at) => […] }, tagline, taglineAt, url, urlAt, ring: 10, ringAt, colors });
```
(`'可以\n换行'` = "line breaks\nallowed".) `at` = the moment it settles (on the beat; the motion starts lead earlier, 0.3 s by default), `until` = the moment it has fully gone. So the next line of text can appear exactly at the previous line's until; text inside a card registers with the card's own until.

Common interface (`runtime/kit.js`, used by the quick version and future common verbs): `word` = `C.title`, `line` = `C.strip`, `card` = a white paper piece, `shot` = `C.photo`, `accent` = a star / spiral / seaweed cut-out pasted on, `wipe` = `C.wipe` (tear / slide / peel in turn), `end` = `C.endcard`.

In explainers (following the narration, with subtitles): `node explainer/scripts/new.mjs <dir> --style cutout` (path from the skill folder) creates a project that follows the narration; the frame uses `PROMO.film({ format: 'explain' })` to appear on the narration's sentences and words (`promo/references/kit.md`, "follow the narration"), or write it by hand: `F.T` is the narration timeline. No formulas, characters or overview diagrams — for problem solving and stories acted out by characters use whiteboard / ink.

## 12. Not supported yet

- Named characters: cut-paper figures (`C.figure`) are anonymous "users / everyone"; for stories about people follow the last section of `../CHARACTERS.md`, or recommend shadow puppetry / ink / whiteboard.
- Shape library: blob / circle / rect / leaf / petal / coral / star / spiral / wave / capsule; for other shapes give your own point list or function.
- Figures have only three poses: dance / stand / reach (or your own parts table).
- Screenshots and photos are never "cut-paper-ised": pasted as-is on a paper mat (on purpose: the UI must be real and readable).
