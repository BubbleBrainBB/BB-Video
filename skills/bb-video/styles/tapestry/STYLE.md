# Style: Bayeux-Tapestry embroidered scroll (贝叶挂毯 · 中世纪刺绣长卷, `tapestry`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

A frame is a window on one long strip of embroidered linen, in the manner of the Bayeux Tapestry (11th century, public domain). The story runs along the cloth from left to right; the cloth scrolls past and never stops.

The look:
- **Linen**: undyed linen with a plain weave you can see, lit warm in the middle and darker at the edges.
- **Stitches**: everything is embroidered in wool.
  - Outlines are in stem stitch: a chain of short, slanted, overlapping stitches along the path.
  - Fills are laid-and-couched work: parallel threads in one direction, slightly uneven, held down by couching bars with small ticks.
  - Faces and hands are bare linen inside their outline.
- **Wool**: a few colours only: terracotta red, ochre, olive, sage, blue-green, grey-blue, dark blue, brown, salmon.
- **Borders**: an upper and a lower border of birds and beasts in panels between diagonal bars, along the whole cloth. A green ground line under the figures, coloured hem stripes at the bottom.
- **Trees**: stylised trees with curling branches and leaf fans divide the scenes.
- **Figures**: flat, side-on, with big heads and noses, tunics, cloaks and cross-gartered legs. They speak with big gestures.
- **Words**: an act opens under a tree-branch arch with its title. Running captions are stitched letters with a smaller line under them ("此处，…", the tapestry's HIC …).
- **Modern things** (machines, screens, rockets) are drawn in the same stitched idiom.

The motion:
- **Drafted, then stitched**: the next scene appears ahead as a faint pencil underdrawing. Then it stitches itself on: the needle runs along the outline, the laid threads go in one by one, the couching follows. A figure stitches part by part (tunic, legs, head, arms, cloak), a tree grows from the trunk out to its leaves, letters are stitched one by one with the needle.
- **The scroll**: the camera moves along the cloth without stopping (`B.scroll`).
- **Push-ins**: now and then the camera pushes in on a detail until single threads read (`B.push`).
- Every thread is seeded and anchored to its shape: nothing shimmers between frames.

Runtime: `runtime/tapestry.js` (`PROMO.tapestry(F, opt)`). New project:
- explainer (history, how a thing came to be, a chronicle): `node explainer/scripts/new.mjs <dir> --style tapestry`;
- promo: `node scripts/new.mjs <dir> --style tapestry [--quick]`.

Starter pages:
- `styles/tapestry/explain.html`: narrated, timed from the narration;
- `styles/tapestry/index.html`: promo, on the beat.

## 0. Safety
- **People are generic tapestry figures.** Historical figures (an inventor, a king, a scribe) are never a likeness. They are told apart by clothes, headwear and beard (`B.cast`), and named by the caption.
- Learn the look of the 11th-century original; never copy a modern film made in this manner (its story, its scenes, its captions).
- No other brands' trade dress. A modern device is a generic stitched device.
- Every caption, date, number and border year on the cloth is traced in brief.md (`B.margin(x, { text })` years are checked too).
- Latin or English sublines are decoration and optional. Keep any Latin correct, or leave it out. Chinese sublines (a date and a place) carry information and are better.
- Never add affiliation disclaimers.

## 1. When to use
Use it for:
- history told as a chronicle: how a thing came to be (the book, the clock, the wheel), a voyage, a war, the history of a craft or a city;
- a sequence of ages or steps where each step is people doing something;
- product promos that want a warm, crafted, storytelling feel (a "the story so far" chronicle of a company or a tool).

It suits less well:
- data-heavy explainers with many numbers (swiss / collage / dossier);
- UI tours (launch / toy3d);
- things happening inside the body or a machine at small scale (storybook / blueprint);
- fast, punchy promos (pop / op / launch).

## 2. What it is (and isn't)
- **What it is**: one long embroidered cloth. Scenes sit next to each other on it, divided by trees. The figures act each step out; a caption says what happens here.
- **What it isn't**:
  - `ink`: no brush, no wash, no Chinese handscroll; this is wool on linen;
  - `shadow`: no light behind a screen, no jointed puppets;
  - `whiteboard`: no marker and no hand; the needle draws;
  - `storybook`: no cute cast and no pencil hatching.
- **Never**:
  - smooth gradients on shapes (the only gradient is the light on the cloth);
  - shapes with no stitches (everything is outlined or laid);
  - perspective or shading;
  - more than one caption on screen at once.

## 3. Color
- Linen `#e2cfa3`, its weave drawn once and anchored to the cloth. Outline wool (ink) `#2c3040`.
- Wool (`palette: 'bayeux'`, the default):

  | Tone | Colour | Typical use |
  |---|---|---|
  | `red` | terracotta `#b0503a` | tunics, roofs, initials |
  | `ochre` | `#cf9f3e` | belts, crowns, gold things, brooches |
  | `olive` | `#7d8537` | the ground, leaves |
  | `sage` | `#8ba083` | leaves, light clothes |
  | `green` | blue-green `#3e7b6e` | leaves, cloaks |
  | `blue` | grey-blue `#6a87aa` | cloaks, helmets, water |
  | `navy` | dark blue `#2f4574` | hose, robes, sublines |
  | `brown` | `#6b462e` | trunks, wood, hair |
  | `salmon` | `#d49076` | clay, faces of things, a soft second red |
  | `cream` | `#efe5ca` | pages, sheets, undyed things |
  | `grey` | `#9b978a` | stone, metal |

- `palette: 'faded'` is the same set washed out, like an old cloth.
- `--check` warns at more than two raw hex colours outside the palette (颜色越界).
- Brand colour (`KITS.tapestry.tint`): a vivid brand colour is pulled to the nearest wool and becomes the accent wool (the hero's tunic, the title initial). Grey and black brands keep the default.

## 4. Type
- Stitched letters are DOM text (the checks see them) in LXGW WenKai Bold (霞鹜文楷, OFL, jsDelivr). They are filled with satin-stitched wool (a seeded thread tile clipped to the letters), edged with a darker thread, raised a little off the linen.
- Latin sublines use Cinzel (OFL, jsDelivr, Roman capitals).
- Sizes (world units, 1 = 1 px at the band framing):

  | Text | Size |
  |---|---|
  | act title (`B.act`) | 84 landscape, 76 portrait |
  | act number (第一幕) | half the title |
  | caption (`B.caption`) | 54 |
  | caption subline | 34 |
  | border year (`B.margin`) | up to 44 |

- Captions type in letter by letter with the needle at the next letter. A caption waits until the cloth has brought its whole width into the frame (`arrive: false` turns that off), so portrait never stitches one half off screen.
- A stitched text is DOM while it is in the frame. Once the cloth has carried it off, its window ends and a canvas copy stays on the cloth, so a pull-back still shows every caption. A text with its own `until` (or `stay: true`) keeps its window.
- `--check`:
  - more than 6 stitched texts in view (字太多);
  - a caption wider than the frame (说明太长): in portrait the frame shows about 790 units, so about 12 characters at 54;
  - a caption on the upper border (说明压边), or stitched partly off frame (说明出画).
- Narration captions: dark wool letters with a linen halo, on the plain linen under the hem. The chapter (script.json `chapter`) is stitched above the upper border in portrait.

## 5. Motion
- Things enter by `enter`:

  | Entrance | What happens | Use for |
  |---|---|---|
  | `stitch` | the needle runs the outline, the laid threads go in, the couching follows (groups: part after part) | figures, props, most things |
  | `lay` | the laid fill first, the outline last | big flat things (a sail, a slab, a building) |
  | `grow` | lines from their start, groups part after part | trees, branches, ropes, arches |
  | `fade` | fades in | rarely |
  | `none` | already there | |

- Exits: `exit: { at, to: 'unpick' }` (the stitches come out in reverse) or `'fade'`.
- Stitching time is set by size (outline length and fill area); `speed` scales it, `inDur` sets it.
- **The underdrawing**: every stitched thing is drafted in pencil `sketch` seconds before it starts (1.1 by default; 2–3 when the cloth scrolls, so it shows ahead at the right edge).
- **Figures are never still for long.** Poses blend: `c.pose(at, name)` with `stand point reach raise cheer hold carry present think open bow rest lift read`, and working loops `write work pull knead carve pound`. Also `c.go(at, x)` (walking), `c.turn(at)`, `c.nod(at)`, `c.sit(at)` / `c.stand(at)`.
  - Figures in view while the story is elsewhere: `B.idle([c1, c2…], a, b, { every })` gives them seeded pose changes and nods.
  - `--check` flags a figure in view doing nothing for 9 s (人物站桩).
- Machines move as finished embroidery: gears and wheels turn (`spin`), flames flicker; `node.to` moves anything.
- Vary the entrances: `--check` warns at 7+ things of one kind in a row with one entrance (入场单一), and at things that appear mid-film with no stitching (东西硬出现).

## 6. Camera and transitions
- **One cloth, one scroll.** Lay the scenes out along x (a scene every 1,200–1,500 units) and give the camera a track: `B.scroll([[t, x], …])`, where x is the middle of the frame on the cloth at time t.
  - Between the points the cloth moves smoothly (monotone: it never runs backwards) and starts and stops gently. Keep it moving the whole film.
  - About 120–200 units a second. `--check` flags a cloth moving faster than 0.42 frames a second (卷轴太快).
  - Start each scene's stitching when the camera is about to reach it: the underdrawing shows at the right edge first.
- **Push-ins**: `B.push(a, b, view, { back, backDur })` pushes in on `view` (`{ on: node | [nodes], pad }` or `{ x, y, z }`), holds, and from `back` returns to the scroll. The cloth keeps moving under it, so the return is smooth.
  - Push in where the threads should read: a gear turning, a page, a date in the border. Zoom up to about 3.4 (推得太近 above 3.5).
  - A wide pull-back (`{ x, y, z: 0.35 }`) at the end shows the whole cloth.
- **No cuts.** Scenes are divided by trees; acts open under the arch.
- **Portrait**: the same band, taller (zoom 1.37, about 790 units wide). The chapter title sits on the linen above the upper border, the narration captions under the hem.
  - Lay scenes out tighter for portrait with `B.L(landscape, portrait)`: two figures and one prop per frame.
  - Check every shot in `--stills --aspect 9:16`.

## 7. Sound
- Music (`styles/tapestry/score.js`): a small medieval consort in D dorian.
  - A drone on the open fifth (like a hurdy-gurdy or an organ pipe), a recorder carrying the tune, a harp plucking the chords, a frame drum, a bell for the open and the close.
  - Under a voice the drone and harp keep; the recorder plays only in the open, the turn and the close.
- Sound design (`sound.js`): close and woollen.

  | Sound | When |
  |---|---|
  | `stitch` | a thing stitches on: thread drawn through linen |
  | `lay` | a laid fill: a run of short pulls |
  | `grow` | a tree or an arch grows |
  | `letter` | a caption is stitched |
  | `knot`, `needle` | small tugs and pricks |
  | `unpick` | stitches come out |
  | `push` | a push-in: a slow breath of air |
  | `act` | an act opens: a bell in the hall |

- Voice: a calm storyteller; `zh-CN-YunxiNeural` is the explain.json default. Write numbers as numerals in script.json.

## 8. Signature moves (pick per film)
- **Drafted, then stitched**: the next scene in pencil at the right edge, stitched as the cloth arrives.
- **The act arch**: `B.act({ x, n: '第二幕', title, sub })`. A trunk grows and bends over into an arch, a second tree grows, birds perch on the arch, the title is stitched under it with a dotted rule and a subline.
- **The caption**: `B.caption('此处，…', { x, sub })`. Stitched letter by letter with the needle.
- **The push-in to the threads**: on a gear, a page or a date.
- **The border echoes the story**: a year stitched in the lower border (`B.margin(x, { text: '868' })`), or a small motif instead of a beast (`B.margin(x, { draw: (g) => … })`).
- **The pull-back** at the end: the whole cloth with every scene on it.
- **Unpicking**: something superseded comes out stitch by stitch (`exit: { at, to: 'unpick' }`).

## 9. Telling information
| Content | Device | Call |
|---|---|---|
| what happens here / a step | figures acting it out, a caption with a date and a place | `B.figure`, `c.pose`, `B.caption(text, { sub })` |
| an age, a part of the story | the act arch | `B.act` |
| a sequence | scenes along the cloth, divided by trees; the camera reads it left to right | `B.tree`, `B.scroll` |
| a date | the caption's subline, or the year in the lower border under the scene | `B.margin(x, { text })` |
| a quantity | many of one thing, stitched one after another (42 lines, 1,000 sheets) | `B.tally({ n, cols, make })` |
| what something is made of | the parts stitched in the lower border under the scene | `B.margin(x, { draw })` |
| a mechanism | a stitched machine with turning gears and wheels, a push-in | `B.gear`, `B.wheel`, `B.push` |
| a contrast (then / now) | two scenes side by side with a tree between them | |
| an object | stitched props | `B.book`, `B.roll`, `B.slab`, `B.table`, `B.desk`, `B.hall`, `B.boat`, `B.fire`, `B.plant`, `B.water`, `B.hill`, `B.sun`, `B.star`, `B.bird` |

The quick version and the generic explainer reach these through the kit:
- steps: scenes along a cloth, each a stitched roundel with its number and a caption, trees between them;
- contrast: two panels of the cloth divided by a tree, a red stitched mark on the winner;
- numbers: columns of laid wool rising from the ground line, the value stitched above;
- a spot on a real UI: a stitched ring around it;
- transitions: the cloth slides past to the next panel;
- end card: the name under the branch arch, the url stitched under it.

## 10. The cast
A project defines its own cast once: `B.cast({ Name: { … } })`, then `B.figure('Name', { x, at, face, pose, h })` (see `../CHARACTERS.md`).

| Option | Values |
|---|---|
| `tunic` | the tunic's wool (a tone name) |
| `robe` | `true`: an ankle-length robe instead of a knee-length tunic |
| `cloak` | the cloak's wool, or `'none'` |
| `hose`, `trim`, `belt`, `shoe` | the legs, the hem band and cross-garters, the belt, the shoes |
| `hair`, `hairLen` | hair wool; `'long'` to the shoulders |
| `beard`, `beardTone` | `'none'` · `'short'` · `'long'` |
| `hat`, `hatTone` | `'none'` · `'cap'` · `'helmet'` (conical, with a nasal) · `'crown'` · `'hood'` · `'veil'` · `'tall'` · `'brim'` |
| `sex` | `'female'`: a long robe, a veil unless `hat` says otherwise |

- Figures face right; `face: 'left'` mirrors them. `h` sets the height (320 by default).
- `c.hand` is a group at the front hand: build a prop in it (`B.book({ in: c.hand, … })`) and it moves with the arm.
- Tell people apart by at least two of clothes colour, headwear, beard and robe (the cast check warns otherwise).

## 11. Pitfalls and self-check
- **Scenes too far apart**: the cloth rushes (卷轴太快). Put scenes 1,200–1,500 units apart and give the track the time the narration needs.
- **Stitching after the camera has passed**: start a scene's stitching as the camera arrives (`at` a little before the track reaches its x); the underdrawing then leads in from the right.
- **A figure standing still for a whole line**: give it a pose change or a working loop.
- **Long captions**: one short line (≤ 12 characters for portrait) plus a subline.
- **Too many things stitching at once**: a needle per thing; three needles at a time at most are drawn. Stagger.
- The motion sheet only measures DOM (captions, titles); the canvas has its own checks (things switched on, one entrance, cloth speed, push-ins, stiff figures, text in view, palette).
- Look at `--stills` in both aspects next to the reference frames, then the full render's frame check.

## 12. Variation
- Palette: bayeux ↔ faded.
- Trees: `fan` ↔ `interlace` ↔ `bare`.
- Telling: one figure carries the story through every scene ↔ a new cast per age ↔ a procession.
- The border: beasts ↔ years ↔ small scenes that echo the story.

## 13. API quick reference
```js
const B = PROMO.tapestry(F, { palette: 'bayeux' | 'faded', colors: { red, … }, speed: 1, sketch: 1.1, light: 1, borders: true, ground: true, captions, chapters, maxText: 6, seed });
// world units: 1 = 1 px at the band framing (landscape); y down; the ground line y = 0. B.L(landscape, portrait). B.layout: the cloth's bands
// every node: { x, y, rot, sx, sy, alpha, fill, edge, dir, lw, couch, spacing, at, until, enter, inDur, exit: { at, to, dur }, z, order, sketch, in: group }
B.shape({ d });  B.line({ d | pts, w, fill, taper, curve });  B.rect({ w, h, r });  B.circle({ r });  B.ellipse({ rx, ry });  B.poly({ pts });  B.dot({ r });  B.leaf({ r })
B.group(o) → g.shape / g.line / g.rect / … / g.group;  node.to(at, { x, y, rot, sx, sy, alpha }, dur, ease)   (any parameter can be a function of t)
B.cast({ Name: { tunic, robe, cloak, hose, hair, hairLen, beard, hat, sex, … } });  const c = B.figure('Name', { x, at, face, pose, h, sit })
c.pose(at, name, dur) · c.go(at, x, dur) · c.turn(at) · c.nod(at) · c.sit(at) · c.stand(at) · c.hand · c.backHand · c.head
B.tree({ x, h, kind: 'fan' | 'interlace' | 'bare', leaves: [tones], trunk });  B.act({ x, w, n, title, sub, initial });  B.caption(text, { x, y, sub, size, align, arrive })
B.hill  B.water  B.boat({ w, sail })  B.hall({ w, h, roof: 'gable' | 'dome' | 'tower' })  B.table({ w, h })  B.desk  B.book({ w, h, open })  B.roll({ w, h })
B.slab({ w, h, marks: 'wedge' | 'lines' | 'grid' | 'dots' })  B.fire  B.gear({ r, teeth, spin })  B.wheel({ r, spin })  B.sun  B.star  B.plant({ kind: 'reed' | 'flower' })  B.bird
B.tally({ n, cols, gap, rowGap, make: (g, i) => … });  B.idle(figures, a, b, { every, poses });  B.margin(x, { band: 'bottom' | 'top', text | draw });  B.text(text, { x, y, size, tone, align })
B.scroll([[t, x], …]);  B.push(a, b, { on, pad } | { x, y, z }, { back, backDur });  B.camAt(t)
```

## 14. Not supported yet
- No horses and no other animals on the main register (the border has birds and beasts).
- Figures are side-on only: no front views, no fingers, no faces that change.
- No photos or footage on the cloth; for a real screenshot use the kit's `shot` (a stitched frame around it).
- Stitched DOM text is always in front of the embroidery.
- No quick-version `diagram` cue (board styles only).
