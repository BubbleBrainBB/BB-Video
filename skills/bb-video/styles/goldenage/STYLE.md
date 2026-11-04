# Golden-age American theatrical cartoon (美式黄金卡通, `goldenage`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

One frame: a painted gouache city at midnight, deep blues and warm yellow windows, Art Deco towers with brickwork you can read, behind inked cel characters with hard cel shadows. It looks like a print of a 1940s–50s American studio short: a little gate weave, fine colour grain, a rounded gate.
- **Painted world, inked cast.** Backgrounds are paintings (no outlines, paper tooth, dry-brush); everything that acts is flat colour on a cel with a swelling ink line. The mismatch between the two is authentic: keep it.
- **On twos, and the line boils.** 15 drawings a second at 30 fps; every ink line shifts a little from drawing to drawing (seeded, so the same frame always renders the same).
- **Cartoon physics.** Everything is rubber: a ball flattens to a pancake, a skyscraper accordions and rings like a spring, a spire bends like a fishing rod. Anticipation before, an impact frame on, elastic recovery after, and things can hang in mid-air until they notice.
- **Comedy by cause and effect.** One small mistake sets off a chain of bigger collisions; each hit causes the next. Dead-still pauses set the laughs up.

The technique is the classic craft of American theatrical shorts. We learn the craft only: never a studio's characters, gags, cues, titles or end cards. `styles/goldenage/moon-film.html` is a whole 2:14 short made with this runtime: read it to see how a gag is built, don't reuse its story.

Runtime: `runtime/goldenage.js` (`PROMO.goldenage(F, opt)`, canvas 2D, no libraries). New project:
- narrated explainer: `node explainer/scripts/new.mjs <dir> --style goldenage`;
- promo on the beat: `node scripts/new.mjs <dir> --style goldenage` (add `--quick` for the quick version through the kit).

Starter pages: `styles/goldenage/explain.html` (narrated) and `styles/goldenage/index.html` (on the beat). Narrated films set `compose({ chapters: false })`.

## 0. Safety
- **No studio's characters or marks.** No mice, rabbits, ducks, coyotes, sailors, cats and mice as a pair, no recognisable design from any real cartoon; no studio logo, no shield or rings title, no "That's all" sign-off, no real cue or quoted melody. Invent the cast. The worker and the moon here are our own; a new film should usually invent its own too (change the worker's colours, cap and build, or draw a new character with the ink kit).
- **None of the period's prejudice.** Real cartoons of the era contain racist, sexist and ethnic caricature. Never imitate it: no blackface or minstrel features, no ethnic stereotypes, no such gags, however "authentic".
- **No likeness of a real person.** A biography in this style uses an invented stand-in with no real features. Punishing cartoon violence on a real person, a real group or a real tragedy is out: the slapstick is for invented characters and objects.
- **No slapstick on real harm.** Accidents, illness, death and disaster are told plainly or in another style (`pencil`, `newsreel`, `mystery`). Nobody real gets squashed for a laugh.

## 1. When to use
- **How something goes wrong, and the chain it sets off**: bugs, outages, why a bridge wobbles, why a sneeze spreads, the butterfly effect. A chain reaction is the strongest thing this style has.
- **Physics, forces, gravity, elasticity, momentum** explained by exaggerating them: squash and stretch is the demonstration.
- **Everyday trivia and light science for a general audience**, told as one gag per idea.
- **Promos** for playful consumer products, games, kids and family, entertainment: "here's the disaster without us; here's the snap back".
- **Less suited:**
  - real UI walkthroughs (`launch`, `toy3d`; only `S.shot` frames a screenshot here);
  - dense numbers and comparisons (`swiss`, `collage`);
  - serious, sad or sensitive subjects (§0);
  - many named characters talking (`shadow`, `chat`, `manga`).

## 2. What it is (and isn't)
- **It is a theatrical cartoon short:** a painted set, an inked cast, poses you can read in silhouette, timing with holds, a hot little band chasing the picture.
- **Not `storybook`:** no soft cute mascots in pastel picture-book pages; this is a saturated night city, hard shadows, violence of rubber.
- **Not `pop`:** no Ben-Day dots, comic panels or speech bubbles; it moves like film, not print.
- **Not `pencil`:** full colour, inked, no construction lines.
- **Not anime, 3D or web motion:** no anime faces or held limited-animation pans, no plastic shading, no sliding layers or generic easing. Nothing moves at constant speed; nothing rotates stiffly from a joint.
- **Not a filter:** every line is a real filled brush stroke; never trace or filter a photo or a frame of a real cartoon.

## 3. Colour
Rich three-strip-film saturation, warm against cool:
- Night sky `#060a2c` → `#0e1c5c` → `#1b3a8c` → `#3a5aa8`, with a warm amber-violet horizon `#8a6ca6` → `#e8976a`.
- Windows and all light: `#ffd766 #ffbe45 #fff0a6 #f79a35`. Light is warm; shadow is blue-violet, never black or grey.
- Tower palettes (`PALS`): brick, limestone, rose, teal, ochre, plum, slate, brown.
- Moon: `#f8cf5c`, lit `#ffeb9e`, shadow `#d9942e`; its line is warm brown `#4a2508`, not black.
- Worker: vermilion `#dc4a2c` coveralls, striped cap, cream gloves. Ink `#1a111d`, cream `#fdf7e4`.
- Lettering: `G.colors.gold` (`#ffc93c`), `red` (`#f0603a`, `opt.accent` swaps it), `cream`. A brand colour lands as the lettering's gold (kit: `brand`).
- The style is night-first; for a daytime film give your own plates with the same paint functions and keep shadows coloured.

## 4. Type
- Lettering is **Lilita One** (Latin) and **ZCOOL KuaiLe** (Chinese) with an ink edge and a hard offset shadow (`G.write`). DOM text, so the checks see it, and it stays crisp over the grain.
- `pop: true` brings it in letter by letter, each with a squash and stretch; without it the word lands whole.
- Sizes (logical units, 720 = frame short side): titles 96–170, key words 60–90, labels 26–44. Keep it readable on a phone: nothing under 26.
- Letters can act: `sag: (i, t) => [dx, dy, rot]` lets a word droop, shake or fall off (the title of `moon-film.html`).
- For Latin title lettering drawn into the picture, `text(s, x, y, size, { layers })` draws stroked letters on the canvas (A–Z, 0–9 only); it needs no font and warps with the camera.
- Few words: the picture carries the gag; nothing on screen repeats what the voice just said.

## 5. Motion
The heart of the style. Rules to keep every shot:
- **Anticipation → action → recovery.** A wind-up the other way before every big move, an overshoot and a settle after it.
- **Squash and stretch keeps volume.** `moon(x, y, R, { sx, sy, sa })`: `sa` is the axis angle, `sx` along it; `sy ≈ 1 / sx^0.7`. Stretch along the velocity in flight (up to about 1.5, 2–3 for one or two smear drawings), round at the apex, pancake (`0.35`) on contact, held for two drawings.
- **Impact.** One `impactFrame(x, y, R, draw)` drawing (hot yellow, red and ink rays, the subject in silhouette) or `hitLines`, then shake (`shk`), dust, debris, sound, all on the same drawing. Never fade into a hit.
- **Elastic recovery.** `hit(t, t0, lo, f, d)` returns a value slammed to `lo` at `t0` and ringing back to 1; `E(dt, f, d)` is the raw spring. Use them for tower `sq`, `bend`, bulge and for props.
- **Buildings answer.** `drawTower(kind, x, baseY, s, { sq, sk, bul, bv, bend, bk, rip, rp, rattle })`: `sq` squash (with `sk` how top-heavy), `bul` the bulge, `bend` + `bk` a bow (`bk` 4+ whips only the top), `rip` + `rp` a shiver running down, `rattle` windows jittering and flickering. Hang props on `towerTop(…)` so they ride the bend.
- **Holds.** `G.pause(a, b, { energy, name, hit })` stops the line boil and drops the music to nothing, then starts a new section at `b`, so a held frame is truly frozen and truly silent (sound effects still play; `G.still` for the lines only). At least one in a film over 20 s: the longer the nothing, the bigger the laugh.
- **Keys with `K(u, [[t, value | {…}, ease], …])`** and hard switches; `lerpv` blends whole poses. On twos, so don't try to be smooth: a pose held for four drawings then a snap reads better than a slow ease.
- **Overlap.** The cap lifts after the head stops (`capy`), the rag flaps (`fl`), arms lag the body. `runP(phase, k)` is a wheel-legged run with `smear` lines at high `k`.
- Text and cards step on twos too: one clock for everything.

## 6. Camera and transitions
- `camPush(x, y, zoom, rot, shakeX, shakeY)` … `pop()` wraps everything in a shot. Paint plates and ink ride the same transform; the first argument pair is the centre of the frame.
- Stage it like a film, not one slow push: wide → sudden close-up → extreme angle. `moon-film.html` uses a straight-down shot (`bg('down')`), a gutter view (`bg('avenue')`, sizes from `need('avenue').P(X, Y, Z)`), a long side-scroll (`bg('roofs')`).
- **Cuts** are the default transition: `G.shot` cuts at its start. Cut on the action, one drawing before the hit.
- **Iris** (`G.iris(at, { out: true, x, y })`, then `{ out: false }`): closing in on the subject to end a section; opening on the next one.
- **Parallax**: `skyline(cx, cy, t, { far, mid })` paints sky, stars, drifting clouds and two skylines at their own depths; add your own near layers by offsetting `bg` with `cx * (1 - f)`.

## 7. Sound
- Music (`styles/goldenage/score.js`): a small hot band: two-beat bass, banjo pluck, bell melody, muted brass and woodblock on the fast sections; a soft lullaby for quiet ones. Silence comes from `G.pause`, not from the score. Write your own tune; never quote a real cue.
- Effects (`styles/goldenage/sound.js`), a trap drummer's list; `boing` and `slide` are synthesised in that file: `boing`, `whack`, `slide` (`dir: 1 | -1`, `dur`: a slide whistle that follows the action), `zip`, `squeak`, `tink`, `pop`, `swish`, `crash`, `ratchet`, `tick`, `gulp`, `thud`. `G.bonk(at, gain)` is a whack with its boing.
- Every action gets its noise on the same frame, the funnier the more exact. Mark key hits `keep: true` under a voice.
- The biggest sound effect is no sound: silence before the hit. `--check` will warn "no sound on a phone" in a deliberate hold; that warning is fine there.

## 8. Signature moves (pick per film)
- **The pause.** The thing wobbles; everybody freezes; a blink; a look to camera; then it goes.
- **The pancake and the boing.** Impact frame → pancake → stretch → gone, with the tower accordion ringing behind.
- **The hang.** Runs off the edge, keeps running, stops, looks down, looks at us, gulps.
- **The chain.** A → B → C, every hit caused by the last, each bigger.
- **The slingshot.** Something bends further than it could, a silent beat, then it snaps (`lattice` for steel, smear ghosts on the release).
- **The look to camera.** The last beat: the character stares at us. Cut to black. A sound over black can land one more joke.
- **Punched through.** A hole the exact shape of what went through (`clipOutCircle`): a fence, a cloud, a wall.

## 9. Characters and the cast
- **Worker** `wk(x, y, s, wp({ …pose }), dir, id)`: `s = 1` is 120 logical units tall. Ground at `y`. Pose fields (numbers, so `lerpv` blends them):
  - body `by` hip height, `lean`, `arc`, `sq`, `sx`, `hipx`; head `tilt`, `hsx`, `hsy`, `nx`, `ny`, `turn` (0 = at us, 1 = profile);
  - face `eo`, `eo2` (eyes open, -1 = same), `lx`, `ly` (pupils), `brow`, `bang`, `mo` (mouth open), `mw`, `sm`, `teeth`, `dim`, `tongue`; cap `capy`, `capr`, `capOn`;
  - arms `lax lay lab lhk lhr` / `rax ray rab rhk rhr` (hand offset from shoulder, bow, glove kind 0 open / 1 fist / 2 point / 3 grip, wrist); legs `lfx lfy lfa lfb lfd` / `rfx rfy rfa rfb rfd` (foot position from ground, angle, bow, facing);
  - `rag`, `fl` (the rag in hand and its flap), `wr` (wrench angle), `sweat`, `smear`.
  - Keep a bow (`rab`) that takes a reaching arm round the face, never across it.
- **The ball** `moon(x, y, R, st)`: true sphere: `yaw`, `pitch`, `roll` turn face and craters round it (a `pitch` that grows with distance rolls it). Face: `eo`, `eo2`, `lx`, `ly`, `pr` (pupil size), `erx`, `ery`, `brow`, `bang`, `mo`, `mw`, `sm`, `teeth`, `wince`, `dizzy` (spiral eyes, pass a growing number), `cl`, `glow`.
- **Keep proportions in every shot.** Pick one ratio between the characters and hold it: in the reference film the worker's height is 0.37 × the moon's radius from a speck to a close-up (`s = 0.37 * R / 120`).
- A new character: build it from `S`, `cel`, `tube`, `limb`, `eye40`, `mouth40`, `glove`, with a line that swells and a shadow cut by `cel`. Never rigid limbs on rotating joints: limbs are bowed tubes aimed at a target.
- Story rules for named characters: `styles/CHARACTERS.md`.

## 10. Sets and props
- **Plates** `bg(name, x, y, scale)`, painted once when first used: `sky`, `skyHi`, `far`, `mid`, `nearRow`, clouds `cl1`–`cl4`, `avenue` and `hill` (one-point streets; `need(name).P(X, Y, Z)` gives screen x, y and scale for a spot on the road, road half-width about 1.5), `down` (straight down the shaft), `roofs` (a 5500-long rooftop run, layout in `ROOFS`), `site` (a construction yard), `stoops` (brownstones to scroll).
- **Towers** `hotel`, `broad`, `lowa` (flat roofs), `slab`, `mastb` (mast), `spire` (steel crown), `zig` (ziggurat), `pyr` (gold pyramid). `{ ink: 0, hz: 1 }` draws one hazed and uninked, for the row behind.
- **Props:** `wtower` (a water tank: spin it, launch it), `lamp` (`tw` twist, `lean`), `cab`, `hangSign` (swinging neon sign, Latin capitals), `ladder`, `ncat`, `pigeon`, `bird3`, `lattice` (steel truss along a curve), `screwSide`, `wrench`, `wrag`, `theStar`, `socket`, `bracket`.
- **Effects:** `dust(t, t0, x, y, n, seed, R, life)`, `debris(t, t0, x, y, n, seed, V, g, cols)`, `puffCel`, `hitLines`, `impactFrame`, `speedLines`, `trail`, `sweat`, `ringBurst`, `musicNote`, `fourStar`.
- **Paint your own plate** for a place that isn't here: copy a plate from `runtime/goldenage.js` (`PLATES.site`, `facade`, `chimney`) rather than drawing flat shapes: washes, `blot`, `drybrush`, then `paperize`.

## 11. Telling information
Never generic boxes and arrows:
- **Steps** → `G.steps({ items: [{ text, note, hot }], T, until })`: show cards bouncing in along a line, the hot one gold.
- **Contrast** → `G.versus({ cols: [{ title, points, hot }], T, until })`: two cards, the winner gold. Better still, act it out.
- **Numbers** → `G.towers({ items: [[label, value]], ats, until, hot, unit })`: a skyline bar chart, each skyscraper springing up to its value and overshooting.
- **One card** → `G.card({ x, y, w, title, lines, at, until })`.
- **The best form is a gag:** force as a squash, a chain as collisions, a limit as the spring that snaps.
- Kit (quick version and quick explainers): flow = bouncing show cards, compare = two cards with the winner gold, chart = skyscrapers springing up, annotate = a lens with an ink ring, montage = saturated colour cells with whacks.

## 12. Cover
`F.coverAt(t)` on the biggest pose: the pancake just after impact, or a character at the extreme of a stretch. Not on an impact-frame drawing.

## 13. Pitfalls and self-check
- **Everything drifting.** Constant slow motion is the mark of web animation. Hold, then snap; `--check` reports the canvas as motion, so look with your own eyes: `--strip a,b`.
- **A hit with no anticipation or no aftermath.** Look at the three drawings before and after each hit. Is there a wind-up? A pancake held two drawings? A ringing tower, dust and debris?
- **Cause lost.** Every collision must be visibly caused by the last. If you can't draw an arrow from one to the next, cut it.
- **Characters off-model.** Same proportions in every shot (§9); a close-up is the same drawing bigger.
- **An arm across the face.** Bow reaching arms round the head (`rab`), or turn the head (`turn`, `nx`).
- **Floating characters.** Feet on `towerTop` or the ground line; a shadow ellipse under anything on a road (`F(pEll(…), 'rgba(8,8,26,.5)')`).
- **Empty sky.** Half a frame of blue: push the camera down, or bring in clouds and a near layer.
- **Plate not covering the frame.** Wide zoom-outs can run off a plate's edge. Fill behind (`xfFill`), or use `academy: true` for a 4:3 gate.
- **Lettering in the way.** Words on the action, or under the caption band (88 % of frame height).
- Look at stills: is the ink line alive in a held frame (two consecutive stills)? Do warm lights read against cool shadow? Is there black or grey anywhere that should be blue-violet?

## 14. Variation
- Colour: `opt.accent`, `opt.colors`; repaint a tower with your own `pal`; dawn, dusk or a storm by changing washes.
- Gate: fill the frame, or `academy: true` for a 4:3 picture pillarboxed in black. `film: false` removes the print effects, `gate: false` the rounded corners.
- Pace: `drawings: 15` (default on 30 fps), `10` for a choppier, older feel.
- Cast: new colours for the worker (`WC`), a different ball (write a `moon`-like function from the same ink and a new skin), a new creature.
- Settings: a kitchen, a stage, a farm: anything with rubber in it.

## 15. API quick reference
```js
const G = PROMO.goldenage(F, { seed, boil: 1, drawings: 15, film: true, gate: true, academy: false, accent, colors, fonts, captions });
const W = G.W, H = G.H, L = G.L;   // logical page: short side 720
const { camPush, pop, bg, need, skyline, drawTower, towerTop, moon, wk, wp, runP, frontRun, K, E, hit, dec, shk, seg, sm, eIn, eOut, eBack, bump, lerp, lerpv,
        dust, debris, puffCel, hitLines, impactFrame, speedLines, trail, wtower, lamp, cab, hangSign, ladder, lattice, pigeon, ncat,
        S, F: fill, L: line, cel, tube, limb, spl, pEll, pRR, pQuad, pLine, seed, push, tr, rot, scl, warp, xfDraw, xfFill, clipOutCircle } = G.lib;   // film's F stays yours: rename the pen's on the way out
G.shot(a, b, (u, t) => { camPush(cx, cy, 1); skyline(cx, cy, t); /* … back to front … */ pop(); }, { cut: true });
G.pause(a, b, { energy, name, hit });   G.still(a, b);   G.iris(at, { out, dur, x, y });   G.top(fn, a, b);   G.bonk(at, gain);
G.write(text, { x, y, size, at, until, color, pop, every, wrap, align, tilt, sag, kind, noFact });   G.title([{ text, x, y, size, color }], { at, gap });
G.card({ x, y, w, h, title, lines, at, until, fill, color, tilt });   G.steps({ items, T, until, x, y, w });   G.versus({ cols, T, until });   G.towers({ items, ats, until, hot, unit, x, y, w, h });
```
Minimal: a ball hits a tower.
```js
const hitAt = 2;
G.bonk(hitAt);
G.shot(0, 5, (u, t) => {
  const cx = W / 2, base = H + 260, d = { sq: hit(t, hitAt, 0.6), bul: t > hitAt ? 0.22 * E(t - hitAt, 2.2, 3) : 0, rattle: t > hitAt ? dec(t - hitAt, 1.4) : 0 };
  const s = shk(t, t > hitAt ? 16 * dec(t - hitAt, 3.4) : 0);
  camPush(cx, H / 2, 1, 0, s[0], s[1]); skyline(cx, H / 2, t, { far: 690, mid: 920 });
  drawTower('hotel', cx, base, 1, d); const top = towerTop('hotel', cx, base, 1, d);
  const flat = t >= hitAt && t < hitAt + 0.17, y = t < hitAt ? top[1] - 110 - eIn(1 - t / hitAt) * 800 : top[1] - 110 * (flat ? 0.36 : 1) - (flat ? 0 : (t - hitAt) * 700);
  moon(cx, y, 110, { sy: flat ? 0.36 : 1, sx: flat ? 1.7 : 1, wince: flat, mo: 0.5, mw: 24, sm: 2 });
  pop();
});
```

## 16. Not supported yet
- Daytime plates and interiors: the sets are night city only; paint your own (§10).
- No lip-sync: mouths are drawn by hand from `mo`, `mw`, `sm`; characters don't speak on screen. Let a voice narrate.
- Only one cast: the worker and the moon. New characters are drawn from the ink kit by hand.
- Canvas actions are not measured by `--check`'s motion sheet (only DOM text is); look at strips.
- Plates are painted when first used: the first frame of a new plate costs a moment (rendering is unaffected).
