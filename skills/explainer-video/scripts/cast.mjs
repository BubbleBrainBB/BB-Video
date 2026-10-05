#!/usr/bin/env node
// cast.mjs: character model sheet. Reads the project's characters.js (window.CAST = { name: spec, ... })
// and renders it to an image for the user to approve.
//   node cast.mjs <project dir>                   all characters side by side → review/cast.png
//   node cast.mjs <project dir> <character name>  every expression and pose of that character → review/cast-<character name>.png
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [projArg, who] = process.argv.slice(2);
if (!projArg) { console.error('Usage: node cast.mjs <project dir> [character name]'); process.exit(1); }
const proj = path.resolve(projArg);
if (!fs.existsSync(path.join(proj, 'characters.js'))) { console.error('Not found: ' + path.join(proj, 'characters.js')); process.exit(1); }
fs.mkdirSync(path.join(proj, 'review'), { recursive: true });

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="../lib/fonts.css"><link rel="stylesheet" href="../lib/whiteboard.css">
<script src="../lib/core.js"></script><script src="../lib/whiteboard.js"></script><script src="../lib/character.js"></script>
<script src="../characters.js"></script></head><body><div id="stage"></div><script>
const WHO = ${JSON.stringify(who || null)};
EV.composition({ duration: 4, fonts: ['40px "LXGW WenKai"'], build: async () => {
  const b = WB.board({ captions: false, seed: 'cast' });
  const names = Object.keys(window.CAST || {});
  if (!names.length) throw new Error('characters.js does not define window.CAST');
  if (!WHO) {
    const n = names.length, cols = Math.min(4, n), rows = Math.ceil(n / cols);
    const cw = 1920 / cols, ch = 1080 / rows, size = Math.min(cw * 1.2, ch * 0.78);
    names.forEach((name, i) => {
      const cx = cw * (i % cols + 0.5), by = ch * (Math.floor(i / cols) + 1) - 56;
      b.character(CAST[name], { x: cx, y: by, size, at: 0, dur: 0.5, blink: false });
      b.text(name, { x: cx, y: by + 6, size: 34, align: 'center', at: 0, dur: 0.1, color: 'gray' });
    });
  } else {
    const spec = CAST[WHO];
    if (!spec) throw new Error('No such character: ' + WHO);
    // Top two rows: every expression + talking; last row: pointing in four directions (wider cells, so the arm doesn't reach into the next cell)
    const faces = ['neutral', 'smile', 'happy', 'explain', 'think', 'surprised', 'confused', 'sad', 'serious', 'proud', 'excited', 'talking'];
    const aims = [['point up-right', 1, -1], ['point left', -1, -0.1], ['point down-right', 1, 0.8], ['point up', 0.15, -1]];
    faces.forEach((e, i) => {
      const cx = 320 * (i % 6 + 0.5), by = 360 * (Math.floor(i / 6) + 1) - 44;
      const c = b.character(spec, { x: cx, y: by, size: 250, at: 0, dur: 0.5, blink: false });
      if (e === 'talking') c.expr(0, 'explain', 0.01).expr(0, { mouthOpen: 0.55 }, 0.01);
      else c.expr(0, e, 0.01);
      b.text(e, { x: cx, y: by + 2, size: 28, align: 'center', at: 0, dur: 0.1, color: 'gray' });
    });
    aims.forEach(([e, dx, dy], i) => {
      const cx = 480 * (i + 0.5), by = 1080 - 44;
      const c = b.character(spec, { x: cx, y: by, size: 250, at: 0, dur: 0.5, blink: false });
      c.expr(0, 'explain', 0.01).point(0.5, cx + dx * 300, by - 150 + dy * 300, { hold: 99 });
      b.text(e, { x: cx, y: by + 2, size: 28, align: 'center', at: 0, dur: 0.1, color: 'gray' });
    });
  }
  return b;
}});
</script></body></html>`;
const sheet = path.join(proj, 'review', 'cast.html');
fs.writeFileSync(sheet, html);
const r = spawnSync('node', [path.join(here, 'render.mjs'), proj, '--html', 'review/cast.html', '--stills', '3'], { stdio: ['ignore', 'pipe', 'inherit'] });
const out = r.stdout.toString();
if (r.status !== 0) { console.error(out); process.exit(1); }
const png = path.join(proj, 'review', who ? `cast-${who}.png` : 'cast.png');
fs.renameSync(path.join(proj, 'review', 'still-3.00.png'), png);
out.split('\n').filter((l) => l && !l.startsWith('Still: ')).forEach((l) => console.log(l));
console.log('Model sheet: ' + png);
