#!/usr/bin/env node
// toy3d-model.mjs: builds the toys for the toy 3D style — with Blender if this machine can run it (parts fused into one piece, no seams), otherwise leaves it to three.js (assembled at runtime from the same parts list).
// Usage: node toy3d-model.mjs <project dir> [--check] [--only hen,rabbit] [--blender /path/to/blender]
//   --check: only check whether this machine can use Blender (found, version ≥ 3.6, runs in the background) and print the verdict
//   Reads window.TOY3D_SPECS from <project>/toys.js (the parts list; format in styles/toy3d/STYLE.md), builds each toy in Blender →
//   <project>/assets/glb/<name>.glb and <project>/assets/toys-glb.js (window.TOY3D_GLB = { name: base64 }, loaded directly by the page; fetch doesn't work under file://)
//   Re-run after changing the parts list; a toy that wasn't rebuilt is detected at runtime as out of date (TOY3D_GLB_HASH), falls back to the three.js version and logs a warning to the console
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const proj = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.');

// ---------- find Blender ----------
function findBlender() {
  const cands = [opt('blender'), process.env.BLENDER_PATH,
    '/Applications/Blender.app/Contents/MacOS/Blender', path.join(os.homedir(), 'Applications/Blender.app/Contents/MacOS/Blender'),
    '/usr/bin/blender', '/usr/local/bin/blender', '/snap/bin/blender', '/opt/blender/blender'].filter(Boolean);
  const w = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['blender'], { encoding: 'utf8' });
  if (w.status === 0) cands.push(...w.stdout.trim().split(/\r?\n/));
  if (process.platform === 'win32') {
    const pf = process.env.ProgramFiles || 'C:\\Program Files', base = path.join(pf, 'Blender Foundation');
    if (fs.existsSync(base)) for (const d of fs.readdirSync(base)) cands.push(path.join(base, d, 'blender.exe'));
  }
  for (const c of cands) {
    if (!c || !fs.existsSync(c)) continue;
    const v = spawnSync(c, ['--version'], { encoding: 'utf8', timeout: 30000 });
    const m = /Blender\s+(\d+)\.(\d+)(?:\.(\d+))?/.exec(v.stdout || '');
    if (!m) continue;
    const ver = [+m[1], +m[2], +(m[3] || 0)];
    return { path: c, version: ver.join('.'), ok: ver[0] > 3 || (ver[0] === 3 && ver[1] >= 6) };
  }
  return null;
}
const B = findBlender();
const why = !B ? '没找到 Blender（装在别处的话用 --blender <路径> 或环境变量 BLENDER_PATH）' : !B.ok ? `Blender ${B.version} 太旧（要 3.6 以上：体素重建网格、glTF 导出）` : '';
if (args.includes('--check')) {
  console.log(B && B.ok ? `能用 Blender 做玩具：${B.path}（${B.version}）` : `不用 Blender：${why}。玩具由 three.js 按零件表拼（零件之间看得出接缝，其余一样）`);
  process.exit(0);
}

// ---------- read the parts list ----------
const toysFile = path.join(proj, 'toys.js');
if (!fs.existsSync(toysFile)) { console.error(`没有 ${toysFile}：零件表写在项目的 toys.js 里（window.TOY3D_SPECS = { 名字: { parts, joints } }）`); process.exit(1); }
const box = { window: {} }; vm.runInNewContext(fs.readFileSync(toysFile, 'utf8'), box);
const SPECS = box.window.TOY3D_SPECS || {};
const only = opt('only') ? opt('only').split(',') : Object.keys(SPECS);
const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };   // same as in the runtime toy3d.js
if (!B || !B.ok) { console.log(`不用 Blender：${why}。${only.join('、')} 由 three.js 按零件表拼（运行时自动），不用做别的`); process.exit(0); }

// ---------- build one by one ----------
const outDir = path.join(proj, 'assets', 'glb'); fs.mkdirSync(outDir, { recursive: true });
const jsFile = path.join(proj, 'assets', 'toys-glb.js');
const prev = { glb: {}, hash: {} };
if (fs.existsSync(jsFile)) { const b2 = { window: {} }; try { vm.runInNewContext(fs.readFileSync(jsFile, 'utf8'), b2); prev.glb = b2.window.TOY3D_GLB || {}; prev.hash = b2.window.TOY3D_GLB_HASH || {}; } catch {} }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'toy3d-'));
const script = path.join(skill, 'styles', 'toy3d', 'blender', 'toy.py');
for (const name of only) {
  const spec = SPECS[name]; if (!spec) { console.error(`toys.js 里没有 ${name}`); continue; }
  if (!spec.parts) { console.log(`${name}：不是零件表（SVG 标志之类在 three.js 里挤出），跳过`); continue; }
  const sj = path.join(tmp, name + '.json'), glb = path.join(outDir, name + '.glb');
  fs.writeFileSync(sj, JSON.stringify(spec));
  const t0 = Date.now();
  const r = spawnSync(B.path, ['-b', '--factory-startup', '-P', script, '--', sj, glb], { encoding: 'utf8', timeout: 300000 });
  const okLine = (r.stdout || '').split('\n').find((l) => l.startsWith('TOY3D_OK'));
  if (!okLine || !fs.existsSync(glb)) { console.error(`✗ ${name}：Blender 没做出来，这个玩具退回 three.js 版\n${(r.stderr || r.stdout || '').split('\n').slice(-12).join('\n')}`); delete prev.glb[name]; delete prev.hash[name]; continue; }
  prev.glb[name] = fs.readFileSync(glb).toString('base64'); prev.hash[name] = hash(JSON.stringify(spec));
  console.log(`✓ ${name}：${okLine.split(' ')[2]} 个面，${((Date.now() - t0) / 1000).toFixed(1)} 秒 → ${path.relative(proj, glb)}`);
}
fs.writeFileSync(jsFile, `// 由 toy3d-model.mjs 生成（Blender ${B.version}）：玩具的 GLB，base64。零件表改了要重跑\nwindow.TOY3D_GLB = ${JSON.stringify(prev.glb)};\nwindow.TOY3D_GLB_HASH = ${JSON.stringify(prev.hash)};\n`);
console.log(`写好 ${path.relative(process.cwd(), jsFile)}（页面里在 toys.js 后面加载它）`);
