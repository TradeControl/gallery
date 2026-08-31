# Evaluation of `category_tree.glsl`

The shader succeeds as a dark, animated “organic logic tree,” but it represents the Trade Control Category Tree mainly through atmosphere and botanical recursion. It does not yet express what makes the Category Tree distinctive: recursive classification, polarity, typed leaves, aggregation, selectable statement roots, expressions, disconnected structures, and the transformation of operational flows into financial meaning.

## What the shader currently depicts

The scene is a ray-marched 3D environment containing:

- A tapering, slightly distorted trunk.
- Twelve repeated folding operations that produce branch-like geometry.
- Time-driven sway and organic domain warping.
- Dark stone surfaces with alternating orange “molten” and blue “circuit” veins.
- A depressed casting pit beneath the tree.
- Procedural channels intended to flow towards the pit.
- Height-based luminous bands intended to suggest nodes.
- An orbiting, ceremonial camera.
- Abstract industrial or city-like silhouettes in the background.

Its central visual proposition appears to be:

> An ancient engineered organism, rooted in an industrial landscape, in which organic growth and computational circuitry coexist.

That is an appealing Gallery image. It conveys recursion, complexity, industrial provenance, and something alive within something mineral.

## What works artistically

The strongest aspects are:

- The combination of organic and engineered qualities.
- The dark industrial or mythic atmosphere.
- Continuous movement rather than a static illustration.
- The suggestion that logic is embodied materially.
- The contrast between orange molten energy and blue circuitry.
- The sense that the structure belongs to a larger constructed world.

It therefore works reasonably well as an impression of “living recursive software.”

## Where the implementation weakens the picture

### The recursion is not actually a tree topology

The “recursive branching” is produced by repeatedly folding and rotating one coordinate space using `abs()`, rotations and shrinking scale.

That creates self-similar branch-like geometry, but it does not create individually meaningful:

- Parents
- Children
- Siblings
- Junctions
- Leaves
- Category types
- Terminal Cash Codes

The visual recursion is therefore decorative or geometric rather than semantic.

### The branches are not clearly finite segments

The branch distance is essentially:

`length(bp.xz) - radius`

This describes tube-like fields rather than clearly bounded conduits joining one node to another. The result may resemble tangled filaments, coral or antlers more than a legible hierarchy.

### The glowing nodes are not real nodes

The “node glow” is generated from sinusoidal bands in world space during ray marching.

The lights are not attached to actual branch junctions or endpoints. They appear wherever the banding field happens to coincide with nearby geometry.

Consequently, the shader does not visually distinguish between:

- A structural junction
- A category
- A total
- A Cash Code
- An arbitrary glowing point on a branch

### The ground is still in debug mode

A substantial `shadeGround()` function exists, containing:

- Stone
- Soot
- Fused glass
- Lighting
- Emissive channels
- Fog tinting

However, it is never used.

Ground hits instead display:

`color = vec3(0.2 + 0.4 * gh, lf, lf); // just a debug view`

This means a significant part of the intended composition remains replaced by diagnostic colouring.

### The orange and blue systems have no stable meaning

The molten and circuitry veins are visually attractive, but they alternate according to procedural pulses rather than representing a consistent conceptual distinction.

They could imply:

- Inflow and outflow
- Positive and negative polarity
- Money and quantity
- Trade and tax
- Organic and computational activity

But the shader never commits to any of these meanings.

The colour contrast therefore remains atmospheric rather than truthful to the codebase.

### Motion is ambient rather than explanatory

The tree sways, veins pulse, channels fluctuate and the camera orbits. These create life, but none of the animation demonstrates the Category Tree’s operations.

Nothing visibly:

- Enters through Cash Codes
- Moves through a category
- Aggregates into a total
- Changes polarity
- Illuminates a Profit or VAT subtree
- Detaches into the Disconnected collection
- Becomes disabled recursively
- Reconnects somewhere else
- Produces an expression or derived result

The shader moves, but the concept does not yet act.

## Where the metaphor becomes misleading

The Trade Control Category Tree is not fundamentally a tree that grows.

It is a configurable recursive classification and composition system.

Categories can contain other categories or terminal Cash Codes. Totals aggregate their component categories. Cash Codes carry type, tax and polarity semantics. Profit and VAT reporting can be anchored at selected roots. Expressions calculate derived meanings. Unattached categories remain visible as Disconnected. Enabled state can propagate through category subtrees.

The present botanical metaphor unintentionally suggests:

- One organism with one natural root.
- Every branch being the same kind of thing.
- Complexity arising from repeated bifurcation.
- Information originating in the trunk and growing outward.
- The structure being fixed by natural growth.
- Orange and blue energy mixing arbitrarily inside it.

The actual system is more configurable and heterogeneous.

Much of its meaningful activity runs from terminal events towards higher totals: many classified flows become progressively composed into larger financial and operational meanings.

The current shader illustrates “recursion,” but not yet “recursive classification.”

## A stronger governing metaphor

A more truthful visual proposition might be:

> A configurable recursive instrument that receives opposed flows at its terminal nodes, classifies them, and progressively resolves them into higher-order meanings.

This could still look organic, monumental and strange. It need not become a conventional software diagram.

Instead of a normal tree, it might resemble a suspended engineered arbor, refinery, nervous system or computational foundry.

### Possible visual roles

- **Cash Codes** become distinct terminal receptors or ports.
- **Cash Code Categories** become coherent chambers containing compatible terminals.
- **Totals** become larger confluence structures where several streams combine.
- **Parent-child relationships** become finite, unmistakable conduits.
- **Polarity** becomes two stable, opposed directions or colours.
- **Aggregation** becomes visible as many small pulses resolving into one stronger parent pulse.
- **Profit and VAT roots** become selectable attractors or interpretative lenses.
- **Expressions** become transverse instruments that read several totals rather than ordinary descendants.
- **Disabled subtrees** remain physically present but become dormant.
- **Disconnected categories** drift nearby as viable but unattached structures.
- **Reclassification** becomes a visible detachment and reconnection of a branch.

The artwork would then execute the conceptual model instead of decorating a tree with conceptual references.

## Suggested dynamic behaviours

Several behaviours could communicate the codebase directly:

### Classification

Individual pulses enter through Cash Code terminals and acquire colour, direction and rhythm according to their type and polarity.

### Recursive aggregation

Small terminal pulses converge through intermediate categories. At each Total node, they combine into a slower, larger or brighter pulse.

### Polarity

Inflow and outflow remain visually opposed throughout the structure—perhaps travelling in contrary directions, occupying different sides of conduits, or using complementary colours.

### Root selection

Choosing Profit or VAT causes only the categories participating in that interpretation to illuminate. The rest of the structure remains visible but subdued.

### Enable and disable

Disabling a category sends a darkening wave recursively through its category descendants while preserving the underlying structure.

### Disconnection and reclassification

A subtree detaches, enters a suspended Disconnected region, and can later reconnect to a different parent. Its flows then take a new path through the system.

### Expressions

Expressions appear as instruments or lenses outside the main hierarchy. They draw readings from named totals and generate ratios or other derived visual forms.

## Proposed “mixing desk”

The controls should expose meaningful artistic and conceptual dimensions, not every low-level shader constant.

### Structure

- Hierarchy depth
- Branching density
- Sibling spacing
- Category-to-leaf ratio
- Structural symmetry
- Botanical-to-engineered balance
- Disconnected population
- Selected root: All / Profit / VAT
- Projection: Classification / Cash Statement / Type

### Behaviour

- Flow rate
- Aggregation strength
- Polarity separation
- Pulse persistence
- Reclassification frequency
- Enable/disable propagation
- Expression activity
- Tax overlay
- Time scale
- Freeze simulation

### Appearance and inspection

- Node scale
- Conduit thickness
- Glow
- Material balance: stone / glass / circuitry
- Environmental density
- Camera orbit speed
- Manual camera control
- Exploded hierarchy view
- Show topology
- Show parent links
- Show terminal Cash Codes

### Useful presets

- Structure Only
- Polarity
- Aggregation
- Profit
- VAT
- Disconnected
- Reclassification
- Expressions

These would provide reproducible starting points for artistic exploration.

## Architectural direction

An arbitrary Category Tree should probably not be represented solely through repeated coordinate folding in one fragment shader.

That technique is excellent for beautiful recursive forms, but it cannot naturally represent a changing, heterogeneous hierarchy.

A better system would have two cooperating parts:

1. A small web control surface owns the hierarchy, parameters and presets.
2. The shader receives node and edge data through uniform arrays or textures and renders the living structure.

For a Shadertoy prototype, a fixed representative hierarchy could be encoded in arrays or an `iChannel` texture.

A later documentation version could load actual Trade Control category data, allowing the same artwork to portray a real configuration.

## Overall assessment

This is a promising atmospheric study and a strong foundation for an “organic recursive organism.”

Its best qualities are:

- Material character
- Mood
- Motion
- Monumentality
- The fusion of biological and computational imagery

Its central weakness is:

> The recursion is currently geometric decoration rather than semantic recursion.

The next design should make topology, polarity, classification and aggregation generate the image itself.

The aim should not merely be to create a more beautiful tree. It should be to create a living visual system whose behaviour reveals why Trade Control’s Category Tree is not a traditional chart of accounts, but a recursive mechanism for turning classified flows into operational and financial meaning.