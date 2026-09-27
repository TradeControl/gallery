# Tree Phase 1b outcome — recursive crown unfolding

## Status

Implemented for visual review.

The experiment is available at:

`/src/category-tree/tree/index.html`

## Starting condition

The signed-off 36-node Tree is fully present on the first frame. The experiment does not replay germination and does not pass through a bare-trunk or pollarded state.

Its identifiers, parent-child relationships and layout are evaluated independently from the additional crown. Existing terminal nodes remain terminal.

## Explicit latent crown

The extended fixture adds 54 explicit nodes:

- 18 nodes associated with Operations;
- 18 nodes associated with Finance;
- 18 nodes associated with Resources.

Each limb receives three new category subtrees. Each subtree contains a further category generation and terminal leaves. This is deliberate model topology: every visible new conduit corresponds to one declared parent-child relationship.

The complete experiment therefore contains 90 nodes while retaining the original 36 as its established scaffold.

## Unfolding behaviour

Only the latent 54-node extension is animated. Growth starts at several established crown sites and proceeds parent-before-child within each subtree. Operations, Finance and Resources receive slightly offset schedules so the crown does not appear in one mechanical pulse.

An edge is revealed progressively along its actual cubic branch curve. Its diagnostic endpoint becomes available only when that edge is substantially established. Reseeding changes timing variation without changing the topology or final layout.

The controls provide:

- growth speed;
- viability threshold;
- pause/resume;
- reset to the complete 36-node scaffold;
- reseed timing.

## Viability

For this diagnostic pass, viability is the mean establishment progress of the 54 latent nodes. Because all three principal limbs begin in the first scheduling generation and deeper growth is parent-gated, the default 90% threshold cannot be reached by completing only one region of the crown.

This is intentionally a modest first metric. It proves that a threshold can govern a finite development cycle, but it is not yet a biological or accounting definition of viability.

## Verification

- The hierarchy validator passes with one root and no cycles or missing parents.
- The initial state visibly contains the established Tree and no latent edges.
- The live cycle reaches the default 90% threshold and stops.
- Reset restores the established scaffold immediately.
- The browser console reports no warnings or errors.

## Known boundary

The artistic branches are still separate tapered tube meshes. Progressive emergence is now visible, but intersections can still expose seams and the final silhouette remains dependent on view angle. The unified branch field proposed in the Phase 1 review remains the likely remedy; it was not smuggled into this behaviour experiment.

The current layout also favours legibility of explicit relationships over a fully dense natural crown. Visual review should decide whether the unfolding model has traction before surface fusion, secondary motion or material treatment is attempted.
