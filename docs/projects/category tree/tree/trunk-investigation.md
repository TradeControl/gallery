# Monumental trunk investigation

## Approach

This bounded study replaces only the separate root-to-trunk tube meshes with one
indexed loft along the existing ordered trunk route. Every crown connection still
uses its accepted curve, radius, material, hierarchy position and growth schedule.

The loft has one monotone, art-directed radius profile: broad at the planting
root, slowly tapering through `meaning`, then narrowing through the active crown
support stages. Its mildly elliptical section is aligned to the centroid of the
eligible terminal load, with restrained reinforcement on the loaded side. The
same graphite trunk material is reused. No Boolean union, implicit surface,
worker, collar, socket or junction-specific swelling is involved.

Recursive unfolding reveals a contiguous prefix of the loft. Quantised radial
maturation retains the existing relationship between crown growth and trunk
circumference.

## Files changed

- `src/category-tree/tree/engineered-tree-layer.js`
- `tests/category-tree/monumental-trunk.test.mjs`
- `docs/projects/category tree/tree/trunk-investigation.md`

The protected hierarchy, layout, branch geometry, controls and material palette
were not changed.

## Technical verification

- `node --test tests/category-tree/monumental-trunk.test.mjs` — two tests pass:
  one monotone outward-facing sidewall, and one contiguous growing trunk that
  replaces only trunk edges, disposes replaced geometry and reveals its top cap
  only at completion.
- `npm.cmd exec vite build -- src/category-tree/tree` — production build passes.
  Vite reports only its existing bundle-size advisory.
- `git diff --check` — passes.
- Browser console — no errors or warnings.
- Recursive replay was observed at 0%, 75% and 100% without a trunk gap.
- Growth tiers rebuilt correctly: tier 1 produced 341 manifested nodes and the
  restored tier 3 state produced 407.

## Visual review

### Strengths

- **Silhouette:** the trunk no longer reads as an enlarged branch. Its lower mass
  is approximately twice the previous lateral span and the taper remains gradual.
- **Canopy:** the protected crown keeps its established radial form. The larger
  trunk remains subordinate in aerial view rather than becoming a central blob.
- **Structure:** former trunk-segment seams are gone. Principal limbs begin inside
  the shoulder volume, so they read as supported continuations without collars,
  sockets or local swelling.
- The terminal-load-aligned ellipse introduces restrained asymmetry without noise,
  bark, roots or decorative surface features.

### Defects and limits

- The lower body remains intentionally simple and nearly axial. Its asymmetry is
  subtle and most apparent through changing edge highlights rather than outline.
- The temporary planting closure is visible on a neutral background; the future
  gravity-well composition must ultimately hide or resolve that cut plane.
- Limb integration is visual overlap inside the trunk volume, not a manifold
  branch union. This is deliberate, but close inspection can still reveal the
  independent crown construction.
- The broad front face is very dark under the accepted lighting. Its mass reads
  primarily by silhouette and grazing graphite highlights.

## Verdict

**CONTINUE**

The dedicated loft is a credible trunk architecture and is materially better than
both the sapling baseline and the abandoned whole-tree continuity experiment. It
should remain subject to visual sign-off before any further work.

## Recommended next block

Review this loft in the wider gravity-well mise en scène, then make one bounded
planting-and-shoulder composition pass on the same geometry if required. That pass
should resolve the temporary lower cut and judge whether slightly stronger
directional mass is needed. It must not change the crown or introduce transport,
luminosity, runes, lava or a new meshing architecture.
