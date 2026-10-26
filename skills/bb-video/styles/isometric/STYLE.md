# Isometric miniature world (等距微缩世界, `isometric`)
A whole little world seen from a fixed 45° isometric view: square tiles of ground on thick plinths, with gaps between them, each tile one part of a system (a warehouse, a sorting hall, a highway, a station, a street). Everything is low-poly with rounded edges and flat, friendly colours on a pale background, lit by a soft sun with contact shadows. Things inside move on their own: little people walk and carry, belts run, scanners beep, vans and trucks drive, windows light up at night. The camera glides across the world, pushes in on one part and pulls back to the whole system; the part being talked about lifts a little and stays in colour while the rest fades back.

References (found and compared, `videos/parcel-journey-iso/research/references.md`): M Wildan Cahya Syarief's *3D Isometric City* (rounded blocks, road markings, lollipop trees, chunky cars), Harrison Schell's explanatory isometric dioramas (flows drawn on the ground, text in the empty sky), Mohamed Chahin's separate isometric tiles (gaps, thick sides, pale ground). Without a reference from the user, look at real isometric illustration again for the subject at hand and compare the stills before showing them.

Runtime: `runtime/isometric.js` (`await PROMO.isometric(F, opt)`, three.js with an orthographic camera; the starter pages have the import map). New project: explainer `node explainer/scripts/new.mjs <dir> --style isometric`, promo `node promo/scripts/new.mjs <dir> --style isometric`. Starter pages: `styles/isometric/explain.html` (narrated), `styles/isometric/index.html` (promo). Sample: `videos/parcel-journey-iso` (一个快递是怎么到你手里的).

## 1. When to use
- Processes and systems: many parts working at once and connected — logistics, supply chains, how a city / a factory / a power grid / the internet / a payment works, how data moves between services, a company's pipeline.
- "Follow one thing through the system": a parcel, a letter, a drop of water, a request, an order — it travels from tile to tile while the system keeps running around it.
- Before / after and scale: the same world quiet, then busy (streams of things); a counter on a pole; a clock per stage.
- Products whose value is a system (logistics, infrastructure, B2B platforms, developer tools that connect services) — told as a working model.
- Not suited: a single object's details (use `toy3d` or a photo style), emotion and character drama (people here are tiny and faceless — use `whiteboard`, `shadow`, `pixel`, `chat`), long text, real UI screenshots (put the UI on a sign or use `launch`).

## 2. What it is (and isn't)
- What it is: **the explanation is a working model**. Each stage is a place; the flow is something you can watch move; numbers are planted where they happen (a clock card on its stage, a counter over the pile).
- **Not toy3d.** `toy3d` is a low, long-lens perspective shot with very shallow focus of one vinyl toy operating product-UI slabs on a dark desk, hard-cut on the beat. Here: orthographic (no perspective, parallel edges), everything sharp, pale background, many small things at once, one continuous camera that glides (no cuts), a system rather than a character.
- It isn't: generic boxes and arrows (information goes on the ground and in the world: routes painted on the road, flows of parcels, piles, poles with cards); a city flythrough with a perspective camera; floating UI cards in empty space; a dark "tech" look.

## 3. Colour
- Palettes (`opt.palette`): `'day'` (default: pale grey-green ground, grass, warm concrete, slate asphalt, coral roofs), `'mint'` (cooler, softer), `'peach'` (warmer). Override any colour by name: `{ palette: { grass: '#…', accent: '#…' } }`. Colour names work everywhere a colour is taken (`'grass'`, `'concrete'`, `'asphalt'`, `'floor'`, `'water'`, `'sand'`, `'wall'`–`'wall4'`, `'roof'`, `'roof2'`, `'metal'`, `'dark'`, `'wood'`, `'leaf'`, `'parcel'`, `'accent'`, `'accent2'`, `'ink'`).
- Two signal colours only: `accent` (coral by default) for the thing being followed and its route; `accent2` (teal) for the brand / the machines. Everything else is the world's own colour.
- **Invented branding only** for companies in the world (vans, signs, uniforms): pick a colour no real company in that field owns, and an invented name; the sign helper draws a small isometric cube as the mark (`signMark: true`, `brand: { text, color, mark }`). Never a real company's logo, colours or uniform.
- Focus fades the rest towards a pale grey of the background (about 60%); at night the background is navy, windows and lamps glow warm.

## 4. Type
- Fonts: Nunito (round Latin) + Noto Sans SC (the starter pages load them).
- Text lives in three places: **cards on poles** stuck into the world (`W.label`, `W.counter`, `W.timer` — HTML, crisp at any zoom, 48 px at 1080p so they read on a phone), **titles in the sky** (`W.title`, on a soft panel of the background colour), and **painted signs** on buildings / vans (decoration plus a name; not for reading key facts). No text lying flat on the ground except a route.
- Cards keep themselves inside the frame: below the chapter bar, off the edges (the pole shortens, the card slides sideways). `--check` still reports a card that is cut or sits in the caption band.
- All card / title / sign text is registered for the fact check.

## 5. Motion
- **Things move on their own all the time**: belts run, racks blink, streams of parcels (`W.stream`), traffic (`A.loop(path, at, { closed: false })`), people pacing. A held shot is never a still picture.
- Movers follow paths with rounded corners (`A.move(path, at, { dur | speed })`); people swing arms and legs, wheels turn with distance. Typical speeds: people 1.2 m/s, belts 1.1–1.2 m/s, vans 3–4 m/s on screen.
- Hand-offs are physical: `A.toss(point, at)` (a little arc onto a belt, into a van door), `A.ride(host, at, offset)` (on a van, on a robot, in someone's arms — `person.carry(parcel, a, b)`), `A.hide(at)` when it goes inside, `A.show(at)` when it comes out. Write each mover's moves in time order (the console warns).
- Appearing: tiles drop in with a bounce (`tile({ at })`), the parts on them pop up one after another; parts or movers with their own `at` pop up then.
- One clear subject at a time: the thing being followed carries the accent colour (`parcel({ tape: 'accent', mark: 'accent' })`) and gets a card when it changes hands.

## 6. Camera and transitions
- **One continuous camera.** Keys in `W.camera([...])`: each glides from the previous over `dur` (default 1.4 s, ease in-out), then drifts in slowly while it holds. `cut: true` only when you really need a cut.
- **Frame by what must be seen**: `fit: [tiles, parts, movers, points]` computes the framing (landscape and portrait separately), leaving `room` at the top for titles / the chapter bar and at the bottom for captions (`room: { top, bottom }`). A tile in `fit` includes what stands on it. `min` keeps a push-in from going too close; `follow: mover` tracks something moving.
- Grammar: **pull back** to show the system (all tiles; titles in the sky), **pan** along the flow as the thing travels (fit the two tiles it travels between), **push in** on one part to explain a detail (fit the machine and the people at it).
- **Lay the world out in a zigzag** (+x, then −z, then +x …): the chain then runs left to right on a 16:9 frame. A straight line along x or z runs diagonally and leaves the frame half empty.
- Focus with the camera: `W.focus([tiles…], a, b)` lifts those tiles a little and fades the rest; time it with the camera key that frames them. Routes on a lifted tile rise with it.
- `turn: ±1` on a key turns the world a quarter turn (to show the other side); use rarely.
- Time of day: `W.sky([[t, 'night'], [t2, 'day']])` — a night section for things that happen overnight; windows and lamps light up by themselves.

## 7. Sound
- Music (`styles/isometric/score.js`): a little town at work — marimba-like plucks in steady eighths, soft bass, a woodblock ticking like machinery, a glockenspiel motif when the whole system comes together. Major key, light.
- Effects (`styles/isometric/sound.js`, emitted by the runtime): `land` (a tile drops in), `pop` (parts appear; only the first two of a tile make a sound), `draw` (a route), `beep` (a scanner), `drop` (a parcel lands), `tick` (a card), `glow` (focus), `click` (lights, locker doors), `whoosh` (camera glides), `motor` (pass `sfx: 'motor'` to a vehicle's move).

## 8. Signature moves
- **Follow one thing through the whole system**, handed from person to belt to vehicle to robot to person; the route of each leg is painted on the ground as it travels and stays, so the pull-back at the end shows the whole journey.
- **A clock per stage** (`W.timer`): the dial on each card fills its share of the total (`of`, `startFrac`), so four cards on four stages add up to one circle.
- **Quiet → busy**: the same world with one parcel, then streams on every belt and traffic on every road (`W.stream`, `loop`) — scale you can see.
- **Lift and fade** (`W.focus`): the stage being talked about rises from the table while the others turn pale.
- **Night falls on the long haul** (`W.sky`), windows light up; morning when it arrives.
- **Cutaway halls** (`W.walls` with doorways): two back walls, open front, so the work inside is visible.
- **A line through the air** (`W.arc` + `W.route({ flow })`): an order, a signal, a message flying between places as moving dashes.

## 9. The world kit
Every part takes `{ tile, x, z (local to the tile), ry (radians or 'n' | 'e' | 's' | 'w'), at, until, zone }`. Parts face +z (towards the camera's left) by default; the camera sees the +x and +z faces, so **doors, lockers and anything that must be seen face +z or +x**.

| Group | Parts |
|---|---|
| Ground | `tile` (top: grass / concrete / asphalt / floor / water / sand / colour; `side`; `h`), `road` (pts, width, dash, edge; `R.lane(±1)`) |
| Buildings | `building` (w, d, h, roof flat / gable / saw / arch, windows, door, awning, sign), `warehouse` (sawtooth roof, roller doors, `S.docks`), `house`, `tower`, `shop`, `walls` (cutaway, `doors`, sign) |
| Nature / street | `tree` (round / pine / bush), `lamp` |
| Machines | `conveyor` (from, to, speed; `C.path`, `C.dur()`, `C.at(u)`), `scanner` (on a belt; `S.scan(t)`), `sorter` (main belt + branches; `S.path(i)`, `S.dur(i)`), `shelf` (`S.slot(l, c)`, `S.take(l, c)` → a parcel), `rack` (blinking server cabinet), `cage` (`S.slot(k)`), `locker` (`L.cell(c, r).open(a, b)`, `.inside`), `table` (`T.top(x, z)`), `stack` (a pile growing parcel by parcel) |
| Movers | `person` (shirt, pants, hat cap / helmet / hair, `carry`), `van`, `truck`, `trike` (with a rider), `car`, `bot` (warehouse robot), `parcel` (size, tape, mark) — all with `place / move / loop / ride / toss / wait / show / hide`, `door` and `bed(k)` offsets for vehicles |
| Information | `route` (pts, at, dur, color, width, flow, arrow), `arc` (a path through the air), `label`, `counter`, `timer`, `title`, `stream`, `focus`, `lights`, `sky` |

Low-level helpers for parts of your own: `W.part(o, kind)` → `S.g` (a group) + `S.done()`, and `W.box / cyl / sph / cone(parent, zone, colour, x, y, z, …)` (rounded, standing on y). Give a part `zone: 'own'` (or a shared `W.zone('name')`) when `W.focus` must light it up without its whole tile.

## 10. Pitfalls and self-check
- Doors and faces that point away from the camera are invisible (the camera looks from +x +z): the doorstep, the locker front, the van's loading door must face +z or +x.
- Create tiles before routes (a route finds the tiles under it so it can rise with a focused tile).
- A mover's moves must not overlap in time; when it is carried, the carrying segment (`ride`) replaces its own movement until the next move.
- Cards: the pole shortens to keep the card under the chapter bar; when two stages are close in the whole view, give their cards different pole heights or anchors.
- `--check` reports: cards cut by the frame or in the caption band, focus or a route head out of frame, a mover jumping in frame, a camera glide too fast. Then look at `--stills` at every stage and at the whole view, and run the frame check of the render (`render.mjs`, then `--scan`).
- Phone legibility: cards are 48 px; titles 92 px. Anything smaller is decoration.

## 11. Variation
- Palette (`day` / `mint` / `peach`, or the product's colours) and time of day (a whole film at dusk).
- Layout: zigzag chain (a process), a ring of tiles around a centre (a hub and its spokes), one big tile pushed into (a single place in detail), a grid (a city).
- Pace: an explainer glides once per line; a promo moves on the beat (`F.beat`), tiles dropping in one per beat.

## 12. API quick reference
```js
const W = await PROMO.isometric(F, { palette: 'day' | 'mint' | 'peach' | { …colours }, bg, accent, angle: 'iso' | 'game', ao: true | { intensity, radius } | false, bloom, blur });
const t = W.tile({ x, z, w: 8, d: 8, h: 0.9, top: 'grass', side, at, until, name });   t.p(lx, lz, ly) → world point
W.walls({ tile, x, z, w, d, h, sides: ['n', 'w'], doors: { n: [[x0, x1]], w: [[z0, z1]] }, sign, signMark, floor });
W.building({ tile, x, z, ry, w, d, h, roof, color, roofColor, windows, door, awning, sign, lights });  W.warehouse / house / tower / shop / tree / lamp
const R = W.road({ tile, pts: [[x, z]…], width, dash, edge });  R.path, R.lane(±1)
const C = W.conveyor({ tile, from: [x, z], to: [x, z], width, speed });  W.scanner({ on: C, u }).scan(t);  const S = W.sorter({ tile, from, to, outs: [{ u, side, len }] });  S.path(i), S.dur(i)
const sh = W.shelf({ tile, x, z, w, levels, cols, fill });  sh.take(l, c) → parcel;  W.rack / cage / locker / table / stack
const A = W.person | van | truck | trike | car | bot | parcel({ at, until, … });
A.place(p, at, ry).move(path, at, { dur | speed, ease, face, sfx }).toss(p, at, { dur, h }).ride(host, at, [x, y, z]).loop(path, at, { period, closed }).show(at).hide(at, { fast });  person.carry(parcel, a, b)
W.route(path, { at, dur, until, color, width, flow, arrow });  W.arc(a, b, h);  W.stream(path, { tile, at, until, every, dur });
W.label(anchor, { text, sub, at, until, h, color });  W.counter(anchor, { to, from, unit, at, until });  W.timer(anchor, { value, of, startFrac, unit, sub, at, until });  W.title({ text, sub, at, until, size });
W.focus([tiles | parts | movers], a, b, { dim, lift });  W.lights(thing, at);  W.sky([[t, 'day' | 'dusk' | 'night']]);
W.camera([{ at, fit: [...], dur, ease, room: { top, bottom }, min, drift, turn, cut } | { at, look, size } | { at, follow, size }]);
W.onFrame((t) => …);  W.run();   // debugging a framing: W.framing(key), W.fitPoints(list)
```
Time: `at` = the moment it is there (on the beat / on the word); `until` = gone.

Common interface (`runtime/kit.js`, the quick version `PROMO.film`): **not yet**, see section 13.

## 13. Not supported yet
- The quick version (`PROMO.film` / `--quick`) and the common interface (kit's word / line / card / shot / steps / versus…): this style is hand-written only. Explainers start from `styles/isometric/explain.html`.
- Real screenshots or video inside the world (only painted signs).
- Characters with faces or expressions (the people are tiny figures; for character stories see `../CHARACTERS.md`).
- Terrain with slopes, rivers that bend, bridges: tiles are flat (hills are cones, water is a flat tile).
- Portrait (9:16) works (framing is computed for it), but a long zigzag chain is small in a tall frame: frame two or three tiles at a time there.
