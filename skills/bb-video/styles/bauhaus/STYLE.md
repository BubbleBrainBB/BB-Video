# Style: constructivism / Bauhaus (构成主义 / 包豪斯, `bauhaus`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

A frame: cream printing paper, mostly red and black, with touches of Bauhaus yellow and blue. A big circle, a thick black bar and a wedge cut diagonally into the frame, in an asymmetric composition. Heavy sans slogans set on a diagonal, slammed in letter by letter. Things are "assembled" from circles, squares and triangles. Transitions are a big red wedge, a big circle or a few colour bands sweeping across the frame. Motion is machine-like: crisp, precise, sliding in along a straight line and clicking into place.

Runtime: `runtime/bauhaus.js` (`PROMO.bauhaus(F)`). New project: explainer `node explainer/scripts/new.mjs <dir> --style bauhaus`, promo `node scripts/new.mjs <dir> --style bauhaus` (add `--quick` for the quick version). Starter page: `styles/bauhaus/index.html`.

## 0. Safety
- Hard cuts between big black / white / red blocks and full-screen red transitions: at most once every 3–4 s in a passage; don't sweep on every beat.
- Rays and rotating circles must not flicker constantly or spin fast (rotate slowly, `spin` ≤ 30 degrees / second).

## 1. When to use
- **Manifesto- and slogan-style** films: launches, new-product manifestos, "why we do this", calls to action.
- **About structure and composition**: "what parts something is made of" (build it with `B.assemble`), processes, comparisons, a few numbers.
- History (especially early-20th-century design, architecture, industry, modernism), design content, tools and productivity products.
- Less suited: warm, soft, handmade-feeling products (use cut-out or origami); content that relies on the mood of lots of real photos; stories about named people (this style has no characters, see `../CHARACTERS.md`).

## 2. What it is (and isn't)
- **What it is**: geometric composition. The frame has only a few materials: basic shapes (circle, square, triangle, thick bar, wedge), heavy sans type, printing paper. Information is carried by **compositional tension** (diagonals, contrast of scale, asymmetry), not by decoration.
- **What it isn't**: ordinary flat design with some red and black added, nor a copy of Soviet posters (no political symbols like hammer and sickle or leaders' portraits; never copy any specific famous work).

## 3. Color
- Ground: cream printing paper `#EFE7D6` (`ground: 'paper'`, default); a scene may switch to solid red (`'red'`) or solid black (`'black'`) for emphasis.
- Main colours: red `#D3281C` + black `#161413`; accents: yellow `#F1B60A`, blue `#1E4E9C` (the Bauhaus primaries). At most 2 main colours + 1 accent per scene.
- **Brand colour**: when the product has a distinctive brand colour, it replaces red (`PROMO.bauhaus(F, { colors: { red: '#…' } })`, quick version `film({ brand })`); when the brand colour is black / white / grey, keep red. Write where the colours come from in brief.md.
- Text colour: black on light grounds with red for emphasis; cream on red / black blocks (`color: 'paper'`).

## 4. Type
- Slogans and big type: Noto Sans 900 for Latin, 思源黑体 Heavy (Source Han Sans Heavy; Noto Sans SC 900) for Chinese; captions: 700 of both; numbers: Oswald condensed (all OFL, loaded from jsdelivr in the starter page's `<head>`). **List the Latin font before the Chinese font**: in Chinese fonts ’ “ ” are full-width glyphs, so can’t shows as "can’ t" (`--check` warns about it).
- **Slogans are set on a diagonal** (`rot` mostly between -15° and 15°; within a scene the diagonals go the same way or alternate), slammed in letter by letter; `block` makes a colour bar extend from the left first and sit under the text.
- Captions are set horizontally with a small colour bar on the left (`bar`), "printed" from left to right.
- Sizes: captions 36–48, titles 56–80, slogans 120–180, big numbers 180–260 (design size); captions no smaller than 34 on a phone.
- Leave at least 1.1× the type size between two diagonal slogan lines; push captions under a long diagonal slogan a bit further down (the longer the diagonal, the higher its right end).

## 5. Motion
- **Slide in and click into place** (`slide`, default): slides in from off-screen along the shape's own direction (or the angle given by `from`), decelerates and stops, no bounce.
- **Grow** (`grow`): thick bars, wedges and columns extend from one end (`origin`: left / right / top / bottom).
- **Pop to size** (`pop`): circles, rings, numbers, with a slight overshoot.
- **Spin in** (`spin`): triangles and squares rotate as they land.
- **Wipe in** (`wipe`): photos and captions are revealed left to right.
- Leaving: slide out along the same direction (`exit: 'slide'`), or shrink back (`grow` / `pop`).
- Timing: appearances take 0.35–0.55 s, with start and end on the beat; no more than 3 things moving at once in one frame.

## 6. Camera and transitions
- The camera barely moves: open a scene with `B.scene(a, z, { ground, variant, push })`; each scene has a built-in, very slow push-in (default 1 → 1.02), so the picture never "stops" (the final-video check doesn't report it as frozen). Change comes from elements entering and leaving, not from the camera.
- Transitions: `B.wipe({ at, kind })`. Rotate between three:
  - `wedge`: a big red wedge strikes in from the right and sweeps away (default);
  - `circle`: a big circle grows to cover the frame and rolls away;
  - `bars`: four red and black bands push across, interleaved.

  The scene changes at the moment of full cover (`at`), on the beat. 0.5 s by default; full cover holds only 2–3 frames, and the next scene shows right after `at`.
- **A transition's colour must differ from the next scene's ground** (a red wedge sweeping onto a red ground = nothing seems to happen): write `onto: 'red'` (the next scene's ground) and the transition switches to black automatically. The hard shadow of cards on a red ground also switches to black automatically.

## 7. Sound
- Music: march and machine beats. String pads, plucked / staccato mechanical figures, kick and snare, short brass chords and a motif (`styles/bauhaus/score.js`, C minor, 116 BPM). With narration, drums, brass and motif drop out automatically while speaking.
- Sound effects (`sound.js`):
  - `clank`: a metal block clicking into place;
  - `thud`: a big circle landing;
  - `stamp`: a slogan or number stamped on;
  - `tick`: a caption printing;
  - `snap`: an arrow locking in;
  - `whoosh`: a transition sweeping across.

  Sound logo: two stamps + a metallic ring-out.

## 8. Signature moves (pick per content)
- **Assemble** (`B.assemble`): a few basic shapes fly in from all sides and click into place, forming a chair, a house, an icon — the most direct way to show "construction / composition".
- **A diagonal slogan** pressed onto a thick black bar, with a big red circle beside it (the end card is this composition).
- **Rays** (`B.rays`): a burst of wedges shooting out from a point — manifestos, loudspeakers, "spreading the word".
- **One cut through it**: a diagonally cut colour block splits the frame into red / black halves, for comparisons.
- **Thick bars as data**: numbers are black bars growing from a baseline, the key one red.
- **Thick arrows** (`B.arrow`) connect a few blocks to show a process.

## 9. Pitfalls and self-check
- Too empty: a constructivist frame should be full and tense. Each scene needs at least one big shape (big circle or thick bar) + one diagonal line of type. Small text alone on cream paper is weak.
- Too busy: past 5 or 6 shapes it loses its force. One hero shape per scene, the rest in support.
- Clashing diagonals: diagonals in a scene go roughly the same way (or clearly cross into an X); don't let everything tilt its own way.
- Text on shapes hard to read: when text and ground lack contrast, change the colour (cream on red blocks); `--check` warns about contrast.
- Self-check per `references/review.md`.

## 10. Variation
- Ground: cream (default) ↔ solid red ↔ solid black; a film can flip to a red or black ground for key passages.
- Leaning: more "constructivist" (red and black, diagonals, wedges, rays, tension) ↔ more "Bauhaus" (the three primaries, circle-square-triangle, grids, calm, rational).
- Pace: machine crispness (default) ↔ a slower showcase (appearances 0.6–0.8 s).

## 11. API quick reference
```js
const B = PROMO.bauhaus(F, { ground: 'paper', colors: { red: '#…' } });
const L = B.scene(a, z, { ground, variant, push: 0.02 });               // a scene: layer + ground + very slow push-in, shown only in [a, z)
B.bg(layer, { ground: 'paper' | 'red' | 'black', variant: 0–3 });          // ground only: printing paper + faint structural lines (big circle / diagonal band / grid / diagonals)
const s = B.shape(parent, { kind: 'circle' | 'ring' | 'half' | 'rect' | 'tri' | 'wedge' | 'cross' | [[x, y]…], x, y, w, h, r, rot, color, at, until,
  enter: 'slide' | 'grow' | 'pop' | 'spin' | 'wipe' | 'none', exit, from, to, origin, spin, texture: 'dots' | 'lines', stroke, z, sfx });
s.move(at, x, y, dur); s.turn(at, rot, dur);
B.slogan(parent, { text, x, y, size, rot, color, block, align, maxW, at, until, by: 'char' | 'word' });
B.label(parent, { text, x, y, size, color, bar, bg, align, maxW, wrap, at, until });   // wrap: true = wrap at maxW (no shrinking)
B.number(parent, { value, x, y, size, color, unit, prefix, from, digits, count, at, until });   // count: false = no counting, stamp it directly (years, f-stops)
B.assemble(parent, { parts: [{ kind, x, y, w, h, r, rot, color }…], x, y, scale, every, at, until });
B.rays(parent, { x, y, angle, spread, n, len, thick, color, at, until });
B.arrow(parent, { x1, y1, x2, y2, w, color, at, until });
const win = B.window(parent, { x, y, w, h, at, until, color, border });       // a frame (browser, car window, phone screen): nothing outside it is visible
const L1 = win.layer(0.4), L2 = win.layer(1, { loop: { x: 900 } });   // several layers, each with its own speed; draw inside a layer (coordinates from the frame's top-left); loop = a strip joined end to end (draw it twice or more)
win.scroll(at, dur, { dx, dy, flat }, ease);                              // each layer moves distance × speed: parallax (flat: true = all layers at the same speed, "parallax off")
win.drift(at, until, { vx, vy });                                         // each layer keeps moving at constant speed (px per second × speed); loop layers wrap around by period and never run out (outside a car window)
win.animate((t, speed) => ({ dx, dy }));                                  // your own displacement (stop-and-go stutter), called once per layer; win.layers = the layers
s.animate((t) => ({ dx, dy, rot }));                                      // a shape moving continuously over time (added to move)
B.photo(parent, { src, x, y, w, h, shape, tint, at, until });               // a black-and-white photo cut into a shape + tinted (for mood; product screenshots go in unaltered with S.shot)
B.wipe({ at, kind: 'wedge' | 'circle' | 'bars', onto, color, dur });     // → the moment of full cover; onto = the next scene's ground (switches colour automatically on a clash)
B.endcard(parent, { at, title, sub, url, urlSize });                         // URL size follows the big type by default (≥ 64)
```
Time: `at` = landed and readable (on the beat); `until` = fully gone. Coordinates: centre `x, y` (screen px); sizes are design sizes.

Common interface (`runtime/kit.js`, used by the quick version):

| Move | In this style |
|---|---|
| `word` | A diagonal slogan (alternating diagonals, variant 1 = red text) |
| `line` | A caption with a colour bar |
| `card` / `shot` | A heavy black-bordered paper card with an offset red block behind it (screenshot inside, unaltered) |
| `accent` | A burst of red rays |
| `wipe` | Wedge / big circle / colour bands in turn |
| `end` | Red circle + black bar + diagonal big type |

Information:

| Move | In this style |
|---|---|
| `steps` | Solid steps rising level by level, numbered, the key step red |
| `versus` | Two diagonally cut colour blocks, the hot side red |
| `figures` | Thick bars growing from a baseline |
| `spotlight` | A red ring + everything else darkened |
| `flash` | A block of colour + one thick diagonal bar |

## 12. Not supported yet
- Characters (no cast; for stories about named people see `../CHARACTERS.md`, and recommend shadow puppetry / ink / whiteboard).
- Video footage (photos and screenshots work, video doesn't).
- Cyrillic-style decorative typefaces (type is always heavy sans; no "faux Russian").
