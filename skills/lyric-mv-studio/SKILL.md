---
name: lyric-mv-studio
version: 1.0.0
description: "从歌曲 + 角色形象自动生成角色立绘/角色设定/分镜/歌词 MV 的端到端 Skill；支持像素、插画、纸艺、3D 等皮肤；调用生图接口；词级时间轴 + 单文件 HTML/MP4。当用户上传歌曲和角色图，想做自动 MV、角色立绘、storyboard、AI 生图 MV，或不限像素风格的音乐视频时使用。"
metadata:
  requires:
    bins: ["python3", "ffmpeg"]
    optional: ["faster-whisper", "demucs", "node", "playwright", "Pillow"]
---

# Lyric MV Studio

把“歌曲 + 角色形象”变成一套可运行的歌词 MV：

> 角色圣经 → 风格包 → 分镜 → 生图 → 词级时间轴 → 剪辑 → QA → HTML/MP4

默认示例皮肤是像素/游戏 UI，但**皮肤是可插拔的**：插画、纸艺、3D、拼贴、杂志都可以。时间与字体引擎不绑定风格。

词级时间/渲染引擎与像素皮肤在 [`../pixel-lyric-mv/SKILL.md`](../pixel-lyric-mv/SKILL.md)；本 Skill 是上层的自动化制片流程。

## 0. 一句话

**用户给 song + character，Skill 产出 character sheet、分镜、场景图、词级 MV。** 自动的是流程，不是审美判断；角色一致性和风格帧必须过目。

## 1. 适用 / 不适用

适用：

- 用户上传一首歌 + 一张角色图（或角色描述），想要 15–60 秒 MV、预告、完整曲。
- 用户要“先出立绘/角色设定，再出 MV”，不限定像素。
- 用户要 anime / illustrated / paper / 3D / game UI 等风格。
- 用户接受调用生图 API（Lovart、Bailian、ComfyUI 或自建），并为图片付费。

不适用：

- 用户只想要一张静态海报（直接生图即可，不必走 MV 流程）。
- 没有歌词、也不接受纯音乐/抽象视觉：先确认是否需要歌词。
- 没有任何角色参考且拒绝生成角色：无法保证角色一致性。

## 2. 最小输入

| 输入 | 必需 | 说明 |
|---|---|---|
| `song.mp3` | 是 | 时长、BPM、段落、人声 |
| `character.png` | 是 | 角色参考；正面/清晰/全身最好 |
| `lyrics.txt` | 否 | 没有则 ASR 草稿；必须允许用户修正 |
| `style` | 否 | `illustrated`（默认）/`pixel`/`paper`/`3d`/`game-ui` |
| `aspect` | 否 | `16:9` 默认；`9:16` 短视频 |
| `provider` | 否 | `lovart`/`bailian`/`comfy`/自建；需用户确认费用 |
| `notes` | 否 | 角色名、性格、服装、禁止改变的特征 |

**如果用户只给 song + character，先做三件事**：

1. 用 ffprobe 拿时长/BPM/采样率。
2. 对角色图做“身份拆解”（发色/发型/瞳色/服装/配饰/体型/轮廓/ palette）。
3. 用 ASR 出歌词草稿；告诉用户“这是草稿，词级时间需要校对”。

## 3. 输出物

```
project/
  project.json             输入清单
  lyrics.txt               用户歌词或 ASR 草稿
  timeline.json            词级时间轴（最终）
  shotlist.json            分镜/生图表
  character/
    sheet.png              角色设定/三视图
    keyvisual.png          主视觉/封面
    poses/                 动作/表情 cutout
  scenes/
    s01.png ...            每个镜头的背景/完整构图
  assets/                  字体、纹理、HUD、装饰
  index.html               单文件 MV（或 assets 目录）
  preview/                 关键帧
  README.md                运行/版权/生成参数
```

## 4. 自动化的边界

| 阶段 | 自动 | 需要人 |
|---|---|---|
| 歌曲分析 | 时长/BPM/段落/人声分离 | 确认段落是否需要重排 |
| 歌词 | ASR 草稿 + 行级时间 | 修正错字/断句 |
| 角色设定 | 生成三视图/表情/动作 | **批准角色一致性** |
| 风格 | 生成 style frame | **批准风格帧** |
| 分镜 | 按歌词切镜、出 prompt | 确认节奏/叙事 |
| 生图 | 批量生成、重试、命名 | **确认预算/供应商** |
| 时间轴 | 词级时间 + tap 校准 | 抽查 4 个点 |
| 组装 | HTML/MP4 | 终检 |

**不要承诺“零审核全自动”**。角色漂移和画面文字是生图的两个硬风险；没有角色 sheet 和 style frame 的批准，批量生图会浪费钱。

## 5. 工作流

### Phase 0 — Intake

```bash
mkdir -p project/{character/poses,scenes,assets,preview}
ffprobe -v error -show_entries format=duration -of csv=p=0 song.mp3
```

- 确认歌曲/角色/歌词的版权与二创范围。
- 确认画幅、时长、风格、预算、是否要 MP4。
- 建立 `project.json`（见 `examples/project.example.json`）。
- 生成 `README.md` 草稿：来源、模型、seed、prompt 版本、费用。

### Phase 1 — Analyze song

- `ffprobe` 时长；`librosa`/`aubio` 估计 BPM；若变速，记录 beat map 而不是单一 BPM。
- `demucs` 分人声（推荐）：

```bash
python3 -m demucs.separate -n htdemucs --two-stems=vocals -o stems song.mp3
```

- 有歌词：按语义切词；没有歌词：`faster-whisper` 草稿，用户修正。
- 词级时间：`faster-whisper`/WhisperX 或页面 tap；见 `pixel-lyric-mv/references/word-timing.md`。
- **不要**用 LRC/SRT 行级时间直接做逐字节奏。

### Phase 2 — Character bible（gate 1）

- 拆解参考图：脸型、发色/发型、瞳色、肤色、体型、服装、配饰、标志、palette、轮廓。
- 生成 **角色 sheet**：正面/3/4/侧面/背面、中性表情、6 个表情、6–8 个动作、透明背景。
- 生成 **key visual**：16:9 主视觉，留出标题/字层空间。
- 角色 token 复用；同一 outfit；同一 seed（若供应商支持）；参考图 image-to-image。
- 检查：脸、发型、瞳色、服装、体型、palette 是否一致；不接受“同名不同人”。
- **Gate 1**：用户批准 sheet 后才批量。

详见 [`references/character-bible.md`](references/character-bible.md)。

### Phase 3 — Style pack（gate 2）

选一个 style module：

| style | 资产 | 特征 | 字层 |
|---|---|---|---|
| `pixel` | sprite/cutout + 像素背景 | 28px 网格、4px ink、硬阴影 | Songti 900；HUD |
| `illustrated` | 全幅 plate + 角色 cutout | 插画/动画光影；留白 | 大字 + 细腻背景 |
| `paper` | 纸纹/撕边/印章 | 纸、墨、朱砂、金 | 宋体/手写 |
| `3d` | 3D render + depth | 体积光/景深 | 无衬线/细衬线 |
| `game-ui` | UI 框/HUD/像素 | 游戏关卡 | 等宽 + 大字 |

先生成 **1 张 style frame**（不是整批）：同一角色、同一歌词、最终字层位置。批准后再批量。
- **Gate 2**：用户批准 style frame。
- 风格只换 assets/CSS；词级时间、stamp、硬切、body beat 不变。

详见 [`references/style-modules.md`](references/style-modules.md)。

### Phase 4 — Storyboard

- 一句歌词一个镜头；长句按 p2/词组分两镜。
- 镜头 1.5–3.0 秒；45 秒约 15–25 镜；不要 60 镜。
- 镜头类型：特写/中景/全景/插入/纯字/角色 beat/留白。
- 每个镜头写：lyric、start/end、shot type、character action、background、type layout、prompt、refs、negative、seed、output。
- 生成 `shotlist.json`（`scripts/plan_mv.py` 可起骨架）。
- 检查：歌词每句都有镜头；没有空镜丢词；没有两个镜头争同一句。

### Phase 5 — Generate assets

- 先生成 1 张角色 sheet + 1 张 style frame + 1 个镜头；检查后再批量。
- 每个镜头用同一角色 ref + 同一 style token；seed 固定或记录。
- 背景/完整构图与角色 cutout 分开；字层不烧进图。
- 留出 **type safe area**（30–45% 负空间）；不要让角色/关键物占据字位。
- 透明 cutout：脚位一致；阴影在 CSS 里加。
- 失败重试 ≤2 次；仍不一致就换构图/参考，不要无限抽卡。
- 输出命名 `scenes/s01.png`；记录 prompt/seed/model 到 `shotlist.json`。

**供应商**：

- 有 `lovart-api` skill：加载它，按它的工具生成；先确认费用。
- 有 `bailian-cli` skill：先询问一次，再调用；不要在未确认时产生费用。
- 自建 ComfyUI：用 workflow API；同样记录 seed/model。
- 无供应商：先交付 **storyboard + prompts + 占位图**，不要假装生成了立绘。

### Phase 6 — Timeline

- 词级时间（`timeline.json`）；行/场景边界；p2。
- 用 [`pixel-lyric-mv`](../pixel-lyric-mv/SKILL.md) 的 `LYRICS`/`stampIn`/`scene` 模式。
- 类型：一个词一个 0.12s stamp；1–3 字；key/hero；词间 hold。
- 如果第一句准、后面漂：逐词 tap；不要只加全局 offset。
- `?t=` 抽查 4 个点；A/V offset 仅修固定延迟。

### Phase 7 — Assemble

- 用 `pixel-lyric-mv/assets/starter.html` 作为时间/字层起手；把 stage/card 换成 style module 的图层。
- 每一镜：背景/plate + 角色 cutout + 字层 + HUD/装饰；硬切。
- `render(t)` 由 `audio.currentTime` 驱动；`?t` 冻结；`__seek`/`__ready`。
- 单文件优先；图片多时用 `assets/`，但保持可移植。
- 可选 MP4：Playwright 逐帧/实时录 + ffmpeg 合音频；检查首尾。

### Phase 8 — QA / delivery

- 角色一致性 contact sheet（`scripts/contact_sheet.py`）。
- 歌词覆盖：每句/每个词都有镜头；没有错字/漏字。
- 词级对齐：4 个点 + 逐词抽查。
- 字层可读：对比度、安全区、移动端。
- 版权/署名/模型/seed 写入 README。
- 交付：`index.html`、`timeline.json`、`shotlist.json`、`character/sheet.png`、`preview/`、可选 MP4。

## 6. 数据契约

### project.json

```json
{
  "title": "示例 MV",
  "song": "song.mp3",
  "lyrics": "lyrics.txt",
  "character": {
    "ref": "character.png",
    "name": "角色名",
    "identity": "黑发、琥珀瞳、白衬衫、红色发带",
    "forbidden": "不要换发色/瞳色/服装"
  },
  "style": "illustrated",
  "aspect": "16:9",
  "resolution": "1920x1080",
  "target_scene_seconds": 2.6,
  "provider": "lovart",
  "budget": {"currency": "CNY", "max": 60}
}
```

### shotlist.json

```json
{
  "shots": [
    {
      "id": "s01",
      "start": 0.0,
      "end": 2.4,
      "lyric": "第一句",
      "shot": "medium",
      "character": "站在窗边，侧身",
      "background": "清晨房间",
      "type_layout": "left-bottom",
      "prompt": "...",
      "refs": ["character.png"],
      "negative": "text, watermark, extra fingers, different face",
      "size": "1920x1080",
      "seed": 12345,
      "output": "scenes/s01.png",
      "status": "planned"
    }
  ]
}
```

## 7. 角色一致性

- 固定 identity token（发色/发型/瞳色/服装/配饰/体型/轮廓）。
- 同一 outfit；同一 seed；同一 reference；同一 style token。
- 先生成 sheet；所有镜头以 sheet 为 ref，不用单张场景图当 ref（会漂）。
- 每 5–6 镜做一张 contact sheet；发现漂移立即停批。
- 不让模型在图中写字；字层在 HTML/CSS。
- 不让模型改手势/持物，除非剧情需要；需要时在 shotlist 标注。

## 8. 成本与时间

- 角色 sheet：6–10 张（选 1 张）。
- style frame：1–2 张。
- 镜头：`ceil(duration / 2.5)`；45 秒约 18 镜；每镜 1–2 张；重试 1 次。
- 总计约 30–50 张图；先报预算，再批量。
- 先生成 1 张 sheet + 1 张 style frame + 1 镜；不要直接跑 50 张。
- 供应商计费/额度未知时，不调用。

## 9. 常见失败

| 症状 | 根因 | 修法 |
|---|---|---|
| 角色每个镜头都不一样 | 没有 sheet / ref 不一致 | 先做 sheet；统一 ref/seed |
| 图和歌词无关 | 先画图再配词 | 先 shotlist；每镜写 lyric/action |
| 字被角色挡住 | 没有 type safe area | prompt 留 30–45% 负空间 |
| 图里有乱码字 | 让模型画字 | 图中不写字；HTML 字层 |
| 镜头太多/太碎 | 按字切镜 | 按句/词组；1.5–3s |
| 节奏像 PPT | 整句一次出现 | 词级 stamp + hold |
| 后面越拖越偏 | 全局 offset 修漂移 | 逐词 tap/ASR |
| 批量抽卡烧钱 | 无 gate | sheet/style frame/1 镜后再批 |

## 10. 文件

- [`references/auto-pipeline.md`](references/auto-pipeline.md) — 端到端阶段、命令、门禁、成本
- [`references/character-bible.md`](references/character-bible.md) — 角色拆解、sheet/pose prompt、一致性检查
- [`references/style-modules.md`](references/style-modules.md) — pixel/illustrated/paper/3d 的资产与字层
- [`references/image-prompts.md`](references/image-prompts.md) — prompt 公式、refs、negative、seed、透明 cutout
- `examples/project.example.json`
- `examples/shotlist.example.json`
- `scripts/plan_mv.py` — project+lyrics → shotlist 骨架
- `scripts/validate_shotlist.py` — 覆盖/顺序/字段校验
- `scripts/gen_assets.py` — dry-run 生成 prompts/manifest；实际调用交给生图 provider
- `scripts/contact_sheet.py` — 角色一致性 contact sheet
- [`pixel-lyric-mv`](../pixel-lyric-mv/SKILL.md) — 词级时间/渲染引擎 + 像素皮肤

## 11. 边界

- 不复制参考项目的歌曲、角色、素材、提示词；只抽象流程。
- 不承诺“零审核全自动”；角色和风格要 gate。
- 不在未确认预算/供应商时批量生图。
- 不把 LRC/SRT 行级时间当词级时间。
- 图片模型生成的字不可控；所有字用 HTML/CSS 叠加。
- 用户只给 song + character 时，先出 **角色 sheet + style frame + 1 镜**，再问是否继续批量。
