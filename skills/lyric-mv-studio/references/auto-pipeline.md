# Auto pipeline

This is the concrete end-to-end run for:

> one song + one character image (or description) → character sheet → storyboard → images → word-synced HTML/MP4

It is a **stage-gated** pipeline, not an unbounded agent loop.

## Inputs

```
project/
  song.mp3
  character.png        (or character.txt description)
  lyrics.txt           (optional; ASR draft if absent)
  project.json
```

`project.json` is the single source of truth. See `examples/project.example.json`.

## Phase 0 — Intake

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 song.mp3
ffprobe -v error -show_entries format=duration,bit_rate -of json song.mp3
```

- Confirm rights, aspect, duration, style, budget.
- Create `project/character/poses`, `scenes`, `assets`, `preview`.
- Write `README.md` with source, model, seed policy, prompt version.

Exit if: no song, no character reference/description, no permission to call a paid image provider.

## Phase 1 — Analyze the song

```bash
# optional but recommended for ASR/word timing
python3 -m demucs.separate -n htdemucs --two-stems=vocals -o stems song.mp3
```

- Duration from ffprobe; BPM/beat map from librosa/aubio/madmom.
- If the tempo changes, store a beat map; do not force one BPM.
- Lyrics:
  - User text: use it.
  - LRC/SRT: line-level only; not word timing.
  - No lyrics: `faster-whisper` draft; ask user to correct.
- Word timing: see `pixel-lyric-mv/references/word-timing.md`.
- Output: `lyrics.txt`, `timeline.json` (draft), `analysis.json` (duration/bpm/sections).

## Phase 2 — Character bible (gate 1)

1. Analyze the reference: face, hair, eyes, skin, body, outfit, accessories, marks, palette, silhouette.
2. Write an **identity block** that will be reused verbatim in every prompt.
3. Generate a sheet:
   - front / 3/4 / side / back, neutral
   - 6 expressions
   - 6–8 poses matching the song's verbs
   - transparent background for poses
   - one 16:9 key visual with type-safe negative space
4. Contact-sheet review: same face/hair/eyes/outfit/silhouette.
5. Gate 1: user approves the sheet.

Output: `character/sheet.png`, `character/keyvisual.png`, `character/poses/*.png`, `character/identity.txt`.

If gate 1 fails: regenerate **only** the sheet; do not start scene generation.

## Phase 3 — Style pack (gate 2)

Pick one module from `references/style-modules.md`:

- `illustrated` (default, non-pixel)
- `pixel` (use `pixel-lyric-mv`)
- `paper`
- `3d`
- `game-ui`

Generate **one style frame**:

- same character, same outfit, same lyric line, final type layout
- 16:9; type safe area
- check contrast, silhouette, palette, legibility

Gate 2: user approves the style frame.

If gate 2 fails: change style tokens/composition, not the whole character.

## Phase 4 — Storyboard

```bash
python3 scripts/plan_mv.py project.json --out shotlist.json
```

- One shot per lyric line; split long lines at p2 or word groups.
- 1.5–3.0 s per shot; 45 s ≈ 15–25 shots.
- Shot list: lyric, start/end, shot type, character action, background, type layout, prompt, refs, negative, seed, output.
- Check: every lyric line has a shot; no duplicated line; no empty gap with a missing word.
- The planner uses line-level estimates for shot boundaries. Final word timing is separate; do not ship the estimate as word timing.

## Phase 5 — Generate assets

First three images only:

1. one character sheet
2. one style frame
3. one shot (`s01`)

Review. Then batch:

```bash
python3 scripts/gen_assets.py shotlist.json --dry-run --out-dir generation
# inspect generation/prompts/*.txt and generation/manifest.json
```

Actual generation:

- If `lovart-api` skill is available: load it and generate from the manifest prompts/refs. Confirm cost first.
- If `bailian-cli` skill is available: ask once before the first billable call, then run.
- If ComfyUI: use its workflow API; store workflow id/seed.
- If no provider: deliver storyboard + prompts + placeholders; do not fake images.

Rules:

- Use the character sheet as the reference for every shot, not a previous scene.
- Fixed seed where supported; record seed/model.
- No text in images; type is HTML/CSS.
- Leave 30–45% type-safe negative space.
- Max 2 retries per shot; then change composition/reference.
- Pause every 5–6 shots for a contact sheet.

Output: `scenes/s01.png`...; update `shotlist.json` status/seed/model.

## Phase 6 — Word timeline

- `timeline.json` with words, line starts/ends, p2.
- Use `pixel-lyric-mv` patterns: word stamps, 0.12 s, holds, hard cuts.
- If the user reports “first line good, later drift”: per-word tap, not a global offset.
- A/V lead only for constant offset.
- `?t=` checks at 4 points.

## Phase 7 — Assemble

- Start from `pixel-lyric-mv/assets/starter.html`; replace stage/card with the chosen style module.
- Layers per shot: background/plate → character cutout → type → HUD/decor.
- Hard cuts at shot boundaries; fixed camera.
- `render(t)` from `audio.currentTime`; `?t`, `__seek`, `__ready`.
- Single-file if assets small; otherwise `assets/` + relative paths.
- Optional MP4: Playwright frames/real-time + ffmpeg audio mux; verify first/last frame.

## Phase 8 — QA

- Contact sheet of all character shots; face/hair/eyes/outfit/palette.
- Lyric coverage: every line/word appears; no typo/omission.
- Word alignment: 4 points + spot-check 5 words.
- Type legibility: contrast, safe area, mobile width.
- Shot duration/gaps: no shot longer than 3.5 s without a reason.
- Rights/model/seed in README.
- `python3 scripts/validate_shotlist.py shotlist.json`.
- `python3 scripts/validate_timeline.py timeline.json` (from pixel skill).

## Cost estimate

Let `N = ceil(duration / 2.5)`.

- character sheet: 6–10 images (pick 1)
- style frame: 1–2
- shots: N
- retries: +30–50%
- total ≈ (N × 1.5) + 10

Examples: 30 s → 12 shots → ~28 images; 60 s → 24 shots → ~46 images.

Do not batch until the user confirms budget and provider.

## Failure / stop rules

Stop and ask when:

- character sheet drifts twice
- style frame is unreadable
- provider balance/price unknown
- lyrics missing/uncertain
- the song has no clear vocal and user wants word sync
- generated images contain text/watermarks repeatedly

## What “automatic” means

After the two gates and budget confirmation, the rest can run without interaction:

- shotlist, prompts, batch generation, naming, timeline, assembly, contact sheets, QA report.

Before the gates, “automatic” means **automatic preparation**, not blind spending.
