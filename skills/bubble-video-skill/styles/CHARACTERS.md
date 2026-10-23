# Characters in a story (all styles)

Rules for any video where named people act out a story: history, allusions, a founder's story, a dialogue. They hold in every style that has characters; each style draws them its own way (table at the end).

## The four rules

1. **Fix the cast at the start.** Every named character is defined once (`window.CAST` in `characters.js` for whiteboard / ink; `Y.cast({ … })` for shadow; `X.cast({ … })` for pixel; `C.cast({ … })` for chat) and every scene calls them **by name**. The same person looks the same in every scene. Never redraw someone from scratch in a later scene.
2. **People in the same scene differ in at least two visible attributes.** Choose from:
   - face (painted colour, shape);
   - hair / beard (beard colour for age);
   - headwear;
   - clothes colour;
   - build (fat / thin, tall / short).

   Opera face conventions help the audience:

   | Look | Reads as |
   |---|---|
   | Red face | Loyal and brave |
   | White face | Treacherous |
   | Black face | Rough and blunt |
   | No beard | Young |
   | White beard | Old |

   The renderer checks the cast: two characters that differ in fewer than two attributes get a warning in `--check` (`EV.castCheck`, core).
3. **Two-person moments are staged face to face.** Talking, arguing, fighting, bowing: the two face each other (`faceTo`). Only the one speaking moves their mouth or arms; the other reacts. A fight is two people facing each other and moving at the same time, not one person waving alone.
4. **A chain of events is staged as a relay.** "A was killed by B, B by C, C by D": the next person walks up to the previous one, they act it out face to face, and the loser leaves the light (falls and sinks / exits). Their name tag turns into the year or the result. The audience sees the chain instead of four people standing in a row.

Also:

- **Name tags.** The first time someone appears, hang their name over them:
  - shadow: `Y.placard({ over: puppet })`;
  - whiteboard: a name in the character's accent colour;
  - ink: a short calligraphy line beside the figure (`b.write`), or the ink-bloom (墨晕) blot / a seal for the key person.

  In a crowded scene, keep the names on.
- **Keep scenes small.** Two or three people with names at once; extras (soldiers, crowds) can repeat one look and need no name.
- **Check before rendering.**
  - Whiteboard / ink: `node explainer/scripts/cast.mjs <project>` renders the cast lineup (`review/cast.png`). Look at it once: can you tell everyone apart at phone size?
  - Shadow: render a still of a scene with the whole cast.

## What each style has

| Style | Characters | Call by name | Face someone | Fight / fall | Cast check |
|---|---|---|---|---|---|
| `whiteboard` | Busts (`b.character`, `explainer/references/characters.md`) | `b.character('Name', …)` | `faceTo: other` when created (busts don't turn later); `flip` | point with a prop (sword), `say`, expressions; no fall | yes |
| `ink` | Full figures (`b.figure`, `styles/ink/STYLE.md` §11) | `b.figure('Name', …)` | `faceTo: other` when created, `.faceTo(at, other)` / `.turn(at)` later | `pose` point / bow / run / gongshou, `move`; no fall | yes |
| `shadow` | Jointed puppets (`Y.puppet`, `styles/shadow/STYLE.md`) | `Y.puppet(…, { who: 'Name' })` | `faceTo: other` when created, `P.faceTo(at, other)` | `fight` (lunges forward), `fall`, `sink`, `bow`, `talk`, `ride` | yes (also warns for twins in one scene) |
| `pixel` | Sprite characters (`X.char`, `styles/pixel/STYLE.md` §8) | `X.cast({ … })` + `X.char(…, { who: 'Name' })` | `faceTo: other` when created, `h.faceTo(at, other)` | `attack` (the other is hit and knocked back), `hurt`, `ko`, `jump`, `say`, `emote`, `cheer` | yes (also warns for twins in one scene) |
| `chat` | Code-drawn portrait avatars (Tang or modern: headwear, hair, beard, robe, age) and names in a messaging app (`C.cast`, `styles/chat/STYLE.md` §8) | `C.cast({ … })` + `T.msg(at, 'Name', …)` | a back-and-forth of messages left / right; `quote` to answer someone | — (a dialogue, not a fight: recall, reactions, "X joined") | yes |
| `cutout` | Anonymous paper figures (`C.figure`) — "users", "the community" | — | — | — | — |
| `pop`, `riso`, `origami`, `op`, `ascii`, `launch`, `bauhaus` | No characters | — | — | — | — |

**When the content is a story with named people**, recommend a style that has characters:

| Style | Suits |
|---|---|
| shadow | Chinese history and legends, conflict |
| ink | Classical, poetic, calm stories |
| whiteboard | Anything, with explanation in between |
| pixel | Light stories, founders and teams, "user meets a problem", tech and gaming history, kids |
| chat | Stories carried by dialogue and quotes (allusions, "who said what"), anything with many sources |

In a style without characters, tell the story with the style's own devices and keep the rules in spirit:
- **pop**: a dialogue is two speech bubbles from opposite sides of the panel, each with the speaker's name, alternating.
- **launch / riso / origami / op / ascii / bauhaus**: one name card per person, always in the same colour and position; a confrontation is two cards facing each other (the style's `versus`).
- Say in the storyboard that the style has no characters.
