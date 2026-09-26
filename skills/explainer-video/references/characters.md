# 角色

Notion 风格的卡通人物：黑白粗墨线，最多加一个强调色，胸像（头 + 肩膀）。
**所有角色都用同一套代码生成，区别只在"规格"参数。** 不要为某一个人物单独写绘图代码。

## 1. 什么时候用角色

- 讲到**具体的人**（科学家、历史人物、发明者）时，用角色代替名字便签。
- 需要一个**提问者**把观众的疑问说出来（"那为什么……？"）。
- 题目讲解里需要一个**讲解老师**。
- 纯粹讲现象、讲概念、没有人物的视频，**可以不用**角色。不要为了用而用。

## 2. 从任意人物到规格：特征提炼方法

观众认出一个卡通人物，靠的是**剪影**和一两个**标志性特征**，不是五官细节。
按下面的顺序提炼，**每一项只取最有辨识度的那一点**，没有特点的项保持默认：

1. **年龄段**：kid / adult / elder。影响脸型比例、皱纹、眼睛大小。
2. **剪影**（最重要）：发型轮廓、长度、质感，或者帽子。不看五官，只看轮廓能不能认出来。
3. **脸上的标志**：胡子、眼镜。有就用，没有就不加。
4. **服装**：体现时代或职业，比如领巾代表古代欧洲学者，白大褂代表科学家，连帽衫代表学生。
5. **一个强调色**：放在衣服、领带、发饰或帽子上。一个角色只用一个强调色。
6. **标志性道具**（可选）：部件库里没有、但对这个人物很关键的东西，用自定义部件补画。

提炼完先问自己：**只看黑白剪影，观众能不能认出这是谁 / 这是什么身份？** 认不出，就强化第 2、3 项，而不是加更多细节。

## 3. 规格参考

```js
// characters.js
window.CAST = {
  名字: {
    age: 'adult',            // kid | adult | elder
    face: 'oval',            // oval | round | long | square | heart
    nose: 'hook',            // hook | small | round | long | button
    hair: {
      style: 'side-part',    // side-part | middle-part | bangs | slick | spiky | afro | bun | ponytail | buzz | receding | bald
      length: 'short',       // none | short | medium | shoulder | long（后面垂下来的头发）
      texture: 'straight',   // straight | wavy | curly | coily | messy
      color: 'black',        // black | brown | gray | white | blonde | red | 任意色值
    },
    facialHair: [],          // 可组合：mustache | walrus（大胡子）| beard | goatee | stubble | wisp（三绺长须：细八字胡 + 下巴一绺，古代文人、长者）
    facialHairColor: 'gray', // 不写则跟头发同色
    glasses: 'none',         // none | round | square | sunglasses
    hat: 'none',             // none | top-hat | cap | beret | bow | headband | guan（发髻上的小冠，古代官员、士人）| mian（冕旒，帝王）
    earrings: false,
    outfit: { style: 'tshirt', color: 'white' },
      // style: tshirt | vneck | scoop | collar | suit | cravat | turtleneck | hoodie | labcoat | robe（交领右衽长袍）
      // color: white | black | accent | 任意色值；suit 可加 tie，labcoat 可加 shirt，robe 可加 trim（领缘颜色，默认强调色）
    accent: '#D6342C',       // 强调色
    parts: [],               // 自定义部件，见第 4 节
  },
};
```

**风格约束**：头发以黑色填充为主，浅色头发（白、灰、金）会自动加发丝线；衣服最多一个颜色；不要写实肤色，保持白脸。

## 4. 自定义部件

部件库没有的东西（头巾、皇冠、耳后的铅笔、特殊发型……），在角色的**局部坐标系**里用 SVG 路径补画：

- 脸中心是 (0, 0)，脸宽约 140（x 从 -70 到 70）
- 头顶 y ≈ -100，下巴 y ≈ 95，眼睛 (±26, -2)，嘴 (0, 56)
- 脖子根 y ≈ 128，胸像底边 y = 230，肩膀外缘 x = ±150

```js
parts: [
  { layer: 'top', d: 'M-60,-110 L-40,-150 L0,-120 L40,-150 L60,-110 Z', fill: '#E0B000' },  // 例：皇冠
]
```
`layer` 取值：`hairBack`（头后面）、`body`（衣服上）、`hairFront`（头发前面）、`top`（最上层）。
笔宽默认 5，颜色默认黑色；可以用 `stroke`、`width` 修改。`fill` / `stroke` 写 `'accent'` 就用这个角色自己的强调色，
这样同一个道具（比如一把剑）可以原样给不同角色用。
部件画在 `hairBack` 层时会被身体和头挡住，适合"从肩膀后面露出来"的东西（背着的剑、箭筒、书卷）。
画完一定要用定妆图检查位置。

## 5. 放进视频

```js
const c = b.character(CAST.名字, { x: 1650, y: 1080, size: 380, at: T.start('intro'), flip: false });
```
- `x, y`：胸像**底边中点**的位置。y 通常取画面或区域的底边，让人物"站"在边缘上。
- `size`：高度（像素），一般 300–420。
- `flip: true`：左右镜像，让人物朝向画面内容。
- 出场方式和白板其他元素一样，是一笔一笔画出来的（默认 1.8 秒）。

### 动作
| 写法 | 作用 |
|---|---|
| `c.expr(at, 'think')` | 切换表情，0.3 秒平滑过渡 |
| `c.expr(at, { lookX: 1 })` | 只改某几个参数（局部覆盖） |
| `c.look(at, x, y)` | 眼睛看向某个方向（-1 到 1） |
| `c.say('id')` / `c.say(['id1','id2'])` | 这几句旁白由这个角色"说"：嘴巴跟着逐词时间开合 |
| `c.say('id', { from: '任何', to: '吸引' })` | 只说这句里的一段（旁白"他说：……"时，只有引号里的部分由角色说） |
| `c.nod(at)` | 点头 |
| `c.point(at, x, y, { hold: 1.5 })` | 抬起手臂（肩 → 肘 → 手）指向白板上的世界坐标 (x, y)；目标在下方时改为水平指 |
| `c.move(...)` `c.erase(...)` `c.pulse(...)` | 和其他元素一样 |

眨眼、呼吸起伏、说话时的轻微晃动都是自动的。

**表情**：`neutral` `smile` `happy` `explain` `think` `surprised` `confused` `sad` `serious` `proud` `excited`
表情参数（用于局部覆盖）：`eyeOpen` `eyeSize` `lookX` `lookY` `happyEyes` `browL` `browR` `browTilt` `mouthCurve` `mouthOpen` `mouthWidth` `mouthShift` `tilt`

## 6. 表演原则

- **角色是配角**：放在画面边缘或角落，不能挡住正在讲的内容；同一画面一般只放一个角色。
- **表情跟着叙事节拍走**：提出问题时 `think` 或 `confused`，揭晓答案时 `surprised` 然后 `happy`，讲解时 `explain`。
- **视线引导观众**：新内容出现时，让角色 `look` 或 `point` 过去。观众会跟着角色的视线看。
- **只在"角色的台词"上 `say`**：旁白如果是在转述这个角色的话（"他的答案是……"），才让他张嘴；旁白在描述他时，他应该闭嘴做表情。
- **同一画面有两个以上角色时**（对话、对峙），用 `flip` 让他们面对面；每句台词只让说话的那个人 `say`，另一个人做反应表情。
- **不要一直动**：一句话里最多一个明显动作（换表情、指向、点头三选一），其余时间让自动的眨眼和呼吸去"撑"。

## 7. 流程

1. 在项目的 `characters.js` 里写好规格。
2. 渲染定妆图：`node scripts/cast.mjs <项目>` 看所有角色；`node scripts/cast.mjs <项目> <名字>` 看某个角色的全部表情、说话，以及四个方向的指向（右上、左、右下、正上）。
3. **新角色的定妆图先给用户确认**，再放进视频。

## 8. 规格示例（只是示例，按第 2 节的方法为每个视频设计自己的角色）

```js
{ age: 'kid', face: 'round', nose: 'button', hair: { style: 'ponytail', color: 'black' }, hat: 'bow', outfit: { style: 'tshirt', color: 'accent' }, accent: '#E07B00' }   // 提问的小朋友
{ face: 'oval', nose: 'small', hair: { style: 'bangs', length: 'medium' }, glasses: 'round', outfit: { style: 'collar' } }                                              // 讲解老师
{ age: 'elder', hair: { style: 'spiky', length: 'medium', texture: 'messy', color: 'white' }, facialHair: ['walrus'], outfit: { style: 'collar', color: '#9A9A9A' } } // 白发老教授
{ face: 'long', nose: 'long', hair: { style: 'middle-part', length: 'shoulder', texture: 'curly' }, outfit: { style: 'cravat', color: '#8B5A3C' } }                   // 17 世纪欧洲学者
{ age: 'elder', hair: { style: 'bun', length: 'none' }, facialHair: ['wisp'], hat: 'guan', outfit: { style: 'robe' }, accent: '#1E8A4C' }                          // 中国古代文官 / 谋士
{ face: 'square', hair: { style: 'bun', length: 'none' }, facialHair: ['beard'], hat: 'mian', outfit: { style: 'robe' }, accent: '#D6342C' }                         // 中国古代帝王
```
**同一个时代的几个人物**（衣服都一样）：靠第 2 项剪影（冠 / 冕 / 只有发髻）和第 3 项（有没有胡子、什么胡子）拉开差别，
再各给一个强调色；实在分不开就加一个标志性道具。
