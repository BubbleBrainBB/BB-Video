# Type rhythm

## The unit

| Unit | Result | Verdict |
|---|---|---|
| Character | one char every 0.2–0.5 s; slow crawl | wrong |
| Word | 1–3 chars in 0.10–0.16 s; hold; next word | **right** |
| Phrase burst | 6–8 chars at once; blur, no word rhythm | wrong |
| Whole line | one card; “PPT” / “古诗” | wrong |

A word stamp is an **event**, not a progress bar.

## Stamp

```js
function stamp(t, t0, dur = 0.12) {
  const p = clamp((t - t0) / dur);
  return 1.5 - 0.5 * eOut(p); // scale 1.5 -> 1
}
```

- Duration 0.10–0.16 s.
- Scale from 1.3–1.5 to 1.
- Opacity hard on at `t0`; no slow fade.
- After the stamp, the word is static; it holds until the next word.
- Key word can get an extra color/block/hero; not a longer crawl.

## Word windows

For a word at `t0`, the next word at `t1`:

- Type stamp at `t0`.
- Hold `t0 + 0.12` to `t1`.
- If the gap is short (< 0.2 s), the words may overlap slightly; keep each stamp short; do not merge into a burst.
- If the gap is long (0.8–2 s), the word stays on screen; that hold is the rhythm.

## Line / scene

- A line has 4–12 words; each word stamps at its own time.
- The line is never shown all at once; it accumulates word by word.
- A scene can cut at a line boundary or inside a long line; one idea per scene.
- The line can hold at the end for 0.2–0.6 s; that is the gap.
- Do not add new type during the gap; let the body/beat carry it.

## Key hierarchy

- Normal word: ink; current word has a light tint/underline.
- Key word: rose/gold; optional hero char on the side.
- Hero: 300–900 px; one at a time; it lands **when the key word lands**.
- Do not make every word a hero; the eye needs a base note.
- Do not make the hero a separate animation that starts earlier than the word; it will feel out of sync.

## Scene types

1. **Type wall**: one giant word or 2–4 words; high contrast; no card.
2. **Object**: the word is an object (burning incense, a mountain, a bead).
3. **Character beat**: the character performs the verb; the word is secondary.
4. **UI card**: a game/HUD card; the lyric is a line inside; use sparingly.
5. **Grid**: multiple words in a layout; each stamps in.
6. **Gap / dance**: no lyrics; body only; instrumental.
7. **Finale**: the line fully assembled; hold; end card.

## Holds and gaps

- Word gap: 0.1–0.4 s typical; 0.8–2 s for a held note.
- Line gap: 0.2–0.6 s minimum; if the song has a real instrumental gap, hold longer.
- Scene gap: the previous scene's last word + 0.2 s; no new type.
- A gap is not empty: body/beat, HUD, ambient, or a held hero.

## Failure table

| Symptom | Fix |
|---|---|
| “像古诗” / teleprompter | stop per-char reveal; use word stamps |
| “像 PPT” | don't show the full line at once; word events |
| “机关枪” | don't put 6–8 chars in one 0.1 s burst; word units |
| “没节奏” | word times are wrong/quantized; use actual word times |
| “字太小” | fewer words per scene; bigger card; split line |
| “字太大/溢出” | 2 rows max; dynamic font by longest word; test 1920 and mobile |
| “闪/晕” | remove white flash, camera shake, ghost frames; hard cuts |

## Type QA

- Pause at a random word: is the current word the one you hear?
- Is the current word fully visible within 0.16 s?
- Does the next word wait for its time, or does it appear early?
- Is there a moment of hold after each word?
- Does the line ever appear all at once?
- Is there exactly one hero?
