#!/usr/bin/env node
// geodata.mjs: real geodata for the map style (styles/map/STYLE.md, "Data"): fetch open sources, then build one small, simplified file the page loads.
//   node geodata.mjs <project> fetch tiger <layer> <fips>[,<fips>…] [--year 2024]
//       US Census TIGER/Line shapefiles (public domain). layer: cousub | areawater | linearwater | arealm | roads | prisecroads | place | county | state | coastline | rails | faces
//       (faces: every face flagged land or water — LWFLAG 'L' gives exact land with the coast; county boundaries in the sea are not coast)
//       fips: a state (25) or a county (25025), whichever the layer is published by (the script says when it is the wrong one)
//   node geodata.mjs <project> fetch overpass "<Overpass QL>" --name <key> [--server <url>]
//       OpenStreetMap through the Overpass API (ODbL: credit "© OpenStreetMap contributors", data derived from it stays ODbL). The query is wrapped in
//       [out:json] and ends with `out geom;` unless it has its own out statement
//   node geodata.mjs <project> fetch url <url> --name <key> --licence "<licence>" [--author "<who>"] [--title "<what>"]
//       any GeoJSON / TopoJSON / zipped shapefile (Natural Earth, a city's open data portal, a transit agency's export)
//   node geodata.mjs <project> info [<key>]        what has been fetched: layers, feature counts, attribute names and a few values (to write the filters)
//   node geodata.mjs <project> build [geo.json]    → assets/geo/<out>.js (window.GEO.<out>), loaded by the page with a <script> tag
// Rules: before fetching, tell the user the files (source, licence, size) and wait for their OK (fetch prints the size of what it got).
//   Each source gets a sidecar assets/geo/src/<key>/credit.json { title, author, licence, url, date }; build copies the credits of the layers it uses
//   into the output, the page registers them (F.credit), and the render lists them in out/CREDITS.txt. Prefer small extracts: a bbox, a few layers.
//
// geo.json (the build recipe, in the project folder):
//   { "out": "city", "bbox": [west, south, east, north], "tolerance": 8, "precision": 5,
//     "layers": {
//       "land":  { "src": "tiger-cousub-25", "keep": ["NAME"] },
//       "water": { "src": ["tiger-areawater-25025", "tiger-areawater-25017"], "minArea": 2000, "keep": ["FULLNAME"] },
//       "parks": { "src": "tiger-arealm-25", "where": { "MTFCC": ["K2180", "K2183"] }, "keep": ["FULLNAME"] },
//       "roads": { "src": "tiger-roads-25025", "where": { "MTFCC": ["S1100", "S1200"] }, "tolerance": 12 },
//       "coast": { "src": "osm-coast", "osm": "coastline" },          // OSM: lines | polygons | points | coastline (land polygons closed along the bbox) | routes
//       "lines": { "src": "mbta", "file": "lines.geojson" } } }        // a GeoJSON a project script wrote into assets/geo/src/<key>/
//   per layer: src (one key or a list), file (pick one file of a source), where { attr: value | [values] | "/regex/" }, not { … }, keep [attrs] (others dropped),
//     rename { from: to }, bbox (overrides the global one), tolerance (metres, Douglas–Peucker; 0 = none), minArea (m², small polygons dropped),
//     minLength (m, short lines dropped), geom ('Polygon' | 'LineString' | 'Point': only that kind),
//     dissolve (true: merge polygons that share edges into one outline first — TIGER faces with LWFLAG 'L' → land with the real coast)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { M, isZh } from '../../core/scripts/lang.mjs';
import { useEnvProxy } from '../../core/scripts/net.mjs';
useEnvProxy();

const args = process.argv.slice(2);
const proj = args[0] && !args[0].startsWith('--') ? path.resolve(args[0]) : null;
process.env.BV_LANG ??= isZh(proj) ? 'zh' : 'en';
const cmd = args[1], opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const usage = M(`用法：node geodata.mjs <项目> fetch tiger <图层> <FIPS>[,<FIPS>…] [--year 2024]
      node geodata.mjs <项目> fetch overpass "<Overpass QL>" --name <名字>
      node geodata.mjs <项目> fetch url <网址> --name <名字> --licence "<许可>" [--author "<作者>"] [--title "<标题>"]
      node geodata.mjs <项目> info [<名字>]
      node geodata.mjs <项目> build [geo.json]`, `Usage: node geodata.mjs <project> fetch tiger <layer> <fips>[,<fips>…] [--year 2024]
       node geodata.mjs <project> fetch overpass "<Overpass QL>" --name <key>
       node geodata.mjs <project> fetch url <url> --name <key> --licence "<licence>" [--author "<who>"] [--title "<what>"]
       node geodata.mjs <project> info [<key>]
       node geodata.mjs <project> build [geo.json]`);
if (!proj || !['fetch', 'info', 'build'].includes(cmd)) { console.error(usage); process.exit(1); }
const SRC = path.join(proj, 'assets', 'geo', 'src');
const UA = 'bb-video/1.0 (https://github.com/BubbleBrainBB/BB-Video; geodata for code-made map films)';
const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const today = () => new Date().toISOString().slice(0, 10);

async function download(url, file, o = {}) {
  for (let k = 0; k < 4; k++) {
    try {
      const r = await fetch(url, { method: o.body ? 'POST' : 'GET', body: o.body, headers: { 'User-Agent': UA, ...(o.headers || {}) }, signal: AbortSignal.timeout(o.timeout ?? 180000) });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) { const e = new Error(`HTTP ${r.status}`); e.fatal = true; throw e; }
      const buf = Buffer.from(await r.arrayBuffer());
      fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf);
      return buf.length;
    } catch (e) {
      if (e.fatal || k === 3) throw new Error(M(`下载失败（${e.message}）：${url}`, `Download failed (${e.message}): ${url}`));
      await new Promise((res) => setTimeout(res, 2000 * 2 ** k));
    }
  }
}
const unzip = (zip, dir) => { const r = spawnSync('unzip', ['-o', '-q', zip, '-d', dir]); if (r.status !== 0) throw new Error(M(`解压失败：${zip}`, `Could not unzip ${zip}`)); };
const writeCredit = (dir, c) => fs.writeFileSync(path.join(dir, 'credit.json'), JSON.stringify({ date: today(), ...c }, null, 2) + '\n');

// ---------- shapefile + dbf (enough for TIGER, Natural Earth and most open-data exports: points, polylines, polygons, with or without Z / M) ----------
function readDbf(file) {
  const b = fs.readFileSync(file), n = b.readUInt32LE(4), hl = b.readUInt16LE(8), rl = b.readUInt16LE(10), fields = [];
  for (let o = 32; o < hl - 1 && b[o] !== 0x0d; o += 32) fields.push({ name: b.toString('latin1', o, o + 11).replace(/\0.*$/, ''), type: String.fromCharCode(b[o + 11]), len: b[o + 16] });
  const rows = [];
  for (let i = 0; i < n; i++) {
    let o = hl + i * rl + 1; const row = {};
    for (const f of fields) { const s = b.toString('utf8', o, o + f.len).trim(); row[f.name] = f.type === 'N' || f.type === 'F' ? (s === '' ? null : +s) : s; o += f.len; }
    rows.push(row);
  }
  return rows;
}
const ringArea = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return a / 2; };   // signed area: > 0 = anticlockwise, < 0 = clockwise (lon / lat, y up)
const inRing = (p, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < ((r[j][0] - r[i][0]) * (p[1] - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
// rings → polygons: outer rings are clockwise in a shapefile, holes anticlockwise; each hole goes to the outer ring that contains it
function ringsToPolygons(rings) {
  const outers = [], holes = [];
  for (const r of rings) (ringArea(r) <= 0 ? outers : holes).push(r);
  if (!outers.length) return holes.map((h) => [h.slice().reverse()]);
  const polys = outers.map((o) => [o]);
  for (const h of holes) { const k = polys.findIndex((p) => inRing(h[0], p[0])); (polys[k >= 0 ? k : polys.length - 1]).push(h); }
  return polys;
}
// dissolve: the union of polygons that share edges (a planar partition such as TIGER faces): every edge used by two polygons in opposite
//   directions cancels, what is left is the outline; chained back into rings, then grouped into polygons with their holes
function dissolve(feats) {
  const k = (p) => p[0] + ',' + p[1], edges = new Map();
  for (const f of feats) {
    const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const poly of polys) for (const ring of poly) for (let i = 0; i + 1 < ring.length; i++) {
      const a = k(ring[i]), b = k(ring[i + 1]); if (a === b) continue;
      const back = b + '|' + a; if (edges.has(back)) edges.delete(back); else edges.set(a + '|' + b, [ring[i], ring[i + 1]]);
    }
  }
  const from = new Map(); for (const [key, e] of edges) { const a = key.split('|')[0]; if (!from.has(a)) from.set(a, []); from.get(a).push(e); }
  const rings = [];
  for (const [a0, list] of from) while (list.length) {
    const e0 = list.pop(), ring = [e0[0], e0[1]]; let cur = k(e0[1]), guard = 0;
    while (cur !== a0 && guard++ < 5e6) { const nx = from.get(cur); if (!nx || !nx.length) break; const e = nx.pop(); ring.push(e[1]); cur = k(e[1]); }
    if (ring.length >= 4 && cur === a0) rings.push(ring);
  }
  return ringsToPolygons(rings).map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: p } }));
}
function readShp(file) {
  const b = fs.readFileSync(file), out = [];
  let o = 100;
  while (o + 8 <= b.length) {
    const len = b.readInt32BE(o + 4) * 2, s = o + 8; o = s + len;
    const type = b.readInt32LE(s), base = type % 10;   // 1 / 11 / 21 point, 3 / 13 / 23 polyline, 5 / 15 / 25 polygon, 8 / 18 / 28 multipoint
    if (type === 0) { out.push(null); continue; }
    if (base === 1) { out.push({ type: 'Point', coordinates: [b.readDoubleLE(s + 4), b.readDoubleLE(s + 12)] }); continue; }
    if (base === 8) { const np = b.readInt32LE(s + 36), pts = []; for (let i = 0; i < np; i++) pts.push([b.readDoubleLE(s + 40 + i * 16), b.readDoubleLE(s + 48 + i * 16)]); out.push({ type: 'MultiPoint', coordinates: pts }); continue; }
    const nParts = b.readInt32LE(s + 36), nPts = b.readInt32LE(s + 40), parts = [], P = s + 44 + nParts * 4, parts2 = [];
    for (let i = 0; i < nParts; i++) parts.push(b.readInt32LE(s + 44 + i * 4));
    for (let i = 0; i < nParts; i++) { const a = parts[i], z = i + 1 < nParts ? parts[i + 1] : nPts, pts = []; for (let k = a; k < z; k++) pts.push([b.readDoubleLE(P + k * 16), b.readDoubleLE(P + k * 16 + 8)]); parts2.push(pts); }
    if (base === 3) out.push(parts2.length === 1 ? { type: 'LineString', coordinates: parts2[0] } : { type: 'MultiLineString', coordinates: parts2 });
    else if (base === 5) { const polys = ringsToPolygons(parts2); out.push(polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys }); }
    else out.push(null);
  }
  return out;
}
function readShapefile(shp) {
  const geoms = readShp(shp), dbf = shp.replace(/\.shp$/i, '.dbf'), rows = fs.existsSync(dbf) ? readDbf(dbf) : [];
  const prj = shp.replace(/\.shp$/i, '.prj');
  if (fs.existsSync(prj) && !/GEOGCS/i.test(fs.readFileSync(prj, 'utf8').slice(0, 10)) && /PROJCS/i.test(fs.readFileSync(prj, 'utf8'))) console.warn(M(`注意：${path.basename(shp)} 是投影坐标（不是经纬度），这个工具不做重投影：换一份 WGS84 / NAD83 经纬度的数据`, `Note: ${path.basename(shp)} is in projected coordinates (not longitude / latitude); this tool does not reproject: use a WGS84 / NAD83 lon/lat version`));
  return { type: 'FeatureCollection', features: geoms.map((g, i) => (g ? { type: 'Feature', properties: rows[i] || {}, geometry: g } : null)).filter(Boolean) };
}
// TopoJSON → GeoJSON (every object), without a library
function topoToGeo(topo) {
  const tf = topo.transform, arcs = topo.arcs.map((a) => { let x = 0, y = 0; return a.map((p) => (tf ? [(x += p[0]) * tf.scale[0] + tf.translate[0], (y += p[1]) * tf.scale[1] + tf.translate[1]] : p)); });
  const arc = (i) => (i < 0 ? arcs[~i].slice().reverse() : arcs[i]);
  const line = (ids) => { const out = []; ids.forEach((i, k) => { const a = arc(i); out.push(...(k ? a.slice(1) : a)); }); return out; };
  const pt = (p) => (tf ? [p[0] * tf.scale[0] + tf.translate[0], p[1] * tf.scale[1] + tf.translate[1]] : p);
  const geom = (g) => {
    switch (g.type) {
      case 'Point': return { type: 'Point', coordinates: pt(g.coordinates) };
      case 'MultiPoint': return { type: 'MultiPoint', coordinates: g.coordinates.map(pt) };
      case 'LineString': return { type: 'LineString', coordinates: line(g.arcs) };
      case 'MultiLineString': return { type: 'MultiLineString', coordinates: g.arcs.map(line) };
      case 'Polygon': return { type: 'Polygon', coordinates: g.arcs.map(line) };
      case 'MultiPolygon': return { type: 'MultiPolygon', coordinates: g.arcs.map((p) => p.map(line)) };
      default: return null;
    }
  };
  const feats = [];
  for (const [name, obj] of Object.entries(topo.objects)) for (const g of obj.type === 'GeometryCollection' ? obj.geometries : [obj]) { const G = geom(g); if (G) feats.push({ type: 'Feature', properties: { ...(g.properties || {}), _object: name, ...(g.id !== undefined ? { _id: g.id } : {}) }, geometry: G }); }
  return { type: 'FeatureCollection', features: feats };
}

// ---------- OpenStreetMap (Overpass `out geom`) → GeoJSON ----------
const key2 = (p) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`;
// join way pieces that share end points into the longest chains (rings when they close)
function joinWays(pieces) {
  const left = pieces.map((p) => p.slice()), out = [];
  while (left.length) {
    let cur = left.shift(), grew = true;
    while (grew && key2(cur[0]) !== key2(cur[cur.length - 1])) {
      grew = false;
      for (let i = 0; i < left.length; i++) {
        const w = left[i], a = key2(cur[0]), z = key2(cur[cur.length - 1]);
        if (key2(w[0]) === z) cur = cur.concat(w.slice(1));
        else if (key2(w[w.length - 1]) === z) cur = cur.concat(w.slice().reverse().slice(1));
        else if (key2(w[w.length - 1]) === a) cur = w.concat(cur.slice(1));
        else if (key2(w[0]) === a) cur = w.slice().reverse().concat(cur.slice(1));
        else continue;
        left.splice(i, 1); grew = true; break;
      }
    }
    out.push(cur);
  }
  return out;
}
const wayCoords = (w) => (w.geometry || []).filter(Boolean).map((g) => [g.lon, g.lat]);
function osmFeatures(raw, kind, bbox) {
  const els = raw.elements || [], feats = [];
  if (kind === 'points') for (const e of els) { const c = e.type === 'node' ? [e.lon, e.lat] : e.center ? [e.center.lon, e.center.lat] : null; if (c) feats.push({ type: 'Feature', properties: { ...(e.tags || {}), _osm: `${e.type}/${e.id}` }, geometry: { type: 'Point', coordinates: c } }); }
  if (kind === 'lines') for (const e of els) if (e.type === 'way') feats.push({ type: 'Feature', properties: { ...(e.tags || {}), _osm: `way/${e.id}` }, geometry: { type: 'LineString', coordinates: wayCoords(e) } });
  if (kind === 'polygons') for (const e of els) {
    if (e.type === 'way') { const c = wayCoords(e); if (c.length > 3 && key2(c[0]) === key2(c[c.length - 1])) feats.push({ type: 'Feature', properties: { ...(e.tags || {}), _osm: `way/${e.id}` }, geometry: { type: 'Polygon', coordinates: [c] } }); }
    if (e.type === 'relation') {
      const ring = (role) => joinWays((e.members || []).filter((m) => m.type === 'way' && (m.role || 'outer') === role && m.geometry).map(wayCoords)).filter((r) => r.length > 3 && key2(r[0]) === key2(r[r.length - 1]));
      const outers = ring('outer'), inners = ring('inner');
      if (!outers.length) continue;
      const polys = outers.map((o) => [o]); for (const h of inners) { const k = polys.findIndex((p) => inRing(h[0], p[0])); if (k >= 0) polys[k].push(h); }
      feats.push({ type: 'Feature', properties: { ...(e.tags || {}), _osm: `relation/${e.id}` }, geometry: polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys } });
    }
  }
  if (kind === 'routes') for (const e of els) {
    if (e.type !== 'relation') continue;
    const ways = (e.members || []).filter((m) => m.type === 'way' && m.geometry && !/platform/.test(m.role || '')).map(wayCoords);
    const stops = (e.members || []).filter((m) => m.type === 'node' && /^stop/.test(m.role || ''));
    feats.push({ type: 'Feature', properties: { ...(e.tags || {}), _osm: `relation/${e.id}` }, geometry: { type: 'MultiLineString', coordinates: joinWays(ways) } });
    stops.forEach((m, i) => feats.push({ type: 'Feature', properties: { route: e.tags && (e.tags.ref || e.tags.name), order: i, _osm: `node/${m.ref}`, role: m.role }, geometry: { type: 'Point', coordinates: [m.lon, m.lat] } }));
  }
  if (kind === 'coastline') {
    // OSM coastlines run with the land on the left. Chains that cross the bbox are cut at its edge and closed by walking the edge anticlockwise
    //   (the land side); closed chains (islands) are land polygons as they are. Result: land polygons for the bbox (draw water as the background).
    const [W, S, E, N] = bbox, chains = joinWays(els.filter((e) => e.type === 'way').map(wayCoords)), land = [];
    const inside = (p) => p[0] >= W && p[0] <= E && p[1] >= S && p[1] <= N;
    const perim = (p) => { const [x, y] = p, w = E - W, h = N - S; if (Math.abs(y - S) < 1e-9) return x - W; if (Math.abs(x - E) < 1e-9) return w + (y - S); if (Math.abs(y - N) < 1e-9) return w + h + (E - x); return 2 * w + h + (N - y); };   // anticlockwise from the south-west corner
    const cross = (a, b) => { let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1]; for (const [p, q] of [[-dx, a[0] - W], [dx, E - a[0]], [-dy, a[1] - S], [dy, N - a[1]]]) { if (p === 0) { if (q < 0) return null; continue; } const r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r); } return t0 > t1 ? null : [t0, t1]; };
    const pieces = [];
    for (const c of chains) {
      if (key2(c[0]) === key2(c[c.length - 1]) && c.every(inside)) { land.push(c); continue; }
      let cur = null;
      for (let i = 1; i < c.length; i++) {
        const a = c[i - 1], b = c[i], seg = cross(a, b); if (!seg) { if (cur) { pieces.push(cur); cur = null; } continue; }
        const pa = [a[0] + (b[0] - a[0]) * seg[0], a[1] + (b[1] - a[1]) * seg[0]], pb = [a[0] + (b[0] - a[0]) * seg[1], a[1] + (b[1] - a[1]) * seg[1]];
        if (!cur) cur = [pa]; cur.push(pb);
        if (seg[1] < 1) { pieces.push(cur); cur = null; }
      }
      if (cur) pieces.push(cur);
    }
    // each piece enters and leaves through the edge; after a piece ends, walk anticlockwise along the edge to the next piece start
    const used = new Set(), corners = [[W, S], [E, S], [E, N], [W, N]], cp = [0, E - W, E - W + N - S, 2 * (E - W) + N - S], P = 2 * (E - W + N - S);
    for (let i = 0; i < pieces.length; i++) {
      if (used.has(i)) continue;
      let ring = [], k = i, guard = 0;
      while (!used.has(k) && guard++ < 1e4) {
        used.add(k); ring = ring.concat(pieces[k]);
        const end = perim(pieces[k][pieces[k].length - 1]);
        let best = -1, bd = Infinity;
        pieces.forEach((p, j) => { const d = (perim(p[0]) - end + P) % P; if (d < bd && (!used.has(j) || j === i)) { bd = d; best = j; } });
        // the corners passed on the way, in walking order
        [0, 1, 2, 3].map((c) => [(cp[c] - end + P) % P, c]).filter(([d]) => d > 0 && d < bd).sort((a, b) => a[0] - b[0]).forEach(([, c]) => ring.push(corners[c]));
        if (best < 0) break; k = best;
      }
      ring.push(ring[0]);
      land.push(ring);
    }
    for (const r of land) feats.push({ type: 'Feature', properties: { natural: 'land' }, geometry: { type: 'Polygon', coordinates: [r] } });
  }
  return feats;
}

// ---------- simplify, filter, measure ----------
const M_LAT = 110574;
const toM = (lat0) => { const kx = 111320 * Math.cos((lat0 * Math.PI) / 180); return (p) => [p[0] * kx, p[1] * M_LAT]; };
function dp(pts, tol, prj) {
  if (pts.length < 3 || !tol) return pts;
  const P = pts.map(prj), keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]], t2 = tol * tol;
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1; const [ax, ay] = P[a], [bx, by] = P[b], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) { const [x, y] = P[i]; let d; if (!L) d = (x - ax) ** 2 + (y - ay) ** 2; else { const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)); d = (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2; } if (d > md) { md = d; mi = i; } }
    if (md > t2) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const areaM2 = (ring, prj) => Math.abs(ringArea(ring.map(prj)));
const lenM = (line, prj) => { let s = 0; for (let i = 1; i < line.length; i++) { const a = prj(line[i - 1]), b = prj(line[i]); s += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s; };
const gbbox = (g) => { let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity; const walk = (c) => { if (typeof c[0] === 'number') { w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]); } else c.forEach(walk); }; walk(g.coordinates); return [w, s, e, n]; };
const hits = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
const match = (v, want) => (Array.isArray(want) ? want.some((w) => match(v, w)) : typeof want === 'string' && /^\/.*\/[a-z]*$/.test(want) ? new RegExp(want.slice(1, want.lastIndexOf('/')), want.slice(want.lastIndexOf('/') + 1)).test(String(v ?? '')) : String(v) === String(want));
function shapeGeom(g, o, prj) {
  const tol = o.tolerance, rp = (c) => c.map((p) => [+p[0].toFixed(o.precision), +p[1].toFixed(o.precision)]);
  const line = (l) => { const s = rp(dp(l, tol, prj)); return s.length >= 2 && (!o.minLength || lenM(s, prj) >= o.minLength) ? s : null; };
  const ring = (r) => { const s = rp(dp(r, tol, prj)); return s.length >= 4 ? s : null; };
  const poly = (p) => { if (o.minArea && areaM2(p[0], prj) < o.minArea) return null; const o2 = ring(p[0]); if (!o2) return null; return [o2, ...p.slice(1).filter((h) => !o.minArea || areaM2(h, prj) >= o.minArea).map(ring).filter(Boolean)]; };
  switch (g.type) {
    case 'Point': case 'MultiPoint': return { type: g.type, coordinates: g.type === 'Point' ? rp([g.coordinates])[0] : rp(g.coordinates) };
    case 'LineString': { const l = line(g.coordinates); return l && { type: 'LineString', coordinates: l }; }
    case 'MultiLineString': { const ls = g.coordinates.map(line).filter(Boolean); return ls.length ? (ls.length === 1 ? { type: 'LineString', coordinates: ls[0] } : { type: 'MultiLineString', coordinates: ls }) : null; }
    case 'Polygon': { const p = poly(g.coordinates); return p && { type: 'Polygon', coordinates: p }; }
    case 'MultiPolygon': { const ps = g.coordinates.map(poly).filter(Boolean); return ps.length ? (ps.length === 1 ? { type: 'Polygon', coordinates: ps[0] } : { type: 'MultiPolygon', coordinates: ps }) : null; }
    default: return null;
  }
}

// ---------- reading a source folder ----------
function sourceFiles(key) {
  const dir = path.join(SRC, key);
  if (!fs.existsSync(dir)) throw new Error(M(`没有这个数据源：${key}（先 fetch；已有：${fs.existsSync(SRC) ? fs.readdirSync(SRC).join(' / ') : '无'}）`, `No such source: ${key} (fetch it first; have: ${fs.existsSync(SRC) ? fs.readdirSync(SRC).join(', ') : 'none'})`));
  return fs.readdirSync(dir, { recursive: true }).map((f) => path.join(dir, f)).filter((f) => /\.(shp|geojson|json|topojson)$/i.test(f) && !/credit\.json$|raw\.json$/i.test(f) || /raw\.json$/i.test(f));
}
function readSource(key, layer, bbox) {
  const files = sourceFiles(key).filter((f) => !layer.file || path.basename(f) === layer.file), feats = [];
  for (const f of files) {
    if (/\.shp$/i.test(f)) { feats.push(...readShapefile(f).features); continue; }
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (/raw\.json$/i.test(f)) feats.push(...osmFeatures(j, layer.osm || 'lines', layer.bbox || bbox));
    else if (j.type === 'Topology') feats.push(...topoToGeo(j).features);
    else if (j.type === 'FeatureCollection') feats.push(...j.features);
    else if (j.type === 'Feature') feats.push(j);
  }
  return feats;
}
function readCredit(key) { const f = path.join(SRC, key, 'credit.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; }

try {
  if (cmd === 'fetch') {
    const kind = args[2];
    if (kind === 'tiger') {
      const layer = (args[3] || '').toLowerCase(), list = (args[4] || '').split(',').filter(Boolean), year = opt('year', '2024');
      const BY = { cousub: 'state', place: 'state', arealm: 'state', prisecroads: 'state', rails: 'us', state: 'us', county: 'us', coastline: 'us', areawater: 'county', linearwater: 'county', roads: 'county', edges: 'county', faces: 'county' };
      if (!BY[layer] || (!list.length && BY[layer] !== 'us')) { console.error(usage + M(`\n图层：${Object.keys(BY).join(' / ')}`, `\nLayers: ${Object.keys(BY).join(', ')}`)); process.exit(1); }
      for (const f of BY[layer] === 'us' ? ['us'] : list) {
        if (BY[layer] === 'state' && f.length !== 2) throw new Error(M(`${layer} 按州发布：给 2 位州代码（如 25），不是 ${f}`, `${layer} is published per state: give a 2-digit state code (e.g. 25), not ${f}`));
        if (BY[layer] === 'county' && f.length !== 5) throw new Error(M(`${layer} 按县发布：给 5 位县代码（如 25025），不是 ${f}`, `${layer} is published per county: give a 5-digit county code (e.g. 25025), not ${f}`));
        const name = `tl_${year}_${f}_${layer}`, url = `https://www2.census.gov/geo/tiger/TIGER${year}/${layer.toUpperCase()}/${name}.zip`, key = `tiger-${layer}-${f}`, dir = path.join(SRC, key), zip = path.join(dir, `${name}.zip`);
        const n = await download(url, zip); unzip(zip, dir); fs.rmSync(zip);
        writeCredit(dir, { title: `TIGER/Line ${year} ${layer.toUpperCase()} ${f}`, author: 'U.S. Census Bureau', licence: 'Public domain (U.S. Government work)', url, source: 'tiger' });
        console.log(M(`✓ ${key}：${kb(n)}（美国人口普查局 TIGER/Line，公有领域）`, `✓ ${key}: ${kb(n)} (U.S. Census Bureau TIGER/Line, public domain)`));
      }
    } else if (kind === 'overpass') {
      let q = args[3], name = opt('name'); if (!q || !name) { console.error(usage); process.exit(1); }
      if (!/^\s*\[out:/.test(q)) q = `[out:json][timeout:120];${q}`;
      if (!/out\s+[a-z ]*;?\s*$/.test(q.trim())) q = q.trim().replace(/;?$/, ';') + 'out geom;';
      const server = opt('server', 'https://overpass-api.de/api/interpreter'), dir = path.join(SRC, `osm-${name}`), file = path.join(dir, 'raw.json');
      const n = await download(server, file, { body: new URLSearchParams({ data: q }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 240000 });
      const els = JSON.parse(fs.readFileSync(file, 'utf8')).elements || [];
      writeCredit(dir, { title: `OpenStreetMap: ${name}`, author: '© OpenStreetMap contributors', licence: 'ODbL 1.0 (Open Database License)', url: 'https://www.openstreetmap.org/copyright', source: 'osm', query: q });
      console.log(M(`✓ osm-${name}：${kb(n)}，${els.length} 个要素（© OpenStreetMap contributors，ODbL：片尾要写，基于它的数据也是 ODbL）`, `✓ osm-${name}: ${kb(n)}, ${els.length} elements (© OpenStreetMap contributors, ODbL: credit it; data derived from it stays ODbL)`));
    } else if (kind === 'url') {
      const url = args[3], name = opt('name'), licence = opt('licence') || opt('license');
      if (!url || !name || !licence) { console.error(usage + M('\n--licence 必填：先确认数据的许可', '\n--licence is required: check the data licence first')); process.exit(1); }
      const dir = path.join(SRC, name), base = decodeURIComponent(url.split('?')[0].split('/').pop() || 'data.json'), file = path.join(dir, base);
      const n = await download(url, file);
      if (/\.zip$/i.test(file)) { unzip(file, dir); fs.rmSync(file); }
      writeCredit(dir, { title: opt('title', base), author: opt('author', ''), licence, url, source: 'url' });
      console.log(M(`✓ ${name}：${kb(n)}（${licence}）`, `✓ ${name}: ${kb(n)} (${licence})`));
    } else { console.error(usage); process.exit(1); }
  }

  if (cmd === 'info') {
    const keys = args[2] && !args[2].startsWith('--') ? [args[2]] : fs.existsSync(SRC) ? fs.readdirSync(SRC) : [];
    if (!keys.length) console.log(M('还没有数据源：先 fetch', 'No sources yet: fetch first'));
    for (const k of keys) {
      const c = readCredit(k), feats = readSource(k, { osm: opt('osm', 'lines') }, null), kinds = {}, props = {};
      for (const f of feats) { kinds[f.geometry.type] = (kinds[f.geometry.type] || 0) + 1; for (const [p, v] of Object.entries(f.properties || {})) { const s = (props[p] ??= new Set()); if (s.size < 6 && v !== null && v !== '') s.add(String(v).slice(0, 28)); } }
      console.log(`\n${k}  ${c ? `(${c.licence})` : ''}\n  ${Object.entries(kinds).map(([t, n]) => `${t} ×${n}`).join(', ')}`);
      for (const [p, s] of Object.entries(props)) console.log(`  ${p}: ${[...s].join(' | ')}`);
    }
  }

  if (cmd === 'build') {
    const recipeFile = path.resolve(proj, args[2] && !args[2].startsWith('--') ? args[2] : 'geo.json');
    if (!fs.existsSync(recipeFile)) throw new Error(M(`没有 ${recipeFile}：先写构建配方（格式见本文件开头）`, `No ${recipeFile}: write the build recipe first (format at the top of this file)`));
    const R = JSON.parse(fs.readFileSync(recipeFile, 'utf8')), out = R.out || 'map', bbox = R.bbox, layers = {}, credits = [];
    if (!bbox || bbox.length !== 4) throw new Error(M('geo.json 要有 bbox：[西, 南, 东, 北]', 'geo.json needs bbox: [west, south, east, north]'));
    const prj = toM((bbox[1] + bbox[3]) / 2);
    for (const [name, L0] of Object.entries(R.layers || {})) {
      const L = { tolerance: R.tolerance ?? 8, precision: R.precision ?? 5, ...L0 }, bb = L.bbox || bbox, srcs = [].concat(L.src);
      let feats = [];
      for (const s of srcs) { feats.push(...readSource(s, L, bb)); const c = readCredit(s); if (c && !credits.some((x) => x.url === c.url)) credits.push({ title: c.title, author: c.author, licence: c.licence, url: c.url, date: c.date }); }
      const n0 = feats.length, outF = [];
      if (L.dissolve) {
        const pre = feats.filter((f) => { const p = f.properties || {}; if (L.where && !Object.entries(L.where).every(([k, v]) => match(p[k], v))) return false; if (L.not && Object.entries(L.not).some(([k, v]) => match(p[k], v))) return false; return f.geometry && /Polygon/.test(f.geometry.type) && hits(gbbox(f.geometry), bb); });
        feats = dissolve(pre); L.where = null; L.not = null; L.keep = [];
      }
      for (const f of feats) {
        const p = f.properties || {};
        if (L.where && !Object.entries(L.where).every(([k, v]) => match(p[k], v))) continue;
        if (L.not && Object.entries(L.not).some(([k, v]) => match(p[k], v))) continue;
        if (!f.geometry || (L.geom && !f.geometry.type.includes(L.geom.replace(/^Multi/, '')))) continue;
        if (!hits(gbbox(f.geometry), bb)) continue;
        const g = shapeGeom(f.geometry, L, prj); if (!g) continue;
        const props = {}; for (const k of L.keep || []) if (p[k] !== undefined && p[k] !== null && p[k] !== '') props[(L.rename || {})[k] || k] = p[k];
        outF.push({ type: 'Feature', properties: props, geometry: g });
      }
      layers[name] = { type: 'FeatureCollection', features: outF };
      console.log(M(`  ${name}：${n0} → ${outF.length} 个要素`, `  ${name}: ${n0} → ${outF.length} features`));
    }
    const js = `// built by geodata.mjs from ${path.basename(recipeFile)} — do not edit by hand; change the recipe and run build again\nwindow.GEO = window.GEO || {};\nwindow.GEO[${JSON.stringify(out)}] = ${JSON.stringify({ bbox, layers, credits })};\n`;
    const dest = path.join(proj, 'assets', 'geo', `${out}.js`); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, js);
    console.log(M(`✓ ${dest}（${kb(js.length)}）；页面里加 <script src="assets/geo/${out}.js"></script>，用 GEO.${out}`, `✓ ${dest} (${kb(js.length)}); load it with <script src="assets/geo/${out}.js"></script> and use GEO.${out}`));
    if (js.length > 6 * 1048576) console.warn(M('文件偏大：缩小 bbox、调高 tolerance / minArea，或者少要几类要素', 'The file is large: shrink the bbox, raise tolerance / minArea, or keep fewer kinds of features'));
  }
} catch (e) { console.error(e.message); process.exit(1); }
