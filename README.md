# BubbleSkill

Agent skills for making videos **in pure code** — no editing app, no animation library, no stock footage.
Every frame is drawn with HTML + SVG as a pure function of time, rendered frame by frame in headless Chrome and encoded with ffmpeg.

[中文说明](README.zh-CN.md)

## Skills

| Skill | What it makes |
|---|---|
| [`explainer-video`](skills/explainer-video) | Narrated explainer videos with captions and background music, in two visual styles: a hand-drawn **whiteboard** and a magazine-like **risograph** print look |

### explainer-video

Give the agent a topic, a problem, a word or a story; it writes the narration, plans a storyboard, voices it, draws it and renders an mp4.

- **Content modes**: phenomenon explainers ("why is the sky blue"), problem walkthroughs (math / physics / chemistry, including screenshots of problems), English vocabulary, concept explainers, historical stories, how-to tutorials, everyday trivia, news and data explainers.
- **Two styles**
  - `whiteboard`: an infinite hand-drawn canvas with camera moves, handwriting, arrows and circles, KaTeX formulas, and cartoon characters that talk, point and change expression.
  - `riso`: spot-color overprint, halftone and slight ink misregistration; one magazine page per chapter with print-roller page turns.
- **Everything built in**: edge-tts voiceover with word-level timing, captions synced to the voice, background music synthesized in code, images and video clips, a cover frame, and a "board overview" image of the whole video.
- **Self-checking**: a lint check catches overlapping text, elements that leave too fast, things outside the frame and more, before anything is rendered.
- **Speaks your language**: the video is made in the language you write your request in, unless you ask for another one. Chinese and English are fully tuned (voices, pacing, fonts, caption line-breaking); Japanese, Korean, French, German, Spanish and others work with any [edge-tts voice](https://github.com/rany2/edge-tts).

## Install

With the [`skills`](https://github.com/vercel-labs/skills) CLI (works with Claude Code, Codex, Cursor, OpenCode and many other agents):

```bash
npx skills add DylanDDeng/BubbleSkill                       # pick the skills / agents interactively
npx skills add DylanDDeng/BubbleSkill --skill explainer-video -a claude-code -g   # install globally for Claude Code
```

Or copy the folder yourself:

```bash
git clone https://github.com/DylanDDeng/BubbleSkill.git
cp -r BubbleSkill/skills/explainer-video ~/.claude/skills/
```

### Requirements

The skill has **no npm dependencies**. It needs:

- **Node.js 18+**
- **Google Chrome** or Chromium (set `CHROME_PATH` if it is not in the default location)
- **ffmpeg** on your `PATH`
- **Python 3** and **[edge-tts](https://github.com/rany2/edge-tts)** for the voiceover (`pip install edge-tts`, or let the script tell you how to set up a venv)
- An internet connection for the voiceover and web fonts (fonts fall back to local ones when offline)

## Usage

Just ask your agent, for example:

- "Make a whiteboard explainer video: why is the sky blue?"
- "Turn this geometry problem into a walkthrough video" (attach a screenshot)
- "Explain the word *serendipity* in a short video"
- "Make a risograph-style news explainer: why are egg prices rising?"
- "用白板动画讲一下牛顿第一定律"

The agent will show you the narration and storyboard first, then voice, draw and render the video. Output goes to `videos/<name>/out/`: the mp4, a cover image and a board overview image. You can also open `videos/<name>/index.html` in a browser to preview and scrub through the animation.

## How it works

```
script.json (narration) ──► tts.py ──► audio + word-level timeline
index.html  (drawing code, renderFrame(t)) ──► render.mjs ──► Chrome, frame by frame ──► ffmpeg ──► mp4
                                                     └─► lint check, captions, background music
```

Because each frame is a pure function of time, renders are deterministic and can run in parallel, and the agent can review any moment as a still before rendering the whole video.

## License

[MIT](LICENSE). Bundled third-party code: [KaTeX](https://katex.org) (MIT, see `skills/explainer-video/runtime/katex/LICENSE`). Fonts are loaded from public CDNs under their own licenses (LXGW WenKai, Excalifont, Noto Sans/Serif SC, Oswald — all SIL OFL 1.1).
