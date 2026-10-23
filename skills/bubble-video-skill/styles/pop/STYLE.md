# Style: pop art (波普艺术, `pop`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`, `templates/…`) are relative to bubble-video-skill's `promo/` folder.

> The product becomes a 1960s comic: thick black outlines, Ben-Day dots, flat yellow / red / blue, panel-by-panel storyboards; feature names are sound words in burst boxes, the dialogue in the UI becomes speech bubbles, the same picture in four colourways is lined up into a wall (Warhol), and transitions are dots growing until they cover the frame.
> References (learn the grammar only): Lichtenstein's dots and speech balloons, Warhol's silkscreen repetition, the panels and sound words of 1960s American comics, the printing flaws of the time (misregistered colours). Never copy any work's imagery, characters or composition.

Runtime: `runtime/pop.js` (`PROMO.pop(F)`), loaded after `promo.js`. New project: `node scripts/new.mjs <dir> --style pop` (a starting point with fonts, skeleton, sound and music in place).

## 1. When to use

- Young, playful consumer products, social, games, AI assistants / chat products (dialogue in the UI is naturally comic dialogue), brands with a mascot or characters.
- Fits best when the product's story is "back and forth" (question → answer, request → done): panel-by-panel storyboards tell it clearly.
- Not a good fit: products that need to feel serious, restrained or premium (finance, healthcare, enterprise security), and products with no dialogue or characters, only data (use op art or the default style).

## 2. What it is (and isn't)

- **A printed comic**: everything has a thick black outline and a hard shadow to the bottom right (not a soft drop shadow); shading uses dots, not gradients.
- **Panels tell the story**: the frame is a comic page, one action per panel; the camera moves between panels, or panels slide in one by one.
- **Sound is drawn**: important actions get a sound word (POW! / ZAP! / NEW! / DONE!), and the word itself is the picture.
- **Repetition and colour swaps**: the same thing (icon, screenshot, avatar) in several colourways laid out in a grid — the product being "everywhere", "many of them".
- **Printed, not drawn on a screen**: colour fills offset a few px from the black line (misregistration, which `K.panel` does by default), an old-paper texture over the whole frame (`K.print()`), dialogue in a comic hand-lettering face. A clean digital look is the opposite of this style.

**It is not**: flat illustration (no thick black lines, no dots), cyberpunk neon, modern "gradient + frosted glass". No gradients, no blur, no glow.

## 3. Color
- **Brand colour**: `film({ brand })` / `P.kit.brand('pop', { brand })` → the brand colour replaces the closest primary (pushed to printing-primary saturation); the second scene's ground is that colour, and so is big text on a yellow ground. Hand-written: `PROMO.pop(F, kit)`.

- **Ground**: yellow (#FFE14D) or paper (#FFF8E7), with slightly darker dots of the same hue.
- **Four primaries + black**: yellow #FFE14D, red #E8312A, blue #1E5BD6, pink #FF5FA2 (plus cyan #2CC6E8 for overprints). At most three main colours per frame; the rest is black and paper.
- **Brand colour**: use the brand's main colour as one of the "primaries", saturated and flat; if the brand is black and white (many tech products), let black carry the brand and use the primaries for grounds and burst boxes.
- Screenshots, photos: use `K.halftone` (one-colour dots) or `K.posterize` (three- or four-colour silkscreen); don't drop colour photos in as they are.

## 4. Type

- **Sound words / big titles**: `Bangers` (comic lettering, OFL), thick outline + hard shadow, optionally with misregistration (`misreg`). Tilt the text a little (-4° to -8°), never upright.
- **Dialogue**: comic hand lettering, upper case, bold (`Comic Neue` Bold, OFL) — the default in `K.bubble`; only text that already exists in the product's UI (buttons, menus) uses the product font.
- **Captions / headings**: a heavier sans (`Archivo Black` for headings, the product font for UI).
- **Caption boxes** (yellow strips): upper-case comic lettering in a narrative voice like "MEANWHILE…"; the content must be findable in brief.md.
- Readable on a phone: sound words are big by nature; bubble text at least 40 (landscape) / 32 (portrait), see the table in references/structure.md.

## 5. Motion

- **Bounce**: comics allow exaggeration — appear with `K.E.pop` (about 20% overshoot), then wobble twice after landing (two frames per beat, a 12fps feel).
- **Slam**: big text slams from 1.7× to 1× (`K.word`'s slam); burst boxes pop from 0 to 1 while turning 25°.
- **One per beat**: sound words, panels and colour-swap grids all land on the beat; don't drag in between.
- **The background never stops**: rays turn slowly (`K.bg`'s rays), speed-line starts keep stretching and shrinking, dots in panels drift slowly — the frame never goes still.
- **Alive after landing**: bubbles float gently, burst boxes sway slowly, big text bobs lightly — the components do this themselves; give your own characters a breath (scale ±3%) and a little bounce when they talk.
- **The secret of smoothness**: every move has "anticipation → action → follow-through" (panels slide in and settle on a spring, turning from tilted to straight at the same time); move the camera between panels with `K.read` (cubicInOut, about 0.5 s), not hard cuts; overlap two moves by half a beat rather than waiting for the first to stop completely.

## 6. Camera and transitions

| Technique | Says | How |
|---|---|---|
| One comic page, the camera reads it panel by panel | the steps of a flow, before and after | `K.page({ layout: 'row3' / 'big+2' / … })` + `K.read(cam, panels, [[time, panel, zoom]…])`: push into the first panel, pan to the second… finally `'all'` pulls back to the whole page |
| Panel slides in | the next shot, the next thing | `K.panel({ enter: 'left' / 'right' / 'top' / 'bottom' })` |
| Panel pops out | sudden appearance, surprise | `K.panel({ enter: 'pop' })` |
| Push into a panel | see this panel's detail | `PROMO.camera` push-in (panels placed in cam.rig) |
| Dot transition | new page / new chapter | `K.dotWipe({ at, dur })`, change scenes at `at + dur/2` |
| Speed lines | rush, fast, sudden | `K.speed` behind the subject (line starts keep stretching and shrinking; don't make them a frame-by-frame flicker — the final check flags the jumps, and it's hard on the eyes) |

## 7. Sound

- Material: **comic sound effects** — slam (pow: a low thump + a noise crack), laser (zap), spring (boing), pop, wind (whoosh), typing (key). Playful and exaggerated is fine.
- Types the components emit: `pow` (big text, burst boxes), `pop` (bubbles, popping panels), `whoosh` (sliding panels, caption boxes, dot transitions). The sound.js created by `--style pop` already has them.
- Music: 1960s pop / surf rock / brass: around 128 BPM, short brass chords, a bouncing bass, claps and snare on 2 and 4. On the beat a sound word slams down, the music can drop out (`F.section`'s `gap`).

## 8. Signature moves (pick per product)

- **Burst-box sound words**: feature names, results and numbers go in burst boxes, one slammed per beat. *For*: openings, feature lists, "done". (`K.burst`)
- **Speech bubbles**: dialogue that already exists in the product (chat, notifications, AI replies) becomes comic dialogue; the bubble grows out of the speaker and the text types out letter by letter. *For*: chat, AI assistants, collaboration, customer service. (`K.bubble`, `typing`)
- **Panel storytelling**: a flow split into three or four panels, one step per panel, sliding in one after another (like reading a comic). *For*: getting-started steps, "from question to done". (`K.panel`)
- **Caption boxes**: yellow strips for time, place, turns — "MEANWHILE…", "7:28 AM", "ONE WEEK LATER". *For*: time passing, several characters doing things at once. (`K.caption`)
- **Warhol wall**: the same icon / avatar / screenshot in four colourways laid out 2×2 or 3×3, one cell lighting up per beat. *For*: "many", "everyone", "works everywhere". (`K.warhol`, or lay out the grid yourself)
- **Growing-dot transition**: the frame is eaten by red dots, which then give back the next page. (`K.dotWipe`)
- **Speed lines + big text**: the subject bursts out with radial speed lines behind it. *For*: fast, instant, launch. (`K.speed` + `K.word`)
- **One comic page, the camera reads it panel by panel**: three panels tell a whole flow; the camera pushes from the first panel to the last, then pulls back to the whole page. This is the difference between "a comic" and "a video with comic elements". (`K.page` + `K.read`)
- **Characters act**: on getting a task, a "!" and surprise lines pop above the head; while working, sweat drops and motion lines behind; when done, eyes squint into arcs with sparkles around. (`K.emote`; the character's own squint and blink are drawn in the project)
- **Comic-cover ending**: the last page is a comic book cover — masthead title, issue box (#1), the heroes posing, slogan and URL at the bottom. (`K.cover`; the issue number is creative copy, put it under "Copy" in the brief)

**Telling information (no boxes and arrows)**: step by step = panel after panel, said in speech bubbles, the key step a shout bubble + sparkle; comparison = two panels facing off; numbers = burst boxes, bigger number, bigger box; real UI = a close-up panel. (`promo/references/kit.md`, the section on info cues)

## 9. Pitfalls and self-check

- **Too busy**: dots, rays, speed lines and misregistration all on at once is noisy. Only one background effect per frame (dots **or** rays); speed lines only for the moment of the rush.
- **Outline and shadow on all text**: only big text and sound words get them; text in bubbles and captions is just clean and bold, otherwise it's hard to read.
- **Upright text, upright panels**: the comic feel comes from a slight tilt (panels ±2°, big text -4° to -8°). All upright looks like a slide deck.
- **Colour screenshots dropped in as they are**: they clash with the flat colour. `halftone` / `posterize` first, or redraw the UI in code the comic way (thick lines, flat colour, dot shading).
- **Too many burst boxes in a row**: three at most, with quiet panels in between (bubbles, captions), otherwise the sound is all "slam".
- **Bubble tails**: must point at whatever is speaking (avatar, button, character); pointing at empty space looks messy.
- **halftone / posterize are computed at build time**: `await` them; large images are slow (scaled to 1400 / 900 wide by default).

## 10. Variation

- Structure: **one comic page** (3–6 panels, the camera pushing through panel by panel); **comic magazine** (one feature per page, dot transitions turning pages); **burst-box list** (one sound word + one picture per beat); **superhero origin** (the product is the hero: "An ordinary Monday… until—").
- Openings: a big word slams down; a "MEANWHILE…" caption box; a speech bubble suddenly pops up.
- Endings: a comic cover (`K.cover`); the logo in a burst box; the last cell of a Warhol wall is the logo; a "TO BE CONTINUED…" caption box + URL.

## 11. API quick reference

```js
const K = PROMO.pop(F, { palette: { yellow, red, blue, pink, cyan, black, paper }, line: 7, comic: 'Bangers', head: '"Archivo Black"' });
K.bg(F.layer('', 0), { color: K.c.yellow, rays: { color: 'rgba(255,255,255,.35)', n: 18, speed: 4 }, dots: { color: 'rgba(232,49,42,.22)' } });
const p = K.panel(parent, { x, y, w, h, at, until, enter: 'left', bg: '#fff', dots: { color }, rot: -1.5, misreg: 5 });   // content goes in p.inner; p.rect is its position
const ps = K.page(cam.rig, { x, y, w, h, layout: 'row3', at, every: F.B, panels: [{ bg }, { bg }, { bg }] });
K.read(cam, ps, [[t1, 0, 1.6], [t2, 1, 1.6], [t3, 2, 1.6], [t4, 'all']]);
K.print({ opacity: 0.6, age: 0.18 });                  // old-paper texture, on top of everything
K.emote(parent, { at, until, x, y, kind: '!' | '?' | 'surprise' | 'sweat' | 'sparkle' | 'heart' | 'motion', size: 120 });
K.cover(parent, { at, title: 'BRAND', issue: '#1', kicker, tagline, url, band: K.c.red, bg: K.c.yellow, art: (area, w, h, t) => { … } });
K.word(parent, { at, until, text: 'NEW!', x, y, size: 200, color: K.c.red, misreg: 1, enter: 'slam' | 'pop' | 'letters', rot: -6 });
K.burst(parent, { at, until, text: 'POW!', x, y, r: 220, fill: K.c.yellow, textColor: K.c.red });
K.bubble(parent, { at, until, text, x, y, w, tail: [x, y], kind: 'speech' | 'thought' | 'shout', typing: 0.8, size: 40 });
K.caption(parent, { at, until, text: 'Meanwhile…', x, y });
K.speed(parent, { at, until, cx, cy });
K.dotWipe({ at, dur: 0.7, color: K.c.red });           // returns the moment of full cover
const url = await K.halftone('shots/x.jpg', { ink: K.c.blue, paper: K.c.paper, cell: 9 });
const url2 = await K.posterize('shots/x.jpg', { colors: [K.ink, K.c.pink, K.c.yellow] });
await K.warhol(parent, { src, at, x, y, w, h, cols: 2, rows: 2, palettes });
K.dots(colour, dotSize, spacing) → CSS background; K.letter({ size, misreg }) → comic lettering outline + shadow CSS; K.misreg(k) → misregistration text-shadow; K.E.pop → the comic bounce
```
Positions, widths and heights are frame px (convert design sizes with `F.px()`); things like `size` (font size) and `r` (burst-box radius) are design sizes, converted inside the component.

Shared interface (`runtime/kit.js`, used by the quick version and future shared moves): `word` = `K.word`, `line` = `K.caption` (upper-case comic lettering, automatically scaled 1.3×), `card` / `shot` = `K.panel`, `accent` = `K.speed` + `K.emote` sparkle, `wipe` = `K.dotWipe`, `end` = `K.cover`.

In explainers (following the narration, with captions): `node explainer/scripts/new.mjs <dir> --style pop` (path from the skill folder) creates a narration-paced project; pictures use `PROMO.film({ format: 'explain' })` and appear on the narration's lines and words (`promo/references/kit.md`, "跟着旁白走" / follow the narration); or hand-write it: `F.T` is the narration timeline. No formulas, characters or overview map — for problem walkthroughs and stories acted out by characters, use whiteboard / ink-wash.

## 12. Not supported yet

- Stories about named people: this style has no figures; use the approach in the last section of `../CHARACTERS.md` (name cards with fixed colours and positions, versus for face-offs), or recommend shadow puppetry / ink-wash / whiteboard.
- No ready-made library of figures / characters: characters come from the product's own assets or are drawn in the project (grok-pop's Bot was drawn from the mascot SVG on the page).
- Screenshots that must stay as they are go into comic panels; `K.halftone` / `K.posterize` / `K.warhol` alter the image, so use them only on decorative images like photos and avatars, never on UI that has to be read.
