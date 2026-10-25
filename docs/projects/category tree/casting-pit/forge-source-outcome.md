# Casting Pit F1/F2/F3 — causal forge-source outcome

**Date:** 2026-10-25
**Status:** F1 fireworks rejected; F2 source lakes rejected; F3 bulb-free stream-origin heat implemented and technically retained, but human review finds it improved rather than finished
**Applies to:** the standalone Physical Layer and Category Tree composition

## Decision history

F1 established the useful mechanics: every real Sluice feed publishes an immutable layout observation and every accepted physical parcel publishes one causal emission observation. Its fountain-firework manifestation made the source ring easy to diagnose, but read as a superficial spectacle beside the Tree, Cosmos traffic and molten paths. The fireworks were removed.

F2 retained those mechanics and put a pressure-responsive molten lake at each feed. Although the lakes used the molten material family, their circular footprints still read as shield-like objects or bulbs attached to the ends of streams. Enlarging them made the discontinuity more obvious. The lake, rim and outlet proposition has therefore also been removed.

F3 keeps the causal source contract but gives it no independent silhouette. Each real stream is now its own forge: a restrained thermal lift is applied only to molten pixels that the existing Sluice reconstruction has already created at the beginning of that feed. A continuous Gaussian falloff carries that heat across the stream and downstream in the ordinary lava palette, avoiding the bounded colour step of an LED-like indicator. No density is added, so the source cannot widen a stream, create an end cap or appear before the real molten field exists.

## F3 — stream-origin heat

The shared forge component is a bounded state engine rather than a renderer. It owns source identity, accepted-event pressure, visibility mode and the review parameters, but no Three.js object, mesh, geometry, material, texture, light, timer or render loop.

The Sluice layer reads that state while preparing its existing molten `DataTexture`. It copies the physical density, heat and contact channels first, then raises only the presentation heat channel over existing non-zero density near the owning source. The base physical density, heat, flow and parcel arrays are not mutated. The same molten mesh, shader, texture and reconstruction therefore draw both the ordinary stream and its hotter origin.

An accepted emission raises bounded pressure only for its exact source. That pressure modestly strengthens and extends the thermal response, then settles to zero. Advancing time without accepted emissions cannot create activity; changing visibility or diagnostic mode cannot replay it; reset and layout replacement clear it deterministically.

The review controls are:

- **Source heat:** `0–1`, default `0.40`;
- **Heat reach:** `0.50–5.00`, default `2.25`;
- **Pressure settling:** `0.40–2.50`, default `1.25`.

The standalone study retains **Off**, **Selected** and **Whole ring** views. The composition exposes one checked whole-ring A/B switch.

## One truthful radius

**Lava-source ring radius** remains owned by the Sluice layer. It spans `9–16` units in `0.25` steps, defaults to `13` and retains deterministic `±0.75` per-feed variation. Changing it regenerates the physical origins and approach trajectories; the thermal origins follow the resulting source observations. There is no visual group transform. The fixed **Source ring** camera keeps the change comparable rather than hiding it through reframing.

## Well depth without the brown bowl

The Gaussian membrane remains the physical field used by parcels, molten reconstruction, planting measurements, the Tree and contact. Its brown terrain core and perimeter apron remain absent from the standalone Physical Layer and the active composition. The composition does retain the detached membrane geometry as a colourless, depth-tested stencil input only for the Tree's D4 overlay, preventing gold rootward packet trails from drawing over nearer terrain. That private Tree pass writes neither colour nor depth and has no influence on lava or Cosmos. The optional membrane wireframe remains off by default and can still expose the contours for diagnosis.

The implausible concealment inside the well was not evidence that the brown bowl itself was required. The molten field is one steep, concave, double-sided transparent mesh. With depth writing disabled, far and near triangles in that single draw could blend in an impossible order; the old opaque bowl happened to provide the missing depth.

The molten `ShaderMaterial` now remains transparent but writes depth after its existing density and boundary discards. Nearest molten fragments therefore establish the well's depth truth without restoring the brown core, apron or a new invisible occluder. A visible inner liner can still be considered later as an artistic choice, but is not needed to repair this ordering fault.

## Review surface

The composition exposes only:

- checked **Forge-source heat** A/B visibility;
- the physical **Lava-source ring radius**;
- **Source heat**, **Heat reach** and **Pressure settling**;
- source count, active pressure, accepted-event accounting and explicit zero synthetic mass;
- a fixed **Source ring** camera.

Selected-source diagnosis remains in the standalone Physical Layer endpoint.

## Verification boundary

Automated contracts cover:

- accepted-event-only pressure and ownership by one source;
- deterministic settling, reset and layout replacement;
- bounded state under repeated event pressure;
- no replay across `all`, `selected`, `off` or visibility changes;
- zero render objects, synthetic mass and independent animation loops;
- one physical ring-radius contract across the active endpoints;
- presentation heat being applied only after the physical field has been copied, without writes to physical density, heat or flow arrays;
- exactly one molten surface with transparent, depth-writing material;
- absence of basin presentation from active endpoints while the membrane diagnostic remains available.

## Human review questions

1. Is the thermal lift visible enough to imply a forge without becoming a marker or a second material?
2. Does heat clearly originate at the feed and decay downstream?
3. Do the minimum and maximum heat controls preserve the real stream silhouette?
4. Does depth-writing molten flow make entry into the well physically legible without restoring the brown basin?
5. Does the fixed Source-ring view make radii `9`, `13` and `16` meaningfully comparable?

F3 is a review implementation, not a final artistic acceptance. Removing the bulbs restored material continuity, and the smooth same-material gradient is the only live proposition, but the latest review still does not find it a convincing forge source. Its causal source seam, physical radius contract and no-synthetic-mass rule can survive later refinement of the thermal response. That refinement is deferred until the reopened planting/root review and the pending P6 Cosmos study have been resolved.
