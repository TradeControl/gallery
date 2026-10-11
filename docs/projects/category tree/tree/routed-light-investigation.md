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

---

## Block 3 — Distributed canopy traffic

### Implementation

The accepted route-local core was extended into one shared internal traffic
network. At the default three growth tiers there are 213 eligible terminal
emitters and 388 unique authored child-to-parent edges. Every route is still
derived only by walking `parentId` from a real terminal to `planting-root`.

The internal geometry contains each eligible authored edge once. Its per-edge
traffic samples are updated from a set of independent packet records, so two
packets can retain separate terminals, clocks and complete authored routes while
using the same parent edge and trunk. Coincident light samples are visually
bounded by a maximum operation; this is only optical compositing and does not
combine packet identities or payloads.

Emission is deterministic and distributed:

- eligible terminal IDs are stably hash-ordered, with a manifested established
  terminal rotated into the first slot so the study can emit immediately;
- **Packet frequency** is a whole-canopy rate from `0.05` to `0.60` packets per
  second, default `0.20`;
- for `N` routes and frequency `f`, each terminal has period `N / f` and phase
  offset `rank / f`, producing one staggered canopy event every `1 / f` rather
  than a simultaneous terminal flash;
- a due event is emitted only when its terminal and complete authored route are
  manifested. An immature due slot is skipped rather than queued for a later
  maturation burst;
- active packets integrate their own head distances. Packet-speed changes alter
  their onward velocity without returning them to their terminals, and
  frequency changes rephase only future waits without deleting active events;
- each packet is removed after its head and wake have passed the planting root.

The former **Start tier** control was removed and replaced by **Packet
frequency**. Packet speed remains. The graphite materials, monumental trunk,
hierarchy, growth process and accepted `GreaterDepth` internal-core containment
were not redesigned.

### Files changed for Block 3

- `src/category-tree/tree/engineered-tree-layer.js`
- `src/category-tree/tree/index.html`
- `src/category-tree/tree/main.js`
- `tests/category-tree/routed-light.test.mjs`
- `docs/projects/category tree/tree/routed-light-investigation.md`

### Technical verification

`node --test tests/category-tree/monumental-trunk.test.mjs tests/category-tree/routed-light.test.mjs`

- 13 tests passed.
- Regressions prove deterministic eligible-terminal ordering, active-tier
  filtering, exact authored routes, and one geometry row for each unique shared
  edge.
- Runtime coverage proves that only manifested routes emit, phases are distinct,
  higher frequency produces richer independent traffic, low frequency includes
  a fully dark interval, shared parent routes do not collapse packet identity,
  and completed wakes disappear.
- Live speed and frequency changes preserve active packet identity. Snapshot
  comparisons prove that the accepted trunk and an unrelated branch retain the
  same graphite material objects and geometry while traffic changes.
- Sparse and fine-grained update cadences produce the same scheduled packet
  identities at a fixed time, and a newly manifested route cannot receive a
  backdated event from a slot that elapsed while that route was dormant.
- Static control coverage proves that Packet speed and Packet frequency each
  occur once and no Start tier control or `informationStartTier` remains.

`npx vite build src/category-tree/tree`

- Production build passed. The existing bundle-size advisory remains.

Browser verification used a clean Vite session and produced no console errors.
Default (`0.20`), minimum (`0.05`) and maximum (`0.60`) frequency were inspected
in Silhouette, Canopy and Structure. Successive observations were used to judge
motion rather than a single frozen frame.

### Browser and visual review

#### Strengths

- At minimum frequency, one narrow terminal-to-root journey is legible and the
  complete Tree subsequently returns to graphite before the next event.
- At maximum frequency, several small luminous regions occupy different canopy
  limbs and move between observations. They do not begin together or produce a
  whole-crown flash.
- Separate events naturally meet on shared authored supports and become denser
  in the trunk. The crown nevertheless remains predominantly graphite, and the
  high-frequency frame does not become uniform branch illumination.
- Structure gives the clearest view of multiple branch-to-trunk hand-offs;
  Canopy confirms spatially distributed origins; Silhouette preserves the
  monumental dark mass with restrained blue motion inside it.
- The one-network/one-texture implementation keeps a single core draw object
  instead of multiplying complete route meshes for every eligible terminal.

#### Defects and limits

- At maximum frequency, overlapping independent wakes can temporarily read as a
  longer blue spine through the lower trunk. This is a plausible convergence
  effect and it still clears, but it is close to the useful upper density bound.
- Very fine terminal generations remain subtle at full-tree scale. Their origin
  is clearest from Canopy or Structure rather than the default Silhouette view.
- The accepted `GreaterDepth` method still has its known screen-depth overlap
  limitation. In particular, the lower-trunk filament remains a camera-facing
  projection when the Tree is spun; Block 3 deliberately did not investigate or
  alter that deferred trunk-rendering defect.
- The traffic atlas visually takes the maximum where packet wakes occupy the
  same sample. Packet records remain independent, but an exact visual overlap
  cannot show both identities separately without a later semantic or rendering
  decision.

### Verdict

**CONTINUE**

Distributed route-local events make the mature Tree read as an active gathering
hierarchy while retaining graphite darkness, authored terminal-to-root motion,
and the accepted outer Tree. The frequency range is genuinely inspectable: its
minimum isolates journeys and returns fully dark, while its maximum establishes
canopy-wide traffic and trunk convergence without synchronised pulsing.

### One recommended next block

Test one bounded semantic-convergence rule at the existing `meaning` trunk node:
independent canopy packets should retain identity until they arrive there, then
produce one explicitly traceable trunk-bound packet carrying their provenance.
Do not add glyphs, lava, the gravity well, Cosmos integration, new geometry or a
fix for the known camera-facing trunk projection in that block.

---

## Packet-frequency range experiment — 11 packets per second

### Scope and implementation

The existing **Packet frequency** control now spans `0.05` to `11.00` packets
per second in `0.01` increments. Its authored default remains `0.20`; this is an
experimental ceiling, not a new presentation default.

Only the HTML control ceiling changed in the runtime implementation. The
emitter scheduler, packet records, terminal-to-root routes, speed control,
traffic atlas, Tree hierarchy, monumental trunk and all Tree geometry are
unchanged. No aggregation rule was introduced.

With the accepted 213 eligible emitters, `11.00` packets per second gives each
terminal a `213 / 11 = 19.3636` second period and preserves the rank phase
offsets at `1 / 11 = 0.0909` seconds. Increasing the control therefore shortens
the existing distributed schedule; it does not turn the emitters into a shared
simultaneous pulse.

### Files changed for this experiment

- `src/category-tree/tree/index.html`
- `tests/category-tree/routed-light.test.mjs`
- `docs/projects/category tree/tree/routed-light-investigation.md`

No production JavaScript or Tree geometry file changed.

### Determinism, identity and geometry verification

The focused regression coverage now exercises the full range and a live
default-to-maximum upshift:

- at 20 seconds, frequencies `0.05`, `0.20` and `11.00` produce exactly 2, 5
  and 221 scheduled emissions respectively, including the initial event;
- at 11 packets per second the first two seconds contain 23 distinct packet
  IDs and 23 distinct emission times, with every adjacent emission separated
  by `1 / 11` seconds;
- a repeated run produces the same packets, routes, clocks and schedule;
- fine-grained updates and one coarse update to the same time produce identical
  packet identities and active segments;
- a live upshift from the default `0.20` to `11.00` at a non-boundary time does
  not emit a change-time burst or delete any active packet. New events remain
  uniquely identified and retain `1 / 11` second phase spacing;
- high-density traffic places packets from different terminals on the same
  authored parent segment without merging their records;
- a due slot skipped while its route is dormant is still not backdated after
  maturation, including at the new maximum;
- changing frequency across the full range preserves the accepted graphite
  material objects, vertex positions, indices, core-geometry reference and
  child count. The runtime still reports one core mesh.

The control regression also fixes the intended contract explicitly: minimum
`0.05`, maximum `11.00`, step `0.01`, markup default `0.20` and runtime default
`0.2`.

### Traffic and rendering stress findings

The mature Tree was profiled across the range and at all three packet-speed
landmarks. At `11.00` packets per second:

- default speed (`1.55`) settles at about 140 simultaneous packet records. A
  20-second, 1,200-update run measured 1.77 ms mean, 3.03 ms at the 95th
  percentile and 7.90 ms maximum for the routed-light update on this machine;
- repeated longer profiles placed the default-speed update at roughly 1.8 to
  3.0 ms per frame. About 116–119 of 388 authored edges were occupied and about
  23.5% of the fixed traffic-atlas samples were lit;
- minimum speed (`0.50`) is the worst supported congestion case, with roughly
  430 simultaneous records, about 47% of atlas samples lit and approximately
  8.5 ms of routed-light CPU work per update before WebGL rendering;
- maximum speed (`3.00`) reduces the active set to roughly 75 records and the
  update cost to about 2.5 ms;
- the rendering allocation remains one core mesh and one fixed 64 by 388 RGBA8
  atlas (99,328 bytes). Frequency does not add draw objects or geometry.

These measurements show bounded behaviour rather than a capacity failure. The
`11.00` / `0.50` combination does, however, consume a substantial part of a
60 Hz frame budget and should be treated as an intentional stress setting.

Live browser review covered `0.05` and `11.00` frequency, and `0.50`, `1.55`
and `3.00` speed, in the mature Canopy view. The controls remained responsive,
successive worst-congestion frames 1.5 seconds apart showed the luminous heads
continuing to move, and the browser logged no warnings or errors. The controls
were returned to their `0.20` frequency and `1.55` speed defaults after review.

### Artistic finding

The enlarged range supplies the intended experimental contrast. At `11.00`,
separate moving regions remain legible across the outer canopy and do not flash
in synchrony. After many routes converge, especially at speed `0.50`, the
shared lower trunk becomes nearly continuously luminous. This is optical
saturation of the existing maximum-composited atlas samples, not packet loss or
semantic aggregation: the underlying packet IDs, clocks and authored routes
remain independent.

Consequently the new ceiling is useful for exploring the transition from
discrete packets to a visually continuous informational fluid, but it is not a
good setting for reading individual packets after convergence. Resolving that
perceptual ambiguity would require a later artistic or semantic decision; this
experiment deliberately does not alter the trunk architecture.

### Verdict

**ACCEPT AS AN EXPERIMENTAL CONTROL**

The full `0.05`–`11.00` range is deterministic, does not lose or synchronise
packet records, preserves authored routes and live speed control, and leaves
the accepted Tree geometry untouched. Retain `0.20` as the default. Treat the
maximum-frequency/minimum-speed corner as a stress and saturation regime rather
than a proposed presentation setting.
