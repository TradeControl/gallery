# Session brief: Casting Pit v0.2b-1b — Variable Packet Streams

6 August 2026

## Authorization

Carry out two bounded pieces of work:

1. Reorganise the existing Casting Pit source experiments beneath a common `src/casting-pit/` project folder.
2. Create a new **Variable Packet Streams** experiment derived from the successful v0.2b-1a parcel dynamics.

This remains a diagnostic dynamics experiment.

Do not begin:

- v0.2b-2 molten reconstruction;
- v0.3 throat work;
- Tree work;
- engineered channels;
- surface roughening;
- post-processing;
- unrelated refactoring.

Do not redesign the parcel dynamics unless a specific defect prevents this experiment from functioning.

---

## Part 1 — Housekeeping

The source tree currently contains two Casting Pit implementations:

- `src/casting-pit`
- `src/casting-pit-parcels`

Reorganise these beneath a common Casting Pit project directory.

The intended structure is:

    src/
    ├── casting-pit/
    │   ├── ribbons/
    │   ├── parcels/
    │   └── variable-packets/
    └── getting-started/

Use:

- `ribbons/` for the existing prescribed Bézier/ribbon lava experiment;
- `parcels/` for the existing v0.2b-1 / v0.2b-1a parcel experiment, including Hostile Marbles;
- `variable-packets/` for the new experiment described below.

Preserve the existing experiments and their behaviour.

Update only paths or references made necessary by the move.

Do not modify `src/getting-started/`.

The descriptive directory names identify the purpose of each experiment. Version numbers remain documentation/history rather than directory architecture.

---

## Part 2 — Variable Packet Streams

### Purpose

v0.2b-1a demonstrated that the existing parcel model can respond convincingly to deliberately hostile initial conditions.

The next question is different:

> Does the same dynamics model continue to produce useful emergent behaviour when the number and initial conditions of incoming packet streams are generated rather than individually hand-designed?

The six named Adversarial Launch cases were an experimental test harness. Preserve them in `parcels/`.

Do not simply generalise or overwrite that test harness.

Create `variable-packets/` as a separate experiment derived from its proven dynamics.

### Core experiment

Replace the six hand-designed source definitions with a generated set of packet sources.

Add a live control:

**Number of streams**

A useful initial range is approximately:

    2–12

Choose an appropriate integer default within that range.

Changing the number of streams should regenerate/reset the source population cleanly.

### Constant total input

Changing stream count must not automatically change the total amount of material entering the simulation.

For example, if total emission is 48 packets per second:

- 2 streams should divide approximately that total between 2 sources;
- 6 streams should divide approximately that total between 6 sources;
- 12 streams should divide approximately that total between 12 sources.

Small source-to-source cadence variation is acceptable, but normalise or otherwise constrain it so that total input remains approximately constant.

This allows the stream-count control to test **fragmentation of incoming activity**, rather than simultaneously changing total material volume.

Retain the existing overall emission-rate control.

---

## Source generation

Do not use unconstrained randomness.

Do not hand-author trajectories.

Use **seeded, constrained generation of initial conditions**.

Each generated source should have:

- a starting position in an outer region of the membrane;
- an initial direction;
- an initial speed;
- a cadence weighting;
- mass or other existing source properties where useful.

After emission, the existing parcel dynamics must determine the trajectory.

There must be no:

- waypoint following;
- Bézier paths;
- steering towards the receiver;
- collision choreography;
- corrective forces designed around individual sources.

### Spatial distribution

Distribute sources around an outer annular region of the membrane.

Avoid making them look like perfectly equally spaced spokes on a circle.

Allow bounded variation in source radius and angular position while retaining sensible coverage of the surrounding surface.

### Initial direction

Generate initial headings relative to each source's local radial direction.

The population should contain a useful range of launch conditions, including:

- substantially inward;
- oblique;
- substantially tangential;
- where the population is large enough, at least one initial direction with an outward component.

The generator may enforce this **diversity of initial conditions**.

It must not enforce successful convergence.

In particular, do not choose source directions because they are known to intercept another source or reach the receiver.

Intersections, near misses, pooling, capture and escape should be consequences of the simulation.

### Velocity and source variation

Use bounded variation rather than arbitrary extremes.

Generated sources may vary moderately in:

- initial speed;
- cadence;
- mass;
- starting radius.

The objective is to prevent identical streams while keeping the experiment interpretable.

Avoid making every source so different that stream count ceases to be the principal variable being tested.

---

## Determinism and reseeding

The experiment must be reproducible.

For a given seed and stream count, source generation should produce the same initial source configuration.

Add a simple:

**Reseed**

control if practical.

Its purpose is to generate another deterministic source arrangement so that we can distinguish behaviour inherent in the model from behaviour caused by one fortunate source layout.

Do not continuously randomise source conditions during a run.

Individual packet jitter may remain consistent with the existing parcel implementation.

---

## Preserve the proven dynamics

Carry forward the existing v0.2b-1a model substantially unchanged:

- the same deformable membrane;
- the same surface-gradient force;
- momentum;
- drag;
- neighbour interaction;
- pressure/separation;
- alignment/viscosity;
- cohesion;
- spatial hash;
- fixed-step integration;
- central receiver;
- surface attachment.

The purpose of this experiment is not to find another dynamics model.

If a dynamics change becomes genuinely necessary, keep it small and document exactly why it was required.

---

## Diagnostic presentation

Packets remain diagnostic instrumentation.

Do not make them look like lava yet.

Use source colours so individual generated populations can still be followed.

The colours are diagnostic only and will not determine the eventual molten appearance.

It should be possible to inspect:

- source positions;
- initial directions;
- packet trajectories;
- crossings;
- interactions;
- accumulation/pooling;
- convergence;
- escapes.

Retain velocity vectors and membrane wireframe if useful.

Do not allow diagnostic UI or source colouring to become part of the artistic proposition.

---

## Pooling

The previous visual inspection revealed an interesting behaviour: changing the depression dimensions could cause packets to accumulate into apparent pools.

Do not deliberately tune this behaviour away.

At this stage we do not know whether it represents:

- useful emergent accumulation caused by momentum, drag, geometry and interaction; or
- undesirable simulation congestion.

Observe and document it.

The later molten reconstruction experiment may help determine whether these accumulations become convincing material pools or merely reveal a dynamics defect.

---

## What to test

Inspect several stream counts, including approximately:

- 2;
- a middle value;
- the upper end of the useful range.

For each, consider more than one generated seed if the reseed mechanism is available.

We want to know whether increasing source count produces credible changes in:

- fragmentation;
- crossing frequency;
- interaction;
- pooling;
- dwell time;
- capture;
- escape;
- convergence near the well.

Pay particular attention to whether the outer surface remains genuinely free-flowing while the stronger gradient nearer the well increasingly dominates packet motion.

The visual result should not collapse into:

- evenly spaced radial spokes;
- twelve independently preserved coloured cables;
- random spray;
- permanent orbiting;
- universal immediate capture;
- universal congestion.

Some generated streams succeeding while others fail is not inherently a problem.

Different initial conditions should be allowed to produce different histories.

---

## Stream-count control assessment

The **Number of streams** control should answer a meaningful artistic/system question:

> How fragmented is the distributed activity entering the casting process?

Few streams should represent a smaller number of more substantial incoming flows.

Many streams should represent more fragmented incoming activity.

Because total emission remains approximately constant, this control should change the organisation of the incoming flow rather than simply its total quantity.

Record whether this distinction is actually visible in the experiment.

---

## Acceptance criteria

v0.2b-1b succeeds if:

1. Stream count can be varied over a useful range without changing the underlying dynamics model.
2. Total packet input remains approximately constant as stream count changes.
3. Generated source arrangements are deterministic and reproducible.
4. Generated initial conditions contain useful directional diversity without being choreographed for successful convergence.
5. Trajectories remain entirely emergent after launch.
6. Multiple stream counts produce visibly different but intelligible interaction/convergence behaviour.
7. Crossings, capture, escape and pooling can occur as consequences rather than prescribed events.
8. The gravity well increasingly dominates appropriate trajectories near the central depression.
9. Performance remains interactive across the useful stream-count range.
10. The experiment provides a credible source system that could later be inherited by molten reconstruction.

A visually untidy result is acceptable.

This experiment is about behaviour, not appearance.

---

## Outcome

Create a focused v0.2b-1b outcome document.

Record:

- final source-generation method;
- stream-count range and default;
- how constant total emission is maintained;
- deterministic seed/reseed behaviour;
- source direction and velocity bounds;
- observations at low, medium and high stream counts;
- observations across more than one seed;
- pooling behaviour;
- capture and escape behaviour;
- performance;
- any dynamics changes and why they were unavoidable.

Explicitly answer:

> Did removing the six hand-designed launch cases preserve convincing emergent convergence?

And:

> Does Number of Streams behave as a meaningful control over fragmentation rather than merely producing more or fewer coloured packet trains?

End with one recommendation:

**A. Proceed to v0.2b-2 molten reconstruction**

The variable source system is credible enough to freeze while we investigate material appearance.

**B. Refine variable packet generation**

The dynamics remain credible, but the generated source population has a specific bounded defect.

**C. Stop the variable-source approach**

The behaviour depends too strongly on hand-designed launch conditions or becomes unmanageable when source multiplicity is generated.

Do not implement the recommendation during this session.