# Character bible

The character sheet is the **source of truth** for every generated shot. If the sheet is wrong, the MV is wrong.

## 1. Identity extraction

From the user's reference image, write a compact block:

```text
NAME: ...
FACE: face shape, jaw, nose, eye shape, brows
HAIR: color, length, parting, texture, accessories
EYES: color, pupil/highlight, makeup
SKIN: tone, marks, freckles
BODY: height/build, hands, silhouette
OUTFIT: top, bottom, shoes, outerwear, stockings, accessories
PALETTE: 5–7 hex colors
SIGNATURE: one recognizable detail (ribbon, earring, scar, hairpin)
FORBIDDEN: do not change hair color, eye color, outfit, age, body
```

Reuse this block **verbatim** in every prompt. Do not paraphrase the hair/eye colors.

## 2. Sheet prompts

Generate one sheet per attempt; do not ask for 20 images in one call.

### Turnaround

```text
Character reference sheet, same character as reference, [IDENTITY BLOCK],
front view, three-quarter view, side view, back view, neutral expression,
full body, consistent proportions, consistent outfit, clean line, [STYLE],
plain warm white background, no text, no watermark, no extra characters,
no cropped feet, 2048x2048
```

### Expressions

```text
Same character, [IDENTITY BLOCK], expression sheet: neutral, soft smile,
laugh, surprised, sad, determined, looking away; head and shoulders;
consistent face, consistent hair, no text, no watermark, 2048x2048
```

### Poses

Choose 6–8 verbs from the song (walk, turn, reach, hold, kneel, look up, run, sit). One row per pose:

```text
Same character, [IDENTITY BLOCK], full body, [POSE], [OUTFIT],
transparent background, feet visible, neutral shadow, no text, no props
unless specified, [STYLE], 2048x2048
```

### Key visual

```text
Same character, [IDENTITY BLOCK], cinematic key visual, [SCENE],
[MOOD/LIGHT], 16:9, character on the [left/right] third,
30–40% clean negative space on the [opposite] side for typography,
no text, no logo, no watermark, [STYLE], 1920x1080
```

## 3. Consistency checks

Compare against the reference, not against the previous generation:

- [ ] same face shape / jaw / nose
- [ ] same hair color, length, parting
- [ ] same eye color/shape
- [ ] same outfit pieces and colors
- [ ] same accessories/signature
- [ ] same body proportions/silhouette
- [ ] same palette
- [ ] no extra fingers/limbs
- [ ] no text/watermark
- [ ] feet/pose usable for cutout

Reject if any of the first five fail. Do not “fix in post”; regenerate the sheet.

## 4. Reference strategy

- Every scene uses the **approved sheet** as reference, not the previous scene.
- If the provider supports multiple refs: sheet + outfit detail + pose.
- If the provider only supports one ref: use a tight sheet crop with face + outfit.
- Seed: fix it if the provider supports; otherwise record the seed and reuse the same sheet/ref.
- Image-to-image strength: high enough to keep identity, low enough to allow the pose. Test on one image.

## 5. Poses for lyrics

Map verbs to poses:

| lyric | pose |
|---|---|
| 走/行 | walk, weight on front foot |
| 转身/返 | three-quarter turn, looking back |
| 看/望 | head turn, eyes to the side |
| 接/抱 | both arms forward, open |
| 烧/燃 | hands cupped, warm light on face |
| 山/远方 | wide, small figure, looking up |
| 江/水 | profile, wind, hand near chest |
| 坐下/停 | seated, hands on knees |
| 唱/呼 | head up, mouth open, chest out |

Do not generate a new pose if the shot can use a cutout + camera/scale/position change.

## 6. Cutouts

- Transparent PNG/WebP; feet at the bottom edge; no crop.
- No baked shadow; add CSS drop shadow/ground shadow.
- Keep hands/props inside the frame.
- Test at 1920 and at 50% scale.
- If the model cannot do transparency cleanly: generate on a flat chroma background and remove it; keep the same lighting.

## 7. Gate 1

Do not proceed to style frames or shots until the user says the sheet is the character.

If the user only has a description (no image):

- Generate 3 candidate sheets with different seeds.
- Ask the user to pick one.
- Then lock the identity block and continue.
