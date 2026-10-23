// pixel.js: the pixel style (one of bb-video's visual styles; style notes in styles/pixel/STYLE.md). Load after promo.js.
// A frame: a low-resolution game screen scaled up to fill the frame — every "pixel" is a crisp little square (4 px per cell at 1080p, 480×270 cells in landscape).
// Dithered (checkerboard) sky gradients, layered parallax hills / cities, grass; outlined little figures (a fixed cast sheet) walk, jump, talk, fight;
// game UI carries the information: dialog boxes type out letter by letter, a menu's ▶ cursor, health bars fill cell by cell, scores count up, a level map hops dot by dot;
// transitions are block dissolves / iris closes / staircase fills. Motion steps cell by cell (positions snap to the pixel grid, animation at 8 fps) — no scaling, no rotation, no blur.
// All text is DOM (pixel font Fusion Pixel, OFL), so the automatic checks work as usual.
//
//   const X = PROMO.pixel(F, { palette: 'night' | 'day' | 'gameboy', colors, unit })
//   X.scene(a, z, { kind, variant, drift })  one scene: layer + background, shown only in [a, z) → layer (layer.floor = ground y)
//   X.bg(layer, { kind: 'night' | 'day' | 'room' | 'space' | 'cave' | 'plain', variant, drift })   background → { el, floor }
//   X.item(parent, { art, x, y, scale, at, until, enter: 'pop' | 'drop' | 'none', bob, spin }) prop (coin, heart, star, chest, computer …); art can also be your own character rows
//   X.cast({ name: { hair, hairColor, skin, shirt, pants, hat, glasses, beard } })   cast sheet: fix every character at the start of a film
//   X.char(parent, { who, x, y, at, until, face, enter: 'walk' | 'drop' | 'none', from, scale, tag }) → h
//     h.walk(at, x) | h.jump(at) | h.say(at, text, { until }) | h.emote(at, '!' | '?' | '♥' | '…') | h.attack(at, opponent) | h.hurt(at, fromSide)
//     h.cheer(at, dur) | h.ko(at) | h.faceTo(at, opponent | 'left' | 'right')
//   X.title(parent, { text, x, y, size, color, at, until })     big title: letters drop in one by one, pixel outline + hard shadow
//   X.text(parent, { text, x, y, size, color, align, maxW, at, until, type })  small text (type: true = typed out letter by letter)
//   X.dialog(parent, { text, who, x, y, w, at, until })          dialog box: a game text box, name tab at top left, text types out, ▼ blinks when done
//   X.menu(parent, { items, x, y, w, at, until, picks: [{ at, index }] }) menu: the ▶ cursor moves item by item, the picked item changes colour
//   X.bar(parent, { label, value, max, x, y, w, color, at, until, unit })   health / progress bar: fills cell by cell, number on the right
//   X.number(parent, { value, x, y, size, color, prefix, unit, at, until }) score: monospaced digits counting up
//   X.window(parent, { x, y, w, h, title, at, until }) → { el, inner, box }   pixel window (title bar + three dots)
//   X.shot(parent, { src, x, y, w, h, title, at, until, fit, mosaic }) screenshot inside a pixel window: mosaic first, sharpening step by step, ending on the original image
//   X.burst(parent, { x, y, at, colors, n }) | X.pickup(at, prop, { text })   block particles burst; a prop gets collected (hops up, a +1 floats up)
//   X.wipe({ at, kind: 'blocks' | 'iris' | 'stairs' | 'bars', from: [x, y], color, dur }) → moment of full cover
//   X.stage(parent, { text, sub, at, until })                    level card ("Level 2")
//   X.endcard(parent, { at, title, sub, url, char })             end card
//
// Timing: at = settled (readable, on the beat); until = fully gone. Coordinates: x, y are the centre (for characters, the midpoint of the feet), in frame px; size is the design size (1080p).
(function () {
  const P = window.PROMO;
  if (!P) throw new Error('pixel.js 要在 promo.js 之后加载');
  const { clamp, lerp } = window.EV;
  const { E, seg, set, el } = P;
  const f1 = (n) => Math.round(n * 10) / 10;
  const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rnd = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const rgbOf = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hexOf = (r) => '#' + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const shade = (c, k) => { const r = rgbOf(c); return r ? hexOf(r.map((v) => v * k)) : c; };
  const lum = (c) => { const r = rgbOf(c) || [0, 0, 0]; return (0.299 * r[0] + 0.587 * r[1] + 0.114 * r[2]) / 255; };
  // In the pixel font ’ “ ” are full-width glyphs (can’t becomes "can’ t"): swap Latin quotes on screen for straight quotes
  const plain = (s) => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

  // ---------- palette: letter → colour (for drawing props and characters) ----------
  // k outline / x black / w white / W highlight / l e E three greys / r R red / o orange / y Y yellow / g G green / c C cyan / b B blue / p P purple / s S skin / n N brown / a accent (brand colour)
  const NIGHT = {
    bg: '#14142B', bg2: '#232347', bg3: '#3A3A6E', text: '#F4F1E8', box: '#1A1A36',
    k: '#0B0B16', x: '#000000', w: '#F4F1E8', W: '#FFFFFF', l: '#C9CCE0', e: '#8A8FB0', E: '#4A4E6E',
    r: '#FF4D6D', R: '#B8233F', o: '#FF9F43', y: '#FFD93D', Y: '#D99A00', g: '#5AD46B', G: '#2A8C4A',
    c: '#3EC1D3', C: '#1F7F99', b: '#3A6FF2', B: '#23408F', p: '#9B5DE5', P: '#5E3399', s: '#F7C59F', S: '#D9926B', n: '#A0663B', N: '#6B3F22',
  };
  const PALETTES = {
    night: NIGHT,
    day: { ...NIGHT, bg: '#7CC8F2', bg2: '#A8DCF7', bg3: '#D6F0FF', text: '#14142B' },
    // The handheld's four greens: every colour falls into one of four levels by lightness (brand colour too)
    gameboy: (() => { const G4 = ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'], o = {}; for (const [k, v] of Object.entries(NIGHT)) o[k] = G4[Math.min(3, Math.floor(lum(v) * 4))]; return { ...o, bg: G4[3], bg2: G4[2], bg3: G4[2], text: G4[0], box: G4[0], k: G4[0], w: G4[3] }; })(),
  };

  // ---------- props: character rows (fill colours only; the outline is added automatically) ----------
  const ART = {
    coin: ['.yyyy.', 'yWyyyY', 'yWyYyY', 'yyyYyY', 'yyyYyY', 'yyyyyY', '.YYYY.'],
    heart: ['.rr.rr.', 'rWrrrrr', 'rWrrrrR', 'rrrrrrR', '.rrrrR.', '..rrR..', '...R...'],
    star: ['....y....', '...yyy...', 'yyyyWyyyy', '.yyyWyyy.', '..yyyyy..', '.yyyyyyy.', '.yyY.Yyy.', 'yY.....Yy'],
    gem: ['.cccccc.', 'cWWcccCc', 'cWccccCC', '.cccccC.', '..cccC..', '...cC...'],
    key: ['.yyy.......', 'yY.yyyyyyyy', 'yY.yY.Y.Y.Y', '.yyy.......'],
    chest: ['.nnnnnnnn.', 'nNNNNNNNNn', 'nnnnnnnnnn', 'yyyyYyyyyy', 'nnnnyynnnn', 'nnnnYYnnnn', 'nnnnnnnnnn', 'NNNNNNNNNN'],
    flag: ['erraaaa', 'eraaaa.', 'eraaaa.', 'eraaa..', 'e......', 'e......', 'e......', 'e......', 'e......'],
    sword: ['......W', '.....Wl', '....Wl.', '...Wl..', 'y.Wl...', '.yl....', '.ny....', 'n..y...'],
    shield: ['bbbbbbbb', 'bWyyyybB', 'bWyyyybB', 'bbyyyybB', 'bbbyybbB', '.bbbbbB.', '..bbbB..', '...BB...'],
    potion: ['..nn..', '..ll..', '.lppl.', 'lpWppl', 'lpWppP', 'lppppP', '.PPPP.'],
    bolt: ['...yy', '..yy.', '.yyy.', 'yyyyy', '..yy.', '.yy..', '.y...'],
    trophy: ['yyyyyyy', 'yWyyyyY', '.yWyyY.', '.yyyyY.', '..yyY..', '...Y...', '..yyY..', '.YYYYY.'],
    crown: ['y..y..y', 'yy.y.yy', 'yyyyyyy', 'yryycyy', 'YYYYYYY'],
    rocket: ['...w...', '..wWw..', '..wcw..', '..www..', '.rwwwr.', '.rwwwr.', 'rr.o.rr', '...y...'],
    monitor: ['eeeeeeeeee', 'ecccccccCe', 'ecWccccCCe', 'eccccccCCe', 'eCCCCCCCCe', 'eeeeeeeeee', '....ee....', '..eeeeee..'],
    phone: ['EEEEE', 'EcccE', 'EcWcE', 'EcccE', 'EcccE', 'EcCcE', 'EEwEE'],
    book: ['.rrrrrrr', 'rrWrrrrR', 'rrWrrrrR', 'rrrrrrrR', 'rrrrrrrR', 'wwwwwwwR', 'RRRRRRRR'],
    bulb: ['.yyyy.', 'yWyyyy', 'yWyyyY', 'yyyyyY', '.yyyY.', '..ll..', '..ee..', '..ll..'],
    gear: ['..e.e..', '.eeeee.', 'eelllee', '.el.le.', 'eelllee', '.eeeee.', '..e.e..'],
    clock: ['.wwwww.', 'wwwkwwW', 'wwwkwwW', 'wwwkkwW', 'wwwwwwW', 'wwwwwwW', '.WWWWW.'],
    mail: ['wwwwwwwww', 'wlwwwwwlw', 'wwlwwwlww', 'wwwlwlwww', 'wwwwlwwww', 'wwwwwwwww', 'lllllllll'],
    lock: ['..eee..', '.e...e.', '.e...e.', 'yyyyyyy', 'yWyyyyY', 'yyyNyyY', 'yyyNyyY', 'YYYYYYY'],
    bug: ['.k...k.', '..k.k..', '.rrrrr.', 'rrkrkrr', 'rrrrrrr', 'rkrrrkr', '.rrrrr.', 'k.k.k.k'],
    slime: ['...gg...', '..gggg..', '.gWgggg.', 'ggWkgkgg', 'gggggggg', 'GGGGGGGG'],
    ghost: ['..www..', '.wwwww.', 'wwkwkww', 'wwwwwww', 'wwwwwww', 'wwwwwww', 'w.w.w.w'],
    robot: ['...r...', '.eeeee.', '.eceece', '.eeeee.', 'eelllee', 'e.lll.e', '..l.l..', '.ee.ee.'],
    cat: ['n...n..', 'nn.nn..', 'nnnnn..', 'nknkn..', 'nnnnnnn', '.nnnnnn', '.n.n.nn'],
    server: ['EEEEEEE', 'EgElllE', 'EEEEEEE', 'EgElllE', 'EEEEEEE', 'EyElllE', 'EEEEEEE'],
    chart: ['.......y', '.....r.y', '.....r.y', '...c.r.y', '...c.r.y', '.b.c.r.y', '.b.c.r.y', 'eeeeeeee'],
    tree: ['..ggg..', '.gggGg.', 'gggggGg', 'gWggGgg', '.ggggG.', '..GnG..', '...n...', '...n...'],
    house: ['...r....', '..rrr...', '.rrrrr..', 'rrrrrrr.', '.wwwww..', '.wnwcw..', '.wnwww..'],
    cloud: ['...www....', '.wwwwwww..', 'wwwwwwwwww', '.llllllll.'],
    fire: ['...o...', '..ooy..', '.oyyo..', '.oyWyo.', 'ooyyyoo', '.ooyoo.'],
    mushroomtree: null,
  };
  delete ART.mushroomtree;
  // character rows → grid (one spare cell all round for the outline), then outline
  const gridOf = (rows, outline = true) => {
    const h = rows.length + 2, w = Math.max(...rows.map((r) => r.length)) + 2, g = Array.from({ length: h }, () => new Array(w).fill(null));
    rows.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.' && c !== ' ') g[y + 1][x + 1] = c; }));
    return outline ? outlined(g) : g;
  };
  // outline: a transparent cell next to a coloured cell (up/down/left/right) is painted k
  const outlined = (g, key = 'k') => {
    const h = g.length, w = g[0].length, o = g.map((r) => r.slice());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!g[y][x] && ((y > 0 && g[y - 1][x] && g[y - 1][x] !== key) || (y < h - 1 && g[y + 1][x] && g[y + 1][x] !== key) || (x > 0 && g[y][x - 1] && g[y][x - 1] !== key) || (x < w - 1 && g[y][x + 1] && g[y][x + 1] !== key))) o[y][x] = key;
    return o;
  };

  // ---------- characters: 16 × 24-cell figures, drawn on the fly from look and pose (drawn facing right; flipped whole when facing left) ----------
  // walking: steady pace, slowing to a stop over the last fifth (no sudden brake)
  const walkEase = (q) => (q < 0.8 ? q / 0.9 : 1 - (1 - q) * (1 - q) / 0.36);
  const CW = 20, CH = 25, OX = 2, FEET = 23;   // grid has two spare cells each side so waves and punches stay inside; nothing below row 23 (feet = top edge of row 23)
  const HAIRS = ['short', 'long', 'spiky', 'bun', 'ponytail', 'curly', 'bald'];
  function drawChar(look, pose, frame) {
    const g = Array.from({ length: CH }, () => new Array(CW).fill(null));
    const put = (x, y, c) => { x += OX; if (x >= 0 && x < CW && y >= 0 && y < CH) g[y][x] = c; };
    const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
    const skin = look.skin, hairC = look.hairColor, shirt = look.shirt, shirtD = shade(shirt, 0.72), pants = look.pants, shoe = '#3A2414';
    const bob = (pose === 'idle' && frame === 1) || (pose === 'walk' && frame === 1) || (pose === 'cheer' && frame === 1) ? 1 : 0;   // the rise and fall of breathing / walking
    const hy = 3 + bob;   // top of the head
    // legs and shoes
    if (pose === 'jump') { rect(5, 18, 2, 2, pants); rect(8, 18, 2, 2, pants); rect(4, 20, 3, 1, shoe); rect(8, 20, 3, 1, shoe); }
    else if (pose === 'walk' && frame === 0) { rect(4, 18, 2, 3, pants); rect(9, 18, 2, 3, pants); rect(3, 21, 3, 1, shoe); rect(9, 21, 3, 1, shoe); }
    else { rect(5, 18, 2, 3, pants); rect(8, 18, 2, 3, pants); rect(4, 21, 3, 1, shoe); rect(8, 21, 3, 1, shoe); }
    // body (clothes) + belt
    rect(4, 12 + bob, 7, 6 - bob, shirt); rect(4, 17, 7, 1, shirtD);
    // arms: the back one a bit darker
    const arm = (x, y, len, c) => { rect(x, y, 1, len, c); put(x, y + len, skin); };
    if (pose === 'cheer') { rect(3, 8 + bob, 1, 4, shirtD); put(3, 7 + bob, skin); rect(11, 8 + bob, 1, 4, shirt); put(11, 7 + bob, skin); }
    else if (pose === 'jump') { rect(3, 10, 1, 3, shirtD); put(3, 9, skin); rect(11, 10, 1, 3, shirt); put(11, 9, skin); }
    else if (pose === 'attack') { arm(3, 13, 3, shirtD); rect(11, 13, 3, 1, shirt); put(14, 13, skin); if (look.tool !== 'none') { rect(15, 13, 1, 1, '#6B3F22'); for (let i = 0; i < 4; i++) put(16 + i, 12 - i, '#E8ECF8'); } }
    else if (pose === 'walk' && frame === 0) { arm(3, 13, 3, shirtD); rect(11, 13, 2, 1, shirt); put(12, 14, shirt); put(12, 15, skin); }
    else { arm(3, 12 + bob, 3, shirtD); arm(11, 12 + bob, 3, shirt); }
    // head: 8 × 8, corners slightly rounded
    rect(4, hy + 1, 8, 8, skin); put(4, hy + 1, null); put(11, hy + 1, null); put(4, hy + 8, null); put(11, hy + 8, null);
    // hair
    const hair = look.hair;
    if (hair !== 'bald') {
      rect(4, hy, 8, 2, hairC); put(4, hy, null); put(11, hy, null); rect(4, hy + 2, 2, 3, hairC); rect(6, hy + 2, 3, 1, hairC);
      if (hair === 'spiky') { put(5, hy - 1, hairC); put(7, hy - 1, hairC); put(9, hy - 1, hairC); put(6, hy - 2, hairC); put(10, hy - 2, hairC); }
      if (hair === 'long') { rect(3, hy + 2, 2, 8, hairC); put(4, hy + 10, hairC); }
      if (hair === 'bun') { rect(5, hy - 2, 3, 2, hairC); put(6, hy - 3, hairC); }
      if (hair === 'ponytail') { rect(2, hy + 3, 2, 2, hairC); rect(1, hy + 5, 2, 3, hairC); }
      if (hair === 'curly') { rect(3, hy - 1, 10, 2, hairC); rect(3, hy + 1, 2, 5, hairC); put(12, hy + 1, hairC); put(3, hy - 1, null); put(12, hy - 1, null); }
    }
    // hat
    const hat = look.hat;
    if (hat === 'cap') { rect(4, hy - 1, 8, 2, look.hatColor); rect(10, hy + 1, 4, 1, look.hatColor); }
    if (hat === 'crown') { rect(5, hy - 1, 6, 1, '#FFD93D'); put(5, hy - 2, '#FFD93D'); put(8, hy - 2, '#FFD93D'); put(10, hy - 2, '#FFD93D'); put(7, hy - 1, '#FF4D6D'); }
    if (hat === 'wizard') { rect(3, hy, 10, 1, look.hatColor); rect(5, hy - 1, 6, 1, look.hatColor); rect(6, hy - 2, 4, 1, look.hatColor); rect(8, hy - 3, 2, 1, look.hatColor); put(7, hy - 1, '#FFD93D'); }
    if (hat === 'helmet') { rect(4, hy - 1, 8, 3, '#8A8FB0'); rect(4, hy + 2, 1, 4, '#8A8FB0'); put(7, hy - 1, '#C9CCE0'); }
    if (hat === 'band') rect(4, hy + 2, 8, 1, look.hatColor);
    // face: three-quarter view facing right — both eyes shifted right
    const ey = hy + 4, hurt = pose === 'hurt' || pose === 'ko';
    if (hurt) { put(7, ey, '#0B0B16'); put(8, ey + 1, '#0B0B16'); put(10, ey, '#0B0B16'); put(9, ey + 1, '#0B0B16'); }
    else if (look.glasses) { rect(6, ey, 6, 1, '#0B0B16'); put(7, ey + 1, '#0B0B16'); put(10, ey + 1, '#0B0B16'); put(7, ey, '#C9F0FF'); put(10, ey, '#C9F0FF'); }
    else { rect(7, ey, 1, 2, '#0B0B16'); rect(10, ey, 1, 2, '#0B0B16'); }
    if (look.beard) { rect(6, hy + 7, 6, 2, hairC); put(4 + 2, hy + 6, hairC); put(11, hy + 6, hairC); }
    if ((pose === 'talk' && frame === 1) || pose === 'cheer' || pose === 'attack') rect(9, hy + 7, 2, 1, '#B8233F');
    else if (!look.beard) put(9, hy + 7, shade(skin, 0.7));
    return outlined(g);
  }

  // draw onto a canvas (1 cell = 1 px, scaled up by CSS without interpolation)
  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.style.cssText = 'position:absolute;left:0;top:0;image-rendering:pixelated;image-rendering:crisp-edges;width:100%;height:100%'; return c; };
  const paint = (cv, g, pal, mono) => { const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height); for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) { const k = g[y][x]; if (!k) continue; ctx.fillStyle = mono ?? (k[0] === '#' ? k : pal[k] ?? k); ctx.fillRect(x, y, 1, 1); } };

  // sizes are measured in prep (after fonts load); shown temporarily while measuring — a display:none element measures 0
  const measure = (e) => { const d = e.style.display; e.style.display = ''; e._w = e.offsetWidth; e._h = e.offsetHeight; e.style.display = d; };

  P.pixel = function (F, opt = {}) {
    const X = { F }, PT = F.portrait, W = F.W, H = F.H;
    const U = F.px(opt.unit ?? 4);                       // one cell on screen
    const LW = Math.ceil(W / U), LH = Math.ceil(H / U);   // cell count of the low-resolution frame
    const pal = { ...(PALETTES[opt.palette ?? 'night'] || PALETTES.night) };
    pal.a = pal.r;
    Object.assign(pal, opt.colors || {});
    X.colors = pal; X.U = U; X.palette = opt.palette ?? 'night';
    const C = (c, d) => (c ? pal[c] ?? c : d);
    const snap = (v) => Math.round(v / U) * U;
    const FONT = opt.font ?? '"Fusion Pixel 12px Proportional SC", "Fusion Pixel 12px Monospaced SC", monospace';
    const MONO = opt.mono ?? '"Fusion Pixel 12px Monospaced SC", "Fusion Pixel 12px Proportional SC", monospace';
    X.font = FONT; X.mono = MONO;
    // snap font size to multiples of 12 (the pixel font's native size is 12 px: at whole multiples every stroke lands on whole pixels)
    const fs = (size) => F.px(Math.max(24, Math.round(size / 12) * 12));
    F.stage.style.webkitFontSmoothing = 'none'; F.stage.style.fontSmooth = 'never';
    // pixel outline + hard shadow to the lower right (no blur): text reads on any background
    const outlineShadow = (c, s = U) => { const sh = []; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) sh.push(`${f1(dx * s)}px ${f1(dy * s)}px 0 ${c}`); sh.push(`${f1(2 * s)}px ${f1(2 * s)}px 0 ${c}`); return sh.join(','); };
    const show = (e, on) => set(e, { display: on ? '' : 'none' });

    // ---------- background ----------
    // dithered gradient: a checkerboard between two colours (pixel-art gradient)
    // several colours stacked as bands top to bottom; neighbouring bands blend with 4×4 ordered dithering (pixel-art gradient, not a smooth one)
    const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    const bands = (ctx, stops, y0, y1, n = 6) => {
      const rgb = stops.map(rgbOf), cols = Array.from({ length: n }, (_, i) => { const q = (i / (n - 1)) * (rgb.length - 1), j = Math.min(rgb.length - 2, Math.floor(q)), f = q - j; return hexOf(rgb[j].map((v, k) => v + (rgb[j + 1][k] - v) * f)); });
      const hh = (y1 - y0) / n, Z = Math.max(2, Math.min(8, Math.floor(hh / 3)));
      for (let i = 0; i < n; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(0, Math.round(y0 + i * hh), LW * 2, Math.ceil(hh) + 1); }
      for (let i = 1; i < n; i++) { const yb = Math.round(y0 + i * hh); ctx.fillStyle = cols[i]; for (let y = yb - Z; y < yb; y++) { const f = (y - (yb - Z) + 1) / (Z + 1); for (let x = 0; x < LW * 2; x++) if (BAYER[y & 3][x & 3] < f * 16) ctx.fillRect(x, y, 1, 1); } }
    };
    // a ridge line (wraps end to end: 2 × LW wide, so it can loop)
    const ridge = (ctx, r, base, amp, rough, col, period) => {
      ctx.fillStyle = col; const ph = r() * 10, ph2 = r() * 10;
      for (let x = 0; x < LW * 2; x++) { const q = (x / period) * Math.PI * 2, y = Math.round(base - amp * (0.6 * Math.sin(q + ph) + 0.4 * Math.sin(q * 2.3 + ph2)) - (rough ? (Math.floor(x / 3) * 7) % 3 : 0)); ctx.fillRect(x, y, 1, LH - y); }
    };
    const blob = (ctx, x, y, rows, col) => { ctx.fillStyle = col; rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') ctx.fillRect(x + i, y + j, 1, 1); }); };
    const CLOUD = ['....wwww......', '..wwwwwwww.ww.', '.wwwwwwwwwwwww', 'wwwwwwwwwwwwww', '.llllllllllll.'];
    X.bg = (layer, o = {}) => {
      const kind = o.kind ?? (X.palette === 'day' ? 'day' : 'night'), v = o.variant ?? 0, r = rnd(hashStr(kind + v + (o.seed ?? '')));
      const wrap = el('div', `inset:0;overflow:hidden;background:${pal.bg}`, layer);
      wrap.dataset.what = 'X.bg';
      const floorK = PT ? 0.7 : 0.84, floorL = Math.round(LH * floorK);   // ground (where characters stand): raised in portrait to clear the bottom 22 % platform-UI zone
      const ground = kind === 'day' || kind === 'room' || kind === 'cave' || (kind === 'night' && v !== 2);
      // parallax layers: each is a canvas 2 × LW wide (two copies end to end); on drift they move whole cells by depth
      const layers = [];
      const mk = (depth, draw, z) => { const box = el('div', `left:0;top:0;width:${f1(LW * 2 * U)}px;height:${f1(LH * U)}px;${z ? `z-index:${z};` : ''}`, wrap); box.dataset.motion = 'skip'; const cv = canvasOf(LW * 2, LH); box.appendChild(cv); const ctx = cv.getContext('2d'); draw(ctx); if (depth) { ctx.clearRect(LW, 0, LW, LH); ctx.drawImage(cv, 0, 0, LW, LH, LW, 0, LW, LH); } layers.push({ box, depth }); return ctx; };   // moving layers: the second half copies the first, so the loop joins up
      const sky = kind === 'day' ? [pal.bg3, pal.bg2, pal.bg] .reverse() : kind === 'space' ? [pal.x, pal.bg, pal.bg] : kind === 'cave' ? [pal.k, pal.bg] : kind === 'room' ? [pal.bg2, pal.bg2] : [pal.bg, pal.bg2, pal.bg3];
      mk(0, (ctx) => {
        bands(ctx, sky, 0, ground ? floorL : LH);
        if (kind === 'night' || kind === 'space') { for (let i = 0; i < (kind === 'space' ? 220 : 120); i++) { ctx.fillStyle = r() < 0.2 ? pal.y : r() < 0.5 ? pal.l : pal.e; ctx.fillRect(Math.floor(r() * LW * 2), Math.floor(r() * (ground ? floorL * 0.8 : LH)), 1, 1); } }
        // moon (top right in portrait, out of the title's way)
        if (kind === 'night' && v !== 3) { const mx = Math.round(LW * (PT ? 0.8 : 0.8)), my = Math.round(LH * (PT ? 0.07 : 0.16)), R0 = PT ? 12 : 14; ctx.fillStyle = '#FFF4C9'; for (let y = -R0; y <= R0; y++) for (let x = -R0; x <= R0; x++) if (x * x + y * y <= R0 * R0 && (x + 6) * (x + 6) + (y - 3) * (y - 3) > R0 * R0 * 0.7) { ctx.fillRect(mx + x, my + y, 1, 1); ctx.fillRect(mx + x + LW, my + y, 1, 1); } }
        if (kind === 'space') { const px = Math.round(LW * 0.25), py = Math.round(LH * 0.3), R0 = 26; for (let y = -R0; y <= R0; y++) for (let x = -R0; x <= R0; x++) if (x * x + y * y <= R0 * R0) { ctx.fillStyle = (x + y + 30) % 9 < 4 ? pal.p : pal.P; ctx.fillRect(px + x, py + y, 1, 1); ctx.fillRect(px + x + LW, py + y, 1, 1); } ctx.fillStyle = pal.y; for (let x = -44; x <= 44; x++) { const y = Math.round(x * 0.22); if (Math.abs(x) > 20 || y > 3) { ctx.fillRect(px + x, py + y, 1, 1); ctx.fillRect(px + x + LW, py + y, 1, 1); } } }
        if (kind === 'room') {   // wallpaper stripes, skirting board, a window
          ctx.fillStyle = shade(pal.bg2, 0.88); for (let x = 0; x < LW * 2; x += 12) ctx.fillRect(x, 0, 2, floorL);
          ctx.fillStyle = pal.k; ctx.fillRect(0, floorL - 4, LW * 2, 4);
          // window at top left, colours darkened (outside at night): the background doesn't compete with the title or content
          const wx = Math.round(LW * 0.05), wy = Math.round(LH * 0.1), ww = PT ? 44 : 52, wh = PT ? 56 : 44;
          ctx.fillStyle = pal.k; ctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6); ctx.fillStyle = pal.n; ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4); ctx.fillStyle = pal.bg; ctx.fillRect(wx, wy, ww, wh);
          ctx.fillStyle = pal.l; [[6, 8], [20, 14], [34, 6], [12, 30], [40, 26]].forEach(([dx, dy]) => { if (dx < ww - 2 && dy < wh - 2) ctx.fillRect(wx + dx, wy + dy, 1, 1); }); ctx.fillStyle = '#FFF4C9'; ctx.fillRect(wx + ww - 14, wy + 5, 6, 6);
          ctx.fillStyle = pal.n; ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh); ctx.fillRect(wx, wy + wh / 2 - 1, ww, 2); ctx.fillStyle = pal.N; ctx.fillRect(wx - 4, wy + wh + 2, ww + 8, 3);
        }
        if (kind === 'cave') { for (let y = 0; y < floorL; y += 8) for (let x = ((y / 8) % 2) * 8; x < LW * 2; x += 16) { ctx.fillStyle = pal.E; ctx.fillRect(x, y, 15, 7); ctx.fillStyle = shade(pal.E, 1.25); ctx.fillRect(x, y, 15, 1); } }
        if (kind === 'plain') { ctx.fillStyle = shade(pal.bg, X.palette === 'day' ? 0.9 : 1.6); for (let y = 6; y < LH; y += 12) for (let x = 6; x < LW * 2; x += 12) ctx.fillRect(x, y, 1, 1); }
      });
      // far distance: hills / city / clouds (parallax)
      if (kind === 'day' && v !== 1) mk(0.15, (ctx) => ridge(ctx, r, floorL - 26, 14, false, '#9FD6A6', LW / 2));
      if (kind === 'day') mk(0.3, (ctx) => { for (let i = 0; i < 6; i++) { const x = Math.floor(r() * LW), y = Math.floor(r() * floorL * 0.45) + 6; blob(ctx, x, y, CLOUD, pal.w); blob(ctx, x + LW, y, CLOUD, pal.w); } });
      if (kind === 'day' && v !== 1) mk(0.5, (ctx) => ridge(ctx, r, floorL - 8, 7, false, pal.g, LW / 3));
      if (kind === 'night' && v === 0) { mk(0.15, (ctx) => ridge(ctx, r, floorL - 30, 16, true, pal.E, LW / 2)); mk(0.4, (ctx) => ridge(ctx, r, floorL - 10, 8, false, shade(pal.E, 0.7), LW / 3)); }
      if (kind === 'night' && v === 1) mk(0.35, (ctx) => {   // city: a row of buildings with lit windows
        let x = 0; while (x < LW * 2) { const bw = 10 + Math.floor(r() * 14), bh = 20 + Math.floor(r() * (floorL * 0.45)); ctx.fillStyle = shade(pal.E, 0.75); ctx.fillRect(x, floorL - bh, bw, bh); ctx.fillStyle = pal.y; for (let yy = floorL - bh + 3; yy < floorL - 3; yy += 4) for (let xx = x + 2; xx < x + bw - 2; xx += 3) if (r() < 0.35) ctx.fillRect(xx, yy, 1, 2); x += bw + 1 + Math.floor(r() * 3); }
      });
      if (kind === 'space') mk(0.6, (ctx) => { for (let i = 0; i < 40; i++) { ctx.fillStyle = pal.w; const x = Math.floor(r() * LW), y = Math.floor(r() * LH); ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + LW, y, 1, 1); } });
      // ground: turf + soil / wooden floor / stone / grass at night
      if (ground) mk(1, (ctx) => {
        if (kind === 'room') { for (let y = floorL; y < LH; y += 6) { ctx.fillStyle = pal.n; ctx.fillRect(0, y, LW * 2, 6); ctx.fillStyle = pal.N; ctx.fillRect(0, y + 5, LW * 2, 1); for (let x = ((y / 6) % 2) * 14; x < LW * 2; x += 28) ctx.fillRect(x, y, 1, 6); } return; }
        if (kind === 'cave') { ctx.fillStyle = pal.E; ctx.fillRect(0, floorL, LW * 2, LH - floorL); ctx.fillStyle = shade(pal.E, 1.3); for (let x = 0; x < LW * 2; x += 10) ctx.fillRect(x, floorL, 8, 2); return; }
        const top = kind === 'night' ? pal.G : pal.g, dirt = kind === 'night' ? shade(pal.N, 0.7) : pal.n;
        ctx.fillStyle = dirt; ctx.fillRect(0, floorL + 4, LW * 2, LH - floorL);
        ctx.fillStyle = top; ctx.fillRect(0, floorL, LW * 2, 4); for (let x = 0; x < LW * 2; x += 2) if ((x * 7) % 5 < 2) ctx.fillRect(x, floorL - 1, 1, 1);
        ctx.fillStyle = shade(dirt, 0.75); for (let i = 0; i < LW / 2; i++) { const x = Math.floor(r() * LW), y = floorL + 7 + Math.floor(r() * (LH - floorL - 8)); ctx.fillRect(x, y, 2, 1); ctx.fillRect(x + LW, y, 2, 1); }
      });
      // stars twinkle (a few, each on its own rhythm, at most 2 per second)
      const tw = kind === 'night' || kind === 'space' ? Array.from({ length: 10 }, () => ({ x: Math.floor(r() * LW), y: Math.floor(r() * (ground ? floorL * 0.7 : LH)), ph: r() })) : [];
      let twBox = null, twCv = null;
      if (tw.length) { twBox = el('div', `inset:0`, wrap); twBox.dataset.motion = 'skip'; twCv = canvasOf(LW, LH); twBox.appendChild(twCv); }
      const drift = o.drift ?? (kind === 'day' || kind === 'space' ? 6 : kind === 'night' ? 3 : 0);   // cells per second (1× for the farthest layer)
      let lastK = -1;
      F.add((t) => {
        for (const L of layers) if (L.depth && drift) { const off = Math.floor(t * drift * L.depth) % LW; set(L.box, { transform: `translateX(${f1(-off * U)}px)` }); }
        if (twCv) { const k = Math.floor(t * 4); if (k !== lastK) { lastK = k; const ctx = twCv.getContext('2d'); ctx.clearRect(0, 0, LW, LH); for (const s of tw) if (((k + Math.floor(s.ph * 8)) % 8) < 2) { ctx.fillStyle = pal.W; ctx.fillRect(s.x, s.y - 1, 1, 3); ctx.fillRect(s.x - 1, s.y, 3, 1); } } }
      });
      const floor = ground ? floorL * U : PT ? H * 0.7 : H * 0.84;
      layer.floor = floor; layer._kind = kind;
      return { el: wrap, floor };
    };
    X.scene = (a, z, o = {}) => {
      const L = F.layer('', o.z ?? 1);
      F.add((t) => show(L, t >= a && t < z));
      X.bg(L, o);
      return L;
    };

    // ---------- a sprite (shared by props / characters): canvas + position snapped to the grid ----------
    const spriteBox = (parent, gw, gh, ps, z) => {
      const box = el('div', `left:0;top:0;width:${f1(gw * ps)}px;height:${f1(gh * ps)}px;display:none;pointer-events:none;${z !== undefined ? `z-index:${z};` : 'z-index:10;'}`, parent);
      const cv = canvasOf(gw, gh); box.appendChild(cv);
      return { box, cv };
    };
    const place = (box, x, y, flip) => set(box, { transform: `translate(${f1(snap(x))}px,${f1(snap(y))}px)${flip ? ' scaleX(-1)' : ''}` });

    // ---------- props ----------
    X.item = (parent, o) => {
      const rows = Array.isArray(o.art) ? o.art : ART[o.art ?? 'coin'];
      if (!rows) throw new Error(`没有这种道具：${o.art}（有：${Object.keys(ART).join(' / ')}，或者自己写字符行）`);
      const g = gridOf(rows, o.outline !== false), gw = g[0].length, gh = g.length, ps = U * (o.scale ?? 3);
      const { box, cv } = spriteBox(parent, gw, gh, ps, o.z);
      box.dataset.what = `X.item ${typeof o.art === 'string' ? o.art : 'art'}`;
      paint(cv, g, pal);
      const at = o.at ?? 0, until = o.until ?? 1e9, enter = o.enter ?? 'pop', lead = enter === 'drop' ? 0.35 : enter === 'pop' ? 0.2 : 0;
      const S = { box, w: gw * ps, h: gh * ps, x: o.x ?? W / 2, y: o.y ?? H / 2, gone: until, moves: [] };
      S.move = (t, x, y, dur = 0.5) => { S.moves.push({ a: t - dur, b: t, x, y }); return S; };
      if (o.sfx !== false && enter !== 'none') F.sfx(at - 0.04, o.sfx ?? 'pop', o.gain ?? 0.3);
      F.add((t) => {
        const on = t >= at - lead && t < S.gone; show(box, on); if (!on) return;
        let x = S.x, y = S.y;
        for (const m of S.moves) { const q = seg(t, m.a, m.b, E.cubicInOut); x = lerp(x, m.x, q); y = lerp(y, m.y, q); }
        if (enter === 'drop' && t < at) { const q = seg(t, at - lead, at, (u) => u * u); y -= (1 - q) * Math.min(H * 0.3, F.px(300)); }   // dropping in: distance in design size (portrait doesn't fall faster)
        let sx = 1;
        if (enter === 'pop' && t < at) sx = Math.max(0.25, Math.ceil(seg(t, at - lead, at) * 4) / 4);   // grows step by step (no smooth scaling)
        if (o.bob && t >= at) y -= (Math.floor((t - at) * 2) % 2) * U;
        if (o.spin && t >= at) sx = [1, 0.66, 0.25, 0.66][Math.floor((t - at) * 8) % 4];   // spinning coin: width changes step by step
        if (S.pick && t >= S.pick) { const q = seg(t, S.pick, S.pick + 0.25); y -= snap(q * F.px(80)); }
        set(box, { transform: `translate(${f1(snap(x - S.w / 2))}px,${f1(snap(y - S.h / 2))}px)${sx !== 1 ? ` scale(${sx})` : ''}` });
      });
      return S;
    };
    X.art = ART;

    // ---------- characters ----------
    X.castList = {};
    const LOOK0 = { hair: 'short', hairColor: '#3B2A20', skin: '#F7C59F', shirt: '#3A6FF2', pants: '#2B2F4A', hat: 'none', hatColor: '#FF4D6D', glasses: false, beard: false, tool: 'none' };
    X.cast = (list) => {
      for (const [name, c] of Object.entries(list)) X.castList[name] = { ...LOOK0, ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, typeof v === 'string' && pal[v] ? pal[v] : v])) };
      if (window.EV && window.EV.castCheck) window.EV.castCheck(list, (c) => ({ ...LOOK0, ...c }), 'pixel');
      return X.castList;
    };
    const seen = new Map();   // two identical-looking people in the same scene: warn
    X.char = (parent, o = {}) => {
      if (o.who && !X.castList[o.who]) throw new Error(`角色表里没有"${o.who}"：先 X.cast({ ${o.who}: { hair, hairColor, shirt } })`);
      const look = o.who ? X.castList[o.who] : { ...LOOK0, ...(o.look || {}) };
      { const sig = JSON.stringify(look), list = seen.get(parent) || []; const twin = list.find((q) => q.sig === sig && q.who !== (o.who ?? null)); if (twin) console.warn(`像素：同一场里"${twin.who ?? '路人'}"和"${o.who ?? '路人'}"长得一模一样——在角色表里给他们不同的发型 / 发色 / 衣服 / 帽子`); list.push({ sig, who: o.who ?? null }); seen.set(parent, list); }
      const ps = U * (o.scale ?? 3), { box, cv } = spriteBox(parent, CW, CH, ps, o.z ?? 12);
      box.dataset.what = `X.char ${o.who ?? ''}`.trim();
      const at = o.at ?? 0, until = o.until ?? 1e9, wPx = CW * ps, hPx = CH * ps;
      const h = { who: o.who, box, look, x0: o.x ?? W / 2, y: o.y ?? parent.floor ?? H * 0.84, moves: [], acts: [], faces: [], until };
      // entrance: walks in from off-screen (default) / drops from the sky / already there
      const enter = o.enter ?? 'walk', speed = F.px(o.speed ?? 300);
      let startX = h.x0;
      if (enter === 'walk') { const from = o.from ?? (h.x0 < W / 2 ? -wPx : W + wPx); const dur = Math.abs(h.x0 - from) / speed; h.moves.push({ a: at - dur, b: at, x0: from, x1: h.x0, kind: 'walk' }); startX = from; }
      if (enter === 'drop') h.acts.push({ a: at - 0.4, b: at, pose: 'jump', drop: true });
      const appear = enter === 'walk' ? h.moves[0].a : enter === 'drop' ? at - 0.4 : at;
      h.face = o.face ?? (enter === 'walk' ? (h.x0 >= startX ? 'right' : 'left') : h.x0 < W / 2 ? 'right' : 'left');
      const xAt = (t) => { let x = startX; for (const m of h.moves) { if (t >= m.b) x = m.x1; else if (t > m.a) { const q = (t - m.a) / (m.b - m.a); x = lerp(m.x0, m.x1, m.kind === 'walk' ? walkEase(q) : E.cubicInOut(q)); } } return x; };
      const lastX = () => (h.moves.length ? h.moves[h.moves.length - 1].x1 : startX);
      h.xAt = xAt;
      h.walk = (t, x, wo = {}) => { const x0 = lastX(), dur = wo.dur ?? Math.abs(x - x0) / F.px(wo.speed ?? 300); h.moves.push({ a: t - dur, b: t, x0, x1: x, kind: 'walk' }); h.faces.push({ at: t - dur, dir: x >= x0 ? 'right' : 'left' }); h.faces.sort((a, b) => a.at - b.at); if (wo.sfx !== false) for (let k = t - dur; k < t - 0.05; k += 0.3) F.sfx(k, 'step', 0.1); return h; };
      h.jump = (t, jo = {}) => { h.acts.push({ a: t - 0.45, b: t, pose: 'jump', hop: F.px(jo.height ?? 70) }); if (jo.sfx !== false) F.sfx(t - 0.45, 'jump', 0.35); return h; };
      h.cheer = (t, dur = 1.2) => { h.acts.push({ a: t, b: t + dur, pose: 'cheer', hops: true }); F.sfx(t, 'power', 0.3); return h; };
      h.ko = (t) => { h.acts.push({ a: t, b: 1e9, pose: 'ko' }); F.sfx(t, 'hit', 0.4); return h; };
      h.faceTo = (t, other) => { h.faces.push({ at: t, dir: other }); h.faces.sort((a, b) => a.at - b.at); return h; };
      h.hurt = (t, from) => { h.acts.push({ a: t, b: t + 0.45, pose: 'hurt', flash: true, push: from === 'right' ? -1 : from === 'left' ? 1 : (h.face === 'right' ? -1 : 1) }); F.sfx(t, 'hit', 0.45); return h; };
      h.attack = (t, target, ao = {}) => {
        h.acts.push({ a: t - 0.18, b: t + 0.22, pose: 'attack', lunge: true });
        if (ao.sfx !== false) F.sfx(t - 0.05, 'slash', 0.4);
        if (target && target.hurt) target.hurt(t + 0.04, h.xAt(t) < target.xAt(t) ? 'left' : 'right');
        return h;
      };
      h.say = (t, text, so = {}) => { const b = bubble(parent, h, { text, at: t, until: so.until ?? t + Math.max(1.6, String(text).length * 0.18), size: so.size }); h.acts.push({ a: t - 0.3, b: b.until, pose: 'talk' }); return b; };
      h.emote = (t, kind = '!', eo = {}) => { emote(parent, h, kind, t, eo.until ?? t + 1); return h; };
      h.posAt = (t) => ({ x: xAt(t), y: h.y - (FEET - 2) * ps });
      const faceAt = (t) => { let f = h.face; for (const e of h.faces) if (t >= e.at) f = typeof e.dir === 'string' ? e.dir : e.dir && e.dir.xAt ? (e.dir.xAt(t) >= xAt(t) ? 'right' : 'left') : f; return f; };
      h.faceAt = faceAt;
      if (o.faceTo) h.faces.push({ at: -1, dir: o.faceTo });
      let lastKey = '';
      F.add((t) => {
        const on = t >= appear && t < until; show(box, on); if (!on) return;
        let x = xAt(t), y = h.y, pose = 'idle', fps = 2, flash = false;
        const walking = h.moves.some((m) => t > m.a && t < m.b);
        if (walking) { pose = 'walk'; fps = 8; }
        for (const A of h.acts) if (t >= A.a && t < A.b) {
          pose = A.pose; fps = pose === 'talk' ? 6 : pose === 'cheer' ? 4 : 2;
          if (A.drop) { const q = (t - A.a) / (A.b - A.a); y -= (1 - q * q) * H * 0.3; }
          if (A.hop) { const q = (t - A.a) / (A.b - A.a); y -= Math.sin(Math.PI * q) * A.hop; }
          if (A.hops) y -= Math.floor((t - A.a) * 4) % 2 ? F.px(16) : 0;
          if (A.lunge) x += (faceAt(t) === 'right' ? 1 : -1) * F.px(20) * Math.sin(Math.PI * clamp((t - A.a) / (A.b - A.a)));
          if (A.push) x += A.push * F.px(40) * Math.min(1, (t - A.a) / 0.15);
          if (A.flash) flash = Math.floor((t - A.a) * 10) % 3 === 0;   // hit: flashes white (two or three times in 0.45 s, over a small area)
        }
        // after being hit: stays where it was knocked to
        for (const A of h.acts) if (A.push && t >= A.b) x += A.push * F.px(40);
        const frame = Math.floor(t * fps) % 2, face = faceAt(t);
        const key = `${pose}|${frame}|${flash}`;
        if (key !== lastKey) { lastKey = key; paint(cv, drawChar(look, pose === 'ko' ? 'hurt' : pose, frame), pal, flash ? '#FFFFFF' : undefined); }
        // falling over: the whole sprite turns 90 degrees (around the feet) and lies on the ground — right-angle rotation doesn't blur pixels
        const ko = pose === 'ko' ? (face === 'right' ? ' translateY(' + f1(wPx / 2 - 3 * ps) + 'px) rotate(-90deg)' : ' translateY(' + f1(wPx / 2 - 3 * ps) + 'px) rotate(90deg)') : '';
        set(box, { transform: `translate(${f1(snap(x - wPx / 2))}px,${f1(snap(y - FEET * ps))}px)${ko}${face === 'left' ? ' scaleX(-1)' : ''}` });
      });
      // name tag: a small tab above the head (in stories, shown once at each person's first appearance)
      if (o.tag && o.who) { const tg = X.text(parent, { text: o.who, x: h.x0, y: h.y - hPx - F.px(30), size: 24, at: at + 0.1, until: o.tagUntil ?? at + 2.5, color: 'y', sfx: false }); h.tagEl = tg.el; }
      return h;
    };

    // ---------- pixel border (dialogs, windows, menus): one bright cell around the outside, dark inside; one cell missing at each corner ----------
    const corner = (w, h, k) => `polygon(${k}px 0, ${f1(w - k)}px 0, ${f1(w - k)}px ${k}px, ${f1(w)}px ${k}px, ${f1(w)}px ${f1(h - k)}px, ${f1(w - k)}px ${f1(h - k)}px, ${f1(w - k)}px ${f1(h)}px, ${k}px ${f1(h)}px, ${k}px ${f1(h - k)}px, 0 ${f1(h - k)}px, 0 ${k}px, ${k}px ${k}px)`;
    const frameBox = (parent, w, h, o = {}) => {
      w = snap(w); h = snap(h);
      const box = el('div', `left:0;top:0;width:${f1(w)}px;height:${f1(h)}px;display:none;pointer-events:none;z-index:${o.z ?? 20};background:${C(o.border, pal.w)};clip-path:${corner(w, h, U)}`, parent);
      const inner = el('div', `left:${f1(U)}px;top:${f1(U)}px;right:${f1(U)}px;bottom:${f1(U)}px;background:${C(o.edge, pal.E)};clip-path:${corner(w - 2 * U, h - 2 * U, U)}`, box);
      const fill = el('div', `left:${f1(U)}px;top:${f1(U)}px;right:${f1(U)}px;bottom:${f1(U)}px;background:${C(o.fill, pal.box)};overflow:hidden`, inner);
      return { box, fill, w, h };
    };
    // opening: first a horizontal line, which grows up and down two cells at a time (0.2 s)
    const openAnim = (box, t, a, until, w, h) => {
      const q = seg(t, a - 0.2, a), out = until < 1e8 ? seg(t, until - 0.15, until) : 0, k = Math.max(q < 1 ? q : 1 - out, 0);
      const step = Math.ceil(k * 6) / 6, hh = Math.max(2 * U, snap(h * step));
      set(box, { clipPath: step >= 1 ? corner(w, h, U) : `inset(${f1((h - hh) / 2)}px 0 ${f1((h - hh) / 2)}px 0)` });
    };

    // ---------- text ----------
    // typewriter: letters appear one by one (layout fixed: letters not yet shown are transparent)
    const typer = (host, text, color) => {
      const vis = el('span', `position:relative;color:${color}`, host), rest = el('span', 'position:relative;color:transparent;text-shadow:none', host);
      const chars = [...text];
      let last = -1;
      return (n) => { n = Math.max(0, Math.min(chars.length, n)); if (n === last) return; last = n; vis.textContent = chars.slice(0, n).join(''); rest.textContent = chars.slice(n).join(''); };
    };
    const typeSfx = (a, n, per) => { for (let i = 0; i < n; i += 3) F.sfx(a + i * per, 'type', 0.12); };   // typing: the film check doesn't count it towards "too many sound effects"
    X.text = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, text = plain(o.text), col = C(o.color, pal.w);
      let size = fs(o.size ?? 48);
      if (o.maxW && !o.wrap) { const est = ([...text].reduce((s, c) => s + (/[^\x00-\xff]/.test(c) ? 1 : 0.55), 0)) * size; if (est > F.px(o.maxW) && est > 0) size = fs(Math.floor(((o.size ?? 48) * F.px(o.maxW)) / est)); }
      const wrap = el('div', `left:0;top:0;display:none;pointer-events:none;z-index:${o.z ?? 22};font:400 ${f1(size)}px/1.25 ${FONT};white-space:${o.wrap ? 'normal' : 'nowrap'};${o.wrap && o.maxW ? `width:${f1(F.px(o.maxW))}px;` : ''}text-align:${o.align ?? 'center'};color:${col};text-shadow:${o.shadow === false ? 'none' : outlineShadow(lum(col) > 0.5 ? pal.k : pal.w, size / 12)}`, parent);
      wrap.dataset.what = 'X.text';
      const per = o.type ? Math.min(0.05, 0.9 / Math.max(1, [...text].length)) : 0, a0 = at - (o.type ? per * [...text].length : 0.12);
      const ty = o.type ? typer(wrap, text, col) : null; if (!ty) wrap.textContent = text;
      F.text(wrap, o.kind ?? 'label', text, a0, until, { noFact: o.noFact });
      if (o.sfx !== false) { if (o.type) typeSfx(a0, [...text].length, per); else F.sfx(at - 0.08, o.sfx ?? 'blip', o.gain ?? 0.18); }
      F.prep(() => measure(wrap));
      const S = { el: wrap, size };
      F.add((t) => {
        const on = t >= a0 && t < until; show(wrap, on); if (!on) return;
        if (ty) ty(Math.floor((t - a0) / per) + 1);
        const ww = wrap._w ?? wrap.offsetWidth, hh = wrap._h ?? wrap.offsetHeight, x = (o.x ?? W / 2) - (o.align === 'left' ? 0 : o.align === 'right' ? ww : ww / 2), y = (o.y ?? H * 0.7) - hh / 2;
        const out = until < 1e8 ? seg(t, until - 0.2, until) : 0;
        set(wrap, { transform: `translate(${f1(snap(x))}px,${f1(snap(y + (o.type ? 0 : out * F.px(16))))}px)`, visibility: out > 0.5 ? 'hidden' : '' });
      });
      return S;
    };
    // big title: letters drop from above one by one, dipping one cell on landing and bouncing back (stepped, not smooth)
    X.title = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, text = plain(o.text), col = C(o.color, pal.y);
      let size = fs(o.size ?? (PT ? 96 : 120));
      const maxW = F.px(o.maxW ?? (W * 0.9) / F.px(1)), est = [...text].reduce((s, c) => s + (/[^\x00-\xff]/.test(c) ? 1 : 0.55), 0);
      if (est * size > maxW) size = fs(Math.floor((maxW / est) / F.px(1)));
      const wrap = el('div', `left:0;top:0;display:none;pointer-events:none;z-index:${o.z ?? 24};font:400 ${f1(size)}px/1.1 ${FONT};white-space:nowrap;color:${col};text-shadow:${outlineShadow(pal.k, size / 12)}`, parent);
      wrap.dataset.what = 'X.title';
      const parts = [...text], spans = parts.map((c) => { const s = el('span', 'position:relative;display:inline-block;white-space:pre', wrap); s.textContent = c; return s; });
      const per = Math.min(0.07, 0.5 / Math.max(1, parts.length)), lead = 0.3 + per * parts.length;
      F.text(wrap, o.kind ?? 'slam', text, at - lead, until, { noFact: o.noFact });
      if (o.sfx !== false) { F.sfx(at - 0.05, o.sfx ?? 'power', o.gain ?? 0.4); }
      F.prep(() => measure(wrap));
      F.add((t) => {
        const on = t >= at - lead && t < until; show(wrap, on); if (!on) return;
        const ww = wrap._w ?? wrap.offsetWidth, hh = wrap._h ?? wrap.offsetHeight, x = (o.x ?? W / 2) - (o.align === 'left' ? 0 : ww / 2), y = (o.y ?? H * 0.4) - hh / 2;
        // exit: sinks one cell, then another (two frames), then gone — game text doesn't fly away
        const out = until < 1e8 ? Math.floor(seg(t, until - 0.12, until) * 3) : 0;
        set(wrap, { transform: `translate(${f1(snap(x))}px,${f1(snap(y) + out * U * 2)}px)`, visibility: out >= 3 ? 'hidden' : '' });
        const t0 = at - lead;
        const fall = Math.min(size * 1.5, Math.max(size * 0.4, snap(y) - F.px(12)));   // drops from above, but not from off-screen (a title near the top edge would get clipped)
        spans.forEach((sp, i) => { const a = t0 + i * per, q = seg(t, a, a + 0.25); const dy = q < 1 ? -(1 - q * q) * fall : 0, bounce = q >= 1 && t < a + 0.33 ? U * 2 : 0; set(sp, { transform: dy || bounce ? `translateY(${f1(snap(dy + bounce))}px)` : '', visibility: t < a ? 'hidden' : '' }); });
      });
      return { el: wrap, size };
    };
    // dialog box: a game text box; name tab at top left; text types out; ▼ blinks when done (2 times a second)
    X.dialog = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, text = plain(o.text), size = fs(o.size ?? 44);
      const w = snap(o.w ?? Math.min(W * 0.86, F.px(1500))), x = o.x ?? W / 2, lines = Math.max(1, Math.ceil(([...text].reduce((s, c) => s + (/[^\x00-\xff]/.test(c) ? 1 : 0.55), 0) * size) / (w - F.px(80))));
      const h = snap(o.h ?? lines * size * 1.3 + F.px(64)), y = o.y ?? (PT ? H * 0.6 : H * 0.72);
      const fb = frameBox(parent, w, h, o);
      fb.box.dataset.what = 'X.dialog';
      const body = el('div', `left:${f1(F.px(32))}px;top:${f1(F.px(28))}px;right:${f1(F.px(32))}px;font:400 ${f1(size)}px/1.3 ${FONT};white-space:normal`, fb.fill);
      const n = [...text].length, per = Math.min(0.045, 1.2 / Math.max(1, n)), a0 = at - 0.2, typeEnd = a0 + n * per;
      const ty = typer(body, text, pal.w);
      const arrow = el('div', `right:${f1(F.px(24))}px;bottom:${f1(F.px(14))}px;font:400 ${f1(fs(36))}px/1 ${FONT};color:${pal.y};display:none`, fb.fill); arrow.textContent = '▼';
      let tag = null;
      if (o.who) { tag = frameBox(parent, Math.max(F.px(120), [...o.who].length * fs(36) + F.px(48)), fs(36) + F.px(28), { fill: pal.a, z: 21 }); const tt = el('div', `inset:0;display:flex;align-items:center;justify-content:center;font:400 ${f1(fs(36))}px/1 ${FONT};color:${lum(pal.a) > 0.6 ? pal.k : pal.W}`, tag.fill); tt.textContent = o.who; F.text(tt, 'label', o.who, at, until); }
      F.text(body, o.kind ?? 'line', text, a0, until);
      if (o.sfx !== false) typeSfx(a0, n, per);
      F.add((t) => {
        const on = t >= a0 - 0.2 && t < until; show(fb.box, on); if (tag) show(tag.box, on && t >= a0); if (!on) return;
        const bx = snap(x - w / 2), by = snap(y - h / 2);
        set(fb.box, { transform: `translate(${f1(bx)}px,${f1(by)}px)` }); openAnim(fb.box, t, a0, until, w, h);
        if (tag) set(tag.box, { transform: `translate(${f1(bx + F.px(28))}px,${f1(by - tag.h + U * 2)}px)` });
        ty(t < a0 ? 0 : Math.floor((t - a0) / per) + 1);
        show(arrow, t >= typeEnd + 0.1 && Math.floor((t - typeEnd) * 2) % 2 === 0);
      });
      return { el: fb.box, w, h, x, y };
    };
    // menu: a vertical list; at each pick's time the ▶ cursor jumps to that item (a "beep" sfx), the picked item turns yellow
    X.menu = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, items = o.items.map((it) => (typeof it === 'string' ? { text: it } : it)), size = fs(o.size ?? 44), rowH = snap(size * 1.6);
      const w = snap(o.w ?? Math.min(W * 0.8, F.px(900))), h = snap(rowH * items.length + F.px(56)), x = o.x ?? W / 2, y = o.y ?? H / 2;
      const fb = frameBox(parent, w, h, o); fb.box.dataset.what = 'X.menu';
      const rows = items.map((it, j) => { const r = el('div', `left:${f1(F.px(84))}px;right:${f1(F.px(24))}px;top:${f1(F.px(28) + j * rowH)}px;height:${f1(rowH)}px;display:flex;align-items:center;font:400 ${f1(size)}px/1 ${FONT};color:${pal.w};white-space:nowrap;overflow:hidden`, fb.fill); r.textContent = plain(it.text); F.text(r, 'label', plain(it.text), at + j * 0.08, until); return r; });
      const cur = el('div', `left:${f1(F.px(30))}px;top:0;height:${f1(rowH)}px;display:flex;align-items:center;font:400 ${f1(size)}px/1 ${FONT};color:${pal.y}`, fb.fill); cur.textContent = '▶';
      const picks = (o.picks ?? items.map((_, j) => ({ at: at + 0.3 + j * 0.6, index: j }))).slice().sort((a, b) => a.at - b.at);
      picks.forEach((p) => F.sfx(p.at, 'blip', 0.25));
      if (o.sfx !== false) F.sfx(at - 0.2, 'select', 0.25);
      F.add((t) => {
        const on = t >= at - 0.2 && t < until; show(fb.box, on); if (!on) return;
        set(fb.box, { transform: `translate(${f1(snap(x - w / 2))}px,${f1(snap(y - h / 2))}px)` }); openAnim(fb.box, t, at, until, w, h);
        let idx = -1; for (const p of picks) if (t >= p.at) idx = p.index;
        rows.forEach((r, j) => set(r, { visibility: t >= at + j * 0.08 ? '' : 'hidden', color: j === idx ? pal.y : (items[j].dim ? pal.e : pal.w) }));
        set(cur, { transform: `translateY(${f1(F.px(28) + Math.max(0, idx) * rowH)}px)`, visibility: idx >= 0 && Math.floor(t * 4) % 4 !== 3 ? '' : 'hidden' });
      });
      return { el: fb.box, rows, rowY: (j) => y - h / 2 + F.px(28) + j * rowH + rowH / 2, w, h };
    };
    // health / progress bar: fills cell by cell (each cell 2 U wide), the number on the right counts along
    X.bar = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, max = o.max ?? 100, val = o.value ?? 0, size = fs(o.size ?? 36), w = snap(o.w ?? F.px(800)), bh = snap(o.h ?? F.px(40));
      const x = o.x ?? W / 2, y = o.y ?? H / 2, col = C(o.color, val / max > 0.5 ? pal.g : val / max > 0.25 ? pal.y : pal.r);
      const wrap = el('div', `left:0;top:0;width:${f1(w)}px;display:none;pointer-events:none;z-index:${o.z ?? 20}`, parent); wrap.dataset.what = 'X.bar';
      const lab = el('div', `left:0;bottom:${f1(bh + F.px(10))}px;font:400 ${f1(size)}px/1 ${FONT};color:${pal.w};white-space:nowrap;text-shadow:${outlineShadow(pal.k)}`, wrap); lab.textContent = plain(o.label ?? '');
      const num = el('div', `right:0;bottom:${f1(bh + F.px(10))}px;font:400 ${f1(size)}px/1 ${MONO};color:${col};white-space:nowrap;text-shadow:${outlineShadow(pal.k)}`, wrap);
      const fmt = (v) => (o.prefix ?? '') + (o.digits ? v.toFixed(o.digits) : Math.round(v).toLocaleString('en-US')) + (o.unit ?? '');
      num.textContent = fmt(val);
      const track = el('div', `left:0;top:0;width:${f1(w)}px;height:${f1(bh)}px;background:${pal.k};clip-path:${corner(w, bh, U)}`, wrap);
      const cells = Math.floor((w - 2 * U) / (2 * U)), fill = el('div', `left:${f1(U)}px;top:${f1(U)}px;height:${f1(bh - 2 * U)}px;width:0;background:${col};box-shadow:inset 0 ${f1(U)}px 0 rgba(255,255,255,.35)`, track);
      if (o.label) F.text(lab, 'label', plain(o.label), at - 0.6, until);
      F.text(num, 'label', fmt(val), at, until);
      if (o.sfx !== false) { F.sfx(at - 0.6, 'fill', 0.2, { dur: 0.6 }); F.sfx(at, 'coin', 0.3); }
      F.add((t) => {
        const on = t >= at - 0.7 && t < until; show(wrap, on); if (!on) return;
        const q = seg(t, at - 0.6, at, E.quartOut), n = Math.round(cells * (val / max) * q);
        set(wrap, { transform: `translate(${f1(snap(x - w / 2))}px,${f1(snap(y - bh / 2))}px)` });
        set(fill, { width: `${f1(n * 2 * U)}px` });
        num.textContent = fmt(q >= 1 ? val : val * q);
      });
      return { el: wrap, w, h: bh };
    };
    // score: monospaced digits count up, a "ding" when it settles
    X.number = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, val = Number(o.value), from = o.from ?? 0, digits = o.digits ?? (String(o.value).includes('.') ? String(o.value).split('.')[1].length : 0), size = fs(o.size ?? 168), col = C(o.color, pal.y);
      const wrap = el('div', `left:0;top:0;display:none;pointer-events:none;z-index:${o.z ?? 22};font:400 ${f1(size)}px/1 ${MONO};color:${col};white-space:nowrap;text-shadow:${outlineShadow(pal.k, size / 12)}`, parent);
      wrap.dataset.what = 'X.number';
      const txt = (v) => (o.prefix ?? '') + (o.pad ? String(Math.round(v)).padStart(o.pad, '0') : v.toFixed(digits)) + (o.unit ?? '');
      wrap.textContent = txt(val);
      F.text(wrap, o.kind ?? 'slam', txt(val), at - 0.8, until);
      F.prep(() => measure(wrap));
      if (o.sfx !== false) { for (let k = 0; k < 5; k++) F.sfx(at - 0.8 + k * 0.15, 'blip', 0.12); F.sfx(at, 'coin', 0.45); }
      F.add((t) => {
        const on = t >= at - 0.8 && t < until; show(wrap, on); if (!on) return;
        const q = o.count === false ? 1 : seg(t, at - 0.8, at, E.quartOut), v = lerp(from, val, q);
        wrap.textContent = txt(q >= 1 ? val : Math.round(v * 10 ** digits) / 10 ** digits);
        const ww = wrap._w ?? wrap.offsetWidth, hh = wrap._h ?? wrap.offsetHeight, x = (o.x ?? W / 2) - (o.align === 'left' ? 0 : o.align === 'right' ? ww : ww / 2), y = (o.y ?? H / 2) - hh / 2;
        set(wrap, { transform: `translate(${f1(snap(x))}px,${f1(snap(y))}px)`, visibility: until < 1e8 && t > until - 0.15 ? 'hidden' : '' });
      });
      return { el: wrap };
    };
    // panel: just a block with a pixel border (holds content; coordinates in el start at the content area's top left)
    X.panel = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, x = o.x ?? W / 2, y = o.y ?? H / 2;
      const fb = frameBox(parent, o.w ?? F.px(800), o.h ?? F.px(500), o); fb.box.dataset.what = 'X.panel';
      if (o.sfx !== false) F.sfx(at - 0.2, 'select', 0.2);
      F.add((t) => {
        const on = t >= at - 0.2 && t < until; show(fb.box, on); if (!on) return;
        set(fb.box, { transform: `translate(${f1(snap(x - fb.w / 2))}px,${f1(snap(y - fb.h / 2))}px)` }); openAnim(fb.box, t, at, until, fb.w, fb.h);
      });
      return { el: fb.fill, box: fb.box, w: fb.w - 6 * U, h: fb.h - 6 * U, x0: snap(x - fb.w / 2) + 3 * U, y0: snap(y - fb.h / 2) + 3 * U };
    };
    // pixel window: title bar + three dots on the left; inner holds the content
    X.window = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, w = snap(o.w ?? F.px(1000)), h = snap(o.h ?? F.px(620)), x = o.x ?? W / 2, y = o.y ?? H / 2, bar = snap(F.px(44));
      const fb = frameBox(parent, w, h, { fill: o.fill ?? pal.w, edge: pal.k, border: pal.k, z: o.z ?? 18 });
      fb.box.dataset.what = 'X.window';
      const tb = el('div', `left:0;top:0;right:0;height:${f1(bar)}px;background:${C(o.barColor, pal.a)}`, fb.fill);
      ['r', 'y', 'g'].forEach((c, i) => el('div', `left:${f1(F.px(16) + i * F.px(28))}px;top:${f1(bar / 2 - U * 2)}px;width:${f1(U * 4)}px;height:${f1(U * 4)}px;background:${pal[c]};box-shadow:0 0 0 ${f1(U)}px ${pal.k}`, tb));
      if (o.title) { const tt = el('div', `left:${f1(F.px(110))}px;right:${f1(F.px(16))}px;top:0;height:${f1(bar)}px;display:flex;align-items:center;font:400 ${f1(fs(24))}px/1 ${FONT};color:${lum(C(o.barColor, pal.a)) > 0.6 ? pal.k : pal.W};white-space:nowrap;overflow:hidden`, tb); tt.textContent = plain(o.title); F.text(tt, 'label', plain(o.title), at, until); }
      const inner = el('div', `left:0;top:${f1(bar)}px;right:0;bottom:0;overflow:hidden;background:${o.fill ?? pal.w}`, fb.fill);
      if (o.sfx !== false) F.sfx(at - 0.2, 'select', 0.25);
      F.add((t) => {
        const on = t >= at - 0.2 && t < until; show(fb.box, on); if (!on) return;
        set(fb.box, { transform: `translate(${f1(snap(x - w / 2))}px,${f1(snap(y - h / 2))}px)` }); openAnim(fb.box, t, at, until, w, h);
      });
      const B = 2 * U;
      return { el: fb.box, inner, w, h, box: { x: snap(x - w / 2) + B, y: snap(y - h / 2) + B + bar, w: w - 2 * B, h: h - 2 * B - bar } };
    };
    // screenshot: inside a pixel window; starts as a coarse mosaic, sharpens step by step (0.5 s), ends on the original image (the image itself is untouched)
    X.shot = (parent, o) => {
      const win = X.window(parent, { ...o, h: o.h, sfx: o.sfx });
      const at = o.at ?? 0, until = o.until ?? 1e9;
      const im = el('img', `left:0;top:0;width:100%;height:100%;object-fit:${o.fit === 'contain' ? 'contain' : 'cover'};object-position:${o.pos ?? 'top'};display:none`, win.inner); im.src = o.src;
      const steps = o.mosaic === false ? [] : [48, 24, 12, 6], mcv = document.createElement('canvas'); mcv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:pixelated;display:none'; win.inner.appendChild(mcv);
      const tiny = document.createElement('canvas');
      F.prep(async () => { try { await im.decode(); } catch (e) { /* if the image cannot load, the check reports it */ } });
      let lastS = null;
      F.add((t) => {
        const on = t >= at - 0.2 && t < until; if (!on) return;
        const k = steps.length ? Math.floor(seg(t, at - 0.2, at + 0.3) * steps.length) : steps.length, bs = k < steps.length ? steps[k] : null;
        show(im, !bs); show(mcv, !!bs);
        if (bs && bs !== lastS && im.naturalWidth) {
          lastS = bs; const bw = win.box.w, bh = win.box.h, tw = Math.max(1, Math.round(bw / F.px(bs))), th = Math.max(1, Math.round(bh / F.px(bs)));
          // take the part of the image that cover / contain would show
          const ir = im.naturalWidth / im.naturalHeight, br = bw / bh; let sx = 0, sy = 0, sw = im.naturalWidth, sh = im.naturalHeight;
          if (o.fit !== 'contain') { if (ir > br) { sw = sh * br; sx = (im.naturalWidth - sw) / 2; } else { sh = sw / br; sy = 0; } }
          tiny.width = tw; tiny.height = th; const c1 = tiny.getContext('2d'); c1.imageSmoothingEnabled = true; c1.fillStyle = '#fff'; c1.fillRect(0, 0, tw, th); c1.drawImage(im, sx, sy, sw, sh, 0, 0, tw, th);
          mcv.width = tw; mcv.height = th; mcv.getContext('2d').drawImage(tiny, 0, 0);
        }
      });
      if (steps.length && o.sfx !== false) F.sfx(at - 0.2, 'fill', 0.2, { dur: 0.5 });
      return { el: win.el, w: win.w, h: win.h, img: im, box: win.box };
    };

    // ---------- speech bubbles and emotes above the head ----------
    const bubble = (parent, h, o) => {
      const text = plain(o.text), size = fs(o.size ?? 36), at = o.at, until = o.until;
      const wrap = el('div', `left:0;top:0;display:none;pointer-events:none;z-index:30`, parent); wrap.dataset.what = 'X.say';
      const fb = el('div', `position:relative;background:${pal.k};padding:${f1(U)}px;clip-path:${'none'}`, wrap);
      const inner = el('div', `position:relative;background:${pal.W};padding:${f1(F.px(14))}px ${f1(F.px(22))}px;font:400 ${f1(size)}px/1.25 ${FONT};color:${pal.k};white-space:nowrap`, fb);
      const tail = el('div', `left:0;top:100%;width:${f1(U * 4)}px;height:${f1(U * 3)}px;background:${pal.k};clip-path:polygon(0 0,100% 0,0 100%)`, wrap);
      const n = [...text].length, per = Math.min(0.04, 0.8 / Math.max(1, n)), a0 = at - 0.15;
      const ty = typer(inner, text, pal.k);
      F.text(inner, 'label', text, a0, until);
      typeSfx(a0, n, per);
      F.prep(() => measure(wrap));
      F.add((t) => {
        const on = t >= a0 && t < until; show(wrap, on); if (!on) return;
        ty(Math.floor((t - a0) / per) + 1);
        const p = h.posAt(t), ww = wrap._w ?? wrap.offsetWidth, hh = wrap._h ?? wrap.offsetHeight, face = h.faceAt(t);
        let bx = p.x + (face === 'right' ? -F.px(20) : -ww + F.px(20)); bx = Math.max(F.px(24), Math.min(W - ww - F.px(24), bx));
        const by = p.y - hh - F.px(12);
        set(wrap, { transform: `translate(${f1(snap(bx))}px,${f1(snap(by))}px)` });
        set(tail, { left: `${f1(snap(Math.max(U * 2, Math.min(ww - U * 6, p.x - bx))))}px`, transform: face === 'right' ? '' : 'scaleX(-1)' });
      });
      return { el: wrap, until };
    };
    const EMOTES = { '!': ['.rr.', '.rr.', '.rr.', '.rr.', '....', '.rr.'], '?': ['.yyy.', 'y...y', '...y.', '..y..', '.....', '..y..'], '♥': ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'], '…': ['.....', '.....', 'w.w.w'], '♪': ['..cc', '..c.', '..c.', 'ccc.', 'cc..'] };
    const emote = (parent, h, kind, at, until) => {
      const g = gridOf(EMOTES[kind] ?? EMOTES['!']), ps = U * 3, { box, cv } = spriteBox(parent, g[0].length, g.length, ps, 31);
      box.dataset.what = 'X.emote'; paint(cv, g, pal);
      F.sfx(at, kind === '♥' ? 'pop' : 'blip', 0.3);
      F.add((t) => { const on = t >= at && t < until; show(box, on); if (!on) return; const p = h.posAt(t), up = t < at + 0.12 ? U * 2 : 0; place(box, p.x - (g[0].length * ps) / 2 + F.px(8), p.y - g.length * ps - F.px(8) - up); });
    };

    // ---------- particles, pickup ----------
    X.burst = (parent, o) => {
      const at = o.at ?? 0, n = o.n ?? 12, cols = (o.colors ?? ['y', 'w', 'a']).map((c) => C(c)), r = rnd(hashStr(`${o.x}|${o.y}|${at}`)), life = o.life ?? 0.6;
      const ps = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + r() * 0.4, v = F.px(300 + r() * 380), sz = U * (r() < 0.4 ? 3 : 2); const d = el('div', `left:0;top:0;width:${f1(sz)}px;height:${f1(sz)}px;background:${cols[i % cols.length]};display:none;z-index:${o.z ?? 26}`, parent); d.dataset.motion = 'skip'; return { d, vx: Math.cos(a) * v, vy: Math.sin(a) * v - F.px(200) }; });
      if (o.sfx !== false) F.sfx(at, o.sfx ?? 'burst', o.gain ?? 0.35);
      F.add((t) => { const on = t >= at && t < at + life; ps.forEach((p, i) => { const vis = on && !(t > at + life * 0.7 && (i + Math.floor(t * 12)) % 2); show(p.d, vis); if (!vis) return; const dt = Math.floor((t - at) * 15) / 15; set(p.d, { transform: `translate(${f1(snap(o.x + p.vx * dt))}px,${f1(snap(o.y + p.vy * dt + F.px(900) * dt * dt))}px)` }); }); });
    };
    X.pickup = (at, item, o = {}) => {
      item.pick = at; item.gone = Math.min(item.gone, at + 0.3);
      F.sfx(at, 'coin', 0.45);
      X.text(item.box.parentElement, { text: o.text ?? '+1', x: item.x, y: item.y - F.px(60), size: 36, color: 'y', at: at + 0.15, until: at + 1.1, sfx: false, kind: 'label' });
      return item;
    };

    // ---------- transitions ----------
    let wipeLayer = null;
    X.wipe = (o) => {
      wipeLayer ??= F.layer('pointer-events:none', 90);
      const at = o.at, dur = o.dur ?? 0.6, kind = o.kind ?? 'blocks', half = dur / 2, col = C(o.color, pal.k);
      F.sfx(at - half, 'sweep', 0.35, { dur }); F.cut(at); F.transition(at - half, at + half);
      const box = el('div', `inset:0;display:none`, wipeLayer); box.dataset.motion = 'skip';
      const bs = kind === 'iris' ? 1 : 8, cw = Math.ceil(LW / bs), chh = Math.ceil(LH / bs), cv = canvasOf(cw, chh); box.appendChild(cv);
      const ctx = cv.getContext('2d'), r = rnd(hashStr(kind + at)), order = Array.from({ length: cw * chh }, () => r());
      const [fx, fy] = o.from ? [o.from[0] / U / bs, o.from[1] / U / bs] : [cw / 2, chh / 2];
      const Rmax = Math.max(...[[0, 0], [cw, 0], [0, chh], [cw, chh]].map(([x, y]) => Math.hypot(x - fx, y - fy))) + 1;
      // cover(k): k = 0 uncovered, 1 fully covered. On the way in k goes 0 → 1, on the way out 1 → 0 (dissolve: the same order in reverse)
      const draw = (k) => {
        ctx.clearRect(0, 0, cw, chh); ctx.fillStyle = col;
        if (kind === 'iris') { const R = Rmax * (1 - k); for (let y = 0; y < chh; y++) { const dy = y + 0.5 - fy, span = R * R - dy * dy; if (span <= 0) { ctx.fillRect(0, y, cw, 1); continue; } const s = Math.sqrt(span), x0 = Math.round(fx - s), x1 = Math.round(fx + s); ctx.fillRect(0, y, Math.max(0, x0), 1); ctx.fillRect(x1, y, cw - x1, 1); } return; }
        for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) {
          const d = kind === 'stairs' ? (x / cw) * 0.75 + (y / chh) * 0.25 : kind === 'bars' ? (y % 2 ? x / cw : 1 - x / cw) * 0.9 + (y / chh) * 0.1 : order[y * cw + x];
          if (d < k) ctx.fillRect(x, y, 1, 1);
        }
      };
      let lastK = -1;
      F.add((t) => {
        const on = t >= at - half && t < at + half; show(box, on); if (!on) return;
        const k = t < at ? Math.ceil(seg(t, at - half, at) * 10) / 10 : 1 - Math.floor(seg(t, at, at + half) * 10) / 10;   // ten steps: covers cell by cell
        const kk = Math.min(1.0001, k * 1.0001); if (kk !== lastK) { lastK = kk; draw(kk); }
      });
      return at;
    };

    // ---------- level card, end card ----------
    X.stage = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? at + 1.6;
      const t1 = X.title(parent, { text: o.text, at, until, y: H * (PT ? 0.4 : 0.44), size: o.size ?? (PT ? 96 : 120), color: o.color ?? 'w' });
      if (o.sub) X.text(parent, { text: o.sub, at: at + 0.25, until, y: H * (PT ? 0.4 : 0.44) + t1.size * 0.9 + F.px(20), size: 48, color: 'y', sfx: false });
      return t1;
    };
    X.endcard = (parent, o) => {
      const at = o.at, y0 = PT ? H * 0.34 : H * 0.36;
      X.title(parent, { text: o.title, at: at + 0.6, y: y0, size: PT ? 108 : 132, kind: 'logo', color: o.color ?? 'y', sfx: false });
      if (o.sub) X.text(parent, { text: o.sub, at: at + 1.2, y: y0 + F.px(PT ? 140 : 150), size: PT ? 44 : 48, maxW: (W * 0.86) / F.px(1), kind: 'endcard', sfx: false });
      if (o.url) { const d = X.text(parent, { text: '▶ ' + o.url, at: at + 1.7, y: y0 + F.px(PT ? 260 : 270), size: o.urlSize ?? (PT ? 60 : 72), color: 'w', kind: 'endcard', sfx: false }); }
      if (o.char) { const who = typeof o.char === 'string' ? o.char : null; const c = X.char(parent, { who, look: who ? undefined : o.char, x: W * (PT || !o.url ? 0.5 : 0.18), y: PT ? H * 0.74 : parent.floor ?? H * 0.84, at: at + 0.2, enter: 'drop', face: 'right' }); c.cheer(at + 1.0, 1.6); }
      X.burst(parent, { x: W / 2, y: y0, at: at + 0.6, n: 16, sfx: false });
      F.sfx(at + 0.6, 'logo', 1);
    };
    return P.infoKit ? P.infoKit(X, { item: 'illustration', char: 'character', bar: 'chart', window: 'ui', shot: 'ui' }) : X;   // info-density check: info-carrying components register themselves when called (promo.js's infoKit)
  };
  P.pixel.PALETTES = PALETTES;
  P.pixel.ART = ART;
  P.pixel.HAIRS = HAIRS;
})();
