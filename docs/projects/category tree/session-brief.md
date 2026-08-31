# Session brief: Casting Pit v0.1

## Authorization

This session is authorized to build **Phase 1 / Casting Pit v0.1 only**.

The purpose of v0.1 is to prove that a deformable gridded membrane, its camera and a small set of live controls can form a convincing basis for the Casting Pit. It is a structural and perceptual prototype, not a finished scene.

Create the experiment separately from `src/getting-started/`. The existing getting-started example is reference material and must not be modified.

## Question to answer

Can a marked flexible surface be pulled into a central casting or gravity depression while its grid remains visibly attached, continuous and useful for reading the deformation from both monumental and inspectable camera views?

## Required scope

Build the smallest understandable Three.js experiment that includes:

- A sufficiently subdivided membrane rendered as actual geometry.
- A central depression controlled by one coherent deformation mapping.
- Grid markings derived from the membrane's undeformed material coordinates so they travel with the surface.
- Surface normals and simple lighting adequate to read the deformation.
- A perspective camera and direct manual inspection controls.
- Correct full-window resize and sensible device-pixel-ratio handling.
- A compact live control panel for the few parameters needed to judge the study.

The initial controls should cover, at most, the artistic equivalents of:

- Depression depth.
- Depression width or falloff.
- Optional inward material pull, if it is implemented as part of the same surface mapping.
- Grid density and line weight.
- Camera or inspection position.
- One or two lighting/exposure values needed to read the form.

Use the repository's existing JavaScript, native ES modules, Three.js and Vite stack. Keep the experiment local and legible. A lightweight control or camera utility may be used only if it provides clear value and does not start a broader application architecture.

## Explicitly out of scope

Do not add:

- The Tree or any placeholder tree geometry.
- Lava, channels, particles, falling streams or other flow simulation.
- Post-processing, bloom, volumetric fog or cinematic effects.
- A throat interior, crucible or underground scene beyond what is strictly needed to judge the depression.
- Category Tree data, semantic nodes, aggregation or polarity behaviour.
- A framework, TypeScript, state-management layer, component system or generalized shader/application architecture.
- Production navigation, a gallery shell, routing, asset pipelines or reusable infrastructure.
- Changes to `src/getting-started/`.

Do not reproduce the archived shader as a starting specification. Its files may be consulted only for provenance and known failure modes.

## Acceptance criteria

Casting Pit v0.1 is accepted when all of the following are true:

1. The experiment runs from the repository's existing Vite setup without modifying the getting-started example.
2. A broad membrane is clearly visible and is drawn into a single central depression.
3. The grid remains continuous and attached to the membrane throughout live parameter changes; it does not slide independently over the surface.
4. The same coherent mapping accounts for the visible surface deformation and any intentional inward pull of its material.
5. The grid reads as deformed squares on a flexible sheet rather than a collection of decorative radial rings or unexplained oval bands.
6. The surface remains visually stable: no obvious holes, intersection artefacts, severe aliasing or normal discontinuities appear in the intended control range.
7. The camera can inspect the pit from a low, monumental view and from a clearer elevated view without losing or clipping the central form.
8. Live controls make the essential shape, grid and camera decisions directly judgeable and remain small enough to understand at a glance.
9. Resizing the window preserves the composition and projection, and rendering resolution is bounded sensibly on high-density displays.
10. The implementation remains a focused experiment with no tree, lava, post-processing or premature framework architecture.

## Session outcome

At the end of the session, record which deformation and camera ranges produced a convincing membrane, which grid behaviour remained legible, and any limitations that should inform Casting Pit v0.2. Do not expand into lava or the Tree during this session, even if the v0.1 proof is completed early.
