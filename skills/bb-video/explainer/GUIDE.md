# Explainer workflow (narration-driven)

> Part of **bb-video**: start from `../SKILL.md` (styles, which workflow to use). This file is the workflow for videos with a voiceover: explainers, walkthroughs, stories.

Draw every frame yourself with HTML + SVG (or canvas, for ink-wash), render frame by frame in Chrome, voice it with edge-tts, and assemble with ffmpeg.
Every frame is drawn by the pure function `renderFrame(t)`. **Animation libraries are allowed** (GSAP and its plugins, Three.js, Matter.js, opentype.js, …, loaded from a CDN in `index.html`), but the clock is always ours: build GSAP timelines paused and seek them to `t` inside the frame function, simulate physics up front and read the state at `t`, never let a library run its own clock or rely on its callbacks. The patterns are in `../promo/references/motion.md` ("Animation libraries"); the built-in styles' runtimes don't need any library.

All relative paths in this file are relative to this folder (`bb-video/explainer/`).

## Contents
- `../styles/whiteboard/STYLE.md`: style rules and full API for the hand-drawn whiteboard.
- `../styles/riso/STYLE.md`: style rules and full API for risograph.
- `../styles/ink/STYLE.md`: style rules and full API for ink-wash, including its own figures. **Once a style is chosen, you must read the matching file before writing any drawing code.**
- `../styles/<style>/STYLE.md` for every other style (launch, origami, pop, op, cutout, ascii, shadow, bauhaus, pixel, chat …): they make explainers too — the full, current list of styles is the table in `../SKILL.md`.
- `../styles/TEMPLATE.md`: the outline every STYLE.md follows (all styles live in `../styles/`). Read it before adding a new style.
- `references/modes.md`: how to tell each kind of content (phenomenon, problem, word, concept, allusion / historical story). **You must read the matching section before writing the script.**
- `references/characters.md`: design method, spec parameters and acting principles for cartoon characters (Notion style, whiteboard). **Must be read whenever a character appears in a whiteboard video.** Ink-wash figures are specified in `styles/ink/STYLE.md`.
- `references/review.md`: self-review checklist.
- `scripts/new.mjs` new project · `scripts/tts.py` voiceover and timeline · `scripts/render.mjs` rendering · `scripts/cast.mjs` character model sheets · `scripts/bgm.mjs` background music (synthesized in code) · `scripts/assets.mjs` prepare image / video assets

## Workflow

### 1. Understand the input, settle the content
- **Decide the video's language first**: unless the user says otherwise, it is **the language the user is writing in** (an English request → an English video; a Chinese request → a Chinese video). The topic doesn't change this: a Chinese user asking about an English word gets a Chinese video with English parts; an English user asking about a Chinese allusion gets an English video. The language sets the narration, all on-screen text, chapter titles, the voice and the pacing (see "General: writing narration" in `references/modes.md`).
- Decide the content mode (phenomenon / problem / word / concept / allusion / tutorial / news explainer) and read the matching section of `references/modes.md`.
- **Problem walkthrough**: first solve the problem completely, then verify with Python; write the problem transcription, solution and verification result into the project's `brief.md`. For screenshot problems, have the user confirm the transcription first.
- **Allusion / historical story**: first look up the original source text, separate historical fact from later embellishment (plot added by operas and novels), and write the characters, dates and original quotes into `brief.md`.
- **News explainer / data-driven**: first verify facts and numbers, record sources and dates, and write them into `brief.md`.
- **Pick a style**: the style is the only thing the user chooses. It decides how the video looks, moves and sounds; how the story is told is the content mode above, which you choose from the topic. If the user specified a style, use it; otherwise recommend one by topic:

| Style | Create | Look | Recommended topics |
|---|---|---|---|
| `whiteboard` hand-drawn whiteboard | `new.mjs <dir>` | Drawing on a whiteboard while explaining, infinite canvas + camera moves, cartoon characters allowed | Problem walkthroughs, concept derivations, phenomenon explainers, historical allusions, stories that need characters acting |
| `riso` risograph | `new.mjs <dir> --style riso` | Magazine layouts with spot-color overprint, halftone and ink-layer misregistration; one page per chapter, drum-roll page turns | Everyday trivia, psychology / social topics, news explainers, finance, data comparisons, food tutorials, English vocabulary |
| `ink` ink-wash (水墨) | `new.mjs <dir> --style ink` | One long handscroll on rice paper: brush calligraphy written stroke by stroke, landscapes, classical-painting figures, cinnabar annotations and seals; the camera pans along the scroll between chapters | Historical stories and allusions, classical poetry, idioms, Chinese culture and philosophy, nature and seasons |

  **Every other style makes explainers too** — the current list is the style table in `../SKILL.md` (don't rely on a count here; styles get added). `node scripts/new.mjs videos/<name> --style <style>` creates a narration-paced project for them (same `script.json` → `tts.py` steps); how to build the picture is in `../promo/references/kit.md`, "Following the voiceover" (跟着旁白走).
  **Quick (`PROMO.film`) or hand-written (`PROMO.compose`)?** The skeleton uses `PROMO.film({ format: 'explain' })`: cues (big words, lists, flow / compare / chart / annotate) timed to the narration — right when the explanation is mostly words, lists and charts and you want it fast. When the video has to **show a mechanism happening** (layers moving at different speeds, a thing being assembled, a figure acting a story), hand-write `PROMO.compose` with the style's runtime (`PROMO.bauhaus(F)`, `PROMO.shadow(F)` …) — start from the style's starter page (e.g. `styles/shadow/explain.html`). A showcase film is usually hand-written.

  Risograph does not yet support characters or formulas; ancient history and serious, heavy topics do not suit it. Ink-wash has no formulas (use whiteboard for problem walkthroughs) and suits only light data. If the user asks for a style that is not implemented yet, tell them so plainly.

### 2. Create the project, write the narration and storyboard
**First, the information checklist** (write it at the top of `storyboard.md`, before any narration): the 3–5 things the viewer should know after watching, and for each one its **evidence** (a mechanism, a number, an example, a comparison) and the **visual that carries it** — a labeled diagram, a flow, a comparison, a chart, an annotated screenshot or photo. The narration says it; the picture must *show* something the narration can't (how the parts fit, which is bigger, what happens first). A frame that only repeats a keyword of the narration carries no information.
- Every narration line gets a visual that adds information: a labeled part, a number on a chart, a step in a flow, a circled spot on a photo. Keywords on their own don't count.
- Build up: keep the context on screen and add to it (the diagram grows label by label, the flow lights up step by step) rather than clearing the frame for every line; a frame can hold a title + one visual + a few labels.
- At least one diagram / flow / comparison / chart per key point. On the boards (whiteboard, riso, ink) draw them with the board's own hand. In the promo-born styles use the cues `flow`, `compare`, `chart`, `annotate`, `montage` (`../promo/references/kit.md`): each style draws them in its own language (op lenses, comic panels, cut paper, folded paper, a moving camera), never generic boxes and arrows.
```bash
node scripts/new.mjs videos/<short-english-name>                 # hand-drawn whiteboard
node scripts/new.mjs videos/<short-english-name> --style riso    # risograph
node scripts/new.mjs videos/<short-english-name> --style ink     # ink-wash
node scripts/new.mjs videos/<short-english-name> --lang en       # an English video (default is zh-CN); also ja / ko / fr / de / es, other languages with --voice
```
`--lang` sets the voice, `<html lang>`, and on whiteboard the default handwriting font (`WB.board({ lang })`).
- `script.json`: the narration, one object per line (format below).
- `storyboard.md`: the storyboard; for every line, state exactly what is drawn on screen and where. For whiteboard, first plan the region layout of the whole board and the camera route; for risograph, first plan the layout and color scheme of each page (one page per chapter). For ink-wash, plan the scroll: one section per chapter, each with one focal point (a landscape, a figure, a line of calligraphy), and which transition leads into it.
- **Cover**: in the storyboard, specify the cover's headline, subtitle and key visual (see "Cover" in the matching STYLE.md). `lead_in` in `script.json`: about 1.9 s for whiteboard, about 2.3 s for risograph, about 3.3 s for ink-wash (already set per style when the project is created).
- When characters are needed (whiteboard or ink-wash): follow the shared story rules in `../styles/CHARACTERS.md` (fixed cast called by name, two attributes apart, face to face, relays); design them following `references/characters.md` (whiteboard) or "Figures" in `../styles/ink/STYLE.md` (ink-wash), write them into `characters.js`, and mark each character's entrances, expressions and lines in the storyboard. Render model sheets with `node scripts/cast.mjs videos/<name>`; **new characters must be shown to the user together with their model sheets for confirmation**.

**Show the narration and storyboard to the user** and continue only after they confirm. If the user says "just make it", skip the confirmation.

**When using images or videos** (photos, screenshots, screen recordings, user-provided material): put the original files into the project's `assets/src/` and run
```bash
node scripts/assets.mjs videos/<name>
```
Images are scaled to a suitable size, videos are extracted into frame-by-frame images at their own frame rate, at most 30 fps (an 18 fps film keeps its cadence; the picture is still a pure function of time), and a manifest `assets/manifest.js` is generated. When only a few segments of a long video are used, write `assets/clips.json` (format described at the top of the script; it also sets `fps`, and `grade: "auto"` — one fixed brightness grade per clip so footage from different sources matches). Place assets on screen with `b.photo()` (whiteboard) / `b.image()` (risograph); see "Images and video" in the matching STYLE.md. For copyrighted material, use only what the user provided or is permitted to use.
**When the user has no pictures and the film needs real ones** (news, history, a real product): search licence-clean archive material with `node ../promo/scripts/footage.mjs videos/<name> search "<query>"` (Wikimedia Commons; CC0 / public domain / CC BY by default, BY-SA / NC / ND listed but not fetched). It only lists; **tell the user what you want (title, source, licence, size) and wait for their OK**, then `fetch <n>` (a long video: `--from <s> --dur <s>` takes only that stretch, `--max-height` picks Commons' transcode). Each file gets a sidecar `assets/src/<name>.json` (`{ title, author, licence, date, url }`; write one by hand for material from elsewhere): `assets.mjs` copies it into the manifest as `credit`, and the final render lists every credit in `out/CREDITS.txt` (styles that show pictures register them with `F.credit`). Never AI-generated images presented as real photos.
To use assets in an older project: first run `--update-lib`, then in index.html add `<script src="lib/media.js"></script>` and `<script src="assets/manifest.js"></script>` before `timeline.js`.

### 3. Voiceover and timeline
```bash
python3 scripts/tts.py videos/<name>
```
Produces `audio/narration.m4a`, `timeline.json` and `timeline.js` (with the timing of every line and every word).
Re-run it whenever the narration changes; unchanged lines are cached and not re-synthesized.

### 4. Draw the visuals, one shot at a time
Edit `index.html` and write the code in `build` in storyboard order. **Take all times from the timeline** (`T.start`, `T.word`, etc.); never hard-code seconds.
After every 2–3 shots, check with screenshots:
```bash
node scripts/render.mjs videos/<name> --stills 5.2,9.8
```
Then view `review/still-*.png` with Read.

### 5. Full self-review (three steps, none may be skipped)
```bash
node scripts/render.mjs videos/<name> --check            # ① lint check
node scripts/render.mjs videos/<name> --sheet            # ② static overview
node scripts/render.mjs videos/<name> --strip 14,17      # ③ animation process
```
1. **Lint check**: finds problems that only show up "in motion", e.g. erased before it finished drawing, held too briefly after drawing, drawn outside the camera, covering the captions, moving the camera while drawing, overlapping elements, a character pointing off-screen, narration lines whose frame only shows words (no drawing, diagram, chart, photo or character; see "information" in `references/review.md`). The report includes times and `index.html` line numbers. It also looks up every piece of on-screen text in `brief.md` (fact check); layout numbers such as `01`–`99` and ①② are skipped, and text you made up on purpose (a sample value, a label) takes `noFact: true`. **All errors must be fixed; every warning must be checked one by one.**
2. **Static overview**: the frame at the end of each narration line, for checking the layout.
3. **Animation process**: the overview only shows the "result", not the "process". For every time flagged by the lint check, and for every erase, camera move and character action, view 8 consecutive frames with `--strip start,end`.

Go through `references/review.md` item by item, fixing things until everything passes.

### 6. Render the final video
```bash
node scripts/render.mjs videos/<name>            # → out/video.mp4 (1080p 30fps); refuses to render if the lint check has errors
node scripts/render.mjs videos/<name> --draft    # fast half-resolution version, for checking pacing first
```
Background music is generated and mixed in automatically according to `bgm` in script.json; turn it off temporarily with `--no-bgm`, switch style with `--bgm-style calm`, use your own music file with `--bgm file --bgm-volume 0.1`.
The renderer is shared with promo videos (`../core/scripts/render.mjs`; `scripts/render.mjs` forwards to it), so these also work here: `--audio` (sound only → out/audio.wav), `--remux` (rebuild the sound onto the finished video without re-rendering the picture), `--review` (contact sheet, transitions, a 0.5 s report), `--aspect 9:16` (a portrait 1080×1920 version: the board, cover, chapter bar and captions adapt by themselves; your own coordinates need a portrait value — write them with `EV.L(landscape, portrait)` and follow the "Portrait" part of the style's STYLE.md; `--check --aspect 9:16` reports anything off-frame), `--blur 6` (motion blur). The mix is loudness-normalized (target -16 LUFS, with a peak limiter that never takes more than 3 dB off the voice, so very dynamic voices stop a little short of the target instead of being squashed), and the final video gets a frame check for sudden jumps, one-frame flashes and dead air where nobody is speaking (more than 2.5 s of cover before the first line, long pauses, the tail after the last line: only music, nothing new on screen for 1.2–1.5 s or more — the user's rule is no 1–2 s music-only gaps, so fix them). `--check` lists gaps of 2 s or more before rendering; `--scan` re-runs the frame check on an already rendered video.
To cut on the music's beat, `EV.beats(bpm, offset)` gives the beat grid (the tempo of each background-music style is in `../core/scripts/bgm.mjs`, `STYLES`).
After the final render it **also exports the cover** `out/cover.png` (the video's first frame, can be uploaded separately as the cover) **and the board overview** `out/board.png`: for whiteboard it is the whole board after everything is drawn (a "knowledge map"); for risograph it is all pages laid out as one "contents" sheet (ink-wash has no board overview). Both can be posted on their own. It also writes `out/captions-<ratio>.srt` (the captions as a subtitle file, for platforms that take one) and, when the film registered picture credits, `out/CREDITS.txt`. To export only this image: `node scripts/render.mjs videos/<name> --board`.
Finally, tell the user the paths of the video, cover and board overview, and that opening `index.html` directly in a browser gives a preview with a draggable progress bar (space to play / pause).

## script.json format
```json
{
  "voice": "zh-CN-XiaoxiaoNeural",
  "rate": "+0%",
  "lead_in": 1.9, "gap": 0.35, "tail": 1.5,
  "bgm": "bright",
  "lines": [
    { "id": "hook", "text": "Why does an apple fall down instead of flying up into the sky?", "chapter": "The question" },
    { "id": "word", "text": "serendipity", "voice": "en-US-AvaNeural", "rate": "-15%" },
    { "id": "beat", "silence": 1.0 },
    { "id": "why1", "text": "...", "pause_after": 0.6, "chapter": "The real reason" }
  ]
}
```
`voice_fx` (optional): colour the voice — `"optical"` (an old film's optical sound track: narrow band, pressed hard; the newsreel style sets it), `"radio"`, `"phone"`.

`chapter`: a new chapter starts at this line; a chapter progress bar appears automatically at the top of the screen (only when there are at least 2 chapters). Usually 3–6 chapters, each title 2–6 Chinese characters or 1–3 English words, matching the major sections of the structures in `references/modes.md`.

`bgm` (whiteboard / riso / ink only — the styles above; the other styles use the project's `score.js` as the music, and `"bgm": false` turns it off): background music, **synthesized on the spot in code** (`scripts/bgm.mjs`, no music files needed), mixed in automatically when rendering the final video. Choose a style by content:

| Style | Sound | Suits |
|---|---|---|
| `bright` | Warm pad + marimba arpeggios + a very light lo-fi beat | Phenomenon explainers, concept explainers (default) |
| `calm` | Slow pad + sparse piano notes, no drums | Problem walkthroughs (doesn't disturb thinking) |
| `history` | Pentatonic scale + guzheng-style plucks + low drums | Allusions, historical stories, Chinese culture |
| `playful` | Bright plucks + shaker, slightly faster tempo | English vocabulary, how-to / tutorials |

The music follows the video automatically: it starts on the cover, changes phrase and plays a chime at every new chapter, and returns to the tonic chord and fades out after the narration ends; **it ducks automatically while someone is speaking** (about 19 dB below the voice) and rises again during pauses; its volume is matched automatically to the narration loudness.
**When to use no music at all** (`"bgm": false`): problem walkthroughs and derivations where every sentence needs attention; heavy topics (disasters, illness, death, mourning); very dense narration with almost no pauses; or when the user says the music is too much. Otherwise keep the quiet bed and say which one you chose and why in the storyboard. For no music write `"bgm": false`; if it is too loud or too quiet write `{ "style": "history", "volume": 0.7 }` (a multiplier). To audition it alone: `node scripts/bgm.mjs videos/<name>` → `audio/bgm.wav`; 30-second samples of all four styles: `--demo`.

Common voices: `zh-CN-XiaoxiaoNeural` (female, warm, default), `zh-CN-YunxiNeural` (male, lively), `zh-CN-YunyangNeural` (male, newscaster tone), `en-US-AvaNeural` (female, warm) / `en-US-AndrewNeural` (male, warm) / `en-US-BrianNeural` (male, casual) for English. Other languages: `edge-tts --list-voices`. Pick the voice matching the video's language; a line in another language gets its own `"voice"`.

## Hard rules
1. **The picture is a pure function of time**: no `Math.random()` (use `EV.rng(seed)` for randomness), no `Date.now()`, `requestAnimationFrame`, CSS animations or transitions.
2. **The picture follows the narration**: every element's appearance time must be anchored to a narration line or word.
3. **Answers to problems must be verified** before they go into the video.
4. Write keywords on screen; don't copy the narration verbatim.
5. Check with screenshots after every change to the visuals; never judge the result from imagination; **dynamic effects (erasing, moving, camera, character actions) must be checked with animation strips**.
6. The runtime (`lib/`) is shared infrastructure (refresh it with `node scripts/new.mjs videos/<name> --update-lib`, which detects the project's style automatically); when one video needs a special effect, write it directly in that project's index.html and do not modify `lib/`.
7. **Aim for generality, not one-offs**: when the runtime lacks some capability, build it as a general feature that works for any video (parametric, composable) instead of hard-coding something for the current topic.
