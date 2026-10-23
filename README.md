# BB Video

An agent skill for making videos **in pure code** — no editing app, no stock footage.
Every frame is drawn with HTML / SVG / canvas as a pure function of time, rendered frame by frame in headless Chrome, with music and sound effects synthesized in code, and encoded with ffmpeg.

[中文说明](README.zh-CN.md)

## The skill

| Skill | What it makes |
|---|---|
| [`bb-video`](skills/bb-video) | **Explainer videos** with voiceover, captions and background music, and **promo / launch videos** for websites, apps and software with beat-synced music and sound effects — 16:9 and 9:16, in 14 visual styles |

You make one choice: **the style**. Everything else (narration, storyboard, voice, music, sound, layout, checks) is the agent's job.

| Style | Looks like |
|---|---|
| `whiteboard` | an infinite hand-drawn board: handwriting, arrows, KaTeX formulas, cartoon characters that talk and point; ends on a numbered "knowledge map" |
| `riso` | risograph print: spot-colour overprint, halftone, slight misregistration, one magazine page per chapter |
| `ink` | ink-wash handscroll (水墨): brush strokes, seals, figures in Chinese painting style |
| `launch` | launch-event motion design: big type, product screens, light / dark / brand-colour stages |
| `origami` | folded paper: creases, shading, paper unfolding into the next scene |
| `pop` | pop art: Ben-Day dots, bold outlines, comic panels |
| `op` | op art: moving black-and-white fields (WebGL) |
| `cutout` | Matisse paper cut-outs |
| `ascii` | ASCII character art |
| `shadow` | shadow puppetry (皮影戏): carved, translucent leather puppets on a lamp-lit screen |
| `bauhaus` | constructivism / Bauhaus: geometry, primary colours, diagonal type |
| `pixel` | 8-bit game: sprites, game UI, chiptune |
| `chat` | the story told in a messaging app: bubbles, typing, voice notes, cards |
| `toy3d` | toy 3D: the product's real UI as physical slabs on a desk, a matte vinyl toy hopping across it (three.js) |

What it covers:

- **Explainers**: phenomena ("why is the sky blue"), problem walkthroughs (including screenshots of problems), vocabulary, concepts, historical stories, how-tos, trivia, news and data.
- **Promos**: give it a URL; it researches the site (text, numbers, colours), captures screenshots, and builds a beat-driven promo with the product's real UI and brand colours.
- **Everything built in**: edge-tts voiceover with word-level timing, captions, music and sound effects synthesized in code, a cover frame, portrait (9:16) versions.
- **Self-checking**: before rendering, a lint check reports overlaps, text that leaves before it can be read, things off-frame, facts on screen that aren't in the brief, thin information, motion problems; after rendering, a frame check reports jumps, one-frame flashes and dead air (seconds of music with nothing new on screen).
- **Speaks your language**: the video follows the language of your request. Chinese and English are fully tuned; other languages work with any [edge-tts voice](https://github.com/rany2/edge-tts).

## Install

With the [`skills`](https://github.com/vercel-labs/skills) CLI (Claude Code, Codex, Cursor, OpenCode and other agents):

```bash
npx skills add DylanDDeng/BB-Video                                          # pick interactively
npx skills add DylanDDeng/BB-Video --skill bb-video -a claude-code -g   # globally for Claude Code
```

Or copy the folder yourself:

```bash
git clone https://github.com/DylanDDeng/BB-Video.git
cp -r BB-Video/skills/bb-video ~/.claude/skills/
```


### Requirements

No npm dependencies. It needs:

- **Node.js 18+**
- **Google Chrome** or Chromium (set `CHROME_PATH` if it is not in the default location)
- **ffmpeg** on your `PATH`
- **Python 3** and **[edge-tts](https://github.com/rany2/edge-tts)** for the voiceover (`pip install edge-tts`)
- An internet connection for the voiceover, web fonts and the few libraries some styles load from jsDelivr (three.js for `toy3d`; GSAP / Matter.js only if a page asks for them)
- Optional: [Blender](https://www.blender.org) 3.6+ for `toy3d` mascots (otherwise three.js builds them)

## Usage

Just ask your agent, for example:

- "Make a whiteboard explainer: why is the sky blue?"
- "Turn this geometry problem into a walkthrough video" (attach a screenshot)
- "Make a launch video for https://example.com, 16:9 and 9:16"
- "Tell the story of 刘邦斩白蛇 as a shadow-puppet video"
- "用聊天记录风格讲一个历史典故"

The agent shows you the facts, narration and storyboard first, then voices, draws and renders. Output goes to `videos/<name>/out/` (mp4, cover, and for whiteboard / riso a board overview image). Open `videos/<name>/index.html` in a browser to preview and scrub.

## How it works

```
script.json (narration) ──► tts.py ──► audio + word-level timeline
index.html  (drawing code, renderFrame(t)) ──► render.mjs ──► Chrome, frame by frame ──► ffmpeg ──► mp4
                                                     ├─► lint check, captions, music + sound effects
                                                     └─► frame check (jumps, flashes, dead air)
```

Each frame is a pure function of time, so renders are deterministic and parallel, and the agent can look at any moment as a still before rendering the whole video.

## Privacy & security

- **Narration text is sent to Microsoft's online speech service** (that is how edge-tts works). Don't put confidential material in the narration.
- **Promo research opens the website you give it** in headless Chrome and takes screenshots (no logins, no downloads of site files).
- Web fonts and libraries come from jsDelivr / unpkg at pinned versions. Nothing else goes over the network: no telemetry, no API keys, no accounts.
- `render.mjs` opens a project's `index.html` in headless Chrome with local file access, which means running that project's code. Render only projects you or your agent made.

## License

[MIT](LICENSE). Bundled third-party code: [KaTeX](https://katex.org) (MIT, see `skills/bb-video/explainer/runtime/katex/LICENSE`). Loaded from CDNs under their own licenses: three.js (MIT), GSAP (Standard "no charge" license), Matter.js (MIT); fonts LXGW WenKai, Excalifont, Noto Sans / Serif SC, Inter, Oswald and others (SIL OFL 1.1).
