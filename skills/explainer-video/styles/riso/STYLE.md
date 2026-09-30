# 孔版印刷风格（riso）

像一本印得很讲究的独立杂志：几种专色油墨叠印，套色轻微错位，网点表现明暗，纸上有油墨颗粒。
视频按**页**组织：一章通常是一页。但它不是幻灯片：页和页之间有各种换场，镜头在页内会推近，元素可以从一页带到下一页。

## 什么时候用
| 适合 | 不适合 |
|---|---|
| 生活科普、冷知识（"咖啡为什么提神"） | 古代历史、典故、传统文化 → 用 `whiteboard` |
| 心理学、行为经济学、社会现象（"为什么越忙越拖延"） | 严肃沉重的话题（灾难、疾病、冲突） |
| 新闻解读、财经、干货（用 `news` 配色） | 满屏公式的长推导 → 用 `whiteboard` |
| 数字和对比类（"一生要花多少时间在手机上"） | 需要很多人物表演的故事（本风格暂不支持人物） |
| 美食和生活教程、英文单词、近现代的故事 | |

---

## 1. 配色：三种油墨，按角色使用
`RISO.board({ T, palette: 'news' })`。每套配色有三种油墨，代码里**按角色写**，不写具体颜色，换配色不用改代码：
- `base`：大色块、字幕底、名牌底、网点底色（最浅，最先印）
- `main`：文字、轮廓、坐标轴（最深）
- `accent`：强调，只给关键词、关键数字、箭头、当前章节

| palette | 名字 | base / main / accent | 适合 |
|---|---|---|---|
| `lively` | 活泼 | 黄 / 蓝 / 荧光粉 | 生活科普、冷知识、英文单词（默认） |
| `news` | 报刊 | 赭黄 / 黑 / 红 | 新闻解读、财经、社会话题、干货（颗粒很轻、不跳动） |
| `food` | 美食 | 黄 / 青绿 / 红 | 美食、做法教程 |
| `tech` | 科技 | 黄 / 蓝 / 橙 | 互联网、科技产品 |
| `mind` | 心理 | 黄 / 紫 / 粉 | 心理、情绪、人际关系 |
| `nature` | 自然 | 黄 / 蓝 / 绿 | 动植物、环境、地理 |

- **油墨会叠色**（正片叠底）：`base` 上印 `main` 会变深，黄 + 蓝 = 绿、粉 + 蓝 = 紫、粉 + 黄 = 橙。善用叠色，不要试图"盖住"下面的颜色：**没有白色油墨**，浅色永远盖不住深色。要"留白"就不要在那里印东西。
- `accent` 每页最多用在 1–2 处，全用就不再是强调。
- 同一个概念全片用同一种油墨。
- 可以覆盖：`grain`（颗粒 0–1）、`misreg`（错位倍数）、`boil`（颗粒每秒跳动次数，0 = 静止）。

## 2. 版面
- 画面 1920×1080，四周留 110 左右的边距。**顶部 114 像素是章节条，底部 140 像素是字幕**，内容不要进这两个区域（自动检查会报）。
- **一页只讲一个要点**。常见版式：左栏标题 + 一两句要点，右栏一个大图形 / 大数字 / 图表；或者上面标题、下面三栏并列。
- 字号：`title` 100–130，`head` 50–70，`body` 32–40（最小 32），`label` 26–32。
- 元素之间对齐到同一条竖线（例如左边距都是 110），这个风格靠"整齐"显得专业。

## 3. 时间和页面
```js
const cover = b.cover({ ... });                                         // 封面：第 0 帧就是完整的封面
const p1 = b.page(cover.hold);                                           // 封面之后：滚筒翻页
b.title('……', { x: 110, y: 200, at: T.start('hook') });
const p2 = b.page(T.end('hook2') + 0.05, { transition: 'flood', from: pct }); // 换章：从关键数字漫开油墨
b.head('……', { x: 110, y: 150, at: Math.max(p2.end, T.start('why')) });
const p3 = b.page(T.end('r3') + 0.05, { transition: 'push' });             // 同一话题往下讲：推页
b.title('……', { x: 110, y: 190, at: p3.start + 0.1 });                     // 推页时标题可以跟着新页一起滑进来
```
- **换页在上一句说完时立刻开始**（`T.end(上一句) + 0.05`）。
- 章节（script.json 的 `chapter`）一般对应一页；一章内容多时可以分成两页。
- 每一页上的东西都要在换页前至少 0.8 秒印完，否则观众来不及看。
- 封面：`lead_in` 设为 2.3 秒（新建项目时已设好），旁白在封面翻走后才开始。
- **视频讲完就结束**：最后一页停留到旁白结束后约 2 秒，不要做"全部页面缩成目录"的结尾。（全部页面的目录图会在渲染成片时自动导出成 `out/board.png`，不出现在视频里。）

### 换场：不要让它像幻灯片
`b.page(at, { transition })`，按叙事选，**不要全片只用一种**：

| transition | 效果 | 什么时候用 | 新页的东西最早什么时候出现 |
|---|---|---|---|
| `roll` | 印刷滚筒从上往下扫过，换成新的一页 | 封面之后（默认）、大段落开始 | `page.end`（滚筒扫完） |
| `push` | 新页把旧页推出去，三种油墨在移动中错开 | 同一话题往下讲（封面之后的默认） | `page.start`：可以提前印好，跟着页面一起滑进来 |
| `flood` | 一团油墨从某个元素（`from`）漫开盖满画面，再退开露出新页 | **换章 / 转折**：从上一页的关键元素（数字、图形）漫开，把两页连起来 | 换场过半（`page.start + 0.45`） |
| `zoom` | 旧页放大、套色散开淡出，新页从略小处印进来 | "往里看一层"：从整体进入细节 | `page.start`，跟着新页一起进来 |
| `cut` | 硬切 | 节奏很快的连续对比 | `page.start` |

可调：`dur`（换场时长）、`ink`（`flood` 的油墨，默认 `accent`）。

### 镜头：页面不是静止的
- **慢推近**：每一页从印好开始，到下一页换场前，都会很慢地推近 3%，画面一直是"活"的。`b.page(at, { drift: 0 })` 关闭，`RISO.board({ drift })` 改全片默认值。
- **页内推镜头**：`b.focus(目标, { at, dur, zoom })` 把镜头推到这一页的某个元素 / 区域（自动避开章节条和字幕），用来强调细节，例如图表的最后几根柱子；`b.focus(null, { at })` 拉回整页。一页最多推一两次，默认最多放大 1.5 倍。
- **跨页元素**：用 `hud: true` 画出的元素不属于任何一页，换场时不会跟着旧页离开。配合 `.to(at, { x, y, scale }, dur)` 把它挪到新页的角落，前后两页就连起来了；不再需要时 `.erase(at)`：
```js
const pct = b.number(1010, 150, { to: 30, prefix: '+', suffix: '%', size: 190, hud: true });
const p2 = b.page(T.end('hook2') + 0.05, { transition: 'flood', from: pct });
pct.to(p2.start + 0.45, { x: 1690, y: 180, scale: 0.42 }, 0.8);   // 飞到第 2 页右上角，继续提醒观众
pct.erase(p3.start, 0.3);
```

## 4. 出场动作
每个元素都有 `enter`（有合适的默认值，一般不用写）：

| enter | 动作 | 默认用于 |
|---|---|---|
| `print` | **套印**：每种油墨从错开的位置滑回来对准。图形按油墨先后印，文字几种颜色一起印 | 标题、图形、数字 |
| `type` | 一行一行淡入 | 正文 `body`、引语 |
| `stamp` | **盖章**：略放大、微微转着"啪"地落下 | 名牌 `tag` |
| `wipe` | 从一端**刷**出来 | 线、分隔线、箭头、荧光底 |
| `rise` | 从基线往上长 | 柱状图的柱子 |
| `fade` | 淡入 | — |
| `none` | 直接出现 | — |

网点部分（`fill: 'halftone'`）会跟着出场进度"显影"：离光源近的点先长出来。

## 5. API

### 页面
| 方法 | 说明 |
|---|---|
| `b.cover({ title, subtitle, kicker, issue, hold, motif })` | 封面。`title` 支持 `{accent:关键词}` 和 `\n`；`kicker` 左上栏目名（如 "民生 · 物价"）；`issue` 右上期号；`motif: false` 去掉右下装饰网点圆。返回 `{ hold, end, area }`，`area` 是标题下方留给主视觉的区域；主视觉用 `at: 0, dur: 0` 画在封面页上 |
| `b.page(at, { transition, from, ink, dur, drift, title })` | 换到新的一页，返回 `{ start, end }`（`end` = 换场结束）。换场方式见上面第 3 节；`title` 用于导出的目录图，缺省取当时的章节名 |
| `b.focus(target, { at, dur, zoom, pad })` | 页内推镜头；`target` 为元素、元素数组、`{x, y, w, h}` 区域，或 `null`（拉回整页） |

### 文字
`b.title / b.head / b.body / b.label (str, o)`，或 `b.text(str, { style })`。
- `o`：`x, y`（**左上角**）、`w`（自动换行宽度）、`size`、`align: 'left'|'center'|'right'`、`valign: 'top'|'middle'|'bottom'`、`ink`（默认 `main`）、`at`、`dur`、`enter`、`spacing`（字距）、`bg`（底色块油墨）、`pad`
- 局部换色：`'鸡蛋为什么突然{accent:涨价}了？'`；`{base:…}`、`{main:…}` 也可以
- 行首不会出现逗号、句号等标点；英文单词和数字不会被拆开
- `body` 和 `label` 不加油墨颗粒，保证小字清晰

| 方法 | 说明 |
|---|---|
| `b.tag(str, x, y, { bg, ink, size })` | 名牌 / 标签：底色块（默认 `base`）+ 文字，盖章式出场 |
| `b.number(x, y, { to, from, decimals, prefix, suffix, size, ink, align })` | 滚动的大数字，例如 `{ to: 30, prefix: '+', suffix: '%' }`；默认 `accent`、字号 150 |
| `b.quote(str, { x, y, w, size })` | 引语：大号引号 + 粗宋 |
| `b.highlight(target, { ink, pad, fromY, toY })` | 在文字下面印一条底色（默认 `base`），从左往右刷出；`fromY` / `toY` 是色条从文字高度的几成画到几成（默认整行，`fromY: 0.55` 就是只画下半截） |
| `b.underline(target, { ink, weight })` | 粗下划线（默认 `accent`） |

### 图形和插画
`b.sketch(parts, o)` 是画插画的主要方法：`parts` 是部件列表，每个部件是一块油墨：
```js
b.sketch([
  { ellipse: [cx, cy, 150, 190], ink: 'base' },                                                            // 实心底色
  { ellipse: [cx, cy, 150, 190], ink: 'main', fill: 'halftone', light: [cx - 60, cy - 90], density: [0.05, 0.75] }, // 网点明暗
  { ellipse: [cx, cy, 150, 190], ink: 'main', stroke: 7, fill: 'none' },                                  // 轮廓
], { at: T.word('hook', '鸡蛋') });
```
- 形状：`d`（SVG 路径）/ `circle: [x, y, r]` / `ellipse: [x, y, rx, ry]` / `rect: [x, y, w, h, 圆角]` / `poly: [[x, y], ...]`，可加 `transform`
- `fill`：`'solid'`（默认）/ `'halftone'`（网点）/ `'none'`；`stroke: 线宽`、`strokeInk`、`dash: '4 10'`
- 网点：`light: [x, y]` 光源位置（离光源越远点越大）、`density: 0.6 | [最浅, 最深] | (x, y) => 0..1`、`cell` 网点间距（默认 11）、`angle`（默认每种油墨不同）
- **画插画的套路**：`base` 实色打底 → `main` 或 `accent` 网点做明暗 → `main` 描轮廓。简单几何形状组合就够，不要画写实细节

| 方法 | 说明 |
|---|---|
| `b.circle / b.ellipse / b.rect / b.poly / b.path` | 单个形状，选项同上（`ink`、`fill`、`stroke`、网点参数） |
| `b.line(x1, y1, x2, y2, { width, ink, dash })` | 线，从起点刷出 |
| `b.rule(x, y, w, { weight, ink })` | 横向分隔线 |
| `b.arrow(x1, y1, x2, y2, { width, ink })` | 实心粗箭头（默认 `accent`），从尾部刷到头部 |
| `b.bars(data, { x, y, w, h, max, grid, decimals, unit, hot })` | 柱状图：`data = [['4月', 4.3], ...]`，`x, y` 是基线左端，`h` 是 `max` 对应的高度；`hot: [3, 4, 5]` 要突出的柱子用 `accent`，其余用 `base` 网点；柱子逐根长出，数值跟着滚动。**纵轴从 0 开始，不要截断夸大** |

### 图片和视频（照片、截图、录屏）
素材先整理：把图片、视频放进项目的 `assets/src/`，运行 `node scripts/assets.mjs videos/<名字>`（见 SKILL.md）。素材名 = 文件名去掉扩展名。
视频写成 `{ clip: '名字', from: 0, rate: 2, to: 10 }`：从片段第 `from` 秒开始、以 `rate` 倍速播放、播到 `to` 秒停住（默认播到结尾）；元素出现前停在第一帧，播完停在最后一帧，`play: 秒` 可以指定开始播放的时间。视频还没播完就被擦掉 / 翻页时，自动检查会提醒。
```js
b.image('发布会', { x: 110, y: 160, w: 820, at: ..., source: '图：发布会现场' });              // 照片：双色印刷
b.image('settings', { x: 1000, y: 160, w: 800, inks: 'screen', at: ... });                     // 浅色界面截图
b.image({ clip: 'terminal', rate: 1.5 }, { x: 110, y: 200, w: 900, inks: 'dark', at: ... });   // 深色界面的录屏
```
图片不会以原色出现，而是**按亮度分到油墨上套印**，所以和版面上其他元素的颜色一致。`inks` 选一种印法：

| inks | 效果 | 适合 |
|---|---|---|
| `photo`（默认） | `base` 实色底 + `main` 印暗部，像双色印刷 | 照片、现场图 |
| `screen` | 只用 `main` 印暗部，最清楚 | 浅色界面截图（字多） |
| `screen-tint` | `screen` + 淡淡的 `base` 底色 | 浅色界面截图，想和版面更融合 |
| `dark` | 亮的地方上墨（反白） | 深色界面：终端、深色图表 |

也可以自己写油墨层数组：`[{ ink, tone: 'dark'|'light'|'flat', gamma, amount, alpha }]`。`gamma` > 1 只让最深处上墨、< 1 让中间调也上墨；`alpha` 可以把图里某种颜色单独分到一种油墨上，例如 `{ ink: 'accent', tone: 'light', alpha: '1.2 1.2 -2.2 0 0' }` 把黄色的线单独印成 `accent`。
其他选项：`x, y, w, h`（只给 `w` 时按原图比例）、`fit: 'slice'`（裁满，默认）/ `'meet'`（完整放下）、`frame: false`（去掉细线框）、`source`（图片下方的来源 / 图注，**新闻、数据类必须写来源**）。

### 通用
- 时间：`at`（秒，或另一个元素 / 组 = 在它结束时开始）、`delay`、`dur`；`b.at(t)`、`b.wait(s)`
- 元素方法：`.erase(at, dur)`、`.move(at, dx, dy, dur)`、`.to(at, { x, y, scale }, dur)`（移动 / 缩放到新位置，`x, y` 是中心点）、`.pulse(at)`
- 选项：`bleed: true` 允许有意出血到画面外；`annot: true` 标注类元素（可以压章节条 / 字幕区的检查）；`overlap: true` 跳过文字重叠检查；`hud: true` 固定在屏幕上、不跟随页面
- `RISO.groupOf(items)` 把几个元素组成一组（有 `start / end / box / erase / move`）

## 6. 自检要点（在 `references/review.md` 之外）
- 每一页只有一个视觉焦点；`accent` 没有滥用
- 网点、叠色是好看的，文字是清楚的：正文没有被网点压住
- 数据类画面：数字和旁白一致，标明来源和时间（或"示意数据"），纵轴从 0 开始
- 换场有变化、贴合叙事：换章 / 转折用 `flood` 或 `roll`，同一话题往下讲用 `push`，进入细节用 `zoom` 或 `focus`；没有全片都是同一种换场
- 换页前，这一页的东西都印完并停留了足够时间（看 `--strip` 换场前后）
- 导出的目录图 `out/board.png`：每页一眼能看出讲了什么

## 7. 暂不支持
- **人物**（`references/characters.md` 的角色目前只有白板风格的画法）。需要人物表演的题材用 `whiteboard`；真实人物可以用照片（`b.image`）。
- **公式**（KaTeX）。公式多的题目用 `whiteboard`；简单的式子可以直接写成文字。
