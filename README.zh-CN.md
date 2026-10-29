# BB Video

一个**用代码做视频**的 Agent 技能：不用剪辑软件，不用素材库。
每一帧都是 HTML / SVG / canvas 画出来的、只由时间决定的画面，在无界面 Chrome 里逐帧渲染；配乐和音效用代码合成，最后由 ffmpeg 编码成 mp4。

[English](README.md)

## 技能

| 技能 | 做什么 |
|---|---|
| <a href="skills/bb-video"><code>bb&#8288;-&#8288;video</code></a> | **讲解视频**（旁白、字幕、垫底配乐），以及网站 / App / 软件的**宣传片、发布视频**（卡拍配乐和音效）——横屏 16:9、竖屏 9:16，26 种画面风格 |

你只需要选一样：**风格**。旁白、分镜、配音、音乐、音效、排版、检查都交给 Agent。

| 风格 | 样子 |
|---|---|
| `whiteboard` 白板 | 一块无限大的手绘白板：手写字、箭头、KaTeX 公式、会说话会指的卡通人物；结尾拉远成带编号的"知识地图" |
| `riso` 孔版印刷 | 专色套印、网点、轻微错版，一章一页杂志 |
| `ink` 水墨 | 手卷：笔触、印章、国画人物 |
| `launch` 发布会动效 | 大字、产品界面，浅色 / 深色 / 品牌色舞台 |
| `origami` 折纸 | 折痕、明暗，纸展开成下一个画面 |
| `pop` 波普 | 网点、粗描边、漫画格 |
| `op` 欧普 | 黑白错视图案在动（WebGL） |
| `cutout` 剪纸 | 马蒂斯的剪纸拼贴 |
| `ascii` 字符画 | ASCII 字符拼出的画面 |
| `shadow` 皮影戏 | 刻花、透光的牛皮人物，油灯照着的幕布 |
| `bauhaus` 构成主义 / 包豪斯 | 几何、三原色、斜排的大字 |
| `pixel` 像素 | 8-bit 游戏：像素小人、游戏界面、芯片音乐 |
| `chat` 聊天记录 | 在聊天软件里讲故事：气泡、正在输入、语音、卡片 |
| `toy3d` 玩具三维 | 产品真实的界面变成桌上的立体平台，一个哑光软胶玩具在上面跳（three.js） |
| `newsreel` 老新闻片 | 上世纪三十年代的影院新闻片：带出处的资料照片、印在胶片上的字幕和橡皮图章、划痕黑白胶片、字幕卡、铜管进行曲 |
| `filmroom` 录像分析 | 教练看录像：真实录像定格，画笔圈出球员、画出跑位，倒带后慢放、圆圈跟着人走；俯视战术板，以及用比赛数据画的投篮分布图 |
| `mystery` 悬疑探秘 | 假正经的电视科普：4:3 老电视里的纯蓝画面，黑边白字标题、关键词标红，毛笔字写出"一、二、三"条"症状"，每条由复古卡通贴纸演出来，再配一段聊天截图、满屏大字，最后切到电视测试卡；也可以换成"破案"样子（迷雾、划掉的猜想、证据墙、有出处的答案） |
| `isometric` 等距微缩世界 | 45° 等距视角下的一个微缩世界：带底座的一块块地，低多边形的房子、传送带、货车和会自己动的小人；跟着一样东西走完整个系统，路线画在地面上，每一站插一张计时卡，正在讲的那一块抬起来、其余变淡（three.js） |
| `trailer` 电影预告片 | 好莱坞电影预告片：2.39:1 遮幅里用代码画的电影镜头（太空、行星、走廊、逆光剪影），青橙调色和胶片颗粒；黑底金属字卡，一张一句；孤零零的钢琴单音和滴答声，然后 BRAAM 和太鼓压上来、镜头越切越快，突然全静，片名砸出，定档日期和演职员表 |
| `dossier` 剪报解说 | 财经 / 时事解说的纸面世界：灰色新闻纸剪报（大标题加荧光笔、半调黑白照片、按事实写的真实短讯），用虚构报头重排的真实原文文件——镜头从整页推到被引用的那一行，红 / 蓝译文条、小标签落在原句上；纸张飞入、墨刷转场、封面式大字标题卡、数据标注、顶部章节条和描边字幕 |
| `manga` 日漫 · 漫画分镜 | 会动的黑白漫画页：网点、分格和格间距、斜格和出血格、速度线和集中线、画进画面里的拟声词（ドン / ゴゴゴ）和对话框；镜头按阅读顺序一格格读，关键格推进、打击时震屏，翻页或斩切换页，高潮用整页大图；角色全部原创、用代码画 |
| `map` 地图动画 | 用真实地理数据画的印刷感地图：纸色陆地、沿海岸刻线的水面、公园、街道纹理、按制图规范排的地名；线路一笔笔画出，电车 / 列车沿线开、说到哪站停哪站，车站依次弹出，区域像墨一样晕开，标注卡钉在地点上，年份计数器和定位小地球；镜头转地球、一路推到街道、在地点之间飞行、俯仰着跟车走 |
| `swiss` 瑞士风动态排版 | 瑞士国际主义海报动起来：网格上巨大的无衬线字、被画面边缘裁切，只有黑色加一种从品牌取来的强调色；字母一个个升起，数字按位滚动到位，海报拉远成一面不同配色的海报墙，一个词铺成满屏图案；信息也用排版讲：编号列表、打勾卡片网格、巨型数字、条形图、新旧对比，真实截图像海报元素一样加标注 |
| `lumen` 暗调励志动画 | 代码画的房间几乎全黑，只有一个有来源的光——照在脸上的手机屏、红色闹钟、台灯、百叶窗的月光、窗外的晨光——带轮廓光、墙上的巨大影子、雾气和颗粒；一个原创主角（方圆脑袋、随情绪变化的呆毛）用眼睛和眉毛演出一切；慢推镜头停在脸上，低沉的第二人称旁白，封面式白色大字卡；事实用光来讲：飞速跳动的时钟、发光仪表、夜晚时间线、头部透视图 |
| `blueprint` 蓝图工程图 | 蓝晒图纸加网格，白色线条先画辅助线再加粗描线，尺寸标注、带编号气泡的引线、剖面线、零件表、图签，只用一支红铅笔做强调；机构真的会动——齿轮按真实速比啮合转动，擒纵锁住又放开，发条慢慢松开，凸轮和杠杆联动——慢放或快放的倍率标在图上；每个话题换一张新图纸，镜头推近局部时其余部分淡下去 |
| `collage` 纸艺拼贴新闻解说 | 一张铺满撕边纸片的桌面，一镜到底：网点印刷的老照片（底部署名）、褪色的海报底层、红色印章、打字机引语加荧光笔、胶带和图钉；镜头漂移、推近、带景深横移到下一张纸；数字和历史都用纸做的道具讲——纸人方阵变红、红线串起的时间线、笔记本纸上的剪纸柱状图、方格纸上带图钉的折线、印在凭证上的大字；固定的栏目名、日期地点和资料来源行 |

能做什么：

- **讲解**：现象（"天为什么是蓝的"）、解题（可以直接给题目截图）、单词、概念、历史故事和典故、操作教程、冷知识、新闻和数据。
- **宣传片**：给一个网址，它先调研网站（文字、数字、颜色），截取素材，再做一支卡拍的宣传片，用产品真实的界面和品牌色。
- **都是内置的**：edge-tts 配音（逐词时间）、字幕、代码合成的配乐和音效、封面、竖屏版本。
- **自己检查**：渲染前查重叠、字没读完就消失、出画、画面上的事实在 brief 里查不到、信息太少、动效问题；渲染后查跳帧、闪一帧、空放（几秒只有音乐、画面上没有新东西）。
- **跟着你的语言走**：用什么语言提要求，视频就用什么语言。中文和英文调得最好，其他语言用任意 [edge-tts 声音](https://github.com/rany2/edge-tts)。

<!-- gallery:start -->
## 样例

每种风格一支样片，都是用这个技能做的（GIF 是 7 秒的片段；带声音的完整 mp4 在 [samples 发布页](https://github.com/BubbleBrainBB/BB-Video/releases/tag/samples)）。旁白是中文；四支网站宣传片和 swiss 样片只有音乐。

<table>
<tr>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/whiteboard.mp4"><img src="examples/whiteboard/preview.gif" width="100%" alt="whiteboard"></a><br>
<b><code>whiteboard</code></b> · 刘邦斩白蛇（典故）<br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/whiteboard.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/riso.mp4"><img src="examples/riso/preview.gif" width="100%" alt="riso"></a><br>
<b><code>riso</code></b> · Grok Bot 动态文字宣传片<br>
<sub>画面取自其公开官网</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/riso.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/ink.mp4"><img src="examples/ink/preview.gif" width="100%" alt="ink"></a><br>
<b><code>ink</code></b> · 唐诗《登鹳雀楼》<br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/ink.mp4">完整视频</a>
</td>
</tr>
<tr>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/launch.mp4"><img src="examples/launch/preview.gif" width="100%" alt="launch"></a><br>
<b><code>launch</code></b> · Grok Bot 发布片<br>
<sub>画面取自其公开官网和 App</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/launch.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/origami.mp4"><img src="examples/origami/preview.gif" width="100%" alt="origami"></a><br>
<b><code>origami</code></b> · 为什么天空是蓝色的<br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/origami.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/pop.mp4"><img src="examples/pop/preview.gif" width="100%" alt="pop"></a><br>
<b><code>pop</code></b> · 为什么天空是蓝色的<br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/pop.mp4">完整视频</a>
</td>
</tr>
<tr>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/op.mp4"><img src="examples/op/preview.gif" width="100%" alt="op"></a><br>
<b><code>op</code></b> · Stripe 官网宣传片<br>
<sub>画面取自其公开官网</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/op.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/cutout.mp4"><img src="examples/cutout/preview.gif" width="100%" alt="cutout"></a><br>
<b><code>cutout</code></b> · 为什么天空是蓝色的<br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/cutout.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/ascii.mp4"><img src="examples/ascii/preview.gif" width="100%" alt="ascii"></a><br>
<b><code>ascii</code></b> · 什么是 ASCII 码<br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/ascii.mp4">完整视频</a>
</td>
</tr>
<tr>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/shadow.mp4"><img src="examples/shadow/preview.gif" width="100%" alt="shadow"></a><br>
<b><code>shadow</code></b> · 刘邦斩白蛇（带角色配音）<br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/shadow.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/bauhaus.mp4"><img src="examples/bauhaus/preview.gif" width="100%" alt="bauhaus"></a><br>
<b><code>bauhaus</code></b> · 包豪斯：一所只办了十四年的学校<br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/bauhaus.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/pixel.mp4"><img src="examples/pixel/preview.gif" width="100%" alt="pixel"></a><br>
<b><code>pixel</code></b> · 红白机的颜色：为什么老游戏只有这几种颜色<br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/pixel.mp4">完整视频</a>
</td>
</tr>
<tr>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/chat.mp4"><img src="examples/chat/preview.gif" width="100%" alt="chat"></a><br>
<b><code>chat</code></b> · 一骑红尘妃子笑：荔枝的典故<br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/chat.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/toy3d.mp4"><img src="examples/toy3d/preview.gif" width="100%" alt="toy3d"></a><br>
<b><code>toy3d</code></b> · Linear 官网宣传片<br>
<sub>画面取自其公开官网</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/toy3d.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/newsreel.mp4"><img src="examples/newsreel/preview.gif" width="100%" alt="newsreel"></a><br>
<b><code>newsreel</code></b> · 特斯拉 2026 Roadster 发布会，做成三十年代新闻片<br>
<sub>照片来自 Wikimedia Commons（CC0 / 公有领域 / CC BY 2.0 Steve Jurvetson）</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/newsreel.mp4">完整视频</a>
</td>
</tr>
<tr>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/filmroom.mp4"><img src="examples/filmroom/preview.gif" width="100%" alt="filmroom"></a><br>
<b><code>filmroom</code></b> · 一次两分是怎么来的：费内巴切对萨姆松卡尼克，2018<br>
<sub>比赛录像：土耳其篮协（TBF），CC BY 3.0，来自 Wikimedia Commons</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/filmroom.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/mystery.mp4"><img src="examples/mystery/preview.gif" width="100%" alt="mystery"></a><br>
<b><code>mystery</code></b> · 为什么你的朋友应该叫你爸爸（假正经科普论证）<br>
<sub>虚构内容，仅供娱乐 · 卡通画面由代码绘制</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/mystery.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/isometric.mp4"><img src="examples/isometric/preview.gif" width="100%" alt="isometric"></a><br>
<b><code>isometric</code></b> · 《一个快递是怎么到你手里的》：跟着一个包裹，从仓库走到你家门口<br>
<sub>数据：国家邮政局（2025 年）· 微缩世界和快递品牌都由代码画成</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/isometric.mp4">完整视频</a>
</td>
</tr>
<tr>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/trailer.mp4"><img src="examples/trailer/preview.gif" width="100%" alt="trailer"></a><br>
<b><code>trailer</code></b> · 《深空回声》：一部原创虚构科幻片的预告片<br>
<sub>虚构电影 · 画面、声音和人名全部由代码生成</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/trailer.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/dossier.mp4"><img src="examples/dossier/preview.gif" width="100%" alt="dossier"></a><br>
<b><code>dossier</code></b> · 《AI 的账单》：2026 年 10 月美股科技股，从历史新高到美联储议息周<br>
<sub>仅为新闻解读，不构成投资建议 · 原文摘自 SEC、台积电、美联储及各公司公告 · 配图由代码绘制</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/dossier.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/manga.mp4"><img src="examples/manga/preview.gif" width="100%" alt="manga"></a><br>
<b><code>manga</code></b> · 《咖啡因的45分钟》：一杯咖啡为什么让人清醒，讲成一场少年漫对决<br>
<sub>一般健康信息，不构成医疗建议 · 角色原创、由代码绘制 · 资料来源：IOM、EFSA、FDA、Reichert 等 2022</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/manga.mp4">完整视频</a>
</td>
</tr>
<tr>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/map.mp4"><img src="examples/map/preview.gif" width="100%" alt="map"></a><br>
<b><code>map</code></b> · 《波士顿地铁》：从 1897 年波士顿公园底下的一段隧道，讲到今天的四色线网<br>
<sub>地图数据来自 MassDOT / MBTA、美国人口普查局 TIGER/Line、Natural Earth</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/map.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/swiss.mp4"><img src="examples/swiss/preview.gif" width="100%" alt="swiss"></a><br>
<b><code>swiss</code></b> · 《智能指数 v5》：Artificial Analysis 在 2026 年 10 月 27 日发布的 AI 基准——九项评测、榜单、开放权重差距、每个任务的成本<br>
<sub>数字和图表来自 artificialanalysis.ai</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/swiss.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/lumen.mp4"><img src="examples/lumen/preview.gif" width="100%" alt="lumen"></a><br>
<b><code>lumen</code></b> · 《再刷五分钟》：报复性熬夜——不想结束的夜晚、第二天的代价，和一个小小的决定<br>
<sub>一般健康信息，不构成医疗建议 · 角色和场景原创、由代码绘制 · 资料来源：Kroese 等 2014、CDC / AASM、Williamson &amp; Feyer 2000、Van Dongen 等 2003、Chang 等 2015</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/lumen.mp4">完整视频</a>
</td>
</tr>
<tr>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/blueprint.mp4"><img src="examples/blueprint/preview.gif" width="100%" alt="blueprint"></a><br>
<b><code>blueprint</code></b> · 《机械表里发生了什么》：发条、轮系、擒纵、摆轮、走针——一边画一边按真实速比转起来<br>
<sub>通用示意机芯 · 资料来源：维基百科</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/blueprint.mp4">完整视频</a>
</td>
<td width="33%" valign="top">
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/collage.mp4"><img src="examples/collage/preview.gif" width="100%" alt="collage"></a><br>
<b><code>collage</code></b> · 《黄金：从 35 美元到 5318 美元》：1934 年定价、布雷顿森林、尼克松关闭兑换窗口、央行买金，再到 2026 年的纪录与大跌<br>
<sub>照片来自维基共享资源：美国国家档案馆、Oliver F. Atkins（公有领域）、Stevebidmead（CC0）· 价格：COMEX、世界黄金协会、路透社</sub><br>
<a href="https://github.com/BubbleBrainBB/BB-Video/releases/download/samples/collage.mp4">完整视频</a>
</td>
</tr>
</table>
<!-- gallery:end -->

## 安装

用 [`skills`](https://github.com/vercel-labs/skills) 命令（Claude Code、Codex、Cursor、OpenCode 等都能用）：

```bash
npx skills add BubbleBrainBB/BB-Video                                          # 交互式选择
npx skills add BubbleBrainBB/BB-Video --skill bb-video -a claude-code -g   # 全局装到 Claude Code
```

或者自己拷文件夹：

```bash
git clone https://github.com/BubbleBrainBB/BB-Video.git
cp -r BB-Video/skills/bb-video ~/.claude/skills/
```


### 需要

没有 npm 依赖。需要：

- **Node.js 18+**
- **Google Chrome** 或 Chromium（不在默认位置时设置 `CHROME_PATH`）
- **ffmpeg**（在 `PATH` 里）
- **Python 3** 和 **[edge-tts](https://github.com/rany2/edge-tts)**（配音用，`pip install edge-tts`）
- 联网：配音、网页字体，以及个别风格从 jsDelivr 加载的库（`toy3d` 用 three.js；GSAP / Matter.js 只在页面用到时加载）
- 可选：[Blender](https://www.blender.org) 3.6+，给 `toy3d` 做吉祥物模型（没有就用 three.js 搭）

## 用法

直接跟 Agent 说，比如：

- "用白板动画讲一下：天为什么是蓝的？"
- "把这道几何题做成讲解视频"（附上截图）
- "给 https://example.com 做一支发布视频，横屏竖屏都要"
- "用皮影戏讲刘邦斩白蛇"
- "用聊天记录风格讲一个历史典故"

Agent 会先给你看事实、旁白和分镜，再配音、画、渲染。成片在 `videos/<名字>/out/`（mp4、封面；白板和孔版还有一张全貌图）。用浏览器打开 `videos/<名字>/index.html` 可以预览、拖动进度。

## 原理

```
script.json（旁白）──► tts.py ──► 音频 + 逐词时间轴
index.html（画画的代码，renderFrame(t)）──► render.mjs ──► Chrome 逐帧截图 ──► ffmpeg ──► mp4
                                                     ├─► 自动检查、字幕、配乐 + 音效
                                                     └─► 成片检查（跳帧、闪帧、空放）
```

每一帧只由时间决定，所以渲染结果每次都一样、可以并行；Agent 也能在渲染整支片子之前，先看任意一个时刻的截图。

## 隐私与安全

- **旁白文字会发给微软的在线语音服务**（edge-tts 就是这样工作的）。不要把机密内容写进旁白。
- **做宣传片时会用无界面 Chrome 打开你给的网站**并截图（不登录，不下载网站文件）。
- **搜资料照片**（`footage.mjs`，片子需要真实照片而你没提供时才用）会把搜索词发给 Wikimedia Commons 的接口，只下载你同意的文件，并记下许可和署名。
- 网页字体和库从 jsDelivr / unpkg 按固定版本加载。除此之外不联网：没有统计上报、不需要 API key、不需要账号。
- `render.mjs` 会在无界面 Chrome 里打开项目的 `index.html`（可以读本地文件），也就是运行这个项目的代码。只渲染你自己或你的 Agent 做的项目。

## 许可

[MIT](LICENSE)。附带的第三方代码：[KaTeX](https://katex.org)（MIT，见 `skills/bb-video/explainer/runtime/katex/LICENSE`）。从 CDN 加载、各自的许可：three.js（MIT）、GSAP（Standard "no charge" 许可）、Matter.js（MIT）；字体 霞鹜文楷、Excalifont、Noto Sans / Serif SC、Inter、Oswald 等（SIL OFL 1.1）。
