# Chat log (聊天记录, `chat`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

One frame: a chat app. The story and the information happen in message after message:
- someone is "typing…", a message pops up with a "pop";
- voice messages, images, quote cards, relay lists, polls, maps, forwarded chat records;
- "X recalled a message", "X joined the group chat";
- cut to another chat, the camera pushes in on one message and the rest dims.

Landscape: one big chat window on the right, a column on the left for aside cards (a line, a source). Portrait: the chat fills the width, aside cards above it.

Runtime: `runtime/chat.js` (`PROMO.chat(F)`). New project:
- explainer: `node explainer/scripts/new.mjs <dir> --style chat`;
- promo: `node scripts/new.mjs <dir> --style chat` (add `--quick` for the quick version).

Sample film: `videos/lychee-chat` (the story behind the line "一骑红尘妃子笑" — "a rider in the red dust, and the consort smiles"; narrated, hand-written).

## 0. Safety
- Don't imitate any real chat app: the `im` theme borrows the layout and colours common to Chinese chat apps (grey background, light green bubbles), but uses no app's logo, name, red packets, money transfers, "pat-pat" or other distinctive features, and never makes a screenshot that passes for a "real chat log". When making a promo for someone else's product, use `light` / `dark` (dressing another product up as a particular chat app is misleading and a trademark risk).
- No real people's chat logs, phone numbers or profile photos; character avatars are illustrations drawn in code (or a colour block + one character), never drawn to look like a real modern person.
- Historical figures or authors "sending messages" is dramatisation: the "示意" (illustrative) section of brief.md states "the chat is a dramatisation, not a real conversation". What they say is either a direct quote (with the source on a card) or a paraphrase of facts checked in the narration.

## 1. What it suits
- **Stories with dialogue and characters**: allusions, short historical stories (people going back and forth), "how something happened step by step".
- **AI assistants, customer support, collaboration tools, social products**: the product already lives in a chat; tell it as "you ask, it answers".
- **Explainers with many quotes**: a few books or people each say one line (each a quote card with its source), so viewers see at a glance "who said it".
- **Steps and polls**: a relay list for steps, a poll for proportions.
- Less suited: structure and spatial relationships (flowcharts, cross-sections, map detail — use whiteboard or blueprint-type styles); pure data with no "person" speaking.

## 2. Its essence, and what it is not
- **Essence**: information has a "speaker". Every message shows who said it, when, and which book it quotes — exactly what allusions and facts need most. Chronology and "who replied to whom" are obvious at a glance.
- **It is not**: a narration chopped into bubbles (bubbles should hold what a character would say, or a quoted original text, not a repeat of the narration); nor a screenshot of real software.

## 3. Colour
- Themes:
  - `light` (default): a generic light UI, rounded bubbles, "me"'s bubbles in the accent colour;
  - `dark`: dark;
  - `im`: looks like a Chinese instant messenger, so Chinese viewers read it as a "chat log" at once. Grey background; your own messages are light green bubbles with black text, others' are white bubbles; bubbles have a small pointer; avatars are small rounded squares; the bottom bar is voice / input / emoji / plus, and while typing the plus becomes a green "send" (emoji moves left); no "typing…" in groups. In portrait it fills the width, no rounded corners, runs to the bottom of the screen, input box at the very bottom (not like a raised keyboard); the newest message stops above the subtitles (0.685H), the chat's own grey in between. The most lifelike choice for stories and allusions.
- Accent colour `accent`:
  - used for "me"'s bubbles, the send button, the bar on quote cards, the key row in a relay list, the hot option in a poll, contact cards;
  - when the product has a brand colour, use it (quick version `film({ brand })`), and note the colour's source in brief.md;
  - for stories pick a colour tied to the subject, e.g. lychee red `#C0392B`.
- Avatars: one ground colour per character. For stories give each person a **half-length portrait drawn in code** (`look`, see §8); otherwise a ground colour + one character.

## 4. Type
- UI: Source Han Sans (思源黑体; Noto Sans SC, 400 / 500 / 700, OFL). Quotes and poems: LXGW WenKai (霞鹜文楷, OFL); the starter page loads only regular (`lxgwwenkai-regular.css`; the full `style.css` has six sub-styles and the first download is slow).
- Sizes (design size):
  - messages: 46 landscape, 44 portrait (over 10px per line on a phone);
  - names, sources: 28;
  - system notices: 30;
  - aside cards: 84 landscape, 64 portrait.
- One or two sentences per message (≤ 30 characters); split longer ones into two, the way real people text.

## 5. Motion
- A message appears: "typing…" first (three dots bouncing in turn, `typing: seconds`), then the bubble springs up a little from below (0.22 s). New messages push the whole chat up (the further it scrolls, the longer it takes).
- "Me" sending: the text is typed into the input box character by character (`A.type`), then sent.
- Things in a card light up on time: a poem turns red line by line (`light`), a relay list gains rows one by one, poll bars grow one by one, a route on a map is drawn segment by segment.
- Reactions: an emoji pops up under a bubble (`m.react`).
- Timing: a message lands on the word in the narration that mentions it; at least 0.6 s between two messages (enough to read).

## 6. Camera and transitions
- The camera mostly stays still: change in the frame comes from the messages themselves (popping up, pushing up).
- **Push in** (`A.focus(at, m, { until })`): one important message (a poem, a key number) enlarges to the centre of the frame while the other messages, title bar and input box dim; 0.9 s each to push in and pull back. At most once per scene.
- **Switch chat** (`A.open(T, at)`): the new chat pushes in from the right (0.4 s, registered as a transition) — a new topic, a new group of people, "decades later".
- **Transition** (`C.wipe({ at })`): the whole screen pushes over, into the end card or a completely different scene.

## 7. Sound
- Music: light, everyday (`styles/chat/score.js`, electric piano + plucked strings + soft drums, F major). For ancient stories switch to pentatonic plucked strings (the score.js of the sample `lychee-chat`). With narration, drums and melody drop out while someone speaks.
- Sound effects (`sound.js`):
  - `receive`: message received;
  - `send`: message sent;
  - `type`: typing;
  - `notify`: notification;
  - `system`: system notice;
  - `voice`: voice message;
  - `react`: emoji reaction;
  - `tick`: a row added to a relay list;
  - `swipe`: switch chat / transition;
  - `zoom`: push in.

  Sound logo: two "pops" + one bell.

## 8. Characters
The chat style has characters (avatar + name); for stories follow the rules in `../CHARACTERS.md`:
- **Set the cast at the start**: `C.cast({ name: { color, mark, me, look } })`. One ground colour per person; "me" (`me: true`) has messages on the right.
- **Portrait** (`look`): a lifelike illustrated half-length portrait drawn in code (not a photo); the small avatar in the chat takes only the head and a bit of shoulder. The same person looks the same in every scene; two people differ in at least two ways (`--check` checks this).
  - General: `era: 'tang' | 'modern'`, `sex: 'f' | 'm'`, `age: 'young' | 'adult' | 'old'` (white hair and wrinkles for the old), `skin`, `hairColor`, `robe` (clothing colour), `beard: 'none' | 'stubble' | 'mustache' | 'goatee' | 'long'`, `smile`, `glasses`.
  - Tang dynasty: men `hat: 'futou'` (幞头, a Tang head-wrap, default) | `'helmet'` (soldier); women `hair: 'gaoji'` (高髻, high bun with flowers and gold hairpins) | `'banji'`, `huadian` (花钿, forehead ornament, on by default for women), `flower: false`, `shawl` (shawl colour); `wear: 'yuanling'` (圆领袍, round-collar robe) | `'jiaoling'` (交领, crossed collar + shawl).
  - Modern: `hair: 'short' | 'long' | 'bob' | 'ponytail' | 'curly' | 'bald' | 'buzz'`, `hat: 'cap' | 'beanie'`, `hatColor`, `wear: 'tee' | 'shirt' | 'hoodie' | 'suit'`, `tie`.
  - Not a person: `icon: 'book' | 'scroll'` (a thread-bound book / a scroll, for characters like "the official history").
  - Historical figures' looks are imagined (no reliable portraits); say so in one line in brief.md's "示意" (illustrative) section. **Real modern people are never drawn to look like themselves**: use a neutral illustration, or just a ground colour + character.
  - Preview first: `PROMO.chat.portrait(look, groundColour)` returns an svg; you can assemble a cast sheet for the user to confirm.
- **Face to face** = back and forth: two people's messages alternate left and right; for confrontations and arguments use `quote` (quoting the other person's message).
- In a group chat, other people's messages have their name above them, which works as a name tag.
- Dramatised characters (a gatekeeper, a courier) are fine; what historical figures say should be direct quotes where possible.

## 9. Moves unique to this medium (pick by content)
- **Quote card** (`T.card(at, who, { kind: 'quote', text, source })`): the original text + its source. The strongest way to present historical sources, "what the book says".
- **Poem / lyrics card** (`kind: 'poem'`): one line per row, lighting up line by line with the narration; pair it with one push-in.
- **Relay list** (`kind: 'list'`): step by step, rows added one at a time, the key row in the accent colour.
- **Poll** (`kind: 'poll'`): proportions and rankings, bars growing one by one.
- **Location** (`kind: 'location'`): from where to where, the route drawn segment by segment (illustrative).
- **Forwarded chat record** (`kind: 'record'`): insert a conversation from "back then", or what another group said.
- **"X joined the group chat" + time divider**: a time jump ("decades later"), a new character enters.
- **Recall** (`T.recall`): something said wrongly, something that can't be said, a twist.
- **Rename the group to close** (`T.rename(at, filmTitle, { by })`): the last message is "X changed the group name to …", the title bar becomes the film title and the frame stays in this group (the important card is still on screen). That is the ending — no separate card floating on a blank. In landscape the aside card in the left column also changes to the film title (big type); in portrait the aside card above does the same. The quick version's ending does this automatically (rename → a slogan → the URL as an underlined message).
- **Contact card** (`kind: 'contact'`): product, author, source. Use `C.endcard` (a card floating over the background) only when really needed.

## 10. Common pitfalls and self-check
- **Bubbles repeating the narration**: if the narration says "the consort loved lychees", the bubble should be a quote card from the *New Book of Tang* (《新唐书》), not the same sentence typed again.
- **Too fast**: the next message pushes one up before it has been read. Each should stay about 1 s at least; push in on the important ones.
- **Too much on one screen**: 3–5 messages visible at once is enough. With more, switch to a new chat or let old messages be pushed up.
- **Dramatisation not labelled**: brief.md's "示意" (illustrative) section states the chat is dramatised, and "文案" (copy) lists every dramatised message.
- Self-check per `references/review.md`.

## 11. Room for variation
- Theme: `light` ↔ `dark` (late-night group chat, mystery stories) ↔ `im` (the most lifelike chat log).
- Pace: slow (one message at a time, storytelling) ↔ fast (messages flooding in, notifications one after another, for buzz).
- Point of view: who is "me" — the courier, the user, the product itself — decides which messages are on the right.

## 12. API quick reference
```js
// placeholders: 名字 = name, 层 = layer, 谁 = sender, 文字 = text, 秒数 = seconds, 时刻 = time, 数 = count, 序号 = index
const C = PROMO.chat(F, { theme: 'light' | 'dark' | 'im', accent: '#…', colors: { bg, app } });
C.cast({ 名字: { color, mark, me, look } });               // ground colour + character on the avatar / code-drawn portrait (look, see §8); me: true = "me" (right side)
C.stage(层);                                               // background
const A = C.app(层, { at, until, center });                // the chat app (big window on the right in landscape; center: true = centred, no aside cards; full width in portrait; C.geo is its position)
const T = A.thread({ title, members, at });                // one chat; the first appears at at, switch to later ones with A.open(T, at)
T.time(at, '几十年后');  T.system(at, '杜牧 加入了群聊');  T.recall(at, 谁);  T.rename(at, '一骑红尘妃子笑', { by: '杜牧' });
const m = T.msg(at, 谁, 文字, { typing: 0.8, big, link, quote: { who, text }, noFact });   // m.react(at, '😊'); link: true = URL (underlined)
T.voice(at, 谁, 秒数, { text });                            // voice message (text = transcript)
T.image(at, 谁, { src | draw: (ctx, w, h) => {…}, w, h, caption, fit });
T.card(at, 谁, { kind: 'quote', text, source, serif });
T.card(at, 谁, { kind: 'poem', title, author, lines: [...], light: [时刻…] });
T.card(at, 谁, { kind: 'list', title, items: [{ text, at, hot }] });
T.card(at, 谁, { kind: 'poll', title, options: [[名字, 数]…], unit, hot: [序号], ats: [时刻…] });
T.card(at, 谁, { kind: 'location', title, from, to, note, drawAt, drawDur, fromAt: [0.78, 0.78], toAt: [0.22, 0.24] });
T.card(at, 谁, { kind: 'record', title, lines: [...] });   T.card(at, 谁, { kind: 'contact', name, sub, url });
A.type(at, 文字, { dur, thread });                          // "me" types, sent at at → m
A.notify(at, { title, text, until });
A.focus(at, m, { until, zoom });                            // push in on one message, the rest dims
C.aside(层, { text, sub, at, until, y, size, serif });       // aside card (left column in landscape / above the chat in portrait)
C.wipe({ at });  C.endcard(层, { at, title, sub, url, mark, serif });
```
(Example strings above: '几十年后' = "decades later", '杜牧 加入了群聊' = "Du Mu joined the group chat", '一骑红尘妃子笑' = the film title.)

Timing: `at` = the moment a message appears and is readable (on the narration's word); positions are laid out by the chat itself, no coordinates. The chat window's bottom edge is at 0.84H in landscape and 0.685H in portrait, subtitles below it (in `im` portrait the app runs to the bottom of the screen and messages stack only down to 0.685H).

Common interface (`runtime/kit.js`, used by the quick version and by "follow the narration" explainers; each scene is one chat):

| Interface | In this style |
|---|---|
| `word` | a big-text message (short ones enlarged) |
| `line` | a message ("typing…" first) |
| `card` / `shot` | an image message (screenshot untouched) |
| `accent` | a 🔥 pops up under the last message |
| `wipe` | the whole screen pushes over |
| `end` | the end scene's group is renamed to the product name → a slogan → the URL (an underlined message) |

Telling information:

| Interface | In this style |
|---|---|
| `steps` | relay list (rows added one by one, the key row in the accent colour) |
| `versus` | two people taking turns (official on the left, "me" on the right, each sends a list card) |
| `figures` | poll card (bars grow one by one) |
| `spotlight` | highlight boxes on an image message, everything else dimmed |
| `flash` | a solid block of accent colour + a bubble shape |

## 13. Not supported yet
- Video messages (images yes, video no).
- Moments / social feeds, call screens, sticker packs (emoji only).
- Two chats open on one screen (split screen).
