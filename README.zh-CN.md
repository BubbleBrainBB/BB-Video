# BubbleSkill

用**纯代码**做视频的 Agent Skills——不用剪辑软件、不用动画库、不用素材库。
每一帧都由 HTML + SVG 按时间画出来（画面是时间的纯函数），用无界面 Chrome 逐帧渲染，再用 ffmpeg 编码成视频。

[English](README.md)

> Skill 本身（SKILL.md、文档、代码注释）是英文写的，但完全支持制作中文视频：中文字幕、中文标点断句、中文字体、中文配音都处理好了，用中文提需求也能正常触发。

## 包含的 Skills

| Skill | 做什么 |
|---|---|
| [`explainer-video`](skills/explainer-video) | 带配音、字幕和配乐的知识讲解视频，两种画面风格：**手绘白板**和**孔版印刷**（杂志 / 报刊风） |

### explainer-video

给 Agent 一个话题、一道题、一个单词或一个故事，它会写旁白、做分镜、配音、作画，最后渲染成 mp4。

- **内容类型**：现象科普（"为什么天空是蓝的"）、题目讲解（数学 / 物理 / 化学题，可以直接给题目截图）、英文单词、概念讲解、典故和历史故事、做法教程、生活冷知识、新闻解读和数据类干货。
- **两种风格**
  - `whiteboard` 手绘白板：无限画布 + 镜头移动，手写文字、箭头、圈注、KaTeX 公式，还有会说话、会指东西、会换表情的卡通人物。
  - `riso` 孔版印刷：专色叠印、网点、轻微的套色错位；一章一页杂志版面，印刷滚筒翻页。
- **全部内置**：edge-tts 配音（带逐词时间轴）、跟着语音走的字幕、代码合成的背景音乐、图片和视频素材、封面帧、整片的"全貌图"。
- **自动检查**：渲染之前先检查文字重叠、元素停留太短、超出画面等问题。

## 安装

用 [`skills`](https://github.com/vercel-labs/skills) 命令行工具安装（支持 Claude Code、Codex、Cursor、OpenCode 等几十种 Agent）：

```bash
npx skills add DylanDDeng/BubbleSkill                       # 交互式选择要装的 skill 和 Agent
npx skills add DylanDDeng/BubbleSkill --skill explainer-video -a claude-code -g   # 直接全局装到 Claude Code
```

或者手动复制：

```bash
git clone https://github.com/DylanDDeng/BubbleSkill.git
cp -r BubbleSkill/skills/explainer-video ~/.claude/skills/
```

### 运行环境

这个 skill **没有任何 npm 依赖**，需要：

- **Node.js 18+**
- **Google Chrome** 或 Chromium（不在默认位置时设置 `CHROME_PATH`）
- **ffmpeg**（在 `PATH` 里）
- **Python 3** 和 **[edge-tts](https://github.com/rany2/edge-tts)**，用来配音（`pip install edge-tts`；没装时脚本会告诉你怎么建虚拟环境）
- 联网：配音和网络字体需要联网（没网时字体会回退到本机字体）

## 怎么用

直接对 Agent 说，例如：

- "做一个白板动画：为什么天空是蓝的？"
- "把这道几何题做成讲解视频"（附上截图）
- "做个短视频讲解单词 serendipity"
- "做一个杂志风的新闻解读视频：鸡蛋为什么涨价？"
- "萧何月下追韩信，做成白板动画"

Agent 会先给你看旁白和分镜，确认后再配音、作画、渲染。成片在 `videos/<名字>/out/`：mp4、封面图和全貌图。也可以在浏览器里直接打开 `videos/<名字>/index.html` 预览、拖动进度条。

## 原理

```
script.json（旁白）──► tts.py ──► 配音 + 逐词时间轴
index.html（作画代码，renderFrame(t)）──► render.mjs ──► Chrome 逐帧截图 ──► ffmpeg ──► mp4
                                                   └─► 自动检查、字幕、背景音乐
```

因为每一帧都是时间的纯函数，渲染结果是确定的、可以并行；Agent 也可以在渲染整片之前，先截任意时刻的画面检查。

## 许可

[MIT](LICENSE)。打包的第三方代码：[KaTeX](https://katex.org)（MIT，见 `skills/explainer-video/runtime/katex/LICENSE`）。字体从公共 CDN 加载，遵循各自的许可（霞鹜文楷 LXGW WenKai、Excalifont、Noto Sans/Serif SC、Oswald，均为 SIL OFL 1.1）。
