# Style: hand-drawn storybook mascot (手绘绘本吉祥物, `storybook`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

A frame is a page of a picture book about an invisible process. A small cast of cute characters acts the process out with tangible props on little stage platforms along one ground line.

The look:
- **Paper**: warm light-grey paper with fibres and specks.
- **Ink**: dark outlines that wobble a little, like a pen line.
- **Fills**: flat, shaded with coloured-pencil hatching. A soft rim runs along the right and bottom edges, denser cross-hatching sits in the shade, and a light streak runs top-left.
- **Colour**: one strong accent colour for the cast and a second colour for the other side. Props are cream, beige and wood.
- **Props**: tangible things. Filing cabinets with tab labels, an easel with a sheet, a monitor with log lines, a big push button, stacking blocks, signpost cards, paper planes, scattered papers, cards that flip to ✓, an alarm bell, a thermometer, a poster, a little house.
- **Tags**: small dark monospace tags float above characters and say what each one is doing. A ✓ result line types in under the tag.
- **Motion**: characters squash and stretch, blink, hop as they walk, and close their eyes into ^ ^ when happy.

The telling:
- **Split**: one character splits into clones, each carrying a task card.
- **Act it out**: each clone acts its task out on its own little stage.
- **Merge**: the clones regroup and merge back into one.
- **Results as props**: the results pop out as things, such as a row of check cards, a fixed line on the sheet, or a ✓ on the screen.
- **Camera**: it travels along the ground line from stage to stage, then holds and pushes in.

Runtime: `runtime/storybook.js` (`PROMO.storybook(F, opt)`). New project:
- explainer (how a process works, science for families): `node explainer/scripts/new.mjs <dir> --style storybook`;
- promo: `node scripts/new.mjs <dir> --style storybook [--quick]`.

Starter pages:
- `styles/storybook/explain.html`: narrated, timed from the narration;
- `styles/storybook/index.html`: promo, on the beat.

## 0. Safety
- **The cast is always original.** Never draw another brand's mascot, or anything with its silhouette, proportions, colour or face. The well-known orange block creature with stick legs is one such mascot. The same goes for its product's UI labels, such as `Agent(…)` chips or a CLI's prompt glyphs. Tag wording stays generic: what a character is doing, in the film's language.
- Never draw a likeness of a real person. Cells, viruses, helpers and objects are characters; people are not.
- Every tag, card, sign, screen line and number on screen is traced in brief.md. A thermometer or counter is checked by its final value; `reading: false` draws a thermometer with no number.
- Health topics: general information, not advice. If you close with a practical line, it must be sourced (as in the sample: antibiotics don't work on colds; rest, fluids, when to see a doctor). Never add affiliation disclaimers.

## 1. When to use
Use it for:
- how an invisible process works, told as a team at work: the immune system, digestion, how a search engine or a compiler works, how mail is sorted, how a package travels;
- science for children and families;
- "many small helpers": parallel work, division of labour, a split-then-merge pipeline;
- friendly product promos for tools that do several jobs at once (assistants, automation, dev tools, note apps).

It suits less well:
- history with real people (no likenesses: use shadow / ink / manga);
- data-heavy news (collage / swiss / dossier);
- dark or adult moods (lumen / mystery / trailer);
- UI tours (launch / toy3d).

## 2. What it is (and isn't)
- **What it is**: a toy theatre on paper.
  - The cast does the explaining by acting; text lives on tags, cards, signs and screens.
  - One long ground line; each step of the process has its own little stage; the camera walks along it.
- **What it isn't**:
  - `whiteboard`: no marker writing on a board, no hand;
  - `grain`: no stipple and no flat vector shapes; this style is inked and pencil-hatched;
  - `lumen`: no dark room and no single light source;
  - `toy3d`: no 3D.
- **Never**:
  - smooth CSS gradients on shapes;
  - glossy highlights;
  - shapes with no outline (everything is inked);
  - more than two accent colours on the cast.

## 3. Color
- Paper `#e9e6df` (fibres, specks, a faint mottle; screen-fixed, drawn once). Ink `#2b2521`.
- Props, the same in every palette: cream `#f4ecd9`, beige `#e3d2ae`, sand `#c8ae86`, wood `#b38957`, white, grey.
- Marks: red `#cc5040` (the card titles, ✗, strike-throughs), green `#4e9a4a` (✓), screen `#26221f`, pink (cheeks).
- Palettes (`palette`) set the cast's accent **a** (with a2 light / a0 deep) and the other side **b** (b2 / b0):

  | Palette | a (the cast) | b (the other side) |
  |---|---|---|
  | `teal` (default) | teal `#2f8d89` | lime-olive `#a6b23b` |
  | `cobalt` | cobalt `#3e68b5` | orange `#e0923a` |
  | `plum` | plum `#8b4f8e` | mustard `#d8a532` |
  | `leaf` | leaf green `#5a993f` | raspberry `#c55b86` |

- Tone names: `a a2 a0 b b2 b0 paper ink cream beige sand wood red green screen white grey pink`.
- `--check` warns at more than two raw hex colours outside the palette (颜色越界). Colours the runtime mixes itself (a tone change, a clone fading in) are not counted.
- Roles:
  - **a** is the heroes;
  - **b** is the other side (the virus, the bug, the problem);
  - cream / beige / wood is the world;
  - red marks and green ✓ are results.
- A character's tone can change on screen, for example a cell turning sick: `c.tone(at, 'b2')`.
- Brand colour (`KITS.storybook.tint`): a vivid brand colour becomes **a**, kept dark enough for the ink to read. Grey and black brands keep teal. Hand-written: `PROMO.storybook(F, { colors: { a: '#…' } })`.

## 4. Type
- LXGW WenKai (霞鹜文楷) for titles and captions: a hand-lettered feel. LXGW WenKai Mono for tags, cards, signs and screens: a monospace face with Chinese. Both are OFL, loaded from jsDelivr in the starters.
- Text on props (`B.text`: cabinet labels, sheet lines, screen lines, cards) is drawn on the canvas, so a character in front covers it. Its characters go into a hidden probe so the font loader fetches the glyphs, and it is registered for the fact check.
- Tags (`B.tag`) and titles (`B.title`) are DOM text (the checks see them).
  - Tags keep one size on screen whatever the zoom: 46 px landscape, 40 px portrait. That passes the phone-readability check.
  - Tags stay inside the frame.
- Sizes (world units, 1 = 1 px at zoom 1):

  | Text | Size |
  |---|---|
  | title (`B.title`) | 60–80 |
  | sheet / screen lines | 26–28 |
  | sign text | 26 |
  | cabinet tab labels | auto from the drawer |

- `--check` warns at more than 12 pieces of text in view (字太多). Decorative numbering (`noFact`) doesn't count.
- The chapter name (script.json `chapter`) types into a dark `› ` chip in the top-left corner; `chapters: false` turns it off.
- Captions: hand-lettered ink with a paper halo, no box.

## 5. Motion
- Things enter by `enter`:

  | Entrance | What happens | Use for |
  |---|---|---|
  | `pop` | scales up with an overshoot and a squash | props, cards |
  | `drop` | falls onto the stage, squashes on landing | characters, blocks |
  | `rise` | grows up from its base | signs, posts, houses |
  | `draw` | the ink line draws on, then the fill | checks, rings, lines |
  | `slide` | comes in from `from` with small hops | a character arriving |
  | `grow` | springs up from its centre | blobs, puffs |
  | `fade` | fades in | stages, shadows |
  | `none` | already there | |

- Exits: `exit: { at, to: 'pop' | 'sink' | 'fade' | 'slide' | 'lift' }`.
- **Characters are never still for long.** They breathe, blink, sway a little and hop when they walk.
  - Acts: `c.act(at, 'squash' | 'shake' | 'shiver' | 'nod' | 'cheer' | 'bounce' | 'wave' | 'lean' | 'point' | 'think' | 'chomp' | 'spin' | 'hold', dur, { dir, n })`.
  - Faces: `c.face(at, 'neutral' | 'happy' | 'proud' | 'surprised' | 'worried' | 'determined' | 'angry' | 'sly' | 'sleepy' | 'sick' | 'ko' | 'chomp' | 'calm', until)`.
  - Gaze: `c.look(at, dx, dy)`.
  - Background characters: `B.idle([…], a, b)` gives them seeded glances, nods and small hops.
  - `--check` flags a character in view doing nothing for 8 s (角色站桩).
- Lines never boil. The wobble and the hatching are seeded and anchored to each shape. What moves is drawn as motion (cilia waving, a sprout swaying, a blob's outline flowing).
- Vary entrances: `--check` warns at 7+ things in a row with one entrance (入场单一), and at things that appear mid-film with no entrance (东西硬出现).

## 6. Camera and transitions
- **One long ground line, a stage per step.** Build the stages next to each other (x ≈ 0, 1400, 2900…).
  - The camera **travels** along the line from one stage to the next (`B.move` with a sine ease) and pushes in on what matters.
  - Between moves it holds and breathes (`drift`).
  - There are no cuts.
- `B.cam(t, view)` / `B.move(a, b, view, ease)`:
  - `view = { on: node | [nodes] | box, pad, dx, dy, crop, room, align }`.
  - A node with a tag on it brings the room above it for the tag (`room`, 170 by default; `tags: false` turns it off).
  - A move started later supersedes the ones that started before it and starts from wherever they had the camera. The camera never jumps, even when moves overlap.
- Travel takes ≥ 2 s for a stage away; `--check` flags a camera faster than ≈ 1.5 frames (long side) a second (镜头太快). Zoom stays ≤ 2.6 (推得太近).
- **Frame tight.** Two to four characters and one prop per shot.
  - The reference frames the cast at about a quarter of the frame height.
  - Wide shots are for openings and regrouping only.
- **Portrait**:
  - a wide subject sits on the bottom of the band, with the ground low and air above for tags;
  - give text-heavy shots `crop: 1` and portrait-specific framing with `B.L(landscape, portrait)`;
  - check every shot in `--stills --aspect 9:16`.

## 7. Sound
- Music (`styles/storybook/score.js`): a light, plucky bed for a toy theatre.
  - Parts: a pizzicato-like pluck walking under the action, a marimba figure, a round bass, a woodblock, a glockenspiel motif for results.
  - The turn thins to the pluck alone.
  - It ducks under the voice.
- Sound design (`sound.js`): small, close, wooden.

  | Sound | When |
  |---|---|
  | `pop` | something pops up |
  | `drop` | a wooden knock as it lands |
  | `hop` | felt taps while walking |
  | `jump` / `squash` | a jump / its landing |
  | `split` / `merge` | a rising blip and a puff / a falling blip and a pat |
  | `tag` | a click as a tag appears |
  | `ding` / `bad` | a ✓ line / a ✗ |
  | `type` | log lines typing |
  | `plane` | a paper plane |
  | `drawer`, `clack`, `press`, `bell`, `flip`, `chomp`, `paper`, `swish` | the props |

  The reference carries the whole film on foley like this, with no voice. With narration, light sounds drop out under the voice automatically.
- Voice: a warm, clear narrator; `zh-CN-XiaoxiaoNeural` is the explain.json default. Write numbers as numerals in script.json.

## 8. Signature moves (pick per film)
- **The split**: `B.split(at, c, [{ x, card, tag, sub }…])`. Ghost clones slide out of the hero, fill in with colour, hop to their places and hold up their task cards.
- **Acting it out**: a clone searches a cabinet (`drawers[i].open`, `B.papers({ fly: true })`), fixes a line on the easel (`strike` / `mark`), runs a check on the monitor (lines typing, a ✓ line), presses the big button (`B.button().press`), stacks blocks, or flips a row of cards to ✓.
- **The tag with a result**: `c.say(text, at, until, { sub, subAt })`. A dark chip pops up, then `✓ result` types in under it.
- **The merge**: `B.merge(at, clones, c)`. Every clone jumps into the one, which squashes and turns happy, with a puff and excitement ticks.
- **Messages as paper planes** flying from one stage to another (`B.plane`).
- **Something turns**: a cell going sick (`c.tone`), a block knocked off and struck, a drawer opening.

## 9. Telling information
| Content | Device | Call |
|---|---|---|
| who is doing what / a status | dark tag above a character, ✓ / ✗ result line | `c.say(text, at, until, { sub, subAt, subBad })`, `B.tag(text, { on })` |
| parallel tasks / division of labour | clones each holding a task card | `B.split`, `c.carry(at, text)` |
| a count, done / not done | a row of cards flipping to ✓ / ✗ | `B.cards({ n, ok, flipAt })` |
| what something is made of | stacking blocks with labels (one knocked off) | `B.blocks({ items: [{ text, at, out }] })` |
| categories / memory / "where it's kept" | filing cabinet with tab labels, a drawer opening | `B.cabinet({ drawers })` |
| a rule / a recipe / a fix | an easel sheet, a line struck or marked | `B.easel({ title, lines: [{ text, strike, mark }] })` |
| a trace / a check / a log | monitor lines typing, ✓ / ✗ lines | `B.monitor({ lines: [{ text, ok, bad, at }] })` |
| a message from A to B | paper plane | `B.plane({ from, to, at })` |
| a level going up | thermometer (with or without a reading) | `B.thermo({ from, to, reading })` |
| a place / a name | signpost card, a little house with a label | `B.sign`, `B.house` |
| a picture of the target | poster pinned up | `B.poster({ title, draw })` |
| a timeline | a row of day cards, built from `B.group` + `B.rect` + `B.text` (see the sample's calendar) | |

The quick version and the generic explainer reach these through the kit:
- steps: clones of the mascot on little stages, each holding its numbered card;
- contrast: cream boards side by side, a ✓ sticker on the winner;
- numbers: columns of stacked blocks dropping onto a line;
- a spot on a real UI: a magnifier with an ink ring;
- transitions: a sheet of paper slides across the frame;
- end card: the mascot drops onto its stage and cheers under the name, the url on a signpost.

## 10. The cast
A project defines its own cast once: `B.cast({ Name: { kind, tone, … } })`, then `B.char('Name', { x, at, enter, … })` (see `../CHARACTERS.md`).

| Option | Values |
|---|---|
| `kind` (the body) | `bean` (a gumdrop: dome over a wider base, the default mascot) · `round` · `blob` (a lumpy, flowing outline) · `gem` (a faceted hexagon; with `knobs` a virus-like ball) · `star` (soft points) · `capsule` · `pillar` (tall, with cilia) |
| `tone` | the body colour; a tone name |
| `top` | `sprout` (two leaves, `leaf` tone) · `antenna` (`knob` tone) · `cap` (`capTone`) · `cilia` · `none` |
| `expr` | the resting face (see §5) |
| `badge` | a letter on a cream disc on the chest (`'T'`, `'B'`) |
| `w`, `h`, `scale` | size |
| `knobs` | `true` or a number |
| `arms`, `feet`, `cheeks`, `float` | parts on or off; `float` hovers instead of standing |

- Faces: dot eyes with a highlight, ^ ^ happy eyes, closed, half-lidded, wide, ×; brows for worried / determined / angry; mouths smile / grin / o / flat / wobble / smirk / frown / chomp; pink cheeks.
- Tell characters apart by body kind, top and colour, not by a name tag alone. Put the heroes in **a** and the other side in **b**.
- Clones copy their source (`B.split`). A clone's name is `Name·1`, `Name·2`…

## 11. Pitfalls and self-check
- **Shots too wide**: the cast reads as dots and prop text becomes unreadable on a phone. Frame two to four characters and one prop.
- **Camera moves that overlap**: the later one wins. Make a travel start after the previous push-in instead of under it.
- **A card still held after its task**: `c.carry` lasts until `until`; give it one.
- **Tags on many characters at once**: tag only the ones at work (`--check`: 标签太多, more than 5). A tag running off the top of the frame is flagged (标签出画).
- **Clones that never come back**: `--check` warns when a split has no merge (分身没合体).
- **Characters standing stiff**: `B.idle` for the crowd; acts and faces for the ones the line is about.
- The motion sheet only measures DOM (tags, titles); the canvas has its own checks (things switched on, the same entrance, camera speed and zoom, stiff characters, tags, text in view, palette).
- Look at `--stills` in both aspects next to the reference frames, then the full render's frame check.

## 12. Variation
- Palette: teal ↔ cobalt ↔ plum ↔ leaf, or a brand colour as **a**.
- The hero's body: bean ↔ round ↔ capsule ↔ star, and its top (sprout / antenna / cap).
- The stage: beige ↔ cream, the dashed line in **a** or **b**.
- Telling: split → act → merge ↔ one character visiting stage after stage ↔ two teams facing each other.

## 13. API quick reference
```js
const B = PROMO.storybook(F, { palette: 'teal' | 'cobalt' | 'plum' | 'leaf', colors: { a, b, … }, wobble: 1, hatch: 1, drift: 0.005, captions, chapters, maxText: 12, maxTags: 5, portraitCrop: 1.6, seed });
// world units: 1 = 1 px at zoom 1; y down; ground line y = 0. B.L(landscape, portrait)
// every node: { x, y, rot, sx, sy, alpha, fill, stroke, lw, hatch, rim, gloss, wob, dash, at, until, enter, inDur, exit: { at, to, dur }, z, in: group, pivot: 'bottom' | 'center' | 'top' | [fx, fy] }
B.rect({ x, y, w, h, r });  B.circle({ r });  B.ellipse({ rx, ry });  B.poly({ pts });  B.path({ d });  B.line({ pts });  B.blob({ r, lump, lobes });  B.text(text, { size, tone, font: 'mono' | 'hand', align, weight, type: { at, per }, strike: { at }, mark: { at, tone }, noFact })
B.group(o) → g.rect / g.circle / … / g.text(text, o);  node.to(at, { x, y, rot, sx, sy, fill, alpha, … }, dur, ease)   (any parameter can be a function of t)
B.cast({ Name: { kind, tone, top, expr, badge, w, h, … } });  const c = B.char('Name', { x, y, at, enter, until, exit, scale, … })
c.go(at, x, dur) · c.hop(at, n) · c.jump(at, { x, y }, { dur, h }) · c.act(at, kind, dur, o) · c.face(at, expr, until) · c.look(at, dx, dy) · c.carry(at, text, { until, title }) · c.say(text, at, until, { sub, subAt, subBad, prompt }) · c.tone(at, tone)
B.split(at, c, [x | { x, card, tag, sub, subAt, char }], { every }) → clones;  B.merge(at, clones, into, { x, face });  B.idle(chars, a, b, { every });  B.puff(at, x, y);  B.ticks(at, x, y);  B.sparkle(at, x, y)
B.ground({ from, to });  B.stage({ x, w, tone, dash });  B.shadow({ x, w })
B.cabinet({ x, drawers: [labels] }) → .drawers[i].open(at) / .close(at);  B.easel({ x, w, title, lines });  B.monitor({ x, w, h, title, lines: [{ text, ok, bad, at, tone }] });  B.button({ x, r, label }) → .press(at)
B.blocks({ x, w, items: [{ text, tone, at, out: { at } }] });  B.sign({ x, title, text });  B.plane({ from, to, at, dur, arc });  B.papers({ x, n, at, fly });  B.cards({ x, y, n, ok, at, flipAt });  B.bell({ x, ring: [t…] })
B.thermo({ x, from, to, riseAt, reading, format });  B.poster({ x, title, draw: (g) => … });  B.house({ x, label }) → .door(at);  B.box({ x, label })
B.tag(text, { on, x, y, at, until, sub, subAt, subBad, prompt, light, fixed, gap });  B.title(text, { x, y, size, at, until, enter: 'write' | 'pop', font, wrap, kind })
B.cam(t, view);  B.move(a, b, view, ease);  view = { on, pad, dx, dy, crop, room, align: 'center' | 'bottom', zmin, zmax }
```

## 14. Not supported yet
- No 3D and no perspective; one side view.
- Characters are a front-view rig. They turn by flipping their gaze and walk direction, never in profile, and have no fingers.
- DOM text (tags, titles) is always in front of the drawing; text on props is drawn and can be covered.
- No photos or footage on the stage; for a real screenshot use the kit's `shot` (a hand-drawn monitor frame).
- No quick-version `diagram` cue (board styles only).
