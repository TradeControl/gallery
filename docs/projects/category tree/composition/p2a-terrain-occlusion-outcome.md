# Category Tree composition — P2a terrain occlusion outcome

**Implemented:** 2026-10-25  
**Status:** technically verified; Tree-local terrain ownership restored after the P7/F3 regression review
**Scope:** stop the Tree's gold internal presentation from compositing over nearer Casting Pit terrain

## Diagnosis

The apparent yellow "roots" hanging outside the gravity well were not physical root geometry. They were the accepted D4 route-local gold packet trails from the Tree's internal router. D4 intentionally renders its burial-attenuated overlay after the ordinary scene with depth testing disabled, because ordinary scene depth would allow the opaque graphite trunk to hide the very subsurface signal being presented.

D4 already constrained those trails between private front and back depths for the lower trunk, but it had no account of the Casting Pit membrane. A low camera could therefore show a valid internal trail over a nearer terrain pixel.

## Bounded correction

`createTrunkVisibilityRenderer` accepts an optional list of external occluder meshes. The composition supplies only the Universe layer's real `membraneSurface`; the standalone Tree supplies nothing and retains its accepted five-pass renderer unchanged. The mesh does not need to be scene-mounted or visibly rendered: the Tree renderer reads its geometry and transform into a private ownership proxy.

When D4 is active in the composition:

1. the ordinary scene establishes the real shared depth buffer;
2. a colourless, depth-tested proxy of the membrane writes stencil value `2` only where the membrane owns that visible pixel;
3. the existing lower-trunk front depth, back depth and nearest-trail passes remain unchanged;
4. the D4 gold overlay rejects stencil value `2` while retaining its existing graphite burial model everywhere else.

This adds one composition-only draw and no render target. It does not use a camera-facing patch, disable terrain depth, alter packet transport, reinterpret the internal router as roots, or restore D4's rejected trunk-ownership rasterisation.

## Verification

- The complete Category Tree suite passes: `89` tests, `0` failures.
- A focused regression proves that the membrane proxy shares the real geometry and world transform, writes only stencil ownership, adds one composition pass, and is omitted when hidden.
- The composition production entry builds successfully with Vite.
- Live inspection in Complete and Tree-only modes showed between one and four active rootward packets.
- The root camera and opposing orbit views retained gold inside the exposed graphite trunk while suppressing every trail behind the grey terrain, with no visible edge halo.
- The composition reports six D4 passes; the standalone Tree remains at its signed-off five.

## Boundary

P2a resolves the erroneous disclosure identified in the first P1 review image. It does not claim that a physical root system now exists or that the trunk is physically planted. The remaining P2 planting/contact envelope and P3 root geometry are still required.

## Regression review — 2026-10-25

P7/F3 correctly removed the visible brown membrane, but it also temporarily removed this Tree-local ownership input. The resulting review image repeated the original failure: D4's yellow rootward packet trails appeared to hang through the well and were understandably read as a root system unaware of its surroundings.

The colourless ownership input is now restored while the membrane presentation stays absent. The detached proxy writes neither colour nor depth and participates only in the Tree's D4 stencil pass, so it cannot become a hidden brown bowl or occlude molten flow and Cosmos. A focused regression now proves that this pass still works when the source membrane mesh has no scene parent.
