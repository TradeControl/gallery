# Substrate modules

This directory owns reusable substrate mechanisms, not a composition or page.

`energetic-sea-layer.js` is the disconnected, textureless pressure-sea engine used by the standalone study at `src/category-tree/substrate/`. It owns fixed surface geometry, procedural displacement, optical detail, deterministic motion and validated parameters. It has no DOM, camera, renderer, gravity well, membrane, Tree, planting-envelope or composition dependency.

The standalone page owns lighting, camera, controls and the render loop. A future Category Tree composition adapter may supply spatial integration rules after the independent surface is artistically accepted. Until then, the existing composition prototype remains separate and is not an authority over this engine.

`index.js` is the public export surface.
