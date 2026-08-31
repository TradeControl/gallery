# Casting Pit

## Concept

The Casting Pit is the world from which the Category Tree will emerge: an immense dark surface drawn down into a central casting or gravity depression while separate luminous molten flows travel across it, converge and pour into the centre.

At a distance the surface appears calm and nearly planar. Approaching the centre, it is placed under visible strain. The membrane bends, stretches and steepens towards a throat, making the invisible force of convergence tangible. The image should recall spacetime under gravity, a flexible industrial floor, a tensioned sheet and the mouth of a foundry without settling into a literal illustration of any one of them.

A grid, wireframe or equivalent surface inspection mode may be useful during development because it makes deformation errors visible. It is not an essential artistic component and should not define the finished landscape. Any diagnostic overlay should be switchable and, when enabled, remain correctly attached to the membrane's material coordinates even where the surface becomes compressed, stretched or strongly foreshortened.

## Intended experience

The pit should feel monumental and bodily. A low, human-scale camera can make the horizon and descent physically credible, while an elevated or orbiting inspection view can expose the logic of the deformation. The centre must exert visual authority without turning the entire field into a radial pattern.

The surface should possess industrial material character—dark, mineral, metallic, ceramic or soot-marked—but the first proof is form rather than finish. Light exists to clarify slope, tension and depth. Atmospheric richness should be earned after the membrane reads convincingly.

The depression may begin as a heightfield-like surface, but the artistic destination includes a deliberate central transition: outer membrane, steep convergence, casting mouth or throat, and an implied space below. The throat should ultimately feel like a place where surface-bound material can cease to be surface-bound.

## Lava and convergence

Lava is essential to the Casting Pit. Distinct luminous channels or streams move consistently towards the depression, follow the deformed surface, merge as they approach the centre, and eventually pour or disappear into the pit. Their motion should help the viewer understand the gravity well: paths descend with the surface and may accelerate, brighten or concentrate as they converge.

The lava is a separate system in implementation, not in artistic intent. It must not be produced by wobbling a diagnostic grid or making the whole coordinate field oscillate.

This separation gives each layer a clear role:

- The membrane establishes the world and bears the deformation.
- An optional, switchable inspection overlay exposes deformation and coordinate-mapping errors during development.
- The lava provides the principal dynamic image, shows transport and convergence, and helps make the surface legible in the finished study.
- The throat marks the transition from distributed surface movement to concentrated depth.

## Development sequence

The complete Casting Pit should be built in three focused studies:

1. **Casting Pit v0.1 — Surface and gravity well.** Prove actual deformable geometry, a convincing central depression, reliable normals and lighting, a controllable camera, live artistic controls, and an optional switchable diagnostic overlay. Lava is withheld until the geometry is trustworthy.
2. **Casting Pit v0.2 — Lava and convergence.** Add multiple luminous molten channels that follow the surface, move towards the depression, converge and visibly enter the pit. The diagnostic overlay should normally be off; lava and lighting should themselves reveal the form.
3. **Casting Pit v0.3 — Throat or transition, if required.** Resolve the centre in response to what v0.2 actually reveals. A casting mouth, luminous opening, falling streams or implied crucible are possibilities, not prescriptions.

After this sequence, Casting Pit development stops. The Tree remains an independent construction problem until the later Category Tree unification.

## Implementation awareness

The concept favours a parametric, subdivided surface with reliable material coordinates. This directly supports both surface-bound lava and an optional inspection overlay. Other techniques remain possible, but intersections, normals and coordinate mappings must be reliable enough that rendering artefacts are not mistaken for deformation.

Live controls should expose perceptual questions: depth and breadth of the depression, the character of its falloff, any inward material contraction, camera height and distance, and lighting that reveals the form. Development controls may also switch and tune a diagnostic overlay. Controls are instruments for finding the artwork, not an invitation to surface every implementation constant.

## Provenance

The archived Casting Pit shader demonstrated a recognisable gravity-well image, but its geometry, grid warp and animated flow were unrelated transformations. It treated vertical separation from a heightfield as a distance field, introduced unstable intersection behaviour, and asked the grid to perform the work of both deformation and lava. The resulting oval and ring-like distortions are useful evidence of what to avoid.

The archive does not define the new pit's profile, renderer or architecture, and its diagnostic grid is not canon merely because it exposed those failures. Its durable lesson is simpler: geometry, material coordinates and transport must agree where they are related, but should not be conflated into one coordinate distortion.
