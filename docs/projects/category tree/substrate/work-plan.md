# Energetic substrate — standalone work plan

**Date:** 2026-10-25  
**Status:** S1 material and material-local lighting implemented and ready for human visual review; composition integration deliberately deferred

## Why this study is separate

The first dark-matter sea was developed inside the Category Tree composition. It proved the depth and rendering seams, but the result remained too calm and visually slight. The gravity well, casting terrain, planting collar and Tree also made surface development inseparable from integration work.

The standalone endpoint at `src/category-tree/substrate/index.html` removes those constraints. Its purpose is narrower: make a textureless dark medium that is energetic, spatially legible and interesting in its own right. It is not yet the final subterrain layer.

## Code boundary

- `src/category-tree/substrate/` owns the page, cameras, controls and one render loop. It contains no light objects and uses the composition exposure of `1.00`.
- `src/lib/substrate/` owns fixed surface geometry, procedural displacement, optical detail, bounded parameters, deterministic motion and material-local illumination.
- The engine has no scene-light, DOM, renderer, camera, well, membrane, terrain, Tree, planting-envelope or composition dependency.
- The rejected composition-bound prototype is recoverable at reference commit `7cffc2b`, but has been removed from the active composition. S1 does not import or adapt it.

This restores the endpoint/library pattern still used by the Casting Pit. A future composition adapter may consume the accepted engine without transferring page ownership into the library.

## S1 proposition

The first independent surface combines:

- two geometric scales: broad swells and crossing pressure folds;
- two moving, elliptical energy packets so activity gathers and disperses locally;
- three band-limited optical modes for close detail without distant moire;
- asymmetric crests and domain-warped currents rather than evenly repeated sine rows;
- opposing cold and warm grazing response over a nearly black opaque material, computed inside that material rather than by lights that can affect the rest of the world;
- no image textures, data textures, particles, post-processing or environment map.

The controls separate swell height, pressure energy, crest tension, cross-current, fine activity, reflection and current speed. Their bounds are part of the experiment: minimums remain visible and maximums remain a usable rough-sea state rather than a broken diagnostic.

The first positively reviewed high-energy candidate used `1.60` swell height, `1.75` pressure energy, `0.30` crest tension, `1.35` cross-current, `0.40` fine activity, `1.15` reflection and `1.90` current speed. These are recorded comparison settings, not yet approved defaults.

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
- The material declares zero scene-light dependencies. Focused tests require all four standard lighting accumulators to be cleared before three world-stable, material-local directions are evaluated.
- The standalone endpoint contains no Hemisphere, Directional, Ambient, Point or Spot lights and uses the composition's `1.00` exposure.
- The rejected composition P5 implementation, controls and tests were removed after being preserved at reference commit `7cffc2b`; the active composition is again the accepted P4 world.
- The complete Category Tree suite passes 118 tests with zero failures, and production builds pass for both the standalone substrate and the restored P4 composition endpoint.
- Live browser review covered the horizon, elevated and close-waterline cameras, plus the minimum and maximum control states. The elevated view exposed an early regular optical grid; S1 now uses irregular phase warping and derivative-based band limiting so that distant fine detail recedes instead of producing moire.
