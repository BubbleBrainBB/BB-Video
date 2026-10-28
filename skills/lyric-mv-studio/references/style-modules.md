# Style modules

The timing/type engine is the same for every module. Only assets, CSS, and prompt tokens change.

## Shared rules

- 16:9 or 9:16; 1920×1080 or 1080×1920.
- One idea per lyric phrase; hard cuts; fixed camera.
- Type is a separate layer; images never contain text.
- Character is on a fixed side when cut out; plate/background behind.
- Leave 30–45% type-safe negative space.
- Palette: 5–7 colors; no rainbow.
- The key word can be bigger/colored; one hero at a time.

## 1. `illustrated` (default, non-pixel)

**Assets**

- full-frame scene plate (background + light + atmosphere)
- character cutout (transparent waist-up or full body)
- optional foreground prop (leaf, glass, hand)
- grain/paper texture at low opacity

**Look**

- painterly / anime / editorial illustration
- soft directional light; one warm/cool contrast
- large negative space for type; character occupies one third
- no outlined UI; type floats on the image

**Type**

- Songti/Serif 900 for Chinese; italic serif for English
- ink or paper color; key word rose/gold
- type safe area: bottom-left or right third
- HUD minimal or none

**Prompts**

```text
[STYLE: painterly editorial illustration, soft brush, subtle grain],
[IDENTITY BLOCK], [POSE/ACTION], [SETTING],
cinematic composition, character on the right third,
clean negative space on the left for typography,
[warm/cool light], [palette], no text, no watermark, 16:9
```

**Motion**

- character cutout: slow breathing, hair/cloth sway, 1–2 px float
- plate: slow 1.02→1.06 push or parallax; no camera shake
- type: word stamps; hard cuts
- use full-frame images; no sprite requirements

## 2. `pixel`

Use [`../../pixel-lyric-mv/SKILL.md`](../../pixel-lyric-mv/SKILL.md).

**Assets**

- sprite poses (SVG/PNG), 1–4 outfits
- pixel backgrounds/UI
- 28px grid, 4px ink, hard shadow

**Type**

- Songti 900; key words rose/gold; HUD/mono
- side hero char; card; score/hearts

**Prompts**

- “pixel art, 16-bit, limited palette, crisp edges, no anti-aliasing”
- character sheet on flat background; green/chroma for cutout
- no text

## 3. `paper`

**Assets**

- paper texture, torn edges, ink washes, seals, stamps
- character cutout with cut-paper edge or ink contour
- gold/vermilion accents

**Look**

- art book / letterpress / Chinese stationery
- grain, fibers, uneven ink; no glossy gradients
- type as seal/letterpress; vertical columns possible

**Type**

- Songti/Kaishu; ink; vermilion seal; gold rule
- large single characters; few words per scene
- paper texture behind type; ensure contrast

**Motion**

- paper layers slide 4–8 px; no 3D flip
- type stamps like a seal; hard cuts
- quiet, tactile; no particles storm

## 4. `3d`

**Assets**

- 3D character render with transparent background
- 3D environment/plate with depth of field
- optional depth map for parallax

**Look**

- cinematic render; volumetric light; shallow DOF
- character on third; clean negative space
- type in a clean sans/serif; no pixel grid

**Type**

- modern serif/sans; white/cream; key color accent
- type may sit in front of/behind a foreground element for depth
- keep legibility; no busy bokeh behind small text

**Motion**

- subtle parallax 2–6 px; no camera shake
- character idle; cloth/hair; blink
- type stamps; hard cuts

## 5. `game-ui`

- A hybrid: illustrated/pixel plates + game HUD, cards, score, hearts.
- HUD frames the type; the world is still cinematic.
- Use when the song/character is playful or the brief asks for a game.

## Style frame

Before batch generation, create **one** frame:

- same character, same outfit
- one lyric line, final type placement
- final palette/light
- 16:9/9:16
- review at 100% and at phone width

Do not batch until the style frame is approved.

## Style drift

If shots drift in style:

- put the style tokens at the **start** of every prompt, verbatim
- use the style frame as an additional reference
- keep the same model/checkpoint
- reduce prompt variety; vary only pose/setting
- reject and regenerate rather than “grade it later”
