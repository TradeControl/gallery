# Energetic substrate — standalone work plan

**Date:** 2026-10-25  
**Status:** S1 implemented and ready for human visual review; composition integration deliberately deferred

## Why this study is separate

The first dark-matter sea was developed inside the Category Tree composition. It proved the depth and rendering seams, but the result remained too calm and visually slight. The gravity well, casting terrain, planting collar and Tree also made surface development inseparable from integration work.

The standalone endpoint at `src/category-tree/substrate/index.html` removes those constraints. Its purpose is narrower: make a textureless dark medium that is energetic, spatially legible and interesting in its own right. It is not yet the final subterrain layer.

## Code boundary

- `src/category-tree/substrate/` owns the page, cameras, lighting, controls and one render loop.
- `src/lib/substrate/` owns fixed surface geometry, procedural displacement, optical detail, bounded parameters and deterministic motion.
- The engine has no DOM, renderer, camera, well, membrane, terrain, Tree, planting-envelope or composition dependency.
- The existing composition prototype remains intact as comparison evidence. S1 does not import or adapt it.

This restores the endpoint/library pattern still used by the Casting Pit. A future composition adapter may consume the accepted engine without transferring page ownership into the library.

## S1 proposition

The first independent surface combines:

- two geometric scales: broad swells and crossing pressure folds;
- two moving, elliptical energy packets so activity gathers and disperses locally;
- three band-limited optical modes for close detail without distant moire;
- asymmetric crests and domain-warped currents rather than evenly repeated sine rows;
- opposing cold and warm grazing light over a nearly black opaque material;
- no image textures, data textures, particles, post-processing or environment map.

The controls separate swell height, pressure energy, crest tension, cross-current, fine activity, reflection and current speed. Their bounds are part of the experiment: minimums remain visible and maximums remain a usable rough-sea state rather than a broken diagnostic.

## Review questions

1. Does the surface read as a high-energy dark medium rather than black sand, liquid chrome or an ordinary blue sea?
2. Do high-energy regions hold attention without making the whole field uniformly busy?
3. Are the horizon, elevated and close-waterline views all convincing?
4. Does motion feel like interacting currents and pressure rather than a texture sliding over a plane?
5. Which controls materially improve the proposition, and which should disappear before integration?

## Gate before integration

No gravity-well shaping, terrain cutout, root interaction or P2 depth binding should be added during S1. Once the independent material is accepted, the next phase should create a narrow composition adapter and evaluate what the well must do to the approved surface, rather than asking the surface experiment to solve both problems at once.

## Technical verification

- Eight focused substrate tests cover the public parameter contract, fixed resource ownership, shader structure, deterministic motion, visibility, disposal and the endpoint/library boundary.
- The complete Category Tree suite passes 129 tests with zero failures.
- Production builds pass for both the standalone substrate and the unchanged composition endpoint.
- Live browser review covered the horizon, elevated and close-waterline cameras, plus the minimum and maximum control states. The elevated view exposed an early regular optical grid; S1 now uses irregular phase warping and derivative-based band limiting so that distant fine detail recedes instead of producing moire.
