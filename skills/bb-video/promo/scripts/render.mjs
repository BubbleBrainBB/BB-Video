#!/usr/bin/env node
// The renderer lives in core/scripts/render.mjs (shared by all styles and both kinds of video; usage at the top of that file).
// This file keeps `node promo/scripts/render.mjs <project> …` working as before (messages follow the project's language, see core/scripts/lang.mjs).
await import('../../core/scripts/render.mjs');
