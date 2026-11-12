# Cutaway tour (剖视图解, `cutaway`)
One complete 3D model of a thing with insides, drawn like a textbook illustration and shown in a single take. Flat toon colour in two or three steps with one soft highlight; every outline is a darker tone of its own fill, never black; white paper outside, a cream interior. The film opens on the closed thing with a scale bar, a hole grows in its shell until it is a cutaway, and then the camera flies from part to part: at each stop everything else fades back, the part does one small action that shows what it is for, and an information card in the lower left says its name, what it does, and — small and grey — how the drawing differs from the real thing.

Reference (from the user, compared frame by frame): a 134 s square film of one human cell, rendered in code — fourteen stops of 7–9 s, one take, a three-row card, bordered labels with leader lines, one framed close-up, a closing pull-back to a field of cells with one number. The sample here does the same telling on a different subject.

Runtime: `runtime/cutaway.js` (`await PROMO.cutaway(F, opt)`, three.js; the starter pages have the import map). New project: explainer `node explainer/scripts/new.mjs <dir> --style cutaway`, promo `node promo/scripts/new.mjs <dir> --style cutaway`. Starter pages: `styles/cutaway/explain.html` (narrated: the usual way to use it), `styles/cutaway/index.html` (on the beat). The sample film (一只眼球的里面, 83 s) opens a human eyeball and follows a beam of light through nine stops, in 1:1 and 16:9.

## 1. When to use
- **One thing with an inside**, explained part by part: a cell, an eye, a heart, a tooth, a seed, an egg; the Earth, a volcano, a star; a battery, an engine cylinder, a hard drive, a camera lens, a thermos, a nuclear fuel rod.
- Anything where the answer to "what is in there, and what does each part do?" is a tour: 8–14 parts, each with one job.
- A process that happens *inside* the thing (light through an eye, ions through a membrane, magma up a vent, lithium between electrodes) — shown as beads or a drawn-on path through the cutaway.
- Hardware promos as a teardown: the product opens, each part is named with what it does.
- Not suited: systems spread over many places (use `isometric` or `map`), mechanisms whose point is how parts move against each other with exact ratios (use `blueprint`), stories with characters, anything that is mostly screens or text, subjects with no sensible "inside".

## 2. What it is (and isn't)
- What it is: **a museum model you can fly through, with a guide who admits what the model gets wrong.** One object, built to scale in real units, stays on screen for the whole film. The camera never cuts. Every stop names one part, shows it doing one thing, and says how it is drawn differently from reality.
- The third row of the card is the identity of the style. Illustrations always lie a little — things are drawn thicker, bigger, fewer, coloured — and this style says so every time. A film without those lines is not this style.
- It isn't `toy3d` (a vinyl toy operating a product UI, shallow focus, hard cuts), `isometric` (a whole little world in orthographic view) or `blueprint` (white line work on blue, drawn by a pen). It isn't a realistic render either: no textures, no soft shadows, no reflections, no depth of field, no black outlines, no dark "science documentary" background.
- It must not slide into: a glossy medical render; a flat 2D diagram with a camera pasted on; a slideshow of separate models (the model is one, and the camera travels inside it).

## 3. Color
- **Ground**: white paper outside (`opt.bg`), a cream interior (`'cream'`, the default `inner` of every shell). Faded parts go towards that cream (`opt.fadeTo`).
- **Parts**: candy colours, one hue per part, chosen so neighbours differ. The palette names work wherever a colour is taken: `peach orange red coral pink magenta purple violet lilac blue sky teal green lime yellow gold brown bone grey dark white cream`; add your own with `opt.palette: { name: '#…' }` (the sample names its colours after the parts).
- **Shading is derived, not picked**: the shadow step is the fill a little more saturated and warmer-darker, the deep step more so, the light step the fill mixed with white, plus one highlight blob. The outline is the fill at about 40 % brightness, more saturated. So one hex per part is all you choose.
- **Section faces** (where a cut passes through a wall) are flat colour in bands, lighter inside to darker outside (`rim: [colours]`); thin lines separate the bands.
- **White things** (bone, sclera, ice, porcelain) are drawn pale blue-grey or pale warm grey, never `#FFFFFF`: a white part on white paper disappears, and `--check` reports a subject too close to the faded ground.
- **Glass** (`glass: 0.3–0.6`) is the only transparency: a tinted, clearer-in-the-middle shell drawn over the finished picture (a cornea, a windscreen, a bell jar). Use it for things that really are transparent; say in the card that the tint is added.
- A promo takes the product's colour for the outer shell or the part being sold; the rest keep the candy palette.

## 4. Type
- Inter + Noto Sans SC (the starter pages load 500 / 700 / 800 / 900). All text is HTML over the picture: crisp at any zoom.
- **The card** (lower left; in 16:9 a column on the left): row 1 a colour chip and the name, heavy, 66 px at 1080p; row 2 what it does, one sentence, 42 px; row 3 the caveat, 33 px, grey (sizes measured on the reference). Rows arrive one at a time with the voice; a white panel grows behind them so the card reads over the model. A plain title card (`swatch: false`) opens the film.
- **Labels**: small bordered white boxes, 31 px bold, tied to a point of the model by a thin leader line ending in a square dot. Two to four words. Use them for sub-parts and for what is happening ("new protein", "blind spot").
- **The scale bar**: a line with end ticks and "24 毫米" above it. **The inset**: a bordered frame with a tab ("特写"), short grey captions inside. **The end plate**: a bordered white box with one number, one line, one small note.
- No captions by default (`captions: false` in the starter): the card is the film's text, as in the reference. If a film needs them (`captions: {…}`), keep the card clear of the caption band.
- Every card row, label, caption and plate line is registered for the fact check.

## 5. Motion
- **The model is alive but calm**: grains jostle (`wiggle`), beads keep flowing where something flows, the camera always drifts a little. Nothing bounces for decoration.
- **One action per stop**, and it must show the part's job: beads through a gate (`C.flow`), a thing that changes size because it really does (`part.to({ scale })`, a live `lathe` profile — the sample's pupil is 2 mm, then 8 mm, in real units), a path drawn on, all at once or a stage per stop (`part.draw(t, { from, to })`), a pulse on the thing being named (`part.pulse`), a layer stepping aside to show what is under it (`part.hide(t, { mode: 'fade' })`).
- **Opening the shell** is the film's one big move: `cut.to(t, value, { dur: 2 })`. A cone cut is a hole that grows from a point until half the shell is gone (the reference); a plane cut slices; a wedge takes a quarter out (planets, fruit, cylinders). Close it again at the end.
- **Fading back**: when the camera arrives, everything not in `focus` goes pale over half a second (about 60 % of the way to the ground colour, hue kept: `opt.fade`) and comes back as the camera leaves. Frame the subject large — the reference fills the frame with the model at every stop — so the faded surroundings stay a soft backdrop, not empty paper. Things that belong to the action (flows) never fade.
- Parts appear by growing (`show`, a small overshoot) or by fading in from the ground colour (`mode: 'fade'`); they leave the same way. Card rows slide in 14 px from the left over 0.45 s.
- Timing with a voice: the flight starts when the sentence about the next part starts and takes 1.4–2.2 s; the name row lands on the word that names the part; rows 2 and 3 on their sentences; the action on its verb.

## 6. Camera and transitions
- **One take.** `C.tour([...])`: each stop gives a subject (`look` / `focus` / `target` + `radius`), an angle (`az`: 0 = from the front (+z), 90 = from +x; `el`: degrees above the horizon) and how much of the free frame it fills. Between stops the camera glides on an eased path, pulling back a little on long trips. No cuts, no fades to white.
- A long lens (26° vertical) keeps the model's proportions honest; the camera may sit inside the opening but should not pass through walls — fly around through the cut.
- **Where the subject sits**: with a card on screen the subject keeps the upper two thirds (1:1, 9:16) or the right 60 % (16:9); without a card it is centred. `room: true` keeps the card's corner free on a stop that has no card of its own; `free: { x0, y0, x1, y1 }` places the subject anywhere (to make room for an inset or the end plate).
- Look **into** the cutaway: put the cutter's axis on the side the camera will be. Views of an inner wall work best 30–40° off its normal; a wall seen from straight above its rim is a sliver.
- The film begins and ends on the whole, closed thing from the same angle.

## 7. Sound
- **The voice carries the film** and almost never stops; the music is a bed (`styles/cutaway/score.js`: a soft pad, a muted pluck in slow eighths, a sub bass, one bell motif for the closing; no drums).
- Effects are few and soft (`styles/cutaway/sound.js`): `open` (a cut opening or closing — a slow breath), `fly` (each flight, quieter), `pop` (a part or an inset appears), `tick` (a label), `card` (a card row; light, the engine drops it under speech), `draw` (a path drawn on), `chime` (the end plate).
- No gap of 1–2 s with music alone: the next sentence starts as the camera leaves. After the last word, give the picture one more event (the plate's note line, `noteAt`).
- A promo without a voice follows the beat: one stop per two bars, the card's rows on beats.

## 8. Signature moves
Pick per film; the first two are always there.
- **The growing hole**: the closed shell, a point opens, the opening widens into a cutaway while the camera rises to look in.
- **The three-row card** with its "how this differs" line.
- **The scale bar that is true**: tied to the camera, spanning the part it measures (`of`), or a round length that follows the zoom (`nice: true`).
- **A thing for size**: an everyday object built at its real size next to the model (the sample's table-tennis ball).
- **The framed close-up** (`C.inset`): something too small to see at this scale gets its own little model in a bordered frame, tied to its place by two lines.
- **A layer steps aside**: an outer part fades away to show the layer under it, then returns.
- **The path through**: light, a signal, a fluid drawn as a line or beads through the open model, with a label where it ends.
- **The closing number**: the thing closes, the camera pulls back, a bordered plate states one figure.
- **Exploded view** (`C.explode`): the parts slide apart along an axis and come back.

## 9. Modelling
Build the model in real units and say so: `PROMO.cutaway(F, { units: { unit: '毫米', per: 1 } })` means one model unit is 1 mm; the scale bar and its check depend on it. Axes: +y up, +z towards the viewer at `az: 0`.
- **A shape is a function**: the radius in every direction from a centre (`C.shape.*`). The same function gives the surface, its inner wall, the section face where a cut crosses it, and where grains sit on it. Combine: `union(sphere(12), offsetSphere([0, 0, 5.3], 7.8))` is an eyeball with a corneal bulge; `bumpy(…)` roughens; `lobed(…)` makes a lump.
- **Shells** (`C.shell`) are walls with an inside (`thickness`), solids (`solid: true`: the section runs to the centre — nested solids give a planet's layers) or thin skins. Nested shells that share one cutter show their layers as bands on the section.
- **A part of a larger shape** (the cornea on the eyeball, a lid on a jar): the same shape function, limited by a second, fixed cutter (`cut: [main, limit]`, `nocap: [limit]`).
- **Tubes** for anything long (nerves, vessels, pipes, muscles — `flat` makes a ribbon), **stacks** for plates, **capsules** with folds, **lathes** for anything turned (and for shapes that change: give the profile as a function of time), **grains** for thousands of small things (on a surface, inside a volume, along a path), **flows** for things that travel.
- **Composite parts**: `{ into: part }` adds a piece to an existing part, so it fades, shows and is framed as one thing.
- **Draw to scale where you can, and write down where you can't.** Each deliberate exaggeration (a wall drawn thicker so it can be seen, a spot drawn larger, a million fibres drawn as one tube, colour added to something clear) becomes a caveat line on that part's card.
- Contents that should be sliced with the shell take the same `cut`; contents that should stand whole inside the opening don't.

## 10. Facts and the caveat line
- `brief.md` gets a section for them (the sample calls it "画得不真实的地方"): each caveat **verbatim**, and in the same bullet the real figure, what the model does instead, and the source. `--check` compares every caveat on screen with that section and reports one that is missing or whose bullet names no source.
- Write caveats about the drawing, not more facts about the subject: "Really 0.5 mm thick; drawn thicker and tinted", "About a million fibres, drawn as one tube", "Left empty: it is transparent", "Only a few rays drawn; refraction simplified to two bends".
- A part with nothing to confess takes `caveat: false` (rare; `--check` asks otherwise).
- Numbers on the scale bar come from the model: `--check` measures the bar's span in the model, converts it with `units`, and fails the film if the number on screen is more than 4 % off.

## 11. Pitfalls and self-check
- **`az` is where the camera is**, measured from the front: `az: 150` is behind the model. A part "missing" from a still is usually behind something from that side.
- A white panel grows behind the card; in 16:9 it can sit on the subject if the subject drifts left — `--check` reports a card, label or inset covering the subject.
- A cone cut's axis passes through the cutter's centre: things on the axis are cut along a shallow cone, not a flat plane. Put what must stay whole below the opening angle, or use a plane cutter.
- A tube that starts inside a wall pokes its rounded end into the cavity: start it outside the wall.
- Grains laid out by the golden-angle spiral look like a pattern: add `scatter`.
- Glass is drawn after the outlines and has none of its own; its edge darkens instead. Don't make large flat things glass.
- Pale subjects: when the rest fades, a subject near the ground colour fades with it (`--check`: "subject too pale").
- A stop shorter than about 6 s cannot fit three rows and an action; merge the part with its neighbour or drop a row's length.
- The card lingers 0.45 s into the next flight and is gone before the next card's first row; give `cardUntil` to hold one card across two stops.
- What `--check` reports for this style: subject out of frame or under 5 % of the frame; card / label / inset over the subject; label over the card; subject too pale against the faded ground; a card without its caveat; a caveat missing from `brief.md` or without a source; a card row that appears while nobody is speaking; a last row with too little time to read; a scale bar whose number disagrees with the model, is not drawn to the camera, or runs off the frame; a flight too fast for its length.
- On the rendered frames: outlines the same weight everywhere; no black lines; the section bands readable; each stop's subject the most saturated thing in frame; card rows landing on their words; nothing poking through a wall.

## 12. Variation
- **The cut**: a growing hole (cone), a clean half (plane), a quarter out (wedge), an exploded stack. **The palette**: warm candy (default), cool minerals for geology, the product's own colours for hardware.
- **The telling**: outside → in (a cell, an eye), top → bottom (a volcano), along a path (follow the light, the current, the food), by layer (peel one, then the next).
- **Pacing**: 10–14 stops of 7–9 s for a full tour (2 min); 5–6 stops for a 45 s short; a promo of 4–5 stops on the beat.
- **The ending**: one number on a plate; the thing next to its everyday size comparison again; a pull-back to many of the same thing (instanced `grains` of a simple stand-in).

## 13. API quick reference
```js
const C = await PROMO.cutaway(F, { units: { unit: '毫米', per: 1, ladder: [['微米', 0.001], ['毫米', 1]] }, palette: { name: '#hex' }, bg, fadeTo, fade: 0.62, light: [x, y, z], line: 2.6, fov: 26, ss: 2 });

// shapes (radius by direction): C.shape.sphere(r) · ellipsoid(a, b, c) · box(w, h, d, p) · pill(rx, hy, rz, q) · capsule(r, len) · cylinder(r, h) · offsetSphere([x, y, z], r)
//   union(f, g, …) · bumpy(f, amp, freq, seed) · lobed(f, n, amp, seed) · along(f, 'y' | 'z')

// cuts
const cut = C.cutter({ type: 'cone' | 'plane' | 'wedge', axis: [0, 1, 0], from: [0, 0, 1], at: [x, y, z], value });
cut.to(t, value, { dur, ease });   // cone: half-angle in degrees; plane: distance of the plane from the centre; wedge: opening in degrees

// parts — common options: { name, at, rot: [degrees], scale, color, in: group, into: part, layer, hidden, showAt, cut: cutter | [two], line: 'full' | 'thin' | 'none' | 'full+crease', glass: 0–1, nodim }
C.shell({ shape | r, thickness | solid, inner, rim: [colours], paint: (x, y, z) => colour, nocap: [cutters], seg })   // .surf(dir, lift, side) .on(dir, lift, side)
C.blob({ r, lobes, amp, seed })
C.tube({ path: [[x, y, z], …], r | r: (k) => …, flat, closed, straight })   C.tubes([paths], { colors, r: (k, i) => …, sequence })   // .along(k, i)
C.rod({ a, b, r })   C.rods([[a, b], …], { r })   C.wander({ n, step, turn, from, dir, within | on: f, lift, seed }) → points
C.stack({ n, r | w + d, h, gap, bend, taper: (i, n) => s, colors })   // .plate(i)
C.capsule({ r, len, wall, inner, folds: { n, depth, thick, color } })
C.grains({ n, r, on: shell (side: 'in', where: (dir) => bool, scatter) | within | along | points | fn: (i, rnd) => ({ p, n, s }), shape: 'ball' | 'ring' | 'rod' | 'cone' | 'disc', colors, jitter, wiggle })
C.flow({ path | (k, i, t) => Vector3, n, r, at, until, period | dur + every, spread })
C.ball({ r })   C.ring({ r, tube })   C.disc({ r, h })   C.box({ w, h, d })   C.cone({ r, h })   C.lathe({ profile: [[r, y], …] | (t) => [[r, y], …] })
C.group({ at, rot })

// verbs
part.show(t, { mode: 'pop' | 'fade' | 'none', dur })   part.hide(t, …)   part.to(t, { pos | by, rot, scale, dur, ease })   part.pulse(t, { amt, dur, n })
part.spin(t, until, { axis, rpm })   part.draw(t, { dur, from, to })   part.p([x, y, z]) → anchor   part.center()
C.show(parts | 'layer', t, { stagger })   C.hide(…)   C.explode(parts, { at, until, dist, dir | from })   C.onFrame((t) => …)

// tour and information
C.tour([{ at, dur, look | focus: [parts] | target: [x, y, z] + radius, az, el, fill, dim, room, free: { x0, y0, x1, y1 }, drift: { az, el, zoom }, lift, ease,
          card: { color, name, what, caveat | false, at: [t1, t2, t3], items: [{ color, text, at }], swatch: false }, cardUntil, labels: [{ on, text, at, until, dx, dy }] }, …]);
C.label({ on: part | [x, y, z] | () => Vector3, text, at, until, dx, dy })
C.scaleBar({ of: part, width, text, at, until } | { span: [a, b], text } | { nice: true, x, y })
C.inset({ on, title, at, until, rect: { x, y, w, h }, build: (K) => { /* the same kit: K.shell, K.grains, K.flow … */ }, view: { target, dist | fill, az, el, spin }, texts: [{ text, x, y, align, at }] })
C.plate({ title, sub, note, noteAt, at, until, x, y, width })
C.run();
```
Minimal film: `styles/cutaway/explain.html`.

## 14. Not supported yet
- No quick mode (`--quick`) and no `kit.js` adapter: hand-written only.
- No imported meshes (glTF / OBJ): models are built from the kit's shapes. Shapes must be "star-shaped" around their centre (every surface point visible from it); anything else is composed from several parts.
- Section faces exist for shells only. Tubes, lathes and grains that are cut show their inside colour instead of a true capped face.
- Glass has no refraction and no outlines; at most a few glass parts per film.
- No characters or hands, no text on the model's surfaces, no cast shadows.
- The camera does not avoid walls by itself.
