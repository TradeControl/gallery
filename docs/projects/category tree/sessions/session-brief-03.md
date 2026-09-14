# Session brief: Casting Pit v0.2b — Emergent molten flow

## Authorization

This session is authorised for **Casting Pit v0.2b reconnaissance and design only**.

Do **not** modify the implementation yet.

The purpose of this session is to determine the smallest credible real-time technique for making the molten material behave less like predetermined illuminated conduits and more like physical material moving across the Casting Pit surface.

This is deliberately an experiment.

The Gallery project is intended to discover workable visual and computational techniques through bounded studies. A useful negative result, a technically credible limitation, or a recommendation to decompose the problem further is acceptable.

Do not force an implementation merely to produce an output.

## Required project context

Before proposing anything, read:

1. `README.md`
2. `docs/project-context.md`
3. `docs/projects/category tree/concept.md`
4. `docs/projects/category tree/casting-pit/concept.md`
5. `docs/projects/category tree/casting-pit/v0.1-outcome.md`
6. `docs/projects/category tree/casting-pit/v0.2-outcome.md`
7. the current `src/casting-pit/` implementation

The historical Casting Pit shader and analysis remain useful evidence of approaches that failed:

- `docs/projects/category tree/archive/casting_pit.1.glsl`
- `docs/projects/category tree/archive/casting-pit.1.md`

Do not modify:

- `src/getting-started/`

Do not begin Tree or throat work.

## What v0.2 proved

v0.2 successfully demonstrated:

- multiple independent molten paths;
- correct attachment to the deforming membrane;
- consistent inward transport;
- useful live controls;
- convergence towards the centre;
- improved readability of the gravity well without the diagnostic overlay.

Seven explicit cubic Bézier paths are currently defined in the membrane's undeformed material coordinates and rendered as subdivided ribbons whose heights are sampled through the same `membraneHeight(x,z)` function as the surface.

This architecture is technically clean and should be understood before proposing its replacement.

## What v0.2 did not prove

The current result does **not** yet read convincingly as lava.

The main artistic criticism is:

> The molten channels look like electronic or photo-electric transmissions travelling along predetermined cables.

Their routes are decided in advance. The animated shader then makes energy appear to travel along those routes.

Consequently:

- the trajectory is primary and the material is secondary;
- streams cannot meaningfully affect one another;
- they do not cross because of differing velocity or momentum;
- they do not merge because of physical convergence;
- they do not pool, deflect or locally reorganise;
- movement resembles information travelling through conduits more than molten matter travelling over terrain.

The v0.2 outcome already recognises related weaknesses: the paths do not physically merge, the shader represents moving heat concentrations rather than changing fluid volume, and high-intensity settings can become electrical rather than viscous.

Treat these as findings, not bugs to disguise.

## New question

Investigate:

> Can the trajectory of the molten material emerge from its movement across the Casting Pit surface rather than being prescribed in advance?

More specifically:

> What is the smallest computational model capable of producing irregular molten streams which can cross, converge, merge or otherwise influence one another while remaining stable, controllable and visually convincing in the existing Three.js scene?

The desired behaviour need not be physically exact.

The objective is a convincing executable metaphor of material under gravity, momentum and convergence.

## Important physical distinction

The present Casting Pit surface is deliberately smooth.

Its dominant large-scale feature is the central gravity-like depression.

On a perfectly smooth radially symmetric surface, local downhill acceleration alone may produce trajectories that are too orderly.

Therefore assess what additional causes of trajectory variation are actually necessary.

Candidates might include:

- differing source locations;
- differing initial velocities;
- persistent momentum;
- differing material volume or effective mass;
- local perturbation of velocity;
- interaction between neighbouring parcels or streams;
- weak controlled stochastic variation;
- accumulation or temporary pooling;
- local surface perturbation.

Do not assume all of these are required.

Determine the minimum useful set.

## Surface constraint

Do not immediately replace the smooth Casting Pit with rough terrain.

The broad smooth membrane and gravity well have already succeeded artistically and should remain the governing form.

If local geometric perturbation appears necessary for believable flow, explain:

- why;
- what scale it would operate at;
- whether it can remain subordinate to the monumental smooth depression;
- whether it should be permanent geometry, flow-created deformation, or some other mechanism.

Do not introduce noise merely because noise looks organic.

## Interaction

A stronger v0.2b model should make at least some of the following possible in principle:

- one flow crossing another;
- streams meeting at different velocities;
- local merging;
- temporary accumulation;
- one stream deflecting or joining another;
- paths varying because of previous motion rather than because a designer drew a different Bézier curve;
- increasingly dominant inward convergence as material descends into the well.

Not every behaviour must appear constantly.

The important requirement is that the system permits **consequence**.

One flow should not necessarily exist in complete ignorance of the others.

## Visual requirement

Do not solve the problem by turning the scene into:

- a particle fountain;
- glowing dots;
- smoke;
- sparks;
- procedural visual noise;
- UV distortion;
- a more complicated collection of predetermined curves.

Particles may be useful internally as a simulation representation, but the rendered result should still read as connected or semi-connected molten material.

Likewise, shader effects may enhance the material, but must not substitute for the underlying transport behaviour.

## Candidate technical territory

Investigate, but do not assume, approaches such as:

- surface-constrained particles or parcels carrying position and velocity;
- integration of momentum plus local downhill acceleration;
- particles contributing to a temporary density or flow field;
- short-lived ribbons/trails reconstructed from recent parcel histories;
- merging nearby parcels or flow groups;
- a lightweight heightfield or cellular transport model;
- GPU-assisted techniques only if CPU-side Three.js approaches are clearly insufficient.

A full computational-fluid-dynamics solution is not the goal.

If convincing behaviour requires significantly more machinery than is justified by this artwork, say so.

## Foundry channels — fallback, not first choice

There is a physically legitimate fallback.

In real foundry practice, molten metal may be directed through deliberately prepared channels.

That could eventually allow the Casting Pit to use engineered surface channels rather than completely free flow.

However, do **not** adopt that solution during this reconnaissance merely because it is easier.

First establish whether convincing freer molten behaviour can be achieved economically.

If not, explicitly compare the free-flow approach with an engineered-channel approach and explain the trade-offs.

A later hybrid is also conceivable: prepared channels with overtopping, spilling, crossing or merging.

Do not implement it now.

## Preserve useful work

The existing v0.2 implementation is not a failed experiment.

Its explicit surface-bound ribbons and moving signals may ultimately be useful elsewhere in the Category Tree, particularly where organised information or energy is intended to move through engineered recursive structures.

Do not delete or casually destroy this work.

Treat it as a successful transport prototype whose visual language is inappropriate for pre-casting molten material.

## Questions to answer

Return a short technical proposal addressing:

1. Why the present Bézier-ribbon system reads as cables rather than molten material.
2. Whether convincing emergent flow is feasible in real time with the current Three.js/Vite architecture.
3. The smallest proposed computational model.
4. What state each moving unit would carry.
5. How the membrane would influence its motion.
6. How multiple flows could cross, merge or otherwise interact.
7. How the internal simulation would be rendered as continuous or semi-continuous molten material rather than particles.
8. Whether the perfectly smooth membrane is sufficient, or whether small-scale surface structure is genuinely required.
9. Expected performance and complexity.
10. Which parts of the existing v0.2 implementation should be retained.
11. The main failure modes you expect.
12. Whether the problem should be implemented as one v0.2b experiment or decomposed into smaller studies.
13. Whether engineered foundry channels should remain merely a fallback or already appear preferable for technical or artistic reasons.

## Decision point

Do not write implementation code during this session.

End with one of these recommendations:

**A. Proceed with v0.2b implementation**

The proposed model is small, understandable and likely to produce genuinely emergent molten behaviour.

**B. Decompose v0.2b further**

The idea is promising, but one or more isolated experiments should be solved before attempting the complete system.

**C. Free-flow approach is disproportionate**

The likely complexity or performance cost is not justified, and an engineered-channel or hybrid foundry model is the stronger next direction.

Give reasons.

The result of this session is the recommendation itself. A negative or inconclusive result is acceptable.