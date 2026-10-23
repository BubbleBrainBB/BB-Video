#!/usr/bin/env node
// The renderer lives in core/scripts/render.mjs (shared by every style and both kinds of video; usage is documented there).
// This file keeps `node explainer/scripts/render.mjs <project> …` working (messages follow the project's language, see core/scripts/lang.mjs).
await import('../../core/scripts/render.mjs');
