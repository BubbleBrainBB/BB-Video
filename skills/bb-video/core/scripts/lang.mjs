// lang.mjs: which language the scripts' messages (checks, warnings, logs) are written in.
//   BV_LANG=zh | en wins; otherwise the project's own language — `<html lang>` of its index.html, then script.json's voice —
//   so a Chinese video gets Chinese messages and every other video English ones. The render passes its choice on to the page
//   (window.__BV_LANG) and to the sound scripts (process.env.BV_LANG), so every message of one run is in one language.
import fs from 'node:fs';
import path from 'node:path';

export function isZh(proj) {
  const env = process.env.BV_LANG;
  if (env) return env === 'zh';
  if (proj) {
    try { const m = /<html[^>]*\blang=["']?([\w-]+)/i.exec(fs.readFileSync(path.join(proj, 'index.html'), 'utf8')); if (m) return /^zh/i.test(m[1]); } catch {}
    try { const s = JSON.parse(fs.readFileSync(path.join(proj, 'script.json'), 'utf8')); if (s.voice) return /^zh/i.test(s.voice); } catch {}
  }
  return false;
}
// M(中文, English): the message in the run's language (read at call time, so a library follows what the render decided)
export const M = (zh, en) => (process.env.BV_LANG === 'zh' ? zh : en);

// Starter pages carry a few Chinese placeholder strings ('标题', '一句话' …). A project in another language gets them in English
//   (only whole quoted strings are swapped, so real content is never touched)
const PLACEHOLDERS = { 标题: 'Title', 一句话: 'One line', 一句话总结: 'One-line takeaway', 一句说明: 'One-line note', 一行说明: 'One-line caption', 标语: 'Slogan', 一个问题: 'A question', 主角: 'Hero', 配角: 'Friend', 小明: 'Alex', 小像: 'Pixie', 第一条消息: 'First message', 回一句: 'A reply', 引用的原文: 'Quoted text', 出处: 'Source', 印: 'Seal' };
export const englishPlaceholders = (html) => html
  .replace(/(['"])([\u4e00-\u9fff]{1,6})\1/g, (m, q, w) => (PLACEHOLDERS[w] ? q + PLACEHOLDERS[w] + q : m))
  // unquoted object keys too (a cast list: { 主角: { … } }), when the English name is a valid key
  .replace(/([{\s,])([\u4e00-\u9fff]{1,6})(\s*:)/g, (m, a, w, b) => (PLACEHOLDERS[w] && /^\w+$/.test(PLACEHOLDERS[w]) ? a + PLACEHOLDERS[w] + b : m));
