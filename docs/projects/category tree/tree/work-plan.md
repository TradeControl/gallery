# Tree — phased work plan

**Status:** active experimental record; C1 retained as hidden architecture; C2's inventory disclosures and C3a's passive passage marks rejected artistically; C4a filigree remains reproducible technical evidence; C4b-O1's exterior optical fibre is technically valid but artistically rejected as a wrapped thread; C4c-I1's packet-selected internal arborescence is technically valid but artistically rejected as too longitudinal and visually subdued; C4d-D1, C4d-D2 and C4d-D3 are approved; D4's technically valid v1 point-locus presentation is retained as artistically insufficient evidence; human review accepts the bounded v2 route-local head-and-wake presentation as the strongest artistic result so far; the exact-seed junction-knot experiment and consolidated standalone Tree are approved, with the baseline recorded at commit `7c88dc3`; reusable Tree mechanisms now live in `src/lib/tree/` and are shared by the standalone study and composition; composition work has moved to `../composition/`; aggregation and later Category Tree semantics remain gated
**Scope:** the Tree as an independent construction problem and its retained experiment history; integration now has a separate composition plan

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

The runnable reference study remains at `src/category-tree/tree/`. Its `main.js` is now an endpoint root: it creates the neutral world, chooses the controls, defaults, lighting and cameras, and starts the frame loop.

On 2026-10-25 the proved reusable mechanisms were moved without intentional functional change into `src/lib/tree/`, with `index.js` as the public application surface. Both the standalone endpoint and `src/category-tree/composition/tree-instance.js` now consume that same library. Its responsibilities are:

- **model:** validate and index explicit nodes and parent-child edges;
- **layout:** deterministically assign local positions to that known hierarchy;
- **structure:** render finite conduits and role-specific nodes;
- **activity:** move events along actual edges and resolve them at actual confluences;
- **layer:** own the Tree group and expose only the composition seams demonstrated by the study;
- **presentation mechanisms:** own the rune, internal-router and multipass visibility implementations without owning a scene, page or Casting Pit policy.

The DOM, camera, lighting and page controls remain endpoint-owned. The planting envelope and physical-root adapter remain composition-owned because they depend on the live Casting Pit membrane. This is a dependency-boundary refactor, not a new artistic acceptance or permission to create a general graph framework. See `src/lib/tree/README.md` for the current module boundary.

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

#### Phase 2e checkpoint — route-continuous internal light

The first replacement for the projected chromatic treatment is now implemented.
Every swept conduit carries a longitudinal progress attribute, while each edge
inherits its parent's accumulated root distance. The shader therefore evaluates
one continuous route coordinate through parent-child junctions instead of using
world-space bands or an unrelated phase for every edge.

Emission is concentrated at the apparent inner boundary of the conduit, with a
low residual core glow to preserve long routes at whole-tree scale. Broad,
slow-moving route envelopes disclose connected spans in deep cyan and restrained
gold. The trunk remains suppressed so this study cannot pre-empt the dedicated
monumental-trunk treatment.

Visual review in silhouette, canopy and structure views confirms that the former
disco-light effect has been removed: there are no isolated projected spots, and
the canopy view makes several inherited routes legible across multiple junctions.
The default intensity was lifted slightly after the first pass proved too dark at
silhouette scale, without allowing the surface to bleach cyan. Separate swept
tubes still reveal small junction seams in the close structure view; that is a
geometry-continuity issue for a later construction pass rather than a reason to
reintroduce surface projection.

The initial route envelope still caused too much of the crown to pulse in and out
together. An attempted correction partitioned illumination by recursive node
depth, but that was the wrong growth model: it produced alternating coloured
segments inside the same antler. Growth tiers are trunk-release cohorts, not
recursion depths.

The corrected model uses one illumination identity: the trunk-release cohort.
The initial Operations, Finance and Resources antlers form cohort zero. Every
branch site released by the first new trunk stage forms cohort one, and so on.
Pulse and colour belong to that complete growth tier, not to individual antlers
or recursive node depth. The newest visible cohort retains a higher visibility
floor but continues to breathe; older cohorts retain independent
cyan-to-ice-to-gold sequences over a non-zero visibility floor. Route distance
shapes highlights inside a tier but never decides its lifecycle or colour.

Perceptual review correction: the first tiered pass retained a non-zero signal
but its practical luminosity was still negligible against the dark background.
That pass did not satisfy the intent of the acceptance gate. The contained colour
range, internal-boundary contribution and persistent radiance floor have since
been raised. Repeated silhouette samples now keep the complete crown clearly
legible at the weakest observed phase without restoring a crown-wide flash.

A subsequent user canopy capture showed that the luminosity correction was still
being read mainly as faint specular reflection. Canopy view is therefore the
governing test for this experiment. The growth-tier palette uses HDR cyan, ice and
gold states which cross the existing bloom threshold; no state in the colour
sequence is near-black.

A second canopy capture exposed an implementation fault: per-edge cohort values
had been supplied as uniforms on shared materials, allowing one mesh's state to
leak across other draws. All edge-specific route, cohort, limb and depth data now
live in geometry attributes. Visual review during growth and at maturity shows
continuous colour across each complete release cohort, a fully disclosed newest
cohort and independently changing older tiers. The alternating depth stripes in
the failed capture are no longer possible under the shader's data model.

Six live controls now expose the experimental assumptions. Growth tiers selects
zero to eight trunk-release cohorts; zero retains only the initial crown and each
additional value activates another trunk stage. Older-tier visibility sets the
pulse floor, tier pulse speed controls brightness timing, tier phase separation
controls the offset between cohorts, newest-tier visibility controls how firmly
the current cohort is held open, and growth-tier colour lock makes every cohort
share one colour sequence without synchronising its pulse. Existing emergence
intensity, emergence speed and gold presence controls remain available for the
overall material response.

Motion correction: solving the near-black phases initially over-stabilised the
render. Colour was carrying most of the animation while luminosity remained
almost constant, leaving the mature tree readable but visually static. Colour
now evolves as a slow state sequence and tier-specific luminosity is the primary
motion. Each cohort breathes from its safe floor to a bright bloom; the newest
cohort uses a raised floor rather than being frozen at maximum brightness. The
default tier pulse speed has been raised to 0.90.

A 30-second user observation exposed a second motion failure: the nominal light
cycle was still perceptually static and the previous physical response displaced
the surface by only about 0.09% at its default setting. The tier pulse now runs
on a shorter cadence and drives a travelling route bloom rather than sitting
behind a large steady emissive term. Mature physical motion now comes from a
continuous height-weighted deformation field. It leaves the trunk foot planted
and moves coincident junction positions together, avoiding cracks between swept
tubes. Paired canopy observations at 33 and 35.5 seconds, after recursive
complexity reached 100%, show both processes continuing beyond maturation while
the whole structure remains continuously legible.

The five tiers beyond the original three use validated structural placeholder
topology with three evenly distributed branch sites per stage. They are explicitly
for testing density, radial uniformity and cadence, not final domain categories.
Changing the tier count rebuilds the load model and restarts unfolding. At the
default three tiers, 407 nodes manifest. At eight tiers, 653 manifest and the same
camera view no longer contains the full crown; the user must zoom out. A timed
review found the eight-tier tree only 76% unfolded after 25 seconds, confirming
that tier count also controls the duration of the growth event.

### Experiment C — monumental trunk

#### Accepted exterior baseline

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

This exterior gate has been accepted. The existing authored trunk chain, loft,
graphite material, taper, growth behaviour, branch attachments and signed-off
silhouette are the baseline for the next experiments, not provisional work to be
redesigned along with the interior. The initial Experiment C review found that
the existing routed core did not constitute an organised or physically contained
interior. C1 has since established a coherent hidden carrier architecture; the
existing traffic has not yet been mapped onto it, and its `GreaterDepth`
treatment remains a camera-space disclosure rather than physical containment.

#### Whole-Tree transduction and the passage/transformation boundary

The Tree as a whole is the transducer. The trunk is not a machine whose internal
parts must be displayed. In the complete conception, information descends through
the recursive canopy while genuine aggregation creates higher-order meaning. The
monumental graphite trunk carries that ordered passage towards Cosmos. One
exceptional transducer may nevertheless be visible as an artwork within the
artwork, provided it does not inventory the hidden C1 mechanism or explain away
the larger Tree.

Future mycelium-like roots will enter the Casting Pit gravity well. Information
will continue downward into Cosmic circuitry while molten physical material moves
upward from the Universe to sustain the Tree. Those opposed processes are
causally distinct but compositionally connected. Roots, the Casting Pit and
Cosmos transport remain outside the present experiment.

The experimental sequence distinguishes three claims:

- **Information passage (C3a)** preserves the existing packet, route and schedule.
  A brief rune may be caused by that passage, but it does not consume the packet,
  create a new identity or prove aggregation. C3a was technically useful and is
  retained as evidence, but its passive marks were rejected artistically.
- **Concealed internal transport (possible later C3b)** may map packets onto C1's
  hidden organisation. C1 remains valid whether or not that mapping is needed.
- **One-to-one transduction (C4a)** requires auditable arrival, consumption, one
  new identity and immutable single-source provenance. Its singular visible
  filigree droplet can make that boundary perceptible, but colour and motion
  remain evidence only because the event ledger establishes the claim.
- **Many-to-one transduction (C5)** remains a later, separate proposition. It
  alone may test whether multiple independent inputs create higher-order unity.

No chamber, glow, colour change, aperture or other generic effect is prescribed
as the necessary representation of transduction. C2 historically used bounded
disclosure candidates to test the premise and rejected them artistically because
they exposed an enumerable internal inventory. Its result was not a prohibition
on visibility. C1's anatomy remains confined to opt-in engineering diagnostics,
while C4a may test one visible, causally active artwork within the artwork. The
form, its relationship with graphite and its response to traffic must be explored
together rather than adding a decorative object after the event model is fixed.

Each block below is an independent acceptance gate. Implementation must stop after
every block for technical and artistic human review; approval of one block does
not authorise the next.

#### C1 — authored internal skeleton, diagnostic only

**Status:** implemented, technically verified and approved by human review on
2026-10-11. The isolated carriers were accepted as spatially distinct and as
following a coherent branching structure. This sign-off authorised the now-
complete C2 comparison; it did not establish an artistic need to display the
carriers. C3a has since been technically completed and artistically rejected;
only the bounded visible C4a filigree-droplet experiment is now authorised. C3b,
further C4 work and C5 remain unauthorised.

**Purpose:** establish structural truth inside the accepted trunk without choosing
the final visibility or transport language.

Implement only:

1. Derive a deterministic trunk-interior descriptor from active trunk nodes and
   their real lateral child attachments.
2. Build cumulative attachment-family carrier sets for each rootward trunk span.
3. Derive stable cross-sectional placement from entry direction and descendant
   load, with an explicit wall-clearance margin.
4. Render one merged, neutral, non-emissive diagnostic skeleton inside the mature
   loft, inspectable with the exterior deliberately removed.
5. Keep the skeleton coupled to the existing growth/deformation state so that a
   carrier appears only when its supporting trunk span exists.

Do not change the outer loft, branch geometry, graphite materials, packet
scheduler, packet routes, traffic atlas, growth cycle or `GreaterDepth` core. Do
not add an aperture, transparency, transduction rule or packet remapping in C1.

##### C1 acceptance gate

- Tier-three carrier counts are exactly `2`, `4`, `6` and `9` in successive
  rootward span groups; tier-zero and tier-eight counts are covered by
  deterministic tests.
- Every carrier has one traceable authored attachment owner. No line exists merely
  to fill space.
- Carriers remain inside the loft, respect wall clearance, do not cross
  unintentionally and do not form decorative helices or regular rings.
- Rebuilding the same hierarchy and controls produces byte-equivalent placement
  data.
- The diagnostic skeleton is one merged draw object, with vertex count, triangle
  count and construction time recorded.
- During replay and tier changes, carriers do not appear before their supporting
  trunk spans and do not swim, crack or pop away from the shared deformation.
- Exterior trunk positions, radii, indices and material references remain
  unchanged. Crown geometry, silhouette, topology and recursive growth remain
  unchanged.
- Packet identity, schedule, route, speed and high-frequency behaviour remain
  unchanged because C1 does not participate in transport.
- A neutral close inspection makes the carrier hierarchy legible without claiming
  that opaque-shell visibility has been solved.

**Human review sign-off (2026-10-11):** C1 is accepted. Its technical evidence
and isolated diagnostic view demonstrate spatially distinct carriers with a
coherent branching structure. This sign-off authorised C2 only. C1 now remains
available as hidden causal architecture and an opt-in engineering diagnostic; its
acceptance does not require it to become audience-facing imagery.

#### C2 — visibility comparison on fixed content

**Status:** implemented and technically verified, then artistically rejected by
human review on 2026-10-11. All three disclosure candidates were rejected; no
visibility direction was selected. C3a is a separate surface-language experiment;
C3b remains paused, C3a has since been artistically rejected, and only the
bounded visible C4a filigree-droplet candidate is now authorised. Further C4 work
and C5 remain unauthorised.

**Purpose:** determine how the unchanged C1 structure might be perceived through
the accepted opaque trunk while preserving its monumental mass.

Use exactly the same C1 skeleton to compare the bounded visibility candidates from
the approved review: one short physical aperture with a recessed liner,
trunk-only front/back attenuation, and a trunk stencil diagnostic. These are test
conditions, not a commitment to any one visual language. Compare them under orbit,
close inspection and the signed-off distant presets; record geometry, pass and
frame costs as well as visual evidence.

##### C2 acceptance gate

- Every candidate reveals the same fixed authored skeleton; content changes cannot
  be mistaken for a visibility improvement.
- Orbit demonstrates honest depth behaviour, including parallax and occlusion
  where the candidate claims physical depth, rather than a camera-facing
  projection.
- Unrelated foreground branches cannot falsely disclose trunk contents.
- The accepted distant silhouette and perception of trunk mass remain intact.
- Limitations, rendering cost and growth/replay behaviour are recorded, and human
  review either selects a bounded direction or rejects all candidates.
- No packet remapping or transduction behaviour is introduced.

##### C2 implementation checkpoint (2026-10-11)

The three candidates use one fixed `exchange → meaning` region of the unchanged
C1 skeleton so that only the disclosure method varies:

- **Physical aperture:** removes exactly six cells (twelve triangles) from a
  cloned accepted shell and adds a small open recessed liner. It uses the normal
  scene pass and ordinary depth behaviour.
- **Trunk attenuation:** keeps the accepted exterior closed and uses a local
  closed proxy, packed front/back body-depth targets and an exact trunk-patch
  ownership stencil to attenuate only carrier fragments belonging to that trunk
  region. It is a five-pass comparison condition, not a claim of measured wall
  thickness.
- **Stencil diagnostic:** uses the same exact ownership patch and carrier overlay
  without depth-range attenuation. It is a three-pass screen-space reference,
  not a physical solution.

The default remains the accepted exterior. The isolated C1 diagnostic and all
three C2 modes reuse the same carrier geometry and authored identities; no
candidate changes the outer-trunk source geometry, branch geometry, scheduler,
routes, speed, frequency or traffic state. No chamber, glow, aggregation,
remapping or transduction behaviour was introduced.

The complete focused Tree regression run passed 26 of 26 tests, including
byte-stable carrier geometry across modes, the exact aperture cut, trunk-only
stencil participation, replay/growth gating and identical deterministic routed
traffic at `11/0.50`. The standalone Vite production build passed, and browser
inspection at maturity under orbit and the distant presets completed without
console warnings or errors. Detailed geometry, render-cost and visual evidence
is recorded in `trunk-development-review.md`.

##### C2 artistic review decision (2026-10-11)

C2 passed its technical gate and failed its artistic gate. The aperture,
attenuation and stencil approaches all made a finite set of internal components
available for inspection. That inventory disclosure reduced the Tree's implied
recursive totality to an enumerable mechanism and weakened both monumentality
and mystery. The aperture demonstrated the problem most clearly, but improving
its shape or the other rendering methods would not correct that premise.

The accepted baseline is therefore the intact graphite exterior and a hidden C1
carrier architecture. Opacity, omission and unseen depth remain positive artistic
constraints, not missing technical work. C1 is retained as hidden structural
truth and as a deliberately separate diagnostic; the C2 modes are experimental
evidence only and remain default-off pending a later cleanup decision. This
decision rejects an exposed inventory, not visibility itself. It permits a
singular visible transducer if that form remains an artwork within the artwork,
does not disclose C1 and strengthens rather than miniaturises the monumental Tree.

#### Experiment C redirection — approved artistic direction

Subsequent work must separate two kinds of evidence:

1. **Truth-layer evidence:** deterministic identities, hidden carrier state,
   arrival ledgers and provenance prove that transport and transformation really
   occurred.
2. **Artwork-layer evidence:** inputs, elapsed time and consequences make the
   transformation perceptible without displaying the C1 carrier inventory. The
   local transducer itself may be visible when its singular form is the artwork,
   rather than an inspection window onto machinery.

Neither layer can substitute for the other. Audit data alone does not make an
artwork, while a pulse, colour change or broad reaction does not prove causality.
The finite visible Tree should suggest a greater recursive order through partial
evidence and consequential behaviour, not through an inventory of components.
A single intricate object may concentrate that mystery without claiming to reveal
the Tree's complete mechanism.

The first bounded question asked whether a real packet crossing could briefly
write a restrained object-space techno-rune on the opaque trunk, then leave no
permanent mark. C3a answered that question technically but failed artistically:
the marks registered passage without behaving as functional transformations.
The first bounded candidate established that one visible three-dimensional
filigree route at the `meaning` passage could receive one cyan input, make its
transformation legible within the gold form and create one new Cosmos-gold output
with auditable single-source provenance. Human review found that its compact,
predominantly exterior placement read as a brooch attached to the trunk. That
candidate is retained as C4a-E1 evidence. C4a-E2 now isolates the prior question:
can a camera-independent axial volume feel integral to the graphite before any
additional intricacy or many-to-one behaviour is attempted?

#### C3 — information-passage language without anatomical disclosure

##### C3a — packet-driven trunk-rune study

**Status:** implemented and technically verified on 2026-10-11, then rejected at
human artistic review. Retain the implementation and evidence as a diagnostic
baseline; do not refine the three passive marks as the artwork language.

**Purpose:** test whether actual packet passage can cause brief, restrained
techno-rune manifestations at meaningful authored positions on the existing
opaque graphite trunk.

Implement only one bounded technique:

1. Derive a small number of object-space rune sites from real lower-trunk spans,
   not evenly spaced bands or random surface scatter.
2. Cause a rune only when an existing packet genuinely crosses its site's exact
   route distance. The packet remains independently owned and unmodified.
3. Write the mark in the rootward direction, hold it briefly and remove it fully.
   Dense traffic may be deterministically sampled at the visual layer to preserve
   restraint, provided every displayed rune retains one auditable packet cause
   and sampling cannot alter transport.
4. Keep the geometry conformal to the accepted shell and under the same
   deformation field. It must be depth-tested, fixed in object space and
   naturally self-occluded under orbit.
5. Use a narrow, local material response without broad illumination, bloom or a
   residual idle engraving.

Do not expose C1, remap traffic onto its carriers, consume or merge packets,
create an output event, introduce aggregation state, add mycelial roots or begin
Casting Pit/Cosmos integration. Do not change the canopy, packet scheduler,
authored routes, speed/frequency controls, growth or accepted exterior geometry.

###### C3a acceptance gate

- Every displayed rune identifies one genuine packet and one real authored trunk
  crossing; no clock-only or idle mark can appear.
- The lifecycle is deterministic, brief and finite. A rune writes rootward,
  erodes completely and never becomes a permanent decorative marking.
- Sites are sparse, spatially distinct and tied to meaningful trunk spans. They
  do not form rings, repeated bands, a glyph field or a circuit-board display.
- Orbit demonstrates attachment and honest self-occlusion rather than a
  camera-facing projection. Silhouette, Structure and Canopy views preserve the
  accepted graphite mass and crown.
- Packet identity, count, schedule, routes, speed and the `11/0.50` stress state
  remain unchanged with runes enabled or disabled. Visual sampling is recorded
  separately and cannot be mistaken for packet loss or aggregation.
- Exterior geometry/material references, branch geometry, growth and the C1
  descriptor/diagnostic remain unchanged.
- Geometry, draw count, per-frame work and high-frequency behaviour are recorded.
- Human review judges whether the marks are restrained and whether they suggest
  passage or translation without reading as exposed machinery, decoration or
  already-completed aggregation.

**Human review stop:** record the technical and three-view visual evidence, then
stop. Do not begin C3b, C4, C5, roots or environment integration. This stop was
observed; the later C3a review separately authorised C4a.

###### C3a implementation checkpoint (2026-10-11)

One causal surface-language candidate is now available behind the default-on
`Packet-driven trunk runes` control. Three sparse sites belong to the real
`meaning → exchange`, `exchange → uptake` and `uptake → planting-root` route
crossings. Each site is a short, broken, rootward mark sampled directly from the
accepted loft. All three are merged into one object-space mesh with `126`
vertices, `108` triangles and at most one active draw. The mesh shares the
graphite trunk's relief and sway deformation, uses ordinary depth testing and
normal alpha blending, and has no bloom, idle engraving or broad illumination.

Crossing detection is derived from the existing packet's authored route distance.
Every manifestation records its packet and site identity and lasts `0.84`
seconds while writing and eroding rootward. At rates through `1` packet per
second every packet is admitted visually. Above that rate, a stable hash of the
packet event identity admits a `1 / frequency` subset; an admitted packet remains
the same packet as it passes all three sites. This sampling neither delays nor
removes transport packets. Cumulative crossing and admission counts remain exact,
while the recent audit ledger is bounded to `4,096` records for long-running
maximum-rate use.

The focused rune suite passed `5/5` tests and the complete Tree regression suite
passed `31/31`. The tests independently reconstruct route crossings, verify the
finite lifecycle and growth gating, prove enabled/disabled transport equivalence
at `11/0.50`, preserve graphite, branch, routed-core and C1 geometry/material
references, and exercise audit-ledger overflow. The scoped Vite production build
also passed.

Browser inspection reached full maturity in Silhouette, Structure and Canopy
views, including orbit and the `11` packets-per-second stress state. The marks
stayed attached to the shell, self-occluded on the far side and left the accepted
contour and crown unchanged. The renderer remained one pass with a local settled
CPU-submission EMA of roughly `3–6 ms`, and the console reported no warnings or
errors. This is not a GPU benchmark.

The principal artistic uncertainty during implementation was visibility rather
than causality. In the close Structure view the small marks can be read and
followed under orbit. In the
distant Silhouette and Canopy views, especially at the default `0.20` rate, they
are easy to miss; their muted cyan also sits close to the established routed-core
colour. At `11`, rune sampling stays restrained, although the independently
existing route illumination can itself approach continuity. Human review must
decide whether this reserve suggests translation or merely makes the new event
too inconspicuous or too easily confused with packet light.

###### C3a artistic review decision (2026-10-11)

C3a is a technically useful and artistically rejected result. The event-to-mark
causality, object-space attachment, finite lifecycle and audit trail remain valid,
but a packet merely caused a passive broken mark and then continued unchanged.
The mark therefore read as a restrained notification, not as a functional rune.
The next experiment must test a rune whose connected labyrinth is the actual
one-to-one transformation interval rather than a symbol displayed beside it.

##### C3b — possible concealed carrier transport

**Status:** deferred and unauthorised. C3a does not require or imply it.

If later evidence shows that exact concealed carrier timing is artistically or
semantically necessary, a separate block may map the trunk portion of each route
onto C1 without exposing it. That hypothesis requires a new brief and approval;
it is not part of the rune experiment.

#### C4 — visible, auditable one-to-one transduction

##### C4a — visible transducer studies at the meaning passage

**Status:** closed without artistic sign-off. C4a-E1 is technically verified and
retained as immutable exterior-filigree evidence, but human review rejected it as
the active artistic solution because it read as a brooch attached to the trunk.
The last green C4a-E2 implementation is retained as longitudinal-placement
evidence, not as a finished or accepted transducer. No filigree refinement,
optical-fibre alternative, second transducer, C4 generalisation or C5 work is
authorised.

**Purpose:** establish one real one-to-one transformation boundary while exploring
its form, its relationship with the graphite trunk and its causal response to
information as one inseparable artistic problem.

The Tree as a whole remains the transducer. C4a does not redefine the trunk as a
machine or claim that one visible object explains the Tree's complete operation.
It tests whether a single exceptional transducer can become an artwork within the
artwork: intricate, three-dimensional and gold, while the greater causal order
and the C1 carrier inventory remain unseen.

The point of departure is the artist's memory of intricate African gold filigree
droplet earrings worn in the 1980s. This is a personal material and formal memory,
not a request to claim a generic “African style” or copy an unidentified cultural
motif. The new form must be authored for this Tree. Its gold volume should reward
orbit and close inspection, while its relationship with the graphite—whether
held, framed, partially enclosed or otherwise structurally received—must make it
feel integral rather than painted on, bolted on or revealed by a mechanical
cutaway.

The bounded causal sequence remains exact:

1. one existing cyan packet reaches the droplet's authored inlet from the centre
   conduit at the `meaning` passage;
2. its luminous front travels through the droplet's actual three-dimensional
   filigree route, so the visible form and the transport interval are the same
   object rather than adjacent effects;
3. the incoming source is consumed exactly once at an authored transformation
   boundary within that route; and
4. one distinct rootward output is created there in the Cosmos-gold vocabulary
   and leaves towards the centre conduit with immutable provenance naming that
   single source.

This remains one-to-one translation with `aggregation: false`. It neither
combines independent packets nor proves higher-order meaning. Gold borrows only
the accepted Cosmos layer's colour vocabulary. C4a does not import Cosmic
topology, signal state or routes, and it is not Tree/Cosmos integration.

The hidden arrival/consumption/output ledger is authoritative. The droplet may
remain materially present when idle, but event luminosity or traversal cannot
occur without a real source. The cyan-to-gold change, connected traversal and
elapsed interval make the transformation perceptible; appearance alone cannot
establish the semantic claim. C1 remains hidden and diagnostic. The accepted
trunk, canopy, growth, scheduler and authored route ownership remain the baseline.

###### Superseded C4a prototypes

Two prototype directions remain valuable negative or technical evidence:

- The surface maze and its hidden radial joins failed artistically because the
  viewer saw a path on the graphite while the true transport remained central.
  Coordinate continuity did not repair that perceptual discontinuity.
- The subsequent wholly internal three-dimensional labyrinth established a
  technically coherent centre-to-centre route and explored depth-aware
  subsurface disclosure. It is retained as a technical prototype, not the
  current artistic candidate. Burial and optical transmission alone do not
  answer what the visible transducer should be.

Neither prototype authorises a return to a painted glyph, an X-ray inventory or
a permanent aperture. Their reusable event accounting and route-continuity work
may support the visible droplet, but their geometry and renderer are not accepted
as the C4a outcome.

###### C4a-E1 acceptance gate

- One singular object-space droplet has a legible, genuinely three-dimensional
  filigree form under orbit. It is not a camera-facing graphic, repeating band,
  arbitrary glyph field, flat circuit-board mark or miniature C1 inventory.
- The droplet and graphite form one convincing composition. Their contact,
  enclosure and negative space make the transducer feel integral to the Tree
  without turning the trunk into a window, exposing carriers or weakening the
  accepted monumental silhouette and crown.
- The transducer has one coordinate- and perceptually continuous authored path
  from the centre conduit, through the visible filigree and towards the centre
  conduit. Every illuminated segment belongs to that traversable path; a cyan
  source must not disappear centrally while an unrelated gold ornament lights.
- A traversal begins only when an eligible real packet reaches the exact inlet.
  The material form may remain visible at rest, but idle time produces no false
  packet, processing pulse or output event.
- Every admitted source has one arrival record, is consumed exactly once and
  creates exactly one distinct output. No source continues rootward under its old
  identity, is duplicated or is silently lost.
- Every output has an immutable new identity, `sourcePacketCount: 1`, the source
  packet and incoming-edge identity, transducer identity and exact entry,
  consumption/output and route-resume times. Runtime semantics report
  `semanticClaim: transduction` and `aggregation: false`.
- Replaying the same hierarchy, seed and controls produces equivalent event
  records. Independent packet timing survives the default rate and the `11/0.50`
  stress corner without artificial synchronisation, aggregation or traffic loss.
- The gold output continues rootward on existing authored transport without
  importing or steering the Casting Pit Cosmos system. Gold is a legible state
  vocabulary, not proof of aggregation, Cosmos arrival or higher-order meaning.
- Growth, reset and control changes cannot backdate arrivals, strand ownership or
  create orphaned luminosity. Queues and audit history remain finite and
  inspectable.
- Silhouette, Structure and Canopy review under orbit records form, trunk
  relationship, causal readability, occlusion and render cost. The accepted Tree
  geometry, growth and C1 descriptor remain unchanged.
- Only this `meaning` transducer is manifested. The two lower C3a passage sites
  are not promoted into serial transducers.

###### C4a-E1 implementation and verification record

The first bounded candidate uses one fixed object-space route at `meaning`. Its
buried centreline inlet and outlet join an exterior nested-loop filigree body that
weaves through the graphite rather than sitting on it as a painted mark. The
graphite naturally hides buried portions; the exterior loops show true
self-occlusion and collapse edge-on under orbit. C1 remains hidden.

The complete path length is `9.8414`, with its authored transformation at phase
`0.70558`. Mature centre sampling classifies `62` points as buried, `37` as
shell-crossing and `142` as exterior. An independent clearance audit reports a
positive minimum separation of `+0.03032` from the C1 carriers. The candidate
contains `2,334` vertices and `4,092` triangles across two meshes and two draws.
It uses the normal one-pass scene renderer; no projection or extra disclosure
pass is involved. Local CPU-submission observations were approximately
`1.2–3.3 ms`, not GPU timing or a performance budget.

The event boundary remains exact. A real cyan source enters the same route shown
by the droplet, is consumed once at the authored phase and creates one new
Cosmos-gold identity with immutable single-source provenance. Runtime semantics
remain `aggregation: false`. The material gold form persists when idle, but all
idle emissive attributes are zero. During traffic, activity is localised cyan
before the boundary and gold after it.

- `node --test tests/category-tree/trunk-runes.test.mjs` passes **8/8** focused
  tests.
- `node --test tests/category-tree/*.test.mjs` passes **34/34** complete Tree
  tests.
- The scoped Vite production build passes and `git diff --check` is clean. Only
  the existing Node module-type notices and Vite large-chunk advisory remain.
- Browser inspection covered Structure, Silhouette and Canopy views plus orbit.
  The form demonstrated genuine three-dimensional edge-on collapse,
  self-occlusion and graphite occlusion of buried segments, without a
  camera-facing projection.
- At `11/0.50`, dense overlapping activity remained visibly busy while packet
  identities, one-to-one conservation and independent timing remained exact.

These results establish the candidate's technical fitness for review, not its
artistic acceptance. Do not carry forward the superseded surface or subsurface
prototype's geometry counts, screenshots or performance figures as evidence for
this filigree droplet.

**Human review stop:** inspect both the provenance audit and the complete visible
transition, then stop. Review should ask whether blue information visibly enters
the same three-dimensional gold artwork that performs the transformation, whether
gold information leaves as a convincing consequence, and whether the graphite
trunk holds that artwork without becoming either a decorated pipe or a mechanical
cutaway. Also inspect whether the droplet remains beautiful at rest while event
light remains strictly causal. Approval of this candidate would establish
one-to-one transduction only; it would not authorise another transducer, C5
aggregation, mycelial roots, Casting Pit integration or Cosmos transport.

###### C4a-E1 — exterior filigree evidence

**Human artistic review decision (2026-10-11):** preserve the implementation and
technical evidence, but reject E1 as the finished artistic solution. Its causal
path, three-dimensional construction and provenance accounting are successful;
its spatial presentation is not. The compact nested-loop body sits predominantly
outside one face of the trunk and consequently resembles a brooch attached to the
graphite rather than a transducer occupying the trunk's volume.

This result realises the risk already recorded for C4a: visibility was not the
problem, but the graphite did not convincingly receive the form. E1 therefore
remains reproducible experimental evidence. Its implementation record, mature
geometry measurements, test results and browser findings above must not be
silently rewritten as E2 evidence or treated as the accepted form.

###### C4a-E2 — longitudinal placement/presentation study

**Status:** experiment closed without artistic sign-off. The last green
`c4a-longitudinal-placement-v1` remains selectable so that the evidence is
reproducible; it is not the accepted Tree language or the live default. The
immutable E1 evidence profile remains `c4a-exterior-brooch-v1`.

**Purpose:** investigate spatial placement and presentation before adding
complexity. E2 tests whether the same bounded transduction interval can read as a
longitudinal, DNA-like, genuinely volumetric presence within the trunk rather than
as an ornament on it.

The retained presentation is one camera-independent axial shell-straddling rail
under ordinary depth. It uses a transported authored-shell frame rather than the
camera, but its C1-clearance search chooses among object-space phases and the
three visible crests occupy substantially one Structure-facing flank. The default
initial and mature fixtures both select phase `0.5833333333`; form-control rebuilds
need not. The graphite occludes genuinely buried portions and reveals only the
parts that naturally reach or cross the shell. E2 does not cut an aperture,
invoke the C2 attenuation or stencil renderers, expose the C1 inventory, use a
camera-facing projection or alter the accepted graphite silhouette to manufacture
visibility. Added filigree density, ornament and formal intricacy are deliberately
deferred until this placement question has been reviewed.

The intended eventual spatial sentence is **multiple cyan ingress directions →
one longitudinal transducer volume → one gold rootward channel**. In E2 this is a
placement hypothesis, not a many-to-one semantic claim. A shared gold channel may
carry multiple independent outputs, but it does not make them one output identity.
Every admitted cyan packet is still consumed separately and creates exactly one
distinct provenance-linked gold packet. Runtime and documentation must report
`spatialConvergenceClaim: false` and `aggregation: false`. Genuine consumption of
multiple independent inputs into one new output remains C5 work and is not
authorised by the visual arrangement.

E2 retains the existing canopy, graphite trunk, growth system, packet scheduler,
authored routes, speed and frequency controls, hidden C1 architecture and E1
evidence profile. It changes only the active transducer's bounded spatial
presentation at `meaning` and the metadata needed to distinguish the two studies.

###### C4a-E2 acceptance gate

- The active form's principal extent is longitudinal and follows the trunk rather
  than spreading across one preferred face.
- Orbit demonstrates volume around the trunk axis, honest graphite occlusion and
  no camera-dependent presentation. The result must read as held within or woven
  through the graphite, not pinned onto it.
- Cyan activity enters the same continuous object-space volume that carries the
  transformation, and gold activity leaves through a continuous rootward channel.
  No hidden radial jump or unrelated surface illumination may substitute for the
  route.
- Any visually distinct cyan approaches and shared rootward channel retain
  independent packet identities, exact one-to-one conservation and immutable
  single-source provenance. Diagnostics explicitly retain
  `spatialConvergenceClaim: false` and `aggregation: false`.
- Idle material presence creates no processing event or false output. Event light
  remains caused only by real packet traversal.
- The ordinary-depth main-scene presentation uses no aperture, C2 inventory,
  subsurface projection or bloom-dependent disclosure; C1 remains hidden.
- The accepted Tree geometry, crown, growth, transport and C1 descriptor remain
  unchanged. E1 remains reproducible evidence rather than being overwritten by
  the active profile.
- Focused regression, the complete Tree suite, production build and browser
  inspection in Silhouette, Structure and Canopy views are recorded below. A
  clean-load console inspection after network idle and a further four-second
  settle records zero warning or error entries.

###### C4a-E2 implementation and verification record

`c4a-longitudinal-placement-v1` is retained as selectable evidence; the exact E1
candidate is retained independently as immutable `c4a-exterior-brooch-v1`. E2
constructs one continuous rail in a transported authored-shell frame. The default
initial and mature fixtures both select object-space phase `0.5833333333`, while
other form states can select another C1-safe phase. No placement reads the live
camera, although the chosen default favours the authored Structure corridor.
Ordinary depth lets graphite occlude the interior path and reveals only its narrow
shell crossings. Runtime
semantics remain one-to-one with `spatialConvergenceClaim: false` and
`aggregation: false`; multiple-input convergence has not been implemented.

The initial E2 build records:

- path length `4.0021695331` and internal transformation phase `0.4667713550`;
- `139` buried, `22` shell-crossing and `0` exterior centre samples, with maximum
  shell protrusion `0.01516394`;
- longitudinal extent `1.8218625`, transverse extent `0.9499562` and ratio
  `1.91784`;
- three longitudinal bands spanning `54.50%` of the available axial range; and
- positive minimum C1 clearance `+0.054153`.

The mature rebuilt E2 records:

- path length `6.0671552723` and internal transformation phase `0.4648329312`;
- `151` buried, `10` shell-crossing and `0` exterior centre samples, with maximum
  shell protrusion `0.00356537`;
- longitudinal extent `1.8218625`, transverse extent `1.6018282` and ratio
  `1.13736`;
- three longitudinal bands spanning `56.92%` of the available axial range;
- positive minimum C1 clearance `+0.055337`; and
- `1,127` vertices and `1,920` triangles in the active rail geometry.

Technical checks:

- `node --test tests/category-tree/trunk-runes.test.mjs` passes **9/9** focused
  tests.
- `node --test tests/category-tree/*.test.mjs` passes **35/35** complete Tree
  tests.
- The scoped Vite production build and `git diff --check` pass.
- A clean browser load reached network idle, settled for a further four seconds
  and recorded zero warning or error console entries.

Browser inspection found three narrow, vertically separated gold shell crossings
and the rootward output in the front Structure view. Orbit changes which crests
are visible and which the graphite occludes, confirming a real object-space
internal volume rather than a camera-facing graphic. Silhouette and Canopy views
retain the accepted Tree. At `11` packets per second, approximately `41–44`
traversals were simultaneously active while counts remained conserved—for example
`178/199` and later `301/320` completed outputs. The normal renderer remained one
pass with an observed local CPU-submission range of approximately `2.1–3.6 ms`;
this is not GPU timing or a performance budget.

The technical question is answered, but the artistic question is not. E2 is
deliberately sparse and may be too discreet: the three shell crossings establish
longitudinal placement and internal volume, but do not yet constitute a finished,
intricate DNA-like artwork. That restraint is intentional for this block; it must
be judged before complexity is added.

##### C4a-E2 closure decision (2026-10-11)

The filigree experiment is closed without artistic approval. Subsequent audit
showed that the last green E2 candidate is not a neutral volumetric placement:
all three visible crests occupy substantially one flank, and its C1-safe phase is
reselected when form controls rebuild the Tree. It therefore remains a useful
axial-placement study, but cannot honestly be called a stable, circumferential or
finished DNA-like transducer.

A bounded fixed-orientation follow-up established the opposing constraint. Across
all `192` initial/mature states formed from the supported control extremes and
tiers `0`, `3` and `8`, the fixed candidate retained its authored phase and three
reveal bands, but no tested fixed phase remained clear of C1 throughout the
envelope. The best global phase still failed C1 clearance in `112/192` states;
`110` of those failures occurred in the buried axial ingress/egress/core legs.
The worst measured clearance was `-0.0261945`. Low-rise, high-conduit-weight
states also ceased to be longitudinal because the trunk became wider than the
bounded authored span. Work on adaptive buried connectors had begun but was
incomplete when the direction was closed, so those partial source changes were
reverted to the last fully tested E2 implementation.

This is a deliberate stopping point, not a new acceptance gate. Preserve E1, E2,
the failed fixed-placement measurements and their tests as evidence. Do not refine
the filigree, infer multiple-input convergence, begin C5 or start the optical-fibre
alternative until a separate reviewed experiment is authorised.

#### C4b — exterior transport study

##### C4b-O1 — one continuous optical-fibre spiral

**Status:** one bounded candidate implemented and technically checked; stopped
for human artistic review. This is not a refinement of C4a-E1 or E2, and it does
not reopen the filigree direction. Do not begin an iterative refinement sequence
before review.

**Purpose:** test whether actual information passage can reveal a restrained,
three-dimensional route down the outside of the monumental graphite trunk without
turning the trunk into an exposed machine, decorative cable or redesigned object.

The candidate is one narrow, continuous, multi-span spiral. It begins at the
canopy-side `meaning` region, follows the exterior shell down the successive
monumental trunk spans, and reaches the existing rootward resume near the base.
Its object-space placement must follow the trunk's taper, transported section
frame and accepted movement. Ordinary scene depth must make rearward turns
disappear behind the graphite under orbit; no camera-facing projection,
depth-disclosure pass, aperture or shell transparency may substitute for that
occlusion.

The fibre should be mostly invisible while idle. A genuine admitted packet is
the only cause of local disclosure: its luminous front enters blue from the
canopy, travels the authored spiral and changes gradually towards the accepted
Cosmos-gold colour as it approaches the rootward resume. The gradient is a visual
language for progress through this passage, not a claim that multiple inputs have
been semantically aggregated. Preserve the existing independent packet
identities, timings, scheduler, speed and frequency controls, and retain the
valid one-to-one arrival/consumption/output ledger with immutable single-source
provenance, `spatialConvergenceClaim: false` and `aggregation: false`.

###### C4b-O1 acceptance gate

- One coordinate-continuous exterior rail spans the intended descent from the
  canopy-side `meaning` region to the rootward resume. It is not a stack of
  disconnected rings, repeating bands or unrelated illuminated marks.
- The spiral remains narrowly registered to the changing graphite shell across
  every traversed span and after supported growth or form rebuilds. It follows
  trunk taper and movement without modifying the accepted trunk mesh, silhouette
  or canopy.
- Orbit demonstrates genuine three-dimensional placement: front turns can be
  seen, rear turns are hidden by ordinary depth, and no part of the presentation
  is camera-facing or projected onto the trunk.
- With no packet in the bounded interval, the fibre is materially almost absent
  and emits no false traversal. Real packets alone reveal local sections of the
  route.
- Every admitted packet enters blue, follows the same authored spiral and changes
  progressively towards Cosmos gold as it nears the rootward resume. The visual
  transition remains spatially continuous and does not collapse independent
  packet timing.
- The existing one-to-one causal ledger stays exact: every admitted source has
  one consumption and one distinct provenance-linked output; no packet is
  duplicated, silently lost, synchronised with another or aggregated.
  Diagnostics continue to report `spatialConvergenceClaim: false` and
  `aggregation: false`.
- The existing Tree geometry, canopy, authored routes, growth behaviour, packet
  scheduler, packet identities, speed control, frequency range and hidden C1
  architecture remain unchanged. The C4a-E1 and E2 profiles remain reproducible
  evidence rather than being overwritten.
- Focused regression, the complete Tree suite, production build and clean-load
  browser console are recorded. Visual inspection covers Silhouette, Structure
  and Canopy views, orbit, default traffic and bounded high-frequency traffic.
- Record honestly whether the candidate reads as transient information transport
  within the Tree's composition or merely as an ornamental cable. A visually
  unsuccessful result closes this candidate; it does not authorise further
  geometry or rendering refinement.

###### C4b-O1 implementation and review record

The bounded implementation is active as profile
`c4b-exterior-optical-fibre-v1`. One object-space TubeGeometry follows the three
lower trunk spans from `meaning` through `exchange` and `uptake` to the
`planting-root` resume. It contains `2,023` vertices and `3,456` triangles in one
mesh and one draw. There is no filigree granule or additional disclosure pass.

The initial route length is `14.877285403869855`; its `289` sampled centres are
classified as `27` buried connector samples, `18` shell-crossing samples and
`244` exterior samples. After mature rebuild the route length is
`24.087819466554603`, with `29` buried, `61` shell-crossing and `199` exterior
samples. Independent checks classify approximately `90%` of the rail as attached
to the shell, measure shell-radius/taper correlation above `0.9992`, and recover
approximately `3.08` monotone circumferential turns. These results support the
authored continuous exterior-spiral claim across both states rather than a stack
of unrelated rings.

The packet front alone raises the optical signal. Its warmth is continuous along
the route rather than a binary post-boundary colour, while the existing hidden
ledger still consumes each admitted source once and creates one distinct
single-source output. The O1 runtime retains
`spatialConvergenceClaim: false` and `aggregation: false`; no many-to-one rule was
introduced.

Technical verification records:

- `node --test tests/category-tree/trunk-runes.test.mjs` passes **13/13** focused
  tests.
- `node --test tests/category-tree/*.test.mjs` passes **39/39** complete Tree
  tests.
- Node syntax checks for both changed source modules pass.
- The scoped Vite production build passes.
- `git diff --check` passes apart from existing line-ending warnings.
- A deterministic `1,500`-second `11/0.50` stress run records `16,248` entries,
  `15,911` outputs and `15,710` route resumes. The remaining events are in flight:
  `538` active traversals stay below the calculated `743` bound, alongside `213`
  emitters and `303` transport packets for `841` active events. Arrival,
  consumption, output and resume balance checks are all zero, identities remain
  distinct, and bounded ledger histories remain capped at `4,096` records.

Browser inspection after maturity covered Structure, Silhouette and Canopy views.
At default traffic the same narrow route shows blue ingress, pale intermediate
turns and gold near the root; the unlit rail visually recedes. Orbit makes
rearward turns disappear behind the graphite and reappear on the other side,
confirming ordinary three-dimensional occlusion rather than a camera projection.
The route remains coherently registered to trunk taper and motion. At `11/0.50`
traffic it becomes almost continuously illuminated, as expected, but remains
narrow and responsive. The live renderer continued to report one pass and an
observed local CPU-submission range of approximately `1.4–2.3 ms`; this is not GPU
timing or a performance budget. A fresh localhost tab loaded after the final
build and recorded no console warnings or errors after settling.

This candidate is technically promising, not artistically approved. Human review
must decide whether its pale, near-white midpoint helps express transition or
weakens the blue-to-gold sentence, and whether the continuous spiral belongs to
the Tree or reads as a barber-pole cable around it. Stop here. Do not refine the
colour, turns, placement or material, infer C5 readiness, add aggregation or begin
Cosmos integration before that review.

#### C4c — internal transport presentation study

##### C4c-I1 — event-revealed internal arborescence

**Status:** technically complete but artistically rejected on 2026-10-18. O1 and
I1 remain selectable evidence; neither is the accepted internal-root language.

Human review of O1 found the exterior spiral pretty but artistically misplaced:
the canopy stream ran through the Tree's centre and then appeared to jump onto a
thread wrapped around the trunk. I1 tests one simpler proposition: the stream
continues through an internal root-like family of possible journeys and remains
central at both the canopy-side entry and rootward resume.

This is not permission to expose C1. The accepted C1 descriptor remains hidden
and unchanged, and supplies authored provenance, internal placement and clearance
constraints only. Each eligible terminal route intersects exactly one C1 carrier
owner. A packet therefore selects one derived strand by its existing route
ancestry and traverses that strand alone. At the existing boundary the source is
consumed once and creates one distinct output with immutable single-source
provenance. It does not illuminate every branch, fan out, merge or establish
higher-order meaning. Runtime remains `spatialConvergenceClaim: false` and
`aggregation: false`.

The source mesh is absent from the normal scene. At idle the accepted opaque
graphite is unchanged. During a genuine traversal, a short head and wake are
composited through a closed three-span depth proxy and full-circumference
lower-trunk ownership shell. Front depth, back depth, the nearest active fragment
and burial attenuation govern visibility. The construction is object-space and
shares Tree deformation; it does not use `GreaterDepth`, an aperture, global
transparency, a camera-facing coordinate, persistent light or bloom.

###### C4c-I1 acceptance gate

- Every eligible packet route maps to exactly one authored owner at supported
  growth tiers; no decorative or random roots are invented.
- Every strand meets the same exact centreline entry and rootward resume and is
  constructed from accepted buried C1 centreline samples with positive inherited
  carrier clearance. This bounded study does not claim an independent continuous
  shell proof for every interpolated tube point.
- One packet illuminates only its selected strand. Different packets may share a
  strand or occupy different strands while identities and timings remain
  independent.
- Idle graphite, accepted Tree geometry, canopy transport, scheduler, controls,
  C1 descriptor and E1/E2/O1 evidence remain unchanged.
- Orbit shows stable three-dimensional placement and burial-dependent occlusion,
  not a mark that follows the facing surface.
- Default `0.20` traffic discloses fragments rather than an inventory. The `11`
  packets-per-second stress setting must conserve all events and expose whether
  dense activity collapses into a static cable bundle.
- Review must explicitly reject the candidate if it reads as X-ray plumbing,
  roots trapped in glass, a miniature literal tree, broad surface illumination
  or a permanent mechanical inventory.

###### C4c-I1 implementation state

The candidate profile is `c4c-internal-arborescence-v1`. At growth tiers `0`,
`3` and `8`, respectively, `163`, `213` and `345` eligible routes map uniquely to
`3`, `9` and `24` authored owner strands. The candidate stores owner keys rather
than unstable carrier indices. Its merged geometry contains one contiguous range
per owner; packet stamping groups active traversals by range so high-frequency
traffic does not make every vertex scan unrelated packets.

Focused regression establishes deterministic geometry and ownership, exact
centreline boundaries, single-strand disclosure, path-specific timing, one-source
provenance, fine/coarse cadence equivalence, shared-strand congestion, exact
conservation, bounded depth resources and unchanged Tree geometry. Existing
filigree and optical-fibre profiles remain separately selectable and retain their
own evidence. Full suite, build and final browser evidence are recorded in the
Experiment C review.

Human review found that the upper central entry remained legible but the lower
C1-derived paths were predominantly longitudinal and too visually subdued to
read as the intended recursive internal root system. High traffic concentrated
into a nearly continuous cyan knot instead of revealing a convincing branching
order. Preserve the implementation and its technical evidence; do not refine it
into C4d or report it as an accepted artistic solution.

#### C4d — inverted internal router-tree sequence

**Sequence rule:** D1–D4 are separate bounded blocks with human review between
them. Passing a block authorises no later block. The accepted Tree, C1, packet
scheduler and prior evidence profiles remain preserved throughout.

The new hypothesis places an independent recursive tree at the exact central
rune point. It grows rootward inside the monumental trunk, reusing suitable curve
and tier concepts from the crown while replacing gravity with a deterministic
wall-clearance constraint. The inner tree is primarily routing topology: normal
artwork mode may keep it completely transparent, while an opt-in diagnostic may
show it for construction and review. It must not be confused with the future
physical or mycelial roots outside the trunk.

##### C4d-D1 — internal router topology and containment

**Status:** approved by human review on 2026-10-18. Tier `4` is the preferred
working candidate; the independent `3–6` diagnostic range and technical default
of `3` remain available. D2 was then authorised as the next bounded block.

Build one deterministic, acyclic inverted tree whose single seed is the existing
model-space rune point. Its principal limbs descend and recurse through explicit
tiers within the lower monumental trunk. Candidate growth is evaluated in the
trunk's transported local cross-sections. A segment must steer inward, shorten or
terminate before its tube radius plus safety margin would cross the physical
wall. The increasing lower-trunk circumference may supply additional viable
branch sites; no branch may be clamped into a false surface attachment after the
fact.

D1 establishes topology, geometry, tier ownership and containment only. Do not
connect the canopy route, create or consume packets, implement cyan-to-gold
transduction, modify provenance, add packet signals, select an artistic
transillumination language or change the accepted graphite. The router is absent
from normal artwork rendering. A separate diagnostic view may render it clearly
enough to inspect its recursive form and wall relationship.

For D1 review only, the independent **Internal router tiers** control permits
maximum growth tiers `3–6`, defaulting to `3`. It does not share state with canopy
**Growth tiers**. Changing it replaces only the hidden router descriptor and
merged diagnostic geometry; it does not rebuild the accepted Tree, reset packets
or begin D2 behaviour.

###### D1 acceptance gate

- The seed is the exact authored rune point in Tree object space and rebuilds
  with the monumental trunk; it is not a camera coordinate or hand-placed offset.
- Topology is one rooted tree with stable IDs, one parent per non-root node, no
  cycles or disconnected nodes, deterministic tier counts and deterministic
  geometry for identical inputs.
- Every permitted tier value `3–6` produces its exact deterministic topology and
  one contained merged diagnostic mesh. Returning from `6` to `3` restores the
  byte-equivalent baseline without changing accepted Tree geometry or causal
  transport state.
- Unrelated tubes retain positive sampled separation at every permitted tier and
  across representative form extremes; added recursion must not create false
  geometric junctions.
- The form has a readable inverted recursive silhouette: principal downward
  limbs produce subordinate branches across more than one tier rather than a
  bundle of parallel longitudinal conduits.
- Independently sampled centreline and tube-clearance checks prove that every
  accepted branch remains inside the current trunk envelope with a positive
  safety margin. Wall-limited proposals terminate or change course
  deterministically.
- Representative default and form-control rebuilds retain valid containment and
  do not mutate the accepted trunk, crown, C1 descriptor, packet routes,
  scheduler, ledgers or earlier evidence profiles.
- Normal artwork mode adds no persistent visible internal object or draw call.
  The opt-in diagnostic is clearly identified as construction evidence, not the
  proposed final presentation.
- Focused regression, complete Tree tests, build and browser inspection in the
  diagnostic plus Silhouette, Structure and Canopy views pass before review.

**Human review outcome:** the isolated topology is accepted as a credible hidden
router. The reviewer judged that four maximum tiers would probably be sufficient
for the artwork and retained the wider control because later phases may benefit
from configurable complexity. This approval authorises D2 only.

###### D1 implementation and evidence

The candidate `d1-inverted-internal-router-v1` is a separate, normally invisible
resource rather than an extension of the rejected C1-derived I1 paths. Its exact
`exchange → meaning` seed is sampled at authored progress `0.58`. Tier `1` is
triadic and every later tier is binary. The technical default remains maximum tier
`3`; the bounded diagnostic control adds recursion without changing the seed,
envelope or routing rules:

| Router tiers | Total levels | Nodes | Edges | Terminal routes |
|---:|---:|---:|---:|---:|
| `3` | `4` | `22` | `21` | `12` |
| `4` | `5` | `46` | `45` | `24` |
| `5` | `6` | `94` | `93` | `48` |
| `6` | `7` | `190` | `189` | `96` |

Route chains remain seed-first for possible D3 work, but D1 neither admits nor
creates a packet.

Every curve is evaluated in transported trunk cross-sections. Centreline offsets
are constrained by the conservative shell radius multiplied by the accepted
`0.58` minimum ring-growth scale, with tube radius and a separate wall margin
included. The twelve terminal proposals ask for more reach than the available
envelope and are shortened deterministically by the wall instead of being attached
to its surface. The default diagnostic reports zero centreline or vertex breaches,
approximately `0.014` minimum growth-wall clearance and approximately `0.119`
minimum separation between unrelated edges. The merged neutral diagnostic has
one mesh, one draw call and `4,158` vertices; it is absent from normal artwork
rendering and has explicit `packetConnected: false`, `junctionImplemented: false`
and `transportImplemented: false` state.

The higher-tier settings remain wall-contained and retain positive sampled
separation between unrelated tubes. For tiers `3–6`, the default-form minima are
approximately `+0.119`, `+0.078`, `+0.049` and `+0.023`; the tight-form minima are
approximately `+0.057`, `+0.032`, `+0.014` and `+0.0020`. An independent
`129`-sample check of the limiting tight tier-`6` form remains positive at
approximately `+0.00196`. To avoid false junctions while preserving the accepted
tier-`3` form exactly, tiers `4–6` use deterministic global angular slots and
half-strength radial bends. This makes the deepest diagnostic recursion more
ordered and leaves only a narrow packing margin. That trade-off is evidence for
human review, not a final rendering decision or authority to begin D3.

Changing the maximum tier also re-spaces the router's tier stations across the
same seed-to-root interval; it does not merely append short descendants to fixed
existing nodes. That is safe while D1 has no router packets. D3 must explicitly
decide whether this diagnostic control remains live once packets own those paths.

Focused regression passes `9/9`, covering the unchanged tier-`3` baseline, every
permitted tier from `3–6`, deterministic topology and geometry, invalid-tier
rejection, the independent UI contract, the full tier/form containment matrix,
hidden production state, one-mesh isolation, unchanged `11` Hz transport and a
live `3 → 6 → 3` resource-lifecycle/no-regression cycle. The complete Tree suite
passes `53/53`. The scoped Vite build passes with
its existing large-chunk advisory (`723.01 kB` minified). Browser inspection
passed at every permitted tier in the isolated D1 camera and at tier `6` under
orbit; the accepted artwork remained intact and the browser reported no warning
or error entries. These checks establish technical readiness for review, not
artistic acceptance.

###### D1 human sign-off

Human review on 2026-10-18 approved D1 and authorised the next bounded step. Tier
`4` is the current preferred review setting, not a change to the technical
default. D1 remains a hidden routing architecture and construction diagnostic;
its acceptance does not make the neutral mesh an artistic presentation and does
not authorise packet travel along its branches.

##### C4d-D2 — rune junction and auditable boundary

**Status:** human-approved on 2026-10-18 as essential spatial and causal
infrastructure. The construction diagnostic is not an accepted transducer-rune
artwork. D3 is authorised as the next bounded block.

Connect the existing central canopy route exactly to the D1 seed. Establish the
one-to-one boundary `one cyan source consumed → one distinct gold output created`
with immutable single-source provenance. Place the output at the internal router
root but do not yet transmit it through the branches. The term “junction box”
defines a causal and spatial role, not a required mechanical form.

**Human review gate:** prove coordinate continuity, exact one-to-one ledger
balance and a credible relationship between canopy, junction and router without
claiming aggregation. Stop before D3.

###### D2 implementation and evidence

The live Tree study now opts into candidate `c4d-d2-router-junction-v1`. This mode
is mutually exclusive with the retained C4c-I1 causal path: I1 remains
reproducible when selected explicitly, but it cannot intercept a D2 source at its
earlier boundary. Every manifested route shares the authored
`exchange → meaning` span. D2 resolves its boundary at local progress `0.58` and
checks that the route point and current D1 descriptor seed coincide within
`0.000002` Tree units before admitting an event.

At that analytic crossing the cyan source leaves routed transport exactly once.
One distinct output ID is created atomically and recorded with a frozen
single-source provenance entry, source route, terminal, emission time, event time,
site and copied model-space point. The output state is
`parked-at-router-root`; it owns no D1 terminal route, edge or distance, is not
placed back into the moving packet array and cannot advance into the router.
Runtime state therefore reports `packetConnected: true`,
`junctionImplemented: true`, `transportImplemented: false`,
`assignedRouteCount: 0`, one-to-one mode and `aggregation: false`. Lifetime
counters remain exact after the bounded `4,096`-record audit window begins to
truncate retained evidence.

The separate **Inspect D2 junction** view is diagnostic evidence only. It hides
the accepted shell, shows the neutral D1 router, lets a solid cyan packet and
short depth-tested continuity trace approach the exact seed, and leaves a compact
gold marker at the parked output point. The marker and trace are ordinary
object-space geometry with scene occlusion; they do not prescribe a junction box,
rune form, transillumination language or D4 artwork. Turning the diagnostic off
restores the unchanged opaque graphite.

Focused D2 regression passes `6/6`: explicit application opt-in and independent
UI control; exact route/seed continuity across representative forms; atomic
conversion and deeply frozen provenance; an event-gated trace terminating at the
exact root; stationary output through time and a live `3 → 4` tier change; exact
default and `11` Hz fine/coarse cadence equivalence with more than one hundred
high-rate outputs; legacy C4c inactivity; and byte-preserved Tree, C1 and D1
geometry. Combined D1/D2 regression passes `15/15`; the complete Tree suite passes
`59/59`. The scoped Vite build passes with the existing non-blocking large-chunk
advisory (`734.09 kB` minified). Browser inspection passes in normal artwork and
the tier-`4` D2 view at default and `11` Hz traffic: the visible counter remains
balanced, the cyan ingress terminates at the gold/root point, no router branch
carries colour and the diagnostic remains a single ordinary render pass. No
browser warning or error is known at this review stop.

**Human review stop:** in plain terms, watch one blue packet descend to the top
of the neutral internal tree. It should meet the small gold point without a jump
or camera-facing slide. The blue identity must end there; the gold count must rise
by one and remain parked while every lower branch stays neutral. Orbit the view to
check that the packet, short trace, gold point and router share real depth. Turn
the diagnostic off and confirm that the monumental graphite Tree is unchanged.
The counter must continue to read equal cyan consumed and gold parked with balance
`0`, including at high frequency. Do not judge this diagnostic as the final rune
or authorise D3 until those relationships are convincing.

##### C4d-D3 — independent packet transmission

**Status:** implemented, technically verified and human-approved on 2026-10-18.
The subsequent D4 candidate is now implemented and awaits separate human review.

Route each gold output down exactly one selected D1 path. Different packets may
select different endpoints or share a route, but a packet never duplicates at a
branch. Reuse the existing deterministic scheduler, speed and frequency controls
without artificial synchronisation.

**Human review gate:** verify default and `11` Hz traffic, shared-route
congestion, cadence independence, identity conservation and continuous motion
from rune towards the lower trunk. Stop before D4.

###### D3 implementation and evidence

Candidate `c4d-d3-independent-router-transport-v1` adds a transport state that is
separate from both the canopy packet array and the immutable D2 creation ledger.
At the exact D2 event it dispatches the same gold output ID and the same frozen
single-source provenance; it does not mint a second output. A stable hash of that
identity selects one current D1 terminal route. The resulting frozen assignment
contains one seed-first node/edge chain, one terminal and one length. No packet
is copied at a fork. Packets may share a route, but they are never combined or
synchronised and the semantic claim remains `transport` with
`aggregation: false`.

Motion is anchored to the canonical D2 event time, so a coarse update can admit,
advance and even complete a packet without leaving it at the seed for an extra
frame. The existing speed control re-anchors active packets at the update
boundary without a jump. Dispatch and completion events are swept in canonical
time order, so the reported peak concurrency is identical after fine animation
updates or one coarse/background update rather than mistaking a batch for
synchronisation. Lifetime conservation is explicit:
`D2 produced = D3 pending + dispatched` and
`D3 dispatched = active + arrived`. The current application performs the handoff
atomically, so pending normally remains `0`.

Each assignment also freezes its D1 route epoch. Changing **Internal router
tiers** rebuilds the current guide and changes the routes available to later
outputs, while packets already in flight finish on the exact curve snapshot they
were given. This prevents loss and remapping jumps. During the short overlap an
old-epoch packet may not coincide with the newly rebuilt guide; that is recorded
as a bounded construction-view limitation, not repaired as D4 presentation. An
epoch is keyed by deterministic tier topology rather than rebuild count, so a
`4 → 6 → 4` cycle reuses the original tier-4 route keys.

The separate **Inspect D3 transport** mode hides the graphite and the solid D1
diagnostic tubes. The latter is necessary because a correctly centred packet
would be enclosed and invisible inside a solid tube. Instead, one subdued
depth-tested centreline guide shows the current route construction and one
dynamically growing instanced mesh shows the gold packet centres. Both use the
same object-space sway field as the Tree. This two-draw diagnostic has no trails,
branch illumination, bloom, surface disclosure or production visibility. The D2
cyan ingress remains visible and its gold seed is event-pulsed rather than
misrepresented as permanently parked. D2 is refreshed every D3 frame, and its
cyan trace, cyan packet and gold seed share the exact deformation field used by
the D3 guide and packets, preserving contact at the apex under sway.

Long-session diagnostic storage is bounded to the audit capacity: recent
duplicate guards and route-use summaries cannot grow with page lifetime, while a
weak object guard still rejects replay of a retained D2 output. Replaced or
rebuilt instanced packet meshes explicitly release both geometry and instance
resources.

Focused D3 regression passes `7/7`: application opt-in and independent view;
exact same-identity one-route dispatch with frozen provenance and duplicate
rejection; live D2/D3 attachment under the shared deformation; continuous speed
changes; default and `11` Hz fine/coarse cadence equivalence—including identical
peak concurrency—with shared-route congestion; live tier-epoch retention; and
bounded audit indexes with stable revisited-tier epochs. Combined D1–D3
regression passes `22/22`; the complete Tree suite passes `66/66`. The
scoped Vite build passes with the existing non-blocking large-chunk advisory
(`753.18 kB` minified). Browser inspection passes at tier `4` under default and
`11` Hz traffic, through a live speed change, tier `4 → 6 → 4`, orbit and return
to the opaque Silhouette view. The post-audit run exceeded five hundred
arrivals while handoff and lifecycle balances remained `0`, visual overflow
remained `0`, and the one-pass local submission readout stayed approximately
`0.8–1.2 ms`; the browser console contained no warnings or errors. These are
local construction observations, not a GPU budget.

**Human review stop:** in plain terms, use **D3 Transport** with tier `4`. Watch a
blue packet touch the single apex and one gold packet leave that exact point. It
must choose one downward branch and never split at a fork. Orbit the view: the
gold points should remain attached to the three-dimensional paths, pass in front
of or behind one another normally and continue to move with the Tree. Raise
**Packet frequency** to `11.00` and confirm that several distinct points can use
one route without merging, disappearing or falling into step; both balances and
visual overflow must remain `0`. Change speed and check that existing points do
not jump. Turn the diagnostic off and confirm the monumental graphite Tree is
unchanged. Judge this as transport evidence only, not as the rune or finished
internal presentation. Stop before D4.

**Human review outcome — 2026-10-18:** D3 is approved as causal transport
infrastructure, not as the transducer-rune presentation. The diagnostic reads
best with **Internal router tiers** at `4` and **Packet frequency** near `1.00`;
tier `5` creates a less interesting trajectory. These are preferred inspection
settings only. The retained application defaults remain tier `3` and `0.20`
packets per second, while the full bounded tier and frequency controls remain
available for testing. No D4 rendering technique is selected by this sign-off.

##### C4d-D4 — artistic presentation

**Status:** the technically valid
`c4d-d4-packet-local-subsurface-loci-v1` point-locus study is retained as
artistically insufficient evidence. Candidate
`c4d-d4-route-local-subsurface-trails-v2` is implemented and technically verified
on 2026-10-18. Human review accepts it as the strongest artistic result so far and
authorises this checkpoint. It remains default-off and is not claimed as the final
transducer treatment. The checkpoint remains independently reproducible while the
subsequently authorised junction-form experiment is reviewed. Stop before C5.

D4-v1 proved that one genuine D3 identity could be disclosed at its correct
object-space centre with shell-depth occlusion, but the result looked like a
succession of small gold beads. That morphology made the post-rune packet appear
to be a different kind of information from the cyan canopy head and wake. Preserve
v1 as evidence; do not present it as the current artistic solution.

D4-v2 makes the rune the colour boundary and nothing more. The cyan packet enters
the rune; one distinct Cosmos-gold output leaves with the same head width, wake
length, wake decay, core scale, cadence and route-following motion used by the
canopy stream. Each active D3 identity supplies a frozen sample of its own
immutable route snapshot from its head back through the supported wake length.
The renderer joins those densely sampled points piecewise, so it cannot round
across an authored junction, remap the route, create a scheduler or change
transport. Its live tube radius uses the same conduit-weight formula as the
canopy packet rather than an enlarged internal substitute. No packet is copied,
merged, delayed or rephased. When no D3 packet occupies the lower trunk, D4
leaves no persistent mark. The D1 guide, complete router inventory and C1
carriers remain hidden, and the accepted graphite geometry and material are
unchanged.

The opt-in renderer uses five bounded passes: the ordinary scene; front and back
depth of an unconditional lower-trunk envelope; nearest packet-trail depth; and
one burial-attenuated gold overlay. Rear transmission has a zero floor. The trail
shares the Tree's object-space deformation, uses normal rather than additive
blending and does not use `GreaterDepth`, bloom or a camera-facing projection. An
exact re-rasterised ownership stencil was removed from v2 because its triangle
coverage produced visible banding; front/back shell depth still supplies genuine
three-dimensional occlusion. The same lower-trunk depth envelope is owned by D4
for all preserved C4 presentation profiles rather than silently depending on C4c.

This is a presentation of **passage**, not aggregation. The invariant is one
submitted route-local trail per active D3 packet identity, not guaranteed
pixel-level separation. At `11` packets per second, independent canopy timings can
place packets almost coincidently on one shared internal route. The transport
ledger, identity order, route snapshots and head positions remain distinct and
conserved. Normal alpha blending avoids an additive energy sum, although ordinary
overlapping coverage can still make a close cluster denser; it carries no semantic
claim. Guaranteed visual discernibility under that congestion would require a
later encoding or collision-presentation experiment, not dishonest packet
displacement inside this block.

The accepted D2/D3 lifecycle remains unchanged. D2 consumes the cyan source and
its visible wake atomically at the rune, so the Cosmos-gold wake begins at zero
length and grows behind the continuing head. D3 retires the output presentation
when that head arrives, so its remaining wake disappears at the endpoint. A
presentation-only residual wake could be investigated separately if the boundary
still reads as abrupt, but this block does not resurrect consumed transport state
or extend a completed packet.

The retained defaults remain tier `3`, `0.20` packets per second and D4 off. The
review setting is tier `4` at approximately `1.00` packet per second. Browser
inspection in Silhouette, Structure, Canopy and the close **D4 Passage** view
confirms that the gold head-and-wake stays on the three-dimensional route under
orbit, is attenuated or hidden by real shell depth and leaves no persistent
network between events. The monumental exterior and accepted canopy remain
unchanged in their ordinary views.

Focused D4 regression passes `6/6`, including default-off behaviour; exact shared
packet-profile constants; immutable D3 route, identity and provenance reuse; idle
withdrawal; independence from preserved C4 profiles; Tree/transport invariance;
maximum-frequency shared-route congestion; and renderer resource ownership. The
complete Tree suite passes `72/72`. The scoped Vite production build passes at
`770.17 kB` minified (`196.74 kB` gzip); the existing large-chunk advisory remains
non-blocking. In one sustained tier-4 `11.00`/`0.50` browser stress sample, `115`
packets were active, `137` had arrived, all `24/24` routes had been exercised,
peak concurrency was `122`, both lifecycle balance and visual overflow were `0`,
and `2,398` trail samples produced a local five-pass CPU-submission EMA of about
`25.4 ms` at `1075 × 930`. This intentionally severe setting is implementation
evidence, not GPU timing or a
performance budget.

**Human review gate:** with tier `4`, frequency near `1.00` and **D4 Passage**,
watch one cyan head-and-wake reach the central rune and one Cosmos-gold
head-and-wake leave it. Apart from colour, it should read as the same visual
information: the same kind of leading head, receding wake, scale, cadence and
continuous route-following motion. Rotate the Tree: the gold signal should remain
inside the volume, becoming attenuated or hidden by real graphite depth rather
than sliding onto the facing surface. Between events the opaque graphite should
again read as one monumental mass, with no guide or permanent router inventory.
Use `11.00` only as a conservation and congestion stress test; bright overlaps are
optical coincidence, not aggregation. Judge whether v2 now preserves the canopy's
visual sentence through the rune while allowing the colour change to signify
transduction. An unsuccessful artistic result is valid evidence and does not
authorise refinement or C5 without a new review decision.

**Human review outcome — 2026-10-18:** D4-v2 is approved as a worthwhile artistic
checkpoint and the best trunk result so far. The reviewer accepted the continuity
of the route-local gold head-and-wake language while identifying the sharp
cyan-to-gold handoff as the remaining visible weakness. The next bounded
hypothesis may place an intricate, event-responsive three-dimensional form at the
exact junction point, informed by the earlier filigree experiment but not attached
to the trunk like a brooch. This review authorises preservation and planning only;
the reviewer's subsequent explicit instruction authorised the bounded J1
implementation below. It does not authorise C5.

##### C4d-D4-J1 — exact-seed event-responsive junction knot

**Status:** candidate `c4d-d4-junction-knot-v1` is implemented, technically
verified and awaiting human artistic review. It is default-off, requires D4-v2's
presentation switch and does not supersede the approved D4-v2 checkpoint.

This block tests one proposition only: whether the abrupt but causally correct
cyan-to-gold handoff gains artistic meaning when the monumental trunk briefly
manifests one contained three-dimensional form at the exact D1/D2 seed. The form
is a single slender, asymmetric double-loop filament aligned along the trunk. It
does not reuse either displaced C4a flank coordinate, present a surface brooch,
expose the D1 router or create a chamber. Its waist is the immutable D2 boundary
to numerical tolerance. A longitudinally sampled conservative physical-trunk
audit now covers the complete knot height and every generated tube vertex;
representative control extremes retain positive wall clearance without shell
excursion.

The candidate is event-responsive rather than permanently visible. A real cyan
source within the bounded approach interval manifests only the canopy-facing
half. The existing D2 ledger still consumes that source and creates one distinct
gold identity at the waist. While the matching D3 output departs, the trunk
briefly reveals the complete woven response from cyan through Cosmos gold, then
withdraws it. The form is the trunk's response to the audited event, not an
additional packet path: it creates no scheduler, delay, copy, aggregation or
transport state. Concurrent events use per-vertex maximum signal, retain every
causal ID and continue to report `aggregation: false`.

J1 shares D4-v2's five-pass front-shell, back-shell, nearest-signal-depth and
normal-blended subsurface renderer. It moves in object space with the Tree and
uses genuine three-dimensional occlusion under orbit. It has no bloom,
`GreaterDepth`, camera-facing projection, additive fusion or persistent idle
mark. Turning J1 on or off leaves the accepted graphite, canopy, D1 topology, D2
ledger, D3 routes and D4 packet trails unchanged. The retained defaults remain
tier `3`, frequency `0.20` and both D4 controls off.

The bounded follow-up adds one experimental **Rune circumference** control. It
ranges from `20%` to `100%` of the locally safe physical-trunk reach and retains
`55%` as its review value. Only radial reach changes: longitudinal placement,
strand radius, topology, timing and the exact waist remain fixed. `100%` is derived
from the changing conservative graphite envelope over the full knot span, with
wall margin, surface reserve and a complete vertex audit. It may pass beyond the
smaller D1 growth envelope but cannot pass beyond the physical trunk. A slider
change disposes only the old knot geometry and reapplies the same live packet
manifestations; it does not rebuild the Tree or reset growth, scheduling,
identity, provenance or transport.

Focused J1 regression passes `7/7`, covering exact seed placement, containment,
genuine cyan approach, provenance-linked gold departure, idle withdrawal, toggle
invariance, monotonic bounded circumference, full longitudinal physical-trunk
containment, event-preserving live resize, `11` Hz conservation and the shared
depth/render contract. Preserved D2–D4 focused regression passes `26/26`. The
complete Tree suite passes `79/79`. The scoped Vite production build passes at
`785.21 kB` minified (`200.56 kB` gzip); the existing large-chunk advisory remains
non-blocking. Browser inspection in D4 Passage, Structure, Canopy and Silhouette
swept `20%`, `55%` and `100%` and reported no console warnings or errors. At
review cadence the form stays fixed at the central boundary, changes visibility
with graphite depth and disappears between events. At `11` Hz and `100%`, all
causal balances and visual overflow remained zero and the renderer remained five
passes.

**Human review gate:** set **Internal router tiers** to `4`, **Packet frequency**
near `1.00`, leave **Packet speed** at `1.55`, enable **D4 gold packet trails
(experiment)** and **D4 junction knot (experiment)**, then choose **D4 Passage**.
Watch the cyan head and wake enter the central boundary. During the handoff, a
small woven volume should appear at that same point, carry cyan into gold and
allow the accepted gold head and wake to continue rootward. Rotate the Tree and
change among Structure, Canopy and Silhouette: the event must stay in one internal
place and be hidden or revealed by real graphite, never slide onto the facing
surface. Wait between packets and confirm that no permanent ornament remains.
Sweep **Rune circumference** from `20%` through the retained `55%` setting to the
audited `100%` trunk maximum. Confirm that the existing packets continue without
a reset and that the rear loop is occluded when the Tree rotates.

The artistic question is deliberately unresolved. Judge whether the brief
double-loop event reads as a precious artwork within the artwork and gives the
colour change a spatial act, or whether it remains too small, curly or ornamental
to bear that meaning. The low setting reproduces restraint; the maximum makes the
volume emphatic but may become too emblematic. Human review should locate that
threshold rather than assume the technical maximum is the artistic answer. An
unsuccessful result is useful evidence. Stop after this review; do not refine the
geometry, change D4 transport, infer aggregation or begin C5 without a new
explicit decision.

#### C5 — provenance-preserving behavioural convergence

**Status:** artistic objective retained but paused and unauthorised after D4-v2
review; any continuation requires a separate explicit C5 brief.

**Purpose:** determine whether multiple independent authored inputs can produce
one genuinely new rootward output and a perceptible higher-order consequence
while preserving the complete hidden history of what formed it.

Test one bounded, inspectable rule at `meaning`. The authored-inlet barrier with a
full flush is now only a provisional technical hypothesis; C4a-E2 review must
first establish the transducer's accepted spatial presentation before C5 may
accept, reject or refine the combining rule. Freeze or explicitly version the
required inlet set, define behaviour for dormant or changing tiers, consume every
selected input exactly once and attach the complete immutable provenance set to
the new output. Do not expose queue mechanics as the artistic metaphor and do not
generalise the mechanism to other trunk nodes within this block.

##### Proposed C5 evidence gate

- One new output is created only from the complete input set required by the
  reviewed rule, and its provenance identifies every contributing event and
  incoming authored edge.
- Consumed inputs cannot continue rootward independently or participate in a
  second output.
- The rule is deterministic under replay, remains auditable at `11` packets per
  second and maintains finite queues despite unequal inlet rates.
- Dormant inlets, tier changes, reset and maturation cannot deadlock the system or
  silently discard queued ownership.
- Rootward event count is demonstrably lower than arrival count because of the
  explicit rule, not because signals overlap visually.
- Independent inputs remain asynchronous; implementation does not align or delay
  them merely to make convergence easy to see.
- Human review can perceive multiplicity upstream and a new unity downstream, or
  through a larger-Tree consequence, without seeing inlet counts, queues,
  carriers or a chamber. The expression does not rely solely on greater
  brightness, size or colour.
- Distant-view review confirms that the opaque trunk retains mystery, mass and
  the suggestion of more than the finite mechanism under test.

**Human review stop:** record whether the hypothesis succeeds technically and
artistically, then stop. The output need not be represented as a literal merged
object. Scaling transduction to other nodes, resolving a final behavioural
language and planting the Tree in the Casting Pit remain later decisions.

## Phase 3 — truthful activity and aggregation

### Purpose

Make motion demonstrate what the structure does.

Experiment C is the controlled bridge into this phase. C1 establishes hidden
structural truth; C2 rejects exposure of that architecture as an inventory; the
C3a rune study technically established a visible language for passage but was
artistically rejected; C3b remains an optional concealed-transport hypothesis;
C4a-E1 preserves a technically successful but brooch-like exterior presentation;
the last green C4a-E2 profile preserves a technically successful but artistically
unresolved axial presentation with one-to-one semantics; and C5 would later test
behavioural convergence. The filigree direction is closed. C4b-O1 subsequently
supplied a valid exterior transport study but was rejected as a wrapped thread.
C4c-I1 then supplied technically valid internal transport but failed to make a
recursive root order visibly convincing. C4d now separates the replacement into
router topology, junction, transmission and presentation gates; D1 and D2 are
approved and D3 is the current implemented review stop. Any later C5 success would validate a candidate mechanism at
`meaning`, not complete or automatically generalise Phase 3.

The C4a closure remains in force. The later reviewed briefs authorised C4b-O1 as
one exterior transport study, C4c-I1 as one internal presentation study and
C4d-D1 as one topology study. None reopens C4a, generalises C4 or authorises C5.

The work list below is a provisional Phase 3 direction, not an authorised
implementation sequence. Its confluence rule, behavioural language and proposed
semantic distinction must be reconsidered under a separate future brief.

### Work

1. Generate small activity events at actual terminal nodes.
2. Route each event through the explicit edge sequence towards its parent confluences.
3. At a confluence, wait for or accumulate child contributions using a simple, inspectable rule.
4. Emit a transformed parent state or event whose causally driven consequence can
   be perceived without prescribing brightness, scale, colour or a literal merged
   object as the representation.
5. Keep propagation distance-based so speed is stable across differently curved or long conduits.
6. Add separate engineering diagnostics that can prove which node and edge own
   each event; do not make those counters or internal views part of the artwork.
7. Test one stable distinction—most likely polarity—only after aggregation is readable in a single neutral activity family.

The initial behaviour should favour terminal-to-root aggregation because that most directly expresses many classified activities becoming fewer higher-order meanings. Information packets therefore move inward through the canopy and down the trunk into Cosmos. The opposed upward movement belongs to molten physical uptake from the buried root; it must not be confused with information traffic.

### Acceptance gate

- Activity travels only along real conduits and changes only at real nodes.
- A viewer can perceive multiplicity becoming a higher-order consequence through
  timing and behaviour, without reading labels or seeing the internal inventory.
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

## Composition handoff

The former Phase 5 planting brief and its P1 implementation record have moved to the dedicated composition area:

- [P1 baseline planting outcome](../composition/p1-outcome.md);
- [active composition work plan](../composition/work-plan.md).

This Tree plan remains the source of truth for the standalone Tree and its experiment history. Further decisions about roots, terrain, molten contact, Cosmos, shared motion or presentation controls belong in the composition plan so that they are not mistaken for changes to the signed-off Tree reference.

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
