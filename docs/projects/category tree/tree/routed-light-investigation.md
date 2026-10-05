# Routed Light Investigation

## Question

Can one luminous information event make the existing separate branch and trunk
meshes read as one continuous authored route?

## Chosen route

Terminal: `process-readiness-state`

Authored inward route:

`process-readiness-state → process-readiness → process-state → process-observation → crown-trunk-1 → meaning → exchange → uptake → planting-root`

The route is obtained only by walking each node's authored `parentId`. Its branch
spans use the existing `createBranchCurve` construction; the final four spans are
mapped onto the accepted monumental trunk loft.

## Rendering approach

One route-local shader study was implemented on the existing graphite meshes.

- Routed vertices carry cumulative terminal-to-root arc distance and a route
  mask. Unrelated branches retain their existing material and have no route
  attributes.
- One head advances monotonically inward, followed by a short fading wake and a
  dark pause. The route clock remains reset until every node on the selected
  route has manifested.
- Routed materials are graphite-identical clones. A low-energy blue emissive
  envelope briefly reveals only the region around the moving head, then returns
  it to graphite.
- The containment kernel is restricted to the camera-facing interior axis. This
  removed the first tuning's cyan-white clipping and circumferential glow, but
  also exposed the view-dependence recorded below.

No bloom, permanent route illumination, general pulse, additional packet,
aggregation, rune, lava, Cosmos integration, or geometry-continuity work was
added.

## Files changed for this block

- `src/category-tree/tree/engineered-tree-layer.js`
- `tests/category-tree/routed-light.test.mjs`
- `tests/category-tree/monumental-trunk.test.mjs`
- `docs/projects/category tree/tree/routed-light-investigation.md`

## Technical verification

`node --test 'tests/category-tree/monumental-trunk.test.mjs' 'tests/category-tree/routed-light.test.mjs'`

- 4 tests passed.
- The focused regression test proves the exact authored parent chain, positive
  curve lengths, cumulative distance continuity, and coincident curve endpoints
  at every selected branch junction.
- Runtime assertions prove that there is one advancing packet, only the four
  selected non-trunk meshes receive route attributes, unrelated graphite remains
  untouched, the monumental trunk contains routed and unrouted regions, and no
  geometry positions change during the light pass.
- The existing monumental-trunk continuity tests remain green.

`npm.cmd exec vite build -- src/category-tree/tree`

- Production build passed. The existing bundle-size advisory remains.

`git diff --check`

- Passed; only the pre-existing line-ending warning for `session-brief.md` was
  reported.

Browser verification was performed in the running Vite study with no console
errors. The complete pass, its junction crossings, trunk descent, and return to
darkness were inspected in Structure, Silhouette, and Canopy.

## Visual evidence

### Strengths

- Motion is unmistakably terminal-to-root rather than a general material pulse.
- Structure and Silhouette show the luminous region move across the selected
  branch junction and enter the monumental trunk without a temporal jump.
- The same event continues downward through the trunk; it is not replaced by a
  second trunk effect.
- The rest of the Tree remains predominantly graphite, and the routed surfaces
  return fully to graphite after the wake.
- The final restrained tuning preserves blue luminosity without the clipped
  white/cyan glare of the first browser pass.

### Defects

- The surface shader does not yet make the light convincingly volumetric. On the
  broad trunk the moving region can still read as a soft transverse patch rather
  than fluid inside a conduit.
- Containment currently depends on view-space facing. It is legible in Structure
  and Silhouette, but in Canopy it becomes faint and can disappear during the
  branch-to-trunk transition. Perceptual continuity therefore does not survive
  all three accepted views.
- The chosen route is partly occluded by the crown in the default frontal view,
  so its early terminal generations are clearer from Canopy than from
  Silhouette.

## Verdict

**REVISE**

The authored routing, timing, single-packet discipline, and branch-to-trunk
distance continuity are sound. The moving event demonstrates that routed light
can perceptually connect separate meshes, but the surface-only containment
kernel is too camera-dependent to qualify as internally generated information
flow.

## One recommended next block

Keep the selected route, cumulative distances, packet clock, and accepted Tree
unchanged. Replace only the view-facing containment illusion with one
route-local internal-core study: a narrow emissive core following the same
curves and trunk centreline, occluded by a restrained light-transmitting graphite
shell. Verify that the single packet remains visible and continuous from all
three existing cameras without illuminating the whole conduit.

---

## Block 2 — Route-local internal core

### Implementation

The surface-envelope experiment was removed. The accepted graphite Tree still
uses its original three shared `MeshPhysicalMaterial` instances, with the same
colours and response shader; no transparency, emissive term, alpha hashing or
per-route material clone was added.

One narrow `TubeGeometry` now follows the complete selected route from terminal
to planting root. It is built from the existing authored branch curves in
reverse order, carries monotone terminal-to-root distance, and uses the same
structural-motion field as the outer Tree. Its default radius is `0.032`, below
the minimum `0.045` terminal-conduit radius, and remains below that radius at
the maximum conduit-weight control value.

The core is additive and depth-tested with `GreaterDepth`. Consequently it is
drawn only where an already-rendered opaque surface lies in front of it: the
moving blue head and wake read through the enclosing graphite while open-space
fragments are discarded by depth. This keeps the graphite material exact and
removes Block 1's transverse surface band. There is one core mesh, one moving
head, one wake and one dark pause.

Two controls were added:

- **Packet speed:** `0.50–3.00`, default `1.55`. A speed change deliberately
  restarts the one-packet clock at the selected terminal so it cannot teleport.
- **Start tier:** bounded by the active Growth tiers. It deterministically
  chooses the first eligible authored `-state` terminal for that tier, then
  walks `parentId` to the root. With three active tiers the routes begin at
  `process-readiness-state`, `people-readiness-state`, and
  `earned-value-state` respectively. The control clamps when Growth tiers is
  reduced and is disabled when no growth tier is active.

Browser testing exposed one integration error: the growth animation previously
stopped when *average* viability reached `0.999`, even though the tier-three
terminal was only about 91% mature. The UI displayed 100%, but the packet
correctly refused to enter that unfinished route. Growth samples now expose an
explicit completion state and the animation remains active until every eligible
latent node is at least `0.999` mature.

### Files changed for Block 2

- `src/category-tree/tree/engineered-tree-layer.js`
- `src/category-tree/tree/growth-cycle.js`
- `src/category-tree/tree/index.html`
- `src/category-tree/tree/main.js`
- `tests/category-tree/routed-light.test.mjs`
- `tests/category-tree/monumental-trunk.test.mjs`
- `docs/projects/category tree/tree/routed-light-investigation.md`

### Technical verification

`node --test tests/category-tree/monumental-trunk.test.mjs tests/category-tree/routed-light.test.mjs`

- 7 tests passed.
- The focused tests prove deterministic authored routes for tiers 1–8, exact
  route endpoints, monotone core distance, a single core and packet clock,
  contained core radii, packet-speed restart/advance/dark-pause behaviour, and
  true completion of the late tier-three terminal.
- Changing Start tier retains the mature growth map. Snapshot comparisons prove
  that the monumental trunk and an unrelated branch keep identical outer
  positions and the same graphite material objects while only the inner route
  is rebuilt.
- Existing monumental-trunk continuity tests remain green.

`npx vite build src/category-tree/tree`

- Production build passed. The existing bundle-size advisory remains.

`git diff --check`

- Passed; only the pre-existing line-ending warning for `session-brief.md` was
  reported.

A clean browser reload and the subsequent control/camera passes produced no new
console errors. The console retained one earlier hot-module-replacement error
from replacing the shader live; it did not recur after reload.

### Browser and visual review

#### Strengths

- In Structure, the head is a narrow blue filament inside the branch/trunk
  silhouette rather than a transverse patch painted over the graphite.
- Tier-three playback demonstrated the same event moving from its higher crown
  route into the shared trunk and then descending to the planting root. The
  maturation fix removed the false inert state at displayed 100% growth.
- The route remains legible in Structure, Silhouette and Canopy. The close
  Structure view gives the clearest branch-to-trunk hand-off; Silhouette and
  Canopy show the same head at the crown junction and at successive trunk
  heights without creating a second trunk effect.
- During a free Canopy orbit, the packet remains attached to its authored
  branch route while descending through the crown; spinning the Tree does not
  dislodge or redirect that part of the journey.
- Tiers 1, 2 and 3 produce distinct authored origins and journey lengths while
  retaining terminal-to-root direction. Changing tier does not replay growth.
- Minimum (`0.50`), default (`1.55`) and maximum (`3.00`) speeds were exercised.
  The head remains directional at each value, and at maximum speed the complete
  trunk descent is visible over successive one-second observations.
- After the wake leaves the root, the blue core disappears for the pause and
  the Tree returns to the unchanged graphite render.

#### Defects and limits

- The first terminal generations are necessarily very fine at a full-tree
  framing. Their internal core can be subtle in Canopy and Silhouette before it
  reaches the larger crown support and trunk; Structure or a closer orbit is
  clearer.
- `GreaterDepth` is a screen-depth containment test, not a conduit-specific
  stencil. No false light was observed on the three preset camera passes, but a
  dense free orbit could theoretically let the core show through an unrelated
  foreground branch at an exact overlap. Conversely, a genuine uncovered pixel
  at a mesh seam has no shell depth and therefore suppresses the core there.
  This is a known limit of preserving the accepted opaque graphite material
  without redesigning it.
- Free-orbit review exposes a more specific trunk limitation. Once the packet
  enters the monumental trunk, the visible filament resolves onto the
  camera-facing trunk surface: spinning the Tree does not alter its apparent
  trajectory around or through the trunk volume. The route geometry is still
  terminal-to-root, but its perceptual trunk presentation therefore reads as a
  camera projection rather than genuinely volumetric internal flow. This is
  deferred to a later trunk-rendering phase and is not treated as a reason to
  reopen the bounded Block 2 implementation.

### Verdict

**CONTINUE**

The route-local core removes the surface-band character, preserves the accepted
graphite Tree exactly, survives all three existing camera views, and makes one
authored terminal-to-root event visibly directional. Its fine-crown legibility
and screen-depth overlap limitation should remain explicit constraints, but
neither prevented the observed branch-to-trunk journey.

### One recommended next block

Keep the accepted Tree, one core, route selector and clock unchanged. Test one
bounded lower-trunk glyph coupling: a single authored glyph sequence should
respond only as this packet passes, then return fully dark. Do not add the
gravity well, Cosmos layer, multiple packets or aggregation in that block.
