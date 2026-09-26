---
name: explainer-video
description: 用纯代码制作知识讲解视频（手绘白板风格），自带配音和字幕，输出 mp4。适用于：现象科普（"为什么天空是蓝的"）、题目讲解（数学/物理/化学题，包括题目截图）、英文单词讲解、概念讲解、典故和历史故事（"萧何月下追韩信""破釜沉舟"）。用户说"做个科普视频""把这道题做成讲解视频""讲解这个单词""白板动画""explainer video"时使用。
---

# 知识讲解视频

用 HTML + SVG 自己写画面，Chrome 逐帧渲染，edge-tts 配音，ffmpeg 合成。
不用任何第三方动画库：所有动画都是 `renderFrame(t)` 这个纯函数画出来的。

本文件里的相对路径都相对于这个 skill 的目录。

## 目录
- `styles/whiteboard/STYLE.md`：手绘白板的风格规则和完整 API。**写画面代码之前必须读。**
- `references/modes.md`：各种内容（现象、题目、单词、概念、典故 / 历史故事）的讲法。**写脚本之前必须读对应的那一节。**
- `references/characters.md`：卡通角色（Notion 风格）的设计方法、规格参数和表演原则。**视频里要出现人物时必须读。**
- `references/review.md`：自检清单。
- `scripts/new.mjs` 新建项目 · `scripts/tts.py` 配音和时间轴 · `scripts/render.mjs` 渲染 · `scripts/cast.mjs` 角色定妆图

## 工作流程

### 1. 理解输入，确定内容
- 判断内容模式（现象 / 题目 / 单词 / 概念 / 典故），读 `references/modes.md` 对应的一节。
- **题目讲解**：先完整解题，再用 Python 验算，把题目转写、解答和验算结果写进项目的 `brief.md`。截图题的转写要先给用户确认。
- **典故 / 历史故事**：先查出处原文，区分史实和后世演绎（戏曲、小说加的情节），把人物、时间、原话写进 `brief.md`。
- 风格默认用 `whiteboard`；用户指定了别的风格，但还没有实现的，就如实告诉用户。

### 2. 新建项目，写旁白和分镜
```bash
node scripts/new.mjs videos/<英文短名>
```
- `script.json`：旁白，一句一个对象（格式见下）。
- `storyboard.md`：分镜表，每一句写清楚画面上画什么、在哪个区域、镜头怎么动。先规划整张白板的区域布局，再逐句安排。
- 需要人物时：按 `references/characters.md` 的方法设计角色，写进 `characters.js`，并在分镜里标出角色的出场、表情和台词。用 `node scripts/cast.mjs videos/<名字>` 渲染定妆图，**新角色要连同定妆图一起给用户确认**。

**把旁白和分镜给用户过目**，得到确认后再往下做。用户说"直接做"就跳过确认。

### 3. 配音，生成时间轴
```bash
python3 scripts/tts.py videos/<名字>
```
生成 `audio/narration.m4a`、`timeline.json`、`timeline.js`（含每句、每个词的时间）。
改了旁白就重新运行；没改的句子有缓存，不会重新合成。

### 4. 写画面：一个镜头一个镜头来
编辑 `index.html`，按分镜顺序写 `build` 里的代码。**所有时间都从时间轴取**（`T.start`、`T.word` 等），不要手写秒数。
每写完 2–3 个镜头，就用截图检查一下：
```bash
node scripts/render.mjs videos/<名字> --stills 5.2,9.8
```
然后用 Read 查看 `review/still-*.png`。

### 5. 总体自检（分三步，缺一不可）
```bash
node scripts/render.mjs videos/<名字> --check            # ① 自动检查
node scripts/render.mjs videos/<名字> --sheet            # ② 静态总览
node scripts/render.mjs videos/<名字> --strip 14,17      # ③ 动画过程
```
1. **自动检查**：找出只有"动起来"才会暴露的问题，例如还没画完就被擦掉、画完停留太短、画在镜头外、压住字幕、边画边移镜头、元素重叠、角色指向画面外。报告里有时间和 `index.html` 的行号。**错误必须全部修掉，提醒要逐条确认。**
2. **静态总览**：每句旁白结束时的画面，检查版面。
3. **动画过程**：总览图只看得到"结果"，看不到"过程"。对自动检查报出的时间点，以及每一处擦除、镜头移动、角色动作，都用 `--strip 开始,结束` 看连续 8 帧。

按 `references/review.md` 逐项检查、修改，直到全部通过。

### 6. 渲染成片
```bash
node scripts/render.mjs videos/<名字>            # → out/video.mp4（1080p 30fps）；自动检查有错误时会拒绝渲染
node scripts/render.mjs videos/<名字> --draft    # 半分辨率快速版，想先看节奏时用
```
可选背景音乐：`--bgm 音乐文件 --bgm-volume 0.1`。
成片渲染完会**同时导出整块白板的全貌大图** `out/board.png`：所有内容画完后的样子，不含字幕和进度条，可以当"知识地图"单独发。只想导出这张图：`node scripts/render.mjs videos/<名字> --board`。
最后告诉用户成片和全貌图的路径，以及在浏览器里直接打开 `index.html` 可以预览、拖动进度条（空格播放暂停）。

## script.json 格式
```json
{
  "voice": "zh-CN-XiaoxiaoNeural",
  "rate": "+0%",
  "lead_in": 0.6, "gap": 0.35, "tail": 1.5,
  "lines": [
    { "id": "hook", "text": "苹果为什么会往下掉，而不是往天上飞？", "chapter": "提出问题" },
    { "id": "word", "text": "serendipity", "voice": "en-US-AvaNeural", "rate": "-15%" },
    { "id": "beat", "silence": 1.0 },
    { "id": "why1", "text": "……", "pause_after": 0.6, "chapter": "真正的原因" }
  ]
}
```
`chapter`：新的一章从这一句开始，画面顶部会自动出现章节进度条（至少 2 章才出现）。一般 3–6 章，每章标题 2–6 个字，对应 `references/modes.md` 里结构的大段。

常用声音：`zh-CN-XiaoxiaoNeural`（女声，温暖，默认）、`zh-CN-YunxiNeural`（男声，活泼）、`zh-CN-YunyangNeural`（男声，播音腔）、`en-US-AvaNeural` / `en-US-AndrewNeural`（英文）。

## 硬规则
1. **画面是时间的纯函数**：不用 `Math.random()`（要随机就用 `EV.rng(seed)`），不用 `Date.now()`、`requestAnimationFrame`、CSS 动画和 transition。
2. **画面跟着旁白走**：每个元素出现的时间都要锚定到旁白的某句话或某个词。
3. **题目的答案必须经过验算**才能做进视频。
4. 屏幕上写关键词，不照抄旁白。
5. 每次改完画面都要截图检查，不能凭想象判断效果；**动态的效果（擦除、移动、镜头、角色动作）必须看动画条**。
6. 运行时（`lib/`）是共用的基础设施；某个视频需要特殊效果时，直接在该项目的 index.html 里写，不要改 `lib/`。
7. **追求通用，不做个案**：发现运行时缺少某种能力时，要把它做成对任何视频都适用的通用功能（参数化、可组合），而不是为当前这个题目写死一段代码。
