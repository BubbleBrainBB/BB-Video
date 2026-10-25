# Suspense mystery (悬疑探秘, `mystery`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

A deadpan, mock-serious "science programme" about everyday things. Two looks share one runtime:

**TV look** (`look: 'tv'`, the default) — one frame: a 4:3 old-TV picture (rounded corners, a tube vignette, faint scan lines, light scratches and dust) on saturated TV blue:
- a title card in heavy white serif with a black outline, the key words in red, written on character by character ("如何判断朋友 / 是不是<红>……</红>");
- numbered points in brush script ("一.注意力被劫持"), faint at first, then written on;
- each point acted out by big rubber-hose cartoon stickers (a brain with a face, a light-bulb person with white gloves scratching its head, a phone, an alarm clock, a battery at 19 %, a power bank), flying or popping in;
- a full-screen chat screen (white, green bubbles, cartoon avatars, "5分钟后") that plays the symptom out;
- a storm of big pale words around the subject ("我都行 / 随便 / 你帮我 …");
- serif captions with a black outline inside the picture, a station mark in the corner, a crawling "虚构内容 仅供娱乐" line — and at the end the signal is cut to a **test card** and its tone.
- The copy is a clinical checklist of "symptoms" that everyone has. Nobody is diagnosed; the viewer recognises themself ("这不是我吗"). No reveal, no explanation: it simply stops.

**Case look** (`look: 'case'`) — a late-night investigation of an everyday thing, played straight: blue-black fog and slow pushes, a question card on a stinger, guesses struck out and stamped 排除, reconstructions (情景再现) in a cold teal grade with a handheld wobble, an evidence board with red string and a magnifier, surveillance and night vision, a flashlight, a countdown, a replayed tape — then a plain, sourced answer in warm daylight.

Runtime: `runtime/mystery.js` (`PROMO.mystery(F, opt)`). New project:
- explainer (narrated, the usual use): `node explainer/scripts/new.mjs <dir> --style mystery`;
- promo: `node scripts/new.mjs <dir> --style mystery`.

Starter pages: `styles/mystery/explain.html` (narrated, TV look, one block per line) and `styles/mystery/index.html` (promo, TV look on the beat). The case look's pieces are listed below and work in either.

## 0. Safety
- **It is a joke, and says so.** The TV look shows "虚构内容 仅供娱乐" for the whole film (`disclaimer`); the copy describes ordinary habits in clinical words — never real conditions as insults, never a real or identifiable person, never a group of people as the target. A title like "是不是轻微智障" is the genre's edge: keep the target "your friend / you", keep the symptoms harmless and universal.
- **No real programme.** Emulate only the grammar of the genre: never a real show's name (or a pun on it), title sequence, theme music, logo, host likeness or channel marks. The show is fictional (the starter: "日常谜案"); its mark sits in the corner.
- **Pictures are drawn in code.** Cartoon stickers, never AI images and never real photos passed off as anything. No copyrighted characters; chat screens and phones are generic (no real app's logo or interface).
- **Facts, when there are any.** The TV look's checklist makes no claims, so it needs no sources — but a number or a fact stated as true still goes in brief.md with its source. The case look's reveal is real and sourced (end roll), and its staged story carries "情景再现 · 示意".

## 1. When to use
- **TV look**: "如何判断你的朋友是不是……" checklists of everyday habits (phone addiction, choosing lunch, procrastination, "我就看一集"), mock-scientific explainers of relatable behaviour, playful product promos ("如何判断你的团队需要 X") — short (30–45 s), fast, made to be recognised and shared.
- **Case look**: everyday phenomena with a sensible answer ("why does …"), myth-busting (rule out the wrong explanations, then the right one), whodunit promos where the product is the answer.
- Not for: real illness, tragedy, crime or anything where the joke would hurt someone; dense tutorials.

## 2. What it is (and isn't)
- **Essence**: the gap between the tone and the subject. The voice and the type are official and grave; the subject is lunch, a phone, a red packet. Nobody winks.
- **TV look is not** a meme compilation (no reaction GIFs, no stock clips) nor a real diagnosis. **Case look is not** horror (no gore, no jump scares).
- Each symptom / doubt gets one concrete, trivial example acted out (a sticker scene, a chat, a word storm) — that example is the punchline.

## 3. Color
- **TV look**: TV blue `#1a23d8` (lighter at the centre, darker at the tube's edge), title white with a black outline, key words red `#ff2b2b`, word storm pale lavender `rgba(214,220,255,.86)`, chat screen `#ededed` with white and green `#95ec69` bubbles, test card grey with colour bars.
- **Stickers**: flat fills with a thick ink outline `#1d1b26`, one shade and one highlight; the bulb `#f7b52c` with a brass cap `#c98a3c`, the brain `#ef7a72` on an amber shirt, white gloves, red alarm clock `#d6453a`.
- **Case look**: blue-black `#0b0f17` and fog, amber `#f2c14e`, alarm red `#e0453a`; reconstruction teal; cork, manila and file paper on the board; warm daylight `#fff1d2` for the truth.

## 4. Type
- Titles, stamps, the word storm, TV captions: Noto Serif SC 700 / 900 (OFL), with a black outline in the TV look.
- Numbered points: Ma Shan Zheng (OFL), a brush script.
- Chat bubbles, files, labels: Noto Sans SC 400–900 (OFL). Case look extras: ZCOOL KuaiLe (sticky notes), Share Tech Mono (HUD).
- Sizes (design units: the TV picture is 1440 × 1080; the case look's frame is 1920 × 1080 or 1080 × 1920): title ≤ 150, points ≤ 116, word storm 80–150, chat 72, captions 50.
- Text is written on character by character (title, points), slammed (storm words, stamps), or fades up.

## 5. Motion
- Stickers **fly in** (a curve from off-picture with a twist), **pop** (backOut), **zoom** (from 1.3×) or **dim in** (a faint ghost that firms up, like the brain). People blink, look, switch faces and arm poses; the bulb scratches its head, sweats, hugs.
- The camera creeps: every shot a small push in or out (`push`).
- A phone **buzzes** (shakes with buzz marks); the clock's hands **race** (`spin`); the battery blinks at 19 %.
- Chat messages pop in and push the thread up; storm words slam in one after another.
- Case look: handheld wobble on reconstructions, jolts on stingers, strings and marker strokes drawing on, the magnifier springing open.

## 6. Camera and transitions
- **Hard cuts**, one shot per line or phrase (`R.shot(a, b)`). The points are the chapter marks (`R.point` on a plain blue shot).
- The end is **the signal cut to a test card** (`R.testcard`): the music stops dead there (`F.musicCue(t, 'off')`, which the test card registers) and only the tone is left.
- `R.flash(at)` a camera flash, `R.dip(a, b)` a dip to black; case look: grades as chapter marks, the truth's bloom.

## 7. Sound
- Music (`styles/mystery/score.js`): a deadpan old-TV science-programme bed in F major / D minor — low string drone, a sneaky spiccato figure, a music box, a heartbeat kick when it tightens (sections `cold`, `probe`, `tension`); the case look's truth turns to F major (`truth`, `end`: bright piano, bouncing bass, glockenspiel). The test card cuts it off.
- Voice: TV look — a flat, matter-of-fact female narrator, `zh-CN-XiaoxiaoNeural` (`en-US-AriaNeural`), +4 %, through `"voice_fx": "doc"` (even, close; it also lets the film reach its loudness target). `explain.json` sets these. Case look: a grave male narrator suits better (`zh-CN-YunyangNeural`, -6 %, pitch -4 Hz) — set it in script.json.
- Sound effects (`sound.js`): `brush` (a point written on), `type` (the title), `pop` / `whoosh` (stickers), `msg` (chat), `buzz` (a vibrating phone), `tone` (the test card); case look: `sting`, `heart`, `shutter`, `paper`, `pin`, `string`, `pen`, `stamp`, `zoom`, `click`, `rewind`, `tick`, `static`, `open`, `resolve`, `boom`.

## 8. Signature moves
- **TV look**: the outlined title with its red words; the brush-script point; the sticker scene (a character + two or three objects flying in around it); the chat that plays the symptom out ("5分钟后 / 哦"); the word storm of what the friend keeps saying; the crawl "虚构内容 仅供娱乐"; the test card.
- **Case look**: the question card; the struck-out theory; the evidence board; the magnifier; 情景再现; surveillance / night vision and the flashlight; the tape replay; the witness with a mosaic face; the truth in daylight with reason cards and sourced files; case closed.

## 9. Props and people
- `const S = R.svg(L)` gives an SVG layer in design units; `R.prop(S, name, { x, y, s, rot, a, b, enter, from, move, bob, tape, sfx })` draws a prop there. `enter`: `pop` (default), `fly` (from `from: [dx, dy]`), `zoom`, `dim`, `fade`, `none`. `move: [[t, { x, y, s, rot }, ease]…]` moves it; `tape: T` runs it on a replay tape. `R.el(tag, attrs, parent)` draws your own SVG.
- **friend** (a person): `body` — `bean`, `bulb` (an upside-down light bulb with a brass cap) or `brain` (a brain head on a shirt); `color`, `shirt`; `face` (`calm smile grin sweat shock sly suspicious sad think blank`, or `[[t, face]…]`), `look` (`[dx, dy]` or `[[t, dx, dy]…]`), `arms` (`down wave up hold hug shrug point think scratch ok phone hips`, or `[[t, pose]…]`), `gloves` (white rubber-hose gloves; on for bulb and brain), `eyes: 'toon'`, `wear` (`tie glasses detective party hood`), `faceY`, `seed`. `h.hand` is the right hand: `R.prop(h.hand, 'phone', { s: .2 })`.
- **phone**: `lock: { time, date, notes }`, a chat (`title`, `messages`, `typing`), or `screen: (g, k) => {}` to draw your own screen (x −144…144, y −290…290); `wake` lights it, `buzz: [[t0, t1]]` vibrates it; `h.box(i)` + `h.to(x, y)` place marks on a message.
- **clock** (`time: 'hh:mm'`, `spin` turns per second), **battery** (`level`, `label`, blinks below 20 %), **powerbank** (`face`), **socket**, **bike**, **envelope** (红包: `amount`, `open`), **calendar** (`mode: 'day' | 'month'`), **scale** (`load`, `labels`), **bubble** (`text`, `think`), **lantern**, **cake**, **gift**, **heart**, **box**, **qmark**, **coin**, **sparkle**, **magnifier**. Add your own: `R.props.name = (g, o, k) => ({ info: 'shape' })` — draw into `g` with `R.el`, animate with `k.F.add((t) => …)` on `k.clock(t)`, register text with `k.F.text(el, 'label', text, ...k.win())`.

## 10. Pitfalls and self-check
- **Too much text on screen**: one title, one point, one example per beat; let the captions carry the narration.
- **Small chat text**: keep 3–5 messages per screen; the chat fills the picture (72 units).
- **Storm words over the face**: place them around the subject (`x`, `y`, `v` for vertical); they may overlap each other, not the character's eyes.
- **A mean joke**: the symptoms must be harmless and universal; check the title doesn't target a real group.
- **Silence at the end**: the test card is short (1.5–2.5 s) and has its tone.
- **Case look**: tags on every staged shot, every fact of the reveal in brief.md, characters' colours far apart for the teal grade.
- Self-check per `references/review.md`; `--check` (text, contrast, information, motion), `--sheet` / `--stills`, then the frame check after the render.

## 11. Variation
- The show's mark: invent one per series and keep it.
- The blue can shift (a deeper navy, a cyan TV) with `colors: { blue }`; the bulb and the brain are the regulars, add a recurring character per series.
- Pacing: a 30-second three-point checklist ↔ a 60-second five-point one with two chats.
- Portrait (9:16): the 4:3 picture across the width with the film's title above it (`title`), like a feed; landscape: the picture in the middle with black either side (`gate: 'full'` fills the frame instead).

## 12. API quick reference
```js
const R = PROMO.mystery(F, { look: 'tv' | 'case', gate: 4 / 3 | 'full', brand: { name, en, episode }, title, disclaimer, mark, damage, colors, fonts, captions });
// design units R.RW × R.RH (TV: 1440 × 1080 inside the picture); R.g(v) → px; R.gate is the picture element
const L = R.shot(a, b, { grade: 'blue' | 'paper' | 'plain' | 'studio' | 'rebuild' | 'cctv' | 'night' | 'truth', bg, cut, push: { from, to }, cam, tag, clock, camName, place });
R.title(L, { a, b, lines: ['…', '…<em>red</em>…'], size, per });  R.point(L, { a, b, n: '一', text });
R.chat(L, { a, b, messages: [{ who: 'them' | 'me', text, at } | { kind: 'time', text, at }], avatars: { them: { color, hair, ears, bg }, me: {…} }, size, green });
R.storm(L, { a, b, words: ['…' | { text, x, y, size, v, at }], size, per, color });  R.testcard(L, { a, b, text });
R.cam(L, keys); R.jolt(L, at); R.flash(at); R.dip(a, b); R.text(parent, html, o); R.tag(L, text, o); R.stamp(parent, text, o); R.lower(L, o);
// case look
R.card(L, o); R.question(L, o); R.theory(L, { a, b, n, text, out: { text, at }, note }); const B = R.board(L, o); R.file(L, o); R.mark(L, o);
R.lens(L, o); R.beam(L, o); R.countdown(L, o); const T = R.tape(L, { a }); R.witness(L, o); R.truth(L, o); R.reasons(L, o); R.ident(o); R.end(o);
const S = R.svg(L); R.prop(S, name, { x, y, s, rot, a, b, enter, from, move, bob, tape, sfx, … });  R.props.myProp = (g, o, k) => ({});
```
Times: `a` = in, `b` = out; in a narrated film take them from the narration (`T.start`, `T.end`, `T.word`). The pieces register their own information kinds.

## 13. Not supported yet
- No quick version (`--quick` / `kit.js` adapter): pages are hand-written.
- People glide (`move`, `bob`) — no walk cycle; stickers are vector drawings, not painted illustrations (no paper or halftone print texture yet).
- The word storm places words where you put them (eight default slots); it doesn't avoid the character by itself.
