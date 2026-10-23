#!/usr/bin/env node
// The renderer lives in core/scripts/render.mjs (shared by every style and both kinds of video; usage is documented there).
// This file keeps `node explainer/scripts/render.mjs <project> …` working, with English messages.
process.env.BV_LANG ??= 'en';
await import('../../core/scripts/render.mjs');
