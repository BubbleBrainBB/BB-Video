// promo.js: runtime for website / app promo films. Pure-function animation: the picture depends only on t (window.renderFrame(t)).
// Rhythm is driven by the music's beats: F.beat(n) is the time of beat n. Components register their sound effects (impacts, whooshes, clicks, keys…) and on-screen text (for the automatic checks) themselves.
// One codebase serves both landscape 16:9 and portrait 9:16: sizes go through F.u (short side / 1080), layout branches on F.portrait.
(function () {
  const { clamp, lerp } = window.EV;
  // Message language for the page's checks and warnings: what the render decided (window.__BV_LANG), else the page's <html lang>.
  //   M(中文, English) → the message in that language; style runtimes use PROMO.M
  const M = (zh, en) => ((window.__BV_LANG || (/^zh/i.test(document.documentElement.lang || '') ? 'zh' : 'en')) === 'zh' ? zh : en);
  const E = {
    lin: (q) => q,
    expoOut: (q) => (q >= 1 ? 1 : 1 - Math.pow(2, -10 * q)),
    expoIn: (q) => (q <= 0 ? 0 : Math.pow(2, 10 * q - 10)),
    expoInOut: (q) => (q <= 0 ? 0 : q >= 1 ? 1 : q < 0.5 ? Math.pow(2, 20 * q - 10) / 2 : (2 - Math.pow(2, -20 * q + 10)) / 2),
    quartOut: (q) => 1 - Math.pow(1 - q, 4),
    quartIn: (q) => q * q * q * q,
    cubicInOut: (q) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2),
    backOut: (q) => { const c = 1.6; return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2); },
    sine: (q) => -(Math.cos(Math.PI * q) - 1) / 2,
  };
  // Spring: step response of a damped spring (closed form). f = how many oscillations over the span, z = damping ratio (≥ 0.72 gives only a little overshoot, not cartoony)
  //   E.spring: the default settle (about 4% overshoot); E.springSoft: slower and softer; PROMO.spring(f, z) to tune your own
  const spring = (f = 2.0, z = 0.72) => {
    const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z);
    const step = (x) => (x <= 0 ? 0 : 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + ((z * w) / wd) * Math.sin(wd * x)));
    const end = step(1);
    return (q) => (q <= 0 ? 0 : q >= 1 ? 1 : step(q) / end);
  };
  E.spring = spring(2.0, 0.72);
  E.springSoft = spring(1.3, 0.8);
  const seg = (t, a, b, e = E.lin) => e(clamp((t - a) / (b - a)));
  // Things that change in steps (typing, rolling number text, scramble-decode) take time per frame: the motion-blur sub-frames of one frame all see the same text —
  //   otherwise sub-frames differ by one character and stack into a double cursor or ghosted digits. Use it for your own per-character / per-digit changes too: const tq = PROMO.frameT(t)
  const frameT = (t) => { const fps = (window.__composition && window.__composition.fps) || 30; return Math.round(t * fps) / fps; };
  const f1 = (n) => Math.round(n * 10) / 10;
  function el(tag, css, parent, html) {
    const e = document.createElement(tag);
    e.style.cssText = 'position:absolute;' + (css || '');
    if (html !== undefined) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  // Show text literally (not as html): use it for code and UI text containing < >, or set textContent after el(tag, css, parent)
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Write a style only when the value changed
  // Remember animated elements (position, size or opacity changed); the motion check (motionScan) measures them every frame
  const MOVERS = new Set(), MOTION_KEYS = new Set(['transform', 'opacity', 'left', 'top', 'right', 'bottom', 'width', 'height', 'clipPath']);
  function set(e, props) {
    const c = e._c || (e._c = {});
    for (const k in props) { const v = props[k]; if (c[k] !== v) { c[k] = v; e.style[k] = v; if (!e._mv && MOTION_KEYS.has(k)) { e._mv = 1; MOVERS.add(e); } } }
  }
  function words(container, html, wrapCss = '') {
    const out = [];
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    // Split by word, keeping inline tags such as <i> / <b>
    const walk = (node, wrapTag) => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 3) {
          // Chinese / Japanese have no spaces: one character per chunk (so lines can wrap); punctuation (，。！？、) sticks to the previous character so it never starts a line
          const toks = n.textContent.match(/\s+|[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff][\u3001\u3002\uff0c\uff01\uff1f\uff1b\uff1a\u300d\u300f\uff09\u3011\u2026\u2014]*|[^\s\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]+/g) || [];
          for (const w of toks) {
            if (!w) continue;
            if (/^\s+$/.test(w)) { container.appendChild(document.createTextNode(' ')); continue; }
            const box = document.createElement('span');
            box.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom;padding:0 0.06em 0.16em;margin:0 -0.06em -0.16em;' + wrapCss;
            const inner = document.createElement(wrapTag || 'span');
            inner.style.cssText = 'display:inline-block;will-change:transform';
            inner.textContent = w;
            box.appendChild(inner);
            container.appendChild(box);
            out.push(inner);
          }
        } else if (n.tagName === 'BR') container.appendChild(document.createElement('br'));   // keep manual line breaks
        else walk(n, n.tagName.toLowerCase());
      }
    };
    walk(tmp);
    return out;
  }
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';
  function scramble(text, t, start, o = {}) {
    const per = o.per ?? 0.06, jitter = o.jitter ?? 0.35;
    let out = '';
    for (let i = 0; i < text.length; i++) {
      const t0 = start + i * per;
      if (t < t0 - (o.lead ?? 0.15)) { out += o.hidden ?? ' '; continue; }
      if (t >= t0 + jitter || /\s/.test(text[i])) { out += text[i]; continue; }
      out += GLYPHS[Math.floor(EV.rng(Math.floor(t * 30) * 97 + i)() * GLYPHS.length)];
    }
    return out;
  }
  const rgbSplit = (k, d = 14) => (k < 0.01 ? 'none' : `${(k * d).toFixed(1)}px 0 0 rgba(255,40,60,.75), -${(k * d).toFixed(1)}px 0 0 rgba(0,220,255,.75)`);
  const develop = (q) => `brightness(${lerp(2.6, 1, q).toFixed(3)}) contrast(${lerp(0.35, 1, q).toFixed(3)}) saturate(${lerp(0.1, 1, q).toFixed(3)}) sepia(${lerp(0.5, 0, q).toFixed(3)}) blur(${lerp(5, 0, q).toFixed(2)}px)`;
  const pulse = (t, t0, d = 0.25) => { const q = clamp((t - t0) / d); return q > 0 && q < 1 ? 1 - q : 0; };

  // ---------- Motion quality (the --check "motion sheet") ----------
  // Every frame (30 fps), measure the animated DOM elements: centre, size, effective opacity (motion drawn inside canvas / WebGL does not count). Six things are computed:
  //   ease (linear start / linear stop = no easing at all), camera jolt (a full-frame layer starting or stopping at constant speed, or speed jumping by more than half in one frame mid-move, not on a sound effect), flicker (opacity / position bouncing back and forth in a short time), too fast (a large thing moving too far per frame: it smears and strobes),
  //   how many move at once, duration families (do durations fall into a few fixed values), camera jolt (a full-frame layer suddenly speeding up / slowing down).
  //   The frames either side of a hard cut and the first / last frame of an element are skipped (an entrance may cut in already moving). Thresholds are not yet calibrated on user-reviewed films; see references/review.md.
  function motionScan(F, o = {}) {
    const fps = o.fps ?? 30, sr = F.stage.getBoundingClientRect(), W = F.W, H = F.H, A0 = W * H, TH = { mov: 0.0008, peak: 0.004, abrupt: 0.6, fast: 0.06, cam: 0.006, crowd: 16, ...(o.th || {}) };
    // Fast motion around hard cuts and inside whip / transition blur windows (registered by F.blur) is by design: not counted
    const cuts = [...new Set(F.cuts || [])], blurs = F.blurs || [], nearCut = (f) => cuts.some((c) => Math.abs(c - f / fps) < 2.5 / fps) || blurs.some(([a, b]) => f / fps > a - 2 / fps && f / fps < b + 2 / fps);
    const els = [...MOVERS].filter((e) => e !== F.stage && F.stage.contains(e) && e.dataset.motion !== 'skip' && e.dataset.motion !== 'texture');   // texture layers (grain, noise) are marked data-motion="skip"
    // data-motion="texture": the element's own movement is film texture (gate weave, camera shake); measure what's inside it as if it stood still
    const tex = [...F.stage.querySelectorAll('[data-motion="texture"]')];
    const n = Math.floor(F.duration * fps), tr = els.map(() => new Array(n).fill(null)), ops = els.map(() => new Array(n).fill(null));   // ops: opacity recorded separately (frames at 0 too, so flicker can be measured)
    const effOp = (e) => { let v = 1; for (let m = e; m && m !== F.stage; m = m.parentElement) { if (m.style.display === 'none') return 0; const x = m.style.opacity; if (x !== '') v *= +x; } return v; };
    // For the "stiff" checks (hard pop-in, the same entrance over and over, an empty box waiting for its words): registered text per frame
    //   (visibility, box in H units, content) and each element's first clearly visible frame (box, whether it is an empty panel)
    const txs = (F.texts || []).filter((x) => x.el && x.kind !== 'caption' && !x.chrome && F.stage.contains(x.el));
    const tv = txs.map(() => new Float32Array(n)), tg = txs.map(() => new Array(n).fill(null)), tc = txs.map(() => new Array(n).fill(''));
    const firstVis = els.map(() => null);
    const emptyPanel = (e) => { if ((e.textContent || '').trim() || e.querySelector('img,canvas,video,svg,picture,iframe')) return false; const cs = getComputedStyle(e), a = (cs.backgroundColor.match(/[\d.]+/g) || []).map(Number); return (a.length === 4 ? a[3] : a.length === 3 ? 1 : 0) >= 0.04 || parseFloat(cs.borderTopWidth) > 0 || cs.backgroundImage !== 'none'; };
    // Parts clipped by an ancestor are invisible: find each element's nearest overflow-clipping ancestor once, and measure only the visible area per frame (a full-page screenshot scrolling in a window is not a "camera")
    const clipAnc = els.map((e) => { for (let m = e.parentElement; m && m !== F.stage; m = m.parentElement) { const cs = getComputedStyle(m); if (cs.overflow !== 'visible' || cs.clipPath !== 'none') return m; } return null; });
    for (let i = 0; i < n; i++) {
      F.render(i / fps);
      const held = tex.map((e) => [e, e.style.transform]); for (const [e] of held) e.style.transform = 'none';
      const rc = new Map();
      for (let k = 0; k < els.length; k++) {
        const e = els[k], op = effOp(e); let r = e.getBoundingClientRect();
        const ca = clipAnc[k]; if (ca) { let q = rc.get(ca); if (!q) { q = ca.getBoundingClientRect(); rc.set(ca, q); } const x0 = Math.max(r.left, q.left), y0 = Math.max(r.top, q.top), x1 = Math.min(r.right, q.right), y1 = Math.min(r.bottom, q.bottom); r = { left: r.left, top: r.top, width: r.width, height: r.height, visW: Math.max(0, x1 - x0), visH: Math.max(0, y1 - y0) }; }
        const ar = (r.visW ?? r.width) * (r.visH ?? r.height);
        if (ar >= A0 * 0.002 && r.width) ops[k][i] = op;
        if (op < 0.02 || ar < A0 * 0.0005) continue;
        tr[k][i] = [(r.left - sr.left + r.width / 2) / H, (r.top - sr.top + r.height / 2) / H, Math.sqrt(ar) / H, op, ar / A0, Math.sqrt(r.width * r.height) / H];   // [5] = the full (unclipped) size: the scale children are measured against
        const onA = Math.max(0, Math.min(r.left + r.width, sr.right) - Math.max(r.left, sr.left)) * Math.max(0, Math.min(r.top + r.height, sr.bottom) - Math.max(r.top, sr.top));   // on screen (a sheet waiting off camera on a big world is not shown yet)
        if (!firstVis[k] && op >= 0.5 && ar >= A0 * 0.015 && onA >= A0 * 0.015) firstVis[k] = { f: i, x0: (r.left - sr.left) / H, y0: (r.top - sr.top) / H, x1: (r.left - sr.left + r.width) / H, y1: (r.top - sr.top + r.height) / H, empty: ar < A0 * 0.6 && emptyPanel(e) };
      }
      for (let k = 0; k < txs.length; k++) {
        const e = txs[k].el, op = effOp(e); tv[k][i] = op; if (op < 0.02) continue;
        const r = e.getBoundingClientRect(); tg[k][i] = [(r.left - sr.left + r.width / 2) / H, (r.top - sr.top + r.height / 2) / H, r.width / H, r.height / H];
        // content + the reveal styles on the way up (a clip-path wipe, a mask, a blur coming into focus are entrances the box can't see)
        let fx = ''; for (let m = e; m && m !== F.stage; m = m.parentElement) fx += `${m.style.clipPath}|${m.style.webkitMaskImage || m.style.maskImage || ''}|${m.style.filter};`;
        tc[k][i] = e.textContent + '\n' + fx;
      }
      for (const [e, v] of held) e.style.transform = v;
    }
    // Moving with the parent (camera push-in, a whole window flying in) does not count as moving itself: convert each element to proportional coordinates inside its nearest animated ancestor (x, y, size divided by the parent's size);
    //   movement = change in proportional coordinates × the parent's current size. No such ancestor = measure against the frame directly (sc = 1)
    const idx = new Map(els.map((e, k) => [e, k])), par = els.map((e) => { for (let m = e.parentElement; m && m !== F.stage; m = m.parentElement) if (idx.has(m)) return idx.get(m); return -1; });
    const abs = tr.map((a) => a.slice());
    //   The parent's scale is its full size, not its visible part: a camera box larger than the frame (a big sheet or world) is clipped to the frame, and scaling by the clipped size would make still children look as if they move whenever the camera zooms
    tr.forEach((a, k) => { for (let i = 0; i < n; i++) { const x = abs[k][i]; if (!x) continue; const p = par[k] >= 0 ? abs[par[k]][i] : null, ps = p ? p[5] || p[2] : 0; a[i] = p && ps > 0 ? [(x[0] - p[0]) / ps, (x[1] - p[1]) / ps, x[2] / ps, x[3], x[4], ps] : [x[0], x[1], x[2], x[3], x[4], 1]; } });
    // Camera hits that land on a sound effect (the whole layer shaking as impact text slams down, a push on the downbeat) are by design: a sound within 3 frames means it is not a camera jolt
    const hits = (F.sfxList || []).filter((x) => x.type !== 'type').map((x) => x.t), onHit = (f) => hits.some((h) => Math.abs(h - f / fps) <= 3 / fps);
    // Name: use data-what if the component set one (e.g. "B.slogan 色块", i.e. colour block), plus the text inside; otherwise the text or tag name
    const label = (e) => { const tx = (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24), w = e.dataset && e.dataset.what; return w ? `${w}${tx ? ` "${tx}"` : ''}` : tx ? `"${tx}"` : `<${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''}>`; };
    const out = { start: [], stop: [], flicker: [], jitter: [], fast: [], cam: [] }, moving = new Float32Array(n), durs = [];
    let segN = 0, segPeak = 0;
    // Elements may register "fast here is the medium's real technique" (e._motionOk = [[a, b]…], e.g. a shadow puppet flipping round in one go): not reported in that span
    const okAt = (k, f) => (els[k]._motionOk || []).some(([a, b]) => f / fps >= a - 2 / fps && f / fps <= b + 2 / fps);
    const note = (kind, f, k, extra = '') => { const L = out[kind]; if (okAt(k, f) || L.some((x) => x.k === k && Math.abs(x.t - f / fps) < 1)) return; L.push({ t: Math.round((f / fps) * 100) / 100, k, what: label(els[k]) + extra }); };
    tr.forEach((a, k) => {
      let i = 0;
      while (i < n) {
        if (!a[i]) { i++; continue; }
        let j = i; while (j + 1 < n && a[j + 1]) j++;
        const big = a.slice(i, j + 1).some((x) => x[4] > 0.85), m = new Float32Array(n), mp = new Float32Array(n);   // a full-frame layer = the camera
        for (let f = i + 1; f <= j; f++) { const p = a[f - 1], q = a[f], sc = q[5]; mp[f] = Math.hypot(q[0] - p[0], q[1] - p[1]) * sc; m[f] = mp[f] + Math.abs(q[2] - p[2]) * sc * 0.6; }
        // Motion segments: consecutive moving frames (a single-frame gap still counts as the same segment)
        let f = i + 1;
        while (f <= j) {
          if (m[f] <= TH.mov) { f++; continue; }
          let g = f; while (g + 1 <= j && (m[g + 1] > TH.mov || (g + 2 <= j && m[g + 2] > TH.mov))) g++;
          const L = g - f + 1; let peak = 0; for (let x = f; x <= g; x++) peak = Math.max(peak, m[x]);
          if (!big) { for (let x = f; x <= g; x++) moving[x] += 1; if (L >= 4 && L <= 90) durs.push(L / fps); }
          if (L >= 5 && peak >= TH.peak) {
            segN++;
            // No easing = linear start / linear stop: near top speed from the first frame and still that speed two frames later (impact text decelerating right after landing, or accelerating before landing, is by design and not counted)
            //   Compare thirds: first-third average speed ≈ middle third (± 25%) = linear start; last third ≈ middle = linear stop
            const avg = (x, y) => { let t2 = 0; for (let z = x; z <= y; z++) t2 += m[z]; return t2 / Math.max(1, y - x + 1); }, th3 = Math.floor(L / 3);
            if (L >= 6) {
              const A1 = avg(f, f + th3 - 1), A2 = avg(f + th3, g - th3), A3 = avg(g - th3 + 1, g), same = (u, v) => Math.abs(u - v) <= 0.25 * Math.max(u, v);
              if (f > i + 1 && m[f] >= TH.abrupt * peak && same(A1, A2) && !nearCut(f)) { note(big ? 'cam' : 'start', f, k); segPeak++; }
              if (g < j - 1 && m[g] >= TH.abrupt * peak && same(A3, A2) && !nearCut(g)) note(big ? 'cam' : 'stop', g, k);
            }
          }
          for (let x = f; x <= g; x++) {
            // data-motion="snap": the style's signature move is a sudden snap (colour block shooting out, thick bar growing): not counted as too fast
            if (!big && a[x][4] >= 0.02 && mp[x] > TH.fast && !nearCut(x) && els[k].dataset.motion !== 'snap' && els[k].dataset.motion !== 'exit') note('fast', x, k, M(`（每帧 ${Math.round(mp[x] * H)}px）`, ` (${Math.round(mp[x] * H)}px per frame)`));
            if (big && L >= 6 && x >= f + 2 && x <= g - 2 && !onHit(x) && m[x] - m[x - 1] > TH.cam && m[x] > 2 * m[x - 1] && !nearCut(x) && !nearCut(x - 1)) note('cam', x, k);   // only sudden acceleration counts (ease-out deceleration is by design; abrupt stops are caught by the linear-stop rule)   // camera: speed jumped by more than half in one frame (eased starts / stops never do)
          }
          f = g + 1;
        }
        // Flicker: opacity / position changing back and forth 7+ times in 1 second (more than 3 flashes per second)
        const win = fps, sp = [];   // 1-second window: WCAG's "more than 3 flashes per second" = 7+ reversals in 1 second
        for (let x = i + 1; x <= j; x++) {
          for (const ax of [0, 1]) { const d = (a[x][ax] - a[x - 1][ax]) * a[x][5]; if (Math.abs(d) > 0.002) sp.push([x, Math.sign(d), ax]); }
        }
        const flips = (L2, need, kind) => { for (let q = 0; q < L2.length; q++) { let c = 0; for (let r = q + 1; r < L2.length && L2[r][0] - L2[q][0] <= win; r++) if (L2[r][1] !== L2[r - 1][1] && (L2[r][2] ?? 0) === (L2[r - 1][2] ?? 0)) c++; if (c >= need && !nearCut(L2[q][0])) { note(kind, L2[q][0], k); return; } } };
        flips(sp, 7, 'jitter');
        i = j + 1;
      }
    });
    // Per second: the most elements moving at once (0.5 s smoothing)
    // Flicker: opacity over the whole timeline (including frames at 0), 7+ reversals in 1 second
    ops.forEach((o2, k) => { const so = []; for (let x = 1; x < n; x++) { if (o2[x] === null || o2[x - 1] === null) continue; const d = o2[x] - o2[x - 1]; if (Math.abs(d) > 0.04) so.push([x, Math.sign(d)]); } for (let q = 0; q < so.length; q++) { let c = 0; for (let r = q + 1; r < so.length && so[r][0] - so[q][0] <= fps; r++) if (so[r][1] !== so[r - 1][1]) c++; if (c >= 7 && !nearCut(so[q][0])) { note('flicker', so[q][0], k); break; } } });
    // Too fast: elements mostly clipped by an overflow ancestor (slot machine, counter digit strips) can't be seen moving that fast: not counted
    const clipRatio = (e) => { const r = e.getBoundingClientRect(), ar = r.width * r.height; if (!ar) return 0; let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom; for (let m2 = e.parentElement; m2 && m2 !== F.stage; m2 = m2.parentElement) { const cs = getComputedStyle(m2); if (cs.overflow !== 'visible' || cs.clipPath !== 'none') { const q = m2.getBoundingClientRect(); x0 = Math.max(x0, q.left); y0 = Math.max(y0, q.top); x1 = Math.min(x1, q.right); y1 = Math.min(y1, q.bottom); } } return Math.max(0, x1 - x0) * Math.max(0, y1 - y0) / ar; };
    out.fast = out.fast.filter((x) => { F.render(x.t); return clipRatio(els[x.k]) >= 0.5; });
    // ---- Stiff motion ----
    // Hard pop-in / pop-out: registered text going from hidden to fully shown (or back) in one frame, not on a hard cut or a registered appearance,
    //   and standing dead still for the next ~0.27 s (no move, no scale, no fade, no retyping, no clip / mask / blur reveal, nothing inside it moving): it was switched on, not brought in
    const appears = F.appears || [], nearAppear = (f) => appears.some((a2) => Math.abs(a2 - f / fps) < 2.5 / fps);
    const tlabel = (k) => `"${String(txs[k].text).replace(/\s+/g, ' ').slice(0, 24)}"`;
    const desc = txs.map((x) => els.map((e, m) => (x.el !== e && x.el.contains(e) ? m : -1)).filter((m) => m >= 0));
    const lives = (k, a2, b2) => {
      const g0 = tg[k][a2];
      for (let f = a2; f <= b2; f++) {
        const g = tg[k][f]; if (!g || !g0) return true;
        if (Math.abs(g[0] - g0[0]) > 0.003 || Math.abs(g[1] - g0[1]) > 0.003 || Math.abs(g[2] - g0[2]) > 0.02 * g0[2] + 0.001 || Math.abs(g[3] - g0[3]) > 0.02 * g0[3] + 0.001 || Math.abs(tv[k][f] - tv[k][a2]) > 0.05 || tc[k][f] !== tc[k][a2]) return true;
        for (const m of desc[k]) { const p = abs[m][f], q = abs[m][a2]; if (!p !== !q || (p && (Math.abs(p[0] - q[0]) > 0.003 || Math.abs(p[1] - q[1]) > 0.003 || Math.abs(p[3] - q[3]) > 0.05))) return true; }
      }
      return false;
    };
    const hold = Math.round(fps * 0.27);
    out.pop = []; out.popout = []; out.repeat = []; out.empty = [];
    txs.forEach((x, k) => {
      for (let i = 1; i < n; i++) {
        const a2 = tv[k][i - 1], b2 = tv[k][i], t = Math.round((i / fps) * 100) / 100;
        if (a2 < 0.05 && b2 > 0.85 && !nearCut(i) && !nearAppear(i) && i + hold < n && !lives(k, i, i + hold)) out.pop.push({ t, k, i, what: tlabel(k) });
        if (a2 > 0.85 && b2 < 0.05 && !nearCut(i) && i - 1 - hold >= 0 && !lives(k, i - 1 - hold, i - 1)) out.popout.push({ t, k, i, what: tlabel(k) });
      }
    });
    // A value swapped in place (a UI's selected option, a status word changing) is the UI working, not an entrance: a pop-in where another text popped out on the same spot
    const pair = (x, y) => { const p = tg[y.k][y.i - 1], q = tg[x.k][x.i]; return Math.abs(y.i - x.i) <= 1 && p && q && Math.abs(p[1] - q[1]) < 0.02 && Math.abs(p[0] - q[0]) < (p[2] + q[2]) / 2; };   // same line, overlapping
    const ins = out.pop, outs = out.popout;
    out.pop = ins.filter((x) => !outs.some((y) => pair(x, y))); out.popout = outs.filter((y) => !ins.some((x) => pair(x, y)));
    // The same entrance over and over: a big element's first move after it appears (duration, direction and distance, scale), six or more in a row,
    //   each within 4 s of the last, reads as flipping slides — vary the entrance, move the camera, or gather them into one montage
    //   Pictures and panels only (an image, canvas or video inside, or a background): impact words slamming in one after another are the launch style's own move
    const ent = [], step = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]) + Math.abs(q[2] - p[2]);
    const pictorial = (e) => { if (e.querySelector('img,canvas,video,svg,picture,iframe')) return true; const cs = getComputedStyle(e), a = (cs.backgroundColor.match(/[\d.]+/g) || []).map(Number); return (a.length === 4 ? a[3] : a.length === 3 ? 1 : 0) >= 0.04 || cs.backgroundImage !== 'none'; };
    els.forEach((e, k) => {
      const a2 = abs[k], fa = a2.findIndex((x) => x);
      if (fa < 0 || a2[fa][4] < 0.04 || a2.slice(fa, fa + fps).some((x) => x && x[4] > 0.85) || !pictorial(e)) return;
      let g = fa; while (g + 1 < n && a2[g + 1] && g - fa < fps * 1.5 && !(step(a2[g], a2[g + 1]) <= TH.mov && (!a2[g + 2] || step(a2[g + 1], a2[g + 2]) <= TH.mov))) g++;
      if (g - fa < 4) return;
      const s = a2[fa], z = a2[g];
      ent.push({ f: fa, k, sig: [Math.round(((g - fa) / fps) * 10), Math.round((z[0] - s[0]) / 0.03), Math.round((z[1] - s[1]) / 0.03), Math.round((z[2] / s[2]) * 10)].join(',') });
    });
    // Runs per signature (other entrances in between don't break a run; a window and the picture inside it entering together make two runs over the same span: report one)
    ent.sort((x, y) => x.f - y.f);
    const runs = [];
    for (const sig of new Set(ent.map((x) => x.sig))) {
      const L = ent.filter((x) => x.sig === sig);
      // held about a beat or more each (a rapid-fire run under 0.7 s per picture is a montage, not slides)
      for (let i = 0; i < L.length;) { let j = i; while (j + 1 < L.length && L[j + 1].f - L[j].f <= 4 * fps) j++; if (j - i + 1 >= 6 && (L[j].f - L[i].f) / (j - i) >= 0.7 * fps) runs.push({ a: L[i].f, b: L[j].f, c: j - i + 1, k: L[i].k }); i = j + 1; }
    }
    runs.sort((x, y) => y.c - x.c);
    for (const r of runs) {
      if (out.repeat.some((x) => r.a <= x.b && r.b >= x.a)) continue;
      out.repeat.push({ t: Math.round((r.a / fps) * 100) / 100, k: r.k, a: r.a, b: r.b, what: M(`${label(els[r.k])} 这类进场连用 ${r.c} 次（${(r.a / fps).toFixed(1)}–${(r.b / fps).toFixed(1)}s）`, `${label(els[r.k])}: the same entrance ${r.c} times (${(r.a / fps).toFixed(1)}–${(r.b / fps).toFixed(1)}s)`) });
    }
    // An empty box waiting for its words: a panel (background or border, no text, image or canvas inside) shows 0.45 s or more before the first text inside its area appears
    els.forEach((e, k) => {
      const b = firstVis[k]; if (!b || !b.empty) return;
      let best = null;
      for (let q = 0; q < txs.length; q++) {
        for (let f = b.f; f <= Math.min(n - 1, b.f + 3 * fps); f++) {
          if (tv[q][f] < 0.5 || !tg[q][f]) continue;
          const g = tg[q][f];
          if (g[0] > b.x0 && g[0] < b.x1 && g[1] > b.y0 && g[1] < b.y1 && (ops[k][f] ?? 0) > 0.3 && (!best || f < best.f)) best = { f, q };
          break;
        }
      }
      // Covered by something in front (a sheet waiting under the one on screen) is not shown: hit-test a few points inside the box at its first frame
      const shown = () => {
        const hs = document.createElement('style'); hs.textContent = '#stage, #stage * { pointer-events: auto !important; }'; document.head.appendChild(hs);
        F.render(b.f / fps);
        // what lies on top, ignoring see-through things: texture / blend layers (grain, light leaks), the box's own containers, and big transparent layers
        const glass = (m) => { if (m === e || e.contains(m)) return false; if (m.contains(e) || m.dataset.motion === 'skip' || m.dataset.motion === 'texture') return true; const cs = getComputedStyle(m); if (cs.mixBlendMode !== 'normal' || +cs.opacity < 0.5) return true; const r = m.getBoundingClientRect(), al = (cs.backgroundColor.match(/[\d.]+/g) || []).map(Number); return r.width * r.height >= A0 * 0.85 && (al.length === 4 ? al[3] : al.length === 3 ? 1 : 0) < 0.5 && cs.backgroundImage === 'none' && !m.querySelector(':scope > img, :scope > canvas, :scope > video'); };
        const hit = [[0.5, 0.5], [0.25, 0.3], [0.75, 0.3], [0.25, 0.7], [0.75, 0.7]].some(([u, v]) => { const top = document.elementsFromPoint(sr.left + (b.x0 + (b.x1 - b.x0) * u) * H, sr.top + (b.y0 + (b.y1 - b.y0) * v) * H).find((m) => F.stage.contains(m) && m !== F.stage && !glass(m)); return top && (top === e || e.contains(top)); });
        hs.remove(); return hit;
      };
      if (best && (best.f - b.f) / fps >= 0.45 && shown()) out.empty.push({ t: Math.round((b.f / fps) * 100) / 100, k, what: M(`装 ${tlabel(best.q)} 的框先空了 ${((best.f - b.f) / fps).toFixed(1)} 秒`, `the box for ${tlabel(best.q)} stands empty for ${((best.f - b.f) / fps).toFixed(1)} s`) });
    });
    const sec = Math.ceil(n / fps), perSec = Array.from({ length: sec }, (_, s2) => { let mx = 0; for (let x = s2 * fps; x < Math.min(n, (s2 + 1) * fps); x++) { let a2 = 0, c = 0; for (let y = Math.max(0, x - 7); y <= Math.min(n - 1, x + 7); y++) { a2 += moving[y]; c++; } mx = Math.max(mx, a2 / c); } return Math.round(mx * 10) / 10; });
    const peakSec = perSec.reduce((b, v, s2) => (v > perSec[b] ? s2 : b), 0);
    // Duration families: bucket by 0.1 s
    const fam = {}; for (const d of durs) { const key = (Math.round(d * 10) / 10).toFixed(1); fam[key] = (fam[key] || 0) + 1; }
    const families = Object.entries(fam).sort((x, y) => y[1] - x[1]), top3 = families.slice(0, 3).reduce((s2, x) => s2 + x[1], 0) / Math.max(1, durs.length);
    const issueSec = new Array(sec).fill(0); for (const L of Object.values(out)) for (const x of L) issueSec[Math.min(sec - 1, Math.floor(x.t))]++;
    return { fps, tracks: els.length, segs: segN, durs: durs.length, perSec, peak: { v: perSec[peakSec] ?? 0, t: peakSec }, families: families.slice(0, 5), top3: Math.round(top3 * 100) / 100, issueSec, ...Object.fromEntries(Object.entries(out).map(([kk, L]) => [kk, L.sort((x, y) => x.t - y.t).map(({ t, what }) => ({ t, what }))])), th: TH };
  }

  // ---------- Film ----------
  // F = PROMO.film({ bpm, offset, duration, theme, grain })
  //   theme: { bg, fg, muted, accent, paper, fonts: { display, serif, sans, script } }
  class Film {
    constructor(o) {
      this.stage = o.stage;
      this.W = o.width; this.H = o.height;
      this.portrait = this.H > this.W;
      this.u = Math.min(this.W, this.H) / 1080;
      this.bpm = o.bpm ?? 120;
      this.B = 60 / this.bpm;
      this.offset = o.offset ?? 0;
      this.duration = o.duration;
      // no theme given: the launch style's light ground (same as P.kit.ground('launch', 'light')); dark and brand grounds are chosen per product
      this.theme = { bg: '#F6F5F1', fg: '#141414', muted: '#6B665E', accent: '#2F5BEA', paper: '#FFFFFF', ink: '#141414', ...(o.theme || {}) };
      this.theme.fonts = { display: 'Inter, sans-serif', serif: 'Georgia, serif', sans: 'Inter, -apple-system, "PingFang SC", sans-serif', script: 'cursive', ...((o.theme || {}).fonts || {}) };
      this.fns = [];
      this.sfxList = [];
      this.sections = [];
      this.texts = [];     // { el, kind, text, win: [a, b] } for the automatic checks
      this.stage.style.background = this.theme.bg;
      this.stage.style.fontFamily = this.theme.fonts.sans;
      this.stage.style.color = this.theme.ink;
      if (o.grain !== false) this.add(grain(this, o.grain ?? 0.08));
    }
    beat(n) { return this.offset + n * this.B; }
    // Snap to the nearest beat
    snap(t) { return this.beat(Math.round((t - this.offset) / this.B)); }
    px(n) { return n * this.u; }
    layer(css = '', z = 1, parent) { return el('div', `inset:0;z-index:${z};${css}`, parent || this.stage); }
    add(fn) { this.fns.push(fn); return fn; }
    // Runs last each frame (after every F.add): for components that read other elements' state this frame (e.g. origami copying the paper's content onto each fold face)
    late(fn) { (this.lates ??= []).push(fn); return fn; }
    // Runs once after setup, before waiting for images (may be async): e.g. copying content, precomputing things
    prep(fn) { (this.preps ??= []).push(fn); return fn; }
    // Sound effect: type = impact / whoosh / click / type / pop / tick / riser / boom / shutter
    //   o = { dur action length, dir direction (-1 left / 1 right), size 0–1, pan }: the sound follows the action (length, left-right movement, weight)
    sfx(t, type, gain = 1, o = {}) { this.sfxList.push({ t: Math.round(t * 1000) / 1000, type, gain, ...o }); }
    // Music section: energy 0 (pad only) … 3 (full drum kit); hit: a heavy hit at the start of the section
    //   gap: seconds of silence before the section starts (e.g. 0.25), so the hit lands harder
    //   build: true = the section goes from muffled to bright (low-pass opening, building up); stop: seconds = before the start the music slows to a halt like tape, rests, then slams back in on the beat
    //   hush: true = the gap is full silence (a trailer's pre-title beat), not just the music pulled far down; the checks accept it (F.hush)
    section(at, energy, o = {}) { this.sections.push({ at, energy, hit: !!o.hit, gap: o.gap || 0, hush: !!o.hush, name: o.name || '', build: !!o.build, stop: o.stop || 0 }); this.sections.sort((a, b) => a.at - b.at); if (o.hush && o.gap) this.hush(at - o.gap, at); }
    // A deliberate silence [a, b] (a trailer's beat before the title, a held breath): the phone-speaker check and the dead-air check leave it alone. Keep it short (≤ 1 s)
    hush(a, b) { (this.hushes ??= []).push([a, b]); }
    // Register on-screen text (automatic checks: fact check, overlap, reading time)
    //   text may be html with <i> / <b>: the fact check uses the text with tags stripped
    // o.overlap: true = this text deliberately sits on top of something (collaborator cursor name flags, dragged blocks), skip the overlap check; o.noFact: true = decorative text (VS), skip the fact check
    text(el, kind, text, a, b, o = {}) {
      let t = text ?? el.textContent;
      // Strip tags only when it is really shown as html (code shown literally on screen, like "<Section>", stays as is)
      if (/<\/?[a-z][^>]*>/i.test(t) && el.children.length && !el.textContent.includes('<')) { const d = document.createElement('div'); d.innerHTML = t; t = d.textContent; }
      this.texts.push({ el, kind, text: t, raw: text, win: [a, b], overlap: !!o.overlap, noFact: !!o.noFact, chrome: !!o.chrome, bleed: !!o.bleed });   // noFact: decorative layout text (VS, numbering), no fact check; chrome: small UI furniture (a HUD chip, a source tag) — meant to be small, so it alone never counts as "text nobody can read"; bleed: poster type deliberately cropped by the frame edge (swiss), not reported as clipped or too near the edge
    }
    // Register a "line" (ring edge, thin bar, arrow shaft): fn() returns { pts: [[x, y]…] (frame px, the line's centreline), w: line width px } or null;
    //   the check warns when a line crosses visible text (large solid backgrounds are not registered — text on a colour block is intended; the contrast check handles that)
    stroke(el, fn, a = 0, b = 1e9) { (this.strokes ??= []).push({ el, fn, a, b }); }
    // Register a transition [a, b] (full-screen wedge, big circle, colour band sweep): the film check won't report big changes in it as "sudden jumps", and --sheet avoids it when picking frames
    transition(a, b) { (this.transitions ??= []).push([a, b]); }
    // Register a hard cut (one picture instantly replaced by another): motion blur won't blend the two pictures across it
    // Music follows the picture: musicCue(t, 'hit' | 'name' | 'stop' | 'off') — hit = a musical accent at this moment; name = product name appears (melody enters here, drums drop out the beat before);
    //   stop = music almost stops the beat before and slams back here; off = the signal is cut: the music stops dead here (no ending chord, no sound logo). Hard cuts, impact sfx, logo / end-card names are registered automatically; add the key moments of a hand-written film yourself
    musicCue(t, kind = 'hit') { (this.cues ??= []).push({ t: Math.round(t * 1000) / 1000, kind }); }
    cut(t) { (this.cuts ??= []); if (!this.cuts.some((c) => Math.abs(c - t) < 1e-3)) this.cuts.push(t); }
    // Register an "intended appearance": something appears whole at this moment (e.g. the first frame of paper dropping into view from above). The film check won't report it as a "sudden jump";
    //   unlike cut: it need not be on the beat, and motion blur still blends as usual
    appear(t) { (this.appears ??= []).push(t); }
    // How long the picture may hold completely still before the frame check calls it frozen (default 0.6 s). A style whose medium
    //   holds still between moves (pixel art steps in whole cells at 2–4 fps) raises it; the dead-air check (≥ 1.2 s) still applies
    stillMax(sec) { this._stillMax = Math.max(this._stillMax ?? 0.6, sec); }
    // The cover frame (out/cover.png, the thumbnail) chosen by a style component (e.g. lumen's L.cover); compose's own cover option wins
    coverAt(t) { this._coverAt = t; }
    // Default motion-blur sub-frames for the final render (promo default 6). A style whose camera only pushes slowly (archive photos, a newsreel)
    //   sets 1: every frame is rendered once, which matters when the page is heavy (film damage). Spans registered with F.blur still get theirs
    blurBase(n) { this._blurBase = n; }
    // A third-party asset shown in the film (photo, footage, music, font): { title, author, licence, url, date, file }. The render writes
    //   out/CREDITS.txt from these; a style's end card can roll them. Media from footage.mjs carry this in the manifest (credit), and photo
    //   components register it themselves
    credit(c) { if (!c) return; const L = (this.credits ??= []); const k = c.url || c.file || c.title; if (!L.some((x) => (x.url || x.file || x.title) === k)) L.push(c); }
    // Fast motion in this span: motion blur uses n sub-frames (the default 6 would stack into separate ghost copies)
    // Footage plays in [a, b] (a film clip, a screen recording): the picture itself is the action, so the no-new-action / dead-air checks leave it alone.
    //   Only for footage that really moves — a held shot of a still subject is still a gap
    live(a, b) { (this.lives ??= []).push([a, b]); }
    blur(a, b, n = 16) { (this.blurs ??= []).push([a, b, n]); }
    // At the start of each frame swap Math.random for a time-seeded version: random effects in animation libraries (scrambled text etc.) render the same every time
    // If a per-frame function returns a Promise (canvas styles drawing after image decode, e.g. the ink handscroll): this frame waits for them all before the screenshot
    render(t) { Math.random = EV.rng(Math.round(t * 1000) + 7); let ps = null; for (const f of this.fns) { const r = f(t); if (r && r.then) (ps ??= []).push(r); } for (const f of this.lates || []) f(t); return ps ? Promise.all(ps) : undefined; }
    // Checks from other engines (the explainer boards: whiteboard, riso, ink) merged into the film's automatic checks
    addLint(fn) { (this.lints ??= []).push(fn); }
    // Register text for the fact check only (text written on a board: the board does its own geometry checks)
    //   a / b: appear and disappear times (for the review data sheet and the dead-air check: newly written text needs time to be read)
    fact(text, a, b = 1e9) { if (text) { (this.facts ??= []).push(String(text)); if (a !== undefined) (this.factWins ??= []).push({ text: String(text), kind: 'board', a, b }); } }
    // Information density check: register what carries information on screen (a–b seconds). kind = flow / compare / chart / annotate / diagram / box / arrow / mark / bars / shape / ui / a name of your own.
    //   Generic APIs (S.box, S.steps, S.figures, S.shot…) and quick-mode cues register automatically; hand-written components (your own flowchart, a close-up of a real UI) add one line themselves
    //   o.group: one group counts as one thing; o.visual: false = only counts towards the fact count (a list)
    info(kind, a, b, o) { EV.info(kind, a, b, o); }
    // Register a scene (a–b seconds; o.role, o.end: true = end card): the density check looks per scene. Quick mode registers automatically; hand-written films without it are read by F.section
    scene(a, b, o) { EV.scene(a, b, o); }
  }
  function grain(F, opacity) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 1.2 -.1'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
    const g = el('div', `inset:-64px;pointer-events:none;mix-blend-mode:overlay;opacity:${opacity};background-image:url("data:image/svg+xml,${encodeURIComponent(svg)}");z-index:900`, F.stage);
    g.dataset.motion = 'skip';   // grain jumping 12 times a second is texture, not motion: the motion check skips it
    return (t) => { const k = Math.floor(t * 12), r = EV.rng(k)(), r2 = EV.rng(k + 99)(); set(g, { transform: `translate(${Math.round(r * 64 - 32)}px,${Math.round(r2 * 64 - 32)}px)` }); };
  }

  // ---------- Text ----------
  // Impact text: one word per beat slamming down (with red/blue offset), optional subtitle line
  // o: { at, every (default one beat), items: [{ text, sub }], size, color, subColor, font, subFont, y, rgb }
  function slam(F, parent, o) {
    const every = o.every ?? F.B, size = F.px(o.size ?? 230);
    const items = o.items.map((it, i) => {
      const t0 = o.at + i * every, t1 = t0 + every;
      // The box extends one frame-width on each side: text wider than the frame (long Chinese sentences) still centres, then fit scales it back into the frame (with only the frame width, overflow spills out the left and ends up off to the right after scaling)
      const box = el('div', `left:${-F.W}px;width:${3 * F.W}px;top:${o.y ?? (F.H / 2 - size * 0.75)}px;text-align:center;display:none`, parent);
      const big = el('div', `position:relative;display:inline-block;font:${o.weight ?? 800} ${size}px/1 ${o.font ?? F.theme.fonts.display};letter-spacing:-.04em;color:${o.color ?? F.theme.fg};white-space:nowrap`, box, it.text);
      const sub = it.sub ? el('div', `position:relative;margin-top:${F.px(26)}px;font:italic ${F.px(o.subSize ?? 60)}px ${o.subFont ?? F.theme.fonts.serif};color:${o.subColor ?? F.theme.accent}`, box, it.sub) : null;
      F.sfx(t0, 'impact', o.sfxGain ?? 0.9, { size: 0.8 });
      F.text(big, 'slam', it.text, t0, t1);
      if (sub) F.text(sub, 'slam-sub', it.sub, t0, t1);
      // Shrink over-long words so they stay inside the frame
      return { t0, t1, box, big, sub };
    });
    F.add((t) => items.forEach((v) => {
      const on = t >= v.t0 && t < v.t1;
      set(v.box, { display: on ? '' : 'none' });
      if (!on) return;
      // Include the 1.3× of the slam; a measurement of 0 (outer layer still hidden this frame) is not remembered, measure again next frame
      if (!v.fit && v.big.scrollWidth > 1) { const w = v.big.scrollWidth * 1.3, maxW = o.maxW ?? F.W * 0.94; v.fit = w > maxW ? maxW / w : 1; }
      const k = 1 - seg(t, v.t0, v.t0 + 0.28, E.expoOut);
      set(v.big, { transform: `scale(${((1 + 0.3 * k) * (v.fit || 1)).toFixed(4)})`, textShadow: o.rgb === false ? 'none' : rgbSplit(k, F.px(14)) });
      if (v.sub) set(v.sub, { opacity: String(seg(t, v.t0 + 0.08, v.t0 + 0.25)) });
    }));
    return items;
  }
  // Scramble-decode into a word (logo, product name)
  function decode(F, parent, o) {
    const size = F.px(o.size ?? 190);
    const e = el('div', `left:0;right:0;top:${o.y ?? F.H / 2 - size / 2}px;text-align:center;font:${o.weight ?? 800} ${size}px/1 ${o.font ?? F.theme.fonts.display};letter-spacing:${o.spacing ?? '.18em'};color:${o.color ?? F.theme.fg};white-space:nowrap;display:none`, parent);
    F.text(e, 'decode', o.text, o.at, o.until);
    F.sfx(o.at, 'riser', 0.5);
    F.add((t) => {
      const on = t >= o.at && t < o.until;
      set(e, { display: on ? '' : 'none' });
      if (!on) return;
      const txt = scramble(o.text, frameT(t), o.at + 0.05, { per: o.per ?? 0.08, jitter: 0.4 });
      if (e.textContent !== txt) e.textContent = txt;
      let k = 0; for (const p of o.pulses || []) k = Math.max(k, pulse(t, p));
      set(e, { transform: `scale(${(1 + 0.04 * k).toFixed(4)})`, textShadow: rgbSplit(k * 0.6, F.px(14)) });
    });
    return e;
  }
  // Headline: words float up one by one, slide away upward at until. html may contain <i>
  function headline(F, parent, o) {
    const size = F.px(o.size ?? 62);
    const d = el('div', `left:${o.x ?? 0}px;right:${o.right ?? 0}px;top:${o.y ?? F.px(38)}px;text-align:${o.align ?? 'center'};font:${o.weight ?? 400} ${size}px/1.2 ${o.font ?? F.theme.fonts.serif};color:${o.color ?? F.theme.ink}`, parent);
    const ws = words(d, o.html);
    const st = Math.min(o.stagger ?? 0.06, 0.6 / Math.max(1, ws.length)), dur = o.dur ?? 0.7;   // whole-line stagger capped at 0.6 s (Chinese is one chunk per character; more chunks must not drag on)
    F.text(d, 'headline', d.textContent, o.at, o.until);
    F.add((t) => ws.forEach((w, i) => {
      const q = seg(t, o.at + i * st, o.at + i * st + dur, E.expoOut);
      const so = Math.min(st * 0.5, 0.06 / Math.max(1, ws.length - 1)), x = o.until !== undefined ? seg(t, o.until + i * so, o.until + i * so + 0.5, E.expoIn) : 0;   // exit almost together (at most 0.06 s stagger across the line): fully gone within 0.56 s after until
      set(w, { transform: `translateY(${((1 - q) * 115 - x * 115).toFixed(2)}%)` });
    }));
    return d;
  }
  // Slot machine: a string of words rolls past (one every `every` seconds), stopping on the last
  function slot(F, parent, o) {
    const size = F.px(o.size ?? 62), lh = size * 1.3;
    const box = el('div', `left:${o.x ?? 0}px;right:${o.right ?? 0}px;top:${o.y ?? F.px(38)}px;height:${lh}px;overflow:hidden;display:none`, parent);
    const items = o.items.map((s) => el('div', `left:0;right:0;top:0;text-align:${o.align ?? 'center'};font:${o.style ?? 'italic'} ${size}px/${lh}px ${o.font ?? F.theme.fonts.serif};color:${o.color ?? F.theme.ink};white-space:nowrap`, box, s));
    F.text(box, 'slot', o.items.join(' / '), o.at, o.until);
    o.items.forEach((_, i) => F.sfx(o.at + i * o.every, 'tick', 0.35));
    F.add((t) => {
      const on = t >= o.at && t < (o.until ?? 1e9);
      set(box, { display: on ? '' : 'none' });
      if (!on) return;
      items.forEach((e, i) => {
        const t0 = o.at + i * o.every, last = i === items.length - 1;
        const q = i === 0 ? seg(t, t0, t0 + 0.18, E.expoOut) : seg(t, t0, t0 + 0.18, E.expoInOut);
        const x = last ? 0 : seg(t, t0 + o.every, t0 + o.every + 0.18, E.expoInOut);
        set(e, { transform: `translateY(${((1 - q) * 100 - x * 100).toFixed(2)}%)` });
      });
    });
    return box;
  }
  // Number roll: el's text rolls from `from` to `to` (format for custom formatting)
  function counter(F, e, o) {
    const fmt = o.format || ((v) => Math.round(v).toLocaleString('en-US'));
    F.text(e, 'counter', fmt(o.to), o.at, o.until ?? 1e9);
    if (o.sfx !== false) F.sfx(o.at + o.dur * 0.8, 'tick', 0.3); // one tick when it stops (ticking every frame is too noisy)
    F.add((t0) => {
      const t = frameT(t0);
      if (t < o.at - 0.01) { if (e.textContent !== (o.before ?? '')) e.textContent = o.before ?? ''; return; }
      const v = lerp(o.from ?? 0, o.to, seg(t, o.at, o.at + o.dur, o.ease ?? E.expoOut));
      const s = fmt(v);
      if (e.textContent !== s) e.textContent = s;
    });
  }
  // Odometer: a string of digits rolls into place digit by digit (stopping left to right, with a little bounce). value is shown as is, e.g. "358,304,891", "$4.59"
  // o: { at, dur, value, size, font, color, x, y, align: 'center' | 'left', stagger }
  function odometer(F, parent, o) {
    const size = F.px(o.size ?? 150), h = size * 1.15;
    const box = el('div', `left:${o.x ?? 0}px;${o.align === 'left' ? '' : 'right:0;'}top:${o.y ?? 0}px;height:${h}px;text-align:${o.align ?? 'center'};font:${o.weight ?? 500} ${size}px/${h}px ${o.font ?? F.theme.fonts.mono ?? 'monospace'};color:${o.color ?? F.theme.ink};white-space:nowrap;font-variant-numeric:tabular-nums`, parent);
    const cols = [];
    for (const ch of String(o.value)) {
      if (/\d/.test(ch)) {
        const win = el('span', `position:relative;display:inline-block;height:${h}px;overflow:hidden;vertical-align:top`, box);
        const strip = el('span', 'position:relative;display:block', win, Array.from({ length: 20 }, (_, i) => `<span style="display:block;height:${h}px">${i % 10}</span>`).join(''));
        cols.push({ strip, d: Number(ch) });
      } else el('span', 'position:relative;display:inline-block', box, ch);
    }
    F.text(box, 'counter', String(o.value), o.at, o.until ?? 1e9);
    const st = o.stagger ?? 0.07, dur = o.dur ?? 1.2;
    cols.forEach((c, i) => F.sfx(o.at + i * st + dur * 0.85, 'tick', 0.25));
    F.add((t) => {
      // Hidden before its time and after it disappears (otherwise it would show early as 000,000,000)
      const on = t >= o.at - 0.05 && t < (o.until ?? 1e9);
      set(box, { display: on ? '' : 'none', opacity: String(seg(t, o.at - 0.05, o.at + 0.15)) });
    });
    F.add((t) => cols.forEach((c, i) => {
      const q = seg(t, o.at + i * st, o.at + i * st + dur, E.backOut);
      // Spin one full turn (10 steps) first, then stop on the target digit
      const pos = lerp(0, 10 + c.d, q);
      set(c.strip, { transform: `translateY(${f1(-pos * h)}px)` });
    }));
    return box;
  }
  // Typing: types text into el character by character, optional cursor and character counter
  function typing(F, e, text, o) {
    const T0 = (t) => frameT(t);
    const n0 = Math.min(Math.ceil(text.length / 6), Math.ceil(o.dur * 12)); // key sounds at most 12 per second, so fast typing of long text doesn't smear into a blur
    for (let i = 0; i < n0; i++) F.sfx(o.at + (i * o.dur) / n0, 'type', 0.3);
    F.add((t0) => {
      const t = T0(t0);
      const n = Math.round(text.length * seg(t, o.at, o.at + o.dur));
      const caret = o.caret !== false && t > o.at - 0.1 && t < o.at + o.dur + 0.4 && Math.floor(t * 4) % 2 ? '|' : '';
      const s = text.slice(0, n) + caret;
      if (e.textContent !== s) e.textContent = s;
      if (o.counter) { const c = o.counterFormat ? o.counterFormat(n) : String(n); if (o.counter.textContent !== c) o.counter.textContent = c; }
    });
    F.text(e, 'typing', text, o.at, o.until ?? 1e9);
  }
  // Input field (chat input bar, search box, form field): placeholder and typed text sit on the field's centreline; long text wraps and the field grows upward (bottom edge fixed, like a real input bar),
  //   scrolling up past maxLines. Icons / buttons on either side are pinned to the last line's height. All sizes in px (convert with F.px in the frame; use the phone's logical size inside a phone)
  //   o: { x, y, w, h (single-line height), size (font size), lh (line height, default 1.35×), weight, font, color, muted, bg, line (border colour), lineW, radius,
  //        pad: [left, right] (text inset from each side, default h/2 each; computed when left / right are given), left / right: html (icons, send button),
  //        placeholder, text, at, dur, until (typing timing, as in typing), maxLines (default 4), grow: 'up' | 'down' (default up) }
  //   → { box, text, placeholder, height(t) }
  function field(F, parent, o) {
    const size = o.size ?? 16, lh = o.lh ?? Math.round(size * 1.35), h = o.h ?? lh + size, r = o.radius ?? h / 2, maxL = o.maxLines ?? 4, up = (o.grow ?? 'up') === 'up';
    const pl = o.pad?.[0] ?? h / 2, pr = o.pad?.[1] ?? h / 2, vp = (h - lh) / 2, ff = `${o.weight ?? 400} ${size}px/${lh}px ${o.font ?? F.theme.fonts.sans}`;
    const box = el('div', `left:${f1(o.x)}px;top:${f1(o.y)}px;width:${f1(o.w)}px;height:${f1(h)}px;border-radius:${f1(r)}px;background:${o.bg ?? '#FFFFFF'};box-shadow:inset 0 0 0 ${o.lineW ?? 1.5}px ${o.line ?? 'rgba(0,0,0,.12)'};overflow:hidden`, parent);
    const port = el('div', `left:${f1(pl)}px;right:${f1(pr)}px;top:${f1(vp)}px;bottom:${f1(vp)}px;overflow:hidden`, box);
    const ph = el('div', `left:0;right:0;top:0;height:${lh}px;font:${ff};color:${o.muted ?? 'rgba(0,0,0,.45)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, port);
    ph.textContent = o.placeholder ?? '';
    const tx = el('div', `left:0;right:0;top:0;font:${ff};color:${o.color ?? F.theme.ink};white-space:pre-wrap;overflow-wrap:break-word`, port);
    // Icons / buttons: vertically centred on the last line (h/2 up from the field's bottom)
    for (const [side, html] of [['left', o.left], ['right', o.right]]) if (html) el('div', `${side}:0;bottom:0;width:${f1(side === 'left' ? pl : pr)}px;height:${f1(h)}px;display:flex;align-items:center;justify-content:center`, box, html);
    if (o.text) typing(F, tx, o.text, { at: o.at, dur: o.dur ?? Math.max(0.6, o.text.length / 40), until: o.until, caret: o.caret });
    const t0 = o.text ? o.at - 0.05 : 1e9, t1 = o.until ?? 1e9;
    let H = h;
    F.add((t) => {
      const typingNow = t >= t0 && t < t1;
      set(ph, { opacity: typingNow ? '0' : '1' }); set(tx, { opacity: typingNow ? '1' : '0' });
      const lines = typingNow ? Math.max(1, Math.round(tx.scrollHeight / lh)) : 1, n = Math.min(lines, maxL);
      H = h + (n - 1) * lh;
      set(box, { height: `${f1(H)}px`, top: `${f1(up ? o.y - (H - h) : o.y)}px` });
      set(tx, { transform: `translateY(${f1(-(lines - n) * lh)}px)` });   // past maxLines: scroll up, the last line stays in the field
    });
    return { box, text: tx, placeholder: ph, height: () => H };
  }

  // ---------- UI ----------
  // Browser window: returns { win, view, P(x, y) }; P maps content coordinates to rig coordinates (= screen coordinates when the camera is still)
  function browser(F, parent, o) {
    const bar = F.px(o.bar ?? 44);
    const win = el('div', `left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h + bar}px;border-radius:${F.px(14)}px;overflow:hidden;background:${o.bg ?? '#fff'};box-shadow:0 ${F.px(60)}px ${F.px(120)}px rgba(20,15,10,.3),0 ${F.px(10)}px ${F.px(24)}px rgba(20,15,10,.14);transform-origin:50% 60%`, parent);
    const dot = F.px(13);
    el('div', `left:0;top:0;right:0;height:${bar}px;background:${o.chrome ?? '#EDE9E2'};border-bottom:1px solid rgba(0,0,0,.08)`, win,
      `<div style="position:absolute;left:${F.px(18)}px;top:${(bar - dot) / 2}px;display:flex;gap:${F.px(8)}px"><i style="width:${dot}px;height:${dot}px;border-radius:50%;background:#e0685e"></i><i style="width:${dot}px;height:${dot}px;border-radius:50%;background:#e8b64c"></i><i style="width:${dot}px;height:${dot}px;border-radius:50%;background:#6cbf5b"></i></div><div style="position:absolute;left:50%;top:${bar * 0.2}px;transform:translateX(-50%);width:${Math.min(o.w * 0.4, F.px(440))}px;height:${bar * 0.6}px;border-radius:${F.px(7)}px;background:#fff;font:${F.px(14)}px Inter,sans-serif;color:#6d665a;text-align:center;line-height:${bar * 0.6}px">${o.url ?? ''}</div>`);
    const view = el('div', `left:0;top:${bar}px;width:${o.w}px;height:${o.h}px;overflow:hidden`, win);
    return { win, view, P: (x, y) => [o.x + x, o.y + bar + y], w: o.w, h: o.h };
  }
  // Phone frame (for portrait): h is the screen height, width at 19.5:9
  function phone(F, parent, o) {
    const h = o.h, w = o.w ?? Math.round(h * 0.4615), b = F.px(o.bezel ?? 14), r = F.px(o.radius ?? 64);
    const x = o.x ?? (F.W - w) / 2 - b, y = o.y ?? (F.H - h) / 2 - b;
    const frame = el('div', `left:${x}px;top:${y}px;width:${w + 2 * b}px;height:${h + 2 * b}px;border-radius:${r}px;background:#111;box-shadow:0 ${F.px(60)}px ${F.px(120)}px rgba(0,0,0,.35);transform-origin:50% 60%`, parent);
    const view = el('div', `left:${b}px;top:${b}px;width:${w}px;height:${h}px;border-radius:${r - b}px;overflow:hidden;background:${o.bg ?? '#fff'}`, frame);
    el('div', `left:50%;top:${F.px(12)}px;width:${F.px(110)}px;height:${F.px(32)}px;margin-left:${-F.px(55)}px;border-radius:${F.px(20)}px;background:#111;z-index:50`, view);
    return { win: frame, view, P: (px, py) => [x + b + px, y + b + py], w, h };
  }
  // A video playing in place (a screen recording, a sample film, licence-clean footage): put the video in assets/src/ and run
  //   node explainer/scripts/assets.mjs <project> (→ a JPEG sequence at the source's own rate, at most 30 fps; the page loads assets/manifest.js).
  //   PROMO.clip(F, parent, key, { a, b, from, to, rate, loop, fit, x, y, w, h }) → the <img>: fills parent (a browser / phone view, a card) or the x/y/w/h box,
  //   object-fit `fit` (default cover); plays from `from` at `rate` between a and b, holds the last frame if the shot outlasts the clip (loop: true wraps).
  //   The playing counts as action (F.live) and as a 'clip' information picture; a credit in the manifest goes to the end roll and CREDITS.txt
  function clip(F, parent, key, o = {}) {
    const c = (window.MEDIA_ASSETS && window.MEDIA_ASSETS.clips && window.MEDIA_ASSETS.clips[key]) || null;
    if (!c) throw new Error(M(`PROMO.clip：assets/manifest.js 里没有视频片段 "${key}"（视频放进 assets/src/，跑 node explainer/scripts/assets.mjs <项目>；页面要加载 <script src="assets/manifest.js">）`, `PROMO.clip: no clip "${key}" in assets/manifest.js (put the video in assets/src/, run node explainer/scripts/assets.mjs <project>; the page must load <script src="assets/manifest.js">)`));
    const a = o.a ?? 0, b = o.b ?? F.duration, rate = o.rate ?? 1, last = (c.frames - 1) / c.fps, from = o.from ?? 0, to = Math.min(o.to ?? last, last), runs = (to - from) / rate;
    const box = o.w ? `left:${o.x ?? 0}px;top:${o.y ?? 0}px;width:${o.w}px;height:${o.h}px` : 'left:0;top:0;width:100%;height:100%';
    const img = el('img', `${box};object-fit:${o.fit ?? 'cover'};display:none`, parent);
    if (!o.loop && b - a > runs + 0.1) console.warn(M(`PROMO.clip：片段 "${key}" 在 ${(a + runs).toFixed(1)}s 放完，到 ${b.toFixed(1)}s 才收：最后一格会定住（缩短、调慢 rate 或 loop: true）`, `PROMO.clip: clip "${key}" runs out at ${(a + runs).toFixed(1)}s but stays until ${b.toFixed(1)}s: its last frame holds (shorten, slow the rate or loop: true)`));
    let cur = '';
    F.add((t) => {
      const on = t >= a && t < b; set(img, { display: on ? '' : 'none' }); if (!on) return;
      const run = Math.max(0, t - a) * rate, ct = o.loop ? from + (run % Math.max(1 / c.fps, to - from)) : Math.min(to, from + run);
      const url = `assets/clips/${key}/${String(Math.min(c.frames, Math.floor(ct * c.fps + 1e-6) + 1)).padStart(4, '0')}.jpg`;
      if (url === cur) return;
      cur = url; img.src = url;
      return img.decode().catch(() => {});   // the screenshot waits for this frame's picture
    });
    if (c.credit) F.credit({ ...c.credit, file: `clips/${key}` });
    F.info('clip', a, b);
    F.live(a, o.loop ? b : Math.min(b, a + runs));
    return img;
  }
  // ---------- UI demo: the window stays put, the page inside it is pushed in ----------
  // PROMO.screen(F, parent, o): real screenshots in a browser window (landscape) / phone (portrait, when the screenshot is portrait); the camera pushes in only on the page inside the window —
  //   the window and the headline above stay still; the page edges are clamped when pushing in so no blank shows; the spotlight (rest dimmed) and cursor live in the page and scale with it.
  //   o.src or o.shots: [{ src, from }] (several screenshots switched over time, e.g. the next page after a click)
  //   o.device: 'auto' (default: phone for screenshots whose filename has mobile / phone in a portrait film, browser otherwise) | 'browser' | 'phone'; o.url the address-bar text
  //   o.x, o.y: window centre; o.w: page width in the browser (default 72% of frame width, 90% in portrait); o.h: visible height (default 16:10; longer pages only show when pushing in / scrolling down)
  //   o.at: window settled (floats up tilted 0.5 s earlier); o.until: fully gone
  //   o.zoom: [{ at, dur, to: { x, y, w, h } | 'all', max }]  at `at` push in on this region (proportions 0–1 of the screenshot, or screenshot pixels), max = maximum zoom (default 3); 'all' pulls back to the whole
  //   o.spot: [{ at, until, box: { x, y, w, h } }]  spotlight: this region bright, the rest dimmed (soft edge, no frame); the light glides between consecutive regions
  //   o.cursor: [{ at, x, y, click }]  cursor (proportions of the screenshot); click: true clicks at `at`
  //   → { win, view, content, box (the page's position on screen inside the window), at(fx, fy) → the screen coordinate of this page point when not zoomed }
  function screen(F, parent, o) {
    const PT = F.portrait, shots = o.shots ?? [{ src: o.src, from: 0 }], cx = o.x ?? F.W / 2, cy = o.y ?? F.H * (PT ? 0.46 : 0.52);
    const until = o.until ?? 1e9, a0 = o.at - 0.5;
    // Screenshot size needs the image loaded (F.prep); lay out at 16:10 first, fix once loaded
    let iw = 1600, ih = 1000;
    const dev = o.device ?? 'auto';
    const usePhone = dev === 'phone' || (dev === 'auto' && PT && /phone|mobile/i.test(shots[0].src));   // auto: portrait film + mobile screenshot (capture.mjs's mobile capture) uses the phone frame, otherwise the browser
    let fr, inset = 0;
    if (usePhone) { const h = o.h ?? F.H * 0.62; fr = phone(F, parent, { h, x: cx - Math.round(h * 0.4615) / 2 - F.px(14), y: cy - h / 2 - F.px(14) }); inset = F.px(54); }
    else { const w = o.w ?? F.W * (PT ? 0.9 : 0.72), h = o.h ?? Math.min(w * 0.625, F.H * (PT ? 0.5 : 0.66)), bar = F.px(44); fr = browser(F, parent, { x: cx - w / 2, y: cy - (h + bar) / 2, w, h, url: o.url ?? '' }); }
    const VW = fr.w, VH = fr.h - inset, view = fr.view;
    if (inset) el('div', `left:0;top:0;right:0;height:${f1(inset)}px;background:#fff;z-index:40`, view);   // the phone's status bar at the top (with the Dynamic Island), page below it
    const port = el('div', `left:0;top:${f1(inset)}px;width:${f1(VW)}px;height:${f1(VH)}px;overflow:hidden`, view);
    const content = el('div', `left:0;top:0;width:${f1(VW)}px;height:${f1(VH)}px;transform-origin:0 0`, port);
    let CH = VW * 0.625;
    const imgs = shots.map((sh, j) => { const im = el('img', `left:0;top:0;width:${f1(VW)}px;display:${j ? 'none' : ''}`, content); im.src = sh.src; if (j && sh.from) F.cut(sh.from); return im; });
    const px = (v, L) => (v <= 1.0001 ? v * L : (v / iw) * L);   // proportion or screenshot pixels → px on the page
    F.prep(async () => { try { await imgs[0].decode(); } catch {} iw = imgs[0].naturalWidth || iw; ih = imgs[0].naturalHeight || ih; CH = (VW * ih) / iw; set(content, { height: `${f1(CH)}px` }); for (const im of imgs) set(im, { height: `${f1(CH)}px` }); fillCursor(); });
    F.add((t) => { let cur = 0; shots.forEach((sh, j) => { if (t >= (sh.from ?? 0)) cur = j; }); imgs.forEach((im, j) => set(im, { display: j === cur ? '' : 'none' })); });
    // Window floats up tilted; fades out before until
    set(fr.win, { display: 'none' });
    F.add((t) => {
      const on = t >= a0 && t < until; set(fr.win, { display: on ? '' : 'none' }); if (!on) return;
      const q = seg(t, a0, a0 + 0.55, E.expoOut), out = until < 1e8 ? 1 - seg(t, until - 0.3, until) : 1;
      set(fr.win, { opacity: String((Math.min(1, q * 1.6) * out).toFixed(3)), transform: `perspective(${f1(F.px(1600))}px) translateY(${f1((1 - q) * F.px(80))}px) rotateX(${f1((1 - q) * 16)}deg)` });
    });
    if (o.sfx !== false) F.sfx(a0, 'whoosh', 0.55, { dur: 0.45, size: 0.5 });
    // Spotlight
    const spots = o.spot || [];
    if (spots.length) {
      const hole = el('div', `left:0;top:0;width:10px;height:10px;border-radius:${f1(F.px(14))}px;box-shadow:0 0 0 ${f1(F.W * 3)}px rgba(10,9,8,.6);filter:blur(${f1(F.px(7))}px);z-index:5;pointer-events:none;opacity:0`, content);
      F.add((t) => {
        let r = null, op = 0;
        spots.forEach((sp, j) => {
          const b = sp.box, rr = [px(b.x, VW), px(b.y, CH), px(b.w, VW), px(b.h, CH)], prev = spots[j - 1], nxt = spots[j + 1];
          const joinedIn = prev && Math.abs((prev.until ?? 1e9) - sp.at) < 0.05, joinedOut = nxt && Math.abs((sp.until ?? 1e9) - nxt.at) < 0.05;
          if (t >= sp.at - 0.32) r = r && joinedIn ? r.map((v, i) => lerp(v, rr[i], seg(t, sp.at - 0.32, sp.at, E.cubicInOut))) : rr;
          op = Math.max(op, Math.min(joinedIn ? (t >= sp.at - 0.32 ? 1 : 0) : seg(t, sp.at - 0.32, sp.at), joinedOut ? (t < (sp.until ?? 1e9) + 0.32 ? 1 : 0) : 1 - seg(t, (sp.until ?? 1e9) - 0.25, sp.until ?? 1e9)));
        });
        if (!r) { set(hole, { opacity: '0' }); return; }
        const pad = F.px(6);
        set(hole, { left: `${f1(r[0] - pad)}px`, top: `${f1(r[1] - pad)}px`, width: `${f1(r[2] + 2 * pad)}px`, height: `${f1(r[3] + 2 * pad)}px`, opacity: String(op.toFixed(3)) });
      });
      spots.forEach((sp, j) => { if (!(o.zoom || []).some((kk) => Math.abs(kk.at - sp.at) < 1.2)) F.sfx(sp.at - 0.3, 'whoosh', j ? 0.25 : 0.3, { dur: 0.3 }); });   // a spotlight that comes with a push-in gets no sound of its own
    }
    // Cursor (inside the page, scales with the push-in): position filled in once the screenshot size is known
    const cpts = o.cursor || [], path = cpts.map((c) => [c.at - 0.45, 0, 0]), clicks = cpts.filter((c) => c.click).map((c) => c.at);
    const fillCursor = () => { cpts.forEach((c, j) => { path[j][1] = px(c.x, VW); path[j][2] = px(c.y, CH); }); };
    if (cpts.length) { path.push([until, 0, 0, until]); cursor(F, content, path.map((p) => p), clicks); const last = path.at(-1); F.prep(() => { const pv = path[path.length - 2]; last[1] = pv[1]; last[2] = pv[2]; }); }
    // Push-in: bring this region to the window centre, zoomed so it fills 85% of the window (at most max×); zoom interpolated logarithmically; page edges never show
    const keys = o.zoom || [];
    F.add((t) => {
      if (t < a0 || t >= until) return;
      const home = { s: 1, px: VW / 2, py: VH / 2 };
      let st = { ...home };
      for (const kk of keys) {
        const d = kk.dur ?? 0.6, q = E.cubicInOut(seg(t, kk.at - d, kk.at));
        if (q <= 0) break;
        let tgt = home;
        if (kk.to && kk.to !== 'all') { const b = kk.to, rx = px(b.x, VW), ry = px(b.y, CH), rw = px(b.w ?? 0.3, VW), rh = px(b.h ?? (b.w ?? 0.3) * 0.5, CH), sc2 = clamp(Math.min((VW * 0.85) / rw, (VH * 0.85) / rh), 1, kk.max ?? 3); tgt = { s: sc2, px: clamp(rx + rw / 2, VW / (2 * sc2), VW - VW / (2 * sc2)), py: CH * sc2 > VH ? clamp(ry + rh / 2, VH / (2 * sc2), CH - VH / (2 * sc2)) : VH / 2 }; }   /* clamp the target inside the page first: the push never hits an edge and stops dead */
        st = { s: Math.exp(lerp(Math.log(st.s), Math.log(tgt.s), q)), px: lerp(st.px, tgt.px, q), py: lerp(st.py, tgt.py, q) };
      }
      const tx = clamp(VW / 2 - st.s * st.px, VW - st.s * VW, 0), ty = clamp(VH / 2 - st.s * st.py, Math.min(0, VH - st.s * CH), 0);
      set(content, { transform: `translate(${f1(tx)}px,${f1(ty)}px) scale(${st.s.toFixed(4)})` });
    });
    keys.forEach((kk) => { const d = kk.dur ?? 0.6; F.blur(kk.at - d, kk.at, 10); if (o.sfx !== false) F.sfx(kk.at - d, 'whoosh', 0.3, { dur: d, size: 0.4 }); });
    const box = { x: fr.P(0, inset)[0], y: fr.P(0, inset)[1], w: VW, h: VH };
    return { win: fr.win, view, content, box, at: (fx, fy) => [box.x + px(fx, VW), box.y + px(fy, CH)], get pageH() { return CH; }, phone: usePhone };
  }

  // Camera: rig is a full-frame container (windows and cursor go inside); keys push in / pull back over time
  //   rig.focus(at, dur, x, y, s): bring rig coordinate (x, y) to frame centre at s× zoom; rig.reset(at, dur)
  //   o.breathe: the camera keeps pushing in and out very slowly (amplitude, e.g. 0.02 = ±2%, 8 s period), so the picture is never fully still even when parked
  //   Push-ins / pull-backs register motion-blur sub-frame counts automatically (fast moves with 6 sub-frames stack into stair-step ghosts)
  function camera(F, parent, z = 10, opt = {}) {
    const rig = el('div', `left:0;top:0;width:${F.W}px;height:${F.H}px;transform-origin:0 0;z-index:${z}`, parent);
    const keys = [];
    const cam = { rig, keys,
      // o.ease: easing (default expoInOut; use PROMO.E.sine for a slow push across the whole span)
      // o.fit = { x, y, w, h } (rig coordinates): this region must stay fully in frame (3% margin).
      //   The zoom is capped to what fits and the centre shifts, so the region is never cut by the frame edge (portrait is narrow, so the zoom drops automatically)
      focus(at, dur, x, y, s, o = {}) {
        if (typeof o === 'number') o = { cy: o };
        const cy = o.cy ?? F.H / 2;
        let tx, ty;
        if (o.fit) {
          const m = 0.03 + (opt.breathe || 0) * 0.9, f = o.fit; // with breathing on: leave extra room for the zoom + drift
          s = Math.min(s, (F.W * (1 - 2 * m)) / f.w, (F.H * (1 - 2 * m)) / f.h);
          tx = F.W / 2 - x * s; ty = cy - y * s;
          // Region's position on screen = f * s + t; shift back if it overflows
          const L = f.x * s + tx, R = (f.x + f.w) * s + tx, T = f.y * s + ty, Bm = (f.y + f.h) * s + ty;
          if (L < F.W * m) tx += F.W * m - L; else if (R > F.W * (1 - m)) tx -= R - F.W * (1 - m);
          if (T < F.H * m) ty += F.H * m - T; else if (Bm > F.H * (1 - m)) ty -= Bm - F.H * (1 - m);
        } else { tx = F.W / 2 - x * s; ty = cy - y * s; }
        keys.push({ at, dur, s, x: tx, y: ty, ease: o.ease }); keys.sort((a, b) => a.at - b.at); if (dur > 0.05) F.blur(at, at + dur, 20); return cam;
      },
      reset(at, dur) { keys.push({ at, dur, s: 1, x: 0, y: 0 }); keys.sort((a, b) => a.at - b.at); if (dur > 0.05) F.blur(at, at + dur, 20); return cam; },
      // Interpolate in "which point faces the frame centre + log zoom": push-in / pull-back speed feels even, and the framed point doesn't drift away and back
      at(t) {
        let c = { s: 1, x: 0, y: 0 };
        for (const k of keys) {
          if (t <= k.at) break;
          const q = seg(t, k.at, k.at + k.dur, k.ease ?? E.expoInOut);
          const ca = { x: (F.W / 2 - c.x) / c.s, y: (F.H / 2 - c.y) / c.s }, cb = { x: (F.W / 2 - k.x) / k.s, y: (F.H / 2 - k.y) / k.s };
          const s = Math.exp(lerp(Math.log(c.s), Math.log(k.s), q)), cx = lerp(ca.x, cb.x, q), cy = lerp(ca.y, cb.y, q);
          c = { s, x: F.W / 2 - cx * s, y: F.H / 2 - cy * s };
        }
        return c;
      },
    };
    F.add((t) => {
      const c = cam.at(t), b = opt.breathe ? 1 + opt.breathe * Math.sin((2 * Math.PI * t) / 8) : 1;
      // Breathing: scale about the frame centre, plus a little side-to-side drift (on large flat-colour UIs, scaling alone barely reads as motion)
      const dx = opt.breathe ? opt.breathe * F.W * 0.35 * Math.sin((2 * Math.PI * t) / 11 + 1) : 0;
      const s = c.s * b, x = F.W / 2 - (F.W / 2 - c.x) * b + dx, y = F.H / 2 - (F.H / 2 - c.y) * b;
      set(rig, { transform: `translate(${f1(x)}px,${f1(y)}px) scale(${s.toFixed(5)})` });
    });
    return cam;
  }
  // Drag to reorder (when the text says "drag to reorder", the picture really drags once): a column of blocks, ⠿ handle → pick up (scale up + shadow + slight tilt) → insertion line → other blocks make room → drop
  //   o: { x, y, w (column's top-left and width), rows: [{ h, render(el) }] (each block's height and how to draw it), from (index of the dragged block), to (target position),
  //        at (moment the handle is grabbed), drop (moment it is dropped, default at + 1.2), gap, color (insertion line / selection colour), cursor (default true: draw a cursor doing the drag) }
  //   → { el, top0: {index: y}, top1: {index: y} } (each block's y before / after the drag, handy for drawing more)
  function reorder(F, parent, o) {
    const gap = o.gap ?? F.px(20), n = o.rows.length, mv = o.from, at = o.at, drop = o.drop ?? at + 1.2, col = o.color ?? '#2F6BFF', gw = F.px(56);
    const ord0 = [...Array(n).keys()], ord1 = ord0.filter((i) => i !== mv); ord1.splice(o.to, 0, mv);
    const ys = (ord) => { const y = {}; let acc = 0; ord.forEach((i) => { y[i] = acc; acc += o.rows[i].h + gap; }); return y; };
    const Y0 = ys(ord0), Y1 = ys(ord1), H0 = ord0.reduce((a, i) => a + o.rows[i].h + gap, -gap);
    const box = el('div', `left:${f1(o.x)}px;top:${f1(o.y)}px;width:${f1(o.w)}px;height:${f1(H0)}px`, parent);
    const items = o.rows.map((r, i) => { const e = el('div', `left:${f1(gw)}px;top:0;width:${f1(o.w - gw)}px;height:${f1(r.h)}px;transform-origin:30% 50%`, box); if (i === mv) e.dataset.lintOverlap = '1'; r.render(e); return e; });   // the dragged block deliberately sits on top of the others
    const hM = o.rows[mv].h;
    const sel = el('div', `left:${f1(gw - F.px(10))}px;top:0;width:${f1(o.w - gw + F.px(20))}px;height:${f1(hM + F.px(20))}px;border-radius:${f1(F.px(14))}px;border:${f1(F.px(3))}px solid ${col};box-sizing:border-box;opacity:0`, box);
    const grip = el('div', `left:${f1(F.px(8))}px;top:0;width:${f1(F.px(36))}px;height:${f1(F.px(52))}px;border-radius:${f1(F.px(8))}px;background:rgba(0,0,0,.06);opacity:0`, box, `<svg width="${f1(F.px(36))}" height="${f1(F.px(52))}" viewBox="0 0 12 18"><g fill="rgba(0,0,0,.45)"><circle cx="4" cy="4" r="1.3"/><circle cx="8" cy="4" r="1.3"/><circle cx="4" cy="9" r="1.3"/><circle cx="8" cy="9" r="1.3"/><circle cx="4" cy="14" r="1.3"/><circle cx="8" cy="14" r="1.3"/></g></svg>`);
    const line = el('div', `left:${f1(gw - F.px(10))}px;width:${f1(o.w - gw + F.px(10))}px;top:0;height:${f1(F.px(5))}px;border-radius:${f1(F.px(3))}px;background:${col};opacity:0`, box);
    const yM = (t) => Y0[mv] + (Y1[mv] - Y0[mv]) * seg(t, at + 0.15, drop, E.cubicInOut);
    F.add((t) => {
      const lift = seg(t, at, at + 0.15, E.expoOut) * (1 - seg(t, drop, drop + 0.25, E.spring));
      items.forEach((e, i) => {
        if (i === mv) set(e, { top: `${f1(yM(t))}px`, zIndex: '3', transform: `scale(${(1 + 0.04 * lift).toFixed(4)}) rotate(${f1(-1.5 * lift)}deg)`, filter: lift > 0.02 ? `drop-shadow(0 ${f1(F.px(24) * lift)}px ${f1(F.px(40) * lift)}px rgba(0,0,0,${(0.28 * lift).toFixed(3)}))` : 'none' });
        else set(e, { top: `${f1(Y0[i] + (Y1[i] - Y0[i]) * seg(t, at + 0.35, drop - 0.1, E.cubicInOut))}px` });
      });
      set(sel, { top: `${f1(yM(t) - F.px(10))}px`, opacity: String((seg(t, at - 0.6, at - 0.4) * (1 - seg(t, drop + 0.5, drop + 0.9))).toFixed(3)) });
      set(grip, { top: `${f1(yM(t) + hM / 2 - F.px(26))}px`, opacity: String((seg(t, at - 0.4, at - 0.2) * (1 - seg(t, drop + 0.6, drop + 0.9))).toFixed(3)) });
      set(line, { top: `${f1(Y1[mv] - gap / 2 - F.px(2))}px`, opacity: String((seg(t, at + 0.3, at + 0.45) * (1 - seg(t, drop - 0.05, drop + 0.1))).toFixed(3)) });
    });
    F.blur(at + 0.15, drop, 10);
    F.sfx(at + 0.2, 'whoosh', 0.35, { dur: Math.max(0.3, drop - at - 0.2), size: 0.3 }); F.sfx(drop, 'pop', 0.5);
    if (o.cursor !== false) {
      const gx = o.x + F.px(26), gy = (t) => o.y + yM(t) + hM / 2;
      cursor(F, parent, [[at - 0.7, o.x + o.w * 0.7, o.y + H0 + F.px(30)], [at - 0.06, gx, gy(0)], [at + 0.15, gx, gy(0)], [drop, gx, o.y + Y1[mv] + hM / 2], [drop + 0.9, gx + F.px(70), o.y + Y1[mv] + hM / 2 + F.px(110), drop + 1.0]], [at]);
    }
    return { el: box, top0: Y0, top1: Y1 };
  }
  // Cursor: path = [[t, x, y], ...] (the last may carry a 4th value = disappear time); clicks = [t, ...], click sounds added automatically
  function cursor(F, parent, path, clicks = [], z = 60) {
    const s = F.u;
    const c = el('div', `left:0;top:0;width:${36 * s}px;height:${44 * s}px;z-index:${z};pointer-events:none`, parent, `<svg width="${36 * s}" height="${44 * s}" viewBox="0 0 36 44"><path d="M3,2 L3,34 L11,26 L17,40 L23,37 L17,24 L29,24 Z" fill="#111" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg>`);
    const ring = el('div', `left:0;top:0;width:${60 * s}px;height:${60 * s}px;border-radius:50%;border:${3 * s}px solid rgba(20,20,20,.5);z-index:${z - 1};pointer-events:none;opacity:0`, parent);
    clicks.forEach((ct) => F.sfx(ct, 'click', 0.7));
    const hide = path.at(-1)[3] ?? 1e9;
    F.add((t) => {
      let x = path[0][1], y = path[0][2];
      for (let i = 1; i < path.length; i++) { const [t0, x0, y0] = path[i - 1], [t1, x1, y1] = path[i]; if (t >= t0) { const q = seg(t, t0, t1, E.cubicInOut); x = lerp(x0, x1, q); y = lerp(y0, y1, q); } }
      let k = 1, ro = 0, rs = 0.3;
      for (const ct of clicks) { const q = clamp((t - ct) / 0.18); if (q > 0 && q < 1) k = 1 - 0.18 * Math.sin(Math.PI * q); const r = clamp((t - ct) / 0.5); if (r > 0 && r < 1) { ro = 1 - r; rs = 0.3 + r * 1.2; } }
      set(c, { transform: `translate(${f1(x)}px,${f1(y)}px) scale(${k})`, opacity: t < path[0][0] || t > hide ? '0' : '1' });
      set(ring, { transform: `translate(${f1(x - 30 * s)}px,${f1(y - 30 * s)}px) scale(${rs.toFixed(3)})`, opacity: ro.toFixed(3) });
    });
  }

  // ---------- Transitions ----------
  // Whip pan: out whips off to the left, in whips in from the right (with motion blur). dir = -1 reverses
  function whip(F, outEl, inEl, o) {
    const d = o.dur ?? 0.5, dir = o.dir ?? 1;
    F.sfx(o.at, 'whoosh', 0.8, { dur: d, dir });
    F.blur(o.at, o.at + d, 20);
    F.add((t) => {
      const q = seg(t, o.at, o.at + d, E.expoInOut), blur = Math.sin(Math.PI * clamp((t - o.at) / d)) * F.px(18);
      if (outEl) set(outEl, { transform: `translateX(${f1(-dir * q * F.W)}px)`, filter: q > 0 && q < 1 ? `blur(${blur.toFixed(1)}px)` : 'none' });
      if (inEl) set(inEl, { transform: `translateX(${f1(dir * (1 - q) * F.W)}px)`, filter: q > 0 && q < 1 ? `blur(${blur.toFixed(1)}px)` : 'none' });
    });
  }
  // Circular mask opening (from = centre in percent)
  function iris(F, e, o) {
    F.sfx(o.at, 'whoosh', 0.5, { dur: o.dur ?? 0.75, size: 0.6 });
    F.add((t) => set(e, { clipPath: `circle(${(seg(t, o.at, o.at + (o.dur ?? 0.75), E.expoInOut) * 120).toFixed(2)}% at ${o.from ?? '50% 50%'})` }));
  }
  // Shared element: e morphs smoothly from the `from` box to the `to` box (rig / parent coordinates)
  function morph(F, e, o) {
    F.add((t) => {
      const q = seg(t, o.at, o.at + (o.dur ?? 0.7), E.expoInOut), a = o.from, b = o.to;
      set(e, { left: `${f1(lerp(a.x, b.x, q))}px`, top: `${f1(lerp(a.y, b.y, q))}px`, width: `${f1(lerp(a.w, b.w, q))}px`, height: `${f1(lerp(a.h, b.h, q))}px` });
    });
  }
  // White flash
  function flash(F, at, o = {}) {
    const e = el('div', `inset:0;background:${o.color ?? F.theme.paper};opacity:0;z-index:${o.z ?? 800};pointer-events:none`, F.stage);
    F.sfx(at - 0.05, 'boom', 0.8);
    F.add((t) => set(e, { opacity: String(Math.max(0, 1 - Math.abs(t - at) / (o.dur ?? 0.25))) }));
  }
  // Light leak sweep
  function leak(F, at, o = {}) {
    const d = o.dur ?? 1.0;
    (F.leaks ??= []).push(at);   // counted by lint: a light leak is a seasoning, two or three per film
    // Dark ground: warm light leak, screen blend (brightens); light ground (o.light): screen is invisible on white, so use a faint brand-colour band with multiply instead
    const c = o.color && /^#[0-9a-f]{6}$/i.test(o.color) ? [1, 3, 5].map((i) => parseInt(o.color.slice(i, i + 2), 16)).join(',') : '255,170,90';
    const e = el('div', `left:-40%;top:0;width:40%;height:100%;background:linear-gradient(90deg,rgba(${c},0),rgba(${c},${o.light ? 0.28 : 0.55}),rgba(${o.light ? c : '255,230,180'},0));mix-blend-mode:${o.light ? 'multiply' : 'screen'};z-index:${o.z ?? 700};opacity:0;pointer-events:none`, F.stage);
    e.dataset.motion = 'skip';   // a band of light sweeping the frame, not an object moving: the motion sheet doesn't measure it ("too fast" misfired on every leak)
    F.add((t) => { const q = seg(t, at, at + d); set(e, { opacity: String(Math.sin(Math.PI * q) * 0.9), transform: `translateX(${f1(q * F.W * 1.5)}px)` }); });
  }

  // ---------- Montage ----------
  // 3D rotating fan: a set of images arranged as a carousel, flying in one by one
  function carousel(F, parent, o) {
    const n = o.images.length, cw = F.px(o.cardW ?? 400), ch = F.px(o.cardH ?? 560), R = F.px(o.radius ?? 700);
    const host = el('div', `inset:0;perspective:${F.px(1800)}px`, parent);
    const cards = o.images.map((src) => { const c = el('div', `left:${(F.W - cw) / 2}px;top:${(F.H - ch) / 2}px;width:${cw}px;height:${ch}px;overflow:hidden;border-radius:${F.px(6)}px;box-shadow:0 ${F.px(30)}px ${F.px(60)}px rgba(0,0,0,.35);opacity:0`, host); el('img', 'left:0;top:0;width:100%;height:100%;object-fit:cover', c).src = src; return c; });
    F.add((t) => {
      const on = t >= o.at - 0.1 && t < o.until;
      set(host, { display: on ? '' : 'none' });
      if (!on) return;
      const rot = (t - o.at) * (o.speed ?? 40);
      cards.forEach((c, i) => {
        const q = seg(t, o.at + i * (o.stagger ?? F.B / 2), o.at + i * (o.stagger ?? F.B / 2) + 0.5, E.expoOut);
        const a = ((i * 360) / n + rot) * Math.PI / 180, x = Math.sin(a) * R * q, z = Math.cos(a) * R * q - F.px(300);
        set(c, { opacity: String(q * (1 - seg(t, o.until - 0.2, o.until))), transform: `translate3d(${f1(x)}px,${f1((1 - q) * F.px(300))}px,${f1(z)}px) rotateY(${f1(a * 180 / Math.PI)}deg)`, zIndex: String(Math.round(z + 2000)) });
      });
    });
  }
  // Vertical strip collage: n image strips slide in alternately from top and bottom; zoom: which strip expands to fill the frame at zoomAt (fly-through)
  function strips(F, parent, o) {
    const n = o.n ?? (F.portrait ? 3 : 4), w = F.W / n;
    const list = Array.from({ length: n }, (_, i) => {
      const s = el('div', `left:${i * w}px;top:0;width:${w}px;height:${F.H}px;overflow:hidden;display:none`, parent);
      const im = el('div', `left:0;top:0;width:${w}px;height:${F.H}px;background:url(${o.images[i % o.images.length]}) 50% 30%/cover`, s);
      F.sfx(o.at + i * (o.stagger ?? F.B / 2), 'whoosh', 0.35, { dur: 0.35, dir: i % 2 ? 1 : -1, size: 0.3 });
      return { s, im };
    });
    if (o.zoomAt !== undefined) { F.sfx(o.zoomAt, 'riser', 0.6, { dur: 0.6 }); F.blur(o.zoomAt, o.zoomAt + 0.6, 16); }
    F.add((t) => list.forEach((st, i) => {
      const t0 = o.at + i * (o.stagger ?? F.B / 2), on = t >= t0 && t < (o.until ?? 1e9);
      set(st.s, { display: on ? '' : 'none' });
      if (!on) return;
      const q = seg(t, t0, t0 + 0.35, E.expoOut), dir = i % 2 ? 1 : -1;
      set(st.s, { transform: `translateY(${f1((1 - q) * F.H * dir)}px)` });
      set(st.im, { transform: `translateY(${f1((1 - q) * -F.px(300) * dir)}px) scale(1.15)` });
      if (i === (o.zoom ?? 1) && o.zoomAt !== undefined) {
        const zq = seg(t, o.zoomAt, o.zoomAt + 0.6, E.expoIn);
        set(st.s, { left: `${f1(lerp(i * w, 0, zq))}px`, width: `${f1(lerp(w, F.W, zq))}px`, zIndex: '5' });
        set(st.im, { width: `${f1(lerp(w, F.W, zq))}px`, transform: `scale(${lerp(1.15, 1.7, zq).toFixed(4)})` });
      }
    }));
  }

  // ---------- Ending ----------
  // o: { at, logo: { text, font, size } or { src, h }, tagline, url, cta, bg, color, pulses }
  function endcard(F, parent, o) {
    const L = el('div', `inset:0;background:${o.bg ?? F.theme.paper};display:none;z-index:${o.z ?? 600}`, parent);
    const cy = F.H * (F.portrait ? 0.4 : 0.36);
    let logo, logoH;
    if (o.logo.src) { logoH = F.px(o.logo.h ?? 200); logo = el('img', `left:50%;top:${cy - logoH / 2}px;height:${logoH}px;transform-origin:50% 50%`, L); logo.src = o.logo.src; logo.style.marginLeft = '0'; }
    else {
      // Name on one line: no wrapping; if too long, scale down to the frame width (88% portrait, 80% landscape)
      const font = o.logo.font ?? F.theme.fonts.script, wgt = o.logo.weight ?? 700, want = F.px(o.logo.size ?? 260), mc = document.createElement('canvas').getContext('2d');
      mc.font = `${wgt} ${want}px ${font}`; const w0 = mc.measureText(String(o.logo.text ?? '')).width || 1;
      logoH = Math.min(want, (want * F.W * (F.portrait ? 0.88 : 0.8)) / w0);
      logo = el('div', `left:0;right:0;top:${cy - logoH / 2}px;text-align:center;white-space:nowrap;font:${wgt} ${logoH}px/1 ${font};color:${o.color ?? F.theme.ink}`, L, o.logo.text);
    }
    // Tagline: a size readable on a phone; CJK text gets no uppercase and no wide letter-spacing (spaced-out square characters look scattered and small)
    const cjk = /[　-鿿가-힯＀-￯]/.test(o.tagline ?? ''), tagSize = F.px(cjk ? (F.portrait ? 46 : 44) : (F.portrait ? 40 : 44)), tagLS = cjk ? 0.06 : 0.12;   // a line needs to be about 10px tall on a phone: 44 in landscape (at 32 it was only 8px on a phone)
    const tagTop = cy + logoH / 2 + F.px(56);
    const tag = o.tagline ? el('div', `left:${F.px(40)}px;right:${F.px(40)}px;top:${tagTop}px;text-align:center;font:500 ${tagSize}px/1.3 ${F.theme.fonts.sans};letter-spacing:${tagLS}em;${cjk ? '' : 'text-transform:uppercase;'}color:${o.color ?? F.theme.ink}`, L, o.tagline) : null;
    const urlTop = tag ? tagTop + tagSize * 1.3 + F.px(36) : cy + logoH / 2 + F.px(70);
    const url = o.url ? el('div', `left:0;right:0;top:${urlTop}px;text-align:center;font:italic ${F.px(54)}px ${F.theme.fonts.serif};color:${o.muted ?? F.theme.muted}`, L, o.url) : null;
    const cta = o.cta ? el('div', `left:${F.px(60)}px;right:${F.px(60)}px;top:${urlTop + F.px(110)}px;text-align:center;font:${F.px(46)}px/1.25 ${F.theme.fonts.serif};color:${o.color ?? F.theme.ink}`, L) : null;
    const ctaW = cta ? words(cta, o.cta) : [];
    F.sfx(o.at, 'boom', 0.9);
    if (o.logo.text) F.text(logo, 'logo', o.logo.text, o.at, 1e9);
    // Register each line at the moment it really appears (tagline +1.0, URL +1.6, call-to-action button +2.2 s): reading time counts from then, so the dead-air check is accurate
    if (tag) F.text(tag, 'endcard', o.tagline, o.at + 1.0, 1e9);
    if (url) { F.text(url, 'endcard', o.url, o.at + 1.6, 1e9); F.sfx(o.at + 1.6, 'pop', 0.3); }
    if (cta) F.text(cta, 'endcard', cta.textContent, o.at + 2.2, 1e9);
    F.add((t) => {
      const on = t >= o.at;
      set(L, { display: on ? '' : 'none' });
      if (!on) return;
      let pl = 0; for (const p of o.pulses || []) pl = Math.max(pl, pulse(t, p) * 0.02);
      const lq = seg(t, o.at + 0.2, o.at + 1.2, E.cubicInOut);
      set(logo, { clipPath: o.logo.src ? 'none' : `inset(0 ${(100 - 100 * lq).toFixed(1)}% 0 0)`, opacity: o.logo.src ? String(lq) : '1', transform: `${o.logo.src ? 'translateX(-50%) ' : ''}scale(${(1 + pl).toFixed(4)})` });
      if (tag) set(tag, { opacity: String(seg(t, o.at + 1.0, o.at + 1.4)), letterSpacing: `${lerp(tagLS + 0.12, tagLS, seg(t, o.at + 1.0, o.at + 2.0, E.expoOut)).toFixed(3)}em` });
      if (url) set(url, { opacity: String(seg(t, o.at + 1.6, o.at + 2.0)), transform: `translateY(${f1((1 - seg(t, o.at + 1.6, o.at + 2.2, E.expoOut)) * F.px(20))}px)` });
      if (cta) set(cta, { opacity: t >= o.at + 2.2 ? '1' : '0' });   // its words wait masked below their line until +2.2: keep the line hidden till then, or the stiff-motion check sees it "switched on" with the card
      ctaW.forEach((w, i) => { const q = seg(t, o.at + 2.2 + i * 0.08, o.at + 3.0 + i * 0.08, E.expoOut); set(w, { transform: `translateY(${((1 - q) * 115).toFixed(2)}%)` }); });
    });
    return L;
  }

  // ---------- Animation libraries (allowed in promos; time is always driven by F, never by the library's own clock) ----------
  // GSAP: returns one paused master timeline, scrubbed to second t every frame.
  //   Rules: every tween goes into this timeline (or a child timeline nested in it), times in seconds, matching F's time;
  //   never let a standalone gsap.to(...) play on its own; never change state from onComplete / onUpdate-style callbacks (callbacks are unreliable with per-frame, multi-process rendering).
  function gsapTimeline(F) {
    const g = window.gsap;
    if (!g) throw new Error(M('没加载 GSAP：在 index.html 里加 <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js">', 'GSAP is not loaded: add <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"> to index.html'));
    g.defaults({ lazy: false, overwrite: false });
    g.ticker.lagSmoothing(0);
    g.globalTimeline.pause(); // a tween left out of the master timeline won't quietly play in real time (it stays at its start, easy to spot when checking)
    const tl = g.timeline({ paused: true });
    // GSAP skips redraws when "time hasn't changed": scrub somewhere else and back, so it always recomputes at t
    F.add((t) => { tl.totalTime(t + 0.001, true); tl.totalTime(t, true); });
    return tl;
  }
  // Three.js: a WebGL canvas filling parent; change the scene in api.update(t), then one frame renders automatically.
  //   o: { fov, active(t) → whether to render (skipped when off stage), url (three module URL), alpha }
  async function three(F, parent, o = {}) {
    const THREE = await import(o.url ?? 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js');
    const canvas = el('canvas', `left:0;top:0;width:${F.W}px;height:${F.H}px`, parent);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: o.alpha ?? true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(F.W, F.H, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(o.fov ?? 35, F.W / F.H, 0.1, 2000);
    const loader = new THREE.TextureLoader();
    const api = { THREE, renderer, scene, camera, canvas, update: null,
      texture: async (src) => { const tx = await loader.loadAsync(src); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx; } };
    F.add((t) => { if (o.active && !o.active(t)) return; if (api.update) api.update(t); renderer.render(scene, camera); });
    return api;
  }
  // Physics (Matter.js): simulate the whole span with a fixed step before starting, render by looking up state at t (any frame can be computed on its own).
  //   o: { at, until, hz (default 240), setup(Matter, engine) → bodies to record, step(Matter, engine, t) (optional: apply forces, drop bodies over time) }
  //   returns { bodies, at(t) → [{ x, y, angle }] (one per body) }
  function physics(F, o) {
    const M = window.Matter;
    if (!M) throw new Error(window.PROMO.M('没加载 Matter.js：<script src="https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js">', 'Matter.js is not loaded: <script src="https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js">'));   // the local M here is Matter
    const engine = M.Engine.create();
    const bodies = o.setup(M, engine);
    const hz = o.hz ?? 240, dt = 1 / hz, frames = [];
    for (let i = 0, t = o.at; t <= o.until + dt; i++, t = o.at + i * dt) {
      if (o.step) o.step(M, engine, t);
      frames.push(bodies.map((b) => ({ x: b.position.x, y: b.position.y, angle: b.angle })));
      M.Engine.update(engine, dt * 1000);
    }
    return { bodies, at(t) {
      const f = clamp((t - o.at) / dt, 0, frames.length - 1), i = Math.floor(f), k = f - i, a = frames[i], b = frames[Math.min(i + 1, frames.length - 1)];
      return a.map((s, j) => ({ x: lerp(s.x, b[j].x, k), y: lerp(s.y, b[j].y, k), angle: lerp(s.angle, b[j].angle, k) }));
    } };
  }
  // Text outlines (opentype.js): turn text into an SVG path (pair with DrawSVG for a "handwritten" stroke).
  //   returns { d, w, h, svg(css) → an <svg> with the path already in it }
  const fontCache = {};
  async function textPath(fontUrl, text, size, o = {}) {
    if (!window.opentype) throw new Error(M('没加载 opentype.js：<script src="https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js">', 'opentype.js is not loaded: <script src="https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js">'));
    const font = fontCache[fontUrl] ??= await opentype.load(fontUrl);
    const p = font.getPath(text, 0, 0, size, { kerning: true }), bb = p.getBoundingBox(), pad = size * 0.06;
    const w = bb.x2 - bb.x1 + pad * 2, h = bb.y2 - bb.y1 + pad * 2;
    const glyphs = font.getPaths(text, 0, 0, size, { kerning: true }).map((g) => g.toPathData(2)).filter(Boolean);
    return { w, h, glyphs, d: p.toPathData(2), viewBox: `${bb.x1 - pad} ${bb.y1 - pad} ${w} ${h}` };
  }

  // ---------- Automatic checks (called by render.mjs --check) ----------
  // Text overlap, enough time on screen to read, text cut by the frame edge; on-screen fact checking against brief.md happens in render.mjs
  function lint(F) {
    const out = [];
    const hit = document.createElement('style'); hit.textContent = '#stage, #stage * { pointer-events: auto !important; }'; document.head.appendChild(hit);   // the contrast check finds the ground with elementsFromPoint: first make every layer hit-testable
    const add = (level, t, what, msg) => out.push({ level, t: Math.round(t * 100) / 100, src: '', what, msg });
    // Elements clearly rotating about X / Y (cube transitions, flipping text) have projected bounding boxes that can't be measured: skip while rotating
    const tilted = (cs) => { if (!cs.transform.startsWith('matrix3d(')) return false; const m = cs.transform.slice(9, -1).split(',').map(Number); return Math.abs(m[2]) + Math.abs(m[6]) + Math.abs(m[8]) + Math.abs(m[9]) > 0.05; };
    // data-lint-skip="1": a component saying "I can't be measured right now" (e.g. origami half folded, the flat part clipped by clip-path): skip meanwhile
    const vis = (e) => { for (let n = e; n && n !== F.stage; n = n.parentElement) { if (n.dataset && n.dataset.lintSkip === '1') return false; const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.15 || tilted(cs)) return false; } return true; };
    const sr = F.stage.getBoundingClientRect();
    const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height }; };
    // The area the text actually covers (not the element box): full-width centred text elements have boxes far bigger than the text; zoom in a little and the box "leaves the frame"
    const rg = document.createRange();
    const textBox = (e) => {
      let u = null;
      for (const n of e.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (!r.width) continue;
        const b = { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height };
        u = u ? { x: Math.min(u.x, b.x), y: Math.min(u.y, b.y), w: Math.max(u.x + u.w, b.x + b.w) - Math.min(u.x, b.x), h: Math.max(u.y + u.h, b.y + b.h) - Math.min(u.y, b.y) } : b;
      }
      return u || box(e);
    };
    const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    // Judge by the part of the text actually showing (don't trust registered times: a component may show outside them):
    // Take each smallest element with text, intersect it with every overflow:hidden mask box around it; the visible parts together are the "visible text"
    // The area an element's clip-path keeps (inset / circle / ellipse; anything else treated as no clip)
    const cpBox = (n, cs) => {
      const cp = cs.clipPath; if (!cp || cp === 'none') return null;
      const b = box(n), len = (v, L) => (/%$/.test(v) ? (parseFloat(v) / 100) * L : parseFloat(v) || 0);
      let m = /^inset\(([^)]*)\)/.exec(cp);
      if (m) { const v = m[1].split(/\s+round\s+/)[0].trim().split(/\s+/), [t0, r0 = t0, b0 = t0, l0 = r0] = v; const tt = len(t0, b.h), rr = len(r0, b.w), bt = len(b0, b.h), ll = len(l0, b.w); return { x: b.x + ll, y: b.y + tt, w: Math.max(0, b.w - ll - rr), h: Math.max(0, b.h - tt - bt) }; }
      m = /^(circle|ellipse)\(([^)]*)\)/.exec(cp);
      if (m) { const [rad, at = '50% 50%'] = m[2].split(/\s+at\s+/); const rs = rad.trim().split(/\s+/), [ax, ay = ax] = at.trim().split(/\s+/); const rx = len(rs[0] || '50%', b.w), ry = len(rs[1] ?? rs[0] ?? '50%', b.h), cx = b.x + len(ax, b.w), cy = b.y + len(ay, b.h); return { x: cx - rx, y: cy - ry, w: 2 * rx, h: 2 * ry }; }
      return null;
    };
    const cut2 = (r, c) => { const x = Math.max(r.x, c.x), y = Math.max(r.y, c.y); return { x, y, w: Math.max(0, Math.min(r.x + r.w, c.x + c.w) - x), h: Math.max(0, Math.min(r.y + r.h, c.y + c.h) - y) }; };
    // From the element outward: its own overflow:hidden (single-line ellipsis), every mask box around it, clip-path (circle transitions, wiped-in logos) all count
    const clipOf = (e, root) => { let r = textBox(e); for (let n = e; n && n !== F.stage; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.overflow !== 'visible') r = cut2(r, box(n)); const cp = cpBox(n, cs); if (cp) r = cut2(r, cp); } return r; };
    const shown = (root) => {
      const leaves = [root, ...root.querySelectorAll('*')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && vis(e));
      let u = null;
      for (const e of leaves) { const full = textBox(e), c = clipOf(e, root); if (c.w * c.h < 0.3 * full.w * full.h || c.w < 1) continue; u = u ? { x: Math.min(u.x, c.x), y: Math.min(u.y, c.y), w: Math.max(u.x + u.w, c.x + c.w) - Math.min(u.x, c.x), h: Math.max(u.y + u.h, c.y + c.h) - Math.min(u.y, c.y) } : c; }
      return u;
    };
    const seen = new Set();
    // Text swallowed as html: el()'s 4th argument is html, so code in a UI (things like <Section>) is taken as a tag by the browser and vanishes
    const INLINE = new Set(['I', 'B', 'EM', 'STRONG', 'SPAN', 'BR', 'SUB', 'SUP', 'U', 'S', 'SMALL', 'MARK', 'CODE', 'A', 'DIV', 'IMG', 'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'defs', 'use', 'text', 'tspan', 'linearGradient', 'radialGradient', 'stop', 'ellipse', 'clipPath', 'mask', 'filter']);
    for (const x of F.texts) {
      const odd = [...x.el.querySelectorAll('*')].find((n) => !INLINE.has(n.tagName) && !INLINE.has(n.tagName.toUpperCase()));
      const jsx = typeof x.raw === 'string' && /<[A-Z]/.test(x.raw) && !x.el.textContent.includes('<'); // fine if < is already shown literally on screen
      if ((odd || jsx) && !seen.has('html|' + x.text)) { seen.add('html|' + x.text); add('warn', x.win[0], M('文字被当成 html', 'text parsed as html'), M(`"${String(x.raw ?? x.text).slice(0, 30)}" 里的 <${odd ? odd.tagName.toLowerCase() : '…'}> 被浏览器当成了标签，画面上那段字会消失。代码、带尖括号的界面文字用 PROMO.esc() 转义，或者设 textContent`, `the <${odd ? odd.tagName.toLowerCase() : '…'}> in "${String(x.raw ?? x.text).slice(0, 30)}" was parsed by the browser as a tag, so that text disappears from the picture. Escape code and UI text with angle brackets with PROMO.esc(), or set textContent`)); }
    }
    // Latin curly quotes / apostrophes (’ “ ”) with a Chinese font first: these glyphs are full-width in Chinese fonts, so can’t shows as "can’ t"
    for (const x of F.texts) {
      if (!/[\u2018\u2019\u201C\u201D]/.test(x.text) || !/[A-Za-z][\u2018\u2019]|[\u201C\u201D]\s*[A-Za-z]|[A-Za-z]\s*[\u201C\u201D]/.test(x.text)) continue;
      const first = (getComputedStyle(x.el).fontFamily.split(',')[0] || '').replace(/["']/g, '').trim();
      if (/SC|TC|JP|KR|CJK|Han|Hei|Song|Kai|WenKai|PingFang|ZCOOL|Noto Serif SC|Ma Shan/i.test(first) && !seen.has('quote|' + x.text)) { seen.add('quote|' + x.text); add('warn', x.win[0], M('西文引号', 'Latin quotes'), M(`"${x.text.slice(0, 24)}" 里有弯引号 / 撇号，首选字体是中文字体 ${first}：显示成全角，单词中间空一大块——字体列表里把一个西文字体放在中文字体前面（如 "Noto Sans", "Noto Sans SC"），或者改成直引号`, `"${x.text.slice(0, 24)}" has curly quotes / apostrophes and the first font is the Chinese font ${first}: they render full-width, leaving a big gap inside words — put a Latin font before the Chinese one in the font list (e.g. "Noto Sans", "Noto Sans SC"), or use straight quotes`)); }
    }
    // Readable on a phone: a line's real height on screen (including camera zoom) scaled to a 360px-wide phone screen
    const lineH = (root) => {
      let m = 0; const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (!n.textContent.trim()) continue; rg.selectNodeContents(n); for (const r of rg.getClientRects()) m = Math.max(m, r.height); }
      return m;
    };
    // Where the text actually sits (viewport coordinates): each text node's line boxes; if the element or an ancestor is rotated, go character by character since the box is inaccurate
    const rotated = (x) => { if (x._rot !== undefined) return x._rot; let r = false; for (let n = x.el; n && n !== F.stage; n = n.parentElement) { const m = getComputedStyle(n).transform; if (m && m !== 'none') { const v = m.match(/matrix\(([^)]+)\)/); if (v) { const [, b2] = v[1].split(',').map(Number); if (Math.abs(b2) > 0.01) { r = true; break; } } } } return (x._rot = r); };
    const glyphRects = (x) => {
      const out = [], fine = rotated(x), tw = document.createTreeWalker(x.el, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) { const str = n.textContent; if (!str.trim()) continue; if (fine) { for (let i = 0; i < str.length; i++) { if (!str[i].trim()) continue; rg.setStart(n, i); rg.setEnd(n, i + 1); for (const r of rg.getClientRects()) out.push(r); } } else { rg.selectNodeContents(n); for (const r of rg.getClientRects()) out.push(r); } }
      return out;
    };
    const phone = 360 / F.W, READ = 10; // a line needs to be about 10px tall on a phone (≈ 8px text) to be readable
    let tiny = null;
    for (let t = 0; t < F.duration; t += 0.1) {
      F.render(t);
      const live = F.texts.filter((x) => vis(x.el)).map((x) => ({ x, b: shown(x.el) })).filter((v) => v.b && v.b.w > 1 && v.b.h > 1);
      // Text on screen, but for 2+ seconds no line readable on a phone (only small UI text) — one of the reviewers' most common complaints
      const big = live.reduce((m, v) => Math.max(m, lineH(v.x.el)), 0) * phone, content = live.some((v) => !v.x.chrome);
      if (content && big < READ) tiny ??= { t, big }; else if (tiny) { if (t - tiny.t >= 2) add('warn', tiny.t, M('手机上读不清', 'unreadable on phones'), M(`${tiny.t.toFixed(1)}–${t.toFixed(1)} 秒画面上没有一行字在手机上读得清（最大的一行在手机上约 ${tiny.big.toFixed(0)}px 高）：推近界面，或者配一句大标题`, `${tiny.t.toFixed(1)}–${t.toFixed(1)} s: no line of text on screen is readable on a phone (the largest is about ${tiny.big.toFixed(0)}px tall there): push in on the UI, or add a big headline`)); tiny = null; }
      // Check key information one by one (end-card text, logo, URL): one big line in the frame doesn't mean the URL is readable too
      for (const { x } of live) {
        const key = ['endcard', 'logo'].includes(x.kind) || /^[^\w]*(https?:\/\/)?[\w-]+(\.[\w-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(x.text.trim()), kk = 'key|' + x.text;   // URL: the whole text is one address
        if (!key || seen.has(kk) || t < x.win[0] + 0.5) continue;
        seen.add(kk); const h = lineH(x.el) * phone;
        if (h > 0 && h < READ) add('warn', t, M('手机上读不清', 'unreadable on phones'), M(`关键信息 "${x.text.slice(0, 30)}" 在手机上只有约 ${h.toFixed(1)}px 高（片尾的字、网址每一条都要读得清，至少约 ${READ}px）：字号至少 ${Math.ceil((READ / phone) / 1.2)}px 左右`, `key text "${x.text.slice(0, 30)}" is only about ${h.toFixed(1)}px tall on a phone (every end-card line and URL must be readable, at least about ${READ}px): use a font size of at least about ${Math.ceil((READ / phone) / 1.2)}px`));
      }
      for (const { x } of live) {
        const k = 'win|' + x.text;
        if ((t < x.win[0] - 0.15 || t > x.win[1] + 1.0) && !seen.has(k)) { seen.add(k); add('warn', t, M('提前 / 滞留', 'early / lingering'), M(`"${x.text.slice(0, 24)}" 在 ${t.toFixed(1)} 秒就看得见，但登记的出现时间是 ${x.win[0].toFixed(1)}–${x.win[1] > 1e8 ? '结尾' : x.win[1].toFixed(1)} 秒`, `"${x.text.slice(0, 24)}" is visible at ${t.toFixed(1)} s, but its registered time is ${x.win[0].toFixed(1)}–${x.win[1] > 1e8 ? 'the end' : x.win[1].toFixed(1) + ' s'}`)); }
      }
      // Only one headline at a time (two on screen at once and viewers don't know which to read)
      const heads = live.filter((v) => v.x.kind === 'headline');
      if (heads.length > 1) { const k = 'two|' + heads.map((v) => v.x.text).join('|'); if (!seen.has(k)) { seen.add(k); add('warn', t, M('两句标题', 'two headlines'), M(`"${heads[0].x.text.slice(0, 20)}" 和 "${heads[1].x.text.slice(0, 20)}" 同时在画面上：等上一句退完再出下一句`, `"${heads[0].x.text.slice(0, 20)}" and "${heads[1].x.text.slice(0, 20)}" are on screen together: let the first leave before the next comes in`)); } }
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
        const a = live[i], c = live[j];
        if (a.x.el.contains(c.x.el) || c.x.el.contains(a.x.el)) continue;
        if (a.x.overlap || c.x.overlap || a.x.el.closest('[data-lint-overlap]') || c.x.el.closest('[data-lint-overlap]')) continue;   // declared "deliberately on top"
        let o = inter(a.b, c.b) / Math.max(1, Math.min(a.b.w * a.b.h, c.b.w * c.b.h));
        // Boxes overlap, so look closer: by where the text actually sits (each line's extent; rotated text per character) — two diagonal tagline lines can have heavily overlapping boxes while the text itself doesn't
        if (o > 0.1) { const ra = glyphRects(a.x), rc = glyphRects(c.x), area = (rs) => rs.reduce((m, r) => m + r.width * r.height, 0); let sI = 0; for (const p1 of ra) for (const p2 of rc) sI += Math.max(0, Math.min(p1.right, p2.right) - Math.max(p1.left, p2.left)) * Math.max(0, Math.min(p1.bottom, p2.bottom) - Math.max(p1.top, p2.top)); o = sI / Math.max(1, Math.min(area(ra), area(rc))); }
        const key = a.x.text + '|' + c.x.text;
        if (o > 0.1 && !seen.has(key)) { seen.add(key); add('warn', t, M('文字重叠', 'text overlap'), M(`"${a.x.text.slice(0, 20)}" 和 "${c.x.text.slice(0, 20)}" 同时出现并重叠了 ${Math.round(o * 100)}%`, `"${a.x.text.slice(0, 20)}" and "${c.x.text.slice(0, 20)}" are on screen together and overlap by ${Math.round(o * 100)}%`)); }
      }
      // Line through text: a ring edge, thin bar or arrow shaft crossing text (checked every 0.2 s)
      if (F.strokes && Math.round(t * 10) % 2 === 0) {
        const sr = F.stage.getBoundingClientRect(), kk = sr.width / F.W;
        for (const sk of F.strokes) {
          if (t < sk.a || t >= sk.b || !vis(sk.el)) continue;
          const g = sk.fn(); if (!g || !g.pts || !g.pts.length) continue;
          const pv = g.pts.map(([px, py]) => [sr.left + px * kk, sr.top + py * kk]), hw = (g.w * kk) / 2;
          for (const { x } of live) {
            if (x.el.contains(sk.el) || sk.el.contains(x.el)) continue;
            const key = 'stroke|' + x.text; if (seen.has(key)) continue;
            // Line boxes are taller than the ink (space above and below): trim 18% top and bottom, so a line right under the text doesn't count
            const hit = glyphRects(x).some((r) => { const ih = r.height * 0.18; return pv.some(([qx, qy]) => qx > r.left - hw && qx < r.right + hw && qy > r.top + ih - hw && qy < r.bottom - ih + hw); });
            if (hit) { seen.add(key); add('warn', t, M('线穿过字', 'line through text'), M(`一条线（圆环的边 / 细条 / 箭头）从 "${x.text.slice(0, 20)}" 上划过：挪开一点，或者让字躲开它`, `a line (ring edge / thin bar / arrow) crosses "${x.text.slice(0, 20)}": move it a little, or move the text out of its way`)); }
          }
        }
      }
      // UI text not vertically centred (buttons, inputs, pills, top bars — single-line boxes with a fill / border): in css, `line-height:…;font:…` order lets the font shorthand reset line-height to normal and the text sticks to the top. Checked every 0.2 s
      if (Math.round(t * 10) % 2 === 0) for (const { x } of live) {
        const k0 = 'vc|' + x.text; if (seen.has(k0)) continue;
        for (const e of [x.el, ...x.el.querySelectorAll('*')]) {
          if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || !vis(e)) continue;
          if (/^vertical/.test(getComputedStyle(e).writingMode)) continue;   // vertical text (manga lettering) runs top to bottom: up / down centring doesn't apply
          let r = null;
          for (const n of e.childNodes) { if (n.nodeType !== 3 || !n.textContent.trim()) continue; rg.selectNodeContents(n); for (const q of rg.getClientRects()) r = r ? { top: Math.min(r.top, q.top), bottom: Math.max(r.bottom, q.bottom) } : { top: q.top, bottom: q.bottom }; }
          if (!r || r.bottom - r.top < 6) continue;
          const th = r.bottom - r.top;
          for (let n = e; n && n !== F.stage; n = n.parentElement) {
            const cs = getComputedStyle(n);
            if (!(cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || (parseFloat(cs.borderTopWidth) > 0 && parseFloat(cs.borderBottomWidth) > 0) || /inset/.test(cs.boxShadow))) continue;   // a box needs a border all round (a single top line is a divider); inputs drawn with an inset stroke (box-shadow: inset) count too
            const bb = n.getBoundingClientRect();
            if (bb.height > th * 3.2 || bb.height < th * 0.9) break;   // ignore big panels and multi-line areas
            // Other text in the box (a name + a preview line below, even if not shown yet): not a single-line box. Text on the same line doesn't count (an input's placeholder and typed text share a line, one hidden)
            const otherRow = (m) => [...m.childNodes].some((q) => { if (q.nodeType !== 3 || !q.textContent.trim()) return false; rg.selectNodeContents(q); const qs = [...rg.getClientRects()]; return !qs.length || qs.some((qq) => qq.bottom <= r.top + th * 0.3 || qq.top >= r.bottom - th * 0.3); });
            if ([...n.querySelectorAll('*')].some((m) => m !== e && !m.contains(e) && !e.contains(m) && otherRow(m))) break;
            const top = r.top - bb.top, bot = bb.bottom - r.bottom;
            if (Math.abs(top - bot) > Math.max(4, 0.16 * bb.height)) { seen.add(k0); add('warn', t, M('字没居中', 'text off-centre'), M(`"${x.text.slice(0, 24)}" 在它的框里没有上下居中（上 ${Math.round(top)}px / 下 ${Math.round(bot)}px）：多半是 css 里 line-height 写在 font 前面，被 font 简写重置成了 normal——先写 font 再写 line-height，或者写成 font: 600 32px/72px …；也可能是字被 flex-end / 写死的 top 放偏了（输入框里打字用 PROMO.field，单行时字在中线上）`, `"${x.text.slice(0, 24)}" is not vertically centred in its box (top ${Math.round(top)}px / bottom ${Math.round(bot)}px): most likely line-height comes before font in the css and the font shorthand reset it to normal — write font first, then line-height, or use font: 600 32px/72px …; or the text is pushed off by flex-end / a fixed top (for typing in an input use PROMO.field, which keeps a single line on the centre line)`)); }
            break;
          }
          if (seen.has(k0)) break;
        }
      }
      // Partly cut by the frame edge (fully off frame doesn't count: that's the camera moving away). Flashes during transitions don't count; report only if it lasts 0.35 s or more
      const frame = { x: 0, y: 0, w: F.W, h: F.H };
      for (const { x, b } of live) {
        const inside = inter(b, frame) / Math.max(1, b.w * b.h);
        const cut = !x.bleed && inside > 0.02 && inside < 0.97;
        x._cut = cut ? (x._cut ?? t) : undefined;
        const k = 'out|' + x.text;
        if (cut && t - x._cut >= 0.35 && !seen.has(k)) { seen.add(k); add('warn', x._cut, M('切边', 'clipped'), M(`"${x.text.slice(0, 24)}" 被画面边缘切掉了 ${Math.round((1 - inside) * 100)}%（持续 ${(t - x._cut).toFixed(1)} 秒）。镜头推近时用 cam.focus 的 fit 选项保住整块区域`, `"${x.text.slice(0, 24)}" is ${Math.round((1 - inside) * 100)}% cut off by the frame edge (for ${(t - x._cut).toFixed(1)} s). When the camera pushes in, use cam.focus's fit option to keep the whole area in frame`)); }
      }
    }
    // Reading time: at least 0.3 s per word for headlines (impact text, one word per beat, excluded)
    for (const x of F.texts.filter((x) => x.kind === 'headline')) {
      const n = x.text.trim().split(/\s+/).length + (x.text.match(/[一-鿿぀-ヿ]/g) || []).length / 3;
      const need = 0.6 + n * 0.3, have = x.win[1] - x.win[0];
      if (have < need) add('warn', x.win[0], M('停留太短', 'too brief'), M(`标题 "${x.text.slice(0, 30)}" 只停留 ${have.toFixed(1)} 秒，读完至少要 ${need.toFixed(1)} 秒`, `headline "${x.text.slice(0, 30)}" stays only ${have.toFixed(1)} s; reading it needs at least ${need.toFixed(1)} s`));
    }
    // Text must not float free of sound / music: check the music has a matching section at section changes
    if (!F.sections.length) add('warn', 0, M('音乐', 'music'), M('没有用 F.section() 标出音乐段落，配乐会一直是同一个强度', 'no music sections marked with F.section(): the score will stay at one intensity throughout'));
    // On the beat: sections and hard cuts must land on beats (2+ frames off and the hit and kick drum sound like two hits)
    // Narrated films follow the narration (sections and transitions between sentences); no beat requirement
    const offBeat = (t) => !F.voiced && Math.abs(t - F.snap(t)) > 0.04;
    F.sections.filter((x) => x.at > 0 && offBeat(x.at)).forEach((x) => add('warn', x.at, M('不在拍上', 'off the beat'), M(`段落 ${x.at.toFixed(2)} 秒不在拍点上（最近的拍是 ${F.snap(x.at).toFixed(2)}）：段落、转场、重击一起挪到拍点`, `section at ${x.at.toFixed(2)} s is not on a beat (nearest beat: ${F.snap(x.at).toFixed(2)}): move the section, transition and hit onto the beat together`)));
    const offHalf = (t) => !F.voiced && Math.abs(t - F.offset - Math.round((t - F.offset) / (F.B / 2)) * (F.B / 2)) > 0.04;   // quick cuts may land on half beats (eighth notes)
    [...new Set(F.cuts || [])].filter(offHalf).forEach((c) => add('warn', c, M('不在拍上', 'off the beat'), M(`硬切 ${c.toFixed(2)} 秒不在拍点（或半拍）上（最近的拍是 ${F.snap(c).toFixed(2)}）`, `hard cut at ${c.toFixed(2)} s is not on a beat (or half beat) (nearest beat: ${F.snap(c).toFixed(2)})`)));
    // Portrait safe area: the platform's top bar covers about the top 8%, the caption / account info covers about the bottom 20% (the right-hand button column covers some too)
    // Text-to-ground contrast (WCAG: large text ≥ 3:1, body ≥ 4.5:1): must stay readable on changed grounds too (light ground, brand-colour ground).
    //   Ground = the layers under the text stacked up (falls back to theme.bg if no solid colour is found); text over images / canvas can't be measured, skipped
    {
      const rgb = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const v = m[1].split(',').map((x) => parseFloat(x)); return { r: v[0], g: v[1], b: v[2], a: v[3] ?? 1 }; };
      const hex = (c) => { const m = /^#([0-9a-f]{6})$/i.exec(String(c || '').trim()); if (!m) return null; const n = parseInt(m[1], 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }; };
      const L = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
      // Effective opacity: multiply its own and every outer layer's opacity
      const eff = (n) => { let o = 1; for (let m = n; m && m !== F.stage; m = m.parentElement) { const cs = getComputedStyle(m); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= Number(cs.opacity); } return o; };
      const blurred = (n) => { for (let m = n; m && m !== F.stage; m = m.parentElement) if (/blur\(\s*[1-9]|blur\(\s*0?\.[1-9]/.test(getComputedStyle(m).filter)) return true; return false; };
      const name = (n, c) => `${n.dataset && n.dataset.what ? n.dataset.what : `<${n.tagName.toLowerCase()}${n.className && typeof n.className === 'string' ? '.' + n.className.split(' ')[0] : ''}>`} ${'#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
      const ratioAt = (x, t) => {
        F.render(t);
        const leaf = [x.el, ...x.el.querySelectorAll('*')].find((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
        if (!leaf || eff(leaf) < 0.95 || blurred(leaf)) return null;   // fading in / out or still blurred: measure once the text is fully shown
        const cs0 = getComputedStyle(leaf);
        if (parseFloat(cs0.webkitTextStrokeWidth) > 0) return null;   // stroked text (pop) brings its own contrast
        const tn = [...leaf.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()); rg.selectNodeContents(tn); const rr = rg.getBoundingClientRect();
        const cx = rr.left + rr.width / 2 - sr.left, cy = rr.top + rr.height / 2 - sr.top;
        if (!rr.width || cx < 0 || cy < 0 || cx > F.W || cy > F.H) return null;   // text off frame (the camera moved away)
        // type filled with a gradient clipped to the letters (metallic / gold title type): the letters' colour is the gradient's average, and that gradient is not the ground
        const clipT = (cs) => cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text';
        const gst = clipT(cs0) ? [...cs0.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => rgb(m[0])).filter(Boolean) : [];
        const fg = gst.length ? { r: gst.reduce((s2, c) => s2 + c.r, 0) / gst.length, g: gst.reduce((s2, c) => s2 + c.g, 0) / gst.length, b: gst.reduce((s2, c) => s2 + c.b, 0) / gst.length, a: 1 } : rgb(cs0.color); if (!fg) return null;
        // Ground: ask the browser "what is painted under the text's centre" (grounds laid by sibling layers count: cutout paper strips, the launch stage). Only layers under the text (layers on top are occlusion, not ground);
        //   semi-transparent grounds stack up until an opaque solid colour; if an image / canvas comes first, don't measure
        const stack = document.elementsFromPoint(rr.left + rr.width / 2, rr.top + rr.height / 2);
        const at = stack.findIndex((n) => n === leaf || n.contains(leaf));
        const under = [], ta = rr.width * rr.height;
        let solid = null, from = null;
        for (const n of at >= 0 ? stack.slice(at) : stack) {
          if (n !== leaf && leaf.contains(n)) continue;
          if (n === F.stage) break;
          if (eff(n) < 0.9) continue;   // transparent full-screen layers (white flash, dim-out fades) are not ground
          // The ground must back most of the text: thin things touching only the text's centre (cords, thin lines, borders) are not ground
          if (n !== leaf) { const q = n.getBoundingClientRect(), ov = Math.max(0, Math.min(q.right, rr.right) - Math.max(q.left, rr.left)) * Math.max(0, Math.min(q.bottom, rr.bottom) - Math.max(q.top, rr.top)); if (ov < ta * 0.5) continue; }
          const cs = getComputedStyle(n);
          if (clipT(cs)) continue;
          if (/url\(/.test(cs.backgroundImage) || ['IMG', 'CANVAS', 'VIDEO', 'svg'].includes(n.tagName)) return null;
          // Gradients (glow, spotlight): count as one layer at their densest colour stop
          const stops = cs.backgroundImage === 'none' ? [] : [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => rgb(m[0])).sort((p, q) => q.a - p.a);
          const c = stops[0] ?? rgb(cs.backgroundColor); if (!c || c.a < 0.05) continue;
          if (c.a > 0.95) { solid = c; from = name(n, c); break; }
          under.push(c);
        }
        let bg = solid ?? hex(F.theme.bg); if (!bg) return null;
        for (const c of under.reverse()) bg = { ...over(c, bg), a: 1 };
        const f2 = over(fg, bg), l1 = L(f2), l2 = L(bg);
        return { r: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), from: from ?? `theme.bg ${F.theme.bg}` };
      };
      for (const x of F.texts) {
        const k = 'cr|' + x.text; if (seen.has(k)) continue;
        const a = x.win[0], b = Math.min(x.win[1], F.duration - 0.05);
        if (!(b > a)) continue;
        // Sample three moments in the window; passes if any one is readable; report only if every measurement is below 2.5:1 (WCAG large-text line is 3:1; light-grey UI placeholders are often around 2.8, not reported)
        const rs = [0.3, 0.55, 0.8].map((q) => ratioAt(x, a + (b - a) * q)).filter((r) => r !== null), best = rs.sort((p, q) => q.r - p.r)[0];
        if (best && best.r < 2.5) { seen.add(k); add('warn', a, M('对比度不够', 'low contrast'), M(`"${x.text.slice(0, 20)}" 和底色的对比度只有 ${best.r.toFixed(1)}:1（建议 ≥ 3:1；量的底是 ${best.from}）：字换深一点 / 浅一点，或者换底色`, `"${x.text.slice(0, 20)}" has only ${best.r.toFixed(1)}:1 contrast with its ground (aim for ≥ 3:1; measured against ${best.from}): make the text darker / lighter, or change the ground`)); }
      }
    }
    hit.remove();
    // Landscape: headlines at least about 10% from the top edge (hugging the top looks cramped; user feedback)
    if (!F.portrait) for (const x of F.texts.filter((x) => ['headline', 'slam', 'endcard', 'logo'].includes(x.kind) && !x.bleed)) {
      const k = (x.win[0] + Math.min(x.win[1], F.duration)) / 2; F.render(Math.min(k, F.duration - 0.05));
      if (!vis(x.el)) continue;
      const b = shown(x.el); if (!b) continue;
      if (b.y < F.H * 0.09 && b.y + b.h > 0) add('warn', x.win[0], M('标题贴顶', 'headline too high'), M(`"${x.text.slice(0, 20)}" 离画面上沿只有 ${Math.round((b.y / F.H) * 100)}%：横屏标题至少离上沿约 10%（1080p 约 108px），画面主体跟着往下挪`, `"${x.text.slice(0, 20)}" is only ${Math.round((b.y / F.H) * 100)}% from the top edge: landscape headlines need about 10% (about 108px at 1080p); move the main picture down with it`));
    }
    if (F.portrait) for (const x of F.texts.filter((x) => ['headline', 'slam', 'endcard', 'logo'].includes(x.kind))) {
      const k = (x.win[0] + Math.min(x.win[1], F.duration)) / 2; F.render(Math.min(k, F.duration - 0.05));
      if (!vis(x.el)) continue;
      const b = shown(x.el); if (!b) continue;
      if (b.y + b.h > F.H * 0.8 || b.y < F.H * 0.08) add('warn', x.win[0], M('竖屏安全区', 'portrait safe area'), M(`"${x.text.slice(0, 20)}" 在画面${b.y < F.H * 0.08 ? '顶部 8%' : '底部 20%'} 以内，会被平台的${b.y < F.H * 0.08 ? '顶栏' : '文案 / 账号信息'}挡住`, `"${x.text.slice(0, 20)}" is within the ${b.y < F.H * 0.08 ? 'top 8%' : 'bottom 20%'} of the frame and will be covered by the platform's ${b.y < F.H * 0.08 ? 'top bar' : 'caption / account info'}`));
    }
    // Light leaks: a seasoning for the one or two heaviest section changes. More than three in a film, or two within 3 s, reads as a smudge passing over and over
    const lk = [...(F.leaks || [])].sort((a, b) => a - b), close = lk.findIndex((t, i) => i > 0 && t - lk[i - 1] < 3);
    if (lk.length > 3 || close > 0) add('warn', lk[close > 0 ? close : 3], M('漏光太多', 'too many light leaks'), M(`漏光用了 ${lk.length} 次${close > 0 ? `（${lk[close - 1].toFixed(1)}s 和 ${lk[close].toFixed(1)}s 只隔 ${(lk[close] - lk[close - 1]).toFixed(1)} 秒）` : ''}：一部片子两三次就够，留给段落之间最重的一两下，其余换镜头推拉、横移或压暗转场`, `${lk.length} light leaks${close > 0 ? ` (${lk[close - 1].toFixed(1)}s and ${lk[close].toFixed(1)}s only ${(lk[close] - lk[close - 1]).toFixed(1)} s apart)` : ''}: two or three per film, kept for the heaviest section changes; use camera moves or dim-downs elsewhere`));
    return out;
  }

  // ---------- Entry ----------
  // PROMO.compose({ bpm, offset, duration, theme, grain, build: async (F, { aspect }) => {} })
  // Landscape / portrait: with ?aspect=9:16 in the URL (render.mjs --aspect 9:16) the frame is 1080×1920
  // Captions: with narration (timeline.js), each sentence is split into caption strips by the narration's word times, shown at the bottom (portrait avoids the bottom 20% platform overlay).
  //   o: { max (strip width limit, in characters), size, font, weight, color, bg, shadow (a text-shadow, e.g. with bg: 'none'), top (px from the top), z }. compose adds it automatically with narration (compose's captions: false turns it off)
  //   Captions are not registered as on-screen text (no fact check: they are the narration verbatim)
  function captions(F, o = {}) {
    const T = F.T;
    if (!T || !T.lines.length) return [];
    const segs = EV.captionSegments(T, o.max ?? (F.portrait ? 16 : 22)), size = F.px(o.size ?? (F.portrait ? 50 : 48));
    const box = el('div', `left:0;right:0;top:${o.top ?? F.H * (F.portrait ? 0.7 : 0.86)}px;text-align:center;z-index:${o.z ?? 880};pointer-events:none;display:none`, F.stage);
    const pill = el('span', `position:relative;display:inline-block;max-width:${F.W * 0.86}px;padding:${size * 0.22}px ${size * 0.55}px;border-radius:${size * 0.3}px;background:${o.bg ?? 'rgba(12,12,12,.62)'};color:${o.color ?? '#fff'};font:${o.weight ?? 700} ${size}px/1.3 ${o.font ?? F.theme.fonts.sans};${o.shadow ? `text-shadow:${o.shadow}` : ''}`, box);
    F.add((t) => { const c = segs.find((x) => t >= x.start && t < x.end); set(box, { display: c ? '' : 'none' }); if (c && pill.textContent !== c.text) pill.textContent = c.text; });
    // Captions switch to the next strip in one frame (that's how captions work): register as intended appearances so the film check doesn't report a jump
    for (const c of segs) { F.appear(c.start); F.appear(c.end); }
    F.caps = segs;
    return segs;
  }

  // Chapter bar: when script.json has chapter (at least 2 chapters), a thin segmented progress bar at the top of the frame (one segment per chapter, length by duration), the current chapter filled with the accent colour;
  //   for the first 2.5 s of each chapter its name shows under the bar. Sits in a translucent dark pill — visible on any ground. compose's chapters: false turns it off. Not registered as on-screen text (same as captions)
  function chapterBar(F, o = {}) {
    const C = (F.T && F.T.chapters) || []; if (C.length < 2) return;
    const total = C[C.length - 1].end - C[0].start, bw = F.W * (F.portrait ? 0.78 : 0.5), u = F.px(1), gap = u * 6, hh = u * 7, top = F.H * (F.portrait ? 0.035 : 0.04);
    const pill = el('div', `left:${(F.W - bw) / 2 - u * 16}px;top:${top - u * 12}px;width:${bw + u * 32}px;height:${hh + u * 24}px;border-radius:${u * 20}px;background:rgba(12,12,12,.42);z-index:${o.z ?? 870};pointer-events:none`, F.stage);
    pill.dataset.motion = 'skip';
    const accent = o.color ?? (F.theme && F.theme.accent) ?? '#fff', avail = bw - gap * (C.length - 1);
    let x = 0;
    const segs = C.map((c) => { const w = avail * ((c.end - c.start) / total), track = el('div', `left:${u * 16 + x}px;top:${u * 12}px;width:${w}px;height:${hh}px;border-radius:${hh / 2}px;background:rgba(255,255,255,.32);overflow:hidden`, pill), fill = el('div', `left:0;top:0;height:100%;width:0;background:${accent}`, track); x += w + gap; return { c, fill }; });
    const name = el('div', `left:0;right:0;top:${top + hh + u * 22}px;text-align:center;z-index:${o.z ?? 870};pointer-events:none;opacity:0`, F.stage), tag = el('span', `position:relative;display:inline-block;padding:${u * 6}px ${u * 16}px;border-radius:${u * 14}px;background:rgba(12,12,12,.42);color:#fff;font:700 ${u * (o.size ?? 26)}px/1.2 ${o.font ?? (F.theme && F.theme.fonts && F.theme.fonts.sans) ?? 'sans-serif'};white-space:nowrap`, name);
    name.dataset.motion = 'skip';
    F.add((t) => {
      for (const sg of segs) set(sg.fill, { width: `${(Math.max(0, Math.min(1, (t - sg.c.start) / Math.max(0.01, sg.c.end - sg.c.start))) * 100).toFixed(2)}%` });
      const cur = C.find((c) => t >= c.start && t < c.end);
      const k = cur ? Math.min(seg(t, cur.start + 0.2, cur.start + 0.5), 1 - seg(t, cur.start + 2.5, cur.start + 2.9)) : 0;
      if (cur && tag.textContent !== cur.title) tag.textContent = cur.title;
      set(name, { opacity: k.toFixed(3) });
    });
  }

  // With narration (the page loaded timeline.js): F.T is the narration timeline (T.start / T.end / T.word, as in explainer videos); duration lasts at least tail seconds past the narration end (default 1.5);
  //   F.beat still works — two kinds of time on one clock: which word is being said, which beat
  function compose(o) {
    const aspect = new URLSearchParams(location.search).get('aspect') || o.aspect || '16:9';
    const [W, H] = aspect === '9:16' ? [1080, 1920] : aspect === '1:1' ? [1080, 1080] : [1920, 1080];
    const TL = window.TIMELINE, voiced = !!(TL && TL.lines && TL.lines.some((l) => !l.silence));
    const duration = Math.max(o.duration ?? 0, voiced ? TL.duration + (o.tail ?? 1.5) : 0);
    let F;
    EV.composition({
      width: W, height: H, duration,
      build: async ({ stage, T }) => {
        // Animation libraries (SplitText etc.) measure by font at setup: load all declared fonts first (wait at most 12 s)
        await Promise.race([Promise.all([...document.fonts].map((f) => f.load().catch(() => {}))), new Promise((r) => setTimeout(r, 12000))]);
        F = new Film({ ...o, duration, stage, width: W, height: H });
        F.T = T; F.voiced = voiced;
        await o.build(F, { aspect, T });
        if (voiced && o.captions !== false && !F.caps) captions(F, o.captions || {});
        // disclaimer: a small line in a corner for the whole film, only where a style's genre carries one (dossier's "not investment advice",
        //   mystery's "fiction") or the user asks. Never an "unofficial demo / not affiliated" line on a promo (GUIDE).
        //   UI chrome: never a fact claim, never the "unreadable text" warning
        if (o.disclaimer) {
          const d = typeof o.disclaimer === 'string' ? { text: o.disclaimer } : o.disclaimer;
          const e = el('div', `left:${F.px(28)}px;bottom:${F.px(d.bottom ?? 22)}px;z-index:90;white-space:nowrap;font:500 ${F.px(d.size ?? 22)}px/1.3 ${d.font || 'system-ui, "PingFang SC", "Noto Sans SC", sans-serif'};color:rgba(255,255,255,.88);background:rgba(0,0,0,.5);padding:${F.px(5)}px ${F.px(10)}px;border-radius:${F.px(4)}px;pointer-events:none`, F.stage, d.text);
          F.text(e, 'label', d.text, 0, F.duration, { noFact: true, chrome: true, overlap: true });
        }
        if (voiced && o.chapters !== false) chapterBar(F, typeof o.chapters === 'object' ? o.chapters : {});
        // Hand-written films have no rhythm sheet (quick mode lays one out): build one from F.section (name as role), so --check still prints it and it is still compared with measurements after rendering
        if (!window.__rhythm && !voiced && (F.sections || []).length >= 2) {   // a narrated film is paced by its lines, not by a rhythm sheet: no comparison
          const S2 = [...F.sections].sort((a, b) => a.at - b.at);
          window.__rhythm = () => S2.map((x, i) => ({ scene: i + 1, from: Math.round(x.at * 100) / 100, to: Math.round(Math.min(S2[i + 1] ? S2[i + 1].at : F.duration, F.duration) * 100) / 100, role: x.name || ['quiet', 'build', 'build', 'burst'][Math.max(0, Math.min(3, x.energy))], energy: x.energy, kind: x.hit ? 'hit' : '', camera: '', music: [x.build ? M('蓄力', 'build') : '', x.stop ? M('急停', 'stop') : '', x.hit ? M('重击', 'hit') : ''].filter(Boolean).join(' ') }));
        }
        // Density check: 4+ separately registered pieces of text truly visible at the same moment (a hand-built UI, a table, labels on a chart) also counts as an information picture;
        //   quick-mode say / line / list / stat text (cue marked slogan) doesn't count — that's big text and lists
        EV.infoSource((t) => {
          const live = F.texts.filter((x) => !x.slogan && x.kind !== 'caption' && t >= x.win[0] && t < x.win[1]);
          if (live.length < 4) return [];
          F.render(t);
          const seen = (e) => { for (let n = e; n && n !== F.stage; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.15) return false; } return true; };
          return new Set(live.filter((x) => x.el && x.el.isConnected && seen(x.el)).map((x) => x.text)).size >= 4 ? ['layout'] : [];
        });
        for (const f of F.preps || []) await f();
        await Promise.all([...stage.querySelectorAll('img')].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
        // music: { style, key, seed } — the music style follows the product (see scripts/music.mjs); without seed the renderer uses the project folder name
        // moments: key moments on screen (the music follows them: music.mjs's "follow the picture")
        const moments = () => {
          const out = [...(F.cues || [])];
          for (const c of new Set(F.cuts || [])) out.push({ t: c, kind: 'cut' });
          for (const x of F.sfxList) if (['impact', 'boom', 'slam'].includes(x.type)) out.push({ t: x.t, kind: 'hit' });
          // Product name: the logo, or else the first line of the end card
          const byWin = (a, b) => a.win[0] - b.win[0], nm = F.texts.filter((x) => x.kind === 'logo').sort(byWin)[0] ?? F.texts.filter((x) => x.kind === 'endcard').sort(byWin)[0]; if (nm && !out.some((x) => x.kind === 'name')) out.push({ t: nm.win[0], kind: 'name' });
          return out.sort((a, b) => a.t - b.t);
        };
        window.__audioPlan = () => ({ bpm: F.bpm, offset: F.offset, duration: F.duration, music: o.music || {}, sections: F.sections, sfx: F.sfxList, moments: moments(), hush: F.hushes || [] });
        window.__texts = () => [...new Set([...F.texts.filter((x) => x.kind !== 'caption' && !x.noFact).map((x) => x.text), ...(F.facts || [])].filter(Boolean))];
        window.__coverAt = o.cover ?? F._coverAt ?? null; // which frame (seconds) to use as the cover; frame 0 if unset
        window.__textWins = () => [...F.texts.map((x) => ({ text: x.text, kind: x.kind, a: x.win[0], b: x.win[1] })), ...(F.factWins || [])]; // for the review report and the dead-air check
        window.__cuts = () => [...(F.cuts || [])].sort((a, b) => a - b);
        window.__appears = () => [...(F.appears || [])].sort((a, b) => a - b);
        window.__lives = () => [...(F.lives || [])];
        window.__hushes = () => [...(F.hushes || [])];
        window.__stillMax = () => F._stillMax ?? 0.6;
        window.__blurBase = () => F._blurBase ?? null;
        window.__credits = () => F.credits || [];
        window.__transitions = () => [...(F.transitions || [])];
        window.__blurs = () => F.blurs || [];
        window.__motion = (o) => motionScan(F, o);
        return { duration, render: (t) => F.render(t), lint: () => [...lint(F), ...(F.lints || []).flatMap((fn) => fn() || [])], caps: F.caps || [] };
      },
    });
  }

  // Density check (render --check): information components in a style runtime (screenshots, figures, maps, shapes, bars…) register automatically when called (EV.info; times from the at / T / ats / show and until arguments);
  //   information components drawn inside other components (backgrounds, big text, transitions, end card…) don't count (EV.mute). kinds = { component name: kind }; each style runtime calls it before return
  function infoKit(obj, kinds = {}) {
    const timed = (x) => x && typeof x === 'object' && !(x instanceof Node) && ('at' in x || 'T' in x || 'ats' in x || 'show' in x);
    for (const name of Object.keys(obj)) {
      const f = obj[name];
      if (typeof f !== 'function') continue;
      const kind = kinds[name];
      obj[name] = Object.assign(function (...args) {
        const o = args.find(timed), a = o && (o.at ?? (o.T || o.ats || o.show || [])[0]);
        if (kind && typeof a === 'number' && !EV.muted()) EV.info(kind, a, o.until ?? (o.show ? o.show[1] : undefined));
        return EV.mute(() => f.apply(this, args));
      }, f);
    }
    return obj;
  }
  window.PROMO = { M, compose, captions, chapterBar, Film, E, spring, seg, set, el, esc, words, scramble, rgbSplit, develop, pulse, slam, decode, headline, slot, counter, odometer, typing, field, frameT, browser, phone, clip, screen, camera, cursor, reorder, whip, iris, morph, flash, leak, carousel, strips, endcard, gsapTimeline, three, physics, textPath, clamp, lerp };
  // Real UIs in a browser / phone / window, drag-to-reorder demos: information pictures (density check)
  //   Cursor taps (path = [[t, x, y], …], the last may carry a disappear time): act out operations on the UI
  const cursorInfo = (F, parent, path, ...rest) => { const L = path && path[path.length - 1]; if (L && !EV.muted()) EV.info('ui', path[0][0], L[3] ?? L[0] + 0.5); return EV.mute(() => cursor(F, parent, path, ...rest)); };
  Object.assign(window.PROMO, infoKit({ browser, phone, screen, reorder }, { browser: 'ui', phone: 'ui', screen: 'ui', reorder: 'ui' }), { cursor: cursorInfo, infoKit });
})();
