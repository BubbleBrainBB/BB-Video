# Pixel (像素, `pixel`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to the `promo/` folder of bb-video.

One frame: a low-resolution game screen blown up to full screen, every "pixel" a crisp little square (4 px per cell at 1080p, 480 × 270 cells in landscape). The sky is bands of colour blended with checkerboard dithering; distant hills and cities scroll back layer by layer in parallax; outlined little figures stand on the grass, walking, jumping, talking, fighting. Information is told through game UI: dialog boxes type out character by character, a menu's ▶ cursor moves from item to item, health bars fill cell by cell, scores count up, a marker hops level by level across a level map. Transitions are block dissolves, a closing circle (iris), staircase fills. Everything moves by whole cells: no scaling, no rotation, no blur.

Runtime: `runtime/pixel.js` (`PROMO.pixel(F)`). New project: explainer `node explainer/scripts/new.mjs <dir> --style pixel`, promo `node scripts/new.mjs <dir> --style pixel` (add `--quick` for the quick version). Sample: `videos/pixel-famicom` (why the Famicom's picture has only these few colours, narrated, hand-written).

## 0. Safety
- The white flash when hit, the blinking of a selection box's four corners and the blinking ▼ are all small areas, at most 3 times a second. Never flash the whole screen's colour back and forth.
- Block-dissolve transitions at most once every 4–5 seconds; full-screen shake (`punch`) only on downbeats, four frames.

## 1. What content it suits
- **Games, developer tools, productivity tools, AI products**: metaphors like "level up", "clear the stage", "unlock" are game language already.
- **Step-by-step processes, choices**: level maps, menus and progress bars tell these most naturally.
- **Little stories with characters and conflict**: a founder's story, "what problem the user ran into", two approaches fighting it out (VS).
- Nostalgia, the history of technology (computers, consoles, the early internet), science for kids.
- Less suited: luxury goods, content that needs texture and the emotion of real photos; heavy subjects (death, disaster: the game tone is too light).

## 2. What it is (and isn't)
- **What it is**: constraint. Very few colours, very low resolution, whole-cell motion — every block has to say one thing clearly. Information is told through game UI (dialog boxes, menus, health bars, scores, levels).
- **What it isn't**: a mosaic filter slapped over anything; nor a copy of any particular game (no characters, items, level designs or musical motifs from any game company, e.g. Mario's question block, pipes, mushrooms, or the shapes and tunes of Pac-Man or Tetris). The items and characters are all drawn by this runtime itself.

## 3. Colour
- Palette (`palette`):
  - `night` (default): deep blue night sky, off-white text, bright coral red / yellow / cyan / green;
  - `day`: light blue sky, green grass;
  - `gameboy`: the handheld's four greens; every colour falls into one of the four by brightness.
- Accent colour `a` (default coral red `#FF4D6D`): flags, the hot level, the hot side of VS, the name tag of a dialog box. When the product has a brand colour it replaces `a` (`PROMO.pixel(F, { colors: { a: '#…' } })`, quick version `film({ brand })`); write the colour's source into brief.md.
- Items and characters are drawn with letters standing for colours: `k` outline, `w` white, `r` red, `y` yellow, `g` green, `c` cyan, `b` blue, `p` purple, `o` orange, `n` brown, `s` skin, `e` / `E` grey, `a` accent (uppercase is one shade darker, `W` is highlight).

## 4. Type
- Font: Fusion Pixel 12px (缝合像素字体, OFL, with Chinese, Latin and symbols like ▶ ♥). Proportional for text, monospaced for numbers. Loaded from jsdelivr in the starter page's `<head>`.
- **Font sizes are multiples of 12**: captions 36 / 48, titles 96 / 120, big numbers 168. That way every stroke lands on whole pixels; sizes that aren't multiples of 12 snap automatically. Captions no smaller than 36 on phones.
- All text has a pixel outline + a hard drop shadow to the lower right, so it reads on any background.
- Curly quotes (’ “ ”) are full-width in this font; the runtime swaps them for straight quotes automatically.

## 5. Motion
- **Move by whole cells**: positions snap to the grid (4 px at 1080p). Character animation runs at 8 frames a second (walking alternates two frames, breathing at 2 frames a second); no smooth scaling or rotation.
- **Appearing**:
  - items `pop` (growing step by step) or `drop` (falling as if by gravity);
  - large characters drop one by one, pressing down a cell as they land;
  - small text and dialog text type out character by character, with a "beep-beep";
  - windows and dialog boxes open up and down from a horizontal line.
- **Leaving**: sink a cell or two, then gone. Things in games don't fade out or fly away.
- Sense of time: appearing takes 0.2–0.4 s, landing on the beat; no more than 3 things moving at once in a frame.

## 6. Camera and transitions
- The camera doesn't push, pull or rotate: scaling would make the cells uneven. The frame stays alive through the parallax background (stars twinkling, clouds drifting, distant hills scrolling back slowly, cell by cell). On a downbeat the whole screen can shake for four frames (the quick version's `punch` does this automatically).
- Transitions `X.wipe({ at, kind })`, four kinds used in rotation:
  - `blocks`: random block dissolve (default);
  - `iris`: a circle closing from all sides to one point (`from: [x, y]`, e.g. closing onto a character), then opening from that point;
  - `stairs`: fills from left to right like a staircase;
  - `bars`: rows pushed across, alternating left and right.

  The scene changes at the moment of full coverage (`at`), on the beat; default 0.6 s, ten steps, covering cell by cell.

## 7. Sound
- Score: 8-bit chiptune (`styles/pixel/score.js`, C major, 132 BPM), with the same channels as a game console:
  - square wave (`square`, duty 0.5 / 0.25 / 0.125) sings the melody;
  - thin square wave (`pulse`) for fast arpeggios;
  - triangle wave (`triangle`) for the bass;
  - the noise channel for drums (`chipkick` / `chipsnare` / `chiphat`).

  Almost no reverb. With narration, the arpeggios, drums and melody drop out automatically while the voice speaks.
- Sound effects (`sound.js`):
  - `type`: typing;
  - `blip`: menu move;
  - `select`: window opens / confirm;
  - `pop`: an item appears;
  - `coin`: received, a number settles;
  - `jump`: jump;
  - `step`: walking, very light;
  - `hit` / `slash`: getting hit / attacking;
  - `power`: large characters landing, cheering;
  - `fill`: a health bar filling, a mosaic sharpening;
  - `burst`: blocks bursting;
  - `sweep`: transition.

  Sonic logo: a rising arpeggio.

## 8. Characters
The pixel style has characters; for stories follow the rules in `../CHARACTERS.md`:
- **Settle the cast list at the start**: `X.cast({ name: { hair, hairColor, shirt, pants, hat, hatColor, glasses, beard, skin } })`, then call them up with `X.char(layer, { who: 'name', … })`. Everyone looks the same in every scene; two people differ in at least two things (hair style / hair colour / clothes colour / hat / glasses / beard), checked by `--check`.
- Appearance options:
  - `hair`: short, long, spiky, bun, ponytail, curly, bald;
  - `hat`: none, cap, crown, wizard, helmet, band (`hatColor`).
  - Colours can be palette letters (`'a'`, `'b'`) or `#…`.
- **Face to face**: `faceTo: other` (or `h.faceTo(at, other)`). A fight is one attack (`h.attack(at, other)`; the other is hit and knocked back automatically), not two people each acting on their own.
- **Name tag**: `tag: true` on the first appearance hangs the name over the head for a little over two seconds.
- Moves:
  - `walk(at, x)`: arrive at x at `at`;
  - `jump(at)`: land at `at`;
  - `say(at, words)`: a speech bubble over the head, text typing out;
  - `emote(at, '!' | '?' | '♥' | '…' | '♪')`;
  - `cheer(at)`: arms raised, cheering;
  - `hurt(at)`: getting hit;
  - `ko(at)`: falls down.

## 9. Moves unique to this medium (pick to suit the content)
- **Level map**: for processes (the quick version's `flow` uses it automatically). Each level is a numbered block, the path is laid cell by cell, a ▼ marker hops level by level, the key level is in the accent colour.
- **VS screen**: two options, two approaches side by side (`compare`), a VS bursting in the middle.
- **Columns of stacked blocks**: for numbers (`chart`). Blocks drop from above one by one and stack up, the number on top of the column.
- **Dialog box / menu / health bar / score**:
  - quoting a line, what someone said: `X.dialog`;
  - a few options, one selected: `X.menu`;
  - a progress, a ratio: `X.bar`;
  - one big number: `X.number`.
- **Collecting items**: each time a point is made clear, the character collects a coin / a star (`X.pickup`) and a "+1" floats up. Good for "three benefits", "what we learned".
- **Screenshot mosaicked first, then sharpened** (`X.shot`): the product UI "loads" step by step, ending as the original image.
- **Selection-box corners + cursor**: point out one spot in the UI (`annotate`).

## 10. Pitfalls and self-check
- Too empty: each scene has at least one "lead" (a character, a big item, a window); don't leave only text floating in the sky.
- Too small: characters default to 3× (about 280 px tall at 1080p), items to 3×. Anything smaller can't be read on phones.
- Mixed grids: things you draw yourself must snap to the grid too (coordinates in multiples of 4); don't "prettify" pixel art with CSS scaling, rotation, blur or shadows.
- Text too long: one or two lines per dialog box (a sentence ≤ 30 characters); split longer ones into two dialog boxes, one after the other.
- Using a game's signature things (question blocks, pipes, specific characters): replace them with your own items.
- Self-check following `references/review.md`.

## 11. Room for variation
- Backgrounds:
  - `night`: hills / city at night / just stars;
  - `day`: hills and clouds by day;
  - `room`: a room;
  - `space`: outer space;
  - `cave`: a cave, brick walls;
  - `plain`: a clean dot-grid ground, for information-heavy scenes.
- Palette: `night` ↔ `day` ↔ `gameboy` (four greens, the most "retro").
- Pacing: the snappiness of a console (default) ↔ the slowness of an RPG (dialog boxes type a bit slower, longer pauses).

## 12. API quick reference
```js
const X = PROMO.pixel(F, { palette: 'night' | 'day' | 'gameboy', colors: { a: '#…' }, unit: 4 });
const L = X.scene(a, z, { kind: 'night' | 'day' | 'room' | 'space' | 'cave' | 'plain', variant, drift });   // one scene: layer + background; L.floor = the ground's y
X.bg(层, { kind, variant, drift });                                  // background only → { el, floor }; drift = cells per second the far layer moves
X.item(父, { art, x, y, scale, at, until, enter: 'pop' | 'drop' | 'none', bob, spin, z });   // item → it; it.move(at, x, y, dur)
//   art: coin heart star gem key chest flag sword shield potion bolt trophy crown rocket monitor phone book bulb gear clock mail lock
//        bug slime ghost robot cat server chart tree house cloud fire — or your own character rows ['.yy.', 'yWyY', …] (fill colours only; the outline is added automatically)
X.cast({ 名字: { hair, hairColor, skin, shirt, pants, hat, hatColor, glasses, beard } });
const h = X.char(父, { who, x, y, at, until, face, faceTo, enter: 'walk' | 'drop' | 'none', from, scale, tag });   // y = feet (ground by default)
h.walk(at, x) | h.jump(at) | h.say(at, 话, { until }) | h.emote(at, '!') | h.attack(at, 对手) | h.hurt(at) | h.cheer(at, dur) | h.ko(at) | h.faceTo(at, 对手)
X.title(父, { text, x, y, size, color, at, until, noFact });       // large characters: dropping one by one
X.text(父, { text, x, y, size, color, align, maxW, wrap, type, at, until, noFact });   // small text; type: true = typed out
X.dialog(父, { text, who, x, y, w, at, until });                   // dialog box (name tag = the speaker)
X.menu(父, { items, x, y, w, at, until, picks: [{ at, index }] });  // menu: ▶ cursor
X.bar(父, { label, value, max, x, y, w, color, unit, at, until });  // health bar / progress bar
X.number(父, { value, x, y, size, color, prefix, unit, pad, count, at, until });   // score (pad: 6 = 000123)
X.panel(父, { x, y, w, h, fill, border, at, until }) → { el, w, h } // a block with a pixel border
X.window(父, { x, y, w, h, title, at, until }) → { el, inner, box } // pixel window
X.shot(父, { src, x, y, w, h, title, fit, mosaic, at, until });    // screenshot: mosaicked first, then sharpened, ending as the original
X.burst(父, { x, y, at, colors, n });  X.pickup(at, 道具, { text: '+1' });
X.wipe({ at, kind: 'blocks' | 'iris' | 'stairs' | 'bars', from: [x, y], color, dur });   // → the moment of full coverage
X.stage(父, { text, sub, at, until });                              // level card ("第 2 关", "Level 2")
X.endcard(父, { at, title, sub, url, char });                       // end card (char = a character's name: jumps out and cheers)
```
In the code above, `层` = a layer, `父` = the parent element, `名字` = a cast name, `话` = the words said, `对手` = the opponent, `道具` = an item.

Time: `at` = settled and readable (on the beat); `until` = fully gone. Coordinates: centre point `x, y` (frame px; for characters the middle of the feet); `size` is the design size (1080p).

Generic API (`runtime/kit.js`, used by the quick version and by "following the narration" explainers):

| API | In this style it is |
|---|---|
| `word` | large characters dropping one by one (variant 1 = accent colour) |
| `line` | a line typed out by a typewriter |
| `card` / `shot` | a panel with a pixel border / a pixel window (screenshot mosaicked first, then sharpened) |
| `accent` | blocks bursting + a star popping out |
| `wipe` | block dissolve / iris / stairs / bars in rotation |
| `end` | large characters + one line + ▶ URL |

Telling information:

| API | In this style it is |
|---|---|
| `steps` | level map (numbered blocks, a cell-by-cell path, a ▼ marker hopping along) |
| `versus` | VS screen (two panels, VS bursting in the middle, the hot side in the accent colour) |
| `figures` | columns of blocks dropping and stacking |
| `spotlight` | selection-box corners + cursor + everything else dimmed |
| `flash` | a solid block of colour + a checkerboard strip along the bottom |

In this style the quick version's camera doesn't zoom (`S.zoom = false`); `punch` becomes a full-screen shake on the downbeat.

## 13. Not supported yet
- Video footage (screenshots yes, video no).
- Oblique / isometric scenes, top-down maps (side-scrolling only: a side-on ground and characters).
- Characters riding, complex multi-person fights on screen (one move at a time: attack → hit → down).
