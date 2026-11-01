# Substrate modules

This directory owns reusable substrate mechanisms, not a composition or page.

`energetic-sea-layer.js` is the disconnected, textureless pressure-sea engine used by the standalone study at `src/category-tree/substrate/`. It owns fixed surface geometry, procedural displacement, optical detail, deterministic motion, material-local illumination and validated parameters. It has no scene-light, DOM, camera, renderer, gravity well, membrane, Tree, planting-envelope or composition dependency.

The standalone page owns the camera, controls and render loop, but no special scene-light rig. The engine clears scene-light contributions for its own material and reconstructs the bounded cold-key, cross-current and warm-edge response locally; it cannot relight another object. Optional per-instance `illuminationScale` and `warmthScale` constructor values let an adapter subordinate that local rig without changing the standalone defaults or any other scene component.

The Category Tree composition reuses this exact engine through its local `substrate-instance.js` adapter. That adapter owns spatial profiling beneath the membrane, a conservative crest budget, a hidden perimeter, a composition-specific local-light response and the narrow control bridge to the shared validated parameters. Geometric energy changes recompute the crest allowance in place so the composition's outer and deep-medium clearances remain true without replacing the shared surface. The rejected composition-bound material experiment is preserved at reference commit `7cffc2b`, not treated as an authority over this engine.

`index.js` is the public export surface.
