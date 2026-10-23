# Structure and beats

## How to tell it: decided by the product and the material (the user doesn't choose)
The user only picks a **style** (what it looks like). How the film tells the story is my call, based on the product and the material at hand, written into the storyboard for the user to see — the same idea as explainers choosing a mode by topic (`../explainer/references/modes.md`):
| What you have | How to tell it |
|---|---|
| Real UI can be captured | **Mostly UI demo**: reveal → one or two key actions (cursor, typing, switching) → result; big text only for the opening and ending |
| UI can't be captured, or the product has no UI (CLI, API, model, hardware) | **Mostly big text**: one or two words slamming down per beat + an explanatory line + key numbers + logo (this is what quick mode does, `references/kit.md`) |
| The product is a conversation (AI assistant, chat, customer service) | **Back and forth**: question → answer / request → done; tell the features through dialogue |
| The product's value is in results and numbers (rankings, metrics, reports) | **Mostly numbers and charts**: big numbers rolling, ranking bars growing, curves wiping in |
| Open-source project, local app | Read the repo first (GUIDE.md step 1); the real screenshots you can get decide which of the above |
One film can mix them (big-text opening, UI demo in the middle, numbers at the end). Every style can perform all of these: each style implements the same set of generic actions (big text, explanatory line, cards, screenshots, signature move, transitions, end card; see `references/kit.md`).

## Beats
- Default 120 BPM: one beat is 0.5 s, one bar 2 s. Set `offset` to 0.5 (beat 0 at 0.5 s, a little space at the start).
- Impact text: one word per beat; fast word changes (slot machine): one per half beat; big transitions land on the start of a bar.
- Transitions between sections last 0.5–0.7 s, about one beat.

## Recommended structure

| Length | Structure |
|---|---|
| 15 s | Opening impact text (2 s) → product reveal + 1 core feature (9 s) → ending (4 s) |
| 30 s | Opening (5) → claim / key number (6) → features ×2 (6–7 each) → ending (5) |
| 45 s | Opening (6) → product reveal (8) → features ×2–3 (7–8 each) → montage (6) → ending (5) |
| 60 s | One more feature or a user scenario |

Typical treatments per section (`references/motion.md` has the matching components):
- **Opening**: impact text (the product's few core verbs / the words in its nav bar), the product name scramble-decoding, a question or a claim.
- **Claim / key number**: the site's main headline floating up word by word; big numbers rolling digit by digit on an odometer; a subtitle.
- **Product reveal**: a browser window (a phone frame in portrait) flying in tilted; the homepage hero image opened with a circular mask.
- **Feature demo**: redraw key UI in code, with cursor clicks, typing, option switches, rolling numbers; camera pushes in on the feature; shared-element transitions (a thumbnail growing into the detail view).
- **Data / charts**: ranking bars growing one by one + values rolling; a chart screenshot wiped in along its curve, the camera panning along the line.
- **Montage**: a full-page long screenshot scrolling fast in a window + a slot machine of category names; 3D rotating fan of images; vertical strip collage + fly-through + white flash.
- **Ending**: logo (screenshot or text), main headline, call-to-action button (the real button text from the site), URL.

## Pacing: one thing leads into the next, no dead air
A promo has no narration; when the picture stops, the audience has only music to listen to — after a little over 1 second it feels like it "drags".
- **On average something new every 1–1.5 s**: a word appears, an action settles, a sound effect, a switch. Camera breathing, slow pushes and drifts only keep it from "freezing"; they don't count as new things.
- **Hold = time to read it**, not padded to whole bars: one word 1 beat; a headline about 0.6 s + 0.3 s per word; an image with one small line, about 1.5 s is enough. Core results (the finished output, key numbers) may hold half a beat to a beat longer, but no more than 2 s.
- **Overlap the transition with the next scene's action** (like a J-cut): the next scene's first action starts halfway through the transition (halfway through a page turn, the card below is already standing up; as a whip pan comes in, the text is already landing). Starting to move only after the transition ends = a wasted beat.
- **No "enter → wait → act" inside a scene either**: the last part of the entrance is the first action (the paper is already unfolding as it drops, the cursor is already moving as the window flies in).
- **Consecutive operations one per beat** (click, select, switch); a gap longer than two beats needs a reason (letting the audience see the result).
- **Transitions themselves are short**: 0.5–0.9 s; even "slow" transitions like page turns and folds stay under 1 s.
- Automatic check: after a final / draft render, "dead air" (空放) is reported (≥ 1.2 s where the picture has only slow motion, no new text, no sound effect), and the last line of the review data sheet `report-*.txt` lists it too. When it shows up, bring the next action forward or shorten the hold. Narrated explainers are checked too: spoken stretches count as something happening, so only the silent parts are looked at (more than 2.5 s of dead air before the first line, long pauses between lines, after the last line); `--check` lists anything over 2 s before rendering, and `--scan` rechecks an already rendered film.

## Readable on a phone: how big text must be
The automatic check's "unreadable on a phone" (手机上读不清) = a line of text scaled to a 360px-wide phone screen is under 10px tall. In frame sizes (**line-box height**, roughly font size × 1.2–1.3, including camera zoom):
| Format | Line box at least | Approx. font size |
|---|---|---|
| Landscape 16:9 (1920 wide) | 53px | 42px |
| Portrait 9:16 (1080 wide) | 30px | 24px |
UI redrawn at its original text size (13–16px) is never readable in landscape: push in 2× or more, or enlarge the UI text to 24–44px, or pair it with a line of big text.

## Sound
Music (`score.js`, `references/music.md`) + product-specific sound effects (`sound.js`, `references/sound.md`). `bpm` is the music's tempo and also the picture's beat grid: transitions, impact text and clicks all land on beats, so set the music tempo before writing the picture.

## Sections (`F.section`)
- Energy 0–3 marks the film's rises and falls: it decides which music layers play and how loud; with `hit: true` the sound design's `hit` (heavy hit) plays, and `gap` clears the music just before the hit.
- `hit: true` at a section start gives one heavy hit; a "riser" is added automatically one bar before energy goes up; the ending gets an automatic hit + tail.
- Typical: opening 1 → reveal 2 (hit) → feature demo 3 (hit) → quiet data section 2 → montage 3 (hit) → ending 0.

## Landscape and portrait
- Landscape 1920×1080, portrait 1080×1920; `F.u` = short side / 1080, `F.px(n)` converts design sizes to pixels.
- Portrait layout: the browser window becomes a phone frame (with mobile screenshots inside); cards and charts stack vertically at full width; headlines are larger and wrap automatically.
- Impact text shrinks automatically to stay inside the frame.
