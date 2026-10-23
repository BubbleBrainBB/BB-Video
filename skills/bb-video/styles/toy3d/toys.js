// Toy parts list (styles/toy3d/STYLE.md section 9): Blender (node scripts/toy3d-model.mjs <project>) and three.js use the same one.
// Coordinates: y up, same units as the frame; front faces +z (if built facing +x, write front: 'x'). shape: sphere / cylinder / cone / box / capsule; eye: true = a shiny black eye
// Find real reference photos first and build against them; when done, render one side by side with the reference. Brand logos don't go here (T.toy.svg extrudes the official site's SVG directly)
window.TOY3D_SPECS = {
  // Example: a round little bean (replace with your character)
  bean: {
    joints: { body: { pivot: [0, 0, 0] } },
    parts: [
      { shape: 'sphere', color: '#5E6AD2', p: [0, 0.32, 0], s: [0.26, 0.32, 0.24], joint: 'body' },
      { shape: 'sphere', color: '#E8EAF8', p: [0, 0.22, 0.12], s: [0.16, 0.16, 0.14], joint: 'body' },
      { shape: 'sphere', color: '#0B0C12', eye: true, p: [-0.08, 0.42, 0.21], s: [0.03, 0.03, 0.03], joint: 'body' },
      { shape: 'sphere', color: '#0B0C12', eye: true, p: [0.08, 0.42, 0.21], s: [0.03, 0.03, 0.03], joint: 'body' },
    ],
  },
};
