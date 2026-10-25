# Substrate modules

This directory owns reusable substrate mechanisms, not a composition or page.

`energetic-sea-layer.js` is the disconnected, textureless pressure-sea engine used by the standalone study at `src/category-tree/substrate/`. It owns fixed surface geometry, procedural displacement, optical detail, deterministic motion, material-local illumination and validated parameters. It has no scene-light, DOM, camera, renderer, gravity well, membrane, Tree, planting-envelope or composition dependency.

The standalone page owns the camera, controls and render loop, but no special scene-light rig. The engine clears scene-light contributions for its own material and reconstructs the bounded cold-key, cross-current and warm-edge response locally; it cannot relight another object. A future Category Tree composition adapter may supply spatial integration rules after the independent surface is artistically accepted. The rejected composition-bound experiment is preserved at reference commit `7cffc2b`, not treated as an authority over this engine.

`index.js` is the public export surface.
