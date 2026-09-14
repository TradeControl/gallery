# Session brief: Casting Pit v0.2b-2 — Molten Reconstruction

## Authorization

Create a new Casting Pit experiment:

    src/casting-pit/molten/

The existing source organisation is now correct:

    src/casting-pit/
    ├── ribbons/
    ├── parcels/
    ├── variable-packets/
    └── molten/

Preserve the existing experiments unchanged.

Use the successful Variable Packet Streams experiment as the behavioural basis for the molten study.

This iteration has one principal question:

> Can the emergent packet motion be reconstructed as convincing continuous molten material without destroying the dynamics that made the packet experiment successful?

Do not begin:

- v0.3 throat work;
- Tree work;
- engineered channels;
- terrain roughening;
- new trajectory logic;
- new source choreography;
- post-processing for its own sake;
- unrelated refactoring.

Do not redesign the packet dynamics unless an implementation requirement makes a very small change unavoidable.

---

## Required project context

Before implementation, inspect:

1. `README.md` where relevant;
2. `docs/project-context.md`;
3. the root Category Tree concept;
4. the Casting Pit concept;
5. `docs/v0.2b-1a-outcome.md`;
6. `docs/v0.2b-1b-outcome.md`;
7. the current implementation in `src/casting-pit/variable-packets/`.

Treat the previous experiments as evidence.

Do not reinterpret the old Bézier ribbons as a target implementation.

Before writing code, briefly report:

- your understanding of the visual problem;
- the proposed molten reconstruction technique;
- how it preserves the existing packet dynamics;
- any conflicts or limitations you see.

If there is no blocking conflict, proceed.

---

## Preserve the proven motion system

Carry forward the Variable Packet Streams system substantially unchanged:

- generated source population;
- Number of Streams control;
- deterministic seed/reseed behaviour;
- constant total emission;
- surface-gradient force;
- momentum;
- drag;
- neighbour interaction;
- pressure/separation;
- viscosity/alignment;
- cohesion;
- spatial hash;
- fixed-step integration;
- receiver behaviour;
- membrane geometry.

The existing packet trajectories are the source of truth for motion.

There must be no:

- Bézier paths;
- splines;
- waypoints;
- steering towards the receiver;
- authored flow channels;
- source-specific corrective forces.

The molten appearance must be reconstructed from packet behaviour, not substituted for it.

---

## Principal visual objective

The result should read as **physical molten material moving across a surface**.

It must not primarily read as:

- glowing cables;
- fibre optics;
- electrical pulses;
- laser trails;
- neon ribbons;
- animated texture coordinates;
- coloured particle streams.

The molten layer should have apparent:

- continuity;
- mass;
- persistence;
- heat;
- accumulation;
- spreading;
- merging;
- cooling or thinning at edges.

Movement should be apparent because the material itself changes and travels.

Do not simulate motion merely by sliding a brightness pulse along an otherwise fixed path.

---

## Reconstruction model

Use the smallest credible reconstruction technique.

A suitable approach may be a 2D scalar field defined in the membrane's material-space coordinates.

Packets can deposit quantities such as:

- density;
- heat;
- recent motion or flux where useful.

A CPU-maintained `DataTexture` or similarly bounded field is acceptable.

The field should be mapped back onto the same deforming membrane so the molten material remains physically attached to the Casting Pit surface.

The reconstruction should allow previous packet motion to leave a short-lived material history.

The exact implementation is yours to choose, but keep it comprehensible and bounded.

Do not introduce a full fluid solver or unrelated simulation framework.

---

## Deposition

Packets should contribute to the molten field as they move.

Prefer swept or sufficiently frequent deposition so that motion produces connected material rather than isolated dots.

Deposition should respond meaningfully to existing packet properties where appropriate, for example:

- mass;
- temperature;
- velocity;
- local packet density.

Do not overcomplicate this unless visibly necessary.

The important requirement is that multiple packets travelling near one another can reconstruct into a coherent stream of material.

---

## Persistence and decay

Molten material should persist long enough to create:

- visible streams;
- crossings;
- confluences;
- temporary pools;
- history.

It should also decay or cool sufficiently that the entire membrane does not eventually become permanently painted.

Expose a small number of useful controls if necessary, such as:

- molten persistence / cooling rate;
- deposition strength;
- molten intensity;
- reconstruction threshold.

Keep the control panel focused.

Do not expose every internal constant.

---

## Material appearance

The molten result should distinguish at least qualitatively between:

- hotter / denser material;
- cooler / thinner material;
- the surrounding dark membrane.

A plausible first material model may use:

- brighter hot cores;
- darker red/orange cooler edges;
- intensity tied to reconstructed density and heat;
- restrained emissive contribution.

Avoid making everything uniformly bright orange.

Avoid excessive bloom-like appearance.

The material should feel embodied before it feels spectacular.

A convincing dull, heavy molten flow is preferable to a beautiful electronic one.

---

## Pooling

The previous packet studies produced temporary accumulations.

This iteration should deliberately preserve and inspect them.

Do not suppress pooling merely because it looks untidy.

The molten reconstruction may reveal whether those packet accumulations become:

- convincing pools of material;
- temporary reservoirs which later drain;
- confluences;
- or obvious simulation congestion.

That distinction is one of the main things this experiment can teach us.

If pools form, observe whether:

- they spread locally;
- they persist;
- they drain;
- they are replenished;
- material enters and exits them visibly.

Do not invent special pool behaviour unless the reconstruction cannot work without it.

---

## Crossings and merging

When independently generated packet streams encounter one another, the molten reconstruction should allow their histories to:

- overlap;
- merge visually;
- create thicker or hotter regions;
- continue with the underlying emergent motion.

Do not preserve source colours in the principal molten rendering.

The artwork is no longer six or twelve coloured populations.

Once reconstructed, incoming material should belong to one molten system.

Source identity may remain available only as optional diagnostic instrumentation.

---

## Diagnostic mode

Retain a way to inspect the packet system beneath the molten reconstruction.

A useful diagnostic toggle may show:

- packets;
- source colours;
- initial source markers;
- velocity vectors;
- membrane wireframe.

The normal artistic view should hide these.

This allows us to answer:

> Is an apparent molten behaviour genuinely supported by the packet motion beneath it?

Do not allow diagnostics to become part of the final aesthetic.

---

## Number of Streams

Carry forward the **Number of Streams** control from v0.2b-1b.

Keep total emission approximately constant as stream count changes.

This control should now reveal an artistic difference:

- few streams should tend towards fewer, more substantial incoming bodies;
- many streams should tend towards more fragmented distributed activity which later interacts and converges.

Do not alter the source generator merely to make this visual distinction prettier.

If the distinction is weak after molten reconstruction, record that result.

---

## Source seed

Preserve deterministic reseeding.

Test more than one seed.

The molten result must not depend on one unusually favourable source arrangement.

Different seeds are allowed to produce materially different outcomes.

Variation is desirable if the overall behaviour remains credible.

---

## Central convergence

Preserve the existing behaviour in which the outer surface remains comparatively free-flowing and the stronger inner gradient increasingly dominates near the depression.

Do not make all molten streams point towards the centre from birth.

The visual should retain the possibility of:

- oblique travel;
- tangential motion;
- crossing;
- delayed capture;
- outward motion;
- escape.

Convergence near the stronger region of the gravity well is desirable.

The well should appear to capture material, not merely receive pre-aimed streams.

---

## Receiver

Keep the current receiver mechanism sufficient for this experiment.

Do not solve the final central throat.

Material may disappear at the receiver using a visually clean temporary treatment.

If the lack of a real opening becomes an obvious artistic limitation, record it for v0.3 rather than solving it here.

---

## Performance

Keep the experiment interactive.

The current packet model is bounded at 500 particles and performs comfortably.

Choose a reconstruction resolution appropriate to an exploratory study rather than maximum visual fidelity.

If using a field texture, begin with a modest resolution such as approximately 192–256 square unless evidence suggests another value.

Record simulation and reconstruction cost separately if useful.

Do not sacrifice clarity of implementation for premature optimisation.

---

## Visual tests

Inspect at minimum:

- 2 streams;
- approximately 6 streams;
- approximately 12 streams;
- at least two source seeds;
- default gravity;
- a lower-gravity case which encourages accumulation;
- default and varied persistence/cooling if exposed.

Evaluate from both Monumental and Elevated camera views.

Pay particular attention to:

- whether molten material remains surface-bound;
- whether trajectories still feel emergent;
- whether streams look continuous;
- whether crossings thicken or merge;
- whether pools look materially plausible;
- whether material visibly drains;
- whether convergence near the well remains convincing;
- whether the appearance slips back towards optical/electrical transmission.

---

## Acceptance criteria

v0.2b-2 succeeds if:

1. The principal visual reads more like molten material than packets or electronic transmission.
2. The molten paths are generated entirely from the existing packet dynamics.
3. Material remains attached to the deforming membrane.
4. Packet motion reconstructs into continuous or substantially connected flows.
5. Crossings and interactions can create visibly thicker, hotter or merged regions.
6. Temporary accumulation can appear as material pooling rather than merely coloured particle congestion.
7. Material persistence creates useful history without permanently painting the whole surface.
8. The Number of Streams control remains meaningful while total input stays approximately constant.
9. Different seeds produce different but credible molten histories.
10. Diagnostic packet rendering can demonstrate that visible molten behaviour corresponds to the underlying simulation.
11. The stronger central gradient still appears to capture compatible material rather than all sources being pre-directed inward.
12. Performance remains interactive.
13. No authored trajectories or new steering logic have been introduced.

The result does not need to be beautiful yet.

It does need to cross the conceptual boundary from:

**particles representing flow**

to:

**material behaving as flow**.

---

## Outcome

Create a focused v0.2b-2 outcome document.

Record:

- reconstruction technique;
- field resolution if applicable;
- deposition method;
- persistence/decay model;
- density/heat representation;
- material/shader approach;
- controls added;
- diagnostic mode;
- observations at low, medium and high stream counts;
- observations across multiple seeds;
- pooling behaviour;
- crossing/merging behaviour;
- central convergence;
- performance;
- visual weaknesses.

Explicitly answer:

> Does the reconstructed system now read as molten material rather than electronic transmission?

And:

> Did molten reconstruction preserve the emergent behaviour demonstrated by the Variable Packet Streams experiment?

And:

> Do packet accumulations become useful material pools, or do they reveal a dynamics/congestion problem?

End with one recommendation:

**A. Continue refining molten reconstruction**

The underlying behaviour remains credible and the material model is moving in the right direction.

**B. Proceed to v0.3 throat / central transition**

The molten system is sufficiently convincing that the principal remaining Casting Pit problem is the central opening and transition.

**C. Revisit packet dynamics**

Molten reconstruction exposes a specific dynamics defect which was obscured by the diagnostic particles.

**D. Investigate engineered-channel hybrid**

Free surface flow remains insufficiently coherent or physically convincing, and prepared foundry channels now have stronger justification.

Do not implement the recommendation during this session.