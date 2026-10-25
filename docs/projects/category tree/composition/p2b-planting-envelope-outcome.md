# Category Tree composition — P2b planting-envelope outcome

**Implemented:** 2026-10-25  
**Status:** technically verified; live diagnostic inspection passed; awaiting human visual review  
**Scope:** replace the provisional point anchor with a composition-owned spatial contract for the real trunk/terrain interface

## Finding

The trunk was not floating at an embed depth of `0.00`. Its authored planting root sits at the Gaussian centre datum and its temporary extension continues another `0.18` local units below that point. Because the monumental footprint is broad and the well surface rises away from its centre, the terrain meets the lower sidewall well above the anchor.

The visual weakness is therefore not insufficient downward translation. The accepted standalone trunk has no composition-specific collar, flare or load path into the ground. That remains P3 work, but it can now be built against a measured boundary.

## Contract

The composition now derives a planting envelope from the live monumental-trunk mesh and the live membrane height function. It does not assume a circular footprint or constant ground plane.

For each of the trunk's `18` angular sides, the envelope:

1. transforms the actual lower sidewall rings into world space;
2. walks upward from the planted base;
3. finds the first sign change of `worldY - membrane.height(worldX, worldZ)`;
4. bisects that real sidewall segment to obtain the terrain contact sample.

The resulting contract exposes:

- the transformed planting anchor and authored planting-root footprint;
- the side-correspondent contact line and planted-base burial depths;
- signed terrain distance for any `(x, y, z)` sample;
- bounded Gaussian well influence derived from the membrane itself;
- explicit `above-terrain`, `terrain`, `contact`, `buried` and `deep-medium` classifications;
- `attached`, `partial`, `detached` and `fully-buried` status instead of silently accepting invalid placements.

The deep-medium boundary is derived from the actual maximum planted-base burial, not an arbitrary world-space circle or guessed depth.

## Diagnostic

`Planting envelope diagnostic` is off by default and contributes no artwork-mode draw. When enabled, it shows the footprint, measured contact, burial ticks and deep-medium boundary with ordinary depth testing. The cyan contact display is projected a small distance outward onto the live membrane for legibility; the contract samples retained by the API remain the exact sidewall intersections.

Fixed `Contact` and `Subterrain` cameras were added for repeatable review of the measured surface boundary and the ordinary depth-tested buried bands. The diagnostic remains coupled to Tree layer visibility and refreshes after Tree geometry, scale, settlement, orientation, well-depth and well-width changes.

The composition controls now expose a supported placement envelope rather than every mathematically valid transform. Tree scale runs from `0.90` to `1.30`; root settlement runs from `0.00` to `1.00`. This removes the old `0.45 / 3.00` combination, which placed the beginning of the crown below the surrounding terrain, while retaining enough settlement to test the eventual collar. At this stage settlement is a provisional downward offset of the root anchor, not simulated soil or collar behaviour. The accepted `1.00 / 0.00 / 0°` load defaults remain unchanged.

## Verification evidence

- At the unchanged load defaults (`1.00 / 0.00 / 0°`), all `18/18` sides attach and the measured contact ranges from about `-4.95` to `-4.71` on the default membrane.
- At the user's useful development view (`1.15 / 0.00 / 1°`), all `18/18` sides attach and contact ranges from about `-4.79` to `-4.49`.
- The development values remain transient review settings; they were not encoded as final defaults.
- Automated sweeps retain `18/18` attachment at every supported scale/settlement endpoint on the default membrane. At `0.90 / 1.00`, the crown-onset node remains about `3.70` world units above its highest terrain contact; at `1.30 / 0.00`, that exposed lower-trunk rise is about `6.36`.
- The complete Category Tree suite passes: `97` tests, `0` failures.
- The production composition builds, and the live browser reports no warnings or errors.

## Boundary

P2 now supplies truthful shared spatial evidence. The visible opaque-terrain presentation was later retired by P7/F3; the planting envelope remains valid because it samples the mathematical membrane directly. A detached, colourless copy of the same membrane geometry is still supplied only to the Tree's D4 stencil renderer so rootward packet trails respect nearer terrain. It is not a scene surface and does not occlude lava or Cosmos. P2 does not add visible root geometry, replace the standalone trunk's temporary planted extension, create a collar, or make molten material react to the Tree. Those remain the bounded responsibilities of P3 and P4.
