# Case study: Alice pixel MV

Source: [miyang-ai/alice_fanart · 2026-10-16_alice_mv](https://github.com/miyang-ai/alice_fanart/tree/main/outputs/2026-10-16_alice_mv_%E5%BD%93%E7%84%B6%E5%8F%AF%E4%BB%A5%E5%A5%BD%E9%97%AE%E9%A2%98%E5%83%8F%E7%B4%A0MV)
Main file: [`index.html`](https://github.com/miyang-ai/alice_fanart/blob/main/outputs/2026-10-16_alice_mv_%E5%BD%93%E7%84%B6%E5%8F%AF%E4%BB%A5%E5%A5%BD%E9%97%AE%E9%A2%98%E5%83%8F%E7%B4%A0MV/index.html) (~140 KB, ~1880 lines), plus `当然可以好问题.srt`, `sprites/`, `assets/`.
Duration 44.3 s; single-file HTML + local assets; 16:9.

## The timing spine

From the comment at the top of `index.html`:

> 时间轴来源：faster-whisper small 对原曲做逐字识别，再按 150 BPM（每拍 0.4 秒，首拍 0.06 秒）校对。
> 原 LRC 只有句级时间，且「不躲不藏不绕不逃」等句与实际演唱相差数秒，因此不再使用。
> 35.2–39.4 秒识别不到清晰人声，这段按节拍编排成 Alice 的独舞，不绑定歌词。

Constants:

```js
const BEAT = 0.4, PHASE = 0.06, DURATION = 44.3;
```

- BPM 150 is only used for **body motion and scene beat**, not for the word times.
- Word times come from ASR + manual correction; the beat grid is a separate clock.
- The gap 35.2–39.4 is deliberately **dance, no lyric**: no fake words during an instrumental.

## Lyric data is word-level

```js
const LYRICS = [
  { w: [[0.94, '当然'], [1.48, '可以，'], [2.10, '好'], [2.28, '问题。']], end: 2.9 },
  { w: [[6.60, '我就'], [7.14, '在'], [7.42, '这，'], [7.70, '不躲'], [8.00, '不藏'], [8.40, '不绕'], [8.70, '不逃']], end: 8.95 },
  { w: [[8.96, '稳'], [9.48, '稳'], [9.78, '地'], [10.02, '接'], [10.32, '住'], [10.78, '你。']], end: 11.3 },
  // ...
];
```

Each entry is a **semantic word**, not a whole sentence and not a single character. Times are the word's **start**; `end` is the line end.

`charsOf(i)` splits a word into characters **inside the word's window**:

```js
L.forEach(([t, s], k) => {
  const next = k + 1 < L.length ? L[k + 1][0] : LYRICS[i].end;
  const cs = [...s.replace(/[，。]/g, '')];
  cs.forEach((c, j) => out.push({ c, t: t + (next - t) * 0.8 * j / cs.length }));
});
```

- For a two-character word, the second char lands at 40% of the word→next interval; not 50% of the whole line.
- Only used for giant per-character tiles in some scenes. The default type unit is the **word**.

## Type is a stamp

```js
function stampIn(e, t, t0, x, y, r = 0, from = 1.5, d = 0.12) {
  place(e, x, y, lerp(from, 1, eOut(prog(t, t0, d))), r, t >= t0 ? 1 : 0);
}
```

- Scale 1.5 → 1 in **0.12 s**.
- The word appears at its exact time; then it **stays**.
- `typeOut(full, t, t0, cps = 22)` is a separate typewriter for UI text (22 chars/s); not used to crawl lyrics.

## Scenes are hard cuts with one idea

```js
function scene(id, a, b, build, draw) { ... }
scene('answer', 0.94, 2.9, build, draw);
scene('here', 6.6, 7.66, build, draw);
scene('strike', 7.66, 8.96, build, draw);
```

- Every lyric line gets a scene; `a`/`b` match the word times.
- Example `here` (6.6–7.66): four giant chars 我/就/在/这 at their `charsOf` times, one per corner, each `stampIn`; no full line card.
- Example `strike` (7.66–8.96): four scenes-in-one for 不躲/不藏/不绕/不逃 at 7.66/8.00/8.40/8.70; each word has a huge verb, a 不, a strike bar; hard cuts inside the scene, no crossfade.
- The type is placed on a **fixed layer**; the camera does not move over the type.

## Body and world

- `beatPhase`, `beatPulse`, `beatIndex`; every actor has `squash`, `hop`, `groove`, `bounce`.
- `stage(...)` places sprites; `drawBurst`, `drawRing`, `drawStream` are beat particles.
- Alice stays on one side; actions are pose changes; no left/right teleporting.
- Explicit v7 rules from the file: one idea per scene; hard cuts; one background color per phrase; no flash white, no camera shake, no ghosting; marquee < 200 px/s; HUD persists; only “硬撑” block shakes.

## Visual system

- Paper `#FAFAF7`, ink `#1A1714`, rose `#C25566`, gold `#C9A96E`, sage `#8FA27A`, night `#1F2A44`, cream `#F3E6CC`.
- 28px grid, 4px ink borders, 8–12px hard shadows; Songti 900 for big type; mono for HUD.
- Sprites: 52 SVG poses (4 outfits × 13); fallback mapping for outfits with fewer poses; foot position stable.
- HUD: stage, hearts, score, combo, toast, marquee; updates on events, not every frame.

## What to copy

1. Word-level `LYRICS` arrays; semantic words.
2. Word stamp ~0.12 s; hold after.
3. One scene per lyric idea; scene `a/b` from word times.
4. Separate type clock and body beat clock.
5. Fixed type layer; fixed camera; hard cuts.
6. HUD and world persist; type is the hero.
7. If ASR is unsure, choreograph a dance/instrumental section instead of inventing words.
8. QA with `?t=` freeze frames.

## What not to copy

- The song, the Alice character, the 52 SVG sprites, the prompt library, the exact art.
- The 44.3 s timeline or its lyrics.
- The “faster-whisper can always do it” assumption: this song was clear enough; a dense mix may need Demucs or manual tap.
- Any scene that only works because of a specific asset; abstract the **function** of the scene.

## Why it feels right

- The type never competes with the singing duration: it fires in 0.12 s and holds.
- The word intervals are irregular because the singing is irregular; the eye gets rhythm, not a metronome.
- The scenes cut on phrase boundaries; the body keeps moving during holds.
- The key word gets a whole scene / a giant char, not a slightly bigger font in a line.
- There is no white flash, no camera shake, no 60fps particle storm; the restraint makes the hits read.

## Reproduction checklist

- [ ] Word array with times; no character-level spread over the line.
- [ ] 0.10–0.16 s stamp; hold.
- [ ] Scene table with `a/b`; hard cuts.
- [ ] Beat grid only for body.
- [ ] Key word gets hero treatment.
- [ ] `?t=` frames checked at 4 points.
- [ ] No flash/shake/ghost.
