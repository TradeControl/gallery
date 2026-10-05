# Gate 2 investigation — Block 1: Show me the Tree

## Current runtime failure

The blank page is the combined result of an empty bootstrap geometry, a
latest-only installation policy, and a real mesher capacity failure.

1. `createEngineeredTreeLayer()` creates `continuous-tree-surface` with an empty
   `BufferGeometry`, then immediately submits a module-worker rebuild
   (`engineered-tree-layer.js:12-17`, `74-78`, `148-151`, `236-242`, `299`).
2. A bounded direct probe of the page's exact default bootstrap state succeeded:
   35 active edges at cell size `0.041472` produced 126,335 vertices and 252,666
   triangles in 14.33 seconds.
3. `main.js` starts recursive unfolding immediately and continually calls
   `setGrowthProgress()` (`main.js:255-260`). While that first build is running,
   newer quantised states become pending. The worker message handler installs a
   result only when its desired-state id is still latest *and* `pendingState` is
   null (`engineered-tree-layer.js:165-180`). The valid bootstrap result is
   therefore discarded. The focused worker test currently asserts this exact
   behaviour: the completed active result leaves `build === null` when a newer
   growth state is pending.
4. The final quiescent default state does not produce a replacement. The live
   browser reports `Surface: error`, `Triangles: 0`, and `Last rebuild: —`; its
   console reports:

   > Tree surface rebuild failed: Sparse union exceeded maxCells (250000);
   > observed 250001 candidate cells while processing segment 52 at cellSize
   > 0.0324. (structuralFeedback=[])

   A bounded direct reproduction reached the same error with 406 active edges.
   The failure is the first authored patch for `junction-0`: a transitive cluster
   of nine nodes (`planting-root`, `uptake`, `exchange`, `meaning`, three crown
   trunk nodes, `delivery-rhythm`, and `process-observation`) represented by 266
   local primitives. Its minimum radius is `0.125803`; the current cell size
   already gives only 3.883 cells per radius. The capacity retry cannot coarsen
   because the configured four-cells-per-minimum-radius constraint limits the
   cell size to `0.031451`, which is finer than the failing `0.0324`.
5. `tree-surface-worker.js` catches that `RangeError` and posts its text back
   (`82-88`). The layer records the error but has no previously installed mesh to
   retain (`engineered-tree-layer.js:170-187`). The original empty geometry thus
   remains visible as nothing.

This is not a worker-start, worker-messaging, camera, lighting, material, or
geometry-installation failure. The worker prepares the model, enters the
production mesher, and returns a structured response which the main thread
receives. Installation is never reached for the failed final result. The visible
controls and grid, plus the absence of an installation error, support the same
conclusion.

## Previous architecture

The workspace contains a hybrid semantic mesher rather than one global implicit
field:

- `tree-surface-model.js` samples the authored curves, applies conduit radii,
  resolves unrelated close branches, and later truncates those same paths for a
  quantised growth state.
- `hybrid-tree-mesher.js` groups short or non-isolatable semantic edges into
  junction clusters. Each cluster is meshed as a local sparse hard-union field.
  Planar port caps are removed and the resulting boundary vertices are reused by
  explicit parallel-transport tube spans or staged bridges.
- The final assembler orients the surface, constructs checked normals, and emits
  face and vertex provenance for hierarchy owners and edge ids.
- Port failures may advance port depth or absorb whole semantic edges and rebuild.
  Local fields may retry lattice origins, coarsen within the minimum-radius bound,
  or use a star-shaped topology fallback. These retries preserve useful local
  robustness but can create large transitive clusters and expensive rebuilds.
- `tree-surface-worker.js` imports the production `hybrid-tree-mesher.js`.
  `hybrid-tree-mesher-curve-loft-experiment.js` is an isolated experiment and is
  not on the application runtime path.

The worker lifecycle is intended to keep the last valid closed surface on screen
while remeshing. That works only after a result has been installed; the present
latest-only rule prevents a slow first result from becoming that baseline.

## Reproduced evidence

- The focused Gate 2 unit suite passed 41/41 in 6.39 seconds. It covers worker
  lifecycle behaviour, mesh-audit failure modes, semantic collision policy,
  sparse-union determinism/capacity diagnostics, and eight hybrid fixtures.
- The checked-in 181-to-12 staged-bridge regression presently produces 21,402
  vertices and 42,800 triangles. Its complete bounded intersection pass examined
  337,227 candidate pairs and found zero intersections. It also reports one
  genus-zero component, no boundary or non-manifold edges/vertices, no winding or
  orientation conflict, no repeated-index or zero-area faces, and no opposed
  normals. The *current zero* is reproducible; no retained artifact records the
  historical starting count of 204.
- One bounded full-tree scenario was run, not the matrix:
  `tier-0-weight-0.75`. It passed in 30.30 seconds with 338,151 vertices and
  676,298 triangles. The fixture still validates all 683 nodes and 682 relations;
  this state manifests 308 nodes and 307 edges. Its global audit reports one
  genus-zero component; zero boundary edges/loops, non-manifold edges/vertices,
  winding/orientation conflicts, invalid/degenerate faces, non-finite values, or
  opposed normals; and complete owner/edge provenance for the 307 active edges.
  It used one structural retry, absorbed 23 short edges, and used 11 topology
  fallback patches. Sampled resident memory was 1,208 MiB after meshing and
  1,127 MiB after audit.
- That full-tree audit did not enable the optional global triangle
  self-intersection pass, so it does not prove that the 676,298-triangle surface
  is globally intersection-free. Provenance success proves complete bookkeeping
  and allowed contact transitions, not that every individual face has an
  artistically ideal owner.
- The reported 11 collapsed faces and five effective boundary loops are not
  reproduced by current code: the current bounded full-tree result has zero
  degenerate faces and zero boundary loops. They appear to describe an earlier
  transient failed result.
- The reported roughly 247 seconds and 1.8 GiB are plausible given the retry
  structure but are not recoverable from any saved log or result. The current
  bounded run took 30.30 seconds and its memory values are samples rather than a
  peak measurement, so it neither confirms nor strictly disproves the earlier
  observation.
- No `gate2-audit-results.json` or equivalent persisted full-matrix artifact is
  present. The full matrix was deliberately not run during this block.

## Architecture assessment

**REVISE.**

The architecture should not be abandoned: its local hard-union/explicit-span
construction passes demanding representative cases, and the smallest active
full-tree state passes the available global topology and provenance audit.

It should not continue unchanged. The default mature page fails before producing
a mesh because semantic clustering has accumulated too much geometry in one
local field. Independently, the worker policy discards a valid current-revision
bootstrap surface whenever growth has queued a newer state. Full mature-tree
convergence, global self-intersection freedom, visual continuity, and practical
cost therefore remain unproved.

## Next bounded block

Change only the worker-result installation policy so that a successful response
from the current worker generation and current layout revision may establish or
replace the last-valid surface even when a newer growth state is pending. Submit
the pending request immediately afterwards, continue to ignore superseded errors,
and retain the installed surface if that later request fails.

Add one focused `FakeWorker` regression proving that the initial successful
surface becomes visible while a later growth state remains queued, then verify in
the browser that the default 35-edge bootstrap Tree remains visible when the
mature 406-edge request reports its existing capacity error. Do not alter the
mesher, cell budget, clustering, material, hierarchy, or Gate 3 work in that
block.

## Next bounded block — implementation result

**Status: implemented and verified; stopped for review.**

### Implementation

The worker response policy in `engineered-tree-layer.js:165-195` now treats
successful surfaces and errors asymmetrically:

- The existing disposed, worker-instance, worker-generation, active-request-id,
  and layout-revision guards remain in force.
- A successful result from the current worker generation and current layout
  revision is installed as the new last-valid surface even when a newer
  quantised growth state is pending. The coalesced pending state is then submitted
  normally.
- An error is still published only when it belongs to the latest desired state
  and no replacement is pending. A superseded error remains hidden and causes the
  pending request to reinitialise its worker model, as before.
- A later failed request does not clear `lastBuild`, collision information, or
  the installed geometry.

No mesher, worker, cell-budget, clustering, hierarchy, material, growth, camera,
or Gate 3 code was changed in this block.

### Test evidence

The previous first worker test encoded the unwanted behaviour by expecting a
valid superseded result to leave `build === null`. It is now the focused
regression `a successful current-revision result remains visible while newer
growth fails` in `engineered-tree-layer.test.mjs:126`.

The test queues a newer growth state, completes the bootstrap request, and proves
that the bootstrap geometry is installed and visible while the next request is
active. It then returns the known capacity error for that latest request and
proves that:

- the layer becomes idle and reports the error;
- the exact bootstrap `BufferGeometry`, position array, index array, build
  record, and collision report remain installed;
- the mesh remains visible; and
- `whenIdle()` resolves to the retained bootstrap build.

Verification results:

- `npm.cmd run test:tree-worker`: 5/5 passed; focused regression 5.99 ms,
  complete command 110.71 ms.
- `npm.cmd run test:gate2:unit`: 41/41 passed; complete command 4.77 seconds.
- `npm.cmd exec vite build -- src/category-tree/tree`: production build passed
  in 531 ms. The existing chunk-size advisory remains; there was no build error.

### Resulting runtime state

The page was freshly exercised at
`http://localhost:5173/src/category-tree/tree/index.html` with the unchanged
defaults: Growth tiers 3, Conduit weight 1.34, Crown spread 1.14, Vertical rise
0.95, Asymmetry 0.68, and Wind sweep 0.48.

After recursive complexity reached 100%, the Silhouette view visibly retained
the white 35-edge bootstrap Tree. The control readout reported:

- `Surface: error`;
- `Triangles: 252,666`, rather than zero;
- `Last rebuild: 36151 ms`, rather than an em dash; and
- `Recursive complexity: 100%`.

The only browser error was the unchanged mature-state failure:

> Tree surface rebuild failed: Sparse union exceeded maxCells (250000);
> observed 250001 candidate cells while processing segment 52 at cellSize
> 0.0324. (structuralFeedback=[])

There was no worker-start, messaging, or geometry-installation error. Visual
inspection confirmed that the Tree remained present after this terminal error,
so the last-valid-surface lifecycle now behaves as intended.

The mature-tree capacity failure remains unresolved and was not investigated or
modified during this block. Architecture status remains **REVISE**. No further
Gate 2 block has begun.
