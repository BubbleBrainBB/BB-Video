// chat.js: the chat-log style (one of bb-video's visual styles; see styles/chat/STYLE.md). Load after promo.js.
// A frame is a chat app — story and information happen in messages: someone typing, messages popping up, voice notes, images, quote cards,
// sign-up lists, polls, locations, forwarded chat records, recalls, system notices like "X joined the group"; the camera pushes in on one message while the rest dim.
// Landscape: a large chat window on the right, a column on the left for "aside cards" (time, place, one line); portrait: the chat app fills the width, the aside card sits above it.
// (No small phone in landscape: text inside a phone is only a few pixels tall in a landscape film, unreadable.) All text is DOM, so the automatic checks work as usual.
//
//   const C = PROMO.chat(F, { theme: 'light' | 'dark', accent, colors })
//   C.cast({ name: { color, mark, me } })                 cast: avatar colour + avatar letter (default: first character of the name); me: true = "me" (messages on the right)
//   C.stage(layer)                                        background
//   const A = C.app(layer, { at, until, center })         app: a large window on the right in landscape (center: true = centred, when there's no aside card), full width in portrait → A
//   const T = A.thread({ title, members, at })            one chat (for a group, members = head count); A.open(T, at) switches to it (pushes left)
//   T.time(at, text) | T.system(at, text)                 time divider / system notice ("杜牧 加入了群聊" = Du Mu joined the group)
//   T.msg(at, who, text, { typing, big, quote, until }) → m  one message; typing: seconds = show "typing…" first; m.react(at, '❤️')
//   T.voice(at, who, seconds) | T.image(at, who, { src | draw(canvas ctx, w, h), w, h, caption })
//   T.card(at, who, { kind: 'quote' | 'poem' | 'location' | 'list' | 'poll' | 'record' | 'contact', … })   card message (see STYLE.md §12)
//   T.recall(at, who)                                     "某某撤回了一条消息" (X recalled a message)
//   T.rename(at, newName, { by })                        rename the group: system notice + title bar switches to the new name (how an end title can appear)
//   A.type(at, text, { dur })                             "me" types in the input field, sent at `at` → m
//   A.notify(at, { title, text, until })                  a notification dropping from the top
//   A.focus(at, m, { until, zoom })                       camera pushes in on one message, the rest dim
//   C.aside(layer, { text, sub, at, until, y })           aside card: left column in landscape, above the chat in portrait
//   C.wipe({ at })                                        transition: the whole screen pushes left (new scene) → the moment it fully covers
//   C.endcard(layer, { at, title, sub, url })            end card: a name card
//
// Time: at = when a message appears and is readable (on the beat / on the narration's word); until = disappears. The chat lays messages out itself (each pushing the rest up); no coordinates needed.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('chat.js 要在 promo.js 之后加载', 'chat.js must load after promo.js'));
  const { clamp, lerp } = window.EV;
  const { E, seg, set, el } = P;
  const f1 = (n) => Math.round(n * 10) / 10;
  const f3 = (n) => Math.round(n * 1000) / 1000;
  const rgbOf = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lum = (c) => { const r = rgbOf(c) || [0, 0, 0]; return (0.299 * r[0] + 0.587 * r[1] + 0.114 * r[2]) / 255; };
  const alpha = (c, a) => { const r = rgbOf(c); return r ? `rgba(${r.join(',')},${a})` : c; };
  const frameT = P.frameT ?? ((t) => t);

  const THEMES = {
    light: { bg: '#E9ECF2', app: '#F4F5F8', bar: '#FFFFFF', line: 'rgba(20,24,36,.09)', ink: '#151821', muted: '#7A8191', other: '#FFFFFF', sys: 'rgba(20,24,36,.07)', card: '#FFFFFF', shadow: 'rgba(20,24,36,.16)' },
    // im: the look of domestic instant messengers (grey ground, own messages in light-green bubbles with black text, others in white bubbles, small rounded-square avatars, bubbles with a little tail, bottom bar with voice / emoji / plus). No logos, names or red packets of any real app
    im: { bg: '#EDEDED', app: '#EDEDED', bar: '#EDEDED', line: 'rgba(0,0,0,.08)', ink: '#191919', muted: '#8C8C8C', other: '#FFFFFF', sys: 'rgba(0,0,0,.06)', card: '#FFFFFF', shadow: 'rgba(0,0,0,.16)', me: '#95EC69', meInk: '#191919', bubbleR: 10, cardR: 10, sysR: 6, tail: true, avR: 0.12, typing: false, comp: 'im', flat: true },
    dark: { bg: '#0B0D12', app: '#13151B', bar: '#1A1D25', line: 'rgba(255,255,255,.08)', ink: '#ECEEF4', muted: '#8B92A3', other: '#232733', sys: 'rgba(255,255,255,.08)', card: '#232733', shadow: 'rgba(0,0,0,.5)' },
  };
  const AVATARS = ['#F2994A', '#27AE60', '#2D9CDB', '#BB6BD9', '#EB5757', '#E0A800', '#9B51E0', '#16A085', '#E07BB0', '#5D6D7E'];

  // ---------- Avatars: code-drawn half-length portraits (lifelike illustration, not photos) ----------
  // look = { era: 'tang' | 'modern', sex: 'f' | 'm', age: 'young' | 'adult' | 'old', skin, hair (hairstyle), hairColor, hat, beard, glasses, robe (clothing colour), wear (clothing cut), smile, huadian, flower }
  //   Tang: hat 'futou' (幞头 headwrap) | 'helmet' (soldier's helmet) | 'none'; women's hair 'gaoji' (高髻 high bun) | 'banji' (半翻髻, a lower bun); wear 'yuanling' (圆领袍 round-collar robe) | 'jiaoling' (交领 cross collar + 披帛 shawl)
  //   Modern: hair 'short' | 'long' | 'bob' | 'ponytail' | 'curly' | 'bald' | 'buzz'; hat 'cap' | 'beanie'; wear 'tee' | 'shirt' | 'hoodie' | 'suit'
  //   beard 'none' | 'stubble' | 'mustache' | 'goatee' | 'long' (a scholar's long beard); icon 'book' | 'scroll' = not a person (book, scroll)
  const shadeHex = (c, k) => { const r = rgbOf(c); return r ? '#' + r.map((v) => Math.round(Math.max(0, Math.min(255, k > 1 ? v + (255 - v) * (k - 1) : v * k))).toString(16).padStart(2, '0')).join('') : c; };
  let PID = 0;
  // crop: true = just the head and a bit of shoulder (small chat avatars: the face must be large to read); false = the whole half-length
  function portraitSVG(L, bg, crop = false) {
    const id = `pt${++PID}`, tang = (L.era ?? 'modern') === 'tang', f = (L.sex ?? 'm') === 'f', age = L.age ?? 'adult', old = age === 'old';
    const skin = L.skin ?? (tang ? '#F2D3BC' : '#EFC9AE'), skinD = shadeHex(skin, 0.82), skinDD = shadeHex(skin, 0.66);
    const hairC = L.hairColor ?? (old ? '#B9B4AE' : tang ? '#1B1615' : '#2B2019'), hairL = shadeHex(hairC, old ? 1.15 : 1.6);
    const robe = L.robe ?? (tang ? (f ? '#C2185B' : '#2E5E8C') : '#4F7CFF'), robeD = shadeHex(robe, 0.72);
    const g = [];
    const defs = `<defs><radialGradient id="${id}s" cx="42%" cy="38%" r="70%"><stop offset="0" stop-color="${shadeHex(skin, 1.06)}"/><stop offset=".7" stop-color="${skin}"/><stop offset="1" stop-color="${skinD}"/></radialGradient>`
      + `<linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hairL}"/><stop offset=".45" stop-color="${hairC}"/><stop offset="1" stop-color="${shadeHex(hairC, 0.8)}"/></linearGradient>`
      + `<linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shadeHex(bg, 1.45)}"/><stop offset="1" stop-color="${shadeHex(bg, 1.12)}"/></linearGradient>`
      + `<linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${robe}"/><stop offset="1" stop-color="${robeD}"/></linearGradient></defs>`;
    g.push(`<rect width="100" height="100" fill="url(#${id}b)"/>`);
    if (L.icon) {   // not a person: book / scroll
      if (L.icon === 'book') g.push(`<g transform="rotate(-8 50 52)"><rect x="27" y="24" width="46" height="58" rx="2" fill="#E9DFC9" stroke="#8C7A5B" stroke-width="1.5"/><rect x="27" y="24" width="7" height="58" fill="#6E5A3A"/>${[30, 44, 58, 72].map((y) => `<line x1="27" y1="${y}" x2="34" y2="${y}" stroke="#E9DFC9" stroke-width="1.6"/>`).join('')}<rect x="50" y="30" width="12" height="40" fill="#FBF7EE" stroke="#B8A27A" stroke-width="1"/>${[37, 44, 51, 58, 65].map((y) => `<rect x="53.5" y="${y - 2.5}" width="5" height="4" rx=".6" fill="#3A2E22"/>`).join('')}</g>`);
      else g.push(`<rect x="22" y="30" width="56" height="40" rx="3" fill="#F1E6CC" stroke="#9A8460" stroke-width="1.4"/><rect x="18" y="27" width="6" height="46" rx="3" fill="#8A5A2B"/><rect x="76" y="27" width="6" height="46" rx="3" fill="#8A5A2B"/>${[38, 46, 54, 62].map((y) => `<line x1="32" y1="${y}" x2="68" y2="${y}" stroke="#6B5A40" stroke-width="2" stroke-linecap="round"/>`).join('')}`);
      return `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${defs}${g.join('')}</svg>`;
    }
    // Small-avatar framing: keep the top of a high bun or the helmet tassel; otherwise start a little above the forehead
    const vb = crop ? (L.hair === 'gaoji' || L.hat === 'helmet' || L.hat === 'futou' ? '15 2 70 70' : '17 10 66 66') : '0 0 100 100';
    const hair = L.hair ?? (tang ? (f ? 'gaoji' : 'tang') : f ? 'long' : 'short'), hat = L.hat ?? (tang && !f ? 'futou' : 'none');
    // 1. Hair behind the head (long hair, the high bun's mass, ponytail)
    if (hair === 'long') g.push(`<path d="M31 34 C28 52 27 70 30 88 L70 88 C73 70 72 52 69 34 Z" fill="url(#${id}h)"/>`);
    if (hair === 'bob') g.push(`<path d="M31 32 C28 48 29 60 32 66 L68 66 C71 60 72 48 69 32 Z" fill="url(#${id}h)"/>`);
    if (hair === 'ponytail') g.push(`<path d="M64 24 C78 24 82 40 76 58 C73 66 70 66 69 60 C73 46 72 34 63 30 Z" fill="url(#${id}h)"/>`);
    if (hair === 'gaoji') g.push(`<path d="M37 26 C30 8 46 -2 52 8 C58 -3 74 6 64 26 Z" fill="url(#${id}h)"/><path d="M41 14 C46 8 54 7 58 12" stroke="${hairL}" stroke-width="1.2" fill="none" opacity=".7"/>`);
    if (hair === 'banji') g.push(`<path d="M38 26 C36 14 48 8 56 12 C66 8 70 20 63 27 Z" fill="url(#${id}h)"/>`);
    // The futou's two soft tails: hanging from the back of the head past the ears down to the shoulders (seen from the front, either side of the neck)
    if (hat === 'futou') g.push(`<path d="M38 30 C33.5 42 31.5 58 31 76 L36.2 77 C36.4 60 38.2 44 41.5 32 Z" fill="#1E1C1A"/><path d="M62 30 C66.5 42 68.5 58 69 76 L63.8 77 C63.6 60 61.8 44 58.5 32 Z" fill="#1E1C1A"/>`);
    // 2. Clothes, neck
    g.push(`<path d="M43 61 L43 77 C46 80 54 80 57 77 L57 61 Z" fill="${skinD}"/>`);
    g.push(`<path d="M6 100 C8 86 22 78 40 76 L60 76 C78 78 92 86 94 100 Z" fill="url(#${id}c)"/>`);
    const wear = L.wear ?? (tang ? (f ? 'jiaoling' : 'yuanling') : 'tee');
    if (wear === 'yuanling') g.push(`<path d="M38.5 76.5 C42 86 58 86 61.5 76.5" fill="none" stroke="${robeD}" stroke-width="3.2"/><path d="M41 77 C44 83 56 83 59 77" fill="none" stroke="#F4EEE2" stroke-width="1.4" opacity=".85"/>`);
    if (wear === 'jiaoling') g.push(`<path d="M40 76 L52 96 L60 76 Z" fill="#F4E9D8"/><path d="M40 76 L54 98" stroke="${robeD}" stroke-width="2.6"/><path d="M60 76 L50 92" stroke="${robeD}" stroke-width="2.2"/><path d="M6 96 C14 84 26 80 34 80 C30 88 26 94 24 100 L6 100 Z" fill="${L.shawl ?? '#F2C14E'}" opacity=".9"/><path d="M94 96 C86 84 74 80 66 80 C70 88 74 94 76 100 L94 100 Z" fill="${L.shawl ?? '#F2C14E'}" opacity=".9"/>`);
    if (wear === 'tee') g.push(`<path d="M41 76 C44 82 56 82 59 76" fill="none" stroke="${robeD}" stroke-width="2.4"/>`);
    if (wear === 'shirt' || wear === 'suit') g.push(`${wear === 'suit' ? `<path d="M30 79 L50 100 L70 79 L62 77 L50 92 L38 77 Z" fill="#F7F7F7"/><path d="M47 84 L50 100 L53 84 L50 81 Z" fill="${L.tie ?? '#8E2A2A'}"/>` : ''}<path d="M39 76 L44 86 L50 79 L56 86 L61 76 L50 77 Z" fill="${wear === 'suit' ? '#FFFFFF' : shadeHex(robe, 1.25)}" stroke="${robeD}" stroke-width=".8"/>`);
    if (wear === 'hoodie') g.push(`<path d="M30 80 C34 72 44 74 50 80 C56 74 66 72 70 80 C66 86 58 86 50 84 C42 86 34 86 30 80 Z" fill="${robeD}"/><line x1="46" y1="84" x2="45" y2="95" stroke="#EEE" stroke-width="1.2"/><line x1="54" y1="84" x2="55" y2="95" stroke="#EEE" stroke-width="1.2"/>`);
    // 3. Ears, face
    g.push(`<ellipse cx="34" cy="45" rx="3.2" ry="5.6" fill="${skinD}"/><ellipse cx="66" cy="45" rx="3.2" ry="5.6" fill="${skinD}"/>`);
    const jaw = f ? 'C62 56 57 66 50 67.5 C43 66 38 56 35 46' : old ? 'C65.5 57 59 67 50 68.5 C41 67 34.5 57 34.5 45' : 'C65 56 58.5 66.5 50 68 C41.5 66.5 35 56 35 45';
    g.push(`<path d="M50 18 C62.5 18 66 28 65.5 41 ${f ? 'C65 43 65 44 65 46 ' : ''}${jaw} C34.5 28 37.5 18 50 18 Z" fill="url(#${id}s)"/>`);
    g.push(`<path d="M60 26 C66 34 66 50 60 62 C64 50 64 36 60 26 Z" fill="${skinDD}" opacity=".18"/>`);   // one side of the face a little darker (light from the upper left)
    if (f || age === 'young') g.push(`<ellipse cx="39.5" cy="52" rx="4.6" ry="2.6" fill="#F07C7C" opacity="${tang && f ? 0.42 : 0.22}"/><ellipse cx="60.5" cy="52" rx="4.6" ry="2.6" fill="#F07C7C" opacity="${tang && f ? 0.42 : 0.22}"/>`);
    // 4. Features
    const browW = f ? 1.5 : 2.3, browY = f ? 37.2 : 37.6;
    g.push(`<path d="M38 ${browY + 0.6} Q43 ${browY - 2.4} 47.4 ${browY}" stroke="${old ? '#8F8A84' : shadeHex(hairC, 1.1)}" stroke-width="${browW}" fill="none" stroke-linecap="round"/><path d="M62 ${browY + 0.6} Q57 ${browY - 2.4} 52.6 ${browY}" stroke="${old ? '#8F8A84' : shadeHex(hairC, 1.1)}" stroke-width="${browW}" fill="none" stroke-linecap="round"/>`);
    const eye = (cx, dir) => { const e2 = L.smile ? `M${cx - 4.3} 44 Q${cx} 40.8 ${cx + 4.3} 44` : null; return e2 ? `<path d="${e2}" stroke="#2A1D16" stroke-width="1.5" fill="none" stroke-linecap="round"/>` : `<path d="M${cx - 4.6} 43.6 Q${cx} 39.8 ${cx + 4.6} 43.4 Q${cx} 46.6 ${cx - 4.6} 43.6 Z" fill="#FBF7F2"/><circle cx="${cx + dir * 0.3}" cy="43.4" r="2.25" fill="#2A1D16"/><circle cx="${cx + dir * 0.3 + 0.75}" cy="42.6" r=".75" fill="#FFF"/><path d="M${cx - 4.8} 43.5 Q${cx} 39.4 ${cx + 4.8} 43.1${f ? ` L${cx + dir * 6} ${42.2}` : ''}" stroke="#2A1D16" stroke-width="1.15" fill="none" stroke-linecap="round"/>`; };
    g.push(eye(43, -1), eye(57, 1));
    if (old) g.push(`<path d="M38.5 47.5 Q41 48.6 44 47.8 M56 47.8 Q59 48.6 61.5 47.5 M42 31 Q50 29.6 58 31 M44 33.4 Q50 32.4 56 33.4" stroke="${skinDD}" stroke-width=".7" fill="none" opacity=".7"/><path d="M44 52 Q42 57 44.5 60.5 M56 52 Q58 57 55.5 60.5" stroke="${skinDD}" stroke-width=".8" fill="none" opacity=".55"/>`);
    g.push(`<path d="M50.4 45.5 Q49.6 50.5 47.8 52.4 Q50 53.8 52.4 52.4" stroke="${skinDD}" stroke-width=".95" fill="none" opacity=".75" stroke-linecap="round"/>`);
    if (L.glasses) g.push(`<g fill="none" stroke="${L.glasses === true ? '#2B2B2B' : L.glasses}" stroke-width="1.3"><rect x="37" y="39.2" width="11.6" height="8.6" rx="3"/><rect x="51.4" y="39.2" width="11.6" height="8.6" rx="3"/><path d="M48.6 42.5 Q50 41.4 51.4 42.5 M37 42 L34.5 41.2 M63 42 L65.5 41.2"/></g>`);
    // Mouth: Tang women have small red lips (dotted lips), modern women a soft lip colour, men a line; smile = curves up
    if (f && tang) g.push(`<path d="M46.8 58.4 Q48.4 57 50 57.9 Q51.6 57 53.2 58.4 Q50 60.6 46.8 58.4 Z" fill="#C3283F"/>`);
    else if (f) g.push(`<path d="M45.5 58.2 Q50 ${L.smile ? 61.8 : 57.2} 54.5 58.2 Q50 ${L.smile ? 62.5 : 60.6} 45.5 58.2 Z" fill="#D46A6A"/>`);
    else g.push(`<path d="M45.4 58.6 Q50 ${L.smile ? 61.6 : 59.6} 54.6 58.6" stroke="#8E4E40" stroke-width="1.35" fill="none" stroke-linecap="round"/>`);
    // Facial hair
    const beard = L.beard ?? 'none', bc = old ? '#CFCAC3' : shadeHex(hairC, 1.05);
    if (beard === 'stubble') g.push(`<path d="M37 52 C38 62 44 67.5 50 68 C56 67.5 62 62 63 52 C60 60 56 63 50 63 C44 63 40 60 37 52 Z" fill="${skinDD}" opacity=".28"/>`);
    if (beard === 'mustache' || beard === 'goatee' || beard === 'long') g.push(`<path d="M44 56.4 Q47 54.2 50 55.6 Q53 54.2 56 56.4 Q53 56.2 50 57 Q47 56.2 44 56.4 Z" fill="${bc}"/>`);
    if (beard === 'goatee') g.push(`<path d="M47.4 63 Q50 71 52.6 63 Q50 64.2 47.4 63 Z" fill="${bc}"/>`);
    if (beard === 'long') g.push(`<path d="M46.2 62.2 Q47.5 76 50 86 Q52.5 76 53.8 62.2 Q50 63.6 46.2 62.2 Z" fill="${bc}"/><path d="M44.2 57 Q41 66 42.6 74 M55.8 57 Q59 66 57.4 74" stroke="${bc}" stroke-width="1.2" fill="none"/>`);
    // 5. Front hair, hats, hair ornaments
    if (hair === 'tang' && hat !== 'helmet') g.push(`<path d="M35.2 34 Q34.6 44 36.6 48 L37.6 35.5 Z M64.8 34 Q65.4 44 63.4 48 L62.4 35.5 Z" fill="${hairC}"/>`);   // sideburns showing below the futou
    // Futou: black gauze wrapping the crown, two rounded "jinzi" lobes rising on top, a tie across the forehead
    if (hat === 'futou') g.push(`<path d="M34.2 36 C33 17 67 17 65.8 36 C59 32.6 41 32.6 34.2 36 Z" fill="#1E1C1A"/><path d="M38.5 22.5 C36.5 8.5 49.5 5.5 50 14 C50.5 5.5 63.5 8.5 61.5 22.5 C55 20.5 45 20.5 38.5 22.5 Z" fill="#262321"/><path d="M43 11 C45 8.6 48 9 49 12 M51 12 C52 9 55 8.6 57 11" stroke="#4A4541" stroke-width=".9" fill="none"/><path d="M35 34.4 C42 31.6 58 31.6 65 34.4" stroke="#45403C" stroke-width="1.1" fill="none"/>`);
    if (hat === 'helmet') g.push(`<path d="M32.5 38 C31 13 69 13 67.5 38 L67.5 46 L63.5 47 L63.5 36 C57 32.5 43 32.5 36.5 36 L36.5 47 L32.5 46 Z" fill="#5E6873"/><path d="M38 21 C44 16 56 16 62 21" stroke="#9AA6B2" stroke-width="1.6" fill="none"/><path d="M49 13 C47 6 53 6 51 13 Z" fill="#C0392B"/><circle cx="50" cy="12.5" r="2.6" fill="#C0392B"/>`);
    if (hair === 'gaoji' || hair === 'banji') {
      g.push(`<path d="M34.6 41 C31 24 42 17 50 18.5 C58 17 69 24 65.4 41 C63 31 57 26 50 25.8 C43 26 37 31 34.6 41 Z" fill="url(#${id}h)"/><ellipse cx="34.2" cy="38" rx="3.6" ry="8" fill="${hairC}"/><ellipse cx="65.8" cy="38" rx="3.6" ry="8" fill="${hairC}"/>`);
      g.push(`<path d="M58 12 L69 4 M41 14 L33 7" stroke="#D9AE4F" stroke-width="1.6" stroke-linecap="round"/><circle cx="69" cy="4" r="1.6" fill="#E8C25A"/><circle cx="33" cy="7" r="1.6" fill="#E8C25A"/>`);
      if (L.flower !== false) { const fx = 63, fy = 22, fc = L.flowerColor ?? '#E0457B'; g.push(`${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(fx + 3.6 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(fy + 3.6 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="3" fill="${fc}"/>`).join('')}<circle cx="${fx}" cy="${fy}" r="2" fill="#F7D35A"/><path d="M67 25 Q71 27 72 31" stroke="#4E8A3E" stroke-width="1.4" fill="none"/>`); }
    }
    if (L.huadian ?? (tang && f)) g.push(`<path d="M50 29.2 L51.3 31 L50 32.8 L48.7 31 Z" fill="#D4283F"/>`);   // huadian (forehead ornament)
    if (hair === 'short') g.push(`<path d="M34.4 40 C31.5 17 68.5 17 65.6 40 C64 31 58 26.5 50 27.2 C44 27 38.5 30 34.4 40 Z" fill="url(#${id}h)"/>`);
    if (hair === 'buzz') g.push(`<path d="M35 37 C33.5 19 66.5 19 65 37 C61 30.5 39 30.5 35 37 Z" fill="${hairC}" opacity=".85"/>`);
    if (hair === 'curly') g.push(`${[[36, 32], [40, 25], [46, 21], [54, 21], [60, 25], [64, 32], [43, 28], [57, 28], [50, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="url(#${id}h)"/>`).join('')}`);
    // Front of long hair, bob, ponytail: covers the crown, side parting, a lock of fringe on the forehead
    if (hair === 'long' || hair === 'bob' || hair === 'ponytail') g.push(`<path d="M33.6 46 C28.5 13 71.5 13 66.4 46 C65.6 35 61 28.5 54 27 C49 32.5 41.5 35.5 33.6 46 Z" fill="url(#${id}h)"/><path d="M54 27 C56 32 61 36 64.5 40" stroke="${shadeHex(hairC, 0.8)}" stroke-width=".8" fill="none" opacity=".6"/>`);
    if (hat === 'cap') g.push(`<path d="M33.5 34 C33 15 67 15 66.5 34 Z" fill="${L.hatColor ?? '#2F3B52'}"/><path d="M33 33.5 L70 33.5 C74 34 74 37 70 37 L33 36.6 Z" fill="${shadeHex(L.hatColor ?? '#2F3B52', 0.75)}"/>`);
    if (hat === 'beanie') g.push(`<path d="M33.5 37 C32 13 68 13 66.5 37 Z" fill="${L.hatColor ?? '#B5523B'}"/><rect x="33" y="32" width="34" height="6" rx="3" fill="${shadeHex(L.hatColor ?? '#B5523B', 0.8)}"/>`);
    return `<svg viewBox="${vb}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${defs}<rect x="-50" y="-50" width="200" height="200" fill="url(#${id}b)"/>${g.join('')}</svg>`;
  }

  P.chat = function (F, opt = {}) {
    const C = { F }, PT = F.portrait, W = F.W, H = F.H, px = (n) => F.px(n);
    const th = { ...(THEMES[opt.theme ?? 'light'] || THEMES.light), ...(opt.colors || {}) }, acc = opt.accent ?? '#4F7CFF';
    const meBg = th.me ?? acc, meInk = th.meInk ?? (lum(meBg) > 0.62 ? '#151821' : '#FFFFFF');   // "me" bubble: the theme's own colour (light green for im) or the accent
    C.theme = th; C.accent = acc;
    const FONT = opt.font ?? F.theme.fonts.sans, SERIF = opt.serif ?? '"LXGW WenKai", "Noto Serif SC", serif';
    C.font = FONT; C.serif = SERIF;
    // Sizes (design units): the landscape chat window is about 1050 wide, text 46; portrait fills the width, text 44 — every line above 10px on a phone
    const Z = PT ? { msg: 44, name: 28, sys: 30, av: 90, pad: 28, gap: 30, head: 112, comp: 104, title: 40 } : { msg: 46, name: 28, sys: 30, av: 78, pad: 26, gap: 26, head: 92, comp: 96, title: 38 };   // avatars a bit larger: the portrait's face must be readable
    const show = (e, on) => set(e, { display: on ? '' : 'none' });

    // ---------- Cast ----------
    C.castList = {};
    C.cast = (list) => {
      let i = Object.keys(C.castList).length;
      for (const [n, c] of Object.entries(list)) C.castList[n] = { color: c.color ?? AVATARS[i++ % AVATARS.length], mark: c.mark ?? [...n][0], me: !!c.me, look: c.look ?? null };
      // Any two people differ in at least two things: with portraits, the portrait (hair, hat, beard, clothing colour…) + ground colour; without, ground colour + avatar letter
      if (window.EV && window.EV.castCheck) window.EV.castCheck(Object.fromEntries(Object.keys(list).map((n) => { const c = C.castList[n]; return [n, c.look ? { color: c.color, ...c.look } : { color: c.color, mark: c.mark }]; })), null, 'chat');
      return C.castList;
    };
    const who = (n) => { if (!C.castList[n]) C.cast({ [n]: {} }); return C.castList[n]; };
    const avatar = (parent, n, size, css = '') => {
      const c = who(n), a = el('div', `width:${f1(size)}px;height:${f1(size)}px;border-radius:${f1(size * (th.avR ?? 0.26))}px;background:${c.color};color:#fff;display:flex;align-items:center;justify-content:center;font:700 ${f1(size * 0.46)}px/1 ${FONT};overflow:hidden;${css}`, parent);
      // Draw every copy fresh (unique ids): if copies of one person's avatar share gradient ids, the browser uses the first definition in the document — if that copy is hidden (still "typing") the gradient can't render and the avatar starts dark then brightens
      if (c.look) { a.innerHTML = portraitSVG(c.look, c.color, true); a.style.boxShadow = `inset 0 0 0 1px ${alpha('#000000', 0.08)}`; }   // portrait (the same person always gets the same one)
      else a.textContent = c.mark;
      a.dataset.what = 'C.avatar';
      return a;
    };

    // ---------- Background ----------
    C.stage = (layer, o = {}) => {
      const wrap = el('div', `inset:0;overflow:hidden;background:${o.bg ?? th.bg}`, layer);
      if (th.flat) return { el: wrap };   // im: just the phone screen's grey ground, no coloured glows
      el('div', `left:${f1(-W * 0.1)}px;top:${f1(-H * 0.2)}px;width:${f1(W * 0.7)}px;height:${f1(H * 0.9)}px;border-radius:50%;background:radial-gradient(closest-side, ${alpha(acc, 0.16)}, transparent);`, wrap);
      el('div', `left:${f1(W * 0.55)}px;top:${f1(H * 0.45)}px;width:${f1(W * 0.6)}px;height:${f1(H * 0.8)}px;border-radius:50%;background:radial-gradient(closest-side, ${alpha(acc, 0.1)}, transparent);`, wrap);
      return { el: wrap };
    };

    // App position: a large window on the right in landscape; full width in portrait, with room above for the aside card and below for captions and the platform overlay
    const GEO = PT ? (th.flat ? { x: 0, y: H * 0.165, w: W, h: H * 0.835 } : { x: px(24), y: H * 0.165, w: W - px(48), h: H * 0.52 }) :   // portrait bottom edge 0.685H: captions start at 0.70H, below it
       { x: W * 0.415, y: H * 0.05, w: W * 0.545, h: H * 0.79 };   // landscape bottom edge 0.84H: captions below it
    C.geo = GEO;

    // ---------- App ----------
    C.app = (layer, o = {}) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, g = o.center && !PT ? { ...GEO, x: (W - GEO.w) / 2 } : GEO, r = th.flat ? (PT ? 0 : px(14)) : px(PT ? 36 : 28);   // im portrait: full width, no rounded corners (like the phone screen itself)   // center: true = centred in landscape too (when there's no aside card)
      const root = el('div', `left:${f1(g.x)}px;top:${f1(g.y)}px;width:${f1(g.w)}px;height:${f1(g.h)}px;border-radius:${f1(r)}px;background:${th.app};overflow:hidden;${th.flat && PT ? '' : `box-shadow:0 ${f1(px(30))}px ${f1(px(80))}px ${th.shadow}, 0 0 0 1px ${th.line};`}display:none;transform-origin:0 0`, layer);
      root.dataset.what = 'C.app';
      const head = el('div', `left:0;top:0;right:0;height:${f1(px(Z.head))}px;background:${th.bar};box-shadow:0 1px 0 ${th.line};z-index:5`, root);
      const back = el('div', `left:${f1(px(26))}px;top:0;height:100%;display:flex;align-items:center;font:400 ${f1(px(Z.title * 1.5))}px/1 ${FONT};color:${th.ink}`, head); back.textContent = '‹';
      const more = el('div', `right:${f1(px(28))}px;top:0;height:100%;display:flex;align-items:center;font:700 ${f1(px(Z.title))}px/1 ${FONT};color:${th.ink};letter-spacing:.1em`, head); more.textContent = '···';
      const titleBox = el('div', `left:${f1(px(110))}px;right:${f1(px(110))}px;top:0;height:100%;overflow:hidden`, head);
      // Readable height: where the newest message's bottom edge rests. im's portrait app runs to the bottom of the screen (input at the very bottom, not like a raised keyboard); messages only stack down to above the captions (0.685H)
      const VIEWH = th.flat && PT ? H * 0.685 - g.y - px(Z.head) : g.h - px(Z.head + Z.comp);
      const listBox = el('div', `left:0;right:0;top:${f1(px(Z.head))}px;bottom:${f1(px(Z.comp))}px;overflow:hidden`, root);
      const comp = el('div', `left:0;right:0;bottom:0;height:${f1(px(Z.comp))}px;background:${th.bar};box-shadow:0 -1px 0 ${th.line};z-index:5`, root);
      const IM = th.comp === 'im', ic = px(Z.comp - 40);
      // im's bottom bar: voice on the left, white input field in the middle, emoji and plus on the right (plus becomes a green "send" while typing)
      const icon = (x, right, svg) => { const d = el('div', `${right ? 'right' : 'left'}:${f1(x)}px;top:${f1((px(Z.comp) - ic) / 2)}px;width:${f1(ic)}px;height:${f1(ic)}px`, comp); d.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${th.ink}" stroke-width="1.5" stroke-linecap="round">${svg}</svg>`; return d; };
      let plus = null, emoji = null;
      const sendW = px(124);   // "send" has a fixed width; while typing the emoji shifts left to make room
      if (IM) { icon(px(20), false, '<circle cx="12" cy="12" r="10"/><path d="M10 8.5 Q12.5 12 10 15.5 M13.5 6.5 Q17.5 12 13.5 17.5"/>'); emoji = icon(px(20) + ic + px(16), true, '<circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r=".6" fill="currentColor"/><circle cx="15" cy="10" r=".6" fill="currentColor"/><path d="M8 14.5 Q12 17.5 16 14.5"/>'); plus = icon(px(20), true, '<circle cx="12" cy="12" r="10"/><path d="M12 7 V17 M7 12 H17"/>'); }
      const field = el('div', IM ? `left:${f1(px(36) + ic)}px;right:${f1(px(46) + sendW + ic)}px;top:${f1(px(16))}px;bottom:${f1(px(16))}px;border-radius:${f1(px(10))}px;background:#FFFFFF;overflow:hidden` : `left:${f1(px(24))}px;right:${f1(px(Z.comp + 10))}px;top:${f1(px(18))}px;bottom:${f1(px(18))}px;border-radius:${f1(px(Z.comp))}px;background:${th.app};box-shadow:inset 0 0 0 1px ${th.line};overflow:hidden`, comp);
      const fieldText = el('div', `left:${f1(px(26))}px;right:${f1(px(20))}px;top:0;height:100%;display:flex;align-items:center;font:400 ${f1(px(Z.msg * 0.85))}px/1 ${FONT};color:${th.ink};white-space:nowrap;overflow:hidden`, field);
      const caret = el('span', `position:relative;display:inline-block;width:${f1(px(3))}px;height:${f1(px(Z.msg * 0.9))}px;background:${IM ? '#07C160' : acc};margin-left:${f1(px(3))}px`, fieldText);
      const fieldPre = el('span', 'position:relative;white-space:pre', fieldText); fieldText.insertBefore(fieldPre, caret);
      const send = IM ? el('div', `right:${f1(px(16))}px;top:${f1(px(18))}px;width:${f1(sendW)}px;height:${f1(px(Z.comp - 36))}px;border-radius:${f1(px(8))}px;background:#07C160;color:#FFFFFF;display:none;align-items:center;justify-content:center;font:500 ${f1(px(Z.msg * 0.7))}px/1 ${FONT}`, comp) : el('div', `right:${f1(px(18))}px;top:${f1(px(16))}px;width:${f1(px(Z.comp - 32))}px;height:${f1(px(Z.comp - 32))}px;border-radius:50%;background:${acc};color:${meInk};display:flex;align-items:center;justify-content:center;font:700 ${f1(px(Z.msg * 0.8))}px/1 ${FONT}`, comp);
      send.textContent = IM ? M('发送', 'Send') : '↑';   // the app's own words follow the page's language
      const A = { el: root, threads: [], opens: [], focuses: [], types: [], at, until, list: listBox };
      const titles = [];
      // A chat: title, member count; messages stack downward one by one, and once full the whole lot pushes up
      A.thread = (to = {}) => {
        const T = { title: to.title ?? '', members: to.members, items: [], el: el('div', `inset:0;display:none;background:${th.app}`, listBox), A };
        const tt = el('div', `inset:0;display:none;align-items:center;justify-content:center;font:700 ${f1(px(Z.title))}px/1 ${FONT};color:${th.ink};white-space:nowrap`, titleBox);
        tt.textContent = T.title + (T.members ? ` (${T.members})` : ''); titles.push({ T, el: tt, at: -1e9 });
        if (T.title) F.text(tt, 'label', T.title, to.at ?? at, until, { noFact: to.noFact }); T.titleReg = F.texts[F.texts.length - 1];
        A.threads.push(T);
        if (!A.opens.length) A.opens.push({ at: to.at ?? at, T });
        else if (to.at !== undefined) A.open(T, to.at);
        addThreadApi(T);
        return T;
      };
      // Switch to another chat: the new one pushes in from the right, the old one retreats left (0.35 s)
      A.open = (T, t, oo = {}) => { A.opens.push({ at: t, T }); A.opens.sort((a, b) => a.at - b.at); if (oo.sfx !== false) F.sfx(t, 'swipe', 0.3, { dur: 0.4 }); F.transition(t, t + 0.4); F.blur(t, t + 0.4, 8); return T; };   // the switch is a deliberate full-screen push: register it as a transition (the film and motion checks won't flag it as too fast)
      const openAt = (t) => { let cur = null, prev = null, tc = -1; for (const o2 of A.opens) if (t >= o2.at) { prev = cur; cur = o2.T; tc = o2.at; } return { cur, prev, tc }; };
      A.activeAt = (t) => openAt(t).cur;
      // "Me" types in the input field, sent at `at`
      A.type = (t, text, oo = {}) => {
        const dur = oo.dur ?? Math.min(2, 0.3 + [...text].length * 0.07), T = oo.thread ?? A.threads[A.threads.length - 1], me = oo.who ?? Object.keys(C.castList).find((n) => C.castList[n].me) ?? M('我', 'Me');
        A.types.push({ a: t - dur, b: t, text });
        for (let k = t - dur; k < t - 0.05; k += 0.12) F.sfx(k, 'type', 0.12);
        return T.msg(t, me, text, { ...oo, sent: true });
      };
      // Notification: slides down from the top
      A.notify = (t, no = {}) => {
        const until2 = no.until ?? t + 2.2, nb = el('div', `left:${f1(px(20))}px;right:${f1(px(20))}px;top:${f1(px(14))}px;padding:${f1(px(18))}px ${f1(px(22))}px;border-radius:${f1(px(26))}px;background:${alpha(th.bar, 0.97)};box-shadow:0 ${f1(px(12))}px ${f1(px(36))}px ${th.shadow};display:none;z-index:20`, root);
        const ic = el('div', `position:relative;float:left;width:${f1(px(64))}px;height:${f1(px(64))}px;border-radius:${f1(px(16))}px;background:${acc};margin-right:${f1(px(18))}px`, nb);
        const t1 = el('div', `position:relative;font:700 ${f1(px(Z.name + 4))}px/1.3 ${FONT};color:${th.ink}`, nb); t1.textContent = no.title ?? '';
        const t2 = el('div', `position:relative;font:400 ${f1(px(Z.msg * 0.85))}px/1.3 ${FONT};color:${th.ink};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, nb); t2.textContent = no.text ?? '';
        if (no.title) F.text(t1, 'label', no.title, t, until2); if (no.text) F.text(t2, 'label', no.text, t, until2);
        F.sfx(t - 0.05, 'notify', 0.45);
        F.add((tt) => { const on = tt >= t - 0.3 && tt < until2; show(nb, on); if (!on) return; const q = seg(tt, t - 0.3, t, E.expoOut), out = seg(tt, until2 - 0.3, until2, E.quartIn); set(nb, { transform: `translateY(${f1(-(1 - q + out) * px(200))}%)`, opacity: String(f3(Math.min(q, 1 - out))) }); });
        return { el: nb };
      };
      // Push in on a message: the whole app scales up, this message moves near the frame centre, other messages, the title bar and the input dim
      A.focus = (t, m, fo = {}) => { A.focuses.push({ a: t, b: fo.until ?? t + 2.5, m, zoom: fo.zoom ?? (PT ? 1.3 : 1.45) }); F.sfx(t - 0.5, 'zoom', 0.25, { dur: 0.6 }); return A; };
      const addThreadApi = (T) => {
        const item = (it) => { it.T = T; T.items.push(it); return it; };
        const W0 = g.w, maxB = W0 - px(2 * Z.pad + 2 * Z.av + 2 * 18 + 20);
        // A row: avatar + (others' names in a group) + bubble; "me" on the right
        const row = (n, a0) => {
          const c = who(n), mine = c.me, r2 = el('div', `left:0;right:0;top:0;display:none`, T.el);
          avatar(r2, n, px(Z.av), mine ? `right:${f1(px(Z.pad))}px;top:0;` : `left:${f1(px(Z.pad))}px;top:0;`);
          const col = el('div', `${mine ? `right:${f1(px(Z.pad + Z.av + 18))}px;align-items:flex-end;` : `left:${f1(px(Z.pad + Z.av + 18))}px;align-items:flex-start;`}top:0;display:flex;flex-direction:column;max-width:${f1(maxB)}px`, r2);
          if (!mine && T.members) { const nm = el('div', `position:relative;font:400 ${f1(px(Z.name))}px/1.3 ${FONT};color:${th.muted};margin-bottom:${f1(px(6))}px`, col); nm.textContent = n; }
          return { row: r2, col, mine };
        };
        const BR = px(th.bubbleR ?? 24), corner = th.tail ? BR : px(6);
        const shell = (col, mine, css = '') => { const b0 = el('div', `position:relative;max-width:${f1(maxB)}px;padding:${f1(px(18))}px ${f1(px(24))}px;border-radius:${f1(BR)}px;${mine ? `border-top-right-radius:${f1(corner)}px;background:${meBg};color:${meInk};` : `border-top-left-radius:${f1(corner)}px;background:${th.other};color:${th.ink};${th.tail ? '' : `box-shadow:0 1px 0 ${th.line};`}`}font:400 ${f1(px(Z.msg))}px/1.42 ${FONT};word-break:break-word;${css}`, col); if (th.tail) el('div', `${mine ? 'right' : 'left'}:${f1(-px(9))}px;top:${f1(px(22))}px;width:${f1(px(20))}px;height:${f1(px(20))}px;background:${mine ? meBg : th.other};transform:rotate(45deg);border-radius:${f1(px(3))}px`, b0); return b0; };   // the bubble's little tail points at the avatar
        // Typing: three dots bounce in turn (position only, no flashing)
        const typingEl = (n) => {
          const R = row(n), b = shell(R.col, R.mine, 'display:flex;gap:' + f1(px(10)) + 'px;padding:' + f1(px(26)) + 'px ' + f1(px(28)) + 'px'), dots = [0, 1, 2].map(() => el('span', `position:relative;display:inline-block;width:${f1(px(14))}px;height:${f1(px(14))}px;border-radius:50%;background:${R.mine ? meInk : th.muted}`, b));
          dots.forEach((d) => (d.dataset.motion = 'skip'));
          return { el: R.row, dots };
        };
        T.msg = (t, n, text, mo = {}) => {
          const R = row(n), b = shell(R.col, R.mine, mo.big ? `font-size:${f1(px(Z.msg * 2.2))}px;line-height:1.15;padding:${f1(px(14))}px ${f1(px(22))}px` : '');
          if (mo.quote) { const q = el('div', `position:relative;margin-bottom:${f1(px(10))}px;padding:${f1(px(8))}px ${f1(px(14))}px;border-left:${f1(px(5))}px solid ${R.mine ? alpha(meInk, 0.6) : acc};font-size:${f1(px(Z.msg * 0.72))}px;opacity:.75`, b); q.textContent = `${mo.quote.who}：${mo.quote.text}`; }
          const tx = el('span', `position:relative;white-space:pre-wrap;${mo.link ? `color:${R.mine ? meInk : acc};text-decoration:underline;text-underline-offset:${f1(px(6))}px;` : ''}`, b); tx.textContent = text;   // link: true = a URL (accent colour, underlined)
          const it = item({ at: t, kind: 'msg', el: R.row, bubble: b, text, who: n, until: mo.until, typing: mo.typing ? { dur: mo.typing === true ? 0.9 : mo.typing, ...typingEl(n) } : null });
          F.text(tx, mo.kind ?? 'label', text, t, mo.until ?? 1e9, { noFact: mo.noFact }); it.texts = [F.texts[F.texts.length - 1]];
          F.sfx(t, mo.sent ? 'send' : 'receive', mo.big ? 0.5 : 0.32);
          it.react = (t2, emoji) => { const rc = el('div', `position:relative;margin-top:${f1(px(-10))}px;${R.mine ? 'margin-right' : 'margin-left'}:${f1(px(12))}px;padding:${f1(px(4))}px ${f1(px(12))}px;border-radius:${f1(px(30))}px;background:${th.bar};box-shadow:0 0 0 1px ${th.line};font:400 ${f1(px(Z.name + 4))}px/1.3 ${FONT};display:none`, R.col); rc.textContent = emoji; (it.reacts ??= []).push({ at: t2, el: rc }); F.sfx(t2, 'react', 0.3); return it; };
          return it;
        };
        T.time = (t, text) => sysRow(t, text, true);
        T.system = (t, text) => sysRow(t, text, false);
        const sysRow = (t, text, isTime) => {
          const r2 = el('div', `left:0;right:0;top:0;display:none;text-align:center`, T.el);
          const pill = el('span', `position:relative;display:inline-block;padding:${f1(px(8))}px ${f1(px(20))}px;border-radius:${f1(px(th.sysR ?? 12))}px;${isTime ? '' : `background:${th.sys};`}font:400 ${f1(px(Z.sys))}px/1.35 ${FONT};color:${th.muted};max-width:${f1(g.w * 0.8)}px`, r2);
          pill.textContent = text; F.text(pill, 'label', text, t, 1e9);
          const it = item({ at: t, kind: 'system', el: r2, bubble: pill, text }); it.texts = [F.texts[F.texts.length - 1]];
          F.sfx(t, 'system', 0.2);
          return it;
        };
        T.recall = (t, n) => T.system(t, M(`${n} 撤回了一条消息`, `${n} recalled a message`));
        // Rename the group: system notice "X changed the group name to …", the title bar's name switches (old one rises away, new one drops in, accent-coloured first then back) — an end title can appear this way
        T.rename = (t, title, ro = {}) => {
          if (ro.by) T.system(t, M(`${ro.by} 修改群名为“${title}”`, `${ro.by} changed the group name to "${title}"`));
          const nt = el('div', `inset:0;display:none;align-items:center;justify-content:center;font:700 ${f1(px(Z.title))}px/1 ${FONT};color:${th.ink};white-space:nowrap`, titleBox);
          nt.textContent = title + (T.members ? ` (${T.members})` : '');
          const prev = titles.filter((x) => x.T === T).pop();
          // Old name leaves first (t … t + 0.2), then the new one drops in (t + 0.2 … t + 0.5): the two names never overlap in one place
          if (prev && prev.reg !== undefined) prev.reg.win[1] = t + 0.2; else if (T.titleReg) T.titleReg.win[1] = t + 0.2;
          F.text(nt, ro.kind ?? 'label', title, t + 0.2, until, { noFact: ro.noFact });   // the title bar is UI, not a headline (use an aside card for a big title)
          titles.push({ T, el: nt, at: t + 0.5, reg: F.texts[F.texts.length - 1] });
          F.sfx(t + 0.5, 'react', 0.4);
          return T;
        };
        // Voice note: length follows the seconds; the waveform lights up bar by bar while playing
        T.voice = (t, n, secs = 5, vo = {}) => {
          const R = row(n), b = shell(R.col, R.mine, `display:flex;align-items:center;gap:${f1(px(14))}px;min-width:${f1(Math.min(maxB, px(150 + secs * 26)))}px`);
          const icon = el('span', `position:relative;font:700 ${f1(px(Z.msg))}px/1 ${FONT}`, b); icon.textContent = R.mine ? '' : '◀';
          const bars = el('span', `position:relative;display:flex;align-items:center;gap:${f1(px(5))}px;flex:1`, b);
          const hs = Array.from({ length: Math.min(18, 6 + secs * 2) }, (_, i) => 0.35 + 0.65 * Math.abs(Math.sin(i * 1.7 + secs)));
          const bs = hs.map((hh) => el('span', `position:relative;display:inline-block;width:${f1(px(5))}px;height:${f1(px(Z.msg * hh * 0.8))}px;border-radius:${f1(px(3))}px;background:currentColor;opacity:.45`, bars));
          const sec = el('span', `position:relative;font:400 ${f1(px(Z.msg * 0.85))}px/1 ${FONT}`, b); sec.textContent = `${secs}″`;
          if (vo.text) { const tr = el('div', `position:relative;margin-top:${f1(px(8))}px;max-width:${f1(maxB)}px;padding:${f1(px(12))}px ${f1(px(18))}px;border-radius:${f1(px(16))}px;background:${th.sys};font:400 ${f1(px(Z.msg * 0.85))}px/1.4 ${FONT};color:${th.ink}`, R.col); tr.textContent = vo.text; F.text(tr, 'label', vo.text, t + 0.3, 1e9); }
          const it = item({ at: t, kind: 'voice', el: R.row, bubble: b, who: n, typing: null });
          F.sfx(t, R.mine ? 'send' : 'receive', 0.3); F.sfx(t + 0.2, 'voice', 0.25, { dur: Math.min(secs, 3) });
          it.play = { a: t + 0.2, b: t + 0.2 + secs, bs };
          return it;
        };
        // Image: a real image (src) or drawn yourself (draw(ctx, w, h))
        T.image = (t, n, io = {}) => {
          const R = row(n), iw = Math.min(maxB, px(io.w ?? 520)), ih = px(io.h ?? 380) * (iw / px(io.w ?? 520));
          const b = el('div', `position:relative;width:${f1(iw)}px;height:${f1(ih)}px;border-radius:${f1(px(th.cardR ?? 22))}px;overflow:hidden;background:${th.card};box-shadow:0 0 0 1px ${th.line}`, R.col);
          if (io.src) { const im = el('img', `left:0;top:0;width:100%;height:100%;object-fit:${io.fit ?? 'cover'}`, b); im.src = io.src; }
          if (io.draw) { const cv = document.createElement('canvas'); cv.width = Math.round(iw); cv.height = Math.round(ih); cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%'; b.appendChild(cv); F.prep(() => io.draw(cv.getContext('2d'), cv.width, cv.height)); }
          if (io.caption) { const cp = el('div', `left:0;right:0;bottom:0;padding:${f1(px(10))}px ${f1(px(16))}px;background:linear-gradient(transparent, rgba(0,0,0,.55));color:#fff;font:500 ${f1(px(Z.name + 2))}px/1.3 ${FONT}`, b); cp.textContent = io.caption; F.text(cp, 'label', io.caption, t, 1e9); }
          F.sfx(t, R.mine ? 'send' : 'receive', 0.32);
          if (window.EV && EV.info) EV.info('ui', t, undefined, { visual: false, group: `chat-img-${t}` });
          return item({ info: 'ui', at: t, kind: 'image', el: R.row, bubble: b, who: n, typing: io.typing ? { dur: io.typing === true ? 0.9 : io.typing, ...typingEl(n) } : null });
        };
        // Card messages
        T.card = (t, n, co = {}) => {
          const R = row(n), cw = Math.min(maxB, px(co.w ?? 640)), regs = [];
          const b = el('div', `position:relative;width:${f1(cw)}px;border-radius:${f1(px(th.cardR ?? 22))}px;overflow:hidden;background:${th.card};color:${th.ink};box-shadow:0 0 0 1px ${th.line}, 0 ${f1(px(6))}px ${f1(px(18))}px ${alpha('#000000', 0.06)};font:400 ${f1(px(Z.msg * 0.9))}px/1.45 ${FONT}`, R.col);
          const txt = (parent, s, css, a = t) => { const e2 = el('div', `position:relative;${css}`, parent); e2.textContent = s; F.text(e2, 'label', s, a, 1e9, { noFact: co.noFact }); regs.push(F.texts[F.texts.length - 1]); return e2; };
          const pad = `padding:${f1(px(22))}px ${f1(px(26))}px`;
          const foot = (s) => { el('div', `position:relative;height:1px;background:${th.line}`, b); txt(b, s, `${pad};padding-top:${f1(px(12))}px;padding-bottom:${f1(px(14))}px;font-size:${f1(px(Z.name))}px;color:${th.muted}`); };
          const it = item({ at: t, kind: 'card', el: R.row, bubble: b, who: n, typing: co.typing ? { dur: co.typing === true ? 0.9 : co.typing, ...typingEl(n) } : null, lights: [] });
          const k = co.kind ?? 'quote';
          if (k === 'quote') {   // quoted original: big quote mark + original text + source
            const box = el('div', `position:relative;${pad};border-left:${f1(px(8))}px solid ${acc}`, b);
            txt(box, co.text ?? '', `font:400 ${f1(px(Z.msg * (co.serif === false ? 0.95 : 1.05)))}px/1.5 ${co.serif === false ? FONT : SERIF};white-space:pre-line`);   // line break = two separate sentences (the fact check also goes line by line)
            if (co.source) foot(co.source);
          } else if (k === 'poem') {   // poem: one line per verse, lighting up one by one at the times in the at list
            const box = el('div', `position:relative;${pad};padding-top:${f1(px(28))}px;padding-bottom:${f1(px(26))}px;text-align:center;background:linear-gradient(${alpha(acc, 0.08)}, transparent)`, b);
            if (co.title) txt(box, co.title, `font:700 ${f1(px(Z.msg * 0.95))}px/1.4 ${SERIF};margin-bottom:${f1(px(4))}px`);
            if (co.author) txt(box, co.author, `font:400 ${f1(px(Z.name + 2))}px/1.4 ${FONT};color:${th.muted};margin-bottom:${f1(px(16))}px`);
            (co.lines || []).forEach((ln, j) => { const e2 = txt(box, ln, `font:400 ${f1(px(Z.msg * 1.08))}px/1.6 ${SERIF}`); it.lights.push({ el: e2, at: (co.light || [])[j] ?? null }); });
          } else if (k === 'location') {   // location: a small map, a dashed route between two points
            const mh = px(co.mapH ?? 260), map = el('div', `position:relative;height:${f1(mh)}px;background:${alpha(acc, 0.07)};overflow:hidden`, b);
            const cv = document.createElement('canvas'); cv.width = Math.round(cw); cv.height = Math.round(mh); cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%'; map.appendChild(cv);
            const A2 = co.fromAt ?? [0.78, 0.78], B2 = co.toAt ?? [0.22, 0.24];
            F.prep(() => { const c2 = cv.getContext('2d'), w2 = cv.width, h2 = cv.height; c2.strokeStyle = alpha(th.ink, 0.07); c2.lineWidth = px(2); for (let x = 0; x < w2; x += px(46)) { c2.beginPath(); c2.moveTo(x, 0); c2.lineTo(x + px(30), h2); c2.stroke(); } for (let y = 0; y < h2; y += px(52)) { c2.beginPath(); c2.moveTo(0, y); c2.lineTo(w2, y + px(16)); c2.stroke(); } });
            const routeCv = document.createElement('canvas'); routeCv.width = cv.width; routeCv.height = cv.height; routeCv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%'; map.appendChild(routeCv); routeCv.dataset.motion = 'skip';
            const pin = (p, label, col) => { const d = el('div', `left:${f1(p[0] * cw - px(16))}px;top:${f1(p[1] * mh - px(16))}px;width:${f1(px(32))}px;height:${f1(px(32))}px;border-radius:50%;background:${col};box-shadow:0 0 0 ${f1(px(6))}px ${alpha(col, 0.25)}`, map); const l2 = el('div', `left:${f1(p[0] * cw + (p[0] > 0.5 ? -px(26) : px(26)))}px;top:${f1(p[1] * mh - px(20))}px;${p[0] > 0.5 ? 'transform:translateX(-100%);' : ''}font:700 ${f1(px(Z.name + 4))}px/1.4 ${FONT};color:${th.ink};white-space:nowrap`, map); l2.textContent = label; F.text(l2, 'label', label, t, 1e9); return d; };
            if (co.from) pin(A2, co.from, '#E0A800'); if (co.to) pin(B2, co.to, acc);
            it.route = { cv: routeCv, A: A2, B: B2, a: co.drawAt ?? t + 0.2, b: (co.drawAt ?? t + 0.2) + (co.drawDur ?? 1.6), w: cw, h: mh };
            if (co.title) { const tb = el('div', `position:relative;${pad};padding-bottom:${f1(px(10))}px`, b); txt(tb, co.title, `font:700 ${f1(px(Z.msg * 0.9))}px/1.4 ${FONT}`); }
            if (co.note) foot(co.note);
          } else if (k === 'list') {   // sign-up list: title + rows added one by one (items: [{ text, at, hot }])
            const box = el('div', `position:relative;${pad}`, b);
            if (co.title) txt(box, co.title, `font:700 ${f1(px(Z.msg * 0.92))}px/1.4 ${FONT};margin-bottom:${f1(px(10))}px`);
            (co.items || []).forEach((x, j) => { const o2 = typeof x === 'string' ? { text: x } : x, e2 = el('div', `position:relative;font:${o2.hot ? 700 : 400} ${f1(px(Z.msg * 0.88))}px/1.55 ${FONT};color:${o2.hot ? acc : th.ink};opacity:0`, box); const nb = el('span', `position:relative;color:${th.muted};margin-right:${f1(px(10))}px`, e2); nb.textContent = `${j + 1}.`; txt(e2, o2.text, 'display:inline', o2.at ?? t); if (o2.note) txt(e2, o2.note, `display:block;margin-left:${f1(px(Z.msg * 0.88))}px;font-weight:400;font-size:${f1(px(Z.msg * 0.72))}px;color:${th.muted}`, o2.at ?? t); it.lights.push({ el: e2, at: o2.at ?? t, reveal: true }); if (o2.at) F.sfx(o2.at, 'tick', 0.25); });   // numbering is a separate span, kept out of the fact check; note = a small line below   // numbering is a separate span, kept out of the fact check
          } else if (k === 'poll') {   // poll: options grow one by one, numbers on the right
            const box = el('div', `position:relative;${pad}`, b), opts = co.options || [], mx = Math.max(...opts.map((o2) => o2[1])), hot = co.hot ?? [];
            if (co.title) txt(box, co.title, `font:700 ${f1(px(Z.msg * 0.92))}px/1.4 ${FONT};margin-bottom:${f1(px(14))}px`);
            opts.forEach(([name, v], j) => {
              const rowE = el('div', `position:relative;height:${f1(px(Z.msg * 1.5))}px;margin-bottom:${f1(px(12))}px;border-radius:${f1(px(12))}px;background:${th.sys};overflow:hidden`, box);
              const bar = el('div', `left:0;top:0;bottom:0;width:0;background:${hot.includes(j) ? alpha(acc, 0.85) : alpha(th.muted, 0.35)}`, rowE);
              const nm = el('div', `left:${f1(px(16))}px;top:0;bottom:0;display:flex;align-items:center;font:${hot.includes(j) ? 700 : 400} ${f1(px(Z.msg * 0.8))}px/1 ${FONT};color:${th.ink};white-space:nowrap`, rowE); nm.textContent = String(name); F.text(nm, 'label', String(name), t, 1e9); regs.push(F.texts[F.texts.length - 1]);
              const val = `${v}${co.unit ?? ''}`, vv = el('div', `right:${f1(px(16))}px;top:0;bottom:0;display:flex;align-items:center;font:700 ${f1(px(Z.msg * 0.8))}px/1 ${FONT};color:${th.ink}`, rowE); vv.textContent = val; F.text(vv, 'label', val, (co.ats || [])[j] ?? t + 0.3, 1e9); regs.push(F.texts[F.texts.length - 1]); it.lights.push({ el: vv, at: (co.ats || [])[j] ?? t + 0.3, reveal: true }); vv.style.opacity = '0';
              it.lights.push({ el: bar, at: (co.ats || [])[j] ?? t + 0.3 + j * 0.25, bar: v / mx });
            });
          } else if (k === 'record') {   // forwarded chat record: title + a few preview lines
            const box = el('div', `position:relative;${pad}`, b);
            txt(box, co.title ?? M('聊天记录', 'Chat history'), `font:700 ${f1(px(Z.msg * 0.88))}px/1.4 ${FONT};margin-bottom:${f1(px(8))}px`);
            (co.lines || []).forEach((ln) => txt(box, ln, `font:400 ${f1(px(Z.msg * 0.78))}px/1.5 ${FONT};color:${th.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`));
            foot(M('聊天记录', 'Chat history'));
          } else if (k === 'contact') {   // contact card
            const box = el('div', `position:relative;${pad};display:flex;align-items:center;gap:${f1(px(20))}px`, b);
            const av = el('div', `position:relative;width:${f1(px(96))}px;height:${f1(px(96))}px;border-radius:${f1(px(24))}px;background:${acc};color:${meInk};display:flex;align-items:center;justify-content:center;font:700 ${f1(px(44))}px/1 ${FONT};flex:none`, box); av.textContent = [...(co.name ?? '·')][0];
            const tc = el('div', 'position:relative', box); txt(tc, co.name ?? '', `font:700 ${f1(px(Z.msg))}px/1.3 ${FONT}`); if (co.sub) txt(tc, co.sub, `font:400 ${f1(px(Z.msg * 0.75))}px/1.4 ${FONT};color:${th.muted}`);
            if (co.url) foot(co.url);
          }
          it.texts = regs;
          it.info = { quote: 'quote', poem: 'quote', record: 'quote', list: 'flow', location: 'map', poll: 'chart' }[k] ?? null;
          if (it.info && window.EV && EV.info) EV.info(it.info, t, undefined, { visual: false, group: `chat-${T.title}-${t}` });   // an information card counts as one thing (whether it's on screen is decided by infoSource from real visibility)
          F.sfx(t, R.mine ? 'send' : 'receive', 0.35);
          return it;
        };
      };
      // ---------- Every frame: layout (measured heights stacked down), scrolling, entrance motion, push-in ----------
      F.prep(() => {
        // While measuring, the app and this chat must be shown (hidden elements measure 0)
        const rd = root.style.display; root.style.display = '';
        for (const T of A.threads) {
          const td = T.el.style.display; T.el.style.display = '';
          T.items.sort((a, b) => (a.at - (a.typing ? a.typing.dur : 0)) - (b.at - (b.typing ? b.typing.dur : 0)));
          for (const it of T.items) {
            // Row height = its tallest part (avatar, name + bubble, reactions under a card)
            const measure = (rowE) => { const d = rowE.style.display; rowE.style.display = ''; let hh = 0; for (const ch of rowE.children) hh = Math.max(hh, ch.offsetTop + ch.offsetHeight); rowE.style.display = d; return hh; };
            it.h = measure(it.el);
            // This message's horizontal centre (avatar + bubble): the push-in aims at it, not the whole app (otherwise the avatar gets pushed out of frame)
            { const d = it.el.style.display; it.el.style.display = ''; let l = 1e9, r = -1e9; for (const ch of it.el.children) { const rc = ch.getBoundingClientRect(); l = Math.min(l, rc.left); r = Math.max(r, rc.right); } const base = it.el.getBoundingClientRect().left; it.cx = (l + r) / 2 - base; it.el.style.display = d; }
            if (it.typing) it.typing.h = th.typing === false ? 0 : measure(it.typing.el);   // im: groups don't show "typing…" (the message just pops up a little later)
            it.a0 = it.at - (it.typing ? it.typing.dur : 0);
          }
          // Scroll target: after each event (appear, typing), the last message's bottom edge sits against the input field
          const viewH = VIEWH, padT = px(24), padB = px(24);
          const layout = (t) => { let y = padT; const out = []; for (const it of T.items) { if (t < it.a0) continue; const typ = it.typing && t < it.at, hh = typ ? it.typing.h : it.h; if (typ && !hh) continue; out.push({ it, y, typ }); y += hh + px(Z.gap); } return { out, H: y - px(Z.gap) + padB }; };
          T.layout = layout;
          const evs = [...new Set(T.items.flatMap((it) => (it.typing ? [it.a0, it.at] : [it.at])))].sort((a, b) => a - b);
          T.scrollEv = evs.map((e) => ({ t: e, s: Math.max(0, layout(e + 1e-4).H - viewH) }));
          // The farther the scroll, the longer it takes (a tall card arriving pushes the screen up by hundreds of px: 0.32 s is too fast)
          T.scrollEv.forEach((e, k) => { const d = Math.abs(e.s - (k ? T.scrollEv[k - 1].s : 0)); e.dur = clamp(0.32 + d / px(900), 0.32, 1.0); });
          T.el.style.display = td;
        }
        root.style.display = rd;
      });
      // Information picture: cards / images visible in the current chat at this moment (those scrolled off the top or in chats switched away don't count)
      if (window.EV && EV.infoSource) EV.infoSource((t) => { if (t < at || t >= until) return []; const { cur } = openAt(t); if (!cur || !cur.layout) return []; const L = cur.layout(t), s = scrollAt(cur, t), vh = VIEWH; return L.out.filter((x) => x.it.info && !x.typ && t >= x.it.at && x.y - s + x.it.h * 0.5 > 0 && x.y - s < vh).map((x) => x.it.info); });
      const scrollAt = (T, t) => { let prev = 0, cur = null; for (const e of T.scrollEv || []) { if (t < e.t) break; prev = cur ? cur.s : 0; cur = e; } if (!cur) return 0; return lerp(prev, cur.s, E.cubicInOut(seg(t, cur.t, cur.t + (cur.dur ?? 0.32)))); };
      F.add((t) => {
        const on = t >= at - 0.4 && t < A.until; show(root, on); if (!on) return;   // A.until can be set later (quick mode removes this scene's chat when the transition fully covers)
        const q = seg(t, at - 0.4, at, E.expoOut);
        // Push-in
        let z = 1, fx = 0, fy = 0, dimK = 0, focusIt = null;
        for (const f of A.focuses) {
          const k = Math.min(seg(t, f.a - 0.6, f.a + 0.3, E.sine), 1 - seg(t, f.b - 0.3, f.b + 0.6, E.sine));   // push in and pull back 0.9 s each, eased in and out
          if (k <= 0) continue;
          const T = f.m.T, L = T.layout ? T.layout(t) : null, pos = L && L.out.find((x) => x.it === f.m);
          if (!pos) continue;
          const s = scrollAt(T, t), cx = g.x + (f.m.cx ?? g.w / 2), cy = g.y + px(Z.head) - s + pos.y + f.m.h / 2;
          const zz = 1 + (f.zoom - 1) * k; z = zz;
          // After zooming, this message moves to the frame centre (landscape: slightly left of the window centre, leaving room for the left column)
          const tx = (PT || o.center ? W / 2 : W * 0.6), ty = H * (PT ? 0.45 : 0.47);
          fx = (tx - (g.x + (cx - g.x) * zz)) * k; fy = (ty - (g.y + (cy - g.y) * zz)) * k; dimK = k; focusIt = f.m;
        }
        set(root, { transform: `translate(${f1(fx)}px,${f1(fy + (1 - q) * px(60))}px) scale(${f3(z)})`, opacity: String(f3(q)) });
        const chromeK = clamp(1 - dimK * 2);   // title bar and input fade during the first half of the push-in (zoomed up they'd be pushed out of frame)
        set(head, { opacity: String(f3(chromeK)) }); set(comp, { opacity: String(f3(chromeK)) });
        // Current chat, switching
        const { cur, prev, tc } = openAt(t), sw = seg(t, tc, tc + 0.4, E.cubicInOut);
        for (const T of A.threads) {
          const isCur = T === cur, isPrev = T === prev && sw < 1 && tc > at;
          show(T.el, isCur || isPrev);
          if (!(isCur || isPrev)) continue;
          set(T.el, { transform: tc > at && sw < 1 ? `translateX(${f1((isCur ? 1 - sw : -sw * 0.3) * g.w)}px)` : '', opacity: isPrev ? String(f3(Math.max(0, 1 - sw * 2.5))) : '' });   // the outgoing one fades quickly (the new one covers it, so the two sets of text never overlap)
          const L = T.layout ? T.layout(t) : { out: [] }, s = scrollAt(T, t), vis = new Set(L.out.map((x) => x.it));
          for (const it of T.items) {
            if (!vis.has(it)) { show(it.el, false); if (it.typing) show(it.typing.el, false); continue; }
            const p = L.out.find((x) => x.it === it), y = p.y - s, rowEl = p.typ ? it.typing.el : it.el, other = p.typ ? it.el : it.typing && it.typing.el;
            if (other) show(other, false);
            const hh = p.typ ? it.typing.h : it.h, fade = clamp((y + hh) / px(60));   // scrolled off the top: slides away under the title bar (clipped), fading only over the last 60px — no blank gap left
            const vis2 = fade > 0.02; show(rowEl, vis2); if (!vis2) continue;
            const pop = p.typ ? seg(t, it.a0, it.a0 + 0.18, E.expoOut) : seg(t, it.at, it.at + 0.22, E.backOut);
            const dim = focusIt && focusIt !== it ? 1 - 0.9 * dimK : 1;
            set(rowEl, { transform: `translateY(${f1(y + (1 - pop) * px(26))}px)`, opacity: String(f3(fade * Math.min(1, pop * 1.4) * dim)) });
            if (p.typ) it.typing.dots.forEach((d, j) => set(d, { transform: `translateY(${f1(-px(6) * Math.max(0, Math.sin((t * 6 - j * 0.9) * Math.PI / 2)))}px)` }));
            if (it.lights) for (const Lg of it.lights) {
              if (Lg.reveal) set(Lg.el, { opacity: t >= Lg.at ? '1' : '0' });   // rows not yet due hold their place (transparent), so the card height stays the same
              else if (Lg.bar !== undefined) set(Lg.el, { width: `${f1(100 * Lg.bar * seg(t, Lg.at - 0.4, Lg.at, E.expoOut))}%` });
              else if (Lg.at !== null) set(Lg.el, { color: t >= Lg.at ? acc : th.ink, opacity: t >= Lg.at - 0.5 ? '1' : '0.55' });
            }
            if (it.reacts) for (const rc of it.reacts) { const on2 = t >= rc.at; show(rc.el, on2); if (on2) set(rc.el, { transform: `scale(${f3(1 + 0.25 * (1 - seg(t, rc.at, rc.at + 0.25, E.backOut)))})` }); }
            if (it.play) { const k2 = seg(t, it.play.a, it.play.b); it.play.bs.forEach((bb, j) => set(bb, { opacity: j / it.play.bs.length < k2 ? '1' : '0.45' })); }
            if (it.route) { const R2 = it.route, k3 = seg(frameT(t), R2.a, R2.b, E.cubicInOut); if (R2.k !== k3) { R2.k = k3; const c2 = R2.cv.getContext('2d'), w2 = R2.cv.width, h2 = R2.cv.height; c2.clearRect(0, 0, w2, h2); c2.strokeStyle = acc; c2.lineWidth = px(7); c2.setLineDash([px(16), px(12)]); c2.lineCap = 'round'; c2.beginPath(); const ax = R2.A[0] * w2, ay = R2.A[1] * h2, bx = R2.B[0] * w2, by = R2.B[1] * h2, mx = (ax + bx) / 2 + (by - ay) * 0.25, my = (ay + by) / 2 - (bx - ax) * 0.1; const N = 40; for (let i = 0; i <= Math.floor(N * k3); i++) { const s2 = i / N, x = (1 - s2) * (1 - s2) * ax + 2 * (1 - s2) * s2 * mx + s2 * s2 * bx, y2 = (1 - s2) * (1 - s2) * ay + 2 * (1 - s2) * s2 * my + s2 * s2 * by; if (!i) c2.moveTo(x, y2); else c2.lineTo(x, y2); } c2.stroke(); } }
          }
        }
        // The title bar follows the current chat
        // Title bar: the current chat's name; if renamed, at the rename moment the old name rises away and the new one drops in
        for (const ti of titles) {
          const mine = titles.filter((x) => x.T === ti.T), idx = mine.indexOf(ti), next = mine[idx + 1];
          const on2 = ti.T === cur && t >= ti.at - 0.28 && (!next || t < next.at - 0.32);   // a small gap between old and new names (never both visible in the same frame)
          set(ti.el, { display: on2 ? 'flex' : 'none' }); if (!on2) continue;
          const qin = ti.at > -1e8 ? seg(t, ti.at - 0.3, ti.at, E.expoOut) : 1, out = next ? seg(t, next.at - 0.5, next.at - 0.3, E.quartIn) : 0;
          const hot = ti.at > -1e8 ? 1 - seg(t, ti.at + 0.6, ti.at + 1.6) : 0;
          set(ti.el, { transform: `translateY(${f1((1 - qin) * px(40) - out * px(40))}px) scale(${f3(1 + 0.12 * hot * Math.sin(Math.PI * Math.min(1, (t - ti.at + 0.35) / 0.7)))})`, opacity: String(f3(qin * (1 - out))), color: hot > 0.5 ? acc : th.ink });
        }
        // Input field: while typing, text appears character by character
        let typed = '', active = false;
        for (const ty of A.types) if (t >= ty.a && t < ty.b) { active = true; typed = [...ty.text].slice(0, Math.ceil([...ty.text].length * seg(frameT(t), ty.a, ty.b - 0.1))).join(''); }
        fieldPre.textContent = typed; set(fieldPre, { color: th.ink }); show(caret, active);
        if (IM) { set(send, { display: active ? 'flex' : 'none' }); if (plus) show(plus, !active); if (emoji) set(emoji, { right: `${f1(active ? px(30) + sendW : px(36) + ic)}px` }); set(field, { right: `${f1(active ? px(46) + sendW + ic : px(52) + 2 * ic)}px` }); }   // the input field makes room accordingly
        if (!active) { fieldPre.textContent = opt.placeholder ?? ''; set(fieldPre, { color: th.muted }); }
      });
      return A;
    };

    // ---------- Aside card: left column in landscape, above the chat in portrait ----------
    C.aside = (layer, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, units = [...String(o.text ?? '')].reduce((n, c) => n + (/[^\x00-\xff]/.test(c) ? 1 : 0.55), 0);
      // Short ones (a line of verse, a name, ≤ 10 characters) go on one line: if they don't fit, shrink the text rather than let the last character drop to a second line
      let size = px(o.size ?? (PT ? 64 : 84)); const colW = PT ? W - px(80) : W * 0.32; if (units <= 10 && units * size > colW) size = Math.floor(colW / units);
      const wrap = el('div', PT ? `left:${f1(px(40))}px;right:${f1(px(40))}px;top:${f1(H * 0.085)}px;height:${f1(H * 0.075)}px;display:none;flex-direction:column;justify-content:center` : `left:${f1(W * 0.055)}px;width:${f1(W * 0.32)}px;top:${f1(H * (o.y ?? 0.46))}px;display:none;transform:translateY(-50%)`, layer);
      wrap.dataset.what = 'C.aside';
      const t1 = el('div', `position:relative;font:700 ${f1(size)}px/1.18 ${o.serif ? SERIF : FONT};color:${o.color ?? th.ink};${PT ? 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' : ''}`, wrap); t1.textContent = o.text ?? '';
      const t2 = o.sub ? el('div', `position:relative;margin-top:${f1(px(PT ? 6 : 18))}px;font:400 ${f1(px(PT ? 34 : 40))}px/1.4 ${FONT};color:${th.muted}`, wrap) : null; if (t2) t2.textContent = o.sub;
      if (o.text) F.text(t1, o.kind ?? 'headline', o.text, at - 0.4, until); if (t2) F.text(t2, 'label', o.sub, at - 0.4, until);
      F.prep(() => { const d = wrap.style.display; wrap.style.display = PT ? 'flex' : ''; wrap._h = wrap.offsetHeight; wrap.style.display = d; });
      F.add((t) => { const on = t >= at - 0.4 && t < until; set(wrap, { display: on ? (PT ? 'flex' : '') : 'none' }); if (!on) return; const q = seg(t, at - 0.4, at, E.expoOut), out = until < 1e8 ? seg(t, until - 0.3, until, E.quartIn) : 0; set(wrap, { opacity: String(f3(q * (1 - out))), transform: `${PT ? '' : 'translateY(-50%) '}translateY(${f1((1 - q) * px(30) - out * px(20))}px)` }); });
      return { el: wrap };
    };

    // ---------- Transition: a board matching the background pushes in from the right to cover, then pushes off left ----------
    let wipeLayer = null;
    C.wipe = (o) => {
      wipeLayer ??= F.layer('pointer-events:none', 90);
      const at = o.at, dur = o.dur ?? 0.6, half = dur / 2, box = el('div', `left:0;top:0;width:${f1(W)}px;height:${f1(H)}px;background:${o.color ?? th.bg};display:none;box-shadow:0 0 ${f1(px(60))}px ${th.shadow}`, wipeLayer);
      box.dataset.motion = 'skip';
      F.cut(at); F.transition(at - half, at + half); F.sfx(at - half, 'swipe', 0.4, { dur });
      F.add((t) => { const on = t >= at - half && t < at + half; show(box, on); if (!on) return; const q = t < at ? E.cubicInOut(seg(t, at - half, at - 0.03)) : 0; set(box, { transform: `translateX(${f1(t < at ? (1 - q) * W : -seg(t, at, at + half, E.cubicInOut) * W)}px)` }); });
      return at;
    };

    // ---------- End card: a name card ----------
    C.endcard = (layer, o) => {
      const at = o.at, cw = Math.min(W * 0.86, px(PT ? 900 : 1100)), cx = W / 2, cy = H * (PT ? 0.42 : 0.46);
      const card = el('div', `left:${f1(cx - cw / 2)}px;top:${f1(cy)}px;width:${f1(cw)}px;transform:translateY(-50%);display:none;border-radius:${f1(px(40))}px;background:${th.card};box-shadow:0 ${f1(px(40))}px ${f1(px(100))}px ${th.shadow}, 0 0 0 1px ${th.line};padding:${f1(px(56))}px ${f1(px(56))}px;box-sizing:border-box;text-align:center`, layer);
      card.dataset.what = 'C.endcard';
      const av = el('div', `position:relative;margin:0 auto ${f1(px(26))}px;width:${f1(px(150))}px;height:${f1(px(150))}px;border-radius:${f1(px(38))}px;background:${acc};color:${meInk};display:flex;align-items:center;justify-content:center;font:700 ${f1(px(72))}px/1 ${FONT}`, card); av.textContent = [...(o.mark ?? o.title ?? '·')][0];
      const t1 = el('div', `position:relative;font:700 ${f1(px(PT ? 84 : 96))}px/1.2 ${o.serif ? SERIF : FONT};color:${th.ink}`, card); t1.textContent = o.title ?? '';
      F.text(t1, 'logo', o.title ?? '', at, 1e9);
      if (o.sub) { const t2 = el('div', `position:relative;margin-top:${f1(px(16))}px;font:400 ${f1(px(PT ? 46 : 48))}px/1.45 ${FONT};color:${th.muted}`, card); t2.textContent = o.sub; F.text(t2, 'endcard', o.sub, at, 1e9); }
      if (o.url) { const t3 = el('div', `position:relative;display:inline-block;margin-top:${f1(px(30))}px;padding:${f1(px(16))}px ${f1(px(40))}px;border-radius:${f1(px(60))}px;background:${acc};color:${meInk};font:700 ${f1(px(56))}px/1.2 ${FONT}`, card); t3.textContent = o.url; F.text(t3, 'endcard', o.url, at, 1e9); }
      F.sfx(at + 0.2, 'logo', 1);
      F.add((t) => { const on = t >= at; show(card, on); if (!on) return; const q = seg(t, at, at + 0.5, E.backOut); set(card, { transform: `translateY(-50%) translateY(${f1((1 - q) * px(80))}px) scale(${f3(0.94 + 0.06 * q)})`, opacity: String(f3(Math.min(1, q * 1.5))) }); });
    };
    return C;
  };
  P.chat.THEMES = THEMES;
  P.chat.portrait = portraitSVG;   // draw a single avatar (to preview, or for a cast overview): PROMO.chat.portrait(look, groundColour) → svg string
})();
