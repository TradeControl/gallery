# Casting Pit v0.3 — Peripheral Catchments and Phased Sluice Gates

## Context

The current molten reconstruction has successfully crossed the important visual boundary from electronic transmission into recognisable molten material.

Its remaining artistic weakness is now clearer.

The generated sources begin at apparently arbitrary positions on the membrane and the gravity well subsequently captures them. This was useful and deliberate during the packet-dynamics experiments because hostile and varied initial conditions proved that convergence was genuinely emergent rather than prescribed.

That test has served its purpose.

For the artwork, however, the result currently reads more like a natural lava event occurring around a gravity well than a deliberate casting process.

We want to investigate an intermediate industrial layer between naturally arriving molten material and the central gravity well.

## Artistic proposition

The outer territory should remain comparatively natural and uncontrolled.

Molten flows should arrive from or beyond the edges of the visible territory, more like irregular meandering lava rivers than radial spokes aimed at the centre.

Before reaching the gravity well, those flows encounter an industrial capture system.

Unevenly spaced sluice gates around the perimeter of the casting region collect and temporarily restrain the incoming molten material. Lava should be capable of accumulating behind closed gates, producing reservoirs or dam-like bodies.

The gates open and close at phased intervals.

When a gate opens, accumulated molten material is released towards the gravity well. Different gates should release at different times, producing changing dominance, surges, collisions, temporary accumulations and confluences.

The intended progression is:

**natural peripheral flow → accumulation → phased industrial release → emergent confluence → gravity well → casting**

The industrial apparatus determines when and where material is admitted to the casting region. It must not prescribe the complete downstream trajectory.

## Principal visual question

> Can phased industrial capture and release make the molten system read as a deliberate casting process while preserving the emergent physical behaviour already achieved?

## Implementation approach

Create this as a new sibling experiment at:

`src/casting-pit/sluice-gate/`

Derive it from the current `src/casting-pit/molten/` implementation.

Do not modify `src/casting-pit/molten/` or any earlier experiment. Preserve those directories as completed evidence of the preceding stages.

### Peripheral flows

Replace the present artwork-facing generated source arrangement with a small number of peripheral molten feeds originating at or beyond the visible territory.

These should not appear as evenly spaced radial emitters.

They should suggest natural incoming flows:

- irregular placement;
- varied approach directions;
- non-radial movement;
- some lateral/meandering character where this can be achieved without returning to prescribed Bézier trajectories;
- no requirement that an incoming flow initially points towards the gravity well.

The important distinction is that the outer flows remain physical and comparatively uncontrolled.

### Catchments and sluice gates

Introduce an unevenly spaced ring or collection of industrial gateways between the peripheral flows and the gravity well.

Each gateway should be capable of:

1. receiving incoming molten material;
2. restraining it while closed;
3. allowing a visible accumulation or reservoir to form;
4. opening;
5. releasing the accumulated material towards the inner casting region;
6. closing and beginning another accumulation cycle.

The gates should not be perfectly symmetrical or evenly distributed.

Their visual treatment should initially be restrained and functional. We are testing the mechanism and composition, not designing final foundry architecture.

### Phasing

Gate operation should be deterministic and phased rather than simultaneous.

Different gates should have different cycle periods and/or phase offsets.

The result should produce a changing composition:

- one reservoir filling while another drains;
- isolated releases;
- occasionally overlapping releases;
- surges meeting existing molten material;
- changing confluence patterns around the well.

Avoid a simple global pulse in which every gate opens and closes together.

### Downstream behaviour

Once material has passed a gate, the existing physical system should own its motion.

Do not introduce:

- Bézier paths;
- waypoints;
- invisible steering;
- authored routes to the receiver;
- corrective forces whose purpose is merely to guarantee successful convergence.

The gravity well, momentum, drag and material interaction should remain responsible for what happens after release.

Capture, collision, merging, pooling and even occasional failure are acceptable if they arise naturally.

## Preserve what we have learned

The current molten reconstruction has demonstrated useful properties that should not be casually lost:

- molten material rather than electronic-looking transmission;
- variable-width bodies;
- crossings and amalgamation;
- dripping/overlapping material;
- accumulation;
- packet-supported internal motion;
- emergent response to the gravity well.

The fact that many initially separate streams eventually amalgamate is not itself a defect. Molten material should merge.

Do not artificially preserve source identity merely to maintain a requested visual stream count.

Instead, this experiment should investigate whether **time, storage and phased release** can provide continuing visual complexity.

## Controls

Keep the existing useful membrane, physical and molten controls where practical.

Replace or supplement the current source-count emphasis with a small set of controls appropriate to this experiment.

Useful candidates include:

- Number of gates
- Gate cycle speed
- Phase spread
- Reservoir capacity / release threshold
- Gate opening duration
- Peripheral inflow rate

Do not expose every implementation constant.

A useful control should correspond to a perceptible artistic or physical question.

Deterministic Reset and Reseed behaviour should remain where applicable.

## Diagnostic mode

Retain packet and velocity diagnostics where useful for proving that the underlying behaviour remains physical.

If practical, provide a simple gate-state diagnostic showing whether each gate is:

- filling/closed;
- opening/releasing;
- draining;
- closing.

These diagnostics are development instruments, not final artwork.

## Scope exclusions

Do not yet implement:

- the v0.3 central throat;
- the Tree;
- the proposed golden/cosmic circuitry underlay;
- elaborate final foundry architecture;
- terrain roughening merely for decoration;
- post-processing or spectacle intended to hide weak behaviour;
- a full fluid simulation.

The possible cosmic circuitry layer is deliberately deferred. It is a separate artistic system and should not influence this experiment.

## Visual tests

Inspect the result over enough time to observe several gate cycles.

Test at least:

1. few gates with clearly separated phases;
2. more gates with overlapping phases;
3. slower cycles that allow substantial reservoirs to form;
4. faster cycles producing smaller repeated releases;
5. at least two deterministic arrangements/seeds where applicable;
6. both Monumental and Elevated camera views.

Pay particular attention to whether reservoirs genuinely form and subsequently drain, rather than merely leaving persistent molten-field history behind.

Also inspect whether released material remains physically interesting after passing the gate rather than immediately collapsing into identical radial streams.

## Acceptance criteria

The experiment succeeds if visual inspection supports all of the following:

1. Molten material appears to arrive naturally from the outer territory rather than spawning arbitrarily around the gravity well.
2. The viewer can perceive an intermediate industrial capture system.
3. Closed gates visibly cause molten material to accumulate.
4. Opening gates visibly release accumulated material.
5. Phased operation creates a changing composition rather than a synchronized pulse.
6. Released flows interact, merge and converge through the existing physical system rather than prescribed routes.
7. The scene reads more strongly as a deliberate casting process.
8. The molten material retains the successful physical/material character of v0.2b-2a.

## Outcome report

Record:

- the implemented source/catchment/gate architecture;
- how accumulation and release are represented physically;
- whether reservoirs genuinely store material or only appear to do so through reconstruction history;
- how gate phasing affects the composition;
- whether downstream emergent behaviour survived;
- useful control ranges;
- performance;
- visual strengths and failures;
- whether the result now reads convincingly as a casting process.

Finish with one recommendation:

**A. Refine the peripheral/gate system further**  
**B. Proceed to v0.3 throat / central transition**  
**C. Reconsider the casting-feed architecture**

Do not proceed beyond this experiment without review.