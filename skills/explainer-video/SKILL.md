---
name: explainer-video
description: Make explainer videos in pure code, with built-in voiceover (TTS), captions and background music, output as mp4. Two visual styles — hand-drawn whiteboard and risograph (magazine / newspaper look). Use for phenomenon explainers ("why is the sky blue"), problem walkthroughs (math / physics / chemistry problems, including screenshots of problems), English vocabulary, concept explainers, historical stories and allusions ("Xiao He chasing Han Xin by moonlight" / "萧何月下追韩信"), how-to tutorials, everyday trivia, psychology and social topics, news explainers and data-driven explainers ("why are egg prices rising" / "鸡蛋为什么涨价"). Use when the user says "make a science explainer video", "turn this problem into a walkthrough video", "explain this word", "whiteboard animation", "magazine-style / risograph video", "news explainer video", "explainer video", or in Chinese "做个科普视频" "把这道题做成讲解视频" "讲解这个单词" "白板动画" "杂志风 / 孔版印刷 / risograph 视频" "新闻解读视频".
---

# Explainer Video

Draw every frame yourself with HTML + SVG, render frame by frame in Chrome, voice it with edge-tts, and assemble with ffmpeg.
No third-party animation libraries: every animation is drawn by the pure function `renderFrame(t)`.

All relative paths in this file are relative to this skill's directory.

## Contents
- `styles/whiteboard/STYLE.md`: style rules and full API for the hand-drawn whiteboard.
- `styles/riso/STYLE.md`: style rules and full API for risograph. **Once a style is chosen, you must read the matching file before writing any drawing code.**
- `references/modes.md`: how to tell each kind of content (phenomenon, problem, word, concept, allusion / historical story). **You must read the matching section before writing the script.**
- `references/characters.md`: design method, spec parameters and acting principles for cartoon characters (Notion style). **Must be read whenever a character appears in the video.**
- `references/review.md`: self-review checklist.
- `scripts/new.mjs` new project · `scripts/tts.py` voiceover and timeline · `scripts/render.mjs` rendering · `scripts/cast.mjs` character model sheets · `scripts/bgm.mjs` background music (synthesized in code) · `scripts/assets.mjs` prepare image / video assets

## Workflow

### 1. Understand the input, settle the content
- **Decide the video's language first**: unless the user says otherwise, it is **the language the user is writing in** (an English request → an English video; a Chinese request → a Chinese video). The topic doesn't change this: a Chinese user asking about an English word gets a Chinese video with English parts; an English user asking about a Chinese allusion gets an English video. The language sets the narration, all on-screen text, chapter titles, the voice and the pacing (see "General: writing narration" in `references/modes.md`).
- Decide the content mode (phenomenon / problem / word / concept / allusion / tutorial / news explainer) and read the matching section of `references/modes.md`.
- **Problem walkthrough**: first solve the problem completely, then verify with Python; write the problem transcription, solution and verification result into the project's `brief.md`. For screenshot problems, have the user confirm the transcription first.
- **Allusion / historical story**: first look up the original source text, separate historical fact from later embellishment (plot added by operas and novels), and write the characters, dates and original quotes into `brief.md`.
- **News explainer / data-driven**: first verify facts and numbers, record sources and dates, and write them into `brief.md`.
- **Pick a style**: if the user specified one, use it; otherwise recommend one by topic:

| Style | Look | Recommended topics |
|---|---|---|
| `whiteboard` hand-drawn whiteboard | Drawing on a whiteboard while explaining, infinite canvas + camera moves, cartoon characters allowed | Problem walkthroughs, concept derivations, phenomenon explainers, historical allusions, stories that need characters acting |
| `riso` risograph | Magazine layouts with spot-color overprint, halftone and ink-layer misregistration; one page per chapter, drum-roll page turns | Everyday trivia, psychology / social topics, news explainers, finance, data comparisons, food tutorials, English vocabulary |

  Risograph does not yet support characters or formulas; ancient history and serious, heavy topics do not suit it. If the user asks for a style that is not implemented yet, tell them so plainly.

### 2. Create the project, write the narration and storyboard
```bash
node scripts/new.mjs videos/<short-english-name>                 # hand-drawn whiteboard
node scripts/new.mjs videos/<short-english-name> --style riso    # risograph
node scripts/new.mjs videos/<short-english-name> --lang en       # an English video (default is zh-CN); also ja / ko / fr / de / es, other languages with --voice
```
`--lang` sets the voice, `<html lang>`, and on whiteboard the default handwriting font (`WB.board({ lang })`).
- `script.json`: the narration, one object per line (format below).
- `storyboard.md`: the storyboard; for every line, state exactly what is drawn on screen and where. For whiteboard, first plan the region layout of the whole board and the camera route; for risograph, first plan the layout and color scheme of each page (one page per chapter).
- **Cover**: in the storyboard, specify the cover's headline, subtitle and key visual (see "Cover" in the matching STYLE.md). `lead_in` in `script.json`: about 1.9 s for whiteboard, about 2.3 s for risograph (already set per style when the project is created).
- When characters are needed (whiteboard only): design them following `references/characters.md`, write them into `characters.js`, and mark each character's entrances, expressions and lines in the storyboard. Render model sheets with `node scripts/cast.mjs videos/<name>`; **new characters must be shown to the user together with their model sheets for confirmation**.

**Show the narration and storyboard to the user** and continue only after they confirm. If the user says "just make it", skip the confirmation.

**When using images or videos** (photos, screenshots, screen recordings, user-provided material): put the original files into the project's `assets/src/` and run
```bash
node scripts/assets.mjs videos/<name>
```
Images are scaled to a suitable size, videos are extracted into 30fps frame-by-frame images (the picture is still a pure function of time), and a manifest `assets/manifest.js` is generated. When only a few segments of a long video are used, write `assets/clips.json` (format described at the top of the script). Place assets on screen with `b.photo()` (whiteboard) / `b.image()` (risograph); see "Images and video" in the matching STYLE.md. For copyrighted material, use only what the user provided or is permitted to use.
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
1. **Lint check**: finds problems that only show up "in motion", e.g. erased before it finished drawing, held too briefly after drawing, drawn outside the camera, covering the captions, moving the camera while drawing, overlapping elements, a character pointing off-screen. The report includes times and `index.html` line numbers. **All errors must be fixed; every warning must be checked one by one.**
2. **Static overview**: the frame at the end of each narration line, for checking the layout.
3. **Animation process**: the overview only shows the "result", not the "process". For every time flagged by the lint check, and for every erase, camera move and character action, view 8 consecutive frames with `--strip start,end`.

Go through `references/review.md` item by item, fixing things until everything passes.

### 6. Render the final video
```bash
node scripts/render.mjs videos/<name>            # → out/video.mp4 (1080p 30fps); refuses to render if the lint check has errors
node scripts/render.mjs videos/<name> --draft    # fast half-resolution version, for checking pacing first
```
Background music is generated and mixed in automatically according to `bgm` in script.json; turn it off temporarily with `--no-bgm`, switch style with `--bgm-style calm`, use your own music file with `--bgm file --bgm-volume 0.1`.
After the final render it **also exports the cover** `out/cover.png` (the video's first frame, can be uploaded separately as the cover) **and the board overview** `out/board.png`: for whiteboard it is the whole board after everything is drawn (a "knowledge map"); for risograph it is all pages laid out as one "contents" sheet. Both can be posted on their own. To export only this image: `node scripts/render.mjs videos/<name> --board`.
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
`chapter`: a new chapter starts at this line; a chapter progress bar appears automatically at the top of the screen (only when there are at least 2 chapters). Usually 3–6 chapters, each title 2–6 Chinese characters or 1–3 English words, matching the major sections of the structures in `references/modes.md`.

`bgm`: background music, **synthesized on the spot in code** (`scripts/bgm.mjs`, no music files needed), mixed in automatically when rendering the final video. Choose a style by content:

| Style | Sound | Suits |
|---|---|---|
| `bright` | Warm pad + marimba arpeggios + a very light lo-fi beat | Phenomenon explainers, concept explainers (default) |
| `calm` | Slow pad + sparse piano notes, no drums | Problem walkthroughs (doesn't disturb thinking) |
| `history` | Pentatonic scale + guzheng-style plucks + low drums | Allusions, historical stories, Chinese culture |
| `playful` | Bright plucks + shaker, slightly faster tempo | English vocabulary, how-to / tutorials |

The music follows the video automatically: it starts on the cover, changes phrase and plays a chime at every new chapter, and returns to the tonic chord and fades out after the narration ends; **it ducks automatically while someone is speaking** (about 19 dB below the voice) and rises again during pauses; its volume is matched automatically to the narration loudness.
For no music write `"bgm": false`; if it is too loud or too quiet write `{ "style": "history", "volume": 0.7 }` (a multiplier). To audition it alone: `node scripts/bgm.mjs videos/<name>` → `audio/bgm.wav`; 30-second samples of all four styles: `--demo`.

Common voices: `zh-CN-XiaoxiaoNeural` (female, warm, default), `zh-CN-YunxiNeural` (male, lively), `zh-CN-YunyangNeural` (male, newscaster tone), `en-US-AvaNeural` (female, warm) / `en-US-AndrewNeural` (male, warm) / `en-US-BrianNeural` (male, casual) for English. Other languages: `edge-tts --list-voices`. Pick the voice matching the video's language; a line in another language gets its own `"voice"`.

## Hard rules
1. **The picture is a pure function of time**: no `Math.random()` (use `EV.rng(seed)` for randomness), no `Date.now()`, `requestAnimationFrame`, CSS animations or transitions.
2. **The picture follows the narration**: every element's appearance time must be anchored to a narration line or word.
3. **Answers to problems must be verified** before they go into the video.
4. Write keywords on screen; don't copy the narration verbatim.
5. Check with screenshots after every change to the visuals; never judge the result from imagination; **dynamic effects (erasing, moving, camera, character actions) must be checked with animation strips**.
6. The runtime (`lib/`) is shared infrastructure (refresh it with `node scripts/new.mjs videos/<name> --update-lib`, which detects the project's style automatically); when one video needs a special effect, write it directly in that project's index.html and do not modify `lib/`.
7. **Aim for generality, not one-offs**: when the runtime lacks some capability, build it as a general feature that works for any video (parametric, composable) instead of hard-coding something for the current topic.
