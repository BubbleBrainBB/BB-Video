# Manga / motion comic (日漫 · 漫画分镜, `manga`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

One frame: a black-and-white manga page.
- **The page.** White paper and black ink line. Screentone is laid per region: flat dots, gradient dots and sand.
- **Panels.** Panels are cut by gutters. The gaps between tiers are wider than the gaps between columns. Panels can be slanted, borderless or bleed off the page, and a figure can break out of its frame.
- **Effects.** Speed lines and focus lines (集中线), a beta flash, sweat drops and vein marks.
- **Lettering.** Hand-lettered sound effects (ドン / ゴゴゴ / 轰 / 咚) are part of the art, not captions laid on top. Speech balloons are round, jagged for a shout, cloud-shaped for a thought, or a narration box. Text in them is vertical or horizontal.
- **Colour.** Optionally one spot colour.
- **Camera.** The camera reads the page panel by panel in reading order: right to left, top to bottom. It punches into the key panel and shakes on impacts.
- **Inking.** Panels ink in (the frame draws, the art wipes on in the reading direction) and tones fade in after.
- **Page changes.** Pages turn, or are slashed or torn open. The climax is a full-page splash.

Runtime: `runtime/manga.js` (`PROMO.manga(F, opt)`). New project:
- explainer (narrated; the usual case): `node explainer/scripts/new.mjs <dir> --style manga`;
- promo (on the beat): `node scripts/new.mjs <dir> --style manga`.

Starter pages:
- `styles/manga/explain.html`: narrated, timed from the narration;
- `styles/manga/index.html`: one of each piece, on the beat.

## 0. Safety
- **Original characters only.** They must not resemble any existing manga or anime character: no signature hairstyles, outfits, scars or emblems borrowed from a known series.
- **Personified science is not *Cells at Work* (はたらく細胞).**
  - Don't draw cells or molecules as uniformed workers with caps that carry their names.
  - Give them their own idea instead: a fighter whose emblem is the molecule's shape, a mood, a build.
- **No real people** drawn as manga characters.
- **Every word on the page is in brief.md:** balloons, narration boxes, labels, intro boxes, chart labels.
  - Sound-effect lettering is art and is not fact-checked.
  - Science told as a battle still states only sourced facts. The metaphor (seats, a shield, a queue) is marked "示意" in brief.md.

## 1. When to use
- **Science and concept explainers told as a fight or a contest.** A molecule vs a receptor, a virus vs the immune response, two algorithms racing, a bug vs the fix.
- **Stories with a turn.** The reveal, the twist, "but the truth is…".
- **Character-driven promos for young audiences.** Games, apps, products with a rival.
- **Less suited:**
  - data-heavy finance (dossier);
  - serious, heavy topics such as illness and grief (manga's comedy beats undercut them);
  - long processes with many parts (isometric);
  - Chinese history (shadow or ink).

## 2. What it is (and isn't)
- **What it is: a printed page that moves.** The frame is a real page: gutters, borders, tones, lettering. The motion is camera, inking, punch-ins, boiling effect lines and the characters' poses. It is not full cel animation.
- **Black, white and grey only from dots and lines.** Tones are dot screens and hatching, never smooth digital grey. Gradients are dots growing in size. One spot colour at most, used for one meaning: the hero's scarf, a warning light.
- **Not `pop`:**
  - pop is 1960s American comics in flat primaries with big colour Ben-Day dots and burst boxes (POW!), read left to right;
  - manga is monochrome screentone, Japanese panel rhythm and right-to-left reading, with drawn sound words and speed lines doing the work.
- **Not `ink` or `shadow`:** those are brush painting and lamp-lit puppets. Manga is clean pen line and mechanical tone.
- **Don't overdo it:**
  - one punch-in per beat at most;
  - a shake only on a real impact;
  - one splash per film, at the climax.

## 3. Color
- Paper `#ffffff`; ink `#141414`. Tone is the ink at a dot coverage of 0.15–0.45. The dark around the page is `#16161a`.
- Spot colour (`spot`, default `#e0442a`, `false` = none) is for one thing only. Name it in brief.md.
- Black areas (ベタ) carry the drama: a black panel ground, black hair, the night. Every page needs a few black masses to hold the eye.

## 4. Type
- **Sound effects:**
  - Dela Gothic One for kana (ドン, ゴゴゴ);
  - ZCOOL QingKe HuangYou for Chinese (轰, 咚, 清醒！);
  - each glyph separately rotated and scaled, white with a black outline and a white halo, or black (`fill: 'black'`).
- **Balloons:** Noto Sans SC 700 (shouts 900).
- **Narration boxes:** Noto Serif SC 600. All OFL, loaded from the CDN.
- **Captions:** anime-subtitle style (white, bold, black outline) at the bottom of the frame. The camera frames panels above them.
- **Vertical text** (`vertical: true`) suits short shouts and quiet lines. Use horizontal for anything longer than 6 characters.

## 5. Motion
- **Panels** ink in on their line (`at`):
  - the border draws (0.25 s);
  - the art wipes on in the reading direction (0.22 s);
  - tones fade in 0.15 s later;
  - `enter: 'pop' | 'fade' | 'cut'` for other entrances.
- **Effect lines stay alive by moving smoothly:** speed lines stream along their direction in a seamless loop (`speed`, `flow`), focus lines and flash rays turn and breathe slowly (`spin`), odoro lines sway. Never swap line drawings frame to frame (a hand-drawn "boil"): on video it reads as constant jumping, and the frame check flags it.
- **Characters** hold a pose and switch with a short blend (`C.pose(t, 'punch', 0.12)`). Faces snap between expressions (`C.face`), and hits knock them back (`C.hit`).
- **Lettering** slams in glyph by glyph: impact scales down from 2×, a rumble trembles, a pop bounces.
- **Timing:** one beat per panel. A line of narration reads 1–3 panels. Impacts land on the stressed word (`T.word`).

## 6. Camera and transitions
- **Reading.** `pg.read(panels, times)` moves panel to panel in 0.5 s (cubic in-out) and holds with a slow drift. The first view of a page is the whole page (`'page'`), so the layout reads before the camera goes in.
- **Punch.** `pg.punch(t, panel)` slams closer in about 0.15 s (expo-out) on a hit. It holds, or eases back with `back: true`.
- **Shake.** `R.shake(t, { amp, dur })` on impacts. It is a screen-space texture, registered as a transition.
- **Flash.** `R.flash(t, { kind })`: white, black, `invert` (a negative frame, the classic anime impact) or `spot`. It lasts 2–4 frames and is registered, so the frame check accepts it.
- **Between pages:**
  - `turn`: the old page folds away about its spine (`dir` sets the side);
  - `slash`: a diagonal cut opens onto the new page;
  - `tear`: the same with a ragged edge;
  - `ink`: a circle of the new page grows;
  - `fade`;
  - `cut`.
- **Splash.** `R.splash(a, b)` is one bleed panel filling the frame. It slams in from close, with a flash and a shake. Use it once.

## 7. Sound
- **Music (`styles/manga/score.js`):** an anime battle OST in E minor. Driving spiccato strings, a rock kit, a saw-lead hook, brass stabs, and a lone piano for the turn. The sections are cold / rise / battle / turn / crash / end, and it ducks under the voice.
- **Sound design (`sound.js`):** every drawn sound word is a real hit (`hit`, `rumble`, `pop`). The other effects are:
  - punches: a whoosh into a smack;
  - slashes: a blade swipe with a glint;
  - page turns: paper;
  - camera pans: soft air;
  - panel ink-in: a pen scratch;
  - shout balloons: a stab;
  - manga marks: small pitched blips.
- **Voice:** a lively young narrator (`zh-CN-YunxiNeural`, +8 %), the explain.json default.

## 8. Signature moves
- **The eye close-up:** a strip panel of the eyes alone (`shot: 'eyes'`) with focus lines, right before an action.
- **The intro box** (`P.intro`): a character enters, and the name slams in big with fact lines under it, as in battle manga.
- **The punch at the viewer** (`P.fist`): a fist with knuckles toward us on focus lines, with ドン and a shake.
- **The VS split:** one slanted gutter across the page, two faces opposite each other.
- **The splash page** at the climax.
- **The rumble:** ゴゴゴ trembling beside a silhouette on odoro lines when something ominous arrives.
- **The chibi beat** (`shot: 'chibi'`) with a sweat drop after a big reveal, for a laugh.

## 9. Pages and panels
- **`R.page(a, b, { w, h, in, dur, margin, gutter: [col, row], view })`.** Defaults:
  - landscape: a two-page spread, 1500 × 1000 units;
  - portrait: one page, 700 × 1000;
  - `margin` 36, gutters 14 between columns and 30 between tiers.
- **`pg.tiers(rows, { at, gutter, margin, panel })`** cuts the page into tiers.
  - Each row is `[column weights]` or `{ h, cols, slant, cuts, opts }`:
    - `slant` drops the gutter below the row across the page (a fraction of the page height, e.g. 0.06);
    - `cuts` slant the column gutters.
  - It returns the panels in reading order (right to left unless `dir: 'ltr'`).
  - The same tiers lay out a wide spread and a tall page: write them once for both formats.
- **`pg.panel([x, y, w, h] | { poly }, o)`** places a free panel (page fractions). Options:
  - `border: 'solid' | 'none' | 'wavy'` (wavy = flashback);
  - `bw` (border width);
  - `bleed: true | ['r', 't', …]` (off the page edge);
  - `at`, `until`, `enter`;
  - `bg`.
- **Inside a panel,** positions are panel fractions (0–1) and sizes are fractions of the panel's height. Effects and art are clipped by the frame.
  - `breakout: true` draws a character or a drawing over the frame.
  - Balloons, labels and lettering always sit over the frames.

## 10. Characters
- **`R.cast({ Name: spec })`** defines each character once and checks the cast (two attributes apart, `styles/CHARACTERS.md`). spec:
  - `proportions: 'hero' | 'stocky'` (the chibi shot switches by itself);
  - `build: 'slim' | 'normal' | 'heavy'`;
  - `hair: 'spiky' | 'short' | 'fluffy' | 'long' | 'bald' | (g, kit) => {}`, with `spikes`, `tall: [indices]` for the tallest spikes, `sweep`, and `bangs`;
  - `hairTone: 'black' | 'tone' | 'white'`;
  - `eyes: 'sharp' | 'round' | 'sleepy' | 'narrow'`;
  - `brows: 'thick' | 'thin'`;
  - `jaw`, `turn`;
  - `outfit: { top, bottom, coat, collar, belt, shoes }`, each `'white' | 'black' | 'tone'`;
  - `scarf: 'spot' | 'white' | 'black'`;
  - `mark: (g, kit) => {}` (an emblem) with `markOn: 'chest' | 'head'`;
  - `headgear`, `hairBack`, `extra`.
- **`P.char(name, { shot, x, y, size, pose, face, facing | faceTo, turn, at, until, enter: 'slide', breakout })`.** For `full` / `chibi` / `silhouette`, x / y is the feet; for `bust` / `face`, the face centre.
  - Shots:
    - `full` (pose), `bust`, `face`;
    - `eyes` (the close-up strip, `zoom`);
    - `chibi`;
    - `silhouette` (solid black with a white rim).
  - Poses: stand, walk, ready, run, dash, punch, block, point, victory, cheer, crossarms, sit, slump, sleep, fall, shock, shove, drag, lift (`R.poses`, add your own).
  - Faces: calm, smile, grin, smug, determined, angry, shout, grit, shock, scared, pain, tired, sleep, closed, sad (`R.expressions`).
  - The handle: `C.pose(t, name, dur)`, `C.face(t, expr)`, `C.move(t, { x, y }, dur)`, `C.hit(t)`, `C.shake(t, dur)`. A balloon's `tail: C` points at the head.
- **Face to face:** `faceTo: otherCharacter` (CHARACTERS.md rule 3). Two talking characters stand in one panel, or in two panels side by side, facing each other.

## 11. Explanation devices (style-native information)
- **`P.intro(text, { name, lines, x, y, align })`:** the battle-manga intro box. It puts a number on the character as it enters.
- **`P.label(text, { x, y, to: [x, y] })`:** a hand-lettered note boxed in ink, with a leader pointing at the thing it names.
- **`P.chart({ kind: 'line' | 'bars', values, labels, unit, marks: [{ i, text }], dur })`:** a graph inked on the page. The axes are ruled by hand, the line draws on with tone under the curve, and notes land at points.
- **`P.balloon('narr', …)`:** a narration box for the time and the place ("早上 8:00").
- **Manga marks (`P.manpu`):**
  - sweat (embarrassed, nervous);
  - vein (angry);
  - sparkle;
  - steam (fuming);
  - zzz;
  - exclaim / question;
  - gloom (vertical lines of despair);
  - tears;
  - dots (…);
  - shock.
- **Your own drawings:** `P.draw((g, k) => …, { at, info })`, with the kit `k.shape` (white, inked, toned on the shadow side), `k.line` (a tapered ink line), `k.dots`, `k.hatch`, `k.sparkle` and the line bundles. Use them for props (a mug, a wall, seats, a meter) in the same line weight as the figures.

## 12. Pitfalls and self-check
- **Gaps.** Every line needs a new panel, a punch, a balloon or a sound word. `--check` lists "没有新动作" (no new action); fix each one.
- **Reading.** Small balloon text is unreadable when the camera shows the whole page. Read into the panel before its balloon appears.
- **Captions.** The bottom 15 % of the frame belongs to the captions. Framing keeps panels above them; keep balloons there too.
- **Too much at once.** A page holds 3–5 panels. More than one sound word per panel turns into noise.
- **Characters' look.** Look at every new character, shot and pose in `--stills`. Check:
  - eyes inside the face;
  - the brows readable over the hair;
  - hands not swallowing the face (raised arms go outward, not across the head).
- **Flashes and shakes** are registered, so the frame check accepts them. A flagged jump that isn't one of them is a bug.
- **Self-check** per `references/review.md`: `--check`, `--stills`, then the render and its frame check, in both formats.

## 13. Portrait (9:16)
- Pages are single pages (700 × 1000). The same `tiers` give tall panels, so the same code serves both formats.
- In-panel positions are fractions, so art follows the panel. Check that wide-panel compositions (two characters side by side) still fit a narrower panel. If not, branch with `F.portrait` (e.g. stack them in two tiers).

## 14. Variation
- **Rhythm:** many small panels (a fast exchange) ↔ one big panel (a beat of awe).
- **Ground:** white panels ↔ black panels (night, menace) ↔ tone (mood).
- **Spot colour:** a warm red (danger, heat) ↔ a cold blue (calm, science) ↔ none (pure black and white).
- **Reading direction:** right to left (manga) ↔ left to right (`dir: 'ltr'`, webcomic feel).
- **Tone of voice:** shōnen battle (speed lines, shouts) ↔ quiet slice-of-life (tones, thought balloons, no shakes).

## 15. API quick reference
```js
const R = PROMO.manga(F, { spot: '#e0442a' | false, dir: 'rtl' | 'ltr', captions: { size, top, max } | false, chapters: [...] | false, colors, fonts });
R.cast({ Name: { build, proportions, hair, hairTone, eyes, brows, outfit, scarf, mark } });
const pg = R.page(a, b, { w, h, in: 'cut' | 'fade' | 'turn' | 'slash' | 'tear' | 'ink', dur, margin, gutter });
const [p1, p2, p3] = pg.tiers([[1], { cols: [2, 1], slant: 0.05, cuts: [0.04] }], { at: [t1, t2, t3] });
const P = pg.panel([x, y, w, h], { border, bleed, at, enter, bg });
pg.cam(t, 'page' | { on: P | [P, …], pad } | { x, y, h });  pg.read([p1, p2], [t1, t2], { travel, pad });  pg.punch(t, P, { pad, hold, back });
R.shake(t, { amp, dur });  R.flash(t, { kind: 'white' | 'black' | 'invert' | 'spot' });
P.bg('white' | 'black' | 'tone' | 'grad' | 'speed' | 'focus' | 'flash' | 'burst' | 'odoro' | 'sparkle', { at, until, angle, cx, cy, inner, density, white });
P.tone({ rect | ellipse | poly | d }, { kind: 'dot' | 'grad' | 'sand' | 'hatch', density, from, to, angle });  P.lines('speed' | 'focus' | 'odoro', { box });
const C = P.char('Name', { shot, x, y, size, pose, face, facing, faceTo, at, until, breakout });  C.pose(t, 'punch', 0.15); C.face(t, 'shock'); C.move(t, { x }, 0.4); C.hit(t);
P.fist({ x, y, size, at, mark });  P.manpu('sweat', { x, y, size, at });
P.sfx('ドン', { x, y, size, rot, fill: 'white' | 'black' | 'spot', style: 'impact' | 'rumble' | 'pop', vertical, at, until });
P.balloon('talk' | 'shout' | 'think' | 'narr' | 'whisper' | 'black', 'text|second line', { x, y, vertical, size, tail: [x, y] | C, at, until });
P.label(text, { x, y, to, at });  P.intro(text, { name, lines, x, y, at });  P.chart({ values, labels, unit, marks, at, dur });  P.draw((g, k) => {}, { at, info });  P.dim(t, { to });
pg.title(text, { x, y, size, vertical, kicker, at });  R.splash(a, b, { bg, flash, draw });  R.end(a, b, { title, sub, sources, notes });
```

## 16. Not supported yet
- No quick version (`--quick` / `kit.js` adapter): hand-written only.
- **Characters** are a rig of tapered shapes, not hand-drawn art:
  - faces turn only between front and three-quarter (no true profile or back view);
  - hands are mittens and fists (no fingers spread);
  - clothes are simple (coat, shirt, trousers).
- **No backgrounds library** (cities, rooms): draw props with `P.draw` and let tones and effect lines carry the setting, as manga often does.
- **Page turns** are a fold about the spine, not a curling page.
