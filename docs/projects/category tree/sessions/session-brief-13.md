# Casting Pit v0.6a — Well-to-Throat Transition Review

We want to investigate the next bounded experiment in the Casting Pit: **v0.6a — Well-to-Throat Transition**.

Do not implement anything in this session. This is reconnaissance and design review only.

## Current problem

The existing gravity well is mathematically smooth and radially regular. As it approaches the central receiver, the transition reads too much like a perfect circular rim or bowl.

Artistically, we want to investigate replacing that regular transition with something more organic and geological/eroded: a gravity well whose central region has been stressed, worn and cut by repeated molten flows until it terminates in an irregular throat.

The intended progression is approximately:

    broad gravity well
        → increasingly stressed/deformed ground
        → irregular eroded lip
        → constricted throat

This should not simply be a circular rim with high-frequency noise added to it.

The large-scale geometry itself should be capable of asymmetry: irregular recession of the lip, channels or notches associated with incoming molten flow, shelves, steeper sections and potentially a slightly displaced or non-circular opening.

The monumental gravity-well form must remain recognisable.

## Existing systems

Please inspect the current repository rather than assuming the implementation.

In particular review:

- `src/casting-pit/physical-layer/`
- `src/casting-pit/information-layer/`
- `src/casting-pit/universe-cosmos-v0.5a/`
- the reusable modules now supporting those experiments
- relevant Casting Pit concept, outcome and review documents

Treat the signed-off physical and information layers as reference implementations whose established behaviour should not casually be broken.

## Questions to answer

1. What geometry currently produces the smooth central well/rim/receiver?

2. Which parts of the physical simulation assume that the ground is a continuous single-valued heightfield?

3. How does the molten reconstruction currently interact with the centre, and what would an irregular lip or genuine opening change?

4. Which shared-library mechanisms would need modification or extension?

5. Can an eroded throat be introduced locally while preserving the existing Gaussian gravity well across most of the territory?

6. What geometric approaches are plausible in Three.js for this experiment?

   Compare alternatives where useful rather than selecting an approach prematurely.

7. Which parameters would make useful live artistic controls?

   Prefer controls describing meaningful large-scale properties such as throat size, asymmetry, erosion or channel cutting rather than exposing arbitrary implementation constants.

8. What are the implications for normals, lighting, depth/occlusion and camera views?

9. Identify any implications for the Cosmos manifestation, but do not solve or redesign the information layer in this experiment.

10. Propose the smallest bounded implementation experiment that would answer whether an irregular eroded well-to-throat transition materially improves the artwork.

## Important constraints

- No implementation in this session.
- Do not redesign the whole Casting Pit.
- Do not introduce the Tree or Category Tree semantics.
- Do not add decorative effects to conceal geometric problems.
- Preserve the distinction between physical Universe behaviour and informational Cosmos behaviour.
- Do not make the throat depend upon the Cosmos topology.
- Avoid framework or architectural expansion unless the existing implementation demonstrably requires it.
- Prefer a local extension of proven mechanisms over wholesale replacement.

The central artistic question is:

> Can the mathematically regular centre of the gravity well become a convincing eroded throat, shaped by physical history, without losing the monumental gravity-well form that already works?

## Deliverable

Create:

`docs/projects/category tree/casting-pit/v0.6a review.md`

The review should contain the concise technical/artistic assessment and proposed scope for the v0.6a experiment.

Do not modify source code or any other documentation.