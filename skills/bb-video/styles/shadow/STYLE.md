# Shadow puppetry (皮影戏, `shadow`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to the `promo/` folder of bb-video.

One frame: an off-white screen inside the stage's wooden frame, lit from behind. The puppets are carved translucent ox-hide (red, green, ochre, black), with openwork patterns letting the light through. Figures are in profile, with joints at neck, shoulder, elbow and hip, and control rods (sticks, 签子) reaching down. Figures walk on stage, talk, bow, ride horses, fall; red paper slips hang down with names and years; at a scene change the lamp dims and comes back.

Runtime: `runtime/shadow.js` (`PROMO.shadow(F)`). New project: explainer `node explainer/scripts/new.mjs <dir> --style shadow` (generates a hand-written `compose` skeleton: cast list, `scene / cut / name / say`, one sample scene, music sections; male voice by default, 1.2 s held at the opening, see `styles/shadow/explain.json`; add `--quick` for the quick explainer skeleton when you only want paper slips and large characters, no acted scenes), promo `node scripts/new.mjs <dir> --style shadow` (add `--quick` for the quick version). Starter pages: `styles/shadow/explain.html` (hand-written story skeleton), `styles/shadow/index.html`.

## 0. Safety
- The lamp flicker is very slight (brightness ±3%, slow). The "dim and come back" scene change happens at most once every 4 seconds; don't change on every line.
- Use the red war-fire light once or twice per film, not for a whole passage.

## 1. What content it suits
- **History, stories, allusions, people**: an event with people, conflict and a turn (the An Lushan Rebellion, the Feast at Hongmen (鸿门宴), a brand's founding story). Shadow puppetry is a medium for "acting out stories" to begin with.
- Traditional Chinese culture, festivals, folk customs, intangible heritage.
- Explanations of "who did what to whom": two sides facing off, one side defecting to the other, one person passing through several places.
- Less suited: product promos that are all data and UI (screenshots on the screen break the illusion), fast-paced tech launches (puppet motion is slow and halting), abstract concepts with no characters.

## 2. What it is (and isn't)
- **What it is**: light through carved ox-hide cast onto a screen. Everything in the frame is a **profile, flat, jointed** silhouette: coloured but translucent, with openwork patterns in the dark areas. Motion comes from the rods; joints turn segment by segment, not as continuous deformation.
- **What it isn't**: pure black silhouette animation (that is shadow play; shadow puppets are in colour), front-facing cartoon characters, 3D marionettes, paper cutting (paper cutting is stuck on paper; shadow puppets let light through and move).

## 3. Colour
- The colours are the ox-hide dyes: vermilion, dark green, indigo, ochre, yellow, ink `#1C130C`. The hide is translucent and multiplied with the screen (multiply), so colours glow like stained glass.
- **The screen is off-white by default** (`#FCF9F1`, slightly darker towards the corners): real shadow puppets (museums, today's performances) use a white screen, where the hide colours are brightest and the openwork clearest. `PROMO.shadow(F, { screen: 'oil' })` switches to warm oil-lamp yellow, only for films that want nostalgia or a night scene — it tints the whole film yellow and muddies the colours. You can also use the oil lamp for only some scenes: `Y.stage(layer, { screen: 'oil' })` (oil lamp for flashbacks and memories, off-white for the present).
- Character colours follow convention: the emperor in a yellow robe, civil officials in green, generals in red, **villains with a "solid face"** (the whole face blacked in), good characters with an "open face" (only the outline carved). `Y.puppet`'s `kind` is already set up this way; `colors: { robe: 'blue' }` changes it.
- The lamp colour carries emotion: `warm` (default, normal light), `red` (war fire, rebellion), `cold` (night, flight, grief); switch with `Y.lamp(at, { color })`.
- **Brand colours**: not used. Shadow-puppet colours are a fixed set of dyes; `film({ brand })` doesn't change the palette (`P.kit.brand('shadow', …)` returns `color: null`). To echo the brand, put the brand colour on a paper slip or a flag (`Y.placard({ color: '#…' })`).

## 4. Type
- Always LXGW WenKai (霞鹜文楷, OFL; `index.html` already loads it from jsdelivr): handwritten kaishu (楷书), as if carved on the puppets or written on the paper slips.
- **Large characters** (`Y.title`) are ink-coloured kaishu, as if written on the screen, arriving with a gong.
- **Paper slips** (`Y.placard`) are red paper (or black) with off-white text, hanging on a string; they drop, swing once and settle. Use slips for names, places and years; short ones (≤ 6 characters) can hang vertically (`vertical: true`).
- **Names hang above the figure's head**: `Y.placard(…, { over: figure })` places it above their head automatically and follows them, without covering the head (once figures are scaled up, hand-placed slips easily cover it).
- Sizes: slips 50–64 (≥ 50 on phones), large characters 120–160, end-card characters 130–160 (design size).
- Text sits in the layer "above" the lamplight (`screen._top`): when the lamp dims for a scene change, text doesn't dim with it.

## 5. Motion
- **Figures**: `walk` (body bobbing, legs alternating; `{ backward: true }` backs away facing forward, shrinking to hide), `talk` (hand lifting again and again), `point`, `bow` (hands clasped), `fight` (swing a weapon), `fall` (knocked down, then fades out), `lie` (lying drunk, asleep: stays on the ground, rods withdrawn; `{ back: true }` falls backwards), `rise` (get up off the ground), `sink` (sink slowly out of the light, for death or disappearance), `sway` (sway drunkenly), `weep` (weep behind a sleeve: sleeve raised to the face, sobbing), `turn` (turn round), `exit` (walk off stage), `dance` (sleeve dance), `ride` (ride a horse, moving with it).
- **Entrances**: `enter: 'left' | 'right'` walks in from the side of the stage (footsteps), `'fade'` presses onto the screen from behind (blurred to sharp).
- **Props**: palace, city gate, mountain, tree, flag (the cloth flutters, with a character on it), war fire (flickering), moon, auspicious cloud, horse (four legs alternating at a gallop), wine jar, reeds (swaying in the wind), sword (`rot: 90` lies flat). A palace can `fall` (collapse).
- **Snake** (`Y.snake`): white hide carved with scales, always slithering; `rear: [up, down]` raises its head and flicks its tongue, `cut: time` a flash of sword light cuts it in two (twitches a few times, then still), `dead: true` already cut, lying there, `crawl` moves forward.
- **Carve your own** (`Y.leather`): animals and objects the runtime doesn't have, drawn with `draw(g, kit)` / `frame(t, g, kit)`; `kit` holds the runtime's own carving tools (`piece` + `CARVE.hex / slits / dots / scales / waves`, `curve`, `strip`, `oval`…, coordinates in frame px); it handles the blurred-to-sharp entrance and the light showing through. You can carve a figure's headwear too: write `look.hat` as a function `(g, kit, colors) => {}` drawing in head coordinates (face from -546 to -474, facing right), with `look.hatTop` giving the height of the top of the head (slips hang above it); or add things into `p.head` (they turn with the head).
- **Map** (`Y.map` + `Y.route`): mountains and rivers in shadow-puppet style, city names on red paper slips; a marching route is drawn section by section, with drums.
- Sense of time: halting, like a hand working the rods. Joints turn over 0.3–0.6 s, one step takes about 0.5 s; once a figure settles there is a little residual sway (built in).
- Figures' feet stand at `Y.floor` (0.86 of frame height in landscape, 0.78 in portrait). In hand-written films change it to suit the composition: the sample uses 0.8 landscape and 0.64 portrait, leaving room for subtitles below.

### Cast list: settle the figures at the start
The storytelling rules shared by every style with characters (whiteboard, ink, shadow puppetry): `../CHARACTERS.md`. How shadow puppetry does it:
- For named characters, settle their look at the start of the film with `Y.cast({ name: { kind, look, colors, scale } })` (`kind: 'crone'` is an old woman: white hair in a plain bun, dark robe, stooped; to make other figures look old use `look: { hairColor: 'white', stoop: 0.6 }`; Qin–Han figures wear `hat: 'guan'`, the long cap / bamboo-skin cap, commoners just a topknot, `hat: 'hair'`), then call them up in every scene with `Y.puppet(…, { who: 'name' })` — the same person looks the same in every scene, so the audience can follow.
- **Different figures in the same scene differ in at least two things**: face colour (`look.face: 'solid'` + `faceColor: 'red'` red face, loyal and brave / `'white'` white face, treacherous / `'blue'` blue face / black by default; `face: 'hollow'` open face), beard (`beard: 'long' | 'short' | 'full' | null`, `beardColor: 'white'` for the old), headwear (`hat`, `helmetColor`, `feathers: true` pheasant plumes / `tassel` colour of the red tassel), robe colour (`colors: { robe, trim }`, can be red / green / blue / yellow / ochre / deep / black), build (`belly` fat or thin, `scale` tall or short). `--check` reminds you when two different people look identical.
- Use Chinese opera face-painting conventions to help the audience recognise people: red face loyal and brave, white face treacherous, black face blunt and rash; the young have no beard, the old a white beard.

### Two-person scenes face each other
- Fighting, talking, arguing: the two figures stand face to face (opposite `face`, or turned with `P.faceTo(at, other)`) and move together: in `fight` they lunge forward and pull back, in `talk` they take turns line by line.
- A chain of events (who killed whom, who passed it to whom) is acted as a relay: the next person walks up to the previous one and acts, the previous one falls and sinks out of the light (`fall` then `sink`), and the name changes into a year. The sample's "the rebels kill each other" is done this way.

## 6. Camera and transitions
- The camera barely moves (the shadow-puppet audience sits below the stage). At most a very slow push on the scene container (1 → 1.02).
- **Transition = scene change**: `Y.change(at, dur, { to, color })` dims the lamp and brings it back, changing scenes at the darkest moment (the quick version's `wipe` is this); it comes back to this scene's brightness and colour (night scenes `{ to: 0.65, color: 'cold' }`) rather than going to 1 first and then dimming.
- Mark emotional turns with the lamp colour (warm → red → cold), not with fancy transitions.

## 7. Sound
- Score: D minor, string bed + plucked arpeggios (like pipa / yangqin) + wooden fish + tanggu drum, gong at the climax (`styles/shadow/score.js`). Keep the tanggu drum down (gain ≤ 0.1), or it covers the other layers.
- Sound effects (`sound.js`): wooden fish (a slip dropping, something changing), gong (large characters), tanggu drum (marching, battle), footsteps, a dull thud for falling, seal, cloth in the wind (scene change). Sonic logo: one gong + a string chord.

## 8. Moves unique to this medium (pick to suit the content)
- **A person walks on stage and a red slip drops with their name**: the most natural way to introduce a character.
- **Two sides facing off**: two figures face to face, a flag behind each.
- **Riding off to war**: a figure mounts a horse, the horse gallops, the background turns to red light and war fire.
- **Falling / sinking**: a character's end. `fall` is being knocked down, `sink` is slowly leaving the light (death, loss of power).
- **A marching route on the map**: a few cities, a route drawn across them section by section.
- **A palace collapses**: the end of an era.
- **A vermilion seal stamped on the end card** (carved with the film's or product's name, never a style name like "皮影"; no `seal`, no stamp).

## 9. Pitfalls and self-check
- **Figures invisible**: SVG transforms must use `setAttribute('transform', …)` (the runtime already does). The same goes for any SVG elements you add yourself; don't use CSS `transform`.
- **The rider too big, or floating above the horse**: horse in front, rider behind (the horse's `z` larger than the rider's), and the figure's `size` must match the horse's `size` (sample, landscape: figure 460, horse 400–420).
- **Slips overlapping or cut off at the edge**: at most 3–4 at once, stacked in a column in portrait; keep slips ≥ 60px from the frame edge.
- **Slip appears before the figure**: the text on a flag hangs 0.5 s after the flag appears (the runtime already does this).
- **Dead air**: puppet motion is slow, so one figure standing still through a whole narration line looks empty — have them `talk`, hang a slip, or change the light.
- Self-check following `references/review.md`.

## 10. Room for variation
- Screen: off-white (default) ↔ warm oil-lamp yellow (`screen: 'oil'`).
- Light: normal ↔ red (war fire) ↔ cold (night, grief); `Y.stage({ variant })` changes the light's position.
- Figures: seven character kinds × colours (`colors`) × size (`size`); `depth` for distance (further = a little smaller and fainter).
- Busy or sparse: carving density is fixed; a scene can hold one person (quiet) or an army (a few soldiers + flags + war fire).

## 11. API quick reference
```js
const Y = PROMO.shadow(F, { lamp: 0.05, screen: 'white' | 'oil' });   // lamp = lamp brightness at the opening (0.05 = lights up out of darkness)
Y.floor = H * 0.8;                               // height of the figures' feet (change to suit the composition)
const st = Y.stage(层, { variant, screen });      // → { el, screen }; put things into st.screen; screen picks 'white' | 'oil' for this scene only
Y.lamp(at, { to: 1, dur: 0.8, color: 'warm' | 'red' | 'cold' });
Y.change(at, dur, { to, color });                // scene change: the lamp dims and comes back, stopping at to / color
const p = Y.puppet(st.screen, { kind, x, size, face: 'left' | 'right', depth, colors, at, until, enter: 'left' | 'right' | 'fade', enterDur, z });
p.walk(at, x, dur, { backward }); p.talk(at, dur); p.point(at, dur); p.bow(at); p.fight(at, dur); p.fall(at, { stay }); p.lie(at, { back }); p.rise(at, dur); p.sink(at, dur);
p.sway(at, dur, deg); p.weep(at, dur); p.turn(at); p.faceTo(at, 另一个人物); p.exit(at, side, dur); p.dance(at, dur); p.ride(horse); p.head   // the svg group of the head
Y.cast({ 名字: { kind, look: { face, faceColor, beard, beardColor, hairColor, stoop, hat, hatTop, helmetColor, feathers, tassel, belly }, colors: { robe, trim }, scale } });   // cast list; hat can be 'guan' / 'hair' / a function
Y.puppet(st.screen, { who: '名字', x, at, … });   // called up from the cast list
const h = Y.prop(st.screen, { kind: 'horse' | 'palace' | 'gate' | 'mountain' | 'tree' | 'flag' | 'fire' | 'moon' | 'cloud' | 'jar' | 'reeds' | 'sword', x, y, size, at, until, text, depth, face, rot, z });
Y.snake(st.screen, { x, y, len, w, face, at, until, depth, amp, rear: [起, 落], rearH, cut, sep, dead, crawl });
Y.leather(st.screen, { at, until, depth, z, draw(g, kit) {}, frame(t, g, kit) {} });   // carve your own; kit = { piece, CARVE, curve, strip, oval, ring, … }
h.move(at, x, dur); h.gallop(at, dur); h.fall(at);
const m = Y.map(st.screen, { at, until, cities: [{ name, x, y }], mountains, river, box });
Y.route(m, { via: ['范阳', '洛阳', '长安'], at, dur, color });
Y.placard(st.screen, { text, at, until, x, y, top, after, over, vertical, size, color: 'red' | 'black' | '#…', swing, align });   // over: a figure → hang above their head
Y.title(st.screen, { text, at, until, x, y, size, align });   // given x, the line isn't centred (the figure stands on the other side); align 'center' | 'left' | 'right'
Y.endcard(st.screen, { at, title, sub, seal });          // no seal given, no seal stamped
```
In the code above, `层` = a layer, `名字` = a cast name (can be Chinese), `另一个人物` = another figure, `[起, 落]` = [up, down] times; `'范阳', '洛阳', '长安'` are city names (Fanyang, Luoyang, Chang'an).

Time: `at` = settled and readable (on the beat); `until` = fully gone. Coordinates: a figure's `x` is the centre of its feet; the `x, y` of slips and large characters is their centre.

Generic API (`runtime/kit.js`, used by the quick version): `word` = `Y.title` large characters, `line` = a horizontally hung slip, `card` / `shot` = a carved wooden frame (screenshot inside), `accent` = an auspicious cloud + a gong, `wipe` = scene change (lamp dims and comes back), `end` = large characters + a seal carved with the product name. Telling information: `steps` = a row of vertically hung slips (the key step in red), `versus` = two puppets facing off, each with a title and claim hanging above, `figures` = carved wooden bars (bigger = taller), `spotlight` = the light falls on that one spot only, `flash` = one large character on the warm-lit screen.

In explainers (following narration, with subtitles): a new project is a hand-written `PROMO.compose` skeleton by default (`styles/shadow/explain.html` — acted scenes have to be hand-written); you can also use `--quick` for `PROMO.film({ format: 'explain' })` (`promo/references/kit.md`, "following the narration"), but then there are only slips and large characters, no figures.

## 12. Not supported yet
- Front-facing figures, facial expressions (shadow puppets are profile only, the face is carved fixed).
- Acted scenes in the quick version: `film()` only uses slips, large characters and wooden frames, plus two figures standing in `versus`; for figures acting out a story, hand-write `compose`.
- Contact between figures (supporting, hugging, pulling) — they can only stand side by side, one fall, or one lie while another walks up to them.
- Animals other than the horse and snake: carve them yourself with `Y.leather` (the same carving tools).
- Brand colours, dark backgrounds (the screen is off-white or warm oil-lamp yellow, nothing else).
- Video footage (screenshots can go in a wooden frame, video can't).
