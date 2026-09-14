# Session brief: Casting Pit v0.2b-1 — Parcel dynamics

## Authorization

Implement **Casting Pit v0.2b-1: Parcel dynamics and consequence**.

This is an explicitly diagnostic experiment.

Do not attempt to make the parcels look like lava yet.

Do not begin v0.2b-2 molten reconstruction, v0.3 throat work, Tree work, engineered channels, post-processing, or unrelated refactoring.

The purpose of this session is to answer one question:

> Can multiple independently emitted parcels moving across the existing smooth Casting Pit membrane develop non-prescribed, consequential trajectories while still converging into the gravity well?

The result may be visually crude. That is acceptable.

## Required project context

Before implementation, read:

1. `README.md`
2. `docs/project-context.md`
3. `docs/projects/category tree/concept.md`
4. `docs/projects/category tree/casting-pit/concept.md`
5. `docs/projects/category tree/casting-pit/v0.1-outcome.md`
6. `docs/projects/category tree/casting-pit/v0.2-outcome.md`
7. `docs/projects/category tree/casting-pit/v0.2b-outcome.md`
8. the current `src/casting-pit/` implementation

The v0.2b reconnaissance outcome is the governing technical proposal for this experiment.

Preserve the existing v0.2 Bézier-ribbon work as experimental evidence. Do not casually delete or overwrite it.

`src/getting-started/` remains a completed reference experiment and must not be modified.

## Implementation objective

Implement the **v0.2b-1 parcel dynamics study** proposed by the reconnaissance.

Use surface-constrained moving parcels in the membrane's material coordinates `(x,z)`.

Each parcel should carry only the state justified by the reconnaissance, including:

- position;
- velocity;
- effective volume or mass;
- temperature if useful for diagnostics or later compatibility;
- age/lifetime;
- source identity.

World-space height must continue to derive from the existing `membraneHeight(x,z)` source of truth.

Do not author trajectories.

There must be no Bézier curve, spline, waypoint sequence or equivalent hidden path determining where a parcel travels.

## Dynamics

Begin with the smallest model proposed by the reconnaissance:

1. Evaluate the membrane gradient at the parcel position.
2. Accelerate the parcel downhill.
3. Preserve previous velocity so that momentum matters.
4. Apply moderate drag.
5. Find nearby parcels efficiently.
6. Apply a deliberately small interaction model:
   - short-range separation/pressure;
   - velocity alignment or viscosity;
   - mild cohesion.
7. Integrate using a stable fixed simulation step.
8. recycle/remove parcels at the central receiver, excessive age, cooling or escape as appropriate.

Use semi-implicit Euler unless implementation evidence demonstrates a reason not to.

Use a fixed simulation accumulator so display frame rate does not determine the dynamics.

Do not escalate to full fluid dynamics.

## Sources

Use multiple source regions.

They should differ sufficiently in:

- position;
- initial direction;
- initial velocity;
- emission cadence;
- volume/mass where useful.

The sources provide initial conditions, not routes.

The experiment should make it possible to see parcels from different sources encounter one another before the central depression dominates their movement.

## Interaction and consequence

This is the central acceptance question.

The system should permit observable examples of:

- crossing or near-crossing trajectories;
- oblique encounters;
- deflection;
- entrainment;
- joining;
- temporary local accumulation;
- different outcomes caused by differing momentum.

Do not hard-code individual collision outcomes.

The behaviour should emerge from the small local interaction model.

It is not necessary for every encounter to be dramatic.

It **is** necessary that parcels do not behave as independent dots that merely happen to occupy the same scene.

## Smooth membrane

Keep the successful v0.1 membrane geometry unchanged for this study unless a genuine technical defect is discovered.

Do not add visible rough terrain.

The reconnaissance concluded that the smooth membrane should first be tested using differing initial velocities, momentum, cadence, volume and neighbour interaction.

Do that experiment before adding another construction problem.

Do not add noise or arbitrary steering forces merely to make trajectories look interesting.

If the smooth surface proves too orderly, record that as a finding rather than disguising it.

## Diagnostic rendering

Render the parcels plainly.

The purpose is to inspect the dynamics, not judge the final material.

Use source identity to make different populations visually distinguishable.

Optional velocity vectors or another simple diagnostic representation are acceptable if they materially help inspection.

Avoid:

- molten shaders;
- glowing trails intended to look finished;
- smoke;
- sparks;
- elaborate particles;
- density-field reconstruction;
- emissive camouflage;
- post-processing.

The diagnostic representation should make bad dynamics obvious.

## Live controls

Retain the useful existing membrane, lighting, camera and diagnostic controls.

Add only the minimum controls necessary to investigate the dynamics.

Prefer a small set corresponding to meaningful questions, such as:

- source/emission rate;
- gravity influence;
- drag/momentum;
- interaction strength.

Do not expose every coefficient simply because it exists.

Reasonable internal defaults and constants are preferable to an unusable simulation dashboard.

## Performance

Start within the reconnaissance's conservative budget:

- approximately 300–500 active parcels;
- fixed simulation step around 1/60 second;
- efficient neighbour lookup rather than naïve all-pairs comparison.

Instrument enough internally to detect obvious performance problems.

Do not optimise prematurely.

GPU simulation is outside the scope of this study.

## Acceptance criteria

v0.2b-1 succeeds if visual inspection demonstrates that:

1. Parcels remain correctly attached to the deforming membrane.
2. Their trajectories are generated by initial conditions, momentum, surface gradient and interaction rather than prescribed paths.
3. Multiple source populations visibly encounter one another.
4. At least some encounters have observable consequences such as deflection, entrainment, joining or accumulation.
5. Motion does not collapse immediately into radial spokes.
6. Motion does not degenerate into random spray or an orbital/accretion-disc pattern.
7. The central gravity well progressively dominates and ultimately produces convergence.
8. Live controls make it possible to explore the useful behavioural range.
9. Performance remains suitable for interactive browser use.
10. The result is sufficiently understandable that we can judge whether molten reconstruction is worth attempting.

Artistic beauty is **not** an acceptance criterion for this version.

## Failure is admissible

If the parcels cannot produce convincing consequential behaviour on the smooth membrane without excessive tuning, artificial steering or disproportionate complexity, do not conceal that result.

That would be useful evidence.

Likewise, if neighbour interaction produces instability, clumping, spray, excessive radial behaviour or other systematic problems, record them clearly.

The purpose of Gallery is experimentation as well as successful results.

## Outcome

Create or update the appropriate v0.2b-1 outcome document.

Record:

- implemented model;
- useful parameter ranges;
- observed interaction behaviour;
- performance;
- successful behaviours;
- failure modes;
- whether the smooth membrane proved sufficient;
- any changes from the reconnaissance proposal and why.

End with a recommendation for exactly one of:

**A. Proceed to v0.2b-2 molten reconstruction**

The dynamics are sufficiently convincing that it is worth reconstructing them as continuous molten material.

**B. Refine parcel dynamics**

The approach is viable but a bounded dynamics problem remains.

**C. Stop the free-flow experiment**

The dynamics do not justify further complexity; reconsider the engineered-channel or hybrid foundry model.

Do not implement the recommendation in this session.