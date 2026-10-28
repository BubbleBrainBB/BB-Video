# Word timing

The type clock runs on **word timestamps**. Everything else (beat, scene, body) can be approximate; word times cannot.

## 1. Source hierarchy

| Source | Granularity | Use |
|---|---|---|
| Demucs vocal + faster-whisper/WhisperX | word | best automatic |
| Page tap calibration | word | reliable when ASR fails |
| Manual listening/table | word | reliable, slow |
| LRC / SRT | line | scene boundaries only |
| Proportional split | fake | **never** |

A line-level LRC can be 0.2–2 s off the actual vocal; it cannot give word rhythm. It is not a word timeline.

## 2. Recommended pipeline

```bash
# 1) isolate vocals (optional but strongly recommended for dense mixes)
python3 -m demucs.separate -n htdemucs --two-stems=vocals \
  -o stems song.mp3
# -> stems/htdemucs/song/vocals.wav

# 2) word-level ASR
python3 scripts/word_timings.py \
  --audio stems/htdemucs/song/vocals.wav \
  --language zh \
  --model small \
  --out words.json
```

`faster-whisper` is the default in `scripts/word_timings.py`; WhisperX is a good alternative when you need phoneme-level alignment:

```bash
# WhisperX (separate install)
whisperx vocals.wav --model small --language zh \
  --output_format json --word_timestamps True
```

Then **map ASR words to lyric words by hand or with a script**:

- ASR gives “当然/可以/好/问题”, the lyric gives the same; map by text/order.
- If ASR is wrong, discard it; do not force it to fit. Use tap or manual.
- Keep the word's start; the type stamp is at the start.

## 3. Beat / phase

- If the song is steady: BPM = 60000 / beat_ms; phase = first beat offset.
- If the song changes tempo: set `bpm: null`; use word times for type, and a **beat map** for body:
  ```json
  "beats": [{"t": 0.06, "bpm": 150}, {"t": 12.4, "bpm": 140}, ...]
  ```
- Never quantize word times to the beat unless the vocal is actually on the grid; quantizing creates visible drift.

## 4. Tap calibration

When ASR is unreliable, the page can have a 20–30 word tap pass:

1. Play the audio from 0.
2. Each time the next word starts, press Space / tap.
3. Record `audio.currentTime` for that word.
4. Apply: update word times; line starts from the first word; line end from the next line; p2 from the first word of phrase 2.
5. Store locally; allow undo/redo.

Rules:

- Tap **words**, not characters. 20–30 taps per 30 s is enough.
- Do not tap on a backing beat; tap the syllable you hear.
- If the song has long instrumental sections, skip them (no words).
- After apply, set global A/V offset to 0; the tap times are the reference.
- If one word is still wrong, allow a ±0.02 s nudge per word; do not shift the whole line.

## 5. A/V drift

Two different problems:

| Symptom | Cause | Fix |
|---|---|---|
| Everything late/early by the same amount | output latency, encoder delay, line offset | one global lead |
| First line OK, later lines worse | word times are wrong / line starts are wrong | per-word timing or tap; not global lead |
| One word late inside a line | word start wrong | nudge that word |

Implementation:

```js
const t2 = clamp(audio.currentTime + AV_LEAD, 0, DURATION);
```

`AV_LEAD` positive = picture earlier. Do not hide per-line drift with a global lead; it will over-correct the first line and under-correct the last.

## 6. Data mapping

Lyrics are usually written as lines, not words. Split semantically:

```
香火 / 在 / 雨中 / 烧 / 几十个 / 暑 / 和 / 寒
```

Not:

```
香 / 火 / 在 / 雨 / 中 / 烧 / 几 / 十 / 个 / 暑 / 和 / 寒
```

Why: a word is a unit of meaning and a unit of type. A 2–3 character word can appear as one stamp; a single character per 0.05 s becomes a machine-gun blur; a 12-character line becomes a teleprompter.

## 7. Validation

- Word times strictly non-decreasing.
- Every word inside its line.
- Lines non-overlapping; `end <= duration`.
- First word of line ≈ line.start; last word + hold <= line.end.
- No word gap > 4 s within a line unless it is an intentional instrumental.
- Run `scripts/validate_timeline.py timeline.json`.

## 8. What “aligned” means

Not “every character at its syllable”. It means:

- The **word** lands when it is sung.
- The **key word** gets its hero at the same moment.
- The **line** starts/ends at the right phrase.
- A constant offset has been calibrated; no cumulative drift.

If the user says “first line good, later lines drift”, the answer is never “increase the global offset”; it is “fix the word timeline”.
