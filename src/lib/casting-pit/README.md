# Casting Pit modules

This directory contains only mechanisms demonstrated by the signed-off Casting Pit studies. It is an ES-module library, not an application framework. Reference pages remain responsible for choosing parameters, controls, camera and which independent layers to mount.

## Structure

- `world.js` owns one Three.js scene, camera, renderer, orbit controls, resize handling and render loop. Multiple layers can register frame callbacks with the same world.
- `membrane.js` supplies the signed-off shared Gaussian membrane height, gradient, geometry creation and deformation operations. Its live parameter object is shared with whichever layers inhabit the membrane.
- `controls.js` contains the native range-input and camera-button bindings used by the reference pages.
- `random.js` contains the deterministic seeded generator used by both systems.
- `universe/sluice-gate-layer.js` owns the signed-off material system: independent peripheral streams, invisible phased gates, rim reservoir, parcel interaction and molten-field reconstruction.
- `universe/eroded-throat-membrane.js` is the bounded v0.6a physical extension: deterministic background erosion, gate-derived historical cuts, an irregular opening and a short tapering throat wall.
- `cosmos/cosmic-circuitry-layer.js` owns the signed-off information system: independent hierarchical topology, manifested conduits, ember substrate and constant-spatial-speed communication droplets.
- `index.js` is the public export surface.

## Composition

Create one world and one membrane, then pass both to either or both layer factories. Universe and Cosmos do not import or call each other. Their only shared mutable dependency is the membrane parameter object supplied by the composition root. Each factory accepts `includeEnvironment`; leave it at its reference-preserving default of `true` for a standalone page, or set it to `false` on one layer when a combined composition should use the other layer's membrane material, lighting and receiver.

The current reference roots are deliberately small:

- `src/casting-pit/physical-layer/main.js`
- `src/casting-pit/information-layer/main.js`

Each copies its exported defaults, creates the shared world and membrane, mounts one independent layer, binds the existing controls, selects the signed-off camera and starts the world loop.

The combined root is `src/casting-pit/universe-cosmos/main.js`. It gives both factories one parameter object and one membrane, retains the Universe environment, and mounts Cosmos without a second surface or lighting rig. The layer factories expose only the additional composition seams demonstrated by that experiment:

- `controlPrefix` permits both established control sets to coexist without duplicate HTML identifiers;
- `bindEnvironmentControls: false` lets a Cosmos layer defer membrane, light, exposure and wireframe controls to its host composition;
- `setVisible()` supports Universe-only, Cosmos-only and combined inspection without pausing or resetting either system.
- `manifestationLiftScale` and `moltenRenderOrder` let the combined study establish stable physical foreground precedence without changing either standalone reference.

These options default to the standalone reference behaviour.

The v0.6a physical-only root is `src/casting-pit/well-throat/main.js`. It deliberately does not involve Cosmos. The optional gate-layout callback lets the throat derive a few historical erosion bearings from the same deterministic gates that release present-day material. Opening crossing, surface clipping and the short wall are exposed only when a membrane supplies the corresponding throat operations, so the signed-off Gaussian references retain their original behaviour.

## Equivalence notes

The shader source, simulation constants, seeded generation, update order, materials, render order, controls and initial camera states were moved without artistic changes.

The unavoidable structural difference is that the renderer and orbit-control update now occur in the shared world loop immediately after registered layer callbacks. This is the same order used by both former standalone animation functions. Timing counters and the exact instantaneous state of stochastic animation naturally vary between page loads; no persistent visual or behavioural difference was observed.

The layer factories construct their own signed-off membrane material, lighting and diagnostic presentation and return those objects under `environment`. That preserves each standalone reference exactly while allowing a future combined composition to select one environment explicitly rather than silently merging two artistic treatments.
