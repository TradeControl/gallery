# Gallery — Casting Pit v0.4a: Cosmic Circuitry

## Purpose

Begin a new, independent Casting Pit experiment investigating the visual layer beneath the molten casting system.

The preceding work has taken the lava system far enough for us to stop refining it in isolation.

This experiment is deliberately **not** the previously anticipated central throat / transition study. Live artistic review suggests that we need to understand the broader composition before deciding what the central transition should become.

The next question is therefore the proposed **cosmic circuitry underlay**.

## Required project context

Before implementation, please review:

1. `README.md` where relevant.
2. `docs/project-context.md`.
3. The root Category Tree concept.
4. The Casting Pit concept.
5. The latest v0.3 outcome and post-review corrections.
6. The current `src/casting-pit/sluice-gate/` implementation.

Earlier Casting Pit experiments remain useful evidence, but they are not specifications for this experiment.

## Position on the current lava layer

The v0.3 sluice-gate experiment is considered conceptually successful.

Through implementation and live visual review we have established:

- molten material now reads as physical lava rather than electronic transmission;
- peripheral streams can create a sense of a wider territory feeding the scene;
- stream count and gate count must remain independent;
- distributed incoming streams feed a genuine shared packet-backed rim reservoir;
- phased gates create real accumulation and release;
- downstream motion remains governed by the established physical system;
- amalgamation is now understood as desirable physical behaviour rather than something whose source identity must be preserved;
- low gate counts, particularly two gates, can create substantial periodic lavafalls rather than continuous small releases.

A particularly useful artistic observation from the two-gate configuration is the temporal sequence:

**accumulation → release → lavafall → convergence → recovery**

Higher gate counts create more continuous confluence; lower gate counts create fewer, more monumental events. Gate count should therefore remain configurable.

The lava layer is **not finished artwork**, but we do not currently want to refine it further.

Preserve it.

Do not alter its physics, reconstruction, shared reservoir, gate system or source architecture merely to accommodate the new visual layer.

## New sibling experiment

Create a new sibling experiment at:

`src/casting-pit/cosmic-circuitry/`

This experiment should **not** be derived from the current lava, packet, molten or sluice-gate implementations.

Instead, use the original successful Casting Pit gravity-well / membrane study as the baseline.

The experiment should initially contain only:

- the dark deformable membrane and gravity well;
- the established camera, lighting and resize behaviour;
- the optional diagnostic wireframe/grid overlay;
- the new cosmic circuitry system;
- the focused controls required to judge it.

Do not include:

- packets;
- molten reconstruction;
- peripheral lava streams;
- reservoirs;
- sluice gates;
- lava-related controls or simulation machinery.

Preserve all existing Casting Pit experiments unchanged.

The purpose of this separation is deliberate.

We first want to answer whether the cosmic circuitry is visually and computationally successful **in its own right**, without asking it to compete with the molten casting system.

The diagnostic wireframe remains exactly that: a diagnostic instrument for understanding the gravity-well surface. It is not part of the cosmic-circuitry artwork and should remain optional.

Once the circuitry has been developed and visually accepted independently, a later unification experiment can combine it with the successful lava / sluice-gate system.

Do not attempt that unification in this experiment.

## Artistic motivation

The lava has given the Casting Pit a successful **coarse physical scale**: large irregular bodies of material, accumulation, release, collision and convergence.

Our current judgement is that lava alone is unlikely to provide enough visual richness for the completed work.

Nor should we force it to.

The Casting Pit probably needs another visual frequency beneath the molten activity: something extremely fine, intricate, ordered and computational.

The working idea is **cosmic circuitry**.

This is not intended to be an ordinary electronic circuit board.

Imagine instead an impossible golden infrastructure combining qualities of:

- an immense city seen from very high altitude;
- ancient computational machinery;
- astronomical instrumentation;
- concentric and recursive systems;
- an intricate network whose complete purpose cannot immediately be understood.

It should feel vastly larger and more complex than the portion visible within the scene.

## Visual proposition

Against or beneath the dark membrane should exist a very fine golden lattice.

Possible visual vocabulary includes:

- incomplete concentric arcs;
- fine radial tendrils;
- tangential connections;
- branching paths;
- forks;
- complex intersections;
- subsidiary rings;
- small local networks;
- occasional dead ends;
- dense metropolitan regions contrasted with sparse regions.

Avoid perfect symmetry.

Avoid a regular grid.

Avoid an obvious PCB aesthetic.

Avoid simple random noise masquerading as complexity.

The network should possess enough underlying structure that it appears designed or generated according to some inaccessible order.

It may be useful to think of it as an **aerial city whose roads obey computational rather than geographical rules**.

## Communication

The circuitry should not be static.

Small, brilliant beads or pulses of white-gold communication should travel through selected routes in the lattice.

This electronic/informational visual language is intentional here.

It was inappropriate when the lava resembled optical transmission because lava represents physical material.

The circuitry represents a different kind of phenomenon.

The contrast we want to investigate is:

**lava transports mass slowly; circuitry transports information quickly.**

Communication should therefore feel much finer and faster than the molten system.

Possible behaviours include:

- beads travelling along routes;
- pulses crossing intersections;
- occasional branching at junctions;
- simultaneous activity on different parts of the network;
- differing route lengths;
- local bursts followed by quieter periods;
- occasional convergence or disappearance.

Do not make the entire lattice pulse uniformly.

We want communication travelling **through** a structure, not a global emissive animation.

## Relationship to the membrane

Treat the relationship between circuitry and gravity as an experimental question.

The circuitry must be a separate system from:

1. membrane geometry;
2. molten material;
3. molten transport.

Do not repeat the historical Casting Pit mistake of asking one distorted coordinate field to represent surface, deformation and flow simultaneously.

One particularly interesting possibility is that the circuitry represents an underlying order which is **not governed by gravity in the same way as physical matter**.

This might mean that its logical pattern exists independently of the gravity deformation even if its final rendering is spatially associated with the membrane.

Alternatively, it may appear physically embedded beneath or within the membrane.

Do not overcommit architecturally before seeing the result.

Choose the smallest technically credible implementation that allows us to judge these possibilities visually.

If useful, expose the relationship to surface deformation as a control or diagnostic comparison.

## Relationship to the lava

The circuitry is an underlay.

The lava should remain visually dominant at its own scale and should naturally obscure or cross circuitry where appropriate.

We particularly want to see whether the contrast works between:

- broad, dark red/orange molten bodies;
- extremely fine golden structure;
- tiny bright communication events.

Do not route circuitry around the lava.

Do not make circuitry react to lava in this experiment.

Do not make lava react to circuitry.

Their coexistence is the experiment.

Occlusion is desirable if it helps establish depth and independent layers.

## Colour and material direction

Initial direction:

- membrane/world: black, graphite, restrained industrial darkness;
- lava: retain the existing deep red/orange molten treatment;
- circuitry: fine gold;
- communication: bright gold to white-gold.

The circuitry should not simply become another large emissive orange network.

Fine structure and restrained brightness are important.

The successful result may contain a great deal of circuitry at relatively low intensity, with the moving communication beads providing the brightest detail.

## Controls

Preserve the useful existing controls.

Add only a focused set for judging the new layer.

Likely useful controls include:

- circuitry intensity;
- circuitry density / complexity;
- communication density;
- communication speed;
- communication brightness;
- possibly circuitry scale;
- possibly its relationship to membrane deformation if more than one interpretation is implemented.

Do not expose every procedural constant.

The controls are our mixing desk: each should answer a perceptible artistic question.

## Technical freedom

The exact construction of the lattice is deliberately not prescribed.

Please choose an approach appropriate to the existing Three.js/WebGL project and explain it briefly before implementation.

Possible procedural approaches are welcome provided they produce an actual coherent network rather than a decorative noise texture.

The implementation should remain reasonably small, readable and interactive.

This is an artistic computational experiment, not a request to build a general graph-rendering framework.

## Scope exclusions

Do not implement:

- the central throat / v0.3b transition;
- the Tree;
- semantic Category Tree data;
- interaction between circuitry and lava;
- final foundry architecture;
- major changes to the proven lava simulation;
- post-processing intended merely to manufacture spectacle;
- a general-purpose procedural-city engine.

We are answering one visual question.

## Principal question

> **Does an intricate golden computational underlay carrying fast pulses of communication provide the missing fine-scale order beneath the coarse molten casting system?**

A secondary question is:

> **Can the circuitry feel like an independent underlying order rather than decoration painted onto the gravity well?**

## Visual tests

Please inspect the circuitry independently on the gravity-well membrane.

Test:

1. sparse and dense circuitry configurations;
2. low and high circuitry intensity;
3. low and high communication density;
4. slower and faster communication speeds;
5. both Monumental and Elevated camera views;
6. diagnostic wireframe on and off;
7. any implemented alternatives for how the circuitry relates spatially to the gravity deformation.

Pay particular attention to whether:

- the network remains coherent at both close and distant views;
- the structure reads as intricate rather than merely noisy;
- communication visibly travels through the network;
- the network suggests a much larger system extending beyond the visible territory;
- the circuitry has sufficient visual depth and complexity to stand as an artistic layer in its own right;
- the gravity well and circuitry coexist convincingly;
- the result avoids looking like a PCB, Tron surface, conventional sci-fi HUD or ordinary data visualisation.

## Acceptance criteria

The experiment succeeds if live visual inspection supports most or all of the following:

1. The circuitry introduces a clearly different and much finer scale of structure.
2. It reads as intricate computational/cosmic infrastructure rather than a regular grid or PCB.
3. Gold circuitry is visually compatible with the existing dark membrane and molten lava.
4. Bright communication visibly travels through the lattice rather than globally flashing it.
5. The communication layer feels fast and informational in contrast with the slow physical lava.
6. Lava can obscure and cross the circuitry without either system losing its identity.
7. The composition becomes richer without becoming indiscriminately noisy.
8. The circuitry appears capable of belonging to a much larger unseen system beyond the visible territory.
9. The existing lava behaviour remains materially unchanged.

## Outcome

Please record:

- the chosen lattice-generation technique;
- how network coherence is maintained;
- how communication routes are represented and animated;
- how the circuitry relates spatially to the membrane;
- useful control ranges;
- performance;
- visual strengths;
- visual failures or unwanted readings;
- interaction with different lava configurations;
- whether the underlay supplies the missing fine-scale complexity;
- whether further circuitry work is justified before returning to the central transition.

Do not judge success solely from implementation correctness. This is primarily a visual experiment, and unexpected artistic failure is a valid outcome.

Finish with one recommendation:

**A. Refine the cosmic circuitry further**  
**B. Retain the circuitry concept and return to the central transition**  
**C. Reject or substantially reconsider the circuitry concept**

## Authorization

Before writing code, briefly report your understanding of the experiment and the implementation approach you propose.

If the project context is consistent with this brief and you identify no material conflict or ambiguity, you are authorized to proceed immediately with the new `src/casting-pit/cosmic-circuitry/` experiment and report the outcome.

If you identify a material conflict that would change the artistic proposition or require altering the established lava system, stop and report it before implementation.