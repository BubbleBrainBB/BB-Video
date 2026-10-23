# Content modes: how to tell it

The style decides "what it looks like"; the mode decides "how it is told". Any style can be combined with any mode.
First decide which mode the user's input belongs to (A phenomenon, B problem, C word, D concept, E allusion / historical story, F how-to / tutorial, G news explainer / data-driven); if unsure, treat it as a "concept explainer".

---

## A. Phenomenon explainer: why...?
Examples: "Why is the sky blue?" "Why do apples fall?" "Why does your breath turn into white mist in winter?"

**Structure (60–120 seconds)**
1. **Hook** (5–8 seconds): pose the question, ideally with a concrete image. You may first state an answer most people would think of but that is incomplete.
2. **Intuition**: build a feel with an everyday analogy ("It's like...").
3. **Mechanism**: explain the real cause. Stick to one main thread; cut every side branch.
4. **Evidence / consequence**: use the principle to explain a related phenomenon ("so that's why sunsets are red"), proving it really holds.
5. **Callback**: return to the opening image and sum up in one sentence.

**Key points**
- One idea per shot.
- Every abstract concept must land on a picture (light → wavy line, force → arrow, molecules → small dots).
- Numbers need a reference point ("a thousand times thinner than a hair" is easier to grasp than "0.1 micrometers").

---

## B. Problem walkthrough: one problem / one screenshot of a problem
Examples: math, physics and chemistry calculation problems, geometry problems, word problems

**Step 0: get the problem right first (mandatory, cannot be skipped)**
1. If it is a screenshot: read the image carefully and transcribe the problem text, numbers and labels in the figure completely. **Have the user confirm the transcription first** (misread a single number and the whole video is wasted).
2. Solve the problem completely yourself and write it into `brief.md`.
3. **Verify independently with Python**: compute numeric values where possible, use sympy where possible; for multiple choice, check every option; for geometry, verify with coordinates. If the verification and the solution disagree, find the cause before continuing.
4. If there are several methods, explain the one that is **most natural and best fits the problem's grade level**; mention the others at most in one sentence at the end.

**Structure (1–3 minutes, depending on the problem)**
1. **Read the problem**: write / draw the problem on the whiteboard, highlighting key conditions with a highlighter while reading.
2. **Sort out givens and unknowns**: list "Given" and "Find".
3. **Approach**: **this step is the soul of the explanation**. Explain "why you would think of this method" — which condition you saw and which theorem / model it reminded you of. Don't start by writing equations.
4. **Step-by-step derivation**: one step per line, with a small note beside each step giving its justification ("substitute ①", "divide both sides by 2"). Put a red box around the key step.
5. **Answer**: written in green, double-underlined. Where possible, check it on the spot (plug it back in / check units / check the order of magnitude).
6. **Summary**: the general method for this type of problem + one common pitfall (on a sticky note).

**Key points**
- The problem's figure must be redrawn precisely in code (coordinates, angles, proportions correct), not "roughly".
- Use `b.math()` for formulas; keep the same quantity in the same color throughout the derivation.
- The narration should "talk through" the equations conversationally, not read them symbol by symbol. For example, say "divide both sides by two", not "x equals y divided by 2".

---

## C. Word explainer: one English word
Examples: "serendipity" "procrastinate" "ambiguous"
Explanations are in the video's language (the viewer's language): for a Chinese viewer, Chinese definitions and explanations; for an English viewer, plain-English definitions (like a learner's dictionary) instead of translations. Below, "the viewer's language" means that.

**Structure (30–60 seconds)**
1. **Word + pronunciation**: write the word and its phonetic transcription in large letters; have this line read by an English voice (`"voice": "en-US-AvaNeural"`; in an English video that is already the main voice).
2. **Breakdown**: split it into syllables / roots and affixes, labeling the meaning of each part (e.g. pro- forward + crastin tomorrow → push to tomorrow). If there is a reliable etymology story, tell it in one sentence; **never invent an uncertain etymology**.
3. **Core meaning**: a one-sentence definition in the viewer's language + a small illustration to help remember it.
4. **Example sentences**: 1–2 everyday example sentences, with the word highlighted in each; read the English sentence with an English voice, then explain it once in the viewer's language (in an English video: rephrase it in simpler words).
5. **Distinctions or collocations** (optional): the difference between a set of synonyms, or 2–3 common collocations.
6. **Wrap-up**: show the word together with its meaning once more.

**Key points**
- Phonetic transcription, part of speech and definition must be accurate; if unsure, say less rather than make things up.
- In a Chinese video, put English parts in their own lines in script.json with an English voice specified; English words embedded in Chinese sentences can be read by the Chinese voice, but the pronunciation is less natural than with an English voice.

---

## D. Concept explainer: what is...?
Examples: "What is compound interest?" "What is entropy?" "What is the attention mechanism?"

**Structure**: one-sentence definition → one concrete example → break down the components / process → common misconceptions → one-sentence summary.
Use "arrow + box" flowcharts for complex processes; two columns (a T-chart) for comparisons; a coordinate system with curves for things that change over time.

---

## E. Allusion / historical story: the full story behind an idiom, allusion or historical event
Examples: "Xiao He chases Han Xin by moonlight", "armchair strategy" (Zhao Kuo's idiom), "breaking the cauldrons and sinking the boats", "Copernicus and heliocentrism"

**Step 0: get the historical facts straight first (mandatory)**
1. Find the **original source text** (e.g. a chapter of the *Records of the Grand Historian*) and organize the characters, dates, places and key original quotes into `brief.md`.
2. Separate **historical fact** from **later embellishment** (plot added by operas, novels, folk legends); the video must make clear which parts were added later.
3. If unsure about years, official titles or relationships between people, verify them or leave them out; **never make things up**.

**Structure (1.5–3 minutes)**
1. **Hook**: write the allusion's name; pose the question through a surprising conflict ("Why would the chancellor himself chase after a minor official?").
2. **Background**: the time (a point on a timeline), the big picture (a minimal map or comparison of powers), the main characters entering.
3. **Cause → development → climax**: tell it in chronological order; the climax is usually a dialogue or a decision, and **the most powerful line from the original quotes** (e.g. "peerless among the state's men") is written large.
4. **Outcome**: what the event led to (extend the timeline forward).
5. **Meaning**: what the allusion is used to mean today; bring in related idioms / sayings if any.
6. **Callback**: return to the opening conflict and close with one sentence.

**Key points**
- Represent people with characters (`references/characters.md`), each with an accent color; **the person's name, lines and related arrows all use their color**.
- **With more than 3 people, color by faction, not by person** (the whiteboard has at most 3 ink colors): people in the same faction share a color (e.g. Chu camp blue, Han camp red),
  and one color is reserved for the "meaning of the allusion / idiom". People in the same faction are distinguished by silhouette (guan, hairstyle, beard) and the name above their heads. When there are no clear factions, color only the protagonist and the antagonist and draw everyone else in black.
- Shared story rules (all styles with characters): `../../styles/CHARACTERS.md` — fix the cast up front and call people by name, make people in one scene differ in two attributes, stage two-person moments face to face (`faceTo`), stage chains of events as a relay.
- Write dialogue as chat bubbles on the left and right: one speaker on each side, only keywords for each line; the character `say`s the corresponding span while speaking.
- Relay lines in the narration conversationally; don't read long passages of classical Chinese; famous phrases from the original (around four characters) can be written on the whiteboard as-is.
- When there are many events, string them together with one continuous timeline.

---

## F. How-to / tutorial: how to do something
Examples: "How to make tomato and egg stir-fry", "How to tie a tie", "How to patch a bike tire", "How to make a pivot table in Excel"

**Step 0: get the steps exactly right first (mandatory)**
1. Organize the full steps and the key parameters of each step (time, temperature, heat level, quantity, force) into `brief.md`.
2. Identify **the 1–2 points that are easiest to get wrong**, and **why the order can't be changed**. These are where the video's value lies; reading out a recipe is pointless.
3. For anything involving safety (knives, open flames, hot oil, electricity), give a separate warning.

**Structure (60–120 seconds)**
1. **Common question**: open with a question most people have ("Tomatoes or eggs — which goes in first?") and give the conclusion first.
2. **Process overview**: draw all the steps with "box + arrow" (usually 3–5 steps), 2–4 Chinese characters or 1–2 English words per step, numbered ①②③. Viewers see the whole picture first, then the details.
3. **Step-by-step**: one region per step (usually one chapter), each making two things clear:
   - **What to do**: draw the actions and the state changes (cutting into chunks, into the pan, changing color, bubbling...).
   - **Why**: one sentence on the principle or purpose ("Scramble the eggs first so they stay tender"). Actions without reasons don't stick.
4. **Common mistakes**: compare the wrong way and the right way side by side, with a cross ✗ on the wrong one and a check ✓ on the right one.
5. **Mnemonic wrap-up**: compress all the steps into one catchy mnemonic, written on a sticky note.

**Standard ways to show things**
- **Duration**: `b.timer(x, y, { label: '2 min' })`. Use it for every "how long to wait / how long to do it"; after the small clock is drawn, the minute hand makes one full turn.
- **"Which level" things such as heat / force / difficulty**: `b.level(x, y, { icon: 'flame', level: 2, label: 'medium heat' })`; `icon` options are `flame`, `bar` (bars) and `star`.
- **A pile of ingredients** (chopped chunks, beans, rice grains...): `b.pile(...)`; **a sprinkle** (scallions, salt, sesame...): `b.sprinkle(...)`.
- **Step numbers**: the flowchart and every step region's title use the same ①②③ numbering, in the same colors.
- **State changes** (raw → cooked, liquid → solid): at the same position, draw "before" first, then use `transform` or erase and redraw it as "after", with an arrow beside it marking the change.

## G. News explainer / data-driven explainer: the story behind an event, or the reasons behind a set of numbers
Examples: "Why did egg prices suddenly rise?", "How is delayed retirement actually calculated?", "Why don't young people buy homes anymore?", "How much of your life is spent on your phone?"

**Step 0: verify facts and numbers first (mandatory)**
1. Every number, date and policy clause needs a source: record the **source, publication date and statistical basis** in `brief.md`.
2. Don't use numbers without a reliable source; data used purely for demonstration must be labeled "illustrative data" on screen.
3. Separate **fact** from **interpretation**: the narration must make clear what is public data and what is analysis and speculation ("it is generally believed", "possibly because").
4. For time-sensitive content, state on screen the date the data is current to.

**Structure (60–120 seconds)**
1. Open with **one number / one change**: a large number or a comparison chart ("Up 30% in three months").
2. **Break down the causes**: usually 2–4, numbered side by side, each with one graphic + one sentence.
3. **Impact / what it means for you**: bring it down to the viewer's own life.
4. **What happens next**: a well-founded judgment, with the uncertainty stated.
5. **One-sentence summary**.

**Key points**
- Charts must be honest: y-axis starts at 0, no truncation, no exaggeration; state units and time ranges clearly.
- Keep the tone restrained; avoid emotional words like "shocking" or "skyrocketing".
- Recommended style: `riso` with the `news` palette; music: `calm`.

## General: visual style
Every mode can use any style; when none is specified, recommend by topic (see "Pick a style" in GUIDE.md):
- A phenomenon, D concept: `whiteboard` for science with heavy derivation; `ink` for Chinese culture, philosophy, poetry and nature; `riso` for everyday, psychology and social topics (palettes such as `lively` / `mind` / `nature`).
- B problem: `whiteboard`.
- C word: either works; `riso` is livelier.
- E allusion / historical story: `ink` (ink-wash handscroll, the natural fit), or `whiteboard` when the story needs diagrams, maps or many acted scenes (ancient topics don't suit `riso`).
- F how-to / tutorial: `whiteboard`, or `riso` with the `food` palette.
- G news explainer / data-driven: `riso` with the `news` palette.

## General: chapters
The "major sections" of each structure above are the chapters (e.g. phenomenon explainer: the question / intuition / mechanism / consequence).
- Put `"chapter"` on the first line of each chapter; 3–6 chapters, titles of 2–6 Chinese characters or 1–3 English words, so viewers can see at a glance "where we are", like a table of contents.
- Short videos under 30 seconds can skip chapters.

## General: background music
Choose `"bgm"` in `script.json` by mode: A phenomenon, D concept → `bright`; B problem, G news explainer → `calm`; C word, F how-to → `playful`; E allusion / history → `history`.
When the mood of the content doesn't match the mode, choose by mood (e.g. a light-hearted historical anecdote can also use `playful`). The music is synthesized in code; see GUIDE.md.

## General: writing narration
- Write the narration in the video's language (GUIDE.md, step 1).
- Chinese edge-tts speaks about 4–5 characters per second: 60 seconds ≈ 250–300 characters. English speaks about 3 words per second: 60 seconds ≈ 160–180 words.
- 8–30 Chinese characters or 5–18 English words per line, one idea per line. If lines are too long, captions and visuals are hard to sync.
- Talk like chatting with a friend: use "you" and "we" a lot, avoid formal written language; rhetorical questions are fine.
- Give lines meaningful ids (`hook`, `why1`, `step3`) so they are easy to find when writing the drawing code.
- Where the visuals need "a breather", add a pause: `"pause_after": 0.8`, or a separate line `{"id": "beat1", "silence": 1.2}`.
