# ASCII art (`ascii`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to the `promo/` folder of bb-video.

A frame: on a sheet of printer paper (or a black screen), product images, big text and shapes are all built from monospaced characters — character density is brightness (` .:-=+*#%@`). Garbage characters settle cell by cell into the product; as the camera pushes in, the characters get finer and the picture clearer, until it "resolves" top to bottom into the real image; captions type out letter by letter with a blinking cursor; box-drawing characters `┌─┐` draw windows.

Runtime: `runtime/ascii.js` (`PROMO.ascii(F)`). New project: `node scripts/new.mjs <dir> --style ascii` (add `--quick` for the quick version). Starter page: `styles/ascii/index.html`.

## 0. Safety
- Garbage characters flip at most 12 times a second, and only in a narrow band or small area (the decoding edge, a transition's leading edge); **no full-screen garbage flicker** — transitions sweep across, they don't flip the whole screen.
- Hard cuts with black/white inversion (light scene → dark scene): at most four or five per section; don't flip on every beat.

## 1. What products it suits
- Developer tools, command lines, data and AI products (characters are their native language).
- Hardware and product line-ups: a good product image turned into ASCII art and then resolved into the real image feels like a real "reveal".
- Brands about "precision", "engineering", "minimalism".
- Poor fit: products that need warmth or a handmade feel (use cut paper, origami); products whose screens are full of portraits (faces as ASCII art aren't flattering).

## 2. What it is, and what it isn't
- **What it is**: painting with text. The frame has one material only — monospaced characters; every change is the characters changing (swapping, getting denser, getting finer, flipping). The real image appears only at the moment of "resolving" — it's the reward.
- **It isn't**: hacker-movie green character rain, full-screen garbage flicker, a collage of terminal screenshots. Nor is it just slapping on a "typewriter font" — the shapes themselves must be built from characters.

## 3. Colour
- **Brand colour**: `film({ brand })` / `P.kit.brand('ascii', { brand, ground })` → the brand colour becomes the accent (garbage characters, the cursor, every other big word); the ground is chosen by `ground`.
Choose the ground by product (as with launch, `P.kit.ground('ascii', 'light' | 'dark' | 'brand', { brand, accent })`; in the quick version write `film({ ground, brand, accent })`):

| Ground | When | Colours |
|---|---|---|
| `light` (default) | the product itself is light (most websites, apps, hardware sites) | printer paper `#F4F3EE` + near-black text + the product's accent |
| `dark` | developer tools, terminals, products with dark interfaces; when you want an "old monitor" feel | near-black `#0C0D0C` + off-white text + phosphor green `#57E389` (or the product's accent) |
| `brand` | the brand colour itself is the signature | brand colour as the ground; text picks black / white automatically |

- Take colours from the product (site CSS, buttons, logo), and write in brief.md a line "颜色：…（来自：…）" (or in English "Colours: … (from: …)").
- **A reversed scene**: `A.bg(layer, { invert: true })` — a dark scene in a light film (like the black tiles on the product's site), and vice versa; the reversed colours are `PROMO.ascii(F, { night: { paper, ink } })`.
- ASCII-art colour (`tint`): `ink` (default, single colour, the most "ASCII art"), `accent`, `source` (each character takes the colour of its cell in the source frame: lovely for a red heart or green glow on black; on light grounds it's automatically darkened a little).
- Garbage characters that are flipping use the accent.

## 4. Type
- All caption text is monospaced (default IBM Plex Mono, OFL). Big text is drawn in a bold sans-serif (Inter 800) on the source frame and then built from characters — that way the letter shapes are easy to recognise.
- Readable text is real DOM text (automatic checks work as usual); big text (built from characters) keeps an invisible copy of the same text in the DOM for the fact check.
- Sizes: captions 36–46, titles 54–64, big text 200–380 (design size).
- Don't use the brand's commercial typeface (such as Apple's SF Pro); monospace is this style's voice.

## 5. Motion
- **Entrances**: `decode` garbage settles cell by cell (default) | `scan` scanned out top to bottom | `center` spreads from the middle | `fade` density fades in (swapping characters, not opacity).
- **Captions**: typed out letter by letter (`at` = done typing), a Return sound when done; on exit they backspace away.
- **Push in = get clearer**: `zoom: { at, dur, cell }` cells go from coarse to fine; the camera doesn't actually need to scale.
- **Resolve into the real image**: `resolve: { at, dur }` a line of garbage sweeps top to bottom, and above it the original image appears.
- **Alive**: `live: 0.3–0.6` lets a few characters swap gently (slowly, under 8 times a second) so the frame isn't dead.
- Timing feel: crisp and exact, like a terminal — settles without bounce or wobble; entrances 0.4–1 s, typing 0.02–0.045 s per character.

## 6. Camera and transitions
- Camera: mostly a slow push (scene container scaling 1 → 1.03); a line-up shot can pull back from 1.06 to 1. A real "push in" uses `zoom` (finer cells), not scaling.
- Transitions: `A.wipe` a block of inverted characters sweeps in from one side, covers, then retreats out the same side (the leading edge is a row of garbage); or a hard cut on the beat + black/white inversion (like the alternating tiles on a product site).

## 7. Sound
- Score: clean electronic music — short electric-piano chords, a soft synth pad, light electronic drums (`styles/ascii/score.js`).
- Sound effects: keyboard (typing, a run of keys), Return (done typing), digital grain (decoding, resolving into the real image), a gust of air (push in), a character sonar (`ping`), a sweep of digital noise (`wipe`). Sound logo: three key presses + a soft chord (`sound.js`).

## 8. Moves only this medium has (pick to suit the product)
- **The product decodes out of garbage**, then pushes in to get clearer and resolves into the real image — once or twice per film is enough, for the most important product.
- **Fast cuts with alternating black and white tiles**: one product per cut, alternating light and dark grounds.
- **A line-up character grid**: several products in one character grid, then each resolves into its real image.
- **Cursor**: at the opening a cursor types out the URL; at the end a cursor blinks after the URL.
- **A window in box-drawing characters**: `A.box` draws a "terminal window" with the product inside.
- **Character sonar ring** (`A.ping`): to emphasise a point.

## 9. Common pitfalls and self-check
- The ASCII art doesn't read as anything: the source image is too small or too grey, or the cells are too coarse — push in with `zoom` to 8–10px cells; keep the source's background clean (when capturing a product image, capture only the product).
- A product shot on a dark ground placed on a light ground: the engine treats the image's own background (its four corners) as "empty", so the product becomes the characters; use `tint: 'ink'` for colour, not `source` (light metal turns washed-out).
- Big text in horizontal stripes: at small sizes (< 150) the letters are only a few rows of characters — go bigger, or type it out with `A.type`.
- Too much garbage: decoding takes ≤ 1 s and flipping stays at the edges; the whole screen flipping is tiring (and breaks section 0).
- After resolving into the real image, a background colour that differs from the paper shows a rectangle: match screenshots to the paper colour as closely as possible, or put them inside an `A.box` frame.
- Self-check with `references/review.md`.

## 10. Room for variation
- Ground: light / dark / brand colour; one for the whole film, or alternating light and dark like the product's site.
- Density ramp: `ramp` (default ` .:-=+*#%@`); a more "old computer" ` .:░▒▓█`, a more "code" ` .,:;i1tfLCG08@`.
- Colour: single colour (ink) ↔ original colours (source) ↔ accent.
- Cells: coarse (12–16px, very "ASCII") ↔ fine (8px, close to a photo).

## 11. API quick reference
```js
const A = PROMO.ascii(F, { cell: F.px(16), ramp, night: { paper: '#000', ink: '#F5F5F7' } });
A.bg(层, { variant: 0 | 1 | 2, invert })      // dot grid / line numbers / corner viewfinder
A.plate(父, { src | text | draw, x, y, w, h, at, until, dur, enter, exit, tint, cell, zoom: { at, dur, cell }, resolve: { at, dur }, live, fit, levels, ref, sfx })
A.big(父, { at, until, text, size, x, y, color })
A.type(父, { at, until, text, size, x, y, align, color, prompt: '> ', cursor: 'blink' | 'hide' | false, per, weight, kind })
A.box(父, { x, y, w, h, at, until, title, color, fill }) → { el, inner }
A.ping(父, { at, x, y, r })
A.wipe({ at, dur, from: 'left' | 'right' | 'top' | 'bottom' }) → 盖满的时刻
A.endcard(父, { at, title, tagline, url })
A.keys(t0, dur, n)                          // a run of key clicks
```
(`层` = layer, `父` = parent layer, `盖满的时刻` = the moment of full cover.)
Timing: `at` = settled and readable (on the beat); `until` = fully gone. Coordinates: centre point `x, y`.

Shared interface (`runtime/kit.js`, used by the quick version): `word` = `A.big`, `line` = `A.type`, `card` = `A.box`, `shot` = ASCII art resolving into the original image, `accent` = `A.ping`, `wipe` = `A.wipe`, `end` = `A.endcard`; carrying information: `steps` = commands typed out line by line, `versus` = `+` / `-` in two boxes, `figures` = `█` character bars, `spotlight` = a box-drawing magnifier, `flash` = character texture over a solid block of colour.

In explainer videos (following a voiceover, with subtitles): `node explainer/scripts/new.mjs <dir> --style ascii`; the picture uses `PROMO.film({ format: 'explain' })` (`promo/references/kit.md`, "Following the voiceover").

## 12. Not supported yet
- Stories about named people: this style has no characters; follow the last section of `../CHARACTERS.md` (name cards with fixed colours and positions, versus for confrontations), or recommend shadow puppetry / ink / whiteboard.
- Turning video footage into ASCII art (only still images and your own drawings).
- Chinese big text (character-built big text is currently tuned for Latin letterforms; type Chinese out with `A.type`).
- Character acting inside the ASCII art (no characters).
