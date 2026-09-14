# Casting Pit modules

This directory contains only mechanisms demonstrated by the signed-off Casting Pit studies. It is an ES-module library, not an application framework. Reference pages remain responsible for choosing parameters, controls, camera and which independent layers to mount.

## Structure

- `world.js` owns one Three.js scene, camera, renderer, orbit controls, resize handling and render loop. Multiple layers can register frame callbacks with the same world.
- `membrane.js` supplies the shared Gaussian membrane height, gradient, geometry creation and deformation operations. Its live parameter object is shared with whichever layers inhabit the membrane.
- `controls.js` contains the native range-input and camera-button bindings used by the reference pages.
- `random.js` contains the deterministic seeded generator used by both systems.
- `universe/sluice-gate-layer.js` owns the signed-off material system: independent peripheral streams, invisible phased gates, rim reservoir, parcel interaction and molten-field reconstruction.
- `cosmos/cosmic-circuitry-layer.js` owns the signed-off information system: independent hierarchical topology, manifested conduits, ember substrate and constant-spatial-speed communication droplets.
- `index.js` is the public export surface.

## Composition

Create one world and one membrane, then pass both to either or both layer factories. Universe and Cosmos do not import or call each other. Their only shared mutable dependency is the membrane parameter object supplied by the composition root. Each factory accepts `includeEnvironment`; leave it at its reference-preserving default of `true` for a standalone page, or set it to `false` on one layer when a combined composition should use the other layer's membrane material, lighting and receiver.

The current reference roots are deliberately small:

- `src/casting-pit/physical-layer/main.js`
- `src/casting-pit/information-layer/main.js`

Each copies its exported defaults, creates the shared world and membrane, mounts one independent layer, binds the existing controls, selects the signed-off camera and starts the world loop.

## Equivalence notes

The shader source, simulation constants, seeded generation, update order, materials, render order, controls and initial camera states were moved without artistic changes.

The unavoidable structural difference is that the renderer and orbit-control update now occur in the shared world loop immediately after registered layer callbacks. This is the same order used by both former standalone animation functions. Timing counters and the exact instantaneous state of stochastic animation naturally vary between page loads; no persistent visual or behavioural difference was observed.

The layer factories construct their own signed-off membrane material, lighting and diagnostic presentation and return those objects under `environment`. That preserves each standalone reference exactly while allowing a future combined composition to select one environment explicitly rather than silently merging two artistic treatments.
