// mystery.js: the suspense-mystery (悬疑探秘) style, one of bb-video's visual styles (style notes in styles/mystery/STYLE.md). Load after promo.js.
// A deadpan mock-science programme about everyday things. Two looks:
//   'tv' (default): a 4:3 old-TV picture in saturated blue (tube vignette, scratches, a station mark, a "fiction, for fun" crawl): an outlined
//     title with red key words, brush-script numbered points, rubber-hose cartoon stickers acting each point out, a full-screen chat, a word
//     storm, and the signal cut to a test card (the music stops dead). The copy is a clinical checklist of habits everyone has.
//   'case': a late-night investigation played straight — fog, a question card, guesses struck out and stamped, reconstructions (情景再现) in
//     cold teal with a handheld wobble (always tagged), an evidence board, a magnifier, surveillance / night vision, a flashlight, a countdown,
//     a replayed tape — then a plain, sourced answer in daylight.
// Everything is cartoon props drawn in code. A fictional show's mark; never a real programme's name, titles, music, host or channel marks.
//
//   const R = PROMO.mystery(F, { look: 'tv' | 'case', gate: 4 / 3 | 'full', brand: { name, en, episode }, title, disclaimer, mark, damage, colors, fonts, captions })
//   TV look: R.title(L, { a, b, lines }), R.point(L, { a, b, n, text }), R.chat(L, { a, b, messages, avatars }), R.storm(L, { a, b, words }), R.testcard(L, { a, b })
//   Layout is in design units: the picture is R.RW × R.RH (TV look 1440 × 1080; case look the frame, 1920 × 1080 or 1080 × 1920); R.g(v) → px.
//   const L = R.shot(a, b, { grade, bg, cut, push: { from, to }, cam, tag, clock, camName, place })
//       a layer shown in [a, b); the start is a hard cut. grade: 'blue' (TV look default) | 'paper' (chat screens) | 'studio' (blue-black fog, case look default) | 'rebuild' (情景再现: cold teal, handheld
//       wobble, the reconstruction tag — always) | 'cctv' (surveillance: grey, scan lines, REC, a ticking timestamp from clock) | 'night' (green
//       night vision) | 'truth' (warm daylight, for the reveal) | 'plain'. push / cam: camera keys { s, x, y } (focus 0–1; the focus stays put on screen)
//   R.cam(L, [[t, { s, x, y }, ease]…])   R.jolt(L, at, amount)   R.flash(at)   R.dip(a, b)
//   R.text(parent, html, { x, y, size, font, weight, color, anchor, w, a, b, kind, bg, enter: 'fade' | 'slam' | 'type' })   R.tag(L, text, { a, b, right, bottom, dot })
//   R.stamp(parent, text, { x, y, size, rot, a, b, color })   red ink, slammed, centred on x, y
//   R.lower(L, { a, b, title, sub, y })   lower third    R.card(L, { a, b, kicker, title, sub })   chapter card
//   R.question(L, { a, b, text, sub })    the question card (music hit, a words-only scene on purpose)
//   R.theory(L, { a, b, n, text, out: { text, at }, note: { text, at } })   a hypothesis on a case card, struck out and stamped (排除)
//   const B = R.board(L, { a, b })        evidence board: B.photo({ id, x, y, w, h, rot, at, label, draw(svg, { w, h }) | key }), B.note({ id, x, y, text, at }),
//       B.string(id1, id2, { at }), B.circle(id | { x, y, rx, ry }, { at }), B.cross(id, { at }), B.focus(id, s) → a camera key value
//   R.file(L, { a, b, title, x, y, w, rows: [{ label, value, at, bar }], stamp: { text, at }, src })   a typed case file (facts, numbers)
//   R.mark(L, { a, b, x, y, rx, ry, kind: 'circle' | 'arrow' | 'underline' | 'cross', to, color })   red marker on anything
//   R.lens(L, { a, b, x, y, s, r })       magnifier: the camera zooms on (x, y) inside a lens ring, the rest dims
//   R.beam(L, { a, b, keys: [[t, x, y]…], r })   a flashlight in the dark
//   R.countdown(L, { a, from, step, x, y, size, label }) → end time
//   R.witness(L, { a, b, x, y, s, name, role, quote, color })   an interviewee: cartoon silhouette, mosaic face, "声音已做处理"
//   const T = R.tape(L, { a })            replay a drawn scene: T.play(dur) T.slow(dur, rate) T.freeze(dur) T.rewind(toLocal, dur) … T.end() → end time;
//       props given { tape: T } run on the tape's clock (their times are tape-local)
//   R.truth(L, { a, b, kicker, main, sub })   the reveal: a bloom, warm rays, the music stops and comes back bright
//   R.reasons(L, { a, b, title, items: [{ icon, text, sub, at }] })   the plain explanation as illustrated cards
//   R.ident({ at, until, sub })   R.end({ a, b, main, sub, sources, notes, roll })
//   Props (SVG, cartoon): const S = R.svg(L); R.prop(S, name, { x, y, s, rot, a, b, move, bob, tape, sfx, …own options })
//       phone (chat or lock screen), envelope (red packet), friend (bean person: face, look, arms, wear, nod), calendar, scale (balance), bubble,
//       lantern, cake, gift, heart, box, qmark, coin, sparkle, magnifier, bird (pigeon: nod, peck, flap, coo), bread, bed, door, measure,
//       snack (crisps), book (closed / stack / open with lines), ticket. R.arrow(S, { from, to, bend | loop, a, label }) for diagrams. Add your own: R.props.name = (g, o, k) => handle
// Times: a = in, b = out. In a narrated film take them from the narration (T.start / T.end / T.word).
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('mystery.js 要在 promo.js 之后加载', 'mystery.js must load after promo.js'));
  const { E, seg, set, el } = P;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) if (attrs[k] !== undefined) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const rnd = (s) => window.EV.rng(s);
  const lerp = (a, b, q) => a + (b - a) * q;
  const f1 = (v) => v.toFixed(1);
  const INK = '#1d1b26';
  // smooth value noise in 0–1 (wobble, fog drift: smooth, never frame-to-frame spikes)
  const vnoise = (t, rate, seed) => { const x = t * rate, i = Math.floor(x), f = x - i, a = rnd(i * 131 + seed)(), b = rnd((i + 1) * 131 + seed)(); const s = f * f * (3 - 2 * f); return a + (b - a) * s; };
  // keys [[t, { numbers }, ease?]] → value at t; each stretch eased by the ease of the key it ends on (default cubicInOut)
  const keyed = (keys, t) => {
    if (!keys.length) return null;
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1, ez] = keys[i], q = (ez || E.cubicInOut)((t - t0) / Math.max(1e-6, t1 - t0)), o = { ...v0 };
      for (const k in v1) o[k] = lerp(v0[k] ?? v1[k], v1[k], q);
      return o;
    }
    return keys[keys.length - 1][1];
  };
  // Catmull-Rom through points → a smooth SVG path
  const smooth = (pts) => {
    let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
    }
    return d;
  };
  // a hand-drawn ellipse: a little more than one turn, the radius wandering (seeded) so no two marks look alike
  const roughEllipse = (cx, cy, rx, ry, seed = 1) => {
    const r = rnd(seed * 37 + 5), n = 30, turn = 1.14, a0 = -Math.PI * 0.62 + r() * 0.4, pts = [];
    for (let i = 0; i <= n; i++) { const q = i / n, an = a0 + q * turn * Math.PI * 2, w = 1 + (r() - 0.5) * 0.05 + q * 0.07; pts.push([cx + Math.cos(an) * rx * w, cy + Math.sin(an) * ry * w]); }
    return smooth(pts);
  };
  // text width in em (CJK 1, others ≈ .56) and a greedy wrap that keeps closing punctuation with the line before
  const wlen = (s) => [...s].reduce((n, c) => n + (/[⺀-￿]/.test(c) ? 1 : 0.56), 0);
  const wrap = (s, max) => {
    if (String(s).includes('\n')) return String(s).split('\n').flatMap((x) => wrap(x, max));
    const toks = String(s).match(/[A-Za-z0-9.,'%¥$+\-]+|\s+|./gu) || [], lines = [];
    let line = '';
    for (const tk of toks) { if (line && wlen(line + tk) > max) { lines.push(line.trimEnd()); line = tk.trimStart(); } else line += tk; }
    if (line) lines.push(line);
    for (let i = 1; i < lines.length; i++) while (/^[，。！？、：；」』）》…,.!?:;)]/.test(lines[i])) { lines[i - 1] += lines[i][0]; lines[i] = lines[i].slice(1); }
    return lines.filter(Boolean);
  };
  const shade = (hex, amt) => {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)));
    return '#' + c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  };
  const clockText = (base, sec) => {
    const d = new Date(Date.parse(String(base).replace(' ', 'T') + 'Z') + Math.floor(sec) * 1000), z = (n) => String(n).padStart(2, '0');
    return isNaN(d) ? String(base) : `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())} ${z(d.getUTCHours())}:${z(d.getUTCMinutes())}:${z(d.getUTCSeconds())}`;
  };

  P.mystery = function (F, opt = {}) {
    const PT = F.portrait, look = opt.look ?? 'tv', GA = opt.gate ?? (look === 'tv' ? 4 / 3 : 'full');
    // the picture: 4:3 in the middle of a landscape frame (black either side), across the width in portrait (title above, captions inside)
    const GW = GA === 'full' || PT ? F.W : Math.round(F.H * GA), GH = GA === 'full' ? F.H : PT ? Math.round(F.W / GA) : F.H;
    const GX = Math.round((F.W - GW) / 2), GY = GA === 'full' ? 0 : PT ? Math.round(F.H * 0.46 - GH / 2) : 0;
    const W = GW, H = GH, u = GA === 'full' ? F.u : GH / 1080, RW = Math.round(W / u), RH = Math.round(H / u);
    const gx = (v) => v * u;
    const gate = el('div', `left:${GX}px;top:${GY}px;width:${GW}px;height:${GH}px;overflow:hidden;z-index:5;background:#000;${look === 'tv' ? `border-radius:${f1(GH * 0.04)}px` : ''}`, F.stage);
    const C = { blue: '#1a23d8', hot: '#ff2b2b', night: '#0b0f17', navy: '#111a29', amber: '#f2c14e', red: '#e0453a', paper: '#f1e9d8', manila: '#e8d5ad', ink: INK, cream: '#fff4dc', fog: '#a9bccf', ...(opt.colors || {}) };
    const FONT = { brush: '"Ma Shan Zheng", "Noto Serif SC", serif', title: '"Noto Serif SC", "Songti SC", serif', sans: '"Noto Sans SC", "PingFang SC", sans-serif', hand: '"ZCOOL KuaiLe", "Noto Sans SC", sans-serif', mono: '"Share Tech Mono", "Noto Sans SC", monospace', ...(opt.fonts || {}) };
    const brand = { name: M('日常谜案', 'Ordinary Mysteries'), en: 'ORDINARY MYSTERIES', episode: '', ...(opt.brand || {}) };
    const R = { F, RW, RH, g: gx, portrait: PT, look, gate, colors: C, fonts: FONT, brand, ink: INK, el: svgEl };   // R.el(tag, attrs, parent): an SVG element of your own
    let uidN = 0;
    const uid = () => `mys${++uidN}`;
    F.stillMax(0.8);   // the reveal and the question card hold for a beat on purpose
    F.blurBase(1);     // mostly slow pushes: one sample per frame; the quick moves (slams, stamps, the lens, rewinds, jolts) register their own F.blur spans

    // ---------- grades ----------
    const GR = {
      blue: { filter: 'none', bg: `radial-gradient(ellipse at 50% 42%, ${shade(C.blue, 0.12)} 0%, ${C.blue} 52%, ${shade(C.blue, -0.32)} 100%)`, grain: 0.2, scan: 0.12, vig: 'tube' },
      paper: { filter: 'none', bg: '#ededed', grain: 0.16, scan: 0.1, vig: 'tube' },
      studio: { filter: 'none', bg: C.night, fog: true, grain: 0.16, scan: 0, vig: 'dark' },
      rebuild: { filter: 'saturate(.72) contrast(1.06) brightness(.94)', bg: '#1d2b30', tint: true, wobble: true, grain: 0.3, scan: 0, vig: 'cold', tag: true },
      cctv: { filter: 'grayscale(1) contrast(1.28) brightness(1.04)', bg: '#26292c', grain: 0.55, scan: 0.85, vig: 'dark', hud: 'cctv' },
      night: { filter: 'grayscale(1) brightness(1.15) contrast(1.32) sepia(1) hue-rotate(52deg) saturate(3.2)', bg: '#1b211b', grain: 0.6, scan: 0.45, vig: 'scope', hud: 'night' },
      truth: { filter: 'none', bg: '#fff1d2', grain: 0.07, scan: 0, vig: 'warm' },
      plain: { filter: 'none', bg: C.night, grain: 0.1, scan: 0, vig: 'none' },
    };
    const VIG = {
      dark: 'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 50%, rgba(0,0,0,.5) 82%, rgba(0,0,0,.78) 100%)',
      cold: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 42%, rgba(4,22,26,.55) 85%, rgba(2,10,12,.85) 100%)',
      scope: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,.6) 74%, rgba(0,0,0,.92) 92%)',
      warm: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(150,80,10,.16) 100%)',
      tube: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 58%, rgba(0,0,30,.32) 86%, rgba(0,0,12,.72) 100%)',
      none: 'none',
    };
    // grain: a few noise tiles made once, one per 1/24 s (texture, not motion)
    const NT = 6, tiles = [];
    const grainBox = el('div', `inset:0;z-index:600;pointer-events:none;mix-blend-mode:overlay;opacity:0`, gate); grainBox.dataset.motion = 'skip';
    for (let k = 0; k < NT; k++) {
      const cv = el('canvas', `inset:0;width:${W}px;height:${H}px;display:none`, grainBox); cv.width = Math.ceil(W / 3); cv.height = Math.ceil(H / 3); cv.dataset.motion = 'skip';
      const ctx = cv.getContext('2d'), img = ctx.createImageData(cv.width, cv.height), r = rnd(k * 7919 + 3);
      for (let i = 0; i < img.data.length; i += 4) { const v = (r() * 255) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      ctx.putImageData(img, 0, 0); tiles.push(cv);
    }
    const scan = el('div', `inset:0;z-index:601;pointer-events:none;opacity:0;background:repeating-linear-gradient(0deg, rgba(0,0,0,.3) 0 ${gx(2)}px, rgba(0,0,0,0) ${gx(2)}px ${gx(5)}px)`, gate); scan.dataset.motion = 'skip';
    const vig = el('div', 'inset:0;z-index:602;pointer-events:none', gate); vig.dataset.motion = 'skip';
    const flashL = el('div', 'inset:0;z-index:650;pointer-events:none;opacity:0;background:#fff', gate); flashL.dataset.motion = 'skip';
    const dipL = el('div', 'inset:0;z-index:651;pointer-events:none;opacity:0;background:#000', gate); dipL.dataset.motion = 'skip';
    const bloomL = el('div', 'inset:0;z-index:652;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 50%, #fffdf2 0%, #ffe9a6 45%, #ffcf6a 100%)', gate); bloomL.dataset.motion = 'skip';
    const flashes = [], dips = [], blooms = [];

    // ---------- shots ----------
    const shots = [];
    const shotOf = (node) => { for (let n = node; n; n = n.parentNode) if (n._shot) return n._shot; return null; };
    const winOf = (node, a, b) => { const s = shotOf(node); const A = a ?? (s ? s.a : 0), B = b ?? (s ? s.b : F.duration); return s ? [Math.max(A, s.a), Math.min(B, s.b)] : [A, B]; };
    R.shot = (a, b, o = {}) => {
      const grade = GR[o.grade] ? o.grade : look === 'tv' ? 'blue' : 'studio', G = GR[grade];
      const S = el('div', `left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;z-index:10;display:none;background:#000`, gate);
      const film = el('div', `inset:0;${G.filter !== 'none' ? `filter:${G.filter}` : ''}`, S);
      const wob = el('div', 'inset:0', film); wob.dataset.motion = 'texture';   // handheld wobble and jolts: camera texture, measured as if still
      const cam = el('div', `left:0;top:0;width:${W}px;height:${H}px;transform-origin:50% 50%`, wob);
      const L = el('div', `left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;background:${o.bg ?? G.bg}`, cam);
      const top = el('div', 'inset:0;pointer-events:none;z-index:30', S);   // above the picture, outside the camera and the grade: lower thirds
      const hud = el('div', `left:0;top:0;width:${W}px;height:${H}px;z-index:700;pointer-events:none;display:none`, gate);
      const rec = { a, b, S, film, L, cam, wob, top, hud, grade, keys: [], jolts: [], ticks: [], tags: { tl: 0, tr: 0, bl: 0, br: 0 } };
      L._shot = rec; S._shot = rec; hud._shot = rec;
      shots.push(rec);
      if (G.fog) {
        const fog = el('div', 'inset:0;pointer-events:none;opacity:.5', film); fog.dataset.motion = 'skip';   // plain alpha, not a blend mode: a full-frame blend is slow in software rendering
        const blobs = [0, 1, 2].map((i) => el('div', `left:0;top:0;width:${gx(1300)}px;height:${gx(760)}px;border-radius:50%;background:radial-gradient(closest-side, rgba(150,175,205,.2), rgba(150,175,205,0))`, fog));
        rec.ticks.push((t) => blobs.forEach((bl, i) => set(bl, { transform: `translate(${f1(gx(-300 + i * 620) + (vnoise(t, 0.08, 40 + i) - 0.5) * gx(500))}px,${f1(gx(RH * 0.15 + i * RH * 0.22) + (vnoise(t, 0.07, 50 + i) - 0.5) * gx(220) - gx(380))}px)` })));
      }
      if (G.tint) {
        el('div', 'inset:0;pointer-events:none;background:#1c8a92;mix-blend-mode:color;opacity:.26', film).dataset.motion = 'skip';
        el('div', 'inset:0;pointer-events:none;background:#6fa0a6;mix-blend-mode:multiply;opacity:.3', film).dataset.motion = 'skip';
      }
      if (o.cut !== false && a > 0.01) F.cut(a);
      if (o.push) R.cam(L, [[a, o.push.from || { s: 1, x: 0.5, y: 0.5 }], [b, o.push.to || { s: 1.08, x: 0.5, y: 0.5 }, E.sine]]);
      if (o.cam) R.cam(L, o.cam);
      if (G.tag && o.tag !== false) R.tag(L, typeof o.tag === 'string' ? o.tag : M('情景再现 · 示意', 'Reconstruction · illustrative'), { a, b, dot: true });
      if (G.hud) survHud(rec, o);
      return L;
    };
    R.cam = (L, keys) => { const s = shotOf(L); if (!s) return; s.keys.push(...keys); s.keys.sort((x, y) => x[0] - y[0]); };
    R.jolt = (L, at, amt = 1) => { const s = shotOf(L); if (s) s.jolts.push([at, amt]); F.blur(at, at + 0.45, 8); };
    R.flash = (at, dur = 0.32) => { flashes.push([at, dur]); F.transition(at, at + dur); F.sfx(at, 'shutter', 0.6); };
    R.dip = (a, b) => { dips.push([a, b]); F.transition(a, b); };
    let lastTile = -1;
    F.add((t) => {
      let cur = null;
      for (const s of shots) if (t >= s.a && t < s.b) cur = s;
      for (const s of shots) { const on = s === cur; set(s.S, { display: on ? '' : 'none' }); set(s.hud, { display: on ? '' : 'none' }); }
      const G = cur ? GR[cur.grade] : GR[look === 'tv' ? 'blue' : 'plain'];
      const k = Math.floor(t * 24 + 1e-6) % NT; if (k !== lastTile) { if (lastTile >= 0) tiles[lastTile].style.display = 'none'; tiles[k].style.display = ''; lastTile = k; }
      set(grainBox, { opacity: G.grain.toFixed(2) }); set(scan, { opacity: String(G.scan) }); set(vig, { background: VIG[G.vig] });
      let fl = 0; for (const [at, d] of flashes) if (t >= at && t < at + d) fl = Math.max(fl, 1 - (t - at) / d);
      set(flashL, { opacity: (fl * 0.9).toFixed(3) });
      let dp = 0; for (const [a, b] of dips) if (t >= a && t < b) dp = Math.max(dp, Math.sin(Math.PI * (t - a) / (b - a)));
      set(dipL, { opacity: dp.toFixed(3) });
      let bm = 0; for (const [at, d] of blooms) if (t >= at - 0.12 && t < at + d) bm = Math.max(bm, t < at ? (t - at + 0.12) / 0.12 : 1 - E.sine((t - at) / d));
      set(bloomL, { opacity: bm.toFixed(3) });
      if (!cur) return;
      const c = keyed(cur.keys, t) || { s: 1, x: 0.5, y: 0.5 };
      set(cur.cam, { transform: `translate(${f1((0.5 - c.x) * (c.s - 1) * W)}px,${f1((0.5 - c.y) * (c.s - 1) * H)}px) scale(${c.s.toFixed(4)})` });
      let dx = 0, dy = 0, rot = 0, sc = 1;
      if (G.wobble) { dx = (vnoise(t, 0.7, 11) - 0.5) * gx(16); dy = (vnoise(t, 0.6, 12) - 0.5) * gx(11); rot = (vnoise(t, 0.5, 13) - 0.5) * 0.8; sc = 1.035; }
      for (const [at, amt] of cur.jolts) if (t >= at && t < at + 0.45) { const q = 1 - (t - at) / 0.45, w = q * q * amt; dx += Math.sin(t * 90) * gx(18) * w; dy += Math.cos(t * 71) * gx(13) * w; }
      set(cur.wob, { transform: dx || dy || rot || sc !== 1 ? `translate(${f1(dx)}px,${f1(dy)}px) rotate(${rot.toFixed(3)}deg) scale(${sc})` : 'none' });
      for (const fn of cur.ticks) fn(t);
    });
    // narrated: captions in the show's type
    const tvCaps = look === 'tv' && F.T && F.voiced && !F.caps ? { font: FONT.title, weight: 700, bg: 'none', color: '#fff', size: PT ? 46 : 50, top: GY + GH * 0.8, shadow: '0 0 3px #000, 2px 2px 0 #000, -1px -1px 0 #000, 0 4px 10px rgba(0,0,0,.7)', ...(opt.captions || {}) } : null;
    R.capTop = tvCaps ? ((tvCaps.top - GY) / GH) * RH : RH;   // design y where the TV captions start: keep small stickers' feet and the chat's last bubble above it
    if (F.T && F.voiced && !F.caps) P.captions(F, tvCaps || { font: FONT.sans, weight: 700, bg: 'rgba(6,8,13,.74)', color: '#f6f2ea', ...(opt.captions || {}) });
    if (look === 'tv') {
      // film damage: a few light vertical scratches and dust, stepping at 12 fps (texture, skipped by the motion check)
      const dmg = el('canvas', `inset:0;width:${W}px;height:${H}px;z-index:603;pointer-events:none`, gate); dmg.dataset.motion = 'skip';
      dmg.width = Math.round(W / 2); dmg.height = Math.round(H / 2);
      const dc = dmg.getContext('2d'), Dm = opt.damage ?? 1;
      F.add((t) => {
        const fi = Math.floor(t * 12 + 1e-6), r = rnd(fi * 17 + 3); dc.clearRect(0, 0, dmg.width, dmg.height);
        const ep = Math.floor(t * 1.5), re = rnd(ep * 911 + 7), n = re() < 0.7 * Dm ? 1 + Math.floor(re() * 2) : 0;
        for (let q = 0; q < n; q++) { const x = re() * dmg.width, a2 = 0.12 + re() * 0.2; dc.strokeStyle = `rgba(230,235,255,${a2})`; dc.lineWidth = 0.6 + re(); dc.beginPath(); dc.moveTo(x + (r() - 0.5) * 2, 0); dc.lineTo(x + (r() - 0.5) * 3, dmg.height); dc.stroke(); }
        for (let q = 0, m = Math.floor(r() * 4 * Dm); q < m; q++) { const sz = 0.8 + r() * 2.4; dc.fillStyle = r() < 0.7 ? `rgba(245,245,255,${0.4 + r() * 0.4})` : `rgba(0,0,20,${0.4 + r() * 0.3})`; dc.beginPath(); dc.ellipse(r() * dmg.width, r() * dmg.height, sz, sz * (0.5 + r()), r() * 3, 0, 7); dc.fill(); }
      });
      if (opt.mark !== false) { const mk = el('div', `left:${gx(26)}px;top:${gx(18)}px;z-index:690;font:700 ${gx(38)}px/1.2 ${FONT.title};color:rgba(255,255,255,.82);text-shadow:0 0 ${gx(3)}px rgba(0,0,0,.8);white-space:nowrap`, gate, brand.name); F.text(mk, 'label', brand.name, 0, F.duration, { noFact: true, chrome: true, overlap: true }); }
      if (opt.disclaimer !== false) {
        const dt = opt.disclaimer || M('虚构内容　仅供娱乐　请勿对号入座', 'Fiction · for fun only · any resemblance is coincidental');
        const crawl = el('div', `left:0;top:${gx(RH - 52)}px;z-index:690;white-space:nowrap;font:500 ${gx(26)}px/1.2 ${FONT.sans};color:rgba(255,255,255,.85);text-shadow:0 0 ${gx(3)}px #000`, gate, `${dt}　　　　${dt}　　　　${dt}`); crawl.dataset.motion = 'skip';
        F.text(crawl, 'label', dt, 0, F.duration, { noFact: true, chrome: true, overlap: true });
        F.add((t) => set(crawl, { transform: `translateX(${f1(gx(RW * 0.55) - ((t * gx(70)) % (gx(RW) * 1.2)))}px)` }));
      }
      if (PT && opt.title) { const tt = el('div', `left:${F.px(60)}px;right:${F.px(60)}px;top:${f1(GY - F.px(300))}px;text-align:center;font:900 ${F.px(72)}px/1.3 ${FONT.title};color:#fff`, F.stage, opt.title); F.text(tt, 'label', opt.title, 0, F.duration, { overlap: true }); }
    }

    // ---------- type ----------
    const typed = [];
    R.text = (parent, html, o = {}) => {
      const { x = 0, y = 0, size = 56, font = FONT.sans, weight = 900, color = '#fff', anchor = 'l', w, kind = 'label', text, bg, pad = 0.3, ls = '.02em', noFact, overlap, chrome, enter = 'fade', shadow = true, lh = 1.25, z } = o;
      const [a, b] = winOf(parent, o.a, o.b);
      const left = anchor === 'c' ? `left:${gx(x - (w ?? RW * 2) / 2)}px;width:${gx(w ?? RW * 2)}px;text-align:center` : anchor === 'r' ? `left:${gx(x - (w ?? RW * 2))}px;width:${gx(w ?? RW * 2)}px;text-align:right` : `left:${gx(x)}px;${w ? `width:${gx(w)}px` : ''}`;
      const box = el('div', `${left};top:${gx(y)}px;opacity:0;${z ? `z-index:${z}` : ''}`, parent);
      const s = el('span', `position:relative;display:inline-block;font:${weight} ${gx(size)}px/${lh} ${font};letter-spacing:${ls};color:${color};white-space:${w ? 'normal' : 'nowrap'};${bg ? `background:${bg};padding:${gx(size * pad * 0.5)}px ${gx(size * pad)}px;border-radius:${gx(size * 0.12)}px` : ''};${shadow && !bg ? `text-shadow:0 ${gx(3)}px ${gx(16)}px rgba(0,0,0,.5)` : ''}`, box, html);
      const full = text ?? s.textContent;
      F.text(s, kind, full, a, b, { noFact, overlap, chrome });
      if (enter === 'type') {
        const chars = [...s.textContent], dur = Math.min(1.2, chars.length / 16);
        s.textContent = ''; typed.push(s);
        F.sfx(a, 'type', 0.42, { dur });
        F.add((t) => { const n = Math.ceil(chars.length * seg(t, a, a + dur)); const v = chars.slice(0, n).join(''); if (s.textContent !== v) s.textContent = v; set(box, { opacity: t >= a && t < b ? 1 : 0 }); });
      } else if (enter === 'slam') {
        F.blur(a, a + 0.18, 8);
        F.add((t) => { const q = seg(t, a, a + 0.16, E.expoOut); set(box, { opacity: t >= a && t < b ? 1 : 0, transform: `scale(${(1.45 - 0.45 * q).toFixed(3)})` }); });
      } else F.add((t) => { const q = seg(t, a, a + 0.2, E.cubicInOut); set(box, { opacity: t >= a && t < b ? q.toFixed(3) : 0, transform: `translateY(${f1(gx(14) * (1 - q))}px)` }); });
      return s;
    };
    // a sharp chip in a corner of the shot's HUD (above the grade and the grain): "情景再现 · 示意", "监控画面", a source
    R.tag = (L, text, o = {}) => {
      const s0 = shotOf(L); if (!s0) return null;
      const corner = (o.bottom ? 'b' : 't') + (o.right ? 'r' : 'l'), row = s0.tags[corner]++;
      const [a, b] = [Math.max(o.a ?? s0.a, s0.a), Math.min(o.b ?? s0.b, s0.b)];
      const pos = `${o.right ? 'right' : 'left'}:${gx(40)}px;${o.bottom ? 'bottom' : 'top'}:${gx(36 + row * 56)}px`;
      const box = el('div', `${pos};display:none`, s0.hud);
      const chip = el('span', `position:relative;display:inline-flex;align-items:center;gap:${gx(10)}px;font:700 ${gx(26)}px/1.2 ${FONT.sans};color:#fff;background:rgba(0,0,0,.55);padding:${gx(7)}px ${gx(16)}px;border-radius:${gx(6)}px;letter-spacing:.06em;white-space:nowrap`, box);
      if (o.dot) el('i', `position:relative;display:inline-block;width:${gx(14)}px;height:${gx(14)}px;border-radius:50%;background:${C.red}`, chip);
      el('span', 'position:relative', chip, text);
      F.text(chip, 'label', text, a, b, { noFact: true, chrome: true });
      F.add((t) => set(box, { display: t >= a && t < b ? '' : 'none' }));
      return chip;
    };
    R.stamp = (parent, html, o = {}) => {
      const { x = 0, y = 0, size = 80, rot = -8, color = C.red, text } = o, [a, b] = winOf(parent, o.a, o.b);
      const box = el('div', `left:${gx(x)}px;top:${gx(y)}px;width:0;height:0;opacity:0;z-index:30`, parent);
      const s = el('span', `position:absolute;left:0;top:0;transform:translate(-50%,-50%);display:inline-block;font:900 ${gx(size)}px/1.05 ${FONT.title};letter-spacing:.12em;color:${color};white-space:nowrap;border:${gx(size * 0.08)}px double ${color};padding:${gx(size * 0.08)}px ${gx(size * 0.28)}px;border-radius:${gx(size * 0.1)}px;background:rgba(255,255,255,.04)`, box, html);
      F.text(s, 'label', text ?? s.textContent, a, b, { overlap: true });
      F.sfx(a, 'stamp', 0.65); F.blur(a, a + 0.16, 8);
      F.add((t) => { const q = seg(t, a, a + 0.14, E.expoOut); set(box, { opacity: t >= a && t < b ? 0.94 : 0, transform: `rotate(${rot}deg) scale(${(1.7 - 0.7 * q).toFixed(3)})` }); });
      return s;
    };
    R.lower = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b), x = o.x ?? (PT ? 70 : 96), y = o.y ?? (PT ? RH * 0.58 : RH - 330);
      const s0 = shotOf(L), box = el('div', `left:${gx(x)}px;top:${gx(y)}px;opacity:0;z-index:40`, s0 && L === s0.L ? s0.top : L);
      el('div', `left:0;top:0;width:${gx(10)}px;height:${gx(o.sub ? 140 : 76)}px;background:${C.amber}`, box);
      const t1 = el('div', `left:${gx(30)}px;top:0;white-space:nowrap;font:900 ${gx(58)}px/1.25 ${FONT.sans};color:#fff;text-shadow:0 ${gx(3)}px ${gx(14)}px rgba(0,0,0,.6)`, box, o.title);
      F.text(t1, 'label', o.title, a, b);
      if (o.sub) { const t2 = el('div', `left:${gx(30)}px;top:${gx(94)}px;white-space:nowrap;font:700 ${gx(34)}px/1.2 ${FONT.sans};color:${C.amber};letter-spacing:.06em`, box, o.sub); F.text(t2, 'label', o.sub, a + 0.15, b); }
      F.add((t) => { const q = seg(t, a, a + 0.3, E.cubicInOut); set(box, { opacity: t >= a && t < b ? q.toFixed(3) : 0, transform: `translateX(${f1(gx(-40) * (1 - q))}px)` }); });
      return box;
    };

    // ---------- cards ----------
    // a huge, faint question mark that sways behind type (the show's mark of doubt)
    const bigMark = (L, a, b, o = {}) => {
      const m = el('div', `left:${gx(o.x ?? RW * 0.5)}px;top:${gx(o.y ?? RH * 0.5)}px;width:0;height:0`, L);
      el('span', `position:absolute;left:0;top:0;transform:translate(-50%,-55%);font:900 ${gx(o.size ?? (PT ? 1100 : 1000))}px/1 ${FONT.title};color:${o.color ?? 'rgba(242,193,78,.08)'}`, m, '?');
      F.add((t) => set(m, { transform: `rotate(${(Math.sin((t - a) * 0.9) * 5).toFixed(2)}deg)` }));
      return m;
    };
    R.question = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b), text = o.text ?? M('这究竟是怎么回事？', 'What on earth is going on?');
      set(L, { background: '#06080d' });
      bigMark(L, a, b);
      const wd = PT ? RW - 140 : RW - 200, sz0 = o.size ?? (PT ? 116 : 128), sz = wlen(text) <= 12 ? Math.min(sz0, wd / wlen(text)) : sz0, lines = Math.ceil((wlen(text) * sz) / wd);
      R.text(L, text, { anchor: 'c', x: RW / 2, y: RH / 2 - (sz * 1.22 * lines) / 2 - (o.sub ? 44 : 0), w: wd, size: sz, font: FONT.title, weight: 900, color: '#f6f0e2', a: a + 0.05, b, kind: 'headline', ls: '.05em', lh: 1.22 });
      if (o.sub) R.text(L, o.sub, { anchor: 'c', x: RW / 2, y: RH / 2 + (sz * 1.22 * lines) / 2 + 10, w: wd, size: 46, weight: 700, color: C.amber, a: a + 0.45, b, ls: '.12em' });
      R.cam(L, [[a, { s: 1, x: 0.5, y: 0.5 }], [b, { s: 1.07, x: 0.5, y: 0.5 }, E.sine]]);
      F.sfx(a + 0.05, 'sting', 0.9); F.musicCue(a + 0.05, 'hit');
      if (o.drop !== false) F.scene(a, b, { role: 'drop' });   // words only, on purpose
    };
    R.card = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b);
      set(L, { background: '#080b12' });
      const y0 = RH / 2 - (o.sub ? 120 : 80);
      if (o.kicker) {
        R.text(L, o.kicker, { anchor: 'c', x: RW / 2, y: y0 - 90, size: 40, font: FONT.mono, weight: 400, color: C.amber, a, b, ls: '.3em', noFact: !!o.kickerDecor });
        const ln = el('div', `left:${gx(RW / 2 - 260)}px;top:${gx(y0 - 26)}px;width:${gx(520)}px;height:${gx(3)}px;background:${C.amber};transform-origin:50% 50%`, L);
        F.add((t) => set(ln, { transform: `scaleX(${seg(t, a + 0.1, a + 0.5, E.cubicInOut).toFixed(3)})` }));
      }
      R.text(L, o.title, { anchor: 'c', x: RW / 2, y: y0, w: RW - 160, size: o.size ?? (PT ? 104 : 120), font: FONT.title, weight: 900, color: '#f6f0e2', a: a + 0.2, b, kind: 'headline', ls: '.06em' });
      if (o.sub) R.text(L, o.sub, { anchor: 'c', x: RW / 2, y: y0 + 190, w: RW - 160, size: 46, weight: 700, color: '#b9c3cf', a: a + 0.5, b });
      R.cam(L, [[a, { s: 1.04, x: 0.5, y: 0.5 }], [b, { s: 1, x: 0.5, y: 0.5 }, E.sine]]);
      F.sfx(a + 0.2, 'boom', 0.6);
    };
    R.theory = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b);
      const cw = o.w ?? (PT ? RW - 120 : 1180), ch = o.h ?? (PT ? 640 : 560), cx = o.x ?? (RW - cw) / 2, cy = o.y ?? (RH - ch) / 2 - (PT ? 120 : 30);
      const card = el('div', `left:${gx(cx)}px;top:${gx(cy)}px;width:${gx(cw)}px;height:${gx(ch)}px;opacity:0;z-index:20;box-sizing:border-box;background-color:${C.manila};border:${gx(5)}px solid ${INK};border-radius:${gx(10)}px;box-shadow:${gx(14)}px ${gx(18)}px 0 rgba(0,0,0,.35)`, L);
      el('div', `inset:0;pointer-events:none;background:repeating-linear-gradient(0deg, rgba(120,90,40,.12) 0 ${gx(2)}px, rgba(0,0,0,0) ${gx(2)}px ${gx(76)}px)`, card);   // ruled lines (a child, so the contrast check reads the card's own colour)
      el('div', `left:${gx(36)}px;top:${gx(-50)}px;width:${gx(300)}px;height:${gx(52)}px;background:${shade(C.manila, -0.08)};border:${gx(5)}px solid ${INK};border-bottom:none;border-radius:${gx(16)}px ${gx(16)}px 0 0`, card);
      const tab = el('div', `left:${gx(66)}px;top:${gx(-40)}px;font:700 ${gx(32)}px/1.4 ${FONT.mono};color:${INK};letter-spacing:.2em;white-space:nowrap`, card, M('调查档案', 'CASE FILE'));
      F.text(tab, 'label', tab.textContent, a, b, { noFact: true, chrome: true });
      if (o.n) R.text(card, o.n, { x: 70, y: 60, size: 50, font: FONT.sans, weight: 900, color: shade(C.red, -0.3), a: a + 0.15, b, shadow: false, ls: '.12em', enter: 'type' });
      const big = o.size ?? (PT ? 120 : 132), my = o.n ? 160 : 120;
      const main = R.text(card, o.text, { x: 70, y: my, w: cw - 140, size: big, font: FONT.title, weight: 900, color: INK, a: o.mainAt ?? a + (o.n ? 0.2 : 0.1), b, kind: 'headline', shadow: false, lh: 1.15 });
      if (o.out) {
        const at = o.out.at, ln = el('div', `left:${gx(60)}px;top:${gx(my + big * 0.62)}px;width:${gx(Math.min(cw - 120, wlen(o.text) * big + 30))}px;height:${gx(14)}px;background:${C.red};border-radius:${gx(7)}px;transform-origin:0 50%;transform:scaleX(0) rotate(-2deg);z-index:5`, card);
        F.add((t) => set(ln, { transform: `scaleX(${seg(t, at, at + 0.22, E.cubicInOut).toFixed(3)}) rotate(-2deg)` }));
        F.sfx(at, 'pen', 0.55, { dur: 0.22 });
        R.stamp(card, o.out.text ?? M('排除', 'RULED OUT'), { x: cw - (PT ? 220 : 250), y: my + big * 0.6, size: PT ? 92 : 104, rot: -12, a: at + 0.2, b });
        F.info('mark', at, b);
      }
      if (o.note) R.text(card, o.note.text, { x: 70, y: ch - 130, w: cw - 140, size: PT ? 42 : 46, weight: 700, color: '#4a3f2c', a: o.note.at, b, shadow: false });
      F.sfx(a, 'paper', 0.4, { dur: 0.3 });
      F.add((t) => { const q = seg(t, a, a + 0.3, E.cubicInOut); set(card, { opacity: t >= a && t < b ? q.toFixed(3) : 0, transform: `translateY(${f1(gx(40) * (1 - q))}px) rotate(${(-1.2 + (1 - q) * 3).toFixed(2)}deg)` }); });
      return { card, main };
    };

    // ---------- the TV look: title, numbered point, chat screen, word storm, test card ----------
    const outline = (w, c = '#000') => [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]].map(([dx, dy]) => `${f1(gx(w * dx))}px ${f1(gx(w * dy))}px 0 ${c}`).join(',');
    // characters that come in one by one (each pops from a little larger): the title and the points are "written" on
    const charsIn = (parent, html, a, b, per, o = {}) => {
      let i = 0;
      for (const part of String(html).split(/(<em>.*?<\/em>)/)) {
        const hot = /^<em>/.test(part);
        for (const ch of [...part.replace(/<\/?em>/g, '')]) {
          const at = a + i++ * per, sp = el('span', `position:relative;display:inline-block;opacity:0;${hot ? `color:${o.hot ?? C.hot}` : ''}`, parent, ch === ' ' ? '&nbsp;' : ch);
          F.add((t) => { const q = seg(t, at, at + (o.dur ?? 0.12), E.backOut); set(sp, { opacity: t >= at && t < b ? Math.min(1, seg(t, at, at + 0.05)).toFixed(3) : 0, transform: `scale(${((o.from ?? 1.4) - ((o.from ?? 1.4) - 1) * q).toFixed(3)})` }); });
        }
      }
      return i;
    };
    // the title card: big white serif with a black outline, words in <em> in red, written on character by character
    R.title = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b), lines = [].concat(o.lines ?? o.text), plain = lines.map((x) => String(x).replace(/<\/?em>/g, ''));
      const size = o.size ?? Math.min(150, (RW - 120) / Math.max(...plain.map(wlen))), lh = 1.45, y0 = RH / 2 - (lines.length * size * lh) / 2 - (o.dy ?? 20);
      const wrapEl = el('div', `left:0;width:${W}px;top:${gx(y0)}px;text-align:center`, L);   // one title, however many lines
      let n = 0;
      lines.forEach((ln) => {
        const box = el('div', `position:relative;white-space:nowrap;font:900 ${gx(size)}px/${lh} ${FONT.title};color:#fff;letter-spacing:.04em;text-shadow:${outline(4)},${gx(5)}px ${gx(8)}px ${gx(12)}px rgba(0,0,30,.7)`, wrapEl);
        n += charsIn(box, ln, a + 0.1 + n * (o.per ?? 0.07), b, o.per ?? 0.07);
      });
      F.text(wrapEl, 'headline', plain.join(''), a + 0.1, b);
      F.sfx(a + 0.1, 'type', 0.5, { dur: n * (o.per ?? 0.07) });
      F.musicCue(a + 0.05, 'hit');
      R.cam(L, [[a, { s: 1.05, x: 0.5, y: 0.5 }], [b, { s: 1, x: 0.5, y: 0.5 }, E.sine]]);
    };
    // a numbered point ("一.专注力不足"): brush script, faint at first, written on left to right
    R.point = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b), text = (o.n ? `${o.n}.` : '') + o.text, size = o.size ?? Math.min(116, (RW - 200) / (wlen(text) * 1.12));   // 1.12: the letter-spacing
      const box = el('div', `left:0;width:${W}px;top:${gx(RH / 2 - size * 0.7 + (o.dy ?? 0))}px;text-align:center;white-space:nowrap;font:400 ${gx(size)}px/1.3 ${FONT.brush};color:#fff;letter-spacing:.12em;text-shadow:${outline(3, '#05083a')},${gx(4)}px ${gx(6)}px ${gx(8)}px rgba(0,0,30,.6)`, L);
      const n = charsIn(box, text, a + 0.15, b, o.per ?? 0.09, { from: 1.15, dur: 0.2 });
      F.text(box, 'headline', text, a + 0.15, b);
      F.add((t) => set(box, { opacity: (0.35 + 0.65 * seg(t, a, a + 0.15 + n * (o.per ?? 0.09))).toFixed(3) }));
      F.sfx(a + 0.15, 'brush', 0.55, { dur: n * (o.per ?? 0.09) });
      R.cam(L, [[a, { s: 1, x: 0.5, y: 0.5 }], [b, { s: 1.06, x: 0.5, y: 0.5 }, E.sine]]);
    };
    // a chat screen filling the picture: bubbles with cartoon avatars, "5分钟后", the input bar; messages arrive and push the thread up
    const avatarSvg = (parent, spec, sz) => {
      const sp = { color: '#ffb35c', ...(typeof spec === 'string' ? { color: spec } : spec || {}) }, sv = svgEl('svg', { viewBox: '-50 -50 100 100', width: gx(sz), height: gx(sz), style: 'position:absolute;left:0;top:0' }, parent);
      svgEl('rect', { x: -50, y: -50, width: 100, height: 100, rx: 12, fill: sp.bg || '#cfd8e6' }, sv);
      if (sp.ears) for (const sd of [-1, 1]) svgEl('ellipse', { cx: sd * 18, cy: -32, rx: 9, ry: 22, fill: sp.color, stroke: INK, 'stroke-width': 3 }, sv);
      svgEl('circle', { cx: 0, cy: 8, r: 34, fill: sp.color, stroke: INK, 'stroke-width': 3 }, sv);
      if (sp.hair) svgEl('path', { d: 'M-34,0 C-36,-36 36,-36 34,0 C24,-16 -24,-16 -34,0 Z', fill: sp.hair, stroke: INK, 'stroke-width': 3 }, sv);
      for (const sd of [-1, 1]) { svgEl('ellipse', { cx: sd * 12, cy: 6, rx: 6, ry: 7.5, fill: '#fff', stroke: INK, 'stroke-width': 2.5 }, sv); svgEl('circle', { cx: sd * 12 + 1.5, cy: 7, r: 3, fill: INK }, sv); }
      svgEl('path', { d: 'M-9,22 Q0,29 9,22', fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, sv);
    };
    R.chat = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b), FS = o.size ?? 72, AV = 116, BAR = 120, top0 = 60, gap = 40, maxW = RW * 0.7;
      set(L, { background: o.bg ?? '#ededed' });
      const list = el('div', `left:0;top:0;width:${W}px;height:${H}px`, L);
      const bar = el('div', `left:0;right:0;bottom:0;height:${gx(BAR)}px;background:#f7f7f7;border-top:${gx(2)}px solid #d6d6d6;z-index:5`, L);
      const ico = (x, d) => { const sv = svgEl('svg', { viewBox: '-30 -30 60 60', width: gx(60), height: gx(60), style: `position:absolute;left:${gx(x)}px;top:${gx(30)}px` }, bar); svgEl('circle', { r: 26, fill: 'none', stroke: '#333', 'stroke-width': 3.5 }, sv); svgEl('path', { d, fill: 'none', stroke: '#333', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, sv); };
      ico(26, 'M-6,-12 Q6,0 -6,12 M2,-18 Q16,0 2,18');
      el('div', `left:${gx(106)}px;right:${gx(200)}px;top:${gx(24)}px;height:${gx(72)}px;background:#fff;border-radius:${gx(10)}px`, bar);
      ico(RW - 176, 'M-11,-6 l0,0 M11,-6 l0,0 M-12,8 Q0,18 12,8');
      ico(RW - 92, 'M-13,0 L13,0 M0,-13 L0,13');
      const msgs = o.messages || [], lay = [];
      let cy = top0;
      for (const m of msgs) {
        const kind = m.kind || 'text', mine = m.who === 'me', lines = kind === 'time' ? [m.text] : wrap(m.text, (maxW - 56) / FS);
        const h = kind === 'time' ? FS * 0.62 + 24 : Math.max(AV, lines.length * FS * 1.3 + 34);
        lay.push({ m, kind, mine, lines, y: cy, h }); cy += h + gap;
      }
      const bottom = Math.min(RH - BAR, R.capTop) - 24, offs = []; let prev = 0;   // the newest bubble stays above the captions
      lay.forEach((x) => { const tgt = Math.max(0, x.y + x.h - bottom); offs.push([x.m.at ?? a, prev, tgt]); prev = tgt; });
      const scrollAt = (t) => { let v = 0; for (const [at, p0, p1] of offs) if (t >= at) v = lerp(p0, p1, seg(t, at - 0.1, at + 0.45, E.cubicInOut)); return v; };   // the thread starts moving up just before the new message lands
      for (const x of lay) {
        const at = x.m.at ?? a, row = el('div', `left:0;top:${gx(x.y)}px;width:${W}px;height:${gx(x.h)}px;opacity:0`, list);
        if (x.kind === 'time') {
          const tt = el('div', `left:0;right:0;top:${gx(8)}px;text-align:center;font:500 ${gx(FS * 0.62)}px/1.2 ${FONT.sans};color:#767676`, row, x.m.text);
          F.text(tt, 'label', x.m.text, at, b);
        } else {
          const av = el('div', `${x.mine ? 'right' : 'left'}:${gx(30)}px;top:0;width:${gx(AV)}px;height:${gx(AV)}px`, row);
          avatarSvg(av, (o.avatars || {})[x.mine ? 'me' : 'them'] || (x.mine ? { color: '#ffd0e0', ears: true, bg: '#e6eef7' } : { color: '#f2c9a0', hair: '#4a3426' }), AV);
          const bw = Math.max(...x.lines.map(wlen)) * FS + 56, side = x.mine ? `right:${gx(30 + AV + 26)}px` : `left:${gx(30 + AV + 26)}px`, fill = x.mine ? (o.green ?? '#95ec69') : '#fff';
          const bub = el('div', `${side};top:0;width:${gx(bw)}px;padding:${gx(17)}px ${gx(28)}px;box-sizing:border-box;background:${fill};border-radius:${gx(12)}px;font:400 ${gx(FS)}px/1.3 ${FONT.sans};color:#111;white-space:nowrap`, row, x.lines.join('<br>'));
          el('div', `${x.mine ? 'right' : 'left'}:${gx(-12)}px;top:${gx(30)}px;width:${gx(24)}px;height:${gx(24)}px;background:${fill};transform:rotate(45deg)`, bub);
          F.text(bub, 'label', x.m.text, at, b);
          if (x.m.at !== undefined) F.sfx(at, x.mine ? 'pop' : 'msg', x.mine ? 0.42 : 0.55);
        }
        F.add((t) => { const q = seg(t, at, at + 0.3, E.backOut); set(row, { opacity: t >= at ? Math.min(1, seg(t, at, at + 0.12)).toFixed(3) : 0, transform: `translateY(${f1(-gx(scrollAt(t)))}px) scale(${(0.92 + 0.08 * q).toFixed(3)})`, transformOrigin: x.mine ? '100% 0' : '0 0' }); });
      }
      F.info('ui', a, b);
      return { list, lay };
    };
    // a storm of words around the subject (what the friend keeps saying): big pale serif, some vertical, each slammed in
    const STORM = [[0.03, 0.05, 1, 0], [0.4, 0.07, 0.72, 0], [0.86, 0.04, 1, 1], [0.04, 0.3, 1.3, 1], [0.66, 0.34, 1, 1], [0.2, 0.66, 0.8, 0], [0.62, 0.72, 0.78, 0], [0.02, 0.82, 0.7, 0]];
    R.storm = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b), base = o.size ?? 118;
      (o.words || []).forEach((w0, i) => {
        const w = typeof w0 === 'string' ? { text: w0 } : w0, sl = STORM[i % STORM.length], at = w.at ?? a + 0.2 + i * (o.per ?? 0.22);
        const x = w.x ?? sl[0] * RW, y = w.y ?? sl[1] * RH, sz = w.size ?? base * sl[2], vert = w.v ?? !!sl[3];
        const box = el('div', `left:${gx(x)}px;top:${gx(y)}px;opacity:0;z-index:${o.z ?? 1};white-space:nowrap;background:rgba(0,0,0,.004);${vert ? 'writing-mode:vertical-rl;text-orientation:upright;' : ''}font:900 ${gx(sz)}px/1.1 ${FONT.title};color:${o.color ?? 'rgba(214,220,255,.86)'};letter-spacing:.04em;text-shadow:${gx(3)}px ${gx(5)}px ${gx(6)}px rgba(0,0,40,.55)`, L, w.text);
        F.text(box, 'label', w.text, at, b, { overlap: true });
        F.sfx(at, 'pop', 0.42); F.blur(at, at + 0.16, 8);
        F.add((t) => { const q = seg(t, at, at + 0.16, E.expoOut); set(box, { opacity: t >= at && t < b ? 1 : 0, transform: `scale(${(1.35 - 0.35 * q).toFixed(3)})` }); });
      });
      F.info('quote', a, b);
    };
    // the end of the broadcast: a test card and its tone; the music is cut (musicCue 'off')
    R.testcard = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b), sv = R.svg(L, { z: 2 }), cx = RW / 2, cy = RH / 2, r = RH * 0.44;
      set(L, { background: '#8d8d8d' });
      for (let x = 0; x <= RW; x += 90) svgEl('line', { x1: x, y1: 0, x2: x, y2: RH, stroke: '#e8e8e8', 'stroke-width': 4 }, sv);
      for (let y = 0; y <= RH; y += 90) svgEl('line', { x1: 0, y1: y, x2: RW, y2: y, stroke: '#e8e8e8', 'stroke-width': 4 }, sv);
      const side = ['#1d3fd8', '#d8d820', '#20c8c8', '#22b84a'];
      side.forEach((c, i) => { svgEl('rect', { x: 0, y: 90 + i * 225, width: 90, height: 225, fill: c }, sv); svgEl('rect', { x: RW - 90, y: 90 + i * 225, width: 90, height: 225, fill: side[3 - i] }, sv); });
      const id = uid(); const cp = svgEl('clipPath', { id }, svgEl('defs', {}, sv)); svgEl('circle', { cx, cy, r }, cp);
      const g = svgEl('g', { 'clip-path': `url(#${id})` }, sv);
      svgEl('rect', { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r, fill: '#222' }, g);
      const bars = ['#f2f2f2', '#e8e020', '#20d0d0', '#20c040', '#d020c8', '#e02020', '#2030d0', '#101010'], bw = (2 * r) / bars.length;
      bars.forEach((c, i) => svgEl('rect', { x: cx - r + i * bw, y: cy - r * 0.62, width: bw + 1, height: r * 0.62, fill: c }, g));
      for (let i = 0; i < 12; i++) svgEl('rect', { x: cx - r + (i * 2 * r) / 12, y: cy, width: (2 * r) / 12 + 1, height: r * 0.18, fill: i % 2 ? '#fff' : '#000' }, g);
      for (let i = 0; i < 6; i++) svgEl('rect', { x: cx - r + (i * 2 * r) / 6, y: cy + r * 0.18, width: (2 * r) / 6 + 1, height: r * 0.3, fill: `rgb(${i * 51},${i * 51},${i * 51})` }, g);
      for (let i = 0; i < 40; i++) svgEl('rect', { x: cx - r * 0.6 + i * r * 0.03, y: cy + r * 0.48, width: r * 0.015, height: r * 0.3, fill: '#fff' }, g);
      svgEl('rect', { x: cx - r, y: cy - r, width: 2 * r, height: r * 0.38, fill: '#e8e8e8' }, g);
      svgEl('line', { x1: cx, y1: cy - r, x2: cx, y2: cy + r, stroke: '#fff', 'stroke-width': 6 }, g);
      svgEl('circle', { cx, cy, r, fill: 'none', stroke: '#fff', 'stroke-width': 8 }, sv);
      if (o.text) { const tx = svgEl('text', { x: cx, y: cy - r * 0.72, 'text-anchor': 'middle', 'font-family': FONT.title, 'font-weight': 900, 'font-size': 70, fill: '#111' }, sv); tx.textContent = o.text; F.text(tx, 'label', o.text, a, b, { overlap: true }); }
      F.sfx(a, 'tone', 0.7, { dur: Math.max(0.3, b - a - 0.1) });
      F.musicCue(a, 'off');
      F.scene(a, b, { end: true });
      F.appear(a);
    };

    // ---------- SVG canvases and red marker ----------
    R.svg = (L, o = {}) => svgEl('svg', { viewBox: `0 0 ${RW} ${RH}`, width: W, height: H, style: `position:absolute;left:0;top:0;overflow:visible;z-index:${o.z ?? 2}` }, L);
    const drawOn = (e, at, dur) => {
      F.prep(() => { const len = e.getTotalLength ? e.getTotalLength() : 1000; e.setAttribute('stroke-dasharray', `${len} ${len + 10}`); e._len = len; e.setAttribute('stroke-dashoffset', len); });
      F.add((t) => { const len = e._len ?? 1000; e.setAttribute('stroke-dashoffset', f1(len * (1 - seg(t, at, at + dur, E.cubicInOut)))); });
      return e;
    };
    R.drawOn = drawOn;
    let markN = 0;
    const markPaths = (o) => {
      const { x = 0, y = 0, rx = 120, kind = 'circle' } = o, ry = o.ry ?? rx * 0.7, sd = ++markN;
      if (kind === 'circle') return [roughEllipse(x, y, rx, ry, sd)];
      if (kind === 'underline') { const r = rnd(sd); return [smooth([[x - rx, y + r() * 6], [x - rx * 0.3, y - 4 + r() * 8], [x + rx * 0.4, y + r() * 8], [x + rx, y - 6]])]; }
      if (kind === 'cross') return [`M${x - rx},${y - ry} L${x + rx},${y + ry}`, `M${x + rx},${y - ry} L${x - rx},${y + ry}`];
      if (kind === 'arrow') {
        const [tx, ty] = o.to || [x + 200, y], mx = (x + tx) / 2 + (ty - y) * 0.18, my = (y + ty) / 2 - (tx - x) * 0.18, an = Math.atan2(ty - my, tx - mx), hl = 34;
        return [`M${f1(x)},${f1(y)} Q${f1(mx)},${f1(my)} ${f1(tx)},${f1(ty)}`, `M${f1(tx - hl * Math.cos(an - 0.5))},${f1(ty - hl * Math.sin(an - 0.5))} L${f1(tx)},${f1(ty)} L${f1(tx - hl * Math.cos(an + 0.5))},${f1(ty - hl * Math.sin(an + 0.5))}`];
      }
      return [];
    };
    const markOn = (svg, o, a, b) => {
      const g = svgEl('g', {}, svg), ps = markPaths(o), dur = o.dur ?? 0.45;
      ps.forEach((d, i) => drawOn(svgEl('path', { d, fill: 'none', stroke: o.color ?? C.red, 'stroke-width': o.w ?? 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.92 }, g), a + i * dur * 0.6, dur));
      F.sfx(a, 'pen', 0.55, { dur });
      F.add((t) => g.setAttribute('display', t >= a - 0.01 && t < b ? '' : 'none'));
      F.info('annotate', a, b);
      return g;
    };
    R.mark = (L, o = {}) => { const [a, b] = winOf(L, o.a, o.b); return markOn(L._marks || (L._marks = R.svg(L, { z: 60 })), o, a, b); };
    // an arrow drawn on in an SVG layer (diagrams: who is what to whom): from → to, bend (sideways bulge), or loop: r (a loop back to `from`, above it);
    // the head lands when the line is done; label { text, size, dx, dy } sits at the middle (outlined white serif)
    R.arrow = (S, o = {}) => {
      const [a, b] = winOf(S, o.a, o.b), dur = o.dur ?? 0.45, col = o.color ?? '#fff', wd = o.width ?? 12, g = svgEl('g', {}, S);
      const [x1, y1] = o.from || [0, 0];
      let d, mx, my, ex, ey, an;
      if (o.loop) {
        const r = o.loop, sx = x1 - r * 0.5, tx = x1 + r * 0.5;
        d = `M${sx},${y1} C${sx - r * 1.1},${y1 - r * 2.2} ${tx + r * 1.1},${y1 - r * 2.2} ${tx},${y1}`;
        mx = x1; my = y1 - r * 1.65 - 46; ex = tx; ey = y1; an = Math.atan2(r * 2.2, -r * 1.1);   // the label sits just above the loop
      } else {
        const [x2, y2] = o.to || [100, 0], bend = o.bend ?? 0, L0 = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L0, ny = (x2 - x1) / L0;
        const cx = (x1 + x2) / 2 + nx * bend * 2, cy = (y1 + y2) / 2 + ny * bend * 2;
        d = `M${x1},${y1} Q${f1(cx)},${f1(cy)} ${x2},${y2}`;
        mx = (x1 + x2) / 2 + nx * bend; my = (y1 + y2) / 2 + ny * bend; ex = x2; ey = y2; an = Math.atan2(y2 - cy, x2 - cx);
      }
      for (const [c, w] of [[INK, wd + 8], [col, wd]]) drawOn(svgEl('path', { d, fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round' }, g), a, dur);
      if (o.head !== false) {
        const hs = wd * 3.2, hd = (s) => `M${f1(ex - Math.cos(an - 0.5) * s)},${f1(ey - Math.sin(an - 0.5) * s)} L${f1(ex)},${f1(ey)} L${f1(ex - Math.cos(an + 0.5) * s)},${f1(ey - Math.sin(an + 0.5) * s)}`;
        const hg = svgEl('g', {}, g);
        for (const [c, w] of [[INK, wd + 8], [col, wd]]) svgEl('path', { d: hd(hs), fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, hg);
        F.add((t) => hg.setAttribute('display', t >= a + dur * 0.95 ? '' : 'none'));
      }
      if (o.label) {
        const lb = typeof o.label === 'string' ? { text: o.label } : o.label, la = a + dur * 0.6;
        const te = svgText(g, lb.text, { x: f1(mx + (lb.dx ?? 0)), y: f1(my + (lb.dy ?? 0) + (lb.size ?? 60) * 0.35), 'text-anchor': 'middle', 'font-size': lb.size ?? 60, 'font-weight': 900, 'font-family': FONT.title, fill: lb.color ?? col, stroke: INK, 'stroke-width': 10, 'paint-order': 'stroke' });
        F.text(te, 'label', lb.text, la, b, { overlap: true });
        F.add((t) => { const q = seg(t, la, la + 0.25, E.backOut); te.setAttribute('opacity', t >= la ? Math.min(1, q * 2).toFixed(3) : 0); });
      }
      F.sfx(a, 'pen', 0.5, { dur });
      F.add((t) => g.setAttribute('display', t >= a - 0.01 && t < b ? '' : 'none'));
      F.info('diagram', a, b);
      return g;
    };

    // ---------- evidence board ----------
    R.board = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b);
      set(L, { background: '#7a4e2c' });
      el('div', `left:${gx(-80)}px;top:${gx(-80)}px;width:${W + gx(160)}px;height:${H + gx(160)}px;background-color:#b5834f;background-image:radial-gradient(rgba(70,40,15,.38) ${gx(1.2)}px, transparent ${gx(1.8)}px), radial-gradient(rgba(255,232,195,.22) ${gx(1)}px, transparent ${gx(2)}px);background-size:${gx(9)}px ${gx(9)}px, ${gx(14)}px ${gx(14)}px;background-position:0 0, ${gx(4)}px ${gx(7)}px;box-shadow:inset 0 0 ${gx(220)}px rgba(45,22,6,.7)`, L);
      const top = R.svg(L, { z: 50 }), items = {};
      const B = { L, svg: top, items };
      const settle = (div, at, rot) => {
        F.add((t) => { const q = seg(t, at, at + 0.34, E.backOut); set(div, { opacity: t >= at && t < b ? Math.min(1, seg(t, at, at + 0.12)).toFixed(3) : 0, transform: `translateY(${f1(gx(-36) * (1 - q))}px) rotate(${(rot + (1 - q) * 4).toFixed(2)}deg) scale(${(1.1 - 0.1 * q).toFixed(3)})` }); });
        F.sfx(at + 0.2, 'pin', 0.4);
      };
      const pin = (parent, px, py, color = '#d63a2f') => el('div', `left:${gx(px - 17)}px;top:${gx(py - 17)}px;width:${gx(34)}px;height:${gx(34)}px;border-radius:50%;background:radial-gradient(circle at 35% 32%, #fff 0 12%, ${color} 26%, ${shade(color, -0.45)} 100%);box-shadow:${gx(4)}px ${gx(6)}px ${gx(6)}px rgba(0,0,0,.4);z-index:5`, parent);
      B.photo = ({ id, x, y, w = 380, h = 300, rot = 0, at = a, label, draw, key, bg = '#cfd8dc', pinColor }) => {
        const fw = w + 36, fh = h + 36 + (label ? 70 : 24);
        const div = el('div', `left:${gx(x - fw / 2)}px;top:${gx(y - fh / 2)}px;width:${gx(fw)}px;height:${gx(fh)}px;background:#f8f5ec;box-shadow:${gx(8)}px ${gx(12)}px ${gx(14)}px rgba(0,0,0,.45);opacity:0;z-index:10`, L);
        const win = el('div', `left:${gx(18)}px;top:${gx(18)}px;width:${gx(w)}px;height:${gx(h)}px;overflow:hidden;background:${bg}`, div);
        if (key) { const m = window.MEDIA_ASSETS && window.MEDIA_ASSETS.images[key]; if (!m) throw new Error(M(`mystery：assets/manifest.js 里没有图片 "${key}"`, `mystery: no image "${key}" in assets/manifest.js`)); el('img', 'inset:0;width:100%;height:100%;object-fit:cover', win).src = 'assets/' + m.file; if (m.credit) F.credit({ ...m.credit, file: m.file }); }
        if (draw) { const sv = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, width: gx(w), height: gx(h), style: 'position:absolute;left:0;top:0' }, win); draw(sv, { w, h }); }
        if (label) { const lb = el('div', `left:0;right:0;top:${gx(h + 26)}px;text-align:center;font:400 ${gx(40)}px/1.2 ${FONT.hand};color:${INK};white-space:nowrap`, div, label); F.text(lb, 'label', label, at, b); }
        pin(div, fw / 2, 10, pinColor);
        settle(div, at, rot);
        items[id] = { x, y, w: fw, h: fh, pin: [x, y - fh / 2 + 10], div, at };
        F.info('photo', at, b);
        return div;
      };
      B.note = ({ id, x, y, text, at = a, color = '#ffe27a', rot = 3, size = 44, w = 300 }) => {
        const lines = wrap(text, (w - 50) / size), nh = Math.max(w * 0.8, lines.length * size * 1.3 + 90);
        const div = el('div', `left:${gx(x - w / 2)}px;top:${gx(y - nh / 2)}px;width:${gx(w)}px;height:${gx(nh)}px;background:linear-gradient(170deg, ${shade(color, 0.25)}, ${color} 60%, ${shade(color, -0.08)});box-shadow:${gx(6)}px ${gx(10)}px ${gx(10)}px rgba(0,0,0,.35);opacity:0;z-index:12`, L);
        const tx = el('div', `left:${gx(24)}px;right:${gx(24)}px;top:${gx(20)}px;bottom:0;display:flex;align-items:center;justify-content:center;text-align:center;font:400 ${gx(size)}px/1.3 ${FONT.hand};color:${INK}`, div, `<span style="position:relative">${lines.join('<br>')}</span>`);
        F.text(tx, 'label', text, at, b);
        pin(div, w / 2, 16, '#2f6fd6');
        settle(div, at, rot);
        items[id] = { x, y, w, h: nh, pin: [x, y - nh / 2 + 16], div, at };
        return div;
      };
      B.string = (i1, i2, { at, dur = 0.5, sag = 50, color = '#c8231c' } = {}) => {
        const p = items[i1].pin, q = items[i2].pin, mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2 + sag;
        const e = svgEl('path', { d: `M${f1(p[0])},${f1(p[1])} Q${f1(mx)},${f1(my)} ${f1(q[0])},${f1(q[1])}`, fill: 'none', stroke: color, 'stroke-width': 5, 'stroke-linecap': 'round' }, top);
        drawOn(e, at, dur); F.sfx(at, 'string', 0.4, { dur });
        F.add((t) => e.setAttribute('display', t >= at - 0.01 && t < b ? '' : 'none'));
        F.info('flow', at, b);
        return e;
      };
      const boxOf = (target, pad = 26) => typeof target === 'string' ? { x: items[target].x, y: items[target].y, rx: items[target].w / 2 + pad, ry: items[target].h / 2 + pad } : { ry: (target.rx ?? 120) * 0.7, ...target };
      B.circle = (target, o2 = {}) => markOn(top, { ...boxOf(target, o2.pad), kind: 'circle', ...o2 }, o2.at, b);
      B.cross = (target, o2 = {}) => { const bx = boxOf(target, -20); return markOn(top, { ...bx, kind: 'cross', w: 14, ...o2 }, o2.at, b); };
      B.focus = (target, s = 1.6) => { const bx = typeof target === 'string' ? items[target] : target; return { x: Math.max(0, Math.min(1, bx.x / RW)), y: Math.max(0, Math.min(1, bx.y / RH)), s }; };
      return B;
    };

    // ---------- case file ----------
    R.file = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b), rows = o.rows || [];
      const fw = o.w ?? (PT ? RW - 120 : 1240), rh = o.rowH ?? 164, fh = o.h ?? 150 + rows.length * rh + (o.src ? 80 : 30), x = o.x ?? (RW - fw) / 2, y = o.y ?? Math.max(60, (RH - fh) / 2 - (PT ? 140 : 30));
      const div = el('div', `left:${gx(x)}px;top:${gx(y)}px;width:${gx(fw)}px;height:${gx(fh)}px;opacity:0;z-index:20;box-sizing:border-box;background:${C.paper};border:${gx(5)}px solid ${INK};border-radius:${gx(8)}px;box-shadow:${gx(14)}px ${gx(18)}px 0 rgba(0,0,0,.35)`, L);
      el('div', `left:0;top:0;right:0;height:${gx(92)}px;background:${C.manila};border-bottom:${gx(5)}px solid ${INK};border-radius:${gx(4)}px ${gx(4)}px 0 0`, div);
      if (o.title) R.text(div, o.title, { x: 50, y: 18, size: 50, weight: 900, color: INK, a: a + 0.1, b, shadow: false });
      R.text(div, M('档案', 'FILE') + (o.no ? ` · ${o.no}` : ''), { x: fw - 50, y: 30, anchor: 'r', size: 30, font: FONT.mono, weight: 400, color: '#6b5b3e', a: a + 0.1, b, shadow: false, ls: '.2em', noFact: true, chrome: true });
      rows.forEach((r, i) => {
        const ry = 130 + i * rh, at = r.at ?? a + 0.4 + i * 0.5;
        R.text(div, r.label, { x: 50, y: ry, size: 34, font: FONT.sans, weight: 700, color: '#7a6a4c', a: at, b, shadow: false, ls: '.06em', lh: 1.1 });
        R.text(div, r.value, { x: 50, y: ry + 52, w: fw - 100, lh: 1.1, size: r.size ?? 60, weight: 900, color: INK, a: at + 0.1, b, shadow: false, enter: 'type' });
        if (r.bar !== undefined) {
          const bw = (fw - 100) * Math.max(0, Math.min(1, r.bar)), bar = el('div', `left:${gx(50)}px;top:${gx(ry + 130)}px;width:${gx(bw)}px;height:${gx(12)}px;background:${C.red};border-radius:${gx(6)}px;transform-origin:0 50%;opacity:.85`, div);
          F.add((t) => set(bar, { transform: `scaleX(${seg(t, at + 0.3, at + 0.9, E.cubicInOut).toFixed(3)})` }));
        }
        if (i < rows.length - 1) el('div', `left:${gx(50)}px;top:${gx(ry + rh - 8)}px;width:${gx(fw - 100)}px;height:${gx(2)}px;background:rgba(29,27,38,.18)`, div);
      });
      if (o.src) R.text(div, o.src, { x: 50, y: fh - 66, w: fw - 100, size: 26, weight: 500, color: '#7a6a4c', a: a + 0.3, b, shadow: false });
      if (o.stamp) R.stamp(div, o.stamp.text, { x: fw - 230, y: fh - 150, size: 76, rot: -10, a: o.stamp.at, b });
      F.sfx(a, 'paper', 0.4, { dur: 0.3 });
      F.add((t) => { const q = seg(t, a, a + 0.3, E.cubicInOut); set(div, { opacity: t >= a && t < b ? q.toFixed(3) : 0, transform: `translateY(${f1(gx(36) * (1 - q))}px)` }); });
      F.info(rows.some((r) => r.bar !== undefined) ? 'chart' : 'box', a, b);
      return div;
    };

    // ---------- lens, beam, countdown ----------
    R.lens = (L, o = {}) => {
      const s0 = shotOf(L), [a, b] = winOf(L, o.a, o.b), { x = RW / 2, y = RH / 2, s = 2, r = PT ? 380 : 330 } = o, fx = x / RW, fy = y / RH;
      const back = o.back !== false && b < s0.b - 0.05, out = o.out ?? 0.6;
      R.cam(L, [[a, { s: 1, x: fx, y: fy }], [a + 0.55, { s, x: fx, y: fy }], ...(back ? [[b - out, { s, x: fx, y: fy }], [b, { s: 1, x: fx, y: fy }, E.sine]] : [])]);
      const ov = el('div', `inset:0;pointer-events:none;z-index:20;display:none`, s0.S);
      const ring = el('div', `left:${gx(x)}px;top:${gx(y)}px;width:0;height:0`, ov);
      const glass = el('div', `left:${gx(-r)}px;top:${gx(-r)}px;width:${gx(2 * r)}px;height:${gx(2 * r)}px;border-radius:50%;border:${gx(22)}px solid #2c2f3a;box-shadow:0 0 0 ${gx(6)}px ${INK}, inset 0 0 0 ${gx(6)}px #9fb0bd, inset ${gx(-30)}px ${gx(-40)}px ${gx(80)}px rgba(255,255,255,.1);box-sizing:border-box`, ring);
      el('div', `left:${gx(r * 0.62)}px;top:${gx(r * 0.62)}px;width:${gx(r * 0.95)}px;height:${gx(64)}px;background:#5a3a26;border:${gx(6)}px solid ${INK};border-radius:${gx(30)}px;transform-origin:0 50%;transform:rotate(45deg)`, ring);
      el('div', `left:${gx(-r * 0.55)}px;top:${gx(-r * 0.62)}px;width:${gx(r * 0.5)}px;height:${gx(r * 0.22)}px;border-radius:50%;background:rgba(255,255,255,.18);transform:rotate(-35deg)`, ring);
      F.sfx(a, 'zoom', 0.6, { dur: 0.55 }); F.blur(a, a + 0.55, 10); if (back) F.blur(b - out, b, 10);
      F.add((t) => {
        if (t < a || t >= b) { set(ov, { display: 'none' }); return; }
        const q = Math.min(seg(t, a, a + 0.5, E.backOut), 1 - seg(t, b - (back ? out : 0.3), b, E.cubicInOut)), rr = r * Math.max(0.01, q);
        set(ov, { display: '', background: `radial-gradient(circle ${f1(gx(rr))}px at ${f1(gx(x))}px ${f1(gx(y))}px, rgba(0,0,0,0) 98%, rgba(4,6,10,${(0.62 * q).toFixed(3)}) 100%)` });
        set(ring, { transform: `scale(${Math.max(0.01, q).toFixed(3)})` });
      });
      F.info('annotate', a, b);
      return ov;
    };
    R.beam = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b), keys = (o.keys || [[a, RW / 2, RH / 2]]).map(([t, x, y]) => [t, { x, y }]), r = o.r ?? 300;
      const ov = el('div', `inset:0;pointer-events:none;z-index:55`, L); ov.dataset.motion = 'skip';
      F.sfx(a, 'click', 0.55);
      F.add((t) => {
        if (t < a || t >= b) { set(ov, { display: 'none' }); return; }
        const p = keyed(keys, t), on = seg(t, a, a + 0.12), off = b < shotOf(L).b - 0.05 ? 1 - seg(t, b - 0.5, b, E.sine) : 1, fl = 1 - vnoise(t, 5, 77) * 0.05, rr = gx(r * fl);   // a beam that ends before its shot lets the darkness lift, never snaps off
        set(ov, { display: '', background: `radial-gradient(circle ${f1(rr * 1.3)}px at ${f1(gx(p.x))}px ${f1(gx(p.y))}px, rgba(255,246,214,${(0.1 * on * off).toFixed(3)}) 0%, rgba(0,0,0,0) ${f1(rr * 0.6)}px, rgba(2,3,6,${((0.95 * on + (1 - on) * 0.98) * off).toFixed(3)}) ${f1(rr * 1.3)}px)` });
      });
      return ov;
    };
    R.countdown = (L, o = {}) => {
      const { a, from = 3, step = 0.75, x = RW / 2, y = RH / 2, size = PT ? 360 : 400, color = C.red } = o;
      for (let i = 0; i < from; i++) {
        const at = a + i * step, n = String(from - i);
        R.text(L, n, { anchor: 'c', x, y: y - size * 0.62, size, font: FONT.title, weight: 900, color, a: at, b: at + step - 0.04, enter: 'slam', kind: 'counter', noFact: true, lh: 1 });
        F.sfx(at, 'tick', 0.6); F.sfx(at + 0.02, 'heart', 0.7);
      }
      if (o.label) R.text(L, o.label, { anchor: 'c', x, y: y + size * 0.8, size: 48, weight: 700, color: '#d7dde5', a, b: a + from * step });
      F.info('mark', a, a + from * step);
      return a + from * step;
    };

    // ---------- the tape: replays of a drawn scene ----------
    R.tape = (L, o = {}) => {
      const s0 = shotOf(L), segs = [];
      let g = o.a ?? (s0 ? s0.a : 0), l = 0, replay = false;
      const T = {
        play(dur, rate = 1) { segs.push({ g0: g, g1: g + dur, l0: l, l1: l + dur * rate, mode: rate === 1 ? (replay ? 'replay' : 'play') : 'slow', rate }); g += dur; l += dur * rate; return T; },
        slow(dur, rate = 0.4) { return T.play(dur, rate); },
        freeze(dur) { segs.push({ g0: g, g1: g + dur, l0: l, l1: l, mode: 'freeze' }); g += dur; return T; },
        rewind(to = 0, dur = 0.8) { segs.push({ g0: g, g1: g + dur, l0: l, l1: to, mode: 'rewind' }); F.sfx(g, 'rewind', 0.6, { dur }); F.blur(g, g + dur, 10); g += dur; l = to; replay = true; return T; },
        clock(t) {
          if (!segs.length || t <= segs[0].g0) return segs.length ? segs[0].l0 : 0;
          for (const s of segs) if (t < s.g1) { const q = (t - s.g0) / (s.g1 - s.g0); return lerp(s.l0, s.l1, s.mode === 'rewind' ? E.cubicInOut(q) : q); }
          return segs[segs.length - 1].l1;
        },
        when(lt) {
          for (const s of segs) if (s.mode !== 'rewind' && s.mode !== 'freeze' && lt >= s.l0 - 1e-6 && lt <= s.l1 + 1e-6) return s.g0 + (lt - s.l0) / s.rate;
          return lt <= 0 ? (segs[0] ? segs[0].g0 : 0) : g;
        },
        get t() { return g; }, get lt() { return l; },
        end() {
          if (s0 && o.hud !== false) {
            const lab = { play: '', replay: M('▶ 回放', '▶ REPLAY'), slow: M('▶ 慢放 ×', '▶ SLOW ×'), freeze: M('❚❚ 暂停', '❚❚ PAUSED'), rewind: M('◀◀ 倒带', '◀◀ REWIND') };
            const bars = el('div', `inset:0;pointer-events:none;z-index:25;display:none;background:repeating-linear-gradient(0deg, rgba(255,255,255,0) 0 ${gx(70)}px, rgba(255,255,255,.12) ${gx(70)}px ${gx(78)}px, rgba(255,255,255,0) ${gx(78)}px ${gx(190)}px)`, s0.S); bars.dataset.motion = 'skip';
            for (const sg of segs) {
              if (sg.mode === 'play') continue;
              const txt = sg.mode === 'slow' ? lab.slow + sg.rate : lab[sg.mode], box = el('div', `right:${gx(40)}px;top:${gx(36)}px;display:none`, s0.hud);
              const chip = el('span', `position:relative;display:inline-block;font:400 ${gx(30)}px/1.2 ${FONT.mono};color:#fff;background:rgba(0,0,0,.6);padding:${gx(6)}px ${gx(16)}px;border-radius:${gx(6)}px;letter-spacing:.08em;white-space:nowrap`, box, txt);
              F.text(chip, 'label', txt, sg.g0, sg.g1, { noFact: true, chrome: true });
              F.add((t) => set(box, { display: t >= sg.g0 && t < sg.g1 ? '' : 'none' }));
            }
            F.add((t) => { const sg = segs.find((x) => t >= x.g0 && t < x.g1); set(bars, { display: sg && sg.mode === 'rewind' ? '' : 'none', transform: `translateY(${f1(((t * 900) % 190) * u)}px)` }); });
          }
          return g;
        },
      };
      return T;
    };

    // ---------- props ----------
    const PROPS = {};
    R.props = PROPS;
    const svgText = (parent, str, attrs) => { const e = svgEl('text', { 'font-family': FONT.sans, 'font-weight': 700, fill: INK, ...attrs }, parent); e.textContent = str; return e; };
    R.prop = (parent, name, o = {}) => {
      const mk = PROPS[name];
      if (!mk) throw new Error(M(`mystery：没有道具 "${name}"（有：${Object.keys(PROPS).join(' / ')}）`, `mystery: no prop "${name}" (available: ${Object.keys(PROPS).join(' / ')})`));
      const clock = o.tape ? o.tape.clock : o.clock || ((t) => t), when = o.tape ? o.tape.when : o.when || ((lt) => lt);
      const outer = svgEl('g', {}, parent), inner = svgEl('g', {}, outer);
      const [w0, w1] = winOf(parent, o.a !== undefined ? when(o.a) : undefined, o.b !== undefined ? when(o.b) : undefined);
      const k = { clock, when, F, R, C, FONT, uid, win: (x, y) => winOf(parent, x !== undefined ? when(x) : w0, y !== undefined ? when(y) : w1), text: svgText, wrap, wlen, shade };
      const h = mk(inner, o, k) || {};
      const { x = 0, y = 0, s = 1, rot = 0, a, b, enter = 'pop', bob = 0, move } = o;
      if (a !== undefined && o.sfx !== false) F.sfx(when(a), o.sfx || (enter === 'fly' ? 'whoosh' : 'pop'), o.sfxGain ?? 0.42);
      if (a !== undefined && enter === 'fly') F.blur(when(a), when(a) + 0.45, 10);
      F.add((t) => {
        const lt = clock(t), vis = (a === undefined || lt >= a) && (b === undefined || lt < b);
        if (!vis) { outer.setAttribute('display', 'none'); return; }
        const dur = enter === 'fly' ? 0.45 : enter === 'dim' ? 0.7 : 0.35, q = a === undefined || enter === 'none' ? 1 : seg(lt, a, a + dur, enter === 'dim' || enter === 'zoom' ? E.cubicInOut : E.backOut), p = move ? keyed(move, lt) : { x, y, s, rot };
        const [fx, fy] = o.from || [0, -400], fl = enter === 'fly' ? 1 - q : 0;
        const px = (p.x ?? x) + fx * fl, py = (p.y ?? y) + fy * fl + (bob ? Math.sin(lt * 2.4 + x * 0.01) * bob : 0), ps = (p.s ?? s) * (enter === 'pop' ? 0.55 + 0.45 * q : enter === 'zoom' ? 1.3 - 0.3 * q : 1);
        outer.setAttribute('display', '');
        outer.setAttribute('transform', `translate(${f1(px)},${f1(py)}) rotate(${((p.rot ?? rot) - 25 * fl).toFixed(2)}) scale(${ps.toFixed(4)})`);
        if (enter === 'dim') outer.setAttribute('opacity', (0.25 + 0.75 * q).toFixed(3));
        else if (a !== undefined && enter !== 'none') outer.setAttribute('opacity', Math.min(1, seg(lt, a, a + 0.15)).toFixed(3));
      });
      const kind = h.info ?? 'shape';
      if (kind) F.info(kind, w0, w1);
      h.g = outer;
      h.to = (lx, ly) => [x + lx * s, y + ly * s];   // prop-local → parent units (ignoring rot and move)
      return h;
    };

    // a bean-shaped person: face expressions, eyes that look, arms with poses, things to wear
    const FACES = {
      calm: { brow: [0, 0], mouth: 'smile' }, smile: { brow: [-4, 0], mouth: 'smile', blush: 1 }, grin: { brow: [-8, 0], mouth: 'grin', eyes: 'happy', blush: 1 },
      sweat: { brow: [-2, 12], mouth: 'wavy', sweat: 1 }, shock: { brow: [-16, 5], mouth: 'o', pupil: 0.55 }, sly: { brow: [4, -9], mouth: 'smirk', eyes: 'lid' },
      suspicious: { brow: [6, -12], mouth: 'flat', eyes: 'lid' }, sad: { brow: [0, 13], mouth: 'sad' }, think: { brow: [-4, -5], mouth: 'flat' }, blank: { brow: [0, 0], mouth: 'flat' },
    };
    const POSES = { scratch: [[-70, -292], [30, -112]], ok: [[-168, -150], [168, -150]], hug: [[-36, -120], [36, -120]], down: [[-118, -64], [118, -64]], wave: [[-118, -64], [150, -250]], up: [[-146, -252], [146, -252]], hold: [[-44, -96], [44, -96]], shrug: [[-156, -178], [156, -178]], point: [[-118, -64], [196, -166]], think: [[-118, -64], [44, -118]], phone: [[-118, -64], [58, -172]], hips: [[-128, -110], [128, -110]] };
    const lastAt = (v, lt, dflt) => { if (!Array.isArray(v)) return [v ?? dflt, -9, v ?? dflt]; let cur = v[0][1], prev = cur, at = -9; for (const [t, x] of v) if (lt >= t) { prev = cur; cur = x; at = t; } return [cur, at, prev]; };
    // a pigeon's head-bob at `rate` bobs a second: the head thrusts forward fast, then drifts back (0…1 → −1…1); rate may be keyed [[t, rate]…]
    const bobAt = (v, lt, ph = 0) => { const [rate, at] = lastAt(v, lt, 0); if (!rate) return 0; const p = (((lt - Math.max(0, at)) * rate + ph) % 1 + 1) % 1; return p < 0.28 ? -1 + 2 * E.quartOut(p / 0.28) : 1 - 2 * ((p - 0.28) / 0.72); };
    PROPS.friend = (g, o, k) => {
      const col = o.color || '#ffd166', wear = [].concat(o.wear || []);
      if (o.shadow !== false) svgEl('ellipse', { cx: 0, cy: 0, rx: 94, ry: 14, fill: 'rgba(0,0,0,.24)' }, g);   // shadow: false for a person lying down (rot ±90)
      for (const lx of [-36, 36]) svgEl('path', { d: `M${lx},-52 L${lx},-6`, stroke: INK, 'stroke-width': 17, 'stroke-linecap': 'round' }, g);
      const legs = g; g = svgEl('g', {}, legs);   // everything above the legs: it bobs with `nod`
      const body = o.body || 'bean', toon = o.eyes === 'toon' || body !== 'bean';
      if (body === 'bulb') {   // an upside-down light bulb: glass for a head and body, the brass screw cap on top
        svgEl('ellipse', { cx: 0, cy: -178, rx: 108, ry: 128, fill: col, stroke: INK, 'stroke-width': 7 }, g);
        svgEl('path', { d: 'M40,-292 A108,128 0 0 1 40,-64 A120,140 0 0 0 40,-292 Z', fill: shade(col, -0.18), opacity: 0.8 }, g);
        svgEl('path', { d: 'M-70,-250 A90,110 0 0 1 -20,-290', fill: 'none', stroke: '#fff', 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0.7 }, g);
        svgEl('rect', { x: -48, y: -352, width: 96, height: 56, rx: 10, fill: '#c98a3c', stroke: INK, 'stroke-width': 7 }, g);
        for (const y of [-338, -322, -308]) svgEl('path', { d: `M-46,${y} L46,${y + 6}`, stroke: '#8a5a22', 'stroke-width': 5 }, g);
        svgEl('rect', { x: -18, y: -372, width: 36, height: 22, rx: 6, fill: '#8a5a22', stroke: INK, 'stroke-width': 6 }, g);
      } else if (body === 'brain') {   // a brain for a head on a little shirt
        svgEl('path', { d: 'M-62,-128 L62,-128 L74,-46 L-74,-46 Z', fill: o.shirt || C.amber, stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' }, g);
        const pts = []; for (let i2 = 0; i2 <= 36; i2++) { const an = (i2 / 36) * Math.PI * 2, bump = 1 + 0.06 * Math.sin(an * 9); pts.push([Math.cos(an) * 138 * bump, -228 + Math.sin(an) * 112 * bump]); }
        svgEl('path', { d: smooth(pts) + 'Z', fill: col, stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' }, g);
        svgEl('path', { d: 'M0,-338 C10,-300 -10,-270 0,-232', fill: 'none', stroke: shade(col, -0.3), 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
        for (const [d] of [['M-110,-260 q20,-30 50,-10 q20,25 45,0'], ['M30,-300 q25,-20 50,5 q15,20 40,5'], ['M-120,-200 q25,10 40,-15'], ['M80,-210 q20,15 40,-10'], ['M-60,-310 q15,15 35,0']]) svgEl('path', { d, fill: 'none', stroke: shade(col, -0.3), 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
      } else {
        svgEl('path', { d: 'M-96,-150 C-98,-264 98,-268 98,-150 C99,-66 70,-42 0,-42 C-70,-42 -98,-66 -96,-150 Z', fill: col, stroke: INK, 'stroke-width': 7 }, g);
        svgEl('ellipse', { cx: 0, cy: -100, rx: 52, ry: 36, fill: shade(col, 0.3), opacity: 0.6 }, g);
      }
      const fg = svgEl('g', { transform: `translate(0,${o.faceY ?? (body === 'brain' ? -34 : body === 'bulb' ? 6 : 0)}) scale(${toon ? 1.18 : 1})` }, g);   // the face (toon eyes are bigger)
      if (wear.includes('tie')) svgEl('path', { d: 'M-10,-118 L10,-118 L16,-70 L0,-54 L-16,-70 Z', fill: C.red, stroke: INK, 'stroke-width': 4 }, g);
      if (wear.includes('hood')) { svgEl('path', { d: 'M-104,-140 C-110,-290 110,-290 104,-140 C90,-200 -90,-200 -104,-140 Z', fill: '#2a2c38', stroke: INK, 'stroke-width': 6 }, g); svgEl('rect', { x: -84, y: -212, width: 168, height: 50, rx: 18, fill: '#15161d' }, g); }
      const eyes = [-1, 1].map((sd) => {
        const ex = sd * 34, ey = -188, eg = svgEl('g', {}, fg);
        const white = svgEl('ellipse', { cx: ex, cy: ey, rx: 21, ry: 25, fill: '#fff', stroke: INK, 'stroke-width': 5 }, eg);
        const pupil = svgEl('circle', { cx: ex, cy: ey, r: 9.5, fill: INK }, eg);
        const lid = svgEl('path', { d: `M${ex - 23},${ey - 1} A23,27 0 0 1 ${ex + 23},${ey - 1} Z`, fill: col, stroke: INK, 'stroke-width': 5 }, eg);
        const happy = svgEl('path', { d: `M${ex - 18},${ey + 6} Q${ex},${ey - 20} ${ex + 18},${ey + 6}`, fill: 'none', stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, fg);
        const brow = svgEl('path', { d: '', fill: 'none', stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }, fg);
        return { sd, ex, ey, eg, white, pupil, lid, happy, brow };
      });
      if (wear.includes('glasses')) { for (const sd of [-1, 1]) svgEl('circle', { cx: sd * 34, cy: -188, r: 31, fill: 'rgba(200,230,255,.18)', stroke: INK, 'stroke-width': 6 }, fg); svgEl('path', { d: 'M-4,-192 Q0,-198 4,-192', fill: 'none', stroke: INK, 'stroke-width': 6 }, fg); }
      const mouths = {
        smile: svgEl('path', { d: 'M-30,-140 Q0,-114 30,-140', fill: 'none', stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, fg),
        grin: svgEl('path', { d: 'M-40,-146 Q0,-90 40,-146 Z', fill: '#8a2b36', stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' }, fg),
        flat: svgEl('path', { d: 'M-24,-132 L24,-132', fill: 'none', stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, fg),
        o: svgEl('ellipse', { cx: 0, cy: -128, rx: 13, ry: 17, fill: '#8a2b36', stroke: INK, 'stroke-width': 5 }, fg),
        wavy: svgEl('path', { d: 'M-32,-130 q8,-9 16,0 t16,0 t16,0 t16,0', fill: 'none', stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, fg),
        sad: svgEl('path', { d: 'M-28,-122 Q0,-144 28,-122', fill: 'none', stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, fg),
        smirk: svgEl('path', { d: 'M-26,-132 Q10,-126 32,-148', fill: 'none', stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, fg),
      };
      const blush = svgEl('g', { opacity: 0 }, fg); for (const sd of [-1, 1]) svgEl('ellipse', { cx: sd * 64, cy: -150, rx: 15, ry: 9, fill: '#ff8a8a', opacity: 0.7 }, blush);
      const sweat = svgEl('path', { d: 'M96,-246 Q84,-224 96,-214 Q108,-224 96,-246 Z', fill: '#8fd3ff', stroke: INK, 'stroke-width': 4 }, fg);
      if (wear.includes('detective')) { svgEl('path', { d: 'M-94,-222 C-92,-306 92,-306 94,-222 Z', fill: '#8b5e3c', stroke: INK, 'stroke-width': 6 }, g); svgEl('path', { d: 'M-120,-216 Q0,-196 120,-216', fill: 'none', stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round' }, g); svgEl('path', { d: 'M-88,-240 Q0,-224 88,-240', fill: 'none', stroke: '#5a3a24', 'stroke-width': 12 }, g); }
      if (wear.includes('party')) { svgEl('path', { d: 'M-34,-250 L14,-372 L56,-246 Z', fill: '#7cc4ff', stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }, g); svgEl('path', { d: 'M-18,-290 L40,-282 M-2,-330 L28,-326', stroke: '#ff6b8a', 'stroke-width': 9 }, g); svgEl('circle', { cx: 14, cy: -376, r: 13, fill: C.amber, stroke: INK, 'stroke-width': 5 }, g); }
      if (wear.includes('cap')) {   // a graduation mortarboard with a tassel
        const ty = body === 'bulb' ? -372 : body === 'brain' ? -336 : -256;
        svgEl('path', { d: `M-62,${ty + 2} L-58,${ty + 40} Q0,${ty + 56} 58,${ty + 40} L62,${ty + 2} Z`, fill: '#2a2c38', stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }, g);
        svgEl('path', { d: `M-128,${ty - 4} L0,${ty - 44} L128,${ty - 4} L0,${ty + 30} Z`, fill: '#2a2c38', stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }, g);
        svgEl('path', { d: `M0,${ty - 8} L96,${ty + 6} L96,${ty + 64}`, fill: 'none', stroke: C.amber, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
        svgEl('circle', { cx: 96, cy: ty + 70, r: 11, fill: C.amber, stroke: INK, 'stroke-width': 4 }, g);
      }
      const arms = [0, 1].map(() => svgEl('path', { fill: 'none', stroke: INK, 'stroke-width': 13, 'stroke-linecap': 'round' }, g));
      const gloves = o.gloves ?? body !== 'bean';   // rubber-hose white gloves
      const hands = [0, 1].map(() => svgEl('circle', { r: gloves ? 22 : 14, fill: gloves ? '#fff' : col, stroke: INK, 'stroke-width': gloves ? 6 : 5 }, g));
      const hand = svgEl('g', {}, g);   // attach a prop to the right hand: R.prop(h.hand, 'phone', { s: .2 })
      const SH = body === 'brain' ? [[-66, -116], [66, -116]] : body === 'bulb' ? [[-92, -150], [92, -150]] : [[-86, -128], [86, -128]];
      k.F.add((t) => {
        const lt = k.clock(t);
        if (o.nod) { const nb = bobAt(o.nod, lt, o.seed ?? 0), na = o.nodAmp ?? 22; g.setAttribute('transform', `translate(${f1(nb * na)},${f1(Math.abs(nb) * na * 0.25)}) rotate(${(nb * 4).toFixed(2)},0,-52)`); }
        const [fname] = lastAt(o.face, lt, 'calm'), f = FACES[fname] || FACES.calm;
        const lk = Array.isArray(o.look) && Array.isArray(o.look[0]) ? keyed(o.look.map(([tt, dx, dy]) => [tt, { dx, dy }]), lt) : { dx: (o.look || [0, 0])[0], dy: (o.look || [0, 0])[1] };
        const per = 3.1 + (o.seed ?? 0) * 0.37, bl = (lt + (o.seed ?? 0)) % per < 0.12 && f.eyes !== 'happy';
        for (const e of eyes) {
          const hp = f.eyes === 'happy';
          e.eg.setAttribute('display', hp ? 'none' : ''); e.happy.setAttribute('display', hp ? '' : 'none');
          e.lid.setAttribute('display', f.eyes === 'lid' ? '' : 'none');
          e.eg.setAttribute('transform', bl ? `translate(0,${e.ey}) scale(1,.12) translate(0,${-e.ey})` : '');
          e.pupil.setAttribute('cx', f1(e.ex + lk.dx * 8)); e.pupil.setAttribute('cy', f1(e.ey + lk.dy * 9 + (f.eyes === 'lid' ? 6 : 0))); e.pupil.setAttribute('r', 9.5 * (f.pupil ?? 1));
          const [dy, tilt] = f.brow, bx = e.ex, by = e.ey - 40 + dy;   // tilt > 0: the inner ends go up (worried); < 0: down (cross)
          e.brow.setAttribute('d', `M${f1(bx - e.sd * 18)},${f1(by - tilt * 0.5)} L${f1(bx + e.sd * 18)},${f1(by + tilt * 0.5)}`);
        }
        for (const m in mouths) mouths[m].setAttribute('display', m === f.mouth ? '' : 'none');
        blush.setAttribute('opacity', f.blush ? 1 : 0);
        sweat.setAttribute('display', f.sweat ? '' : 'none');
        if (f.sweat) sweat.setAttribute('transform', `translate(0,${f1(((lt * 30) % 26))})`);
        const [pn, pat, pprev] = lastAt(o.arms, lt, 'down'), q = seg(lt, pat, pat + 0.25, E.cubicInOut), A = POSES[pn] || POSES.down, A0 = POSES[pprev] || A;
        for (let i = 0; i < 2; i++) {
          const [sx, sy] = SH[i], hx = lerp(A0[i][0], A[i][0], q), hy = lerp(A0[i][1], A[i][1], q), wav = pn === 'wave' && i === 1 ? Math.sin(lt * 9) * 14 : 0;
          const ex = (sx + hx) / 2 + (i ? 1 : -1) * 22, ey = (sy + hy) / 2 + 18;
          arms[i].setAttribute('d', `M${sx},${sy} Q${f1(ex)},${f1(ey)} ${f1(hx + wav)},${f1(hy)}`);
          hands[i].setAttribute('cx', f1(hx + wav)); hands[i].setAttribute('cy', f1(hy));
          if (i === 1) hand.setAttribute('transform', `translate(${f1(hx + wav)},${f1(hy)})`);
        }
      });
      return { hand, info: 'figure' };
    };
    // a phone: chat (messages, red packets, "typing…") or lock screen (time, notifications); wake = the moment the screen lights up
    PROPS.phone = (g, o, k) => {
      const id = k.uid(), dark = '#0c0e14';
      const glow = svgEl('circle', { cx: 0, cy: 0, r: 460, fill: `url(#${id}g)`, opacity: 0 }, g);
      const defs = svgEl('defs', {}, g);
      const rg = svgEl('radialGradient', { id: id + 'g' }, defs); svgEl('stop', { offset: '0%', 'stop-color': '#bfe3ff', 'stop-opacity': 0.55 }, rg); svgEl('stop', { offset: '100%', 'stop-color': '#bfe3ff', 'stop-opacity': 0 }, rg);
      const cp = svgEl('clipPath', { id: id + 'c' }, defs); svgEl('rect', { x: -144, y: -290, width: 288, height: 580, rx: 28 }, cp);
      svgEl('rect', { x: -160, y: -310, width: 320, height: 620, rx: 46, fill: '#2a2e3b', stroke: INK, 'stroke-width': 7 }, g);
      svgEl('rect', { x: 160, y: -170, width: 8, height: 70, rx: 3, fill: '#2a2e3b', stroke: INK, 'stroke-width': 3 }, g);
      const scr = svgEl('g', { 'clip-path': `url(#${id}c)` }, g);
      svgEl('rect', { x: -144, y: -290, width: 288, height: 580, fill: o.screen ? '#15171f' : o.lock ? '#3b4a7a' : '#f1f1f5' }, scr);
      const wins = [];
      if (o.screen) o.screen(svgEl('g', {}, scr), k);   // your own screen (a video, an app): draw into the clipped screen, x −144…144, y −290…290
      else if (o.lock) {
        const L2 = o.lock, lk = svgEl('g', {}, scr);
        if (o.wake !== undefined) k.F.add((t) => lk.setAttribute('display', k.clock(t) >= o.wake ? '' : 'none'));
        svgEl('rect', { x: -144, y: -290, width: 288, height: 580, fill: `url(#${id}w)` }, lk);
        const wg = svgEl('linearGradient', { id: id + 'w', x1: 0, y1: 0, x2: 0, y2: 1 }, defs); svgEl('stop', { offset: '0%', 'stop-color': '#4b5d96' }, wg); svgEl('stop', { offset: '100%', 'stop-color': '#c77d8a' }, wg);
        const tm = k.text(lk, L2.time || '21:47', { x: 0, y: -168, 'text-anchor': 'middle', 'font-size': 76, 'font-weight': 300, fill: '#fff' });
        const dt = L2.date ? k.text(lk, L2.date, { x: 0, y: -128, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 500, fill: '#fff' }) : null;
        wins.push([tm, L2.time || '21:47', k.win(o.wake)], ...(dt ? [[dt, L2.date, k.win(o.wake)]] : []));
        (L2.notes || []).forEach((n, i) => {
          const ng = svgEl('g', {}, lk), ny = -80 + i * 100;
          svgEl('rect', { x: -132, y: ny, width: 264, height: 86, rx: 16, fill: 'rgba(255,255,255,.93)' }, ng);
          svgEl('rect', { x: -118, y: ny + 14, width: 30, height: 30, rx: 8, fill: '#4cc2ff' }, ng); svgEl('path', { d: `M${-110},${ny + 24} h14 a4,4 0 0 1 4,4 v4 a4,4 0 0 1 -4,4 h-8 l-6,5 z`, fill: '#fff' }, ng);
          const t1 = k.text(ng, n.title, { x: -80, y: ny + 35, 'font-size': 19, 'font-weight': 900 }), t2 = k.text(ng, n.text, { x: -118, y: ny + 70, 'font-size': 18, 'font-weight': 500, fill: '#444' });
          wins.push([t1, n.title, k.win(n.at)], [t2, n.text, k.win(n.at)]);
          k.F.sfx(k.when(n.at), 'msg', 0.6);
          k.F.add((t) => { const lt = k.clock(t), q = seg(lt, n.at, n.at + 0.3, E.backOut); ng.setAttribute('display', lt >= n.at ? '' : 'none'); ng.setAttribute('transform', `translate(0,${f1(-30 * (1 - q))})`); ng.setAttribute('opacity', Math.min(1, seg(lt, n.at, n.at + 0.15)).toFixed(3)); });
        });
      } else {
        const msgs = o.messages || [], FS = 22, MAXC = 7.6, AT = -200, AB = 214, list = svgEl('g', {}, scr);
        let cy = AT + 10;
        const lay = msgs.map((m) => {
          const kind = m.kind || 'text', mine = m.who === 'me';
          let w, h, lines = [];
          if (kind === 'packet') { w = 220; h = 92; } else if (kind === 'time' || kind === 'sys') { w = 240; h = 30; } else { lines = wrap(m.text, MAXC); w = Math.max(...lines.map((s) => wlen(s))) * FS + 28; h = lines.length * 31 + 22; }
          const y0 = cy; cy += h + 18;
          return { m, kind, mine, w, h, lines, y: y0 };
        });
        const offs = []; let prev = 0;
        lay.forEach((L2) => { const tgt = Math.max(0, L2.y + L2.h - (AB - 12)); offs.push([L2.m.at ?? 0, prev, tgt]); prev = tgt; });
        const scrollAt = (lt) => { let v = 0; for (const [at, p0, p1] of offs) if (lt >= at) v = lerp(p0, p1, seg(lt, at, at + 0.3, E.cubicInOut)); return v; };
        const AV = { them: o.avatar?.them || '#ff9f6b', me: o.avatar?.me || '#7cc4ff' };
        lay.forEach((L2, i) => {
          const { m, kind, mine, w, h, lines, y } = L2, mg = svgEl('g', {}, list), at = m.at ?? 0;
          let ax = 0;
          if (kind === 'time' || kind === 'sys') {
            if (kind === 'sys') svgEl('rect', { x: -w / 2, y, width: w, height: h, rx: 8, fill: '#e1e1e7' }, mg);
            const tt = k.text(mg, m.text, { x: 0, y: y + 21, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 500, fill: '#8d8d98' });
            wins.push([tt, m.text, k.win(at), true]);
          } else {
            const avx = mine ? 118 : -118; ax = mine ? 92 : -92;
            svgEl('circle', { cx: avx, cy: y + 22, r: 20, fill: AV[mine ? 'me' : 'them'], stroke: INK, 'stroke-width': 3 }, mg);
            for (const sd of [-1, 1]) svgEl('circle', { cx: avx + sd * 6, cy: y + 19, r: 2.6, fill: INK }, mg);
            const bx = mine ? 92 - w : -92;
            if (kind === 'packet') {
              const pg = svgEl('g', {}, mg), opened = m.open;
              const body = svgEl('rect', { x: bx, y, width: w, height: h, rx: 10, fill: '#f2763a' }, pg);
              svgEl('rect', { x: bx + 14, y: y + 12, width: 34, height: 42, rx: 5, fill: '#e2412f', stroke: '#fff', 'stroke-width': 2 }, pg);
              svgEl('circle', { cx: bx + 31, cy: y + 34, r: 8, fill: '#f6c445' }, pg);
              const note = m.note || M('恭喜发财，大吉大利', 'Best wishes!');
              const nt = k.text(pg, note, { x: bx + 58, y: y + 40, 'font-size': 16, 'font-weight': 700, fill: '#fff' });
              const strip = svgEl('rect', { x: bx, y: y + 64, width: w, height: 28, fill: '#fbe6d8' }, pg);
              svgEl('rect', { x: bx, y: y + 64, width: w, height: 8, fill: '#f2763a' }, pg);
              k.text(pg, M('红包', 'Red packet'), { x: bx + 14, y: y + 86, 'font-size': 13, 'font-weight': 500, fill: '#b5856a' });
              const done = k.text(pg, M('已领取', 'Received'), { x: bx + w - 14, y: y + 86, 'text-anchor': 'end', 'font-size': 13, 'font-weight': 700, fill: '#b5856a' });
              wins.push([nt, note, k.win(at)]);
              if (opened !== undefined) {
                wins.push([done, done.textContent, k.win(opened), true]);
                k.F.add((t) => { const lt = k.clock(t), op = lt >= opened; body.setAttribute('fill', op ? '#f6b07f' : '#f2763a'); done.setAttribute('display', op ? '' : 'none'); strip.setAttribute('fill', op ? '#fdf0e6' : '#fbe6d8'); });
              } else done.setAttribute('display', 'none');
              L2.packet = pg;
            } else {
              svgEl('rect', { x: bx, y, width: w, height: h, rx: 12, fill: mine ? '#9fd3ff' : '#fff', stroke: mine ? 'none' : '#d9d9e0', 'stroke-width': 2 }, mg);
              const tx = svgEl('text', { x: bx + 14, y: y + 11 + FS, 'font-family': FONT.sans, 'font-weight': 500, 'font-size': FS, fill: INK }, mg);
              lines.forEach((s, j) => { const sp = svgEl('tspan', { x: bx + 14, dy: j ? 31 : 0 }, tx); sp.textContent = s; });
              wins.push([tx, m.text, k.win(at)]);
            }
          }
          if (m.at !== undefined && m.sfx !== false) k.F.sfx(k.when(at), mine ? 'pop' : 'msg', mine ? 0.42 : 0.6);
          const oy = y + h / 2;
          k.F.add((t) => {
            const lt = k.clock(t), q = seg(lt, at, at + 0.28, E.backOut), sc = scrollAt(lt);
            mg.setAttribute('display', lt >= at ? '' : 'none');
            mg.setAttribute('transform', `translate(0,${f1(-sc)}) translate(${ax},${f1(oy)}) scale(${(0.6 + 0.4 * q).toFixed(3)}) translate(${-ax},${f1(-oy)})`);
          });
          L2.scroll = () => offs[i][2];
        });
        // header and input bar sit above the scrolling messages
        svgEl('rect', { x: -144, y: -290, width: 288, height: 82, fill: '#e6e6ec' }, scr);
        svgEl('path', { d: 'M-118,-252 l-12,12 l12,12', fill: 'none', stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }, scr);
        const title = k.text(scr, o.title || M('朋友', 'Friend'), { x: 0, y: o.typing ? -246 : -238, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 900 });
        wins.push([title, title.textContent, k.win()]);
        if (o.typing) {
          const ty = k.text(scr, M('对方正在输入…', 'typing…'), { x: 0, y: -222, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 500, fill: '#7d7d88' });
          for (const [t0, t1] of o.typing) wins.push([ty, ty.textContent, k.win(t0, t1), true]);
          k.F.add((t) => { const lt = k.clock(t); ty.setAttribute('display', o.typing.some(([t0, t1]) => lt >= t0 && lt < t1) ? '' : 'none'); });
        }
        svgEl('rect', { x: -144, y: 226, width: 288, height: 64, fill: '#e6e6ec' }, scr);
        svgEl('rect', { x: -126, y: 240, width: 204, height: 36, rx: 8, fill: '#fff' }, scr);
        svgEl('circle', { cx: 112, cy: 258, r: 16, fill: 'none', stroke: INK, 'stroke-width': 3 }, scr); svgEl('path', { d: 'M104,258 h16 M112,250 v16', stroke: INK, 'stroke-width': 3 }, scr);
        g._lay = lay;
      }
      const off = svgEl('rect', { x: -144, y: -290, width: 288, height: 580, rx: 28, fill: dark, opacity: o.wake !== undefined ? 1 : 0 }, g);
      svgEl('rect', { x: -40, y: -298, width: 80, height: 14, rx: 7, fill: '#15171f' }, g);
      for (const [e, s, [a, b], decor] of wins) k.F.text(e, 'label', s, a, b, { noFact: !!decor, overlap: true });
      if (o.wake !== undefined) k.F.add((t) => { const lt = k.clock(t), q = seg(lt, o.wake, o.wake + 0.3); off.setAttribute('opacity', (1 - q).toFixed(3)); glow.setAttribute('opacity', (q * (o.glow ?? 1)).toFixed(3)); });
      else if (o.glow) glow.setAttribute('opacity', o.glow);
      // where message i sits, in the phone's own units, once it has scrolled into place
      const box = (i) => { if (!g._lay) return { x: 0, y: 0, w: 288, h: 580 }; const L2 = g._lay[i], sc = L2.scroll(); const x0 = L2.kind === 'time' || L2.kind === 'sys' ? -L2.w / 2 : L2.mine ? 92 - L2.w : -92; return { x: x0 + L2.w / 2, y: L2.y - sc + L2.h / 2, w: L2.w, h: L2.h }; };
      // buzz: [[t0, t1]…] the phone vibrates (shakes, with buzz marks either side)
      if (o.buzz) {
        g.dataset.motion = 'skip';   // a vibration is meant to shake
        const marks = svgEl('g', { display: 'none' }, g);
        for (const sd of [-1, 1]) for (const rr of [30, 60]) svgEl('path', { d: `M${sd * (180 + rr)},-60 Q${sd * (200 + rr)},0 ${sd * (180 + rr)},60`, fill: 'none', stroke: o.buzzColor || '#fff', 'stroke-width': 9, 'stroke-linecap': 'round' }, marks);
        for (const [t0] of o.buzz) k.F.sfx(k.when(t0), 'buzz', 0.6, { dur: 0.5 });
        k.F.add((t) => { const lt = k.clock(t), on = o.buzz.some(([t0, t1]) => lt >= t0 && lt < t1); g.setAttribute('transform', on ? `rotate(${(Math.sin(lt * 70) * 4).toFixed(2)})` : ''); marks.setAttribute('display', on && Math.floor(lt * 8) % 2 === 0 ? '' : 'none'); });
      }
      return { box, info: 'ui' };
    };
    // a red envelope (红包): flap, gold seal; opens at `open` (the bill slides up with the amount, coins jump)
    PROPS.envelope = (g, o, k) => {
      const back = svgEl('rect', { x: -115, y: -160, width: 230, height: 320, rx: 18, fill: '#b8231f', stroke: INK, 'stroke-width': 7 }, g);
      const bill = svgEl('g', {}, g);
      svgEl('rect', { x: -88, y: -120, width: 176, height: 150, rx: 10, fill: '#fff4dc', stroke: INK, 'stroke-width': 5 }, bill);
      const amt = k.text(bill, o.amount || '¥8.88', { x: 0, y: -40, 'text-anchor': 'middle', 'font-size': 46, 'font-weight': 900, fill: C.red });
      svgEl('path', { d: 'M-115,-80 L115,-80 L115,142 Q115,160 97,160 L-97,160 Q-115,160 -115,142 Z', fill: '#d8322e', stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' }, g);
      const flap = svgEl('path', { d: 'M-115,-142 Q-115,-160 -97,-160 L97,-160 Q115,-160 115,-142 L115,-84 Q0,-10 -115,-84 Z', fill: '#c42a26', stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' }, g);
      const seal = svgEl('g', {}, g);
      svgEl('circle', { cx: 0, cy: -40, r: 40, fill: '#f4c542', stroke: INK, 'stroke-width': 6 }, seal);
      const sm = k.text(seal, o.mark || M('福', '★'), { x: 0, y: -25, 'text-anchor': 'middle', 'font-size': 42, 'font-weight': 900, fill: '#b8231f', 'font-family': FONT.title });
      const coins = [0, 1, 2, 3].map((i) => svgEl('g', { display: 'none' }, g));
      coins.forEach((cg) => { svgEl('circle', { cx: 0, cy: 0, r: 18, fill: '#f6c445', stroke: INK, 'stroke-width': 4 }, cg); k.text(cg, '¥', { x: 0, y: 8, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 900, fill: '#a5621a' }); });
      const [a, b] = k.win(); k.F.text(sm, 'label', sm.textContent, a, b, { noFact: true, overlap: true });
      if (o.open !== undefined) {
        const op = o.open; k.F.text(amt, 'label', o.amount || '¥8.88', ...k.win(op), { overlap: true }); k.F.sfx(k.when(op), 'open', 0.7);
        k.F.add((t) => {
          const lt = k.clock(t), q = seg(lt, op, op + 0.3, E.cubicInOut), up = seg(lt, op + 0.2, op + 0.6, E.backOut);
          flap.setAttribute('transform', `translate(0,-160) scale(1,${(1 - 2 * q).toFixed(3)}) translate(0,160)`);
          if (q > 0.5 && flap.nextSibling !== bill) g.insertBefore(flap, bill); else if (q <= 0.5 && bill.nextSibling === flap) g.insertBefore(flap, seal);
          seal.setAttribute('opacity', (1 - q).toFixed(3));
          bill.setAttribute('display', lt >= op ? '' : 'none');
          bill.setAttribute('transform', `translate(0,${f1(110 - up * 185)})`);
          coins.forEach((cg, i) => { const cq = seg(lt, op + 0.35 + i * 0.06, op + 1.1 + i * 0.06), an = -Math.PI / 2 + (i - 1.5) * 0.5; cg.setAttribute('display', cq > 0 && cq < 1 ? '' : 'none'); cg.setAttribute('transform', `translate(${f1(Math.cos(an) * 190 * cq)},${f1(-170 + Math.sin(an) * 150 * cq + 200 * cq * cq)})`); cg.setAttribute('opacity', (1 - cq * cq).toFixed(3)); });
        });
      } else bill.setAttribute('display', 'none');
      return {};
    };
    // a calendar: mode 'day' (a tear-off page: month, a big date, the weekday, a note) or 'month' (a grid with red marks)
    PROPS.calendar = (g, o, k) => {
      const [a, b] = k.win();
      svgEl('rect', { x: -170, y: -190, width: 340, height: 380, rx: 18, fill: '#fffaf0', stroke: INK, 'stroke-width': 7 }, g);
      svgEl('path', { d: 'M-170,-172 Q-170,-190 -152,-190 L152,-190 Q170,-190 170,-172 L170,-100 L-170,-100 Z', fill: C.red, stroke: INK, 'stroke-width': 7 }, g);
      for (const rx of [-90, 90]) svgEl('rect', { x: rx - 9, y: -214, width: 18, height: 48, rx: 9, fill: '#c8ccd6', stroke: INK, 'stroke-width': 5 }, g);
      const mo = k.text(g, o.month || M('十月', 'OCT'), { x: 0, y: -128, 'text-anchor': 'middle', 'font-size': 44, 'font-weight': 900, fill: '#fff' });
      k.F.text(mo, 'label', mo.textContent, a, b, { overlap: true });
      if ((o.mode || 'day') === 'day') {
        const dy = k.text(g, String(o.day ?? 20), { x: 0, y: 70, 'text-anchor': 'middle', 'font-size': 170, 'font-weight': 900, 'font-family': FONT.title });
        const wd = k.text(g, o.weekday || M('星期二', 'Tuesday'), { x: 0, y: 126, 'text-anchor': 'middle', 'font-size': 36, 'font-weight': 700, fill: '#555' });
        k.F.text(dy, 'label', dy.textContent, a, b, { overlap: true }); k.F.text(wd, 'label', wd.textContent, a, b, { overlap: true });
        if (o.note) { const nt = k.text(g, o.note, { x: 0, y: 168, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 500, fill: '#888' }); k.F.text(nt, 'label', o.note, a, b, { overlap: true }); }
      } else {
        const days = o.days ?? 31, st = o.start ?? 3, cw = 44, ch = 44;
        const head = M(['日', '一', '二', '三', '四', '五', '六'], ['S', 'M', 'T', 'W', 'T', 'F', 'S']);
        head.forEach((s, i) => k.text(g, s, { x: -132 + i * cw, y: -66, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700, fill: '#999' }));
        const cells = {};
        for (let d = 1; d <= days; d++) { const i = d - 1 + st, cx = -132 + (i % 7) * cw, cy = -30 + Math.floor(i / 7) * ch; cells[d] = [cx, cy - 8]; k.text(g, String(d), { x: cx, y: cy, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 700 }); }
        for (const mk of o.marks || []) {
          const [cx, cy] = cells[mk.day] || [0, 0], at = mk.at ?? 0;
          const p = svgEl('path', { d: mk.kind === 'cross' ? `M${cx - 16},${cy - 16} L${cx + 16},${cy + 16} M${cx + 16},${cy - 16} L${cx - 16},${cy + 16}` : roughEllipse(cx, cy, 24, 21, mk.day), fill: 'none', stroke: mk.color || C.red, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
          drawOn(p, k.when(at), 0.4); k.F.sfx(k.when(at), 'pen', 0.5, { dur: 0.4 });
        }
        k.F.fact(Array.from({ length: days }, (_, i) => i + 1).join(' '), a, b);
      }
      return { info: 'chart' };
    };
    // a balance (礼尚往来): things land on the pans at their times and the beam settles to their weights
    PROPS.scale = (g, o, k) => {
      const loads = o.load || [], BL = 190, HANG = 120;
      svgEl('path', { d: 'M-110,0 L110,0 L70,-34 L-70,-34 Z', fill: '#b98b4e', stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' }, g);
      svgEl('rect', { x: -12, y: -300, width: 24, height: 270, fill: '#d6a95e', stroke: INK, 'stroke-width': 6 }, g);
      const beam = svgEl('g', { transform: 'translate(0,-300)' }, g);
      svgEl('rect', { x: -BL - 10, y: -10, width: 2 * BL + 20, height: 20, rx: 10, fill: '#d6a95e', stroke: INK, 'stroke-width': 6 }, beam);
      svgEl('circle', { cx: 0, cy: -300, r: 18, fill: C.amber, stroke: INK, 'stroke-width': 6 }, g);
      const pans = [-1, 1].map((sd) => {
        const pg = svgEl('g', {}, g);
        svgEl('path', { d: `M0,0 L-70,${HANG} M0,0 L70,${HANG}`, stroke: INK, 'stroke-width': 4 }, pg);
        const stuff = svgEl('g', { transform: `translate(0,${HANG - 6})` }, pg);
        svgEl('path', { d: `M-92,${HANG} Q0,${HANG + 70} 92,${HANG} Z`, fill: '#e6c27a', stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }, pg);
        return { sd, pg, stuff };
      });
      for (const ld of loads) { const pn = pans[ld.side === 'right' ? 1 : 0]; R.prop(pn.stuff, ld.prop, { ...(ld.o || {}), s: ld.s ?? 0.3, y: ld.y ?? 0, x: ld.x ?? 0, a: ld.at, tape: o.tape, clock: o.clock, when: o.when, sfx: 'pop' }); }
      if (o.labels) for (const [i, side] of [[0, 'left'], [1, 'right']]) if (o.labels[side]) { const tl = k.text(pans[i].pg, o.labels[side], { x: 0, y: HANG + 100, 'text-anchor': 'middle', 'font-size': 36, 'font-weight': 900, fill: '#fff', stroke: INK, 'stroke-width': 8, 'paint-order': 'stroke' }); k.F.text(tl, 'label', o.labels[side], ...k.win()); }
      k.F.add((t) => {
        const lt = k.clock(t);
        let ang = 0, last = -9, prev = 0;
        const tilt = (time) => { let wl = 0, wr = 0; for (const ld of loads) if (time >= ld.at) (ld.side === 'right' ? (wr += ld.w ?? 1) : (wl += ld.w ?? 1)); return Math.max(-16, Math.min(16, (wl - wr) * -11)); };
        for (const ld of loads) if (lt >= ld.at && ld.at > last) { last = ld.at; }
        prev = tilt(last - 1e-3); ang = lerp(prev, tilt(lt), last > -9 ? seg(lt, last, last + 0.7, E.backOut) : 1);
        beam.setAttribute('transform', `translate(0,-300) rotate(${ang.toFixed(2)})`);
        const r = (ang * Math.PI) / 180;
        for (const p of pans) p.pg.setAttribute('transform', `translate(${f1(p.sd * BL * Math.cos(r))},${f1(-300 + p.sd * BL * Math.sin(r))})`);
      });
      return { info: 'compare' };
    };
    // speech / thought bubble with text
    PROPS.bubble = (g, o, k) => {
      const size = o.size ?? 36, lines = wrap(o.text || '', o.max ?? 9), w = Math.max(...lines.map((s) => wlen(s))) * size + 60, h = lines.length * size * 1.25 + 44;
      const tail = o.tail || 'bl', tx = tail.includes('r') ? w * 0.25 : -w * 0.25;
      if (o.think) { for (const [cx, cy, r] of [[tx * 1.2, h / 2 + 30, 14], [tx * 1.5, h / 2 + 62, 9]]) svgEl('circle', { cx, cy, r, fill: '#fff', stroke: INK, 'stroke-width': 5 }, g); }
      else svgEl('path', { d: `M${tx - 22},${h / 2 - 4} L${tx * 1.5},${h / 2 + 46} L${tx + 24},${h / 2 - 4} Z`, fill: '#fff', stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }, g);
      svgEl('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: o.think ? h / 2 : 26, fill: '#fff', stroke: INK, 'stroke-width': 6 }, g);
      if (!o.think) svgEl('path', { d: `M${tx - 18},${h / 2 - 3} L${tx + 20},${h / 2 - 3}`, stroke: '#fff', 'stroke-width': 8 }, g);
      const te = svgEl('text', { 'font-family': o.font || FONT.sans, 'font-weight': 900, 'font-size': size, fill: INK, 'text-anchor': 'middle' }, g);
      lines.forEach((s, j) => { const sp = svgEl('tspan', { x: 0, y: -h / 2 + 22 + size * 0.95 + j * size * 1.25 }, te); sp.textContent = s; });
      k.F.text(te, 'label', o.text, ...k.win(), { overlap: true });
      return { info: null };
    };
    // small things (icons on cards, things in hands, things on the balance)
    const simple = (draw) => (g, o, k) => { draw(g, o, k); return { info: o.info ?? null }; };
    PROPS.lantern = simple((g) => {
      svgEl('path', { d: 'M0,-150 L0,-120', stroke: INK, 'stroke-width': 6 }, g);
      svgEl('rect', { x: -50, y: -124, width: 100, height: 22, rx: 6, fill: C.amber, stroke: INK, 'stroke-width': 6 }, g);
      svgEl('ellipse', { cx: 0, cy: -10, rx: 110, ry: 96, fill: '#e33a2f', stroke: INK, 'stroke-width': 7 }, g);
      for (const rx of [40, 76]) svgEl('ellipse', { cx: 0, cy: -10, rx, ry: 96, fill: 'none', stroke: '#a91f18', 'stroke-width': 4 }, g);
      svgEl('rect', { x: -50, y: 82, width: 100, height: 22, rx: 6, fill: C.amber, stroke: INK, 'stroke-width': 6 }, g);
      svgEl('path', { d: 'M-14,104 L-20,160 M0,104 L0,166 M14,104 L20,160', stroke: '#e33a2f', 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
    });
    PROPS.cake = simple((g, o, k) => {
      svgEl('rect', { x: -120, y: -30, width: 240, height: 110, rx: 14, fill: '#ffd7e2', stroke: INK, 'stroke-width': 7 }, g);
      svgEl('rect', { x: -84, y: -110, width: 168, height: 84, rx: 12, fill: '#fff4dc', stroke: INK, 'stroke-width': 7 }, g);
      svgEl('path', { d: 'M-120,0 q20,24 40,0 t40,0 t40,0 t40,0 t40,0 t40,0', fill: 'none', stroke: '#ff8fab', 'stroke-width': 9 }, g);
      for (const cx of [-44, 0, 44]) { svgEl('rect', { x: cx - 7, y: -160, width: 14, height: 52, rx: 4, fill: '#7cc4ff', stroke: INK, 'stroke-width': 4 }, g); const fl = svgEl('path', { d: `M${cx},-196 Q${cx + 14},-176 ${cx},-166 Q${cx - 14},-176 ${cx},-196 Z`, fill: C.amber, stroke: INK, 'stroke-width': 3 }, g); k.F.add((t) => fl.setAttribute('transform', `translate(${cx},-170) scale(${(1 + Math.sin(t * 11 + cx) * 0.06).toFixed(3)}) translate(${-cx},170)`)); }
    });
    PROPS.gift = simple((g) => {
      svgEl('rect', { x: -110, y: -60, width: 220, height: 150, rx: 10, fill: '#7cc4ff', stroke: INK, 'stroke-width': 7 }, g);
      svgEl('rect', { x: -124, y: -100, width: 248, height: 50, rx: 10, fill: '#a6dbff', stroke: INK, 'stroke-width': 7 }, g);
      svgEl('rect', { x: -18, y: -100, width: 36, height: 190, fill: C.red, stroke: INK, 'stroke-width': 5 }, g);
      for (const sd of [-1, 1]) svgEl('path', { d: `M0,-100 C${sd * 40},-170 ${sd * 100},-140 ${sd * 10},-102 Z`, fill: C.red, stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }, g);
    });
    PROPS.heart = simple((g, o) => svgEl('path', { d: 'M0,70 C-150,-30 -90,-150 0,-70 C90,-150 150,-30 0,70 Z', fill: o.color || '#ff5a7a', stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' }, g));
    PROPS.box = simple((g, o, k) => {
      svgEl('rect', { x: -130, y: -110, width: 260, height: 200, rx: 6, fill: '#d7a466', stroke: INK, 'stroke-width': 7 }, g);
      svgEl('path', { d: 'M-130,-110 L-100,-150 L100,-150 L130,-110', fill: '#e8bb7e', stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' }, g);
      svgEl('rect', { x: -26, y: -110, width: 52, height: 200, fill: '#c9b48a', opacity: 0.8 }, g);
      if (o.text) { const te = k.text(g, o.text, { x: 0, y: 40, 'text-anchor': 'middle', 'font-size': 40, 'font-weight': 900, fill: '#7a4a1e' }); k.F.text(te, 'label', o.text, ...k.win(), { overlap: true }); }
    });
    PROPS.qmark = simple((g, o, k) => {
      const q = k.text(g, '?', { x: 0, y: 70, 'text-anchor': 'middle', 'font-size': 240, 'font-weight': 400, 'font-family': FONT.hand, fill: o.color || C.amber, stroke: INK, 'stroke-width': 8, 'paint-order': 'stroke' });
      k.F.add((t) => q.setAttribute('transform', `rotate(${(Math.sin(t * 3) * 8).toFixed(2)})`));
    });
    PROPS.coin = simple((g, o, k) => { svgEl('circle', { cx: 0, cy: 0, r: 60, fill: '#f6c445', stroke: INK, 'stroke-width': 7 }, g); svgEl('circle', { cx: 0, cy: 0, r: 42, fill: 'none', stroke: '#c98f1f', 'stroke-width': 5 }, g); k.text(g, '¥', { x: 0, y: 24, 'text-anchor': 'middle', 'font-size': 64, 'font-weight': 900, fill: '#a5621a' }); });
    PROPS.sparkle = simple((g, o, k) => {
      const st = svgEl('path', { d: 'M0,-60 Q8,-8 60,0 Q8,8 0,60 Q-8,8 -60,0 Q-8,-8 0,-60 Z', fill: o.color || C.amber, stroke: INK, 'stroke-width': 5 }, g);
      k.F.add((t) => st.setAttribute('transform', `scale(${(0.85 + Math.sin(t * 2.6 + (o.seed ?? 0)) * 0.15).toFixed(3)})`));
    });
    PROPS.magnifier = simple((g) => {
      svgEl('path', { d: 'M60,60 L150,150', stroke: '#5a3a26', 'stroke-width': 34, 'stroke-linecap': 'round' }, g);
      svgEl('circle', { cx: 0, cy: 0, r: 90, fill: 'rgba(200,230,255,.35)', stroke: '#2c2f3a', 'stroke-width': 22 }, g);
      svgEl('path', { d: 'M-50,-30 A60,60 0 0 1 -20,-58', fill: 'none', stroke: '#fff', 'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0.7 }, g);
    });

    // objects in the same rubber-hose cartoon hand: thick ink, flat colour, a shade and a highlight
    PROPS.clock = (g, o, k) => {
      for (const sd of [-1, 1]) { svgEl('path', { d: `M${sd * 60},90 L${sd * 90},140`, stroke: INK, 'stroke-width': 14, 'stroke-linecap': 'round' }, g); svgEl('path', { d: `M${sd * 40},-128 A55,55 0 0 1 ${sd * 118},-70 Z`, fill: '#d6453a', stroke: INK, 'stroke-width': 7, transform: sd < 0 ? 'scale(-1,1)' : '' }, g); }
      svgEl('circle', { cx: 0, cy: 0, r: 128, fill: '#d6453a', stroke: INK, 'stroke-width': 8 }, g);
      svgEl('circle', { cx: 0, cy: 0, r: 104, fill: '#f6f0de', stroke: INK, 'stroke-width': 6 }, g);
      for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2; svgEl('line', { x1: Math.sin(an) * 84, y1: -Math.cos(an) * 84, x2: Math.sin(an) * 96, y2: -Math.cos(an) * 96, stroke: INK, 'stroke-width': i % 3 ? 4 : 8 }, g); }
      const hh = svgEl('line', { x1: 0, y1: 0, x2: 0, y2: -52, stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round' }, g), mh = svgEl('line', { x1: 0, y1: 0, x2: 0, y2: -80, stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
      svgEl('circle', { r: 10, fill: INK }, g);
      const [H0, M0] = String(o.time || '10:10').split(':').map(Number);
      k.F.add((t) => { const lt = k.clock(t), mm = M0 + (o.spin ?? 0) * 60 * Math.max(0, lt - (o.a ?? 0)), hr = H0 + mm / 60; mh.setAttribute('transform', `rotate(${((mm % 60) * 6).toFixed(1)})`); hh.setAttribute('transform', `rotate(${((hr % 12) * 30).toFixed(1)})`); });
      return { info: 'shape' };
    };
    PROPS.battery = (g, o, k) => {
      const lv = Math.max(0, Math.min(1, o.level ?? 0.19)), low = lv < 0.2, col = o.color || (low ? '#e53935' : '#43b047');
      svgEl('rect', { x: -170, y: -90, width: 320, height: 180, rx: 30, fill: '#f6f0de', stroke: INK, 'stroke-width': 10 }, g);
      svgEl('rect', { x: 150, y: -40, width: 30, height: 80, rx: 10, fill: INK }, g);
      const fill = svgEl('rect', { x: -150, y: -70, width: 280 * lv, height: 140, rx: 16, fill: col }, g);
      const tx = k.text(g, o.label ?? `${Math.round(lv * 100)}%`, { x: -10, y: 34, 'text-anchor': 'middle', 'font-size': 96, 'font-weight': 900, fill: INK, 'font-family': FONT.title });
      k.F.text(tx, 'label', tx.textContent, ...k.win(), { overlap: true });
      if (low && o.blink !== false) { fill.dataset.motion = 'skip'; k.F.add((t) => fill.setAttribute('opacity', Math.floor(k.clock(t) * 2.5) % 2 ? 0.35 : 1)); }
      return { info: 'chart' };
    };
    PROPS.powerbank = (g, o, k) => {
      svgEl('path', { d: 'M0,-170 C0,-230 90,-230 110,-280', fill: 'none', stroke: INK, 'stroke-width': 12, 'stroke-linecap': 'round' }, g);
      svgEl('rect', { x: -100, y: -170, width: 200, height: 320, rx: 34, fill: '#55b7e8', stroke: INK, 'stroke-width': 9 }, g);
      svgEl('rect', { x: 40, y: -160, width: 48, height: 300, rx: 22, fill: '#3a8fbf', opacity: 0.6 }, g);
      for (let i = 0; i < 4; i++) svgEl('circle', { cx: -45 + i * 30, cy: 110, r: 9, fill: i < 4 ? '#b8ff6a' : '#355', stroke: INK, 'stroke-width': 3 }, g);
      if (o.face !== false) { for (const sd of [-1, 1]) { svgEl('ellipse', { cx: sd * 30, cy: -40, rx: 15, ry: 19, fill: '#fff', stroke: INK, 'stroke-width': 5 }, g); svgEl('circle', { cx: sd * 30 + 3, cy: -36, r: 7, fill: INK }, g); } svgEl('path', { d: 'M-26,10 Q0,36 26,10', fill: 'none', stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, g); }
      return { info: 'shape' };
    };
    PROPS.socket = (g) => {
      svgEl('rect', { x: -140, y: -140, width: 280, height: 280, rx: 36, fill: '#f4f1e8', stroke: INK, 'stroke-width': 9 }, g);
      svgEl('rect', { x: -110, y: -110, width: 220, height: 220, rx: 24, fill: 'none', stroke: '#c9c3b2', 'stroke-width': 5 }, g);
      for (const [x1, y1, x2, y2] of [[-58, -10, -30, 40], [58, -10, 30, 40], [0, -70, 0, -30]]) svgEl('line', { x1, y1, x2, y2, stroke: INK, 'stroke-width': 16, 'stroke-linecap': 'round' }, g);
      return { info: 'shape' };
    };
    PROPS.bike = (g) => {
      for (const x of [-110, 110]) { svgEl('circle', { cx: x, cy: 40, r: 78, fill: 'none', stroke: INK, 'stroke-width': 12 }, g); svgEl('circle', { cx: x, cy: 40, r: 8, fill: INK }, g); }
      svgEl('path', { d: 'M-110,40 L-30,-60 L70,-60 L110,40 M-30,-60 L0,40 L70,-60 M0,40 L-110,40 M-46,-90 L-10,-90 M70,-60 L58,-104 L90,-110', fill: 'none', stroke: '#e0453a', 'stroke-width': 12, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      return { info: 'shape' };
    };
    // a pigeon, side view facing right (flip: true faces left): nod (head-bobs a second, or [[t, rate]…]), peck (pecks a second), flap ([[t0, t1]…] wings beating), coo ([t…] a coo)
    PROPS.bird = (g, o, k) => {
      const col = o.color || '#a3aec6', dk = shade(col, -0.22), sp = svgEl('g', o.flip ? { transform: 'scale(-1,1)' } : {}, g);
      svgEl('ellipse', { cx: 0, cy: 0, rx: 84, ry: 11, fill: 'rgba(0,0,0,.24)' }, sp);
      for (const [x0, x1] of [[-14, -20], [14, 16]]) svgEl('path', { d: `M${x0},-48 L${x1},-4 M${x1 - 14},-2 L${x1 + 16},-2`, stroke: '#e07a8a', 'stroke-width': 9, 'stroke-linecap': 'round', fill: 'none' }, sp);
      svgEl('path', { d: 'M-66,-104 L-158,-82 L-150,-58 L-58,-66 Z', fill: dk, stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }, sp);
      svgEl('path', { d: 'M-152,-80 L-146,-60', stroke: INK, 'stroke-width': 9 }, sp);
      const neck = svgEl('path', { fill: 'none', stroke: INK, 'stroke-width': 62, 'stroke-linecap': 'round' }, sp), neckIn = svgEl('path', { fill: 'none', stroke: col, 'stroke-width': 50, 'stroke-linecap': 'round' }, sp), sheen = svgEl('path', { fill: 'none', stroke: '#5fa08a', 'stroke-width': 30, 'stroke-linecap': 'round', opacity: 0.85 }, sp);
      svgEl('ellipse', { cx: -6, cy: -94, rx: 92, ry: 58, fill: col, stroke: INK, 'stroke-width': 7 }, sp);
      svgEl('ellipse', { cx: 6, cy: -76, rx: 54, ry: 26, fill: shade(col, 0.25), opacity: 0.6 }, sp);
      const wing = svgEl('g', {}, sp);
      svgEl('path', { d: 'M38,-112 C10,-150 -70,-140 -104,-92 C-60,-62 0,-66 38,-112 Z', fill: dk, stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }, wing);
      for (const x of [-46, -70]) svgEl('path', { d: `M${x + 12},-124 L${x - 10},-80`, stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }, wing);
      const head = svgEl('g', {}, sp);
      svgEl('circle', { cx: 0, cy: 0, r: 36, fill: col, stroke: INK, 'stroke-width': 7 }, head);
      svgEl('path', { d: 'M30,-6 L62,4 L30,14 Z', fill: '#3a3a44', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, head);
      svgEl('ellipse', { cx: 30, cy: -6, rx: 8, ry: 5, fill: '#f2eee6' }, head);
      svgEl('circle', { cx: 10, cy: -8, r: 11, fill: '#f39c33', stroke: INK, 'stroke-width': 4 }, head);
      svgEl('circle', { cx: 12, cy: -8, r: 5, fill: INK }, head);
      for (const at of [].concat(o.coo || [])) k.F.sfx(k.when(at), 'coo', 0.5);
      for (const [t0] of o.flap || []) k.F.sfx(k.when(t0), 'flap', 0.5);
      const ph = o.seed ?? (o.x ?? 0) * 0.013;
      k.F.add((t) => {
        const lt = k.clock(t), nb = bobAt(o.nod, lt, ph), pr = o.peck ? (((lt * o.peck + ph) % 1) + 1) % 1 : 1, pk = pr < 0.3 ? Math.sin((pr / 0.3) * Math.PI) : 0;
        const hx = 62 + nb * (o.nodAmp ?? 26) + pk * 46, hy = -176 + pk * 140, hr = pk * 50;
        head.setAttribute('transform', `translate(${f1(hx)},${f1(hy)}) rotate(${hr.toFixed(1)})`);
        const d = `M24,-116 Q${f1(hx * 0.6 + 8)},${f1(hy * 0.5 - 60)} ${f1(hx)},${f1(hy)}`;
        for (const p of [neck, neckIn, sheen]) p.setAttribute('d', d);
        const fl = (o.flap || []).some(([t0, t1]) => lt >= t0 && lt < t1);
        wing.setAttribute('transform', fl ? `rotate(${f1(-70 * Math.abs(Math.sin(lt * 16)))},30,-112)` : '');
      });
      return { info: 'figure' };
    };
    // bread: a slice of toast (mode: 'slice') or crumbs on the ground (mode: 'crumbs', n of them across w)
    PROPS.bread = (g, o, k) => {
      if (o.mode === 'crumbs') {
        const r = rnd(o.seed ?? 7), n = o.n ?? 9, w = o.w ?? 300;
        for (let i = 0; i < n; i++) { const cx = (r() - 0.5) * w, cy = (r() - 0.5) * 30, s = 9 + r() * 12, pts = []; for (let j = 0; j < 5; j++) { const an = (j / 5) * Math.PI * 2 + r(); pts.push(`${f1(cx + Math.cos(an) * s * (0.7 + r() * 0.5))},${f1(cy + Math.sin(an) * s * 0.75)}`); } svgEl('path', { d: `M${pts.join(' L')} Z`, fill: r() < 0.4 ? '#c9853e' : '#f2cf8c', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g); }
      } else {
        svgEl('path', { d: 'M-110,90 L-110,-40 C-150,-60 -140,-140 -70,-140 C-40,-170 40,-170 70,-140 C140,-140 150,-60 110,-40 L110,90 Z', fill: '#c9853e', stroke: INK, 'stroke-width': 8, 'stroke-linejoin': 'round' }, g);
        svgEl('path', { d: 'M-88,72 L-88,-50 C-118,-66 -110,-118 -62,-118 C-36,-144 36,-144 62,-118 C110,-118 118,-66 88,-50 L88,72 Z', fill: '#f5dca6' }, g);
        for (const [cx, cy] of [[-40, -40], [30, 10], [-20, 40], [50, -70]]) svgEl('circle', { cx, cy, r: 5, fill: '#dcb87a' }, g);
      }
      return { info: 'shape' };
    };
    // a bed, side view (headboard on the left; flip: true on the right), the floor at y 0: color = the blanket
    PROPS.bed = (g, o) => {
      const sp = svgEl('g', o.flip ? { transform: 'scale(-1,1)' } : {}, g), col = o.color || '#ff8fab';
      for (const x of [-260, 250]) svgEl('rect', { x, y: -60, width: 16, height: 60, fill: '#8a5a3a', stroke: INK, 'stroke-width': 5 }, sp);
      svgEl('rect', { x: -276, y: -280, width: 40, height: 260, rx: 12, fill: '#b9794a', stroke: INK, 'stroke-width': 7 }, sp);
      svgEl('rect', { x: -250, y: -130, width: 520, height: 76, rx: 14, fill: '#f6f0de', stroke: INK, 'stroke-width': 7 }, sp);
      svgEl('ellipse', { cx: -170, cy: -150, rx: 66, ry: 30, fill: '#fff', stroke: INK, 'stroke-width': 6 }, sp);
      svgEl('path', { d: 'M-110,-128 C-110,-176 -40,-196 60,-186 C170,-176 270,-170 276,-128 L282,-40 L-110,-60 Z', fill: col, stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' }, sp);
      svgEl('path', { d: 'M-40,-170 C40,-150 160,-150 250,-160', fill: 'none', stroke: shade(col, -0.2), 'stroke-width': 6, 'stroke-linecap': 'round' }, sp);
      return { info: 'shape' };
    };
    // a front door, the floor at y 0 (mat: false drops the doormat)
    PROPS.door = (g, o) => {
      const col = o.color || '#c0603c';
      svgEl('rect', { x: -130, y: -470, width: 260, height: 470, fill: '#efe6cf', stroke: INK, 'stroke-width': 8 }, g);
      svgEl('rect', { x: -106, y: -446, width: 212, height: 446, fill: col, stroke: INK, 'stroke-width': 7 }, g);
      for (const y of [-416, -220]) svgEl('rect', { x: -78, y, width: 156, height: 160, rx: 8, fill: 'none', stroke: shade(col, -0.25), 'stroke-width': 6 }, g);
      svgEl('circle', { cx: 74, cy: -230, r: 14, fill: '#f6c445', stroke: INK, 'stroke-width': 5 }, g);
      if (o.mat !== false) svgEl('rect', { x: -150, y: -10, width: 300, height: 24, rx: 8, fill: '#7a8a5a', stroke: INK, 'stroke-width': 5 }, g);
      return { info: 'shape' };
    };
    // a dimension line w units long with end ticks, drawn out from the middle at a, its label above (a fake precise measurement)
    PROPS.measure = (g, o, k) => {
      const w = o.w ?? 600, hw = w / 2, col = o.color || '#fff', at = o.a ?? 0;
      const line = svgEl('path', { fill: 'none', stroke: INK, 'stroke-width': 16, 'stroke-linecap': 'round' }, g), lineIn = svgEl('path', { fill: 'none', stroke: col, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-dasharray': o.dash === false ? 'none' : '22 16' }, g);
      const ticks = [-1, 1].map((sd) => { const tg = svgEl('g', {}, g); svgEl('path', { d: `M${sd * hw},-34 L${sd * hw},34`, stroke: INK, 'stroke-width': 16, 'stroke-linecap': 'round' }, tg); svgEl('path', { d: `M${sd * hw},-34 L${sd * hw},34 M${sd * (hw - 30)},-20 L${sd * hw},0 L${sd * (hw - 30)},20`, fill: 'none', stroke: col, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, tg); return tg; });
      if (o.label) { const tl = k.text(g, o.label, { x: 0, y: -40, 'text-anchor': 'middle', 'font-size': o.size ?? 64, 'font-weight': 900, 'font-family': FONT.title, fill: col, stroke: INK, 'stroke-width': 12, 'paint-order': 'stroke' }); k.F.text(tl, 'label', o.label, ...k.win(at + 0.3)); k.F.add((t) => { const q = seg(k.clock(t), at + 0.3, at + 0.55, E.backOut); tl.setAttribute('opacity', Math.min(1, q * 2).toFixed(3)); tl.setAttribute('transform', `translate(0,${f1(-30 * (1 - q))})`); }); }
      k.F.sfx(k.when(at), 'pen', 0.5);
      k.F.add((t) => {
        const q = seg(k.clock(t), at, at + 0.5, E.cubicInOut), x = hw * q;
        for (const p of [line, lineIn]) p.setAttribute('d', `M${f1(-x)},0 L${f1(x)},0`);
        for (const tg of ticks) tg.setAttribute('display', q >= 1 ? '' : 'none');
      });
      return { info: 'annotate' };
    };
    // a crinkly bag of crisps: color, label ('薯片'), open (torn top with crisps poking out), crunch ([t…] a crunch each)
    PROPS.snack = (g, o, k) => {
      const col = o.color || '#e8453a';
      if (o.open) for (const [cx, cy, r] of [[-40, -170, 30], [10, -186, 34], [56, -168, 28]]) svgEl('ellipse', { cx, cy, rx: r, ry: r * 0.7, transform: `rotate(${cx / 3},${cx},${cy})`, fill: '#f6c445', stroke: INK, 'stroke-width': 6 }, g);
      const top = o.open ? 'M-112,-150 l18,10 l18,-12 l18,12 l18,-10 l18,12 l18,-12 l18,10 l18,-12 l18,12 l18,-10 l16,10' : 'M-112,-150 l224,0';
      svgEl('path', { d: `${top} L104,150 l-26,-10 l-26,10 l-26,-10 l-26,10 l-26,-10 l-26,10 l-26,-10 l-26,10 Z`, fill: col, stroke: INK, 'stroke-width': 8, 'stroke-linejoin': 'round' }, g);
      svgEl('path', { d: 'M60,-130 C80,-40 80,40 64,130', fill: 'none', stroke: shade(col, -0.22), 'stroke-width': 16, opacity: 0.6 }, g);
      svgEl('path', { d: 'M-80,-120 C-90,-60 -90,0 -84,40', fill: 'none', stroke: '#fff', 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0.5 }, g);
      svgEl('ellipse', { cx: 0, cy: 10, rx: 70, ry: 52, fill: '#f6c445', stroke: INK, 'stroke-width': 6 }, g);
      const lb = o.label ?? M('薯片', 'CRISPS'), te = k.text(g, lb, { x: 0, y: 28, 'text-anchor': 'middle', 'font-size': 46, 'font-weight': 900, 'font-family': FONT.title, fill: INK });
      k.F.text(te, 'label', lb, ...k.win(), { overlap: true });
      for (const at of [].concat(o.crunch || [])) k.F.sfx(k.when(at), 'crunch', 0.55);
      return { info: 'shape' };
    };
    // a book: closed (a cover with title; stack: n or [[t, n]…] copies piling up) or open (mode: 'open': title — a string or its lines — on the left page, lines [{ text, at, size, color }…] on the right)
    PROPS.book = (g, o, k) => {
      const col = o.color || '#3a6fd8';
      if (o.mode === 'open') {
        for (const sd of [-1, 1]) svgEl('path', { d: `M0,-170 C${sd * 60},-190 ${sd * 200},-190 ${sd * 260},-170 L${sd * 260},170 C${sd * 200},150 ${sd * 60},150 0,170 Z`, fill: '#fffaf0', stroke: INK, 'stroke-width': 8, 'stroke-linejoin': 'round' }, g);
        svgEl('path', { d: 'M-270,-160 L-270,186 C-180,166 -60,170 0,190 C60,170 180,166 270,186 L270,-160', fill: 'none', stroke: col, 'stroke-width': 14, 'stroke-linejoin': 'round' }, g);
        if (o.title) { const tl = Array.isArray(o.title) ? o.title : wrap(o.title, 5); tl.forEach((s, i) => { const te = k.text(g, s, { x: -130, y: -60 + i * 64 - (tl.length - 1) * 32, 'text-anchor': 'middle', 'font-size': 52, 'font-weight': 900, 'font-family': FONT.title, fill: INK }); k.F.text(te, 'label', s, ...k.win(), { overlap: true }); }); }
        (o.lines || []).forEach((ln, i) => {
          const L2 = typeof ln === 'string' ? { text: ln } : ln, at = L2.at, te = k.text(g, L2.text, { x: 30, y: -100 + i * 66, 'font-size': L2.size ?? 40, 'font-weight': L2.bold === false ? 500 : 900, fill: L2.color ?? INK });
          k.F.text(te, 'label', L2.text, ...k.win(at), { overlap: true });
          if (at !== undefined) { k.F.sfx(k.when(at), 'pen', 0.4, { dur: 0.3 }); k.F.add((t) => te.setAttribute('opacity', k.clock(t) >= at ? Math.min(1, seg(k.clock(t), at, at + 0.2)).toFixed(3) : 0)); }
        });
        return { info: 'shape' };
      }
      const cover = (pg) => {
        svgEl('rect', { x: -150, y: -200, width: 300, height: 400, rx: 14, fill: col, stroke: INK, 'stroke-width': 8 }, pg);
        svgEl('rect', { x: -150, y: -200, width: 40, height: 400, rx: 10, fill: shade(col, -0.25), stroke: INK, 'stroke-width': 6 }, pg);
        svgEl('rect', { x: -80, y: -120, width: 190, height: 110, rx: 8, fill: '#fffaf0', stroke: INK, 'stroke-width': 5 }, pg);
        if (o.title) { const te = k.text(pg, o.title, { x: 15, y: -50, 'text-anchor': 'middle', 'font-size': o.title.length > 3 ? 40 : 54, 'font-weight': 900, 'font-family': FONT.title, fill: INK }); return te; }
        return null;
      };
      const max = Array.isArray(o.stack) ? Math.max(...o.stack.map(([, n]) => n)) : o.stack ?? 1, pages = [];
      for (let i = 0; i < max; i++) { const pg = svgEl('g', { transform: `translate(${(i % 2 ? 8 : -6) * Math.min(i, 1)},${-i * 34}) rotate(${i ? (i % 2 ? 3 : -3) : 0})` }, g); const te = cover(pg); if (te && i === 0) k.F.text(te, 'label', o.title, ...k.win(), { overlap: true }); pages.push(pg); }
      if (Array.isArray(o.stack)) {
        o.stack.forEach(([at, n], j) => { if (j && n > o.stack[j - 1][1]) k.F.sfx(k.when(at), 'paper', 0.4, { dur: 0.2 }); });
        k.F.add((t) => { const [n, at] = lastAt(o.stack, k.clock(t), 1); pages.forEach((pg, i) => pg.setAttribute('display', i < n ? '' : 'none')); pages[n - 1] && pages[n - 1].setAttribute('opacity', Math.min(1, seg(k.clock(t), at, at + 0.12)).toFixed(3)); });
      }
      return { info: 'shape' };
    };
    // a ticket stub: title, sub (seat / date), a tear line and a barcode
    PROPS.ticket = (g, o, k) => {
      const col = o.color || '#ff8fab';
      svgEl('path', { d: 'M-240,-110 L240,-110 L240,-30 A30,30 0 0 0 240,30 L240,110 L-240,110 L-240,30 A30,30 0 0 0 -240,-30 Z', fill: col, stroke: INK, 'stroke-width': 8, 'stroke-linejoin': 'round' }, g);
      svgEl('path', { d: 'M120,-104 L120,104', stroke: INK, 'stroke-width': 5, 'stroke-dasharray': '12 10' }, g);
      for (let i = 0; i < 12; i++) svgEl('rect', { x: 146 + i * 6.5, y: -70, width: i % 3 ? 3 : 5, height: 140, fill: INK }, g);
      const tt = o.title ?? M('演唱会', 'CONCERT'), te = k.text(g, tt, { x: -60, y: -6, 'text-anchor': 'middle', 'font-size': 64, 'font-weight': 900, 'font-family': FONT.title, fill: INK });
      k.F.text(te, 'label', tt, ...k.win(), { overlap: true });
      if (o.sub) { const se = k.text(g, o.sub, { x: -60, y: 60, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 700, fill: shade(col, -0.55) }); k.F.text(se, 'label', o.sub, ...k.win(), { overlap: true }); }
      return { info: 'shape' };
    };
    // ---------- the interviewee ----------
    R.witness = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b), S = o.svg || R.svg(L, { z: 4 });
      const x = o.x ?? (PT ? RW / 2 : RW * 0.3), y = o.y ?? (PT ? RH * 0.62 : RH * 0.92), s = o.s ?? (PT ? 1.9 : 2.2);
      const h = R.prop(S, 'friend', { x, y, s, a, b, enter: 'none', color: o.color || '#59627a', face: 'calm', arms: o.arms || 'down', sfx: false });
      const mos = svgEl('g', {}, h.g.firstChild); mos.dataset.motion = 'skip';
      const cells = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) cells.push(svgEl('rect', { x: -78 + i * 26, y: -238 + j * 26, width: 26.5, height: 26.5 }, mos));
      F.add((t) => { const r = rnd(Math.floor(t * 5) * 17 + 3); for (const c of cells) { const v = 70 + Math.floor(r() * 90); c.setAttribute('fill', `rgb(${v},${v + 6},${v + 14})`); } });
      const tx = PT ? 70 : RW * 0.52, ty = PT ? RH * 0.13 : RH * 0.22;
      if (o.quote) R.text(L, `「${o.quote}」`, { x: tx, y: ty, w: PT ? RW - 140 : RW * 0.42, size: PT ? 66 : 70, font: FONT.title, weight: 900, color: '#f6f0e2', a: a + 0.3, b, text: o.quote, lh: 1.3 });
      R.lower(L, { a: a + 0.15, b, title: o.name || M('受访者', 'Witness'), sub: o.role, x: PT ? 70 : RW * 0.52, y: PT ? RH * 0.42 : RH * 0.6 });
      if (o.voice !== false) R.tag(L, M('声音已做处理', 'Voice altered'), { a, b, right: true });
      F.info('figure', a, b);
      return h;
    };

    // ---------- surveillance / night-vision HUD ----------
    function survHud(rec, o) {
      const { a, b } = rec, night = rec.grade === 'night', clock = o.clock || '2026-10-20 23:59:57';
      for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) el('div', `${cx ? 'right' : 'left'}:${gx(36)}px;${cy ? 'bottom' : 'top'}:${gx(36)}px;width:${gx(70)}px;height:${gx(70)}px;border-${cx ? 'right' : 'left'}:${gx(5)}px solid rgba(255,255,255,.85);border-${cy ? 'bottom' : 'top'}:${gx(5)}px solid rgba(255,255,255,.85)`, rec.hud);
      const recB = el('div', `left:${gx(70)}px;top:${gx(62)}px;display:flex;align-items:center;gap:${gx(12)}px;font:400 ${gx(36)}px/1 ${FONT.mono};color:#fff;letter-spacing:.08em`, rec.hud);
      const dot = el('i', `position:relative;width:${gx(22)}px;height:${gx(22)}px;border-radius:50%;background:${C.red}`, recB); dot.dataset.motion = 'skip';
      const rl = el('span', 'position:relative', recB, `REC  ${o.camName || 'CAM 02'}`);
      const ts = el('div', `right:${gx(70)}px;top:${gx(62)}px;font:400 ${gx(36)}px/1 ${FONT.mono};color:#fff;letter-spacing:.06em`, rec.hud, clockText(clock, 0));
      F.text(rl, 'label', rl.textContent, a, b, { noFact: true, chrome: true }); F.text(ts, 'label', ts.textContent, a, b, { noFact: true, chrome: true });
      if (o.place || night) { const pl = el('div', `left:${gx(70)}px;bottom:${gx(66)}px;font:400 ${gx(32)}px/1 ${FONT.mono};color:#fff;letter-spacing:.08em`, rec.hud, [night ? M('夜视', 'NIGHT VISION') : '', o.place || ''].filter(Boolean).join(' · ')); F.text(pl, 'label', pl.textContent, a, b, { noFact: true, chrome: true }); }
      rec.ticks.push((t) => { set(dot, { opacity: Math.floor((t - a) * 1.6) % 2 ? 0.2 : 1 }); const v = clockText(clock, t - a); if (ts.textContent !== v) ts.textContent = v; });
      F.sfx(a, 'static', 0.5, { dur: 0.3 });
    }

    // ---------- the truth ----------
    R.truth = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b);
      set(L, { background: '#fff1d2' });
      const rays = el('div', `left:${gx(RW / 2 - 1500)}px;top:${gx(RH / 2 - 1500)}px;width:${gx(3000)}px;height:${gx(3000)}px;border-radius:50%;background:repeating-conic-gradient(from 0deg, rgba(255,200,90,.42) 0deg 8deg, rgba(255,241,210,0) 8deg 20deg)`, L);
      F.add((t) => set(rays, { transform: `rotate(${((t - a) * 9).toFixed(2)}deg)` }));
      const S = R.svg(L, { z: 3 });
      [[RW * 0.16, RH * 0.24, 0.6], [RW * 0.84, RH * 0.3, 0.8], [RW * 0.22, RH * 0.78, 0.5], [RW * 0.8, RH * 0.76, 0.65]].forEach(([x, y, s], i) => R.prop(S, 'sparkle', { x, y, s: s * (PT ? 1.2 : 1), seed: i, a: a + 0.3 + i * 0.1, sfx: false, enter: 'pop' }));
      const k1 = o.kicker ?? M('真相', 'THE TRUTH'), ks = PT ? 220 : 240;
      R.text(L, k1, { anchor: 'c', x: RW / 2, y: RH / 2 - ks * 0.85 - (o.main ? 60 : 0), size: ks, font: FONT.title, weight: 900, color: C.red, a: a + 0.05, b, enter: 'slam', kind: 'slam', ls: '.1em', shadow: false });
      if (o.main) R.text(L, o.main, { anchor: 'c', x: RW / 2, y: RH / 2 + 90, w: RW - 200, size: PT ? 80 : 88, weight: 900, color: INK, a: a + 0.45, b, kind: 'headline', shadow: false });
      if (o.sub) R.text(L, o.sub, { anchor: 'c', x: RW / 2, y: RH / 2 + 220, w: RW - 200, size: 46, weight: 700, color: '#7a5a2c', a: a + 0.8, b, shadow: false });
      if (o.bloom !== false) { blooms.push([a, 0.55]); F.transition(a - 0.12, a + 0.55); }
      F.sfx(a, 'resolve', 1); F.musicCue(a, 'stop');
      F.scene(a, b, { role: 'drop' });
    };
    R.reasons = (L, o = {}) => {
      const [a, b] = winOf(L, o.a, o.b), items = o.items || [], n = items.length;
      if (!o.keepBg) set(L, { background: '#fff3d9' });
      const cols = o.cols ?? (PT ? Math.min(2, n) : Math.min(n, n === 4 ? 4 : 3)), rows = Math.ceil(n / cols);
      const top0 = o.title ? (PT ? 360 : 270) : 120, gap = 40, cw = (RW - 160 - gap * (cols - 1)) / cols, chh = Math.min(PT ? 520 : rows === 1 ? 500 : 660, (RH - top0 - (PT ? 520 : 200) - gap * (rows - 1)) / rows);
      if (o.title) R.text(L, o.title, { anchor: 'c', x: RW / 2, y: top0 - (PT ? 170 : 160), w: RW - 160, size: PT ? 76 : 80, weight: 900, color: INK, a, b, kind: 'headline', shadow: false });
      items.forEach((it, i) => {
        const c = i % cols, r = Math.floor(i / cols), x = 80 + c * (cw + gap), y = top0 + r * (chh + gap), at = it.at ?? a + 0.3 + i * 0.5;
        const card = el('div', `left:${gx(x)}px;top:${gx(y)}px;width:${gx(cw)}px;height:${gx(chh)}px;opacity:0`, L);
        el('div', `inset:0;background:${it.color || '#fffdf6'};border:${gx(6)}px solid ${INK};border-radius:${gx(24)}px;box-shadow:${gx(12)}px ${gx(14)}px 0 ${INK}`, card);
        const ih = chh * 0.52, sv = svgEl('svg', { viewBox: `${-cw / 2} ${-ih / 2} ${cw} ${ih}`, width: gx(cw), height: gx(ih), style: `position:absolute;left:0;top:${gx(16)}px;overflow:visible` }, card);
        if (it.icon) {   // any prop as the icon: drawn at its own size, then fitted into the top of the card
          const fit = svgEl('g', {}, sv); R.prop(fit, it.icon, { ...(it.o || {}), s: 1, sfx: false });
          F.prep(() => { const sh = shotOf(card), was = sh.S.style.display; sh.S.style.display = '';   // shots are hidden until their time: show it to measure
            const bb = fit.getBBox(); sh.S.style.display = was; const k = Math.min((cw * 0.62) / bb.width, (ih * 0.86) / bb.height) * (it.s ?? 1); fit.setAttribute('transform', `scale(${k.toFixed(4)}) translate(${f1(-(bb.x + bb.width / 2))},${f1(-(bb.y + bb.height / 2) + (it.iy ?? 0))})`); });
        }
        R.text(card, it.text, { anchor: 'c', x: cw / 2, y: ih + 30, w: cw - 40, size: it.size ?? (PT ? 58 : 54), weight: 900, color: INK, a: at, b, shadow: false });
        if (it.sub) R.text(card, it.sub, { anchor: 'c', x: cw / 2, y: ih + 30 + (it.size ?? 56) * 1.35 * Math.ceil((wlen(it.text) * (it.size ?? 56)) / (cw - 40)), w: cw - 50, size: PT ? 38 : 34, weight: 700, color: '#6c5a3c', a: at + 0.15, b, shadow: false });
        F.sfx(at, 'pop', 0.42);
        F.add((t) => { const q = seg(t, at, at + 0.4, E.backOut); set(card, { opacity: t >= at && t < b ? Math.min(1, seg(t, at, at + 0.12)).toFixed(3) : 0, transform: `translateY(${f1(gx(50) * (1 - q))}px) scale(${(0.88 + 0.12 * q).toFixed(3)})` }); });
      });
      F.info('diagram', a, b);
    };

    // ---------- open and close ----------
    R.ident = ({ at = 0, until, sub } = {}) => {
      const b = until ?? at + 3, L = R.shot(at, b, { grade: 'studio', cut: false });
      bigMark(L, at, b, { color: 'rgba(242,193,78,.06)' });
      const ns = PT ? 150 : 176;
      R.text(L, brand.name, { anchor: 'c', x: RW / 2, y: RH / 2 - ns * 0.8, size: ns, font: FONT.title, weight: 900, color: '#f6efe0', a: at + 0.5, b, kind: 'logo', ls: '.22em', noFact: true });
      const ln = el('div', `left:${gx(RW / 2 - 330)}px;top:${gx(RH / 2 + ns * 0.42)}px;width:${gx(660)}px;height:${gx(6)}px;background:${C.red};transform-origin:50% 50%`, L);
      F.add((t) => set(ln, { transform: `scaleX(${seg(t, at + 0.7, at + 1.1, E.cubicInOut).toFixed(3)})` }));
      if (brand.en) R.text(L, brand.en, { anchor: 'c', x: RW / 2, y: RH / 2 + ns * 0.42 + 36, size: 40, font: FONT.mono, weight: 400, color: C.amber, a: at + 0.9, b, ls: '.4em', noFact: true });
      const line = [brand.episode, sub].filter(Boolean).join(' · ');
      if (line) R.text(L, line, { anchor: 'c', x: RW / 2, y: RH / 2 + ns * 0.42 + 110, w: RW - 160, size: 42, weight: 700, color: '#c4ccd6', a: at + 1.2, b, ls: '.08em' });
      R.beam(L, { a: at, b: at + 1.4, keys: [[at, RW * 0.12, RH * 0.6], [at + 1.3, RW * 0.5, RH * 0.45]], r: PT ? 520 : 620 });
      R.cam(L, [[at, { s: 1.08, x: 0.5, y: 0.5 }], [b, { s: 1, x: 0.5, y: 0.5 }, E.sine]]);
      F.sfx(at + 0.5, 'boom', 0.9); F.sfx(at + 0.1, 'heart', 0.6);
      F.musicCue(at + 0.5, 'hit');
      return L;
    };
    R.end = ({ a, b, main = M('本案告破', 'Case closed'), sub, sources = [], notes = [], roll } = {}) => {
      const cr = F.credits || [];
      const e2 = sources.length || notes.length || cr.length ? Math.min(b, roll ?? a + Math.max(2.4, (b - a) * 0.5)) : b;
      const L = R.shot(a, e2, { grade: 'studio' });
      F.scene(a, b, { end: true });
      bigMark(L, a, e2, { color: 'rgba(242,193,78,.05)' });
      const ms = PT ? 140 : 150;
      R.text(L, main, { anchor: 'c', x: RW / 2, y: RH / 2 - ms * 0.95, size: ms, font: FONT.title, weight: 900, color: '#f6efe0', a: a + 0.1, b: e2, kind: 'endcard', ls: '.12em' });
      R.stamp(L, M('结案', 'CLOSED'), { x: RW / 2 + (PT ? 300 : 560), y: RH / 2 - ms * 1.15, size: PT ? 90 : 100, rot: -14, a: a + 0.6, b: e2 });
      R.text(L, [brand.name, sub].filter(Boolean).join(' · '), { anchor: 'c', x: RW / 2, y: RH / 2 + 60, w: RW - 160, size: 46, weight: 700, color: C.amber, a: a + 0.4, b: e2, ls: '.1em', noFact: !sub });
      if (e2 < b) {
        const L2 = R.shot(e2, b, { grade: 'plain', bg: '#07090e' }), lines = [];
        if (sources.length) { lines.push([M('资料来源', 'Sources'), 48, '#f6efe0', 900]); for (const s of sources) lines.push([s, 30, '#b9c3cf', 500]); }
        const groups = []; for (const c of cr) { const g2 = [c.author, c.licence].filter(Boolean).join(' · ') || c.title || c.file; if (!groups.includes(g2)) groups.push(g2); }
        if (groups.length) { lines.push([M('图片', 'Pictures'), 48, '#f6efe0', 900]); for (const g2 of groups.slice(0, 6)) lines.push([g2, 28, '#b9c3cf', 500]); }
        for (const n of notes) lines.push([n, 28, '#8f99a6', 500]);
        const total = lines.reduce((s, [, sz]) => s + sz * 1.7 + (sz > 40 ? 14 : 0), 0);
        let y = Math.max(60, (RH - total) / 2);
        const step = Math.max(0.12, Math.min(0.5, (b - e2 - 1.4) / Math.max(1, lines.length)));   // the lines come in across the roll, so it never sits still
        lines.forEach(([s, size, color, w], i) => { R.text(L2, s, { anchor: 'c', x: RW / 2, y, w: RW - 160, size, weight: w, color, a: e2 + 0.1 + i * step, b, ls: '.03em', noFact: size > 40, shadow: false }); y += size * 1.7 + (size > 40 ? 14 : 0); });
      }
      R.dip(b - 0.6, b + 0.6);
      F.musicCue(a + 0.1, 'name');
    };

    return R;
  };
})();
