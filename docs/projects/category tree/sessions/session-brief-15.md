Work in C:\Users\Ian\source\repos\gallery.

Take ownership of Gate 2 of the Category Tree experiment and implement it completely. Use ultra reasoning and treat this as a difficult computational-geometry problem, not a cosmetic Three.js repair.

Start by reading:

- docs/projects/category tree/tree/work-plan.md
- The complete “Phase 2f — staged structural reset” section, especially Gate 2
- src/category-tree/tree/hierarchy.js
- src/category-tree/tree/layout.js
- src/category-tree/tree/tree-layer.js
- src/category-tree/tree/engineered-tree-layer.js
- src/category-tree/tree/main.js

The current uncommitted workspace is intentional. It is the signed-off Gate 1 white structural baseline. Preserve it as your starting point; do not reset to the last commit.

Objective:

Turn the complete active Tree into one genuinely continuous surface. This includes:

- continuity between every trunk segment;
- continuity between the trunk and all branches;
- continuity at the three principal antlers;
- continuity at every later trunk release;
- continuity at every recursive branch-to-branch division;
- cleanly closed terminal tips.

A branch must be a division of the same physical organism—not a separate tube that intersects, overlaps, touches, or appears attached to another mesh.

Previous Gate 2 attempts failed. Do not repeat them:

- Overlapping swept tubes left sockets, cut-lines and disconnected surfaces.
- Fusing only the trunk and short branch roots left detached protrusions and unfused crown tubes.
- Uniform global Marching Cubes lacked sufficient local resolution.
- Smooth metaball unions accumulated volume into swollen or cauliflower-like forks.
- Hard implicit union still left continuation tubes disconnected and produced view-dependent false continuity.
- Filler spheres, collars, junction blobs, hidden caps and shader-normal tricks are unacceptable.

Before choosing an implementation, deeply inspect and measure the active skeleton: spatial extent, minimum radius, junction valence, nearby unrelated branches, growth states and performance requirements. Compare credible approaches such as adaptive implicit meshing, explicitly welded generalized-cylinder junction topology, and robust solid union followed by remeshing. You may devise a better approach. Select the architecture from evidence rather than convenience.

Prototype the hardest representative junctions first:

1. A continuing trunk with several lateral releases.
2. The three-way principal crown division.
3. A crowded recursive junction.
4. A thin terminal fork.
5. Nearby unrelated branches that must not fuse.

Then implement the complete active Tree using the successful representation.

Non-negotiable requirements:

- Preserve all 683 validated nodes and 682 parent-child relationships.
- Preserve gravity eligibility, Growth tiers, recursive unfolding and circumference maturation.
- Preserve recoverable node/edge-to-surface correspondence for later information-flow routing.
- Keep the Gate 1 white material and external lighting.
- Do not redesign the silhouette.
- Do not reintroduce luminosity, bloom, colour animation, foliage or decorative concealment.
- Do not begin Gate 3.
- Dispose replaced geometry correctly and keep all existing controls responsive.
- Intermediate growth states must not reveal unreleased stubs or disconnected fragments.

Add an automated geometry audit. At minimum it must report:

- connected surface components;
- boundary edges;
- non-manifold edges and vertices;
- degenerate or zero-area triangles;
- non-finite positions and normals;
- inconsistent orientation;
- hierarchy correspondence coverage;
- unintended fusion between unrelated nearby branches.

The expected mature active Tree is one connected, watertight, consistently oriented two-manifold component. The planting/root boundary may remain a documented exception only if Gate 3 genuinely requires it.

Run the audit at Growth tiers 0, 1, 3 and 8, at minimum and maximum conduit weight, and after a complete replayed unfolding. Record geometry size and rebuild timings.

Visually inspect the mature Tree in Structure, Canopy and Silhouette views. Orbit through 360 degrees around the principal division and several recursive forks. Do not infer success from one favourable camera. Compare directly with Gate 1 and ensure there are no caps, sockets, seams, collars, pinched wedges, detached nodes, unintended mergers or unsupported swelling.

You have autonomy to investigate, prototype, implement and revise. Reject your own approach if evidence shows it is merely hiding discontinuity. Do not stop at a promising partial experiment.

When Gate 2 genuinely passes both automated and visual inspection:

- update the Gate 2 implementation status in work-plan.md;
- clearly document the selected geometry architecture and its trade-offs;
- report the audit results and visual checks;
- stop for my explicit Gate 2 sign-off;
- do not commit, push, or begin Gate 3.