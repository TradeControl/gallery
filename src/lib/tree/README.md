# Category Tree modules

This directory is the reusable Category Tree engine. It contains the hierarchy,
layout, growth, geometry, transport, rune and multipass-visibility mechanisms
shared by the standalone Tree study and the complete composition.

## Ownership boundary

- `src/lib/tree/` owns Tree data and rendering mechanisms. It has no page, DOM,
  camera, lighting or Casting Pit policy.
- `src/category-tree/tree/` remains the standalone reference endpoint. Its
  `main.js` chooses controls, defaults, lighting, cameras and the frame loop.
- `src/category-tree/composition/tree-instance.js` assembles the same exported
  Tree mechanisms inside the composition.
- `src/category-tree/composition/planting-envelope.js` and `root-system.js`
  remain composition adapters because they depend on the live Casting Pit
  membrane and its planting contract.

`index.js` is the public export surface. Specialist modules remain directly
importable for focused tests, but application roots should consume the public
surface rather than reaching into another endpoint.

The move into this library is structural only: it does not intentionally alter
Tree geometry, materials, growth, transport, motion or visibility behaviour.
