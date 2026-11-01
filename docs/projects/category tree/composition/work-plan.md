# Category Tree composition — phased work plan

**Date:** 2026-11-01
**Status:** active 2026-11-01 checkpoint; the shared Tree library refactor is complete; P4 remains a sufficient contact study; P6 has a provisional clean-line/default-tuning pass; the accepted independent substrate engine now has a bounded P5 composition-integration candidate; P7/F4 has a bounded provisional whole-plexus composition adapter; P8.1 now supplies the standalone Tree and Composition with one moving-gust-front candidate and a shared `0–15 s` to `13–29 s` interval-band review control; P10.2 replaces the first bead-like uptake manifestation with a bounded routed-liquid experiment paced by the existing information cadence; and P2 has a bounded ordinary terrain-depth candidate plus a live D4 terrain-depth comparison under human review
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

**Progress:** F1 proved the causal accepted-emission seam and one-source-per-feed layout, but its fountain-firework manifestation was rejected in the complete composition as superficial and visually competitive. F2's pressure-responsive lakes were also rejected: even with the molten material family, their footprints read as round shields or bulbs attached to stream ends. F3 retained the shared causal state without an independent silhouette, but its thermal treatment has now been removed from the composition rather than carried beside a second source proposition. F4 first replaced the standalone Physical Layer's thermal source ring with a capillary-confluence candidate. Every source owns two or three deterministic primary trunks; each trunk bifurcates into two terminal capillaries, giving four to six outer tips before the primary trunks meet at the exact physical source. Real molten parcels enter this hierarchy through one enlarged shared field and continue downstream with the same identity and mass. The confluence creates no synthetic lava, source bulb, second material or render layer. Because one selected feed proved too sparse and the whole system too visually dense for useful standalone judgement, that endpoint still defaults to a three-feed cluster while retaining selected and whole-system comparisons.

The composition now opts the same shared Sluice engine into a bounded provisional F4 adapter with all twelve feeds active. It uses the expanded `54 × 54 / 384²` molten domain, the same real parcel budget and one shared molten reconstruction, and exposes the physical confluence radius, continuity readouts and a widened **Supply plexus** camera. The irregular radial expiry still conceals the field's square numerical allocation. Each source's own hierarchy is intersection-free; rare crossings between different sources are accepted for this whole-plexus review. No further bifurcation has been added yet: branch density should be judged in the complete artwork before multiplying the visual load.

This is a review implementation, not an artistic acceptance. The outer network lies beyond the radial terrain-depth core while the dark-matter sea is deliberately lower, so oblique views may make the capillaries read as unsupported or floating. The enlarged field also reconstructs `384²` rather than `256²` cells—about `2.25×` the cell work—and currently continues simulating when a composition inspection mode hides the Universe layer. Those support and performance seams are now explicit review questions rather than reasons to conceal the candidate. P5's substrate remains independent of the molten engine.

The F4 capillary implementation currently lives inside `universe/sluice-gate-layer.js`. That placement preserved one parcel identity, mass and molten reconstruction across the outer inlet, forge confluence, rim reservoir, sluice gates and well, so it was a defensible implementation seam rather than a second visual system. It is nevertheless too broad an ownership boundary: capillary layout, review policy and upstream routing do not conceptually belong to the rim-gate mechanism. Before further P7 development, extract them to `universe/capillary-supply.js` in two safe phases. First move the pure deterministic layout and review helpers without changing behaviour. Then introduce a narrow live-lifecycle seam that advances the same parcel to its exact confluence and hands it to the existing Sluice engine, protected by identity, flux, reset/reseed and zero-synthetic-mass conservation tests.

### Question

Can each real molten stream emerge from a materially continuous upstream capillary network, with its forge understood as the confluence rather than as a marker, bulb, second material or opaque terrain basin?

### Work

1. Retain the standalone review's three-feed **Cluster**, **Selected feed** and **Whole system** comparisons as controlled evidence. The selected-confluence slider remains the cluster centre, and the cluster, whole-field and close cameras retain explicit active-feed, trunk, terminal, upstream-parcel, handoff, mass-continuity and domain readouts.
2. Opt the composition into the same shared Sluice engine with all twelve capillary feeds active. Remove the F3 thermal controls and callback plumbing from that endpoint rather than layering thermal emphasis over F4.
3. Use one enlarged `54 × 54 / 384²` molten field in each opted-in endpoint. Give every real source two or three deterministic primary trunks, each supplied by exactly two terminal capillaries beginning within the hidden irregular perimeter fade. Sibling terminals join at their shared branch point; separate primary trunks remain distinct until the source's exact forge confluence.
4. Emit the existing physical parcel budget through terminal inlets rather than multiplying it by terminal or trunk count. A parcel must retain its source ownership, identity, mass, inlet, terminal and primary-trunk provenance as it reaches the forge; the accepted-source event occurs once there, not at an outer inlet or intermediate branch point.
5. Guide a parcel only while it is upstream, excluding it from gravity and neighbour interactions during that constrained passage but depositing its trail into the same molten field. At the exact confluence, release that same parcel into the accepted downstream simulation without replacement or duplication.
6. Use the one existing molten surface, material, texture and reconstruction pass for upstream and downstream flow. F4 adds no forge mesh, source heat layer, light, timer, second animation loop or synthetic density.
7. Keep **Confluence ring radius** as the same real physical `sourceRadius` control: `9–16` units in `0.25` steps, default `13`, with deterministic `±0.75` per-feed variation. Changing it must regenerate the physical confluences and their capillary hierarchies rather than transform a visual-only group.
8. Give the composition a fixed **Supply plexus** comparison camera and readouts for active hierarchy, travelling upstream parcels, accepted handoffs, mass continuity and expanded-domain size. Keep these diagnostics observational: they must not create a second simulation or material.
9. Retain the irregular radial coverage expiry so upstream flow enters without disclosing the enlarged field's square allocation. The optional membrane wireframe remains the contour diagnostic; no brown basin presentation returns.
10. Review rare inter-feed crossings as an allowed shared-plexus property. Do not add another bifurcation level until the twelve-feed composition establishes whether more branching would enrich the flow or merely thicken its radial visual load.
11. Review the outer capillaries from oblique composition cameras against the terrain-depth core and lower substrate. If they read as floating, resolve the physical support contract explicitly rather than hiding the gap with an unrelated opaque basin.
12. Measure the `384²` reconstruction with the complete Tree and Cosmos render active and while inspection modes hide the Universe. Decide separately whether hidden modes should pause simulation or preserve continuous state; visibility alone must not silently redefine causality.

### Acceptance gate

- Every generated feed has one exact forge confluence, two or three distinct primary trunks and exactly two terminal capillaries per trunk. Within that source, sibling terminals meet only at their recorded branch point, different primary trunks meet only at the forge, and no path terminates as an end cap.
- Total emitted flux remains the accepted source budget rather than being multiplied by terminal or trunk count.
- A capillary parcel retains identity, source, mass and route provenance across its one confluence handoff, which emits exactly one accepted-source event and creates zero synthetic mass.
- Upstream and downstream traces reconstruct through one molten surface and material; no square numerical edge, separate source object or thermal-source ring is visible.
- Moving `sourceRadius` regenerates physical confluences and capillary routes across `9–16`; it is not a visual-only group transform.
- Reset, reseed, source selection and review-scope changes clear stale parcels and density without allocating additional render resources or animation loops.
- The composition's provisional adapter activates the whole twelve-feed plexus, removes F3 thermal emphasis and exposes no duplicate source treatment.
- The **Supply plexus** camera and ordinary composition cameras together expose the full expanded domain closely enough to judge the ring, confluences and rare inter-feed crossings.
- Human review explicitly decides whether the outer capillaries need a terrain/support adapter and whether the `384²` field retains acceptable performance in complete and hidden-layer modes.
- The optional membrane wireframe remains off by default and accurately exposes the same physical field when requested.
- Human review may reject the whole-system radial character, request a thinner shared-field confluence or ask for more bifurcation after the composition pass without invalidating the causal seam, identity contract or one-source-per-feed proposition.

## P8 — rooted motion

**Progress:** P8 replaces the copied raw-height sway with one shared persistent rooted-motion field consumed by the Tree shell, information core, runes, internal D1–D4 presentation and composition roots. The field is exactly static through local height `2.05`, then releases smoothly through the monumental lower trunk to `6.25`; crown height and radial reach add coherent response, while the faster term is confined to the lightest extremities. The established physical-root shoulder weights remain a second contact boundary, so buried roots stay static and the collar-to-trunk handoff remains continuous. Both Tree endpoints retain one bounded **Rooted sway** control (`0–0.65`, review default `0.50`) and an exact neutral-pose **Freeze sway** comparison. Time and packet transport continue while frozen; the toggle changes presentation only.

The first shared-field implementation proved registration but failed visual acceptance: at the former `0.22` response, canopy movement measured only about `0.40 px/s` at the silhouette camera; maximum sway measured about `1.18 px/s`, and Freeze commonly changed the image by only one or two pixels. The revised `v3` field therefore treats the same control as a meaningful rooted bend rather than a nominal offset. Its recorded representative outer-crown trace was `0.663` world units at that former response and `1.958` at maximum, with up to `0.569` world units of one-second travel under the stress setting. The first exposed trunk bay remains bounded to `0.0122` world units at maximum and the contact region remains exactly static. These are retained historical measurements rather than measurements of the new `0.50` review default.

Human review rejected the `v3` motion artistically because its coherent bend reads as the whole Tree swivelling about its axis. It remains evidence for registration and stiffness bounds, but is no longer the active composition baseline: Composition now opts explicitly into the bounded P8.1 alternative for whole-scene review.

### P8.1 — controlled moving-gust-front candidate

The standalone Tree and Composition now opt into one bounded candidate in which a spatial gust front travels across the crown and gives different canopy regions different pressure at the same instant. Promoting it to Composition creates a whole-scene review, not artistic acceptance. This first experiment derives response from spatial position and the existing rooted stiffness profile only. Hierarchy-aware branch-order, parent/child delay and per-limb metadata remain deliberately deferred, so the trial can answer the simpler question first: does a moving pressure region remove the axial-swivel character while preserving one registered Tree amid the complete artwork?

The existing **Rooted sway**, **Freeze sway** and Reset contracts remain unchanged. Freeze must still produce the exact neutral pose without pausing time or transport. Both endpoints now expose one **Gust interval base** control (`0–13 s`, integer, default `0`) whose readout states the whole nominal interval band: `0–15 s` at minimum and `13–29 s` at maximum. Moving it updates the same shared timing uniform without rebuilding the Tree; each endpoint's reset restores `0–15 s`. Composition's Tree baseline and Complete modes now use `gustMix = 1`, and its physical-root shoulder inherits the exact gust selector and interval uniform while buried root vertices remain locked.

The `v4` candidate now uses deterministic but irregular land-wind events rather than a regular shoreline-like wave. For base `B`, its irregular span is `S = 15 + B / 13`; each event start is displaced independently around the mean cadence `B + S / 2` by at most `S / 4`. Consecutive transitions therefore stay exactly inside the stated band—`0–15 s` at `B = 0`, `13–29 s` at `B = 13`—without the hidden fixed beat created by complementary interval pairs. The first event begins at `t = 0`, and a precision-stable modular hash gives the CPU reference and GPU shader the same repeatable event sequence. Event direction, front speed (`5.2–9.0`), attack, duration (`1.6–4.0`), lane width and strength still vary independently. Very short intervals are smoothly attenuated, and every event fades exactly to zero at its schedule boundaries, preventing either overlap or a cut at the prompt end of the slider. Curvature and a seeded crosswind meander break the planar phase, while the off-lane pressure floor remains `0.12` so the entire crown does not participate weakly in every event. All randomness is repeatable and spatially continuous; nothing is sampled per frame.

A front travels through Tree-local `x/z` space rather than applying one global angular phase. Height, crown exposure and radial reach supply bounded compliance, so outer limbs move disproportionately while the collar remains exactly locked through local height `2.05`. With the precision-stable event sequence, the first clearly measurable canopy response occurs at about `1.08 s` and the first half-loaded canopy arrival at about `1.15 s`. Across the recorded `160 s` base-zero review, representative outer-crown travel was `0.315` world units at the former `0.22` response, `0.716` at the new `0.50` response and `0.930` at maximum response; maximum displacement at local heights `3` and `6.25` remained bounded to `0.00390` and `0.03376` respectively. The active review defaults now use crown spread `0.80`, packet frequency `4/s`, six growth tiers and Rooted sway `0.50`. Six tiers manifest `591` of `683` hierarchy nodes rather than the former three-tier `453`, so live whole-scene performance remains part of artistic review. Freeze restores the exact authored pose while packet transport continues. If full-circle event-to-event changes read as capricious rather than terrestrial, the next refinement should add a slowly evolving prevailing-wind regime with smaller local veer while retaining occasional reversals.

### Question

What motion makes the Tree alive without weakening its mass or breaking the physical join?

### Work

1. Keep the rooted-motion law in the shared Tree library so standalone Tree and composition consume the same field, profile and absolute-time phase.
2. Use the bounded structural stiffness profile:
   - zero sway below contact and through the roots, with a controlled continuity handoff across the exposed collar into the lower trunk;
   - very low, coherent flex through the monumental lower trunk;
   - increasing response through limb order and thinner branches;
   - restrained high-frequency motion only at the lightest extremities.
3. Retain `structuralResponse` as the one amplitude property and keep static `windSweep` as authored form rather than repurposing it as live wind. Default authored sweep to `0` in both endpoints so the gust front, not a baked directional lean, owns the initial motion review.
4. Keep persistent environmental sway distinct from transient loading caused by growth or activity; the transient channel is zero in this pass.
5. Verify that packets, runes, internal presentation and any molten contact geometry remain registered with their hosts through the one shared field.
6. Use **Freeze sway** for exact neutral/live A/B review without pausing time, packet transport or rebuilding resources.

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

## P10 — causal transduction

**Progress:** P10.1 proved the exact causal seam but its three-point manifestations read as beads. P10.2 retains that seam and replaces only the presentation with one connected routed-liquid field. At most one genuine waiting root-contact parcel is admitted on each existing information-packet cadence slot; surplus real contacts remain exact audited unvisualised mass, and an empty slot remains dark. The first routed pass incorrectly began every wake at the well nadir, reused the cyan centreline and applied the rim's hot colour without its physical attenuation. The active refinement now projects each genuine contact onto the planted trunk, clips the route below that entry, assigns it to one of three continuous subsurface lanes around the bark circumference and reserves the centreline for cyan/gold transduction. Its molten head is a dark fraction of the rim palette and its finite wake cools almost to black. Composition review then rejected the correctly routed result as a near-invisible hairline: the original large-route radius was only `0.012`, or 37.5% of the cyan packet radius, and the first `0.024` correction still projected to only about 1.1 pixels. The current review candidate therefore replaces the fixed cap with a clearance-bound liquid envelope. At the default weight its trunk radius reaches `0.060`, while smaller branches narrow automatically against explicit cyan-core and outer-bark margins; neither the dark molten colour envelope nor its normal-alpha presentation changes. This remains a bounded review candidate, not an artistic acceptance. It does **not** add a second sugar-return layer. The existing cyan-to-gold information traversal remains the composition's opposed return.

### P10.2 — routed-liquid physical uptake candidate

The candidate belongs in the shared Tree library so the standalone Tree and Composition render the same routes, material, rooted deformation and packet lifecycle. The standalone endpoint may admit an explicitly labelled manual review pulse because it has no physical Universe. Composition may admit an uptake only after a real molten parcel reaches the root-contact region and is consumed there. Neither endpoint may create uptake on a timer, from source-forge activity or merely because the Tree is visible.

This remains deliberately subordinate. Uptake uses the cyan packet's smooth Gaussian head and finite wake grammar, but owns a separate one-channel texture, reverse direction and molten palette. The palette retains the physical layer's cooled (`0.055, 0.009, 0.004`), warm (`0.46, 0.038, 0.006`) and hot (`0.95, 0.25, 0.018`) source colours, then restores the density/crust/edge attenuation omitted by the rejected bright-red pass: the wake is near-black cooled material, the body is dark rust and even the head remains below forty per cent linear red. It uses normal alpha rather than additive warning-light blending. There is no red-to-gold conversion, white core, bloom, scene light, bark recolouring, autonomous tube glow or new silhouette. A single merged tube mesh and fixed traffic texture carry all active wakes; the exact lifetime event and mass totals remain independent of that bounded presentation. Individual identities remain in a bounded recent-provenance window with explicit truncation metadata rather than an ever-growing render-loop ledger.

### Question

Can overlapping finite molten wakes read as liquid xylem in the trunk and discrete physical packets in the crown without turning the Tree into a red signpost or weakening the information hierarchy?

### Work

1. Define one immutable root-uptake event carrying the consumed parcel identity, physical source, mass, contact position and contact time. Emit it exactly once at genuine root contact, in the same update that transfers the real parcel out of the molten simulation, so physical mass never exists concurrently in both systems.
2. Add one injectable physical-uptake layer to the shared Tree library. Composition passes only genuine consumed events; the standalone Tree's manual review button passes an explicitly synthetic test event. Neither path owns a private timer, animation loop or background emission rate.
3. Reuse the authored information-route topology and signal profile without sharing information identities or transport state. Project the genuine accepted contact onto the rootward trunk, clip every earlier sample, then reverse route distance so molten wakes begin at that planted boundary, overlap through the common trunk, divide across twelve deterministic routes and reach `90–100%` of their route toward the branch tips. Rebuilding growth may replace route geometry but must not duplicate an accepted event.
4. Render uptake through one merged tube mesh, one fixed `64 × lane-edge-count` traffic texture and one molten-rim material. Keep three continuous lanes between the cyan centre and bark, route each principal limb through its inherited lane and draw molten before cyan so the transducer remains authoritative. Attenuate the existing cooled, warm and hot physical-layer colours into a dark body and darker tail; prohibit a white-hot core, bloom, extra light, bark tint, idle tube glow or silhouette change.
5. Apply the same rooted-motion field and absolute Tree-local time used by the shell and existing packet manifestations, so upward packets remain registered during gusts and **Freeze sway** changes pose only, not transport.
6. Reuse `packetFrequency` as a presentation gate and `packetSpeed` as transport speed, with no extra physical-frequency control. The frequency creates no event or mass: each slot may select only one genuine waiting transfer, and all other real contacts are immediately booked as unvisualised exact count and mass. Rephase a live frequency change without a burst and retain deterministic results across coarse and fine frame cadence.
7. Make the composition A/B control presentation-only. Hiding molten wakes must not restore consumed lava, pause uptake, change routing or alter the existing cyan-to-gold return flow. Reset and disposal must clear active visual packets and audit state without leaking geometry, material or callbacks.
8. Keep the composition control panel collapsed on initial load and place the P10.2 A/B and readouts inside one closed diagnostic section. The standalone endpoint exposes one **Admit test uptake** action and an idle/xylem/branch readout, but no uptake-specific frequency, colour, brightness or automatic-emission control.
9. Review P10.2 as upward transport only. Do not add a new downward sugar packet family: the existing cyan-to-gold information traversal remains the composition's opposed return.

### Acceptance gate

- Composition produces no uptake event without consuming one real molten parcel at the planted root contact, and each consumed parcel creates at most one immutable uptake event.
- Consumed mass, accepted event mass and audited uptake mass balance exactly; hiding the presentation cannot change that balance.
- The standalone manual pulse and composition's genuine event enter the same shared uptake layer, while the composition exposes no manual or timer-driven injection path.
- Every visible wake begins at or above its genuine accepted contact, stays within a peripheral bark lane outside the cyan core, travels monotonically outward/upward along an existing Tree route and remains registered with rooted sway.
- The head remains dark molten orange/rust rather than pure red, and its finite tail is darker still; neither may obscure the central cyan/gold transducer flow.
- Overlapping wakes can form a connected trunk stream and then separate into legible branch packets without producing idle red tubes, broad bark illumination, a new silhouette or competition with cyan/gold information traffic.
- Branch division is deterministic and bounded; intake bursts cannot allocate unbounded packet, geometry, material or lifetime identity-list resources.
- **Freeze sway**, growth replay, layer visibility, camera changes and the collapsed control panel do not pause, duplicate or invent physical transport.
- Human review may reject the entire optical treatment or request lower visual capacity without invalidating the one-parcel/one-event causal seam.

## Cross-phase verification

Every bounded phase should include:

- fixed screenshots from composition, elevated and root cameras;
- a full-orbit occlusion review;
- isolated layer comparisons against the signed-off endpoints;
- deterministic tests for new spatial contracts and state-derived behaviour;
- the focused Category Tree test suite and a production build;
- a brief outcome record separating technical result from human artistic judgement.

The 1 November checkpoint places **P7 / F4 into the composition as a bounded provisional twelve-feed capillary-plexus review**, promotes **P8.1 as a bounded moving-gust-front candidate** shared by standalone Tree and composition, and advances **P10.2 as a bounded routed-liquid physical-uptake experiment**. F3 thermal emphasis has been removed from the composition; F4, P8.1 and P10.2 remain review candidates without artistic acceptance. P8.1 keeps the contact and first trunk bay static, moves pressure spatially across the crown and drives shell, internal manifestations and the weighted physical-root shoulder through the same field. P10.2 consumes real root-contact parcels, paces a deterministic sample with the existing information frequency and discloses it through rim-coloured connected wakes; the existing cyan-to-gold system remains the sole downward information return. P6 remains a provisional clean-line pass. P5 has a spatially safe shared-engine integration candidate, and P2 has a distinct colourless ordinary-depth candidate over it. Their combined review must now account for the exposed P7 support, hidden-mode performance seam, sustained P8 collar stability and the possibility that P10.2 overwhelms the hierarchy it is intended to complete.

Continue in this order:

1. review P10.2 first in the standalone Tree with isolated manual pulses, then at several pulses per second to decide whether the common-trunk overlap reads as liquid rather than beads or a permanent lamp;
2. review the same shared layer in Composition after genuine root contact, confirming that the rim-derived orange balance belongs to the physical layer and remains quieter than cyan/gold information;
3. compare composition, elevated, well/root and contact cameras with the control panel initially collapsed, then compare the presentation A/B without altering causal state;
4. recheck P8.1 at default and maximum Rooted sway to reject collar slide, open junctions or red-packet separation during gusts and **Freeze sway**;
5. review P7/F4 in **Complete**, **Casting Pit only** and **Universe + Tree** modes from the composition, elevated and **Supply plexus** cameras, then decide whether its visual load and physical support remain credible beneath P10.2;
6. measure complete-scene and hidden-Universe performance, including the bounded uptake capacity, then decide whether inspection modes should pause the roughly `2.25×` molten-field workload or preserve continuous simulation state;
7. complete human A/B review of the P2 depth owner and P5 substrate, including disclosure beyond the radial core, then recheck P3/P4 burial and collar contact;
8. consolidate overall camera, relative emphasis and controls without adding a second downward return system.
