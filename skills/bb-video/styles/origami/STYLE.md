# Style: origami paper craft (折纸纸艺, `origami`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`, `templates/…`) are relative to bb-video's `promo/` folder.

> Everything about the product is printed on paper and folded into paper: a sheet folded into a small square drops onto the desk and unfolds panel by panel to reveal the product's UI; feature words are printed on paper cards that drop one per beat; data rises out of a pop-up book; scenes change with a page turn; at the end a last sheet unfolds into the logo.
> References (learn the grammar only): pop-up books and paper stop-motion (the thickness of paper, real light, slower landings), how maps and letters are folded (the unfolding order is the order information appears), the rhythm of product launches (one action per beat). Never copy any work's forms, colours or camera.

Runtime: `runtime/origami.js` (`PROMO.origami(F)`), loaded after `promo.js`. When creating a project, `node scripts/new.mjs <dir> --style origami` puts it in place together with this style's skeleton (index.html, sound.js).

## 1. When to use

- Warm consumer products, creation, education, content and document products; "handmade feel", "getting organised", "page by page", "open it and it's there".
- Most fitting when the product itself is about "unfolding", "turning pages" or "sorting into a stack": documents, notes, maps, calendars, photo albums, collaborative editing.
- Less suited: products that need to feel fast, hardcore or high-tech (use op or the default style); films that need lots of fast cutting (paper landing and unfolding needs time).

## 2. What it is (and isn't)

- **Paper with thickness and light**: each facet is shaded by its orientation (one fixed key light from the upper left), shadow sides are warm, not grey; paper on the desk has a contact shadow, and the higher it is above the desk, the fainter and softer its shadow.
- **Paper remembers its creases**: after unfolding, the creases remain (a thin bright line + slightly different shading on each side). This is the biggest difference from "flat cards".
- **Unfolding is revealing**: the content is printed on the paper all along, hidden while folded; the unfolding order is the order information appears.
- **Facets are rigid**: paper only rotates along creases, never bends or stretches (page turns simulate a curve with many narrow facets).

**It is not**: flat paper cut-outs / layered paper sculpture (flat sheets stacked for depth, with no creases or shaded facets), red window-paper cuts, low-poly 3D. Nor is it "flat UI with a paper texture": every shot needs at least one visible fold — a crease, a folded corner, a standing face.

## 3. Color
- **Brand colour**: `film({ brand })` / `P.kit.brand('origami', { brand })` → the brand colour becomes one of the coloured papers (softened: mixed with a little paper white), first after the white paper. Hand-written: `PROMO.origami(F, kit)` (`papers`).

- **Desk**: a light warm colour (beige, oat, pale grey-green); not pure white, not dark — origami shading looks best on light colours.
- **Paper**: 2–4 paper colours taken from the brand colours, tuned toward "paper": a bit less saturation, a bit more lightness (brand red #E53935 → paper #C9563A). The front is coloured, **the back is white** (as with real origami paper) — folded corners showing a white edge are the hallmark of this style.
- **One accent colour**: only one place in the whole film uses the most saturated paper (the hero model, the most important data bar, the call-to-action button).
- **Content printed on paper**: screenshots and photos use `O.print` (multiplied with the paper colour, as if printed on); text in ink colour (the brand's dark colour), not pure black.

## 4. Type

- Text is **printed on paper**: it moves with the paper, folds with it, and hides when folded away. Don't let a big title float outside the paper.
- Titles: a serif with a hand feel, or the brand font; impact type uses `O.cards` (one paper card per beat), not `PROMO.slam` (that's a different language).
- Text on paper cards must be big: readable on a phone (the automatic check reports it); one word or one short phrase per card.
- Portrait: paper cards are 84% of the screen width, and the type shrinks automatically to fit.

## 5. Motion

- **Drops decelerate** (`E.quartOut`), and the moment of landing is on the beat; paper falling from high up starts big and gets smaller through perspective, which is what makes it feel "slammed down" — no extra scaling needed.
- **Unfolding uses `E.cubicInOut`**, panel after panel (adjacent creases overlap 30%); a whole 2×2 sheet unfolds in about 1–1.3 s; any faster and you can't tell it's "folding".
- **Rotations and page turns** carry a little motion blur (registered by the engine automatically).
- Paper doesn't bounce or overshoot: no backOut, no springs.
- Rhythm: alternate slow unfolds with fast card drops. One main action per passage; don't fold three sheets at once.

## 6. Camera and transitions

| Camera | Says | How |
|---|---|---|
| Top-down on the desk (default) | Calm, organised, "spread it out and look" | Static, or `PROMO.camera` slowly pushing in to a part of the paper |
| The desk from another angle | Things that stand up (pop-up book, data) need depth | `S.view(at, dur, { rx: 35 })`: paper and desk tilt together, the paper never sinks below the desk |
| Following a paper plane | Sending, sharing, "from here to there" | `m.fly` along a curve; the next scene's content appears where it lands |
| Page turn | On to the next topic | `O.turn(layer, { at, edge })` |

## 7. Sound

- Materials: **paper** (folding, unfolding, dropping, turning, a nail running along a crease) + **wooden desk** (the dull knock of landing) + optionally a little **air** (paper plane). No electronic sweeps, no glass sounds.
- Effect types the engine's components emit: `fold` (folding up), `unfold` (unfolding), `land` (paper landing on the desk), `flip` (page turn), `flutter` (a paper plane / crane flying past), `logo` (end-card unfold complete). The sound.js created by `--style origami` already covers these in paper materials; tune it to the product.
- Sound library: `fold` (origami fold: air + fibre crackle + pressing flat), `crease` (one scrape pressing a crease), `paper` (sliding, page turns; `flap` is the flap of a turning page), `thud` (landing on the desk), `knock` (wood).
- Music direction: plucked strings, xylophone / marimba, the piano's upper register, light hand drums or fingerpicking; major or Lydian; no heavy kick or synth pads. Leave room for the paper sounds (music slightly lower overall).

## 8. Signature moves (pick per product, don't use all)

- **Unfold reveal**: a sheet folded into a small square drops and unfolds panel by panel, revealing the product's home page / key screen. *Fits*: the product's entrance, "everything is here". (`O.sheet` + `fold: { type: 'grid' }` + `folded: true` + `unfold`)
- **Cards on the desk**: feature verbs drop one per beat and pile into a stack. *Fits*: openings, feature lists, slogans. (`O.cards`)
- **Folded corner**: a corner of the paper lifts to reveal a layer beneath / the back. *Fits*: favourites, bookmarks, "there's more", before / after. (`fold: { type: 'corner' }`, `crease('corner', at, dur, 0.5)`)
- **Pop-up book**: a paper card opens and bar charts / cards / little buildings stand up. *Fits*: data, rankings, growth, "building it up". (`fold: { type: 'popup', items }` + tilting with `S.view`)
- **Accordion fold**: a long paper strip pulls open like an accordion, one step printed per fold. *Fits*: processes, timelines, multi-step operations. (`fold: { type: 'accordion', n }`)
- **Page turn**: the whole scene turns like a book page, revealing the next. *Fits*: between chapters, "next page". (`O.turn`)
- **Paper plane**: a sheet folds into a paper plane and flies off. *Fits*: sending, sharing, collaboration, messaging. (`O.model({ def: 'plane', form: 0 })` + `form` + `fly`)
- **Paper crane**: a crane with flapping wings lands beside the logo, or a crane leads the eye to the next position. *Fits*: brand closes, "wishes", handmade feel. (`O.model({ def: 'crane', flap })`)
- **End-card unfold**: a folded sheet drops to the centre and grows open from the middle into the icon, logo, URL and call to action. (`O.endcard`; put the app icon in `icon`)
- **Accordion menu**: a dropdown, command palette or option list is an accordion-folded strip, one item per fold; pulling it open is the menu; the highlight moves down and stops on the item to pick, and after selecting the strip folds back. *Fits*: any UI demo of "typing / calling up a menu" or "opening a dropdown". (An `O.sheet` embedded in the document paper, `fold: { type: 'accordion', n, axis: 'h' }`, `folded: true`)
- **A thread you can tick off**: a to-do / checklist card sits at the edge of the desk, one item ticked after each demo, until all are done. It gives the whole film order and a sense of completion. *Fits*: checklists the product itself has, onboarding steps, feature tours. (The checklist text must be findable in brief.md)
- **Paper planes become collaborators**: on share / invite, paper planes (one colour per person) take off from the button, loop around the screen, and land in the document where that person will write, turning into their cursor. *Fits*: collaboration, invites, messaging, many people online at once. (`O.model({ def: 'plane' })` + `fly`; on arrival hide the plane and show the cursor)
- **Pop-up chart**: a chart card grows out of the menu's position, lands on the document, and its bars stand up like a pop-up book. *Fits*: data, reports, growth. (`fold: { type: 'popup', items }` + `S.view`; for angles see "Pitfalls and self-check")

**Telling information (no boxes and arrows)**: step by step = sheets dropping and opening one by one, a paper plane flying from stop to stop; comparison = a gatefold sheet opening, left and right; numbers = sheets standing up, taller for bigger; real UI = a round paper disc as a magnifier. (`promo/references/kit.md`, "Information cues")

## 9. Material and rendering (already done by the engine)

- A sheet = a tree of facets (`O.sheet`), each facet hinged on its parent's crease; drawn in CSS 3D, with shading, shadows and paper grain computed every frame.
- When a sheet is fully flat, its front is an ordinary DOM layer: text takes part in the automatic checks as usual (fact check, overlap, cut edges); while it folds or flips the checks skip it temporarily.
- The paper grain is a static tiled texture (it doesn't flicker over time), so the video compresses well.
- 3D models (crane, paper plane, boat) are built from triangles (`O.model`); they can fly and flap their wings, and the paper plane can fold up out of a flat sheet.

## 10. Pitfalls and self-check

- **The paper rotates below the desk**: for a 3D look rotate the "view" (`S.view`), not the paper itself (`move`'s rx / ry sends half the paper into the desk, covered by shadow).
- **The paper flies at the camera during a page turn**: `O.turn` sets a distant perspective by default (7000); when writing your own flips, pass the sheet `perspective: 6000` or so.
- **Folded paper shows its back**: the back is white by default; to print something on the back, put it in `S.back`.
- **Text printed across the boundary of two facets**: allowed (it breaks while unfolding, which is exactly the reveal), but the most readable moment must come after it is fully unfolded.
- **Too many facets on one sheet**: grids beyond 3×3 or accordions beyond 8 folds make each panel too small and the motion too fussy. Exception: a menu / list as an accordion, one item per fold — a dozen or more folds is fine (each fold is a row anyway).
- **White paper everywhere**: at least two paper colours + one accent colour, or it looks like an uncoloured sketch. On dark paper cards `O.cards` switches to light text automatically.
- **A map fold unfolds from the top-left**: the folded sheet is the top-left panel (the root facet); to grow from the centre, first shift the sheet by `(w/2 − S.rc[0], h/2 − S.rc[1])`, and `move` it back while unfolding (that's what `O.endcard` does).
- **Pivot**: by default the centre of the root facet (`S.rc`), so a folded square drops and flips around itself. Think it through when passing your own `pivot`: with the centre of the whole sheet, a folded square flipping swings out from a corner and becomes an upright board.
- **Flying things stay in frame the whole time**: when a paper plane or crane flies from one place to another, its whole path stays on screen; flying out and back in from somewhere else looks like an extra object. Flying out of frame means really leaving (the end).
- **Models must be recognisable from both sides**: a model's back is one shade darker than its front by default; set the back to white and you mostly see the back in flight, losing the colour (= who it is).
- **Making a pop-up book readable**: the desk tilt `view.rx` plus the card's standing angle `angle` should be about 90° so the card faces the camera (gallery 38° + 52°, chart 30° + 64°). Standing the card at 90° and then tilting the desk squashes the card.
- **Paper inside paper**: small sheets like menus and charts can go in another sheet's `front`; when the outer sheet folds, it copies how they look at that moment. Before the outer sheet folds, put the inner things away (lay bars down, turn the view back to 0), or the folded face shows half-standing bars.
  - It can't go past the outer sheet's edge (it gets clipped): cards that must extend beyond the window (pop-ups, permission prompts) go **beside** the outer sheet (in the same parent layer, aligned), not in its `front`.
  - It sits on top of the outer sheet's creases (the other sheet doesn't carry the creases beneath it); text and images printed on the outer sheet sit under the creases.
- **One sheet has one fold type**: to first "fold in half and open" and later "lift a corner", make two identical sheets (same content, same position) and swap them with `show` at a moment when both are fully flat.
- **Paper covers the text but the check still reports overlap**: the check doesn't know the sheet on top hides the text below. Fade out the lower sheet's text before it is covered, or set `visibility: hidden` (`O.cards` already does this); for a sheet being pulled away, hide its text before it moves, and register the revealed text a little later.
- **Small text beside the target reported as "cut edge" on a push-in**: `fit` only guarantees the target area is complete; text half in, half out beside it is reported too. Fade out the neighbouring column's text before pushing in, or make the `fit` box contain it whole.
- **Which side faces out when folded**: after map folds, letter folds and the like, what faces the camera is often the **back** of some panel (white paper), and which one is hard to work out. To print on the folded square (a cover, a label), look at a folded frame with `--stills` first and then decide where to print; things on the back go in `S.back`.

## 11. Variation (different films in the same style)

- Structure: **one sheet tells the whole story** (the same sheet folds and unfolds again and again, showing a different face each time); **a stack of cards** (one feature per card, the last one the logo); **a pop-up book** (each opening is a scene); **a paper plane's journey** (the plane flies from one screen to the next).
- Openings: a white sheet folds itself into a word; a paper crane lands on an empty desk; a folded envelope opens.
- Endings: the paper unfolds into the logo; a crane lands beside the URL; all the cards are covered by one big sheet printed with the logo.

## 12. API quick reference

```js
const O = PROMO.origami(F, { paper: '#F5F2ED', back: '#FBF9F4', light: [-0.5, -0.45, 0.95], rest: 6, shadow: 0.28, grain: 0.6 });
O.desk(F.layer('', 0), { color: '#E7E1D6' });           // the desk (with a very slowly drifting patch of light, so the picture is never fully still)
const S = O.sheet(parent, { x, y, w, h, fold: { type: 'grid', cols: 2, rows: 2 }, folded: true, paper: '#C9563A', z, rz, show: [a, b] });
O.print(S.front, 'shots/home.jpg', 'left:20px;top:20px;width:…;height:…');   // a screenshot printed on the paper
S.front.appendChild(…) / PROMO.el('div', css, S.front, 'text')  →  F.text(element, 'label', 'text', appear, disappear)
S.unfold(at, 1.2) · S.fold(at, 0.8) · S.crease('corner', at, 0.5, 0.5) · S.move(at, dur, { x, y, z, rx, ry, rz, s }, { land: true, lift }) · S.view(at, dur, { rx: 35 })
O.scene(layer, { fold }) → turns a full-screen layer into paper · O.turn(layer, { at, dur, edge: 'left' })
O.cards(parent, { at, every, items: [{ text, sub }], papers: [...], until, enter: 'drop' | 'unfold' })
const m = O.model(parent, { def: 'crane' | 'plane' | 'boat', size, x, y, z, rx, ry, rz, paper, back, flap: { amp, hz }, form: 0 })
m.move(at, dur, { x, y, z, rx, ry, rz, s }) · m.fly(at, dur, [[x, y, z], …]) · m.form(at, dur, 1)
O.endcard(parent, { at, icon: { src, size }, logo: { text, font } | { src, h }, tagline, url, cta, muted, push })   // an oversized logo shrinks automatically; a slow push is built in after unfolding
S.rc → centre of the root facet (the centre of the folded square, in paper coordinates); the default pivot
```

Fold types (`fold.type`): `flat` no fold · `half` fold in half (`axis`, `at`, `moving`, `bend`) · `grid` map fold (`cols`, `rows`) · `accordion` accordion fold (`n`, `axis`, `from`) · `letter` letter fold (in thirds) · `gate` gatefold · `corner` folded corner (`corner`, `size`) · `popup` pop-up book (`items`) · `strips` narrow strips (for page turns). You can also write your own `{ panels, order }` (format in the PLANS comment of origami.js).
Models (`def`): `crane` `plane` `boat`, or write your own `{ v, f, flat, joints, flap }` (format in the MODELS comment of origami.js).

Common interface (`runtime/kit.js`, used by the quick version and future common moves): `word` = a sheet folded in half drops and opens, `line` = an accordion-folded strip unfolds from the middle, `card` / `shot` = a gatefold sheet opens, `accent` = a paper plane flies past, `wipe` = an `O.turn` page turn, `end` = `O.endcard`. The slow push is a little stronger than in other styles (the desk itself doesn't move).

In explainers (following the narration, with captions): `node explainer/scripts/new.mjs <dir> --style origami` (path from the skill folder) creates a project that follows the narration; the picture uses `PROMO.film({ format: 'explain' })`, appearing with the narration's lines and words (`promo/references/kit.md`, "Following the voiceover"), or write it by hand: `F.T` is the narration timeline. No formulas, characters or overview images — use whiteboard / ink for problem walkthroughs and stories that need characters.

## 13. Not supported yet

- Stories about named people: this style has no characters; follow the last section of `../CHARACTERS.md` (name cards with fixed colours and positions, versus for confrontations), or recommend shadow puppetry / ink / whiteboard.
- Creases are straight lines only: paper never bends into a curved surface (the "bend" of a page turn is pieced together from many narrow facets).
- The only 3D models are crane, paper plane and boat (crane / plane / boat); other models need their own vertices and triangles.
- No characters.
