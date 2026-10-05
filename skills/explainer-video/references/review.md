# Self-review checklist

First run the lint check `node scripts/render.mjs <project> --check`; only when there are **no errors** and every warning has been checked, do the manual review below.
The lint check covers "timing and position" problems (erased before finished drawing, held too briefly, drawn outside the camera, covering captions, moving the camera while drawing, overlap);
the manual review covers what it cannot judge: "does it look good, is it explained clearly".

Render the overview: `node scripts/render.mjs <project> --sheet`, then view `review/sheet.png` with Read
(each cell is the frame 0.3 s after a narration line ends; order listed in `review/sheet.txt`).
For details, export full-size screenshots with `--stills 12.5,30`.

For the risograph style, also check "Self-check points" at the end of `styles/riso/STYLE.md`.

Check item by item; whenever you find a problem, fix index.html and regenerate the overview, until everything passes:

**Content**
- [ ] Problem walkthrough: the answer has been verified with Python; for screenshot problems, the user has confirmed the transcription
- [ ] News explainer / data: every number has a source and date (or is labeled "illustrative data"), chart y-axes start at 0
- [ ] On-screen text, formulas and numbers match the narration, with no typos
- [ ] When each narration line ends, something corresponding to that line is already on screen

**Layout**
- [ ] No overlapping elements, no text covering other text (watch labels vs. lines, sticky notes vs. drawings)
- [ ] Nothing is cropped by the frame edge, and nothing sits in the caption area at the bottom
- [ ] Font size at least 36 (except zoomed-out overview shots)
- [ ] Every frame has a clear visual focus, enough whitespace, not crowded
- [ ] Color meanings are consistent across the whole video

**Cover** (look at `out/cover.png`, or export it alone with `--cover`)
- [ ] The first frame is the complete cover: headline of 12 Chinese characters / 6 English words or fewer, keywords in red, and one key visual that makes the topic recognizable
- [ ] Shrunk to about 1/4 size, the headline is still readable at a glance

**Animation process** (view with `--strip start,end`; the overview can't show this)
- [ ] Before every erase, the thing being erased has been fully drawn and held long enough
- [ ] Character actions (entrance, pointing, expression changes) are complete and natural, with arm and body connected
- [ ] Moving objects (falling, sliding) follow correct paths and don't pass through other elements

**Pacing**
- [ ] No long stretches of static picture (more than 3 seconds with nothing new while the narration keeps talking)
- [ ] Nothing pops up all at once in a big pile; elements are drawn one by one
- [ ] New content starts drawing only after the camera has finished moving
- [ ] The ending has a zoomed-out overview, or calls back to the opening
- [ ] Each camera move goes only to an adjacent region, and no content from the previous section "leaks" into the frame
- [ ] Take a look at `out/board.png`: the whole board as a knowledge map has a clear layout with no overlaps; the ①②③ order labels match the actual order of explanation
- [ ] With chapters: chapter changes are in sync with visual transitions, and chapter titles accurately summarize their section

**Captions** (`node scripts/render.mjs <project> --captions` lists all caption segments)
- [ ] No word is split across two screens (English words, numbers, proper nouns)
- [ ] No captions of just one or two characters that flash by

**Sound** (listen once while watching the final video)
- [ ] The music style fits the content (`history` for history, `calm` for problems...) and doesn't drown out the voice
- [ ] English words and proper nouns are pronounced correctly

**Technical**
- [ ] The render output has no page exceptions or console.error
- [ ] Dragging the progress bar in the browser preview, the picture is correct at every point in time (renderFrame is a pure function)
