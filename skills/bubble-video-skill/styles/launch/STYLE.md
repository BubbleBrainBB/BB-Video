# Style: launch motion (发布会动效) (launch, the default)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`, `templates/…`) are relative to the `promo/` folder of bubble-video-skill.

> The kind of film shown on the big screen at a product launch: the background follows the product (light, dark or brand colour), the product name and its core verbs slam down one per beat (with a little red/blue misregistration), headlines rise word by word from below, the real web page flies in tilted inside a browser window, the camera pushes in on a feature, whip pans, white flashes and light leaks sweep through, and finally the logo writes itself in one stroke.
> Reference (grammar only): opening films and product-page motion from tech-company launches. Don't copy any one company's visuals or fonts.

Runtime: the components are all in `runtime/promo.js` (`PROMO.slam`, `PROMO.headline`, `PROMO.browser`…, full list in `references/motion.md`); nothing else needs loading. New project: `node scripts/new.mjs <dir>` (it's the default when `--style` is omitted; `--style launch` also works).

## 1. What products it suits
- Most software, SaaS, AI tools, developer tools; launches that should feel "new, fast, official".
- Best when you have good real UI (web pages, app screenshots): browser windows, camera push-ins and cursor clicks are its main tools.
- Less suited: products that want warmth, a handmade feel or an artistic feel (use origami, cutout, pop, op).

## 2. Its essence, and what it isn't
- **Essence**: rhythm and real UI. Few words, big, on the beat; the UI is real, and the camera takes the viewer to the one spot that matters most.
- **Not**: PowerPoint page-flipping (static text page after page), template-looking piles of particles and light effects, showing off unrelated to the product.

## 3. Colour
- **Brand colour**: `film({ brand })` / `P.kit.brand('launch', { brand, ground })` → the brand colour becomes the accent, the ground is chosen by `ground`; for the brand colour filling the whole ground, write `ground: 'brand'`.
A launch film doesn't mean a dark stage. The ground is **set by the product**; there are three grounds (`ground`), and the components (cards, spotlight, light leaks, white flash / dim-down, montage stage) all switch with it automatically:
| Ground | When to use it | Colours |
|---|---|---|
| `light` (default) | the product itself has a light UI (most SaaS, docs, office, e-commerce); you want clean, bright, trustworthy | warm white ground `#F6F5F1` + near-black text + brand accent; cards are white with soft shadows, spotlight and light leaks are a soft glow of the accent |
| `dark` | the product itself has a dark UI (developer tools, terminals, creative / media, games); you want a "night show", cinematic feel | near-black ground `#0F0E0C` + warm white text + accent; the spotlight is white light |
| `brand` | the brand colour itself is the signature (a colour recognised at a glance); the film is short and must be memorable | the brand colour as ground, text automatically white or near-black by brightness, accent derived from the brand colour |

- **Take colours from the product**: the site's CSS (`--primary`, button colour, background colour), the app UI, the logo. Note them in `research/` while researching, and write one line in `brief.md`: "颜色：ground light, accent #xxxxxx (from: the site's buttons)". Don't give every film a dark ground + one warm gold — that's "this skill's flavour", not the product's.
- When the screenshot's background is close to the film's ground (light UI + light ground), the window is separated by its shadow and white card; no border needed.
- Quick version: `PROMO.film({ style: 'launch', brand: '#brandcolour', ground: 'light' | 'dark' | 'brand' })` (no ground = light). Hand-written: `const { theme } = PROMO.kit.brand('launch', { brand, ground })`, then pass theme to `compose({ theme })`.
- Hand-written films: take ground and text colours from `F.theme` (`th.bg` / `th.fg` / `th.muted` / `th.accent`); lights, glows, flashes and shadows you write yourself must also follow the ground — a dark ground gets white light and heavy shadows, a light ground gets a soft glow of the accent, light shadows and flashes in the accent; don't hard-code white light meant for dark grounds. Changing the ground changes only colours, never the moves.
- Use the accent only on keywords, numbers and buttons. `--check` measures the contrast of each piece of text against the ground beneath it (warns below 2.5:1); always run it after changing the ground.

## 4. Type
- Impact words in a heavy sans-serif (Inter 800 by default), one word per beat; headlines and subheads can use a serif (`fonts.serif`).
- Must be readable on a phone (the size table in `references/structure.md`); impact words that are too wide shrink automatically.

## 5. Motion
- Impact words: scale from 1.3× to 1×, with the red/blue misregistration settling quickly (`PROMO.slam`).
- Headlines rise word by word from below and leave upward (`PROMO.headline`).
- Numbers: odometer rolling digit by digit (`PROMO.odometer`), counting (`PROMO.counter`).
- In the UI: cursor moves and clicks (`PROMO.cursor`), typing in an input box (`PROMO.field`: text sits on the box's centre line and grows upward when there's more), typing letter by letter elsewhere (`PROMO.typing`).
- Settle with a spring (`E.spring`, about 4% overshoot); fast moves use expo easing.

## 6. Camera and transitions
- The default transition is a dim-down: it covers **before** the beat (a dark ground dims to black, a light ground dims to paper colour — a full black frame is jarring in a light film), and **the frame on the beat is already the new picture**: the downbeat lands on the new picture, not on a frame of solid colour. Things in the new picture should ideally start moving just before the beat (already moving on the beat). Full-screen white flashes are kept only for the cut into the drop — the quick version arranges this automatically; hand-written, it flashes only with `S.wipe({ cover, flash: true })`. Do the same when hand-writing your own transitions.
- In the quick version, the drop's hit and sudden stop land on the beat where the scene's first word appears (not on the empty beat after the transition).
- Camera: `PROMO.camera` pushes in on a feature and pulls back to the whole view; `breathe` keeps a held frame gently moving.
- Transitions: whip pan (`PROMO.whip`), circular iris opening (`PROMO.iris`), shared element (`PROMO.morph`), white flash (`PROMO.flash`), light leak sweep (`PROMO.leak`). Transitions last 0.5–0.9 s and land at the start of a bar.

## 7. Sound
- Score: the default electronic / pop beat (`score.js`, `references/music.md`), with a hit at the start of sections.
- Sound effects: `impact` `boom` `whoosh` `riser` `click` `type` `tick` `pop` `shutter` (`references/sound.md`); components add their matching effects automatically.

## 8. Moves unique to this medium (pick by product)
- **UI demo (push in on the page inside a window)**: `PROMO.screen` — the window stays put, the camera pushes in on buttons, numbers and results on the page one at a time, with a spotlight + cursor clicks; in the quick version write `annotate` + `zoom: true`. The most used shot in real product demos.
- **Impact-word opening**: the product's few core verbs slam down one per beat. *Suits*: any product's opening. (`PROMO.slam`)
- **Product name decoded from gibberish**. *Suits*: AI, developer tools. (`PROMO.decode`)
- **Browser window flies in tilted + camera push-in**. *Suits*: web product reveals, feature demos. (`PROMO.browser` + `PROMO.camera`)
- **Full-page long image scrolling fast / image carousel / vertical-strip collage fly-through**. *Suits*: products with lots of content (portfolio walls, template libraries). (Montage, `references/motion.md`)
- **White flash, light leak**. *Suits*: hits between sections. (`PROMO.flash` / `PROMO.leak`)

**Telling information (without boxes and arrows)**: step after step = the camera trucks along the stage, one big word per step; contrast = the dark side against the bright side, a light leak sweeping across; numbers = numbers rolling into place; real UI = a spotlight, everything else dims and the camera pushes in. ("Information cues" in `promo/references/kit.md`)

## 9. Common pitfalls and self-check
- A white flash on every transition: keep flashes for the heaviest one or two moments.
- UI screenshots too small: unreadable on a phone; push in or add a big headline (`--check` reports "手机上读不清" (unreadable on a phone)).
- Too many impact words: three or four words are enough for the opening; real UI must follow.
- Self-check per `references/review.md`.

## 10. Room for variation
- Ground: light / dark / brand colour (section 3). Whoever makes the film picks **one** for the product and delivers one film; don't deliver several ground versions for the user to choose from.
- Type: heavy sans-serif ↔ serif headlines; switching changes the whole character.
- Rhythm: fast cuts (a word every half beat, slot machine) ↔ steady (one per beat, more camera push-ins).
- Pick one montage: long-image scroll / carousel / vertical strips.

## 11. API quick reference
All components, parameters and key points in `references/motion.md` (text, UI, transitions, montage and endings, animation libraries).

Shared API (`runtime/kit.js`, used by the quick version and future shared moves): `word` = `PROMO.slam`, `line` = `PROMO.headline` (rises word by word), `card` = translucent glass panel, `shot` = a `PROMO.browser` window (floats up, tilted back), `accent` = `PROMO.leak` light leak, `wipe` = alternating white flash / dim-down, `end` = `PROMO.endcard`.

In an explainer (following narration, with captions): `node explainer/scripts/new.mjs <dir> --style launch` (path from the skill folder) creates a project that follows the narration; the picture uses `PROMO.film({ format: 'explain' })` so things appear at the narration's lines and words (`promo/references/kit.md`, "Following the voiceover"), or hand-write it: `F.T` is the narration timeline. No formulas, characters or overview diagrams — for problem solving and stories acted out by characters use whiteboard / ink.

## 12. Not supported yet
- Stories about named historical people: this style has no characters; follow the last section of `../CHARACTERS.md` (name cards with fixed colours and positions, versus for standoffs), or recommend shadow puppetry / ink / whiteboard.
- No material of its own: it is "clean motion"; for a material feel use another style.
