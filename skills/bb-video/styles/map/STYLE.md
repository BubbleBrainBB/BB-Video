# Animated map (地图动画, `map`)

> Relative paths in this file (`scripts/…`, `references/…`, `runtime/…`) are relative to bb-video's `promo/` folder.

One frame: a designed, printed map drawn from real geodata — warm paper land, a pale sea with engraved water lines following the coast, parks in soft green, a fine street texture, place names in cartographic type with paper halos — and on it the story. Routes draw on stroke by stroke with a bright pen dot at the head; a tram, a train, a plane or a dot travels a line and reaches each stop on the word; stations pop in one after another; areas spread outward like ink (reach, catchment, territory); printed callout cards are pinned to places with a thin leader; a year counter rolls in a printed box; a small globe in the corner shows where we are. One continuous camera turns the globe, dives from the planet to the street (zooming out and back in for long hops), pans, tilts and follows a vehicle; what is being talked about stays lit while the rest of the map sinks under a veil of paper.

References (found and compared, `videos/boston-t-map/research/references.md`): the animated-map explainers built with GEOlayers (Johnny Harris / Vox "Borders": textured maps, one place lit in a strong colour, lines drawn with a moving head, a globe that dives in); old city atlases and street-railway maps (the Leventhal Center's 1910 *Map of Boston and vicinity, showing tracks operated by the Boston Elevated Railway Co.*: cream land, blue-green sea with water lining, spaced capitals for towns); Swiss / Imhof label conventions (water names in italic serif, settlements upright, halos); John Nelson's and Fantastic Maps' coastal water-line and stipple tutorials. Without a reference from the user, look at real maps of the subject's place and era again and compare the stills before showing them.

Runtime: `runtime/map.js` (`await PROMO.map(F, opt)`, canvas 2D + HTML / SVG labels; d3 + topojson-client only for the globe, the inset and non-Mercator projections — the starter pages load them, pinned, from jsDelivr). Data: `scripts/geodata.mjs` (fetch → build one small file per film). New project: explainer `node explainer/scripts/new.mjs <dir> --style map`, promo `node scripts/new.mjs <dir> --style map`. Starter pages: `styles/map/explain.html` (narrated, no data of its own: the coarse world layer), `styles/map/index.html` (promo, on the beat). Sample: `videos/boston-t-map` (波士顿地铁).

## 0. Safety
- **Real geodata, credited.** Every layer comes from open data with a known licence: Natural Earth (public domain), US Census TIGER/Line (public domain), OpenStreetMap (ODbL: credit "© OpenStreetMap contributors"; data derived from it stays ODbL), a city's or agency's open data (read its licence first: e.g. the MassDOT Developers License asks to credit MassDOT and forbids its logos and any implied endorsement). `geodata.mjs` writes each source's credit; the page registers them (`F.credit`) and the render lists them in `out/CREDITS.txt`; the end card names them too.
- **Before downloading** any geodata, tell the user the files, source, licence and size, and wait for their OK (`geodata.mjs` prints the size of what it fetched).
- **Our own map design.** Line names and line colours are facts and can be used; logos, trademarks and an official map's design (its diagram, its station symbols, its layout) are not. No "unofficial / not affiliated" corner line; sources go on the end card and in `out/CREDITS.txt`.
- **Honest geometry.** Today's routes drawn for a past year say so on screen (`G.note('线路为今日走向')`); a guessed position (a demolished incline, an ancient battle line) is labelled illustrative in brief.md. Borders in disputed areas: use the data's own (Natural Earth's de facto lines) and say so when it matters.

## 1. When to use
- Anything that happens *somewhere*: transit and cities (how a network grew, how to get across town), history campaigns and journeys, trade and migration routes, the spread of something (a language, a disease, a chain of stores), where a product's users or offices are, before / after maps with a year counter.
- "Where is it?" openers for any explainer about a place.
- Not suited: things with no geography (use a board style), a single object's detail (`toy3d`), processes inside one building (`isometric`), character drama (`shadow`, `ink`, `pixel`, `chat`).

## 2. What it is (and isn't)
- **Essence**: the map is the argument. Information sits where it happens — a route drawn where it runs, a number pinned where it was counted, a year on the map's own box — and the camera goes to the place being named.
- **Not `isometric`**: no 45° diorama, no tiles or little 3D buildings; a flat printed map seen from above (tilted at most ~45° when following something), real coastlines and streets from data.
- **Not a web-map screenshot**: no tiles, no app UI, no pin-drop markers in Google red; our own paper, our own type, our own symbols. Not a board / diagram style either: no boxes and arrows floating on blank ground — every mark is anchored to a place.

## 3. Colour
- Grounds (`opt.ground`): `atlas` (default: warm paper `#F2EBDA` land, sea `#C4D8D4` with water lines `#7FA5A6`, coast `#5E8A8E`, parks `#D6DDB6`) — an old city atlas; `chart` (cool modern print, white land, blue sea); `night` (dark land `#1A222C`, darker sea, glowing lines). Override any colour by name: `{ ground: 'atlas', colors: { accent: '#…' } }`. Names work wherever a colour is taken (`'land'`, `'water'`, `'park'`, `'accent'`, `'ink'`, `'muted'`, `'paper'`…).
- Data colours win: transit lines in their real colours (from the agency's data), countries / territories in a few muted tints, and **one accent** (`accent`, a print red) for "look here". The base map stays quiet so the coloured story reads.
- Focus (`G.focus`) lays a veil of the paper colour over everything else (about 60 %); holes for focused areas.

## 4. Type
- Fonts (the starter pages load them; OFL): **Barlow Semi Condensed** for place and station names (a cartographic condensed sans), **Crimson Pro italic** for water names and the year numerals, **Noto Sans SC / Noto Serif SC** for Chinese (callout titles and the cartouche in Noto Serif SC 900).
- Label kinds (`G.label(…, { kind })`): `city` (spaced capitals, 46 px), `town` (spaced capitals), `district` (wide-spaced small capitals, muted), `water` (italic serif, blue-grey, may follow a line: `along`), `park` (italic, green), `station` (semibold), `note` (a coloured tag, e.g. "橙线 1901"). Every label has a paper halo and a Chinese sub line (`sub`) when the film is Chinese.
- Labels fade in with a small rise; they fade by zoom (`minZoom` / `maxZoom`) and give way to higher-priority labels when they collide (`priority`, `declutter`).
- Phone legibility: map labels are small by nature — each line of narration also needs one big piece: a callout title (44–48 px), the year (96 px), the legend figures, the cartouche. `--check` reports stretches with nothing readable on a phone.

## 5. Motion
- **Draw on**: lines draw from their start (`G.line(…, { at, dur })` or `R.draw(at, dur)`), several parts of one line in sync by length (branches leave the trunk together); a pen dot rides the head.
- **Travel**: `G.travel(line, { at, dur })` or `{ stops: [[t, place]…] }` (reach each place on the word); markers `dot` (pulsing), `tram` / `train` (a car aligned with the track), `plane`, `ship`, or your own drawing function; `trail: true` draws the line behind it.
- **Pop**: pins and stations scale in with a slight overshoot and a ring that spreads and fades (`stagger` 0.03–0.3 s); transit stations can pop as the drawing head passes them.
- **Spread**: `G.spread` fills areas outward from a point with an uneven, soft front (ink on paper); `G.reach` grows circles of a real radius (metres) as one union.
- **Recolour**: `R.recolor(at, colour)` (a line gets its colour), areas tint in (`G.area`), the focus veil eases in and out (0.45 s).
- Everything held keeps drifting: the camera creeps in (`drift`), markers pulse — a map frame is never a still picture.

## 6. Camera and transitions
- **One continuous camera.** `G.camera([{ at, fit: [things], dur }…])`. `fit` takes places ([lon, lat]), bounds ([w, s, e, n]), GeoJSON, lines, pins, movers; it leaves room for the chapter bar and captions (`room: { top, bottom, left, right }`, `pad`). Or `center` + `zoom` (web-map zoom levels: ~2 globe, ~6 a region, ~11 a city, ~15 a few streets).
- Long hops **fly** (van Wijk & Nuij: zoom out, travel, zoom in — `fly: false` glides straight). Globe → street in two or three keys (planet → region → city); ≤ 2.5 zoom levels per second (`--check` warns).
- **Tilt and turn**: `pitch` (0–50°) and `bearing` (the direction that is up) on any key; with `follow: mover` the camera rides along (a train crossing a river, a ship along a coast) — keep pitch ≤ 40 and glide into a follow over ≥ 2 s.
- **Globe**: below zoom ~5.4 (`opt.globeZoom`) the world is drawn as a sphere (needs `await G.world()`); zooming in hands over to the flat map, and to the detailed data once the view fits inside its extent.
- No cuts by default; a `cut: true` key when a film really jumps.

## 7. Sound
- Music (`styles/map/score.js`): a travel documentary over an atlas — felt piano walking in eighths, pizzicato, a warm string bed, a bell motif when the whole network is on the map; D major; a bed under the voice.
- Effects (`styles/map/sound.js`, emitted by the runtime): `draw` (a nib scratching, with the line's duration), `pop` (wooden taps for pins / stations), `tick` (labels, callouts, legend rows), `whoosh` (camera flights), `roll` (the year counter's ratchet), `bleed` (spread / reach), `glow` (focus, areas), `travel` (a low hum under a moving marker), `stamp` (the title cartouche).

## 8. Signature moves
- **The dive**: the globe turns to the place, the camera falls through region and city to the street.
- **Growth by year**: lines draw in the order they were built while the year counter rolls (`G.year`), each tagged with its year.
- **Follow the vehicle**: a tilted camera rides along with a train over a bridge or a ship along a coast (`follow`, `stops`).
- **Light one, dim the rest** (`G.focus`): one line, one district, one route stays in colour.
- **Ink spread** (`G.spread`, `G.reach`): territory, catchment, reach growing from a point.
- **Printed furniture**: callout cards pinned to places, a legend with figures (`G.legend`), a locator globe (`G.inset`), a scale bar and north arrow (`G.scale`, `G.north`), the title cartouche.

## 9. Data
`scripts/geodata.mjs` turns open data into one small file the page loads (`<script src="assets/geo/<name>.js">` → `GEO.<name> = { bbox, layers, credits }`):
- `fetch tiger <layer> <fips>` — US Census TIGER/Line: `faces` (every face flagged land / water: the exact coast), `areawater`, `cousub` (towns), `arealm` (parks, campuses, airports), `roads`, `linearwater`, `place`, `county`, `state`…
- `fetch overpass "<query>" --name <key>` — OpenStreetMap; the build assembles ways into lines, multipolygons into polygons, `coastline` into land polygons for the bbox, `routes` into lines + stops.
- `fetch url <url> --name <key> --licence "…"` — any GeoJSON / TopoJSON / zipped shapefile (Natural Earth, an open-data portal).
- `info [key]` — feature counts, attribute names and sample values (to write filters).
- `build` from the project's `geo.json`: per layer `src`, `where` / `not` filters, `keep` attributes, `bbox`, `tolerance` (m), `minArea`, `minLength`, `dissolve` (merge polygons that share edges — TIGER faces with `LWFLAG: "L"` → land with the real coast).
- A project script may write its own GeoJSON into `assets/geo/src/<key>/` (with a `credit.json` holding `{ title, author, licence, url, date }`) — e.g. route shapes and stops from a transit agency's API.
- Base roles (`opt.base`): `land`, `water`, `parks`, `campus`, `airport`, `streets`, `roads` → layer names (a role may name several). Make the data's bbox a little larger than the widest view in **both** aspects (portrait needs it taller), or the coarse world shows at the edges.
- Coarse world (`await G.world()`): Natural Earth 1:50m land, country borders, US states (world-atlas / us-atlas); credited automatically.

## 10. Transit
`G.transit({ lines, stations, key: 'route', width, casing, per: { id: { color, width } } })` on top of the general verbs:
- `T.line(id)` — one line object per route (all its patterns, drawn in sync); `T.draw(id, at, dur, { stations: true | { labels } })` draws it and pops its stations as the head passes them.
- `T.stations(id, at, { stagger, only, labels })`, `T.transfers(at, { only, labels })` (stations served by two colours: larger rings).
- `T.station(name)` → `{ ll, routes }`; `T.between(id, a, b)` → the coordinates along a route between two stations (a first segment, a trip, the loop between four hubs).

## 11. Pitfalls and self-check
- Ring orientation and dissolved faces: if land looks like water (or the reverse) after a build, check the layer with `info` and look at a still at city zoom.
- County / town polygons in TIGER reach out to sea (the 3-mile limit): use `faces` with `LWFLAG: "L"` for land along a coast, not `cousub`.
- Labels at the very edge, under the chapter bar or in the caption band, lines drawn off-frame, a moving marker leaving the frame, focus out of frame, a camera zooming too fast: `--check` reports each one with its time.
- Look at `--stills` at the globe, the region, the city and the street level, and `--strip` over every flight and follow; then the frame check of the render (`--scan`).
- Rendering cost: the water lines are computed per frame (blur + per-pixel bands): a 1080p frame takes ~0.3–0.6 s; the runtime renders one sub-frame per frame (fast flights register their own blur).

## 12. Variation
- Ground (`atlas` / `chart` / `night`), the accent, label languages (Chinese main + English sub, or the reverse).
- Projection: Web Mercator for cities and regions; `equalEarth`, `naturalEarth1`, `conicConformal`, `albersUsa`… (d3 names) for continents and history.
- Pace: an explainer moves once per line; a promo moves on the beat (`F.beat`), pins one per beat.
- Furniture on or off: inset, scale bar, north arrow, legend.

## 13. API quick reference
```js
const G = await PROMO.map(F, { data: GEO.city, ground: 'atlas' | 'chart' | 'night' | { …colours }, colors, base: { land, water, parks, campus, airport, streets, roads } | false,
                               projection: 'mercator' | d3 name | d3 projection, waterlines: true | { n, gap, width, sigma } | false, paper: 0–1 | false, background: 'water' | 'land', globeZoom });
await G.world({ detail: '50m' | '110m', states: true });   G.country('United States of America', { at, until, fill });
G.layer(geojson, { role: 'land' | 'water' | 'area' | 'line', fill, stroke, width, dash, minZoom, maxZoom, at, until, z });
const R = G.line(coords | geojson, { color, width, casing, dash, offset, at, dur, until, reverse, head, glow, name, z });  R.draw(at, dur, { from, to, ease });  R.recolor(at, colour, dur);
const V = G.travel(R | coords, { at, dur | stops: [[t, u | [lon, lat]]…], marker: 'dot' | 'tram' | 'train' | 'plane' | 'ship' | fn, color, size, trail, ease, until });
G.pins([[lon, lat] | { ll, name, time }…] | geojson, { at, stagger, until, style: 'station' | 'transfer' | 'dot' | 'pin', color, r, labels: { kind, dir, dirs, only, size } });
G.area(geojson, { at, until, fill, alpha, stroke });  G.spread(geojson, { at, dur, from, fill, alpha, until });  G.reach(points, { r: metres, at, stagger, dur, until });
G.label(where, text, { kind, sub, at, until, dir: 'c' | 'n' | 'ne' | 'e' | …, dx, dy, size, color, minZoom, maxZoom, priority, along: true, of });
G.callout(where, { kicker, title, sub, at, until, side: 'auto' | 'l' | 'r' | 't' | 'b', dist, accent, size, width });
G.title({ kicker, text, sub, at, until, y });  G.year({ keys: [[t, year]…], at, until, label, pos, size, dur });  G.legend({ title, rows: [{ color, text, sub, dash }], stats: [{ value, label, at }], note, at, until, pos });
G.note(text, { at, until, pos: 'bl' | 'br' | 'bc' | 'tl' | …, y });  G.inset({ at, until, mark: 'view' | [lon, lat], pos, size });  G.scale({ at, until, pos });  G.north({ at, until, pos });
G.focus([things], a, b, { dim });
G.camera([{ at, fit: [things], pad, room, min, max, zoom, bearing, pitch, dur, ease, drift, fly } | { at, center, zoom, … } | { at, follow: V, zoom, pitch, bearing } | { …, cut: true }]);
const T = G.transit({ lines, stations, key, width, casing, per });  T.draw(id, at, dur, { stations });  T.stations(id, at, o);  T.transfers(at, o);  T.between(id, a, b);  T.station(name);
G.at([lon, lat]) → [x, y];  G.draw((ctx, t, G) => …, { z });  G.metres(a, b);  G.onFrame(fn);
```
Time: `at` = there (readable, on the word / beat); `until` = gone; `dur` = how long a draw / move / flight takes.

Common interface (`runtime/kit.js`, the quick version `PROMO.film`): **not yet** — hand-written only, see section 14.

## 14. Not supported yet
- The quick version (`PROMO.film` / `--quick`) and the common interface: this style is hand-written only. Explainers start from `styles/map/explain.html`.
- Terrain relief (hillshade, contours), 3D buildings and extruded terrain: the map is flat (pitch only tilts the plane).
- Satellite or photo imagery under the map.
- Automatic label placement along every street; labels are placed by the film (with collision fading).
- The globe and the inset assume the Mercator flat map; with another projection, zoomed-out views use that projection's flat world instead of a globe.
- OpenStreetMap fetching depends on a public Overpass server being up (it was down while this style was built: the OSM paths of `geodata.mjs` are untested on live data — TIGER and URL sources were used for the sample).
