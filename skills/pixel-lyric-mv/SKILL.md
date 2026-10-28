---
name: pixel-lyric-mv
version: 1.0.0
description: "制作词级同步的歌词 MV（默认像素/游戏 UI 视觉）：单文件 HTML、render(t) 时间轴、词级打字/印章、beat 驱动的角色动作、场景硬切、HUD。当用户要做歌词 MV、kinetic typography、beat-synced lyric video、字跟着唱/重点字砸出来/句间留白/像素游戏 MV 时使用。"
metadata:
  requires:
    bins: ["python3", "ffmpeg"]
    optional: ["faster-whisper", "demucs", "node", "playwright"]
---

# Pixel Lyric MV

一套做**词级同步歌词 MV**的方法与起手工程。默认视觉是像素/游戏 UI（paper / ink / rose / gold / HUD / sprite），但引擎与视觉解耦，可以换成纸艺、杂志、手写或 3D。

这套方法来自对一个真实参考项目的逆向：[Alice 像素 MV](https://github.com/miyang-ai/alice_fanart/tree/main/outputs/2026-10-16_alice_mv_%E5%BD%93%E7%84%B6%E5%8F%AF%E4%BB%A5%E5%A5%BD%E9%97%AE%E9%A2%98%E5%83%8F%E7%B4%A0MV)。参考的是**时间结构**，不是它的美术、歌曲或素材。

> **端到端自动制片**（歌曲 + 角色形象 → 角色立绘/分镜/场景 → MV，支持插画/纸艺/3D 等非像素皮肤）：见 [`../lyric-mv-studio/SKILL.md`](../lyric-mv-studio/SKILL.md)。
> 本 Skill 是**词级时间/渲染引擎 + 像素皮肤**；`lyric-mv-studio` 是上层自动化制片流程。

## 0. 一句话

**词是单位；字是印章；句是硬切；身体踩拍。**

## 1. 什么时候用

- 用户给一首歌 + 歌词，要做 15–60 秒歌词 MV / 预告 / 完整曲。
- 用户说“字跟着唱”“重点字砸出来”“不要像古诗”“句间留白”“像素游戏 UI”“beat-synced typography”“kinetic lyric video”。
- 用户要的是 HTML 动画或可录制的 MV，而不是静态歌词海报。

不适合：纯静态歌词排版、纯音频可视化（没有人声/歌词）、传统剪辑（只做转场和调色）。

## 2. 交付物

默认：

```
index.html          单文件；音频 data URI 或同级 audio/；无外部依赖
timeline.json       词级时间轴 + 行/场景边界；可复现、可校对
README.md           运行方式、时间来源、版权/署名
preview/            关键帧截图；用户要求时再录 MP4
```

默认 16:9 / 1920×1080；短视频可出 9:16。所有画面由 `render(t)` 计算，暂停、拖动、截帧得到同一画面。

## 3. 三个时钟

| 时钟 | 单位 | 负责 | 规则 |
|---|---|---|---|
| Story clock | 句 / 场景 | 这一句在演什么 | 一句一个场景；硬切；一个想法 |
| Body clock | 拍 | 角色/世界一直在动 | BPM + phase；挤压、起跳、呼吸；镜头不动 |
| Type clock | **词** | 字什么时候砸出来 | 0.10–0.16s 一个 stamp；1–3 字；然后 hold |

**最重要的规则：字体呈现速度 ≠ 唱歌速度。**
一句唱 3.5 秒，不代表 12 个字要摊在 3.5 秒里。字是“事件”，不是“进度条”。

## 4. 七条硬规则

1. **词级时间轴**：每个词有自己的 `t`。不要按字数均分整句，不要逐字爬，不要整句一次性跳出。
2. **一个词一个 stamp**：`scale 1.4→1`，0.10–0.16s；词内 1–3 个字一起出现；词与词之间 hold。
3. **硬切**：句与句之间直接切；不加淡入淡出、推拉、白闪；镜头不晃；字层不跟着镜头动。
4. **一句一个场景**：画面直接演这句；不要把所有歌词塞进一个卡片里滚动。
5. **身体踩拍**：角色始终有微小动作；有下蹲/落地/回弹；不是 PPT 切片。
6. **音频是主时钟**：`audio.currentTime` 驱动 `render(t)`；禁止 `setTimeout` 串行动画。
7. **对齐要可校准**：全局 offset 只能修固定延迟；逐句/逐词漂移必须用词级时间或词级 tap 校准。

## 5. 工作流

### Step 0 — 收素材

- 音频文件、歌词文本、时长、BPM（可选）、画幅、风格、版权/署名要求。
- 先 `ffprobe` 拿准确时长；不要相信文件名。
- 确认是翻唱/二创/商用；在 README 写清楚。

### Step 1 — 歌词切成词

不要按单字切。按语义/换气切：

```
香火 / 在 / 雨中 / 烧 / 几十个 / 暑 / 和 / 寒
血脉 / 相连 / 一方 / 苦行 / 山
龙珠 / 九转 / 十二 / 金光 / 返指 / 五岳 / 和 / 三江
```

每个词给：`t`、`text`、可选 `key`（重点词）、`hero`（右侧大字用哪个字）。
行给：`start`、`end`、可选 `p2`（后半句起点）。
产物见 `examples/timeline.example.json`。

### Step 2 — 拿词级时间

优先级从高到低：

1. **Demucs 分人声 → faster-whisper small / WhisperX 词级时间 → 人工只校词边界**（参考项目的做法）。
2. **页面内 26 词 tap 校准**：唱到哪个词点一下，每词记录真实时间。适合 ASR 不稳的唱段。
3. **人工听写时间表**：逐词标；不要逐字。
4. **LRC / SRT**：只有行级，**不够**做词级节奏；只能用于场景边界。

绝对不要：用行时长除字数、用 52% 估后半句、把整句时间平均分给每个字。

详见 [`references/word-timing.md`](references/word-timing.md)。

### Step 3 — 场景表

每句一个场景：

```
scene(id, a, b, build, draw)
```

- `a`/`b` 是这句的起止；下一句直接硬切。
- `build` 只建 DOM；`draw(t)` 只改样式。
- 场景里只讲一件事：一个词墙、一个物体、一个动作、一个 UI 卡片、一段留白。
- 句尾留 0.2–0.6s 的 hold；不要在新句第一拍还在写上一句。

### Step 4 — 字体系统

- 主字：Songti / 思源宋体 900；HUD：等宽。
- 当前词有底色；重点词玫红/金色；右侧只给一个 hero 大字（300–900px）。
- 普通词墨色；已唱保留；未唱完全不显示。
- 一行最多两行排；超过就换场景，不要缩小到看不清。

### Step 5 — 身体 / beat

- 先定 `BEAT`、`PHASE`；`beatPhase(t)`、`beatPulse(t)`。
- 角色固定一侧；只做动作，不左右换边。
- 每拍轻微 squash；关键词落地有下蹲/回弹；段间可 free dance，不绑歌词。
- 镜头固定；不抖屏；不闪白；跑马灯每秒不超过 200px。

### Step 6 — 实现

从 [`assets/starter.html`](assets/starter.html) 起手，替换 `TIMELINE` 与素材。

核心约定：

```js
const DURATION = 15.5;
const audio = document.querySelector('#audio');

function render(t) {
  t = clamp(t + AV_LEAD, 0, DURATION);
  const line = lineAt(t);
  const word = wordAt(line, t);
  drawWorld(line);
  drawWords(line, word);
  drawHero(line, word);
  drawHUD(line, word);
}

function frame() {
  render(audio.currentTime);
  requestAnimationFrame(frame);
}
```

必须提供：

- `?t=12.3` 冻结到某秒（截帧/QA）。
- `window.__seek(t)`、`window.__ready`。
- 空格播放/暂停；← → 前后 1 秒；可拖动。
- 单文件、无外部网络请求（字体除外要说明）。
- `prefers-reduced-motion` 时去掉抖动/大幅缩放。

### Step 7 — 对齐与 QA

先做**固定 offset**：画面慢 → `+0.1~0.3s`；画面快 → 负值。
再做**逐词检查**：在 4 个时间点（开头、1/3、2/3、结尾）暂停，看当前词是否就是听到的词。
如果第一句准、后面越来越偏：不要加全局 offset；用**逐词 tap 校准**或重做词时间。

### Step 8 — 导出

- 截关键帧：`?t=` + Playwright screenshot。
- 录 MP4：Playwright 逐帧/实时录，ffmpeg 合音频；检查首尾和 A/V。
- 交付前再跑一遍 `scripts/validate_timeline.py`。

## 6. 数据契约

```json
{
  "title": "示例",
  "audio": "audio.mp3",
  "duration": 8.5,
  "bpm": null,
  "lines": [
    {
      "start": 0.4,
      "end": 3.2,
      "words": [
        {"t": 0.4, "text": "这是"},
        {"t": 0.9, "text": "一个"},
        {"t": 1.4, "text": "词级", "key": "rose", "hero": "级"},
        {"t": 2.0, "text": "歌词"},
        {"t": 2.5, "text": "MV", "key": "gold"}
      ]
    }
  ]
}
```

- `bpm` 可为 `null`；变速歌曲不要硬套一个 BPM。
- `key` 可为 `rose`/`gold`/自定义；`hero` 是右侧大字用的字。
- `line.end` 必须存在；`p2` 可选，用于后半句场景边界。
- 词时间必须单调；`validate_timeline.py` 会检查。

## 7. 视觉系统（默认皮肤）

- 纸 `#FAFAF7`、墨 `#1A1714`、玫红 `#C25566`、金 `#C9A96E`、鼠尾草 `#8FA27A`、夜 `#1F2A44`、奶油 `#F3E6CC`。
- 28px 网格；4px 墨边；8–12px 硬阴影；无圆角/无模糊/无渐变光。
- 字体：宋体 900 大字；PT Mono / 等宽做 HUD。
- 角色：像素 sprite / SVG；固定脚位；四套衣服可换，但动作要 Fallback。
- HUD：关卡、爱心、分数、连击、toast、跑马灯；只在关键事件更新。
- 重点层次：普通词 < 重点词 < hero 字；同一时间只有一个 hero。

## 8. 常见失败模式

| 症状 | 根因 | 修法 |
|---|---|---|
| 像古诗 / 匀速打字 | 把整句时长摊给每个字 | 词级 stamp + hold |
| 像 PPT | 一句一张卡，整句一次出现 | 一句一场景 + 词事件 |
| 像机关枪 | 6–8 个字在同一 burst 里糊上去 | 按词切，1–3 字一 stamp |
| 第一句准、后面越拖越偏 | 全局 offset 修不了词时间漂移 | 逐词 tap / 词级 ASR |
| 自动识别串词/幻觉 | 直接对混音做 ASR | Demucs 分人声，或用 tap |
| 画面很满但很死 | 没有 body clock | 每拍 squash / 呼吸 |
| 闪、晕、抖 | 白闪/镜头抖/残影 | 硬切；固定镜头；去掉闪白 |
| 字很好看但读不出 | hero 太多、字层太花 | 一个 hero；普通词降级 |

## 9. QA checklist

- [ ] 每个词的时间都能在音频里找到；开头/1/3/2/3/结尾各抽查一次。
- [ ] 没有“整句一次性出现”。
- [ ] 没有“一个字一个字匀速爬”。
- [ ] 词与词之间有 hold；句尾有留白。
- [ ] 重点词有颜色/hero；同一时间只有一个 hero。
- [ ] 角色一直在动；镜头不抖；没有白闪。
- [ ] `?t=`、`__seek`、暂停/拖动一致。
- [ ] 手机宽度无横向溢出；`prefers-reduced-motion` 可用。
- [ ] 音频/图像/字体版权与署名写清。
- [ ] `validate_timeline.py` 通过。

## 10. 参考与文件

- [Alice MV 源码](https://github.com/miyang-ai/alice_fanart/blob/main/outputs/2026-10-16_alice_mv_%E5%BD%93%E7%84%B6%E5%8F%AF%E4%BB%A5%E5%A5%BD%E9%97%AE%E9%A2%98%E5%83%8F%E7%B4%A0MV/index.html)
- [`references/alice-mv-case-study.md`](references/alice-mv-case-study.md) — 参考项目的精确时间结构
- [`references/word-timing.md`](references/word-timing.md) — ASR / Demucs / tap 校准
- [`references/type-rhythm.md`](references/type-rhythm.md) — 字体节奏的细化规则
- [`assets/starter.html`](assets/starter.html) — 可运行起手模板
- [`scripts/validate_timeline.py`](scripts/validate_timeline.py) — 时间轴校验
- [`scripts/lrc_srt_to_timeline.py`](scripts/lrc_srt_to_timeline.py) — LRC/SRT → 行级骨架
- [`scripts/word_timings.py`](scripts/word_timings.py) — faster-whisper 词级时间（可选）
- [`examples/timeline.example.json`](examples/timeline.example.json) — 数据样例

## 11. 边界

- 不复制参考项目的歌曲、角色、图片、提示词或整段代码；只抽象方法。
- 不把“自动 ASR”当成必然准确；唱段要分人声、要人工校。
- 不为了炫技加闪白/抖屏/过多 hero；优先可读和节奏。
- 用户要求“完全自动、零校准”时，先说明唱段 ASR 的风险，再给 tap 或人工时间表。
