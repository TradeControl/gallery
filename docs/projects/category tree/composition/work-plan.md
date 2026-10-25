# Category Tree composition — phased work plan

**Date:** 2026-10-25  
**Status:** active provisional plan; P1 retained as the diagnostic baseline; P4 accepted as a sufficient contact study; composition-bound P5 paused while its material language is developed independently in the standalone substrate study
**Scope:** compose the signed-off Tree, Universe and Cosmos as one causal world while preserving their standalone reference endpoints

## Starting evidence

Read this plan with:

- the [overall Category Tree concept](../concept.md);
- the [Tree concept](../tree/concept.md) and [standalone Tree plan](../tree/work-plan.md);
- the [P1 planting outcome](./p1-outcome.md);
- the retained [Casting Pit v0.6d outcome](../casting-pit/v0.6d-outcome.md), especially its rejection of a fiery throat object.

P1 proved that the three systems can share a world and render correctly. It did not prove that they yet form one artwork. The present scene anchors one point at the well centre but defines no planting footprint or contact line. A shallow trunk extension with a temporary flat closure intersects the height field; molten transport drains to a fixed central receiver without knowing the Tree; the gold multipass renderer knows trunk-shell depth but not terrain depth; Cosmos remains a bright surface-mounted network; and the volume below the terrain is visually undefined.

## Governing decisions

1. **Treat planting as a layer contract, not a placement adjustment.** Root geometry, trunk contact, molten contact and the subterrain medium must agree about the same boundary.
2. **Preserve the references.** Composition-specific adapters belong in `src/category-tree/composition/` or in narrowly exposed library seams. The signed-off standalone endpoints remain comparison controls.
3. **Resolve geometry and occlusion before surface styling.** Materials must not conceal a floating root, open cut plane or incorrect depth relationship.
4. **Use ordinary depth relationships.** Do not use `depthTest: false`, camera-facing patches, bloom, fog or a bright contact ring to manufacture attachment.
5. **Keep behaviour causal.** Lava contact must derive from live molten state; Cosmos signals must follow real routes; every Tree manifestation must share the Tree deformation field.
6. **Make one bounded visual proposition at a time.** Each phase ends at human review. A technically valid experiment is evidence, not automatic artistic approval.
7. **Consolidate controls after discovering the defaults.** The large inherited panel is useful during diagnosis, but hiding controls early would make visual decisions harder to reproduce.

## P2 — planting and contact contract

**Progress:** [P2a terrain ownership for the D4 subsurface presentation](./p2a-terrain-occlusion-outcome.md) and the [P2b planting-envelope contract](./p2b-planting-envelope-outcome.md) are implemented, technically verified and reviewed sufficiently to support P3. The P2b placement controls exclude buried miniature states while preserving the accepted load defaults.

### Question

Where is the actual interface among trunk, terrain and buried space, beyond the single mathematical anchor proved by P1?

### Work

1. Add a composition-owned planting envelope derived from the real lower-trunk footprint and samples from the existing membrane height function. It should expose:
   - the planting anchor and trunk footprint;
   - the terrain/trunk contact line and burial band;
   - a bounded well-influence measure rather than an arbitrary circular clip;
   - signed distance above or below the terrain at `(x, z)`;
   - explicit terrain, contact, buried and deep-medium bands.
2. Make the Casting Pit terrain an occluder for every Tree pass, including the gold internal multipass presentation, while preserving the trunk-shell depth logic it already needs.
3. Add diagnostic views for the envelope, contact line and depth bands plus fixed comparison cameras. Keep them out of artwork mode.
4. Exercise the contract under well depth/width, Tree scale, root settlement and orientation changes before any new root or contact material depends on it.
5. Record the chosen setup values, but retain the controls until physical planting has passed review.

### Acceptance gate

- The contact line follows the actual terrain around the trunk footprint rather than a constant height or guessed radius.
- A point can be classified consistently by the future root, terrain, molten-contact and Cosmos layers.
- Ordinary and multipass Tree imagery is correctly occluded by terrain through a full orbit and low root-level views.
- Changing retained setup controls cannot detach the envelope from the trunk or membrane.
- The contract adds no visible cap, throat, plug or singularity when diagnostics are off.

## P3 — root system and physical planting

**Progress:** the [P3a physical-root prototype](./p3a-physical-root-prototype-outcome.md) is implemented, technically verified and accepted sufficiently to provide P4's measured collar. Further artistic refinement remains possible without making its mesh the molten collider.

### Question

Can the Tree emerge from the physical world with a believable buried extent rather than merely intersecting it?

### Work

1. Build a composition-specific root prototype from the Tree's real planting root and hierarchy. Do not reinterpret the existing internal gold router as literal root geometry.
2. Constrain root paths by the P2 well and signed-depth contract:
   - the root collar may meet the terrain;
   - principal roots remain below the membrane and within the well's meaningful influence;
   - finer continuation may disappear into the dark-matter sea rather than terminate visibly;
   - no root should float above an unseen part of the landscape.
3. Visually supersede the standalone trunk's `0.18`-unit planted extension for P3a with a continuous root flare / trunk shoulder derived from the same centreline and material family; replace or weld it before any later mesh-based collision if the sculpture is accepted.
4. Make the physical terrain own occlusion. Use subterrain cameras and depth-tested guides to inspect buried geometry; do not make buried roots visible by weakening depth testing.
5. Test scale and root settlement again only after the new collar exists, then retire those values as setup parameters once defaults are approved.

### Acceptance gate

- From every normal camera, the trunk has weight and a credible load path into the ground.
- The root system is perceived as larger than the visible finite geometry but does not escape above or outside the well.
- No cut plane, sleeve, rock, cap or decorative plug is visible at the join.
- Tree-only, Universe + Tree and complete modes agree about the planting point.
- The standalone Tree remains pixel- and behaviour-equivalent to its retained reference within existing tolerances.

## P4 — live molten contact

**Progress:** the [P4 live molten-contact prototype](./p4-live-molten-contact-outcome.md) is implemented and technically verified. Its current two-gate, reduced-meniscus treatment is accepted as sufficient to continue; flowing the physical layer up the trunk remains a possible later study rather than part of P4 acceptance.

### Question

Can arriving molten material meet and lap against the planted Tree as a consequence of the Universe simulation?

### Work

1. Expose the smallest composition seam needed to sample current molten density and heat near the root collar.
2. Give the composition a bounded trunk/root occupancy mask or collision boundary without rewriting the accepted global flow model.
3. Test one physically legible contact treatment: local slowing, diversion and accumulation at the collar, with any meniscus or vertical contact geometry derived from the same live density and heat.
4. Preserve mass and source identity sufficiently that contact is not a permanently lit orange ring.
5. Inspect the join at low, elevated and orbiting views, with molten flow paused, sparse and dense.

### Acceptance gate

- Contact appears only when molten material actually reaches the base and recedes when it does not.
- Lava visibly laps against or diverts around the collar; it neither passes through the trunk nor stops at a suspicious uniform gap.
- The effect remains attached under camera orbit and Tree motion.
- The trunk stays materially dark; contact light does not turn it into a torch or revive a fiery central object.

## P5 — dark-matter substrate

**Progress:** the [first composition-bound P5 prototype](./p5-dark-matter-substrate-outcome.md) remains technically valid evidence, but live review found it too calm and visually subordinate to judge the material proposition. Artistic development has therefore moved to the disconnected [`substrate` study](../substrate/work-plan.md), where the surface can be made compelling without the gravity well, terrain, Tree or planting collar. Integration is deliberately deferred until that independent gate passes.

### Question

What material world exists beneath the finite Casting Pit terrain and receives the buried extent of roots and Cosmos?

### Work

1. Prototype one dark-matter sea beneath the surrounding terrain, using the P2 depth bands. It should provide depth and a medium for buried order, not behave as a black background card or a second glowing spectacle.
2. Keep its visual language restrained and low-frequency: mass, absorption, slow material variation and parallax are preferable to a starfield, particle fog or busy procedural noise.
3. Test its level, visible extent, thickness, opacity and relationship to the underside of the membrane from the composition, elevated and root cameras.
4. Review it alone, with terrain, and with the P3 planted Tree before allowing Cosmos to use it.

### Acceptance gate

- A full orbit has no unexplained open void or obvious backing plane beneath the terrain.
- The sea reads as a continuous hidden extent even when only a small part is visible.
- It gives the roots a believable receiving medium without outlining every buried path.
- It remains visually distinct from both the clear colour and the physical terrain.
- It does not revive the rejected throat or introduce a second centre of attention.

## P6 — Cosmos material-language study

### Question

How can ordered Cosmos remain precise without reading as pristine line-and-point computer graphics?

### Work

1. Preserve the network topology, hierarchy and route-following signals while isolating visual presentation from those facts.
2. Produce a small bounded comparison rather than a wholesale rewrite. The leading proposition should test:
   - broad routes as recessed, mineral or machined seams;
   - subordinate structure as partial, broken or absorbed traces;
   - irregular material response and width within controlled hierarchy bands;
   - local disclosure by passing signals instead of uniform full-network brightness;
   - genuine burial and occlusion through the P2 terrain contract and P5 sea.
3. Compare the candidate in Cosmos-only and complete modes. A treatment that works only in isolation fails.
4. Keep post-processing out of this decision. The material, geometry, depth and temporal disclosure must do the work.

### Acceptance gate

- Cosmos still reads as ordered computation and real communication rather than random cracks.
- It supports the Tree instead of competing with its silhouette at the default view.
- Fine structure rewards proximity but does not form a uniform luminous carpet.
- The result feels excavated, submerged or materially manifested rather than overlaid on the screen.
- Network and signal provenance remain testable.

## P7 — rooted motion

### Question

What motion makes the Tree alive without weakening its mass or breaking the physical join?

### Work

1. Retain the current shared deformation field as evidence: it already keeps the shell, information core and diagnostics together and weights motion by local height.
2. Replace raw height alone with a structural stiffness profile where useful:
   - zero sway below contact and through the roots, with a controlled continuity handoff across the exposed collar into the lower trunk;
   - very low, coherent flex through the monumental lower trunk;
   - increasing response through limb order and thinner branches;
   - restrained high-frequency motion only at the lightest extremities.
3. Distinguish persistent environmental sway from transient loading caused by growth or activity; do not let every parameter become generic wind.
4. Verify that packets, runes, internal presentation and any molten contact geometry remain registered with their hosts.
5. Use the existing freeze control for exact A/B review before deciding whether a public motion control is still useful.

### Acceptance gate

- The root collar never slides, twists or opens against the terrain.
- The lower trunk retains architectural weight while the crown remains perceptibly alive.
- Junctions stay closed and every attached visual manifestation follows the same deformation.
- Motion improves a sustained viewing, not merely a short loop, and remains legible at the default camera.

## P8 — composition and control consolidation

### Question

Can the approved defaults present one artwork without requiring the viewer to operate three development panels?

### Work

1. Revisit camera framing, lighting ownership, exposure and relative emphasis only after P2–P7 establish the objects being framed.
2. Define one default composition and a small set of review presets with stable, serialisable values.
3. Divide the current control inventory into:
   - a minimal composition surface for genuinely meaningful live dimensions;
   - review presets and visibility modes;
   - a collapsed diagnostics area for source-layer and instrumentation controls;
   - setup values that become constants once approved.
4. Remove duplicated or ineffective controls and consolidate coupled parameters under one semantic control only when the coupling is real.
5. Replace P1's test requirement that every baseline slider remain publicly duplicated with tests that the approved baseline is reproducible and diagnostics remain reachable.
6. Check resize behaviour, keyboard focus, labels, reset semantics, frame cost and geometry disposal in the final panel.

### Acceptance gate

- The default load communicates the intended hierarchy without any slider adjustment.
- A reviewer can isolate each system and reproduce every accepted phase result.
- Public controls have clear perceptual effects throughout their ranges.
- Reset returns to the approved composition, not to three unrelated source defaults.
- The complete scene retains credible performance headroom.

## P9 — causal transduction, deliberately deferred

Only after the spatial, material and motion gates pass should the composition connect its two opposed flows:

- molten material rises from the physical Universe through the planted root system to sustain the Tree;
- aggregated information descends through the Tree and roots into ordered Cosmos.

These must remain distinct transport laws driven by real source events. P9 is listed now because P2–P8 must leave truthful seams for it, but it is not authority to implement decorative cross-system pulses during the visual composition work.

## Cross-phase verification

Every bounded phase should include:

- fixed screenshots from composition, elevated and root cameras;
- a full-orbit occlusion review;
- isolated layer comparisons against the signed-off endpoints;
- deterministic tests for new spatial contracts and state-derived behaviour;
- the focused Category Tree test suite and a production build;
- a brief outcome record separating technical result from human artistic judgement.

The current review boundary is the standalone **S1 substrate study**. The surface should first be accepted, revised or rejected as an independent material proposition; only then should a separate composition adapter reconcile it with the P2 boundary and allow Cosmos to use it in P6.
