# Tree — phased work plan

**Status:** active experimental plan; revised after Phase 2c visual review
**Scope:** the Tree as an independent construction problem, followed by deliberate integration with the signed-off Casting Pit

## Decision: develop the Tree separately first

The Tree should **not** be planted in the gravity well from the outset.

The first implementation should run in a neutral, dedicated Tree experiment. This follows the project concept directly: topology, silhouette and behaviour must become convincing before the separate compositional problem of emergence from the Casting Pit is introduced.

Starting inside the well would make diagnosis unnecessarily ambiguous. The existing molten field, circuitry, steep membrane, occlusion, warm luminosity and elevated camera would all compete with the new structure. A weak hierarchy might look exciting because of the environment, while a sound hierarchy might look unsuccessful because its scale, depth order or lighting had not yet been reconciled with the pit.

Separate development does not mean postponing integration awareness. From the first phase, the Tree should:

- use a canonical local root at `(0, 0, 0)`;
- expose one parent group or layer that a composition root can position at the well centre;
- own neither the final scene nor the renderer;
- accept time and visibility from its host;
- keep topology, layout, geometry and activity distinct enough to inspect independently;
- avoid importing or steering the Casting Pit's Universe or Cosmos systems.

The standalone study can place the root on a simple neutral datum at `y = 0`. During integration, the composition root—not the Tree—will place that same local root at the chosen well anchor. No throat geometry or fiery singularity should be revived to make the join.

## Evidence and lessons carried forward

The archived shader is useful evidence, not a specification. It contributes:

- mythic-industrial atmosphere;
- monumental scale;
- an engineered organism rather than a conventional diagram;
- mineral, molten and circuit-like material associations;
- restrained ceremonial motion.

Its failed mechanisms must not be repeated:

- repeated coordinate folding must not impersonate hierarchy;
- infinite or field-like tubes must not replace finite parent-child connections;
- world-space glow bands must not impersonate nodes;
- noise and sway must not be the principal evidence of life;
- warm and cool effects must not alternate without stable meaning;
- the Tree must not absorb terrain, flow and structure into one shader distortion.

The signed-off Casting Pit also establishes constraints for eventual composition:

- one host world, camera, renderer and frame loop;
- independent systems sharing space without calling or owning each other;
- stable depth relationships under orbiting views;
- the physical layer may legitimately occlude other systems;
- diagnostic visibility modes are more useful than hiding conflicts through rendering tricks;
- the rejected throat/fire treatment must not return.

## Proposed working structure

The first runnable study should live at `src/category-tree/tree/`. Its `main.js` should remain a composition root: create the neutral world, select a representative hierarchy, construct the Tree layer, bind the small control surface and start the frame loop.

If the study proves reusable mechanisms, a small Tree library can be introduced under `src/lib/category-tree/tree/`. Likely responsibilities are:

- **model:** validate and index explicit nodes and parent-child edges;
- **layout:** deterministically assign local positions to that known hierarchy;
- **structure:** render finite conduits and role-specific nodes;
- **activity:** move events along actual edges and resolve them at actual confluences;
- **layer:** own the Tree group and expose only the composition seams demonstrated by the study.

These are provisional boundaries, not permission to create a general graph framework. Modules should be split only when the corresponding mechanism exists.

## Representative hierarchy

Early work should use a small deterministic fixture rather than live Trade Control data. It should be large enough to reveal recursion but small enough to inspect visually.

The fixture should contain:

- one sustained common trunk between the planting root and the first principal division;
- several terminal elements;
- at least two levels of intermediate categories;
- a few larger confluences or totals;
- unequal sibling counts and unequal subtree depths;
- one deliberately asymmetric region;
- stable identifiers and explicit parent identifiers.

Disconnected structures, expressions, Profit/VAT roots and reclassification should be withheld until the core hierarchy reads clearly. The data model may leave room for node roles and polarity, but unused domain fields should not be invented merely for completeness.

## Phase 0 — contract and diagnostic skeleton

### Purpose

Establish the smallest standalone page and the contracts that prevent later integration from requiring a rewrite.

### Work

1. Create the neutral Tree experiment with the existing Three.js and Vite stack.
2. Define the explicit representative hierarchy and validate:
   - unique node identifiers;
   - one parent at most per ordinary node;
   - no cycles;
   - reachable roots and terminals;
   - consistent parent-child indexes.
3. Establish local coordinates with the planting point at the origin.
4. Represent the trunk as an explicit sequence of common confluences before the hierarchy separates into principal limbs.
5. Provide inspection camera presets appropriate to the Tree:
   - silhouette or monumental;
   - elevated topology;
   - close structural inspection.
6. Add diagnostic switches for nodes, finite edges, local axes and role colouring.

### Acceptance gate

- The hierarchy can be inspected as an explicit topology without decorative material.
- Every visible diagnostic edge corresponds to one model relationship.
- Every terminal-to-root route passes through the same sustained trunk before the first principal division.
- Repeating the same seed and parameters produces the same layout.
- The Tree can be translated or rotated as one group without changing its internal logic.

No artistic surface treatment or flow animation should be added before this gate passes.

## Phase 1 — recursive form and monumental silhouette

### Purpose

Turn the hierarchy into one extraordinary object whose branching is generated by topology.

### Work

1. Lay out parent-child generations from the root while allowing controlled asymmetry.
2. Create finite, tapered conduits with unambiguous endpoints.
3. Give terminals, intermediate categories and confluences distinct scale or construction motifs.
4. Resolve branch junctions so they read as load-bearing transformations rather than coincident tubes.
5. Develop the trunk as a major artistic volume rather than an oversized connector. Its construction should be capable of containing distinct longitudinal channels without yet simulating their traffic.
6. Develop a strong distant silhouette and useful negative spaces.
7. Keep the first control set perceptual and small:
   - hierarchy spread;
   - sibling spacing;
   - vertical rise or compression;
   - asymmetry;
   - conduit thickness and taper;
   - botanical-to-engineered balance, only if it has a concrete visual implementation.

The topology must remain fixed while layout controls change its manifestation. Controls must behave monotonically and consistently; increasing density or spread should not accidentally reduce the apparent quantity it names.

### Acceptance gate

- From a distance the Tree reads as a single monumental instrument rather than a diagram or bundle of pipes.
- At close range, finite connections, junctions and terminals remain discoverable.
- Unequal subtree depth and sibling count are visible without labels.
- No branch exists solely because a shader happened to repeat a pattern.
- The neutral scene is visually compelling enough to justify proceeding without assistance from the Casting Pit.

## Phase 1b — recursive emergence and viability

### Purpose

Prevent the Tree from becoming a finished still object. The signed-off 36-node form remains visible as an established starting scaffold. Additional topology should become visible through recursive crown growth: increasing structural complexity that settles only when the organism has developed a viable crown.

This is structural evolution, not information traffic. It must be proved before material work and before terminal packets are introduced.

### Model

The existing 36-node hierarchy is fully established at the beginning of each cycle. It provides a trunk, three principal limbs and an already recognisable crown, avoiding a prolonged bare or pollarded state.

A deterministic extended fixture supplies latent additional category and terminal subtrees attached to eligible totals or categories in the established crown. Existing terminal elements remain terminal; growth does not turn them into parents. Every additional visible branch is therefore still an explicit model relationship rather than decorative shader bifurcation.

Each additional relationship has a lifecycle:

1. **Dormant** — the relationship exists in the model but has no manifested length.
2. **Budding** — its parent has reached the formation threshold and the child route becomes eligible.
3. **Extending** — a visible tip advances along the finite parent-child curve while thickness follows behind it.
4. **Established** — the complete relationship can support child growth.
5. **Viable** — the subtree has enough established structure to participate in the crown's viability score.

Growth begins at several eligible sites distributed across the established crown and then proceeds parent-before-child within each new subtree. Sibling branches should not all unfold simultaneously or at one uniform rate. A deterministic seed should produce reproducible timing, pauses and unequal commitment without changing either the established scaffold or the latent extended hierarchy.

### Viability

Viability should be a visible structural condition rather than an arbitrary timer. The first experiment should combine a small number of inspectable measures:

- the established scaffold remains intact;
- every principal limb receives some new viable growth;
- a configurable proportion of latent terminal nodes has been reached;
- the crown occupies a minimum angular spread and depth;
- the established structure reaches a minimum recursive depth.

Reaching the threshold stops further scheduled expansion for that growth cycle; it does not freeze the Tree into a dead object. Established branches may retain restrained loading, tension or minute adjustment. Reset returns to the complete 36-node scaffold—not to a bare trunk—while reseed changes the timing and ordering of the same latent extension.

### Rendering constraints

- The first frame must already present the recognisable 36-node Tree.
- Growth must reveal additional actual model edges in parent-before-child order.
- A branch tip must advance continuously rather than switch a complete conduit on.
- Taper and junction continuity must evolve with branch length.
- The artistic structure should be reconstructed as one continuous branch field or an equivalently fused surface. Separate edge meshes may remain as diagnostics, but their intersections must not define the visible organism.
- Topology nodes and junction markers are hidden in the artistic state and available only through a diagnostic switch.
- The Tree must retain a volumetric crown throughout growth rather than filling a plane first and adding depth afterwards.
- Growth must remain distinct from the later downward movement of information packets and upward uptake of molten matter.

### Controls and diagnostics

- growth rate;
- branching cadence;
- viability threshold;
- pause/resume;
- reset growth;
- reseed timing;
- new-growth progress or viability score;
- optional topology-node and lifecycle-state diagnostics.

### Acceptance gate

- The recognisable 36-node Tree is present before additional growth begins.
- New subtrees visibly unfold across its crown into increasing recursive complexity.
- A viewer can distinguish growth from ambient sway or arbitrary animation.
- The same seed reproduces the same evolution.
- The viability threshold corresponds to a convincingly established crown.
- The final viable state preserves the signed-off Phase 1 topology and form.
- No visible beads, fixed node markers or junction ornaments remain in the artistic state.

## Phase 2 — material character and restrained life

### Purpose

Find the Tree's material language without obscuring the proven structure.

### Work

1. Explore a bounded combination of mineral, cast, glass, fibre and circuitry responses.
2. Use shared material families with role-specific variation rather than a different style for every node type.
3. Introduce surface irregularity at a scale subordinate to conduit shape and junctions.
4. Add only slow structural response that preserves legibility: tension, loading, minute adjustment or breathing-like redistribution.
5. Use lighting to reveal volume and hierarchy. Emission should identify energy or activity, not compensate for unreadable geometry.
6. Test both dark and diagnostic-neutral backgrounds.

### Acceptance gate

- The object feels engineered, ancient and responsive without becoming merely botanical, mechanical or digital.
- Material noise does not break the readability of endpoints and junctions.
- Motion can be frozen without causing the Tree to lose its structural meaning.
- There are no arbitrary glowing points or decorative pulses masquerading as topology.

## Phase 2d — corrective crown, light and trunk studies

### Why this phase was added

Phase 2c proved that a dark engineered body can be disclosed by changing cool and
occasional gold light, but visual review also exposed three more fundamental
limitations:

- the trunk is still a sapling-like enlarged conduit rather than a monumental
  load-bearing body;
- the 90-node crown remains sparse, static and antler-like, especially from the
  silhouette and elevated views;
- the chromatic field appears projected onto the outside of the conduits rather
  than generated and transported inside them.

These are experimental findings rather than a rejection of the topology contract.
The corrective work remains incremental and must preserve explicit finite
parent-child relationships.

### Experiment A — sustained recursive crown

1. Preserve the original 36-node scaffold and triadic Operations, Finance and
   Resources division.
2. Treat canopy formation as two coupled recursions rather than unlimited growth
   at the tips of one fixed crown:
   - lateral branch recursion continues while its cantilever, accumulated terminal
     load and support thickness remain structurally credible;
   - trunk recursion continues upward, thickens the common support and creates new
     authored branch tiers after older lateral structures approach their load limit.
3. Allow the original three principal limbs to form recognisable antler-like
   structures, then slow or stop their outward extension before they would appear
   to collapse under gravity.
4. Add a substantially denser authored hierarchy through successive trunk stages
   rather than decorative branches, particles or shader repetition.
5. Continue parent-before-child unfolding across both the trunk and its emitted
   branch tiers until the crown accumulates as a volumetric recursive canopy and
   approaches self-occlusion from above.
6. Use shorter later-generation reach, local three-dimensional sibling frames,
   unequal recursive clusters and gravity-aware loading to prevent long parallel
   antler fans.
7. Keep replay and topology diagnostics capable of proving that every manifested
   trunk segment and conduit belongs to the validated structural hierarchy.

#### Coupled growth model

The next implementation must make the distinction explicit rather than merely
altering layout parameters:

- **branch state:** accumulated descendant load, cantilever length, support radius
  and remaining extension capacity;
- **trunk state:** current height, radial support capacity, active crown level and
  the authored branch sites made available at that level;
- **growth event:** either extend an eligible lateral relationship or establish the
  next trunk stage and release its branch sites;
- **halt condition:** a lateral tip becomes structurally established but stops
  extending when its load budget is exhausted; the whole Tree does not stop while
  the trunk can still create another viable tier.

This structural recursion is distinct from the later semantic aggregation of
Phase 3. Gravity and support determine when geometry may manifest; they do not
invent category relationships or substitute arbitrary physical branches for the
explicit hierarchy.

#### Acceptance gate

- Growth feels sustained rather than like a brief reveal of a few extra twigs.
- Each principal limb develops several visible nested forks.
- The elevated view reads as a dense recursive volume without becoming an
  indiscriminate tangle.
- Node and connection counts remain exact and validation continues to pass.

#### Current checkpoint — 4 October 2026

The first bounded densification pass expands the fixture from 90 to 360 validated
nodes and from 89 to 359 explicit relationships. It retains the established
36-node opening structure, reaches 200 terminals and maximum depth 11, and unfolds
over roughly twenty seconds at the default review rate. Later generations use
shorter reach, stronger local sibling turns and unequal vertical pitch.

This passes the exact-topology and sustained-growth parts of the gate and produces
several nested forks per principal limb. It does not yet make the elevated crown
substantially self-occluding: broad radial gaps and the three primary structural
arms remain visible. Treat it as an incremental branch-only control, not completion
of Experiment A. The next iteration should replace the fixed-trunk/expanding-tip
assumption with coupled trunk and load-limited branch recursion. It should improve
interior occupation by creating successive supported branch tiers rather than
merely appending another uniform outer generation.

The first coupled-recursion prototype adds three explicit trunk stages and six
authored branch sites to that control, producing 453 validated nodes, 452
relationships and 248 terminals. Supporting trunk segments establish in sequence;
each stage then releases its own finite lateral subtrees. This materially improves
interior occupation and begins to conceal the original limbs from above. The load
limit is presently authored through finite subtree depth and scheduling rather than
calculated from geometry, so this remains a structural prototype. It nevertheless
demonstrates that trunk continuation and crown recursion belong to one growth
process and provides real staged geometry for the later monumental trunk study.

A first gravity constraint now accumulates horizontal cantilever strain along each
root-to-tip route and weights it by descendant terminal load. Approaching the
support budget shortens horizontal reach and redirects growth upward; exceeding a
reserve margin leaves the relationship and its descendants dormant without
deleting them from the explicit hierarchy. At the current defaults, 407 of 453
nodes manifest and 46 remain load-dormant. This removes the most implausible long
lever while retaining a broad crown. The aerial canopy is consequently less dense
than the eventual target, so subsequent tuning should redistribute viable branch
sites through new trunk stages rather than relaxing gravity enough to recreate the
unbounded antler.

Ring growth now connects trunk form to that support calculation. Each trunk
segment's mature radius derives from the terminal load carried above it, producing
a broad lower support and progressively smaller upper stages. Established trunk
segments thicken as the latent crown manifests; a new stage first gains length,
then its branch sites wait through a short radial-maturation interval before they
are released. Cantilever capacity is calculated from the radius of the nearest
supporting trunk stage. Circumference therefore supplies additional viable branch
sites instead of acting as a decorative scale change. This remains a simplified
load model, but it provides the first causal bridge between canopy viability and
the later monumental trunk rendering phase.

### Experiment B — internally generated disclosure

1. Replace edge-local surface projections with route-continuous coordinates and
   parent-to-child inherited phase.
2. Make emission appear to originate inside a conduit and illuminate its material
   boundary rather than slide across the outside like a projected spotlight.
3. Preserve broad limb and generation disclosure while allowing connected routes
   to become legible across junctions.
4. Keep this manifestation distinct from Phase 3 packets and aggregation events.

#### Acceptance gate

- Illumination appears contained by, and generated within, the engineered body.
- A connected recursive route can be followed across more than one relationship.
- Dark intervals retain material presence without relying on excessive bloom.

### Experiment C — monumental trunk

1. Replace the enlarged branch treatment with dedicated trunk geometry.
2. Establish broad mass, slow taper, asymmetrical load-bearing form and a credible
   rootward transition.
3. Reserve sufficient longitudinal surface and internal volume for later downward
   transport routes and restrained techno-rune language.
4. Avoid helices, regular bands, stripes and decorative repeated lanes.

#### Acceptance gate

- The trunk reads as the monumental support of the complete crown rather than a
  sapling or pipe.
- Future routes could be etched or contained without overwhelming its mass.
- The trunk remains dark and structurally convincing with all activity disabled.

## Phase 3 — truthful activity and aggregation

### Purpose

Make motion demonstrate what the structure does.

### Work

1. Generate small activity events at actual terminal nodes.
2. Route each event through the explicit edge sequence towards its parent confluences.
3. At a confluence, wait for or accumulate child contributions using a simple, inspectable rule.
4. Emit a transformed parent event that is visibly fewer, slower, larger, brighter or more persistent than its inputs.
5. Keep propagation distance-based so speed is stable across differently curved or long conduits.
6. Add inspection views or counters that can prove which node and edge own each event.
7. Test one stable distinction—most likely polarity—only after aggregation is readable in a single neutral activity family.

The initial behaviour should favour terminal-to-root aggregation because that most directly expresses many classified activities becoming fewer higher-order meanings. Information packets therefore move inward through the canopy and down the trunk into Cosmos. The opposed upward movement belongs to molten physical uptake from the buried root; it must not be confused with information traffic.

### Acceptance gate

- Activity travels only along real conduits and changes only at real nodes.
- A viewer can perceive many events resolving into fewer higher-order events without reading labels.
- Changing layout does not change topology or lose event ownership.
- Event speed remains spatially consistent.
- Pausing the animation leaves the underlying hierarchy understandable.

## Phase 4 — standalone consolidation

### Purpose

Decide whether the Tree is strong enough to introduce into the visually demanding Casting Pit.

### Work

1. Establish deliberate default parameters rather than requiring every control to be maximised.
2. Test representative shallow, broad, deep and asymmetric fixtures.
3. Confirm stable behaviour under camera orbit and all presets.
4. Measure geometry count, draw calls, frame cost and activity capacity in proportion to the intended composition.
5. Separate necessary controls from temporary diagnostics.
6. Record the visual findings, failures and signed-off defaults in an outcome document.

### Acceptance gate

- Default loading presents a convincing foreground, middle and upper structure.
- Controls remain meaningful throughout their ranges.
- The Tree is recognisable and structurally truthful from both monumental and elevated views.
- Performance leaves credible headroom for the existing Universe and Cosmos layers.
- The standalone Tree is explicitly signed off before composition begins.

## Phase 5 — planting study in the Casting Pit

### Purpose

Solve the composition problem without redesigning the signed-off Tree or Casting Pit prematurely.

### Work

1. Create a new combined experiment; preserve the standalone Tree and current `casting-pit/universe-cosmos` reference unchanged.
2. Mount the Tree layer into the existing shared world as a third independent system.
3. Place the Tree's local origin at the canonical centre of the Gaussian well. Treat its base as an emergence zone, not as a new throat object.
4. Begin with diagnostic visibility modes:
   - Casting Pit only;
   - Tree only in the shared camera and lighting context;
   - Universe + Tree;
   - Cosmos + Tree;
   - complete composition.
5. Establish scale, root depth, orientation and camera framing before altering materials.
6. Inspect depth testing and occlusion through a full orbit. Do not repair conflicts with `depthTest: false` or screen-facing overlays.
7. Decide which environment owns shared lighting and tone mapping. The Tree must not add an uncontrolled second lighting rig.
8. Judge whether Cosmos remains a surrounding substrate, enters the Tree, or becomes visually redundant near it. Do not assume all three systems need equal prominence.
9. Only after spatial composition succeeds, investigate the hinge between arriving molten flow and ordered Tree activity.
10. Treat the buried root and trunk as the eventual transducer between layers: physical channels may draw released molten material upward while separate phloem-like channels carry aggregated information packets down through the trunk into the ordered Cosmos. These opposed transport laws must remain distinguishable and must be driven by their source systems rather than by decorative trunk pulses.

### Acceptance gate

- The Tree is visibly rooted in the well rather than hovering, clipping or sitting on a decorative plug.
- No grey rock, cap, cartoon fire or replacement singularity is introduced.
- Orbiting preserves credible depth relationships.
- The Tree retains its signed-off silhouette and readable topology.
- Molten matter, routed information and Tree activity remain distinguishable by behaviour, not merely colour.
- The combined result reads as one causal world rather than three demos layered together.

## Phase 6 — Category Tree semantics, selectively introduced

### Purpose

Extend a successful Tree into the fuller Category Tree without turning it into a literal application diagram.

Candidate studies should be introduced one at a time:

1. stable polarity;
2. selected Profit or VAT interpretation roots;
3. recursively dormant subtrees;
4. a disconnected but viable structure;
5. detachment and reclassification;
6. transverse expression instruments.

Each study should have its own visual question, diagnostic state and acceptance decision. A feature should remain only if it strengthens both conceptual truth and the autonomous artwork.

Connection to real Trade Control data belongs after representative topology and behaviour have succeeded. The renderer should be able to consume an explicit hierarchy, but no data-loading architecture is required for the first Tree.

## Verification strategy

Each phase should combine technical checks with visual review.

### Technical

- production build of the standalone entry;
- browser console free of errors and unexpected warnings;
- deterministic fixture and layout checks;
- topology invariants and edge ownership checks;
- correct geometry updates across controls;
- activity restricted to valid routes;
- resize, camera and pause/reset behaviour;
- performance sampling at the signed-off default and an adversarial dense state.

### Visual

- fixed screenshots or camera presets for comparison;
- silhouette review with activity and emission disabled;
- topology review with plain diagnostic material;
- motion review with structure held constant;
- orbit review to expose depth and attachment errors;
- default-state review without first adjusting sliders.

A successful build is not an artistic pass. Conversely, an attractive frame is not a structural pass if its topology cannot be accounted for.

## Explicit non-goals for the first Tree

- live Trade Control database integration;
- the complete set of Category Tree business behaviours;
- labels or a conventional chart-of-accounts display;
- dynamic terrain erosion or renewed throat development;
- a universal graph visualisation framework;
- bloom, fog or post-processing used to manufacture coherence;
- rewriting the signed-off Universe or Cosmos layers;
- solving final presentation controls before the visual system is understood.

## Recommended first implementation boundary

The first coding session should implement **Phase 0 only**, followed by review. It should end with an explicit hierarchy rendered as plain nodes and finite connections in a neutral scene, a sustained common trunk, deterministic camera views and topology diagnostics.

This deliberately modest boundary is the best protection against repeating the archived shader's central failure. Once the relationships themselves are undeniable, the project can safely pursue the difficult and more interesting question: how those relationships become a monumental living object.
