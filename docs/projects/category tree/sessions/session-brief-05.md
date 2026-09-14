# Session brief: Casting Pit v0.2b-1a — Adversarial Launch Tests

6 August 2026

## Authorization

Refine the existing **Casting Pit v0.2b-1 parcel dynamics experiment**.

This is a bounded diagnostic experiment.

Do not begin:

- v0.2b-2 molten reconstruction;
- v0.3 throat work;
- Tree work;
- engineered channels;
- surface roughening;
- post-processing;
- unrelated refactoring.

The existing v0.2b-1 implementation is technically useful and should remain the basis of this experiment.

## Reason for this refinement

Visual inspection of v0.2b-1 does not yet justify proceeding to molten reconstruction.

The current six source populations are arranged as three deliberately opposed pairs aimed towards off-centre encounter regions. Although their subsequent trajectories are not authored, the initial conditions make successful convergence relatively easy.

The resulting picture therefore does not convincingly demonstrate that the gravity well is **capturing** material.

It looks too much like several streams of marbles being deliberately rolled towards the well.

Cross-source neighbour counts and proximity statistics are useful diagnostics, but they are not sufficient evidence of convincing interaction or capture.

Before proceeding, make the experiment deliberately hostile to its own hypothesis.

## Experimental question

Answer:

> Can the existing gravity well capture parcels whose initial trajectories are deliberately inconvenient, while the existing interaction model produces visible consequences when those trajectories meet?

The test should make failure obvious.

## Hostile launch conditions

Replace or revise the current source arrangement so that the diagnostic scene contains clearly distinguishable launch cases.

Include at least:

1. **Radial control**
   - A source launched substantially towards the well.
   - This establishes the expected easy case.

2. **Tangential capture test**
   - A source launched approximately 90 degrees to the radial direction towards the well.
   - It should initially travel across/around the well rather than towards it.
   - We want to see whether the increasing surface gradient visibly bends and eventually captures it.

3. **Deliberate interception**
   - Arrange two source populations whose initial trajectories cross strongly, preferably at a substantial angle approaching 90 degrees.
   - Their encounter should test whether momentum and neighbour interaction visibly alter their subsequent behaviour.

4. **High-momentum challenge**
   - Launch a source with substantially greater initial momentum than the control.
   - It should resist immediate capture and visibly test the balance between momentum, drag and the gravity field.

5. **Optional outward challenge**
   - If useful without complicating the experiment, launch one population with an initial component slightly away from the well.
   - Determine whether it can still eventually be captured.

These are **initial conditions only**.

Do not introduce steering, waypoints, corrective forces, splines or hidden trajectories after launch.

## Preserve the dynamics model

Do not redesign the parcel simulation merely to make these tests succeed.

Retain the existing:

- surface-gradient force;
- momentum;
- drag;
- pressure/separation;
- alignment/viscosity;
- cohesion;
- spatial hash;
- fixed-step integration;
- central receiver.

Only change dynamics coefficients if visual evidence from the hostile tests demonstrates that the existing useful range is inadequate.

If a hostile trajectory escapes, or fails to converge within a reasonable lifetime, treat that initially as an experimental result rather than something that must automatically be corrected.

## Diagnostic presentation

Keep the source colours.

For this experiment they are instrumentation, not artwork.

They should make it easy to answer:

- where each population started;
- which trajectory was radial;
- which was tangential;
- which populations intercepted;
- whether populations mixed or remained independent;
- whether the well genuinely changed their direction.

Keep velocity vectors available.

If useful, identify the source/test cases unobtrusively in the control panel or diagnostic display so that visual inspection does not depend on remembering colours.

Do not make the parcels look like lava.

## What to watch

Visual judgement is the primary evidence for this experiment.

In particular, inspect whether:

- the tangential population initially resists the well and is then progressively curved inward;
- the high-momentum population takes a materially different route from the control;
- deliberately intersecting populations visibly affect one another;
- interaction changes direction, coherence, velocity or dwell time rather than merely increasing a proximity counter;
- source populations begin to lose their original independent-stream character after consequential encounters;
- the central well ultimately dominates trajectories that were not conveniently aimed towards it.

Statistics may support these observations but must not substitute for them.

## Controls

Retain the existing live controls.

Ensure the hostile cases can be inspected across useful gravity, drag and interaction ranges.

In particular, test low gravity deliberately.

The previous visual inspection suggested that reducing gravity could leave recognisable packet streams insufficiently converged despite the outcome report describing the system as convergent.

Reconcile that discrepancy through visual observation.

Do not tune only for the default settings.

## Acceptance criteria

v0.2b-1a succeeds if we can visually demonstrate:

1. A near-tangential launch being progressively captured by the gravity well.
2. A high-momentum launch visibly resisting capture before the well becomes dominant.
3. Two strongly intersecting populations having observable consequences on one another.
4. Trajectories remaining emergent after launch.
5. Stable surface attachment and interactive performance.
6. A meaningful range of gravity/drag/interaction settings rather than one narrowly tuned successful configuration.

The experiment does **not** need to look attractive.

If these behaviours cannot be achieved without artificial steering, excessive tuning or substantial new simulation machinery, record that result.

## Outcome

Update the v0.2b-1 outcome or create a focused v0.2b-1a outcome as appropriate.

Record:

- hostile source arrangement;
- observed tangential capture;
- interception behaviour;
- high-momentum behaviour;
- low-gravity behaviour;
- useful parameter ranges;
- escapes or failures;
- whether interaction is visually consequential rather than merely statistically detectable.

End with one recommendation:

**A. Proceed to v0.2b-2 molten reconstruction**

The hostile tests demonstrate convincing capture and consequential interaction.

**B. Refine the dynamics again**

A specific bounded dynamics problem remains and is worth solving.

**C. Stop the free-flow experiment**

The model requires too much contrivance or complexity; reconsider the engineered-channel or hybrid foundry approach.

Do not implement the recommendation during this session.