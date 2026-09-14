# Gallery — Casting Pit v0.4b: Propagation Review

## Context

This is a small continuation of the v0.4b Cosmic Circuitry experiment.

Read:

1. `docs/projects/category tree/sessions/session-brief-10.md`
2. `docs/projects/category tree/v0.4b review.md`
3. the current v0.4b implementation where necessary.

Do not reopen the wider v0.4b design unless this issue exposes a material conflict.

## Challenge

The review correctly states that Cosmic topology is generated independently of the Casting Pit and that the pit affects only its spatial manifestation.

We agree with that distinction.

A logical route may pass through territory occupied by the gravity well. When manifested in the shared reality, that route may descend into the depression, traverse it and emerge again. Its connectivity must remain independent of gravity.

However, there is a possible problem with the current information propagation model.

The review states that information advances by:

`communication speed × elapsed time`

using cumulative **logical route distance**, with surface projection applied only when the route point is rendered.

That guarantees constant propagation speed in the undeformed logical 2D topology.

It does not necessarily guarantee constant **manifested spatial speed** once that route is projected onto the deformed 3D membrane.

A logical segment crossing a steep part of the well may correspond to substantially more manifested 3D distance than the same logical segment on level territory. Consequently, a packet progressing at constant logical speed may appear to change speed as it traverses the deformation.

This matters conceptually.

The intended distinction is:

> **Matter falls. Information is routed.**

Molten matter belongs to Universe. It moves comparatively slowly and may accelerate as physical forces act upon it.

Information belongs to Cosmos. The pit may distort the spatial manifestation of its conduit, but gravity must not accelerate, decelerate, attract or redirect the information travelling through it.

Universe and Cosmos inhabit the same reality. Therefore the information should visibly traverse the deformed route while maintaining essentially constant propagation speed through that manifested geometry.

## Task

Inspect the current v0.4b implementation and determine whether the manifested-speed concern described above is valid.

### If the concern is not valid

Explain precisely why, with reference to the implementation and geometry.

Record that conclusion in `v0.4b review.md`.

Also update/create the v0.4b outcome document with the technical reasoning so there is a permanent record of why no propagation change was required.

Then stop for review.

### If the concern is valid

Proceed with the experiment.

1. Amend the relevant v0.4b specification/documentation so that the intended propagation rule is explicit:

   > Information follows topology that is independent of the Casting Pit, but travels at essentially constant speed through the spatially manifested route geometry.

2. Modify the v0.4b implementation accordingly.

   Preserve the existing logical topology and its independence from the Casting Pit. This is a propagation/manifestation correction, not a network-generation redesign.

3. Run and inspect the resulting experiment.

   In particular, inspect information travelling:
   - across relatively level territory;
   - down a substantial slope of the gravity well;
   - through the lower region;
   - back up a substantial slope where a route permits it.

   The visual objective is that information should appear to propagate at essentially constant speed throughout the manifested route rather than behaving as though gravity accelerates or decelerates it.

4. Test the result at useful `Surface binding` values, including the current default and stronger deformation where appropriate.

5. Update `v0.4b review.md` with:
   - what the original implementation actually did;
   - whether the manifested-speed discrepancy was significant;
   - the correction made;
   - the implementation and visual results;
   - any limitations or new issues discovered;
   - useful states for human visual inspection.

6. Create/update the v0.4b outcome document with:
   - the final propagation model;
   - why that model was chosen;
   - how manifested route length is calculated;
   - how topology remains independent of the Casting Pit;
   - what changed from the original v0.4b implementation;
   - visual and technical findings;
   - performance implications;
   - remaining limitations;
   - whether the experiment is now suitable for a future Universe/Cosmos overlay.

If implementation reveals that the proposed correction is technically or conceptually inappropriate, do not force it. Record the evidence and reasoning in both the review and outcome documents.

Then stop for review.

Do not begin another experiment.