# Style: blueprint engineering drawing (蓝图工程图, `blueprint`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

A frame is a viewport over a drawing sheet, and each subject has its own sheet. The ground is deep cyanotype blue with paper grain, a slow uneven fade and a fine grid (a heavier line every five cells); the line work is thin white and pale cyan, drawn to draughting convention. Visible edges are continuous, hidden edges dashed, centre lines and pitch circles dash-dot. Dimensions have arrowheads and numbers, and leaders end in numbered balloons with the part's name. There is a parts list, section views with 45° hatching, detail circles with a letter, a title block in the corner (title, drawing number, scale, sheet n / N, date) and technical / stencil lettering. Every line is *drafted* in: construction lines first, thin and quick (they stay faint), then the final weight, with a plotter pen riding the tip. Mechanisms really work. Gear trains with real tooth counts mesh and turn at the right ratios, the escapement locks and releases, the balance swings, springs coil and relax. A new subject arrives on a new sheet (the exposure lamp sweeps it in, or it slides over the last one); on a sheet the camera pushes into a detail and pulls back out. A red pencil is the one accent: a correction, a ring around the part that matters.

Runtime: `runtime/blueprint.js` (`PROMO.blueprint(F, opt)`). New project: explainer `node explainer/scripts/new.mjs <dir> --style blueprint`, promo `node scripts/new.mjs <dir> --style blueprint` (add `--quick` for the quick version). Starter pages: `styles/blueprint/explain.html` (explainer, timed from the narration; the usual way to use it) and `styles/blueprint/index.html` (promo, on the beat).

## 0. Safety
- No other company's drawings, calibre layouts, logos or trade dress. Draw a generic mechanism (label it `示意 ILLUSTRATIVE`) or the product's own geometry from material you may use.
- Don't invent numbers: every tooth count, ratio, rate and dimension on the sheet is in brief.md with its source. Where no published figure exists, the drawing uses an illustrative set that is internally consistent (e.g. a train whose fourth wheel turns once a minute), and the sheet says so.

## 1. When to use
- **How something works**: a mechanism, a machine, a device, a system. Examples are a mechanical watch, a toilet cistern, a lock, an elevator, a camera shutter, a bicycle gear, an engine, a pump, a valve or a printer.
- Topics that need numbers, ratios and part names: gear ratios, tolerances, specs, "why this many teeth".
- **Promos for hardware and engineering products**: a device's internals, a product teardown told as a drawing, an API or system architecture drawn as an assembly (blocks with leaders, data flow as a train).
- Less suited: emotional stories, people (no characters, `../CHARACTERS.md`), or products whose value is a UI. For a UI use launch, swiss or toy3d.

## 2. What it is (and isn't)
- **What it is**: the most information-dense style. Each scene shows how something works, with parts named (leaders + balloons), motion shown (the mechanism turning) and numbers dimensioned. The drawing builds up line by line; nothing is switched on.
- **What it isn't**:
  - a "tech HUD" or sci-fi hologram (no glow, no neon, no scan lines);
  - a slide deck on blue paper (lettering without a drawing doesn't count);
  - decoration (gears that don't mesh, numbers that mean nothing, random dimension lines).
- The red pencil is rare: one mark per idea, not a colour scheme (`--check` warns past about one per 10 s).

## 3. Color
- `ground: 'blue'` (default): cyanotype `#123F77` with paper grain, an uneven fade and a vignette. Lines are `#EEF6FF` (visible), thin lines and hatching are pale cyan, construction lines faint, lettering `#F2F8FF`, secondary lettering muted.
- `ground: 'white'`: diazo whiteprint, blue-violet lines `#22398A` on pale paper `#EBEDE5` (a second look; same rules).
- Accent: the red pencil `#FF5D4D`, the only colour that is not the line colour. `PROMO.kit.brand('blueprint', { brand })`: a vivid brand colour becomes the pencil. Blue or grey brands keep the red, because a blue pencil vanishes on cyanotype.
- Solid parts are filled with the ground colour (they hide what lies beneath them on the drawing). Pallet stones and other jewels are filled with the thin-line tint.

## 4. Type
- Saira Condensed 500 / 600 (technical lettering, OFL) for labels and dimensions; Saira Stencil One (OFL) for view titles and big numbers; Noto Sans SC 400 / 500 for Chinese. Load them from jsdelivr in the starter page's `<head>`.
- Sizes are in sheet units (1080p design px at camera zoom 1) and scale with the camera:
  - dimensions and labels 24–34;
  - leader texts 30–46;
  - view titles 40–66;
  - key numbers (8 h × 5 = 40 h, ≈ 270°, 28,800 = 2 × 15 × 960) 50–70.
- **Phone rule**: at least one line on screen should be about 45 px tall on the frame in landscape (25 px in portrait). Frame tighter or make the key number bigger.
- **Lettering is plotted in** left to right (a wipe at the pen's pace); it fades out. A dimension's number is lettered after its line and arrowheads are drawn. Numbers that change (a beat counter, a clock rate) are `B.readout`.
- `B.title` = stencil lettering with a heavy rule and a thin one (a view title: `SECTION A–A`, `DETAIL A`, `SCALE 2:1`).

## 5. Motion
- **Drafting**: `at` = the moment a stroke is complete. It draws from `at - dur` with a plotter ease (short ramps around a constant run), so long strokes take longer (0.3–1.6 s by length).
  - `cons: true` first rules thin construction lines (an extended line, a full circle); they dim to 45 % and stay.
  - `pen: true` (default for visible lines) shows the plotter pen at the tip and plays `draw`.
- **Gears**: the pitch circle (chain line) and tip circle are constructed first, then the centre lines, the tooth outline (with the pen), the crossings, the hub and the bore. A gear is opaque once drawn.
- **Mechanisms move on their own clock**: `B.clock([{ at, rate }])` integrates eased rate changes, so slow motion ×1/16, real time, time-lapse ×60 or ×36,000 are honest relations of one mechanism time. Show the rate on the sheet (`B.readout` of `clock.rate(t)`).
- **Speed blur, not strobing**: a wheel that would turn more than about 0.3 tooth pitch per frame fades its teeth behind a soft ring. The escapement's fork and balance blur instead of jittering when beats would exceed about 6 per second on screen.
- **Exploded views**: `B.group(V)` + `G.to({ at, dx, dy, rot })` slides a sub-assembly along its axis (draw the axis as a centre line) and back (`dx: 0`). Leaders drawn `on: G` follow the moving part.
- **Cutaways**: `G.cut({ r | w, h, at })` opens a growing hole in a part, and `G.only(…)` shows a part only inside a shape. Use them in pairs: the cover is cut, the hidden lines underneath turn solid inside the cut, and the cut faces are hatched (`B.hatch`).
- Keep the motion purposeful: the mechanism moves; annotation is drafted in once and stays.

## 6. Camera and transitions
- **A new subject = a new sheet.** `B.sheet({ a, enter: 'expose' })` (a UV lamp bar sweeps across and the new print develops behind it), `'slide'` (a fresh sheet slides over the old one) or `'cut'`. Alternate expose and slide. Start the sheet ~0.2 s before the line that brings the subject. Everything you schedule on a sheet before its `a` is already drawn when it arrives (no pen, no sound), so a sheet that shows the plan again is `build(V, { at: S.a - 3, quick: true })`. In the quick version every scene is a sheet and the wipe is the exposure bar.
- **Never pan across a sheet to the next subject.** A fast sideways move over one big sheet reads as sliding the paper, not as a cut, and the corners of the last view stay in the next frame. `--check` reports it (平移换场), and it also reports anything drawn for an earlier view showing at the frame edge at rest (串场), this view's own content cut by the frame edge (出画), and lettering under the title block.
- **On a sheet the camera only pushes in or pulls out.** `S.cam([{ at, x, y, zoom, dur, ease }])` arrives at `at` (eased move from `at - dur`); `S.fit({ x, y, w, h }, pad, band)` frames a box (top-left x, y) and keeps a caption band free (`band`: 0.15 landscape / 0.3 portrait). Frame each sheet once on arrival (hold it until the next sheet, or lean in slowly through a long line), push into a part, and pull back out to the whole at the end.
- **Detail = push + focus.** Draw the callout circle and letter on the plan, push the camera into it, and `B.focus(V, { x, y, r, at, dur })` lets the rest of the drawing fall back (dim) so the part reads as a detail. Letter the detail's leaders, dimensions and title on a second view with the same placement (they are not dimmed), sized for the pushed zoom (`size / zoom`). Plan lettering that would be blown up by the push gets `until` just before it.
- **A separate detail view** (`B.detail(V, { x, y, r, letter, to, scale })`: a clipped, magnified copy titled `DETAIL A / SCALE 2:1`, with the same coordinates as the source, annotated on `D.ann`) belongs on *its own sheet* or right beside the part in one framing: build a clipped view on the new sheet (`B.view(S, { …, ox, oy, clip: { x, y, r } })`) and call the same build function into it.
- **Portrait is its own layout**: arrange the views vertically on the sheet. A train runs top to bottom (choose the meshing directions by `F.portrait`), tables and details are stacked, and leader texts are shorter (Chinese only). Write positions with `B.L(landscape, portrait)`.

## 7. Sound
- Music (`styles/blueprint/score.js`, D minor, 96 BPM): patient clockwork minimalism. A soft pad, a plucked ostinato in even eighths (a train of wheels), a woodblock on the off-beats (an escapement), a sub, a bell motif. Kick and strings come only at the climax. With narration it is a bed: pulse, motif and woodblock drop out under the voice.
- Sound effects (`sound.js`), one material: a drafting room and a bench.
  - `draw`: a plotter servo along a line, with paper;
  - `letter`: lettering;
  - `dim`: a ruler click;
  - `hatch`: hatching;
  - `pencil`: the red pencil;
  - `stamp`: the title block updates;
  - `expose`: a new sheet;
  - `slide`: a sheet slides over;
  - `explode`: parts slide apart;
  - `cut`: a cutaway opens;
  - `tick` / `tock`: escapement beats, emitted by `M.escapement` whenever beats are slow enough to hear (gain may be a function of time: louder where the escapement is the subject).

  Light effects are dropped under the voice automatically.
- Voice default (`explain.json`): zh Yunxi, en Andrew, +2 %, lead-in 1.6 s.

## 8. Signature moves (pick per film)
- **The drawing assembles**: construction lines, then the final weight, with the plotter pen. Use it for the hook, where the whole mechanism is drafted in five seconds and is already running.
- **The mechanism runs while you explain it**, at an honest rate shown on the sheet: slow motion for an escapement, time-lapse for a train, a spring letting down five turns in four seconds.
- **Detail callout → push**: the circle and letter on the plan, the camera pushes in, the rest of the plan falls back (`B.focus`), and the part keeps running in step with the rest.
- **Section A–A**: the cutting-plane line with arrows and letters on the plan, and the section beside it with hatched cut faces (thin parts solid, shafts not hatched).
- **Exploded view**: parts slide out along their axes with leaders following, then reassemble.
- **The arithmetic built term by term**: a formula lettered piece by piece as each number is said, with the meaning lettered under each term (`28,800 = 2 × 15 × 960`).
- **Parts list / spec table** drafted row by row as each part is named.
- **The pull-out**: on the last sheet the camera pulls back to the whole mechanism with its title, and the parts named through the film are tagged on it.

## 9. Mechanisms (kinematics)
`const M = B.mech(V, { time })` builds a mechanism on a view. One body is the driver, and every other body's angle is solved from it:
- **Meshing pairs** turn the other way at the tooth ratio, with the phase set so that a tooth of one sits in a gap of the other on the line of centres. Bodies on one arbor turn together.
- `M.gear({ id, teeth, m, kind, … })` places a gear in one of three ways: `x, y`; `mesh: 'id', dir: degrees`, which uses the centre distance m (z₁ + z₂) / 2; or `arbor: 'id'` (coaxial). `kind`: `wheel` (radial flanks + ogival tips), `pinion` (short rounded leaves), `escape` (Swiss club teeth leaning with the rotation), `barrel` (fine teeth). `spokes` crossings, `hub`, `bore`, `under: true` (beneath what is already drawn), `drive` / `rate` (the driver). A gear placed by hand *and* meshed (`x, y, mesh`) is checked: same module, right centre distance (`--check` warns).
- `M.escapement({ wheel, bph, amp, impulse, fork: { angle, dist, swing }, balance: { r, dist, arms, turns } })`: the Swiss lever escapement becomes the train's driver.
  - The escape wheel advances half a tooth per beat; the fork flips on each beat (the pallet that locks is found from the geometry); the balance swings A·sin(π·beats); the hairspring breathes (inner end on the collet, outer end at the stud).
  - The impulse window is stylized (`impulse`, default 0.16 of a beat; the real one is a few %); say so in brief.md.
  - It returns `{ f, Pf, Bc, br, fork, balance }`.
- `M.spiral({ x, y, r0, r1, turns, wind: (t) => 0…1, follow })`: a mainspring (wound = coils packed round the arbor) or a hairspring.
- `M.coil({ a, b })`: a helical spring between two points (functions from `M.pt(id, [x, y])` stretch it with the parts).
- `M.part({ pivot, pts | d, angle: (tm) => rad | follow, ratio, offset, slide })`: a lever, pawl, arm or slider.
- `M.cam({ x, y, r, e | profile, follow | rate, follower: { dir, len } })`: a cam and a follower riding it.
- `M.rack({ mesh, dir, len, side })`: a rack driven by a gear.
- `M.rod({ a, b })`: a link between moving points.
- `M.hand({ arbor, len, kind, offset })`: a watch hand.
- `M.spin(id, { text })`: a direction arrow with a rate label.
- `M.angle(id, tm)`, `M.ratio(a, b)` and `M.rate(id)` (turns per mechanism second) let your labels use the solved numbers.

The same runtime explains other machines with these parts. A toilet cistern is `M.part` (float arm, flapper) + `M.rod` (chain) + `G.to` (water level as a moving group). A lock is `M.part` pins + `M.coil` springs + a turning `M.part` plug. An elevator is `M.gear` (sheave) + `M.rod` (cable) + `M.rack` or a group (car, counterweight). A camera shutter is `M.part` blades on a `follow`ed ring.

## 10. Pitfalls and self-check
- **Gears that look wrong**: meshing wheels must share a module (pinion module = the module of the wheel it meshes). Place gears with `mesh` + `dir` unless you are deliberately closing a loop (the motion work's hour wheel on the cannon pinion's axis); `--check` then verifies the centre distance.
- **Check the mechanism yourself on stills**: wheels turn the right way (meshing pairs opposite), the relative speeds match the ratios, a pallet stone locks against a tooth tip while the other lifts clear, nothing passes through anything. Render a close-up debug page (a view with a big `scale`) for the escapement once.
- **Strobing**: a gear that turns fast is shown blurred automatically. If you set `blur: false`, `--check` warns about teeth that strobe.
- **Too much lettering at small size**: frame tight (one view per line), and give each scene one large line (the view title or the key number). The phone check reports scenes with nothing readable.
- **Leaders crossing other text**: send leaders into free space (`to` outside the part, `side` toward the open side). Portrait needs its own leader directions and shorter texts.
- **Empty arrival**: a new sheet arrives drafting (draw its first lines from `S.a + 0.3`) or already drawn (scheduled before `S.a`); never a blank sheet waiting for the line.
- **Sliding the paper**: moving the camera sideways to the next subject on one sheet. Give the subject a new sheet; on a sheet, push in or pull out (see §6).
- Overlaps, stiff motion (switched-on text, the same entrance again and again, empty boxes) and the information count are checked by `--check` as usual. Everything in this style enters by drafting, so the stiff counters should stay at 0.

## 11. Variation
- Ground: cyanotype blue (default) ↔ diazo whiteprint (`ground: 'white'`).
- Layout: a developed train (left to right) ↔ a round plan ↔ an elevation + section pair ↔ an exploded assembly.
- Sheet changes: exposure ↔ slide ↔ cut; on a sheet: held framing ↔ slow lean-in ↔ push into a detail.
- Pace: slow motion for one mechanism in depth ↔ a time-lapse tour of a whole machine.

**Explainers (narrated)**: each part is drafted, named and dimensioned when it is said (`at: T.word('l3', '…')`). A new subject's sheet enters in the pause before its line (lines are often only 0.4 s apart: let the transition run into the start of the line); pushes and pull-outs are eased. Keep the caption band free (landscape below 0.84 H, portrait below 0.68 H) with `S.fit(…, band)`; captions are kept short (`captions: { max: 18 }`) so they clear the title block in the corner. Chapters in script.json give the chapter bar. The cover is `F.coverAt(t)`: the moment the hook drawing is complete with its title.

## 12. API quick reference
```js
const B = PROMO.blueprint(F, { ground: 'blue' | 'white', accent, colors, font, stencil });      // B.colors, B.font, B.L(landscape, portrait)
const S = B.sheet({ a, z, w, h, x, y, grid: 40, enter: 'expose' | 'slide' | 'cut', dur });          // x, y = where sheet (0, 0) sits in the box (room for negative coordinates)
S.cam([{ at, x, y, zoom, rot, dur, ease }]); S.fit({ x, y, w, h }, pad, band) → { x, y, zoom }; S.toFrame([x, y], t);
const V = B.view(S, { x, y, scale, rot, ox, oy, clip: { x, y, r } | { x, y, w, h } });              // local units (mm …) × scale = sheet units
const G = B.group(V, { pivot }); G.to({ at, dx, dy, rot, dur }); G.cut({ x, y, r | w, h, at, dur, from }); G.only({ … });
B.line(V, { a, b, kind, at, dur, until, pen, cons }); B.poly(V, { pts, close, fill }); B.path(V, { d }); B.circle(V, { x, y, r, from });
B.arc(V, { x, y, r, a0, a1 }); B.rect(V, { x, y, w, h, lw }); B.centre(V, { x, y, r }); B.hatch(V, { pts | rect | circle, hole, angle: 45, gap: 9, at, dur });
//   kind: 'visible' | 'thick' | 'thin' | 'hidden' | 'centre' | 'phantom' | 'cons' | 'cut' | 'pencil' | 'hatch'
B.label(V, { x, y, text, size, font: 'tech' | 'stencil', weight, align, valign, rot, maxW, color, at, until, kind, fact, chrome, knock });
B.title(V, { x, y, text, sub, size, align, w, at, until }); B.readout(V, { x, y, text: (t) => '…', facts: [...], at, until });
B.dim(V, { a, b, off, text, size, below, at }) · B.dim(V, { kind: 'dia' | 'radius', x, y, r, angle, text }) · B.dim(V, { kind: 'angle', x, y, r, a0, a1, text, rays });
B.leader(V, { from, to, on: G, n, text, size, r, side, maxW, at, until });
B.table(V, { x, y, cols: [w…], rowH, size, head, rows, at, every, ats, hot }) → { x, y, w, h, rowY(i) };
B.pencil(V, { kind: 'ring' | 'underline' | 'tick' | 'cross' | 'arrow', x, y, r, ry, w, a, b, bend, text, at });
const D = B.detail(V, { x, y, r, letter, to: [x, y], scale, sub, at, drawAt, labelAngle }); // draw into D (clipped), annotate on D.ann
B.focus(V, { x, y, r | w, h, at, dur, dim: 0.14, back });   // on a push-in: V's strokes outside the shape fall back to dim (letter on another view)
B.cutline(V, { a, b, letter, flip, at }); B.dial(V, { x, y, r, ticks, at });
B.frame({ at }); B.block({ title, no, scale, sheet, sheets, date, by, at, keys: [{ at, sheet, scale, title }] });
B.paper(layer, { variant }) → a static sheet inside an existing layer (the common interface uses it): .view is a scale-1 view in design px
const clock = B.clock([{ at, rate, ramp }]);   // clock(t) = mechanism time, clock.rate(t)
const M = B.mech(V, { time: clock });
M.gear({ id, x, y, mesh, dir, arbor, teeth, m, kind, spokes, hub, bore, lean, drive, rate, phase, under, solid, blur, pitch, centre, mark, jewel, at, dur, until, pen, instant });
M.escapement({ wheel, bph, amp, impulse, span, lock, depth, dir, fork: { angle, dist, swing }, balance: { r, dist, roller, arms, screws, turns }, hairspring, sound, gain, pen, at, until });
M.spiral({ x, y, r0, r1, turns, extra, packed, wind, follow, phase, w, at, dur, until }); M.coil({ a, b, coils, w, at, until });
M.part({ id, pivot, pts | d, angle | follow, ratio, offset, slide, fill, at }); M.cam({ id, x, y, r, e | profile, follow | rate, follower: { dir, len, w }, at });
M.rack({ id, mesh, dir, side, len, h, at }); M.rod({ a, b, w, kind, at }); M.hand({ arbor, len, w, tail, kind, offset, fill, at, until });
M.spin(id, { r, angle, sweep, text, size, gap, at, until }); M.pt(id, [x, y]) → (t) => [x, y]; M.angle(id, tm); M.ratio(a, b); M.rate(id); M.body(id); M.esc;
```
Time: `at` = drawn and readable; `until` = gone. Units: sheet coordinates are 1080p design px; a view's local coordinates × `scale`; type, arrowheads, balloons and line weights are in sheet units.

Common interface (`runtime/kit.js`, quick version and quick explainer):

| Move | In this style |
|---|---|
| `bg` | a sheet of its own (grid paper, cyanotype) |
| `word` | stencil lettering with its rules |
| `line` | technical lettering |
| `card` / `shot` | a drafted frame with corner centre marks / the screenshot revealed inside a drafted frame |
| `accent` | the red pencil rings the word |
| `wipe` | a UV exposure bar sweeps across |
| `end` | the name in stencil, the line, the url in a drafted box (a stamp) |

| Information move | In this style |
|---|---|
| `steps` | numbered balloons on a chain-line leader |
| `versus` | two views split by a centre line, the winner ticked in pencil |
| `figures` | drafted bars (hot ones hatched), each with a dimension line giving the value |
| `spotlight` | a detail circle with a letter on the screenshot, magnified |
| `flash` | a full sheet of colour with a grid and `SHEET n` |

## 13. Not supported yet
- Characters (no cast; for stories with people recommend whiteboard / ink / shadow / pixel / chat / manga / lumen).
- 3D (isometric / perspective projections): views are orthographic 2D. Use toy3d or isometric for depth.
- Involute tooth geometry for real meshing contact: the profiles are drawn to look right and meshing is kinematic; the teeth don't collide.
- Fluids (water in a cistern) as particles: show levels as moving groups / hatched areas.
- Importing CAD (DXF / SVG paths work through `B.path(V, { d })`, sampled).
