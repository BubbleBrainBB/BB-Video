# Style document template

Every `styles/<name>/STYLE.md` follows this outline, in this order, so any style can be read the same way. (The same outline in Chinese: `TEMPLATE.zh.md`.)

A style only decides **how things look, move and sound**. It never decides what the video says: the content mode (`references/modes.md`) is chosen from the topic, and any topic can be drawn in any style the style table recommends.

```
# <Style name> (`<id>`)
One paragraph: what a frame of this style looks like.

## 0. Safety                   (only when the style has hard safety rules — read first)
## 1. When to use              topics / content it suits, and what it does not suit
## 2. What it is (and isn't)   the essence; the look it must not slide into
## 3. Color                    palettes, inks, how colors are used by role
## 4. Type                     fonts, sizes, how text enters
## 5. Motion                   how things appear, move and leave; timing
## 6. Camera and transitions   camera moves, chapter / page / section changes
## 7. Sound                    what the style sounds like (music, effects)
## 8. Signature moves          what only this medium can do — pick per video, don't use all
## 9+. Style-specific chapters (only when needed: characters / figures, layouts, pages, cover, images and video…)
## N-3. Pitfalls and self-check  common mistakes, and what to check on the rendered frames
## N-2. Variation              how to make two videos in this style look different (palettes, layouts, pacing)
## N-1. API quick reference    every component, its options, a minimal example
## N. Not supported yet        what the style can't do yet (say so plainly to the user)
```

Rules:
- Keep the numbered `##` sections in this order; a section with nothing to say gets one line saying so rather than disappearing.
- Style-specific chapters go between "Signature moves" and "Pitfalls", numbered on from 9.
- Named sections other files point to ("Cover", "Figures", "Images and video", "Pitfalls and self-check") keep those exact names.
