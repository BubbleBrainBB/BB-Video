# BB Video

An agent skill for making videos **in pure code** — no editing app, no stock footage.
Every frame is drawn with HTML / SVG / canvas as a pure function of time, rendered frame by frame in headless Chrome, with music and sound effects synthesized in code, and encoded with ffmpeg.

[中文说明](README.zh-CN.md)

## The skill

| Skill | What it makes |
|---|---|
| [`bb-video`](skills/bb-video) | **Explainer videos** with voiceover, captions and background music, and **promo / launch videos** for websites, apps and software with beat-synced music and sound effects — 16:9 and 9:16, in 16 visual styles |

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
| `newsreel` | a 1930s cinema newsreel: archive photos with source tags, supers and rubber stamps on scratchy black-and-white film, intertitles, a brass march |
| `filmroom` | a coach's film session: real footage stops, a pen rings the player and draws her path, rewind and slow-motion replay with a tracked ring; a top-down tactics board and shot charts from game data |

What it covers:

- **Explainers**: phenomena ("why is the sky blue"), problem walkthroughs (including screenshots of problems), vocabulary, concepts, historical stories, how-tos, trivia, news and data.
- **Promos**: give it a URL; it researches the site (text, numbers, colours), captures screenshots, and builds a beat-driven promo with the product's real UI and brand colours.
- **Everything built in**: edge-tts voiceover with word-level timing, captions, music and sound effects synthesized in code, a cover frame, portrait (9:16) versions.
- **Self-checking**: before rendering, a lint check reports overlaps, text that leaves before it can be read, things off-frame, facts on screen that aren't in the brief, thin information, motion problems; after rendering, a frame check reports jumps, one-frame flashes and dead air (seconds of music with nothing new on screen).
- **Speaks your language**: the video follows the language of your request. Chinese and English are fully tuned; other languages work with any [edge-tts voice](https://github.com/rany2/edge-tts).

<!-- gallery:start -->
## Examples

One sample per style, all made with this skill (GIFs are 7 s cuts; the full mp4s with sound are on the [samples release](https://github.com/DylanDDeng/BB-Video/releases/tag/samples)). Narration is in Chinese; the three website promos are music-only.

<table>
<tr>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/whiteboard.mp4"><img src="examples/whiteboard/preview.gif" width="100%" alt="whiteboard"></a><br>
<b><code>whiteboard</code></b> · Liu Bang slays the white snake (a Han-dynasty legend)<br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/whiteboard.mp4">Full video</a>
</td>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/riso.mp4"><img src="examples/riso/preview.gif" width="100%" alt="riso"></a><br>
<b><code>riso</code></b> · Grok Bot, a kinetic promo<br>
<sub>Unofficial demo · not affiliated with xAI / Grok · footage from its public website</sub><br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/riso.mp4">Full video</a>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/ink.mp4"><img src="examples/ink/preview.gif" width="100%" alt="ink"></a><br>
<b><code>ink</code></b> · The Tang poem "On Stork Tower"<br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/ink.mp4">Full video</a>
</td>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/launch.mp4"><img src="examples/launch/preview.gif" width="100%" alt="launch"></a><br>
<b><code>launch</code></b> · Grok Bot, a launch film<br>
<sub>Unofficial demo · not affiliated with xAI / Grok · footage from its public website and app</sub><br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/launch.mp4">Full video</a>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/origami.mp4"><img src="examples/origami/preview.gif" width="100%" alt="origami"></a><br>
<b><code>origami</code></b> · Why is the sky blue?<br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/origami.mp4">Full video</a>
</td>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/pop.mp4"><img src="examples/pop/preview.gif" width="100%" alt="pop"></a><br>
<b><code>pop</code></b> · Why is the sky blue?<br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/pop.mp4">Full video</a>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/op.mp4"><img src="examples/op/preview.gif" width="100%" alt="op"></a><br>
<b><code>op</code></b> · Stripe, from its homepage<br>
<sub>Unofficial demo · not affiliated with Stripe · footage from its public website</sub><br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/op.mp4">Full video</a>
</td>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/cutout.mp4"><img src="examples/cutout/preview.gif" width="100%" alt="cutout"></a><br>
<b><code>cutout</code></b> · Why is the sky blue?<br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/cutout.mp4">Full video</a>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/ascii.mp4"><img src="examples/ascii/preview.gif" width="100%" alt="ascii"></a><br>
<b><code>ascii</code></b> · What is ASCII?<br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/ascii.mp4">Full video</a>
</td>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/shadow.mp4"><img src="examples/shadow/preview.gif" width="100%" alt="shadow"></a><br>
<b><code>shadow</code></b> · Liu Bang slays the white snake, with character voices<br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/shadow.mp4">Full video</a>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/bauhaus.mp4"><img src="examples/bauhaus/preview.gif" width="100%" alt="bauhaus"></a><br>
<b><code>bauhaus</code></b> · The Bauhaus: a school that lasted fourteen years<br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/bauhaus.mp4">Full video</a>
</td>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/pixel.mp4"><img src="examples/pixel/preview.gif" width="100%" alt="pixel"></a><br>
<b><code>pixel</code></b> · Why old Famicom games had so few colours<br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/pixel.mp4">Full video</a>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/chat.mp4"><img src="examples/chat/preview.gif" width="100%" alt="chat"></a><br>
<b><code>chat</code></b> · Lychees for Lady Yang, told as a group chat<br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/chat.mp4">Full video</a>
</td>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/toy3d.mp4"><img src="examples/toy3d/preview.gif" width="100%" alt="toy3d"></a><br>
<b><code>toy3d</code></b> · Linear website promo<br>
<sub>Unofficial demo · not affiliated with Linear · footage from its public website</sub><br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/toy3d.mp4">Full video</a>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/newsreel.mp4"><img src="examples/newsreel/preview.gif" width="100%" alt="newsreel"></a><br>
<b><code>newsreel</code></b> · The 2026 Tesla Roadster reveal, as a 1930s newsreel<br>
<sub>Not affiliated with Tesla · photos from Wikimedia Commons (CC0 / public domain / CC BY 2.0 Steve Jurvetson)</sub><br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/newsreel.mp4">Full video</a>
</td>
<td width="50%" valign="top">
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/filmroom.mp4"><img src="examples/filmroom/preview.gif" width="100%" alt="filmroom"></a><br>
<b><code>filmroom</code></b> · How one basket happened: Fenerbahçe vs Samsun Canik, 2018<br>
<sub>Game footage: TBF, CC BY 3.0, via Wikimedia Commons</sub><br>
<a href="https://github.com/DylanDDeng/BB-Video/releases/download/samples/filmroom.mp4">Full video</a>
</td>
</tr>
</table>
<!-- gallery:end -->

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
- **Archive photo search** (`footage.mjs`, used when a film needs real photos you didn't supply) sends the search words to the Wikimedia Commons API, and downloads only the files you approve, with their licence and credit.
- Web fonts and libraries come from jsDelivr / unpkg at pinned versions. Nothing else goes over the network: no telemetry, no API keys, no accounts.
- `render.mjs` opens a project's `index.html` in headless Chrome with local file access, which means running that project's code. Render only projects you or your agent made.

## License

[MIT](LICENSE). Bundled third-party code: [KaTeX](https://katex.org) (MIT, see `skills/bb-video/explainer/runtime/katex/LICENSE`). Loaded from CDNs under their own licenses: three.js (MIT), GSAP (Standard "no charge" license), Matter.js (MIT); fonts LXGW WenKai, Excalifont, Noto Sans / Serif SC, Inter, Oswald and others (SIL OFL 1.1).
