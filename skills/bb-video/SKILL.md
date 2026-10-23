---
name: bb-video
description: 'Make videos in pure code, output as mp4 — explainer videos with voiceover, captions and background music, and promo / launch videos for websites, apps and software with beat-synced music and sound effects (16:9 and 9:16). One choice for the user: the visual style — hand-drawn whiteboard, risograph (magazine look), ink-wash (水墨 handscroll), launch-event motion, origami, pop art, op art, Matisse cut-outs, ASCII character art, shadow puppets (皮影戏), constructivism / Bauhaus, pixel art (8-bit game), chat log (the story told in a messaging app), toy 3D (a product''s real UI as physical slabs on a desk, a matte vinyl toy hopping across it). Use for phenomenon explainers ("why is the sky blue"), problem walkthroughs (including screenshots of problems), English vocabulary, concept explainers, historical stories and allusions, how-to tutorials, everyday trivia, psychology and social topics, news and data explainers, and for product promo videos, launch videos and motion videos from a URL. Use when the user says "make a science explainer video", "turn this problem into a walkthrough video", "explain this word", "whiteboard animation", "magazine-style / risograph video", "ink-wash / Chinese painting video", "news explainer video", "explainer video", "promo video", "launch video", "make a video for this website / app", or in Chinese "做个科普视频" "把这道题做成讲解视频" "讲解这个单词" "白板动画" "杂志风 / 孔版印刷 / risograph 视频" "水墨 / 国风视频" "新闻解读视频" "给这个网站 / App 做个宣传片" "产品发布视频" "宣发视频" "折纸 / 波普 / 欧普 / 剪纸 / 字符画（ASCII）/ 皮影戏 / 构成主义 / 包豪斯 / 像素（8-bit 游戏）/ 聊天记录 / 玩具三维（3D 玩具、桌面摆台）风格的视频".'
---

# BB Video

Videos drawn in code: HTML + CSS / SVG / canvas frames, rendered frame by frame in Chrome, sound synthesized in code, assembled with ffmpeg. Every frame is the pure function `renderFrame(t)`, so any frame can be rendered on its own and every render is identical.

Relative paths in this file are relative to this skill's folder.

## One choice: the style

The style is the **only** thing the user picks. It decides how the video looks, moves and sounds — never what it says. If the user names a style, use it; otherwise recommend one from the topic or product and say why in the storyboard. When the user says "try another style", redo the same content in the new style.

| Style | Look | Best for | Explainer | Promo |
|---|---|---|---|---|
| `whiteboard` hand-drawn whiteboard | Drawing on an infinite whiteboard while explaining, camera moves, cartoon characters | Problem walkthroughs, derivations, phenomena, stories that need characters | ✓ | ✓ |
| `riso` risograph | Magazine pages with spot-color overprint, halftone, misregistration; page turns by drum roll | Everyday trivia, psychology, news, finance, data, food, vocabulary | ✓ | ✓ |
| `ink` ink-wash 水墨 | One long handscroll on rice paper: calligraphy stroke by stroke, landscapes, figures, seals | Chinese history and allusions, classical poetry, idioms, culture, nature | ✓ | ✓ |
| `launch` launch-event motion | Stage colour picked from the product (light / dark / brand), words slammed on the beat, real UI in browser windows, camera push-ins, whips, flashes | Most software, SaaS, AI tools, launches; when there are good real screenshots | ✓ | ✓ |
| `origami` paper craft | Paper with light and creases: unfolding reveals, cards dropping on a desk, pop-up books, page turns, paper cranes | Warm consumer products, creation, education, documents and content | ✓ | ✓ |
| `pop` pop art | 1960s comic: thick outlines, Ben-Day dots, panels, speech bubbles, burst sound words, Warhol repeats | Young, playful, social, AI assistants and chat (dialogue becomes comic speech) | ✓ | ✓ |
| `op` op art | Black-and-white stripes, rings, checkerboards and spirals bulging around "lenses"; blinds reveals | Tech, AI, developer tools, music; "precise", "parallel", hypnotic | ✓ | ✓ |
| `cutout` Matisse cut-outs | Gouache paper shapes cut with scissors and pasted on cream paper; whole sheets cover and tear | Creation, learning, community, education, lifestyle | ✓ | ✓ |
| `ascii` ASCII character art | Everything drawn in monospace characters: product images decode out of glyph noise, sharpen as the camera pushes in, then scan into the real photo; typed lines, box-drawing frames | Developer tools, hardware and product lineups, anything "precise"; tech launches with good product images | ✓ | ✓ |
| `shadow` shadow puppets 皮影戏 | A lamp-lit cloth screen in a wooden stage frame; carved, translucent leather puppets in profile with jointed limbs and control rods walk on, talk, bow, ride horses, fall; red paper placards hang down with names and dates; scene changes are the lamp dipping | Chinese history and stories with characters and conflict (who did what to whom), folk culture, a founder's story | ✓ | ✓ |
| `bauhaus` constructivism / Bauhaus | Red and black on printed cream paper with Bauhaus yellow and blue; big circles, thick bars and wedges on diagonals; heavy slogans set at an angle and stamped in letter by letter; things assembled from circles, squares and triangles; a red wedge sweeps across between scenes | Manifestos and launches, how something is built from parts, processes and comparisons, design / architecture / industrial history, tools and productivity | ✓ | ✓ |
| `pixel` pixel art (8-bit game) | A low-resolution game screen blown up to full size: dithered sky bands, parallax hills and cities stepping back one pixel at a time; outlined sprite characters walk, jump, talk and fight; information told through game UI — dialogue boxes typed letter by letter, menus with a ▶ cursor, HP bars filling cell by cell, score counters, a level map; block-dissolve and iris transitions; chiptune music | Games, developer and productivity tools, AI products, step-by-step flows and choices, small stories with characters, tech and gaming history, explainers for kids | ✓ | ✓ |
| `chat` chat log | The story or the information happens in a messaging app: someone is typing, messages pop up and push the thread up, quote cards with their sources, a poem lighting up line by line, a relay checklist, a poll, a route on a map, "X joined the group", a recalled message; the camera pushes into one message while the rest dims. Landscape: a large chat window with a side column; portrait: the app fills the width | Allusions and small history stories told as dialogue, "who said what" explainers with many quoted sources, AI assistants, support and collaboration products | ✓ | ✓ |
| `toy3d` toy 3D | A dark warm desk with the product's real screens as physical slabs (screenshots printed on them) and a matte vinyl toy — the brand mark extruded from its SVG, a mascot, or the characters of a problem — that operates the UI with its body: landing is a click, hopping along a row types, carrying is a drag; keys rise out of the slab and sink under it; keycaps spell numbers and equations. Separate low, long-lens shots with very shallow focus, hard-cut on the beat with the toy mid-air across each cut; glow only on what is being shown. Toys are built in Blender when the machine has it (seamless vinyl), otherwise in three.js from the same part list | Software with a real UI and a step-by-step flow (editors, boards, IDEs, apps), brands with a mark or mascot; explainers where the things themselves act (counting, grouping, swapping) | ✓ | ✓ (hand-written only) |

**Stories with named people** follow `styles/CHARACTERS.md` in every style (fixed cast, people told apart at a glance, face-to-face scenes, relays); only whiteboard, ink, shadow, pixel and chat have characters — recommend one of them for character-driven stories.

Each style lives in `styles/<name>/`: its `STYLE.md` (same outline for every style: `styles/TEMPLATE.md`, Chinese `styles/TEMPLATE.zh.md`) and its starter files. **Once a style is chosen, read its STYLE.md before writing any drawing code.**

Every style makes both kinds of video. Each style was born in one workflow and reaches the other through the common interface (`promo/runtime/kit.js`: the same verbs — big word, sentence, card, real screenshot, signature move, transition, end card — drawn in every style's own material):

| | Explainer (with a voiceover) | Promo (on the beat, no voiceover) |
|---|---|---|
| `whiteboard` `riso` `ink` | native: `node explainer/scripts/new.mjs <dir> --style …` — full board API, characters, formulas | `node promo/scripts/new.mjs <dir> --style … [--quick]` — the board runs inside a promo film: scenes are board regions / pages / scroll sections, transitions are pans / page changes / scroll moves |
| `launch` `origami` `pop` `op` `cutout` `ascii` `shadow` `bauhaus` `pixel` `chat` `toy3d` | `node explainer/scripts/new.mjs <dir> --style …` — creates a narration-paced project (voiceover + captions; cues timed to the narration, `promo/references/kit.md`, "Following the voiceover" | native: `node promo/scripts/new.mjs <dir> --style …` — the style's full component set |

The native side has the richest tools (whiteboard formulas and characters; origami folds; op lenses…); the other side covers what most videos need. When a video needs something only the native side has (a formula in a cut-out explainer, a folding animation in a riso promo), say so and offer the native style for that part.

## What kind of video: read it from the request

The user does not pick this; it follows from what they ask for.

| The user wants… | Workflow | Guide |
|---|---|---|
| To explain something: a phenomenon, a problem, a word, a concept, a story, a tutorial, the news — with a voiceover | **Explainer** (narration-driven: voiceover → timeline → visuals timed to each line; captions; background music) | `explainer/GUIDE.md` |
| To promote a product: a website, an app, software, a launch — no voiceover | **Promo** (beat-driven: research and fact sheet → visuals on the beat; synthesized score and sound effects; 16:9 + 9:16) | `promo/GUIDE.md` |

Both workflows run on one engine (`core/`): the same clock and runtime core, one renderer and one sound pipeline — voiceover, music and sound effects mixed together, music ducking under the voice, loudness normalized. So a promo can have a voiceover with captions (`promo/GUIDE.md`, step 5) and an explainer can cut on the beat (`EV.beats`). A project made with a style from the other side follows the workflow of the kind of video (explainer steps for an explainer), using the renderer of the engine that draws it (`promo/scripts/render.mjs` for the promo-born styles).

Read the matching guide and follow it from step 1. Inside each guide, how the story is told is also chosen for the user, not by them: explainer content modes in `explainer/references/modes.md`, promo tellings in `promo/references/structure.md`.

Paths inside a guide are relative to that guide's folder: run `node explainer/scripts/…` / `python3 explainer/scripts/tts.py …` for explainers and `node promo/scripts/…` for promos (from this skill's folder, or with the full path).

## Rules for every video

- **Facts first.** Verify facts, numbers and quotes before drawing; write them into the project's `brief.md`. Every piece of on-screen text must be traceable there.
- **Animation libraries are allowed** (GSAP, Three.js, Matter.js, opentype.js…), but time always comes from our clock: libraries are seeked to `t`, never run on their own clock or callbacks (`promo/references/motion.md`, "Animation libraries").
- **Self-review before delivering**: the automatic checks, the contact sheet / stills, and the frame check of the rendered video, as each guide describes.
- **Language**: unless told otherwise, the video is in the language the user writes in.
- **Never log in, never enter passwords** on sites you research; research is read-only.

## Adding a style

Write `styles/<name>/STYLE.md` from the template, its runtime, starter files and sound, in the workflow it runs on. For promo styles, also register the style's common interface in `promo/runtime/kit.js` (`promo/references/kit.md`). Add the style to the table above.
