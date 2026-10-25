# Category Tree composition — P1 baseline planting outcome

**Implemented:** 2026-10-18  
**Reviewed:** 2026-10-25  
**Status:** retained as a diagnostic baseline; technically verified, artistically unresolved

## Purpose

P1 asked one deliberately narrow question: can the signed-off Tree and the signed-off Casting Pit inhabit one real Three.js world without silently redesigning either of them?

The answer is yes. The separate [`src/category-tree/composition/`](../../../../src/category-tree/composition/) study mounts the Tree at the canonical Gaussian-well centre while leaving the standalone Tree and `casting-pit/universe-cosmos` endpoints unchanged.

## What P1 established

- One world, camera and frame loop host the Tree, Universe and Cosmos layers.
- The Tree's local planting origin is anchored to `membrane.height(0, 0)`, which is `-5.5` at the retained defaults.
- Tree scale, root embed depth and orientation can be varied independently of the Tree's local geometry.
- Five diagnostic visibility modes isolate the Casting Pit, Tree, Universe + Tree, Cosmos + Tree and complete composition.
- The shared renderer preserves the Tree's accepted multi-pass internal packet presentation.
- Cyan canopy traffic and the gold rootward presentation survive in the shared world.
- The complete slider contracts of the Tree and Casting Pit references were initially carried across for comparison rather than accepted as the final composition interface.

The focused composition tests passed when P1 was recorded. No aggregation, physical root system or causal cross-system transport was introduced.

## What P1 did not establish

Placing a transform at the mathematical centre proved co-location, not physical planting. The Tree still ends in the short planted extension and flat closure inherited from the standalone study; the Universe simulation has no knowledge of a trunk or roots; and the Cosmos still uses the visual language developed for its isolated reference. The Tree's gold multipass presentation also compared against trunk-shell depth, not the Casting Pit terrain depth, so a low camera could disclose subsurface activity through the ground incorrectly. That bounded renderer defect is now addressed by the [P2a terrain-occlusion correction](./p2a-terrain-occlusion-outcome.md); it does not supply physical roots or complete the planting contract.

The first visual review identified the following unresolved composition problems:

1. The apparent root system is not convincingly contained within the gravity well.
2. The trunk does not read as planted in the physical layer.
3. Molten material does not lap against or respond to the trunk base.
4. Cosmos looks too much like clean computer graphics beside the material Tree and terrain.
5. There is no dark-matter medium beneath the surrounding Casting Pit terrain.
6. Tree sway needs to be judged and refined in relation to a fixed root and ground contact.
7. The inherited control surface is an inventory, not a composed instrument: it currently exposes 45 range sliders and 4 switches.

These are not seven independent cosmetic defects. The first, second, third and fifth all depend on a shared account of what is above terrain, buried below it and physically displacing molten matter. That dependency determines the order of the continuing work.

## Handoff

The active continuation is the [composition work plan](./work-plan.md). The standalone Tree contract and its experiment history remain in [`../tree/`](../tree/).
