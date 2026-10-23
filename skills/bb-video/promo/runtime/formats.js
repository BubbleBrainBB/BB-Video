// formats.js: the quick version (references/kit.md). Users pick only a style; this is an internal tool for "write one script, change style and it's another style",
// it only calls the styles' shared API (kit.js), so any style can play it. Load it after kit.js.
//
//   PROMO.film({ style: 'op' | 'pop' | 'cutout' | 'origami' | 'launch' | …, bpm, offset, kit: { style options }, theme: { theme overrides },
//                brand: '#brand colour', accent: '#second colour' (each style applies them in its own materials, P.kit.brand), ground: 'light' | 'dark' | 'brand' (launch, ASCII),
//                scenes: [{ variant, energy, cues: [...] }, …], end: { title, tagline, url, beats } })
//
// ---- Big-word telling (kinetic, the default) ----
// One background per scene (variant changes pattern / colour); between scenes comes this style's transition; inside a scene the cues come one after another, all on the beat:
//   { say: 'a word' | ['a few', 'words'], every: 2, line: 'one line of explanation below', accent: true }   big words slam in one by one (each holds every beats), then one line of explanation
//   { line: 'one sentence', beats }                                                   just one line of explanation (hold time worked out from its length)
//   { list: ['an item', 'an item', …], title: 'Title', every: 1, hold: 3 }            list: title first, then one item per beat going down
//   { shot: 'shots/x.png', caption: 'one line of explanation', beats: 5, fit, ratio }   a real screenshot (as is) + one line of explanation below; logo / icon use fit: 'contain'; an SVG with no intrinsic size needs ratio (width / height)
//   { stat: '36', label: 'drafts queued', beats: 4 }                                 one big number + what it is
//   Any cue can add beats (total beats) and accent: true (this style's signature move when it lands)
//
// Information cues (built step by step, one step = every beats on the beat grid; in the narrated version a step appears when its words are spoken):
//   { flow: ['input', { text: 'process', note: 'small note', hot: true }, 'output'], title }   flow: boxes appear one by one, joined by arrows (one row in landscape, one column in portrait)
//   { compare: [{ title: 'before', points: ['…', '…'] }, { title: 'now', points: [...], hot: true }], title }  compare: two or three columns, column names first, then row by row side by side
//   { chart: [['2019', 12], ['2024', 30]], unit: 'k', hot: [1], title, caption }   bar chart: bars grow one by one (from 0)
//   { annotate: 'shots/x.png', marks: [{ x, y, w, h, note: 'here you can…', kind: 'box' | 'circle', click }], title, caption, zoom: true (launch: push in on one spot at a time inside the window), url }
//       annotated screenshot: the screenshot first, then one spot at a time circled + a note (x, y, w, h are fractions 0–1 of the screenshot); in landscape the notes sit on the right with arrows pointing over, in portrait numbered ①② listed below (the numbers deliberately sit on the screenshot)
//   { diagram: [ shape, … ], title, aspect, portrait: [ shapes drawn separately for portrait ] }   diagram: a tiny drawing language; coordinates are fractions of the figure (x, w of width, y, h of height, r of the short side)
//       shapes: { box: 'text', x, y, w, h, id, tone } (centre) · { label: 'text', x, y, size, tone } · { word: 'big word', x, y, size }
//             { arrow: [x1, y1, x2, y2] | ['idA', 'idB'], tone, bend, color (a set colour, e.g. blue light drawn blue; board styles use their own ink) } · { circle: [x, y, r], fill, tone, id } · { rect: [x, y, w, h], fill, id } (top-left corner)
//             { line: [x1, y1, x2, y2], dash } · { band: [x, y, w, h], colors } (gradient band, a spectrum) · { mark: [x, y, w, h] | 'id', kind } · { bars: data, x, y, w, h, unit, hot }
//       each shape is a new step by default; { with: true } appears together with the previous one, { step: n } sets which step, { at } sets the time (narrated version)
//   tone: 1 = accent colour (the key item), 2 = second colour; hot: true is the same as tone: 1
//   every: beats per step (flow, annotate, diagram default 2; compare, chart default 1); hold: beats to hold after it's built (default 2)
//
// Building up (without clearing the frame): add keep: true to any cue and it stays until the end of the scene; give cues an area to split the frame:
//   area: 'full' (default) | 'left' | 'right' | 'top' | 'bottom' (in portrait left / right become top / bottom automatically)
//   e.g. { diagram: [...], area: 'left', keep: true } followed by { list: [...], area: 'right' }: the diagram stays, the right side carries on
// Rhythm: one cue's things are cleared before the next cue starts to show (no overlapping text, no empty gaps); a scene's last cue holds until the transition covers it.
//
// ---- Following narration (explain): an explainer in any promo style ----
// Used when the page loads timeline.js (narration). Cues are the same, but time comes from the narration instead of beats:
//   at: 'l3' (start of this line) | ['l3', 'some word'] (when this word is spoken) | seconds. The words of say and the items of list appear when they are spoken in this line (spread evenly if not found)
//   transitions between scenes sit between two narration lines; ending end: { at, title, tagline, url } (no at = after the last line); captions are added automatically
(function () {
  const P = window.PROMO;
  if (!P || !P.kit) throw new Error('formats.js 要在 kit.js 之后加载');
  const FORMATS = {};
  const f1 = (n) => Math.round(n * 10) / 10;
  const words = (s) => String(s).trim().split(/\s+/).length + (String(s).match(/[一-鿿]/g) || []).length / 3;
  // information cues: split into steps (one step = the things that appear together). key = this step's words (it appears when the narration says them), at = a set time
  const INFO = ['flow', 'compare', 'chart', 'annotate', 'diagram', 'montage'], EVERY = { flow: 2, compare: 1, chart: 1, annotate: 2, diagram: 2, montage: 1 };
  const infoKind = (c) => INFO.find((k) => c[k] !== undefined);
  const textOf = (x) => (x && typeof x === 'object' ? x.text ?? x.note ?? x.title ?? x.box ?? x.label ?? x.word ?? '' : String(x ?? ''));
  const diagramSteps = (items) => { let cur = -1; return items.map((it) => (cur = it.step ?? (it.with ? Math.max(0, cur) : cur + 1))); };
  const atOf = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x.at : undefined);   // only objects can set a time (a string's .at is a built-in method)
  const itemsOf = (c, PT) => (PT && c.portrait ? c.portrait : c.diagram);
  // default acceleration of a fast-cut montage: first quarter 2 beats per cell, middle 1 beat, last few cells half a beat (board styles need time to write, minimum 1 beat)
  const accel = (n, minB) => Array.from({ length: n }, (_, i) => { const q = n <= 1 ? 0 : i / (n - 1); return Math.max(minB, q < 0.25 ? 2 : q < 0.6 ? 1 : 0.5); });
  function stepsOf(c, PT) {
    const k = infoKind(c), S = [], add = (key, at) => S.push({ key: String(key ?? ''), at });
    if (c.title && k !== 'montage') add(c.title, c.titleAt);
    if (k === 'montage') c.montage.forEach((x) => add(textOf(x), atOf(x)));
    else if (k === 'flow') c.flow.forEach((x) => add(textOf(x), atOf(x)));
    else if (k === 'compare') {
      c.compare.forEach((col) => add(col.title, atOf(col)));
      const rows = Math.max(...c.compare.map((col) => (col.points || []).length));
      for (let j = 0; j < rows; j++) c.compare.forEach((col) => { const pt = (col.points || [])[j]; if (pt !== undefined) add(textOf(pt), atOf(pt)); });
    } else if (k === 'chart') c.chart.forEach((d) => add(d[0], atOf(d[2])));
    else if (k === 'annotate') { add(c.caption ?? '', c.shotAt); (c.marks || []).forEach((m) => add(m.note ?? '', m.at)); }
    else if (k === 'diagram') {
      const items = itemsOf(c, PT), idx = diagramSteps(items), base = S.length;
      items.forEach((it, i) => { const j = base + idx[i]; while (S.length <= j) S.push({ key: '', at: undefined }); if (!S[j].key) S[j].key = textOf(it); if (S[j].at === undefined && it.at !== undefined) S[j].at = it.at; });
    }
    return S;
  }

  // ---------------- big words (kinetic) ----------------
  FORMATS.kinetic = {
    // works out the timeline in beats only (the total length is needed before compose). All returned times are in beats
    plan(o) {
      const B = 60 / (o.bpm ?? 120), scenes = [], pace = P.kit.pace(o.style);
      // styles whose transition starts early (scrolling handscroll, panning camera) get a few extra beats at the end of each scene: the last words of the scene are read before it moves on
      const tail = Math.max(0, Math.ceil((pace.wipe - 0.6) / B - 1e-6));
      // when the first word's entrance is longer than the lead-in (offset), start on beat 1
      const first = pace.lead > (o.offset ?? 0.5) - 0.05 ? 1 : 0;
      let b = first;
      o.scenes.forEach((sc, i) => {
        const start = i === 0 ? 0 : b, cues = [];
        b = i === 0 ? first : b + 1;          // one empty beat after the transition covers, then the new scene starts showing words
        for (const c of sc.cues) {
          let beats, parts = [];
          if (c.say !== undefined) {
            // each word holds at least: entrance (lead) + reading (hold) + exit (0.3 s) — board styles need time to write / print, so this slows down automatically
            const minEvery = Math.ceil((pace.lead + pace.hold + 0.3) / B - 1e-6);
            const list = Array.isArray(c.say) ? c.say : [c.say], every = Math.max(c.every ?? 2, minEvery);
            parts = list.map((text, k) => ({ text, at: b + k * every }));
            beats = c.beats ?? list.length * every + (c.line ? 3 : 0);
          } else if (c.list) {
            const every = c.every ?? 1;
            beats = c.beats ?? (c.list.length + (c.title ? 1 : 0)) * every + (c.hold ?? 3);
          } else if (c.montage) {
            // fast-cut montage: the anchor comes first (1 beat), then each cell faster than the last; grid: true puts all cells together in one grid at the end
            const minB = pace.lead > 0.3 ? 1 : 0.5, pat = c.beats ?? accel(c.montage.length, minB), offs = [];
            let x = c.anchor ? 1 : 0;
            pat.forEach((d) => { offs.push(x); x += d; });
            const gridOff = c.grid ? Math.ceil(x) : null;   // the grid lands on a whole beat
            x += c.grid ? 2 + (c.hold ?? 2) : (c.hold ?? 1);
            cues.push({ ...c, at: b, beats: Math.ceil(x), parts, montageOffs: offs, gridOff });
            b += Math.ceil(x);
            continue;
          } else if (infoKind(c)) {
            // a step needs at least its entrance (lead) + a glance: board styles need time to write / print, so this slows down automatically
            const n = stepsOf(c, false).length, minEvery = Math.ceil((pace.lead + 0.3) / B - 1e-6);
            const every = Math.max(c.every ?? EVERY[infoKind(c)], minEvery);
            // push-in annotated screenshot: title and window 2 beats each, then 4 beats per spot (push, light up, read the note) — the window never sits idle
            const zm = infoKind(c) === 'annotate' && c.zoom ? (c.marks || []).length : 0, pre = n - zm, offs = zm ? Array.from({ length: n }, (_, j) => (j < pre ? j * Math.max(2, minEvery) : pre * Math.max(2, minEvery) + (j - pre) * Math.max(c.every ?? 4, minEvery))) : null;
            cues.push({ ...c, at: b, beats: c.beats ?? (offs ? offs[n - 1] + Math.max(c.every ?? 4, minEvery) : n * every) + (c.hold ?? 2), parts, stepEvery: every, stepOffs: offs });   /* hold only 2 beats once built: the earlier steps were read long ago, holding longer is a music-only gap */
            b += cues[cues.length - 1].beats;
            continue;
          } else if (c.raw) beats = c.beats ?? 4;   // a hand-written part: you set its beats
          else if (c.shot) beats = c.beats ?? 5;
          else if (c.stat !== undefined) beats = c.beats ?? 4;
          else if (c.line) beats = c.beats ?? Math.max(3, Math.ceil((0.9 + 0.3 * words(c.line)) / B));
          else throw new Error('大字动效的 cue 要有 say / line / list / shot / stat / flow / compare / chart / annotate / diagram / montage / raw 之一：' + JSON.stringify(c));
          cues.push({ ...c, at: b, beats, parts });
          b += beats;
        }
        b += tail;
        scenes.push({ ...sc, start, cues, cover: b });   // cover: the beat at which the transition covers this scene
      });
      const endAt = b + 1, endBeats = o.end?.beats ?? 8;
      return { B, scenes, endAt, endBeats, duration: (o.offset ?? 0.5) + (endAt + endBeats) * B + 0.3, cover: (o.offset ?? 0.5) + endAt * B + 2.5 };
    },

    // beats → seconds, handed to the shared layout
    async build(F, S, plan, o) {
      const t = (n) => F.beat(n);
      const scenes = plan.scenes.map((sc) => ({ ...sc, startT: t(sc.start), coverT: t(sc.cover), cues: sc.cues.map((c) => {
        const every = c.every ?? 1, first = c.title ? 1 : 0;
        return { ...c, atT: t(c.at), partsT: c.parts.map((p) => ({ text: p.text, atT: t(p.at) })), lineT: c.parts.length ? t(c.parts[c.parts.length - 1].at + 1) : t(c.at),
          itemsT: (c.list || []).map((_, j) => t(c.at + (j + first) * every)), subT: t(c.at + 1),
          stepsT: c.montage ? c.montageOffs.map((x) => t(c.at + x)) : infoKind(c) ? stepsOf(c, F.portrait).map((_, j) => t(c.at + (c.stepOffs ? c.stepOffs[j] : j * c.stepEvery))) : [],
          gridT: c.montage && c.gridOff !== null ? t(c.at + c.gridOff) : null };
      }) }));
      await draw(F, S, o, scenes, t(plan.endAt));
    },
  };

  // ---------------- following narration (explain) ----------------
  FORMATS.explain = {
    // duration and cover are set in compose from the narration (holding tail seconds after the narration ends)
    plan(o) {
      const TL = window.TIMELINE, last = TL && TL.lines ? TL.lines.filter((l) => !l.silence).at(-1) : null;
      const endT = last ? last.end + 0.3 : 0;
      return { duration: o.duration ?? (last ? endT + P.kit.pace(o.style).wipe + (o.end?.hold ?? 4) : 0), cover: o.cover ?? (last ? Math.min(endT + 2.5, TL.lines[0].end) : undefined) };
    },
    async build(F, S, plan, o) {
      const T = F.T;
      if (!T || !T.lines.length) throw new Error('跟着旁白走（format: "explain"）要先有旁白：写 script.json，运行 explainer/scripts/tts.py，页面里加载 timeline.js');
      const lineOf = (id) => T.lines.find((l) => l.id === id);
      const at = (spec) => (typeof spec === 'number' ? spec : Array.isArray(spec) ? T.word(spec[0], spec[1]) : T.start(spec));
      const idOf = (spec) => (Array.isArray(spec) ? spec[0] : typeof spec === 'string' ? spec : null);
      // a word / an item: appears the moment the narration says it; if it isn't said, they are spread evenly over the line
      const within = (spec, texts, from) => {
        const l = lineOf(idOf(spec)), a = Math.max(from, l ? l.start : from), z = l ? l.end : a + texts.length * 0.8;
        return texts.map((x, k) => (l && l.text.includes(String(x)) ? Math.max(a, T.word(l.id, String(x))) : a + ((z - a) * k) / Math.max(1, texts.length)));
      };
      // each step of an information cue: appears when its words are spoken in this cue's stretch of narration (up to the start of the next cue, may span several lines);
      //   steps that aren't spoken are spread evenly between the times before and after; adjacent steps are at least 0.5 s apart
      const stepTimes = (c, a, z) => {
        const st = stepsOf(c, F.portrait), out = st.map((s) => {
          if (s.at !== undefined) return at(s.at);
          if (!s.key) return null;
          for (const l of T.lines) if (!l.silence && l.end > a && l.start < z && l.text.includes(s.key)) { const w = T.word(l.id, s.key); if (w >= a - 0.05) return w; }
          return null;
        });
        out[0] ??= a;
        for (let j = 1; j < out.length; j++) if (out[j] === null) { let k = j; while (k < out.length && out[k] === null) k++; const hi = k < out.length ? out[k] : Math.max(out[j - 1] + 0.8 * (k - j + 1), z - 1); for (let q = j; q < k; q++) out[q] = out[j - 1] + ((hi - out[j - 1]) * (q - j + 1)) / (k - j + 1); }
        for (let j = 1; j < out.length; j++) out[j] = Math.max(out[j], out[j - 1] + 0.5);
        return out;
      };
      const scenes = o.scenes.map((sc, si) => ({ ...sc, cues: sc.cues.map((c, ci) => {
        const atT = at(c.at);
        const nxt = sc.cues[ci + 1] ?? (o.scenes[si + 1] || {}).cues?.[0], zT = nxt ? at(nxt.at) : F.duration - 3;
        const list = c.say !== undefined ? (Array.isArray(c.say) ? c.say : [c.say]) : [];
        const partsT = list.length > 1 ? within(c.at, list, atT).map((x, k) => ({ text: list[k], atT: Math.max(x, atT + k * 0.5) })) : list.map((x) => ({ text: x, atT }));
        const last = partsT.length ? partsT[partsT.length - 1].atT : atT;
        const itemsT = c.list ? within(c.at, c.list, atT + (c.title ? 0.6 : 0)) : [];
        const r = { ...c, atT, partsT, lineT: c.lineAt !== undefined ? at(c.lineAt) : last + 0.6, itemsT, subT: atT + 0.6, stepsT: infoKind(c) ? stepTimes(c, c.montage && c.anchor ? atT + 0.6 : atT, zT) : [] };
        if (c.montage && c.grid) r.gridT = r.stepsT[r.stepsT.length - 1] + 1.2;
        return r;
      }) }));
      // transition: between two scenes (after the previous scene's last line ends, before the next scene's first line starts); the first scene starts at 0
      scenes.forEach((sc, i) => {
        sc.startT = i === 0 ? 0 : scenes[i - 1].coverT;
        const next = scenes[i + 1], nextT = next ? next.cues[0] && at(next.cues[0].at) : null;
        const lastId = idOf(sc.cues[sc.cues.length - 1].at), lastEnd = lastId && lineOf(lastId) ? lineOf(lastId).end : sc.cues[sc.cues.length - 1].atT + 1.5;
        sc.coverT = next ? Math.max(lastEnd + 0.1, (lastEnd + nextT) / 2, nextT - 0.6) : null;
      });
      const lastLine = T.lines.filter((l) => !l.silence).at(-1);
      // last scene: the transition starts only after the last line ends (a transition starts moving wipe seconds before its cover point), the ending follows right after
      const lastEnd = lastLine ? lastLine.end : F.duration - 3, wipeLead = P.kit.pace(o.style).wipe;
      const endT = o.end?.at !== undefined ? at(o.end.at) : lastEnd + wipeLead + 0.35;
      scenes[scenes.length - 1].coverT = Math.min(endT - 0.3, Math.max(scenes[scenes.length - 1].cues.at(-1).atT + 1, lastEnd + wipeLead + 0.05));
      await draw(F, S, o, scenes, endT);
    },
  };

  // ---------------- shared: lay out each scene's cues with the style's shared moves ----------------
  // scenes: [{ variant, energy, startT, coverT, cues: [{ …cue, atT, partsT: [{ text, atT }], lineT, itemsT: [seconds], subT }] }], all times in seconds
  async function draw(F, S, o, scenes, endT) {
    const PT = F.portrait, H = F.H;
    // layout (portrait avoids the platform overlay areas: top 8%, bottom 20%)
    const Y = PT
      ? { say: 0.42, sayL: 0.38, line: 0.53, lineOnly: 0.45, listT: 0.18, list0: 0.3, shot: 0.36, stat: 0.38, statL: 0.52 }
      : { say: 0.46, sayL: 0.4, line: 0.66, lineOnly: 0.5, listT: 0.2, list0: 0.42, shot: 0.42, stat: 0.42, statL: 0.65 };
    // big words at most 86% wide: the whole scene also slowly pushes in a few percent, so full-width words would soon be cut off by the frame edge
    const WMAX = F.W * 0.86;
    const SZ = PT ? { say: 150, line: 52, lineOnly: 64, listT: 100, item: 52, gap: 130, stat: 240 } : { say: 180, line: 50, lineOnly: 72, listT: 110, item: 52, gap: 118, stat: 260 };
    // screenshot sizes: load the images first and measure their original ratios
    const dims = {};
    await Promise.all(scenes.flatMap((sc) => sc.cues.map((c) => c.shot ?? c.annotate).filter(Boolean)).map((src) => new Promise((res) => { const im = new Image(); im.onload = () => { dims[src] = [im.naturalWidth || 16, im.naturalHeight || 10]; res(); }; im.onerror = () => { dims[src] = [16, 10]; res(); }; im.src = src; })));

    // frame areas (for building up): in portrait left / right become top / bottom
    const areaOf = (name = 'full') => {
      const nm = PT ? ({ left: 'top', right: 'bottom' })[name] ?? name : name;
      const A = PT
        ? { full: [0, 0, 1, 1], top: [0, 0.02, 1, 0.44], bottom: [0, 0.4, 1, 0.48] }
        : { full: [0, 0, 1, 1], left: [0, 0, 0.5, 1], right: [0.5, 0, 0.5, 1], top: [0, 0, 1, 0.56], bottom: [0, 0.44, 1, 0.56] };
      const r = A[nm];
      if (!r) throw new Error(`area 只能是 full / left / right / top / bottom：${name}`);
      return { x: r[0] * F.W, y: r[1] * H, w: r[2] * F.W, h: r[3] * H };
    };
    // information layouts use only the safe zone: 9% at the top, the bottom clear of captions / platform overlay (landscape 15%, portrait 22%), 6% on each side
    const safe = (R) => { const y0 = Math.max(R.y, H * (PT ? 0.09 : 0.1)), y1 = Math.min(R.y + R.h, H * (PT ? 0.78 : 0.85)), px = F.W * 0.06; const x0 = Math.max(R.x, px), x1 = Math.min(R.x + R.w, F.W - px); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
    // font size that fits: how many characters fit in a line (CJK 1 em each, Latin 0.55) × the maximum number of lines
    const fit = (text, w, size, lines = 2) => { const t = String(text), units = (t.match(/[^\x00-\xff]/g) || []).length + (t.replace(/[^\x00-\xff]/g, '').length) * 0.55, need = units * F.px(size); return need <= w * lines * 0.92 ? size : Math.max(30, size * (w * lines * 0.92) / need); };
    const estW = (text, size) => { const t = String(text); return ((t.match(/[^\x00-\xff]/g) || []).length + t.replace(/[^\x00-\xff]/g, '').length * 0.55) * F.px(size); };
    const CIRC = '①②③④⑤⑥⑦⑧⑨⑩';
    // keep annotation text inside the frame: move the centre inward by the estimated text width (×1.15: handwriting / calligraphy fonts render a little larger)
    const inFrame = (x, text, size, maxW) => { const half = (Math.min(maxW, estW(text, size)) / 2) * 1.15 + F.px(30); return Math.min(F.W * 0.94 - half, Math.max(F.W * 0.06 + half, x)); };
    const toneOf = (x) => (x && typeof x === 'object' ? (x.hot ? 1 : x.tone) : undefined);
    function info(layer, c, until, R0, sceneIdx) {
      const kind = infoKind(c), T = c.stepsT, R = safe(R0), ks = Math.max(0.8, Math.min(1, Math.sqrt((R.w * R.h) / (F.W * H * 0.66))));
      if (kind === 'montage') return montage(layer, c, until);
      let step = 0, top = R.y;
      if (c.title) {
        const size = fit(c.title, R.w * 0.9, (PT ? 58 : 62) * ks, 1);
        S.line(layer, { at: T[step++], until, text: c.title, x: R.x + R.w / 2, y: R.y + F.px(size) * 1.15, size, kind: 'headline', maxW: R.w * 0.92 });   /* centre a little lower: paper strips and backing plates are taller than the text, and their top edge must also stay clear of the 10% */
        top = R.y + F.px(size) * 2.35;
      }
      const C = { x: R.x, y: top, w: R.w, h: R.y + R.h - top };   // content area
      if (kind === 'flow' && S.steps) {
        // this style tells "one step after another" its own way (not boxes + arrows)
        const items = c.flow.map((x) => (x && typeof x === 'object' ? x : { text: x }));
        S.steps(layer, { items, T: T.slice(step), until, C }).forEach((pt, j) => foci.push({ t: T[step + j], ...pt }));
      } else if (kind === 'flow') {
        const items = c.flow.map((x) => (x && typeof x === 'object' ? x : { text: x })), n = items.length, row = C.w >= C.h * 1.3, gapA = F.px(row ? 140 : 80);
        if (row) {
          const bw = Math.min(F.px(520), (C.w - (n - 1) * gapA) / n), bh = Math.min(F.px(230), C.h * 0.42), x0 = C.x + (C.w - (n * bw + (n - 1) * gapA)) / 2, y = C.y + C.h * (items.some((x) => x.note) ? 0.4 : 0.5);
          items.forEach((it, j) => {
            const ts = T[step + j], x = x0 + j * (bw + gapA) + bw / 2;
            if (j) S.arrow(layer, { at: ts - 0.25, until, from: [x - bw / 2 - gapA + F.px(14), y], to: [x - bw / 2 - F.px(14), y], sfx: false });
            S.box(layer, { at: ts, until, x, y, w: bw, h: bh, text: it.text, size: fit(it.text, bw * 0.86, 56 * ks), tone: toneOf(it) });
            foci.push({ t: ts, x, y });
            if (it.note) S.label(layer, { at: ts + 0.3, until, text: it.note, x, y: y + bh / 2 + F.px(70), size: fit(it.note, bw + gapA * 0.6, 44, 2), maxW: bw + gapA * 0.6, sfx: false });
          });
        } else {
          const bh = Math.min(F.px(150), (C.h - (n - 1) * gapA) / n), bw = Math.min(C.w * 0.78, F.px(720)), y0 = C.y + (C.h - (n * bh + (n - 1) * gapA)) / 2 + bh / 2, x = C.x + C.w / 2;
          items.forEach((it, j) => {
            const ts = T[step + j], y = y0 + j * (bh + gapA), text = it.note ? `${it.text}\n${it.note}` : it.text;
            if (j) S.arrow(layer, { at: ts - 0.25, until, from: [x, y - bh / 2 - gapA + F.px(10)], to: [x, y - bh / 2 - F.px(10)], sfx: false });
            S.box(layer, { at: ts, until, x, y, w: bw, h: bh, text, size: fit(text, bw * 0.86, (it.note ? 46 : 54) * ks, 2), tone: toneOf(it) });
            foci.push({ t: ts, x, y });
          });
        }
      } else if (kind === 'compare' && S.versus) {
        const cols = c.compare, m = cols.length, at2m = {};
        let s2 = step + m;
        for (let r = 0; r < Math.max(...cols.map((col) => (col.points || []).length)); r++) cols.forEach((col, j) => { if ((col.points || [])[r] !== undefined) at2m[j + ',' + r] = T[s2++]; });
        S.versus(layer, { cols: cols.map((col, j) => ({ ...col, hot: col.hot || c.hot === j })), T: T.slice(step, step + m), at2: (j, r) => at2m[j + ',' + r], until, C }).forEach((pt, j) => foci.push({ t: T[step + j], ...pt }));
      } else if (kind === 'compare' && c.compare.length >= 3 && C.w < C.h * 1.1) {
        // a narrow frame (portrait) can't fit three columns: each item becomes a row, column name on the left, points on the right
        const cols = c.compare, m = cols.length, rowH = C.h / m, tw = C.w * 0.4, px0 = C.x + tw + F.px(40), pw = C.w - tw - F.px(40);
        const at2 = {};   // each point's time: counted in the same order as stepsOf, "row by row, one per column"
        let s2 = step + m;
        for (let r = 0; r < Math.max(...cols.map((col) => (col.points || []).length)); r++) cols.forEach((col, j) => { if ((col.points || [])[r] !== undefined) at2[j + ',' + r] = T[s2++]; });
        cols.forEach((col, j) => {
          const y0 = C.y + rowH * j, n2 = (col.points || []).length, cy = y0 + rowH / 2;
          S.box(layer, { at: T[step + j], until, x: C.x + tw / 2, y: cy, w: tw * 0.94, h: Math.min(F.px(150), rowH * 0.6), text: col.title, size: fit(col.title, tw * 0.8, 50 * ks, 2), tone: col.hot || c.hot === j ? 1 : undefined });
          if (j) S.shape(layer, { at: T[step], until, kind: 'line', x: C.x, y: y0, x2: C.x + C.w, y2: y0, dash: [10, 12], sfx: false });
          (col.points || []).forEach((pt, r) => { const text = textOf(pt); S.label(layer, { at: at2[j + ',' + r], until, text, x: px0 + pw / 2, y: cy + (r - (n2 - 1) / 2) * Math.min(F.px(110), rowH / Math.max(1, n2)), size: fit(text, pw * 0.86, 44 * ks, 2), maxW: pw * 0.92, tone: toneOf(pt) }); });
        });
      } else if (kind === 'compare') {
        const cols = c.compare, m = cols.length, colW = C.w / m, th = F.px(130 * ks), rows = Math.max(...cols.map((col) => (col.points || []).length));
        const y0 = C.y + th / 2 + F.px(6), py0 = y0 + th / 2 + F.px(70), rowGap = Math.min(F.px(140), (C.y + C.h - py0) / Math.max(1, rows));
        cols.forEach((col, j) => {
          const x = C.x + colW * (j + 0.5), ts = T[step + j];
          S.box(layer, { at: ts, until, x, y: y0, w: colW * 0.82, h: th, text: col.title, size: fit(col.title, colW * 0.7, 60 * ks, 1), tone: col.hot || c.hot === j ? 1 : undefined });
          if (j) S.shape(layer, { at: T[step], until, kind: 'line', x: C.x + colW * j, y: C.y, x2: C.x + colW * j, y2: Math.min(C.y + C.h, py0 + rows * rowGap), dash: [10, 12], sfx: false });   // divider lines go only down to the bottom of the content
        });
        let s2 = step + m;
        for (let r = 0; r < rows; r++) cols.forEach((col, j) => {
          const pt = (col.points || [])[r];
          if (pt === undefined) return;
          const text = textOf(pt);
          S.label(layer, { at: T[s2++], until, text, x: C.x + colW * (j + 0.5), y: py0 + r * rowGap, size: fit(text, colW * 0.8, 52 * ks, 2), maxW: colW * 0.84, tone: toneOf(pt) });
        });
      } else if (kind === 'chart') {
        // each bar is wide enough for its name (no wrapping)
        const data = c.chart, n = data.length, capH = c.caption ? F.px(120) : 0, slot = Math.max(F.px(PT ? 210 : 250), Math.max(...data.map((d) => estW(d[0], 48 * ks))) * 1.15 + F.px(40)), cw = Math.min(C.w, n * slot), ch = Math.min(C.h - capH - F.px(20), F.px(PT ? 900 : 760));
        const x = C.x + (C.w - cw) / 2, y = C.y + (C.h - capH - ch) / 2, ats = data.map((_, j) => T[step + j]);
        if (S.figures) S.figures(layer, { data: data.map((d) => [d[0], d[1]]), ats, until, C: { x: C.x, y: C.y, w: C.w, h: C.h - capH }, unit: c.unit, decimals: c.decimals, hot: c.hot }).forEach((pt, j) => foci.push({ t: ats[j], ...pt }));
        else S.bars(layer, { at: ats[0], ats, every: n > 1 ? Math.min(1.2, Math.max(0.15, (ats[n - 1] - ats[0]) / (n - 1))) : 0.2, until, x, y, w: cw, h: ch, data: data.map((d) => [d[0], d[1]]), unit: c.unit, decimals: c.decimals, hot: c.hot, max: c.max, size: 48 * ks });
        if (!S.figures) ats.forEach((a2, j) => foci.push({ t: a2, x: x + ((j + 0.5) * cw) / n, y: y + ch * 0.55 }));
        if (c.caption) S.line(layer, { at: ats[n - 1] + 0.8, until, text: c.caption, x: C.x + C.w / 2, y: y + ch + capH * 0.55, size: fit(c.caption, C.w * 0.8, 46, 1), maxW: C.w * 0.9 });
      } else if (kind === 'annotate' && c.zoom && S.screen) {
        // push-in version (launch): the window stays put, the camera pushes in on one spot of the page inside it at a time, a spotlight lights that spot, notes change below the window; finally it pulls back to the whole view
        // landscape: window on the left at full height, notes in a column on the right; portrait: window on top, notes below it
        const marks = c.marks || [], side = !PT, noteH = side ? 0 : F.px(150), capH = c.caption && !side ? F.px(100) : 0, bar = F.px(44), noteW = side ? Math.min(F.px(520), C.w * 0.3) : C.w;
        const w = side ? Math.min(C.w - noteW - F.px(70), (C.h - bar) * 1.6) : Math.min(C.w, (C.h - noteH - capH - bar) * 1.6), h = Math.min(w * 0.625, C.h - noteH - capH - bar), cy0 = side ? C.y + C.h / 2 : C.y + (h + bar) / 2;
        const winX = side ? C.x + (C.w - noteW - F.px(70) - w) / 2 + w / 2 : C.x + C.w / 2, noteX = side ? winX + w / 2 + F.px(70) + noteW / 2 : C.x + C.w / 2;
        const N = marks.length, Tm = marks.map((_, j) => T[step + 1 + j]), back = until < 1e8 ? Math.max(Tm[N - 1] + 1.2, until - 1.0) : Tm[N - 1] + 2.4;
        const scr = S.screen(layer, { src: c.annotate, url: c.url, at: T[step], until, x: winX, y: cy0, w, h,
          zoom: [...marks.map((m, j) => ({ at: Tm[j], to: m, max: m.max })), { at: back, to: 'all' }],
          spot: marks.map((m, j) => ({ at: Tm[j] + 0.3, until: j < N - 1 ? Tm[j + 1] : back - 0.6, box: m })),
          cursor: marks.filter((m) => m.click).map((m) => ({ at: Tm[marks.indexOf(m)] + 0.4, x: m.x + m.w / 2, y: m.y + m.h * 0.6, click: true })) });
        const noteY = side ? cy0 : cy0 + (h + bar) / 2 + noteH * 0.5;
        marks.forEach((m, j) => { if (m.note) S.line(layer, { at: Tm[j] + 0.35, until: j < N - 1 ? Tm[j + 1] : back, text: m.note, x: noteX, y: noteY, size: fit(m.note, noteW * 0.9, side ? 46 : 42, side ? 3 : 1), maxW: noteW }); foci.push({ t: Tm[j], x: winX, y: cy0 }); });
        if (c.caption) S.line(layer, { at: back + 0.2, until, text: c.caption, x: noteX, y: noteY, size: fit(c.caption, noteW * 0.9, 44, side ? 3 : 1), maxW: noteW });
      } else if (kind === 'annotate') {
        const [iw, ih] = dims[c.annotate], marks = c.marks || [], side = !PT && C.w >= C.h * 1.25 && marks.length, noteW = side ? Math.min(F.px(540), C.w * 0.33) : 0;
        const capH = c.caption ? F.px(100) : 0, nRows = side ? 0 : marks.length, listH = nRows ? Math.min(C.h * 0.4, nRows * F.px(88) + F.px(30)) : 0;
        const SA = { x: C.x, y: C.y, w: C.w - (side ? noteW + F.px(90) : 0), h: C.h - capH - listH };
        const k2 = Math.min(SA.w / iw, SA.h / ih), w = iw * k2, h = ih * k2, sx = SA.x + SA.w / 2 + (side ? 0 : 0), sy = SA.y + SA.h / 2;
        const shot = S.shot(layer, { at: T[step], until, src: c.annotate, x: sx, y: sy, w, h, fit: 'cover', rot: 0, tilt: 0 });
        const box = shot.box ?? { x: sx - w / 2, y: sy - h / 2, w, h };
        if (c.caption) S.line(layer, { at: T[step] + 0.6, until, text: c.caption, x: C.x + C.w / 2, y: C.y + C.h - capH * 0.5, size: fit(c.caption, C.w * 0.8, 44, 1), maxW: C.w * 0.9 });
        const reg = marks.map((m) => { const f = (v, L) => (v <= 1.0001 ? v * L : v); return { x: box.x + f(m.x, box.w), y: box.y + f(m.y, box.h), w: f(m.w, box.w), h: f(m.h, box.h) }; });
        // landscape: notes in a column on the right, each aligned with its circled spot (not crowding each other), arrows from note to circle; portrait: ①② beside the circles, notes listed by number below the screenshot
        let ys = reg.map((r) => r.y + r.h / 2);
        if (side) {
          const gapN = F.px(150), order = ys.map((y, j) => [y, j]).sort((p, q) => p[0] - q[0]), lo = C.y + F.px(50), hi = C.y + C.h - capH - F.px(50);
          let prev = -1e9; order.forEach((p) => { p[0] = Math.max(p[0], prev + gapN, lo); prev = p[0]; });
          const over = prev - hi; if (over > 0) order.forEach((p) => (p[0] -= over));
          order.forEach(([y, j]) => (ys[j] = y));
        }
        const lab = (l, o2) => (S.label ? S.label(l, o2) : S.line(l, { ...o2, maxW: o2.maxW ?? F.W * 0.3 }));
        // this style's own "look here" (op's lens, pop's close-up panel, cutout / origami's paper magnifier, launch's spotlight); board styles use their own circles and boxes
        const spots = S.spotlight ? S.spotlight(layer, { src: c.annotate, box, regions: reg, T: marks.map((_, j) => T[step + 1 + j]), until }) : null;
        marks.forEach((m, j) => {
          const ts = T[step + 1 + j], r = reg[j];
          if (!spots) S.mark(layer, { at: ts, until, ...r, kind: m.kind ?? 'box' });
          foci.push({ t: ts, x: r.x + r.w / 2, y: r.y + r.h / 2 });
          const note = m.note ?? '';
          if (side) {
            const nx = box.x + box.w + F.px(90) + noteW / 2, size = fit(note, noteW * 0.8, 46, 1);
            if (note) lab(layer, { at: ts + 0.25, until, text: note, x: nx, y: ys[j], size, maxW: noteW, sfx: false });
            const lx = nx - Math.min(noteW, estW(note, size)) / 2 - F.px(40);   // the note's backing plate is a margin wider than the text
            if (!spots) S.arrow(layer, { at: ts + 0.2, until, from: [lx, ys[j]], to: [r.x + r.w + F.px(20), r.y + r.h / 2], tone: 'mark', sfx: false });
          } else {
            lab(layer, { at: ts, until, text: CIRC[j] ?? String(j + 1), x: Math.max(r.x - F.px(4), box.x + F.px(30)), y: Math.max(r.y - F.px(4), box.y + F.px(30)), size: 40, maxW: F.px(120), tone: 1, sfx: false, overlap: true });
            if (note) { const ny = box.y + box.h + F.px(70) + j * Math.min(F.px(88), (listH - F.px(30)) / nRows); lab(layer, { at: ts + 0.25, until, text: `${CIRC[j] ?? j + 1} ${note}`, x: C.x + C.w / 2, y: ny, size: fit(note, C.w * 0.8, 40, 1), maxW: C.w * 0.9 }); }
          }
        });
      } else if (kind === 'diagram') {
        if (!S.box) throw new Error(`示意图（diagram：方框 + 箭头）是画板风格（白板 / 孔版 / 水墨）的语言，${S.name} 不用它——一步接一步用 flow，对照用 compare，数字用 chart，真实界面用 annotate，很多件事用 montage（每种风格会用自己的方式画出来）`);
        // figure ratio: landscape defaults to 2:1; in portrait with no separate drawing (portrait), the same figure is stretched vertically to full height (positions are fractions, so nothing misaligns)
        const items = itemsOf(c, PT), idx = diagramSteps(items), A = c.aspect ?? (PT ? (c.portrait ? C.w / C.h : Math.max(C.w / C.h, 1)) : 2);
        const Dw = Math.min(C.w, C.h * A), Dh = Dw / A, D = { x: C.x + (C.w - Dw) / 2, y: C.y + (C.h - Dh) / 2, w: Dw, h: Dh };
        const px = (fx) => D.x + fx * D.w, py = (fy) => D.y + fy * D.h, ids = {};
        const edge = (id, toward) => {   // from a shape's centre, walk in a direction to its edge (plus a little gap)
          const g = ids[id]; if (!g) throw new Error(`示意图里没有 id 为 ${id} 的图元`);
          const dx = toward[0] - g.cx, dy = toward[1] - g.cy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, gap = F.px(16);
          const d = g.r !== undefined ? g.r : Math.min(Math.abs(ux) > 1e-6 ? g.w / 2 / Math.abs(ux) : 1e9, Math.abs(uy) > 1e-6 ? g.h / 2 / Math.abs(uy) : 1e9);
          return [g.cx + ux * (d + gap), g.cy + uy * (d + gap)];
        };
        items.forEach((it, j) => {
          const ts = T[step + idx[j]] ?? T[T.length - 1], tone = toneOf(it), o = { at: ts, until, tone, sfx: j > 0 && idx[j] === idx[j - 1] ? false : it.sfx };   // only the first shape in a step makes a sound
          if (it.box !== undefined) {
            const x = px(it.x), y = py(it.y), w = (it.w ?? 0.22) * D.w, h = (it.h ?? 0.2) * D.h;
            S.box(layer, { ...o, x, y, w, h, text: it.box, size: it.size ?? fit(it.box, w * 0.86, 54 * ks, h > F.px(130) ? 2 : 1) });
            if (it.id) ids[it.id] = { cx: x, cy: y, w, h };
            foci.push({ t: ts, x, y });
          } else if (it.label !== undefined) { const size = it.size ?? 46 * ks, maxW = Math.max((it.w ?? 0.34) * D.w, F.px(260)); S.label(layer, { ...o, text: it.label, x: inFrame(px(it.x), it.label, size, maxW), y: py(it.y), size, maxW, sfx: it.sfx }); }
          else if (it.word !== undefined) S.word(layer, { ...o, text: it.word, x: px(it.x), y: py(it.y), size: it.size ?? 120 * ks, variant: sceneIdx, maxW: (it.w ?? 0.6) * D.w });
          else if (it.arrow) {
            const a = it.arrow;
            let from, to;
            if (typeof a[0] === 'string') { const A2 = ids[a[0]], B2 = ids[a[1]]; if (!A2 || !B2) throw new Error(`示意图的箭头连不上：${a.join(' → ')}（先画有这个 id 的图元）`); from = edge(a[0], [B2.cx, B2.cy]); to = edge(a[1], [A2.cx, A2.cy]); }
            else { from = [px(a[0]), py(a[1])]; to = [px(a[2]), py(a[3])]; }
            S.arrow(layer, { ...o, from, to, bend: it.bend, color: it.color });
          } else if (it.circle) {
            const [x, y, r] = it.circle, rr = r * Math.min(D.w, D.h), cx = Math.min(F.W * 0.94 - rr, Math.max(F.W * 0.06 + rr, px(x))), cy = py(y);   // r is measured on the figure's short side; circles stay inside the frame
            S.shape(layer, { ...o, kind: 'circle', x: cx, y: cy, r: rr, w: rr * 2, fill: it.fill });
            if (it.id) ids[it.id] = { cx, cy, r: rr };
          } else if (it.rect) {
            const [x, y, w, h] = it.rect;
            S.shape(layer, { ...o, kind: 'rect', x: px(x), y: py(y), w: w * D.w, h: h * D.h, fill: it.fill });
            if (it.id) ids[it.id] = { cx: px(x + w / 2), cy: py(y + h / 2), w: w * D.w, h: h * D.h };
          } else if (it.line) { const [x1, y1, x2, y2] = it.line; S.shape(layer, { ...o, kind: 'line', x: px(x1), y: py(y1), x2: px(x2), y2: py(y2), dash: it.dash }); }
          else if (it.band) { const [x, y, w, h] = it.band; S.shape(layer, { ...o, kind: 'band', x: px(x), y: py(y), w: w * D.w, h: h * D.h, colors: it.colors }); }
          else if (it.mark !== undefined) {
            let r;
            if (typeof it.mark === 'string') { const g = ids[it.mark]; if (!g) throw new Error(`示意图里没有 id 为 ${it.mark} 的图元`); const hw = g.r ?? g.w / 2, hh = g.r ?? g.h / 2; r = { x: g.cx - hw, y: g.cy - hh, w: hw * 2, h: hh * 2 }; }
            else { const [x, y, w, h] = it.mark; r = { x: px(x), y: py(y), w: w * D.w, h: h * D.h }; }
            S.mark(layer, { ...o, ...r, kind: it.kind ?? 'circle' });
            foci.push({ t: ts, x: r.x + r.w / 2, y: r.y + r.h / 2 });
          } else if (it.bars) S.bars(layer, { ...o, x: px(it.x), y: py(it.y), w: it.w * D.w, h: it.h * D.h, data: it.bars, unit: it.unit, hot: it.hot, max: it.max, size: it.size ?? 36 * ks });
          else throw new Error('示意图的图元要有 box / label / word / arrow / circle / rect / line / band / mark / bars 之一：' + JSON.stringify(it));
        });
      }
    }

    // ---------- fast-cut montage: an anchor (an element of the real UI / a line of original copy) is pinned on screen while cells cut past behind it ----------
    //   each cell uses this style's material (S.flash), every cut on the beat; grid: true puts all cells together in one grid at the end
    function montage(layer, c, until) {
      const items = c.montage.map((x) => (x && typeof x === 'object' ? x : { text: x })), n = items.length, T = c.stepsT, gridT = c.gridT ?? null;
      if (S.montage && c.look !== 'flash') {   // the style's own fast cut (launch: things on stage + camera truck + group shot)
        S.montage(layer, { items, T, gridT, until });
        if (c.anchor) anchorPill(layer, c.anchor, c.atT, until, c.anchorColor);
        foci.length = 0;
        return;
      }
      items.forEach((it, j) => S.flash(layer, { at: T[j], until: j < n - 1 ? T[j + 1] : gridT ?? until, end: gridT ?? until, text: it.text, color: it.color, index: j, z: 8, low: !!c.anchor,
        sub: c.count === false ? undefined : `${String(j + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`, gain: 0.35 + 0.25 * (j / Math.max(1, n - 1)) }));
      if (gridT !== null) {
        const cols = PT ? 2 : Math.min(4, n), rows = Math.ceil(n / cols), gw = F.W / cols, gh = H / rows;
        items.forEach((it, j) => S.flash(layer, { at: gridT, until, end: until, text: it.text, color: it.color, index: j, z: 8, sfx: j === 0 ? undefined : false,
          rect: { x: (j % cols) * gw, y: Math.floor(j / cols) * gh, w: gw, h: gh } }));
        if (!S.board) F.sfx(gridT, 'impact', 0.6);
      }
      if (c.anchor) anchorPill(layer, c.anchor, c.atT, until, c.anchorColor);
      foci.length = 0;   // the fast cut is already moving: the camera stops following foci in this scene
    }
    // anchor: an element of the real UI (white pill + dot + original copy), drawn as the UI looks in every style, on top of the fast cut
    function anchorPill(layer, text, a, until, dot) {
      const th = F.theme, size = F.px(PT ? 40 : 46);
      const wrap = P.el('div', `left:0;right:0;top:${f1(H * (S.anchorY ?? (S.board ? 0.26 : PT ? 0.44 : 0.46)))}px;text-align:center;z-index:30;display:none;pointer-events:none`, layer);
      const pill = P.el('div', `position:relative;display:inline-flex;align-items:center;gap:${f1(size * 0.45)}px;padding:${f1(size * 0.45)}px ${f1(size * 0.75)}px;border-radius:999px;background:#FFFFFF;color:#16171A;font:600 ${f1(size)}px/1 ${th.fonts.sans};box-shadow:0 ${f1(F.px(18))}px ${f1(F.px(50))}px rgba(0,0,0,.3)`, wrap);
      P.el('span', `position:relative;display:inline-block;width:${f1(size * 0.8)}px;height:${f1(size * 0.8)}px;border-radius:50%;background:${dot ?? '#54B9A6'}`, pill);
      const tx = P.el('span', 'position:relative', pill); tx.textContent = text;
      F.text(tx, 'label', text, a - 0.2, until);
      F.add((t) => { const on = t >= a - 0.2 && t < until; P.set(wrap, { display: on ? '' : 'none' }); if (on) { const q = P.seg(t, a - 0.2, a + 0.15, P.E.backOut); P.set(pill, { transform: `scale(${(0.8 + 0.2 * q).toFixed(4)})`, opacity: String(Math.min(1, P.seg(t, a - 0.2, a))) }); } });
      F.sfx(a - 0.2, 'pop', 0.45);
    }
    // ---------- rhythm sheet: each scene has a role, which decides both music intensity / hit / build-up / sudden stop and camera move ----------
    //   hook opening hook · build climb · burst fast cut · drop landing (a hit, with the music stopping short just before) · resolve wrap-up
    //   with no role given, assigned automatically: first scene hook, scenes with montage burst, the scene after the fast cut drop (with no fast cut, the hero: true scene or the last one), the rest build
    const ROLE = { hook: { energy: 1, cam: 'reveal' }, build: { energy: 2, cam: 'glide' }, burst: { energy: 3, cam: 'hold' }, drop: { energy: 3, hit: true, cam: 'punch' }, stop: { energy: 0, cam: 'hold' }, resolve: { energy: 1, cam: 'pull' } };
    const roles = (() => {
      const r = scenes.map((sc) => sc.role ?? null);
      if (o.rhythm === false) return r.map((x) => x ?? 'build');
      scenes.forEach((sc, i) => { if (!r[i] && sc.cues.some((c) => c.montage)) r[i] = 'burst'; });
      if (!r[0]) r[0] = 'hook';
      if (!r.includes('drop')) {
        const bi = r.indexOf('burst'), hi = scenes.findIndex((sc) => sc.hero), k = bi >= 0 ? bi + 1 : hi >= 0 ? hi : scenes.length - 1;
        if (k > 0 && k < scenes.length && !r[k]) r[k] = 'drop';
      }
      return r.map((x) => x ?? 'build');
    })();
    for (const x of roles) if (!ROLE[x]) throw new Error(`场景的 role 只能是 ${Object.keys(ROLE).join(' / ')}：${x}`);
    // camera: set by role, the same move never three times in a row (the third in a row is swapped); board styles use their own camera work (panning regions, scrolling handscroll, page turns), not here
    const cams = [];
    roles.forEach((x, i) => { let c2 = scenes[i].camera ?? ROLE[x].cam; if (!scenes[i].camera && i >= 2 && c2 === cams[i - 1] && c2 === cams[i - 2]) c2 = ['pull', 'glide', 'hold', 'punch'].find((m) => m !== c2); cams.push(c2); });
    let foci = [];
    // camera moves (transform of the whole scene layer): reveal pulls out from a close-up of the first thing; punch slams in on the landing then eases back a little; pull slowly pulls out over the scene; glide slides sideways; hold barely moves.
    //   as each step of an information cue lands, the camera leans a little toward it and pushes in a little (foci), leading the viewer's eye there; the shift never exceeds the margin the zoom leaves
    const camera = (layer, kind, a, b, fc, landT, origin, dir) => {
      const cx = F.W / 2, cy = H / 2, list = fc.slice().sort((p, q) => p.t - q.t);
      // styles that can't scale (pixel: scaling makes the pixels uneven): no push or pull; punch = the whole screen shakes by whole pixels for four frames on the landing (a game screen shake)
      if (S.zoom === false) {
        if (kind === 'punch') { const g = S.grid ?? F.px(4), D = [[2, -1], [-2, 1], [1, 2], [-1, -1]]; F.sfx(landT, 'impact', 0.3); F.add((t) => { if (t < a || t >= b) return; const k = Math.floor((t - landT) * 30); P.set(layer, { transform: k >= 0 && k < 4 ? `translate(${f1(D[k][0] * g)}px,${f1(D[k][1] * g)}px)` : '' }); }); }
        return;
      }
      P.set(layer, { transformOrigin: kind === 'reveal' && origin ? `${f1(origin[0])}px ${f1(origin[1])}px` : '50% 50%' });
      F.add((t) => {
        if (t < a || t >= b) return;
        const u = t - a, L = Math.max(0.5, Math.min(b, F.duration) - a);
        let s = 1, tx = 0;
        if (kind === 'reveal') s = 1.22 - 0.22 * P.seg(t, landT - 0.15, landT + 0.75, P.E.expoOut) + 0.004 * Math.max(0, t - landT - 0.75);
        else if (kind === 'punch') s = 1 + 0.07 * P.seg(t, landT - 0.05, landT + 0.18, P.E.quartOut) - 0.035 * P.seg(t, landT + 0.18, landT + 1.6, P.E.cubicInOut) + 0.003 * Math.max(0, t - landT - 1.6);
        else if (kind === 'pull') s = 1.07 - 0.07 * P.E.sine(Math.min(1, u / L));
        else if (kind === 'glide') { s = 1.03; tx = F.W * 0.013 * (1 - 2 * P.E.sine(Math.min(1, u / L))) * dir; }
        else s = 1 + 0.003 * u;
        let fx = 0, fy = 0, fz = 0;
        for (const f of list) { if (t < f.t - 0.35) break; const q = P.E.cubicInOut(P.seg(t, f.t - 0.35, f.t + 0.25)); fx += ((cx - f.x) * 0.08 - fx) * q; fy += ((cy - f.y) * 0.08 - fy) * q; fz += (0.025 - fz) * q; }
        const S2 = s + fz, mx = ((S2 - 1) * F.W) / 2, my = ((S2 - 1) * H) / 2, X2 = Math.max(-mx, Math.min(mx, tx + fx)), Y2 = Math.max(-my, Math.min(my, fy));
        P.set(layer, { transform: `translate(${f1(X2)}px,${f1(Y2)}px) scale(${S2.toFixed(4)})` });
      });
    };
    // the rhythm sheet is printed by render.mjs --check (window.__rhythm), which checks: a hook within 3 s, a fast-cut section at 20–70%, at least two things change at each scene change, no camera move three times in a row
    function rhythmLint(rows, scenes) {
      window.__rhythm = () => rows.map((r) => ({ ...r, from: Math.round(r.from * 100) / 100, to: Math.round(Math.min(r.to, F.duration) * 100) / 100 }));
      F.addLint(() => {
        const out = [], D = F.duration, w = (t, msg) => out.push({ level: 'warn', t: Math.round(t * 100) / 100, src: '', what: '节奏', msg });
        const first = scenes[0] && scenes[0].cues[0] ? scenes[0].cues[0].atT : 0;
        if (first > 3) w(first, `第一个东西 ${first.toFixed(1)} 秒才出来：开头 3 秒内要有动静（钩子）`);
        if (!F.voiced) {
          const bi = rows.findIndex((r) => r.role === 'burst');
          if (D > 20 && bi < 0) w(0, '没有快切段：在片子 30–40% 的位置加一段 montage（真实的功能 / 结果 / 数字一格一格切过去），整支片子才有高潮');
          if (bi >= 0) { const f = rows[bi].from / D; if (f < 0.2 || f > 0.7) w(rows[bi].from, `快切段在片子的 ${(f * 100).toFixed(0)}% 处：放在 30–60% 之间（前面要有铺垫，后面要留落点）`); }
        }
        for (let i = 1; i < rows.length; i++) { const a = rows[i - 1], b = rows[i], ch = (a.energy !== b.energy) + (a.camera !== b.camera) + (a.kind !== b.kind) + (a.variant !== b.variant); if (ch < 2) w(b.from, `第 ${a.scene} → ${b.scene} 场只换了 ${ch} 样：换场时强度、镜头、画面类型、底色至少换两样，否则像在翻 PPT`); }
        for (let i = 2; i < rows.length; i++) if (rows[i].camera === rows[i - 1].camera && rows[i].camera === rows[i - 2].camera && !String(rows[i].camera).startsWith('（')) w(rows[i].from, `连续三场都是同一种镜头（${rows[i].camera}）：换一种`);
        return out;
      });
    }
    const kindOfScene = (sc) => { const c = sc.cues[0] || {}; return c.raw ? 'raw' : c.montage ? 'montage' : infoKind(c) ?? (c.say !== undefined ? 'say' : c.list ? 'list' : c.shot ? 'shot' : c.stat !== undefined ? 'stat' : 'line'); };
    const n = scenes.length, rows = [];
    let prevShow = 0;
    scenes.forEach((sc, i) => {
      const role = roles[i], spec = ROLE[role], layer = F.layer('', 50 - i), energy = sc.energy ?? (F.voiced ? 1 : spec.energy);
      const nextRole = roles[i + 1] ?? (roles.includes('drop') ? 'resolve' : 'drop');
      // music follows the role: drop opens with a hit after a one-beat sudden stop; when the next scene is burst / drop this scene builds up (low-pass slowly opening). With narration the music is just a bed
      //   the hit and the stop land on the beat where this scene's first word appears: there's an empty beat after the transition covers, so a hit at the very start of the scene would land on a blank screen (wasting the loudest moment of the film)
      const hitOn = !F.voiced && i > 0 && (sc.hit ?? !!spec.hit), stopOn = !F.voiced && i > 0 && role === 'drop' && sc.stop !== false ? sc.stop ?? F.B : 0, firstAt = sc.cues[0] ? Math.max(sc.startT, sc.cues[0].atT) : sc.startT;
      const buildOn = !F.voiced && role !== 'burst' && (nextRole === 'burst' || nextRole === 'drop');
      if ((hitOn || stopOn) && firstAt - sc.startT > 0.05) { F.section(sc.startT, energy, { name: role, build: buildOn }); F.section(firstAt, energy, { name: role, hit: hitOn, stop: stopOn }); }
      else F.section(sc.startT, energy, { name: role, hit: hitOn, stop: stopOn, build: buildOn });
      foci = [];
      S.bg(layer, { variant: sc.variant ?? i });
      // information density check: hold back the information items registered in this scene, register them once we know when the scene is hidden (transition), so their end time doesn't go past it
      const infoReg = F.info, pend = [];
      F.info = (...a) => pend.push(a);
      sc.cues.forEach((c, k) => {
        const next = sc.cues[k + 1], at = c.atT;
        const until = c.keep || !next ? 1e9 : next.atT - S.lead;      // keep: stays until the end of the scene; the last cue holds until the transition covers it (the layer is hidden)
        // which area of the frame this cue uses: the full-frame layout is scaled into this area (font size shrinks to 0.75× at most)
        const R = areaOf(c.area), kx = R.w / F.W, ky = R.h / H, ks = Math.max(0.75, Math.min(1, Math.sqrt(kx * ky) * 1.15));
        const X = (fx) => R.x + fx * R.w, Yp = (fy) => R.y + fy * R.h, sz = (n) => Math.max(40, n * ks), wmax = WMAX * kx;
        const cx = X(0.5), lineW = R.w * (PT || R.w < F.W * 0.6 ? 0.86 : 0.72);   // width of the explanation line (the same as the style default when full-frame)
        const nT = F.texts.length;
        if (c.say !== undefined) {
          const yW = Yp(c.line ? Y.sayL : Y.say);
          c.partsT.forEach((p, j) => {
            const u = j < c.partsT.length - 1 ? c.partsT[j + 1].atT - S.lead : until;
            S.word(layer, { at: p.atT, until: u, text: p.text, x: cx, y: yW, size: c.size ?? sz(SZ.say), variant: i + j, maxW: wmax });
            if (c.accent && j === c.partsT.length - 1) S.accent(layer, { at: p.atT, until: u, x: cx, y: yW });
          });
          if (c.line) S.line(layer, { at: c.lineT, until, text: c.line, x: cx, y: Yp(Y.line), size: sz(SZ.line), maxW: lineW });
        } else if (c.list) {
          if (c.title) S.word(layer, { at, until, text: c.title, x: cx, y: Yp(Y.listT), size: sz(SZ.listT), variant: i, kind: 'headline', maxW: wmax });
          // a few very short items (colours, single words) go in one row; longer ones stack down, spacing tightens automatically with more items, never leaving the frame (portrait avoids the bottom 20%)
          //   in portrait at most 3 items per row (more go on two rows), each item gets its own width, not crowding its neighbours
          const narrow = PT || R.w < F.W * 0.6;
          const short = c.list.length >= 3 && c.list.every((x) => String(x).length <= 4), nL = c.list.length;
          const perRow = short ? (narrow ? 3 : Math.min(nL, 6)) : 1, step = (narrow ? 0.8 : 0.72) / perRow;
          const gap = Math.min(F.px(SZ.gap) * ks, ((PT ? 0.74 : 0.86) * R.h - Y.list0 * R.h) / Math.max(1, nL - 1));
          c.list.forEach((item, j) => {
            const row = Math.floor(j / perRow), col = j % perRow, inRow = Math.min(perRow, nL - row * perRow);
            S.line(layer, { at: c.itemsT[j], until, text: item, x: short ? X(0.5 + (col - (inRow - 1) / 2) * step) : cx, maxW: short ? R.w * step * 0.92 : R.w * (narrow ? 0.86 : 0.72),
              y: short ? Yp(Y.list0) + F.px(40) + row * F.px(SZ.gap * 1.3) * ks : Yp(Y.list0) + j * gap, size: sz(SZ.item), sfx: j % 2 ? false : undefined });
          });
          if (c.accent) S.accent(layer, { at, until, x: cx, y: Yp(Y.listT) });
          F.info('list', at, until, { visual: false });   /* list: counts as facts, not as "has a visual" */
        } else if (c.shot) {
          const [iw, ih] = c.ratio ? [c.ratio, 1] : dims[c.shot], mw = R.w * (PT ? 0.86 : 0.58 / Math.max(kx, 0.6)), mh = R.h * (PT ? 0.36 : 0.54), k2 = Math.min(mw / iw, mh / ih, R.w * 0.9 / iw), w = iw * k2, h = ih * k2, y = Yp(Y.shot);
          S.shot(layer, { at, until, src: c.shot, x: cx, y, w, h, fit: c.fit });
          if (c.caption) S.line(layer, { at: c.subT, until, text: c.caption, x: cx, y: y + h / 2 + F.px(PT ? 110 : 95), size: sz(SZ.line), maxW: lineW });
          if (c.accent) S.accent(layer, { at, until, x: cx, y });
        } else if (c.stat !== undefined) {
          S.word(layer, { at, until, text: String(c.stat), x: cx, y: Yp(Y.stat), size: c.size ?? sz(SZ.stat), variant: i, maxW: wmax });
          if (c.label) S.line(layer, { at: c.subT, until, text: c.label, x: cx, y: Yp(Y.statL), size: sz(SZ.lineOnly), maxW: lineW });
          if (c.accent) S.accent(layer, { at, until, x: cx, y: Yp(Y.stat) });
          F.info('stat', at, until, { visual: false });   /* one number: counts as one concrete fact, not as "has a visual" */
        } else if (infoKind(c)) {
          F.info(infoKind(c), c.stepsT[0] ?? at, until, { group: `${i}.${k}` });   /* one cue counts as one item: the S.box / S.arrow inside it don't register separately */
          EV.mute(() => info(layer, c, until, R, i));
        } else if (c.raw) {
          // a hand-written part (the style's own components, PROMO.reorder, a UI demo…): draw it into this scene's layer, its time is this cue's at / until;
          //   push { t, x, y } onto foci and the camera follows. Rhythm sheet, measured curve and fact check work as usual
          c.raw(layer, S, { at, until, area: R, F, foci, P, B: F.B });
        } else if (c.line) {
          S.line(layer, { at, until, text: c.line, x: cx, y: Yp(Y.lineOnly), size: c.size ?? sz(SZ.lineOnly), maxW: lineW });
          if (c.accent) S.accent(layer, { at, until, x: cx, y: Yp(Y.lineOnly) });
        } else throw new Error('cue 要有 say / line / list / shot / stat / flow / compare / chart / annotate / diagram / montage / raw 之一：' + JSON.stringify(c));
        if (!infoKind(c) && !c.raw) for (let q = nT; q < F.texts.length; q++) F.texts[q].slogan = true;   // information density check: text of big words, single lines, lists and numbers doesn't count as a "hand-built layout"
      });
      // transition: added after everything in this scene is built (the origami page turn treats the whole scene as one sheet of paper)
      const w = S.wipe({ cover: sc.coverT, out: layer, index: i, heavy: roles[i + 1] === 'drop' });   // heavy: the cut into the landing (launch flashes white only on this one)
      F.info = infoReg;
      for (const [kind, a, b, o2] of pend) F.info(kind, a, Math.min(b ?? 1e9, w.hide), o2);
      F.scene(sc.startT, sc.coverT, { role, name: String(i + 1) });
      const from = prevShow;   // fix this scene's start time (prevShow changes later)
      F.add((tt) => P.set(layer, { display: tt >= from && tt < w.hide ? '' : 'none' }));
      if (!S.board) { const c0 = sc.cues[0]; camera(layer, cams[i], from, w.hide, foci, c0 ? c0.atT : sc.startT, [F.W / 2, c0 && c0.say !== undefined ? H * (c0.line ? Y.sayL : Y.say) : H * 0.42], i % 2 ? -1 : 1); }
      rows.push({ scene: i + 1, role, from: sc.startT, to: sc.coverT, energy, camera: S.board ? '（画板运镜）' : cams[i], kind: kindOfScene(sc), music: [F.voiced ? '' : spec.hit && i > 0 ? '重击' : '', role === 'drop' && !F.voiced && i > 0 ? '急停' : '', !F.voiced && role !== 'burst' && (nextRole === 'burst' || nextRole === 'drop') ? '蓄力' : ''].filter(Boolean).join(' '), variant: sc.variant ?? i });
      prevShow = w.show;
    });
    // ending
    const endL = F.layer('', 50 - n);
    const endDrop = !roles.includes('drop') && !F.voiced;   // no scene is a drop (the fast cut is in the last scene): the ending is the landing
    F.section(scenes[n - 1].coverT, endDrop ? 3 : 1, { name: endDrop ? 'drop' : 'resolve', hit: endDrop, stop: endDrop ? F.B : 0 });
    S.bg(endL, { variant: n });
    const endFrom = prevShow;
    F.add((tt) => P.set(endL, { display: tt >= endFrom ? '' : 'none' }));
    if (!S.board) camera(endL, 'pull', endFrom, F.duration + 1, [], endT);
    S.end(endL, { ...o.end, at: endT });
    F.scene(scenes[n - 1].coverT, F.duration, { end: true, name: 'end' });
    rows.push({ scene: '片尾', role: endDrop ? 'drop' : 'resolve', from: scenes[n - 1].coverT, to: F.duration, energy: endDrop ? 3 : 1, camera: S.board ? '（画板运镜）' : 'pull', kind: 'end', music: endDrop ? '急停 重击' : '', variant: n });
    rhythmLint(rows, scenes);
  }

  P.formats = FORMATS;
  // one call makes a film: work out the timeline → compose → the style's shared API → lay it out by format
  P.film = (o) => {
    const fmt = FORMATS[o.format ?? 'kinetic'];
    if (!fmt) throw new Error(`快速版没有这种讲法：${o.format}（有：${Object.keys(FORMATS).join(' / ')}）`);
    const plan = fmt.plan(o);
    // colours come from the product: brand (brand colour) / accent (second colour) are applied in this style's materials (P.kit.brand); ground ('light' / 'dark' / 'brand') is for styles with several grounds (launch, ASCII)
    const bb = o.brand || o.accent || o.ground ? P.kit.brand(o.style, { brand: o.brand, accent: o.accent, ground: o.ground }) : { theme: P.kit.theme(o.style), kit: {}, color: null };
    const base = bb.theme; window.__brand = { brand: o.brand ?? null, accent: o.accent ?? null, used: bb.color };
    window.__format = o.format ?? 'kinetic';   // information density check: explain = explainer (checked line by line against the narration, no fact counting), anything else = promo
    P.compose({
      bpm: o.bpm ?? 120, offset: o.offset ?? 0.5, duration: o.duration ?? plan.duration, cover: o.cover ?? plan.cover, grain: o.grain ?? false, music: o.music,
      theme: { ...base, ...(o.theme || {}), fonts: { ...base.fonts, ...((o.theme || {}).fonts || {}) } },
      build: async (F) => { const S = P.kit(F, o.style, { ...bb.kit, ...(o.kit || {}) }); await fmt.build(F, S, plan, o); },
    });
    return plan;
  };
})();
