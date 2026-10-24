// filmroom.js: the film room (录像分析) style, one of bb-video's visual styles (style notes in styles/filmroom/STYLE.md). Load after promo.js.
// One frame: real game footage (licence-clean, credited) on a dark broadcast set. The analyst stops the tape, draws on the frozen frame —
// a ring under a player's feet, the run she makes, the passing lane, the gap in the defence, a spotlight — rewinds, plays it again slower,
// and pushes in on the detail. Chapter cards between clips; a small HUD says which clip, the game situation, and the tape's state
// (playing / paused / rewinding / slow). A fictional show brand opens and closes it; no real broadcaster's or league's graphics.
//
//   const R = PROMO.filmroom(F, { brand: { name, en, episode }, accent, colors, fonts, captions })
//   R.ident({ at, until, title, sub })        the show's open: a line draws across, the show name, the episode line
//   R.lower({ a, b, title, sub })              a lower third on the tape (which game, which moment) — the way to say it without leaving the footage
//   R.card({ a, b, kicker, title, sub })      chapter card between clips (kicker e.g. "CLIP 1 / 3", sub = the game situation)
//   R.player({ a, b, name, number, team, line: [[label, value]…], note })   who this episode watches (text only: no portrait)
//   R.end({ a, b, title, sub, sources, notes, roll })   end card, then the sources and the footage credits
//   const L = R.shot(a, b, { bg, cut })       a layer shown in [a, b); the start is a hard cut unless cut: false
//   const C = R.film(L, key, { a, from, hud: { clip, situation }, tag })   a clip from assets/manifest.js (assets.mjs) on the tape deck.
//     Then, in film-time order (each returns the film time it ends at; C.t = now, C.ct = the clip time now):
//       C.play(dur, rate = 1)  C.slow(dur, rate = 0.35)  C.freeze(dur)  C.rewind(toClipTime, dur = 0.9)  C.seek(clipTime)
//       C.end() → b: closes the tape (call it once, after the last step: the checks and the HUD are registered here)
//     The camera on the footage: C.cam(t, { x, y, s }) keys (focus point 0–1 of the footage, scale), eased between keys.
//     The telestrator, in footage coordinates (x, y in 0–1 of the source frame; measure them with C.grid(a, b) on a still):
//       C.ring(x, y, { a, b, r, color, track, flat })   a ring on the floor under a player (flat: 1 = a circle round a ball or a hand); track: [[clipTime, x, y]…] follows her while the tape runs
//       C.arrow([[x, y]…], { a, b, dur, color, dash })   a run / a drive / a pass (smooth curve through the points, arrowhead)
//       C.line([x, y], [x, y], { a, b, color, dash })    a passing lane, a line of sight
//       C.zone([[x, y]…], { a, b, color })               the gap, the help area (filled, outlined)
//       C.spot(x, y, { a, b, rx, ry })                   spotlight: everything else dims
//       C.num(x, y, n, { a, b })   C.label(x, y, text, { a, b, dx, dy, color })   C.x(x, y, { a, b })
// Times: a = in, b = out. Strokes draw on over `dur` (default 0.45 s) with a pen sound; drawings belong on frozen or slowed tape.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('filmroom.js 要在 promo.js 之后加载', 'filmroom.js must load after promo.js'));
  const { E, seg, set, el } = P;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const lerp = (a, b, q) => a + (b - a) * q;
  // a smooth path through points (Catmull-Rom → cubic Bézier)
  const smooth = (pts) => {
    if (pts.length < 3) return `M${pts.map((p) => p.join(',')).join(' L')}`;
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    return d;
  };

  P.filmroom = function (F, opt = {}) {
    const W = F.W, H = F.H, PT = F.portrait, px = (v) => F.px(v);
    const C0 = { bg: '#07090c', panel: 'rgba(10,13,18,.82)', ink: '#f2f4f7', dim: '#9aa3ae', accent: opt.accent || '#ffc21a', blue: '#41d3ff', red: '#ff4d4d', ...(opt.colors || {}) };
    const FONT = { sans: '"Noto Sans SC", "PingFang SC", sans-serif', caps: 'Oswald, "Noto Sans SC", sans-serif', ...(opt.fonts || {}) };
    const brand = { name: M('录像课', 'Film Study'), en: 'FILM STUDY', episode: '', ...(opt.brand || {}) };
    const R = { F, colors: C0, fonts: FONT, brand };
    F.stillMax(1.0);   // a paused tape is the medium; freezes get a slow push and new strokes
    F.blurBase(1);     // footage carries its own motion blur; quick camera moves register F.blur themselves

    // ---------- the tape deck: footage box (landscape: the whole frame; portrait: a band, titles above, captions below) ----------
    const FW = W, FH = PT ? Math.round(W * 9 / 16) : H, FX = 0, FY = PT ? Math.round(H * 0.25) : 0;
    Object.assign(R, { FW, FH, FX, FY });
    set(F.stage, { background: C0.bg });
    const deck = el('div', `left:${FX}px;top:${FY}px;width:${FW}px;height:${FH}px;overflow:hidden;background:#000;z-index:10`, F.stage);
    const hud = el('div', `left:${FX}px;top:${FY}px;width:${FW}px;height:${FH}px;z-index:30;pointer-events:none`, F.stage);
    R.deck = deck; R.hud = hud;
    if (PT) {   // portrait: the show's name in the space above the tape
      const m = el('div', `left:0;right:0;top:${FY - px(190)}px;text-align:center;color:${C0.ink}`, F.stage);
      const a = el('div', `position:relative;font:700 ${px(64)}px/1.1 ${FONT.caps};letter-spacing:.18em`, m, brand.en || brand.name);
      el('div', `position:relative;margin:${px(16)}px auto 0;width:${px(120)}px;height:${px(5)}px;background:${C0.accent}`, m);
      F.text(a, 'label', a.textContent, 0, F.duration, { noFact: true });
    }
    if (F.T && F.voiced && !F.caps) P.captions(F, { font: FONT.sans, weight: 700, bg: 'rgba(7,9,12,.78)', color: C0.ink, ...(opt.captions || {}) });

    // ---------- shots ----------
    const shots = [];
    R.shot = (a, b, o = {}) => {
      const L = el('div', `left:0;top:0;width:${FW}px;height:${FH}px;overflow:hidden;background:${o.bg ?? '#000'};display:none`, deck);
      shots.push({ a, b, L });
      if (o.cut !== false && a > 0.01) { F.cut(a); F.sfx(a, 'cut', 0.25); }
      return L;
    };
    F.add((t) => { for (const s of shots) set(s.L, { display: t >= s.a && t < s.b ? '' : 'none' }); });
    // a full-frame layer over everything (cards, the open, the end): in portrait it covers the whole screen, not just the tape
    const page = (a, b) => {
      const L = el('div', `left:0;top:0;width:${W}px;height:${H}px;background:${C0.bg};display:none;z-index:40`, F.stage);
      F.add((t) => set(L, { display: t >= a && t < b ? '' : 'none' }));
      if (a > 0.01) { F.cut(a); F.sfx(a, 'cut', 0.25); }
      return L;
    };
    const txt = (L, s, css, kind, a, b, o = {}) => { const e = el('div', `position:absolute;white-space:nowrap;opacity:0;${css}`, L, s); F.text(e, kind, o.text ?? e.textContent, a, b, o); F.add((t) => set(e, { opacity: t >= a && t < b ? seg(t, a, a + 0.18).toFixed(3) : 0, transform: `translateY(${((1 - seg(t, a, a + 0.25, E.expoOut)) * px(18)).toFixed(1)}px)` })); return e; };
    const rule = (L, x, y, w, a, color = C0.accent, h = 5) => { const e = el('div', `left:${x}px;top:${y}px;width:${w}px;height:${px(h)}px;background:${color};transform-origin:0 50%;transform:scaleX(0)`, L); F.add((t) => set(e, { transform: `scaleX(${seg(t, a, a + 0.5, E.expoOut).toFixed(3)})` })); return e; };

    // ---------- the open, chapter cards, the player card, the end ----------
    R.ident = ({ at = 0, until, title, sub } = {}) => {
      const b = until ?? at + 3, L = page(at, b), cx = W / 2, y0 = H * (PT ? 0.42 : 0.4);
      const q = b - at < 2.2 ? 0.4 : 1;   // a short open (the tape should start within about 2 s): everything comes in at once
      rule(L, cx - px(PT ? 330 : 420), y0, px(PT ? 660 : 840), at + 0.15);
      txt(L, brand.en || brand.name, `left:0;width:${W}px;top:${y0 - px(PT ? 150 : 170)}px;text-align:center;font:700 ${px(PT ? 110 : 130)}px/1 ${FONT.caps};letter-spacing:.16em;color:${C0.ink}`, 'logo', at + 0.35 * q, b, { noFact: true });
      if (brand.en && brand.name !== brand.en) txt(L, brand.name, `left:0;width:${W}px;top:${y0 + px(40)}px;text-align:center;font:900 ${px(56)}px/1.2 ${FONT.sans};letter-spacing:.3em;color:${C0.accent}`, 'label', at + 0.6 * q, b, { noFact: true });
      if (title) txt(L, title, `left:0;width:${W}px;top:${y0 + px(150)}px;text-align:center;font:700 ${px(52)}px/1.25 ${FONT.sans};color:${C0.ink}`, 'headline', at + 1.0 * q, b);
      if (sub || brand.episode) txt(L, sub || brand.episode, `left:0;width:${W}px;top:${y0 + px(230)}px;text-align:center;font:500 ${px(34)}px/1.3 ${FONT.sans};letter-spacing:.06em;color:${C0.dim}`, 'label', at + 1.3 * q, b);
      F.sfx(at + 0.15, 'logo', 0.9); F.musicCue(at + 0.35, 'hit');
      return L;
    };
    R.card = ({ a, b, kicker, title, sub }) => {
      const L = page(a, b), x = PT ? px(80) : W * 0.12, y = H * (PT ? 0.36 : 0.34);
      if (kicker) txt(L, kicker, `left:${x}px;top:${y}px;font:700 ${px(40)}px/1 ${FONT.caps};letter-spacing:.24em;color:${C0.accent}`, 'label', a + 0.05, b, { noFact: true });
      rule(L, x, y + px(66), px(PT ? 260 : 360), a + 0.1);
      txt(L, title, `left:${x}px;top:${y + px(100)}px;font:900 ${px(PT ? 92 : 110)}px/1.15 ${FONT.sans};color:${C0.ink};white-space:normal;width:${W - x * 2}px`, 'headline', a + 0.2, b);
      if (sub) txt(L, sub, `left:${x}px;top:${y + px(PT ? 330 : 270)}px;font:500 ${px(40)}px/1.35 ${FONT.sans};color:${C0.dim};white-space:normal;width:${W - x * 2}px`, 'label', a + 0.45, b);
      F.sfx(a + 0.05, 'whoosh', 0.35);
      return L;
    };
    R.player = ({ a, b, name, number, team, line = [], note }) => {
      const L = page(a, b), x = PT ? px(80) : W * 0.12, y = H * (PT ? 0.3 : 0.24);
      if (number !== undefined) txt(L, String(number), `left:${x}px;top:${y}px;font:700 ${px(PT ? 220 : 260)}px/1 ${FONT.caps};color:${C0.accent}`, 'label', a + 0.05, b, { noFact: true });
      const nx = number !== undefined ? x + px(PT ? 250 : 300) : x;
      txt(L, name, `left:${nx}px;top:${y + px(30)}px;font:900 ${px(PT ? 80 : 96)}px/1.15 ${FONT.sans};color:${C0.ink}`, 'headline', a + 0.15, b);
      if (team) txt(L, team, `left:${nx}px;top:${y + px(PT ? 140 : 160)}px;font:500 ${px(40)}px/1.3 ${FONT.sans};color:${C0.dim}`, 'label', a + 0.3, b);
      line.forEach(([k, v], i) => {
        const cx = x + i * px(PT ? 300 : 360), cy = y + px(PT ? 330 : 360), at = a + 0.5 + i * 0.18;
        txt(L, String(v), `left:${cx}px;top:${cy}px;font:700 ${px(96)}px/1 ${FONT.caps};color:${C0.ink}`, 'label', at, b);
        txt(L, k, `left:${cx}px;top:${cy + px(110)}px;font:500 ${px(32)}px/1.2 ${FONT.sans};letter-spacing:.08em;color:${C0.dim}`, 'label', at + 0.05, b);
      });
      if (line.length) F.info('figures', a + 0.5, b);
      if (note) txt(L, note, `left:${x}px;top:${y + px(PT ? 560 : 560)}px;font:500 ${px(30)}px/1.3 ${FONT.sans};color:${C0.dim}`, 'label', a + 0.6, b);
      return L;
    };
    R.end = ({ a, b, title, sub, sources = [], notes = [], roll } = {}) => {
      const cr = F.credits || [];
      const e2 = sources.length || notes.length || cr.length ? Math.min(b, roll ?? a + Math.max(2.2, (b - a) * 0.45)) : b;
      F.scene(a, b, { end: true });
      const L = page(a, e2), y0 = H * 0.42;
      rule(L, W / 2 - px(300), y0, px(600), a + 0.1);
      txt(L, title || brand.en || brand.name, `left:0;width:${W}px;top:${y0 - px(150)}px;text-align:center;font:700 ${px(110)}px/1 ${FONT.caps};letter-spacing:.14em;color:${C0.ink}`, 'logo', a + 0.2, e2, { noFact: !title });
      if (sub) txt(L, sub, `left:0;width:${W}px;top:${y0 + px(50)}px;text-align:center;font:700 ${px(48)}px/1.3 ${FONT.sans};color:${C0.accent}`, 'label', a + 0.5, e2, { noFact: true });
      F.musicCue(a + 0.2, 'name'); F.sfx(a + 0.1, 'logo', 0.7);
      if (e2 < b) {
        const L2 = page(e2, b), lines = [];
        if (sources.length) { lines.push([M('资料来源', 'Sources'), 44, C0.ink, 700]); for (const s of sources) lines.push([s, 30, C0.dim, 500]); }
        const groups = [];
        for (const c of cr) { const k = [c.title, c.author, c.licence].filter(Boolean).join(' · '); if (!groups.includes(k)) groups.push(k); }
        if (groups.length) { lines.push([M('比赛录像', 'Game footage'), 44, C0.ink, 700]); for (const k of groups.slice(0, 5)) lines.push([k, 28, C0.dim, 500]); }
        for (const n of notes) lines.push([n, 28, C0.dim, 500]);
        let y = H * (PT ? 0.3 : 0.16);
        lines.forEach(([s, size, color, w], i) => { txt(L2, s, `left:0;width:${W}px;top:${y}px;text-align:center;font:${w} ${px(size)}px/1.3 ${size > 40 ? FONT.caps : FONT.sans};letter-spacing:.04em;color:${color};white-space:normal;padding:0 ${px(60)}px;box-sizing:border-box`, 'label', e2 + 0.1 + i * 0.2, b, { noFact: true }); y += px(size * 1.9) + (size > 40 ? px(10) : 0); });
      }
    };

    // a lower third over the tape: the game and the moment, said without cutting away from the footage
    R.lower = ({ a, b, title, sub }) => {
      const box = el('div', `position:absolute;left:${px(36)}px;bottom:${px(PT ? 70 : 190)}px;display:none;background:${C0.panel};border-left:${px(6)}px solid ${C0.accent};padding:${px(14)}px ${px(24)}px ${px(16)}px`, hud);
      const t1 = el('div', `position:relative;white-space:nowrap;font:700 ${px(40)}px/1.25 ${FONT.sans};color:${C0.ink}`, box, title);
      const t2 = sub ? el('div', `position:relative;white-space:nowrap;margin-top:${px(6)}px;font:500 ${px(30)}px/1.25 ${FONT.sans};color:${C0.dim}`, box, sub) : null;
      F.text(t1, 'label', title, a, b); if (t2) F.text(t2, 'label', sub, a + 0.15, b);
      F.add((t) => { const on = t >= a && t < b; set(box, { display: on ? '' : 'none', opacity: on ? Math.min(seg(t, a, a + 0.25), 1 - seg(t, b - 0.25, b)).toFixed(3) : 0, transform: `translateX(${((1 - seg(t, a, a + 0.35, E.expoOut)) * -px(40)).toFixed(1)}px)` }); });
      F.sfx(a, 'whoosh', 0.25);
      return box;
    };

    // ---------- the HUD on the tape: brand bug, clip chip, tape state, source tag (sharp, not zoomed) ----------
    const chip = (css, s) => el('div', `position:absolute;white-space:nowrap;font:700 ${px(26)}px/1 ${FONT.caps};letter-spacing:.14em;color:${C0.ink};background:${C0.panel};padding:${px(10)}px ${px(16)}px;border-left:${px(5)}px solid ${C0.accent};display:none;${css}`, hud, s);
    const bug = chip(`left:${px(36)}px;top:${px(30)}px`, brand.en || brand.name);
    // the tape state sits bottom-right: the top-right corner is where broadcast footage carries its own logo, which must stay visible
    const state = el('div', `position:absolute;right:${px(36)}px;bottom:${px(PT ? 24 : 30)}px;white-space:nowrap;font:700 ${px(30)}px/1 ${FONT.caps};letter-spacing:.1em;color:${C0.ink};background:${C0.panel};padding:${px(10)}px ${px(16)}px;display:none`, hud);
    state.dataset.motion = 'skip';
    const films = [];

    // ---------- the film: footage driven by a tape timeline ----------
    R.film = (L, key, o = {}) => {
      let c = (window.MEDIA_ASSETS && window.MEDIA_ASSETS.clips[key]) || null;
      if (!c) {   // no footage yet (a fresh project): a slate stands in, so the page still builds and the drawings can be laid out
        console.warn(M(`filmroom：assets/manifest.js 里没有视频片段 "${key}"：先放一块"没有录像"的牌子（录像放进 assets/src/，跑 assets.mjs）`, `filmroom: no clip "${key}" in assets/manifest.js — showing a "no tape" slate (put footage in assets/src/ and run assets.mjs)`));
        c = { frames: 1, fps: 25, w: 1920, h: 1080, slate: true };
        const sl = el('div', `inset:0;background:repeating-linear-gradient(135deg,#11161d 0 40px,#0c1015 40px 80px);display:flex;align-items:center;justify-content:center;font:700 ${px(54)}px/1.3 ${FONT.caps};letter-spacing:.2em;color:${C0.dim};text-align:center`, L, M('没有录像<br>把比赛录像放进 assets/src/', 'NO TAPE<br>put game footage in assets/src/'));
        c.slateEl = sl;
      }
      const a = o.a, last = c.slate ? 1e9 : (c.frames - 1) / c.fps, AR = c.w / c.h;
      const cam = el('div', `left:0;top:0;width:${FW}px;height:${FH}px;transform-origin:0 0`, L);
      const img = el('img', `left:0;top:0;width:100%;height:100%;object-fit:cover`, cam);
      // slow motion blends each source frame into the next (like broadcast slow-mo) instead of holding it for several output frames
      const img2 = el('img', `left:0;top:0;width:100%;height:100%;object-fit:cover;opacity:0`, cam);
      img2.dataset.motion = 'skip';   // a crossfade between neighbouring frames: no visible flash, so the motion / flicker check leaves it alone
      // footage units: x, y in 0–1 of the source frame → svg user units 1000 × 1000 / AR (the box is cropped to cover the deck)
      const VW = 1000, VH = 1000 / AR;
      const svg = svgEl('svg', { viewBox: `0 0 ${VW} ${VH}`, preserveAspectRatio: 'xMidYMid slice', width: FW, height: FH, style: 'position:absolute;left:0;top:0;overflow:visible' }, cam);
      const spotSvg = svgEl('svg', { viewBox: `0 0 ${VW} ${VH}`, preserveAspectRatio: 'xMidYMid slice', width: FW, height: FH, style: 'position:absolute;left:0;top:0' }, cam);
      const labels = el('div', `left:0;top:0;width:${FW}px;height:${FH}px`, cam);
      const tape = el('div', `inset:0;pointer-events:none;opacity:0;background:repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 2px, rgba(0,0,0,0) 2px 7px)`, L); tape.dataset.motion = 'skip';
      const segs = [], keys = [], strokes = [];
      const Cf = { key, clip: c, svg, segs };
      Cf.t = a; Cf.ct = o.from ?? 0;
      const push = (kind, dur, c1, rate) => { const s = { kind, a: Cf.t, b: Cf.t + dur, c0: Cf.ct, c1, rate }; segs.push(s); Cf.t = s.b; Cf.ct = c1; return s.b; };
      Cf.play = (dur, rate = 1) => push('play', dur, Math.min(last, Cf.ct + dur * rate), rate);
      Cf.slow = (dur, rate = 0.35) => push('slow', dur, Math.min(last, Cf.ct + dur * rate), rate);
      Cf.freeze = (dur) => { F.sfx(Cf.t, 'stop', 0.45); return push('freeze', dur, Cf.ct, 0); };
      Cf.rewind = (to, dur = 0.9) => { F.sfx(Cf.t, 'rewind', 0.5, { dur }); return push('rewind', dur, Math.max(0, to), -1); };
      Cf.seek = (to) => { F.cut(Cf.t); Cf.ct = Math.max(0, Math.min(last, to)); return Cf.t; };
      let tg = null;
      Cf.end = () => {
        Cf.b = Cf.t;
        F.info('clip', a, Cf.b);
        for (const s of segs) if (s.kind !== 'freeze') F.live(s.a, s.b);   // the tape running is the action
        if (tg) F.text(tg, 'label', tg.textContent, a, Cf.b, { noFact: true, chrome: true });
        if (c.slateEl) F.text(c.slateEl, 'label', c.slateEl.textContent, a, Cf.b, { noFact: true });
        const parts = [o.hud?.clip, o.hud?.situation].filter(Boolean);
        if (parts.length) F.text(state, 'label', parts.join(' · '), a, Cf.b, { noFact: true, overlap: true, chrome: true });
        F.text(bug, 'label', bug.textContent, a, Cf.b, { noFact: true, overlap: true, chrome: true });
        return Cf.b;
      };
      // clip time at film time t
      const clipAt = (t) => {
        if (!segs.length || t <= segs[0].a) return o.from ?? 0;
        for (const s of segs) if (t < s.b) { const q = (t - s.a) / Math.max(1e-6, s.b - s.a); return s.kind === 'rewind' ? lerp(s.c0, s.c1, E.cubicInOut(q)) : lerp(s.c0, s.c1, q); }
        return segs[segs.length - 1].c1;
      };
      const segAt = (t) => segs.find((s) => t >= s.a && t < s.b) || null;
      Cf.clipAt = clipAt;
      // camera keys: { x, y } = the point of the footage at the centre of the deck, s = scale (≥ 1)
      Cf.cam = (t, k) => { keys.push([t, { x: 0.5, y: 0.5, s: 1, ...k }]); keys.sort((p, q) => p[0] - q[0]); return Cf; };
      const camAt = (t) => {
        if (!keys.length) return { x: 0.5, y: 0.5, s: 1 };
        if (t <= keys[0][0]) return keys[0][1];
        for (let i = 0; i < keys.length - 1; i++) { const [t0, k0] = keys[i], [t1, k1] = keys[i + 1]; if (t < t1) { const q = E.cubicInOut(seg(t, t0, t1)); return { x: lerp(k0.x, k1.x, q), y: lerp(k0.y, k1.y, q), s: lerp(k0.s, k1.s, q) }; } }
        return keys[keys.length - 1][1];
      };
      // footage point (0–1) → deck pixels before the camera (the slice crop of a 16:9 source on the deck)
      const cover = Math.max(FW / c.w, FH / c.h), dw = c.w * cover, dh = c.h * cover, ox = (FW - dw) / 2, oy = (FH - dh) / 2;
      const toDeck = (x, y) => [ox + x * dw, oy + y * dh];
      Cf.toDeck = toDeck;
      let cur = '', scale = 1;
      F.add((t) => {
        const b = Cf.b ?? Cf.t;
        if (t < a - 0.05 || t > b + 0.05) return;
        // the camera: freezes push in a little by themselves, so a paused frame is never dead
        const k = camAt(t), sg = segAt(t);
        const breathe = sg && sg.kind === 'freeze' ? 1 + 0.025 * Math.sin(Math.PI * seg(t, sg.a, sg.b)) : 1;   // in and back out: ending zoomed would jump when the tape runs again
        scale = k.s * breathe;
        const [fx, fy] = toDeck(k.x, k.y);
        let tx = FW / 2 - fx * scale, ty = FH / 2 - fy * scale;
        tx = Math.min(0, Math.max(FW - FW * scale, tx)); ty = Math.min(0, Math.max(FH - FH * scale, ty));
        set(cam, { transform: `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${scale.toFixed(4)})` });
        for (const s of strokes) s.setAttribute('stroke-width', (s._w / scale).toFixed(2));
        for (const lb of labels.children) set(lb, { transform: `translate(-50%,-100%) scale(${(1 / scale).toFixed(4)})` });
        // tape look: paused = a little flatter and darker; rewinding = scan lines
        const pz = sg && sg.kind === 'freeze' ? Math.min(seg(t, sg.a, sg.a + 0.2), 1 - seg(t, sg.b - 0.2, sg.b)) : 0;   // the paused look eases in and out (snapping back reads as a jump)
        set(img, { filter: pz > 0 ? `saturate(${(1 - 0.35 * pz).toFixed(3)}) brightness(${(1 - 0.12 * pz).toFixed(3)})` : 'none' });
        set(tape, { opacity: sg && sg.kind === 'rewind' ? 1 : 0 });
        if (c.slate) return;
        const ct = clipAt(t), fpos = ct * c.fps + 1e-6, slowish = sg && sg.kind === 'slow';
        // slow motion blends frame i into i + 1; everywhere else the nearest frame — so a freeze right after slow motion doesn't step back a frame
        const i = Math.min(c.frames, Math.max(1, (slowish ? Math.floor(fpos) : Math.round(fpos)) + 1));
        const frac = slowish && i < c.frames ? fpos - Math.floor(fpos) : 0;
        const name = (k) => `assets/clips/${key}/${String(k).padStart(4, '0')}.jpg`;
        const waits = [];
        if (name(i) !== cur) { cur = name(i); img.src = cur; waits.push(img.decode().catch(() => {})); }
        if (frac > 0.02) { const n2 = name(i + 1); if (img2._u !== n2) { img2._u = n2; img2.src = n2; waits.push(img2.decode().catch(() => {})); } set(img2, { opacity: frac.toFixed(3), filter: img.style.filter }); }
        else set(img2, { opacity: 0 });
        return waits.length ? Promise.all(waits) : undefined;
      });
      films.push({ a, get b() { return Cf.b ?? Cf.t; }, segAt, clipAt, hud: o.hud || {} });
      // the footage's credit: a source tag on the tape and a CREDITS line
      if (c.credit) F.credit({ ...c.credit, file: `clips/${key}` });
      else if (!c.slate) console.warn(M(`filmroom：片段 "${key}" 没有来源 / 许可信息（用 footage.mjs 下载，或者在 assets/src/ 里写同名 .json）`, `filmroom: clip "${key}" has no source / licence (fetch it with footage.mjs, or write a .json with the same name in assets/src/)`));
      const tagText = typeof o.tag === 'string' ? o.tag : `${M('比赛录像', 'Game footage')}${c.credit ? ' · ' + [c.credit.author, c.credit.licence].filter(Boolean).join(' · ') : ''}`;
      if (o.tag !== false) {
        tg = el('div', `position:absolute;left:${px(36)}px;bottom:${px(PT ? 24 : 30)}px;white-space:nowrap;font:500 ${px(22)}px/1 ${FONT.sans};color:${C0.dim};background:rgba(0,0,0,.55);padding:${px(6)}px ${px(10)}px;display:none`, hud, tagText);
        F.add((t) => { const on = t >= a && t < (Cf.b ?? Cf.t); set(tg, { display: on ? '' : 'none' }); });
      }

      // ---------- the telestrator ----------
      const P2 = (x, y) => [x * VW, y * VH];
      const pen = (e, w) => { e._w = w; strokes.push(e); return e; };
      // a mark leaves over its last 0.2 s: several marks vanishing in one frame read as a jump
      const fadeOut = (t, b0) => Math.min(1, Math.max(0, (b0 - t) / 0.2));
      const showIn = (e, a0, b0, extra) => F.add((t) => { const on = t >= a0 && t < b0; e.style.display = on ? '' : 'none'; if (on) e.style.opacity = fadeOut(t, b0).toFixed(3); if (on && extra) extra(t); });
      const drawOn = (e, a0, dur) => { e.setAttribute('pathLength', '1'); e.setAttribute('stroke-dasharray', '1 1'); F.add((t) => e.setAttribute('stroke-dashoffset', (1 - seg(t, a0, a0 + dur, E.cubicInOut)).toFixed(4))); };
      const glow = (color) => `drop-shadow(0 0 ${(VW * 0.004).toFixed(1)}px ${color})`;
      const trackAt = (tr, t) => { const ct = clipAt(t); if (ct <= tr[0][0]) return [tr[0][1], tr[0][2]]; for (let i = 0; i < tr.length - 1; i++) if (ct < tr[i + 1][0]) { const q = (ct - tr[i][0]) / (tr[i + 1][0] - tr[i][0]); return [lerp(tr[i][1], tr[i + 1][1], q), lerp(tr[i][2], tr[i + 1][2], q)]; } const l = tr[tr.length - 1]; return [l[1], l[2]]; };
      const mark = (a0, b0) => { F.info('annotate', a0, b0); F.sfx(a0, 'pen', 0.35); };
      // flat: the ellipse's height / width — 0.38 lies on the floor under a player's feet; 1 is a circle round a ball or a hand
      Cf.ring = (x, y, { a: a0, b: b0, r = 0.035, color = C0.accent, track, dur = 0.4, flat = 0.38 } = {}) => {
        const g = svgEl('g', { style: `filter:${glow(color)}` }, svg);
        const e = pen(svgEl('ellipse', { cx: 0, cy: 0, rx: r * VW, ry: r * VW * flat, fill: 'none', stroke: color }, g), 4);
        drawOn(e, a0, dur);
        showIn(g, a0, b0, (t) => { const [qx, qy] = track ? trackAt(track, t) : [x, y]; const [X, Y] = P2(qx, qy); g.setAttribute('transform', `translate(${X.toFixed(1)},${Y.toFixed(1)})`); });
        mark(a0, b0); return g;
      };
      const head = (color) => { const id = 'h' + Math.random().toString(36).slice(2, 8); const m = svgEl('marker', { id, viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 4, markerHeight: 4, orient: 'auto-start-reverse' }, svgEl('defs', {}, svg)); svgEl('path', { d: 'M0,0 L10,5 L0,10 Z', fill: color }, m); return `url(#${id})`; };
      Cf.arrow = (pts, { a: a0, b: b0, dur = 0.45, color = C0.accent, dash = false } = {}) => {
        const e = pen(svgEl('path', { d: smooth(pts.map(([x, y]) => P2(x, y))), fill: 'none', stroke: color, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'marker-end': head(color), style: `filter:${glow(color)}` }, svg), 4);
        if (dash) { const g = svgEl('g', {}, svg); g.appendChild(e); }
        drawOn(e, a0, dur); showIn(e, a0, b0);
        if (dash) F.add((t) => { if (seg(t, a0, a0 + dur) >= 1) { e.setAttribute('pathLength', '100'); e.setAttribute('stroke-dasharray', '3 2.2'); e.setAttribute('stroke-dashoffset', '0'); } });
        mark(a0, b0); return e;
      };
      Cf.line = (p, q, { a: a0, b: b0, dur = 0.35, color = C0.ink, dash = true } = {}) => {
        const [x1, y1] = P2(...p), [x2, y2] = P2(...q);
        const e = pen(svgEl('line', { x1, y1, x2, y2, stroke: color, 'stroke-linecap': 'round', style: `filter:${glow(color)}` }, svg), 3);
        drawOn(e, a0, dur); showIn(e, a0, b0);
        if (dash) F.add((t) => { if (seg(t, a0, a0 + dur) >= 1) { e.setAttribute('pathLength', '100'); e.setAttribute('stroke-dasharray', '2.5 2'); e.setAttribute('stroke-dashoffset', '0'); } });
        mark(a0, b0); return e;
      };
      Cf.zone = (pts, { a: a0, b: b0, color = C0.red } = {}) => {
        const e = pen(svgEl('path', { d: `M${pts.map(([x, y]) => P2(x, y).join(',')).join(' L')} Z`, fill: color, 'fill-opacity': 0, stroke: color, 'stroke-dasharray': '6 5' }, svg), 3);
        F.add((t) => e.setAttribute('fill-opacity', (0.28 * seg(t, a0, a0 + 0.3) * fadeOut(t, b0)).toFixed(3)));
        showIn(e, a0, b0); mark(a0, b0); return e;
      };
      Cf.spot = (x, y, { a: a0, b: b0, rx = 0.09, ry = 0.16 } = {}) => {
        const id = 'm' + Math.random().toString(36).slice(2, 8);
        const m = svgEl('mask', { id }, svgEl('defs', {}, spotSvg));
        svgEl('rect', { x: -VW, y: -VH, width: VW * 3, height: VH * 3, fill: 'white' }, m);
        const [X, Y] = P2(x, y);
        svgEl('ellipse', { cx: X, cy: Y, rx: rx * VW, ry: ry * VH, fill: 'black', style: 'filter:blur(6px)' }, m);
        const r = svgEl('rect', { x: -VW, y: -VH, width: VW * 3, height: VH * 3, fill: '#000', 'fill-opacity': 0, mask: `url(#${id})` }, spotSvg);
        F.add((t) => r.setAttribute('fill-opacity', t >= a0 && t < b0 ? (0.62 * Math.min(seg(t, a0, a0 + 0.3), 1 - seg(t, b0 - 0.3, b0))).toFixed(3) : 0));   // fades in and out: a whole-frame dim switching off in one frame reads as a jump
        F.info('annotate', a0, b0); return r;
      };
      Cf.num = (x, y, n, { a: a0, b: b0, color = C0.accent } = {}) => {
        const [X, Y] = toDeck(x, y);
        const e = el('div', `left:${X}px;top:${Y}px;width:${px(72)}px;height:${px(72)}px;border-radius:50%;background:${color};color:#111;font:700 ${px(46)}px/${px(72)}px ${FONT.caps};text-align:center;transform-origin:50% 100%;display:none`, labels, String(n));
        F.add((t) => set(e, { display: t >= a0 && t < b0 ? '' : 'none', opacity: fadeOut(t, b0).toFixed(3) }));
        F.text(e, 'label', String(n), a0, b0, { noFact: true }); F.sfx(a0, 'tick', 0.4);
        return e;
      };
      Cf.label = (x, y, text, { a: a0, b: b0, color = C0.accent, dx = 0, dy = -0.04 } = {}) => {
        const [X, Y] = toDeck(x + dx, y + dy);
        const e = el('div', `left:${X}px;top:${Y}px;white-space:nowrap;font:700 ${px(46)}px/1.2 ${FONT.sans};color:#111;background:${color};padding:${px(6)}px ${px(16)}px;transform-origin:50% 100%;display:none`, labels, text);
        F.add((t) => set(e, { display: t >= a0 && t < b0 ? '' : 'none', opacity: fadeOut(t, b0).toFixed(3) }));
        F.text(e, 'label', text, a0, b0, { overlap: true });
        return e;
      };
      Cf.x = (x, y, { a: a0, b: b0, color = C0.red, size = 0.018 } = {}) => {
        const [X, Y] = P2(x, y), s = size * VW;
        const e = pen(svgEl('path', { d: `M${X - s},${Y - s} L${X + s},${Y + s} M${X + s},${Y - s} L${X - s},${Y + s}`, stroke: color, 'stroke-linecap': 'round', fill: 'none' }, svg), 6);
        drawOn(e, a0, 0.25); showIn(e, a0, b0); mark(a0, b0); return e;
      };
      // authoring aid: a labelled 5 % grid over the footage (look at it with --stills, then delete the call)
      Cf.grid = (a0, b0) => {
        const g = svgEl('g', { stroke: 'rgba(0,255,180,.55)', 'stroke-width': 1 }, svg);
        for (let k = 0; k <= 20; k++) { const v = k / 20; svgEl('line', { x1: v * VW, y1: 0, x2: v * VW, y2: VH }, g); svgEl('line', { x1: 0, y1: v * VH, x2: VW, y2: v * VH }, g); if (k % 2 === 0) { svgEl('text', { x: v * VW + 2, y: 14, fill: '#0fb', 'font-size': 13, stroke: 'none' }, g).textContent = v.toFixed(1); svgEl('text', { x: 2, y: v * VH - 2, fill: '#0fb', 'font-size': 13, stroke: 'none' }, g).textContent = v.toFixed(1); } }
        showIn(g, a0, b0);
        console.warn(M('filmroom：C.grid() 是量坐标用的，成片前删掉', 'filmroom: C.grid() is an authoring aid — remove it before the final render'));
        return g;
      };
      return Cf;
    };

    // the HUD follows whichever film is on screen
    F.add((t) => {
      const f = films.find((x) => t >= x.a && t < x.b);
      set(bug, { display: f ? '' : 'none' });
      if (!f) { set(state, { display: 'none' }); return; }
      const sg = f.segAt(t), k = sg ? sg.kind : 'play';
      const label = k === 'freeze' ? '❚❚' : k === 'rewind' ? '◀◀' : k === 'slow' ? `▶ ${sg.rate}×` : '▶';
      const parts = [f.hud.clip, f.hud.situation].filter(Boolean);
      state.textContent = (parts.length ? parts.join('  ·  ') + '   ' : '') + label;
      set(state, { display: '', color: k === 'play' ? C0.ink : C0.accent });
    });
    return R;
  };
})();
