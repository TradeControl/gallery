# Session brief: Casting Pit v0.2

## Authorization

This session is authorized to build **Phase 1 / Casting Pit v0.2 — Lava and convergence only**.

Casting Pit v0.1 successfully established the deformable membrane, gravity-like depression, camera, lighting, diagnostic overlay and live-control approach.

Do not redesign the successful v0.1 geometry without a demonstrated need arising from the lava work.

The purpose of v0.2 is to answer the next artistic and technical question:

> Can multiple independent molten flows travel convincingly across the existing deformed surface, visibly follow its descent and converge into the central pit?

This is a transport and visual-convergence study. It is not yet the Tree, the final Category Tree composition, or a complete underground casting environment.

## Required project context

Before implementation, read the current project documentation in this order:

1. `README.md`  
   Repository purpose, technology and development conventions.

2. `docs/project-context.md`  
   Repository-wide Gallery context and working principles.

3. `docs/projects/category tree/concept.md`  
   The governing concept for the completed artwork and the relationship between Casting Pit, Tree and final unification.

4. `docs/projects/category tree/casting-pit/concept.md`  
   The primary artistic and technical concept for the present phase.

5. `docs/projects/category tree/casting-pit/v0.1-outcome.md`  
   The proven v0.1 implementation, useful parameter ranges and limitations that should form the starting point for v0.2.

6. `docs/projects/category tree/session-brief.md`  
   This document defines the currently authorised work.

Read `docs/projects/category tree/tree/concept.md` only if necessary to understand the later relationship between the Casting Pit and Tree. Do not implement Tree work.

The archived Casting Pit shader and its assessment:

- `docs/projects/category tree/archive/casting_pit.1.glsl`
- `docs/projects/category tree/archive/casting-pit.1.md`

are historical evidence only.

They are especially relevant to understanding the previous failure to separate geometry, coordinate deformation and apparent flow. Do not reproduce their lava technique.

The active implementation remains:

- `src/casting-pit/`

The existing:

- `src/getting-started/`

remains reference material and must not be modified.

Before writing code, briefly report your proposed v0.2 approach and identify any material conflict or ambiguity between the current concept, v0.1 implementation, v0.1 outcome and this brief.

If none exists, proceed with the authorised implementation.

## Starting point

v0.1 has already demonstrated:

- A stable subdivided membrane.
- A coherent central deformation.
- Reliable surface normals.
- Useful depth and width ranges.
- Monumental and elevated inspection views.
- Orbit, zoom and pan.
- Live controls.
- A correctly attached diagnostic overlay.

Preserve these capabilities.

One human visual finding should also inform this phase:

> With the diagnostic overlay disabled, the current dark membrane can be difficult to read clearly.

The diagnostic overlay remains useful for development, but the finished Casting Pit must not depend upon it.

v0.2 should therefore allow the combination of surface lighting/material response and molten flow to make the deformation understandable with the diagnostic overlay normally switched off.

Do not solve this by making the diagnostic grid part of the artwork.

## Question to answer

Can several distinct luminous molten flows cross the broad outer membrane, remain convincingly attached to its deformed surface, descend towards the gravity well, converge towards the centre and visibly leave the surface at the pit?

The result should read as **transport under convergence**, not as animated surface decoration.

## Required scope

Build the smallest understandable extension of the existing Casting Pit that demonstrates:

- Multiple distinct molten flows or channels originating at different positions across the outer membrane.
- Paths that remain correctly associated with the existing surface deformation.
- Consistent movement towards the central depression.
- Visible descent as the paths enter the gravity well.
- Increasing convergence towards the centre.
- A convincing visual indication that molten material reaches and enters or disappears into the central pit.
- Sufficient luminosity, contrast and surface response for the lava to help reveal the shape of the membrane.
- Preservation of the existing camera and inspection capabilities.
- A small set of live controls sufficient to judge the lava behaviour and appearance.

The molten flows should possess some individuality. They should not simply appear as identical radial spokes or a single global texture effect.

Variation in origin, path, width, intensity, speed or behaviour may be used where it strengthens the image without obscuring the common destination.

## Transport discipline

The v0.1 membrane is the geometric world over which the lava travels.

The lava must therefore respond coherently to that world, but it must remain a **separate transport/rendering system**.

Do not:

- Animate the entire membrane or its material coordinates to impersonate flow.
- Animate the diagnostic grid to impersonate flow.
- Use a global radial texture warp as a substitute for distinct transport paths.
- Allow time-based animation to reverse the intended direction of transport.
- Hide incorrect surface attachment beneath glow, particles or visual noise.

The exact implementation technique is not prescribed.

Possible approaches include explicit curves, ribbons, channels, moving pulses, emissive geometry, shader-assisted paths or another suitably simple Three.js technique.

Choose the smallest approach that can convincingly answer the visual question.

A fluid simulation is **not required**. Do not introduce one unless there is a compelling reason that simpler transport geometry cannot satisfy the study.

## Movement

Movement should have consequence.

Molten material should clearly progress from the outer field towards the centre.

As appropriate to the chosen technique, convergence may be communicated through:

- increasing speed;
- increasing brightness;
- increasing concentration;
- merging paths;
- narrowing spatial separation;
- changing channel width;
- pulses entering the pit more frequently.

These are possibilities rather than requirements.

Avoid arbitrary oscillation, reversing flow, excessive swirling or decorative motion that weakens the sense that the central depression is exerting a common influence.

Some asymmetry and curvature are desirable. The flows should feel drawn towards the pit rather than mechanically plotted as a radial diagram.

## Surface legibility

Improve the existing membrane's unaided readability only as much as is necessary to support the v0.2 study.

The desired relationship is:

**dark restrained surface + concentrated molten energy**

rather than a brightly illuminated terrain with lava painted over it.

With the diagnostic overlay disabled, the viewer should be able to understand the broad plane, descent and central depression through some combination of:

- surface lighting;
- shading;
- silhouette;
- reflected/emissive contribution from the lava, if appropriate;
- the paths of the lava themselves.

Do not add atmospheric or post-processing effects merely to conceal weak geometry or weak transport.

## Live controls

Retain the useful v0.1 controls.

Add only the few new controls needed to explore the molten system.

Candidates include:

- Flow speed.
- Lava intensity.
- Flow/channel width.
- Number or density of active flows, if appropriate to the implementation.
- A convergence/path characteristic if one proves artistically meaningful.

Do not expose every implementation constant.

The controls remain a mixing desk for finding useful visual ranges.

## Explicitly out of scope

Do not add:

- The Tree or placeholder Tree geometry.
- Category Tree data or semantic behaviour.
- A complete throat interior or underground crucible.
- A general fluid simulation unless independently justified before implementation.
- Volumetric fog.
- Bloom or a post-processing pipeline solely to manufacture spectacle.
- A particle storm used to disguise weak lava paths.
- Production navigation or Gallery application infrastructure.
- A framework, TypeScript conversion, generalized state architecture or premature rendering abstraction.
- Changes to `src/getting-started/`.

Do not turn v0.2 into the completed Casting Pit.

The exact central throat or transition remains a possible **v0.3** problem. v0.2 only needs enough behaviour at the centre to make it visually clear that the surface-bound flows reach and enter or disappear into the pit.

## Acceptance criteria

Casting Pit v0.2 is accepted when all of the following are true:

1. The proven v0.1 membrane, deformation, camera and diagnostic capabilities remain functional.

2. Several visually distinct molten flows are simultaneously present across the membrane.

3. The flows clearly travel towards the central depression rather than merely oscillating or changing appearance in place.

4. Their paths visibly follow the deformed surface into the gravity well without obvious floating, clipping or unrelated coordinate distortion.

5. The flows converge towards the centre without reducing the image to a mechanically uniform radial pattern.

6. Molten material visibly reaches and enters or disappears into the central pit. A complete throat or underground environment is not required.

7. Animation has a stable inward direction. Time changes progression through the flow rather than reversing its intended transport.

8. With the diagnostic overlay switched off, the combined membrane, lighting and lava make the gravity well substantially easier to understand than the v0.1 surface alone.

9. The lava reads as luminous moving material rather than as an animated diagnostic grid or global texture distortion.

10. Live controls allow the important movement and appearance decisions to be judged directly without becoming an implementation dashboard.

11. Monumental and elevated views remain useful, and manual orbit/zoom/pan continue to permit inspection of surface attachment and convergence.

12. The implementation remains understandable and focused, with no Tree, semantic Category Tree behaviour, unnecessary framework architecture or effects added merely for spectacle.

## Session outcome

At the end of the session, create:

`docs/projects/category tree/casting-pit/v0.2-outcome.md`

Record:

- The transport/rendering technique chosen and why.
- Which path, speed, intensity and convergence ranges produced the most convincing result.
- How the lava is kept associated with the deforming membrane.
- Whether the lava successfully improves perception of the gravity well with the diagnostic overlay disabled.
- Any visual or technical weaknesses discovered.
- What actually happens when the flows reach the current centre.
- Whether a separate Casting Pit v0.3 throat/transition study now appears necessary.

Do not begin v0.3 or Tree work during this session even if v0.2 succeeds early.