# Category Tree composition — phased work plan

**Date:** 2026-11-01
**Status:** active 2026-11-01 checkpoint; the shared Tree library refactor is complete; P4 remains a sufficient contact study; P6 has a provisional clean-line/default-tuning pass; the accepted independent substrate engine now has a bounded P5 composition-integration candidate; P7/F3 is technically retained but artistically unfinished; and P2 now has a bounded ordinary terrain-depth candidate plus a live D4 terrain-depth comparison under human review
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

**Progress:** [P2a](./p2a-terrain-occlusion-outcome.md) proved that the Tree renderer can accept a composition-owned terrain occluder. P7/F3 temporarily retired that input together with the rejected brown basin and reproduced the original yellow-trail disclosure. The active composition now passes the detached membrane geometry to a private full-resolution D4 terrain-depth target. Gold packet and junction fragments compare directly with that packed live depth, independently of ordinary scene depth, so nearer lava can no longer punch camera-dependent holes in the terrain mask. Contact, elevated and well/root review cameras now conceal the internal tiers beneath the rim while retaining the ordinary Tree presentation above it. A separate, switchable ordinary-depth candidate remains responsible for the rest of the composition: the dark-matter sea supplies colour first at render order `-20`, then one composition-owned proxy borrows the live radial membrane geometry and writes depth but no colour at `-10`, before Tree, molten and Cosmos content. Fixed-camera A/B review shows that this removes the impossible far-side well disclosure while leaving top-facing molten streams and the outer network visible. Deep/narrow and shallow/broad well extremes follow the same live geometry without new allocation. The larger terrain apron is deliberately excluded from this first pass, and human artistic review remains pending. The [P2b planting-envelope contract](./p2b-planting-envelope-outcome.md) remains active because it samples the mathematical membrane directly. Its placement controls exclude buried miniature states while preserving the accepted load defaults.

### Question

Where is the actual interface among trunk, terrain and buried space, beyond the single mathematical anchor proved by P1?

### Work

1. Add a composition-owned planting envelope derived from the real lower-trunk footprint and samples from the existing membrane height function. It should expose:
   - the planting anchor and trunk footprint;
   - the terrain/trunk contact line and burial band;
   - a bounded well-influence measure rather than an arbitrary circular clip;
   - signed distance above or below the terrain at `(x, z)`;
   - explicit terrain, contact, buried and deep-medium bands.
2. Keep the rejected membrane presentation out of the active scene, but supply its detached geometry to the Tree renderer's optional external-occluder path. That path must capture a private colourless packed-depth target and compare D4 fragments directly against it without writing to the main framebuffer or influencing lava and Cosmos. The Tree keeps its own trunk-shell depth logic.
3. Give the ordinary composition a distinct colourless terrain-depth owner that borrows the same live radial membrane core. Render the substrate colour beneath it first, then let this proxy replace depth only so later Tree, molten and Cosmos manifestations obey the near wall. Keep this switch orthogonal to inspection modes and do not extend it into the terrain apron until the bounded core has passed review.
4. Add diagnostic views for the envelope, contact line and depth bands plus fixed comparison cameras. Keep them out of artwork mode.
5. Exercise the contract under well depth/width, Tree scale, root settlement and orientation changes before any new root or contact material depends on it.
6. Record the chosen setup values, but retain the controls until physical planting has passed review.

### Acceptance gate

- The contact line follows the actual terrain around the trunk footprint rather than a constant height or guessed radius.
- A point can be classified consistently by the future root, terrain, molten-contact and Cosmos layers.
- With the opaque terrain presentation absent, the detached Tree-only proxy masks only D4's gold overlay through an offscreen packed-depth target, writes neither colour nor depth to the main framebuffer, and remains independent of the ordinary composition.
- The separate ordinary-depth proxy writes no colour, owns no geometry, texture or light beyond its single depth-only material, and conceals only content behind the live radial well surface. Its A/B switch restores the exact pre-owner visibility without reallocating resources.
- Changing retained setup controls cannot detach the envelope from the trunk or membrane.
- The contract adds no visible cap, throat, plug or singularity when diagnostics are off.

## P3 — root system and physical planting

**Progress:** the [P3a physical-root prototype](./p3a-physical-root-prototype-outcome.md) remains implemented and technically verified, and was sufficient to provide P4's measured collar. Active visual acceptance is now reopened. The latest review image exposed D4 gold rootward packet trails after their Tree-local terrain mask was removed; that exact regression is corrected, but the graphite physical-root presentation still needs a deliberate burial review now that no opaque basin owns ordinary scene depth.

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
4. Use the mathematical membrane bands, optional wireframe and depth-tested guides to inspect the planting relationship. Do not reintroduce an opaque terrain mesh merely to conceal roots.
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

**Progress:** the [first composition-bound P5 prototype](./p5-dark-matter-substrate-outcome.md) remains technically valid evidence, but live review rejected its material as too calm and visually subordinate. Its exact implementation is preserved at reference commit `7cffc2b`; that rejected shader has not returned. The accepted disconnected [`substrate` study](../substrate/work-plan.md) is now reused through a narrow composition adapter. One shared energetic surface is profiled beneath both the outer datum and P2 deep-medium boundary, with a conservative crest budget and a radially sunk perimeter. Its A/B switch and composition-owned outer-depth control now sit alongside the seven shared physical, optical and motion parameters, motion freeze and an energetic reset; standalone cameras and geometry diagnostics remain endpoint-local. Swell, energy and cross-current changes recompute the crest budget and re-profile the same geometry, so even maximum settings retain the outer and deep-medium clearances without allocating a second surface. Live review confirms that the controls can move the integrated sea from the subdued default to a materially stronger cross-driven state. The shared warm sun-cast lobe now retains its normal colour balance in composition while the complete material-local rig remains capped at `0.42`; this removes an accidental second attenuation without adding a scene light or illuminating any other layer. The sea fills the open lower world and introduces no visible square edge, but cannot replace ordinary terrain depth: lava and Cosmos between the invisible membrane and the deeper sea remain legitimately visible. The separate P2 depth-owner candidate supplies that missing visibility boundary without changing the shared sea engine. P5 therefore remains under human review as the lower medium rather than being miscast as the terrain-occlusion solution.

### Question

What material world exists beneath the finite Casting Pit terrain and receives the buried extent of roots and Cosmos?

### Work

1. Prototype one dark-matter sea beneath the surrounding terrain, using the P2 depth bands. It should provide depth and a medium for buried order, not behave as a black background card or a second glowing spectacle.
2. Preserve the accepted multi-band pressure energy from the independent study, but subordinate its local illumination in the complete composition. It should retain mass and directional flux without becoming a bright second spectacle, starfield or particle fog.
3. Test its level, visible extent, thickness, opacity and relationship to the underside of the membrane from the composition, elevated and root cameras.
4. Review it alone, with terrain, and with the P3 planted Tree before allowing Cosmos to use it.

### Acceptance gate

- A full orbit has no unexplained open void or obvious backing plane beneath the terrain.
- The sea reads as a continuous hidden extent even when only a small part is visible.
- It gives the roots a believable receiving medium without outlining every buried path.
- It remains visually distinct from both the clear colour and the physical terrain.
- It does not revive the rejected throat or introduce a second centre of attention.

## P6 — Cosmos material-language study

**Progress:** provisional pass. A first material-profile experiment made routes into jagged ribbons and was rejected because information packets require clean carriers. That experiment was removed completely. The retained shared renderer keeps clean routes and uses the standalone controls to establish a quieter default hierarchy: lower circuitry intensity, full arterial connectivity, reduced district density, bounded subdivision and subdued signal brightness. The same library defaults now reach the standalone Information Layer, Universe + Cosmos study and composition. This is sufficient to continue, not a final P6 artistic acceptance.

### Question

How can ordered Cosmos remain precise without reading as pristine line-and-point computer graphics?

### Work

1. Preserve the network topology, hierarchy and route-following signals while isolating visual presentation from those facts.
2. Produce a small bounded comparison rather than a wholesale rewrite. The leading proposition should test:
   - broad routes as recessed, mineral or machined seams;
   - subordinate structure as partial, broken or absorbed traces;
   - irregular material response and width within controlled hierarchy bands;
   - local disclosure by passing signals instead of uniform full-network brightness;
   - genuine burial and occlusion through the P2 terrain contract, without making P6 depend on the parked substrate experiment.
3. Compare the candidate in Cosmos-only and complete modes. A treatment that works only in isolation fails.
4. Keep post-processing out of this decision. The material, geometry, depth and temporal disclosure must do the work.

### Acceptance gate

- Cosmos still reads as ordered computation and real communication rather than random cracks.
- It supports the Tree instead of competing with its silhouette at the default view.
- Fine structure rewards proximity but does not form a uniform luminous carpet.
- The result feels excavated, submerged or materially manifested rather than overlaid on the screen.
- Network and signal provenance remain testable.

## P7 — Physical Layer source-forge study

**Progress:** F1 proved the causal accepted-emission seam and one-source-per-feed layout, but its fountain-firework manifestation was rejected in the complete composition as superficial and visually competitive. F2's pressure-responsive lakes were also rejected: even with the molten material family, their footprints read as round shields or bulbs attached to stream ends. F3 retains the shared causal state but gives it no independent silhouette. Both endpoints now apply a restrained heat lift only to existing molten density at the beginning of each real feed. The brown terrain presentation remains absent; the molten surface itself writes depth to correct the well's transparent self-ordering. Human review finds this materially more continuous but still unfinished. P5's new substrate candidate is independent of this retained forge experiment.

### Question

Can the beginning of each real molten stream imply a forge through a subtle, correctly directed energy gradient, without adding a marker, bulb, second material or opaque terrain basin?

### Work

1. Retain immutable source-layout and accepted-emission events from the shared Sluice layer. A source response may occur only after a parcel enters the real simulation; it must not inject a second parcel or alter mass, velocity, timing, storage or reconstruction.
2. Keep the forge component as a bounded state engine with no mesh, geometry, material, texture, light, timer or animation loop. Both endpoints must read the same shared state.
3. Keep **Lava-source ring radius** as a real physical control. `sourceRadius` spans `9–16` units in `0.25` steps, defaults to `13` and retains deterministic `±0.75` per-feed variation. Changing it rebuilds the physical origins and approach trajectories; thermal origins follow the resulting source observations.
4. Retain `all`, `selected` and `off` diagnostics in the standalone endpoint. The composition needs only a checked whole-ring A/B switch.
5. Aggregate each accepted event into bounded pressure owned by its source. Pressure modestly strengthens and extends source heat, then settles to zero; time alone, visibility changes and mode changes cannot create or replay activity.
6. Apply source energy only after copying the physical molten field, and only where existing reconstructed density is non-zero. Use a continuous Gaussian falloff across and downstream in the ordinary lava palette, avoiding any bounded LED-like colour step. Modify the presentation heat channel, not density, silhouette or any physical density, heat, flow or parcel state.
7. Retain the expanded `36 × 36 / 256²` molten field and irregular radial coverage expiry so every bounded source remains connected to visible lava without revealing its square numerical allocation.
8. Keep the brown membrane core, perimeter apron, throat and receiver absent from the composition and active Casting Pit studies. Retain only a detached, colourless membrane proxy in the Tree's private D4 packed-depth pass so gold rootward packet trails respect nearer terrain; it must not write colour or depth to the main framebuffer or affect lava and Cosmos. Keep the optional wireframe diagnostic, and let the transparent molten material write depth so nearest molten fragments resolve the steep well correctly.
9. Expose **Source heat** (`0–1`, default `0.40`), **Heat reach** (`0.50–5.00`, default `2.25`) and **Pressure settling** (`0.40–2.50`, default `1.25`), together with one fixed **Source ring** comparison camera and explicit causal/zero-mass readouts.

### Acceptance gate

- Source pressure can occur only after its exact source accepts an emission; stopping, reset and layout replacement return every thermal source to rest.
- One accepted event affects only its owning source, and repeated events remain bounded at pressure `1` without allocating render resources.
- Every generated feed has exactly one source observation, and heat is evaluated along that feed's real initial direction.
- Moving `sourceRadius` regenerates physical feeds across `9–16`; it is not a visual-only group transform.
- The thermal presentation writes no density, creates zero synthetic mass and leaves downstream Universe behaviour equivalent with or without its callback.
- Minimum and maximum source-heat settings preserve the real molten silhouette; no bulb, lake or end cap appears.
- Active endpoints contain no opaque basin presentation. The single molten surface writes its own nearest-fragment depth instead of relying on the former brown bowl.
- The optional membrane wireframe remains off by default and accurately exposes the same physical field when requested.
- Human review can revise the thermal treatment without invalidating the causal seam, physical radius contract or one-source-per-feed proposition.

## P8 — rooted motion

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

## P9 — composition and control consolidation

### Question

Can the approved defaults present one artwork without requiring the viewer to operate three development panels?

### Work

1. Revisit camera framing, lighting ownership, exposure and relative emphasis only after P2–P8 establish the objects being framed.
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

## P10 — causal transduction, deliberately deferred

Only after the spatial, material and motion gates pass should the composition connect its two opposed flows:

- molten material rises from the physical Universe through the planted root system to sustain the Tree;
- aggregated information descends through the Tree and roots into ordered Cosmos.

These must remain distinct transport laws driven by real source events. P10 is listed now because P2–P9 must leave truthful seams for it, but it is not authority to implement decorative cross-system pulses during the visual composition work.

## Cross-phase verification

Every bounded phase should include:

- fixed screenshots from composition, elevated and root cameras;
- a full-orbit occlusion review;
- isolated layer comparisons against the signed-off endpoints;
- deterministic tests for new spatial contracts and state-derived behaviour;
- the focused Category Tree test suite and a production build;
- a brief outcome record separating technical result from human artistic judgement.

The 1 November checkpoint retains **P7 / F3 as technically sound but artistically unfinished** and records **P6 as a provisional clean-line pass**. P5 now has a spatially safe shared-engine integration candidate, and P2 has a distinct colourless ordinary-depth candidate over it. Their first joint review is useful evidence rather than automatic acceptance: the sea supplies the lower world, while the borrowed radial membrane now supplies well concealment without a visible basin.

Continue in this order:

1. complete human A/B review of the P2 depth owner and P5 substrate from the composition, elevated, root and subterrain cameras;
2. if the radial core passes, audit any remaining disclosure outside its boundary before deciding whether a separate irregular-apron experiment is necessary;
3. recheck P3 root burial and P4 collar/contact against the distinct terrain and lower-medium owners;
4. review overall camera, relative emphasis and substrate controls before returning to the unfinished P7/F3 source heat;
5. begin P8 rooted sway only after the planting interface is visually trustworthy.
