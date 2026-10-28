# Image prompts

## Formula

```text
[STYLE TOKENS] + [IDENTITY BLOCK] + [ACTION/POSE] + [SETTING] +
[COMPOSITION / TYPE SAFE AREA] + [LIGHT] + [PALETTE] +
[NEGATIVE] + [ASPECT] + [NO TEXT]
```

Order matters: style and identity first; composition last; negative at the end.

## Identity block

Write once, reuse verbatim:

```text
same character as reference: [face], [hair color/length/style], [eye color/shape],
[skin], [body], [outfit pieces + colors], [accessories], [signature];
do not change face, hair, eyes, age, body or outfit
```

Do not say “beautiful anime girl” only; that is not identity.

## Style tokens

```text
pixel: 16-bit pixel art, limited palette, crisp edges, no anti-aliasing, 28px grid
illustrated: painterly editorial illustration, soft brush, subtle grain, cinematic
paper: paper cut, ink wash, letterpress, fibers, torn edge, gold/vermilion
3d: cinematic 3D render, volumetric light, shallow depth of field, clean materials
```

Pick one; do not mix.

## Composition / type safe area

```text
character on the right third, looking left,
clean negative space on the left 40% for typography,
horizon low, face above the type line, no object crossing the type area
```

- 16:9: type usually left or bottom; character right or top-right.
- 9:16: type top/bottom; character center/lower.
- Leave 30–45% clean area; do not put eyes behind the type.
- The type layer is added later; never ask the model to draw it.

## Light / palette

- one key light; one rim; one practical (lamp/sun/window)
- palette: 5–7 hex colors; write them as words (“warm paper, ink black, rose, muted gold”)
- avoid “neon rainbow” unless the style needs it

## Negative prompt

Baseline:

```text
text, letters, watermark, logo, signature, extra fingers, extra limbs,
deformed hands, crossed eyes, duplicate face, different character,
different hair color, different outfit, cropped feet, blurry, lowres,
jpeg artifacts, frame, border
```

Add style-specific negatives (e.g., “3D render” for illustrated, “smooth gradient” for pixel).

## Reference images

- character sheet is the primary ref for every shot
- for outfits: sheet + outfit detail crop
- for poses: sheet + pose ref (optional); avoid using a previous scene as the identity ref
- if the provider supports `image_strength`/`denoise`: test 0.45–0.7; too high drifts, too low cannot pose

## Seed

- Fix the seed for a series if the provider supports it.
- If not, record the seed used for the approved sheet/style frame and reuse the same reference.
- Do not chase a perfect seed; change composition/ref instead.

## Transparent cutout

```text
full body, feet visible, transparent background, no shadow, no floor,
centered, generous margin, no crop, no text
```

- If transparency is unreliable: flat chroma green/blue; remove later; keep lighting neutral.
- Add shadow/ground in CSS, not in the image.

## Shot prompts

### Character sheet

```text
[STYLE] character reference sheet, [IDENTITY BLOCK],
front, three-quarter, side, back; neutral expression; full body;
consistent proportions and outfit; plain warm background;
no text, no watermark, no extra characters, 2048x2048
```

### Scene with cutout

```text
[STYLE] [IDENTITY BLOCK], [POSE], [SETTING], [LIGHT], [PALETTE],
character on the right third, 40% clean negative space on the left for type,
no text, no watermark, 16:9
```

### Full-frame scene (no cutout)

```text
[STYLE] [SETTING], [TIME/WEATHER], [LIGHT], [PALETTE],
wide cinematic composition, low horizon, clean sky/negative space for type,
no people, no text, no watermark, 16:9
```

### Key visual

```text
[STYLE] [IDENTITY BLOCK], [ICONIC POSE], [SETTING], cinematic key visual,
character on one third, strong silhouette, 35% negative space for title,
no text, no logo, no watermark, 16:9
```

## Prompt hygiene

- Do not put the lyric line in the image prompt as text; use it only as mood/action.
- Do not ask for “Chinese calligraphy” in the image; the model will write wrong characters.
- Do not use “masterpiece, best quality, 8k” as a substitute for composition.
- Keep the character block identical; vary only action/setting/light.
- If the model adds text, add “no text, no letters, no watermark” at the start and end.
- If hands fail, crop/avoid hands or use a pose without hands; don’t spend 10 retries.

## Provider notes

- `lovart-api` / `bailian-cli` skills: load them for actual calls; confirm cost before batch.
- ComfyUI: use API workflow; record checkpoint, LoRA, sampler, steps, seed.
- Any provider: save the exact prompt, refs, seed, model, size, and output path in `shotlist.json`.
