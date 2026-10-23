# Sound design: a designed set of sound effects for each product

A promo's sound = **music** (`score.js`, rhythm and mood, see `references/music.md`) + **sound effects** (`sound.js`, detail and texture). Every project must **design** a set of sounds for its product in `sound.js` — not "a whoosh for every move", but sounds that tell you at once which product this is.

Together with the music:
- **Same key**: pitched effects (glass, water drops, notification tones) use notes from the music's key (`--check` flags notes outside the key).
- **The music makes way for effects**: when an important effect plays, the music automatically dips about 6 dB and comes back (`duckUnderSfx: false` in score.js turns this off); the music as a whole sits under the effects (`level` sets the music's overall volume, default 1).
- When the user explicitly says no music, delete score.js and it is effects only (the loudness target automatically changes to -16 LUFS).

## Design principles

1. **Find the material first**: find 1–2 real materials in the product itself and use only that set for the whole film; don't mix.
   - Darkroom / photography: paper, film advance, mechanical shutter, developer (water drops)
   - Finance / enterprise: glass, metal, precise mechanical clicks, low muffled thuds
   - AI tools / creation: airy sweeps, glass glints, soft digital tones
   - Social / consumer: bubbles, springy "pops", finger snaps
   - Developer / productivity: keyboards, clean digital notification tones, light wood taps
   Write it under "Sound" in brief.md: one line + which materials you picked and why.
2. **Tiers**:
   - Small (click, typing, tick, appear): short, light, on the high side
   - Medium (transition, move, unfold): length follows the motion
   - Large (impact words, the core result, the end-card logo): rich, can be layered (body + low-end bed + a bright touch)
   Save the heaviest hit of the whole film for the **core result** and the **end-card logo**.
3. **Follow the motion**: the sound lasts as long as the motion; it moves where the motion goes; pitch rises on entry and falls on exit; bigger means lower and heavier. Components pass the motion info automatically; for your own motion use `F.sfx(t, type, volume, { dur, dir, size })`.
4. **Musical**: pitched sounds (glass, tones, water drops, glints) sit on the pentatonic scale of the same key, with `notes` stepping through pitches so that together they sound like a little melody. Give each kind of sound 2–3 variants (`variants`) used in turn.
5. **Restraint and space**: not every motion needs a sound. Average 1–1.5 per second (typing aside); leave 0.3–0.5 s of quiet before a key moment so it lands heavier.
6. **Sound logo**: 1–2 s of "brand sound" at the end, built from this set of materials (e.g. a shutter + a glass chord), landing on the end card's beat.
7. **One space**: all sounds share one space (`space`: small and dry / large and wet); you can add a very light layer of ambience (`ambience`) so the gaps without effects aren't dead silent.
8. **Audible on a phone**: every sound needs content above 300Hz; low frequencies are only a bed.

## How to write it (sound.js)

```js
export default {
  name: 'Darkroom: paper, film, shutter, developer',
  space: { size: 0.25, mix: 0.14 },                  // space: size 0–1, mix 0–1 wetness
  ambience: { use: 'roomtone', bright: 420, hum: 50, gain: 0.12 },   // very light ambience (optional)
  vary: 0.06,                                          // amount of subtle variation each time
  sounds: {                                            // motion type → sound (components emit these types)
    whoosh: { variants: [{ use: 'paper', grain: 0.7 }, { use: 'film', rate: 30 }] },   // transitions, moves
    impact: { layers: [{ use: 'stamp', freq: 80 }, { use: 'glass', note: 'E6', gain: 0.35, delay: 0.01 }] },  // impact words, section hits
    click: { use: 'shutter', gain: 0.7 },             // cursor click
    type: { use: 'key', bright: 2200 },               // typing
    tick: { use: 'drop', notes: ['E6', 'G#6', 'B6', 'C#7'] },  // numbers, scrolling stops
    pop: { use: 'drop', notes: ['B5', 'E6'] },          // appear
    riser: { use: 'swell', of: 'glass', note: 'B5' },   // riser (a reversed swell)
    boom: { layers: [{ use: 'thud', freq: 50 }, { use: 'glass', note: 'E5', gain: 0.4 }] },
    develop: { use: 'swish', color: 'air', from: 200, to: 2400, shape: 'up' },   // a type you name yourself: F.sfx(t, 'develop', 1, { dur: 1.5 })
  },
  hit: 'impact',            // which sound to use at a section start with hit: true (null = none)
  rise: null,               // riser one bar before intensity goes up (null = none; usually none without music)
  logo: [{ use: 'shutter', gain: 0.8 }, { use: 'glass', note: 'E6', gain: 0.6 }, { use: 'glass', note: 'B6', gain: 0.4, delay: 0.06 }, { use: 'thud', freq: 55, gain: 0.7 }],
};
```

- Each sound: `{ use: timbre, ...params, gain, delay, pan }`; `layers: [...]` stacks several layers; `variants: [...]` are used in turn; `notes: [...]` step through pitches; `mute: true` or `false` = no sound for this kind of motion.
- `use` can also be a function `(p, r, ev) => Float32Array` (44.1kHz mono); `ev.LIB` has `svf` `noise` `noteHz` `RECIPES` for synthesising your own.

**Sound library** (all parameters adjustable; defaults when omitted)
| use | Sound | Main parameters |
|---|---|---|
| `swish` | air / cloth / digital sweep | `from` `to` (Hz), `color`: air / cloth / digital, `shape`: arc / up / down, `q` |
| `paper` | paper sliding, page turn | `bright`, `grain` (rustle), `flap` (page-turn flutter Hz), `shape` |
| `fold` | origami: air + fibre crackle + a press flat (length follows the motion) | `crack`, `bright`, `air`, `press` (0 = no press sound), `from` `to` |
| `crease` | pressing a crease: a fingernail stroke | `from` `to` (Hz), `dur` |
| `snip` | scissors cutting paper: blades scraping + the closing "snip" + metal ring | `scrape` (scrape length), `ring` (metal pitch), `metal`, `from` `to` |
| `rustle` | picking up / handling paper: air + sparse crinkle crackle (length follows the motion) | `crinkle`, `air`, `bright`, `shape` |
| `tear` | tearing paper: dense fibre snapping, band sweeping down (length follows the motion) | `from` `to` (Hz), `dur` |
| `film` | film advance, ratchet | `rate` (clicks per second), `bright`, `whir` (winding sound Hz) |
| `shutter` | mechanical shutter | `gap` (interval between the two clicks), `tone`, `ring` (spring ring Hz) |
| `thud` | soft muffled hit, landing | `freq`, `felt` (how muffled), `decay`, `body` |
| `knock` | wood knock | `freq` (Hz or note name), `decay` |
| `glass` | glass / bell / steel bar | `note`, `decay`, `partials` |
| `blip` | digital notification tone | `freq` → `to`, `wave`: sine / square / tri, `dur` |
| `drop` / `bubble` | water drop / bubble | `freq` → `to`, `count` |
| `click` / `key` / `tick` | click / keyboard / tick | `freq`, `noise`, `decay` / `bright` `body` |
| `stamp` | stamp, pressing down | `freq` |
| `whir` | motor, servo | `freq` → `to` |
| `glint` | glint, sparkle | `note`, `count` |
| `riser` / `swell` | riser / reversed swell | `from` `to` or `tonal: ['E5','B5']` / `of` (which sound to reverse) `note` |
| `impact` / `boom` | impact / low boom | `freq`, `body`, `crack` / `noise` |
| `roomtone` / `crackle` | room tone / vinyl crackle (for `ambience`) | `bright`, `hum` |

## How to check it (you can't hear it, so rely on these)

```bash
# <名字> = the project's folder name
node scripts/music.mjs --demo 20 --sound videos/<名字>/sound.js     # audition this sound set alone: a run of typical motions + the end-card logo → sound-demo.wav
node scripts/render.mjs videos/<名字> --check                        # sound warnings: too dense, one kind used too often, silent too long, a type missing from the sound design
node scripts/render.mjs videos/<名字> --remux                        # the film is already rendered and only the sound changed: swapped in a few seconds
```
