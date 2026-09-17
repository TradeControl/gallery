# Casting Pit v0.6a — Implementation

We are now in **implementation mode**.

The review has been inspected and signed off:

`docs/projects/category tree/casting-pit/v0.6a review.md`

Implement the bounded **v0.6a — Well-to-Throat Transition** experiment specified by that review.

## 1. Repository structure

We have now refactored the successful mechanisms into shared reusable code. Consequently, version numbers describe **experimental milestones**, not frozen copies of shared implementation.

Git history and the outcome/review documentation preserve historical implementation states.

Please rationalise the active source structure accordingly.

The intended structure is:

    src/casting-pit/
    ├── archive/
    ├── physical-layer/
    ├── information-layer/
    └── universe-cosmos/

Rename:

    src/casting-pit/universe-cosmos-v0.5a/

to:

    src/casting-pit/universe-cosmos/

Update any internal references required by that rename.

Do not create `universe-cosmos-v0.6a` merely to preserve the previous milestone. The combined composition is an evolving implementation using shared libraries.

`physical-layer/` and `information-layer/` remain useful reference/demo entry points.

For development of v0.6a, create a separate physical-only experimental entry point if isolation is useful, using a name that describes its role rather than implying that it is a frozen copy of the combined Universe/Cosmos implementation.

Do not duplicate shared library code in order to preserve historical versions.

## 2. Implement v0.6a

The approved specification is:

`docs/projects/category tree/casting-pit/v0.6a review.md`

Implement the **smallest bounded v0.6a experiment** defined there.

In particular, preserve the established broad Gaussian well and physical sluice behaviour while introducing:

1. deterministic low-frequency background erosion within the compact central transition;
2. a small number of dominant historical flow-driven erosion channels derived from deterministic gate-release approach bearings;
3. a genuine irregular masked opening;
4. a short tapering throat wall;
5. opening-crossing parcel capture using the same irregular boundary;
6. molten reconstruction clipped consistently at that boundary;
7. the approved artistic controls and diagnostic facilities;
8. Elevated, Monumental and free-orbit inspection.

The distinction established in the review is important:

> **The erosion is historical, but not arbitrary.**

The throat represents accumulated physical history. Current molten releases do not dynamically erode the terrain, but the resulting geometry should contain credible evidence of the same repeated physical processes.

Current transport remains:

    incoming streams
        → shared reservoir
        → selected gates
        → released molten material
        → gravity well
        → eroded throat

The erosion must not create additional material sources, reservoir leakage or gate bypasses.

## Scope boundary

Do not implement:

- dynamic terrain erosion;
- wall-bound lava;
- falling-fluid behaviour below the mouth;
- Cosmos manifestation around the throat;
- a lower crucible;
- the Tree;
- Category Tree semantics;
- post-processing or decorative effects intended to conceal weak geometry.

Do not redesign mechanisms outside the bounded experiment unless implementation demonstrates that a change is technically necessary.

Preserve the behaviour of the existing signed-off reference entry points.

## Completion

Run and inspect the implementation against the technical and artistic questions and acceptance boundary already specified in `v0.6a review.md`.

Report:

- what was implemented;
- any shared-library changes;
- whether the existing reference builds remain valid;
- technical acceptance results;
- observed limitations or unresolved visual issues.

Do not cosmetically conceal weaknesses encountered during the experiment. Record them so that the human visual review can determine the next step.