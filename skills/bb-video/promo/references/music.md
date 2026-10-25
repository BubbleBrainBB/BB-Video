# Score: improvise music for each product that follows the picture's rhythm

> A promo's sound = score (here) + sound design (`references/sound.md`). The score carries rhythm and mood and sits under the sound effects; the two must be in the same key.

You (the agent) **improvise** every film's score for its product: write `score.js` in the project. The engine (`scripts/music.mjs`) plays it, rises and falls with the picture's sections, and checks it automatically.
The 5 sample scores in `../core/scripts/scores/` (minimal electronic / ambient / bright pop / cinematic / lo-fi) are only **examples of how to write one**, not categories — don't apply them as is, and don't write every score as one of them.

## Overall requirements (must follow)

1. **Start from the product**: first write down in one sentence what this film should make people feel (e.g. "a quiet, hand-made darkroom", "a crisp, trustworthy data tool", "a relaxed, slightly playful social app"), then derive tempo, key, timbres and rhythmic density from it. Put it under "Score" in brief.md.
2. **Tempo follows the edit**: `bpm` sets the picture's beat grid, so set the score's tempo before writing the picture. Fast cuts, dense information → fast; lots of space and slow shots → slow.
3. **Structure follows the picture**: section intensity (`F.section`) is set by the picture; the score only decides at which intensity each part plays (`from` / `to`). Intensity 0 still has sound (the bed); intensity 3 is the full arrangement.
   Sections can also carry whole-mix moves (the quick version marks them from the rhythm sheet): `build: true` makes the section go from muffled to bright (a low-pass slowly opening from 300 Hz, building up); `stop: seconds` makes the music slow down like a tape and stop just before the section, go silent for a moment, then crash back in on the beat with the hit (`hit`). In a hand-written film: `F.section(t, 3, { hit: true, stop: F.B })`.
4. **Have a hook**: write a 1–2 bar melodic motif (`motif`) that recurs in intensity 2–3 sections; the strongest section can lift it an octave (`upAt`). The motif must be singable: a range of no more than an octave and a half, mostly chord tones, with one or two rhythmic features (syncopation, dotted notes, rests).
5. **Don't crowd it**: at most 4–5 pitched instruments at once; each in its own register (bass / chords / arpeggio or melody / high ornaments), never two parts doing the same thing in the same octave.
6. **Audible on a phone**: phone speakers can't play below 150 Hz. There must be a part in the middle register (C4–C6); bass and kick can't be too heavy (`--check` reports "手机外放" (phone speaker) below -8 dB).
7. **End cleanly**: at the end the engine automatically returns to the tonic chord on the beat + a hit + a tail; the score's `key` must match the chord progression (the tonic chord is the key's root).
8. **Brand character → musical language** (directions only; how you write it is up to you):
   - Tools / data / developers: steady groove, clean timbres, minor or Dorian, less melody more rhythm
   - Art / photography / design: space, piano / bell / strings, slow, major sevenths or Lydian, almost no drums
   - Consumer / social / e-commerce: major, bright plucks, syncopation, bouncing bass
   - Launches / enterprise / major releases: strings, brass, timpani, minor, long rising lines
   - Content / reading / lifestyle: seventh chords, swung groove, darker timbres, a noise floor

## Writing a score (score.js)

```js
export default {
  name: 'A slow develop in the darkroom',          // one sentence; it gets printed
  key: 'D lydian',                // key: C … B (with # / b) + major / minor / dorian / mixolydian / lydian / phrygian
  swing: 0.5,                     // swing: 0.5 = straight, around 0.6 = a lazy back beat
  sidechain: false,               // true: other parts duck when the kick hits (common in electronic and pop)
  lowpass: 0,                     // overall low-pass (Hz), for a warm, muffled sound, e.g. 5000
  bed: null,                      // 'crackle' = vinyl noise; or (dur, r, LIB) => Float32Array to synthesise your own
  endSynth: 'pad',                // timbre for the ending's tail
  chords: ['Dmaj7', 'Bm7', ['Gmaj7', 2], 'A/C#'],   // chords (one bar each by default, [chord, bars] for longer); scale degrees 1–7 also work
  motif: 'F#5:1.5 A5:.5 E5:2 | r:1 D5:1 B4:1 C#5:1', // melodic motif: note:beats, r = rest, | is only a bar line
  parts: [                        // one entry per part
    { name: 'pad', synth: 'pad', play: 'chord', pattern: 'x', octave: 3, cut: 900, attack: 0.6, gain: 0.22, from: 0 },
    { name: 'piano', synth: 'piano', play: 'arp', pattern: 'x.x.x.x.', order: 'updown', range: 2, octave: 4, len: 3, gain: 0.2, from: 1 },
    { name: 'bass', synth: 'sub', play: 'bass', pattern: 'x...x...', offsets: [0, 7], octave: 1, gain: 0.25, from: 0 },
    { name: 'kick', synth: 'kick', pattern: 'x...x...x...x...', tune: 48, gain: 0.45, from: 2 },
    { name: 'melody', synth: 'bell', play: 'motif', gain: 0.16, from: 2, upAt: 3 },
  ],
};
```

**Fields of each part**
| Field | Meaning |
|---|---|
| `synth` | timbre name (see below), or a function `(notes, len, r, p) => Float32Array` (drums: `(r, p) => …`); you can synthesise your own with the tools in `LIB` |
| `play` | `chord` plays the whole chord / `arp` arpeggiates it (`order`: up / down / updown / random, `range`: how many octaves) / `bass` plays the chord root (`offsets` cycles added semitones, e.g. `[0, 12]` octave jumps, `[0, 7]` root and fifth) / `motif` plays the melodic motif / drums need nothing / or a function `({ t, bar, B, barIdx, energyAt, chord, key, r, put, LIB }) => {}` called once per bar, fully your own |
| `pattern` | one bar's rhythm: its length is how many slots the bar is split into (4 = quarters, 8 = eighths, 16 = sixteenths). `x` a hit, `X` an accent, `.` rest, `-` extends the previous note |
| `octave` | octave (4 = the middle-C octave); `octaveShift` (for motif) shifts the whole thing by octaves; `upAt` lifts the melody an octave from this intensity |
| `len` | each note's length (beats); if omitted, until the next note |
| `gain` | volume (0.1–0.7); `gainByEnergy: [e0, e1, e2, e3]` multiplies by a factor per intensity |
| `from` / `to` | which section intensities it plays in (0–3) |
| `pan` | left/right (-1 … 1) |
| timbre parameters | `cut` (brightness, Hz), `attack` (attack time in seconds), `bright` (pluck brightness 0–1), `tune` (kick pitch Hz), `tone` / `bright` (snare), `note` (tom MIDI pitch) |

**Drums** also include `crash` (cymbal on the first beat of a new section).

**Timbres**: pitched `pad`, `strings`, `brass`, `stab` (short chords), `piano`, `epiano` (electric piano), `pluck`, `bell`, `lead` (saw lead), `spiccato`, `bass`, `sub` (sine sub-bass); drums `kick` `snare` `clap` `hat` `openhat` `shaker` `rim` `tom`.

## Structure and human feel (keeping the score from being monotonous)

Monotony = one bar's rhythm looping from start to finish, one set of chords throughout, the melody repeated verbatim, every hit equally loud and equally exact. The engine and the score solve it together:

**In the score (varying by section)**
- `chords` can be an object: one set per section name `{ hook, build, burst, drop, resolve }` or intensity `{ 1, 2, 3 }`; a new section starts from the first chord of its set. Give the climax a brighter / more driving set; don't use one set of four chords for the whole film.
- Each part's `pattern` can also be an object per section, and values can be arrays (one per bar, taking turns): `pattern: { 1: 'x...x...', 2: 'x.x.x.x.', 3: ['x.xxx.x.', 'x.x.xxx.'] }` — sparse when quiet, dense at the climax, alternating every two bars at the climax.
- `lift: { at: 'drop' or 3, by: 2 }`: the climax modulates up as a whole (pitched sound effects from sound design will then be in a different key, so check the effects have no long melodic notes first).
- `human`: human feel 0–1 (default 0.6). Precise styles (op, tech) 0.3–0.4; handmade / jazz / Chinese traditional 0.8–0.9.

- **Orchestration by section** (the most audible trick): give each part `in: ['hook', 'resolve']` (section names, or intensity numbers) so it plays only in those sections. The opening has only the bed + one lead instrument, the build adds arpeggios and bass, the climax has the full kit + a new bright timbre singing the motif, the drop goes half-time (`pattern: { drop: 'x.........x.....' }`), the wrap-up returns to the opening's instruments — the same song, but each section sounds like a different room.
- **Space**: the engine adds reverb and ping-pong echo to the music (the score used to be dry). Each part has a default send (more for pads and bells, less for drums and bass); a part can set `space` (reverb 0–1) and `echo` (echo 0–1); the score can set `space: { size, damp, mix }`, `echo: { beats: 0.75, feedback, mix }`, and `space: false` / `echo: false` turn them off.
- **Width**: `width` (pads, strings and supersaw are wide by default: one copy on each side, the right one 12 ms late), `spread` (arpeggios alternate left/right per note by default).
- New timbres: `supersaw` (the climax lead), `rhodes` (Rhodes electric piano), `sub808` (808: slides down at the start, long decay).
- Chip timbres (the channels of an 8-bit game console): `square` (square wave; `duty` 0.5 round / 0.25 bright / 0.125 thin, `decay` = seconds for the volume to step down to half, `vib` = vibrato depth on long notes, in semitones), `pulse` (square wave with duty 0.25), `triangle` (a 16-step triangle wave, for bass), drums `chipkick` / `chipsnare` / `chiphat` (the noise channel; `chiphat` with `open: true` is an open hat). The pixel style's score uses only these, with almost no reverb.

**What the engine does automatically (on by default, can be turned off)**
- Fills (`fill: 'snare' | 'toms' | false`; by default snare if there's a snare / clap, toms if there's only a kick): the beat before a section change, the drums stop and play a fill (two beats when rising to the top intensity), with a crash on the first beat of the new section (`crash` is also a drum timbre you can use yourself).
- Reverse swell (`swell: false` turns it off): before a hit section, the next chord's pad is reversed and sucks in over a beat and a half.
- Phrase variation (`vary: false` turns it off, can also be set per part): in the last bar of every 4, the bass walks to the next chord, the arpeggio reverses, the hi-hat's last eighth opens; every 8 bars the kick's last beat is left out and the chords change inversion.
- Melodic development (`develop: false` turns it off): call and response within a section (the second time, the second half goes down and lands on a chord tone), each build section moves it up a step, quiet sections sing only the first half.
- Wider loudness differences between sections (intensity 0–3 = 0.38 / 0.56 / 0.8 / 1.0), so quiet sections really are quiet.
- Human feel: strong beats heavier, off-beats lighter, hi-hat sixteenths as ghost notes; drums tightest, bass next, keyboards loosest, snare slightly behind; piano / electric piano / pluck chords strummed one note at a time; slight variations in note length and pitch (±3 cents). All seeded, so every render is the same.

## Following the picture

The score knows the picture's key moments (`promo.js` registers them automatically and passes them to the engine at render time):
- **Hard cuts** (`F.cut`): in the strongest sections, each cut gets a chord accent + bass (at most one per beat).
- **Impacts** (sound effects impact / boom / slam, the moment an impact word slams down): chord accent + bass.
- **Product name appears** (the logo, or else the first line of the end card): the drums stop on the beat before, and on the beat the name appears the motif sings one phrase (on the instrument that sings the motif in the score) + a crash; the motif that was there on those beats steps aside.
- In a hand-written film add your own: `F.musicCue(t, 'hit' | 'name' | 'stop' | 'off')` — `stop` = the music almost entirely stops on the beat before and crashes back in at this moment (for reveals and twists); `off` = the signal is cut: the music stops dead at this moment, with no ending chord and no sound logo (a test card, a power cut, a hard stop on the last word).
- In the score, `react: false` turns all of these off, `react: { cut: false }` turns one off; `hitSynth` changes the accent timbre (default `stab`). Places where a section already opens with a hit aren't doubled.

## Films with narration

The score automatically steps back behind the voice: while someone speaks only the bed stays, drums, gongs, melody, arpeggios and fills drop out and come back in the pauses; light sound effects don't play during speech. Each part can set `underVoice: 'keep' | 'busy'`; for the whole score to play as normal, set `underVoice: 'full'` in the score; for no score at all, set `"bgm": false` in `script.json`. When to have no score and how to weight sound effects: "Sound with narration" in `kit.md`.

## Checking it when done (you can't hear it, so rely on these numbers)

`--check` prints a one-line **score sheet** (score only, no sound effects):
```
配乐：不同的小节 22/23 · 最长原样循环 1 小节 · 段落配器 4 种 · 立体声宽度 -15 dB · 跟着画面：重音 8 处、产品名出现时唱动机
```
(Score: distinct bars 22/23 · longest verbatim loop 1 bar · 4 section orchestrations · stereo width -15 dB · following the picture: 8 accents, motif sung when the product name appears.)

These are logged as warnings: the same bar looping verbatim for ≥ 10 seconds; fewer than 40% of the bars in the whole piece are distinct; two adjacent sections (with different names) have the same orchestration, timbres and loudness; every section has the same orchestration; stereo width below -20 dB (almost mono). A good film is roughly: over 70% distinct bars, longest loop 1–2 bars, 2–4 orchestrations, width -13 to -17 dB.


```bash
node scripts/music.mjs --demo 30 --score videos/<name>/score.js --bpm <bpm>   # audition alone + print each part's loudness, phone-speaker level, warnings
node scripts/render.mjs videos/<name> --check                                  # score warnings also appear in the automatic check
```
- **Perceived loudness per part** (measured only over the sections where that part plays): no part above 50%; no part below 1% (if it can't be heard, delete it or turn it up).
- **Phone speaker**: above 150 Hz being -3 to -5 dB below full range is normal; below -8 dB means the bass is too heavy.
- **Parts sounding at once**: at most 4–5 pitched instruments per intensity.
- **Harmony**: the engine snaps the melody to notes in the key; a wrongly written chord (a spelling that doesn't exist) throws an error.
- During review, `report-*.txt` has phone-band loudness every 0.5 s, so the review can "see" the score's rise and fall too.
- If the film is already rendered and only the score changed: `node scripts/render.mjs videos/<name> --remux` (add `--aspect 9:16` for portrait) attaches the new score to the film in seconds without re-rendering the picture.
