# Tree Phase 0 — topology skeleton outcome

**Date:** 27 September 2026  
**Status:** amended with an explicit trunk; ready for visual and structural review

## Purpose

Phase 0 asks whether the new Tree can begin from explicit recursive relationships rather than from a shader that resembles branching.

The experiment is available at:

`src/category-tree/tree/index.html`

When Vite is running, the usual URL is:

`http://localhost:5173/src/category-tree/tree/index.html`

The Tree is deliberately developed away from the Casting Pit. It uses a neutral datum so topology, local coordinates and camera legibility can be judged without molten material, circuitry, membrane deformation or well occlusion.

## Implemented hierarchy

The representative fixture contains:

- 36 explicit nodes;
- 35 explicit parent-child relationships;
- one root;
- three successive trunk confluences between the planting root and the first principal division;
- 20 terminals;
- a maximum depth of seven relationships;
- three major limbs with unequal populations;
- unequal sibling counts and subtree depths.

Nodes have stable identifiers, labels, kinds and parent identifiers. The model constructs child indexes and verifies:

- identifiers are present and unique;
- node kinds are recognised;
- parents exist;
- a node is not its own parent;
- exactly one root exists;
- only the root has the root role;
- terminals have no children;
- non-terminal roles have children;
- all nodes are reachable exactly once;
- recursive traversal contains no cycle.

The page does not infer a hierarchy from proximity or generated geometry. Every rendered connection corresponds to one relationship in the fixture.

## Deterministic diagnostic layout

The Tree has a canonical local planting point at `(0, 0, 0)`. The root is fixed at that point. One common route rises through physical uptake, transformative exchange and resolved meaning before any principal limb separates from it.

The initial layout assigned terminals along one horizontal ordering and used depth only as a small offset. Aerial inspection revealed that the result was effectively planar: it resembled a tree pinned and pruned against a wall.

The amended layout allocates angular territory according to the terminal population of each subtree. Three principal limbs leave the crown into distinct sectors, and every descendant spreads outward and upward within its parent's sector. Stable identifier hashes add bounded variation to angle, reach and rise. Reloading with the same fixture produces the same volumetric crown.

This layout is diagnostic rather than artistic. It is intended to expose:

- generations;
- unequal branch depth;
- sibling groups;
- the exact root location;
- radial crown occupation and accidental crossings when the object is orbited.

It is not proposed as the final Tree silhouette.

## Rendering and composition boundary

The layer creates one local `THREE.Group` containing:

- finite cylindrical parent-child connections;
- role-scaled node meshes;
- an optional local axes helper.

The layer does not create or own a scene, camera, renderer, lighting rig or animation loop. The standalone `main.js` owns those facilities and adds the returned group to its neutral world. This is the minimal composition seam required to plant the same local object in a later host without making it depend on the Casting Pit.

Five role colours are diagnostic only:

- amber root;
- earthen orange trunk confluences;
- blue totals;
- muted green categories;
- pale terminals.

They carry no claim about the final material or semantic palette.

## Inspection controls

The page provides independent switches for:

- nodes;
- finite connections;
- role colours;
- local planting axes.

It also provides:

- a Silhouette camera;
- a near-aerial Canopy camera;
- a closer Structure camera;
- live counts and validation status.

Orbit controls remain available in every view.

## Visual findings

The first live inspection exposed a conceptual omission: the principal totals diverged immediately from the planting root, so the structure read as a bush. Phase 0 was therefore amended before acceptance.

The amended view now shows one sustained, weight-bearing trunk before three recognisably unequal major limbs. The deepest terminal groups remain distinguishable, and the Canopy view demonstrates that they occupy a volumetric radial crown rather than one narrow plane. Enabling the local axes confirms that the object grows from one stable origin and that its complete structure can be transformed as one group.

The trunk is thicker than subsidiary connections in the diagnostic rendering, but this is not its final artistic treatment. It is now a first-class topological route consisting of real nodes and edges rather than a decorative cylinder placed behind the hierarchy.

Conceptually, the trunk will become the Tree's transducer when composition begins. Its roots will be buried at the gravity-well centre, where physical channels can receive or draw upward released molten material. Distinct phloem-like channels will carry aggregated information packets down from the canopy through the trunk and into Cosmos. These opposed but related transports are future behaviour; Phase 0 proves only that their shared structural route exists.

The result is intentionally an armature. Straight connections, regular generational rise and diagnostic nodes do not yet possess the monumental, organic-industrial character described in the concept. Adding that character now would have compromised the purpose of Phase 0.

The present layout also reveals the next real problem: Phase 1 must turn this legible hierarchy into a strong unified silhouette without losing finite endpoints, unequal structure or inspectability. It must not merely curve the existing lines and call the result a tree.

## Verification

- Model construction reports 36 nodes, 35 connections, 20 terminals and maximum depth 7.
- Every terminal-to-root route shares the explicit three-stage trunk before the crown division.
- The root position is exactly `(0, 0, 0)`.
- Repeated layout generation produces identical positions.
- JavaScript syntax checks pass.
- A Vite production build succeeds.
- The page runs without browser errors or warnings.
- Silhouette and Canopy views were visually inspected.
- The local-axes switch visibly identifies the planting frame.
- Resize and orbit behaviour remain operational.

Vite continues to report its existing advisory that the Three.js output chunk is larger than 500 kB. This is not a Phase 0 regression.

## Acceptance assessment

| Criterion | Result |
| --- | --- |
| Explicit hierarchy rather than geometric imitation | Pass |
| One rendered edge per model relationship | Pass |
| Deterministic layout | Pass |
| Canonical local planting origin | Pass |
| Sustained common trunk before principal branching | Pass after amendment |
| Volumetric crown under aerial inspection | Pass after layout amendment |
| Unequal depths and sibling counts visible | Pass |
| Tree is independent of Casting Pit systems | Pass |
| Host owns world and rendering facilities | Pass |
| Diagnostic visibility controls | Pass |
| Three inspection camera states | Pass |
| Final silhouette or material character | Not attempted in Phase 0 |
| Activity or aggregation | Not attempted in Phase 0 |

## Recommendation

Stop for review before Phase 1.

If the topology and inspection approach are accepted, Phase 1 should work exclusively on recursive form and monumental silhouette. The model fixture, root frame and one-edge-per-relationship invariant should remain fixed while layout, conduit shape, taper and junction construction are explored.

The trunk should be treated as a principal artistic object in that work: substantial enough to establish age, load and transformation, and constructed so later phases can reveal multiple longitudinal transport channels. Actual lava uptake, data packets and Cosmos integration remain outside Phase 1 until the structure itself has succeeded.
