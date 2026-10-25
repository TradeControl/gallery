# P4 live molten contact — technical outcome

**Date:** 2026-10-25  
**Status:** implemented and technically verified; awaiting human artistic review  
**Review boundary:** P4 only; P5 dark-matter substrate has not begun

## Result

The Composition now gives the Universe's live molten reconstruction a measured Tree boundary. Incoming parcels sweep to the P2 contact footprint before depositing their trail, lose only inward velocity, keep their tangential motion, and receive a small deterministic side bias only on a near-head-on meeting. The resulting streams divide around the collar instead of painting through the trunk.

A composition-owned ribbon samples live density and heat immediately outside that same boundary. Its sectors rise quickly where material arrives and recede more slowly when the field clears. It therefore manifests as local lapping material rather than a permanent orange ring or a second central object.

## Boundary and ownership

- Collision derives from P2's world-space `contactFootprint`; P3's render mesh is not queried for occupancy.
- The shared Universe layer accepts an optional analytical boundary. Its default remains `null`, preserving the standalone study's ownership and behaviour.
- A cached occupancy raster blocks reconstructed density, heat and inward field flow inside the footprint. Only the expanded boundary bounding box is sampled when the envelope changes.
- Corner contact uses the signed-distance direction from the nearest boundary point, so the full footprint-aware clearance is met at both edges and vertices.
- The meniscus owns one fixed geometry allocation. Averaged vertex mitres close neighbouring sectors without welding sectors that need to appear and disappear independently.

## Bounded settlement

The old central receiver lies inside the planted trunk boundary and is no longer reachable while contact is active. Leaving it as the only drain would fill the 700-parcel budget and eventually halt emission.

P4 therefore gives two separated low-elevation collar edges a bounded settlement role. A parcel remains eligible only after at least `0.65` seconds of contact and `0.25` units of tangential travel. A `2.4` second maximum residence is the defensive bound. Settlement removes that same parcel and increments its original source's existing captured count; it does not clone or reassign material.

This preserves parcel identity and the existing source accounting, but it is not a claim of strict volumetric fluid conservation. The accepted Universe field is already a repeatedly deposited, diffused and decaying visual reconstruction.

## Review presentation

- Contact exists only in modes where both Universe and Tree are present.
- The retained Contact camera exposes the collar directly; Composition and Elevated retain the overall hierarchy.
- The planting panel reports dry/wetting/lapping state, active arcs, maximum lift, diverted parcels and settled parcels.
- No new public slider was added. The retained Tree placement and Universe material controls remain sufficient for diagnosis.
- Tree scale `1.15`, root settlement `0.00` and orientation `1°` remain useful development-view values, not approved load defaults.

## Verification

- Focused P4 contract tests cover noncircular occupancy, swept and corner contact, energy bounds, identity preservation, bounded settlement, local/dry meniscus behaviour, fixed allocation, seam continuity, envelope rebuild and detached-state cleanup.
- Static integration checks prove collision occurs before trail deposition, reconstructed material is masked inside the footprint, and no physical-root mesh shortcut is present.
- The Composition production build completes successfully.
- Live browser inspection confirms diversion and lapping in Universe + Tree and Contact views, with no bright throat object or trunk-wide material change.
- A live saturation check caught and corrected an escapable contact clock. After the correction the resident post-contact population remained in the tens while diverted and settled totals continued to rise, rather than reaching the `700 / 700` parcel ceiling.

## Human review questions

1. Does the contact read as lava meeting the planted Tree, rather than as an outline applied to it?
2. Is the lapping height restrained enough at sustained density while remaining legible at normal composition distance?
3. Does the local orange-red response belong to the existing Universe material, or should it cool further at the collar?
4. Is the bounded settlement visually plausible enough to proceed to P5, where the receiving subterrain medium will finally exist?
