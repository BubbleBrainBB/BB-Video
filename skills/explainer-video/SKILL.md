---
name: explainer-video
description: 用纯代码制作知识讲解视频，自带配音、字幕和配乐，输出 mp4。两种画面风格：手绘白板、孔版印刷（杂志 / 报刊风）。适用于：现象科普（"为什么天空是蓝的"）、题目讲解（数学/物理/化学题，包括题目截图）、英文单词、概念讲解、典故和历史故事（"萧何月下追韩信"）、做法教程、生活冷知识、心理和社会话题、新闻解读和数据类干货（"鸡蛋为什么涨价"）。用户说"做个科普视频""把这道题做成讲解视频""讲解这个单词""白板动画""杂志风 / 孔版印刷 / risograph 视频""新闻解读视频""explainer video"时使用。
---

# 知识讲解视频

用 HTML + SVG 自己写画面，Chrome 逐帧渲染，edge-tts 配音，ffmpeg 合成。
不用任何第三方动画库：所有动画都是 `renderFrame(t)` 这个纯函数画出来的。

本文件里的相对路径都相对于这个 skill 的目录。

## 目录
- `styles/whiteboard/STYLE.md`：手绘白板的风格规则和完整 API。
- `styles/riso/STYLE.md`：孔版印刷的风格规则和完整 API。**选定风格后，写画面代码之前必须读对应的那一份。**
- `references/modes.md`：各种内容（现象、题目、单词、概念、典故 / 历史故事）的讲法。**写脚本之前必须读对应的那一节。**
- `references/characters.md`：卡通角色（Notion 风格）的设计方法、规格参数和表演原则。**视频里要出现人物时必须读。**
- `references/review.md`：自检清单。
- `scripts/new.mjs` 新建项目 · `scripts/tts.py` 配音和时间轴 · `scripts/render.mjs` 渲染 · `scripts/cast.mjs` 角色定妆图 · `scripts/bgm.mjs` 背景音乐（代码合成） · `scripts/assets.mjs` 整理图片 / 视频素材

## 工作流程

### 1. 理解输入，确定内容
- 判断内容模式（现象 / 题目 / 单词 / 概念 / 典故 / 教程 / 新闻解读），读 `references/modes.md` 对应的一节。
- **题目讲解**：先完整解题，再用 Python 验算，把题目转写、解答和验算结果写进项目的 `brief.md`。截图题的转写要先给用户确认。
- **典故 / 历史故事**：先查出处原文，区分史实和后世演绎（戏曲、小说加的情节），把人物、时间、原话写进 `brief.md`。
- **新闻解读 / 数据类**：先核实事实和数字，记下来源和日期，写进 `brief.md`。
- **选风格**：用户指定了就用用户的；没指定时按题材推荐：

| 风格 | 画面 | 推荐题材 |
|---|---|---|
| `whiteboard` 手绘白板 | 白板上边讲边画，无限画布 + 镜头移动，可以有卡通人物 | 题目讲解、概念推导、现象科普、历史典故、需要人物表演的故事 |
| `riso` 孔版印刷 | 专色叠印、网点、套色错位的杂志版面，一章一页，滚筒翻页 | 生活冷知识、心理 / 社会话题、新闻解读、财经、数据对比、美食教程、英文单词 |

  孔版印刷暂不支持人物和公式；古代历史、严肃沉重的话题不适合它。用户指定了还没实现的风格，就如实告诉用户。

### 2. 新建项目，写旁白和分镜
```bash
node scripts/new.mjs videos/<英文短名>                 # 手绘白板
node scripts/new.mjs videos/<英文短名> --style riso    # 孔版印刷
```
- `script.json`：旁白，一句一个对象（格式见下）。
- `storyboard.md`：分镜表，每一句写清楚画面上画什么、在哪个位置。白板风格先规划整张白板的区域布局和镜头路线；孔版印刷先规划每一页（一章一页）的版式和配色。
- **封面**：在分镜里写明封面的标题、副标题和主视觉（见对应 STYLE.md 的"封面"）。`script.json` 的 `lead_in`：白板约 1.9 秒，孔版印刷约 2.3 秒（新建项目时已按风格设好）。
- 需要人物时（仅白板风格）：按 `references/characters.md` 的方法设计角色，写进 `characters.js`，并在分镜里标出角色的出场、表情和台词。用 `node scripts/cast.mjs videos/<名字>` 渲染定妆图，**新角色要连同定妆图一起给用户确认**。

**把旁白和分镜给用户过目**，得到确认后再往下做。用户说"直接做"就跳过确认。

**用到图片或视频时**（照片、截图、录屏、用户给的素材）：把原始文件放进项目的 `assets/src/`，运行
```bash
node scripts/assets.mjs videos/<名字>
```
图片会缩到合适大小，视频会抽成 30fps 的逐帧图片（画面仍然是时间的纯函数），并生成清单 `assets/manifest.js`。一个长视频只用其中几段时，写 `assets/clips.json`（格式见脚本开头的说明）。画面里用 `b.photo()`（白板）/ `b.image()`（孔版印刷）放素材，见对应 STYLE.md 的"图片和视频"。素材有版权的，只用用户提供的或允许使用的。
旧项目要用素材：先 `--update-lib`，再在 index.html 里 `timeline.js` 之前加上 `<script src="lib/media.js"></script>` 和 `<script src="assets/manifest.js"></script>`。

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
背景音乐按 script.json 的 `bgm` 自动生成混入；临时关掉用 `--no-bgm`，换风格用 `--bgm-style calm`，改用自己的音乐文件用 `--bgm 文件 --bgm-volume 0.1`。
成片渲染完会**同时导出封面** `out/cover.png`（就是视频第一帧，可以单独上传当封面）**和全貌大图** `out/board.png`：白板风格是整块白板画完后的样子（"知识地图"），孔版印刷是全部页面排成的一版"目录"；都可以单独发。只想导出这张图：`node scripts/render.mjs videos/<名字> --board`。
最后告诉用户成片、封面和全貌图的路径，以及在浏览器里直接打开 `index.html` 可以预览、拖动进度条（空格播放暂停）。

## script.json 格式
```json
{
  "voice": "zh-CN-XiaoxiaoNeural",
  "rate": "+0%",
  "lead_in": 1.9, "gap": 0.35, "tail": 1.5,
  "bgm": "bright",
  "lines": [
    { "id": "hook", "text": "苹果为什么会往下掉，而不是往天上飞？", "chapter": "提出问题" },
    { "id": "word", "text": "serendipity", "voice": "en-US-AvaNeural", "rate": "-15%" },
    { "id": "beat", "silence": 1.0 },
    { "id": "why1", "text": "……", "pause_after": 0.6, "chapter": "真正的原因" }
  ]
}
```
`chapter`：新的一章从这一句开始，画面顶部会自动出现章节进度条（至少 2 章才出现）。一般 3–6 章，每章标题 2–6 个字，对应 `references/modes.md` 里结构的大段。

`bgm`：背景音乐，**由代码现场合成**（`scripts/bgm.mjs`，不需要任何音乐文件），渲染成片时自动混入。按内容选风格：

| 风格 | 听感 | 适合 |
|---|---|---|
| `bright` | 温暖铺底 + 马林巴琶音 + 很轻的 lo-fi 节拍 | 现象科普、概念讲解（默认） |
| `calm` | 慢铺底 + 稀疏的钢琴音，没有鼓 | 题目讲解（不打扰思考） |
| `history` | 五声音阶 + 古筝式拨弦 + 低沉的鼓 | 典故、历史故事、中国文化 |
| `playful` | 明亮拨弦 + 沙锤，节奏稍快 | 英文单词、做法 / 教程 |

配乐会自动跟着视频走：封面时起音，每换一章换一个乐句并响一声提示音，讲完后回到主和弦淡出；**有人说话时自动压低**（约低于人声 19 分贝），停顿时抬起来；音量按旁白响度自动匹配。
不要配乐写 `"bgm": false`；嫌大或嫌小写 `{ "style": "history", "volume": 0.7 }`（倍数）。单独试听：`node scripts/bgm.mjs videos/<名字>` → `audio/bgm.wav`；四种风格各 30 秒的样品：`--demo`。

常用声音：`zh-CN-XiaoxiaoNeural`（女声，温暖，默认）、`zh-CN-YunxiNeural`（男声，活泼）、`zh-CN-YunyangNeural`（男声，播音腔）、`en-US-AvaNeural` / `en-US-AndrewNeural`（英文）。

## 硬规则
1. **画面是时间的纯函数**：不用 `Math.random()`（要随机就用 `EV.rng(seed)`），不用 `Date.now()`、`requestAnimationFrame`、CSS 动画和 transition。
2. **画面跟着旁白走**：每个元素出现的时间都要锚定到旁白的某句话或某个词。
3. **题目的答案必须经过验算**才能做进视频。
4. 屏幕上写关键词，不照抄旁白。
5. 每次改完画面都要截图检查，不能凭想象判断效果；**动态的效果（擦除、移动、镜头、角色动作）必须看动画条**。
6. 运行时（`lib/`）是共用的基础设施（刷新运行时：`node scripts/new.mjs videos/<名字> --update-lib`，会自动识别项目的风格）；某个视频需要特殊效果时，直接在该项目的 index.html 里写，不要改 `lib/`。
7. **追求通用，不做个案**：发现运行时缺少某种能力时，要把它做成对任何视频都适用的通用功能（参数化、可组合），而不是为当前这个题目写死一段代码。
