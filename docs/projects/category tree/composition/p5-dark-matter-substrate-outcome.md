# P5 dark-matter substrate outcome

**Date:** 2026-10-25  
**Status:** technically complete but artistically rejected; removed from the active composition after reference commit `7cffc2b`

## Artistic proposition

The new layer is not a literal ocean and it is not a star-field plane. It is a dark pressure sea beneath the casting terrain: broad masses bend towards the gravity well, while smaller crossed disturbances reveal the surface only where light catches it.

[TDM's *Seascape* study](https://www.shadertoy.com/view/Ms2SD1) was used as evidence that a textureless procedural surface can feel organic rather than synthetic. Its code and specific look were not transplanted. The composition instead uses its own limited visual grammar: gravity-shaped macro form, non-harmonic directional interference, separate geometric and lighting scales, and restrained grazing response.

## Spatial contract

- The surface is derived from the accepted P2 planting envelope rather than positioned at an independent decorative height.
- At the defaults, the declared clearance keeps the highest possible crest at least `0.04` units beneath the deep-medium boundary. A further `0.02` interpolation reserve protects that clearance between vertices. The reserve, clearance and full `0.12` crest-to-trough relief total `0.18`, fitting inside the roughly `0.19`-unit accepted principal-root margin.
- A membrane-derived fallback keeps the layer stable when the Tree envelope is absent or detached.
- The mesh is 300 units across with 220 subdivisions: 48,841 fixed vertices and 96,800 fixed triangles. Its coordinates concentrate the fixed vertex budget around the gravity well, while its perimeter sink begins beyond radius 111, outside all current fixed review-camera frusta.
- The field uses ordinary opaque depth testing and depth writing. It does not use render order or transparency as a contact shortcut.

## Surface and light

- Three broad pressure modes deform the geometry and therefore own the silhouette and occlusion.
- Three finer crossed modes affect the lighting response without becoming a second geometric ocean.
- The modes use unequal directions, wavelengths, speeds and phases. Domain-warped currents, balanced directions and restrained cross-feedback break the long parallel ridges that made an earlier review pass read as shifting black sand.
- Fine detail fades with screen-space footprint, so distant views retain large form rather than turning into glitter or moire.
- The material is a restrained `MeshStandardMaterial` extension: no image textures, no data textures, no sampler uniforms, and no off-screen render target.
- The first restrained pass was rejected during live review because it was effectively black even at the control maxima. A brighter, highly roughened correction then read as shifting black sand. The retained study separates visibility from scene lighting: it strongly absorbs the Universe lights, adds its own bounded graphite reflection at grazing angles, and reserves fine normals for optical shimmer while the real geometry carries the connected swells.

## Review controls and comparisons

P5 exposed four bounded study controls:

- Outer depth
- Field relief
- Pressure current
- Grazing reveal

The inspection modes included `Dark matter`, `Terrain + sea` and `Tree + sea`. The pre-P5 `Pit`, `Tree`, `Universe + Tree`, `Cosmos + Tree` and `Pre-P5 complete` comparisons remained substrate-free, so P3 and P4 were not silently redefined.

The substrate ran inside the existing composition animation loop. It created no new animation loop and did not rebuild geometry or material while moving or changing parameters.

## Verification

- The complete Category Tree test suite passes: 121 tests, zero failures.
- A production Vite build completes successfully.
- Live browser review covered isolated, terrain-plus-sea, tree-plus-sea, root, subterrain and complete views.
- The final pass was checked with the user's development settings restored (`Tree scale 1.15`, `Root embed depth 0.00`, `Tree orientation 1 degree`, two gates, and gravity influence `1.20`). These remain temporary review settings rather than application defaults.

## Deliberate boundary for review

The finite square edge of the existing casting terrain becomes visible in the `Terrain + sea` diagnostic because the new substrate finally gives that edge something continuous to stand above. P5 does not redesign the accepted P2 terrain; any terrain-shape extension should be judged as its own composition change.

The artistic review asked:

1. Does the revised surface read as a cohesive dark medium under pressure rather than black sand, conventional water or a shader demonstration?
2. Is its grazing reveal strong enough to establish a continuous sea without stealing hierarchy from the Tree?
3. Is the exposed finite terrain edge useful as a casting plate, or should a later pass dissolve it into the surrounding field?

Cosmos integration remained outside this rejected experiment. P5 established useful technical evidence for the physical substrate and its depth contract without using stars, nebulae or atmosphere to disguise it.

## Review decision and next experiment

Live review rejected this composition-bound prototype as the place to continue material development. Even after the visibility correction it remained a calm, low-energy sea, while simultaneous gravity-well, terrain, planting and occlusion constraints made every artistic change an integration change as well.

The prototype remains useful technical evidence in this outcome record and at reference commit `7cffc2b`, but its implementation, controls and inspection modes have been removed from the active composition. Further artistic work now belongs to `src/category-tree/substrate/`, backed by the independent `src/lib/substrate/` engine. That study intentionally has no well, membrane, terrain, Tree, planting envelope or composition adapter. Re-integration is a later bounded phase, after the surface itself earns acceptance.
