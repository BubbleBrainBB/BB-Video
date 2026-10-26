// map.js: the animated map (地图动画) style, one of bb-video's visual styles (style notes in styles/map/STYLE.md). Load after promo.js.
// One frame: a designed, printed map drawn from real geodata — land on paper, water with engraved water lines along the coast, parks, a fine street
// texture, cartographic labels with halos — and on it the story: routes drawn on stroke by stroke, a marker travelling a line, stations popping in,
// areas spreading like ink, callout cards pinned to places, a year counter, a locator inset. One continuous camera flies between places (zooming out
// and back in for long hops), pans, zooms from the globe to the street, tilts; whatever is being talked about stays lit while the rest dims.
//
//   const G = await PROMO.map(F, { data: GEO.city, ground: 'atlas' | 'chart' | 'night' | { …colours }, projection: 'mercator' | d3 projection name / function,
//                                  base: { land, water, parks, …: layer names in data.layers } | false, waterlines, paper, fonts })
//   await G.world({ countries, states })       coarse world / US layers for zoomed-out views and the globe (world-atlas / us-atlas, pinned, jsDelivr)
//   base     G.layer(features, { role: 'land' | 'water' | 'area' | 'line', fill, stroke, width, dash, alpha, minZoom, maxZoom, at, until, z })
//   lines    const R = G.line(coords | feature | collection, { color, width, casing, dash, offset, at, dur, until, reverse, head, glow, z })   R.draw(at, dur, { from, to, ease })
//   moving   const V = G.travel(R | coords, { at, dur, from, to, ease, marker: 'dot' | 'tram' | 'plane' | 'ship', color, trail, until })   V.where(t)
//   points   G.pins(points, { at, stagger, until, style: 'station' | 'transfer' | 'dot' | 'pin', color, r, labels })
//   areas    G.area(features, { at, until, fill, alpha, stroke })   G.spread(features, { at, dur, from, fill, alpha, until })   G.reach(points, { r: metres, at, stagger })
//   words    G.label(where, text, { kind: 'city' | 'town' | 'district' | 'water' | 'park' | 'station' | 'note', at, until, dir, minZoom, maxZoom, along })
//            G.callout(where, { title, sub, at, until, side })   G.title({ text, sub, at, until, pos })   G.year({ keys: [[t, year]…], at, until, label })
//   furniture G.inset({ at, until, mark | 'view', pos })   G.scale({ at, until })   G.north({ at, until })
//   verbs    G.focus([things], a, b, { dim })   G.camera([{ at, fit: [things], zoom, center, bearing, pitch, dur, room, follow, cut }])
//   transit  G.transit({ lines, stations, key }) → T.line(id) / T.draw(id, at, dur) / T.stations(id, at, o) / T.transfers(at, o) / T.between(id, a, b) / T.station(name)
//   helpers  G.at([lon, lat]) → [x, y] on screen now;  G.draw((ctx, t, G) => …, { z });  G.metres(a, b);  G.onFrame(fn)
// Times: at = there (readable), until = gone; dur = how long a draw / move takes. Sizes are px at 1080 (scaled for portrait / other sizes).
(function () {
  const P = window.PROMO;
  const MSG = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(MSG('map.js 要在 promo.js 之后加载', 'map.js must load after promo.js'));
  const { E, seg, set, el } = P;
  const D2R = Math.PI / 180, clamp01 = (x) => Math.max(0, Math.min(1, x)), r2 = (n) => Math.round(n * 100) / 100;
  const smooth = (a, b, x) => { const q = clamp01((x - a) / (b - a)); return q * q * (3 - 2 * q); };
  const hexRGB = (h) => { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const mixHex = (a, b, q) => { if (q <= 0) return a; if (q >= 1) return b; const x = hexRGB(a), y = hexRGB(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * q)).join(',')})`; };
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const CDN = 'https://cdn.jsdelivr.net/npm/';
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

  // Grounds: a printed map. atlas = warm paper and engraved sea (an old city atlas), chart = cool modern print, night = dark ground with glowing lines
  const GROUNDS = {
    atlas: { bg: '#E9E2D0', land: '#F2EBDA', water: '#C4D8D4', waterline: '#7FA5A6', coast: '#5E8A8E', park: '#D6DDB6', parkEdge: '#AEBC86', campus: '#EBDDC8', airport: '#E4DCCB',
      street: '#E2D5BC', road: '#FBF7EE', roadCase: '#CDBE9F', border: '#B3A386', paper: '#FBF7EE', ink: '#2E2924', label: '#4A4136', muted: '#857864', waterLabel: '#3F6F75', parkLabel: '#5E6E3A',
      veil: '#EFE8D6', accent: '#C23B22', card: '#FBF7EE', cardInk: '#2E2924', globeSea: '#C9DCD8', globeRim: '#9FBDBB', graticule: '#A9C3C0', country: '#BFB39A', highlight: '#E8D4B4', grainBlend: 'multiply', grain: 0.55 },
    chart: { bg: '#E7ECEF', land: '#F5F4F0', water: '#BED3E1', waterline: '#8EAAC0', coast: '#6E8CA6', park: '#DCE6D3', parkEdge: '#B7CBA8', campus: '#ECE7DF', airport: '#E8E6E1',
      street: '#E3E1DA', road: '#FFFFFF', roadCase: '#D3CFC4', border: '#B9B4A8', paper: '#FFFFFF', ink: '#1F2A33', label: '#3B4752', muted: '#7A8691', waterLabel: '#3E6687', parkLabel: '#4F6B45',
      veil: '#EEF1F2', accent: '#E4572E', card: '#FFFFFF', cardInk: '#1F2A33', globeSea: '#C3D6E3', globeRim: '#9DB7CB', graticule: '#A8BFCF', country: '#C4C0B6', highlight: '#F2D3B5', grainBlend: 'multiply', grain: 0.35 },
    night: { bg: '#0E141B', land: '#1A222C', water: '#0F161E', waterline: '#2A3A4A', coast: '#3D5266', park: '#1D2E27', parkEdge: '#2C4537', campus: '#212A33', airport: '#202832',
      street: '#232D39', road: '#2E3946', roadCase: '#151C24', border: '#36424F', paper: '#1A222C', ink: '#ECE6DA', label: '#BFC7D0', muted: '#7D8894', waterLabel: '#6F93AE', parkLabel: '#7FA68C',
      veil: '#0E141B', accent: '#FFB347', card: '#202A35', cardInk: '#ECE6DA', globeSea: '#111B25', globeRim: '#2F465C', graticule: '#22303D', country: '#3A4652', highlight: '#4A3F33', grainBlend: 'screen', grain: 0.22, glow: true },
  };
  const FONTS = { sans: '"Barlow Semi Condensed", "Noto Sans SC", "PingFang SC", sans-serif', serif: '"Crimson Pro", "Noto Serif SC", "Songti SC", serif', zh: '"Noto Sans SC", "PingFang SC", sans-serif', zhSerif: '"Noto Serif SC", "Songti SC", serif' };
  // Label kinds: cartographic convention — settlements upright caps, districts spaced small caps, water italic serif, parks italic
  const KINDS = {
    city: { size: 46, weight: 700, spacing: 0.2, caps: true, color: 'ink', priority: 9 },
    town: { size: 25, weight: 600, spacing: 0.16, caps: true, color: 'label', priority: 6 },
    district: { size: 19, weight: 500, spacing: 0.32, caps: true, color: 'muted', priority: 4 },
    water: { size: 29, weight: 500, spacing: 0.14, italic: true, serif: true, color: 'waterLabel', priority: 5 },
    park: { size: 19, weight: 500, spacing: 0.06, italic: true, color: 'parkLabel', priority: 3 },
    station: { size: 23, weight: 600, spacing: 0.02, color: 'ink', priority: 7 },
    note: { size: 30, weight: 700, spacing: 0.02, color: 'ink', priority: 10, declutter: false },
  };

  P.map = async function (F, opt = {}) {
    const W = F.W, H = F.H, PT = F.portrait, u = F.u;
    const C = { ...(GROUNDS[typeof opt.ground === 'string' ? opt.ground : 'atlas'] || GROUNDS.atlas), ...(typeof opt.ground === 'object' ? opt.ground : {}), ...(opt.colors || {}) };
    const FT = { ...FONTS, ...(opt.fonts || {}) };
    const col = (c) => (c && C[c] !== undefined ? C[c] : c);
    const G = { F, C, fonts: FT, W, H, portrait: PT };
    F.blurBase(opt.blur ?? 1);    // a map moves slowly: one render per frame; fast flies register their own blur spans
    const data = opt.data || null;
    if (data && data.credits) data.credits.forEach((c) => F.credit(c));
    const frameFns = [];
    G.onFrame = (fn) => frameFns.push(fn);

    // ---------- projection: lon / lat → planar "world units" (512 = the world's width at zoom 0, like web maps) ----------
    const projName = opt.projection || 'mercator';
    let fwd;
    if (projName === 'mercator') fwd = (lon, lat) => { const f = Math.max(-85, Math.min(85, lat)) * D2R; return [((lon + 180) / 360) * 512, ((1 - Math.log(Math.tan(Math.PI / 4 + f / 2)) / Math.PI) / 2) * 512]; };
    else {
      if (!window.d3) throw new Error(MSG('非墨卡托投影要 d3：页面里加 <script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js">', 'Projections other than mercator need d3: add <script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"> to the page'));
      const p = typeof projName === 'function' ? projName : d3['geo' + projName[0].toUpperCase() + projName.slice(1)]();
      p.scale(512 / (2 * Math.PI)).translate([256, 256]); if (opt.rotate && p.rotate) p.rotate(opt.rotate);
      fwd = (lon, lat) => p([lon, lat]) || [NaN, NaN];
    }
    const hav = (a, b) => { const R = 6371008.8, f1 = a[1] * D2R, f2 = b[1] * D2R, df = f2 - f1, dl = (b[0] - a[0]) * D2R, h = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
    G.metres = hav;
    // metres per planar unit around a place (for scale bars and radii in metres)
    const mpu = (ll) => { const a = fwd(ll[0] - 0.005, ll[1]), b = fwd(ll[0] + 0.005, ll[1]); return hav([ll[0] - 0.005, ll[1]], [ll[0] + 0.005, ll[1]]) / Math.hypot(b[0] - a[0], b[1] - a[1]); };

    // ---------- geometry: anything → planar parts ----------
    // prep(x) → { type: 'poly' | 'line' | 'point', parts: [Float64Array xy…], ll: [[lon, lat]…] parts, bbox: [x0, y0, x1, y1], props }
    const isLL = (a) => Array.isArray(a) && a.length >= 2 && typeof a[0] === 'number' && typeof a[1] === 'number';
    const flat = (pts) => { const a = new Float64Array(pts.length * 2); pts.forEach((p, i) => { const q = fwd(p[0], p[1]); a[i * 2] = q[0]; a[i * 2 + 1] = q[1]; }); return a; };
    function geomParts(g) {
      switch (g.type) {
        case 'Point': return { type: 'point', ll: [[g.coordinates]] };
        case 'MultiPoint': return { type: 'point', ll: g.coordinates.map((c) => [c]) };
        case 'LineString': return { type: 'line', ll: [g.coordinates] };
        case 'MultiLineString': return { type: 'line', ll: g.coordinates };
        case 'Polygon': return { type: 'poly', ll: g.coordinates };
        case 'MultiPolygon': return { type: 'poly', ll: g.coordinates.flat() };
        case 'GeometryCollection': { const xs = g.geometries.map(geomParts); return { type: xs[0] ? xs[0].type : 'line', ll: xs.flatMap((x) => x.ll) }; }
        default: return { type: 'line', ll: [] };
      }
    }
    function prep(x, props = {}) {
      let gp;
      if (x && x.type === 'Feature') { gp = geomParts(x.geometry); props = x.properties || {}; }
      else if (x && x.type) gp = geomParts(x);
      else if (isLL(x)) gp = { type: 'point', ll: [[x]] };
      else if (Array.isArray(x) && isLL(x[0])) gp = { type: 'line', ll: [x] };
      else if (Array.isArray(x) && Array.isArray(x[0]) && isLL(x[0][0])) gp = { type: 'line', ll: x };
      else throw new Error(MSG('看不懂的地理数据：给 [经度, 纬度]、坐标数组、GeoJSON 要素或要素集', 'Unrecognised geodata: give [lon, lat], a coordinate array, a GeoJSON feature or collection'));
      const parts = gp.ll.map(flat), bb = [Infinity, Infinity, -Infinity, -Infinity];
      for (const a of parts) for (let i = 0; i < a.length; i += 2) { if (a[i] < bb[0]) bb[0] = a[i]; if (a[i] > bb[2]) bb[2] = a[i]; if (a[i + 1] < bb[1]) bb[1] = a[i + 1]; if (a[i + 1] > bb[3]) bb[3] = a[i + 1]; }
      return { type: gp.type, parts, ll: gp.ll, bbox: bb, props, lod: {} };
    }
    const prepAll = (x) => (x && x.type === 'FeatureCollection' ? x.features.map((f) => prep(f)) : Array.isArray(x) && x.length && (x[0].type === 'Feature' || (x[0].type && x[0].coordinates)) ? x.map((f) => prep(f)) : [prep(x)]);
    // simplify in planar units (Douglas–Peucker), cached per zoom bucket: geometry finer than half a pixel is never drawn
    function dpFlat(a, tol, closed) {
      const n = a.length / 2; if (n < 4 || !tol) return a;
      const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1; const st = [0, n - 1], t2 = tol * tol;
      while (st.length) { const b = st.pop(), s = st.pop(); const ax = a[s * 2], ay = a[s * 2 + 1], dx = a[b * 2] - ax, dy = a[b * 2 + 1] - ay, L = dx * dx + dy * dy; let md = 0, mi = -1;
        for (let i = s + 1; i < b; i++) { const x = a[i * 2] - ax, y = a[i * 2 + 1] - ay; let d; if (!L) d = x * x + y * y; else { const q = Math.max(0, Math.min(1, (x * dx + y * dy) / L)); d = (x - q * dx) ** 2 + (y - q * dy) ** 2; } if (d > md) { md = d; mi = i; } }
        if (md > t2) { keep[mi] = 1; st.push(s, mi, mi, b); } }
      let m = 0; for (let i = 0; i < n; i++) if (keep[i]) m++;
      if (closed && m < 4) return null;
      const out = new Float64Array(m * 2); let j = 0; for (let i = 0; i < n; i++) if (keep[i]) { out[j++] = a[i * 2]; out[j++] = a[i * 2 + 1]; }
      return out;
    }
    const lodOf = (f, zb) => f.lod[zb] || (f.lod[zb] = f.parts.map((a) => dpFlat(a, 0.45 / (2 ** zb * u), f.type === 'poly')).filter(Boolean));

    // ---------- camera ----------
    // state: { x, y (planar centre), z (zoom: px per world unit = 2^z · u), b (bearing °, the direction that is up), p (pitch °) }
    const DPERS = 1.5 * H;   // perspective distance for pitch
    let cam = { x: 256, y: 256, z: 2, b: 0, p: 0 }, CM = null;
    const camMat = (s) => { const k = 2 ** s.z * u, br = s.b * D2R, pr = s.p * D2R; return { s, k, cb: Math.cos(br), sb: Math.sin(br), cp: Math.cos(pr), sp: Math.sin(pr), D: DPERS }; };
    let GL = null;   // while the globe shows, overlays and labels are placed on it (orthographic) instead of on the flat map
    const proj = (x, y, m = CM) => {
      if (GL && m === CM) { const ll = invLL(x, y), l = (ll[0] - GL.l0) * D2R, f = ll[1] * D2R, c = GL.sf0 * Math.sin(f) + GL.cf0 * Math.cos(f) * Math.cos(l); if (c < 0.02) return [NaN, NaN, 1]; return [W / 2 + GL.R * Math.cos(f) * Math.sin(l), H / 2 - GL.R * (GL.cf0 * Math.sin(f) - GL.sf0 * Math.cos(f) * Math.cos(l)), 1]; } const dx = (x - m.s.x) * m.k, dy = (y - m.s.y) * m.k, rx = dx * m.cb + dy * m.sb, ry = -dx * m.sb + dy * m.cb; if (!m.s.p) return [W / 2 + rx, H / 2 + ry, 1]; const d = m.D - ry * m.sp; const q = m.D / Math.max(d, m.D * 0.08); return [W / 2 + rx * q, H / 2 + ry * m.cp * q, q]; };
    const unproj = (sx, sy, m = CM) => { const X = sx - W / 2, Y = sy - H / 2; let rx = X, ry = Y; if (m.s.p) { ry = (Y * m.D) / (m.cp * m.D + Y * m.sp); rx = (X * (m.D - ry * m.sp)) / m.D; } const dx = rx * m.cb - ry * m.sb, dy = rx * m.sb + ry * m.cb; return [m.s.x + dx / m.k, m.s.y + dy / m.k]; };
    G.at = (ll) => { const q = fwd(ll[0], ll[1]); const s = proj(q[0], q[1]); return [s[0], s[1]]; };
    // what each thing contributes to a fit / focus check: a list of planar points
    function ptsOf(x, t) {
      if (!x) return [];
      if (x._pts) return x._pts(t);
      if (typeof x === 'string') { const s = G._named(x); return s ? ptsOf(s, t) : []; }
      if (Array.isArray(x) && x.length === 4 && x.every((v) => typeof v === 'number')) return [fwd(x[0], x[1]), fwd(x[2], x[3]), fwd(x[0], x[3]), fwd(x[2], x[1])];
      if (isLL(x)) return [fwd(x[0], x[1])];
      if (Array.isArray(x)) return x.flatMap((y) => ptsOf(y, t));
      const fs = x.type ? prepAll(x) : [];
      const out = []; for (const f of fs) for (const a of f.parts) { const step = Math.max(2, Math.floor(a.length / 400) * 2); for (let i = 0; i < a.length; i += step) out.push([a[i], a[i + 1]]); }
      return out;
    }
    // room left free for chapter bar / captions / platform UI (fractions of the frame)
    const roomDefault = () => ({ top: F.voiced ? (PT ? 0.12 : 0.11) : 0.07, bottom: F.voiced ? (PT ? 0.34 : 0.17) : (PT ? 0.22 : 0.08), left: PT ? 0.07 : 0.06, right: PT ? 0.07 : 0.06 });
    function fitState(things, k0) {
      const pts = ptsOf(things, k0.at ?? 0); if (!pts.length) return null;
      const R = { ...roomDefault(), ...(k0.room || {}) }, pad = k0.pad ?? 1;
      const L = W * R.left, T = H * R.top, Rr = W * (1 - R.right), B = H * (1 - R.bottom);
      const b = (k0.bearing ?? 0) * D2R, cb = Math.cos(b), sb = Math.sin(b);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pts) { const rx = x * cb + y * sb, ry = -x * sb + y * cb; x0 = Math.min(x0, rx); x1 = Math.max(x1, rx); y0 = Math.min(y0, ry); y1 = Math.max(y1, ry); }
      const bw = Math.max(x1 - x0, 1e-7), bh = Math.max(y1 - y0, 1e-7), aw = (Rr - L) / pad, ah = (B - T) / pad;
      let z = Math.log2(Math.min(aw / bw, ah / bh) / u);
      if (k0.min !== undefined) z = Math.max(z, k0.min); if (k0.max !== undefined) z = Math.min(z, k0.max); if (k0.zoom !== undefined && k0.fit) z = Math.min(z, k0.zoom);
      // centre: the box's centre lands on the middle of the free area
      const rcx = (x0 + x1) / 2, rcy = (y0 + y1) / 2, k = 2 ** z * u, ox = ((L + Rr) / 2 - W / 2) / k, oy = ((T + B) / 2 - H / 2) / k;
      const cx = rcx - ox, cy = rcy - oy; // in rotated space → back
      let s = { x: cx * cb - cy * sb, y: cx * sb + cy * cb, z, b: k0.bearing ?? 0, p: k0.pitch ?? 0 };
      if (s.p) for (let it = 0; it < 3; it++) {   // with a tilt the far side shrinks: measure on screen and correct
        const m = camMat(s); let sx0 = Infinity, sy0 = Infinity, sx1 = -Infinity, sy1 = -Infinity;
        for (const [x, y] of pts) { const q = proj(x, y, m); sx0 = Math.min(sx0, q[0]); sx1 = Math.max(sx1, q[0]); sy0 = Math.min(sy0, q[1]); sy1 = Math.max(sy1, q[1]); }
        const f = Math.min((Rr - L) / pad / Math.max(1, sx1 - sx0), (B - T) / pad / Math.max(1, sy1 - sy0));
        s.z = Math.min(s.z + Math.log2(f) * 0.9, k0.max ?? 99);
        const m2 = camMat(s); let cx2 = 0, cy2 = 0; for (const [x, y] of pts) { const q = proj(x, y, m2); cx2 += q[0]; cy2 += q[1]; }
        const mid = [(sx0 + sx1) / 2, (sy0 + sy1) / 2], want = [(L + Rr) / 2, (T + B) / 2];
        const a = unproj(W / 2 + (mid[0] - want[0]), H / 2 + (mid[1] - want[1]), m2); s = { ...s, x: a[0], y: a[1] };
      }
      return s;
    }
    const keys = [];
    G.camera = (list) => {
      for (const k0 of list) {
        const k = { dur: 1.6, ease: E.cubicInOut, drift: 0.03, ...k0 };
        if (k0.ease === undefined && k0.fly !== false) k.ease = E.sine;
        keys.push(k);
      }
      keys.sort((a, b) => a.at - b.at);
      keys.forEach((k, i) => { k.idx = i; });
      return G;
    };
    // the target of a key (followers move: evaluated at t)
    const targetOf = (k, t, prevZ = 10) => {
      if (k.follow) { const pl = k.follow._planar(t); if (!pl) return null; return { x: pl[0], y: pl[1], z: k.zoom ?? prevZ, b: k.bearing ?? 0, p: k.pitch ?? 0 }; }
      if (k.fit) { if (!k._fit || k.fit.some((x) => x && x._pts && x._moving)) k._fit = fitState(k.fit, k); return k._fit; }
      if (k.center) { const q = fwd(k.center[0], k.center[1]); return { x: q[0], y: q[1], z: k.zoom ?? prevZ, b: k.bearing ?? 0, p: k.pitch ?? 0 }; }
      return null;
    };
    // van Wijk & Nuij smooth zoom-pan: long hops zoom out, travel, zoom in; short ones are a plain glide
    function flyPath(a, b) {
      const rho = Math.SQRT2, w0 = W / (2 ** a.z * u), w1 = W / (2 ** b.z * u), dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 < 1e-12) { const S = Math.log(w1 / w0) / rho; return { S: Math.abs(S), at: (q) => ({ x: a.x + q * dx, y: a.y + q * dy, w: w0 * Math.exp(rho * q * S) }) }; }
      const d1 = Math.sqrt(d2), b0 = (w1 * w1 - w0 * w0 + rho ** 4 * d2) / (2 * w0 * rho * rho * d1), b1 = (w1 * w1 - w0 * w0 - rho ** 4 * d2) / (2 * w1 * rho * rho * d1);
      const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1), S = (r1 - r0) / rho, ch = Math.cosh(r0);
      return { S, at: (q) => { const s = q * S, uu = (w0 / (rho * rho * d1)) * (ch * Math.tanh(rho * s + r0) - Math.sinh(r0)); return { x: a.x + uu * dx, y: a.y + uu * dy, w: (w0 * ch) / Math.cosh(rho * s + r0) }; } };
    }
    const angLerp = (a, b, q) => { const d = ((b - a + 540) % 360) - 180; return a + d * q; };
    // the camera at t: key i is active from its `at` to the next key's; it glides from where the camera was at its start to its target, then holds (drifting)
    const holdAt = (s, from, t, k) => ({ ...s, z: s.z + (k.drift ?? 0.03) * Math.max(0, t - from) });   // a held map keeps drifting in slowly: never a still picture
    const startOf = new Map();
    function segAt(i, t) {
      const k = keys[i];
      if (i === 0) { const s0 = targetOf(k, t, cam.z) || cam; return k.follow ? s0 : holdAt(s0, k.at, t, k); }
      if (!startOf.has(i)) startOf.set(i, segAt(i - 1, k.at));
      const from = startOf.get(i), end = k.at + k.dur;
      if (k.cut) { const to = targetOf(k, t, from.z); return to ? (k.follow ? to : holdAt(to, k.at, t, k)) : from; }
      const to = targetOf(k, k.follow ? t : Math.min(t, end), from.z); if (!to) return from;
      if (t >= end) return k.follow ? to : holdAt(to, end, t, k);
      const q = k.ease(clamp01((t - k.at) / k.dur));
      let v;
      if (k.fly === false) v = { x: from.x + (to.x - from.x) * q, y: from.y + (to.y - from.y) * q, w: W / (2 ** (from.z + (to.z - from.z) * q) * u) };
      else { const key = `${from.x},${from.y},${from.z},${to.x},${to.y},${to.z}`; if (k._fpKey !== key) { k._fp = flyPath(from, to); k._fpKey = key; } v = k._fp.at(q); }
      return { x: v.x, y: v.y, z: Math.log2(W / (v.w * u)), b: angLerp(from.b, to.b, q), p: from.p + (to.p - from.p) * q };
    }
    function camAt(t) {
      if (!keys.length) return cam;
      let i = 0; while (i + 1 < keys.length && keys[i + 1].at <= t) i++;
      return segAt(i, t);
    }
    // speed of the camera (fast flies get motion blur and are told to the frame check)
    G.view = (t) => camAt(t);

    // ---------- layers: canvas (the map), overlay (words), svg (leaders, curved labels), paper texture ----------
    const root = F.layer(`background:${C.bg}`, 1);
    const cv = el('canvas', `left:0;top:0;width:${W}px;height:${H}px`, root); cv.width = W; cv.height = H; cv.dataset.motion = 'skip';
    const ctx = cv.getContext('2d');
    const mask = document.createElement('canvas'); mask.width = W; mask.height = H; const mctx = mask.getContext('2d', { willReadFrequently: true });
    const blurC = document.createElement('canvas'); blurC.width = W; blurC.height = H; const bctx = blurC.getContext('2d', { willReadFrequently: true });
    const linesC = document.createElement('canvas'); linesC.width = W; linesC.height = H; const lctx = linesC.getContext('2d');
    const off = document.createElement('canvas'); off.width = W; off.height = H; const octx = off.getContext('2d');
    const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:3' }, root);
    const over = el('div', `inset:0;z-index:4;pointer-events:none`, root);
    G.canvas = cv; G.overlay = over; G.svg = svg;

    // paper: grain + fibres + soft mottling, made once (the medium, not part of the map: it does not move with the camera)
    if (opt.paper !== false) {
      const pc = el('canvas', `left:0;top:0;width:${W}px;height:${H}px;z-index:6;pointer-events:none;mix-blend-mode:${C.grainBlend};opacity:${(opt.paper ?? 1) * C.grain}`, root); pc.dataset.motion = 'skip';
      const S = 2; pc.width = Math.ceil(W / S); pc.height = Math.ceil(H / S);
      const p = pc.getContext('2d'), img = p.createImageData(pc.width, pc.height), rr = window.EV.rng(4242), night = C.grainBlend === 'screen';
      const lowW = 24, lowH = 14, low = []; for (let i = 0; i < lowW * lowH; i++) low.push(rr());
      const lowAt = (x, y) => { const fx = (x / pc.width) * (lowW - 1), fy = (y / pc.height) * (lowH - 1), ix = Math.floor(fx), iy = Math.floor(fy), ax = fx - ix, ay = fy - iy, g = (i, j) => low[Math.min(lowH - 1, j) * lowW + Math.min(lowW - 1, i)]; return g(ix, iy) * (1 - ax) * (1 - ay) + g(ix + 1, iy) * ax * (1 - ay) + g(ix, iy + 1) * (1 - ax) * ay + g(ix + 1, iy + 1) * ax * ay; };
      for (let y = 0; y < pc.height; y++) for (let x = 0; x < pc.width; x++) {
        const i = (y * pc.width + x) * 4, n = rr(), m = lowAt(x, y);
        const v = night ? 255 - 255 * (0.02 + 0.06 * n * n + 0.05 * m) : 255 - 255 * (0.035 + 0.07 * n * n + 0.07 * m);
        img.data[i] = night ? 255 - v : v; img.data[i + 1] = night ? 255 - v : v - 2; img.data[i + 2] = night ? 255 - v : v - 6; img.data[i + 3] = 255;
      }
      p.putImageData(img, 0, 0);
      p.globalAlpha = night ? 0.1 : 0.16; p.strokeStyle = night ? '#fff' : '#8a7b62'; p.lineWidth = 0.6;
      for (let k = 0; k < 900; k++) { const x = rr() * pc.width, y = rr() * pc.height, a = rr() * Math.PI * 2, l = 4 + rr() * 16; p.beginPath(); p.moveTo(x, y); p.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); p.stroke(); }
      const vg = el('div', `inset:0;z-index:6;pointer-events:none;background:radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 58%, ${night ? 'rgba(0,0,0,.45)' : 'rgba(70,52,30,.16)'} 100%)`, root); vg.dataset.motion = 'skip';
    }

    // ---------- base layers ----------
    // role: land (filled, part of the coast mask), water (filled, cuts the coast mask), area (a tint: parks…), line (streets, roads, borders)
    const layers = [];
    G.layer = (src, o = {}) => {
      const L = { role: o.role || 'area', feats: prepAll(src), fill: col(o.fill), stroke: col(o.stroke), width: o.width ?? 1, dash: o.dash, alpha: o.alpha ?? 1, minZoom: o.minZoom ?? -99, maxZoom: o.maxZoom ?? 99, at: o.at ?? -1, until: o.until ?? 1e9, z: o.z ?? layers.length, casing: col(o.casing), caseWidth: o.caseWidth ?? 0, name: o.name || '' };
      layers.push(L); layers.sort((a, b) => a.z - b.z);
      return L;
    };
    const base = opt.base === false ? null : { land: 'land', water: 'water', parks: 'parks', campus: 'campus', airport: 'airport', streets: 'streets', roads: 'roads', ...(opt.base || {}) };
    if (data && base) {
      const D = data.layers || {}, has = (n) => n && D[n] && D[n].features && D[n].features.length;
      // a role may name several layers (land from two sources…): each is drawn with that role's look
      const each = (role, fn) => [].concat(base[role] || []).forEach((n) => { if (has(n)) fn(D[n], n); });
      each('land', (d, n) => G.layer(d, { role: 'land', fill: 'land', z: 0, name: n }));
      each('water', (d, n) => G.layer(d, { role: 'water', fill: 'water', z: 1, name: n }));
      each('airport', (d, n) => G.layer(d, { fill: 'airport', z: 2, name: n }));
      each('campus', (d, n) => G.layer(d, { fill: 'campus', z: 2, name: n, minZoom: 11.5 }));
      each('parks', (d, n) => G.layer(d, { fill: 'park', stroke: 'parkEdge', width: 0.8, z: 3, name: n, minZoom: 10.5 }));
      each('streets', (d, n) => G.layer(d, { role: 'line', stroke: 'street', width: 0.7, z: 4, name: n, minZoom: 12.2 }));
      each('roads', (d, n) => G.layer(d, { role: 'line', stroke: 'road', casing: 'roadCase', width: 1.6, caseWidth: 0.9, z: 5, name: n, minZoom: 10.6 }));
    }
    G.layers = layers;
    // the extent of the detailed data: outside it (and when zoomed far out) the coarse world layer shows
    const dataBox = data && data.bbox ? (() => { const a = fwd(data.bbox[0], data.bbox[3]), b = fwd(data.bbox[2], data.bbox[1]); return [a[0], a[1], b[0], b[1]]; })() : null;

    // ---------- coarse world (globe / continent / state views) ----------
    let world = null, d3g = null;
    G.world = async (o = {}) => {
      if (!window.d3 || !window.topojson) throw new Error(MSG('G.world 要 d3 和 topojson-client：页面里加 d3@7.9.0 和 topojson-client@3.1.0（起始页已经有）', 'G.world needs d3 and topojson-client: add d3@7.9.0 and topojson-client@3.1.0 to the page (the starter pages have them)'));
      const get = async (p) => { const r = await fetch(CDN + p); if (!r.ok) throw new Error(MSG(`取不到 ${p}`, `Could not load ${p}`)); return r.json(); };
      const res = o.detail === '110m' ? '110m' : '50m';
      const [wt, us] = await Promise.all([get(`world-atlas@2.0.2/countries-${res}.json`), o.states === false ? null : get('us-atlas@3.0.1/states-10m.json')]);
      const countries = topojson.feature(wt, wt.objects.countries), land = topojson.feature(wt, wt.objects.land);
      const borders = topojson.mesh(wt, wt.objects.countries, (a, b) => a !== b);
      const states = us ? topojson.mesh(us, us.objects.states, (a, b) => a !== b) : null;
      world = { countries, land, borders, states, landF: prepAll(land), bordersF: prepAll(borders), statesF: states ? prepAll(states) : [], highlight: [] };
      d3g = d3;
      F.credit({ title: `Natural Earth 1:${res === '50m' ? '50' : '110'}m (world-atlas@2.0.2)`, author: 'Natural Earth', licence: 'Public domain', url: 'https://www.naturalearthdata.com/' });
      if (us) F.credit({ title: 'U.S. states (us-atlas@3.0.1, from Census cartographic boundaries)', author: 'U.S. Census Bureau', licence: 'Public domain', url: 'https://github.com/topojson/us-atlas' });
      return world;
    };
    // tint a country on the globe / world layer: G.country('United States of America', { at, until, fill })
    const countryTints = [];
    G.country = (name, o = {}) => { const f = world && world.countries.features.find((c) => c.properties.name === name); if (!f) throw new Error(MSG(`找不到国家：${name}（先 await G.world()，名字用英文，如 United States of America）`, `No such country: ${name} (await G.world() first; English names such as United States of America)`)); countryTints.push({ f, pf: prep(f), at: o.at ?? 0, until: o.until ?? 1e9, fill: col(o.fill ?? 'highlight') }); return G; };
    const GLOBE_Z = opt.globeZoom ?? 5.4;   // below this zoom the world is drawn as a globe

    // ---------- overlays (drawn on the canvas above the base map) ----------
    const overlays = [];   // { z, draw(ctx, t, ...), focusable, _pts }
    const addOverlay = (o) => { overlays.push(o); return o; };
    G.draw = (fn, o = {}) => addOverlay({ z: o.z ?? 50, draw: (c, t) => fn(c, t, G), _pts: () => [] });

    // --- lines: drawn on stroke by stroke ---
    G.line = (src, o = {}) => {
      const fs = prepAll(src).filter((f) => f.type !== 'point'), parts = [];
      for (const f of fs) for (let pi = 0; pi < f.parts.length; pi++) {
        let a = f.parts[pi], ll = f.ll[pi]; if (o.reverse) { const n = a.length / 2, b = new Float64Array(a.length); for (let i = 0; i < n; i++) { b[i * 2] = a[(n - 1 - i) * 2]; b[i * 2 + 1] = a[(n - 1 - i) * 2 + 1]; } a = b; ll = ll.slice().reverse(); }
        const n = a.length / 2, cum = new Float64Array(n); for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(a[i * 2] - a[i * 2 - 2], a[i * 2 + 1] - a[i * 2 - 1]);
        parts.push({ a, ll, cum, len: cum[n - 1] });
      }
      const maxLen = Math.max(...parts.map((p) => p.len), 1e-12);
      const R = {
        kind: 'line', parts, color: col(o.color ?? 'accent'), width: o.width ?? 6, casing: o.casing === false ? 0 : o.casing ?? 2.2, caseColor: col(o.caseColor ?? 'paper'), dash: o.dash, offset: o.offset ?? 0,
        alpha: o.alpha ?? 1, at: o.at ?? 0, until: o.until ?? 1e9, z: o.z ?? 20, head: o.head !== false, glow: o.glow ?? !!C.glow, spans: [], name: o.name || '', sync: o.sync || 'length',
      };
      // progress along the line at t: 0–1 (no draw span = all of it, fading in at `at`)
      R.q = (t) => { if (t < R.at || t >= R.until) return null; if (!R.spans.length) return { from: 0, to: 1, fade: Math.min(1, (t - R.at) / 0.35, (R.until - t) / 0.35) }; let best = null; for (const s of R.spans) { if (t < s.at) continue; const q = s.ease(clamp01((t - s.at) / s.dur)); const v = { from: s.from, to: s.from + (s.to - s.from) * q, live: q < 1, fade: Math.min(1, (R.until - t) / 0.35) }; best = v; } return best; };
      R.draw = (at, dur = 1.5, o2 = {}) => {
        R.spans.push({ at, dur, from: o2.from ?? 0, to: o2.to ?? 1, ease: o2.ease ?? E.cubicInOut }); R.spans.sort((a, b) => a.at - b.at); if (R.at > at) R.at = at;
        if (o2.sfx !== false) F.sfx(at, 'draw', o2.gain ?? 0.5, { dur }); F.info('route', at, R.until, { group: o2.group ?? (R.name || 'route') });
        return R;
      };
      // a point along the line: u = 0–1 of the longest part (lon / lat)
      R.planarAt = (uu, part = null) => { const p = part ?? parts.reduce((a, b) => (b.len > a.len ? b : a)); const d = clamp01(uu) * p.len; let i = 1; while (i < p.cum.length - 1 && p.cum[i] < d) i++; const s = (d - p.cum[i - 1]) / Math.max(1e-12, p.cum[i] - p.cum[i - 1]); return [p.a[i * 2 - 2] + (p.a[i * 2] - p.a[i * 2 - 2]) * s, p.a[i * 2 - 1] + (p.a[i * 2 + 1] - p.a[i * 2 - 1]) * s, Math.atan2(p.a[i * 2 + 1] - p.a[i * 2 - 1], p.a[i * 2] - p.a[i * 2 - 2])]; };
      // the line changes colour over time (ink → its colour when it gets one): R.recolor(at, colour, dur)
      R.tints = [];
      R.recolor = (at, to, dur = 0.8) => { R.tints.push({ at, to: col(to), dur }); R.tints.sort((a, b) => a.at - b.at); return R; };
      R.colorAt = (t) => { let c = R.color; for (const k of R.tints) { if (t < k.at) break; c = mixHex(c, k.to, E.sine(clamp01((t - k.at) / k.dur))); } return c; };
      R.lengthMetres = () => parts.reduce((s, p) => s + p.len * mpu(p.ll[Math.floor(p.ll.length / 2)]), 0);
      R._pts = (t) => { const out = []; for (const p of parts) { const step = Math.max(2, Math.floor(p.a.length / 300) * 2); for (let i = 0; i < p.a.length; i += step) out.push([p.a[i], p.a[i + 1]]); out.push([p.a[p.a.length - 2], p.a[p.a.length - 1]]); } return out; };
      R.headAt = (t) => { const q = R.q(t); if (!q) return null; const p = parts.reduce((a, b) => (b.len > a.len ? b : a)); return R.planarAt(R.sync === 'length' ? Math.min(1, (q.to * maxLen) / p.len) : q.to, p); };
      // projected polyline of a part between two lengths (planar units), with an optional sideways offset in px
      const path = (p, d0, d1) => {
        const out = [], n = p.cum.length; if (d1 <= d0) return out;
        let i = 1; while (i < n - 1 && p.cum[i] <= d0) i++;
        const lerpPt = (j, d) => { const s = (d - p.cum[j - 1]) / Math.max(1e-12, p.cum[j] - p.cum[j - 1]); return proj(p.a[j * 2 - 2] + (p.a[j * 2] - p.a[j * 2 - 2]) * s, p.a[j * 2 - 1] + (p.a[j * 2 + 1] - p.a[j * 2 - 1]) * s); };
        out.push(lerpPt(i, d0));
        const step = Math.max(1, Math.floor(n / 4000));
        for (; i < n && p.cum[i] < d1; i += step) out.push(proj(p.a[i * 2], p.a[i * 2 + 1]));
        let j = 1; while (j < n - 1 && p.cum[j] < d1) j++; out.push(lerpPt(j, Math.min(d1, p.len)));
        if (R.offset) { const o = R.offset * u, res = []; for (let k = 0; k < out.length; k++) { const a = out[Math.max(0, k - 1)], b = out[Math.min(out.length - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; res.push([out[k][0] - (dy / l) * o, out[k][1] + (dx / l) * o]); } return res; }
        return out;
      };
      R._screen = (t) => { const q = R.q(t); if (!q) return []; return parts.map((p) => { const [s0, s1] = R.sync === 'length' ? [q.from * maxLen, Math.min(p.len, q.to * maxLen)] : [q.from * p.len, q.to * p.len]; return path(p, s0, s1); }).filter((l) => l.length > 1); };
      R.draw_ = (c, t, emph = 1) => {
        const q = R.q(t); if (!q) return; const lines = R._screen(t); if (!lines.length) return;
        const a = R.alpha * clamp01(q.fade) * emph, w = R.width * u, cw = R.casing * u;
        c.save(); c.globalAlpha = a; c.lineJoin = 'round'; c.lineCap = R.dash ? 'butt' : 'round';
        const trace = (l) => { c.beginPath(); c.moveTo(l[0][0], l[0][1]); for (let i = 1; i < l.length; i++) c.lineTo(l[i][0], l[i][1]); };
        if (cw > 0) { c.strokeStyle = R.caseColor; c.lineWidth = w + cw * 2; c.setLineDash([]); for (const l of lines) { trace(l); c.stroke(); } }
        const rc = R.tints.length ? R.colorAt(t) : R.color;
        if (R.glow) { c.shadowColor = rc; c.shadowBlur = w * 1.6; }
        c.strokeStyle = rc; c.lineWidth = w; c.setLineDash(R.dash ? R.dash.map((d) => d * u) : []);
        for (const l of lines) { trace(l); c.stroke(); }
        c.restore();
        // the pen: a bright dot at the head while it is being drawn
        if (q.live && R.head) { c.save(); c.globalAlpha = a; for (const l of lines) { const e = l[l.length - 1]; c.fillStyle = R.caseColor; c.beginPath(); c.arc(e[0], e[1], w * 0.95 + cw, 0, 7); c.fill(); c.fillStyle = rc; c.beginPath(); c.arc(e[0], e[1], w * 0.95, 0, 7); c.fill(); } c.restore(); }
      };
      addOverlay({ z: R.z, draw: (c, t, e) => R.draw_(c, t, e), _owner: R });
      lines.push(R);
      if (o.dur !== undefined) R.draw(o.at ?? 0, o.dur, { sfx: o.sfx, ease: o.ease });
      else F.info('route', R.at, R.until, { group: R.name || 'route' });
      return R;
    };
    const lines = [];

    // --- travel: a marker running along a line ---
    const movers = [];
    G.travel = (src, o = {}) => {
      const R = src && src.kind === 'line' ? src : G.line(src, { color: o.trail ? o.trail.color ?? o.color : o.color, width: o.trail ? o.trail.width ?? 5 : 5, at: o.at, until: o.until, alpha: o.trail ? 1 : 0, head: false, z: (o.z ?? 30) - 1 });
      const V = { kind: 'mover', R, at: o.at ?? 0, dur: o.dur ?? 3, from: o.from ?? 0, to: o.to ?? 1, ease: o.ease ?? E.cubicInOut, until: o.until ?? 1e9, marker: o.marker || 'dot', color: col(o.color ?? 'accent'), size: o.size ?? 1, z: o.z ?? 30, _moving: true };
      // stops: [[t, u | [lon, lat]]…] — the marker reaches each place at its time (eased between stops): arrive on the word
      if (o.stops) {
        const uOf = (x) => { if (typeof x === 'number') return x; const xy = fwd(x[0], x[1]), p = R.parts.reduce((a, b) => (b.len > a.len ? b : a)); let best = Infinity, bi = 0; for (let i = 0; i < p.cum.length; i++) { const d = (p.a[i * 2] - xy[0]) ** 2 + (p.a[i * 2 + 1] - xy[1]) ** 2; if (d < best) { best = d; bi = i; } } return p.cum[bi] / p.len; };
        V.stops = o.stops.map(([t, x]) => [t, uOf(x)]).sort((a, b) => a[0] - b[0]); V.at = V.stops[0][0]; V.dur = V.stops[V.stops.length - 1][0] - V.at; V.from = V.stops[0][1]; V.to = V.stops[V.stops.length - 1][1];
      }
      V.u = (t) => { if (V.stops) { const S = V.stops; if (t <= S[0][0]) return S[0][1]; for (let i = 1; i < S.length; i++) if (t < S[i][0]) return S[i - 1][1] + (S[i][1] - S[i - 1][1]) * V.ease(clamp01((t - S[i - 1][0]) / (S[i][0] - S[i - 1][0]))); return S[S.length - 1][1]; } return V.from + (V.to - V.from) * V.ease(clamp01((t - V.at) / V.dur)); };
      // the trail is drawn exactly as far as the marker has gone
      if (o.trail && src && src.kind !== 'line') { R.at = V.at; R.q = (t) => (t < V.at || t >= R.until ? null : { from: Math.min(V.from, V.u(t)), to: Math.max(V.from, V.u(t)), live: false, fade: Math.min(1, (R.until - t) / 0.35) }); }
      V._planar = (t) => R.planarAt(V.u(t));
      V.where = (t) => { const p = V._planar(t); return p; };
      V._pts = (t) => { const p = V._planar(t); return [[p[0], p[1]]]; };
      V.draw_ = (c, t, emph = 1) => {
        if (t < V.at - 0.25 || t >= V.until) return;
        const p = V._planar(t), s = proj(p[0], p[1]), fa = clamp01((t - V.at + 0.25) / 0.25) * clamp01((V.until - t) / 0.3) * emph, sz = V.size * u * s[2] ** 0.5;
        // heading on screen
        const p2 = R.planarAt(Math.min(1, V.u(t) + 0.002 * Math.sign(V.to - V.from || 1))), s2 = proj(p2[0], p2[1]); let ang = Math.atan2(s2[1] - s[1], s2[0] - s[0]); if (V.to < V.from) ang += Math.PI;
        c.save(); c.globalAlpha = fa; c.translate(s[0], s[1]);
        if (V.marker === 'dot') {
          const pr = (t * 1.4) % 1; c.fillStyle = V.color; c.globalAlpha = fa * (1 - pr) * 0.35; c.beginPath(); c.arc(0, 0, sz * (10 + 18 * pr), 0, 7); c.fill();
          c.globalAlpha = fa; c.fillStyle = C.paper; c.beginPath(); c.arc(0, 0, sz * 10, 0, 7); c.fill(); c.fillStyle = V.color; c.beginPath(); c.arc(0, 0, sz * 7, 0, 7); c.fill();
        } else if (V.marker === 'tram' || V.marker === 'train') {
          c.rotate(ang); const L = sz * (V.marker === 'train' ? 34 : 24), Wd = sz * 11;
          c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = sz * 6; c.shadowOffsetY = sz * 2;
          c.fillStyle = C.paper; rrect(c, -L / 2 - sz * 2.5, -Wd / 2 - sz * 2.5, L + sz * 5, Wd + sz * 5, Wd * 0.5 + sz * 2.5); c.fill(); c.shadowColor = 'transparent';
          c.fillStyle = V.color; rrect(c, -L / 2, -Wd / 2, L, Wd, Wd * 0.45); c.fill();
          c.fillStyle = C.paper; c.globalAlpha = fa * 0.85; for (let k = -1; k <= 1; k++) { rrect(c, k * L * 0.27 - L * 0.09, -Wd * 0.22, L * 0.18, Wd * 0.44, Wd * 0.12); c.fill(); }
        } else if (V.marker === 'plane') {
          c.rotate(ang); const s0 = sz * 16; c.fillStyle = V.color; c.strokeStyle = C.paper; c.lineWidth = sz * 2.4; c.beginPath();
          c.moveTo(s0, 0); c.lineTo(-s0 * 0.2, -s0 * 0.12); c.lineTo(-s0 * 0.35, -s0 * 0.9); c.lineTo(-s0 * 0.55, -s0 * 0.9); c.lineTo(-s0 * 0.5, -s0 * 0.12); c.lineTo(-s0, -s0 * 0.1); c.lineTo(-s0 * 1.1, -s0 * 0.42); c.lineTo(-s0 * 1.2, -s0 * 0.42); c.lineTo(-s0 * 1.15, 0);
          c.lineTo(-s0 * 1.2, s0 * 0.42); c.lineTo(-s0 * 1.1, s0 * 0.42); c.lineTo(-s0, s0 * 0.1); c.lineTo(-s0 * 0.5, s0 * 0.12); c.lineTo(-s0 * 0.55, s0 * 0.9); c.lineTo(-s0 * 0.35, s0 * 0.9); c.lineTo(-s0 * 0.2, s0 * 0.12); c.closePath(); c.stroke(); c.fill();
        } else if (V.marker === 'ship') {
          c.rotate(ang); const s0 = sz * 14; c.fillStyle = V.color; c.strokeStyle = C.paper; c.lineWidth = sz * 2.4; c.beginPath(); c.moveTo(s0, 0); c.quadraticCurveTo(s0 * 0.4, -s0 * 0.55, -s0, -s0 * 0.45); c.lineTo(-s0, s0 * 0.45); c.quadraticCurveTo(s0 * 0.4, s0 * 0.55, s0, 0); c.closePath(); c.stroke(); c.fill();
        } else if (typeof V.marker === 'function') V.marker(c, sz, t, ang);
        c.restore();
      };
      addOverlay({ z: V.z, draw: (c, t, e) => V.draw_(c, t, e), _owner: V });
      movers.push(V);
      if (o.sfx !== false) F.sfx(V.at, o.sfx || 'travel', o.gain ?? 0.35, { dur: V.dur });
      F.info('route', V.at, Math.min(V.until, V.at + V.dur + 1), { group: 'travel' });
      return V;
    };
    function rrect(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

    // --- pins / stations: pop in one after another ---
    const pinSets = [];
    const toPoints = (src) => {
      if (src && src.type === 'FeatureCollection') return src.features.map((f) => ({ ll: f.geometry.coordinates, name: f.properties && f.properties.name, props: f.properties || {} }));
      return [].concat(src).map((p) => (isLL(p) ? { ll: p } : p.type === 'Feature' ? { ll: p.geometry.coordinates, name: p.properties && p.properties.name, props: p.properties || {} } : { ll: p.ll || p.coord, name: p.name, props: p, at: p.time }));
    };
    G.pins = (src, o = {}) => {
      const pts = toPoints(src).map((p, i) => ({ ...p, xy: fwd(p.ll[0], p.ll[1]), t0: p.at ?? (o.at ?? 0) + i * (o.stagger ?? 0.12) }));
      const S = { kind: 'pins', pts, style: o.style || 'station', color: col(o.color ?? 'ink'), r: o.r ?? (o.style === 'transfer' ? 9.5 : o.style === 'dot' ? 6 : 6.5), until: o.until ?? 1e9, z: o.z ?? 40, ring: col(o.ring ?? 'paper'), at: o.at ?? 0 };
      S._pts = () => pts.map((p) => p.xy);
      S.draw_ = (c, t, emph = 1) => {
        if (t >= S.until) return;
        const fo = clamp01((S.until - t) / 0.3);
        for (const p of pts) {
          if (t < p.t0) continue;
          const q = seg(t, p.t0, p.t0 + 0.38, E.backOut), s = proj(p.xy[0], p.xy[1]); if (s[0] < -50 || s[0] > W + 50 || s[1] < -50 || s[1] > H + 50) continue;
          const r = S.r * u * q * Math.max(0.6, s[2] ** 0.5), col0 = p.props && p.props.color ? p.props.color : S.color;
          c.save(); c.globalAlpha = fo * emph;
          const pr = seg(t, p.t0, p.t0 + 0.7); if (pr < 1) { c.globalAlpha = fo * emph * (1 - pr) * 0.5; c.strokeStyle = col0; c.lineWidth = 2 * u; c.beginPath(); c.arc(s[0], s[1], S.r * u * (1 + 2.2 * pr), 0, 7); c.stroke(); c.globalAlpha = fo * emph; }
          if (S.style === 'dot') { c.fillStyle = S.ring; c.beginPath(); c.arc(s[0], s[1], r + 2 * u, 0, 7); c.fill(); c.fillStyle = col0; c.beginPath(); c.arc(s[0], s[1], r, 0, 7); c.fill(); }
          else if (S.style === 'pin') { c.fillStyle = col0; c.strokeStyle = S.ring; c.lineWidth = 2.5 * u; const R0 = r * 1.6; c.beginPath(); c.moveTo(s[0], s[1]); c.bezierCurveTo(s[0] - R0 * 0.2, s[1] - R0 * 0.8, s[0] - R0, s[1] - R0 * 1.4, s[0], s[1] - R0 * 2.2); c.bezierCurveTo(s[0] + R0, s[1] - R0 * 1.4, s[0] + R0 * 0.2, s[1] - R0 * 0.8, s[0], s[1]); c.fill(); c.stroke(); c.fillStyle = S.ring; c.beginPath(); c.arc(s[0], s[1] - R0 * 1.5, R0 * 0.32, 0, 7); c.fill(); }
          else { c.fillStyle = S.ring; c.strokeStyle = S.style === 'transfer' ? C.ink : col0; c.lineWidth = (S.style === 'transfer' ? 3.2 : 2.6) * u * q; c.beginPath(); c.arc(s[0], s[1], r, 0, 7); c.fill(); c.stroke(); }
          c.restore();
        }
      };
      addOverlay({ z: S.z, draw: (c, t, e) => S.draw_(c, t, e), _owner: S });
      pinSets.push(S);
      pts.forEach((p, i) => { if (i < 3 || i % 3 === 0) F.sfx(p.t0, 'pop', (o.gain ?? 0.4) * (i ? 0.75 : 1)); });
      if (pts.length) F.info('mark', pts[0].t0, S.until, { group: o.group || 'pins' });
      if (o.labels) { const lo = typeof o.labels === 'object' ? o.labels : {}; pts.forEach((p) => { if (!p.name || (lo.only && !lo.only.includes(p.name))) return; const d = (lo.dirs && lo.dirs[p.name]) || lo.dir || 'e'; G.label(p.ll, (lo.text && lo.text[p.name]) || p.name, { kind: lo.kind || 'station', at: p.t0 + 0.15, until: S.until, dir: d, of: S, size: lo.size, minZoom: lo.minZoom, dx: (lo.dx || {})[p.name], dy: (lo.dy || {})[p.name], sub: (lo.sub || {})[p.name] }); }); }
      return S;
    };

    // --- areas: a tint, an ink spread, reach circles ---
    G.area = (src, o = {}) => {
      const A = { kind: 'area', feats: prepAll(src), fill: col(o.fill ?? 'accent'), alpha: o.alpha ?? 0.35, stroke: col(o.stroke ?? o.fill ?? 'accent'), width: o.width ?? 2, at: o.at ?? 0, until: o.until ?? 1e9, z: o.z ?? 10, hatch: o.hatch };
      A._pts = () => A.feats.flatMap((f) => ptsOf(f));
      A.draw_ = (c, t, emph = 1) => { if (t < A.at || t >= A.until) return; const a = Math.min(seg(t, A.at, A.at + 0.5), clamp01((A.until - t) / 0.4)) * emph; c.save(); c.globalAlpha = a; polyPath(c, A.feats, camZB); c.fillStyle = A.fill; c.globalAlpha = a * A.alpha; c.fill('evenodd'); if (A.width) { c.globalAlpha = a; c.strokeStyle = A.stroke; c.lineWidth = A.width * u; c.stroke(); } c.restore(); };
      addOverlay({ z: A.z, draw: (c, t, e) => A.draw_(c, t, e), _owner: A });
      F.info('map', A.at, A.until, { group: o.group || 'area' }); F.sfx(A.at, 'glow', o.gain ?? 0.25);
      return A;
    };
    // ink spread: the area fills outward from a point with a soft, uneven edge (reach, catchment, territory growing)
    G.spread = (src, o = {}) => {
      const A = { kind: 'area', feats: prepAll(src), fill: col(o.fill ?? 'accent'), alpha: o.alpha ?? 0.45, rim: col(o.rim ?? o.fill ?? 'accent'), at: o.at ?? 0, dur: o.dur ?? 2.2, until: o.until ?? 1e9, z: o.z ?? 10, seed: o.seed ?? 7 };
      const allPts = A.feats.flatMap((f) => ptsOf(f));
      const from = o.from ? fwd(o.from[0], o.from[1]) : allPts.reduce((a, p) => [a[0] + p[0] / allPts.length, a[1] + p[1] / allPts.length], [0, 0]);
      const rMax = Math.max(...allPts.map((p) => Math.hypot(p[0] - from[0], p[1] - from[1]))) * 1.06;
      A._pts = () => allPts;
      A.draw_ = (c, t, emph = 1) => {
        if (t < A.at || t >= A.until) return;
        const q = E.expoOut(clamp01((t - A.at) / A.dur)), fade = clamp01((A.until - t) / 0.4) * emph; if (q <= 0) return;
        octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
        polyPath(octx, A.feats, camZB); octx.fillStyle = A.fill; octx.fill('evenodd'); octx.strokeStyle = A.rim; octx.lineWidth = 2.2 * u; octx.stroke();
        // the uneven front: a noisy circle in screen space around the start point
        const s0 = proj(from[0], from[1]), rr = rMax * q * CM.k, N = 120;
        octx.globalCompositeOperation = 'destination-in'; octx.filter = `blur(${(4 * u).toFixed(1)}px)`; octx.beginPath();
        for (let i = 0; i <= N; i++) { const an = (i / N) * Math.PI * 2, n = 0.07 * Math.sin(an * 3 + A.seed) + 0.05 * Math.sin(an * 7 + A.seed * 2.3) + 0.03 * Math.sin(an * 13 + A.seed * 0.7); const r = rr * (1 + n); const x = s0[0] + Math.cos(an) * r, y = s0[1] + Math.sin(an) * r * (s0[2] ? CM.cp : 1); if (i) octx.lineTo(x, y); else octx.moveTo(x, y); }
        octx.fillStyle = '#000'; octx.fill(); octx.filter = 'none'; octx.globalCompositeOperation = 'source-over';
        c.save(); c.globalAlpha = A.alpha * fade; c.drawImage(off, 0, 0); c.restore();
      };
      addOverlay({ z: A.z, draw: (c, t, e) => A.draw_(c, t, e), _owner: A });
      F.sfx(A.at, 'bleed', o.gain ?? 0.45, { dur: A.dur }); F.info('map', A.at, A.until, { group: o.group || 'spread' });
      return A;
    };
    // reach: circles of a radius in metres growing around points (walking distance around stations, a city's reach…), drawn as one union
    G.reach = (src, o = {}) => {
      const pts = toPoints(src).map((p, i) => ({ xy: fwd(p.ll[0], p.ll[1]), ll: p.ll, t0: (o.at ?? 0) + i * (o.stagger ?? 0.05) }));
      const A = { kind: 'area', pts, r: o.r ?? 800, fill: col(o.fill ?? 'accent'), alpha: o.alpha ?? 0.3, rim: col(o.rim ?? o.fill ?? 'accent'), dur: o.dur ?? 0.8, until: o.until ?? 1e9, z: o.z ?? 9, at: o.at ?? 0 };
      pts.forEach((p) => { p.rp = A.r / mpu(p.ll); });
      A._pts = () => pts.flatMap((p) => [[p.xy[0] - p.rp, p.xy[1] - p.rp], [p.xy[0] + p.rp, p.xy[1] + p.rp]]);
      A.draw_ = (c, t, emph = 1) => {
        if (t < A.at || t >= A.until) return;
        const fade = clamp01((A.until - t) / 0.4) * emph; octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
        const live = pts.filter((p) => t >= p.t0).map((p) => { const s = proj(p.xy[0], p.xy[1]); return [s, p.rp * CM.k * E.expoOut(clamp01((t - p.t0) / A.dur)) * s[2]]; });
        octx.strokeStyle = A.rim; octx.lineWidth = 3 * u; for (const [s, r] of live) { octx.beginPath(); octx.ellipse(s[0], s[1], r, r * (CM.s.p ? CM.cp : 1), 0, 0, 7); octx.stroke(); }
        octx.fillStyle = A.fill; for (const [s, r] of live) { octx.beginPath(); octx.ellipse(s[0], s[1], r, r * (CM.s.p ? CM.cp : 1), 0, 0, 7); octx.fill(); }
        c.save(); c.globalAlpha = A.alpha * fade; c.drawImage(off, 0, 0); c.restore();
      };
      addOverlay({ z: A.z, draw: (c, t, e) => A.draw_(c, t, e), _owner: A });
      F.sfx(A.at, 'bleed', o.gain ?? 0.4, { dur: A.dur + (pts.length - 1) * (o.stagger ?? 0.05) }); F.info('map', A.at, A.until, { group: o.group || 'reach' });
      return A;
    };

    // ---------- drawing the base map ----------
    let camZB = 0;
    const view = { x0: 0, y0: 0, x1: 0, y1: 0 };
    const visible = (bb) => bb[2] >= view.x0 && bb[0] <= view.x1 && bb[3] >= view.y0 && bb[1] <= view.y1;
    function polyPath(c, feats, zb) {
      c.beginPath();
      for (const f of feats) {
        if (!visible(f.bbox)) continue;
        for (const a of lodOf(f, zb)) { const n = a.length / 2; let s = proj(a[0], a[1]); c.moveTo(s[0], s[1]); for (let i = 1; i < n; i++) { s = proj(a[i * 2], a[i * 2 + 1]); c.lineTo(s[0], s[1]); } if (f.type === 'poly') c.closePath(); }
      }
    }
    const zoomAlpha = (L, z) => smooth(L.minZoom - 0.5, L.minZoom, z) * (1 - smooth(L.maxZoom, L.maxZoom + 0.5, z));
    // detail fades in once the frame lies inside the data's extent (outside it the coarse world shows)
    let detail = 1;
    // water lines: blur the land mask, then draw thin bands where the blurred value equals the value a straight coast would have at d px
    const WL = opt.waterlines === false ? null : { n: 4, gap: 7.5, width: 1.1, sigma: 13, ...(typeof opt.waterlines === 'object' ? opt.waterlines : {}) };
    const erfc = (x) => { const z = Math.abs(x), t = 1 / (1 + 0.5 * z), r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? r : 2 - r; };
    const wlRGB = (() => { const h = C.waterline.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; })();
    const coastRGB = (() => { const h = C.coast.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; })();
    let wlImg = null;
    function waterlines(alpha) {
      if (!WL) return;
      const sg = WL.sigma * u, bands = [];
      for (let j = 1; j <= WL.n; j++) bands.push({ d: (j * WL.gap + 1) * u, w: WL.width * u, a: 0.7 * (1 - (j - 1) / (WL.n + 0.6)) });
      for (const b of bands) { b.v = 0.5 * erfc(b.d / (sg * Math.SQRT2)); b.g = Math.exp(-(b.d * b.d) / (2 * sg * sg)) / (sg * Math.sqrt(2 * Math.PI)); b.hw = Math.max(1e-4, (b.w / 2) * b.g); }
      bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, W, H); bctx.filter = `blur(${sg.toFixed(2)}px)`; bctx.drawImage(mask, 0, 0); bctx.filter = 'none';
      const M0 = mctx.getImageData(0, 0, W, H).data, B0 = bctx.getImageData(0, 0, W, H).data;
      if (!wlImg) wlImg = lctx.createImageData(W, H);
      const O = wlImg.data; O.fill(0);
      const vmin = bands[bands.length - 1].v - bands[bands.length - 1].hw * 1.2, vmax = bands[0].v + bands[0].hw * 1.5, W4 = W * 4, cw = Math.max(1, Math.round(u)), ca = 0.95 * alpha, ca2 = 0.38 * alpha;
      for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
        const k = (y * W + x) * 4 + 3; if (M0[k] > 128) continue;
        // the coast: a water pixel next to land (crisp, from the unblurred mask)
        let c = 0;
        if (M0[k - 4] > 128 || M0[k + 4] > 128 || M0[k - W4] > 128 || M0[k + W4] > 128) c = ca;
        else if (M0[k - 4 - W4] > 128 || M0[k + 4 - W4] > 128 || M0[k - 4 + W4] > 128 || M0[k + 4 + W4] > 128) c = ca * 0.8;
        else if (cw > 1 && (M0[k - 8] > 128 || M0[k + 8] > 128 || M0[k - 2 * W4] > 128 || M0[k + 2 * W4] > 128)) c = ca2;
        if (c) { O[k - 3] = coastRGB[0]; O[k - 2] = coastRGB[1]; O[k - 1] = coastRGB[2]; O[k] = c * 255; continue; }
        // engraved lines: where the blurred land equals what a straight coast gives at d px (narrow channels, where both banks push it up, stay clear)
        const v = B0[k] / 255; if (v < vmin || v > vmax) continue;
        let best = 0; for (const b of bands) { const a = b.a * (1 - Math.abs(v - b.v) / b.hw); if (a > best) best = a; }
        if (best <= 0) continue; O[k - 3] = wlRGB[0]; O[k - 2] = wlRGB[1]; O[k - 1] = wlRGB[2]; O[k] = Math.min(255, best * 255 * alpha);
      }
      lctx.putImageData(wlImg, 0, 0); ctx.drawImage(linesC, 0, 0);
    }
    function drawGlobe(t, a) {
      if (!world || a <= 0) return;
      const s = CM.s, ll = invLL(s.x, s.y), R = (512 * 2 ** s.z * u) / (2 * Math.PI * Math.cos(ll[1] * D2R));
      const pr = d3g.geoOrthographic().rotate([-ll[0], -ll[1], s.b]).scale(R).translate([W / 2, H / 2]).clipAngle(90).precision(0.3);
      const path = d3g.geoPath(pr, ctx);
      ctx.save(); ctx.globalAlpha = a;
      // the sea as a disc with a soft rim, a faint graticule, land, borders, tinted countries, a little shading
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = C.globeSea; ctx.fill(); ctx.lineWidth = 2 * u; ctx.strokeStyle = C.globeRim; ctx.stroke();
      ctx.beginPath(); path(d3g.geoGraticule10()); ctx.strokeStyle = C.graticule; ctx.lineWidth = 0.8 * u; ctx.globalAlpha = a * 0.7; ctx.stroke(); ctx.globalAlpha = a;
      ctx.beginPath(); path(world.land); ctx.fillStyle = C.land; ctx.fill(); ctx.strokeStyle = C.coast; ctx.lineWidth = 1 * u; ctx.stroke();
      for (const ct of countryTints) { if (t < ct.at || t >= ct.until) continue; ctx.globalAlpha = a * Math.min(seg(t, ct.at, ct.at + 0.5), clamp01((ct.until - t) / 0.4)); ctx.beginPath(); path(ct.f); ctx.fillStyle = ct.fill; ctx.fill(); }
      ctx.globalAlpha = a * 0.8; ctx.beginPath(); path(world.borders); ctx.strokeStyle = C.country; ctx.lineWidth = 0.8 * u; ctx.stroke();
      if (world.states) { ctx.globalAlpha = a * 0.6 * smooth(2.5, 4, s.z); ctx.beginPath(); path(world.states); ctx.setLineDash([3 * u, 3 * u]); ctx.stroke(); ctx.setLineDash([]); }
      const g = ctx.createRadialGradient(W / 2 - R * 0.35, H / 2 - R * 0.4, R * 0.1, W / 2, H / 2, R * 1.02); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(0.7, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.16)');
      ctx.globalAlpha = a; ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = g; ctx.fill();
      ctx.restore();
    }
    // planar → lon / lat (mercator inverse; other projections through d3)
    const invLL = (x, y) => { if (projName === 'mercator') return [(x / 512) * 360 - 180, (2 * Math.atan(Math.exp(Math.PI * (1 - (2 * y) / 512))) - Math.PI / 2) / D2R]; return [0, 0]; };
    G.lonlat = invLL;
    let globeA = 0;
    function drawBase(t) { drawFlat(t); if (globeA > 0 && globeA < 1) drawGlobe(t, globeA); }
    function drawFlat(t) {
      const z = CM.s.z, zb = Math.max(0, Math.min(22, Math.floor(z)));
      camZB = zb;
      // what is in view (planar box of the four corners + margin)
      const cs = [[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => unproj(x, Math.max(y, CM.s.p ? H * 0.02 : y)));
      view.x0 = Math.min(...cs.map((p) => p[0])); view.x1 = Math.max(...cs.map((p) => p[0])); view.y0 = Math.min(...cs.map((p) => p[1])); view.y1 = Math.max(...cs.map((p) => p[1]));
      const mx = (view.x1 - view.x0) * 0.05, my = (view.y1 - view.y0) * 0.05; view.x0 -= mx; view.x1 += mx; view.y0 -= my; view.y1 += my;
      // globe ↔ flat: below GLOBE_Z the world is a sphere
      const gA = world ? 1 - smooth(GLOBE_Z - 0.5, GLOBE_Z, z) : 0; globeA = gA;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      ctx.fillStyle = gA > 0 ? C.bg : (opt.background === 'land' ? C.land : C.water); ctx.fillRect(0, 0, W, H);
      globeA = gA;
      if (gA >= 1) { drawGlobe(t, 1); return; }
      if (gA > 0) { ctx.save(); ctx.globalAlpha = 1 - gA; ctx.fillStyle = C.water; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      // the detailed data shows once the view fits inside its extent (fading in as the view shrinks to ~3/4 of it); the coarse world is under it
      if (dataBox) { const r = Math.max((view.x1 - view.x0) / (dataBox[2] - dataBox[0]), (view.y1 - view.y0) / (dataBox[3] - dataBox[1])), ov = view.x1 > dataBox[0] && view.x0 < dataBox[2] && view.y1 > dataBox[1] && view.y0 < dataBox[3]; detail = ov ? 1 - smooth(0.95, 1.5, r) : 0; } else detail = layers.length ? 1 : 0;   // no detailed data: the coarse world is the map
      const fa = (1 - gA);
      mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, W, H);
      if (world && detail < 1) {
        ctx.save(); ctx.globalAlpha = fa;
        polyPath(ctx, world.landF, zb); ctx.fillStyle = C.land; ctx.fill('evenodd');
        for (const ct of countryTints) { if (t < ct.at || t >= ct.until) continue; ctx.globalAlpha = fa * Math.min(seg(t, ct.at, ct.at + 0.5), clamp01((ct.until - t) / 0.4)) * (1 - detail); polyPath(ctx, [ct.pf], zb); ctx.fillStyle = ct.fill; ctx.fill('evenodd'); }
        if (detail < 0.5) { polyPath(mctx, world.landF, zb); mctx.fillStyle = '#000'; mctx.fill('evenodd'); ctx.globalAlpha = 1; waterlines(fa); }
        ctx.globalAlpha = fa * 0.9; polyPath(ctx, world.bordersF, zb); ctx.strokeStyle = C.country; ctx.lineWidth = 1 * u; ctx.stroke();
        if (world.statesF.length) { ctx.globalAlpha = fa * 0.75 * smooth(3.5, 5, z); polyPath(ctx, world.statesF, zb); ctx.setLineDash([4 * u, 3 * u]); ctx.stroke(); ctx.setLineDash([]); }
        ctx.restore();
      }
      if (detail > 0) {
        const da = detail * fa, useMask = detail >= 0.5;
        ctx.save();
        // inside the data's extent the detail replaces the coarse world: sea first (covering the coarse land in proportion), then the layers
        if (dataBox) { const cs2 = [[dataBox[0], dataBox[1]], [dataBox[2], dataBox[1]], [dataBox[2], dataBox[3]], [dataBox[0], dataBox[3]]].map(([x, y]) => proj(x, y)); ctx.beginPath(); cs2.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.clip(); if (world) { ctx.globalAlpha = da; ctx.fillStyle = opt.background === 'land' ? C.land : C.water; ctx.fillRect(0, 0, W, H); } }
        for (const L of layers) {
          if (t < L.at || t >= L.until) continue; const za = zoomAlpha(L, z); if (za <= 0) continue;
          ctx.globalAlpha = da * L.alpha * za;
          if (L.role === 'land' || L.role === 'water' || L.role === 'area') {
            polyPath(ctx, L.feats, zb);
            if (L.fill) { ctx.fillStyle = L.fill; ctx.fill('evenodd'); }
            if (L.role === 'water') { ctx.strokeStyle = L.fill; ctx.lineWidth = 2.5 * u; ctx.stroke(); }
            else if (L.stroke) { ctx.strokeStyle = L.stroke; ctx.lineWidth = L.width * u; ctx.stroke(); }
            if (useMask && L.role === 'land') { polyPath(mctx, L.feats, zb); mctx.fillStyle = '#000'; mctx.fill('evenodd'); }
            if (useMask && L.role === 'water') { mctx.globalCompositeOperation = 'destination-out'; polyPath(mctx, L.feats, zb); mctx.fillStyle = '#000'; mctx.fill('evenodd'); mctx.lineWidth = 2.5 * u; mctx.stroke(); mctx.globalCompositeOperation = 'source-over'; }
          } else {
            polyPath(ctx, L.feats, zb); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            const wz = Math.min(1.6, 2 ** ((z - 12) * 0.35));
            if (L.casing && L.caseWidth) { ctx.strokeStyle = L.casing; ctx.lineWidth = (L.width + L.caseWidth * 2) * u * wz; ctx.stroke(); }
            ctx.strokeStyle = L.stroke; ctx.lineWidth = L.width * u * wz; ctx.setLineDash(L.dash ? L.dash.map((d) => d * u) : []); ctx.stroke(); ctx.setLineDash([]);
          }
          // the water lines go on right after the water (under parks and streets)
          if (useMask && L.role === 'water') { ctx.save(); ctx.globalAlpha = 1; waterlines(da); ctx.restore(); }
        }
        ctx.restore();
      }
    }

    // ---------- focus: the subject stays lit, the rest dims under a veil of paper ----------
    const focuses = [];
    G.focus = (things, a, b, o = {}) => { focuses.push({ list: [].concat(things), a, b, dim: o.dim ?? 0.62, ramp: o.ramp ?? 0.45 }); F.sfx(a, 'glow', o.gain ?? 0.35); F.info('mark', a, b, { group: 'focus' }); return G; };
    const focusAt = (t) => { let f = 0, set0 = null; for (const x of focuses) { const k = Math.min(seg(t, x.a, x.a + x.ramp, E.sine), 1 - seg(t, x.b - x.ramp, x.b, E.sine)); if (k > f) { f = k * x.dim; set0 = x; } } return { f, set: set0 }; };
    const inFocus = (owner, fs) => fs && fs.list.some((x) => x === owner || (x && x._members && x._members.includes(owner)));

    // ---------- words: labels, callouts, title, year ----------
    const labels = [];
    const labelFont = (K) => (K.serif ? FT.serif : FT.sans);
    G.label = (where, text, o = {}) => {
      o = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));   // an option left undefined keeps the kind's default
      const K = { ...(KINDS[o.kind || 'town'] || KINDS.town), ...o }, zh = /[㐀-鿿]/.test(text);
      const box = el('div', `left:0;top:0;white-space:nowrap;opacity:0;will-change:transform`, over);
      const sz = F.px(K.size), halo = col(K.halo ?? 'paper'), hs = Math.max(2, sz * 0.12);
      const shadow = [0, 60, 120, 180, 240, 300].map((d) => `${(Math.cos(d * D2R) * hs).toFixed(1)}px ${(Math.sin(d * D2R) * hs).toFixed(1)}px ${(hs * 0.6).toFixed(1)}px ${halo}`).join(',');
      const main = el('div', `position:relative;font:${K.italic ? 'italic ' : ''}${K.weight} ${sz}px/1.12 ${zh ? (K.serif ? FT.zhSerif : FT.zh) : labelFont(K)};letter-spacing:${zh ? 0.06 : K.spacing}em;${K.caps && !zh ? 'text-transform:uppercase;' : ''}color:${col(K.color)};text-shadow:${shadow}`, box, P.esc(text));
      let subEl = null;
      if (o.sub) subEl = el('div', `position:relative;margin-top:${sz * 0.12}px;font:600 ${Math.round(sz * 0.78)}px/1.15 ${/[㐀-鿿]/.test(o.sub) ? FT.zh : FT.sans};letter-spacing:.04em;color:${col(o.subColor ?? K.color)};text-shadow:${shadow}`, box, P.esc(o.sub));
      const L = { el: box, text, where, at: o.at ?? 0, until: o.until ?? 1e9, dir: o.dir || 'c', minZoom: o.minZoom ?? -99, maxZoom: o.maxZoom ?? 99, priority: o.priority ?? K.priority, declutter: o.declutter ?? (K.declutter !== false), of: o.of, keep: !!o.keep, dx: o.dx ?? 0, dy: o.dy ?? 0, along: o.along, w: 0, h: 0, align: zh ? 'c' : null };
      if (L.along) {   // a label that follows a line (a river, a street, a route): SVG text on a path
        box.remove();
        const id = 'lp' + labels.length + '_' + Math.round(hash(labels.length + 3) * 1e6), pth = svgEl('path', { id, d: '', fill: 'none' }, svg);
        const tx = svgEl('text', { 'font-family': zh ? FT.zhSerif : labelFont(K), 'font-size': sz, 'font-style': K.italic ? 'italic' : 'normal', 'font-weight': K.weight, 'letter-spacing': `${(zh ? 0.3 : K.spacing) * sz}`, fill: col(K.color), stroke: halo, 'stroke-width': hs * 1.3, 'paint-order': 'stroke', 'stroke-linejoin': 'round', opacity: 0 }, svg);
        const tp = svgEl('textPath', { href: '#' + id, startOffset: '50%', 'text-anchor': 'middle' }, tx); tp.textContent = K.caps && !zh ? text.toUpperCase() : text;
        L.svgPath = pth; L.svgText = tx; L.el = tx; L.declutter = false;
        const pa = L.along === true ? where : L.along; L.feat = prep(pa.kind === 'line' ? pa.parts[0].ll : pa);
      }
      L.anchor = () => { if (L.along) return null; if (L.where && L.where._planar) return L.where._planar; const p = isLL(L.where) ? fwd(L.where[0], L.where[1]) : (() => { const ps = ptsOf(L.where); return ps.reduce((a, q) => [a[0] + q[0] / ps.length, a[1] + q[1] / ps.length], [0, 0]); })(); return () => p; };
      L.pt = L.anchor();
      labels.push(L);
      if (L.along) { if (!o.noFact) F.fact(o.fact ?? text, L.at, L.until); }
      else F.text(L.el, 'label', o.fact ?? (o.sub ? `${text}\n${o.sub}` : text), L.at, L.until, { noFact: !!o.noFact, overlap: !!o.overlap });
      if (o.sfx !== false && o.kind !== 'station' && L.at > 0.05) F.sfx(L.at, 'tick', o.gain ?? 0.25);
      return L;
    };
    const DIRS = { c: [-0.5, -0.5], n: [-0.5, -1], s: [-0.5, 0], e: [0, -0.5], w: [-1, -0.5], ne: [0, -1], nw: [-1, -1], se: [0, 0], sw: [-1, 0] };
    const OFF = { c: [0, 0], n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [0.75, -0.75], nw: [-0.75, -0.75], se: [0.75, 0.75], sw: [-0.75, 0.75] };
    function updateLabels(t, fs) {
      // the printed furniture (year box, legend, inset) is on top: labels under it give way
      const placed = [...years, ...legends, ...insets].filter((L) => L._box && t >= L.at && t < L.until && L._box.a > 0.05).map((L) => ({ x0: L._box.x, y0: L._box.y, x1: L._box.x + L._box.w, y1: L._box.y + L._box.h, a: 1 }));
      const nFurn = placed.length, R0 = roomDefault(), mX = W * 0.02, top = H * (F.voiced ? R0.top * 0.8 : 0.02), bot = F.voiced ? H * (1 - R0.bottom) : H * 0.98;
      const order = labels.slice().sort((a, b) => b.priority - a.priority);
      for (const L of order) {
        const live = t >= L.at - 0.01 && t < L.until;
        if (!live) { set(L.el, L.along ? { opacity: '0' } : { opacity: '0', display: 'none' }); continue; }
        const ta = Math.min(seg(t, L.at, L.at + 0.35, E.sine), clamp01((L.until - t) / 0.3));
        const za = smooth(L.minZoom - 0.4, L.minZoom, CM.s.z) * (1 - smooth(L.maxZoom, L.maxZoom + 0.4, CM.s.z));
        let fa = 1; if (fs.f > 0 && !L.keep) { const own = L.of ? inFocus(L.of, fs.set) : false; if (!own && !(L.where && inFocus(L.where, fs.set))) fa = 1 - fs.f * 1.1; }
        let a = ta * za * clamp01(fa);
        if (L.along) {
          const pts = []; for (const arr of L.feat.parts) for (let i = 0; i < arr.length; i += 2) pts.push(proj(arr[i], arr[i + 1]));
          if (pts.length > 1 && pts[pts.length - 1][0] < pts[0][0]) pts.reverse();
          L.svgPath.setAttribute('d', 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L'));
          set(L.el, { opacity: a.toFixed(3) }); continue;
        }
        const p = L.pt(t); if (!p) { set(L.el, { display: 'none' }); continue; }
        const s = proj(p[0], p[1]); if (!isFinite(s[0])) { set(L.el, { display: 'none' }); L._box = null; continue; }   // on the far side of the globe
        if (!L.w) { set(L.el, { display: '' }); L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }
        const gap = F.px(14), at = (dir) => { const d = DIRS[dir] || DIRS.c, of = OFF[dir] || OFF.c; return [s[0] + of[0] * gap + d[0] * L.w + L.dx * u, s[1] + of[1] * gap + d[1] * L.h + L.dy * u]; };
        // near an edge the label goes to the other side of its place, then (a little) slides back inside the frame
        let dir = L.dir, [x, y] = at(dir);
        if (x < mX || x + L.w > W - mX) { const f = dir.replace(/e/, 'W').replace(/w/, 'e').replace('W', 'w'); const [x2] = at(f); if (x2 >= mX && x2 + L.w <= W - mX) { dir = f; [x, y] = at(dir); } }
        if (y < top || y + L.h > bot) { const f = dir.replace(/^n/, 'S').replace(/^s/, 'n').replace('S', 's'); const [, y2] = at(f); if (y2 >= top && y2 + L.h <= bot) { dir = f; [x, y] = at(dir); } }
        const cx = Math.max(mX, Math.min(W - mX - L.w, x)), cy = Math.max(top, Math.min(bot - L.h, y));
        if (Math.abs(cx - x) < L.w * 0.6) x = cx; if (Math.abs(cy - y) < L.h * 1.2) y = cy;
        if (!L.declutter && a > 0.01) for (const q of placed.slice(0, nFurn)) { const ix = Math.max(0, Math.min(x + L.w, q.x1) - Math.max(x, q.x0)), iy = Math.max(0, Math.min(y + L.h, q.y1) - Math.max(y, q.y0)); if (ix * iy > 0) a *= 1 - clamp01(((ix * iy) / (L.w * L.h)) * 4); }
        if (L.declutter && a > 0.01) {
          const r = { x0: x, y0: y, x1: x + L.w, y1: y + L.h };
          let hid = 0; for (const q of placed) { const ix = Math.max(0, Math.min(r.x1, q.x1) - Math.max(r.x0, q.x0)), iy = Math.max(0, Math.min(r.y1, q.y1) - Math.max(r.y0, q.y0)); if (ix * iy > 0) hid = Math.max(hid, clamp01(((ix * iy) / ((r.x1 - r.x0) * (r.y1 - r.y0))) * 4) * q.a); }
          a *= 1 - hid; if (a > 0.05) placed.push({ ...r, a });
        }
        const rise = (1 - seg(t, L.at, L.at + 0.35, E.quartOut)) * F.px(8);
        set(L.el, { display: a > 0.003 ? '' : 'none', opacity: a.toFixed(3), transform: `translate(${x.toFixed(1)}px,${(y + rise).toFixed(1)}px)` });
        L._box = { x, y, w: L.w, h: L.h, a };
      }
    }

    // callout: a printed card pinned to a place by a thin leader
    const callouts = [];
    G.callout = (where, o = {}) => {
      const card = el('div', `left:0;top:0;opacity:0;background:${col(o.bg ?? 'card')};border:${F.px(2.5)}px solid ${col(o.ink ?? 'cardInk')};border-radius:${F.px(6)}px;padding:${F.px(14)}px ${F.px(22)}px ${F.px(16)}px;box-shadow:0 ${F.px(6)}px ${F.px(18)}px rgba(40,30,20,.18);max-width:${F.px(o.width ?? (PT ? 640 : 560))}px;transform-origin:50% 50%`, over);
      if (o.kicker) el('div', `position:relative;font:700 ${F.px(22)}px/1.2 ${FT.sans};letter-spacing:.14em;text-transform:uppercase;color:${col(o.accent ?? 'accent')};margin-bottom:${F.px(6)}px`, card, P.esc(o.kicker));
      const tt = el('div', `position:relative;font:900 ${F.px(o.size ?? 44)}px/1.18 ${FT.zhSerif};color:${col(o.ink ?? 'cardInk')}`, card, o.title);
      let sb = null; if (o.sub) sb = el('div', `position:relative;margin-top:${F.px(8)}px;font:500 ${F.px(o.subSize ?? 27)}px/1.35 ${FT.zh};color:${col('muted')}`, card, o.sub);
      if (o.accentBar !== false) el('div', `left:${F.px(-2.5)}px;top:${F.px(-2.5)}px;bottom:${F.px(-2.5)}px;width:${F.px(9)}px;background:${col(o.accent ?? 'accent')};border-radius:${F.px(6)}px 0 0 ${F.px(6)}px`, card);
      const ln = svgEl('line', { stroke: col(o.ink ?? 'cardInk'), 'stroke-width': F.px(2.2), opacity: 0 }, svg), dot = svgEl('circle', { r: F.px(6), fill: col(o.accent ?? 'accent'), stroke: col('paper'), 'stroke-width': F.px(2.5), opacity: 0 }, svg);
      const K = { card, ln, dot, where, at: o.at ?? 0, until: o.until ?? 1e9, side: o.side || 'auto', dist: o.dist ?? 150, w: 0, h: 0, of: o.of, text: o.title, nudge: o.nudge || [0, 0] };
      K.pt = (() => { if (where && where._planar) return where._planar; const p = isLL(where) ? fwd(where[0], where[1]) : (() => { const ps = ptsOf(where); return ps.reduce((a, q) => [a[0] + q[0] / ps.length, a[1] + q[1] / ps.length], [0, 0]); })(); return () => p; })();
      callouts.push(K);
      F.text(tt, 'label', String(o.title).replace(/<[^>]+>/g, ''), K.at, K.until, { overlap: true });
      if (sb) F.text(sb, 'label', String(o.sub).replace(/<[^>]+>/g, ''), K.at, K.until, { overlap: true });
      F.sfx(K.at, 'tick', o.gain ?? 0.5); F.info('annotate', K.at, K.until, { group: o.group || 'callout' + callouts.length });
      return K;
    };
    function updateCallouts(t) {
      const R = roomDefault(), safe = { x0: W * 0.04, y0: H * R.top, x1: W * 0.96, y1: H * (1 - R.bottom) };
      for (const K of callouts) {
        const live = t >= K.at && t < K.until; if (!live) { set(K.card, { display: 'none' }); K.ln.setAttribute('opacity', 0); K.dot.setAttribute('opacity', 0); continue; }
        set(K.card, { display: '' }); if (!K.w) { K.w = K.card.offsetWidth; K.h = K.card.offsetHeight; }
        const p = K.pt(t), s = proj(p[0], p[1]); if (!isFinite(s[0])) { set(K.card, { display: 'none' }); K.ln.setAttribute('opacity', 0); K.dot.setAttribute('opacity', 0); continue; }
        const q = seg(t, K.at, K.at + 0.45, E.backOut), qa = Math.min(seg(t, K.at, K.at + 0.25), clamp01((K.until - t) / 0.3));
        let side = K.side; if (side === 'auto') side = PT ? (s[1] > H * 0.45 ? 't' : 'b') : s[0] > W * 0.55 ? 'l' : 'r';
        const dd = F.px(K.dist);
        let cx = side === 'l' ? s[0] - dd - K.w : side === 'r' ? s[0] + dd : s[0] - K.w / 2, cy = side === 't' ? s[1] - dd - K.h : side === 'b' ? s[1] + dd : s[1] - K.h * 0.5 - F.px(40);
        cx += F.px(K.nudge[0]); cy += F.px(K.nudge[1]);
        cx = Math.max(safe.x0, Math.min(safe.x1 - K.w, cx)); cy = Math.max(safe.y0, Math.min(safe.y1 - K.h, cy));
        const gap = F.px(16);
        for (const L of [...years, ...legends, ...insets]) {
          const b = L._box; if (!b || b.a < 0.05 || t < L.at || t >= L.until) continue;
          if (cx < b.x + b.w + gap && cx + K.w > b.x - gap && cy < b.y + b.h + gap && cy + K.h > b.y - gap) {
            if (b.y + b.h + gap + K.h <= safe.y1) cy = b.y + b.h + gap; else if (b.y - gap - K.h >= safe.y0) cy = b.y - gap - K.h; else cx = b.x > W / 2 ? b.x - gap - K.w : b.x + b.w + gap;
          }
        }
        // the leader goes from the place to the nearest point on the card's edge
        const ex = Math.max(cx, Math.min(cx + K.w, s[0])), ey = Math.max(cy, Math.min(cy + K.h, s[1])), lq = seg(t, K.at, K.at + 0.35, E.quartOut);
        K.ln.setAttribute('x1', s[0].toFixed(1)); K.ln.setAttribute('y1', s[1].toFixed(1)); K.ln.setAttribute('x2', (s[0] + (ex - s[0]) * lq).toFixed(1)); K.ln.setAttribute('y2', (s[1] + (ey - s[1]) * lq).toFixed(1)); K.ln.setAttribute('opacity', qa.toFixed(3));
        K.dot.setAttribute('cx', s[0].toFixed(1)); K.dot.setAttribute('cy', s[1].toFixed(1)); K.dot.setAttribute('opacity', qa.toFixed(3));
        set(K.card, { opacity: qa.toFixed(3), transform: `translate(${cx.toFixed(1)}px,${cy.toFixed(1)}px) scale(${(0.92 + 0.08 * q).toFixed(4)})` });
        K._box = { x: cx, y: cy, w: K.w, h: K.h };
      }
    }

    // title: a cartouche (double rule, serif title) — the map's own title block
    const titles = [];
    G.title = (o = {}) => {
      const pos = o.pos || 'center', box = el('div', `left:0;top:0;opacity:0;text-align:center;background:${col(o.bg ?? 'card')};border:${F.px(3)}px double ${col('cardInk')};outline:${F.px(1.5)}px solid ${col('cardInk')};outline-offset:${F.px(6)}px;padding:${F.px(26)}px ${F.px(46)}px ${F.px(24)}px;box-shadow:0 ${F.px(10)}px ${F.px(30)}px rgba(40,30,20,.2)`, over);
      if (o.kicker) el('div', `position:relative;font:700 ${F.px(24)}px/1.2 ${FT.sans};letter-spacing:.32em;text-transform:uppercase;color:${col('accent')};margin-bottom:${F.px(10)}px`, box, P.esc(o.kicker));
      const tt = el('div', `position:relative;font:900 ${F.px(o.size ?? (PT ? 92 : 100))}px/1.3 ${FT.zhSerif};color:${col('cardInk')};letter-spacing:.04em`, box, o.text);
      let sb = null; if (o.sub) sb = el('div', `position:relative;margin-top:${F.px(10)}px;font:600 ${F.px(o.subSize ?? 30)}px/1.4 ${/[㐀-鿿]/.test(o.sub) ? FT.zh : FT.sans};letter-spacing:.12em;color:${col('muted')}`, box, o.sub);
      const T0 = { box, at: o.at ?? 0, until: o.until ?? 1e9, pos, w: 0, h: 0, y: o.y };
      titles.push(T0);
      F.text(tt, 'headline', String(o.text).replace(/<[^>]+>/g, ''), T0.at, T0.until); if (sb) F.text(sb, 'label', String(o.sub).replace(/<[^>]+>/g, ''), T0.at, T0.until, { noFact: !!o.subNoFact });
      if (T0.at > 0.05) F.sfx(T0.at, 'stamp', o.gain ?? 0.5);
      return T0;
    };
    function updateTitles(t) {
      for (const T0 of titles) {
        const live = t >= T0.at && t < T0.until; if (!live) { set(T0.box, { display: 'none' }); continue; }
        set(T0.box, { display: '' }); if (!T0.w) { T0.w = T0.box.offsetWidth; T0.h = T0.box.offsetHeight; }
        const R = roomDefault(), q = seg(t, T0.at, T0.at + 0.5, E.backOut), a = Math.min(seg(t, T0.at, T0.at + 0.3), clamp01((T0.until - t) / 0.35));
        const x = T0.pos === 'tl' ? W * 0.05 : (W - T0.w) / 2, y = T0.y !== undefined ? H * T0.y : T0.pos === 'tl' ? H * R.top + F.px(10) : PT ? H * 0.3 - T0.h / 2 : (H * R.top + H * (1 - R.bottom)) / 2 - T0.h / 2;
        set(T0.box, { opacity: a.toFixed(3), transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(0.94 + 0.06 * q).toFixed(4)})` });
      }
    }

    // year counter: an odometer in a printed box; the year rolls between keys
    const years = [];
    G.year = (o = {}) => {
      const ks = (o.keys || []).slice().sort((a, b) => a[0] - b[0]); if (!ks.length) throw new Error(MSG('G.year 要 keys: [[时间, 年份]…]', 'G.year needs keys: [[time, year]…]'));
      const at = o.at ?? ks[0][0], until = o.until ?? 1e9, pos = o.pos || (PT ? 'tc' : 'tr'), sz = F.px(o.size ?? (PT ? 96 : 104));
      const box = el('div', `left:0;top:0;opacity:0;background:${col('card')};border:${F.px(2.5)}px solid ${col('cardInk')};border-radius:${F.px(6)}px;padding:${F.px(8)}px ${F.px(20)}px ${F.px(10)}px;box-shadow:0 ${F.px(6)}px ${F.px(18)}px rgba(40,30,20,.16)`, over);
      if (o.label) el('div', `position:relative;font:700 ${F.px(22)}px/1.2 ${FT.zh};letter-spacing:.2em;color:${col('muted')};text-align:center;margin-bottom:${F.px(2)}px`, box, P.esc(o.label));
      const row = el('div', `position:relative;display:flex;justify-content:center;font:700 ${sz}px/1 ${FT.serif};color:${col('cardInk')};font-variant-numeric:lining-nums tabular-nums`, box);
      const nd = String(Math.max(...ks.map((k) => k[1]))).length, cols = [];
      for (let i = 0; i < nd; i++) { const w = el('div', `position:relative;width:0.56em;height:1.04em;overflow:hidden`, row), strip = el('div', `left:0;top:0;width:100%;text-align:center;line-height:1.04em`, w); strip.dataset.motion = 'skip'; strip.dataset.d = ''; cols.push(strip); }
      const Y = { box, at, until, ks, pos, cols, w: 0, h: 0, ease: o.ease ?? E.cubicInOut };
      Y.value = (t) => { if (t <= ks[0][0]) return ks[0][1]; for (let i = 1; i < ks.length; i++) { const [t1, v1] = ks[i], [t0, v0] = ks[i - 1]; const d = o.dur ?? Math.min(2.2, Math.max(0.5, (t1 - t0) * 0.8)); if (t < t1) return v0; if (t < t1 + d && (i === ks.length - 1 || t < ks[i + 1][0])) return v0 + (v1 - v0) * Y.ease(clamp01((t - t1) / d)); } return ks[ks.length - 1][1]; };
      years.push(Y);
      // each year shown is on-screen text in its own window (fact check, phone legibility)
      F.text(row, 'label', ks.map((k) => String(k[1])).join(' / '), at, until);   // the years shown (checked one by one against the brief)
      ks.forEach((k, i) => { if (i) F.sfx(k[0], 'roll', o.gain ?? 0.4, { dur: Math.min(2.2, Math.max(0.5, (k[0] - ks[i - 1][0]) * 0.8)) }); });
      F.info('chart', at, until, { group: 'year' });
      return Y;
    };
    function updateYears(t) {
      for (const Y of years) {
        const live = t >= Y.at && t < Y.until; if (!live) { set(Y.box, { display: 'none' }); continue; }
        set(Y.box, { display: '' }); if (!Y.w) { Y.w = Y.box.offsetWidth; Y.h = Y.box.offsetHeight; }
        const R = roomDefault(), a = Math.min(seg(t, Y.at, Y.at + 0.35), clamp01((Y.until - t) / 0.35));
        const x = Y.pos === 'tl' ? W * 0.05 : Y.pos === 'tc' ? (W - Y.w) / 2 : W * 0.95 - Y.w, y = H * R.top + F.px(6);
        set(Y.box, { opacity: a.toFixed(3), transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)` }); Y._box = { x, y, w: Y.w, h: Y.h, a };
        const v = Y.value(t), n = Y.cols.length;
        for (let i = 0; i < n; i++) { const p10 = 10 ** (n - 1 - i), base = Math.floor(v / p10), rem = v - base * p10, carry = p10 === 1 ? rem : clamp01(rem - (p10 - 1)); const pos = (base % 10) + carry, a = Math.floor(pos) % 10, fr = pos - Math.floor(pos), key = `${a}`; if (Y.cols[i].dataset.d !== key) { Y.cols[i].dataset.d = key; Y.cols[i].innerHTML = `${a}<br>${(a + 1) % 10}`; } set(Y.cols[i], { transform: `translateY(${(-fr * 1.04).toFixed(4)}em)` }); }
      }
    }

    // note: a small printed line fixed to the frame (a caveat, the data sources), not to a place
    const notes = [];
    G.note = (text, o = {}) => {
      const box = el('div', `left:0;top:0;opacity:0;white-space:nowrap;font:${o.weight ?? 600} ${F.px(o.size ?? 22)}px/1.3 ${/[\u3400-\u9fff]/.test(text) ? FT.zh : FT.sans};letter-spacing:.04em;color:${col(o.color ?? 'muted')};text-shadow:0 0 ${F.px(4)}px ${col('paper')},0 0 ${F.px(4)}px ${col('paper')},0 0 ${F.px(8)}px ${col('paper')}`, over, P.esc(text));
      const N0 = { box, at: o.at ?? 0, until: o.until ?? 1e9, pos: o.pos || 'bl', w: 0, h: 0, y: o.y };
      notes.push(N0); F.text(box, 'label', o.fact ?? text, N0.at, N0.until, { noFact: !!o.noFact, chrome: true });
      return N0;
    };
    function updateNotes(t) {
      for (const N0 of notes) {
        const live = t >= N0.at && t < N0.until; if (!live) { set(N0.box, { display: 'none' }); continue; }
        set(N0.box, { display: '' }); if (!N0.w) { N0.w = N0.box.offsetWidth; N0.h = N0.box.offsetHeight; }
        const R = roomDefault(), a = Math.min(seg(t, N0.at, N0.at + 0.35), clamp01((N0.until - t) / 0.35));
        const x = N0.pos.endsWith('l') ? W * 0.045 : N0.pos.endsWith('r') ? W * 0.955 - N0.w : (W - N0.w) / 2;
        const y = N0.y !== undefined ? H * N0.y - N0.h / 2 : N0.pos.startsWith('t') ? H * R.top + F.px(4) : H * (1 - R.bottom) - N0.h - F.px(6);
        set(N0.box, { opacity: a.toFixed(3), transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)` });
      }
    }

    // ---------- furniture: inset locator, scale bar, north arrow ----------
    const insets = [];
    G.inset = (o = {}) => {
      const size = F.px(o.size ?? (PT ? 300 : 270)), pos = o.pos || 'tl';
      const box = el('div', `left:0;top:0;width:${size}px;height:${size}px;opacity:0;background:${col('card')};border:${F.px(2.5)}px solid ${col('cardInk')};border-radius:${F.px(o.kind === 'flat' ? 6 : size)}px;overflow:hidden;box-shadow:0 ${F.px(6)}px ${F.px(18)}px rgba(40,30,20,.16)`, over);
      const c2 = el('canvas', `left:0;top:0;width:${size}px;height:${size}px`, box); c2.width = Math.round(size); c2.height = Math.round(size); c2.dataset.motion = 'skip';
      const I = { box, c2, at: o.at ?? 0, until: o.until ?? 1e9, pos, size, mark: o.mark || 'view', kind: o.kind || 'globe', center: o.center, scale: o.scale ?? 1.0, label: o.label };
      if (o.label) { I.lab = el('div', `left:0;right:0;bottom:${F.px(PT ? 40 : 34)}px;text-align:center;font:700 ${F.px(20)}px/1 ${FT.zh};letter-spacing:.1em;color:${col('cardInk')};text-shadow:0 0 ${F.px(4)}px ${col('card')},0 0 ${F.px(4)}px ${col('card')}`, box, P.esc(o.label)); F.text(I.lab, 'label', o.label, I.at, I.until); }
      insets.push(I); F.info('map', I.at, I.until, { group: 'inset' });
      if (I.at > 0.05) F.sfx(I.at, 'tick', 0.3);
      return I;
    };
    function updateInsets(t) {
      for (const I of insets) {
        const live = t >= I.at && t < I.until; if (!live || !world) { set(I.box, { display: 'none' }); continue; }
        const R = roomDefault(), a = Math.min(seg(t, I.at, I.at + 0.35), clamp01((I.until - t) / 0.35));
        const x = I.pos === 'tl' ? W * 0.04 : I.pos === 'bl' ? W * 0.04 : W * 0.96 - I.size, y = I.pos === 'bl' || I.pos === 'br' ? H * (1 - R.bottom) - I.size : H * R.top + F.px(6);
        set(I.box, { display: '', opacity: a.toFixed(3), transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)` }); I._box = { x, y, w: I.size, h: I.size, a };
        const c = I.c2.getContext('2d'), S = I.c2.width, here = invLL(CM.s.x, CM.s.y), ctr = I.center || (isLL(I.mark) ? I.mark : here);
        const pr = d3g.geoOrthographic().rotate([-ctr[0], -ctr[1]]).scale(S * 0.46 * I.scale).translate([S / 2, S / 2]).clipAngle(90), path = d3g.geoPath(pr, c);
        c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = C.card; c.fillRect(0, 0, S, S);
        c.beginPath(); path({ type: 'Sphere' }); c.fillStyle = C.globeSea; c.fill();
        c.beginPath(); path(d3g.geoGraticule10()); c.strokeStyle = C.graticule; c.lineWidth = 0.6; c.stroke();
        c.beginPath(); path(world.land); c.fillStyle = C.land; c.fill(); c.strokeStyle = C.coast; c.lineWidth = 0.7; c.stroke();
        for (const ct of countryTints) { if (t < ct.at || t >= ct.until) continue; c.beginPath(); path(ct.f); c.fillStyle = ct.fill; c.fill(); }
        c.beginPath(); path(world.borders); c.strokeStyle = C.country; c.lineWidth = 0.6; c.stroke();
        // the mark: a dot, or the main camera's view as a box
        c.strokeStyle = C.accent; c.fillStyle = C.accent; c.lineWidth = Math.max(2, S * 0.012);
        const vw = [[0, 0], [W, 0], [W, H], [0, H]].map(([x0, y0]) => invLL(...unproj(x0, y0)));
        const big = vw.some((p) => !isFinite(p[0])) || Math.abs(vw[1][0] - vw[0][0]) > 40;
        if (I.mark === 'view' && !big) { const pts = vw.map((p) => pr(p)).filter(Boolean); const wv = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0])); if (wv < S * 0.04) { const q = pr(here); if (q) { c.beginPath(); c.arc(q[0], q[1], S * 0.035, 0, 7); c.fill(); } } else { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.stroke(); } }
        else { const q = pr(isLL(I.mark) ? I.mark : here); if (q) { c.beginPath(); c.arc(q[0], q[1], S * 0.035, 0, 7); c.fill(); c.globalAlpha = 0.35; c.beginPath(); c.arc(q[0], q[1], S * 0.035 * (1.6 + ((t * 1.2) % 1) * 1.6), 0, 7); c.stroke(); c.globalAlpha = 1; } }
      }
    }
    const scales = [];
    G.scale = (o = {}) => {
      const box = el('div', `left:0;top:0;opacity:0;font:600 ${F.px(19)}px/1 ${FT.sans};color:${col('ink')};letter-spacing:.06em;text-shadow:0 0 ${F.px(4)}px ${col('paper')},0 0 ${F.px(4)}px ${col('paper')}`, over);
      const bar = el('div', `position:relative;height:${F.px(9)}px;border:${F.px(1.6)}px solid ${col('ink')};background:linear-gradient(90deg, ${col('ink')} 0 25%, ${col('paper')} 25% 50%, ${col('ink')} 50% 75%, ${col('paper')} 75% 100%)`, box), lab = el('div', `position:relative;margin-top:${F.px(6)}px`, box);
      const S0 = { box, bar, lab, at: o.at ?? 0, until: o.until ?? 1e9, pos: o.pos || 'br', unit: o.unit || 'metric' };
      scales.push(S0);
      return S0;
    };
    function updateScales(t) {
      for (const S0 of scales) {
        const live = t >= S0.at && t < S0.until; if (!live) { set(S0.box, { display: 'none' }); continue; }
        const ll = invLL(CM.s.x, CM.s.y), mpp = mpu(ll) / CM.k, max = F.px(170) * mpp, nice = [1, 2, 5].flatMap((m) => [1, 10, 100, 1000, 1e4, 1e5, 1e6].map((p) => m * p)).sort((a, b) => a - b).filter((v) => v <= max).pop() || 1;
        const px = nice / mpp, R = roomDefault(), a = Math.min(seg(t, S0.at, S0.at + 0.35), clamp01((S0.until - t) / 0.35));
        S0.bar.style.width = `${px.toFixed(1)}px`; const txt = nice >= 1000 ? `${nice / 1000} km` : `${nice} m`; if (S0.lab.textContent !== txt) S0.lab.textContent = txt;
        const x = S0.pos === 'bl' ? W * 0.04 : W * 0.96 - px, y = H * (1 - R.bottom) - F.px(46);
        set(S0.box, { display: '', opacity: a.toFixed(3), transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)` });
      }
    }
    const norths = [];
    G.north = (o = {}) => {
      const s = F.px(o.size ?? 64), box = el('div', `left:0;top:0;width:${s}px;height:${s}px;opacity:0`, over);
      box.innerHTML = `<svg viewBox="-50 -50 100 100" width="${s}" height="${s}"><circle r="44" fill="${col('card')}" stroke="${col('cardInk')}" stroke-width="3"/><path d="M0,-34 L11,8 L0,2 L-11,8 Z" fill="${col('accent')}"/><path d="M0,34 L11,8 L0,2 L-11,8 Z" fill="${col('cardInk')}" opacity=".35"/></svg>`;
      const N = { box, svgg: box.firstChild, at: o.at ?? 0, until: o.until ?? 1e9, pos: o.pos || 'tr' };
      norths.push(N); return N;
    };
    function updateNorths(t) {
      for (const N of norths) {
        const live = t >= N.at && t < N.until; if (!live) { set(N.box, { display: 'none' }); continue; }
        const R = roomDefault(), a = Math.min(seg(t, N.at, N.at + 0.35), clamp01((N.until - t) / 0.35)), s = N.box.offsetWidth || F.px(64);
        const x = N.pos === 'tl' ? W * 0.04 : W * 0.96 - s, y = N.pos === 'bl' || N.pos === 'br' ? H * (1 - R.bottom) - s - F.px(70) : H * R.top + F.px(6);
        set(N.box, { display: '', opacity: a.toFixed(3), transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${(-CM.s.b).toFixed(2)}deg)` });
      }
    }

    // legend: a printed key in the map's margin — line swatches, then figures (the map's own way of listing what is on it)
    const legends = [];
    G.legend = (o = {}) => {
      const box = el('div', `left:0;top:0;opacity:0;background:${col('card')};border:${F.px(2.5)}px solid ${col('cardInk')};border-radius:${F.px(6)}px;padding:${F.px(16)}px ${F.px(24)}px ${F.px(18)}px;box-shadow:0 ${F.px(6)}px ${F.px(18)}px rgba(40,30,20,.16);min-width:${F.px(o.width ?? 300)}px`, over);
      const Lg = { box, at: o.at ?? 0, until: o.until ?? 1e9, pos: o.pos || (PT ? 'tc' : 'tl'), w: 0, h: 0, items: [] };
      if (o.title) { const tt = el('div', `position:relative;font:900 ${F.px(30)}px/1.2 ${FT.zhSerif};color:${col('cardInk')};padding-bottom:${F.px(8)}px;margin-bottom:${F.px(10)}px;border-bottom:${F.px(1.5)}px solid ${col('cardInk')}`, box, P.esc(o.title)); F.text(tt, 'label', o.title, Lg.at, Lg.until); }
      (o.rows || []).forEach((r, i) => {
        const row = el('div', `position:relative;display:flex;align-items:center;gap:${F.px(14)}px;margin:${F.px(7)}px 0;opacity:0`, box);
        el('div', `position:relative;flex:none;width:${F.px(46)}px;height:${F.px(r.width ?? 9)}px;border-radius:${F.px(5)}px;background:${r.dash ? `repeating-linear-gradient(90deg, ${col(r.color)} 0 ${F.px(10)}px, transparent ${F.px(10)}px ${F.px(16)}px)` : col(r.color)};box-shadow:0 0 0 ${F.px(2)}px ${col('paper')}`, row);
        const tx = el('div', `position:relative;font:700 ${F.px(26)}px/1.2 ${FT.zh};color:${col('cardInk')};white-space:nowrap`, row, P.esc(r.text));
        if (r.sub) el('span', `position:relative;margin-left:${F.px(8)}px;font:500 ${F.px(22)}px/1.2 ${FT.sans};color:${col('muted')}`, tx, P.esc(r.sub));
        const at = r.at ?? Lg.at + 0.15 + i * (o.stagger ?? 0.18); Lg.items.push({ el: row, at });
        F.text(tx, 'label', r.sub ? `${r.text}\n${r.sub}` : r.text, at, Lg.until);
      });
      (o.stats || []).forEach((st, i) => {
        const sep = !i && ((o.rows || []).length || o.title), row = el('div', `position:relative;display:flex;align-items:center;margin-top:${F.px(sep ? 14 : i ? 6 : 0)}px;padding-top:${F.px(sep ? 12 : 0)}px;${sep ? `border-top:${F.px(1.5)}px solid ${col('cardInk')};` : ''}opacity:0`, box);   // a rule above the figures only when something is above them
        const v = el('span', `position:relative;font:700 ${F.px(st.size ?? 54)}px/1.15 ${FT.serif};color:${col(st.color ?? 'accent')}`, row, P.esc(st.value));
        const lb = el('span', `position:relative;margin-left:${F.px(10)}px;font:700 ${F.px(24)}px/1.2 ${FT.zh};color:${col('cardInk')}`, row, P.esc(st.label));
        const at = st.at ?? Lg.at + 0.3 + ((o.rows || []).length + i) * (o.stagger ?? 0.18); Lg.items.push({ el: row, at, pop: true });
        F.text(v, 'label', st.value, at, Lg.until); F.text(lb, 'label', st.label, at, Lg.until); F.sfx(at, 'tick', st.gain ?? 0.5);
      });
      if (o.note) { const nt = el('div', `position:relative;margin-top:${F.px(10)}px;font:500 ${F.px(19)}px/1.3 ${FT.zh};color:${col('muted')}`, box, P.esc(o.note)); F.text(nt, 'label', o.note, Lg.at, Lg.until); }
      legends.push(Lg); F.info('chart', Lg.at, Lg.until, { group: o.group || 'legend' }); if (Lg.at > 0.05) F.sfx(Lg.at, 'tick', o.gain ?? 0.5);
      return Lg;
    };
    function updateLegends(t) {
      for (const Lg of legends) {
        const live = t >= Lg.at && t < Lg.until; if (!live) { set(Lg.box, { display: 'none' }); continue; }
        set(Lg.box, { display: '' }); if (!Lg.w) { Lg.w = Lg.box.offsetWidth; Lg.h = Lg.box.offsetHeight; }
        const R = roomDefault(), a = Math.min(seg(t, Lg.at, Lg.at + 0.35), clamp01((Lg.until - t) / 0.35));
        const x = Lg.pos.endsWith('l') ? W * 0.045 : Lg.pos.endsWith('r') ? W * 0.955 - Lg.w : (W - Lg.w) / 2, y = Lg.pos.startsWith('b') ? H * (1 - R.bottom) - Lg.h : H * R.top + F.px(6);
        set(Lg.box, { opacity: a.toFixed(3), transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)` });
        for (const it of Lg.items) { const q = seg(t, it.at, it.at + 0.3, E.quartOut); set(it.el, { opacity: q.toFixed(3), transform: `translateX(${((1 - q) * -F.px(14)).toFixed(1)}px)` }); }
        Lg._box = { x, y, w: Lg.w, h: Lg.h, a };
      }
    }

    // ---------- transit: lines + stations + transfers, as one module on top of the general verbs ----------
    G.transit = (o = {}) => {
      const key = o.key || 'route', LF = o.lines.features || o.lines, SF = o.stations ? o.stations.features || o.stations : [];
      const groups = new Map(); for (const f of LF) { const k = f.properties[key]; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
      const style = { width: o.width ?? 7, casing: o.casing ?? 2.6, ...(o.style || {}) };
      const T = { groups, made: new Map(), list: SF.map((f) => ({ name: f.properties.name, ll: f.geometry.coordinates, routes: String(f.properties.routes || '').split(',').filter(Boolean), props: f.properties })) };
      const styleOf = (id) => ({ ...style, ...((o.per && o.per[id]) || {}) });
      // T.line(id): the line object of a route (all its patterns, drawn in sync from their starts); made once, styled by o.per[id]
      T.line = (id, o2 = {}) => {
        if (T.made.has(id)) return T.made.get(id);
        const fs = groups.get(id); if (!fs) throw new Error(MSG(`没有这条线：${id}（有：${[...groups.keys()].join(' / ')}）`, `No such line: ${id} (have: ${[...groups.keys()].join(', ')})`));
        const s0 = { ...styleOf(id), ...o2 }, color = s0.color || fs[0].properties.color;
        const R = G.line({ type: 'FeatureCollection', features: fs }, { ...s0, color, at: 1e8, name: id });
        T.made.set(id, R); return R;
      };
      // draw a route on: T.draw(id, at, dur, { stations: true | { labels… }, from, to, until })
      T.draw = (id, at, dur = 2, o2 = {}) => {
        const R = T.line(id); R.draw(at, dur, { from: o2.from, to: o2.to, ease: o2.ease ?? E.sine, gain: o2.gain });
        if (o2.until !== undefined) R.until = o2.until;
        if (o2.stations) T.stations(id, at, { ...(typeof o2.stations === 'object' ? o2.stations : {}), along: { at, dur, ease: o2.ease ?? E.sine }, until: o2.until });
        return R;
      };
      T.station = (name) => T.list.find((s) => s.name === name);
      T.on = (id) => T.list.filter((s) => s.routes.includes(id));
      // stations of a route pop in: in route order with a stagger, or (along) as the drawing head passes them
      T.stations = (id, at, o2 = {}) => {
        const list = (o2.only ? T.on(id).filter((s) => o2.only.includes(s.name)) : T.on(id)).map((s) => ({ ...s }));
        const R = T.line(id), color = o2.color ?? R.color;
        if (o2.along) {
          const { at: a0, dur, ease } = o2.along, maxLen = Math.max(...R.parts.map((p) => p.len));
          for (const s of list) {
            const xy = fwd(s.ll[0], s.ll[1]); let best = Infinity, bd = 0;
            for (const p of R.parts) for (let i = 0; i < p.cum.length; i++) { const d = (p.a[i * 2] - xy[0]) ** 2 + (p.a[i * 2 + 1] - xy[1]) ** 2; if (d < best) { best = d; bd = p.cum[i]; } }
            const target = bd / maxLen; let lo = 0, hi = 1; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (ease(m) < target) lo = m; else hi = m; }
            s.time = a0 + dur * lo;
          }
          list.sort((x, y) => x.time - y.time);
        } else list.forEach((s, i) => { s.time = at + i * (o2.stagger ?? 0.06); });
        const S = G.pins(list.map((s) => ({ ll: s.ll, name: s.name, time: s.time })), { style: 'station', color, until: o2.until, z: o2.z ?? 40, labels: o2.labels, gain: o2.gain ?? 0.25, group: 'stations-' + id });
        S._line = R; return S;
      };
      // transfer stations: served by lines of two or more colours (or the ones named in only)
      T.transfers = (at, o2 = {}) => {
        const colorOf = (rid) => (groups.get(rid) ? groups.get(rid)[0].properties.color : rid);
        let list = T.list.filter((s) => new Set(s.routes.map(colorOf)).size >= 2);
        if (o2.only) list = o2.only.map((n) => T.station(n)).filter(Boolean);
        return G.pins(list.map((s, i) => ({ ll: s.ll, name: s.name, time: at + i * (o2.stagger ?? 0.25) })), { style: 'transfer', until: o2.until, z: 45, labels: o2.labels, r: o2.r ?? 10.5, gain: o2.gain ?? 0.4, group: 'transfers' });
      };
      // the part of a route between two stations (for a historic first segment, a trip): coordinates along the route's longest pattern that passes both
      T.between = (id, a, b) => {
        const A = T.station(a), B = T.station(b); if (!A || !B) throw new Error(MSG(`找不到车站：${!A ? a : b}`, `No such station: ${!A ? a : b}`));
        let best = null;
        for (const f of groups.get(id)) {
          const c = f.geometry.coordinates, near = (s) => { let bi = 0, bd = Infinity; c.forEach((p, i) => { const d = (p[0] - s.ll[0]) ** 2 + ((p[1] - s.ll[1]) * 1.35) ** 2; if (d < bd) { bd = d; bi = i; } }); return [bi, bd]; };
          const [ia, da] = near(A), [ib, db] = near(B), sc = da + db;
          if (!best || sc < best.sc) best = { sc, coords: ia <= ib ? c.slice(ia, ib + 1) : c.slice(ib, ia + 1).reverse() };
        }
        return [A.ll, ...best.coords, B.ll];
      };
      return T;
    };
    // named places for fits and labels (G.places({ 'Boston': [lon, lat] }))
    const named = new Map();
    G.places = (obj) => { for (const [k, v] of Object.entries(obj)) named.set(k, v); return G; };
    G._named = (n) => named.get(n);

    // ---------- the frame ----------
    F.add((t) => {
      cam = camAt(t); CM = camMat(cam); GL = null;
      drawBase(t);
      if (globeA >= 0.5) { const ll = invLL(cam.x, cam.y); GL = { l0: ll[0], sf0: Math.sin(ll[1] * D2R), cf0: Math.cos(ll[1] * D2R), R: (512 * 2 ** cam.z * u) / (2 * Math.PI * Math.cos(ll[1] * D2R)) }; }
      const fs = focusAt(t);
      const sorted = overlays.slice().sort((a, b) => a.z - b.z);
      const isF = (o) => fs.f > 0 && o._owner && inFocus(o._owner, fs.set);
      if (fs.f > 0) {
        // the veil, with holes for focused areas
        ctx.save(); ctx.globalAlpha = fs.f; ctx.fillStyle = C.veil; ctx.beginPath(); ctx.rect(0, 0, W, H);
        const holes = fs.set.list.filter((x) => x && !x.kind && !x._planar && typeof x === 'object' && (x.type === 'Feature' || x.type === 'FeatureCollection' || x.type === 'Polygon' || x.type === 'MultiPolygon'));
        if (holes.length) { const hf = holes.flatMap((h) => prepAll(h)); for (const f of hf) { if (!visible(f.bbox)) continue; for (const a of lodOf(f, camZB)) { const n = a.length / 2; let s = proj(a[a.length - 2], a[a.length - 1]); ctx.moveTo(s[0], s[1]); for (let i = n - 2; i >= 0; i--) { s = proj(a[i * 2], a[i * 2 + 1]); ctx.lineTo(s[0], s[1]); } ctx.closePath(); } } }
        ctx.fill('evenodd'); ctx.restore();
      }
      // overlays in order: what is not in focus fades with the veil (a line crossing a lit area stays dim), what is in focus stays full
      const dimE = Math.max(0.12, 1 - fs.f * 1.15);
      for (const o of sorted) o.draw(ctx, t, fs.f > 0 && !isF(o) ? dimE : 1);
      updateYears(t); updateInsets(t); updateLegends(t); updateNotes(t); updateTitles(t); updateScales(t); updateNorths(t); updateLabels(t, fs); updateCallouts(t);
      for (const fn of frameFns) fn(t, G);
    });

    // camera flies make sound and, when fast, get motion blur
    F.prep(() => {
      keys.forEach((k, i) => {
        if (!i || k.cut) { if (k.cut && i) F.cut(k.at); return; }
        const a = camAt(k.at - 0.001), b = camAt(k.at + k.dur), dz = Math.abs(b.z - a.z), dist = Math.hypot(b.x - a.x, b.y - a.y) * 2 ** Math.max(a.z, b.z) * u / W;
        if ((dz > 1.2 || dist > 0.8) && k.sfx !== false) F.sfx(k.at, 'whoosh', k.gain ?? Math.min(0.55, 0.25 + dz * 0.06), { dur: k.dur });
        if (dz / k.dur > 1.6 || dist / k.dur > 1.0) F.blur(k.at, k.at + k.dur, 6);
      });
    });

    // ---------- checks (render --check) ----------
    F.addLint(() => {
      const out = [], add = (level, t, what, msg) => out.push({ level, t: r2(t), src: '', what, msg }), seen = new Set(), once = (k) => { if (seen.has(k)) return false; seen.add(k); return true; };
      const R = roomDefault();
      const inFrame = (p, pad = 0) => { const q = proj(p[0], p[1]); return q[0] >= -pad && q[0] <= W + pad && q[1] >= -pad && q[1] <= H + pad; };
      for (let t = 0.2; t < F.duration; t += 0.2) {
        F.render(t);
        // ① labels and callouts: cut by the frame edge, or sitting in the caption band
        for (const L of [...labels.filter((l) => !l.along), ...callouts]) {
          const b = L._box; if (!b || t < L.at + 0.4 || t > L.until - 0.3 || (b.a !== undefined && b.a < 0.5)) continue;
          const txt = String(L.text).slice(0, 20);
          if ((b.x < -2 || b.y < -2 || b.x + b.w > W + 2 || b.y + b.h > H + 2) && once('cut' + txt)) add('warn', t, MSG('标注出画', 'label cut'), MSG(`"${txt}" 有一部分在画面外：镜头 fit 里加上它的位置，或者换个方向（dir）`, `"${txt}" is partly out of frame: add its place to the camera's fit, or change its side (dir)`));
          if (F.voiced && b.y + b.h > H * (PT ? 0.69 : 0.855) && b.y < H * (PT ? 0.8 : 0.97) && once('cap' + txt)) add('warn', t, MSG('标注压字幕', 'label over captions'), MSG(`"${txt}" 落在字幕那一条里：镜头往下留出空间（room.bottom），或者换个方向`, `"${txt}" sits in the caption band: leave room at the bottom (room.bottom) or put it on another side`));
          if (b.y < H * (F.voiced ? 0.085 : 0.02) && once('top' + txt)) add('warn', t, MSG('标注压章节条', 'label under the chapter bar'), MSG(`"${txt}" 顶到了画面最上面（章节条那里）：镜头往上留空间（room.top）`, `"${txt}" reaches the very top (where the chapter bar is): leave room at the top (room.top)`));
        }
        // ② focus: what is lit must be in frame
        for (const f of focuses) { if (t < f.a + 0.5 || t > Math.min(f.b, f.a + 2)) continue; const pts = f.list.flatMap((x) => ptsOf(x, t)); if (pts.length && !pts.some((p) => inFrame(p)) && once('f' + f.a)) add('warn', t, MSG('焦点不在画面里', 'focus out of frame'), MSG(`${r2(f.a)}s 亮起来的东西不在镜头里：同一时刻把镜头推过去（camera 里 fit 它）`, `what lights up at ${r2(f.a)}s is not in frame: move the camera to it at the same moment (fit it in a camera key)`)); }
        // ③ lines: the head being drawn must be in frame
        for (const L of lines) { for (const s of L.spans) { if (t < s.at + 0.15 || t > s.at + s.dur - 0.05) continue; const h = L.headAt(t); if (h && !inFrame(h, F.px(30)) && once('h' + L.name + s.at)) add('warn', t, MSG('线画在画外', 'line drawn off-frame'), MSG(`${r2(s.at)}s 开始画的线（${L.name || '未命名'}），${r2(t)}s 时笔头在画面外：镜头 fit 整条线，或者跟着笔头走`, `the line started at ${r2(s.at)}s (${L.name || 'unnamed'}) has its head out of frame at ${r2(t)}s: fit the whole line, or follow the head`)); } }
        // ④ a travelling marker out of frame while it moves
        for (const V of movers) { if (t < V.at + 0.2 || t > V.at + V.dur - 0.1) continue; const p = V._planar(t); if (!inFrame(p, F.px(20)) && once('m' + V.at)) add('warn', t, MSG('移动的标记出画', 'marker out of frame'), MSG(`${r2(V.at)}s 出发的标记在 ${r2(t)}s 跑出了画面：镜头 follow 它，或者 fit 它的整段路线`, `the marker leaving at ${r2(V.at)}s runs out of frame at ${r2(t)}s: follow it with the camera, or fit its whole route`)); }
      }
      // ⑤ camera: too much zoom or travel for the time given
      keys.forEach((k, i) => { if (!i || k.cut || k.follow) return; const a = camAt(k.at - 0.001), b = camAt(k.at + k.dur); const dz = Math.abs(b.z - a.z); if (dz / k.dur > 2.6 && once('c' + i)) add('warn', k.at, MSG('镜头太急', 'camera too fast'), MSG(`${r2(k.at)}s 的镜头 ${k.dur}s 里缩放了 ${dz.toFixed(1)} 级（${(2 ** dz).toFixed(0)} 倍）：dur 拉长`, `the camera move at ${r2(k.at)}s zooms ${dz.toFixed(1)} levels (${(2 ** dz).toFixed(0)}×) in ${k.dur}s: make dur longer`)); });
      F.render(0);
      return out;
    });

    return G;
  };
})();
