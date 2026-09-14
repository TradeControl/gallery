# Session brief: Casting Pit v0.1

## Authorization

This session is authorized to build **Phase 1 / Casting Pit v0.1 only**.

The purpose of v0.1 is to prove that a deformable membrane, its camera and a small set of live controls can form a convincing basis for the Casting Pit. It is the first structural and perceptual study, not the complete Casting Pit or a finished scene.

Create the experiment separately from `src/getting-started/`. The existing getting-started example is reference material and must not be modified.

## Required project context

Before implementation, read the current project documentation in this order:

1. `docs/project-context.md`  
   Repository-wide Gallery context, technology choices and working conventions.

2. `docs/projects/category tree/concept.md`  
   The governing concept for the completed Category Tree artwork and the relationship between the Casting Pit, Tree and final unified work.

3. `docs/projects/category tree/casting-pit/concept.md`  
   The artistic and technical intent of the Casting Pit. This is the primary concept document for the present phase.

4. `docs/projects/category tree/tree/concept.md`  
   Read for awareness of the later Tree phase and to understand what the Casting Pit will eventually support. Do not implement any Tree work in this session.

5. `docs/projects/category tree/session-brief.md`  
   This document defines the work currently authorised. Where the wider concepts describe later ambitions, the scope and acceptance criteria in this brief govern the present implementation.

The following files are historical evidence only:

- `docs/projects/category tree/archive/casting_pit.1.glsl`
- `docs/projects/category tree/archive/casting-pit.1.md`
- `docs/projects/category tree/archive/category_tree.1.glsl`
- `docs/projects/category tree/archive/category_tree.1.md`

The archive records the previous shader experiments and their diagnosed failure modes. Use it to understand what was attempted, what was visually valuable, and what must not be repeated. It is **not** the implementation specification for the new work.

The active implementation location for this phase is:

- `src/casting-pit/`

The existing:

- `src/getting-started/`

is a completed learning/reference experiment. It may be inspected for repository conventions, including the simple live-control experiment, but must not be modified.

Before writing code, briefly report your understanding of the intended Casting Pit v0.1 approach and identify any material conflict or ambiguity you find between the current concept documents, this session brief and the existing repository. If none exists, proceed with the authorised implementation.

## Question to answer

Can a continuous flexible surface be drawn down convincingly by a central casting or gravity force from both monumental and inspectable camera views, with or without diagnostic overlays?

## Required scope

Build the smallest understandable Three.js experiment that includes:

- A sufficiently subdivided membrane rendered as actual geometry.
- A central depression controlled by one coherent deformation mapping.
- An optional, switchable diagnostic grid, wireframe or equivalent inspection overlay that travels correctly with the surface.
- Surface normals and simple lighting adequate to read the deformation.
- A perspective camera and direct manual inspection controls.
- Correct full-window resize and sensible device-pixel-ratio handling.
- A compact live control panel for the few parameters needed to judge the study.

The initial controls should cover, at most, the artistic equivalents of:

- Depression depth.
- Depression width or falloff.
- Optional inward material pull, if it is implemented as part of the same surface mapping.
- Diagnostic overlay visibility and, if useful, its density or weight.
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

Lava is out of scope only because v0.1 must establish trustworthy geometry first. It is the principal artistic system planned for Casting Pit v0.2, not a separate project or optional finishing effect.

## Acceptance criteria

Casting Pit v0.1 is accepted when all of the following are true:

1. The experiment runs from the repository's existing Vite setup without modifying the getting-started example.
2. A broad membrane is clearly visible and is drawn into a single central depression.
3. The depression reads convincingly as a continuous surface being drawn down by a central force, both with and without diagnostic overlays.
4. The same coherent mapping accounts for the visible surface deformation and any intentional inward pull of its material.
5. When enabled, the diagnostic overlay remains attached to the membrane throughout live parameter changes and exposes the deformation without unexplained sliding, radial rings, oval bands or other coordinate-mapping artefacts.
6. The surface remains visually stable: no obvious holes, intersection artefacts, severe aliasing or normal discontinuities appear in the intended control range.
7. The camera can inspect the pit from a low, monumental view and from a clearer elevated view without losing or clipping the central form.
8. Live controls make the essential shape, camera and lighting decisions directly judgeable, include a simple diagnostic-overlay switch, and remain small enough to understand at a glance.
9. Resizing the window preserves the composition and projection, and rendering resolution is bounded sensibly on high-density displays.
10. The implementation remains a focused experiment with no tree, lava, post-processing or premature framework architecture.

## Session outcome

At the end of the session, record which deformation, lighting and camera ranges produced a convincing membrane, whether the optional overlay exposed any mapping problems, and any limitations that should inform Casting Pit v0.2. The next Casting Pit stage will introduce lava and convergence, but do not expand into lava or the Tree during this session even if the v0.1 proof is completed early.
