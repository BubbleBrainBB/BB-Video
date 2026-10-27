# Self-review checklist

First run `render.mjs --check` (once for landscape, once for portrait): **no errors, and every warning dealt with**; then do the manual checks below.
Look at images: `--strip 0.5,end,24` for an overview of the whole film; around each transition, `--strip start,end,8` to see it play out.

**Facts**
- [ ] Every piece of text is in brief.md (no warnings from `--check`'s fact check)
- [ ] Live data is dated; no explaining metrics the site itself doesn't explain
- [ ] The "result" of a UI demo really matches (prompt, model, options, price / credits all line up)

**Information**
- [ ] No warnings from `--check`'s "information" check: scene by scene (with narration, line by line) it looks for something on screen that carries information — a flow, comparison, chart, annotated screenshot, diagram, boxes / arrows / circles, real UI, drawings on the board; scenes with only big type, one sentence, one number or a list count as "words only"; 4 or more separately registered pieces of text visible at the same moment (a hand-built UI, a table, labels on a figure) count as an information layout. The opening hook, the drop and the end card are skipped. An occasional words-only scene is only listed in the summary line (`信息量：6 场里 5 场有讲信息的画面（只有字：第 4 场）` / `Information: 5 of 6 scenes have an information visual (words only: scene 4)`); from 30% words-only scenes each one gets a warning, and from 60% one more for the whole film; promos also count concrete points (information visuals, one per cue, + text with numbers) and warn below 4 in 30 s. Register information components you draw yourself with `F.info(kind, appear, disappear)`, or they count as "words only"
- [ ] Every item of the information checklist at the top of the storyboard (3–5 concrete points) is told on screen, with evidence (quoted text, numbers, annotated real UI)
- [ ] For every scene you can say "what the viewer learns here"; slogan / big-type scenes with no new information become annotated screenshots / flows / comparisons / charts
- [ ] Where there is a real UI, use the real UI (with the key part annotated), not just the logo
- [ ] **Actions the text mentions are acted out on screen**: if it says "drag to reorder", really drag once (`PROMO.reorder`); "switch in one click", click and switch; "filled in automatically", watch it fill — a line of text over a still picture won't convince anyone

**Picture**
- [ ] No two pieces of text overlap (when titles hand over, the previous one is fully out before the next comes in)
- [ ] Only one title on screen at a time (even if they don't overlap)
- [ ] Elements don't show before they should (e.g. a number showing early as 000), nor linger after they should be gone
- [ ] No blank frames around transitions, no two pictures smeared together
- [ ] Screenshots have no blank areas, no wrong element captured, nothing hidden by a fixed nav bar
- [ ] The cursor clicks on real buttons / options (and scales with the picture when the camera pushes in)
- [ ] No colour blocks around logos (use `mix-blend-mode: darken` for screenshots on light grounds)
- [ ] When the camera pushes in, cards, tables and small text aren't cut in half by the frame edge (`--check`'s "cut edge" warning; most common in portrait)
- [ ] The portrait version isn't a shrunken landscape: phone frame, vertical layout, text big enough

**Problems reviews often catch** (summary of 6 review rounds on the aestara film; avoid them while making)
- [ ] Something moves on screen from frame 0, with sound audible on a phone (above 150 Hz); a clear subject (a face / the product) within 1–2 s, not just text on black
- [ ] No camera position held longer than about 3 s: each step of an operation (click, switch, typing) gets a new framing (pushed in on where the action is)
- [ ] No loading states: empty cells, empty columns, grey placeholders, "no content yet" pages may only flash by
- [ ] The climax (the product's core result) is full-screen, held 1.5 s or more, and **the frame where the picture completes lands on the accent** (0.3 s off and viewers feel the hit "missed"); portrait gets its own full-screen vertical crop, not a landscape image letterboxed
- [ ] The loudest hit of the film goes with the biggest picture move (cut to the logo, the result appearing), not with a thin line
- [ ] When two layers cross-dissolve, position and size must line up exactly or you get ghosting — if they can't, hard-cut on the beat
- [ ] In portrait openings / push-ins the subject (a face) is never cropped out; title line breaks never leave one word alone on the second line
- [ ] Don't repeat "hold wide → push in → pull out" several times; use the wide shot once, to establish the scene

**Rhythm and sound** (`--audio` makes out/audio.wav to listen to, or watch the final video)
- [ ] Impact type, transitions and clicks land on the beat
- [ ] Sound effects aren't too dense (a rolling number sounds once, when it stops)
- [ ] Section intensity matches the picture: quiet sections have quiet music
- [ ] The ending resolves (impact + tail), no abrupt cut-off

**Close**
- [ ] Logo, URL and call-to-action text match the website
- [ ] The cover frame (`cover`) is a picture that represents the product, not blank

**Automatic final-video checks** (printed after rendering): loudness, jumped / flashed frames. Intentional cuts like hard cuts and white flashes are listed too; ignore them once confirmed intentional.

**Motion sheet** (printed by `--check`, chart in `review/motion-<aspect>.png`): every frame (30 fps) measures the animated DOM elements (those whose position, size or opacity `PROMO.set` changed); things moving along with their parent (a camera push, a whole window flying in) don't count as moving themselves.
- **Moving at once**: one cell per second; more than 16 is logged as a warning (too busy: stagger, or move fewer). The climax (montage) being busiest is right; if the opening and close are busy too, take a look.
- **Duration families**: move durations grouped by 0.1 s; the larger the share of the top three, the more unified (good films are at 65–75%). Scattered durations look unplanned.
- **Linear start / linear stop**: a move is at full speed from its first frame and stays linear (no easing at all). Impact type slamming down and decelerating at once, or accelerating before landing, is design and doesn't count.
- **Flicker** (warning): opacity flips 7 or more times in 1 s — past WCAG's "3 flashes per second" line and liable to cause discomfort; usually two animations fighting over the same property.
- **Jitter**: position flips back and forth 7 or more times in 1 s (intentional ones like screen shake just need confirming).
- **Too fast**: a large element travels more than 6% of the screen height per frame (it blurs and strobes); hard cuts, whip pans (windows registered with `F.blur`) and things mostly cropped by an outer layer (slot-machine number strips) don't count. Only listed; judge for yourself.
- **Camera jerk** (warning): a full-screen layer starts or stops linearly, or a sustained camera move changes speed by more than half within one frame, not on a sound effect.
- **Stiff motion** (warnings) — the film is "correct" but feels like a slide deck:
  - *Text pops in*: registered text goes from hidden to fully shown in one frame and then stands dead still (no move, scale, fade, retyping), not on a hard cut or `F.appear` — switched on, not brought in. Three or more is a warning. *Text pops out* (the same on exit) is only listed.
  - *The same entrance repeated*: a picture or panel (image / canvas / video inside, or a background) enters with the same move (duration, direction, distance, scale) six or more times in a row, each within 4 s of the last. Impact words are exempt (slamming one after another is the style).
  - *Empty box*: a panel stands empty 0.45 s or more before the first text inside it appears.
- **Too many light leaks** (warning, from lint): more than three `PROMO.leak` in a film, or two within 3 s.
- Motion drawn in canvas / WebGL / a board (op stripes, ASCII characters, whiteboard, riso, ink) can't be measured; the motion sheet says so; see the final-video check and the measured rhythm.
- Texture layers (grain, constantly spinning rays and other things that aren't "moves"): put `data-motion="skip"` on the element.
- Thresholds were set on films the user called "good" (grok-bot-launch and others: 0 problems, at most 9 moving at once). Recalibrate when the user judges new films: `window.__motion({ th: { crowd, fast, cam, abrupt } })`.

## What "must fix" means (only these can block delivery)
Reviewers' taste varies, and a different reviewer will find a new batch of "problems"; only objective, verifiable issues are must-fix:
1. **Facts**: on-screen text has no source in brief.md, or breaks the "must not say" list.
2. **Blocked / cut off**: text cut off by the frame edge; in portrait, titles or key words within the top 8% or bottom 20% (platform top bar, caption area).
3. **Unreadable**: a stretch of 2 s or more with no line of text readable on a phone; key information (product name, URL, core result) smaller than about 10px on a phone.
4. **Inaudible**: more than 0.5 s without sound in the phone band (above 150 Hz) (0.3 s at the start).
5. **Off the beat**: section impacts, hard cuts and the landing of the core picture are 2 frames or more off the accent.
6. **Continuity errors**: ghosting, a one-frame flash, a one-frame jump, loading states / blanks showing, two layers misaligned, elements showing early or lingering.
7. **Core result not delivered**: the product's core result (the image, the video, the generated output) isn't full-screen or nearly so, or isn't held for 1 s.
8. **Dead air**: dead air listed on the last line of the data table `report-*.txt` (≥ 1.2 s with only slow motion, no new text, no sound effect). For fixes see "Pacing" in structure.md. For narrated explainers only where the narration pauses (silence at the start, long pauses, the end after the last line) — what is reported there is must-fix too.
   **No new action** (one notch looser than dead air: the camera still moves or a spotlight rests, but ≥ 1.5 s with no new text / sound effect / hard cut; listed by both the final-video check and the report) is also treated as must-fix — the user has said clearly they dislike 1–2 s gaps: add an action (move the spotlight to the next spot, make a number jump, bring the next element forward).
Everything else (whether the opening grabs, preferred overall pace, composition preferences, colour …) is "optional".

## Review prompt template (for the Agent tool, general-purpose; one for landscape and one for portrait, in parallel)
Replace `<…>` with the real content; `<version>` is 16x9 or 9x16:

> You are a demanding motion director reviewing the <version> version of a product promo. You are not the author; but don't nitpick for its own sake — 8 = ready to publish.
> Rules: judge only picture and sound; don't read index.html / .js; don't modify project files. Project folder <path>; product <one line>; <duration> s, no narration. The fact sheet brief.md may be read.
> Materials (already prepared — **rely on these**; only extract frames yourself with ffmpeg where the materials aren't clear, at most 30 frames): review/contact-<version>.png contact sheet (phone size), review/transitions-<version>.png 1.2 s around each transition, review/report-<version>.txt per-0.5 s table of picture change / phone-band loudness / events; video out/draft-<version>.mp4 (draft: half resolution, no motion blur — neither counts as a problem).
> Scores (1–10, one reason each): does the first 2 s grab; readable on a phone; motion quality; variety; composition; brand and facts; rhythm.
> "Must fix" can only be these 8 kinds of objective problem: <paste the 8 items of "What must fix means">. Everything else is marked "optional".
> Output: scores; all issues (each marked must fix / optional, with timestamp, what you see, why, and a concrete fix); verdict: pass (no must-fix items) / fail.

**Re-check (round 2, continue the same reviewer with SendMessage)**:

> I fixed your must-fix items: <how each was fixed>. The materials are updated (same file names). Please check only your must-fix items from last round: resolved / not resolved; look at the contact sheet once more and report only must-fix problems newly caused by these changes. Don't do a full new review. Output: check results, verdict.
