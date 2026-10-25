# Film room (录像分析, `filmroom`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

One frame: real footage on a dark broadcast set, and an analyst at the tape deck. The tape plays, **stops**, and on the frozen frame the analyst draws:
- a ring on the floor under a player;
- the run she is about to make, the passing lane, the gap in the defence;
- a spotlight that dims everything else.

Then the tape **rewinds**, plays the moment again **slowly**, and the camera pushes in on the detail. Chapter cards separate the clips. A small HUD shows which clip, the game situation, and the tape's state (▶ / ❚❚ / ◀◀ / 0.4×). The narration is the analyst explaining what to look at.

It is the grammar of a coach's film session: one possession, one lesson, everything pointed at on the picture. Built first for basketball; it works for any footage where *where people are* matters (football, volleyball, a dance, a product's screen recording).

Landscape: the footage fills the frame. Portrait: the tape is a band at 25 % of the height, with the show's name above and captions below.

Runtime: `runtime/filmroom.js` (`PROMO.filmroom(F, opt)`). New project:
- explainer (narrated breakdown, the usual use): `node explainer/scripts/new.mjs <dir> --style filmroom`;
- promo: `node scripts/new.mjs <dir> --style filmroom`.

Starter pages: `styles/filmroom/explain.html` (narrated) and `styles/filmroom/index.html` (promo, on the beat). Both open for 1.6 s and go straight to the tape with a lower third. Without footage the tape shows a "no tape" slate, so the page builds and the drawings can be laid out first.

## 0. Safety
- **Footage rights come first.**
  - The user's own footage (a game they filmed, their product's screen recording) is the first choice.
  - Otherwise only licence-clean footage: CC0, public domain, CC BY (credited). Search with `node scripts/footage.mjs <project> search "<query>" --video`. **Tell the user what you want (title, source, licence, size) and wait for their OK.**
  - Then fetch only the stretch you need: `fetch <n> --from <s> --dur <s> --max-height 1080`. A full game is gigabytes.
  - League and broadcaster footage (NBA, CBA, Premier League, the broadcasts on video sites) is **not** usable, however easy it is to watch. It can be watched for research, but never downloaded into the film.
  - Leagues and federations that publish their own games under CC BY (the Turkish Basketball Federation's channel, for example) are fine; check the licence on the file page and who uploaded it.
- **Say only what the tape shows.**
  - Before the narration, watch the clip frame by frame (half-second steps, then quarter-second around the key moment). Write the sequence, with clip times, in brief.md under 事实.
  - The narration names positions and movements you can see: who cuts where, who stands where, who falls.
  - It does not claim intent, the play's name, or whose fault something was unless a source says so.
  - Account for the camera panning: a player who stays still in the frame may be moving on the court, and the reverse. Compare against fixed court lines.
- **Real players.** Name a player only when a source or a legible number identifies her; otherwise say "blue #35" or "a player in blue". No portraits drawn to look like real players. Keep the tone about the play, never mocking a person.
- **Minors.** Avoid youth and school games: a breakdown puts one young person's moment under a spotlight.
- **The source's own marks stay.** The broadcaster's or federation's logo in the footage stays visible; the HUD keeps clear of the top-right corner.
- **The show is fictional.** Its name, open and graphics are your own (the starter uses "录像课 / FILM STUDY"). Never a real show's, broadcaster's or league's name, open or graphics. The film-session grammar is generic; a particular show's look is not.

## 1. When to use
- **Breaking down a play**: what happened in one possession, why a shot opened up, how a defence moved. A possession that **ends in a score** makes the clearest lesson (cause → result); find one by reading the arena scoreboard on a low-resolution scouting copy (a score change brackets the basket), then fetch only that stretch at 1080p.
- **Teaching how to watch**: off-ball movement, spacing, footwork. One lesson per clip.
- **Any footage where position matters**: a set piece in football, a volleyball rotation, a dance, a stunt, traffic at a junction.
- **Product walkthroughs on a screen recording**: freeze on the moment, ring the button, arrow the path, rewind and show it again slowly.
- Less suited: topics with no footage at all (use whiteboard or blueprint-type styles); long match reports (this is one clip, not ninety minutes); anything where the footage can't be cleared.

## 2. What it is (and isn't)
- **Essence**: the picture is evidence and the analyst points at it. Every drawing answers "look here", and every claim is visible on the tape.
- **It is not**: a highlight reel with music (no analysis); a stats dashboard (numbers are a side dish); a fake broadcast (no imitation of a real network's graphics); a reconstruction (if there is no footage, choose another style).

## 3. Color
- Set: near-black `#07090c`, panels `rgba(10,13,18,.82)`, type `#f2f4f7`, secondary `#9aa3ae`.
- Pen colours by role:
  - **accent** `#ffc21a` (amber): the main thing, i.e. the player we follow and her path;
  - **blue** `#41d3ff`: the other side, or a second player to compare;
  - **red** `#ff4d4d`: the problem (contact, the gap, the mistake).

  One film, at most three pen colours. `accent` can be changed (`opt.accent`); keep it far from both teams' kit colours.
- Spotlight dims the rest to about 40 %; a frozen frame flattens slightly (less saturation, a little darker), so the drawings stand out.

## 4. Type
- Chinese: Noto Sans SC 500 / 700 / 900 (OFL). Latin and numbers: Oswald 700 (OFL), wide-tracked caps for the show name and kickers.
- Sizes (design size):
  - the open: 130;
  - chapter titles: 110;
  - telestrator labels: 46 (they stay the same size on screen when the camera pushes in);
  - number discs: 72;
  - HUD chips: 26–30;
  - source tag: 22.
- Labels are short: a number ("35"), a role ("持球"), a verb ("撞在一起"). The narration says the rest.
- Captions: the runtime gives narrated films a dark-band caption style.

## 5. Motion
- The tape: `play` at speed, `freeze` (with a tape-stop sound and a slight flattening), `rewind` (eased, with scan lines and a whirr), `slow` (frames blended, not held), `seek` (a cut).
- Drawings appear with the narration's words: rings draw round in 0.4 s, arrows in 0.45–0.6 s, each with a marker squeak. They belong on frozen or slowed tape; on tape at speed only a tracked ring (`track`) follows a player.
- A long freeze is not dead: the frame pushes in about 2.5 % by itself, and the camera moves between the things being pointed at.
- Footage at its own frame rate; `F.blurBase(1)` (the footage carries its own motion blur).

## 6. Camera and transitions
- **The tape starts within about 2 s.** The film is the footage: a brand-only open of about 1.5 s (`R.ident({ at: 0, until: 1.6 })`), then the tape. Which game and which moment go in a lower third over the playing tape (`R.lower`), and the first line of narration is spoken over the footage. No chapter card before the first clip; cards (`R.card`) only between clips. The open's narration lead-in is 1.8 s (`explain.json`).
- On the tape: `C.cam(t, { x, y, s })` keys, eased.
  - Push in to about 1.6–1.8× when pointing at a group.
  - Pan to the next thing between two lines.
  - Pull back before rewinding.
  - Never push past about 2× on 720p footage: the picture gets soft.
- Between clips: a chapter card (`R.card`), a hard cut with a click.
- The open (short) and the end: full-frame cards with an amber rule drawing across.

## 7. Sound
- Music (`styles/filmroom/score.js`): a late-night analysis bed. Dark pad and rhodes, an 808 sub, hats only when the tape runs, a lead line on the replay. It sits under the analyst (drums and melody drop while they speak).
- Voice: a clear, measured analyst (`zh-CN-YunxiNeural` / `en-US-AndrewNeural` by default), not a play-by-play shout.
- Sound effects (`sound.js`): a quiet room tone, plus:
  - `pen`: every stroke;
  - `stop`: the tape pausing;
  - `rewind`;
  - `cut`;
  - `whoosh`: cards;
  - `tick`: numbers;
  - `logo`.

  The footage's own sound is not used.

## 8. Signature moves
- **Freeze and point**: stop on the frame, ring the player, then the spotlight.
- **The path before it happens**: on the frozen frame, an arrow for the run she is about to make; then play and watch her make it.
- **Rewind, slow, track**: back half a second, 0.4×, a ring that follows her through the moment.
- **Away from the ball**: ring the ball, dim it, light the players without it.
- **The pass that never came**: a dashed line from the ball to where it could have gone, crossed out.
- **Count them**: number the players (1, 2, 3) who matter, in reading order.
- **The board replay**: the board leads, the tape runs slowly in a window, and the dots move with it — the run leaves a trail, the ball travels with the pass.
- **The lesson on the board**: stop at the result and draw the steps (1, 2, 3) on the board, where the space and the paths are true.

## 9. Footage
- Cut the stretch in `assets/clips.json`: `{ "possession": { "src": "game-1505s.webm", "from": 5, "dur": 14 } }`. `assets.mjs` extracts frames at the source's own rate. The credit comes from the source file's sidecar.
- Measure before drawing: put `C.grid(a, b)` on the film, render `--stills` at the freeze times, and read positions off the 5 % grid in footage coordinates (0–1 of the frame). Remove the grid before the final render. For a ring, use the player's **feet**.
- Positions belong to a clip time: the camera pans, so the same player has different coordinates at 4.0 s and 5.0 s. For a tracked ring, give `track: [[clipTime, x, y]…]` with a key every 0.25 s.
- The HUD's game situation comes from the footage (a scoreboard in view) or a source; don't show a score you can't read.

## 10. The tactics board and the shot chart
- **The board is the centre of a breakdown.** The tape shows what happened; the board shows *why*: where everyone really was, the run, the pass, the space. A good film moves between the two: tape at speed → stop → the board beside it → the board leads while the tape replays in a small window → back to the tape for the result → the lesson drawn on the board.
- **Board (`R.board`)**: the same moment top-down, on a court drawn to real dimensions (FIBA or NBA). It answers what the broadcast angle hides: the camera films from the side, so "left / right" on screen is not "the two wings" on the court, and distances are squashed.
  - **Calibrate, don't guess.** On the frozen frame, read 4 or more court landmarks on the grid: the key's four corners (`keyBaseNear`, `keyBaseFar`, `keyFtNear`, `keyFtFar`), plus `threeTop` (the top of the arc) when players stand far out. Then `C.calib(clipTime, { name: [u, v], … }, { court, side })`.
    - Other names: `ftCentre`, `cornerNear`, `cornerFar`, `baseNear`, `baseFar`, `midNear`, `midFar`, `centre`, `basket`.
    - "near" = the camera's side; `side: -1` = the left basket.
    - Then `B.at(C, clipTime, u, v)` turns a player's feet into court metres.
  - **Trust it only inside the points.** A map is good inside the landmarks you used; far outside them it drifts (a player 11 m out can land off the court). Leave such a player off, or add a landmark near them. Reading lines by eye gives about ±0.5 m: don't print exact distances unless the fit is better than that.
  - **Layout**:
    - `split`: the tape slides left and the board comes in on the right (portrait: below the tape). For a frozen moment: "this is where they stand".
    - `main`: the board leads (large, left) and the tape shrinks to a window at the top right. For the replay of a move.
    - `full`: stay on the board. `inset`: a small reminder.
    - Two boards back to back (`split` then `main`): start the second before the first ends, and the tape eases straight from one layout to the other.
  - **Replay in sync with the tape.** Give the players who matter `keys: [C, [[clipTime, x, y]…]]` (metres, from `C.toCourt` on footage points read every ~0.4 s) and the ball `B.ball({ keys })`. They move as the tape plays, slows and rewinds. `trail: true` draws the run. Players you didn't track get `still: C`: they dim while the tape moves, because a dot standing still while the footage moves would lie.
  - **Panning camera**: calibrate on several frames (`C.calib` at each), and the runtime blends between the calibrations either side of a clip time.
  - Players appear on the same words as their rings on the tape; labels name the place on the court ("侧翼", "弧顶", "底线"), not the screen side.
- **Shot chart (`R.shotchart`)** — a side dish, not a film: on its own it is a scatter of dots that says *where*, never *why*. Use it for a few seconds at the start or end of a breakdown to show a player's whole night, then go to the tape and the board. It shows every attempt of a game on a half court (made ● / missed ✕), landing one by one. Beside it, made / attempts for all shots and by zone (paint = inside the key; mid-range = other twos; three), each row coming in on its word. `highlights` lights one subset (a quarter, a zone) and dims the rest.
  - **Data, not footage.** A game's shot locations are facts from public stats (league sites, Basketball-Reference). Keep the source page in `research/`, convert to metres from the basket, and **check the conversion against the distances the source gives** (the sample's fit: 0.3 ft RMS). Check the totals against the box score too. The source goes on screen and in brief.md.
  - This is how to cover a famous game whose footage you can't use: the numbers are free to show, the broadcast isn't.

## 11. Pitfalls and self-check
- **Claiming what the tape doesn't show**: intent, the play's name, fault. Rewrite as what is visible.
- **Fooled by the pan**: check a player's motion against the court lines, not the frame edge.
- **Drawings off target**: render stills at every annotation moment and look. The ring must sit under the feet, and the arrow must start at the player.
- **A long open**: anything before the tape longer than about 2 s (a title card, a chapter card, a long ident) — the viewer came for the footage.
- **Too much on one freeze**: at most three or four marks at once; take the old ones off when the subject changes.
- **Covering the source's logo**: keep HUD and labels out of the top-right corner.
- **Narrating before checking on the board**: in the sample, three claims read off the sideline picture (when the catch happened, "turned to the middle", "the defender half a step behind") were wrong on the court. Map the play onto the board first (ball carrier at each moment, who is between whom and the basket), then write the narration.
- **Screen sides for court positions**: "left wing / right wing" read off a sideline camera is often wrong — check on the board before saying it.
- **Counting what isn't in frame**: if only three of four players are visible, don't say "the four".
- Self-check per `references/review.md`; `--check`, then `--stills` at the freezes, then the render (the frame check covers the slow motion and the spotlights).

## 12. Variation
- Pen colour (`accent`) per series; the show's name and episode line.
- Pace: one long freeze with five marks (teaching) ↔ several short freezes (a breakdown of a whole possession).
- Depth: a single clip and one lesson ↔ two or three clips compared (the same action done well and badly), each with its card.
- Portrait for phones: the band layout keeps the tape large; labels stay 46.

## 13. API quick reference
```js
const R = PROMO.filmroom(F, { brand: { name, en, episode }, accent, colors: { blue, red, … }, fonts, captions });
R.ident({ at, until, title, sub });                 // the open (keep it ~1.6 s: brand only; a title can't be read that fast)
R.lower({ a, b, title, sub });                      // a lower third on the tape: the episode title, the game, the moment
R.card({ a, b, kicker, title, sub });               // chapter card (full frame)
R.player({ a, b, name, number, team, line: [[label, value]…], note });   // who we watch (text only)
R.end({ a, b, title, sub, sources, notes, roll });  // end card, then sources + footage credits
const L = R.shot(a, b, { bg, cut });
const C = R.film(L, 'clipKey', { a, from, hud: { clip, situation }, tag });
C.play(dur, rate); C.slow(dur, rate = 0.35); C.freeze(dur); C.rewind(toClipTime, dur = 0.9); C.seek(clipTime); C.end();
C.t; C.ct; C.clipAt(t);                             // the film time now, the clip time now, clip time at film time t
C.cam(t, { x, y, s });                              // camera keys on the footage
C.ring(x, y, { a, b, r, color, flat, track: [[clipTime, x, y]…] });   // flat 0.38 = on the floor (default), 1 = a circle round a ball / a hand
C.arrow([[x, y]…], { a, b, dur, color, dash });  C.line([x, y], [x, y], { a, b, color, dash });
C.zone([[x, y]…], { a, b, color });  C.spot(x, y, { a, b, rx, ry });
C.num(x, y, n, { a, b });  C.label(x, y, text, { a, b, dx, dy, color });  C.x(x, y, { a, b });
C.grid(a, b);                                        // authoring only: a 5 % grid with labels
C.calib(clipTime, { keyBaseNear: [u, v], keyBaseFar: [u, v], keyFtNear: [u, v], keyFtFar: [u, v], threeTop: [u, v] }, { court: 'fiba', side: -1 });
const B = R.board({ a, b, court: 'fiba' | 'nba', view: 'left' | 'right' | 'full', layout: 'split' | 'full' | 'inset', title, teams: { home: { color }, away: { color } } });
B.at(C, clipTime, u, v) → [x, y] metres;  B.player(num, { at: [x, y] | move: [[t, x, y]…] | track: [C, [[clipTime, u, v]…]] | keys: [C, [[clipTime, x, y]…]], trail, still: C, team, a, b });
B.ball({ keys: [C, [[clipTime, x, y]…]], a, b });   // layouts: 'split' | 'main' | 'full' | 'inset'
B.path([[x, y]…], { a, b, color, dash });  B.zone([[x, y]…], { a, b, color });  B.dist(p, q, { a, b, label });  B.label(x, y, text, { a, b, color, size });
R.shotchart({ a, b, court: 'nba' | 'fiba', shots: [{ x, y, made, pts, q }], title, sub, source, start, dur, rowsAt: [t, t, t], highlights: [{ a, b, where: (shot) => bool, label }] });
//   shots in metres from the basket: x across, y out from the baseline
```
Times: `a` = in, `b` = out, in film time; positions in footage coordinates at the clip time of the freeze. Each piece registers its own information kind (clip, annotate, figures); the tape running counts as action for the gap checks (`F.live`).

## 14. Not supported yet
- No quick version (`--quick` / `kit.js` adapter): pages are hand-written.
- No automatic player tracking: tracked rings are keyed by hand.
- Courts: basketball only (FIBA, NBA). Football, volleyball and others need their own court specs.
- No automatic calibration: the landmarks are read by hand on the grid.
- Two clips side by side (split screen) for comparison.
